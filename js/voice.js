// Spoken encouragement. Plays recordings listed in data/voice/voice.json if there are any,
// otherwise uses the phone's own text-to-speech voice (Malayalam if the phone has one, else English).
import { save } from './storage.js';

let clips = {};

export async function loadVoice() {
  try { clips = await (await fetch('data/voice/voice.json')).json(); } catch (e) { clips = {}; }
  window.speechSynthesis?.getVoices();   // starts loading the voice list early
}

const clean = (s) => String(s).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim();

function findVoice(lang) {
  const voices = window.speechSynthesis?.getVoices() || [];
  const want = lang === 'ml' ? ['ml'] : ['en-in', 'en-gb', 'en'];
  for (const w of want) {
    const v = voices.find((x) => x.lang.toLowerCase().replace('_', '-').startsWith(w));
    if (v) return v;
  }
  return null;
}

// kind: praise | tryAgain | pass | fail.  texts: { ml: '…', en: '…' } (the English one is the fallback)
export function say(kind, lang, texts) {
  if (save.settings.voice === false || !save.settings.sound || save.settings.a11y) return;   // the screen reader speaks in the accessibility mode
  const list = clips[lang]?.[kind];
  if (list?.length) {
    const file = list[Math.floor(Math.random() * list.length)];
    new Audio(`data/voice/${file}`).play().catch(() => {});
    return;
  }
  const synth = window.speechSynthesis;
  if (!synth) return;
  let voice = findVoice(lang);
  let text = texts[lang];
  if (!voice && lang === 'ml') { voice = findVoice('en'); text = texts.en; }
  if (!voice || !text) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(clean(text));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 1;
  u.pitch = 1.25;   // a little brighter and friendlier
  synth.speak(u);
}

// Reads a question aloud. Returns 'ok', 'noMl' (no Malayalam voice on this phone) or 'none' (no speech at all).
export function readAloud(text, lang) {
  const synth = window.speechSynthesis;
  if (!synth) return 'none';
  const voice = findVoice(lang);
  if (!voice) return lang === 'ml' ? 'noMl' : 'none';
  synth.cancel();
  const u = new SpeechSynthesisUtterance(clean(text));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.92;
  synth.speak(u);
  return 'ok';
}

export function stopReading() {
  window.speechSynthesis?.cancel();
}
