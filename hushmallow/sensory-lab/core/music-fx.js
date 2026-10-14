// Music light for Hushbeat Symphony: what the music looks like. Items for
// the shared EffectsLayer (core/effects.js): step(dt) is pure motion, draw()
// paints with cached sprites only (glowSprite, plus one ring sprite per halo),
// so nothing allocates per frame.
//
//   BeadPool / NoteBead  a soft bead of light per note, rising from the finger
//                        (or the mouth during a replay); a fixed pool per tier
//   BeatGlow             the floor glow under a Mallow: widens with the bass,
//                        swells on its beats (it carries the beat in reduced motion)
//   PhraseRibbon         a tapering trail behind a stroking finger (Float32Array
//                        ring), with a little swell on every phrase note
//   HarmonyArc           an arc of light between two heads in a duet: a pulse on
//                        each harmony, a steady glow while the hums bloom
//   BreathHalo           the faint ring the Mallow breathes inside: its swell is
//                        the tempo (one breath = four bars); it dissolves toward the floor
//
// Photosafe (spec §8, SHARED C6): no full-screen light, beads r ≤ 14 px and
// alpha ≤ 0.5, the floor glow ≤ 0.18, and every brightening swells over at
// least 300 ms. A bead that would be bright (r ≥ 10 and alpha ≥ 0.4) or an
// arc pulse must pass the screen's one FlashGate (≤ 3 bright events a second,
// shared with the realm's pulses); a refused one is drawn at half strength.
// Light backdrops paint over ('source-over') with a soft dark rim instead of
// adding light, so everything stays visible on a bright sky.

import { clamp, smoothstep, approach, TAU } from './math.js';
import { glowSprite, glowBlend, rgba } from './effects.js';

/** Beads alive at once per tier (reduced motion: 3); ribbon points; arc segments. */
export const POOL = Object.freeze({ high: 12, medium: 8, low: 5, reduced: 3 });
export const RIBBON = Object.freeze({ high: 48, medium: 32, low: 20 });
export const ARC = Object.freeze({ high: 32, medium: 24, low: 16 });
export const BEAD = Object.freeze({ rMax: 14, aMax: 0.5, brightR: 10, brightA: 0.4, life: 1.2, rise: 56, swell: 0.3 });
export const GLOW_MAX = 0.18;      // the floor glow's alpha, at most
export const KICK_GAP = 0.6;       // s between floor-glow swells, at least
const RIM = '#1a1440';
const HALO_R = 32, CORE_R = 12, FLOOR_R = 48, DOT_R = 10;   // sprite radii (drawn scaled)

const light = (tone) => tone === 'light';

// ------------------------------------------------------------ note bead --
/** One bead of light. reset() reuses it; step() is pure motion (no drawing). */
export class NoteBead {
  constructor(o = null) {
    this.alive = false;
    this.x = 0; this.y = 0; this.alpha = 0; this.stretch = 1;
    if (o) this.reset(o);
  }

  /**
   * x, y: start (CSS px); r: core radius (≤ 14); a: peak alpha (≤ 0.5); rise: px over its life
   * (none when reduced); drift: sideways sway in px; id / hz: the note (a bend stretches it).
   */
  reset({ x = 0, y = 0, r = 8, a = 0.4, color = '#ffffff', rise = BEAD.rise, life = BEAD.life, reduced = false, drift = 0, id = null, hz = 0, slot = 0 } = {}) {
    this.x0 = x; this.y0 = y; this.x = x; this.y = y;
    this.r = clamp(r, 1, BEAD.rMax); this.a = clamp(a, 0, BEAD.aMax);
    this.color = color; this.rise = reduced ? 0 : rise; this.drift = reduced ? 0 : drift;
    this.life = Math.max(0.2, life); this.reduced = !!reduced;
    this.id = id; this.hz = hz; this.slot = slot;
    this.age = 0; this.stretch = 1; this.stretchT = 1; this.alpha = this.a * 0.35;
    this.alive = true;
    return this;
  }

  /** Bright enough to count against the flash budget. */
  get bright() { return this.r >= BEAD.brightR && this.a >= BEAD.brightA; }

