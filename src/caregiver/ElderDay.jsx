// One elder's day: today's doses with status, and the timeline of what happened.
import { useMeds, useStore } from '../state/store.jsx';
import { bnTime, bnWhen, dayOf } from '../lib/time.js';
import { medImage } from '../lib/schedule.js';
import { Avatar, MedThumb } from '../components/Phone.jsx';
import Icon from '../components/Icon.jsx';
import { STATUS_LOOK, todayDoses } from './status.js';

const PILL_COLOURS = {
  '': { background: '#CFE3F8', color: '#0B2F8A' },
  ok: { background: '#D9F0E3', color: '#17633F' },
  warn: { background: '#FCEBC8', color: '#7A4A00' },
  bad: { background: '#F9DEDC', color: '#8E1B16' },
};

export default function ElderDay({ elderId, onBack, toast }) {
  const { state } = useStore();
  const meds = useMeds();
  const elder = state.elders.find((e) => e.id === elderId);
  const now = state.clock;
  const today = todayDoses(elder, now, meds, state.doses);
  const log = state.log.filter((l) => l.elderId === elderId).slice().sort((a, b) => b.at - a.at); // newest first
  const who = (id) => (id === 'chotu' ? 'ছোটু' : state.caregivers.find((c) => c.id === id)?.name || state.elders.find((e) => e.id === id)?.name);

  return (
    <div className="scr care">
      <div className="row" style={{ flexShrink: 0 }}>
        <button type="button" className="icon-btn" aria-label="ফিরে যান" onClick={onBack}>
          <Icon name="back" size={28} color="#0B2F8A" />
        </button>
        <Avatar person={elder} size={52} />
        <div className="grow" style={{ fontSize: 26, fontWeight: 700, color: '#0B2F8A' }}>{elder.name}</div>
        <span className="pill" style={{ background: '#0B2F8A', color: '#fff' }}>আজ</span>
      </div>

      <div className="body" style={{ gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 16, fontWeight: 700, color: '#425A80' }}>আজকের ওষুধ</div>
          {today.length === 0 && <div className="t-sub">আজ কোনো নির্ধারিত ওষুধ নেই</div>}
          {today.map((d) => {
            const look = STATUS_LOOK[d.status];
            return (
              <div key={d.key} className="row" style={{ gap: 10 }}>
                <MedThumb src={medImage(d.regimen, d.med)} alt="" size={50} />
                <div className="grow">
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{d.med.short}</div>
                  <div className="t-sub" style={{ fontSize: 14.5 }}>
                    {bnTime(d.at)}{d.status === 'taken' ? ` · খেয়েছেন ${bnTime(d.rec.at)}` : ''}
                  </div>
                </div>
                <span className="pill" style={{ ...PILL_COLOURS[look.cls], fontSize: 13.5 }}>
                  <Icon name={look.icon} size={15} /> {look.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={{ fontSize: 16, fontWeight: 700, color: '#425A80' }}>কী কী হয়েছে</div>
          {log.length === 0 && <div className="t-sub">এখনও কিছু হয়নি</div>}
          {log.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 15.5, lineHeight: 1.4 }}>
              <span style={{ color: '#425A80', fontWeight: 600, minWidth: 92, flexShrink: 0 }}>
                {dayOf(l.at) === dayOf(now) ? bnTime(l.at) : <>{bnWhen(l.at, now).split(' ')[0]}<br />{bnTime(l.at)}</>}
              </span>
              <span style={{ fontWeight: 500 }}>
                {l.by && l.by !== elderId && <b>{who(l.by)}: </b>}
                {l.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button type="button" className="btn-wide ghost" style={{ flexShrink: 0 }} onClick={() => toast('ফোন করা হচ্ছে… (ডেমো, আসলে কল হয় না)')}>
        <Icon name="phone" size={21} /> {elder.name}কে ফোন করুন
      </button>
    </div>
  );
}
