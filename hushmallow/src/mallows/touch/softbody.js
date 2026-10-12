// SoftBody — the squishy physics under every MallowTouch character.
//
// A cols×rows lattice of particles laid over a Mallow's body box, solved
// with three kinds of shape matching plus a few position constraints:
//
//   global match   least-squares fit of the whole lattice to its rest shape:
//                  a blend of the pure rotation and the area-normalised linear
//                  part (so a squash widens and a stretch narrows the waist),
//                  anchored home and kept upright
//   local match    rigid 3×3 regions (FastLSM box sums) so a finger makes a
//                  smooth local dent instead of moving the whole body; stiffer
//                  inside the face so the approved face stays readable
//   balloon        the boundary polygon keeps its rest area plus the volume a
//                  dent pushes "into" the screen, so pressing bulges the sides
//   pointers       grabs (material pinned to a finger with a gaussian falloff),
//                  a pinch (the dent seen in perspective), plungers near the
//                  silhouette, an inversion guard and a frictional floor
//   glides         a stroking or massaging finger slides over the skin instead
//                  of holding it: a light dent that travels, a little friction
//                  drag, and it never slips (surface(id))
//   waist          a two-finger stretch pulls the middle in toward the axis
//                  between the fingers, so it narrows like an hourglass
//
// Shape matching is integrated Müller-style (goal springs act on velocity, so
// the jelly wobble is undamped by the integrator) and damping is explicit, so
// each Mallow's material reads as a frequency (kG, kL) and a decay (damp).
// Fixed 1/120 s substeps, at most 4 per frame: the same feel at 30, 60 and
// 120 Hz, and a slow frame slows time instead of exploding. Deterministic,
// allocation-free per step, no DOM — Node can test it.
//
// Units: body units, y down. The lattice spans x ∈ [0, aspect], y ∈ [0, 1];
// the floor is y = 1 (the bottom of the body). Callers map to the screen.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const SUBSTEP = 1 / 120;
export const MAX_SUBSTEPS = 4;

/** kG/kL: global/local stiffness · beta: share of area-preserving linear
 *  deformation the global goal allows · damp: velocity kept per 1/60 s ·
 *  dMax: deepest squeeze (0..1) · maxStretch: a pull slips beyond this (body
 *  heights) */
export const DEFAULT_MATERIAL = Object.freeze({ kG: 0.24, kL: 0.58, beta: 0.3, damp: 0.94, dMax: 0.34, maxStretch: 0.4 });

const STIFF = 0.065;        // material k → per-substep goal-spring share
const GRAB_K = 0.55;        // how firmly a finger holds the material under it
const PINCH = 1.25;         // offsets near a pressed finger shrink by up to this (× depth × dMax)
const BALLOON_K = 0.3;
const BALLOON_GAIN = 0.75;  // area added per unit of dent volume (× dMax)
const PLUNGE = 0.5;         // how far past the finger a plunger sinks (× depth × dMax)
const VMAX = 40;            // body units / s, hard cap (extreme input)
const VISC = 0.35;          // internal viscosity (neighbour velocity blend per substep)
const LOCAL_DAMP = 0.93;    // velocity kept per substep by non-affine (bending) motion
const SURF_DRAG = 0.32;     // share of a gliding finger's motion the skin under it follows
const GLIDE_PINCH = 0.06;   // how hard a gliding finger presses the skin toward itself
const WAIST_K = 0.12;       // per-substep pull toward the waist target
const SLEEP_E = 1e-10;      // below this energy, with no fingers, the solver sleeps

