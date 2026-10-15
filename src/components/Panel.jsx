// Presenter-only panel: stands in for the elder's voice, and skips to the next dose.
// Nothing here listens to a microphone or calls an AI.
import { useStore, useMeds } from '../state/store.jsx';
import { ALERT_AFTER, REPEAT_EVERY, dueGroup, nextDose, waitingSince } from '../lib/schedule.js';
import { ESCALATE_EVERY, recipients, topLevel } from '../state/escalation.js';
import { enTime } from '../lib/time.js';
import { UTTERANCES, sayAsElder } from '../lib/voice.js';
import { disableMic, enableMic, voiceStatus } from '../lib/mic.js';
import { useEffect, useState } from 'react';

const GROUPS = [
  { title: 'Answering the reminder', keys: ['took', 'took_reg', 'not_yet', 'forgot', 'help', 'unclear', 'silent'] },
  { title: 'Read-back and undo', keys: ['yes', 'no'] },
];

// Which answers make sense in each phase of the elder phone.
const ALLOWED = {
  listen: ['took', 'took_reg', 'not_yet', 'forgot', 'help', 'unclear', 'silent'],
  buttons: ['took', 'took_reg', 'not_yet', 'forgot', 'help', 'unclear'],
  readback: ['yes', 'no', 'silent'],
  logged: ['no'],
};

const NOW = {
  idle: 'Chotu is waiting. Use “Next dose” or the clock to reach a dose time.',
  speak: 'Chotu is speaking.',
  listen: 'Chotu is listening. Choose what the elder says.',
  readback: 'Chotu was not sure, so it read the answer back. Say yes or no.',
  logged: 'Logged. The elder has 5 seconds to say “না” to undo.',
  buttons: 'Two tries with no clear answer, so the big buttons appeared. Voice still works.',
  done: 'Done. Check the caregiver phone.',
};

const INTENT_EN = {
  took: 'took it', not_yet: 'not yet', forgot: "doesn't remember", help: 'asks for help', pain: 'mentions pain',
  emergency: 'emergency words', cancel: 'cancel', yes: 'yes', no: 'no', other: 'not understood',
};

function MicControl({ micOn, setMicOn, lastHeard }) {
  const [ready, setReady] = useState(null); // does the server have an API key?
  const [err, setErr] = useState('');
  useEffect(() => { voiceStatus().then((s) => setReady(s.voiceReady)); }, []);

  const toggle = async () => {
    setErr('');
    if (micOn) { disableMic(); setMicOn(false); return; }
    try { await enableMic(); setMicOn(true); } catch (e) { setErr(e.message || 'Microphone blocked.'); }
  };

  return (
    <div>
      <h2>Live voice</h2>
      <button type="button" className={'btn' + (micOn ? ' pri' : '')} style={{ width: '100%' }} disabled={ready === false && !micOn} onClick={toggle}>
        {micOn ? '● Microphone on (click to turn off)' : 'Turn on microphone'}
      </button>
      <p className="note" style={{ marginTop: 6 }}>
        {ready === false && 'No API key on the server yet, so live listening is off. Chips still work.'}
        {ready && !micOn && 'When on, Chotu listens after it speaks. Chips still work as a backup.'}
        {micOn && 'Listening opens automatically after Chotu speaks.'}
      </p>
      {err && <p className="note" style={{ color: '#B3261E', fontWeight: 600 }}>{err}</p>}
      {lastHeard && (
        <div className="now" style={{ marginTop: 8, fontWeight: 500 }}>
          {lastHeard.error
            ? <>Could not understand: {lastHeard.error}</>
            : <>Heard “{lastHeard.transcript || '…'}” → <b>{INTENT_EN[lastHeard.intent] || lastHeard.intent}</b> ({Math.round(lastHeard.confidence * 100)}% sure)</>}
        </div>
      )}
    </div>
  );
}

