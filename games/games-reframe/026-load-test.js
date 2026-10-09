/* 026 Load Test — Reframe · REFRAME · Beliefs / Evidence
 * Mechanism: examining the evidence (Beck's cognitive therapy; Padesky's evidence for and against): a conclusion that
 * rests on feelings and assumptions can't carry the weight it claims, while the facts can. Every plank of the bridge is
 * one thing the player said: what a camera could have recorded is timber, what the mind added (a guess, the feeling of
 * certainty, the leap to "so it must mean") is cardboard. A real constraint solver (XPBD, sub-stepped in real time) loads
 * the bridge with a test truck: timber flexes and holds, cardboard sags, tears and folds. Then the same facts are laid
 * toward a different destination, a fair thought, and they carry the truck across. Honest: when the facts really do
 * point toward the fear, Glitch says so and the far sign carries a plan, not a pep talk.
 * Verb: build (drag each plank card across the canyon into the next bay; flick the taped cardboard into the MAYBE crate
 * on the rebuild) and tap to send the test truck. Finale: string lights run along the fact bridge, the truck honks on the
 * fair-thought mesa, fireworks burst over the canyon and a brass plaque bolts onto the sign.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;

  /* ---------------- small helpers ---------------- */
  const hexRgb = (hx) => { const n = parseInt(String(hx).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * k) + ',' + Math.round(A[1] + (B[1] - A[1]) * k) + ',' + Math.round(A[2] + (B[2] - A[2]) * k) + ')'; };
  const mixHex = (a, b, k) => { const A = hexRgb(a), B = hexRgb(b); return '#' + [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * k).toString(16).padStart(2, '0')).join(''); };
  const rgba = (hx, a) => { const c = hexRgb(hx); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
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

  /* ---------------- physics: XPBD particles, distance / bend / pin / rope constraints, wheel contacts ---------------- */
  function makeSim() {
    const S = { ps: [], cs: [], planks: [], statics: [], floorY: 1e9, g: 1400, t: 0, truck: null, onSnap: null, onTear: null };
    const P = (x, y, m, extra) => { const p = Object.assign({ x, y, px: x, py: y, vx: 0, vy: 0, w: m > 0 ? 1 / m : 0, drag: 0.4, floor: true, on: true }, extra || {}); S.ps.push(p); return p; };
    const C = (c) => { c.on = true; S.cs.push(c); return c; };
    S.P = P;
    S.reset = () => { S.ps.length = 0; S.cs.length = 0; S.planks.length = 0; S.statics.length = 0; S.truck = null; };
    S.addStatic = (x0, y0, x1, y1) => { const s = { x0, y0, x1, y1 }; S.statics.push(s); return s; };
    S.addPlank = (kind, ax, ay, bx, by, K, info) => {
      const n = 5, nodes = [], m = kind === 'timber' ? K.mT : K.mC;
      for (let i = 0; i < n; i++) nodes.push(P(ax + (bx - ax) * i / (n - 1), ay + (by - ay) * i / (n - 1), m, { drag: kind === 'timber' ? 0.6 : 2.4, kind }));
      const seg = Math.hypot(bx - ax, by - ay) / (n - 1);
      const pk = Object.assign({ kind, nodes, segs: [], bends: [], pins: [], snapped: false, solid: true, K, sag: 0, pieces: [nodes.slice()], soggy: 0, born: S.t }, info || {});
      for (let i = 0; i < n - 1; i++) pk.segs.push(C({ t: 'd', a: nodes[i], b: nodes[i + 1], rest: seg, al: kind === 'timber' ? K.alStretchT : K.alStretchC, pk }));
      for (let i = 1; i < n - 1; i++) pk.bends.push(C({ t: 'b', a: nodes[i], b: nodes[i - 1], c: nodes[i + 1], al: kind === 'timber' ? K.alBendT : K.alBendC, pk }));
      pk.pins.push(C({ t: 'p', a: nodes[0], x: ax, y: ay, al: 0, pk }), C({ t: 'p', a: nodes[n - 1], x: bx, y: by, al: 0, pk }));
      S.planks.push(pk); return pk;
    };
    S.removePlank = (pk) => { pk.nodes.concat(pk.split ? [pk.split.b] : []).forEach(p => { p.on = false; }); pk.segs.concat(pk.bends, pk.pins).forEach(c => { c.on = false; }); pk.gone = true; pk.solid = false; };
    S.snap = (pk, k) => {
      if (pk.snapped) return;
      pk.snapped = true;
      const a = pk.nodes[k], b = P(a.x, a.y, 1, { kind: a.kind, drag: a.drag });
      b.px = a.px; b.py = a.py; b.vx = a.vx; b.vy = a.vy; a.w *= 2; b.w = a.w;
      const idx = (p) => pk.nodes.indexOf(p);
      pk.bends.forEach(c => { if (c.a === a) c.on = false; else if (c.c === a && idx(c.a) > k) c.c = b; else if (c.b === a && idx(c.a) > k) c.b = b; });
      pk.segs.forEach(c => { if (c.a === a && idx(c.b) > k) c.a = b; });
      // torn cardboard goes limp
      pk.bends.forEach(c => { if (c.on) c.al *= 6; });
      pk.split = { k, a, b };
      pk.pieces = [pk.nodes.slice(0, k + 1), [b].concat(pk.nodes.slice(k + 1))];
      pk.tearAt = S.t + pk.K.tear * (0.75 + Math.random() * 0.5);
      if (S.onSnap) S.onSnap(pk, a);
    };
    S.addRope = (p, x, y, rest, al, damp) => C({ t: 'r', a: p, x, y, rest, al, damp: damp || 0 });
    S.addTruck = (rx, ry, K) => {
      const R = P(rx, ry, K.mW, { r: K.r, drag: 0.05, wheel: true }), F = P(rx + K.wb, ry, K.mW, { r: K.r, drag: 0.05, wheel: true });
      C({ t: 'd', a: R, b: F, rest: K.wb, al: 0 });
      S.truck = { R, F, K, drive: false, target: K.v, deck: true, roll: 0, kin: null };
      return S.truck;
    };
    function solve(c, h) {
      const at = c.al / (h * h);
      if (c.t === 'd') {
        const a = c.a, b = c.b, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, W = a.w + b.w;
        if (!W) return; const l = -(d - c.rest) / (W + at), nx = dx / d, ny = dy / d;
        a.x -= a.w * l * nx; a.y -= a.w * l * ny; b.x += b.w * l * nx; b.y += b.w * l * ny;
      } else if (c.t === 'b') {
        const a = c.a, b = c.b, cc = c.c, dx = a.x - (b.x + cc.x) / 2, dy = a.y - (b.y + cc.y) / 2;
        const W = a.w + 0.25 * b.w + 0.25 * cc.w; if (!W) return;
        const k = 1 / (W + at), lx = -dx * k, ly = -dy * k;
        a.x += a.w * lx; a.y += a.w * ly; b.x -= 0.5 * b.w * lx; b.y -= 0.5 * b.w * ly; cc.x -= 0.5 * cc.w * lx; cc.y -= 0.5 * cc.w * ly;
        c.dev = Math.hypot(dx, dy);
      } else if (c.t === 'p') {
        const a = c.a; if (!a.w) return; const dx = a.x - c.x, dy = a.y - c.y, k = a.w / (a.w + at); a.x -= dx * k; a.y -= dy * k;
      } else if (c.t === 'r') {
        const a = c.a, dx = a.x - c.x, dy = a.y - c.y, d = Math.hypot(dx, dy) || 1e-6;
        if (d <= c.rest) { c.taut = false; return; }
        c.taut = true; c.stretch = d - c.rest; const l = -(d - c.rest) / (a.w + at); a.x += a.w * l * dx / d; a.y += a.w * l * dy / d;
      }
    }
    function contact(p, ax, ay, bx, by, wa, wb, Aa, Bb) {
      const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey; if (l2 < 1e-9) return false;
      let t = ((p.x - ax) * ex + (p.y - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax + ex * t, qy = ay + ey * t, dx = p.x - qx, dy = p.y - qy, d = Math.hypot(dx, dy);
      if (d >= p.r || d < 1e-9) return false;
      const W = p.w + wa * (1 - t) * (1 - t) + wb * t * t; if (!W) return false;
      const l = (p.r - d) / W, nx = dx / d, ny = dy / d;
      p.x += p.w * l * nx; p.y += p.w * l * ny;
      if (Aa) { Aa.x -= wa * (1 - t) * l * nx; Aa.y -= wa * (1 - t) * l * ny; }
      if (Bb) { Bb.x -= wb * t * l * nx; Bb.y -= wb * t * l * ny; }
      return true;
    }
    S.step = (h) => {
      S.t += h;
      for (const pk of S.planks) {
        if (pk.tearAt && S.t > pk.tearAt) { pk.tearAt = 0; pk.pins.forEach(c => { c.on = false; }); pk.solid = false; if (S.onTear) S.onTear(pk); }
        if (pk.soggy && !pk.snapped) { pk.segs.forEach(c => { c.al = Math.min(c.al * (1 + pk.soggy * h), 0.02); }); }
      }
      const g = S.g, T = S.truck;
      for (const p of S.ps) {
        if (!p.on || !p.w) continue;
        p.vy += g * h; const dmp = Math.exp(-p.drag * h); p.vx *= dmp; p.vy *= dmp;
        if (p.flutter) p.vx += Math.sin(S.t * 7 + p.flutter) * p.flutterA * h;
        p.px = p.x; p.py = p.y; p.x += p.vx * h; p.y += p.vy * h;
      }
      if (T && T.drive && !T.kin) {
        const acc = T.K.acc * h;
        [T.R, T.F].forEach(w => { if (w.ground) { const dv = T.target - w.vx; w.x += Math.max(-acc, Math.min(acc, dv)) * h; } });
      }
      for (const c of S.cs) if (c.on) solve(c, h);
      if (T && !T.kin) {
        [T.R, T.F].forEach(w => {
          w.ground = false; w.under = null;
          if (T.deck) for (const pk of S.planks) { if (!pk.solid || pk.gone) continue; for (const c of pk.segs) { if (!c.on) continue; if (contact(w, c.a.x, c.a.y, c.b.x, c.b.y, c.a.w, c.b.w, c.a, c.b)) { w.ground = true; w.under = pk; } } }
          for (const s of S.statics) if (contact(w, s.x0, s.y0, s.x1, s.y1, 0, 0, null, null)) w.ground = true;
        });
      }
      for (const p of S.ps) {
        if (!p.on || !p.w || !p.floor || p.wheel) continue;
        if (p.y > S.floorY) { p.y = S.floorY; p.x = p.px + (p.x - p.px) * 0.35; p.landed = true; }
      }
      for (const p of S.ps) { if (!p.on || !p.w) continue; p.vx = (p.x - p.px) / h; p.vy = (p.y - p.py) / h; }
      for (const c of S.cs) {
        if (!c.on || c.t !== 'r' || !c.taut || !c.damp) continue;
        const a = c.a, dx = a.x - c.x, dy = a.y - c.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d, vn = a.vx * nx + a.vy * ny, k = Math.min(1, c.damp * h);
        a.vx -= vn * nx * k; a.vy -= vn * ny * k;
      }
      for (const pk of S.planks) {
        if (pk.kind !== 'card' || pk.snapped || pk.gone) continue;
        const n0 = pk.nodes[0], n4 = pk.nodes[4], n2 = pk.nodes[2], ex = n4.x - n0.x, ey = n4.y - n0.y, el = Math.hypot(ex, ey) || 1;
        pk.sag = ((n2.x - n0.x) * -ey + (n2.y - n0.y) * ex) / el;
        if (pk.sag > pk.K.sagSnap) S.snap(pk, 2);
      }
    };
    return S;
  }

  (env.games = env.games || []).push({
    id: 'load-test', mode: 'reframe', name: 'Load Test', verb: 'build', family: 'REFRAME', minutes: 2,
    parents: ['Beliefs / Evidence', 'Uncertainty / Future Worry / Reassurance', 'Overthinking / Thought Fusion'],
    cast: ['rush', 'glitch'], poster: { char: 'rush', mood: 'determined' },
    fonts: ['Rye', 'Overpass:wght@600;700;800;900', 'Saira+Stencil+One'],
    tagline: 'Build a bridge to your conclusion, then send the test truck.',
    why: 'For a conclusion that feels solid: load-test which planks are facts and which are cardboard.',
    css: `
.g-load-test { --lt-disp: "Rye", "Rockwell", "Roboto Slab", "Bitstream Charter", "Lora", Georgia, serif;
  --lt-ui: "Overpass", "Inter", "Fredoka", "DejaVu Sans", system-ui, sans-serif;
  --lt-sten: "Saira Stencil One", "Inter Display", "Arial Black", Impact, sans-serif;
  --lt-green: #0f6b46; --lt-brown: #5b3416; --lt-cream: #fff3d6; --lt-gold: #ffcf5a; --lt-red: #e8452c; --lt-mint: #4fe0a8; }
.g-load-test .lt-hud { position: absolute; z-index: 26; left: 12px; top: calc(env(safe-area-inset-top, 0px) + 60px); display: flex; flex-direction: column; gap: 2px; padding: 7px 12px 7px 11px; border-radius: 10px;
  background: linear-gradient(180deg, #3a2a1f, #24180f); border: 2px solid #c9893f; box-shadow: 0 6px 16px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 220, 160, .25); color: var(--lt-cream); pointer-events: none; }
.g-load-test .lt-hud b { font: 400 17px/1 var(--lt-sten); letter-spacing: .06em; color: var(--lt-gold); }
.g-load-test .lt-hud span { font: 700 12px/1.1 var(--lt-ui); letter-spacing: .08em; text-transform: uppercase; color: #ffe9c2; }
.g-load-test .lt-gauge { position: absolute; z-index: 26; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 58px); width: 104px; padding: 5px 6px 4px; border-radius: 12px; pointer-events: none;
  background: linear-gradient(180deg, #2b2f3a, #171a22); border: 2px solid #9aa4b8; box-shadow: 0 6px 16px rgba(0, 0, 0, .35); transition: opacity .3s ease, transform .3s ease; }
.g-load-test .lt-gauge.off { opacity: 0; transform: translateY(-8px); }
.g-load-test .lt-gauge svg { display: block; width: 100%; height: auto; overflow: visible; }
.g-load-test .lt-gauge small { display: block; text-align: center; font: 800 12px/1 var(--lt-ui); letter-spacing: .1em; color: #dfe6f5; margin-top: 1px; }
.g-load-test .lt-gauge small.hot { color: #ff9a8a; }
.g-load-test .lt-sign { position: absolute; z-index: 12; transform: translateY(-100%); display: flex; flex-direction: column; gap: 3px; padding: 7px 12px 9px; border-radius: 9px; color: #fff; pointer-events: none;
  background: var(--lt-green); box-shadow: inset 0 0 0 2px #e9fff4, 0 10px 22px rgba(0, 0, 0, .35); transition: opacity .7s ease, transform .7s ease, filter .7s ease; }
.g-load-test .lt-sign small { font: 800 12px/1 var(--lt-ui); letter-spacing: .1em; text-transform: uppercase; color: #d6ffe9; display: flex; align-items: center; gap: 6px; }
.g-load-test .lt-sign small i { font-style: normal; display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 4px; background: #fff; color: var(--lt-green); font-size: 13px; }
.g-load-test .lt-sign .lt-st { font: 800 16px/1.2 var(--lt-ui); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; text-wrap: balance; }
.g-load-test .lt-sign.fair .lt-st { -webkit-line-clamp: 4; }
.g-load-test .lt-sign.far { opacity: .45; transform: translateY(-100%) scale(.8); transform-origin: 100% 100%; filter: saturate(.45); }
.g-load-test .lt-sign.far.gone { opacity: 0; transform: translate(24px, -40px) translateY(-100%) scale(.6); }
.g-load-test .lt-sign.fair { background: linear-gradient(180deg, #6a3d1c, #4d2a12); box-shadow: inset 0 0 0 2px #f6dfae, 0 12px 26px rgba(0, 0, 0, .4); transform: translate(-50%, -100%); opacity: 0; }
.g-load-test .lt-sign.fair small { color: #ffe2a8; font: 400 13px/1 var(--lt-disp); letter-spacing: .06em; }
.g-load-test .lt-sign.fair.on { opacity: 1; animation: load-test-rise .7s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-load-test .lt-sign.fair .lt-plan { font: 700 14px/1.25 var(--lt-ui); color: #fff1cf; border-top: 1px dashed rgba(255, 226, 168, .55); padding-top: 4px; margin-top: 2px; }
.g-load-test .lt-sign.fair .lt-plan b { color: var(--lt-gold); }
.g-load-test .lt-sign.fair.brass { background: linear-gradient(160deg, #fff1b8, #e4b24a 45%, #b47a1c); color: #3a2405; box-shadow: inset 0 0 0 2px #fff6d8, 0 0 34px rgba(255, 207, 90, .65), 0 12px 26px rgba(0, 0, 0, .4); }
.g-load-test .lt-sign.fair.brass small { color: #6b3d0c; }
.g-load-test .lt-sign.fair.brass .lt-plan { color: #3a2405; border-color: rgba(58, 36, 5, .35); }
.g-load-test .lt-sign.fair.brass .lt-plan b { color: #7a3d00; }
@keyframes load-test-rise { from { opacity: 0; transform: translate(-50%, -80%) scale(.9); } to { opacity: 1; transform: translate(-50%, -100%); } }
.g-load-test .lt-read { position: absolute; z-index: 26; display: grid; grid-template-columns: auto 1fr; align-items: center; column-gap: 10px; padding: 8px 12px; border-radius: 12px; pointer-events: none;
  background: rgba(20, 14, 10, .9); border: 1px solid rgba(255, 207, 90, .45); color: var(--lt-cream); box-shadow: 0 10px 24px rgba(0, 0, 0, .4); transition: opacity .25s ease; }
.g-load-test .lt-read.off { opacity: 0; }
.g-load-test .lt-read .lt-badge { grid-row: 1 / 3; }
.g-load-test .lt-read .gk-user, .g-load-test .lt-read .lt-gen { font: 700 15px/1.25 var(--lt-ui); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.g-load-test .lt-read em { font: 800 12px/1 var(--lt-ui); letter-spacing: .1em; text-transform: uppercase; font-style: normal; color: #ffd98a; }
.g-load-test .lt-read em.ok { color: var(--lt-mint); } .g-load-test .lt-read em.bad { color: #ff8a78; }
.g-load-test .lt-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 44px; border-radius: 10px; font: 800 12px/1 var(--lt-ui); letter-spacing: .06em; padding: 0 6px; }
.g-load-test .lt-badge.fact { background: linear-gradient(180deg, #b9763a, #7a4519); color: #fff3d6; box-shadow: inset 0 0 0 1px rgba(255, 230, 190, .5); }
.g-load-test .lt-badge.card { background: repeating-linear-gradient(90deg, #d8b47a 0 3px, #c9a066 3px 5px); color: #4a2f10; box-shadow: inset 0 0 0 1px rgba(90, 60, 20, .45); }
.g-load-test .lt-badge svg { width: 26px; height: 26px; display: block; }
.g-load-test .lt-tray { position: absolute; z-index: 28; display: flex; align-items: stretch; justify-content: center; gap: 10px; pointer-events: none; }
.g-load-test .lt-card { pointer-events: auto; position: relative; flex: 1 1 auto; max-width: 400px; min-height: 76px; display: grid; grid-template-columns: auto 1fr; align-items: center; column-gap: 10px; padding: 10px 14px 10px 10px;
  border-radius: 10px; color: #2a1606; touch-action: none; cursor: grab; text-align: left; transition: opacity .2s ease, transform .25s cubic-bezier(.2, 1.3, .4, 1); animation: load-test-in .45s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-load-test .lt-card.fact { background: linear-gradient(180deg, rgba(255, 255, 255, .22), rgba(255, 255, 255, 0) 40%), repeating-linear-gradient(176deg, rgba(110, 60, 20, .0) 0 7px, rgba(110, 60, 20, .16) 7px 9px), linear-gradient(180deg, #e2a15e, #c27b3c);
  box-shadow: inset 0 0 0 2px #8a4f1e, inset 0 3px 0 rgba(255, 236, 200, .45), 0 4px 0 #6b3a14, 0 12px 24px rgba(0, 0, 0, .35); }
.g-load-test .lt-card.card { background: linear-gradient(180deg, rgba(255, 255, 255, .25), rgba(255, 255, 255, 0) 40%), repeating-linear-gradient(90deg, rgba(120, 85, 35, .0) 0 5px, rgba(120, 85, 35, .13) 5px 7px), linear-gradient(180deg, #e7c890, #d1ab6d);
  box-shadow: inset 0 0 0 2px #a8834e, 0 3px 0 #8e6c3c, 0 12px 24px rgba(0, 0, 0, .3); }
.g-load-test .lt-card.taped::after { content: ""; position: absolute; left: 22px; top: -4px; width: 26px; height: calc(100% + 8px); background: rgba(225, 230, 235, .78); transform: rotate(7deg); box-shadow: 0 1px 2px rgba(0, 0, 0, .2); pointer-events: none; }
.g-load-test .lt-card .lt-cl { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding-right: 26px; }
.g-load-test .lt-card .lt-count { position: absolute; right: 7px; top: 6px; font: 800 12px/1 var(--lt-ui); font-style: normal; padding: 4px 6px; border-radius: 8px; background: rgba(60, 30, 8, .18); color: #4a2608; }
.g-load-test .lt-card small { font: 800 12px/1 var(--lt-ui); letter-spacing: .1em; text-transform: uppercase; color: #5c300c; opacity: .9; }
.g-load-test .lt-card.card small { color: #6a4a18; }
.g-load-test .lt-card .gk-user, .g-load-test .lt-card .lt-gen { font: 800 16px/1.22 var(--lt-ui); color: #2a1606; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.g-load-test .lt-card .lt-gen { font-weight: 700; }
.g-load-test .lt-card.lift { opacity: .25; }
.g-load-test .lt-card:focus-visible { outline: 3px solid var(--lt-gold); outline-offset: 3px; }
@keyframes load-test-in { from { opacity: 0; transform: translateY(18px) rotate(-2deg) scale(.96); } to { opacity: 1; transform: none; } }
.g-load-test .lt-ghost { position: absolute; z-index: 60; left: 0; top: 0; pointer-events: none; margin: 0; animation: none; transform-origin: 50% 50%; box-shadow: 0 22px 34px rgba(0, 0, 0, .45) !important; will-change: transform; }
.g-load-test .lt-crate { pointer-events: none; flex: 0 0 auto; width: 92px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; padding: 6px 4px 7px; border-radius: 8px;
  background: repeating-linear-gradient(0deg, #9a6a34 0 13px, #7d5226 13px 15px); box-shadow: inset 0 0 0 3px #5b3812, inset 0 0 0 5px #b07c3f, 0 10px 20px rgba(0, 0, 0, .35); color: #fff3d6; transition: transform .2s ease, box-shadow .2s ease; animation: load-test-in .45s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-load-test .lt-crate b { font: 400 16px/1 var(--lt-sten); letter-spacing: .06em; color: #fff3d6; text-shadow: 0 2px 0 #4a2a0a; }
.g-load-test .lt-crate span { font: 800 12px/1.05 var(--lt-ui); color: #ffe7b8; text-align: center; text-shadow: 0 1px 0 #4a2a0a; }
.g-load-test .lt-crate i { position: absolute; top: -9px; right: -7px; min-width: 24px; height: 24px; border-radius: 12px; display: grid; place-items: center; font: 800 13px/1 var(--lt-ui); font-style: normal; background: var(--lt-gold); color: #3a2405; box-shadow: 0 2px 0 #9a6a10; }
.g-load-test .lt-crate.hot { transform: scale(1.08) rotate(-2deg); box-shadow: inset 0 0 0 3px #5b3812, inset 0 0 0 5px #ffd36b, 0 0 0 3px rgba(255, 211, 107, .75), 0 10px 20px rgba(0, 0, 0, .35); }
.g-load-test .lt-send { pointer-events: auto; width: 96px; height: 96px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; display: grid; place-items: center; position: relative; touch-action: manipulation;
  background: radial-gradient(circle at 40% 32%, #fff 0, #ffb3a1 18%, #ef4e33 52%, #9b1d0b 100%); box-shadow: 0 0 0 5px #2a1206, 0 0 0 8px #ffcf5a, 0 0 30px rgba(255, 120, 60, .7), 0 12px 24px rgba(0, 0, 0, .45); transition: transform .12s ease; animation: load-test-in .45s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-load-test .lt-send svg { width: 50px; height: 34px; margin-top: -10px; }
.g-load-test .lt-send b { position: absolute; bottom: 15px; left: 0; right: 0; text-align: center; font: 400 14px/1 var(--lt-sten); letter-spacing: .08em; color: #fff; text-shadow: 0 1px 2px rgba(80, 0, 0, .9); }
.g-load-test .lt-send:active { transform: scale(.92); }
.g-load-test .lt-send::after { content: ""; position: absolute; inset: -9px; border-radius: 50%; border: 3px solid #ffcf5a; animation: load-test-ring 1.4s ease-out infinite; pointer-events: none; }
.g-load-test .lt-send:focus-visible { outline: 3px solid #fff; outline-offset: 12px; }
@keyframes load-test-ring { from { opacity: .9; transform: scale(1); } to { opacity: 0; transform: scale(1.45); } }
.g-load-test .lt-stamp { position: absolute; z-index: 40; transform: translate(-50%, -50%) rotate(-12deg); padding: 6px 14px 4px; border: 4px solid currentColor; border-radius: 10px; font: 400 30px/1 var(--lt-disp); letter-spacing: .04em; pointer-events: none;
  color: #ff5a3c; background: rgba(255, 245, 230, .92); box-shadow: 0 10px 22px rgba(0, 0, 0, .35); animation: load-test-stamp .45s cubic-bezier(.2, 1.6, .4, 1) both; white-space: nowrap; }
.g-load-test .lt-stamp.ok { color: #128a52; }
@keyframes load-test-stamp { from { opacity: 0; transform: translate(-50%, -50%) rotate(-12deg) scale(2.2); } to { opacity: 1; transform: translate(-50%, -50%) rotate(-12deg) scale(1); } }
.g-load-test .gk-char .gk-bubble { max-width: var(--lt-bub, 240px); }
.g-load-test .lt-low .gk-bubble { top: auto; bottom: 2px; }
.g-load-test .lt-low.gk-side-right .gk-bubble::before, .g-load-test .lt-low.gk-side-left .gk-bubble::before { top: auto; bottom: 22px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(String(sub[k])); }); return s; };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const inten = ctx.intensity;
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const serious = support === 'strong';
      const gentleTone = care || serious;
      const TEXT = String(ctx.text || ''), noWords = !TEXT.trim();
      const visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const SOFT = softwareGfx();

      /* ---------------- content: facts (timber), guesses and feelings (cardboard), the conclusion, the fair thought ---------------- */
      const lowerText = TEXT.toLowerCase();
      const exact = (q) => { q = String(q || '').trim(); if (!q) return ''; const i = lowerText.indexOf(q.toLowerCase()); return i >= 0 ? TEXT.slice(i, i + q.length) : q; };
      const STOP = { the: 1, and: 1, you: 1, your: 1, that: 1, this: 1, with: 1, was: 1, are: 1, for: 1, have: 1, has: 1, but: 1, not: 1, its: 1, youre: 1, ive: 1, its_: 1, been: 1, will: 1, just: 1 };
      const wordsOf = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP[w]);
      const EXAMPLES = [
        { conc: 'They’re annoyed with me.', facts: ['I sent a message at 2pm', 'It says “read”', 'No reply yet'], guess: 'They must be ignoring me', fair: 'It’s been a few hours. That fits a busy day as well as anything else. I can check in tomorrow.' },
        { conc: 'I’m in trouble at work.', facts: ['My manager asked for “a quick word”', 'The meeting is at 3pm', 'No agenda was sent'], guess: 'Her tone sounded cold', fair: 'A quick word with no agenda fits lots of ordinary things. I can ask what it’s about.' },
        { conc: 'Everyone thought I was weird.', facts: ['I made a joke at lunch', 'Two people didn’t laugh', 'One person smiled'], guess: 'They were all judging me', fair: 'One joke landed unevenly. That happens to everyone, and one person smiled.' }
      ];
      const ex = noWords ? K.dailyPick(EXAMPLES, 3) : null;
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
      const cards = guesses.concat([{ text: 'It feels certain', user: false, k: 'feel' }]);
      if (cards.length < 2) cards.push({ text: 'So it must mean…', user: false, k: 'leap' });
      facts = facts.slice(0, Math.max(1, Math.min(CAP_F, CAP_N - cards.length)));
      facts.forEach(f => { f.text = clip(f.text, 110); }); cards.forEach(c => { c.text = clip(c.text, 110); c.kind = 'card'; });
      facts.forEach(f => { f.kind = 'fact'; f.k = 'fact'; });
      const conclusion = noWords ? { text: ex.conc, user: false } : concIdx >= 0 ? { text: clip(K.sentence(spans[concIdx].q), 90), user: true } : { text: clip(K.sentence(an.conclusion || an.thought || 'It means something bad'), 90), user: false };
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k) => (leads.find(l => l.kind === k) || {}).text || '';
      const fair = noWords ? ex.fair : clip(an.balanced || 'That fits several explanations, and the facts don’t settle it yet.', 130);
      const plan = noWords ? '' : care ? 'Get the exact facts from someone qualified.' : serious ? clip(lead('prepare') || lead('ask') || 'Write down the next single step.', 100) : '';
      const planA = [].concat(facts, cards);     // the conclusion bridge: facts from the situation side, cardboard toward the conclusion
      const N = planA.length, F = facts.length;
      const decoys = cards.filter(c => c.k === 'guess').concat(cards.filter(c => c.k !== 'guess')).slice(0, Math.min(2, cards.length)).map(c => Object.assign({}, c, { taped: true }));
      const planB = [];
      { let di = 0; facts.forEach((f, i) => { planB.push(f); if ((i === 0 || i === 2) && di < decoys.length) planB.push(decoys[di++]); }); while (di < decoys.length) planB.splice(Math.min(planB.length - 1, 1 + di * 2), 0, decoys[di++]); }

      /* ---------------- world look: today's canyon, the truck you've earned ---------------- */
      const CANYONS = [
        { key: 'Red Rock', rock: '#d4683e', band: '#f0a067', deep: '#7a2c1e', far: '#e0a58a', river: '#38c0c8', tuft: '#8aa05a', lamp: '#ffcf5a' },
        { key: 'Painted Desert', rock: '#cf7d6c', band: '#f3c3a6', deep: '#74344c', far: '#dcb0bf', river: '#4fc6b8', tuft: '#9aa86a', lamp: '#ffd7a0' },
        { key: 'Slot Canyon', rock: '#df8638', band: '#ffc46e', deep: '#7c2f3a', far: '#eab07c', river: '#2fb4d4', tuft: '#7f9c4c', lamp: '#ffe08a' },
        { key: 'Sage Mesa', rock: '#c08757', band: '#ebc58e', deep: '#5c382a', far: '#cdb59e', river: '#45b8a8', tuft: '#7fa86a', lamp: '#ffd27a' }
      ];
      const canyon = K.dailyPick(CANYONS, 11);
      const SKINS = [
        { key: 'Rusty Red', body: '#d9472e', trim: '#ffe2b0', dark: '#7a1d10' },
        { key: 'Desert Teal', body: '#1f9e95', trim: '#fff1c9', dark: '#0d4e4a' },
        { key: 'Sunset Orange', body: '#f08a24', trim: '#fff6dc', dark: '#83420a' },
        { key: 'Gold Rig', body: '#e8b52f', trim: '#fffbe6', dark: '#7a5608' }
      ];
      const skinIdx = clamp(Math.round(Number(S.store.get('load-test:skin', 0)) || 0), 0, SKINS.length - 1);
      const skin = SKINS[skinIdx];

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        open: gentleTone
          ? { Jolly: 'This one matters. Let’s build it carefully, then test it honestly.', Cheeky: 'Real stakes, so we build properly and test properly.', Unfiltered: 'It matters. Build it. Test it.' }
          : visits ? { Jolly: 'Back on site! Same canyon rules: build it, then load it.', Cheeky: 'Hard hat on. Let’s see what today’s conclusion is made of.', Unfiltered: 'New bridge. Same test.' }
            : { Jolly: 'Big canyon, one conclusion on the far side. Let’s bridge it with what you’ve got!', Cheeky: 'Your conclusion’s way over there. Good thing I brought a truck.', Unfiltered: 'Conclusion’s over there. Build the bridge.' },
        glitch: { Jolly: 'Every plank is something you said. Facts come as timber. Guesses come as… cardboard.', Cheeky: 'Inspector Glitch. Facts are timber, guesses are cardboard. Spot the difference.', Unfiltered: 'Facts: timber. Guesses: cardboard.' },
        glitchEx: { Jolly: 'No words today, so here’s a classic case to test. Facts are timber, guesses are cardboard.', Cheeky: 'Example case on the slab. Facts: timber. Guesses: cardboard.', Unfiltered: 'Example case. Timber vs cardboard.' },
        fact1: { Jolly: 'Solid timber. A camera could have caught that.', Cheeky: 'Now that’s lumber. Camera-certified.', Unfiltered: 'Fact. Solid.' },
        card1: gentleTone ? { Jolly: 'Cardboard here. Let’s see how it does under load.', Cheeky: 'Cardboard plank. We’ll see.', Unfiltered: 'Cardboard. We’ll see.' }
          : { Jolly: 'Cardboard’s basically wood, right? It’s the same colour!', Cheeky: 'It’s brown. It’s flat. It’s basically a plank.', Unfiltered: 'Cardboard. Probably fine.' },
        feel: { Jolly: '“It feels certain” is a feeling. Feelings are real. They’re just not load-rated.', Cheeky: 'Feeling certain isn’t a building material. Noted.', Unfiltered: 'A feeling. Not load-rated.' },
        leap: { Jolly: 'And the leap: “so it must mean”. That’s the bit nobody checks.', Cheeky: 'The classic leap. Very popular. Very cardboard.', Unfiltered: 'The leap. Cardboard.' },
        built: gentleTone ? { Jolly: 'Bridge complete. Now the honest part: the load test.', Cheeky: 'Built. Time to see what holds.', Unfiltered: 'Built. Test it.' }
          : { Jolly: 'Bridge complete, straight to your conclusion! Let’s test it!', Cheeky: 'Done! Conclusion reachable. Allegedly.', Unfiltered: 'Built. Test it.' },
        send: { Jolly: 'Load test time. Tap the button to send the truck.', Cheeky: 'Big red button. You know what to do.', Unfiltered: 'Tap. Send it.' },
        timber: { Jolly: 'Timber’s holding! Smooth!', Cheeky: 'Timber: fine. Timber: great. Timber: my friend.', Unfiltered: 'Timber holds.' },
        sag: gentleTone ? { Jolly: 'Watch the cardboard.', Cheeky: 'It’s bending.', Unfiltered: 'Bending.' } : { Jolly: 'Uh… is cardboard supposed to bend like that?', Cheeky: 'Why is it going soft? Why is it going SOFT?', Unfiltered: 'It’s bending.' },
        drop: gentleTone ? { Jolly: 'Safety line!', Cheeky: 'Line’s got me!', Unfiltered: 'Line holds.' } : { Jolly: 'WHOAAA—', Cheeky: 'NOPE NOPE NOPE—', Unfiltered: 'Down we go!' },
        dangle: gentleTone ? { Jolly: 'Safe on the line. That’s exactly why we test.', Cheeky: 'Caught by the line. Test working as designed.', Unfiltered: 'Safe. Test worked.' }
          : { Jolly: 'I’m okay! The bungee’s okay! The truck’s… sideways, but okay!', Cheeky: 'Totally planned. I love a bungee.', Unfiltered: 'Fine. Bungee worked.' },
        verdict: { Jolly: 'Look: every fact held. Only the cardboard gave way.', Cheeky: 'Timber: perfect. Cardboard: confetti.', Unfiltered: 'Facts held. Guesses didn’t.' },
        verdictSerious: { Jolly: 'Those facts are real, and they do point this way. That part held. The last stretch was guesswork.', Cheeky: 'Real timber, real weight. Only the last stretch was cardboard.', Unfiltered: 'Facts real. Last stretch cardboard.' },
        twist: serious ? { Jolly: 'So let’s build where the facts actually lead, and bring a plan.', Cheeky: 'Facts point somewhere real. Let’s build there, with a plan.', Unfiltered: 'Build where the facts go. Plan included.' }
          : { Jolly: 'Your conclusion sits past where the facts reach. Let’s build to where they actually go.', Cheeky: 'The facts don’t reach that sign. But they do reach somewhere.', Unfiltered: 'Facts don’t reach that far. Build where they do.' },
        whoa: { Jolly: 'Whoa! Where did THAT come from?', Cheeky: 'Was that rock always there?', Unfiltered: 'A mesa. Huh.' },
        always: { Jolly: 'It was there all along. You just can’t see it from the fear side.', Cheeky: 'Always there. Fear has terrible eyesight.', Unfiltered: 'Always there. Hidden by the fear.' },
        rebuild: { Jolly: 'Same facts, new destination. Timber goes on the bridge. Cardboard goes in the MAYBE crate.', Cheeky: 'Facts on the bridge. Guesses in the crate. No exceptions.', Unfiltered: 'Timber: bridge. Cardboard: crate.' },
        taped: gentleTone ? { Jolly: 'I patched the cardboard with tape. Still cardboard, I know.', Cheeky: 'Taped it. Still cardboard.', Unfiltered: 'Taped. Still cardboard.' } : { Jolly: 'I taped the cardboard back together! Good as new!', Cheeky: 'Duct tape fixes everything. Right? Right?', Unfiltered: 'Taped it. Use it?' },
        crated: { Jolly: 'A maybe, not a fact. Parked to check later.', Cheeky: 'Into the maybe pile. Not deleted, just not load-bearing.', Unfiltered: 'Maybe. Check later.' },
        wrongBay: { Jolly: 'That one’s cardboard. It goes in the MAYBE crate.', Cheeky: 'Tape doesn’t make it timber. Crate, please.', Unfiltered: 'Cardboard. Crate.' },
        wrongCrate: { Jolly: 'That one’s solid! It belongs on the bridge.', Cheeky: 'That’s a fact. Facts go on the bridge.', Unfiltered: 'Fact. Bridge.' },
        builtB: { Jolly: 'Shorter bridge. Every plank is real. Send it?', Cheeky: 'Shorter, sturdier, honest. Let’s roll.', Unfiltered: 'All timber. Send it.' },
        cross: { Jolly: 'Not even a wobble!', Cheeky: 'Smooth. Suspiciously smooth.', Unfiltered: 'Holding.' },
        arrive: { Jolly: 'Made it! HONK HONK!', Cheeky: 'Parked. Nailed it. HONK.', Unfiltered: 'Made it.' },
        held: serious ? { Jolly: 'Built from facts, with a plan on top. That holds.', Cheeky: 'Facts plus a plan. Load-rated.', Unfiltered: 'Facts and a plan. Holds.' } : { Jolly: 'Built from facts. It holds.', Cheeky: 'Facts only. Rated for any load.', Unfiltered: 'Facts hold.' },
        fin: care ? { Jolly: 'Same facts, a fairer place to land. Next: ask someone qualified.', Cheeky: 'Fair landing. Next stop: proper advice.', Unfiltered: 'Fair thought. Get proper advice next.' }
          : serious ? { Jolly: 'Same facts, honest destination, and a plan. That’s good engineering.', Cheeky: 'Real problem, real bridge, real plan.', Unfiltered: 'Facts. Plan. Done.' }
            : { Jolly: 'Same facts. A much fairer place to land.', Cheeky: 'Same facts, better destination. Engineering!', Unfiltered: 'Same facts. Fair landing.' }
      };

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', mode: 'A', ready: false, placing: null, drag: null, hot: null, placed: 0, prec: [], wrong: 0, crated: 0, snaps: 0, finished: false, testDone: false, tested: false, fallT: 0,
        shake: 0, slow: 1, slowUntil: 0, fogK: 0, fogDir: 0, mesaK: 1, mesaRising: false, lights: 0, finT: 0, q: 1, fn: 0, slowN: 0, sim: 0, firstFact: false, firstCard: false, said: {}, gaugeV: 0, readKey: '', arrivedAt: 0, stalls: 0 };
      const M = { W: 0, H: 0, phone: true, side: false, xL: 0, xR: 0, xM: 0, mw: 0, yD: 0, yF: 0, L: 60, s: 0.5, ts: 0.5, cableY: 0 };
      const P = K.particles({ max: 520 });
      const sim = makeSim();
      let T = null, rope = null;

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 2 });
      const hud = h('div', { class: 'lt-hud' }, h('b', { text: canyon.key.toUpperCase() }), h('span', { text: 'Site survey' }));
      const gauge = h('div', { class: 'lt-gauge off', 'aria-hidden': 'true', html: '<svg viewBox="0 0 100 56"><path d="M8 50 A42 42 0 0 1 92 50" fill="none" stroke="#33394a" stroke-width="12"/><path d="M8 50 A42 42 0 0 1 50 8" fill="none" stroke="#3ccf8e" stroke-width="10"/><path d="M50 8 A42 42 0 0 1 79.7 20.3" fill="none" stroke="#ffcf5a" stroke-width="10"/><path d="M79.7 20.3 A42 42 0 0 1 92 50" fill="none" stroke="#ff5a3c" stroke-width="10"/><g class="lt-needle" style="transform-origin:50px 50px;transform:rotate(-90deg)"><path d="M48 50 L50 12 L52 50 Z" fill="#fff"/></g><circle cx="50" cy="50" r="5" fill="#fff"/></svg><small>STRAIN</small>' });
      const needle = gauge.querySelector('.lt-needle'), gaugeLbl = gauge.querySelector('small');
      const destSign = h('div', { class: 'lt-sign dest', role: 'note' }, h('small', null, h('i', { text: '→' }), h('span', { text: noWords ? 'Example conclusion' : 'Your conclusion' })), h('div', { class: 'lt-st ' + (conclusion.user ? 'gk-user' : 'lt-gen'), text: conclusion.text }));
      const fairSign = h('div', { class: 'lt-sign fair', role: 'note' }, h('small', { text: 'Fair thought' }), h('div', { class: 'lt-st', text: fair }));
      if (plan) fairSign.append(h('div', { class: 'lt-plan' }, h('b', { text: care ? 'Next: ' : 'Plan: ' }), document.createTextNode(plan)));
      const read = h('div', { class: 'lt-read off', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'lt-badge fact' }), h('em', { text: '' }), h('div', { class: 'lt-gen', text: '' }));
      const tray = h('div', { class: 'lt-tray' });
      const crate = h('div', { class: 'lt-crate', hidden: true, 'aria-label': 'MAYBE crate: guesses to check later' }, h('i', { text: '0' }), h('b', { text: 'MAYBE' }), h('span', { text: 'check later' }));
      const sendBtn = h('button', { type: 'button', class: 'lt-send', hidden: true, 'aria-label': 'Send the test truck', html: '<svg viewBox="0 0 50 34" aria-hidden="true"><rect x="2" y="10" width="28" height="14" rx="3" fill="#fff"/><path d="M30 13h9l7 7v4H30z" fill="#fff"/><rect x="33" y="15" width="6" height="4" rx="1" fill="#ef4e33"/><circle cx="12" cy="27" r="5" fill="#2a1206" stroke="#fff" stroke-width="2"/><circle cx="38" cy="27" r="5" fill="#2a1206" stroke="#fff" stroke-width="2"/></svg><b>SEND</b>' });
      tray.append(crate);
      el.append(destSign, fairSign, hud, gauge, read, tray);
      const sendWrap = h('div', { class: 'lt-tray' }, sendBtn); el.append(sendWrap);
      const rush = K.character('rush', { side: 'right', mood: 'determined', x: 10, y: 600, size: 64 });
      const glitch = K.character('glitch', { side: 'left', mood: 'scan', x: 300, y: 600, size: 64 });
      function say(c, line, o) { const other = c === rush ? glitch : rush; if (!M.side) other.hush(); return c.say(line, o); }
      const ICON = {
        fact: '<svg viewBox="0 0 26 26" aria-hidden="true"><rect x="3" y="8" width="20" height="13" rx="3" fill="currentColor"/><rect x="8" y="5" width="7" height="4" rx="1.5" fill="currentColor"/><circle cx="13" cy="14.5" r="4.2" fill="#7a4519" stroke="#fff3d6" stroke-width="1.6"/></svg>',
        guess: '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M5 12a8 6.5 0 1 1 6 6.3L7 21l1-3.6A6.6 6.6 0 0 1 5 12z" fill="currentColor"/><path d="M10.6 10.2a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.6" fill="none" stroke="#e7c890" stroke-width="1.7" stroke-linecap="round"/><circle cx="13" cy="16.3" r="1.1" fill="#e7c890"/></svg>',
        feel: '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M13 21s-8-4.8-8-10.2A4.3 4.3 0 0 1 13 8.4a4.3 4.3 0 0 1 8 2.4C21 16.2 13 21 13 21z" fill="currentColor"/></svg>',
        leap: '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M3 19c4-9 11-11 17-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M17 5l5 5-6 3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      };
      const KIND_NAME = { fact: 'Fact · timber', guess: 'Guess · cardboard', feel: 'Feeling · cardboard', leap: 'Leap · cardboard' };

      /* ---------------- sound: canyon shuffle, engine, wood and cardboard ---------------- */
      const MUS = { on: false, next: 0, i: 0, bpm: 96, vol: 1, win: false };
      const PROG = [['E2', 'B2', ['E3', 'G#3', 'B3', 'E4']], ['A2', 'E3', ['A3', 'C#4', 'E4', 'A4']], ['B2', 'F#3', ['B3', 'D#4', 'F#4', 'A4']], ['E2', 'B2', ['E3', 'G#3', 'B3', 'E4']]];
      const LICK = ['B4', 'G#4', 'E4', 'F#4', 'G#4', 'B4', 'C#5', 'B4'];
      function musicTick() {
        if (!A.ctx || !MUS.on) return;
        const t0 = A.now(); if (MUS.next < t0 - 0.4 || MUS.next > t0 + 2) MUS.next = t0 + 0.06;
        const ahead = t0 + 0.24, e8 = 60 / MUS.bpm / 2, v = MUS.vol;
        while (MUS.next < ahead) {
          const t = MUS.next, i = MUS.i, bar = Math.floor(i / 8) % 4, pos = i % 8, ch = PROG[bar], swing = pos % 2 ? e8 * 0.18 : 0;
          if (v > 0.02) {
            if (pos === 0) A.pluck(A.note(ch[0]), { when: t, vol: 0.2 * v, damp: 0.993, lp: 900, bus: 'music' });
            if (pos === 4) A.pluck(A.note(ch[1]), { when: t, vol: 0.16 * v, damp: 0.993, lp: 900, bus: 'music' });
            if (pos === 2 || pos === 6) ch[2].forEach((n, k) => A.pluck(A.note(n), { when: t + swing + k * 0.013, vol: 0.05 * v, damp: 0.99, lp: 2600, bus: 'music' }));
            if (pos % 2) A.shaker(t + swing, 0.012 * v);
            if (MUS.win && (bar === 1 || bar === 3)) A.tone({ when: t + swing, type: 'triangle', freq: A.note(LICK[(i + bar) % LICK.length]), dur: 0.22, vol: 0.035 * v, attack: 0.01, lp: 2400, bus: 'music' });
          }
          MUS.i++; MUS.next += e8;
        }
      }
      function musicStart() { MUS.on = true; MUS.next = 0; }
      let engine = null;
      function engineOn() {
        if (engine || !A.ctx || !A.bus || !A.bus('sfx')) return;
        try {
          const c = A.ctx, o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), trem = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
          o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 46; o2.frequency.value = 47.3;
          f.type = 'lowpass'; f.frequency.value = 340; f.Q.value = 4;
          g.gain.value = 0.0001; trem.gain.value = 0.55; lfo.frequency.value = 12; lg.gain.value = 0.45;
          lfo.connect(lg); lg.connect(trem.gain); o1.connect(f); o2.connect(f); f.connect(trem); trem.connect(g); g.connect(A.bus('sfx'));
          o1.start(); o2.start(); lfo.start();
          engine = {
            set(level, rev) { if (!A.ctx) return; const t = A.ctx.currentTime; g.gain.setTargetAtTime(Math.max(0.0001, level * 0.09), t, 0.08); o1.frequency.setTargetAtTime(42 + rev * 26, t, 0.12); o2.frequency.setTargetAtTime(43.3 + rev * 26.8, t, 0.12); lfo.frequency.setTargetAtTime(10 + rev * 9, t, 0.12); f.frequency.setTargetAtTime(300 + rev * 260, t, 0.12); },
            stop() { try { [o1, o2, lfo].forEach(o => o.stop()); g.disconnect(); } catch (e) { /* stopped */ } engine = null; }
          };
        } catch (e) { engine = null; }
      }
      S.onDestroy(() => { if (engine) engine.stop(); MUS.on = false; });
      let lastCreak = 0, lastCrinkle = 0, lastRatchet = 0;
      const SND = {
        place(kind) { if (!A.ctx) return; const t = A.now(); if (kind === 'fact') { A.wood(t, 0.22, 0.62); A.tone({ when: t, type: 'sine', freq: 140, to: 70, glide: 0.12, dur: 0.22, vol: 0.18 }); } else { A.paper({ vol: 0.12, freq: 1400 }); A.tone({ when: t, type: 'triangle', freq: 120, to: 80, glide: 0.1, dur: 0.18, vol: 0.1, lp: 600 }); } },
        bolt(i) { if (!A.ctx) return; const t = A.now() + 0.06 + i * 0.09; A.tone({ when: t, type: 'square', freq: 1900 + i * 240, dur: 0.035, vol: 0.03, lp: 5200 }); A.noise({ when: t, filter: 'bandpass', freq: 5200, q: 6, dur: 0.05, vol: 0.05 }); A.tone({ when: t + 0.01, type: 'sine', freq: 3100 + i * 300, dur: 0.18, vol: 0.012 }); },
        creak(k) { if (!A.ctx || now() - lastCreak < 380) return; lastCreak = now(); const t = A.now(), f = 80 + Math.random() * 50; A.tone({ when: t, type: 'sawtooth', freq: f, to: f * (0.72 + Math.random() * 0.2), glide: 0.3, dur: 0.36, vol: 0.022 + 0.04 * k, lp: 640, q: 7 }); A.noise({ when: t + 0.02, filter: 'bandpass', freq: 380 + Math.random() * 200, q: 9, dur: 0.28, vol: 0.02 * k }); },
        crinkle(k) { if (!A.ctx || now() - lastCrinkle < 140) return; lastCrinkle = now(); const t = A.now(); for (let i = 0; i < 6; i++) A.noise({ when: t + i * 0.028 + Math.random() * 0.02, filter: 'bandpass', freq: 2200 + Math.random() * 3800, q: 2.5, dur: 0.012 + Math.random() * 0.02, vol: 0.02 + 0.05 * k }); },
        snap() { if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'highpass', freq: 1400, dur: 0.1, vol: 0.28 }); A.tone({ when: t, type: 'square', freq: 210, to: 60, glide: 0.09, dur: 0.14, vol: 0.12, lp: 1300 }); A.noise({ when: t + 0.03, filter: 'bandpass', freq: 3400, to: 520, q: 1.4, dur: 0.42, vol: 0.14 }); },
        whistle() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 1500, to: 340, glide: 0.95, dur: 1.05, vol: 0.05 }); },
        boing(k) { if (!A.ctx) return; const t = A.now(), f = 150 + k * 40; A.tone({ when: t, type: 'triangle', freq: f, to: f * 0.5, glide: 0.4, dur: 0.5, vol: 0.06 + 0.1 * k }); A.tone({ when: t, type: 'sine', freq: f * 1.5, to: f * 0.8, glide: 0.3, dur: 0.35, vol: 0.04 * k }); },
        horn() { if (!A.ctx) return; const t = A.now(); [0, 0.3].forEach(d => { A.tone({ when: t + d, type: 'square', freq: 392, dur: 0.22, vol: 0.05, lp: 1800 }); A.tone({ when: t + d, type: 'square', freq: 494, dur: 0.22, vol: 0.045, lp: 1800 }); }); },
        ratchet() { if (!A.ctx || now() - lastRatchet < 70) return; lastRatchet = now(); A.click({ vol: 0.06 }); A.tone({ type: 'square', freq: 900, dur: 0.012, vol: 0.02, lp: 3000 }); },
        rumble() { if (!A.ctx) return; const t = A.now(); A.noise({ when: t, pink: true, filter: 'lowpass', freq: 150, dur: 1.8, attack: 0.35, vol: 0.32 }); for (let i = 0; i < 7; i++) A.wood(t + 0.2 + i * 0.17 + Math.random() * 0.08, 0.07, 0.32 + Math.random() * 0.2); },
        fog() { if (!A.ctx) return; A.noise({ pink: true, filter: 'bandpass', freq: 500, to: 1400, q: 0.6, dur: 1.6, attack: 0.7, vol: 0.12 }); },
        sad() { if (!A.ctx) return; const t = A.now(); ['G3', 'F#3', 'F3'].forEach((n, i) => A.tone({ when: t + i * 0.32, type: 'sawtooth', freq: A.note(n), dur: 0.3, vol: 0.05, lp: 900, attack: 0.02 })); A.tone({ when: t + 0.96, type: 'sawtooth', freq: A.note('E3'), to: A.note('D#3'), glide: 0.9, dur: 1.0, vol: 0.05, lp: 800, attack: 0.02 }); },
        roll() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 14; i++) A.noise({ when: t + i * 0.06, filter: 'bandpass', freq: 1800, q: 0.9, dur: 0.05, vol: 0.015 + i * 0.004 }); }
      };

      /* ---------------- layout ---------------- */
      let bgOK = false, layoutKey = '';
      const bg = document.createElement('canvas');
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.phone = W < 700; M.side = W >= 980 && H >= 620;
        let L0, xL;
        if (M.phone) { xL = Math.round(Math.min(96, W * 0.21)); L0 = clamp((W - xL - 44) / N, 38, 120); }
        else { const cliff = M.side ? 220 : 150; L0 = clamp(Math.min(140, (W - 2 * cliff) / N), 70, 140); xL = Math.round((W - (2 * cliff + N * L0)) / 2 + cliff); }
        M.L = L0; M.xL = xL; M.xR = xL + N * L0; M.s = L0 / 120; M.ts = Math.min(clamp(L0, 52, 104) / 120, (xL - 12) / 128);
        M.yD = Math.round(H * (M.phone ? 0.47 : 0.5)); M.yF = Math.round(H * (M.phone ? 0.86 : 0.85));
        M.cableY = M.yD - Math.round(clamp(118 * M.s + 20, 56, 150));
        M.xM = xL + F * L0; M.mw = clamp(1.9 * 74 * M.ts + 26, 74, 230);
        const key = W + 'x' + H; if (key !== layoutKey) { layoutKey = key; rebuildWorld(); }
        placeDom();
        bgOK = false;
      }
      S.on('theme', () => { bgOK = false; });
      function placeDom() {
        const W = M.W, H = M.H, top = 60;
        // signs
        const sw = Math.min(M.phone ? 236 : 300, W - 24);
        Object.assign(destSign.style, { left: Math.max(12, Math.min(W - 12 - sw, M.xR + (M.phone ? -sw + 34 : 30))) + 'px', top: (M.yD - (M.phone ? 82 : 96)) + 'px', width: sw + 'px' });
        const fw = Math.min(M.phone ? 250 : 330, W - 24), fcx = clamp(M.xM + M.mw / 2, fw / 2 + 12, W - fw / 2 - 12);
        Object.assign(fairSign.style, { left: fcx + 'px', top: (M.yD - (M.phone ? 76 : 92)) + 'px', width: fw + 'px' });
        // readout
        const rw = Math.min(M.phone ? W - 24 : 520, W - 24);
        Object.assign(read.style, { left: Math.round((W - rw) / 2) + 'px', top: (M.phone ? top + 86 : top + 6) + 'px', width: rw + 'px' });
        // tray + send
        const csz = M.phone ? 64 : (M.side ? 104 : 84), bottomPad = M.phone ? 14 + csz + 50 : 28;
        const tw = Math.min(M.phone ? W - 24 : 520, W - 24);
        Object.assign(tray.style, { left: Math.round((W - tw) / 2) + 'px', width: tw + 'px', bottom: bottomPad + 'px' });
        Object.assign(sendWrap.style, { left: '0px', width: W + 'px', bottom: (bottomPad + 2) + 'px' });
        // characters: bottom corners; their bubbles grow upward between them
        const y = H - 14 - csz, bw = M.side ? Math.min(300, (W - tw) / 2 - csz - 40) : W - 2 * (10 + csz) - 2 * 10 - 8;
        [[rush, 10, 'right'], [glitch, W - 10 - csz, 'left']].forEach(([c, x, side]) => { c.el.style.setProperty('--sz', csz + 'px'); c.place(x, y); c.side(side); c.el.classList.add('lt-low'); c.el.style.setProperty('--lt-bub', Math.max(150, Math.min(300, bw)) + 'px'); });
      }

      /* ---------------- physics world for the current bridge ---------------- */
      const KP = () => { const s = M.s; return { mT: 1, mC: 0.5, alStretchT: 4e-6, alBendT: 2e-6, alStretchC: 2.2e-4, alBendC: 5e-4, sagSnap: 15 * s + 3, tear: 0.85 }; };
      const KT = () => { const t = M.ts; return { mW: 6, r: 12 * t, wb: 66 * t, v: 92 * M.s + 18, acc: 620 * M.s + 120 }; };
      const bays = [];
      function bayList() { const n = st.mode === 'B' ? F : N; const out = []; for (let i = 0; i < n; i++) out.push({ i, x0: M.xL + i * M.L, x1: M.xL + (i + 1) * M.L, cx: M.xL + (i + 0.5) * M.L }); return out; }
      function rebuildWorld() {
        // keep what's been built: re-place every placed plank at the new geometry, straight and still
        const kept = bays.map(b => b.item ? { item: b.item, i: b.i } : null).filter(Boolean);
        sim.reset();
        sim.g = 1400 * M.s + 200; sim.floorY = M.yF - 6;
        bays.length = 0; bayList().forEach(b => bays.push(b));
        kept.forEach(k => { const b = bays[k.i]; if (b && (!k.item.pk || !k.item.pk.snapped)) spawnPlank(b, k.item, true); });
        sim.addStatic(-400, M.yD, M.xL, M.yD);
        if (st.mode === 'A') sim.addStatic(M.xR, M.yD, M.W + 400, M.yD);
        else sim.addStatic(M.xM, M.yD, M.xM + M.mw, M.yD);
        const k = KT(), park = parkX();
        T = sim.addTruck(park - k.wb, M.yD - k.r, k);
        rope = sim.addRope(T.R, park - k.wb, M.cableY, 1e9, 2.2e-3, 3);
        sim.onSnap = onSnap; sim.onTear = onTear;
      }
      const parkX = () => M.xL - 14 * M.ts;   // front wheel parks just short of the edge
      function spawnPlank(b, item, still) {
        const kind = item.kind === 'fact' ? 'timber' : 'card';
        const pk = sim.addPlank(kind, b.x0, M.yD, b.x1, M.yD, KP(), { item, bay: b.i, taped: !!item.taped });
        if (!still) pk.nodes.forEach((p, i) => { if (i > 0 && i < 4) { p.vy = (kind === 'timber' ? 120 : 210) * M.s; p.py = p.y - p.vy / 600; } });
        b.item = item; item.pk = pk;
        return pk;
      }

      /* ---------------- events from the solver ---------------- */
      function onSnap(pk, node) {
        st.snaps++;
        SND.snap();
        if (!K.reduced()) { st.shake = Math.max(st.shake, (st.snaps === 1 ? 7 : 3) * M.s + 2); if (st.snaps === 1 && st.mode === 'A') { st.slow = 0.38; st.slowUntil = now() + 900; } }
        P.emit('dust', node.x, node.y, 16, { colors: ['rgba(214,184,140,0.7)', 'rgba(240,220,190,0.6)'], speed: [30, 120] });
        P.emit('confetti', node.x, node.y, 18, { colors: ['#d8b47a', '#c9a066', '#e9d3a5', '#a8834e'], speed: [60, 200], life: [1.2, 2.2] });
        [node, pk.split && pk.split.b].forEach(p => { if (p) { p.flutter = Math.random() * 6; p.flutterA = 160 * M.s; } });
        ctx.track('lt_snap', { mode: st.mode, n: st.snaps });
        if (st.mode === 'B' && pk.taped) return;
        if (st.phase === 'drive' && !st.said.drop) { st.said.drop = true; say(rush, L(LINES.drop), { mood: gentleTone ? 'surprised' : 'panic', ms: 1600 }); if (!gentleTone) rush.react('shake'); SND.whistle(); }
      }
      function onTear(pk) {
        pk.nodes.concat(pk.split ? [pk.split.b] : []).forEach(p => { p.drag = 2.8; p.flutter = Math.random() * 6; p.flutterA = 220 * M.s; });
        if (A.ctx) A.paper({ vol: 0.08, freq: 1800 });
      }

      /* ---------------- the plank card (drag it across) ---------------- */
      let card = null, curItem = null;
      function showCard(item, idx, total) {
        if (card) card.remove();
        curItem = item;
        const k = item.kind === 'fact' ? 'fact' : item.k;
        card = h('div', { class: 'lt-card ' + (item.kind === 'fact' ? 'fact' : 'card') + (item.taped ? ' taped' : ''), role: 'button', tabindex: '0', 'aria-label': KIND_NAME[k] + ': ' + item.text + '. Drag it onto the bridge, or press Enter.' },
          h('span', { class: 'lt-badge ' + (item.kind === 'fact' ? 'fact' : 'card'), html: ICON[k] }),
          h('span', { class: 'lt-cl' }, h('small', { text: KIND_NAME[k] }), h('span', { class: item.user ? 'gk-user' : 'lt-gen', text: item.text })),
          total ? h('i', { class: 'lt-count', text: (idx + 1) + '/' + total, 'aria-hidden': 'true' }) : null);
        tray.insertBefore(card, crate);
        bindCard(card);
        st.ready = true;
      }
      function curBay() { return bays.find(b => !b.item); }
      function bayPoint(b) { return { x: b.cx, y: M.yD }; }
      function cardGuide(delay) {
        if (!card || !curItem) return;
        const r = K.rectIn(card);
        if (st.mode === 'B' && curItem.kind !== 'fact') { const c = K.rectIn(crate); K.guide({ id: 'crate' + st.placed, g: 'drag', target: card, ox: 0.3, dx: c.cx - (r.x + r.w * 0.3), dy: c.cy - r.cy, label: 'DRAG TO MAYBE CRATE', place: 'above', delay: delay || 800, ms: 2200 }); return; }
        const b = curBay(); if (!b) return;
        const bp = bayPoint(b);
        K.guide({ id: 'plank' + st.mode + st.placed, g: 'drag', target: card, dx: bp.x - r.cx, dy: bp.y - r.cy, label: 'DRAG ONTO THE BRIDGE', place: 'above', delay: delay || 800, ms: 2200 });
      }
      const trayTop = () => { const r = K.rectIn(tray); return r.y; };
      function bindCard(c) {
        K.drag(c, {
          space: el,
          start: (p) => {
            if (st.phase !== 'place' || !st.ready || c !== card) return false;
            const r = K.rectIn(c), gh = c.cloneNode(true);
            gh.classList.add('lt-ghost'); gh.removeAttribute('tabindex'); gh.removeAttribute('role');
            Object.assign(gh.style, { width: r.w + 'px', height: r.h + 'px', transform: 'translate3d(' + r.x + 'px,' + r.y + 'px,0)' });
            el.append(gh); c.classList.add('lift');
            st.drag = { gh, ox: p.x - r.x, oy: p.y - r.y, r, x: r.x, y: r.y, rot: 0, vx: 0, ty: trayTop(), crate: crate.hidden ? null : K.rectIn(crate), lastX: p.x, lt: now() };
            if (A.ctx) { A.wood(undefined, 0.08, item0Pitch()); A.paper({ vol: 0.05 }); }
          },
          move: (p) => { const d = st.drag; if (!d) return; moveGhost(p); },
          end: (p) => { const d = st.drag; if (!d) return; st.drag = null; dropAt(p, d); }
        });
        S.listen(c, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'place' && c === card) { e.preventDefault(); const target = st.mode === 'B' && curItem.kind !== 'fact' ? 'crate' : 'bay'; if (target === 'crate') toCrate(null); else { const b = curBay(); if (b) place(b, 1, null); } } });
      }
      const item0Pitch = () => (curItem && curItem.kind === 'fact' ? 0.7 : 1.1);
      function moveGhost(p) {
        const d = st.drag, t = now(), dt = Math.max(1, t - d.lt);
        d.vx = d.vx * 0.7 + ((p.x - d.lastX) / dt * 1000) * 0.3; d.lastX = p.x; d.lt = t;
        d.x = p.x - d.ox; d.y = p.y - d.oy;
        const prog = clamp((d.ty - p.y) / Math.max(60, d.ty - M.yD), 0, 1);
        const kTarget = clamp((M.L + 20) / d.r.w, 0.28, 0.7), k = 1 - (1 - kTarget) * Math.pow(prog, 1.3);
        d.rot += (clamp(d.vx * 0.012, -14, 14) - d.rot) * 0.35;
        d.gh.style.transform = 'translate3d(' + d.x.toFixed(1) + 'px,' + d.y.toFixed(1) + 'px,0) rotate(' + d.rot.toFixed(1) + 'deg) scale(' + k.toFixed(3) + ')';
        const hot = target(p, d);
        if (hot !== st.hot) {
          st.hot = hot; crate.classList.toggle('hot', hot === 'crate');
          if (hot && A.ctx) A.tone({ type: 'sine', freq: hot === 'crate' ? 520 : 880, dur: 0.06, vol: 0.03 });
        }
      }
      function target(p, d) {
        if (d && d.crate && p.x > d.crate.x - 24 && p.x < d.crate.x + d.crate.w + 24 && p.y > d.crate.y - 30 && p.y < d.crate.y + d.crate.h + 20) return 'crate';
        const b = curBay(); if (!b) return null;
        const yLim = (d ? d.ty : M.yD + 200) - 26;
        if (p.y < yLim && p.y > M.cableY - 70 && p.x > M.xL - 70 && p.x < (st.mode === 'B' ? M.xM : M.xR) + 70) return 'bay';
        return null;
      }
      function dropAt(p, d) {
        const hot = target(p, d); st.hot = null; crate.classList.remove('hot');
        if (hot === 'bay') { const b = curBay(); const prec = clamp(1 - Math.max(0, Math.abs(p.x - b.cx) - 0.12 * M.L) / (0.6 * M.L + 34), 0, 1); place(b, prec, d); return; }
        if (hot === 'crate') { toCrate(d); return; }
        // back to the tray
        K.sfx.soft();
        d.gh.style.transition = 'transform .3s cubic-bezier(.2,1.3,.4,1)'; d.gh.style.transform = 'translate3d(' + d.r.x + 'px,' + d.r.y + 'px,0)';
        K.later(() => { d.gh.remove(); if (card) card.classList.remove('lift'); }, 320);
        cardGuide(1300);
      }
      function flyGhost(d, x, y, k, cb) {
        if (!d) { cb(); return; }
        const w = d.r.w, hh = d.r.h;
        d.gh.style.transition = 'transform .16s cubic-bezier(.4,0,.6,1), opacity .16s ease';
        d.gh.style.transform = 'translate3d(' + (x - w / 2) + 'px,' + (y - hh / 2) + 'px,0) scale(' + k + ')'; d.gh.style.opacity = '0.2';
        K.later(() => { d.gh.remove(); cb(); }, 170);
      }
      function place(b, prec, d) {
        const item = curItem; if (!item) return;
        // the rebuild only takes timber: taped cardboard slumps out of the bay and comes back to the tray
        if (st.mode === 'B' && item.kind !== 'fact') { wrongBay(b, d); return; }
        st.ready = false; K.guide(null);
        if (card) { card.remove(); card = null; }
        flyGhost(d, b.cx, M.yD, clamp(M.L / (d ? d.r.w : 200), 0.2, 0.6), () => {
          spawnPlank(b, item, false);
          SND.place(item.kind); SND.bolt(0); SND.bolt(1);
          P.emit('spark', b.x0, M.yD, 6, { colors: ['#ffe08a', '#ffffff'], speed: [40, 120] }); P.emit('spark', b.x1, M.yD, 6, { colors: ['#ffe08a', '#ffffff'], speed: [40, 120] });
          P.emit('dust', b.cx, M.yD + 4, 8, { colors: ['rgba(230,200,160,0.55)'] });
          st.prec.push(prec);
          const word = prec >= 0.85 ? 'PERFECT FIT' : prec >= 0.55 ? 'NICE' : 'BOLTED';
          K.pop(word, { x: clamp(b.cx, 70, M.W - 70), y: M.yD - 30 - 22 * M.s, kind: prec >= 0.85 ? 'great' : 'good' });
          if (prec >= 0.85 && A.ctx) A.chime(A.note(['E5', 'G#5', 'B5', 'E6', 'G#6', 'B6'][Math.min(5, st.placed)]), { vol: 0.06, dur: 1 });
          st.placed++; item.placed = true;
          if (st.mode === 'A' && item.kind === 'fact' && !st.said.fact1) { st.said.fact1 = true; say(glitch, L(LINES.fact1), { mood: 'happy', ms: 2400 }); }
          if (st.mode === 'B' && item.kind === 'fact' && !st.said.factB) { st.said.factB = true; rush.face('happy', 1400); }
          ctx.track('lt_place', { mode: st.mode, kind: item.k, prec: Math.round(prec * 100) });
          st.placing = null;
        });
      }
      function wrongBay(b, d) {
        st.ready = false; K.guide(null); st.wrong++;
        flyGhost(d, b.cx, M.yD, clamp(M.L / (d ? d.r.w : 200), 0.2, 0.6), () => {
          const pk = spawnPlank(b, curItem, false); pk.soggy = 30; b.item = null; curItem.pk = null;
          SND.place('card'); SND.crinkle(0.8);
          say(glitch, L(LINES.wrongBay), { mood: 'facepalm', ms: 2600 });
          K.later(() => { if (!pk.snapped) sim.snap(pk, 2); }, 650);
          K.later(() => { if (card) { card.classList.remove('lift'); card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; } st.ready = true; cardGuide(500); }, 1300);
        });
      }
      function toCrate(d) {
        const item = curItem;
        if (item.kind === 'fact') {
          st.wrong++; K.sfx.no(); say(glitch, L(LINES.wrongCrate), { mood: 'gasp', ms: 2400 });
          if (d) { d.gh.style.transition = 'transform .35s cubic-bezier(.2,1.3,.4,1)'; d.gh.style.transform = 'translate3d(' + d.r.x + 'px,' + d.r.y + 'px,0)'; K.later(() => { d.gh.remove(); if (card) card.classList.remove('lift'); }, 360); }
          cardGuide(1400); return;
        }
        st.ready = false; K.guide(null);
        const c = K.rectIn(crate);
        if (card) { card.remove(); card = null; }
        flyGhost(d, c.cx, c.cy, 0.3, () => {
          st.crated++; crate.firstChild.textContent = String(st.crated);
          crate.classList.add('hot'); K.later(() => crate.classList.remove('hot'), 260);
          if (A.ctx) { A.wood(undefined, 0.16, 0.5); A.paper({ vol: 0.1 }); A.chime(A.note('B5'), { vol: 0.05, dur: 0.9 }); }
          P.emit('dust', c.cx, c.y, 6, { colors: ['rgba(230,200,160,0.6)'] });
          if (!st.said.crated) { st.said.crated = true; say(glitch, L(LINES.crated), { mood: 'happy', ms: 2600 }); }
          item.placed = true; st.placing = null;
          ctx.track('lt_crate', { k: item.k });
        });
      }

      /* ---------------- render ---------------- */
      const RIV = [];
      function renderBg() {
        const W = M.W, H = M.H, d = cv.dpr || 1, br = bright(), C = canyon;
        bg.width = Math.max(2, Math.round(W * d)); bg.height = Math.max(2, Math.round(H * d));
        const g = bg.getContext('2d', { alpha: false }); g.setTransform(d, 0, 0, d, 0, 0);
        const yD = M.yD, yF = M.yF, R = rng(4242 + K.daily() % 97);
        // sky
        let gr = g.createLinearGradient(0, 0, 0, yD + 40);
        if (br) { gr.addColorStop(0, '#5fb3ec'); gr.addColorStop(0.55, '#a8dcf3'); gr.addColorStop(1, '#ffe8c8'); }
        else { gr.addColorStop(0, '#121638'); gr.addColorStop(0.5, '#43285a'); gr.addColorStop(0.86, '#c2564a'); gr.addColorStop(1, '#f39a55'); }
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        if (!br) { g.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { g.globalAlpha = 0.25 + R() * 0.6; const s = R() < 0.1 ? 1.8 : 1.1; g.fillRect(R() * W, R() * yD * 0.62, s, s); } g.globalAlpha = 1; }
        // sun / moon
        const sx = W * (M.phone ? 0.24 : 0.2), sy = yD - (br ? 0.62 : 0.2) * (yD - 60);
        gr = g.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.45);
        gr.addColorStop(0, rgba(br ? '#fff6d8' : '#ffc27a', br ? 0.75 : 0.65)); gr.addColorStop(0.25, rgba(br ? '#fff1c4' : '#ff9a5a', 0.25)); gr.addColorStop(1, rgba('#ffffff', 0));
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.fillStyle = br ? '#fffbe8' : '#ffe1a8'; g.beginPath(); g.arc(sx, sy, br ? 22 : 30, 0, TAU); g.fill();
        if (!br) { const mx = W * 0.86, my = Math.max(118, yD * 0.3), mr = M.phone ? 13 : 17; const mg = g.createRadialGradient(mx, my, 0, mx, my, mr * 5); mg.addColorStop(0, 'rgba(230,236,255,0.32)'); mg.addColorStop(1, 'rgba(230,236,255,0)'); g.fillStyle = mg; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10); g.fillStyle = '#f3f1ff'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill(); g.fillStyle = '#262148'; g.beginPath(); g.arc(mx + mr * 0.42, my - mr * 0.22, mr * 0.9, 0, TAU); g.fill(); }
        // distant mesas (two hazy layers)
        [[0.52, 0.55, 0.62], [0.36, 0.3, 0.8]].forEach(([haze, hgt, base], li) => {
          const col = br ? mixHex(C.far, '#bfe4f5', haze) : mixHex(mixHex(C.deep, '#5a2f5e', 0.5), '#c2564a', haze * 0.6);
          g.fillStyle = col; g.beginPath(); const yb = yD - 6 + li * 4; g.moveTo(0, yb);
          let x = 0; while (x < W) { const w = 40 + R() * 120, tall = (0.25 + R() * hgt) * (yD - 70) * (li ? 0.55 : 0.4); if (R() < 0.55) { g.lineTo(x + 8, yb - tall); g.lineTo(x + w - 8, yb - tall); g.lineTo(x + w, yb); } else { g.quadraticCurveTo(x + w / 2, yb - tall * 0.5, x + w, yb); } x += w; }
          g.lineTo(W, yb); g.lineTo(W, yb + 10); g.lineTo(0, yb + 10); g.closePath(); g.fill();
          void base;
        });
        // the far canyon wall behind the bridge
        const back = br ? mixHex(C.rock, '#8fb8d8', 0.35) : mixHex(C.deep, '#2a1838', 0.35);
        gr = g.createLinearGradient(0, yD - 12, 0, yF); gr.addColorStop(0, br ? mixHex(C.band, '#c9e6f2', 0.3) : mixHex(C.rock, '#3b2140', 0.45)); gr.addColorStop(0.35, back); gr.addColorStop(1, br ? mixHex(C.deep, '#3c4e6a', 0.35) : '#1c1020');
        g.fillStyle = gr; g.fillRect(0, yD - 12, W, yF - yD + 12);
        g.globalAlpha = br ? 0.16 : 0.2;
        for (let y = yD + 10; y < yF; y += 14 + R() * 18) { g.fillStyle = R() < 0.5 ? (br ? '#ffffff' : C.band) : (br ? C.deep : '#000000'); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 3); g.lineTo(W, y + 5); g.lineTo(0, y + 5); g.closePath(); g.fill(); }
        g.globalAlpha = 1;
        // canyon floor + river
        gr = g.createLinearGradient(0, yF - 8, 0, H); gr.addColorStop(0, br ? mixHex(C.band, '#d9b48a', 0.5) : mixHex(C.deep, '#120a14', 0.4)); gr.addColorStop(1, br ? mixHex(C.deep, '#5a3a2a', 0.4) : '#0a0610');
        g.fillStyle = gr; g.fillRect(0, yF - 8, W, H - yF + 8);
        const ry = yF + 6, rh = Math.max(14, (H - yF) * 0.34);
        gr = g.createLinearGradient(0, ry, 0, ry + rh); gr.addColorStop(0, br ? mixHex(C.river, '#ffffff', 0.25) : mixHex(C.river, '#0d1a3a', 0.45)); gr.addColorStop(1, br ? C.river : mixHex(C.river, '#05081a', 0.65));
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, ry + 3); for (let x = 0; x <= W; x += 30) g.lineTo(x, ry + Math.sin(x * 0.03) * 2); g.lineTo(W, ry + rh); g.lineTo(0, ry + rh); g.closePath(); g.fill();
        RIV.length = 0; for (let i = 0; i < 26; i++) RIV.push({ x: R() * W, y: ry + 3 + R() * (rh - 6), w: 6 + R() * 18, p: R() * 6 });
        // near walls
        const wallL = [[M.xL, yD], [M.xL + 5, yD + 0.1 * (yF - yD)], [M.xL - 6, yD + 0.24 * (yF - yD)], [M.xL + 10, yD + 0.38 * (yF - yD)], [M.xL + 2, yD + 0.52 * (yF - yD)], [M.xL + 20, yD + 0.7 * (yF - yD)], [M.xL + 14, yD + 0.84 * (yF - yD)], [M.xL + 34, yF + 2]];
        drawRock(g, [[-20, yD]].concat(wallL, [[-20, yF + 2]]), 1, R, br, M.xL);
        const xr = st.mode === 'A' ? M.xR : Math.min(W - 24, M.xR + 36 * M.s + 10), wallR = [[xr, yD], [xr - 6, yD + 0.12 * (yF - yD)], [xr + 4, yD + 0.26 * (yF - yD)], [xr - 10, yD + 0.42 * (yF - yD)], [xr - 2, yD + 0.56 * (yF - yD)], [xr - 22, yD + 0.74 * (yF - yD)], [xr - 16, yD + 0.86 * (yF - yD)], [xr - 34, yF + 2]];
        const polyR = [[W + 20, yD]].concat(wallR, [[W + 20, yF + 2]]);
        drawRock(g, polyR, -1, R, br, xr);
        if (st.mode === 'B') {
          // the conclusion cliff recedes into the haze; a fair-thought mesa stands where the facts reach
          g.fillStyle = rgba(br ? '#dcecf5' : '#3a2448', br ? 0.6 : 0.62); g.beginPath(); polyR.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.lineTo(W + 20, yD - 8); g.lineTo(xr, yD - 8); g.closePath(); g.fill();
          if (!st.mesaRising) drawMesa(g, M.xM, M.mw, yD, yF, R, br, 1);
        }
        // trestles under the bridge joints
        const n = st.mode === 'B' ? F : N;
        for (let i = 1; i < n; i++) drawTrestle(g, M.xL + i * M.L, yD + 3, groundY(M.xL + i * M.L), br);
        drawCablePoles(g, br);
        // sign post for the conclusion sign
        if (st.mode === 'A') { const px = Math.min(M.W - 18, M.xR + Math.max(14, (M.W - M.xR) * 0.5)); post(g, px, yD - (M.phone ? 86 : 100), yD, br); }
        // the site: a lamp and a winch on the left rim
        site(g, br);
        bgOK = true; st.fullN = 2;
      }
      function groundY(x) { return M.yF - 4 + Math.sin(x * 0.05) * 2; }
      function drawRock(g, pts, side, R, br, ex) {
        const C = canyon, yD = M.yD, yF = M.yF;
        g.save(); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
        let gr = g.createLinearGradient(0, yD, 0, yF);
        gr.addColorStop(0, br ? C.band : mixHex(C.rock, '#2a1838', 0.35)); gr.addColorStop(0.3, br ? C.rock : mixHex(C.rock, '#2a1838', 0.5)); gr.addColorStop(1, br ? C.deep : mixHex(C.deep, '#0e0612', 0.55));
        g.fillStyle = gr; g.fill(); g.clip();
        // strata
        for (let y = yD + 8, k = 0; y < yF + 10; y += 10 + R() * 16, k++) {
          g.fillStyle = k % 2 ? rgba(br ? '#ffffff' : C.band, br ? 0.13 : 0.1) : rgba(br ? C.deep : '#000000', br ? 0.12 : 0.18);
          g.beginPath(); g.moveTo(-30, y); for (let x = -30; x <= M.W + 30; x += 24) g.lineTo(x, y + Math.sin(x * 0.03 + k) * 2.5); g.lineTo(M.W + 30, y + 4 + R() * 5); g.lineTo(-30, y + 6); g.closePath(); g.fill();
        }
        // sun-side light on the canyon faces, shade on the other
        gr = g.createLinearGradient(ex - side * 70, 0, ex, 0); gr.addColorStop(0, rgba('#000000', 0)); gr.addColorStop(1, side > 0 ? rgba('#000000', br ? 0.22 : 0.32) : rgba(br ? '#fff3d6' : '#ff9a5a', br ? 0.2 : 0.14));
        g.fillStyle = gr; g.fillRect(Math.min(ex - side * 70, ex), yD, 70, yF - yD + 10);
        // pebbles and tufts
        for (let i = 0; i < 26; i++) { const x = side > 0 ? R() * (ex - 6) : ex + 6 + R() * (M.W - ex), y = yD + 6 + R() * (yF - yD); g.fillStyle = rgba('#000000', 0.12); g.beginPath(); g.ellipse(x, y, 2 + R() * 4, 1 + R() * 2, 0, 0, TAU); g.fill(); }
        g.restore();
        // rim: a lit top edge and a dark lip
        const top = side > 0 ? [-20, ex] : [ex, M.W + 20];
        g.fillStyle = br ? mixHex(C.band, '#ffffff', 0.35) : mixHex(C.band, '#ffb27a', 0.2); g.fillRect(top[0], yD - 1, top[1] - top[0], 4);
        g.fillStyle = rgba('#000000', 0.25); g.fillRect(top[0], yD + 3, top[1] - top[0], 3);
        for (let i = 0; i < 5; i++) { const x = top[0] + 10 + R() * (top[1] - top[0] - 20); tuft(g, x, yD, br); }
      }
      function tuft(g, x, y, br) { g.strokeStyle = br ? canyon.tuft : mixHex(canyon.tuft, '#1a1030', 0.45); g.lineWidth = 1.6; g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(x + k * 1.6, y); g.lineTo(x + k * 3, y - 5 - Math.abs(2 - Math.abs(k)) * 2); } g.stroke(); }
      function drawMesa(g, x, w, top, bottom, R, br, k) {
        const C = canyon, y0 = bottom - (bottom - top) * k;
        g.save(); g.beginPath(); g.moveTo(x - 4, y0); g.lineTo(x + w + 4, y0); g.lineTo(x + w + 14, bottom + 4); g.lineTo(x - 14, bottom + 4); g.closePath();
        let gr = g.createLinearGradient(0, y0, 0, bottom); gr.addColorStop(0, br ? C.band : mixHex(C.band, '#3b2140', 0.4)); gr.addColorStop(0.4, br ? C.rock : mixHex(C.rock, '#2a1838', 0.45)); gr.addColorStop(1, br ? C.deep : mixHex(C.deep, '#0e0612', 0.5));
        g.fillStyle = gr; g.fill(); g.clip();
        for (let y = y0 + 8, i = 0; y < bottom; y += 9 + (i * 7) % 11, i++) { g.fillStyle = i % 2 ? rgba('#ffffff', br ? 0.14 : 0.08) : rgba('#000000', 0.14); g.fillRect(x - 20, y, w + 40, 4); }
        gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, rgba(br ? '#fff3d6' : '#ff9a5a', 0.18)); gr.addColorStop(1, rgba('#000000', 0.25)); g.fillStyle = gr; g.fillRect(x - 20, y0, w + 40, bottom - y0 + 4);
        g.restore();
        g.fillStyle = br ? mixHex(C.band, '#ffffff', 0.35) : mixHex(C.band, '#ffb27a', 0.2); g.fillRect(x - 4, y0 - 1, w + 8, 4);
        // a little overlook: rail posts along the far edge
        const rh = 12 * M.s + 6, rx0 = x + w * 0.62, rx1 = x + w - 3;
        g.strokeStyle = br ? '#6b4122' : '#3e2414'; g.lineWidth = 2; g.beginPath();
        for (let px = rx0; px <= rx1 + 0.1; px += Math.max(7, (rx1 - rx0) / 4)) { g.moveTo(px, y0); g.lineTo(px, y0 - rh); }
        g.moveTo(rx0 - 1, y0 - rh); g.lineTo(rx1 + 1, y0 - rh); g.moveTo(rx0, y0 - rh * 0.5); g.lineTo(rx1, y0 - rh * 0.5); g.stroke();
        tuft(g, x + w * 0.2, y0, br); tuft(g, x + w * 0.45, y0, br);
        void R;
      }
      function drawTrestle(g, x, y0, y1, br) {
        const wood = br ? 'rgba(122,74,36,0.82)' : 'rgba(70,40,24,0.85)', hi = br ? 'rgba(214,160,100,0.7)' : 'rgba(150,96,60,0.55)', spread = 7 + (y1 - y0) * 0.07;
        g.lineCap = 'round';
        g.strokeStyle = wood; g.lineWidth = Math.max(3, 4 * M.s + 1);
        g.beginPath(); g.moveTo(x - 3, y0); g.lineTo(x - spread, y1); g.moveTo(x + 3, y0); g.lineTo(x + spread, y1); g.stroke();
        g.lineWidth = Math.max(1.2, 1.6 * M.s + 0.4); g.beginPath();
        const n = Math.max(2, Math.round((y1 - y0) / (44 * M.s + 18)));
        for (let i = 0; i < n; i++) { const a = y0 + (y1 - y0) * i / n, b = y0 + (y1 - y0) * (i + 1) / n, wa = 3 + (spread - 3) * i / n, wb = 3 + (spread - 3) * (i + 1) / n; g.moveTo(x - wa, a); g.lineTo(x + wb, b); g.moveTo(x + wa, a); g.lineTo(x - wb, b); g.moveTo(x - wb, b); g.lineTo(x + wb, b); }
        g.stroke();
        g.strokeStyle = hi; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 2, y0); g.lineTo(x - spread + 1, y1); g.stroke();
        g.fillStyle = br ? '#4a2c14' : '#24140a'; g.fillRect(x - 7 * M.s - 4, y0 - 2, 14 * M.s + 8, 4);
      }
      function drawCablePoles(g, br) {
        const xr = st.mode === 'A' ? M.xR + 8 : M.xM + M.mw * 0.5;
        [[M.xL - 8, M.yD], [xr, M.yD]].forEach(([x, y]) => { post(g, x, M.cableY - 6, y, br); g.fillStyle = br ? '#ffcf5a' : '#ffd77a'; g.beginPath(); g.arc(x, M.cableY - 6, 3.2, 0, TAU); g.fill(); });
        g.strokeStyle = br ? 'rgba(40,30,30,0.75)' : 'rgba(255,230,200,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(M.xL - 8, M.cableY - 6); g.quadraticCurveTo((M.xL + xr) / 2, M.cableY + 6, xr, M.cableY - 6); g.stroke();
        M.cableR = xr;
      }
      function post(g, x, y0, y1, br) { g.fillStyle = br ? '#5d4a3a' : '#2a1f1c'; g.fillRect(x - 2.5, y0, 5, y1 - y0); g.fillStyle = br ? '#8c7560' : '#4a3a33'; g.fillRect(x - 2.5, y0, 1.6, y1 - y0); }
      function site(g, br) {
        // winch drum at the back of the left rim, a work lamp, a hazard stripe at the edge
        const x = M.xL - 8, y = M.yD;
        g.fillStyle = br ? '#2b2f3a' : '#171a22'; rr(g, x - 26, y - 14, 18, 12, 3); g.fill();
        g.fillStyle = '#ffcf5a'; for (let i = 0; i < 4; i++) g.fillRect(x - 12 - i * 9, y + 4, 5, 3);
        if (!br) { const lg = g.createRadialGradient(x - 18, y - 30, 0, x - 18, y - 30, 90); lg.addColorStop(0, rgba(canyon.lamp, 0.35)); lg.addColorStop(1, rgba(canyon.lamp, 0)); g.fillStyle = lg; g.fillRect(x - 110, y - 120, 190, 180); }
      }

      /* ---------------- dynamic draw ---------------- */
      function plankPolys(pk) { return pk.pieces.map(arr => arr.filter(p => p && p.on !== false)); }
      function strokePoly(g, pts, off) {
        g.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
          const x = pts[i].x + nx * off, y = pts[i].y + ny * off;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
      function drawPlank(g, pk, t, br) {
        const th = Math.max(11, 0.19 * M.L), timber = pk.kind === 'timber';
        const base = timber ? '#c78442' : (pk.taped ? '#d4b07a' : '#dcbd85'), dark = timber ? '#5e3212' : '#8e6c3c', light = timber ? '#f2be7c' : '#f3dfb6';
        const glow = st.lights > 0 && timber;
        g.lineJoin = 'round'; g.lineCap = timber ? 'round' : 'butt';
        plankPolys(pk).forEach(pts => {
          if (pts.length < 2) return;
          g.strokeStyle = dark; g.lineWidth = th + 2.5; strokePoly(g, pts, 0);
          g.strokeStyle = base; g.lineWidth = th; strokePoly(g, pts, 0);
          g.strokeStyle = light; g.lineWidth = Math.max(1.5, th * 0.2); strokePoly(g, pts, -th * 0.27);
          if (timber) { g.strokeStyle = rgba('#6b3a14', 0.55); g.lineWidth = 1; g.setLineDash([7, 4, 12, 5]); strokePoly(g, pts, th * 0.12); g.setLineDash([3, 6, 10, 4]); strokePoly(g, pts, -th * 0.03); g.setLineDash([]); }
          else {
            g.strokeStyle = rgba('#7a5a2a', 0.45); g.lineWidth = 1; g.setLineDash([1.2, 2.6]); strokePoly(g, pts, th * 0.05); g.setLineDash([]);
            if (pk.taped && pts.length > 2) { const m = pts[Math.floor(pts.length / 2)], n2 = pts[Math.floor(pts.length / 2) - 1]; const ang = Math.atan2(m.y - n2.y, m.x - n2.x); g.save(); g.translate(m.x, m.y); g.rotate(ang + 0.15); g.fillStyle = 'rgba(232,236,240,0.85)'; g.fillRect(-4, -th * 0.75, 8, th * 1.5); g.restore(); }
          }
        });
        // bolts on the pinned ends
        pk.pins.forEach(c => { if (!c.on) return; const p = c.a; g.fillStyle = timber ? '#3a2410' : '#6a4a20'; g.beginPath(); g.arc(p.x + (p === pk.nodes[0] ? 4 : -4) * M.s, p.y, Math.max(1.6, 2.4 * M.s), 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,200,0.8)'; g.fillRect(p.x + (p === pk.nodes[0] ? 3.4 : -4.6) * M.s, p.y - 1, 1.2, 1.2); });
        // the kind mark in the middle: a camera for facts, a thought for guesses, a heart for the feeling
        if (!pk.snapped) {
          const a = pk.nodes[1], b = pk.nodes[3], m = pk.nodes[2], ang = Math.atan2(b.y - a.y, b.x - a.x), s = th * 0.36;
          g.save(); g.translate(m.x, m.y); g.rotate(ang); g.fillStyle = timber ? rgba('#3a1e08', 0.75) : rgba('#5a3e14', 0.7);
          const k = pk.item ? (pk.item.kind === 'fact' ? 'fact' : pk.item.k) : 'fact';
          if (k === 'fact') { rr(g, -s * 1.3, -s * 0.8, s * 2.6, s * 1.7, s * 0.4); g.fill(); g.fillStyle = timber ? '#e7aa62' : '#dcbd85'; g.beginPath(); g.arc(0, 0.05 * s, s * 0.52, 0, TAU); g.fill(); }
          else if (k === 'feel') { g.beginPath(); g.moveTo(0, s * 0.9); g.bezierCurveTo(-s * 1.6, -s * 0.1, -s * 0.8, -s * 1.3, 0, -s * 0.45); g.bezierCurveTo(s * 0.8, -s * 1.3, s * 1.6, -s * 0.1, 0, s * 0.9); g.fill(); }
          else if (k === 'leap') { g.lineWidth = Math.max(1.4, s * 0.45); g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(-s * 1.2, s * 0.6); g.quadraticCurveTo(0, -s * 1.1, s * 1.2, -s * 0.1); g.stroke(); }
          else { g.lineWidth = Math.max(1.4, s * 0.42); g.strokeStyle = g.fillStyle; g.lineCap = 'round'; g.beginPath(); g.arc(0, -s * 0.35, s * 0.55, Math.PI * 1.05, Math.PI * 2.35); g.quadraticCurveTo(0, s * 0.05, 0, s * 0.35); g.stroke(); g.beginPath(); g.arc(0, s * 0.85, s * 0.22, 0, TAU); g.fill(); }
          g.restore();
        }
        if (glow) { const i = bays.findIndex(b => b.item && b.item.pk === pk); const on = st.lights > i + 0.5; if (on) { [pk.nodes[0], pk.nodes[2], pk.nodes[4]].forEach((p, k2) => { const tw = 0.75 + 0.25 * Math.sin(t * 5 + i + k2); g.globalAlpha = tw; g.drawImage(K.glowSprite('#ffd77a'), p.x - 12, p.y - th - 14, 24, 24); g.fillStyle = '#fff6cf'; g.beginPath(); g.arc(p.x, p.y - th - 2, 2.2, 0, TAU); g.fill(); }); g.globalAlpha = 1; } }
        void br;
      }
      function drawRope(g) {
        if (!T || !rope) return;
        const hx = T.R.x, hy = T.R.y - T.K.r * 1.6;
        const ax = rope.x, ay = M.cableY - 4;
        // trolley
        g.fillStyle = bright() ? '#2b2f3a' : '#d8dde8'; rr(g, ax - 8, ay - 5, 16, 8, 3); g.fill();
        g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(ax - 4, ay - 5, 2.6, 0, TAU); g.arc(ax + 4, ay - 5, 2.6, 0, TAU); g.fill();
        // the line: slack sags, taut is straight
        const d = Math.hypot(hx - ax, hy - ay), slack = rope.rest > 1e8 ? 18 * M.s + 4 : Math.max(0, rope.rest - d) * 0.6;
        g.strokeStyle = rope.taut ? '#ffcf5a' : (bright() ? 'rgba(60,40,20,0.85)' : 'rgba(255,220,170,0.8)'); g.lineWidth = rope.taut ? 2.2 : 1.6;
        g.beginPath(); g.moveTo(ax, ay + 2); g.quadraticCurveTo((ax + hx) / 2 - slack * 0.3, (ay + hy) / 2 + slack, hx, hy); g.stroke();
      }
      const truckAng = () => (T ? Math.atan2(T.F.y - T.R.y, T.F.x - T.R.x) : 0);
      function drawTruck(g, t) {
        if (!T) return;
        const k = T.K, wb = k.wb, r = k.r, ang = truckAng(), cx = (T.R.x + T.F.x) / 2, cy = (T.R.y + T.F.y) / 2;
        const bounce = T.bounce || 0;
        g.save(); g.translate(cx, cy); g.rotate(ang);
        const by = -r * 0.55 + bounce;
        // shadow
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(0, r * 0.9, wb * 0.95, r * 0.35, 0, 0, TAU); g.fill();
        // chassis
        g.fillStyle = '#2a2622'; rr(g, -wb * 0.92, by - r * 0.9, wb * 1.84, r * 0.85, r * 0.3); g.fill();
        // flatbed + cargo crate
        g.fillStyle = skin.body; rr(g, -wb * 0.95, by - r * 2.0, wb * 1.06, r * 1.2, r * 0.25); g.fill();
        g.fillStyle = skin.dark; g.fillRect(-wb * 0.95, by - r * 1.05, wb * 1.06, r * 0.18);
        g.fillStyle = '#b07a3c'; rr(g, -wb * 0.78, by - r * 3.15, wb * 0.72, r * 1.2, r * 0.15); g.fill();
        g.strokeStyle = '#6b3a14'; g.lineWidth = Math.max(1, r * 0.12); g.strokeRect(-wb * 0.78, by - r * 3.15, wb * 0.72, r * 1.2);
        g.beginPath(); g.moveTo(-wb * 0.78, by - r * 3.15); g.lineTo(-wb * 0.06, by - r * 1.95); g.stroke();
        // cab
        g.fillStyle = skin.body; g.beginPath(); g.moveTo(wb * 0.12, by - r * 0.9); g.lineTo(wb * 0.12, by - r * 3.1); g.quadraticCurveTo(wb * 0.14, by - r * 3.5, wb * 0.5, by - r * 3.5); g.lineTo(wb * 0.66, by - r * 3.4); g.lineTo(wb * 0.94, by - r * 2.0); g.lineTo(wb * 1.02, by - r * 1.85); g.lineTo(wb * 1.02, by - r * 0.9); g.closePath(); g.fill();
        g.fillStyle = skin.trim; g.fillRect(wb * 0.12, by - r * 1.65, wb * 0.9, r * 0.28);
        g.fillStyle = '#bfe6ff'; g.beginPath(); g.moveTo(wb * 0.24, by - r * 2.0); g.lineTo(wb * 0.24, by - r * 3.15); g.lineTo(wb * 0.58, by - r * 3.15); g.lineTo(wb * 0.82, by - r * 2.0); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(wb * 0.3, by - r * 2.1); g.lineTo(wb * 0.3, by - r * 2.6); g.lineTo(wb * 0.46, by - r * 3.05); g.lineTo(wb * 0.4, by - r * 2.1); g.closePath(); g.fill();
        // driver: a little helmet
        g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(wb * 0.44, by - r * 2.45, r * 0.5, Math.PI, 0); g.fill(); g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(wb * 0.44, by - r * 2.25, r * 0.36, 0, TAU); g.fill();
        // headlight + grille
        g.fillStyle = '#fff4b0'; rr(g, wb * 0.92, by - r * 1.7, r * 0.45, r * 0.4, r * 0.1); g.fill();
        if (T.lights) { g.globalAlpha = 0.55; g.drawImage(K.glowSprite('#fff1a8'), wb * 0.95 - r * 2, by - r * 3.5, r * 4, r * 4); g.globalAlpha = 1; }
        g.fillStyle = skin.dark; g.fillRect(wb * 0.98, by - r * 1.25, r * 0.22, r * 0.4);
        // exhaust pipe
        g.fillStyle = '#5a5a5a'; g.fillRect(-wb * 0.98, by - r * 1.0, r * 0.6, r * 0.25);
        // wheels
        [-wb / 2, wb / 2].forEach((wx, i) => {
          g.save(); g.translate(wx, 0); g.fillStyle = '#1c1a18'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
          g.fillStyle = '#cfd4dc'; g.beginPath(); g.arc(0, 0, r * 0.48, 0, TAU); g.fill();
          g.rotate(T.roll + i); g.strokeStyle = '#6b7280'; g.lineWidth = Math.max(1, r * 0.14); g.beginPath(); for (let s = 0; s < 3; s++) { const a = s * TAU / 3; g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45); } g.stroke();
          g.restore();
        });
        g.restore();
        void t;
      }
      function bunting(g, t, fk) {
        const x0 = M.xL - 8, x1 = M.cableR || (M.xM + M.mw / 2), y = M.cableY - 6, n = Math.max(6, Math.round((x1 - x0) / (16 * M.s + 10))), cols = ['#ff5a3c', '#ffcf5a', '#2fb4a8', '#fff3d6', '#ff7aa8'];
        for (let i = 1; i < n; i++) {
          const u = i / n, appear = clamp(fk * 1.6 - u * 0.6, 0, 1); if (appear <= 0) continue;
          const x = x0 + (x1 - x0) * u, yy = y + Math.sin(u * Math.PI) * 12 + 1, sw = Math.sin(t * 3 + i) * 1.5, hh = (10 * M.s + 6) * appear;
          g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(x - 5 * M.s - 3, yy); g.lineTo(x + 5 * M.s + 3, yy); g.lineTo(x + sw, yy + hh); g.closePath(); g.fill();
        }
      }
      let clouds = null;
      function cloudSprite() {
        const c = document.createElement('canvas'); c.width = 220; c.height = 80; const x = c.getContext('2d');
        x.fillStyle = '#ffffff'; [[50, 50, 30], [90, 38, 38], [135, 46, 32], [170, 54, 22], [110, 58, 30]].forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); });
        return c;
      }
      let fogSpr = null;
      function fogSprite() { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return c; }

      let tPrev = 0, simAcc = 0;
      const H6 = 1 / 600;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.W) { tPrev = t; return; }
        if (SOFT && tPrev && t - tPrev < 0.03) return;
        const dt = tPrev ? Math.min(0.25, Math.max(0, t - tPrev)) : dt0;
        tPrev = t;
        st.fn++; if (dt > 0.034) st.slowN++;
        if (st.fn >= 90) { if (st.slowN > 22 && st.q > 0.6) { st.q = st.q > 0.85 ? 0.75 : 0.6; cv.setQuality(st.q); bgOK = false; } st.fn = 0; st.slowN = 0; }
        if (!bgOK) renderBg();
        musicTick();
        update(dt, t);
        draw(g, t, dt);
      });
      function update(dt, t) {
        // slow motion at the snap, then real time again
        if (st.slow < 1 && now() > st.slowUntil) st.slow = Math.min(1, st.slow + dt * 2.4);
        simAcc += dt * st.slow; let n = Math.floor(simAcc / H6); simAcc -= n * H6; n = Math.min(n, 60);
        for (let i = 0; i < n; i++) { preStep(); sim.step(H6); }
        postStep(dt);
        P.update(dt);
        st.shake = Math.max(0, st.shake - dt * 18);
        if (st.fogDir) { st.fogK = clamp(st.fogK + st.fogDir * dt / 1.1, 0, 1); if (st.fogK === 0 || st.fogK === 1) st.fogDir = 0; }
      }
      function preStep() {
        if (!T) return;
        if (T.kin) return;
        // the trolley rides above the rear wheel until the line locks
        if (rope.rest > 1e8) rope.x = T.R.x;
      }
      function postStep(dt) {
        if (!T) return;
        if (T.kin) { kinTruck(dt); return; }
        const sp = (T.R.vx + T.F.vx) / 2;
        T.roll += sp * dt / Math.max(2, T.K.r);
        // suspension bounce: a damped spring driven by vertical jolts
        const vy = (T.R.vy + T.F.vy) / 2, acc = (vy - (T.pvy || 0)) / Math.max(1e-3, dt); T.pvy = vy;
        T.bv = (T.bv || 0) + (-(T.bounce || 0) * 260 - (T.bv || 0) * 12 - clamp(acc, -4000, 4000) * 0.0025) * dt; T.bounce = clamp((T.bounce || 0) + T.bv * dt, -T.K.r * 0.5, T.K.r * 0.5);
        if (engine && st.fn % 3 === 0) engine.set(T.drive ? 0.55 + Math.min(0.45, Math.abs(sp) / (T.K.v + 1)) : (st.phase === 'drive' || st.phase === 'arrive' ? 0.3 : 0.0001), clamp(Math.abs(sp) / (T.K.v + 1), 0, 1.2));
        if (T.drive && Math.abs(sp) > 10 && Math.random() < dt * 6) P.emit('smoke', T.R.x - T.K.wb * 0.55, T.R.y - T.K.r * 1.3, 1, { colors: [bright() ? 'rgba(255,255,255,0.45)' : 'rgba(220,210,200,0.18)'], speed: [6, 16], size: [3 * M.ts + 2, 6 * M.ts + 3] });
        runWatch(dt);
      }
      function kinTruck(dt) {
        const k = T.kin; k.t += dt;
        const e = clamp(k.t / k.dur, 0, 1), ez = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
        const lift = Math.sin(e * Math.PI) * k.arc;
        const rx = k.rx0 + (k.rx1 - k.rx0) * ez, ry = k.ry0 + (k.ry1 - k.ry0) * ez - lift;
        const a = k.a0 + (k.a1 - k.a0) * ez, wb = T.K.wb;
        T.R.x = T.R.px = rx; T.R.y = T.R.py = ry; T.F.x = T.F.px = rx + Math.cos(a) * wb; T.F.y = T.F.py = ry + Math.sin(a) * wb;
        T.R.vx = T.R.vy = T.F.vx = T.F.vy = 0;
        rope.x = k.ax0 + (k.ax1 - k.ax0) * ez;
        if (st.phase === 'reel') SND.ratchet();
        if (e >= 1) { const done = k.done; T.kin = null; T.bounce = -T.K.r * 0.3; T.bv = 0; if (done) done(); }
      }

      function draw(g, t, dt) {
        const W = M.W, H = M.H, br = bright();
        g.save();
        if (st.shake > 0.2 && !K.reduced()) g.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
        g.drawImage(bg, 0, 0, W, H);
        // drifting clouds
        if (!clouds) clouds = { spr: cloudSprite(), list: [0.1, 0.45, 0.8].map((x, i) => ({ x, y: 0.12 + i * 0.07, s: 0.5 + i * 0.18, v: 4 + i * 3 })) };
        clouds.list.forEach(c => { const x = ((c.x * (W + 260) + t * c.v) % (W + 260)) - 220; g.globalAlpha = br ? 0.75 : 0.16; g.drawImage(clouds.spr, x, c.y * M.yD, 220 * c.s, 80 * c.s); }); g.globalAlpha = 1;
        // river glints
        g.fillStyle = br ? 'rgba(255,255,255,0.7)' : 'rgba(200,240,255,0.4)';
        RIV.forEach(r => { const a = 0.5 + 0.5 * Math.sin(t * 2 + r.p); if (a < 0.3) return; g.globalAlpha = a; g.fillRect((r.x + t * 9) % W, r.y, r.w * a, 1.5); }); g.globalAlpha = 1;
        // rising mesa (the twist)
        if (st.mesaRising) drawMesa(g, M.xM, M.mw, M.yD, M.yF, null, br, st.mesaK);
        // bays waiting for a plank
        if (st.phase === 'place') { const b = curBay(); if (b) { const pulse = 0.45 + 0.35 * Math.sin(t * 5), th = Math.max(11, 0.19 * M.L); g.strokeStyle = rgba('#ffcf5a', pulse); g.lineWidth = 2; g.setLineDash([6, 5]); g.lineDashOffset = -t * 20; rr(g, b.x0 + 2, M.yD - th / 2 - 3, M.L - 4, th + 6, 4); g.stroke(); g.setLineDash([]); if (st.hot === 'bay') { g.globalAlpha = 0.5; g.drawImage(K.glowSprite('#ffcf5a'), b.cx - M.L * 0.7, M.yD - M.L * 0.4, M.L * 1.4, M.L * 0.8); g.globalAlpha = 1; } } }
        // birds wheeling over the canyon
        if (st.phase !== 'finale' && st.phase !== 'done') {
          g.strokeStyle = br ? 'rgba(60,40,50,0.55)' : 'rgba(20,12,30,0.7)'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath();
          for (let i = 0; i < 3; i++) { const a = t * (0.16 + i * 0.03) + i * 2.1, bx = W * (0.5 + 0.08 * i) + Math.cos(a) * W * (0.22 - i * 0.03), by = M.yD * (0.36 + 0.05 * i) + Math.sin(a) * M.yD * 0.08, fl = Math.sin(t * (5 + i) + i) * 3, sz = 6 + i; g.moveTo(bx - sz, by - fl); g.quadraticCurveTo(bx - sz * 0.4, by - 3 - fl * 0.3, bx, by); g.quadraticCurveTo(bx + sz * 0.4, by - 3 - fl * 0.3, bx + sz, by - fl); }
          g.stroke();
        }
        // returning players get a little company: a hot-air balloon drifts over the canyon
        if (visits >= 2) {
          const bx = ((t * 7 + 140) % (W + 160)) - 80, by = M.yD * 0.3 + Math.sin(t * 0.5) * 6, r = 12 + 6 * M.s;
          g.globalAlpha = br ? 0.95 : 0.8;
          g.fillStyle = skin.body; g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill();
          g.fillStyle = skin.trim; g.beginPath(); g.ellipse(bx, by, r * 0.38, r, 0, 0, TAU); g.fill();
          g.strokeStyle = br ? '#5d4a3a' : '#c9b8a8'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx - r * 0.6, by + r * 0.8); g.lineTo(bx - r * 0.25, by + r * 1.55); g.moveTo(bx + r * 0.6, by + r * 0.8); g.lineTo(bx + r * 0.25, by + r * 1.55); g.stroke();
          g.fillStyle = '#8a5528'; g.fillRect(bx - r * 0.3, by + r * 1.5, r * 0.6, r * 0.42);
          g.globalAlpha = 1;
        }
        // finale: a warm glow rises from the fair-thought mesa
        const fk = st.finT ? clamp((now() - st.finT) / 1600, 0, 1) : 0;
        if (fk > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (br ? 0.22 : 0.5) * fk; const R0 = Math.max(W, H) * (0.35 + 0.25 * fk); g.drawImage(K.glowSprite(br ? '#ffcf5a' : '#ffb24f'), M.xM + M.mw / 2 - R0, M.yD - R0 * 0.8, R0 * 2, R0 * 1.6); g.restore(); }
        drawRope(g);
        if (fk > 0) bunting(g, t, fk);
        if (st.mode === 'B' && !st.mesaRising) { const fx = M.xM + M.mw - 6, fy = M.yD, ph = 30 * M.s + 16; g.strokeStyle = br ? '#5d4a3a' : '#c9b8a8'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - ph); g.stroke(); g.fillStyle = fk > 0 ? '#ffcf5a' : '#ff7a4d'; g.beginPath(); g.moveTo(fx, fy - ph); for (let k = 0; k <= 6; k++) { const u = k / 6; g.lineTo(fx - u * (16 * M.s + 10), fy - ph + 2 + Math.sin(t * 6 - u * 3) * 2.2 * u); } for (let k = 6; k >= 0; k--) { const u = k / 6; g.lineTo(fx - u * (16 * M.s + 10), fy - ph + (9 * M.s + 6) * (1 - u * 0.4) + Math.sin(t * 6 - u * 3) * 2.2 * u); } g.closePath(); g.fill(); }
        sim.planks.forEach(pk => { if (!pk.gone) drawPlank(g, pk, t, br); });
        drawTruck(g, t);
        P.draw(g);
        // fog (the twist)
        if (st.fogK > 0.001) {
          if (!fogSpr) fogSpr = fogSprite();
          const col = br ? 1 : 0.55; g.globalAlpha = st.fogK * 0.95;
          g.fillStyle = br ? 'rgba(244,236,226,1)' : 'rgba(70,52,86,1)';
          g.fillRect(0, M.cableY - 40, W, H - M.cableY + 40);
          g.globalAlpha = st.fogK * col;
          for (let i = 0; i < 14; i++) { const x = ((i * 97 + t * 30) % (W + 200)) - 100, y = M.cableY - 70 + (i % 4) * 30; g.drawImage(fogSpr, x - 90, y - 60, 180, 120); }
          g.globalAlpha = 1;
        }
        g.restore();
        void dt;
      }

      /* ---------------- the load test ---------------- */
      function gaugeTo(v, hot) {
        v = clamp(v, 0, 1.25); if (Math.abs(v - st.gaugeV) < 0.01) return; st.gaugeV = v;
        needle.style.transform = 'rotate(' + (-90 + v / 1.25 * 180).toFixed(1) + 'deg)'; gaugeLbl.classList.toggle('hot', !!hot);
      }
      function readOut(pk) {
        const key = pk ? (pk.bay + ':' + (pk.snapped ? 's' : 'o')) : '';
        if (key === st.readKey) return; st.readKey = key;
        if (!pk || !pk.item) { read.classList.add('off'); return; }
        const it = pk.item, k = it.kind === 'fact' ? 'fact' : it.k;
        const badge = read.children[0], em = read.children[1], txt = read.children[2];
        badge.className = 'lt-badge ' + (it.kind === 'fact' ? 'fact' : 'card'); badge.innerHTML = ICON[k];
        em.className = it.kind === 'fact' ? 'ok' : pk.snapped ? 'bad' : '';
        em.textContent = 'Plank ' + (pk.bay + 1) + ' · ' + (it.kind === 'fact' ? 'fact · holding' : pk.snapped ? KIND_NAME[k].split(' ·')[0].toLowerCase() + ' · gave way' : KIND_NAME[k].split(' ·')[0].toLowerCase() + ' · under load');
        txt.className = it.user ? 'gk-user' : 'lt-gen'; txt.textContent = it.text;
        read.classList.remove('off');
      }
      function runWatch(dt) {
        if (st.phase !== 'drive' && st.phase !== 'arrive') return;
        const under = T.F.under || T.R.under;
        if (st.phase === 'drive') {
          if (under) readOut(under);
          // strain: timber barely moves the needle; cardboard pegs it
          let strain = 0, hot = false;
          sim.planks.forEach(pk => { if (pk.gone || !pk.solid) return; const lim = pk.K.sagSnap; const s = pk.kind === 'timber' ? Math.max(0, (pk.nodes[2].y - M.yD)) / lim * 0.9 : pk.snapped ? 1.2 : Math.max(0, pk.sag) / lim; if (T.F.under === pk || T.R.under === pk) { strain = Math.max(strain, s); if (pk.kind !== 'timber') hot = true; } });
          gaugeTo(strain, hot);
          if (under && under.kind === 'timber' && Math.abs(T.F.vx) > 10) { SND.creak(0.35 + strain); if (!st.said.timber && st.mode === 'A') { st.said.timber = true; say(rush, L(LINES.timber), { mood: 'happy', ms: 1800 }); } }
          if (under && under.kind !== 'timber' && !under.snapped) { SND.crinkle(clamp(under.sag / under.K.sagSnap, 0.2, 1)); if (!st.said.sag && under.sag > under.K.sagSnap * 0.45) { st.said.sag = true; say(rush, L(LINES.sag), { mood: 'worried', ms: 1700 }); rush.face('worried'); } }
          // stalled on cardboard (it should give way): help it along
          const sp = Math.abs(T.R.vx + T.F.vx) / 2;
          if (sp < 6 * M.s && T.drive) st.stalls += dt; else st.stalls = 0;
          if (st.stalls > 1.4) { st.stalls = 0; const ahead = sim.planks.find(pk => pk.kind === 'card' && !pk.snapped && !pk.gone && pk.nodes[4].x > T.F.x - M.L * 0.2); if (st.mode === 'A' && ahead) sim.snap(ahead, 2); else { T.R.x += 3 * M.s; T.F.x += 3 * M.s; } }
          // falling: lock the safety line and let the bungee catch
          if (st.mode === 'A' && rope.rest > 1e8 && T.F.y > M.yD + 0.22 * M.L) {
            rope.rest = Math.hypot(T.R.x - rope.x, T.R.y - rope.y) + (60 * M.s + 18); T.drive = false; st.fallT = now(); st.phase = 'fall';
            gaugeTo(1.25, true); stamp('FAILED', false, sim.planks.find(p => p.kind === 'card' && p.snapped) || under);
            if (!st.said.drop) { st.said.drop = true; say(rush, L(LINES.drop), { mood: gentleTone ? 'surprised' : 'panic', ms: 1600 }); SND.whistle(); }
            MUS.vol = 0; if (gentleTone) K.sfx.fall(); else SND.sad();
            K.later(() => { T.deck = false; }, 140);
            // the rest of the argument folds too
            sim.planks.filter(pk => pk.kind === 'card' && !pk.snapped && !pk.gone).forEach((pk, i) => K.later(() => { pk.soggy = 14; SND.crinkle(1); K.later(() => { if (!pk.snapped && !pk.gone) sim.snap(pk, 2); }, 1500); }, 650 + i * 520));
          }
          // arrival on the mesa
          if (st.mode === 'B' && T.R.x > M.xM + 6 * M.s) {
            T.target = 0; st.phase = 'arrive'; st.arrivedAt = now();
          }
          // a run that never fails or never arrives: finish it by hand
          if (now() - st.driveT0 > (st.mode === 'A' ? 16000 : 14000)) { if (st.mode === 'A') { const pk = sim.planks.find(p => p.kind === 'card' && !p.snapped); if (pk) sim.snap(pk, 2); else st.forceEnd = true; } else { T.kin = { t: 0, dur: 1.2, rx0: T.R.x, ry0: T.R.y, rx1: M.xM + 10 * M.s, ry1: M.yD - T.K.r, a0: truckAng(), a1: 0, arc: 20 * M.s, ax0: rope.x, ax1: M.xM + 10 * M.s }; st.phase = 'arrive'; st.arrivedAt = now(); } }
        }
        if (st.phase === 'arrive') {
          // brake to a stop on the mesa
          [T.R, T.F].forEach(w => { w.x = w.px + (w.x - w.px) * 0.86; });
          const over = T.F.x - (M.xM + M.mw - T.K.r * 1.5); if (over > 0) { T.F.x -= over; T.R.x -= over; T.F.px = T.F.x; T.R.px = T.R.x; }
          if (now() - st.arrivedAt > 900 && !st.testDone) { st.testDone = true; read.classList.add('off'); gaugeTo(0, false); }
        }
      }
      function stamp(text, ok, pk) {
        const x = pk ? (pk.nodes[2].x) : M.W / 2, y = M.yD - 40 - 30 * M.s;
        const s = h('div', { class: 'lt-stamp' + (ok ? ' ok' : ''), text, 'aria-hidden': 'true' });
        s.style.left = clamp(x, 80, M.W - 80) + 'px'; s.style.top = Math.max(150, y) + 'px';
        el.append(s); K.later(() => { s.style.transition = 'opacity .5s ease'; s.style.opacity = '0'; }, 1700); K.later(() => s.remove(), 2300);
        if (A.ctx) A.thud({ vol: 0.25 });
      }
      async function sendTruck() {
        st.phase = 'send';
        sendBtn.hidden = false; sendBtn.style.animation = 'none'; void sendBtn.offsetWidth; sendBtn.style.animation = '';
        say(glitch, L(LINES.send), { mood: 'smug', ms: 2600 });
        K.guide({ id: 'send' + st.mode, g: 'tap', target: sendBtn, label: 'TAP: SEND THE TRUCK', place: 'above', delay: 900 });
        await new Promise(res => { st.sendRes = res; });
      }
      K.tap(sendBtn, () => {
        if (st.phase !== 'send') return;
        st.phase = 'drive'; K.guide(null); sendBtn.hidden = true;
        K.sfx.pop(undefined, 300); SND.horn(); SND.roll();
        engineOn(); T.drive = true; T.deck = true; T.lights = true; T.target = T.K.v * (st.mode === 'B' ? 1.05 : 1); st.driveT0 = now(); st.stalls = 0; st.said.timber = false; st.said.sag = false; st.said.drop = false;
        gauge.classList.remove('off'); hud.lastChild.textContent = st.mode === 'A' ? 'Test 1 · conclusion' : 'Test 2 · fair thought';
        MUS.vol = 0.35;
        rush.base('determined'); rush.react('bounce');
        ctx.track('lt_send', { mode: st.mode });
        if (st.sendRes) { const r = st.sendRes; st.sendRes = null; r(); }
      });

      /* ---------------- the flow ---------------- */
      const waitFor = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 60000)) await K.wait(80); };
      async function build(list) {
        st.phase = 'place';
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          hud.lastChild.textContent = (st.mode === 'A' ? 'Build · plank ' : 'Rebuild · ') + (i + 1) + '/' + list.length;
          st.placing = item; showCard(item, i, list.length);
          lineFor(item, i);
          cardGuide(i === 0 ? 1400 : 700);
          await waitFor(() => item.placed && !st.placing, 120000);
          await K.wait(420);
        }
        if (card) { card.remove(); card = null; }
        if (st.mode === 'B') { crate.style.transition = 'opacity .4s ease, transform .4s ease'; crate.style.opacity = '0'; crate.style.transform = 'translateY(16px) scale(.9)'; K.later(() => { crate.hidden = true; }, 420); }
      }
      function lineFor(item, i) {
        if (st.mode === 'A') {
          if (item.kind !== 'fact' && !st.firstCard) { st.firstCard = true; say(rush, L(LINES.card1), { mood: gentleTone ? 'think' : 'wink', ms: 2600 }); K.later(() => { if (st.mode === 'A') say(glitch, L(item.k === 'feel' ? LINES.feel : item.k === 'leap' ? LINES.leap : LINES.glitchCard || LINES.feel), { mood: 'think', ms: 3200 }); }, 2700); return; }
          if (item.k === 'leap' && st.said.leapDone !== true) { st.said.leapDone = true; say(glitch, L(LINES.leap), { mood: 'smug', ms: 2800 }); }
          if (item.k === 'feel' && !st.said.feel && st.firstCard && i > 0 && planA[i - 1].kind !== 'fact') { st.said.feel = true; say(glitch, L(LINES.feel), { mood: 'think', ms: 3000 }); }
        } else if (item.taped && !st.said.taped) { st.said.taped = true; say(rush, L(LINES.taped), { mood: gentleTone ? 'shy' : 'wink', ms: 2800 }); }
      }
      LINES.glitchCard = { Jolly: 'A guess: something you added, not something a camera saw.', Cheeky: 'That’s a guess wearing a hard hat.', Unfiltered: 'Guess. Not camera.' };
      async function testA() {
        await sendTruck();
        await waitFor(() => st.phase === 'fall' || st.forceEnd, 20000);
        const t0 = now();
        // bungee: boing on each catch
        let lastTaut = false, boings = 0;
        while (now() - t0 < 3000) {
          if (rope.taut && !lastTaut && boings < 4) { boings++; SND.boing(clamp(1 - boings * 0.25, 0.25, 1)); if (boings === 1) { P.emit('star', T.R.x, T.R.y - 10, 8, { colors: ['#ffcf5a', '#ffffff'] }); } }
          lastTaut = rope.taut; await K.wait(40);
        }
        say(rush, L(LINES.dangle), { mood: gentleTone ? 'calm' : 'silly', ms: 3000 });
        await K.wait(2200);
        say(glitch, L(serious ? LINES.verdictSerious : LINES.verdict), { mood: serious ? 'think' : 'smug', ms: 3600 });
        stampHeld();
        await K.wait(1700);
        // reel the truck home along the line
        st.phase = 'reel'; read.classList.add('off'); gauge.classList.add('off');
        const k = T.K, park = parkX();
        T.kin = { t: 0, dur: 2.6, rx0: T.R.x, ry0: T.R.y, rx1: park - k.wb, ry1: M.yD - k.r, a0: truckAng(), a1: 0, arc: Math.max(40, T.R.y - M.cableY) * 0.75, ax0: rope.x, ax1: park - k.wb, done: () => { rope.rest = 1e9; } };
        await waitFor(() => !T.kin, 6000);
        if (engine) engine.set(0.0001, 0);
        await K.wait(500);
      }
      function stampHeld() {
        const fs = sim.planks.filter(pk => pk.kind === 'timber' && !pk.gone);
        if (!fs.length) return;
        const mid = fs[Math.floor((fs.length - 1) / 2)];
        stamp('FACTS HELD', true, mid);
        fs.forEach((pk, i) => K.later(() => { P.emit('star', pk.nodes[2].x, M.yD - 6, 6, { colors: ['#4fe0a8', '#ffffff'] }); if (A.ctx) A.chime(A.note(['E5', 'G#5', 'B5', 'E6'][i % 4]), { vol: 0.05, dur: 0.9 }); }, i * 160));
      }
      async function twist() {
        st.phase = 'twist'; hud.lastChild.textContent = 'New destination';
        say(glitch, L(LINES.twist), { mood: 'idea', ms: 4200 });
        await K.wait(3100);
        // fog rolls in; the site changes behind it
        SND.fog(); st.fogDir = 1;
        await waitFor(() => st.fogK >= 1, 3000);
        destSign.classList.add('far'); destSign.classList.toggle('gone', M.phone || M.W < 900); destSign.querySelector('small span').textContent = serious ? 'Part-way there' : 'Out of reach';
        st.mode = 'B'; MUS.vol = 0.55;
        facts.forEach(f => { f.placed = false; f.pk = null; });
        bays.forEach(b => { b.item = null; });
        sim.planks.forEach(pk => sim.removePlank(pk));
        layoutKey = ''; layout();
        st.mesaRising = true; st.mesaK = 0; renderBg();
        await K.wait(300);
        st.fogDir = -1;
        SND.rumble();
        if (!K.reduced()) st.shake = 5;
        const t0 = now();
        while (st.mesaK < 1) { st.mesaK = clamp((now() - t0) / 1400, 0, 1); if (Math.random() < 0.3) P.emit('dust', M.xM + Math.random() * M.mw, M.yD + (1 - st.mesaK) * (M.yF - M.yD), 2, { colors: ['rgba(220,190,150,0.6)'] }); await K.wait(30); }
        st.mesaRising = false; bgOK = false;
        P.emit('dust', M.xM + M.mw / 2, M.yD, 18, { colors: ['rgba(230,200,160,0.6)'], speed: [40, 140] });
        fairSign.classList.add('on'); K.sfx.great();
        say(rush, L(LINES.whoa), { mood: 'wow', ms: 2200 }); rush.react('bounce');
        await K.wait(2000);
        say(glitch, L(LINES.always), { mood: 'smug', ms: 3200 });
        await K.wait(2600);
        crate.hidden = false;
        say(glitch, L(LINES.rebuild), { mood: 'determined', ms: 4000 });
        await K.wait(1200);
      }
      async function testB() {
        say(rush, L(LINES.builtB), { mood: 'determined', ms: 2600 });
        await K.wait(1200);
        await sendTruck();
        await K.wait(900);
        say(rush, L(LINES.cross), { mood: 'happy', ms: 2000 });
        await waitFor(() => st.testDone, 20000);
        SND.horn(); rush.react('bounce'); gauge.classList.add('off');
        stamp('IT HOLDS', true, sim.planks.filter(p => !p.gone).slice(-1)[0]);
        say(rush, L(LINES.arrive), { mood: 'celebrate', ms: 2400 });
        if (engine) engine.set(0.0001, 0);
        await K.wait(1500);
        say(glitch, L(LINES.held), { mood: 'happy', ms: 3000 });
        await K.wait(1200);
      }
      async function finale() {
        st.phase = 'finale'; st.finT = now(); K.guide(null);
        MUS.win = true; MUS.bpm = 108; MUS.vol = 0.8;
        hud.lastChild.textContent = 'Passed';
        fairSign.classList.add('brass');
        if (A.ctx) { const t0 = A.now(); ['E4', 'G#4', 'B4', 'E5', 'G#5', 'B5'].forEach((n, i) => A.pluck(A.note(n), { when: t0 + i * 0.06, vol: 0.12, damp: 0.995, verb: 0.3 })); }
        // string lights run along the bridge, plank by plank
        for (let i = 0; i <= F; i++) { st.lights = i + 0.6; if (A.ctx) A.chime(A.note(['E5', 'G#5', 'B5', 'E6', 'G#6'][i % 5]), { vol: 0.05, dur: 1 }); await K.wait(K.reduced() ? 60 : 180); }
        SND.horn();
        say(glitch, L(LINES.fin), { mood: 'celebrate', ms: 0 }); glitch.base('celebrate'); rush.base('celebrate'); rush.react('bounce');
        P.emit('confetti', (T.R.x + T.F.x) / 2, M.yD - 20, 40, { colors: ['#ffcf5a', '#ff7a4d', '#4fe0a8', '#fff3d6', skin.body] });
        const from = [{ x: M.xM + M.mw / 2, y: M.yD }, { x: M.xL + M.L * 0.5, y: M.yD }, { x: (M.xL + M.xM) / 2, y: M.yD }];
        await K.finale('fireworks', { from, colors: ['#ffcf5a', '#ff7a4d', '#4fe0a8', '#ffe8b8', '#ff5fa2'], count: M.phone ? 6 : 8, ms: 4400, chord: ['E3', 'G#3', 'B3', 'E4'] });
        await K.wait(K.reduced() ? 300 : 700);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true; st.phase = 'done';
        const avg = st.prec.length ? st.prec.reduce((a, b) => a + b, 0) / st.prec.length : 0.7;
        const clean = clamp(avg - 0.12 * st.wrong, 0, 1), pct = Math.round(clean * 100);
        const tier = K.tier(clean, [0.45, 0.7, 0.88]);
        const badges = [];
        if (tier) badges.push(tier + ' engineer');
        const b = K.best('clean', pct, 'higher');
        if (b.isNew) badges.push('New best: ' + pct + '% clean build'); else if (b.first) badges.push('Clean build: ' + pct + '%');
        const ti = tier === 'Gold' ? 3 : tier === 'Silver' ? 2 : tier === 'Bronze' ? 1 : 0;
        if (ti > skinIdx) { S.store.set('load-test:skin', ti); K.collect('Truck: ' + SKINS[ti].key); badges.push('Unlocked: ' + SKINS[ti].key + ' truck'); }
        const cb = K.collect('Canyon: ' + canyon.key); if (cb.isNew) badges.push('Collected: ' + canyon.key + ' canyon');
        const lines = [F + ' fact plank' + (F === 1 ? '' : 's') + ' held the truck', st.snaps ? (cards.length + ' cardboard plank' + (cards.length === 1 ? '' : 's') + ' gave way under load') : 'The cardboard never had to carry the load', serious ? 'New destination: a fair thought, with a plan' : 'New destination: a fair thought'];
        ctx.finish({ title: serious ? 'Built on facts, with a plan' : 'The fact bridge held', mood: 'celebrate', lines, share: 'My worst-case bridge was made of cardboard. The fact bridge held.', badges: badges.slice(0, 4) });
      }

      cv.onResize(() => layout());
      (async () => {
        await K.intro({ title: 'Load Test', sub: 'Your conclusion is across a canyon. Build a bridge from what you said, then load-test it.', how: 'Drag each plank across. Tap to send the truck.', char: 'rush', mood: 'determined' });
        layout(); musicStart(); MUS.vol = 0.7;
        if (A.ctx) { const t0 = A.now(); ['E3', 'B3', 'E4'].forEach((n, i) => A.pluck(A.note(n), { when: t0 + i * 0.08, vol: 0.14, damp: 0.994 })); }
        say(rush, L(LINES.open), { mood: gentleTone ? 'think' : 'determined', ms: 3400 }); rush.react('bounce');
        await K.wait(K.reduced() ? 1200 : 2600);
        say(glitch, L(noWords ? LINES.glitchEx : LINES.glitch), { mood: 'scan', ms: 4200 });
        await K.wait(1200);
        st.mode = 'A';
        await build(planA);
        hud.lastChild.textContent = 'Bridge built';
        say(rush, L(LINES.built), { mood: 'celebrate', ms: 2600 }); rush.react('bounce');
        await K.wait(1600);
        await testA();
        await twist();
        await build(planB);
        hud.lastChild.textContent = 'Bridge rebuilt';
        await testB();
        await finale();
      })();

      return {
        async autoplay() {
          const t1 = now();
          while (!st.finished && now() - t1 < 140000) {
            if (st.phase === 'place' && st.ready && card && curItem && !st.drag) {
              await K.wait(380);
              if (!(st.phase === 'place' && st.ready && card)) continue;
              const r = K.rectIn(card);
              let tx, ty;
              if (st.mode === 'B' && curItem.kind !== 'fact') { const c = K.rectIn(crate); tx = c.cx; ty = c.cy; }
              else { const b = curBay(); if (!b) { await K.wait(100); continue; } tx = b.cx + (Math.random() - 0.5) * M.L * 0.12; ty = M.yD + 4; }
              const item = curItem;
              await K.sim.drag(card, { x: r.w / 2, y: r.h / 2 }, { x: tx - r.x, y: ty - r.y }, 700, 16);
              await waitFor(() => item.placed || (st.ready && card && !st.drag), 4000);
              await K.wait(300);
              continue;
            }
            if (st.phase === 'send' && !sendBtn.hidden) { await K.wait(700); if (st.phase === 'send') await K.sim.tap(sendBtn); continue; }
            await K.wait(150);
          }
          await waitFor(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
