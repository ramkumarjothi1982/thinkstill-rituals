// Mallow Nightlight: the night sky between the world and the Mallow (DOM).
//
// A still world cannot twinkle, so this layer carries the life of the night:
// the halo the Mallow's own light throws behind it, a pool of that light on
// the floor, a few twinkling stars, fireflies and slow clouds. Each mode asks
// for its own mix (configure), and items cross-fade over 1.2 s when it
// changes. It draws on a manual EffectsLayer at DPR 1 just behind the stage,
// only on the rig's (capped) frames, and only when something actually
// changed: in Quiet and in Movement Still nothing moves, so it redraws only
// when the light does.
//
// Photosafe by construction: twinkles vary by at most 15 % at ≤ 0.5 Hz, a
// firefly glint is ≤ 15 % over ≥ 600 ms, and every brightening is eased.
// Fixed pools, cached glow sprites, no allocation per frame.
//
//   const sky = new NightSky(s.screen, { before: s.stage, quality, motion: 'gentle', seed });
//   sky.configure(MODES.drift.sky);
//   sky.setLight(look.light, look.star); sky.setLevels(look.haloAlpha, levels.world); sky.setBody(rig.bodyRect(b));
//   sky.frame(dt);                          // on every rig tick: steps, and draws when dirty

import { EffectsLayer, glowSprite, glowBlend, surfaceTone } from '../../core/effects.js';
import { MOTION_RULES } from './settings.js';
import { mixHex } from './look.js';
import { clamp, rng, TAU, approach } from '../../core/math.js';

/** Pool sizes per lab tier (counts never grow past these). */
export const SKY_POOLS = Object.freeze({
  high: Object.freeze({ twinkles: 14, fireflies: 8, clouds: 3 }),
  medium: Object.freeze({ twinkles: 10, fireflies: 6, clouds: 2 }),
  low: Object.freeze({ twinkles: 6, fireflies: 4, clouds: 2 }),
});
export const XFADE_S = 1.2;                  // items cross-fade over this when the mode changes
export const FIREFLY_SPEED = 10;             // px/s at most
export const TWINKLE = Object.freeze({ depth: 0.15, hz: [0.12, 0.45] });   // ≤ 15 %, ≤ 0.5 Hz
export const GLINT = Object.freeze({ k: 0.15, rise: 0.6, fall: 0.9, every: [6, 14] });
export const ATTRACT = Object.freeze({ s: 2, r: 170 });
export const BREATH_LAG = 0.3;               // the halo follows the breath this far behind (s)
const FIREFLY_HEX = '#fff0a6';
const CLOUD_HEX = '#2c2a54';
const EMPTY = Object.freeze({ halo: 0, pool: 0, twinkles: 0, fireflies: 0, clouds: 0, animated: false });

export class NightSky {
  /**
   * @param {HTMLElement} screen  the feature screen (the layer covers it)
   * @param {{before?:Node, quality?:string, motion?:string, seed?:number}} [o]
   */
  constructor(screen, { before = null, quality = 'medium', motion = 'gentle', seed = 7 } = {}) {
    this.layer = new EffectsLayer(screen, { manual: true, before, dprCap: 1, className: 'nl-sky', zIndex: '', quality });
    this.layer.add({ step: () => true, draw: (g) => this.draw(g) });
    this.screen = screen;
    this.rand = rng(seed >>> 0);
    this.pool = SKY_POOLS[quality] || SKY_POOLS.medium;
    this.rules = MOTION_RULES[motion] || MOTION_RULES.gentle;
    this.motion = motion;
    this.cfg = EMPTY;
    this.amt = { halo: 0, pool: 0 };
    this.light = '#ffd29a'; this.star = '#f4f1ff'; this.ffHex = mixHex(FIREFLY_HEX, this.light, 0.3);
    this.haloAlpha = 0; this.stars = 1; this.haloGain = 1;
    this.breath = null; this.breathShown = 0;
    this.body = { cx: 0, top: 0, bottom: 0, mid: 0, w: 0, h: 0 };
    this.W = 0; this.H = 0;
    this.t = 0;
    this.frames = 0;
    this._dirty = true;
    this._drawn = { halo: -1, stars: -1, gain: -1, breath: -1 };
    const R = this.rand;
    const max = SKY_POOLS.high;
    this.twinkles = Array.from({ length: max.twinkles }, () => ({ x: R(), y: 0.06 + R() * 0.36, r: 2.4 + R() * 2.6, a0: 0.35 + R() * 0.4,
      ph: R() * TAU, hz: TWINKLE.hz[0] + R() * (TWINKLE.hz[1] - TWINKLE.hz[0]), a: 0 }));
    this.fireflies = Array.from({ length: max.fireflies }, () => this._spawn({ x: 0, y: 0, th: 0, v: 0, life: 0, age: 0, glint: 0, glintT: 0, nextGlint: 0, ax: 0, ay: 0, attractT: 0, a: 0, seen: 0 }, true));
    this.clouds = Array.from({ length: max.clouds }, (_, i) => ({ x: R(), y: 0.1 + R() * 0.22, w: 130 + R() * 110, v: 3 + R() * 5, a: 0, ph: i }));
    this.maxSpeed = 0;           // fastest firefly step seen (px/s, tests)
    this.onGlint = null;         // (i) => void: a visible firefly begins to glint (Drift's bell)
  }

