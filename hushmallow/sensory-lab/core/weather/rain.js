// Weather Weaver — rain you can catch and redirect (pure; no DOM).
//
// Drops fall from the cloud deck, in proportion to each column's cover (so the
// rain stops under a gap) and only once the deck is thick enough. A resting
// finger grows a glass bead (an "orb"): drops within 90 px curve in and merge
// (r = 10 + 3√n). Let go with a fling up, or inside the deck, and the bead
// rises into the cloud as light and the rain thins (level − min(0.2, 0.025·n));
// let go lower and it falls: onto the Mallow, the water or the ground. A bead
// held above the Mallow shelters it. A swipe sweeps nearby drops along its
// path and leans the rain for a moment.
//
// Events (sim.emit(type, x, y, k)): 'merge' (k = n), 'hit-body', 'land-water',
// 'land-ground' (near drops only), 'orb-up' (k = n), 'splash-body' |
// 'splash-water' | 'splash-ground' (a released bead landing, k = n).

import { clamp, smoothstep, rng } from '../math.js';
import { SimBase, segDist2 } from './field.js';

export const POOL = { high: 140, medium: 90, low: 50 };
export const ORB_REACH = 90, SWEEP_REACH = 50, FLING_UP = 700, LEAN_TAU = 1.5, WET_TAU = 25;
export const ORB_FULL = 48;        // a full bead (r ≈ 31 px) keeps sheltering but stops growing
export const orbRadius = (n) => 10 + 3 * Math.sqrt(n);
const ORBS = 3, CAPTURE_V = 420;
const LAND = ['', 'splash-body', 'splash-water', 'splash-ground'];

export class RainField extends SimBase {
  /** @param {{tier?:string, seed?:number, lagoon?:boolean}} [o]  lagoon: the realm paints most of the rain, so the lab runs ×0.4 */
  constructor({ tier = 'medium', seed = 1, lagoon = false } = {}) {
    super();
    this.cap = POOL.high;
    this.n = POOL[tier] ?? POOL.medium;
    this.tier = tier;
    this.lagoon = !!lagoon;
    const F = (n = this.cap) => new Float32Array(n);
    this.x = F(); this.y = F(); this.vx = F(); this.vy = F(); this.z = F(); this.endY = F();
    this.on = new Uint8Array(this.cap);
    this.cap8 = new Uint8Array(this.cap);          // 1 while a bead is pulling the drop in
    this.ox = F(ORBS); this.oy = F(ORBS); this.ovx = F(ORBS); this.ovy = F(ORBS); this.oLand = F(ORBS);
    this.oN = new Uint16Array(ORBS);
    this.oState = new Uint8Array(ORBS);            // 0 free · 1 held · 2 rising as light · 3 falling
    this.oTo = new Uint8Array(ORBS);               // landing: 1 body · 2 water · 3 ground
    this.oId = new Int32Array(ORBS).fill(-1);
    this.level = 1;          // how much rain there is to catch (0..1); only beads lower it
    this.intensity = 0;      // what is falling right now (level × deck gate), for puddles and sound
    this.wet = 0;            // how wet the Mallow is (0..1)
    this.slant = 0;          // rad
    this.lean = 0;           // swipe / arrow lean on top of the wind's slant
    this.alive = 0;
    this.hits = 0;           // drops that reached the Mallow (tests, sound)
    this.t = 0;
    this._acc = 0;
    this._next = 0;
    this.rand = rng(seed);
    this.W = 390; this.H = 844; this.skyTop = 60; this.horizonY = 480; this.floorY = 700; this.deckY = 190; this.waterY = null;
    this.body = null;
    this.res = { to: null, n: 0, x: 0, y: 0 };
  }

  /** Live drop budget: the tier pool, ×0.4 in the lagoon, ×0.4 with reduced motion. */
  get active() { return Math.max(1, Math.round(this.n * (this.lagoon ? 0.4 : 1) * (this.reduced ? 0.4 : 1))); }
  setLagoon(b) { this.lagoon = !!b; return this; }
  setTier(tier) { const n = POOL[tier]; if (n && n < this.n) { this.n = n; this.tier = tier; } return this; }

