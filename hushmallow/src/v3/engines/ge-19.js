// GE-19 · SOUND SHELL — spiral acoustic shell (spiral tracing).
// A large nacre shell coils inwards from a wide open lip to a small, quiet
// centre. Its chambers are full of sound: fine, crowded, trembling rings.
// Trace the spiral groove from the outer lip towards the centre with one
// fingertip. A glowing bead follows your trace and drags one clear ring
// inwards with it: behind the trace the sound-wave rings broaden and thin out
// into slow, wide swells; ahead they stay fine and crowded. Win: the single
// clear ring reaches the shell's quiet centre and rests there.
//
// Photos sit along the groove as pearl echo charms, each doubled by trembling
// echoes; when the trace passes one its echoes fold back into one steady
// picture in its own colours. The words are inscribed around the shell's lip,
// echoed by a shaky double that steadies into one clear line. At the finale
// one charm glides down the spiral and rests inside the clear ring.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, canvas, FONT } from '../fx.js';
import { resample, Wobble } from '../kit.js';

export const meta = {
  id: 'GE-19',
  howTo: 'Trace the shell’s spiral from its outer lip into the quiet centre.',
  steps: [
    'Touch the glowing bead in the shell’s open lip.',
    'Trace slowly along the spiral groove — the sound rings widen and thin out behind you.',
    'Follow the curl inwards until one clear ring rests at the quiet centre.',
  ],
  tapAlt: 'each press carries the bead one gentle stretch along the spiral',
  words: 'Your words are inscribed around the shell’s lip — doubled by a trembling echo that steadies into one clear line as you trace.',
  photos: {
    where: 'Your photos sit along the shell’s spiral groove.',
    becomes: 'pearl echo charms, each doubled by trembling echoes',
    touch: 'Your trace passes over each one;',
    change: 'as it does, its echoes fold back into one steady picture in its own colours.',
    payoff: 'At the end one of them glides down the spiral and rests, calm, inside the clear ring at the centre.',
  },
  finaleSec: 4.2,
};

const KG = 3;                         // whorl growth per turn
const LNK = Math.log(KG);
const MID = (1 + 1 / KG) / 2;         // groove radius ÷ outer edge radius
const MOUTH_B = 0.085;                // mouth ellipse half-depth (× R)
const CAP = 0.06;                     // banked trace allowed ahead of the law
const AHEAD = 24;                     // tracker look-ahead (points, ~4 px each)
const NOTES = 28;                     // trace notes along the whole spiral

