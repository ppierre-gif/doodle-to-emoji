import Anthropic from '@anthropic-ai/sdk';

// The model is fixed server-side. Claude Sonnet 4.6 handles vision well and is
// fast enough for a snappy "draw -> convert" loop.
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an emoji recognition assistant. You will be shown a simple hand-drawn doodle, often crude or minimal. Identify the single standard Unicode emoji it most closely represents, considering shape, facial expression, objects, and common symbols people doodle. Respond with ONLY valid JSON and nothing else — no markdown fences, no commentary:
{"emoji": "😀", "name": "grinning face", "confidence": "high|medium|low", "alternates": ["😃", "😄"]}
Always pick your best guess even if uncertain — set confidence to low in that case rather than refusing.`;

// Small helper so every error the browser sees has the same friendly shape.
function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

// Pull the first balanced JSON object out of a string, tolerating stray
// markdown fences or leading/trailing prose if the model ever adds them.
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

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(500, {
      error: 'The server is missing its ANTHROPIC_API_KEY. Add it in the Netlify dashboard.',
    });
  }

  // Parse the request body.
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

  // Accept either a raw base64 string or a full data URL; we only want the base64.
  const base64 = image.includes(',') ? image.split(',').pop() : image;
  if (!isNonEmptyString(base64)) {
    return jsonResponse(400, { error: 'The drawing could not be read.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: base64 },
            },
            {
              type: 'text',
              text: 'Identify the single closest standard Unicode emoji for this doodle. Respond with ONLY the JSON object.',
            },
          ],
        },
      ],
    });
  } catch (err) {
    // Map the SDK's typed errors to clear, user-facing messages.
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

  // Pull the text out of the response and parse the JSON.
  const textBlock = (message.content || []).find((b) => b.type === 'text');
  const raw = textBlock?.text || '';
  const parsed = extractJson(raw);

  if (!parsed || !isNonEmptyString(parsed.emoji)) {
    return jsonResponse(502, {
      error: "Couldn't make out an emoji from that one. Try a clearer or simpler doodle.",
    });
  }

  // Validate / normalize the shape before handing it to the frontend.
  const confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
    ? parsed.confidence
    : 'low';
  const alternates = Array.isArray(parsed.alternates)
    ? parsed.alternates.filter(isNonEmptyString).slice(0, 3)
    : [];

  return jsonResponse(200, {
    emoji: parsed.emoji.trim(),
    name: isNonEmptyString(parsed.name) ? parsed.name.trim() : 'emoji',
    confidence,
    alternates,
  });
};