  /** Does the sky move by itself (else it is drawn only when something changes)? */
  get animated() { return !!(this.cfg.animated && this.rules.animated); }

  /** A mode's mix: { halo, pool (0..1 amounts), twinkles, fireflies, clouds (counts), animated }. Items cross-fade. */
  configure(cfg = EMPTY) { this.cfg = { ...EMPTY, ...cfg }; this._dirty = true; }

  setMotion(m) { this.motion = m; this.rules = MOTION_RULES[m] || MOTION_RULES.gentle; this._dirty = true; }

  /** A lower tier: pools only ever shrink. */
  setQuality(q) {
    const p = SKY_POOLS[q] || this.pool;
    this.pool = { twinkles: Math.min(this.pool.twinkles, p.twinkles), fireflies: Math.min(this.pool.fireflies, p.fireflies), clouds: Math.min(this.pool.clouds, p.clouds) };
    this._dirty = true;
  }

  /** The light (halo, pool) and twinkle colours. */
  setLight(light, star = this.star) {
    if (light === this.light && star === this.star) return;
    this.light = light; this.star = star; this.ffHex = mixHex(FIREFLY_HEX, light, 0.3);
    this._dirty = true;
  }

  /** halo: the halo's alpha (look.haloAlpha); stars: how much of the sky's own life shows (the world level). */
  setLevels(halo, stars) { this.haloAlpha = clamp(+halo || 0, 0, 1); this.stars = clamp(Number.isFinite(stars) ? stars : 1, 0, 1); }

  /** The Mallow's body on screen (rig.bodyRect): the halo sits behind it, the pool under it, fireflies keep clear. */
  setBody(b) {
    const o = this.body;
    if (Math.abs(o.cx - b.cx) + Math.abs(o.bottom - b.bottom) + Math.abs(o.w - b.w) + Math.abs(o.h - b.h) < 0.5) return;
    o.cx = b.cx; o.top = b.top; o.bottom = b.bottom; o.mid = b.mid; o.w = b.w; o.h = b.h;
    this._dirty = true;
  }

  /** Breathe: the halo grows (1 → 1.07) and brightens with the breath, 0.3 s behind. null: no breath. */
  setBreath(level) { this.breath = level == null ? null : clamp(level, 0, 1); }

  /** A multiplier on the halo and pool (Moonlight's slow glow, a touch-lamp swell). */
  setHaloGain(k) { this.haloGain = clamp(+k || 0, 0, 2); }

  /** Fireflies within reach drift toward a finger for 2 s (still at most 10 px/s). */
  attract(x, y) {
    if (!this.rules.animated) return;
    for (const f of this.fireflies) {
      if (f.a <= 0.05 || Math.hypot(f.x - x, f.y - y) > ATTRACT.r) continue;
      f.ax = x; f.ay = y; f.attractT = ATTRACT.s;
    }
  }

  /** Index of a visible firefly (for the Mallow's gaze), or -1. */
  pickFirefly() {
    const n = this._count('fireflies');
    if (!n) return -1;
    const start = Math.floor(this.rand() * n);
    for (let k = 0; k < n; k++) { const i = (start + k) % n; if (this.fireflies[i].a > 0.4) return i; }
    return -1;
  }

