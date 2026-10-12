// Static Storm — the charge field (pure maths, no DOM; node-tested).
//
// A coarse grid of electric charge over the play area (~512 cells, square-ish,
// e.g. 17×30 on a phone). Fast strokes deposit charge along their path;
// slow strokes and ground pulses drain it. Drained charge becomes "light":
// the world's only measure of progress, so slowing is always rewarded and
// fast movement is never punished (it just gives you more to ground).
//
//   q[i]  current charge, 0..CAP
//   f[i]  the floor: the storm's own charge. Excess above the floor (from fast
//         strokes) leaks back to it (τ 14 s); the floor itself never leaks, so
//         the storm never calms by itself — only grounding lowers it.

export const FIELD = Object.freeze({
  CELLS: 512,         // target cell count (cols × rows chosen by aspect)
  CAP: 1.5,           // max charge in a cell
  D: 0.6,             // diffusion, cells²/s
  LEAK_TAU: 14,       // s, excess charge back to the floor
  DEPOSIT: 0.9,       // charge per cell-length of fast path at fastness 1
  DEPOSIT_SIGMA: 0.8, // cells (≈ r 1.6)
  DRAIN_RATE: 2.4,    // per second at slowness 1, kernel centre
  DRAIN_SIGMA: 1.1,   // cells (≈ r 2.2)
  PULSE_RATE: 0.45,   // per second inside a ground pulse (the rim drains ×1.6)
  TARGET_FRAC: 0.62,  // light needed for completion, as a share of the starting charge
});

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

/** Small deterministic PRNG (mulberry32). */
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Grid size for a rect with about `cells` square cells. */
export function gridFor(w, h, cells = FIELD.CELLS) {
  const cols = Math.max(6, Math.round(Math.sqrt(cells * w / Math.max(1, h))));
  const rows = Math.max(6, Math.round(cells / cols));
  return { cols, rows };
}

