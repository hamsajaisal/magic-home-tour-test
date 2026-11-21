// Saves the child's progress in this browser only (localStorage). Nothing leaves the device.
// The test copy for trusted testers (…/magic-home-tour-test/) keeps its own save,
// so testing never changes the progress on the real game.
export const IS_TEST = location.pathname.includes('-test/');
// Each new test version starts from nothing, so testers see the new things from the beginning
// instead of gates and doors they opened in an older version. Change TEST_ROUND with each test release.
const TEST_ROUND = '2026-11-22';
const KEY = IS_TEST ? `magicHomeTour.test.save.${TEST_ROUND}` : 'magicHomeTour.save.v1';
if (IS_TEST) {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('magicHomeTour.test.save.') && k !== KEY) localStorage.removeItem(k); } catch (e) { /* storage may be blocked */ }
}

function fresh() {
  return {
    version: 1,
    lang: null,
    coins: 0,
    xp: 0,
    rooms: {},        // roomId -> { unlocked, stars, best }
    wrong: {},        // questionId -> times answered wrong (used by the revision room later)
    seen: {},         // questionId -> times shown (game and quiz mode)
    levels: {},       // subject -> difficulty level of its rounds, starts at 1
    settings: { lowGraphics: null, sound: true, voice: true, lipi: 'old', readAloud: false, joystick: 'left', closeView: false, a11y: false },
    streak: { count: 0, last: null },   // days in a row
    surpriseDay: {},  // roomId -> date of today's free surprise
    owned: [],        // shop items bought
    costume: {},      // { hat, glasses, shirt } item ids being worn
    stats: {},        // counters used for badges (correct, treats, kittens …)
    badges: [],       // badge ids earned
    stickers: [],     // sticker ids collected
    qstats: {},       // questionId -> { n, right, time, last } (time in seconds)
    days: {},         // date -> { n, right, time } questions answered that day
    forest: { stage: 0, branch: 0, done: false, trips: 0 },   // gates open, branches climbed, finished, trips finished
    terrace: { keys: [], jacketDay: null, rescueDay: null, rescueStep: 0, rescuedDay: null, atticOpen: false },
    space: { parts: 0, trips: 0 },   // rocket parts built (0 to 4), trips to the Moon
  };
}

export const save = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const base = fresh();
      return { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) }, terrace: { ...base.terrace, ...(data.terrace || {}) }, space: { ...base.space, ...(data.space || {}) } };
    }
  } catch (e) {
    console.warn('Could not read saved progress, starting fresh.', e);
  }
  return fresh();
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); }
  catch (e) { console.warn('Could not save progress.', e); }
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export function roomState(id) {
  if (!save.rooms[id]) save.rooms[id] = { unlocked: false, stars: 0, best: 0 };
  return save.rooms[id];
}

// today's date on this device, like "2026-10-30"
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA');
}
