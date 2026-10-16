// Live microphone for the elder phone.
// Records one short answer (stops after a pause, or at most a few seconds), makes a small WAV file,
// and asks our own server (/api/understand) what it means. The browser never sees the API key.

const TARGET_RATE = 16000; // 16 kHz mono is plenty for speech and keeps uploads small

let stream = null;
let ctx = null;

/** Ask for microphone permission. Must be called from a click (browsers require a first touch). */
export async function enableMic() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use the microphone here.');
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
  }
  // Record at 16 kHz directly: the browser's own resampling is cleaner than ours. Older browsers fall back.
  if (!ctx) { try { ctx = new AudioContext({ sampleRate: TARGET_RATE }); } catch { ctx = new AudioContext(); } }
  if (ctx.state === 'suspended') await ctx.resume();
}

export function disableMic() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

export const micReady = () => Boolean(stream);

/**
 * Record until the speaker pauses. Resolves { wav: base64 | null, spoke: boolean }.
 * `signal.aborted` stops early (e.g. the presenter used a chip instead).
 * "Speaking" is judged against the room's own background noise (measured in the first moments), not a fixed
 * loudness, so soft voices and a phone held further away still count. The pause allowed mid-answer is generous,
 * because older speakers often stop and think ("হ্যাঁ… খেয়েছি").
 */
export function recordAnswer({ maxMs = 9000, silenceMs = 1900, startTimeoutMs = 6000, minThreshold = 0.006, onLevel, signal } = {}) {
  return new Promise((resolve) => {
    const source = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(ctx.sampleRate > 24000 ? 2048 : 1024, 1, 1); // ~40-60 ms steps
    const chunks = [];
    const t0 = performance.now();
    let spokeAt = null;
    let lastLoud = null;
    let loudRun = 0; // consecutive loud steps: one click or bump is not speech
    let noise = null; // background level, learned while nobody speaks
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      proc.disconnect();
      source.disconnect();
      if (!spokeAt || signal?.aborted) return resolve({ wav: null, spoke: Boolean(spokeAt) });
      resolve({ wav: toWavBase64(chunks, ctx.sampleRate), spoke: true });
    };

    proc.onaudioprocess = (e) => {
      if (done) return;
      const data = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      onLevel?.(rms);
      const now = performance.now();
      if (noise == null) noise = Math.min(rms, 0.008); // the first moment may already be speech: don't trust it fully
      const threshold = Math.min(0.025, Math.max(minThreshold, noise * 2.5)); // never stricter than the old fixed level
      if (rms > threshold) {
        loudRun += 1;
        lastLoud = now;
        if (!spokeAt && loudRun >= 2) spokeAt = now;
      } else {
        loudRun = 0;
        if (!spokeAt) noise = noise * 0.9 + rms * 0.1; // keep learning the room while waiting
      }
      if (signal?.aborted) return finish();
      if (!spokeAt && now - t0 > startTimeoutMs) return finish(); // nobody spoke
      if (spokeAt && now - lastLoud > silenceMs) return finish(); // they paused: answer over
      if (now - t0 > maxMs) return finish();
    };
    source.connect(proc);
    proc.connect(ctx.destination); // needed for the processor to run; it outputs silence
  });
}

/** Send the clip to our server. Resolves { intent, confidence, transcript } or throws with a readable message. */
// Microphone passcode for the hosted version (kept for this browser tab only).
const PASS_KEY = 'chotu-mic-pass';
const getPass = () => { try { return sessionStorage.getItem(PASS_KEY) || ''; } catch { return ''; } };

/** Check a passcode with the server; remembers it for this tab when it is right. */
export async function checkPasscode(code) {
  const r = await fetch('/api/understand', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-passcode': code }, body: JSON.stringify({ check: true }),
  });
  if (!r.ok) return false;
  try { sessionStorage.setItem(PASS_KEY, code); } catch { /* not remembered */ }
  return true;
}

export async function understandClip(wav, context) {
  const r = await fetch('/api/understand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-passcode': getPass() },
    body: JSON.stringify({ audio: wav, mimeType: 'audio/wav', context }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Server error ${r.status}`);
  return data;
}

export async function voiceStatus() {
  try {
    const r = await fetch('/api/status');
    return r.ok ? await r.json() : { voiceReady: false };
  } catch {
    return { voiceReady: false };
  }
}

// ---------- WAV encoding ----------
function toWavBase64(chunks, rate) {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const all = new Float32Array(total);
  let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.length; }

  // Make quiet recordings louder (up to 8x) so Gemini hears soft voices clearly.
  let peak = 0;
  for (let i = 0; i < all.length; i++) peak = Math.max(peak, Math.abs(all[i]));
  const gain = peak > 0 ? Math.min(8, 0.9 / peak) : 1;

  // Downsample to 16 kHz by averaging (does nothing when the browser already recorded at 16 kHz).
  const ratio = rate / TARGET_RATE;
  const outLen = Math.floor(all.length / ratio);
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio), end = Math.min(all.length, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let j = start; j < end; j++) s += all[j];
    const v = Math.max(-1, Math.min(1, (gain * s) / Math.max(1, end - start)));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }

  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, TARGET_RATE, true); v.setUint32(28, TARGET_RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);

  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
