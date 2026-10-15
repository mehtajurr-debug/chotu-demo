// Presenter bar: which elder the elder phone shows, and the demo clock.
import { useStore } from '../state/store.jsx';
import { bnTime, dayOf, enTime } from '../lib/time.js';

export default function TopBar() {
  const { state, dispatch } = useStore();
  const advance = (minutes) => dispatch({ type: 'clock/advance', minutes });

  return (
    <header className="top">
      <div className="brand">
        <img src="/img/logo.png" alt="" width="40" height="40" />
        <h1>Chotu</h1>
        <span className="tag">Demo · sample data</span>
      </div>

      <div className="group" role="group" aria-label="Elder phone shows">
        <span className="lbl">Elder phone</span>
        <div className="seg">
          {state.elders.map((e) => (
            <button key={e.id} type="button" aria-pressed={state.elderOnPhone === e.id}
              onClick={() => dispatch({ type: 'elder/show', elderId: e.id })}>
              <img src={e.photo} alt="" width="32" height="32" />
              {e.nameEn}
            </button>
          ))}
        </div>
      </div>

      <div className="spacer" />

      <div className="group" role="group" aria-label="Demo clock">
        <div className="clock" aria-live="polite">
          <b>Day {dayOf(state.clock) + 1} · {enTime(state.clock)}</b>
          <span>{bnTime(state.clock)}</span>
        </div>
        <button className="btn" type="button" onClick={() => advance(10)}>+10 min</button>
        <button className="btn" type="button" onClick={() => advance(30)}>+30 min</button>
        <button className="btn" type="button" onClick={() => advance(60)}>+1 hour</button>
        <button className="btn pri" type="button" onClick={() => dispatch({ type: 'reset' })}>Reset demo</button>
      </div>
    </header>
  );
}
