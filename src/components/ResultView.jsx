import { useEffect, useMemo, useRef, useState } from 'react';
import EmojiImage from './EmojiImage.jsx';

const SPARKLE_GLYPHS = ['✨', '⭐', '💫', '🌟'];

// A short burst of sparkles flying outward from the emoji. Re-fires whenever
// `trigger` changes (a new match or a picked alternate).
function Sparkles({ trigger }) {
  const sparkles = useMemo(() => {
    const count = 9;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 60 + Math.random() * 36;
      return {
        glyph: SPARKLE_GLYPHS[i % SPARKLE_GLYPHS.length],
        tx: `${Math.cos(angle) * distance}px`,
        ty: `${Math.sin(angle) * distance}px`,
        delay: `${Math.random() * 0.08}s`,
        size: `${0.8 + Math.random() * 0.7}rem`,
      };
    });
  }, [trigger]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {sparkles.map((s, i) => (
        <span
          key={`${trigger}-${i}`}
          className="sparkle"
          style={{ '--tx': s.tx, '--ty': s.ty, animationDelay: s.delay, fontSize: s.size }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}

const CONFIDENCE_STYLES = {
  high: { label: 'spot on', className: 'bg-gradient-to-r from-emerald to-[#37E0B0] text-white' },
  medium: { label: 'pretty sure', className: 'bg-gradient-to-r from-amber to-[#FFD36B] text-ink' },
  low: { label: 'best guess', className: 'bg-gradient-to-r from-punch to-coral text-white' },
};

const PILL =
  'rounded-full px-4 py-2.5 font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0';

export default function ResultView({ result, onPickAlternate, onTryAgain }) {
  const { doodle, emoji, name, confidence, alternates } = result;
  const resolvedUrlRef = useRef(null);
  const [copied, setCopied] = useState(false);

  resolvedUrlRef.current = null;

  useEffect(() => {
    setCopied(false);
  }, [emoji]);

  const confidenceStyle = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.low;
  const showAlternates =
    (confidence === 'low' || confidence === 'medium') && alternates && alternates.length > 0;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyEmoji = async () => {
    try {
      await navigator.clipboard.writeText(emoji);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const shareEmoji = async () => {
    const url = resolvedUrlRef.current;
    const shareText = `My doodle became ${emoji} ${name}! Made with Doodle to Emoji.`;
    const safeName = (name || 'emoji').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      if (url && navigator.canShare) {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = url.endsWith('.svg') ? 'svg' : 'png';
        const type = ext === 'svg' ? 'image/svg+xml' : 'image/png';
        const file = new File([blob], `${safeName}.${ext}`, { type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: name, text: shareText });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title: name, text: shareText });
        return;
      }
      await navigator.clipboard.writeText(`${emoji} ${shareText}`);
    } catch {
      /* user cancelled or unsupported — ignore */
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
      if (url) window.open(url, '_blank', 'noopener');
    }
  };

  return (
    <div className="animate-float-up flex flex-col gap-6 rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
      {/* Doodle vs emoji */}
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        <figure className="flex flex-col items-center gap-2">
          {doodle && (
            <img
              src={doodle}
              alt="Your doodle"
              className="h-28 w-28 rounded-2xl object-contain ring-1 ring-black/5 sm:h-32 sm:w-32"
            />
          )}
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-ink/40">
            your doodle
          </figcaption>
        </figure>

        <div className="text-2xl font-bold text-ink/25 sm:text-3xl">→</div>

        <figure className="flex flex-col items-center gap-2">
          <div className="relative">
            <div
              key={emoji}
              className="animate-pop flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF1F6] to-[#F1ECFF] ring-1 ring-black/5 sm:h-32 sm:w-32"
            >
              <EmojiImage
                emoji={emoji}
                className="h-20 w-20 select-none text-7xl sm:h-24 sm:w-24"
                onResolved={(url) => {
                  resolvedUrlRef.current = url;
                }}
              />
            </div>
            <Sparkles trigger={emoji} />
          </div>
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-ink/40">
            real emoji
          </figcaption>
        </figure>
      </div>

      {/* Name + confidence */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-display text-2xl font-bold capitalize text-ink">{name}</h2>
        <span
          className={`rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wide shadow-sm ${confidenceStyle.className}`}
        >
          {confidenceStyle.label}
        </span>
      </div>

      {/* Alternates */}
      {showAlternates && (
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-sm font-semibold text-ink/50">Not quite? Try one of these:</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {alternates.map((alt, i) => (
              <button
                key={`${alt}-${i}`}
                type="button"
                onClick={() => onPickAlternate(alt)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-black/10 shadow-sm transition-all hover:-translate-y-0.5 hover:ring-punch/40 active:translate-y-0"
                title="Use this emoji instead"
              >
                <EmojiImage emoji={alt} className="h-7 w-7 text-2xl" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={downloadEmoji}
          className={`${PILL} bg-gradient-to-r from-grape to-sky shadow-glow-grape`}
        >
          ⬇ Download
        </button>
        <button
          type="button"
          onClick={copyEmoji}
          className={`${PILL} bg-gradient-to-r from-emerald to-[#37E0B0] shadow-glow-emerald`}
        >
          {copied ? '✓ Copied!' : `⧉ Copy ${emoji}`}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={shareEmoji}
            className={`${PILL} bg-gradient-to-r from-punch to-coral shadow-glow-punch`}
          >
            ↗ Share
          </button>
        )}
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded-full bg-white px-4 py-2.5 font-bold text-ink ring-1 ring-black/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          ↻ Try again
        </button>
      </div>
    </div>
  );
}
