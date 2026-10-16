// Turns a regimen ("morning, after meal") into clock times using the elder's meal times.
import MEDICINES from '../data/medicines.json';
import { DAY, bn, dayOf, hhmmToMin, partOfDay } from './time.js';

export const LIBRARY = MEDICINES;

/** Library medicines plus any the caregiver added by hand. */
export function medMap(state) {
  const all = [...MEDICINES, ...(state.customMeds || [])];
  return Object.fromEntries(all.map((m) => [m.id, m]));
}

/** The photo to show for a regimen: the caregiver's own photo if they uploaded one, else the library photo. */
export const medImage = (regimen, med) => regimen.photo || med?.image || null;

export const SLOTS = {
  morning: { meal: 'breakfast', bn: 'সকাল', en: 'Morning' },
  noon: { meal: 'lunch', bn: 'দুপুর', en: 'Noon' },
  night: { meal: 'dinner', bn: 'রাত', en: 'Night' },
};

export const MEAL_NAMES = { breakfast: 'সকালের খাবার', lunch: 'দুপুরের খাবার', dinner: 'রাতের খাবার' };

export const MEAL_TIMING = {
  before: { bn: 'খাবারের আগে', offset: -30 },
  after: { bn: 'খাবারের পরে', offset: 15 },
};

const FORM_BN = { tablet: 'ট্যাবলেট', capsule: 'ক্যাপসুল', injection: 'ইনজেকশন' };
const AMOUNT_BN = { 0.5: 'আধা', 1: '১টি', 2: '২টি' };
/** 1, 'tablet' -> "১টি ট্যাবলেট" */
export const doseText = (amount, form) => (form === 'injection' && amount > 2
  ? `${bn(amount)} ইউনিট ইনজেকশন` // insulin is written in units
  : `${AMOUNT_BN[amount] || bn(amount)} ${FORM_BN[form] || 'ট্যাবলেট'}`);

export function durationText(d) {
  if (!d || d.type === 'ongoing') return 'চলতে থাকবে';
  return `${bn(d.count)} ${d.type === 'weeks' ? 'সপ্তাহ' : 'দিন'}`;
}

// A slot is 'morning' | 'noon' | 'night' (from the elder's meal times) or a custom clock time 'at:HH:MM'.
export const isCustom = (slot) => typeof slot === 'string' && slot.startsWith('at:');
export const customSlot = (hhmm) => `at:${hhmm}`;

/** Bangla name for when a dose is: সকাল / দুপুর / রাত (custom times get one from their clock time). */
export function slotName(slot, minuteOfDay) {
  if (!isCustom(slot)) return SLOTS[slot].bn;
  return partOfDay(Math.floor(hhmmToMin(slot.slice(3)) / 60));
}

/** Which reminder line fits a slot: morning / noon / night. */
export function reminderSlot(slot) {
  if (!isCustom(slot)) return slot;
  const h = Math.floor(hhmmToMin(slot.slice(3)) / 60);
  return h < 12 && h >= 4 ? 'morning' : h < 17 && h >= 12 ? 'noon' : 'night';
}

/** "খাবারের পরে" for meal-based slots, "নির্দিষ্ট সময়ে" for a custom clock time. */
export const timingText = (regimen, slot) => (isCustom(slot) ? 'নির্দিষ্ট সময়ে' : MEAL_TIMING[regimen.meal].bn);

/** Clock minute-of-day for one slot of a regimen. */
export function slotTime(elder, regimen, slot) {
  if (isCustom(slot)) return hhmmToMin(slot.slice(3));
  const meal = elder.meals[SLOTS[slot].meal];
  return hhmmToMin(meal) + MEAL_TIMING[regimen.meal].offset;
}

/** Is this regimen running on the given demo day? */
export function activeOnDay(regimen, day) {
  if (regimen.status !== 'active') return false;
  const d = regimen.duration;
  if (!d || d.type === 'ongoing') return day >= regimen.startDay;
  const days = d.type === 'weeks' ? d.count * 7 : d.count;
  return day >= regimen.startDay && day < regimen.startDay + days;
}

