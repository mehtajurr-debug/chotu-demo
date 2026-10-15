// One-line status for an elder, and the look of each dose status, for the caregiver screens.
import { dayOf } from '../lib/time.js';
import { bnTime } from '../lib/time.js';
import { doseStatus, dosesForDay } from '../lib/schedule.js';

export const STATUS_LOOK = {
  upcoming: { label: 'বাকি', cls: '', icon: 'clock' },
  due: { label: 'এখন সময়', cls: '', icon: 'clock' },
  snoozed: { label: 'পরে খাবেন', cls: 'warn', icon: 'clock' },
  taken: { label: 'খেয়েছেন', cls: 'ok', icon: 'check' },
  unsure: { label: 'মনে নেই', cls: 'bad', icon: 'alert' },
  help: { label: 'সাহায্য চেয়েছেন', cls: 'bad', icon: 'alert' },
};

/** Today's doses with their status. */
export function todayDoses(elder, now, meds, doses) {
  return dosesForDay(elder, dayOf(now), meds).map((d) => ({ ...d, status: doseStatus(d, now, doses), rec: doses[d.key] }));
}

/** The most important thing to say about this elder right now: { cls, icon, text } or null. */
export function headline(elder, now, meds, doses) {
  const today = todayDoses(elder, now, meds, doses);
  const names = (list) => [...new Set(list.map((d) => d.med.short))].join(' + ');
  const pick = (s) => today.filter((d) => d.status === s);

  if (pick('help').length) return { cls: 'bad', icon: 'alert', text: 'সাহায্য চেয়েছেন' };
  if (pick('unsure').length) return { cls: 'bad', icon: 'alert', text: `${names(pick('unsure'))}: “মনে নেই” বলেছেন` };
  if (pick('due').length) return { cls: '', icon: 'clock', text: `এখন সময়: ${names(pick('due'))}` };
  if (pick('snoozed').length) return { cls: 'warn', icon: 'clock', text: `${names(pick('snoozed'))}: পরে খাবেন বলেছেন` };
  const taken = pick('taken').sort((a, b) => b.rec.at - a.rec.at);
  if (taken.length) {
    const lastAt = taken[0].rec.at;
    const same = taken.filter((d) => d.rec.at === lastAt);
    return { cls: 'ok', icon: 'check', text: `${names(same)} খেয়েছেন · ${bnTime(lastAt)}` };
  }
  return null;
}
