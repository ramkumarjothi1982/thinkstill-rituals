// UNTANGLE — Zuzu, The Spiral.
// For confusion, doubt, indecision, overwhelm and the "too many thoughts" knot.
//
// 1. What's in the knot? — pick the strands that are tangled together; each one
//                          winds into a glowing ball of thread under the dome.
// 2. Pull it apart       — drag strands out of the knot one at a time. The ball
//                          unspools as you pull, loosens, and each freed strand
//                          twangs into its own straight thread.
// 3. Sort the threads    — drag each thread into an orbit ring: "I know this",
//                          "I need to decide" or "I don't know yet".
// 4. First tug           — pick the one thread to pull first and a tiny next
//                          step; then give it an actual tug.
// Finale                 — every thread winds into a neat spiral galaxy and
//                          Zuzu's spirals slow down and brighten.
//
// Rationale (plain): separating a tangle of concerns, noticing which parts are
// already known, unknown or waiting on a choice, and committing to one small
// next step are common, widely taught approaches to feeling stuck. This is
// untangling, not reframing: nothing here questions whether a thought is true.

import { h, wait } from '../app/ui.js';

export const meta = { id: 'untangle' };

const TAU = Math.PI * 2;
const N = 30; // samples per thread shape
const MAX_STRANDS = 6;
const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif';

const CHIPS = [
  ['decision', 'a decision', 'A decision! Slippery things, decisions.'],
  ['said', 'something someone said', 'Ah. The words that keep replaying.'],
  ['todo', 'my to-do list', 'The list. Of course the list is in there.'],
  ['worry', 'a worry', 'A worry, curled up right in the middle.'],
  ['want', 'what I want', 'What you want. Probably squashed at the bottom.'],
  ['others', 'what others want', 'And what everyone else wants. Busy knot!'],
];
const OWN_QUIP = 'Ooh, your own words. Woven right in.';
const COLOURS = ['#ff6ad0', '#39f0ff', '#ffd27a', '#9dff8a', '#ff9a5a', '#b48cff', '#7fb8ff', '#ff8a9a'];

const RINGS = [
  { id: 'know', label: 'I know this', short: 'I know this', col: '#39f0ff',
    say: ['Known. Lovely. Solid ground.', 'Another known one. Look at you, knowing things.'] },
  { id: 'decide', label: 'I need to decide', short: 'I need to decide', col: '#ffd27a',
    say: ['Ooh, a choice-y one. Gold ring for you.', 'Waiting on a decision. Noted, not rushed.'] },
  { id: 'unknown', label: 'I don’t know yet', short: 'I don’t know yet', col: '#c58cff',
    say: ['Not knowing yet is allowed. It can orbit for a bit.', 'Still a mystery. Mysteries orbit beautifully.'] },
];

