// Weather Weaver — stars you can gather and release (pure; no DOM).
//
//   placeStars          seeded star field: ≥ 44 px apart, off the chrome and the Mallow.
//   constellationShape  each Mallow's own constellation (deterministic slots):
//                       Glitzi a clean polygon that snaps into place, Zuzu a
//                       spiral, Pipzi a ring bloom (slow, dim fade), Boppo a
//                       bouncy arc, Blubi a glitter cascade drifting down,
//                       Loomi a slow drift line, Noomi a crescent.
//   StarSwarm           12–28 twinkling stars (≤ 1.2 Hz, amplitude ≤ 0.25). A
//                       sweep gathers stars within 56 px into an orbiting
//                       cluster at the fingertip (one per pointer, two at most).
//                       Released away from the Mallow, 3 or more fly to a
//                       constellation above it (3 kept; a 4th replaces the
//                       oldest; each takes at most a third of the stars, the
//                       rest drift home, so three can always be made); near the Mallow they shower over it as a gift
//                       and drift home. Reduced motion: no twinkle, no orbit
//                       swirl, and stars fade between places instead of flying.
//   Events: 'gather' (k = cluster size), 'constellation' (k = n), 'gift' (k = n).

import { clamp, rng, TAU } from '../math.js';
import { SimBase, scatter } from './field.js';

export const STARS = { high: 28, medium: 20, low: 12 };
export const MIN_GAP = 44, GATHER_R = 56, TWINKLE_HZ = 1.2, TWINKLE_AMP = 0.25, KEEP = 3, MIN_CONSTELLATION = 3, MAX_CONSTELLATION = 8;
export const CONSTELLATION_STYLE = Object.freeze({
  glitzi: Object.freeze({ style: 'snap', shape: 'polygon', fadeMs: 250, omega: 16, dim: 1 }),
  zuzu: Object.freeze({ style: 'spiral', shape: 'spiral', fadeMs: 350, omega: 9, dim: 1 }),
  pipzi: Object.freeze({ style: 'bloom', shape: 'ring', fadeMs: 600, omega: 6, dim: 0.7 }),
  boppo: Object.freeze({ style: 'bounce', shape: 'arc', fadeMs: 300, omega: 10, dim: 1, overshoot: 0.35 }),
  blubi: Object.freeze({ style: 'drift-down', shape: 'cascade', fadeMs: 450, omega: 5, dim: 0.9 }),
  loomi: Object.freeze({ style: 'slow', shape: 'drift', fadeMs: 900, omega: 3.5, dim: 0.85 }),
  noomi: Object.freeze({ style: 'settle', shape: 'crescent', fadeMs: 700, omega: 4.5, dim: 0.85 }),
});
const ST = { FREE: 0, CLUSTER: 1, FLYING: 2, PLACED: 3, GIFT: 4, HOME: 5 };

/** Up to n star positions in rect, ≥ minDist apart and outside every avoid rect → Float32Array of x, y pairs. */
export function placeStars(n, rect, avoid = [], minDist = MIN_GAP, seed = 1) {
  const tmp = new Float32Array(Math.max(0, n) * 2);
  const k = scatter(n, rect, avoid, minDist, rng(seed), tmp);
  return tmp.slice(0, 2 * k);
}

/**
 * The Mallow's constellation: n slots around (cx, cy) within radius r, written as x, y pairs into out.
 * Deterministic: the same arguments always give the same slots.
 */
