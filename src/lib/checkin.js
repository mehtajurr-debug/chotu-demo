// Afternoon check-in: four fixed short questions about health and habits.
// Structured questions with simple answers (good / not good / pain, yes / no), not free conversation.
import { DAY, dayOf, hhmmToMin } from './time.js';

export const QUESTIONS = [
  { key: 'feeling', line: 'checkin_feeling', bn: 'শরীর কেমন', short: 'শরীর' },
  { key: 'walk', line: 'checkin_walk', bn: 'হাঁটা', short: 'হাঁটা' },
  { key: 'water', line: 'checkin_water', bn: 'পানি খাওয়া', short: 'পানি' },
  { key: 'sleep', line: 'checkin_sleep', bn: 'রাতের ঘুম', short: 'ঘুম' },
];

export const CHECKIN_WINDOW = 60; // minutes after the check-in time when Chotu may still ask

export const checkinKey = (elderId, day) => `${elderId}@${day}`;

/** Minute (absolute demo time) of the check-in on a given day. */
export const checkinAt = (elder, day) => day * DAY + hhmmToMin(elder.checkinTime || '16:00');

/** Should Chotu start today's check-in now? */
export function checkinDue(elder, now, checkins) {
  const day = dayOf(now);
  if (checkins[checkinKey(elder.id, day)]) return false;
  const at = checkinAt(elder, day);
  return now >= at && now <= at + CHECKIN_WINDOW;
}

/** Turn an understood answer into what we store for one question. Returns undefined if it does not answer it. */
export function interpret(questionKey, intent) {
  if (questionKey === 'feeling') {
    if (['good', 'yes', 'took'].includes(intent)) return 'good';
    if (['unwell', 'no'].includes(intent)) return 'unwell';
    if (intent === 'pain') return 'pain';
    return undefined;
  }
  if (['yes', 'took', 'good'].includes(intent)) return true;
  if (['no', 'not_yet', 'unwell'].includes(intent)) return false;
  return undefined;
}

/** Short Bangla phrase for one stored answer. */
export function answerText(key, value) {
  if (value == null) return 'উত্তর দেননি';
  if (key === 'feeling') return { good: 'ভালো আছেন', unwell: 'ভালো নেই বলেছেন', pain: 'ব্যথার কথা বলেছেন' }[value];
  const yes = { walk: 'হেঁটেছেন', water: 'পর্যাপ্ত পানি খেয়েছেন', sleep: 'রাতে ভালো ঘুম হয়েছে' };
  const no = { walk: 'হাঁটা হয়নি', water: 'পানি কম খেয়েছেন', sleep: 'রাতে ভালো ঘুম হয়নি' };
  return value ? yes[key] : no[key];
}

/** good / warn look for an answer (for colours). */
export const answerLook = (key, value) => (value == null ? '' : key === 'feeling' ? (value === 'good' ? 'ok' : 'warn') : value ? 'ok' : 'warn');
