import Anthropic from '@anthropic-ai/sdk';

// ---- Provider configuration ---------------------------------------------
// The function chooses a provider automatically:
//   1. Anthropic Claude  — if ANTHROPIC_API_KEY is set (best quality)
//   2. Local Gemma (Ollama) — if a local vision model is reachable (free, offline)
//   3. Demo mode — random labeled guess so the app always works
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e2b-it-qat'; // vision-capable
const USE_OLLAMA = process.env.USE_OLLAMA !== 'false';

const SYSTEM_PROMPT = `You are an emoji recognition assistant. You will be shown a simple hand-drawn doodle, often crude or minimal. Identify the single standard Unicode emoji it most closely represents, considering shape, facial expression, objects, and common symbols people doodle. Respond with ONLY valid JSON and nothing else — no markdown fences, no commentary:
{"emoji": "😀", "name": "grinning face", "confidence": "high|medium|low", "alternates": ["😃", "😄"]}
Always pick your best guess even if uncertain — set confidence to low in that case rather than refusing.`;

const USER_PROMPT =
  'Identify the single closest standard Unicode emoji for this doodle. Respond with ONLY the JSON object.';

// Used for demo mode (no provider available) so the app is testable offline.
const DEMO_EMOJIS = [
  { emoji: '😀', name: 'grinning face', alternates: ['😃', '😄'] },
  { emoji: '❤️', name: 'red heart', alternates: ['🧡', '💖'] },
  { emoji: '🔥', name: 'fire', alternates: ['✨', '💥'] },
  { emoji: '👍', name: 'thumbs up', alternates: ['👌', '✌️'] },
  { emoji: '⭐', name: 'star', alternates: ['🌟', '✨'] },
  { emoji: '🌙', name: 'crescent moon', alternates: ['🌝', '☁️'] },
  { emoji: '☀️', name: 'sun', alternates: ['🌤️', '⭐'] },
  { emoji: '🏠', name: 'house', alternates: ['🏡', '🏘️'] },
  { emoji: '🐱', name: 'cat face', alternates: ['😺', '🐈'] },
  { emoji: '🌳', name: 'deciduous tree', alternates: ['🌲', '🌴'] },
  { emoji: '🚗', name: 'automobile', alternates: ['🚕', '🏎️'] },
  { emoji: '🍎', name: 'red apple', alternates: ['🍏', '🍅'] },
  { emoji: '⚡', name: 'high voltage', alternates: ['🌩️', '✨'] },
  { emoji: '😎', name: 'smiling face with sunglasses', alternates: ['😏', '🆒'] },
  { emoji: '🎈', name: 'balloon', alternates: ['🎉', '🎊'] },
  { emoji: '🌈', name: 'rainbow', alternates: ['☁️', '✨'] },
];

// ---- helpers ------------------------------------------------------------
function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

// Pull the first balanced JSON object out of a string, tolerating stray
// markdown fences or leading/trailing prose.
function extractJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

// Validate / normalize whatever a model returned into our response shape.
function normalizeResult(parsed, extra = {}) {
  if (!parsed || !isNonEmptyString(parsed.emoji)) return null;
  const confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
    ? parsed.confidence
    : 'low';
  const alternates = Array.isArray(parsed.alternates)
    ? parsed.alternates.filter(isNonEmptyString).slice(0, 3)
    : [];
  return {
    emoji: parsed.emoji.trim(),
    name: isNonEmptyString(parsed.name) ? parsed.name.trim() : 'emoji',
    confidence,
    alternates,
    ...extra,
  };
}

// ---- providers ----------------------------------------------------------
async function analyzeWithClaude(base64) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let message;
  try {
    message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return jsonResponse(429, { error: 'The emoji brain is busy right now. Wait a moment and try again.' });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return jsonResponse(500, { error: 'The server API key is invalid. Check it in the Netlify dashboard.' });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return jsonResponse(502, { error: 'Could not reach the emoji service. Check the connection and retry.' });
    }
    const status = err?.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    return jsonResponse(status, { error: 'Something went wrong reading your doodle. Please try again.' });
  }

  const textBlock = (message.content || []).find((b) => b.type === 'text');
  const result = normalizeResult(extractJson(textBlock?.text || ''), { source: 'claude' });
  if (!result) {
    return jsonResponse(502, { error: "Couldn't make out an emoji from that one. Try a clearer or simpler doodle." });
  }
  return jsonResponse(200, result);
}

// Returns a normalized result object, or null if the local model is
// unreachable / unusable (so the caller can fall back to demo mode).
async function analyzeWithOllama(base64) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        think: false, // skip the thinking phase — we just want the JSON
        format: 'json',
        keep_alive: '30m', // keep the model warm between doodles
        options: { temperature: 0 },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT, images: [base64] },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeResult(extractJson(data?.message?.content || ''), { source: 'gemma' });
  } catch {
    return null; // unreachable, timed out, or bad output — fall back to demo
  } finally {
    clearTimeout(timeout);
  }
}

function demoResult() {
  const pick = DEMO_EMOJIS[Math.floor(Math.random() * DEMO_EMOJIS.length)];
  return {
    emoji: pick.emoji,
    name: pick.name,
    confidence: 'low',
    alternates: pick.alternates,
    demo: true,
  };
}

// ---- handler ------------------------------------------------------------
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid request body.' });
  }

  const image = body.image;
  if (!isNonEmptyString(image)) {
    return jsonResponse(400, { error: 'No drawing was received. Try drawing something first.' });
  }
  const base64 = image.includes(',') ? image.split(',').pop() : image;
  if (!isNonEmptyString(base64)) {
    return jsonResponse(400, { error: 'The drawing could not be read.' });
  }

  // 1. Anthropic Claude (best quality) when a key is configured.
  if (process.env.ANTHROPIC_API_KEY) {
    return await analyzeWithClaude(base64);
  }

  // 2. Local Gemma via Ollama — real recognition, free and offline.
  if (USE_OLLAMA) {
    const local = await analyzeWithOllama(base64);
    if (local) return jsonResponse(200, local);
  }

  // 3. Demo fallback so the app always returns something.
  await new Promise((r) => setTimeout(r, 350));
  return jsonResponse(200, demoResult());
};
