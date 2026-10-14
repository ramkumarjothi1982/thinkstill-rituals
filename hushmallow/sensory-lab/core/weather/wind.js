// Weather Weaver — wind, silk ribbons and seed fluffs (pure; no DOM).
//
//   WindField  a coarse flow grid (px/s). A drag injects its jet; the flow
//              diffuses lightly and decays with τ 2.5 s. energy (mean speed)
//              raises the realm's agitation, turb (curl) adds to it. Each
//              stroke is also analysed: slow, smooth strokes (60–400 px/s)
//              build calm (Wind's progress); a circular path makes an eddy
//              (a vortex in the flow, event 'eddy', or 'calm-loop' when slow).
//              ambient (0..1) keeps soft gusts blowing while the Wind weather
//              is up; calm quietens them.
//   Ribbons    up to 8 verlet chains whose heads are softly anchored in the
//              sky: they bend toward a jet with spring lag, then stream.
//   Fluffs     seed fluffs riding the flow, wrapping at the edges.

import { clamp, rng, TAU } from '../math.js';
import { SimBase, noop } from './field.js';

export const FLOW = { high: [12, 8], medium: [10, 7], low: [8, 6] };
export const RIBBONS = { high: [8, 16], medium: [6, 12], low: [4, 10] };
export const FLUFFS = { high: 10, medium: 7, low: 4 };
export const WIND_TAU = 2.5, V_REF = 600, V_MAX = 1500;
export const CALM_MIN = 60, CALM_MAX = 400, CALM_RATE = 0.11;   // ≈ 9 s of slow, smooth strokes to calm the wind
const TRACKS = 3;

export class WindField {
  constructor({ tier = 'medium' } = {}) {
    const [c, r] = FLOW[tier] || FLOW.medium;
    this.cols = c; this.rows = r; this.n = c * r;
    this.vx = new Float32Array(this.n); this.vy = new Float32Array(this.n);
    this._tx = new Float32Array(this.n); this._ty = new Float32Array(this.n);
    this.W = 390; this.H = 844; this.cw = this.W / c; this.ch = this.H / r;
    this.energy = 0; this.turb = 0; this.calm = 0;
    this.ambient = 0;        // soft gusts (0..1) while the Wind weather is up
    this.gustDir = 1;
    this.bx = 0; this.by = 0;
    this.t = 0;
    this.speed = 1;
    this.emit = noop;
    const T = () => new Float32Array(TRACKS);
    this.tId = new Int32Array(TRACKS).fill(-1);
    this.tHas = new Uint8Array(TRACKS);
    this.tx = T(); this.ty = T(); this.tt = T(); this.tAng = T(); this.tDir = T(); this.tT0 = T(); this.tSx = T(); this.tSy = T(); this.tN = T();
  }

  resize({ W, H } = {}) {
    this.W = W || this.W; this.H = H || this.H;
    this.cw = this.W / this.cols; this.ch = this.H / this.rows;
    return this;
  }

  reset() {
    this.vx.fill(0); this.vy.fill(0); this.energy = this.turb = this.calm = 0; this.tId.fill(-1); this.tHas.fill(0);
    return this;
  }

  /** A jet at (x, y) with velocity (vx, vy) px/s and radius r px: nearby cells blend toward it. */
  inject(x, y, vx, vy, r = 90) {
    const { cols, rows, cw, ch } = this, r2 = r * r;
    const s = Math.hypot(vx, vy), k = s > V_MAX ? V_MAX / s : 1;
    vx *= k; vy *= k;
    for (let j = 0; j < rows; j++) {
      const dy = (j + 0.5) * ch - y;
      for (let i = 0; i < cols; i++) {
        const dx = (i + 0.5) * cw - x, d2 = dx * dx + dy * dy;
        if (d2 > 4 * r2) continue;
        const w = Math.exp(-d2 / r2) * 0.6, c = j * cols + i;
        this.vx[c] += (vx - this.vx[c]) * w;
        this.vy[c] += (vy - this.vy[c]) * w;
      }
    }
    return this;
  }

