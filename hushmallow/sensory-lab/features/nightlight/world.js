// Mallow Nightlight: the night world behind the Mallow (DOM).
//
// The world is a painted still, not a running realm: paintRealm() mounts the
// Hushfold realm into a hidden host, copies its first frame and destroys it,
// so a whole evening costs one build and one frame per scene. Brightness and
// colour temperature are baked into the still (a `multiply` fill over the raw
// paint), re-baked only when the grade moves by 0.004 or more. Two still
// canvases cross-fade (1.5 s) when the scene is repainted. If a realm cannot
// be painted (or comes out blank) the painted plain night stands in.
//
// The one exception is Ambient Drift's live window (high and medium tiers,
// Movement Gentle): a second Environment runs the realm slowly
// (reducedMotion), graded by a multiply overlay, and goStill() turns it back
// into a still (snapshot, 0.8 s cross-fade, destroy). No realm is ever
// pulsed from here, and a still cannot flash.
//
//   const world = new WorldLayer(s.wrap, { quality: ctx.quality });
//   world.resize(W, H, baseline);
//   world.setScene({ realmId, mood, transform, glow }, { instant: true });
//   world.setGrade(look.worldGrade);       // every frame: re-bakes only on real change
//
// The world box overhangs the screen by MARGIN px on every side, so Drift's
// parallax never shows an edge; ground lines are mapped into that box.

import { Environment, paintRealm, isBlank } from '../../core/environment.js';
import { clamp, rng, TAU } from '../../core/math.js';

export const MARGIN = 8;              // px the world extends past each screen edge
export const FADE_S = 1.5;            // a repaint cross-fades over this
export const STILL_S = 0.8;           // the live window settles into a still over this
export const LIVE_IN_S = 1.2;         // the still gives way to the live realm over this
export const GRADE_STEP = 0.004;      // re-bake when a channel of the grade moves this much
export const MOOD_STEP = 0.08;        // repaint when a mood axis moves this much (or on force)
export const RESIZE_PX = 8;           // repaint after a resize of at least this…
export const RESIZE_MS = 250;         // …once it has settled
const STARS = 80;

/** The still's backing DPR per lab tier: high min(device, 1.5), medium 1.25, low 1. */
export function stillDpr(quality) {
  const dev = (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) ? devicePixelRatio : 1;
  return quality === 'low' ? 1 : quality === 'medium' ? Math.min(dev, 1.25) : Math.min(dev, 1.5);
}

/** A ground line (fraction of the screen) as a fraction of the overhanging world box. */
export const boxGround = (baseline, H) => (clamp(baseline, 0.5, 0.98) * H + MARGIN) / (H + 2 * MARGIN);

