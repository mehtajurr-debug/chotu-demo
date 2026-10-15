// Server-side only: turns a short voice clip from the elder into a meaning (intent), using Gemini.
// The API key stays here on the server and never reaches the browser.
// Runs inside the local dev server (see vite.config.js) and, unchanged, as a Vercel function at /api/understand.
//
// Request:  POST { audio: <base64 WAV>, mimeType: 'audio/wav', context: 'reminder' | 'readback' | 'undo' }
// Response: { intent, confidence, transcript }  — understanding is classification, not word-for-word transcription.

const API = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_TIMEOUT_MS = 6000; // per model
const TOTAL_BUDGET_MS = 12000; // give up after this, so Chotu can ask again instead of hanging

export const INTENTS = ['took', 'not_yet', 'forgot', 'help', 'pain', 'emergency', 'cancel', 'yes', 'no', 'good', 'unwell', 'other'];

const PROMPT = `You classify one short spoken reply from an older adult in Bangladesh to a medicine reminder app called Chotu.
The speech is Bangla (any regional dialect) and may be mixed with English words.

What Chotu just asked: {CONTEXT}

Pick exactly one intent:
- took: they say they have taken the medicine (e.g. খেয়েছি, খাইছি, খাইলাম, হ খাইছি, নিয়েছি, হয়ে গেছে)
- not_yet: not taken yet / will take later (e.g. এখনও খাইনি, পরে খাব, খাই নাই, একটু পরে)
- forgot: they don't remember whether they took it (e.g. মনে নেই, মনে নাই, ঠিক মনে পড়ছে না)
- help: they ask for help or for family (e.g. সাহায্য চাই, আমাকে একটু সাহায্য করুন, ছেলেকে ডাকো)
- pain: they mention pain or feeling unwell, without asking for urgent help
- emergency: urgent alarm words (e.g. জরুরি, বাঁচাও, বাঁচান, সাহায্য করুন!! shouted)
- cancel: they cancel something (e.g. বাতিল, থামো)
- good: they feel well (e.g. ভালো আছি, আলহামদুলিল্লাহ ভালো, ঠিক আছি)
- unwell: they feel unwell or weak, without naming pain (e.g. শরীরটা ভালো না, দুর্বল লাগছে, মাথা ঘুরছে)
- yes: a plain yes (হ্যাঁ, হ, জি, ঠিক আছে)
- no: a plain no or a correction (না, না না, ভুল হয়েছে)
- other: anything else, silence, noise, or unclear speech

Rules:
- Context matters. After "Did you take it?", a plain yes means took. During the 5-second undo window, any "no" means no.
- confidence is 0 to 1. Use below 0.6 when the audio is unclear, partly heard, or the meaning is ambiguous.
- transcript is your best Bangla transcription of what they said (short). Empty if nothing was said.
- Never give medical advice. Only classify.`;

const CONTEXTS = {
  reminder: '“It is time for your medicine. Did you take it?”',
  readback: '“Did you say you took the medicine? Say yes or no.”',
  undo: '“Noted that you took it. Say no if that is wrong.” (5-second undo window)',
  checkin_feeling: '“How are you feeling today?” (daily check-in)',
  checkin_walk: '“Did you walk a little today?” (daily check-in; answer is yes or no)',
  checkin_water: '“Did you drink enough water today?” (daily check-in; answer is yes or no)',
  checkin_sleep: '“Did you sleep well last night?” (daily check-in; answer is yes or no)',
  cancel: '“Sending an emergency alert to your family in 5 seconds. Say cancel (বাতিল) if it was a mistake.”',
};

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING', enum: INTENTS },
    confidence: { type: 'NUMBER' },
    transcript: { type: 'STRING' },
  },
  required: ['intent', 'confidence', 'transcript'],
};

let candidates = null; // models to try, best first
let lastGood = null; // the model that answered last time

/** GEMINI_MODEL if set; otherwise the Flash models this key can use, newest first, with a lighter one as backup. */
async function modelsToTry(key) {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];
  if (!candidates) {
    const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!r.ok) throw new Error(`Could not list models (HTTP ${r.status}). Is the API key right?`);
    const { models = [] } = await r.json();
    const names = models
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
      .filter((n) => /^gemini-\d/.test(n) && n.includes('flash') && !/(tts|image|live|audio|embed|exp|preview|thinking)/.test(n));
    const ver = (n) => parseFloat(n.match(/gemini-(\d+(\.\d+)?)/)[1]);
    const full = names.filter((n) => !n.includes('lite')).sort((a, b) => ver(b) - ver(a));
    const lite = names.filter((n) => n.includes('lite')).sort((a, b) => ver(b) - ver(a));
    // The light model was the fastest and just as accurate in our tests, so try it first.
    candidates = [...lite.slice(0, 1), ...full.slice(0, 2)];
    if (!candidates.length) throw new Error('No Gemini Flash model is available for this key.');
  }
  return lastGood ? [lastGood, ...candidates.filter((m) => m !== lastGood)] : candidates;
}

export async function understand(input, key) {
  let lastErr = null;
  const started = Date.now();
  for (const model of await modelsToTry(key)) {
    if (Date.now() - started > TOTAL_BUDGET_MS - MODEL_TIMEOUT_MS + 1000) break; // not enough time left for another try
    try {
      const out = await askModel(model, input, key);
      lastGood = model;
      return out;
    } catch (e) {
      lastErr = e;
      if (!e.busy) throw e; // a real error (bad key, bad audio): trying other models won't help
    }
  }
  throw lastErr || new Error("Gemini is busy right now");
}

async function askModel(model, { audio, mimeType = 'audio/wav', context = 'reminder' }, key) {
  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: PROMPT.replace('{CONTEXT}', CONTEXTS[context] || CONTEXTS.reminder) },
        { inline_data: { mime_type: mimeType, data: audio } },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0 },
  };
  let r;
  try {
    r = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS), // a slow model is as bad as a busy one in a live demo
    });
  } catch (e) {
    const err = new Error(`Gemini ${model} did not answer in time`);
    err.busy = true;
    throw err;
  }
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 200);
    const err = new Error(`Gemini ${model} HTTP ${r.status}: ${detail}`);
    err.busy = [429, 500, 503, 504].includes(r.status) || r.status === 404; // busy or not offered: try the next model
    throw err;
  }
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}';
  const out = JSON.parse(text);
  return {
    intent: INTENTS.includes(out.intent) ? out.intent : 'other',
    confidence: Math.max(0, Math.min(1, Number(out.confidence) || 0)),
    transcript: String(out.transcript || '').slice(0, 200),
    model,
  };
}

/** Vercel-style handler: (req, res). req.body is the parsed JSON. */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  // On the hosted version only people with the passcode can use the live microphone (it spends the API quota).
  const pass = process.env.MIC_PASSCODE;
  if (pass && String(req.headers['x-passcode'] || '').trim().toLowerCase() !== pass.trim().toLowerCase()) {
    return res.status(401).json({ error: 'Wrong or missing microphone passcode.' });
  }
  if (req.body?.check) return res.status(200).json({ ok: true }); // passcode check only
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'No GEMINI_API_KEY on the server. Add it to the .env file.' });
  const { audio } = req.body || {};
  if (!audio || audio.length > 3_000_000) return res.status(400).json({ error: 'Missing or too-large audio.' });
  try {
    res.status(200).json(await understand(req.body, key));
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
