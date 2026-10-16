// Caregiver setup flow: choose elder -> find medicine -> confirm packet photo -> schedule -> summary -> verify and activate.
import { useMemo, useState } from 'react';
import { useCaregiver, useMeds, useStore } from '../state/store.jsx';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import { Label, PhotoButton, ScreenHeader, Stepper, Switch, Toggle } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import RegimenSummary from './RegimenSummary.jsx';
import { LIBRARY, MEAL_NAMES, SLOTS, customSlot, isCustom, medImage, slotTime } from '../lib/schedule.js';
import { bn, bnTime, hhmmToMin } from '../lib/time.js';

const SAMPLE_RX = ['/img/rx/rx1.png', '/img/rx/rx2.png', '/img/rx/rx3.png'];

const freshDraft = (elderId) => ({
  elderId, medId: null, custom: null, photo: null,
  amount: 1, slots: [], meal: 'after', duration: { type: 'ongoing', count: 7 },
  asNeeded: false, minGapHours: 6, maxPerDay: 3, rxPhoto: null,
  stock: 30, refillDays: 5, // how many tablets the family has now, and how many days ahead to warn
});

export default function AddMedicine({ elderId, onDone, toast }) {
  const { state, dispatch } = useStore();
  const me = useCaregiver();
  const meds = useMeds();
  const primary = state.caregivers.find((c) => c.primary);
  const [step, setStep] = useState(elderId ? 'search' : 'who');
  const [d, setD] = useState(() => freshDraft(elderId || null));
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const elder = state.elders.find((e) => e.id === d.elderId);
  const med = d.custom || (d.medId && meds[d.medId]);
  const image = d.photo || med?.image || null;

  const finish = () => {
    let medId = d.medId;
    if (d.custom) {
      medId = `custom-${Date.now()}`;
      dispatch({ type: 'med/addCustom', med: { ...d.custom, id: medId, image: d.photo } });
    }
    const regimenId = `r${Date.now()}`;
    const regimen = {
      id: regimenId, medId, amount: d.amount, slots: d.asNeeded ? [] : d.slots, meal: d.meal, duration: d.duration,
      asNeeded: d.asNeeded, minGapHours: d.minGapHours, maxPerDay: d.maxPerDay, rxPhoto: d.rxPhoto,
      photo: d.custom ? null : d.photo, startDay: 0, stock: d.stock, refillDays: d.refillDays,
    };
    dispatch({ type: 'regimen/add', elderId: d.elderId, regimen, by: me.id, medName: med.short || med.name });
    if (me.primary) {
      dispatch({ type: 'regimen/activate', elderId: d.elderId, regimenId, by: me.id, medName: med.short || med.name });
      toast(`চালু হয়েছে। ${elder.gen} ফোনে মনে করানো শুরু হবে।`);
    } else {
      toast(`${primary.gen} কাছে যাচাইয়ের জন্য পাঠানো হয়েছে`);
    }
    onDone();
  };

  if (step === 'who') {
    return (
      <div className="scr care">
        <ScreenHeader title="কার জন্য ওষুধ?" onBack={onDone} />
        <div className="body">
          {state.elders.map((e) => (
            <button key={e.id} type="button" className="card tap" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}
              onClick={() => { set({ elderId: e.id }); setStep('search'); }}>
              <Avatar person={e} size={72} />
              <div className="grow" style={{ fontSize: 26, fontWeight: 700 }}>{e.name}</div>
              <Icon name="chevron" size={26} color="#425A80" width={2} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'search') {
    return <SearchStep elder={elder} onBack={() => (elderId ? onDone() : setStep('who'))}
      onPick={(m) => { set({ medId: m.id, custom: null, photo: null }); setStep('photo'); }}
      onCustom={(name) => { set({ medId: null, custom: { name, short: name, bn: name, strength: '', form: 'tablet' }, photo: null }); setStep('photo'); }} />;
  }

  if (step === 'photo') {
    return (
      <div className="scr care">
        <ScreenHeader title="ছবি মিলিয়ে নিন" step={[2, 4]} onBack={() => setStep('search')} />
        <div className="body">
          <div style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>{med.name}</div>
          <div style={{ alignSelf: 'center', width: 280, height: 280, borderRadius: 22, background: '#fff', border: '1.5px solid #A9CCF2', display: 'flex', overflow: 'hidden' }}>
            {image
              ? <img src={image} alt={med.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <div style={{ margin: 'auto', textAlign: 'center', color: '#425A80', fontSize: 17, padding: 20 }}>এই ওষুধের ছবি নেই।<br />প্যাকেটের একটি ছবি দিন।</div>}
          </div>
          <div className="note-box">{elder.name} এই ছবি দেখেই ওষুধ চিনবেন। হাতে থাকা প্যাকেটের সঙ্গে মিলিয়ে নিন।</div>
        </div>
        <div className="foot">
          {image ? (
            <>
              <button type="button" className="btn-wide" onClick={() => setStep('schedule')}>
                <Icon name="check" size={22} /> হ্যাঁ, এটাই
              </button>
              <PhotoButton className="btn-wide ghost" onPhoto={(p) => set({ photo: p })} onError={() => toast('ছবিটি খোলা যায়নি')}>
                না, প্যাকেটের নতুন ছবি দিন
              </PhotoButton>
            </>
          ) : (
            <PhotoButton onPhoto={(p) => set({ photo: p })} onError={() => toast('ছবিটি খোলা যায়নি')}>
              প্যাকেটের ছবি তুলুন
            </PhotoButton>
          )}
        </div>
      </div>
    );
  }

  if (step === 'schedule') {
    return <ScheduleStep elder={elder} med={med} d={d} set={set} toast={toast}
      onBack={() => setStep('photo')} onNext={() => setStep('summary')} />;
  }

  // summary
  const draftRegimen = { ...d, slots: d.asNeeded ? [] : d.slots };
  return (
    <div className="scr care">
      <ScreenHeader title="একবার দেখে নিন" step={[4, 4]} onBack={() => setStep('schedule')} />
      <div className="body">
        <RegimenSummary elder={elder} regimen={draftRegimen} med={med} image={image} />
        {me.primary
          ? <div className="note-box">যাচাই করে চালু করলে {elder.gen} ফোনে মনে করানো শুরু হবে।</div>
          : <div className="note-box warn">শুধু প্রধান যত্নকারী {primary.name} যাচাই করে চালু করতে পারবেন। আপনি পাঠালে তিনি দেখতে পাবেন।</div>}
      </div>
      <div className="foot">
        <button type="button" className={'btn-wide' + (me.primary ? ' green' : '')} onClick={finish}>
          <Icon name="check" size={22} />
          {me.primary ? 'যাচাই করে চালু করুন' : `${primary.gen} কাছে যাচাইয়ের জন্য পাঠান`}
        </button>
      </div>
    </div>
  );
}

function SearchStep({ elder, onBack, onPick, onCustom }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!query) return LIBRARY;
    return LIBRARY.filter((m) => [m.name, m.bn, m.strength].some((s) => s.toLowerCase().includes(query)));
  }, [query]);
  const exact = hits.some((m) => m.name.toLowerCase() === query || m.short.toLowerCase() === query);

  return (
    <div className="scr care">
      <ScreenHeader title={`${elder.gen} নতুন ওষুধ`} step={[1, 4]} onBack={onBack} />
      <input className="search" type="search" placeholder="ওষুধের নাম লিখুন, যেমন Comet" value={q} autoFocus
        onChange={(e) => setQ(e.target.value)} aria-label="ওষুধের নাম" />
      <div className="body" style={{ gap: 8 }}>
        <Label>{query ? `${hits.length}টি মিলেছে` : 'ওষুধের তালিকা'}</Label>
        {hits.map((m) => (
          <button key={m.id} type="button" className="result" onClick={() => onPick(m)}>
            <MedThumb src={m.image} alt="" size={56} />
            <span className="grow">
              <span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{m.name}</span>
              <span className="t-sub" style={{ display: 'block', fontSize: 14 }}>{m.strength}</span>
            </span>
          </button>
        ))}
        {query && !exact && (
          <button type="button" className="result" style={{ borderStyle: 'dashed', borderColor: '#5B9BE0' }} onClick={() => onCustom(q.trim())}>
            <span className="thumb" style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" color="#0B2F8A" /></span>
            <span className="grow">
              <span style={{ display: 'block', fontSize: 17, fontWeight: 700 }}>
                {hits.length ? 'তালিকার কোনোটি নয়?' : `“${q.trim()}” তালিকায় নেই`}
              </span>
              <span className="t-sub" style={{ display: 'block', fontSize: 14 }}>“{q.trim()}” নতুন ওষুধ হিসেবে যোগ করুন</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function ScheduleStep({ elder, med, d, set, toast, onBack, onNext }) {
  const { dispatch } = useStore();
  const [editMeals, setEditMeals] = useState(false);
  const toggleSlot = (s) => set({ slots: d.slots.includes(s) ? d.slots.filter((x) => x !== s) : [...d.slots, s] });
  const ready = d.asNeeded || d.slots.length > 0;
  const form = med.form === 'capsule' ? 'ক্যাপসুল' : med.form === 'injection' ? 'ইনজেকশন' : 'ট্যাবলেট';

  return (
    <div className="scr care">
      <ScreenHeader title="কখন খাবেন?" step={[3, 4]} onBack={onBack} />
      <div className="body">
        <div className="row" style={{ gap: 10 }}>
          <MedThumb src={medImage(d, med)} alt="" size={48} />
          <div className="grow" style={{ fontSize: 18, fontWeight: 700 }}>{med.name}</div>
        </div>

        <div>
          <Label>প্রতিবার কতটি {form}?</Label>
          <div className="grid3" style={{ marginTop: 6 }}>
            {[0.5, 1, 2].map((a) => (
              <Toggle key={a} on={d.amount === a} onClick={() => set({ amount: a })}>{a === 0.5 ? 'আধা' : a === 1 ? '১টি' : '২টি'}</Toggle>
            ))}
          </div>
        </div>

        <Switch on={d.asNeeded} onChange={(v) => set({ asNeeded: v })} label="শুধু প্রয়োজন হলে"
          sub="যেমন ব্যথা হলে। নির্দিষ্ট সময়ে মনে করাবে না।" />

        {d.asNeeded ? (
          <>
            <div>
              <Label>দুই বারের মাঝে কমপক্ষে</Label>
              <div style={{ marginTop: 6 }}><Stepper value={d.minGapHours} min={1} max={24} unit="ঘণ্টা" onChange={(v) => set({ minGapHours: v })} /></div>
            </div>
            <div>
              <Label>দিনে সর্বোচ্চ</Label>
              <div style={{ marginTop: 6 }}><Stepper value={d.maxPerDay} min={1} max={10} unit="বার" onChange={(v) => set({ maxPerDay: v })} /></div>
            </div>
            <div className="note-box">খাওয়ার কথা জানালে ছোটু লিখে রাখবে। এই সীমা পার হলেও লিখে রাখবে, আর আপনাকে জানাবে।</div>
          </>
        ) : (
          <>
            <div>
              <Label>দিনের কোন সময়? (একাধিক বেছে নিতে পারেন)</Label>
              <div className="grid3" style={{ marginTop: 6 }}>
                {Object.keys(SLOTS).map((s) => (
                  <Toggle key={s} on={d.slots.includes(s)} onClick={() => toggleSlot(s)}
                    sub={bnTime(slotTime(elder, d, s)).split(' ')[1]}>{SLOTS[s].bn}</Toggle>
                ))}
              </div>
              <CustomTimes slots={d.slots} onChange={(slots) => set({ slots })} />
            </div>
            {d.slots.some((x) => !isCustom(x)) && <div>
              <Label>খাবারের আগে না পরে?</Label>
              <div className="grid2" style={{ marginTop: 6 }}>
                <Toggle on={d.meal === 'before'} onClick={() => set({ meal: 'before' })} sub="৩০ মিনিট আগে">খাবারের আগে</Toggle>
                <Toggle on={d.meal === 'after'} onClick={() => set({ meal: 'after' })} sub="১৫ মিনিট পরে">খাবারের পরে</Toggle>
              </div>
            </div>}
            {d.slots.some((x) => !isCustom(x)) && <MealTimes elder={elder} editing={editMeals} onEdit={() => setEditMeals((v) => !v)}
              onChange={(meals) => dispatch({ type: 'elder/meals', elderId: elder.id, meals })} />}
          </>
        )}

        <div>
          <Label>এখন কতটি আছে? (ওষুধ শেষ হওয়ার আগে জানাতে)</Label>
          <div style={{ marginTop: 6 }}><Stepper value={d.stock} min={0} max={300} unit={formWord(med)} onChange={(v) => set({ stock: v })} /></div>
          <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {[10, 14, 30, 60].map((n) => <button key={n} type="button" className="chip-sel" onClick={() => set({ stock: n })}>{bn(n)}টি</button>)}
          </div>
          <div style={{ marginTop: 10 }}>
            <Label>কত দিনের ওষুধ বাকি থাকলে জানাব?</Label>
            <div style={{ marginTop: 6 }}><Stepper value={d.refillDays} min={1} max={30} unit="দিন" onChange={(v) => set({ refillDays: v })} /></div>
          </div>
        </div>

        <div>
          <Label>কত দিন চলবে?</Label>
          <div className="grid3" style={{ marginTop: 6 }}>
            <Toggle on={d.duration.type === 'ongoing'} onClick={() => set({ duration: { ...d.duration, type: 'ongoing' } })}>চলবে</Toggle>
            <Toggle on={d.duration.type === 'days'} onClick={() => set({ duration: { type: 'days', count: d.duration.count || 7 } })}>দিন</Toggle>
            <Toggle on={d.duration.type === 'weeks'} onClick={() => set({ duration: { type: 'weeks', count: Math.min(d.duration.count || 4, 52) } })}>সপ্তাহ</Toggle>
          </div>
          {d.duration.type !== 'ongoing' && (
            <div style={{ marginTop: 8 }}>
              <Stepper value={d.duration.count} min={1} max={d.duration.type === 'weeks' ? 52 : 90}
                unit={d.duration.type === 'weeks' ? 'সপ্তাহ' : 'দিন'} onChange={(v) => set({ duration: { ...d.duration, count: v } })} />
            </div>
          )}
        </div>

        <div>
          <Label>প্রেসক্রিপশনের ছবি (ঐচ্ছিক)</Label>
          <div className="t-sub" style={{ fontSize: 14 }}>শুধু মিলিয়ে দেখার জন্য রাখা হবে। ছোটু এটি পড়ে না।</div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            {[...SAMPLE_RX, ...(d.rxPhoto && !SAMPLE_RX.includes(d.rxPhoto) ? [d.rxPhoto] : [])].map((src) => (
              <button key={src} type="button" aria-pressed={d.rxPhoto === src} aria-label="এই প্রেসক্রিপশন বেছে নিন"
                onClick={() => set({ rxPhoto: d.rxPhoto === src ? null : src })}
                style={{ width: 64, height: 82, padding: 0, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#fff',
                  border: d.rxPhoto === src ? '3px solid #0B2F8A' : '1.5px solid #A9CCF2', flexShrink: 0 }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
            <PhotoButton className="tgl" onPhoto={(p) => set({ rxPhoto: p })} onError={() => toast('ছবিটি খোলা যায়নি')}>
              <span style={{ fontSize: 14 }}>নতুন ছবি</span>
            </PhotoButton>
          </div>
        </div>
      </div>
      <div className="foot">
        {!ready && <div className="t-sub" style={{ textAlign: 'center', fontSize: 15 }}>দিনের অন্তত একটি সময় বেছে নিন</div>}
        <button type="button" className="btn-wide" disabled={!ready} onClick={onNext}>পরের ধাপ</button>
      </div>
    </div>
  );
}

/** Meal times live on the elder's profile; they turn "after breakfast" into a clock time. */
export function MealTimes({ elder, editing, onEdit, onChange }) {
  return (
    <div className="card" style={{ padding: 12, gap: 8 }}>
      <div className="row">
        <div className="grow" style={{ fontSize: 15, fontWeight: 700, color: '#425A80' }}>{elder.gen} খাবারের সময়</div>
        <button type="button" className="pill" style={{ border: 0, cursor: 'pointer', minHeight: 36 }} onClick={onEdit}>
          {editing ? 'ঠিক আছে' : 'বদলান'}
        </button>
      </div>
      {Object.keys(MEAL_NAMES).map((k) => (
        <div key={k} className="kv" style={{ alignItems: 'center' }}>
          <span>{MEAL_NAMES[k]}</span>
          {editing
            ? <input className="time-in" type="time" value={elder.meals[k]} step="300"
                onChange={(e) => e.target.value && onChange({ ...elder.meals, [k]: e.target.value })} aria-label={MEAL_NAMES[k]} />
            : <span>{bnTime(hhmmToMin(elder.meals[k]))}</span>}
        </div>
      ))}
    </div>
  );
}

const formWord = (med) => (med?.form === 'capsule' ? 'ক্যাপসুল' : med?.form === 'injection' ? 'ইনজেকশন' : 'ট্যাবলেট');

/** Exact clock times, for people whose day does not follow the usual meal times. */
function CustomTimes({ slots, onChange }) {
  const [time, setTime] = useState('22:00');
  const custom = slots.filter(isCustom).sort();
  const add = () => { const v = customSlot(time); if (!slots.includes(v)) onChange([...slots, v]); };
  return (
    <div className="card" style={{ padding: 10, gap: 8, marginTop: 8 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#425A80' }}>অন্য সময় (যেকোনো নির্দিষ্ট সময়)</div>
      <div className="row" style={{ gap: 8 }}>
        <input id="custom-time" className="time-in grow" type="time" step="300" value={time} onChange={(e) => setTime(e.target.value)} aria-label="নির্দিষ্ট সময়" />
        <button type="button" className="btn-wide" style={{ width: 'auto', minHeight: 48, fontSize: 17 }} onClick={add}>যোগ করুন</button>
      </div>
      {custom.length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {custom.map((c) => (
            <button key={c} type="button" className="chip-sel on" onClick={() => onChange(slots.filter((x) => x !== c))} aria-label={`${bnTime(hhmmToMin(c.slice(3)))} সরিয়ে দিন`}>
              {bnTime(hhmmToMin(c.slice(3)))} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
