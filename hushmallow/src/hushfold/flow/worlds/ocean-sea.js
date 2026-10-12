// Luminous Ocean — the sea itself (pure: no DOM, no clock; node-tested).
//
// Three pieces, all allocation-free per frame:
//
//   Sea        Gerstner wave packets, one per stroke (a pool of 16). Physics constants are the
//              audit's (docs/audit/worlds.md proposal 6), exactly:
//                ω = √(g·k + σ·k³)      g = 59.5 px/s²,  σ = 18400 px³/s²
//                c_g = (g + 3σk²) / 2ω  (the envelope travels at the group velocity)
//                A(t) = A₀·e^(−βt)      β = 0.0233 + 40.7·k² s⁻¹  (β₀ + viscous ν·k²)
//              so a 400 px swell has a period of ≈ 6.3 s and lives ≈ 30 s, and a 50 px ripple
//              a period of ≈ 0.95 s and lives ≈ 1.5 s: the physics itself rewards long slow
//              strokes. Height h = Σ A·E·cos θ (E a Gaussian envelope), crest sharpening by
//              Gerstner horizontal displacement, Stokes drift u = 3·Σ d·ω·k·(A·E)² for floating
//              things. A stroke is "sculpted" while the finger is down (the swell forms along
//              the path, its crest under the fingertip) and set free at release.
//   Wake       a 2-D height field on the screen (4 px cells) for the instant bioluminescent
//              wake under the finger: c² ≤ 0.24, damping 0.996 a step, anisotropic by
//              perspective (ripples far away crawl and flatten), hushed where a finger rests.
//   camera     the perspective: world plane (x across, z away from you) in near-plane px,
//              s(z) = 1/(1 + z/Z0), screen x = W/2 + x·s, y = hy + Hw·s − h·s.
//
// Deviation from the audit (documented in luminous-ocean.js): Z0 and Hw are fitted to the
// screen's composition — the hero Mallow's waterline, the Thought Mallow's home just beyond
// it at z = Z0 — instead of Z0 = 0.3U with the near plane at the bottom edge. With 0.3U the
// lens is a 118° wide angle and near-water rings stretch 4:1 vertically; fitted, the view
// grazes the water (near rings flatten to ≈ 0.6) and "4·Z0 away" is a journey on screen.

export const SEA = Object.freeze({
  G: 59.5, SIGMA: 18400, NU: 40.7, BETA0: 0.0233,
  K_MAX: 16,                 // packets alive at once (the smallest-energy one is replaced)
  STOKES: 3,                 // Stokes drift gain
  Q_MAX: 0.8, Q_K: 0.6,      // Gerstner steepness: Q = min(Q_MAX, Q_K / (k·A·N))
  KA_MAX: 0.45,              // amplitude cap: k·A ≤ 0.45, nothing breaks
  SPREAD_SEC: 14,            // envelopes widen slowly with age (dispersion), conserving energy
  MIN_A: 0.04,               // px: a packet this small is gone
  SCULPT_TAU: 0.22,          // s: a sculpted swell's amplitude follows the stroke this fast
});

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Dispersion for a wavelength (px): k, ω, phase and group speed, decay rate, period, lifetime. */
export function dispersion(lambda) {
  const k = TAU / lambda;
  const omega = Math.sqrt(SEA.G * k + SEA.SIGMA * k * k * k);
  const cg = (SEA.G + 3 * SEA.SIGMA * k * k) / (2 * omega);
  const beta = SEA.BETA0 + SEA.NU * k * k;
  return { k, omega, cg, cp: omega / k, beta, period: TAU / omega, life: 1 / beta };
}

/**
 * What a stroke makes (audit proposal 6): Ls = stroke length on screen (px), v̄ its mean
 * moving speed (px/s), U = min(W, H).
 *   slowness s = smoothstep(0.9U, 0.15U, v̄)
 *   λ = lerp(0.12U, clamp(1.5·Ls, 0.3U, 1.8U), s)
 *   A = min(0.45/k, (0.04 + 0.06s)·λ) — eased in over the first 0.12U of a stroke, so a
 *   brush of the water is a ripple, not a swell.
 */
