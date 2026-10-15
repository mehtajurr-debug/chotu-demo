// Elder phone. One stage: Chotu's face on top, big captions in the middle, medicine photo below.
// Only the caption and the ring change. The emergency button is always visible.
//
// Reminder flow (voice first, zero taps when it goes well):
//   dose due -> Chotu speaks -> listens -> "লিখে রাখলাম" with 5 s to say "না" -> logged to the caregiver timeline.
//   Silence or a failed answer: "আমি ঠিক বুঝতে পারিনি, আবার বলবেন?" (max 2 tries), then buttons appear.
//   A low-confidence answer is read back before logging.
import { useEffect, useRef, useState } from 'react';
import { useElder, useMeds, useStore } from '../state/store.jsx';
import { bnGreeting, bnTime, bnWhen, dayOf } from '../lib/time.js';
import { MEAL_TIMING, doseText, dueGroup, lastTaken, medImage, nextDoseGroup, prnCheck, reminderLevel } from '../lib/schedule.js';
import { lineText, onElderSays, speak, stopSpeaking } from '../lib/voice.js';
import { recordAnswer, understandClip } from '../lib/mic.js';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import Icon from '../components/Icon.jsx';

const LISTEN_MS = 9000; // how long Chotu waits for an answer (real seconds)
const UNDO_MS = 5000; // time to say "না" after a dose is logged

const seg = (() => {
  try { const s = new Intl.Segmenter('bn', { granularity: 'grapheme' }); return (t) => Array.from(s.segment(t), (x) => x.segment); }
  catch { return (t) => Array.from(t); }
})();

