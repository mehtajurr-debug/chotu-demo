// Caregiver phone: home (one card per elder), add-medicine flow, and verifying pending schedules.
import { useEffect, useState } from 'react';
import { useCaregiver, useMeds, useStore } from '../state/store.jsx';
import { bn, bnGreeting, bnTime, dayOf } from '../lib/time.js';
import { medImage, nextDoseGroup } from '../lib/schedule.js';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import { ScreenHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import AddMedicine from './AddMedicine.jsx';
import RegimenSummary from './RegimenSummary.jsx';
import ElderDay from './ElderDay.jsx';
import { headline } from './status.js';

function untilText(mins) {
  if (mins <= 0) return 'এখন সময়';
  if (mins < 60) return `${bn(mins)} মিনিট পরে`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${bn(h)} ঘণ্টা ${bn(m)} মিনিট পরে` : `${bn(h)} ঘণ্টা পরে`;
}

const SCREEN_LABEL = { home: 'home', add: 'add medicine', verify: 'verify', day: 'elder’s day' };

export default function CaregiverPhone({ toast, onScreen }) {
  const { state } = useStore();
  const me = useCaregiver();
  const [screen, setScreen] = useState({ name: 'home' });
  useEffect(() => onScreen?.(SCREEN_LABEL[screen.name]), [screen.name, onScreen]);
  // Switching who holds the phone starts them on the home screen.
  useEffect(() => setScreen({ name: 'home' }), [me.id]);
  // A Reset wipes pending schedules, so leave a verify screen that no longer has anything to show.
  useEffect(() => {
    if (screen.name === 'verify' && !state.elders.some((e) => e.regimens.some((r) => r.id === screen.regimenId))) setScreen({ name: 'home' });
  }, [state.elders, screen]);

  const home = () => setScreen({ name: 'home' });
  if (screen.name === 'add') return <AddMedicine elderId={screen.elderId} onDone={home} toast={toast} />;
  if (screen.name === 'day') return <ElderDay elderId={screen.elderId} onBack={home} toast={toast} />;
  if (screen.name === 'verify') return <Verify elderId={screen.elderId} regimenId={screen.regimenId} onDone={home} toast={toast} />;
  return <Home toast={toast} go={setScreen} />;
}

const STATUS_ICON_COLOUR = { '': '#0B2F8A', ok: '#17633F', warn: '#7A4A00', bad: '#8E1B16' };

function ElderCard({ elder, now, meds, doses, onOpen }) {
  const group = nextDoseGroup(elder, now, meds, doses);
  const next = group[0];
  const tomorrow = next && dayOf(next.at) > dayOf(now);
  const head = headline(elder, now, meds, doses); // what just happened, if anything
  return (
    <button type="button" className="card tap" style={{ padding: 16, gap: 14 }} onClick={onOpen}>
      <div className="row" style={{ gap: 14 }}>
        <Avatar person={elder} size={64} />
        <div className="grow">
          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.4 }}>{elder.name}</div>
          <div className="t-sub">
            {next ? `পরের ওষুধ: ${tomorrow ? 'আগামীকাল ' : ''}${bnTime(next.at)}` : 'কোনো নির্ধারিত ওষুধ নেই'}
          </div>
        </div>
        <Icon name="chevron" size={24} color="#425A80" width={2} />
      </div>
      {head ? (
        <div className={'status ' + head.cls}>
          <Icon name={head.icon} size={22} color={STATUS_ICON_COLOUR[head.cls]} width={2.6} />
          <span>{head.text}</span>
        </div>
      ) : next && (
        <div className="status">
          <Icon name="clock" size={22} color="#0B2F8A" width={2.6} />
          <span>{group.map((g) => g.med.short).join(' + ')} · {untilText(next.at - now)}</span>
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

function Home({ toast, go }) {
  const { state } = useStore();
  const me = useCaregiver();
  const meds = useMeds();
  const later = (stage) => toast(`এটি Stage ${stage}-এ তৈরি হবে`);
  const pending = state.elders.flatMap((e) => e.regimens.filter((r) => r.status === 'pending').map((r) => ({ e, r })));
  const nameOf = (id) => state.caregivers.find((c) => c.id === id)?.name;

  return (
    <div className="scr care">
      <div className="row" style={{ alignItems: 'flex-start', flexShrink: 0 }}>
        <div className="grow">
          <div className="t-label" style={{ fontSize: 15 }}>{me.primary ? 'প্রধান যত্নকারী' : 'যত্নকারী'}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0B2F8A', lineHeight: 1.2 }}>
            {bnGreeting(state.clock)}, {me.name}
          </div>
        </div>
        <Avatar person={me} size={48} />
      </div>

      <div className="body" style={{ gap: 12 }}>
        {pending.length > 0 && (
          <div className="card" style={{ background: '#FCEBC8', borderColor: '#F1C979', gap: 8, padding: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#7A4A00' }}>যাচাই বাকি ({bn(pending.length)})</div>
            {pending.map(({ e, r }) => {
              const m = meds[r.medId];
              return (
                <button key={r.id} type="button" className="result" style={{ borderColor: '#F1C979' }}
                  onClick={() => go({ name: 'verify', elderId: e.id, regimenId: r.id })}>
                  <MedThumb src={medImage(r, m)} alt="" size={48} />
                  <span className="grow">
                    <span style={{ display: 'block', fontSize: 17, fontWeight: 700 }}>{m?.short} · {e.name}</span>
                    <span className="t-sub" style={{ display: 'block', fontSize: 14 }}>{nameOf(r.addedBy)} যোগ করেছেন</span>
                  </span>
                  <Icon name="chevron" size={22} color="#7A4A00" width={2} />
                </button>
              );
            })}
          </div>
        )}

        <div className="row" style={{ gap: 8 }}>
          <img className="av" src="/img/logo.png" alt="" width="28" height="28" style={{ width: 28, height: 28 }} />
          <div style={{ fontSize: 18, fontWeight: 600, color: '#425A80' }}>আপনার পরিবার</div>
        </div>

        {state.elders.map((e) => (
          <ElderCard key={e.id} elder={e} now={state.clock} meds={meds} doses={state.doses} onOpen={() => go({ name: 'day', elderId: e.id })} />
        ))}

        <button type="button" className="add-btn" onClick={() => go({ name: 'add' })}>
          <Icon name="plus" size={20} />
          ওষুধ যোগ করুন
        </button>
      </div>

      <nav className="nav" aria-label="Caregiver menu" style={{ marginTop: 0 }}>
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

/** The primary caregiver reviews a schedule someone else added, then activates or discards it. */
function Verify({ elderId, regimenId, onDone, toast }) {
  const { state, dispatch } = useStore();
  const me = useCaregiver();
  const meds = useMeds();
  const elder = state.elders.find((e) => e.id === elderId);
  const regimen = elder?.regimens.find((r) => r.id === regimenId);
  if (!regimen) return null;
  const med = meds[regimen.medId];
  const primary = state.caregivers.find((c) => c.primary);
  const adder = state.caregivers.find((c) => c.id === regimen.addedBy);
  const medName = med.short || med.name;

  return (
    <div className="scr care">
      <ScreenHeader title="যাচাই করুন" onBack={onDone} />
      <div className="body">
        <div className="note-box warn">{adder?.name} এটি যোগ করেছেন। এখনও চালু হয়নি।</div>
        <RegimenSummary elder={elder} regimen={regimen} med={med} image={medImage(regimen, med)} />
        {!me.primary && <div className="note-box">শুধু প্রধান যত্নকারী {primary.name} এটি চালু করতে পারবেন।</div>}
      </div>
      {me.primary && (
        <div className="foot">
          <button type="button" className="btn-wide green" onClick={() => {
            dispatch({ type: 'regimen/activate', elderId, regimenId, by: me.id, medName });
            toast(`চালু হয়েছে। ${elder.gen} ফোনে মনে করানো শুরু হবে।`);
            onDone();
          }}>
            <Icon name="check" size={22} /> যাচাই করে চালু করুন
          </button>
          <button type="button" className="btn-wide ghost" onClick={() => {
            dispatch({ type: 'regimen/discard', elderId, regimenId });
            toast('বাতিল করা হয়েছে');
            onDone();
          }}>বাতিল করুন</button>
        </div>
      )}
    </div>
  );
}
