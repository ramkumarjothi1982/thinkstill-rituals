// The Hushfold's one input router, on #fx-layer (touch-action:none).
//
// Every touch on the stage lands here first and goes to exactly one owner,
// in priority order: the hero Mallow (stageMallow.hitTest; both fingers when
// stageMallow.multiTouch) → a Thought Mallow
// → the current world (the Hushflow director's handler) → empty space.
// Up to two pointers are tracked, with coalesced moves and a smoothed
// velocity. The Mallow's eyes follow any finger or cursor on the stage.
//
// createInputRouter({el, mallow, thoughts, onEmpty, onTouch}) →
//   { setWorld(fn|null), get active, destroy() }
// Routed pointer: { type:'down'|'move'|'up'|'cancel', id, x, y, t, vx, vy,
//   speed, pointerType, count }

export function createInputRouter({ el, mallow, thoughts = null, onEmpty = null, onTouch = null, maxPointers = 2 } = {}) {
  const owners = new Map();     // pointerId → { kind:'mallow'|'thought'|'world'|'empty', target, x, y, t, vx, vy }
  let world = null;

  const routed = (type, e, p) => ({
    type, id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now(),
    vx: p?.vx || 0, vy: p?.vy || 0, speed: Math.hypot(p?.vx || 0, p?.vy || 0), pointerType: e.pointerType || 'touch', count: owners.size,
  });
  function track(p, e) {
    const t = e.timeStamp || performance.now();
    const dt = Math.max(1, t - p.t) / 1000;
    const k = Math.min(1, dt / 0.12);              // EMA, τ ≈ 0.12 s
    p.vx += ((e.clientX - p.x) / dt - p.vx) * k;
    p.vy += ((e.clientY - p.y) / dt - p.vy) * k;
    p.x = e.clientX; p.y = e.clientY; p.t = t;
  }
  function gaze(e) {
    const b = mallow?.bodyRect?.();
    if (!b) return;
    mallow.lookAt?.((e.clientX - b.cx) / Math.max(120, innerWidth * 0.5), (e.clientY - b.cy) / Math.max(120, innerHeight * 0.5));
  }

  function deliver(p, type, e) {
    const r = routed(type, e, p);
    if (p.kind === 'mallow') mallow.pointer(r);
    else if (p.kind === 'thought') { thoughts?.pointer?.(p.target, r); gaze(e); }
    else if (p.kind === 'world') { try { world?.(r); } catch (err) { console.warn('[world input]', err); } gaze(e); }
    else { onEmpty?.(r); gaze(e); }
  }

  const down = (e) => {
    if (owners.size >= maxPointers) return;
    e.preventDefault();
    const x = e.clientX, y = e.clientY;
    const p = { kind: 'empty', target: null, x, y, t: e.timeStamp || performance.now(), vx: 0, vy: 0 };
    // a second finger on the Mallow is the Mallow's too when it reads several
    // (MallowTouch: two-finger stretch); the single-pointer rig gets one finger
    const mallowFree = ![...owners.values()].some((o) => o.kind === 'mallow');
    let th = null;
    if ((mallowFree || mallow?.multiTouch) && mallow?.hitTest?.(x, y)) p.kind = 'mallow';
    else if ((th = thoughts?.hitTest?.(x, y))) { p.kind = 'thought'; p.target = th; }
    else if (world) p.kind = 'world';
    owners.set(e.pointerId, p);
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic or already gone */ }
    deliver(p, 'down', e);
    onTouch?.({ kind: p.kind, type: 'down', x, y });
  };
  const move = (e) => {
    const p = owners.get(e.pointerId);
    if (!p) {                       // hover (mouse) or a finger we are not tracking: eyes only
      if (owners.size === 0) gaze(e);
      return;
    }
    const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
    for (const c of list && list.length ? list : [e]) { track(p, c); deliver(p, 'move', c); }
  };
  const up = (e) => {
    const p = owners.get(e.pointerId);
    if (!p) return;
    track(p, e);
    owners.delete(e.pointerId);
    deliver(p, e.type === 'pointercancel' ? 'cancel' : 'up', e);
    onTouch?.({ kind: p.kind, type: 'up', x: e.clientX, y: e.clientY });
  };
  const noGesture = (e) => e.preventDefault();

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
  el.addEventListener('contextmenu', noGesture);
  document.addEventListener('gesturestart', noGesture);   // iOS Safari pinch-zoom
  document.body.classList.add('hf-active');

  return {
    /** The Hushflow director's world input (or null while no world runs). */
    setWorld(fn) { world = typeof fn === 'function' ? fn : null; },
    get active() { return owners.size; },
    get owners() { return [...owners.values()].map((o) => o.kind); },
    destroy() {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up);
      el.removeEventListener('contextmenu', noGesture);
      document.removeEventListener('gesturestart', noGesture);
      document.body.classList.remove('hf-active');
      owners.clear();
    },
  };
}