export function strokeWave(lenPx, speedPx, U) {
  const s = smoothstep(0.9 * U, 0.15 * U, speedPx);
  const lambda = lerp(0.12 * U, clamp(1.5 * lenPx, 0.3 * U, 1.8 * U), s);
  const k = TAU / lambda;
  const A = Math.min(SEA.KA_MAX / k, (0.04 + 0.06 * s) * lambda) * (0.35 + 0.65 * smoothstep(0, 0.12 * U, lenPx));
  return { s, lambda, A, k };
}

// ------------------------------------------------------------------ camera --
/**
 * The perspective camera, fitted to the composition:
 *   waterY   the hero Mallow's waterline on screen (its lowest tenth sits in the water)
 *   homeY    where the Thought Mallow floats at z = Z0 (just beyond the hero, s = 0.5)
 *   ratio    how much a ring at the waterline is flattened (vertical / horizontal)
 * Hw = (homeY − hy) / 0.5 is the camera's height, Z0 = (waterY − hy) / ratio its focal length.
 */
export function makeCamera({ W, H, hy, homeY, waterY, ratio = 0.6 }) {
  const cam = { W, H, hy, Hw: 1, Z0: 1, homeY, waterY, ratio };
  fitCamera(cam, hy);
  return cam;
}
/** Re-fit for a new horizon line (the ocean's horizon rises after the melt). */
export function fitCamera(cam, hy) {
  cam.hy = hy;
  cam.Hw = Math.max(24, (cam.homeY - hy) / 0.5);
  cam.Z0 = Math.max(60, (cam.waterY - hy) / cam.ratio);
  return cam;
}
/** Perspective scale at depth z (1 at the near plane, 0.5 at Z0, → 0 at the horizon). */
export const scaleAt = (cam, z) => cam.Z0 / (cam.Z0 + Math.max(z, -0.85 * cam.Z0));
/** Depth for a perspective scale. */
export const depthAt = (cam, s) => cam.Z0 * (1 / Math.max(1e-4, s) - 1);
/** Screen y of the still water surface at depth z. */
export const surfaceY = (cam, z) => cam.hy + cam.Hw * scaleAt(cam, z);
/** World → screen. out = {x, y, s}. h lifts the point (world px). */
export function project(cam, x, z, h, out) {
  const s = scaleAt(cam, z);
  out.s = s; out.x = cam.W / 2 + x * s; out.y = cam.hy + (cam.Hw - h) * s;
  return out;
}
/** Screen → world on the still water. Points at or above the horizon map just below it. out = {x, z, s}. */
export function unproject(cam, sx, sy, out) {
  const s = Math.max(0.012, (Math.max(sy, cam.hy + 0.5) - cam.hy) / cam.Hw);
  out.s = s; out.z = depthAt(cam, s); out.x = (sx - cam.W / 2) / s;
  return out;
}
/** A screen-space stroke vector at depth z → world vector (dx, dz). Up the screen is away from you. */
export function screenToWorldVec(cam, z, dsx, dsy, out) {
  const s = scaleAt(cam, z);
  out.x = dsx / s;
  out.z = -dsy * cam.Z0 / (cam.Hw * s * s);
  return out;
}

/**
 * A stroke on the screen → the packet it sculpts (world units). st: { x0, y0 (where it began),
 * x1, y1 (the fingertip now), len (path length, screen px), speed (mean moving speed, px/s) }.
 * The envelope spans the stroke (centred at its midpoint), the swell travels along it, and its
 * crest sits under the fingertip. Returns null for a stroke too short to point anywhere.
 */
export function strokePacket(cam, U, st, out = {}) {
  const a = unproject(cam, st.x0, st.y0, { x: 0, z: 0, s: 0 }), b = unproject(cam, st.x1, st.y1, { x: 0, z: 0, s: 0 });
  let dx = b.x - a.x, dz = b.z - a.z;
  const chord = Math.hypot(dx, dz);
  if (chord < 1e-3) return null;
  const w = strokeWave(st.len, st.speed, U);
  out.x = (a.x + b.x) / 2; out.z = (a.z + b.z) / 2; out.ax = b.x; out.az = b.z;
  out.dx = dx / chord; out.dz = dz / chord; out.len = chord;
  out.lambda = w.lambda; out.A = w.A; out.s = w.s;
  return out;
}

