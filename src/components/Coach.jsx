// Rehearsal guide card: shown after "Start this workflow". One step at a time, with the elder's answer chips
// and the clock buttons right here, so the presenter never has to dig into Demo settings mid-workflow.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { TOUR } from '../data/tour.js';
import { AnswerChips } from './Panel.jsx';

/** Which phone a step is about: "Elder: …" or "Caregiver: …". */
const stepView = (text) => (/^Elder\b/.test(text) ? 'elder' : /^Caregiver\b/.test(text) ? 'care' : null);

export default function Coach({ id, phase, shown, setView, onStart, onEnd, onHeight }) {
  const { dispatch } = useStore();
  const w = TOUR.find((x) => x.id === id);
  const [i, setI] = useState(0);
  const [small, setSmall] = useState(false);
  useEffect(() => { setI(0); setSmall(false); }, [id]);
  // Tell the app how tall the card is, so the phones can shrink to stay above it.
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => onHeight?.(el.offsetHeight));
    ro.observe(el);
    return () => { ro.disconnect(); onHeight?.(0); };
  }, [small, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When only one phone is shown, follow the step to the phone it is about.
  const text = w?.steps[i] || '';
  useEffect(() => {
    const v = stepView(text);
    if (v && shown !== 'both' && shown !== v) setView(v);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!w) return null;
  const idx = TOUR.indexOf(w);
  const last = i === w.steps.length - 1;
  const next = TOUR[idx + 1];
  const advance = (minutes) => dispatch({ type: 'clock/advance', minutes });

  if (small) {
    return (
      <button ref={box} type="button" className="coach-pill" onClick={() => setSmall(false)}>
        Rehearsal: {w.title} · step {i + 1}/{w.steps.length}
      </button>
    );
  }
  return (
    <div ref={box} className="coach" role="region" aria-label="Rehearsal guide">
      <div className="coach-head">
        <span className="grow"><small>Rehearsal {idx + 1}/{TOUR.length}</small><b>{w.title}</b></span>
        <button type="button" className="coach-x" aria-label="Make the guide small" onClick={() => setSmall(true)}>–</button>
        <button type="button" className="coach-x" aria-label="End rehearsal" onClick={onEnd}>✕</button>
      </div>
      <div className="coach-step">
        <span className="coach-n">{i + 1}/{w.steps.length}</span>
        <span>{text}</span>
      </div>
      <AnswerChips phase={phase} compact />
      <div className="row-btns" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <button className="btn" type="button" onClick={() => advance(10)}>+10 min</button>
        <button className="btn" type="button" onClick={() => advance(30)}>+30 min</button>
        <button className="btn" type="button" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Back</button>
        {!last && <button className="btn pri" type="button" onClick={() => setI(i + 1)}>Next ›</button>}
        {last && next && <button className="btn pri" type="button" onClick={() => onStart(next)}>Next workflow</button>}
        {last && !next && <button className="btn pri" type="button" onClick={onEnd}>Finish</button>}
      </div>
    </div>
  );
}
