// Alerts on the caregiver phone: the banner that drops in, the list, and one alert with "আমি দেখছি".
// Every alert shows the elder's photo and name.
import { useCaregiver, useMeds, useStore } from '../state/store.jsx';
import { ESCALATE_EVERY, recipients } from '../state/escalation.js';
import { bnTime, bnWhen } from '../lib/time.js';
import { medImage } from '../lib/schedule.js';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import { ScreenHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { CALM_ALERTS, alertLabel } from './status.js';
import { stockText } from '../lib/stock.js';

/** Alerts this caregiver has been told about (not yet closed come first). */
export function myAlerts(state, meId) {
  return state.alerts
    .filter((a) => recipients(state, a).includes(meId))
    .sort((a, b) => (!!a.resolvedAt - !!b.resolvedAt) || b.createdAt - a.createdAt);
}

/** Open alerts this caregiver has not looked at yet (for the banner and the red dot). */
export function unseenAlerts(state, meId) {
  return myAlerts(state, meId).filter((a) => !a.resolvedAt && !a.handledBy && !a.seenBy.includes(meId));
}

export function AlertBanner({ alert, onOpen }) {
  const { state } = useStore();
  const elder = state.elders.find((e) => e.id === alert.elderId);
  return (
    <button type="button" className={'banner' + (CALM_ALERTS.has(alert.kind) ? '' : ' red')} onClick={onOpen}>
      <Avatar person={elder} size={44} />
      <span style={{ flex: 1, textAlign: 'left' }}>
        <b style={{ display: 'block', fontSize: 16 }}>ছোটু · {elder.name}</b>
        <span style={{ fontSize: 15 }}>{alertLabel(alert)}</span>
      </span>
      <Icon name="chevron" size={22} />
    </button>
  );
}

export function AlertsList({ onOpen, onBack }) {
  const { state } = useStore();
  const me = useCaregiver();
  const list = myAlerts(state, me.id);
  return (
    <div className="scr care">
      <ScreenHeader title="সতর্কতা" onBack={onBack} />
      <div className="body" style={{ gap: 10 }}>
        {list.length === 0 && <div className="card"><div className="t-sub">এখন কোনো সতর্কতা নেই</div></div>}
        {list.map((a) => {
          const elder = state.elders.find((e) => e.id === a.elderId);
          const who = state.caregivers.find((c) => c.id === a.handledBy)?.name;
          const look = a.resolvedAt ? 'ok' : a.handledBy ? 'warn' : 'bad';
          return (
            <button key={a.id} type="button" className="card tap" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, opacity: a.resolvedAt ? 0.7 : 1 }}
              onClick={() => onOpen(a.id)}>
              <Avatar person={elder} size={52} />
              <span className="grow">
                <span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{elder.name} · {alertLabel(a)}</span>
                <span className={'status ' + look} style={{ display: 'inline-flex', padding: '3px 10px', fontSize: 14, marginTop: 4 }}>
                  {a.resolvedAt ? 'মিটে গেছে' : a.handledBy ? `${who} দেখছেন` : 'কেউ এখনও দেখেননি'} · {bnTime(a.createdAt)}
                </span>
              </span>
              <Icon name="chevron" size={22} color="#425A80" width={2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AlertDetail({ id, onBack, toast }) {
  const { state, dispatch } = useStore();
  const me = useCaregiver();
  const meds = useMeds();
  const a = state.alerts.find((x) => x.id === id);
  if (!a) return null;
  const elder = state.elders.find((e) => e.id === a.elderId);
  if (a.kind === 'emergency') return <EmergencyDetail a={a} elder={elder} onBack={onBack} toast={toast} />;
  const nameOf = (cid) => state.caregivers.find((c) => c.id === cid)?.name;
  const told = recipients(state, a);
  const mine = a.handledBy === me.id;
  const red = !a.handledBy && !a.resolvedAt && !CALM_ALERTS.has(a.kind);

  // The medicines this alert is about (dose keys look like "regimenId@day@slot").
  const items = a.doseKeys.map((k) => {
    const r = elder.regimens.find((x) => x.id === k.split('@')[0]);
    return r && { key: k, r, med: meds[r.medId] };
  }).filter(Boolean);

  // Who has been told, and who is next if nobody acts.
  const ladder = elder.alertOrder.map((cid, i) => {
    const at = a.createdAt + i * ESCALATE_EVERY;
    return { cid, at, done: told.includes(cid) };
  });

  return (
    <div className="scr care">
      <ScreenHeader title="সতর্কতা" onBack={onBack} />
      <div className="body" style={{ gap: 12 }}>
        <div className="card" style={{ background: red ? '#F9DEDC' : a.resolvedAt ? '#D9F0E3' : '#FCEBC8', borderColor: 'transparent', gap: 10 }}>
          <div className="row" style={{ gap: 14 }}>
            <Avatar person={elder} size={72} />
            <div className="grow">
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{elder.name}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: red ? '#8E1B16' : '#7A4A00' }}>{alertLabel(a)}</div>
              <div className="t-sub" style={{ fontSize: 14.5 }}>{bnWhen(a.createdAt, state.clock)}</div>
            </div>
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.5 }}>{a.text}</div>
        </div>

        {items.length > 0 && (
          <div className="card" style={{ gap: 8 }}>
            {items.map(({ key, r, med }) => (
              <div key={key} className="row" style={{ gap: 10 }}>
                <MedThumb src={medImage(r, med)} alt="" size={48} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{med.short}</div>
                  {a.kind === 'refill' && <div className="t-sub" style={{ fontSize: 15 }}>{stockText(r) || 'হিসাব রাখা হয়নি'}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#425A80' }}>কাকে জানানো হয়েছে</div>
          {!a.ladder && <div style={{ fontSize: 16 }}>{told.length > 1 ? `সবাইকে একসঙ্গে জানানো হয়েছে (${told.map(nameOf).join(', ')})` : `জানানো হয়েছে: ${nameOf(told[0])}`}</div>}
          {a.ladder && ladder.map(({ cid, at, done }) => (
            <div key={cid} className="row" style={{ gap: 8, fontSize: 16 }}>
              <Icon name={done ? 'check' : 'clock'} size={18} color={done ? '#17633F' : '#425A80'} />
              <span className="grow" style={{ fontWeight: done ? 700 : 500, color: done ? '#10213F' : '#425A80' }}>{nameOf(cid)}</span>
              <span className="t-sub" style={{ fontSize: 14.5 }}>
                {done ? `জানানো হয়েছে ${bnTime(at)}` : a.handledBy ? 'দরকার হয়নি' : `কেউ না দেখলে ${bnTime(at)}`}
              </span>
            </div>
          ))}
          {a.handledBy && (
            <div className="status warn" style={{ fontSize: 16 }}>
              <Icon name="check" size={18} /> {nameOf(a.handledBy)} দেখছেন ({bnTime(a.handledAt)}) · অন্যদের আর জানানো হবে না
            </div>
          )}
        </div>
      </div>

      <div className="foot">
        {a.kind === 'refill' && !a.resolvedAt && items.map(({ key, r, med }) => (
          <button key={key} type="button" className="btn-wide green" onClick={() => { dispatch({ type: 'stock/add', elderId: elder.id, regimenId: r.id, count: 30, by: me.id, medName: med.short }); toast(`${med.short}: ৩০টি যোগ হলো`); onBack(); }}>
            <Icon name="plus" size={22} /> কিনেছি, ৩০টি যোগ করুন
          </button>
        ))}
        {!a.handledBy && !a.resolvedAt && a.kind !== 'refill' && (
          <button type="button" className="btn-wide green" onClick={() => { dispatch({ type: 'alert/handle', id: a.id, by: me.id }); toast('অন্যদের জানানো হলো: আপনি দেখছেন'); }}>
            <Icon name="check" size={22} /> আমি দেখছি
          </button>
        )}
        {mine && !a.resolvedAt && (
          <button type="button" className="btn-wide" onClick={() => { dispatch({ type: 'alert/resolve', id: a.id, by: me.id }); onBack(); }}>
            সমাধান হয়েছে
          </button>
        )}
        <button type="button" className="btn-wide ghost" onClick={() => toast('ফোন করা হচ্ছে… (ডেমো, আসলে কল হয় না)')}>
          <Icon name="phone" size={21} /> {elder.name}কে ফোন করুন
        </button>
      </div>
    </div>
  );
}

/** Emergency: a full red screen with the elder's photo and name, Call 999, call the elder, and "আমি দেখছি". */
function EmergencyDetail({ a, elder, onBack, toast }) {
  const { state, dispatch } = useStore();
  const me = useCaregiver();
  const told = recipients(state, a);
  const nameOf = (cid) => state.caregivers.find((c) => c.id === cid)?.name;
  const mine = a.handledBy === me.id;
  return (
    <div className="scr" style={{ background: '#8E1B16', color: '#fff' }}>
      <div className="row" style={{ flexShrink: 0 }}>
        <button type="button" className="icon-btn" aria-label="ফিরে যান" onClick={onBack}>
          <Icon name="back" size={28} color="#fff" />
        </button>
        <Icon name="alert" size={26} color="#fff" />
        <div className="grow" style={{ fontSize: 24, fontWeight: 700 }}>জরুরি বার্তা</div>
      </div>
      <div className="body" style={{ gap: 14, alignItems: 'center', textAlign: 'center' }}>
        <img className="av" src={elder.photo} alt="" width="120" height="120" style={{ width: 120, height: 120, border: '4px solid #fff', marginTop: 8 }} />
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.3 }}>{a.text}</div>
        <div style={{ fontSize: 17, color: '#FFE3E0' }}>{bnWhen(a.createdAt, state.clock)}</div>
        <div className="sent-card" style={{ width: '100%', textAlign: 'left', fontSize: 16.5 }}>
          পরিবারের সবাইকে একসঙ্গে জানানো হয়েছে ({told.map(nameOf).join(', ')})।
          {a.handledBy && <b style={{ display: 'block', marginTop: 6 }}>{nameOf(a.handledBy)} দেখছেন ({bnTime(a.handledAt)})</b>}
        </div>
      </div>
      <div className="foot">
        <button type="button" className="sent-btn" onClick={() => toast('ডেমো: আসল অ্যাপে এখানে ৯৯৯-এ কল হবে')}>
          <Icon name="phone" size={26} /> ৯৯৯-এ ফোন করুন
        </button>
        <button type="button" className="sent-btn ghost" onClick={() => toast('ফোন করা হচ্ছে… (ডেমো, আসলে কল হয় না)')}>
          <Icon name="phone" size={24} /> {elder.name}কে ফোন করুন
        </button>
        {!a.handledBy && !a.resolvedAt && (
          <button type="button" className="sent-btn ghost" onClick={() => { dispatch({ type: 'alert/handle', id: a.id, by: me.id }); toast('অন্যদের জানানো হলো: আপনি দেখছেন'); }}>
            <Icon name="check" size={24} /> আমি দেখছি
          </button>
        )}
        {mine && !a.resolvedAt && (
          <button type="button" className="sent-btn ghost" onClick={() => { dispatch({ type: 'alert/resolve', id: a.id, by: me.id }); onBack(); }}>
            সমাধান হয়েছে
          </button>
        )}
      </div>
    </div>
  );
}