/**
 * The Stokes-drift gain that makes one unhurried long stroke (from in front of the hero to just
 * beyond the Thought Mallow's home, 0.2U/s) carry the thought about `target`·Z0 further out — so
 * the journey to 4·Z0 takes three or four of the person's own swells on any screen. (The
 * audit's raw gain of 3 assumed its own camera; with the fitted camera a swell's push is the
 * same in world px but Z0 differs.)
 */
const calCache = new Map();
export function calibrateDrift(cam, U, target = 0.95) {
  const key = `${Math.round(cam.W)}|${Math.round(cam.H)}|${Math.round(cam.hy)}|${Math.round(cam.homeY)}|${Math.round(cam.waterY)}|${Math.round(U)}|${target}`;
  if (calCache.has(key)) return calCache.get(key);
  const sea = new Sea(2);
  const y0 = cam.homeY + 0.55 * (cam.waterY - cam.homeY), y1 = cam.homeY - 0.35 * (cam.homeY - cam.hy);
  const len = y0 - y1;
  const P = strokePacket(cam, U, { x0: cam.W / 2, y0, x1: cam.W / 2, y1, len, speed: 0.2 * U });
  if (!P) return SEA.STOKES;
  sea.launch(P);
  const o = {};
  let z = cam.Z0, x = 0, moved = 0;
  for (let t = 0; t < 36; t += 0.1) {
    sea.prepare(); sea.sample(x, z, o);
    const dz = (o.uz / SEA.STOKES) * 0.1;
    z += dz; moved += dz;
    sea.step(0.1);
  }
  const g = moved > 1e-3 ? (target * cam.Z0) / moved : SEA.STOKES;
  if (calCache.size > 32) calCache.clear();
  calCache.set(key, g);
  return g;
}

// --------------------------------------------------------------------- sea --
export class Sea {
  constructor(max = SEA.K_MAX) {
    this.max = max;
    const F = () => new Float32Array(max);
    // per packet (struct of arrays)
    this.on = new Uint8Array(max); this.ring = new Uint8Array(max); this.user = new Uint8Array(max);
    this.free = new Uint8Array(max);          // 0 while a finger sculpts it, 1 once released
    this.k = F(); this.w = F(); this.cg = F(); this.beta = F(); this.lam = F();
    this.A = F(); this.At = F(); this.A0 = F();
    this.dx = F(); this.dz = F();             // unit direction of travel
    this.ex = F(); this.ez = F();             // envelope centre at release
    this.ax = F(); this.az = F();             // crest anchor (θ = 0 here at release)
    this.sl = F(); this.sw = F(); this.sl0 = F(); this.sw0 = F();
    this.age = F(); this.id = new Int32Array(max);
    this.rise = F();                           // amplitude at release / A₀: eased to 1 (no pop)
    this.dec = F();                            // ∫β dt so far (the settle can change the rate without a jump)
    this.damp = 1;                             // ×β (the completion settle uses 3)
    this.n = 0; this.serial = 0; this.time = 0;
    // the sea's own breathing: a few endless, very gentle plane swells (texture and light; they carry
    // nothing — no Stokes drift — and never count as the person's)
    this.amb = [];
    // per-frame scratch (row evaluation)
    this._att = F(); this._list = new Int32Array(max);
    this._q = F();
  }

  get active() { let c = 0; for (let i = 0; i < this.max; i++) c += this.on[i]; return c; }

  /** Choose a slot: a free one, else replace the packet carrying the least energy. */
  _slot() {
    let best = -1, be = Infinity;
    for (let i = 0; i < this.max; i++) {
      if (!this.on[i]) return i;
      if (!this.free[i]) continue;                         // never steal a swell being sculpted
      const e = this.A[i] * this.A[i] * this.sl[i] * this.sw[i] * (this.ring[i] ? 0.5 : 1);
      if (e < be) { be = e; best = i; }
    }
    return best;
  }

  _setLambda(i, lambda) {
    const d = dispersion(lambda);
    this.lam[i] = lambda; this.k[i] = d.k; this.w[i] = d.omega; this.cg[i] = d.cg; this.beta[i] = d.beta;
  }