export default function ElderPhone({ toast, onPhase, micOn, onHeard }) {
  const { state, dispatch } = useStore();
  const elder = useElder(state.elderOnPhone);
  const meds = useMeds();
  const now = state.clock;
  const due = dueGroup(elder, now, meds, state.doses);
  const dueKey = due.map((d) => d.key).join('|');
  const offline = Boolean(state.unreachable?.[elder.id]); // presenter toggle: this phone can't be reached
  const consentOpen = state.showConsentFor === elder.id; // reminders wait while the elder is choosing

  const [phase, setPhase] = useState('idle'); // idle | speak | listen | readback | logged | buttons | done | countdown | sent
  const [count, setCount] = useState(5); // emergency countdown
  const [caption, setCaption] = useState('');
  const [heard, setHeard] = useState('');
  const [undoOn, setUndoOn] = useState(false); // the 5-second 'say না to undo' bar is running
  const [active, setActive] = useState([]); // the doses this conversation is about

  // Timer callbacks outlive renders, so they read the latest values through refs.
  const latest = useRef({});
  latest.current = { state, elder, active, micOn };
  const phaseRef = useRef('idle');
  const tries = useRef(0);
  const timers = useRef([]);
  const cancelSpeech = useRef(null);
  const micAbort = useRef(null);
  const waveRef = useRef(null);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const clearAll = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    cancelSpeech.current?.();
    micAbort.current?.abort(); micAbort.current = null;
  };
  const go = (p) => { phaseRef.current = p; setPhase(p); };
  const say = (id, next) => { setCaption(lineText(id, latest.current.elder)); cancelSpeech.current = speak(id, latest.current.elder, next); };

  useEffect(() => () => clearAll(), []); // stop sounds and timers when this phone screen goes away
  useEffect(() => { onPhase?.(phase); }, [phase, onPhase]);

  // A dose is due and Chotu is free: start the reminder. With no answer, the demo clock brings repeats at +10 and +20.
  const level = due.length ? reminderLevel(due, now, state.doses) : 0;
  const lastLevel = useRef(-1);
  useEffect(() => {
    if (offline || consentOpen || !due.length) return;
    // A newer repeat takes over, unless an answer is being logged right now.
    const waiting = phase === 'idle' || (level > lastLevel.current && ['speak', 'listen', 'readback', 'buttons'].includes(phase));
    if (waiting) startReminder(due, level);
  }, [dueKey, phase, level, offline, consentOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function startReminder(group, lvl) {
    clearAll();
    tries.current = 0;
    lastLevel.current = lvl;
    latest.current.active = group;
    setActive(group);
    setHeard('');
    go('speak');
    say(lvl === 0 ? `reminder_${group[0].slot}` : `repeat_${lvl}`, listen);
  }

  // At +30 the family was alerted: tell the elder, kindly. Later, when someone takes it, say so too.
  const missedAlert = state.alerts.find((a) => a.elderId === elder.id && a.kind === 'missed' && !a.told && !a.resolvedAt && now - a.createdAt <= 15);
  const handledAlert = state.alerts.find((a) => a.elderId === elder.id && a.handledBy && !a.handlingTold && !a.resolvedAt);
  useEffect(() => {
    if (offline || !missedAlert) return;
    if (!['idle', 'listen', 'buttons', 'readback'].includes(phaseRef.current)) return;
    dispatch({ type: 'alert/told', id: missedAlert.id, field: 'told' });
    clearAll();
    setHeard('');
    go('speak');
    say('no_response_family_told', () => finish(3500));
  }, [missedAlert?.id, phase, offline]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (offline || !handledAlert || phaseRef.current !== 'idle' || due.length) return;
    dispatch({ type: 'alert/told', id: handledAlert.id, field: 'handlingTold' });
    latest.current.active = [];
    setActive([]);
    go('speak');
    say('family_handling', () => finish(3000));
  }, [handledAlert?.id, phase, offline]); // eslint-disable-line react-hooks/exhaustive-deps

  function listen() {
    go('listen');
    setHeard('');
    if (latest.current.micOn) micListen('reminder');
    else later(noAnswer, LISTEN_MS);
  }

  /** Live microphone: record one answer, ask our server what it means, then handle it like any answer. */
  function micListen(context) {
    const ac = new AbortController();
    micAbort.current = ac;
    const setLvl = (rms) => waveRef.current?.style.setProperty('--lvl', Math.min(1, rms * 12).toFixed(2));
    recordAnswer({ signal: ac.signal, startTimeoutMs: context === 'undo' ? UNDO_MS - 600 : 7000, onLevel: setLvl }).then(async ({ wav }) => {
      setLvl(0);
      if (ac.signal.aborted) return;
      if (!wav) return micSilence(context);
      setHeard('বুঝছি…');
      try {
        const r = await understandClip(wav, context);
        if (ac.signal.aborted) return;
        onHeard?.(r);
        handleAnswer({ text: r.transcript || '…', intent: r.intent, lowConfidence: r.confidence < 0.6 });
      } catch (e) {
        if (ac.signal.aborted) return;
        onHeard?.({ error: e.message });
        setHeard('');
        micSilence(context); // could not understand: never blame, just ask again
      }
    });
  }

  function micSilence(context) {
    const p = phaseRef.current;
    if (context === 'undo' || context === 'cancel') return; // nothing said in time: carry on as planned
    if (p === 'buttons') return micListen('reminder'); // keep listening while the buttons are up
    noAnswer();
  }

  function noAnswer() {
    tries.current += 1;
    if (tries.current < 2) { go('speak'); say('didnt_hear', listen); }
    else { go('buttons'); say('ask_buttons', () => { if (latest.current.micOn && phaseRef.current === 'buttons') micListen('reminder'); }); }
  }

  /** Show the words as if transcribed live, then continue. */
  function typed(text, done) {
    const g = seg(text);
    let i = 0;
    setHeard('');
    const tick = () => {
      i += 1;
      setHeard(g.slice(0, i).join(''));
      if (i < g.length) later(tick, 55); else later(done, 600);
    };
    later(tick, 55);
  }

  function names() {
    return latest.current.active.map((d) => d.med.short).join(' ও ');
  }

  function record(status, how, text, extra = {}) {
    const { active: act, elder: el } = latest.current;
    dispatch({ type: 'dose/record', elderId: el.id, keys: act.map((d) => d.key), status, how, text, ...extra });
  }

  function finish(ms = 2500) {
    go('done');
    later(() => { go('idle'); setHeard(''); }, ms);
  }

  // ----- outcomes -----
  function took(how) {
    go('logged');
    setUndoOn(false);
    // The 5-second undo window starts when Chotu has finished saying "ভুল হলে “না” বলুন".
    // ("না" already works while Chotu is still speaking.)
    say('ack_taken', () => {
      if (phaseRef.current !== 'logged') return;
      setUndoOn(true);
      if (latest.current.micOn) micListen('undo');
      later(() => {
        micAbort.current?.abort();
        setUndoOn(false);
        record('taken', how, `${names()} খেয়েছেন (${how === 'voice' ? 'কথায় বলেছেন' : 'বোতাম চেপেছেন'})`);
        setCaption('লিখে রাখা হয়েছে');
        finish();
      }, UNDO_MS);
    });
  }

  function notYet(how) {
    record('snoozed', how, `${names()}: “এখনও খাইনি” বলেছেন। ১০ মিনিট পরে আবার মনে করাবে`, { untilIn: 10 });
    go('speak');
    say('ack_not_yet', () => finish(1500));
  }

  function forgot(how) {
    const { state: s, active: act } = latest.current;
    const last = act.map((d) => {
      const at = lastTaken(d.regimen.id, s.doses);
      return `${d.med.short} শেষ খেয়েছেন ${at != null ? bnWhen(at, s.clock) : 'কখন, তথ্য নেই'}`;
    }).join('; ');
    record('unsure', how, `“মনে নেই” বলেছেন। ছোটু অপেক্ষা করতে বলেছে, ওষুধ খেতে বলেনি। ${last}`, {
      alert: `${latest.current.elder.name} বলছেন ওষুধ খাওয়ার কথা মনে নেই। ছোটু অপেক্ষা করতে বলেছে, ওষুধ খেতে বলেনি। ${last}`,
    });
    go('speak');
    say('ack_not_sure', () => finish(4000));
  }

  function help(how, what = '“সাহায্য চাই” বলেছেন') {
    record('help', how, `ওষুধের সময় ${what} (${names()})`, { alert: `${latest.current.elder.name} ${what}` });
    go('speak');
    say('ack_help', () => finish(4000));
  }

  // ----- emergency: big button (or "জরুরি", "বাঁচাও" while listening) -> 5-second countdown -> everyone told -----
  function startEmergency(how) {
    if (['countdown', 'sent'].includes(phaseRef.current)) return;
    clearAll();
    setUndoOn(false);
    setHeard('');
    go('countdown');
    setCount(5);
    say('emergency_countdown');
    if (latest.current.micOn) micListen('cancel'); // "বাতিল" cancels
    let n = 5;
    const tick = () => {
      n -= 1;
      setCount(n);
      if (n <= 0) sendEmergency(how); else later(tick, 1000);
    };
    later(tick, 1000);
  }

  function cancelEmergency(how) {
    clearAll();
    const el = latest.current.elder;
    dispatch({ type: 'log/add', entry: { elderId: el.id, by: el.id, kind: 'emergency', text: `জরুরি বার্তা বাতিল করেছেন (${how === 'voice' ? '“বাতিল” বলেছেন' : 'বোতামে'})` } });
    go('speak');
    latest.current.active = [];
    setActive([]);
    say('emergency_cancelled', () => finish(2000));
  }

  function sendEmergency(how) {
    clearAll();
    dispatch({ type: 'emergency/send', elderId: latest.current.elder.id, how });
    go('sent');
    say('emergency_sent');
  }

  // When someone takes the emergency, tell the elder (the "sent" screen also shows who).
  const emergencyAlert = state.alerts.filter((a) => a.elderId === elder.id && a.kind === 'emergency' && !a.resolvedAt).at(-1);
  useEffect(() => {
    if (phase !== 'sent' || !emergencyAlert?.handledBy || emergencyAlert.handlingTold) return;
    dispatch({ type: 'alert/told', id: emergencyAlert.id, field: 'handlingTold' });
    say('family_handling');
  }, [phase, emergencyAlert?.handledBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- as-needed medicine: the elder taps "এখন খেলাম"; always logged, limits checked -----
  function takePrn(r) {
    if (phaseRef.current !== 'idle') return;
    const med = meds[r.medId];
    const chk = prnCheck(r, state.doses, state.clock);
    dispatch({ type: 'prn/log', elderId: elder.id, regimenId: r.id, medName: med.short, how: 'button' });
    const item = [{ key: `prn-${r.id}`, regimen: r, med }];
    latest.current.active = item;
    setActive(item);
    go('speak');
    say(chk.tooSoon || chk.overMax ? 'sos_too_soon' : 'sos_logged', () => finish(3000));
  }

  // ----- what the elder says: from the live microphone, or simulated from the presenter panel -----
  useEffect(() => onElderSays(handleAnswer));

  function handleAnswer(u) {
    const p = phaseRef.current;
    if (p === 'countdown') {
      if (u.intent === 'cancel' || u.intent === 'no') cancelEmergency('voice');
      return;
    }
    if (!['listen', 'readback', 'logged', 'buttons'].includes(p)) return;
    if (u.intent === 'emergency') return startEmergency('voice'); // "জরুরি", "বাঁচাও" while listening

    if (p === 'logged') {
      if (u.intent !== 'no') return; // only "না" matters during the undo window
      clearAll();
      setUndoOn(false);
      typed(u.text, () => { tries.current = 0; go('speak'); say('undo_ok', listen); });
      return;
    }
    if (u.intent === 'silent') {
      if (p !== 'buttons') { clearAll(); noAnswer(); }
      return;
    }

    clearAll();
    typed(u.text, () => {
      if (p === 'readback' && u.intent === 'no') { go('speak'); say('ask_again', listen); return; }
      if (u.intent === 'took' && u.lowConfidence) {
        go('speak');
        say('confirm_taken', () => {
          go('readback'); setHeard('');
          if (latest.current.micOn) micListen('readback'); else later(noAnswer, LISTEN_MS);
        });
        return;
      }
      if (u.intent === 'took' || u.intent === 'yes') return took('voice');
      if (u.intent === 'not_yet' || u.intent === 'no') return notYet('voice');
      if (u.intent === 'forgot') return forgot('voice');
      if (u.intent === 'help') return help('voice');
      if (u.intent === 'pain') return help('voice', `ব্যথা বা অসুস্থতার কথা বলেছেন: “${u.text}”`);
      // Anything else ("other", "cancel"): not understood. Never blame; ask again.
      if (p === 'buttons') { if (latest.current.micOn) micListen('reminder'); return; }
      noAnswer();
    });
  }

  const emergency = () => startEmergency('button');

  if (offline) return <Offline elder={elder} />;
  if (state.showConsentFor === elder.id) return <Consent elder={elder} />;
  if (phase === 'countdown') return <Countdown n={count} onCancel={() => cancelEmergency('button')} />;
  if (phase === 'sent') return <Sent elder={elder} alert={emergencyAlert} toast={toast} onBack={() => { clearAll(); go('idle'); }} />;
  if (phase === 'idle') return <Idle elder={elder} now={now} meds={meds} doses={state.doses} onEmergency={emergency} onPrn={takePrn} />;

  const listening = ['listen', 'readback', 'logged', 'buttons'].includes(phase);
  const showButtons = phase === 'buttons';
  const compact = showButtons || active.length > 1;

  return (
    <div className="scr elder">
      <div className="row" style={{ flexShrink: 0 }}>
        <Avatar person={elder} size={48} />
        <div className="t-name grow">{elder.name}</div>
        <span className="pill" style={phase === 'done' ? { background: '#D9F0E3', color: '#17633F' } : undefined}>
          {phase === 'speak' && <><Icon name="speaker" size={17} /> ছোটু বলছে</>}
          {listening && <><Icon name="mic" size={17} /> শুনছি</>}
          {phase === 'done' && <><Icon name="check" size={17} /> হয়ে গেছে</>}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <div className={'face' + (listening ? ' listening' : '')} style={{ width: 112, height: 112 }}>
          <div className="ring" style={{ inset: -16 }} />
          <div className="ring" style={{ inset: -32, animationDelay: '.6s' }} />
          <img className="av" src="/img/logo.png" alt="ছোটু" width="112" height="112" style={{ width: 112, height: 112 }} />
          <div className="face-badge"><Icon name={listening ? 'mic' : phase === 'done' ? 'check' : 'speaker'} size={19} color="#fff" /></div>
        </div>
        <div ref={waveRef} className={'wave' + (phase === 'speak' ? ' on' : '') + (micOn && listening ? ' mic' : '')} aria-hidden="true">
          {Array.from({ length: 17 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 6) * 0.11}s`, '--k': [0.5, 0.9, 0.7, 0.3, 1, 0.6][i % 6] }} />)}
        </div>
      </div>

      <div className="card caption" aria-live="polite">
        <div className="cap-text">{caption}</div>
        {listening && phase !== 'logged' && (
          <div className="heard">{heard ? `“${heard}”` : 'শুনছি…'}</div>
        )}
        {phase === 'logged' && (
          <>
            {heard && <div className="heard">“{heard}”</div>}
            {undoOn && <div className="undo-bar"><span /></div>}
          </>
        )}
      </div>

      <div className="card" style={{ padding: compact ? 10 : 14, gap: 10 }}>
        {active.map((d) => (
          <div key={d.key} className="row" style={{ gap: 14 }}>
            <MedThumb src={medImage(d.regimen, d.med)} alt={d.med.name} size={compact ? 64 : 112} />
            <div>
              <div style={{ fontSize: compact ? 21 : 26, fontWeight: 700, lineHeight: 1.3 }}>{d.med.short}</div>
              <div className="t-sub" style={{ fontSize: 17 }}>{doseText(d.regimen.amount, d.med.form)}</div>
              {!compact && <span className="pill" style={{ marginTop: 6 }}>{MEAL_TIMING[d.regimen.meal].bn}</span>}
            </div>
          </div>
        ))}
      </div>

      {showButtons && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="grid2">
            <button type="button" className="answer yes" onClick={() => { clearAll(); took('button'); }}>
              <Icon name="check" size={26} /> হ্যাঁ, খেয়েছি
            </button>
            <button type="button" className="answer" onClick={() => { clearAll(); notYet('button'); }}>
              না, এখনও না
            </button>
          </div>
          <button type="button" className="answer small" onClick={() => {
            clearAll(); go('speak'); say(`reminder_${active[0].slot}`, () => { go('buttons'); });
          }}>
            <Icon name="speaker" size={20} /> আবার শুনুন
          </button>
        </div>
      )}

      <button type="button" className="big-btn sos" style={{ marginTop: 'auto' }} onClick={emergency}>
        <Icon name="alert" size={27} />
        জরুরি অবস্থা
      </button>
    </div>
  );
}

/** Consent: the elder chooses what the family can see. Help and emergency alerts always go through. */
function Consent({ elder }) {
  const { state, dispatch } = useStore();
  const c = state.consent[elder.id];
  useEffect(() => speak('consent_intro', elder), []); // eslint-disable-line react-hooks/exhaustive-deps
  const ITEMS = [
    { key: 'medication', title: 'ওষুধ খাওয়ার খবর', sub: 'খেয়েছেন কি না, পরিবার দেখবে' },
    { key: 'wellbeing', title: 'শরীর কেমন আছে', sub: 'দৈনিক কথার খবর পরিবার দেখবে' },
    { key: 'location', title: 'আমি কোথায় আছি', sub: 'ফোনের অবস্থান পরিবার দেখবে' },
  ];
  return (
    <div className="scr elder" style={{ gap: 12 }}>
      <div className="row" style={{ flexShrink: 0 }}>
        <img className="av" src="/img/logo.png" alt="ছোটু" width="56" height="56" style={{ width: 56, height: 56 }} />
        <div className="t-name grow">আপনার সম্মতি</div>
        <Avatar person={elder} size={48} />
      </div>
      <div className="card caption" style={{ minHeight: 0 }}>
        <div className="cap-text" style={{ fontSize: 23 }}>{lineText('consent_intro', elder)}</div>
      </div>
      {ITEMS.map((it) => (
        <button key={it.key} type="button" className="consent-row" role="switch" aria-checked={c[it.key]}
          onClick={() => dispatch({ type: 'consent/set', elderId: elder.id, key: it.key, value: !c[it.key] })}>
          <span className="grow" style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 22, fontWeight: 700 }}>{it.title}</span>
            <span className="t-sub" style={{ display: 'block', fontSize: 16 }}>{it.sub}</span>
          </span>
          <span className="consent-state" data-on={c[it.key]}>{c[it.key] ? 'হ্যাঁ' : 'না'}</span>
        </button>
      ))}
      <div className="note-box" style={{ fontSize: 17 }}>
        সাহায্য চাইলে এবং জরুরি বার্তা সবসময় আপনার পরিবারের কাছে যাবে, এগুলো বন্ধ করা যায় না।
      </div>
      <button type="button" className="answer yes" style={{ marginTop: 'auto', minHeight: 72 }} onClick={() => { stopSpeaking(); dispatch({ type: 'consent/agree', elderId: elder.id }); }}>
        <Icon name="check" size={26} /> ঠিক আছে, রাজি
      </button>
    </div>
  );
}

/** 5-second emergency countdown with a very large Cancel (from the prototype). */
function Countdown({ n, onCancel }) {
  return (
    <div className="scr" style={{ background: '#8E1B16', color: '#fff' }}>
      <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
        <Icon name="alert" size={30} color="#fff" width={2.2} />
        <div style={{ fontSize: 24, fontWeight: 700 }}>জরুরি অবস্থা</div>
      </div>
      <div className="count-ring" aria-live="assertive">{n > 0 ? toBn(n) : '০'}</div>
      <div style={{ fontSize: 30, fontWeight: 700, textAlign: 'center', marginTop: 12 }}>জরুরি বার্তা পাঠানো হচ্ছে</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: '#FFE3E0', textAlign: 'center', lineHeight: 1.5, padding: '0 8px' }}>
        আপনার পরিবারের সবাইকে জানানো হবে। ভুল হলে বলুন “বাতিল”, অথবা নিচে চাপুন।
      </div>
      <button type="button" className="cancel-big" onClick={onCancel}>
        <Icon name="x" size={43} /> বাতিল করুন
      </button>
    </div>
  );
}

/** After the countdown: calm message, who has been told, call buttons. */
function Sent({ elder, alert, toast, onBack }) {
  const { state } = useStore();
  const people = elder.alertOrder.map((id) => state.caregivers.find((c) => c.id === id)).filter(Boolean);
  const first = people[0];
  return (
    <div className="scr" style={{ background: '#8E1B16', color: '#fff', gap: 14 }}>
      <div className="row" style={{ marginTop: 8 }}>
        <Icon name="shield" size={30} color="#fff" width={2.2} />
        <div style={{ fontSize: 24, fontWeight: 700 }}>জরুরি বার্তা পাঠানো হয়েছে</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.45 }}>শান্ত থাকুন, {elder.name}। আপনার পরিবারের সবাইকে জানানো হয়েছে।</div>
      <div className="sent-card">
        {people.map((p, i) => (
          <div key={p.id}>
            {i > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,.25)', margin: '0 0 12px' }} />}
            <div className="row" style={{ gap: 12 }}>
              <Avatar person={p} size={54} />
              <div className="grow">
                <div style={{ fontSize: 22, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 16, color: '#FFE3E0' }}>{alert?.handledBy === p.id ? 'জানানো হয়েছে · আসছেন / ফোন করছেন' : 'জানানো হয়েছে'}</div>
              </div>
              <Icon name="check" size={26} color="#fff" width={2.6} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="sent-btn" onClick={() => toast('ডেমো: আসল অ্যাপে এখানে ৯৯৯-এ কল হবে')}>
        <Icon name="phone" size={26} /> ৯৯৯-এ ফোন করুন
      </button>
      {first && (
        <button type="button" className="sent-btn ghost" onClick={() => toast('ফোন করা হচ্ছে… (ডেমো, আসলে কল হয় না)')}>
          <Icon name="phone" size={24} /> {first.name}কে ফোন করুন
        </button>
      )}
      <button type="button" onClick={onBack} style={{ marginTop: 'auto', background: 'none', border: 0, color: '#FFE3E0', fontSize: 17, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
        মূল পাতায় ফিরুন
      </button>
    </div>
  );
}

const toBn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

/** Presenter toggle "phone unreachable": nothing reaches this phone. */
function Offline({ elder }) {
  return (
    <div className="scr elder" style={{ background: '#C9D3E0', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
      <Avatar person={elder} size={96} />
      <div style={{ fontSize: 30, fontWeight: 700, color: '#425A80' }}>{elder.gen} ফোন</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#425A80', lineHeight: 1.5 }}>সংযোগ নেই<br />(ফোন বন্ধ বা নেটওয়ার্কের বাইরে)</div>
      <div style={{ fontSize: 15, color: '#425A80' }}>ডেমো: প্যানেল থেকে আবার চালু করুন</div>
    </div>
  );
}

/** Resting screen: greeting, Chotu's face, next medicine. */
function Idle({ elder, now, meds, doses, onEmergency, onPrn }) {
  const group = nextDoseGroup(elder, now, meds, doses);
  const next = group[0];
  const tomorrow = next && dayOf(next.at) > dayOf(now);
  const prn = elder.regimens.filter((r) => r.asNeeded && r.status === 'active');
  const compact = group.length > 1 || prn.length > 0;
  const face = compact ? 150 : 176;

  return (
    <div className="scr elder">
      <div className="row" style={{ flexShrink: 0 }}>
        <Avatar person={elder} size={48} />
        <div className="t-name grow">{elder.name}</div>
        <span className="pill white">{bnTime(now)}</span>
      </div>

      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#0B2F8A', lineHeight: 1.4 }}>
          {bnGreeting(now)}, {elder.name}
        </div>
        <div style={{ fontSize: 19, fontWeight: 500, color: '#425A80', lineHeight: 1.4 }}>
          আমি ছোটু। ওষুধের সময় আমি নিজেই ডাকব।
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: compact ? 30 : 52, marginBottom: compact ? 20 : 40 }}>
        <div className="face" style={{ width: face, height: face }}>
          <div className="ring" style={{ inset: -24 }} />
          <div className="ring" style={{ inset: -48, animationDelay: '.6s' }} />
          <img className="av" src="/img/logo.png" alt="ছোটু" width={face} height={face} style={{ width: face, height: face }} />
        </div>
      </div>

      {prn.map((r) => (
        <div key={r.id} className="card" style={{ padding: 10, marginTop: 'auto' }}>
          <div className="row" style={{ gap: 12 }}>
            <MedThumb src={medImage(r, meds[r.medId])} alt={meds[r.medId]?.name} size={56} />
            <div className="grow">
              <div className="t-label">প্রয়োজনের ওষুধ</div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{meds[r.medId]?.short}</div>
            </div>
            <button type="button" className="answer" style={{ minHeight: 56, fontSize: 18 }} onClick={() => onPrn(r)}>এখন খেলাম</button>
          </div>
        </div>
      ))}

      {next && (
        <div className="card" style={prn.length ? undefined : { marginTop: 'auto' }}>
          <div className="row">
            <div className="t-label grow" style={{ fontSize: 16 }}>পরের ওষুধ{tomorrow ? ' · আগামীকাল' : ''}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#0B2F8A' }}>{bnTime(next.at)}</div>
          </div>
          {group.map((g) => (
            <div key={g.key} className="row" style={{ gap: 14 }}>
              <MedThumb src={medImage(g.regimen, g.med)} alt={g.med.name} size={compact ? 64 : 84} />
              <div>
                <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.35 }}>{g.med.short}</div>
                <div className="t-sub">{doseText(g.regimen.amount, g.med.form)}, {MEAL_TIMING[g.regimen.meal].bn}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="big-btn sos" style={next ? undefined : { marginTop: 'auto' }} onClick={onEmergency}>
        <Icon name="alert" size={27} />
        জরুরি অবস্থা
      </button>
    </div>
  );
}
