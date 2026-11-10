// Accessibility mode, for children who cannot see the screen (laptops first).
// Everything here is spoken by the child's own screen reader through announce(): the game never
// talks with its own voice in this mode, so the two never speak over each other.
// Keys: arrows up/down walk, left/right turn by an eighth of a circle, H help, L where am I,
// G go to a place, Enter starts what is near, Escape closes a panel.
import { pointBlocked } from './world/physics.js';
import { findRoute } from './world/route.js';
import { PATH } from './world/forest.js';
import { TERRACE, TSTAIRS } from './world/house.js';

const STEP = 0.7;                  // metres in one child's step, for "N steps away"
const TURN = Math.PI / 4;
const STAIRS_BOTTOM = { x: 13.9, z: 7.4 };
const STAIRS_TOP = { x: 13.9, z: 0.5 };
const FOREST_START = { x: PATH[0][0], z: PATH[0][1] };

const WORDS = {
  ml: {
    zone: { yard: 'മുറ്റം', steps: 'മുൻവശത്തെ പടികൾ', veranda: 'പൂമുഖം', hall: 'അകത്തളം', courtyard: 'നടുമുറ്റം', backhall: 'പിൻവശത്തെ ഹാൾ', garden: 'തോട്ടം', stairs: 'ടെറസിലേക്കുള്ള പടികൾ', terrace: 'ടെറസ്', forest: 'കാട്ടിലെ വഴി' },
    place: { frontdoor: 'വീടിന്റെ മുൻവാതിൽ', steps: 'മുൻവശത്തെ പടികൾ', tulsi: 'നടുമുറ്റത്തെ തുളസിത്തറ', lamp: 'നിലവിളക്ക്', cupboard: 'പുനരവലോകന അലമാര', well: 'തോട്ടത്തിലെ ആഗ്രഹക്കിണർ', stairs: 'ടെറസിലേക്കുള്ള പടികൾ', forest: 'കാട്ടിലേക്കുള്ള വഴി', yard: 'മുൻവശത്തെ മുറ്റം', kite: 'പട്ടം', telescope: 'ദൂരദർശിനി', pool: 'നീന്തൽക്കുളം', attic: 'രഹസ്യ മുറി', chest: 'നിധിപ്പെട്ടി', fboard: 'അടുത്ത ചോദ്യപ്പലക', ftree: 'വലിയ മരം', fswing: 'ഊഞ്ഞാൽ', fnew: 'പുതിയ യാത്ര' },
    door: (r) => `${r} – വാതിൽ`, locked: (r) => `${r} – വാതിൽ (പൂട്ടിയത്)`, gift: (r) => `സമ്മാനപ്പെട്ടി (${r})`,
    ahead: 'നേരെ മുന്നിൽ', left: 'ഇടതുവശത്ത്', right: 'വലതുവശത്ത്', behind: 'പിന്നിൽ', frontLeft: 'മുന്നിൽ ഇടത്തായി', frontRight: 'മുന്നിൽ വലത്തായി', backLeft: 'പിന്നിൽ ഇടത്തായി', backRight: 'പിന്നിൽ വലത്തായി',
    turnLeft: 'ഇടത്തോട്ട്', turnRight: 'വലത്തോട്ട്',
    clock: (n) => `${n} മണിക്ക്`, steps: (n) => (n <= 1 ? 'തൊട്ടടുത്ത്' : `${n} ചുവട് അകലെ`),
    youAre: (z) => `നിങ്ങൾ നിൽക്കുന്നത്: ${z}.`, inRoom: (r) => `നിങ്ങൾ മുറിക്കുള്ളിലാണ്: ${r}.`, near: 'അടുത്തുള്ളവ:',
    facing: (what) => `മുന്നിൽ ${what}.`, wayAhead: (n) => (n < 1 ? 'തൊട്ടുമുന്നിൽ ചുമരോ തടസ്സമോ ഉണ്ട്.' : `മുന്നിൽ ഏകദേശം ${n} ചുവട് നടക്കാം.`),
    nowFacing: 'തിരിഞ്ഞു.', hintGo: (p, d) => `${p} ${d}. G അമർത്തിയാൽ ഞാൻ കൊണ്ടുപോകാം.`, hintWalk: 'മോളിലേക്കുള്ള ആരോ അമർത്തി നടന്നോളൂ, അല്ലെങ്കിൽ G അമർത്തി ഒരു സ്ഥലം തിരഞ്ഞെടുക്കൂ.',
    on: 'അക്സസിബിലിറ്റി മോഡ് ഓൺ. കളിക്കുമ്പോൾ H അമർത്തിയാൽ സഹായം കിട്ടും.', off: 'അക്സസിബിലിറ്റി മോഡ് ഓഫ്.',
    noWay: 'അങ്ങോട്ടുള്ള വഴി കണ്ടുപിടിക്കാൻ പറ്റിയില്ല.', open: 'തുറന്നത്', lockedWord: 'പൂട്ടിയത്',
  },
  en: {
    zone: { yard: 'the front yard', steps: 'the front steps', veranda: 'the veranda', hall: 'the hall', courtyard: 'the courtyard', backhall: 'the back hall', garden: 'the garden', stairs: 'the terrace stairs', terrace: 'the terrace', forest: 'the forest path' },
    place: { frontdoor: 'the front door', steps: 'the front steps', tulsi: 'the tulsi stand in the courtyard', lamp: 'the brass lamp', cupboard: 'the revision cupboard', well: 'the wishing well', stairs: 'the terrace stairs', forest: 'the way to the forest', yard: 'the front yard', kite: 'the kite', telescope: 'the telescope', pool: 'the pool', attic: 'the secret room', chest: 'the treasure chest', fboard: 'the next question board', ftree: 'the big tree', fswing: 'the swing', fnew: 'a new trip' },
    door: (r) => `the ${r} door`, locked: (r) => `the ${r} door (locked)`, gift: (r) => `the gift box in the ${r}`,
    ahead: 'straight ahead', left: 'on your left', right: 'on your right', behind: 'behind you', frontLeft: 'ahead on the left', frontRight: 'ahead on the right', backLeft: 'behind on the left', backRight: 'behind on the right',
    turnLeft: 'left', turnRight: 'right',
    clock: (n) => `at ${n} o'clock`, steps: (n) => (n <= 1 ? 'right here' : `${n} steps away`),
    youAre: (z) => `You are in ${z}.`, inRoom: (r) => `You are in the ${r}.`, near: 'Nearby:',
    facing: (what) => `Ahead: ${what}.`, wayAhead: (n) => (n < 1 ? 'There is a wall or something right in front of you.' : `You can walk about ${n} steps ahead.`),
    nowFacing: 'Turned.', hintGo: (p, d) => `${p} is ${d}. Press G and I'll take you.`, hintWalk: 'Press the up arrow to walk, or G to pick a place.',
    on: 'Accessibility mode is on. Press H while playing for help.', off: 'Accessibility mode is off.',
    noWay: 'I could not find a way there.', open: 'open', lockedWord: 'locked',
  },
};