const STEPS = [
  ['write', 'Write it down', 'Out of your head, onto something. Even three words count.'],
  ['ask', 'Ask one question', 'Just work out the one question. Who or what could answer it can wait.'],
  ['deadline', 'Pick a deadline', 'A “by when” makes a thread easier to hold. Kind deadlines only.'],
  ['sleep', 'Sleep on it', 'Choosing to wait is still choosing. The thread will keep.'],
  ['coin', 'Flip a coin to see how I feel', 'Give each option a side. The coin doesn’t decide; notice how you feel when it lands.'],
];

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion;
  const low = !!ctx.lowStim;
  const realm = () => world.realm;
  let bubbleBelow = false;
  const say = (t, ms) => ctx.say(t, { who: 'Zuzu', ms, above: !bubbleBelow });
  const result = { completed: false, strands: [], sorted: { know: [], decide: [], unknown: [] }, first: null, step: null };

  // --------------------------------------------------- canvas + field --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none' } });
  world.fx.replaceChildren(canvas);
  const g = canvas.getContext('2d');
  const field = h('div', { style: { position: 'fixed', inset: '0', zIndex: '3', pointerEvents: 'none' } });
  document.body.append(field);
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  resize();
  addEventListener('resize', resize);

  // ------------------------------------------------------------ state --
  let phase = 'pick';
  let time = 0;
  const strands = [];                       // the person's threads
  const fuzz = [0, 1, 2].map((i) => ({ seed: seed(100 + i), col: '#cdb8ff' }));
  let fuzzAlpha = 1;
  let freed = 0, total = 0;
  const K = { x: innerWidth / 2, y: innerHeight * 0.4, r: 10 };   // knot (smoothed)
  const RG = { x: innerWidth / 2, y: innerHeight * 0.4, r: 0 };   // rings (smoothed)
  const rot = { x: 0.4, y: 0 };
  let ringAlpha = 0, ringRot = [0, 1.3, 2.6], hoverBand = -1;
  let drag = null;           // knot pulling drag
  let chosen = null;         // thread for the first tug
  let tug = { t: 0, vib: 0, vibT: 0, drag: false, done: false };
  let galaxy = 0, core = 0;
  const motes = [];
  let slotLayout = { top: 0, h: 40 };

  // --------------------------------------------------------- face fx --
  function face(mix, intensity, rig = {}) {
    world.setEmotion(mix, intensity, { quiet: true });
    const t = world.rig?.target;
    if (t) for (const [k, v] of Object.entries(rig)) t[k] = v;
  }

  // --------------------------------------------------------- layout --
  const titleBottom = () => document.querySelector('.ritual-ui .move-title')?.getBoundingClientRect().bottom ?? 140;
  const dockTop = () => (dock.childElementCount ? dock.getBoundingClientRect().top : H - 24);
  function layout(dt) {
    const top = titleBottom() + 8;
    const bot = Math.max(top + 120, dockTop() - 10);
    const ah = bot - top;
    const k = Math.min(1, dt * (rm ? 4 : 6));
    const parked = strands.filter((s) => s.shape === 'slot');
    const n = Math.max(1, phase === 'pull' ? total : parked.length);
    let kx = W / 2, ky = K.y, kr = K.r, gx = W / 2, gy = RG.y, gr = RG.r;
    let sTop = bot, sH = 0;
    if (phase === 'pick') {
      ky = top + ah * 0.5; kr = Math.min(W * 0.23, ah * 0.3, 104);
      gy = ky;
    } else if (phase === 'pull') {
      sH = clamp(ah * 0.44, n * 26, n * 44);
      const kh = ah - sH;
      ky = top + kh * 0.5; kr = Math.min(W * 0.2, kh * 0.3, 92);
      sTop = top + kh; gy = ky;
    } else if (phase === 'sort') {
      sH = parked.length ? clamp(ah * 0.36, parked.length * 26, parked.length * 40) : 0;
      const rh = ah - sH;
      gy = top + rh * 0.5; gr = Math.max(40, Math.min(W * 0.44, rh * 0.5 - 4));
      sTop = top + rh;
    } else if (phase === 'finale') {
      // line up with the realm's own galaxy under the dome
      gy = Math.max(top + 70, H * 0.355); gr = Math.min(W * 0.46, 210);
    } else {
      gy = top + ah * 0.5; gr = Math.max(40, Math.min(W * 0.44, ah * 0.5 - 6));
    }
    kr = Math.max(14, kr); gr = Math.max(0, gr);
    K.x += (kx - K.x) * k; K.y += (ky - K.y) * k; K.r += (kr - K.r) * k;
    K.r = Math.max(4, K.r);
    RG.x += (gx - RG.x) * k; RG.y += (gy - RG.y) * k; RG.r += (gr - RG.r) * k;
    slotLayout = { top: sTop, h: sH ? sH / n : 40 };
    // DOM threads follow their slots
    let i = 0;
    for (const s of [...parked].sort((a, b) => a.order - b.order)) {
      const slotH = Math.min(46, slotLayout.h);
      const y = slotLayout.top + (phase === 'pull' ? s.order : i) * slotLayout.h + slotLayout.h / 2;
      s.slotY = s.slotY == null ? y : s.slotY + (y - s.slotY) * k;
      i++;
      if (s.el) {
        s.el.style.top = `${(s.slotY - slotH / 2).toFixed(1)}px`;
        s.el.style.height = `${slotH.toFixed(1)}px`;
        s.el.style.width = `${W - 32}px`;
      }
    }
  }

  // ---------------------------------------------------------- shapes --
  const ringR = (k) => RG.r * [0.4, 0.7, 1][k];
  function slotPts(s) {
    const r = s.el && s.dragging ? s.el.getBoundingClientRect() : null;
    const y = r ? r.top + r.height / 2 : s.slotY ?? (slotLayout.top + 20);
    const x0 = r ? r.left + 6 : 22, x1 = r ? r.right - 6 : W - 22;
    return line(x0, y, x1, y);
  }
  function ringPts(s) {
    const r = ringR(s.ring);
    const span = s.span || 0.9;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = s.ang - span / 2 + (i / (N - 1)) * span;
      const w = rm ? 0 : Math.sin(time * 2.2 + i * 0.6 + s.order) * 1.2;
      pts.push([RG.x + Math.cos(a) * (r + w), RG.y + Math.sin(a) * (r + w)]);
    }
    return pts;
  }
  function hangGeom() {
    const ax = RG.x, ay = RG.y - RG.r * 0.62;
    const len = RG.r * 1.15;
    const pull = Math.min(70, RG.r * 0.6);
    return { ax, ay, bx: RG.x, by: ay + len + tug.t * pull, rest: ay + len, pull };
  }
  function hangPts() {
    const { ax, ay, bx, by } = hangGeom();
    const pts = [];
    const vib = rm ? tug.vib * 0.3 : tug.vib;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const off = Math.sin(Math.PI * u) * vib * 16 * Math.cos(tug.vibT * 34);
      pts.push([ax + (bx - ax) * u + off, ay + (by - ay) * u]);
    }
    return pts;
  }
  function armPts(s, idx, n) {
    const Rg = RG.r;
    const base = (idx / n) * TAU + galaxySpin;
    const pts = [];
    const tilt = -0.18, ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const r = Rg * (0.06 + 0.94 * Math.pow(u, 0.85));
      const a = base + u * 3.8;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.5;
      pts.push([RG.x + x * ct - y * st, RG.y + x * st + y * ct]);
    }
    return pts;
  }
  let galaxySpin = 0;
  function targetPts(s) {
    if (s.shape === 'slot') return slotPts(s);
    if (s.shape === 'ring') return ringPts(s);
    if (s.shape === 'hang') return hangPts();
    if (s.shape === 'arm') return armPts(s, s.armIdx, s.armN);
    return s.last || line(W / 2 - 50, H / 2, W / 2 + 50, H / 2);
  }
  function morphTo(s, shape, dur = 0.6) {
    s.morph = { from: (s.last || targetPts(s)).map((p) => [...p]), t: 0, dur: rm ? dur * 0.7 : dur };
    s.shape = shape;
  }

  // ----------------------------------------------------- knot geometry --
  function knotPoint(sd, t, R, loose) {
    const phi = sd.phi0 + t * sd.prec;
    const th = sd.th0 + Math.sin(t * 5 + sd.k) * 0.5;
    const nx = Math.sin(th) * Math.cos(phi), ny = Math.sin(th) * Math.sin(phi), nz = Math.cos(th);
    let ux = ny, uy = -nx, uz = 0;
    let ul = Math.hypot(ux, uy);
    if (ul < 1e-3) { ux = 1; uy = 0; ul = 1; }
    ux /= ul; uy /= ul;
    const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
    const a = sd.a0 + t * sd.turns * (1 - loose * 0.35) * TAU;
    const rr = R * (1 + (0.05 + loose * 0.16) * Math.sin(t * 13 + sd.k + time * (rm ? 0.2 : 0.8)));
    const ca = Math.cos(a), sa = Math.sin(a);
    let x = rr * (ca * ux + sa * vx), y = rr * (ca * uy + sa * vy), z = rr * (ca * uz + sa * vz);
    const cy = Math.cos(rot.y), sy = Math.sin(rot.y);
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    const cx = Math.cos(rot.x), sx = Math.sin(rot.x);
    [y, z] = [y * cx - z * sx, y * sx + z * cx];
    return [K.x + x + (drag ? drag.tx : 0), K.y + y + (drag ? drag.ty : 0), z / R];
  }
  const restRadius = () => K.r * 1.32 + 8;
  const pullLen = () => clamp(Math.min(W, H) * 0.3, 90, 170);
  function beadRest(s) {
    const r = restRadius() + (rm ? 0 : Math.sin(time * 1.6 + s.order) * 3);
    return [K.x + Math.cos(s.alpha) * r, K.y + Math.sin(s.alpha) * r];
  }

  // ------------------------------------------------------------- draw --
  function stroke(pts, col, width, alpha) {
    if (pts.length < 2) return;
    g.strokeStyle = col; g.lineWidth = width; g.globalAlpha = alpha;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  function glowStroke(pts, col, width, alpha = 1) {
    g.globalCompositeOperation = 'lighter';
    if (!low) stroke(pts, col, width * 4, 0.1 * alpha);
    stroke(pts, col, width * 2, 0.22 * alpha);
    g.globalCompositeOperation = 'source-over';
    stroke(pts, col, width, alpha);
    stroke(pts, '#ffffff', Math.max(0.8, width * 0.35), 0.55 * alpha);
    g.globalAlpha = 1;
  }
  function bead(x, y, col, r = 7, a = 1) {
    g.globalAlpha = a;
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 3);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 3, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU); g.fill();
    g.globalAlpha = 1;
  }
  function label(text, x, y, col, align = 'center', a = 1, size = 12.5) {
    g.font = `700 ${size}px ${FONT}`;
    const w = g.measureText(text).width + 16, hh = size + 10;
    let lx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    lx = clamp(lx, 6, W - w - 6);
    const ly = y - hh / 2;
    g.globalAlpha = 0.86 * a;
    g.fillStyle = 'rgba(11,3,32,.9)';
    roundRect(g, lx, ly, w, hh, hh / 2); g.fill();
    g.globalAlpha = 0.7 * a; g.strokeStyle = col; g.lineWidth = 1;
    roundRect(g, lx + 0.5, ly + 0.5, w - 1, hh - 1, hh / 2); g.stroke();
    g.globalAlpha = a; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, lx + w / 2, y + 0.5);
    g.globalAlpha = 1;
  }

  function drawKnot(dt) {
    const inKnot = strands.filter((s) => s.shape === 'knot');
    if (!inKnot.length && fuzzAlpha <= 0.01) return;
    const loose = total ? freed / total : 0;
    const R = Math.max(4, K.r * (1 + loose * 0.28));
    // halo
    const glowA = (0.25 + inKnot.length * 0.06) * (inKnot.length ? 1 : fuzzAlpha);
    const hg = g.createRadialGradient(K.x, K.y, R * 0.1, K.x, K.y, R * 2.1);
    hg.addColorStop(0, `rgba(255,120,230,${0.32 * glowA})`); hg.addColorStop(0.5, `rgba(120,80,255,${0.14 * glowA})`); hg.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = hg; g.beginPath(); g.arc(K.x, K.y, R * 2.1, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    // grey fuzz: the tangle before it has names
    for (const f of fuzz) drawWound(f.seed, 1, R * 0.92, loose, f.col, 0.32 * fuzzAlpha, 1.3);
    // the person's strands, back to front by their exit depth
    for (const s of inKnot) {
      s.grow = Math.min(1, (s.grow || 0) + dt * (rm ? 3 : 1.4));
      const w = Math.max(0, (1 - s.p) * s.grow);
      const pts = drawWound(s.seed, w, R, loose, s.col, 1, 2.2);
      const E = pts.length ? pts[pts.length - 1] : [K.x, K.y];
      // bead: rest, dragged, auto-pulled, or springing home
      const [rx, ry] = beadRest(s);
      if (!(drag && drag.s === s) && !s.auto) {
        const kk = Math.min(1, dt * 9);
        s.bx = s.bx == null ? rx : s.bx + (rx - s.bx) * kk;
        s.by = s.by == null ? ry : s.by + (ry - s.by) * kk;
        s.p = Math.max(0, s.p - dt * 2.4);
      }
      const bx = s.bx ?? rx, by = s.by ?? ry;
      const mx = (E[0] + bx) / 2, my = (E[1] + by) / 2;
      const nx = -(by - E[1]), ny = bx - E[0], nl = Math.hypot(nx, ny) || 1;
      const sag = 14 * (1 - s.p);
      const cx = mx + (nx / nl) * sag, cy = my + (ny / nl) * sag;
      const tail = [];
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1), u = 1 - t;
        tail.push([u * u * E[0] + 2 * u * t * cx + t * t * bx, u * u * E[1] + 2 * u * t * cy + t * t * by]);
      }
      s.last = tail;
      glowStroke(tail, s.col, 2.4 + s.p * 0.8, s.grow);
      bead(bx, by, s.col, 7 + s.p * 2, s.grow);
      const c = Math.cos(s.alpha);
      const lx = bx + (c > 0.35 ? 14 : c < -0.35 ? -14 : 0);
      const ly = by + (Math.abs(c) <= 0.35 ? (Math.sin(s.alpha) > 0 ? 22 : -22) : 0);
      label(short(s.label), lx, ly, s.col, c > 0.35 ? 'left' : c < -0.35 ? 'right' : 'center', s.grow);
    }
  }
  function drawWound(sd, w, R, loose, col, alpha, width) {
    const n = Math.max(2, Math.round(110 * w));
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(knotPoint(sd, (i / (n - 1)) * w, R, loose));
    if (w <= 0.001) return [pts[0]];
    g.globalCompositeOperation = 'lighter';
    if (!low) stroke(pts, col, width * 3.2, 0.1 * alpha);
    g.globalCompositeOperation = 'source-over';
    g.lineWidth = width; g.strokeStyle = col; g.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const z = (pts[i][2] + pts[i - 1][2]) / 2;
      g.globalAlpha = alpha * (0.22 + 0.78 * clamp((z + 1) / 2, 0, 1));
      g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    }
    g.globalAlpha = 1;
    return pts;
  }

  function drawRings(dt) {
    if (ringAlpha <= 0.01 || RG.r < 4) return;
    for (let k = 0; k < 3; k++) {
      ringRot[k] += dt * (rm ? 0.02 : [0.16, 0.1, 0.065][k]) * (1 - galaxy);
      const r = ringR(k), R0 = RINGS[k];
      const hot = hoverBand === k;
      g.globalAlpha = ringAlpha * (hot ? 0.95 : 0.42);
      g.strokeStyle = R0.col; g.lineWidth = hot ? 2.5 : 1.4;
      g.setLineDash(k === 2 ? [3, 7] : k === 1 ? [10, 5] : []);
      g.lineDashOffset = -time * (rm ? 0 : 8);
      g.beginPath(); g.arc(RG.x, RG.y, r, 0, TAU); g.stroke();
      g.setLineDash([]);
      if (hot) {
        g.globalAlpha = 0.12 * ringAlpha; g.fillStyle = R0.col;
        const inner = k ? (ringR(k - 1) + r) / 2 : 0, outer = k < 2 ? (ringR(k + 1) + r) / 2 : r + 26;
        g.beginPath(); g.arc(RG.x, RG.y, outer, 0, TAU); g.arc(RG.x, RG.y, inner, 0, TAU, true); g.fill();
      }
      g.globalAlpha = 1;
    }
    if (phase === 'sort') for (let k = 0; k < 3; k++) {
      if (RG.r < 60 && k === 0) continue;
      label(RINGS[k].short, RG.x, RG.y - ringR(k), RINGS[k].col, 'center', ringAlpha, 10.5);
    }
  }
  function placeRingAngles(dt) {
    for (let k = 0; k < 3; k++) {
      const items = strands.filter((s) => s.ring === k && (s.shape === 'ring' || (s.morph && s.shape === 'ring')));
      const n = items.length;
      items.forEach((s, i) => {
        const target = ringRot[k] + (i / Math.max(1, n)) * TAU + k * 0.7 + 0.5;
        if (s.ang == null) s.ang = target;
        s.ang += wrap(target - s.ang) * Math.min(1, dt * 4);
        const spanT = Math.min(k === 0 ? 1.5 : 1.15, (TAU / Math.max(1, n)) * 0.62);
        s.span = s.span == null ? spanT : s.span + (spanT - s.span) * Math.min(1, dt * 4);
      });
    }
  }
  function drawThreads(dt) {
    for (const s of strands) {
      if (s.shape === 'knot') continue;
      const tgt = targetPts(s);
      let pts = tgt;
      if (s.morph) {
        s.morph.t += dt / s.morph.dur;
        const t = Math.min(1, s.morph.t), e = easeInOut(t);
        pts = tgt.map(([x, y], i) => {
          const [fx, fy] = s.morph.from[i] || s.morph.from[s.morph.from.length - 1];
          const u = i / (N - 1);
          const wig = rm ? 0 : Math.sin(u * Math.PI * 3 + t * 9) * 10 * Math.sin(Math.PI * t);
          return [fx + (x - fx) * e, fy + (y - fy) * e + wig];
        });
        if (t >= 1) {
          s.morph = null;
          s.onArrive?.(); s.onArrive = null;
        }
      }
      s.last = pts;
      if (s.shape === 'slot' && !s.morph) continue;  // DOM thread takes over
      const dim = chosen && chosen !== s && phase !== 'finale' ? 0.28 : 1;
      const isChosen = chosen === s;
      const wd = (isChosen ? 3.4 : 2.4) + (s.shape === 'arm' ? 0.4 : 0);
      glowStroke(pts, isChosen && phase === 'finale' ? '#ffd27a' : s.col, wd, dim * (s.fade ?? 1));
      if (s.shape === 'ring' && !s.morph && (phase === 'sort' || phase === 'choose')) {
        const m = pts[Math.floor(N / 2)];
        if (!chosen || isChosen) label(short(s.label, 18), m[0], m[1], s.col, 'center', dim, 11.5);
      }
      if (s.shape === 'hang') {
        const p = pts[pts.length - 1];
        bead(p[0], p[1], s.col, 10 + tug.t * 3);
        label(short(s.label, 22), p[0], p[1] + 30, s.col);
      }
      if (s.shape === 'arm' && isChosen && galaxy > 0.9) {
        const p = pts[pts.length - 1];
        bead(p[0], p[1], '#ffd27a', 6 + Math.sin(time * 2) * (rm ? 0 : 1.2));
      }
    }
  }
  function drawCore(dt) {
    const target = phase === 'finale' ? 1 : (phase === 'sort' || phase === 'choose' || phase === 'tug') ? 0.25 + 0.5 * (placedCount() / Math.max(1, total)) : 0;
    core += (target - core) * Math.min(1, dt * 2);
    if (core < 0.02) return;
    const r = 10 + core * 26;
    const gr = g.createRadialGradient(RG.x, RG.y, 0, RG.x, RG.y, r * 2.4);
    gr.addColorStop(0, `rgba(255,248,220,${0.85 * core})`); gr.addColorStop(0.3, `rgba(255,210,122,${0.4 * core})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = gr; g.beginPath(); g.arc(RG.x, RG.y, r * 2.4, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  function drawMotes(dt) {
    for (const m of motes) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.96; m.vy *= 0.96; }
    for (let i = motes.length - 1; i >= 0; i--) if (motes[i].age > motes[i].life) motes.splice(i, 1);
    g.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      g.globalAlpha = (1 - m.age / m.life) * 0.9;
      g.fillStyle = m.col; g.beginPath(); g.arc(m.x, m.y, m.s, 0, TAU); g.fill();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  function sparkle(x, y, col, n = 10) {
    if (rm || low) n = Math.min(3, n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = 30 + Math.random() * 110;
      motes.push({ x, y, vx: Math.cos(a) * v - Math.sin(a) * v * 0.6, vy: Math.sin(a) * v + Math.cos(a) * v * 0.6, age: 0, life: 0.6 + Math.random() * 0.7, s: 1.2 + Math.random() * 2.2, col });
    }
  }
  const placedCount = () => strands.filter((s) => s.ring != null).length;

  let raf = 0, last = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    time += dt;
    const loose = total ? freed / total : 0;
    rot.y += dt * (rm ? 0.12 : 0.55) * (1 - loose * 0.5) + (drag ? dt * drag.s.p * 1.6 : 0);
    rot.x = 0.45 + Math.sin(time * 0.31) * (rm ? 0.05 : 0.25);
    if (phase !== 'pick' && phase !== 'pull') fuzzAlpha = Math.max(0, fuzzAlpha - dt * 1.5);
    const ringTarget = phase === 'sort' || phase === 'choose' ? 1 : phase === 'tug' ? 0.45 : phase === 'finale' ? Math.max(0, 0.45 - galaxy) : 0;
    ringAlpha += (ringTarget - ringAlpha) * Math.min(1, dt * 3);
    if (phase === 'finale') { galaxySpin += dt * (rm ? 0.04 : 0.22); }
    if (tug.vib > 0) { tug.vibT += dt; tug.vib = Math.max(0, tug.vib - dt * 0.9); }
    // auto-pull (button alternative)
    for (const s of strands) if (s.auto) stepAuto(s, dt);
    layout(dt);
    placeRingAngles(dt);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round';
    drawRings(dt);
    drawCore(dt);
    drawKnot(dt);
    drawThreads(dt);
    drawMotes(dt);
  };
  raf = requestAnimationFrame(loop);

  let humSound = null;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
    field.remove();
    humSound?.stop(); humSound = null;
  };
  signal.addEventListener('abort', cleanup);
  const until = (setup) => new Promise((resolve) => {
    if (signal.aborted) { resolve(null); return; }
    const onAbort = () => resolve(null);
    signal.addEventListener('abort', onAbort, { once: true });
    setup((v) => { signal.removeEventListener('abort', onAbort); resolve(v); });
  });
  const pause = (ms) => (signal.aborted ? Promise.resolve() : wait(ms));

  // ---------------------------------------------------- canvas pointer --
  let pointerMode = null;   // 'pull' | 'choose' | 'tug'
  function onDown(e) {
    const x = e.clientX, y = e.clientY;
    if (pointerMode === 'pull') {
      const cands = strands.filter((s) => s.shape === 'knot' && !s.auto);
      if (!cands.length) return;
      let best = null, bd = Infinity;
      for (const s of cands) { const d = Math.hypot((s.bx ?? 0) - x, (s.by ?? 0) - y); if (d < bd) { bd = d; best = s; } }
      const nearKnot = Math.hypot(x - K.x, y - K.y) < restRadius() + 30;
      if (bd > 46 && !nearKnot) return;
      if (bd > 46) {  // grabbed the ball itself: take the strand on that side
        const a = Math.atan2(y - K.y, x - K.x);
        best = cands.reduce((b, s) => (Math.abs(wrap(s.alpha - a)) < Math.abs(wrap(b.alpha - a)) ? s : b), cands[0]);
      }
      drag = { s: best, id: e.pointerId, tick: 0, tx: 0, ty: 0 };
      canvas.setPointerCapture?.(e.pointerId);
      humSound = audio.hold?.('hum', { intensity: 0.1 }) || null;
      haptic('light');
      world.rig?.lookAt?.((x / W) * 2 - 1, (y / H) * 2 - 1);
      onMove(e);
    } else if (pointerMode === 'choose') {
      let best = null, bd = 30;
      for (const s of strands) {
        if (s.shape !== 'ring' || !s.last) continue;
        for (const [px, py] of s.last) { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = s; } }
      }
      if (best) chooseThread(best);
    } else if (pointerMode === 'tug') {
      const { bx, by } = hangGeom();
      if (Math.hypot(bx - x, by - y) > 60 || tug.done) return;
      tug.drag = { y0: y, id: e.pointerId, tick: 0 };
      canvas.setPointerCapture?.(e.pointerId);
      humSound = audio.hold?.('hum', { intensity: 0.1 }) || null;
      haptic('light');
    }
  }
  function onMove(e) {
    if (pointerMode === 'pull' && drag && e.pointerId === drag.id) {
      const s = drag.s;
      s.bx = e.clientX; s.by = e.clientY;
      const d = Math.hypot(s.bx - K.x, s.by - K.y);
      s.p = clamp((d - restRadius() * 0.85) / pullLen(), 0, 1);
      const a = Math.atan2(s.by - K.y, s.bx - K.x);
      drag.tx = Math.cos(a) * s.p * (rm ? 2 : 7); drag.ty = Math.sin(a) * s.p * (rm ? 2 : 7);
      humSound?.update?.({ intensity: 0.15 + s.p * 0.6, pitch: 1 + s.p * 0.5 });
      const step = Math.floor(s.p * 8);
      if (step > drag.tick) { drag.tick = step; audio.fx?.('rotate-tick', { intensity: 0.3, pitch: 1 + step * 0.08 }); haptic('tick'); }
      if (s.p >= 1) { const ss = s; endDrag(); free(ss); }
    } else if (pointerMode === 'tug' && tug.drag && e.pointerId === tug.drag.id) {
      const { pull } = hangGeom();
      tug.t = clamp((e.clientY - tug.drag.y0) / pull, 0, 1);
      humSound?.update?.({ intensity: 0.15 + tug.t * 0.6, pitch: 1 + tug.t * 0.7 });
      const step = Math.floor(tug.t * 6);
      if (step > tug.drag.tick) { tug.drag.tick = step; audio.fx?.('rotate-tick', { intensity: 0.35, pitch: 1.1 + step * 0.1 }); haptic('tick'); }
      if (tug.t >= 1) twang();
    }
  }
  function onUp(e) {
    if (pointerMode === 'pull' && drag && e.pointerId === drag.id) endDrag();
    if (pointerMode === 'tug' && tug.drag && e.pointerId === tug.drag.id) {
      tug.drag = null; humSound?.stop(); humSound = null;
      if (!tug.done) { springBack(); }
    }
  }
  function endDrag() {
    if (!drag) return;
    if (drag.s.p < 1 && drag.s.p > 0.25) { audio.fx?.('rotate-tick', { intensity: 0.2, pitch: 0.8 }); if (!rm) world.react('flick'); }
    drag = null; humSound?.stop(); humSound = null;
    world.rig?.lookAt?.(null);
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  // ============================================ 1. WHAT'S IN THE KNOT ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'What’s in the knot?', prompt: 'Pick two or more strands that are tangled up.' });
  world.place({ x: 84, y: 29, scale: 0.3 });
  bubbleBelow = true;
  const startI = clamp(ctx.input.intensity || 0.6, 0.4, 0.85);
  face({ curious: 0.7, confused: 0.3 }, startI, { spin: 0.7, spinJitter: 0.35 });
  realm()?.setMood?.({ agitation: 0.45, clarity: 0.1, heaviness: 0.2, warmth: 0.2 });
  realm()?.transform?.(0.05);
  say('Ooh. A knot. What’s tangled up in there?', 2800);

  const knotAdd = (id, text, own) => {
    const used = new Set(strands.map((s) => s.col));
    const col = COLOURS.find((c) => !used.has(c)) || COLOURS[strands.length % COLOURS.length];
    const s = { id, label: text, own, col, seed: seed(strands.length * 7 + id.length * 13 + text.length), p: 0, grow: 0, shape: 'knot', alpha: -Math.PI / 2, order: strands.length };
    strands.push(s);
    reAngle();
    const n = strands.length;
    face({ confused: Math.min(0.85, 0.3 + n * 0.12), curious: Math.max(0.15, 0.7 - n * 0.1) }, startI, { spin: 0.7 + n * 0.12, spinJitter: Math.min(1.3, 0.35 + n * 0.17) });
    realm()?.setMood?.({ agitation: Math.min(0.85, 0.45 + n * 0.07), clarity: 0.1 });
    realm()?.pulse?.('tap', { x: K.x, y: K.y });
    audio.fx?.('drop-in', { intensity: 0.5, pitch: 0.9 + n * 0.06 });
    haptic('soft');
    if (!rm) world.react(n % 2 ? 'flick' : 'tap');
    sparkle(K.x, K.y, col, 8);
  };
  const knotRemove = (id) => {
    const i = strands.findIndex((s) => s.id === id);
    if (i >= 0) strands.splice(i, 1);
    strands.forEach((s, k) => { s.order = k; });
    reAngle();
    audio.fx?.('rotate-tick', { intensity: 0.3, pitch: 0.8 });
    haptic('light');
  };
  function reAngle() {
    const n = strands.length;
    strands.forEach((s, i) => { s.alpha = -Math.PI / 2 + 0.35 + (i / Math.max(1, n)) * TAU; });
  }

  // short screens: one scrolling row of strands so the knot keeps its room
  const tight = H < 700;
  const chipWrap = h('div', { class: tight ? 'fam-chips' : '', role: 'group', 'aria-label': 'Strands in the knot',
    style: tight ? { display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 0', margin: '0 calc(-1 * var(--gutter, 16px))', paddingInline: 'var(--gutter, 16px)' }
      : { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' } });
  const pickBtn = h('button', { class: 'btn primary block', disabled: true }, 'That’s the knot');
  const ownInput = h('input', { class: 'text', type: 'text', maxlength: '32', placeholder: 'Or add your own strand…', 'aria-label': 'Add a strand in your own words', style: { flex: '1', minWidth: '0' } });
  const ownBtn = h('button', { class: 'btn', style: { minHeight: '48px', padding: '0 16px', flex: '0 0 auto' }, 'aria-label': 'Add your own strand' }, 'Add');
  const chipEls = new Map();
  const syncChips = () => {
    const full = strands.length >= MAX_STRANDS;
    for (const [id, el] of chipEls) el.disabled = full && el.getAttribute('aria-pressed') !== 'true';
    ownBtn.disabled = full; ownInput.disabled = full; ownChip.disabled = full;
    pickBtn.disabled = strands.length < 2;
    pickBtn.textContent = strands.length < 2 ? 'Pick at least two' : 'That’s the knot';
  };
  for (const [id, text, quip] of CHIPS) {
    const el = h('button', { class: 'chip', 'aria-pressed': 'false', style: { minHeight: '44px' } }, text);
    el.onclick = () => {
      const on = el.getAttribute('aria-pressed') !== 'true';
      if (on && strands.length >= MAX_STRANDS) return;
      el.setAttribute('aria-pressed', String(on));
      if (on) { knotAdd(id, text, false); say(quip, 2200); } else knotRemove(id);
      syncChips();
    };
    chipEls.set(id, el);
    chipWrap.append(el);
  }
  let ownCount = 0;
  const addOwn = () => {
    const v = ownInput.value.replace(/\s+/g, ' ').trim();
    if (!v || strands.length >= MAX_STRANDS) return;
    ownCount++;
    const id = `own-${ownCount}`;
    knotAdd(id, v, true);
    const el = h('button', { class: 'chip', 'aria-pressed': 'true', 'aria-label': `${v}. Your own strand. Press to remove.` }, v);
    el.onclick = () => { knotRemove(id); el.remove(); chipEls.delete(id); syncChips(); };
    chipEls.set(id, el);
    chipWrap.insertBefore(el, ownChip);
    ownInput.value = '';
    say(OWN_QUIP, 2200);
    syncChips();
  };
  ownBtn.onclick = addOwn;
  ownInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } });
  const ownRow = h('div', { style: { display: 'none', gap: '8px' } }, ownInput, ownBtn);
  const ownChip = h('button', { class: 'chip', 'aria-expanded': 'false', style: { minHeight: '44px', borderStyle: 'dashed' } }, '+ in my own words');
  ownChip.onclick = () => {
    const open = ownRow.style.display === 'none';
    ownRow.style.display = open ? 'flex' : 'none';
    ownChip.setAttribute('aria-expanded', String(open));
    if (open) ownInput.focus();
    audio.ui?.('tap');
  };
  chipWrap.append(ownChip);
  dock.replaceChildren(chipWrap, ownRow, pickBtn);
  syncChips();
  await until((done) => { pickBtn.onclick = done; });
  if (signal.aborted) return result;
  result.strands = strands.map((s) => s.label);
  total = strands.length;
  strands.forEach((s, i) => { s.order = i; });
  audio.ui?.('select');
  face({ confused: 0.85, curious: 0.15 }, Math.max(0.6, startI), { spin: 1.4, spinJitter: 1.3 });
  if (!rm) world.react('flick');
  await say('Everything’s touching everything. My spirals are going loopy. Let’s give them some room.', 3000);
  if (signal.aborted) return result;

  // ================================================ 2. PULL IT APART ==
  phase = 'pull';
  pointerMode = 'pull';
  world.fx.classList.add('live');
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Pull it apart', prompt: 'Grab a bead and drag it out. Slowly does it.' });
  world.place({ x: 84, y: 30, scale: 0.3 });
  bubbleBelow = true;
  const autoBtn = h('button', { class: 'btn block', 'aria-label': 'Ease the next strand out of the knot for me' }, 'Ease one out for me');
  const pullHint = h('p', { class: 'muted', style: { textAlign: 'center', margin: '0' }, 'aria-live': 'polite' }, `${total} strands in the knot`);
  dock.replaceChildren(pullHint, autoBtn);

  // freed threads become DOM buttons (visible label + line), used in move 3
  for (const s of strands) {
    s.el = h('button', {
      'aria-label': `${s.label}. Thread. Drag it onto an orbit ring, or press to pick it.`,
      style: { position: 'absolute', left: '16px', top: '0', height: '40px', pointerEvents: 'none', background: 'none', border: '0', padding: '0', margin: '0',
        touchAction: 'none', cursor: 'grab', opacity: '0', transition: 'opacity 220ms', textAlign: 'left', display: 'block', color: '#fff' },
    },
    h('i', { 'aria-hidden': 'true', style: { position: 'absolute', left: '6px', right: '6px', top: '50%', height: '3px', marginTop: '-1.5px', borderRadius: '3px',
      background: `linear-gradient(90deg, ${s.col}00, ${s.col} 6%, ${s.col} 94%, ${s.col}00)`, boxShadow: `0 0 10px ${s.col}, 0 0 2px #fff` } }),
    h('span', { style: { position: 'relative', display: 'inline-block', marginLeft: '18px', padding: '3px 11px', borderRadius: '999px', background: 'rgba(11,3,32,.88)',
      border: `1px solid ${s.col}aa`, font: `700 13px/1.25 ${FONT}`, maxWidth: 'calc(100% - 40px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' } }, s.label));
    field.append(s.el);
  }

  function free(s) {
    if (s.shape !== 'knot') return;
    s.auto = null;
    freed++;
    s.order = freed - 1;
    s.slotY = null;
    morphTo(s, 'slot', 0.65);
    s.onArrive = () => { s.el.style.opacity = '1'; };
    const [bx, by] = [s.bx ?? K.x, s.by ?? K.y];
    audio.fx?.('separate', { intensity: 0.7, pitch: 0.9 + freed * 0.07 });
    haptic('pop');
    realm()?.pulse?.('tap', { x: bx, y: by });
    sparkle(bx, by, s.col, 12);
    const frac = freed / total;
    face({ confused: Math.max(0.1, 0.85 * (1 - frac)), curious: 0.15 + 0.5 * frac, happy: 0.35 * frac }, 0.65, { spin: 1.4 - frac * 0.7, spinJitter: Math.max(0.15, 1.3 * (1 - frac)) });
    if (!rm) world.react('tap');
    realm()?.setMood?.({ agitation: Math.max(0.15, 0.8 * (1 - frac)), clarity: 0.1 + frac * 0.35 });
    realm()?.transform?.(0.08 + frac * 0.3);
    pullHint.textContent = freed >= total ? 'All untangled' : `${total - freed} left in the knot`;
    if (freed === 1) say('One thread, all by itself. Look how straight it is!', 2400);
    else if (freed === Math.ceil(total / 2) && total > 2) say('Ooh, feel that? The knot’s going slack.', 2400);
    if (freed >= total) pullDone?.();
  }
  function stepAuto(s, dt) {
    const a = s.auto;
    a.t += dt / (rm ? 0.7 : 1.1);
    const e = easeInOut(Math.min(1, a.t));
    const r = restRadius() + e * (pullLen() + 20);
    s.bx = K.x + Math.cos(s.alpha) * r; s.by = K.y + Math.sin(s.alpha) * r;
    s.p = clamp(e * 1.08, 0, 1);
    const step = Math.floor(s.p * 8);
    if (step > a.tick) { a.tick = step; audio.fx?.('rotate-tick', { intensity: 0.25, pitch: 1 + step * 0.08 }); haptic('tick'); }
    if (s.p >= 1) { s.auto = null; free(s); }
  }
  let pullDone = null;
  autoBtn.onclick = () => {
    const s = strands.find((x) => x.shape === 'knot' && !x.auto && !(drag && drag.s === x));
    if (s) { s.auto = { t: 0, tick: 0 }; audio.ui?.('tap'); }
  };
  await until((done) => { pullDone = done; });
  if (signal.aborted) return result;
  pointerMode = null;
  world.fx.classList.remove('live');
  autoBtn.disabled = true;
  await pause(700);
  if (signal.aborted) return result;
  world.react(rm ? 'nod' : 'doubleTap');
  audio.fx?.('chime', { intensity: 0.6 });
  face({ happy: 0.5, curious: 0.5 }, 0.65, { spin: 0.8, spinJitter: 0.2 });
  await say('Ta-da. No knot. Just threads, each one on its own.', 2600);
  if (signal.aborted) return result;

  // ============================================= 3. SORT THE THREADS ==
  phase = 'sort';
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Sort the threads', prompt: 'Drag each thread onto a ring.' });
  world.place({ x: 86, y: 24, scale: 0.26 });
  face({ curious: 0.6, calm: 0.2, happy: 0.2 }, 0.6, { spin: 0.7, spinJitter: 0.15 });
  realm()?.setMood?.({ agitation: 0.2, clarity: 0.45 });
  const sortQ = h('p', { class: 'muted', style: { textAlign: 'center', margin: '0', minHeight: '20px' }, 'aria-live': 'polite' });
  const ringBtns = RINGS.map((R0, k) => h('button', { class: 'btn', style: { minHeight: '48px', fontSize: '13.5px', lineHeight: '1.15', padding: '0 6px', borderColor: R0.col, gap: '6px' },
    onclick: () => { const s = current(); if (s) placeOnRing(s, k); } },
  h('span', { 'aria-hidden': 'true', style: { width: '9px', height: '9px', borderRadius: '50%', flex: '0 0 auto', background: R0.col, boxShadow: `0 0 8px ${R0.col}` } }), R0.label));
  dock.replaceChildren(sortQ, h('div', { class: 'row-btns', style: { gap: '6px' } }, ...ringBtns));
  let picked = null;
  const parkedList = () => strands.filter((s) => s.shape === 'slot' && !s.morph).sort((a, b) => a.order - b.order);
  const current = () => (picked && picked.shape === 'slot' ? picked : parkedList()[0]) || null;
  const refreshSort = () => {
    const c = current();
    for (const s of strands) if (s.el && s.shape === 'slot') {
      s.el.style.opacity = s === c ? '1' : '0.62';
      s.el.style.filter = s === c ? 'drop-shadow(0 0 6px rgba(255,255,255,.35))' : 'none';
    }
    sortQ.textContent = c ? `Where does “${short(c.label, 26)}” go?` : 'All sorted.';
    ringBtns.forEach((b) => { b.disabled = !c; });
  };
  let sortDone = null, placedN = 0;
  function bandAt(x, y) {
    const d = Math.hypot(x - RG.x, y - RG.y);
    if (d < (ringR(0) + ringR(1)) / 2) return 0;
    if (d < (ringR(1) + ringR(2)) / 2) return 1;
    if (d < ringR(2) + 34) return 2;
    return -1;
  }
  function placeOnRing(s, k) {
    if (s.shape !== 'slot') return;
    const r = s.el.getBoundingClientRect();
    s.last = line(r.left + 6, r.top + r.height / 2, r.right - 6, r.top + r.height / 2);
    s.el.style.opacity = '0'; s.el.style.pointerEvents = 'none'; s.el.style.transform = ''; s.el.tabIndex = -1;
    s.dragging = false;
    s.ring = k; s.ang = null; s.span = null;
    morphTo(s, 'ring', 0.7);
    result.sorted[RINGS[k].id].push(s.label);
    placedN++;
    if (picked === s) picked = null;
    const mx = (r.left + r.right) / 2, my = r.top + r.height / 2;
    audio.fx?.('sort', { intensity: 0.6, pitch: [1.15, 1, 0.88][k] });
    haptic('soft');
    realm()?.pulse?.('ripple', { x: RG.x, y: RG.y });
    sparkle(mx, my, RINGS[k].col, 8);
    world.react('nod');
    const frac = placedN / total;
    realm()?.transform?.(0.4 + frac * 0.25);
    realm()?.setMood?.({ clarity: 0.45 + frac * 0.25, agitation: Math.max(0.05, 0.2 - frac * 0.15) });
    const lines = RINGS[k].say;
    s.onArrive = () => { audio.fx?.('drop-in', { intensity: 0.4, pitch: [1.2, 1, 0.85][k] }); };
    if (placedN < total) say(lines[(result.sorted[RINGS[k].id].length - 1) % lines.length], 2000);
    refreshSort();
    hoverBand = -1;
    if (placedN >= total) setTimeout(() => sortDone?.(), 900);
  }
  // drag + keyboard on each DOM thread
  for (const s of strands) {
    const el = s.el;
    el.style.pointerEvents = 'auto';
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      if (phase !== 'sort' || s.shape !== 'slot') return;
      start = { x: e.clientX, y: e.clientY, moved: false };
      el.setPointerCapture?.(e.pointerId);
      el.style.transition = 'opacity 220ms';
      picked = s; refreshSort();
      haptic('light');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) > 6) { start.moved = true; s.dragging = true; el.style.cursor = 'grabbing'; }
      if (!start.moved) return;
      // shrink towards the pointer so the thread lands where the finger is
      el.style.transform = `translate(${dx}px, ${dy}px) scale(.55)`;
      el.style.transformOrigin = `${start.x - 16}px 50%`;
      const b = bandAt(e.clientX, e.clientY);
      if (b !== hoverBand) { hoverBand = b; if (b >= 0) { audio.fx?.('rotate-tick', { intensity: 0.2, pitch: [1.2, 1, 0.85][b] }); haptic('tick'); } }
    });
    const end = (e) => {
      if (!start) return;
      const moved = start.moved; start = null;
      el.style.cursor = 'grab';
      const b = moved ? bandAt(e.clientX, e.clientY) : -1;
      if (b >= 0) { placeOnRing(s, b); return; }
      s.dragging = false; hoverBand = -1;
      el.style.transition = 'opacity 220ms, transform 320ms cubic-bezier(.2,1.4,.4,1)';
      el.style.transform = '';
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', (e) => {
      if (phase !== 'sort') return;
      const k = { 1: 0, 2: 1, 3: 2 }[e.key];
      if (k != null) { e.preventDefault(); placeOnRing(s, k); }
    });
    el.addEventListener('click', () => { if (phase === 'sort' && s.shape === 'slot') { picked = s; refreshSort(); } });
  }
  refreshSort();
  say('Some bits you already know. Some you don’t yet. Some are waiting for you to choose.', 3200);
  await until((done) => { sortDone = done; });
  if (signal.aborted) return result;
  for (const s of strands) s.el?.remove();
  face({ happy: 0.5, curious: 0.3, calm: 0.2 }, 0.6, { spin: 0.55, spinJitter: 0.08 });
  audio.fx?.('chime', { intensity: 0.55, pitch: 1.1 });

  // ===================================================== 4. FIRST TUG ==
  phase = 'choose';
  pointerMode = 'choose';
  world.fx.classList.add('live');
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'First tug', prompt: 'Which thread gets pulled first? Just one.' });
  world.place({ x: 86, y: 24, scale: 0.26 });
  const chooseChips = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' } });
  const chipFor = new Map();
  for (const s of strands) {
    const el = h('button', { class: 'chip', 'aria-pressed': 'false', style: { minHeight: '44px' } },
      h('span', { class: 'hue', style: { background: s.col, boxShadow: `0 0 8px ${s.col}` } }), short(s.label, 28));
    el.setAttribute('aria-label', `${s.label}, on the “${RINGS[s.ring].label}” ring`);
    el.onclick = () => chooseThread(s);
    chipFor.set(s, el);
    chooseChips.append(el);
  }
  const chooseHint = h('p', { class: 'muted', style: { textAlign: 'center', margin: '0' } }, 'Tap a thread in orbit, or pick one here.');
  dock.replaceChildren(chooseHint, chooseChips);
  if (result.sorted.decide.length) say('Psst. Gold-ring threads are waiting on a choice. Good tuggers. Your call though!', 3200);
  else say('Any thread will do. Which one’s tugging at you most?', 2800);

  let chooseDone = null;
  function chooseThread(s) {
    if (phase !== 'choose') return;
    chosen = s;
    for (const [t, el] of chipFor) el.setAttribute('aria-pressed', String(t === s));
    audio.fx?.('star', { intensity: 0.55 });
    haptic('light');
    const m = s.last?.[Math.floor(N / 2)];
    if (m) { realm()?.pulse?.('tap', { x: m[0], y: m[1] }); sparkle(m[0], m[1], s.col, 8); world.rig?.lookAt?.((m[0] / W) * 2 - 1, (m[1] / H) * 2 - 1); }
    face({ determined: 0.45, curious: 0.35, hopeful: 0.2 }, 0.6, { spin: 0.5, spinJitter: 0.05, spiralHue: 0.4 });
    world.react('nod');
    chooseDone?.();
  }
  await until((done) => { chooseDone = done; });
  if (signal.aborted) return result;
  chooseDone = null;

  // ---- tiny next step (thread can still be changed by tapping another)
  const compact = H < 720;
  const cls = compact ? 'chip' : 'choice';
  const grid = h('div', { class: compact ? '' : 'choice-grid', style: compact ? { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' } : {} });
  const detail = h('div', { 'aria-live': 'polite' });
  const readyBtn = h('button', { class: 'btn primary block', disabled: true }, 'Ready to tug');
  const setHead = () => { setMove(3, { eyebrow: 'Move 4 of 4', title: 'First tug', prompt: `A tiny next step for “${short(chosen.label, 26)}”?` }); };
  setHead();
  for (const [id, text, note] of STEPS) {
    const b = h('button', { class: cls, 'aria-pressed': 'false', style: compact ? { minHeight: '44px' } : {} }, text);
    if (id === 'coin' && !compact) b.style.gridColumn = '1 / -1';
    b.onclick = () => {
      grid.querySelectorAll(`.${cls}`).forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      result.step = id;
      audio.ui?.('select'); haptic('light');
      readyBtn.disabled = false;
      const kids = [h('p', { class: 'muted', style: { margin: '0', fontSize: compact ? '13px' : '' } }, note)];
      if (id === 'coin') kids.push(coinToy(compact));
      detail.replaceChildren(...kids);
    };
    grid.append(b);
  }
  // re-choosing a thread on the canvas still works during this step
  chooseDone = () => { setHead(); };
  dock.replaceChildren(grid, detail, readyBtn);
  await until((done) => { readyBtn.onclick = done; });
  if (signal.aborted) return result;
  chooseDone = null;
  result.first = chosen.label;

  // ---- the tug itself
  phase = 'tug';
  pointerMode = 'tug';
  world.rig?.lookAt?.(null);
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'Give it a tug', prompt: 'Pull the bead down until it twangs.' });
  world.place({ x: 85, y: 26, scale: 0.28 });
  morphTo(chosen, 'hang', 0.8);
  const tugBtn = h('button', { class: 'btn primary block', 'aria-label': `Tug the thread: ${chosen.label}` }, 'Tug it for me');
  dock.replaceChildren(h('p', { class: 'muted', style: { textAlign: 'center', margin: '0' } }, `${short(chosen.label, 26)} → ${decap(STEPS.find(([i]) => i === result.step)[1])}`), tugBtn);
  let tugDone = null;
  function springBack() {
    const from = tug.t;
    if (from <= 0) return;
    tug.vib = Math.max(tug.vib, from * 0.4); tug.vibT = 0;
    const t0 = performance.now();
    const back = () => { const k = Math.min(1, (performance.now() - t0) / 260); tug.t = from * (1 - k); if (k < 1 && !tug.drag && !tug.done) requestAnimationFrame(back); };
    requestAnimationFrame(back);
  }
  function twang() {
    if (tug.done) return;
    tug.done = true; tug.drag = null;
    humSound?.stop(); humSound = null;
    tug.t = 0; tug.vib = 1; tug.vibT = 0;
    audio.fx?.('snap', { intensity: 0.7 });
    setTimeout(() => audio.fx?.('chime', { intensity: 0.7, pitch: 1.25 }), 140);
    haptic('success');
    const { bx, by } = hangGeom();
    realm()?.pulse?.('success', { x: bx, y: by });
    sparkle(bx, by, '#ffd27a', 16);
    world.react('gasp');
    realm()?.transform?.(0.8);
    realm()?.setMood?.({ clarity: 0.8, agitation: 0.02, warmth: 0.5 });
    tugBtn.disabled = true;
    tugDone?.();
  }
  tugBtn.onclick = () => {
    if (tug.done || tug.drag) return;
    const t0 = performance.now(), dur = rm ? 450 : 750;
    let tick = 0;
    const step = () => {
      if (signal.aborted || tug.done) return;
      const k = Math.min(1, (performance.now() - t0) / dur);
      tug.t = easeInOut(k);
      const s = Math.floor(tug.t * 6);
      if (s > tick) { tick = s; audio.fx?.('rotate-tick', { intensity: 0.3, pitch: 1.1 + s * 0.1 }); haptic('tick'); }
      if (k >= 1) twang(); else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  await until((done) => { tugDone = done; });
  if (signal.aborted) return result;
  pointerMode = null;
  world.fx.classList.remove('live');
  face({ happy: 0.6, proud: 0.2, curious: 0.2 }, 0.65, { spin: 0.6, spinJitter: 0, spiralHue: 0.7 });
  await say('Boing! Felt that. One thread, moving.', 2200);
  if (signal.aborted) return result;

  // ======================================================== FINALE ==
  phase = 'finale';
  dock.replaceChildren();
  setMove(4, { eyebrow: 'The Spiral Observatory', title: 'Untangled', prompt: 'Same threads. Much better arrangement.' });
  world.place({ x: 50, y: 80, scale: 0.5 });
  bubbleBelow = false;
  const order = [chosen, ...strands.filter((s) => s !== chosen)];
  order.forEach((s, i) => { s.armIdx = i; s.armN = order.length; morphTo(s, 'arm', rm ? 1.2 : 1.9); });
  const gT0 = performance.now();
  const growG = () => { galaxy = Math.min(1, (performance.now() - gT0) / 1900); if (galaxy < 1 && !signal.aborted) requestAnimationFrame(growG); };
  requestAnimationFrame(growG);
  audio.fx?.('bloom', { intensity: 0.8 });
  realm()?.transform?.(1);
  realm()?.setMood?.({ clarity: 1, agitation: 0, heaviness: 0, warmth: 0.6 });
  await pause(1300);
  if (signal.aborted) return result;
  realm()?.pulse?.('clear', { x: RG.x, y: RG.y });
  for (const s of strands) { const p = s.last?.[N - 1]; if (p) sparkle(p[0], p[1], s === chosen ? '#ffd27a' : s.col, 8); }
  audio.fx?.('clear', { intensity: 0.85 });
  haptic('success');
  face({ happy: 0.55, calm: 0.45 }, 0.75, { spin: 0.2, spinJitter: 0, spiralHue: 1, glow: 1.1 });
  world.react('celebrate');
  await say('Look! Same threads… but now it’s a galaxy.', 2600);
  if (signal.aborted) return result;
  // the celebrate spin settles: spirals slow and brighten (clarity)
  face({ calm: 0.6, happy: 0.4 }, 0.7, { spin: 0.1, spinJitter: 0, spiralHue: 1, glow: 1.2, sparkle: 1.7 });
  await say('Spirals slowing… slowing… there. Ooh, that’s clear.', 2800);
  if (signal.aborted) return result;
  await pause(500);
  if (signal.aborted) return result;
  cleanup();

  const stepLabel = STEPS.find(([id]) => id === result.step)?.[1] || '—';
  result.completed = true;
  result.summary = [
    { label: 'In the knot', text: cap(listJoin(result.strands)) },
    result.sorted.know.length ? { label: 'I know this', text: cap(listJoin(result.sorted.know)) } : null,
    result.sorted.decide.length ? { label: 'I need to decide', text: cap(listJoin(result.sorted.decide)) } : null,
    result.sorted.unknown.length ? { label: 'I don’t know yet', text: cap(listJoin(result.sorted.unknown)) } : null,
    { label: 'First tug', text: `${cap(result.first)}: ${decap(stepLabel)}` },
  ].filter(Boolean);
  result.share = { title: 'Untangled', subtitle: 'Zuzu helped me pull the threads apart.' };
  return result;

  // ------------------------------------------------------- coin toy --
  function coinToy(compact) {
    const coin = h('div', { 'aria-hidden': 'true', style: { width: '44px', height: '44px', borderRadius: '50%', flex: '0 0 auto', display: 'grid', placeItems: 'center',
      background: 'radial-gradient(circle at 35% 30%, #fff3c4, #ffd27a 45%, #c58a2a)', color: '#5a3a08', font: `800 15px ${FONT}`,
      transition: rm ? 'none' : 'transform 700ms cubic-bezier(.3,1.4,.5,1)', boxShadow: '0 0 14px rgba(255,210,122,.55)' } }, '?');
    const out = h('span', { style: { color: 'var(--text-2)', fontSize: compact ? '12.5px' : '14px', lineHeight: '1.3', flex: '1' }, 'aria-live': 'polite' }, 'Heads for one option, tails for the other.');
    let flips = 0;
    const btn = h('button', { class: 'btn', style: { minHeight: '44px', padding: '0 14px', flex: '0 0 auto' } }, 'Flip');
    btn.onclick = () => {
      flips++;
      const heads = Math.random() < 0.5;
      coin.style.transform = `rotateY(${flips * 900}deg)`;
      audio.fx?.('rotate-tick', { intensity: 0.4, pitch: 1.3 });
      haptic('tick');
      setTimeout(() => {
        coin.textContent = heads ? 'H' : 'T';
        out.textContent = `${heads ? 'Heads' : 'Tails'}! Relief, or a tiny “oh no”? That flicker’s the useful bit.`;
        audio.fx?.('star', { intensity: 0.4 });
        result.coin = heads ? 'heads' : 'tails';
      }, rm ? 0 : 520);
      btn.textContent = 'Flip again';
    };
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', perspective: '300px' } }, coin, out, btn);
  }
}

// ---------------------------------------------------------------- utils --
function seed(n) {
  let s = (n * 9301 + 49297) % 233280;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return { phi0: r() * TAU, th0: 0.5 + r() * 2.1, prec: 2.5 + r() * 3.5, a0: r() * TAU, k: r() * 6, turns: 2.4 + r() * 1.1 };
}
function line(x0, y0, x1, y1) {
  const pts = [];
  for (let i = 0; i < N; i++) { const u = i / (N - 1); pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]); }
  return pts;
}
function roundRect(g, x, y, w, hh, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  g.lineTo(x + w, y + hh - r); g.arc(x + w - r, y + hh - r, r, 0, Math.PI / 2);
  g.lineTo(x + r, y + hh); g.arc(x + r, y + hh - r, r, Math.PI / 2, Math.PI);
  g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  g.closePath();
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const short = (s, n = 16) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
function listJoin(a) { return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
function decap(s) { return s ? s[0].toLowerCase() + s.slice(1) : s; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
