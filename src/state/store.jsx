// One shared state for both phones. Saved to localStorage so a page refresh keeps the demo where it was.
import { createContext, useContext, useEffect, useReducer } from 'react';
import { makeSeed } from '../data/seed.js';

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

function reducer(state, action) {
  switch (action.type) {
    case 'clock/advance':
      return { ...state, clock: state.clock + action.minutes };
    case 'elder/show':
      return { ...state, elderOnPhone: action.elderId };
    case 'log/add':
      return { ...state, log: [...state.log, { at: state.clock, ...action.entry }] };
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