export function constellationShape(mallowId, n, cx, cy, r, out = new Float32Array(Math.max(1, n) * 2)) {
  const shape = (CONSTELLATION_STYLE[mallowId] || CONSTELLATION_STYLE.zuzu).shape;
  n = Math.max(1, n | 0);
  if (n === 1) { out[0] = cx; out[1] = cy; return out; }
  const u = (i) => i / (n - 1);
  for (let i = 0; i < n; i++) {
    let x = cx, y = cy;
    switch (shape) {
      case 'polygon': { const a = -Math.PI / 2 + (TAU * i) / n; x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r; break; }
      case 'spiral': { const a = i * 1.15, rr = r * (0.2 + 0.8 * u(i)); x = cx + Math.cos(a) * rr; y = cy + Math.sin(a) * rr * 0.85; break; }
      case 'ring': { const a = -Math.PI / 2 + (TAU * i) / n + 0.3, rr = r * (i % 2 ? 0.72 : 1); x = cx + Math.cos(a) * rr; y = cy + Math.sin(a) * rr; break; }
      case 'arc': { const s = -1 + 2 * u(i); x = cx + s * r; y = cy + r * 0.55 * (s * s - 0.5); break; }
      case 'cascade': { const s = u(i); x = cx + r * (-0.8 + 1.6 * s) + Math.sin(i * 2.1) * r * 0.12; y = cy - 0.6 * r + 1.2 * r * s * s; break; }
      case 'drift': { const s = -1 + 2 * u(i); x = cx + s * r; y = cy + Math.sin(i * 0.9) * r * 0.25; break; }
      case 'crescent': { const a = (110 + 140 * u(i)) * (Math.PI / 180); x = cx + r * 0.3 + Math.cos(a) * r; y = cy + Math.sin(a) * r; break; }
      default: break;
    }
    out[2 * i] = x; out[2 * i + 1] = y;
  }
  return out;
}

export class StarSwarm extends SimBase {
  /** @param {{tier?:string, seed?:number, mallowId?:string}} [o] */
  constructor({ tier = 'medium', seed = 1, mallowId = 'zuzu' } = {}) {
    super();
    this.cap = STARS.high;
    this.n = this.want = STARS[tier] ?? STARS.medium;
    this.seed = seed;
    this.mallowId = mallowId;
    this.style = CONSTELLATION_STYLE[mallowId] || CONSTELLATION_STYLE.zuzu;
    const F = () => new Float32Array(this.cap);
    this.x = F(); this.y = F(); this.hx = F(); this.hy = F(); this.vx = F(); this.vy = F();
    this.sx = F(); this.sy = F();          // flight target (a constellation slot)
    this.tw = F(); this.tp = F(); this.ta = F();   // twinkle Hz, phase, amplitude
    this.a = F().fill(1);                  // alpha (fades for reduced motion, pricks for enter)
    this.ft = F();                         // seconds in the current state
    this.b = F();                          // brightness: twinkle plus cluster glow
    this.st = new Uint8Array(this.cap);
    this.cl = new Int8Array(this.cap).fill(-1);   // cluster slot or constellation site
    this.ord = new Uint8Array(this.cap);          // slot order inside a constellation (lines join consecutive slots)
    // clusters (one per pointer, two at most)
    this.cId = new Int32Array(2).fill(-1); this.cx = new Float32Array(2); this.cy = new Float32Array(2);
    this.cn = new Uint8Array(2); this.cb = new Float32Array(2);
    // constellation sites (three kept, oldest replaced)
    this.kOn = new Uint8Array(KEEP); this.kn = new Uint8Array(KEEP); this.kAge = new Uint32Array(KEEP);
    this.kx = new Float32Array(KEEP); this.ky = new Float32Array(KEEP); this.kr = 50;
    this.made = 0;
    this.t = 0;
    this.body = null;
    this.affordance = -1;                  // the one brighter star (idle affordance)
    this._slots = new Float32Array(this.cap * 2);
    this.res = { kind: null, n: 0, x: 0, y: 0 };
    const rand = rng(seed ^ 0x5eed);
    for (let i = 0; i < this.cap; i++) { this.tw[i] = 0.25 + rand() * (TWINKLE_HZ - 0.25); this.tp[i] = rand() * TAU; this.ta[i] = 0.08 + rand() * (TWINKLE_AMP - 0.08); }
  }

