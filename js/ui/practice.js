// Quiz mode: plain practice without the 3D house. The child picks a subject, a chapter and how many
// questions; at the end they see their score, how they did in each chapter and what to look at again.
// Nothing about the session is saved (only the date the "more mock tests" link was last shown).
import { t, lang, pick, onLangChange } from '../i18n.js';
import { available, pickQuestions, easyToHard, toQuizItem } from '../questions.js';
import { save, persist } from '../storage.js';
import { openQuiz } from './quiz.js';
import { shortText } from '../progress.js';
import { LETTERS } from '../question-format.js';
import { play } from '../audio.js';
import { childName } from './guide.js';

const $ = (id) => document.getElementById(id);
const SUBJECTS = ['science', 'social', 'maths', 'malayalam', 'english', 'gk'];
const COUNTS = [10, 20, 50, 0];   // 0 = until the child stops
let chapterData = {};
let rooms = [];
let onExit = () => {};
let last = null;   // the settings of the last quiz, for "practise again"

export async function initPractice(opts) {
  rooms = opts.rooms;
  onExit = opts.onExit;
  try { chapterData = (await (await fetch('data/chapters.json')).json()).subjects || {}; } catch (e) { chapterData = {}; }
  $('pr-subject').addEventListener('change', fillChapters);
  $('pr-start').addEventListener('click', () => { play('click'); start(readChoice()); });
  $('pr-back').addEventListener('click', () => { play('click'); closeSetup(); onExit(); });
  onLangChange(() => { if (!$('practice').classList.contains('hidden')) fillAll(); });
}

export function openPractice() {
  $('practice').classList.remove('hidden');
  fillAll();
  $('pr-subject').focus();
}

function closeSetup() { $('practice').classList.add('hidden'); }

const subjectName = (s) => {
  const room = rooms.find((r) => r.subject === s);
  return room ? `${room.emoji} ${t('subj_' + s)}` : t('subj_' + s);
};

// The textbook chapter a question belongs to: { key, en, ml, order } or null when it has none.
function chapterOf(q) {
  const c = q.chapter;
  if (!c) return null;
  const name = typeof c === 'string' ? c : (c.en || c.ml || '');
  const low = name.trim().toLowerCase();
  const list = chapterData[q.subject] || [];
  const i = list.findIndex((ch) => ch.match.includes(low));
  if (i >= 0) return { key: `${q.subject}#${i}`, en: list[i].en, ml: list[i].ml, order: i };
  return { key: `${q.subject}~${low}`, en: typeof c === 'string' ? c : c.en || c.ml, ml: typeof c === 'string' ? c : c.ml || c.en, order: 1000 };
}

// Chapters of a subject that have questions in this language, in textbook order, with how many.
function chaptersFor(subject) {
  const map = new Map();
  for (const q of available(subject, lang())) {
    const ch = chapterOf(q);
    if (!ch) continue;
    const e = map.get(ch.key) || { ...ch, n: 0 };
    e.n++;
    map.set(ch.key, e);
  }
  return [...map.values()].sort((a, b) => a.order - b.order || pick(a).localeCompare(pick(b)));
}

function fillAll() {
  const sel = $('pr-subject');
  const keep = sel.value || last?.subject || 'science';
  sel.innerHTML = '';
  for (const s of SUBJECTS) {
    const n = available(s, lang()).length;
    if (!n) continue;
    const o = new Option(`${subjectName(s)} (${n})`, s);
    sel.add(o);
  }
  sel.value = [...sel.options].some((o) => o.value === keep) ? keep : sel.options[0]?.value;
  const cnt = $('pr-count');
  const keepCount = cnt.value || String(last?.count ?? 20);
  cnt.innerHTML = '';
  for (const c of COUNTS) cnt.add(new Option(c ? String(c) : t('practiceUntilStop'), String(c)));
  cnt.value = keepCount;
  fillChapters();
}

function fillChapters() {
  const subject = $('pr-subject').value;
  const sel = $('pr-chapter');
  const keep = sel.value || (last?.subject === subject ? last.chapter : '');
  sel.innerHTML = '';
  sel.add(new Option(`${t('practiceAllChapters')} (${available(subject, lang()).length})`, ''));
  for (const ch of chaptersFor(subject)) sel.add(new Option(`${pick(ch)} (${ch.n})`, ch.key));
  sel.value = [...sel.options].some((o) => o.value === keep) ? keep : '';
}

const readChoice = () => ({ subject: $('pr-subject').value, chapter: $('pr-chapter').value, count: Number($('pr-count').value) });

const ENDLESS_BLOCK = 10;   // "until I stop" goes easy to hard in blocks of this many

