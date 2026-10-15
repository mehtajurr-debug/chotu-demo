// Time helpers. The demo clock counts minutes from midnight of demo day 0.
// Example: 470 = day 0, 07:50. 1910 = day 1, 07:50.

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bn = (v) => String(v).replace(/\d/g, (d) => BN_DIGITS[d]);

export const DAY = 24 * 60;
export const dayOf = (min) => Math.floor(min / DAY);
export const minOfDay = (min) => ((min % DAY) + DAY) % DAY;

/** "07:45" -> 465 */
export function hhmmToMin(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

/** Bangla part of day, the way people say it. */
function partOfDay(h) {
  if (h >= 5 && h < 12) return 'সকাল';
  if (h >= 12 && h < 16) return 'দুপুর';
  if (h >= 16 && h < 18) return 'বিকাল';
  if (h >= 18 && h < 20) return 'সন্ধ্যা';
  return 'রাত';
}

/** 470 -> "সকাল ৭:৫০" */
export function bnTime(min) {
  const m = minOfDay(min);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${partOfDay(h)} ${bn(h12)}:${bn(mm)}`;
}

/** 470 -> "7:50 AM" (presenter bar, English) */
export function enTime(min) {
  const m = minOfDay(min);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Greeting for the current part of the day. */
export function bnGreeting(min) {
  const h = Math.floor(minOfDay(min) / 60);
  if (h >= 5 && h < 12) return 'শুভ সকাল';
  if (h >= 12 && h < 18) return 'শুভ অপরাহ্ন';
  return 'শুভ সন্ধ্যা';
}

/** "আজ সকাল ৮:০২" / "গতকাল রাত ৯:০৬" relative to the current demo time. */
export function bnWhen(at, now) {
  const diff = dayOf(at) - dayOf(now);
  const day = diff === 0 ? 'আজ' : diff === -1 ? 'গতকাল' : diff === 1 ? 'আগামীকাল' : `${bn(Math.abs(diff))} দিন ${diff < 0 ? 'আগে' : 'পরে'}`;
  return `${day} ${bnTime(at)}`;
}

/** Day label relative to demo day 0. */
export function bnDayLabel(min) {
  const d = dayOf(min);
  return d === 0 ? 'আজ' : d === 1 ? 'আগামীকাল' : `দিন ${bn(d + 1)}`;
}
