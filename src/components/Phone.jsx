// A realistic phone mockup: bezel, status bar with the demo time, and the app screen inside.
// Children get a `toast(msg)` function for short messages on that phone.
import { useCallback, useRef, useState } from 'react';

const StatusIcons = () => (
  <svg aria-hidden="true" width="62" height="12" viewBox="0 0 62 12">
    <g fill="currentColor">
      <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="6" width="3" height="6" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" />
    </g>
    <path d="M24 5.2a9 9 0 0112 0M26.5 7.8a5.5 5.5 0 017 0M29 10.4a2 2 0 012 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="40" y="1" width="19" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <rect x="42" y="3" width="13" height="6" rx="1.2" fill="currentColor" />
    <rect x="60" y="4" width="1.6" height="4" rx=".8" fill="currentColor" />
  </svg>
);

export default function Phone({ label, time, phase, hidden, tint, children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);
  const toast = useCallback((msg) => {
    const k = ++id.current;
    setToasts((t) => [...t, { k, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.k !== k)), 2600);
  }, []);

  return (
    <section className={'pcol' + (hidden ? ' hide' : '')} data-phase={phase} aria-label={label}>
      <div className="pbox">
        <div className="phone" style={{ '--tint': tint }}>
          <div className="statusbar">
            <span className="sb-time">{time}</span>
            <span className="island" aria-hidden="true" />
            <StatusIcons />
          </div>
          <div className="screen">
            {children(toast)}
            <div className="ov">
              {toasts.map((t) => <div key={t.k} className="toast" role="status">{t.msg}</div>)}
            </div>
          </div>
          <span className="home-bar" aria-hidden="true" />
        </div>
      </div>
      <div className="plabel">{label}</div>
    </section>
  );
}

// First Bangla letter including its vowel sign ("রুমানা" -> "রু"), not just the first code unit.
const firstLetter = (() => {
  try { const s = new Intl.Segmenter('bn', { granularity: 'grapheme' }); return (t) => s.segment(t)[Symbol.iterator]().next().value?.segment || ''; }
  catch { return (t) => t.slice(0, 1); }
})();

/** Round photo, or initials when there is no photo. */
export function Avatar({ person, size }) {
  if (person.photo) {
    return <img className="av" src={person.photo} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return <div className="av-init" style={{ width: size, height: size, fontSize: size * 0.42 }}>{firstLetter(person.name)}</div>;
}

/** Medicine packet photo. With `onClick` it becomes a button (tap to see it big). */
export function MedThumb({ src, alt = '', size, onClick }) {
  const inner = src ? <img src={src} alt={alt} /> : <span style={{ margin: 'auto', fontSize: 13, color: '#425A80' }}>ছবি নেই</span>;
  if (onClick) {
    return (
      <button type="button" className="thumb zoomable" style={{ width: size, height: size }} onClick={onClick} aria-label={`${alt} ছবি বড় করে দেখুন`}>
        {inner}
        <span className="zoom-hint" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M10 4a6 6 0 100 12 6 6 0 000-12zM20 20l-5.6-5.6M10 7v6M7 10h6" /></svg>
        </span>
      </button>
    );
  }
  return <div className="thumb" style={{ width: size, height: size }}>{inner}</div>;
}
