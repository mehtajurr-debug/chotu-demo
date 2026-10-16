// Medicine stock: how many tablets the family has, how many days that lasts, and when to warn.
import { bn } from './time.js';
import { isWeekly } from './schedule.js';

/** Tablets used per day by a schedule (as-needed medicines count as one a day for the estimate). */
export const perDay = (r) => {
  if (r.asNeeded) return 1;
  const daily = Math.max(1, r.slots.length) * (r.amount || 1);
  return isWeekly(r) ? (daily * r.weekdays.length) / 7 : daily; // weekly: spread over the week
};

/** Whole days the current stock lasts, or null when the stock is not tracked. */
export const daysLeft = (r) => (r.stock == null ? null : Math.floor(r.stock / perDay(r)));

/** True when the stock is at or below the family's warning point. */
export const isLow = (r) => r.stock != null && daysLeft(r) <= (r.refillDays ?? 5);

/** "৫টি বাকি · ৫ দিনের" */
export function stockText(r) {
  if (r.stock == null) return '';
  if (r.stock <= 0) return 'শেষ হয়ে গেছে';
  const d = daysLeft(r);
  return `${bn(r.stock % 1 ? r.stock.toFixed(1) : r.stock)}টি বাকি · ${d < 1 ? '১ দিনেরও কম' : `${bn(d)} দিনের`}`;
}
