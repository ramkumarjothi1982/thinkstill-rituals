// Gesture Engine — turns raw pointers into Mallow gestures.
//
// GestureRecognizer is a pure state machine (no DOM, testable in Node): feed it
// down / move / up / cancel / tick with timestamps in ms and a per-pointer
// `onBody` flag, and it emits semantic events through `emit(type, data)`:
//
//   contact      {x, y, onBody}                 any pointer went down
//   tap          {x, y, streak, interval, steady}  short light touch on the body (emitted at once)
//   doubletap    {x, y}                         second tap inside DOUBLE_MS (upgrades the tap)
//   holdstart    {x, y}                         finger rested on the body for HOLD_MS
//   holding      {x, y, dur}                    every tick while held
//   holdend      {x, y, dur}
//   dragstart    {x0, y0, x, y}                 finger grabbed the body and moved
//   drag         {x, y, dx, dy, vx, vy}
//   dragend      {x, y, dx, dy, vx, vy, dur, fling, converted}  release (fling = fast let-go)
//   strokestart  {x, y}                         a petting motion (back-and-forth, or sweeping onto the body)
//   stroke       {x, y, vx, vy, speed, dist}
//   strokeend    {dur, dist}
//   squeezestart {cx, cy, angle, d0}            two fingers down
//   squeeze      {amount, cx, cy, angle}        amount > 0 pinched in, < 0 spread apart
//   squeezeend   {amount}
//
// Positions are whatever units the caller uses (CSS px in the lab).

export const GESTURE_DEFAULTS = {
  TAP_MS: 280,          // a typical quick tap (still presses up to HOLD_MS also count, so slow taps get an answer)
  TAP_SLOP: 12,         // max travel for a tap / hold
  DOUBLE_MS: 320,       // second tap within this → doubletap
  HOLD_MS: 480,         // rest this long → hold
  HOLD_BREAK: 26,       // travel that turns a hold into a drag
  DRAG_SLOP: 9,         // travel that starts a drag
  STROKE_PATH: 150,     // min path length before back-and-forth counts as stroking
  STROKE_RATIO: 2.3,    // path / net displacement that marks back-and-forth
  FLING_SPEED: 900,     // px/s at release to count as a fling
  STREAK_MS: 900,       // taps closer than this form a streak (rhythm)
};

export class GestureRecognizer {
  constructor(emit, opts = {}) {
    this.emit = emit;
    this.o = { ...GESTURE_DEFAULTS, ...opts };
    this.p = new Map();       // pointerId → state
    this.mode = 'idle';       // idle | single | squeeze | dead
    this.lastTap = null;      // {t, x, y}
    this.streak = [];         // recent tap times
    this.sq = null;
  }

  down(id, x, y, t, onBody) {
    const s = { id, x0: x, y0: y, x, y, t0: t, lt: t, lx: x, ly: y, vx: 0, vy: 0, path: 0, onBody, startedOnBody: onBody, state: 'pending', holdT: 0 };
    this.p.set(id, s);
    this.emit('contact', { x, y, onBody });
    if (this.p.size === 2 && this.mode !== 'squeeze') {
      // a second finger: whatever the first was doing becomes a squeeze
      for (const o of this.p.values()) if (o !== s) this._endSingle(o, t, true);
      this._startSqueeze(t);
      return;
    }
    if (this.p.size > 2) return;
    if (this.p.size === 1) this.mode = 'single';
  }