  /** Rises with an ease-out (in place when reduced), swells to full over 0.3 s, fades; false once gone. */
  step(dt) {
    if (!this.alive) return false;
    this.age += dt;
    if (this.age >= this.life) { this.alive = false; this.alpha = 0; return false; }
    const k = this.age / this.life, e = 1 - (1 - k) ** 3;
    this.y = this.y0 - this.rise * e;
    this.x = this.x0 + this.drift * Math.sin(k * Math.PI);
    // seen in the same frame as the note (at 35 %), never a flash: the light swells over ≥ 0.3 s
    const up = Math.min(1, this.age / BEAD.swell);
    this.alpha = this.a * (0.35 + 0.65 * up * up * (3 - 2 * up)) * (1 - smoothstep(0.45, 1, k));
    this.stretch = approach(this.stretch, this.stretchT, 0.05, dt);
    return true;
  }
}

/**
 * A fixed pool of beads (one EffectsLayer item that never dies). spawn() reuses a
 * free bead, else the oldest; the cap shrinks with the quality tier, never grows.
 */
export class BeadPool {
  constructor({ cap = POOL.high, tone = 'dark', gate = null, reduced = false } = {}) {
    this.beads = Array.from({ length: Math.max(1, cap) }, () => new NoteBead());
    this.tierCap = this.beads.length;
    this.tone = tone;
    this.gate = gate;
    this.setReduced(reduced);
  }

  /** Quality tier: a smaller pool (it never grows back). */
  setCap(n) {
    this.tierCap = clamp(Math.round(n) || 1, 1, this.tierCap);
    this.cap = this.reduced ? Math.min(POOL.reduced, this.tierCap) : this.tierCap;
    for (let i = this.cap; i < this.beads.length; i++) this.beads[i].alive = false;
  }

  setReduced(b) { this.reduced = !!b; this.setCap(this.tierCap); }

  /** A new bead (see NoteBead.reset); a bright one must pass the flash gate, else it shows at half strength. */
  spawn(o) {
    let b = null;
    for (let i = 0; i < this.cap; i++) {
      const x = this.beads[i];
      if (!x.alive) { b = x; break; }
      if (!b || x.age > b.age) b = x;
    }
    b.reset(o);
    if (this.reduced) { b.reduced = true; b.rise = 0; b.drift = 0; }
    if (b.bright && this.gate && !this.gate.allow('bead')) { b.a *= 0.5; b.alpha *= 0.5; }
    return b;
  }

  /** A held note bends to hz: its bead stretches upward (up to 1.8×); unbend() springs it back. */
  bend(id, hz) {
    for (const b of this.beads) if (b.alive && b.id === id && b.hz > 0) b.stretchT = clamp(1 + 2.4 * Math.log2(Math.max(1, hz / b.hz)), 1, 1.8);
  }

  unbend(id) { for (const b of this.beads) if (b.alive && b.id === id) b.stretchT = 1; }

  get alive() { let n = 0; for (const b of this.beads) if (b.alive) n++; return n; }

  clear() { for (const b of this.beads) b.alive = false; }

  step(dt) { for (const b of this.beads) if (b.alive) b.step(dt); return !this.gone; }

  draw(g, L) {
    const lt = light(this.tone), dpr = L?.dpr || 1, B = this.beads;
    let any = false;
    // a soft halo that adds light on a dark sky (painted over, with a rim, on a light one)…
    for (const b of B) {
      if (!b.alive || b.alpha <= 0.004) continue;
      if (!any) { g.save(); g.globalCompositeOperation = glowBlend(this.tone); any = true; }
      const R = b.r * 2.1, st = b.stretch;
      g.globalAlpha = b.alpha * (lt ? 0.4 : 0.5);
      g.drawImage(glowSprite(b.color, HALO_R, { dpr, rim: lt }), b.x - R, b.y - R - R * (st - 1), 2 * R, 2 * R * st);
    }
    if (!any) return;
    // …and a coloured droplet with a bright centre, painted over, so it reads on any body or sky
    g.globalCompositeOperation = 'source-over';
    for (const b of B) {
      if (!b.alive || b.alpha <= 0.004) continue;
      const r = b.r * 1.05, st = b.stretch, lift = r * (st - 1);
      g.globalAlpha = b.alpha;
      g.drawImage(glowSprite(b.color, CORE_R, { dpr, rim: true }), b.x - r, b.y - r - lift, 2 * r, 2 * r * st);
      const w = r * 0.5;
      g.globalAlpha = b.alpha * 0.7;
      g.drawImage(glowSprite('#ffffff', 6, { dpr }), b.x - w, b.y - w - lift * 0.5, 2 * w, 2 * w);
    }
    g.restore();
  }
}

