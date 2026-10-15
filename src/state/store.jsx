// One shared state for both phones. Saved to localStorage so a page refresh keeps the demo where it was.
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { makeSeed } from '../data/seed.js';
import { dosesForDay, medMap, prnCheck } from '../lib/schedule.js';
import { checkinAt, checkinKey } from '../lib/checkin.js';
import { bn, bnTime } from '../lib/time.js';
import { raiseAlert, runEscalation } from './escalation.js';

const KEY = 'chotu-demo-state';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === makeSeed().version) return s;
    }
  } catch {
    /* storage blocked or corrupt: fall back to seed */
  }
  return makeSeed();
}

const updateElder = (state, elderId, fn) => ({
  ...state,
  elders: state.elders.map((e) => (e.id === elderId ? fn(e) : e)),
});
const logEntry = (state, entry) => ({ ...state, log: [...state.log, { at: state.clock, ...entry }] });
const isPrimary = (state, id) => state.caregivers.some((c) => c.id === id && c.primary);

function reducer(state, action) {
  switch (action.type) {
    case 'clock/advance':
      return runEscalation({ ...state, clock: state.clock + action.minutes });
    case 'elder/show':
      return { ...state, elderOnPhone: action.elderId };
    case 'caregiver/use':
      return { ...state, caregiverOnPhone: action.caregiverId };
    case 'log/add':
      return logEntry(state, action.entry);

    case 'med/addCustom':
      return { ...state, customMeds: [...state.customMeds, action.med] };

    case 'elder/meals':
      return updateElder(state, action.elderId, (e) => ({ ...e, meals: action.meals, sleep: action.sleep ?? e.sleep }));

    // A new schedule always starts as "pending". Only the primary caregiver can make it active.
    case 'regimen/add': {
      const r = { ...action.regimen, status: 'pending', addedBy: action.by, verifiedBy: null };
      const s = updateElder(state, action.elderId, (e) => ({ ...e, regimens: [...e.regimens, r] }));
      return logEntry(s, { elderId: action.elderId, by: action.by, kind: 'setup', text: `${action.medName} যোগ করা হয়েছে, যাচাইয়ের অপেক্ষায়` });
    }
    case 'regimen/activate': {
      if (!isPrimary(state, action.by)) return state; // safety rule: nothing goes live without the primary caregiver
      const day = Math.floor(state.clock / (24 * 60));
      const s = updateElder(state, action.elderId, (e) => ({
        ...e,
        regimens: e.regimens.map((r) => (r.id === action.regimenId ? { ...r, status: 'active', startDay: day, verifiedBy: action.by, verifiedAt: state.clock } : r)),
      }));
      return logEntry(s, { elderId: action.elderId, by: action.by, kind: 'setup', text: `${action.medName} যাচাই করে চালু করা হয়েছে` });
    }
    // What the elder answered for one or more doses due at the same time. Also writes the caregiver timeline.
    case 'dose/record': {
      const doses = { ...state.doses };
      const until = action.untilIn ? state.clock + action.untilIn : undefined; // "not yet": ask again later
      for (const k of action.keys) doses[k] = { status: action.status, at: state.clock, how: action.how, by: action.elderId, until };
      let s = logEntry({ ...state, doses }, { elderId: action.elderId, by: action.elderId, kind: 'dose', status: action.status, text: action.text });
      // "মনে নেই" and "help" alert the family. Help goes to everyone at once.
      if (action.alert) s = raiseAlert(s, { elderId: action.elderId, kind: action.status, at: state.clock, text: action.alert, doseKeys: action.keys, ladder: action.status !== 'help' });
      return s;
    }

    // A caregiver writes that they gave a dose. If someone already logged it, keep both and show a conflict.
    case 'dose/given': {
      const rec = state.doses[action.key];
      const who = state.caregivers.find((x) => x.id === action.by)?.name;
      const mine = { by: action.by, at: state.clock, how: 'caregiver' };
      let next;
      let text = `${action.medName}: ${who} লিখেছেন “খাইয়ে দিয়েছি”`;
      if (rec?.status === 'taken') {
        const first = rec.conflict ? rec.conflict : [{ by: rec.by || action.elderId, at: rec.at, how: rec.how }];
        next = { ...rec, conflict: [...first, mine] };
        text += '। একই ডোজ দুইবার লেখা হয়েছে, মিলিয়ে দেখুন';
      } else {
        next = { status: 'taken', ...mine };
      }
      return logEntry({ ...state, doses: { ...state.doses, [action.key]: next } }, { elderId: action.elderId, by: action.by, kind: 'dose', text });
    }

    // The elder takes an as-needed medicine. Always logged; if it breaks the family's limits, caregivers are alerted.
    case 'prn/log': {
      const elder = state.elders.find((e) => e.id === action.elderId);
      const r = elder.regimens.find((x) => x.id === action.regimenId);
      const chk = prnCheck(r, state.doses, state.clock);
      const key = `${r.id}@${Math.floor(state.clock / (24 * 60))}@prn-${state.clock}`;
      let s = { ...state, doses: { ...state.doses, [key]: { status: 'taken', at: state.clock, how: action.how, by: elder.id } } };
      s = logEntry(s, { elderId: elder.id, by: elder.id, kind: 'dose', text: `${action.medName} খেয়েছেন (প্রয়োজনের ওষুধ, আজ ${bn(chk.today + 1)} বার)` });
      const broken = [];
      if (chk.tooSoon) {
        const h = Math.floor(chk.gapMin / 60), m = chk.gapMin % 60;
        broken.push(`আগের বার ${bnTime(chk.last)}, মাত্র ${h ? bn(h) + ' ঘণ্টা ' : ''}${bn(m)} মিনিট আগে (পরিবারের নিয়ম: কমপক্ষে ${bn(r.minGapHours)} ঘণ্টা পরপর)`);
      }
      if (chk.overMax) broken.push(`আজ এটি ${bn(chk.today + 1)} বার (পরিবারের নিয়ম: দিনে সর্বোচ্চ ${bn(r.maxPerDay)} বার)`);
      if (broken.length) {
        s = raiseAlert(s, { elderId: elder.id, kind: 'prn', at: state.clock, doseKeys: [key], text: `${elder.name} ${action.medName} নিয়েছেন। ${broken.join('। ')}।` });
      }
      return s;
    }

    // Emergency: after the 5-second countdown, everyone in the family is told at once.
    case 'emergency/send': {
      const elder = state.elders.find((e) => e.id === action.elderId);
      const what = action.how === 'voice' ? 'জরুরি সাহায্য চেয়েছেন (কথায়)' : 'জরুরি বোতাম চেপেছেন';
      const s = logEntry(state, { elderId: elder.id, by: elder.id, kind: 'emergency', text: what });
      return raiseAlert(s, { elderId: elder.id, kind: 'emergency', at: state.clock, ladder: false, text: `${elder.name} ${what}।` });
    }

    // ----- alerts -----
    case 'alert/handle': {
      const a = state.alerts.find((x) => x.id === action.id);
      if (!a || a.handledBy) return state; // someone else already took it
      const s = { ...state, alerts: state.alerts.map((x) => (x.id === a.id ? { ...x, handledBy: action.by, handledAt: state.clock } : x)) };
      return logEntry(s, { elderId: a.elderId, by: action.by, kind: 'alert', text: 'আমি দেখছি (অন্যদের আর জানানো হবে না)' });
    }
    case 'alert/resolve': {
      const a = state.alerts.find((x) => x.id === action.id);
      if (!a) return state;
      const s = { ...state, alerts: state.alerts.map((x) => (x.id === a.id ? { ...x, resolvedAt: state.clock } : x)) };
      return logEntry(s, { elderId: a.elderId, by: action.by, kind: 'alert', text: 'সতর্কতা মিটে গেছে' + (action.note ? ': ' + action.note : '') });
    }
    case 'alert/seen':
      return { ...state, alerts: state.alerts.map((x) => (x.id === action.id && !x.seenBy.includes(action.by) ? { ...x, seenBy: [...x.seenBy, action.by] } : x)) };
    case 'alert/told': // the elder phone has spoken about this alert
      return { ...state, alerts: state.alerts.map((x) => (x.id === action.id ? { ...x, [action.field]: true } : x)) };
    // Shared notes between caregivers (also shown on the elder's timeline)
    case 'note/add': {
      const note = { id: `n${Date.now()}`, elderId: action.elderId, by: action.by, at: state.clock, text: action.text };
      return logEntry({ ...state, notes: [...state.notes, note] }, { elderId: action.elderId, by: action.by, kind: 'note', text: `নোট: ${action.text}` });
    }
    // Who is told first when something goes wrong (primary caregiver only)
    case 'elder/alertOrder':
      if (!isPrimary(state, action.by)) return state;
      return updateElder(state, action.elderId, (e) => ({ ...e, alertOrder: action.order }));
    case 'elder/sleep':
      return updateElder(state, action.elderId, (e) => ({ ...e, sleep: action.sleep }));
    // Consent: only the elder changes it, on their own phone.
    case 'consent/set':
      return { ...state, consent: { ...state.consent, [action.elderId]: { ...state.consent[action.elderId], [action.key]: action.value } } };
    case 'consent/show':
      return { ...state, showConsentFor: action.elderId };
    case 'consent/agree': {
      const c = state.consent[action.elderId];
      const on = [c.medication && 'ওষুধের খবর', c.wellbeing && 'শরীরের খবর', c.location && 'অবস্থান'].filter(Boolean);
      const s = { ...state, showConsentFor: null, consent: { ...state.consent, [action.elderId]: { ...c, agreedAt: state.clock } } };
      return logEntry(s, { elderId: action.elderId, by: action.elderId, kind: 'consent', text: `সম্মতি দিয়েছেন: ${on.length ? on.join(', ') : 'কিছুই শেয়ার নয়'} (সাহায্য ও জরুরি বার্তা সবসময় যাবে)` });
    }
    // Afternoon check-in answers. Shared with the family only if the elder agreed to share how they feel.
    case 'checkin/save': {
      const day = Math.floor(state.clock / (24 * 60));
      const rec = { at: state.clock, how: action.how || 'voice', answers: action.answers, said: action.said || {} };
      const s = { ...state, checkinRequest: null, checkins: { ...state.checkins, [`${action.elderId}@${day}`]: rec } };
      return logEntry(s, { elderId: action.elderId, by: action.elderId, kind: 'checkin', text: action.text });
    }
    case 'checkin/request':
      return { ...state, checkinRequest: action.elderId };
    case 'checkin/clearRequest':
      return { ...state, checkinRequest: null };
    case 'elder/checkinTime':
      return updateElder(state, action.elderId, (e) => ({ ...e, checkinTime: action.time }));
    case 'demo/othersAutoAnswer':
      return { ...state, othersAutoAnswer: !state.othersAutoAnswer };
    case 'elder/unreachable':
      return { ...state, unreachable: { ...state.unreachable, [action.elderId]: !state.unreachable?.[action.elderId] } };

    case 'regimen/discard':
      return updateElder(state, action.elderId, (e) => ({ ...e, regimens: e.regimens.filter((r) => r.id !== action.regimenId) }));
    // Guided tour: start from the sample data at a chosen moment. Doses before that moment are marked as
    // taken (so nothing old raises alerts), and today's check-in can be pre-filled.
    case 'demo/setup': {
      const o = action.setup || {};
      let s = { ...makeSeed(), epoch: Date.now() };
      s.clock = o.clock ?? s.clock;
      s.elderOnPhone = o.elder ?? s.elderOnPhone;
      s.caregiverOnPhone = o.caregiver ?? s.caregiverOnPhone;
      if (o.unreachable) s.unreachable = { ...s.unreachable, [o.unreachable]: true };
      const meds = medMap(s);
      const doses = { ...s.doses };
      const day = Math.floor(s.clock / (24 * 60));
      for (const elder of s.elders) {
        for (const d of dosesForDay(elder, day, meds)) {
          if (d.at < s.clock && !doses[d.key]) doses[d.key] = { status: 'taken', at: d.at + 3, how: 'voice', by: elder.id };
        }
        if (o.checkinDone && s.clock > checkinAt(elder, day)) {
          s.checkins = { ...s.checkins, [checkinKey(elder.id, day)]: { at: checkinAt(elder, day) + 4, how: 'voice', answers: { feeling: 'good', walk: true, water: true, sleep: true }, said: {} } };
        }
      }
      return { ...s, doses };
    }

    case 'reset':
      return { ...makeSeed(), epoch: Date.now() }; // a new epoch tells the phones to drop what they were doing
    default:
      return state;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore: demo still works without saving */
    }
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  return useContext(Ctx);
}

export function useElder(id) {
  const { state } = useStore();
  return state.elders.find((e) => e.id === id);
}

export function useMeds() {
  const { state } = useStore();
  const custom = state.customMeds;
  return useMemo(() => medMap({ customMeds: custom }), [custom]);
}

export function useCaregiver() {
  const { state } = useStore();
  return state.caregivers.find((c) => c.id === state.caregiverOnPhone);
}