  /** Where firefly i is now (screen px), into `out`; false when it is gone. */
  firefly(i, out) {
    const f = this.fireflies[i];
    if (!f || f.a <= 0.05) return false;
    out.x = f.x; out.y = f.y;
    return true;
  }

  /** One frame on the rig's clock: step, and draw only when something changed. Returns whether it drew. */
  frame(dt) {
    if (this.destroyed) return false;
    if (!this.step(dt)) return false;
    this.layer.render(dt);
    this.frames++;
    return true;
  }

  /** Advance by dt seconds. Returns true when the canvas needs drawing. */
  step(dt) {
    const d = Math.max(0, +dt || 0);
    let dirty = this._dirty;
    this._dirty = false;
    if (this.layer.W !== this.W || this.layer.H !== this.H) {
      this.W = this.layer.W; this.H = this.layer.H; dirty = true;
      for (const f of this.fireflies) if (f.x > this.W - 16 || f.y > this.H - 12) { const a = f.a, seen = f.seen; this._spawn(f, true); f.seen = seen; f.a = a; }
    }
    this.t += d;
    const cfg = this.cfg, k = d / XFADE_S;
    // cross-fades toward the mode's mix
    for (const key of ['halo', 'pool']) {
      const goal = cfg[key] || 0, cur = this.amt[key];
      if (cur !== goal) { this.amt[key] = goal > cur ? Math.min(goal, cur + k) : Math.max(goal, cur - k); dirty = true; }
    }
    if (this._fadeItems(this.twinkles, this._count('twinkles'), k)) dirty = true;
    if (this._fadeItems(this.clouds, this._count('clouds'), k)) dirty = true;
    // the breath, a little behind
    const bGoal = this.breath ?? 0;
    if (Math.abs(this.breathShown - bGoal) > 1e-3) { this.breathShown = approach(this.breathShown, bGoal, BREATH_LAG * 0.7, d); dirty = true; }
    const D = this._drawn;
    if (Math.abs(this.haloAlpha - D.halo) > 0.003 || Math.abs(this.stars - D.stars) > 0.01 || Math.abs(this.haloGain - D.gain) > 0.004 || Math.abs(this.breathShown - D.breath) > 0.004) dirty = true;
    // fireflies live, glint and fade in place even with a static sky only when animated
    const nFF = this._count('fireflies');
    if (this.animated) {
      if (this._moveFireflies(d, nFF)) dirty = true;
      if (this._moveClouds(d)) dirty = true;
      if (this._twinkling()) dirty = true;
    } else {
      // a static sky: fireflies hold still and only cross-fade with the mode
      for (let i = 0; i < this.fireflies.length; i++) {
        const f = this.fireflies[i], goal = i < nFF ? 1 : 0;
        if (f.seen !== goal) { f.seen = goal > f.seen ? Math.min(goal, f.seen + k) : Math.max(goal, f.seen - k); dirty = true; }
        if (f.a !== f.seen) { f.a = f.seen; f.glint = 0; dirty = true; }
      }
    }
    return dirty;
  }