  /**
   * A directional packet. o: { x, z (envelope centre), ax, az (crest anchor), dx, dz (direction),
   * lambda, A, len (world length of the stroke), user, free }. Returns its slot (or −1).
   */
  launch(o) {
    const i = this._slot();
    if (i < 0) return -1;
    const l = Math.hypot(o.dx || 0, o.dz || 0) || 1;
    this.on[i] = 1; this.ring[i] = 0; this.user[i] = o.user === false ? 0 : 1; this.free[i] = o.free === false ? 0 : 1;
    this._setLambda(i, o.lambda);
    this.dx[i] = (o.dx || 0) / l; this.dz[i] = (o.dz ?? 1) / l;
    this.ex[i] = o.x; this.ez[i] = o.z; this.ax[i] = o.ax ?? o.x; this.az[i] = o.az ?? o.z;
    const sl = Math.max(0.6 * (o.len || 0), 0.75 * o.lambda);
    this.sl[i] = this.sl0[i] = sl; this.sw[i] = this.sw0[i] = 1.2 * sl;
    this.A0[i] = this.At[i] = o.A; this.A[i] = this.free[i] ? o.A : 0; this.rise[i] = 1; this.dec[i] = 0;
    this.age[i] = 0; this.id[i] = ++this.serial;
    return i;
  }

  /** A ring of swells from a tap at (x, z). */
  ringAt(x, z, lambda, A, user = true) {
    const i = this._slot();
    if (i < 0) return -1;
    this.on[i] = 1; this.ring[i] = 1; this.user[i] = user ? 1 : 0; this.free[i] = 1;
    this._setLambda(i, lambda);
    this.ex[i] = x; this.ez[i] = z; this.dx[i] = 0; this.dz[i] = 1;
    this.sl[i] = this.sl0[i] = 0.55 * lambda; this.sw[i] = this.sw0[i] = this.sl[i];
    this.A[i] = this.A0[i] = this.At[i] = A; this.rise[i] = 1; this.dec[i] = 0; this.age[i] = 0; this.id[i] = ++this.serial;
    return i;
  }

  /** While a finger sculpts packet i: new shape from the live stroke (amplitude eases towards A). */
  sculpt(i, o) {
    if (i < 0 || !this.on[i] || this.free[i]) return;
    const l = Math.hypot(o.dx, o.dz) || 1;
    if (Math.abs(this.lam[i] - o.lambda) > 0.5) this._setLambda(i, o.lambda);
    this.dx[i] = o.dx / l; this.dz[i] = o.dz / l;
    this.ex[i] = o.x; this.ez[i] = o.z; this.ax[i] = o.ax; this.az[i] = o.az;
    const sl = Math.max(0.6 * o.len, 0.75 * o.lambda);
    this.sl[i] = this.sl0[i] = sl; this.sw[i] = this.sw0[i] = 1.2 * sl;
    this.At[i] = o.A;
  }
  /** The finger lifts: the swell is set free (its crest is where the fingertip was). */
  release(i) {
    if (i < 0 || !this.on[i]) return;
    this.free[i] = 1; this.age[i] = 0; this.dec[i] = 0;
    // a quick stroke still makes its wave: the amplitude keeps rising to ≥ 0.6 of the stroke's for a moment
    this.A0[i] = Math.max(this.A[i], 0.6 * this.At[i]);
    this.rise[i] = this.A0[i] > 0 ? this.A[i] / this.A0[i] : 1;
  }
  /** Drop a packet still being sculpted (nothing came of the stroke). */
  cancel(i) { if (i >= 0) this.on[i] = 0; }

  /** Set the ambient swells: [{ lambda, A, dx, dz, ph }]. */
  setAmbient(list = []) {
    this.amb = list.map((w) => { const d = dispersion(w.lambda), l = Math.hypot(w.dx, w.dz) || 1; return { k: d.k, w: d.omega, A: w.A, A0: w.A, dx: w.dx / l, dz: w.dz / l, ph: w.ph || 0 }; });
  }
  /** Scale the ambient swells (a calmer or windier sea; the mirror-calm finish). */
  ambientScale(k) { for (const a of this.amb) a.A = a.A0 * k; }

