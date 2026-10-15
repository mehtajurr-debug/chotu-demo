// Elder phone, Stage 1: the resting screen. One stage: Chotu's face on top, caption in the middle,
// next medicine below, emergency button always visible.
import { useElder, useMeds, useStore } from '../state/store.jsx';
import { bnGreeting, bnTime, dayOf } from '../lib/time.js';
import { MEAL_TIMING, doseText, medImage, nextDoseGroup } from '../lib/schedule.js';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import Icon from '../components/Icon.jsx';

export default function ElderPhone({ toast }) {
  const { state } = useStore();
  const elder = useElder(state.elderOnPhone);
  const meds = useMeds();
  const now = state.clock;
  const group = nextDoseGroup(elder, now, meds); // every medicine due at the next dose time
  const next = group[0];
  const tomorrow = next && dayOf(next.at) > dayOf(now);
  const compact = group.length > 1; // make room for more than one medicine
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

      <button type="button" className="big-btn sos" style={next ? undefined : { marginTop: 'auto' }}
        onClick={() => toast('জরুরি বোতাম Stage 6-এ চালু হবে')}>
        <Icon name="alert" size={27} />
        জরুরি অবস্থা
      </button>
    </div>
  );
}
