// Noomi's animated face, drawn at the approved artwork's full resolution
// into an art-space canvas that the soft-body mesh then deforms together
// with the body (so the face can never slide off or warp differently).
//
// Style is matched to the approved painting: every line is a glossy navy
// "gummy" tube — slightly fuller in the middle, round ends, a thin bright
// specular along the top edge, small highlight beads near the ends and a
// saturated blue glow where the groove meets the skin. Open eyes follow the
// approved Hushmallow rig (sclera, navy galaxy iris, lid line), procedurally
// reconstructed so they stay sharp at any size.
//
// Geometry of the approved rig (rig.js eyeGeom/drawEye/drawMouth/drawBrow)
// is reused so expressions read the same as in the app.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const NEUTRAL = {
  eyeOpen: 0, eyeOpenL: 1, eyeOpenR: 1, blink: 0, closedCurve: 1, squint: 0,
  lidTop: 0, lidBot: 0, lidSlant: 0, lookX: 0, lookY: 0, irisScale: 1, eyeScale: 1, eyeStretch: 1, sparkle: 0,
  browAlpha: 0, browY: 0, browTilt: 0,
  mouthSmile: 1, mouthOpen: 0, mouthRound: 0, mouthWidth: 1, mouthWave: 0, mouthWavePhase: 0, mouthSkew: 0, mouthY: 0,
  blush: 0, catchX: 0.34, catchY: -0.4,
};

/** Approved rig face spec (439×420 sprite px) → hi-res art px via an affine fit. */
export function specFromRig(rigFace, k, ox, oy) {
  const P = (x, y) => [x * k + ox, y * k + oy];
  const eye = (e) => ({ x: e.x * k + ox, y: e.y * k + oy, hw: e.hw * k, sag: e.sag * k, lw: e.lw * k, r: e.rx * k, irisR: e.irisR * k, irisOff: [e.irisOff[0] * k, e.irisOff[1] * k] });
  const brow = (b) => ({ p0: P(...b.p0), c: P(...b.c), p1: P(...b.p1), lw: b.lw * k });
  return {
    line: rigFace.line,
    eyes: { L: eye(rigFace.eyes.L), R: eye(rigFace.eyes.R) },
    brows: { L: brow(rigFace.brows.L), R: brow(rigFace.brows.R) },
    mouth: { x: rigFace.mouth.x * k + ox, y: rigFace.mouth.y * k + oy, w: rigFace.mouth.w * k, sag: rigFace.mouth.sag * k, lw: rigFace.mouth.lw * k },
    cheeks: { L: [...P(rigFace.cheeks.L[0], rigFace.cheeks.L[1]), rigFace.cheeks.L[2] * k], R: [...P(rigFace.cheeks.R[0], rigFace.cheeks.R[1]), rigFace.cheeks.R[2] * k], colour: rigFace.cheeks.colour },
  };
}

