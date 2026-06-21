// Calls the serverless function that talks to Claude. The API key lives only on
// the server — this client never sees it.
const ENDPOINT = '/.netlify/functions/analyze-doodle';

export async function analyzeDoodle(pngDataUrl) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: pngDataUrl }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g. an HTML error page).
  }

  if (!res.ok) {
    throw new Error(data?.error || 'Something went wrong. Please try again.');
  }

  return data;
}