export function createA11yMode(api) {
  const { save, persist, lang, pick, announce } = api;
  let lines = {};
  fetch('data/a11y-lines.json').then((r) => r.json()).then((j) => { lines = j; }).catch(() => {});
  const W = () => WORDS[lang()] || WORDS.ml;
  const on = () => !!save.settings.a11y;
  const roomName = (r) => pick(r.name);
  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  const line = (key, vars = {}) => {
    const list = lines[key]?.[lang()] || lines[key]?.ml || [];
    return list.length ? fill(list[Math.floor(Math.random() * list.length)], vars) : '';
  };
  const say = (text) => { if (on() && text) announce(text); };

  // ---------- where things are ----------
  const inBox = (b, x, z) => x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2;
  function zoneAt(x, z, y) {
    if (x < -20.1) return { id: 'forest' };
    if (y > 2.2 && inBox(TERRACE, x, z)) return { id: 'terrace' };
    if (inBox(TSTAIRS, x, z)) return { id: 'stairs' };
    const room = api.rooms.find((r) => inBox(r, x, z));
    if (room) return { id: 'room', room };
    if (x > -1.6 && x < 1.6 && z >= 11 && z <= 12.2) return { id: 'steps' };
    if (x > -6 && x < 6 && z >= 8 && z < 11) return { id: 'veranda' };
    if (x > -10 && x < 10 && z > -8 && z < 8) {
      if (x > -2.2 && x < 2.2 && z > -5.2 && z < -0.8) return { id: 'courtyard' };
      return { id: z < -5 ? 'backhall' : 'hall' };
    }
    if (z > 12 && Math.abs(x) < 8) return { id: 'yard' };
    return { id: 'garden' };
  }
  const zoneName = (zn) => (zn.id === 'room' ? roomName(zn.room) : W().zone[zn.id]);

  // what is around: on the terrace only the terrace, otherwise the house, garden and forest
  function features(ground = false) {
    const w = W(), list = [];
    const up = api.pos.y > 2.2 && !ground;
    if (up) {
      for (const [k, s] of Object.entries(api.terraceSpots)) {
        if (k === 'chest' && !save.terrace.atticOpen) continue;
        if (k === 'attic' && save.terrace.atticOpen) continue;
        list.push({ id: k, name: w.place[k], x: s[0], z: s[1], terrace: true });
      }
      list.push({ id: 'stairs', name: w.place.stairs, x: STAIRS_TOP.x, z: STAIRS_TOP.z, terrace: true });
      return list;
    }
    for (const d of api.doors) {
      const open = api.roomState(d.room.id).unlocked;
      list.push({ id: `door:${d.room.id}`, name: open ? w.door(roomName(d.room)) : w.locked(roomName(d.room)), x: d.front[0], z: d.front[1], room: d.room, locked: !open });
    }
    for (const g of api.surprises.gifts) if (g.group.visible) list.push({ id: `gift:${g.room.id}`, name: w.gift(roomName(g.room)), x: g.pos[0], z: g.pos[1], room: g.room, gift: true });
    const add = (id, x, z) => list.push({ id, name: w.place[id], x, z });
    add('frontdoor', 0, 8.6); add('steps', 0, 11.7); add('tulsi', 0, -2.2); add('lamp', -2.8, -6.3);
    add('cupboard', ...api.extras.cupboard.pos); add('well', ...api.extras.well.pos);
    add('stairs', STAIRS_BOTTOM.x, STAIRS_BOTTOM.z); add('forest', FOREST_START.x, FOREST_START.z); add('yard', 0, 16);
    for (const tg of api.forest.targets()) list.push({ id: tg.kind, name: w.place[tg.kind], x: tg.pos[0], z: tg.pos[1], forest: true });
    return list;
  }

  // direction from the child, as the camera faces: words, clock hour and steps
  function dirTo(x, z) {
    const yaw = api.getYaw();
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const dx = x - api.pos.x, dz = z - api.pos.z;
    const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);   // 0 ahead, positive to the right
    const deg = (ang * 180) / Math.PI, a = Math.abs(deg), w = W();
    const word = a < 20 ? w.ahead : a < 65 ? (deg > 0 ? w.frontRight : w.frontLeft) : a < 115 ? (deg > 0 ? w.right : w.left) : a < 160 ? (deg > 0 ? w.backRight : w.backLeft) : w.behind;
    let hour = Math.round(deg / 30); if (hour <= 0) hour += 12;
    const steps = Math.max(1, Math.round(Math.hypot(dx, dz) / STEP));
    const plain = a < 20 || a > 160 || (a > 75 && a < 105);   // straight ahead, behind, or right at the side: no clock needed
    return { deg, word, hour, steps, text: plain ? `${word}, ${w.steps(steps)}` : `${word}, ${w.clock(hour)}, ${w.steps(steps)}` };
  }

  function freeAhead() {
    const yaw = api.getYaw(), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let d = 0;
    for (; d < 10; d += 0.25) if (pointBlocked(api.pos.x + fx * (d + 0.4), api.pos.z + fz * (d + 0.4), api.colliders(), 0.3)) break;
    return Math.round(d / STEP);
  }

  function facingText() {
    const ahead = features().filter((f) => f.id !== 'yard').map((f) => ({ f, d: dirTo(f.x, f.z) })).filter(({ d }) => Math.abs(d.deg) < 22 && d.steps < 22).sort((a, b) => a.d.steps - b.d.steps)[0];
    const w = W();
    return ahead ? `${w.facing(`${ahead.f.name}, ${w.steps(ahead.d.steps)}`)}` : w.wayAhead(freeAhead());
  }

  function whereAmI() {
    const w = W(), zn = zoneAt(api.pos.x, api.pos.z, api.pos.y);
    const head = zn.id === 'room' ? w.inRoom(roomName(zn.room)) : w.youAre(zoneName(zn));
    const near = features().filter((f) => f.id !== 'yard').map((f) => ({ f, d: dirTo(f.x, f.z) })).sort((a, b) => a.d.steps - b.d.steps).slice(0, 3);
    return `${head} ${facingText()} ${w.near} ${near.map(({ f, d }) => `${f.name}, ${d.text}`).join('. ')}.`;
  }

  // ---------- going to a place ----------
  const PLACES = ['frontdoor', 'yard', 'tulsi', 'lamp', 'cupboard', 'well', 'stairs', 'forest'];
  function destinations() {
    const all = features(true), w = W(), out = [];
    // rooms first: the door, or the gift box once the room is open
    for (const d of api.doors) {
      const open = api.roomState(d.room.id).unlocked;
      const gift = all.find((f) => f.id === `gift:${d.room.id}`);
      out.push(open && gift ? { ...gift, name: roomName(d.room), label: `${roomName(d.room)} (${w.open})` } : { ...all.find((f) => f.id === `door:${d.room.id}`), name: roomName(d.room), label: `${roomName(d.room)} (${open ? w.open : w.lockedWord})` });
    }
    for (const id of PLACES) { const f = all.find((x) => x.id === id); if (f) out.push({ ...f, label: f.name }); }
    for (const f of all) if (f.forest) out.push({ ...f, label: `${f.name} (${W().zone.forest})` });
    for (const k of ['kite', 'telescope', 'pool']) { const s = api.terraceSpots[k]; out.push({ id: k, name: w.place[k], label: `${w.place[k]} (${W().zone.terrace})`, x: s[0], z: s[1], terrace: true }); }
    return out;
  }

  const forestIndex = (x, z) => {
    let best = 0, bd = Infinity;
    PATH.forEach(([px, pz], i) => { const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  function forestLeg(from, to) {
    const a = forestIndex(from.x, from.z), b = forestIndex(to.x, to.z), pts = [];
    if (a < b) for (let i = a + 1; i <= b; i++) pts.push({ x: PATH[i][0], z: PATH[i][1] });
    else for (let i = a - 1; i >= b; i--) pts.push({ x: PATH[i][0], z: PATH[i][1] });
    return pts;
  }
  function ground(from, to) { return findRoute(from, to, api.colliders()); }

  function plan(dest) {
    const here = { x: api.pos.x, z: api.pos.z }, to = { x: dest.x, z: dest.z };
    const up = api.pos.y > 2.2, inForest = here.x < -20.1;
    let pts = [];
    // first get back to ordinary ground
    let from = here;
    if (up && !dest.terrace) { pts.push(STAIRS_TOP, STAIRS_BOTTOM); from = STAIRS_BOTTOM; }
    if (inForest && !dest.forest) { pts.push(...forestLeg(here, FOREST_START), FOREST_START); from = FOREST_START; }
    if (dest.terrace) {
      if (!up) { const r = ground(from, STAIRS_BOTTOM); if (!r) return null; pts.push(...r, STAIRS_TOP); }
      pts.push(to);
    } else if (dest.forest) {
      if (!inForest) { const r = ground(from, FOREST_START); if (!r) return null; pts.push(...r); from = FOREST_START; }
      pts.push(...forestLeg(from, to), to);
    } else {
      const r = ground(from, to); if (!r) return null; pts.push(...r);
    }
    return pts;
  }

  function goTo(dest) {
    const pts = plan(dest);
    if (!pts || !pts.length) { say(W().noWay); return; }
    say(line('going', { place: dest.name }));
    api.walkPath(pts, {
      onArrive: () => { if (!api.promptShown()) say(line('arrived', { place: dest.name })); },
      onStuck: () => { if (!api.promptShown()) say(line('stuck')); },   // stopped by the thing itself: the prompt already speaks
    });
  }

  // ---------- panels ----------
  const $ = (id) => document.getElementById(id);
  function openGoTo() {
    const list = $('a11y-goto-list');
    list.textContent = '';
    for (const d of destinations()) {
      const b = document.createElement('button');
      b.className = 'soft-btn';
      b.textContent = `${d.label}: ${dirTo(d.x, d.z).text}`;
      b.addEventListener('click', () => { api.closePanel('a11y-goto'); setTimeout(() => goTo(d), 150); });
      list.append(b);
    }
    api.openPanel('a11y-goto');
  }

  // ---------- what the child hears while playing ----------
  const S = { zone: null, zoneAt: -99, lastMove: 0, lastIdle: -99, lastBump: -99, lastSurp: -99, lastLamp: -99, sides: new Map(), time: 0, lastY: 0, still: 0 };

  function update(dt, { moving, bumped, keysWalking }) {
    if (!on() || !api.playing()) return;
    S.time += dt;
    const busy = api.busy();
    if (moving) { S.lastMove = S.time; S.still = 0; } else S.still += dt;
    const zn = zoneAt(api.pos.x, api.pos.z, api.pos.y);
    const key = zn.id === 'room' ? `room:${zn.room.id}` : zn.id;
    if (key !== S.zone && S.time - S.zoneAt > 1.5 && !busy) {
      const goingDown = api.pos.y < S.lastY - 0.01 || (zn.id === 'steps' && (S.zone === 'veranda' || S.zone === 'hall')) || (zn.id === 'stairs' && S.zone === 'terrace');
      S.zone = key; S.zoneAt = S.time;
      const down = goingDown && (zn.id === 'steps' || zn.id === 'stairs');
      let text = zn.id === 'room' ? line('zone_room', { room: roomName(zn.room) }) : line(down ? `zone_${zn.id}_down` : `zone_${zn.id}`);
      if (zn.id === 'room') {
        const g = api.surprises.gifts.find((x) => x.room === zn.room && x.group.visible);
        if (g) text += ` ${W().gift(roomName(zn.room))}: ${dirTo(g.pos[0], g.pos[1]).text}.`;
      }
      say(text);
    }
    S.lastY = api.pos.y;
    if (busy) return;
    // rooms to the side while walking through the hall
    if (moving && !api.walking() && (zn.id === 'hall' || zn.id === 'backhall' || zn.id === 'courtyard')) {
      for (const d of api.doors) {
        const dist = Math.hypot(d.front[0] - api.pos.x, d.front[1] - api.pos.z);
        const told = S.sides.get(d.room.id);
        if (dist > 4.5) { S.sides.delete(d.room.id); continue; }
        if (told || dist > 2.8) continue;
        const dir = dirTo(d.front[0], d.front[1]);
        if (Math.abs(dir.deg) < 45 || Math.abs(dir.deg) > 135) continue;
        S.sides.set(d.room.id, true);
        const w = W();
        say(line('side_room', { room: roomName(d.room), where: dir.deg > 0 ? w.right : w.left, side: dir.deg > 0 ? w.turnRight : w.turnLeft }));
        break;
      }
    }
    if (bumped && keysWalking && S.time - S.lastBump > 3.5) {
      S.lastBump = S.time;
      const door = api.doors.find((d) => !api.roomState(d.room.id).unlocked && Math.hypot(d.center[0] - api.pos.x, d.center[1] - api.pos.z) < 1.4);
      say(door ? line('door_locked', { room: roomName(door.room) }) : line('bump'));
    }
    if (Math.hypot(api.pos.x + 2.8, api.pos.z + 6.6) < 1.7 && S.time - S.lastLamp > 90) { S.lastLamp = S.time; say(line('lamp')); }
    if (api.surprises.active()) {
      if (S.still > 4 && S.time - S.lastSurp > 8) { S.lastSurp = S.time; say(line('surprise_idle')); }
      return;
    }
    if (!api.walking() && S.time - S.lastMove > 25 && S.time - S.lastIdle > 45) {
      S.lastIdle = S.time;
      say(line('idle', { hint: idleHint() }));
    }
  }

  function idleHint() {
    const all = features().filter((f) => f.locked || f.gift || f.forest).map((f) => ({ f, d: dirTo(f.x, f.z) })).sort((a, b) => a.d.steps - b.d.steps);
    return all.length ? W().hintGo(all[0].f.name, all[0].d.text) : W().hintWalk;
  }

  // ---------- keys ----------
  addEventListener('keydown', (e) => {
    if (!on() || !api.playing() || e.ctrlKey || e.altKey || e.metaKey) return;
    const busy = api.busy();
    if (busy) return;
    const k = e.code;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'KeyA' || k === 'KeyD') {
      e.preventDefault();
      if (e.repeat) return;
      api.stopWalk();
      api.turn(k === 'ArrowLeft' || k === 'KeyA' ? TURN : -TURN);
      setTimeout(() => say(`${W().nowFacing} ${facingText()}`), 60);
    } else if (k === 'KeyL') { e.preventDefault(); say(whereAmI()); }
    else if (k === 'KeyG') { e.preventDefault(); openGoTo(); }
    else if (k === 'KeyH') { e.preventDefault(); api.openPanel('a11y-help'); }
  });

  // ---------- quiz and rewards ----------
  addEventListener('quizfeedback', (e) => {
    const { kind, title, body } = e.detail;
    if (!on()) { announce(`${title} ${body || ''}`); return; }
    if (kind === 'good') announce(`${line('right')} ${body || ''}`);
    else if (kind === 'hint') announce(`${line('wrong')} ${body || title}`);
    else announce(`${title} ${body || ''}`);
  });

  return {
    on,
    setOn(v) {
      save.settings.a11y = !!v;
      persist();
      document.documentElement.classList.toggle('a11y', !!v);
      announce(v ? W().on : W().off);
    },
    started() { if (on()) setTimeout(() => say(line('welcome')), 1200); S.zone = zoneAt(api.pos.x, api.pos.z, api.pos.y).id; },
    roomOpened(room) { say(line('room_open', { room: roomName(room) })); },
    update,
    whereAmI,
  };
}
