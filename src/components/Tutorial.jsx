// Short tutorial shown on the first visit (and again from Demo settings). After that, people explore on their own.
import { useState } from 'react';

const STEPS = [
  {
    title: 'Meet Chotu',
    bn: 'ছোটু: বয়স্কদের জন্য বাংলা ভয়েস সঙ্গী',
    text: 'Chotu reminds older adults in Bangladesh to take their medicines by voice, checks how they are, and keeps the family informed. This demo shows two phones: Baba’s (the elder) and Shumon’s (his son, the caregiver).',
    img: '/img/logo.png',
  },
  {
    title: 'Switch between the phones',
    bn: 'বাবার ফোন · শুমনের ফোন · দুটোই',
    text: 'Use the switch at the top to look at Baba’s phone, Shumon’s phone, or both side by side. A red dot tells you when something new arrived on the other phone.',
  },
  {
    title: 'The clock only moves when you move it',
    bn: 'সময় এগিয়ে নিন',
    text: 'The demo starts on Day 1 at 7:50 AM, 10 minutes before Baba’s 8:00 medicine. Real time does not move it. Open Demo settings → Time and press +10 min, +30 min, +1 hour or “Go to time”, or press “Next dose” to jump straight to the next medicine.',
  },
  {
    title: 'What happens at medicine time',
    bn: 'উত্তর না দিলে কী হয়',
    text: 'If Baba does not answer, Chotu follows these steps (all in demo minutes):',
    list: [
      '8:00: Chotu speaks to Baba by itself and listens for his answer.',
      '+10 and +20 min: the reminder is repeated.',
      '+30 min: the family is alerted, starting with the first caregiver.',
      'No “আমি দেখছি” (I’m handling it) within 10 more minutes: the next caregiver is told, then everyone.',
    ],
    tip: 'Try it: press “Next dose”, stay silent, then press +10 min three times.',
  },
  {
    title: 'Baba answers by voice',
    bn: '“খেয়েছি”, “মনে নেই”, “সাহায্য চাই”…',
    text: 'Turn on the microphone in Demo settings → Live voice (use Chrome and allow the microphone), wait until Chotu finishes speaking, then answer in Bangla. Understanding takes about 2 to 10 seconds while the screen shows “বুঝছি…”. No microphone? Use the “Baba answers” buttons in Demo settings. Big buttons appear on Baba’s phone only if he cannot answer twice.',
  },
  {
    title: 'What is live and what is sample',
    bn: 'কোনটা আসল, কোনটা নমুনা',
    text: 'Live AI: voice understanding, reading a printed prescription photo on Shumon’s phone (about 5 to 20 seconds), and the AI summary. Simulated: the 4 weeks of history, the clock, and alerts passing between the two phones.',
    tip: 'The AI runs on a free service that is sometimes busy. If it is slow or fails, wait a minute and try again, or use the buttons.',
  },
  {
    title: 'Explore',
    bn: 'নিজে ঘুরে দেখুন',
    text: 'Try adding a medicine on Shumon’s phone, the red emergency button on Baba’s phone, or the সারাংশ (summary) tab. Everything is sample data that stays in your own browser, and Reset demo (in Demo settings) starts again. This guide is under Demo settings → Show the tutorial again.',
  },
];

export default function Tutorial({ onClose }) {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div className="tut-back" role="dialog" aria-modal="true" aria-labelledby="tut-title">
      <div className="tut">
        {s.img && <img src={s.img} alt="" width="72" height="72" className="tut-img" />}
        <div className="tut-step">{i + 1} / {STEPS.length}</div>
        <h2 id="tut-title">{s.title}</h2>
        <div className="tut-bn">{s.bn}</div>
        <p>{s.text}</p>
        {s.list && <ul className="tut-list">{s.list.map((x) => <li key={x}>{x}</li>)}</ul>}
        {s.tip && <p className="tut-tip">{s.tip}</p>}
        <div className="tut-dots" aria-hidden="true">{STEPS.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="tut-btns">
          <button type="button" className="btn" onClick={onClose}>Skip</button>
          <span className="grow" />
          {i > 0 && <button type="button" className="btn" onClick={() => setI(i - 1)}>Back</button>}
          <button type="button" className="btn pri" onClick={() => (last ? onClose() : setI(i + 1))} autoFocus>{last ? 'Start exploring' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
}
