// Keyboard (arrows / WASD, Q/E to turn), on-screen joystick for phones, and drag-to-turn camera.
const keys = new Set();
const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const drag = { id: null, lastX: 0, x0: 0, y0: 0, t0: 0, far: false, mouse: false };
let click = null;          // a mouse click on the 3D view (not a drag), waiting to be used as "walk here"
const CLICK_PX = 6;        // moving less than this between press and release still counts as a click
let yawDelta = 0;
let turnButtons = 0;
let enabled = true;
let turnMode = false;      // accessibility mode: left/right arrows (and A/D) turn the child, they don't step sideways
export function setTurnMode(on) { turnMode = on; }

const joyEl = document.getElementById('joystick');
const knob = document.getElementById('joy-knob');
const zone = document.getElementById('joy-zone');
const canvas = document.getElementById('game');
const RADIUS = 50;

export function initControls({ onAction }) {
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    keys.add(e.code);
    if (['Enter', 'Space', 'KeyF'].includes(e.code)) onAction?.(e);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // switch to touch mode the first time the screen is touched
  const becomeTouch = () => document.body.classList.add('touch');
  if (matchMedia('(pointer: coarse)').matches) becomeTouch();
  addEventListener('touchstart', becomeTouch, { once: true, passive: true });

  zone.addEventListener('pointerdown', (e) => {
    if (joy.active) return;
    joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
    joyEl.style.left = `${e.clientX}px`; joyEl.style.top = `${e.clientY}px`;
    joyEl.classList.add('active');
    document.body.classList.add('joy-used');
    knob.style.transform = 'translate(0px, 0px)';
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* not needed for mouse */ }
  });
  zone.addEventListener('pointermove', (e) => {
    if (!joy.active || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / RADIUS; joy.y = -dy / RADIUS;
  });
  const endJoy = (e) => {
    if (e.pointerId !== joy.id) return;
    resetJoystick();
  };
  zone.addEventListener('pointerup', endJoy);
  zone.addEventListener('pointercancel', endJoy);

  // drag on the 3D view (the half without the joystick on phones, anywhere with a mouse) turns the camera
  canvas.addEventListener('pointerdown', (e) => {
    Object.assign(drag, { id: e.pointerId, lastX: e.clientX, x0: e.clientX, y0: e.clientY, t0: performance.now(), far: false, mouse: e.pointerType !== 'touch' });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== drag.id) return;
    yawDelta -= (e.clientX - drag.lastX) * 0.008;
    drag.lastX = e.clientX;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > CLICK_PX) drag.far = true;
  });
  const endDrag = (e) => { if (e.pointerId === drag.id) drag.id = null; };
  // with a mouse, a quick click (not a drag) means "walk there"; phones keep the joystick
  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId === drag.id && drag.mouse && !drag.far && e.button === 0 && performance.now() - drag.t0 < 600 && enabled) {
      click = { x: e.clientX, y: e.clientY };
    }
    endDrag(e);
  });
  canvas.addEventListener('pointercancel', endDrag);

  const hold = (id, dir) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); turnButtons = dir; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => { turnButtons = 0; });
  };
  hold('cam-left', 1);
  hold('cam-right', -1);
}

// the joystick goes back to its resting place (bottom corner) so children always see how to walk
function resetJoystick() {
  joy.active = false; joy.id = null; joy.x = joy.y = 0;
  joyEl.classList.remove('active');
  joyEl.style.left = joyEl.style.top = '';
  knob.style.transform = 'translate(0px, 0px)';
}

export function setControlsEnabled(on) {
  enabled = on;
  if (!on) { keys.clear(); resetJoystick(); turnButtons = 0; click = null; }
}

export function controlsEnabled() { return enabled; }

// the last mouse click on the 3D view, once
export function takeClick() {
  const c = click;
  click = null;
  return c;
}

// x = right, y = forward (both -1 … 1)
export function getMove() {
  if (!enabled) return { x: 0, y: 0 };
  let x = 0, y = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
  if (!turnMode && (keys.has('KeyD') || keys.has('ArrowRight'))) x += 1;
  if (!turnMode && (keys.has('KeyA') || keys.has('ArrowLeft'))) x -= 1;
  if (joy.active) { x += joy.x; y += joy.y; }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  return { x, y };
}

export function takeYaw(dt) {
  let d = yawDelta;
  yawDelta = 0;
  if (!enabled) return 0;
  if (keys.has('KeyQ')) d += dt * 2;
  if (keys.has('KeyE')) d -= dt * 2;
  d += turnButtons * dt * 2;
  return d;
}
