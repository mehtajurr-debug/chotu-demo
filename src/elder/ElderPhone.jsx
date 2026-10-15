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
import { MEAL_TIMING, doseText, dueGroup, lastTaken, medImage, nextDoseGroup } from '../lib/schedule.js';
import { lineText, onElderSays, speak } from '../lib/voice.js';
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

  const [phase, setPhase] = useState('idle'); // idle | speak | listen | readback | logged | buttons | done
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

  // A dose is due and Chotu is free: start the reminder.
  useEffect(() => {
    if (phase === 'idle' && due.length) startReminder(due);
  }, [dueKey, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function startReminder(group) {
    clearAll();
    tries.current = 0;
    latest.current.active = group;
    setActive(group);
    setHeard('');
    const asked = group.some((d) => latest.current.state.doses[d.key]?.status === 'snoozed');
    go('speak');
    say(asked ? 'repeat_1' : `reminder_${group[0].slot}`, listen);
  }

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
    if (context === 'undo') return; // no "না" in time: the dose gets logged as planned
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
    record('unsure', how, `“মনে নেই” বলেছেন। ছোটু অপেক্ষা করতে বলেছে, ওষুধ খেতে বলেনি। ${last}`);
    go('speak');
    say('ack_not_sure', () => finish(4000));
  }

  function help(how, what = '“সাহায্য চাই” বলেছেন') {
    record('help', how, `ওষুধের সময় ${what} (${names()})`);
    go('speak');
    say('ack_help', () => finish(4000));
  }

  // ----- what the elder says: from the live microphone, or simulated from the presenter panel -----
  useEffect(() => onElderSays(handleAnswer));

  function handleAnswer(u) {
    const p = phaseRef.current;
    if (!['listen', 'readback', 'logged', 'buttons'].includes(p)) return;

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
      if (u.intent === 'emergency') return help('voice', `জরুরি কথা বলেছেন: “${u.text}”`); // Stage 6: countdown
      // Anything else ("other", "cancel"): not understood. Never blame; ask again.
      if (p === 'buttons') { if (latest.current.micOn) micListen('reminder'); return; }
      noAnswer();
    });
  }

  const emergency = () => toast('জরুরি বোতাম Stage 6-এ চালু হবে');

  if (phase === 'idle') return <Idle elder={elder} now={now} meds={meds} doses={state.doses} onEmergency={emergency} />;

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

/** Resting screen: greeting, Chotu's face, next medicine. */
function Idle({ elder, now, meds, doses, onEmergency }) {
  const group = nextDoseGroup(elder, now, meds, doses);
  const next = group[0];
  const tomorrow = next && dayOf(next.at) > dayOf(now);
  const compact = group.length > 1;
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

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: compact ? 40 : 52, marginBottom: compact ? 30 : 40 }}>
        <div className="face" style={{ width: face, height: face }}>
          <div className="ring" style={{ inset: -24 }} />
          <div className="ring" style={{ inset: -48, animationDelay: '.6s' }} />
          <img className="av" src="/img/logo.png" alt="ছোটু" width={face} height={face} style={{ width: face, height: face }} />
        </div>
      </div>

      {next && (
        <div className="card" style={{ marginTop: 'auto' }}>
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
