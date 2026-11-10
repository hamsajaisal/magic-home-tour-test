// The question panel that appears at a locked door.
import { t, tIn, lang } from '../i18n.js';
import { play } from '../audio.js';
import { say, readAloud, stopReading } from '../voice.js';
import { fmtTime, shortText } from '../progress.js';
import { LETTERS } from '../question-format.js';
import { save, persist, today } from '../storage.js';
import { SETTINGS } from '../../settings.js';
import { newSlate, closeSlate, isSlateOpen } from './slate.js';

const $ = (id) => document.getElementById(id);
const el = {
  panel: $('quiz'), room: $('quiz-room'), count: $('quiz-count'), dots: $('quiz-dots'),
  body: $('quiz-body'), text: $('q-text'), options: $('q-options'), feedback: $('q-feedback'),
  next: $('q-next'), result: $('quiz-result'),
  rEmoji: $('r-emoji'), rTitle: $('r-title'), rStars: $('r-stars'), rText: $('r-text'),
  rMain: $('r-main'), rLater: $('r-later'), close: $('quiz-close'), end: $('quiz-end'), report: $('r-report'),
};

let S = null;   // current quiz state
window.__quiz = () => S;   // lets automatic tests see the quiz

export function isQuizOpen() { return !!S; }

// Called when the language changes during a quiz: swap the words, keep the answers given so far.
export function retranslateQuiz(translate) {
  if (!S) return;
  S.items = S.items.map((it) => translate(it) || it);
  if (!el.result.classList.contains('hidden')) {
    $('r-credit').textContent = creditLine();
    showMoreLink();
    if (S.report) {
      showReport();
      $('r-time').textContent = timeReport();
      el.rMain.textContent = t('practiceAgain');
      el.rLater.textContent = t('practiceHome');
      el.room.textContent = S.title();
    }
    return;
  }
  const item = S.items[S.index];
  el.count.textContent = countText();
  el.text.textContent = item.question;
  [...el.options.children].forEach((b, i) => { b.lastChild.textContent = item.options[i].text; });
  el.room.textContent = S.title();
  if (!el.next.classList.contains('hidden')) {
    el.next.textContent = S.index === S.items.length - 1 ? t('seeResult') : t('next');
  }
  renderFeedback();
}

/**
 * opts: { title, items, onAnswer(item, firstTry), onFinish(score, total) -> {passed, stars, needed},
 *         onRetry(), onClose() }
 * Quiz mode (practice) also gives: canEnd (an "End quiz" button), endless (no "of N" in the count),
 * report(S) -> { emoji, title, text, fill(container) } for its own result page, and dailyLink.
 */
export function openQuiz(opts) {
  S = { ...opts, index: 0, score: 0, tries: 0, marks: [], times: [] };
  el.panel.classList.remove('hidden');
  el.result.classList.add('hidden');
  el.body.classList.remove('hidden');
  el.end.classList.toggle('hidden', !opts.canEnd);
  el.dots.classList.toggle('hidden', opts.items.length > 25);
  el.room.textContent = opts.title();
  showQuestion();
}

const countText = () => (S.endless ? t('questionNum', { i: S.index + 1 }) : t('questionOf', { i: S.index + 1, n: S.items.length }));

// Quiz mode: stop now and see the score for the questions answered so far.
function endEarly() {
  if (!S || !el.result.classList.contains('hidden')) return;
  const answered = S.index + (el.next.classList.contains('hidden') ? 0 : 1);
  if (!answered) { closeQuiz(); return; }
  S.items = S.items.slice(0, answered);
  S.marks = S.marks.slice(0, answered);
  S.times = S.times.slice(0, answered);
  showResult();
}

export function closeQuiz() {
  if (!S) return;
  stopReading();
  closeSlate();
  const { onClose } = S;
  S = null;
  el.panel.classList.add('hidden');
  onClose?.();
}

// the same praise word in both languages (so a spoken English fallback matches)
function praise(l = lang()) {
  const list = [].concat(tIn(l, 'praise'));
  return list[S.praiseIdx % list.length];
}

function speak(kind, key) {
  const pickText = (l) => (key === 'praise' ? praise(l) : tIn(l, key));
  say(kind, lang(), { ml: pickText('ml'), en: pickText('en') });
}

// One thank-you line for the round, naming only the sources whose questions came up.
function creditLine() {
  const names = [...new Set(S.items.map((it) => it.credit).filter(Boolean))];
  return names.length ? t('roundCredit', { c: names.join(' · ') }) : '';
}

// Now and then, a link to the source's own site for more mock tests (asked for by Bio-vision).
// "creditLink" in a question: { "url": "...", "en": "Bio-vision", "ml": "ബയോ വിഷൻ" }.
function pickMoreLink() {
  const link = S.items.map((it) => it.creditLink).find((l) => l && l.url);
  const every = SETTINGS.MORE_TESTS_LINK_EVERY;
  if (!link || !every) return null;
  if (S.dailyLink) {   // quiz mode: once a day
    if (save.stats.practiceLinkDay === today()) return null;
    save.stats.practiceLinkDay = today();
    persist();
    return link;
  }
  save.stats.moreLinkRounds = (save.stats.moreLinkRounds || 0) + 1;
  persist();
  return (save.stats.moreLinkRounds - 1) % every === 0 ? link : null;
}

