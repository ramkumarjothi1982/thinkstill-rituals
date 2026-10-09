/* 034 Brain Pinball — Reset · INTERRUPT · Overthinking / Thought Fusion
 * Mechanism: absorbing visuospatial play loads the same working memory that rumination and intrusive replay run on, so
 * the loop loses its grip (Holmes et al. 2009, the "Tetris effect" on intrusive memories): a short burst of engaged,
 * fast-feedback attention resets it. Parking each thought in a "later" slot borrows worry postponement (Borkovec 1983).
 * Verb: flip (tap left or right to flip; real sub-stepped pinball: flipper impulse, kicking lobe bumpers, slingshots,
 * synapse ramps, multiball). Each of the player's own thoughts rides one ball; light it by playing, then sink it in PARK IT
 * and it is vacuumed off to the LATER drawer. Never a game over: drained balls come back.
 * Twist: multiball of every loop at once, then the table slows to one calm glowing ball you can just watch roll.
 * Finale: the whole table lights up in attract mode, the brain glows lobe by lobe: "N thoughts parked".
 */
(function (env) {
  'use strict';
  /* PHYSICS-BEGIN */
  const BPX = (() => {
    const TW = 400, TH = 790, DRAIN = 712, VMAX = 2300;
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const arc = (cx, cy, r, a0, a1, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
    function path(pts) { // a polyline with arc length: rails and guide paths
      const P = { pts, cum: [0], len: 0 };
      for (let i = 1; i < pts.length; i++) { P.len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); P.cum.push(P.len); }
      P.at = (s) => {
        s = clamp(s, 0, P.len); let i = 1; while (i < pts.length - 1 && P.cum[i] < s) i++;
        const s0 = P.cum[i - 1], L = Math.max(1e-6, P.cum[i] - s0), k = (s - s0) / L, a = pts[i - 1], b = pts[i];
        return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, tx: (b[0] - a[0]) / L, ty: (b[1] - a[1]) / L };
      };
      return P;
    }
    /* The table, in world units (400 x 790; y down). Ball radius 10. */
    function build(o) {
      o = o || {};
      const T = { segs: [], circ: [], flips: [], balls: [], lanes: [], ramps: [], ev: [], g: o.g || 720, drag: 0.05, t: 0, slow: 1, calm: false, magK: 0, magR: 0,
        hole: { x: 186, y: 414, r: 16 }, kick: o.kick || 1, net: null, nid: 0, vis: { slings: [], posts: [] } };
      const seg = (ax, ay, bx, by, r, e, kind, ex) => {
        const s = { ax, ay, bx, by, dx: bx - ax, dy: by - ay, r: r == null ? 4 : r, e: e == null ? 0.4 : e, kind: kind || 'wall', on: true, last: -9 };
        s.len2 = s.dx * s.dx + s.dy * s.dy || 1e-6;
        if (ex) Object.assign(s, ex);
        T.segs.push(s); return s;
      };
      const poly = (pts, r, e, kind) => { for (let i = 0; i < pts.length - 1; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, e, kind); };
      const circ = (x, y, r, e, kind, ex) => { const c = Object.assign({ x, y, r, e: e == null ? 0.5 : e, kind: kind || 'post', last: -9, flash: 0 }, ex || {}); T.circ.push(c); return c; };
      // outer shell: the arch, the side walls, the plunger lane and its one-way gate
      T.vis.arch = arc(202, 200, 192, Math.PI, Math.PI * 2, 56);
      poly(T.vis.arch, 5, 0.3, 'arch');
      seg(10, 200, 10, 554, 4, 0.35);
      seg(394, 200, 394, 712, 4, 0.35);
      seg(362, 270, 362, 712, 4, 0.35, 'lane');
      T.stop = seg(362, 700, 394, 700, 4, 0.05, 'plunger');
      const gl = Math.hypot(32, 32);
      seg(362, 270, 394, 238, 3, 0.35, 'gate', { one: true, fx: -32 / gl, fy: -32 / gl });
      // top rollover lanes
      T.vis.guides = [126, 166, 206, 246];
      T.vis.guides.forEach(x => seg(x, 62, x, 100, 3.5, 0.5, 'guide'));
      T.lanes = [146, 186, 226].map((x, i) => ({ x, y: 82, r: 13, i }));
      // ramp lanes (the synapse ramps start at the top of each lane)
      seg(52, 334, 52, 424, 4, 0.4, 'rampwall'); seg(90, 334, 90, 424, 4, 0.4, 'rampwall');
      seg(282, 334, 282, 424, 4, 0.4, 'rampwall'); seg(320, 334, 320, 424, 4, 0.4, 'rampwall');
      const rampL = path([[71, 334], [71, 186]].concat(arc(50, 186, 21, 0, -Math.PI, 14), [[29, 186], [28, 474]]));
      const rampR = path([[301, 334], [301, 186]].concat(arc(322, 186, 21, Math.PI, Math.PI * 2, 14), [[343, 186], [344, 474]]));
      T.ramps = [{ i: 0, side: 'L', x0: 56, x1: 86, y: 334, vmin: 300, p: rampL, exitV: 240, node: [50, 165] }, { i: 1, side: 'R', x0: 286, x1: 316, y: 334, vmin: 300, p: rampR, exitV: 240, node: [322, 165] }];
      // inlane guides into the flippers (the inlanes run under the slingshots)
      seg(10, 554, 107, 634.8, 5, 0.3, 'guide');
      seg(362, 554, 265, 634.8, 5, 0.3, 'guide');
      // slingshots: two passive rubber sides and a kicking face, rounded rubber posts at the corners
      T.slings = [];
      [[46, 96, 0], [326, 276, 1]].forEach(([xa, xc, i]) => {
        const A = [xa, 468], B = [xa, 542], C = [xc, 584];
        seg(A[0], A[1], B[0], B[1], 4, 0.55, 'rubber');
        seg(B[0], B[1], C[0], C[1], 4, 0.55, 'rubber');
        T.slings.push(seg(A[0], A[1], C[0], C[1], 4, 0.6, 'sling', { kickV: 430, kmin: 70, si: i, flash: 0 }));
        [A, B, C].forEach(q => { circ(q[0], q[1], 6, 0.6, 'post'); T.vis.posts.push(q); });
        T.vis.slings.push({ A, B, C, i });
      });
      // the three lobe bumpers
      T.bumpers = [circ(126, 208, 24, 0.5, 'bumper', { kickV: 560, i: 0 }), circ(246, 208, 24, 0.5, 'bumper', { kickV: 560, i: 1 }), circ(186, 276, 24, 0.5, 'bumper', { kickV: 560, i: 2 })];
      // the flippers
      const D = Math.PI / 180;
      T.flips = [
        { id: 'L', px: 104, py: 640, len: 64, rb: 11, rt: 6, rest: 30 * D, up: -26 * D, ang: 30 * D, w: 0, pressed: false, e: 0.28, upW: 24, dnW: 15 },
        { id: 'R', px: 268, py: 640, len: 64, rb: 11, rt: 6, rest: 150 * D, up: 206 * D, ang: 150 * D, w: 0, pressed: false, e: 0.28, upW: 24, dnW: 15 }
      ];
      T.flips.forEach(f => { f.tx = f.px + Math.cos(f.ang) * f.len; f.ty = f.py + Math.sin(f.ang) * f.len; });
      // the safety net across the drain (multiball and the calm ball)
      T.net = seg(138, 694, 234, 694, 4, 0.2, 'net', { on: false, kickV: 520 });
      return T;
    }
    function addBall(T, x, y, o) {
      const b = Object.assign({ id: ++T.nid, x, y, px: x, py: y, vx: 0, vy: 0, r: 10, mode: 'play', lanes: [0, 0, 0], s: 0, sp: 0, rail: null, ready: false, age: 0, still: 0 }, o || {});
      T.balls.push(b); return b;
    }
    function plunge(T, b, v) { b.mode = 'play'; b.x = 378; b.y = 686; b.px = b.x; b.py = b.y; b.vx = 0; b.vy = -v; T.ev.push({ k: 'launch', b }); }
    function flipMove(f, h) {
      const target = f.pressed ? f.up : f.rest, prev = f.ang, diff = target - f.ang, mx = (f.pressed ? f.upW : f.dnW) * h;
      f.ang += diff > mx ? mx : diff < -mx ? -mx : diff;
      f.w = (f.ang - prev) / h;
      f.tx = f.px + Math.cos(f.ang) * f.len; f.ty = f.py + Math.sin(f.ang) * f.len;
    }
    function hitSeg(T, b, s) {
      if (!s.on) return;
      let t = ((b.x - s.ax) * s.dx + (b.y - s.ay) * s.dy) / s.len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = s.ax + s.dx * t, cy = s.ay + s.dy * t;
      let nx = b.x - cx, ny = b.y - cy;
      const d2 = nx * nx + ny * ny, rr = b.r + s.r;
      if (d2 >= rr * rr) return;
      if (s.one && ((b.px - s.ax) * s.fx + (b.py - s.ay) * s.fy < 0 || b.vx * s.fx + b.vy * s.fy >= 0)) return; // one-way gate: only from the front, moving into it
      const d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d;
      if (s.one && nx * s.fx + ny * s.fy < 0) { nx = s.fx; ny = s.fy; }
      b.x += nx * (rr - d); b.y += ny * (rr - d);
      const vn = b.vx * nx + b.vy * ny;
      if (vn >= 0) return;
      const imp = -vn;
      let e = s.e; if (imp < 45) e = 0;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (s.kind === 'sling' && imp > s.kmin && !T.calm && T.t - s.last > 0.12) { const k = s.kickV * T.kick; b.vx += nx * k; b.vy += ny * k; s.last = T.t; T.ev.push({ k: 'sling', i: s.si, x: b.x, y: b.y, b }); }
      else if (s.kind === 'net' && T.t - s.last > 0.15) { b.vy = -Math.max(s.kickV * (T.calm ? 0.55 : 1), imp * 0.6); b.vx *= 0.6; s.last = T.t; T.ev.push({ k: 'net', x: b.x, y: b.y, b }); }
      else if (imp > 160) T.ev.push({ k: 'wall', v: imp, x: b.x, y: b.y, kind: s.kind, b });
      if (imp > 45) { const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty; b.vx -= vt * 0.015 * tx; b.vy -= vt * 0.015 * ty; } // a touch of grip on real impacts (resting contact rolls freely)
    }
    function hitCirc(T, b, c) {
      const dx = b.x - c.x, dy = b.y - c.y, d2 = dx * dx + dy * dy, rr = b.r + c.r;
      if (d2 >= rr * rr) return;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
      b.x = c.x + nx * rr; b.y = c.y + ny * rr;
      const vn = b.vx * nx + b.vy * ny;
      if (c.kind === 'bumper' && !T.calm) {
        if (T.t - c.last > 0.06) { const k = c.kickV * T.kick; const want = Math.max(k, -vn * 0.5 + k * 0.7); b.vx += (want - vn) * nx; b.vy += (want - vn) * ny; c.last = T.t; T.ev.push({ k: 'bumper', i: c.i, x: c.x, y: c.y, nx, ny, b }); return; }
      }
      if (vn >= 0) return;
      let e = c.e; if (-vn < 45) e = 0;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (c.kind === 'bumper' && T.t - c.last > 0.3) { c.last = T.t; T.ev.push({ k: 'bumper', i: c.i, x: c.x, y: c.y, nx, ny, b, soft: true }); }
      else if (-vn > 160) T.ev.push({ k: 'post', v: -vn, x: b.x, y: b.y, b });
    }
    function hitFlip(T, b, f) {
      const dx = f.tx - f.px, dy = f.ty - f.py, L2 = dx * dx + dy * dy;
      let t = ((b.x - f.px) * dx + (b.y - f.py) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = f.px + dx * t, cy = f.py + dy * t, rad = f.rb + (f.rt - f.rb) * t;
      let nx = b.x - cx, ny = b.y - cy;
      const d2 = nx * nx + ny * ny, rr = b.r + rad;
      if (d2 >= rr * rr) return;
      const d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d;
      b.x += nx * (rr - d); b.y += ny * (rr - d);
      const rx = cx + nx * rad - f.px, ry = cy + ny * rad - f.py, svx = -f.w * ry, svy = f.w * rx;
      const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
      if (vn >= 0) return;
      const e = -vn < 60 ? 0 : f.e;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (-vn > 60) { const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty; b.vx -= vt * 0.04 * tx; b.vy -= vt * 0.04 * ty; }
      if (-vn > 260 && Math.abs(f.w) > 2) T.ev.push({ k: 'flipHit', f: f.id, v: -vn, x: b.x, y: b.y, b });
    }
    function sense(T, b) {
      for (const L of T.lanes) { const inside = Math.hypot(b.x - L.x, b.y - L.y) < L.r; if (inside && !b.lanes[L.i]) T.ev.push({ k: 'lane', i: L.i, b }); b.lanes[L.i] = inside ? 1 : 0; }
      for (const R of T.ramps) {
        if (b.py > R.y && b.y <= R.y && b.x > R.x0 && b.x < R.x1 && b.vy < -R.vmin) {
          b.mode = 'rail'; b.rail = R; b.s = 0; b.sp = clamp(-b.vy * 0.8, 420, 820); T.ev.push({ k: 'ramp', i: R.i, b }); return;
        }
      }
      const H = T.hole, hd = Math.hypot(b.x - H.x, b.y - H.y), sp = Math.hypot(b.vx, b.vy);
      if ((b.ready && hd < 14 && sp < 2100) || (hd < 9 && sp < 300)) { b.mode = 'parked'; b.x = H.x; b.y = H.y; b.vx = b.vy = 0; T.ev.push({ k: 'park', b, direct: !b.ready }); return; }
      if (b.y > DRAIN) { b.mode = 'drained'; T.ev.push({ k: 'drain', b }); }
    }
    function step(T, dtIn) {
      const dt = dtIn * T.slow;
      if (dt <= 0) return;
      const n = Math.min(64, Math.max(2, Math.ceil(dt * 320))), h = dt / n;
      for (let k = 0; k < n; k++) {
        T.t += h;
        for (const f of T.flips) flipMove(f, h);
        for (const b of T.balls) {
          if (b.mode === 'rail') { // riding a synapse ramp: no playfield physics, just the rail
            const R = b.rail; b.s += b.sp * h; b.sp = Math.max(360, b.sp - 110 * h);
            const p = R.p.at(b.s); b.px = b.x; b.py = b.y; b.x = p.x; b.y = p.y;
            if (b.s >= R.p.len) { b.mode = 'play'; b.vx = p.tx * R.exitV; b.vy = p.ty * R.exitV; b.rail = null; T.ev.push({ k: 'rampOut', i: R.i, b }); }
            continue;
          }
          if (b.mode !== 'play') continue;
          b.px = b.x; b.py = b.y; b.age += h;
          b.vy += T.g * h;
          if (b.ready && T.magK > 0 && b.x < 360) { // the PARK IT magnet: a gentle pull once the thought is ready (never inside the plunger lane)
            const dx = T.hole.x - b.x, dy = T.hole.y - b.y, d = Math.hypot(dx, dy);
            if (d < T.magR && d > 0.5) { const f = T.magK * (1 - d / T.magR); b.vx += dx / d * f * h; b.vy += dy / d * f * h; const damp = 1 - Math.min(0.9, (1 - d / T.magR) * 2.2 * h); b.vx *= damp; b.vy *= damp; }
          }
          const dr = 1 - T.drag * h; b.vx *= dr; b.vy *= dr;
          const sp = Math.hypot(b.vx, b.vy); if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; }
          b.x += b.vx * h; b.y += b.vy * h;
        }
        for (let pass = 0; pass < 2; pass++) {
          for (const b of T.balls) {
            if (b.mode !== 'play') continue;
            for (const s of T.segs) hitSeg(T, b, s);
            for (const c of T.circ) hitCirc(T, b, c);
            for (const f of T.flips) hitFlip(T, b, f);
          }
        }
        for (let i = 0; i < T.balls.length; i++) { // balls bump each other (multiball)
          const a = T.balls[i]; if (a.mode !== 'play') continue;
          for (let j = i + 1; j < T.balls.length; j++) {
            const b = T.balls[j]; if (b.mode !== 'play') continue;
            const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rr = a.r + b.r;
            if (d2 >= rr * rr || d2 < 1e-6) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = (rr - d) / 2;
            a.x -= nx * pen; a.y -= ny * pen; b.x += nx * pen; b.y += ny * pen;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) { const j2 = -(1 + 0.9) * rv / 2; a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny; if (-rv > 200) T.ev.push({ k: 'clack', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); }
          }
        }
        for (const b of T.balls) if (b.mode === 'play') sense(T, b);
      }
      for (const b of T.balls) { // a ball that has gone quiet somewhere odd gets a little nudge (never stuck)
        if (b.mode !== 'play') { b.still = 0; continue; }
        const sp = Math.hypot(b.vx, b.vy);
        if (b.x > 364 && b.y > 600 && sp < 40) { b.lane = (b.lane || 0) + dt; if (b.lane > 0.45) { b.lane = 0; T.ev.push({ k: 'replunge', b }); } continue; } else b.lane = 0;
        const onFlip = T.flips.some(f => Math.hypot(b.x - f.px, b.y - f.py) < f.len + 14);
        b.still = sp < 25 && !onFlip ? b.still + dt : 0;
        if (b.still > 1.6) { b.still = 0; b.vx += (Math.random() - 0.5) * 260; b.vy -= 240; T.ev.push({ k: 'nudge', b }); }
      }
    }
    return { TW, TH, DRAIN, build, step, addBall, plunge, path, arc };
  })();
  /* PHYSICS-END */

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const eOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const eIO = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const rgbC = new Map();
  function rgbOf(hex) { let v = rgbC.get(hex); if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbC.set(hex, v); } return v; }
  const hexA = (hex, a) => 'rgba(' + rgbOf(hex).join(',') + ',' + a + ')';
  function mix(a, b, t) { const x = rgbOf(a), y = rgbOf(b); return '#' + x.map((q, i) => clamp(Math.round(q + (y[i] - q) * t), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function rngOf(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* Brain art: the gyri are contour lines of a domain-warped noise field (marching squares), so the folds meander
     like a real cortex and never cross. A new brain every day. */
  function perlin(seed) {
    const R = rngOf(seed), p = new Uint8Array(512), perm = [];
    for (let i = 0; i < 256; i++) perm.push(i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)), t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const grad = (hh, x, y) => { switch (hh & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } };
    return (x, y) => {
      const fx = Math.floor(x), fy = Math.floor(y), X = fx & 255, Y = fy & 255; x -= fx; y -= fy;
      const u = fade(x), v = fade(y), A = p[X] + Y, B = p[X + 1] + Y;
      return lerp(lerp(grad(p[A], x, y), grad(p[B], x - 1, y), u), lerp(grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1), u), v);
    };
  }
  const MS = { 1: 'LB', 2: 'BR', 3: 'LR', 4: 'TR', 5: 'LTBR', 6: 'TB', 7: 'LT', 8: 'LT', 9: 'TB', 10: 'TRLB', 11: 'TR', 12: 'LR', 13: 'BR', 14: 'LB' };
  function contours(f, x0, y0, x1, y1, cell, level) { // marching squares: a flat list of segments [ax, ay, bx, by, ...]
    const nx = Math.ceil((x1 - x0) / cell), ny = Math.ceil((y1 - y0) / cell), W = nx + 1, v = new Float32Array(W * (ny + 1)), out = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) v[j * W + i] = f(x0 + i * cell, y0 + j * cell) - level;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = v[j * W + i], b = v[j * W + i + 1], c = v[(j + 1) * W + i + 1], d = v[(j + 1) * W + i];
      const k = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0), cs = MS[k];
      if (!cs) continue;
      const X = x0 + i * cell, Y = y0 + j * cell;
      for (let q = 0; q < cs.length; q++) {
        const e = cs[q];
        if (e === 'T') out.push(X + cell * a / (a - b), Y); else if (e === 'R') out.push(X + cell, Y + cell * b / (b - c));
        else if (e === 'B') out.push(X + cell * d / (d - c), Y + cell); else out.push(X, Y + cell * a / (a - d));
      }
    }
    return out;
  }

  /* Seven tables, one per day of the week: palette, name and musical key. Capitals are the bright-room versions. */
  const THEMES = [
    { id: 'cortex', name: 'Neon Cortex', key: 0, a: '#ff3df2', b: '#29f0ff', c: '#ffd34d', d: '#8c5cff', bg0: '#07021a', bg1: '#1d0846', A: '#c0189f', B: '#0784a8', C: '#b07800', D: '#6a3fd8', pf0: '#fff0fa', pf1: '#e6d8ff' },
    { id: 'synapse', name: 'Midnight Synapse', key: 2, a: '#4d8bff', b: '#c25cff', c: '#46ffc8', d: '#ff5c9a', bg0: '#020716', bg1: '#0a1a4a', A: '#2152d0', B: '#8a2fd6', C: '#08916f', D: '#d0336f', pf0: '#edf3ff', pf1: '#d3e0ff' },
    { id: 'sunset', name: 'Sunset Lobe', key: -3, a: '#ff7a3d', b: '#ff3d8b', c: '#ffe14d', d: '#9a6cff', bg0: '#140310', bg1: '#3d0b2a', A: '#cc4d0c', B: '#c8155f', C: '#a07a00', D: '#6a3fd8', pf0: '#fff1e8', pf1: '#ffd9cf' },
    { id: 'aurora', name: 'Aurora Mind', key: 5, a: '#39ff9e', b: '#2ee6ff', c: '#d38bff', d: '#fff05c', bg0: '#01100e', bg1: '#06322d', A: '#0a8f53', B: '#0784a8', C: '#9145d0', D: '#8f7c00', pf0: '#ecfff7', pf1: '#cdf1e5' },
    { id: 'dream', name: 'Electric Dream', key: 3, a: '#ff2a6d', b: '#05d9e8', c: '#d1b3ff', d: '#ffd34d', bg0: '#0b0220', bg1: '#2a1450', A: '#cc0f4c', B: '#05889a', C: '#7046d0', D: '#a07a00', pf0: '#fff0f6', pf1: '#e3d9ff' },
    { id: 'gold', name: 'Gold Circuit', key: -5, a: '#ffc44d', b: '#ff8c1a', c: '#7ff0ff', d: '#ff5c8a', bg0: '#0d0802', bg1: '#33200a', A: '#a87000', B: '#bb5400', C: '#0784a8', D: '#cc2f68', pf0: '#fff5e3', pf1: '#f3e0b8' },
    { id: 'uv', name: 'Ultraviolet', key: 1, a: '#a35cff', b: '#6ef3ff', c: '#ff6bcb', d: '#c6ff5c', bg0: '#06001a', bg1: '#220a4c', A: '#7429dc', B: '#0784a8', C: '#c8288c', D: '#5a8f08', pf0: '#f6eeff', pf1: '#e0d0ff' }
  ];
  /* Every loop has its own ball colour; a thought cools to calm teal as it gets ready to park. */
  const LOOP = {
    whatif: { name: 'WHAT-IF LOOP', col: '#ffab3d' }, replay: { name: 'REPLAY LOOP', col: '#ff5fa2' }, shouldhave: { name: 'SHOULD-HAVE LOOP', col: '#b08cff' },
    mindread: { name: 'MIND-READING LOOP', col: '#4dc9ff' }, todo: { name: 'TO-DO LOOP', col: '#ffe14d' }, worstcase: { name: 'WORST-CASE LOOP', col: '#ff6a4d' },
    body: { name: 'BODY-ALARM LOOP', col: '#ff8fa3' }, urge: { name: 'URGE LOOP', col: '#ff7ae0' }, other: { name: 'OVERTHINKING LOOP', col: '#8cff6b' }
  };
  const LOOP_ORDER = ['whatif', 'replay', 'todo', 'shouldhave', 'worstcase', 'mindread', 'other', 'body', 'urge'];
  const CALM = '#5ff7d2';
  const EXAMPLES = [{ label: 'WHAT IF IT GOES WRONG', loop: 'whatif' }, { label: 'THAT THING I SAID', loop: 'replay' }, { label: 'TOMORROW’S LIST', loop: 'todo' }, { label: 'SHOULD’VE DONE BETTER', loop: 'shouldhave' }, { label: 'WHAT THEY THINK', loop: 'mindread' }];
  const PROG = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]]; // i, VI, III, VII in a minor key (semitones from the tonic)
  const LOBES = ['FRONTAL', 'PARIETAL', 'TEMPORAL'];

  (env.games = env.games || []).push({
    id: 'brain-pinball', mode: 'reset', name: 'Brain Pinball', verb: 'flip', family: 'INTERRUPT', minutes: 2,
    parents: ['Overthinking / Thought Fusion', 'Mental Overload / Working Memory', 'Memory / Replay / Rumination'],
    cast: ['glitch', 'rush'], poster: { char: 'glitch', mood: 'wow' },
    tagline: 'Flip your looping thoughts around a neon brain and park them.',
    why: 'For a head stuck on replay: two minutes of real pinball breaks the loop.',
    fonts: ['Monoton', 'Bungee', 'Chakra+Petch:wght@500;600;700'],
    css: `
.g-brain-pinball { --bp-neon: "Monoton", "Bungee", "Arial Black", Impact, system-ui, sans-serif; --bp-arc: "Bungee", "Arial Black", Impact, "Chakra Petch", system-ui, sans-serif; --bp-ui: "Chakra Petch", "Rajdhani", "Barlow Semi Condensed", "Segoe UI", system-ui, sans-serif;
  --bp-a: #ff3df2; --bp-b: #29f0ff; --bp-c: #ffd34d; --bp-panel: rgba(8, 4, 24, 0.84); --bp-ink: #f7f3ff; --bp-sub: #cfc6ff; background: #05030f; }
.g-brain-pinball.bp-bright { --bp-panel: rgba(255, 255, 255, 0.9); --bp-ink: #1b1236; --bp-sub: #4f3f80; background: #f1ecfb; }
.g-brain-pinball .bp-zone { position: absolute; top: 0; bottom: 0; width: 50%; z-index: 12; touch-action: none; -webkit-tap-highlight-color: transparent; cursor: pointer; outline: none; }
.g-brain-pinball .bp-zl { left: 0; }
.g-brain-pinball .bp-zr { right: 0; }
.g-brain-pinball .bp-zone:focus-visible { box-shadow: inset 0 0 0 3px var(--bp-c); }
.g-brain-pinball .bp-card { position: absolute; z-index: 32; border-radius: 12px; background: var(--bp-panel); color: var(--bp-ink); pointer-events: none;
  border: 1.5px solid color-mix(in srgb, var(--bp-a) 72%, transparent); box-shadow: 0 0 18px color-mix(in srgb, var(--bp-a) 32%, transparent), 0 8px 20px rgba(0, 0, 0, 0.32); transition: border-color 0.5s ease, box-shadow 0.5s ease; }
.g-brain-pinball.bp-bright .bp-card { box-shadow: 0 0 0 3px color-mix(in srgb, var(--bp-a) 14%, transparent), 0 8px 20px rgba(40, 20, 90, 0.18); }
.g-brain-pinball .bp-now { left: 10px; right: 120px; top: calc(env(safe-area-inset-top, 0px) + 60px); height: 40px; display: flex; flex-direction: column; justify-content: center; gap: 2px; padding: 0 12px; }
.g-brain-pinball .bp-now small { font: 400 12px/1 var(--bp-arc); letter-spacing: 0.06em; color: var(--bp-c); white-space: nowrap; }
.g-brain-pinball.bp-bright .bp-now small { color: color-mix(in srgb, var(--bp-a) 80%, #000); }
.g-brain-pinball .bp-now .gk-user { display: block; font: 700 15px/1.12 var(--bp-ui); letter-spacing: 0.03em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
.g-brain-pinball .bp-now.bp-ready { border-color: #5ff7d2; box-shadow: 0 0 22px rgba(95, 247, 210, 0.5), 0 8px 20px rgba(0, 0, 0, 0.32); }
.g-brain-pinball .bp-dots { display: flex; gap: 6px; align-items: center; height: 15px; }
.g-brain-pinball .bp-dots i { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--c); background: transparent; box-shadow: 0 0 8px var(--c); transition: background 0.3s ease, opacity 0.3s ease; }
.g-brain-pinball .bp-dots i.bp-in { background: var(--c); }
.g-brain-pinball .bp-dots i.bp-off { opacity: 0.28; box-shadow: none; }
.g-brain-pinball .bp-later { right: 10px; width: 102px; top: calc(env(safe-area-inset-top, 0px) + 60px); height: 40px; display: flex; align-items: center; gap: 8px; padding: 0 8px; }
.g-brain-pinball .bp-drawer { position: relative; flex: none; width: 28px; height: 24px; border-radius: 5px; background: linear-gradient(#5a4d8f, #2c2357); border: 1.5px solid color-mix(in srgb, var(--bp-b) 80%, #fff); box-shadow: 0 0 10px color-mix(in srgb, var(--bp-b) 50%, transparent); }
.g-brain-pinball .bp-drawer::before { content: ""; position: absolute; left: 3px; right: 3px; top: 11px; height: 1.5px; background: color-mix(in srgb, var(--bp-b) 70%, #fff); }
.g-brain-pinball .bp-drawer::after { content: ""; position: absolute; left: 50%; top: 4px; width: 9px; height: 3px; margin-left: -4.5px; border-radius: 2px; background: #fff; }
.g-brain-pinball .bp-drawer.bp-clunk { animation: brain-pinball-clunk 0.5s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes brain-pinball-clunk { 0% { transform: scale(1); } 30% { transform: scale(1.25, 0.85); } 65% { transform: scale(0.94, 1.08); } 100% { transform: scale(1); } }
.g-brain-pinball .bp-lt { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.g-brain-pinball .bp-lt small { font: 400 12px/1 var(--bp-arc); letter-spacing: 0.04em; color: var(--bp-sub); }
.g-brain-pinball .bp-lt b { font: 400 17px/1 var(--bp-arc); letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.g-brain-pinball .bp-list { display: none; }
.g-brain-pinball .bp-sign { display: none; }
.g-brain-pinball.bp-wide .bp-now { right: auto; height: auto; padding: 14px 18px 16px; gap: 8px; }
.g-brain-pinball.bp-wide .bp-now small { font-size: 13px; }
.g-brain-pinball.bp-wide .bp-now .gk-user { white-space: normal; font-size: 21px; line-height: 1.15; text-wrap: balance; }
.g-brain-pinball.bp-wide .bp-dots { height: 18px; }
.g-brain-pinball.bp-wide .bp-dots i { width: 16px; height: 16px; }
.g-brain-pinball.bp-wide .bp-later { right: auto; width: auto; height: auto; flex-wrap: wrap; align-items: center; padding: 14px 16px 16px; gap: 10px 12px; }
.g-brain-pinball.bp-wide .bp-drawer { width: 40px; height: 34px; }
.g-brain-pinball.bp-wide .bp-drawer::before { top: 16px; }
.g-brain-pinball.bp-wide .bp-lt small { font-size: 13px; }
.g-brain-pinball.bp-wide .bp-lt b { font-size: 24px; }
.g-brain-pinball.bp-wide .bp-list { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.g-brain-pinball .bp-list span { display: block; padding: 6px 10px; border-radius: 8px; font: 700 15px/1.15 var(--bp-ui); letter-spacing: 0.03em; text-transform: uppercase; background: color-mix(in srgb, var(--bp-b) 14%, transparent);
  border-left: 4px solid var(--c, var(--bp-b)); animation: brain-pinball-file 0.5s cubic-bezier(.2, 1.4, .4, 1) both; }
@keyframes brain-pinball-file { from { opacity: 0; transform: translateY(-10px) scale(0.92); } to { opacity: 1; transform: none; } }
.g-brain-pinball.bp-wide .bp-sign { display: block; position: absolute; z-index: 31; text-align: center; pointer-events: none; }
.g-brain-pinball .bp-sign b { display: block; font: 400 46px/1.02 var(--bp-neon); color: #fff; letter-spacing: 0.02em;
  text-shadow: 0 0 6px var(--bp-a), 0 0 18px var(--bp-a), 0 0 38px color-mix(in srgb, var(--bp-a) 60%, transparent); }
.g-brain-pinball.bp-bright .bp-sign b { color: color-mix(in srgb, var(--bp-a) 85%, #000); text-shadow: 0 0 14px color-mix(in srgb, var(--bp-a) 35%, transparent); }
.g-brain-pinball .bp-sign small { display: inline-block; margin-top: 12px; padding: 7px 14px; border-radius: 999px; font: 400 13px/1 var(--bp-arc); letter-spacing: 0.08em; color: var(--bp-ink); background: var(--bp-panel);
  border: 1.5px solid color-mix(in srgb, var(--bp-b) 70%, transparent); }
.g-brain-pinball .bp-keys { display: none; }
.g-brain-pinball.bp-wide .bp-keys { display: flex; position: absolute; z-index: 31; justify-content: center; gap: 18px; pointer-events: none; font: 600 14px/1 var(--bp-ui); letter-spacing: 0.04em; color: var(--bp-sub); }
.g-brain-pinball .bp-keys kbd { display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 6px; margin-right: 5px; border-radius: 7px; font: 400 13px/1 var(--bp-arc); color: var(--bp-ink); background: var(--bp-panel);
  border: 1.5px solid color-mix(in srgb, var(--bp-b) 60%, transparent); box-shadow: 0 3px 0 color-mix(in srgb, var(--bp-b) 40%, transparent); }
.g-brain-pinball .bp-fly { position: absolute; z-index: 40; left: 0; top: 0; padding: 6px 11px; border-radius: 9px; background: var(--bp-panel); color: var(--bp-ink); border: 1.5px solid #5ff7d2;
  box-shadow: 0 0 16px rgba(95, 247, 210, 0.55); font: 700 15px/1.1 var(--bp-ui); letter-spacing: 0.03em; text-transform: uppercase; white-space: nowrap; max-width: 260px; overflow: hidden; text-overflow: ellipsis;
  pointer-events: none; transition: transform 0.85s cubic-bezier(.5, 0, .2, 1), opacity 0.85s ease; will-change: transform, opacity; }
.g-brain-pinball .bp-final { position: absolute; z-index: 34; left: 50%; top: 0; transform: translate(-50%, 0); text-align: center; pointer-events: none; opacity: 0; transition: opacity 0.8s ease; width: max-content; max-width: calc(100% - 24px); }
.g-brain-pinball .bp-final.bp-on { opacity: 1; }
.g-brain-pinball .bp-final small { display: block; font: 400 15px/1.1 var(--bp-arc); letter-spacing: 0.12em; color: #fff; text-shadow: 0 0 10px var(--bp-b), 0 2px 8px rgba(0, 0, 0, 0.7); }
.g-brain-pinball .bp-final b { display: block; font: 400 92px/1 var(--bp-neon); color: #fff; margin: 6px 0 4px; text-shadow: 0 0 8px var(--bp-a), 0 0 22px var(--bp-a), 0 0 48px color-mix(in srgb, var(--bp-a) 60%, transparent); }
.g-brain-pinball .bp-final em { display: inline-block; font: 600 14px/1.2 var(--bp-ui); font-style: normal; letter-spacing: 0.06em; color: var(--bp-ink); background: var(--bp-panel); padding: 7px 13px; border-radius: 999px; border: 1.5px solid color-mix(in srgb, var(--bp-b) 70%, transparent); }
.g-brain-pinball.bp-bright .bp-final small { color: #1b1236; text-shadow: 0 0 10px rgba(255, 255, 255, 0.9); }
.g-brain-pinball.bp-bright .bp-final b { color: color-mix(in srgb, var(--bp-a) 88%, #000); text-shadow: 0 0 2px #fff, 0 0 16px rgba(255, 255, 255, 0.95), 0 0 30px color-mix(in srgb, var(--bp-a) 40%, transparent); }
.g-brain-pinball .bp-glitch .gk-bubble, .g-brain-pinball .bp-rush .gk-bubble { max-width: min(280px, calc(100cqw - 2 * var(--sz, 64px) - 40px)); }
.g-brain-pinball.bp-wide .bp-glitch .gk-bubble, .g-brain-pinball.bp-wide .bp-rush .gk-bubble { max-width: 280px; }
.g-brain-pinball .bp-sr { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const G = { phase: 'intro', listFrozen: false };
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a.strands && !G.listFrozen) an = a; }, () => {});
      const inten = ctx.intensity, line = (o) => ctx.line(o), care = () => an.safety === 'care';
      const TH0 = K.dailyPick(THEMES, 3), visits = K.visits();
      const NTH = [3, 4, 5][inten], NMB = [3, 4, 5][inten] + (visits >= 3 ? 1 : 0), NEED = [3, 4, 5][inten];
      const MAGK = [2900, 2500, 2200][inten], NETS = [12, 9, 7][inten];
      const T = BPX.build({ g: [650, 720, 790][inten], kick: [0.92, 1, 1.06][inten] });
      const LAUNCH = () => (1030 + Math.random() * 90) * Math.sqrt(T.g / 720);
      const RED = () => K.reduced();
      Object.assign(G, { thoughts: [], ti: -1, parked: 0, mParked: 0, mLost: 0, mLaunched: 0, waitLaunch: false, waitSince: 0, ball: null, combo: 0, comboSide: '', comboAt: 0, bestCombo: 0, ramps: 0, direct: 0,
        drains: 0, lanes: [0, 0, 0], laneFlash: 0, filed: [], netUntil: 0, calmAt: 0, calmBall: null, attract: 0, dim: 0, brainGlow: 0, slowK: 0, tubes: [], pops: [], shake: 0, multiK: 0, readyFlash: 0 });

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 2 });
      const P = K.particles({ max: 420 });
      const zoneL = h('div', { class: 'bp-zone bp-zl', role: 'button', tabindex: '0', 'aria-label': 'Left flipper' });
      const zoneR = h('div', { class: 'bp-zone bp-zr', role: 'button', tabindex: '0', 'aria-label': 'Right flipper. Also launches the ball.' });
      el.append(zoneL, zoneR);
      const nowCap = h('small', { text: 'YOUR THOUGHT' }), nowTxt = h('b', { class: 'gk-user', text: ' ' }), dots = h('div', { class: 'bp-dots', 'aria-hidden': 'true', hidden: true });
      const nowCard = h('div', { class: 'bp-card bp-now', 'aria-live': 'polite' }, nowCap, nowTxt, dots);
      const drawer = h('i', { class: 'bp-drawer', 'aria-hidden': 'true' });
      const cntTxt = h('b', { text: '0/' + NTH }), list = h('div', { class: 'bp-list' });
      const laterCard = h('div', { class: 'bp-card bp-later' }, drawer, h('span', { class: 'bp-lt' }, h('small', { text: 'PARKED' }), cntTxt), list);
      const sign = h('div', { class: 'bp-sign', 'aria-hidden': 'true' }, h('b', { text: 'Brain Pinball' }), h('small', { text: 'Today: ' + TH0.name }));
      const keys = h('div', { class: 'bp-keys', 'aria-hidden': 'true' }, h('span', null, h('kbd', { text: '←' }), h('kbd', { text: 'Z' }), ' left'), h('span', null, h('kbd', { text: '→' }), h('kbd', { text: 'M' }), ' right'));
      const final = h('div', { class: 'bp-final', 'aria-live': 'polite' });
      const sr = h('div', { class: 'bp-sr', 'aria-live': 'polite' });
      el.append(nowCard, laterCard, sign, keys, final, sr);
      const glitch = K.character('glitch', { side: 'right', mood: 'wow', x: 4, y: 700, size: 64, voice: 430 });
      const rush = K.character('rush', { side: 'left', mood: 'happy', x: 300, y: 700, size: 64, voice: 720 });
      glitch.el.classList.add('bp-glitch'); rush.el.classList.add('bp-rush');
      let talkAt = 0;
      const talk = (who, text, o) => { (who === glitch ? rush : glitch).hush(); talkAt = performance.now(); return who.say(text, Object.assign({ ms: 2600 }, o || {})); };
      const quiet = (ms) => performance.now() - talkAt > (ms || 2600);

      /* ---------------- palette ---------------- */
      let PAL = null;
      function palette() {
        const br = !K.dark(), t = TH0;
        el.classList.toggle('bp-bright', br);
        PAL = br ? { bright: true, a: t.A, b: t.B, c: t.C, d: t.D, f0: t.pf0, f1: t.pf1, ink: '#1b1236', room0: '#f6f2ff', room1: '#e4dcf7', wall: '#ffffff', shade: 'rgba(40,20,90,0.16)' }
          : { bright: false, a: t.a, b: t.b, c: t.c, d: t.d, f0: t.bg1, f1: t.bg0, ink: '#f7f3ff', room0: t.bg1, room1: '#020107', wall: '#ffffff', shade: 'rgba(0,0,0,0.5)' };
        el.style.setProperty('--bp-a', PAL.a); el.style.setProperty('--bp-b', PAL.b); el.style.setProperty('--bp-c', PAL.c);
      }
      palette();

      /* ---------------- layout ---------------- */
      let L = null;
      const W2S = (x, y) => ({ x: L.ox + x * L.s, y: L.oy + y * L.s });
      function layout() {
        const w = cv.w, hh = cv.h; if (!w || !hh) return false;
        const wide = w >= 1000 && hh >= 600;
        const top = wide ? 62 : 104, bot = wide ? 14 : 10;
        const s = Math.min((wide ? Math.min(w * 0.44, 560) : w - 14) / BPX.TW, (hh - top - bot) / BPX.TH);
        const tw = BPX.TW * s, th = BPX.TH * s, ox = (w - tw) / 2, oy = top + Math.max(0, (hh - top - bot - th) / 2);
        L = { w, h: hh, wide, s, tw, th, ox, oy, dpr: cv.dpr };
        el.classList.toggle('bp-wide', wide);
        if (wide) {
          const sz = 104, pw = Math.min(380, ox - 56);
          [glitch, rush].forEach(c => c.el.style.setProperty('--sz', sz + 'px'));
          glitch.side('left'); rush.side('right');
          glitch.place(Math.round(ox - sz - 30), Math.round(oy + th * 0.62)); rush.place(Math.round(ox + tw + 30), Math.round(oy + th * 0.62));
          Object.assign(nowCard.style, { left: Math.round((ox - pw) / 2) + 'px', width: pw + 'px', top: Math.round(oy + th * 0.28) + 'px' });
          Object.assign(laterCard.style, { left: Math.round(ox + tw + (ox - pw) / 2) + 'px', width: pw + 'px', top: Math.round(oy + 18) + 'px' });
          Object.assign(sign.style, { left: Math.round(ox / 2) + 'px', top: Math.round(oy + 22) + 'px', width: pw + 'px', marginLeft: Math.round(-pw / 2) + 'px' });
          Object.assign(keys.style, { left: Math.round((ox - pw) / 2) + 'px', width: pw + 'px', top: Math.round(oy + th * 0.28 + 132) + 'px' });
        } else {
          const sz = Math.round(clamp(w * 0.165, 54, 68));
          [glitch, rush].forEach(c => c.el.style.setProperty('--sz', sz + 'px'));
          glitch.side('right'); rush.side('left');
          glitch.place(4, hh - 16 - sz); rush.place(w - 4 - sz, hh - 16 - sz);
          ['left', 'width', 'top'].forEach(k => { nowCard.style[k] = ''; laterCard.style[k] = ''; });
        }
        L.drawer = (() => { const r = K.rectIn(drawer); return { x: r.cx, y: r.cy }; })();
        L.now = (() => { const r = K.rectIn(nowTxt); return { x: r.x, y: r.y, w: r.w, h: r.h }; })();
        L.finalY = Math.round(oy + th * (wide ? 0.3 : 0.26));
        final.style.top = L.finalY + 'px'; final.style.left = Math.round(ox + tw * 0.465) + 'px';
        return true;
      }

      /* ---------------- painting: cached layers ---------------- */
      let BG = null, UP = null, BRAIN = null, SPR = null;
      const mk = (w, hh) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(hh)); return { c, g: c.getContext('2d') }; };
      const blurPx = (px) => px * L.s * L.dpr; // shadowBlur ignores the transform
      function tableShape(g, grow) {
        const k = grow || 0;
        g.beginPath(); g.moveTo(6 - k, 790 + k * 0.6); g.lineTo(6 - k, 200); g.arc(202, 200, 196 + k, Math.PI, TAU); g.lineTo(398 + k, 790 + k * 0.6); g.closePath();
      }
      const HEMI = [-1, 1].map(side => { // a D-shaped hemisphere seen from above: flat along the fissure, fuller at the back
        const pts = [], cx = 186 + side * 78, cy = 300, rx = 80, ry = 232;
        const se = (q, e) => Math.sign(q) * Math.pow(Math.abs(q), e);
        for (let i = 0; i < 80; i++) {
          const a = i / 80 * TAU, c = Math.cos(a), sn = Math.sin(a);
          let x = cx + rx * se(c, 0.78) * (1 + 0.1 * sn), y = cy + ry * se(sn, 0.92);
          x = side < 0 ? Math.min(x, 183.5) : Math.max(x, 188.5);
          pts.push([x, y]);
        }
        return pts;
      });
      function hemiPath(g, side) { const pts = HEMI[side < 0 ? 0 : 1]; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); }
      let GYRI = null;
      function gyri() { // computed once per day: two contour levels of a warped noise field
        if (GYRI) return GYRI;
        const n1 = perlin(K.daily() * 13 + 7), n2 = perlin(K.daily() * 29 + 3);
        const f = (x, y) => { const wx = n2(x * 0.013, y * 0.013) * 22, wy = n2(x * 0.013 + 7.3, y * 0.013 + 2.1) * 22; return n1((x + wx) * 0.043, (y + wy) * 0.034); };
        GYRI = [contours(f, 16, 62, 356, 540, 2.6, -0.07), contours(f, 16, 62, 356, 540, 2.6, 0.07)];
        return GYRI;
      }
      function strokeSegs(g, segs) { g.beginPath(); for (let i = 0; i < segs.length; i += 4) { g.moveTo(segs[i], segs[i + 1]); g.lineTo(segs[i + 2], segs[i + 3]); } g.stroke(); }
      function paintBrain(g, lit) {
        const p = PAL, gy = gyri();
        const grad = (al) => { const gr = g.createLinearGradient(0, 70, 0, 540); gr.addColorStop(0, hexA(p.a, al)); gr.addColorStop(0.55, hexA(p.d, al)); gr.addColorStop(1, hexA(p.b, al)); return gr; };
        g.save();
        g.beginPath(); for (const side of [-1, 1]) { const pts = HEMI[side < 0 ? 0 : 1]; pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); }
        if (!lit) { g.fillStyle = grad(p.bright ? 0.15 : 0.13); g.fill(); }
        g.clip();
        g.lineCap = 'round'; g.lineJoin = 'round';
        if (lit) { g.strokeStyle = grad(0.32); g.lineWidth = 7; gy.forEach(sg => strokeSegs(g, sg)); g.strokeStyle = grad(1); g.lineWidth = 2.2; gy.forEach(sg => strokeSegs(g, sg)); }
        else { if (!p.bright) { g.strokeStyle = grad(0.08); g.lineWidth = 6; gy.forEach(sg => strokeSegs(g, sg)); } g.strokeStyle = grad(p.bright ? 0.42 : 0.3); g.lineWidth = 1.9; gy.forEach(sg => strokeSegs(g, sg)); }
        g.restore();
        // the outline of each hemisphere, a bright neon line
        for (const side of [-1, 1]) {
          hemiPath(g, side); g.lineJoin = 'round';
          if (!p.bright) { g.strokeStyle = hexA(p.a, lit ? 0.45 : 0.18); g.lineWidth = lit ? 12 : 9; g.stroke(); }
          g.strokeStyle = hexA(p.a, lit ? 1 : p.bright ? 0.78 : 0.7); g.lineWidth = lit ? 3 : 2.4; g.stroke();
        }
        // the cerebellum tucked under the back of the brain (it lights up for multiball)
        for (const side of [-1, 1]) {
          g.save(); g.beginPath(); g.ellipse(186 + side * 27, 556, 31, 17, side * 0.12, 0, TAU);
          if (!lit) { g.fillStyle = hexA(p.d, p.bright ? 0.12 : 0.16); g.fill(); }
          g.clip(); g.strokeStyle = hexA(p.d, lit ? 0.95 : p.bright ? 0.4 : 0.45); g.lineWidth = 1.6;
          for (let y = 542; y < 574; y += 5) { g.beginPath(); g.moveTo(186 + side * 4, y); g.quadraticCurveTo(186 + side * 30, y - 5 + (y - 556) * 0.2, 186 + side * 60, y + 2); g.stroke(); }
          g.restore();
          g.beginPath(); g.ellipse(186 + side * 27, 556, 31, 17, side * 0.12, 0, TAU); g.strokeStyle = hexA(p.d, lit ? 1 : p.bright ? 0.6 : 0.75); g.lineWidth = 2.2; g.stroke();
        }
      }
      function neonLine(g, pts, col, w, closed) { // a neon tube: soft halo, coloured body, white-hot core
        const p = PAL;
        const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (closed) g.closePath(); };
        g.lineCap = 'round'; g.lineJoin = 'round';
        path(); g.strokeStyle = p.bright ? 'rgba(60,30,110,0.18)' : 'rgba(0,0,0,0.55)'; g.lineWidth = w + 5; g.shadowBlur = 0; g.stroke();
        path(); g.strokeStyle = col; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = blurPx(p.bright ? 4 : 12); g.stroke();
        path(); g.strokeStyle = p.bright ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, w * 0.32); g.shadowBlur = 0; g.stroke();
      }
      function chevron(g, x, y, sz, ang) { g.save(); g.translate(x, y); g.rotate(ang || 0); g.beginPath(); g.moveTo(-sz, sz * 0.45); g.lineTo(0, -sz * 0.55); g.lineTo(sz, sz * 0.45); g.lineTo(sz * 0.62, sz * 0.75); g.lineTo(0, -sz * 0.05); g.lineTo(-sz * 0.62, sz * 0.75); g.closePath(); g.restore(); }
      function paintBG() {
        const d = L.dpr, w = L.w, hh = L.h, p = PAL;
        const o = mk(w * d, hh * d), g = o.g;
        g.setTransform(d, 0, 0, d, 0, 0);
        // the room: a dark arcade (or a sunny one) with the table's glow on the floor
        const rg = g.createRadialGradient(w / 2, L.oy + L.th * 0.45, 10, w / 2, L.oy + L.th * 0.45, Math.max(w, hh) * 0.75);
        rg.addColorStop(0, p.room0); rg.addColorStop(1, p.room1);
        g.fillStyle = rg; g.fillRect(0, 0, w, hh);
        if (L.wide) { // a neon floor grid fading into the dark, and two soft glows behind the side panels
          g.save(); g.globalAlpha = p.bright ? 0.18 : 0.22; g.strokeStyle = p.b; g.lineWidth = 1;
          const hz = hh * 0.62;
          for (let i = -16; i <= 16; i++) { g.beginPath(); g.moveTo(w / 2 + i * 26, hz); g.lineTo(w / 2 + i * 140, hh); g.stroke(); }
          for (let j = 0; j < 9; j++) { const y = hz + Math.pow(j / 8, 1.8) * (hh - hz); g.globalAlpha = (p.bright ? 0.16 : 0.2) * (0.3 + j / 8); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
          g.restore();
          for (const [x, c] of [[L.ox * 0.5, p.a], [w - L.ox * 0.5, p.b]]) { const gg = g.createRadialGradient(x, hh * 0.45, 0, x, hh * 0.45, L.ox * 0.7); gg.addColorStop(0, hexA(c, p.bright ? 0.16 : 0.18)); gg.addColorStop(1, hexA(c, 0)); g.fillStyle = gg; g.fillRect(x - L.ox, 0, L.ox * 2, hh); }
        }
        g.save(); g.translate(L.ox, L.oy); g.scale(L.s, L.s);
        // cabinet rails around the playfield
        tableShape(g, 9); g.fillStyle = p.bright ? '#d9d0ee' : '#141022'; g.fill();
        tableShape(g, 9); g.strokeStyle = p.bright ? '#b8acd9' : '#2c2546'; g.lineWidth = 3; g.stroke();
        tableShape(g, 4); g.strokeStyle = p.bright ? '#ffffff' : '#3a3260'; g.lineWidth = 2; g.stroke();
        // playfield
        g.save(); tableShape(g, 0); g.clip();
        const pf = g.createRadialGradient(186, 300, 20, 186, 360, 520);
        pf.addColorStop(0, p.f0); pf.addColorStop(1, p.f1);
        g.fillStyle = pf; g.fillRect(0, 0, 400, 790);
        // faint circuit grid
        g.strokeStyle = hexA(p.b, p.bright ? 0.07 : 0.06); g.lineWidth = 1;
        for (let x = 14; x < 400; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 790); g.stroke(); }
        for (let y = 10; y < 790; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(400, y); g.stroke(); }
        paintBrain(g, false);
        // the fissure, and the brain stem running down between the flippers
        g.strokeStyle = hexA(p.a, p.bright ? 0.35 : 0.5); g.lineWidth = 2; g.shadowColor = p.a; g.shadowBlur = p.bright ? 0 : blurPx(6);
        g.beginPath(); g.moveTo(186, 64); g.lineTo(186, 372); g.moveTo(186, 456); g.quadraticCurveTo(190, 560, 186, 650); g.stroke(); g.shadowBlur = 0;
        // dendrites: every lobe bumper is a neuron, its branches reach across the playfield
        const R = rngOf(K.daily() * 3 + 5);
        T.bumpers.forEach((bm, i) => {
          const col = [p.a, p.b, p.d][i];
          g.strokeStyle = hexA(col, p.bright ? 0.22 : 0.28); g.lineWidth = 1.6;
          for (let k = 0; k < 7; k++) {
            let a = k / 7 * TAU + R() * 0.6, x = bm.x + Math.cos(a) * 30, y = bm.y + Math.sin(a) * 30;
            g.beginPath(); g.moveTo(x, y);
            for (let st = 0; st < 12; st++) { a += (R() - 0.5) * 0.7; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y); if (st === 6) { g.moveTo(x, y); } }
            g.stroke();
          }
        });
        // the plunger lane
        g.fillStyle = p.bright ? 'rgba(80,50,140,0.08)' : 'rgba(0,0,0,0.35)'; g.fillRect(366, 236, 24, 470);
        // top-lane inserts, ramp arrows, PARK IT arrows: unlit
        const unlit = (draw, col) => { draw(); g.fillStyle = hexA(col, p.bright ? 0.12 : 0.14); g.fill(); g.strokeStyle = hexA(col, p.bright ? 0.5 : 0.45); g.lineWidth = 1.4; g.stroke(); };
        T.lanes.forEach(l => unlit(() => { g.beginPath(); g.arc(l.x, 122, 7, 0, TAU); }, p.c));
        T.ramps.forEach(r => { const x = (r.x0 + r.x1) / 2; [450, 474].forEach(y => unlit(() => chevron(g, x, y, 10, 0), p.b)); });
        [458, 478, 498].forEach(y => unlit(() => chevron(g, 186, y, 11, 0), CALM));
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const clr = g.createRadialGradient(186, 400, 8, 186, 404, 74);
        clr.addColorStop(0, hexA(p.f1, 0.95)); clr.addColorStop(0.62, hexA(p.f1, 0.8)); clr.addColorStop(1, hexA(p.f1, 0));
        g.fillStyle = clr; g.beginPath(); g.ellipse(186, 402, 78, 70, 0, 0, TAU); g.fill();
        // PARK IT decal and the hole
        g.font = '400 23px ' + NEON; g.fillStyle = hexA(CALM, p.bright ? 0.55 : 0.4); g.fillText('PARK IT', 186, 366);
        const hp = g.createRadialGradient(186, 410, 2, 186, 414, 18);
        hp.addColorStop(0, '#000000'); hp.addColorStop(0.75, p.bright ? '#2a1b4a' : '#0a0618'); hp.addColorStop(1, hexA(CALM, 0.6));
        g.fillStyle = hp; g.beginPath(); g.arc(186, 414, 17, 0, TAU); g.fill();
        g.strokeStyle = hexA(CALM, 0.35); g.lineWidth = 6; g.beginPath(); g.arc(186, 414, 27, 0, TAU); g.stroke();
        // a glass reflection across the whole table
        const shn = g.createLinearGradient(0, 120, 400, 520);
        shn.addColorStop(0, 'rgba(255,255,255,0)'); shn.addColorStop(0.42, 'rgba(255,255,255,0)'); shn.addColorStop(0.5, p.bright ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.045)'); shn.addColorStop(0.58, 'rgba(255,255,255,0)');
        g.fillStyle = shn; g.fillRect(0, 0, 400, 790);
        // lobe names under the bumpers
        g.font = '400 13px ' + ARC; g.lineWidth = 3; g.strokeStyle = hexA(p.f1, 0.85);
        T.bumpers.forEach((bm, i) => { g.strokeText(LOBES[i], bm.x, bm.y + 42); g.fillStyle = hexA([p.a, p.b, p.d][i], p.bright ? 0.85 : 0.8); g.fillText(LOBES[i], bm.x, bm.y + 42); });
        // ramp shadows on the playfield (the ramps themselves are drawn above the balls)
        g.strokeStyle = p.bright ? 'rgba(40,20,90,0.1)' : 'rgba(0,0,0,0.35)'; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round';
        T.ramps.forEach(r => { g.beginPath(); r.p.pts.forEach((q, i) => (i ? g.lineTo(q[0] + 6, q[1] + 8) : g.moveTo(q[0] + 6, q[1] + 8))); g.stroke(); });
        g.restore();
        // walls as neon tubes
        const wallC = p.a;
        neonLine(g, [[10, 554], [10, 200]].concat(T.vis.arch, [[394, 200], [394, 704]]), wallC, 4);
        neonLine(g, [[362, 270], [362, 704]], wallC, 3.6);
        neonLine(g, [[364, 268], [384, 248]], p.c, 3); g.fillStyle = p.c; g.beginPath(); g.arc(364, 268, 3.5, 0, TAU); g.fill();
        T.vis.guides.forEach(x => neonLine(g, [[x, 62], [x, 100]], p.c, 4));
        neonLine(g, [[52, 334], [52, 424]], p.b, 4); neonLine(g, [[90, 334], [90, 424]], p.b, 4);
        neonLine(g, [[282, 334], [282, 424]], p.b, 4); neonLine(g, [[320, 334], [320, 424]], p.b, 4);
        neonLine(g, [[10, 554], [107, 634.8]], wallC, 5); neonLine(g, [[362, 554], [265, 634.8]], wallC, 5);
        // slingshots
        T.vis.slings.forEach(sl => {
          const tri = () => { g.beginPath(); g.moveTo(sl.A[0], sl.A[1]); g.lineTo(sl.B[0], sl.B[1]); g.lineTo(sl.C[0], sl.C[1]); g.closePath(); };
          tri(); g.fillStyle = p.bright ? 'rgba(40,20,90,0.14)' : 'rgba(0,0,0,0.55)'; g.save(); g.translate(3, 4); g.fill(); g.restore();
          tri(); const sg = g.createLinearGradient(sl.B[0], sl.B[1], (sl.A[0] + sl.C[0]) / 2, (sl.A[1] + sl.C[1]) / 2);
          sg.addColorStop(0, p.bright ? mix(p.d, '#ffffff', 0.55) : mix(p.d, '#000000', 0.55)); sg.addColorStop(1, p.bright ? mix(p.a, '#ffffff', 0.35) : mix(p.a, '#000000', 0.25));
          g.fillStyle = sg; g.fill();
          // a little lightning-bolt decal on each slingshot
          const mx = (sl.A[0] + sl.B[0] + sl.C[0]) / 3, my = (sl.A[1] + sl.B[1] + sl.C[1]) / 3;
          g.fillStyle = p.bright ? 'rgba(255,255,255,0.8)' : hexA(p.c, 0.85); g.beginPath(); g.moveTo(mx + 3, my - 14); g.lineTo(mx - 5, my + 2); g.lineTo(mx + 1, my + 2); g.lineTo(mx - 3, my + 14); g.lineTo(mx + 6, my - 3); g.lineTo(mx, my - 3); g.closePath(); g.fill();
          neonLine(g, [sl.A, sl.B, sl.C], p.d, 3.2);
          neonLine(g, [sl.A, sl.C], p.a, 6);
        });
        // rubber posts
        T.vis.posts.forEach(q => { g.beginPath(); g.arc(q[0], q[1], 6, 0, TAU); g.fillStyle = p.bright ? '#ffffff' : '#20193a'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = p.c; g.shadowColor = p.c; g.shadowBlur = blurPx(p.bright ? 2 : 6); g.stroke(); g.shadowBlur = 0; });
        // bumper skirts (the caps light up live)
        T.bumpers.forEach((bm, i) => { const col = [p.a, p.b, p.d][i]; g.beginPath(); g.arc(bm.x, bm.y + 3, bm.r + 4, 0, TAU); g.fillStyle = p.bright ? 'rgba(40,20,90,0.16)' : 'rgba(0,0,0,0.5)'; g.fill(); g.beginPath(); g.arc(bm.x, bm.y, bm.r + 2, 0, TAU); g.fillStyle = p.bright ? '#efe8fb' : '#120d24'; g.fill(); g.lineWidth = 2; g.strokeStyle = hexA(col, 0.8); g.stroke(); });
        // the plunger and its housing
        g.fillStyle = p.bright ? '#c9bfe6' : '#241d3e'; g.fillRect(366, 700, 24, 90);
        g.fillStyle = p.bright ? '#9a8fc0' : '#58507a'; g.fillRect(372, 704, 12, 40);
        g.fillStyle = p.c; g.beginPath(); g.arc(378, 752, 9, 0, TAU); g.fill();
        // the apron
        g.save(); g.beginPath(); g.moveTo(6, 790); g.lineTo(6, 700); g.lineTo(140, 700); g.quadraticCurveTo(150, 700, 154, 712); g.lineTo(160, 724); g.lineTo(212, 724); g.lineTo(218, 712); g.quadraticCurveTo(222, 700, 232, 700); g.lineTo(362, 700); g.lineTo(362, 790); g.closePath();
        const ap = g.createLinearGradient(0, 700, 0, 790); ap.addColorStop(0, p.bright ? '#e6def7' : '#1a1430'); ap.addColorStop(1, p.bright ? '#cfc4ea' : '#0b0816');
        g.fillStyle = ap; g.fill(); g.lineWidth = 2.5; g.strokeStyle = p.bright ? '#ffffff' : hexA(p.a, 0.6); g.stroke(); g.restore();
        g.font = '400 15px ' + ARC; g.fillStyle = hexA(p.b, p.bright ? 0.9 : 0.95); g.textAlign = 'center'; g.fillText(TH0.name.toUpperCase(), 186, 748);
        g.font = '400 13px ' + ARC; g.fillStyle = hexA(p.ink, 0.55); g.fillText('NEVER A GAME OVER', 186, 771);
        g.restore();
        return o;
      }
      function offsetPts(pts, off) { // a polyline shifted sideways (for the twin rails of a ramp)
        return pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [q[0] - dy / l * off, q[1] + dx / l * off]; });
      }
      function paintUP() { // things above the balls: the glass synapse ramps, and a sheen on the glass
        const d = L.dpr, o = mk(L.w * d, L.h * d), g = o.g, p = PAL;
        g.setTransform(d * L.s, 0, 0, d * L.s, d * L.ox, d * L.oy);
        T.ramps.forEach(r => {
          const pts = r.p.pts;
          g.lineCap = 'round'; g.lineJoin = 'round';
          g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
          g.strokeStyle = hexA(p.b, p.bright ? 0.2 : 0.13); g.lineWidth = 24; g.stroke();
          for (const off of [-11, 11]) { const q2 = offsetPts(pts, off); neonLine(g, q2, p.b, 2.2); }
          // the neuron at the top of the hairpin
          const [nx, ny] = r.node;
          g.fillStyle = hexA(p.c, 0.9); g.shadowColor = p.c; g.shadowBlur = blurPx(10); g.beginPath(); g.arc(nx, ny - 4, 6, 0, TAU); g.fill(); g.shadowBlur = 0;
          g.strokeStyle = hexA(p.c, 0.7); g.lineWidth = 1.4;
          for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.45; g.beginPath(); g.moveTo(nx + Math.cos(a) * 6, ny - 4 + Math.sin(a) * 6); g.lineTo(nx + Math.cos(a) * 14, ny - 4 + Math.sin(a) * 14); g.stroke(); }
        });
        // only the ramp regions are blitted each frame
        const box = (x0, y0, x1, y1) => { const X = Math.floor(d * (L.ox + x0 * L.s)), Y = Math.floor(d * (L.oy + y0 * L.s)); return { x: X, y: Y, w: Math.ceil(d * (L.ox + x1 * L.s)) - X, h: Math.ceil(d * (L.oy + y1 * L.s)) - Y }; };
        o.boxes = [box(8, 136, 92, 492), box(280, 136, 364, 492)];
        return o;
      }
      function paintBrainLit() {
        const d = L.dpr, o = mk(L.w * d, L.h * d), g = o.g; g.setTransform(d * L.s, 0, 0, d * L.s, d * L.ox, d * L.oy); paintBrain(g, true);
        const X = Math.floor(d * (L.ox + 8 * L.s)), Y = Math.floor(d * (L.oy + 52 * L.s)); o.box = { x: X, y: Y, w: Math.ceil(d * (L.ox + 364 * L.s)) - X, h: Math.ceil(d * (L.oy + 590 * L.s)) - Y };
        return o;
      }
      function sprites() {
        const d = L.dpr, s = L.s, p = PAL;
        const ballPx = Math.ceil(24 * s * d), bc = mk(ballPx, ballPx), bg = bc.g, c = ballPx / 2, r = ballPx * 0.42;
        const body = bg.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.05, c, c, r);
        body.addColorStop(0, '#ffffff'); body.addColorStop(0.22, '#e9eef8'); body.addColorStop(0.6, '#8d97ad'); body.addColorStop(0.86, '#3b4258'); body.addColorStop(1, '#1b1f2e');
        bg.fillStyle = body; bg.beginPath(); bg.arc(c, c, r, 0, TAU); bg.fill();
        bg.globalCompositeOperation = 'source-atop';
        const band = bg.createLinearGradient(0, c + r * 0.1, 0, c + r); band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(1, hexA(p.b, 0.55));
        bg.fillStyle = band; bg.fillRect(0, 0, ballPx, ballPx);
        bg.globalCompositeOperation = 'source-over';
        bg.fillStyle = 'rgba(255,255,255,0.95)'; bg.beginPath(); bg.ellipse(c - r * 0.38, c - r * 0.42, r * 0.22, r * 0.14, -0.6, 0, TAU); bg.fill();
        const capPx = Math.ceil(60 * s * d);
        const cap = (col, lit) => {
          const o = mk(capPx, capPx), g = o.g, cc = capPx / 2, rr = capPx * 0.4;
          if (lit) { const gl = g.createRadialGradient(cc, cc, rr * 0.5, cc, cc, cc); gl.addColorStop(0, hexA(col, 0.65)); gl.addColorStop(1, hexA(col, 0)); g.fillStyle = gl; g.fillRect(0, 0, capPx, capPx); }
          const cg = g.createRadialGradient(cc - rr * 0.3, cc - rr * 0.35, rr * 0.05, cc, cc, rr);
          if (lit) { cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.45, mix(col, '#ffffff', 0.55)); cg.addColorStop(1, col); }
          else if (p.bright) { cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.55, mix(col, '#ffffff', 0.72)); cg.addColorStop(1, mix(col, '#ffffff', 0.35)); }
          else { cg.addColorStop(0, mix(col, '#ffffff', 0.25)); cg.addColorStop(0.5, mix(col, '#000000', 0.45)); cg.addColorStop(1, mix(col, '#000000', 0.75)); }
          g.fillStyle = cg; g.beginPath(); g.arc(cc, cc, rr, 0, TAU); g.fill();
          g.lineWidth = Math.max(1.5, rr * 0.12); g.strokeStyle = lit ? '#ffffff' : col; g.beginPath(); g.arc(cc, cc, rr * 0.86, 0, TAU); g.stroke();
          g.lineWidth = Math.max(1, rr * 0.06); g.strokeStyle = lit ? hexA('#ffffff', 0.9) : hexA(col, 0.7); g.beginPath(); g.arc(cc, cc, rr * 0.45, 0, TAU); g.stroke();
          return o.c;
        };
        const cols = [p.a, p.b, p.d];
        SPR = { ball: bc.c, caps: cols.map(cc => ({ idle: cap(cc, false), lit: cap(cc, true) })), capW: 60 };
        const tp = mk(Math.ceil(130 * s * d), Math.ceil(44 * s * d)), tg = tp.g;
        tg.setTransform(s * d, 0, 0, s * d, 0, 0); tg.font = '400 23px ' + NEON; tg.textAlign = 'center'; tg.textBaseline = 'middle';
        tg.shadowColor = CALM; tg.shadowBlur = 12 * s * d; tg.fillStyle = p.bright ? '#0aa889' : '#d9fff5'; tg.fillText('PARK IT', 65, 22); tg.shadowBlur = 0; tg.fillText('PARK IT', 65, 22);
        SPR.park = tp.c;
      }
      const NEON = '"Monoton", "Bungee", "Arial Black", Impact, sans-serif', ARC = '"Bungee", "Arial Black", Impact, sans-serif', UIF = '"Chakra Petch", "Rajdhani", system-ui, sans-serif';
      function paint() { if (!L) return; palette(); sprites(); BG = paintBG(); UP = paintUP(); BRAIN = paintBrainLit(); }
      cv.onResize(() => { if (layout()) paint(); });
      S.on('theme', () => { paint(); });
      try { if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 20px Monoton'), document.fonts.load('400 13px Bungee')]).then(() => { if (!S.destroyed && L) paint(); }, () => {}); } catch (e) { /* no font loading API */ }

      /* ---------------- sound: an arcade synthwave groove and the table's own voice ---------------- */
      const KEY = 57 + TH0.key; // the tonic as a MIDI note (A3 for Neon Cortex)
      const MU = { on: false, next: 0, step: 0, bpm: 112, mode: 'main', vol: 1, chord: PROG[0], bar: 0 };
      const beatQ = [];
      function musicTick() {
        if (!A.ctx || !MU.on) return;
        const now = A.now();
        if (MU.next < now - 0.3) MU.next = now + 0.06;
        while (MU.next < now + 0.2) {
          const t = MU.next, i = MU.step, st = i % 16, bar = Math.floor(i / 16) % 4, ch = PROG[bar], m = MU.mode, v = MU.vol;
          MU.chord = ch; MU.bar = bar;
          const n = (semi, oct) => A.midi(KEY + semi + 12 * (oct || 0));
          if (m === 'calm') {
            if (st === 0) A.pad(ch.map(x => n(x, 0)), { dur: 60 / MU.bpm * 4.2, vol: 0.07 * v, attack: 0.9, lp: 900 });
            if (st % 4 === 0) A.chime(n(ch[(st / 4) % 3], 1), { when: t, vol: 0.022 * v, dur: 2.2, verb: 0.6, bus: 'music' });
          } else {
            const multi = m === 'multi' || m === 'finale';
            // bass: a driving eighth-note pulse, octave jumps on the off-beats
            if (st % 2 === 0) A.tone({ when: t, type: 'sawtooth', freq: n(ch[0], st % 4 === 2 ? -1 : -2), dur: 0.16, vol: 0.045 * v, attack: 0.004, lp: multi ? 1100 : 760, bus: 'music' });
            if (st === 0 || st === 8 || (multi && (st === 4 || st === 12))) A.kick(t, 0.2 * v);
            if (st === 4 || st === 12) A.noise({ when: t, filter: 'bandpass', freq: 1900, q: 0.8, dur: 0.12, attack: 0.002, vol: 0.05 * v, bus: 'music' });
            if (st % 2 === 1 || multi) A.shaker(t, (st % 2 ? 0.014 : 0.008) * v);
            if (st === 0) A.pad(ch.map(x => n(x, 0)), { dur: 60 / MU.bpm * 4, vol: 0.05 * v, attack: 0.25, lp: 1300 });
            if (multi) A.tone({ when: t, type: 'square', freq: n(ch[st % 3], 1 + (st % 6 > 2 ? 1 : 0)), dur: 0.08, vol: 0.016 * v, lp: 2600, bus: 'music' });
          }
          if (st % 4 === 0) beatQ.push({ at: A.heardAt(t), big: st === 0 });
          MU.step++; MU.next += 60 / MU.bpm / 4;
        }
      }
      const note = (semi, oct) => A.midi(KEY + semi + 12 * (oct || 0));
      let lastWall = 0, bumpNote = 0;
      const SFX = {
        flip(side, up) {
          if (!A.ctx) return; const pan = side === 'L' ? -0.45 : 0.45;
          if (up) { A.noise({ filter: 'lowpass', freq: 1300, dur: 0.05, vol: 0.14, pan }); A.tone({ type: 'square', freq: 120, to: 58, glide: 0.05, dur: 0.07, vol: 0.06, lp: 520, pan }); A.click({ vol: 0.05, pan }); A.sync('flip', performance.now()); }
          else A.noise({ filter: 'bandpass', freq: 1700, q: 1.5, dur: 0.03, vol: 0.035, pan });
        },
        bumper(i, soft) {
          if (!A.ctx) return; const pan = [-0.4, 0.4, 0][i] || 0;
          if (soft) { A.chime(note(MU.chord[i % 3], 1), { vol: 0.05, dur: 1.6, pan, verb: 0.5 }); return; }
          A.tone({ type: 'sine', freq: 210, to: 72, glide: 0.08, dur: 0.13, vol: 0.22, pan }); A.noise({ freq: 3200, q: 1.2, dur: 0.035, vol: 0.09, pan });
          const ch = MU.chord; bumpNote = (bumpNote + 1) % 6;
          A.tone({ type: 'square', freq: note(ch[bumpNote % 3], 1 + (bumpNote > 2 ? 1 : 0)), dur: 0.11, vol: 0.045, lp: 3200, pan });
          A.sync('bumper', performance.now());
        },
        sling(i) { if (!A.ctx) return; const pan = i ? 0.5 : -0.5; A.tone({ type: 'triangle', freq: 340, to: 110, glide: 0.09, dur: 0.12, vol: 0.16, pan }); A.noise({ filter: 'bandpass', freq: 900, q: 1, dur: 0.05, vol: 0.08, pan }); A.sync('sling', performance.now()); },
        wall(v, x) { if (!A.ctx) return; const now = performance.now(); if (now - lastWall < 70) return; lastWall = now; A.noise({ filter: 'lowpass', freq: 700, dur: 0.05, vol: clamp(v / 2600, 0.02, 0.09), pan: (x - 186) / 220 }); },
        lane(i) { if (!A.ctx) return; A.chime(note([0, 3, 7][i], 2), { vol: 0.06, dur: 0.8, pan: (i - 1) * 0.4 }); A.sync('lane', performance.now()); },
        lanes() { if (!A.ctx) return; [0, 3, 7, 12, 15].forEach((x, k) => A.tone({ when: A.now() + k * 0.06, type: 'square', freq: note(x, 1), dur: 0.12, vol: 0.04, lp: 3000 })); },
        ramp(i) { if (!A.ctx) return; A.whoosh({ from: 300, to: 2600, dur: 0.6, vol: 0.12, pan: i ? 0.4 : -0.4 }); A.tone({ type: 'sawtooth', freq: 220, to: 880, glide: 0.5, dur: 0.55, vol: 0.035, lp: 2400 }); A.sync('ramp', performance.now()); },
        synapse(combo) { if (!A.ctx) return; const base = Math.min(5, combo); [0, 7, 12].forEach((x, k) => A.tone({ when: A.now() + k * 0.05, type: 'square', freq: note(x + base * 2, 1), dur: 0.16, vol: 0.04, lp: 3600 })); A.tone({ type: 'sine', freq: 1800, to: 3200, glide: 0.12, dur: 0.16, vol: 0.03 }); },
        ready() { if (!A.ctx) return; [0, 4, 7, 12].forEach((x, k) => A.chime(A.midi(69 + x), { when: A.now() + k * 0.08, vol: 0.07, dur: 1.4 })); A.sync('ready', performance.now()); },
        vacuum() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 300, to: 4200, q: 2.2, dur: 0.55, attack: 0.05, vol: 0.16 }); A.tone({ type: 'sine', freq: 160, to: 50, glide: 0.3, dur: 0.35, vol: 0.2 }); A.sync('park', performance.now()); },
        tube() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 600, to: 2600, q: 3, dur: 0.75, attack: 0.2, vol: 0.08 }); },
        filed(n) { if (!A.ctx) return; A.wood(undefined, 0.22, 1.1); [0, 7, 12].forEach((x, k) => A.chime(note(x + (n % 4) * 2, 2), { when: A.now() + 0.04 + k * 0.07, vol: 0.06, dur: 1.4 })); },
        drain() { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 440, to: 150, glide: 0.5, dur: 0.6, vol: 0.07 }); A.sync('drain', performance.now()); },
        back() { if (!A.ctx) return; A.chime(note(7, 2), { vol: 0.05, dur: 0.9 }); },
        launch() { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 1400, dur: 0.12, vol: 0.18, pan: 0.6 }); A.boing({ freq: 240, vol: 0.06, pan: 0.6 }); A.whoosh({ from: 500, to: 2200, dur: 0.45, vol: 0.08, pan: 0.5 }); A.sync('launch', performance.now()); },
        net() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 520, to: 1040, glide: 0.12, dur: 0.18, vol: 0.06 }); },
        clack() { if (!A.ctx) return; A.click({ vol: 0.06 }); },
        multi() { if (!A.ctx) return; for (let k = 0; k < 8; k++) A.tone({ when: A.now() + k * 0.07, type: 'square', freq: note([0, 3, 7, 12, 15, 19, 24, 27][k], 0), dur: 0.12, vol: 0.05, lp: 3000 }); A.noise({ filter: 'highpass', freq: 3000, dur: 1.2, attack: 0.02, vol: 0.06 }); A.sync('multi', performance.now()); },
        lost() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 660, to: 330, glide: 0.6, dur: 0.8, vol: 0.04, verb: 0.6 }); }
      };

      /* ---------------- thoughts ---------------- */
      function buildThoughts() {
        G.listFrozen = true;
        const st = (an.strands || []).filter(x => x && x.label);
        const own = st.filter(x => !x.generic);
        const core = an.core && an.core.label && !an.core.generic && !own.some(x => x.label === an.core.label) ? an.core : null;
        const out = own.slice(0, core ? NTH - 1 : NTH).map(x => ({ label: x.label, loop: LOOP[x.loop] ? x.loop : 'other', generic: false }));
        if (core) out.push({ label: core.label, loop: LOOP[core.loop] ? core.loop : 'other', generic: false, core: true });
        const pool = st.filter(x => x.generic).concat(EXAMPLES);
        for (const x of pool) { if (out.length >= NTH) break; if (!out.some(o => o.label === x.label)) out.push({ label: x.label, loop: LOOP[x.loop] ? x.loop : 'other', generic: true }); }
        G.thoughts = out.slice(0, NTH);
        // multiball: every loop at once, the player's own kinds first
        const loops = [];
        G.thoughts.forEach(t => { if (!loops.includes(t.loop)) loops.push(t.loop); });
        LOOP_ORDER.forEach(l => { if (!loops.includes(l)) loops.push(l); });
        G.loops = loops.slice(0, NMB);
      }
      function showThought(t) {
        nowCard.classList.remove('bp-ready'); dots.hidden = true; nowTxt.hidden = false;
        nowCap.textContent = t.generic ? 'A THOUGHT LIKE…' : t.core ? 'YOUR BIG ONE' : 'YOUR THOUGHT';
        nowTxt.textContent = t.label;
        nowCard.style.setProperty('--bp-a', LOOP[t.loop].col);
        sr.textContent = (t.generic ? 'A thought like: ' : 'Your thought: ') + t.label;
      }

      /* ---------------- input ---------------- */
      const held = { L: 0, R: 0 }, downAt = { L: 0, R: 0 };
      function press(side, on) {
        const f = T.flips[side === 'L' ? 0 : 1];
        if (on) {
          held[side]++; downAt[side] = performance.now();
          if (!f.pressed) { f.pressed = true; SFX.flip(side, true); f.glow = 1; }
          if (G.waitLaunch) launchNow();
          if (G.phase === 'calm') G.calmTaps = (G.calmTaps || 0) + 1;
        } else {
          held[side] = Math.max(0, held[side] - 1);
          if (held[side]) return;
          const hold = performance.now() - downAt[side];
          const rel = () => { if (!held[side] && f.pressed) { f.pressed = false; SFX.flip(side, false); } };
          if (hold < 80) S.later(rel, 80 - hold); else rel(); // even the quickest tap gets a full flip
        }
      }
      K.press(zoneL, { down: () => press('L', true), up: () => press('L', false) });
      K.press(zoneR, { down: () => press('R', true), up: () => press('R', false) });
      const KEYS = { ArrowLeft: 'L', KeyZ: 'L', KeyA: 'L', ShiftLeft: 'L', ArrowRight: 'R', Slash: 'R', KeyM: 'R', KeyL: 'R', ShiftRight: 'R', Space: 'R', Enter: 'R', ArrowDown: 'R' };
      const keyDown = new Set();
      const okKey = () => { const ae = document.activeElement; if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT')) return false; return !ae || ae === document.body || el.contains(ae); };
      S.listen(window, 'keydown', (e) => { const side = KEYS[e.code]; if (!side || !okKey() || G.phase === 'intro') return; e.preventDefault(); if (keyDown.has(e.code)) return; keyDown.add(e.code); K.guideDone(); A.unlock(); press(side, true); });
      S.listen(window, 'keyup', (e) => { const side = KEYS[e.code]; if (!side || !keyDown.has(e.code)) return; keyDown.delete(e.code); press(side, false); });

      /* ---------------- flow ---------------- */
      let finished = false;
      function spawnThought() {
        G.ti++;
        const t = G.thoughts[G.ti];
        showThought(t);
        const b = BPX.addBall(T, 378, 686, { mode: 'wait', th: t, col: LOOP[t.loop].col, hits: 0, ready: false, trail: [] });
        G.ball = b; G.waitLaunch = true; G.waitSince = performance.now();
        K.guide({ id: 'launch', g: 'tap', target: () => W2S(378, 650), label: 'TAP TO LAUNCH', place: 'above', delay: G.ti === 0 ? 600 : 1500 });
        ctx.track('thought', { i: G.ti, generic: t.generic ? 1 : 0 });
      }
      function launchNow() {
        const b = G.ball; if (!b || !G.waitLaunch) return;
        G.waitLaunch = false;
        BPX.plunge(T, b, LAUNCH());
        G.plungeK = 1;
        guidePlay(2200);
        if (G.ti === 0) S.later(() => { if (G.phase === 'main' && quiet()) talk(rush, line({ Jolly: ['Here it goes! Bonk it around.', 'Ball’s up! Ding ding ding!'], Cheeky: ['Launched. Your brain, but louder.', 'Off it goes. Ping it around.'], Unfiltered: ['Ball up. Flip it.', 'Go. Ping it.'] }), { mood: 'wow' }); }, 900);
      }
      function guidePlay(delay) {
        if (G.phase !== 'main' && G.phase !== 'multi') return;
        const ready = G.phase === 'multi' || (G.ball && G.ball.ready);
        K.guide({ id: 'flip', g: 'tap', target: () => flipTarget(), label: G.phase === 'multi' ? 'PARK THE LOOPS' : ready ? 'FLIP IT INTO PARK IT' : 'TAP LEFT OR RIGHT', place: 'above', delay: delay == null ? 1200 : delay });
      }
      function flipTarget() { // the flipper the lowest ball is heading for
        let best = null, by = -1;
        for (const b of T.balls) if ((b.mode === 'play' || b.mode === 'rail') && b.y > by) { by = b.y; best = b; }
        const f = !best || best.x < 186 ? T.flips[0] : T.flips[1];
        return W2S((f.px + f.tx) / 2, (f.py + f.ty) / 2 - 4);
      }
      function hit(b, kind) {
        if (!b || G.phase !== 'main' || b !== G.ball || b.ready) return;
        const now = performance.now();
        if (now - (b.lastHit || 0) < 220) return;
        b.lastHit = now; b.hits += kind === 'ramp' ? 2 : 1;
        if (b.hits >= NEED) setReady(b);
      }
      function setReady(b) {
        if (b.ready) return;
        b.ready = true; b.readyAt = performance.now(); b.hits = Math.max(b.hits, NEED);
        G.readyFlash = 1; SFX.ready();
        nowCard.classList.add('bp-ready'); nowCap.textContent = 'READY TO PARK';
        addPop('READY!', 186, 330, CALM);
        if (quiet(1200)) talk(glitch, care() ? line({ Jolly: 'It’s ready. Park it, gently.', Cheeky: 'Glowing teal. Park it when you can.', Unfiltered: 'Ready. Park it.' }) : line({ Jolly: ['It’s ready! Sink it in PARK IT.', 'Teal means ready. PARK IT!'], Cheeky: ['Teal. That’s your cue. PARK IT.', 'Ready. The hole’s hungry.'], Unfiltered: ['Ready. PARK IT.', 'Teal. Sink it.'] }), { mood: 'smug' });
        guidePlay(1600);
      }
      function addPop(text, x, y, col, big) { G.pops.push({ text, x, y, col: col || PAL.c, t0: performance.now(), big: !!big }); if (G.pops.length > 6) G.pops.shift(); }
      function onPark(b, direct) {
        const now = performance.now();
        SFX.vacuum(); G.shake = Math.max(G.shake, 4);
        P.emit('star', T.hole.x, T.hole.y, 16, { colors: [CALM, '#ffffff', b.col || CALM], speed: [40, 160] });
        const from = W2S(T.hole.x, T.hole.y);
        G.tubes.push({ b, t0: now, from, to: L.drawer, col: b.col || CALM });
        S.later(() => SFX.tube(), 220);
        if (G.phase === 'main') {
          if (direct) { G.direct++; addPop('CLEAN SHOT!', 186, 486, PAL.c, true); }
          else addPop('PARKED!', 186, 486, CALM, true);
          flyLabel(b.th, b.col);
          K.guide(null);
          S.later(() => {
            G.parked++; cntTxt.textContent = G.parked + '/' + G.thoughts.length; drawer.classList.remove('bp-clunk'); void drawer.offsetWidth; drawer.classList.add('bp-clunk');
            SFX.filed(G.parked);
            G.filed.push(b.th);
            const chip = h('span', { class: 'gk-user', text: b.th.label }); chip.style.setProperty('--c', b.col); list.append(chip);
            ctx.track('park', { n: G.parked, direct: direct ? 1 : 0 });
            parkLine(direct);
            if (G.ti + 1 < G.thoughts.length) S.later(() => { if (G.phase === 'main') spawnThought(); }, 650);
            else S.later(twist, 900);
          }, 950);
        } else if (G.phase === 'multi') {
          G.mParked++; addPop('PARKED!', 186, 486, b.col, true); markDot(b, 'in');
          S.later(() => { G.parked++; cntTxt.textContent = String(G.parked); drawer.classList.remove('bp-clunk'); void drawer.offsetWidth; drawer.classList.add('bp-clunk'); SFX.filed(G.parked); }, 950);
          if (G.mParked === 1 && quiet(1500)) talk(rush, line({ Jolly: 'One loop down! Keep flipping!', Cheeky: 'Got one! The rest are panicking.', Unfiltered: 'One parked.' }), { mood: 'celebrate' });
          checkMultiEnd();
        }
      }
      function parkLine(direct) {
        const n = G.parked;
        if (care()) { talk(glitch, line({ Jolly: ['Parked, not forgotten. It’ll keep.', 'Filed for later. You choose when.'], Cheeky: ['Parked. Not ignored, just waiting.', 'Filed. It waits until you’re ready.'], Unfiltered: ['Parked. It can wait.', 'Filed for later.'] }), { mood: 'calm' }); return; }
        if (direct) { talk(rush, line({ Jolly: 'Straight in! What a shot!', Cheeky: 'Clean shot. Show-off.', Unfiltered: 'Clean. Nice.' }), { mood: 'celebrate' }); return; }
        if (n === 1) talk(glitch, line({ Jolly: 'Filed for later. It’ll keep.', Cheeky: 'Vacuumed into the LATER drawer. Bye!', Unfiltered: 'Parked. Later.' }), { mood: 'celebrate' });
        else if (n === 2) talk(rush, line({ Jolly: 'Into the tube! Whoosh!', Cheeky: 'Shloop! Love that noise.', Unfiltered: 'Shloop. Next.' }), { mood: 'laugh' });
        else talk(glitch, line({ Jolly: ['Another one filed. Tidy brain.', 'Parked. The drawer’s filling up.'], Cheeky: ['Filed. Your brain says thanks.', 'Parked. Look at you, organised.'], Unfiltered: ['Parked.', 'Filed.'] }), { mood: 'happy' });
      }
      function flyLabel(t, col) {
        if (!t || !L.now) return;
        const chip = h('div', { class: 'bp-fly gk-user', text: t.label, 'aria-hidden': 'true' });
        chip.style.borderColor = col || CALM;
        el.append(chip);
        const x0 = L.now.x, y0 = L.now.y - 4;
        chip.style.transform = 'translate(' + x0 + 'px,' + y0 + 'px)';
        const cw = chip.offsetWidth || 160, ch = chip.offsetHeight || 28;
        nowTxt.textContent = ' '; nowCap.textContent = 'FILED FOR LATER'; nowCard.classList.remove('bp-ready');
        S.later(() => { chip.style.transform = 'translate(' + (L.drawer.x - cw / 2) + 'px,' + (L.drawer.y - ch / 2) + 'px) scale(0.2)'; chip.style.opacity = '0.1'; }, 40);
        S.later(() => chip.remove(), 1000);
      }
      function onDrain(b) {
        SFX.drain();
        if (G.phase === 'main' && b === G.ball) {
          G.drains++;
          S.later(() => {
            if (G.phase !== 'main' || b !== G.ball) return;
            b.mode = 'wait'; SFX.back(); b.x = 378; b.y = 686; b.trail = [];
            S.later(() => { if (G.phase === 'main' && b.mode === 'wait' && b === G.ball) BPX.plunge(T, b, LAUNCH()); }, 650);
          }, 750);
          if (quiet(2000) && (G.drains === 1 || Math.random() < 0.4)) talk(glitch, line({ Jolly: ['Drained? Nope. It comes right back.', 'Down the drain… and back up. No game overs here.'], Cheeky: ['Drain detected. Doesn’t count. Here it comes.', 'Ha, gravity. It’s coming back anyway.'], Unfiltered: ['Drained. It comes back.', 'Back it comes.'] }), { mood: 'wink' });
          ctx.track('drain', { n: G.drains });
        } else if (G.phase === 'multi') {
          b.mode = 'gone'; G.mLost++; markDot(b, 'off'); SFX.lost();
          P.emit('mote', b.x, Math.min(b.y, 700), 10, { colors: [b.col, '#ffffff'], angle: -Math.PI / 2, spread: 1, speed: [20, 70] });
          if (G.mLost === 1 && quiet(1200)) talk(glitch, line({ Jolly: 'That one rolled away on its own. That’s allowed.', Cheeky: 'Some loops just leave. Let them.', Unfiltered: 'Rolled away. Fine.' }), { mood: 'calm' });
          checkMultiEnd();
        } else if (G.phase === 'calm') {
          b.mode = 'play'; b.x = 186; b.y = 60; b.vx = 30; b.vy = 0;
        }
      }

      /* ---------------- the twist: every loop at once ---------------- */
      function markDot(b, cls) { if (b.dot) b.dot.classList.add('bp-' + cls); }
      async function twist() {
        if (G.phase !== 'main') return;
        G.phase = 'multi'; K.guide(null);
        nowCard.classList.remove('bp-ready'); nowCard.style.setProperty('--bp-a', PAL.a);
        nowCap.textContent = 'EVERY LOOP AT ONCE'; nowTxt.hidden = true; dots.hidden = false; dots.innerHTML = '';
        G.loops.forEach(l => { const i = h('i'); i.style.setProperty('--c', LOOP[l].col); dots.append(i); });
        sr.textContent = 'Multiball: every loop at once.';
        MU.mode = 'multi'; MU.bpm = 128; SFX.multi(); G.multiK = 1; G.shake = 6;
        rush.react('shake');
        talk(rush, care() ? line({ Jolly: 'Whoa, lots at once! Let’s take it slow.', Cheeky: 'All of them at once? Okay. Breathe. Flip.', Unfiltered: 'All at once. Okay.' }) : line({ Jolly: 'Wait. ALL the loops? At once?!', Cheeky: 'MULTIBALL! Every loop you own!', Unfiltered: 'Every loop at once. Go.' }), { mood: 'panic', ms: 2600 });
        S.later(() => { if (G.phase === 'multi') talk(glitch, line({ Jolly: 'Multiball! Park what you can. Some will roll away.', Cheeky: 'Park what you can. The rest can roll off.', Unfiltered: 'Park what you can. Let the rest go.' }), { mood: 'determined', ms: 3000 }); }, 2700);
        T.net.on = true; G.netUntil = performance.now() + NETS * 1000;
        G.mLaunched = 0;
        await K.wait(1300);
        for (let k = 0; k < G.loops.length && G.phase === 'multi'; k++) {
          const l = G.loops[k], b = BPX.addBall(T, 378, 686, { mode: 'play', loop: l, col: LOOP[l].col, ready: true, readyAt: performance.now(), trail: [], multi: true });
          b.dot = dots.children[k];
          BPX.plunge(T, b, LAUNCH() * (0.97 + Math.random() * 0.06));
          G.mLaunched++;
          await K.wait(700);
        }
        guidePlay(1500);
      }
      function checkMultiEnd() {
        if (G.phase !== 'multi' || G.mLaunched < G.loops.length) return;
        if (T.balls.some(b => b.multi && (b.mode === 'play' || b.mode === 'rail'))) return;
        S.later(calmBall, 1400);
      }

      /* ---------------- the calm ball ---------------- */
      async function calmBall() {
        if (G.phase !== 'multi') return;
        G.phase = 'calm'; K.guide(null);
        T.balls = T.balls.filter(b => b.mode === 'play' || b.mode === 'rail');
        MU.mode = 'calm'; MU.bpm = 64;
        nowCap.textContent = 'ONE CALM BALL'; dots.hidden = true; nowTxt.hidden = false; nowTxt.textContent = 'JUST WATCH IT ROLL';
        nowCard.style.setProperty('--bp-a', CALM); nowCard.classList.add('bp-ready');
        sr.textContent = 'One calm ball. Just watch it roll.';
        T.net.on = true; T.calm = true;
        talk(glitch, line({ Jolly: 'Hear that? Quiet. Just one ball now.', Cheeky: 'And… breathe. One ball. No rush.', Unfiltered: 'Quiet now. One ball.' }), { mood: 'calm', ms: 3200 });
        S.later(() => { if (G.phase === 'calm') talk(rush, line({ Jolly: '…oh. I could watch this all day.', Cheeky: 'Slow-mo pinball. Weirdly soothing.', Unfiltered: '…nice.' }), { mood: 'calm', ms: 3000 }); }, 3800);
        await K.anim(RED() ? 300 : 1200, (k) => { G.slowK = eIO(k); T.slow = lerp(1, 0.42, G.slowK); G.dim = G.slowK; });
        const b = BPX.addBall(T, 186, 34, { mode: 'play', calm: true, col: CALM, ready: true, trail: [], vx: 70, vy: 20 });
        G.calmBall = b; G.calmAt = performance.now();
        if (A.ctx) A.chime(note(7, 2), { vol: 0.08, dur: 2.4, verb: 0.7 });
        K.guide({ id: 'still', g: 'still', target: () => (G.calmBall && G.calmBall.mode === 'play' ? W2S(G.calmBall.x, G.calmBall.y) : W2S(186, 414)), label: 'JUST WATCH IT ROLL', delay: 1400 });
      }

      function calmRest(b) { // the calm ball comes to rest in the middle of the brain, and the show begins
        if (G.calmDone) return;
        G.calmDone = true; b.mode = 'rest'; K.guide(null);
        if (A.ctx) [0, 7, 12, 16].forEach((x, k) => A.chime(note(x, 1), { when: A.now() + k * 0.18, vol: 0.06, dur: 2.6, verb: 0.7 }));
        P.emit('mote', T.hole.x, T.hole.y, 14, { colors: [CALM, '#ffffff'], speed: [10, 50] });
        talk(glitch, line({ Jolly: 'It found the middle. Everything settles there.', Cheeky: 'And rest. Even pinballs need a lie-down.', Unfiltered: 'Settled. Good.' }), { mood: 'calm', ms: 2800 });
        S.later(finale, 2200);
      }

      /* ---------------- finale: attract mode ---------------- */
      async function finale() {
        if (G.phase === 'finale' || G.phase === 'done') return;
        G.phase = 'finale'; K.guide(null);
        MU.mode = 'finale'; MU.bpm = 112; T.slow = 1; T.calm = false; T.net.on = false;
        G.attractAt = performance.now(); G.attract = 1;
        nowCap.textContent = 'ATTRACT MODE'; nowTxt.textContent = 'THE WHOLE BRAIN IS LIT';
        const total = G.parked;
        final.innerHTML = ''; final.append(h('small', { text: 'THOUGHTS PARKED' }), h('b', { text: String(total) }), h('em', { text: 'Tomorrow: a new table' }));
        S.later(() => final.classList.add('bp-on'), 600);
        glitch.base('celebrate'); rush.base('celebrate'); rush.react('bounce');
        talk(glitch, line({ Jolly: 'Attract mode! The whole brain’s lit up.', Cheeky: 'Look at that light show. All you.', Unfiltered: 'Whole brain lit. Done.' }), { mood: 'celebrate', ms: 3400 });
        if (A.ctx) { SFX.multi(); A.pad([note(0, 0), note(7, 0), note(12, 0), note(16, 0)], { dur: 5, vol: 0.12, attack: 0.4 }); }
        const from = T.bumpers.map(bm => W2S(bm.x, bm.y));
        K.finale('fireworks', { from, colors: [PAL.a, PAL.b, PAL.c, PAL.d, CALM], count: 7, ms: 4200, z: 20, chord: [KEY, KEY + 7, KEY + 12, KEY + 16].map(m => noteName(m)) });
        await K.sleep(RED() ? 2600 : 4600);
        S.later(() => talk(rush, line({ Jolly: 'Same time tomorrow? New table!', Cheeky: 'Tomorrow’s table is different. Just saying.', Unfiltered: 'New table tomorrow.' }), { mood: 'wink', ms: 2600 }), 0);
        await K.wait(900);
        // results
        const badges = [];
        const pb = K.best('parked', total, 'higher');
        if (pb.isNew) badges.push('New best: ' + total + ' parked');
        const frac = G.mParked / Math.max(1, G.loops.length);
        const tier = K.tier(frac, [0.3, 0.6, 0.99]);
        if (tier) badges.push(tier + ': ' + (tier === 'Gold' ? 'every loop parked' : 'multiball'));
        if (G.bestCombo >= 2) { const cb = K.best('combo', G.bestCombo, 'higher'); badges.push((cb.isNew ? 'New best combo: ×' : 'Combo: ×') + G.bestCombo); }
        const tc = K.collect('table:' + TH0.id);
        const tables = K.collection().filter(x => String(x).indexOf('table:') === 0).length;
        badges.push((tc.isNew ? 'New table: ' : 'Table: ') + TH0.name + ' (' + tables + ' of 7)');
        ctx.track('done', { parked: total, multi: G.mParked, lost: G.mLost, drains: G.drains, ramps: G.ramps, combo: G.bestCombo, direct: G.direct });
        finished = true; G.phase = 'done';
        ctx.finish({
          title: total + ' thoughts parked', mood: 'celebrate',
          lines: [ownLine(), 'Multiball: ' + G.mParked + ' of ' + G.loops.length + ' loops parked' + (G.mLost ? ', ' + G.mLost + ' rolled away' : ''), G.ramps ? 'Synapse ramps: ' + G.ramps + (G.bestCombo >= 2 ? ' · best combo ×' + G.bestCombo : '') : 'One calm ball, watched all the way home'],
          share: 'Parked ' + total + ' thoughts in Brain Pinball.',
          badges: badges.slice(0, 4)
        });
      }
      function ownLine() { const own = G.thoughts.filter(x => !x.generic).length, gen = G.thoughts.length - own; return own ? own + (own === 1 ? ' of your thoughts' : ' of your thoughts') + ' filed for later' + (gen ? ' (+' + gen + ' example' + (gen > 1 ? 's' : '') + ')' : '') : G.thoughts.length + ' thought-balls filed for later'; }
      function noteName(m) { const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; return N[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }

      /* ---------------- events from the table ---------------- */
      function events() {
        for (const e of T.ev) {
          const b = e.b;
          switch (e.k) {
            case 'launch': SFX.launch(); G.plungeK = 1; break;
            case 'bumper': {
              const bm = T.bumpers[e.i]; bm.flash = 1; bm.squash = 1;
              SFX.bumper(e.i, e.soft);
              if (!e.soft) { G.shake = Math.max(G.shake, 2.2); P.emit('spark', e.x + e.nx * 26, e.y + e.ny * 26, 9, { colors: [[PAL.a, PAL.b, PAL.d][e.i], '#ffffff'], speed: [80, 260] }); }
              else P.emit('mote', e.x, e.y, 5, { colors: [CALM, '#ffffff'], speed: [10, 40] });
              hit(b, 'bumper');
              if (G.phase === 'main' && !e.soft && Math.random() < 0.05 && quiet(5000)) talk(rush, line({ Jolly: ['Ding ding ding!', 'Bonk! Love a lobe.'], Cheeky: ['Ping! Pong! Thoughts? What thoughts?', 'Lobe bonk. Very scientific.'], Unfiltered: ['Ding.', 'Bonk.'] }), { mood: 'laugh', ms: 1800 });
              break;
            }
            case 'sling': T.slings[e.i].flash = 1; SFX.sling(e.i); G.shake = Math.max(G.shake, 1.6); P.emit('spark', e.x, e.y, 6, { colors: [PAL.d, '#ffffff'], speed: [60, 180] }); hit(b, 'sling'); break;
            case 'lane': {
              if (!G.lanes[e.i]) { G.lanes[e.i] = 1; SFX.lane(e.i); }
              hit(b, 'lane');
              if (G.lanes.every(x => x)) { G.laneFlash = 1; SFX.lanes(); addPop('FOCUS!', 186, 140, PAL.c); S.later(() => { G.lanes = [0, 0, 0]; }, 700); if (G.phase === 'main' && G.ball && !G.ball.ready) setReady(G.ball); }
              break;
            }
            case 'ramp': {
              SFX.ramp(e.i); G.ramps++;
              const now = performance.now();
              if (G.comboSide && G.comboSide !== T.ramps[e.i].side && now - G.comboAt < 3500) G.combo++; else G.combo = 1;
              G.bestCombo = Math.max(G.bestCombo, G.combo);
              hit(b, 'ramp');
              ctx.track('ramp', { combo: G.combo });
              break;
            }
            case 'rampOut': {
              const R = T.ramps[e.i]; R.fire = 1;
              SFX.synapse(G.combo);
              G.comboSide = R.side; G.comboAt = performance.now();
              addPop(G.combo >= 2 ? 'COMBO ×' + G.combo : 'SYNAPSE!', R.side === 'L' ? 150 : 222, 150, PAL.b, G.combo >= 2);
              if (G.combo === 2 && quiet(1500)) talk(rush, line({ Jolly: 'Combo! Left, right, left… so smooth.', Cheeky: 'Combo! Your hands found a rhythm.', Unfiltered: 'Combo.' }), { mood: 'wow' });
              else if (G.ramps === 1 && quiet(2500)) talk(rush, line({ Jolly: 'Synapse fired! Look at it go!', Cheeky: 'Whee! The thought took the scenic route.', Unfiltered: 'Synapse. Nice shot.' }), { mood: 'celebrate' });
              break;
            }
            case 'park': if (b && b.calm) calmRest(b); else onPark(b, e.direct); break;
            case 'drain': onDrain(b); break;
            case 'replunge': if (G.phase !== 'calm') BPX.plunge(T, b, LAUNCH()); else { b.x = 186; b.y = 60; b.vx = 40; b.vy = 0; } break;
            case 'net': SFX.net(); G.netFlash = 1; break;
            case 'wall': SFX.wall(e.v, e.x); break;
            case 'post': SFX.wall(e.v * 0.8, e.x); break;
            case 'clack': SFX.clack(); break;
          }
        }
        T.ev.length = 0;
      }

      /* ---------------- frame loop ---------------- */
      let lastNow = 0, beatK = 0;
      const QG = { ema: 0, fi: 0, n: 0, lvl: 0 };
      K.loop((dt) => {
        if (!L || !BG) return;
        const now = performance.now(), rdt = clamp((now - (lastNow || now)) / 1000, 0, 0.1); lastNow = now;
        musicTick();
        while (beatQ.length && beatQ[0].at <= now) { const bq = beatQ.shift(); beatK = bq.big ? 1 : 0.6; }
        beatK = Math.max(0, beatK - rdt * 3.2);
        if (G.phase !== 'intro') BPX.step(T, Math.min(0.2, rdt || dt)); // real time, so a struggling device still plays at full speed (sub-stepped, never tunnels)
        events();
        // the PARK IT magnet strengthens the longer a ready ball has been waiting (a quiet assist, never a timer)
        const ready = T.balls.filter(b => b.ready && b.mode === 'play');
        if (ready.length) {
          const oldest = ready.reduce((m, b) => Math.min(m, b.readyAt || now), now), since = (now - oldest) / 1000;
          if (G.phase === 'calm') { const cs = (now - G.calmAt) / 1000; T.magK = cs > 2.5 ? 1100 + (cs - 2.5) * 300 : 0; T.magR = cs > 2.5 ? Math.min(460, 120 + (cs - 2.5) * 90) : 0; }
          else if (G.phase === 'multi') { T.magK = MAGK * 0.9; T.magR = Math.min(150, 70 + since * 6); }
          else { T.magK = MAGK * (since > 18 ? 1 + (since - 18) * 0.08 : 1); T.magR = since > 18 ? Math.min(420, 175 + (since - 18) * 40) : Math.min(175, 60 + since * 12); }
        } else { T.magK = 0; T.magR = 0; }
        if (G.phase === 'multi' && T.net.on && now > G.netUntil) T.net.on = false;
        const cb = G.calmBall;
        if (G.phase === 'calm' && cb && cb.mode === 'play' && (now - G.calmAt) / 1000 > 9.5) { cb.mode = 'glide'; cb.g0 = { x: cb.x, y: cb.y }; cb.gt = now; } // it finds its own way home
        if (cb && cb.mode === 'glide') { const k = eIO((now - cb.gt) / 1400); cb.x = lerp(cb.g0.x, T.hole.x, k); cb.y = lerp(cb.g0.y, T.hole.y, k) - Math.sin(k * Math.PI) * 30; if (k >= 1) calmRest(cb); }
        // decay of lights and juice
        T.bumpers.forEach(bm => { bm.flash = Math.max(0, (bm.flash || 0) - rdt * 4); bm.squash = Math.max(0, (bm.squash || 0) - rdt * 6); });
        T.slings.forEach(s => { s.flash = Math.max(0, (s.flash || 0) - rdt * 5); });
        T.ramps.forEach(r => { r.fire = Math.max(0, (r.fire || 0) - rdt * 1.3); });
        T.flips.forEach(f => { f.glow = Math.max(0, (f.glow || 0) - rdt * 3); });
        G.laneFlash = Math.max(0, G.laneFlash - rdt * 1.5); G.readyFlash = Math.max(0, G.readyFlash - rdt * 1.2); G.multiK = Math.max(0, G.multiK - rdt * 0.35);
        G.netFlash = Math.max(0, (G.netFlash || 0) - rdt * 3); G.plungeK = Math.max(0, (G.plungeK || 0) - rdt * 4);
        G.shake = Math.max(0, G.shake - rdt * 18);
        if (G.phase === 'finale' || G.phase === 'done') G.brainGlow = Math.min(1, G.brainGlow + rdt * 0.6);
        else if (G.phase === 'calm') G.brainGlow = lerp(G.brainGlow, 0.35 + 0.15 * Math.sin(now / 1000 * 1.1), Math.min(1, rdt * 2));
        else G.brainGlow = Math.max(0, G.brainGlow - rdt);
        // trails
        for (const b of T.balls) { if (!b.trail) b.trail = []; if (b.mode === 'play' || b.mode === 'rail' || b.mode === 'glide') { b.trail.push(b.x, b.y); if (b.trail.length > 16) b.trail.splice(0, 2); } else b.trail.length = 0; }
        const t0 = performance.now();
        draw(now / 1000, rdt);
        const dd = performance.now() - t0;
        if (G.phase !== 'intro') { // a struggling device trades canvas resolution for frames (twice at most)
          QG.ema = QG.ema ? QG.ema * 0.92 + dd * 0.08 : dd; QG.fi = QG.fi ? QG.fi * 0.92 + rdt * 80 : rdt * 1000; QG.n++;
          if (QG.n > 40 && QG.lvl < 2 && cv.dpr > 1.2 && (QG.ema > 8 || QG.fi > 45)) { QG.lvl++; QG.n = 0; QG.ema = 0; QG.fi = 0; cv.setQuality(QG.lvl === 1 ? 0.75 : 0.55); }
        }
      });

      /* ---------------- drawing ---------------- */
      function lamp(g, x, y, r, col, k) {
        if (k <= 0.02) return;
        const br = PAL.bright;
        g.globalCompositeOperation = br ? 'source-over' : 'lighter';
        g.globalAlpha = clamp(k, 0, 1) * (br ? 0.45 : 0.85); g.drawImage(K.glowSprite(col), x - r * 3, y - r * 3, r * 6, r * 6);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(k, 0, 1);
        g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      function chevLamp(g, x, y, sz, col, k) {
        if (k <= 0.02) return;
        const br = PAL.bright;
        g.globalCompositeOperation = br ? 'source-over' : 'lighter';
        g.globalAlpha = clamp(k, 0, 1) * (br ? 0.4 : 0.7); g.drawImage(K.glowSprite(col), x - sz * 2.4, y - sz * 2.4, sz * 4.8, sz * 4.8);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(k, 0, 1);
        chevron(g, x, y, sz, 0); g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.stroke();
        g.globalAlpha = 1;
      }
      function drawFlipper(g, f) {
        const ang = Math.atan2(f.ty - f.py, f.tx - f.px), p = PAL;
        g.beginPath(); g.arc(f.tx, f.ty, f.rt, ang - Math.PI / 2, ang + Math.PI / 2); g.arc(f.px, f.py, f.rb, ang + Math.PI / 2, ang + Math.PI * 1.5); g.closePath();
        if (!p.bright) { g.lineWidth = 9 + (f.glow || 0) * 6; g.strokeStyle = hexA(f.pressed ? p.c : p.a, 0.22 + (f.glow || 0) * 0.25); g.lineJoin = 'round'; g.stroke(); }
        g.fillStyle = p.bright ? '#ffffff' : '#f6f3ff'; g.fill();
        g.lineWidth = 3; g.strokeStyle = f.pressed ? p.c : p.a; g.stroke();
        g.fillStyle = p.bright ? '#3a2d66' : '#2b2150'; g.beginPath(); g.arc(f.px, f.py, 4.5, 0, TAU); g.fill();
        g.fillStyle = p.c; g.beginPath(); g.arc(f.px, f.py, 2, 0, TAU); g.fill();
      }
      function drawBall(g, b, now) {
        const p = PAL, onRail = b.mode === 'rail', sc = onRail ? 1.18 : 1;
        let x = b.x, y = b.y;
        if (b.mode === 'wait') { x = 378; y = 686; }
        const hot = b.col || p.c, calmK = b.calm ? 1 : b.ready ? 1 : (b.hits || 0) / NEED * 0.5;
        // trail
        if (b.trail && b.trail.length > 4 && !RED()) {
          g.globalCompositeOperation = p.bright ? 'source-over' : 'lighter';
          for (let i = 0; i < b.trail.length - 2; i += 2) { const k = i / b.trail.length; g.globalAlpha = k * (p.bright ? 0.25 : 0.45); const r = 7 + k * 8; g.drawImage(K.glowSprite(calmK > 0.9 ? CALM : hot), b.trail[i] - r, b.trail[i + 1] - r, r * 2, r * 2); }
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        }
        if (onRail) { g.globalAlpha = 0.35; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x + 7, y + 9, 10, 8, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
        // the thought's colour glows around the chrome; it cools to teal as it gets ready
        const pulse = b.ready ? 0.8 + 0.2 * Math.sin(now * 7) : 1, haloR = (b.calm ? 34 : 24) * sc;
        g.globalCompositeOperation = p.bright ? 'source-over' : 'lighter';
        if (calmK < 1) { g.globalAlpha = (1 - calmK) * (p.bright ? 0.55 : 0.9); g.drawImage(K.glowSprite(hot), x - haloR, y - haloR, haloR * 2, haloR * 2); }
        if (calmK > 0) { g.globalAlpha = calmK * pulse * (p.bright ? 0.6 : 0.95); g.drawImage(K.glowSprite(CALM), x - haloR, y - haloR, haloR * 2, haloR * 2); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        const bs = 12 * sc;
        g.drawImage(SPR.ball, x - bs, y - bs, bs * 2, bs * 2);
        g.lineWidth = 2; g.strokeStyle = hexA(calmK > 0.9 ? CALM : hot, 0.85); g.beginPath(); g.arc(x, y, 9.6 * sc, 0, TAU); g.stroke();
      }
      function draw(t, rdt) {
        const g = cv.g, d = L.dpr, p = PAL, now = performance.now();
        const sh = RED() ? 0 : G.shake, sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (sh) { g.fillStyle = p.room1; g.fillRect(0, 0, cv.el.width, cv.el.height); }
        g.drawImage(BG.c, Math.round(sx * d), Math.round(sy * d));
        g.setTransform(d * L.s, 0, 0, d * L.s, d * (L.ox + sx), d * (L.oy + sy));
        const att = G.phase === 'finale' || G.phase === 'done' ? (now - G.attractAt) / 1000 : -1;
        const dimK = G.dim * (att >= 0 ? 0 : 1);
        // the brain glows: softly with the calm ball, fully in attract mode
        const bgl = G.brainGlow;
        if (bgl > 0.01) { const bx = BRAIN.box; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = p.bright ? 'source-over' : 'lighter'; g.globalAlpha = clamp(bgl, 0, 1) * (p.bright ? 0.5 : 0.85); g.drawImage(BRAIN.c, bx.x, bx.y, bx.w, bx.h, bx.x + Math.round(sx * d), bx.y + Math.round(sy * d), bx.w, bx.h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setTransform(d * L.s, 0, 0, d * L.s, d * (L.ox + sx), d * (L.oy + sy)); }
        // lamps
        const attLamp = (x, y, k0) => { if (att < 0) return k0; if (RED()) return Math.max(k0, clamp(att / 1.5, 0, 1)); const wave = 0.5 + 0.5 * Math.sin(att * 6 - y * 0.03 - Math.abs(x - 186) * 0.02); return Math.max(k0, att < 3 ? wave : 0.75 + 0.25 * Math.sin(att * 3 + x * 0.05)); };
        T.lanes.forEach((l, i) => lamp(g, l.x, 122, 7, p.c, attLamp(l.x, 122, (G.lanes[i] ? 1 : 0) * (G.laneFlash > 0 ? 0.5 + 0.5 * Math.sin(t * 30) : 1) * (1 - dimK * 0.7))));
        const ballReady = (G.phase === 'main' && G.ball && G.ball.ready) || G.phase === 'multi';
        const comboLit = G.comboSide && now - G.comboAt < 3500;
        T.ramps.forEach(r => { const x = (r.x0 + r.x1) / 2, want = comboLit && G.comboSide !== r.side; [450, 474].forEach((y, k) => chevLamp(g, x, y, 10, p.b, attLamp(x, y, want ? 0.5 + 0.5 * Math.sin(t * 9 - k * 1.2) : (0.1 + beatK * (k ? 0.18 : 0.3)) * (1 - dimK)))); });
        [498, 478, 458].forEach((y, k) => chevLamp(g, 186, y, 11, CALM, attLamp(186, y, ballReady ? 0.5 + 0.5 * Math.sin(t * 8 - k * 1.3) : 0)));
        if (G.multiK > 0 || G.phase === 'multi' || att >= 0) { // the cerebellum lights up for multiball
          const k = clamp(G.phase === 'multi' ? 0.6 + 0.4 * Math.sin(t * 10) : Math.max(G.multiK, att >= 0 ? attLamp(186, 556, 0) : 0), 0, 1);
          g.globalCompositeOperation = p.bright ? 'source-over' : 'lighter'; g.globalAlpha = k * (p.bright ? 0.45 : 0.9); g.drawImage(K.glowSprite(p.d), 186 - 80, 556 - 44, 160, 88);
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = k;
          for (const side of [-1, 1]) { g.beginPath(); g.ellipse(186 + side * 27, 556, 31, 17, side * 0.12, 0, TAU); g.fillStyle = hexA(p.d, p.bright ? 0.55 : 0.5); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.stroke(); }
          g.font = '400 13px ' + ARC; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = Math.max(0.75, k); g.lineWidth = 3.5; g.strokeStyle = p.bright ? '#ffffff' : 'rgba(0,0,0,0.65)'; g.strokeText('MULTIBALL', 186, 557); g.fillStyle = p.bright ? '#1b1236' : '#ffffff'; g.fillText('MULTIBALL', 186, 557);
          g.globalAlpha = 1;
        }
        // PARK IT: the readiness ring, the swirl and the sign
        const H = T.hole, cur = G.phase === 'main' ? G.ball : null, need = NEED;
        const filled = G.phase === 'multi' || G.phase === 'calm' || att >= 0 ? need : cur ? Math.min(need, cur.hits || 0) : 0;
        for (let i = 0; i < need; i++) {
          const a0 = -Math.PI / 2 + i / need * TAU + 0.08, a1 = -Math.PI / 2 + (i + 1) / need * TAU - 0.08, on = i < filled;
          g.lineCap = 'round';
          if (on && !p.bright) { g.lineWidth = 11; g.strokeStyle = hexA(CALM, 0.22); g.beginPath(); g.arc(H.x, H.y, 27, a0, a1); g.stroke(); }
          g.lineWidth = 5; g.strokeStyle = on ? CALM : hexA(CALM, 0.18);
          g.beginPath(); g.arc(H.x, H.y, 27, a0, a1); g.stroke();
        }
        const holeLit = ballReady || G.phase === 'calm' || att >= 0;
        if (holeLit) {
          const k = (0.6 + 0.4 * Math.sin(t * 6)) * (G.phase === 'calm' ? 0.6 : 1);
          g.globalCompositeOperation = p.bright ? 'source-over' : 'lighter'; g.globalAlpha = k * (p.bright ? 0.5 : 0.9);
          g.drawImage(K.glowSprite(CALM), H.x - 46, H.y - 46, 92, 92); g.globalCompositeOperation = 'source-over';
          g.strokeStyle = hexA(CALM, 0.85); g.lineWidth = 1.6;
          for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; g.globalAlpha = 0.8; g.beginPath(); g.arc(H.x, H.y, 11 + i * 2, a, a + 1.6); g.stroke(); }
          g.globalAlpha = clamp(k + G.readyFlash, 0, 1); g.drawImage(SPR.park, 186 - 65, 366 - 22, 130, 44); g.globalAlpha = 1;
        }
        if (G.calmBall && G.calmBall.mode === 'rest') { g.globalCompositeOperation = p.bright ? 'source-over' : 'lighter'; g.globalAlpha = 0.9; g.drawImage(K.glowSprite(CALM), H.x - 40, H.y - 40, 80, 80); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.drawImage(SPR.ball, H.x - 12, H.y - 12, 24, 24); }
        // bumpers: neuron caps that flash and squash when they fire
        T.bumpers.forEach((bm, i) => {
          const fl = Math.max(bm.flash || 0, att >= 0 ? (RED() ? 0.6 : 0.5 + 0.5 * Math.sin(att * 7 - i * 2.1)) : 0), sq = bm.squash || 0, sz = SPR.capW * (1 - sq * 0.08 + (fl > 0.6 ? 0.04 : 0));
          g.drawImage(SPR.caps[i].idle, bm.x - sz / 2, bm.y - sz / 2, sz, sz);
          if (fl > 0.02) { g.globalAlpha = clamp(fl, 0, 1); g.drawImage(SPR.caps[i].lit, bm.x - sz / 2, bm.y - sz / 2, sz, sz); g.globalAlpha = 1; }
        });
        // slingshots flash
        T.vis.slings.forEach((sl, i) => {
          const fl = Math.max(T.slings[i].flash || 0, att >= 0 ? attLamp(sl.A[0], 530, 0) * 0.6 : 0);
          if (fl <= 0.02) return;
          g.globalAlpha = clamp(fl, 0, 1); g.lineCap = 'round';
          g.beginPath(); g.moveTo(sl.A[0], sl.A[1]); g.lineTo(sl.C[0], sl.C[1]);
          g.lineWidth = 16; g.strokeStyle = hexA(p.d, p.bright ? 0.25 : 0.4); g.stroke();
          g.lineWidth = 6; g.strokeStyle = p.bright ? p.d : '#ffffff'; g.stroke(); g.globalAlpha = 1;
        });
        // the safety net
        if (T.net.on) { const k = 0.55 + 0.25 * Math.sin(t * 5) + (G.netFlash || 0) * 0.4; g.strokeStyle = hexA(CALM, clamp(k, 0, 1)); g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(138, 694); g.lineTo(234, 694); g.stroke(); g.setLineDash([]); }
        // the plunger rod pulls back and snaps
        const pk = G.waitLaunch ? 0.5 + 0.5 * Math.sin(t * 5) : G.plungeK;
        g.fillStyle = p.bright ? '#7d70a8' : '#8d84b8'; g.fillRect(374, 700 + pk * 10, 8, 26);
        // balls on the playfield, then flippers
        for (const b of T.balls) if (b.mode === 'play' || b.mode === 'wait' || b.mode === 'glide') drawBall(g, b, t);
        T.flips.forEach(f => drawFlipper(g, f));
        if (dimK > 0.01) { g.fillStyle = p.bright ? 'rgba(255,250,240,' + (dimK * 0.28) + ')' : 'rgba(2,0,10,' + (dimK * 0.4) + ')'; g.fillRect(0, 0, 400, 790); }
        // the ramps sit above the playfield
        g.setTransform(1, 0, 0, 1, 0, 0); for (const bx of UP.boxes) g.drawImage(UP.c, bx.x, bx.y, bx.w, bx.h, bx.x + Math.round(sx * d), bx.y + Math.round(sy * d), bx.w, bx.h);
        g.setTransform(d * L.s, 0, 0, d * L.s, d * (L.ox + sx), d * (L.oy + sy));
        T.ramps.forEach(r => {
          const riders = T.balls.filter(b => b.mode === 'rail' && b.rail === r);
          const fire = Math.max(r.fire || 0, att >= 0 ? 0.7 : 0);
          if (riders.length || fire > 0.02) {
            g.globalCompositeOperation = p.bright ? 'source-over' : 'lighter';
            const pts = r.p;
            const pos = riders.length ? riders[0].s : ((att >= 0 ? (att * 500) : (1 - fire) * pts.len * 1.4) % pts.len);
            for (let k = 0; k < 7; k++) { const q = pts.at(pos - k * 12); g.globalAlpha = (1 - k / 7) * (riders.length ? 0.9 : fire) * (p.bright ? 0.5 : 0.9); const rr = 16 - k; g.drawImage(K.glowSprite(p.b), q.x - rr, q.y - rr, rr * 2, rr * 2); }
            g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
          }
          if (fire > 0.02) { const [nx, ny] = r.node; g.globalCompositeOperation = p.bright ? 'source-over' : 'lighter'; g.globalAlpha = clamp(fire, 0, 1) * (p.bright ? 0.5 : 1); g.drawImage(K.glowSprite(p.c), nx - 26, ny - 30, 52, 52); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        });
        for (const b of T.balls) if (b.mode === 'rail') drawBall(g, b, t);
        // particles and pops
        P.update(rdt); P.draw(g);
        drawPops(g, now);
        // vacuum tubes: a glass tube appears from the hole to the LATER drawer and the ball shoots up it
        g.setTransform(d, 0, 0, d, 0, 0);
        drawTubes(g, now);
        g.setTransform(1, 0, 0, 1, 0, 0);
      }
      function drawPops(g, now) {
        for (let i = G.pops.length - 1; i >= 0; i--) {
          const q = G.pops[i], k = (now - q.t0) / 1100;
          if (k >= 1) { G.pops.splice(i, 1); continue; }
          const y = q.y - eOut(k) * 26, a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4), sc = k < 0.15 ? 0.7 + k * 2.4 : 1.06 - Math.min(0.06, (k - 0.15));
          g.save(); g.translate(q.x, y); g.scale(sc, sc); g.globalAlpha = clamp(a, 0, 1);
          g.font = '400 ' + (q.big ? 22 : 17) + 'px ' + ARC; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineWidth = 4; g.strokeStyle = PAL.bright ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.75)'; g.strokeText(q.text, 0, 0);
          g.fillStyle = PAL.bright ? mix(q.col, '#000000', 0.25) : q.col; g.fillText(q.text, 0, 0);
          g.restore();
        }
      }
      function drawTubes(g, now) {
        for (let i = G.tubes.length - 1; i >= 0; i--) {
          const tb = G.tubes[i], k = (now - tb.t0) / 1300;
          if (k >= 1) { G.tubes.splice(i, 1); continue; }
          const a = tb.from, b = tb.to, c1 = { x: a.x, y: a.y - Math.max(120, (a.y - b.y) * 0.75) }, c2 = { x: b.x + (b.x > a.x ? 30 : -30), y: b.y + 110 };
          const at = (u) => { const m = 1 - u; return { x: m * m * m * a.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * b.x, y: m * m * m * a.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * b.y }; };
          const vis = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1, tw = 9 * L.s;
          const curve = () => { g.beginPath(); g.moveTo(a.x, a.y); g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y); };
          g.lineCap = 'round';
          curve(); g.strokeStyle = PAL.bright ? 'rgba(150,240,225,' + (0.3 * vis) + ')' : 'rgba(170,255,240,' + (0.12 * vis) + ')'; g.lineWidth = tw * 2; g.stroke();
          g.strokeStyle = hexA(CALM, 0.7 * vis); g.lineWidth = 1.2;
          for (const off of [-tw, tw]) { g.save(); g.translate(off * 0.7, 0); curve(); g.stroke(); g.restore(); }
          const u = eIO(clamp((k - 0.12) / 0.6, 0, 1));
          if (u > 0 && u < 1) {
            const q = at(u);
            g.globalCompositeOperation = PAL.bright ? 'source-over' : 'lighter';
            for (let j = 0; j < 7; j++) { const qq = at(Math.max(0, u - j * 0.025)), r = (15 - j * 1.8) * L.s; g.globalAlpha = (1 - j / 7) * 0.8; g.drawImage(K.glowSprite(tb.col), qq.x - r * 1.6, qq.y - r * 1.6, r * 3.2, r * 3.2); }
            g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
            const bs = 11 * L.s; g.drawImage(SPR.ball, q.x - bs, q.y - bs, bs * 2, bs * 2);
          }
        }
      }

      /* ---------------- start ---------------- */
      (async () => {
        await K.intro({ title: 'Brain Pinball', sub: 'Your thoughts are bouncing around in there. Let’s play with them.', how: 'Tap left or right to flip. Light each thought, then sink it in PARK IT.', char: 'glitch', mood: 'wow' });
        buildThoughts();
        G.phase = 'main'; MU.on = true;
        if (A.ctx) A.whoosh({ vol: 0.08, dur: 0.6 });
        const first = visits >= 2 ? line({ Jolly: 'Welcome back! Today’s table: ' + TH0.name + '.', Cheeky: 'Back for more? It’s ' + TH0.name + ' today.', Unfiltered: TH0.name + ' today. Launch.' })
          : line({ Jolly: 'Your thoughts are loaded. Tap to launch!', Cheeky: 'Your brain, but make it pinball. Launch!', Unfiltered: 'Thoughts loaded. Tap to launch.' });
        talk(glitch, first, { mood: 'happy', ms: 3000 });
        spawnThought();
      })();

      return {
        async autoplay() {
          const card = () => el.querySelector('.gk-intro');
          for (let i = 0; i < 40 && G.phase === 'intro'; i++) { await K.wait(150); if (i === 6 && card()) await K.sim.tap(card()); }
          while (G.phase === 'intro') await K.wait(120);
          const t0 = performance.now();
          const hold = { L: null, R: null }, at = { L: 0, R: 0 }, rel = { L: 0, R: 0 }, aim = { L: 0.45, R: 0.45 };
          const zone = { L: zoneL, R: zoneR };
          const zp = (side) => { const z = zone[side]; return { x: z.clientWidth * 0.5, y: z.clientHeight * 0.75 }; };
          while (!finished && performance.now() - t0 < 140000) {
            const now = performance.now();
            if (G.waitLaunch && now - G.waitSince > 450 && G.phase === 'main') { const q = zp('R'); await K.sim.tap(zoneR, q.x, q.y); await K.wait(120); continue; }
            for (const f of T.flips) {
              const id = f.id;
              let want = false;
              if (G.phase === 'main' || G.phase === 'multi') {
                for (const b of T.balls) {
                  if (b.mode !== 'play') continue;
                  const dx = b.x - f.px, dy = b.y - f.py, dd = Math.hypot(dx, dy), side = id === 'L' ? dx > -8 : dx < 8;
                  if (side && dd < f.len + 6 && dy < 30 && dy > -70 && b.vy > -50 && Math.abs(dx) / f.len > aim[id]) want = true;
                }
              }
              if (want && !hold[id] && now - rel[id] > 110) { const q = zp(id); hold[id] = await K.sim.press(zone[id], q.x, q.y); at[id] = performance.now(); aim[id] = 0.2 + Math.random() * 0.6; }
              if (hold[id] && performance.now() - at[id] > 150) { const q = zp(id); hold[id].up(q.x, q.y); hold[id] = null; rel[id] = performance.now(); }
            }
            await K.wait(16);
          }
          for (const id of ['L', 'R']) if (hold[id]) { const q = zp(id); hold[id].up(q.x, q.y); }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