  /** {rect, avoid, body, W?}: stars are placed in the sky rect; constellation sites sit above the Mallow. */
  resize({ rect, avoid = [], body = null, W = null } = {}) {
    if (!rect) return this;
    this.body = body;
    const keep = body ? [...avoid, { x0: body.cx - body.w * 0.5 - 24, y0: body.top - 24, x1: body.cx + body.w * 0.5 + 24, y1: body.bottom + 24 }] : avoid;
    const pts = placeStars(this.want, rect, keep, MIN_GAP, this.seed);
    this.n = Math.max(1, Math.min(this.want, pts.length >> 1));
    for (let i = 0; i < this.n; i++) {
      this.hx[i] = pts.length ? pts[2 * i] : (rect.x0 + rect.x1) / 2;
      this.hy[i] = pts.length ? pts[2 * i + 1] : (rect.y0 + rect.y1) / 2;
      if (this.st[i] === ST.FREE || this.st[i] === ST.HOME) { this.x[i] = this.hx[i]; this.y[i] = this.hy[i]; this.st[i] = ST.FREE; }
    }
    // the brighter star nearest the top middle
    let best = 0, bd = Infinity;
    const mx = (rect.x0 + rect.x1) / 2;
    for (let i = 0; i < this.n; i++) { const d = Math.abs(this.hx[i] - mx) + (this.hy[i] - rect.y0) * 0.5; if (d < bd) { bd = d; best = i; } }
    this.affordance = best;
    const w = W || rect.x1 + rect.x0, cx = body ? body.cx : w / 2, top = body ? body.top : rect.y1;
    const lift = Math.max(rect.y0 + 40, top - (top - rect.y0) * 0.45);
    this.kr = clamp(0.1 * Math.min(w, Math.max(200, top - rect.y0) * 2), 34, 70);
    const spread = clamp(w * 0.3, 90, 260), sites = [[cx - spread, lift + this.kr * 0.4], [cx, lift - this.kr * 0.5], [cx + spread, lift + this.kr * 0.4]];
    for (let s = 0; s < KEEP; s++) {
      this.kx[s] = clamp(sites[s][0], rect.x0 + this.kr, (W || rect.x1) - this.kr);
      this.ky[s] = clamp(sites[s][1], rect.y0 + this.kr, Math.max(rect.y0 + this.kr, top - this.kr - 10));
    }
    return this;
  }

  setTier(tier) { const n = STARS[tier]; if (n && n < this.want) { this.want = n; this.n = Math.min(this.n, n); } return this; }

  reset() {
    for (let i = 0; i < this.cap; i++) { this.st[i] = ST.FREE; this.cl[i] = -1; this.x[i] = this.hx[i]; this.y[i] = this.hy[i]; this.vx[i] = this.vy[i] = 0; this.a[i] = 1; }
    this.cId.fill(-1); this.cn.fill(0); this.kOn.fill(0); this.kn.fill(0); this.made = 0;
    return this;
  }

  _cslot(id, make) {
    let s = this.cId.indexOf(id);
    if (s < 0 && make) { s = this.cId.indexOf(-1); if (s >= 0) { this.cId[s] = id; this.cn[s] = 0; this.cb[s] = 0; } }
    return s;
  }

  /** A finger sweeping through the sky at (x, y): loose stars (free, or drifting home) within 56 px join its cluster. Returns the cluster size. */
  sweep(id, x, y) {
    const s = this._cslot(id, true);
    if (s < 0) return 0;
    this.cx[s] = x; this.cy[s] = y;
    const r2 = GATHER_R * GATHER_R;
    for (let i = 0; i < this.n; i++) {
      if (!this._loose(i)) continue;
      const dx = this.x[i] - x, dy = this.y[i] - y;
      if (dx * dx + dy * dy >= r2) continue;
      this.st[i] = ST.CLUSTER; this.cl[i] = s; this.ft[i] = 0;
      this.cn[s]++;
      this.emit('gather', this.x[i], this.y[i], this.cn[s]);
    }
    return this.cn[s];
  }

