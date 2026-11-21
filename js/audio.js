// Tiny sound effects made in code (no sound files to download).
import { save } from './storage.js';

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// a little "meow": pitch goes up then down
function meow(vol) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, t0);
  osc.frequency.linearRampToValueAtTime(900, t0 + 0.15);
  osc.frequency.linearRampToValueAtTime(450, t0 + 0.45);
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  osc.connect(filter).connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + 0.55);
}

// a short burst of rushing noise (splash, paddle)
let noiseBuf = null;
function noiseBuffer(a) {
  if (!noiseBuf) {
    const n = a.sampleRate * 2;
    noiseBuf = a.createBuffer(1, n, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function swish(freq, dur, vol, start = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const f = a.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0, Math.random());
  src.stop(t0 + dur + 0.05);
}
function sweep(from, to, start, dur, vol) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  chime: () => [1568, 2093, 1760, 2349].forEach((f, i) => tone(f, i * 0.12, 0.5, 'triangle', 0.05)),
  bubbles: () => { for (let i = 0; i < 5; i++) sweep(400 + Math.random() * 500, 1200 + Math.random() * 800, i * 0.11 + Math.random() * 0.05, 0.08, 0.07); },
  paddle: () => swish(700, 0.35, 0.12),
  splash: () => { swish(500, 0.9, 0.2); swish(1500, 0.6, 0.1, 0.1); },
  tweet: () => { sweep(2600, 3800, 0, 0.12, 0.05); sweep(2800, 4200, 0.18, 0.1, 0.05); },
  meow: (vol = 0.12) => meow(vol),
  pop: () => { tone(900, 0, 0.05, 'square', 0.1); tone(300, 0.03, 0.08, 'triangle', 0.1); },
  catch: () => tone(1200 + Math.random() * 400, 0, 0.09, 'triangle', 0.1),
  chest: () => [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.06, 0.25, 'triangle', 0.12)),
  click: () => tone(660, 0, 0.08, 'triangle', 0.12),
  correct: () => { tone(660, 0, 0.12, 'triangle'); tone(880, 0.1, 0.12, 'triangle'); tone(1320, 0.2, 0.25, 'triangle'); },
  wrong: () => { tone(330, 0, 0.18, 'sine', 0.14); tone(262, 0.15, 0.25, 'sine', 0.12); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.06); tone(1319, 0.07, 0.18, 'square', 0.06); },
  unlock: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.15)),
  whistle: () => { tone(2100, 0, 0.22, 'sine', 0.1); tone(2400, 0.28, 0.35, 'sine', 0.1); },
  fail: () => { tone(440, 0, 0.2, 'sine', 0.12); tone(392, 0.18, 0.2, 'sine', 0.12); tone(440, 0.36, 0.3, 'sine', 0.12); },
};

export function play(name, arg) {
  if (!save.settings.sound) return;
  try { SOUNDS[name]?.(arg); } catch (e) { /* sound is optional */ }
}

// Water you hear from a distance: a running noise loop whose loudness (0 to 1) is set every frame.
// It only starts once sound has been allowed by a tap, and goes quiet when sound is turned off.
const LOOPS = { stream: { type: 'bandpass', freq: 900, q: 0.6, max: 0.05 }, fall: { type: 'lowpass', freq: 1100, q: 0.5, max: 0.11 } };
const loops = {};
export function ambient(name, vol) {
  const want = save.settings.sound ? Math.max(0, Math.min(1, vol)) : 0;
  let L = loops[name];
  if (!L) {
    if (want < 0.01 || !ctx || ctx.state !== 'running') return;
    try {
      const cfg = LOOPS[name];
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = cfg.type; f.frequency.value = cfg.freq; f.Q.value = cfg.q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(ctx.destination);
      src.start();
      L = loops[name] = { g, max: cfg.max };
    } catch (e) { return; }
  }
  L.g.gain.setTargetAtTime(want * L.max, ctx.currentTime, 0.4);
}

// Browsers only allow sound after the first tap/click.
export function unlockAudio() { if (save.settings.sound) ac(); }
