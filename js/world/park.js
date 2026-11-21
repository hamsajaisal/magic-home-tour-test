// The Maths Park, through a gap in the east wall of the compound. Five rides, small to big:
// seesaw, slide, merry-go-round, a water slide with rain, and the giant wheel (ആകാശത്തോണി).
// Each ride opens after a short maths quiz, every time, so more rides means more questions.
// While riding, the ride moves the child (like the forest swing); the child can't walk.
import * as THREE from 'three';
import { mat, labelTexture, emojiTexture, mergeStatic } from './house.js';
import { play } from '../audio.js';

export const PARK = { x1: 20, x2: 44, z1: 0, z2: 28 };
export const PARK_GAP = { z1: 17.5, z2: 21.5 };            // the opening in the east wall of the compound
export const RIDES = ['seesaw', 'slide', 'merry', 'rain', 'wheel'];
export const RIDE_EMOJI = { seesaw: '⚖️', slide: '🛝', merry: '🎠', rain: '🌧️', wheel: '🎡' };

const SEESAW = { x: 26, z: 25, y: 0.55, arm: 1.7, seconds: 9 };
const SLIDE = { x: 31, z: 25, top: 2.4, seconds: 5 };
const MERRY = { x: 39.5, z: 23.5, r: 3.2, seat: 2.3, seconds: 14 };
const RAIN = { tx: 41.5, tz: 8.5, top: 4.5, px: 35, pz: 8.5, pr: 3, seconds: 11 };
const WHEEL = { x: 27, z: 8, y: 7.8, r: 6.2, cabins: 8, seconds: 22 };

// where the child stands to start each ride, and where they step off afterwards
const ENTRY = {
  seesaw: [26, 23.2], slide: [29.4, 23.4], merry: [35.3, 23.5], rain: [41.5, 10.8], wheel: [27, 10.4],
};
const EXIT = { seesaw: [26, 23.2], slide: [35.4, 25], merry: [35.3, 23.5], rain: [35, 12.3], wheel: [27, 10.4] };

const smooth = (u) => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (u) => Math.max(0, Math.min(1, u));

