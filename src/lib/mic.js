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
  if (!ctx) ctx = new AudioContext();
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
 */
export function recordAnswer({ maxMs = 8000, silenceMs = 1300, startTimeoutMs = 6000, threshold = 0.025, onLevel, signal } = {}) {
  return new Promise((resolve) => {
    const source = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const chunks = [];
    const t0 = performance.now();
    let spokeAt = null;
    let lastLoud = null;
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
      if (rms > threshold) { lastLoud = now; if (!spokeAt) spokeAt = now; }
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
export async function understandClip(wav, context) {
  const r = await fetch('/api/understand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  // Downsample to 16 kHz by averaging.
  const ratio = rate / TARGET_RATE;
  const outLen = Math.floor(all.length / ratio);
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio), end = Math.min(all.length, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let j = start; j < end; j++) s += all[j];
    const v = Math.max(-1, Math.min(1, s / Math.max(1, end - start)));
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
