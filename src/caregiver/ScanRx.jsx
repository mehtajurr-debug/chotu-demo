// Add medicines from a photo of a printed prescription.
// pick a photo -> Gemini reads the Rx lines (api/prescription.js) -> the family checks every line (fix, untick)
// -> added as "waiting for verification" -> the primary caregiver verifies and activates (same rule as by hand).
// AI never switches a schedule on, and nothing here gives medical advice.
import { useState } from 'react';
import { useCaregiver, useMeds, useStore } from '../state/store.jsx';
import { MedThumb } from '../components/Phone.jsx';
import { PhotoButton, ScreenHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { SLOTS, doseText, durationText, MEAL_TIMING } from '../lib/schedule.js';
import { bn } from '../lib/time.js';
import { draftsFromRx } from '../lib/rx.js';
import { fileToSmallDataUrl, imageForReading } from '../lib/image.js';
import { ScheduleStep } from './AddMedicine.jsx';

const SAMPLES = [
  { src: '/img/rx/rx1.png', label: 'নমুনা ১' },
  { src: '/img/rx/rx2.png', label: 'নমুনা ২' },
  { src: '/img/rx/rx3.png', label: 'নমুনা ৩' },
];

export default function ScanRx({ elder, onBack, onDone, toast }) {
  const { state, dispatch } = useStore();
  const me = useCaregiver();
  const meds = useMeds();
  const primary = state.caregivers.find((c) => c.primary);
  const [step, setStep] = useState('pick'); // pick | reading | review | edit | verify
  const [rxPhoto, setRxPhoto] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [model, setModel] = useState('');
  const [added, setAdded] = useState([]); // regimen ids waiting for verification

  const medOf = (d) => d.custom || meds[d.medId];
  const update = (key, patch) => setDrafts((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function read(source, keepPhoto) {
    setError('');
    setRxPhoto(keepPhoto);
    setStep('reading');
    try {
      const image = await imageForReading(source);
      const r = await fetch('/api/prescription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image, mimeType: 'image/jpeg' }) });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(out.error || `HTTP ${r.status}`);
      if (!out.isPrescription || !out.medicines.length) throw new Error('ছবিতে প্রেসক্রিপশনের ওষুধের তালিকা পাওয়া যায়নি।');
      setModel(out.model || '');
      setDrafts(draftsFromRx(out.medicines, elder, keepPhoto));
      setStep('review');
    } catch (e) {
      setError(/fetch|network|HTTP 5/i.test(String(e.message)) ? 'ইন্টারনেট বা এআই এখন পাওয়া যাচ্ছে না। নাম লিখে যোগ করুন, বা একটু পরে আবার চেষ্টা করুন।' : String(e.message));
      setStep('pick');
    }
  }

  function addAll() {
    const chosen = drafts.filter((d) => d.include);
    const ids = [];
    chosen.forEach((d, n) => {
      let medId = d.medId;
      const med = medOf(d);
      if (d.custom) {
        medId = `custom-${Date.now()}-${n}`;
        dispatch({ type: 'med/addCustom', med: { ...d.custom, id: medId, image: d.photo } });
      }
      const id = `r${Date.now()}-${n}`;
      ids.push({ id, name: med.short || med.name });
      dispatch({ type: 'regimen/add', elderId: elder.id, by: me.id, medName: med.short || med.name, regimen: {
        id, medId, amount: d.amount, slots: d.asNeeded ? [] : d.slots, meal: d.meal, duration: d.duration,
        asNeeded: d.asNeeded, minGapHours: d.minGapHours, maxPerDay: d.maxPerDay, rxPhoto: d.rxPhoto,
        photo: d.custom ? null : d.photo, startDay: 0, stock: d.stock, refillDays: d.refillDays, fromRx: true,
      } });
    });
    setAdded(ids);
    if (me.primary) setStep('verify');
    else { toast(`${bn(ids.length)}টি ওষুধ ${primary.gen} কাছে যাচাইয়ের জন্য পাঠানো হয়েছে`); onDone(); }
  }

  function activateAll() {
    for (const r of added) dispatch({ type: 'regimen/activate', elderId: elder.id, regimenId: r.id, by: me.id, medName: r.name });
    toast(`${bn(added.length)}টি ওষুধ চালু হয়েছে। ${elder.gen} ফোনে মনে করানো শুরু হবে।`);
    onDone();
  }

  if (step === 'edit') {
    const d = drafts.find((x) => x.key === editing);
    return <ScheduleStep elder={elder} med={medOf(d)} d={d} set={(p) => update(d.key, p)} toast={toast}
      onBack={() => setStep('review')} onNext={() => setStep('review')} nextLabel="ঠিক আছে" />;
  }

  if (step === 'verify') {
    return (
      <div className="scr care">
        <ScreenHeader title="যাচাই করুন" />
        <div className="body">
          <div className="note-box">{bn(added.length)}টি ওষুধ যোগ হয়েছে, এখনও চালু হয়নি। প্রেসক্রিপশনের সঙ্গে মিলিয়ে দেখে চালু করুন।</div>
          {drafts.filter((d) => d.include).map((d) => <DraftCard key={d.key} d={d} med={medOf(d)} readOnly />)}
        </div>
        <div className="foot">
          <button type="button" className="btn-wide green" onClick={activateAll}><Icon name="check" size={22} /> যাচাই করে সব চালু করুন</button>
          <button type="button" className="btn-wide ghost" onClick={onDone}>পরে করব (যাচাই বাকি থাকবে)</button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    const n = drafts.filter((d) => d.include).length;
    const needPhoto = drafts.some((d) => d.include && d.custom && !d.photo);
    return (
      <div className="scr care">
        <ScreenHeader title="ছবি থেকে পাওয়া ওষুধ" onBack={() => setStep('pick')} />
        <div className="body" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            {rxPhoto && <img src={rxPhoto} alt="প্রেসক্রিপশন" style={{ width: 64, height: 82, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #A9CCF2', flexShrink: 0 }} />}
            <div className="note-box" style={{ margin: 0 }}>
              এআই প্রেসক্রিপশনে যা ছাপা আছে তা পড়েছে{model ? ` (${model})` : ''}। প্রতিটি লাইন মিলিয়ে নিন; ভুল থাকলে “বদলান”, না চাইলে টিক তুলে দিন।
            </div>
          </div>
          {drafts.map((d) => (
            <DraftCard key={d.key} d={d} med={medOf(d)} onToggle={() => update(d.key, { include: !d.include })}
              onEdit={() => { setEditing(d.key); setStep('edit'); }}
              onPhoto={(p) => update(d.key, { photo: p })} toast={toast} />
          ))}
          <div className="note-box">ছোটু কোনো ওষুধ বদলায় না বা পরামর্শ দেয় না। যোগ করার পরও প্রধান যত্নকারী যাচাই না করা পর্যন্ত কিছু চালু হবে না।</div>
        </div>
        <div className="foot">
          {needPhoto && <div className="t-sub" style={{ textAlign: 'center', fontSize: 14.5 }}>যেগুলোর ছবি নেই, {elder.name} সেগুলো ছবি দেখে চিনতে পারবেন না। পরে ছবি দিতে পারেন।</div>}
          <button type="button" className="btn-wide" disabled={!n} onClick={addAll}>
            <Icon name="plus" size={22} /> {bn(n)}টি ওষুধ যোগ করুন
          </button>
        </div>
      </div>
    );
  }

  // pick / reading
  return (
    <div className="scr care">
      <ScreenHeader title="প্রেসক্রিপশনের ছবি" onBack={step === 'reading' ? undefined : onBack} />
      <div className="body">
        {step === 'reading' ? (
          <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {rxPhoto && <img src={rxPhoto} alt="" style={{ width: 180, height: 230, objectFit: 'cover', borderRadius: 14, border: '1.5px solid #A9CCF2' }} />}
            <div className="scan-bar" aria-hidden="true"><span /></div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0B2F8A' }}>প্রেসক্রিপশন পড়া হচ্ছে…</div>
            <div className="t-sub">কয়েক সেকেন্ড লাগতে পারে</div>
          </div>
        ) : (
          <>
            <div className="note-box">ছাপানো (কম্পিউটারে লেখা) প্রেসক্রিপশনের পরিষ্কার ছবি দিন। এআই ওষুধের নাম, সময় আর কত দিন চলবে পড়ে তালিকা বানাবে। হাতে লেখা প্রেসক্রিপশন এখনও পড়া যায় না।</div>
            {error && <div className="note-box warn" role="alert">{error}</div>}
            <PhotoButton onPhoto={() => {}} onFile={async (f) => read(f, await fileToSmallDataUrl(f, 900))} onError={() => toast('ছবিটি খোলা যায়নি')}>
              <Icon name="doc" size={22} /> প্রেসক্রিপশনের ছবি তুলুন
            </PhotoButton>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#425A80' }}>অথবা নমুনা প্রেসক্রিপশন (ডেমো)</div>
            <div className="grid3">
              {SAMPLES.map((s) => (
                <button key={s.src} type="button" className="rx-sample" onClick={() => read(s.src, s.src)}>
                  <img src={s.src} alt="" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** One medicine read from the prescription: what it will be set to, what was printed, and anything to check. */
function DraftCard({ d, med, onToggle, onEdit, onPhoto, toast, readOnly }) {
  const img = d.photo || (d.custom ? null : med?.image);
  const when = d.asNeeded
    ? `প্রয়োজন হলে · দিনে সর্বোচ্চ ${bn(d.maxPerDay)} বার`
    : d.slots.length ? `${d.slots.map((s) => SLOTS[s]?.bn || s).join(' + ')} · ${doseText(d.amount, med?.form)} · ${MEAL_TIMING[d.meal].bn}` : 'সময় বেছে নিন';
  return (
    <div className="card" style={{ gap: 8, padding: 12, opacity: d.include || readOnly ? 1 : 0.6 }}>
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        {!readOnly && (
          <input type="checkbox" checked={d.include} onChange={onToggle} aria-label={`${med?.name} যোগ করুন`}
            style={{ width: 26, height: 26, marginTop: 14, accentColor: '#0B2F8A', flexShrink: 0 }} />
        )}
        {img ? <MedThumb src={img} alt="" size={56} /> : <span className="thumb" style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8A4B00', textAlign: 'center' }}>ছবি নেই</span>}
        <div className="grow">
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{med?.name}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0B2F8A' }}>{when}</div>
          <div className="t-sub" style={{ fontSize: 14 }}>{d.asNeeded ? '' : durationText(d.duration)}</div>
          {d.printed && <div className="t-sub" style={{ fontSize: 13.5 }}>ছাপা আছে: “{d.printed}”</div>}
        </div>
      </div>
      {!readOnly && d.flags.map((f, i) => <div key={i} className="flag">{f}</div>)}
      {!readOnly && (
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="chip-sel" onClick={onEdit}>বদলান</button>
          {d.custom && <PhotoButton className="chip-sel" onPhoto={onPhoto} onError={() => toast('ছবিটি খোলা যায়নি')}>{d.photo ? 'ছবি বদলান' : 'প্যাকেটের ছবি দিন'}</PhotoButton>}
        </div>
      )}
    </div>
  );
}
