import EmojiImage from './EmojiImage.jsx';

export default function History({ items, onClear }) {
  if (!items.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          Your sticker book <span className="font-hand text-base text-ink/50">({items.length})</span>
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border-2 border-ink bg-white px-2.5 py-1 text-xs font-bold shadow-sticker-sm transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Clear history
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {items.map((item) => (
          <figure
            key={item.id}
            className="flex flex-col items-center gap-1 rounded-2xl border-[3px] border-ink bg-white p-2 shadow-sticker-sm"
          >
            <div className="relative flex w-full items-center justify-center">
              <img
                src={item.doodle}
                alt="Doodle"
                className="h-14 w-14 rounded-lg object-contain opacity-80"
              />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper">
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