/** Plain-English list of what the demo clock will trigger next, so the presenter can narrate it. */
function upcoming(state, meds) {
  const out = [];
  const now = state.clock;
  const name = (id) => state.caregivers.find((c) => c.id === id)?.nameEn;
  for (const elder of state.elders) {
    const due = dueGroup(elder, now, meds, state.doses);
    if (due.length) {
      const since = Math.min(...due.map((d) => waitingSince(d, state.doses)));
      const steps = [
        [since + REPEAT_EVERY, 'repeats the reminder'],
        [since + 2 * REPEAT_EVERY, 'repeats again'],
        [since + ALERT_AFTER, `alerts ${name(elder.alertOrder[0])}`],
      ];
      const next = steps.find(([t]) => t > now);
      if (next) out.push(`${elder.nameEn}: no answer yet. At ${enTime(next[0])} Chotu ${next[1]}.`);
    }
  }
  for (const a of state.alerts) {
    if (a.resolvedAt) continue;
    const elder = state.elders.find((e) => e.id === a.elderId);
    if (a.handledBy) { out.push(`${elder.nameEn}: ${name(a.handledBy)} is handling the alert. Nobody else is pinged.`); continue; }
    const told = recipients(state, a).map(name).join(' + ');
    if (a.ladder && a.level < topLevel(state, a.elderId)) {
      const nextAt = a.createdAt + (a.level + 1) * ESCALATE_EVERY;
      const whoNext = a.level + 1 < elder.alertOrder.length ? name(elder.alertOrder[a.level + 1]) : 'everyone';
      out.push(`${elder.nameEn}: alert sent to ${told}. If nobody taps “আমি দেখছি”, ${whoNext} at ${enTime(nextAt)}.`);
    } else out.push(`${elder.nameEn}: alert sent to ${told}. Waiting for someone to take it.`);
  }
  return out;
}

export default function Panel({ phase, micOn, setMicOn, lastHeard }) {
  const { state, dispatch } = useStore();
  const meds = useMeds();
  const elder = state.elders.find((e) => e.id === state.elderOnPhone);
  const next = nextDose(elder, state.clock + 1, meds);
  const allowed = ALLOWED[phase] || [];

  return (
    <aside className="panel" aria-label="Presenter controls">
      <div>
        <h2>Presenter</h2>
        <button className="btn pri" type="button" disabled={!next || phase !== 'idle'} style={{ width: '100%' }}
          onClick={() => dispatch({ type: 'clock/advance', minutes: next.at - state.clock })}>
          Next dose → {next ? `${next.med.short}, ${enTime(next.at)}` : 'none'}
        </button>
      </div>

      <div className="now" role="status" aria-live="polite">{NOW[phase] || ''}</div>

      <div>
        <h2>Escalation</h2>
        {upcoming(state, meds).map((t, i) => <p key={i} className="note" style={{ color: 'var(--ink)', fontSize: 13.5, marginBottom: 4 }}>{t}</p>)}
        {upcoming(state, meds).length === 0 && <p className="note">Nothing pending. Try “Next dose”, stay silent, then +10 min three times.</p>}
        <label className="toggle-row">
          <input type="checkbox" checked={Boolean(state.unreachable?.[elder.id])} onChange={() => dispatch({ type: 'elder/unreachable', elderId: elder.id })} />
          <span>{elder.nameEn}’s phone unreachable <small>(alert says “can’t reach”, not “missed”)</small></span>
        </label>
      </div>

      <MicControl micOn={micOn} setMicOn={setMicOn} lastHeard={lastHeard} />

      <div>
        <h2>{elder.nameEn} says (simulated)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {GROUPS.map((g) => (
            <div key={g.title} className="pgroup">
              <span>{g.title}</span>
              <div className="chips">
                {g.keys.map((k) => (
                  <button key={k} type="button" className="chip" disabled={!allowed.includes(k)} onClick={() => sayAsElder(k)}>
                    {UTTERANCES[k].text || '(চুপ)'}<small>{UTTERANCES[k].en}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="note">
        The chips stand in for the elder’s voice when the microphone is off or the room is noisy. With the microphone on,
        a short clip of the answer goes to our own small server, which asks a Gemini model for the meaning
        (took / not yet / forgot / help) and a confidence score. The API key stays on the server. Chotu’s lines play from
        pre-recorded voice clips and always show as captions.
      </p>
    </aside>
  );
}