  /** A vortex at (cx, cy): tangential flow of `strength` px/s within r px (counter-clockwise when > 0). */
  swirl(cx, cy, r, strength) {
    const { cols, rows, cw, ch } = this;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const dx = (i + 0.5) * cw - cx, dy = (j + 0.5) * ch - cy, d = Math.hypot(dx, dy);
        if (d > r * 1.5 || d < 1) continue;
        const w = Math.exp(-(d * d) / (r * r)) * 0.5, c = j * cols + i;
        this.vx[c] += (-dy / d) * strength * w;
        this.vy[c] += (dx / d) * strength * w;
      }
    }
    return this;
  }

  step(dt) {
    dt = clamp(dt, 0, 0.1);
    this.t += dt;
    const { cols, rows, vx, vy, _tx: tx, _ty: ty } = this, decay = Math.exp(-dt / WIND_TAU), d = Math.min(0.25, dt * 1.5);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const c = j * cols + i, l = i > 0 ? c - 1 : c, r = i < cols - 1 ? c + 1 : c, u = j > 0 ? c - cols : c, w = j < rows - 1 ? c + cols : c;
        tx[c] = vx[c] + ((vx[l] + vx[r] + vx[u] + vx[w]) * 0.25 - vx[c]) * d;
        ty[c] = vy[c] + ((vy[l] + vy[r] + vy[u] + vy[w]) * 0.25 - vy[c]) * d;
      }
    }
    let sum = 0, curl = 0;
    for (let c = 0; c < this.n; c++) { vx[c] = tx[c] * decay; vy[c] = ty[c] * decay; sum += Math.hypot(vx[c], vy[c]); }
    for (let j = 1; j < rows - 1; j++) {
      for (let i = 1; i < cols - 1; i++) {
        const c = j * cols + i;
        curl += Math.abs((vy[c + 1] - vy[c - 1]) * 0.5 - (vx[c + cols] - vx[c - cols]) * 0.5);
      }
    }
    // ambient gusts: a soft, slowly swinging breeze that calm quietens
    const a = clamp(this.ambient, 0, 1) * (1 - this.calm), ts = this.t * this.speed;
    const g = a * V_REF * 0.5 * (0.7 + 0.3 * Math.sin(ts * 0.8)), ang = 0.25 * Math.sin(ts * 0.13);
    this.bx = Math.cos(ang) * g * this.gustDir;
    this.by = Math.sin(ang) * g * 0.3;
    this.energy = Math.min(1, (sum / this.n + Math.hypot(this.bx, this.by)) / V_REF);
    const inner = Math.max(1, (cols - 2) * (rows - 2));
    this.turb = Math.min(1, (curl / inner) * 1.5 / V_REF);
    return this;
  }

  /** Flow at (x, y) into out.vx / out.vy (px/s): bilinear over cell centres, plus the ambient gust. */
  sample(x, y, out) {
    const { cols, rows, vx, vy } = this;
    const sx = clamp(x / this.cw - 0.5, 0, cols - 1), sy = clamp(y / this.ch - 0.5, 0, rows - 1);
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(cols - 1, x0 + 1), y1 = Math.min(rows - 1, y0 + 1), fx = sx - x0, fy = sy - y0;
    const a = y0 * cols, b = y1 * cols;
    const ux = vx[a + x0] + (vx[a + x1] - vx[a + x0]) * fx, lx = vx[b + x0] + (vx[b + x1] - vx[b + x0]) * fx;
    const uy = vy[a + x0] + (vy[a + x1] - vy[a + x0]) * fx, ly = vy[b + x0] + (vy[b + x1] - vy[b + x0]) * fx;
    out.vx = ux + (lx - ux) * fy + this.bx;
    out.vy = uy + (ly - uy) * fy + this.by;
    return out;
  }

  _track(id) {
    let s = this.tId.indexOf(id);
    if (s < 0) { s = this.tId.indexOf(-1); if (s < 0) s = 0; this.tId[s] = id; this.tHas[s] = 0; this.tt[s] = -1; }
    return s;
  }

  /**
   * Path analysis for one stroke (pointer id): slow, smooth movement builds calm; a full turn
   * (2π within ~2 s) is an eddy: a vortex is added and 'eddy' (or 'calm-loop' when slow) emitted.
   * t in seconds. Returns the stroke speed (px/s).
   */
  track(x, y, t, id = 0) {
    const s = this._track(id);
    if (this.tt[s] < 0) { this.tx[s] = x; this.ty[s] = y; this.tt[s] = t; this.tT0[s] = t; this.tAng[s] = 0; this.tSx[s] = this.tSy[s] = this.tN[s] = 0; return 0; }
    const dtp = t - this.tt[s];
    if (dtp < 0.008) return 0;
    const dx = x - this.tx[s], dy = y - this.ty[s], dist = Math.hypot(dx, dy), speed = dist / dtp;
    if (dist < 3) {                              // slow strokes move < 1 px a frame: accumulate before measuring
      if (dtp >= 0.25) this.tt[s] = t;           // a resting finger restarts the clock
      return speed;
    }
    {
      const dir = Math.atan2(dy, dx);
      let turn = 0;
      if (this.tHas[s]) {
        let dA = dir - this.tDir[s];
        if (dA > Math.PI) dA -= TAU; else if (dA < -Math.PI) dA += TAU;
        this.tAng[s] += dA;
        turn = Math.abs(dA) / dtp;
      }
      this.tDir[s] = dir; this.tHas[s] = 1;
      if (speed >= CALM_MIN && speed <= CALM_MAX) this.calm = Math.min(1, this.calm + dtp * (1 - clamp(turn / 5, 0, 1)) * CALM_RATE);
      this.tSx[s] += x; this.tSy[s] += y; this.tN[s]++;
      if (Math.abs(this.tAng[s]) >= TAU) {
        const cx = this.tSx[s] / this.tN[s], cy = this.tSy[s] / this.tN[s], slow = speed <= CALM_MAX;
        this.swirl(cx, cy, 110, Math.sign(this.tAng[s]) * Math.min(V_MAX, speed * 0.8));
        if (slow) this.calm = Math.min(1, this.calm + 0.04);
        this.emit(slow ? 'calm-loop' : 'eddy', cx, cy, Math.min(1, speed / V_REF));
        this.tAng[s] = 0; this.tSx[s] = this.tSy[s] = this.tN[s] = 0; this.tT0[s] = t;
      } else if (t - this.tT0[s] > 2) {
        this.tAng[s] *= 0.5; this.tSx[s] = this.tSy[s] = this.tN[s] = 0; this.tT0[s] = t;
      }
    }
    this.tx[s] = x; this.ty[s] = y; this.tt[s] = t;
    return speed;
  }

  endTrack(id = 0) { const s = this.tId.indexOf(id); if (s >= 0) { this.tId[s] = -1; this.tHas[s] = 0; } }

  snapshot() {
    return { energy: +this.energy.toFixed(3), turb: +this.turb.toFixed(3), calm: +this.calm.toFixed(3), ambient: this.ambient, grid: [this.cols, this.rows] };
  }
}

