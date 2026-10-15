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
import { STATUS_LOOK, headline, todayDoses } from './status.js';
import { SLOTS } from '../lib/schedule.js';
import { AlertBanner, AlertDetail, AlertsList, unseenAlerts } from './Alerts.jsx';
import Settings from './Settings.jsx';
import Summary from './Summary.jsx';

function untilText(mins) {
  if (mins <= 0) return 'এখন সময়';
  if (mins < 60) return `${bn(mins)} মিনিট পরে`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${bn(h)} ঘণ্টা ${bn(m)} মিনিট পরে` : `${bn(h)} ঘণ্টা পরে`;
}

const SCREEN_LABEL = { home: 'home', add: 'add medicine', verify: 'verify', day: 'elder’s day', alerts: 'alerts', alert: 'alert', settings: 'settings', summary: 'daily summary' };

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
  const { dispatch } = useStore();
  const openAlert = (id) => { dispatch({ type: 'alert/seen', id, by: me.id }); setScreen({ name: 'alert', id }); };

  let view;
  if (screen.name === 'add') view = <AddMedicine elderId={screen.elderId} onDone={home} toast={toast} />;
  else if (screen.name === 'day') view = <ElderDay elderId={screen.elderId} onBack={home} toast={toast} go={setScreen} openAlert={openAlert} />;
  else if (screen.name === 'verify') view = <Verify elderId={screen.elderId} regimenId={screen.regimenId} onDone={home} toast={toast} />;
  else if (screen.name === 'summary') view = <Summary onBack={home} toast={toast} />;
  else if (screen.name === 'settings') view = <Settings onBack={home} />;
  else if (screen.name === 'alerts') view = <AlertsList onOpen={openAlert} onBack={home} />;
  else if (screen.name === 'alert') view = <AlertDetail id={screen.id} onBack={() => setScreen({ name: 'alerts' })} toast={toast} />;
  else view = <Home toast={toast} go={setScreen} />;

  // A new alert for whoever holds this phone drops in as a banner (not while they are already reading it).
  const fresh = unseenAlerts(state, me.id).filter((a) => !(screen.name === 'alert' && screen.id === a.id));
  return (
    <>
      {view}
      {fresh[0] && <AlertBanner key={fresh[0].id} alert={fresh[0]} onOpen={() => openAlert(fresh[0].id)} />}
    </>
  );
}

const STATUS_ICON_COLOUR = { '': '#0B2F8A', ok: '#17633F', warn: '#7A4A00', bad: '#8E1B16' };

function ElderCard({ elder, now, meds, doses, alerts, caregivers, consent, checkins, onOpen }) {
  const group = nextDoseGroup(elder, now, meds, doses);
  const next = group[0];
  const tomorrow = next && dayOf(next.at) > dayOf(now);
  const shares = consent?.medication !== false; // the elder agreed to share medicine status
  const ci = consent?.wellbeing !== false ? checkins?.[`${elder.id}@${dayOf(now)}`] : null; // today's afternoon check-in
  const head = headline(elder, now, meds, doses, alerts, caregivers, shares, ci); // an alert, or what just happened
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
      {shares && <DayPills elder={elder} now={now} meds={meds} doses={doses} />}
    </button>
  );
}

/** Today at a glance: one small pill per dose time, coloured by what happened. */
function DayPills({ elder, now, meds, doses }) {
  const today = todayDoses(elder, now, meds, doses);
  if (!today.length) return null;
  // One pill per time of day; the worst status wins if two medicines share a time.
  const rank = { missed: 6, help: 5, unsure: 4, due: 3, snoozed: 2, upcoming: 1, taken: 0 };
  const byTime = new Map();
  for (const d of today) {
    const cur = byTime.get(d.at);
    if (!cur || rank[d.status] > rank[cur.status]) byTime.set(d.at, d);
  }
  return (
    <div className="day-pills" aria-label="আজকের ওষুধ">
      {[...byTime.values()].map((d) => (
        <span key={d.at} className={'dp ' + (d.status === 'upcoming' ? 'up' : STATUS_LOOK[d.status].cls)}>
          {d.status === 'taken' && <Icon name="check" size={13} width={3} />}{SLOTS[d.slot].bn}
        </span>
      ))}
    </div>
  );
}

// `stage` = the build stage that brings this tab to life.
const TABS = [
  { icon: 'home', label: 'হোম' },
  { icon: 'bell', label: 'সতর্কতা', go: 'alerts' },
  { icon: 'doc', label: 'সারাংশ', go: 'summary' },
  { icon: 'sliders', label: 'সেটিংস', go: 'settings' },
];

function Home({ toast, go }) {
  const { state } = useStore();
  const me = useCaregiver();
  const meds = useMeds();
  const later = (stage) => toast(`এটি Stage ${stage}-এ তৈরি হবে`);
  const pending = state.elders.flatMap((e) => e.regimens.filter((r) => r.status === 'pending').map((r) => ({ e, r })));
  const nameOf = (id) => state.caregivers.find((c) => c.id === id)?.name;
  const unseen = unseenAlerts(state, me.id).length;

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
          <ElderCard key={e.id} elder={e} now={state.clock} meds={meds} doses={state.doses} alerts={state.alerts} caregivers={state.caregivers} consent={state.consent?.[e.id]} checkins={state.checkins} onOpen={() => go({ name: 'day', elderId: e.id })} />
        ))}

        <button type="button" className="add-btn" onClick={() => go({ name: 'add' })}>
          <Icon name="plus" size={20} />
          ওষুধ যোগ করুন
        </button>
      </div>

      <nav className="nav" aria-label="Caregiver menu" style={{ marginTop: 0 }}>
        {TABS.map((t, i) => (
          <button key={t.icon} type="button" aria-current={i === 0 ? 'page' : undefined}
            onClick={() => (t.go ? go({ name: t.go }) : t.stage && later(t.stage))}>
            <span className="ic" style={{ position: 'relative' }}>
              <Icon name={t.icon} size={22} width={2.2} />
              {t.go === 'alerts' && unseen > 0 && <span className="dot" />}
            </span>
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
