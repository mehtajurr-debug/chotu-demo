import { useEffect, useState } from 'react';
import { useStore } from './state/store.jsx';
import TopBar from './components/TopBar.jsx';
import Phone from './components/Phone.jsx';
import ElderPhone from './elder/ElderPhone.jsx';
import CaregiverPhone from './caregiver/CaregiverPhone.jsx';

// Shrink both phones so they fit the window (like the prototype).
function useFitScale() {
  useEffect(() => {
    const fit = () => {
      const narrow = innerWidth <= 900;
      const stage = document.querySelector('.stage');
      const top = stage ? stage.getBoundingClientRect().top + scrollY : 150;
      const availH = innerHeight - top - 56; // room for the caption above each phone and a margin below
      let s = Math.min(1, availH / 844);
      s = narrow ? Math.min(s, (innerWidth - 40) / 390) : Math.min(s, (innerWidth - 120) / 2 / 390);
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

export default function App() {
  useFitScale();
  const { state } = useStore();
  const [tab, setTab] = useState('e'); // narrow screens show one phone at a time
  const elder = state.elders.find((e) => e.id === state.elderOnPhone);
  const carer = state.caregivers.find((c) => c.primary);

  return (
    <>
      <TopBar />
      <div className="tabs">
        <button className="btn" type="button" aria-pressed={tab === 'e'} onClick={() => setTab('e')}>Elder phone</button>
        <button className="btn" type="button" aria-pressed={tab === 'c'} onClick={() => setTab('c')}>Caregiver phone</button>
      </div>
      <main className="stage">
        <Phone label={`Elder phone · ${elder.nameEn}`} status="waiting" hidden={tab !== 'e'}>
          {(toast) => <ElderPhone toast={toast} />}
        </Phone>
        <Phone label={`Caregiver phone · ${carer.nameEn}`} status="home" hidden={tab !== 'c'}>
          {(toast) => <CaregiverPhone toast={toast} />}
        </Phone>
      </main>
    </>
  );
}