  move(id, x, y, t, onBody) {
    const s = this.p.get(id);
    if (!s) return;
    const dt = Math.max(1, t - s.lt);
    const ivx = (x - s.lx) / dt * 1000, ivy = (y - s.ly) / dt * 1000;
    s.vx += (ivx - s.vx) * 0.45; s.vy += (ivy - s.vy) * 0.45;
    s.path += Math.hypot(x - s.lx, y - s.ly);
    s.lx = x; s.ly = y; s.lt = t; s.x = x; s.y = y;
    const wasOn = s.onBody;
    s.onBody = onBody;
    if (this.mode === 'squeeze') { this._updateSqueeze(); return; }
    if (this.mode !== 'single') return;
    const travel = Math.hypot(x - s.x0, y - s.y0);
    const o = this.o;
    switch (s.state) {
      case 'pending':
        if (!s.startedOnBody) {
          // sweeping onto the Mallow from outside is petting, never grabbing
          if (onBody && !wasOn && s.path > o.DRAG_SLOP) this._startStroke(s);
        } else if (travel > o.DRAG_SLOP) {
          s.state = 'drag';
          this.emit('dragstart', { x0: s.x0, y0: s.y0, x, y });
          this.emit('drag', this._dragData(s));
        }
        break;
      case 'hold':
        if (travel > o.HOLD_BREAK) {
          this.emit('holdend', { x, y, dur: t - s.holdT });
          s.state = 'drag';
          this.emit('dragstart', { x0: s.x0, y0: s.y0, x, y });
          this.emit('drag', this._dragData(s));
        }
        break;
      case 'drag': {
        if (s.path > o.STROKE_PATH && s.path > o.STROKE_RATIO * travel) {
          this.emit('dragend', { ...this._dragData(s), dur: t - s.t0, fling: false, converted: true });
          this._startStroke(s);
        } else this.emit('drag', this._dragData(s));
        break;
      }
      case 'stroke':
        if (onBody) this.emit('stroke', { x, y, vx: s.vx, vy: s.vy, speed: Math.hypot(s.vx, s.vy), dist: s.path });
        break;
      default: break;
    }
  }

  up(id, x, y, t) {
    const s = this.p.get(id);
    if (!s) return;
    if (x != null) { s.x = x; s.y = y; }
    if (this.mode === 'squeeze') {
      this.emit('squeezeend', { amount: this.sq?.amount || 0 });
      this.sq = null;
      this.p.delete(id);
      this.mode = this.p.size ? 'dead' : 'idle';
      for (const o of this.p.values()) o.state = 'dead';
      return;
    }
    this.p.delete(id);
    if (this.mode === 'dead') { if (!this.p.size) this.mode = 'idle'; return; }
    this._endSingle(s, t, false);
    if (!this.p.size) this.mode = 'idle';
  }

  cancel(id, t) {
    const s = this.p.get(id);
    if (!s) return;
    if (this.mode === 'squeeze') { this.up(id, null, null, t); return; }
    this.p.delete(id);
    this._endSingle(s, t, true);
    if (!this.p.size) this.mode = 'idle';
  }

  /** Call every frame: detects holds that begin without movement. */
  tick(t) {
    if (this.mode !== 'single') return;
    for (const s of this.p.values()) {
      if (s.state === 'pending' && s.startedOnBody && t - s.t0 >= this.o.HOLD_MS && Math.hypot(s.x - s.x0, s.y - s.y0) <= this.o.TAP_SLOP) {
        s.state = 'hold'; s.holdT = t;
        this.emit('holdstart', { x: s.x, y: s.y });
      } else if (s.state === 'hold') {
        this.emit('holding', { x: s.x, y: s.y, dur: t - s.holdT });
      }
    }
  }

  // ------------------------------------------------------------------------
  _dragData(s) { return { x: s.x, y: s.y, dx: s.x - s.x0, dy: s.y - s.y0, vx: s.vx, vy: s.vy }; }

  _startStroke(s) {
    s.state = 'stroke'; s.strokeT = s.lt; s.strokePath0 = s.path;
    this.emit('strokestart', { x: s.x, y: s.y });
  }

  _endSingle(s, t, cancelled) {
    const o = this.o;
    const travel = Math.hypot(s.x - s.x0, s.y - s.y0);
    // a pause before letting go means no fling, whatever the last velocity was
    const stale = t - s.lt > 90;
    const vx = stale ? 0 : s.vx, vy = stale ? 0 : s.vy;
    switch (s.state) {
      case 'pending':
        // any still press shorter than a hold is a tap: deliberate, slow taps count too
        if (!cancelled && s.startedOnBody && t - s.t0 < o.HOLD_MS && travel <= o.TAP_SLOP) this._tap(s, t);
        break;
      case 'hold': this.emit('holdend', { x: s.x, y: s.y, dur: t - s.holdT }); break;
      case 'drag':
        this.emit('dragend', { ...this._dragData(s), vx, vy, dur: t - s.t0, fling: !cancelled && Math.hypot(vx, vy) > o.FLING_SPEED, converted: false, cancelled });
        break;
      case 'stroke': this.emit('strokeend', { dur: t - (s.strokeT ?? s.t0), dist: s.path - (s.strokePath0 || 0) }); break;
      default: break;
    }
    s.state = 'done';
  }

