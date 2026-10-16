// Summaries for the family. Two layers:
//  1. AI summary (top card): Gemini reads the facts from src/lib/facts.js and writes a short Bangla story, patterns
//     worth watching and practical tips for the family (api/summary.js). No diagnosis, no medicine advice.
//  2. The record (below): fixed sentence templates over the app's own data. Always works, also offline,
//     and shows the facts the AI summary was based on.
import { useEffect, useState } from 'react';
import { buildFacts } from '../lib/facts.js';
import { useMeds, useStore } from '../state/store.jsx';
import { bn, bnTime, dayOf } from '../lib/time.js';
import { doseStatus, dosesForDay } from '../lib/schedule.js';
import { QUESTIONS, answerText, checkinAt, checkinKey, CHECKIN_WINDOW } from '../lib/checkin.js';
import { Avatar } from '../components/Phone.jsx';
import { ScreenHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { alertLabel } from './status.js';

const inDay = (at, day) => dayOf(at) === day;
const relDay = (day, today) => (day === today ? 'আজ' : day === today - 1 ? 'গতকাল' : `${bn(today - day)} দিন আগে`);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// ---------- shared pieces ----------

/** Scheduled doses on one day that count (time has come, schedule was on). */
function dayDoses(state, elder, day, meds) {
  return dosesForDay(elder, day, meds)
    .filter((d) => (d.regimen.verifiedAt == null || d.at >= d.regimen.verifiedAt) && d.at <= state.clock)
    .map((d) => ({ ...d, st: doseStatus(d, state.clock, state.doses), rec: state.doses[d.key] }));
}

function prnTimes(state, regimen, day) {
  return Object.entries(state.doses)
    .filter(([k, r]) => k.startsWith(`${regimen.id}@${day}@`) && r.status === 'taken')
    .map(([, r]) => r.at).sort((a, b) => a - b);
}

const painMentions = (state, elder, day) => state.log.filter((l) => l.elderId === elder.id && inDay(l.at, day) && l.kind !== 'checkin' && /ব্যথা|অসুস্থ/.test(l.text));

// ---------- one day ----------
export function buildDay(state, elder, day, meds) {
  const now = state.clock;
  const today = dayOf(now);
  const who = (id) => state.caregivers.find((c) => c.id === id)?.name || state.elders.find((e) => e.id === id)?.name;
  const consent = state.consent?.[elder.id] || {};
  const sections = [];

  // Medicines
  const med = { heading: 'ওষুধ', icon: 'check', lines: [] };
  if (consent.medication === false) med.lines.push(`${elder.name} ওষুধ খাওয়ার খবর শেয়ার করা বন্ধ রেখেছেন।`);
  else {
    const all = dosesForDay(elder, day, meds).filter((d) => d.regimen.verifiedAt == null || d.at >= d.regimen.verifiedAt);
    const due = dayDoses(state, elder, day, meds);
    const taken = due.filter((d) => ['taken', 'conflict'].includes(d.st));
    const so = day === today ? 'এখন পর্যন্ত ' : '';
    if (!all.length) med.lines.push('এই দিনে কোনো নির্ধারিত ওষুধ ছিল না।');
    else if (due.length && taken.length === due.length) med.lines.push(`${so}সব ওষুধ খাওয়া হয়েছে (${bn(due.length)}টির মধ্যে ${bn(taken.length)}টি)।`);
    else if (due.length) med.lines.push(`${so}${bn(due.length)}টি ডোজের মধ্যে ${bn(taken.length)}টি খেয়েছেন।`);
    const PHRASE = {
      taken: (r) => (r.how === 'caregiver' ? `${who(r.by)} খাইয়ে দিয়েছেন (${bnTime(r.at)})` : `খেয়েছেন (${bnTime(r.at)})`),
      conflict: () => 'দুইবার লেখা হয়েছে, মিলিয়ে দেখুন',
      missed: () => 'উত্তর পাওয়া যায়নি, পরিবারকে জানানো হয়েছে',
      unsure: () => '“মনে নেই” বলেছেন, ছোটু অপেক্ষা করতে বলেছে',
      help: () => 'ওষুধের সময় সাহায্য চেয়েছেন',
      snoozed: () => '“এখনও খাইনি” বলেছেন',
      due: () => 'এখনও উত্তর আসেনি',
      upcoming: () => 'এখনও সময় হয়নি',
    };
    for (const d of all) {
      const st = doseStatus(d, now, state.doses);
      med.lines.push(`${bnTime(d.at)}: ${d.med.short}, ${PHRASE[st](state.doses[d.key])}`);
    }
    for (const r of elder.regimens.filter((x) => x.asNeeded && x.status === 'active')) {
      const times = prnTimes(state, r, day);
      const name = meds[r.medId]?.short;
      if (!times.length) { med.lines.push(`প্রয়োজনের ওষুধ (${name}) নেননি।`); continue; }
      const broke = state.alerts.some((a) => a.kind === 'prn' && a.elderId === elder.id && inDay(a.createdAt, day));
      med.lines.push(`প্রয়োজনের ওষুধ (${name}) ${bn(times.length)} বার নিয়েছেন: ${times.map(bnTime).join(', ')}।${broke ? ' একবার পরিবারের দেওয়া নিয়মের বাইরে নেওয়া হয়েছে।' : ''}`);
    }
  }
  sections.push(med);

  // Health and habits (afternoon check-in)
  const wb = { heading: 'শরীর ও অভ্যাস', icon: 'clock', lines: [] };
  if (consent.wellbeing === false) wb.lines.push(`${elder.name} শরীরের খবর শেয়ার করা বন্ধ রেখেছেন।`);
  else {
    const rec = state.checkins?.[checkinKey(elder.id, day)];
    if (rec) {
      wb.lines.push(`বিকেলের কথা (${bnTime(rec.at)}):`);
      for (const q of QUESTIONS) {
        const v = rec.answers[q.key];
        wb.lines.push(`${q.bn}: ${answerText(q.key, v)}${rec.said?.[q.key] ? ` (“${rec.said[q.key]}”)` : ''}`);
      }
    } else if (day === today && now < checkinAt(elder, day) + CHECKIN_WINDOW) {
      wb.lines.push(`বিকেলের কথা এখনও হয়নি (${bnTime(checkinAt(elder, day))}-এ হবে)।`);
    } else wb.lines.push('এই দিন বিকেলের কথা হয়নি।');
    for (const l of painMentions(state, elder, day)) wb.lines.push(`${bnTime(l.at)}: ${l.text}`);
  }
  sections.push(wb);

  // Alerts
  const alerts = state.alerts.filter((a) => a.elderId === elder.id && inDay(a.createdAt, day));
  sections.push({
    heading: 'সতর্কতা', icon: 'bell',
    lines: alerts.length
      ? alerts.map((a) => `${bnTime(a.createdAt)}: ${alertLabel(a)} · ${a.resolvedAt ? 'মিটে গেছে' : a.handledBy ? `${who(a.handledBy)} দেখছেন` : 'এখনও কেউ দেখেননি'}`)
      : ['কোনো সতর্কতা ছিল না।'],
  });

  // Notes
  const notes = state.notes.filter((n) => n.elderId === elder.id && inDay(n.at, day));
  sections.push({ heading: 'পরিবারের নোট', icon: 'doc', lines: notes.length ? notes.map((n) => `${who(n.by)}: ${n.text}`) : ['এই দিনে কোনো নোট নেই।'] });

  const title = `${elder.gen} ${day === today ? 'আজকের' : day === today - 1 ? 'গতকালের' : relDay(day, today) + 'র'} সারাংশ`;
  return { title, sections };
}

// ---------- the last 7 (or 28) days ----------
export function buildWeek(state, elder, meds, n = 7) {
  const today = dayOf(state.clock);
  const days = Array.from({ length: n }, (_, i) => today - n + 1 + i);
  const span = n === 7 ? '৭ দিন' : `${bn(n / 7)} সপ্তাহ`;
  const consent = state.consent?.[elder.id] || {};
  const sections = [];
  const notice = []; // "worth noticing": plain facts and simple patterns, no advice

  // Medicines: adherence overall and per medicine
  const med = { heading: `ওষুধ (${span})`, icon: 'check', lines: [] };
  if (consent.medication === false) med.lines.push(`${elder.name} ওষুধ খাওয়ার খবর শেয়ার করা বন্ধ রেখেছেন।`);
  else {
    const all = days.flatMap((d) => dayDoses(state, elder, d, meds));
    const ok = all.filter((d) => ['taken', 'conflict'].includes(d.st));
    const missed = all.filter((d) => d.st === 'missed');
    const unsure = all.filter((d) => d.st === 'unsure');
    med.lines.push(`${bn(all.length)}টি ডোজের মধ্যে ${bn(ok.length)}টি খেয়েছেন (${bn(pct(ok.length, all.length))}%)।`);
    const byMed = new Map();
    for (const d of all) {
      const k = d.med.short;
      const m = byMed.get(k) || { n: 0, ok: 0 };
      m.n += 1; if (['taken', 'conflict'].includes(d.st)) m.ok += 1;
      byMed.set(k, m);
    }
    for (const [name, m] of byMed) med.lines.push(`${name}: ${bn(m.n)}টির মধ্যে ${bn(m.ok)}টি`);
    for (const r of elder.regimens.filter((x) => x.asNeeded && x.status === 'active')) {
      const per = days.map((d) => prnTimes(state, r, d).length);
      const total = per.reduce((a, b) => a + b, 0);
      med.lines.push(`প্রয়োজনের ওষুধ (${meds[r.medId]?.short}): ${bn(total)} বার, ${bn(per.filter(Boolean).length)} দিনে।`);
      const broke = state.alerts.filter((a) => a.kind === 'prn' && a.elderId === elder.id && days.includes(dayOf(a.createdAt))).length;
      if (broke) notice.push(`প্রয়োজনের ওষুধ ${bn(broke)} বার পরিবারের দেওয়া নিয়মের বাইরে নেওয়া হয়েছে।`);
    }
    if (missed.length) notice.push(`${bn(missed.length)}টি ডোজের উত্তর পাওয়া যায়নি (${[...new Set(missed.map((d) => relDay(dayOf(d.at), today)))].join(', ')})।`);
    if (unsure.length) notice.push(`${bn(unsure.length)} বার ওষুধ খাওয়ার কথা মনে করতে পারেননি।`);
  }
  sections.push(med);

  // Health and habits: day-by-day grid plus counts
  let grid = null;
  const wb = { heading: `শরীর ও অভ্যাস (${span})`, icon: 'clock', lines: [] };
  if (consent.wellbeing === false) wb.lines.push(`${elder.name} শরীরের খবর শেয়ার করা বন্ধ রেখেছেন।`);
  else {
    const recs = days.map((d) => state.checkins?.[checkinKey(elder.id, d)] || null);
    if (n === 7) grid = days.map((d, i) => ({ label: d === today ? 'আজ' : d === today - 1 ? 'গত' : `-${bn(today - d)}`, rec: recs[i] }));
    const talked = recs.filter(Boolean);
    const count = (key, val) => talked.filter((r) => r.answers[key] === val).length;
    const answered = (key) => talked.filter((r) => r.answers[key] != null).length;
    wb.lines.push(`বিকেলের কথা হয়েছে ${bn(talked.length)} দিন।`);
    if (talked.length) {
      wb.lines.push(`শরীর: ${bn(count('feeling', 'good'))} দিন ভালো, ${bn(count('feeling', 'unwell'))} দিন ভালো নেই, ${bn(count('feeling', 'pain'))} দিন ব্যথার কথা।`);
      wb.lines.push(`হাঁটা: ${bn(answered('walk'))} দিনের মধ্যে ${bn(count('walk', true))} দিন হেঁটেছেন।`);
      wb.lines.push(`পানি: ${bn(answered('water'))} দিনের মধ্যে ${bn(count('water', true))} দিন পর্যাপ্ত পানি খেয়েছেন।`);
      wb.lines.push(`ঘুম: ${bn(answered('sleep'))} রাতের মধ্যে ${bn(count('sleep', true))} রাত ভালো ঘুম হয়েছে।`);
    }
    // Simple, factual patterns
    const painDays = days.filter((d, i) => recs[i]?.answers.feeling === 'pain' || painMentions(state, elder, d).length);
    if (painDays.length >= 2) {
      const words = [...new Set(talked.filter((r) => r.answers.feeling === 'pain').map((r) => r.said?.feeling).filter(Boolean))].slice(0, 2).map((w) => `“${w}”`).join(', ');
      notice.push(`${bn(painDays.length)} দিন ব্যথার কথা বলেছেন (শেষ: ${relDay(painDays.at(-1), today)})${words ? `: ${words}` : ''}।`);
    }
    const last3 = recs.slice(-3).filter(Boolean);
    const badSleep = last3.filter((r) => r.answers.sleep === false).length;
    if (badSleep >= 2) notice.push(`শেষ ${bn(last3.length)} দিনের মধ্যে ${bn(badSleep)} রাত ভালো ঘুম হয়নি।`);
    const walked = count('walk', true);
    if (talked.length >= 4 && walked <= Math.floor(talked.length / 2)) notice.push(`হাঁটা কম হয়েছে (${bn(talked.length)} দিনের মধ্যে ${bn(walked)} দিন)।`);
    const lowWater = count('water', false);
    if (lowWater >= 3) notice.push(`${bn(lowWater)} দিন পানি কম খেয়েছেন বলেছেন।`);
    const unwellDays = count('feeling', 'unwell');
    if (unwellDays >= 2) notice.push(`${bn(unwellDays)} দিন শরীর ভালো নেই বলেছেন।`);
  }
  sections.push(wb);

  // Alerts in the week
  const alerts = state.alerts.filter((a) => a.elderId === elder.id && days.includes(dayOf(a.createdAt)));
  const kinds = new Map();
  for (const a of alerts) kinds.set(alertLabel(a), (kinds.get(alertLabel(a)) || 0) + 1);
  sections.push({
    heading: `সতর্কতা (${span})`, icon: 'bell',
    lines: alerts.length ? [...kinds].map(([k, n]) => `${k}: ${bn(n)} বার`) : ['কোনো সতর্কতা ছিল না।'],
  });

  sections.unshift({ heading: 'লক্ষ্য করার মতো', icon: 'alert', lines: notice.length ? notice : ['বিশেষ কিছু চোখে পড়েনি।'], highlight: notice.length > 0 });
  return { title: `${elder.gen} গত ${span}ের সারাংশ`, sections, grid };
}

// ---------- screen ----------
const MARK = (key, v) => {
  if (v == null) return { t: '–', c: '' };
  if (key === 'feeling') return v === 'good' ? { t: 'ভালো', c: 'ok' } : v === 'pain' ? { t: 'ব্যথা', c: 'bad' } : { t: 'খারাপ', c: 'warn' };
  return v ? { t: '✓', c: 'ok' } : { t: '✗', c: 'warn' };
};

export default function Summary({ onBack, toast }) {
  const { state } = useStore();
  const meds = useMeds();
  const [elderId, setElderId] = useState(state.elders[0].id);
  const today = dayOf(state.clock);
  const [view, setView] = useState('today'); // today | yesterday | week | month
  const elder = state.elders.find((e) => e.id === elderId);
  const s = view === 'week' ? buildWeek(state, elder, meds) : view === 'month' ? buildWeek(state, elder, meds, 28)
    : buildDay(state, elder, view === 'today' ? today : today - 1, meds);
  const facts = buildFacts(state, elder, meds, view);
  const ai = useAiSummary(elder.id, view, facts);

  const copy = async () => {
    const a = ai.data;
    const top = a ? [a.headline, a.summary, ...a.signals.map((x) => `• ${x.text} (${x.evidence})`), ...a.tips.map((t) => `→ ${t}`), ''] : [];
    const text = [s.title, ...top, ...s.sections.flatMap((x) => [`\n${x.heading}`, ...x.lines.map((l) => `• ${l}`)]), '\n(ছোটুর রেকর্ড থেকে তৈরি, চিকিৎসা পরামর্শ নয়)'].join('\n');
    try { await navigator.clipboard.writeText(text); toast('সারাংশ কপি হয়েছে, এখন যেকোনো জায়গায় পাঠাতে পারেন'); }
    catch { toast('কপি করা গেল না'); }
  };

  return (
    <div className="scr care">
      <ScreenHeader title="সারাংশ" onBack={onBack} />
      <div className="row" style={{ gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {state.elders.map((e) => (
          <button key={e.id} type="button" className={'chip-sel' + (e.id === elderId ? ' on' : '')} onClick={() => setElderId(e.id)}>
            <Avatar person={e} size={28} /> {e.name}
          </button>
        ))}
        <span className="grow" />
        {[['yesterday', 'গতকাল'], ['today', 'আজ'], ['week', '৭ দিন'], ['month', '৪ সপ্তাহ']].map(([v, label]) => (
          <button key={v} type="button" className={'chip-sel' + (v === view ? ' on' : '')} onClick={() => setView(v)}>{label}</button>
        ))}
      </div>
      <div className="body" style={{ gap: 10 }}>
        <div style={{ fontSize: 21, fontWeight: 700, color: '#0B2F8A' }}>{s.title}</div>
        <AiCard ai={ai} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#425A80', marginTop: 4 }}>বিস্তারিত তথ্য (ছোটুর রেকর্ড)</div>
        {s.sections.map((x) => (
          <div key={x.heading} className="card" style={{ gap: 6, padding: 12, ...(x.highlight ? { background: '#FCEBC8', borderColor: '#F1C979' } : {}) }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: x.highlight ? '#7A4A00' : '#425A80' }}>{x.heading}</div>
            {x.lines.map((l, i) => <div key={i} style={{ fontSize: 16, lineHeight: 1.5 }}>{x.highlight ? '• ' : ''}{l}</div>)}
            {x.heading.startsWith('শরীর ও অভ্যাস') && s.grid && (
              <table className="habit-grid">
                <thead><tr><th />{s.grid.map((g) => <th key={g.label}>{g.label}</th>)}</tr></thead>
                <tbody>
                  {QUESTIONS.map((q) => (
                    <tr key={q.key}>
                      <th>{q.short}</th>
                      {s.grid.map((g) => { const m = MARK(q.key, g.rec?.answers[q.key]); return <td key={g.label} className={m.c}>{m.t}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
        <div className="t-sub" style={{ fontSize: 13.5, textAlign: 'center' }}>
          উপরের সারাংশ এআই (Gemini) লিখেছে, শুধু ছোটুর রেকর্ড আর {elder.gen} সম্মতি অনুযায়ী তথ্য থেকে। নিচের তথ্য রেকর্ড থেকে সরাসরি। কোনোটিই রোগ নির্ণয় বা চিকিৎসা পরামর্শ নয়; ডাক্তারের কাছে গেলে এই সারাংশ দেখাতে পারেন।
        </div>
      </div>
      <button type="button" className="btn-wide ghost" style={{ flexShrink: 0 }} onClick={copy}>
        <Icon name="doc" size={20} /> সারাংশ কপি করুন
      </button>
    </div>
  );
}

// ---------- AI summary ----------
const cache = new Map(); // same facts -> same summary, without asking again
const loadCache = () => { try { return JSON.parse(sessionStorage.getItem('chotu-ai-summary') || '{}'); } catch { return {}; } };
const saveCache = (k, v) => { try { const all = loadCache(); all[k] = v; sessionStorage.setItem('chotu-ai-summary', JSON.stringify(all)); } catch { /* not saved */ } };

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h.toString(36);
}

function useAiSummary(elderId, period, facts) {
  const body = JSON.stringify({ period, facts });
  const key = `${elderId}|${period}|${hash(body)}`;
  const [res, setRes] = useState({ key: null, status: 'loading', data: null });
  const [again, setAgain] = useState(0);
  useEffect(() => {
    const hit = !again && (cache.get(key) || loadCache()[key]);
    if (hit) { setRes({ key, status: 'ok', data: hit }); return undefined; }
    let live = true;
    setRes({ key, status: 'loading', data: null });
    fetch('/api/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j; })
      .then((j) => { cache.set(key, j); saveCache(key, j); if (live) setRes({ key, status: 'ok', data: j }); })
      .catch((e) => { if (live) setRes({ key, status: 'error', data: null, error: String(e.message || e) }); });
    return () => { live = false; };
  }, [key, again]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = res.key === key ? res : { status: 'loading', data: null };
  return { ...current, retry: () => setAgain((n) => n + 1) };
}

function AiCard({ ai }) {
  if (ai.status === 'loading') {
    return (
      <div className="card ai-card" aria-live="polite">
        <div className="ai-tag">ছোটুর সারাংশ · AI</div>
        <div className="ai-skel" /><div className="ai-skel" style={{ width: '70%' }} />
        <div className="t-sub" style={{ fontSize: 14 }}>রেকর্ড পড়ে সারাংশ লেখা হচ্ছে…</div>
      </div>
    );
  }
  if (ai.status === 'error') {
    return (
      <div className="card ai-card">
        <div className="ai-tag">ছোটুর সারাংশ · AI</div>
        <div style={{ fontSize: 16, lineHeight: 1.5 }}>এআই সারাংশ এখন পাওয়া যাচ্ছে না (ইন্টারনেট বা এআই ব্যস্ত)। নিচের তথ্য রেকর্ড থেকে, সেটি ঠিক আছে।</div>
        <button type="button" className="chip-sel" style={{ alignSelf: 'flex-start' }} onClick={ai.retry}>আবার চেষ্টা করুন</button>
      </div>
    );
  }
  const a = ai.data;
  return (
    <div className="card ai-card" aria-live="polite">
      <div className="row"><div className="ai-tag grow">ছোটুর সারাংশ · AI</div><button type="button" className="chip-sel" style={{ minHeight: 34, fontSize: 13.5 }} onClick={ai.retry}>আবার লিখুন</button></div>
      <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.45, color: '#10213F' }}>{a.headline}</div>
      <div style={{ fontSize: 16, lineHeight: 1.6 }}>{a.summary}</div>
      {a.signals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="ai-sub">লক্ষ্য করার মতো</div>
          {a.signals.map((x, i) => (
            <div key={i} className={'signal ' + x.kind}>
              <b>{x.kind === 'good' ? '✓ ' : '! '}{x.text}</b>
              <span>{x.evidence}</span>
            </div>
          ))}
        </div>
      )}
      {a.tips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="ai-sub">পরিবার যা করতে পারেন</div>
          {a.tips.map((t, i) => <div key={i} className="tip">{t}</div>)}
        </div>
      )}
    </div>
  );
}