// ------------------------------------------------------------ beat glow --
/** The floor glow under one Mallow (persistent). place() each frame; kick() on a beat or a bass throb. */
export class BeatGlow {
  constructor({ color = '#ffffff', tone = 'dark' } = {}) {
    Object.assign(this, { color, tone, x: 0, y: 0, w: 100 });
    this.level = 0;      // 0..1: the bass (and a hum) widen and lift it
    this.base = 0;       // 0..1: how present it is (the scene sets it from the session)
    this.boost = 1;      // 1.4 while nothing is audible (the light carries the music)
    this.k = 0; this.kT = -1; this.kRise = 0.3; this.kStr = 0; this.lastKick = -Infinity; this.t = 0;
    this.alpha = 0;
  }

  place(x, y, w) { this.x = x; this.y = y; this.w = w; }

  /** A swell that rises over riseS (≥ 0.3 s) and settles over half a second; at most one per 0.6 s. → accepted */
  kick(strength = 1, riseS = 0.3) {
    if (this.t - this.lastKick < KICK_GAP) return false;
    this.lastKick = this.t; this.kT = 0; this.kRise = Math.max(0.3, riseS); this.kStr = clamp(strength, 0, 1);
    return true;
  }

  step(dt) {
    this.t += dt;
    if (this.kT >= 0) {
      this.kT += dt;
      const r = this.kRise;
      this.k = this.kT < r ? this.kStr * smoothstep(0, r, this.kT) : this.kStr * Math.exp(-(this.kT - r) / 0.5);
      if (this.kT > r + 2.5) { this.kT = -1; this.k = 0; }
    }
    this.alpha = Math.min(GLOW_MAX, (0.05 * this.base + 0.06 * this.level + 0.07 * this.k) * this.boost);
    return !this.gone;
  }

  draw(g, L) {
    if (this.alpha < 0.004) return;
    const s = glowSprite(this.color, FLOOR_R, { dpr: L?.dpr || 1 });
    const rx = this.w * (0.5 + 0.22 * this.level + 0.08 * this.k), ry = rx * 0.2;
    g.save();
    g.globalCompositeOperation = glowBlend(this.tone);
    g.globalAlpha = this.alpha;
    g.drawImage(s, this.x - rx, this.y - ry, 2 * rx, 2 * ry);
    g.restore();
  }
}

// --------------------------------------------------------- phrase ribbon --
/** A soft tapering trail behind a stroking finger. Points live 0.9 s; the ring holds `max`. */
export class PhraseRibbon {
  constructor({ color = '#ffffff', tone = 'dark', max = RIBBON.high, reduced = false } = {}) {
    this.color = color; this.tone = tone;
    this.cap = Math.max(4, max | 0);
    this.pts = new Float32Array(this.cap * 3);   // x, y, age
    this.head = 0; this.n = 0;
    this.bumpK = 0; this.fading = false;
    this.style = rgba(color, 1);
    this.setReduced(reduced);
  }

  /** Reduced motion: a 40 % shorter trail. */
  setReduced(b) { this.reduced = !!b; this.len = Math.max(4, Math.round(this.cap * (this.reduced ? 0.6 : 1))); this.life = this.reduced ? 0.54 : 0.9; }

  /** Quality tier: fewer points (never more). */
  setMax(n) { this.cap = clamp(n | 0, 4, this.cap); this.setReduced(this.reduced); this.n = Math.min(this.n, this.len); }

  push(x, y) {
    const P = this.pts, c = this.pts.length / 3;
    if (this.n) {
      const i = ((this.head - 1 + c) % c) * 3;
      if (Math.abs(P[i] - x) + Math.abs(P[i + 1] - y) < 3) { P[i + 2] = 0; return; }
    }
    const j = this.head * 3;
    P[j] = x; P[j + 1] = y; P[j + 2] = 0;
    this.head = (this.head + 1) % c;
    this.n = Math.min(this.n + 1, this.len);
    this.fading = false;
  }

  /** A phrase note: the newest part of the trail swells for a moment. */
  bump() { this.bumpK = 1; }
  end() { this.fading = true; }
  clear() { this.n = 0; this.fading = false; this.bumpK = 0; }
  get alive() { return this.n > 1; }

