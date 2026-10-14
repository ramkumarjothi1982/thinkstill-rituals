// Soft-body deformation of a Mallow's approved artwork on a dense mesh.
//
// The art (full resolution) is the texture of an (cols × rows) grid. Each
// frame every vertex is displaced by a physically-inspired deformation field
// driven by a handful of body "degrees of freedom" (DOFs) that the director
// animates as analytic functions of time:
//
//   squash   + flattens / − stretches, roughly area-preserving, with a
//            water-balloon bulge through the middle and a spreading base
//   inflate  breathing volume: the whole body swells, rounder in the middle
//   lean     the top bends sideways (quadratic in height: a soft bend)
//   sway     a lateral jelly mode (top moves most)
//   shimmer  a decaying ripple around the edge after impacts (jelly surface)
//   lift     height above the water (hops / floating)
//
// Soft bodies don't move all at once: a kick at the base reaches the top a
// moment later. Each vertex samples the DOFs at  t − lag · height, so every
// impact becomes a wave that travels up the body and rebounds — the single
// biggest step from "an image being scaled" to "a living jelly".
//
// Outputs per vertex: screen position, texture uv, compression (area ratio,
// for subsurface brightening) and bend (surface tilt, for moving highlights).

import { clamp, smoothstep } from './motion.js';

export class SoftBody {
  /**
   * art: { w, h } texture size; sil: { cx, baseY, top, halfW } in art px
   * opts: { cols, rows, lag (s at the top), bins }
   */
  constructor(art, sil, opts = {}) {
    this.art = art;
    this.sil = sil;
    this.cols = opts.cols || 96;
    this.rows = opts.rows || 96;
    this.lag = opts.lag ?? 0.075;
    this.bins = opts.bins || 48;
    this.H = sil.baseY - sil.top;
    this.R = Math.max(sil.halfW, this.H * 0.5);
  }

  /**
   * Fill mesh.data (interleaved: pos.xy, uv.xy, comp, bend) for time t.
   * dofAt(t) → { squash, inflate, lean, sway, shimmer, shimPhase, lift }
   * xf: { x, y, s } screen placement of the body's base centre and scale (px per art px)
   * flip: reflection (mirror about the base line)
   */
  build(mesh, t, dofAt, xf, flip = false) {
    const { cols, rows, art, sil, H, bins } = this;
    // DOFs at lagged times, sampled per height bin (cheap and smooth)
    const D = new Array(bins + 1);
    for (let b = 0; b <= bins; b++) {
      const hn = (b / bins) * 1.15;
      D[b] = dofAt(t - this.lag * Math.min(1, hn));
    }
    const d0 = D[0];
    const data = mesh.data;
    const st = mesh.stride;
    let k = 0;
    const cx = sil.cx, base = sil.baseY;
    const shimA = d0.shimmer || 0, shimP = d0.shimPhase || 0;
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const y = v * art.h;
      const Y = base - y;                       // height above the base (art px)
      const hn = clamp(Y / H, -0.2, 1.15);
      const bf = (clamp(hn, 0, 1.15) / 1.15) * bins;
      const b0 = Math.floor(bf), b1 = Math.min(bins, b0 + 1), fb = bf - b0;
      const A = D[b0], B = D[b1];
      const s = A.squash + (B.squash - A.squash) * fb;
      const inf = A.inflate + (B.inflate - A.inflate) * fb;
      const lean = A.lean + (B.lean - A.lean) * fb;
      const sway = A.sway + (B.sway - A.sway) * fb;
      const hc = clamp(hn, 0, 1);
      // vertical: squash about the base, breath swells upward
      const sy = (1 - s) * (1 + 0.85 * inf);
      // horizontal: area-ish preserving, water-balloon bulge, spreading base
      const sxBase = Math.pow(1 / Math.max(0.35, 1 - s), 0.58) * (1 + 0.5 * inf);
      const bulge = s * 0.3 * Math.sin(Math.PI * Math.pow(hc, 0.85)) + inf * 0.1 * Math.sin(Math.PI * hc);
      const spread = s > 0 ? s * 0.11 * Math.pow(1 - hc, 3) : s * 0.05 * Math.pow(1 - hc, 2);
      const sx = sxBase * (1 + bulge + spread);
      const bendX = lean * H * hc * hc + sway * H * 0.1 * Math.pow(hc, 1.5);
      const bendSlope = 2 * lean * hc + sway * 0.15 * Math.pow(hc, 0.5);
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const x = u * art.w;
        const X = x - cx;
        let Xd = X * sx + bendX;
        let Yd = Y * sy - Math.abs(lean) * H * 0.22 * hc * hc;
        // jelly shimmer: a decaying ripple travelling around the rim
        if (shimA > 1e-4) {
          const ry = Y - H * 0.5;
          const r = Math.hypot(X / (sil.halfW || 1), ry / (H * 0.5 || 1));
          const th = Math.atan2(ry, X);
          const edge = smoothstep(0.45, 1.05, r);
          const d = shimA * Math.sin(3 * th + shimP) * edge * H * 0.022;
          const len = Math.hypot(X, ry) || 1;
          Xd += (X / len) * d;
          Yd += (ry / len) * d;
        }
        Yd += d0.lift || 0;
        const sx2 = xf.x + Xd * xf.s;
        const sy2 = flip ? xf.y + Yd * xf.s : xf.y - Yd * xf.s;
        data[k++] = sx2;
        data[k++] = sy2;
        data[k++] = u;
        data[k++] = v;
        data[k++] = 1 / Math.max(0.2, sx * sy);   // compression (>1 squeezed)
        data[k++] = bendSlope;
        k += st - 6;
      }
    }
    mesh.upload();
  }

  /** Where a point given in art px ends up (for anchoring bubbles, particles, sound pans). */
  project(px, py, t, dofAt, xf) {
    const { sil, H } = this;
    const Y = sil.baseY - py, hn = clamp(Y / H, 0, 1.15);
    const d = dofAt(t - this.lag * Math.min(1, hn));
    const hc = clamp(hn, 0, 1);
    const s = d.squash, inf = d.inflate;
    const sy = (1 - s) * (1 + 0.85 * inf);
    const sx = Math.pow(1 / Math.max(0.35, 1 - s), 0.58) * (1 + 0.5 * inf) * (1 + s * 0.3 * Math.sin(Math.PI * Math.pow(hc, 0.85)) + inf * 0.1 * Math.sin(Math.PI * hc));
    const X = (px - sil.cx) * sx + d.lean * H * hc * hc + d.sway * H * 0.1 * Math.pow(hc, 1.5);
    const Yd = Y * sy - Math.abs(d.lean) * H * 0.22 * hc * hc + (d.lift || 0);
    return { x: xf.x + X * xf.s, y: xf.y - Yd * xf.s };
  }
}
