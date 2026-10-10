/* 038 Doodle Monster — Reset · PLAY · Creativity / Mind Play
 * Mechanism: externalising a feeling as a character (narrative therapy's externalisation, White & Epston 1990; art-based
 * expression): drawing the feeling gives it an outside shape, a silly name and a life of its own, so it becomes something you
 * look at and look after rather than something you are. Caring for it (feed, tickle, sit) shrinks it; when it puffs itself up
 * big and scary, a tiny hat makes it ridiculous (humour takes the threat out of it).
 * Verb: draw (free drawing that comes alive as a jelly creature: verlet shape matching along your own strokes, googly eyes,
 * little legs), then drag a snack to its mouth, rub to tickle, hold to make it sit, and draw a tiny hat.
 * Twist: it tries to grow big and scary; you draw a tiny hat on it and it deflates with a raspberry, giggling.
 * Finale: it waves goodbye, toddles to the corner of the page and curls up asleep; the page saves as a card in your sketchbook.
 */
(function (env) {
  'use strict';
  /* SOFTBODY-BEGIN */
  /* The doodle's body: every point of every stroke is a verlet particle, pulled each substep towards a best-fit copy of
     the drawn shape (meshless shape matching, Müller et al. 2005). So it keeps the exact shape you drew, but it is jelly:
     it lands with a squash, wobbles when tickled, swells and shrinks, and stays upright like a wobbly toy. */
  const DMX = (() => {
    const TAU2 = Math.PI * 2, H = 1 / 240;
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    function hull(P) { // Andrew's monotone chain; items keep any extra fields
      const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      if (p.length < 3) return p;
      const lo = [], up = [];
      for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
      up.pop(); lo.pop();
      return lo.concat(up);
    }
    /* strokes [[{x,y}...]...] -> evenly spaced points [[x,y]...] per stroke, about maxPts in all */
    function resample(strokes, maxPts) {
      let total = 0;
      const lens = strokes.map(s => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y); total += L; return L; });
      const sp = Math.max(4.5, total / Math.max(10, maxPts - strokes.length * 2));
      return strokes.map((s, k) => {
        const out = [[s[0].x, s[0].y]];
        if (lens[k] < 2.5) { out.push([s[0].x + 1.2, s[0].y + 0.6]); return out; } // a dot stays a dot
        let need = sp;
        for (let i = 1; i < s.length; i++) {
          let ax = s[i - 1].x, ay = s[i - 1].y, L = Math.hypot(s[i].x - ax, s[i].y - ay);
          const bx = s[i].x, by = s[i].y;
          while (L >= need) { const t = need / L; ax += (bx - ax) * t; ay += (by - ay) * t; out.push([ax, ay]); L -= need; need = sp; }
          need -= L;
        }
        const last = s[s.length - 1], pl = out[out.length - 1];
        if (Math.hypot(last.x - pl[0], last.y - pl[1]) > sp * 0.3 || out.length < 2) out.push([last.x, last.y]);
        return out;
      });
    }
    function nearest(M, x, y, k) { // the k rest particles nearest a rest-space point, inverse-distance weights
      const c = [];
      for (let i = 0; i < M.n; i++) { const d = Math.hypot(M.rx[i] - x, M.ry[i] - y); if (c.length < k || d < c[c.length - 1][1]) { c.push([i, d]); c.sort((a, b) => a[1] - b[1]); if (c.length > k) c.pop(); } }
      let s = 0; c.forEach(q => { q[1] = 1 / (q[1] + 10); s += q[1]; });
      return c.map(q => [q[0], q[1] / s]);
    }
    /* rs: resampled strokes (page coords). size: the longest side of the rest shape. */
    function build(rs, size) {
      const pts = [], strokes = [];
      rs.forEach(s => { const i0 = pts.length; s.forEach(q => pts.push(q)); strokes.push([i0, pts.length - 1]); });
      const n = pts.length;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, mx = 0, my = 0;
      pts.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); mx += q[0]; my += q[1]; });
      mx /= n; my /= n;
      const k = clamp(size / Math.max(x1 - x0, y1 - y0, 1), 0.3, 3.4);
      const F = (len) => new Float32Array(len);
      const M = { n, strokes, k, x: F(n), y: F(n), px: F(n), py: F(n), rx: F(n), ry: F(n), gx: F(n), gy: F(n),
        cx: mx, cy: my, th: 0, thT: 0, upright: 0.35, stiff: 0.2, damp: 0.3, grav: 2400, sNow: 1, sq: 0, sqv: 0, floor: 1e9, wl: -1e9, wr: 1e9, walkTo: null, walkV: 150, land: 0 };
      for (let i = 0; i < n; i++) { M.x[i] = M.px[i] = M.gx[i] = pts[i][0]; M.y[i] = M.py[i] = M.gy[i] = pts[i][1]; M.rx[i] = (pts[i][0] - mx) * k; M.ry[i] = (pts[i][1] - my) * k; }
      // the body: the hull of the strokes thickened by a disc, so a single line still makes a little capsule of a body
      const R = 10, ex = [];
      for (let i = 0; i < n; i++) for (let a = 0; a < 8; a++) { const an = a / 8 * TAU2; ex.push([M.rx[i] + Math.cos(an) * R, M.ry[i] + Math.sin(an) * R, i, Math.cos(an) * R, Math.sin(an) * R]); }
      const hv = hull(ex);
      M.hull = hv.map(q => ({ i: q[2], ox: q[3], oy: q[4] }));
      const hp = hv.map(q => [q[0], q[1]]);
      let hx0 = 1e9, hx1 = -1e9, hy0 = 1e9, hy1 = -1e9;
      hp.forEach(q => { hx0 = Math.min(hx0, q[0]); hx1 = Math.max(hx1, q[0]); hy0 = Math.min(hy0, q[1]); hy1 = Math.max(hy1, q[1]); });
      const bw = hx1 - hx0, bh = hy1 - hy0, xc = (hx0 + hx1) / 2;
      const yAt = (X, low) => { let best = null; for (let j = 0; j < hp.length; j++) { const a = hp[j], b = hp[(j + 1) % hp.length]; if ((a[0] - X) * (b[0] - X) > 0 || a[0] === b[0]) continue; const y = a[1] + (b[1] - a[1]) * (X - a[0]) / (b[0] - a[0]); if (best == null || (low ? y > best : y < best)) best = y; } return best == null ? (low ? hy1 : hy0) : best; };
      const xAt = (Y, right) => { let best = null; for (let j = 0; j < hp.length; j++) { const a = hp[j], b = hp[(j + 1) % hp.length]; if ((a[1] - Y) * (b[1] - Y) > 0 || a[1] === b[1]) continue; const x = a[0] + (b[0] - a[0]) * (Y - a[1]) / (b[1] - a[1]); if (best == null || (right ? x > best : x < best)) best = x; } return best == null ? (right ? hx1 : hx0) : best; };
      Object.assign(M, { bw, bh, hx0, hx1, hy0, hy1, xc, hp });
      // closed loops you drew become filled body parts; the biggest one is the body outline (for spikes)
      M.loops = []; let best = 0;
      strokes.forEach(([a, b]) => {
        if (b - a < 6) return;
        let len = 0, area = 0;
        for (let i = a + 1; i <= b; i++) len += Math.hypot(M.rx[i] - M.rx[i - 1], M.ry[i] - M.ry[i - 1]);
        const gap = Math.hypot(M.rx[b] - M.rx[a], M.ry[b] - M.ry[a]);
        if (len < 60 || gap > Math.max(22, len * 0.18)) return;
        for (let i = a; i <= b; i++) { const j = i === b ? a : i + 1; area += M.rx[i] * M.ry[j] - M.rx[j] * M.ry[i]; }
        area = Math.abs(area / 2);
        if (area < 400) return;
        M.loops.push([a, b]);
        if (area > best) { best = area; M.main = [a, b]; }
      });
      const anc = (x, y, extra) => Object.assign({ x, y, nb: nearest(M, x, y, 4) }, extra || {});
      // features: googly eyes (one for a tall doodle, three for a long one), a mouth, little legs, arms for waving, a hat spot
      const asp = bw / Math.max(1, bh), ne = asp > 1.75 ? 3 : asp < 0.5 ? 1 : 2;
      const er = clamp(Math.min(bw, bh) * 0.12, 11, 23) * (ne === 1 ? 1.45 : 1);
      const top = yAt(xc, false), bot = yAt(xc, true);
      const ey = top + Math.max(er * 1.3, (bot - top) * 0.3);
      const sep = clamp(bw * 0.16, er * 1.2, bw * 0.32);
      const exs = ne === 1 ? [xc] : ne === 2 ? [xc - sep, xc + sep] : [xc - sep * 1.55, xc, xc + sep * 1.55];
      M.eyes = exs.map((x, j) => { const r = ne === 3 && j !== 1 ? er * 0.85 : er; const y = ne === 3 && j === 1 ? ey - er * 0.45 : ey; return anc(x, y, { r, ox: 0, oy: r * 0.3, vx: 0, vy: 0, lx: null, ly: null, lvx: 0, lvy: 0 }); });
      const my2 = Math.min(ey + er * 1.6 + bh * 0.05, bot - Math.max(10, bh * 0.12));
      M.mouth = anc(xc, Math.max(my2, ey + er * 1.15), { w: clamp(bw * 0.2, 16, 44) });
      const nl = asp > 1.45 ? 3 : 2, lx = nl === 2 ? [xc - bw * 0.2, xc + bw * 0.2] : [xc - bw * 0.3, xc, xc + bw * 0.3];
      M.legs = lx.map((x, j) => anc(x, yAt(x, true) - 6, { j, side: x < xc - 1 ? -1 : x > xc + 1 ? 1 : 0, fx: null, fy: 0, sx: 0, ex: 0, st: 1 }));
      const ay = ey + (bot - ey) * 0.4;
      M.arms = [anc(xAt(ay, false) + 5, ay, { side: -1 }), anc(xAt(ay, true) - 5, ay, { side: 1 })];
      M.hat = anc(xc, top + 4);
      M.belly = anc(xc, (ey + bot) / 2);
      return M;
    }
    function step(M, h) {
      const n = M.n, x = M.x, y = M.y, px = M.px, py = M.py, rx = M.rx, ry = M.ry;
      const damp = Math.pow(M.damp, h), g = M.grav * h * h;
      for (let i = 0; i < n; i++) { const vx = (x[i] - px[i]) * damp, vy = (y[i] - py[i]) * damp; px[i] = x[i]; py[i] = y[i]; x[i] += vx; y[i] += vy + g; }
      let cx = 0, cy = 0;
      for (let i = 0; i < n; i++) { cx += x[i]; cy += y[i]; }
      cx /= n; cy /= n;
      if (M.walkTo != null) { const v = clamp((M.walkTo - cx) * 3, -M.walkV, M.walkV) * h; if (v > 1e-4 || v < -1e-4) { for (let i = 0; i < n; i++) { x[i] += v; px[i] += v; } cx += v; } }
      let a00 = 0, a01 = 0, a10 = 0, a11 = 0;
      for (let i = 0; i < n; i++) { const dx = x[i] - cx, dy = y[i] - cy; a00 += dx * rx[i]; a01 += dx * ry[i]; a10 += dy * rx[i]; a11 += dy * ry[i]; }
      let th = Math.atan2(a10 - a01, a00 + a11);
      th += (M.thT - th) * (1 - Math.pow(1 - M.upright, h * 60));
      M.th = th;
      const c = Math.cos(th), s = Math.sin(th), sx = M.sNow * (1 + M.sq * 0.6), sy = M.sNow * (1 - M.sq), al = 1 - Math.pow(1 - M.stiff, h * 60);
      for (let i = 0; i < n; i++) { const lx = rx[i] * sx, ly = ry[i] * sy, gx = cx + c * lx - s * ly, gy = cy + s * lx + c * ly; M.gx[i] = gx; M.gy[i] = gy; x[i] += (gx - x[i]) * al; y[i] += (gy - y[i]) * al; }
      const fl = M.floor; let hit = 0;
      for (let i = 0; i < n; i++) {
        if (y[i] > fl) { const vy = y[i] - py[i]; if (vy > hit) hit = vy; y[i] = fl; px[i] = x[i] - (x[i] - px[i]) * 0.5; }
        if (x[i] < M.wl) x[i] = M.wl; else if (x[i] > M.wr) x[i] = M.wr;
      }
      M.cx = cx; M.cy = cy;
      if (hit / h > M.land) M.land = hit / h;
    }
    function anchor(M, A, out) { // where a rest-space feature is now, riding the jelly
      const c = Math.cos(M.th), s = Math.sin(M.th), sx = M.sNow * (1 + M.sq * 0.6), sy = M.sNow * (1 - M.sq);
      const lx = A.x * sx, ly = A.y * sy;
      let x = M.cx + c * lx - s * ly, y = M.cy + s * lx + c * ly;
      for (const q of A.nb) { x += (M.x[q[0]] - M.gx[q[0]]) * q[1]; y += (M.y[q[0]] - M.gy[q[0]]) * q[1]; }
      out = out || {}; out.x = x; out.y = y; return out;
    }
    function poke(M, x, y, vx, vy, rad) { // a local impulse (a tickle, a chomp): particles near (x, y) get a push
      for (let i = 0; i < M.n; i++) { const d = Math.hypot(M.x[i] - x, M.y[i] - y); if (d < rad) { const k = (1 - d / rad) * H; M.px[i] -= vx * k; M.py[i] -= vy * k; } }
    }
    function kick(M, vx, vy) { for (let i = 0; i < M.n; i++) { M.px[i] -= vx * H; M.py[i] -= vy * H; } } // the whole body (a hop)
    function lowest(M) { let m = -1e9; for (let i = 0; i < M.n; i++) if (M.y[i] > m) m = M.y[i]; return m; }
    return { H, hull, resample, build, step, anchor, poke, kick, lowest };
  })();
  /* SOFTBODY-END */

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const eOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const eIO = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const eBack = (t) => { t = clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const rgbC = new Map();
  function rgbOf(hex) { let v = rgbC.get(hex); if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbC.set(hex, v); } return v; }
  const hexA = (hex, a) => 'rgba(' + rgbOf(hex).join(',') + ',' + a + ')';
  function mix(a, b, t) { const x = rgbOf(a), y = rgbOf(b); return '#' + x.map((q, i) => clamp(Math.round(q + (y[i] - q) * t), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function rngOf(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const hash = (i, j) => { let x = (i * 374761393 + j * 668265263) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

  /* Today's pen (a new one every day of the week): ink for cream paper, gel colour for the black sketchbook, and its key. */
  const PENS = [
    { id: 'grape', name: 'Grape Gel', ink: '#5b33c9', gel: '#b79bff', key: 0 },
    { id: 'tangerine', name: 'Tangerine Marker', ink: '#cf500c', gel: '#ffa766', key: 2 },
    { id: 'bubblegum', name: 'Bubblegum Pen', ink: '#c42273', gel: '#ff8fc4', key: 4 },
    { id: 'ocean', name: 'Ocean Ink', ink: '#1561bd', gel: '#6cc4ff', key: 5 },
    { id: 'mint', name: 'Mint Crayon', ink: '#0b8560', gel: '#5ff0b8', key: 7 },
    { id: 'cherry', name: 'Cherry Pop', ink: '#c42637', gel: '#ff7a85', key: 9 },
    { id: 'lemon', name: 'Lemon Zest', ink: '#946a00', gel: '#ffe066', key: -1 }
  ];
  const SNACKS = ['cookie', 'donut', 'broccoli', 'cupcake', 'sock', 'pretzel', 'cheese'];
  const SNACK_NAME = { cookie: 'a cookie', donut: 'a donut', broccoli: 'some broccoli', cupcake: 'a cupcake', sock: 'a sock', pretzel: 'a pretzel', cheese: 'some cheese' };
  /* One accessory unlocks per finished visit, always in this order (never random), and your next monster wears it. */
  const ACCS = ['bowtie', 'sneakers', 'glasses', 'mustache', 'flower', 'scarf', 'monocle'];
  const ACC_NAME = { bowtie: 'a tiny bow tie', sneakers: 'little sneakers', glasses: 'round glasses', mustache: 'a fancy mustache', flower: 'a flower', scarf: 'a cosy scarf', monocle: 'a monocle' };
  const NAMES = {
    Jolly: { a: ['Sir', 'Lady', 'Little', 'Captain', 'Professor', 'Baby', 'Count', 'Princess', 'Duke', 'Auntie'], b: ['Wobbles', 'Fizzwick', 'Mumbles', 'Squiggle', 'Bumble', 'Puddle', 'Noodle', 'Biscuit', 'Doodlebug', 'Pickle', 'Waffles', 'Sprout'], c: ['the Third', 'McFluff', 'of the Margins', 'von Scribble', 'Junior', 'the Brave', 'the Squishy', '', '', ''] },
    Cheeky: { a: ['Lord', 'Big', 'Detective', 'Sergeant', 'Madame', 'Uncle', 'Dr', 'Grumpy'], b: ['Gary', 'Fretsworth', 'Grumbo', 'Kevin', 'Sulky', 'Wigglebum', 'Muffin', 'Squeaky', 'Kerfuffle', 'Brenda', 'Overthinkus', 'Panicpants'], c: ['the Unbothered', 'Esq.', 'of Mild Concern', 'the Dramatic', 'McWorry', 'the Lumpy', 'Who Sighs', '', ''] },
    Unfiltered: { a: ['', '', '', 'The', 'Old', 'Big'], b: ['Steve', 'Blob', 'Lump', 'Greg', 'Smudge', 'Nope', 'Bob', 'Fuzz', 'Chonk', 'Meh'], c: ['', '', '', 'Jr', 'the Blob', 'Two'] }
  };
  const SOFT_OUT = ['Fretsworth', 'Overthinkus', 'Panicpants', 'Nope', 'Meh', 'of Mild Concern', 'McWorry', 'Who Sighs', 'Grumpy', 'Sulky', 'the Dramatic'];
  function makeName(seed, vibe, careMode) {
    const R = rngOf(seed * 2654435761 + 11), N = NAMES[vibe] || NAMES.Jolly;
    const pick = (arr) => { const a = careMode ? arr.filter(x => !SOFT_OUT.includes(x)) : arr; return a[Math.floor(R() * a.length) % a.length]; };
    let s = [pick(N.a), pick(N.b), pick(N.c)].filter(Boolean).join(' ').trim();
    if (s.length > 24) s = [pick(N.a), pick(N.b)].filter(Boolean).join(' ');
    return s || 'Blob';
  }
  const PROG = [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]]; // I vi IV V: a bouncy major key

  (env.games = env.games || []).push({
    id: 'doodle-monster', mode: 'reset', name: 'Doodle Monster', verb: 'draw', family: 'PLAY', minutes: 2,
    parents: ['Creativity / Mind Play', 'Emotion', 'Overthinking / Thought Fusion'],
    cast: ['loopie', 'sync'], poster: { char: 'loopie', mood: 'silly' },
    tagline: 'Draw how it feels. It comes alive, wobbles, and gets a tiny hat.',
    why: 'For a big feeling: give it a shape and a silly life, and it gets smaller.',
    fonts: ['Gaegu:wght@400;700', 'Londrina+Solid:wght@400;900'],
    css: `
.g-doodle-monster { --dm-hand: "Gaegu", "Comic Sans MS", "Chalkboard SE", "Segoe Print", "Poppins", system-ui, sans-serif; --dm-disp: "Londrina Solid", "Gaegu", "Arial Rounded MT Bold", "Poppins", system-ui, sans-serif;
  --dm-pen: #5b33c9; --dm-card: #fffdf7; --dm-cardink: #2a2240; --dm-sub: #6c6385; background: #d6dee8; }
.g-doodle-monster.dm-dark { --dm-card: #24263a; --dm-cardink: #f4f1ff; --dm-sub: #b9b4d2; background: #0c0d19; }
.g-doodle-monster .dm-pad { position: absolute; z-index: 12; touch-action: none; cursor: crosshair; outline: none; -webkit-tap-highlight-color: transparent; }
.g-doodle-monster .dm-pad.dm-grab { cursor: grab; }
.g-doodle-monster .dm-pad:focus-visible { box-shadow: inset 0 0 0 3px var(--dm-pen); border-radius: 9px; }
.g-doodle-monster .dm-note { position: absolute; z-index: 32; padding: 9px 13px 10px; background: #fff0a3; color: #2a2240; border-radius: 3px 4px 12px 3px; transform: rotate(-1.3deg);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05), 0 12px 18px -8px rgba(40, 30, 10, 0.45); pointer-events: none; display: flex; flex-direction: column; justify-content: center; gap: 3px; min-height: 66px; }
.g-doodle-monster .dm-note::before { content: ""; position: absolute; left: 50%; top: -8px; width: 62px; height: 17px; margin-left: -31px; background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(60, 50, 20, 0.08); transform: rotate(2.5deg); }
.g-doodle-monster .dm-note small { font: 700 15px/1 var(--dm-hand); letter-spacing: 0.04em; text-transform: uppercase; color: #7b6413; }
.g-doodle-monster .dm-note .gk-user { display: block; font: 700 21px/1.02 var(--dm-hand); color: #2a2240; text-transform: uppercase; overflow-wrap: anywhere; }
.g-doodle-monster .dm-note .dm-task { display: block; font: 700 22px/1.02 var(--dm-hand); color: #2a2240; }
.g-doodle-monster .dm-todo { display: flex; align-items: center; gap: 7px; margin-top: 3px; font: 700 15px/1 var(--dm-hand); color: #7b6413; }
.g-doodle-monster .dm-todo i { position: relative; width: 15px; height: 15px; border: 2px solid #2a2240; border-radius: 3px 4px 3px 5px; flex: none; }
.g-doodle-monster .dm-todo i.dm-on::after { content: ""; position: absolute; left: 3px; top: -6px; width: 6px; height: 13px; border: solid var(--dm-tick, #5b33c9); border-width: 0 3px 3px 0; transform: rotate(38deg); }
.g-doodle-monster .dm-ctrl { position: absolute; z-index: 34; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); min-height: 56px; display: flex; justify-content: center; align-items: center; gap: 12px; pointer-events: none; }
.g-doodle-monster .dm-btn { pointer-events: auto; appearance: none; min-height: 52px; min-width: 52px; padding: 10px 20px 12px; border-radius: 17px 14px 18px 13px; font: 700 22px/1 var(--dm-hand); color: var(--dm-cardink);
  background: var(--dm-card); border: 2.5px solid var(--dm-pen); box-shadow: 3px 4px 0 var(--dm-pen); cursor: pointer; touch-action: none; white-space: nowrap; transition: transform 0.12s ease, box-shadow 0.12s ease; }
.g-doodle-monster .dm-btn:active { transform: translate(2px, 3px); box-shadow: 1px 1px 0 var(--dm-pen); }
.g-doodle-monster .dm-btn:focus-visible { outline: 3px solid var(--dm-pen); outline-offset: 3px; }
.g-doodle-monster .dm-btn.dm-go { background: var(--dm-pen); color: #fff; border-color: rgba(20, 10, 40, 0.3); box-shadow: 3px 4px 0 rgba(20, 10, 40, 0.35); }
.g-doodle-monster.dm-dark .dm-btn.dm-go { color: #16121f; box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.6); }
.g-doodle-monster .dm-btn.dm-quiet { border-style: dashed; box-shadow: none; font-size: 20px; padding: 10px 16px 12px; }
.g-doodle-monster .dm-btn.dm-sit { min-width: 168px; background: linear-gradient(90deg, color-mix(in srgb, var(--dm-pen) 32%, var(--dm-card)) calc(var(--k, 0) * 100%), var(--dm-card) calc(var(--k, 0) * 100%)); }
.g-doodle-monster .dm-btn.dm-in { animation: doodle-monster-in 0.45s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes doodle-monster-in { from { transform: scale(0.55) rotate(-8deg); opacity: 0; } to { transform: none; opacity: 1; } }
.g-doodle-monster .dm-book { position: absolute; left: 12px; top: 50%; translate: 0 -50%; pointer-events: none; display: flex; align-items: center; gap: 6px; font: 700 18px/1 var(--dm-hand); color: var(--dm-cardink); background: var(--dm-card); border-radius: 12px; padding: 6px 10px 6px 8px;
  box-shadow: 0 6px 14px -6px rgba(0, 0, 0, 0.45); border: 1.5px solid color-mix(in srgb, var(--dm-pen) 45%, transparent); }
.g-doodle-monster .dm-book i { position: relative; width: 26px; height: 32px; border-radius: 3px 6px 6px 3px; background: var(--dm-pen); box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.22); }
.g-doodle-monster .dm-book i::after { content: ""; position: absolute; left: 8px; right: 4px; top: 9px; height: 8px; border-radius: 2px; background: rgba(255, 255, 255, 0.85); }
.g-doodle-monster .dm-book.dm-thump { animation: doodle-monster-thump 0.5s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes doodle-monster-thump { 0% { transform: scale(1); } 35% { transform: scale(1.22, 0.86); } 70% { transform: scale(0.95, 1.06); } 100% { transform: scale(1); } }
.g-doodle-monster.dm-wide .dm-book { display: none; }
.g-doodle-monster .dm-tag { position: absolute; z-index: 30; left: 0; top: 0; width: 200px; margin-left: -100px; padding: 0; border: 0; border-radius: 12px; overflow: hidden; background: #fff; text-align: center; cursor: pointer;
  box-shadow: 0 10px 20px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.06); transform: rotate(-3deg) scale(0.4); opacity: 0; pointer-events: none; transition: transform 0.5s cubic-bezier(.2, 1.6, .4, 1), opacity 0.3s ease; }
.g-doodle-monster .dm-tag.dm-show { transform: rotate(-3deg); opacity: 1; pointer-events: auto; }
.g-doodle-monster .dm-tag:focus-visible { outline: 3px solid var(--dm-pen); outline-offset: 3px; }
.g-doodle-monster .dm-tag-top { display: block; background: #e2453c; color: #fff; padding: 6px 0 6px; }
.g-doodle-monster .dm-tag-top b { display: block; font: 900 20px/1 var(--dm-disp); letter-spacing: 0.1em; }
.g-doodle-monster .dm-tag-top small { display: block; font: 700 14px/1 var(--dm-hand); margin-top: 2px; }
.g-doodle-monster .dm-tag-name { display: block; font: 700 25px/1.05 var(--dm-hand); color: #1d2a7a; padding: 8px 10px 3px; min-height: 38px; }
.g-doodle-monster .dm-tag-hint { display: block; font: 700 14px/1 var(--dm-hand); color: #7d768c; padding: 1px 0 8px; }
.g-doodle-monster .dm-loopie .gk-bubble, .g-doodle-monster .dm-sync .gk-bubble { font-size: 15px; max-width: min(250px, calc(100cqw - 24px)); }
.g-doodle-monster .dm-loopie.gk-side-below .gk-bubble, .g-doodle-monster .dm-sync.gk-side-below .gk-bubble { top: calc(100% + var(--dm-drop, 10px)); }
.g-doodle-monster .dm-sr { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const G = { step: 'intro', frozen: false };
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a.core && !G.frozen) an = a; }, () => {});
      const inten = ctx.intensity, line = (o) => ctx.line(o), care = () => an.safety === 'care', RED = () => K.reduced();
      const visits = K.visits(), DAY = K.daily();
      const PEN = PENS[((DAY % 7) + 7) % 7], SNACK = SNACKS[((DAY * 3 + 2) % SNACKS.length + SNACKS.length) % SNACKS.length];
      const loadBook = () => { const b = S.store.get('doodle-monster:book', []); return Array.isArray(b) ? b.filter(x => x && Array.isArray(x.s)) : []; };
      let BOOK = loadBook();
      const WEAR = visits > 0 ? ACCS[Math.min(visits, ACCS.length) - 1] : null; // what your last visit unlocked
      const UNLOCK = visits < ACCS.length ? ACCS[visits] : null;                // what this visit unlocks
      const TICKLES = [8, 10, 12][inten], SIT_MS = [1300, 1600, 1900][inten];
      let nameSeed = DAY * 7 + visits * 13 + 3;
      Object.assign(G, { strokes: [], cur: null, ink: 0, M: null, name: '', renames: 0, acc: 0, legK: 0, sit: 0, sitHold: 0, scary: 0, giggles: 0, feedTries: 0, sitBreaks: 0,
        eyeMode: 'open', mouth: 'smile', mouthOpen: 0, blinkAt: 0, blink: 0, look: null, hat: null, hatStrokes: [], hatTimer: 0, snack: null, tick: { dir: 0, x: 0, t: 0, n: 0 },
        doodles: [], card: null, zzz: [], wave: 0, flash: 0, shake: 0, cameoPeek: 0, sparkle: 0, hops: 0 });

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 2 });
      const P = K.particles({ max: 320 });
      const pad = h('div', { class: 'dm-pad', role: 'application', tabindex: '0', 'aria-label': 'Sketchbook page. Draw with your finger or mouse, or press Enter to scribble, feed, tickle or draw a hat.' });
      const noteCap = h('small', { text: 'Draw how this feels' }), noteWords = h('b', { class: 'gk-user', text: ' ' }), noteTask = h('b', { class: 'dm-task', text: '', hidden: true });
      const todo = h('div', { class: 'dm-todo', hidden: true });
      const note = h('div', { class: 'dm-note', 'aria-live': 'polite' }, noteCap, noteWords, noteTask, todo);
      const ctrl = h('div', { class: 'dm-ctrl' });
      const mkBtn = (label, cls) => h('button', { type: 'button', class: 'dm-btn ' + (cls || ''), text: label, hidden: true });
      const bookChip = h('div', { class: 'dm-book', 'aria-label': 'Your sketchbook', hidden: true }, h('i'), h('b', { text: String(BOOK.length) }));
      const clearBtn = mkBtn('Clear', 'dm-quiet'), goBtn = mkBtn('Bring it to life!', 'dm-go'), sitBtn = mkBtn('Hold: SIT', 'dm-sit'), hatBtn = mkBtn('Pop it on!', 'dm-go');
      sitBtn.setAttribute('aria-label', 'Press and hold to tell it to sit');
      ctrl.append(bookChip, clearBtn, goBtn, sitBtn, hatBtn);
      const tagName = h('span', { class: 'dm-tag-name', text: '' });
      const tag = h('button', { type: 'button', class: 'dm-tag', 'aria-label': 'Name tag. Tap for another name.' }, h('span', { class: 'dm-tag-top' }, h('b', { text: 'HELLO' }), h('small', { text: 'my name is' })), tagName, h('span', { class: 'dm-tag-hint', text: 'tap for another name' }));
      const sr = h('div', { class: 'dm-sr', 'aria-live': 'polite' });
      el.append(pad, note, ctrl, tag, sr);
      const loopie = K.character('loopie', { side: 'below', mood: 'happy', x: 8, y: 62, size: 56, voice: 560 });
      const sync = K.character('sync', { side: 'below', mood: 'wow', x: 300, y: 62, size: 56, voice: 700 });
      loopie.el.classList.add('dm-loopie'); sync.el.classList.add('dm-sync');
      let talkAt = 0;
      const talk = (who, text, o) => { (who === loopie ? sync : loopie).hush(); talkAt = performance.now(); return who.say(text, Object.assign({ ms: 2800 }, o || {})); };
      const quiet = (ms) => performance.now() - talkAt > (ms || 2600);

      /* ---------------- palette ---------------- */
      let PAL = null;
      function palette() {
        const dark = K.dark();
        el.classList.toggle('dm-dark', dark);
        const ink = dark ? PEN.gel : PEN.ink;
        PAL = dark ? { dark, ink, fill: mix(PEN.gel, '#1c1d2b', 0.72), fill2: mix(PEN.gel, '#1c1d2b', 0.5), paper: '#1c1d2b', paper2: '#171826', dot: '#2f3248', desk: '#0c0d19', desk2: '#161830', pencil: '#6d7290', shadow: 'rgba(0,0,0,0.45)', eye: '#fbfaff', pupil: '#120f1d', text: '#e9e6f7', sub: '#9c98b6' }
          : { dark, ink, fill: mix(PEN.ink, '#ffffff', 0.84), fill2: mix(PEN.ink, '#ffffff', 0.7), paper: '#fffaf0', paper2: '#f6efdf', dot: '#dcdde8', desk: '#d6dee8', desk2: '#c4cfdc', pencil: '#8f97ab', shadow: 'rgba(40,30,60,0.2)', eye: '#ffffff', pupil: '#1b1530', text: '#2a2240', sub: '#7a7390' };
        el.style.setProperty('--dm-pen', ink); el.style.setProperty('--dm-tick', ink);
      }
      palette();

      /* ---------------- layout ---------------- */
      let L = null;
      function layout() {
        const w = cv.w, hh = cv.h; if (!w || !hh) return false;
        const wide = w >= 900 && hh >= 620;
        const old = L && L.page ? { w: L.page.w, ground: L.ground } : null;
        el.classList.toggle('dm-wide', wide);
        if (wide) {
          const pw = Math.min(460, Math.floor((w - 240) / 2)), ph = Math.min(hh - 172, Math.round(pw * 1.38)), gap = 28;
          const bx = Math.round((w - pw * 2 - gap) / 2), by = Math.round(80 + Math.max(0, (hh - 80 - 84 - ph) / 2));
          L = { wide, w, h: hh, left: { x: bx, y: by, w: pw, h: ph }, page: { x: bx + pw + gap, y: by, w: pw, h: ph } };
          const csz = 92;
          [loopie, sync].forEach(c => { c.el.style.setProperty('--sz', csz + 'px'); c.side('above'); });
          loopie.place(bx + 24, by + ph - 24 - csz); sync.place(bx + 24 + csz + 22, by + ph - 24 - csz);
          Object.assign(note.style, { left: (L.page.x + 30) + 'px', width: (pw - 60) + 'px', right: 'auto', top: (by - 24) + 'px' });
          Object.assign(ctrl.style, { left: L.page.x + 'px', width: pw + 'px', right: 'auto', top: (by + ph + 16) + 'px', bottom: 'auto' });
        } else {
          const csz = 56, top = 62 + 74 + 6, bottom = hh - 84;
          L = { wide, w, h: hh, left: null, page: { x: 10, y: top, w: w - 20, h: Math.max(320, bottom - top) } };
          [loopie, sync].forEach(c => { c.el.style.setProperty('--sz', csz + 'px'); c.side('below'); });
          loopie.place(8, 64); sync.place(w - 8 - csz, 64);
          Object.assign(note.style, { left: '74px', right: '74px', width: 'auto', top: '62px' });
          ['left', 'width', 'right', 'top', 'bottom'].forEach(k => { ctrl.style[k] = ''; });
        }
        const pg = L.page;
        L.ground = pg.h - (wide ? 54 : 46);
        L.size = Math.round(Math.min(pg.w * 0.56, pg.h * 0.4));
        Object.assign(pad.style, { left: pg.x + 'px', top: pg.y + 'px', width: pg.w + 'px', height: pg.h + 'px' });
        L.dpr = cv.dpr;
        fitNote();
        if (old && G.M && Math.abs(old.w - pg.w) > 1) { // keep the monster on its feet if the page changes size
          const M = G.M, k = pg.w / old.w;
          for (let i = 0; i < M.n; i++) { M.x[i] *= k; M.px[i] *= k; M.y[i] = L.ground - (old.ground - M.y[i]); M.py[i] = L.ground - (old.ground - M.py[i]); }
          M.wl = 6; M.wr = pg.w - 6;
        }
        return true;
      }

      /* ---------------- cached art: the desk, the sketchbook, the gallery page ---------------- */
      let BG = null, HATCH = null, VIG = null;
      const mk = (w, hh) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(hh)); return { c, g: c.getContext('2d') }; };
      const HAND = '"Gaegu", "Comic Sans MS", "Chalkboard SE", "Segoe Print", "Poppins", system-ui, sans-serif', DISP = '"Londrina Solid", "Gaegu", "Arial Rounded MT Bold", "Poppins", system-ui, sans-serif';
      function wobblyLine(g, x0, y0, x1, seed, amp) { const R = rngOf(seed); g.beginPath(); g.moveTo(x0, y0 + (R() - 0.5) * amp); for (let x = x0 + 14; x <= x1; x += 14) g.lineTo(x, y0 + (R() - 0.5) * amp); g.stroke(); }
      function paperRect(g, r, seed) { // a page: paper, grain, dot grid, a soft curl at the corner
        const p = PAL;
        g.save();
        g.fillStyle = p.shadow; g.beginPath(); g.roundRect ? g.roundRect(r.x + 3, r.y + 7, r.w, r.h, 10) : g.rect(r.x + 3, r.y + 7, r.w, r.h); g.fill();
        g.beginPath(); g.roundRect ? g.roundRect(r.x, r.y, r.w, r.h, 9) : g.rect(r.x, r.y, r.w, r.h); g.fillStyle = p.paper; g.fill();
        g.clip();
        const R = rngOf(seed);
        for (let i = 0; i < r.w * r.h / 260; i++) { g.fillStyle = p.dark ? 'rgba(255,255,255,' + (0.015 + R() * 0.03) + ')' : 'rgba(90,70,30,' + (0.02 + R() * 0.035) + ')'; g.fillRect(r.x + R() * r.w, r.y + R() * r.h, 1 + R() * 1.4, 1 + R() * 1.4); }
        g.fillStyle = p.dot;
        for (let y = r.y + 22; y < r.y + r.h - 8; y += 22) for (let x = r.x + 16; x < r.x + r.w - 8; x += 22) { g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
        const cg = g.createLinearGradient(r.x + r.w - 40, r.y + r.h - 40, r.x + r.w, r.y + r.h);
        cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(1, p.dark ? 'rgba(0,0,0,0.35)' : 'rgba(120,90,40,0.12)');
        g.fillStyle = cg; g.fillRect(r.x + r.w - 60, r.y + r.h - 60, 60, 60);
        g.restore();
      }
      function paintBG() {
        const d = L.dpr, w = L.w, hh = L.h, p = PAL, pg = L.page;
        const o = mk(w * d, hh * d), g = o.g;
        g.setTransform(d, 0, 0, d, 0, 0);
        // the desk: a cutting mat by day, a deep night desk in the dark
        g.fillStyle = p.desk; g.fillRect(0, 0, w, hh);
        g.strokeStyle = p.dark ? 'rgba(120,130,200,0.07)' : 'rgba(70,90,120,0.12)'; g.lineWidth = 1;
        for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, hh); g.stroke(); }
        for (let y = 0; y < hh; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
        const vg = g.createRadialGradient(w / 2, hh * 0.45, 40, w / 2, hh * 0.5, Math.max(w, hh) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, p.dark ? 'rgba(0,0,0,0.5)' : 'rgba(60,70,90,0.16)');
        g.fillStyle = vg; g.fillRect(0, 0, w, hh);
        if (L.wide) {
          const lp = L.left;
          // the open sketchbook: a cover peeking out, two pages, a spine shadow
          g.fillStyle = p.dark ? '#2a2047' : mix(PEN.ink, '#3a3046', 0.55); g.beginPath(); g.roundRect ? g.roundRect(lp.x - 12, lp.y - 10, lp.w * 2 + 52, lp.h + 22, 14) : g.rect(lp.x - 12, lp.y - 10, lp.w * 2 + 52, lp.h + 22); g.fill();
          paperRect(g, lp, 11); paperRect(g, pg, 23);
          const sx = (lp.x + lp.w + pg.x) / 2, sg = g.createLinearGradient(sx - 40, 0, sx + 40, 0);
          sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, p.dark ? 'rgba(0,0,0,0.55)' : 'rgba(60,40,20,0.2)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = sg; g.fillRect(sx - 40, lp.y, 80, lp.h);
          paintGallery(g, lp);
        } else {
          paperRect(g, pg, 23);
          // spiral binding along the top of the page
          for (let x = pg.x + 22; x < pg.x + pg.w - 14; x += 24) {
            g.fillStyle = p.desk2; g.beginPath(); g.arc(x, pg.y + 9, 4, 0, TAU); g.fill();
            g.strokeStyle = p.dark ? '#8a8fae' : '#7c8496'; g.lineWidth = 2.6; g.beginPath(); g.ellipse(x, pg.y + 2, 4.2, 10, 0, Math.PI * 0.95, Math.PI * 2.05); g.stroke();
          }
        }
        // the ground line, drawn in pencil, with a few tufts
        g.save(); g.translate(pg.x, pg.y);
        g.strokeStyle = p.pencil; g.lineWidth = 2.2; g.lineCap = 'round';
        wobblyLine(g, 14, L.ground + 2, pg.w - 14, 5, 2.4);
        const R = rngOf(77);
        for (let i = 0; i < 7; i++) { const x = 30 + R() * (pg.w - 60), y = L.ground + 2; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x - 7, y - 7); g.moveTo(x, y); g.lineTo(x, y - 9); g.moveTo(x + 5, y); g.lineTo(x + 7, y - 6); g.stroke(); }
        // today's pen, doodled in the corner of the page
        g.font = '700 16px ' + HAND; g.fillStyle = p.sub; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
        g.fillText('today’s pen: ' + PEN.name.toLowerCase(), pg.w - 16, pg.h - 14);
        g.strokeStyle = p.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(pg.w - 16 - g.measureText('today’s pen: ' + PEN.name.toLowerCase()).width - 44, pg.h - 19); g.lineTo(pg.w - 16 - g.measureText('today’s pen: ' + PEN.name.toLowerCase()).width - 12, pg.h - 19); g.stroke();
        g.restore();
        // a hatch pattern for the monster's fill, and the scary vignette
        const hc = mk(14, 14), hg = hc.g; hg.strokeStyle = hexA(p.ink, p.dark ? 0.16 : 0.14); hg.lineWidth = 1.6; hg.beginPath(); hg.moveTo(-2, 16); hg.lineTo(16, -2); hg.stroke();
        HATCH = g.createPattern(hc.c, 'repeat');
        const vc = mk(pg.w, pg.h), vgx = vc.g, rg = vgx.createRadialGradient(pg.w / 2, pg.h * 0.55, pg.w * 0.15, pg.w / 2, pg.h * 0.55, Math.max(pg.w, pg.h) * 0.75);
        rg.addColorStop(0, 'rgba(20,0,30,0)'); rg.addColorStop(1, p.dark ? 'rgba(40,0,20,0.85)' : 'rgba(40,10,40,0.55)');
        vgx.fillStyle = rg; vgx.fillRect(0, 0, pg.w, pg.h); VIG = vc.c;
        return o;
      }
      function paintGallery(g, lp) { // the left page: your monsters so far, and the wardrobe of accessories
        const p = PAL;
        g.save(); g.translate(lp.x, lp.y);
        g.fillStyle = p.text; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.font = '900 34px ' + DISP; g.fillText('MY MONSTERS', lp.w / 2, 52);
        g.strokeStyle = p.ink; g.lineWidth = 3; g.lineCap = 'round'; wobblyLine(g, lp.w / 2 - 92, 64, lp.w / 2 + 92, 9, 2);
        const cols = 3, cw = (lp.w - 56) / cols, chh = cw * 0.98, gx0 = 28, gy0 = 80;
        const items = BOOK.slice(-6).reverse();
        for (let i = 0; i < 6; i++) {
          const c = i % cols, r = Math.floor(i / cols), x = gx0 + c * cw + cw / 2, y = gy0 + r * (chh + 12) + chh / 2, rot = ((i * 37) % 7 - 3) * 0.012;
          g.save(); g.translate(x, y); g.rotate(rot);
          const e = items[i];
          if (e) {
            g.fillStyle = p.shadow; g.fillRect(-cw / 2 + 6, -chh / 2 + 8, cw - 8, chh - 4);
            g.fillStyle = p.dark ? '#2b2d42' : '#ffffff'; g.fillRect(-cw / 2 + 4, -chh / 2 + 4, cw - 8, chh - 8);
            g.fillStyle = p.dark ? '#1a1b28' : '#f3efe3'; g.fillRect(-cw / 2 + 10, -chh / 2 + 10, cw - 20, chh - 44);
            drawStored(g, e, 0, -chh / 2 + 10 + (chh - 44) * 0.56, (chh - 44) * 0.66, { sleep: true });
            g.fillStyle = p.text; g.font = '700 15px ' + HAND; g.textAlign = 'center';
            g.fillText(fitText(g, e.n || 'Monster', cw - 16), 0, chh / 2 - 14);
          } else {
            g.strokeStyle = hexA(p.ink, 0.35); g.setLineDash([6, 6]); g.lineWidth = 2; g.strokeRect(-cw / 2 + 6, -chh / 2 + 6, cw - 12, chh - 12); g.setLineDash([]);
            g.fillStyle = hexA(p.ink, 0.4); g.font = '900 28px ' + DISP; g.fillText('?', 0, 8);
          }
          g.restore();
        }
        // wardrobe
        const wy = gy0 + 2 * (chh + 12) + 18;
        g.fillStyle = p.sub; g.font = '700 17px ' + HAND; g.textAlign = 'left'; g.fillText('wardrobe ' + Math.min(visits, ACCS.length) + '/' + ACCS.length, 28, wy);
        ACCS.forEach((a, i) => {
          const x = 40 + i * ((lp.w - 80) / (ACCS.length - 1)), y = wy + 30, owned = i < visits;
          g.save(); g.translate(x, y);
          if (owned) drawAccIcon(g, a, 15); else { g.strokeStyle = hexA(p.ink, 0.35); g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.stroke(); g.setLineDash([]); }
          g.restore();
        });
        g.restore();
      }
      function fitText(g, s, w) { if (g.measureText(s).width <= w) return s; while (s.length > 3 && g.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
      function paint() { if (!L) return; palette(); BG = paintBG(); }
      cv.onResize(() => { if (layout()) paint(); });
      S.on('theme', () => { paint(); });
      try { if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 20px Gaegu'), document.fonts.load('900 30px "Londrina Solid"')]).then(() => { if (!S.destroyed && L) paint(); }, () => {}); } catch (e) { /* no font API */ }

      /* ---------------- sound: a pizzicato sketchbook groove, pencil taps, and the monster's own voice ---------------- */
      const KEY = 60 + PEN.key;
      const pitch = (semi, oct) => A.midi(KEY + semi + 12 * (oct || 0));
      const MU = { on: false, next: 0, step: 0, bpm: 96, mode: 'draw', vol: 1 };
      const KAZOO = [0, 4, 7, 9, 7, 4, 2, 0, 4, 7, 12, 11, 9, 7, 4, 7];
      function musicTick() {
        if (!A.ctx || !MU.on) return;
        const now = A.now();
        if (MU.next < now - 0.3) MU.next = now + 0.05;
        while (MU.next < now + 0.3) {
          const t = MU.next, i = MU.step, st = i % 8, bar = Math.floor(i / 8) % 4, ch = PROG[bar], m = MU.mode, v = MU.vol;
          if (m === 'scary') {
            if (st === 0) { A.tone({ when: t, type: 'sawtooth', freq: pitch(-3 + (bar % 2 ? 1 : 0), -2), dur: 60 / MU.bpm * 4, vol: 0.05 * v, attack: 0.3, lp: 300, bus: 'music' }); A.drum(t, 0.3 * v, 0.5, 0.3); }
            if (st === 4) A.drum(t, 0.22 * v, 0.56, 0.2);
            if (st % 2 === 1) A.tone({ when: t, type: 'triangle', freq: pitch([-3, 0, 3][st % 3], 0), dur: 0.2, vol: 0.025 * v, lp: 900, bus: 'music' });
          } else if (m === 'sleep') {
            if (st % 2 === 0) A.chime(pitch(ch[(st / 2) % 3] + (st === 6 ? 12 : 0), 1), { when: t, vol: 0.035 * v, dur: 2.4, verb: 0.6, bus: 'music' });
            if (st === 0) A.pad(ch.map(x => pitch(x, 0)), { when: t, dur: 60 / MU.bpm * 4.4, vol: 0.06 * v, attack: 0.8, lp: 900 });
          } else {
            const full = m !== 'draw';
            if (st === 0 || st === 4 || (full && st === 6)) A.pluck(pitch(st === 4 ? ch[2] - 12 : ch[0], -1), { when: t, vol: 0.26 * v, damp: 0.992, lp: 700, bus: 'music' });
            if (st === 2 || st === 6) { A.click({ when: t, vol: 0.035 * v }); A.wood(t, 0.04 * v, 1.6); } // pencil taps on the desk
            if (st % 2 === 1 && (full || (i * 7) % 3 !== 0)) A.pluck(pitch(ch[(i >> 1) % 3], 1), { when: t, vol: (full ? 0.1 : 0.07) * v, damp: 0.994, verb: 0.25, bus: 'music' });
            if (full && st % 2 === 1) A.shaker(t, 0.012 * v);
            if (full && st === 0 && bar % 2 === 0) A.chime(pitch(ch[2], 2), { when: t, vol: 0.03 * v, dur: 1.4, bus: 'music' });
            if (m === 'silly' && bar < 2) { const k = KAZOO[(bar * 8 + st) % KAZOO.length]; A.bleat({ when: t, pitch: pitch(k, 0) / 420, dur: 0.24, vol: 0.06 * v }); }
          }
          MU.step++; MU.next += 60 / MU.bpm / 2;
        }
      }
      let scratch = null, scratchLvl = 0;
      S.onDestroy(() => { if (scratch) { scratch.stop(); scratch = null; } });
      const SFX = {
        penDown() { if (!A.ctx) return; A.click({ vol: 0.05 }); A.tone({ type: 'sine', freq: 1500 + Math.random() * 400, dur: 0.03, vol: 0.02 }); A.sync('pen', performance.now()); if (!scratch) scratch = A.loop({ filter: 'bandpass', freq: 3000, q: 1.5 }); },
        crumple() { if (!A.ctx) return; for (let k = 0; k < 7; k++) A.paper({ when: A.now() + k * 0.045, vol: 0.12, freq: 1600 + Math.random() * 1800, dur: 0.07 }); A.sync('clear', performance.now()); },
        springUp() { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 180, to: 720, glide: 0.35, dur: 0.42, vol: 0.12 }); A.whoosh({ vol: 0.08, dur: 0.4 }); A.sync('alive', performance.now()); },
        land(v) { if (!A.ctx) return; A.thud({ vol: clamp(v / 2500, 0.12, 0.38) }); A.boing({ freq: 160, vol: 0.08 }); },
        pop(i) { if (!A.ctx) return; A.pop({ freq: 520 + i * 160, vol: 0.16 }); },
        sprout() { if (!A.ctx) return; [0, 4, 7, 12].forEach((s, k) => A.pluck(pitch(s, 1), { when: A.now() + k * 0.06, vol: 0.14, damp: 0.993 })); },
        voice(p, dur) { if (!A.ctx) return; A.bleat({ pitch: p, dur: dur || 0.4, vol: 0.15 }); },
        drumroll() { if (!A.ctx) return; for (let k = 0; k < 14; k++) A.drum(A.now() + k * 0.045, 0.06 + k * 0.006, 1.7, 0); A.sync('name', performance.now()); },
        tada() { if (!A.ctx) return; [0, 4, 7, 12].forEach((s, k) => A.pluck(pitch(s, 0), { when: A.now() + k * 0.015, vol: 0.18, damp: 0.995, verb: 0.3 })); A.chime(pitch(12, 1), { vol: 0.06, dur: 1.6 }); },
        dice() { if (!A.ctx) return; for (let k = 0; k < 4; k++) A.wood(A.now() + k * 0.05, 0.12, 1 + k * 0.15); A.sync('rename', performance.now()); },
        grab() { if (!A.ctx) return; A.pop({ freq: 440, vol: 0.12 }); A.sync('grab', performance.now()); },
        chomp() { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 900, dur: 0.1, vol: 0.22 }); A.tone({ type: 'sine', freq: 150, to: 70, glide: 0.1, dur: 0.14, vol: 0.2 }); for (let k = 1; k < 4; k++) A.noise({ when: A.now() + k * 0.12, filter: 'bandpass', freq: 2300 + Math.random() * 900, q: 1.2, dur: 0.05, vol: 0.12 }); A.sync('chomp', performance.now()); },
        gulp() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 430, to: 150, glide: 0.18, dur: 0.24, vol: 0.13 }); },
        miss() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 600, to: 760, glide: 0.2, dur: 0.25, vol: 0.06 }); },
        giggle(n) { if (!A.ctx) return; const p = 1.8 + (n % 3) * 0.12; for (let k = 0; k < 3; k++) A.bleat({ when: A.now() + k * 0.085, pitch: p + k * 0.1, dur: 0.08, vol: 0.09 }); A.sync('tickle', performance.now()); },
        slide(down) { if (!A.ctx) return; A.tone({ type: 'sine', freq: down ? 1150 : 380, to: down ? 380 : 1150, glide: 0.42, dur: 0.48, vol: 0.08 }); },
        settle() { if (!A.ctx) return; A.thud({ vol: 0.18 }); A.chime(pitch(7, 1), { vol: 0.05, dur: 1.2 }); },
        growl() { if (!A.ctx) return; A.tone({ type: 'sawtooth', freq: 86, to: 60, glide: 1.4, dur: 1.6, vol: 0.12, lp: 420, attack: 0.2 }); A.bleat({ pitch: 0.36, dur: 1.0, vol: 0.2 }); A.noise({ pink: true, filter: 'lowpass', freq: 140, dur: 2.2, attack: 0.5, vol: 0.32 }); A.sync('grow', performance.now()); },
        hatPop() { if (!A.ctx) return; A.pop({ freq: 760, vol: 0.18 }); A.chime(pitch(12, 1), { vol: 0.07, dur: 1.2 }); A.sync('hat', performance.now()); },
        pffft() { if (!A.ctx) return; const t0 = A.now(); A.noise({ filter: 'bandpass', freq: 1000, to: 160, q: 3, dur: 1.15, attack: 0.02, vol: 0.22 }); for (let k = 0; k < 11; k++) A.tone({ when: t0 + k * 0.09, type: 'sawtooth', freq: 115 + (k % 2) * 34, dur: 0.08, vol: 0.05, lp: 760 }); A.tone({ when: t0 + 0.2, type: 'sine', freq: 1200, to: 300, glide: 0.9, dur: 0.95, vol: 0.07 }); },
        wave() { if (!A.ctx) return; A.bleat({ pitch: 1.5, dur: 0.18, vol: 0.12 }); A.bleat({ when: A.now() + 0.24, pitch: 1.25, dur: 0.3, vol: 0.12 }); },
        yawn() { if (!A.ctx) return; A.bleat({ pitch: 0.8, dur: 1.1, vol: 0.11 }); A.tone({ type: 'sine', freq: 520, to: 250, glide: 1.0, dur: 1.1, vol: 0.05 }); },
        snore() { if (!A.ctx) return; A.noise({ pink: true, filter: 'lowpass', freq: 420, to: 240, dur: 1.5, attack: 0.65, vol: 0.06 }); },
        shutter() { if (!A.ctx) return; A.click({ vol: 0.14 }); A.noise({ filter: 'highpass', freq: 2600, dur: 0.07, vol: 0.12 }); A.wood(A.now() + 0.08, 0.1, 0.7); A.sync('card', performance.now()); },
        scribble() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 2800 + Math.random() * 900, q: 1.6, dur: 0.28, attack: 0.04, vol: 0.05 }); },
        thump() { if (!A.ctx) return; A.paper({ vol: 0.14 }); A.thud({ vol: 0.16 }); }
      };

      /* ---------------- words ---------------- */
      function feelingLabel() { // the player's own words for what they are drawing (or a clearly marked example)
        const core = an.core && an.core.label ? an.core : null;
        const own = (an.strands || []).filter(x => x && x.label && !x.generic);
        if (core && !core.generic) return { text: core.label, own: true };
        if (own.length) return { text: own[0].label, own: true };
        return { text: (core && core.label) || 'EVERYTHING AT ONCE', own: false };
      }
      function fitNote() { // speech bubbles start below the sticky note; the name tag sits below both (one layout read, only when the note changes)
        if (!L) return;
        const pg = L.page;
        if (L.wide) { [loopie, sync].forEach(c => c.el.style.setProperty('--dm-drop', '10px')); tag.style.left = Math.round(pg.x + pg.w * 0.5) + 'px'; tag.style.top = Math.round(pg.y + pg.h * 0.12) + 'px'; L.tagBottom = pg.y + pg.h * 0.12 + 130; return; }
        const nb = note.offsetTop + note.offsetHeight, drop = Math.max(10, nb + 12 - (64 + 56));
        [loopie, sync].forEach(c => c.el.style.setProperty('--dm-drop', drop + 'px'));
        const top = Math.max(nb + 96, pg.y + pg.h * 0.17);
        tag.style.left = Math.round(pg.x + pg.w * 0.5) + 'px'; tag.style.top = Math.round(top) + 'px';
        L.tagBottom = top + 128;
        [loopie, sync].forEach(c => { try { c.fit(); } catch (e) { /* not shown */ } });
      }
      function setNote(cap, task, done) {
        noteCap.textContent = cap;
        noteWords.hidden = true; noteTask.hidden = false; noteTask.textContent = task;
        todo.hidden = false;
        if (!todo.firstChild) ['fed', 'tickled', 'sat'].forEach(() => todo.append(h('i')));
        Array.from(todo.children).forEach((c, k) => c.classList.toggle('dm-on', k < done));
        fitNote();
      }

      /* ---------------- the page as an input surface ---------------- */
      let lastPt = null, lastPtT = 0, penSpeed = 0;
      const toPage = (p) => ({ x: clamp(p.x, 2, L.page.w - 2), y: clamp(p.y, 2, L.page.h - 2) });
      K.press(pad, {
        down: (p0) => {
          const p = toPage(p0);
          if (G.step === 'draw' || G.step === 'hat') startStroke(p);
          else if (G.step === 'feed') grabSnack(p);
          else if (G.step === 'tickle') { G.tick.x = p.x; G.tick.dir = 0; G.tick.t = performance.now(); G.tick.on = true; G.look = p; }
          else if (G.M && (G.step === 'alive' || G.step === 'name' || G.step === 'sit' || G.step === 'silly')) boop(p);
        },
        move: (p0) => {
          const p = toPage(p0);
          if (G.cur) extendStroke(p);
          else if (G.snack && G.snack.held) moveSnack(p);
          else if (G.step === 'tickle' && G.tick.on) tickleMove(p);
          if (G.M) G.look = p;
        },
        up: (p0) => {
          const p = toPage(p0);
          if (G.cur) endStroke();
          else if (G.snack && G.snack.held) dropSnack(p);
          G.tick.on = false;
          S.later(() => { if (!G.cur) G.look = null; }, 600);
        }
      });
      function startStroke(p) {
        G.cur = [p]; (G.step === 'hat' ? G.hatStrokes : G.strokes).push(G.cur);
        lastPt = p; lastPtT = performance.now();
        SFX.penDown(); G.hatTimer = 0;
        if (G.step === 'draw' && G.strokes.length === 1) MU.mode = 'draw';
      }
      function extendStroke(p) {
        const q = G.cur[G.cur.length - 1], d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 2.2 || G.cur.length > 900) return;
        G.cur.push(p);
        const now = performance.now(), dtm = Math.max(1, now - lastPtT);
        penSpeed = Math.min(2600, d / dtm * 1000); lastPtT = now; lastPt = p;
        if (G.step === 'draw') G.ink += d; else G.hatInk = (G.hatInk || 0) + d;
        if (PAL.dark && Math.random() < 0.12) P.emit('star', L.page.x + p.x, L.page.y + p.y, 1, { colors: [PAL.ink, '#ffffff'], speed: [10, 40], life: [0.3, 0.6] });
        if (G.step === 'draw' && goBtn.hidden && G.ink > 70) { showBtn(goBtn); K.guide({ id: 'go', g: 'tap', target: goBtn, label: 'BRING IT TO LIFE', delay: 2600 }); }
      }
      function endStroke() {
        const s = G.cur; G.cur = null; penSpeed = 0;
        if (G.step === 'draw') {
          if (clearBtn.hidden) showBtn(clearBtn);
          const n = G.strokes.length;
          if (n === 1 && quiet()) talk(loopie, care() ? line({ Jolly: 'That’s a start. Any shape is the right shape.', Cheeky: 'Ooh. It’s got a vibe already.', Unfiltered: 'Good. Keep going if you like.' }) : line({ Jolly: ['Ooh, it’s got character already!', 'Love that line. Keep going!'], Cheeky: ['Ooh. Very… expressive.', 'That line has opinions.'], Unfiltered: ['Good. More if you want.', 'Keep going.'] }), { mood: 'wow' });
          else if (n === 4 && quiet()) talk(sync, line({ Jolly: 'Messy is perfect. Feelings are messy.', Cheeky: 'Deliciously weird. Keep it coming.', Unfiltered: 'Messy is fine.' }), { mood: 'happy' });
        } else if (G.step === 'hat') {
          if ((G.hatInk || 0) > 18) { if (hatBtn.hidden) showBtn(hatBtn); G.hatTimer = performance.now() + 1500; }
        }
        void s;
      }
      /* keyboard: Enter or Space on the page does the step's gesture for you (a scribble, a feed, a tickle, a hat) */
      S.listen(pad, 'keydown', (e) => {
        if (e.code !== 'Enter' && e.code !== 'Space') return;
        e.preventDefault(); A.unlock();
        const pg = L.page, R = rngOf(performance.now() | 0);
        const scribble = (cx, cy, rx, ry, turns) => { const s2 = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU * turns + R(), r = 1 + 0.12 * Math.sin(a * 3); s2.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r }); } return s2; };
        if (G.step === 'draw') { const s2 = scribble(pg.w * (0.4 + R() * 0.2), pg.h * (0.5 + R() * 0.1), pg.w * 0.2, pg.h * 0.1, 1.02); startStroke(s2[0]); s2.slice(1).forEach(q => extendStroke(q)); endStroke(); }
        else if (G.step === 'feed' && G.snack && !G.snack.eaten) { const m = mouthPt(); G.snack.x = m.x; G.snack.y = m.y; G.snack.held = true; dropSnack(); }
        else if (G.step === 'tickle' && G.M) { const q = DMX.anchor(G.M, G.M.belly, {}); G.tick.x = q.x; G.tick.dir = 0; tickleMove({ x: q.x + 30, y: q.y }); tickleMove({ x: q.x - 30, y: q.y }); }
        else if (G.step === 'hat' && G.M) { const q = DMX.anchor(G.M, G.M.hat, {}); const s2 = [{ x: q.x - 22, y: q.y - 8 }, { x: q.x, y: q.y - 46 }, { x: q.x + 22, y: q.y - 8 }, { x: q.x - 22, y: q.y - 8 }]; startStroke(s2[0]); s2.slice(1).forEach(qq => { for (let k = 1; k <= 6; k++) extendStroke({ x: lerp(G.cur[G.cur.length - 1].x, qq.x, k / 6), y: lerp(G.cur[G.cur.length - 1].y, qq.y, k / 6) }); }); endStroke(); attachHat(); }
        else if (G.step === 'draw' || G.M) boop({ x: G.M ? G.M.cx : pg.w / 2, y: G.M ? G.M.cy : pg.h / 2 });
      });
      function showBtn(b) { b.hidden = false; b.classList.remove('dm-in'); void b.offsetWidth; b.classList.add('dm-in'); }
      const hideBtns = () => [clearBtn, goBtn, sitBtn, hatBtn].forEach(b => { b.hidden = true; });
      const chipShow = () => { bookChip.hidden = !(G.step !== 'draw' && G.step !== 'intro' && (BOOK.length > 0 || G.step === 'finale' || G.step === 'done')); };
      clearBtn.addEventListener('click', () => {
        if (G.step !== 'draw' || !G.strokes.length) return;
        G.strokes = []; G.cur = null; G.ink = 0; SFX.crumple(); hideBtns();
        P.emit('dust', L.page.x + L.page.w / 2, L.page.y + L.page.h * 0.5, 14, { colors: [hexA(PAL.ink, 0.5)] });
        talk(sync, line({ Jolly: 'Fresh page! No wrong answers.', Cheeky: 'Crumpled. Bold move.', Unfiltered: 'Fresh page.' }), { mood: 'happy' });
        guideDraw(1200);
      });
      goBtn.addEventListener('click', () => { if (G.step === 'draw' && G.ink > 60) comeAlive(); });
      function guideDraw(delay) { K.guide({ id: 'draw', g: 'circle', target: () => ({ x: L.page.x + L.page.w * 0.5, y: L.page.y + L.page.h * 0.55 }), r: 54, label: 'DRAW YOUR FEELING', delay: delay == null ? 900 : delay }); }

      /* ---------------- coming alive ---------------- */
      let tmpA = {}, tmpB = {};
      function comeAlive() {
        G.step = 'alive'; G.frozen = true; K.guide(null); hideBtns(); chipShow();
        ctx.track('drawn', { strokes: G.strokes.length, ink: Math.round(G.ink) });
        const rs = DMX.resample(G.strokes, 170);
        const M = DMX.build(rs, L.size);
        M.floor = L.ground; M.wl = 6; M.wr = L.page.w - 6; M.stiff = 0.04; M.walkTo = L.page.w / 2; M.walkV = 220;
        M.scale = 1; M.scaleT = 1;
        G.M = M; G.strokes = [];
        G.maxScale = 1;
        MU.mode = 'play';
        SFX.springUp();
        loopie.face('wow', 1500); sync.face('surprised', 1500);
        // it shivers, then gathers itself up and drops onto the page
        for (let k = 0; k < 5; k++) S.later(() => { if (G.M) DMX.poke(M, M.cx + (Math.random() - 0.5) * 60, M.cy + (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 900, (Math.random() - 0.5) * 900, 120); }, k * 90);
        S.later(() => { M.stiff = 0.2; }, 480);
        S.later(() => talk(loopie, line({ Jolly: 'IT’S ALIVE!', Cheeky: 'Oh no. It’s ALIVE.', Unfiltered: 'It’s alive.' }), { mood: 'celebrate', moodMs: 2400 }), 300);
        // eyes, one by one, then little legs, then a hop and a hello
        M.eyes.forEach((e, k) => { e.open = 0; S.later(() => { e.open = 1; SFX.pop(k); const q = DMX.anchor(M, e, tmpA); P.emit('star', L.page.x + q.x, L.page.y + q.y, 6, { colors: [PAL.ink, '#fff7c2'], speed: [40, 120] }); }, 1100 + k * 220); });
        S.later(() => { G.legT = 1; SFX.sprout(); }, 1300 + M.eyes.length * 220);
        S.later(() => { if (G.M) { DMX.kick(M, 0, -620); G.hops++; SFX.voice(voicePitch(), 0.45); G.mouth = 'grin'; S.later(() => { G.mouth = 'smile'; }, 900); } }, 2100 + M.eyes.length * 220);
        S.later(nameIt, 3000 + M.eyes.length * 220);
      }
      const voicePitch = () => clamp(1.35 / Math.sqrt(Math.max(0.3, G.M ? G.M.scale : 1)), 0.5, 2.2);
      function nameIt() {
        if (G.step !== 'alive') return;
        G.step = 'name';
        G.name = makeName(nameSeed, ctx.vibe, care());
        SFX.drumroll();
        S.later(() => { tagName.textContent = G.name; tag.classList.add('dm-show'); SFX.tada(); sr.textContent = 'Its name is ' + G.name + '.'; }, 700);
        talk(sync, line({ Jolly: 'Every monster needs a name. Let’s see…', Cheeky: 'Naming ceremony. Very official.', Unfiltered: 'It needs a name.' }), { mood: 'think', moodMs: 1600, ms: 1800 });
        S.later(() => { if (G.step === 'name') talk(loopie, line({ Jolly: 'Hello, ' + G.name + '!', Cheeky: G.name + '. It suits it, sadly.', Unfiltered: G.name + '. Fine.' }), { mood: 'laugh', moodMs: 2000 }); }, 1500);
        K.guide({ id: 'rename', g: 'tap', target: tag, ox: 1.02, oy: 0.52, label: 'TAP TO RENAME', delay: 2200, place: 'below' });
        G.nameUntil = performance.now() + 5200;
        if (WEAR) S.later(() => { if (G.step === 'name' && quiet(900)) talk(sync, line({ Jolly: 'Ooh, it found ' + ACC_NAME[WEAR] + ' from last time!', Cheeky: 'It’s wearing ' + ACC_NAME[WEAR] + '. Fancy.', Unfiltered: 'Nice ' + ACC_NAME[WEAR].replace(/^an? /, '') + '.' }), { mood: 'wow', moodMs: 1600 }); }, 3300);
      }
      tag.addEventListener('click', () => {
        if (G.step !== 'name' && G.step !== 'feed' && G.step !== 'tickle' && G.step !== 'sit') return;
        nameSeed += 101; G.renames++;
        G.name = makeName(nameSeed, ctx.vibe, care()); tagName.textContent = G.name; sr.textContent = 'New name: ' + G.name + '.';
        tag.classList.remove('dm-show'); void tag.offsetWidth; tag.classList.add('dm-show');
        SFX.dice(); if (G.M) { DMX.kick(G.M, 0, -380); SFX.voice(voicePitch() * 1.1, 0.25); }
        if (G.step === 'name') G.nameUntil = performance.now() + 2600;
        if (G.renames === 3 && quiet(1200)) talk(loopie, line({ Jolly: 'Ha! Keep spinning, they get sillier.', Cheeky: 'Indecisive. I respect it.', Unfiltered: 'Pick one eventually.' }), { mood: 'laugh', moodMs: 1600 });
      });

      /* ---------------- care: feed, tickle, sit ---------------- */
      function startFeed() {
        G.step = 'feed'; K.guide(null);
        setNote('Monster care', 'Feed it ' + SNACK_NAME[SNACK], 0);
        const pg = L.page, home = { x: pg.w * (L.wide ? 0.8 : 0.8), y: L.wide ? pg.h * 0.42 : clamp((L.tagBottom || pg.y + pg.h * 0.4) - pg.y + 44, pg.h * 0.3, L.ground - L.size * 1.05) };
        G.snack = { x: pg.w + 40, y: home.y, home, held: false, eaten: false, t0: performance.now(), r: L.wide ? 27 : 24 };
        pad.classList.add('dm-grab');
        talk(loopie, care() ? line({ Jolly: 'It looks hungry. Want to feed it?', Cheeky: 'It’s eyeing that ' + SNACK + '.', Unfiltered: 'Feed it.' }) : line({ Jolly: 'I think it’s hungry. Feed it ' + SNACK_NAME[SNACK] + '!', Cheeky: 'It wants ' + SNACK_NAME[SNACK] + '. Don’t ask.', Unfiltered: 'Hungry. Feed it.' }), { mood: 'happy', moodMs: 1800 });
        guideFeed(1400);
      }
      function mouthPt() { return DMX.anchor(G.M, G.M.mouth, tmpB); }
      function guideFeed(delay) {
        const s = G.snack; if (!s) return;
        const m = mouthPt();
        K.guide({ id: 'feed', g: 'drag', target: () => (G.snack ? { x: L.page.x + G.snack.x, y: L.page.y + G.snack.y } : null), dx: (m.x - s.home.x) * 0.8, dy: (m.y - s.home.y) * 0.8, label: 'FEED IT', delay: delay == null ? 900 : delay });
      }
      function grabSnack(p) {
        const s = G.snack; if (!s || s.eaten) return;
        if (Math.hypot(p.x - s.x, p.y - s.y) > s.r * 2.4) return;
        s.held = true; s.ox = s.x - p.x; s.oy = s.y - p.y; SFX.grab(); G.mouth = 'open';
      }
      function moveSnack(p) { const s = G.snack; s.x = p.x + s.ox; s.y = p.y + s.oy; }
      function dropSnack() {
        const s = G.snack; s.held = false; G.feedTries++;
        const m = mouthPt();
        if (Math.hypot(s.x - m.x, s.y - m.y) < Math.max(56, G.M.mouth.w * G.M.scale * 1.6)) eat();
        else { SFX.miss(); G.mouth = 'smile'; if (G.feedTries === 1 || G.feedTries % 3 === 0) talk(sync, line({ Jolly: 'Closer to the mouth! It’s waiting.', Cheeky: 'So close. It’s doing big eyes at you.', Unfiltered: 'Mouth’s over here.' }), { mood: 'wink', moodMs: 1400 }); guideFeed(1600); }
      }
      function eat() {
        const s = G.snack, M = G.M;
        s.eaten = true; s.held = false; K.guide(null); pad.classList.remove('dm-grab');
        const m = mouthPt();
        SFX.chomp(); G.mouth = 'chomp';
        P.emit('dust', L.page.x + m.x, L.page.y + m.y, 16, { colors: snackCrumbs(), speed: [60, 180] });
        DMX.poke(M, m.x, m.y, 0, 500, 90);
        S.later(() => { SFX.gulp(); G.mouth = 'grin'; }, 520);
        S.later(() => { DMX.kick(M, 0, -520); SFX.voice(voicePitch() * 1.1, 0.35); }, 900);
        S.later(() => shrinkTo(0.86, 'Fed'), 1100);
        ctx.track('fed', { tries: G.feedTries });
        talk(loopie, line({ Jolly: ['Chomp! Look, it got a bit smaller.', 'Nom! A bit smaller already.'], Cheeky: ['Ate it whole. Classy. And smaller!', 'Gone. Didn’t even chew. It shrank though.'], Unfiltered: ['Fed. Smaller.', 'Ate it. Smaller now.'] }), { mood: 'laugh', moodMs: 1800 });
        S.later(() => { G.snack = null; startTickle(); }, 2300);
      }
      function snackCrumbs() { return { cookie: ['#c58a45', '#6b3e1c'], donut: ['#f29bc1', '#c58a45', '#7ad0ff'], broccoli: ['#4f9a3c', '#86c25a'], cupcake: ['#f7b6d2', '#ffe08a'], sock: ['#ffffff', '#e2453c'], pretzel: ['#b06a2c', '#f5f0e0'], cheese: ['#f4c542', '#e0a92a'] }[SNACK] || ['#c58a45']; }
      function shrinkTo(s, label) {
        const M = G.M; if (!M) return;
        M.scaleT = s; G.shrinkFlash = 1;
        SFX.slide(true);
        const q = DMX.anchor(M, M.belly, tmpA);
        K.pop(label === 'Fed' ? 'SMALLER!' : label === 'Tickled' ? 'EVEN SMALLER!' : 'TINY-ISH!', { x: L.page.x + q.x, y: L.page.y + q.y - M.bh * M.scale * 0.6, kind: 'great' });
      }
      function startTickle() {
        G.step = 'tickle'; G.tick.n = 0;
        setNote('Monster care', 'Tickle it', 1);
        talk(sync, line({ Jolly: 'Is it ticklish? Only one way to find out.', Cheeky: 'Tickle it. For science.', Unfiltered: 'Tickle it.' }), { mood: 'wink', moodMs: 1800 });
        guideTickle(1300);
      }
      function guideTickle(delay) { K.guide({ id: 'tickle', g: 'sweep', target: () => { const q = DMX.anchor(G.M, G.M.belly, tmpA); return { x: L.page.x + q.x, y: L.page.y + q.y }; }, d: 70, label: 'TICKLE IT', delay: delay == null ? 900 : delay }); }
      function tickleMove(p) {
        const T = G.tick, M = G.M, dx = p.x - T.x;
        const near = (() => { const q = DMX.anchor(M, M.belly, tmpA); return Math.abs(p.x - q.x) < M.bw * M.scale * 0.75 + 30 && Math.abs(p.y - q.y) < M.bh * M.scale * 0.75 + 40; })();
        if (Math.abs(dx) < 10 || !near) return;
        const dir = dx > 0 ? 1 : -1;
        if (dir !== T.dir) { // each change of direction is one tickle
          T.dir = dir; T.n++; G.giggles++;
          DMX.poke(M, p.x, p.y, dir * 700, -300, 110);
          G.eyeMode = 'squint'; G.mouth = 'grin'; G.squintUntil = performance.now() + 700;
          SFX.giggle(T.n);
          if (T.n % 2 === 0) addHee(p.x, p.y - 30);
          if (T.n === Math.ceil(TICKLES / 2) && quiet(1200)) talk(loopie, line({ Jolly: 'It giggles like a squeaky toy!', Cheeky: 'Extremely ticklish. Noted.', Unfiltered: 'Ha. Ticklish.' }), { mood: 'laugh', moodMs: 1500 });
          if (T.n >= TICKLES && G.step === 'tickle') {
            G.step = 'tickled'; K.guide(null); ctx.track('tickled', { giggles: G.giggles });
            S.later(() => { shrinkTo(0.73, 'Tickled'); DMX.kick(M, 0, -560); SFX.voice(voicePitch() * 1.2, 0.3); }, 350);
            S.later(startSit, 1900);
          }
        }
        T.x = p.x;
      }
      function addHee(x, y) { G.zzz.push({ text: ['hee', 'hehe', 'hee!', 'ha'][G.giggles % 4], x, y, t0: performance.now(), vx: (Math.random() - 0.5) * 40, dur: 900 }); }
      let sitHold = null;
      function startSit() {
        G.step = 'sit';
        setNote('Monster care', 'Tell it to sit', 2);
        showBtn(sitBtn);
        talk(loopie, line({ Jolly: 'Now… can it sit? Hold the button.', Cheeky: 'Obedience school. Hold SIT.', Unfiltered: 'Hold SIT.' }), { mood: 'think', moodMs: 1600 });
        K.guide({ id: 'sit', g: 'hold', target: sitBtn, label: 'HOLD: SIT', ms: SIT_MS + 400, delay: 1300 });
      }
      sitHold = K.hold(sitBtn, {
        ms: SIT_MS, still: 26, decay: 0.8,
        start: () => { if (G.step !== 'sit') return; SFX.slide(true); G.sitting = true; },
        progress: (k, active) => { if (G.step !== 'sit') return; G.sitHold = k; const ks = k.toFixed(2); if (ks !== G.sitK) { G.sitK = ks; sitBtn.style.setProperty('--k', ks); } void active; },
        cancel: (k) => { if (G.step === 'sit' && k > 0.1) { G.sitBreaks++; if (G.sitBreaks === 1) talk(sync, line({ Jolly: 'Almost! Keep holding, nice and steady.', Cheeky: 'It stood back up. Cheeky. Hold longer.', Unfiltered: 'Hold it longer.' }), { mood: 'happy', moodMs: 1400 }); } G.sitting = false; },
        done: () => {
          if (G.step !== 'sit') return;
          G.step = 'sat'; G.sitting = false; G.sitHold = 1; K.guide(null); sitBtn.hidden = true;
          SFX.settle(); ctx.track('sat', { breaks: G.sitBreaks });
          S.later(() => shrinkTo(0.62, 'Sat'), 250);
          talk(loopie, line({ Jolly: 'It sat! Good monster!', Cheeky: 'It actually sat. I’m emotional.', Unfiltered: 'Sat. Good.' }), { mood: 'celebrate', moodMs: 1800 });
          setNote('Monster care', 'Good monster!', 3);
          S.later(() => { G.sitHold = 0; }, 1500);
          S.later(grow, 2600);
        }
      });
      function boop(p) { // poking the monster outside a care step: it jiggles and squeaks
        const M = G.M; if (!M) return;
        const q = DMX.anchor(M, M.belly, tmpA);
        if (Math.abs(p.x - q.x) > M.bw * M.scale * 0.7 + 20 || Math.abs(p.y - q.y) > M.bh * M.scale * 0.7 + 30) return;
        DMX.poke(M, p.x, p.y, 0, -400, 90); SFX.voice(voicePitch() * 1.25, 0.18);
      }

      /* ---------------- the twist: big and scary, then a tiny hat ---------------- */
      async function grow() {
        if (G.step !== 'sat') return;
        G.step = 'grow'; K.guide(null); tag.classList.remove('dm-show');
        setNote('Uh oh…', 'It’s getting BIG', 3);
        ctx.track('phase', { p: 'grow' });
        G.eyeMode = 'open'; G.mouth = 'wobbly';
        await K.wait(500);
        talk(loopie, care() ? line({ Jolly: 'Oh. It’s puffing itself up again.', Cheeky: 'Feelings do this. It’s puffing up.', Unfiltered: 'It’s getting big again.' }) : line({ Jolly: 'Uh oh. It’s doing the big scary thing.', Cheeky: 'Oh no. It’s doing the BIG SCARY thing.', Unfiltered: 'Uh oh. Big and scary.' }), { mood: 'worried', moodMs: 2600 });
        MU.mode = 'scary'; MU.bpm = 76;
        SFX.growl();
        G.M.scaleT = [1.45, 1.6, 1.7][inten]; G.M.scaleRate = 1.4; G.maxScale = G.M.scaleT;
        G.growAt = performance.now();
        await K.sleep(1500);
        G.eyeMode = 'angry'; G.mouth = 'teeth'; SFX.voice(0.4, 0.8);
        talk(sync, line({ Jolly: 'Feelings do that sometimes. Quick: draw it a tiny hat!', Cheeky: 'Classic feeling move. Counter-move: a tiny hat. Draw one!', Unfiltered: 'Draw it a tiny hat. Trust me.' }), { mood: 'determined', moodMs: 2600, ms: 3400 });
        await K.wait(700);
        G.step = 'hat'; G.hatStrokes = []; G.hatInk = 0; G.hatAt = performance.now();
        setNote('Quick!', 'Draw a tiny hat on it', 3);
        K.guide({ id: 'hat', g: 'circle', target: () => { const q = DMX.anchor(G.M, G.M.hat, tmpA); return { x: L.page.x + q.x, y: L.page.y + q.y - 34 }; }, r: 26, label: 'DRAW A TINY HAT', delay: 500 });
      }
      hatBtn.addEventListener('click', () => { if (G.step === 'hat' && (G.hatInk || 0) > 12) attachHat(); });
      function attachHat() {
        if (G.step !== 'hat') return;
        G.step = 'hatOn'; K.guide(null); hatBtn.hidden = true; G.cur = null;
        const M = G.M, strokes = G.hatStrokes.filter(s => s.length);
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        strokes.forEach(s => s.forEach(q => { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }));
        const bw = Math.max(8, x1 - x0), bh = Math.max(8, y1 - y0);
        // a TINY hat: about a quarter of the body wide, whatever you drew, in body units so it shrinks along with it
        const want = clamp(M.bw * 0.27, 26, 64), k = want / Math.max(bw, bh * 0.85);
        G.hat = { strokes: strokes.map(s => s.map(q => ({ x: (q.x - (x0 + x1) / 2) * k, y: (q.y - y1) * k }))), from: strokes.map(s => s.map(q => ({ x: q.x, y: q.y }))), t0: performance.now(), ang: 0, av: 0, k };
        G.hatStrokes = [];
        ctx.track('hat', { strokes: strokes.length });
        S.later(() => { SFX.hatPop(); G.eyeMode = 'up'; G.mouth = 'o'; P.emit('star', L.page.x + (G.hatPos ? G.hatPos.x : 0), L.page.y + (G.hatPos ? G.hatPos.y : 0), 10, { colors: [PAL.ink, '#fff3a0'], speed: [40, 140] }); }, 470);
        // comic timing: it freezes, looks up at the hat… and deflates with a raspberry
        S.later(() => {
          SFX.pffft(); M.scaleT = 0.5; M.scaleRate = 3.2; G.scaryT = 0; G.eyeMode = 'open'; G.mouth = 'o';
          for (let k2 = 0; k2 < 6; k2++) S.later(() => { if (G.M) DMX.poke(M, M.cx + (Math.random() - 0.5) * 50, M.cy, (Math.random() - 0.5) * 900, -200, 160); }, k2 * 120);
          MU.mode = 'silly'; MU.bpm = 100;
          talk(loopie, care() ? line({ Jolly: 'There. Much easier to be around.', Cheeky: 'Hard to be scary in a hat like that.', Unfiltered: 'Better.' }) : line({ Jolly: 'Nobody can be scary in a hat that small!', Cheeky: 'Look at it. LOOK at it. Terrifying.', Unfiltered: 'Ha. Not scary now.' }), { mood: 'laugh', moodMs: 2400 });
        }, 1500);
        S.later(() => { G.step = 'silly'; G.eyeMode = 'squint'; G.mouth = 'grin'; G.squintUntil = performance.now() + 1200; SFX.giggle(2); DMX.kick(M, 0, -520); }, 2700);
        S.later(() => { SFX.giggle(5); DMX.kick(M, 0, -420); talk(sync, line({ Jolly: 'It’s giggling at its own hat.', Cheeky: 'It knows. It knows it looks ridiculous.', Unfiltered: 'It likes the hat.' }), { mood: 'laugh', moodMs: 1800 }); }, 3500);
        S.later(finale, 5200);
      }

      /* ---------------- finale: goodbye, a nap in the corner, the page saved as a card ---------------- */
      let finished = false;
      async function finale() {
        if (G.step === 'finale' || G.step === 'done') return;
        G.step = 'finale'; K.guide(null); ctx.track('phase', { p: 'finale' }); chipShow();
        const M = G.M;
        setNote('Goodnight', 'Shh… sleepy time', 3);
        G.wave = 1; SFX.wave(); G.mouth = 'grin';
        talk(loopie, line({ Jolly: 'It’s waving goodbye!', Cheeky: 'It’s waving. Wave back, it’s polite.', Unfiltered: 'It’s waving.' }), { mood: 'love', moodMs: 2400 });
        await K.sleep(1500);
        G.wave = 0; G.mouth = 'yawn'; SFX.yawn(); MU.mode = 'sleep'; MU.bpm = 76;
        await K.sleep(1000);
        // toddle to the corner of the page and curl up
        const halfW = M.bw * 0.45 * 0.5;
        M.walkTo = L.page.w - 18 - halfW - 26; M.walkV = 120; G.mouth = 'smile';
        await K.sleep(1800);
        M.scaleT = 0.42; M.scaleRate = 2; M.thT = 0.18; G.sitT = 1; G.eyeMode = 'sleep'; G.mouth = 'sleep'; G.sleepAt = performance.now();
        SFX.snore();
        talk(sync, line({ Jolly: 'Goodnight, ' + G.name + '.', Cheeky: 'Out cold. Big day for a feeling.', Unfiltered: 'Asleep.' }), { mood: 'sleepy', moodMs: 2600 });
        await K.sleep(1300);
        saveCard();
        await K.wait(3350); // the card hovers, then lands in the sketchbook
        talk(loopie, care() ? line({ Jolly: 'Smaller now. The real stuff can still get real help, and that’s okay.', Cheeky: 'Tiny monster. And if the real thing needs help, that’s allowed.', Unfiltered: 'Smaller. Real help is fine too.' }) : line({ Jolly: 'Your sketchbook’s getting crowded. In a good way.', Cheeky: 'Another one for the collection. Weird little guys.', Unfiltered: 'Saved.' }), { mood: 'happy', moodMs: 2600, ms: 3000 });
        await K.wait(900);
        const badges = [];
        const gb = K.best('giggles', G.giggles, 'higher');
        if (gb.isNew) badges.push('New best: ' + G.giggles + ' giggles');
        const score = (G.feedTries <= 1 ? 0.36 : G.feedTries <= 3 ? 0.22 : 0.12) + Math.min(0.32, G.giggles / (TICKLES * 1.6) * 0.32) + (G.sitBreaks === 0 ? 0.32 : G.sitBreaks === 1 ? 0.2 : 0.1);
        const tier = K.tier(score, [0.45, 0.7, 0.9]);
        if (tier) badges.push(tier + ': monster whisperer');
        if (UNLOCK) badges.push('Unlocked: ' + ACC_NAME[UNLOCK].replace(/^an? |^some /, ''));
        badges.push('Sketchbook: ' + BOOK.length + ' monster' + (BOOK.length === 1 ? '' : 's'));
        ctx.track('done', { giggles: G.giggles, tries: G.feedTries, breaks: G.sitBreaks, renames: G.renames, n: BOOK.length });
        finished = true; G.step = 'done';
        ctx.finish({
          title: 'Goodnight, ' + G.name, mood: 'love',
          lines: ['You gave a feeling a shape, a name and a tiny hat', 'It went big and scary, then tiny and giggly', 'Saved to your sketchbook: monster #' + BOOK.length],
          share: 'Drew my stress. It’s a tiny wobbly monster now.',
          badges: badges.slice(0, 4)
        });
      }
      function saveCard() {
        const M = G.M, pg = L.page, d = L.dpr;
        // the snapshot: the corner of the page where it sleeps, exactly as it looks now
        const cw = Math.min(pg.w * 0.7, 270), ch = cw * 0.84;
        const sl = DMX.anchor(M, M.belly, tmpA);
        const cx = clamp(sl.x, cw / 2 + 8, pg.w - cw / 2 - 8), cy = clamp(L.ground - ch * 0.42, ch / 2 + 8, pg.h - ch / 2 - 8);
        const snap = mk(cw * d, ch * d);
        try { snap.g.drawImage(cv.el, Math.round((pg.x + cx - cw / 2) * d), Math.round((pg.y + cy - ch / 2) * d), Math.round(cw * d), Math.round(ch * d), 0, 0, snap.c.width, snap.c.height); } catch (e) { /* tainted or lost: the card stays blank */ }
        const to = L.wide ? galleryTarget() : chipTarget();
        G.card = { snap: snap.c, x: pg.x + cx, y: pg.y + cy, hx: pg.x + pg.w / 2, hy: pg.y + Math.min(pg.h * 0.5, L.ground - ch * 0.55), w: cw, h: ch, t0: performance.now(), to, landed: false };
        G.flash = 1; SFX.shutter();
        // the page decorates itself: doodled stars, hearts and swirls in today's pen
        const R = rngOf(DAY + visits);
        ['star', 'heart', 'swirl', 'star', 'heart', 'spark', 'star'].forEach((kind, k) => {
          const x = pg.x + 30 + R() * (pg.w - 60), y = pg.y + 40 + R() * (L.ground - 120);
          G.doodles.push({ kind, x, y, s: 10 + R() * 12, t0: performance.now() + 300 + k * 260, dur: 420, rot: (R() - 0.5) * 0.6 });
        });
        S.later(() => K.finale('stars', { colors: [PAL.ink, '#fff3a0', '#ffffff'], ms: 3200, z: 20, chord: [noteName(KEY), noteName(KEY + 4), noteName(KEY + 7), noteName(KEY + 11)] }), 300);
        // write the monster into the sketchbook: strokes only, never words
        const entry = encodeMonster(M);
        BOOK = BOOK.concat([entry]).slice(-12);
        S.store.set('doodle-monster:book', BOOK);
        K.collect('monster:' + DAY + ':' + visits);
      }
      function noteName(m) { const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; return N[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
      function galleryTarget() { const lp = L.left, cols = 3, cw = (lp.w - 56) / cols, chh = cw * 0.98; return { x: lp.x + 28 + cw / 2, y: lp.y + 80 + chh / 2, s: (cw - 8) / 280 }; }
      function chipTarget() { const r = K.rectIn(bookChip.firstChild); return { x: r.cx, y: r.cy, s: 0.12 }; }
      function encodeMonster(M) { // rest shape, quantised; the hat in the same space; eyes as circles. No text from the player.
        const q = (v) => Math.round(v * 10) / 10;
        const s = M.strokes.map(([a, b]) => { const out = []; for (let i = a; i <= b; i++) out.push(q(M.rx[i] / 2), q(M.ry[i] / 2)); return out; });
        const hat = G.hat ? G.hat.strokes.map(st => { const out = []; st.forEach(p => out.push(q((p.x + M.hat.x) / 2), q((p.y + 2 + M.hat.y) / 2))); return out; }) : [];
        return { n: G.name, p: PENS.indexOf(PEN), d: DAY, s, h: hat, e: M.eyes.map(e => [q(e.x / 2), q(e.y / 2), q(e.r / 2)]), a: WEAR || '' };
      }

      /* ---------------- stored monsters (the gallery, the card, the sleeping cameo from last time) ---------------- */
      function drawStored(g, e, cx, cy, size, o) {
        o = o || {};
        if (!e._b) { // bounds and a hull, worked out once
          const pts = []; e.s.forEach(st => { for (let i = 0; i < st.length; i += 2) pts.push([st[i], st[i + 1]]); });
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
          const ex = []; pts.forEach(p => { for (let a = 0; a < 6; a++) ex.push([p[0] + Math.cos(a / 6 * TAU) * 5, p[1] + Math.sin(a / 6 * TAU) * 5]); });
          const loops = e.s.filter(st => { if (st.length < 14) return false; let len = 0; for (let i = 2; i < st.length; i += 2) len += Math.hypot(st[i] - st[i - 2], st[i + 1] - st[i - 1]); return len > 30 && Math.hypot(st[0] - st[st.length - 2], st[1] - st[st.length - 1]) < Math.max(11, len * 0.18); });
          e._b = { x0, y0, x1, y1, hull: DMX.hull(ex), loops };
        }
        const b = e._b, k = size / Math.max(1, b.x1 - b.x0, b.y1 - b.y0), mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
        const pen = PENS[e.p] || PEN, ink = PAL.dark ? pen.gel : pen.ink, fill = PAL.dark ? mix(pen.gel, '#1c1d2b', 0.72) : mix(pen.ink, '#ffffff', 0.84);
        g.save(); g.translate(cx, cy); g.rotate(o.rot || (o.sleep ? -0.08 : 0)); g.scale(k, k * (o.squash || 1)); g.translate(-mx, -my);
        const lw0 = 2.4 / k * Math.max(1, size / 60);
        g.lineCap = 'round'; g.lineJoin = 'round';
        const trace = (st) => { g.beginPath(); g.moveTo(st[0], st[1]); for (let i = 2; i < st.length; i += 2) g.lineTo(st[i], st[i + 1]); };
        g.strokeStyle = fill; g.lineWidth = lw0 * 3.2; e.s.forEach(st => { trace(st); g.stroke(); });
        g.fillStyle = fill;
        if (b.loops.length) b.loops.forEach(st => { trace(st); g.closePath(); g.fill(); });
        else { g.beginPath(); b.hull.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); }
        g.strokeStyle = ink; g.lineWidth = lw0;
        const path = (st) => { trace(st); g.stroke(); };
        e.s.forEach(path);
        (e.e || []).forEach(ey => { // sleeping eyes
          g.fillStyle = PAL.eye; g.beginPath(); g.arc(ey[0], ey[1], ey[2], 0, TAU); g.fill();
          g.strokeStyle = PAL.pupil; g.lineWidth = 1.6 / k * Math.max(1, size / 60); g.beginPath();
          if (o.sleep) g.arc(ey[0], ey[1] - ey[2] * 0.2, ey[2] * 0.6, 0.2 * Math.PI, 0.8 * Math.PI); else g.arc(ey[0], ey[1] + ey[2] * 0.2, ey[2] * 0.45, 0, TAU);
          g.stroke(); g.strokeStyle = ink;
        });
        g.lineWidth = 2.4 / k * Math.max(1, size / 60);
        (e.h || []).forEach(path);
        g.restore();
      }
      const CAMEO = BOOK.length ? BOOK[BOOK.length - 1] : null;

      /* ---------------- update ---------------- */
      let acc = 0, lastNow = 0;
      K.loop((dt) => {
        if (!L || !BG) return;
        const now = performance.now(), rdt = clamp((now - (lastNow || now)) / 1000, 0, 0.25); lastNow = now;
        musicTick();
        update(rdt, now);
        draw(now / 1000, rdt, now);
      });
      function update(dt, now) {
        // the pen's scratch follows how fast you draw
        const want = G.cur ? clamp(penSpeed / 1500, 0.15, 1) : 0;
        scratchLvl += (want - scratchLvl) * Math.min(1, dt * 18);
        if (scratch) { scratch.level(scratchLvl * 0.13, 0.03); scratch.freq(2400 + penSpeed * 0.7, 0.05); }
        penSpeed *= Math.pow(0.02, dt);
        const M = G.M;
        if (M) {
          // legs grow, the body sits, scale eases, it breathes
          G.legK += ((G.legT || 0) - G.legK) * Math.min(1, dt * 6);
          const sitW = G.step === 'sit' ? G.sitHold : G.step === 'sat' ? 1 : G.sitT || 0;
          G.sit += (sitW - G.sit) * Math.min(1, dt * 7);
          M.scale += (M.scaleT - M.scale) * (1 - Math.exp(-dt * (M.scaleRate || 3)));
          const sleeping = G.step === 'finale' && G.eyeMode === 'sleep';
          M.sNow = M.scale * (1 + (sleeping ? 0.035 : 0.016) * Math.sin(now / 1000 * (sleeping ? 1.4 : 2.4)));
          if (G.step === 'grow' || G.step === 'hat') G.scaryT = 1;
          G.scary += ((G.scaryT || 0) - G.scary) * Math.min(1, dt * 3);
          M.floor = L.ground - 30 * M.scale * G.legK * (1 - 0.74 * G.sit);
          acc += dt; let n = 0;
          while (acc >= DMX.H && n < 60) { DMX.step(M, DMX.H); acc -= DMX.H; n++; }
          if (n >= 60) acc = 0;
          if (M.land > 420) { M.sqv += Math.min(M.land, 2400) * 0.0011; if (M.land > 700 && now - (G.landAt || 0) > 300) { G.landAt = now; SFX.land(M.land); P.emit('dust', L.page.x + M.cx, L.page.y + L.ground, 6, { colors: [hexA(PAL.pencil, 0.6)], speed: [20, 60] }); } }
          M.land = 0;
          M.sqv += (-170 * M.sq - 11 * M.sqv) * dt; M.sq = clamp(M.sq + M.sqv * dt, -0.3, 0.35);
          if (G.step === 'sit' && G.sitting) M.sq = Math.max(M.sq, 0.08 * G.sitHold);
          // googly eyes: loose pupils with real inertia, gravity and a wish to look at things
          for (const e of M.eyes) {
            const q = DMX.anchor(M, e, tmpA), r = e.r * M.sNow;
            if (e.lx == null) { e.lx = q.x; e.ly = q.y; }
            const vx = (q.x - e.lx) / Math.max(dt, 1e-3), vy = (q.y - e.ly) / Math.max(dt, 1e-3);
            const ax = clamp((vx - e.lvx) / Math.max(dt, 1e-3), -40000, 40000), ay = clamp((vy - e.lvy) / Math.max(dt, 1e-3), -40000, 40000);
            e.lx = q.x; e.ly = q.y; e.lvx = vx; e.lvy = vy;
            let fx = -ax * 0.9, fy = -ay * 0.9 + 900;
            const tgt = lookTarget();
            if (tgt) { const dx = tgt.x - q.x, dy = tgt.y - q.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * 2600; fy += dy / d * 2600 - 700; }
            if (G.eyeMode === 'up') { fy -= 3600; }
            e.vx = (e.vx + fx * dt) * Math.pow(0.04, dt); e.vy = (e.vy + fy * dt) * Math.pow(0.04, dt);
            e.ox += e.vx * dt; e.oy += e.vy * dt;
            const lim = Math.max(1, r * (G.eyeMode === 'angry' ? 0.66 : 0.5)), dd = Math.hypot(e.ox, e.oy);
            if (dd > lim) { const nx = e.ox / dd, ny = e.oy / dd; e.ox = nx * lim; e.oy = ny * lim; const vn = e.vx * nx + e.vy * ny; if (vn > 0) { e.vx -= 1.4 * vn * nx; e.vy -= 1.4 * vn * ny; } }
          }
          // blinking
          if (now > G.blinkAt) { G.blink = 1; G.blinkAt = now + 2200 + Math.random() * 2800; }
          G.blink = Math.max(0, G.blink - dt * 7);
          if (G.squintUntil && now > G.squintUntil && G.eyeMode === 'squint') { G.eyeMode = 'open'; if (G.mouth === 'grin' && G.step !== 'silly') G.mouth = 'smile'; }
          if (G.mouth === 'open' && !(G.snack && G.snack.held)) G.mouth = 'smile';
          if (G.snack && G.snack.held) { const m = mouthPt(), d = Math.hypot(G.snack.x - m.x, G.snack.y - m.y); G.mouthOpen = clamp(1 - (d - 40) / 200, 0.15, 1); } else G.mouthOpen *= Math.pow(0.02, dt);
          // feet: planted, stepping when the body moves on
          for (const lg of M.legs) {
            const q = DMX.anchor(M, lg, tmpA), stride = 16 * M.scale + 6;
            const want2 = q.x + lg.side * (4 + 10 * G.sit) * M.scale;
            if (lg.fx == null) { lg.fx = want2; lg.st = 1; }
            if (lg.st >= 1 && Math.abs(want2 - lg.fx) > stride && !M.legs.some(o => o !== lg && o.st < 1)) { lg.sx = lg.fx; lg.ex = want2 + Math.sign(want2 - lg.fx) * stride * 0.4; lg.st = 0; }
            if (lg.st < 1) { lg.st = Math.min(1, lg.st + dt / 0.14); lg.fx = lerp(lg.sx, lg.ex, eIO(lg.st)); if (lg.st >= 1 && G.legK > 0.8) A.ctx && A.click({ vol: 0.02 }); }
          }
          // the hat wobbles on its head
          if (G.hat) {
            const q = DMX.anchor(M, M.hat, tmpB);
            if (G.hatPrev) { const ax = (q.x - G.hatPrev.x) / Math.max(dt, 1e-3); G.hat.av += (-ax * 0.012 - G.hat.ang * 160 - G.hat.av * 9) * dt; G.hat.ang = clamp(G.hat.ang + G.hat.av * dt, -0.6, 0.6); }
            G.hatPrev = { x: q.x, y: q.y }; G.hatPos = q;
          }
          // the cameo from last time opens one eye when this one comes alive
          if (CAMEO && G.step === 'name' && !G.cameoDone) { G.cameoDone = true; G.cameoPeek = 1; }
          G.cameoPeek = Math.max(0, G.cameoPeek - dt * 0.4);
          if (G.step === 'name' && now > (G.nameUntil || 0)) { startFeed(); }
          if (G.step === 'hat' && G.hatTimer && now > G.hatTimer && !G.cur) attachHat();
          if (G.step === 'hat' && !G.hatStrokes.length && !G.hatNudged && now - G.hatAt > 11000 && quiet(3000)) { G.hatNudged = true; talk(loopie, line({ Jolly: 'Any little squiggle on its head counts as a hat!', Cheeky: 'A dot on its head? Technically a hat.', Unfiltered: 'Any squiggle works.' }), { mood: 'wink', moodMs: 1600 }); }
        }
        if (G.snack && !G.snack.held && !G.snack.eaten) { const s = G.snack, k = Math.min(1, dt * 6); s.x += (s.home.x - s.x) * k; s.y += (s.home.y + Math.sin(now / 1000 * 2.2) * 5 - s.y) * k; }
        G.shrinkFlash = Math.max(0, (G.shrinkFlash || 0) - dt * 2);
        G.flash = Math.max(0, G.flash - dt * 3);
        for (let i = G.zzz.length - 1; i >= 0; i--) if (now - G.zzz[i].t0 > G.zzz[i].dur) G.zzz.splice(i, 1);
        if (G.step === 'finale' && G.eyeMode === 'sleep' && now - (G.zAt || 0) > 1100 && G.M) { G.zAt = now; const q = DMX.anchor(G.M, G.M.hat, tmpA); G.zzz.push({ text: 'z', x: q.x + 14, y: q.y - 6, t0: now, vx: 14, dur: 2400, z: true }); }
        P.update(dt);
      }
      function lookTarget() {
        if (G.snack && !G.snack.eaten) return G.snack;
        if (G.step === 'hat' && G.cur) return G.cur[G.cur.length - 1];
        return G.look;
      }

      /* ---------------- drawing ---------------- */
      let boilSeed = 0, boilAt = 0;
      const bo = (i, j) => (RED() ? 0 : (hash(i * 7 + j, boilSeed) - 0.5) * 1.5);
      function strokePath(g, xs, ys, i0, i1, boil) { // a smooth path through particles, with a little hand-drawn line boil
        if (i1 <= i0) { g.beginPath(); g.arc(xs[i0], ys[i0], 1.2, 0, TAU); return; }
        g.beginPath();
        const X = (i) => xs[i] + (boil ? bo(i, 0) : 0), Y = (i) => ys[i] + (boil ? bo(i, 1) : 0);
        g.moveTo(X(i0), Y(i0));
        for (let i = i0 + 1; i < i1; i++) g.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
        g.lineTo(X(i1), Y(i1));
      }
      function rawPath(g, s) { g.beginPath(); g.moveTo(s[0].x, s[0].y); if (s.length === 1) { g.lineTo(s[0].x + 0.1, s[0].y + 0.1); return; } for (let i = 1; i < s.length - 1; i++) g.quadraticCurveTo(s[i].x, s[i].y, (s[i].x + s[i + 1].x) / 2, (s[i].y + s[i + 1].y) / 2); g.lineTo(s[s.length - 1].x, s[s.length - 1].y); }
      function inkLine(g, w) { g.lineCap = 'round'; g.lineJoin = 'round'; if (PAL.dark) { g.strokeStyle = hexA(PAL.ink, 0.18); g.lineWidth = w + 6; g.stroke(); } g.strokeStyle = PAL.ink; g.lineWidth = w; g.stroke(); }
      function draw(t, dt, now) {
        const g = cv.g, d = L.dpr, pg = L.page, p = PAL;
        if (now - boilAt > 110) { boilAt = now; boilSeed = (boilSeed + 1) % 997; }
        g.setTransform(1, 0, 0, 1, 0, 0);
        const sh = RED() ? 0 : (G.scary > 0.5 && (G.step === 'grow') ? (G.scary - 0.5) * 3 : 0), sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
        g.drawImage(BG.c, 0, 0);
        g.setTransform(d, 0, 0, d, d * (pg.x + sx), d * (pg.y + sy));
        // the sleeping cameo from your last visit, in the bottom-left corner
        if (CAMEO) {
          const br = 1 + 0.03 * Math.sin(t * 1.3), cs = Math.min(64, pg.w * 0.17);
          drawStored(g, CAMEO, 16 + cs * 0.55, L.ground - cs * 0.42 * br, cs * br, { sleep: G.cameoPeek < 0.3, squash: 0.88 });
          g.fillStyle = p.sub; g.font = '700 15px ' + HAND; g.textAlign = 'left';
          const zt = (t * 0.6) % 1; g.globalAlpha = Math.sin(zt * Math.PI) * 0.8; g.fillText('z', 18 + cs * 0.9 + zt * 10, L.ground - cs * 0.8 - zt * 16); g.globalAlpha = 1;
        }
        // strokes being drawn
        for (const s of G.strokes) { rawPath(g, s); inkLine(g, L.wide ? 6 : 5.5); }
        if (G.M) drawMonster(g, t, now);
        for (const s of G.hatStrokes) { rawPath(g, s); inkLine(g, 4.5); }
        if (G.snack && !G.snack.eaten) drawSnack(g, SNACK, G.snack.x, G.snack.y, G.snack.r * (G.snack.held ? 1.12 : 1), t);
        if (G.step === 'hat' && G.M && !G.hatStrokes.length) { // where the hat goes: a dashed, breathing outline
          const q = DMX.anchor(G.M, G.M.hat, tmpA), r = 24 + 3 * Math.sin(t * 4);
          g.strokeStyle = hexA(p.ink, 0.75); g.setLineDash([5, 6]); g.lineWidth = 2.5; g.beginPath(); g.ellipse(q.x, q.y - 26, r * 1.15, r, 0, 0, TAU); g.stroke(); g.setLineDash([]);
        }
        drawWords(g, now);
        drawDoodles(g, now);
        g.setTransform(d, 0, 0, d, 0, 0);
        if (G.scary > 0.02 && VIG) { g.globalAlpha = clamp(G.scary, 0, 1) * 0.8; g.drawImage(VIG, pg.x, pg.y, pg.w, pg.h); g.globalAlpha = 1; }
        P.draw(g);
        if (G.card) drawCard(g, now);
        if (G.flash > 0.01) { g.fillStyle = 'rgba(255,255,255,' + (G.flash * 0.7) + ')'; g.fillRect(pg.x, pg.y, pg.w, pg.h); }
      }
      function drawMonster(g, t, now) {
        const M = G.M, p = PAL, sc = M.sNow;
        // shadow on the ground
        const low = DMX.lowest(M), lift = clamp((L.ground - low) / 120, 0, 1);
        g.fillStyle = p.shadow; g.globalAlpha = 0.9 - lift * 0.6; g.beginPath(); g.ellipse(M.cx, L.ground + 3, M.bw * sc * 0.42 * (1 - lift * 0.3), 7 + 3 * sc, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
        // little legs (behind the body), with shoes if it owns sneakers
        if (G.legK > 0.02) {
          for (const lg of M.legs) {
            const q = DMX.anchor(M, lg, tmpA), fy = L.ground - 2, fx = lg.fx == null ? q.x : lg.fx;
            const lift2 = lg.st < 1 ? Math.sin(lg.st * Math.PI) * 9 : 0;
            const ex = lerp(q.x, fx, G.legK), ey = lerp(q.y, fy - lift2, G.legK);
            const kx = (q.x + ex) / 2 + lg.side * (6 + 10 * G.sit) * sc, ky = (q.y + ey) / 2;
            g.beginPath(); g.moveTo(q.x, q.y); g.quadraticCurveTo(kx, ky, ex, ey);
            g.lineCap = 'round'; g.strokeStyle = p.ink; g.lineWidth = 4.2; g.stroke();
            const fw = (8 + 3 * sc) * G.legK, dir = lg.side || (lg.j % 2 ? 1 : -1);
            if (WEAR === 'sneakers') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex + dir * fw * 0.45, ey - 3, fw * 1.05, 5.5, 0, 0, TAU); g.fill(); g.strokeStyle = p.ink; g.lineWidth = 2.2; g.stroke(); g.strokeStyle = '#e2453c'; g.lineWidth = 2; g.beginPath(); g.moveTo(ex + dir * fw * 0.1, ey - 4); g.lineTo(ex + dir * fw * 0.9, ey - 4); g.stroke(); }
            else { g.fillStyle = p.ink; g.beginPath(); g.ellipse(ex + dir * fw * 0.4, ey - 2, fw * 0.85, 4.2, 0, 0, TAU); g.fill(); }
          }
        }
        // arms (they only appear to wave goodbye)
        if (G.wave > 0 || G.step === 'finale' && G.eyeMode !== 'sleep') for (const ar of M.arms) {
          const q = DMX.anchor(M, ar, tmpA), wv = ar.side > 0 && G.wave ? Math.sin(t * 14) * 0.7 : 0.3 * Math.sin(t * 2 + ar.side);
          const ang = ar.side > 0 ? -0.9 + wv : Math.PI + 0.5 + wv * 0.3, len = 26 * sc + 8;
          const hx = q.x + Math.cos(ang) * len, hy = q.y + Math.sin(ang) * len;
          g.beginPath(); g.moveTo(q.x, q.y); g.quadraticCurveTo((q.x + hx) / 2 + ar.side * 6, (q.y + hy) / 2 + 6, hx, hy); g.strokeStyle = p.ink; g.lineWidth = 4; g.lineCap = 'round'; g.stroke();
          g.fillStyle = p.fill; g.beginPath(); g.arc(hx, hy, 5.5, 0, TAU); g.fill(); g.lineWidth = 2.5; g.stroke();
        }
        const lw = (L.wide ? 5.4 : 5) * Math.sqrt(clamp(sc, 0.4, 1.8));
        const bodyFill = G.scary > 0.05 ? mix(p.fill, p.dark ? '#3a1028' : '#6a2a55', G.scary * 0.6) : p.fill;
        // spikes when it puffs up, hugging the outline you drew (or the hull, for an open scribble)
        if (G.scary > 0.05) {
          const pts = [];
          if (M.main) for (let i = M.main[0]; i <= M.main[1]; i += 2) pts.push([M.x[i], M.y[i]]);
          else { const cth = Math.cos(M.th), sth = Math.sin(M.th); M.hull.forEach(v => pts.push([M.x[v.i] + (cth * v.ox - sth * v.oy) * sc, M.y[v.i] + (sth * v.ox + cth * v.oy) * sc])); }
          g.beginPath();
          for (let k = 0; k < pts.length; k++) {
            const a = pts[k], b = pts[(k + 1) % pts.length], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
            const ox = mx - M.cx, oy = my - M.cy, ol = Math.hypot(ox, oy) || 1, sp = (13 + 6 * Math.sin(k * 2.1 + t * 6)) * G.scary * sc;
            if (k === 0) g.moveTo(a[0], a[1]); else g.lineTo(a[0], a[1]);
            g.lineTo(mx + ox / ol * sp, my + oy / ol * sp);
          }
          g.closePath(); g.fillStyle = mix(p.ink, '#000000', p.dark ? 0.15 : 0.35); g.globalAlpha = clamp(G.scary, 0, 1); g.fill(); g.globalAlpha = 1;
        }
        // the body: a soft marker halo along every stroke, closed loops filled and hatched
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const [a, b] of M.strokes) { strokePath(g, M.x, M.y, a, b, false); g.strokeStyle = bodyFill; g.lineWidth = lw * 3.4; g.stroke(); }
        const fills = M.loops.length ? M.loops : null;
        if (fills) for (const [a, b] of fills) { strokePath(g, M.x, M.y, a, b, false); g.closePath(); g.fillStyle = bodyFill; g.fill(); if (HATCH) { g.fillStyle = HATCH; g.fill(); } if (G.shrinkFlash > 0.02) { g.fillStyle = hexA('#ffffff', G.shrinkFlash * 0.4); g.fill(); } }
        else if (M.hull.length > 2) { // an open scribble: a soft blob around it
          const cth = Math.cos(M.th), sth = Math.sin(M.th), hp = M.hull, nH = hp.length;
          const hx = (k) => { const v = hp[k]; return M.x[v.i] + (cth * v.ox - sth * v.oy) * sc; }, hy = (k) => { const v = hp[k]; return M.y[v.i] + (sth * v.ox + cth * v.oy) * sc; };
          g.beginPath(); const sm = (k) => [(hx(k) + hx((k + 1) % nH)) / 2, (hy(k) + hy((k + 1) % nH)) / 2];
          const m0 = sm(nH - 1); g.moveTo(m0[0], m0[1]);
          for (let k = 0; k < nH; k++) { const m1 = sm(k); g.quadraticCurveTo(hx(k), hy(k), m1[0], m1[1]); }
          g.closePath(); g.globalAlpha = 0.85; g.fillStyle = bodyFill; g.fill(); if (HATCH) { g.fillStyle = HATCH; g.fill(); } g.globalAlpha = 1;
        }
        // your strokes, alive
        for (const [a, b] of M.strokes) { strokePath(g, M.x, M.y, a, b, true); inkLine(g, lw); }
        drawAcc(g, M, sc);
        // eyes
        for (const e of M.eyes) {
          if (!e.open) continue;
          const q = DMX.anchor(M, e, tmpA), r = e.r * sc;
          g.fillStyle = p.eye; g.beginPath(); g.arc(q.x, q.y, r, 0, TAU); g.fill();
          g.strokeStyle = p.ink; g.lineWidth = 2.6; g.stroke();
          const shut = G.eyeMode === 'sleep' || G.blink > 0.5 && G.eyeMode !== 'angry';
          if (shut) { g.strokeStyle = p.pupil; g.lineWidth = 2.6; g.beginPath(); g.arc(q.x, q.y - r * 0.15, r * 0.62, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); continue; }
          if (G.eyeMode === 'squint') { g.strokeStyle = p.pupil; g.lineWidth = 3; g.beginPath(); g.moveTo(q.x - r * 0.55, q.y + r * 0.2); g.lineTo(q.x, q.y - r * 0.35); g.lineTo(q.x + r * 0.55, q.y + r * 0.2); g.stroke(); continue; }
          const pr = r * (G.eyeMode === 'angry' ? 0.34 : G.eyeMode === 'up' ? 0.4 : 0.5);
          g.fillStyle = p.pupil; g.beginPath(); g.arc(q.x + e.ox, q.y + e.oy, pr, 0, TAU); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(q.x + e.ox - pr * 0.35, q.y + e.oy - pr * 0.38, pr * 0.32, 0, TAU); g.fill();
          if (G.eyeMode === 'angry') { g.strokeStyle = p.ink; g.lineWidth = 5; g.lineCap = 'round'; const sd = q.x < M.cx ? 1 : -1; g.beginPath(); g.moveTo(q.x - r * 0.9 * sd, q.y - r * 1.25); g.lineTo(q.x + r * 0.6 * sd, q.y - r * 0.75); g.stroke(); }
        }
        // mouth
        const mq = DMX.anchor(M, M.mouth, tmpB), mw = M.mouth.w * sc;
        g.lineCap = 'round'; g.strokeStyle = p.pupil; g.fillStyle = p.pupil; g.lineWidth = 3;
        const mo = G.mouth;
        if (mo === 'smile') { g.beginPath(); g.arc(mq.x, mq.y - mw * 0.35, mw * 0.55, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
        else if (mo === 'grin') { g.beginPath(); g.moveTo(mq.x - mw * 0.55, mq.y - 2); g.quadraticCurveTo(mq.x, mq.y + mw * 0.75, mq.x + mw * 0.55, mq.y - 2); g.closePath(); g.fill(); g.fillStyle = '#ff8fa8'; g.beginPath(); g.ellipse(mq.x, mq.y + mw * 0.22, mw * 0.2, mw * 0.11, 0, 0, TAU); g.fill(); }
        else if (mo === 'open' || G.mouthOpen > 0.2 && mo !== 'chomp') { // a hungry cartoon mouth: dark red, a tongue, two little teeth
          const o = Math.max(G.mouthOpen, 0.3), rx = mw * (0.3 + o * 0.28), ry = mw * (0.14 + o * 0.36);
          g.save(); g.beginPath(); g.ellipse(mq.x, mq.y + 2, rx, ry, 0, 0, TAU); g.fillStyle = '#4a0f22'; g.fill(); g.clip();
          g.fillStyle = '#ff7f9c'; g.beginPath(); g.ellipse(mq.x, mq.y + 2 + ry * 0.75, rx * 0.7, ry * 0.5, 0, 0, TAU); g.fill();
          g.fillStyle = '#ffffff'; g.fillRect(mq.x - rx * 0.42, mq.y + 2 - ry, rx * 0.3, ry * 0.42); g.fillRect(mq.x + rx * 0.12, mq.y + 2 - ry, rx * 0.3, ry * 0.42);
          g.restore(); g.beginPath(); g.ellipse(mq.x, mq.y + 2, rx, ry, 0, 0, TAU); g.strokeStyle = p.pupil; g.lineWidth = 2.6; g.stroke();
        }
        else if (mo === 'chomp') { g.beginPath(); const n = 5; for (let k = 0; k <= n; k++) { const x = mq.x - mw * 0.55 + k / n * mw * 1.1, y = mq.y + (k % 2 ? 4 : -2); if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
        else if (mo === 'o') { g.beginPath(); g.ellipse(mq.x, mq.y + 2, mw * 0.18, mw * 0.24, 0, 0, TAU); g.fill(); }
        else if (mo === 'teeth') { g.beginPath(); g.ellipse(mq.x, mq.y + 4, mw * 0.75, mw * 0.4, 0, 0, Math.PI); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; const n = 5; for (let k = 0; k < n; k++) { const x = mq.x - mw * 0.6 + (k + 0.5) / n * mw * 1.2; g.beginPath(); g.moveTo(x - mw * 0.11, mq.y + 4); g.lineTo(x + mw * 0.11, mq.y + 4); g.lineTo(x, mq.y + 4 + mw * 0.24); g.closePath(); g.fill(); } }
        else if (mo === 'wobbly') { g.beginPath(); for (let k = 0; k <= 12; k++) { const x = mq.x - mw * 0.5 + k / 12 * mw, y = mq.y + Math.sin(k * 1.4 + t * 10) * 2.2; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
        else if (mo === 'yawn') { g.beginPath(); g.ellipse(mq.x, mq.y + 4, mw * 0.32, mw * 0.5, 0, 0, TAU); g.fill(); }
        else if (mo === 'sleep') { g.beginPath(); g.moveTo(mq.x - mw * 0.2, mq.y); g.quadraticCurveTo(mq.x, mq.y + 3, mq.x + mw * 0.2, mq.y); g.stroke(); }
        // the hat: flies from where you drew it, then sits on the head and wobbles
        if (G.hat) {
          const H2 = G.hat, q = DMX.anchor(M, M.hat, tmpA), k = eBack(clamp((now - H2.t0) / 460, 0, 1)), ang = M.th + H2.ang;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          H2.strokes.forEach((st, si) => {
            g.beginPath();
            st.forEach((pt, i) => {
              const px2 = pt.x * sc, py2 = pt.y * sc, tx = q.x + ca * px2 - sa * py2, ty = q.y + 2 * sc + sa * px2 + ca * py2, fr = H2.from[si][i];
              const x = lerp(fr.x, tx, k), y = lerp(fr.y, ty, k);
              if (i) g.lineTo(x, y); else g.moveTo(x, y);
            });
            if (st.length === 1) g.lineTo(q.x + 0.1, q.y + 0.1);
            inkLine(g, Math.max(2.4, 4 * Math.sqrt(sc)));
          });
        }
      }
      function drawAcc(g, M, sc) { // what it found from last time
        if (!WEAR || WEAR === 'sneakers') return;
        const p = PAL, e0 = M.eyes[0], e1 = M.eyes[M.eyes.length - 1];
        const m = DMX.anchor(M, M.mouth, { }), a = DMX.anchor(M, e0, {}), b = DMX.anchor(M, e1, {}), r = e0.r * sc;
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
        if (WEAR === 'bowtie') { const y = m.y + M.mouth.w * sc * 0.75 + 6; g.fillStyle = '#e2453c'; g.beginPath(); g.moveTo(m.x, y); g.lineTo(m.x - 15, y - 9); g.lineTo(m.x - 15, y + 9); g.closePath(); g.moveTo(m.x, y); g.lineTo(m.x + 15, y - 9); g.lineTo(m.x + 15, y + 9); g.closePath(); g.fill(); g.strokeStyle = p.ink; g.lineWidth = 2; g.stroke(); g.beginPath(); g.arc(m.x, y, 4, 0, TAU); g.fill(); g.stroke(); }
        if (WEAR === 'glasses') { g.strokeStyle = p.pupil; g.lineWidth = 3; [a, b].forEach(q => { g.beginPath(); g.arc(q.x, q.y, r * 1.18, 0, TAU); g.stroke(); }); if (M.eyes.length > 1) { g.beginPath(); g.moveTo(a.x + r * 1.18, a.y); g.lineTo(b.x - r * 1.18, b.y); g.stroke(); } }
        if (WEAR === 'monocle') { g.strokeStyle = '#d4a017'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, r * 1.2, 0, TAU); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.moveTo(b.x + r * 0.8, b.y + r * 0.9); g.quadraticCurveTo(b.x + r * 1.6, b.y + r * 2.5, b.x + r * 0.6, b.y + r * 3.4); g.stroke(); }
        if (WEAR === 'mustache') { const y = m.y - 4, w = Math.max(14, M.mouth.w * sc * 0.75); g.fillStyle = p.pupil; [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(m.x, y); g.quadraticCurveTo(m.x + sd * w * 0.5, y - 7, m.x + sd * w, y - 1); g.quadraticCurveTo(m.x + sd * w * 1.15, y - 6, m.x + sd * w * 1.05, y - 9); g.quadraticCurveTo(m.x + sd * w * 1.35, y + 1, m.x + sd * w * 0.9, y + 4); g.quadraticCurveTo(m.x + sd * w * 0.45, y + 5, m.x, y + 2); g.fill(); }); }
        if (WEAR === 'flower') { const q = DMX.anchor(M, M.hat, {}), x = q.x + M.bw * sc * 0.22, y = q.y + 8; for (let k = 0; k < 5; k++) { const an2 = k / 5 * TAU; g.fillStyle = '#ff8fc4'; g.beginPath(); g.ellipse(x + Math.cos(an2) * 7, y + Math.sin(an2) * 7, 6, 4, an2, 0, TAU); g.fill(); } g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill(); }
        if (WEAR === 'scarf') { const y = m.y + M.mouth.w * sc * 0.6 + 8, w = M.bw * sc * 0.36; g.strokeStyle = '#e2453c'; g.lineWidth = 9; g.beginPath(); g.moveTo(m.x - w, y - 2); g.quadraticCurveTo(m.x, y + 7, m.x + w, y - 2); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(m.x + w * 0.5, y + 2); g.lineTo(m.x + w * 0.62, y + 22); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.setLineDash([3, 5]); g.beginPath(); g.moveTo(m.x - w, y - 2); g.quadraticCurveTo(m.x, y + 7, m.x + w, y - 2); g.stroke(); g.setLineDash([]); }
        g.restore();
      }
      function drawAccIcon(g, a, r) { // the wardrobe shelf on the gallery page
        const p = PAL; g.lineCap = 'round'; g.lineJoin = 'round';
        if (a === 'bowtie') { g.fillStyle = '#e2453c'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-r, -r * 0.6); g.lineTo(-r, r * 0.6); g.closePath(); g.moveTo(0, 0); g.lineTo(r, -r * 0.6); g.lineTo(r, r * 0.6); g.closePath(); g.fill(); g.beginPath(); g.arc(0, 0, r * 0.25, 0, TAU); g.fill(); }
        else if (a === 'sneakers') { g.fillStyle = '#ffffff'; g.strokeStyle = p.ink; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 3, r, r * 0.45, 0, 0, TAU); g.fill(); g.stroke(); g.strokeStyle = '#e2453c'; g.beginPath(); g.moveTo(-r * 0.6, 0); g.lineTo(r * 0.6, 0); g.stroke(); }
        else if (a === 'glasses') { g.strokeStyle = p.pupil === '#120f1d' ? '#e9e6f7' : p.pupil; g.lineWidth = 2.5; g.beginPath(); g.arc(-r * 0.5, 0, r * 0.42, 0, TAU); g.stroke(); g.beginPath(); g.arc(r * 0.5, 0, r * 0.42, 0, TAU); g.stroke(); }
        else if (a === 'mustache') { g.fillStyle = p.dark ? '#e9e6f7' : '#2a2240'; [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sd * r * 0.5, -r * 0.5, sd * r, 0); g.quadraticCurveTo(sd * r * 0.5, r * 0.4, 0, r * 0.2); g.fill(); }); }
        else if (a === 'flower') { for (let k = 0; k < 5; k++) { const an2 = k / 5 * TAU; g.fillStyle = '#ff8fc4'; g.beginPath(); g.ellipse(Math.cos(an2) * r * 0.5, Math.sin(an2) * r * 0.5, r * 0.42, r * 0.28, an2, 0, TAU); g.fill(); } g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); }
        else if (a === 'scarf') { g.strokeStyle = '#e2453c'; g.lineWidth = 6; g.beginPath(); g.moveTo(-r, -2); g.quadraticCurveTo(0, 6, r, -2); g.stroke(); g.beginPath(); g.moveTo(r * 0.4, 2); g.lineTo(r * 0.5, r); g.stroke(); }
        else if (a === 'monocle') { g.strokeStyle = '#d4a017'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r * 0.6, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(r * 0.4, r * 0.45); g.lineTo(r * 0.7, r); g.stroke(); }
      }
      function drawSnack(g, kind, x, y, r, t) {
        const p = PAL;
        g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2) * 0.08);
        g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = p.dark ? '#f4f1ff' : '#2a2240'; g.lineWidth = 2.6;
        // a soft glow so it reads as "take me"
        g.globalAlpha = 0.5; g.drawImage(K.glowSprite(p.dark ? '#fff3a0' : '#ffe98a'), -r * 2.2, -r * 2.2, r * 4.4, r * 4.4); g.globalAlpha = 1;
        if (kind === 'cookie') { g.fillStyle = '#d99a52'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#5b3416'; [[-0.4, -0.3], [0.3, -0.4], [0.1, 0.2], [-0.3, 0.45], [0.5, 0.3]].forEach(c => { g.beginPath(); g.arc(c[0] * r, c[1] * r, r * 0.13, 0, TAU); g.fill(); }); }
        else if (kind === 'donut') { g.fillStyle = '#e8b06a'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.fillStyle = '#f48fbf'; g.beginPath(); g.arc(0, -2, r * 0.86, 0, TAU); g.fill(); g.fillStyle = p.dark ? '#1c1d2b' : '#fffaf0'; g.beginPath(); g.arc(0, 0, r * 0.32, 0, TAU); g.fill(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.32, 0, TAU); g.stroke(); ['#7ad0ff', '#ffe066', '#ffffff', '#8ce07a'].forEach((c, k) => { const an2 = k * 1.6 + 0.4; g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.cos(an2) * r * 0.6, Math.sin(an2) * r * 0.6); g.lineTo(Math.cos(an2) * r * 0.6 + 4, Math.sin(an2) * r * 0.6 + 2); g.stroke(); }); }
        else if (kind === 'broccoli') { g.fillStyle = '#9bd36a'; g.fillRect(-r * 0.22, 0, r * 0.44, r); g.strokeRect(-r * 0.22, 0, r * 0.44, r); g.fillStyle = '#4f9a3c'; [[-0.5, -0.1], [0.5, -0.1], [0, -0.45], [-0.25, -0.6], [0.3, -0.55]].forEach(c => { g.beginPath(); g.arc(c[0] * r, c[1] * r, r * 0.42, 0, TAU); g.fill(); g.stroke(); }); }
        else if (kind === 'cupcake') { g.fillStyle = '#7ad0ff'; g.beginPath(); g.moveTo(-r * 0.7, 0); g.lineTo(r * 0.7, 0); g.lineTo(r * 0.5, r); g.lineTo(-r * 0.5, r); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ffc2dc'; g.beginPath(); g.arc(0, -r * 0.05, r * 0.78, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#e2453c'; g.beginPath(); g.arc(0, -r * 0.85, r * 0.2, 0, TAU); g.fill(); g.stroke(); }
        else if (kind === 'sock') { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-r * 0.4, -r); g.lineTo(r * 0.3, -r); g.lineTo(r * 0.3, r * 0.2); g.quadraticCurveTo(r * 0.3, r * 0.9, r * 0.95, r * 0.75); g.quadraticCurveTo(r * 1.1, r * 1.05, r * 0.6, r * 1.05); g.lineTo(-r * 0.2, r * 0.95); g.quadraticCurveTo(-r * 0.55, r * 0.8, -r * 0.4, r * 0.2); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = '#e2453c'; g.lineWidth = 3; g.beginPath(); g.moveTo(-r * 0.4, -r * 0.7); g.lineTo(r * 0.3, -r * 0.7); g.moveTo(-r * 0.4, -r * 0.5); g.lineTo(r * 0.3, -r * 0.5); g.stroke(); }
        else if (kind === 'pretzel') { g.strokeStyle = '#a85f22'; g.lineWidth = r * 0.34; g.beginPath(); g.moveTo(-r * 0.7, r * 0.6); g.bezierCurveTo(-r * 1.3, -r * 0.6, -r * 0.1, -r * 1.1, r * 0.25, r * 0.2); g.moveTo(r * 0.7, r * 0.6); g.bezierCurveTo(r * 1.3, -r * 0.6, r * 0.1, -r * 1.1, -r * 0.25, r * 0.2); g.stroke(); g.fillStyle = '#ffffff'; [[-0.6, -0.2], [0.55, -0.25], [0, -0.5], [-0.2, 0.3]].forEach(c => g.fillRect(c[0] * r, c[1] * r, 2.5, 2.5)); }
        else { g.fillStyle = '#f4c542'; g.beginPath(); g.moveTo(-r, r * 0.6); g.lineTo(r, r * 0.6); g.lineTo(r * 0.6, -r * 0.7); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#d9a425'; [[0.1, 0.2], [0.45, -0.1], [-0.35, 0.35]].forEach(c => { g.beginPath(); g.arc(c[0] * r, c[1] * r, r * 0.13, 0, TAU); g.fill(); }); }
        g.restore();
      }
      function drawWords(g, now) { // little handwritten "hee"s and sleepy z's
        for (const z of G.zzz) {
          const k = (now - z.t0) / z.dur, a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
          g.globalAlpha = clamp(a, 0, 1); g.textAlign = 'center'; g.lineJoin = 'round';
          g.font = '700 ' + (z.z ? 18 + k * 10 : 22) + 'px ' + HAND;
          const tx = z.x + z.vx * k * (z.dur / 1000), ty = z.y - k * (z.z ? 50 : 30);
          g.strokeStyle = PAL.paper; g.lineWidth = 5; g.strokeText(z.text, tx, ty); g.fillStyle = PAL.ink; g.fillText(z.text, tx, ty);
        }
        g.globalAlpha = 1;
      }
      const DOODLE = {
        star: (s) => { const pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? s * 0.45 : s; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; },
        heart: (s) => { const pts = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([x * s / 17, y * s / 17]); } return pts; },
        swirl: (s) => { const pts = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * TAU * 1.6, r = s * (0.15 + i / 30 * 0.85); pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; },
        spark: (s) => [[-s, 0], [s, 0], [0, 0], [0, -s], [0, s], [0, 0], [-s * 0.6, -s * 0.6], [s * 0.6, s * 0.6]]
      };
      function drawDoodles(g, now) { // the page decorates itself, drawn stroke by stroke in today's pen
        for (const dd of G.doodles) {
          const k = clamp((now - dd.t0) / dd.dur, 0, 1); if (k <= 0) continue;
          if (!dd.rang && k > 0) { dd.rang = true; SFX.scribble(); }
          const pts = dd.pts || (dd.pts = DOODLE[dd.kind](dd.s)), n = Math.max(2, Math.ceil(pts.length * k));
          g.save(); g.translate(dd.x - L.page.x, dd.y - L.page.y); g.rotate(dd.rot);
          g.beginPath(); for (let i = 0; i < n; i++) (i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]));
          inkLine(g, 3.2);
          g.restore();
        }
      }
      function drawCard(g, now) { // the page saved as a card: a polaroid with your monster, tape and a date, flying into the book
        const c = G.card, k = (now - c.t0) / 1000, p = PAL;
        const lift = eOut(clamp(k / 0.55, 0, 1)), fly = eIO(clamp((k - 2.2) / 0.9, 0, 1)); // a long hover: the frame worth a screenshot
        const ax = lerp(c.x, c.hx, lift), ay = lerp(c.y, c.hy, lift); // it lifts off the page into the middle, then flies into the book
        const x = lerp(ax, c.to.x, fly), y = lerp(ay, c.to.y, fly) - Math.sin(fly * Math.PI) * 60, s = lerp(1 + 0.04 * lift, c.to.s, fly), rot = lerp(-0.05 * lift, 0.04, fly);
        if (fly >= 1 && !c.landed) { c.landed = true; SFX.thump(); if (L.wide) paint(); else { bookChip.lastChild.textContent = String(BOOK.length); bookChip.classList.remove('dm-thump'); void bookChip.offsetWidth; bookChip.classList.add('dm-thump'); } }
        if (c.landed) return;
        const fw = c.w + 20, fh = c.h + 54;
        g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
        g.fillStyle = 'rgba(0,0,0,' + (0.18 + 0.2 * lift) + ')'; g.fillRect(-fw / 2 + 6, -fh / 2 + 10 + lift * 6, fw, fh);
        g.fillStyle = p.dark ? '#2b2d42' : '#ffffff'; g.fillRect(-fw / 2, -fh / 2, fw, fh);
        g.drawImage(c.snap, -c.w / 2, -fh / 2 + 10, c.w, c.h);
        g.fillStyle = p.text; g.font = '700 20px ' + HAND; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.fillText(fitText(g, G.name, fw - 30), 0, fh / 2 - 15);
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.save(); g.rotate(-0.06); g.fillRect(-30, -fh / 2 - 10, 60, 20); g.restore();
        g.restore();
      }

      /* ---------------- start ---------------- */
      const label0 = feelingLabel();
      noteCap.textContent = label0.own ? 'Draw how this feels:' : 'Draw a feeling, like…';
      noteWords.textContent = label0.text;
      sr.textContent = (label0.own ? 'Draw how this feels: ' : 'Draw a feeling, for example: ') + label0.text;
      fitNote();
      (async () => {
        await K.intro({ title: 'Doodle Monster', sub: 'Every feeling has a shape. Draw yours, any scribble, and watch it come alive.', how: 'Draw with your finger. Then look after it: feed it, tickle it, tell it to sit.', char: 'loopie', mood: 'silly' });
        G.step = 'draw'; MU.on = true; MU.mode = 'draw'; chipShow();
        const first = visits >= 1 && CAMEO ? line({ Jolly: 'Shh, ' + CAMEO.n + ' is napping. Draw a new friend!', Cheeky: CAMEO.n + ' is asleep. Draw something louder.', Unfiltered: 'New page. Draw.' })
          : care() ? line({ Jolly: 'A fresh page. Draw how it feels, any shape at all.', Cheeky: 'Fresh page. Any scribble works.', Unfiltered: 'Draw how it feels.' })
            : line({ Jolly: 'Fresh page! Draw how it feels. Scribbles welcome.', Cheeky: 'Draw the feeling. Bonus points for ugly.', Unfiltered: 'Draw how it feels. Any scribble.' });
        talk(loopie, first, { mood: 'happy', ms: 3400 });
        guideDraw(1200);
      })();

      return {
        async autoplay() {
          const card = () => el.querySelector('.gk-intro');
          for (let i = 0; i < 40 && G.step === 'intro'; i++) { await K.wait(150); if (i === 5 && card()) await K.sim.tap(card()); }
          while (G.step === 'intro') await K.wait(120);
          await K.wait(500);
          const pg = () => L.page;
          const stroke = async (pts, ms) => { const q = await K.sim.press(pad, pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { await K.wait(ms || 18); q.move(pts[i][0], pts[i][1]); } await K.wait(30); q.up(pts[pts.length - 1][0], pts[pts.length - 1][1]); await K.wait(160); };
          // a lumpy body, spiky hair, a curly tail and two freckles
          const W = pg().w, Hh = pg().h, cx = W * 0.5, cy = Hh * 0.56, rx = W * 0.27, ry = Hh * 0.15;
          const body = []; for (let i = 0; i <= 46; i++) { const a = -Math.PI / 2 + 0.25 + i / 46 * TAU * 1.04, r = 1 + 0.07 * Math.sin(3 * a) + 0.05 * Math.sin(5 * a + 1); body.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
          await stroke(body, 16);
          const hair = []; for (let i = 0; i <= 8; i++) hair.push([cx - rx * 0.55 + i * rx * 0.14, cy - ry * 0.98 - (i % 2 ? ry * 0.42 : 0)]);
          await stroke(hair, 30);
          const tail = []; for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU * 1.2, r = 4 + i * 1.3; tail.push([cx + rx * 1.02 + i * 1.6 + Math.cos(a) * r * 0.6, cy + ry * 0.35 + Math.sin(a) * r * 0.6]); }
          await stroke(tail, 18);
          await stroke([[cx - rx * 0.45, cy + ry * 0.2], [cx - rx * 0.43, cy + ry * 0.24]], 20);
          await stroke([[cx + rx * 0.45, cy + ry * 0.2], [cx + rx * 0.47, cy + ry * 0.24]], 20);
          for (let i = 0; i < 40 && goBtn.hidden; i++) await K.wait(100);
          await K.wait(400);
          await K.sim.tap(goBtn);
          while (G.step !== 'feed' && !finished) await K.wait(150);
          await K.wait(700);
          for (let tries = 0; tries < 4 && G.step === 'feed'; tries++) {
            while (G.snack && Math.hypot(G.snack.x - G.snack.home.x, G.snack.y - G.snack.home.y) > 12) await K.wait(80);
            if (!G.snack) break;
            const m = mouthPt();
            await K.sim.drag(pad, { x: G.snack.x, y: G.snack.y }, { x: m.x, y: m.y + 4 }, 900, 18);
            await K.wait(700);
          }
          while (G.step !== 'tickle' && !finished) await K.wait(150);
          await K.wait(600);
          for (let round = 0; round < 3 && G.step === 'tickle'; round++) {
            const b = DMX.anchor(G.M, G.M.belly, {});
            const q = await K.sim.press(pad, b.x, b.y);
            for (let i = 0; i < TICKLES + 3 && G.step === 'tickle'; i++) { await K.wait(70); q.move(b.x + (i % 2 ? -1 : 1) * 46, b.y + (i % 3) * 4); }
            q.up(b.x, b.y); await K.wait(500);
          }
          while (G.step !== 'sit' && !finished) await K.wait(150);
          await K.wait(700);
          for (let tries = 0; tries < 3 && G.step === 'sit'; tries++) { await K.sim.hold(sitBtn, SIT_MS + 500); await K.wait(400); }
          while (G.step !== 'hat' && !finished) await K.wait(150);
          await K.wait(800);
          if (G.step === 'hat') {
            const q0 = DMX.anchor(G.M, G.M.hat, {}), hx = q0.x, hy = q0.y - 12;
            await stroke([[hx - 26, hy], [hx - 12, hy - 22], [hx, hy - 46], [hx + 12, hy - 22], [hx + 26, hy], [hx - 26, hy]], 40); // a party hat
            const pom = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU; pom.push([hx + Math.cos(a) * 6, hy - 50 + Math.sin(a) * 6]); }
            await stroke(pom, 20);
            await K.wait(300);
            if (G.step === 'hat' && !hatBtn.hidden) await K.sim.tap(hatBtn);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
