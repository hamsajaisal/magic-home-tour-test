// Builds the Kerala-style house, garden and rooms out of simple shapes (no model files needed).
import * as THREE from 'three';
import { buildProps } from './props.js';

export const PLINTH = 0.3;          // house floor is a little higher than the garden
export const WALL_H = 2.8;
export const WALL_T = 0.25;
const DOOR_W = 1.4;
const DOOR_H = 2.2;
const HOUSE = { x1: -10, x2: 10, z1: -8, z2: 8 };
const VERANDA = { x1: -6, x2: 6, z1: 8, z2: 11 };
const STEPS = { x1: -1.6, x2: 1.6, z1: 11, z2: 12 };
export const START = { x: 0, z: 18 };
// the terrace block on the east side of the house, and its outside stairs (climbing towards the north)
export const TERRACE = { x1: 11.5, x2: 18.5, z1: -9, z2: 1, top: 3.4 };
export const TSTAIRS = { x1: 12.9, x2: 14.9, z1: 1, z2: 6.6 };

let FONT = '"Game Font", "Noto Sans Malayalam", "Nirmala UI", sans-serif';

// switch the signs between the old (traditional) and new (reformed) Malayalam script
export function setSignFont(newLipi) {
  FONT = `"${newLipi ? 'Game Font New' : 'Game Font'}", "Noto Sans Malayalam", "Nirmala UI", sans-serif`;
}
const sharedMats = new Map();

export function mat(color, unique = false) {
  if (unique) return new THREE.MeshLambertMaterial({ color, flatShading: true });
  if (!sharedMats.has(color)) sharedMats.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  return sharedMats.get(color);
}

// Height of the floor at a point, so the child walks smoothly up the front steps and the terrace stairs.
// The terrace block is solid underneath, so anyone standing over it is up on the terrace.
export function floorHeight(x, z) {
  const S = TSTAIRS, T = TERRACE;
  if (x > S.x1 && x < S.x2 && z > S.z1 && z <= S.z2) return T.top * (S.z2 - z) / (S.z2 - S.z1);
  if (x >= T.x1 && x <= T.x2 && z >= T.z1 && z <= T.z2) return T.top;
  if (x > STEPS.x1 && x < STEPS.x2 && z >= STEPS.z1 && z <= STEPS.z2) return PLINTH * (STEPS.z2 - z) / (STEPS.z2 - STEPS.z1);
  const inHouse = x > HOUSE.x1 - 0.2 && x < HOUSE.x2 + 0.2 && z > HOUSE.z1 - 0.2 && z < HOUSE.z2 + 0.2;
  const inVeranda = x > VERANDA.x1 && x < VERANDA.x2 && z >= VERANDA.z1 && z < VERANDA.z2;
  return inHouse || inVeranda ? PLINTH : 0;
}

export function isInsideHouse(x, z) {
  return x > HOUSE.x1 - 0.5 && x < HOUSE.x2 + 0.5 && z > HOUSE.z1 - 0.5 && z < VERANDA.z2 + 0.6;
}

