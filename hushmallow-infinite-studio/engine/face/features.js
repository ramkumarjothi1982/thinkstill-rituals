// The face's features: iris (navy galaxy), eyes (sclera, iris, lid shadow, lid
// line), brows, mouth (line or open with tongue) and blush. Verbatim from
// stage2/face.js (frozen), except that every line is drawn through a `tube`
// function the caller supplies, (pts, lw, alpha, opts) => void: the exact
// profile passes the approved tube (tube.js legacyTube), the fast profiles the
// reduced-resolution one (tube.js fastTube). Call order and arguments are
// unchanged, so the exact profile draws exactly as before.

import { clamp, lerp, smoothstep, sampleCubic, sampleQuad, eyeGeom } from './geometry.js';

// a fixed constellation for each iris (same every frame)
function starsFor(seed) {
  let s = seed >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (let i = 0; i < 9; i++) out.push({ a: r() * Math.PI * 2, d: 0.5 + r() * 0.38, s: 0.05 + r() * 0.09, b: 0.5 + r() * 0.5 });
  return out;
}
const STARS = { L: starsFor(7), R: starsFor(19) };

export function drawIris(ctx, cx, cy, ir, sx, P, side) {
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

export function drawEye(ctx, tube, spec, side, P) {
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
  if (closedA > 0.995) { tube(upperPts, lw, 1, { taper: 0.8 }); return; }
  // while opening, the closed arc becomes the lash line resting on the eyeball
  ctx.save();
  const k = lerp(1.07, 3.0, closedA);               // clip opens up to the whole arc as the eye shuts
  ctx.beginPath(); ctx.ellipse(g.ex, g.ey, g.rx * k, g.ry * lerp(1.07, 3.0, closedA), 0, 0, Math.PI * 2); ctx.clip();
  tube(upperPts, lw, 1, { taper: lerp(0.55, 0.8, closedA), glow: lerp(0.45, 1, closedA), spec: lerp(0.5, 1, closedA) });
  ctx.restore();
}

// ---------------------------------------------------------------- brows --
export function drawBrow(ctx, tube, spec, side, P) {
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
  tube(sampleQuad(p0, c, p1, 28), b.lw, clamp(P.browAlpha, 0, 1), { taper: 0.6, glow: 0.6 });
}

// ---------------------------------------------------------------- mouth --
export function drawMouth(ctx, tube, spec, P) {
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
    tube(line(0, 0), M.lw, 1, {});
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
  tube(upper, lw, 1, { taper: 0.9, glow: 0.7 });
  tube(lower, lw, 1, { taper: 0.9, glow: 0.7, spec: 0.5 });
}

// --------------------------------------------------------------- cheeks --
export function drawBlush(ctx, spec, P) {
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
