// The forest beyond the west gate of the compound: a winding path with question boards and wooden gates,
// ending at a big tree. Climb it branch by branch; at the end fruit falls and the swing can be used.
// The child stays on the path because constrain() keeps them near it, so the forest needs no walls.
import * as THREE from 'three';
import { mat, labelTexture, emojiTexture, mergeStatic } from './house.js';
import { ambient, play } from '../audio.js';

export const GATES = 5;
export const BRANCHES = 3;

// Behind every gate waits something new, each bigger than the one before, so the child wants to see
// the next one: 1 a butterfly garden, 2 a stream with a boat to ride, 3 a glass tunnel full of fish,
// 4 a waterfall with a rainbow, 5 the big tree. Before a gate opens its board shows a hint picture
// and a hint sound plays near it; the stream and the waterfall can be heard from a distance.
export const TEASERS = ['🦋', '🚣', '🐠', '🌈', '🌳'];
const TEASE_SOUNDS = ['chime', 'paddle', 'bubbles', 'splash', 'tweet'];
const ZONES = [[14, 20.5], [33, 38.5], [55.5, 63], [83.5, 90]];   // where along the path each surprise is
const GARDEN = [13.5, 21];
const STREAM = { x: -50.2, z1: -20, z2: 8, w: 3 };   // runs north to south across the path at z = 2
const DOCK = { x: -50.2, z: -1.1 };
const BOAT_FAR = -17;
const BOAT_GO = 7, BOAT_TURN = 2, BOAT_SECONDS = 16;
const TUNNEL = { x1: -72.5, x2: -63.5, z: 14, r1: 5.4, r2: 6.6 };   // big enough for the camera to stay inside
const FALL = { x: -89, z: -6, top: 8, poolZ: -2.6, poolR: 2.9 };
const RAINBOW = { x: -91.5, z: 0, r: 5.2 };
const FISH = ['🐠', '🐟', '🐡', '🐠', '🐙', '🐢', '🐟', '🦈', '🐬', '🐠', '🦀', '🐟'];
const BUTTERFLY_TINTS = ['#ffffff', '#ffd6f2', '#fff2a8', '#d2f4ff', '#e6d4ff'];
const RAINBOW_COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00b7ff', '#5856d6', '#af52de'];
// no trees or bushes where the stream, the tunnel and the waterfall are
const KEEP_OUT = [
  (x, z) => Math.abs(x - STREAM.x) < 3 && z > STREAM.z1 - 1 && z < STREAM.z2 + 3.5,
  (x, z) => x > TUNNEL.x1 - 1 && x < TUNNEL.x2 + 1 && Math.abs(z - TUNNEL.z) < TUNNEL.r2 + 0.6,
  (x, z) => x > FALL.x - 6 && x < FALL.x + 6 && z > -11 && z < 1.5,
];
const keptFree = (x, z) => KEEP_OUT.some((f) => f(x, z));

// an emoji with no white circle behind it, for fish and butterflies
const bareTextures = new Map();
function bareEmoji(e) {
  if (bareTextures.has(e)) return bareTextures.get(e);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = '100px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(e, 64, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  bareTextures.set(e, t);
  return t;
}

// light streaks on water; they move by shifting the texture
function waterTexture(base, streak, lines) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 128);
  g.strokeStyle = streak;
  g.lineCap = 'round';
  for (let i = 0; i < lines; i++) {
    const x = Math.random() * 64, y = Math.random() * 128, l = 6 + Math.random() * 18;
    g.lineWidth = 1.5 + Math.random() * 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y + l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const smooth = (u) => u * u * (3 - 2 * u);

// where the boat is t seconds into the ride, and which way it points (0 = south, PI = north)
function boatAt(t) {
  const len = DOCK.z - BOAT_FAR;
  if (t < BOAT_GO) return { x: DOCK.x, z: DOCK.z - len * smooth(t / BOAT_GO), head: Math.PI, rowing: true };
  if (t < BOAT_GO + BOAT_TURN) {
    const u = (t - BOAT_GO) / BOAT_TURN;
    return { x: DOCK.x + Math.sin(u * Math.PI) * 0.6, z: BOAT_FAR, head: Math.PI + Math.PI * smooth(u), rowing: false };
  }
  const u = Math.min(1, (t - BOAT_GO - BOAT_TURN) / (BOAT_SECONDS - BOAT_GO - BOAT_TURN));
  return { x: DOCK.x, z: BOAT_FAR + len * smooth(u), head: 0, rowing: u < 0.95 };
}

export const PATH = [[-19.5, 12], [-34, 12], [-42, 2], [-54, 2], [-62, 14], [-76, 14], [-84, 4], [-98, 4]];
const HALF = 1.9;                     // half the width of the path
const EDGE = -20.1;                   // west of this line the child is in the forest
const TREE = { x: -108, z: 4 };
const CLEARING = 11;                  // radius of the open ground around the big tree
const TRUNK = 1.8;
const STEP_RADIUS = 2.7;              // the climb goes around the trunk at this distance
const TURN = 2.2;                     // how far around the trunk one branch is
const CLIMB = 3.2;                    // height of one branch
const CLIMB_SECONDS = 2;              // to go up or down one branch
const SWING = { x: TREE.x, z: TREE.z + 6.2, top: 5.1, rope: 4.4, seconds: 9 };
const FRUITS = 24;
const FRUIT_STAY = 14;                // seconds a fallen fruit waits on the ground
const ITEMS = ['🐿️', '🦜', '🍯'];
const ANIMALS = ['🦋', '🐒', '🦋', '🦜', '🐇', '🦋'];

// the path as straight pieces, each knowing how far along the whole path it starts
const pieces = [];
let LENGTH = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1];
  const len = Math.hypot(bx - ax, bz - az);
  pieces.push({ ax, az, ux: (bx - ax) / len, uz: (bz - az) / len, len, start: LENGTH });
  LENGTH += len;
}

