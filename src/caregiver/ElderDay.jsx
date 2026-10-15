// One elder's dashboard on the caregiver phone. Four tabs:
//   আজ: open alerts, today's doses, timeline · ওষুধ: medicine list · নোট: notes shared between caregivers ·
//   প্রোফাইল: meal and sleep times, alert order.
import { useState } from 'react';
import { useCaregiver, useMeds, useStore } from '../state/store.jsx';
import { bn, bnTime, bnWhen, dayOf, hhmmToMin } from '../lib/time.js';
import { MEAL_TIMING, durationText, medImage, prnCheck, slotTime } from '../lib/schedule.js';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import Icon from '../components/Icon.jsx';
import { STATUS_LOOK, alertLabel, todayDoses } from './status.js';
import { MealTimes } from './AddMedicine.jsx';
import RegimenSummary from './RegimenSummary.jsx';

const PILL_COLOURS = {
  '': { background: '#CFE3F8', color: '#0B2F8A' },
  ok: { background: '#D9F0E3', color: '#17633F' },
  warn: { background: '#FCEBC8', color: '#7A4A00' },
  bad: { background: '#F9DEDC', color: '#8E1B16' },
};

const TABS = [
  { id: 'today', label: 'আজ' },
  { id: 'meds', label: 'ওষুধ' },
  { id: 'notes', label: 'নোট' },
  { id: 'profile', label: 'প্রোফাইল' },
];

export default function ElderDay({ elderId, onBack, toast, go, openAlert }) {
  const { state } = useStore();
  const elder = state.elders.find((e) => e.id === elderId);
  const [tab, setTab] = useState('today');
  const [viewing, setViewing] = useState(null); // a medicine opened from the list

  if (viewing) return <MedicineView elder={elder} regimenId={viewing} onBack={() => setViewing(null)} />;

  return (
    <div className="scr care">
      <div className="row" style={{ flexShrink: 0 }}>
        <button type="button" className="icon-btn" aria-label="ফিরে যান" onClick={onBack}>
          <Icon name="back" size={28} color="#0B2F8A" />
        </button>
        <Avatar person={elder} size={52} />
        <div className="grow" style={{ fontSize: 26, fontWeight: 700, color: '#0B2F8A' }}>{elder.name}</div>
      </div>

      <div className="seg-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'notes' && <span className="count">{bn(state.notes.filter((n) => n.elderId === elderId).length)}</span>}
          </button>
        ))}
      </div>

      <div className="body" style={{ gap: 12 }}>
        {tab === 'today' && <Today elder={elder} openAlert={openAlert} />}
        {tab === 'meds' && <Medicines elder={elder} onOpen={setViewing} onAdd={() => go({ name: 'add', elderId })} />}
        {tab === 'notes' && <Notes elder={elder} toast={toast} />}
        {tab === 'profile' && <Profile elder={elder} />}
      </div>

      {tab === 'today' && (
        <button type="button" className="btn-wide ghost" style={{ flexShrink: 0 }} onClick={() => toast('ফোন করা হচ্ছে… (ডেমো, আসলে কল হয় না)')}>
          <Icon name="phone" size={21} /> {elder.name}কে ফোন করুন
        </button>
      )}
    </div>
  );
}

