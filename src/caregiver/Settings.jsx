// Caregiver settings: what each elder has agreed to share. Only the elder can change it, on their own phone.
import { useStore } from '../state/store.jsx';
import { bnWhen } from '../lib/time.js';
import { Avatar } from '../components/Phone.jsx';
import { ScreenHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const ITEMS = [
  { key: 'medication', label: 'ওষুধ খাওয়ার খবর' },
  { key: 'wellbeing', label: 'শরীর কেমন আছে' },
  { key: 'location', label: 'অবস্থান' },
];

export default function Settings({ onBack }) {
  const { state } = useStore();
  return (
    <div className="scr care">
      <ScreenHeader title="সেটিংস" onBack={onBack} />
      <div className="body" style={{ gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#425A80' }}>সম্মতি: কী কী শেয়ার করা হচ্ছে</div>
        {state.elders.map((e) => {
          const c = state.consent[e.id];
          return (
            <div key={e.id} className="card" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 12 }}>
                <Avatar person={e} size={48} />
                <div className="grow">
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{e.name}</div>
                  <div className="t-sub" style={{ fontSize: 14 }}>সম্মতি দিয়েছেন {bnWhen(c.agreedAt, state.clock)}</div>
                </div>
              </div>
              {ITEMS.map((it) => (
                <div key={it.key} className="kv" style={{ alignItems: 'center' }}>
                  <span>{it.label}</span>
                  <span className={'status ' + (c[it.key] ? 'ok' : '')} style={{ padding: '3px 10px', fontSize: 14.5 }}>
                    <Icon name={c[it.key] ? 'check' : 'x'} size={15} /> {c[it.key] ? 'শেয়ার করছেন' : 'বন্ধ'}
                  </span>
                </div>
              ))}
              <div className="kv"><span>সাহায্য ও জরুরি বার্তা</span><span style={{ color: '#17633F' }}>সবসময় আসবে</span></div>
            </div>
          );
        })}
        <div className="note-box">সম্মতি শুধু {state.elders.map((e) => e.name).join(' ও ')} নিজে তাঁদের ফোন থেকে বদলাতে পারবেন। অবস্থান শেয়ার এই ডেমোতে দেখানো হয় না।</div>
      </div>
    </div>
  );
}