  /**
   * Pull the free star nearest (gx, gy) into cluster `id`, centred at (gx, gy): the "Gather stars"
   * chip and the arrow keys stream stars to one point. Returns the cluster size, or −1 when none was free.
   */
  gatherOne(id, gx, gy) {
    const s = this._cslot(id, true);
    if (s < 0) return -1;
    this.cx[s] = gx; this.cy[s] = gy;
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.n; i++) {
      if (!this._loose(i)) continue;
      const d = (this.x[i] - gx) ** 2 + (this.y[i] - gy) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return -1;
    if (this.cn[s] >= this.perConstellation) return this.cn[s];   // enough for a constellation: no hoarding
    this.st[best] = ST.CLUSTER; this.cl[best] = s; this.ft[best] = 0;
    this.cn[s]++;
    this.emit('gather', this.x[best], this.y[best], this.cn[s]);
    return this.cn[s];
  }

  /** Move cluster `id` (its stars follow on their springs). */
  moveCluster(id, x, y) { const s = this._cslot(id, false); if (s >= 0) { this.cx[s] = x; this.cy[s] = y; } return this; }

  // a visible star that belongs to nothing (free, or drifting home) can be gathered
  _loose(i) { return (this.st[i] === ST.FREE || this.st[i] === ST.HOME) && this.a[i] >= 0.5; }

  /** Is star i held in a cluster right now (drawn on the front canvas)? */
  held(i) { return this.st[i] === ST.CLUSTER; }

  /** A resting finger brightens its cluster. */
  hold(id, dt) { const s = this._cslot(id, false); if (s >= 0) this.cb[s] = Math.min(1, this.cb[s] + dt * 0.8); return this; }

  /** Cluster size for a pointer (0 when none). */
  clusterSize(id) { const s = this._cslot(id, false); return s >= 0 ? this.cn[s] : 0; }

  /**
   * Let a cluster go → the reused {kind: 'constellation' | 'gift' | 'home' | null, n, x, y}.
   * Near the Mallow: a gift. Away from it, 3 or more stars: a constellation. Fewer drift home.
   */
  release(id, vx = 0, vy = 0) {
    const s = this._cslot(id, false), res = this.res;
    res.kind = null; res.n = 0;
    if (s < 0) return res;
    const n = this.cn[s], x = this.cx[s], y = this.cy[s], b = this.body;
    res.n = n; res.x = x; res.y = y;
    this.cId[s] = -1; this.cn[s] = 0;
    if (n === 0) return res;
    if (b && Math.hypot(x - b.cx, y - b.mid) < b.h * 0.75) {
      res.kind = 'gift';
      for (let i = 0; i < this.n; i++) if (this.st[i] === ST.CLUSTER && this.cl[i] === s) { this.st[i] = ST.GIFT; this.ft[i] = 0; this.vx[i] = (this.x[i] - b.cx) * 0.8; this.vy[i] = -120 - 60 * ((i * 7) % 5); }
      this.emit('gift', b.cx, b.top, n);
    } else if (n >= MIN_CONSTELLATION) {
      res.kind = 'constellation';
      const site = this._site(), m = Math.min(n, this.perConstellation);
      const slots = constellationShape(this.mallowId, m, this.kx[site], this.ky[site], this.kr, this._slots);
      let k = 0;
      for (let i = 0; i < this.n; i++) {
        if (this.st[i] !== ST.CLUSTER || this.cl[i] !== s) continue;
        if (k >= m) { this.st[i] = ST.HOME; this.cl[i] = -1; this.ft[i] = 0; continue; }   // extras drift home
        this.st[i] = ST.FLYING; this.cl[i] = site; this.ord[i] = k; this.ft[i] = 0;
        this.sx[i] = slots[2 * k]; this.sy[i] = slots[2 * k + 1];
        if (this.style.style === 'drift-down') this.vy[i] = -90;   // a glitter cascade drifts down into place
        k++;
      }
      this.kOn[site] = 1; this.kn[site] = k; this.kAge[site] = ++this.made;
      res.n = k; res.x = this.kx[site]; res.y = this.ky[site];
      this.emit('constellation', this.kx[site], this.ky[site], k);
    } else {
      res.kind = 'home';
      for (let i = 0; i < this.n; i++) if (this.st[i] === ST.CLUSTER && this.cl[i] === s) { this.st[i] = ST.HOME; this.cl[i] = -1; this.ft[i] = 0; }
    }
    return res;
  }

