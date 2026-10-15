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
    title: 'Time is simulated',
    bn: 'সময় এগিয়ে নিন',
    text: 'The demo starts at 7:50 AM. Open Demo settings → Time to move the clock, or press “Next dose”. At 8:00 Chotu speaks to Baba by himself.',
  },
  {
    title: 'Baba answers by voice',
    bn: '“খেয়েছি”, “মনে নেই”, “সাহায্য চাই”…',
    text: 'Turn on the microphone in Demo settings → Live voice and speak Bangla, or use the “Elder answers” buttons there to answer for Baba. Big buttons appear on his phone only if he cannot answer twice.',
  },
  {
    title: 'Explore',
    bn: 'নিজে ঘুরে দেখুন',
    text: 'Try adding a medicine on Shumon’s phone, the red emergency button on Baba’s phone, or the সারাংশ (summary) tab. Everything is sample data, and Reset demo (in Demo settings) starts again.',
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