// ---------------------------------------------------------------- ribbons --
export class Ribbons extends SimBase {
  constructor({ tier = 'medium', seed = 1 } = {}) {
    super();
    const [n, s] = RIBBONS[tier] || RIBBONS.medium;
    this.n = n; this.segs = s; this.capS = RIBBONS.high[1];
    const P = RIBBONS.high[0] * this.capS, F = (k) => new Float32Array(k);
    this.px = F(P); this.py = F(P); this.vx = F(P); this.vy = F(P); this.qx = F(P); this.qy = F(P);
    this.hx = F(8); this.hy = F(8); this.ph = F(8); this.len = F(8);
    this.rand = rng(seed);
    this.seed = seed;
    this.t = 0;
    this.W = 390; this.H = 844; this.skyTop = 60; this.horizonY = 480;
    this._s = { vx: 0, vy: 0 };
  }

  /** {W, H, skyTop, horizonY}: heads are anchored across the sky band; chains trail behind them. */
  resize({ W, H, skyTop, horizonY } = {}) {
    this.W = W || this.W; this.H = H || this.H; this.skyTop = skyTop ?? this.skyTop; this.horizonY = horizonY ?? this.horizonY;
    const rand = rng(this.seed);
    for (let i = 0; i < this.n; i++) {
      this.hx[i] = this.W * (i + 0.5) / this.n + (rand() - 0.5) * this.W * 0.08;
      this.hy[i] = this.skyTop + (this.horizonY - this.skyTop) * (0.18 + 0.64 * rand());
      this.len[i] = clamp(this.W * 0.04, 9, 22);   // long enough to read as silk currents (~150 px on a phone, low tier)
      this.ph[i] = rand() * TAU;
      this._lay(i);
    }
    return this;
  }

