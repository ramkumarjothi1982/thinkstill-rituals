// MallowTouch soft body.
//
// A small lattice of nodes laid over a Mallow's body (in the artwork's own
// pixel space, origin at the bottom centre of the body box, y down). Every
// node springs towards a goal position; goals come from the body's rest
// shape, the rig's whole-body motion (squash, lean, tilt, hops, breathing)
// and the person's fingers (dents, pulls, two-finger stretches). Nodes are
// also coupled to their neighbours by their *deviation* from the goal, so a
// poke or a flick travels across the body as a wobble instead of moving one
// node on its own. Low damping gives the delayed, jelly-like rebound.
//
// Pure maths: no DOM, so it runs in Node tests.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class SoftBody {
  /**
   * @param {object} o
   * @param {number} o.width   body width (source px)
   * @param {number} o.height  body height (source px)
   * @param {number} [o.cols]  lattice columns (nodes across)
   * @param {number} [o.rows]  lattice rows (nodes down)
   * @param {number} [o.stiffness] goal spring (1/s²)
   * @param {number} [o.damping]   velocity damping (1/s)
   * @param {number} [o.coupling]  neighbour deviation coupling (1/s²)
   */
  constructor({ width, height, cols = 11, rows = 11, stiffness = 170, damping = 5.2, coupling = 260 } = {}) {
    this.w = width; this.h = height;
    this.cols = cols; this.rows = rows;
    const n = cols * rows;
    this.n = n;
    this.k = stiffness; this.c = damping; this.kc = coupling;
    this.rx = new Float32Array(n); this.ry = new Float32Array(n);   // rest
    this.gx = new Float32Array(n); this.gy = new Float32Array(n);   // goal
    this.x = new Float32Array(n); this.y = new Float32Array(n);     // position
    this.vx = new Float32Array(n); this.vy = new Float32Array(n);   // velocity
    this.u = new Float32Array(n); this.v = new Float32Array(n);     // 0..1 lattice coords
    this.comp = new Float32Array(n);                                // >0 compressed, <0 stretched
    this.restArea = new Float32Array(n);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const u = i / (cols - 1), v = j / (rows - 1);
        this.u[k] = u; this.v[k] = v;
        this.rx[k] = (u - 0.5) * width;
        this.ry[k] = (v - 1) * height;
      }
    }
    this.x.set(this.rx); this.y.set(this.ry);
    this.gx.set(this.rx); this.gy.set(this.ry);
    for (let k = 0; k < n; k++) this.restArea[k] = this._area(k, this.rx, this.ry) || 1;
    // triangle indices (two per cell) for renderers
    const tri = [];
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      tri.push(a, b, c, b, d, c);
    }
    this.tris = new Uint16Array(tri);
    // global body pose, set by the rig every frame
    this.pose = { sx: 1, sy: 1, bulge: 0, lean: 0, tilt: 0, ox: 0, oy: 0, droop: 0 };
    // fingers: id -> grab
    this.grabs = new Map();
    this.wobbleBoost = 0;      // seconds of extra-jelly after a release
    this.reduced = false;
  }

  /** Index of the node at lattice column i, row j. */
  idx(i, j) { return j * this.cols + i; }

  // Local area around node k (sum of the two adjacent cell cross products).
  _area(k, X, Y) {
    const C = this.cols, i = k % C, j = (k / C) | 0;
    const i0 = Math.max(0, i - 1), i1 = Math.min(C - 1, i + 1);
    const j0 = Math.max(0, j - 1), j1 = Math.min(this.rows - 1, j + 1);
    const ax = X[j * C + i1] - X[j * C + i0], ay = Y[j * C + i1] - Y[j * C + i0];
    const bx = X[j1 * C + i] - X[j0 * C + i], by = Y[j1 * C + i] - Y[j0 * C + i];
    return Math.abs(ax * by - ay * bx);
  }

  /**
   * Start a finger on the body. p is in body space.
   * kind: 'press' starts as a dent; becomes a pull once dragged.
   */
  grab(id, p, { radius = 0.3 } = {}) {
    const sigma = radius * Math.max(this.w, this.h);
    const wts = new Float32Array(this.n);
    for (let k = 0; k < this.n; k++) {
      const dx = this.x[k] - p.x, dy = this.y[k] - p.y;
      wts[k] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
    const g = { id, x0: p.x, y0: p.y, x: p.x, y: p.y, w: wts, sigma, depth: 0, pull: 0, slipped: false };
    this.grabs.set(id, g);
    return g;
  }

  /** Move a finger (body space). Returns the grab. */
  drag(id, p) {
    const g = this.grabs.get(id);
    if (!g) return null;
    g.x = p.x; g.y = p.y;
    return g;
  }

  /** Squeeze depth for a held finger, 0..1 (from hold time / contact size). */
  setDepth(id, d) { const g = this.grabs.get(id); if (g) g.depth = clamp(d, 0, 1); }

  /** Let go. vel (body px/s) is the finger's release velocity, for flicks. */
  release(id, vel = null) {
    const g = this.grabs.get(id);
    if (!g) return;
    this.grabs.delete(id);
    if (vel) {
      const k = this.reduced ? 0.25 : 1;
      const vmax = 2600;
      const vx = clamp(vel.x, -vmax, vmax) * 0.55 * k, vy = clamp(vel.y, -vmax, vmax) * 0.55 * k;
      for (let i = 0; i < this.n; i++) { this.vx[i] += vx * g.w[i]; this.vy[i] += vy * g.w[i]; }
    }
    this.wobbleBoost = this.reduced ? 0 : 1.1;
  }

  releaseAll() { for (const id of [...this.grabs.keys()]) this.release(id); }

  /** A quick poke at p: a radial ripple, no grab. */
  poke(p, strength = 1) {
    const sigma = 0.22 * Math.max(this.w, this.h);
    const k = (this.reduced ? 0.3 : 1) * strength * 420;
    for (let i = 0; i < this.n; i++) {
      const dx = this.x[i] - p.x, dy = this.y[i] - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const w = Math.exp(-(d * d) / (2 * sigma * sigma));
      // inward first (a dent), so it rebounds outward
      this.vx[i] -= (dx / d) * w * k;
      this.vy[i] -= (dy / d) * w * k;
    }
    this.wobbleBoost = Math.max(this.wobbleBoost, this.reduced ? 0 : 0.6);
  }

  /** Whole-body velocity kick (e.g. a reaction), body px/s. */
  kick(vx, vy) {
    const k = this.reduced ? 0.25 : 1;
    for (let i = 0; i < this.n; i++) { const up = 1 - this.v[i]; this.vx[i] += vx * k * (0.35 + up); this.vy[i] += vy * k * (0.35 + up); }
  }

  /** Elastic pull: grows linearly at first, then resists (tanh). */
  elastic(dx, dy) {
    const L = 0.42 * this.h;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return [0, 0, 0];
    const e = L * Math.tanh(d / L);
    return [dx / d * e, dy / d * e, d / L];
  }

  _computeGoals() {
    const P = this.pose;
    const H = this.h;
    // finger-driven global pose: a firm press flattens and widens the body
    let flatten = 0;
    for (const g of this.grabs.values()) flatten = Math.max(flatten, g.depth * (1 - smooth(0.05, 0.25, g.pull)));
    const sy = P.sy * (1 - 0.16 * flatten), sx = P.sx * (1 + 0.11 * flatten);
    const cosT = Math.cos(P.tilt), sinT = Math.sin(P.tilt);
    const cy = -H * 0.5;
    for (let k = 0; k < this.n; k++) {
      const v = this.v[k];
      const bulge = (P.bulge + flatten * 0.18) * Math.sin(Math.PI * v) + P.droop * 0.07 * v * v;
      let x = this.rx[k] * sx * (1 + bulge);
      let y = this.ry[k] * sy * (1 - P.droop * 0.06 * (1 - v));
      x += P.lean * H * (1 - v) * (1 - v);
      // tilt about the body centre
      const yy = y - cy;
      const xr = x * cosT - yy * sinT, yr = x * sinT + yy * cosT + cy;
      this.gx[k] = xr + P.ox;
      this.gy[k] = yr + P.oy;
    }
    // fingers
    for (const g of this.grabs.values()) {
      const [ex, ey, stretch] = this.elastic(g.x - g.x0, g.y - g.y0);
      g.pull = stretch;
      const dent = g.depth * (1 - smooth(0.05, 0.3, stretch));
      const s2 = g.sigma * g.sigma;
      for (let k = 0; k < this.n; k++) {
        const w = g.w[k];
        if (w < 0.004) continue;
        // pull: a gaussian displacement field centred on the grab point
        this.gx[k] += ex * w;
        this.gy[k] += ey * w;
        if (dent > 0.001) {
          // dent: nodes under the finger gather in (darker, compressed),
          // the ring around them bulges out
          const dx = this.gx[k] - g.x, dy = this.gy[k] - g.y;
          const r2 = dx * dx + dy * dy;
          const ring = Math.exp(-r2 / (2 * s2 * 2.2)) - Math.exp(-r2 / (2 * s2 * 0.45));
          const gather = -0.34 * dent * Math.exp(-r2 / (2 * s2 * 0.6));
          const out = 0.16 * dent * ring;
          this.gx[k] += dx * (gather + out);
          this.gy[k] += dy * (gather + out);
        }
      }
    }
  }

  /** Advance the simulation by dt seconds (sub-stepped for stability). */
  step(dt) {
    dt = Math.min(dt, 0.05);
    this._computeGoals();
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    const C = this.cols, R = this.rows;
    const rm = this.reduced;
    const k = rm ? this.k * 1.4 : this.k;
    const boost = this.wobbleBoost > 0 ? smooth(0, 1, this.wobbleBoost) : 0;
    const c = rm ? 14 : this.c * (1 - 0.45 * boost);
    const kc = this.kc;
    const X = this.x, Y = this.y, VX = this.vx, VY = this.vy, GX = this.gx, GY = this.gy;
    for (let s = 0; s < steps; s++) {
      for (let j = 0; j < R; j++) {
        // the base sits on the ground: a firmer spring near the bottom
        const kk = k * (1 + 1.6 * Math.pow(j / (R - 1), 6));
        for (let i = 0; i < C; i++) {
          const n = j * C + i;
          const ex = X[n] - GX[n], ey = Y[n] - GY[n];
          let ax = -kk * ex - c * VX[n];
          let ay = -kk * ey - c * VY[n];
          // neighbour deviation coupling: wobble travels across the body
          let cnt = 0, sx = 0, sy = 0;
          if (i > 0) { sx += X[n - 1] - GX[n - 1]; sy += Y[n - 1] - GY[n - 1]; cnt++; }
          if (i < C - 1) { sx += X[n + 1] - GX[n + 1]; sy += Y[n + 1] - GY[n + 1]; cnt++; }
          if (j > 0) { sx += X[n - C] - GX[n - C]; sy += Y[n - C] - GY[n - C]; cnt++; }
          if (j < R - 1) { sx += X[n + C] - GX[n + C]; sy += Y[n + C] - GY[n + C]; cnt++; }
          ax += kc * (sx / cnt - ex);
          ay += kc * (sy / cnt - ey);
          VX[n] += ax * h; VY[n] += ay * h;
        }
      }
      for (let n = 0; n < this.n; n++) { X[n] += VX[n] * h; Y[n] += VY[n] * h; }
    }
    // keep everything finite even after absurd input
    for (let n = 0; n < this.n; n++) {
      if (!Number.isFinite(X[n]) || !Number.isFinite(Y[n])) { X[n] = GX[n]; Y[n] = GY[n]; VX[n] = 0; VY[n] = 0; }
    }
    this.wobbleBoost = Math.max(0, this.wobbleBoost - dt);
    for (let n = 0; n < this.n; n++) {
      const a = this._area(n, X, Y);
      this.comp[n] = clamp(this.restArea[n] / Math.max(1e-3, a) - 1, -0.6, 0.8);
    }
  }

  /** Is body-space point p inside the deformed outline (with a margin)? */
  contains(p, margin = 0.08) {
    // ray cast against the outer ring of the lattice
    const ring = this.outline();
    let inside = false;
    for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
      const [xa, ya] = ring[a], [xb, yb] = ring[b];
      if ((ya > p.y) !== (yb > p.y) && p.x < ((xb - xa) * (p.y - ya)) / (yb - ya) + xa) inside = !inside;
    }
    if (inside) return true;
    // forgiving edge for fingers
    const b = this.bounds();
    const mx = (b.x1 - b.x0) * margin, my = (b.y1 - b.y0) * margin;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const dx = (p.x - cx) / ((b.x1 - b.x0) / 2 + mx), dy = (p.y - cy) / ((b.y1 - b.y0) / 2 + my);
    return dx * dx + dy * dy < 1;
  }

  outline() {
    const C = this.cols, R = this.rows, out = [];
    for (let i = 0; i < C; i++) out.push([this.x[i], this.y[i]]);
    for (let j = 1; j < R; j++) out.push([this.x[j * C + C - 1], this.y[j * C + C - 1]]);
    for (let i = C - 2; i >= 0; i--) out.push([this.x[(R - 1) * C + i], this.y[(R - 1) * C + i]]);
    for (let j = R - 2; j > 0; j--) out.push([this.x[j * C], this.y[j * C]]);
    return out;
  }

  bounds() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let n = 0; n < this.n; n++) {
      if (this.x[n] < x0) x0 = this.x[n]; if (this.x[n] > x1) x1 = this.x[n];
      if (this.y[n] < y0) y0 = this.y[n]; if (this.y[n] > y1) y1 = this.y[n];
    }
    return { x0, y0, x1, y1 };
  }

  /** Mean absolute deviation from the goal shape, in body heights (wobble meter). */
  wobble() {
    let s = 0;
    for (let n = 0; n < this.n; n++) s += Math.abs(this.x[n] - this.gx[n]) + Math.abs(this.y[n] - this.gy[n]);
    return s / this.n / this.h;
  }

  /** Mean deviation from the *rest* shape, in body heights (how deformed it looks). */
  deformation() {
    let s = 0;
    for (let n = 0; n < this.n; n++) s += Math.hypot(this.x[n] - this.rx[n] * this.pose.sx, this.y[n] - this.ry[n] * this.pose.sy);
    return s / this.n / this.h;
  }
}
