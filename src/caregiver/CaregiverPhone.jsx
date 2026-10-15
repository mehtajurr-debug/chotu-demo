// Caregiver phone, Stage 1: home with one card per elder and a one-line status.
import { useStore } from '../state/store.jsx';
import { bn, bnGreeting, bnTime, dayOf } from '../lib/time.js';
import { nextDose } from '../lib/schedule.js';
import { Avatar } from '../components/Phone.jsx';
import Icon from '../components/Icon.jsx';

function untilText(mins) {
  if (mins <= 0) return 'এখন সময়';
  if (mins < 60) return `${bn(mins)} মিনিট পরে`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${bn(h)} ঘণ্টা ${bn(m)} মিনিট পরে` : `${bn(h)} ঘণ্টা পরে`;
}

function ElderCard({ elder, now, onOpen }) {
  const next = nextDose(elder, now);
  const tomorrow = next && dayOf(next.at) > dayOf(now);
  return (
    <button type="button" className="card tap" style={{ padding: 16, gap: 14 }} onClick={onOpen}>
      <div className="row" style={{ gap: 14 }}>
        <Avatar person={elder} size={64} />
        <div className="grow">
          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.4 }}>{elder.name}</div>
          <div className="t-sub">
            {next ? `পরের ওষুধ: ${tomorrow ? 'আগামীকাল ' : ''}${bnTime(next.at)}` : 'আজ আর কোনো ওষুধ নেই'}
          </div>
        </div>
        <Icon name="chevron" size={24} color="#425A80" width={2} />
      </div>
      {next && (
        <div className="status">
          <Icon name="clock" size={22} color="#0B2F8A" width={2.6} />
          <span>{next.med.short} · {untilText(next.at - now)}</span>
        </div>
      )}
    </button>
  );
}

// `stage` = the build stage that brings this tab to life.
const TABS = [
  { icon: 'home', label: 'হোম' },
  { icon: 'bell', label: 'সতর্কতা', stage: 4 },
  { icon: 'doc', label: 'সারাংশ', stage: 7 },
  { icon: 'sliders', label: 'সেটিংস', stage: 7 },
];

export default function CaregiverPhone({ toast }) {
  const { state } = useStore();
  const me = state.caregivers.find((c) => c.primary);
  const later = (stage) => toast(`এটি Stage ${stage}-এ তৈরি হবে`);

  return (
    <div className="scr care">
      <div className="row" style={{ alignItems: 'flex-start', flexShrink: 0 }}>
        <div className="grow">
          <div className="t-label" style={{ fontSize: 15 }}>প্রধান যত্নকারী</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0B2F8A', lineHeight: 1.2 }}>
            {bnGreeting(state.clock)}, {me.name}
          </div>
        </div>
        <Avatar person={me} size={48} />
      </div>

      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
        <img className="av" src="/img/logo.png" alt="" width="28" height="28" style={{ width: 28, height: 28 }} />
        <div style={{ fontSize: 18, fontWeight: 600, color: '#425A80' }}>আপনার পরিবার</div>
      </div>

      {state.elders.map((e) => (
        <ElderCard key={e.id} elder={e} now={state.clock} onOpen={() => later(5)} />
      ))}

      <button type="button" className="add-btn" onClick={() => later(2)}>
        <Icon name="plus" size={20} />
        ওষুধ যোগ করুন
      </button>

      <nav className="nav" aria-label="Caregiver menu">
        {TABS.map((t, i) => (
          <button key={t.icon} type="button" aria-current={i === 0 ? 'page' : undefined}
            onClick={() => t.stage && later(t.stage)}>
            <span className="ic"><Icon name={t.icon} size={22} width={2.2} /></span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
