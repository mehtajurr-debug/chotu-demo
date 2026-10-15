// Chotu's voice: Bangla lines from lines.json, played from audio/ clips when they exist.
// The caption is always shown, so the demo works with no audio at all.
import LINES from '../../lines.json';

const BY_ID = Object.fromEntries(LINES.lines.map((l) => [l.id, l]));

export function lineText(id, elder) {
  const l = BY_ID[id];
  if (!l) return id;
  return l.text.replace('{name}', elder.name);
}

const clipId = (id, elderId) => (BY_ID[id]?.per_elder ? `${id}_${elderId}` : id);

// manifest.json is written by generate_voice.py. Missing file = no clips yet, which is fine.
let manifest = {};
fetch('/audio/manifest.json')
  .then((r) => (r.ok ? r.json() : {}))
  .then((m) => { manifest = m || {}; })
  .catch(() => {});

export const hasClips = () => Object.keys(manifest).length > 0;

// Browsers only allow sound after the first touch or click on the page.
let unlocked = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { unlocked = true; }, { capture: true });
}

let current = null;
export function stopSpeaking() {
  if (current) { current.pause(); current = null; }
}

/** Speak a line. Calls onEnd when the clip ends, or after a reading-time pause when there is no clip. Returns a cancel function. */
export function speak(id, elder, onEnd) {
  stopSpeaking();
  const text = lineText(id, elder);
  const fallbackMs = Math.min(5200, 1400 + text.length * 45);
  let done = false;
  let timer = null;
  const finish = () => { if (!done) { done = true; clearTimeout(timer); onEnd?.(); } };

  const entry = manifest[clipId(id, elder.id)];
  if (entry && unlocked) {
    const audio = new Audio('/' + entry.file);
    current = audio;
    audio.onended = finish;
    audio.onerror = () => { timer = setTimeout(finish, fallbackMs); };
    audio.play().catch(() => { timer = setTimeout(finish, fallbackMs); });
    timer = setTimeout(finish, 15000); // safety net if the clip never ends
  } else {
    timer = setTimeout(finish, fallbackMs);
  }
  return () => { done = true; clearTimeout(timer); stopSpeaking(); };
}

// ---------- simulated voice (presenter panel -> elder phone) ----------
// In this build nothing listens to a real microphone. The presenter picks what the elder "says".

export const UTTERANCES = {
  took: { text: 'খেয়েছি', intent: 'took', en: 'I took it' },
  took_reg: { text: 'হ, খাইছি', intent: 'took', en: 'I took it (regional wording)' },
  not_yet: { text: 'এখনও খাইনি', intent: 'not_yet', en: 'Not yet' },
  forgot: { text: 'মনে নেই', intent: 'forgot', en: "I don't remember" },
  help: { text: 'আমাকে একটু সাহায্য করুন', intent: 'help', en: 'Please help me' },
  unclear: { text: 'হুঁ… ওই যে… খাইলাম মনে হয়', intent: 'took', lowConfidence: true, en: 'Mumbled, not sure (low confidence)' },
  yes: { text: 'হ্যাঁ', intent: 'yes', en: 'Yes' },
  no: { text: 'না', intent: 'no', en: 'No' },
  silent: { text: '', intent: 'silent', en: 'Stays silent' },
};

const bus = new EventTarget();
export function sayAsElder(key) {
  bus.dispatchEvent(new CustomEvent('say', { detail: { key, ...UTTERANCES[key] } }));
}
export function onElderSays(fn) {
  const h = (e) => fn(e.detail);
  bus.addEventListener('say', h);
  return () => bus.removeEventListener('say', h);
}
