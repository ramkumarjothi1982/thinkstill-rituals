// Pure face geometry: Bézier sampling, upward normals, variable-width tube
// outlines with round caps, and the eye model (closed arc ↔ open eye). Verbatim
// from stage2/face.js (frozen), shared by the exact and the fast face renderers.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- tubes --
export function sampleCubic(p0, c0, c1, p1, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * u * p0[0] + 3 * u * u * t * c0[0] + 3 * u * t * t * c1[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c0[1] + 3 * u * t * t * c1[1] + t * t * t * p1[1]]);
  }
  return pts;
}
export function sampleQuad(p0, c, p1, n = 40) {
  return sampleCubic(p0, [p0[0] + (c[0] - p0[0]) * 2 / 3, p0[1] + (c[1] - p0[1]) * 2 / 3], [p1[0] + (c[0] - p1[0]) * 2 / 3, p1[1] + (c[1] - p1[1]) * 2 / 3], p1, n);
}
/** Upward-facing unit normals (screen y down → n.y ≤ 0 for a mostly horizontal line). */
export function normals(pts) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    let nx = ty, ny = -tx;
    if (ny > 0 || (Math.abs(ny) < 1e-6 && nx < 0)) { nx = -nx; ny = -ny; }
    out.push([nx, ny]);
  }
  return out;
}
/** Closed outline of a variable-width tube with round caps. off shifts it along the normal (fraction of width). */
export function tubeOutline(pts, wfn, frac = 1, off = 0) {
  const N = normals(pts), n = pts.length;
  const C = [], Wd = [];
  for (let i = 0; i < n; i++) {
    const w = wfn(i / (n - 1));
    Wd.push(w * 0.5 * frac);
    C.push([pts[i][0] + N[i][0] * off * w, pts[i][1] + N[i][1] * off * w]);
  }
  // half-turn from normal nrm through the outward tangent tan
  const arc = (c, nrm, tan, r, out) => {
    const a0 = Math.atan2(nrm[1], nrm[0]);
    const dir = nrm[0] * tan[1] - nrm[1] * tan[0] > 0 ? 1 : -1;
    for (let k = 1; k < 12; k++) { const a = a0 + dir * Math.PI * k / 12; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
  };
  const poly = [];
  for (let i = 0; i < n; i++) poly.push([C[i][0] + N[i][0] * Wd[i], C[i][1] + N[i][1] * Wd[i]]);
  arc(C[n - 1], N[n - 1], [pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]], Wd[n - 1], poly);
  for (let i = n - 1; i >= 0; i--) poly.push([C[i][0] - N[i][0] * Wd[i], C[i][1] - N[i][1] * Wd[i]]);
  arc(C[0], [-N[0][0], -N[0][1]], [pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]], Wd[0], poly);
  return poly;
}
export function fillPoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.fill();
}

// ----------------------------------------------------------------- eyes --
export function eyeGeom(e, side, P) {
  const inner = side === 'L' ? 1 : -1;
  const es = P.eyeScale;
  const st = P.eyeStretch;                       // >1 taller (shock), <1 squashed
  const rx = e.r * es / Math.sqrt(st), ry = e.r * es * st;
  const ex = e.x, ey = e.y + e.sag * 0.42;
  const o = clamp(P.eyeOpen * (side === 'L' ? P.eyeOpenL : P.eyeOpenR) * (1 - P.blink), 0, 1.45);
  const oc = Math.min(1, o);
  const curve = P.closedCurve;
  const yC = e.y - P.squint * e.sag * 0.25;
  const sagC = e.sag * curve * (1 + P.squint * 0.35);
  const hw = lerp(e.hw * (1 - P.squint * 0.06), rx * 1.1, oc) + rx * 0.9 * Math.max(0, o - 1);
  const slant = P.lidSlant * ry * 0.3 * oc;
  const xin = ex + inner * hw, xout = ex - inner * hw;
  const yCorner = lerp(yC, ey, oc);
  const tilt = (e.tilt || 0) * (1 - oc);
  const yin = yCorner + slant + tilt, yout = yCorner - slant * 0.6 - tilt;
  const cxo = (e.cxOff || 0) * (1 - oc);           // closed arc: the painted control point
  const oTop = clamp(o * (1 - P.lidTop), 0, 1.45);
  const oBot = clamp(o * (1 - P.lidBot), 0, 1.45);
  const qUp = lerp(yC + 2 * sagC, ey - ry * 1.86, oTop);
  const qLo = lerp(yC + 2 * sagC, ey + ry * 2.1, oBot);
  const c = (x0, y0, x1, y1, qy, sl) => {
    const qx = (x0 + x1) / 2 + cxo;
    return [[x0 + (qx - x0) * 2 / 3, y0 + (qy - y0) * 2 / 3 + sl * (x0 === xin ? 1 : -0.5)],
      [x1 + (qx - x1) * 2 / 3, y1 + (qy - y1) * 2 / 3 + sl * (x1 === xin ? 1 : -0.5)]];
  };
  const up = c(xout, yout, xin, yin, qUp, P.lidSlant * ry * 0.55 * oc);
  const lo = c(xin, yin, xout, yout, qLo, 0);
  return { ex, ey, rx, ry, o, oc, xin, xout, yin, yout, up, lo, inner };
}
