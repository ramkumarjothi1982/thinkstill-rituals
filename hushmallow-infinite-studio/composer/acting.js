// Acting pass (PHASE2-PLAN composer stage 5): what keeps a performance alive
// between the moves, plus the resolution of everything moves left deferred.
//
//   - resolver(): deferred values (look-at targets, cue pans, envelopes that
//     need a later move's window) are functions of a resolver R, evaluated
//     once every move has run: R.A (anchors), R.posts(topic), R.post(topic),
//     R.propAt(prop, i, t), R.lookAt(prop, i, t). Prop positions come from the
//     same pure controller the runtime uses, so the eyes look exactly where
//     the glass will be.
//   - autoBlinks(): seeded blinks wherever the eyes stay open longer than the
//     pack's blink interval, kept out of rest windows and away from impacts.
//     v2 blinks often enough by itself, so for Noomi on T01 nothing is added.
//   - micro-noise: per-Mallow micro-motion whose envelope is zero at the
//     seam (pack personality.microNoise; 0 for Noomi). Written inline by
//     composeWith's acting stage (composer/compose.js) as two noise terms.
//   - breathEnvelope(): THE sleeping-breath envelope of a direction, the single
//     function picture and sound share (audit R11).
//
// Idle breathing itself is the move acting/idle-breath; bridges between
// mismatching poses are acting/bridge (planned by composer/poses.js).

import { clamp } from '../engine/motion.js';
import { channelTable, compileExpr, CompileError } from './channels.js';
import { controllerOf } from './controllers/index.js';

/**
 * The resolver handed to deferred values. provisional: channels built so far
 * (prop channels must be final); props: the direction's prop records.
 */
export function resolver({ A, posts, provisional, props, pack, faceSpec, silhouette }) {
  const table = channelTable(provisional);
  const trackers = new Map();
  const tracker = (id) => {
    if (!trackers.has(id)) {
      const p = props.find((x) => x.id === id);
      if (!p) throw new CompileError('resolve', `no prop "${id}"`);
      trackers.set(id, controllerOf(p).create(p, (n) => table.get(n)));
    }
    return trackers.get(id);
  };
  const pl = pack.placement, gaze = pack.face.gaze;
  // the eyes' centre in world px at rest (v2: base − (silhouette base − mean eye y) · scale)
  const eyeC = [pl.baseX, pl.baseY - (silhouette.baseY - (faceSpec.eyes.L.y + faceSpec.eyes.R.y) / 2) * pl.scale];
  const R = {
    A,
    posts: (topic) => (posts.get(topic) || []).map((p) => p.value),
    post(topic) {
      const l = posts.get(topic) || [];
      if (l.length !== 1) throw new CompileError('resolve', `expected exactly one '${topic}' post, found ${l.length}${l.length ? ` (${l.map((p) => p.by).join(', ')})` : ''}`);
      return l[0].value;
    },
    propAt(id, i, t) {
      const b = tracker(id).at(i, t);
      if (!b) throw new CompileError('resolve', `prop ${id}[${i}] is not on screen at t=${t}`);
      return b;
    },
    /** Look target [lookX, lookY] toward prop item i, anticipating by the pack's gaze lead. */
    lookAt(id, i, t) {
      const b = R.propAt(id, i, t + gaze.lead);
      const dx = b.x - eyeC[0], dy = b.y - eyeC[1];
      const d = Math.hypot(dx, dy);
      return [clamp(dx / d * gaze.gain[0], gaze.x[0], gaze.x[1]), clamp(dy / d * gaze.gain[1], gaze.y[0], gaze.y[1])];
    },
    eyeCentre: eyeC,
  };
  return R;
}

/**
 * Seeded blinks for long open holds. built: channels with resolved values.
 * rate: [min, max] seconds between blinks; rnd: () → [0, 1); avoid: times
 * (impacts) to keep 0.3 s clear of; D: loop length. → [t…] blink times.
 */
export function autoBlinks(built, { rate, rnd, avoid = [], D, fps = 30 }) {
  if (!rate) return [];
  const T = channelTable(built);
  const eye = T.get('face.eyeOpen'), rest = T.has('env.rest') ? T.get('env.rest') : () => 0;
  const authored = (built['face.blink']?.list || []).map((b) => b.t);
  // open intervals, sampled at frame rate
  const open = [];
  let start = null;
  for (let f = 0; f <= D * fps; f++) {
    const t = f / fps;
    const isOpen = eye(t) > 0.5 && rest(t) < 0.01;
    if (isOpen && start === null) start = t;
    if ((!isOpen || f === D * fps) && start !== null) { open.push([start, t]); start = null; }
  }
  const out = [];
  for (const [a, b] of open) {
    const inside = [a, ...authored.filter((t) => t > a && t < b), b];
    for (let k = 1; k < inside.length; k++) {
      let t = inside[k - 1];
      while (inside[k] - t > rate[1]) {
        t += rate[0] + rnd() * (rate[1] - rate[0]);
        if (t > inside[k] - 0.3) break;
        if (avoid.some((x) => Math.abs(x - t) < 0.3)) continue;
        out.push(Math.round(t * 1000) / 1000);
      }
    }
  }
  return out;
}

/**
 * The sleeping-breath envelope of a direction as a function of t: the one
 * definition the picture uses (body.inflate.breath) and the score must use
 * for its breath layer (WP-04), instead of a copy.
 */
export function breathEnvelope(direction) {
  const def = direction.channels['env.breath'];
  if (!def) throw new Error(`direction ${direction.meta?.id} has no sleeping breath (env.breath)`);
  return compileExpr(def.expr);
}