  draw(g) {
    const W = this.W, H = this.H, b = this.body, D = this._drawn;
    D.halo = this.haloAlpha; D.stars = this.stars; D.gain = this.haloGain; D.breath = this.breathShown;
    if (!W || !H) return;
    const lighter = glowBlend(surfaceTone(this.screen));
    // clouds first: they veil the world, not the light
    g.globalCompositeOperation = 'source-over';
    for (const c of this.clouds) {
      if (c.a <= 0.004) continue;
      const a = 0.2 * c.a * (0.4 + 0.6 * this.stars), x = c.x * W, y = c.y * H, w = c.w;
      const s1 = glowSprite(CLOUD_HEX, w * 0.36), s2 = glowSprite(CLOUD_HEX, w * 0.3);
      g.globalAlpha = a;
      g.drawImage(s1, x - w * 0.3 - w * 0.36, y - w * 0.36, w * 0.72, w * 0.72);
      g.drawImage(s1, x + w * 0.22 - w * 0.36, y + w * 0.02 - w * 0.36, w * 0.72, w * 0.72);
      g.drawImage(s2, x - w * 0.3, y - w * 0.14 - w * 0.3, w * 0.6, w * 0.6);
    }
    g.globalCompositeOperation = lighter;
    // the halo behind the Mallow and the pool of light under it
    const breathing = this.breath != null, still = this.motion === 'still';
    const bk = breathing ? (still ? 0.55 + 0.6 * this.breathShown : 0.75 + 0.35 * this.breathShown) : 1;
    const scale = breathing && !still ? 1 + 0.07 * this.breathShown : 1;
    const ha = this.haloAlpha * this.amt.halo * this.haloGain * bk;
    if (ha > 0.004 && b.w > 0) {
      const R = clamp(Math.max(b.w, b.h) * 0.92, 60, 460), r = R * scale;
      g.globalAlpha = clamp(ha, 0, 1);
      g.drawImage(glowSprite(this.light, R, { core: 0.85 }), b.cx - r, b.mid - r, r * 2, r * 2);
    }
    const pa = this.haloAlpha * this.amt.pool * this.haloGain * 0.9;
    if (pa > 0.004 && b.w > 0) {
      const R = clamp(b.w * 0.9, 50, 420);
      g.globalAlpha = clamp(pa, 0, 1);
      g.drawImage(glowSprite(this.light, R), b.cx - R, b.bottom - R * 0.2, R * 2, R * 0.4);
    }
    // twinkles: soft points high in the sky, never faster than 0.5 Hz or more than 15 %
    const depth = TWINKLE.depth * this.rules.twinkle;
    const ts = glowSprite(this.star, 5);
    for (const s of this.twinkles) {
      if (s.a <= 0.004) continue;
      const tw = 1 - depth * 0.5 + depth * 0.5 * Math.sin(s.ph + TAU * s.hz * this.t);
      const a = s.a0 * s.a * tw * this.stars;
      if (a <= 0.004) continue;
      g.globalAlpha = a;
      g.drawImage(ts, s.x * W - s.r, s.y * H - s.r, s.r * 2, s.r * 2);
    }
    // fireflies: a soft glow with a small warm point at its heart, so each reads as a firefly, not a smudge
    const fs = glowSprite(this.ffHex, 9), fc = glowSprite(this.ffHex, 3);
    for (const f of this.fireflies) {
      if (f.a <= 0.004) continue;
      const a = f.a * (0.55 + 0.45 * this.stars) * 0.7 * (1 + GLINT.k * f.glint);
      g.globalAlpha = clamp(a, 0, 1);
      g.drawImage(fs, f.x - 9, f.y - 9, 18, 18);
      g.globalAlpha = clamp(a * 0.85, 0, 1);
      g.drawImage(fc, f.x - 3, f.y - 3, 6, 6);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  debug() {
    const vis = (list) => list.filter((x) => x.a > 0.05).length;
    return { frames: this.frames, animated: this.animated, motion: this.motion, cfg: { ...this.cfg }, halo: { amount: +this.amt.halo.toFixed(3), alpha: +this.haloAlpha.toFixed(3), gain: +this.haloGain.toFixed(3), breath: +this.breathShown.toFixed(3) },
      twinkles: vis(this.twinkles), fireflies: vis(this.fireflies), clouds: vis(this.clouds), maxSpeed: +this.maxSpeed.toFixed(2), pool: { ...this.pool } };
  }

  destroy() {
    this.destroyed = true;
    this.onGlint = null;
    this.layer.destroy();
  }

  // ------------------------------------------------------------ inside --
  _count(kind) { return Math.min(this.cfg[kind] || 0, this.pool[kind]); }

  _fadeItems(list, n, k) {
    let changed = false;
    for (let i = 0; i < list.length; i++) {
      const it = list[i], goal = i < n ? 1 : 0;
      if (it.a !== goal) { it.a = goal > it.a ? Math.min(goal, it.a + k) : Math.max(goal, it.a - k); changed = true; }
    }
    return changed;
  }

  _twinkling() {
    if (this.rules.twinkle <= 0) return false;
    for (const s of this.twinkles) if (s.a > 0.004) return true;
    return false;
  }

  // a new firefly somewhere in the lower sky, faded out (it fades in where it is)
  _spawn(f, initial = false) {
    const R = this.rand, W = this.W || 390, H = this.H || 844;
    f.x = 20 + R() * Math.max(1, W - 40);
    f.y = H * (0.34 + R() * 0.42);
    f.th = R() * TAU;
    f.v = 3 + R() * 6;
    f.life = 14 + R() * 14;
    f.age = initial ? R() * 6 : 0;
    f.seen = 0;
    f.nextGlint = GLINT.every[0] + R() * (GLINT.every[1] - GLINT.every[0]);
    f.glint = 0; f.glintT = -1; f.attractT = 0;
    return f;
  }

  _moveFireflies(dt, n) {
    const W = this.W, H = this.H, b = this.body, drift = this.rules.drift, R = this.rand;
    if (!W || !H) return false;
    let any = false;
    for (let i = 0; i < this.fireflies.length; i++) {
      const f = this.fireflies[i], want = i < n;
      if (!want && f.a <= 0) continue;
      any = true;
      // life: fade in for 2 s, live, fade out for 2 s, come back somewhere else
      f.age += dt;
      const lifeA = want ? clamp(Math.min(f.age / 2, (f.life - f.age) / 2), 0, 1) : 0;
      f.seen = want ? Math.min(1, f.seen + dt / XFADE_S) : Math.max(0, f.seen - dt / XFADE_S);
      f.a = Math.min(lifeA, f.seen);
      if (want && f.age >= f.life) { this._spawn(f); continue; }
      // glint: ≤ 15 % brighter, rising over 0.6 s and falling over 0.9 s
      f.nextGlint -= dt;
      if (f.nextGlint <= 0 && f.glintT < 0) {
        f.glintT = 0; f.nextGlint = GLINT.every[0] + R() * (GLINT.every[1] - GLINT.every[0]);
        if (want && f.a > 0.4) this.onGlint?.(i);
      }
      if (f.glintT >= 0) {
        f.glintT += dt;
        const t = f.glintT;
        f.glint = t < GLINT.rise ? t / GLINT.rise : Math.max(0, 1 - (t - GLINT.rise) / GLINT.fall);
        if (t >= GLINT.rise + GLINT.fall) { f.glintT = -1; f.glint = 0; }
      }
      if (drift <= 0) continue;
      // wander, keep clear of the Mallow, drift toward a finger while asked
      f.th += (R() - 0.5) * dt * 1.6;
      let tx = Math.cos(f.th), ty = Math.sin(f.th);
      if (f.attractT > 0) {
        f.attractT -= dt;
        const dx = f.ax - f.x, dy = f.ay - f.y, l = Math.hypot(dx, dy) || 1;
        if (l > 14) { tx = dx / l; ty = dy / l; f.th = Math.atan2(ty, tx); }
      }
      if (b.w > 0) {
        const ex = (f.x - b.cx) / (b.w * 0.5 + 28), ey = (f.y - b.mid) / (b.h * 0.5 + 28);
        if (ex * ex + ey * ey < 1) { const l = Math.hypot(ex, ey) || 1; tx = ex / l; ty = ey / l; f.th = Math.atan2(ty, tx); }
      }
      const top = H * 0.3, bottom = Math.min(H - 12, (b.bottom || H * 0.8) - 6);
      if (f.x < 16) tx = Math.abs(tx); else if (f.x > W - 16) tx = -Math.abs(tx);
      if (f.y < top) ty = Math.abs(ty); else if (f.y > bottom) ty = -Math.abs(ty);
      const v = Math.min(FIREFLY_SPEED, f.v * drift);
      f.x += tx * v * dt; f.y += ty * v * dt;
      if (v > this.maxSpeed) this.maxSpeed = v;
    }
    return any;
  }

  _moveClouds(dt) {
    const drift = this.rules.drift, W = this.W || 1;
    let any = false;
    for (const c of this.clouds) {
      if (c.a <= 0) continue;
      any = true;
      if (drift <= 0) continue;
      c.x += (c.v * drift * dt) / W;
      if ((c.x * W) - c.w * 0.8 > W) c.x = -c.w * 0.8 / W;
    }
    return any;
  }
}
