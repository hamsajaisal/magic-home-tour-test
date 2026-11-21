// Vallamkali: a snake boat race on the backwater behind the house, through a gap in the back wall.
// The race runs in 10 legs, one per question. After each answer every boat moves on: the child's boat
// surges ahead for a first-try right answer (more if it was quick), and goes on slowly after a miss.
// The other boats move by their own steady amounts, so a slow reader is never left behind while
// still reading. After the tenth answer all boats sprint to the finish and the order is decided.
import * as THREE from 'three';
import { mat, labelTexture, emojiTexture, mergeStatic } from './house.js';
import { play } from '../audio.js';

export const RACE_GAP = { x1: -15.2, x2: -11.2 };          // the opening in the back wall
export const LEGS = 10;
const SHORE = -18;                                          // the water starts north of this line
const JETTY = { x: -13.2, z1: -14.5, z2: -24.5 };
const START_X = -10, FINISH_X = 82;
const LANES = [-28, -32, -36, -40];                         // lane 0 is the child's, nearest the shore
const SCALE = (FINISH_X - START_X - 8) / 150;               // metres on the water per race point
const BOATS = [
  { name: { ml: 'നമ്മുടെ ചുണ്ടൻ', en: 'Our boat' }, color: '#ffd23d', flag: '#ff3b30' },
  { name: { ml: 'കാരിച്ചാൽ', en: 'Karichal' }, color: '#3d9dff', flag: '#3d9dff', skill: 10.2 },
  { name: { ml: 'കാവാലം', en: 'Kavalam' }, color: '#3fbf6f', flag: '#3fbf6f', skill: 9.6 },
  { name: { ml: 'പായിപ്പാട്', en: 'Payippad' }, color: '#ff5d8f', flag: '#ff5d8f', skill: 9.0 },
];
const ROWERS = 10;