  /** A free site, else the oldest one (its stars drift home). */
  _site() {
    let site = this.kOn.indexOf(0);
    if (site < 0) {
      site = 0;
      for (let s = 1; s < KEEP; s++) if (this.kAge[s] < this.kAge[site]) site = s;
      for (let i = 0; i < this.n; i++) if ((this.st[i] === ST.PLACED || this.st[i] === ST.FLYING) && this.cl[i] === site) { this.st[i] = ST.HOME; this.cl[i] = -1; this.ft[i] = 0; }
      this.kOn[site] = 0;
    }
    return site;
  }

  /** Stars prick in one by one as k goes 0 → 1 (enter), and fade out one by one as it falls (leave). */
  prick(k) { return this.setAmount(k); }

  /** Start stars at these points (rain drops, x, y pairs): they slow, rise and become the stars. */
  seedFrom(points, n) {
    const m = Math.min(n | 0, this.n, points.length >> 1);
    for (let i = 0; i < m; i++) { this.x[i] = points[2 * i]; this.y[i] = points[2 * i + 1]; this.st[i] = ST.HOME; this.ft[i] = 0; this.vx[i] = 0; this.vy[i] = -40; }
    return m;
  }

  get constellations() { let k = 0; for (let s = 0; s < KEEP; s++) k += this.kOn[s]; return k; }

  /** Stars per constellation: a third of the sky's stars (3–8), so all three can always be made on every tier. */
  get perConstellation() { return clamp(Math.floor(this.n / KEEP), MIN_CONSTELLATION, MAX_CONSTELLATION); }

  /** The stars of constellation `site` in slot order (its lines join consecutive ones), into out (Int16Array). Returns the count. */
  members(site, out) {
    if (!this.kOn[site]) return 0;
    let m = 0;
    for (let k = 0; k < this.kn[site]; k++) {
      for (let i = 0; i < this.n; i++) {
        if (this.cl[i] === site && this.ord[i] === k && (this.st[i] === ST.FLYING || this.st[i] === ST.PLACED)) { out[m++] = i; break; }
      }
    }
    return m;
  }

  /** Twinkle factor of star i at sim time t (1 ± ≤ 0.25 at ≤ 1.2 Hz; exactly 1 with reduced motion). */
  twinkle(i, t = this.t) { return this.reduced ? 1 : 1 + this.ta[i] * Math.sin(TAU * this.tw[i] * t + this.tp[i]); }

  _spring(i, tx, ty, w, dt, zeta = 1) {
    const n = Math.max(1, Math.ceil((dt * w) / 0.4)), h = dt / n;
    for (let k = 0; k < n; k++) {
      this.vx[i] += (w * w * (tx - this.x[i]) - 2 * zeta * w * this.vx[i]) * h;
      this.vy[i] += (w * w * (ty - this.y[i]) - 2 * zeta * w * this.vy[i]) * h;
      this.x[i] += this.vx[i] * h; this.y[i] += this.vy[i] * h;
    }
  }

