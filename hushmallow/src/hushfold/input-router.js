// The Hushfold's one input router, on #fx-layer (touch-action:none).
//
// Every touch on the stage lands here first and goes to exactly one owner,
// in priority order: the hero Mallow (stageMallow.hitTest; both fingers when
// stageMallow.multiTouch) → a Thought Mallow
// → the current world (the Hushflow director's handler) → empty space.
// While a world that owns the thoughts runs (setWorld(fn, {thoughts: true})),
// a touch on a Thought Mallow goes to the world, which hands it to the thought
// itself (the director forwards it to thought.pointer).
// Up to two pointers are tracked, with coalesced moves and a smoothed
// velocity. The Mallow's eyes follow any finger or cursor on the stage.
// ctrl + wheel over the Mallow (a desktop trackpad pinch) goes to mallow.wheel.
//
// A touch that began on a Thought Mallow's words (a DOM button above the stage) is handed over by the
// ThoughtLayer once it shows what it is: adopt(e, { kind: 'stroke' }) makes it the stage's from where it began —
// the world's stroke (the storm stirs, the sea swells) or empty space, never the thought's or the Mallow's;
// adopt(e, { kind: 'hold', thought }) — a deliberate hold on the words — carries that thought, as if the finger
// had taken it by its body (the world's, when the world owns the thoughts). The router captures the pointer.
//
// createInputRouter({el, mallow, thoughts, onEmpty, onTouch}) →
//   { setWorld(fn|null, {thoughts}), adopt(e, {kind, from, thought}), get active, get owners, get worldOwnsThoughts, destroy() }
// Routed pointer: { type:'down'|'move'|'up'|'cancel', id, x, y, t, vx, vy,
//   speed, pointerType, count, shift (Shift held: a mouse Shift-drag stretches
//   the Mallow), mouse (pointerType 'mouse') }
// Routed wheel (to mallow.wheel): { x, y, deltaY, t } (t in ms, the event clock)

export function createInputRouter({ el, mallow, thoughts = null, onEmpty = null, onTouch = null, maxPointers = 2 } = {}) {
  const owners = new Map();     // pointerId → { kind:'mallow'|'thought'|'world'|'empty', target, x, y, t, vx, vy }
  let world = null;
  let worldOwnsThoughts = false;   // setWorld(fn, {thoughts: true}): Thought Mallow hits go to the world

  // (dx, dy: a hold adopted from a thought's words is felt on the thought's body, the finger's moves as they are)
  const routed = (type, e, p) => ({
    type, id: e.pointerId, x: e.clientX + (p?.dx || 0), y: e.clientY + (p?.dy || 0), t: e.timeStamp || performance.now(),
    vx: p?.vx || 0, vy: p?.vy || 0, speed: Math.hypot(p?.vx || 0, p?.vy || 0), pointerType: e.pointerType || 'touch', count: owners.size,
    shift: !!e.shiftKey, mouse: e.pointerType === 'mouse',
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
    else if (!worldOwnsThoughts && (th = thoughts?.hitTest?.(x, y))) { p.kind = 'thought'; p.target = th; }
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
  // a desktop trackpad pinch arrives as ctrl + wheel: over the Mallow it stretches the
  // Mallow (MallowTouch), never the page; a pinch already under way keeps going
  const wheel = (e) => {
    if (!e.ctrlKey || typeof mallow?.wheel !== 'function') return;
    const x = e.clientX, y = e.clientY;
    const over = !!mallow.hitTest?.(x, y);
    if (over) e.preventDefault();
    const took = mallow.wheel({ x, y, deltaY: e.deltaY, t: e.timeStamp || performance.now() });
    if (took && !over) e.preventDefault();
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
  el.addEventListener('contextmenu', noGesture);
  el.addEventListener('wheel', wheel, { passive: false });
  document.addEventListener('gesturestart', noGesture);   // iOS Safari pinch-zoom
  document.body.classList.add('hf-active');

  return {
    /**
     * The Hushflow director's world input (or null while no world runs). With
     * {thoughts: true} the world owns the Thought Mallows: a touch on one goes to the
     * world, which forwards it to the thought itself.
     */
    setWorld(fn, opts = {}) {
      world = typeof fn === 'function' ? fn : null;
      worldOwnsThoughts = !!world && !!opts?.thoughts;
    },
    /**
     * Take a touch that began above the stage, on a Thought Mallow's words (the ThoughtLayer's onTagGesture), from here
     * on. kind 'stroke': it is the world's (or empty space's) from `from`, where it began — never the Mallow's or a
     * thought's, though it began over the words. kind 'hold': it carries `thought`, shifted onto its body. True when taken.
     */
    adopt(e, { kind = 'stroke', from = null, thought = null } = {}) {
      if (!e || e.pointerId == null || owners.has(e.pointerId) || owners.size >= maxPointers) return false;
      const x0 = Number.isFinite(from?.x) ? from.x : e.clientX, y0 = Number.isFinite(from?.y) ? from.y : e.clientY;
      const t0 = Number.isFinite(from?.t) ? from.t : (e.timeStamp || performance.now());
      const p = { kind: 'empty', target: null, x: x0, y: y0, t: t0, vx: 0, vy: 0, dx: 0, dy: 0 };
      if (kind === 'hold') {
        if (!thought || !Number.isFinite(thought.x) || !Number.isFinite(thought.y)) return false;
        p.dx = thought.x - x0; p.dy = thought.y - y0;
        if (worldOwnsThoughts && world) p.kind = 'world';
        else { p.kind = 'thought'; p.target = thought; }
      } else if (world) p.kind = 'world';
      owners.set(e.pointerId, p);
      // the rest of this touch comes here, not to the words
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic or already gone */ }
      deliver(p, 'down', { pointerId: e.pointerId, clientX: x0, clientY: y0, timeStamp: t0, pointerType: e.pointerType || 'touch', shiftKey: false });
      onTouch?.({ kind: p.kind, type: 'down', x: x0, y: y0 });
      if (kind !== 'hold') { track(p, e); deliver(p, 'move', e); }
      return true;
    },
    get worldOwnsThoughts() { return worldOwnsThoughts; },
    get active() { return owners.size; },
    get owners() { return [...owners.values()].map((o) => o.kind); },
    destroy() {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up);
      el.removeEventListener('contextmenu', noGesture);
      el.removeEventListener('wheel', wheel);
      document.removeEventListener('gesturestart', noGesture);
      document.body.classList.remove('hf-active');
      owners.clear();
    },
  };
}
