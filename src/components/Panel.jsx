// Presenter-only panel: stands in for the elder's voice, and skips to the next dose.
// Nothing here listens to a microphone or calls an AI.
import { useStore, useMeds } from '../state/store.jsx';
import { ALERT_AFTER, REPEAT_EVERY, dueGroup, nextDose, waitingSince } from '../lib/schedule.js';
import { ESCALATE_EVERY, recipients, topLevel } from '../state/escalation.js';
import { enTime } from '../lib/time.js';
import { UTTERANCES, clipCount, sayAsElder, soundUnlocked } from '../lib/voice.js';
import { checkPasscode, disableMic, enableMic, voiceStatus } from '../lib/mic.js';
import { useEffect, useState } from 'react';
import { TOUR } from '../data/tour.js';

const GROUPS = [
  { title: 'Answering the reminder', keys: ['took', 'took_reg', 'not_yet', 'forgot', 'help', 'unclear', 'silent'] },
  { title: 'Read-back and undo', keys: ['yes', 'no'] },
  { title: 'Afternoon check-in', keys: ['ci_good', 'ci_unwell', 'ci_pain', 'ci_yes', 'ci_no', 'silent'] },
  { title: 'Emergency (while listening)', keys: ['sos', 'cancel'] },
];

// Which answers make sense in each phase of the elder phone.
const ALLOWED = {
  listen: ['took', 'took_reg', 'not_yet', 'forgot', 'help', 'unclear', 'silent', 'sos'],
  buttons: ['took', 'took_reg', 'not_yet', 'forgot', 'help', 'unclear', 'sos'],
  readback: ['yes', 'no', 'silent', 'sos'],
  logged: ['no'],
  countdown: ['cancel'],
  'ci-listen': ['ci_good', 'ci_unwell', 'ci_pain', 'ci_yes', 'ci_no', 'silent', 'sos'],
};

const NOW = {
  idle: 'Chotu is waiting. Use “Next dose” or the clock to reach a dose time.',
  speak: 'Chotu is speaking.',
  listen: 'Chotu is listening. Choose what the elder says.',
  readback: 'Chotu was not sure, so it read the answer back. Say yes or no.',
  logged: 'Logged. The elder has 5 seconds to say “না” to undo.',
  buttons: 'Two tries with no clear answer, so the big buttons appeared. Voice still works.',
  done: 'Done. Check the caregiver phone.',
  'ci-speak': 'Afternoon check-in: Chotu is asking a question.',
  'ci-listen': 'Afternoon check-in: choose the answer (feeling, then walk, water, sleep). Silence skips the question.',
  countdown: 'Emergency countdown. Say “বাতিল” or tap the big Cancel within 5 seconds.',
  sent: 'Emergency sent to everyone. Check the caregiver phone (Call 999 is demo only).',
};

const INTENT_EN = {
  took: 'took it', not_yet: 'not yet', forgot: "doesn't remember", help: 'asks for help', pain: 'mentions pain',
  emergency: 'emergency words', cancel: 'cancel', yes: 'yes', no: 'no', other: 'not understood',
};