export function createRace({ scene, W, low }) {
  const root = new THREE.Group();
  const statics = new THREE.Group();
  scene.add(root);
  const box = (w, h, d, color, x, y, z, parent = statics, rotY = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    parent.add(m);
    return m;
  };
  const cyl = (r1, r2, h, color, x, y, z, parent = statics, seg = 8) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat(color));
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  };
  const sprite = (emoji, x, y, z, size = 0.8, parent = root) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), depthWrite: false }));
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    parent.add(s);
    return s;
  };
  const sign = (w, h, x, y, z, rotY, parent = root) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    parent.add(m);
    return m;
  };
  const palm = (x, z, h) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, h, 6), mat('#8a6a43'));
    trunk.position.set(x, h / 2, z);
    trunk.rotation.z = 0.12;
    statics.add(trunk);
    for (let k = 0; k < 6; k++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.5), mat('#3b9147'));
      const a = (k / 6) * Math.PI * 2;
      leaf.position.set(x + 0.15 * h * 0.12 + Math.cos(a) * 1.1, h - 0.1, z + Math.sin(a) * 1.1);
      leaf.rotation.set(0, -a, -0.35);
      statics.add(leaf);
    }
  };

  // ---------- the backwater, the shores, the way down to the jetty ----------
  const waterTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#2f8fc8';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 128, y = Math.random() * 128;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 3, x + 12, y); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(16, 8);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(130, 64), new THREE.MeshLambertMaterial({ map: waterTex }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(45, 0.03, SHORE - 32);
  root.add(water);
  box(130, 0.1, 6, '#7fd05a', 45, -0.06, SHORE + 3.4);                       // near shore beyond the compound
  box(130, 0.3, 22, '#6fbf4f', 45, -0.1, SHORE - 64 - 11 + 0.5);             // the far shore
  box(2.6, 0.02, 25.5, '#f2d49b', JETTY.x, 0, -1.25);                         // sand path from the side of the house
  box(2.6, 0.02, 4, '#f2d49b', JETTY.x, 0, -16);
  box(2.4, 0.18, JETTY.z1 - JETTY.z2, '#a0692f', JETTY.x, 0.02, (JETTY.z1 + JETTY.z2) / 2);   // the jetty
  for (let z = JETTY.z1 - 1; z > JETTY.z2; z -= 2) for (const s of [-1, 1]) cyl(0.1, 0.1, 1.1, '#6b3518', JETTY.x + s * 1.1, -0.4, z);
  // the start, the finish, buoys between the lanes
  for (const x of [START_X, FINISH_X]) {
    for (const z of [LANES[0] + 2.2, LANES[LANES.length - 1] - 2.2]) cyl(0.15, 0.15, 6, x === FINISH_X ? '#ff3b30' : '#ffffff', x, 0, z);
    box(0.15, 0.15, LANES[0] - LANES[LANES.length - 1] + 4.4, x === FINISH_X ? '#ff3b30' : '#ffffff', x, 5.8, (LANES[0] + LANES[LANES.length - 1]) / 2);
  }
  // a signpost where the side path starts, seen from the front yard
  const finishSign = sign(9, 1.4, FINISH_X, 4.6, (LANES[0] + LANES[LANES.length - 1]) / 2, Math.PI / 2);
  const startSign = sign(9, 1.4, START_X, 4.6, (LANES[0] + LANES[LANES.length - 1]) / 2, Math.PI / 2);
  for (let x = START_X + 6; x < FINISH_X; x += low ? 12 : 6) {
    for (let k = 0; k < LANES.length - 1; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(k % 2 ? '#ff8c42' : '#ffffff'));
      b.position.set(x, 0.1, (LANES[k] + LANES[k + 1]) / 2);
      statics.add(b);
    }
  }
  // palms and people watching, on both shores
  for (let x = -8; x < 110; x += low ? 9 : 5) {
    palm(x + Math.random() * 2, SHORE - 64 + 2 + Math.random() * 6, 5 + Math.random() * 2);
    if (x > 22) palm(x + 2 + Math.random() * 2, SHORE + 4.5 + Math.random() * 1.5, 4.5 + Math.random() * 2);
  }
  const crowd = [];
  const FACES = ['🙋', '👏', '🙌', '🧒', '👧', '👦', '👵', '👴'];
  for (let x = -6; x < FINISH_X + 6; x += low ? 4 : 2.2) {
    const s = sprite(FACES[Math.floor(Math.random() * FACES.length)], x + Math.random(), 1.1, SHORE + 1.2 + Math.random() * 1.2, 0.75);
    crowd.push({ s, y: 1.1, phase: Math.random() * 6 });
  }
  for (let x = 30; x < FINISH_X + 6; x += low ? 6 : 3) crowd.push({ s: sprite(FACES[Math.floor(Math.random() * FACES.length)], x, 1.3, SHORE - 64 + 1.5, 0.9), y: 1.3, phase: Math.random() * 6 });

  // ---------- the snake boats ----------
  const boats = BOATS.map((b, i) => {
    const g = new THREE.Group();
    g.position.set(START_X - 4, 0, LANES[i]);
    root.add(g);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(10, 0.45, 1.1), mat('#2b2b2b'));
    hull.position.y = 0.2;
    g.add(hull);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(10, 0.08, 1.15), mat(b.color));
    rim.position.y = 0.45;
    g.add(rim);
    // the tall curved stern of a chundan vallam, at the back (west)
    for (let k = 0; k < 5; k++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.7 - k * 0.08), mat('#2b2b2b'));
      seg.position.set(-5.2 - k * 0.55, 0.4 + k * 0.55 + k * k * 0.08, 0);
      seg.rotation.z = -0.5 - k * 0.12;
      g.add(seg);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 4), mat('#2b2b2b'));
    nose.rotation.set(0, 0, -Math.PI / 2);
    nose.scale.set(1, 1, 0.5);
    nose.position.set(5.6, 0.25, 0);
    g.add(nose);
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), mat('#dddddd'));
    flagPole.position.set(-6.5, 3.4, 0);
    g.add(flagPole);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.02), mat(b.flag));
    flag.position.set(-6.1, 3.9, 0);
    g.add(flag);
    const rowers = [];
    for (let k = 0; k < (low ? 6 : ROWERS); k++) {
      const x = -3.8 + k * (7.6 / ((low ? 6 : ROWERS) - 1));
      for (const s of [-1, 1]) {
        if (i === 0 && k === (low ? 5 : ROWERS - 1) && s === 1) continue;   // room for the child at the front
        const r = new THREE.Group();
        r.position.set(x, 0.5, s * 0.28);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.24), mat('#ffffff'));
        body.position.y = 0.25;
        r.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), mat('#7a4a2a'));
        head.position.y = 0.58;
        r.add(head);
        const oar = new THREE.Group();
        oar.position.set(0, 0.35, s * 0.25);
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.1), mat('#8b5a2b'));
        stick.position.z = s * 0.45;
        oar.add(stick);
        r.add(oar);
        g.add(r);
        rowers.push({ oar, s, phase: k * 0.15 });
      }
    }
    const label = sign(3.2, 0.7, 0, 2.6, 0, 0, g);
    label.rotation.y = Math.PI / 2;
    return { ...b, g, rowers, label, dist: 0, shown: 0, rank: 0, done: false, finishedAt: 0 };
  });

  // the shore between the back wall and the water, closed at both ends; the jetty has rails
  const col = (minX, maxX, minZ, maxZ) => W.colliders.push({ minX, maxX, minZ, maxZ, on: true });
  col(-20.2, -19.8, SHORE - 0.2, -14);
  col(19.8, 20.2, SHORE - 0.2, -14);
  col(-20, JETTY.x - 1.2, SHORE - 0.4, SHORE);
  col(JETTY.x + 1.2, 20, SHORE - 0.4, SHORE);
  col(JETTY.x - 1.5, JETTY.x - 1.2, JETTY.z2, SHORE);
  col(JETTY.x + 1.2, JETTY.x + 1.5, JETTY.z2, SHORE);
  col(JETTY.x - 1.5, JETTY.x + 1.5, JETTY.z2 - 0.4, JETTY.z2);
  for (const s of [-1, 1]) box(0.08, 0.08, JETTY.z1 - JETTY.z2 - 1, '#6b3518', JETTY.x + s * 1.15, 0.75, (JETTY.z1 + JETTY.z2) / 2 - 0.5);

  root.add(mergeStatic(statics));

  // ---------- what is happening ----------
  const S = { active: false, phase: 'idle', t: 0, legs: 0, sprintT: 0, drift: 0, places: [], onFinish: null, cheer: 0, subjectLevel: 1 };
  const xOf = (b) => START_X + Math.min(FINISH_X - START_X, b.shown * SCALE + S.drift);

  function placeBoats() {
    for (const b of boats) { b.dist = 0; b.shown = 0; b.done = false; b.g.position.set(START_X, 0, b.g.position.z); }
    S.drift = 0;
  }

  function ranking() {
    return [...boats].sort((a, b) => b.dist - a.dist);
  }

  return {
    get active() { return S.active; },
    get phase() { return S.phase; },
    get legs() { return S.legs; },
    get boats() { return boats.map((b) => ({ name: b.name, dist: b.dist, x: b.g.position.x })); },
    holds() { return S.active; },
    constrain(p) {
      if (S.active) { const c = this.childSpot(); p.x = c.x; p.z = c.z; return; }
      if (S.land) { p.x = JETTY.x; p.z = JETTY.z2 + 1.5; S.land = false; }
    },
    // the child stands in the front of their boat
    childSpot() { const b = boats[0]; return { x: b.g.position.x + 4.2, z: b.g.position.z + 0.28, y: 0.5 }; },
    height() { return S.active ? 0.5 : null; },
    facing() { return S.active ? Math.PI / 2 : null; },
    inside(x, z) { return z < SHORE + 2 && x > -20; },

    refreshSigns(names, pick) {
      const paint = (m, lines, bg) => { m.material.map?.dispose(); m.material.map = labelTexture(lines, bg, '#ffffff'); m.material.needsUpdate = true; };
      paint(startSign, `🚩 ${names.start}`, '#3d7bff');
      paint(finishSign, `🏁 ${names.finish}`, '#ff3b30');
      boats.forEach((b) => paint(b.label, pick(b.name), b.color === '#ffd23d' ? '#c98a00' : b.color));
    },

    targets() {
      if (S.active) return [];
      return [{ kind: 'race', key: 'race', pos: [JETTY.x, JETTY.z2 + 1.5], r: 2 }];
    },

    // get the boats ready and count down; then the questions start
    start({ level = 1, onGo }) {
      S.active = true;
      S.phase = 'count';
      S.t = 0;
      S.legs = 0;
      S.onGo = onGo;
      S.subjectLevel = level;
      placeBoats();
    },

    // one question answered: everybody moves on
    leg(firstTry, seconds) {
      if (!S.active || S.phase === 'sprint') return null;
      S.legs++;
      const quick = Math.max(0, Math.min(1, (30 - seconds) / 25));   // up to 3 extra for an answer within about 5 to 30 seconds
      boats[0].dist += firstTry ? 12 + quick * 3 : 6.5;
      boats[0].surge = firstTry ? 1.6 : 0.4;
      for (const b of boats.slice(1)) {
        const skill = b.skill + (S.subjectLevel - 1) * 0.4;
        b.dist += skill + (Math.random() - 0.5) * 2.4;
        b.surge = 0.8;
      }
      if (firstTry) play('row');
      if (S.legs >= LEGS) {
        // the sprint: each boat reaches the line after a time that follows its points, so the order is fair
        S.phase = 'sprint';
        S.t = 0;
        const line = (FINISH_X - START_X - S.drift) / SCALE;
        for (const b of boats) { b.from = b.shown; b.arrive = 2.5 + (line - b.dist) * SCALE / 7; b.line = line; }
      }
      const order = ranking();
      return { place: order.indexOf(boats[0]) + 1, leader: order[0] === boats[0] ? null : order[0].name, last: S.legs >= LEGS };
    },

    // stop the race (left early, or after the result)
    end() {
      S.active = false;
      S.phase = 'idle';
      S.land = true;
      placeBoats();
      for (const b of boats) b.g.position.x = START_X - 4;
    },

    // camera behind the child's boat, on the shore side, looking along the lanes.
    // With the question card on the right (wide screens) or at the bottom (tall screens),
    // the boats are kept in the part of the screen that stays free.
    cameraGoals(camGoal, lookAt, narrow) {
      const b = boats[0];
      const x = b.g.position.x;
      if (narrow) {      // tall screen, card at the bottom: look down past the boats so they sit in the top part
        camGoal.set(x - 10, 8, LANES[0] + 7);
        lookAt.set(x + 2, -6, LANES[1] - 1);
      } else {           // wide screen, card on the right: look to the right of the boats so they sit on the left
        camGoal.set(x - 9, 6.5, LANES[0] + 8);
        lookAt.set(x + 7, 0.5, LANES[0] + 4);
      }
    },

    update(dt, time, me, quiet = false) {
      root.visible = me.z < 2 || S.active;
      if (!root.visible) return;
      waterTex.offset.x += dt * 0.02;
      for (const c of crowd) c.s.position.y = c.y + Math.max(0, Math.sin(time * (S.cheer > 0 ? 9 : 2) + c.phase)) * (S.cheer > 0 ? 0.35 : 0.06);
      if (S.cheer > 0) S.cheer -= dt;
      if (!S.active) {
        for (const b of boats) b.g.position.y = Math.sin(time * 1.3 + b.g.position.z) * 0.03;
        return;
      }
      S.t += dt;
      if (S.phase === 'count') {
        const before = Math.floor(S.t - dt), now = Math.floor(S.t);
        if (now !== before && now <= 3) play(now === 3 ? 'go' : 'beep');
        if (S.t >= 3) { S.phase = 'race'; S.onGo?.(); }
      }
      if (S.phase === 'race') S.drift = Math.min(6, S.drift + dt * 0.12);
      if (S.phase === 'sprint') {
        // everyone races to the line at the same speed, so the one in front gets there first
        for (const b of boats) {
          if (b.done) continue;
          b.shown = b.from + (b.line - b.from) * Math.min(1, S.t / b.arrive);
          if (S.t >= b.arrive) {
            b.done = true;
            S.places.push(b);
            if (b === boats[0]) { S.cheer = 6; play('cheer'); S.onFinish?.(boats.filter((o) => o.done).length); }
          }
        }
        if (boats.every((b) => b.done)) S.phase = 'over';
      } else {
        for (const b of boats) {
          const step = Math.max(0, b.dist - b.shown);
          b.shown += Math.min(step, Math.max(1.5, step * 0.9) * dt * 1.2);
        }
      }
      for (const b of boats) {
        b.g.position.x = xOf(b);
        b.g.position.y = Math.sin(time * 2 + b.g.position.z) * 0.04;
        const moving = (b.surge || 0) > 0 || S.phase === 'sprint' || b.dist - b.shown > 0.5;
        if (b.surge > 0) b.surge -= dt;
        const speed = moving ? 9 : 3;
        for (const r of b.rowers) r.oar.rotation.y = r.s * Math.sin(time * speed + r.phase) * (moving ? 0.6 : 0.2);
      }
    },

    // after the sprint: who came in which place (1 = first)
    set onFinish(f) { S.onFinish = f; S.places = []; },
    get childPlace() { return S.places.indexOf(boats[0]) + 1; },
  };
}