// ---------- আজ ----------
function Today({ elder, openAlert }) {
  const { state, dispatch } = useStore();
  const me = useCaregiver();
  const meds = useMeds();
  const shares = state.consent?.[elder.id]?.medication !== false; // the elder agreed to share medicine status
  const give = (d) => dispatch({ type: 'dose/given', elderId: elder.id, key: d.key, by: me.id, medName: d.med.short });
  const prn = elder.regimens.filter((r) => r.asNeeded && r.status === 'active')
    .map((r) => ({ r, m: meds[r.medId], chk: prnCheck(r, state.doses, state.clock) }));
  const now = state.clock;
  const today = todayDoses(elder, now, meds, state.doses);
  const done = today.filter((d) => d.status === 'taken' || d.status === 'conflict').length; // a conflict was still taken at least once
  const open = state.alerts.filter((a) => a.elderId === elder.id && !a.resolvedAt);
  // Newest first; for the same minute, the one written later comes first.
  const log = state.log.map((l, i) => ({ ...l, i })).filter((l) => l.elderId === elder.id).sort((a, b) => b.at - a.at || b.i - a.i);
  const who = (id) => (id === 'chotu' ? 'ছোটু' : state.caregivers.find((c) => c.id === id)?.name || state.elders.find((e) => e.id === id)?.name);

  return (
    <>
      {open.map((a) => (
        <button key={a.id} type="button" className="card tap" onClick={() => openAlert(a.id)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, background: a.handledBy ? '#FCEBC8' : '#F9DEDC', borderColor: 'transparent' }}>
          <Icon name="alert" size={22} color={a.handledBy ? '#7A4A00' : '#8E1B16'} />
          <span className="grow" style={{ fontSize: 16.5, fontWeight: 700 }}>
            {alertLabel(a)}
            <span className="t-sub" style={{ display: 'block', fontSize: 14 }}>
              {a.handledBy ? `${who(a.handledBy)} দেখছেন` : 'কেউ এখনও দেখেননি'} · {bnTime(a.createdAt)}
            </span>
          </span>
          <Icon name="chevron" size={20} color="#425A80" width={2} />
        </button>
      ))}

      {!shares && (
        <div className="note-box">{elder.name} ওষুধ খাওয়ার খবর শেয়ার করা বন্ধ রেখেছেন, তাই এখানে দেখানো হচ্ছে না। সাহায্য ও জরুরি বার্তা সবসময় আসবে।</div>
      )}

      {shares && (
      <div className="card">
        <div className="row">
          <div className="grow" style={{ fontSize: 16, fontWeight: 700, color: '#425A80' }}>আজকের ওষুধ</div>
          {today.length > 0 && <span className="pill" style={{ fontSize: 13.5 }}>{bn(done)}/{bn(today.length)} খেয়েছেন</span>}
        </div>
        {today.length === 0 && <div className="t-sub">আজ কোনো নির্ধারিত ওষুধ নেই</div>}
        {today.map((d) => {
          const look = STATUS_LOOK[d.status];
          const canGive = d.at <= now && d.status !== 'conflict';
          return (
            <div key={d.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="row" style={{ gap: 10 }}>
                <MedThumb src={medImage(d.regimen, d.med)} alt="" size={50} />
                <div className="grow">
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{d.med.short}</div>
                  <div className="t-sub" style={{ fontSize: 14.5 }}>
                    {bnTime(d.at)}{d.status === 'taken' ? ` · ${d.rec.how === 'caregiver' ? `${who(d.rec.by)} খাইয়েছেন` : 'খেয়েছেন'} ${bnTime(d.rec.at)}` : ''}
                  </div>
                </div>
                <span className="pill" style={{ ...PILL_COLOURS[look.cls], fontSize: 13.5 }}>
                  <Icon name={look.icon} size={15} /> {look.label}
                </span>
              </div>
              {d.status === 'conflict' && (
                <div className="note-box warn" style={{ fontSize: 14.5 }}>
                  একই ডোজ দুইবার লেখা হয়েছে, মিলিয়ে দেখুন:
                  {d.rec.conflict.map((c, i) => (
                    <span key={i} style={{ display: 'block', fontWeight: 700 }}>
                      {bn(i + 1)}. {who(c.by)}{c.how === 'caregiver' ? ' (খাইয়ে দিয়েছেন)' : c.how === 'voice' ? ' (কথায় বলেছেন)' : ' (বোতামে)'} · {bnTime(c.at)}
                    </span>
                  ))}
                </div>
              )}
              {canGive && (
                <button type="button" className="give-btn" onClick={() => give(d)}>
                  <Icon name="check" size={16} /> আমি খাইয়ে দিয়েছি, লিখে রাখুন
                </button>
              )}
            </div>
          );
        })}
      </div>
      )}

      {shares && prn.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 16, fontWeight: 700, color: '#425A80' }}>প্রয়োজনের ওষুধ</div>
          {prn.map(({ r, m, chk }) => (
            <div key={r.id} className="row" style={{ gap: 10 }}>
              <MedThumb src={medImage(r, m)} alt="" size={50} />
              <div className="grow">
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{m.short}</div>
                <div className="t-sub" style={{ fontSize: 14.5 }}>
                  আজ {bn(chk.today)} বার{chk.last != null ? ` · শেষ ${bnWhen(chk.last, now)}` : ''}
                </div>
                <div className="t-sub" style={{ fontSize: 13.5 }}>
                  নিয়ম: কমপক্ষে {bn(r.minGapHours)} ঘণ্টা পরপর, দিনে সর্বোচ্চ {bn(r.maxPerDay)} বার
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 700, color: '#425A80' }}>কী কী হয়েছে</div>
        {log.length === 0 && <div className="t-sub">এখনও কিছু হয়নি</div>}
        {log.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, fontSize: 15.5, lineHeight: 1.4 }}>
            <span style={{ color: '#425A80', fontWeight: 600, minWidth: 92, flexShrink: 0 }}>
              {dayOf(l.at) === dayOf(now) ? bnTime(l.at) : <>{bnWhen(l.at, now).split(' ')[0]}<br />{bnTime(l.at)}</>}
            </span>
            <span style={{ fontWeight: 500 }}>
              {l.by && l.by !== elder.id && <b>{who(l.by)}: </b>}
              {l.text}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- ওষুধ ----------
function scheduleLine(elder, r) {
  if (r.asNeeded) return `প্রয়োজন হলে · কমপক্ষে ${bn(r.minGapHours)} ঘণ্টা পরপর, দিনে সর্বোচ্চ ${bn(r.maxPerDay)} বার`;
  const times = r.slots.map((s) => bnTime(slotTime(elder, r, s))).join(', ');
  return `${times} · ${MEAL_TIMING[r.meal].bn}`;
}

function Medicines({ elder, onOpen, onAdd }) {
  const meds = useMeds();
  const list = elder.regimens.slice().sort((a, b) => (a.status === 'pending') - (b.status === 'pending'));
  return (
    <>
      {list.map((r) => {
        const m = meds[r.medId];
        return (
          <button key={r.id} type="button" className="card tap" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }} onClick={() => onOpen(r.id)}>
            <MedThumb src={medImage(r, m)} alt="" size={56} />
            <span className="grow">
              <span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{m?.name}</span>
              <span className="t-sub" style={{ display: 'block', fontSize: 14.5 }}>{scheduleLine(elder, r)}</span>
              <span className="t-sub" style={{ display: 'block', fontSize: 13.5 }}>{durationText(r.duration)}</span>
            </span>
            <span className="pill" style={{ fontSize: 13, ...(r.status === 'pending' ? PILL_COLOURS.warn : PILL_COLOURS.ok) }}>
              {r.status === 'pending' ? 'যাচাই বাকি' : 'চালু'}
            </span>
          </button>
        );
      })}
      <button type="button" className="add-btn" onClick={onAdd}>
        <Icon name="plus" size={20} /> {elder.gen} জন্য ওষুধ যোগ করুন
      </button>
      <div className="note-box">এখানে শুধু পরিবারের দেওয়া তথ্য দেখানো হয়। ছোটু কোনো চিকিৎসা পরামর্শ দেয় না।</div>
    </>
  );
}