function pointAt(d) {
  const s = pieces.find((p) => d <= p.start + p.len) || pieces[pieces.length - 1];
  const t = d - s.start;
  return { x: s.ax + s.ux * t, z: s.az + s.uz * t, ux: s.ux, uz: s.uz };
}

const gateDistance = (i) => 11 + ((LENGTH - 13) * i) / (GATES - 1);
const boardDistance = (i) => gateDistance(i) - 3;

// the nearest point on the path, not going further than `limit`
function nearestOnPath(x, z, limit = LENGTH) {
  let best = null;
  for (const s of pieces) {
    if (s.start > limit) break;
    const t = Math.max(0, Math.min(Math.min(s.len, limit - s.start), (x - s.ax) * s.ux + (z - s.az) * s.uz));
    const qx = s.ax + s.ux * t, qz = s.az + s.uz * t;
    const d = Math.hypot(x - qx, z - qz);
    if (!best || d < best.d) best = { x: qx, z: qz, d, along: s.start + t };
  }
  return best;
}

// where the child stands at a branch: 0 is on the ground beside the trunk
const climbPoint = (p) => ({
  x: TREE.x + Math.cos(p * TURN) * STEP_RADIUS,
  z: TREE.z + Math.sin(p * TURN) * STEP_RADIUS,
  y: p * CLIMB,
});

