// Pointer routing for Phase 3 stages: two primitives that sit in front of the
// Companion's own gesture binding (Pocket Hush keeps its inline router).
//
//   routePointers  claims a pointer before the Companion sees it (a cloud you
//                  drag, a light you carry): capture phase, stops propagation,
//                  captures the pointer, reports position and velocity.
//   watchPresses   watches for a long press off the Mallow without taking
//                  anything from it: passive, never stops or prevents.
//
// Both drop everything on blur, pagehide and hidden, and dispose() removes
// every listener and timer. DOM only, and nothing runs at import time.

export const defaultSkip = (e) => !!e.target?.closest?.('button, input, select, textarea, a, .topbar, .bottom, .sheet, .sheet-scrim, .end-card');

const STALE_MS = 90;   // no move for this long before up: the pointer was resting, so no fling

/**
 * Claim off-body pointers on `el` (positions relative to `stage`).
 * claim(p, e) → { move(p, v, e), up(p, v, e), cancel() } | null; return null to let the pointer through.
 * p = {x, y} and v = {vx, vy} (px/s, smoothed) are reused per pointer: copy them to keep them.
 * @returns {{dispose():void, cancelAll():void, readonly active:number}}
 */
export function routePointers(el, { stage = el, skip = defaultSkip, claim }) {
  const owned = new Map();   // pointerId → { h, p, v, t }
  const local = (e, p) => { const r = stage.getBoundingClientRect(); p.x = e.clientX - r.left; p.y = e.clientY - r.top; return p; };

  const onDown = (e) => {
    if (e.button > 0 || skip(e)) return;
    const p = local(e, { x: 0, y: 0 });
    const h = claim(p, e);
    if (!h) return;
    owned.get(e.pointerId)?.h.cancel?.();   // an id whose end we never saw
    owned.set(e.pointerId, { h, p, v: { vx: 0, vy: 0 }, t: performance.now() });
    e.stopPropagation(); e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
  };
  const onMove = (e) => {
    const o = owned.get(e.pointerId);
    if (!o) return;
    const now = performance.now(), dt = Math.max(8, now - o.t), x0 = o.p.x, y0 = o.p.y;
    local(e, o.p);
    o.v.vx = o.v.vx * 0.5 + (o.p.x - x0) / dt * 1000 * 0.5;
    o.v.vy = o.v.vy * 0.5 + (o.p.y - y0) / dt * 1000 * 0.5;
    o.t = now;
    o.h.move?.(o.p, o.v, e);
    e.stopPropagation();
  };
  const onUp = (e) => {
    const o = owned.get(e.pointerId);
    if (!o) return;
    owned.delete(e.pointerId);
    local(e, o.p);
    if (performance.now() - o.t > STALE_MS) { o.v.vx = 0; o.v.vy = 0; }
    o.h.up?.(o.p, o.v, e);
    e.stopPropagation();
  };
  // pointercancel, or el lost the capture before the pointer ended (an ended one is already
  // forgotten). A child losing its implicit touch capture to el bubbles here too: not a cancel.
  const onCancel = (e) => {
    if (e.type === 'lostpointercapture' && e.target !== el) return;
    const o = owned.get(e.pointerId);
    if (!o) return;
    owned.delete(e.pointerId);
    o.h.cancel?.();
    e.stopPropagation();
  };
  const cancelAll = () => {
    const list = [...owned];
    owned.clear();
    for (const [id, o] of list) {
      try { el.releasePointerCapture(id); } catch { /* not captured */ }
      o.h.cancel?.();
    }
  };
  const onVis = () => { if (document.hidden) cancelAll(); };

  const evs = [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onCancel], ['lostpointercapture', onCancel]];
  for (const [ev, fn] of evs) el.addEventListener(ev, fn, true);
  addEventListener('blur', cancelAll);
  addEventListener('pagehide', cancelAll);
  document.addEventListener('visibilitychange', onVis);

  return {
    /** Cancels any claimed pointer, then removes every listener. */
    dispose() {
      cancelAll();
      for (const [ev, fn] of evs) el.removeEventListener(ev, fn, true);
      removeEventListener('blur', cancelAll);
      removeEventListener('pagehide', cancelAll);
      document.removeEventListener('visibilitychange', onVis);
    },
    cancelAll,
    /** Number of pointers claimed right now. */
    get active() { return owned.size; },
  };
}

