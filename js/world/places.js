// The places outside the rooms open one after another as the child opens rooms, so a new child
// always has one new thing to look forward to instead of everything at once.
// A place the child has already visited stays open (children who played before lose nothing).
// While a place is closed, a striped barrier with a lock and "open N rooms" stands in its way.
// One signpost in the front yard points to every place (closed ones show a lock).
import * as THREE from 'three';
import { mat, labelTexture, emojiTexture } from './house.js';

export const PLACE_ORDER = [
  { id: 'terrace', rooms: 1, visited: 'terraceVisited', emoji: '☀️', arrow: '↗' },
  { id: 'forest', rooms: 2, visited: 'forestVisited', emoji: '🌳', arrow: '⬅' },
  { id: 'park', rooms: 3, visited: 'parkVisited', emoji: '🎡', arrow: '➡' },
  { id: 'race', rooms: 4, visited: 'raceVisited', emoji: '🚣', arrow: '⬆' },
  { id: 'space', rooms: 5, visited: 'spaceVisited', emoji: '🚀', arrow: '➡' },
];

// where each barrier stands: across x (ax 'x') or across z (ax 'z'), from a to b at the fixed line
const BARRIERS = {
  terrace: { ax: 'x', fixed: 6.95, a: 12.7, b: 15.1 },     // the foot of the terrace stairs
  forest: { ax: 'z', fixed: -20, a: 10.4, b: 13.6 },       // the gap in the west wall
  park: { ax: 'z', fixed: 20, a: 17.4, b: 21.6 },          // the gap in the east wall
  race: { ax: 'x', fixed: -14, a: -15.3, b: -11.1 },       // the gap in the back wall
  space: { ax: 'z', fixed: 44, a: 11.9, b: 16.1 },         // the gate at the far side of the park
};

export function createPlaces({ scene, W }) {
  const root = new THREE.Group();
  scene.add(root);
  const label = (w, h, parent) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
    parent.add(m);
    return m;
  };
  const paint = (m, lines, bg, fg = '#ffffff') => {
    m.material.map?.dispose();
    m.material.map = labelTexture(lines, bg, fg);
    m.material.needsUpdate = true;
  };

  // ---------- barriers ----------
  const barriers = {};
  for (const [id, B] of Object.entries(BARRIERS)) {
    const g = new THREE.Group();
    const len = B.b - B.a, mid = (B.a + B.b) / 2;
    if (B.ax === 'x') g.position.set(mid, 0, B.fixed); else { g.position.set(B.fixed, 0, mid); g.rotation.y = Math.PI / 2; }
    root.add(g);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3, 6), mat('#6b3518'));
      post.position.set(s * (len / 2 - 0.1), 0.65, 0);
      g.add(post);
    }
    for (let k = 0; k < 6; k++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(len / 6, 0.22, 0.08), mat(k % 2 ? '#ffffff' : '#ff3b30'));
      bar.position.set(-len / 2 + len / 12 + (k * len) / 6, 0.95, 0);
      g.add(bar);
    }
    const sign = label(Math.min(3, len), 0.6, g);
    sign.position.set(0, 1.6, 0);
    const lock = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('🔒'), depthWrite: false }));
    lock.scale.set(0.6, 0.6, 1);
    lock.position.set(0, 2.25, 0);
    g.add(lock);
    const col = B.ax === 'x'
      ? { minX: B.a, maxX: B.b, minZ: B.fixed - 0.15, maxZ: B.fixed + 0.15, on: true }
      : { minX: B.fixed - 0.15, maxX: B.fixed + 0.15, minZ: B.a, maxZ: B.b, on: true };
    W.colliders.push(col);
    barriers[id] = { g, sign, col };
  }

  // ---------- the signpost in the front yard ----------
  const post = new THREE.Group();
  post.position.set(3.6, 0, 15.2);
  root.add(post);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6), mat('#6b3518'));
  pole.position.y = 1.7;
  post.add(pole);
  const top = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('🧭'), depthWrite: false }));
  top.scale.set(0.7, 0.7, 1);
  top.position.y = 3.75;
  post.add(top);
  const arms = PLACE_ORDER.map((p, i) => {
    const m = label(2.6, 0.5, post);
    const left = p.arrow === '⬅';
    m.position.set(left ? -1.1 : 1.1, 3.05 - i * 0.58, 0.05);
    m.rotation.z = left ? 0.03 : -0.03;
    return m;
  });
  W.colliders.push({ minX: 3.45, maxX: 3.75, minZ: 15.05, maxZ: 15.35, on: true });

  const open = {};
  return {
    isOpen: (id) => !!open[id],
    // which places are open now; returns the ids that have just opened
    update(roomsOpen, stats) {
      const opened = [];
      for (const p of PLACE_ORDER) {
        const now = roomsOpen >= p.rooms || !!stats[p.visited];
        if (now && !open[p.id] && open[p.id] !== undefined) opened.push(p.id);
        open[p.id] = now;
        const b = barriers[p.id];
        b.g.visible = !now;
        b.col.on = !now;
      }
      return opened;
    },
    refreshSigns(names) {
      PLACE_ORDER.forEach((p, i) => {
        const isOpen = !!open[p.id];
        paint(arms[i], isOpen ? `${p.arrow} ${p.emoji} ${names.place[p.id]}` : `🔒 ${p.emoji} ${names.place[p.id]} · ${names.rooms(p.rooms)}`, isOpen ? '#2f7d3a' : '#8a8a8a');
        paint(barriers[p.id].sign, [`🔒 ${names.place[p.id]}`, names.rooms(p.rooms)], '#ff3b30');
      });
    },
  };
}