  /** Advance: free packets travel, widen and decay; sculpted ones ease towards their target. */
  step(dt) {
    if (dt <= 0) return;
    this.time += dt;
    for (let i = 0; i < this.max; i++) {
      if (!this.on[i]) continue;
      if (!this.free[i]) { this.A[i] += (this.At[i] - this.A[i]) * (1 - Math.exp(-dt / SEA.SCULPT_TAU)); continue; }
      this.age[i] += dt;
      const t = this.age[i];
      const spread = Math.sqrt(1 + (t / SEA.SPREAD_SEC) ** 2);
      this.sl[i] = this.sl0[i] * spread; this.sw[i] = this.sw0[i] * (this.ring[i] ? spread : Math.sqrt(spread));
      // energy ∝ A²·area is conserved as the envelope widens; viscosity takes the rest
      if (this.rise[i] < 1) this.rise[i] = 1 - (1 - this.rise[i]) * Math.exp(-dt / 0.15);
      this.dec[i] += this.beta[i] * this.damp * dt;
      this.A[i] = this.A0[i] * this.rise[i] * Math.exp(-this.dec[i]) / Math.sqrt(spread * (this.ring[i] ? spread : Math.sqrt(spread)));
      if (this.A[i] < SEA.MIN_A) this.on[i] = 0;
    }
  }

  /** Gerstner steepness shared by every packet this frame. */
  _steep() {
    let n = 0;
    for (let i = 0; i < this.max; i++) if (this.on[i] && this.A[i] > 0.2) n++;
    n = Math.max(1, n);
    for (let i = 0; i < this.max; i++) this._q[i] = this.on[i] ? Math.min(SEA.Q_MAX, SEA.Q_K / Math.max(1e-3, this.k[i] * this.A[i] * n)) : 0;
  }

  /**
   * The sea at one point (world px). out: { h, hx, hz, dx, dz (Gerstner shift), amp (Σ A·E), ux, uz (Stokes drift) }.
   * userOnly: count only the person's own swells (not the storm's seed swells) in the drift.
   */
  sample(x, z, out, userOnly = false) {
    let h = 0, hx = 0, hz = 0, gx = 0, gz = 0, amp = 0, ux = 0, uz = 0, uux = 0, uuz = 0;
    for (let i = 0; i < this.max; i++) {
      if (!this.on[i]) continue;
      const A = this.A[i];
      if (A <= 0) continue;
      let E, th, dx, dz;
      if (this.ring[i]) {
        const rx = x - this.ex[i], rz = z - this.ez[i], r = Math.sqrt(rx * rx + rz * rz) || 1e-3;
        const front = this.cg[i] * this.age[i], q = (r - front) / this.sl[i];
        if (q * q > 30) continue;
        E = Math.exp(-0.5 * q * q) * Math.sqrt(this.lam[i] / (this.lam[i] + r));
        th = this.k[i] * r - this.w[i] * this.age[i];
        dx = rx / r; dz = rz / r;
      } else {
        dx = this.dx[i]; dz = this.dz[i];
        const run = this.free[i] ? this.cg[i] * this.age[i] : 0;
        const px = x - this.ex[i] - dx * run, pz = z - this.ez[i] - dz * run;
        const al = (px * dx + pz * dz) / this.sl[i], ac = (-px * dz + pz * dx) / this.sw[i];
        const e2 = al * al + ac * ac;
        if (e2 > 30) continue;
        E = Math.exp(-0.5 * e2);
        th = this.k[i] * ((x - this.ax[i]) * dx + (z - this.az[i]) * dz) - (this.free[i] ? this.w[i] * this.age[i] : 0);
      }
      const a = A * E, c = Math.cos(th), sn = Math.sin(th), k = this.k[i];
      h += a * c; hx -= a * k * dx * sn; hz -= a * k * dz * sn; amp += a;
      const q = this._q[i] || 0;
      gx -= q * a * dx * sn; gz -= q * a * dz * sn;
      const u = this.w[i] * k * a * a;
      ux += u * dx; uz += u * dz;
      if (this.user[i]) { uux += u * dx; uuz += u * dz; }
    }
    for (const a of this.amb) {
      if (a.A <= 0) continue;
      const th = a.k * (x * a.dx + z * a.dz) - a.w * this.time + a.ph, c = Math.cos(th), sn = Math.sin(th);
      h += a.A * c; hx -= a.A * a.k * a.dx * sn; hz -= a.A * a.k * a.dz * sn;
    }
    out.h = h; out.hx = hx; out.hz = hz; out.dx = gx; out.dz = gz; out.amp = amp;
    const G = SEA.STOKES;
    out.ux = (userOnly ? uux : ux) * G; out.uz = (userOnly ? uuz : uz) * G;
    out.uux = uux * G; out.uuz = uuz * G;
    return out;
  }

