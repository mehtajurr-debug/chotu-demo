// Server-side only: reads the medicine list from a photo of a printed (computer-made) prescription, using Gemini.
// It only copies what is printed in the Rx section. It never adds, changes or recommends medicines, and it does
// not return the patient's name, diagnosis or test results. The family checks every line, and the primary
// caregiver still has to verify and activate each schedule.
//
// Request:  POST { image: <base64 JPEG/PNG>, mimeType }
// Response: { isPrescription, medicines: [{ brand, strength, form, morning, noon, night, doseUnit, meal,
//             durationType, durationCount, asNeeded, maxPerDay, weekly, weekday, printed, confidence }], model }
import { askJSON, guard } from './_gemini.js';

const PROMPT = `You read photos of printed doctor's prescriptions from Bangladesh for a family medicine-reminder app.
Copy ONLY the medicines in the Rx (℞) section, in order. Do not add, guess, correct or recommend anything.
Ignore the patient's name, age, address, complaints, diagnosis, tests and the doctor's details: do not output them.

For each medicine line:
- brand: the brand name only, without "Tab."/"Cap."/"Inj." and without the strength (e.g. "Osartil", "Napa Extra", "Mixtard 30", "D-Rise").
- strength: as printed (e.g. "50mg", "5/20mg", "40000 IU", "100 IU/ml"); empty if none.
- form: tablet (Tab.), capsule (Cap.), injection (Inj.), syrup, or other.
- The dose pattern "a + b + c" means morning + noon + night. Bangla digits: ০=0 ১=1 ২=2 ৩=3 ৪=4 ৫=5 ৬=6 ৭=7 ৮=8 ৯=9.
  morning, noon, night: the amount at each time as a number (0 if none). For insulin, the number of units (e.g. "২০ ইউনিট + ০ + ১২ ইউনিট" -> 20, 0, 12).
- doseUnit: "tablet", "capsule", "unit" (insulin units), "ml" or "other".
- meal: "before" if it says খাবারের আগে (any minutes), "after" if খাবারের পরে, otherwise "not_stated".
- duration: চলবে = ongoing; "১০দিন" = days 10; "৮ সপ্তাহ" = weeks 8; "৩মাস" = months 3; nothing written = not_stated.
- asNeeded: true for "when needed / ব্যথা বেশি হলে / প্রয়োজনে" medicines; maxPerDay from "দিনে সর্বোচ্চ ৩টি" (0 if not stated).
  For as-needed medicines set morning, noon, night to 0.
- weekly: true for "সপ্তাহে ১টি" style doses; weekday in English if a day is named (e.g. "Friday"), else empty.
- printed: the dose line exactly as printed (Bangla is fine).
- confidence: 0 to 1, how sure you are that you read this line correctly.
If the image is not a prescription or nothing is readable, set isPrescription false and return no medicines.`;

const MED = {
  type: 'OBJECT',
  properties: {
    brand: { type: 'STRING' }, strength: { type: 'STRING' },
    form: { type: 'STRING', enum: ['tablet', 'capsule', 'injection', 'syrup', 'other'] },
    morning: { type: 'NUMBER' }, noon: { type: 'NUMBER' }, night: { type: 'NUMBER' },
    doseUnit: { type: 'STRING', enum: ['tablet', 'capsule', 'unit', 'ml', 'other'] },
    meal: { type: 'STRING', enum: ['before', 'after', 'not_stated'] },
    durationType: { type: 'STRING', enum: ['days', 'weeks', 'months', 'ongoing', 'not_stated'] },
    durationCount: { type: 'NUMBER' },
    asNeeded: { type: 'BOOLEAN' }, maxPerDay: { type: 'NUMBER' },
    weekly: { type: 'BOOLEAN' }, weekday: { type: 'STRING' },
    printed: { type: 'STRING' }, confidence: { type: 'NUMBER' },
  },
  required: ['brand', 'strength', 'form', 'morning', 'noon', 'night', 'doseUnit', 'meal', 'durationType', 'durationCount', 'asNeeded', 'maxPerDay', 'weekly', 'weekday', 'printed', 'confidence'],
};
const SCHEMA = {
  type: 'OBJECT',
  properties: { isPrescription: { type: 'BOOLEAN' }, medicines: { type: 'ARRAY', items: MED } },
  required: ['isPrescription', 'medicines'],
};

export default async function handler(req, res) {
  const key = guard(req, res);
  if (!key) return;
  const { image, mimeType = 'image/jpeg' } = req.body || {};
  if (!image || image.length > 4_000_000) return res.status(400).json({ error: 'Missing or too-large image.' });
  try {
    const out = await askJSON(key, {
      prefer: 'lite', perModelMs: 15000, // the light model read all 18 sample lines correctly in ~4 s; big ones were often overloaded
      parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: image } }],
      schema: SCHEMA,
    });
    res.status(200).json({ isPrescription: Boolean(out.isPrescription), medicines: (out.medicines || []).slice(0, 15), model: out.model });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
