// The glossy navy "gummy" tube every face line is drawn with.
//
// legacyTube is the approved v2 drawing (stage2/face.js tube(); its shadow and
// specular steps are factored into helpers, same canvas calls in the same
// order): the glow and the light band are blurred silhouettes, the body is
// layered fills, all at full art resolution with ctx.filter blurs. It is the
// exact profile's renderer, and it reads stale texels of the shared scratch
// canvas from earlier strokes (docs/CONVENTIONS.md §7), which the exact profile
// must keep.

import { smoothstep, normals, tubeOutline, fillPoly } from './geometry.js';

export const TUBE = {   // sampled from the approved painted arcs (cross-section, top → bottom)
  glow: 'rgba(0,144,253,0.8)', shadow: 'rgba(0,10,60,0.1)', under: 'rgba(255,255,255,0.2)',
  core: '#01185c', upper: '#0633a1', lower: '#010f4a', edge: '#000a38',   // measured: core · 7 px inside the upper edge · lower edge
  spec: 'rgba(90,150,245,0.95)', bead: 'rgba(190,220,255,0.9)',   // measured highlight #457eea–#72a8f9, ~0.28 w above the centre
};

/**
 * Draw one glossy tube. pts: centreline; lw: nominal width; alpha; opts.taper
 * (end width ratio), opts.glow (0..1), opts.spec (0..1).
 */
export function legacyTube(ctx, tmp, pts, lw, alpha = 1, opts = {}) {
  if (alpha < 0.01 || pts.length < 2) return;
  const taper = opts.taper ?? 0.8;
  const wfn = (s) => lw * (taper + (1 - taper) * Math.sin(Math.PI * s));
  // bounding box for the temp layer
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const pad = lw * 2.2;
  ctx.save();
  ctx.globalAlpha = alpha;
  // 1 glow + contact shadow: blurred silhouettes (the groove sitting in the skin)
  if ((opts.glow ?? 1) > 0.01) {
    const g = tmp.getContext('2d');
    const bw = Math.ceil(x1 - x0 + pad * 2), bh = Math.ceil(y1 - y0 + pad * 2);
    if (tmp.width < bw || tmp.height < bh) { tmp.width = Math.max(tmp.width, bw); tmp.height = Math.max(tmp.height, bh); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    g.translate(pad - x0, pad - y0);
    g.fillStyle = TUBE.glow;
    fillPoly(g, tubeOutline(pts, wfn, 1.36, 0.08));
    g.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${(lw * 0.26).toFixed(1)}px)`;
    ctx.globalAlpha = alpha * (opts.glow ?? 1);
    ctx.drawImage(tmp, 0, 0, bw, bh, x0 - pad, y0 - pad, bw, bh);
    // the soft light band the painting has under each stroke (convex side)
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    g.translate(pad - x0, pad - y0);
    g.fillStyle = TUBE.under;
    fillPoly(g, tubeOutline(pts, wfn, 1.0, -0.55));
    g.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${(lw * 0.3).toFixed(1)}px)`;
    ctx.drawImage(tmp, 0, 0, bw, bh, x0 - pad, y0 - pad, bw, bh);
    ctx.filter = 'none';
    ctx.globalAlpha = alpha;
  }
  shadow(ctx, pts, wfn, lw);
  // 2 body: layered fills approximate a lit cylinder (light from above)
  // body: the measured core navy, a lighter band hugging the upper (concave) edge, a darker
  // lower edge — soft gradients, clipped to the stroke (rendered in a temp layer)
  {
    const g = tmp.getContext('2d');
    const bw = Math.ceil(x1 - x0 + pad * 2), bh = Math.ceil(y1 - y0 + pad * 2);
    if (tmp.width < bw || tmp.height < bh) { tmp.width = Math.max(tmp.width, bw); tmp.height = Math.max(tmp.height, bh); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    g.translate(pad - x0, pad - y0);
    g.fillStyle = TUBE.edge; fillPoly(g, tubeOutline(pts, wfn, 1.0, 0));
    g.globalCompositeOperation = 'source-atop';
    g.filter = `blur(${(lw * 0.06).toFixed(1)}px)`;
    g.fillStyle = TUBE.core; fillPoly(g, tubeOutline(pts, wfn, 0.86, 0.02));
    g.filter = `blur(${(lw * 0.1).toFixed(1)}px)`;
    g.fillStyle = TUBE.upper; fillPoly(g, tubeOutline(pts, wfn, 0.42, 0.24));
    g.fillStyle = TUBE.lower; fillPoly(g, tubeOutline(pts, wfn, 0.34, -0.3));
    g.filter = 'none';
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(tmp, 0, 0, bw, bh, x0 - pad, y0 - pad, bw, bh);
  }
  // 3 specular: a thin bright line along the top edge, fading toward the ends
  specular(ctx, pts, wfn, lw, alpha, opts);
  ctx.restore();
}

/**
 * The tube's specular: a thin bright line along the top edge, fading toward the
 * ends, and two highlight beads near the round ends. Cut out of the approved
 * tube() unchanged (same canvas calls in the same order) and shared by both
 * renderers: it has no blur, so the fast renderer keeps it at full resolution.
 */
function specular(ctx, pts, wfn, lw, alpha, opts) {
  if ((opts.spec ?? 1) > 0.01) {
    const N = normals(pts), n = pts.length;
    ctx.lineCap = 'round';
    for (let i = 1; i < n; i++) {
      const s = i / (n - 1);
      const a = smoothstep(0.06, 0.24, s) * smoothstep(0.94, 0.76, s);
      if (a < 0.02) continue;
      const w0 = wfn((i - 1) / (n - 1)), w1 = wfn(s);
      ctx.strokeStyle = TUBE.spec;
      ctx.globalAlpha = alpha * a * (opts.spec ?? 1);
      ctx.lineWidth = lw * 0.07;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0] + N[i - 1][0] * w0 * 0.28, pts[i - 1][1] + N[i - 1][1] * w0 * 0.28);
      ctx.lineTo(pts[i][0] + N[i][0] * w1 * 0.28, pts[i][1] + N[i][1] * w1 * 0.28);
      ctx.stroke();
    }
    // highlight beads near the round ends
    ctx.globalAlpha = alpha * 0.85 * (opts.spec ?? 1);
    ctx.fillStyle = TUBE.bead;
    for (const i of [Math.round((n - 1) * 0.06), Math.round((n - 1) * 0.94)]) {
      const w = wfn(i / (n - 1));
      ctx.beginPath();
      ctx.ellipse(pts[i][0] + N[i][0] * w * 0.22, pts[i][1] + N[i][1] * w * 0.22, lw * 0.07, lw * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The contact shadow under a stroke (no blur; shared, from the approved tube()). */
function shadow(ctx, pts, wfn, lw) {
  ctx.save();
  ctx.translate(0, lw * 0.1);
  ctx.fillStyle = TUBE.shadow;
  fillPoly(ctx, tubeOutline(pts, wfn, 1.1, -0.05));
  ctx.restore();
}
