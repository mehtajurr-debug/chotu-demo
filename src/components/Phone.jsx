// A phone-shaped frame. Children get a `toast(msg)` function for short messages on that phone.
import { useCallback, useRef, useState } from 'react';

export default function Phone({ label, status, hidden, children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);
  const toast = useCallback((msg) => {
    const k = ++id.current;
    setToasts((t) => [...t, { k, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.k !== k)), 2600);
  }, []);

  return (
    <section className={'pcol' + (hidden ? ' hide' : '')}>
      <div className="cap">{label} {status && <small>{status}</small>}</div>
      <div className="pbox">
        <div className="phone">
          {children(toast)}
          <div className="ov">
            {toasts.map((t) => <div key={t.k} className="toast" role="status">{t.msg}</div>)}
          </div>
        </div>
      </div>
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

export function MedThumb({ src, alt = '', size }) {
  return (
    <div className="thumb" style={{ width: size, height: size }}>
      {src ? <img src={src} alt={alt} /> : <span style={{ margin: 'auto', fontSize: 13, color: '#425A80' }}>ছবি নেই</span>}
    </div>
  );
}
