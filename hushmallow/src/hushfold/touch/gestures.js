// MallowTouch gesture reader.
//
// An ordinary iPhone screen does not report how hard a finger presses, so
// squeeze depth is simulated from what it does report: how long a finger
// stays still, the contact size (when the browser exposes it) and whether a
// second finger joins. Everything else is read from the path: speed, flicks,
// small back-and-forth jiggles, circular massage and long gentle strokes.
//
// Pure: feed it samples ({id, x, y, t, w}) in screen px and seconds, read
// events back. No DOM.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const GESTURE = Object.freeze({
  TAP_MAX_S: 0.24, TAP_MAX_PX: 12,
  STILL_PX: 14,            // movement below this still counts as holding
  FLICK_PX_S: 900, FLICK_MIN_PX: 24,
  JIGGLE_REVERSALS: 3, JIGGLE_WINDOW_S: 0.9, JIGGLE_MIN_SPEED: 140,
  CIRCLE_MIN_SPEED: 40, CIRCLE_MAX_SPEED: 1100,
  STROKE_MIN_SPEED: 60, STROKE_MAX_SPEED: 900, STROKE_TURN_MAX: 1.1,
});

export function createGestureReader({ bodyWidth = 240 } = {}) {
  const fingers = new Map();
  let events = [];
  const emit = (type, data = {}) => events.push({ type, ...data });

  const api = {
    bodyWidth,
    setBodyWidth(w) { api.bodyWidth = Math.max(60, w); },
    get count() { return fingers.size; },
    fingers,

    down({ id, x, y, t, w = 0 }) {
      fingers.set(id, {
        id, x0: x, y0: y, x, y, t0: t, t, lastT: t, vx: 0, vy: 0, speed: 0, w, maxW: w,
        path: 0, moved: false, still0: t,
        turn: 0, lastAng: null, revs: [], axisSign: 0,
        strokeLen: 0, strokeTurn: 0, strokeT0: t,
      });
      emit('down', { id, x, y, fingers: fingers.size });
      if (fingers.size === 2) emit('pinchStart', api.pinch());
    },

    move({ id, x, y, t, w = 0 }) {
      const f = fingers.get(id);
      if (!f) return;
      const dt = Math.max(0.004, t - f.lastT);
      const dx = x - f.x, dy = y - f.y;
      const d = Math.hypot(dx, dy);
      const ivx = dx / dt, ivy = dy / dt;
      f.vx += (ivx - f.vx) * 0.5; f.vy += (ivy - f.vy) * 0.5;
      f.speed = Math.hypot(f.vx, f.vy);
      f.path += d;
      f.x = x; f.y = y; f.lastT = t; f.t = t;
      if (w) { f.w = w; f.maxW = Math.max(f.maxW, w); }
      if (Math.hypot(x - f.x0, y - f.y0) > GESTURE.STILL_PX) f.moved = true;
      if (d > 1.5) f.still0 = t;
      if (d < 0.5) return;
      // circular massage: accumulate the turning of the travel direction
      const ang = Math.atan2(dy, dx);
      if (f.lastAng != null && f.speed > GESTURE.CIRCLE_MIN_SPEED && f.speed < GESTURE.CIRCLE_MAX_SPEED) {
        let da = ang - f.lastAng;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        // a consistent turn builds up; changing direction of turn resets it
        if (Math.sign(da) !== Math.sign(f.turn) && Math.abs(f.turn) > 0.6) f.turn *= 0.3;
        f.turn += da;
        f.strokeTurn += Math.abs(da);
        if (Math.abs(f.turn) >= Math.PI * 2) {
          emit('circle', { id, dir: Math.sign(f.turn), x, y, speed: f.speed });
          f.turn = 0;
        }
      }
      f.lastAng = ang;
      // jiggle: quick reversals of direction along the main axis
      const axis = Math.abs(f.vx) > Math.abs(f.vy) ? f.vx : f.vy;
      const sign = Math.abs(axis) > GESTURE.JIGGLE_MIN_SPEED ? Math.sign(axis) : 0;
      if (sign && f.axisSign && sign !== f.axisSign) {
        f.revs.push(t);
        f.revs = f.revs.filter((r) => t - r < GESTURE.JIGGLE_WINDOW_S);
        if (f.revs.length >= GESTURE.JIGGLE_REVERSALS) { emit('jiggle', { id, x, y }); f.revs = []; }
      }
      if (sign) f.axisSign = sign;
      // stroke: a long, gentle, mostly straight run
      const okSpeed = f.speed > GESTURE.STROKE_MIN_SPEED && f.speed < GESTURE.STROKE_MAX_SPEED;
      if (okSpeed) f.strokeLen += d; else { f.strokeLen = 0; f.strokeTurn = 0; f.strokeT0 = t; }
      if (f.strokeTurn > GESTURE.STROKE_TURN_MAX * 1.8) { f.strokeLen = 0; f.strokeTurn = 0; f.strokeT0 = t; }
      if (f.strokeLen > api.bodyWidth * 0.55) {
        emit('stroke', { id, x, y, speed: f.speed, dur: t - f.strokeT0 });
        f.strokeLen = 0; f.strokeTurn = 0; f.strokeT0 = t;
      }
      if (fingers.size === 2) emit('pinch', api.pinch());
    },

    up({ id, t }) {
      const f = fingers.get(id);
      if (!f) return null;
      fingers.delete(id);
      const held = t - f.t0;
      const dist = Math.hypot(f.x - f.x0, f.y - f.y0);
      // a pause before letting go means no fling, whatever the last velocity was
      const speed = t - f.lastT > 0.08 ? 0 : f.speed;
      let kind = 'release';
      if (speed > GESTURE.FLICK_PX_S && dist > GESTURE.FLICK_MIN_PX) kind = 'flick';
      else if (held < GESTURE.TAP_MAX_S && dist < GESTURE.TAP_MAX_PX) kind = 'tap';
      const out = { id, kind, held, dist, speed, vx: speed ? f.vx : 0, vy: speed ? f.vy : 0, x: f.x, y: f.y };
      emit(kind, out);
      if (fingers.size === 1) emit('pinchEnd', {});
      return out;
    },

    cancel(id) { fingers.delete(id); },

    /** How deep a still finger is squeezing, 0..1. */
    depth(id, t) {
      const f = fingers.get(id);
      if (!f) return 0;
      if (f.moved) return 0;
      const held = t - f.t0;
      // hold time does most of the work; a broad contact (thumb, flat finger)
      // or a second finger presses a little deeper
      const time = 1 - Math.exp(-Math.max(0, held - 0.06) * 2.6);
      const contact = f.maxW ? clamp((f.maxW - 18) / 30, 0, 1) * 0.25 : 0;
      const two = fingers.size > 1 ? 0.12 : 0;
      return clamp(time * 0.88 + contact + two, 0, 1);
    },

    pinch() {
      const [a, b] = [...fingers.values()];
      if (!a || !b) return null;
      const d0 = Math.hypot(a.x0 - b.x0, a.y0 - b.y0) || 1;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      return { ratio: d / d0, angle: Math.atan2(b.y - a.y, b.x - a.x), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    },

    /** Drain events since the last call. */
    take() { const e = events; events = []; return e; },
  };
  return api;
}
