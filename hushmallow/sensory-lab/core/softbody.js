// SoftBody Physics Engine — a 2-D XPBD spring mesh for the approved Mallow art.
//
// The body is a triangle mesh laid over the artwork's silhouette (cells that
// touch the alpha mask, dilated by one). Every substep:
//   predict  x* = x + v·h (+ gravity)
//   solve    distance links (surface), bending links (smoothness), triangle
//            areas (incompressibility → squeezing bulges the sides), the
//            shape-memory goal (the Mallow's pose), finger grabs, the floor
//   update   v = (x − x_prev) / h, then velocity damping
// XPBD (compliance instead of raw stiffness) keeps it unconditionally stable at
// any frame rate, so a slow phone gets the same feel with fewer substeps.
//
// Local frame: artwork pixels, origin at the bottom-centre of the body box,
// x right, y DOWN, floor at y = 0 (the body occupies y ∈ [−height, 0]).
// No DOM access: this module runs (and is tested) in Node.

import { clamp, rubber } from './math.js';
import { getMaterial } from './materials.js';

export class SoftBody {
  /**
   * @param {object} o
   * @param {number} o.width   body box width (local px)
   * @param {number} o.height  body box height (local px)
   * @param {number} [o.cols=12] grid columns
   * @param {number} [o.rows=12] grid rows
   * @param {(u:number,v:number)=>boolean} [o.inside] alpha-mask test, u,v ∈ [0,1] over the body box
   * @param {string|object} [o.material='marshmallow']
   * @param {number} [o.substeps=8]
   */
  constructor(o) {
    this.W = o.width; this.H = o.height;
    this.cols = o.cols || 12; this.rows = o.rows || 12;
    this.substeps = o.substeps || 8;
    this.setMaterial(o.material || 'marshmallow');
    this._build(o.inside || (() => true));
    this.grabs = new Map();
    this.press = null;          // gentle hold dent {x, y, depth, r}
    this.pose = { sx: 1, sy: 1, squash: 0, lean: 0, float: 0, mat: null, px: 0 };
    this.setPose({});
    this.time = 0;
  }

  setMaterial(m) {
    this.mat = typeof m === 'string' ? getMaterial(m) : { ...getMaterial('marshmallow'), ...m };
    if (this.pose) this.pose.float = this.mat.float * this.H;
  }