function parseHex(hex) {
  const s = typeof hex === 'string' ? hex.replace('#', '') : '';
  const n = /^[0-9a-f]{6}$/i.test(s) ? parseInt(s, 16) : 0xffd29a;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbaOf = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

/**
 * The painted plain night (environment 'stage', or a realm that would not
 * paint): a deep gradient, 80 seeded stars and a soft glow on the floor in the
 * light's colour. W, H in CSS px; returns a new canvas at W·dpr × H·dpr.
 */
export function paintNightStage(W, H, dpr = 1, { glow = '#ffd29a', seed = 7, groundY = 0.84 } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr));
  const g = c.getContext('2d', { alpha: false });
  if (!g) return c;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const floor = clamp(groundY, 0.5, 0.98) * H, rgb = parseHex(glow);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#04030d');
  sky.addColorStop(0.45, '#0a0920');
  sky.addColorStop(Math.min(0.95, floor / H), '#151236');
  sky.addColorStop(1, '#08071a');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  // a faint warm haze low in the sky, in the light's colour
  const haze = g.createLinearGradient(0, floor - H * 0.32, 0, floor);
  haze.addColorStop(0, rgbaOf(rgb, 0));
  haze.addColorStop(1, rgbaOf(rgb, 0.06));
  g.fillStyle = haze;
  g.fillRect(0, floor - H * 0.32, W, H * 0.32);
  // stars: seeded, so the same night every time; denser and finer near the top
  const rand = rng(seed >>> 0);
  for (let i = 0; i < STARS; i++) {
    const x = rand() * W, y = Math.pow(rand(), 1.6) * floor * 0.82, r = 0.5 + rand() * 1.1, a = 0.25 + rand() * 0.6;
    if (r > 1.25) {
      const halo = g.createRadialGradient(x, y, 0, x, y, r * 4);
      halo.addColorStop(0, `rgba(235,230,255,${(a * 0.35).toFixed(3)})`);
      halo.addColorStop(1, 'rgba(235,230,255,0)');
      g.fillStyle = halo;
      g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    }
    g.fillStyle = `rgba(240,236,255,${a.toFixed(3)})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // the floor: a soft pool of light where the Mallow sits
  g.save();
  g.translate(W / 2, floor); g.scale(1, 0.16);
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.62);
  pool.addColorStop(0, rgbaOf(rgb, 0.2));
  pool.addColorStop(0.5, rgbaOf(rgb, 0.07));
  pool.addColorStop(1, rgbaOf(rgb, 0));
  g.fillStyle = pool;
  g.beginPath(); g.arc(0, 0, W * 0.62, 0, TAU); g.fill();
  g.restore();
  return c;
}

const div = (cls, style) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); Object.assign(d.style, style); return d; };
const BOX = { position: 'absolute', left: `${-MARGIN}px`, top: `${-MARGIN}px`, right: `${-MARGIN}px`, bottom: `${-MARGIN}px` };
const FILL = { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' };

export class WorldLayer {
  /**
   * @param {HTMLElement} wrap  the stage-wrap (s.wrap): black, behind everything
   * @param {{quality?:string}} [o]
   */
  constructor(wrap, { quality = 'medium' } = {}) {
    this.wrap = wrap;
    this.quality = quality;
    this.root = div('nl-world', { ...BOX, pointerEvents: 'none', willChange: 'transform' });
    this.live = div('nl-live', { ...FILL, isolation: 'isolate' });
    this.live.hidden = true;
    this.gradeEl = div('nl-grade', { ...FILL, mixBlendMode: 'multiply', background: 'rgb(255,255,255)' });
    this.slots = ['a', 'b'].map((k) => {
      const canvas = document.createElement('canvas');
      canvas.className = `nl-still ${k}`;
      canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, FILL, { opacity: '0' });
      return { canvas, g: null, raw: null, bake: [-1, -1, -1] };
    });
    this.host = div('nl-paint', { ...BOX, visibility: 'hidden', pointerEvents: 'none', overflow: 'hidden' });
    this.root.append(this.live, this.slots[0].canvas, this.slots[1].canvas);
    wrap.append(this.root, this.host);
    this.front = -1;             // the slot that is (or is becoming) the visible still
    this.scene = null;           // { realmId, mood, transform, glow }
    this.painted = null;         // the mood the front still was painted at
    this.plain = false;          // the front still is the painted plain night
    this.W = 0; this.H = 0; this.baseline = 0.84;
    this.gain = [1, 1, 1];
    this.env = null;
    this.drift = { x: 0, y: 0 };
    this.paints = 0; this.bakes = 0; this.fallbacks = 0;
    this._timers = new Set();
    this._resizeT = 0;
    this._stilling = null;       // the live Environment while it settles into its still (goStill is idempotent)
    this._stillT = 0;
    this._sample = null;
  }

  get isLive() { return !!this.env?.realm; }
  /** The live realm is settling into its still (it closes when the cross-fade ends). */
  get stilling() { return !!this._stilling && this._stilling === this.env; }
  /** The realm the scene asks for (null: the plain night). */
  get realmId() { return this.scene ? this.scene.realmId : null; }
  get dpr() { return stillDpr(this.quality); }

  setQuality(q) { this.quality = q; }

  /** Lay out for a stage of W × H with the Mallow's ground at `baseline`. Repaints (debounced) after a real change. */
  resize(W, H, baseline = this.baseline) {
    if (!(W > 0 && H > 0)) return;
    const first = !this.W;
    const moved = Math.abs(W - this.W) >= RESIZE_PX || Math.abs(H - this.H) >= RESIZE_PX || Math.abs(baseline * H - this.baseline * this.H) >= RESIZE_PX;
    if (!first && !moved) return;
    this.W = W; this.H = H; this.baseline = baseline;
    if (first || !this.scene) return;
    clearTimeout(this._resizeT);
    this._resizeT = setTimeout(() => {
      this._resizeT = 0;
      if (this.destroyed || !this.scene) return;
      if (this.isLive) this.env.remount({ groundY: boxGround(this.baseline, this.H) });
      else this._repaint(0);
    }, RESIZE_MS);
  }

  /**
   * Paint a scene and show it: at once with { instant }, else cross-fading
   * over FADE_S. While the live window is open, a new mood goes to the live
   * realm instead (a new realm closes the window first).
   */
  setScene({ realmId = null, mood = null, transform = 0, glow = '#ffd29a' } = {}, { instant = false } = {}) {
    const same = this.scene && this.scene.realmId === realmId;
    this.scene = { realmId, mood: mood ? { ...mood } : null, transform, glow };
    if (this.isLive) {
      if (same) { if (mood) this.env.setMood(mood); this.env.transform(transform); return true; }
      this._closeLive();
    }
    return this._repaint(instant || this.front < 0 ? 0 : FADE_S);
  }

  /**
   * Merge mood axes into the scene; repaint (cross-fade) only when an axis
   * moved by MOOD_STEP or more since the last paint, or with { force }.
   */
  setMood(partial, { force = false, instant = false } = {}) {
    if (!this.scene || !this.scene.mood || !partial) return false;
    const m = this.scene.mood;
    for (const k in partial) if (typeof partial[k] === 'number' && Number.isFinite(partial[k])) m[k] = clamp(partial[k], 0, 1);
    if (this.isLive) { this.env.setMood(m); return false; }
    const p = this.painted;
    let big = force || !p;
    if (!big) for (const k in m) if (Math.abs(m[k] - (p[k] ?? m[k])) >= MOOD_STEP) { big = true; break; }
    return big ? this._repaint(instant ? 0 : FADE_S) : false;
  }

  /** The world grade [r, g, b] (gains × worldB). Re-bakes when a channel moved ≥ 0.004, or with { force }. */
  setGrade(gain, { force = false } = {}) {
    const G = this.gain;
    let moved = force;
    for (let i = 0; i < 3; i++) { const v = clamp(+gain[i] || 0, 0, 1); if (Math.abs(v - G[i]) >= GRADE_STEP) moved = true; }
    if (!moved) return false;
    for (let i = 0; i < 3; i++) G[i] = clamp(+gain[i] || 0, 0, 1);
    if (this.isLive) this.gradeEl.style.background = this._rgb();
    for (const s of this.slots) if (s.raw && s.canvas.style.opacity !== '0') this._bake(s);
    return true;
  }

  /** Drift's parallax: slide the whole world (live or still) by up to ±(MARGIN − 1) px. */
  setDrift(dx, dy) {
    const x = clamp(dx || 0, 1 - MARGIN, MARGIN - 1), y = clamp(dy || 0, 1 - MARGIN, MARGIN - 1);
    if (Math.abs(x - this.drift.x) < 0.1 && Math.abs(y - this.drift.y) < 0.1) return;
    this.drift.x = x; this.drift.y = y;
    this.root.style.transform = x || y ? `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)` : '';
  }

  /**
   * Open Drift's live window: the scene's realm, running slowly (reduced
   * motion), graded by a multiply overlay; the still gives way over 1.2 s.
   * quality: the lab tier ('high' runs the realm 'auto', anything else 'low').
   */
  goLive({ quality = this.quality } = {}) {
    if (this.isLive || this.destroyed || !this.scene?.realmId || !this.W) return false;
    this._clearTimers();
    const env = new Environment(this.live, { reducedMotion: true, quality: quality === 'high' ? 'high' : 'low' });
    try {
      env.mount(this.scene.realmId, { mood: this.scene.mood, transform: this.scene.transform, groundY: boxGround(this.baseline, this.H) });
    } catch {
      env.destroy();
      return false;
    }
    this.env = env;
    this.gradeEl.style.background = this._rgb();
    this.live.append(this.gradeEl);
    this.live.hidden = false;
    for (const s of this.slots) {   // every still steps aside (an interrupted cross-fade may have left two showing)
      if (s.canvas.style.opacity === '0') continue;
      s.canvas.style.transition = s === this.slots[this.front] ? `opacity ${LIVE_IN_S}s ease` : 'none';
      s.canvas.style.opacity = '0';
    }
    return true;
  }

  /** Close the live window: its current frame becomes the next still (0.8 s), then the realm is destroyed. */
  goStill() {
    if (!this.isLive) return false;
    if (this.stilling) return true;   // already settling: one snapshot, one cross-fade (a caller may ask every frame)
    const raw = this.env.snapshot({ dpr: this.dpr });
    const env = this.env;
    if (!raw || isBlank(raw)) { this._closeLive(); return this._repaint(STILL_S); }
    const i = this.front < 0 ? 0 : 1 - this.front;
    const slot = this.slots[i];
    slot.raw = raw;
    this.painted = this.scene.mood ? { ...this.scene.mood } : null;
    this.plain = false;
    this._bake(slot);
    this._stilling = env;
    this._show(i, STILL_S);
    // its own timer: a repaint meanwhile (a resize, a new Light) clears the cross-fade timers, never this close
    clearTimeout(this._stillT);
    this._stillT = setTimeout(() => { this._stillT = 0; if (!this.destroyed && this.env === env) this._closeLive(); }, STILL_S * 1000 + 60);
    return true;
  }

  /** 32×32 mean relative luminance and blue/red ratio of what is shown (tests). */
  sample() {
    const f = this.slots[this.front];
    const live = this.isLive && (!f || f.canvas.style.opacity === '0');
    const src = live ? this.env.realm.canvas : f?.canvas;
    if (!src || !src.width) return null;
    const c = this._sample || (this._sample = document.createElement('canvas'));
    c.width = 32; c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data, G = this.gain;
    let L = 0, r = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i] * (live ? G[0] : 1), Gc = d[i + 1] * (live ? G[1] : 1), B = d[i + 2] * (live ? G[2] : 1);
      L += 0.2126 * lin(R) + 0.7152 * lin(Gc) + 0.0722 * lin(B);
      r += R; b += B;
    }
    return { lum: L / 1024, br: r > 0 ? b / r : 0, live };
  }

  debug() {
    return { realmId: this.realmId, live: this.isLive, plain: this.plain, front: this.front, paints: this.paints, bakes: this.bakes,
      fallbacks: this.fallbacks, W: this.W, H: this.H, dpr: this.dpr, grade: this.gain.map((v) => +v.toFixed(3)), drift: { ...this.drift } };
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this._resizeT); clearTimeout(this._stillT);
    this._clearTimers();
    this.env?.destroy();
    this.env = null;
    for (const s of this.slots) { s.raw = null; s.canvas.width = 0; s.canvas.height = 0; }
    if (this._sample) { this._sample.width = 0; this._sample = null; }
    this.root.remove();
    this.host.remove();
  }

  // ------------------------------------------------------------ inside --
  _rgb() { const G = this.gain; return `rgb(${Math.round(G[0] * 255)},${Math.round(G[1] * 255)},${Math.round(G[2] * 255)})`; }

  _paint() {
    const sc = this.scene, W = this.W + 2 * MARGIN, H = this.H + 2 * MARGIN, dpr = this.dpr, gy = boxGround(this.baseline, this.H);
    let raw = null;
    if (sc.realmId) {
      raw = paintRealm(this.host, sc.realmId, { mood: sc.mood, transform: sc.transform, groundY: gy, dpr, quality: this.quality === 'low' ? 'low' : 'auto' });
      if (raw && isBlank(raw)) raw = null;
      if (!raw) this.fallbacks++;
    }
    this.plain = !raw;
    if (!raw) raw = paintNightStage(W, H, dpr, { glow: sc.glow, groundY: gy });
    this.paints++;
    return raw;
  }

  _repaint(secs) {
    if (!this.scene || !this.W || this.destroyed) return false;
    const i = this.front < 0 ? 0 : 1 - this.front;
    const slot = this.slots[i];
    slot.raw = this._paint();
    this.painted = this.scene.mood ? { ...this.scene.mood } : null;
    this._bake(slot);
    this._show(i, secs);
    return true;
  }

  _bake(slot) {
    const c = slot.canvas, raw = slot.raw;
    if (!raw) return;
    if (c.width !== raw.width || c.height !== raw.height) { c.width = raw.width; c.height = raw.height; slot.g = null; }
    const g = slot.g || (slot.g = c.getContext('2d', { alpha: false }));
    if (!g) return;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(raw, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = this._rgb();
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 3; k++) slot.bake[k] = this.gain[k];
    this.bakes++;
  }

  // bring slot i to the top and fade it in over `secs`; the old one goes once it is covered
  _show(i, secs, done = null) {
    this._clearTimers();
    const inc = this.slots[i], out = this.front >= 0 && this.front !== i ? this.slots[this.front] : null;
    inc.canvas.style.zIndex = '2';
    if (out) out.canvas.style.zIndex = '1';
    inc.canvas.style.transition = 'none';
    if (secs > 0 && inc.canvas.style.opacity !== '0') { inc.canvas.style.opacity = '0'; }
    void inc.canvas.offsetWidth;   // commit opacity 0 before the transition starts
    inc.canvas.style.transition = secs > 0 ? `opacity ${secs}s ease` : 'none';
    inc.canvas.style.opacity = '1';
    this.front = i;
    const finish = () => {
      if (out) { out.canvas.style.transition = 'none'; out.canvas.style.opacity = '0'; out.raw = null; }
      done?.();
    };
    if (secs > 0) this._later(secs * 1000 + 60, finish); else finish();
  }

  _closeLive() {
    clearTimeout(this._stillT); this._stillT = 0; this._stilling = null;
    this.env?.destroy();
    this.env = null;
    this.gradeEl.remove();
    this.live.hidden = true;
    const f = this.slots[this.front];
    if (f && f.canvas.style.opacity === '0' && f.raw) { this._bake(f); f.canvas.style.transition = 'none'; f.canvas.style.opacity = '1'; }
  }

  _later(ms, fn) {
    const t = setTimeout(() => { this._timers.delete(t); if (!this.destroyed) fn(); }, ms);
    this._timers.add(t);
  }

  _clearTimers() { for (const t of this._timers) clearTimeout(t); this._timers.clear(); }
}

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
