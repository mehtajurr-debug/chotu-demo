// One-line status for an elder, and the look of each dose status, for the caregiver screens.
import { dayOf } from '../lib/time.js';
import { bnTime } from '../lib/time.js';
import { doseStatus, dosesForDay } from '../lib/schedule.js';

export const STATUS_LOOK = {
  upcoming: { label: 'বাকি', cls: '', icon: 'clock' },
  before: { label: 'চালুর আগের সময়', cls: '', icon: 'clock' },
  due: { label: 'এখন সময়', cls: '', icon: 'clock' },
  snoozed: { label: 'পরে খাবেন', cls: 'warn', icon: 'clock' },
  taken: { label: 'খেয়েছেন', cls: 'ok', icon: 'check' },
  unsure: { label: 'মনে নেই', cls: 'bad', icon: 'alert' },
  help: { label: 'সাহায্য চেয়েছেন', cls: 'bad', icon: 'alert' },
  missed: { label: 'উত্তর নেই', cls: 'bad', icon: 'alert' },
  conflict: { label: 'দুইবার লেখা', cls: 'warn', icon: 'alert' },
};

/** Today's doses with their status. */
export function todayDoses(elder, now, meds, doses) {
  return dosesForDay(elder, dayOf(now), meds).map((d) => ({ ...d, status: doseStatus(d, now, doses), rec: doses[d.key] }));
}

/** The most important thing to say about this elder right now: { cls, icon, text } or null. */
export function headline(elder, now, meds, doses, alerts = [], caregivers = [], shares = true, checkin = null) {
  // An open alert beats everything else.
  const mine = alerts.filter((a) => a.elderId === elder.id && !a.resolvedAt).sort((a, b) => b.createdAt - a.createdAt);
  const open = mine.find((a) => !a.handledBy && !NOTICES.has(a.kind));
  const calm = mine.find((a) => !a.handledBy && NOTICES.has(a.kind));
  if (open) return { cls: 'bad', icon: 'alert', text: `সতর্কতা: ${alertLabel(open)}` };
  const handling = mine.find((a) => a.handledBy);
  if (handling) {
    const who = caregivers.find((c) => c.id === handling.handledBy)?.name;
    return { cls: 'warn', icon: 'alert', text: `${who} দেখছেন: ${alertLabel(handling)}` };
  }
  if (!shares) return { cls: '', icon: 'alert', text: 'ওষুধের খবর শেয়ার বন্ধ (সম্মতি)' };
  const today = todayDoses(elder, now, meds, doses);
  const names = (list) => [...new Set(list.map((d) => d.med.short))].join(' + ');
  const pick = (s) => today.filter((d) => d.status === s);

  if (pick('conflict').length) return { cls: 'warn', icon: 'alert', text: `${names(pick('conflict'))}: দুইবার লেখা হয়েছে, মিলিয়ে দেখুন` };
  if (pick('due').length) return { cls: '', icon: 'clock', text: `এখন সময়: ${names(pick('due'))}` };
  if (pick('snoozed').length) return { cls: 'warn', icon: 'clock', text: `${names(pick('snoozed'))}: পরে খাবেন বলেছেন` };
  if (calm) return { cls: 'warn', icon: 'alert', text: alertLabel(calm) };
  // Today's afternoon check-in (only passed in when the elder shares how they feel)
  const feel = checkin?.answers?.feeling;
  if (feel === 'pain') return { cls: 'warn', icon: 'alert', text: `আজ ব্যথার কথা বলেছেন${checkin.said?.feeling ? `: “${checkin.said.feeling}”` : ''}` };
  if (feel === 'unwell') return { cls: 'warn', icon: 'alert', text: 'আজ শরীর ভালো নেই বলেছেন' };
  const taken = pick('taken').sort((a, b) => b.rec.at - a.rec.at);
  if (taken.length) {
    const lastAt = taken[0].rec.at;
    const same = taken.filter((d) => d.rec.at === lastAt);
    return { cls: 'ok', icon: 'check', text: `${names(same)} খেয়েছেন · ${bnTime(lastAt)}` };
  }
  return null;
}

/** Short label for each kind of alert. */
export const ALERT_KIND = {
  missed: 'ওষুধের উত্তর পাওয়া যায়নি',
  unsure: 'ওষুধ খাওয়ার কথা মনে নেই',
  help: 'সাহায্য চেয়েছেন',
  emergency: 'জরুরি অবস্থা',
  prn: 'প্রয়োজনের ওষুধের নিয়ম পার হয়েছে',
  refill: 'ওষুধ কিনতে হবে',
  call: 'ফোন করেছিলেন',
};

/** Alerts that are worth a look but are not urgent (amber, not red). */
export const CALM_ALERTS = new Set(['missed', 'refill', 'call']);
/** Notices that should not hide what is happening with today's doses. */
const NOTICES = new Set(['refill', 'call']);

export const alertLabel = (a) => (a.kind === 'missed' && a.unreachable ? 'ফোনে যোগাযোগ নেই' : ALERT_KIND[a.kind]);
