// "How to play" guide and the child's name.
// The first time a child plays, the game asks for a name (optional) and then opens the guide once.
// The name stays in this browser only (save.settings.childName); quiz praise uses it now and then.
import { save, persist } from '../storage.js';
import { t, tIn, lang, onLangChange } from '../i18n.js';
import { play } from '../audio.js';
import { announce } from './a11y.js';

const $ = (id) => document.getElementById(id);
let opts = {};

// the child's name, cleaned (or '' when none was given)
export function childName() {
  return String(save.settings.childName || '').trim();
}

function setName(raw) {
  const name = String(raw || '').replace(/[<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  save.settings.childName = name;
  persist();
  return name;
}

function renderGuide() {
  const list = $('guide-list');
  list.textContent = '';
  for (const line of [].concat(tIn(lang(), 'guideItems'))) {
    const li = document.createElement('li');
    li.textContent = line.replace('{n}', opts.n).replace('{k}', opts.k);
    list.append(li);
  }
}

let afterGuide = null;
export function openGuide(next) {
  afterGuide = next || null;
  opts.beforeOpen?.();
  renderGuide();
  $('guide').classList.remove('hidden');
  if (!save.stats.guideSeen) { save.stats.guideSeen = true; persist(); }
}

function closeGuide() {
  play('click');
  $('guide').classList.add('hidden');
  opts.afterClose?.();
  const next = afterGuide;
  afterGuide = null;
  next?.();
}

let afterName = null;
function openNameAsk(next) {
  afterName = next || null;
  opts.beforeOpen?.();
  $('name-input').value = childName();
  $('name-ask').classList.remove('hidden');
}

function closeNameAsk(keep) {
  play('click');
  if (keep) {
    const name = setName($('name-input').value);
    if (name) { opts.toast?.(t('nameHello', { name })); }
  }
  save.stats.nameAsked = true;
  persist();
  $('name-ask').classList.add('hidden');
  opts.afterClose?.();
  const next = afterName;
  afterName = null;
  next?.();
}

// First play: ask for the name, then show the guide, each only once. Calls done() afterwards.
export function firstTimeSteps(done) {
  const guide = () => (save.stats.guideSeen ? done() : openGuide(done));
  if (!save.stats.nameAsked) openNameAsk(guide);
  else guide();
}

// opts: { n, k, beforeOpen, afterClose, toast }
export function initGuide(o) {
  opts = o;
  const open = () => { play('click'); $('settings').classList.add('hidden'); openGuide(); };
  $('guide-btn').addEventListener('click', open);
  $('settings-guide').addEventListener('click', open);
  $('guide-ok').addEventListener('click', closeGuide);
  $('name-save').addEventListener('click', () => closeNameAsk(true));
  $('name-later').addEventListener('click', () => closeNameAsk(false));
  $('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); closeNameAsk(true); } });
  $('name-ask').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeNameAsk(false); } });
  // Settings: change the name any time
  const saveFromSettings = () => {
    play('click');
    const name = setName($('set-name').value);
    $('set-name').value = name;
    announce(name ? t('nameHello', { name }) : t('nameSetting'));
  };
  $('set-name-save').addEventListener('click', saveFromSettings);
  $('set-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveFromSettings(); } });
  onLangChange(() => { if (!$('guide').classList.contains('hidden')) renderGuide(); });
}

// fill the Settings name box when Settings opens
export function showNameInSettings() {
  $('set-name').value = childName();
}
