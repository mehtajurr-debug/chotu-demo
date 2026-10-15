// One shared state for both phones. Saved to localStorage so a page refresh keeps the demo where it was.
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { makeSeed } from '../data/seed.js';
import { medMap } from '../lib/schedule.js';

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
      return { ...state, clock: state.clock + action.minutes };
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
    case 'regimen/discard':
      return updateElder(state, action.elderId, (e) => ({ ...e, regimens: e.regimens.filter((r) => r.id !== action.regimenId) }));
    case 'reset':
      return makeSeed();
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
