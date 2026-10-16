// Small building blocks for caregiver screens: header with back arrow, big toggle buttons, steppers, switch, photo picker.
import { useRef } from 'react';
import Icon from './Icon.jsx';
import { bn } from '../lib/time.js';
import { fileToSmallDataUrl } from '../lib/image.js';

export function ScreenHeader({ title, step, onBack }) {
  return (
    <div className="row" style={{ flexShrink: 0 }}>
      {onBack && (
        <button type="button" className="icon-btn" aria-label="ফিরে যান" onClick={onBack}>
          <Icon name="back" size={28} color="#0B2F8A" />
        </button>
      )}
      <div className="grow" style={{ fontSize: 23, fontWeight: 700, color: '#0B2F8A', lineHeight: 1.3 }}>{title}</div>
      {step && <span className="pill">{bn(step[0])}/{bn(step[1])}</span>}
    </div>
  );
}

/** A big button that stays highlighted when chosen. */
export function Toggle({ on, onClick, children, sub, disabled }) {
  return (
    <button type="button" className="tgl" aria-pressed={!!on} onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      {sub && <small>{sub}</small>}
    </button>
  );
}

export function Stepper({ value, min = 1, max = 99, onChange, unit }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="কমান" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <b>{bn(value)} {unit}</b>
      <button type="button" aria-label="বাড়ান" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}

export function Switch({ on, onChange, label, sub }) {
  return (
    <button type="button" className="switch-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="grow" style={{ textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{label}</span>
        {sub && <span className="t-sub" style={{ display: 'block', fontSize: 14.5 }}>{sub}</span>}
      </span>
      <span className="switch" data-on={on}><span /></span>
    </button>
  );
}

/** Opens the camera / gallery and returns a small JPEG data URL. */
/** Opens the camera or photo picker. onFile gets the original file (for reading text); onPhoto a small copy. */
export function PhotoButton({ onPhoto, onFile, onError, children, className = 'btn-wide' }) {
  const input = useRef(null);
  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>{children}</button>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try { if (onFile) await onFile(f); else onPhoto(await fileToSmallDataUrl(f)); } catch { onError?.(); }
        }} />
    </>
  );
}

export function Label({ children }) {
  return <div style={{ fontSize: 15, fontWeight: 700, color: '#425A80', lineHeight: 1.4 }}>{children}</div>;
}