  /** Call once a frame before rows/samples: shares the Gerstner steepness. */
  prepare() { this._steep(); }

  /**
   * One row of the render grid: world z, columns at x0 + i·step (i < n). Fills the outputs
   * (Float32Arrays, offset o): h, hx, hz, gx, gz (Gerstner shift), amp. dz = the world spacing
   * between rows here; waves the grid cannot resolve are filtered out (no shimmering moiré
   * near the horizon). Directional packets use exact recurrences along the row (one exp and
   * one sin/cos per packet per row).
   */
  /** (AMPU, optional: Σ k·A·E of the person's own swells — their steepness — for the crest light.) */
  row(z, x0, step, n, dz, o, H, HX, HZ, GX, GZ, AMP, filter = true, AMPU = null, lamMin = 0) {
    for (let c = 0; c < n; c++) { H[o + c] = 0; HX[o + c] = 0; HZ[o + c] = 0; GX[o + c] = 0; GZ[o + c] = 0; AMP[o + c] = 0; }
    if (AMPU) for (let c = 0; c < n; c++) AMPU[o + c] = 0;
    const sx = Math.abs(step);
    for (const a of this.amb) {
      if (a.A <= 0) continue;
      const att = filter ? Math.exp(-0.5 * ((a.k * a.dx * sx) ** 2 + (a.k * a.dz * dz) ** 2)) : 1;
      if (att < 0.02) continue;
      const A = a.A * att;
      const th0 = a.k * (x0 * a.dx + z * a.dz) - a.w * this.time + a.ph, dth = a.k * a.dx * step;
      let cs = Math.cos(th0), sn = Math.sin(th0);
      const cd = Math.cos(dth), sd = Math.sin(dth), kx = A * a.k * a.dx, kz = A * a.k * a.dz;
      for (let c = 0; c < n; c++) {
        const j = o + c;
        H[j] += A * cs; HX[j] -= kx * sn; HZ[j] -= kz * sn;
        const ncs = cs * cd - sn * sd; sn = sn * cd + cs * sd; cs = ncs;
      }
    }
    for (let i = 0; i < this.max; i++) {
      if (!this.on[i] || this.A[i] <= 0) continue;
      const k = this.k[i];
      if (this.ring[i]) {
        const att = filter ? Math.exp(-0.25 * k * k * (sx * sx + dz * dz)) : 1;
        if (att < 0.02) continue;
        const A = this.A[i] * att, front = this.cg[i] * this.age[i], sl = this.sl[i], q0 = this._q[i] || 0, lam = this.lam[i];
        const ez = z - this.ez[i];
        if (Math.abs(ez) > front + 6 * sl) continue;
        for (let c = 0; c < n; c++) {
          const rx = x0 + c * step - this.ex[i], r = Math.sqrt(rx * rx + ez * ez) || 1e-3, q = (r - front) / sl;
          if (q * q > 30) continue;
          const a = A * Math.exp(-0.5 * q * q) * Math.sqrt(lam / (lam + r));
          const th = k * r - this.w[i] * this.age[i], cs = Math.cos(th), sn = Math.sin(th);
          const ux = rx / r, uz = ez / r;
          H[o + c] += a * cs; HX[o + c] -= a * k * ux * sn; HZ[o + c] -= a * k * uz * sn; AMP[o + c] += a;
          if (AMPU && this.user[i] && this.lam[i] >= lamMin) AMPU[o + c] += a * k;
          GX[o + c] -= q0 * a * ux * sn; GZ[o + c] -= q0 * a * uz * sn;
        }
        continue;
      }
      const dx = this.dx[i], dzv = this.dz[i];
      const att = filter ? Math.exp(-0.5 * ((k * dx * sx) ** 2 + (k * dzv * dz) ** 2)) : 1;
      if (att < 0.02) continue;
      const A = this.A[i] * att, sl = this.sl[i], sw = this.sw[i], q0 = this._q[i] || 0;
      const run = this.free[i] ? this.cg[i] * this.age[i] : 0;
      // envelope: exponent quadratic in the column index c → e(c) = a2·c² + a1·c + a0
      const pz = z - this.ez[i] - dzv * run, px0 = x0 - this.ex[i] - dx * run;
      // al = (px·dx + pz·dz)/sl, ac = (−px·dz + pz·dx)/sw, px = px0 + c·step
      const alc = dx * step / sl, al0 = (px0 * dx + pz * dzv) / sl;
      const acc = -dzv * step / sw, ac0 = (-px0 * dzv + pz * dx) / sw;
      // −0.5·[(al0 + alc·c)² + (ac0 + acc·c)²]
      const a2 = -0.5 * (alc * alc + acc * acc), a1 = -(al0 * alc + ac0 * acc), a0 = -0.5 * (al0 * al0 + ac0 * ac0);
      // skip the row if the envelope never rises above e^-15 along it
      let emax;
      if (a2 < -1e-12) { const cv = clamp(-a1 / (2 * a2), 0, n - 1); emax = a2 * cv * cv + a1 * cv + a0; } else emax = Math.max(a0, a2 * (n - 1) * (n - 1) + a1 * (n - 1) + a0);
      if (emax < -14) continue;
      // phase: θ(c) = θ0 + c·dθ
      const th0 = k * ((x0 - this.ax[i]) * dx + (z - this.az[i]) * dzv) - (this.free[i] ? this.w[i] * this.age[i] : 0);
      const dth = k * dx * step;
      let cs = Math.cos(th0), sn = Math.sin(th0);
      const cd = Math.cos(dth), sd = Math.sin(dth);
      // the envelope's exponent by recurrence (adds only); exp() only where it matters
      let e = a0, de = a2 + a1;
      const dde = 2 * a2;
      const kx = A * k * dx, kz = A * k * dzv, gxk = q0 * A * dx, gzk = q0 * A * dzv;
      const U8 = AMPU && this.user[i] && this.lam[i] >= lamMin ? AMPU : null;
      for (let c = 0; c < n; c++) {
        if (e > -14) {
          const E = Math.exp(e), j = o + c;
          H[j] += A * E * cs; HX[j] -= kx * E * sn; HZ[j] -= kz * E * sn; AMP[j] += A * E;
          if (U8) U8[j] += A * E * k;
          GX[j] -= gxk * E * sn; GZ[j] -= gzk * E * sn;
        }
        const ncs = cs * cd - sn * sd; sn = sn * cd + cs * sd; cs = ncs;
        e += de; de += dde;
      }
    }
  }

