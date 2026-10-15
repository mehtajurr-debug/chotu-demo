// Bangla daily summary, built from fixed sentence templates and the app's own records. No AI call.
// It only repeats what happened and what the family entered; it never gives medical advice.
import { useState } from 'react';
import { useMeds, useStore } from '../state/store.jsx';
import { bn, bnTime, dayOf } from '../lib/time.js';
import { doseStatus, dosesForDay } from '../lib/schedule.js';
import { Avatar } from '../components/Phone.jsx';
import { ScreenHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { alertLabel } from './status.js';

const inDay = (at, day) => dayOf(at) === day;

/** Returns { title, sections: [{ heading, lines: [] }] } for one elder and one day. */
export function buildSummary(state, elder, day, meds) {
  const now = state.clock;
  const today = dayOf(now);
  const who = (id) => state.caregivers.find((c) => c.id === id)?.name || state.elders.find((e) => e.id === id)?.name;
  const consent = state.consent?.[elder.id] || {};
  const title = `${elder.gen} ${day === today ? 'আজকের' : day === today - 1 ? 'গতকালের' : ''} সারাংশ`;
  const sections = [];

  // ----- medicines -----
  const med = { heading: 'ওষুধ', lines: [] };
  if (consent.medication === false) {
    med.lines.push(`${elder.name} ওষুধ খাওয়ার খবর শেয়ার করা বন্ধ রেখেছেন।`);
  } else {
    const all = dosesForDay(elder, day, meds).filter((d) => d.regimen.verifiedAt == null || d.at >= d.regimen.verifiedAt);
    const due = all.filter((d) => d.at <= now);
    const taken = due.filter((d) => ['taken', 'conflict'].includes(doseStatus(d, now, state.doses)));
    if (!all.length) med.lines.push('এই দিনে কোনো নির্ধারিত ওষুধ ছিল না।');
    else if (due.length && taken.length === due.length) med.lines.push(`${day === today ? 'এখন পর্যন্ত ' : ''}সব ওষুধ খাওয়া হয়েছে (${bn(taken.length)}টির মধ্যে ${bn(taken.length)}টি)।`);
    else if (due.length) med.lines.push(`${day === today ? 'এখন পর্যন্ত ' : ''}${bn(due.length)}টি ডোজের মধ্যে ${bn(taken.length)}টি খেয়েছেন।`);
    for (const d of all) {
      const st = doseStatus(d, now, state.doses);
      const rec = state.doses[d.key];
      const PHRASE = {
        taken: () => (rec.how === 'caregiver' ? `${who(rec.by)} খাইয়ে দিয়েছেন (${bnTime(rec.at)})` : `খেয়েছেন (${bnTime(rec.at)}, ${rec.how === 'voice' ? 'কথায় জানিয়েছেন' : 'বোতামে'})`),
        conflict: () => 'দুইবার লেখা হয়েছে, মিলিয়ে দেখুন',
        missed: () => 'উত্তর পাওয়া যায়নি, পরিবারকে জানানো হয়েছে',
        unsure: () => '“মনে নেই” বলেছেন, ছোটু অপেক্ষা করতে বলেছে',
        help: () => 'ওষুধের সময় সাহায্য চেয়েছেন',
        snoozed: () => '“এখনও খাইনি” বলেছেন',
        due: () => 'এখনও উত্তর আসেনি',
        upcoming: () => 'এখনও সময় হয়নি',
      };
      med.lines.push(`${bnTime(d.at)}: ${d.med.short}, ${PHRASE[st]()}`);
    }
    // As-needed medicines
    for (const r of elder.regimens.filter((x) => x.asNeeded && x.status === 'active')) {
      const times = Object.entries(state.doses)
        .filter(([k, rec]) => k.startsWith(`${r.id}@${day}@`) && rec.status === 'taken')
        .map(([, rec]) => rec.at).sort((a, b) => a - b);
      const name = meds[r.medId]?.short;
      if (!times.length) { med.lines.push(`প্রয়োজনের ওষুধ (${name}) নেননি।`); continue; }
      const broke = state.alerts.some((a) => a.kind === 'prn' && a.elderId === elder.id && inDay(a.createdAt, day));
      med.lines.push(`প্রয়োজনের ওষুধ (${name}) ${bn(times.length)} বার নিয়েছেন: ${times.map(bnTime).join(', ')}।${broke ? ' একবার পরিবারের দেওয়া নিয়মের বাইরে নেওয়া হয়েছে।' : ''}`);
    }
  }
  sections.push(med);

  // ----- alerts -----
  const alerts = state.alerts.filter((a) => a.elderId === elder.id && inDay(a.createdAt, day));
  const al = { heading: 'সতর্কতা', lines: [] };
  if (!alerts.length) al.lines.push('কোনো সতর্কতা ছিল না।');
  for (const a of alerts) {
    const state_ = a.resolvedAt ? `${who(a.handledBy) || ''} দেখেছেন, মিটে গেছে` : a.handledBy ? `${who(a.handledBy)} দেখছেন` : 'এখনও কেউ দেখেননি';
    al.lines.push(`${bnTime(a.createdAt)}: ${alertLabel(a)} · ${state_.trim()}`);
  }
  sections.push(al);

  // ----- how they are -----
  const wb = { heading: 'শরীর কেমন', lines: [] };
  if (consent.wellbeing === false) wb.lines.push(`${elder.name} শরীরের খবর শেয়ার করা বন্ধ রেখেছেন।`);
  else {
    const said = state.log.filter((l) => l.elderId === elder.id && inDay(l.at, day) && /ব্যথা|অসুস্থ/.test(l.text));
    if (said.length) said.forEach((l) => wb.lines.push(`${bnTime(l.at)}: ${l.text}`));
    else wb.lines.push('ছোটুকে শরীর খারাপের কথা কিছু বলেননি।');
  }
  sections.push(wb);

  // ----- family notes -----
  const notes = state.notes.filter((n) => n.elderId === elder.id && inDay(n.at, day));
  sections.push({
    heading: 'পরিবারের নোট',
    lines: notes.length ? notes.map((n) => `${who(n.by)}: ${n.text}`) : ['এই দিনে কোনো নোট নেই।'],
  });

  return { title, sections };
}

export default function Summary({ onBack, toast }) {
  const { state } = useStore();
  const meds = useMeds();
  const [elderId, setElderId] = useState(state.elders[0].id);
  const today = dayOf(state.clock);
  const [day, setDay] = useState(today);
  const elder = state.elders.find((e) => e.id === elderId);
  const { title, sections } = buildSummary(state, elder, day, meds);

  const copy = async () => {
    const text = [title, ...sections.flatMap((s) => [`\n${s.heading}`, ...s.lines.map((l) => `• ${l}`)])].join('\n');
    try { await navigator.clipboard.writeText(text); toast('সারাংশ কপি হয়েছে, এখন যেকোনো জায়গায় পাঠাতে পারেন'); }
    catch { toast('কপি করা গেল না'); }
  };

  return (
    <div className="scr care">
      <ScreenHeader title="সারাংশ" onBack={onBack} />
      <div className="row" style={{ gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        {state.elders.map((e) => (
          <button key={e.id} type="button" className={'chip-sel' + (e.id === elderId ? ' on' : '')} onClick={() => setElderId(e.id)}>
            <Avatar person={e} size={28} /> {e.name}
          </button>
        ))}
        <span className="grow" />
        {[today - 1, today].map((d) => (
          <button key={d} type="button" className={'chip-sel' + (d === day ? ' on' : '')} onClick={() => setDay(d)}>
            {d === today ? 'আজ' : 'গতকাল'}
          </button>
        ))}
      </div>
      <div className="body" style={{ gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0B2F8A' }}>{title}</div>
        {sections.map((s) => (
          <div key={s.heading} className="card" style={{ gap: 6, padding: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#425A80' }}>{s.heading}</div>
            {s.lines.map((l, i) => <div key={i} style={{ fontSize: 16, lineHeight: 1.5 }}>{l}</div>)}
          </div>
        ))}
        <div className="t-sub" style={{ fontSize: 13.5, textAlign: 'center' }}>
          নির্দিষ্ট বাক্যের ছাঁচ থেকে তৈরি, কোনো AI ব্যবহার হয়নি। এটি চিকিৎসা পরামর্শ নয়।
        </div>
      </div>
      <button type="button" className="btn-wide ghost" style={{ flexShrink: 0 }} onClick={copy}>
        <Icon name="doc" size={20} /> সারাংশ কপি করুন
      </button>
    </div>
  );
}