  /** geo: {W, H, skyTop, horizonY, floorY, deckY?, water?: [y0, y1] | null, body?} */
  resize(geo = {}) {
    this.W = geo.W || this.W; this.H = geo.H || this.H;
    this.skyTop = geo.skyTop ?? this.skyTop; this.horizonY = geo.horizonY ?? this.horizonY; this.floorY = geo.floorY ?? this.floorY;
    this.deckY = geo.deckY ?? this.skyTop + 0.3 * (this.horizonY - this.skyTop);
    this.waterY = geo.water ? geo.water[0] : null;
    if (geo.body) this.body = geo.body;
    return this;
  }

  reset() {
    this.on.fill(0); this.cap8.fill(0); this.oState.fill(0); this.oId.fill(-1); this.oN.fill(0);
    this.level = 1; this.wet = 0; this.lean = 0; this.alive = 0; this.hits = 0; this._acc = 0; this.intensity = 0;
    return this;
  }

  // ------------------------------------------------------------- beads --
  _slot(id) { for (let o = 0; o < ORBS; o++) if (this.oState[o] === 1 && this.oId[o] === id) return o; return -1; }

  /** A resting finger starts a bead at (x, y). False when three are already held. */
  orbStart(id, x, y) {
    if (this._slot(id) >= 0) return true;
    const o = this.oState.indexOf(0);
    if (o < 0) return false;
    this.oState[o] = 1; this.oId[o] = id; this.ox[o] = x; this.oy[o] = y; this.oN[o] = 0; this.ovx[o] = this.ovy[o] = 0;
    return true;
  }

  orbMove(id, x, y) { const o = this._slot(id); if (o >= 0) { this.ox[o] = x; this.oy[o] = y; } }

  /**
   * Let a bead go with velocity (vx, vy) px/s → the reused {to: 'up'|'body'|'water'|'ground', n, x, y}, or null.
   * Up (a fling up, or let go inside the deck) thins the rain at once.
   */
  orbRelease(id, vx = 0, vy = 0) {
    const o = this._slot(id);
    if (o < 0) return null;
    const n = this.oN[o], x = this.ox[o], y = this.oy[o], b = this.body, res = this.res;
    let to;
    if (vy <= -FLING_UP || y < this.deckY) to = 'up';
    else if (b && Math.abs(x - b.cx) < b.w * 0.45 && y < b.mid) to = 'body';
    else to = this.waterY != null ? 'water' : 'ground';
    this.oId[o] = -1;
    if (to === 'up') {
      this.level = Math.max(0, this.level - Math.min(0.2, 0.025 * n));
      this.oState[o] = 2; this.ovx[o] = vx * 0.3; this.ovy[o] = Math.min(vy, -380);
    } else {
      this.oState[o] = 3; this.ovx[o] = vx * 0.4; this.ovy[o] = Math.max(vy, 0) * 0.5;
      this.oTo[o] = to === 'body' ? 1 : to === 'water' ? 2 : 3;
      this.oLand[o] = to === 'body' ? b.top + b.h * 0.15
        : to === 'water' ? Math.max(y + 24, this.waterY + (this.floorY - this.waterY) * 0.55) : Math.max(y + 24, this.floorY);
    }
    res.to = to; res.n = n; res.x = x; res.y = y;
    return res;
  }

  /** Is a held bead above the Mallow, sheltering it? */
  sheltered() {
    for (let o = 0; o < ORBS; o++) if (this.oState[o] === 1 && this._shelters(o)) return true;
    return false;
  }

  _shelters(o) {
    const b = this.body;
    return !!b && this.oy[o] < b.top + b.h * 0.2 && Math.abs(this.ox[o] - b.cx) < b.w * 0.6;
  }

  /** Number of beads held right now. */
  orbs() { let k = 0; for (let o = 0; o < ORBS; o++) if (this.oState[o] === 1) k++; return k; }

  // ------------------------------------------------------------ swipes --
  /** A swipe from (x0, y0) to (x1, y1) at (vx, vy) px/s: drops near the path take its velocity; the rain leans. */
  sweep(x0, y0, x1, y1, vx, vy) {
    const r2 = SWEEP_REACH * SWEEP_REACH;
    let k = 0;
    for (let i = 0; i < this.cap; i++) {
      if (!this.on[i] || segDist2(this.x[i], this.y[i], x0, y0, x1, y1) >= r2) continue;
      this.vx[i] += (vx - this.vx[i]) * 0.8;
      this.vy[i] += (Math.max(vy, 60) - this.vy[i]) * 0.5;
      k++;
    }
    this.lean = clamp(this.lean + clamp(vx / 1800, -0.35, 0.35), -0.5, 0.5);
    return k;
  }