export function createPark({ scene, W, low }) {
  const root = new THREE.Group();
  const statics = new THREE.Group();
  scene.add(root);
  const col = (minX, maxX, minZ, maxZ) => W.colliders.push({ minX, maxX, minZ, maxZ, on: true });
  const box = (w, h, d, color, x, y, z, parent = statics, rotY = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    parent.add(m);
    return m;
  };
  const cyl = (r1, r2, h, color, x, y, z, parent = statics, seg = 10) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat(color));
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  };
  const ball = (r, color, x, y, z, parent = statics) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // a thin bar from one point to another (frames, spokes, ladders)
  const bar = (a, b, r, color, parent = statics) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 6), mat(color));
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
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
  const sign = (w, h, x, y, z, rotY) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true }));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    root.add(m);
    return m;
  };

  // ---------- ground, paths, fence, the way in ----------
  box(PARK.x2 - PARK.x1, 0.02, PARK.z2 - PARK.z1, '#7fd05a', (PARK.x1 + PARK.x2) / 2, -0.03, (PARK.z1 + PARK.z2) / 2);
  box(15.5, 0.02, 2.4, '#f2d49b', 12.5, 0, 19.5);                         // from the front yard to the gap
  box(PARK.x2 - PARK.x1 - 2, 0.02, 2.4, '#f2d49b', 32, 0.005, 19.5);     // the main walk
  for (const x of [27, 38]) box(2.2, 0.02, 7.6, '#f2d49b', x, 0.005, 14.7);
  box(2.2, 0.02, 3.4, '#f2d49b', 30, 0.005, 22.2);
  const fenceColors = ['#ff5d8f', '#ffd23d', '#3d9dff', '#3fbf6f'];
  const fence = (ax, fixed, a, b) => {
    let i = 0;
    for (let t = a; t <= b + 0.01; t += low ? 2 : 1, i++) {
      const [x, z] = ax === 'x' ? [t, fixed] : [fixed, t];
      box(0.12, 0.9, 0.12, fenceColors[i % 4], x, 0, z);
    }
    const [x, z] = ax === 'x' ? [(a + b) / 2, fixed] : [fixed, (a + b) / 2];
    box(ax === 'x' ? b - a : 0.08, 0.1, ax === 'x' ? 0.08 : b - a, '#ffffff', x, 0.7, z);
    if (ax === 'x') col(a, b, fixed - 0.2, fixed + 0.2); else col(fixed - 0.2, fixed + 0.2, a, b);
  };
  fence('x', PARK.z1, PARK.x1, PARK.x2);
  fence('x', PARK.z2, PARK.x1, PARK.x2);
  fence('z', PARK.x2, PARK.z1, PARK.z2);
  // the arch over the gap, with the park's name on it
  for (const s of [-1, 1]) cyl(0.16, 0.18, 3.4, '#ff5d8f', PARK.x1, 0, 19.5 + s * 2.2);
  box(0.25, 0.35, 4.7, '#ffd23d', PARK.x1, 3.3, 19.5);
  const archSign = sign(3.6, 0.8, PARK.x1 - 0.15, 2.85, 19.5, -Math.PI / 2);
  const archBack = sign(3.6, 0.8, PARK.x1 + 0.15, 2.85, 19.5, Math.PI / 2);
  // signs the child sees from the front yard: a post by the front path and a big board near the gap
  cyl(0.05, 0.05, 1.7, '#6b3518', 2.4, 0, 15.4);
  const postSign = sign(2.4, 0.55, 2.4, 1.75, 15.45, 0);
  const boardAngle = Math.atan2(-16, -7);                // facing the front steps
  const bx = 17.6, bz = 23.4;
  for (const s of [-1, 1]) cyl(0.12, 0.14, 3.2, '#ff5d8f', bx + Math.cos(boardAngle) * 1.9 * s, 0, bz - Math.sin(boardAngle) * 1.9 * s);
  const billboard = sign(4.4, 1.6, bx, 3.6, bz, boardAngle);
  const billIcon = sprite('🎡', bx, 5.1, bz, 1.2);
  col(bx - 2.1, bx + 2.1, bz - 0.4, bz + 0.4);
  for (let k = 0; k < (low ? 4 : 8); k++) {                                   // balloons on the arch
    const b = ball(0.28, fenceColors[k % 4], PARK.x1, 3.9 + (k % 2) * 0.35, 17.4 + k * (4.2 / ((low ? 4 : 8) - 1)));
    b.scale.y = 1.2;
  }
  // flowers, benches, an ice cream cart
  for (let k = 0; k < (low ? 14 : 30); k++) {
    const x = PARK.x1 + 1 + Math.random() * (PARK.x2 - PARK.x1 - 2), z = Math.random() < 0.5 ? PARK.z1 + 0.6 + Math.random() * 0.8 : PARK.z2 - 0.6 - Math.random() * 0.8;
    ball(0.13, ['#ff5d8f', '#ffd23d', '#ffffff', '#b26bff', '#ff8c42'][k % 5], x, 0.3, z);
    cyl(0.02, 0.02, 0.28, '#3b9147', x, 0, z, statics, 4);
  }
  for (const [x, z] of [[33, 16.6], [24, 16.6]]) {
    box(1.8, 0.1, 0.55, '#a0692f', x, 0.45, z);
    box(1.8, 0.5, 0.08, '#a0692f', x, 0.55, z - 0.27);
    for (const s of [-0.75, 0.75]) box(0.1, 0.45, 0.5, '#6b3518', x + s, 0, z);
    col(x - 0.95, x + 0.95, z - 0.35, z + 0.35);
  }
  box(1.4, 0.9, 0.8, '#ffffff', 43, 0, 19.5);
  box(1.5, 0.08, 0.9, '#ff5d8f', 43, 1.7, 19.5);
  for (const s of [-0.6, 0.6]) bar([43 + s, 0.9, 19.5], [43 + s, 1.7, 19.5], 0.03, '#999999');
  sprite('🍦', 43, 2.2, 19.5, 0.7);
  col(42.2, 43.8, 19, 20);

  // ---------- ride 1: the seesaw ----------
  cyl(0.25, 0.35, SEESAW.y - 0.1, '#3d9dff', SEESAW.x, 0, SEESAW.z);
  const seesaw = new THREE.Group();
  seesaw.position.set(SEESAW.x, SEESAW.y, SEESAW.z);
  root.add(seesaw);
  box(4.2, 0.12, 0.45, '#ff5d8f', 0, 0, 0, seesaw);
  for (const s of [-1, 1]) {
    box(0.4, 0.05, 0.45, '#ffd23d', s * SEESAW.arm, 0.12, 0, seesaw);
    bar([s * (SEESAW.arm - 0.25), 0.12, -0.2], [s * (SEESAW.arm - 0.25), 0.6, -0.2], 0.03, '#999999', seesaw);
    bar([s * (SEESAW.arm - 0.25), 0.12, 0.2], [s * (SEESAW.arm - 0.25), 0.6, 0.2], 0.03, '#999999', seesaw);
    bar([s * (SEESAW.arm - 0.25), 0.6, -0.2], [s * (SEESAW.arm - 0.25), 0.6, 0.2], 0.03, '#999999', seesaw);
  }
  const friend = sprite('🐒', SEESAW.x + SEESAW.arm, SEESAW.y + 0.6, SEESAW.z, 0.9);
  col(SEESAW.x - 2.2, SEESAW.x + 2.2, SEESAW.z - 0.35, SEESAW.z + 0.35);

  // ---------- ride 2: the slide ----------
  const sx = SLIDE.x;
  for (const s of [-0.35, 0.35]) bar([sx - 0.9, 0, SLIDE.z + s], [sx - 0.6, SLIDE.top + 0.9, SLIDE.z + s], 0.05, '#3d9dff');
  for (let k = 1; k <= 6; k++) { const u = k / 7; bar([sx - 0.9 + 0.3 * u, SLIDE.top * u, SLIDE.z - 0.35], [sx - 0.9 + 0.3 * u, SLIDE.top * u, SLIDE.z + 0.35], 0.035, '#ffd23d'); }
  box(1.0, 0.12, 1.0, '#ff5d8f', sx - 0.2, SLIDE.top - 0.12, SLIDE.z);
  for (const [dx, dz] of [[-0.6, -0.45], [-0.6, 0.45], [0.25, -0.45], [0.25, 0.45]]) bar([sx + dx, 0, SLIDE.z + dz], [sx + dx, SLIDE.top, SLIDE.z + dz], 0.05, '#3d9dff');
  const chute = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.9), mat('#ff8c42'));
  chute.position.set(sx + 2.1, SLIDE.top / 2 + 0.1, SLIDE.z);
  chute.rotation.z = -Math.atan2(SLIDE.top - 0.3, 3.9);
  statics.add(chute);
  for (const s of [-0.47, 0.47]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 0.06), mat('#ffd23d'));
    rail.position.set(sx + 2.1, SLIDE.top / 2 + 0.2, SLIDE.z + s);
    rail.rotation.z = chute.rotation.z;
    statics.add(rail);
  }
  col(sx - 1, sx + 4, SLIDE.z - 0.55, SLIDE.z + 0.55);

  // ---------- ride 3: the merry-go-round ----------
  cyl(MERRY.r + 0.2, MERRY.r + 0.3, 0.25, '#ffffff', MERRY.x, 0, MERRY.z, statics, 20);
  const merry = new THREE.Group();
  merry.position.set(MERRY.x, 0.25, MERRY.z);
  root.add(merry);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(MERRY.r, MERRY.r, 0.12, 20), mat('#ff5d8f'));
  disc.position.y = 0.06;
  merry.add(disc);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.2, 8), mat('#ffd23d'));
  pole.position.y = 1.6;
  merry.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(MERRY.r + 0.3, 1.3, 12), mat('#3d9dff'));
  canopy.position.y = 3.6;
  merry.add(canopy);
  const horses = [];
  const HORSE_COLORS = ['#ffffff', '#ffd23d', '#ff8c42', '#b26bff'];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, hx = Math.cos(a) * MERRY.seat, hz = Math.sin(a) * MERRY.seat;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), mat('#cccccc'));
    rod.position.set(hx, 1.5, hz);
    merry.add(rod);
    const horse = new THREE.Group();
    horse.position.set(hx, 0.6, hz);
    horse.rotation.y = -a;          // facing along the way round
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.0), mat(HORSE_COLORS[k]));
    horse.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.35), mat(HORSE_COLORS[k]));
    head.position.set(0, 0.35, 0.55);
    horse.add(head);
    merry.add(horse);
    horses.push(horse);
  }
  col(MERRY.x - MERRY.r - 0.3, MERRY.x + MERRY.r + 0.3, MERRY.z - MERRY.r - 0.3, MERRY.z + MERRY.r + 0.3);

  // ---------- ride 4: the water slide into a pool, with rain ----------
  box(1.6, RAIN.top, 1.6, '#3d9dff', RAIN.tx, 0, RAIN.tz);
  box(2.0, 0.15, 2.0, '#ffd23d', RAIN.tx, RAIN.top, RAIN.tz);
  for (let k = 1; k <= 9; k++) box(0.9, 0.06, 0.08, '#ffffff', RAIN.tx, (k / 10) * RAIN.top, RAIN.tz + 0.84);
  const wchute = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 1.0), mat('#4fc3f7'));
  wchute.position.set(RAIN.tx - 2.9, RAIN.top / 2 + 0.3, RAIN.tz);
  wchute.rotation.z = Math.atan2(RAIN.top - 0.6, 3.6);
  statics.add(wchute);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(RAIN.pr, RAIN.pr, 0.04, 24), new THREE.MeshLambertMaterial({ color: '#3fa7e0' }));
  pool.position.set(RAIN.px, 0.2, RAIN.pz);
  root.add(pool);
  cyl(RAIN.pr + 0.3, RAIN.pr + 0.3, 0.2, '#ffffff', RAIN.px, -0.05, RAIN.pz, statics, 24);     // the rim, just below the water
  const cloud = new THREE.Group();
  cloud.position.set(RAIN.px + 1, 6.5, RAIN.pz);
  root.add(cloud);
  for (const [dx, dy, r] of [[0, 0, 1.1], [1.1, -0.2, 0.9], [-1.1, -0.15, 0.85], [0.5, 0.5, 0.8], [-0.5, 0.45, 0.75]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat('#f4f7fb'));
    b.position.set(dx, dy, 0);
    cloud.add(b);
  }
  const drops = [];
  for (let k = 0; k < (low ? 30 : 70); k++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.03), new THREE.MeshBasicMaterial({ color: '#9fdcff', transparent: true, opacity: 0.8 }));
    d.visible = false;
    root.add(d);
    drops.push({ d, x: 0, z: 0, y: 0 });
  }
  const rainIcon = sprite('🌧️', RAIN.tx, RAIN.top + 1.4, RAIN.tz, 0.8);
  col(RAIN.tx - 0.85, RAIN.tx + 0.85, RAIN.tz - 0.85, RAIN.tz + 0.85);
  col(RAIN.px - RAIN.pr - 0.3, RAIN.px + RAIN.pr + 0.3, RAIN.pz - RAIN.pr - 0.3, RAIN.pz + RAIN.pr + 0.3);
  col(RAIN.px + RAIN.pr, RAIN.tx - 0.8, RAIN.tz - 0.5, RAIN.tz + 0.5);           // under the chute

  // ---------- ride 5: the giant wheel ----------
  for (const s of [-1, 1]) {
    for (const dz of [-0.9, 0.9]) bar([WHEEL.x + s * 3.6, 0, WHEEL.z + dz], [WHEEL.x, WHEEL.y, WHEEL.z + dz * 0.4], 0.14, '#3d9dff');
  }
  bar([WHEEL.x, WHEEL.y, WHEEL.z - 0.5], [WHEEL.x, WHEEL.y, WHEEL.z + 0.5], 0.25, '#ffd23d');
  const wheel = new THREE.Group();
  wheel.position.set(WHEEL.x, WHEEL.y, WHEEL.z);
  root.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.r, 0.1, 6, 40), mat('#ff5d8f'));
  wheel.add(rim);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.r * 0.55, 0.07, 6, 30), mat('#ffd23d'));
  wheel.add(rim2);
  for (let k = 0; k < WHEEL.cabins * 2; k++) {
    const a = (k / (WHEEL.cabins * 2)) * Math.PI * 2;
    bar([0, 0, 0], [Math.cos(a) * WHEEL.r, Math.sin(a) * WHEEL.r, 0], 0.04, '#ffffff', wheel);
  }
  const cabins = [];
  const CABIN_COLORS = ['#ff5d8f', '#ffd23d', '#3d9dff', '#3fbf6f', '#ff8c42', '#b26bff', '#ff4f4f', '#4fc3f7'];
  for (let k = 0; k < WHEEL.cabins; k++) {
    const c = new THREE.Group();
    root.add(c);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.1), mat(CABIN_COLORS[k]));
    base.position.y = -1.3;
    c.add(base);
    for (const [dx, dz] of [[-0.55, -0.5], [0.55, -0.5], [-0.55, 0.5], [0.55, 0.5]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 4), mat('#cccccc'));
      r.position.set(dx, -0.65, dz);
      c.add(r);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.4, 4), mat(CABIN_COLORS[k]));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.1;
    c.add(roof);
    cabins.push(c);
  }
  col(WHEEL.x - 4.1, WHEEL.x + 4.1, WHEEL.z - 1.1, WHEEL.z + 1.1);
  col(WHEEL.x - WHEEL.r - 0.6, WHEEL.x + WHEEL.r + 0.6, WHEEL.z - 0.7, WHEEL.z + 0.7);

  // a floating sign over each ride
  const rideIcons = {
    seesaw: sprite(RIDE_EMOJI.seesaw, SEESAW.x, 2.3, SEESAW.z, 0.8),
    slide: sprite(RIDE_EMOJI.slide, SLIDE.x - 0.2, SLIDE.top + 1.6, SLIDE.z, 0.8),
    merry: sprite(RIDE_EMOJI.merry, MERRY.x, 5, MERRY.z, 0.9),
    rain: rainIcon,
    wheel: sprite(RIDE_EMOJI.wheel, WHEEL.x, WHEEL.y + WHEEL.r + 1.4, WHEEL.z, 1.1),
  };

  root.add(mergeStatic(statics));

  // ---------- the rides ----------
  const S = { ride: null, t: 0, high: null, facing: null, land: null, wheelAngle: 0, merryAngle: 0, then: null, music: 6 };

  // where the child is during a ride, t seconds in; null when the ride is over
  const PATHS = {
    seesaw(t) {
      if (t > SEESAW.seconds) return null;
      const a = Math.sin(t * 2.2) * 0.32 * Math.min(1, t / 1.2) * Math.min(1, (SEESAW.seconds - t) / 1.2);
      seesaw.rotation.z = a;
      friend.position.y = SEESAW.y + 0.6 + Math.sin(a) * SEESAW.arm;
      return { x: SEESAW.x - Math.cos(a) * SEESAW.arm, z: SEESAW.z, y: SEESAW.y + 0.15 - Math.sin(a) * SEESAW.arm, facing: Math.PI / 2 };
    },
    slide(t) {
      if (t > SLIDE.seconds) return null;
      if (t < 2.2) { const u = t / 2.2; return { x: lerp(sx - 1.1, sx - 0.4, u), z: SLIDE.z, y: SLIDE.top * u, facing: Math.PI / 2 }; }
      if (t < 2.8) return { x: lerp(sx - 0.4, sx + 0.2, (t - 2.2) / 0.6), z: SLIDE.z, y: SLIDE.top, facing: Math.PI / 2 };
      if (t < 4.3) { const u = ((t - 2.8) / 1.5) ** 2; return { x: lerp(sx + 0.2, sx + 4, u), z: SLIDE.z, y: lerp(SLIDE.top, 0.3, u), facing: Math.PI / 2 }; }
      const u = (t - 4.3) / 0.7;
      return { x: lerp(sx + 4, EXIT.slide[0], u), z: SLIDE.z, y: lerp(0.3, 0, u), facing: Math.PI / 2 };
    },
    merry(t) {
      if (t > MERRY.seconds) return null;
      const a = Math.PI + S.merryAngle;
      const bob = Math.sin(t * 3) * 0.25;
      horses[2].position.y = 0.6 + bob;
      return { x: MERRY.x + Math.cos(a) * MERRY.seat, z: MERRY.z + Math.sin(a) * MERRY.seat, y: 0.95 + bob, facing: Math.atan2(-Math.sin(a), Math.cos(a)) };
    },
    rain(t) {
      if (t > RAIN.seconds) return null;
      const top = { x: RAIN.tx - 0.9, z: RAIN.tz };
      if (t < 2.5) { const u = t / 2.5; return { x: RAIN.tx, z: RAIN.tz + 1.05, y: RAIN.top * u + 0.1, facing: Math.PI }; }
      if (t < 3) { const u = (t - 2.5) / 0.5; return { x: lerp(RAIN.tx, top.x, u), z: lerp(RAIN.tz + 1.05, top.z, u), y: RAIN.top + 0.1, facing: -Math.PI / 2 }; }
      if (t < 5) { const u = ((t - 3) / 2) ** 1.6; return { x: lerp(top.x, RAIN.px + RAIN.pr - 0.4, u), z: RAIN.tz, y: lerp(RAIN.top + 0.1, 0.7, u), facing: -Math.PI / 2 }; }
      if (t < 5.6) { const u = (t - 5) / 0.6; return { x: lerp(RAIN.px + RAIN.pr - 0.4, RAIN.px + 1.2, u), z: RAIN.pz, y: lerp(0.7, 0.18, u), facing: -Math.PI / 2 }; }
      if (t < 10) { const a = (t - 5.6) * 1.1; return { x: RAIN.px + Math.cos(a) * 1.2, z: RAIN.pz - Math.sin(a) * 1.2, y: 0.18 + Math.sin(t * 2) * 0.04, facing: Math.atan2(-Math.sin(a), -Math.cos(a)) }; }
      const u = t - 10;
      return { x: lerp(RAIN.px + Math.cos(4.84) * 1.2, EXIT.rain[0], u), z: lerp(RAIN.pz - Math.sin(4.84) * 1.2, EXIT.rain[1], u), y: Math.sin(u * Math.PI) * 0.8 + 0.18 * (1 - u), facing: 0 };
    },
    wheel(t) {
      if (t > WHEEL.seconds) return null;
      S.wheelAngle = Math.PI * 2 * smooth(clamp01(t / WHEEL.seconds));
      const a = S.wheelAngle - Math.PI / 2;
      return { x: WHEEL.x + Math.cos(a) * WHEEL.r, z: WHEEL.z, y: WHEEL.y + Math.sin(a) * WHEEL.r - 1.22, facing: 0 };
    },
  };

  function setCabins() {
    wheel.rotation.z = S.wheelAngle;
    cabins.forEach((c, k) => {
      const a = S.wheelAngle - Math.PI / 2 + (k / WHEEL.cabins) * Math.PI * 2;
      c.position.set(WHEEL.x + Math.cos(a) * WHEEL.r, WHEEL.y + Math.sin(a) * WHEEL.r, WHEEL.z);
    });
  }
  setCabins();

  return {
    get riding() { return S.ride; },
    holds() { return !!S.ride; },
    height() { return S.high; },
    facing() { return S.facing; },
    inside(x, z) { return x > PARK.x1 + 0.2 && x < PARK.x2 && z > PARK.z1 && z < PARK.z2; },

    refreshSigns(names) {
      const paint = (m, lines, bg) => { m.material.map?.dispose(); m.material.map = labelTexture(lines, bg, '#ffffff'); m.material.needsUpdate = true; };
      paint(postSign, `🎡 ${names.toPark} ➡`, '#ff5d8f');
      paint(billboard, [`🎡 ${names.park}`, names.parkRides], '#3d7bff');
      for (const [m, flip] of [[archSign, false], [archBack, true]]) {
        m.material.map?.dispose();
        m.material.map = labelTexture(flip ? `${names.park} 🎡` : `🎡 ${names.park}`, '#ff5d8f', '#ffffff');
        m.material.needsUpdate = true;
      }
    },

    startRide(id, then) {
      S.ride = id;
      S.t = 0;
      S.then = then;
      S.merryAngle = 0;
      play('unlock');
    },

    // the places where a ride can start, for the prompt near the child
    targets() {
      if (S.ride) return [];
      return RIDES.map((id, i) => ({ kind: 'pride', key: `pride:${id}`, ride: id, index: i, pos: ENTRY[id], r: 1.6 }));
    },

    constrain(p) {
      if (S.ride) {
        const at = PATHS[S.ride](S.t);
        if (at) { p.x = at.x; p.z = at.z; S.high = at.y; S.facing = at.facing; }
        return;
      }
      if (S.land) { p.x = S.land[0]; p.z = S.land[1]; S.land = null; }
    },

    update(dt, time, me, quiet = false) {
      const near = me.x > 0;
      root.visible = me.x > -25;
      if (!root.visible) return;
      billIcon.position.y = 5.1 + Math.sin(time * 2.5) * 0.15;
      for (const [id, s] of Object.entries(rideIcons)) {
        s.visible = S.ride !== id;
        const base = id === 'wheel' ? WHEEL.y + WHEEL.r + 1.4 : id === 'merry' ? 5 : id === 'slide' ? SLIDE.top + 1.6 : id === 'rain' ? RAIN.top + 1.4 : 2.3;
        s.position.y = base + Math.sin(time * 2 + base) * 0.12;
      }
      // a little fairground tune now and then, heard from the front yard: something is over there
      S.music -= dt;
      if (near && !quiet && !S.ride && S.music <= 0) {
        const d = Math.hypot(me.x - PARK.x1, me.z - 19.5);
        if (d > 3 && d < 22 && me.x < PARK.x1) play('tune');
        S.music = 14;
      }
      // the rain cloud drizzles while someone rides the water slide, and the drops splash in the pool
      const raining = S.ride === 'rain' && S.t > 2.5;
      cloud.position.x = RAIN.px + 1 + Math.sin(time * 0.3) * 0.6;
      for (const dr of drops) {
        if (!raining) { dr.d.visible = false; continue; }
        if (!dr.d.visible || dr.y < 0.2) {
          dr.d.visible = true;
          dr.x = cloud.position.x + (Math.random() - 0.5) * 3.2;
          dr.z = RAIN.pz + (Math.random() - 0.5) * 2.4;
          dr.y = 6 - Math.random() * 1.5;
        }
        dr.y -= dt * 9;
        dr.d.position.set(dr.x, dr.y, dr.z);
      }
      if (!S.ride) {
        friend.position.y = SEESAW.y + 0.6 + Math.sin(time * 1.5) * 0.05;
        cabins.forEach((c, k) => { c.rotation.z = Math.sin(time * 1.2 + k) * 0.03; });
        return;
      }
      S.t += dt;
      const id = S.ride;
      if (id === 'wheel') setCabins();
      if (id === 'merry') {
        S.merryAngle += 0.9 * Math.min(1, S.t / 3) * Math.max(0, Math.min(1, (MERRY.seconds - S.t) / 3)) * dt;
        merry.rotation.y = -S.merryAngle;
      }
      if (id === 'rain' && S.t - dt < 5 && S.t >= 5) play('splash');
      if (id === 'slide' && S.t - dt < 2.8 && S.t >= 2.8) play('tweet');
      if (!PATHS[id](S.t)) {
        const then = S.then;
        S.ride = null;
        S.high = null;
        S.facing = null;
        S.land = EXIT[id];
        seesaw.rotation.z = 0;
        horses[2].position.y = 0.6;
        then?.(id);
      }
    },
  };
}
