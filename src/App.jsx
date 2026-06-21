import { useCallback, useEffect, useRef, useState } from 'react';
import DrawCanvas from './components/DrawCanvas.jsx';
import ResultView from './components/ResultView.jsx';
import History from './components/History.jsx';
import { analyzeDoodle } from './lib/api.js';
import { primeAudio, playSuccessChime } from './lib/sound.js';

const HISTORY_KEY = 'doodle-emoji-history';
const HISTORY_LIMIT = 24;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const canvasRef = useRef(null);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* storage full/unavailable — app still works in-session */
    }
  }, [history]);

  const handleConvert = useCallback(async () => {
    const png = canvasRef.current?.getPNG();
    if (!png) {
      setError('Draw something first, then tap Convert.');
      return;
    }
    primeAudio(); // unlock audio inside this user gesture
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeDoodle(png);
      setResult({ ...data, doodle: png });
      playSuccessChime();
      setHistory((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            doodle: png,
            emoji: data.emoji,
            name: data.name,
            confidence: data.confidence,
            ts: Date.now(),
          },
          ...prev,
        ].slice(0, HISTORY_LIMIT)
      );
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePickAlternate = useCallback((emoji) => {
    setResult((prev) => (prev ? { ...prev, emoji, confidence: 'high' } : prev));
  }, []);

  const handleTryAgain = useCallback(() => {
    setResult(null);
    setError(null);
    canvasRef.current?.clear();
    setHasDrawing(false);
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Decorative floating blobs behind the content */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="animate-blob-slow absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber/40 blur-3xl" />
        <div className="animate-blob-slower absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-grape/40 blur-3xl" />
        <div className="animate-blob-slow absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-coral/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-full max-w-xl flex-col gap-7 px-4 pb-16 pt-10 sm:pt-12">
        {/* Header */}
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
            ✦ AI doodle magic
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_4px_20px_rgba(43,26,46,0.35)] sm:text-5xl">
            Doodle <span className="text-amber">to</span> Emoji
          </h1>
          <p className="max-w-sm text-base font-medium text-white/85">
            Scribble anything, and watch it turn into the real, polished emoji.
          </p>
        </header>

        {/* Canvas */}
        <DrawCanvas ref={canvasRef} onChange={(c) => setHasDrawing(c > 0)} />

        {/* Convert button */}
        <button
          type="button"
          onClick={handleConvert}
          disabled={!hasDrawing || loading}
          className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-coral via-punch to-amber px-6 py-5 font-display text-lg font-bold text-white shadow-glow-punch transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_24px_55px_-12px_rgba(255,61,139,0.75)] enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-[0.6]"
        >
          {/* Sheen sweep on hover */}
          {!loading && (
            <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 blur-md transition-transform duration-700 ease-out group-enabled:group-hover:translate-x-[420%]" />
          )}
          {loading ? (
            <>
              <Spinner />
              <span>Reading your doodle…</span>
            </>
          ) : (
            <>
              <span className="animate-wiggle text-2xl">🪄</span>
              <span>Convert to Emoji</span>
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-3xl border border-white/50 bg-white/80 px-4 py-3 text-ink shadow-soft backdrop-blur-xl">
            <span className="text-2xl">😬</span>
            <p className="flex-1 text-sm font-semibold">{error}</p>
            <button
              type="button"
              onClick={handleConvert}
              className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Retry
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <ResultView
            result={result}
            onPickAlternate={handlePickAlternate}
            onTryAgain={handleTryAgain}
          />
        )}

        {/* History */}
        <History items={history} onClear={clearHistory} />

        <footer className="mt-auto pt-6 text-center text-sm font-medium text-white/65">
          emoji art by Twemoji · matched by Claude
        </footer>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white"
      aria-hidden="true"
    />
  );
}