  step(dt) {
    const P = this.pts, c = P.length / 3;
    for (let i = 0; i < this.n; i++) P[((this.head - this.n + i + c) % c) * 3 + 2] += dt;
    // the oldest points expire (the trail shortens while the finger rests, and after it lifts)
    while (this.n && P[((this.head - this.n + c) % c) * 3 + 2] > this.life) this.n--;
    this.bumpK = Math.max(0, this.bumpK - dt / 0.25);
    return !this.gone;
  }

  draw(g) {
    const n = this.n;
    if (n < 2) return;
    const P = this.pts, c = P.length / 3, lt = light(this.tone), bands = Math.min(6, n - 1);
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    // a few continuous bands, tail to head (fainter and thinner toward the tail): no overlapping caps
    for (let pass = 0; pass < 2; pass++) {
      g.globalCompositeOperation = pass ? glowBlend(this.tone) : 'source-over';
      g.strokeStyle = pass ? (lt ? RIM : '#ffffff') : this.style;
      for (let k = 0; k < bands; k++) {
        const i0 = Math.floor(k * (n - 1) / bands), i1 = Math.floor((k + 1) * (n - 1) / bands);
        const f = (k + 1) / bands, last = ((this.head - n + i1 + c) % c) * 3, age = clamp(1 - P[last + 2] / this.life, 0, 1);
        const bump = this.bumpK * smoothstep(0.5, 1, f);
        const alpha = clamp((0.38 * f + 0.18 * bump) * age, 0, 0.5);
        if (alpha < 0.01) continue;
        g.globalAlpha = pass ? alpha * (lt ? 0.25 : 0.5) : alpha;
        g.lineWidth = pass ? 0.8 + 1.2 * f : 1.5 + 4 * f + 3 * bump;
        g.beginPath();
        for (let i = i0; i <= i1; i++) { const j = ((this.head - n + i + c) % c) * 3; if (i === i0) g.moveTo(P[j], P[j + 1]); else g.lineTo(P[j], P[j + 1]); }
        g.stroke();
      }
    }
    g.restore();
  }
}

// ----------------------------------------------------------- harmony arc --
/** An arc of light between two heads (duet). pulse() on a harmony (the caller gates it); hold() while blooming. */
export class HarmonyArc {
  constructor({ color = '#ffffff', tone = 'dark', segments = ARC.high } = {}) {
    Object.assign(this, { color, tone, segments: Math.max(4, segments | 0) });
    this.ax = 0; this.ay = 0; this.bx = 0; this.by = 0;
    this.k = 0; this.kT = -1; this.held = false; this.shown = 0;
  }

  place(ax, ay, bx, by) { this.ax = ax; this.ay = ay; this.bx = bx; this.by = by; }
  /** A harmony: the arc swells over 0.3 s, then settles. */
  pulse(k = 1) { this.kT = 0; this.kStr = clamp(k, 0, 1); }
  hold(on) { this.held = !!on; }
  setSegments(n) { this.segments = clamp(n | 0, 4, this.segments); }

  step(dt) {
    if (this.kT >= 0) {
      this.kT += dt;
      this.k = this.kT < 0.3 ? this.kStr * smoothstep(0, 0.3, this.kT) : this.kStr * Math.exp(-(this.kT - 0.3) / 0.6);
      if (this.kT > 4) { this.kT = -1; this.k = 0; }
    }
    this.shown = approach(this.shown, (this.held ? 0.32 : 0) + 0.45 * this.k, 0.12, dt);
    return !this.gone;
  }

  // one continuous thread of light, thickest in the middle: glow dots close enough to merge (3 px apart), each
  // dimmed by how many overlap, so the thread glows evenly instead of reading as a dotted line
  draw(g, L) {
    if (this.shown < 0.01) return;
    const s = glowSprite(this.color, DOT_R, { dpr: L?.dpr || 1, rim: light(this.tone) });
    const mx = (this.ax + this.bx) / 2, d = Math.hypot(this.bx - this.ax, this.by - this.ay);
    const my = Math.min(this.ay, this.by) - d * 0.28;
    const n = clamp(Math.ceil((d * 1.2) / 3), 8, this.segments * 3), step = (d * 1.2) / n;
    g.save();
    g.globalCompositeOperation = glowBlend(this.tone);
    for (let i = 1; i < n; i++) {
      const u = i / n, v = 1 - u;
      const x = v * v * this.ax + 2 * u * v * mx + u * u * this.bx, y = v * v * this.ay + 2 * u * v * my + u * u * this.by;
      const w = Math.sin(Math.PI * u), r = 3 + 4 * w;
      g.globalAlpha = Math.min(0.5, this.shown * w) * Math.min(1, (1.5 * step) / r);
      g.drawImage(s, x - r, y - r, 2 * r, 2 * r);
    }
    g.restore();
  }
}

