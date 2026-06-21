import JSZip from 'jszip';
import { emojiAssetCandidates } from './twemoji.js';

function loadImage(src, cors = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

// Load the emoji's Twemoji PNG with CORS enabled so it can be drawn onto a
// canvas without tainting it (jsdelivr serves the right CORS headers). We use
// the 72x72 PNGs only — SVGs can taint the canvas in some browsers.
async function loadEmojiPng(emoji) {
  const pngs = emojiAssetCandidates(emoji).filter((u) => u.endsWith('.png'));
  for (const url of pngs) {
    try {
      return await loadImage(url, true);
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

// Compose one "sticker": the doodle on cream paper with the matched emoji as a
// badge in the corner — the same look as the history cards.
async function composeSticker(item) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FBF6E9';
  ctx.fillRect(0, 0, size, size);

  // Doodle panel
  const m = 36;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(m, m, size - 2 * m, size - 2 * m);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2B2B3A';
  ctx.strokeRect(m, m, size - 2 * m, size - 2 * m);
  try {
    const doodle = await loadImage(item.doodle);
    ctx.drawImage(doodle, m, m, size - 2 * m, size - 2 * m);
  } catch {
    /* doodle missing — leave the white panel */
  }

  // Emoji badge, bottom-right
  const emojiImg = await loadEmojiPng(item.emoji);
  if (emojiImg) {
    const b = 150;
    const x = size - b - 28;
    const y = size - b - 28;
    const cx = x + b / 2;
    const cy = y + b / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, b / 2 + 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#2B2B3A';
    ctx.stroke();
    ctx.drawImage(emojiImg, x, y, b, b);
  }

  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Build a .zip of sticker PNGs from the history and trigger a download.
export async function downloadStickerPack(items) {
  const zip = new JSZip();
  const usedNames = {};

  for (const item of items) {
    const blob = await composeSticker(item);
    if (!blob) continue;
    const base = (item.name || 'sticker').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'sticker';
    usedNames[base] = (usedNames[base] || 0) + 1;
    const filename = usedNames[base] > 1 ? `${base}-${usedNames[base]}.png` : `${base}.png`;
    zip.file(filename, blob);
  }

  const archive = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(archive);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'doodle-emoji-sticker-pack.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