function showMoreLink() {
  const p = $('r-more');
  p.textContent = '';
  const link = S.moreLink;
  if (!link) return;
  const name = link[lang()] || link.en;
  const [before, after = ''] = t('moreTests').split('{c}');
  const a = document.createElement('a');
  a.href = link.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = name;
  p.append(before, a, after);
}

// The slate is offered for Maths, and for Science questions with numbers in the answers.
function wantsSlate(item) {
  const { subject } = item.raw;
  return subject === 'maths' || (subject === 'science' && item.options.filter((o) => /\d/.test(o.text)).length >= 2);
}

function showQuestion() {
  const item = S.items[S.index];
  newSlate(wantsSlate(item));
  S.tries = 0;
  S.shownAt = performance.now();
  el.count.textContent = countText();
  el.dots.innerHTML = S.items.map((_, i) =>
    `<span class="dot ${i === S.index ? 'now' : S.marks[i] || ''}"></span>`).join('');
  el.text.textContent = item.question;
  el.text.classList.toggle('long', item.question.length > 260);
  el.options.innerHTML = '';
  item.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.innerHTML = `<span class="letter">${LETTERS[i]}</span><span></span>`;
    b.lastChild.textContent = o.text;
    b.addEventListener('click', () => pickOption(i));
    el.options.appendChild(b);
  });
  S.fb = null;
  renderFeedback();
  el.next.classList.add('hidden');
  $('q-voice-note').classList.add('hidden');
  stopReading();
  if (save.settings.readAloud && !save.settings.a11y) setTimeout(() => { if (S && S.items[S.index] === item) readQuestion(); }, 350);
}

// "Read aloud": the question and the four choices, with their letters
function readQuestion() {
  const item = S.items[S.index];
  const text = [item.question, ...item.options.map((o, i) => `${LETTERS[i]}. ${o.text}`)].join('. ');
  const res = readAloud(text, lang());
  const note = $('q-voice-note');
  note.textContent = res === 'noMl' ? t('noMlVoice') : res === 'none' ? t('noVoice') : '';
  note.classList.toggle('hidden', res === 'ok');
}

$('quiz-read').addEventListener('click', () => { if (S && !el.body.classList.contains('hidden')) readQuestion(); });

// S.fb remembers which message is showing, so it can be redrawn in the other language.
function renderFeedback() {
  const item = S.items[S.index];
  const right = item.options.findIndex((o) => o.correct);
  if (!S.fb) el.feedback.className = 'feedback hidden';
  else if (S.fb === 'good') feedback('good', praise(), item.explanation ? `${t('why')} ${item.explanation}` : '');
  else if (S.fb === 'hint' && item.hint) feedback('hint', t('wrongHint'), `${item.hint} ${t('tryOnce')}`);
  else if (S.fb === 'hint') feedback('hint', t('noHint'), t('tryOnce'));
  else feedback('explain', `${t('correctAnswerIs')} ${LETTERS[right]}. ${item.options[right].text}`, item.explanation);
}

function feedback(kind, title, body) {
  el.feedback.className = `feedback ${kind}`;
  el.feedback.innerHTML = '<b></b><span></span>';
  el.feedback.firstChild.textContent = title;
  el.feedback.lastChild.textContent = body || '';
  dispatchEvent(new CustomEvent('quizfeedback', { detail: { kind, title, body } }));
}

function pickOption(i) {
  if (!S) return;
  const item = S.items[S.index];
  const buttons = [...el.options.children];
  if (buttons[i].disabled) return;
  const firstTry = S.tries === 0;
  S.tries++;

  if (item.options[i].correct) {
    buttons[i].classList.add('right');
    buttons.forEach((b) => { b.disabled = true; });
    if (firstTry) S.score++;
    closeSlate();
    S.marks[S.index] = firstTry ? 'ok' : 'bad';
    play('correct');
    S.praiseIdx = Math.floor(Math.random() * 100);
    S.fb = 'good';
    renderFeedback();
    speak('praise', 'praise');
    const secs = finishTime();
    S.onAnswer?.(item, firstTry, secs);
    showNext();
    return;
  }

  buttons[i].classList.add('wrong');
  buttons[i].disabled = true;
  play('wrong');
  if (firstTry) {
    S.fb = 'hint';
    renderFeedback();
    speak('tryAgain', 'tryOnce');
    if (isSlateOpen()) el.feedback.scrollIntoView({ block: 'nearest' });
    return;
  }
  // second miss: show the right answer and why
  const right = item.options.findIndex((o) => o.correct);
  closeSlate();
  buttons[right].classList.add('right');
  buttons.forEach((b) => { b.disabled = true; });
  S.marks[S.index] = 'bad';
  S.fb = 'explain';
  renderFeedback();
  const secs = finishTime();
  S.onAnswer?.(item, false, secs);
  showNext();
}