// Easy to hard; a long "until I stop" quiz starts again from easy every few questions.
function inOrder(picked, endless) {
  if (!endless) return easyToHard(picked);
  const out = [];
  for (let i = 0; i < picked.length; i += ENDLESS_BLOCK) out.push(...easyToHard(picked.slice(i, i + ENDLESS_BLOCK)));
  return out;
}

// Only which questions were asked is kept, so the next quiz brings new ones. Scores are not saved.
function remember(item) {
  save.seen[item.id] = (save.seen[item.id] || 0) + 1;
  persist();
}

function start(choice) {
  last = choice;
  const pool = available(choice.subject, lang()).filter((q) => !choice.chapter || chapterOf(q)?.key === choice.chapter);
  if (!pool.length) return;
  const picked = pickQuestions(pool, choice.count || pool.length, save.seen);
  const items = inOrder(picked, !choice.count).map((q) => toQuizItem(q, lang()));
  const chapterName = () => {
    if (!choice.chapter) return t('practiceAllChapters');
    const ch = chaptersFor(choice.subject).find((c) => c.key === choice.chapter);
    return ch ? pick(ch) : '';
  };
  closeSetup();
  openQuiz({
    title: () => `${subjectName(choice.subject)} · ${chapterName()}`,
    items,
    onAnswer: remember,
    canEnd: true,
    endless: !choice.count,
    dailyLink: true,
    report: (S) => report(S, choice),
    onFinish: () => ({ passed: false, stars: 0, needed: 0 }),
    onRetry: () => start(choice),
    onClose: () => openPractice(),
  });
}

// --- the result page ---
function report(S, choice) {
  const n = S.items.length;
  const pct = n ? Math.round((S.score / n) * 100) : 0;
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪';
  const title = t('practiceScore', { s: S.score, n, p: pct });
  const text = t(pct >= 80 ? 'practiceGreat' : pct >= 50 ? 'practiceGood' : 'practiceKeepGoing');
  const name = childName();
  return { emoji, title, text: name ? `${name}, ${text}` : text, fill: (box) => fillReport(box, S, choice) };
}

function fillReport(box, S, choice) {
  const add = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; box.appendChild(e); return e; };

  // how the child did in each chapter (only when the questions came from more than one chapter)
  const rows = new Map();
  S.items.forEach((it, i) => {
    const ch = chapterOf(it.raw);
    const key = ch ? ch.key : '~none';
    const r = rows.get(key) || { name: ch ? pick(ch) : t('practiceOther'), order: ch ? ch.order : 2000, n: 0, right: 0 };
    r.n++;
    if (S.marks[i] === 'ok') r.right++;
    rows.set(key, r);
  });
  const list = [...rows.values()].sort((a, b) => a.order - b.order);
  if (!choice.chapter && list.length > 1) {
    const table = add('table', null, 'pr-table');
    const cap = document.createElement('caption');
    cap.textContent = t('practiceByChapter');
    table.appendChild(cap);
    const head = table.insertRow();
    for (const h of [t('practiceChapter'), t('practiceRight')]) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = h; head.appendChild(th); }
    for (const r of list) {
      const tr = table.insertRow();
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = r.name;
      tr.appendChild(th);
      tr.insertCell().textContent = `${r.right} / ${r.n}`;
    }
    // the weakest chapter with at least 2 questions answered
    const weak = list.filter((r) => r.n >= 2 && r.right / r.n < 0.8).sort((a, b) => a.right / a.n - b.right / b.n)[0];
    if (weak) add('p', t('practiceFocus', { c: weak.name }), 'pr-focus');
  }

  // questions not answered right the first time, with the right answer
  const wrong = S.items.map((it, i) => ({ it, i })).filter(({ i }) => S.marks[i] !== 'ok');
  if (wrong.length) {
    add('h3', t('practiceReview', { n: wrong.length }));
    const ol = add('ol', null, 'pr-wrong');
    for (const { it, i } of wrong) {
      const li = document.createElement('li');
      li.value = i + 1;
      const right = it.options.findIndex((o) => o.correct);
      const q = document.createElement('span');
      q.textContent = shortText(it.question.replace(/\n/g, ' '), 140);
      const a = document.createElement('b');
      a.textContent = `${t('correctAnswerIs')} ${LETTERS[right]}. ${it.options[right].text}`;
      li.append(q, document.createElement('br'), a);
      ol.appendChild(li);
    }
  } else if (S.items.length) {
    add('p', t('practiceAllRight'), 'pr-focus');
  }
  add('p', t('practiceScreenshot'), 'small-note');
}