  /** Arrow keys lean the rain (±0.5 rad at most). */
  nudge(dir = 1) { this.lean = clamp(this.lean + 0.25 * Math.sign(dir || 1), -0.5, 0.5); return this; }

  // -------------------------------------------------------------- step --
  /**
   * opts (pass one reused object): cover (Float32Array per column, or a number), coverK (deck presence),
   * wind (px/s), body, waterY, floorY, reduced.
   */
  step(dt, opts = {}) {
    dt = clamp(dt, 0, 0.1);
    this.t += dt;
    this._presence(dt);
    const reduced = opts.reduced ?? this.reduced, body = opts.body || this.body, wind = opts.wind || 0;
    if (opts.waterY !== undefined) this.waterY = opts.waterY;
    if (opts.floorY !== undefined) this.floorY = opts.floorY;
    const cover = opts.cover ?? 1, coverK = opts.coverK ?? 1;
    let mean = 1;
    if (typeof cover === 'number') mean = cover;
    else { mean = 0; for (let c = 0; c < cover.length; c++) mean += cover[c]; mean /= cover.length || 1; }
    const gate = smoothstep(0.45, 0.6, coverK * mean);
    this.intensity = this.level * gate * (this.target > 0 ? 1 : 0);
    this.lean *= Math.exp(-dt / LEAN_TAU);
    this.slant = clamp(Math.atan(wind / 600) * 0.5 + this.lean, -0.6, 0.6);
    this.wet *= Math.exp(-dt / WET_TAU);
    const speedK = reduced ? 0.35 : 1, active = this.active;

    // spawn: enough drops to keep about active·intensity in flight. A drop lives as long as its fall from
    // the deck to its depth's ground line (a storm's low base gives short falls: a fixed rate left a dozen
    // stray streaks where a shower belongs)
    const life = clamp(((this.horizonY + this.floorY) / 2 - this.deckY) / (540 * speedK), 0.3, 1.1);
    this._acc += (active * this.intensity / life) * dt;
    if (this.alive >= active) this._acc = Math.min(this._acc, 1);
    while (this._acc >= 1 && this.alive < active) { this._acc -= 1; this._spawn(cover, speedK, wind); }

    // drops
    const tanS = Math.tan(this.slant), relaxX = 1 - Math.exp(-dt / 0.6), relaxY = 1 - Math.exp(-dt / 0.4), home = Math.min(1, dt * 10);
    for (let i = 0; i < this.cap; i++) {
      if (!this.on[i]) continue;
      const fallV = (380 + 320 * this.z[i]) * speedK;
      let x = this.x[i], y = this.y[i], caught = false;
      for (let o = 0; o < ORBS; o++) {
        if (this.oState[o] !== 1) continue;
        const sh = this._shelters(o), rx = sh ? Math.max(ORB_REACH, body.w * 0.7) : ORB_REACH, ry = sh ? 170 : ORB_REACH;
        const dx = this.ox[o] - x, dy = this.oy[o] - y;
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) >= 1) continue;
        caught = true;
        const d = Math.hypot(dx, dy);
        if (d < orbRadius(this.oN[o]) + 6) {
          this.on[i] = 0; this.alive--;
          if (this.oN[o] < ORB_FULL) { this.oN[o]++; this.emit('merge', this.ox[o], this.oy[o], this.oN[o]); }
        } else {
          this.vx[i] += ((dx / d) * CAPTURE_V - this.vx[i]) * home;
          this.vy[i] += ((dy / d) * CAPTURE_V - this.vy[i]) * home;
        }
        break;
      }
      if (!this.on[i]) continue;
      this.cap8[i] = caught ? 1 : 0;
      if (!caught) {
        this.vx[i] += (fallV * tanS + wind * 0.25 - this.vx[i]) * relaxX;
        this.vy[i] += (fallV - this.vy[i]) * relaxY;
      }
      x += this.vx[i] * dt; y += this.vy[i] * dt;
      this.x[i] = x; this.y[i] = y;
      if (body && this.z[i] > 0.35 && this.vy[i] > 0) {
        const ex = (x - body.cx) / (body.w * 0.5), ey = (y - body.mid) / (body.h * 0.5);
        if (ex * ex + ey * ey < 1) {
          this.on[i] = 0; this.alive--; this.hits++;
          this.wet = Math.min(1, this.wet + 0.015);
          this.emit('hit-body', x, y, this.z[i]);
          continue;
        }
      }
      if (!caught && y >= this.endY[i]) {
        this.on[i] = 0; this.alive--;
        if (this.z[i] > 0.6) this.emit(this.waterY != null && this.endY[i] >= this.waterY ? 'land-water' : 'land-ground', x, this.endY[i], this.z[i]);
        continue;
      }
      if (x < -0.25 * this.W || x > 1.25 * this.W || y < -80 || y > this.H + 40 || !Number.isFinite(x + y)) { this.on[i] = 0; this.alive--; }
    }

    // released beads
    for (let o = 0; o < ORBS; o++) {
      const s = this.oState[o];
      if (s === 2) {
        this.ovy[o] -= 300 * dt; this.ovx[o] *= Math.exp(-dt / 0.5);
        this.ox[o] += this.ovx[o] * dt; this.oy[o] += this.ovy[o] * dt;
        if (this.oy[o] < Math.min(this.deckY - 60, this.skyTop)) { this.emit('orb-up', this.ox[o], this.oy[o], this.oN[o]); this.oState[o] = 0; }
      } else if (s === 3) {
        this.ovy[o] += 1400 * dt;
        this.ox[o] += this.ovx[o] * dt; this.oy[o] += this.ovy[o] * dt;
        if (this.oy[o] >= this.oLand[o]) { this.oy[o] = this.oLand[o]; this.emit(LAND[this.oTo[o]], this.ox[o], this.oy[o], this.oN[o]); this.oState[o] = 0; }
      }
    }
    return this;
  }

  _spawn(cover, speedK, wind) {
    const W = this.W, cw = W / 16;
    let x = NaN;
    for (let t = 0; t < 4; t++) {
      const cx = -0.1 * W + this.rand() * 1.2 * W;
      const c = typeof cover === 'number' ? cover : cover[clamp(Math.floor(cx / cw), 0, cover.length - 1)];
      if (this.rand() < c) { x = cx; break; }
    }
    if (Number.isNaN(x)) return;
    let i = -1;
    for (let k = 0; k < this.cap; k++) { const j = (this._next + k) % this.cap; if (!this.on[j]) { i = j; break; } }
    if (i < 0) return;
    this._next = (i + 1) % this.cap;
    const z = this.rand(), v = (380 + 320 * z) * speedK;
    this.on[i] = 1; this.alive++; this.cap8[i] = 0;
    this.z[i] = z;
    this.x[i] = x;
    this.y[i] = this.deckY - this.rand() * 30;
    this.vy[i] = v;
    this.vx[i] = v * Math.tan(this.slant) + wind * 0.25;
    this.endY[i] = this.horizonY + (this.floorY - this.horizonY) * z + (this.rand() - 0.5) * 10;
  }

  /** Every drop in flight is gone at once (the rain → starlight morph: they become the stars). */
  clearDrops() { this.on.fill(0); this.alive = 0; this._acc = 0; return this; }

  /** Live drop positions into out (x, y pairs; ≤ max), for the rain → starlight morph. Returns the count. */
  positions(out, max = out.length >> 1) {
    let k = 0;
    for (let i = 0; i < this.cap && k < max; i++) if (this.on[i]) { out[2 * k] = this.x[i]; out[2 * k + 1] = this.y[i]; k++; }
    return k;
  }

  snapshot() {
    const orbs = [];
    for (let o = 0; o < ORBS; o++) if (this.oState[o]) orbs.push({ x: Math.round(this.ox[o]), y: Math.round(this.oy[o]), n: this.oN[o], state: ['', 'held', 'rising', 'falling'][this.oState[o]] });
    return { level: +this.level.toFixed(3), intensity: +this.intensity.toFixed(3), slant: +this.slant.toFixed(3), wet: +this.wet.toFixed(3),
      alive: this.alive, active: this.active, cap: this.cap, hits: this.hits, sheltered: this.sheltered(), amount: +this.amount.toFixed(3), orbs };
  }
}