export class ChargeField {
  /** rect {x, y, w, h} in CSS px; q0 the starting charge (0.35 + 0.5·intensity in the storm). */
  constructor({ x = 0, y = 0, w = 390, h = 690, q0 = 0.7, seed = 1, cells = FIELD.CELLS } = {}) {
    const { cols, rows } = gridFor(w, h, cells);
    this.cols = cols; this.rows = rows; this.n = cols * rows;
    this.q = new Float32Array(this.n);
    this.f = new Float32Array(this.n);
    this.tmp = new Float32Array(this.n);
    this.sorted = new Float32Array(this.n);
    this.light = 0;            // cumulative charge grounded (never decreases)
    this.setRect(x, y, w, h);
    const r = rng(seed * 7919 + 17);
    // a lumpy storm: low-frequency bumps so there is always somewhere brighter to go
    const bumps = [];
    for (let k = 0; k < 6; k++) bumps.push([r() * cols, r() * rows, 2.5 + r() * 4, 0.5 + r() * 0.7]);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let b = 0;
      for (const [bx, by, br, ba] of bumps) { const dx = i - bx, dy = j - by; b += ba * Math.exp(-(dx * dx + dy * dy) / (2 * br * br)); }
      const v = clamp(q0 * (0.62 + 0.5 * Math.min(1.2, b) + 0.16 * (r() - 0.5)), 0, FIELD.CAP);
      this.q[j * cols + i] = v; this.f[j * cols + i] = v;
    }
    this.start = this.total();
    this.target = Math.max(1, this.start * FIELD.TARGET_FRAC);
  }

  /** Map the grid onto a new rect (resize keeps the charge where it was, relatively). */
  setRect(x, y, w, h) {
    this.x = x; this.y = y; this.w = Math.max(1, w); this.h = Math.max(1, h);
    this.cw = this.w / this.cols; this.ch = this.h / this.rows;
    this.cell = Math.sqrt(this.cw * this.ch);
  }

  idx(i, j) { return j * this.cols + i; }
  /** Cell centre in px. */
  cx(i) { return this.x + (i + 0.5) * this.cw; }
  cy(j) { return this.y + (j + 0.5) * this.ch; }
  /** Fractional cell coordinates of a point. */
  gx(x) { return (x - this.x) / this.cw - 0.5; }
  gy(y) { return (y - this.y) / this.ch - 0.5; }

  total() { let s = 0; for (let i = 0; i < this.n; i++) s += this.q[i]; return s; }

  /** Progress: the share of the target light grounded (0..1). */
  get progress() { return clamp(this.light / this.target); }

  /** Q: mean charge of the brightest quarter of the cells (how stormy it looks). */
  storminess() {
    const s = this.sorted;
    s.set(this.q);
    s.sort();
    const k = Math.max(1, Math.floor(this.n / 4));
    let sum = 0;
    for (let i = this.n - k; i < this.n; i++) sum += s[i];
    return sum / k;
  }

  /** Gaussian-weighted mean charge around (x, y) within `rc` cells. */
  local(x, y, rc = 2) {
    const gx = this.gx(x), gy = this.gy(y);
    const sig2 = 2 * (rc * 0.5) * (rc * 0.5);
    let sw = 0, sq = 0;
    const i0 = Math.max(0, Math.floor(gx - rc)), i1 = Math.min(this.cols - 1, Math.ceil(gx + rc));
    const j0 = Math.max(0, Math.floor(gy - rc)), j1 = Math.min(this.rows - 1, Math.ceil(gy + rc));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = i - gx, dy = j - gy, w = Math.exp(-(dx * dx + dy * dy) / sig2);
      sw += w; sq += w * this.q[j * this.cols + i];
    }
    return sw > 0 ? sq / sw : 0;
  }

  /** Splat `amount` of charge at (x, y) in a Gaussian (σ in cells). Returns the charge added. */
  splat(x, y, amount, sigma = FIELD.DEPOSIT_SIGMA) {
    if (amount <= 0) return 0;
    const gx = this.gx(x), gy = this.gy(y), R = sigma * 2.5, s2 = 2 * sigma * sigma;
    const i0 = Math.max(0, Math.floor(gx - R)), i1 = Math.min(this.cols - 1, Math.ceil(gx + R));
    const j0 = Math.max(0, Math.floor(gy - R)), j1 = Math.min(this.rows - 1, Math.ceil(gy + R));
    // normalise so the same amount is added wherever the splat lands (edges too)
    let sw = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = i - gx, dy = j - gy; sw += Math.exp(-(dx * dx + dy * dy) / s2); }
    if (sw <= 0) return 0;
    let added = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = i - gx, dy = j - gy, w = Math.exp(-(dx * dx + dy * dy) / s2) / sw;
      const k = j * this.cols + i, before = this.q[k];
      this.q[k] = Math.min(FIELD.CAP, before + amount * w);
      added += this.q[k] - before;
    }
    return added;
  }

  /** Fast stroke from (x0,y0) to (x1,y1) at fastness k (0..2). Returns the charge added. */
  deposit(x0, y0, x1, y1, k) {
    if (k <= 0) return 0;
    const len = Math.hypot(x1 - x0, y1 - y0) / this.cell; // in cell lengths
    if (len <= 1e-4) return 0;
    const n = Math.max(1, Math.ceil(len * 2));
    const per = (FIELD.DEPOSIT * k * len) / n;
    let added = 0;
    for (let s = 1; s <= n; s++) { const t = s / n; added += this.splat(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, per); }
    return added;
  }

  /**
   * Drain around (x, y) for dt seconds at `rate` per second (kernel centre), σ in cells.
   * `mul` scales the rate (e.g. ×1.8 near the Thought Mallow while circling it).
   * Grounded charge becomes light. Calls onCell(i, j, amount) for visuals. Returns the amount drained.
   */
  drain(x, y, rate, dt, sigma = FIELD.DRAIN_SIGMA, onCell = null) {
    if (rate <= 0 || dt <= 0) return 0;
    const gx = this.gx(x), gy = this.gy(y), R = sigma * 2.5, s2 = 2 * sigma * sigma;
    const i0 = Math.max(0, Math.floor(gx - R)), i1 = Math.min(this.cols - 1, Math.ceil(gx + R));
    const j0 = Math.max(0, Math.floor(gy - R)), j1 = Math.min(this.rows - 1, Math.ceil(gy + R));
    let out = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = i - gx, dy = j - gy, w = Math.exp(-(dx * dx + dy * dy) / s2);
      const k = j * this.cols + i, d = Math.min(this.q[k], rate * w * dt);
      if (d <= 0) continue;
      this.q[k] -= d;
      if (this.f[k] > this.q[k]) this.f[k] = this.q[k];
      out += d;
      if (onCell && d > 0.002) onCell(i, j, d);
    }
    this.light += out;
    return out;
  }

  /** A ground pulse: drain inside radius r (px) with a soft rim. Returns the amount drained. */
  drainDisk(x, y, r, rate, dt, onCell = null) {
    if (r <= 0 || rate <= 0 || dt <= 0) return 0;
    const rc = r / this.cell, gx = this.gx(x), gy = this.gy(y);
    const i0 = Math.max(0, Math.floor(gx - rc - 1)), i1 = Math.min(this.cols - 1, Math.ceil(gx + rc + 1));
    const j0 = Math.max(0, Math.floor(gy - rc - 1)), j1 = Math.min(this.rows - 1, Math.ceil(gy + rc + 1));
    let out = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d0 = Math.hypot(i - gx, j - gy);
      const w = clamp(rc + 0.6 - d0) * (d0 > rc - 1.2 ? 1.6 : 1); // the travelling rim drains a little harder
      if (w <= 0) continue;
      const k = j * this.cols + i, d = Math.min(this.q[k], rate * w * dt);
      if (d <= 0) continue;
      this.q[k] -= d;
      if (this.f[k] > this.q[k]) this.f[k] = this.q[k];
      out += d;
      if (onCell && d > 0.002) onCell(i, j, d);
    }
    this.light += out;
    return out;
  }

  /** Drain an amount directly into light (postcards and the Thought Mallow hold their own charge). */
  addLight(amount) { if (amount > 0) this.light += amount; }

  /** Diffusion + excess leak. Never creates light, never lowers the floor. */
  step(dt) {
    if (dt <= 0) return;
    const { cols, rows, q, f, tmp } = this;
    const a = Math.min(0.24, FIELD.D * dt);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i, c = q[k];
      const l = i > 0 ? q[k - 1] : c, r = i < cols - 1 ? q[k + 1] : c;
      const u = j > 0 ? q[k - cols] : c, d = j < rows - 1 ? q[k + cols] : c;
      tmp[k] = c + a * (l + r + u + d - 4 * c);
    }
    const leak = 1 - Math.exp(-dt / FIELD.LEAK_TAU);
    for (let k = 0; k < this.n; k++) {
      let v = tmp[k];
      if (v > f[k]) v -= (v - f[k]) * leak;
      q[k] = v < 0 ? 0 : v > FIELD.CAP ? FIELD.CAP : v;
    }
  }

  /** After the storm completes: the floor sinks gently (small crackles still work). */
  quieten(dt, k = 0.35) {
    const m = 1 - Math.exp(-dt * k);
    for (let i = 0; i < this.n; i++) { this.f[i] -= this.f[i] * m; if (this.q[i] > this.f[i]) this.q[i] -= (this.q[i] - this.f[i]) * m; }
  }

  /**
   * Compact state for serialize(): the floor quantised to 36 levels as base-36 digits, in
   * chunks of 48 characters (so it passes the flow-store's id-only sanitiser), plus light.
   */
  snapshot() {
    let str = '';
    for (let i = 0; i < this.n; i++) str += Math.round((this.f[i] / FIELD.CAP) * 35).toString(36);
    const f = [];
    for (let i = 0; i < str.length; i += 48) f.push(str.slice(i, i + 48));
    return { c: this.cols, r: this.rows, f, light: Math.round(this.light * 100) / 100, target: Math.round(this.target * 100) / 100 };
  }
  restore(s) {
    const str = Array.isArray(s?.f) ? s.f.join('') : typeof s?.f === 'string' ? s.f : '';
    if (!s || s.c !== this.cols || s.r !== this.rows || str.length !== this.n) {
      if (s && Number.isFinite(s.light)) this.light = Math.max(0, s.light);
      return false;
    }
    for (let i = 0; i < this.n; i++) { const v = (parseInt(str[i], 36) / 35) * FIELD.CAP; this.f[i] = this.q[i] = Number.isFinite(v) ? v : this.f[i]; }
    if (Number.isFinite(s.light)) this.light = Math.max(0, s.light);
    if (Number.isFinite(s.target) && s.target > 0) this.target = s.target;
    return true;
  }
}