  _lay(i) {
    const b = i * this.capS;
    for (let j = 0; j < this.segs; j++) {
      this.px[b + j] = this.qx[b + j] = this.hx[i] - j * this.len[i] * 0.9;
      this.py[b + j] = this.qy[b + j] = this.hy[i] + Math.sin(j * 0.5 + this.ph[i]) * 3;
      this.vx[b + j] = this.vy[b + j] = 0;
    }
  }

  setTier(tier) { const t = RIBBONS[tier]; if (t && t[0] < this.n) { this.n = t[0]; this.segs = Math.min(this.segs, t[1]); } return this; }

  /** field: a WindField (or null for still air). Reduced motion: ×0.3 speed, no flutter. */
  step(dt, field = null, reduced = this.reduced) {
    dt = clamp(dt, 0, 0.05);
    if (!(dt > 0)) return this;
    this.t += dt;
    this._presence(dt);
    const sp = reduced ? 0.3 : 1, s = this._s, relax = Math.min(1, dt * 2.2), W = this.W, H = this.H;
    for (let i = 0; i < this.n; i++) {
      const b = i * this.capS, L = this.len[i];
      if (field) field.sample(this.px[b], this.py[b], s); else s.vx = s.vy = 0;
      const sway = reduced ? 0 : Math.sin(this.t * 0.9 * this.speed + this.ph[i]) * 14;
      // head: softly anchored, bent toward the jet with spring lag
      this.px[b] += ((this.hx[i] - this.px[b]) * 2.5 + s.vx * 0.25) * sp * dt;
      this.py[b] += ((this.hy[i] + sway * 0.4 - this.py[b]) * 2.5 + s.vy * 0.25) * sp * dt;
      for (let j = 1; j < this.segs; j++) {
        const k = b + j;
        if (field) field.sample(this.px[k], this.py[k], s); else s.vx = s.vy = 0;
        const flutter = reduced ? 0 : Math.sin(this.t * 2.2 + j * 0.55 + this.ph[i]) * 11 * (j / this.segs);   // a slow silk ripple, not a curl
        this.vx[k] += (s.vx * 0.9 * sp - this.vx[k]) * relax;
        this.vy[k] += (s.vy * 0.9 * sp + flutter - this.vy[k]) * relax + 4 * dt;
        this.qx[k] = this.px[k]; this.qy[k] = this.py[k];
        this.px[k] += this.vx[k] * dt; this.py[k] += this.vy[k] * dt;
      }
      // follow the leader: each link back to its length (unconditionally stable)
      for (let j = 1; j < this.segs; j++) {
        const k = b + j, dx = this.px[k] - this.px[k - 1], dy = this.py[k] - this.py[k - 1], d = Math.hypot(dx, dy) || 1e-6;
        this.px[k] = this.px[k - 1] + (dx / d) * L; this.py[k] = this.py[k - 1] + (dy / d) * L;
        this.vx[k] = (this.px[k] - this.qx[k]) / dt; this.vy[k] = (this.py[k] - this.qy[k]) / dt;
      }
      let bad = false;
      for (let j = 0; j < this.segs; j++) {
        const k = b + j;
        this.px[k] = clamp(this.px[k], -W, 2 * W); this.py[k] = clamp(this.py[k], -H, 2 * H);
        this.vx[k] = clamp(this.vx[k], -3000, 3000); this.vy[k] = clamp(this.vy[k], -3000, 3000);
        if (!Number.isFinite(this.px[k] + this.py[k] + this.vx[k] + this.vy[k])) bad = true;
      }
      if (bad) this._lay(i);
    }
    return this;
  }

