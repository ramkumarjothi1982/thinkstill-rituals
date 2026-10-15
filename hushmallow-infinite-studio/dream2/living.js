// A living Mallow for the dream2 stage: the app's approved rig
// (hushmallow/src/mallows/rig.js) used as a face renderer, driven by time.
//
// The rig paints a "skin" canvas: the approved face-cleaned artwork, the
// animated face (lids made of the body's own surface, irises and spirals cut
// from the approved art, brows and mouth in each Mallow's ink, cheeks, tears)
// and, whenever the face is at its rest pose, the untouched approved PNG. Its
// expressions come from the app's presets filtered through each Mallow's
// personality (expressions.js), so "sad" reads differently on Glitzi than on
// Blubi.
//
// Here the rig's own springs, timers and random blinks are bypassed: every
// parameter is a pure function of time (an expression timeline, gaze and blink
// tracks), so any frame can be rendered alone and in any order.

import { MallowRig } from '../../hushmallow/src/mallows/rig.js';
import { resolveExpression, baseParams } from '../../hushmallow/src/mallows/expressions.js';
import { clamp, smoothstep, Blinks } from '../engine/motion.js';

const SIG_KEYS = ['eyeOpen', 'closedCurve', 'lidTop', 'lidBot', 'lidSlant', 'wink', 'lookX', 'lookY', 'irisScale', 'eyeScale', 'browAlpha', 'browY',
  'browTilt', 'browCurve', 'browAsym', 'mouthSmile', 'mouthOpen', 'mouthWidth', 'mouthRound', 'mouthWave', 'mouthSkew', 'mouthPout', 'tongue', 'blush', 'blushLines',
  'cheekPuff', 'wet', 'tears', 'sweat', 'heartEyes', 'glitch', 'sparkle'];
const smoother = (x) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

/**
 * Expression timeline: keys [{ t, mood: 'happy' | { happy: .6, calm: .4 } | null (rest), k (intensity), dur, set: { param: value } }].
 * Each key is resolved once to a full parameter set; value(t) blends from the previous key over `dur` s.
 */
export class ExprTrack {
  constructor(mallow, keys) {
    this.keys = keys.map((k) => {
      const P = k.mood ? resolveExpression(mallow, typeof k.mood === 'string' ? { [k.mood]: 1 } : k.mood, k.k ?? 0.75) : baseParams(mallow);
      return { t: k.t, dur: k.dur ?? 0.3, P: { ...P, ...(k.set || {}) } };
    });
    this.names = Object.keys(this.keys[0].P);
  }
  value(t) {
    const K = this.keys;
    let i = 0;
    while (i + 1 < K.length && K[i + 1].t <= t) i++;
    const cur = K[i];
    if (i === 0 || t >= cur.t + cur.dur) return cur.P;
    const prev = K[i - 1].P, w = smoother((t - cur.t) / cur.dur), out = {};
    for (const n of this.names) out[n] = prev[n] + (cur.P[n] - prev[n]) * w;
    return out;
  }
}

/**
 * The companion's hi-res art (tools/derive_companions_hires.py) in the rig's own frame: each image
 * reports its rig-frame size as width / height, so the rig's sprite maths is unchanged, and the
 * skin context draws a 2-argument drawImage of one at that logical size.
 */
async function useHires(rig, id) {
  const base = new URL(`../assets/companions/${id}/`, import.meta.url).href;
  const meta = await (await fetch(base + 'meta.json')).json();
  const load = (name, lw, lh) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const w = lw ?? im.naturalWidth / meta.q, h = lh ?? im.naturalHeight / meta.q;
      Object.defineProperty(im, 'width', { value: w });
      Object.defineProperty(im, 'height', { value: h });
      im.__logical = [w, h];
      res(im);
    };
    im.onerror = rej;
    im.src = base + name;
  });
  const [W, H] = meta.frame;
  const A = rig.assets;
  A.body = await load('body.png', W, H);
  A.original = await load('original.png', W, H);
  for (const name of Object.keys(meta.sprites)) A.sprites[name] = await load(`${name}.png`, meta.sprites[name].size[0], meta.sprites[name].size[1]);
  // a painting whose resting face is not the rig's (Loomi): never cross-fade to it
  if (meta.faceDiffersFromRig) rig.opts.pristine = false;
  const ctx = rig.sctx, raw = ctx.drawImage.bind(ctx);
  ctx.drawImage = (img, ...a) => (a.length === 2 && img.__logical ? raw(img, a[0], a[1], img.__logical[0], img.__logical[1]) : raw(img, ...a));
  return meta;
}

