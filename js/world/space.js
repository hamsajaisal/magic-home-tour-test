// The space centre beyond the far gate of the Maths Park, and a trip to the Moon.
// 1. Build the rocket in four parts (a quiz for each; kept in the save, so it can take several days).
// 2. Launch: a countdown, smoke and fire, the sky turns dark.
// 3. The flight: one question per meteor; a right answer zaps it, a wrong one only shakes the rocket.
// 4. On the Moon: big slow jumps, footprints, Moon rocks to pick up, a flag to plant (a short quiz).
// 5. Home: the capsule comes down by parachute and splashes into the backwater.
// The Moon is built far away from the house (at x 3000) so the two never get in each other's way.
import * as THREE from 'three';
import { mat, labelTexture, emojiTexture, mergeStatic } from './house.js';
import { play } from '../audio.js';

export const SPACE_AREA = { x1: 44, x2: 74, z1: 2, z2: 28 };
const PAD = { x: 62, z: 15 };
const ENTRY = [57.4, 18.6];                     // where the child stands to build or to launch
export const MOON = { x: 3000, z: 0, r: 40 };
const LANDED = { x: MOON.x + 6, z: MOON.z };    // where the rocket stands on the Moon
const DOOR = [MOON.x + 3.4, MOON.z + 2.2];      // and where the child gets back in
const FLAG = { x: MOON.x - 9, z: MOON.z - 7 };
const FL_START = new THREE.Vector3(MOON.x - 150, 80, MOON.z + 50);
const FL_END = new THREE.Vector3(LANDED.x, 30, LANDED.z);
const SPLASH = new THREE.Vector3(30, 0, -48);   // the capsule comes down in the backwater
const JETTY_END = [-13.2, -23];
export const FLIGHT_LEGS = 5;
const ROCKS = 8;
const PARTS = [                                 // bottom to top: [height, builder]
  { h: 3 }, { h: 5 }, { h: 2.2 }, { h: 2.6 },
];

