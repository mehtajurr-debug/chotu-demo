// Elder phone, Stage 1: the resting screen. One stage: Chotu's face on top, caption in the middle,
// next medicine below, emergency button always visible.
import { useElder, useStore } from '../state/store.jsx';
import { bnGreeting, bnTime, dayOf } from '../lib/time.js';
import { MEAL_TIMING, nextDose } from '../lib/schedule.js';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import Icon from '../components/Icon.jsx';

export default function ElderPhone({ toast }) {
  const { state } = useStore();
  const elder = useElder(state.elderOnPhone);
  const now = state.clock;
  const next = nextDose(elder, now);
  const tomorrow = next && dayOf(next.at) > dayOf(now);

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

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 52, marginBottom: 40 }}>
        <div className="face" style={{ width: 176, height: 176 }}>
          <div className="ring" style={{ inset: -28 }} />
          <div className="ring" style={{ inset: -56, animationDelay: '.6s' }} />
          <img className="av" src="/img/logo.png" alt="ছোটু" width="176" height="176" style={{ width: 176, height: 176 }} />
        </div>
      </div>

      {next && (
        <div className="card" style={{ marginTop: 'auto' }}>
          <div className="row" style={{ gap: 14 }}>
            <MedThumb med={next.med} size={84} />
            <div>
              <div className="t-label">পরের ওষুধ{tomorrow ? ' · আগামীকাল' : ''}</div>
              <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.35 }}>{next.med.short}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#0B2F8A' }}>{bnTime(next.at)}</div>
              <div className="t-sub">{MEAL_TIMING[next.regimen.meal].bn}</div>
            </div>
          </div>
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
