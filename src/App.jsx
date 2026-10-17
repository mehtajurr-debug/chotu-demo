import { useEffect, useState } from 'react';
import { useStore } from './state/store.jsx';
import Header from './components/Header.jsx';
import Phone from './components/Phone.jsx';
import Panel from './components/Panel.jsx';
import Tutorial from './components/Tutorial.jsx';
import Coach from './components/Coach.jsx';
import ElderPhone from './elder/ElderPhone.jsx';
import CaregiverPhone from './caregiver/CaregiverPhone.jsx';
import { enTime } from './lib/time.js';

const PHONE_W = 390;
const PHONE_H = 874; // 30 px status bar + 844 px screen
const DRAWER_W = 380;

const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* not saved */ } },
};

// Scale the phones to the space left by the header, the chosen view and an open drawer.
function useFitScale(view, drawerOpen, reserveBottom = 0) {
  useEffect(() => {
    const fit = () => {
      const narrow = innerWidth <= 900;
      const hdr = document.querySelector('.hdr')?.offsetHeight || 64;
      const availH = innerHeight - hdr - 24 - 44 - reserveBottom; // top margin + label under the phone (+ the rehearsal card)
      const count = view === 'both' && !narrow ? 2 : 1;
      const side = drawerOpen && innerWidth > 1100 ? DRAWER_W : 0;
      const availW = innerWidth - 40 - side - (count === 2 ? 56 : 0);
      const s = Math.max(0.3, Math.min(1.25, availH / PHONE_H, availW / count / PHONE_W));
      document.documentElement.style.setProperty('--s', s.toFixed(3));
    };
    fit();
    const ro = new ResizeObserver(fit);
    const hdr = document.querySelector('.hdr');
    if (hdr) ro.observe(hdr);
    addEventListener('resize', fit);
    return () => { ro.disconnect(); removeEventListener('resize', fit); };
  }, [view, drawerOpen, reserveBottom]);
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => innerWidth <= 900);
  useEffect(() => {
    const on = () => setNarrow(innerWidth <= 900);
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);
  return narrow;
}

export default function App() {
  const { state } = useStore();
  const narrow = useNarrow();
  const [view, setViewRaw] = useState(() => store.get('chotu-view', 'both')); // elder | care | both
  const shown = narrow && view === 'both' ? 'elder' : view; // a narrow screen fits one phone
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tutorial, setTutorial] = useState(() => store.get('chotu-tutorial-seen-v2', '') !== '1');
  const [elderPhase, setElderPhase] = useState('idle');
  const [micOn, setMicOn] = useState(false); // live microphone, switched on in Demo settings
  const [lastHeard, setLastHeard] = useState(null); // what the server understood last time
  const [coach, setCoach] = useState(null); // rehearsal workflow being followed
  const [coachH, setCoachH] = useState(0); // its height, so the phones shrink to stay above it
  useFitScale(shown, drawerOpen, coach && !drawerOpen ? coachH + 8 : 0);

  const setView = (v) => { setViewRaw(v); store.set('chotu-view', v); };
  const closeTutorial = () => { setTutorial(false); store.set('chotu-tutorial-seen-v2', '1'); };
  const { dispatch } = useStore();
  // Start a rehearsal workflow: set up the moment it starts from, show the right phone(s), show the guide card.
  const startTour = (w) => {
    dispatch({ type: 'demo/setup', setup: w.setup });
    setView(w.view || 'both');
    setDrawerOpen(false);
    setCoach(w.id);
  };
  const elder = state.elders.find((e) => e.id === state.elderOnPhone);
  const carer = state.caregivers.find((c) => c.id === state.caregiverOnPhone);
  const time = enTime(state.clock).split(' ')[0]; // shown in the phones' status bar

  return (
    <>
      <Header view={shown} setView={setView} narrow={narrow} drawerOpen={drawerOpen} onSettings={() => setDrawerOpen((o) => !o)} />
      <main className={'stage view-' + shown + (drawerOpen ? ' with-drawer' : '')}>
        <Phone label={`${elder.gen} ফোন`} time={time} phase={elderPhase} hidden={shown === 'care'} tint="#E3EFFC">
          {/* A new key (other elder, or Reset) starts the elder phone fresh. */}
          {(toast) => <ElderPhone key={`${elder.id}-${state.epoch || 0}`} toast={toast} onPhase={setElderPhase} micOn={micOn} onHeard={setLastHeard} />}
        </Phone>
        <Phone label={`${carer.gen} ফোন (${carer.relation}${carer.primary ? ', প্রধান যত্নকারী' : ''})`} time={time} hidden={shown === 'elder'} tint="#F0F6FD">
          {(toast) => <CaregiverPhone key={state.epoch || 0} toast={toast} />}
        </Phone>
      </main>

      <aside className={'drawer' + (drawerOpen ? ' open' : '')} aria-label="Demo settings" aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div>
            <b>Demo settings</b>
            <small>Presenter controls. Not part of the app.</small>
          </div>
          <button type="button" className="icon-close" aria-label="Close demo settings" onClick={() => setDrawerOpen(false)}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {drawerOpen && <Panel phase={elderPhase} micOn={micOn} setMicOn={setMicOn} lastHeard={lastHeard} onTutorial={() => { setDrawerOpen(false); setTutorial(true); }} onStartTour={startTour} />}
      </aside>

      {coach && !drawerOpen && <Coach id={coach} phase={elderPhase} shown={shown} setView={setView} onStart={startTour} onEnd={() => setCoach(null)} onHeight={setCoachH} />}
      {tutorial && <Tutorial onClose={closeTutorial} />}
    </>
  );
}
