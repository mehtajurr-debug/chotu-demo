// The facts an AI summary is allowed to use: a small, plain record built from the app's own data.
// Only what the elder agreed to share goes in (medication and wellbeing consent). Names only, no other personal data.
import { bnTime, dayOf } from './time.js';
import { doseStatus, dosesForDay } from './schedule.js';
import { QUESTIONS, checkinKey } from './checkin.js';
import { alertLabel } from '../caregiver/status.js';

const relDay = (day, today) => (day === today ? 'আজ' : day === today - 1 ? 'গতকাল' : `${today - day} দিন আগে`);
const counted = (d) => d.regimen.verifiedAt == null || d.at >= d.regimen.verifiedAt;

function dayRecord(state, elder, day, meds, consent) {
  const today = dayOf(state.clock);
  const rec = { day: relDay(day, today) };
  if (consent.medication !== false) {
    rec.doses = dosesForDay(elder, day, meds).filter(counted).map((d) => {
      const st = doseStatus(d, state.clock, state.doses);
      const r = state.doses[d.key];
      const late = st === 'taken' && r?.at - d.at >= 20 ? Math.round(r.at - d.at) : 0;
      return { medicine: d.med.short, time: bnTime(d.at), status: st, ...(late ? { answeredMinutesLate: late } : {}), ...(r?.how === 'caregiver' ? { givenByFamily: true } : {}) };
    });
    const prn = Object.entries(state.doses)
      .filter(([k, r]) => k.includes(`@${day}@prn-`) && r.status === 'taken' && elder.regimens.some((x) => k.startsWith(x.id + '@')))
      .map(([k, r]) => `${meds[elder.regimens.find((x) => k.startsWith(x.id + '@')).medId]?.short} ${bnTime(r.at)}`);
    if (prn.length) rec.asNeededTaken = prn;
  }
  if (consent.wellbeing !== false) {
    const c = state.checkins?.[checkinKey(elder.id, day)];
    if (c) {
      rec.checkin = Object.fromEntries(QUESTIONS.map((q) => [q.key, c.answers[q.key] ?? 'no answer']));
      if (c.said?.feeling) rec.checkin.inTheirWords = c.said.feeling;
    } else rec.checkin = day < today ? 'did not happen' : 'not done yet today';
  }
  const alerts = state.alerts.filter((a) => a.elderId === elder.id && dayOf(a.createdAt) === day)
    .filter((a) => consent.medication !== false || !['missed', 'prn', 'refill'].includes(a.kind));
  if (alerts.length) rec.alerts = alerts.map((a) => alertLabel(a));
  const notes = state.notes.filter((n) => n.elderId === elder.id && dayOf(n.at) === day);
  if (notes.length) rec.familyNotes = notes.map((n) => n.text);
  return rec;
}

/** Totals for a run of days (used for week-by-week trends). */
function totals(days) {
  const t = { doses: 0, taken: 0, missed: 0, answeredLate: 0, asNeeded: 0, checkins: 0, walked: 0, lowWater: 0, badSleep: 0, painDays: 0, unwellDays: 0 };
  for (const d of days) {
    for (const x of d.doses || []) {
      if (['upcoming', 'before', 'due'].includes(x.status)) continue;
      t.doses += 1;
      if (['taken', 'conflict'].includes(x.status)) t.taken += 1;
      if (x.status === 'missed') t.missed += 1;
      if (x.answeredMinutesLate) t.answeredLate += 1;
    }
    t.asNeeded += (d.asNeededTaken || []).length;
    if (d.checkin && typeof d.checkin === 'object') {
      t.checkins += 1;
      if (d.checkin.walk === true) t.walked += 1;
      if (d.checkin.water === false) t.lowWater += 1;
      if (d.checkin.sleep === false) t.badSleep += 1;
      if (d.checkin.feeling === 'pain') t.painDays += 1;
      if (d.checkin.feeling === 'unwell') t.unwellDays += 1;
    }
  }
  return t;
}

/**
 * period: 'today' | 'yesterday' | 'week' | 'month'. Day summaries also get the 7 days before, so the AI can
 * say whether today fits a pattern. The month view sends week-by-week totals plus the last 7 days in detail.
 */
export function buildFacts(state, elder, meds, period) {
  const today = dayOf(state.clock);
  const consent = state.consent?.[elder.id] || {};
  const rec = (d) => dayRecord(state, elder, d, meds, consent);
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const facts = {
    elder: elder.nameEn === 'Baba' ? 'বাবা (father)' : elder.nameEn === 'Ma' ? 'মা (mother)' : elder.name,
    now: `${relDay(today, today)} ${bnTime(state.clock)}`,
    sharing: { medication: consent.medication !== false, wellbeing: consent.wellbeing !== false },
    medicines: consent.medication === false ? 'not shared' : elder.regimens.filter((r) => r.status === 'active').map((r) => ({
      name: meds[r.medId]?.short, when: r.asNeeded ? `as needed, family rule: max ${r.maxPerDay}/day, ${r.minGapHours} h apart` : r.slots.map((s) => bnTime(dosesForDay(elder, today, meds).find((d) => d.regimen.id === r.id && d.slot === s)?.at ?? 0)).join(', '),
    })),
  };
  if (period === 'today' || period === 'yesterday') {
    const day = period === 'today' ? today : today - 1;
    facts.focusDay = rec(day);
    facts.previous7Days = totals(range(day - 7, day - 1).map(rec));
    facts.previous7DaysDetail = range(day - 7, day - 1).map(rec).map(({ day: dd, checkin, alerts }) => ({ day: dd, checkin, alerts }));
  } else if (period === 'week') {
    facts.days = range(today - 6, today).map(rec);
    facts.weekTotals = totals(facts.days);
    facts.weekBefore = totals(range(today - 13, today - 7).map(rec));
  } else {
    facts.weekByWeek = [3, 2, 1, 0].map((w) => ({ week: w === 0 ? 'last 7 days' : `${w} week(s) before that`, ...totals(range(today - 6 - 7 * w, today - 7 * w).map(rec)) }));
    facts.last7DaysDetail = range(today - 6, today).map(rec);
  }
  return facts;
}