  step(dt, reduced = this.reduced) {
    dt = clamp(dt, 0, 0.1);
    this.t += dt;
    this._presence(dt);
    this.reduced = reduced;
    const n = this.n, b = this.body, sty = this.style;
    for (let s = 0; s < 2; s++) if (this.cId[s] < 0) this.cb[s] = 0;
    for (let i = 0; i < n; i++) {
      this.ft[i] += dt;
      // prick in / fade out one by one with the presence
      const vis = clamp((this.amount * n - i) * 2, 0, 1);
      switch (this.st[i]) {
        case ST.FREE:
          this._spring(i, this.hx[i], this.hy[i], 4, dt);
          this.a[i] = vis;
          this.b[i] = this.twinkle(i) * (i === this.affordance ? 1.25 : 1);
          break;
        case ST.CLUSTER: {
          const s = this.cl[i], ang = this.tp[i] + (reduced ? 0 : this.t * 2.2), rr = 8 + 2.2 * this.cn[s];
          this._spring(i, this.cx[s] + Math.cos(ang) * rr, this.cy[s] + Math.sin(ang) * rr, 14, dt);
          this.a[i] = 1;
          this.b[i] = 1.1 + 0.03 * this.cn[s] + 0.4 * this.cb[s];
          break;
        }
        case ST.FLYING:
          if (reduced) {   // fade out where it is, appear in its slot
            if (this.ft[i] < 0.25) this.a[i] = 1 - this.ft[i] / 0.25;
            else { this.x[i] = this.sx[i]; this.y[i] = this.sy[i]; this.vx[i] = this.vy[i] = 0; this.a[i] = clamp((this.ft[i] - 0.25) / 0.25, 0, 1); }
            if (this.ft[i] >= 0.5) this.st[i] = ST.PLACED;
          } else {
            this._spring(i, this.sx[i], this.sy[i], sty.omega, dt, sty.overshoot ? 1 - sty.overshoot : 1);
            this.a[i] = 1;
            if (Math.hypot(this.sx[i] - this.x[i], this.sy[i] - this.y[i]) < 1.5 && Math.hypot(this.vx[i], this.vy[i]) < 20) this.st[i] = ST.PLACED;
            else if (this.ft[i] > 4) { this.x[i] = this.sx[i]; this.y[i] = this.sy[i]; this.st[i] = ST.PLACED; }
          }
          this.b[i] = sty.dim;
          break;
        case ST.PLACED:
          this.x[i] = this.sx[i]; this.y[i] = this.sy[i];
          this.a[i] = 1;
          this.b[i] = sty.dim * (reduced ? 1 : 1 + 0.08 * Math.sin(TAU * 0.3 * this.t + this.tp[i]));
          break;
        case ST.GIFT:
          if (b && !reduced) {   // a shower: up over the Mallow, then down around it
            this.vy[i] += 260 * dt; this.vx[i] *= Math.exp(-dt / 0.8);
            this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
            if (this.y[i] > b.bottom) this.y[i] = b.bottom;
          }
          this.a[i] = reduced ? clamp(1 - this.ft[i] / 1.6, 0, 1) : 1;
          this.b[i] = 1.2;
          if (this.ft[i] > 1.6) { this.st[i] = ST.HOME; this.ft[i] = 0; this.cl[i] = -1; }
          break;
        case ST.HOME:
          if (reduced) { this.x[i] = this.hx[i]; this.y[i] = this.hy[i]; this.vx[i] = this.vy[i] = 0; this.a[i] = clamp(this.ft[i] / 0.4, 0, 1) * vis; }
          else { this._spring(i, this.hx[i], this.hy[i], 3, dt); this.a[i] = vis; }
          this.b[i] = 1;
          if (Math.hypot(this.hx[i] - this.x[i], this.hy[i] - this.y[i]) < 2 || this.ft[i] > 5) { this.st[i] = ST.FREE; this.cl[i] = -1; }
          break;
        default: break;
      }
      if (!Number.isFinite(this.x[i] + this.y[i])) { this.x[i] = this.hx[i]; this.y[i] = this.hy[i]; this.vx[i] = this.vy[i] = 0; }
    }
    return this;
  }

  /** Clusters as [x, y, n, brightness] for the live slots (allocates; debug and tests). */
  clusters() {
    const out = [];
    for (let s = 0; s < 2; s++) if (this.cId[s] >= 0) out.push([this.cx[s], this.cy[s], this.cn[s], this.cb[s]]);
    return out;
  }

  snapshot() {
    let free = 0, placed = 0;
    for (let i = 0; i < this.n; i++) { if (this.st[i] === ST.FREE) free++; if (this.st[i] === ST.PLACED) placed++; }
    let hz = 0, amp = 0;
    for (let i = 0; i < this.n; i++) { hz = Math.max(hz, this.tw[i]); amp = Math.max(amp, this.ta[i]); }
    return { n: this.n, free, placed, constellations: this.constellations, made: this.made, clusters: this.clusters().map((c) => c.map((v) => Math.round(v * 100) / 100)),
      twinkle: { maxHz: +hz.toFixed(3), maxAmp: +amp.toFixed(3) }, amount: +this.amount.toFixed(3), style: this.style.style };
  }
}