/**
 * Long presses off the Mallow on `el` (positions relative to `stage`), watched
 * passively in the capture phase: the Companion still gets every event.
 *   onDown(e)              every pointerdown, chrome included (wake the UI)
 *   onBody(p, e) → bool    true: on the Mallow, not a candidate
 *   onPress(p0, id)        held ≥ ms without moving more than slop
 *   onRelease(id)          a press ended (up, cancel, blur, hidden)
 *   onTap(p, id)           a candidate lifted before ms, within slop
 * @returns {{dispose():void, releaseAll():void, readonly pressing:number}}
 */
export function watchPresses(el, { stage = el, skip = defaultSkip, onBody = () => false, ms = 300, slop = 12,
  onDown = null, onPress, onRelease = null, onTap = null }) {
  const cands = new Map();     // pointerId → { p0, p, timer }
  const presses = new Set();   // pointerIds pressing
  const opt = { capture: true, passive: true };
  const local = (e, p) => { const r = stage.getBoundingClientRect(); p.x = e.clientX - r.left; p.y = e.clientY - r.top; return p; };
  const far = (c) => Math.hypot(c.p.x - c.p0.x, c.p.y - c.p0.y) > slop;
  const drop = (id) => { const c = cands.get(id); if (c) { clearTimeout(c.timer); cands.delete(id); } return c; };

  const down = (e) => {
    onDown?.(e);
    if (e.button !== 0 || skip(e)) return;
    const id = e.pointerId, p0 = local(e, { x: 0, y: 0 });
    if (onBody(p0, e)) return;
    drop(id);
    const c = { p0, p: { x: p0.x, y: p0.y }, timer: 0 };
    c.timer = setTimeout(() => {
      if (cands.get(id) !== c) return;
      cands.delete(id);
      presses.add(id);
      onPress?.(c.p0, id);
    }, ms);
    cands.set(id, c);
  };
  const move = (e) => {
    const c = cands.get(e.pointerId);
    if (!c) return;
    local(e, c.p);
    if (far(c)) drop(e.pointerId);   // a press that already started is not cancelled by moving
  };
  const up = (e) => {
    const id = e.pointerId;
    if (presses.delete(id)) { onRelease?.(id); return; }
    const c = drop(id);
    if (!c || e.type !== 'pointerup') return;   // a cancelled pointer is not a tap
    local(e, c.p);
    if (!far(c)) onTap?.(c.p, id);
  };
  const releaseAll = () => {
    for (const id of [...cands.keys()]) drop(id);
    const list = [...presses];
    presses.clear();
    for (const id of list) onRelease?.(id);
  };
  const onVis = () => { if (document.hidden) releaseAll(); };

  const evs = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up]];
  for (const [ev, fn] of evs) el.addEventListener(ev, fn, opt);
  addEventListener('blur', releaseAll);
  addEventListener('pagehide', releaseAll);
  document.addEventListener('visibilitychange', onVis);

  return {
    /** Releases any press (onRelease fires), drops candidates and timers, removes every listener. */
    dispose() {
      releaseAll();
      for (const [ev, fn] of evs) el.removeEventListener(ev, fn, opt);
      removeEventListener('blur', releaseAll);
      removeEventListener('pagehide', releaseAll);
      document.removeEventListener('visibilitychange', onVis);
    },
    releaseAll,
    /** Number of presses in progress. */
    get pressing() { return presses.size; },
  };
}
