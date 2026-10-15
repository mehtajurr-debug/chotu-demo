// Backup voice-clip maker for when generate_voice.py's models hit the free-tier daily limit.
// Uses Gemini's preview TTS models (same "Sulafat" voice) and writes the same audio/<id>.wav files.
// Run:  node generate_voice_alt.mjs checkin_walk checkin_water ...   (then: node rebuild_manifest.mjs)
// Optional: MODEL=gemini-2.5-flash-preview-tts node generate_voice_alt.mjs <ids>
import fs from 'node:fs';

const key = (process.env.GEMINI_API_KEY || fs.readFileSync('.env', 'utf8').match(/GEMINI_API_KEY=(.*)/)?.[1] || '').trim();
if (!key) { console.error('No GEMINI_API_KEY in .env'); process.exit(1); }
const MODEL = process.env.MODEL || 'gemini-3.1-flash-tts-preview';
const STYLE = 'warm, calm and clear, speaking slowly like a caring family member';

const config = JSON.parse(fs.readFileSync('lines.json', 'utf8'));
const texts = {};
for (const l of config.lines) {
  if (l.per_elder) for (const [slug, name] of Object.entries(config.elders)) texts[`${l.id}_${slug}`] = l.text.replace('{name}', name);
  else texts[l.id] = l.text;
}

const wav = (pcm, rate = 24000) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};

for (const id of process.argv.slice(2)) {
  if (!texts[id]) { console.log(`skip   ${id} (not in lines.json)`); continue; }
  if (fs.existsSync(`audio/${id}.wav`)) { console.log(`skip   ${id} (exists)`); continue; }
  const body = {
    contents: [{ parts: [{ text: `Say in Bangla, ${STYLE}: ${texts[id]}` }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Sulafat' } } } },
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json();
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) { console.log(`FAILED ${id}: ${(j.error?.message || 'no audio returned').slice(0, 140)}`); if (r.status === 429) break; continue; }
  const rate = Number((part.inlineData.mimeType.match(/rate=(\d+)/) || [])[1]) || 24000;
  fs.writeFileSync(`audio/${id}.wav`, wav(Buffer.from(part.inlineData.data, 'base64'), rate));
  console.log(`made   ${id} (${MODEL})`);
  await new Promise((res) => setTimeout(res, 7000));
}
