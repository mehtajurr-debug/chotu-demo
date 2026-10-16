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

const gone = new Set(); // models Google says are no longer offered (HTTP 404): never asked again

/**
 * Ask for JSON. When Gemini is overloaded some models answer "busy" and others are slow, so this asks up to
 * `parallel` models AT THE SAME TIME and keeps the first good answer (the others are cancelled). When one fails,
 * the next model on the list starts, until the time budget runs out. `prefer: 'full'` puts the bigger Flash models
 * first (better at writing); `'lite'` puts the light ones first (faster, and usually less busy).
 */
export async function askJSON(key, { parts, schema, prefer = 'full', parallel = 3, budgetMs = 27000, temperature = 0 }) {
  const { full, lite } = await listFlash(key);
  const order = (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL]
    : prefer === 'full' ? [...full, ...lite] : [...lite, ...full]).filter((m) => !gone.has(m));
  const stop = new AbortController();
  const deadline = AbortSignal.timeout(budgetMs);
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature },
  });

  async function ask(model) {
    try {
      const r = await fetch(`${API}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.any([stop.signal, deadline]),
      });
      if (!r.ok) {
        if (r.status === 404) gone.add(model);
        const err = new Error(`Gemini ${model} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        err.retry = [429, 500, 503, 504, 404].includes(r.status); // busy or not offered: another model may work
        throw err;
      }
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}';
      return { ...JSON.parse(text), model };
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        const err = new Error(`Gemini ${model} did not answer in time`);
        err.retry = true;
        throw err;
      }
      if (e.retry === undefined) e.retry = true; // network hiccup or bad JSON: try another model
      throw e;
    }
  }

  return new Promise((resolve, reject) => {
    let next = 0;
    let running = 0;
    let done = false;
    const errors = [];
    const finish = (fn, v) => { if (!done) { done = true; stop.abort(); fn(v); } };
    const launch = () => {
      while (!done && running < parallel && next < order.length && !deadline.aborted) {
        const model = order[next++];
        running += 1;
        ask(model).then((out) => finish(resolve, out), (e) => {
          running -= 1;
          errors.push(e);
          if (!e.retry) return finish(reject, e); // e.g. a wrong API key: other models won't help
          launch();
          if (!running) {
            const busy = errors.filter((x) => /HTTP (429|5dd)|did not answer/.test(x.message)).length;
            finish(reject, new Error(busy ? 'Gemini is very busy right now. Please try again in a minute.' : String(errors.at(-1)?.message || 'Gemini is busy right now')));
          }
        });
      }
    };
    if (!order.length) return reject(new Error('No Gemini Flash model is available for this key.'));
    launch();
  });
}

/** Shared bits of the Vercel-style handlers. */
export function guard(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return null; }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(500).json({ error: 'No GEMINI_API_KEY on the server. Add it to the .env file.' }); return null; }
  return key;
}
