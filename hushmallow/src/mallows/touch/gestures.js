// TouchReader — turns raw pointers into squeeze gestures.
//
// iPhones report no usable pressure (Touch.force is 0 on iPhone 11 and later,
// PointerEvent.pressure a constant 0.5), so squeeze depth is read from how
// long and how restlessly a finger stays down:
//   depth = 1 − e^(−held / 0.45 s)  (+ up to 0.15 for kneading: path in the last 300 ms / 40 px)
// Everything else comes from position, speed and two-finger distance:
//   pull      moved > 10 px from touch-down while held
//   stretch   two fingers on the body: ratio d / d0 in [0.6, 1.6], axis, twist
//   flick     released faster than 900 px/s after > 24 px (last 80 ms; a pause before letting go = no flick)
//   jiggle    ≥ 3 velocity reversals on the dominant axis within 600 ms, > 250 px/s, < 60 px amplitude
//   massage   circling 12–80 px around its own centre, ≥ 1.5π of turning in 1.8 s (a gentle
//             0.4 turn/s counts), ≥ 80 % one way
//   stroke    moving within 0.25 s of touch-down, path > 60 px, 80–600 px/s, chord / path > 0.7
//   tap       held < 0.35 s and moved < 14 px; a second within 0.33 s is a double tap
// Mouse and trackpad: Shift-drag stretches (two virtual fingers either side of
// the press), ctrl+wheel (trackpad pinch) stretches around the cursor.
// Keyboard: Enter/Space tap, holding Space squeezes, arrow keys pull.
//
// Pure: feed it {type, id, x, y, t} (CSS px, seconds); no DOM needed, so the
// gesture rules are unit-tested in Node.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
const HIST = 128;

export const GESTURE = Object.freeze({
  holdTau: 0.45, kneadPx: 40, kneadMax: 0.15,
  pullStartPx: 10, pullFullPx: 40,
  flickSpeed: 900, flickDist: 24, releaseWindow: 0.08,
  tapHeld: 0.35, tapDist: 14, doubleWindow: 0.33,
  jiggleWindow: 0.6, jiggleReversals: 3, jiggleSpeed: 250, jiggleAmp: 60,
  massageWindow: 1.8, massageRmin: 12, massageRmax: 80, massageTurn: 1.5 * Math.PI, massageSame: 0.8,
  strokeStart: 0.25, strokePath: 60, strokeVmin: 80, strokeVmax: 600, strokeStraight: 0.7,
  stretchMin: 0.6, stretchMax: 1.6,
});

class Ptr {
  constructor(id, x, y, t, virtual = false) {
    this.id = id; this.virtual = virtual;
    this.x0 = x; this.y0 = y; this.t0 = t;
    this.x = x; this.y = y; this.t = t;
    this.vx = 0; this.vy = 0;
    this.path = 0; this.maxDist = 0;
    this.hist = new Float64Array(HIST * 3); this.hn = 0; this.hi = 0;
    this.pull = 0; this.depth = 0;
    this.stroked = false; this.strokeDir = 0;
    this.massage = null;      // {turns, dir, rate}
    this.lastJiggle = -1;
    this.firstMoveT = -1;
    this.push(t, x, y);
  }
  push(t, x, y) {
    const o = this.hi * 3;
    this.hist[o] = t; this.hist[o + 1] = x; this.hist[o + 2] = y;
    this.hi = (this.hi + 1) % HIST; this.hn = Math.min(HIST, this.hn + 1);
  }
  // iterate history newest → oldest while fn returns true
  each(fn) {
    for (let n = 0; n < this.hn; n++) {
      const o = ((this.hi - 1 - n + HIST) % HIST) * 3;
      if (fn(this.hist[o], this.hist[o + 1], this.hist[o + 2]) === false) return;
    }
  }
}

export class TouchReader {
  /**
   * @param {object} o
   * @param {(x:number,y:number)=>boolean} [o.hit]  is (x, y) on the body (CSS px)
   * @param {()=>number} [o.bodySize]  body width in CSS px (virtual fingers, thresholds)
   * @param {()=>{x:number,y:number}} [o.centre]  body centre (keyboard)
   */
  constructor(o = {}) {
    this.hit = o.hit || (() => true);
    this.bodySize = o.bodySize || (() => 240);
    this.centre = o.centre || (() => ({ x: 0, y: 0 }));
    this.ptrs = new Map();
    this.listeners = {};
    this.lastTap = null;       // {t, x, y}
    this.pendingTap = null;
    this.stretch = null;       // {a, b, d0, ang0, s, ang, twist}
    this._wheel = null;
    this.keys = { space: null, arrows: new Set() };
    this.t = 0;
  }

