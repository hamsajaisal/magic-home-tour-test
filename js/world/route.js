// Finds a walking route around the house and garden (not the forest or the terrace top),
// so the accessibility mode can take a child to a place without bumping into walls.
// A grid over the compound; cells too close to a wall or furniture are blocked; A* finds the way,
// then corners that can be skipped in a straight line are dropped.
import { pointBlocked } from './physics.js';

const AREA = { x1: -20.3, x2: 20.3, z1: -14, z2: 28.5 };
const CELL = 0.4;
const CLEAR = 0.42;         // how far from walls the route keeps

export function findRoute(from, to, colliders) {
  const nx = Math.ceil((AREA.x2 - AREA.x1) / CELL), nz = Math.ceil((AREA.z2 - AREA.z1) / CELL);
  const cx = (x) => Math.max(0, Math.min(nx - 1, Math.round((x - AREA.x1) / CELL)));
  const cz = (z) => Math.max(0, Math.min(nz - 1, Math.round((z - AREA.z1) / CELL)));
  const wx = (i) => AREA.x1 + i * CELL, wz = (j) => AREA.z1 + j * CELL;
  const blocked = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) blocked[j * nx + i] = pointBlocked(wx(i), wz(j), colliders, CLEAR) ? 1 : 0;
  // start or goal right against something: use the nearest open cell
  const open = (i, j) => {
    if (!blocked[j * nx + i]) return [i, j];
    for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < nx && b < nz && !blocked[b * nx + a]) return [a, b];
    }
    return null;
  };
  const s = open(cx(from.x), cz(from.z)), g = open(cx(to.x), cz(to.z));
  if (!s || !g) return null;
  const start = s[1] * nx + s[0], goal = g[1] * nx + g[0];
  const gScore = new Float32Array(nx * nz).fill(Infinity);
  const came = new Int32Array(nx * nz).fill(-1);
  const h = (k) => Math.hypot((k % nx) - g[0], Math.floor(k / nx) - g[1]);
  const heap = [[h(start), start]];
  gScore[start] = 0;
  const push = (item) => { heap.push(item); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const steps = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let found = false;
  while (heap.length) {
    const [, k] = pop();
    if (k === goal) { found = true; break; }
    const i = k % nx, j = Math.floor(k / nx);
    for (const [di, dj, c] of steps) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const n = b * nx + a;
      if (blocked[n]) continue;
      if (di && dj && (blocked[j * nx + a] || blocked[b * nx + i])) continue;   // no cutting corners
      const score = gScore[k] + c;
      if (score < gScore[n]) { gScore[n] = score; came[n] = k; push([score + h(n), n]); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = goal; k !== -1; k = came[k]) cells.unshift(k);
  const pts = cells.map((k) => ({ x: wx(k % nx), z: wz(Math.floor(k / nx)) }));
  // keep only the corners: drop a point when the straight line around it is clear
  const clear = (a, b) => {
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.2);
    for (let t = 1; t < n; t++) if (pointBlocked(a.x + ((b.x - a.x) * t) / n, a.z + ((b.z - a.z) * t) / n, colliders, CLEAR - 0.05)) return false;
    return true;
  };
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clear(pts[i], pts[j])) j--;
    out.push(pts[j]);
    i = j;
  }
  out[out.length - 1] = { x: to.x, z: to.z };
  return out.slice(1);
}