function showNext() {
  const last = S.index === S.items.length - 1;
  el.next.textContent = last ? t('seeResult') : t('next');
  el.next.classList.remove('hidden');
  el.next.focus({ preventScroll: true });
}

el.next.addEventListener('click', () => {
  if (!S) return;
  play('click');
  if (S.index < S.items.length - 1) { S.index++; showQuestion(); }
  else showResult();
});

// seconds spent on the current question (from when it appeared to when it was finished)
function finishTime() {
  const sec = (performance.now() - S.shownAt) / 1000;
  S.times[S.index] = sec;
  return sec;
}

// "⏱ Time taken … · slowest question …" under the result
function timeReport() {
  const times = S.times.filter((x) => x != null);
  if (!times.length) return '';
  const total = times.reduce((a, b) => a + b, 0);
  let slow = 0;
  S.times.forEach((x, i) => { if (x > (S.times[slow] || 0)) slow = i; });
  const lines = [
    `${t('timeTotal', { t: fmtTime(total) })} · ${t('timeAvg', { t: fmtTime(total / times.length) })}`,
  ];
  if (times.length > 1) {
    lines.push(t('slowest', { i: slow + 1, t: fmtTime(S.times[slow]) }));
    lines.push(`"${shortText(S.items[slow].question, 70)}"`);
  }
  return lines.join('\n');
}

// Quiz mode's own result: score, chapter table, questions to look at again
function showReport() {
  const r = S.report(S);
  el.rEmoji.textContent = r.emoji;
  el.rTitle.textContent = r.title;
  el.rText.textContent = r.text;
  el.report.innerHTML = '';
  r.fill(el.report);
}

function showResult() {
  closeSlate();
  el.body.classList.add('hidden');
  el.result.classList.remove('hidden');
  el.end.classList.add('hidden');
  el.dots.innerHTML = S.items.map((_, i) => `<span class="dot ${S.marks[i] || ''}"></span>`).join('');
  el.count.textContent = '';
  $('r-time').textContent = timeReport();
  $('r-credit').textContent = creditLine();
  S.moreLink = pickMoreLink();
  showMoreLink();
  el.report.classList.toggle('hidden', !S.report);
  el.rStars.classList.toggle('hidden', !!S.report);
  el.rLater.textContent = t(S.report ? 'practiceHome' : 'later');
  if (S.report) {
    showReport();
    el.rMain.textContent = t('practiceAgain');
    el.rLater.classList.remove('hidden');
    S.passed = false;
    play(S.score >= S.items.length / 2 ? 'unlock' : 'click');
    el.rTitle.setAttribute('tabindex', '-1');
    el.rTitle.focus({ preventScroll: true });
    return;
  }
  const res = S.onFinish(S.score, S.items.length);
  el.rStars.innerHTML = [1, 2, 3].map((n) => `<span class="${n <= res.stars ? '' : 'off'}">⭐</span>`).join('');
  const scoreText = t('resultScore', { s: S.score, n: S.items.length });
  if (res.passed) {
    el.rEmoji.textContent = '🎉';
    el.rTitle.textContent = t(S.passTitle || 'resultPass');
    el.rText.textContent = scoreText;
    el.rMain.textContent = t(S.passButton || 'walkIn');
    el.rLater.classList.add('hidden');
    play('unlock');
    speak('pass', S.passTitle || 'resultPass');
  } else {
    el.rEmoji.textContent = '💪';
    el.rTitle.textContent = scoreText;
    el.rText.textContent = S.failText ? S.failText() : t(S.passTitle ? 'resultFailRound' : 'resultFail', { k: res.needed });
    el.rMain.textContent = t('tryAgain');
    el.rLater.classList.remove('hidden');
    play('fail');
    speak('fail', 'tryAgain');
  }
  S.passed = res.passed;
  el.rMain.focus({ preventScroll: true });
}

el.rMain.addEventListener('click', () => {
  if (!S) return;
  play('click');
  if (S.passed) closeQuiz();
  else { const { onRetry } = S; closeQuiz(); onRetry?.(); }
});
el.rLater.addEventListener('click', () => { play('click'); closeQuiz(); });
el.close.addEventListener('click', () => {
  play('click');
  if (S?.canEnd && el.result.classList.contains('hidden')) endEarly();
  else closeQuiz();
});
el.end.addEventListener('click', () => { play('click'); endEarly(); });

// keyboard: 1-4 or A-D to answer
addEventListener('keydown', (e) => {
  if (!S || el.body.classList.contains('hidden')) return;
  const k = e.key.toUpperCase();
  const idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? ['1', '2', '3', '4'].indexOf(k) : LETTERS.indexOf(k);
  if (idx >= 0 && el.next.classList.contains('hidden')) pickOption(idx);
});
