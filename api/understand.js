// Server-side only: turns a short voice clip from the elder into a meaning (intent), using Gemini.
// The API key stays here on the server and never reaches the browser.
// Runs inside the local dev server (see vite.config.js) and, unchanged, as a Vercel function at /api/understand.
//
// Request:  POST { audio: <base64 WAV>, mimeType: 'audio/wav', context: 'reminder' | 'readback' | 'undo' }
// Response: { intent, confidence, transcript }  — understanding is classification, not word-for-word transcription.

import { askJSON } from './_gemini.js';

export const INTENTS = ['took', 'not_yet', 'forgot', 'help', 'pain', 'emergency', 'cancel', 'yes', 'no', 'good', 'unwell', 'other'];

const PROMPT = `You classify one short spoken reply from an older adult in Bangladesh to a medicine reminder app called Chotu.
The speech is Bangla (standard or any regional dialect: Dhaka, Chittagong, Sylhet, Barishal, Noakhali, Rajshahi, Khulna)
and may be mixed with English words. Older speakers may talk softly, slowly, with pauses, filler sounds (হুঁ, এ্যা, ওই যে),
missing teeth, or a TV or other people in the background. Listen for the elder's main answer and ignore the rest.

What Chotu just asked: {CONTEXT}

Pick exactly one intent:
- took: they say they have taken the medicine. Any past form of খাওয়া / নেওয়া counts, in any dialect
  (e.g. খেয়েছি, খাইছি, খাইসি, খাইলাম, খাইয়া ফেলছি, খাই ফালাইছি, হ খাইছি, জি খেয়েছি, নিয়েছি, নিছি, হয়ে গেছে, হইছে, খাওয়া শেষ, taken, done)
- not_yet: not taken yet / will take later (e.g. এখনও খাইনি, খাই নাই, খাইনাই, না খাই নাই, পরে খাব, পরে খামু, একটু পরে, এখন খাব, খাচ্ছি)
- forgot: they don't remember whether they took it (e.g. মনে নেই, মনে নাই, মনে পড়ে না, ঠিক মনে পড়ছে না, খেয়েছি কিনা জানি না, ভুলে গেছি)
- help: they ask for help or for family (e.g. সাহায্য চাই, আমাকে একটু সাহায্য করুন, ছেলেকে ডাকো, মেয়েকে ফোন দাও, কেউ আসো)
- pain: they mention pain, without asking for urgent help (e.g. ব্যথা, ব্যাথা করে, কোমরে ব্যথা)
- emergency: urgent alarm words (e.g. জরুরি, বাঁচাও, বাঁচান, সাহায্য করুন!! shouted, আমি পড়ে গেছি)
- cancel: they cancel something (e.g. বাতিল, থামো, লাগবে না, ভুল করে চাপছি)
- good: they feel well (e.g. ভালো আছি, আলহামদুলিল্লাহ ভালো, ঠিক আছি, ভালাই আছি)
- unwell: they feel unwell or weak, without naming pain (e.g. শরীরটা ভালো না, দুর্বল লাগছে, মাথা ঘুরছে, জ্বর জ্বর লাগে)
- yes: a plain yes (হ্যাঁ, হ, হুম, জি, জি হ্যাঁ, ঠিক আছে, আচ্ছা, yes)
- no: a plain no or a correction (না, না না, নাহ, ভুল হয়েছে, no)
- other: anything else, silence, noise, or speech you truly cannot make out

Rules:
- Context matters. After "Did you take it?", a plain yes (হ্যাঁ, হ, জি, হুম) means took and a plain no means not_yet.
- Judge the meaning, not perfect words: a half-heard "...খাইছি" or "হ... খাইলাম" is still took.
- confidence is 0 to 1. Use 0.8 or more when the meaning is clear even if the words are informal or dialect.
  Use below 0.6 only when the audio is really unclear, partly heard, or the meaning is ambiguous.
- transcript is your best Bangla transcription of what they said (short), in Bangla script. Empty if nothing was said.
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

/** Asks a light Flash model; if it is slow a second joins and the first answer wins, so one busy model doesn't stall Chotu. */
export async function understand({ audio, mimeType = 'audio/wav', context = 'reminder' }, key) {
  const out = await askJSON(key, {
    parts: [
      { text: PROMPT.replace('{CONTEXT}', CONTEXTS[context] || CONTEXTS.reminder) },
      { inline_data: { mime_type: mimeType, data: audio } },
    ],
    schema: SCHEMA,
    prefer: 'lite', // the light model was the fastest and just as accurate for these short answers in our tests
    parallel: 2,
    staggerMs: 2500, // a second model joins only if the first is slow (saves the free daily allowance)
    budgetMs: 11000, // after this Chotu asks again instead of hanging
  });
  return {
    intent: INTENTS.includes(out.intent) ? out.intent : 'other',
    confidence: Math.max(0, Math.min(1, Number(out.confidence) || 0)),
    transcript: String(out.transcript || '').slice(0, 200),
    model: out.model,
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