  /** Energy-weighted mean period of the sea (s), 0 when flat. userOnly: the person's own swells only. */
  dominantPeriod(userOnly = false) {
    let e = 0, et = 0;
    for (let i = 0; i < this.max; i++) {
      if (!this.on[i] || (userOnly && !this.user[i])) continue;
      const w = this.A[i] * this.A[i] * Math.sqrt(this.sl[i] * this.sw[i]);
      e += w; et += w * (TAU / this.w[i]);
    }
    return e > 1e-6 ? et / e : 0;
  }
  /** Total energy (A²·√area summed) — a size measure for the hum and the settle. */
  energy() { let e = 0; for (let i = 0; i < this.max; i++) if (this.on[i]) e += this.A[i] * this.A[i] * Math.sqrt(this.sl[i] * this.sw[i]); return e; }
  /** Slope energy of short waves (λ < lamMax): how choppy it is. */
  chop(lamMax, userOnly = false) { let e = 0; for (let i = 0; i < this.max; i++) if (this.on[i] && this.lam[i] < lamMax && (!userOnly || this.user[i])) { const s = this.A[i] * this.k[i]; e += s * s; } return e; }
  /** Is packet i (by serial id) still alive, and how big? */
  alive(id) { for (let i = 0; i < this.max; i++) if (this.on[i] && this.id[i] === id) return this.A[i]; return 0; }
  clear() { this.on.fill(0); }
}

// -------------------------------------------------------------------- wake --
/**
 * The finger's wake: a damped 2-D wave equation on a screen grid (cell px), stable for
 * cx² + cy² ≤ 0.5. Per-row coefficients slow and flatten ripples with distance (perspective).
 * hush (0..1 per cell, set by the world) damps the water to a mirror where a finger rests.
 */
