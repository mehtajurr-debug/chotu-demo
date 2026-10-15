// Turns a regimen ("morning, after meal") into clock times using the elder's meal times.
import MEDICINES from '../data/medicines.json';
import { DAY, dayOf, hhmmToMin } from './time.js';

export const MED_BY_ID = Object.fromEntries(MEDICINES.map((m) => [m.id, m]));

export const SLOTS = {
  morning: { meal: 'breakfast', bn: 'সকাল', en: 'Morning' },
  noon: { meal: 'lunch', bn: 'দুপুর', en: 'Noon' },
  night: { meal: 'dinner', bn: 'রাত', en: 'Night' },
};

export const MEAL_TIMING = {
  before: { bn: 'খাবারের আগে', offset: -30 },
  after: { bn: 'খাবারের পরে', offset: 15 },
};

/** Clock minute-of-day for one slot of a regimen. */
export function slotTime(elder, regimen, slot) {
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
export function dosesForDay(elder, day) {
  const out = [];
  for (const r of elder.regimens) {
    if (r.asNeeded || !activeOnDay(r, day)) continue;
    for (const slot of r.slots) {
      const at = day * DAY + slotTime(elder, r, slot);
      out.push({ key: `${r.id}@${day}@${slot}`, regimen: r, med: MED_BY_ID[r.medId], slot, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The next scheduled dose at or after `now` (looks ahead two days). */
export function nextDose(elder, now) {
  const d = dayOf(now);
  for (const day of [d, d + 1, d + 2]) {
    const hit = dosesForDay(elder, day).find((x) => x.at >= now);
    if (hit) return hit;
  }
  return null;
}