export function createForest({ scene, W, low, onFruit, onSurprise }) {
  const root = new THREE.Group();
  const entry = new THREE.Group();
  scene.add(root, entry);
  const statics = new THREE.Group();
  let seed = 4817;
  const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

  const box = (w, h, d, color, x, y, z, parent = statics, rotY = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    parent.add(m);
    return m;
  };
  const cyl = (r1, r2, h, color, x, y, z, parent = statics, seg = 6) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat(color));
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  };
  const blob = (r, color, x, y, z, parent = statics) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(color));
    m.position.set(x, y, z);
    m.rotation.set(rnd(0, 3), rnd(0, 3), 0);
    parent.add(m);
    return m;
  };
  const sign = (parent, w, h, x, y, z, rotY) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true }));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    parent.add(m);
    return m;
  };
  const floating = (emoji, x, y, z, size = 0.8) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), depthWrite: false }));
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    root.add(s);
    return s;
  };

  // ---------- the way there, from the front steps to the gap in the compound wall ----------
  box(18.7, 0.02, 1.7, '#f2d49b', -10.6, 0, 12.5, entry);
  for (const s of [-1, 1]) cyl(0.14, 0.17, 2.6, '#6b3518', -20, 0, 12 + s * 1.6, entry);
  box(0.2, 0.2, 3.5, '#6b3518', -20, 2.5, 12, entry);
  const archSign = sign(entry, 3, 0.75, -19.85, 2.2, 12, Math.PI / 2);
  cyl(0.05, 0.05, 1.7, '#6b3518', -2, 0, 15.4, entry);
  const postSign = sign(entry, 2, 0.5, -2, 1.75, 15.45, 0);

  // ---------- ground and path ----------
  box(112, 0.1, 110, '#5aa845', -76, -0.06, 6);
  for (const s of pieces) {
    box(HALF * 2, 0.02, s.len + 1, '#c9a26b', s.ax + (s.ux * s.len) / 2, 0.05, s.az + (s.uz * s.len) / 2, statics, Math.atan2(s.ux, s.uz));
    cyl(HALF, HALF, 0.02, '#c9a26b', s.ax, 0.05, s.az, statics, 12);
  }
  cyl(HALF, HALF, 0.02, '#c9a26b', PATH[PATH.length - 1][0], 0.05, PATH[PATH.length - 1][1], statics, 12);
  cyl(CLEARING, CLEARING, 0.02, '#a8cf63', TREE.x, 0.045, TREE.z, statics, 20);

  // ---------- trees and plants ----------
  const trunks = ['#6e4a2f', '#7d5a3c', '#5c3d26'];
  const leaves = ['#2f7d3a', '#3b9147', '#256b33', '#4fa34a'];
  const treeAt = (x, z, big) => {
    const h = rnd(5, 9) * (big ? 1.2 : 1);
    cyl(0.22, rnd(0.35, 0.5), h, trunks[Math.floor(rnd(0, 3))], x, 0, z);
    const parts = big ? 3 : 2;
    for (let i = 0; i < parts; i++) {
      blob(rnd(1.5, 2.5), leaves[Math.floor(rnd(0, 4))], x + rnd(-0.7, 0.7), h + rnd(-0.6, 1.4), z + rnd(-0.7, 0.7));
    }
  };
  const free = (x, z, margin) => nearestOnPath(x, z).d > margin && Math.hypot(x - TREE.x, z - TREE.z) > CLEARING + 1 && x < -21.5 && !keptFree(x, z);
  // a thick row of trees on both sides of the path, then more further back
  for (let d = 2; d < LENGTH; d += low ? 4.4 : 2.6) {
    const p = pointAt(d);
    for (const s of [-1, 1]) {
      const out = rnd(4.6, 7);
      const x = p.x - p.uz * out * s + rnd(-0.7, 0.7), z = p.z + p.ux * out * s + rnd(-0.7, 0.7);
      if (free(x, z, 4.3)) treeAt(x, z, false);
    }
  }
  for (let a = 0; a < (low ? 26 : 48); a++) {       // a ring of trees around the clearing
    const t = (a / (low ? 26 : 48)) * Math.PI * 2, r = CLEARING + rnd(1.5, 4);
    const x = TREE.x + Math.cos(t) * r, z = TREE.z + Math.sin(t) * r;
    if (nearestOnPath(x, z).d > 4.3 && !keptFree(x, z)) treeAt(x, z, true);
  }
  for (let i = 0; i < (low ? 50 : 130); i++) {
    const x = rnd(-128, -22), z = rnd(-26, 40);
    if (free(x, z, 7)) treeAt(x, z, true);
  }
  // bushes, ferns, flowers and stones beside the path
  for (let d = 1; d < LENGTH; d += low ? 3 : 1.5) {
    const p = pointAt(d), s = rnd() < 0.5 ? -1 : 1, out = HALF + rnd(0.5, 1.4);
    const x = p.x - p.uz * out * s, z = p.z + p.ux * out * s;
    const kind = rnd();
    if (keptFree(x, z)) continue;
    if (kind < 0.45) blob(rnd(0.4, 0.7), leaves[Math.floor(rnd(0, 4))], x, 0.35, z);
    else if (kind < 0.7) {
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 4), mat('#57b34c'));
        f.position.set(x + rnd(-0.2, 0.2), 0.45, z + rnd(-0.2, 0.2));
        f.rotation.set(rnd(-0.4, 0.4), 0, rnd(-0.4, 0.4));
        statics.add(f);
      }
    } else if (kind < 0.88) {
      cyl(0.02, 0.02, 0.35, '#3b9147', x, 0, z, statics, 4);
      blob(0.1, ['#ff5d8f', '#ffd23d', '#ffffff', '#b26bff'][Math.floor(rnd(0, 4))], x, 0.4, z);
    } else blob(rnd(0.25, 0.45), '#8d8d84', x, 0.15, z);
  }

  // ---------- question boards and gates ----------
  const boards = [];
  const gates = [];
  for (let i = 0; i < GATES; i++) {
    const b = pointAt(boardDistance(i));
    const side = i % 2 ? 1 : -1;     // right or left of the path, by turns
    const x = b.x - b.uz * (HALF + 0.5) * side, z = b.z + b.ux * (HALF + 0.5) * side;
    const facing = Math.atan2(-b.ux, -b.uz);
    for (const s of [-1, 1]) cyl(0.07, 0.08, 2.3, '#6b3518', x + b.uz * s, 0, z - b.ux * s);
    box(2.5, 0.72, 0.08, '#6b3518', x, 1.5, z, statics, facing);
    const board = sign(root, 2.4, 0.6, x - b.ux * 0.06, 1.86, z - b.uz * 0.06, facing);
    boards.push({ board, pos: [b.x, b.z], icon: floating('❓', x, 2.75, z, 0.7) });

    const g = pointAt(gateDistance(i));
    const group = new THREE.Group();
    group.position.set(g.x, 0, g.z);
    group.rotation.y = Math.atan2(g.ux, g.uz);
    root.add(group);
    const left = new THREE.Group(), right = new THREE.Group();
    left.position.set(-HALF - 0.05, 0, 0);
    right.position.set(HALF + 0.05, 0, 0);
    group.add(left, right);
    for (const [leaf, s] of [[left, 1], [right, -1]]) {
      for (let k = 0; k < 4; k++) box(0.34, 1.9, 0.08, k % 2 ? '#8b5a2b' : '#a0692f', s * (0.23 + k * 0.46), 0, 0, leaf);
      for (const y of [0.45, 1.45]) box(HALF, 0.12, 0.13, '#5c3d26', (s * HALF) / 2, y, 0, leaf);
    }
    for (const s of [-1, 1]) cyl(0.17, 0.2, 2.7, '#5c3d26', s * (HALF + 0.15), 0, 0, group);
    const lock = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('🔒'), depthWrite: false }));
    lock.scale.set(0.8, 0.8, 1);
    lock.position.set(0, 2.5, 0);
    group.add(lock);
    gates.push({ left, right, lock, angle: 0, target: 0 });
  }

  // ---------- the big tree ----------
  const big = new THREE.Group();
  root.add(big);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, TRUNK, 13, 10), mat('#6e4a2f', true));
  trunk.position.set(TREE.x, 6.5, TREE.z);
  big.add(trunk);
  for (let i = 0; i < 6; i++) {      // big roots
    const a = (i / 6) * Math.PI * 2;
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.55), mat('#5c3d26'));
    r.position.set(TREE.x + Math.cos(a) * 1.8, 0.2, TREE.z - Math.sin(a) * 1.8);
    r.rotation.y = a;
    statics.add(r);
  }
  const crown = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 6, r = 1.5 + (i % 6) * 1.1;
    blob(rnd(2.6, 3.8), '#000000', TREE.x + Math.cos(a) * r, 13 + (i % 4) * 1.1, TREE.z + Math.sin(a) * r, crown);
  }
  const crownMesh = mergeStatic(crown).children[0];
  crownMesh.material = mat('#2f8a3d', true);
  big.add(crownMesh);
  W.fadeables.push(trunk, crownMesh);

  // wooden steps winding up the trunk, and a platform and a surprise at each branch
  const steps = BRANCHES * (low ? 8 : 12);
  for (let i = 1; i < steps; i++) {
    const p = (i / steps) * BRANCHES, a = p * TURN;
    box(1.5, 0.1, 0.5, '#8b5a2b', TREE.x + Math.cos(a) * 2.4, p * CLIMB - 0.1, TREE.z + Math.sin(a) * 2.4, statics, Math.PI / 2 - a);
  }
  const itemIcons = [];
  for (let p = 1; p <= BRANCHES; p++) {
    const c = climbPoint(p), a = p * TURN;
    box(2.6, 0.5, 2.0, '#6e4a2f', TREE.x + Math.cos(a) * 2.6, c.y - 0.55, TREE.z + Math.sin(a) * 2.6, statics, -a);
    box(2.7, 0.08, 2.1, '#a0692f', TREE.x + Math.cos(a) * 2.6, c.y - 0.08, TREE.z + Math.sin(a) * 2.6, statics, -a);
    // leaves to the sides of the platform, so they never hide the child from the camera
    for (const s of [-1, 1]) {
      const side = a + s * 1.05;
      blob(0.9, '#3b9147', TREE.x + Math.cos(side) * 3.7, c.y + 0.2, TREE.z + Math.sin(side) * 3.7);
    }
    const near = a + 0.75;
    itemIcons.push(floating(ITEMS[p - 1], TREE.x + Math.cos(near) * 3.5, c.y + 1.3, TREE.z + Math.sin(near) * 3.5, 0.8));
  }

  // the swing, hanging from a low branch
  const bough = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 7), mat('#5c3d26', true));
  bough.position.set(TREE.x, SWING.top + 0.22, TREE.z + 3.6);
  big.add(bough);
  W.fadeables.push(bough);
  const swing = new THREE.Group();
  swing.position.set(SWING.x, SWING.top, SWING.z);
  root.add(swing);
  for (const s of [-0.38, 0.38]) cyl(0.025, 0.025, SWING.rope, '#e8d9b0', 0, -SWING.rope, s, swing, 4);
  box(0.42, 0.07, 0.9, '#a0692f', 0, -SWING.rope, 0, swing);
  const swingIcon = floating('🛝', SWING.x, 2.6, SWING.z, 0.7);
  swingIcon.visible = false;

  // falling fruit
  const fruitColors = ['#ffb300', '#ff7a1a', '#e53935', '#c6d632'];
  const fruits = [];
  for (let i = 0; i < FRUITS; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), mat(fruitColors[i % 4]));
    m.visible = false;
    root.add(m);
    fruits.push({ m, state: 'away', stay: 0, speed: 0 });
  }

  // butterflies and small animals beside the path
  const animals = ANIMALS.slice(0, low ? 3 : ANIMALS.length).map((emoji, i) => {
    const p = pointAt((LENGTH * (i + 0.6)) / ANIMALS.length);
    return { sprite: floating(emoji, p.x - p.uz * 3, 1.5, p.z + p.ux * 3, 0.6), x: p.x - p.uz * 3, z: p.z + p.ux * 3, i };
  });

  // ---------- surprise 1: the butterfly garden ----------
  const flowerSpots = [];
  for (let k = 0; k < (low ? 26 : 52); k++) {
    const p = pointAt(rnd(GARDEN[0], GARDEN[1])), s = rnd() < 0.5 ? -1 : 1, out = rnd(HALF + 0.25, HALF + 2.6);
    const x = p.x - p.uz * out * s, z = p.z + p.ux * out * s, h = rnd(0.35, 0.7);
    cyl(0.025, 0.025, h, '#3b9147', x, 0, z, statics, 4);
    blob(rnd(0.12, 0.2), ['#ff5d8f', '#ffd23d', '#ff8c42', '#b26bff', '#ffffff', '#ff4f4f'][Math.floor(rnd(0, 6))], x, h + 0.05, z);
    flowerSpots.push({ x, z, y: h + 0.35 });
  }
  const butterflies = [];
  for (let k = 0; k < (low ? 7 : 14); k++) {
    const home = flowerSpots[(k * 7) % flowerSpots.length];
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bareEmoji('🦋'), color: BUTTERFLY_TINTS[k % BUTTERFLY_TINTS.length], depthWrite: false }));
    s.scale.set(0.5, 0.5, 1);
    s.position.set(home.x, home.y, home.z);
    root.add(s);
    butterflies.push({ s, home, phase: rnd(0, 6), r: rnd(0.9, 2.2), speed: rnd(1.2, 2.2) * (k % 2 ? 1 : -1), up: rnd(0.6, 2.2) });
  }

  // ---------- surprise 2: the stream, a bridge and a boat ----------
  const streamLen = STREAM.z2 - STREAM.z1;
  const streamTex = waterTexture('#3d9fe0', 'rgba(255,255,255,0.55)', 26);
  streamTex.repeat.set(1, streamLen / 4);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(STREAM.w, streamLen), new THREE.MeshLambertMaterial({ map: streamTex }));
  stream.rotation.x = -Math.PI / 2;
  stream.position.set(STREAM.x, 0.068, (STREAM.z1 + STREAM.z2) / 2);
  root.add(stream);
  cyl(2.3, 2.3, 0.02, '#3d9fe0', STREAM.x, 0.055, STREAM.z2 + 0.9, statics, 16);         // a little pond where it ends
  for (let z = STREAM.z1; z < STREAM.z2 + 2; z += low ? 2.6 : 1.4) {                     // stones on both banks
    for (const s of [-1, 1]) if (Math.abs(z - 2) > 2.6) blob(rnd(0.18, 0.4), rnd() < 0.5 ? '#8d8d84' : '#a5a59a', STREAM.x + s * (STREAM.w / 2 + rnd(0.1, 0.5)), 0.12, z + rnd(-0.4, 0.4));
  }
  for (let k = 0; k < 4; k++) blob(rnd(0.6, 1.1), '#8d8d84', STREAM.x + rnd(-1.6, 1.6), 0.4, STREAM.z1 - rnd(0.3, 1.2));   // where the water comes out
  box(3.8, 0.08, 4.3, '#a0692f', STREAM.x, 0.06, 2);                                     // the bridge
  for (let k = -1.5; k <= 1.5; k += 0.6) box(0.06, 0.02, 4.3, '#6b3518', STREAM.x + k, 0.14, 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.07, 0.07, 0.7, '#6b3518', STREAM.x + sx * 1.8, 0, 2 + sz * 2.1);
  const boat = new THREE.Group();
  box(1.0, 0.3, 2.0, '#8b5a2b', 0, 0, 0, boat);
  box(0.8, 0.06, 1.7, '#c9a26b', 0, 0.22, 0, boat);
  box(0.9, 0.12, 0.25, '#a0692f', 0, 0.3, -0.6, boat);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 4), mat('#8b5a2b'));
  bow.rotation.set(Math.PI / 2, Math.PI / 4, 0);      // the pointed front, the way the boat goes
  bow.scale.set(1, 1, 0.42);
  bow.position.set(0, 0.15, 1.25);
  boat.add(bow);
  const oars = [-1, 1].map((s) => {
    const o = new THREE.Group();
    o.position.set(s * 0.5, 0.35, 0.1);
    box(0.05, 0.05, 1.5, '#6b3518', 0, 0, 0, o);
    box(0.06, 0.25, 0.4, '#a0692f', 0, -0.12, 0.7, o);
    boat.add(o);
    return { o, s };
  });
  boat.position.set(DOCK.x, 0.02, DOCK.z);
  boat.rotation.y = Math.PI;
  root.add(boat);
  const boatIcon = floating('🚣', DOCK.x + 1.2, 2.2, DOCK.z, 0.7);
  boatIcon.visible = false;

  // ---------- surprise 3: a glass tunnel of water with fish all around ----------
  const tunnelLen = TUNNEL.x2 - TUNNEL.x1, tunnelX = (TUNNEL.x1 + TUNNEL.x2) / 2;
  const glass = (r, opacity) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, tunnelLen, 28, 1, true, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: '#1e9be0', transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.z = Math.PI / 2;
    m.position.set(tunnelX, 0, TUNNEL.z);
    root.add(m);
  };
  glass(TUNNEL.r2, 0.42);
  glass(TUNNEL.r1, 0.2);
  for (const x of [TUNNEL.x1, TUNNEL.x2]) {
    const end = new THREE.Mesh(new THREE.RingGeometry(TUNNEL.r1, TUNNEL.r2, 24, 1, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    end.rotation.y = Math.PI / 2;
    end.position.set(x, 0, TUNNEL.z);
    root.add(end);
    for (const r of [TUNNEL.r1, TUNNEL.r2]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 5, 22, Math.PI), mat('#2a9d8f'));
      arch.rotation.y = Math.PI / 2;
      arch.position.set(x, 0, TUNNEL.z);
      statics.add(arch);
    }
  }
  for (let x = TUNNEL.x1 + 0.6; x < TUNNEL.x2; x += low ? 1.6 : 0.9) {      // sand and coral in the water at the sides
    for (const s of [-1, 1]) {
      blob(rnd(0.25, 0.5), ['#ff7f7f', '#ffb347', '#ff6fb5', '#f7e17a', '#9b7bff'][Math.floor(rnd(0, 5))], x + rnd(-0.3, 0.3), 0.3, TUNNEL.z + s * rnd(TUNNEL.r1 + 0.25, TUNNEL.r2 - 0.25));
    }
  }
  const fish = [];
  for (let k = 0; k < (low ? 12 : 26); k++) {
    const e = FISH[k % FISH.length], bottom = e === '🦀' || e === '🐢';
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bareEmoji(e), depthWrite: false }));
    const size = e === '🦈' || e === '🐬' ? 1.4 : rnd(0.7, 1.0);
    s.scale.set(size, size, 1);
    root.add(s);
    fish.push({ s, size, x: rnd(TUNNEL.x1, TUNNEL.x2), th: bottom ? (rnd() < 0.5 ? 0.12 : Math.PI - 0.12) : rnd(0.3, Math.PI - 0.3), r: rnd(TUNNEL.r1 + 0.3, TUNNEL.r2 - 0.3), speed: rnd(0.4, 1.0) * (rnd() < 0.5 ? 1 : -1) * (bottom ? 0.3 : 1), wob: rnd(0, 6) });
  }
  const bubbles = [];
  for (let k = 0; k < (low ? 5 : 10); k++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }));
    root.add(b);
    bubbles.push({ b, x: rnd(TUNNEL.x1, TUNNEL.x2), th: rnd(0.2, Math.PI - 0.2), t: rnd(0, 1) });
  }

  // ---------- surprise 4: a waterfall with a pool, and a rainbow over the path ----------
  box(8, FALL.top, 3, '#7d7d75', FALL.x, 0, FALL.z - 1.5);
  for (let k = 0; k < 10; k++) blob(rnd(1, 1.8), k % 3 ? '#8d8d84' : '#6f6f68', FALL.x + rnd(-4.5, 4.5), rnd(0.5, FALL.top), FALL.z - rnd(1, 3));
  for (let k = 0; k < 6; k++) blob(rnd(0.8, 1.4), '#3b9147', FALL.x + rnd(-4, 4), FALL.top + 0.2, FALL.z - rnd(0.6, 2.6));
  const fallTex = waterTexture('#9fdcff', 'rgba(255,255,255,0.9)', 40);
  fallTex.repeat.set(1, 2);
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(2.6, FALL.top), new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.9 }));
  fall.position.set(FALL.x, FALL.top / 2, FALL.z + 0.06);
  root.add(fall);
  const poolTex = waterTexture('#3d9fe0', 'rgba(255,255,255,0.45)', 18);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(FALL.poolR, 20), new THREE.MeshLambertMaterial({ map: poolTex }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(FALL.x, 0.07, FALL.poolZ);
  root.add(pool);
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    blob(rnd(0.3, 0.55), '#8d8d84', FALL.x + Math.cos(t) * (FALL.poolR + 0.2), 0.15, FALL.poolZ + Math.sin(t) * (FALL.poolR + 0.2));
  }
  const foam = [];
  for (let k = 0; k < 5; k++) {
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 }));
    f.position.set(FALL.x - 1 + k * 0.5, 0.2, FALL.z + 0.5);
    root.add(f);
    foam.push(f);
  }
  const rainbow = new THREE.Group();
  rainbow.position.set(RAINBOW.x, 0, RAINBOW.z);
  rainbow.rotation.y = Math.PI / 2;
  root.add(rainbow);
  const rainbowMats = RAINBOW_COLORS.map((c, i) => {
    const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(RAINBOW.r + (RAINBOW_COLORS.length - 1 - i) * 0.24, 0.13, 4, 40, Math.PI), m);
    rainbow.add(arc);
    return m;
  });
  rainbow.visible = false;

  const merged = mergeStatic(statics);
  root.add(merged);

  // ---------- what is happening now ----------
  const S = {
    stage: 0, done: false, perch: 0,
    move: null,          // climbing: { from, to, t, seconds, then }
    swingLeft: 0, swingAngle: 0,
    high: null,          // the child's height while on the tree or the swing
    facing: null,
    fruitTime: 0,
    seen: new Set(),     // the surprises already shown on this trip
    swarm: 0,            // seconds the butterflies still fly around the child
    excite: 0,           // seconds the fish still crowd around the child
    boat: null,          // the boat ride: { t, paddle }
    land: false,         // just off the boat: step back onto the bridge
    tease: 0,            // seconds until the next hint sound at a closed gate
    rainbow: 0,          // how clearly the rainbow shows, 0 to 1
  };

  function placeClimb(p, u) {
    const at = u * (S.move.to - S.move.from) + S.move.from;
    const c = climbPoint(at);
    p.x = c.x; p.z = c.z;
    S.high = c.y;
    const dir = Math.sign(S.move.to - S.move.from) || 1;
    S.facing = Math.atan2(-Math.sin(at * TURN) * dir, Math.cos(at * TURN) * dir);
  }

  return {
    pathLength: LENGTH,
    climbPoint,
    get perch() { return S.perch; },
    get swinging() { return S.swingLeft > 0; },
    get climbing() { return !!S.move; },
    get riding() { return !!S.boat; },
    // true while the child can't walk (up in the tree, on the swing or in the boat)
    holds() { return S.perch > 0 || !!S.move || S.swingLeft > 0 || !!S.boat; },
    facing() { return S.facing; },

    setProgress(stage, done, instant = false) {
      S.stage = stage;
      S.done = done;
      gates.forEach((g, i) => {
        g.target = i < stage ? 1.6 : 0;
        g.lock.visible = i >= stage;
        if (instant) g.angle = g.target;
      });
      boards.forEach((b, i) => { b.icon.visible = i === stage; });
      swingIcon.visible = done;
      for (const i of [...S.seen]) if (i >= stage) S.seen.delete(i);    // a new trip shows them again
    },

    refreshSigns(names) {
      const paint = (m, lines, bg, fg = '#ffffff') => {
        m.material.map?.dispose();
        m.material.map = labelTexture(lines, bg, fg);
        m.material.needsUpdate = true;
      };
      paint(archSign, `🌳 ${names.forest}`, '#2f7d3a');
      paint(postSign, `⬅ 🌳 ${names.toForest}`, '#2f7d3a');
      boards.forEach((b, i) => paint(b.board, [`🪧 ${names.board} ${i + 1}/${GATES}`, i < S.stage ? '✅' : `${names.behind} ${TEASERS[i]}❓`], '#f6e3b4', '#3a2a1a'));
    },

    // Keeps the child on the path, behind the next closed gate, or on the tree or swing.
    constrain(p, dt) {
      if (S.boat) {
        const b = boatAt(S.boat.t);
        p.x = b.x; p.z = b.z;
        S.high = 0.28;
        S.facing = b.head;
        return;
      }
      if (S.land) { S.land = false; p.x = DOCK.x; p.z = 0.6; return; }
      if (S.swingLeft > 0) {
        p.x = SWING.x + Math.sin(S.swingAngle) * SWING.rope;
        p.z = SWING.z;
        S.high = SWING.top - Math.cos(S.swingAngle) * SWING.rope + 0.05;
        return;
      }
      if (S.move) {
        S.move.t += dt / S.move.seconds;
        placeClimb(p, Math.min(1, S.move.t));
        if (S.move.t >= 1) {
          const { to, then } = S.move;
          S.move = null;
          S.perch = to;
          S.facing = null;
          if (to === 0) S.high = null;
          then?.();
        }
        return;
      }
      if (S.perch > 0) {
        const c = climbPoint(S.perch);
        p.x = c.x; p.z = c.z;
        return;
      }
      if (p.x >= EDGE) return;
      const open = S.stage >= GATES;
      const near = nearestOnPath(p.x, p.z, open ? LENGTH : gateDistance(S.stage) - 0.7);
      if (open) {
        const dx = p.x - TREE.x, dz = p.z - TREE.z, d = Math.hypot(dx, dz);
        if (d < TRUNK) { p.x = TREE.x + (dx / (d || 1)) * TRUNK; p.z = TREE.z + (dz / (d || 1)) * TRUNK; return; }
        if (d <= CLEARING) return;
        if (d - CLEARING < near.d - HALF) { p.x = TREE.x + (dx / d) * CLEARING; p.z = TREE.z + (dz / d) * CLEARING; return; }
      }
      if (near.d > HALF) {
        p.x = near.x + ((p.x - near.x) / near.d) * HALF;
        p.z = near.z + ((p.z - near.z) / near.d) * HALF;
      }
    },

    // The direction of the path here, for a camera behind the child: forward along the way,
    // or back towards the house if the child is walking that way (vx, vz).
    viewYaw(p, vx = 0, vz = 0) {
      if (S.boat) {                  // in the boat: looking the way it goes
        const h = boatAt(S.boat.t).head;
        return Math.atan2(-Math.sin(h), -Math.cos(h));
      }
      if (S.perch > 0 || S.move) {   // in the tree: from outside, looking in at the child and the trunk
        const a = Math.atan2(p.z - TREE.z, p.x - TREE.x);
        return Math.atan2(Math.cos(a), Math.sin(a));
      }
      if (p.x >= EDGE - 2 || Math.hypot(p.x - TREE.x, p.z - TREE.z) < CLEARING) return null;
      const along = nearestOnPath(p.x, p.z).along;
      const here = pointAt(along);
      const back = vx * here.ux + vz * here.uz < -0.2;
      const next = pointAt(Math.max(0, Math.min(LENGTH, along + (back ? -3 : 3))));
      return back ? Math.atan2(next.ux, next.uz) : Math.atan2(-next.ux, -next.uz);
    },

    // the height of the child's feet while up in the tree or on the swing, otherwise null
    height() { return S.high; },

    climbTo(perch, then) {
      S.move = { from: S.perch, to: perch, t: 0, seconds: Math.max(1, Math.abs(perch - S.perch)) * CLIMB_SECONDS, then };
    },

    startBoat(then) {
      S.boat = { t: 0, paddle: 0.3, then };
    },

    startSwing(then) {
      S.swingLeft = SWING.seconds;
      S.swingAngle = 0;
      S.onSwingEnd = then;
    },

    fruitRain() {
      for (const f of fruits) {
        const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 6;
        f.m.position.set(TREE.x + Math.cos(a) * r, 11 + Math.random() * 9, TREE.z + Math.sin(a) * r);
        f.m.visible = true;
        f.state = 'falling';
        f.speed = 3 + Math.random() * 2;
        f.stay = FRUIT_STAY;
      }
    },

    updateSurprises(dt, time, me, quiet) {
      // arriving at a surprise behind an open gate shows it, once a trip
      if (me.x < EDGE && !this.holds()) {
        const along = nearestOnPath(me.x, me.z).along;
        ZONES.forEach(([a, b], i) => {
          if (S.stage > i && !S.seen.has(i) && along >= a && along <= b) {
            S.seen.add(i);
            if (i === 0) S.swarm = 12;
            if (i === 2) S.excite = 10;
            onSurprise?.(i);
          }
        });
        // a hint sound now and then near the next closed gate
        S.tease -= dt;
        if (!quiet && S.stage < GATES && S.tease <= 0) {
          const g = pointAt(gateDistance(S.stage));
          if (Math.hypot(me.x - g.x, me.z - g.z) < 8) { play(TEASE_SOUNDS[S.stage]); S.tease = 5; }
        }
      }
      // butterflies: resting over the flowers, or flying around the child
      if (S.swarm > 0) S.swarm -= dt;
      for (const b of butterflies) {
        let tx, ty, tz;
        if (S.swarm > 0) {
          const a = time * b.speed + b.phase;
          tx = me.x + Math.cos(a) * b.r; tz = me.z + Math.sin(a) * b.r; ty = me.y + b.up + Math.sin(time * 3 + b.phase) * 0.3;
        } else {
          tx = b.home.x + Math.sin(time * 0.9 + b.phase) * 0.5; tz = b.home.z + Math.cos(time * 0.7 + b.phase) * 0.5; ty = b.home.y + Math.abs(Math.sin(time * 1.3 + b.phase)) * 0.5;
        }
        const k = Math.min(1, dt * (S.swarm > 0 ? 2.5 : 1));
        b.s.position.x += (tx - b.s.position.x) * k;
        b.s.position.y += (ty - b.s.position.y) * k;
        b.s.position.z += (tz - b.s.position.z) * k;
        b.s.scale.x = 0.5 * (0.35 + 0.65 * Math.abs(Math.sin(time * 14 + b.phase)));   // flapping wings
      }
      // water flowing
      streamTex.offset.y -= dt * 0.35;
      fallTex.offset.y += dt * 1.6;
      poolTex.offset.x += dt * 0.05;
      foam.forEach((f, i) => f.scale.setScalar(0.8 + Math.sin(time * 5 + i * 1.7) * 0.25));
      // the boat: waiting at the bridge, or out on the stream with the child in it
      boatIcon.visible = S.stage >= 2 && !S.boat;
      boatIcon.position.y = 2.2 + Math.sin(time * 2) * 0.1;
      if (S.boat) {
        S.boat.t += dt;
        const b = boatAt(S.boat.t);
        boat.position.set(b.x, 0.02 + Math.sin(time * 2.2) * 0.03, b.z);
        boat.rotation.y = b.head;
        boat.rotation.z = Math.sin(time * 1.7) * 0.03;
        for (const { o, s } of oars) {
          o.rotation.x = b.rowing ? Math.sin(time * 4.5) * 0.5 : 0;
          o.rotation.y = s * (b.rowing ? 0.5 + Math.cos(time * 4.5) * 0.35 : 0.9);
        }
        S.boat.paddle -= dt;
        if (b.rowing && S.boat.paddle <= 0) { play('paddle'); S.boat.paddle = 1.4; }
        if (S.boat.t >= BOAT_SECONDS) {
          const then = S.boat.then;
          S.boat = null;
          S.land = true;
          S.high = null;
          S.facing = null;
          boat.position.set(DOCK.x, 0.02, DOCK.z);
          boat.rotation.set(0, Math.PI, 0);
          then?.();
        }
      } else boat.position.y = 0.02 + Math.sin(time * 1.5) * 0.02;
      // fish swim along the tunnel; when the child arrives they crowd around and swim fast
      if (S.excite > 0) S.excite -= dt;
      const fast = S.excite > 0 ? 2.6 : 1;
      for (const f of fish) {
        f.x += f.speed * fast * dt;
        if (f.x > TUNNEL.x2 - 0.3) f.x = TUNNEL.x1 + 0.3;
        if (f.x < TUNNEL.x1 + 0.3) f.x = TUNNEL.x2 - 0.3;
        const r = f.r + Math.sin(time * 1.3 + f.wob) * 0.12;
        const th = f.th + Math.sin(time * 0.8 + f.wob) * 0.08;
        let x = f.x;
        if (S.excite > 0 && Math.abs(me.x - x) < 6) x += (me.x - x) * 0.3;
        f.s.position.set(x, Math.sin(th) * r + 0.05, TUNNEL.z + Math.cos(th) * r);
        f.s.scale.x = f.size * (f.speed > 0 ? -1 : 1);     // facing the way it swims
      }
      for (const b of bubbles) {
        b.t += dt * 0.25;
        if (b.t > 1) {                                          // start again low down on one side
          b.t = 0;
          b.x = TUNNEL.x1 + Math.random() * tunnelLen;
          b.th = Math.random() < 0.5 ? 0.2 + Math.random() * 0.5 : Math.PI - 0.2 - Math.random() * 0.5;
        }
        const th = b.th + b.t * (Math.PI / 2 - b.th) * 0.9;    // rising up the curve of the glass
        const r = (TUNNEL.r1 + TUNNEL.r2) / 2;
        b.b.position.set(b.x, Math.sin(th) * r, TUNNEL.z + Math.cos(th) * r);
      }
      // the rainbow appears over the path when the child reaches the waterfall
      const want = S.seen.has(3) ? 1 : 0;
      S.rainbow += (want - S.rainbow) * Math.min(1, dt * 0.6);
      rainbow.visible = S.rainbow > 0.01;
      for (const m of rainbowMats) m.opacity = S.rainbow * 0.6;
    },

    // the places where a question or a game can start, for the prompt near the child
    targets() {
      if (S.move || S.swingLeft > 0 || S.boat) return [];
      if (S.perch > 0) {
        const c = climbPoint(S.perch);
        return S.done ? [] : [{ kind: 'ftree', key: `ftree:${S.perch}`, pos: [c.x, c.z], r: 2 }];
      }
      const list = [];
      if (S.stage >= 2) list.push({ kind: 'fboat', key: 'fboat', pos: [DOCK.x, 0.6], r: 1.8 });
      if (S.stage < GATES) list.push({ kind: 'fboard', key: `fboard:${S.stage}`, pos: boards[S.stage].pos, r: 2.4 });
      else if (!S.done) list.push({ kind: 'ftree', key: 'ftree:0', pos: [TREE.x + STEP_RADIUS, TREE.z], r: 1.9 });
      if (S.done) {
        list.push({ kind: 'fswing', key: 'fswing', pos: [SWING.x, SWING.z], r: 1.7 });
        list.push({ kind: 'fnew', key: 'fnew', pos: boards[0].pos, r: 2.4 });
      }
      return list;
    },

    update(dt, time, me, quiet = false) {
      root.visible = me.x < 8;
      W.root.visible = me.x > -44;        // the house can't be seen from deep in the forest
      for (const g of gates) {
        g.angle += (g.target - g.angle) * Math.min(1, dt * 2.5);
        g.left.rotation.y = -g.angle;
        g.right.rotation.y = g.angle;
      }
      // running water can be heard before it is seen, even from behind a closed gate
      const hush = !root.visible ? 0 : quiet ? 0.25 : 1;
      const toStream = Math.hypot(me.x - STREAM.x, me.z - Math.max(STREAM.z1, Math.min(STREAM.z2, me.z)));
      ambient('stream', hush * (1 - toStream / 22));
      ambient('fall', hush * (1 - Math.hypot(me.x - FALL.x, me.z - FALL.z) / 32));
      if (!root.visible) return;
      this.updateSurprises(dt, time, me, quiet);
      boards.forEach((b, i) => { if (b.icon.visible) b.icon.position.y = 2.75 + Math.sin(time * 2 + i) * 0.12; });
      itemIcons.forEach((s, i) => { s.position.y = (i + 1) * CLIMB + 1.3 + Math.sin(time * 2 + i) * 0.1; });
      swingIcon.position.y = 2.6 + Math.sin(time * 2) * 0.1;
      for (const a of animals) {
        a.sprite.position.x = a.x + Math.sin(time * 0.7 + a.i) * 1.1;
        a.sprite.position.y = 1.5 + Math.sin(time * 1.6 + a.i * 2) * 0.35;
        a.sprite.position.z = a.z + Math.cos(time * 0.5 + a.i) * 1.1;
      }
      // the swing goes high in the middle of the ride and slows down at the end
      if (S.swingLeft > 0) {
        S.swingLeft -= dt;
        const t = SWING.seconds - S.swingLeft;
        const size = Math.min(1, t / 2) * Math.min(1, Math.max(0, S.swingLeft) / 2) * 0.75;
        S.swingAngle = Math.sin(t * 2.1) * size;
        S.facing = Math.PI / 2;
        if (S.swingLeft <= 0) {
          S.swingLeft = 0;
          S.swingAngle = 0;
          S.high = null;
          S.facing = null;
          S.onSwingEnd?.();
        }
      }
      swing.rotation.z = S.swingAngle;
      for (const f of fruits) {
        if (f.state === 'falling') {
          f.m.position.y -= f.speed * dt;
          f.speed += 9 * dt;
          if (f.m.position.y <= 0.25) { f.m.position.y = 0.25; f.state = 'ground'; }
        } else if (f.state === 'ground') {
          f.stay -= dt;
          const near = Math.hypot(f.m.position.x - me.x, f.m.position.z - me.z) < 0.9 && me.y < 1;
          if (near || f.stay <= 0) {
            f.state = 'away';
            f.m.visible = false;
            if (near) onFruit();
          }
        }
      }
    },
  };
}