/** All scheduled doses for an elder on one demo day, sorted by time. As-needed medicines have none. */
export function dosesForDay(elder, day, meds) {
  const out = [];
  for (const r of elder.regimens) {
    if (r.asNeeded || !activeOnDay(r, day)) continue;
    for (const slot of r.slots) {
      const at = day * DAY + slotTime(elder, r, slot);
      out.push({ key: `${r.id}@${day}@${slot}`, regimen: r, med: meds[r.medId], slot, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// ---------- what happened to each dose ----------

/** A dose is finished once the elder answered taken / don't remember / help, or it was escalated as missed. "Not yet" comes back later. */
const FINISHED = new Set(['taken', 'unsure', 'help', 'missed']);

// Escalation timing (demo-clock minutes after the dose time, or after the last "not yet")
export const REPEAT_EVERY = 10; // repeat the reminder at +10 and +20
export const ALERT_AFTER = 30; // no answer by +30: the family is alerted

/** A dose only counts from the moment its schedule was switched on (no alerts for times before that). */
const counts = (d) => d.regimen.verifiedAt == null || d.at >= d.regimen.verifiedAt;

/** When the waiting started: the dose time, or the last "not yet" answer. */
export function waitingSince(dose, doses) {
  const rec = doses[dose.key];
  return rec?.status === 'snoozed' ? Math.max(dose.at, rec.at) : dose.at;
}

/** 0 = first reminder, 1 = first repeat (+10), 2 = second repeat (+20). */
export function reminderLevel(group, now, doses) {
  const since = Math.min(...group.map((d) => waitingSince(d, doses)));
  return Math.max(0, Math.min(2, Math.floor((now - since) / REPEAT_EVERY)));
}

/** Today's doses whose time has come and that still need an answer. Snoozed ones return when their time is up. */
export function dueGroup(elder, now, meds, doses) {
  return dosesForDay(elder, dayOf(now), meds).filter((d) => {
    if (d.at > now || !counts(d)) return false;
    const rec = doses[d.key];
    if (!rec) return true;
    if (rec.status === 'snoozed') return rec.until <= now;
    return !FINISHED.has(rec.status);
  });
}

/** Status of one scheduled dose for the caregiver: upcoming | due | snoozed | taken | unsure | help */
export function doseStatus(dose, now, doses) {
  const rec = doses[dose.key];
  if (rec?.conflict) return 'conflict'; // two people logged the same dose
  if (rec) return rec.status === 'snoozed' && rec.until <= now ? 'due' : rec.status;
  if (!counts(dose)) return 'before'; // this time had passed when the schedule was switched on
  return dose.at <= now ? 'due' : 'upcoming';
}

/** The most recent time this medicine was taken, or null. */
export function lastTaken(regimenId, doses) {
  let best = null;
  for (const [k, rec] of Object.entries(doses)) {
    if (k.startsWith(regimenId + '@') && rec.status === 'taken' && (!best || rec.at > best)) best = rec.at;
  }
  return best;
}

/** All doses at the next dose time (e.g. two medicines at night). With `doses`, skips ones already answered. */
export function nextDoseGroup(elder, now, meds, doses = {}) {
  const open = (x) => !FINISHED.has(doses[x.key]?.status);
  const d = dayOf(now);
  for (const day of [d, d + 1, d + 2]) {
    const list = dosesForDay(elder, day, meds).filter((x) => x.at >= now && open(x));
    if (list.length) return list.filter((x) => x.at === list[0].at);
  }
  return [];
}

/** The next scheduled dose at or after `now` (looks ahead two days). */
export function nextDose(elder, now, meds) {
  const d = dayOf(now);
  for (const day of [d, d + 1, d + 2]) {
    const hit = dosesForDay(elder, day, meds).find((x) => x.at >= now);
    if (hit) return hit;
  }
  return null;
}

// ---------- as-needed ("প্রয়োজন হলে") medicines ----------

/** Check an as-needed dose against the limits the caregiver set: minimum hours between doses, maximum per day. */
export function prnCheck(regimen, doses, now) {
  const last = lastTaken(regimen.id, doses);
  const prefix = `${regimen.id}@${dayOf(now)}@`;
  const today = Object.entries(doses).filter(([k, r]) => k.startsWith(prefix) && r.status === 'taken').length;
  const gapMin = last == null ? null : now - last;
  return {
    last, today, gapMin,
    tooSoon: gapMin != null && gapMin < regimen.minGapHours * 60,
    overMax: today + 1 > regimen.maxPerDay,
  };
}