export function create(E) {
  const { g, stage, photos, words } = E;
  const pal = E.pal;
  const reduced = !!(E.reduced || E.lowStim);
  const calmK = E.calm;
  const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);

  // ---- per-round arrangement
  const dir = E.round === 1 ? 1 : (E.rand() < 0.5 ? -1 : 1);           // winding direction
  const thL = -Math.PI / 2 + dir * (0.8 + (E.round === 1 ? 0 : (E.rand() - 0.5) * 0.25));
  const tint = E.round === 1 ? 0.3 : E.rand();
  const iriA = E.rand() * TAU;
  const twistKind = (E.round + Math.floor(E.rand() * 2)) % 2;

  const C = {
    calm: pal.glow,
    tense: mix(mix(pal.accent, pal.warm, 0.45), pal.glow, calmK * 0.6),
    clear: mix(pal.glow, '#ffffff', 0.62),
    pearl: mix('#fff4ea', pal.glow, 0.22),
    ink: '#fff7ec',
    b0: mix(pal.ink || pal.deep, '#02010a', 0.5),
    b1: mix(mix(pal.deep, pal.ink || pal.deep, 0.5), pal.accent, 0.08 + 0.1 * tint),
    b2: mix(mix(pal.deep, pal.glow, 0.3), mix(pal.warm, '#ffffff', 0.5), 0.1 + 0.12 * (1 - tint)),
    hi: mix(pal.glow, '#ffffff', 0.55),
  };

  // ---- geometry (re-fitted on resize)
  let R = 100, ox = 0, oy = 0, coreR = 10, restR = 13, s = 1, TOL = 36;
  let P = [], cum = [0], L = 1, last = 0;
  let silo = null;
  let shellC = null, shellX = 0, shellY = 0, shellW = 1, shellH = 1;
  const glyphs = [];
  let fs = 14;
  let wordC = null, ghostC = null, wordX = 0, wordY = 0, wordW = 1, wordH = 1;

  const rE = (ps) => R * Math.exp((-LNK * ps) / TAU);              // outer edge radius at tube angle ψ
  const ang = (ps) => thL - dir * ps;
  const at = (ps, r) => { const a = ang(ps); return [ox + Math.cos(a) * r, oy + Math.sin(a) * r]; };

  function idx(f) {
    const target = clamp(f) * L;
    let lo = 0, hi = last;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < target) lo = m + 1; else hi = m; }
    return lo;
  }
  function pathAt(f) {
    const target = clamp(f) * L;
    const k = Math.max(1, idx(f)), a = P[k - 1], b = P[k];
    const seg = cum[k] - cum[k - 1] || 1, u = clamp((target - cum[k - 1]) / seg);
    return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }

  function buildPath() {
    const raw = [];
    const rEnd = coreR * 1.15;
    const psE = (TAU * Math.log((MID * R) / rEnd)) / LNK;
    for (let ps = 0; ps < psE; ps += 0.02) raw.push(at(ps, MID * rE(ps)));
    const CURL = 1.4;
    for (let k = 0; k <= 24; k++) { const f = k / 24; raw.push(at(psE + f * CURL, rEnd * Math.pow(1 - f, 1.3))); }
    P = resample(raw, 4);
    cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    L = cum[cum.length - 1] || 1; last = P.length - 1;
  }

  function mouthGeom() {
    const ca = Math.cos(thL), sa = Math.sin(thL);
    return { ca, sa, fx: -dir * sa, fy: dir * ca, mx: ox + ca * MID * R, my: oy + sa * MID * R, a: (R * (1 - 1 / KG)) / 2, b: R * MOUTH_B };
  }
  function buildSilhouette() {
    silo = new Path2D();
    for (let i = 0; i <= 180; i++) { const ps = (i / 180) * TAU, [x, y] = at(ps, rE(ps)); if (i) silo.lineTo(x, y); else silo.moveTo(x, y); }
    const m = mouthGeom();
    for (let i = 0; i <= 24; i++) {
      const tau = Math.PI - (i / 24) * Math.PI;
      silo.lineTo(m.mx + m.ca * m.a * Math.cos(tau) + m.fx * m.b * Math.sin(tau), m.my + m.sa * m.a * Math.cos(tau) + m.fy * m.b * Math.sin(tau));
    }
    silo.closePath();
  }

  // words inscribed along the rim, reading left → right across the top
  const inset = () => fs * 0.95 + R * 0.03;
  const rText = (th) => rE((thL - th) / dir) - inset();
  function buildWords() {
    glyphs.length = 0;
    const text = String(words.token || '').trim();
    if (!text) return;
    fs = Math.max(12.5, Math.min(17, 14.5 * s));
    const MAXSW = 1.95;
    g.save();
    let base = text, str = text, sweep = 0;
    for (let tries = 0; tries < 80; tries++) {
      g.font = `600 ${fs}px ${FONT}`;
      sweep = g.measureText(str).width / Math.max(40, rE(1) - inset());
      if (sweep <= MAXSW) break;
      if (fs > 12.5) fs = Math.max(12.5, fs - 0.5);
      else if (base.length > 6) { base = base.slice(0, -1).trimEnd(); str = base + '…'; }
      else break;
    }
    const psC = Math.max(0.85, sweep / 2 + 0.26);
    let th = ang(psC) - sweep / 2;
    for (const ch of str) {
      const w = g.measureText(ch).width;
      th += w / 2 / Math.max(30, rText(th));
      const r = rText(th);
      glyphs.push({ ch, x: ox + Math.cos(th) * r, y: oy + Math.sin(th) * r, rot: th + Math.PI / 2, nx: Math.cos(th), ny: Math.sin(th), th, r });
      th += w / 2 / Math.max(30, rText(th));
    }
    g.restore();
    renderWords();
  }
  // the inscription is static, so it is rendered once per fit (crisp copy + its echo)
  function renderWords() {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const q of glyphs) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    const pad = Math.ceil(fs * 1.6);
    wordX = Math.floor(x0 - pad); wordY = Math.floor(y0 - pad); wordW = Math.ceil(x1 - x0 + pad * 2); wordH = Math.ceil(y1 - y0 + pad * 2);
    const cw = Math.max(1, Math.ceil(wordW * dpr)), ch = Math.max(1, Math.ceil(wordH * dpr));
    const paint = (c, pass) => {
      const wg = c.getContext('2d');
      wg.setTransform(1, 0, 0, 1, 0, 0); wg.clearRect(0, 0, cw, ch);
      wg.setTransform(dpr, 0, 0, dpr, -wordX * dpr, -wordY * dpr);
      wg.font = `600 ${fs}px ${FONT}`; wg.textAlign = 'center'; wg.textBaseline = 'middle';
      const each = (dx, dy) => { for (const q of glyphs) { wg.save(); wg.translate(q.x + dx, q.y + dy); wg.rotate(q.rot); wg.fillText(q.ch, 0, 0); wg.restore(); } };
      if (pass === 'ghost') { wg.fillStyle = C.tense; each(0, 0); return; }
      wg.fillStyle = 'rgba(0,0,10,0.62)'; each(0.8, 1.1);
      wg.shadowColor = rgba(C.calm, 0.85); wg.shadowBlur = 7 * dpr; wg.fillStyle = C.ink; each(0, 0);
      wg.shadowBlur = 0; each(0, 0);
    };
    if (!wordC || wordC.width !== cw || wordC.height !== ch) { wordC = canvas(cw, ch); ghostC = canvas(cw, ch); }
    paint(wordC, 'main'); paint(ghostC, 'ghost');
  }

  // ---- the shell body, rendered once per fit into an offscreen canvas
  function renderShell() {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i <= 90; i++) { const ps = (i / 90) * TAU, [x, y] = at(ps, rE(ps)); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const pad = Math.ceil(R * 0.14);
    shellX = Math.floor(x0 - pad); shellY = Math.floor(y0 - pad);
    shellW = Math.ceil(x1 - x0 + pad * 2); shellH = Math.ceil(y1 - y0 + pad * 2);
    const cw = Math.max(1, Math.ceil(shellW * dpr)), ch = Math.max(1, Math.ceil(shellH * dpr));
    if (!shellC || shellC.width !== cw || shellC.height !== ch) shellC = canvas(cw, ch);
    const sg = shellC.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, cw, ch);
    sg.setTransform(dpr, 0, 0, dpr, -shellX * dpr, -shellY * dpr);
    sg.lineCap = 'round'; sg.lineJoin = 'round';

    // grounding shadow + base body
    sg.save();
    sg.shadowColor = 'rgba(0,0,14,0.5)'; sg.shadowBlur = R * 0.08 * dpr; sg.shadowOffsetY = R * 0.04 * dpr;
    sg.fillStyle = C.b0; sg.fill(silo);
    sg.restore();

    // the coiled tube: a gradient across every whorl band (crease → sheen → rolled edge)
    const psMax = (TAU * Math.log(R / (coreR * 0.45))) / LNK;
    const dps = 0.035;
    for (let ps = 0; ps < psMax; ps += dps) {
      const p2 = Math.min(psMax, ps + dps * 1.45), pm = ps + dps * 0.7;
      const o1 = rE(ps), o2 = rE(p2), om = rE(pm);
      const a1 = ang(ps), a2 = ang(p2), am = ang(pm);
      const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2), cm = Math.cos(am), sm = Math.sin(am);
      const gr = sg.createLinearGradient(ox + cm * om / KG, oy + sm * om / KG, ox + cm * om, oy + sm * om);
      const dk = clamp(ps / psMax) * 0.5;
      const st = (c) => mix(c, C.b0, dk);
      gr.addColorStop(0, st(mix(C.b0, C.b1, 0.3))); gr.addColorStop(0.16, st(C.b1)); gr.addColorStop(0.5, st(C.b2));
      gr.addColorStop(0.62, st(mix(C.b2, C.hi, 0.3))); gr.addColorStop(0.76, st(C.b2)); gr.addColorStop(0.9, st(C.b1)); gr.addColorStop(1, st(mix(C.b1, C.b0, 0.55)));
      sg.fillStyle = gr;
      sg.beginPath();
      sg.moveTo(ox + c1 * o1, oy + s1 * o1); sg.lineTo(ox + c2 * o2, oy + s2 * o2);
      sg.lineTo(ox + c2 * o2 / KG, oy + s2 * o2 / KG); sg.lineTo(ox + c1 * o1 / KG, oy + s1 * o1 / KG);
      sg.closePath(); sg.fill();
    }
    // growth ribs (gently S-curved, like an ammonite)
    for (let ps = 0.16; ps < psMax - 0.4; ps += 0.16) {
      const ro = rE(ps), ri = ro / KG, w = ro - ri, dk = clamp(ps / psMax);
      const pin = at(ps + 0.03, ri + w * 0.07), pmid = at(ps - 0.025, ri + w * 0.5), pout = at(ps + 0.025, ro - w * 0.05);
      const cx = 2 * pmid[0] - (pin[0] + pout[0]) / 2, cy = 2 * pmid[1] - (pin[1] + pout[1]) / 2;
      sg.lineWidth = Math.max(0.6, ro * 0.008);
      sg.strokeStyle = `rgba(0,0,10,${0.13 * (1 - dk * 0.5)})`;
      sg.beginPath(); sg.moveTo(pin[0], pin[1]); sg.quadraticCurveTo(cx, cy, pout[0], pout[1]); sg.stroke();
      const qin = at(ps + 0.018, ri + w * 0.07), qmid = at(ps - 0.037, ri + w * 0.5), qout = at(ps + 0.013, ro - w * 0.05);
      sg.lineWidth = Math.max(0.5, ro * 0.004);
      sg.strokeStyle = rgba(C.hi, 0.07 * (1 - dk * 0.6));
      sg.beginPath(); sg.moveTo(qin[0], qin[1]); sg.quadraticCurveTo(2 * qmid[0] - (qin[0] + qout[0]) / 2, 2 * qmid[1] - (qin[1] + qout[1]) / 2, qout[0], qout[1]); sg.stroke();
    }
    // seams between whorls: a dark crease and a pearly rolled edge
    for (let ps = TAU; ps < psMax; ps += 0.12) {
      const p2 = Math.min(psMax, ps + 0.14), r1 = rE(ps), r2 = rE(p2);
      const A = at(ps, r1), B = at(p2, r2);
      sg.strokeStyle = 'rgba(0,0,10,0.5)'; sg.lineWidth = Math.max(1, r1 * 0.03);
      sg.beginPath(); sg.moveTo(A[0], A[1]); sg.lineTo(B[0], B[1]); sg.stroke();
      const A2 = at(ps, r1 * 1.012), B2 = at(p2, r2 * 1.012);
      sg.strokeStyle = rgba(C.hi, 0.26); sg.lineWidth = Math.max(0.6, r1 * 0.008);
      sg.beginPath(); sg.moveTo(A2[0], A2[1]); sg.lineTo(B2[0], B2[1]); sg.stroke();
    }
    // inscription groove along the lip (the words sit in it)
    if (glyphs.length) {
      const t0 = glyphs[0].th - (fs * 0.6) / glyphs[0].r, t1 = glyphs[glyphs.length - 1].th + (fs * 0.6) / glyphs[glyphs.length - 1].r;
      const groove = (off, col, w) => {
        sg.strokeStyle = col; sg.lineWidth = w; sg.beginPath();
        for (let i = 0; i <= 60; i++) { const th = lerp(t0, t1, i / 60), r = rText(th) + off; const x = ox + Math.cos(th) * r, y = oy + Math.sin(th) * r; if (i) sg.lineTo(x, y); else sg.moveTo(x, y); }
        sg.stroke();
      };
      groove(0, rgba(C.b0, 0.62), fs * 1.75);
      groove(fs * 0.9, rgba(C.hi, 0.16), 1);
      groove(-fs * 0.9, 'rgba(0,0,10,0.35)', 1);
    }
    // nacre iridescence + a soft key light from the upper left
    sg.save(); sg.clip(silo);
    sg.globalCompositeOperation = 'lighter';
    if (typeof sg.createConicGradient === 'function') {
      const cg = sg.createConicGradient(iriA, ox, oy);
      const cols = [pal.glow, pal.accent, pal.warm, pal.glow, C.pearl, pal.accent, pal.glow];
      cols.forEach((c, i) => cg.addColorStop(i / (cols.length - 1), rgba(c, 0.09)));
      sg.fillStyle = cg; sg.fillRect(shellX, shellY, shellW, shellH);
    }
    const kx = shellX + shellW * 0.3, ky = shellY + shellH * 0.22;
    const kg = sg.createRadialGradient(kx, ky, 0, kx, ky, R * 1.1);
    kg.addColorStop(0, 'rgba(255,255,255,0.13)'); kg.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = kg; sg.fillRect(shellX, shellY, shellW, shellH);
    sg.globalCompositeOperation = 'source-over';
    const dx = shellX + shellW * 0.78, dy = shellY + shellH * 0.85;
    const dg = sg.createRadialGradient(dx, dy, 0, dx, dy, R * 1.0);
    dg.addColorStop(0, 'rgba(0,0,12,0.26)'); dg.addColorStop(1, 'rgba(0,0,12,0)');
    sg.fillStyle = dg; sg.fillRect(shellX, shellY, shellW, shellH);
    sg.restore();
    // pearly outer rim
    sg.strokeStyle = rgba(C.hi, 0.5); sg.lineWidth = Math.max(1, R * 0.006);
    sg.beginPath();
    for (let i = 0; i <= 120; i++) { const ps = (i / 120) * TAU, [x, y] = at(ps, rE(ps) * 0.994); if (i) sg.lineTo(x, y); else sg.moveTo(x, y); }
    sg.stroke();
    // the open lip: an elliptical mouth looking into the dark tube
    const m = mouthGeom();
    sg.save(); sg.translate(m.mx, m.my); sg.rotate(thL); sg.scale(1, m.b / m.a);
    const mg = sg.createRadialGradient(0, 0, 0, 0, 0, m.a);
    mg.addColorStop(0, 'rgba(0,0,6,0.95)'); mg.addColorStop(0.62, rgba(C.b0, 0.95)); mg.addColorStop(0.9, rgba(mix(C.b1, pal.glow, 0.2), 0.95)); mg.addColorStop(1, rgba(C.b1, 1));
    sg.fillStyle = mg; sg.beginPath(); sg.arc(0, 0, m.a, 0, TAU); sg.fill();
    sg.restore();
    sg.save(); sg.translate(m.mx, m.my); sg.rotate(thL);
    sg.strokeStyle = rgba(C.hi, 0.75); sg.lineWidth = Math.max(1.5, R * 0.016);
    sg.beginPath(); sg.ellipse(0, 0, m.a, m.b, 0, 0, TAU); sg.stroke();
    sg.strokeStyle = rgba(C.pearl, 0.35); sg.lineWidth = Math.max(1, R * 0.006);
    sg.beginPath(); sg.ellipse(0, 0, m.a * 0.93, m.b * 0.72, 0, 0, TAU); sg.stroke();
    sg.restore();
    // the quiet centre: a soft hollow over the tiniest whorls
    const hg = sg.createRadialGradient(ox, oy, 0, ox, oy, coreR * 1.35);
    hg.addColorStop(0, 'rgba(0,0,8,0.92)'); hg.addColorStop(0.7, rgba(C.b0, 0.9)); hg.addColorStop(1, rgba(C.b0, 0));
    sg.fillStyle = hg; sg.beginPath(); sg.arc(ox, oy, coreR * 1.35, 0, TAU); sg.fill();
    sg.strokeStyle = rgba(C.hi, 0.3); sg.lineWidth = 1;
    sg.beginPath(); sg.arc(ox, oy, coreR * 0.98, 0, TAU); sg.stroke();
  }

  function fit() {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const acc = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
    for (let i = 0; i <= 120; i++) { const ps = (i / 120) * TAU, r = Math.exp((-LNK * ps) / TAU), a = ang(ps); acc(Math.cos(a) * r, Math.sin(a) * r); }
    { const ca = Math.cos(thL), sa = Math.sin(thL), fx = -dir * sa, fy = dir * ca, a = (1 - 1 / KG) / 2;
      for (let i = 0; i <= 12; i++) { const tau = Math.PI - (i / 12) * Math.PI; acc(ca * MID + ca * a * Math.cos(tau) + fx * MOUTH_B * Math.sin(tau), sa * MID + sa * a * Math.cos(tau) + fy * MOUTH_B * Math.sin(tau)); } }
    R = Math.min((stage.w * 0.95) / (x1 - x0), (stage.h * 0.9) / (y1 - y0));
    ox = stage.cx - ((x0 + x1) / 2) * R; oy = stage.cy - ((y0 + y1) / 2) * R;
    s = stage.s; coreR = R * 0.1; restR = coreR * 1.32; TOL = Math.max(36, 34 * s);
    buildPath(); buildSilhouette(); buildWords(); renderShell();
  }
  fit();
  const offResize = E.onResize(fit);

  // ---- charms along the groove: photos as pearl echo charms, pearls between
  const n = photos.n, KC = Math.max(5, n);
  const slot = Array.from({ length: KC }, () => -1);
  const shift = E.round > 1 ? Math.floor(E.rand() * KC) : 0;
  if (n) for (let j = 0; j < n; j++) slot[(Math.round((j * KC) / n) + shift) % KC] = (j + E.round - 1) % n;
  const charms = slot.map((ph, j) => ({ ph, u: 0.08 + (0.62 * j) / (KC - 1), q: 0, passed: false, seed: E.rand() * TAU }));
  const heroPh = n ? (E.round === 1 ? 0 : Math.floor(E.rand() * n)) : -1;
  let hero = charms.findIndex((c) => c.ph === heroPh && heroPh >= 0);
  if (hero < 0) hero = KC - 1;
  const charmSize = (c, u = c.u) => {
    const q = pathAt(u), rp = Math.hypot(q.x - ox, q.y - oy);
    const sz = clamp(rp * 0.66, 40, 74 * s);
    return c.ph >= 0 ? sz : sz * 0.72;
  };

  // ---- state
  let wanted = 0, prog = 0, shown = 0;
  let assistTo = null;
  let drag = null, fingerX = 0, fingerY = 0, off = false, lastMoveT = 0, moving = 0;
  let rush = 0, lastStep = 0, lastNoteT = -1, lastWait = -9, tapNote = 3, invite = 0;
  let sIn = 0, sOut = 0, clearR = MID * R;
  let doneFlag = false, settleAt = -1, finAt = -1, twistAt = -1, heroArrived = false;
  let hum = null;
  const wob = new Wobble();

  const startHum = () => { if (!hum) hum = E.hold('hum', { intensity: 0.18, pitch: lerp(1.1, 0.82, shown) }) || null; };
  const stopHum = () => { if (hum) { try { hum.stop(); } catch (e) { /* ignore */ } hum = null; } };

  // ----------------------------------------------------------- frame --
  function frame(dt, t) {
    // ---- simulation
    if (assistTo != null) { wanted = Math.min(assistTo, wanted + dt * 0.24); if (assistTo - wanted < 1e-4) assistTo = null; }
    prog = E.gate(wanted);
    if (wanted > prog + CAP) wanted = prog + CAP;
    shown = lerp(shown, prog, 1 - Math.exp(-dt * 9));
    if (Math.abs(shown - prog) < 1e-4) shown = prog;
    moving = Math.max(0, moving - dt * 2.5);
    if (drag == null) rush = Math.max(0, rush - dt * 1.5);
    invite = Math.max(0, invite - dt * 0.8);
    const wv = wob.update(dt);
    const head = pathAt(shown);
    const hr = Math.hypot(head.x - ox, head.y - oy);
    clearR = lerp(clearR, Math.max(hr, restR), 1 - Math.exp(-dt * 12));
    const spd = (reduced ? 0.35 : 1) * (finAt >= 0 ? 0.3 : 1);
    sIn += dt * lerp(1.0, 0.45, calmK) * spd * (1 + rush);
    sOut += dt * lerp(0.32, 0.1, shown) * spd;

    // pentatonic trace notes that step gently downwards into the centre
    const step = Math.floor(prog * NOTES + 1e-6);
    if (step > lastStep) {
      lastStep = step;
      if (t - lastNoteT > 0.085) {
        lastNoteT = t;
        const note = clamp(Math.round(lerp(8, 1, prog)) + (step % 2), 0, 9);
        E.sound('pluck', { note, intensity: lerp(0.3, 0.17, prog), pan: clamp((head.x - stage.cx) / (stage.w / 2), -1, 1) * 0.6 });
        E.haptic('tick');
        if (!reduced || step % 2 === 0) E.particles.emit({ x: head.x, y: head.y, vx: (Math.random() - 0.5) * 30, vy: -18 - Math.random() * 20, life: 0.9, size: 5, colour: C.clear, drag: 0.94 });
      }
    }
    if (hum) hum.update?.({ intensity: lerp(0.24, 0.07, shown) * (0.45 + 0.55 * Math.min(1, moving)), pitch: lerp(1.1, 0.82, shown) });

    // charms quieten as the trace passes them
    charms.forEach((c, j) => {
      if (!c.passed && prog > 0 && shown >= c.u - 0.004) {
        c.passed = true;
        const q = pathAt(c.u), sz = charmSize(c);
        if (c.ph >= 0) { photos.dust(c.ph, q.x, q.y, sz, reduced ? 6 : 12, { shape: 'circle', up: 22, speed: 18, life: 1.3 }); E.checkpoint('photo', c.ph); }
        else E.checkpoint('step');
        E.ripples.add(q.x, q.y, { colour: C.calm, speed: 55, alpha: 0.5, r: sz * 0.4 });
        E.sound('glass', { note: clamp(7 - j, 0, 9), intensity: 0.34 });
      }
      if (c.passed) c.q = Math.min(1, c.q + dt / 1.1);
    });

    if (!doneFlag && prog >= 0.999 && drag == null && assistTo == null && Math.abs(shown - prog) < 0.004) {
      doneFlag = true; settleAt = t;
      E.sound('settle', { intensity: 0.5 }); E.haptic('soft');
    }

    // ---- drawing
    const fin = finAt >= 0 ? clamp((t - finAt) / 3.2) : 0;
    const settle = smooth(invLerp(0.9, 1, shown));
    glow(g, ox, oy, R * 1.25, C.calm, 0.07 + 0.08 * shown + 0.08 * fin);
    g.drawImage(shellC, shellX, shellY, shellW, shellH);

    g.save(); g.clip(silo);
    drawSheen(t, fin);
    drawRings(t, hr, settle, fin);
    drawRibbon(t, fin);
    g.restore();

    drawGuide(t, fin);
    drawCharms(t, fin);
    drawWordsOnLip(t, fin);
    drawCore(t, settle, fin);
    drawHead(t, head, wv, fin);
    drawTwist(t);
    drawFinale(t, fin);
  }

  // ------------------------------------------------------------ drawing --
  function drawSheen(t, fin) {
    // two slow pearly glints travelling along the groove (ambient, hypnotic)
    for (let k = 0; k < 2; k++) {
      const u = ((reduced ? t * 0.012 : t * 0.028) + k * 0.5) % 1;
      const q = pathAt(u), rp = Math.hypot(q.x - ox, q.y - oy);
      glow(g, q.x, q.y, Math.max(18, rp * 0.75), C.clear, 0.06 + 0.04 * fin);
    }
  }
  function drawRings(t, hr, settle, fin) {
    g.save(); g.globalCompositeOperation = 'lighter';
    // ahead of the trace: fine, crowded, trembling rings
    const lf = R * lerp(0.04, 0.056, calmK);
    const jit = reduced ? 0 : lf * (0.2 + rush * 0.3) * (1 - calmK * 0.6);
    const fIn = sIn % 1;
    g.lineWidth = Math.max(1, 1.15 * s);
    for (let j = 0; j < 48; j++) {
      const r = hr - (j + fIn) * lf;
      if (r < coreR * 0.8) break;
      const a = 0.34 * (1 - fin) * smooth(clamp((hr - r) / (lf * 1.3))) * smooth(clamp((r - coreR * 0.8) / (lf * 1.6)));
      if (a < 0.01) continue;
      g.strokeStyle = rgba(C.tense, a);
      g.beginPath();
      if (jit > 0.05) {
        const ph = t * 2.3 + j * 1.7, ph2 = -t * 1.4 + j * 0.9, amp = jit * Math.min(1, r / (lf * 4));
        for (let i = 0; i <= 40; i++) {
          const th = (i / 40) * TAU, rr = r + amp * Math.sin(th * 5 + ph) * Math.sin(th * 3 + ph2);
          const x = ox + Math.cos(th) * rr, y = oy + Math.sin(th) * rr;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.closePath();
      } else g.arc(ox, oy, r, 0, TAU);
      g.stroke();
    }
    // behind the trace: broad, unhurried swells that thin out and fall quiet
    const lb = R * lerp(0.12, 0.34, smooth(shown));
    const quiet = (1 - smooth(invLerp(0.62, 0.97, shown))) * (1 - fin);
    const fOut = sOut % 1;
    if (quiet > 0.01) for (let j = 0; j < 14; j++) {
      const r = hr + (j + 1 - fOut) * lb;
      if (r > R * 1.02) break;
      const a = quiet * smooth(clamp((r - hr) / (lb * 0.6))) * smooth(clamp((R * 1.02 - r) / (R * 0.14)));
      if (a < 0.01) continue;
      g.strokeStyle = rgba(C.calm, 0.08 * a); g.lineWidth = lb * 0.4; g.beginPath(); g.arc(ox, oy, r, 0, TAU); g.stroke();
      g.strokeStyle = rgba(C.calm, 0.24 * a); g.lineWidth = lerp(3, 9, shown) * s; g.stroke();
      g.strokeStyle = rgba(C.clear, 0.55 * a); g.lineWidth = Math.max(1.2, 1.7 * s); g.stroke();
    }
    // the one clear ring, carried inwards by the trace
    const breathe = reduced ? 0 : Math.sin(t * 1.25) * 0.5 + 0.5;
    const ca = 0.62 + 0.38 * settle;
    g.beginPath(); g.arc(ox, oy, clearR * (1 + 0.015 * breathe * settle), 0, TAU);
    g.strokeStyle = rgba(C.calm, 0.13 * ca); g.lineWidth = Math.max(12, R * 0.08); g.stroke();
    g.strokeStyle = rgba(C.clear, (0.3 + 0.1 * breathe) * ca); g.lineWidth = 7 * s; g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.85 * ca); g.lineWidth = Math.max(1.8, 2.6 * s); g.stroke();
    g.restore();
  }
  function drawRibbon(t, fin) {
    const hi = idx(shown);
    if (hi < 2) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    const CH = 8;
    for (let k0 = 0; k0 < hi; k0 += CH) {
      const k1 = Math.min(hi, k0 + CH), km = (k0 + k1) >> 1;
      const rp = Math.hypot(P[km][0] - ox, P[km][1] - oy);
      for (let layer = 0; layer < 2; layer++) {
        const w = layer === 0 ? rp * 0.14 : Math.max(1.3, rp * 0.02);
        const a = layer === 0 ? 0.06 : 0.34;
        g.strokeStyle = rgba(layer === 1 ? C.clear : C.calm, a * (1 + fin * 0.5)); g.lineWidth = w;
        g.beginPath(); g.moveTo(P[k0][0], P[k0][1]);
        for (let k = k0 + 1; k <= k1; k++) g.lineTo(P[k][0], P[k][1]);
        g.stroke();
      }
    }
    g.restore();
  }
  function drawGuide(t, fin) {
    if (fin > 0 || prog >= 0.999) return;
    const hi = idx(shown);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = C.clear;
    for (let k = hi + 5, i = 0; k <= Math.min(last, hi + 60); k += 5, i++) {
      const pulse = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(t * 2.6 - i * 0.6);
      g.globalAlpha = 0.55 * (1 - i / 12) * pulse;
      g.beginPath(); g.arc(P[k][0], P[k][1], 1.5 + 0.9 * s, 0, TAU); g.fill();
    }
    g.restore();
  }
  function charmPos(c, j, t, fin) {
    let u = c.u;
    if (j === hero && fin > 0) u = lerp(c.u, 1, ease.inOutSine(clamp((t - finAt) / 2.6)));
    const q = pathAt(u);
    return q;
  }
  function drawCharms(t, fin) {
    charms.forEach((c, j) => {
      const isHero = j === hero && finAt >= 0;
      const glideK = isHero ? ease.inOutSine(clamp((t - finAt) / 2.6)) : 0;
      const q = charmPos(c, j, t, fin);
      let sz = charmSize(c, isHero ? lerp(c.u, 1, glideK * 0.5) : c.u);
      if (isHero) sz = lerp(sz, (c.ph >= 0 ? restR * 1.55 : restR * 1.1), glideK);
      const un = 1 - c.q;                                   // how "unsteady" it still is
      const shake = reduced ? 0 : un * 2.2 * s * (1 + rush);
      const x = q.x + shake * Math.sin(t * 21 + c.seed), y = q.y + shake * Math.cos(t * 17 + c.seed * 1.3);
      const tx = Math.cos(q.a), ty = Math.sin(q.a);
      const echo = un * (4 + 6 * un) * s * (reduced ? 1 : 1 + 0.25 * Math.sin(t * 7 + c.seed));
      const bob = c.q * (reduced ? 0 : Math.sin(t * 1.1 + c.seed) * 1.2);
      if (c.ph >= 0) {
        if (un > 0.02) for (let sg = -1; sg <= 1; sg += 2) {
          photos.draw(g, c.ph, x + tx * echo * sg, y + ty * echo * sg, sz, { shape: 'bubble', alpha: 0.3 * un, scale: 1 + 0.06 * un, tone: 'storm', toneMix: 0.5, shadow: false, sheen: false });
        }
        if (c.q > 0.02 && !isHero) {
          g.save(); g.globalCompositeOperation = 'lighter';
          g.strokeStyle = rgba(C.calm, 0.45 * c.q); g.lineWidth = 1.6 * s;
          g.beginPath(); g.arc(x, y + bob, sz * 0.5 + 3 * s, 0, TAU); g.stroke(); g.restore();
        }
        photos.draw(g, c.ph, x, y + bob, sz, { shape: 'bubble', tone: 'storm', toneMix: 0.42 * un, blur: 0.25 * un, glow: 0.25 + 0.35 * c.q, glowColour: c.q > 0.5 ? C.calm : C.tense, shadow: true });
      } else {
        const pr = sz * 0.36;
        if (un > 0.02) for (let sg = -1; sg <= 1; sg += 2) orb(g, x + tx * echo * sg, y + ty * echo * sg, pr, C.tense, { alpha: 0.28 * un });
        glow(g, x, y + bob, pr * 2.6, c.q > 0.5 ? C.calm : C.tense, 0.3 + 0.25 * c.q);
        orb(g, x, y + bob, pr, mix(mix(C.pearl, C.tense, 0.35 * un), C.calm, 0.15 * c.q));
      }
    });
  }
  function drawWordsOnLip(t, fin) {
    if (E.phase === 'law' || !glyphs.length || !wordC) return;
    const echo = (1 - smooth(shown)) * (1 - fin);
    g.save();
    if (echo > 0.02) {
      // the trembling echo: a doubled copy that steadies into the line as you trace
      const j = (reduced ? 2 : 2 + 1.5 * Math.sin(t * 6.3)) * echo * s, a = -Math.PI / 2 + 0.6;
      g.globalAlpha = 0.38 * echo;
      g.drawImage(ghostC, wordX + Math.cos(a) * j * 1.4, wordY + Math.sin(a) * j, wordW, wordH);
      g.globalAlpha = 0.2 * echo;
      g.drawImage(ghostC, wordX - Math.cos(a) * j, wordY + Math.sin(-a) * j * 0.6, wordW, wordH);
    }
    g.globalAlpha = 0.92 + 0.08 * shown;
    g.drawImage(wordC, wordX, wordY, wordW, wordH);
    if (shown > 0.5 || fin > 0) {
      // calm light gathering in the letters
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 * smooth(invLerp(0.5, 1, shown)) + 0.15 * fin;
      g.drawImage(wordC, wordX, wordY, wordW, wordH);
    }
    g.restore();
  }
  function drawCore(t, settle, fin) {
    const br = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.9);
    glow(g, ox, oy, coreR * (2 + 0.8 * shown + fin), C.calm, 0.16 + 0.34 * shown + 0.2 * fin + 0.05 * br);
    orb(g, ox, oy, coreR * (0.34 + 0.08 * settle), mix(C.pearl, C.clear, settle), { alpha: 0.9 });
    if (settleAt >= 0 && !reduced) {
      const k = clamp((t - settleAt) / 1.6);
      if (k < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(C.clear, 0.5 * (1 - k)); g.lineWidth = 2 * s; g.beginPath(); g.arc(ox, oy, restR * (1 + k * 0.6), 0, TAU); g.stroke(); g.restore(); }
    }
  }
  function drawHead(t, head, wv, fin) {
    if (fin > 0.6) return;
    const a = 1 - smooth(clamp(fin / 0.6));
    const nxv = -Math.sin(head.a), nyv = Math.cos(head.a);
    const x = head.x + nxv * wv * 3, y = head.y + nyv * wv * 3;
    const br = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(t * 3);
    // tether to a finger that has slipped off the groove
    if (drag != null && off) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(C.clear, 0.25); g.lineWidth = 1.5; g.setLineDash([3, 6]);
      g.beginPath(); g.moveTo(fingerX, fingerY); g.lineTo(x, y); g.stroke(); g.restore();
      glow(g, fingerX, fingerY, 22 * s, C.calm, 0.25);
    }
    if (drag == null && prog < 0.999 && fin === 0) {
      // slow invitation ring around the bead
      const k = reduced ? 0.5 : (t * 0.7) % 1;
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(C.clear, (0.4 + invite * 0.4) * (1 - k)); g.lineWidth = 1.8 * s;
      g.beginPath(); g.arc(x, y, (12 + 22 * k) * s, 0, TAU); g.stroke(); g.restore();
    }
    glow(g, x, y, (drag != null ? 34 : 27) * s, C.clear, (0.55 + 0.25 * br + invite * 0.3) * a);
    orb(g, x, y, Math.max(8, 10 * s), C.pearl, { alpha: a });
  }
  function drawTwist(t) {
    if (twistAt < 0) return;
    const k = (t - twistAt) / 3;
    if (k > 1.15) return;
    if (twistKind === 0) {
      // a slow wave of light runs along the spiral into the centre
      for (let i = 0; i < 4; i++) {
        const u = clamp(k - i * 0.035);
        if (u <= 0 || u >= 1) continue;
        const q = pathAt(u), rp = Math.hypot(q.x - ox, q.y - oy);
        glow(g, q.x, q.y, Math.max(16, rp * 0.6) * (1 - i * 0.18), C.clear, 0.32 * (1 - i * 0.22) * Math.sin(Math.PI * clamp(k)));
      }
    } else if (!reduced && Math.random() < 0.35 && k < 1) {
      // the lip breathes out a hush of tiny motes
      const m = mouthGeom(), u = Math.random() * 2 - 1;
      E.particles.emit({ x: m.mx + m.ca * m.a * u * 0.8, y: m.my + m.sa * m.a * u * 0.8, vx: m.fx * 40 + (Math.random() - 0.5) * 20, vy: m.fy * 40 - 10, life: 1.6, size: 5, colour: C.clear, drag: 0.97 });
    }
  }
  function drawFinale(t, fin) {
    if (finAt < 0) return;
    const k = clamp((t - finAt) / 2.6);
    if (k >= 1 && !heroArrived) {
      heroArrived = true;
      E.sound('chime', { intensity: E.heavy ? 0.25 : 0.4 });
      if (!E.heavy) E.particles.burst(ox, oy, reduced ? 6 : 14, { speed: 60, colour: C.clear, life: 1.4, size: 5, kind: 'glint' });
      E.ripples.add(ox, oy, { colour: C.calm, speed: E.heavy ? 40 : 70, alpha: 0.4, r: restR });
    }
    // the last echo leaves: one soft swell rolling out of the shell
    const w = clamp((t - finAt - 1.2) / 2.6);
    if (w > 0 && w < 1) {
      g.save(); g.clip(silo); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rgba(C.calm, 0.22 * Math.sin(Math.PI * w) * (E.heavy ? 0.7 : 1)); g.lineWidth = R * 0.08;
      g.beginPath(); g.arc(ox, oy, lerp(restR, R, ease.outCubic(w)), 0, TAU); g.stroke();
      g.restore();
    }
    if (heroArrived && !E.heavy && !reduced && Math.random() < 0.12) glint(g, ox + (Math.random() - 0.5) * restR * 2, oy + (Math.random() - 0.5) * restR * 2, 6 * s, C.clear, 0.5, Math.random());
    glow(g, ox, oy, R * 0.7, C.calm, 0.1 * fin);
  }

  // -------------------------------------------------------------- input --
  function nearTrace(p) {
    const iw = idx(wanted);
    let bd = 1e9;
    for (let k = Math.max(0, iw - 14); k <= Math.min(last, iw + AHEAD); k++) { const d = Math.hypot(P[k][0] - p.x, P[k][1] - p.y); if (d < bd) bd = d; }
    const h = pathAt(shown);
    return bd < TOL * 1.15 || Math.hypot(h.x - p.x, h.y - p.y) < TOL * 1.4;
  }
  function feed(p) {
    const iw = idx(wanted);
    let best = -1, bd = 1e18;
    for (let k = Math.max(0, iw - 6); k <= Math.min(last, iw + AHEAD); k++) { const dx = P[k][0] - p.x, dy = P[k][1] - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
    bd = Math.sqrt(bd);
    off = bd > TOL;
    if (off || best <= iw) return;
    const f = cum[best] / L, nw = Math.min(f, prog + CAP);
    if (nw > wanted) { wanted = nw; moving = Math.min(1.5, moving + 0.5); }
    if (f > prog + CAP + 0.004 && E.locked && E.now() - lastWait > 1) { lastWait = E.now(); E.checkpoint('wait'); wob.kick(0.6); }
  }

  return {
    get progress() { return prog; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      E.ripples.add(p.x, p.y, { colour: C.calm, speed: 70, alpha: 0.35, r: 6 });
      if (drag == null && prog < 0.999 + 1e-9 && nearTrace(p)) {
        drag = p.id; fingerX = p.x; fingerY = p.y; lastMoveT = p.t; off = false;
        startHum();
        E.sound('glass', { note: clamp(Math.round(lerp(7, 2, prog)), 0, 9), intensity: 0.36 }); E.haptic('light');
        feed(p);
      } else {
        // anywhere else the shell rings softly, and the bead calls you back
        tapNote = (tapNote + 3) % 10;
        E.sound('bubble', { note: tapNote, intensity: 0.26 }); E.haptic('tick');
        invite = 1;
        if (Math.hypot(p.x - ox, p.y - oy) < R) E.react('tap');
      }
    },
    move(p) {
      if (p.id !== drag) return;
      const dt = Math.max(1 / 240, (p.t || 0) - (lastMoveT || 0) || 1 / 60);
      const v = Math.hypot(p.x - fingerX, p.y - fingerY) / dt;
      lastMoveT = p.t; fingerX = p.x; fingerY = p.y;
      rush = lerp(rush, invLerp(900, 2200, v), 0.15);
      feed(p);
    },
    up(p) {
      if (p.id !== drag) return;
      drag = null; off = false; stopHum();
      if (prog < 0.999) E.sound('drip', { note: clamp(Math.round(lerp(6, 2, prog)), 0, 9), intensity: 0.18 });
    },
    assist() {
      if (finAt >= 0) return;
      if (E.locked) { E.checkpoint('wait'); wob.kick(0.5); }
      assistTo = Math.min(1, Math.max(wanted, prog) + 1 / 8);
      invite = 0.6;
    },
    pointAt(p) { const q = pathAt(p); return { x: q.x, y: q.y }; },
    hint() {
      if (prog >= 0.999) { const h = pathAt(1); return { tap: { x: h.x, y: h.y } }; }
      const f0 = prog, f1 = Math.min(1, f0 + 0.1), pts = [];
      for (let i = 0; i <= 14; i++) { const q = pathAt(lerp(f0, f1, i / 14)); pts.push([q.x, q.y]); }
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      E.sound('shimmer', { intensity: 0.32 });
      const m = mouthGeom();
      E.particles.burst(m.mx, m.my, reduced ? 4 : 10, { speed: 45, colour: C.clear, life: 1.2, size: 5, kind: 'glint' });
    },
    finish() {
      finAt = E.now(); stopHum(); drag = null;
      for (const c of charms) c.passed = true;
      E.sound(E.heavy ? 'breathe-out' : 'bloom', { intensity: E.heavy ? 0.3 : 0.42 });
    },
    destroy() { stopHum(); if (typeof offResize === 'function') offResize(); },
  };
}
