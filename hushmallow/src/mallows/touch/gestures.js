// TouchReader — turns raw pointers into squeeze gestures.
//
// iPhones report no usable pressure (Touch.force is 0 on iPhone 11 and later,
// PointerEvent.pressure a constant 0.5), so squeeze depth is read from how
// long and how restlessly a finger stays down:
//   depth = 1 − e^(−held / 0.45 s)  (+ up to 0.15 for kneading: path in the last 300 ms / 40 px)
// Everything else comes from position, speed and two-finger distance.
// Each finger has a mode that decides what it does to the body:
//   press     resting on the body (depth grows)
//   pull      moved > 10 px after resting first: it holds the material and drags it
//   glide     started sliding at once (within 0.25 s, > 100 px/s), or began to circle:
//             it slides over the skin (a stroke or a massage) and never pulls or slips.
//             A glide that comes to rest for 0.35 s grips again ('regrip'); so does a jiggle.
// Gestures:
//   stretch   two fingers on the body: ratio d / d0 in [0.6, 1.6], axis, twist
//   flick     released faster than 900 px/s after > 24 px (last 80 ms; a pause before letting go = no flick)
//   jiggle    ≥ 3 velocity reversals on the dominant axis within 600 ms, > 250 px/s, < 60 px amplitude
//   massage   circling 12–80 px around its own centre: ≥ 1.2π of gradual turning within 3 s
//             (any rate above 0.2 turn/s), ≥ 80 % one way. Jumps across the centre don't count,
//             so a straight back-and-forth is never a circle
//   stroke    a glide segment > 60 px at 50–850 px/s that stays straight over its whole length
//             (no point strays more than 8 % of the chord from it, so an arc of a circle never
//             counts). Stroking back and forth counts each pass
//   tap       held < 0.35 s and moved < 14 px; a second within 0.33 s is a double tap
// Mouse and trackpad: Shift-drag stretches (two virtual fingers either side of
// the press), ctrl+wheel (trackpad pinch) stretches around the cursor.
// Keyboard: Enter/Space tap, holding Space squeezes, arrow keys pull.
//
// Pure: feed it {type, id, x, y, t} (CSS px, seconds); no DOM needed, so the
// gesture rules are unit-tested in Node.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
const HIST = 512;          // ≥ 3 s of samples at 120 Hz (samples closer than 6 ms merge)

export const GESTURE = Object.freeze({
  holdTau: 0.45, kneadPx: 40, kneadMax: 0.15,
  pullStartPx: 10, pullFullPx: 40,
  glideSpeed: 100, restPx: 4, restTime: 0.35,
  flickSpeed: 900, flickDist: 24, releaseWindow: 0.08,
  tapHeld: 0.35, tapDist: 14, doubleWindow: 0.33,
  jiggleWindow: 0.6, jiggleReversals: 3, jiggleSpeed: 250, jiggleAmp: 60,
  massageWindow: 3, massageRmin: 12, massageRmax: 80, massageTurn: 1.2 * Math.PI, massageSame: 0.8,
  massageStep: 1, circleTurn: 0.6 * Math.PI, massageRecent: 1,
  strokeStart: 0.25, strokePath: 60, strokeVmin: 50, strokeVmax: 850, strokeStraight: 0.85, strokeBend: 0.08,
  stretchMin: 0.6, stretchMax: 1.6,
});

