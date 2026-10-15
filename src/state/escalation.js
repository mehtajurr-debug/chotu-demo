// Escalation and alert ownership. Pure functions on the shared state; they run whenever the demo clock moves.
//
// No answer to a dose: Chotu repeats at +10 and +20 (elder phone), and at +30 the dose is marked missed and an
// alert goes to the first caregiver in that elder's alert order. If nobody taps "আমি দেখছি" within 10 minutes,
// the next caregiver is added, then everyone. "আমি দেখছি" stops the escalation for everyone else.
import { bnTime, dayOf } from '../lib/time.js';
import { ALERT_AFTER, SLOTS, dosesForDay, medMap, waitingSince } from '../lib/schedule.js';

export const ESCALATE_EVERY = 10; // minutes without "আমি দেখছি" before the next caregiver is told

/** Highest ladder step: the last person in the alert order, or one more step for "everyone" if that adds people. */
export function topLevel(state, elderId) {
  const order = state.elders.find((e) => e.id === elderId).alertOrder;
  const extra = state.caregivers.some((c) => !order.includes(c.id));
  return extra ? order.length : order.length - 1;
}

/** Who is told at each ladder step: [first], [first, second], ..., then everyone. */
export function recipients(state, alert) {
  const elder = state.elders.find((e) => e.id === alert.elderId);
  const order = elder.alertOrder;
  const everyone = [...new Set([...order, ...state.caregivers.map((c) => c.id)])];
  if (alert.level >= order.length) return everyone;
  return order.slice(0, alert.level + 1);
}

const nameOf = (state, id) => state.caregivers.find((c) => c.id === id)?.name || id;

function logAt(state, at, entry) {
  return { ...state, log: [...state.log, { at, ...entry }] };
}

/** Add an alert. `ladder: false` tells everyone at once (used for "help"). */
/** Alerts about medicine status follow the elder's consent. "মনে নেই", help and emergency always go through. */
const NEEDS_MEDICATION_CONSENT = new Set(['missed', 'prn']);

export function raiseAlert(state, { elderId, kind, at, text, doseKeys = [], ladder = true }) {
  if (NEEDS_MEDICATION_CONSENT.has(kind) && state.consent?.[elderId]?.medication === false) {
    return logAt(state, at, { elderId, by: 'chotu', kind: 'alert', text: 'পরিবারকে জানানো হয়নি: ওষুধের তথ্য শেয়ার করার সম্মতি বন্ধ আছে' });
  }
  const alert = {
    id: `a${at}-${elderId}-${kind}-${state.alerts.length}`,
    elderId, kind, text, doseKeys, createdAt: at, ladder,
    level: ladder ? 0 : topLevel(state, elderId),
    handledBy: null, handledAt: null, resolvedAt: null,
    seenBy: [], told: false, handlingTold: false,
    unreachable: Boolean(state.unreachable?.[elderId]),
  };
  let s = { ...state, alerts: [...state.alerts, alert] };
  const who = recipients(s, alert).map((id) => nameOf(s, id)).join(', ');
  s = logAt(s, at, { elderId, by: 'chotu', kind: 'alert', text: `সতর্কতা পাঠানো হয়েছে (${who}): ${text}` });
  return s;
}

function missedText(state, elder, doses) {
  const slot = SLOTS[doses[0].slot].bn;
  const names = [...new Set(doses.map((d) => d.med.short))].join(' + ');
  const time = bnTime(doses[0].at);
  if (state.unreachable?.[elder.id]) {
    return `${elder.gen} ফোনে যোগাযোগ করা যাচ্ছে না। ${slot}ের ওষুধ (${names}, ${time}) খাওয়া হয়েছে কি না জানা যায়নি।`;
  }
  return `${elder.name} ${slot}ের ওষুধের উত্তর দেননি (${names}, ${time})।`;
}

/** Mark unanswered doses as missed and raise alerts; move unanswered alerts up the ladder. */
export function runEscalation(state) {
  const now = state.clock;
  const meds = medMap(state);
  let s = state;

  // 0) Simulation: the elder not on the elder phone answers "খেয়েছি" 2 minutes after each dose time.
  if (s.othersAutoAnswer) {
    for (const elder of s.elders) {
      if (elder.id === s.elderOnPhone) continue;
      for (const day of [dayOf(now) - 1, dayOf(now)]) {
        for (const d of dosesForDay(elder, day, meds)) {
          if (s.doses[d.key] || d.at + 2 > now) continue;
          if (d.regimen.verifiedAt != null && d.at < d.regimen.verifiedAt) continue;
          s = { ...s, doses: { ...s.doses, [d.key]: { status: 'taken', at: d.at + 2, how: 'voice', by: elder.id } } };
          s = logAt(s, d.at + 2, { elderId: elder.id, by: elder.id, kind: 'dose', text: `${d.med.short} খেয়েছেন (কথায় বলেছেন)` });
        }
      }
    }
  }

  // 1) Doses with no answer for 30 minutes -> missed, one alert per elder per dose time.
  for (const elder of s.elders) {
    const groups = new Map();
    for (const day of [dayOf(now) - 1, dayOf(now)]) {
      for (const d of dosesForDay(elder, day, meds)) {
        if (d.regimen.verifiedAt != null && d.at < d.regimen.verifiedAt) continue; // before it was switched on
        const rec = s.doses[d.key];
        if (rec && rec.status !== 'snoozed') continue; // answered (or already missed)
        const due = waitingSince(d, s.doses) + ALERT_AFTER;
        if (due > now) continue;
        if (!groups.has(d.at)) groups.set(d.at, { due, list: [] });
        const g = groups.get(d.at);
        g.list.push(d);
        g.due = Math.max(g.due, due);
      }
    }
    for (const { due, list } of [...groups.values()].sort((a, b) => a.due - b.due)) {
      const doses = { ...s.doses };
      for (const d of list) doses[d.key] = { status: 'missed', at: due, how: 'none' };
      s = { ...s, doses };
      s = raiseAlert(s, { elderId: elder.id, kind: 'missed', at: due, text: missedText(s, elder, list), doseKeys: list.map((d) => d.key) });
    }
  }

  // 2) Alerts nobody took: tell the next caregiver every 10 minutes.
  const alerts = s.alerts.map((a) => ({ ...a }));
  for (const a of alerts) {
    if (!a.ladder || a.handledBy) continue;
    const maxLevel = topLevel(s, a.elderId);
    while (a.level < maxLevel && a.createdAt + (a.level + 1) * ESCALATE_EVERY <= now) {
      a.level += 1;
      const at = a.createdAt + a.level * ESCALATE_EVERY;
      const added = recipients(s, a).map((id) => nameOf(s, id)).join(', ');
      s = logAt(s, at, { elderId: a.elderId, by: 'chotu', kind: 'alert', text: `${ESCALATE_EVERY} মিনিটে কেউ দেখেননি, তাই জানানো হলো: ${added}` });
    }
  }
  return { ...s, alerts };
}

