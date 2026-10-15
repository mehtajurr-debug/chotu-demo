// Slim header: which phone to look at, the demo time, and the Demo settings button. Everything else lives in the drawer.
import { useStore } from '../state/store.jsx';
import { bnTime, dayOf, enTime } from '../lib/time.js';
import { unseenAlerts } from '../caregiver/Alerts.jsx';

export default function Header({ view, setView, narrow, onSettings, drawerOpen }) {
  const { state } = useStore();
  const elder = state.elders.find((e) => e.id === state.elderOnPhone);
  const carer = state.caregivers.find((c) => c.id === state.caregiverOnPhone);
  const unseen = unseenAlerts(state, carer.id).length; // new alert on the caregiver phone while looking elsewhere
  const options = [
    { id: 'elder', label: `${elder.gen} ফোন`, sub: 'Elder' },
    { id: 'care', label: `${carer.gen} ফোন`, sub: 'Caregiver', dot: unseen > 0 && view === 'elder' },
    ...(narrow ? [] : [{ id: 'both', label: 'দুটোই', sub: 'Side by side' }]),
  ];
  return (
    <header className="hdr">
      <div className="brand">
        <img src="/img/logo.png" alt="" width="36" height="36" />
        <span className="brand-name">Chotu</span>
      </div>
      <div className="viewsw" role="tablist" aria-label="Which phone to show">
        {options.map((o) => (
          <button key={o.id} type="button" role="tab" aria-selected={view === o.id} onClick={() => setView(o.id)}>
            <span>{o.label}</span>
            <small>{o.sub}</small>
            {o.dot && <span className="dot" aria-label="নতুন সতর্কতা" />}
          </button>
        ))}
      </div>
      <div className="hdr-right">
        <span className="clockpill" title="Demo time (simulated)">
          <b>{enTime(state.clock)}</b>
          <small>Day {dayOf(state.clock) + 1} · {bnTime(state.clock)}</small>
        </span>
        <button type="button" className="btn settings-btn" aria-expanded={drawerOpen} onClick={onSettings}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" /></svg>
          Demo settings
        </button>
      </div>
    </header>
  );
}