export function createSpace({ scene, W, low, onRock }) {
  const root = new THREE.Group();          // the space centre on Earth
  const moonRoot = new THREE.Group();      // the Moon, far away
  const statics = new THREE.Group();
  scene.add(root, moonRoot);
  const box = (w, h, d, color, x, y, z, parent = statics, rotY = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    parent.add(m);
    return m;
  };
  const cyl = (r1, r2, h, color, x, y, z, parent = statics, seg = 12) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat(color));
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  };
  const bar = (a, b, r, color, parent = statics) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 5), mat(color));
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
  const sign = (w, h, x, y, z, rotY, parent = root) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    parent.add(m);
    return m;
  };
  const col = (minX, maxX, minZ, maxZ) => W.colliders.push({ minX, maxX, minZ, maxZ, on: true });

  // ---------- the space centre ----------
  box(SPACE_AREA.x2 - SPACE_AREA.x1, 0.02, SPACE_AREA.z2 - SPACE_AREA.z1, '#a9b8a3', (SPACE_AREA.x1 + SPACE_AREA.x2) / 2, -0.03, (SPACE_AREA.z1 + SPACE_AREA.z2) / 2);
  box(13, 0.06, 2.2, '#d9d9d9', 51, 0, 14);                                  // the walk from the gate
  box(10, 0.3, 10, '#cfcfcf', PAD.x, 0, PAD.z);                              // the launch pad
  for (const [ax, fixed, a, b] of [['x', SPACE_AREA.z1, SPACE_AREA.x1, SPACE_AREA.x2], ['x', SPACE_AREA.z2, SPACE_AREA.x1, SPACE_AREA.x2], ['z', SPACE_AREA.x2, SPACE_AREA.z1, SPACE_AREA.z2]]) {
    const len = b - a;
    if (ax === 'x') { box(len, 1.1, 0.12, '#9aa5b1', (a + b) / 2, 0, fixed); col(a, b, fixed - 0.2, fixed + 0.2); }
    else { box(0.12, 1.1, len, '#9aa5b1', fixed, 0, (a + b) / 2); col(fixed - 0.2, fixed + 0.2, a, b); }
  }
  for (const [ax, fixed, a, b] of [['z', SPACE_AREA.x1, SPACE_AREA.z1, 12], ['z', SPACE_AREA.x1, 16, SPACE_AREA.z2]]) {
    box(0.12, 1.1, b - a, '#9aa5b1', fixed + 0.3, 0, (a + b) / 2);
    col(fixed + 0.1, fixed + 0.5, a, b);
  }
  // the service tower beside the rocket
  const TX = PAD.x + 4.2;
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) bar([TX + dx, 0.3, PAD.z + dz], [TX + dx, 16, PAD.z + dz], 0.09, '#ff5d3d');
  for (let y = 1.5; y < 16; y += 2) {
    bar([TX - 0.8, y, PAD.z - 0.8], [TX + 0.8, y + 1, PAD.z - 0.8], 0.05, '#ffffff');
    bar([TX - 0.8, y, PAD.z + 0.8], [TX + 0.8, y + 1, PAD.z + 0.8], 0.05, '#ffffff');
  }
  for (const y of [10.5, 13]) bar([TX - 0.8, y, PAD.z], [PAD.x + 1.3, y, PAD.z], 0.08, '#ff5d3d');
  col(TX - 1, TX + 1, PAD.z - 1, PAD.z + 1);
  // the crane that lifts each new part on top of the last
  const CX = PAD.x - 6.5;
  cyl(0.35, 0.45, 18, '#ffd23d', CX, 0, PAD.z);
  box(9, 0.4, 0.4, '#ffd23d', CX + 3.5, 17.6, PAD.z);
  col(CX - 0.6, CX + 0.6, PAD.z - 0.6, PAD.z + 0.6);
  const hook = new THREE.Group();
  root.add(hook);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), mat('#333333'));
  hook.add(cable);
  // a desk with screens, and the arch over the way in
  box(2.6, 0.9, 0.9, '#5a6b7c', ENTRY[0] - 0.4, 0, ENTRY[1] + 1.6);
  box(2.4, 0.9, 0.08, '#1d2a38', ENTRY[0] - 0.4, 0.9, ENTRY[1] + 1.95);
  col(ENTRY[0] - 1.8, ENTRY[0] + 1, ENTRY[1] + 1.1, ENTRY[1] + 2.1);
  for (const s of [-1, 1]) cyl(0.16, 0.18, 3.6, '#3d7bff', SPACE_AREA.x1 + 0.6, 0, 14 + s * 2.2);
  box(0.3, 0.4, 4.8, '#ffffff', SPACE_AREA.x1 + 0.6, 3.5, 14);
  const arch = sign(3.8, 0.8, SPACE_AREA.x1 + 0.4, 3.0, 14, -Math.PI / 2);
  const archBack = sign(3.8, 0.8, SPACE_AREA.x1 + 0.8, 3.0, 14, Math.PI / 2);
  root.add(mergeStatic(statics));

  // ---------- the rocket: four parts on top of each other, plus fire and smoke ----------
  const rocket = new THREE.Group();
  scene.add(rocket);
  const parts = [];
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#7fb4ff', wireframe: true, transparent: true, opacity: 0.35 });
  let base = 0.3;
  const partGroup = (i) => {
    const g = new THREE.Group();
    const h = PARTS[i].h;
    const add = (geo, color, y = h / 2, x = 0, z = 0) => { const m = new THREE.Mesh(geo, mat(color, true)); m.position.set(x, y, z); g.add(m); return m; };
    if (i === 0) {          // engines and fins
      add(new THREE.CylinderGeometry(1.25, 1.4, h, 16), '#d6dbe0');
      for (const a of [0, 1, 2, 3]) {
        const fin = add(new THREE.BoxGeometry(0.12, 2.2, 1.3), '#ff3b30', 1.1, Math.cos(a * Math.PI / 2) * 1.5, Math.sin(a * Math.PI / 2) * 1.5);
        fin.rotation.y = -a * Math.PI / 2 + Math.PI / 2;
      }
      for (const a of [0, 1, 2, 3]) add(new THREE.ConeGeometry(0.35, 0.6, 10, 1, true), '#555555', -0.25, Math.cos(a * Math.PI / 2 + 0.78) * 0.6, Math.sin(a * Math.PI / 2 + 0.78) * 0.6);
    } else if (i === 1) {   // the fuel tank, white with an orange band
      add(new THREE.CylinderGeometry(1.25, 1.25, h, 16), '#fafafa');
      add(new THREE.CylinderGeometry(1.27, 1.27, 0.7, 16), '#ff8c42', h * 0.65);
      add(new THREE.CylinderGeometry(1.27, 1.27, 0.25, 16), '#3fbf6f', h * 0.65 - 0.5);
    } else if (i === 2) {   // the cabin with a round window
      add(new THREE.CylinderGeometry(1.1, 1.25, h, 16), '#f2f2f2');
      const win = add(new THREE.CircleGeometry(0.45, 16), '#4fc3f7', h * 0.55, 0, 1.2);
      win.rotation.y = 0;
      const rim = add(new THREE.TorusGeometry(0.47, 0.06, 6, 16), '#999999', h * 0.55, 0, 1.17);
      rim.rotation.y = 0;
    } else {                // the nose and a little flag
      add(new THREE.ConeGeometry(1.1, h, 16), '#ff5d3d');
      const pole = add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), '#cccccc', h + 0.4);
      const flag = add(new THREE.BoxGeometry(0.02, 0.35, 0.55), '#ff9933', h + 0.65, 0, 0.3);
      add(new THREE.BoxGeometry(0.02, 0.12, 0.55), '#138808', h + 0.53, 0, 0.3);
      flag.scale.y = 0.4;
    }
    return g;
  };
  for (let i = 0; i < PARTS.length; i++) {
    const real = partGroup(i);
    real.position.y = base;
    rocket.add(real);
    const ghost = partGroup(i);
    ghost.traverse((o) => { if (o.isMesh) o.material = ghostMat; });
    ghost.position.y = base;
    rocket.add(ghost);
    parts.push({ real, ghost, base });
    base += PARTS[i].h;
  }
  const ROCKET_H = base;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.5, 12), new THREE.MeshBasicMaterial({ color: '#ffb300', transparent: true, opacity: 0.85 }));
  flame.rotation.x = Math.PI;
  flame.position.y = -1.6;
  flame.visible = false;
  rocket.add(flame);
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 10), new THREE.MeshBasicMaterial({ color: '#fff3b0' }));
  flameCore.rotation.x = Math.PI;
  flameCore.position.y = -1.0;
  flame.add(flameCore);
  const smoke = [];
  for (let k = 0; k < (low ? 10 : 24); k++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#f2f2f2', transparent: true, opacity: 0.8 }));
    s.visible = false;
    scene.add(s);
    smoke.push({ s, t: 0, vx: 0, vz: 0 });
  }
  const putRocket = (x, y, z) => { rocket.position.set(x, y, z); rocket.quaternion.identity(); };
  putRocket(PAD.x, 0, PAD.z);

  // ---------- space: stars that travel with the camera, the Earth far off ----------
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let k = 0; k < 600; k++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 170;
    starPos.push(Math.sqrt(1 - u * u) * Math.cos(a) * r, u * r, Math.sqrt(1 - u * u) * Math.sin(a) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0 }));
  stars.frustumCulled = false;
  scene.add(stars);

  // ---------- the Moon ----------
  const moonTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#b9b9b9';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '90,90,90' : '230,230,230'},${0.08 + Math.random() * 0.15})`;
      g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 10, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 40), new THREE.MeshLambertMaterial({ map: moonTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(MOON.x, 0, MOON.z);
  moonRoot.add(ground);
  const mstat = new THREE.Group();
  for (let k = 0; k < (low ? 8 : 16); k++) {             // craters
    const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 30, s = 1.5 + Math.random() * 3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(s, s * 0.22, 5, 18), mat('#a3a3a3'));
    ring.rotation.x = -Math.PI / 2;
    ring.scale.z = 0.35;
    ring.position.set(MOON.x + Math.cos(a) * r, 0.05, MOON.z + Math.sin(a) * r);
    if (Math.hypot(ring.position.x - LANDED.x, ring.position.z - LANDED.z) > 6 && Math.hypot(ring.position.x - FLAG.x, ring.position.z - FLAG.z) > 5) mstat.add(ring);
  }
  for (let k = 0; k < 30; k++) {                         // hills all round
    const a = (k / 30) * Math.PI * 2, r = 62 + Math.random() * 14, h = 6 + Math.random() * 12;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(8 + Math.random() * 6, h, 7), mat(k % 2 ? '#9e9e9e' : '#8a8a8a'));
    hill.position.set(MOON.x + Math.cos(a) * r, h / 2 - 0.5, MOON.z + Math.sin(a) * r);
    mstat.add(hill);
  }
  moonRoot.add(mergeStatic(mstat));
  const earth = new THREE.Group();
  earth.position.set(MOON.x - 40, 48, MOON.z - 110);
  moonRoot.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(11, 24, 16), new THREE.MeshBasicMaterial({ color: '#2f7fd8' })));
  for (let k = 0; k < 7; k++) {
    const land = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 3, 10, 8), new THREE.MeshBasicMaterial({ color: k % 3 ? '#3fae5a' : '#f4f1e8' }));
    const a = Math.random() * Math.PI - Math.PI / 2, b = Math.random() * Math.PI - Math.PI / 2;
    land.position.set(Math.sin(b) * 8.6, Math.sin(a) * 8.6, Math.cos(a) * Math.cos(b) * 8.6);
    land.scale.z = 0.4;
    land.lookAt(0, 0, 0);
    earth.add(land);
  }
  // Moon rocks to pick up, footprints, and the flag
  const rocks = [];
  for (let k = 0; k < ROCKS; k++) {
    const a = (k / ROCKS) * Math.PI * 2 + 0.3, r = 10 + (k % 3) * 8;
    const x = MOON.x + Math.cos(a) * r, z = MOON.z + Math.sin(a) * r;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: k % 2 ? '#d4f1ff' : '#fff2b3' }));
    m.position.set(x, 0.35, z);
    moonRoot.add(m);
    const glow = sprite('✨', x, 1.2, z, 0.6, moonRoot);
    rocks.push({ m, glow, x, z, got: false });
  }
  const steps = [];
  for (let k = 0; k < 50; k++) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), new THREE.MeshBasicMaterial({ color: '#6f6f6f' }));
    f.rotation.x = -Math.PI / 2;
    f.visible = false;
    moonRoot.add(f);
    steps.push(f);
  }
  const flagGroup = new THREE.Group();
  flagGroup.position.set(FLAG.x, 0, FLAG.z);
  moonRoot.add(flagGroup);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), mat('#dddddd'));
  flagPole.position.y = 1.5;
  flagGroup.add(flagPole);
  const flagCloth = new THREE.Group();
  flagCloth.position.set(0, 2.5, 0.75);
  flagGroup.add(flagCloth);
  [['#ff9933', 0.33], ['#ffffff', 0], ['#138808', -0.33]].forEach(([c, y]) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.33, 1.4), mat(c));
    s.position.y = y;
    flagCloth.add(s);
  });
  const chakra = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 4, 16), mat('#1a3d8f'));
  chakra.rotation.y = Math.PI / 2;
  chakra.position.x = 0.03;
  flagCloth.add(chakra);
  const flagSpot = sprite('🚩', FLAG.x, 1.2, FLAG.z, 0.8, moonRoot);
  // the meteor of the current question, with bits flying off when it is zapped
  const meteor = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), mat('#7a5c48'));
  meteor.visible = false;
  scene.add(meteor);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), new THREE.MeshBasicMaterial({ color: '#6fffb0' }));
  beam.visible = false;
  scene.add(beam);
  const bits = [];
  for (let k = 0; k < 10; k++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), mat('#8d6e5a'));
    b.visible = false;
    scene.add(b);
    bits.push({ b, v: new THREE.Vector3() });
  }
  // the capsule and parachute for the way home
  const capsule = new THREE.Group();
  scene.add(capsule);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 14), mat('#f2f2f2'));
  cone.position.y = 0.9;
  capsule.add(cone);
  const chute = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ff5d3d', true));
  chute.position.y = 7.5;
  chute.material.side = THREE.DoubleSide;
  capsule.add(chute);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    bar([0, 1.6, 0], [Math.cos(a) * 3.9, 7.5, Math.sin(a) * 3.9], 0.02, '#ffffff', capsule);
  }
  capsule.visible = false;

  // ---------- what is happening ----------
  const S = {
    phase: 'idle', t: 0, legs: 0, shown: 0, dark: 0, hop: 0, hopY: 0, stepDist: 0, lastStep: null, stepIdx: 0,
    land: null, shake: 0, zap: null, flagged: false, rocks: 0, building: null, onLanded: null, onHome: null,
  };
  const flightDir = FL_END.clone().sub(FL_START).normalize();
  const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  function showParts(n) {
    parts.forEach((p, i) => { p.real.visible = i < n; p.ghost.visible = i >= n; p.real.position.y = p.base; });
  }
  function pointRocket(dir) { rocket.quaternion.setFromUnitVectors(up, dir.clone().normalize()); }
  function flightPoint(u) { return FL_START.clone().lerp(FL_END, u); }
  function newMeteor() {
    const at = flightPoint(Math.min(1, (S.legs + 0.9) / (FLIGHT_LEGS + 0.6)));
    const side = new THREE.Vector3().crossVectors(flightDir, up).normalize();
    meteor.position.copy(at).addScaledVector(side, (Math.random() < 0.5 ? -1 : 1) * 2.5).addScaledVector(up, 1.5);
    meteor.scale.setScalar(1);
    meteor.visible = true;
  }
  function restoreMoon() {
    S.flagged = false;
    S.rocks = 0;
    rocks.forEach((r) => { r.got = false; r.m.visible = true; r.glow.visible = true; });
    flagCloth.visible = false;
    flagPole.scale.y = 0.01;
    flagSpot.visible = true;
    steps.forEach((f) => { f.visible = false; });
  }
  restoreMoon();

  return {
    get phase() { return S.phase; },
    get legs() { return S.legs; },
    get rocksFound() { return S.rocks; },
    get flagged() { return S.flagged; },
    onMoon: (x) => x > MOON.x - 200,
    inside(x, z) { return x > SPACE_AREA.x1 + 0.6 && x < SPACE_AREA.x2 && z > SPACE_AREA.z1 && z < SPACE_AREA.z2; },
    holds() { return !['idle', 'moon'].includes(S.phase); },
    hidesPlayer() { return ['count', 'launch', 'flight', 'land', 'leave', 'chute'].includes(S.phase); },
    // 0 on Earth, 1 in space: how dark the sky is
    darkness() { return S.dark; },
    setParts(n) { showParts(n); },

    refreshSigns(names) {
      for (const m of [arch, archBack]) {
        m.material.map?.dispose();
        m.material.map = labelTexture(`🚀 ${names.space}`, '#3d7bff', '#ffffff');
        m.material.needsUpdate = true;
      }
    },

    // the places where something can start, for the prompt near the child
    targets(parts) {
      if (S.phase === 'moon') {
        const list = [{ kind: 'shome', key: 'shome', pos: DOOR, r: 1.8 }];
        if (!S.flagged) list.push({ kind: 'sflag', key: 'sflag', pos: [FLAG.x + 1.2, FLAG.z + 1.2], r: 2 });
        return list;
      }
      if (S.phase !== 'idle' || S.building) return [];
      return [{ kind: parts >= PARTS.length ? 'slaunch' : 'sbuild', key: 'space', pos: ENTRY, r: 1.8 }];
    },
    // the Moon rocks still lying about (for the accessibility mode)
    rocksLeft() { return S.phase === 'moon' ? rocks.filter((r) => !r.got).map((r) => [r.x, r.z]) : []; },

    // a new part comes down on the crane and sits on top of the others
    addPart(i, then) { S.building = { i, t: 0, then }; },

    launch({ onFlight, onLanded }) {
      S.phase = 'count';
      S.t = 0;
      S.legs = 0;
      S.shown = 0;
      S.onFlight = onFlight;
      S.onLanded = onLanded;
      restoreMoon();
      putRocket(PAD.x, 0, PAD.z);
    },

    // one flight question answered: zap the meteor, or bump into it
    leg(firstTry) {
      if (S.phase !== 'flight') return;
      S.legs++;
      S.zap = { t: 0, hit: firstTry };
      if (firstTry) { play('zap'); } else { S.shake = 1; play('bump'); }
    },

    plantFlag() { S.flagged = true; S.flagRise = 0; flagSpot.visible = false; flagCloth.visible = true; play('chest'); },

    goHome(onHome) { S.phase = 'leave'; S.t = 0; S.onHome = onHome; play('go'); },

    // stop a trip early (the quiz was closed during the flight): back to the launch pad
    abort() {
      S.phase = 'idle';
      S.dark = 0;
      meteor.visible = false;
      flame.visible = false;
      putRocket(PAD.x, 0, PAD.z);
      S.land = ENTRY;
    },

    constrain(p) {
      const ph = S.phase;
      if (['count', 'launch', 'flight', 'land', 'leave'].includes(ph)) { p.x = rocket.position.x; p.z = rocket.position.z; return; }
      if (ph === 'chute') { p.x = capsule.position.x; p.z = capsule.position.z; return; }
      if (S.land) { p.x = S.land[0]; p.z = S.land[1]; S.land = null; return; }
      if (ph === 'moon') {
        const dx = p.x - MOON.x, dz = p.z - MOON.z, d = Math.hypot(dx, dz);
        if (d > MOON.r) { p.x = MOON.x + (dx / d) * MOON.r; p.z = MOON.z + (dz / d) * MOON.r; }
        if (Math.hypot(p.x - LANDED.x, p.z - LANDED.z) < 1.7) {   // not through the rocket
          const a = Math.atan2(p.z - LANDED.z, p.x - LANDED.x);
          p.x = LANDED.x + Math.cos(a) * 1.7; p.z = LANDED.z + Math.sin(a) * 1.7;
        }
      }
    },
    height() {
      const ph = S.phase;
      if (['count', 'launch', 'flight', 'land', 'leave'].includes(ph)) return rocket.position.y + 9;
      if (ph === 'chute') return capsule.position.y;
      if (ph === 'moon') return S.hopY;
      return null;
    },
    facing() { return null; },

    cameraGoals(camGoal, lookAt, narrow) {
      const ph = S.phase;
      const r = rocket.position;
      if (ph === 'count' || (ph === 'launch' && S.t < 2.2)) {
        camGoal.set(PAD.x - 16, 5, PAD.z + 14);
        lookAt.set(r.x, r.y + 7, r.z);
      } else if (ph === 'launch' || ph === 'leave') {
        camGoal.set(r.x - 14, r.y + 2, r.z + 14);
        lookAt.set(r.x, r.y + 8, r.z);
      } else if (ph === 'flight') {
        const side = tmp.crossVectors(flightDir, up).normalize();
        camGoal.copy(r).addScaledVector(flightDir, -16).addScaledVector(up, 5).addScaledVector(side, -3);
        lookAt.copy(r).addScaledVector(flightDir, 8);
        if (narrow) lookAt.addScaledVector(up, -6); else lookAt.addScaledVector(side, 6);
      } else if (ph === 'land') {
        camGoal.set(r.x - 14, Math.max(4, r.y + 3), r.z + 14);
        lookAt.set(r.x, r.y + 5, r.z);
      } else if (ph === 'chute') {
        const c = capsule.position;
        camGoal.set(c.x - 12, c.y + 3, c.z + 16);
        lookAt.set(c.x, c.y + 3, c.z);
      } else return false;
      return true;
    },

    update(dt, time, me) {
      const ph = S.phase;
      root.visible = me.x > 15 && me.x < 200;
      moonRoot.visible = me.x > 1000 || ph === 'flight' || ph === 'land';
      // the sky: dark in space and on the Moon, blue at home
      let want = 0;
      if (ph === 'launch') want = Math.min(1, Math.max(0, (rocket.position.y - 25) / 110));
      else if (['flight', 'land', 'moon', 'leave'].includes(ph)) want = 1;
      S.dark += (want - S.dark) * Math.min(1, dt * (ph === 'chute' || ph === 'idle' ? 3 : 1.5));
      stars.material.opacity = Math.max(0, (S.dark - 0.3) / 0.7);
      stars.visible = S.dark > 0.3;
      if (stars.visible) stars.position.copy(me.cam || rocket.position);
      if (low) stars.material.size = 1.5;

      // a part being lowered by the crane
      if (S.building) {
        const B = S.building, p = parts[B.i];
        B.t += dt;
        const u = Math.min(1, B.t / 3);
        p.real.visible = true;
        p.ghost.visible = false;
        p.real.position.y = p.base + (1 - u * u * (3 - 2 * u)) * 9;
        hook.visible = true;
        const topY = 17.4, hy = p.real.position.y + PARTS[B.i].h + 0.2;
        cable.scale.y = Math.max(0.1, topY - hy);
        hook.position.set(PAD.x, (topY + hy) / 2, PAD.z);
        if (u >= 1) { S.building = null; hook.visible = false; play('unlock'); B.then?.(); }
      } else hook.visible = false;

      flame.visible = ['launch', 'flight', 'land', 'leave'].includes(ph) || (ph === 'count' && S.t > 5.5);
      if (flame.visible) flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
      // smoke puffs at the pad during the launch
      for (const s of smoke) {
        if (s.t > 0) {
          s.t -= dt;
          s.s.position.x += s.vx * dt; s.s.position.z += s.vz * dt; s.s.position.y += dt * 0.6;
          s.s.scale.setScalar(1 + (3 - s.t) * 0.9);
          s.s.material.opacity = Math.max(0, s.t / 3) * 0.8;
          s.s.visible = s.t > 0;
        }
      }
      const puff = (x, z) => {
        const s = smoke.find((o) => o.t <= 0);
        if (!s) return;
        s.t = 3; const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 3;
        s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v;
        s.s.position.set(x, 0.8, z);
        s.s.visible = true;
      };

      if (ph === 'idle' || ph === 'moon') {
        if (ph === 'moon') {
          // big slow jumps while walking, footprints where the feet land, rocks to pick up
          const moving = (me.speed || 0) > 0.3;
          if (moving) { S.hop += dt * 2.2; S.hopY = Math.abs(Math.sin(S.hop)) * 1.3; } else S.hopY *= Math.max(0, 1 - dt * 6);
          if (moving && S.hopY < 0.08 && (!S.lastStep || Math.hypot(me.x - S.lastStep[0], me.z - S.lastStep[1]) > 0.9)) {
            const f = steps[S.stepIdx++ % steps.length];
            f.position.set(me.x, 0.02, me.z);
            f.visible = true;
            S.lastStep = [me.x, me.z];
            play('step');
          }
          for (const r of rocks) {
            if (r.got) continue;
            r.m.rotation.y += dt;
            r.glow.position.y = 1.2 + Math.sin(time * 3 + r.x) * 0.15;
            if (Math.hypot(me.x - r.x, me.z - r.z) < 1.1) { r.got = true; r.m.visible = false; r.glow.visible = false; S.rocks++; play('catch'); onRock?.(S.rocks, ROCKS); }
          }
          if (S.flagRise !== undefined && S.flagRise < 1) {
            S.flagRise = Math.min(1, S.flagRise + dt * 0.6);
            flagPole.scale.y = Math.max(0.01, S.flagRise);
            flagPole.position.y = 1.5 * S.flagRise;
            flagCloth.position.y = 0.4 + 2.1 * S.flagRise;
          }
          if (flagCloth.visible) flagCloth.rotation.y = Math.sin(time * 1.5) * 0.08;
        }
        return;
      }

      S.t += dt;
      if (ph === 'count') {
        // the countdown: 10 to 1, about two thirds of a second each
        const before = Math.ceil(10 - (S.t - dt) / 0.7), now = Math.ceil(10 - S.t / 0.7);
        if (now !== before && now >= 1) { play('beep'); S.onCount?.(now); }
        if (S.t > 5.5 && Math.random() < dt * 8) puff(PAD.x, PAD.z);
        if (S.t >= 7) { S.phase = 'launch'; S.t = 0; play('blast'); S.onCount?.(0); }
      } else if (ph === 'launch') {
        const y = 0.5 * 7 * S.t * S.t;                  // speeding up
        putRocket(PAD.x, y, PAD.z);
        rocket.position.x += Math.sin(time * 30) * 0.03;
        if (S.t < 3 && Math.random() < dt * 12) puff(PAD.x, PAD.z);
        if (y > 160) {
          S.phase = 'flight';
          S.t = 0;
          S.shown = 0;
          rocket.position.copy(FL_START);
          pointRocket(flightDir);
          newMeteor();
          S.onFlight?.();
        }
      } else if (ph === 'flight') {
        // the rocket goes on a step for each answer; the last step brings it over the landing place
        const goal = Math.min(1, S.legs / FLIGHT_LEGS) * 0.92 + 0.04 * Math.min(1, S.t / 3);
        S.shown += (goal - S.shown) * Math.min(1, dt * 1.2);
        rocket.position.copy(flightPoint(S.shown));
        if (S.shake > 0) {
          S.shake -= dt;
          rocket.position.x += Math.sin(time * 50) * 0.3 * S.shake;
          rocket.position.y += Math.cos(time * 43) * 0.3 * S.shake;
        }
        pointRocket(flightDir);
        meteor.rotation.x += dt; meteor.rotation.y += dt * 0.7;
        if (S.zap) {
          const Z = S.zap;
          Z.t += dt;
          if (Z.hit) {
            beam.visible = Z.t < 0.35;
            if (beam.visible) {
              const a = rocket.position.clone().addScaledVector(flightDir, 7), b = meteor.position;
              beam.position.copy(a).add(b).multiplyScalar(0.5);
              beam.scale.y = a.distanceTo(b);
              beam.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
            }
            if (Z.t > 0.3 && meteor.visible) {
              meteor.visible = false;
              bits.forEach((o) => { o.b.visible = true; o.b.position.copy(meteor.position); o.v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(14); });
            }
          } else if (Z.t > 0.2) meteor.position.addScaledVector(up, dt * 6);   // it bounces off and drifts away
          if (Z.t > 1.6) {
            S.zap = null;
            beam.visible = false;
            bits.forEach((o) => { o.b.visible = false; });
            if (S.legs < FLIGHT_LEGS) newMeteor(); else { meteor.visible = false; S.phase = 'land'; S.t = 0; }
          }
        }
        bits.forEach((o) => { if (o.b.visible) o.b.position.addScaledVector(o.v, dt); });
      } else if (ph === 'land') {
        // over the landing place, turn upright and come down slowly
        const from = flightPoint(S.shown);
        const u = Math.min(1, S.t / 5);
        rocket.position.set(lerp(from.x, LANDED.x, Math.min(1, u * 2)), lerp(from.y, 0, smooth(u)), lerp(from.z, LANDED.z, Math.min(1, u * 2)));
        rocket.quaternion.slerp(new THREE.Quaternion(), Math.min(1, dt * 2));
        if (u >= 1) {
          rocket.quaternion.identity();
          rocket.position.set(LANDED.x, 0, LANDED.z);
          S.phase = 'moon';
          S.land = [DOOR[0], DOOR[1]];
          play('chest');
          S.onLanded?.();
        }
      } else if (ph === 'leave') {
        const y = 0.5 * 6 * S.t * S.t;
        rocket.position.set(LANDED.x, y, LANDED.z);
        if (S.t > 4) {
          // home: the capsule over the backwater
          S.phase = 'chute';
          S.t = 0;
          putRocket(PAD.x, 0, PAD.z);        // the rocket is back on the pad for the next trip
          capsule.visible = true;
          capsule.position.set(SPLASH.x, 70, SPLASH.z);
          chute.scale.setScalar(0.2);
        }
      } else if (ph === 'chute') {
        const c = capsule.position;
        chute.scale.setScalar(Math.min(1, 0.2 + S.t));
        c.y = Math.max(0.2, 70 - S.t * (S.t < 1 ? 14 : 6));
        capsule.rotation.z = Math.sin(time * 1.3) * 0.08;
        if (c.y <= 0.2 && !S.splashed) { S.splashed = true; S.splashAt = S.t; play('splash'); }
        if (S.splashed && S.t - S.splashAt > 1.5) {
          S.splashed = false;
          capsule.visible = false;
          S.phase = 'idle';
          S.land = JETTY_END;
          S.onHome?.();
        }
      }
    },

    set onCount(f) { S.onCount = f; },
  };
}

const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => u * u * (3 - 2 * u);