  /** How much of each ribbon is unspooled (enter) or left (leave): the drawn length fraction. */
  get spool() { return this.amount; }

  snapshot() { return { n: this.n, segs: this.segs, amount: +this.amount.toFixed(3), heads: Array.from({ length: this.n }, (_, i) => [Math.round(this.px[i * this.capS]), Math.round(this.py[i * this.capS])]) }; }
}

// ----------------------------------------------------------------- fluffs --
export class Fluffs extends SimBase {
  constructor({ tier = 'medium', seed = 2 } = {}) {
    super();
    this.n = FLUFFS[tier] ?? FLUFFS.medium;
    const F = () => new Float32Array(FLUFFS.high);
    this.x = F(); this.y = F(); this.vx = F(); this.vy = F(); this.ph = F(); this.sz = F();
    this.rand = rng(seed);
    this.t = 0;
    this.W = 390; this.H = 844; this.skyTop = 60; this.floorY = 700;
    this._s = { vx: 0, vy: 0 };
  }

  resize({ W, H, skyTop, floorY } = {}) {
    this.W = W || this.W; this.H = H || this.H; this.skyTop = skyTop ?? this.skyTop; this.floorY = floorY ?? this.floorY;
    for (let i = 0; i < this.n; i++) {
      this.x[i] = this.rand() * this.W;
      this.y[i] = this.skyTop + this.rand() * Math.max(10, this.floorY - 40 - this.skyTop);
      this.vx[i] = this.vy[i] = 0; this.ph[i] = this.rand() * TAU; this.sz[i] = 0.7 + this.rand() * 0.6;
    }
    return this;
  }

  setTier(tier) { const n = FLUFFS[tier]; if (n && n < this.n) this.n = n; return this; }

  step(dt, field = null, reduced = this.reduced) {
    dt = clamp(dt, 0, 0.05);
    this.t += dt;
    this._presence(dt);
    const sp = reduced ? 0.3 : 1, k = Math.min(1, dt * 1.5), s = this._s, top = this.skyTop, bot = this.floorY - 20;
    for (let i = 0; i < this.n; i++) {
      if (field) field.sample(this.x[i], this.y[i], s); else s.vx = s.vy = 0;
      const bob = reduced ? 0 : Math.sin(this.t * 1.7 + this.ph[i]) * 10;
      this.vx[i] += (s.vx * 0.8 * sp - this.vx[i]) * k;
      this.vy[i] += (s.vy * 0.8 * sp + bob - 6 * sp - this.vy[i]) * k;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
      if (this.x[i] < -30) this.x[i] = this.W + 30; else if (this.x[i] > this.W + 30) this.x[i] = -30;
      if (this.y[i] < top) { this.y[i] = top; this.vy[i] = Math.abs(this.vy[i]); } else if (this.y[i] > bot) { this.y[i] = bot; this.vy[i] = -Math.abs(this.vy[i]); }
      if (!Number.isFinite(this.x[i] + this.y[i])) { this.x[i] = this.W / 2; this.y[i] = (top + bot) / 2; this.vx[i] = this.vy[i] = 0; }
    }
    return this;
  }

  snapshot() { return { n: this.n, amount: +this.amount.toFixed(3) }; }
}