  on(kind, fn) { (this.listeners[kind] ||= []).push(fn); return this; }
  off(kind, fn) { const l = this.listeners[kind]; if (l) l.splice(l.indexOf(fn) >>> 0, 1); }
  _emit(kind, data) { for (const fn of this.listeners[kind] || []) fn(data); for (const fn of this.listeners['*'] || []) fn(kind, data); }

  get active() { return this.ptrs.size > 0; }
  get pointers() { return [...this.ptrs.values()]; }

  // ------------------------------------------------------------ input --
  /** e: {type:'down'|'move'|'up'|'cancel', id, x, y, t, shift?, mouse?} */
  pointer(e) {
    if (!e || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return false;
    const t = Number.isFinite(e.t) ? e.t : this.t;
    this.t = Math.max(this.t, t);
    if (e.type === 'down') return this._down(e, t);
    const p = this.ptrs.get(e.id);
    if (e.type === 'move') {
      if (this._shift && this._shift.src === e.id) { this._shiftMove(e, t); return true; }
      if (p) this._move(p, e.x, e.y, t);
      return !!p;
    }
    if (e.type === 'up' || e.type === 'cancel') {
      if (this._shift && this._shift.src === e.id) { this._shiftEnd(t); return true; }
      if (p) this._up(p, t, e.type === 'cancel');
      return !!p;
    }
    return false;
  }

  _down(e, t) {
    if (this.ptrs.size >= 2 || this.ptrs.has(e.id)) return false;
    if (!this.hit(e.x, e.y)) return false;
    if (e.shift && e.mouse) { this._shiftStart(e, t); return true; }
    const p = new Ptr(e.id, e.x, e.y, t, !!e.virtual);
    this.ptrs.set(e.id, p);
    this._emit('down', { id: p.id, x: p.x, y: p.y, t, count: this.ptrs.size });
    if (this.ptrs.size === 2) this._stretchStart(t);
    return true;
  }

  _move(p, x, y, t) {
    const dt = Math.max(1e-3, t - p.t);
    const dx = x - p.x, dy = y - p.y;
    const step = Math.hypot(dx, dy);
    if (step < 1e-6 && dt < 0.004) return;
    // velocity: light smoothing, coalesced events arrive in bursts
    const k = clamp(dt / 0.03, 0.25, 1);
    p.vx += (dx / dt - p.vx) * k; p.vy += (dy / dt - p.vy) * k;
    p.x = x; p.y = y; p.t = t;
    p.path += step;
    const dist = Math.hypot(x - p.x0, y - p.y0);
    p.maxDist = Math.max(p.maxDist, dist);
    if (p.firstMoveT < 0 && dist > 3) p.firstMoveT = t;
    p.push(t, x, y);
    this._detectMotion(p, t);
    this._emit('move', { id: p.id, x, y, t, vx: p.vx, vy: p.vy });
  }

  _up(p, t, cancelled) {
    this.ptrs.delete(p.id);
    const G = GESTURE;
    const held = t - p.t0;
    const dist = Math.hypot(p.x - p.x0, p.y - p.y0);
    // release velocity over the last 80 ms; a pause before letting go → none
    let vx = 0, vy = 0;
    if (t - p.t <= G.releaseWindow) {
      let ox = p.x, oy = p.y, ot = p.t;
      p.each((ht, hx, hy) => { if (p.t - ht > G.releaseWindow) return false; ox = hx; oy = hy; ot = ht; return true; });
      const span = p.t - ot;
      if (span > 0.012) { vx = (p.x - ox) / span; vy = (p.y - oy) / span; } else { vx = p.vx; vy = p.vy; }
    }
    const speed = Math.hypot(vx, vy);
    const info = { id: p.id, x: p.x, y: p.y, t, held, dist, vx, vy, speed, depth: p.depth, pull: p.pull, maxDist: p.maxDist, cancelled };
    if (this.stretch && (this.stretch.a === p.id || this.stretch.b === p.id)) this._stretchEnd(t);
    let kind = 'release';
    if (!cancelled) {
      if (speed > G.flickSpeed && dist > G.flickDist) kind = 'flick';
      else if (held < G.tapHeld && p.maxDist < G.tapDist) {
        if (this.lastTap && t - this.lastTap.t < G.doubleWindow && Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 40) {
          kind = 'doubleTap'; this.lastTap = null; this.pendingTap = null;
        } else {
          kind = 'tapStart';
          this.lastTap = { t, x: p.x, y: p.y };
          this.pendingTap = { t, x: p.x, y: p.y, id: p.id };
        }
      }
    }
    info.kind = kind;
    this._emit('up', info);
    if (kind === 'flick') this._emit('flick', info);
    if (kind === 'doubleTap') this._emit('doubleTap', info);
    if (p.massage) this._emit('massageEnd', { id: p.id, turns: p.massage.turns, dir: p.massage.dir, t });
  }

  // ----------------------------------------------------------- motion --
  _detectMotion(p, t) {
    const G = GESTURE;
    const dist = Math.hypot(p.x - p.x0, p.y - p.y0);
    // pull grows once past 10 px
    p.pull = clamp((dist - G.pullStartPx) / (G.pullFullPx - G.pullStartPx), 0, 1);
    // stroke: a quick, straight-ish swipe that starts moving right away
    if (!p.stroked && p.firstMoveT >= 0 && p.firstMoveT - p.t0 < G.strokeStart && p.path > G.strokePath) {
      const dur = Math.max(0.016, t - p.t0);
      const speed = p.path / dur;
      if (speed > G.strokeVmin && speed < G.strokeVmax * 1.6 && dist / p.path > G.strokeStraight) {
        p.stroked = true;
        const dx = p.x - p.x0, dy = p.y - p.y0;
        p.strokeDir = Math.atan2(dy, dx);
        this._emit('stroke', { id: p.id, x: p.x, y: p.y, t, dir: p.strokeDir, dx: dx / dist, dy: dy / dist, speed });
      }
    }
    this._detectJiggle(p, t);
    this._detectMassage(p, t);
  }

  _detectJiggle(p, t) {
    const G = GESTURE;
    // dominant axis over the window
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, n = 0;
    p.each((ht, hx, hy) => { if (t - ht > G.jiggleWindow) return false; x0 = Math.min(x0, hx); x1 = Math.max(x1, hx); y0 = Math.min(y0, hy); y1 = Math.max(y1, hy); n++; return true; });
    if (n < 6) return;
    const horiz = x1 - x0 >= y1 - y0;
    const amp = horiz ? x1 - x0 : y1 - y0;
    if (amp > G.jiggleAmp * 2 || amp < 6) return;
    let rev = 0, lastSign = 0, px = null, pt = 0, fast = 0, segs = 0;
    p.each((ht, hx, hy) => {
      if (t - ht > G.jiggleWindow) return false;
      const c = horiz ? hx : hy;
      if (px !== null) {
        const d = px - c, dt = pt - ht;
        if (Math.abs(d) > 0.5 && dt > 0) {
          const s = Math.sign(d);
          if (lastSign && s !== lastSign) rev++;
          lastSign = s;
          segs++;
          if (Math.abs(d) / dt > G.jiggleSpeed) fast++;
        }
      }
      px = c; pt = ht;
      return true;
    });
    if (rev >= G.jiggleReversals && fast >= segs * 0.4 && t - p.lastJiggle > 0.35) {
      p.lastJiggle = t;
      this._emit('jiggle', { id: p.id, x: p.x, y: p.y, t, axis: horiz ? 'x' : 'y', amp, reversals: rev });
    }
  }

  _detectMassage(p, t) {
    const G = GESTURE;
    let cx = 0, cy = 0, n = 0;
    p.each((ht, hx, hy) => { if (t - ht > G.massageWindow) return false; cx += hx; cy += hy; n++; return true; });
    if (n < 10) { if (p.massage) p.massage.rate = 0; return; }
    cx /= n; cy /= n;
    let rSum = 0, sum = 0, pos = 0, neg = 0, lastA = null;
    p.each((ht, hx, hy) => {
      if (t - ht > G.massageWindow) return false;
      const dx = hx - cx, dy = hy - cy;
      rSum += Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      if (lastA !== null) {
        let d = lastA - a;          // newest → oldest, so lastA is later in time
        if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
        sum += d; if (d > 0) pos += d; else neg -= d;
      }
      lastA = a;
      return true;
    });
    const r = rSum / n;
    const total = pos + neg;
    const same = total > 0 ? Math.max(pos, neg) / total : 0;
    const ok = r >= G.massageRmin && r <= G.massageRmax && Math.abs(sum) >= G.massageTurn && same >= G.massageSame;
    if (ok) {
      const dir = Math.sign(sum);              // +1 clockwise on screen (y down)
      const rate = sum / G.massageWindow;      // rad/s, signed
      if (!p.massage) {
        p.massage = { turns: 0, dir, rate, cx, cy, lastT: t, ticks: 0 };
        this._emit('massageStart', { id: p.id, dir, rate, x: cx, y: cy, t });
      }
      const m = p.massage;
      m.turns += Math.abs(rate) * Math.max(0, t - m.lastT) / TAU;
      m.lastT = t; m.dir = dir; m.rate = rate; m.cx = cx; m.cy = cy;
      const whole = Math.floor(m.turns * 2);   // a tick every half turn
      if (whole > m.ticks) { m.ticks = whole; this._emit('massage', { id: p.id, turns: m.turns, dir, rate, x: cx, y: cy, t }); }
    } else if (p.massage) {
      p.massage.rate *= 0.9;
      p.massage.lastT = t;
      if (Math.abs(sum) < G.massageTurn * 0.5) {
        this._emit('massageEnd', { id: p.id, turns: p.massage.turns, dir: p.massage.dir, t });
        p.massage = null;
      }
    }
  }

  // ---------------------------------------------------------- stretch --
  _stretchStart(t) {
    const [a, b] = [...this.ptrs.values()];
    const d0 = Math.max(12, Math.hypot(b.x - a.x, b.y - a.y));
    this.stretch = { a: a.id, b: b.id, d0, ang0: Math.atan2(b.y - a.y, b.x - a.x), s: 1, ang: 0, twist: 0, t0: t };
    this._emit('stretchStart', { ...this.stretch, t });
  }

  _stretchEnd(t) {
    const s = this.stretch;
    this.stretch = null;
    if (s) this._emit('stretchEnd', { s: s.s, twist: s.twist, t });
  }

  _updateStretch() {
    const s = this.stretch;
    if (!s) return;
    const a = this.ptrs.get(s.a), b = this.ptrs.get(s.b);
    if (!a || !b) return;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    s.s = clamp(d / s.d0, GESTURE.stretchMin, GESTURE.stretchMax);
    s.ang = Math.atan2(b.y - a.y, b.x - a.x);
    let tw = s.ang - s.ang0;
    if (tw > Math.PI) tw -= TAU; if (tw < -Math.PI) tw += TAU;
    s.twist = tw;
    s.cx = (a.x + b.x) / 2; s.cy = (a.y + b.y) / 2;
  }

  // Shift-drag (mouse): two virtual fingers either side of the press
  _shiftStart(e, t) {
    const hw = this.bodySize() * 0.2;
    this._shift = { src: e.id, cx: e.x, cy: e.y, hw };
    this._down({ type: 'down', id: 'shiftA', x: e.x - hw, y: e.y, t, virtual: true }, t);
    this._down({ type: 'down', id: 'shiftB', x: e.x + hw, y: e.y, t, virtual: true }, t);
  }
  _shiftMove(e, t) {
    const s = this._shift;
    const dx = e.x - s.cx, dy = e.y - s.cy;
    const ax = s.hw + Math.max(-s.hw * 0.7, dx * 0.5), ay = dy * 0.5;
    const A = this.ptrs.get('shiftA'), B = this.ptrs.get('shiftB');
    if (A) this._move(A, s.cx - ax, s.cy - ay, t);
    if (B) this._move(B, s.cx + ax, s.cy + ay, t);
  }
  _shiftEnd(t) {
    for (const id of ['shiftA', 'shiftB']) { const p = this.ptrs.get(id); if (p) this._up(p, t, false); }
    this._shift = null;
  }

  /** Trackpad pinch (ctrl+wheel). e: {x, y, deltaY, t} */
  wheel(e) {
    if (!e || !Number.isFinite(e.deltaY)) return false;
    const t = Number.isFinite(e.t) ? e.t : this.t;
    this.t = Math.max(this.t, t);
    let w = this._wheel;
    if (!w) {
      if (!this.hit(e.x, e.y) || this.ptrs.size) return false;
      const hw = this.bodySize() * 0.2;
      w = this._wheel = { cx: e.x, cy: e.y, hw, s: 1, last: t };
      this._down({ type: 'down', id: 'pinchA', x: e.x - hw, y: e.y, t, virtual: true }, t);
      this._down({ type: 'down', id: 'pinchB', x: e.x + hw, y: e.y, t, virtual: true }, t);
    }
    w.s = clamp(w.s * Math.exp(-e.deltaY * 0.01), GESTURE.stretchMin, GESTURE.stretchMax);
    w.last = t;
    const A = this.ptrs.get('pinchA'), B = this.ptrs.get('pinchB');
    if (A) this._move(A, w.cx - w.hw * w.s, w.cy, t);
    if (B) this._move(B, w.cx + w.hw * w.s, w.cy, t);
    return true;
  }

  /** Keyboard: {type:'down'|'up', key, t, repeat} */
  key(e) {
    const t = Number.isFinite(e.t) ? e.t : this.t;
    this.t = Math.max(this.t, t);
    const c = this.centre();
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (e.type === 'down' && !e.repeat && !this.keys.space) {
        this.keys.space = t;
        this._down({ type: 'down', id: 'key', x: c.x, y: c.y, t, virtual: true }, t);
      } else if (e.type === 'up' && this.keys.space != null) {
        this.keys.space = null;
        const p = this.ptrs.get('key');
        if (p) this._up(p, t, false);
      }
      return true;
    }
    if (e.key === 'Enter' && e.type === 'down') {
      this._down({ type: 'down', id: 'enter', x: c.x, y: c.y, t, virtual: true }, t);
      const p = this.ptrs.get('enter');
      if (p) this._up(p, t + 0.05, false);
      return true;
    }
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[e.key]) {
      const [dx, dy] = dirs[e.key];
      if (e.type === 'down') {
        let p = this.ptrs.get('arrow');
        if (!p) { this._down({ type: 'down', id: 'arrow', x: c.x, y: c.y, t, virtual: true }, t); p = this.ptrs.get('arrow'); }
        if (p) this._move(p, clamp(p.x + dx * 18 - c.x, -90, 90) + c.x, clamp(p.y + dy * 18 - c.y, -90, 90) + c.y, t + 0.05);
      } else {
        const p = this.ptrs.get('arrow');
        if (p) this._up(p, t, false);
      }
      return true;
    }
    return false;
  }

  // ----------------------------------------------------------- update --
  /** Call once per frame. Updates depth, stretch and timers; returns the live state. */
  update(t) {
    if (Number.isFinite(t)) this.t = Math.max(this.t, t);
    t = this.t;
    const G = GESTURE;
    for (const p of this.ptrs.values()) {
      const held = t - p.t0;
      // kneading deepens: path length in the last 300 ms
      let path = 0, lx = null, ly = null;
      p.each((ht, hx, hy) => { if (t - ht > 0.3) return false; if (lx !== null) path += Math.hypot(hx - lx, hy - ly); lx = hx; ly = hy; return true; });
      const knead = G.kneadMax * clamp(path / G.kneadPx, 0, 1);
      const hold = 1 - Math.exp(-held / G.holdTau);
      // a pull grips rather than presses; a stroke barely presses at all
      const k = p.stroked ? 0.25 : 1 - 0.5 * p.pull;
      p.depth = clamp(hold * k + knead * (p.massage ? 1.4 : 1), 0, 1);
      // moving but not yet sampled this frame: decay velocity
      if (t - p.t > 0.05) { p.vx *= 0.8; p.vy *= 0.8; }
    }
    this._updateStretch();
    // trackpad pinch ends 220 ms after the last wheel event
    if (this._wheel && t - this._wheel.last > 0.22) {
      for (const id of ['pinchA', 'pinchB']) { const p = this.ptrs.get(id); if (p) this._up(p, t, false); }
      this._wheel = null;
    }
    // a single tap waits for a possible second
    if (this.pendingTap && t - this.pendingTap.t > G.doubleWindow) {
      const pt = this.pendingTap;
      this.pendingTap = null;
      this._emit('tap', { ...pt });
    }
    return this.state;
  }

  get state() {
    let depth = 0, speed = 0, pull = 0, massage = null, held = 0;
    for (const p of this.ptrs.values()) {
      depth = Math.max(depth, p.depth);
      speed = Math.max(speed, Math.hypot(p.vx, p.vy));
      pull = Math.max(pull, p.pull);
      held = Math.max(held, this.t - p.t0);
      if (p.massage && (!massage || Math.abs(p.massage.rate) > Math.abs(massage.rate))) massage = p.massage;
    }
    const s = this.stretch;
    return {
      count: this.ptrs.size, depth, speed, pull, held,
      stretch: s ? s.s : 1, twist: s ? s.twist : 0, axis: s ? s.ang : 0,
      massaging: !!massage, turns: massage ? massage.turns : 0, dir: massage ? massage.dir : 0, rate: massage ? massage.rate : 0,
    };
  }

  cancelAll() { for (const p of [...this.ptrs.values()]) this._up(p, this.t, true); this._shift = null; this._wheel = null; }
}