export class LivingMallow {
  /** id: Mallow id; q: skin resolution (source px multiplier); hires: paint from the companion's hi-res art (assets/companions) */
  constructor(id, { q = 1.5, hires = false } = {}) {
    this.id = id;
    this.q = q;
    this.hires = hires;
    this.div = document.createElement('div');
    this.rig = new MallowRig(this.div, { id, interactive: false, particles: false, reducedMotion: true, shadow: false, aura: false });
    this.mallow = this.rig.mallow;
    this.blinks = new Blinks();
    this.look = null;          // (t) → [x, y, weight] gaze override
    this.mod = null;           // (t, P) → void: adjust parameters in place
    this.spinTable = null;
  }

  async load() {
    await this.rig.loaded;
    const r = this.rig;
    if (this.hires) this.hiresMeta = await useHires(r, this.id);
    r.q = this.q;
    r.skin.width = Math.ceil(this.mallow.size[0] * this.q);
    r.skin.height = Math.ceil(this.mallow.size[1] * this.q);
    r._blinkAmount = () => this._blink;
    this.skin = r.skin;
    return this;
  }

  setExpressions(keys) { this.expr = new ExprTrack(this.mallow, keys); return this; }

  /** Zuzu's spirals: the spin angle is the integral of the spin parameter (precomputed, so it is a function of t). */
  buildSpin(D, n = 2400) {
    const dt = D / n, acc = new Float64Array(n + 1);
    const speed = (t) => { const P = this.expr.value(t); return P.spin * 2.4 + (P.spinJitter || 0) * 2.2 * Math.sin(t * 23); };
    for (let i = 0; i < n; i++) acc[i + 1] = acc[i] + (speed(i * dt) + speed((i + 1) * dt)) / 2 * dt;
    this.spinTable = { acc, dt, n };
  }
  spinAt(t) {
    const S = this.spinTable;
    if (!S) return 0;
    const u = clamp(t / S.dt, 0, S.n), i = Math.min(S.n - 1, Math.floor(u));
    return S.acc[i] + (S.acc[i + 1] - S.acc[i]) * (u - i);
  }

  params(t) {
    const P = { ...this.expr.value(t) };
    if (this.mod) this.mod(t, P);   // per-frame acting on top of the timeline (talking, trembling), a function of t
    if (this.look) {
      const [x, y, w] = this.look(t);
      P.lookX += (x - P.lookX) * w; P.lookY += (y - P.lookY) * w;
    }
    return P;
  }

  /** Paint the skin for time t (call once per frame, at its centre time). → false when nothing changed. */
  draw(t) {
    const r = this.rig;
    const P = this.params(t);
    const blink = this.blinks.value(t);
    // redraw only when the face changed (Zuzu's spirals and Glitzi's glitch lines move every frame)
    let sig = `${blink.toFixed(3)}|${this.id === 'zuzu' || this.id === 'glitzi' || P.tears > 0.01 || P.sweat > 0.01 || P.mouthTremble > 0.01 || P.sparkle > 1.05 || P.heartEyes > 0.01 ? t.toFixed(3) : ''}`;
    for (const k of SIG_KEYS) sig += `|${(P[k] ?? 0).toFixed(3)}`;
    if (sig === this.lastSig) return false;
    this.lastSig = sig;
    Object.assign(r.val, P);
    this._blink = blink;
    r.time = t;
    r.spinAngle = this.spinAt(t);
    r._dt = 100;                 // the rest cross-fade switches instantly: a function of the parameters alone
    r.skinDirty = true;
    r._renderSkin();
    return true;
  }
}

/** Natural blinks at seeded times, skipping windows where the eyes are meant to be closed. */
export function naturalBlinks(seed, D, { every = 3.2, avoid = [] } = {}) {
  let s = seed >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const b = new Blinks();
  for (let t = 0.6 + r() * every; t < D - 0.4; t += every * (0.6 + 0.8 * r())) {
    if (avoid.some(([a, z]) => t > a - 0.2 && t < z + 0.2)) continue;
    b.add(t, r() < 0.2 ? { close: 0.06, hold: 0.01, open: 0.1 } : {});
    if (r() < 0.18) b.add(t + 0.24);       // the occasional double blink
  }
  return b;
}

export { smoothstep };