  _tap(s, t) {
    const o = this.o;
    this.streak = this.streak.filter((x) => t - x < o.STREAK_MS * 4);
    const prev = this.streak[this.streak.length - 1];
    if (prev != null && t - prev > o.STREAK_MS) this.streak = [];
    this.streak.push(t);
    const iv = [];
    for (let i = 1; i < this.streak.length; i++) iv.push(this.streak[i] - this.streak[i - 1]);
    const mean = iv.length ? iv.reduce((a, b) => a + b, 0) / iv.length : 0;
    const dev = iv.length > 1 ? Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length) : Infinity;
    const steady = iv.length >= 3 && dev < mean * 0.18;
    if (this.lastTap && t - this.lastTap.t <= o.DOUBLE_MS && Math.hypot(s.x - this.lastTap.x, s.y - this.lastTap.y) < 60) {
      this.lastTap = null;
      this.emit('doubletap', { x: s.x, y: s.y });
      return;
    }
    this.lastTap = { t, x: s.x, y: s.y };
    this.emit('tap', { x: s.x, y: s.y, streak: this.streak.length, interval: mean, steady });
  }

  _pair() { const [a, b] = [...this.p.values()]; return [a, b]; }

  _startSqueeze() {
    const [a, b] = this._pair();
    const d0 = Math.max(24, Math.hypot(b.x - a.x, b.y - a.y));
    this.mode = 'squeeze';
    for (const s of this.p.values()) s.state = 'squeeze';
    this.sq = { d0, amount: 0 };
    this.emit('squeezestart', { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, angle: Math.atan2(b.y - a.y, b.x - a.x), d0 });
  }

  _updateSqueeze() {
    const [a, b] = this._pair();
    if (!a || !b || !this.sq) return;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const amount = Math.max(-1, Math.min(1, (this.sq.d0 - d) / this.sq.d0));
    this.sq.amount = amount;
    this.emit('squeeze', { amount, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, angle: Math.atan2(b.y - a.y, b.x - a.x) });
  }
}

/**
 * Wire a recognizer to a DOM element with Pointer Events.
 * @param {HTMLElement} el
 * @param {{hitTest:(x:number,y:number)=>boolean, onGesture:(type:string,data:object)=>void, onWheel?:(dy:number,x:number,y:number)=>void}} o
 * @returns {{recognizer: GestureRecognizer, tick:(t:number)=>void, dispose:()=>void}}
 */
export function bindGestures(el, o) {
  const rec = new GestureRecognizer(o.onGesture, o.options);
  // one clock for pointer events and frame ticks: event timeStamps record when
  // the OS created the event, so on a janky frame they lag the rAF clock and a
  // quick tap could be mistaken for a hold
  const now = () => performance.now();
  const local = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => {
    if (e.button > 0) return;
    const [x, y] = local(e);
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
    rec.down(e.pointerId, x, y, now(), o.hitTest(x, y));
    e.preventDefault();
  };
  const move = (e) => {
    if (!rec.p.has(e.pointerId)) { o.onHover?.(...local(e)); return; }
    const [x, y] = local(e);
    rec.move(e.pointerId, x, y, now(), o.hitTest(x, y));
  };
  const up = (e) => { const [x, y] = local(e); rec.up(e.pointerId, x, y, now()); };
  const cancel = (e) => rec.cancel(e.pointerId, now());
  // touch pointers 'leave' as they lift; only a mouse leaving means stop looking at it
  const leave = (e) => { if (e.pointerType === 'mouse' && !rec.p.has(e.pointerId)) o.onHover?.(null, null); };
  const noMenu = (e) => e.preventDefault();
  // iOS Safari still scrolls / zooms on touchmove unless it is cancelled here
  const noScroll = (e) => { if (e.cancelable) e.preventDefault(); };
  const wheel = (e) => { if (!o.onWheel) return; e.preventDefault(); const [x, y] = local(e); o.onWheel(e.deltaY, x, y); };
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('contextmenu', noMenu);
  el.addEventListener('touchmove', noScroll, { passive: false });
  el.addEventListener('wheel', wheel, { passive: false });
  return {
    recognizer: rec,
    tick: () => rec.tick(now()),
    dispose() {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('contextmenu', noMenu);
      el.removeEventListener('touchmove', noScroll);
      el.removeEventListener('wheel', wheel);
    },
  };
}
