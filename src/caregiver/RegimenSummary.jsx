// One-screen summary of a medicine schedule, with the prescription photo beside it.
// Used before "Verify and activate" and when the primary caregiver reviews a pending schedule.
import { useState } from 'react';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import { bn, bnTime } from '../lib/time.js';
import { MEAL_TIMING, SLOTS, doseText, durationText, slotTime } from '../lib/schedule.js';

export default function RegimenSummary({ elder, regimen, med, image }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
        <Avatar person={elder} size={44} />
        <div style={{ fontSize: 19, fontWeight: 700 }}>{elder.gen} জন্য</div>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 14 }}>
          <MedThumb src={image} alt={med.name} size={96} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{med.name}</div>
            {med.strength && <div className="t-sub" style={{ fontSize: 14.5 }}>{med.strength}</div>}
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0B2F8A', marginTop: 4 }}>প্রতিবার {doseText(regimen.amount, med.form)}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {regimen.asNeeded ? (
            <>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#0B2F8A' }}>শুধু প্রয়োজন হলে</div>
              <div className="t-sub">নির্দিষ্ট সময়ে মনে করাবে না</div>
              <div className="kv"><span>কমপক্ষে ব্যবধান</span><span>{bn(regimen.minGapHours)} ঘণ্টা</span></div>
              <div className="kv"><span>দিনে সর্বোচ্চ</span><span>{bn(regimen.maxPerDay)} বার</span></div>
            </>
          ) : (
            <>
              {regimen.slots.map((s) => (
                <div key={s}>
                  <div style={{ fontSize: 21, fontWeight: 700, color: '#0B2F8A', lineHeight: 1.3 }}>{bnTime(slotTime(elder, regimen, s))}</div>
                  <div className="t-sub" style={{ fontSize: 15 }}>{SLOTS[s].bn}, {MEAL_TIMING[regimen.meal].bn}</div>
                </div>
              ))}
            </>
          )}
          <div className="kv" style={{ marginTop: 4 }}><span>কত দিন</span><span>{durationText(regimen.duration)}</span></div>
        </div>

        {regimen.rxPhoto ? (
          <button type="button" onClick={() => setZoom(true)} aria-label="প্রেসক্রিপশন বড় করে দেখুন"
            style={{ border: '1px solid #A9CCF2', borderRadius: 12, padding: 0, background: '#fff', cursor: 'zoom-in', width: 92, flexShrink: 0, overflow: 'hidden' }}>
            <img src={regimen.rxPhoto} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#425A80', padding: '4px 2px' }}>প্রেসক্রিপশন</div>
          </button>
        ) : (
          <div style={{ width: 92, height: 120, border: '1.5px dashed #A9CCF2', borderRadius: 12, fontSize: 12.5, color: '#425A80', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 6, flexShrink: 0 }}>
            প্রেসক্রিপশন যোগ করা হয়নি
          </div>
        )}
      </div>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <img src={regimen.rxPhoto} alt="প্রেসক্রিপশন" />
          <button type="button" className="btn-wide ghost" style={{ maxWidth: 200 }}>বন্ধ করুন</button>
        </div>
      )}
    </>
  );
}
