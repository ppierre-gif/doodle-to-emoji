// Convert an emoji character into the Twemoji asset filename codepoint.
// This is the exact, well-tested function from the project brief.
export function toCodePoint(unicodeSurrogates, sep = '-') {
  const r = [];
  let c = 0;
  let p = 0;
  let i = 0;
  while (i < unicodeSurrogates.length) {
    c = unicodeSurrogates.charCodeAt(i++);
    if (p) {
      r.push((0x10000 + (p - 0xd800) * 0x400 + (c - 0xdc00)).toString(16));
      p = 0;
    } else if (0xd800 <= c && c <= 0xdbff) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join(sep);
}

const CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets';

// U+FE0F is the emoji "variation selector". Twemoji filenames usually drop it
// (e.g. ❤️ is served as 2764.png, not 2764-fe0f.png), but some emoji keep it.
const VARIATION_SELECTOR = /️/g;

// We can't know in advance which filename form exists, so build an ordered list
// of candidate URLs (PNG first, then SVG, both with and without the FE0F) and
// let the <img> fall through to the next one on error.
export function emojiAssetCandidates(emoji) {
  const full = toCodePoint(emoji);
  const stripped = toCodePoint(emoji.replace(VARIATION_SELECTOR, ''));
  const bases = [...new Set([full, stripped].filter(Boolean))];

  const urls = [];
  for (const base of bases) urls.push(`${CDN}/72x72/${base}.png`);
  for (const base of bases) urls.push(`${CDN}/svg/${base}.svg`);
  return urls;
}
