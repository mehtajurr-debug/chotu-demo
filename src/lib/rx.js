// Prescription photo -> medicine drafts the family checks before anything is added.
// Gemini only reads what is printed (see api/prescription.js). Everything here is plain rules:
// match the name to the medicine library, turn "১ + ০ + ১" into morning/night, and flag whatever needs a human look.
import { LIBRARY } from './schedule.js';
import { bn } from './time.js';

const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9.\s/-]/g, ' ').split(/[\s/-]+/).filter(Boolean);
const nums = (s) => (String(s || '').match(/\d+(\.\d+)?/g) || []).map(Number);
const VARIANTS = ['plus', 'e', 'xr', 'd', 'extra', 'mr', 'sr'];
const WEEKDAY_NUM = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

/**
 * Find the library medicine for a printed name. Returns { med, exact }.
 * exact = false when the brand matches but the strength or variant differs (e.g. Osartil vs Osartil Plus,
 * Bizoran 5/20 vs Bizoran 10/40): then the library packet photo would be the wrong one to show the elder.
 */
export function matchLibrary(brand, strength) {
  const w = words(brand);
  if (!w.length) return { med: null, exact: false };
  const same = LIBRARY.filter((m) => words(m.short)[0] === w[0]);
  if (!same.length) return { med: null, exact: false };
  const rxNums = nums(`${brand} ${strength}`);
  const fits = (m) => {
    const lw = words(m.name);
    const variantOk = VARIANTS.every((v) => lw.slice(1).includes(v) === w.slice(1).includes(v));
    const ln = nums(m.name);
    const numOk = !rxNums.length || ln.every((n) => rxNums.includes(n));
    return variantOk && numOk;
  };
  const best = same.find(fits);
  return best ? { med: best, exact: true } : { med: same[0], exact: false };
}

/**
 * One drafts list for the review screen. Each draft has the same fields as a hand-made one in AddMedicine,
 * plus: printed (the line as printed), flags (things to check), include (ticked to add), libMatch.
 */
export function draftsFromRx(medicines, elder, rxPhoto) {
  const out = [];
  medicines.forEach((m, idx) => {
    const { med, exact } = matchLibrary(m.brand, m.strength);
    const flags = [];
    const name = [m.brand, m.strength].filter(Boolean).join(' ');
    let medId = null;
    let custom = null;
    if (med && exact) medId = med.id;
    else {
      custom = { name, short: m.brand, bn: m.brand, strength: m.strength || '', form: ['tablet', 'capsule', 'injection'].includes(m.form) ? m.form : 'tablet' };
      flags.push(med
        ? `তালিকার ${med.name} এর মাত্রা বা ধরন আলাদা, তাই ওই প্যাকেটের ছবি দেখানো হবে না। আসল প্যাকেটের ছবি দিন।`
        : 'ওষুধটি তালিকায় নেই। প্যাকেটের ছবি দিন।');
    }

    // Duration
    let duration = { type: 'ongoing', count: 7 };
    if (m.durationType === 'days') duration = { type: 'days', count: m.durationCount || 7 };
    else if (m.durationType === 'weeks') duration = { type: 'weeks', count: m.durationCount || 4 };
    else if (m.durationType === 'months') {
      duration = { type: 'weeks', count: Math.round((m.durationCount || 1) * 4.3) };
      flags.push(`${bn(m.durationCount || 1)} মাস লেখা আছে, ${bn(duration.count)} সপ্তাহ ধরা হলো।`);
    } else if (m.durationType === 'not_stated' && !m.asNeeded) flags.push('কত দিন চলবে লেখা নেই, “চলবে” ধরা হলো।');

    const meal = m.meal === 'before' ? 'before' : 'after';
    const base = {
      elderId: elder.id, medId, custom, photo: null, meal, duration, rxPhoto, weekdays: [],
      asNeeded: false, minGapHours: 6, maxPerDay: 3, refillDays: 5,
      stock: m.form === 'injection' ? null : 30, // the family sets the real count; insulin is not counted in tablets
      printed: m.printed, confidence: m.confidence, libMatch: med?.name || null,
    };
    if (m.confidence < 0.7) flags.push('এই লাইনটি পড়তে নিশ্চিত নয়, ছবির সঙ্গে মিলিয়ে নিন।');

    if (m.weekly) {
      // e.g. "সপ্তাহে ১টি (শুক্রবার)": that day each week. No time on the prescription, so morning after breakfast.
      const day = WEEKDAY_NUM[String(m.weekday || '').toLowerCase()];
      const slots = [['morning', m.morning], ['noon', m.noon], ['night', m.night]].filter(([, a]) => a > 0).map(([s]) => s);
      const wflags = [];
      if (day == null) wflags.push('সপ্তাহের কোন দিন, লেখা নেই। “বদলান” চেপে দিন বেছে নিন।');
      if (!slots.length) wflags.push('দিনের কোন সময়, লেখা নেই। সকালে খাবারের পরে ধরা হলো, দরকার হলে বদলান।');
      out.push({ ...base, key: `${idx}`, amount: 1, slots: slots.length ? slots : ['morning'], weekdays: day != null ? [day] : [], include: day != null, flags: [...flags, ...wflags] });
      return;
    }
    if (m.asNeeded) {
      out.push({ ...base, key: `${idx}`, amount: 1, slots: [], asNeeded: true, maxPerDay: m.maxPerDay || 3, include: true,
        flags: [...flags, `দুই বারের মাঝে কত ঘণ্টা, প্রেসক্রিপশনে নেই। ${bn(6)} ঘণ্টা ধরা হলো, ঠিক করে নিন।`] });
      return;
    }
    if (m.meal === 'not_stated') flags.push('খাবারের আগে না পরে লেখা নেই, “পরে” ধরা হলো। দরকার হলে বদলান।');

    // Same amount at every time -> one schedule. Different amounts (e.g. insulin 20 + 0 + 12 units) -> one per amount.
    const times = [['morning', m.morning], ['noon', m.noon], ['night', m.night]].filter(([, a]) => a > 0);
    if (!times.length) {
      out.push({ ...base, key: `${idx}`, amount: 1, slots: [], include: false, flags: [...flags, 'কখন খাবেন বোঝা যায়নি। হাতে সময় বেছে নিন।'] });
      return;
    }
    const amounts = [...new Set(times.map(([, a]) => a))];
    amounts.forEach((a, j) => {
      const split = amounts.length > 1 ? ['সময়ভেদে পরিমাণ আলাদা, তাই আলাদা করে যোগ হবে।'] : [];
      out.push({ ...base, key: `${idx}-${j}`, amount: a, slots: times.filter(([, x]) => x === a).map(([s]) => s), include: true, flags: [...flags, ...split] });
    });
  });

  // Already on this elder's list: leave unticked so nothing is doubled.
  for (const d of out) {
    if (d.medId && elder.regimens.some((r) => r.medId === d.medId && r.status !== 'discarded')) {
      d.include = false;
      d.flags = [...d.flags, `${elder.gen} তালিকায় এটি আগে থেকেই আছে।`];
    }
  }
  return out;
}