// ------------------------------------------------------------ breath halo --
/** The ring the Mallow breathes inside. place() each frame; set(level, alpha); one cached ring sprite. */
export class BreathHalo {
  constructor({ color = '#ffffff', tone = 'dark' } = {}) {
    Object.assign(this, { color, tone, cx: 0, cy: 0, r0: 100 });
    this.level = 0; this.shownLevel = 0;
    this.alphaT = 0.25; this.alpha = 0;
    this.sprite = null; this._key = '';
  }

  place(cx, cy, r0) { this.cx = cx; this.cy = cy; this.r0 = r0; }
  set(level, alpha) { this.level = clamp(level, 0, 1); this.alphaT = clamp(alpha, 0, 0.6); }
  setTone(t) { this.tone = t; }

  step(dt) {
    this.shownLevel = approach(this.shownLevel, this.level, 0.12, dt);
    this.alpha = approach(this.alpha, this.alphaT, 0.45, dt);   // changes of brightness take seconds
    return !this.gone;
  }

  /** Radius now: the breath swells it by up to 8 %. */
  get r() { return this.r0 * (1 + 0.08 * this.shownLevel); }

  draw(g, L) {
    if (this.alpha < 0.004 || this.r0 < 8) return;
    const dpr = L?.dpr || 1, bucket = Math.max(16, Math.round(this.r0 / 12) * 12);
    const key = `${this.color}|${bucket}|${dpr}|${this.tone}`;
    if (key !== this._key) {
      if (this.sprite) { this.sprite.width = 0; this.sprite.height = 0; }
      this.sprite = ringSprite(this.color, bucket, dpr, light(this.tone));
      this._key = key;
    }
    const R = this.r * RING_E;
    g.save();
    g.globalCompositeOperation = glowBlend(this.tone);
    g.globalAlpha = this.alpha;
    g.drawImage(this.sprite, this.cx - R, this.cy - R, 2 * R, 2 * R);
    g.restore();
  }

  destroy() {
    if (this.sprite) { this.sprite.width = 0; this.sprite.height = 0; }
    this.sprite = null; this._key = ''; this.gone = true;
  }
}

const RING_E = 1.14;   // the sprite's extent beyond the ring radius (its soft glow)

// a soft luminous ring with a fine bright line, dissolving across its lower third (drawn once per size)
function ringSprite(hex, R, dpr, lt) {
  const C = R * RING_E, px = Math.max(4, Math.ceil(2 * C * dpr));
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  const g = c.getContext('2d');
  if (!g) return c;
  const k = px / (2 * C);
  g.setTransform(k, 0, 0, k, 0, 0);
  const gr = g.createRadialGradient(C, C, R * 0.8, C, C, R * 1.12);   // offset o ↦ radius 0.8 R + 0.32 R·o
  gr.addColorStop(0, rgba(hex, 0));
  gr.addColorStop(0.42, rgba(hex, 0.32));
  gr.addColorStop(0.56, lt ? rgba(hex, 0.95) : rgba('#ffffff', 0.8));
  gr.addColorStop(0.64, rgba(hex, 0.55));
  gr.addColorStop(1, rgba(hex, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 2 * C, 2 * C);
  if (lt) { g.strokeStyle = 'rgba(26,20,64,0.2)'; g.lineWidth = 1.5; g.beginPath(); g.arc(C, C, R * 1.04, 0, TAU); g.stroke(); }
  g.globalCompositeOperation = 'destination-in';
  const lg = g.createLinearGradient(0, 0, 0, 2 * C);
  lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(0.55, 'rgba(0,0,0,1)'); lg.addColorStop(0.9, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, 2 * C, 2 * C);
  return c;
}
