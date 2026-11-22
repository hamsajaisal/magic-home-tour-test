// The places outside the rooms open one after another as the child opens rooms, so a new child
// always has one new thing to look forward to instead of everything at once.
// A place the child has already visited stays open (children who played before lose nothing).
// While a place is closed, a striped barrier with a lock and "open N rooms" stands in its way.
// Two boards in the front yard: one says how places open (each room inside opens the next place),
// the other lists every place with its direction (closed ones show a lock and how many more rooms).
import * as THREE from 'three';
import { mat, labelTexture, emojiTexture, boardTexture } from './house.js';

export const PLACE_ORDER = [
  { id: 'terrace', rooms: 1, visited: 'terraceVisited', emoji: '☀️', arrow: '↗' },
  { id: 'forest', rooms: 2, visited: 'forestVisited', emoji: '🌳', arrow: '⬅' },
  { id: 'park', rooms: 3, visited: 'parkVisited', emoji: '🎡', arrow: '➡' },
  { id: 'race', rooms: 4, visited: 'raceVisited', emoji: '🚣', arrow: '↖' },
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

  // ---------- two notice boards on either side of the path to the front steps ----------
  // left: how places open (the rooms inside the house); right: every place with its direction.
  const board = (x, z, turn) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = turn;
    root.add(g);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.3, 6), mat('#6b3518'));
      leg.position.set(s * 0.95, 0.65, -0.03);
      g.add(leg);
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
    g.add(face);
    W.colliders.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.5, maxZ: z + 0.5, on: true });
    return face;
  };
  const howBoard = board(-2.3, 12.7, 0.5);
  const placeBoard = board(2.3, 12.7, -0.5);
  const paintBoard = (face, title, rows, width = 2.2) => {
    face.material.map?.dispose();
    const { tex, aspect } = boardTexture(title, rows);
    face.material.map = tex;
    face.material.needsUpdate = true;
    const h = width / aspect;
    face.scale.set(width, h, 1);
    face.position.set(0, 1.25 + h / 2, 0);
  };

  const open = {};
  let roomsNow = 0;
  return {
    isOpen: (id) => !!open[id],
    // the first place still closed (the one the next room will open)
    nextPlace: () => PLACE_ORDER.find((p) => !open[p.id]) || null,
    // how many more rooms a place needs
    roomsLeft: (id) => Math.max(1, PLACE_ORDER.find((p) => p.id === id).rooms - roomsNow),
    // closed barriers, for the message shown when the child walks up to one
    closedSpots: () => PLACE_ORDER.filter((p) => !open[p.id]).map((p) => {
      const B = BARRIERS[p.id], mid = (B.a + B.b) / 2;
      return { id: p.id, pos: B.ax === 'x' ? [mid, B.fixed] : [B.fixed, mid] };
    }),
    // which places are open now; returns the ids that have just opened
    update(roomsOpen, stats) {
      roomsNow = roomsOpen;
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
    // names: { place: {id: name}, way: {id: where it is}, more: (n) => 'n more rooms', howTitle, how: [lines], placesTitle }
    refreshSigns(names) {
      const rows = PLACE_ORDER.map((p) => {
        const isOpen = !!open[p.id];
        const left = Math.max(1, p.rooms - roomsNow);
        return isOpen
          ? { text: `${p.arrow} ${p.emoji} ${names.place[p.id]} – ${names.way[p.id]}`, bg: '#2f7d3a', fg: '#ffffff' }
          : { text: `🔒 ${p.emoji} ${names.place[p.id]} – ${names.more(left)}`, bg: '#e4ddd0', fg: '#3a2a1a' };
      });
      paintBoard(placeBoard, names.placesTitle, rows);
      paintBoard(howBoard, names.howTitle, names.how.map((text, i) => ({ text, bg: ['#fde68a', '#bfdbfe', '#fbcfe8'][i % 3], fg: '#3a2a1a' })));
      PLACE_ORDER.forEach((p) => {
        paint(barriers[p.id].sign, [`🔒 ${p.emoji} ${names.place[p.id]}`, names.more(Math.max(1, p.rooms - roomsNow))], '#ff3b30');
      });
    },
  };
}