// ---------------------------------------------------------------- tubes --
function sampleCubic(p0, c0, c1, p1, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * u * p0[0] + 3 * u * u * t * c0[0] + 3 * u * t * t * c1[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c0[1] + 3 * u * t * t * c1[1] + t * t * t * p1[1]]);
  }
  return pts;
}
function sampleQuad(p0, c, p1, n = 40) {
  return sampleCubic(p0, [p0[0] + (c[0] - p0[0]) * 2 / 3, p0[1] + (c[1] - p0[1]) * 2 / 3], [p1[0] + (c[0] - p1[0]) * 2 / 3, p1[1] + (c[1] - p1[1]) * 2 / 3], p1, n);
}
/** Upward-facing unit normals (screen y down → n.y ≤ 0 for a mostly horizontal line). */
function normals(pts) {
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
function tubeOutline(pts, wfn, frac = 1, off = 0) {
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
function fillPoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.fill();
}

const TUBE = {
  glow: 'rgba(28,98,255,0.62)', shadow: 'rgba(0,4,40,0.35)',
  rim: '#050c3c', body: '#0a1450', core: '#0f1f6e', top: '#16297f',
  spec: 'rgba(170,205,255,0.9)', bead: 'rgba(205,225,255,0.9)',
};

/**
 * Draw one glossy tube. pts: centreline; lw: nominal width; alpha; opts.taper
 * (end width ratio), opts.glow (0..1), opts.spec (0..1).
 */
function tube(ctx, tmp, pts, lw, alpha = 1, opts = {}) {
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
    fillPoly(g, tubeOutline(pts, wfn, 1.32, 0));
    g.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${(lw * 0.26).toFixed(1)}px)`;
    ctx.globalAlpha = alpha * (opts.glow ?? 1);
    ctx.drawImage(tmp, 0, 0, bw, bh, x0 - pad, y0 - pad, bw, bh);
    ctx.filter = 'none';
    ctx.globalAlpha = alpha;
  }
  ctx.save();
  ctx.translate(0, lw * 0.1);
  ctx.fillStyle = TUBE.shadow;
  fillPoly(ctx, tubeOutline(pts, wfn, 1.1, -0.05));
  ctx.restore();
  // 2 body: layered fills approximate a lit cylinder (light from above)
  ctx.fillStyle = TUBE.rim; fillPoly(ctx, tubeOutline(pts, wfn, 1.0, 0));
  ctx.fillStyle = TUBE.body; fillPoly(ctx, tubeOutline(pts, wfn, 0.84, 0.04));
  ctx.fillStyle = TUBE.core; fillPoly(ctx, tubeOutline(pts, wfn, 0.6, 0.08));
  ctx.fillStyle = TUBE.top; fillPoly(ctx, tubeOutline(pts, wfn, 0.3, 0.16));
  // 3 specular: a thin bright line along the top edge, fading toward the ends
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
      ctx.lineWidth = lw * 0.085;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0] + N[i - 1][0] * w0 * 0.3, pts[i - 1][1] + N[i - 1][1] * w0 * 0.3);
      ctx.lineTo(pts[i][0] + N[i][0] * w1 * 0.3, pts[i][1] + N[i][1] * w1 * 0.3);
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
  ctx.restore();
}

// ----------------------------------------------------------------- eyes --
function eyeGeom(e, side, P) {
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
  const yin = yCorner + slant, yout = yCorner - slant * 0.6;
  const oTop = clamp(o * (1 - P.lidTop), 0, 1.45);
  const oBot = clamp(o * (1 - P.lidBot), 0, 1.45);
  const qUp = lerp(yC + 2 * sagC, ey - ry * 1.86, oTop);
  const qLo = lerp(yC + 2 * sagC, ey + ry * 2.1, oBot);
  const c = (x0, y0, x1, y1, qy, sl) => {
    const qx = (x0 + x1) / 2;
    return [[x0 + (qx - x0) * 2 / 3, y0 + (qy - y0) * 2 / 3 + sl * (x0 === xin ? 1 : -0.5)],
      [x1 + (qx - x1) * 2 / 3, y1 + (qy - y1) * 2 / 3 + sl * (x1 === xin ? 1 : -0.5)]];
  };
  const up = c(xout, yout, xin, yin, qUp, P.lidSlant * ry * 0.55 * oc);
  const lo = c(xin, yin, xout, yout, qLo, 0);
  return { ex, ey, rx, ry, o, oc, xin, xout, yin, yout, up, lo, inner };
}

// a fixed constellation for each iris (same every frame)
function starsFor(seed) {
  let s = seed >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (let i = 0; i < 9; i++) out.push({ a: r() * Math.PI * 2, d: 0.5 + r() * 0.38, s: 0.05 + r() * 0.09, b: 0.5 + r() * 0.5 });
  return out;
}
const STARS = { L: starsFor(7), R: starsFor(19) };

function drawIris(ctx, cx, cy, ir, sx, P, side) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ir);
  g.addColorStop(0, '#000003');
  g.addColorStop(0.36, '#00020e');
  g.addColorStop(0.6, '#000d52');
  g.addColorStop(0.82, '#0024c4');
  g.addColorStop(0.93, '#0a1c96');
  g.addColorStop(1, '#030b3c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, ir, 0, Math.PI * 2); ctx.fill();
  // starlight flecks in the outer ring (the approved navy galaxy iris)
  ctx.globalCompositeOperation = 'lighter';
  for (const st of STARS[side]) {
    const x = Math.cos(st.a) * st.d * ir, y = Math.sin(st.a) * st.d * ir;
    const rr = st.s * ir;
    const sg = ctx.createRadialGradient(x, y, 0, x, y, rr * 2.2);
    sg.addColorStop(0, `rgba(150,180,255,${0.9 * st.b})`);
    sg.addColorStop(0.25, `rgba(60,110,255,${0.55 * st.b})`);
    sg.addColorStop(1, 'rgba(20,60,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(x, y, rr * 2.2, 0, Math.PI * 2); ctx.fill();
    // four-point glint
    ctx.strokeStyle = `rgba(170,200,255,${0.5 * st.b})`;
    ctx.lineWidth = rr * 0.18;
    ctx.beginPath(); ctx.moveTo(x - rr * 1.6, y); ctx.lineTo(x + rr * 1.6, y); ctx.moveTo(x, y - rr * 1.6); ctx.lineTo(x, y + rr * 1.6); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  // catchlights stay put relative to the light (the moon), not the iris rotation
  ctx.save();
  const hx = cx + P.catchX * ir, hy = cy + P.catchY * ir;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.ellipse(hx, hy, ir * 0.26, ir * 0.21, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(235,240,255,0.75)';
  ctx.beginPath();
  ctx.arc(cx - P.catchX * ir * 0.9, cy - P.catchY * ir * 0.85, ir * 0.08, 0, Math.PI * 2);
  ctx.fill();
  if (P.sparkle > 0.02) {
    ctx.globalAlpha = clamp(P.sparkle, 0, 1);
    ctx.fillStyle = 'rgba(255,250,235,0.9)';
    ctx.beginPath(); ctx.arc(cx + ir * 0.05, cy + ir * 0.42, ir * 0.06, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawEye(ctx, tmp, spec, side, P, ink) {
  const e = spec.eyes[side];
  const g = eyeGeom(e, side, P);
  const upperPts = sampleCubic([g.xout, g.yout], g.up[0], g.up[1], [g.xin, g.yin], 40);
  const regionPath = () => {
    ctx.beginPath();
    ctx.moveTo(g.xout, g.yout);
    ctx.bezierCurveTo(g.up[0][0], g.up[0][1], g.up[1][0], g.up[1][1], g.xin, g.yin);
    ctx.bezierCurveTo(g.lo[0][0], g.lo[0][1], g.lo[1][0], g.lo[1][1], g.xout, g.yout);
    ctx.closePath();
  };
  if (g.o > 0.015) {
    ctx.save();
    regionPath();
    ctx.clip();
    // sclera with soft ambient occlusion toward the rim
    const sg = ctx.createRadialGradient(g.ex - g.rx * 0.2, g.ey - g.ry * 0.28, g.rx * 0.08, g.ex, g.ey, g.rx * 1.05);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.6, '#f8f4fc');
    sg.addColorStop(0.88, '#e4dbef');
    sg.addColorStop(1, '#c9bde0');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(g.ex, g.ey, g.rx, g.ry, 0, 0, Math.PI * 2); ctx.fill();
    // iris (foreshortened when looking sideways: a round eyeball, not a sticker)
    const ir = e.irisR * P.irisScale * P.eyeScale;
    const lx = clamp(P.lookX, -1, 1), ly = clamp(P.lookY, -1, 1);
    const ix = g.ex + e.irisOff[0] * P.eyeScale + lx * (g.rx - ir) * 0.85;
    const iy = g.ey + e.irisOff[1] * P.eyeScale + ly * (g.ry - ir) * 0.8;
    drawIris(ctx, ix, iy, ir, 1 - 0.16 * Math.abs(lx), P, side);
    // occlusion shadow cast by the upper lid onto the eyeball
    ctx.beginPath(); ctx.ellipse(g.ex, g.ey, g.rx, g.ry, 0, 0, Math.PI * 2); ctx.clip();
    ctx.lineCap = 'round';
    for (const [w, a] of [[g.ry * 0.6, 0.07], [g.ry * 0.34, 0.09], [g.ry * 0.15, 0.13]]) {
      ctx.strokeStyle = `rgba(10,20,80,${a})`;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(upperPts[0][0], upperPts[0][1]);
      for (const p of upperPts) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
    // soft rim so the eye sits in the body
    ctx.strokeStyle = 'rgba(40,50,130,0.16)';
    ctx.lineWidth = g.rx * 0.045;
    ctx.beginPath(); ctx.ellipse(g.ex, g.ey, g.rx * 0.985, g.ry * 0.985, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // a faint lower lid edge for definition
    ctx.save();
    ctx.beginPath(); ctx.ellipse(g.ex, g.ey, g.rx * 1.04, g.ry * 1.04, 0, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.22 * smoothstep(0.1, 0.5, g.o);
    ctx.strokeStyle = '#2a3c9a';
    ctx.lineWidth = e.lw * 0.18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(g.xin, g.yin);
    ctx.bezierCurveTo(g.lo[0][0], g.lo[0][1], g.lo[1][0], g.lo[1][1], g.xout, g.yout);
    ctx.stroke();
    ctx.restore();
  }
  // lid line: the full glossy arc when shut, a slimmer lash line when open
  const closedA = 1 - smoothstep(0.02, 0.32, g.o);
  const lwOpen = e.lw * 0.62;
  const lw = lerp(lwOpen, e.lw * (1 + P.squint * 0.12), closedA);
  if (closedA > 0.995) { tube(ctx, tmp, upperPts, lw, 1, { taper: 0.8 }); return; }
  // while opening, the closed arc becomes the lash line resting on the eyeball
  ctx.save();
  const k = lerp(1.07, 3.0, closedA);               // clip opens up to the whole arc as the eye shuts
  ctx.beginPath(); ctx.ellipse(g.ex, g.ey, g.rx * k, g.ry * lerp(1.07, 3.0, closedA), 0, 0, Math.PI * 2); ctx.clip();
  tube(ctx, tmp, upperPts, lw, 1, { taper: lerp(0.55, 0.8, closedA), glow: lerp(0.45, 1, closedA), spec: lerp(0.5, 1, closedA) });
  ctx.restore();
}

// ---------------------------------------------------------------- brows --
function drawBrow(ctx, tmp, spec, side, P) {
  const b = spec.brows?.[side];
  if (!b || P.browAlpha < 0.02) return;
  const e = spec.eyes[side];
  const unit = e.r * 0.42;
  const innerIsP1 = side === 'L' ? b.p1[0] > b.p0[0] : b.p1[0] < b.p0[0];
  const lift = -P.browY * unit;
  const tiltIn = -P.browTilt * unit * 1.55, tiltOut = P.browTilt * unit * 0.45;
  const p0 = [b.p0[0], b.p0[1] + lift + (innerIsP1 ? tiltOut : tiltIn)];
  const p1 = [b.p1[0], b.p1[1] + lift + (innerIsP1 ? tiltIn : tiltOut)];
  const mid = [(b.p0[0] + b.p1[0]) / 2, (b.p0[1] + b.p1[1]) / 2];
  const c = [b.c[0], mid[1] + lift + (b.c[1] - mid[1]) + (tiltIn + tiltOut) * 0.5];
  tube(ctx, tmp, sampleQuad(p0, c, p1, 28), b.lw, clamp(P.browAlpha, 0, 1), { taper: 0.6, glow: 0.6 });
}

// ---------------------------------------------------------------- mouth --
function drawMouth(ctx, tmp, spec, P) {
  const M = spec.mouth;
  const s = clamp(P.mouthSmile, -1.2, 1.2);
  const o = clamp(P.mouthOpen, 0, 1.4);
  const r = clamp(P.mouthRound, 0, 1);
  const W = M.w * clamp(P.mouthWidth, 0.3, 1.5) * (1 - 0.5 * r);
  const sag = M.sag * s * (1 - 0.6 * r);
  const y0 = M.y + P.mouthY;
  const skew = P.mouthSkew * M.w * 0.1;
  const xL = M.x - W / 2, xR = M.x + W / 2;
  const waveAmp = P.mouthWave * M.w * 0.06;
  const N = 44;
  const roundness = clamp(r * 0.9 + o * 0.25, 0, 1);
  const line = (yOff, depth) => {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = lerp(xL, xR, u);
      const par0 = 4 * u * (1 - u);
      const par = lerp(par0, Math.sqrt(par0), roundness);
      const wv = Math.sin(u * Math.PI * 3 + P.mouthWavePhase) * waveAmp * Math.sin(Math.PI * u);
      pts.push([x, y0 + lerp(skew, -skew, u) + par * (sag + depth) + yOff * par + wv]);
    }
    return pts;
  };
  const depth = o * M.w * 0.42 * (1 + 0.2 * r) * (1 - 0.35 * r);
  if (o < 0.04) {
    tube(ctx, tmp, line(0, 0), M.lw, 1, {});
    return;
  }
  // open: the upper lip line rises a little, the lower drops; dark inside, a hint of tongue
  const upper = line(-depth * (0.12 + 0.4 * r), 0);
  const lower = line(0, depth);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(upper[0][0], upper[0][1]);
  for (const p of upper) ctx.lineTo(p[0], p[1]);
  for (let i = lower.length - 1; i >= 0; i--) ctx.lineTo(lower[i][0], lower[i][1]);
  ctx.closePath();
  ctx.fillStyle = '#1a0a3a';
  ctx.fill();
  ctx.clip();
  const ty = lower[N >> 1][1];
  const tg = ctx.createRadialGradient(M.x, ty + depth * 0.15, 0, M.x, ty + depth * 0.15, W * 0.32);
  tg.addColorStop(0, '#ff8ab0'); tg.addColorStop(0.7, '#e2557f'); tg.addColorStop(1, 'rgba(160,40,90,0)');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.ellipse(M.x, ty, W * 0.3, depth * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const lw = M.lw * lerp(1, 0.62, smoothstep(0.04, 0.4, o));
  // outline as one closed tube loop (approximated by two tubes meeting at the corners)
  tube(ctx, tmp, upper, lw, 1, { taper: 0.9, glow: 0.7 });
  tube(ctx, tmp, lower, lw, 1, { taper: 0.9, glow: 0.7, spec: 0.5 });
}

// --------------------------------------------------------------- cheeks --
function drawBlush(ctx, spec, P) {
  if (P.blush < 0.02) return;
  for (const side of ['L', 'R']) {
    const [x, y, r] = spec.cheeks[side];
    const rr = r * (1.1 + 0.25 * clamp(P.blush, 0, 1.5));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, `rgba(255,110,200,${0.42 * clamp(P.blush, 0, 1.5)})`);
    g.addColorStop(0.55, `rgba(255,120,210,${0.22 * clamp(P.blush, 0, 1.5)})`);
    g.addColorStop(1, 'rgba(255,130,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
  }
}

export class Face {
  constructor(spec, canvas) {
    this.spec = spec;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tmp = document.createElement('canvas');
    this.tmp.width = 1024; this.tmp.height = 512;
    // only the face region is ever touched
    const xs = [spec.eyes.L.x - spec.eyes.L.r * 2, spec.eyes.R.x + spec.eyes.R.r * 2, spec.cheeks.L[0] - spec.cheeks.L[2] * 2, spec.cheeks.R[0] + spec.cheeks.R[2] * 2];
    const ys = [spec.brows.L.c[1] - spec.eyes.L.r * 1.8, spec.mouth.y + spec.mouth.w * 0.9];
    this.box = [Math.floor(Math.min(...xs)), Math.floor(Math.min(...ys)), Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...ys))];
    this.last = '';
  }

  /** Redraw if the expression changed. Returns true when the canvas was updated. */
  draw(params) {
    const P = { ...NEUTRAL, ...params };
    const key = JSON.stringify(P, (k, v) => (typeof v === 'number' ? Math.round(v * 2000) / 2000 : v));
    if (key === this.last) return false;
    this.last = key;
    const { ctx, tmp, spec } = this;
    const [x0, y0, x1, y1] = this.box;
    ctx.save();
    ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    drawBlush(ctx, spec, P);
    drawBrow(ctx, tmp, spec, 'L', P);
    drawBrow(ctx, tmp, spec, 'R', P);
    drawEye(ctx, tmp, spec, 'L', P);
    drawEye(ctx, tmp, spec, 'R', P);
    drawMouth(ctx, tmp, spec, P);
    ctx.restore();
    return true;
  }
}
