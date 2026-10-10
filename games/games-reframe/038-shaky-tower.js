/* 038 Shaky Tower — Reframe · REFRAME · Beliefs / Evidence
 * Mechanism: testing what a belief rests on (Beck's cognitive therapy: examine the evidence and the assumptions under a
 * conclusion). A harsh verdict usually stands on a few facts plus a stack of assumptions: a guess, the feeling of
 * certainty, the leap to "so it must mean". Sliding the assumptions out one at a time shows what is really holding it
 * up; when the last one goes, the verdict can't stand. The facts survive, and a shorter, steadier tower built only from
 * them can carry a fair thought. Honest: when the facts really do point toward the fear, Glitch says so and the new top
 * carries a plan, not a pep talk.
 * Verb: slide (drag a pale assumption block sideways out of a wobbling tower, slowly; facts won't budge), then stack
 * (drag the fact blocks into a short new tower and cap it with the fair thought). Physics: a small 2D rigid-body solver
 * (boxes, clipped contact manifolds, warm-started friction impulses; after Box2D-Lite) stepped at 120 Hz on real elapsed
 * time. A jerky pull shakes the blocks above it; a smooth one barely stirs them.
 * Twist: the last assumption hides a hollow core. Slide it out and the top of the tower topples in slow motion.
 * Finale: morning swings through the window as a sunbeam across the new tower; it glows and dust settles in the light.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;

  /* ---------------- small helpers ---------------- */
  const hexRgb = (hx) => { const n = parseInt(String(hx).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (hx, a) => { const c = hexRgb(hx); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const mixHex = (a, b, k) => { const A = hexRgb(a), B = hexRgb(b); return '#' + [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * k).toString(16).padStart(2, '0')).join(''); };
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  /* No GPU (VMs, blocklisted devices): the canvas is rasterised on the CPU, so it runs at a lower pixel ratio there. */
  let softMemo = null;
  function softwareGfx() {
    if (softMemo != null) return softMemo;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl');
      if (!gl) return (softMemo = true);
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return (softMemo = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r));
    } catch (e) { return (softMemo = false); }
  }
  /* Split one camera span into its separate facts. Every piece is an exact substring of the span (no lookbehind). */
  function splitFact(q) {
    const out = [];
    const push = (a, b) => { let s = q.slice(a, b).trim(); s = s.replace(/^[,;:\s]+/, '').replace(/[,;:\s]+$/, ''); if (s.replace(/["“”]/g, '').trim().split(/\s+/).length >= 2 || /^["“]/.test(s)) out.push(s); else if (s && out.length) out[out.length - 1] = q.slice(q.indexOf(out[out.length - 1]), b).trim().replace(/[,;:\s]+$/, ''); };
    let start = 0, inQ = false;
    for (let i = 0; i < q.length; i++) {
      const ch = q[i], nx = q[i + 1] || '';
      if (ch === '“') { inQ = true; continue; }
      if (ch === '”' || ch === '"') {
        if (ch === '"' && !inQ) { inQ = true; continue; }
        inQ = false;
        if (/[.!?]/.test(q[i - 1] || '') && nx === ' ' && /[A-Z]/.test(q[i + 2] || '')) { push(start, i + 1); start = i + 1; }
        continue;
      }
      if (inQ) continue;
      if (/[.!?;]/.test(ch) && (nx === ' ' || nx === '')) { push(start, i + 1); start = i + 1; }
      else if (ch === ':' && nx === ' ' && /["“]/.test(q[i + 2] || '')) { push(start, i); start = i + 1; }
    }
    push(start, q.length);
    return out.map(s => s.replace(/[.;]+$/, ''));
  }

  /* ---------------- physics: rigid boxes with clipped contact manifolds and warm-started impulses ----------------
   * After Box2D-Lite (Erin Catto, 2006): separating-axis test, reference/incident edge clipping for up to two contact
   * points with feature keys, accumulated normal and friction impulses carried between steps, Baumgarte bias with slop.
   * Units are screen pixels (y down). Kinematic bodies move by their velocity and push dynamic ones through friction. */
  function makeWorld() {
    const Wd = { bodies: [], arbs: new Map(), g: 1400, iters: 10, slop: 0.5, beta: 0.2, impacts: [], sleeping: true, calm: 0, nid: 1, pre: null };
    Wd.add = (o) => {
      const fixed = !!o.fixed, m = fixed ? 0 : o.w * o.h * (o.dens || 1);
      const b = Object.assign({ x: 0, y: 0, a: 0, fr: 0.75, group: 0, kind: '', layer: -1 }, o, { id: Wd.nid++, bw: o.w, bh: o.h, vx: 0, vy: 0, av: 0, hw: o.w / 2, hh: o.h / 2, fixed, kin: false, ghost: false, m, alpha: 1 });
      b.I = m ? m * (o.w * o.w + o.h * o.h) / 12 : 0; b.im = m ? 1 / m : 0; b.iI = b.I ? 1 / b.I : 0; b.r = Math.hypot(b.hw, b.hh);
      delete b.w; delete b.h;
      Wd.bodies.push(b); Wd.wake(); return b;
    };
    Wd.remove = (b) => { const i = Wd.bodies.indexOf(b); if (i >= 0) Wd.bodies.splice(i, 1); for (const [k, ar] of Wd.arbs) if (ar.b1 === b || ar.b2 === b) Wd.arbs.delete(k); };
    Wd.setKin = (b, on) => { b.kin = !!on; b.im = on || !b.m ? 0 : 1 / b.m; b.iI = on || !b.I ? 0 : 1 / b.I; if (on) { b.vx = 0; b.vy = 0; b.av = 0; } Wd.wake(); };
    Wd.wake = () => { Wd.sleeping = false; Wd.calm = 0; };
    Wd.reset = () => { Wd.bodies.length = 0; Wd.arbs.clear(); Wd.impacts.length = 0; };
    function incident(hx, hy, px, py, c, s, nx, ny) {
      const ix = -(c * nx + s * ny), iy = -(-s * nx + c * ny);
      let v0x, v0y, v1x, v1y, a0, b0, a1, b1;
      if (Math.abs(ix) > Math.abs(iy)) {
        if (ix > 0) { v0x = hx; v0y = -hy; a0 = 3; b0 = 4; v1x = hx; v1y = hy; a1 = 4; b1 = 1; }
        else { v0x = -hx; v0y = hy; a0 = 1; b0 = 2; v1x = -hx; v1y = -hy; a1 = 2; b1 = 3; }
      } else if (iy > 0) { v0x = hx; v0y = hy; a0 = 4; b0 = 1; v1x = -hx; v1y = hy; a1 = 1; b1 = 2; }
      else { v0x = -hx; v0y = -hy; a0 = 2; b0 = 3; v1x = hx; v1y = -hy; a1 = 3; b1 = 4; }
      return [{ x: px + c * v0x - s * v0y, y: py + s * v0x + c * v0y, i1: 0, o1: 0, i2: a0, o2: b0 }, { x: px + c * v1x - s * v1y, y: py + s * v1x + c * v1y, i1: 0, o1: 0, i2: a1, o2: b1 }];
    }
    function clipSeg(vIn, nx, ny, off, edge) {
      const out = [], d0 = nx * vIn[0].x + ny * vIn[0].y - off, d1 = nx * vIn[1].x + ny * vIn[1].y - off;
      if (d0 <= 0) out.push(vIn[0]);
      if (d1 <= 0) out.push(vIn[1]);
      if (d0 * d1 < 0) {
        const t = d0 / (d0 - d1), p = { x: vIn[0].x + t * (vIn[1].x - vIn[0].x), y: vIn[0].y + t * (vIn[1].y - vIn[0].y) };
        if (d0 > 0) { p.i1 = edge; p.o1 = vIn[0].o1; p.i2 = 0; p.o2 = vIn[0].o2; }
        else { p.i1 = vIn[1].i1; p.o1 = edge; p.i2 = vIn[1].i2; p.o2 = 0; }
        out.push(p);
      }
      return out;
    }
    function collide(A, B) {
      const hAx = A.hw, hAy = A.hh, hBx = B.hw, hBy = B.hh;
      const cA = Math.cos(A.a), sA = Math.sin(A.a), cB = Math.cos(B.a), sB = Math.sin(B.a);
      const dpx = B.x - A.x, dpy = B.y - A.y;
      const dAx = cA * dpx + sA * dpy, dAy = -sA * dpx + cA * dpy, dBx = cB * dpx + sB * dpy, dBy = -sB * dpx + cB * dpy;
      const c11 = cA * cB + sA * sB, c12 = -cA * sB + sA * cB, c21 = -sA * cB + cA * sB, c22 = sA * sB + cA * cB;
      const a11 = Math.abs(c11), a12 = Math.abs(c12), a21 = Math.abs(c21), a22 = Math.abs(c22);
      const fAx = Math.abs(dAx) - hAx - (a11 * hBx + a12 * hBy), fAy = Math.abs(dAy) - hAy - (a21 * hBx + a22 * hBy);
      if (fAx > 0 || fAy > 0) return null;
      const fBx = Math.abs(dBx) - (a11 * hAx + a21 * hAy) - hBx, fBy = Math.abs(dBy) - (a12 * hAx + a22 * hAy) - hBy;
      if (fBx > 0 || fBy > 0) return null;
      let axis = 1, sep = fAx, nx = dAx > 0 ? cA : -cA, ny = dAx > 0 ? sA : -sA;
      if (fAy > 0.95 * sep + 0.01 * hAy) { axis = 2; sep = fAy; nx = dAy > 0 ? -sA : sA; ny = dAy > 0 ? cA : -cA; }
      if (fBx > 0.95 * sep + 0.01 * hBx) { axis = 3; sep = fBx; nx = dBx > 0 ? cB : -cB; ny = dBx > 0 ? sB : -sB; }
      if (fBy > 0.95 * sep + 0.01 * hBy) { axis = 4; sep = fBy; nx = dBy > 0 ? -sB : sB; ny = dBy > 0 ? cB : -cB; }
      let fnx, fny, front, snx, sny, neg, pos, negE, posE, inc, sd;
      if (axis === 1) { fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + hAx; snx = -sA; sny = cA; sd = A.x * snx + A.y * sny; neg = -sd + hAy; pos = sd + hAy; negE = 3; posE = 1; inc = incident(hBx, hBy, B.x, B.y, cB, sB, fnx, fny); }
      else if (axis === 2) { fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + hAy; snx = cA; sny = sA; sd = A.x * snx + A.y * sny; neg = -sd + hAx; pos = sd + hAx; negE = 2; posE = 4; inc = incident(hBx, hBy, B.x, B.y, cB, sB, fnx, fny); }
      else if (axis === 3) { fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + hBx; snx = -sB; sny = cB; sd = B.x * snx + B.y * sny; neg = -sd + hBy; pos = sd + hBy; negE = 3; posE = 1; inc = incident(hAx, hAy, A.x, A.y, cA, sA, fnx, fny); }
      else { fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + hBy; snx = cB; sny = sB; sd = B.x * snx + B.y * sny; neg = -sd + hBx; pos = sd + hBx; negE = 2; posE = 4; inc = incident(hAx, hAy, A.x, A.y, cA, sA, fnx, fny); }
      const c1 = clipSeg(inc, -snx, -sny, neg, negE); if (c1.length < 2) return null;
      const c2 = clipSeg(c1, snx, sny, pos, posE); if (c2.length < 2) return null;
      let out = null;
      for (const p of c2) {
        const s = fnx * p.x + fny * p.y - front;
        if (s > 0) continue;
        let i1 = p.i1, o1 = p.o1, i2 = p.i2, o2 = p.o2;
        if (axis >= 3) { const t1 = i1; i1 = i2; i2 = t1; const t2 = o1; o1 = o2; o2 = t2; }
        (out = out || []).push({ x: p.x - s * fnx, y: p.y - s * fny, nx, ny, sep: s, key: i1 + o1 * 5 + i2 * 25 + o2 * 125, Pn: 0, Pt: 0, fresh: true });
      }
      return out;
    }
    function preStep(ar, inv) {
      const b1 = ar.b1, b2 = ar.b2;
      for (const c of ar.c) {
        const r1x = c.x - b1.x, r1y = c.y - b1.y, r2x = c.x - b2.x, r2y = c.y - b2.y;
        const rn1 = r1x * c.nx + r1y * c.ny, rn2 = r2x * c.nx + r2y * c.ny, tx = c.ny, ty = -c.nx, rt1 = r1x * tx + r1y * ty, rt2 = r2x * tx + r2y * ty;
        const kN = b1.im + b2.im + b1.iI * (r1x * r1x + r1y * r1y - rn1 * rn1) + b2.iI * (r2x * r2x + r2y * r2y - rn2 * rn2);
        const kT = b1.im + b2.im + b1.iI * (r1x * r1x + r1y * r1y - rt1 * rt1) + b2.iI * (r2x * r2x + r2y * r2y - rt2 * rt2);
        c.mN = kN > 0 ? 1 / kN : 0; c.mT = kT > 0 ? 1 / kT : 0;
        c.bias = -Wd.beta * inv * Math.min(0, c.sep + Wd.slop);
        c.r1x = r1x; c.r1y = r1y; c.r2x = r2x; c.r2y = r2y;
        if (c.fresh) {
          c.fresh = false;
          const dvx = b2.vx - b2.av * r2y - b1.vx + b1.av * r1y, dvy = b2.vy + b2.av * r2x - b1.vy - b1.av * r1x, vn = dvx * c.nx + dvy * c.ny;
          if (vn < -45 && Wd.impacts.length < 24) Wd.impacts.push({ x: c.x, y: c.y, v: -vn, b1, b2 });
        }
        const Px = c.Pn * c.nx + c.Pt * tx, Py = c.Pn * c.ny + c.Pt * ty;
        b1.vx -= b1.im * Px; b1.vy -= b1.im * Py; b1.av -= b1.iI * (r1x * Py - r1y * Px);
        b2.vx += b2.im * Px; b2.vy += b2.im * Py; b2.av += b2.iI * (r2x * Py - r2y * Px);
      }
    }
    function applyImp(ar) {
      const b1 = ar.b1, b2 = ar.b2;
      for (const c of ar.c) {
        let dvx = b2.vx - b2.av * c.r2y - b1.vx + b1.av * c.r1y, dvy = b2.vy + b2.av * c.r2x - b1.vy - b1.av * c.r1x;
        let dPn = c.mN * (-(dvx * c.nx + dvy * c.ny) + c.bias);
        const Pn0 = c.Pn; c.Pn = Math.max(Pn0 + dPn, 0); dPn = c.Pn - Pn0;
        let Px = dPn * c.nx, Py = dPn * c.ny;
        b1.vx -= b1.im * Px; b1.vy -= b1.im * Py; b1.av -= b1.iI * (c.r1x * Py - c.r1y * Px);
        b2.vx += b2.im * Px; b2.vy += b2.im * Py; b2.av += b2.iI * (c.r2x * Py - c.r2y * Px);
        dvx = b2.vx - b2.av * c.r2y - b1.vx + b1.av * c.r1y; dvy = b2.vy + b2.av * c.r2x - b1.vy - b1.av * c.r1x;
        const tx = c.ny, ty = -c.nx;
        let dPt = c.mT * -(dvx * tx + dvy * ty);
        const mx = ar.fr * c.Pn, Pt0 = c.Pt; c.Pt = Math.max(-mx, Math.min(mx, Pt0 + dPt)); dPt = c.Pt - Pt0;
        Px = dPt * tx; Py = dPt * ty;
        b1.vx -= b1.im * Px; b1.vy -= b1.im * Py; b1.av -= b1.iI * (c.r1x * Py - c.r1y * Px);
        b2.vx += b2.im * Px; b2.vy += b2.im * Py; b2.av += b2.iI * (c.r2x * Py - c.r2y * Px);
      }
    }
    Wd.step = (dt) => {
      const B = Wd.bodies, n = B.length, inv = 1 / dt;
      for (let i = 0; i < n; i++) {
        const bi = B[i];
        for (let j = i + 1; j < n; j++) {
          const bj = B[j], b1 = bi.id < bj.id ? bi : bj, b2 = b1 === bi ? bj : bi, key = b1.id * 8192 + b2.id;
          let cs = null;
          const skip = (!bi.im && !bj.im) || (bi.group < 0 && bi.group === bj.group) || (bi.ghost && bj.kind !== 'table') || (bj.ghost && bi.kind !== 'table');
          if (!skip) { const rs = b1.r + b2.r; if (Math.abs(b1.x - b2.x) <= rs && Math.abs(b1.y - b2.y) <= rs) cs = collide(b1, b2); }
          const ar = Wd.arbs.get(key);
          if (cs) {
            if (ar) { for (const c of cs) { for (const o of ar.c) if (o.key === c.key) { c.Pn = o.Pn; c.Pt = o.Pt; c.fresh = false; break; } } ar.c = cs; }
            else Wd.arbs.set(key, { b1, b2, c: cs, fr: Math.sqrt(b1.fr * b2.fr) });
          } else if (ar) Wd.arbs.delete(key);
        }
      }
      for (const b of B) { if (!b.im) continue; b.vy += Wd.g * dt; b.vx *= 0.9995; b.av *= 0.996; }
      if (Wd.pre) Wd.pre(dt);
      for (const ar of Wd.arbs.values()) preStep(ar, inv);
      for (let k = 0; k < Wd.iters; k++) for (const ar of Wd.arbs.values()) applyImp(ar);
      for (const b of B) { if (!b.im && !b.kin) continue; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.av * dt; }
    };
    return Wd;
  }

  (env.games = env.games || []).push({
    id: 'shaky-tower', mode: 'reframe', name: 'Shaky Tower', verb: 'slide', family: 'REFRAME', minutes: 2,
    parents: ['Beliefs / Evidence', 'Identity / Self', 'Inner Speech / Mental Text'],
    cast: ['glitch', 'loopie'], poster: { char: 'glitch', mood: 'scan' },
    fonts: ['Young+Serif', 'Manrope:wght@600;700;800'],
    tagline: 'Slide the assumptions out of a shaky tower. See what still stands.',
    why: 'For a harsh verdict on yourself: test which blocks are facts and which are guesses.',
    css: `
.g-shaky-tower { --st-disp: "Young Serif", "Georgia", "Cambria", "Times New Roman", serif; --st-ui: "Manrope", "Inter", "Segoe UI", "Helvetica Neue", "DejaVu Sans", system-ui, sans-serif; }
.g-shaky-tower .st-hit { position: absolute; inset: 0; z-index: 6; touch-action: none; cursor: grab; outline: none; }
.g-shaky-tower .st-hit:focus-visible { box-shadow: inset 0 0 0 3px #ffd36b; }
.g-shaky-tower .st-lab { position: absolute; left: 0; top: 0; z-index: 8; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; pointer-events: none; transform-origin: 50% 50%; opacity: 0; transition: opacity .45s ease; }
.g-shaky-tower .st-lab.on { opacity: 1; }
.g-shaky-tower .st-lab.off { visibility: hidden; }
.g-shaky-tower .st-lab > span { font: 700 15px/1.16 var(--st-ui); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; max-width: 100%; }
.g-shaky-tower .st-lab.fact > span { color: #fff3df; text-shadow: 0 1px 0 rgba(30, 14, 4, .45); }
.g-shaky-tower .st-lab.asm > span { color: #3a2610; }
.g-shaky-tower .st-lab.cap, .g-shaky-tower .st-lab.fair { align-items: center; text-align: center; gap: 3px; }
.g-shaky-tower .st-lab.cap small, .g-shaky-tower .st-lab.fair small { font: 800 12px/1 var(--st-ui); letter-spacing: .14em; text-transform: uppercase; }
.g-shaky-tower .st-lab.cap small { color: #ffd9cf; }
.g-shaky-tower .st-lab.cap > span { font: 400 17px/1.14 var(--st-disp); color: #fff; text-shadow: 0 1px 0 rgba(60, 8, 0, .4); }
.g-shaky-tower .st-lab.fair small { color: #fff1c2; }
.g-shaky-tower .st-lab.fair > span { font: 400 16px/1.22 var(--st-disp); color: #fff; -webkit-line-clamp: 6; text-shadow: 0 1px 0 rgba(0, 40, 24, .35); }
.g-shaky-tower .st-lab.fair .st-plan { font: 700 14px/1.25 var(--st-ui); color: #eafff3; border-top: 1px dashed rgba(255, 255, 255, .55); padding-top: 4px; margin-top: 2px; }
.g-shaky-tower .st-lab.fair .st-plan b { color: #ffe08a; }
.g-shaky-tower .st-hud { position: absolute; z-index: 26; left: 12px; top: calc(env(safe-area-inset-top, 0px) + 60px); max-width: var(--st-hudw, 280px); box-sizing: border-box; padding: 8px 12px 9px; border-radius: 14px; pointer-events: none;
  background: color-mix(in srgb, var(--ui-surface) 90%, transparent); border: 1px solid var(--ui-line); color: var(--ui-fg); box-shadow: 0 8px 22px rgba(0, 0, 0, .25); display: flex; flex-direction: column; gap: 4px; }
.g-shaky-tower .st-hud small { font: 800 12px/1 var(--st-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--ui-muted); }
.g-shaky-tower .st-hud b { font: 700 15px/1.2 var(--st-ui); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.g-shaky-tower .st-hud b .gk-user { font: 700 15px/1.2 var(--st-ui); }
.g-shaky-tower .st-key { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; font: 700 12px/1 var(--st-ui); color: var(--ui-muted); }
.g-shaky-tower .st-key i { display: inline-block; width: 16px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.g-shaky-tower .st-key i.f { background: linear-gradient(#7a5232, #3e2716); }
.g-shaky-tower .st-key i.a { background: #f3e5c8; box-shadow: inset 0 0 0 1px #a8875a; }
.g-shaky-tower .st-meter { position: absolute; z-index: 26; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 60px); width: 120px; height: 58px; border-radius: 14px; overflow: hidden; pointer-events: none;
  background: color-mix(in srgb, var(--ui-surface) 90%, transparent); border: 1px solid var(--ui-line); box-shadow: 0 8px 22px rgba(0, 0, 0, .25); transition: opacity .4s ease; }
.g-shaky-tower .st-meter.dim { opacity: 0; }
.g-shaky-tower .st-meter .gk-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.g-shaky-tower .st-meter b { position: absolute; left: 9px; top: 7px; font: 800 12px/1 var(--st-ui); letter-spacing: .12em; text-transform: uppercase; color: var(--ui-muted); }
.g-shaky-tower .st-meter em { position: absolute; right: 9px; top: 7px; font: 800 12px/1 var(--st-ui); font-style: normal; color: var(--ui-fg); }
.g-shaky-tower .gk-char .gk-bubble { max-width: var(--st-bub, 260px); }
.g-shaky-tower .st-low .gk-bubble { top: auto; bottom: 2px; }
.g-shaky-tower .st-low.gk-side-right .gk-bubble::before, .g-shaky-tower .st-low.gk-side-left .gk-bubble::before { top: auto; bottom: 22px; }
.g-shaky-tower .st-pop { position: absolute; z-index: 44; transform: translate(-50%, -50%); padding: 6px 12px 5px; border-radius: 999px; pointer-events: none; white-space: nowrap; font: 800 13px/1 var(--st-ui); letter-spacing: .1em; text-transform: uppercase;
  background: #fff6e2; color: #5a3410; box-shadow: 0 6px 16px rgba(0, 0, 0, .3), inset 0 0 0 2px #e8b45a; animation: shaky-tower-pop 1.5s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-shaky-tower .st-pop.cool { background: #eafff3; color: #13603d; box-shadow: 0 6px 16px rgba(0, 0, 0, .3), inset 0 0 0 2px #5fcf98; }
@keyframes shaky-tower-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(.7); } 14% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); } 22% { transform: translate(-50%, -50%) scale(1); } 80% { opacity: 1; transform: translate(-50%, -80%); } 100% { opacity: 0; transform: translate(-50%, -95%); } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(String(sub[k])); }); return s; };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const inten = ctx.intensity;
      const care = an.safety === 'care';
      const serious = an.fear_support === 'strong';
      const gentleTone = care || serious;
      const TEXT = String(ctx.text || ''), noWords = !TEXT.trim();
      const visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const SOFT = softwareGfx();

      /* ---------------- content: facts (solid blocks), assumptions (pale blocks), the verdict on top, the fair thought ---------------- */
      const lowerText = TEXT.toLowerCase();
      const exact = (q) => { q = String(q || '').trim(); if (!q) return ''; const i = lowerText.indexOf(q.toLowerCase()); return i >= 0 ? TEXT.slice(i, i + q.length) : q; };
      const STOP = { the: 1, and: 1, you: 1, your: 1, that: 1, this: 1, with: 1, was: 1, are: 1, for: 1, have: 1, has: 1, but: 1, not: 1, its: 1, youre: 1, ive: 1, been: 1, will: 1, just: 1 };
      const wordsOf = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP[w]);
      const EXAMPLES = [
        { conc: 'I’m a terrible friend.', facts: ['I forgot her birthday', 'I texted the next morning', 'She replied “no worries”'], guess: 'She’s secretly hurt', fair: 'I forgot a birthday and said sorry the next day. That’s a mistake, not a verdict on who I am.' },
        { conc: 'I’m bad at my job.', facts: ['I made an error in the report', 'My manager pointed it out', 'I fixed it the same day'], guess: 'Everyone noticed', fair: 'I made one error and fixed it fast. That’s part of doing a job, not proof I’m bad at it.' },
        { conc: 'I always mess things up.', facts: ['I burned the dinner', 'We ordered pizza instead', 'Everyone still ate together'], guess: 'They think I’m useless', fair: 'One dinner burned and the evening still worked out. “Always” is too big a word for that.' }
      ];
      const ex = noWords ? K.dailyPick(EXAMPLES, 5) : null;
      const spans = (Array.isArray(an.spans) ? an.spans : []).filter(s => s && typeof s.quote === 'string' && s.quote.trim().length > 1)
        .map(s => ({ q: exact(s.quote).replace(/[\s,;:]+$/, ''), kind: s.kind === 'camera' ? 'camera' : 'brain', ex: s.exhibit }));
      let concIdx = -1;
      if (an.witness_id) concIdx = spans.findIndex(s => s.ex === an.witness_id && s.kind === 'brain');
      if (concIdx < 0) {
        const cw = wordsOf(an.conclusion || an.thought); let best = 0;
        spans.forEach((s, i) => { if (s.kind !== 'brain') return; const sw = wordsOf(s.q), ov = sw.filter(w => cw.includes(w)).length, sc = ov / Math.max(1, Math.min(sw.length, cw.length)); if (ov >= 2 && sc >= 0.5 && ov > best) { best = ov; concIdx = i; } });
      }
      const CAP_N = [4, 5, 6][inten] || 5, CAP_G = [1, 2, 2][inten] || 2, CAP_F = [2, 3, 4][inten] || 3;
      let facts = [], guesses = [];
      if (noWords) { facts = ex.facts.map(t => ({ text: t, user: false })); guesses = [{ text: ex.guess, user: false, k: 'guess' }]; }
      else {
        spans.forEach(s => { if (s.kind === 'camera') splitFact(s.q).forEach(p => { if (p) facts.push({ text: p, user: true }); }); });
        if (!facts.length) (Array.isArray(an.exhibits) ? an.exhibits : []).filter(e => e && e.kind === 'camera' && e.text).slice(0, 2).forEach(e => facts.push({ text: String(e.text).replace(/\.$/, ''), user: false }));
        if (!facts.length) facts.push({ text: 'Something happened that you keep thinking about', user: false });
        guesses = spans.filter((s, i) => s.kind === 'brain' && i !== concIdx).map(s => ({ text: s.q, user: true, k: 'guess' }));
      }
      guesses = guesses.slice(0, CAP_G);
      const asms = guesses.concat([{ text: 'It feels certain', user: false, k: 'feel' }]);
      if (asms.length < 2) asms.push({ text: 'So it must mean…', user: false, k: 'leap' });
      facts = facts.slice(0, Math.max(1, Math.min(CAP_F, CAP_N - asms.length)));
      facts.forEach(f => { f.text = clip(f.text, 110); f.kind = 'fact'; f.k = 'fact'; });
      asms.forEach(c => { c.text = clip(c.text, 110); c.kind = 'asm'; });
      const conclusion = noWords ? { text: ex.conc, user: false } : concIdx >= 0 ? { text: clip(K.sentence(spans[concIdx].q), 90), user: true } : { text: clip(K.sentence(an.conclusion || an.thought || 'It means something bad about me'), 90), user: false };
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k) => (leads.find(l => l.kind === k) || {}).text || '';
      const fair = noWords ? ex.fair : clip(an.balanced || 'That fits more than one explanation, and one moment isn’t a verdict on me.', 140);
      const plan = noWords ? '' : care ? 'Get the exact facts from someone qualified.' : serious ? clip(lead('prepare') || lead('ask') || 'Write down the next single step.', 100) : '';
      const F = facts.length, NA = asms.length, N = F + NA;
      // the tower, bottom to top: facts and assumptions alternate, starting from a fact on the bottom
      const order = []; { let fi = 0, ai = 0; while (fi < F || ai < NA) { if (fi < F) order.push(facts[fi++]); if (ai < NA) order.push(asms[ai++]); } }

      /* ---------------- today's table, the wood you've earned ---------------- */
      const TABLES = [
        { key: 'Kitchen table', top: '#c98d4f', edge: '#8a5a2b', leg: '#6e4622', wallD: ['#12252a', '#1d3940'], wallB: ['#eef2e8', '#d9e3d2'], paper: 'stripe', sill: 'plant' },
        { key: 'Library desk', top: '#7a4a2a', edge: '#4a2a16', leg: '#3a2010', inlay: '#2f5a3e', wallD: ['#171b2a', '#252c43'], wallB: ['#f2ece2', '#e1d7c4'], paper: 'diamond', sill: 'books' },
        { key: 'Workshop bench', top: '#d6ad78', edge: '#9c7442', leg: '#7a5a32', wallD: ['#1a2723', '#283a33'], wallB: ['#e9ede4', '#d4dccd'], paper: 'boards', sill: 'jar' },
        { key: 'Café marble', top: '#ece7df', edge: '#a99f90', leg: '#3a3430', marble: true, wallD: ['#271a22', '#3a2631'], wallB: ['#f5ede7', '#e8dacf'], paper: 'tile', sill: 'cup' }
      ];
      const table = K.dailyPick(TABLES, 21);
      const WOODS = [
        { key: 'Maple', light: '#f3d7a6', base: '#e2b97e', dark: '#c49558', grain: '#9a6a34' },
        { key: 'Cherry', light: '#eeb08a', base: '#d68a5e', dark: '#b0613a', grain: '#7d3b1c' },
        { key: 'Walnut', light: '#c99a6c', base: '#a87a50', dark: '#7d5534', grain: '#4a2e18' },
        { key: 'Golden Oak', light: '#ffe08e', base: '#efbf55', dark: '#c48e2a', grain: '#8a5a10' }
      ];
      const woodIdx = clamp(Math.round(Number(S.store.get('shaky-tower:wood', 0)) || 0), 0, WOODS.length - 1);
      const wood = WOODS[woodIdx];

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        open: gentleTone
          ? { Jolly: 'This one matters, so we test it gently. Your conclusion sits on top.', Cheeky: 'Real stuff. We go slow. Conclusion’s on the top block.', Unfiltered: 'It matters. Test it gently.' }
          : visits ? { Jolly: 'I built another one! Even wobblier! Your conclusion’s on top.', Cheeky: 'Back for more wobble? I stacked it extra high.', Unfiltered: 'New tower. Conclusion on top.' }
            : { Jolly: 'I built a tower! Your conclusion’s right on top. Isn’t it tall?', Cheeky: 'Tallest tower ever. Don’t ask what it’s made of.', Unfiltered: 'Tall tower. Your conclusion on top.' },
        scan: { Jolly: 'Scanning the supports. Dark blocks are facts. Pale ones are assumptions.', Cheeky: 'Inspector Glitch. Facts: dark and solid. Assumptions: suspiciously light.', Unfiltered: 'Dark: facts. Pale: assumptions.' },
        scanEx: { Jolly: 'No words today, so here’s a classic case. Dark blocks are facts, pale ones are assumptions.', Cheeky: 'Example tower. Dark: facts. Pale: guesswork.', Unfiltered: 'Example. Dark: facts. Pale: assumptions.' },
        go: { Jolly: 'Slide a pale one out. Slowly. Steady hands.', Cheeky: 'Pull a pale one. Gently. This isn’t a tablecloth trick.', Unfiltered: 'Slide one out. Slowly.' },
        careful: { Jolly: 'Careful! Careful careful careful…', Cheeky: 'Easy! That’s my masterpiece!', Unfiltered: 'Careful.' },
        slow: { Jolly: 'Smooth and slow wins this one.', Cheeky: 'Less yank, more glide.', Unfiltered: 'Slower.' },
        out1: { Jolly: 'Out it came, and the tower’s still up. That block wasn’t holding much.', Cheeky: 'Assumption out. Tower: still standing. Suspicious.', Unfiltered: 'Out. Still standing.' },
        outN: { Jolly: 'Another one out. It’s getting shakier.', Cheeky: 'Wobblier by the minute. Very on brand.', Unfiltered: 'Shakier.' },
        loopieOut: gentleTone ? { Jolly: 'Still up. Okay.', Cheeky: 'Still standing.', Unfiltered: 'Still up.' } : { Jolly: 'It’s fine! It’s fine. It’s… mostly fine.', Cheeky: 'I meant to build it that wobbly.', Unfiltered: 'Hm. Wobbly.' },
        last: { Jolly: 'Last assumption. Let’s see what the conclusion really rests on.', Cheeky: 'Final pale block. Moment of truth.', Unfiltered: 'Last one.' },
        lastLoopie: gentleTone ? { Jolly: 'Gently does it.', Cheeky: 'Slow now.', Unfiltered: 'Slowly.' } : { Jolly: 'Wait, isn’t that one kind of important?', Cheeky: 'Not that one! …Is it that one?', Unfiltered: 'That one?' },
        inside: { Jolly: 'What was that noise inside?!', Cheeky: 'Did something just fall IN there?', Unfiltered: 'Something dropped.' },
        fact: { Jolly: 'That’s a fact. It’s carrying real weight. Leave it in.', Cheeky: 'Nope. Load-bearing. It actually happened.', Unfiltered: 'Fact. It stays.' },
        cap: { Jolly: 'That’s the conclusion itself. Test what’s holding it up.', Cheeky: 'That’s the verdict. Check its supports first.', Unfiltered: 'Test the supports.' },
        topple: gentleTone ? { Jolly: 'Here it goes…', Cheeky: 'And down it comes.', Unfiltered: 'Falling.' } : { Jolly: 'Nooo, my tower!', Cheeky: 'TIMBERRR!', Unfiltered: 'There it goes.' },
        hollow: { Jolly: 'Nothing behind that one. The top was resting on it.', Cheeky: 'Hollow! The whole top was balanced on a guess.', Unfiltered: 'Hollow. That held the top.' },
        crash: serious ? { Jolly: 'The facts here are real, and they point somewhere hard. What fell was the extra certainty.', Cheeky: 'Facts: real, and heavy. The extra certainty: on the floor.', Unfiltered: 'Facts real. Certainty fell.' }
          : { Jolly: 'The harsh conclusion couldn’t stand on facts alone. And look: the facts didn’t break.', Cheeky: 'Conclusion: down. Facts: not a scratch.', Unfiltered: 'Conclusion fell. Facts intact.' },
        early: { Jolly: 'Whoa, it came down early! The facts are still fine though.', Cheeky: 'Speed-run collapse. The facts survived anyway.', Unfiltered: 'Early fall. Facts fine.' },
        gather: { Jolly: 'Every fact made it. Let’s build something shorter and steadier.', Cheeky: 'Facts only this time. Short, sturdy, honest.', Unfiltered: 'Rebuild with facts.' },
        loopieShort: gentleTone ? { Jolly: 'Short and steady. I like it.', Cheeky: 'Short. Sturdy. Good.', Unfiltered: 'Short. Good.' } : { Jolly: 'A short tower? Hmm. It does look comfy.', Cheeky: 'Shorter? Fine. Cosy, even.', Unfiltered: 'Short. Okay.' },
        capGo: { Jolly: 'Now the thought that actually fits on top.', Cheeky: 'Cap it with something true.', Unfiltered: 'Fair thought on top.' },
        steady: serious ? { Jolly: 'Facts, with a plan on top. That one doesn’t wobble.', Cheeky: 'Real facts, real plan. Rock steady.', Unfiltered: 'Facts and a plan. Steady.' } : { Jolly: 'Not even a wobble.', Cheeky: 'Steadiest thing I’ve ever built. Well, you built.', Unfiltered: 'Steady.' },
        fin: care ? { Jolly: 'Built on facts. Next: get the exact facts from someone qualified.', Cheeky: 'Steady tower. Next stop: proper advice.', Unfiltered: 'Facts first. Then proper advice.' }
          : serious ? { Jolly: 'Built on facts, with a plan on top. That holds.', Cheeky: 'Honest tower, real plan. Engineering!', Unfiltered: 'Facts. Plan. Holds.' }
            : { Jolly: 'Shorter, steadier, and true. Morning looks good on it.', Cheeky: 'Less tall, more true. Nice build.', Unfiltered: 'Short. Steady. True.' }
      };

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', removed: 0, drag: null, carry: null, steady: [], prec: [], said: {}, shake: 0, timeScale: 1, slowUntil: 0, tremor: 0, finT: 0, scanT: 0, crashT: 0, crashed: false, early: false,
        stackTop: 0, placed: 0, finished: false, fn: 0, slowN: 0, q: 1, morning: 0, fact: null, factT: 0, hint: 0, kbd: null };
      const M = { W: 0, H: 0, phone: true, cx: 0, yT: 0, hgt: 40, len: 200, top: 150, built: false, s: 1, sx: 0, yTs: 0 };
      const P = K.particles({ max: 520 });
      const W = makeWorld();
      const T = { layers: [], cap: null, capY0: 0, top: 0 };
      const MEM = [];   // tremor history for the seismograph

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 2 });
      const hit = h('div', { class: 'st-hit', role: 'application', tabindex: '0', 'aria-label': 'The tower. Drag a pale assumption block sideways to slide it out. Enter slides the next one out for you.' });
      const hudStatus = h('b', { text: 'Inspecting the tower' });
      const hudKey = h('span', { class: 'st-key' }, h('span', null, h('i', { class: 'f' }), document.createTextNode('Fact')), h('span', null, h('i', { class: 'a' }), document.createTextNode('Assumption')));
      const hud = h('div', { class: 'st-hud', role: 'status', 'aria-live': 'polite' }, h('small', { text: table.key }), hudStatus, hudKey);
      const meterVal = h('em', { text: '' });
      const meter = h('div', { class: 'st-meter', 'aria-hidden': 'true' }, h('b', { text: 'Tremor' }), meterVal);
      el.append(hit, hud, meter);
      const mcv = K.canvas(meter, { maxDpr: 2 });
      meter.append(meter.querySelector('b'), meterVal);
      const loopie = K.character('loopie', { side: 'right', mood: 'happy', x: 10, y: 600, size: 64 });
      const glitch = K.character('glitch', { side: 'left', mood: 'scan', x: 300, y: 600, size: 64 });
      function say(c, line, o) { const other = c === loopie ? glitch : loopie; if (M.phone) other.hush(); return c.say(line, o); }
      function setStatus(t, user) { hudStatus.textContent = ''; if (user) hudStatus.append(K.userText(t)); else hudStatus.textContent = t; }
      function popTag(text, x, y, cool) { const p = h('div', { class: 'st-pop' + (cool ? ' cool' : ''), text, 'aria-hidden': 'true' }); p.style.left = clamp(x, 70, M.W - 70) + 'px'; p.style.top = clamp(y, 140, M.H - 120) + 'px'; el.append(p); K.later(() => p.remove(), 1600); }

      /* ---------------- sound: mallets on a wooden table ---------------- */
      function mallet(f, when, vol, bus) { if (!A.ctx) return; A.tone({ when, type: 'sine', freq: f, dur: 0.6, vol, attack: 0.003, bus }); A.tone({ when, type: 'sine', freq: f * 3.94, dur: 0.11, vol: vol * 0.22, attack: 0.002, bus }); A.tone({ when, type: 'triangle', freq: f * 2, dur: 0.08, vol: vol * 0.14, bus }); }
      const MUS = { on: false, next: 0, i: 0, bpm: 76, vol: 0.7, mode: 'tense' };
      const SCALE = { tense: ['A2', 'C3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4'], calm: ['C3', 'E3', 'G3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'E5'] };
      const PAT = { tense: [5, -1, 7, -1, 6, -1, 8, 7, 5, -1, 7, -1, 9, -1, 8, -1], calm: [3, 5, 6, 5, 7, 6, 5, 4, 3, 5, 6, 8, 7, 6, 5, -1] };
      function musicTick() {
        if (!A.ctx || !MUS.on) return;
        const t0 = A.now(); if (MUS.next < t0 - 0.4 || MUS.next > t0 + 2) MUS.next = t0 + 0.06;
        const e8 = 60 / MUS.bpm / 2, v = MUS.vol;
        while (MUS.next < t0 + 0.24) {
          const t = MUS.next, i = MUS.i, sc = SCALE[MUS.mode], pat = PAT[MUS.mode], step = pat[i % pat.length], bar = Math.floor(i / 8);
          if (v > 0.02) {
            if (i % 8 === 0) mallet(A.note(sc[(bar % 2) ? 1 : 0]), t, 0.13 * v, 'music');
            if (i % 8 === 4) mallet(A.note(sc[2]), t, 0.08 * v, 'music');
            if (step >= 0) mallet(A.note(sc[step]), t + (i % 2 ? 0.012 : 0), (MUS.mode === 'calm' ? 0.06 : 0.045) * v, 'music');
            if (i % 4 === 2) A.brush(t, 0.018 * v, 0.12);
          }
          MUS.i++; MUS.next += e8;
        }
      }
      let drone = null, scrape = null;
      function droneOn() {
        if (drone || !A.ctx || !A.bus || !A.bus('sfx')) return;
        try {
          const c = A.ctx, o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
          o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = 220; o2.frequency.value = 330.8; f.type = 'lowpass'; f.frequency.value = 1400; g.gain.value = 0.0001;
          o1.connect(f); o2.connect(f); f.connect(g); g.connect(A.bus('sfx')); o1.start(); o2.start();
          drone = { set(level, k) { if (!A.ctx) return; const t = A.ctx.currentTime; g.gain.setTargetAtTime(Math.max(0.0001, level), t, 0.08); o1.frequency.setTargetAtTime(220 * (1 + 0.5 * k), t, 0.15); o2.frequency.setTargetAtTime(330.8 * (1 + 0.5 * k), t, 0.15); }, stop() { try { o1.stop(); o2.stop(); g.disconnect(); } catch (e) { /* stopped */ } drone = null; } };
        } catch (e) { drone = null; }
      }
      S.onDestroy(() => { if (drone) drone.stop(); if (scrape) scrape.stop(); MUS.on = false; });
      let lastCreak = 0, lastClack = 0;
      const SND = {
        scan(i) { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sine', freq: 900 + i * 140, dur: 0.07, vol: 0.035 }); A.tone({ when: t + 0.05, type: 'sine', freq: 1350 + i * 210, dur: 0.06, vol: 0.02 }); },
        creak(k) { if (!A.ctx || now() - lastCreak < 340) return; lastCreak = now(); const t = A.now(), f = 70 + Math.random() * 60; A.tone({ when: t, type: 'sawtooth', freq: f, to: f * (0.7 + Math.random() * 0.25), glide: 0.35, dur: 0.4, vol: 0.02 + 0.05 * k, lp: 700, q: 8 }); A.noise({ when: t + 0.03, filter: 'bandpass', freq: 420 + Math.random() * 300, q: 10, dur: 0.3, vol: 0.02 * k }); },
        clack(v, size, pan) { if (!A.ctx || now() - lastClack < 28) return; lastClack = now(); const t = A.now(), k = clamp((v - 45) / 700, 0.05, 1), p = 1.5 - clamp(size, 0, 1) * 0.8; A.wood(t, 0.08 + 0.3 * k, p * (0.9 + Math.random() * 0.2)); A.noise({ when: t, filter: 'lowpass', freq: 600, dur: 0.06, vol: 0.06 * k, pan }); if (v > 380) A.tone({ when: t, type: 'sine', freq: 120, to: 50, glide: 0.18, dur: 0.3, vol: 0.12 * k }); },
        grab() { if (!A.ctx) return; A.wood(undefined, 0.12, 1.4); A.click({ vol: 0.05 }); },
        nope() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sine', freq: 140, to: 90, glide: 0.1, dur: 0.18, vol: 0.18 }); A.wood(t, 0.1, 0.5); A.wood(t + 0.09, 0.07, 0.48); },
        out(i) { if (!A.ctx) return; const t = A.now(); A.wood(t, 0.22, 0.9); A.noise({ when: t, filter: 'bandpass', freq: 1800, to: 900, q: 1.2, dur: 0.18, vol: 0.08 }); mallet(A.note(['E4', 'G4', 'A4', 'C5', 'D5', 'E5'][Math.min(5, i)]), t + 0.05, 0.12, 'sfx'); A.whoosh({ vol: 0.06, dur: 0.3 }); },
        drop() { if (!A.ctx) return; const t = A.now(); A.wood(t, 0.2, 0.55); A.tone({ when: t, type: 'sine', freq: 150, to: 70, glide: 0.12, dur: 0.2, vol: 0.14 }); },
        topple() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sawtooth', freq: 95, to: 55, glide: 1.4, dur: 1.6, vol: 0.05, lp: 500, q: 6 }); A.noise({ when: t, pink: true, filter: 'lowpass', freq: 300, to: 120, dur: 2.2, attack: 0.5, vol: 0.12 }); A.whoosh({ vol: 0.1, dur: 1.2 }); },
        place(i) { if (!A.ctx) return; const t = A.now(); A.wood(t, 0.2, 0.62); A.tone({ when: t, type: 'sine', freq: 130, to: 80, glide: 0.1, dur: 0.18, vol: 0.12 }); mallet(A.note(['C4', 'E4', 'G4', 'C5', 'E5'][Math.min(4, i)]), t + 0.03, 0.12, 'sfx'); },
        lift() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 520, to: 780, glide: 0.12, dur: 0.16, vol: 0.04 }); A.paper({ vol: 0.04 }); },
        float() { if (!A.ctx) return; const t = A.now(); ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => A.chime(A.note(n), { when: t + i * 0.09, vol: 0.04, dur: 1.4 })); },
        sweep() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 900, to: 3000, q: 0.8, dur: 0.7, attack: 0.25, vol: 0.06 }); }
      };

      /* ---------------- sprites: every block is a little painting, made once ---------------- */
      const ICON = {
        fact: (g, s) => { rr(g, -s * 1.15, -s * 0.72, s * 2.3, s * 1.5, s * 0.32); g.fill(); g.fillRect(-s * 0.42, -s * 0.98, s * 0.84, s * 0.34); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0.04 * s, s * 0.5, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; g.beginPath(); g.arc(0, 0.04 * s, s * 0.28, 0, TAU); g.fill(); },
        guess: (g, s) => { g.lineWidth = s * 0.32; g.lineCap = 'round'; g.beginPath(); g.arc(0, -s * 0.38, s * 0.48, Math.PI * 1.05, Math.PI * 2.35); g.quadraticCurveTo(0, s * 0.05, 0, s * 0.32); g.stroke(); g.beginPath(); g.arc(0, s * 0.82, s * 0.2, 0, TAU); g.fill(); },
        feel: (g, s) => { g.beginPath(); g.moveTo(0, s * 0.9); g.bezierCurveTo(-s * 1.5, -s * 0.05, -s * 0.75, -s * 1.25, 0, -s * 0.42); g.bezierCurveTo(s * 0.75, -s * 1.25, s * 1.5, -s * 0.05, 0, s * 0.9); g.fill(); },
        leap: (g, s) => { g.lineWidth = s * 0.32; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-s, s * 0.6); g.quadraticCurveTo(-s * 0.1, -s * 1.1, s * 0.85, -s * 0.15); g.stroke(); g.beginPath(); g.moveTo(s * 0.3, -s * 0.55); g.lineTo(s * 0.95, -s * 0.12); g.lineTo(s * 0.35, s * 0.25); g.stroke(); }
      };
      function sprite(kind, w, hh, seed, item) {
        const d = Math.min(2, cv.dpr || 1), c = document.createElement('canvas');
        c.width = Math.max(2, Math.ceil(w * d)); c.height = Math.max(2, Math.ceil(hh * d));
        const g = c.getContext('2d'); g.scale(d, d);
        const R = rng(seed * 7919 + 13), r = Math.min(6, hh * 0.13);
        const pal = kind === 'fact' ? { light: '#8c623e', base: '#6b4527', dark: '#432a17', grain: '#2a170a', edge: '#2a170a' }
          : kind === 'front' ? { light: '#fbf1dc', base: '#f2e2c2', dark: '#ddc69c', grain: '#b8996a', edge: '#a8875a' }
            : kind === 'core' || kind === 'stub' ? { light: '#6b4a30', base: '#4e3420', dark: '#33210f', grain: '#20140a', edge: '#1c1008' }
              : kind === 'cap' ? { light: '#e0705c', base: '#c4473a', dark: '#97302a', grain: '#7a2018', edge: '#6a1a12' }
                : kind === 'fair' ? { light: '#79c29c', base: '#4f9e79', dark: '#327a59', grain: '#1f5a3e', edge: '#1d4f37' }
                  : { light: wood.light, base: wood.base, dark: wood.dark, grain: wood.grain, edge: mixHex(wood.dark, '#2a170a', 0.5) };
        rr(g, 0.5, 0.5, w - 1, hh - 1, r); g.save(); g.clip();
        let gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, pal.light); gr.addColorStop(0.42, pal.base); gr.addColorStop(1, pal.dark);
        g.fillStyle = gr; g.fillRect(0, 0, w, hh);
        if (kind === 'sq') {
          // end grain: growth rings around a pith below the block
          const px = w * (0.25 + R() * 0.5), py = hh * (1.25 + R() * 0.7);
          g.lineWidth = 1.1;
          for (let k = 1; k < 16; k++) { g.strokeStyle = rgba(pal.grain, 0.18 + (k % 3 === 0 ? 0.14 : 0)); g.beginPath(); g.arc(px, py, k * hh * 0.12 + R() * 1.5, 0, TAU); g.stroke(); }
          gr = g.createRadialGradient(w * 0.5, hh * 0.3, 2, w * 0.5, hh * 0.3, w * 0.8); gr.addColorStop(0, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
        } else if (kind === 'cap' || kind === 'fair') {
          // painted plank: soft sheen and an inset rule
          gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
          for (let k = 0; k < 4; k++) { const y0 = hh * (0.2 + 0.6 * k / 3); g.strokeStyle = rgba(pal.grain, 0.1); g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= w; x += 10) g.lineTo(x, y0 + Math.sin(x * 0.03 + k) * 1.2); g.stroke(); }
          g.strokeStyle = kind === 'fair' ? 'rgba(255,230,150,0.85)' : 'rgba(255,225,210,0.55)'; g.lineWidth = kind === 'fair' ? 2 : 1.4; rr(g, 4, 4, w - 8, hh - 8, Math.max(2, r - 2)); g.stroke();
        } else {
          // long grain, a knot in the hardwood, specks in the balsa
          for (let k = 0; k < 7; k++) {
            const y0 = hh * (0.1 + 0.8 * (k + R() * 0.7) / 7); g.strokeStyle = rgba(pal.grain, kind === 'front' ? 0.2 + R() * 0.12 : 0.18 + R() * 0.16); g.lineWidth = 0.8 + R() * 0.9;
            g.beginPath(); for (let x = -6; x <= w + 6; x += 8) { const y = y0 + Math.sin(x * 0.018 + k * 1.7) * 1.5 + Math.sin(x * 0.07 + k) * 0.6; if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
          }
          if (kind === 'fact') { const kx = w * (0.62 + R() * 0.28), ky = hh * (0.3 + R() * 0.4); g.fillStyle = rgba(pal.grain, 0.45); g.beginPath(); g.ellipse(kx, ky, hh * 0.17, hh * 0.08, 0, 0, TAU); g.fill(); g.strokeStyle = rgba(pal.grain, 0.3); g.beginPath(); g.ellipse(kx, ky, hh * 0.28, hh * 0.14, 0, 0, TAU); g.stroke(); }
          if (kind === 'front') { g.fillStyle = rgba(pal.grain, 0.25); for (let k = 0; k < 18; k++) g.fillRect(R() * w, R() * hh, 1.2, 1.2); }
        }
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, 0, w, Math.max(1.5, hh * 0.06));
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, hh - Math.max(1.5, hh * 0.08), w, Math.max(1.5, hh * 0.08));
        g.restore();
        g.strokeStyle = pal.edge; g.lineWidth = 1; rr(g, 0.5, 0.5, w - 1, hh - 1, r); g.stroke();
        if (kind === 'front') { g.setLineDash([5, 4]); g.strokeStyle = 'rgba(138,104,58,0.7)'; rr(g, 3.5, 3.5, w - 7, hh - 7, Math.max(2, r - 2)); g.stroke(); g.setLineDash([]); }
        if ((kind === 'fact' || kind === 'front') && item) {
          // a brand burned into the left end: camera for a fact, ? for a guess, heart for a feeling, arrow for a leap
          const s = hh * 0.25, x0 = hh * 0.5 + 1, y0 = hh / 2;
          g.save(); g.translate(x0, y0);
          g.fillStyle = kind === 'fact' ? 'rgba(255,226,170,0.16)' : 'rgba(120,80,30,0.12)'; g.beginPath(); g.arc(0, 0, s * 1.75, 0, TAU); g.fill();
          g.fillStyle = kind === 'fact' ? '#f2cf8e' : '#8a6233'; g.strokeStyle = g.fillStyle;
          (ICON[kind === 'fact' ? 'fact' : (item.k || 'guess')] || ICON.guess)(g, s);
          g.restore();
        }
        return c;
      }

      /* ---------------- labels: the player's words ride on their blocks ---------------- */
      const LABS = [];
      function labelFor(b, cls, item, extra) {
        const lab = h('div', { class: 'st-lab ' + cls, 'aria-hidden': 'true' });
        if (extra) lab.append(h('small', { text: extra }));
        lab.append(h('span', { class: item.user ? 'gk-user' : 'st-gen', text: item.text }));
        el.append(lab); b.lab = lab; lab.st = { k: '' }; LABS.push(b);
        sizeLabel(b);
        return lab;
      }
      function sizeLabel(b) {
        const lab = b.lab; if (!lab) return;
        const pad = b.kind === 'cap' || b.kind === 'fair' ? '6px 14px' : '0 10px 0 ' + Math.round(b.bh * 0.98 + 4) + 'px';
        Object.assign(lab.style, { width: b.bw + 'px', height: b.bh + 'px', padding: pad });
      }

      /* ---------------- layout: the world is built once in this screen's pixels; resizes move the camera ---------------- */
      let bgOK = false, bgKey = '';
      const bg = document.createElement('canvas'), bgM = document.createElement('canvas');
      function layout() {
        const Wd0 = cv.w, Hd0 = cv.h; if (!Wd0 || !Hd0) return;
        M.W = Wd0; M.H = Hd0; M.phone = Wd0 < 700;
        const yT = Math.round(Hd0 - (M.phone ? 150 : 112)), top = M.phone ? 174 : 134;
        if (!M.built) {
          const layers = 2 * N + 1.35;
          M.hgt = clamp(Math.floor((yT - top) / layers), 30, 60);
          M.len = Math.round(Math.min(5 * M.hgt, Wd0 - (M.phone ? 124 : 220)));
          M.cx = Math.round(Wd0 / 2); M.yT = yT; M.top = top; M.wW = Wd0; M.wH = Hd0;
          buildTower(); M.built = true;
        }
        M.s = Math.min(1.25, Wd0 / M.wW, (yT - top + 40) / (M.yT - M.top + 40));
        M.sx = Wd0 / 2; M.yTs = yT;
        placeDom();
        bgOK = false;
      }
      const toS = (x, y) => ({ x: (x - M.cx) * M.s + M.sx, y: (y - M.yT) * M.s + M.yTs });
      const toW = (x, y) => ({ x: (x - M.sx) / M.s + M.cx, y: (y - M.yTs) / M.s + M.yT });
      function placeDom() {
        const Wd0 = M.W, Hd0 = M.H;
        hud.style.setProperty('--st-hudw', Math.max(170, Math.min(300, Wd0 - 24 - 120 - 12)) + 'px');
        if (M.phone) {
          const sz = 64, y = Hd0 - 14 - sz, bw = Wd0 - 2 * (10 + sz) - 28;
          [[loopie, 10, 'right'], [glitch, Wd0 - 10 - sz, 'left']].forEach(([c, x, side]) => { c.el.style.setProperty('--sz', sz + 'px'); c.place(x, y); c.side(side); c.el.classList.add('st-low'); c.el.style.setProperty('--st-bub', Math.max(150, Math.min(290, bw)) + 'px'); });
        } else {
          // on the table, either side of the tower, out of reach of a sliding block
          const sz = 92, half = M.len * M.s / 2, reach = M.len * M.s * 0.8 + 40, y = M.yTs - sz + 8;
          const xl = Math.max(14, M.sx - half - reach - sz), xr = Math.min(Wd0 - 14 - sz, M.sx + half + reach);
          [[loopie, xl], [glitch, xr]].forEach(([c, x]) => { c.el.style.setProperty('--sz', sz + 'px'); c.place(x, y); c.side('above'); c.el.classList.remove('st-low'); c.el.style.setProperty('--st-bub', '270px'); });
        }
        LABS.forEach(b => { if (b.lab) b.lab.st.k = ''; });
      }

      /* ---------------- the tower ---------------- */
      function buildTower() {
        W.reset(); T.layers.length = 0;
        const hh = M.hgt, len = M.len, cx = M.cx, yT = M.yT, dens = 1 / (len * hh);
        W.g = 28 * hh;
        W.add({ x: cx, y: yT + 400, w: 30000, h: 800, fixed: true, fr: 0.9, kind: 'table' });
        const yAt = (i) => yT - hh * (i + 0.5);
        let li = 0, seed = 1;
        const cross = () => {
          const ws = len / 3, bodies = [0, 1, 2].map(k => { const b = W.add({ x: cx + (k - 1) * ws, y: yAt(li), w: ws - 2, h: hh, dens, kind: 'sq', layer: li }); b.spr = sprite('sq', ws - 2, hh, seed++); return b; });
          T.layers.push({ type: 'cross', i: li, bodies }); li++;
        };
        order.forEach((item) => {
          cross();
          const y = yAt(li);
          if (item.kind === 'fact') {
            const b = W.add({ x: cx, y, w: len, h: hh, dens, kind: 'fact', layer: li }); b.item = item; b.spr = sprite('fact', len, hh, seed++, item);
            labelFor(b, 'fact', item); item.body = b; T.layers.push({ type: 'fact', i: li, item, body: b });
          } else {
            // an assumption layer: the pale block in front is loose (a hair thinner, and slippery); the blocks behind it carry the load
            const gid = -(li + 1);
            const core = W.add({ x: cx, y, w: len - 6, h: hh, dens, kind: 'core', layer: li, group: gid }); core.spr = sprite('core', len - 6, hh, seed++);
            const front = W.add({ x: cx, y, w: len, h: hh - 1.4, dens, kind: 'front', layer: li, group: gid, fr: 0.03 }); front.item = item; front.spr = sprite('front', len, hh - 1.4, seed++, item);
            labelFor(front, 'asm', item); item.body = front; front.slotX = cx; front.slotY = y; front.core = core;
            T.layers.push({ type: 'asm', i: li, item, front, core });
          }
          li++;
        });
        const capH = Math.round(hh * 1.32), capW = Math.round(len * 1.06);
        T.cap = W.add({ x: cx, y: yT - hh * li - capH / 2, w: capW, h: capH, dens: dens * 0.9, kind: 'cap', layer: li });
        T.cap.spr = sprite('cap', capW, capH, seed++);
        labelFor(T.cap, 'cap', conclusion, noWords ? 'Example conclusion' : 'Your conclusion');
        T.capY0 = T.cap.y; T.top = li;
        W.sleeping = true;
      }
      const asmLeft = () => T.layers.filter(l => l.type === 'asm' && !l.item.removed);
      const nextAsm = () => { const left = asmLeft(); return left.length ? left[left.length - 1] : null; };   // topmost first

      /* ---------------- input ---------------- */
      function bodyAt(p, list, pad) {
        const wpt = toW(p.x, p.y);
        for (let i = list.length - 1; i >= 0; i--) {
          const b = list[i]; if (!b) continue;
          const dx = wpt.x - b.x, dy = wpt.y - b.y, c = Math.cos(b.a), s = Math.sin(b.a), lx = c * dx + s * dy, ly = -s * dx + c * dy;
          if (Math.abs(lx) <= b.hw + pad && Math.abs(ly) <= b.hh + pad) return b;
        }
        return null;
      }
      K.press(hit, {
        down: (p) => {
          if (st.phase === 'pull') {
            const fronts = asmLeft().map(l => l.front);
            const b = bodyAt(p, fronts, 6);
            if (b) { startPull(b, p); return; }
            const f = bodyAt(p, T.layers.filter(l => l.type === 'fact').map(l => l.body), 0);
            if (f) { refuseFact(f); return; }
            if (bodyAt(p, [T.cap], 0) && !st.said.cap) { st.said.cap = true; say(glitch, L(LINES.cap), { mood: 'think', ms: 2600 }); SND.nope(); }
            return;
          }
          if (st.phase === 'rebuild' || st.phase === 'capstep') {
            const list = st.phase === 'capstep' ? [st.fairBody] : st.shelf.filter(b => !b.placed);
            const b = bodyAt(p, list, 8); if (b && !b.tw) startCarry(b, p);
          }
        },
        move: (p) => {
          if (st.drag && !st.kbd) { const wp = toW(p.x, p.y); st.drag.target = st.drag.grabX + (wp.x - st.drag.px0); }
          else if (st.carry) moveCarry(p);
        },
        up: () => {
          if (st.drag && !st.kbd) releasePull();
          else if (st.carry) dropCarry();
        }
      });
      K.onKey(['Enter', 'Space', 'ArrowRight', 'ArrowLeft'], (e) => {
        if (st.kbd) return;
        if (st.phase === 'pull') { const l = nextAsm(); if (!l) return; e.preventDefault(); const b = l.front, s = toS(b.x - M.len * 0.3, b.y); startPull(b, s); st.kbd = { dir: (b.pj && b.pj.dir) || (e.code === 'ArrowLeft' ? -1 : 1), t0: now() }; }
        else if ((st.phase === 'rebuild' || st.phase === 'capstep') && !st.carry) { e.preventDefault(); const b = st.phase === 'capstep' ? st.fairBody : st.shelf.find(x => !x.placed && !x.tw); if (b) { st.carry = { b, ox: 0, oy: 0, vx: 0, lx: b.x, lt: now() }; b.ghost = true; b.x = M.cx; b.y = st.stackTop - b.hh - 40; dropCarry(); } }
      });

      /* ---------------- sliding a block out ---------------- */
      function startPull(b, p) {
        const wp = toW(p.x, p.y);
        const final = asmLeft().length === 1;
        W.setKin(b, true); W.wake();
        b.pj = b.pj || { jAbs: 0, tAcc: 0, dir: 0 };
        st.drag = { b, layer: b.layer, grabX: b.x, px0: wp.x, target: b.x, final, popped: false, acc: 0, upper: W.bodies.filter(o => o.layer > b.layer && o.im) };
        if (final && b.pj.dir) lockDir(b, true);
        st.phase = 'pulling'; K.guide(null);
        SND.grab(); droneOn();
        if (A.ctx && !scrape) scrape = A.loop({ filter: 'bandpass', freq: 650, q: 1.6 });
        const it = b.item;
        setStatus((it.k === 'feel' ? 'Feeling: ' : it.k === 'leap' ? 'Leap: ' : 'Guess: ') + it.text, it.user);
        hudKey.hidden = true;
        if (final && !st.said.last) { st.said.last = true; say(glitch, L(LINES.last), { mood: 'determined', ms: 2600 }); K.later(() => { if (st.phase === 'pulling') say(loopie, L(LINES.lastLoopie), { mood: 'worried', ms: 2200 }); }, 900); }
        ctx.track('st_grab', { final: final ? 1 : 0 });
      }
      function releasePull() {
        // let go mid-pull: the block stays where the hand left it, and the next grab carries on from there
        const d = st.drag; if (!d || d.popped) return;
        st.drag = null; st.kbd = null; d.b.vx = 0; st.phase = 'pull'; hudKey.hidden = false;
        const left = asmLeft().length; setStatus(left + ' assumption' + (left === 1 ? '' : 's') + ' to slide out');
        pullGuide(2200);
      }
      function lockDir(b, final) {
        if (!final || b.stubbed) return;
        // the last assumption: what's behind it is only a stub at the far end, so the top has nothing under it once it's out
        const core = b.core; if (!core) return;
        b.stubbed = true; W.remove(core);
        const sw = Math.round(M.len * 0.3), sx = b.slotX - b.pj.dir * (M.len / 2 - sw / 2 - 3);
        const stub = W.add({ x: sx, y: b.slotY, w: sw, h: M.hgt, dens: 1 / (M.len * M.hgt), kind: 'stub', layer: b.layer, group: b.group });
        stub.spr = sprite('stub', sw, M.hgt, 99); b.core = stub;
      }
      const VMAX = () => M.len * [1.0, 1.25, 1.4][inten];
      const EXC = [0.1, 0.16, 0.22][inten] || 0.16;
      W.pre = (dt) => {
        const d = st.drag; if (!d || d.popped) return;
        const b = d.b, pj = b.pj;
        if (st.kbd) d.target = d.grabX + st.kbd.dir * M.len * 0.62 * clamp((now() - st.kbd.t0) / 1700, 0, 1.3);
        let off = d.target - b.slotX;
        if (!pj.dir && Math.abs(off) > 6) { pj.dir = Math.sign(off); lockDir(b, d.final); }
        if (pj.dir) off = pj.dir > 0 ? Math.max(0, off) : Math.min(0, off); else off = 0;
        const tx = b.slotX + off, vDes = clamp((tx - b.x) * 10, -VMAX(), VMAX());
        const v0 = b.vx;
        b.vx += (vDes - b.vx) * Math.min(1, 16 * dt); b.vy = 0; b.av = 0; b.y = b.slotY; b.a = 0;
        if (pj.dir && (b.x - b.slotX) * pj.dir < 0) { b.x = b.slotX; b.vx = Math.max(0, b.vx * pj.dir) * pj.dir; }
        const acc = (b.vx - v0) / dt;
        if (Math.abs(b.vx) > 2 || Math.abs(acc) > 20) { pj.jAbs += Math.abs(acc) * dt; pj.tAcc += dt; }
        d.acc = acc;
        if (d.final) return;
        // a jerky hand shakes everything above the slot; a smooth one barely stirs it
        const ac = clamp(acc, -4 * M.len, 4 * M.len), span = Math.max(1, T.top - d.layer);
        for (const u of d.upper) {
          if (!u.im) continue;
          const f = 0.35 + 0.65 * (u.layer - d.layer) / span;
          u.vx += ac * EXC * dt * f; u.av += ac * EXC * dt * f * 0.0035 * (u.kind === 'cap' ? 1.6 : 1);
          if (Math.abs(u.a) > 0.08 && u.av * u.a > 0) u.av *= 0.6;
        }
        const sp = Math.abs(b.vx) / M.len;
        if (sp > 0.9) { const r = (sp - 0.9) * 26 * dt * M.hgt; for (const u of d.upper) if (u.im) u.vx += (Math.random() - 0.5) * r; }
      };
      function afterStepPull() {
        const d = st.drag; if (!d || d.popped) return;
        const b = d.b, frac = Math.abs(b.x - b.slotX) / M.len;
        d.frac = frac;
        if (d.final && !st.said.inside && d.upper.some(u => u.kind === 'sq' && u.layer === d.layer + 1 && (Math.abs(u.a) > 0.25 || u.y > b.slotY - M.hgt * 0.6))) { st.said.inside = true; say(loopie, L(LINES.inside), { mood: 'surprised', ms: 2000 }); }
        if (frac >= 0.72) popOut(d);
      }
      function pullSounds() {
        // once a frame: the wood scrape follows the slide, the held-breath drone follows the tremor
        const d = st.drag;
        if (!d) { if (scrape) scrape.level(0.0001, 0.08); if (drone) drone.set(0.0001, 0); return; }
        const b = d.b, frac = d.frac || 0;
        if (scrape) { scrape.level(clamp(Math.abs(b.vx) / VMAX(), 0, 1) * 0.11 + 0.0001, 0.05); scrape.freq(500 + Math.abs(b.vx) / M.len * 500, 0.08); }
        if (drone) drone.set(0.008 + st.tremor * 0.035 + frac * 0.02, frac);
      }
      function steadiness(pj) {
        const J = pj.jAbs / Math.max(0.35, pj.tAcc) / M.len;    // mean |acceleration| in block lengths per s²
        return clamp(1 - Math.max(0, J - 1.4) / 5, 0.25, 1);
      }
      function popOut(d) {
        const b = d.b, item = b.item, dir = b.pj.dir || 1;
        d.popped = true; st.drag = null; st.kbd = null;
        W.setKin(b, false); b.ghost = true; b.gone = now();
        b.vx = dir * (0.7 * M.len + Math.abs(b.vx)); b.vy = -0.55 * M.len; b.av = dir * 2.4;
        item.removed = true; st.removed++;
        if (b.lab) b.lab.classList.remove('on');
        const sc = steadiness(b.pj); st.steady.push(sc);
        SND.out(st.removed - 1);
        const ex = toS(b.slotX + dir * M.len * 0.5, b.slotY);
        P.emit('dust', ex.x, ex.y, 10, { colors: ['rgba(230,205,160,0.7)', 'rgba(255,240,210,0.55)'], speed: [20, 90] });
        const pct = Math.round(sc * 100);
        popTag(pct >= 85 ? 'Silky · ' + pct + '% steady' : pct >= 60 ? 'Steady · ' + pct + '%' : 'Out · ' + pct + '% steady', ex.x - dir * 40, ex.y - M.hgt * 0.9, pct >= 85);
        ctx.track('st_out', { steady: pct, final: d.final ? 1 : 0 });
        hudKey.hidden = false;
        if (d.final) { startCrash(); return; }
        st.phase = 'pull';
        const left = asmLeft().length;
        setStatus(left + ' assumption' + (left === 1 ? '' : 's') + ' left');
        if (st.removed === 1) { say(glitch, L(LINES.out1), { mood: 'smug', ms: 3000 }); K.later(() => { if (st.phase === 'pull' || st.phase === 'pulling') say(loopie, L(LINES.loopieOut), { mood: gentleTone ? 'calm' : 'silly', ms: 2400 }); }, 2400); }
        else { say(glitch, L(LINES.outN), { mood: 'think', ms: 2400 }); }
        loopie.base(st.removed >= NA - 1 ? 'worried' : 'neutral');
        pullGuide(1600);
      }
      function refuseFact(f) {
        st.fact = f; st.factT = now(); SND.nope();
        if (!st.said.fact || now() - st.said.factT > 9000) { st.said.fact = true; st.said.factT = now(); say(glitch, L(LINES.fact), { mood: 'determined', ms: 2800 }); }
        const s = toS(f.x, f.y - f.hh); popTag('Fact · it stays', s.x, s.y - 18, true);
        ctx.track('st_fact', {});
        pullGuide(1800);
      }
      function pullGuide(delay) {
        const l = nextAsm(); if (!l || (st.phase !== 'pull' && st.phase !== 'pulling')) return;
        const b = l.front;
        K.guide({ id: 'pull' + st.removed, g: 'drag', target: () => toS(b.x - M.len * 0.28, b.y), dx: M.len * 0.55 * M.s, dy: 0, label: 'SLIDE IT OUT SLOWLY', place: toS(b.x, b.y).y > M.H * 0.5 ? 'above' : 'below', delay: delay || 900, ms: 2600 });
      }

      /* ---------------- the twist: the topple ---------------- */
      function startCrash() {
        if (st.crashed) return;
        st.crashed = true; st.phase = 'crash'; st.crashT = now(); K.guide(null);
        st.timeScale = K.reduced() ? 0.6 : 0.3; st.slowUntil = now() + (K.reduced() ? 900 : 2200);
        MUS.vol = 0; SND.topple(); W.wake();
        hudKey.hidden = true; setStatus(st.early ? 'It came down early' : 'Down it comes');
        say(loopie, L(st.early ? LINES.early : LINES.topple), { mood: gentleTone ? 'surprised' : 'cry', ms: 2400 });
        if (!gentleTone && !st.early) loopie.react('shake');
        meter.classList.add('dim');
        // if the top is somehow still balanced, the faintest nudge
        K.later(() => { if (T.cap && Math.abs(T.cap.y - T.capY0) < M.hgt * 0.4 && Math.abs(T.cap.a) < 0.06) { W.wake(); W.bodies.forEach(b => { if (b.im && b.layer > 0) { b.vx += M.hgt * 1.4 * (b.layer / Math.max(1, T.top)); b.av += 0.4; } }); } }, K.reduced() ? 800 : 1700);
        ctx.track('st_crash', { early: st.early ? 1 : 0 });
      }
      function checkEarly() {
        if (st.crashed || !T.cap || (st.phase !== 'pull' && st.phase !== 'pulling')) return;
        if (Math.abs(T.cap.a) > 0.6 || T.cap.y > T.capY0 + M.hgt * 2.2) {
          // the top came down before the last assumption was out (a bump, a yank): carry on to the rebuild all the same
          st.early = asmLeft().length > 1;
          if (st.drag) { const d = st.drag; d.popped = true; st.drag = null; st.kbd = null; W.setKin(d.b, false); d.b.ghost = true; d.b.gone = now(); if (d.b.lab) d.b.lab.classList.remove('on'); }
          asmLeft().forEach(l => { l.item.removed = true; if (l.front.kin) { W.setKin(l.front, false); } });
          startCrash();
        }
      }

      /* ---------------- rebuild: the facts float out of the rubble ---------------- */
      st.shelf = [];
      function gatherFacts() {
        st.phase = 'gather'; setStatus('The facts held');
        W.bodies.forEach(b => { if (b.kind === 'table') return; if (b.kind !== 'fact') { b.fade = now(); b.ghost = true; } });
        const fb = T.layers.filter(l => l.type === 'fact').map(l => l.body);
        const shelfTop = M.phone ? 176 : 140;
        fb.forEach((b, i) => {
          W.setKin(b, true); b.ghost = true;
          let a0 = b.a % TAU; if (a0 > Math.PI) a0 -= TAU; if (a0 < -Math.PI) a0 += TAU;
          b.a = a0;
          b.slot = { x: M.cx, y: shelfTop + M.hgt / 2 + i * (M.hgt + 16) };
          tween(b, b.slot.x, b.slot.y, 0, 950, 160 * i);
          if (b.lab) b.lab.classList.add('on');
          b.glow = 1;
        });
        st.shelf = fb.slice().reverse();   // the lowest waiting block goes first
        SND.float(); SND.sweep();
      }
      const TW = [];
      function tween(b, x1, y1, a1, ms, delay, done) {
        b.tw = { x0: b.x, y0: b.y, a0: b.a, x1, y1, a1, t0: now() + (delay || 0), ms: K.reduced() ? Math.min(ms, 300) : ms, done };
        if (!TW.includes(b)) TW.push(b);
      }
      function runTweens() {
        for (let i = TW.length - 1; i >= 0; i--) {
          const b = TW[i], w = b.tw; if (!w) { TW.splice(i, 1); continue; }
          const k = clamp((now() - w.t0) / w.ms, 0, 1); if (now() < w.t0) continue;
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, lift = Math.sin(k * Math.PI) * (w.arc || 0);
          b.x = w.x0 + (w.x1 - w.x0) * e; b.y = w.y0 + (w.y1 - w.y0) * e - lift; b.a = w.a0 + (w.a1 - w.a0) * e;
          if (k >= 1) { b.tw = null; TW.splice(i, 1); if (w.done) w.done(); }
        }
      }
      function startCarry(b, p) {
        const wp = toW(p.x, p.y);
        st.carry = { b, ox: wp.x - b.x, oy: wp.y - b.y, vx: 0, lx: wp.x, lt: now() };
        b.ghost = true; K.guide(null); SND.lift();
        if (!st.said.carry) { st.said.carry = true; }
      }
      function moveCarry(p) {
        const c = st.carry, wp = toW(p.x, p.y), t = now(), dt = Math.max(1, t - c.lt);
        c.vx = c.vx * 0.7 + ((wp.x - c.lx) / dt * 1000) * 0.3; c.lx = wp.x; c.lt = t;
        const b = c.b; b.x = wp.x - c.ox; b.y = Math.min(wp.y - c.oy, st.stackTop - b.hh - 2); b.a = clamp(c.vx * 0.00035, -0.22, 0.22);
      }
      function dropCarry() {
        const c = st.carry; if (!c) return; st.carry = null;
        const b = c.b, tol = 0.5 * M.len, off = Math.abs(b.x - M.cx);
        if (off < tol) {
          const prec = clamp(1 - off / tol, 0, 1); st.prec.push(prec);
          const y1 = st.stackTop - b.hh - 1.5;
          tween(b, M.cx, y1, 0, 170, 0, () => landed(b, prec));
          st.stackTop -= b.hh * 2;
        } else {
          K.sfx.soft();
          tween(b, b.slot ? b.slot.x : M.cx, b.slot ? b.slot.y : M.top, 0, 380, 0, () => { b.ghost = true; });
          guideNext(1200);
        }
      }
      function landed(b, prec) {
        b.placed = true; b.ghost = false; b.glow = 0; W.setKin(b, false); W.wake(); b.vy = 30;
        const i = st.placed++;
        SND.place(i);
        const s = toS(b.x, b.y + b.hh);
        P.emit('dust', s.x - b.hw * M.s * 0.8, s.y, 6, { colors: ['rgba(230,210,170,0.6)'], speed: [10, 50] }); P.emit('dust', s.x + b.hw * M.s * 0.8, s.y, 6, { colors: ['rgba(230,210,170,0.6)'], speed: [10, 50] });
        popTag(prec >= 0.85 ? 'Dead centre' : prec >= 0.55 ? 'Snug' : 'Placed', s.x, s.y - b.hh * 2 * M.s - 16, prec >= 0.85);
        ctx.track('st_place', { prec: Math.round(prec * 100), cap: b.kind === 'fair' ? 1 : 0 });
        if (b.kind === 'fair') { st.capDone = true; return; }
        setStatus('Rebuild with facts · ' + st.placed + '/' + F);
        if (st.placed === 1) say(loopie, L(LINES.loopieShort), { mood: 'happy', ms: 2600 });
        if (st.placed < F) guideNext(900);
      }
      function guideNext(delay) {
        if (st.phase === 'capstep') { const b = st.fairBody; if (!b) return; K.guide({ id: 'cap', g: 'drag', target: () => toS(b.x, b.y), dx: 0, dy: Math.max(40, (st.stackTop - b.hh - b.y) * M.s), label: 'PLACE THE FAIR THOUGHT', place: 'above', delay: delay || 800, ms: 2400 }); return; }
        const b = st.shelf.find(x => !x.placed && !x.tw); if (!b) return;
        K.guide({ id: 'stack' + st.placed, g: 'drag', target: () => toS(b.x, b.y), dx: 0, dy: Math.max(40, (st.stackTop - b.hh - b.y) * M.s), label: 'DRAG IT ONTO THE STACK', place: 'above', delay: delay || 800, ms: 2400 });
      }

      /* ---------------- render ---------------- */
      function renderBg(target, morn) {
        const Wd0 = M.W, Hd0 = M.H, d = cv.dpr || 1, br = bright(), yT = M.yTs;
        target.width = Math.max(2, Math.round(Wd0 * d)); target.height = Math.max(2, Math.round(Hd0 * d));
        const g = target.getContext('2d', { alpha: false }); g.setTransform(d, 0, 0, d, 0, 0);
        const R = rng(911 + K.daily() % 53);
        const w0 = br ? table.wallB : table.wallD;
        // wall
        let gr = g.createLinearGradient(0, 0, 0, yT);
        gr.addColorStop(0, morn ? mixHex(w0[0], br ? '#fff1d6' : '#3a3550', 0.35) : w0[0]); gr.addColorStop(1, morn ? mixHex(w0[1], br ? '#ffe2b8' : '#5a4458', 0.35) : w0[1]);
        g.fillStyle = gr; g.fillRect(0, 0, Wd0, Hd0);
        // wallpaper
        g.globalAlpha = br ? 0.07 : 0.06; g.fillStyle = br ? '#5a6a50' : '#d8f0ea'; g.strokeStyle = g.fillStyle;
        if (table.paper === 'stripe') for (let x = 0; x < Wd0; x += 26) g.fillRect(x, 0, 9, yT);
        else if (table.paper === 'diamond') { g.lineWidth = 1; for (let y = 0; y < yT; y += 30) for (let x = (y / 30) % 2 ? 15 : 0; x < Wd0; x += 30) { g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y); g.lineTo(x, y + 7); g.lineTo(x - 6, y); g.closePath(); g.fill(); } }
        else if (table.paper === 'boards') { g.lineWidth = 2; for (let x = 0; x < Wd0; x += 54) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, yT); g.stroke(); } }
        else { g.lineWidth = 1; for (let y = yT * 0.55; y < yT; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(Wd0, y); g.stroke(); } for (let y = yT * 0.55, r2 = 0; y < yT; y += 22, r2++) for (let x = r2 % 2 ? 22 : 0; x < Wd0; x += 44) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } }
        g.globalAlpha = 1;
        // window: night outside, morning in the finale
        const wx = M.phone ? Wd0 - 96 : Math.min(Wd0 - 280, M.sx + M.len * M.s / 2 + 150), wy = M.phone ? 168 : 150, ww = M.phone ? 150 : 230, wh = M.phone ? 230 : Math.min(300, yT - 330);
        if (wh > 120) {
          gr = g.createLinearGradient(0, wy, 0, wy + wh);
          if (morn) { gr.addColorStop(0, br ? '#8fd0ff' : '#f6b98a'); gr.addColorStop(0.6, br ? '#ffe9b8' : '#ffd9a0'); gr.addColorStop(1, br ? '#fff6dc' : '#ffefc8'); }
          else if (br) { gr.addColorStop(0, '#6fb6ea'); gr.addColorStop(1, '#cfe9fa'); }
          else { gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#2a2d5c'); }
          g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
          if (!morn && !br) { g.fillStyle = '#ffffff'; for (let i = 0; i < 26; i++) { g.globalAlpha = 0.3 + R() * 0.6; g.fillRect(wx + R() * ww, wy + R() * wh * 0.7, 1.3, 1.3); } g.globalAlpha = 1; g.fillStyle = '#f4f1ff'; g.beginPath(); g.arc(wx + ww * 0.62, wy + wh * 0.24, 13, 0, TAU); g.fill(); g.fillStyle = '#0f1736'; g.beginPath(); g.arc(wx + ww * 0.62 + 6, wy + wh * 0.24 - 3, 12, 0, TAU); g.fill(); }
          if (morn) { const sg = g.createRadialGradient(wx + ww * 0.35, wy + wh * 0.62, 2, wx + ww * 0.35, wy + wh * 0.62, ww * 0.7); sg.addColorStop(0, 'rgba(255,250,225,1)'); sg.addColorStop(0.2, 'rgba(255,236,170,0.8)'); sg.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = sg; g.fillRect(wx, wy, ww, wh); }
          // hills / roofs on the horizon
          g.fillStyle = morn ? (br ? '#9fc6a0' : '#b98a78') : br ? '#8fbf9a' : '#141838'; g.beginPath(); g.moveTo(wx, wy + wh); for (let x = 0; x <= ww; x += 10) g.lineTo(wx + x, wy + wh * 0.84 - Math.sin(x * 0.05 + 1) * 8 - Math.sin(x * 0.13) * 4); g.lineTo(wx + ww, wy + wh); g.closePath(); g.fill();
          // frame and mullions
          const fc = br ? '#8a6a48' : '#3a2a20';
          g.fillStyle = fc; g.fillRect(wx - 8, wy - 8, ww + 16, 8); g.fillRect(wx - 8, wy + wh, ww + 16, 10); g.fillRect(wx - 8, wy, 8, wh); g.fillRect(wx + ww, wy, 8, wh); g.fillRect(wx + ww / 2 - 3, wy, 6, wh); g.fillRect(wx, wy + wh * 0.5 - 3, ww, 6);
          g.fillStyle = mixHex(fc, '#ffffff', 0.15); g.fillRect(wx - 12, wy + wh + 6, ww + 24, 6);
          // something on the sill (today's table), and a cat for regulars
          const sx0 = wx + 18, sy0 = wy + wh;
          if (table.sill === 'plant') { g.fillStyle = '#b5653c'; g.fillRect(sx0, sy0 - 16, 18, 16); g.fillStyle = br ? '#4f8f4a' : '#2f5a36'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(sx0 + 9 + (k - 2) * 5, sy0 - 22 - (k % 2) * 6, 4, 9, (k - 2) * 0.35, 0, TAU); g.fill(); } }
          else if (table.sill === 'books') { ['#7a2e2e', '#2e4a7a', '#7a6a2e'].forEach((c, k) => { g.fillStyle = c; g.fillRect(sx0 + k * 9, sy0 - 26 + k * 2, 8, 26 - k * 2); }); }
          else if (table.sill === 'jar') { g.fillStyle = 'rgba(200,230,240,0.55)'; rr(g, sx0, sy0 - 24, 18, 24, 4); g.fill(); g.fillStyle = '#8a6a48'; g.fillRect(sx0 + 2, sy0 - 27, 14, 4); }
          else { g.fillStyle = '#f2ece4'; rr(g, sx0, sy0 - 14, 16, 14, 3); g.fill(); g.strokeStyle = '#f2ece4'; g.lineWidth = 2; g.beginPath(); g.arc(sx0 + 18, sy0 - 8, 4, -1.2, 1.2); g.stroke(); }
          if (visits >= 2) { const cx0 = wx + ww - 40, cy0 = sy0; g.fillStyle = br ? '#5a4a40' : '#0e0c10'; g.beginPath(); g.ellipse(cx0, cy0 - 9, 17, 9, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(cx0 + 14, cy0 - 14, 7, 0, TAU); g.fill(); g.beginPath(); g.moveTo(cx0 + 9, cy0 - 19); g.lineTo(cx0 + 11, cy0 - 26); g.lineTo(cx0 + 14, cy0 - 20); g.moveTo(cx0 + 15, cy0 - 20); g.lineTo(cx0 + 19, cy0 - 26); g.lineTo(cx0 + 20, cy0 - 18); g.fill(); g.strokeStyle = g.fillStyle; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx0 - 16, cy0 - 4); g.quadraticCurveTo(cx0 - 30, cy0 - 2, cx0 - 26, cy0 + 6); g.stroke(); }
        }
        // a pendant lamp over the tower (desktop) or a warm pool of light (phone), off in the morning
        if (!morn) {
          const lx = M.sx, ly = M.phone ? 0 : 92;
          if (!M.phone) { g.strokeStyle = br ? '#5a4a40' : '#0c0a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, ly - 18); g.stroke(); g.fillStyle = br ? '#3f5a4f' : '#26453c'; g.beginPath(); g.moveTo(lx - 34, ly + 4); g.quadraticCurveTo(lx, ly - 34, lx + 34, ly + 4); g.closePath(); g.fill(); g.fillStyle = '#fff2c8'; g.beginPath(); g.ellipse(lx, ly + 4, 13, 5, 0, 0, TAU); g.fill(); }
          if (!br) {
            g.save(); g.globalCompositeOperation = 'lighter';
            const r0 = M.phone ? (yT - 120) * 0.75 : yT * 0.7, gy = M.phone ? yT * 0.45 : ly;
            const lg = g.createRadialGradient(lx, gy, 4, lx, M.phone ? gy : yT * 0.55, r0); lg.addColorStop(0, 'rgba(255,214,150,0.32)'); lg.addColorStop(0.5, 'rgba(255,190,120,0.1)'); lg.addColorStop(1, 'rgba(255,190,120,0)');
            g.fillStyle = lg; g.fillRect(0, 0, Wd0, yT);
            if (!M.phone) { const cg = g.createLinearGradient(0, ly, 0, yT); cg.addColorStop(0, 'rgba(255,226,170,0.16)'); cg.addColorStop(1, 'rgba(255,226,170,0.03)'); g.fillStyle = cg; g.beginPath(); g.moveTo(lx - 20, ly + 4); g.lineTo(lx + 20, ly + 4); g.lineTo(lx + M.len * 0.85, yT); g.lineTo(lx - M.len * 0.85, yT); g.closePath(); g.fill(); }
            g.restore();
          }
        }
        // wainscot behind the table
        g.fillStyle = br ? 'rgba(90,70,50,0.08)' : 'rgba(0,0,0,0.18)'; g.fillRect(0, yT - 70, Wd0, 70);
        g.fillStyle = br ? 'rgba(90,70,50,0.18)' : 'rgba(255,255,255,0.05)'; g.fillRect(0, yT - 72, Wd0, 3);
        // the table: top, edge, legs, floor
        const top = table.top, edge = table.edge;
        g.fillStyle = br ? '#b8a48a' : '#0d0a0c'; g.fillRect(0, yT + 40, Wd0, Hd0 - yT - 40);
        gr = g.createLinearGradient(0, yT + 40, 0, Hd0); gr.addColorStop(0, br ? '#cbb89c' : '#1a1416'); gr.addColorStop(1, br ? '#a8957a' : '#08060a'); g.fillStyle = gr; g.fillRect(0, yT + 40, Wd0, Hd0 - yT - 40);
        g.fillStyle = table.leg; [0.12, 0.88].forEach(u => { g.fillRect(Wd0 * u - 9, yT + 20, 18, Hd0 - yT); });
        gr = g.createLinearGradient(0, yT - 2, 0, yT + 34); gr.addColorStop(0, mixHex(top, '#ffffff', 0.18)); gr.addColorStop(0.18, top); gr.addColorStop(0.3, edge); gr.addColorStop(1, mixHex(edge, '#000000', 0.35));
        g.fillStyle = gr; g.fillRect(0, yT - 2, Wd0, 36);
        if (table.marble) { g.strokeStyle = 'rgba(140,130,120,0.35)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); let x = R() * Wd0; g.moveTo(x, yT); for (let k = 0; k < 6; k++) { x += 10 + R() * 30; g.lineTo(x, yT + R() * 8); } g.stroke(); } }
        else { g.strokeStyle = rgba('#000000', 0.12); g.lineWidth = 1; for (let i = 0; i < 4; i++) { const y = yT + 10 + i * 5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= Wd0; x += 30) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 1.2); g.stroke(); } }
        if (table.inlay) { g.fillStyle = table.inlay; g.fillRect(0, yT + 3, Wd0, 4); }
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, yT - 2, Wd0, 1.5);
      }
      const shadowSpr = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 16, 2, 64, 16, 64); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.save(); x.scale(1, 0.25); x.fillRect(0, 0, 128, 128); x.restore(); return c; })();
      let beam = null;
      function beamSprite() {
        // the morning sunbeam: a soft slanted shaft from the window to the new tower (made once)
        const Wd0 = M.W, Hd0 = M.H, c = document.createElement('canvas'); c.width = Math.max(2, Math.round(Wd0 / 2)); c.height = Math.max(2, Math.round(Hd0 / 2));
        const g = c.getContext('2d'); g.scale(0.5, 0.5);
        const wx = M.phone ? Wd0 - 96 : Math.min(Wd0 - 280, M.sx + M.len * M.s / 2 + 150), wy = M.phone ? 168 : 150, ww = M.phone ? 150 : 230, wh = M.phone ? 230 : Math.min(300, M.yTs - 330);
        const tx = M.sx, ty = M.yTs, spread = M.len * M.s * 0.75;
        for (let k = 0; k < 6; k++) {
          const f = 1 - k * 0.14, gr = g.createLinearGradient(wx + ww / 2, wy, tx, ty);
          gr.addColorStop(0, 'rgba(255,236,180,' + (0.12 * f) + ')'); gr.addColorStop(1, 'rgba(255,220,150,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(wx + ww * (0.1 + k * 0.02), wy + wh * 0.1); g.lineTo(wx + ww * (0.9 - k * 0.02), wy + wh * 0.3);
          g.lineTo(tx + spread * (0.9 - k * 0.1), ty + 10); g.lineTo(tx - spread * (0.9 - k * 0.1) - 60, ty - 30); g.closePath(); g.fill();
        }
        return { c, wx, wy, ww, wh, tx, ty, spread };
      }
      const scanSpr = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(90,230,255,0)'); gr.addColorStop(0.5, 'rgba(150,245,255,0.85)'); gr.addColorStop(1, 'rgba(90,230,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 8, 64); return c; })();

      let tPrev = 0, simAcc = 0;
      const DT = 1 / 120;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.W) { tPrev = t; return; }
        if (SOFT && tPrev && t - tPrev < 0.03) return;
        const dt = tPrev ? Math.min(0.25, Math.max(0, t - tPrev)) : dt0;
        tPrev = t;
        st.fn++; if (dt > 0.034) st.slowN++;
        if (st.fn >= 90) { if (st.slowN > 22 && st.q > 0.6) { st.q = st.q > 0.85 ? 0.75 : 0.6; cv.setQuality(st.q); bgOK = false; } st.fn = 0; st.slowN = 0; }
        const key = M.W + 'x' + M.H + (bright() ? 'b' : 'd') + (cv.dpr || 1);
        if (!bgOK || key !== bgKey) { renderBg(bg, false); if (st.morning > 0) renderBg(bgM, true); bgOK = true; bgKey = key; beam = null; }
        musicTick();
        update(dt, t);
        draw(g, t, dt);
        placeLabels(t);
        drawMeter();
      });
      function update(dt, t) {
        // slow motion through the topple, then real time again
        if (st.timeScale < 1 && now() > st.slowUntil) st.timeScale = Math.min(1, st.timeScale + dt * 1.1);
        simAcc += dt * st.timeScale; let n = Math.floor(simAcc / DT); simAcc -= n * DT; n = Math.min(n, 30);
        for (let i = 0; i < n; i++) {
          if (W.sleeping) break;
          W.step(DT);
          afterStepPull();
        }
        pullSounds();
        runTweens();
        // fade the rubble that isn't a fact
        for (let i = W.bodies.length - 1; i >= 0; i--) { const b = W.bodies[i]; if (b.fade) { b.alpha = clamp(1 - (now() - b.fade) / 600, 0, 1); if (b.alpha <= 0) { W.remove(b); if (b.lab) b.lab.remove(); } } else if (b.gone && now() - b.gone > 1400) { b.alpha = clamp(1 - (now() - b.gone - 1400) / 500, 0, 1); if (b.alpha <= 0) { W.remove(b); if (b.lab) b.lab.remove(); } } }
        // sleep when everything is still
        if (!W.sleeping) {
          let mv = 0; for (const b of W.bodies) if (b.im) { const v = Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.av) * 40; if (v > mv) mv = v; }
          if (mv < 5 && !st.drag && !TW.length) { W.calm += dt; if (W.calm > 0.45) { W.sleeping = true; W.bodies.forEach(b => { b.vx = 0; b.vy = 0; b.av = 0; }); } } else W.calm = 0;
        }
        // impacts: wood on wood, dust, a camera bump on the big ones
        if (W.impacts.length) {
          let k = 0;
          for (const im of W.impacts) {
            if (k++ > 5) break;
            const big = im.b1.kind === 'table' ? im.b2 : im.b1, sz = clamp((big.bw * big.bh) / (M.len * M.hgt), 0, 1.3), s = toS(im.x, im.y);
            if (im.v > 70) SND.clack(im.v, sz, clamp((s.x / M.W) * 1.6 - 0.8, -0.8, 0.8));
            if (im.v > 260) P.emit('dust', s.x, s.y, Math.round(clamp(im.v / 90, 3, 12)), { colors: ['rgba(225,200,160,0.65)', 'rgba(255,240,215,0.5)'], speed: [20, 110] });
            if (im.v > 520 && !K.reduced()) st.shake = Math.max(st.shake, Math.min(7, im.v / 160));
          }
          W.impacts.length = 0;
        }
        // tremor: how much the blocks above are moving, plus how jerky the hand is
        let wob = 0;
        if (st.drag && !st.drag.final) { for (const u of st.drag.upper) wob += Math.abs(u.av) * 2.5 + Math.abs(u.vx) / (M.hgt * 4); wob += Math.abs(st.drag.acc || 0) / (M.len * 7); }
        else if (st.phase === 'pull') for (const b of W.bodies) if (b.im && b.layer > 0) wob += Math.abs(b.av) * 2 + Math.abs(b.vx) / (M.hgt * 5);
        st.tremor += (clamp(wob, 0, 1) - st.tremor) * Math.min(1, dt * 7);
        if (st.drag && !st.drag.final) {
          if (st.tremor > 0.42) { SND.creak(st.tremor); if (!st.said.careful) { st.said.careful = true; say(loopie, L(LINES.careful), { mood: 'worried', moodMs: 1600, ms: 1800 }); } else loopie.face('worried', 900); }
          if (st.tremor > 0.6 && !st.said.slow) { st.said.slow = true; K.later(() => say(glitch, L(LINES.slow), { mood: 'think', ms: 2000 }), 600); }
        }
        if (st.fn % 2 === 0) { MEM.push(st.tremor); if (MEM.length > 70) MEM.shift(); }
        if (st.phase === 'pull' || st.phase === 'pulling') checkEarly();
        P.update(dt);
        st.shake = Math.max(0, st.shake - dt * 18);
        void t;
      }
      function swayOf(b, t) {
        if (st.phase !== 'pull' && st.phase !== 'pulling' && st.phase !== 'scan') return 0;
        if (b.kind === 'table' || b.layer < 1 || (st.drag && b === st.drag.b)) return 0;
        const amp = (0.35 + 2.2 * st.removed / Math.max(1, NA) + st.tremor * 4) * (M.hgt / 50), u = b.layer / Math.max(1, T.top);
        return Math.sin(t * 2.1 + 0.4) * amp * u * u;
      }
      function draw(g, t, dt) {
        const Wd0 = M.W, Hd0 = M.H, br = bright(), d = cv.dpr || 1;
        g.setTransform(d, 0, 0, d, 0, 0);
        let ox = 0, oy = 0; if (st.shake > 0.2 && !K.reduced()) { ox = (Math.random() - 0.5) * st.shake; oy = (Math.random() - 0.5) * st.shake; }
        g.drawImage(bg, 0, 0, Wd0, Hd0);
        if (st.morning > 0) { if (!bgM.width || bgM.width < 4) renderBg(bgM, true); g.globalAlpha = st.morning; g.drawImage(bgM, 0, 0, Wd0, Hd0); g.globalAlpha = 1; }
        g.translate(ox, oy);
        // soft contact shadow under whatever sits on the table near the middle
        g.globalAlpha = 0.55; g.drawImage(shadowSpr, M.sx - M.len * M.s * 0.72, M.yTs - 7, M.len * M.s * 1.44, 18); g.globalAlpha = 1;
        // the sunbeam behind the tower in the finale
        if (st.finT) {
          if (!beam) beam = beamSprite();
          const k = clamp((now() - st.finT) / 1800, 0, 1);
          g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter'; g.globalAlpha = k * (br ? 0.75 : 0.9); g.drawImage(beam.c, 0, 0, Wd0, Hd0); g.restore();
          if (Math.random() < dt * 9) { const u = Math.random(), x = beam.wx + beam.ww / 2 + (beam.tx - beam.wx - beam.ww / 2) * u + (Math.random() - 0.5) * 90 * (0.4 + u), y = beam.wy + beam.wh * 0.2 + (beam.ty - beam.wy) * u; P.emit('mote', x, y, 1, { colors: ['#fff3c4', '#ffe0a0', '#fffbe6'], speed: [3, 12] }); }
          // the new tower glows
          const gl = K.glowSprite(br ? '#ffd27a' : '#ffcf7a'), gh = (M.yTs - toS(0, st.stackTop).y) + 60;
          g.globalAlpha = k * (br ? 0.35 : 0.6); g.drawImage(gl, M.sx - M.len * M.s, M.yTs - gh - 30, M.len * M.s * 2, gh + 60); g.globalAlpha = 1;
        }
        // blocks: the hidden cores first, then everything else
        const s0 = M.s;
        const drawBody = (b) => {
          if (!b.spr || b.kind === 'table') return;
          const sw = swayOf(b, t), p = toS(b.x, b.y), c = Math.cos(b.a) * s0, s = Math.sin(b.a) * s0;
          let shiver = 0; if (b === st.fact && now() - st.factT < 320) shiver = Math.sin((now() - st.factT) * 0.09) * 2.2 * (1 - (now() - st.factT) / 320);
          g.setTransform(d * c, d * s, -d * s, d * c, d * (p.x + sw + ox + shiver), d * (p.y + oy));
          g.globalAlpha = b.alpha * (b.kind === 'core' || b.kind === 'stub' ? 0.92 : 1);
          g.drawImage(b.spr, -b.hw, -b.hh, b.hw * 2, b.hh * 2);
          if (b.glow) { g.globalAlpha = 0.35 + 0.2 * Math.sin(t * 3 + b.id); g.drawImage(K.glowSprite('#ffe9a8'), -b.hw * 1.15, -b.hh * 2.2, b.hw * 2.3, b.hh * 4.4); }
        };
        for (const b of W.bodies) if (b.kind === 'core' || b.kind === 'stub') drawBody(b);
        for (const b of W.bodies) if (b.kind !== 'core' && b.kind !== 'stub' && !(st.carry && st.carry.b === b)) drawBody(b);
        for (const b of st.shelf) if (!W.bodies.includes(b)) drawBody(b);
        if (st.fairBody && !W.bodies.includes(st.fairBody)) drawBody(st.fairBody);
        if (st.carry) drawBody(st.carry.b);
        g.globalAlpha = 1; g.setTransform(d, 0, 0, d, 0, 0); g.translate(ox, oy);
        // the inspection scan
        if (st.scanT) {
          const k = (now() - st.scanT) / 1700;
          if (k >= 0 && k <= 1.05) { const yTop = toS(0, T.capY0 - T.cap.hh).y, y = M.yTs + (yTop - M.yTs - 10) * clamp(k, 0, 1), x0 = M.sx - M.len * M.s * 0.62; g.globalAlpha = 0.95; g.drawImage(scanSpr, x0, y - 18, M.len * M.s * 1.24, 36); g.globalAlpha = 0.18; g.fillStyle = '#7fe8ff'; g.fillRect(x0, y, M.len * M.s * 1.24, M.yTs - y); g.globalAlpha = 1; }
        }
        P.draw(g);
        g.setTransform(d, 0, 0, d, 0, 0);
      }
      function placeLabels(t) {
        for (const b of LABS) {
          const lab = b.lab; if (!lab || !lab.isConnected) continue;
          const sw = swayOf(b, t), p = toS(b.x, b.y), c = Math.abs(Math.cos(b.a)), s = Math.abs(Math.sin(b.a));
          const ex = (b.hw * c + b.hh * s) * M.s, ey = (b.hw * s + b.hh * c) * M.s;
          const off = p.x - ex < 2 || p.x + ex > M.W - 2 || p.y - ey < 0 || p.y + ey > M.H || b.alpha < 0.6;
          const k = (off ? 'x' : '') + Math.round((p.x + sw) * 2) + ':' + Math.round(p.y * 2) + ':' + Math.round(b.a * 500) + ':' + Math.round(M.s * 100);
          if (k === lab.st.k) continue; lab.st.k = k;
          lab.classList.toggle('off', off);
          if (!off) lab.style.transform = 'translate(' + (p.x + sw - b.hw).toFixed(1) + 'px,' + (p.y - b.hh).toFixed(1) + 'px) rotate(' + b.a.toFixed(3) + 'rad) scale(' + M.s.toFixed(3) + ')';
        }
      }
      function drawMeter() {
        const g = mcv.g; if (!g || !mcv.w) return;
        const w = mcv.w, hh = mcv.h, br = bright();
        mcv.clear();
        g.strokeStyle = br ? 'rgba(60,40,20,0.12)' : 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
        for (let y = 26; y < hh; y += 9) { g.beginPath(); g.moveTo(6, y); g.lineTo(w - 6, y); g.stroke(); }
        const mid = 26 + (hh - 26) / 2, amp = (hh - 30) / 2;
        g.strokeStyle = br ? '#c2461d' : '#ffcf5a'; g.lineWidth = 1.8; g.lineJoin = 'round'; g.beginPath();
        const n = MEM.length;
        for (let i = 0; i < n; i++) { const x = w - 8 - (n - 1 - i) * ((w - 16) / 69), v = MEM[i], y = mid + Math.sin(i * 2.7 + st.fn * 0.6) * amp * Math.min(1, v * 1.3) + Math.sin(i * 0.9) * 0.6; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
        const lab = st.tremor < 0.12 ? 'Calm' : st.tremor < 0.35 ? 'Light' : st.tremor < 0.6 ? 'Wobbly' : 'Shaky';
        if (meterVal.textContent !== lab) meterVal.textContent = lab;
      }

      /* ---------------- the flow ---------------- */
      const waitFor = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 60000)) await K.wait(80); };
      async function scan() {
        st.phase = 'scan'; setStatus('Inspecting the tower');
        say(glitch, L(noWords ? LINES.scanEx : LINES.scan), { mood: 'scan', ms: 4400 });
        await K.wait(600);
        st.scanT = now();
        const yTop = T.capY0 - T.cap.hh, span = M.yT - yTop;
        const shown = new Set();
        while (now() - st.scanT < 1900) {
          const k = clamp((now() - st.scanT) / 1700, 0, 1), y = M.yT - span * k;
          LABS.forEach((b, i) => { if (!shown.has(b) && b.y >= y - 2) { shown.add(b); b.lab.classList.add('on'); SND.scan(i); if (b.kind === 'fact') b.glow = 1; } });
          await K.wait(40);
        }
        LABS.forEach(b => { b.lab.classList.add('on'); b.glow = 0; });
        st.scanT = 0;
      }
      async function crashSequence() {
        await waitFor(() => (W.sleeping && now() - st.crashT > 2600) || now() - st.crashT > (K.reduced() ? 4200 : 6200), 8000);
        st.timeScale = 1;
        say(glitch, L(st.early ? LINES.early : LINES.hollow), { mood: 'gasp', ms: 2600 });
        await K.wait(K.reduced() ? 1200 : 2300);
        say(glitch, L(LINES.crash), { mood: serious ? 'think' : 'smug', ms: 4200 });
        loopie.base('sad');
        await K.wait(K.reduced() ? 1600 : 2600);
      }
      async function rebuild() {
        gatherFacts();
        await K.wait(K.reduced() ? 600 : 1300);
        say(glitch, L(LINES.gather), { mood: 'happy', ms: 3200 }); loopie.base('neutral');
        W.reset(); W.add({ x: M.cx, y: M.yT + 400, w: 30000, h: 800, fixed: true, fr: 0.9, kind: 'table' });
        st.shelf.forEach(b => { b.layer = -1; W.bodies.push(b); });
        st.stackTop = M.yT; st.phase = 'rebuild'; setStatus('Rebuild with facts · 0/' + F); hudKey.hidden = true;
        MUS.mode = 'calm'; MUS.vol = 0.55; MUS.bpm = 82;
        await waitFor(() => !TW.length, 3000);
        guideNext(700);
        await waitFor(() => st.placed >= F, 600000);
        await K.wait(700);
        // the fair thought: a painted cap sized to its words
        st.phase = 'capstep';
        const capW = Math.round(M.len * 1.06), lab = h('div', { class: 'st-lab fair on', 'aria-hidden': 'true' }, h('small', { text: 'Fair thought' }), h('span', { class: 'st-gen', text: fair }));
        if (plan) lab.append(h('div', { class: 'st-plan' }, h('b', { text: care ? 'Next: ' : 'Plan: ' }), document.createTextNode(plan)));
        Object.assign(lab.style, { width: capW + 'px', height: 'auto', padding: '8px 14px', visibility: 'hidden' }); el.append(lab);
        const capH = Math.round(Math.max(M.hgt * 1.32, lab.offsetHeight + 4));
        lab.style.visibility = '';
        const fb = W.add({ x: M.cx, y: (M.phone ? 168 : 136) - capH, w: capW, h: capH, dens: 0.9 / (M.len * M.hgt), kind: 'fair', layer: -1 });
        W.setKin(fb, true); fb.ghost = true; fb.spr = sprite('fair', capW, capH, 77); fb.glow = 1;
        fb.lab = lab; lab.st = { k: '' }; LABS.push(fb); Object.assign(lab.style, { width: capW + 'px', height: capH + 'px' });
        fb.slot = { x: M.cx, y: (M.phone ? 176 : 140) + capH / 2 };
        tween(fb, fb.slot.x, fb.slot.y, 0, 900, 0);
        st.fairBody = fb; SND.float();
        setStatus('Top it with a fair thought');
        say(glitch, L(LINES.capGo), { mood: 'idea', ms: 3000 });
        await waitFor(() => !fb.tw, 2000);
        guideNext(600);
        await waitFor(() => st.capDone, 600000);
        await waitFor(() => W.sleeping, 2500);
      }
      async function finale() {
        st.phase = 'finale'; K.guide(null); setStatus('Steady');
        meter.classList.remove('dim'); MEM.length = 0; st.tremor = 0;
        renderBg(bgM, true);
        const t0 = now();
        while (now() - t0 < 1400) { st.morning = clamp((now() - t0) / 1400, 0, 1); await K.wait(40); }
        st.morning = 1; st.finT = now();
        MUS.vol = 0.8; MUS.bpm = 88;
        if (A.ctx) { const t = A.now(); A.pad(['C3', 'G3', 'C4', 'E4', 'G4'].map(n => A.note(n)), { dur: 5.5, vol: 0.15, attack: 0.8 }); ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => mallet(A.note(n), t + 0.3 + i * 0.16, 0.09, 'sfx')); A.sync('finale', now()); }
        say(loopie, L(LINES.steady), { mood: 'love', ms: 2600 }); loopie.react('bounce');
        await K.wait(1800);
        say(glitch, L(LINES.fin), { mood: 'celebrate', ms: 0 }); glitch.base('celebrate'); loopie.base('celebrate');
        const top = toS(M.cx, st.stackTop);
        P.emit('star', top.x, top.y - 6, 14, { colors: ['#fff3c4', '#ffe08a', '#ffffff'], speed: [40, 140] });
        await K.wait(K.reduced() ? 1400 : 3200);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true; st.phase = 'done';
        const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
        const pulls = st.steady.length ? st.steady : [0.7], placed = st.prec.length ? st.prec : [0.8];
        const avgS = mean(pulls), avgP = mean(placed), score = clamp(0.65 * avgS + 0.35 * avgP, 0, 1);
        const bestPull = Math.round(Math.max.apply(null, pulls) * 100);
        const tier = K.tier(score, [0.45, 0.7, 0.88]);
        const badges = [];
        if (tier) badges.push(tier + ' builder');
        const b = K.best('steady', bestPull, 'higher');
        if (b.isNew) badges.push('New best: ' + bestPull + '% steady pull'); else if (b.first) badges.push('Steadiest pull: ' + bestPull + '%');
        const ti = tier === 'Gold' ? 3 : tier === 'Silver' ? 2 : tier === 'Bronze' ? 1 : 0;
        if (ti > woodIdx) { S.store.set('shaky-tower:wood', ti); K.collect('Wood: ' + WOODS[ti].key); badges.push('Unlocked: ' + WOODS[ti].key + ' blocks'); }
        const cb = K.collect('Table: ' + table.key); if (cb.isNew) badges.push('Collected: ' + table.key);
        const n = NA;
        const lines = [n + ' assumption' + (n === 1 ? '' : 's') + ' slid out' + (avgS >= 0.8 ? ', steadily' : ''), serious ? 'The facts held; the extra certainty fell' : 'The harsh conclusion fell; every fact held', plan ? 'New top: a fair thought, with a plan' : 'New top: a fair thought'];
        ctx.finish({ title: serious ? 'Built on facts, with a plan' : 'The facts still stand', mood: 'celebrate', lines, share: 'Pulled out the assumptions. The harsh thought fell over.', badges: badges.slice(0, 4) });
      }

      cv.onResize(() => layout());
      S.on('theme', () => { bgOK = false; });
      (async () => {
        await K.intro({ title: 'Shaky Tower', sub: 'A harsh thought sits on top of a tall tower. Some blocks are facts. Some are only assumptions.', how: 'Slide the pale blocks out, slowly. Then rebuild with the facts.', char: 'glitch', mood: 'scan' });
        layout(); MUS.on = true; MUS.next = 0;
        if (A.ctx) { const t = A.now(); ['A3', 'C4', 'E4'].forEach((n, i) => mallet(A.note(n), t + i * 0.09, 0.1, 'sfx')); }
        say(loopie, L(LINES.open), { mood: gentleTone ? 'think' : 'happy', ms: 3200 }); loopie.react('bounce');
        await K.wait(K.reduced() ? 1200 : 2600);
        await scan();
        st.phase = 'pull';
        const left = asmLeft().length;
        setStatus(left + ' assumption' + (left === 1 ? '' : 's') + ' to slide out');
        say(glitch, L(LINES.go), { mood: 'determined', ms: 3000 });
        pullGuide(900);
        await waitFor(() => st.crashed, 1e9);
        await crashSequence();
        await rebuild();
        await finale();
      })();

      return {
        async autoplay() {
          const t1 = now();
          const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(90); };
          await until(() => st.phase === 'pull', 40000);
          while (!st.crashed && now() - t1 < 100000) {
            await until(() => st.phase === 'pull' || st.crashed, 8000);
            if (st.crashed) break;
            await K.wait(450);
            const l = nextAsm(); if (!l) break;
            const b = l.front, a = toS(b.x - M.len * 0.3, b.y), dist = M.len * 0.8 * M.s;
            await K.sim.drag(hit, { x: a.x, y: a.y }, { x: a.x + dist, y: a.y }, 1900, 38);
            await until(() => l.item.removed || st.crashed, 3000);
          }
          await until(() => st.phase === 'rebuild', 30000);
          await until(() => !TW.length, 4000);
          while (st.phase === 'rebuild' && st.placed < F) {
            await K.wait(500);
            const b = st.shelf.find(x => !x.placed && !x.tw); if (!b) { await K.wait(200); continue; }
            const before = st.placed, a = toS(b.x, b.y), z = toS(M.cx + (Math.random() - 0.5) * M.len * 0.06, st.stackTop - b.hh - 24);
            await K.sim.drag(hit, { x: a.x, y: a.y }, { x: z.x, y: z.y }, 800, 18);
            await until(() => st.placed > before, 3000);
          }
          await until(() => st.phase === 'capstep' && st.fairBody && !st.fairBody.tw, 15000);
          await K.wait(600);
          if (st.fairBody) { const b = st.fairBody, a = toS(b.x, b.y), z = toS(M.cx, st.stackTop - b.hh - 24); await K.sim.drag(hit, { x: a.x, y: a.y }, { x: z.x, y: z.y }, 900, 18); }
          await until(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
