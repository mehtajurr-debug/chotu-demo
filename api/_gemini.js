// Server-side only: one small helper to ask a Gemini model for JSON that follows a fixed schema.
// Used by /api/prescription (reading a prescription photo) and /api/summary (family summaries).
// The API key stays on the server. (Files starting with "_" are helpers, not web addresses, on Vercel.)

const API = 'https://generativelanguage.googleapis.com/v1beta';
let flashModels = null; // { full: [...], lite: [...] } newest first

async function listFlash(key) {
  if (flashModels) return flashModels;
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  if (!r.ok) throw new Error(`Could not list models (HTTP ${r.status}). Is the API key right?`);
  const { models = [] } = await r.json();
  const names = models
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace('models/', ''))
    .filter((n) => /^gemini-\d/.test(n) && n.includes('flash') && !/(tts|image|live|audio|embed|exp|preview|thinking)/.test(n));
  const ver = (n) => parseFloat(n.match(/gemini-(\d+(\.\d+)?)/)[1]);
  flashModels = {
    full: names.filter((n) => !n.includes('lite')).sort((a, b) => ver(b) - ver(a)),
    lite: names.filter((n) => n.includes('lite')).sort((a, b) => ver(b) - ver(a)),
  };
  if (!flashModels.full.length && !flashModels.lite.length) throw new Error('No Gemini Flash model is available for this key.');
  return flashModels;
}

/**
 * Ask for JSON. `prefer: 'full'` tries the bigger Flash model first (better at reading images and writing),
 * then the light one; busy or slow models are skipped until the time budget runs out.
 */
export async function askJSON(key, { parts, schema, prefer = 'full', perModelMs = 20000, budgetMs = 27000, temperature = 0 }) {
  const { full, lite } = await listFlash(key);
  const order = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL]
    : prefer === 'full' ? [...full.slice(0, 2), ...lite.slice(0, 1)] : [...lite.slice(0, 1), ...full.slice(0, 2)];
  const started = Date.now();
  let lastErr = null;
  for (const model of order) {
    const left = budgetMs - (Date.now() - started);
    if (left < 4000) break;
    try {
      const r = await fetch(`${API}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature },
        }),
        signal: AbortSignal.timeout(Math.min(perModelMs, left)),
      });
      if (!r.ok) {
        lastErr = new Error(`Gemini ${model} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        if ([429, 500, 503, 504, 404].includes(r.status)) continue; // busy or not offered: try the next model
        throw lastErr;
      }
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}';
      return { ...JSON.parse(text), model };
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') { lastErr = new Error(`Gemini ${model} did not answer in time`); continue; }
      throw e;
    }
  }
  throw lastErr || new Error('Gemini is busy right now');
}

/** Shared bits of the Vercel-style handlers. */
export function guard(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return null; }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(500).json({ error: 'No GEMINI_API_KEY on the server. Add it to the .env file.' }); return null; }
  return key;
}
