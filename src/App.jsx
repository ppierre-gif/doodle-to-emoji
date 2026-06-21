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

  // Persist history whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Storage full or unavailable — ignore; the app still works in-session.
    }
  }, [history]);

  const handleConvert = useCallback(async () => {
    const png = canvasRef.current?.getPNG();
    if (!png) {
      setError('Draw something first, then tap Convert.');
      return;
    }
    // Unlock audio inside this user gesture so the success chime can play later.
    primeAudio();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeDoodle(png);
      const newResult = { ...data, doodle: png };
      setResult(newResult);
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
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-4 pb-16 pt-8 sm:pt-10">
      {/* Header */}
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Doodle{' '}
          <span className="relative inline-block">
            <span className="text-tangerine">to</span>
          </span>{' '}
          Emoji
        </h1>
        <p className="font-hand text-lg text-ink/60">
          scribble it — get the real emoji ✨
        </p>
      </header>

      {/* Canvas */}
      <DrawCanvas ref={canvasRef} onChange={(c) => setHasDrawing(c > 0)} />

      {/* Convert button */}
      <button
        type="button"
        onClick={handleConvert}
        disabled={!hasDrawing || loading}
        className="group relative flex items-center justify-center gap-2 rounded-blob border-[3px] border-ink bg-tangerine px-6 py-4 font-display text-xl font-bold text-white shadow-sticker-lg transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-x-1 enabled:active:translate-y-1 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
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
        <div className="flex items-center gap-3 rounded-blob border-[3px] border-ink bg-tangerine/15 px-4 py-3 text-ink shadow-sticker">
          <span className="text-2xl">😬</span>
          <p className="flex-1 text-sm font-bold">{error}</p>
          <button
            type="button"
            onClick={handleConvert}
            className="rounded-lg border-2 border-ink bg-white px-3 py-1 text-sm font-bold shadow-sticker-sm transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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

      <footer className="mt-auto pt-6 text-center font-hand text-sm text-ink/40">
        emoji art by Twemoji · matched by Claude
      </footer>
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
