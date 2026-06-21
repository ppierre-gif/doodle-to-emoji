import { useEffect, useRef, useState } from 'react';
import EmojiImage from './EmojiImage.jsx';

const CONFIDENCE_STYLES = {
  high: { label: 'spot on', className: 'bg-mint text-ink' },
  medium: { label: 'pretty sure', className: 'bg-sunshine text-ink' },
  low: { label: 'best guess', className: 'bg-tangerine text-white' },
};

export default function ResultView({ result, onPickAlternate, onTryAgain }) {
  const { doodle, emoji, name, confidence, alternates } = result;
  const resolvedUrlRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Track which Twemoji URL actually loaded, so Download grabs the real asset.
  resolvedUrlRef.current = null;

  useEffect(() => {
    setCopied(false);
  }, [emoji]);

  const confidenceStyle = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.low;
  const showAlternates =
    (confidence === 'low' || confidence === 'medium') && alternates && alternates.length > 0;

  const copyEmoji = async () => {
    try {
      await navigator.clipboard.writeText(emoji);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const downloadEmoji = async () => {
    const url = resolvedUrlRef.current;
    const safeName = (name || 'emoji').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      if (!url) throw new Error('no asset');
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = url.endsWith('.svg') ? 'svg' : 'png';
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${safeName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fall back to opening the asset in a new tab if direct download fails.
      if (url) window.open(url, '_blank', 'noopener');
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-blob border-[3px] border-ink bg-white p-5 shadow-sticker-lg animate-float-up sm:p-7">
      {/* Doodle vs emoji, side by side */}
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        <figure className="flex flex-col items-center gap-2">
          {doodle && (
            <img
              src={doodle}
              alt="Your doodle"
              className="h-28 w-28 rounded-2xl border-[3px] border-ink object-contain shadow-sticker-sm sm:h-32 sm:w-32"
            />
          )}
          <figcaption className="font-hand text-sm text-ink/60">your doodle</figcaption>
        </figure>

        <div className="text-3xl text-ink/40 sm:text-4xl">→</div>

        <figure className="flex flex-col items-center gap-2">
          <div
            key={emoji}
            className="flex h-28 w-28 items-center justify-center rounded-2xl border-[3px] border-ink bg-paper shadow-sticker-sm animate-pop sm:h-32 sm:w-32"
          >
            <EmojiImage
              emoji={emoji}
              className="h-20 w-20 select-none text-7xl sm:h-24 sm:w-24"
              onResolved={(url) => {
                resolvedUrlRef.current = url;
              }}
            />
          </div>
          <figcaption className="font-hand text-sm text-ink/60">real emoji</figcaption>
        </figure>
      </div>

      {/* Name + confidence */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-display text-2xl font-bold capitalize">{name}</h2>
        <span
          className={`rounded-full border-2 border-ink px-3 py-0.5 text-xs font-extrabold uppercase tracking-wide ${confidenceStyle.className}`}
        >
          {confidenceStyle.label}
        </span>
      </div>

      {/* Alternates */}
      {showAlternates && (
        <div className="flex flex-col items-center gap-2">
          <p className="font-hand text-sm text-ink/60">not quite? try one of these:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {alternates.map((alt, i) => (
              <button
                key={`${alt}-${i}`}
                type="button"
                onClick={() => onPickAlternate(alt)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-ink bg-paper-deep shadow-sticker-sm transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                title="Use this emoji instead"
              >
                <EmojiImage emoji={alt} className="h-7 w-7 text-2xl" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={downloadEmoji}
          className="rounded-xl border-[3px] border-ink bg-sky px-4 py-2 font-bold text-white shadow-sticker transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          ⬇ Download
        </button>
        <button
          type="button"
          onClick={copyEmoji}
          className="rounded-xl border-[3px] border-ink bg-mint px-4 py-2 font-bold text-ink shadow-sticker transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {copied ? '✓ Copied!' : `⧉ Copy ${emoji}`}
        </button>
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded-xl border-[3px] border-ink bg-white px-4 py-2 font-bold shadow-sticker transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          ↻ Try again
        </button>
      </div>
    </div>
  );
}