export function buildWorld(scene, rooms, { low }) {
  const W = { colliders: [], fadeables: [], roofMats: [], doors: [], updaters: [], boards: [], root: new THREE.Group() };
  const root = W.root;
  scene.add(root);
  let statics = new THREE.Group();
  root.add(statics);

  // ---------- little helpers ----------
  const addCol = (minX, maxX, minZ, maxZ) => {
    const c = { minX, maxX, minZ, maxZ, on: true };
    W.colliders.push(c);
    return c;
  };
  const place = (m, x, y, z, o) => {
    m.position.set(x, y, z);
    if (o.rotY) m.rotation.y = o.rotY;
    (o.parent || (o.dynamic ? root : statics)).add(m);
    return m;
  };
  // y = bottom of the shape
  const box = (w, h, d, color, x, y, z, o = {}) => {
    const m = place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.material || mat(color, o.unique)), x, y + h / 2, z, o);
    if (o.collide) addCol(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    return m;
  };
  const cyl = (rTop, rBot, h, color, x, y, z, o = {}) => {
    const m = place(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, o.seg || 8), o.material || mat(color, o.unique)), x, y + h / 2, z, o);
    if (o.collide) { const r = Math.max(rTop, rBot); addCol(x - r, x + r, z - r, z + r); }
    return m;
  };
  const ball = (r, color, x, y, z, o = {}) =>
    place(new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 8, Math.max(4, (o.seg || 8) - 2)), o.material || mat(color, o.unique)), x, y, z, o);
  const H = { box, cyl, ball, addCol, mat, root, W, PLINTH, WALL_T, low, statics: () => statics, labelTexture, emojiTexture };

  // ---------- ground, path, compound wall ----------
  box(90, 0.1, 90, '#86d45e', 0, -0.1, 4);
  box(2.6, 0.02, 16, '#f2d49b', 0, 0, 20);                      // sand path to the gate
  const lat = '#c8693f';                                         // laterite stone colour
  box(4.8, 0.9, 0.4, lat, -17.6, 0, -14, { collide: true });     // back wall, with a gap for the way to the backwater
  box(31.2, 0.9, 0.4, lat, 4.4, 0, -14, { collide: true });
  box(0.4, 0.9, 24.5, lat, -20, 0, -1.75, { collide: true });     // west wall, with a gap for the way to the forest
  box(0.4, 0.9, 14.5, lat, -20, 0, 20.75, { collide: true });
  box(0.4, 0.9, 31.5, lat, 20, 0, 1.75, { collide: true });     // east wall, with a gap for the way to the Maths Park
  box(0.4, 0.9, 6.5, lat, 20, 0, 24.75, { collide: true });
  box(18.2, 0.9, 0.4, lat, -10.9, 0, 28, { collide: true });
  box(18.2, 0.9, 0.4, lat, 10.9, 0, 28, { collide: true });
  box(0.7, 1.5, 0.7, lat, -2.1, 0, 28, { collide: true });
  box(0.7, 1.5, 0.7, lat, 2.1, 0, 28, { collide: true });
  box(3.5, 1.1, 0.12, '#3d7bff', 0, 0.1, 28, { collide: true });  // the gate (closed)

  // ---------- plinth, veranda, steps ----------
  box(20.6, PLINTH, 16.6, '#a94a2c', 0, 0, 0);
  box(20.2, 0.01, 16.2, '#c2563a', 0, PLINTH, 0);                 // red-oxide floor
  box(VERANDA.x2 - VERANDA.x1, PLINTH, VERANDA.z2 - VERANDA.z1, '#a94a2c', 0, 0, 9.5);
  box(VERANDA.x2 - VERANDA.x1, 0.01, VERANDA.z2 - VERANDA.z1, '#c2563a', 0, PLINTH, 9.5);
  box(3.2, 0.2, 0.5, '#a94a2c', 0, 0, 11.25);
  box(3.2, 0.1, 0.5, '#a94a2c', 0, 0, 11.75);
  // "thinna" sitting ledges around the veranda
  const ledge = '#e3b27a';
  box(4.4, 0.45, 0.45, ledge, -3.8, PLINTH, 10.78, { collide: true });
  box(4.4, 0.45, 0.45, ledge, 3.8, PLINTH, 10.78, { collide: true });
  box(0.45, 0.45, 3, ledge, -5.78, PLINTH, 9.5, { collide: true });
  box(0.45, 0.45, 3, ledge, 5.78, PLINTH, 9.5, { collide: true });
  for (const x of [-5.78, -1.9, 1.9, 5.78]) cyl(0.13, 0.15, 2.45, '#7a3e1d', x, PLINTH + 0.45, 10.78, { seg: 8 });

  // ---------- outer walls ----------
  const cream = '#fff1d6';
  const wall = (ax, fixed, a, b, color, y0 = PLINTH, h = WALL_H) => {
    if (b - a < 0.01) return;
    const len = b - a, mid = (a + b) / 2;
    const m = ax === 'x'
      ? box(len, h, WALL_T, color, mid, y0, fixed, { dynamic: true, unique: true })
      : box(WALL_T, h, len, color, fixed, y0, mid, { dynamic: true, unique: true });
    if (y0 <= PLINTH + 0.01) {
      if (ax === 'x') addCol(a, b, fixed - WALL_T / 2, fixed + WALL_T / 2);
      else addCol(fixed - WALL_T / 2, fixed + WALL_T / 2, a, b);
    }
    W.fadeables.push(m);
  };
  const wallWithGap = (ax, fixed, a, b, gapC, gapW, color) => {
    wall(ax, fixed, a, gapC - gapW / 2, color);
    wall(ax, fixed, gapC + gapW / 2, b, color);
    wall(ax, fixed, gapC - gapW / 2, gapC + gapW / 2, color, PLINTH + DOOR_H, WALL_H - DOOR_H);
  };
  const e = WALL_T / 2;
  wall('x', HOUSE.z1, HOUSE.x1 - e, HOUSE.x2 + e, cream);
  wall('z', HOUSE.x1, HOUSE.z1, HOUSE.z2, cream);
  wall('z', HOUSE.x2, HOUSE.z1, HOUSE.z2, cream);
  wallWithGap('x', HOUSE.z2, HOUSE.x1 - e, HOUSE.x2 + e, 0, 2.4, cream);

  // wooden windows on the outside (they turn see-through together with their wall)
  W.windows = [];
  const outerWalls = W.fadeables.map((m) => ({ m, b: new THREE.Box3().setFromObject(m).expandByScalar(0.35) }));
  const windowAt = (x, z, rotY) => {
    const g = new THREE.Group();
    box(1.3, 1.2, 0.1, '#6b3518', 0, 0, 0, { parent: g });
    for (let i = -2; i <= 2; i++) box(0.06, 1.0, 0.16, '#6b3518', i * 0.22, 0.1, 0, { parent: g });
    g.position.set(x, PLINTH + 0.9, z);
    g.rotation.y = rotY;
    const mesh = mergeStatic(g).children[0];
    mesh.material = mat('#5a2c12', true);
    root.add(mesh);
    const p = new THREE.Vector3(x, PLINTH + 1.4, z);
    const wallHere = outerWalls.find((w) => w.b.containsPoint(p));
    if (wallHere) W.windows.push({ mesh, wall: wallHere.m });
  };
  windowAt(-8, HOUSE.z2 + 0.14, 0); windowAt(8, HOUSE.z2 + 0.14, 0);
  windowAt(-3.5, HOUSE.z2 + 0.14, 0); windowAt(3.5, HOUSE.z2 + 0.14, 0);
  for (const z of [-5, 0, 5]) { windowAt(HOUSE.x1 - 0.14, z, Math.PI / 2); windowAt(HOUSE.x2 + 0.14, z, Math.PI / 2); }
  for (const x of [-7, 7]) windowAt(x, HOUSE.z1 - 0.14, 0);

  // ---------- rooms ----------
  for (const r of rooms) buildRoom(r);

  function buildRoom(r) {
    // a roof on locked rooms keeps the surprise hidden; it disappears when the door opens
    const cx = (r.x1 + r.x2) / 2, cz = (r.z1 + r.z2) / 2;
    const lid = box(r.x2 - r.x1 + 0.3, 0.2, r.z2 - r.z1 + 0.3, '#d2532f', cx, PLINTH + WALL_H, cz, { dynamic: true, unique: true });
    W.fadeables.push(lid);
    const lock = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('🔒'), depthWrite: false }));
    lock.scale.set(1.3, 1.3, 1);
    lock.position.set(cx, PLINTH + WALL_H + 1.3, cz);
    root.add(lock);
    W.updaters.push((dt, time) => { lock.position.y = PLINTH + WALL_H + 1.3 + Math.sin(time * 2 + cx) * 0.2; });
    r._cover = { lid, lock };
    const sides = {
      north: { ax: 'x', fixed: r.z1, a: r.x1, b: r.x2, edge: r.z1 <= HOUSE.z1, inward: [0, 1] },
      south: { ax: 'x', fixed: r.z2, a: r.x1, b: r.x2, edge: r.z2 >= HOUSE.z2, inward: [0, -1] },
      west: { ax: 'z', fixed: r.x1, a: r.z1, b: r.z2, edge: r.x1 <= HOUSE.x1, inward: [1, 0] },
      east: { ax: 'z', fixed: r.x2, a: r.z1, b: r.z2, edge: r.x2 >= HOUSE.x2, inward: [-1, 0] },
    };
    for (const [name, s] of Object.entries(sides)) {
      if (s.edge) continue;
      const ext = s.ax === 'x' ? e : 0;
      if (name === r.door) {
        const c = (s.a + s.b) / 2 + (r.doorShift || 0);
        wallWithGap(s.ax, s.fixed, s.a - ext, s.b + ext, c, DOOR_W, r.color);
        makeDoor(r, s, c);
      } else {
        wall(s.ax, s.fixed, s.a - ext, s.b + ext, r.color);
      }
    }
    box(r.x2 - r.x1, 0.02, r.z2 - r.z1, r.floor || '#fff4e0', (r.x1 + r.x2) / 2, PLINTH, (r.z1 + r.z2) / 2);
    buildProps(r, H);
  }

  function makeDoor(r, s, c) {
    const alongX = s.ax === 'x';
    const [ix, iz] = s.inward;
    const out = [-ix, -iz];
    const hinge = c - DOOR_W / 2;
    const pivot = new THREE.Group();
    pivot.position.set(alongX ? hinge : s.fixed, PLINTH, alongX ? s.fixed : hinge);
    root.add(pivot);
    const dx = alongX ? DOOR_W / 2 : 0, dz = alongX ? 0 : DOOR_W / 2;
    const leaves = [];
    const slab = (w, h, d, color) => {
      const m = new THREE.Mesh(alongX ? new THREE.BoxGeometry(w, h, d) : new THREE.BoxGeometry(d, h, w), mat(color).clone());
      leaves.push(m);
      m.position.set(dx, DOOR_H / 2, dz);
      pivot.add(m);
      return m;
    };
    slab(DOOR_W - 0.04, DOOR_H - 0.02, 0.1, '#8b4513');
    slab(DOOR_W * 0.72, DOOR_H * 0.72, 0.14, r.color);
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75),
      new THREE.MeshBasicMaterial({ map: emojiTexture('🔒'), transparent: true }));
    badge.position.set(dx + out[0] * 0.09, 1.25, dz + out[1] * 0.09);
    badge.rotation.y = Math.atan2(out[0], out[1]);
    pivot.add(badge);

    const collider = alongX
      ? addCol(c - DOOR_W / 2, c + DOOR_W / 2, s.fixed - 0.15, s.fixed + 0.15)
      : addCol(s.fixed - 0.15, s.fixed + 0.15, c - DOOR_W / 2, c + DOOR_W / 2);

    // swing the door into the room, not out into the hall
    const u = alongX ? [1, 0] : [0, 1];
    const turned = (th) => [u[0] * Math.cos(th) + u[1] * Math.sin(th), -u[0] * Math.sin(th) + u[1] * Math.cos(th)];
    const score = (th) => { const v = turned(th); return v[0] * ix + v[1] * iz; };
    const openAngle = score(1.75) > score(-1.75) ? 1.75 : -1.75;

    // name board above the door
    const center = alongX ? [c, s.fixed] : [s.fixed, c];
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.575), new THREE.MeshBasicMaterial({ transparent: true }));
    sign.position.set(center[0] + out[0] * 0.15, PLINTH + 2.5, center[1] + out[1] * 0.15);
    sign.rotation.y = Math.atan2(out[0], out[1]);
    root.add(sign);

    W.doors.push({
      room: r, pivot, leaves, lid: r._cover.lid, lock: r._cover.lock, collider, badge, sign, openAngle, angle: 0, target: 0,
      center, front: [center[0] + out[0] * 0.9, center[1] + out[1] * 0.9],
    });
  }

  // boards hung on room walls turn see-through together with their wall
  for (const m of W.boards) {
    m.material = m.material.clone();
    const p = m.position.clone();
    const wall = W.fadeables.find((w) => new THREE.Box3().setFromObject(w).expandByScalar(0.2).containsPoint(p));
    if (wall) W.windows.push({ mesh: m, wall });
  }

  // ---------- central courtyard (nadumuttam) with tulsi thara ----------
  box(4, 0.04, 4, '#9aa0a6', 0, PLINTH, -3);
  box(4.3, 0.12, 0.15, '#7d6b5a', 0, PLINTH, -5.07); box(4.3, 0.12, 0.15, '#7d6b5a', 0, PLINTH, -0.93);
  box(0.15, 0.12, 4, '#7d6b5a', -2.07, PLINTH, -3); box(0.15, 0.12, 4, '#7d6b5a', 2.07, PLINTH, -3);
  for (const [x, z] of [[-2, -5], [2, -5], [-2, -1], [2, -1]]) cyl(0.14, 0.16, WALL_H, '#7a3e1d', x, PLINTH, z, { collide: true });
  box(0.9, 0.8, 0.9, '#e9d8c2', 0, PLINTH, -3, { collide: true });
  box(1.05, 0.12, 1.05, '#c9a27a', 0, PLINTH + 0.8, -3);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ball(0.18, '#3e9b3a', Math.cos(a) * 0.18, PLINTH + 1.25 + (i % 2) * 0.12, -3 + Math.sin(a) * 0.18);
  }
  ball(0.2, '#4caf50', 0, PLINTH + 1.5, -3);
  // nilavilakku (brass lamp) in the back hall
  const brass = '#d9a520';
  const LX = -2.8, LZ = -7.0;
  cyl(0.3, 0.35, 0.08, brass, LX, PLINTH, LZ, { collide: true });
  cyl(0.05, 0.07, 1.0, brass, LX, PLINTH + 0.08, LZ);
  cyl(0.28, 0.08, 0.12, brass, LX, PLINTH + 1.05, LZ);
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb300' });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 5), flameMat);
    f.position.set(LX + Math.cos(a) * 0.22, PLINTH + 1.25, LZ + Math.sin(a) * 0.22);
    root.add(f);
    W.updaters.push((dt, time) => { f.scale.y = 0.85 + Math.sin(time * 12 + i * 1.7) * 0.15; });
  }

  // ---------- roofs (fade away when the child walks inside) ----------
  const roofMat = new THREE.MeshLambertMaterial({ color: '#d2532f', flatShading: true, transparent: true, side: THREE.DoubleSide });
  const roofDark = new THREE.MeshLambertMaterial({ color: '#8b2f17', flatShading: true, transparent: true, side: THREE.DoubleSide });
  const gableMat = new THREE.MeshLambertMaterial({ color: '#f6d7a7', flatShading: true, transparent: true, side: THREE.DoubleSide });
  W.roofMats.push(roofMat, roofDark, gableMat);
  const y0 = PLINTH + WALL_H, y1 = y0 + 3.0;
  const A = [-10.8, y0, 8.8], B = [10.8, y0, 8.8], C = [10.8, y0, -8.8], D = [-10.8, y0, -8.8];
  const R1 = [-2, y1, 0], R2 = [2, y1, 0];
  const tris = [A, B, R2, A, R2, R1, C, D, R1, C, R1, R2, D, A, R1, B, C, R2].flat();
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, roofMat);
  root.add(roof);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.18, 0.25), roofDark);
  ridge.position.set(0, y1 + 0.05, 0);
  root.add(ridge);
  // front gable (mukhappu)
  const tri = new THREE.Shape();
  tri.moveTo(-2.6, 0); tri.lineTo(2.6, 0); tri.lineTo(0, 2.4); tri.closePath();
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 4.2, bevelEnabled: false }), gableMat);
  gable.position.set(0, y0 + 0.2, 5.2);
  root.add(gable);
  for (const sgn of [-1, 1]) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.12, 4.6), roofDark);
    slope.position.set(sgn * 1.35, y0 + 1.4, 7.35);
    slope.rotation.z = -sgn * Math.atan2(2.4, 2.6);
    root.add(slope);
  }
  // veranda roof
  const vroof = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.12, 3.9), roofMat);
  vroof.position.set(0, PLINTH + 2.75, 9.85);
  vroof.rotation.x = 0.16;
  root.add(vroof);
  W.roofMeshes = [roof, ridge, gable, vroof];

  // house name board on the veranda
  W.titleSign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ transparent: true }));
  W.titleSign.position.set(0, PLINTH + 2.1, 11.05);
  root.add(W.titleSign);
  W.roofMeshes.push(W.titleSign);   // hidden with the roof when the child walks in

  // ---------- garden ----------
  const trees = [[-14, 20], [14, 22], [-16, 6], [16, 4], [-15, -8], [16, -12.3], [-8, 24], [9, 25], [-17, -12], [17, 15], [-11, -12], [11, 18]];
  trees.slice(0, low ? 6 : trees.length).forEach(([x, z], i) => coconutTree(x, z, 5 + (i % 3) * 0.8, i));
  for (const [x, z] of [[-12, 10], [12, 11], [-6, -11], [6, -12]].slice(0, low ? 2 : 4)) bananaPlant(x, z);
  for (const [x, z] of [[-3, 14], [3, 16], [-3, 19], [3, 22], [-7, 14.4], [7, 14], [-3, 25], [3, 25]].slice(0, low ? 4 : 8)) hibiscus(x, z);
  well(-12, 16);
  if (!low) clouds();

  function coconutTree(x, z, h, seed) {
    const seg = 5, lean = 0.12 + (seed % 3) * 0.05, dir = seed * 1.3;
    let px = x, pz = z;
    for (let i = 0; i < seg; i++) {
      cyl(0.17, 0.2, h / seg + 0.02, i % 2 ? '#8d6e4f' : '#7b5e42', px, (h / seg) * i, pz, { seg: 6 });
      px += Math.cos(dir) * lean * (i / seg); pz += Math.sin(dir) * lean * (i / seg);
    }
    addCol(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 2.4), mat(i % 2 ? '#2e8b3a' : '#3fa34d'));
      const a = (i / 7) * Math.PI * 2;
      leaf.position.set(px + Math.sin(a) * 1.0, h - 0.25, pz + Math.cos(a) * 1.0);
      leaf.rotation.set(0.45, a, 0, 'YXZ');
      statics.add(leaf);
    }
    for (let i = 0; i < 3; i++) ball(0.17, '#6b8e23', px + Math.cos(i * 2.1) * 0.25, h - 0.35, pz + Math.sin(i * 2.1) * 0.25);
  }
  function bananaPlant(x, z) {
    cyl(0.12, 0.16, 1.4, '#9acd32', x, 0, z, { collide: true, seg: 6 });
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 1.6), mat('#56b947'));
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(x + Math.sin(a) * 0.65, 1.55, z + Math.cos(a) * 0.65);
      leaf.rotation.set(-0.5, a, 0, 'YXZ');
      statics.add(leaf);
    }
  }
  function hibiscus(x, z) {
    ball(0.5, '#3c9a3c', x, 0.4, z);
    addCol(x - 0.45, x + 0.45, z - 0.45, z + 0.45);
    const colors = ['#ff2d55', '#ff2d55', '#ffcc00'];
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26;
      ball(0.1, colors[i % 3], x + Math.cos(a) * 0.42, 0.55 + (i % 2) * 0.2, z + Math.sin(a) * 0.42, { seg: 6 });
    }
  }
  function well(x, z) {
    cyl(0.95, 1.0, 0.85, lat, x, 0, z, { seg: 12, collide: true });
    cyl(0.75, 0.75, 0.02, '#1d4f73', x, 0.84, z, { seg: 12 });
    box(0.12, 1.6, 0.12, '#6b3518', x - 0.9, 0.85, z);
    box(0.12, 1.6, 0.12, '#6b3518', x + 0.9, 0.85, z);
    box(2.0, 0.12, 0.12, '#6b3518', x, 2.4, z);
    cyl(0.12, 0.12, 0.25, '#555555', x, 2.15, z, { seg: 8 });
  }
  function clouds() {
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random(), 7, 5), mat('#ffffff'));
        m.position.set(j * 1.4, Math.random() * 0.6, Math.random() * 0.8);
        g.add(m);
      }
      g.position.set(-40 + i * 15, 16 + (i % 3) * 3, -30 + (i % 2) * 12);
      root.add(g);
      W.updaters.push((dt) => { g.position.x += dt * 0.6; if (g.position.x > 50) g.position.x = -50; });
    }
  }

  // ---------- combine all still objects into a few big meshes (much faster on phones) ----------
  const merged = mergeStatic(statics, !low);
  root.remove(statics);
  root.add(merged);
  statics = merged;
  W.root.traverse((o) => { if (o.isMesh && !low) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- per-frame updates ----------
  W.update = (dt, time, player) => {
    const inside = isInsideHouse(player.x, player.z);
    for (const m of W.roofMats) {
      m.opacity += ((inside ? 0 : 1) - m.opacity) * Math.min(1, dt * 6);
      m.depthWrite = m.opacity > 0.95;
    }
    const roofOn = W.roofMats[0].opacity > 0.02;
    for (const m of W.roofMeshes) m.visible = roofOn;
    for (const d of W.doors) {
      d.angle += (d.target - d.angle) * Math.min(1, dt * 3);
      d.pivot.rotation.y = d.angle;
    }
    for (const fn of W.updaters) fn(dt, time);
  };
  return W;
}

// Merge many small still meshes that share a material into one mesh each.
export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(o);
  });
  const out = new THREE.Group();
  for (const [material, meshes] of byMat) {
    const geos = meshes.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      return g;
    });
    const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
    let off = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, off * 3);
      nor.set(g.attributes.normal.array, off * 3);
      off += g.attributes.position.count;
      g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    out.add(new THREE.Mesh(geo, material));
  }
  return out;
}

// ---------- text pictures for signs ----------
export function labelTexture(lines, bg = '#ffffff', fg = '#3a2a1a', w = 512, h = 128) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  roundRect(g, 4, 4, w - 8, h - 8, 26);
  g.fill();
  g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke();
  g.fillStyle = fg;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('wordSpacing' in g) g.wordSpacing = `${Math.round(h * 0.05)}px`;
  const list = Array.isArray(lines) ? lines : [lines];
  const size = list.length > 1 ? h * 0.34 : h * 0.46;
  list.forEach((line, i) => {
    let fs = i === 0 ? size : size * 0.75;
    g.font = `700 ${fs}px ${FONT}`;
    while (g.measureText(line).width > w - 30 && fs > 12) { fs -= 2; g.font = `700 ${fs}px ${FONT}`; }
    const y = list.length > 1 ? h * (i === 0 ? 0.38 : 0.76) : h * 0.54;
    g.fillText(line, w / 2, y);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function emojiTexture(emoji) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.font = '76px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