export class Wake {
  constructor(cols, rows, cell = 4) {
    this.cols = cols; this.rows = rows; this.cell = cell; this.n = cols * rows;
    this.h = new Float32Array(this.n); this.p = new Float32Array(this.n);
    this.cx2 = new Float32Array(rows).fill(0.24); this.cy2 = new Float32Array(rows).fill(0.24);
    this.hush = new Float32Array(this.n);
    this.damp = 0.996;
    this.c2 = 0.24;     // the audit's wave speed² (cells²/step²) — the world may ask for a gentler one
    this.visc = 0;      // a touch of viscosity on the velocity: keeps grid-scale ripples from stair-stepping
    // an absorbing sponge along the edges, so ripples leave the screen instead of bouncing back
    const S = 6, sp = (k, n) => { const e = Math.min(k, n - 1 - k); return e >= S ? 1 : 0.86 + 0.14 * (e / S); };
    this.spx = Float32Array.from({ length: cols }, (_, i) => sp(i, cols));
    this.spy = Float32Array.from({ length: rows }, (_, j) => (j < S ? 1 : sp(j, rows)));   // (the horizon edge is far away: no sponge needed there)
    this.y0 = 0;     // screen y of row 0's centre - cell/2
  }
  /** Perspective per row: f(row) → [fx, fy] in 0..1 (screen speed relative to the near water). */
  setRows(fn) { for (let j = 0; j < this.rows; j++) { const [fx, fy] = fn(j); this.cx2[j] = this.c2 * clamp(fx * fx, 0.02, 1); this.cy2[j] = this.c2 * clamp(fy * fy, 0.02, 1); } }
  /** Add a Gaussian dip (negative pushes the water down) at screen (x, y), radius in cells. */
  inject(x, y, amount, rCells = 2) {
    const ci = x / this.cell, cj = (y - this.y0) / this.cell, R = Math.ceil(rCells * 1.6);
    const i0 = Math.max(1, Math.floor(ci - R)), i1 = Math.min(this.cols - 2, Math.ceil(ci + R));
    const j0 = Math.max(1, Math.floor(cj - R)), j1 = Math.min(this.rows - 2, Math.ceil(cj + R));
    const k = -0.5 / (rCells * rCells * 0.36);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d2 = (i - ci) ** 2 + (j - cj) ** 2;
      const v = amount * Math.exp(k * d2);
      this.h[j * this.cols + i] += v;
    }
  }
  /** One step (call at a fixed 60 Hz). */
  step() {
    const { cols, rows, h, p, hush } = this;
    const d = this.damp;
    const spx = this.spx, vis = this.visc;
    for (let j = 1; j < rows - 1; j++) {
      const ax = this.cx2[j], ay = this.cy2[j], o = j * cols, dj = d * this.spy[j];
      for (let i = 1; i < cols - 1; i++) {
        const q = o + i;
        const lap = ax * (h[q - 1] + h[q + 1] - 2 * h[q]) + ay * (h[q - cols] + h[q + cols] - 2 * h[q]);
        let v = (2 * h[q] - p[q] + lap) * dj * spx[i];
        if (vis) { const vl = (h[q - 1] - p[q - 1]) + (h[q + 1] - p[q + 1]) + (h[q - cols] - p[q - cols]) + (h[q + cols] - p[q + cols]) - 4 * (h[q] - p[q]); v += vis * vl; }
        p[q] = hush[q] > 0.01 ? v * (1 - 0.12 * hush[q]) : v;
      }
    }
    // swap: p now holds the new heights
    this.p = h; this.h = p;
  }
  /** Height at a screen point (bilinear). */
  at(x, y) {
    const fi = x / this.cell - 0.5, fj = (y - this.y0) / this.cell - 0.5;
    const i = Math.floor(fi), j = Math.floor(fj);
    if (i < 0 || j < 0 || i >= this.cols - 1 || j >= this.rows - 1) return 0;
    const u = fi - i, v = fj - j, q = j * this.cols + i, h = this.h;
    return (h[q] * (1 - u) + h[q + 1] * u) * (1 - v) + (h[q + this.cols] * (1 - u) + h[q + this.cols + 1] * u) * v;
  }
  energy() { let e = 0; for (let q = 0; q < this.n; q++) e += this.h[q] * this.h[q]; return e; }
  clear() { this.h.fill(0); this.p.fill(0); }
}
