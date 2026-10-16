// Server-side only: turns the facts Chotu recorded (doses, afternoon check-ins, alerts, family notes) into a short
// Bangla summary for the family, with patterns worth watching and practical things the family can do.
// The facts come from src/lib/facts.js and contain only what the elder agreed to share.
// Strict rules: no diagnosis, no medicine or dose changes, nothing that is not in the facts.
//
// Request:  POST { period: 'today' | 'yesterday' | 'week' | 'month', facts }
// Response: { headline, summary, signals: [{ kind: 'watch' | 'good', text, evidence }], tips: [string], model }
import { askJSON, guard } from './_gemini.js';

const PERIOD = {
  today: 'today so far (the day is not over; doses later today are simply not due yet)',
  yesterday: 'yesterday',
  week: 'the last 7 days, compared with the week before',
  month: 'the last 4 weeks, week by week',
};

const PROMPT = `You write a short summary for the family caregivers of an older adult in Bangladesh, in natural, warm, simple Bangla
(as a caring family member would speak; Bangla digits; medicine names stay in English letters).
The data comes from Chotu, a voice medicine-reminder app: scheduled doses and whether they were taken, missed (no answer
after 30 minutes) or answered late, as-needed medicines, a short afternoon check-in (feeling, walked today, enough water,
slept well), alerts, and notes the family wrote.

Dose status meanings: taken; missed = no answer after 30 minutes (family was alerted); due = the time has come and there is no answer yet; snoozed = said "not yet"; unsure = said they do not remember; help = asked for help; upcoming or before = not due yet, ignore.

Period: {PERIOD}

Write:
- headline: ONE sentence that tells the family how things are going, the most important point first.
- summary: 2 to 3 short sentences that connect the facts (what is steady, what changed, how it compares with before).
  Do not list every dose; tell the story.
- signals: up to 4 patterns over time worth noticing. kind "watch" for something to keep an eye on, "good" for a
  positive pattern. Each needs evidence: the counts it is based on (e.g. "শেষ ১০ দিনে ৪ দিন হাঁটুর ব্যথার কথা").
  Look for trends: something getting more or less frequent, late or missed doses clustering at one time of day,
  as-needed medicine used more often, habits (walking, water, sleep) that dropped, and links between them.
  Only claim a pattern if the numbers show it. If the period is short or calm, fewer signals is fine.
- tips: up to 3 practical, kind things the FAMILY can do, linked to the signals. For example: call or visit at a
  certain time, help with a routine, keep water within reach, mention a repeated complaint to the doctor at the next
  visit (use an appointment from the family notes if there is one), check the medicine supply.

Hard rules (this is a safety requirement):
- Never diagnose, never name a disease or cause, never interpret symptoms medically.
- Never suggest starting, stopping, skipping or changing any medicine or dose. Never give medical advice.
  For anything about health, the tip is to tell the doctor.
- Use only the facts given. Do not invent events, numbers or feelings. If there is no check-in for a day, say nothing about how they felt, walked, drank or slept that day. If something is not shared (sharing false), say
  nothing about it.
- Respectful tone about the elder; never blame them.

Facts (JSON):
`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING' },
    summary: { type: 'STRING' },
    signals: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { kind: { type: 'STRING', enum: ['watch', 'good'] }, text: { type: 'STRING' }, evidence: { type: 'STRING' } },
        required: ['kind', 'text', 'evidence'],
      },
    },
    tips: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['headline', 'summary', 'signals', 'tips'],
};

// Words that would make it medical advice. If they show up in a tip, the tip is dropped.
const UNSAFE = /(ডোজ বাড়|ডোজ কম|ওষুধ বন্ধ|বন্ধ করুন|ওষুধ বাদ|বেশি করে খাওয়ান|খাওয়া বন্ধ|stop taking|increase the dose|reduce the dose)/i;

export default async function handler(req, res) {
  const key = guard(req, res);
  if (!key) return;
  const { period = 'today', facts } = req.body || {};
  if (!facts || JSON.stringify(facts).length > 60_000) return res.status(400).json({ error: 'Missing or too-large facts.' });
  try {
    const out = await askJSON(key, {
      prefer: 'lite', temperature: 0.3,
      parts: [{ text: PROMPT.replace('{PERIOD}', PERIOD[period] || PERIOD.today) + JSON.stringify(facts) }],
      schema: SCHEMA,
    });
    res.status(200).json({
      headline: String(out.headline || ''),
      summary: String(out.summary || ''),
      signals: (out.signals || []).slice(0, 4),
      tips: (out.tips || []).filter((t) => !UNSAFE.test(t)).slice(0, 3),
      model: out.model,
    });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
