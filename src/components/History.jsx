import { useState } from 'react';
import EmojiImage from './EmojiImage.jsx';
import { downloadStickerPack } from '../lib/stickerPack.js';

export default function History({ items, onClear }) {
  const [packing, setPacking] = useState(false);

  if (!items.length) return null;

  const handleDownloadPack = async () => {
    setPacking(true);
    try {
      await downloadStickerPack(items);
    } catch {
      /* compositing/zip failed — leave the UI as-is */
    } finally {
      setPacking(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-[2rem] border border-white/40 bg-white/15 p-5 shadow-soft backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-white drop-shadow-sm">
          Sticker book <span className="font-body text-sm font-semibold text-white/70">· {items.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPack}
            disabled={packing}
            className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:opacity-60"
          >
            {packing ? 'Packing…' : '⬇ Sticker pack (.zip)'}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-white/50 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/20"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {items.map((item) => (
          <figure
            key={item.id}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2 shadow-soft transition-transform hover:-translate-y-1"
          >
            <div className="relative flex w-full items-center justify-center">
              <img
                src={item.doodle}
                alt="Doodle"
                className="h-14 w-14 rounded-xl object-contain"
              />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-black/5 shadow-sm">
                <EmojiImage emoji={item.emoji} className="h-5 w-5 text-lg" />
              </span>
            </div>
            <figcaption className="mt-1 line-clamp-1 w-full text-center text-[11px] font-bold capitalize text-ink/70">
              {item.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