function MedicineView({ elder, regimenId, onBack }) {
  const meds = useMeds();
  const r = elder.regimens.find((x) => x.id === regimenId);
  if (!r) return null;
  const m = meds[r.medId];
  return (
    <div className="scr care">
      <div className="row" style={{ flexShrink: 0 }}>
        <button type="button" className="icon-btn" aria-label="ফিরে যান" onClick={onBack}>
          <Icon name="back" size={28} color="#0B2F8A" />
        </button>
        <div className="grow" style={{ fontSize: 23, fontWeight: 700, color: '#0B2F8A' }}>{m?.short}</div>
        <span className="pill" style={r.status === 'pending' ? PILL_COLOURS.warn : PILL_COLOURS.ok}>{r.status === 'pending' ? 'যাচাই বাকি' : 'চালু'}</span>
      </div>
      <div className="body">
        <RegimenSummary elder={elder} regimen={r} med={m} image={medImage(r, m)} />
      </div>
    </div>
  );
}

// ---------- নোট ----------
function Notes({ elder, toast }) {
  const { state, dispatch } = useStore();
  const me = useCaregiver();
  const [text, setText] = useState('');
  const notes = state.notes.filter((n) => n.elderId === elder.id).slice().sort((a, b) => b.at - a.at);
  const person = (id) => state.caregivers.find((c) => c.id === id);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: 'note/add', elderId: elder.id, by: me.id, text: t });
    setText('');
    toast('নোট যোগ হয়েছে। পরিবারের সবাই দেখতে পাবেন।');
  };

  return (
    <>
      <div className="card" style={{ gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#425A80' }}>পরিবারের সবার জন্য নোট</div>
        <textarea className="note-in" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={`${elder.gen} বিষয়ে কিছু লিখুন…`} aria-label="নতুন নোট" />
        <button type="button" className="btn-wide" style={{ minHeight: 48, fontSize: 17 }} disabled={!text.trim()} onClick={add}>
          নোটে যোগ করুন
        </button>
      </div>
      {notes.map((n) => {
        const p = person(n.by);
        return (
          <div key={n.id} className="card" style={{ gap: 6, padding: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              {p && <Avatar person={p} size={30} />}
              <b className="grow" style={{ fontSize: 15.5 }}>{p?.name}{n.by === me.id ? ' (আপনি)' : ''}</b>
              <span className="t-sub" style={{ fontSize: 13.5 }}>{bnWhen(n.at, state.clock)}</span>
            </div>
            <div style={{ fontSize: 16.5, lineHeight: 1.5 }}>{n.text}</div>
          </div>
        );
      })}
    </>
  );
}

// ---------- প্রোফাইল ----------
function Profile({ elder }) {
  const { state, dispatch } = useStore();
  const me = useCaregiver();
  const [editMeals, setEditMeals] = useState(false);
  const person = (id) => state.caregivers.find((c) => c.id === id);
  const order = elder.alertOrder;
  const moveUp = (i) => {
    const next = order.slice();
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    dispatch({ type: 'elder/alertOrder', elderId: elder.id, order: next, by: me.id });
  };

  return (
    <>
      <MealTimes elder={elder} editing={editMeals} onEdit={() => setEditMeals((v) => !v)}
        onChange={(meals) => dispatch({ type: 'elder/meals', elderId: elder.id, meals })} />
      <div className="card" style={{ padding: 12, gap: 8 }}>
        <div className="kv" style={{ alignItems: 'center' }}>
          <span>ঘুমের সময়</span>
          {editMeals
            ? <input className="time-in" type="time" value={elder.sleep} step="300" aria-label="ঘুমের সময়"
                onChange={(e) => e.target.value && dispatch({ type: 'elder/sleep', elderId: elder.id, sleep: e.target.value })} />
            : <span>{bnTime(hhmmToMin(elder.sleep))}</span>}
        </div>
        <div className="t-sub" style={{ fontSize: 14 }}>খাবারের সময় থেকেই ওষুধের সময় ঠিক হয় (যেমন “সকালের খাবারের পরে”)।</div>
      </div>

      <div className="card" style={{ gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#425A80' }}>কোনো সমস্যা হলে কাকে আগে জানানো হবে</div>
        {order.map((cid, i) => {
          const p = person(cid);
          return (
            <div key={cid} className="row" style={{ gap: 10 }}>
              <span className="pill" style={{ minWidth: 36, justifyContent: 'center' }}>{bn(i + 1)}</span>
              {p && <Avatar person={p} size={36} />}
              <span className="grow" style={{ fontSize: 17, fontWeight: 700 }}>
                {p?.name} <span className="t-sub" style={{ fontSize: 14 }}>({p?.relation}{p?.primary ? ', প্রধান' : ''})</span>
              </span>
              {i > 0 && me.primary && (
                <button type="button" className="pill" style={{ border: 0, cursor: 'pointer', minHeight: 40 }} onClick={() => moveUp(i)}>উপরে</button>
              )}
            </div>
          );
        })}
        <div className="t-sub" style={{ fontSize: 14 }}>
          ১০ মিনিটে কেউ “আমি দেখছি” না বললে পরের জনকে জানানো হয়।{!me.primary && ' ক্রম শুধু প্রধান যত্নকারী বদলাতে পারবেন।'}
        </div>
      </div>
    </>
  );
}

