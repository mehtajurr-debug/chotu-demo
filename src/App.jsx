import { useEffect, useState } from 'react';
import { useStore } from './state/store.jsx';
import TopBar from './components/TopBar.jsx';
import Phone from './components/Phone.jsx';
import Panel from './components/Panel.jsx';
import ElderPhone from './elder/ElderPhone.jsx';
import CaregiverPhone from './caregiver/CaregiverPhone.jsx';

// Shrink both phones so they fit the window (like the prototype).
function useFitScale() {
  useEffect(() => {
    const fit = () => {
      const narrow = innerWidth <= 900;
      const panelBeside = innerWidth > 1240; // the presenter panel sits to the right of the phones
      const stage = document.querySelector('.stage');
      const top = stage ? stage.getBoundingClientRect().top + scrollY : 150;
      const availH = innerHeight - top - 56; // room for the caption above each phone and a margin below
      let s = Math.min(1, availH / 844);
      const availW = innerWidth - 120 - (panelBeside ? 336 : 0);
      s = narrow ? Math.min(s, (innerWidth - 40) / 390) : Math.min(s, availW / 2 / 390);
      document.documentElement.style.setProperty('--s', Math.max(0.42, s).toFixed(3));
    };
    fit();
    // The top bar can wrap onto two lines, so refit whenever its height changes too.
    const ro = new ResizeObserver(fit);
    const bar = document.querySelector('.top');
    if (bar) ro.observe(bar);
    addEventListener('resize', fit);
    return () => { ro.disconnect(); removeEventListener('resize', fit); };
  }, []);
}

const ELDER_LABEL = {
  idle: 'waiting', speak: 'Chotu is speaking', listen: 'listening', readback: 'reading back', logged: 'logged, 5 s to undo',
  buttons: 'buttons shown', done: 'done', countdown: 'emergency countdown', sent: 'emergency sent',
};

export default function App() {
  useFitScale();
  const { state } = useStore();
  const [tab, setTab] = useState('e'); // narrow screens show one phone at a time
  const [cgScreen, setCgScreen] = useState('home');
  const [elderPhase, setElderPhase] = useState('idle');
  const [micOn, setMicOn] = useState(false); // live microphone, switched on from the presenter panel
  const [lastHeard, setLastHeard] = useState(null); // what the server understood last time
  const elder = state.elders.find((e) => e.id === state.elderOnPhone);
  const carer = state.caregivers.find((c) => c.id === state.caregiverOnPhone);

  return (
    <>
      <TopBar />
      <div className="tabs">
        <button className="btn" type="button" aria-pressed={tab === 'e'} onClick={() => setTab('e')}>Elder phone</button>
        <button className="btn" type="button" aria-pressed={tab === 'c'} onClick={() => setTab('c')}>Caregiver phone</button>
      </div>
      <main className="stage">
        <Phone label={`Elder phone · ${elder.nameEn}`} status={ELDER_LABEL[elderPhase]} hidden={tab !== 'e'}>
          {/* A new key (other elder, or Reset) starts the elder phone fresh. */}
          {(toast) => <ElderPhone key={`${elder.id}-${state.epoch || 0}`} toast={toast} onPhase={setElderPhase} micOn={micOn} onHeard={setLastHeard} />}
        </Phone>
        <Phone label={`Caregiver phone · ${carer.nameEn}`} status={cgScreen} hidden={tab !== 'c'}>
          {(toast) => <CaregiverPhone key={state.epoch || 0} toast={toast} onScreen={setCgScreen} />}
        </Phone>
        <Panel phase={elderPhase} micOn={micOn} setMicOn={setMicOn} lastHeard={lastHeard} />
      </main>
    </>
  );
}