class Ptr {
  constructor(id, x, y, t, virtual = false) {
    this.id = id; this.virtual = virtual;
    this.x0 = x; this.y0 = y; this.t0 = t;
    this.tDown = t; this.xDown = x; this.yDown = y;
    this.x = x; this.y = y; this.t = t;
    this.vx = 0; this.vy = 0;
    this.path = 0; this.maxDist = 0; this.maxDown = 0;
    this.hist = new Float64Array(HIST * 3); this.hn = 0; this.hi = 0;
    this.pull = 0; this.depth = 0;
    this.mode = 'press';      // 'press' | 'pull' | 'glide'
    this.stroked = false; this.strokes = 0; this.strokeDir = 0;
    this.seg = { x: x, y: y, t: t, path: 0, done: false, dx: 0, dy: 0 };
    this.massage = null;      // {turns, dir, rate}
    this.massaged = false;
    this.lastJiggle = -1;
    this.firstMoveT = -1;
    this.stillX = x; this.stillY = y; this.stillT = t;
    this.push(t, x, y);
  }
  push(t, x, y) {
    // samples closer than 6 ms merge (coalesced 120 Hz input stays inside the window)
    if (this.hn > 1) {
      const o = ((this.hi - 1 + HIST) % HIST) * 3, p = ((this.hi - 2 + HIST) % HIST) * 3;
      if (t - this.hist[p] < 0.006) { this.hist[o] = t; this.hist[o + 1] = x; this.hist[o + 2] = y; return; }
    }
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
    const prevT = p.t;
    p.x = x; p.y = y; p.t = t;
    p.path += step;
    const dist = Math.hypot(x - p.x0, y - p.y0);
    p.maxDist = Math.max(p.maxDist, dist);
    p.maxDown = Math.max(p.maxDown, Math.hypot(x - p.xDown, y - p.yDown));
    if (p.firstMoveT < 0 && dist > 3) { p.firstMoveT = t; p.moveStartT = prevT; }
    if (Math.hypot(x - p.stillX, y - p.stillY) > GESTURE.restPx) { p.stillX = x; p.stillY = y; p.stillT = t; }
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
    const info = { id: p.id, x: p.x, y: p.y, t, held, dist, vx, vy, speed, depth: p.depth, pull: p.pull, maxDist: p.maxDist, cancelled,
      mode: p.mode, stroked: p.stroked, strokes: p.strokes, massaged: p.massaged };
    if (this.stretch && (this.stretch.a === p.id || this.stretch.b === p.id)) this._stretchEnd(t);
    let kind = 'release';
    if (!cancelled) {
      // a massage ends softly however the finger leaves
      if (speed > G.flickSpeed && dist > G.flickDist && !p.massaged) kind = 'flick';
      else if (t - p.tDown < G.tapHeld && p.maxDown < G.tapDist) {
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
    info.snap = kind === 'flick' && speed > G.flickSpeed * 1.25;   // a decisive flick (vs a brisk stroke's lift)
    this._emit('up', info);
    if (kind === 'flick') this._emit('flick', info);
    if (kind === 'doubleTap') this._emit('doubleTap', info);
    if (p.massage) this._emit('massageEnd', { id: p.id, turns: p.massage.turns, dir: p.massage.dir, t });
  }

  // ----------------------------------------------------------- motion --
  _detectMotion(p, t) {
    const G = GESTURE;
    const dist = Math.hypot(p.x - p.x0, p.y - p.y0);
    // how the finger starts moving decides what it does: sliding off at once
    // is a glide (stroke / massage), moving after resting is a pull
    if (p.mode === 'press' && dist > G.pullStartPx && !this._inStretch(p)) {
      // after a jiggle or a stretch the finger keeps holding; after a stroke
      // and a pause, a brisk move is another stroke, not a yank
      const sp = Math.hypot(p.vx, p.vy);
      const quick = !p.hold && p.firstMoveT >= 0 && p.firstMoveT - (p.tGrip ?? p.t0) < G.strokeStart;
      const again = !p.hold && p.strokes > 0 && sp > G.glideSpeed * 1.5;
      if ((quick && sp > G.glideSpeed) || again) this._setMode(p, 'glide', t, true);
      else this._setMode(p, 'pull', t);
    }
    // pull grows once past 10 px; a glide never pulls
    p.pull = p.mode === 'glide' ? 0 : clamp((dist - G.pullStartPx) / (G.pullFullPx - G.pullStartPx), 0, 1);
    if (p.mode === 'glide') this._detectStroke(p, t);
    this._detectJiggle(p, t);
    this._detectMassage(p, t);
  }

  _inStretch(p) { const s = this.stretch; return !!s && (s.a === p.id || s.b === p.id); }

  _setMode(p, mode, t, fromDown = false) {
    if (p.mode === mode) return;
    p.mode = mode;
    if (mode === 'glide') {
      p.pull = 0;
      const s = p.seg;
      if (fromDown) {
        // a swipe from touch-down: the first stroke runs from where the finger landed
        s.x = p.x0; s.y = p.y0; s.t = p.firstMoveT >= 0 ? p.moveStartT : t; s.path = 0; s.done = false;
      } else {
        // began circling: no stroke until the finger turns back and runs straight
        const v = Math.hypot(p.vx, p.vy) || 1;
        s.x = p.x; s.y = p.y; s.t = t; s.path = p.path; s.done = true; s.dx = p.vx / v; s.dy = p.vy / v;
      }
      this._emit('glide', { id: p.id, x: p.x, y: p.y, t });
    }
  }

  // a resting glide (or a jiggle) grips again where the finger is: depth
  // continues from where it was, so the body never pops
  _regrip(p, t, hold = false) {
    if (p.mode !== 'glide') return;
    if (p.massage) { this._emit('massageEnd', { id: p.id, turns: p.massage.turns, dir: p.massage.dir, t }); p.massage = null; }
    p.mode = 'press';
    p.tGrip = t;
    if (hold) p.hold = true;
    p.x0 = p.x; p.y0 = p.y;
    p.t0 = t + GESTURE.holdTau * Math.log(1 - clamp(p.depth, 0, 0.9));
    p.path = 0; p.maxDist = 0; p.pull = 0; p.firstMoveT = -1;
    this._emit('regrip', { id: p.id, x: p.x, y: p.y, t });
  }

  // strokes: straight glide segments; each pass of a back-and-forth counts
  _detectStroke(p, t) {
    const G = GESTURE, s = p.seg;
    if (s.done) {
      // a reversal starts the next pass
      const v = Math.hypot(p.vx, p.vy);
      if (v > 60 && (p.vx * s.dx + p.vy * s.dy) / v < -0.5) { s.x = p.x; s.y = p.y; s.t = t; s.path = p.path; s.done = false; }
      return;
    }
    const segPath = p.path - s.path;
    if (segPath < G.strokePath) return;
    const dx = p.x - s.x, dy = p.y - s.y, chord = Math.hypot(dx, dy);
    s.done = true;
    s.dx = chord > 0 ? dx / chord : 0; s.dy = chord > 0 ? dy / chord : 0;
    if (chord < 1 || chord / segPath < G.strokeStraight) return;
    // straight over its whole length (an arc of a circle bows away from its chord)
    let dev = 0;
    p.each((ht, hx, hy) => { if (ht < s.t - 1e-6) return false; const d = Math.abs((hx - s.x) * dy - (hy - s.y) * dx) / chord; if (d > dev) dev = d; return true; });
    if (dev > G.strokeBend * chord) return;
    const speed = segPath / Math.max(0.016, t - s.t);
    if (speed < G.strokeVmin || speed > G.strokeVmax) return;
    p.stroked = true; p.strokes++;
    p.strokeDir = Math.atan2(dy, dx);
    this._emit('stroke', { id: p.id, x: p.x, y: p.y, t, dir: p.strokeDir, dx: s.dx, dy: s.dy, speed, n: p.strokes });
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
    if (rev >= G.jiggleReversals && fast >= segs * 0.4 && t - p.lastJiggle > 0.35 && !p.massage) {
      p.lastJiggle = t;
      // shaking the body means holding it
      if (p.mode === 'glide' && !p.stroked) this._regrip(p, t, true);
      this._emit('jiggle', { id: p.id, x: p.x, y: p.y, t, axis: horiz ? 'x' : 'y', amp, reversals: rev });
    }
  }

  _detectMassage(p, t) {
    const G = GESTURE;
    if (this._inStretch(p)) return;
    let cx = 0, cy = 0, n = 0, tOld = t;
    p.each((ht, hx, hy) => { if (t - ht > G.massageWindow) return false; cx += hx; cy += hy; n++; tOld = ht; return true; });
    const span = t - tOld;
    if (n < 10 || span < 0.25) { if (p.massage) p.massage.rate = 0; return; }
    cx /= n; cy /= n;
    let rSum = 0, sum = 0, pos = 0, neg = 0, recent = 0, lastA = null;
    p.each((ht, hx, hy) => {
      if (t - ht > G.massageWindow) return false;
      const dx = hx - cx, dy = hy - cy, rr = Math.hypot(dx, dy);
      rSum += rr;
      if (rr < 3) { lastA = null; return true; }     // too near the centre to read an angle
      const a = Math.atan2(dy, dx);
      if (lastA !== null) {
        let d = lastA - a;          // newest → oldest, so lastA is later in time
        if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
        // gradual turning only: a jump across the centre (a straight line, a
        // reversal) is not circling
        if (Math.abs(d) < G.massageStep) {
          sum += d; if (d > 0) pos += d; else neg -= d;
          if (t - ht < G.massageRecent) recent += d;
        }
      }
      lastA = a;
      return true;
    });
    const r = rSum / n;
    const total = pos + neg;
    const same = total > 0 ? Math.max(pos, neg) / total : 0;
    const inRange = r >= G.massageRmin && r <= G.massageRmax && same >= G.massageSame;
    // circling: from here on the finger slides over the skin instead of pulling it
    if (inRange && Math.abs(sum) >= G.circleTurn && span >= 0.3 && p.mode !== 'glide') this._setMode(p, 'glide', t);
    const ok = inRange && Math.abs(sum) >= G.massageTurn && (!p.massage || Math.abs(recent) > 0.25 * Math.PI);
    if (ok) {
      const dir = Math.sign(sum);              // +1 clockwise on screen (y down)
      const rate = sum / Math.max(0.5, span);  // rad/s, signed: the same at any speed
      if (!p.massage) {
        p.massage = { turns: 0, dir, rate, cx, cy, lastT: t, ticks: 0 };
        p.massaged = true;
        if (p.mode !== 'glide') this._setMode(p, 'glide', t);
        this._emit('massageStart', { id: p.id, dir, rate, x: cx, y: cy, t });
      }
      const m = p.massage;
      m.turns += Math.abs(rate) * Math.max(0, t - m.lastT) / TAU;
      m.lastT = t; m.dir = dir; m.rate = rate; m.cx = cx; m.cy = cy;
      const whole = Math.floor(m.turns * 2);   // a tick every half turn
      if (whole > m.ticks) { m.ticks = whole; this._emit('massage', { id: p.id, turns: m.turns, dir, rate, x: cx, y: cy, t }); }
    } else if (p.massage) {
      // the circling has stopped (the last second hardly turned)
      this._emit('massageEnd', { id: p.id, turns: p.massage.turns, dir: p.massage.dir, t });
      p.massage = null;
    }
  }

  // ---------------------------------------------------------- stretch --
  _stretchStart(t) {
    // stretching means holding: a gliding finger grips first
    for (const p of this.ptrs.values()) { this._regrip(p, t, true); p.hold = true; }
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
      // a pull grips rather than presses; a glide (stroke, massage) barely presses
      const k = p.mode === 'glide' ? 0.25 : 1 - 0.5 * p.pull;
      p.depth = clamp(hold * k + knead * (p.massage ? 1.4 : 1), 0, 1);
      // moving but not yet sampled this frame: decay velocity
      if (t - p.t > 0.05) { p.vx *= 0.8; p.vy *= 0.8; }
      // a glide that comes to rest grips again; a massage that stops ends
      if (p.mode === 'glide' && t - p.stillT > G.restTime) this._regrip(p, t);
      else if (p.massage && t - p.t > 0.5) { this._emit('massageEnd', { id: p.id, turns: p.massage.turns, dir: p.massage.dir, t }); p.massage = null; }
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
      count: this.ptrs.size, depth, speed, pull, held, gliding: this._gliding(),
      stretch: s ? s.s : 1, twist: s ? s.twist : 0, axis: s ? s.ang : 0,
      massaging: !!massage, turns: massage ? massage.turns : 0, dir: massage ? massage.dir : 0, rate: massage ? massage.rate : 0,
    };
  }

  _gliding() { for (const p of this.ptrs.values()) if (p.mode === 'glide') return true; return false; }

  cancelAll() { for (const p of [...this.ptrs.values()]) this._up(p, this.t, true); this._shift = null; this._wheel = null; }
}
