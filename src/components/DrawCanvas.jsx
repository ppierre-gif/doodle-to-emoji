import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const PALETTE = [
  { name: 'Ink', value: '#2B2B3A' },
  { name: 'Tangerine', value: '#FF7A4D' },
  { name: 'Sky', value: '#4DA8FF' },
  { name: 'Mint', value: '#4FD1A5' },
  { name: 'Sunshine', value: '#FFCE3D' },
  { name: 'Grape', value: '#9B6DFF' },
];

const EXPORT_SIZE = 512; // cap the PNG sent to the backend at 512x512

// Strokes are stored with normalized coordinates (0..1) and a normalized line
// width (fraction of canvas width). That keeps drawings crisp across DPR
// changes, window resizes, and the downscaled export — all from one source.
function drawStrokes(ctx, strokes, width, height) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = Math.max(1, stroke.sizeNorm * width);
    ctx.beginPath();

    if (stroke.points.length === 1) {
      // A single tap — render a dot.
      const p = stroke.points[0];
      ctx.fillStyle = stroke.color;
      ctx.arc(p.x * width, p.y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
    }
    ctx.stroke();
  }
}

const DrawCanvas = forwardRef(function DrawCanvas({ onChange }, ref) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentRef = useRef(null);
  const [color, setColor] = useState(PALETTE[0].value);
  const [size, setSize] = useState(9);
  const [count, setCount] = useState(0);

  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  colorRef.current = color;
  sizeRef.current = size;

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const all = currentRef.current
      ? [...strokesRef.current, currentRef.current]
      : strokesRef.current;
    drawStrokes(ctx, all, canvas.width, canvas.height);
  };

  const sync = () => {
    setCount(strokesRef.current.length);
    onChange?.(strokesRef.current.length);
  };

  // Keep the canvas's internal resolution matched to its on-screen size * DPR.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const side = Math.max(1, Math.round(rect.width));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(side * dpr);
      canvas.height = Math.round(side * dpr);
      canvas.style.height = `${side}px`;
      redraw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    return () => ro.disconnect();
  }, []);

  const pointFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const cssWidth = canvasRef.current.getBoundingClientRect().width || 1;
    currentRef.current = {
      color: colorRef.current,
      sizeNorm: sizeRef.current / cssWidth,
      points: [pointFromEvent(e)],
    };
    redraw();
  };

  const handlePointerMove = (e) => {
    if (!currentRef.current) return;
    e.preventDefault();
    currentRef.current.points.push(pointFromEvent(e));
    redraw();
  };

  const endStroke = () => {
    if (!currentRef.current) return;
    strokesRef.current.push(currentRef.current);
    currentRef.current = null;
    redraw();
    sync();
  };

  const undo = () => {
    strokesRef.current.pop();
    redraw();
    sync();
  };

  const clear = () => {
    strokesRef.current = [];
    currentRef.current = null;
    redraw();
    sync();
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => strokesRef.current.length === 0,
    clear,
    // Render the normalized strokes into a clean 512x512 white PNG for the API.
    getPNG: () => {
      if (strokesRef.current.length === 0) return null;
      const out = document.createElement('canvas');
      out.width = EXPORT_SIZE;
      out.height = EXPORT_SIZE;
      const ctx = out.getContext('2d');
      drawStrokes(ctx, strokesRef.current, EXPORT_SIZE, EXPORT_SIZE);
      return out.toDataURL('image/png');
    },
  }));

  return (
    <div className="flex flex-col gap-3">
      {/* The drawing surface */}
      <div
        ref={wrapRef}
        className="relative aspect-square w-full overflow-hidden rounded-blob border-[3px] border-ink bg-white shadow-sticker-lg"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
        {count === 0 && !currentRef.current && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-5xl">✍️</span>
            <span className="font-hand text-lg text-ink/50">draw something here</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-blob border-[3px] border-ink bg-paper-deep px-4 py-3 shadow-sticker">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={c.name}
              title={c.name}
              onClick={() => setColor(c.value)}
              className={`h-7 w-7 rounded-full border-2 border-ink transition-transform hover:scale-110 ${
                color === c.value ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper-deep scale-110' : ''
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <div className="hidden h-7 w-px bg-ink/20 sm:block" />

        {/* Brush size */}
        <label className="flex flex-1 items-center gap-2 text-sm font-bold">
          <span className="hidden sm:inline">Brush</span>
          <span
            className="inline-block shrink-0 rounded-full bg-ink"
            style={{ width: `${size}px`, height: `${size}px` }}
          />
          <input
            type="range"
            min="2"
            max="28"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="min-w-[80px] flex-1"
            aria-label="Brush size"
          />
        </label>

        {/* Undo / Clear */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={count === 0}
            className="rounded-xl border-[3px] border-ink bg-white px-3 py-1.5 text-sm font-bold shadow-sticker-sm transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:opacity-40"
          >
            ↩ Undo
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={count === 0}
            className="rounded-xl border-[3px] border-ink bg-white px-3 py-1.5 text-sm font-bold shadow-sticker-sm transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:opacity-40"
          >
            ✕ Clear
          </button>
        </div>
      </div>
    </div>
  );
});

export default DrawCanvas;