function MicControl({ micOn, setMicOn, lastHeard }) {
  const [ready, setReady] = useState(null); // does the server have an API key?
  const [needPass, setNeedPass] = useState(false); // hosted version: the microphone needs a passcode
  const [passOk, setPassOk] = useState(false);
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { voiceStatus().then((s) => { setReady(s.voiceReady); setNeedPass(Boolean(s.passcodeRequired)); }); }, []);

  // Refresh the small status line (clips ready, sound enabled) every few seconds.
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 3000); return () => clearInterval(i); }, []);

  const toggle = async () => {
    setErr('');
    if (micOn) { disableMic(); setMicOn(false); return; }
    if (needPass && !passOk) {
      if (!(await checkPasscode(pass.trim()))) { setErr('That passcode is not right. The chips work without it.'); return; }
      setPassOk(true);
    }
    if (!window.isSecureContext) { setErr('The microphone only works on http://localhost:5173 (start-demo.bat), not on another address.'); return; }
    try { await enableMic(); setMicOn(true); } catch (e) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setErr('The browser blocked the microphone. In Chrome, click the icon at the left of the address bar → Microphone → Allow, then click this button again. (The preview inside the Claude app always blocks the microphone, so use Chrome.)');
      } else if (name === 'NotFoundError') {
        setErr('No microphone was found. Plug one in or check Windows sound settings, then try again.');
      } else setErr(e?.message || 'The microphone could not start.');
    }
  };

  return (
    <div>
      <p className="note" style={{ marginBottom: 6 }}>
        Chotu’s voice: {clipCount()} clips ready. {soundUnlocked() ? 'Sound is on.' : 'Click anywhere on the page once to allow sound.'}
      </p>
      {needPass && !passOk && !micOn && (
        <input id="mic-pass" className="tour-pick" style={{ marginBottom: 6 }} type="password" value={pass} placeholder="Microphone passcode"
          aria-label="Microphone passcode" onChange={(e) => setPass(e.target.value)} />
      )}
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

/** Guided tour: pick a workflow, start it from the right moment, follow the steps. */
function Tour() {
  const { dispatch } = useStore();
  const saved = (() => { try { return localStorage.getItem('chotu-tour') || TOUR[0].id; } catch { return TOUR[0].id; } })();
  const [id, setId] = useState(saved);
  const [done, setDone] = useState([]);
  const w = TOUR.find((x) => x.id === id) || TOUR[0];
  const groups = [...new Set(TOUR.map((x) => x.group))];
  const choose = (v) => { setId(v); setDone([]); try { localStorage.setItem('chotu-tour', v); } catch { /* not saved */ } };
  const start = () => { setDone([]); dispatch({ type: 'demo/setup', setup: w.setup }); };
  const idx = TOUR.indexOf(w);
  return (
    <div className="tour">
      <p className="note">For rehearsing: {idx + 1} of {TOUR.length}. Start sets the clock, elder and caregiver for you.</p>
      <select id="tour-pick" className="tour-pick" value={w.id} onChange={(e) => choose(e.target.value)} aria-label="Choose a workflow">
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {TOUR.filter((x) => x.group === g).map((x) => <option key={x.id} value={x.id}>{TOUR.indexOf(x) + 1}. {x.title}</option>)}
          </optgroup>
        ))}
      </select>
      <div className="row-btns">
        <button className="btn pri" type="button" onClick={start}>Start this workflow</button>
        <button className="btn" type="button" disabled={idx === TOUR.length - 1} onClick={() => choose(TOUR[idx + 1].id)}>Next workflow</button>
      </div>
      <ol className="tour-steps">
        {w.steps.map((step, i) => (
          <li key={i} className={done.includes(i) ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={done.includes(i)} onChange={() => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))} />
              <span>{step}</span>
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A section of Demo settings that opens and closes; remembers its state in this browser. */
function Section({ id, title, defaultOpen = false, children }) {
  const key = `chotu-sec-${id}`;
  const [open, setOpen] = useState(() => { try { const v = localStorage.getItem(key); return v == null ? defaultOpen : v === '1'; } catch { return defaultOpen; } });
  const toggle = () => setOpen((o) => { try { localStorage.setItem(key, o ? '0' : '1'); } catch { /* not saved */ } return !o; });
  return (
    <section className="dsec">
      <button type="button" className="dsec-head" aria-expanded={open} aria-controls={`sec-${id}`} onClick={toggle}>
        <span>{title}</span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} /></svg>
      </button>
      {open && <div className="dsec-body" id={`sec-${id}`}>{children}</div>}
    </section>
  );
}

export default function Panel({ phase, micOn, setMicOn, lastHeard, onTutorial }) {
  const { state, dispatch } = useStore();
  const meds = useMeds();
  const elder = state.elders.find((e) => e.id === state.elderOnPhone);
  const next = nextDose(elder, state.clock + 1, meds);
  const allowed = ALLOWED[phase] || [];
  const advance = (minutes) => dispatch({ type: 'clock/advance', minutes });

  return (
    <div className="panel">
      <Section id="phones" title="Who is on each phone" defaultOpen>
        <label className="field" htmlFor="pick-elder">Elder phone
          <select id="pick-elder" className="tour-pick" value={state.elderOnPhone} onChange={(e) => dispatch({ type: 'elder/show', elderId: e.target.value })}>
            {state.elders.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.nameEn})</option>)}
          </select>
        </label>
        <label className="field" htmlFor="pick-carer">Caregiver phone
          <select id="pick-carer" className="tour-pick" value={state.caregiverOnPhone} onChange={(e) => dispatch({ type: 'caregiver/use', caregiverId: e.target.value })}>
            {state.caregivers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.relation}){c.primary ? ' · প্রধান যত্নকারী' : ''}</option>)}
          </select>
        </label>
      </Section>

      <Section id="time" title="Time" defaultOpen>
        <div className="now" style={{ fontWeight: 700 }}>Day {Math.floor(state.clock / 1440) + 1} · {enTime(state.clock)}</div>
        <div className="row-btns three">
          <button className="btn" type="button" onClick={() => advance(10)}>+10 min</button>
          <button className="btn" type="button" onClick={() => advance(30)}>+30 min</button>
          <button className="btn" type="button" onClick={() => advance(60)}>+1 hour</button>
        </div>
        <GoToTime clock={state.clock} onGo={advance} />
        <button className="btn" type="button" style={{ width: '100%' }} onClick={() => dispatch({ type: 'reset' })}>Reset demo</button>
      </Section>

      <Section id="actions" title="Demo actions" defaultOpen>
        <div className="now" role="status" aria-live="polite">{NOW[phase] || ''}</div>
        <button className="btn pri" type="button" disabled={!next || phase !== 'idle'} style={{ width: '100%' }}
          onClick={() => dispatch({ type: 'clock/advance', minutes: next.at - state.clock })}>
          {phase !== 'idle' ? 'Next dose (wait: Chotu is busy)' : `Next dose → ${next ? `${next.med.short}, ${enTime(next.at)}` : 'none'}`}
        </button>
        <button className="btn" type="button" disabled={phase !== 'idle'} style={{ width: '100%' }}
          onClick={() => dispatch({ type: 'checkin/request', elderId: elder.id })}>
          Afternoon check-in now ({elder.nameEn}, normally {elder.checkinTime})
        </button>
        <button className="btn" type="button" disabled={phase !== 'idle'} style={{ width: '100%' }}
          onClick={() => dispatch({ type: 'consent/show', elderId: elder.id })}>
          Show consent screen on {elder.nameEn}’s phone
        </button>
      </Section>

      <Section id="answers" title={`${elder.nameEn} answers (instead of speaking)`} defaultOpen>
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
      </Section>

      <Section id="voice" title="Live voice (microphone)">
        <MicControl micOn={micOn} setMicOn={setMicOn} lastHeard={lastHeard} />
        <p className="note">
          With the microphone on, a short clip of the answer goes to our own small server, which asks a Gemini model for the
          meaning (took / not yet / forgot / help) and a confidence score. The API key stays on the server.
        </p>
      </Section>

      <Section id="escalation" title="Escalation and special cases">
        {upcoming(state, meds).map((t, i) => <p key={i} className="note" style={{ color: 'var(--ink)', fontSize: 13.5 }}>{t}</p>)}
        {upcoming(state, meds).length === 0 && <p className="note">Nothing pending. Try “Next dose”, stay silent, then +10 min three times.</p>}
        <label className="toggle-row">
          <input type="checkbox" checked={Boolean(state.unreachable?.[elder.id])} onChange={() => dispatch({ type: 'elder/unreachable', elderId: elder.id })} />
          <span>{elder.nameEn}’s phone unreachable <small>(alert says “can’t reach”, not “missed”)</small></span>
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={Boolean(state.othersAutoAnswer)} onChange={() => dispatch({ type: 'demo/othersAutoAnswer' })} />
          <span>{state.elders.filter((e) => e.id !== elder.id).map((e) => e.nameEn).join(', ')} answers reminders on their own <small>(simulated, keeps their alerts out of the demo)</small></span>
        </label>
      </Section>

      <Section id="rehearse" title="Rehearsal workflows">
        <Tour />
      </Section>

      <button type="button" className="btn" style={{ width: '100%' }} onClick={onTutorial}>Show the tutorial again</button>
    </div>
  );
}

/** Jump the demo clock to a time of day. Time only moves forward: an earlier time means tomorrow. */
function GoToTime({ clock, onGo }) {
  const [time, setTime] = useState('16:00');
  const [h, m] = time.split(':').map(Number);
  const target = h * 60 + m;
  const now = clock % 1440;
  const minutes = target > now ? target - now : target + 1440 - now;
  return (
    <div className="row-btns" style={{ alignItems: 'center' }}>
      <input id="goto-time" type="time" className="tour-pick" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} aria-label="Go to time" style={{ flex: 1 }} />
      <button className="btn" type="button" style={{ flex: 1 }} onClick={() => onGo(minutes)}>
        Go to {target > now ? 'today' : 'tomorrow'}
      </button>
    </div>
  );
}