  // ---------------------------------------------------------------- build --
  _build(inside) {
    const { cols, rows, W, H } = this;
    const used = new Uint8Array(cols * rows);
    const S = [[0.02, 0.02], [0.98, 0.02], [0.02, 0.98], [0.98, 0.98], [0.5, 0.5], [0.5, 0.02], [0.5, 0.98], [0.02, 0.5], [0.98, 0.5]];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        for (const [a, b] of S) {
          if (inside((i + a) / cols, (j + b) / rows)) { used[j * cols + i] = 1; break; }
        }
      }
    }
    // dilate one cell so the silhouette's soft edge sits inside the mesh
    const dil = used.slice();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (used[j * cols + i]) continue;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = i + di, jj = j + dj;
          if (ii >= 0 && jj >= 0 && ii < cols && jj < rows && used[jj * cols + ii]) dil[j * cols + i] = 1;
        }
      }
    }
    const idx = new Int32Array((cols + 1) * (rows + 1)).fill(-1);
    const ux = [], vy = [];
    const node = (i, j) => {
      const k = j * (cols + 1) + i;
      if (idx[k] < 0) { idx[k] = ux.length; ux.push(i / cols); vy.push(j / rows); }
      return idx[k];
    };
    const tris = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (!dil[j * cols + i]) continue;
        const a = node(i, j), b = node(i + 1, j), c = node(i, j + 1), d = node(i + 1, j + 1);
        // alternate the diagonal so the mesh has no handedness
        if ((i + j) & 1) tris.push(a, b, d, a, d, c);
        else tris.push(a, b, c, b, d, c);
      }
    }
    const n = ux.length;
    this.n = n;
    this.u = Float32Array.from(ux); this.v = Float32Array.from(vy);
    const F = () => new Float64Array(n);
    this.rx = F(); this.ry = F(); this.px = F(); this.py = F(); this.ox = F(); this.oy = F();
    this.vx = F(); this.vy = F(); this.gx = F(); this.gy = F();
    for (let k = 0; k < n; k++) {
      this.rx[k] = (this.u[k] - 0.5) * W;
      this.ry[k] = (this.v[k] - 1) * H;
    }
    this.px.set(this.rx); this.py.set(this.ry); this.gx.set(this.rx); this.gy.set(this.ry);
    this.tri = Uint16Array.from(tris);
    // edges from triangles (unique), plus two-cell bending links
    const seen = new Set();
    const edges = [];
    const addEdge = (a, b, bend) => {
      const key = a < b ? a * 65536 + b : b * 65536 + a;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push(a, b, bend ? 1 : 0);
    };
    for (let t = 0; t < tris.length; t += 3) {
      addEdge(tris[t], tris[t + 1]); addEdge(tris[t + 1], tris[t + 2]); addEdge(tris[t + 2], tris[t]);
    }
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const a = idx[j * (cols + 1) + i];
        if (a < 0) continue;
        if (i + 2 <= cols) { const b = idx[j * (cols + 1) + i + 2], m = idx[j * (cols + 1) + i + 1]; if (b >= 0 && m >= 0) addEdge(a, b, true); }
        if (j + 2 <= rows) { const b = idx[(j + 2) * (cols + 1) + i], m = idx[(j + 1) * (cols + 1) + i]; if (b >= 0 && m >= 0) addEdge(a, b, true); }
      }
    }
    const ne = edges.length / 3;
    this.ea = new Uint16Array(ne); this.eb = new Uint16Array(ne); this.eBend = new Uint8Array(ne); this.eL = new Float64Array(ne);
    for (let e = 0; e < ne; e++) {
      const a = edges[e * 3], b = edges[e * 3 + 1];
      this.ea[e] = a; this.eb[e] = b; this.eBend[e] = edges[e * 3 + 2];
      this.eL[e] = Math.hypot(this.rx[a] - this.rx[b], this.ry[a] - this.ry[b]);
    }
    const nt = tris.length / 3;
    this.tA = new Float64Array(nt);
    for (let t = 0; t < nt; t++) this.tA[t] = this._triArea(t, this.rx, this.ry);
    this.restArea = this.tA.reduce((s, a) => s + a, 0);
    let minY = 0;
    for (let k = 0; k < n; k++) minY = Math.min(minY, this.ry[k]);
    this.restTop = minY;
    this.cell = Math.min(W / cols, H / rows);
  }

  _triArea(t, X, Y) {
    const a = this.tri[t * 3], b = this.tri[t * 3 + 1], c = this.tri[t * 3 + 2];
    return 0.5 * ((X[b] - X[a]) * (Y[c] - Y[a]) - (X[c] - X[a]) * (Y[b] - Y[a]));
  }

  // ----------------------------------------------------------------- pose --
  /**
   * The Mallow's intended shape this frame (from its expression rig and from
   * gestures). The mesh springs toward it with the material's own dynamics.
   * @param {object} p
   * @param {number} [p.squash]  rig squash (+ flatter) — width/height follow the rig's own formula
   * @param {number} [p.breath]  breathing scale offset
   * @param {number} [p.lean]    horizontal lean of the top (local px)
   * @param {{c:number, ax:number, ay:number, px:number}} [p.squeeze] compression c along unit axis (ax, ay) about x = px on the floor
   */
  setPose(p = {}) {
    const P = this.pose;
    const sq = p.squash || 0, br = p.breath || 0;
    P.squash = sq;
    P.sy = (1 - sq) * (1 + br);
    P.sx = (1 + sq * 0.62) * (1 - br * 0.6);
    P.lean = p.lean || 0;
    P.float = (p.float ?? this.mat.float) * this.H;
    const s = p.squeeze;
    if (s && Math.abs(s.c) > 1e-4) {
      // side pinches compress less than top-down squeezes (gravity helps those)
      const c = clamp(s.c, -0.3, 0.42) * (0.55 + 0.45 * Math.abs(s.ay));
      // squeeze bulges sideways (material volume, softened so a hard pinch
      // reads as a squish rather than a tower); a pull (c < 0) thins it
      const e = c > 0 ? Math.min(0.38, this.mat.volume * c * 0.9) : c * 0.45;
      const ax = s.ax, ay = s.ay, bx = -ay, by = ax;
      P.mat = [1 - c * ax * ax + e * bx * bx, -c * ax * ay + e * bx * by,
        -c * ax * ay + e * bx * by, 1 - c * ay * ay + e * by * by];
      P.px = s.px || 0;
      P.det = P.mat[0] * P.mat[3] - P.mat[1] * P.mat[2];
    } else { P.mat = null; P.det = 1; }
  }

  _goals() {
    const P = this.pose, n = this.n;
    const { rx, ry, v, gx, gy } = this;
    const pr = this.press;
    for (let k = 0; k < n; k++) {
      const vm = v[k];
      let x = rx[k] * P.sx * (1 + P.squash * 0.32 * Math.sin(Math.PI * vm));
      let y = ry[k] * P.sy;
      x += P.lean * (1 - vm) * (1 - vm);
      if (P.mat) {
        const dx = x - P.px, dy = y, M = P.mat;
        x = P.px + M[0] * dx + M[1] * dy;
        y = M[2] * dx + M[3] * dy;
      }
      y -= P.float;
      gx[k] = x; gy[k] = y;
    }
    if (pr && pr.depth > 0.01) {
      // a finger resting on the body leaves a soft dent toward the body's middle
      const cx = 0, cy = this.restTop * 0.5;
      let dx = cx - pr.x, dy = cy - pr.y;
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const r2 = pr.r * pr.r;
      for (let k = 0; k < n; k++) {
        const ddx = gx[k] - pr.x, ddy = gy[k] - pr.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 < r2) {
          const w = 1 - d2 / r2;
          gx[k] += dx * pr.depth * w * w; gy[k] += dy * pr.depth * w * w;
        }
      }
    }
  }

  // ---------------------------------------------------------- interaction --
  /** Nodes within r of (x, y) with smooth weights. */
  near(x, y, r) {
    const out = [];
    const r2 = r * r;
    for (let k = 0; k < this.n; k++) {
      const dx = this.px[k] - x, dy = this.py[k] - y, d2 = dx * dx + dy * dy;
      if (d2 < r2) { const w = 1 - Math.sqrt(d2) / r; out.push([k, w * w * (3 - 2 * w)]); }
    }
    return out;
  }

  /** Distance from (x,y) to the nearest node: a cheap "is the finger on the body" test. */
  distance(x, y) {
    let best = Infinity;
    for (let k = 0; k < this.n; k++) best = Math.min(best, (this.px[k] - x) ** 2 + (this.py[k] - y) ** 2);
    return Math.sqrt(best);
  }

  /** Grab the surface at (x, y). The finger then pulls it with rubber-band resistance. */
  grab(id, x, y, radius = this.H * 0.42) {
    let nodes = this.near(x, y, radius);
    if (!nodes.length) nodes = this.near(x, y, radius * 2);
    const g = { x0: x, y0: y, tx: x, ty: y, nodes: nodes.map((n) => n[0]), w: nodes.map((n) => n[1]),
      ox: nodes.map((n) => this.px[n[0]]), oy: nodes.map((n) => this.py[n[0]]), dx: 0, dy: 0 };
    this.grabs.set(id, g);
    return g;
  }

  moveGrab(id, x, y) {
    const g = this.grabs.get(id);
    if (!g) return null;
    let dx = x - g.x0, dy = y - g.y0;
    const d = Math.hypot(dx, dy);
    if (d > 1e-6) {
      const lim = this.mat.stretch * this.H;
      const k = rubber(d, lim) / d;
      dx *= k; dy *= k;
    }
    g.tx = x; g.ty = y; g.dx = dx; g.dy = dy;
    return g;
  }

  /** Let go. `fling` (local px/s) adds the finger's momentum to the surface it held. */
  release(id, flingX = 0, flingY = 0) {
    const g = this.grabs.get(id);
    if (!g) return 0;
    this.grabs.delete(id);
    const cap = this.H * 4;
    const fx = clamp(flingX, -cap, cap) * 0.25, fy = clamp(flingY, -cap, cap) * 0.25;
    for (let i = 0; i < g.nodes.length; i++) { const k = g.nodes[i]; this.vx[k] += fx * g.w[i]; this.vy[k] += fy * g.w[i]; }
    return Math.hypot(g.dx, g.dy) / this.H;
  }

  releaseAll() { for (const id of [...this.grabs.keys()]) this.release(id); }

  /** A poke: inward velocity impulse around (x, y). strength in body heights / s. */
  poke(x, y, strength = 1, radius = this.H * 0.35) {
    const cx = 0, cy = this.restTop * 0.5;
    let dx = cx - x, dy = cy - y;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const s = strength * this.H * this.mat.dent;
    for (const [k, w] of this.near(x, y, radius)) { this.vx[k] += dx * s * w; this.vy[k] += dy * s * w; }
  }

  /** A stroke: tangential shove that ripples the surface along the finger's motion. */
  brush(x, y, vx, vy, radius = this.H * 0.3) {
    const cap = this.H * 2.5;
    const fx = clamp(vx, -cap, cap) * 0.06, fy = clamp(vy, -cap, cap) * 0.06;
    for (const [k, w] of this.near(x, y, radius)) { this.vx[k] += fx * w; this.vy[k] += fy * w; }
  }

  /** Whole-body impulse (landing, hop take-off). */
  impulse(vx, vy) { for (let k = 0; k < this.n; k++) { this.vx[k] += vx * (1 - this.v[k] * 0.6); this.vy[k] += vy * (1 - this.v[k]); } }

  setPress(x, y, depth, r = this.H * 0.4) { this.press = depth > 0 ? { x, y, depth, r } : null; }

  // Links and areas measure deviation from the *pose*, not from the artwork's
  // rest shape, so pose changes (squash, squeeze, breath) are resisted only by
  // inertia and shape memory while pokes and pulls are resisted locally.
  _restFromGoal() {
    const { gx, gy, ea, eb, eL, tA } = this;
    for (let e = 0; e < ea.length; e++) eL[e] = Math.hypot(gx[eb[e]] - gx[ea[e]], gy[eb[e]] - gy[ea[e]]);
    for (let t = 0; t < tA.length; t++) tA[t] = this._triArea(t, gx, gy);
  }

  // ------------------------------------------------------------- simulate --
  step(dt) {
    dt = clamp(dt, 0, 1 / 20);
    if (dt <= 0) return;
    this.time += dt;
    this._goals();
    this._restFromGoal();
    const m = this.mat, n = this.n, N = this.substeps;
    const h = dt / N, h2 = h * h;
    const { px, py, ox, oy, vx, vy, gx, gy } = this;
    const aGoal = 1 / m.goalK / h2;
    const kGoal = 1 / (1 + aGoal);
    const aEdge = m.edge / h2, aBend = m.bend / h2, aArea = m.area / h2;
    const damp = Math.exp(-m.damping * h);
    const g = m.gravity;
    const grabs = [...this.grabs.values()];
    const fric = m.friction;
    for (let s = 0; s < N; s++) {
      for (let k = 0; k < n; k++) {
        vy[k] += g * h;
        ox[k] = px[k]; oy[k] = py[k];
        px[k] += vx[k] * h; py[k] += vy[k] * h;
      }
      // surface + bending links
      const { ea, eb, eL, eBend } = this;
      for (let e = 0; e < ea.length; e++) {
        const a = ea[e], b = eb[e];
        const dx = px[b] - px[a], dy = py[b] - py[a];
        const d = Math.hypot(dx, dy);
        if (d < 1e-9) continue;
        const C = d - eL[e];
        const lam = -C / (2 + (eBend[e] ? aBend : aEdge));
        const cx = dx / d * lam, cy = dy / d * lam;
        px[a] -= cx; py[a] -= cy; px[b] += cx; py[b] += cy;
      }
      // triangle areas
      const T = this.tri, A0 = this.tA;
      for (let t = 0; t < A0.length; t++) {
        const a = T[t * 3], b = T[t * 3 + 1], c = T[t * 3 + 2];
        const A = 0.5 * ((px[b] - px[a]) * (py[c] - py[a]) - (px[c] - px[a]) * (py[b] - py[a]));
        const C = A - A0[t];
        const gax = 0.5 * (py[b] - py[c]), gay = 0.5 * (px[c] - px[b]);
        const gbx = 0.5 * (py[c] - py[a]), gby = 0.5 * (px[a] - px[c]);
        const gcx = 0.5 * (py[a] - py[b]), gcy = 0.5 * (px[b] - px[a]);
        const den = gax * gax + gay * gay + gbx * gbx + gby * gby + gcx * gcx + gcy * gcy + aArea;
        if (den < 1e-9) continue;
        const lam = -C / den;
        px[a] += gax * lam; py[a] += gay * lam;
        px[b] += gbx * lam; py[b] += gby * lam;
        px[c] += gcx * lam; py[c] += gcy * lam;
      }
      // shape memory
      for (let k = 0; k < n; k++) { px[k] += (gx[k] - px[k]) * kGoal; py[k] += (gy[k] - py[k]) * kGoal; }
      // fingers
      for (const G of grabs) {
        for (let i = 0; i < G.nodes.length; i++) {
          const k = G.nodes[i];
          const kk = 1 / (1 + 1 / (m.grabK * G.w[i]) / h2);
          px[k] += (G.ox[i] + G.dx - px[k]) * kk;
          py[k] += (G.oy[i] + G.dy - py[k]) * kk;
        }
      }
      // floor with friction
      for (let k = 0; k < n; k++) {
        if (py[k] > 0) { py[k] = 0; px[k] = ox[k] + (px[k] - ox[k]) * (1 - fric); }
      }
      for (let k = 0; k < n; k++) {
        vx[k] = (px[k] - ox[k]) / h * damp;
        vy[k] = (py[k] - oy[k]) / h * damp;
      }
    }
  }

  // -------------------------------------------------------------- metrics --
  /** Shape read-outs that drive the face and the sound. */
  metrics() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, ke = 0, off = 0;
    const { px, py, vx, vy, gx, gy, n } = this;
    for (let k = 0; k < n; k++) {
      if (px[k] < minX) minX = px[k]; if (px[k] > maxX) maxX = px[k];
      if (py[k] < minY) minY = py[k]; if (py[k] > maxY) maxY = py[k];
      ke += vx[k] * vx[k] + vy[k] * vy[k];
      off = Math.max(off, Math.hypot(px[k] - gx[k], py[k] - gy[k]));
    }
    let area = 0;
    for (let t = 0; t < this.tA.length; t++) area += this._triArea(t, px, py);
    const h = maxY - minY, w = maxX - minX;
    return {
      squash: 1 - h / (-this.restTop),          // + compressed, − stretched tall
      widen: w / this.W - 1,
      offset: off / this.H,                     // largest node offset from the pose, body heights
      energy: Math.sqrt(ke / n) / this.H,       // RMS node speed, body heights / s
      area: area / this.restArea,
      top: minY, bottom: maxY,
    };
  }

  /** Reset to the current pose with no motion. */
  settleNow() {
    this._goals();
    this.px.set(this.gx); this.py.set(this.gy); this.vx.fill(0); this.vy.fill(0);
  }
}

/** Build an alpha-mask tester from RGBA pixels of the approved artwork. */
export function alphaMask(data, imgW, imgH, box, threshold = 24) {
  const [bx0, by0, bx1, by1] = box;
  return (u, v) => {
    const x = Math.round(bx0 + u * (bx1 - bx0)), y = Math.round(by0 + v * (by1 - by0));
    if (x < 0 || y < 0 || x >= imgW || y >= imgH) return false;
    return data[(y * imgW + x) * 4 + 3] > threshold;
  };
}