export class SoftBody {
  /**
   * @param {object} o
   * @param {number} [o.cols=21] @param {number} [o.rows=21]
   * @param {number} [o.aspect=1]  lattice width / height
   * @param {(u:number,v:number)=>number} [o.mask]  body alpha at lattice uv (0..1), for culling
   * @param {number[]} [o.faceRect]  [u0,v0,u1,v1] lattice uv of the face (stiffer, shallower dents)
   * @param {number[]} [o.uvRect]    [u0,v0,u1,v1] texture uv the lattice maps to
   * @param {object} [o.material]
   * @param {boolean} [o.reducedMotion]
   */
  constructor(o = {}) {
    const cols = this.cols = Math.max(3, (o.cols | 0) || 21);
    const rows = this.rows = Math.max(3, (o.rows | 0) || 21);
    const n = this.n = cols * rows;
    this.aspect = o.aspect > 0 ? +o.aspect : 1;
    this.floor = 1;
    this.dx = this.aspect / (cols - 1);
    this.dy = 1 / (rows - 1);
    this.material = { ...DEFAULT_MATERIAL };
    this.reducedMotion = !!o.reducedMotion;

    this.q0 = new Float32Array(2 * n);
    this.rest = new Float32Array(2 * n);
    this.positions = new Float32Array(2 * n);
    this.prev = new Float32Array(2 * n);
    this.vel = new Float32Array(2 * n);
    this.goalG = new Float32Array(2 * n);
    this.goalL = new Float32Array(2 * n);
    this.uvs = new Float32Array(2 * n);
    this.faceW = new Float32Array(n);
    this.dent = new Float32Array(n);
    this.shade = new Float32Array(3 * n);   // compression, normal x, normal y
    this._h = new Float32Array(n);          // height field for the normals
    this._vc = new Float32Array(n);         // per-vertex triangle counts
    this._cnt = new Float64Array(n);        // 3×3 region sizes
    this._F = new Float64Array(8 * n);      // box-sum fields
    this._T = new Float64Array(8 * n);      // box-sum scratch
    this._grabW = new Float32Array(n);      // summed grab weight (lighting / face)
    this._waistW = new Float32Array(n);     // waist pull weight (the balloon leaves the waist alone)
    this._rowExt = new Float32Array(3 * rows);
    this._bounds = { x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, w: 0, h: 0 };

    const uv = o.uvRect || [0, 0, 1, 1];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const u = i / (cols - 1), v = j / (rows - 1);
        this.q0[2 * k] = u * this.aspect;
        this.q0[2 * k + 1] = v;
        this.uvs[2 * k] = lerp(uv[0], uv[2], u);
        this.uvs[2 * k + 1] = lerp(uv[1], uv[3], v);
      }
    }
    // shape-matching regions: (2R+1)² cells, clamped at the border. 5×5 keeps
    // the outline smooth under fast fingers; a dent still stays local
    const R = this.regionR = clamp((o.regionR | 0) || 1, 1, 4);
    for (let j = 0; j < rows; j++) {
      const nj = Math.min(rows - 1, j + R) - Math.max(0, j - R) + 1;
      for (let i = 0; i < cols; i++) this._cnt[j * cols + i] = nj * (Math.min(cols - 1, i + R) - Math.max(0, i - R) + 1);
    }
    // face weight: 1 inside the face rect, smooth falloff over ~1.5 cells
    if (o.faceRect) {
      const [u0, v0, u1, v1] = o.faceRect;
      const fu = 1.6 / (cols - 1), fv = 1.6 / (rows - 1);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = i / (cols - 1), v = j / (rows - 1);
          const du = Math.max(u0 - u, 0, u - u1) / fu, dv = Math.max(v0 - v, 0, v - v1) / fv;
          this.faceW[j * cols + i] = 1 - smoothstep(0, 1, Math.hypot(du, dv));
        }
      }
    }
    this._buildTopology(o.mask);
    this.setMaterial(o.material);

    this.ptr = new Map();       // finger id → constraint state
    this._acc = 0;
    this.time = 0;
    this.kScale = 1;            // global stiffness multiplier (rebound dip)
    this._dipT = -1;
    this.dentVolume = 0;
    this.lastSlip = null;       // {id, t} when a pull slipped
    this.restArea = 0;
    this._restTri2 = new Float32Array(this.triAll.length / 3);
    this._restKey = new Float64Array(12).fill(NaN);
    this._subLeft = 1;
    this.waist = null;          // {a, b, k}: two-finger stretch waist
    this.awake = true;          // false while asleep (still, no fingers): step() is free
    this.setRest();
    this.reset();
  }

  // ------------------------------------------------------------ set-up --
  _buildTopology(mask) {
    const { cols, rows } = this;
    const all = [], vis = [];
    const alpha = (u, v) => (mask ? mask(clamp(u, 0, 1), clamp(v, 0, 1)) : 1);
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
        const t = (i + j) % 2 === 0 ? [a, b, d, a, d, c] : [a, b, c, b, d, c];
        all.push(...t);
        // keep a quad when any sample of it has body alpha
        let on = !mask;
        if (mask) {
          const u0 = i / (cols - 1), v0 = j / (rows - 1), u1 = (i + 1) / (cols - 1), v1 = (j + 1) / (rows - 1);
          for (let sy = 0; sy <= 2 && !on; sy++) for (let sx = 0; sx <= 2 && !on; sx++) {
            if (alpha(lerp(u0, u1, sx / 2), lerp(v0, v1, sy / 2)) > 0.01) on = true;
          }
        }
        if (on) vis.push(...t);
      }
    }
    this.triAll = new Uint16Array(all);
    this.indices = new Uint16Array(vis);
    // boundary polygon, clockwise on screen (positive area with y down)
    const b = [];
    for (let i = 0; i < cols; i++) b.push(i);
    for (let j = 1; j < rows; j++) b.push(j * cols + cols - 1);
    for (let i = cols - 2; i >= 0; i--) b.push((rows - 1) * cols + i);
    for (let j = rows - 2; j >= 1; j--) b.push(j * cols);
    this.boundary = new Uint16Array(b);
    this._bg = new Float32Array(2 * b.length);
    // barrel profile for the volume bulge: most at mid-height, little at the base
    this._barrel = new Float32Array(cols * rows);
    let bsum = 0;
    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1), w = 0.25 + 0.75 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.85 + 0.08)), 0.8);
      for (let i = 0; i < cols; i++) { this._barrel[j * cols + i] = w; bsum += w; }
    }
    this._barrelMean = bsum / (cols * rows);
    for (const k of vis) this._vc[k] += 1;
    // distance (in cells) to the visible silhouette: the waist pull eases off
    // over the last few rows so a stretch never folds the outline into a V
    const n = cols * rows, D = this._edgeD = new Float32Array(n).fill(1e9), q = [];
    for (let k = 0; k < n; k++) {
      const i = k % cols, j = (k / cols) | 0;
      if (this._vc[k] < 6 || i === 0 || j === 0 || i === cols - 1 || j === rows - 1) { D[k] = 0; q.push(k); }
    }
    for (let h = 0; h < q.length; h++) {
      const k = q[h], i = k % cols, j = (k / cols) | 0, d = D[k] + 1;
      for (const m of [i > 0 ? k - 1 : -1, i < cols - 1 ? k + 1 : -1, j > 0 ? k - cols : -1, j < rows - 1 ? k + cols : -1]) {
        if (m >= 0 && d < D[m]) { D[m] = d; q.push(m); }
      }
    }
    this._edgeSoft = new Float32Array(n);
    for (let k = 0; k < n; k++) this._edgeSoft[k] = 0.4 + 0.6 * smoothstep(0, 2.5, D[k]);
  }

  setMaterial(m = {}) {
    Object.assign(this.material, m || {});
    const M = this.material;
    const rm = this.reducedMotion;
    this.alphaG = clamp(M.kG * STIFF * (rm ? 2 : 1), 0.002, 0.4);
    this.alphaL = clamp(M.kL * STIFF * (rm ? 1.5 : 1), 0.002, 0.4);
    const perStep = Math.pow(clamp(M.damp, 0.5, 0.999), 60 * SUBSTEP);
    // reduced motion: critically damped — no overshoot, no wobble
    const crit = Math.exp(-2 * Math.sqrt(this.alphaG + this.alphaL));
    this.dampStep = rm ? Math.min(perStep, crit) : perStep;
    this.beta = clamp(M.beta, 0, 0.9);
    // local (non-affine) motion keeps this much velocity per substep
    this.localDamp = rm ? Math.min(0.9, crit) : clamp(M.localDamp ?? LOCAL_DAMP, 0.5, 1);
    return this;
  }

  setReducedMotion(b) { this.reducedMotion = !!b; this.setMaterial(); }

  /** Re-map the lattice onto texture uv rect [u0,v0,u1,v1] (the skin changed size). */
  setUvRect(uv) {
    const { cols, rows } = this;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      this.uvs[2 * k] = lerp(uv[0], uv[2], i / (cols - 1));
      this.uvs[2 * k + 1] = lerp(uv[1], uv[3], j / (rows - 1));
    }
    return this;
  }

  /**
   * Rest shape from the face/body expression. All optional:
   * squash (+ flatter), breath (±0.014), droop, shrink (0..1), lean (body units at the top),
   * puffL / puffR (cheek puff) at cheekV (lattice v), sx / sy extra scales, stretch {s, ax, ay}.
   */
  setRest(p = {}) {
    const { q0, rest, n, aspect } = this;
    const sq = clamp(+p.squash || 0, -0.6, 0.6);
    const br = clamp(+p.breath || 0, -0.1, 0.1);
    const droop = clamp(+p.droop || 0, 0, 1.2);
    const shrink = 1 - clamp(+p.shrink || 0, 0, 1) * 0.12;
    const lean = clamp(+p.lean || 0, -0.5, 0.5);
    const puffL = clamp(+p.puffL || 0, 0, 1.5), puffR = clamp(+p.puffR || 0, 0, 1.5);
    const cheekV = p.cheekV ?? 0.62;
    // unchanged (within 1e-6): nothing to recompute, and a sleeping body sleeps on
    const K = this._restKey, nk = [sq, br, droop, shrink, lean, puffL, puffR, cheekV, p.sx ?? 1, p.sy ?? 1];
    let same = true;
    for (let i = 0; i < nk.length; i++) if (!(Math.abs(K[i] - nk[i]) < 1e-6)) { same = false; K[i] = nk[i]; }
    if (same) return this;
    this.awake = true;
    const sy = (1 - sq) * (1 + br) * (p.sy ?? 1) * shrink;
    const sxB = (1 + sq * 0.62) * (1 - br * 0.6) * (p.sx ?? 1) * shrink;
    const cx = aspect / 2, fl = this.floor;
    for (let k = 0; k < n; k++) {
      const u = q0[2 * k] - cx, vm = q0[2 * k + 1];
      const side = u < 0 ? puffL : puffR;
      const bulge = sq * 0.32 * Math.sin(Math.PI * vm) + droop * 0.07 * vm * vm - droop * 0.03 * (1 - vm)
        + side * 0.032 * Math.exp(-((vm - cheekV) ** 2) / 0.04);
      const ys = sy * (1 - droop * 0.06 * (1 - vm));
      rest[2 * k] = cx + u * sxB * (1 + bulge) + lean * (1 - vm) * (1 - vm);
      rest[2 * k + 1] = fl + (vm - fl) * ys;
    }
    // flat: the rest shape is the undeformed lattice (renderers may draw it as one image)
    let dev = 0;
    for (let k = 0; k < 2 * n; k++) { const d = Math.abs(rest[k] - q0[k]); if (d > dev) dev = d; }
    this.restFlat = dev < 2e-4;
    this._prepRest();
    return this;
  }

  _prepRest() {
    const { rest, n } = this;
    let cx = 0, cy = 0;
    for (let k = 0; k < n; k++) { cx += rest[2 * k]; cy += rest[2 * k + 1]; }
    cx /= n; cy /= n;
    this.c0x = cx; this.c0y = cy;
    let a = 0, b = 0, d = 0;
    for (let k = 0; k < n; k++) {
      const rx = rest[2 * k] - cx, ry = rest[2 * k + 1] - cy;
      a += rx * rx; b += rx * ry; d += ry * ry;
    }
    const det = a * d - b * b || 1e-9;
    this.iqa = d / det; this.iqb = -b / det; this.iqd = a / det;   // Aqq⁻¹ (symmetric)
    this.restArea = polyArea(rest, this.boundary);
    const T = this.triAll, R2 = this._restTri2;
    for (let t = 0; t < R2.length; t++) {
      const i = T[3 * t], j = T[3 * t + 1], k = T[3 * t + 2];
      R2[t] = cross(rest, i, j, k);
    }
  }

  /** Snap to the rest shape, at rest. */
  reset() {
    this.positions.set(this.rest);
    this.prev.set(this.rest);
    this.vel.fill(0);
    this.dent.fill(0);
    this.ptr.clear();
    this._acc = 0;
    this.kScale = 1; this._dipT = -1;
    this.waist = null;
    this.awake = true;
    return this;
  }

  // ----------------------------------------------------------- fingers --
  /** Pin the material around (x, y) to a finger. r: pull falloff (body units). */
  grab(id, x, y, r = 0.3) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const P = this.positions, n = this.n;
    const sigmaPull = clamp(+r || 0.3, 0.05, 1);
    const reach = 3 * Math.max(sigmaPull, 0.34);
    const idx = [], ox = [], oy = [];
    for (let k = 0; k < n; k++) {
      const dx = P[2 * k] - x, dy = P[2 * k + 1] - y;
      if (dx * dx + dy * dy > reach * reach) continue;
      idx.push(k); ox.push(dx); oy.push(dy);
    }
    // where the grabbed point sits in the rest shape (for slipping and plungers)
    const g = this._nearest(x, y);
    const st = {
      id, x, y, x0: x, y0: y, sigma: Math.min(sigmaPull, 0.16), sigmaPull, pull: 0, depth: 0, r: 0.2,
      idx: Uint16Array.from(idx), ox: Float32Array.from(ox), oy: Float32Array.from(oy),
      anchor: g, ax: this.rest[2 * g], ay: this.rest[2 * g + 1],
      fade: 1, slipping: false, plunge: null, surface: false, fx: x, fy: y,
    };
    this.ptr.set(id, st);
    this.awake = true;
    return st;
  }

  /** Press at (x, y). depth 0..1 (of the material's dMax), r: dent radius (body units). */
  press(id, x, y, depth = 0, r = 0.2) {
    let st = this.ptr.get(id);
    if (!st) st = this.grab(id, x, y, 0.3);
    if (!st) return null;
    st.depth = clamp(+depth || 0, 0, 1);
    st.r = clamp(+r || 0.2, 0.04, 0.6);
    st.sigma = Math.min(st.sigmaPull, st.r * 0.8);
    if (Number.isFinite(x) && Number.isFinite(y)) { st.x = x; st.y = y; }
    this._plungeAxis(st);
    return st;
  }

  /** Move a finger. pull 0..1 widens the grip from a press to a pull. */
  move(id, x, y, pull) {
    const st = this.ptr.get(id);
    if (!st || !Number.isFinite(x) || !Number.isFinite(y)) return st || null;
    st.x = x; st.y = y;
    if (pull != null) st.pull = clamp(pull, 0, 1);
    return st;
  }

  setGrip(id, sigmaPull) { const st = this.ptr.get(id); if (st) st.sigmaPull = Math.max(0.05, sigmaPull); }

  /** A stroking or massaging finger: it lets go of the material it held
   *  (gently: no kick, no rebound), then glides over the skin, pressing in a
   *  little and dragging the skin it brushes. A glide never slips. */
  surface(id) {
    const st = this.ptr.get(id);
    if (!st || st.surface) return st || null;
    st.surface = true; st.slipping = false; st.fade = 1; st.plunge = null; st.pull = 0;
    st.fx = st.x; st.fy = st.y;
    this.awake = true;
    return st;
  }

  /** Two-finger stretch waist: the material between grabs a and b is pulled
   *  toward the axis between them by k (0..0.5), most at the midpoint. null ends it. */
  setWaist(a, b, k) {
    if (a == null || b == null || !(k > 0.002)) { this.waist = null; return this; }
    const w = this.waist || (this.waist = { a, b, k: 0 });
    w.a = a; w.b = b; w.k = clamp(k, 0, 0.5);
    this.awake = true;
    return this;
  }

  /** Let go. v: release velocity (body units/s) for the grabbed material.
   *  quiet: no velocity, no rebound (a finger changing how it touches). */
  release(id, { vx = 0, vy = 0, flick = false, quiet = false } = {}) {
    const st = this.ptr.get(id);
    if (!st) return;
    this.ptr.delete(id);
    if (this.waist && (this.waist.a === id || this.waist.b === id)) this.waist = null;
    this.awake = true;
    if (quiet) return;
    const V = this.vel, P = this.positions;
    const rm = this.reducedMotion;
    if (st.surface) {
      // a glide leaves the skin it brushed swinging a little, nothing more
      if (!rm && (vx || vy)) this.impulse(vx * 0.12, vy * 0.12, { x: st.fx, y: st.fy, r: 0.2 });
      return;
    }
    if (!rm && (vx || vy)) {
      const s = this._sigma(st);
      const k = flick ? 0.6 : 0.35;
      for (let m = 0; m < st.idx.length; m++) {
        const i = st.idx[m];
        const w = Math.exp(-(st.ox[m] ** 2 + st.oy[m] ** 2) / (2 * s * s)) * st.fade;
        V[2 * i] += vx * k * w; V[2 * i + 1] += vy * k * w;
      }
      if (flick) {
        // the whole body joins in, with torque from where it was flicked
        const cx = this.c0x, cy = this.c0y;
        const tx = st.x - cx, ty = st.y - cy;
        const torque = clamp((tx * vy - ty * vx) * 0.6, -6, 6);
        for (let k2 = 0; k2 < this.n; k2++) {
          const px = P[2 * k2] - cx, py = P[2 * k2 + 1] - cy;
          V[2 * k2] += vx * 0.25 - torque * py;
          V[2 * k2 + 1] += vy * 0.25 + torque * px;
        }
      }
    }
    // the delayed jelly rebound: stiffness dips, then ramps back
    if (st.depth > 0.05 && !rm) { this.kScale = 0.4; this._dipT = 0; }
  }

  releaseAll() { for (const id of [...this.ptr.keys()]) this.release(id); }

  /** Velocity kick (body units/s), optionally local around (x, y) with radius r. */
  impulse(vx, vy, at = null) {
    const V = this.vel, P = this.positions;
    const rm = this.reducedMotion ? 0.35 : 1;
    this.awake = true;
    for (let k = 0; k < this.n; k++) {
      let w = 1;
      if (at && at.r) {
        const dx = P[2 * k] - at.x, dy = P[2 * k + 1] - at.y;
        w = Math.exp(-(dx * dx + dy * dy) / (2 * at.r * at.r));
      }
      V[2 * k] += vx * w * rm; V[2 * k + 1] += vy * w * rm;
    }
  }

  /** Whole-body velocity fields: 'squash' (+ flatter), 'shear' (top sideways), 'twist' (rad/s). */
  deform(kind, amount) {
    if (!Number.isFinite(amount) || !amount) return;
    this.awake = true;
    const V = this.vel, P = this.positions, fl = this.floor;
    const cx = this.c0x, cy = this.c0y;
    const rm = this.reducedMotion ? 0.3 : 1;
    const a = clamp(amount, -12, 12) * rm;
    for (let k = 0; k < this.n; k++) {
      const h = fl - P[2 * k + 1], u = P[2 * k] - cx;
      if (kind === 'squash') { V[2 * k + 1] += a * h; V[2 * k] += a * 0.62 * u * (0.6 + 0.8 * Math.sin(Math.PI * clamp(1 - h, 0, 1))); }
      else if (kind === 'shear') V[2 * k] += a * h;
      else if (kind === 'twist') { const py = P[2 * k + 1] - cy; V[2 * k] += -a * py; V[2 * k + 1] += a * u; }
    }
  }

  /** Tangential swirl around (x, y): rate in rad/s (+ clockwise on screen). */
  swirl(x, y, r, rate) {
    const V = this.vel, P = this.positions;
    if (!Number.isFinite(rate) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    this.awake = true;
    const k0 = clamp(rate, -20, 20) * (this.reducedMotion ? 0.3 : 1) * 0.08;
    for (let k = 0; k < this.n; k++) {
      const dx = P[2 * k] - x, dy = P[2 * k + 1] - y;
      const w = Math.exp(-(dx * dx + dy * dy) / (2 * r * r));
      V[2 * k] += -dy * k0 * w; V[2 * k + 1] += dx * k0 * w;
    }
  }

  _sigma(st) { return Math.max(0.04, lerp(st.sigma, st.sigmaPull, st.pull)); }

  _nearest(x, y) {
    const P = this.positions;
    let best = 0, bd = Infinity;
    for (let k = 0; k < this.n; k++) {
      const d = (P[2 * k] - x) ** 2 + (P[2 * k + 1] - y) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  // a press near the silhouette pushes that edge in (a real notch)
  _plungeAxis(st) {
    const u = st.ax / this.aspect, v = st.ay;
    const dTop = v, dL = u, dR = 1 - u;
    const m = Math.min(dTop, dL * 1.1, dR * 1.1);
    const w = smoothstep(0.3, 0.1, m);
    if (w <= 0.001) { st.plunge = null; return; }
    let nx = 0, ny = 1, k = 1;
    // sides are pushed more gently than the top (the top carries the squash)
    if (m === dTop) { nx = 0; ny = 1; } else if (m === dL * 1.1) { nx = 1; ny = 0; k = 0.5; } else { nx = -1; ny = 0; k = 0.5; }
    st.plunge = { nx, ny, w: w * k, side: k < 1 };
  }

  // ------------------------------------------------------------ solver --
  /** Advance by dt seconds (fixed substeps). Returns the number of substeps run. */
  step(dt) {
    if (!(dt > 0)) return 0;
    this.lastSlip = null;
    // asleep: perfectly still at rest with no fingers — nothing to solve
    if (!this.awake && this.ptr.size === 0) { this._acc = 0; return 0; }
    this._acc += Math.min(dt, 0.25);
    let n = Math.floor(this._acc / SUBSTEP + 1e-6);
    if (n > MAX_SUBSTEPS) { n = MAX_SUBSTEPS; this._acc = 0; } else this._acc -= n * SUBSTEP;
    for (let s = 0; s < n; s++) { this._subLeft = n - s; this._substep(SUBSTEP); }
    if (n) this._guard();
    if (n && this.ptr.size === 0 && this._dipT < 0 && this.energy < SLEEP_E) {
      this.positions.set(this.rest); this.prev.set(this.rest); this.vel.fill(0);
      this.awake = false;
    }
    return n;
  }

  _substep(h) {
    const P = this.positions, V = this.vel, X0 = this.prev, n = this.n;
    this.time += h;
    // rebound dip: 120 ms at 40 %, then a 160 ms ramp back
    if (this._dipT >= 0) {
      this._dipT += h;
      const t = this._dipT;
      this.kScale = t < 0.12 ? 0.4 : t < 0.28 ? lerp(0.4, 1, smoothstep(0.12, 0.28, t)) : 1;
      if (t >= 0.28) this._dipT = -1;
    }
    this._globalGoal();
    this._localGoal();
    const aG = this.alphaG * this.kScale, aL = this.alphaL, damp = this.dampStep;
    const GG = this.goalG, GL = this.goalL, FW = this.faceW;
    for (let k = 0; k < n; k++) {
      const ix = 2 * k, iy = ix + 1;
      const al = aL * (1 + 0.5 * FW[k]);
      let vx = V[ix] * damp + (aG * (GG[ix] - P[ix]) + al * (GL[ix] - P[ix])) / h;
      let vy = V[iy] * damp + (aG * (GG[iy] - P[iy]) + al * (GL[iy] - P[iy])) / h;
      X0[ix] = P[ix]; X0[iy] = P[iy];
      P[ix] += vx * h; P[iy] += vy * h;
    }
    this._fingers();
    this._balloon();
    this._waistPull();
    this._floorClamp();
    this._unfold();
    const ih = 1 / h;
    for (let k = 0; k < 2 * n; k++) {
      let v = (P[k] - X0[k]) * ih;
      V[k] = v > VMAX ? VMAX : v < -VMAX ? -VMAX : v;
    }
    this._viscosity();
    this._localDamp();
  }

  // Two-band damping: the best-fit affine motion of the whole body (sway,
  // squash, stretch, turn) keeps its jelly wobble; everything on top of it
  // (bending, rippling, crumpling) is damped like dense marshmallow foam.
  _localDamp() {
    const P = this.positions, V = this.vel, n = this.n;
    const dl = this.localDamp;
    if (dl >= 1) return;
    let cx = 0, cy = 0, mx = 0, my = 0;
    for (let k = 0; k < n; k++) { cx += P[2 * k]; cy += P[2 * k + 1]; mx += V[2 * k]; my += V[2 * k + 1]; }
    cx /= n; cy /= n; mx /= n; my /= n;
    let xx = 0, xy = 0, yy = 0, ax = 0, bx = 0, ay = 0, by = 0;
    for (let k = 0; k < n; k++) {
      const dx = P[2 * k] - cx, dy = P[2 * k + 1] - cy, vx = V[2 * k] - mx, vy = V[2 * k + 1] - my;
      xx += dx * dx; xy += dx * dy; yy += dy * dy;
      ax += vx * dx; bx += vx * dy; ay += vy * dx; by += vy * dy;
    }
    const det = xx * yy - xy * xy;
    if (!(det > 1e-12)) return;
    // L = [ax bx; ay by] · inv([xx xy; xy yy])
    const i00 = yy / det, i01 = -xy / det, i11 = xx / det;
    const l00 = ax * i00 + bx * i01, l01 = ax * i01 + bx * i11;
    const l10 = ay * i00 + by * i01, l11 = ay * i01 + by * i11;
    for (let k = 0; k < n; k++) {
      const dx = P[2 * k] - cx, dy = P[2 * k + 1] - cy;
      const fx = mx + l00 * dx + l01 * dy, fy = my + l10 * dx + l11 * dy;
      V[2 * k] = fx + (V[2 * k] - fx) * dl;
      V[2 * k + 1] = fy + (V[2 * k + 1] - fy) * dl;
    }
  }

  // internal (XSPH-style) viscosity: each particle's velocity relaxes toward
  // its lattice neighbours'. Zig-zag modes die in a few substeps while the
  // whole-body wobble barely notices — jelly, not crumpled foil.
  _viscosity() {
    const V = this.vel, T = this._T, { cols, rows } = this;
    const nu = VISC;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        let sx = 0, sy = 0, c = 0;
        if (i > 0) { sx += V[2 * k - 2]; sy += V[2 * k - 1]; c++; }
        if (i < cols - 1) { sx += V[2 * k + 2]; sy += V[2 * k + 3]; c++; }
        if (j > 0) { const o = 2 * (k - cols); sx += V[o]; sy += V[o + 1]; c++; }
        if (j < rows - 1) { const o = 2 * (k + cols); sx += V[o]; sy += V[o + 1]; c++; }
        T[2 * k] = V[2 * k] + nu * (sx / c - V[2 * k]);
        T[2 * k + 1] = V[2 * k + 1] + nu * (sy / c - V[2 * k + 1]);
      }
    }
    for (let k = 0; k < 2 * this.n; k++) V[k] = T[k];
  }

  _globalGoal() {
    const P = this.positions, R = this.rest, G = this.goalG, n = this.n;
    let cx = 0, cy = 0;
    for (let k = 0; k < n; k++) { cx += P[2 * k]; cy += P[2 * k + 1]; }
    cx /= n; cy /= n;
    const c0x = this.c0x, c0y = this.c0y;
    let a = 0, b = 0, c = 0, d = 0;
    for (let k = 0; k < n; k++) {
      const px = P[2 * k] - cx, py = P[2 * k + 1] - cy;
      const rx = R[2 * k] - c0x, ry = R[2 * k + 1] - c0y;
      a += px * rx; b += px * ry; c += py * rx; d += py * ry;
    }
    const th = Math.atan2(c - b, a + d);
    const co = Math.cos(th), si = Math.sin(th);
    // linear part A = Apq · Aqq⁻¹, normalised to unit area
    const qa = this.iqa, qb = this.iqb, qd = this.iqd;
    let la = a * qa + b * qb, lb = a * qb + b * qd, lc = c * qa + d * qb, ld = c * qb + d * qd;
    const det = la * ld - lb * lc;
    if (det > 1e-6) { const s = 1 / Math.sqrt(det); la *= s; lb *= s; lc *= s; ld *= s; } else { la = co; lb = -si; lc = si; ld = co; }
    // keep only the axis-aligned squash / stretch of it (S = Rᵀ·A, diagonal):
    // a squeezed Mallow gets wider and shorter, a stretched one longer and
    // thinner, but it does not shear like a deck of cards
    let sxx = co * la + si * lc, syy = -si * lb + co * ld;
    if (sxx > 0.05 && syy > 0.05) { const nrm = 1 / Math.sqrt(sxx * syy); sxx *= nrm; syy *= nrm; } else { sxx = 1; syy = 1; }
    la = co * sxx; lb = -si * syy; lc = si * sxx; ld = co * syy;
    const be = this.beta;
    let ta = be * la + (1 - be) * co, tb = be * lb + (1 - be) * -si;
    let tc = be * lc + (1 - be) * si, td = be * ld + (1 - be) * co;
    // stay upright: undo most of the fitted rotation
    const up = this.reducedMotion ? 1 : 0.65;
    const uc = Math.cos(-th * up), us = Math.sin(-th * up);
    const ua = uc * ta - us * tc, ub = uc * tb - us * td, ucc = us * ta + uc * tc, ud = us * tb + uc * td;
    ta = ua; tb = ub; tc = ucc; td = ud;
    // anchored home: the goal sits on the rest centroid
    this.rot = th;
    for (let k = 0; k < n; k++) {
      const rx = R[2 * k] - c0x, ry = R[2 * k + 1] - c0y;
      G[2 * k] = ta * rx + tb * ry + c0x;
      G[2 * k + 1] = tc * rx + td * ry + c0y;
    }
  }

  // rigid 3×3 regions via separable box sums (FastLSM)
  _localGoal() {
    const P = this.positions, R = this.rest, G = this.goalL, n = this.n;
    const F = this._F, C = this._cnt;
    for (let k = 0; k < n; k++) {
      const px = P[2 * k], py = P[2 * k + 1], rx = R[2 * k], ry = R[2 * k + 1];
      const o = 8 * k;
      F[o] = px; F[o + 1] = py; F[o + 2] = rx; F[o + 3] = ry;
      F[o + 4] = px * rx; F[o + 5] = px * ry; F[o + 6] = py * rx; F[o + 7] = py * ry;
    }
    this._box(8);
    // per region: rotation, then the per-particle sums of R, R·r̄ and x̄
    for (let k = 0; k < n; k++) {
      const o = 8 * k, m = C[k];
      const xx = F[o] / m, xy = F[o + 1] / m, rx = F[o + 2] / m, ry = F[o + 3] / m;
      const a = F[o + 4] - m * xx * rx, b = F[o + 5] - m * xx * ry;
      const c = F[o + 6] - m * xy * rx, d = F[o + 7] - m * xy * ry;
      const th = Math.atan2(c - b, a + d);
      const co = Math.cos(th), si = Math.sin(th);
      F[o] = co; F[o + 1] = si;
      F[o + 2] = co * rx - si * ry; F[o + 3] = si * rx + co * ry;
      F[o + 4] = xx; F[o + 5] = xy;
    }
    this._box(6);
    for (let k = 0; k < n; k++) {
      const o = 8 * k, m = C[k];
      const rx = R[2 * k], ry = R[2 * k + 1];
      G[2 * k] = (F[o] * rx - F[o + 1] * ry - F[o + 2] + F[o + 4]) / m;
      G[2 * k + 1] = (F[o + 1] * rx + F[o] * ry - F[o + 3] + F[o + 5]) / m;
    }
  }

  // in-place (2R+1)² box sum of the first `w` of 8 interleaved fields
  _box(w) {
    const { cols, rows } = this, R = this.regionR;
    const F = this._F, T = this._T;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const o = 8 * (j * cols + i), a = Math.max(0, i - R) - i, b = Math.min(cols - 1, i + R) - i;
        for (let f = 0; f < w; f++) {
          let s = 0;
          for (let d = a; d <= b; d++) s += F[o + 8 * d + f];
          T[o + f] = s;
        }
      }
    }
    const stride = 8 * cols;
    for (let j = 0; j < rows; j++) {
      const a = Math.max(0, j - R) - j, b = Math.min(rows - 1, j + R) - j;
      for (let i = 0; i < cols; i++) {
        const o = 8 * (j * cols + i);
        for (let f = 0; f < w; f++) {
          let s = 0;
          for (let d = a; d <= b; d++) s += T[o + stride * d + f];
          F[o + f] = s;
        }
      }
    }
  }

  _fingers() {
    const P = this.positions, D = this.dent, GW = this._grabW, FW = this.faceW;
    D.fill(0); GW.fill(0);
    let vol = 0;
    for (const st of this.ptr.values()) {
      if (st.surface) { this._glide(st); continue; }
      // slipping: a pull stretched past the material's limit lets go
      if (!st.slipping && st.pull > 0.2) {
        const stretch = Math.hypot(st.x - st.ax, st.y - st.ay);
        if (stretch > this.material.maxStretch * (1 + 0.6 * (this.ptr.size - 1))) { st.slipping = true; this.lastSlip = { id: st.id, t: this.time }; }
      }
      if (st.slipping) st.fade = Math.max(0, st.fade - SUBSTEP / 0.08);
      if (st.fade <= 0) continue;
      const s = this._sigma(st), is2 = 1 / (2 * s * s);
      const r = st.r, ir2 = 1 / (2 * r * r);
      const dm = this.material.dMax;
      const pl = st.plunge;
      // near the silhouette the finger pushes the edge in rather than seen in
      // perspective: little pinch (the top sinks, it doesn't gather into a trapezoid)
      const pinch = PINCH * st.depth * dm * (pl ? 1 - 0.75 * pl.w : 1);
      const plS = pl ? 0.62 * st.depth * pl.w : 0;                 // edge-side compression
      const plLim = pl ? PLUNGE * st.depth * dm * pl.w : 0;          // sink past the finger
      const lr = (pl && pl.side ? 2 : 1.5) * r, ilat2 = 1 / (2 * lr * lr);
      const k = GRAB_K * st.fade * (this.reducedMotion ? 1.3 : 1);
      for (let m = 0; m < st.idx.length; m++) {
        const i = st.idx[m];
        const ox = st.ox[m], oy = st.oy[m];
        const d2 = ox * ox + oy * oy;
        const w = Math.exp(-d2 * is2);
        if (w < 0.004) continue;
        const g = Math.exp(-d2 * ir2);
        const sh = 1 - pinch * g * (1 - 0.45 * FW[i]);
        let tx = st.x + ox * sh, ty = st.y + oy * sh;
        // near the silhouette the finger pushes the edge in: the material
        // between finger and edge compresses toward the finger, smoothly, and
        // the finger sinks a little past where it touched
        if (plS > 0) {
          const along = ox * pl.nx + oy * pl.ny, lat = ox * pl.ny - oy * pl.nx;
          const gl = Math.exp(-(lat * lat) * ilat2);
          const da = gl * ((along < 0 ? -along * plS : 0) + plLim * Math.exp(-(along * along) * ir2));
          tx += pl.nx * da; ty += pl.ny * da;
        }
        const kw = Math.min(1, k * w);
        P[2 * i] += (tx - P[2 * i]) * kw;
        P[2 * i + 1] += (ty - P[2 * i + 1]) * kw;
        const dd = st.depth * g * st.fade;
        if (dd > D[i]) D[i] = dd;
        GW[i] += w;
      }

    }
    for (let k2 = 0; k2 < this.n; k2++) vol += D[k2];
    this.dentVolume = (vol / this.n) * this.restArea;
  }

  // a finger sliding over the skin: this substep's share of its motion drags
  // the skin it brushes (friction), and it presses a shallow, travelling dent
  _glide(st) {
    const P = this.positions, D = this.dent, GW = this._grabW, FW = this.faceW;
    const f = 1 / Math.max(1, this._subLeft);
    const ddx = (st.x - st.fx) * f, ddy = (st.y - st.fy) * f;
    st.fx += ddx; st.fy += ddy;
    const fx = st.fx, fy = st.fy;
    const s = Math.max(0.08, st.r * 0.85), is2 = 1 / (2 * s * s);
    const r = st.r * 0.75, ir2 = 1 / (2 * r * r);
    const reach2 = 9 * s * s;
    const drag = SURF_DRAG * (this.reducedMotion ? 1.2 : 1);
    const pinch = GLIDE_PINCH * PINCH * st.depth * this.material.dMax;
    for (let i = 0; i < this.n; i++) {
      const dx = P[2 * i] - fx, dy = P[2 * i + 1] - fy;
      const d2 = dx * dx + dy * dy;
      if (d2 > reach2) continue;
      const w = Math.exp(-d2 * is2);
      const g = Math.exp(-d2 * ir2);
      const fw = 1 - 0.5 * FW[i];
      const sh = pinch * g * (1 - 0.45 * FW[i]);
      P[2 * i] += ddx * drag * w * fw - dx * sh;
      P[2 * i + 1] += ddy * drag * w * fw - dy * sh;
      const dd = st.depth * g;
      if (dd > D[i]) D[i] = dd;
      GW[i] += w;
    }
  }

  // two-finger stretch: pull the material between the fingers toward their
  // axis, most at the midpoint, so the stretched body gets a visible waist.
  // The side resting on the floor gives less (it is held down).
  _waistPull() {
    const W = this.waist, WW = this._waistW;
    if (!W) { if (this._waistOn) { WW.fill(0); this._waistOn = false; } return; }
    const A = this.ptr.get(W.a), B = this.ptr.get(W.b);
    if (!A || !B) return;
    const ux = B.x - A.x, uy = B.y - A.y, L2 = ux * ux + uy * uy;
    if (L2 < 0.0025) return;
    this._waistOn = true;
    const L = Math.sqrt(L2), nx = -uy / L, ny = ux / L;
    const P = this.positions, FW = this.faceW, ES = this._edgeSoft, k = W.k;
    for (let i = 0; i < this.n; i++) {
      const rx = P[2 * i] - A.x, ry = P[2 * i + 1] - A.y;
      const t = (rx * ux + ry * uy) / L2;
      if (t <= 0 || t >= 1) { WW[i] = 0; continue; }
      const e0 = rx * nx + ry * ny;                    // signed distance from the axis
      // far from the axis (a diagonal stretch's far corner) the pull saturates
      const e = e0 / (1 + Math.abs(e0) / 0.35);
      const floorSide = e * ny > 0 ? 1 - 0.65 * Math.abs(ny) : 1;
      const w = Math.sin(Math.PI * t);
      const a = k * w * w * floorSide * (1 - 0.5 * FW[i]) * ES[i];
      WW[i] = w;
      const d = -e * a * WAIST_K;
      P[2 * i] += nx * d; P[2 * i + 1] += ny * d;
    }
  }

  // volume: the outline keeps its area, plus whatever a dent pushes into the
  // screen. The missing area comes back as a smooth barrel bulge (mostly
  // sideways, at mid-height; the floor holds the base) — never by pushing
  // single edge particles, which crumples the outline.
  _balloon() {
    const P = this.positions, n = this.n, fl = this.floor, BW = this._barrel;
    const A = polyArea(P, this.boundary);
    const target = this.restArea + BALLOON_GAIN * this.material.dMax * this.dentVolume;
    const C = target - A;
    if (Math.abs(C) < 1e-7 || A < 1e-6) return;
    let cx = 0;
    for (let k = 0; k < n; k++) cx += P[2 * k];
    cx /= n;
    const s = clamp((BALLOON_K * C) / (A * this._barrelMean), -0.02, 0.02);
    const WW = this._waistOn ? this._waistW : null;
    for (let k = 0; k < n; k++) {
      const w = WW ? BW[k] * (1 - 0.85 * WW[k]) : BW[k];
      P[2 * k] += s * w * (P[2 * k] - cx);
      P[2 * k + 1] -= s * (s > 0 ? 0.3 : 0.7) * w * (fl - P[2 * k + 1]);
    }
  }

  // no triangle may collapse below 30 % of its rest area or flip
  _unfold() {
    const P = this.positions, T = this.triAll, R2 = this._restTri2;
    for (let t = 0; t < R2.length; t++) {
      const i = T[3 * t], j = T[3 * t + 1], k = T[3 * t + 2];
      const a2 = cross(P, i, j, k), min = 0.3 * R2[t];
      if (a2 >= min) continue;
      const C = a2 - min;
      // ∇(2·area) for each vertex
      const gix = P[2 * j + 1] - P[2 * k + 1], giy = P[2 * k] - P[2 * j];
      const gjx = P[2 * k + 1] - P[2 * i + 1], gjy = P[2 * i] - P[2 * k];
      const gkx = P[2 * i + 1] - P[2 * j + 1], gky = P[2 * j] - P[2 * i];
      const sum = gix * gix + giy * giy + gjx * gjx + gjy * gjy + gkx * gkx + gky * gky;
      if (sum < 1e-12) continue;
      const s = (0.5 * C) / sum;
      P[2 * i] -= s * gix; P[2 * i + 1] -= s * giy;
      P[2 * j] -= s * gjx; P[2 * j + 1] -= s * gjy;
      P[2 * k] -= s * gkx; P[2 * k + 1] -= s * gky;
    }
  }

  _floorClamp() {
    this._floorClampOnly();
    // the base can't buckle into the floor, so keep its particles in order:
    // neighbours along the bottom row stay at least 45 % of their rest gap apart
    const P = this.positions, R = this.rest, { cols, rows } = this, a = (rows - 1) * cols;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < cols - 1; i++) {
        const k = a + i, kn = k + 1;
        const min = 0.45 * (R[2 * kn] - R[2 * k]);
        const gap = P[2 * kn] - P[2 * k];
        if (gap < min) { const c = (min - gap) * 0.5; P[2 * k] -= c; P[2 * kn] += c; }
      }
    }
  }

  _floorClampOnly() {
    const P = this.positions, X0 = this.prev, fl = this.floor;
    for (let k = 0; k < this.n; k++) {
      const iy = 2 * k + 1;
      const pen = P[iy] - fl;
      if (pen > 0) {
        P[iy] = fl;
        // kinetic friction, proportional to how hard it was pushed down
        const mu = 0.15 * Math.min(1, pen / 0.004);
        P[2 * k] = X0[2 * k] + (P[2 * k] - X0[2 * k]) * (1 - mu);
      }
    }
  }

  // extreme input never leaves NaN behind: fall back to the rest shape
  _guard() {
    const P = this.positions;
    for (let k = 0; k < P.length; k++) {
      const v = P[k];
      if (!(v > -50 && v < 50)) { this.positions.set(this.rest); this.prev.set(this.rest); this.vel.fill(0); this.nanResets = (this.nanResets || 0) + 1; return; }
    }
  }

  // ----------------------------------------------------------- outputs --
  /** Mean kinetic + elastic energy (0 at rest). */
  get energy() {
    const P = this.positions, V = this.vel, R = this.rest, n = this.n;
    let ke = 0, pe = 0;
    for (let k = 0; k < 2 * n; k++) { ke += V[k] * V[k]; const d = P[k] - R[k]; pe += d * d; }
    return (ke + 400 * pe) / n;
  }

  get area() { return polyArea(this.positions, this.boundary); }

  /** Deepest current dent (0..1) and the summed grab weight per particle. */
  get grabWeights() { return this._grabW; }

  bounds() {
    const P = this.positions, b = this._bounds;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < this.n; k++) {
      const x = P[2 * k], y = P[2 * k + 1];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    b.x0 = x0; b.y0 = y0; b.x1 = x1; b.y1 = y1; b.w = x1 - x0; b.h = y1 - y0; b.cx = (x0 + x1) / 2; b.cy = (y0 + y1) / 2;
    return b;
  }

  /** Per lattice row: [mean y, left x, right x] (for the strip-warp tier). */
  rowExtents() {
    const { cols, rows } = this, P = this.positions, E = this._rowExt;
    for (let j = 0; j < rows; j++) {
      const a = j * cols, z = a + cols - 1;
      let y = 0;
      for (let i = a; i <= z; i++) y += P[2 * i + 1];
      E[3 * j] = y / cols; E[3 * j + 1] = P[2 * a]; E[3 * j + 2] = P[2 * z];
    }
    return E;
  }

  /** Lighting inputs per vertex into this.shade: compression (rest/area − 1, + dent) and a pseudo-normal. */
  computeShading() {
    const P = this.positions, T = this.indices, R = this.rest, S = this.shade, H = this._h, VC = this._vc, D = this.dent;
    const { cols, rows, n } = this;
    H.fill(0);
    for (let t = 0; t < T.length; t += 3) {
      const i = T[t], j = T[t + 1], k = T[t + 2];
      const a = cross(P, i, j, k), r = cross(R, i, j, k);
      const c = a > 1e-9 ? clamp(r / a - 1, -0.6, 2) : 2;
      H[i] += c; H[j] += c; H[k] += c;
    }
    const dm = this.material.dMax;
    for (let k = 0; k < n; k++) {
      const c = VC[k] ? H[k] / VC[k] : 0;
      S[3 * k] = c + 0.6 * D[k];
      // height (body units): a dent sinks about half the squeeze depth, squeezed skin a little
      H[k] = -(0.55 * dm * D[k] + 0.05 * clamp(c, -0.5, 1.5));
    }
    const kx = 0.5 / this.dx, ky = 0.5 / this.dy, NS = 1;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const hl = H[i > 0 ? k - 1 : k], hr = H[i < cols - 1 ? k + 1 : k];
        const hu = H[j > 0 ? k - cols : k], hd = H[j < rows - 1 ? k + cols : k];
        S[3 * k + 1] = clamp(-(hr - hl) * kx * NS, -1.5, 1.5);
        S[3 * k + 2] = clamp(-(hd - hu) * ky * NS, -1.5, 1.5);
      }
    }
    return S;
  }

  /** Point (body units) → lattice uv inside the visible mesh, or null. */
  locate(x, y, out = { u: 0, v: 0, tri: -1 }) {
    const P = this.positions, T = this.indices, { cols, rows } = this;
    for (let t = 0; t < T.length; t += 3) {
      const i = T[t], j = T[t + 1], k = T[t + 2];
      const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * j], by = P[2 * j + 1], cx = P[2 * k], cy = P[2 * k + 1];
      if (x < Math.min(ax, bx, cx) || x > Math.max(ax, bx, cx) || y < Math.min(ay, by, cy) || y > Math.max(ay, by, cy)) continue;
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(den) < 1e-12) continue;
      const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den;
      const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const ui = (i % cols) / (cols - 1), vi = ((i / cols) | 0) / (rows - 1);
      const uj = (j % cols) / (cols - 1), vj = ((j / cols) | 0) / (rows - 1);
      const uk = (k % cols) / (cols - 1), vk = ((k / cols) | 0) / (rows - 1);
      out.u = l1 * ui + l2 * uj + l3 * uk;
      out.v = l1 * vi + l2 * vj + l3 * vk;
      out.tri = t / 3;
      return out;
    }
    return null;
  }

  /** Lattice uv → current position (body units), bilinear. */
  sample(u, v, out = { x: 0, y: 0 }) {
    const { cols, rows } = this, P = this.positions;
    const fx = clamp(u, 0, 1) * (cols - 1), fy = clamp(v, 0, 1) * (rows - 1);
    const i = Math.min(cols - 2, fx | 0), j = Math.min(rows - 2, fy | 0);
    const tx = fx - i, ty = fy - j;
    const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    out.x = (P[2 * a] * (1 - tx) + P[2 * b] * tx) * (1 - ty) + (P[2 * c] * (1 - tx) + P[2 * d] * tx) * ty;
    out.y = (P[2 * a + 1] * (1 - tx) + P[2 * b + 1] * tx) * (1 - ty) + (P[2 * c + 1] * (1 - tx) + P[2 * d + 1] * tx) * ty;
    return out;
  }

  /** Mean velocity of the face region (body units/s), for face lag. */
  faceVelocity(out = { x: 0, y: 0 }) {
    const V = this.vel, W = this.faceW;
    let sx = 0, sy = 0, sw = 0;
    for (let k = 0; k < this.n; k++) { const w = W[k]; if (w > 0.5) { sx += V[2 * k] * w; sy += V[2 * k + 1] * w; sw += w; } }
    out.x = sw ? sx / sw : 0; out.y = sw ? sy / sw : 0;
    return out;
  }
}

function cross(P, i, j, k) {
  return (P[2 * j] - P[2 * i]) * (P[2 * k + 1] - P[2 * i + 1]) - (P[2 * k] - P[2 * i]) * (P[2 * j + 1] - P[2 * i + 1]);
}

function polyArea(P, B) {
  let s = 0;
  const m = B.length;
  for (let t = 0; t < m; t++) {
    const a = B[t], b = B[(t + 1) % m];
    s += P[2 * a] * P[2 * b + 1] - P[2 * b] * P[2 * a + 1];
  }
  return 0.5 * s;
}
