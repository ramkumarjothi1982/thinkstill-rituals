// GE-20 · BREATH ARCH — luminous arch gate (self-paced curve).
// A pearl of light rests at the foot of a glowing arch gate. Glide it up,
// over and down the arch at whatever rhythm feels comfortable — there is no
// breath count. The arch follows your pace like soft glass: it swells as the
// pearl climbs, softens as it comes down, leans after a quick hand and
// shivers if you rush. Every stretch of gliding draws its loose echo-arches
// closer; the win is the arch settling into one still shape.
//
// Photos: the main photo stands framed in the doorway (arch-shaped), misted
// and rippling at first, clearing and steadying as the arch settles. The
// others sit in a halo of small arch windows that warm back to their own
// colours as the pearl's light reaches them. Words are written in light
// along the top of the arch, wavering at first, then resting still.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, shadow, canvas, rng, roundRect, FONT } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-20',
  howTo: 'Glide the pearl along the arch at a rhythm that feels comfortable.',
  steps: ['Touch the glowing pearl at the foot of the arch.', 'Glide it up, over and down the arch, at your own pace — no counting.', 'Keep going until the arch stops breathing and rests in one still shape.'],
  tapAlt: 'each press glides the pearl a slow stretch along the arch',
  words: 'Your words are written in light along the top of the arch — wavering at first, then resting still as the arch settles.',
  photos: {
    where: 'Your main photo stands framed in the arch’s doorway; the others sit in small arch windows around it.',
    becomes: 'a doorway picture and a halo of little arch windows',
    touch: 'As you glide the pearl, the arch and its photo breathe with your hand;',
    change: 'the misted doorway photo clears and steadies, and each small window warms back to its own colours as the light reaches it.',
    payoff: 'At the end the arch stands still and the windows glow like quiet lanterns around your photo.',
  },
  finaleSec: 4,
};

const TRAVEL = 3;          // foot-to-foot glides in all (either way) that settle the arch
const CAP = 0.03;          // input that may bank ahead of the world law (progress units)
const N = 96;              // samples along the arch centreline
const U0 = 0.012, U1 = 0.988;
const WN = 6;              // small arch windows in the halo
const STUDS = 21;
const NOTES = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0];   // rises to the keystone and falls again
const TRACK = 0.7;         // letter spacing along the arch (px)

export function create(E) {
  const { g, stage, photos, words } = E;
  const pal = E.pal;
  const reduced = E.reduced, lowStim = E.lowStim, heavy = E.heavy, calm0 = E.calm;
  const loop = E.round > 1;

  // ---- colours: built from the realm palette; heavy feelings get a softer, warmer light
  const soft = (c) => (heavy ? mix(c, '#ffe6d2', 0.26) : c);
  const hueK = loop ? 0.12 + E.rand() * 0.5 : 0.3;
  const LIGHT = mix(soft(mix(pal.glow, '#ffffff', 0.2)), '#eef1ff', calm0 * 0.35);
  const TINT = mix(soft(mix(pal.glow, pal.accent, hueK)), '#dde4ff', calm0 * 0.3);
  const WARM = soft(pal.warm || '#ffb37a');
  const DEEP = mix(pal.deep || '#15123d', '#04031a', 0.5);
  const BODY = mix(DEEP, TINT, 0.22);
  const PEARL = mix(LIGHT, '#ffffff', 0.5);
  const INK = '#fffaf0';
  const TRAIL = [[11, 0.12, TINT], [5, 0.34, LIGHT], [1.8, 0.9, '#ffffff']];

  // ---- geometry (local coords: origin at the floor between the feet, y up = negative)
  let a, bw, Rc, Lg, L, H, span, Ro, winH, cx, footY, railOff, br, fontPx;
  const LOC = new Float32Array((N + 1) * 4);
  const WAVE = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) WAVE[i] = Math.sin((i / N) * Math.PI * 3);
  const SP = new Float32Array((N + 1) * 2), RP = new Float32Array((N + 1) * 2), EP = new Float32Array((N + 1) * 2);
  const CH = new Float32Array(64 * 4);
  const Q = { x: 0, y: 0, nx: 0, ny: 0 }, O = { x: 0, y: 0 };
  let gBack = null, gBand = null, vista = null, txtKey = '';

  function at(s, o) {
    s = clamp(s, 0, L);
    if (s < Lg) { o.x = -Rc; o.y = -s; o.nx = -1; o.ny = 0; }
    else if (s <= Lg + Math.PI * Rc) { const th = Math.PI + (s - Lg) / Rc; o.nx = Math.cos(th); o.ny = Math.sin(th); o.x = o.nx * Rc; o.y = -Lg + o.ny * Rc; }
    else { o.x = Rc; o.y = -Lg + (s - Lg - Math.PI * Rc); o.nx = 1; o.ny = 0; }
    return o;
  }

  // ---- the arch as a soft body: one main shape + loose echo arches
  const mk = () => ({ b: 0, bv: 0, lean: 0, lv: 0, sx: 1, sy: 1, wob: 0 });
  const S = mk(), RS = mk();
  const echoes = [mk(), mk(), mk(), mk()];
  const EK = [15, 8.5, 5, 3.2];

  // ---- pearl + progress state
  let u = loop && E.rand() < 0.5 ? U1 : U0;
  let dir = u === U0 ? 1 : -1;
  let target = u, trailU = u, vel = 0, pvx = 0, rush = 0, pace = 0, lastBX = null;
  let drag = null, repos = false, glide = false, assistLeft = 0, call = 0;
  let wanted = 0, prog = 0, progD = 0;
  let doneFlag = false, restT = 0, finAt = -1, twistAt = -1, twistKind = E.round % 2, bloomed = false;
  const fretOf = (uu) => clamp(Math.floor(((uu - U0) / (U1 - U0)) * 10), 0, 9);
  let lastFret = fretOf(u), noteT = -9, tickT = -9, waitT = -9, apexT = -9, heroHalf = false, nearSaid = false;
  const footFlash = [0, 0];
  const studs = new Float32Array(STUDS);
  const wob = new Wobble();
  let wobAmp = 0;
  const shPh = E.rand();

  // ---- photos: one hero in the doorway, the rest spread over a halo of six arch windows
  const n = photos.n;
  const hero = n ? (loop ? Math.floor(E.rand() * n) : 0) : -1;
  const slotPh = [-1, -1, -1, -1, -1, -1];
  const m = Math.min(WN, Math.max(0, n - 1));
  const shift = loop ? Math.floor(E.rand() * WN) : 0;
  for (let j = 0; j < m; j++) { const base = m >= WN ? j : Math.floor(((j + 0.5) * WN) / m); slotPh[(base + shift) % WN] = (hero + 1 + j) % n; }
  const wins = slotPh.map((ph, k) => ({
    ph, th: Math.PI + 0.34 + (k * (Math.PI - 0.68)) / (WN - 1) + (loop ? (E.rand() - 0.5) * 0.06 : 0),
    u: 0, thr: 0, rank: 0, warm: 0, waking: false, bob: 0, bv: 0, lift: 0, delay: 0, hopAt: 0, flash: 0,
  }));
  const order = wins.slice().sort((p, q) => (dir > 0 ? p.th - q.th : q.th - p.th));
  order.forEach((w, r) => { w.rank = r; w.thr = 0.08 + r * 0.12; });

  const MN = lowStim ? 8 : reduced ? 10 : 16;
  const motes = Array.from({ length: MN }, () => ({ x: E.rand() * 2 - 1, y: E.rand(), sp: 0.03 + E.rand() * 0.05, ph: E.rand() * TAU, r: 0.6 + E.rand() * 0.8 }));

  function fit() {
    a = Math.max(34, Math.min(stage.w / 3.8, stage.h / 4.3));
    bw = a * 0.3; Rc = a + bw / 2; H = (2 * a) / 0.78; Lg = H - a; L = 2 * Lg + Math.PI * Rc; span = Lg + Rc;
    winH = Math.max(44, a * 0.6); Ro = Rc + bw / 2 + a * 0.12 + winH / 2;
    const above = Lg + Ro + winH / 2 + 8, below = a * 0.4;
    cx = stage.cx;
    footY = Math.min(Math.max(stage.cy + (above - below) / 2, stage.y + above), stage.y + stage.h - below);
    railOff = bw * 0.64; br = clamp(a * 0.125, 9, 15); fontPx = clamp(bw * 0.5, 12, 16);
    for (let i = 0; i <= N; i++) { at((i / N) * L, Q); LOC[i * 4] = Q.x; LOC[i * 4 + 1] = Q.y; LOC[i * 4 + 2] = Q.nx; LOC[i * 4 + 3] = Q.ny; }
    for (const w of wins) w.u = (Lg + (w.th - Math.PI) * Rc) / L;
    const my = footY - span * 0.55;
    gBack = g.createRadialGradient(cx, my, a * 0.3, cx, my, a * 2.4);
    gBack.addColorStop(0, rgba(DEEP, 0.46)); gBack.addColorStop(0.6, rgba(DEEP, 0.26)); gBack.addColorStop(1, rgba(DEEP, 0));
    gBand = g.createLinearGradient(0, footY - span - bw, 0, footY);
    gBand.addColorStop(0, mix(BODY, LIGHT, 0.2)); gBand.addColorStop(0.5, BODY); gBand.addColorStop(1, mix(BODY, DEEP, 0.5));
    vista = null; txtKey = '';
  }
  fit();
  E.onResize(fit);

  // local → screen through the arch's current breath (scale about the floor + a soft lean)
  function xf(lx, ly, St, o) { o.x = cx + lx * St.sx - (ly * St.lean * a) / span; o.y = footY + ly * St.sy; return o; }
  function fillBuf(buf, St, off) {
    const k = (St.lean * a) / span;
    for (let i = 0; i <= N; i++) {
      const j = i * 4, w = off + St.wob * WAVE[i];
      const lx = LOC[j] + LOC[j + 2] * w, ly = LOC[j + 1] + LOC[j + 3] * w;
      buf[i * 2] = cx + lx * St.sx - ly * k; buf[i * 2 + 1] = footY + ly * St.sy;
    }
  }
  function line(buf, i0, i1) {
    i0 = clamp(Math.round(i0), 0, N); i1 = clamp(Math.round(i1), 0, N);
    if (i1 <= i0) return;
    g.beginPath(); g.moveTo(buf[i0 * 2], buf[i0 * 2 + 1]);
    for (let i = i0 + 1; i <= i1; i++) g.lineTo(buf[i * 2], buf[i * 2 + 1]);
    g.stroke();
  }
  function railAt(uu, off, o) { at(uu * L, Q); const w = off + S.wob * Math.sin(uu * Math.PI * 3); return xf(Q.x + Q.nx * w, Q.y + Q.ny * w, S, o); }
  function winPos(w, o) {
    xf(Math.cos(w.th) * Ro, -Lg + Math.sin(w.th) * Ro, S, o);
    o.y += w.bob - w.lift * a * 0.09;
    return o;
  }
  function archPath(c, x, y, w, h) {
    const r = w / 2, x0 = x - w / 2, y0 = y - h / 2, rb = Math.min(w, h) * 0.08;
    c.beginPath(); c.moveTo(x0, y0 + r); c.arc(x0 + r, y0 + r, r, Math.PI, 0); c.lineTo(x0 + w, y0 + h - rb);
    c.arcTo(x0 + w, y0 + h, x0 + w - rb, y0 + h, rb); c.lineTo(x0 + rb, y0 + h); c.arcTo(x0, y0 + h, x0, y0 + h - rb, rb); c.closePath();
  }

  // ------------------------------------------------------------ simulation --
  function springStep(St, bT, k, c, dt) { St.bv += (k * (bT - St.b) - c * St.bv) * dt; St.b += St.bv * dt; }

  function simulate(dt, t) {
    const k = lerp(1, 0.6, rush);
    const room = (Math.max(0, prog + CAP - wanted) * TRAVEL) / k;
    const prevU = u;
    let travel = 0, held = false;
    if (drag != null || glide) {
      const diff = target - u;
      const vmax = (repos ? 2.6 : 1.5) * dt;
      let step = clamp(diff * Math.min(1, dt * 16), -vmax, vmax);
      if (!repos && Math.abs(step) > room) { held = Math.abs(diff) > 0.01; step = Math.sign(step) * room; }
      u = clamp(u + step, U0, U1);
      if (!repos) travel = Math.abs(u - prevU);
      if (repos && Math.abs(target - u) < 0.012) repos = false;
      if (glide && Math.abs(target - u) < 0.002) glide = false;
    } else if (assistLeft > 1e-5) {
      const st = Math.min(dt * 0.75, assistLeft, room);
      if (st < 1e-6) held = true;
      let nu = u + dir * st;
      if (nu > U1) { nu = 2 * U1 - nu; dir = -1; }
      if (nu < U0) { nu = 2 * U0 - nu; dir = 1; }
      u = nu; travel = st; assistLeft -= st; target = u;
    } else target = u;
    if (travel > 0) wanted = Math.min(1, wanted + (travel * k) / TRAVEL, prog + CAP);
    if (wanted >= 1 - 1e-6 && prog >= 0.998) assistLeft = 0;             // settled: presses have nothing left to do
    if (drag != null || glide) { if (u - prevU > 1e-5) dir = 1; else if (u - prevU < -1e-5) dir = -1; }
    if (u >= U1 - 1e-4) dir = -1; else if (u <= U0 + 1e-4) dir = 1;

    // pace: the arch follows how fast the hand is moving
    const inst = repos ? 0 : (u - prevU) / dt;
    vel = lerp(vel, inst, 1 - Math.exp(-dt * 8));
    rush = lerp(rush, invLerp(0.85, 1.7, Math.abs(vel)), 1 - Math.exp(-dt * 5));
    pace = lerp(pace, Math.min(1, Math.abs(vel) / 0.8), 1 - Math.exp(-dt * 4));
    if (held && t - waitT > 0.7) { waitT = t; wob.kick(0.35); if (E.locked) E.checkpoint('wait'); }

    // little melody along the arch + feet + keystone
    const f = fretOf(u);
    if (f !== lastFret) {
      if (!repos && t - noteT > 0.09) { noteT = t; E.sound('glass', { note: NOTES[f] + 2, intensity: 0.2 + 0.14 * (1 - progD), pan: (u - 0.5) * 1.2 }); }
      if (!repos && t - tickT > 0.14) { tickT = t; E.haptic('tick'); }
      lastFret = f;
    }
    if (!repos && ((u <= U0 + 1e-4 && prevU > U0 + 1e-4) || (u >= U1 - 1e-4 && prevU < U1 - 1e-4))) {
      const side = u < 0.5 ? 0 : 1; footFlash[side] = 1;
      E.sound('drip', { note: 1, intensity: 0.32 }); E.haptic('soft');
      railAt(u, 0, O); E.ripples.add(O.x, footY, { colour: LIGHT, r: bw * 0.6, alpha: 0.5 });
    }
    if (!repos && (prevU - 0.5) * (u - 0.5) < 0 && t - apexT > 0.5) {
      apexT = t; railAt(0.5, railOff, O);
      E.particles.burst(O.x, O.y, reduced ? 2 : 5, { speed: 34, colour: LIGHT, life: 0.9, size: 5, kind: 'glint' });
    }
    if (!repos && Math.abs(vel) > 0.1 && !lowStim && Math.random() < 0.3) {
      railAt(u, railOff, O);
      E.particles.emit({ x: O.x, y: O.y, vx: (Math.random() - 0.5) * 16, vy: -10 - Math.random() * 14, life: 0.9, size: 4, colour: LIGHT, drag: 0.96 });
    }
    for (let i = 0; i < STUDS; i++) {
      const near = Math.max(0, 1 - Math.abs(i / (STUDS - 1) - u) / 0.05) * (repos ? 0.3 : 1);
      studs[i] = Math.max(studs[i] * Math.exp(-dt * 0.8), near);
    }
    trailU += (u - trailU) * (1 - Math.exp(-dt * 2.2));
    footFlash[0] = Math.max(0, footFlash[0] - dt * 1.4); footFlash[1] = Math.max(0, footFlash[1] - dt * 1.4);
    call = Math.max(0, call - dt * 1.2);

    // the breath: shape follows the pearl (swells at the keystone, softens at the feet)
    progD = lerp(progD, prog, 1 - Math.exp(-dt * 3));
    const amp = (1 - progD) * (1 - calm0 * 0.35);
    const amb = reduced ? 0.08 : heavy ? 0.24 : 0.3;
    const lift = Math.sin(Math.PI * clamp((u - U0) / (U1 - U0)));
    const bT = amp * ((lift - 0.35) * (0.7 + 0.55 * pace) + amb * Math.sin(t * 0.85));
    springStep(S, bT, 42, reduced ? 13 : 7, dt);
    railAt(u, railOff, O);
    if (lastBX != null) pvx = lerp(pvx, (O.x - lastBX) / dt, 1 - Math.exp(-dt * 8));
    lastBX = O.x;
    const leanT = clamp(pvx / 1100, -0.28, 0.28) * amp * (reduced ? 0.4 : 1);
    S.lv += (30 * (leanT - S.lean) - (reduced ? 11 : 5) * S.lv) * dt; S.lean += S.lv * dt;
    wobAmp = lerp(wobAmp, reduced ? 0 : rush * amp * bw * 0.4, 1 - Math.exp(-dt * 3));
    S.wob = wobAmp * Math.sin(t * 8.5);
    const wv = wob.update(dt) * (reduced ? 0.01 : 0.028);
    S.sx = 1 + 0.045 * S.b + wv; S.sy = 1 + 0.075 * S.b - wv * 0.5;
    const spread = (1 - smooth(progD)) * (1 - calm0 * 0.5);
    for (let j = 0; j < echoes.length; j++) {
      const e = echoes[j];
      springStep(e, S.b, EK[j], 2 * Math.sqrt(EK[j]) * 0.6, dt);
      e.lean += (S.lean - e.lean) * (1 - Math.exp(-dt * EK[j] * 0.4));
      const sp = spread * (j + 1) * 0.03 * (0.75 + 0.25 * Math.sin(t * 0.5 + j * 1.7));
      e.sx = 1 + 0.045 * e.b + sp; e.sy = 1 + 0.075 * e.b + sp * 1.25;
    }

    // windows warm as the light reaches them; the hero clears at halfway
    for (const w of wins) {
      if (!w.waking && finAt < 0 && prog >= w.thr && (Math.abs(u - w.u) < 0.045 || prog >= w.thr + 0.16)) wake(w);
      if (!w.waking && finAt >= 0 && t - finAt > w.delay) wake(w);
      if (w.waking) w.warm = Math.min(1, w.warm + dt / 1.2);
      if (w.hopAt && t >= w.hopAt) { w.hopAt = 0; w.bv -= 60; w.flash = Math.max(w.flash, 0.7); winPos(w, O); E.particles.burst(O.x, O.y - winH * 0.5, reduced ? 1 : 3, { speed: 24, colour: LIGHT, life: 0.9, size: 4, kind: 'glint' }); E.sound('glass', { note: 5 + (w.rank % 4), intensity: 0.18 }); }
      w.bv += (-70 * w.bob - 7 * w.bv) * dt; w.bob += w.bv * dt;
      w.flash = Math.max(0, w.flash - dt * 1.5);
      if (finAt >= 0) w.lift = Math.min(1, w.lift + dt / 1.8);
    }
    if (!heroHalf && prog >= 0.5) {
      heroHalf = true;
      if (hero >= 0) { photos.dust(hero, cx, footY - H * 0.5, H * 0.7, lowStim ? 6 : 14, { shape: 'arch', up: 18, speed: 18 }); E.checkpoint('photo', hero); }
      E.sound('glass', { note: 7, intensity: 0.3 });
    }
    if (!nearSaid && prog >= 0.7 && finAt < 0) { nearSaid = true; E.hint('Nearly still — glide on at your own pace.'); }

    // win: the arch has settled into one still shape, and nothing is moving it
    if (prog >= 0.998 && drag == null && !glide && assistLeft <= 1e-5) restT += dt; else restT = 0;
    if (!doneFlag && restT > 0.45) {
      doneFlag = true; E.sound('settle', { intensity: 0.5 });
      if (hero >= 0) E.checkpoint('photo', hero);
    }
    if (finAt >= 0 && !bloomed && t - finAt > 1.5) {
      bloomed = true; railAt(0.5, 0, O);
      if (heavy) for (let i = 0; i < (lowStim ? 4 : 9); i++) E.particles.emit({ x: O.x + (Math.random() - 0.5) * a, y: O.y + Math.random() * a * 0.4, vx: (Math.random() - 0.5) * 8, vy: -12 - Math.random() * 10, life: 2.6, size: 6, colour: LIGHT, drag: 0.99 });
      else { E.particles.burst(O.x, O.y, reduced ? 6 : 14, { speed: 60, colour: LIGHT, life: 1.6, size: 6, kind: 'glint' }); E.sound('bloom', { intensity: 0.3 }); }
    }
  }

  function wake(w) {
    w.waking = true; w.flash = 1; w.bv -= 36;
    winPos(w, O);
    if (w.ph >= 0) { photos.dust(w.ph, O.x, O.y, winH, lowStim ? 5 : 10, { shape: 'arch', up: 22, speed: 20 }); E.checkpoint('photo', w.ph); }
    E.particles.burst(O.x, O.y, reduced ? 3 : 7, { speed: 36, colour: LIGHT, life: 1.1, size: 6 });
    E.sound('glass', { note: 4 + (w.rank % 5), intensity: 0.32 });
    E.haptic('light');
  }

  // --------------------------------------------------------------- drawing --
  function frame(dt0, t) {
    const dt = Math.min(dt0, 1 / 30);
    prog = E.gate(wanted);
    if (wanted > prog + CAP) wanted = prog + CAP;
    if (dt > 0) simulate(dt, t);
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const st = progD, clear = smooth(Math.min(1, progD / 0.95));
    fillBuf(SP, S, 0); fillBuf(RP, S, railOff);
    g.fillStyle = gBack; g.fillRect(cx - a * 2.4, footY - span * 0.55 - a * 2.4, a * 4.8, a * 4.8);
    drawFloor(t, st, fin);
    drawRipples(t);
    drawEchoes(t, st);
    drawWindows(t, st, fin);
    drawOpening(t, st, clear, fin);
    drawPedestals(t, st, fin);
    drawBand(t, st, fin);
    drawStuds(t, st, fin);
    drawLight(t, st, fin);
    if (E.phase !== 'law') drawWords(t, st, fin);
    drawPearl(t, st, fin);
  }

  function drawFloor(t, st, fin) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.translate(cx, footY + bw * 0.2); g.scale(1, 0.16);
    const r = Rc * 1.9, gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, rgba(TINT, 0.2 + 0.12 * st + 0.18 * fin)); gr.addColorStop(1, rgba(TINT, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.restore();
    // faint reflection of the arch on the polished floor
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
    g.strokeStyle = rgba(TINT, 0.08 + 0.05 * st + 0.06 * fin); g.lineWidth = bw * 0.5;
    g.beginPath();
    for (let i = 0; i <= N; i++) { const x = SP[i * 2], y = footY + bw * 0.35 + (footY - SP[i * 2 + 1]) * 0.12; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke(); g.restore();
  }

  function drawRipples(t) {
    if (twistAt < 0 || twistKind !== 1) return;
    const age = t - twistAt; if (age > 4.6) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      const k = (age - j * 0.6) / 3; if (k <= 0 || k >= 1) continue;
      RS.sx = S.sx * (1 + k * 0.5); RS.sy = S.sy * (1 + k * 0.42); RS.lean = S.lean; RS.wob = 0;
      fillBuf(EP, RS, bw * 0.5);
      g.strokeStyle = rgba(j === 1 ? TINT : LIGHT, 0.42 * Math.sin(Math.PI * k)); g.lineWidth = 1 + 2.5 * (1 - k);
      line(EP, 0, N);
    }
    g.restore();
  }

  function drawEchoes(t, st) {
    const al = 0.05 + 0.3 * (1 - st);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let j = 0; j < echoes.length; j++) {
      fillBuf(EP, echoes[j], bw * 0.5 + 3);
      g.strokeStyle = rgba(j % 2 ? TINT : LIGHT, al * (1 - j * 0.18)); g.lineWidth = 1.4 + (3 - j) * 0.4;
      line(EP, 0, N);
    }
    g.restore();
  }

  function drawWindows(t, st, fin) {
    for (const w of wins) {
      winPos(w, O);
      const x = O.x, y = O.y + (reduced ? 0 : Math.sin(t * 0.8 + w.th * 3) * 1.6 * (1 - st));
      const k = ease.inOutSine(w.warm);
      const sz = winH * (1 + 0.05 * k + 0.06 * fin + 0.06 * w.flash);
      const ww = sz * 0.78;
      glow(g, x, y, sz * 1.05, w.ph >= 0 ? photos.colour(w.ph) : TINT, 0.1 + 0.28 * k + 0.25 * fin + 0.3 * w.flash);
      shadow(g, x, y + sz * 0.56, ww * 0.5, sz * 0.08, 0.25);
      if (w.ph >= 0) {
        photos.draw(g, w.ph, x, y, sz, { shape: 'arch', tone: 'mist', toneMix: (1 - k) * 0.72, blur: (1 - k) * 0.45, alpha: 0.72 + 0.28 * k, glow: 0.15 + 0.35 * k + 0.3 * fin, glowColour: LIGHT, shadow: false });
      } else {
        const gr = g.createLinearGradient(0, y - sz / 2, 0, y + sz / 2);
        gr.addColorStop(0, rgba(mix(DEEP, TINT, 0.38 + 0.2 * k), 0.82)); gr.addColorStop(0.62, rgba(mix(DEEP, TINT, 0.55 + 0.25 * k), 0.8)); gr.addColorStop(1, rgba(mix(TINT, WARM, 0.55), 0.8 + 0.15 * k));
        g.fillStyle = gr; archPath(g, x, y, ww, sz); g.fill();
        glow(g, x, y + sz * 0.12, ww * (0.45 + 0.25 * k), WARM, 0.25 + 0.5 * k + 0.2 * fin);
        orb(g, x, y + sz * 0.12, Math.max(2.5, ww * 0.09), mix(WARM, '#ffffff', 0.5), { alpha: 0.6 + 0.4 * k });
        glint(g, x, y + sz * 0.12, ww * (0.2 + 0.06 * k), '#ffffff', 0.18 + 0.22 * k, reduced ? 0 : t * 0.15 + w.th);
      }
      // luminous frame and a glass highlight
      g.save(); g.globalCompositeOperation = 'lighter';
      archPath(g, x, y, ww + 3, sz + 3); g.strokeStyle = rgba(LIGHT, 0.3 + 0.4 * k + 0.2 * fin); g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.ellipse(x - ww * 0.18, y - sz * 0.28, ww * 0.12, sz * 0.16, 0.3, 0, TAU); g.fill();
      g.restore();
    }
  }

  function buildVista(W) {
    const SC = 2, c = canvas(Math.ceil(W * SC), Math.ceil(H * SC)), v = c.getContext('2d');
    v.scale(SC, SC); archPath(v, W / 2, H / 2, W, H); v.clip();
    const gr = v.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, DEEP); gr.addColorStop(0.5, mix(DEEP, TINT, 0.32)); gr.addColorStop(0.8, mix(TINT, WARM, 0.45)); gr.addColorStop(1, mix(WARM, '#fff3e0', 0.35));
    v.fillStyle = gr; v.fillRect(0, 0, W, H);
    const R = rng((E.seed * 7 + 3) | 0);
    for (let i = 0; i < 26; i++) { v.fillStyle = rgba('#ffffff', 0.25 + R() * 0.5); v.beginPath(); v.arc(R() * W, R() * H * 0.55, 0.5 + R() * 1.1, 0, TAU); v.fill(); }
    for (const [y0, col, am] of [[0.8, mix(DEEP, TINT, 0.3), 0.06], [0.9, mix(DEEP, '#000000', 0.25), 0.04]]) {
      v.fillStyle = col; v.beginPath(); v.moveTo(0, H); v.lineTo(0, H * y0);
      v.bezierCurveTo(W * 0.3, H * (y0 - am * 2), W * 0.6, H * (y0 + am), W, H * (y0 - am)); v.lineTo(W, H); v.closePath(); v.fill();
    }
    return c;
  }

  function drawOpening(t, st, clear, fin) {
    const W = 2 * a;
    g.save();
    g.transform(S.sx, 0, (-S.lean * a) / span, S.sy, cx, footY);
    archPath(g, 0, -H / 2, W, H); g.fillStyle = rgba(DEEP, 0.92); g.fill();
    if (hero >= 0) {
      const ripple = reduced ? 0 : (1 - st) * (0.01 + rush * 0.03) * Math.sin(t * 2.2);
      photos.draw(g, hero, 0, -H / 2, H * 0.99, { shape: 'arch', tone: fin > 0 ? 'dawn' : 'mist', toneMix: fin > 0 ? fin * 0.18 : (1 - clear) * 0.62,
        blur: (1 - clear) * 0.55, shadow: false, skewY: ripple, alpha: 0.88 + 0.12 * clear });
    } else {
      if (!vista) vista = buildVista(W);
      g.drawImage(vista, -W / 2, -H, W, H);
      const my = -H * (0.36 + 0.22 * st), mr = a * 0.15;
      glow(g, 0, my, mr * 4.2, WARM, 0.32 + 0.2 * st + 0.2 * fin);
      orb(g, 0, my, mr, mix(WARM, '#ffffff', 0.55));
    }
    // inside the doorway: a threshold glow, drifting motes and a slow sheet of glass light
    g.save(); archPath(g, 0, -H / 2, W, H); g.clip();
    g.globalCompositeOperation = 'lighter';
    const th = g.createLinearGradient(0, 0, 0, -H * 0.55);
    th.addColorStop(0, rgba(WARM, 0.16 + 0.1 * st + 0.16 * fin)); th.addColorStop(1, rgba(WARM, 0));
    g.fillStyle = th; g.fillRect(-W / 2, -H * 0.55, W, H * 0.55);
    if ((1 - clear) > 0.02) {
      const mist = g.createLinearGradient(0, -H, 0, 0);
      mist.addColorStop(0, rgba(LIGHT, 0)); mist.addColorStop(0.5 + 0.2 * Math.sin(t * 0.4), rgba(LIGHT, 0.1 * (1 - clear))); mist.addColorStop(1, rgba(LIGHT, 0));
      g.fillStyle = mist; g.fillRect(-W / 2, -H, W, H);
    }
    for (const mo of motes) {
      const yy = (mo.y + t * mo.sp * (reduced ? 0.4 : 1)) % 1;
      glow(g, mo.x * a * 0.8 + Math.sin(t * 0.6 + mo.ph) * a * 0.06, -yy * H, 2 + 2.5 * mo.r, LIGHT, 0.32 * Math.sin(Math.PI * yy));
    }
    const sp = ((t * (reduced ? 0.02 : 0.045) + shPh) % 1.6) - 0.3;
    const sg = g.createLinearGradient(-W / 2, -H, W / 2, 0);
    sg.addColorStop(clamp(sp - 0.08), 'rgba(255,255,255,0)'); sg.addColorStop(clamp(sp), 'rgba(255,255,255,0.07)'); sg.addColorStop(clamp(sp + 0.08), 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.fillRect(-W / 2, -H, W, H);
    g.restore();
    archPath(g, 0, -H / 2, W, H); g.strokeStyle = rgba(DEEP, 0.4); g.lineWidth = 7; g.stroke();
    g.restore();
  }

  function drawPedestals(t, st, fin) {
    const w = bw * 1.65, h = bw * 0.55;
    for (let side = 0; side < 2; side++) {
      const x = SP[(side ? N : 0) * 2], y = footY;
      shadow(g, x, y + h * 0.75, w * 0.95, h * 0.45, 0.42);
      const gr = g.createLinearGradient(0, y - h * 0.3, 0, y + h * 0.7);
      gr.addColorStop(0, mix(BODY, LIGHT, 0.35)); gr.addColorStop(1, mix(BODY, DEEP, 0.6));
      g.fillStyle = gr; roundRect(g, x - w / 2, y - h * 0.3, w, h, h * 0.4); g.fill();
      g.strokeStyle = rgba(LIGHT, 0.45); g.lineWidth = 1; g.stroke();
      glow(g, x, y, bw * (1.2 + footFlash[side]), TINT, 0.18 + 0.5 * footFlash[side] + 0.2 * fin);
    }
  }

  function drawBand(t, st, fin) {
    g.save(); g.lineCap = 'butt'; g.lineJoin = 'round';
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(TINT, 0.07 + 0.07 * st + 0.1 * fin); g.lineWidth = bw * 2.8; line(SP, 0, N);
    g.strokeStyle = rgba(LIGHT, 0.09 + 0.08 * st + 0.1 * fin); g.lineWidth = bw * 1.7; line(SP, 0, N);
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = rgba(mix(LIGHT, '#ffffff', 0.3), 0.9); g.lineWidth = bw + 3; line(SP, 0, N);
    g.strokeStyle = gBand; g.lineWidth = bw - 1.6; line(SP, 0, N);
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(TINT, 0.08 + 0.16 * st + 0.14 * fin); g.lineWidth = bw * 0.62; line(SP, 0, N);
    g.restore();
  }

  function drawStuds(t, st, fin) {
    for (let k = 0; k < STUDS; k++) {
      const i = Math.round((k / (STUDS - 1)) * N), x = RP[i * 2], y = RP[i * 2 + 1];
      const lit = Math.max(studs[k], st * 0.5, fin);
      g.fillStyle = rgba(LIGHT, 0.3 + 0.6 * lit); g.beginPath(); g.arc(x, y, 1.2 + 1.2 * lit, 0, TAU); g.fill();
      if (lit > 0.05) glow(g, x, y, 5 + 6 * lit, TINT, 0.45 * lit);
    }
  }

  function drawLight(t, st, fin) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    // a slow sheen gliding over the arch (ambient, hypnotic)
    const sh = ((t * (reduced ? 0.025 : 0.05) + shPh) % 1.4) - 0.2;
    g.strokeStyle = rgba('#ffffff', 0.15 * (1 - fin * 0.4)); g.lineWidth = bw * 0.3; line(SP, sh * N, (sh + 0.1) * N);
    // the pearl's light trail
    const i0 = Math.min(trailU, u) * N, i1 = Math.max(trailU, u) * N;
    if (i1 - i0 > 0.6) for (const [w, al, c] of TRAIL) { g.strokeStyle = rgba(c, al); g.lineWidth = w; line(RP, i0, i1); }
    // finale: light climbs both legs to the keystone
    if (fin > 0) {
      const k = (fin * N) / 2;
      for (const [w, al] of [[bw * 1.2, 0.16], [bw * 0.55, 0.32], [bw * 0.16, 0.8]]) { g.strokeStyle = rgba(w < bw * 0.2 ? '#ffffff' : LIGHT, al * fin); g.lineWidth = w; line(SP, 0, k + 0.5); line(SP, N - k - 0.5, N); }
      if (fin > 0.85) { const i = N / 2; glint(g, SP[i * 2], SP[i * 2 + 1] - bw * 0.1, bw * 1.3, '#ffffff', (fin - 0.85) / 0.15 * 0.7, 0); }
    }
    g.restore();
  }

  function prepText() {
    const tok = words.token || '';
    const key = `${tok}|${fontPx}|${Math.round(L)}`;
    if (key === txtKey) return;
    txtKey = key;
    const maxLen = L - Lg * 0.9;
    let fpx = fontPx, chars = Array.from(tok).slice(0, 60), ws = [], tw = 0;
    const measure = () => { g.save(); g.font = `600 ${fpx}px ${FONT}`; ws = chars.map((c) => g.measureText(c).width); g.restore(); tw = ws.reduce((s, w) => s + w + TRACK, -TRACK); };
    measure();
    while (tw > maxLen && fpx > 12) { fpx -= 1; measure(); }
    if (tw > maxLen) { while (tw > maxLen && chars.length > 4) { chars = chars.slice(0, -2); measure(); } chars.push('…'); measure(); }
    text.chars = chars; text.ws = ws; text.tw = tw; text.fpx = fpx;
  }
  const text = { chars: [], ws: [], tw: 0, fpx: 12 };

  function drawWords(t, st, fin) {
    prepText();
    const { chars, ws, tw, fpx } = text;
    if (!chars.length) return;
    const waver = reduced ? 0 : (1 - st) * 1.6;
    const kk = (S.lean * a) / span, sBead = u * L;
    let s = L / 2 - tw / 2;
    for (let i = 0; i < chars.length; i++) {
      const sc = s + ws[i] / 2; s += ws[i] + TRACK;
      at(sc, Q);
      const w = waver * Math.sin(t * 1.6 + i * 0.55) + S.wob * Math.sin((sc / L) * Math.PI * 3);
      xf(Q.x + Q.nx * w, Q.y + Q.ny * w, S, O);
      const tx = -Q.ny, ty = Q.nx;
      CH[i * 4] = O.x; CH[i * 4 + 1] = O.y; CH[i * 4 + 2] = Math.atan2(ty * S.sy, tx * S.sx - ty * kk);
      CH[i * 4 + 3] = Math.exp(-Math.abs(sc - sBead) / 46);
    }
    g.save(); g.font = `600 ${fpx}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = rgba(DEEP, 0.95); g.shadowBlur = 5; g.fillStyle = INK;
    for (let i = 0; i < chars.length; i++) drawChar(chars[i], i);
    g.globalCompositeOperation = 'lighter'; g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.fillStyle = rgba(LIGHT, 1);
    for (let i = 0; i < chars.length; i++) { const gl = 0.12 + 0.3 * fin + 0.5 * CH[i * 4 + 3] + 0.1 * st; g.globalAlpha = gl; drawChar(chars[i], i); if (CH[i * 4 + 3] > 0.3) glow(g, CH[i * 4], CH[i * 4 + 1], fpx * 0.9, LIGHT, 0.25 * CH[i * 4 + 3]); }
    g.restore();
  }
  function drawChar(c, i) {
    const x = CH[i * 4], y = CH[i * 4 + 1], r = CH[i * 4 + 2];
    g.translate(x, y); g.rotate(r); g.fillText(c, 0, 0); g.rotate(-r); g.translate(-x, -y);
  }

  function drawPearl(t, st, fin) {
    railAt(u, railOff, O);
    const x = O.x, y = O.y, touching = drag != null;
    const pulse = reduced ? 0 : Math.sin(t * 2.1) * 0.08;
    glow(g, x, y, br * (3.4 + pulse * 4 + call * 1.5), TINT, (touching ? 0.72 : 0.46) + fin * 0.2 + call * 0.3);
    glow(g, x, y, br * 1.6, '#ffffff', 0.3);
    orb(g, x, y, br * (touching ? 1.12 : 1), PEARL);
    if (!touching && !doneFlag && finAt < 0) {
      const ph = (t * 0.55) % 1;
      g.strokeStyle = rgba(LIGHT, 0.45 * (1 - ph)); g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, br * (1.4 + ph * 1.8), 0, TAU); g.stroke();
    }
  }

  // ----------------------------------------------------------------- input --
  let hitD = 0;
  function nearestU(px, py, around) {
    const ly = (py - footY) / S.sy, lx = (px - cx + (ly * S.lean * a) / span) / S.sx;
    let lo = 0, hi = N;
    if (around != null) { const c = Math.round(around * N); lo = Math.max(0, c - 30); hi = Math.min(N, c + 30); }
    let best = 0, bd = Infinity;
    for (let i = lo; i <= hi; i++) { const dx = lx - LOC[i * 4], dy = ly - LOC[i * 4 + 1], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    let bu = best / N, bdist = Math.sqrt(bd);
    for (const j of [best - 1, best]) {
      if (j < 0 || j >= N) continue;
      const ax = LOC[j * 4], ay = LOC[j * 4 + 1], bx = LOC[(j + 1) * 4], by = LOC[(j + 1) * 4 + 1];
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
      const k = clamp(((lx - ax) * vx + (ly - ay) * vy) / l2);
      const d = Math.hypot(lx - ax - vx * k, ly - ay - vy * k);
      if (d < bdist) { bdist = d; bu = (j + k) / N; }
    }
    hitD = bdist;
    return bu;
  }
  function tapElsewhere(p) {
    for (const w of wins) {
      winPos(w, O);
      if (Math.hypot(p.x - O.x, p.y - O.y) < winH * 0.62) {
        w.bv -= 45; w.flash = Math.max(w.flash, 0.6);
        E.sound('bubble', { note: 3 + (w.rank % 5), intensity: 0.28 }); E.haptic('tick');
        return;
      }
    }
    call = 1;
    E.ripples.add(p.x, p.y, { colour: LIGHT, alpha: 0.4, r: 6 });
    E.sound('bubble', { note: 1, intensity: 0.22 }); E.haptic('tick');
  }

  return {
    get progress() { return prog; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0 || drag != null) return;
      const uu = nearestU(p.x, p.y, null);
      railAt(u, railOff, O);
      const nearPearl = Math.hypot(p.x - O.x, p.y - O.y) < Math.max(46, br * 3.2);
      if (!nearPearl && hitD > bw * 0.5 + 40) { tapElsewhere(p); return; }
      drag = p.id; glide = false; assistLeft = 0;
      if (nearPearl) { target = u; repos = false; } else { target = clamp(uu, U0, U1); repos = Math.abs(target - u) > 0.04; }
      E.ripples.add(O.x, O.y, { colour: LIGHT, alpha: 0.6, r: br });
      E.sound('pluck', { note: NOTES[fretOf(u)] + 1, intensity: 0.34 }); E.haptic('light');
    },
    move(p) {
      if (p.id !== drag) return;
      target = clamp(nearestU(p.x, p.y, repos ? null : target), U0, U1);
    },
    up(p) {
      if (p.id !== drag) return;
      drag = null;
      if (repos) { repos = false; target = u; } else { target = clamp(target, u - 0.08, u + 0.08); glide = Math.abs(target - u) > 0.002; }
    },
    assist() {
      if (finAt >= 0 || drag != null || wanted >= 0.999) return;
      glide = false; repos = false;
      assistLeft = Math.min(assistLeft + TRAVEL / 8 + 0.002, TRAVEL / 4 + 0.004);
    },
    pointAt(p) {
      const span0 = U1 - U0;
      let s = dir > 0 ? (u - U0) / span0 : 2 - (u - U0) / span0;
      s += ((clamp(p) - prog) * TRAVEL) / span0;
      s = ((s % 2) + 2) % 2;
      const f = s > 1 ? 2 - s : s, o = { x: 0, y: 0 };
      railAt(U0 + f * span0, railOff, o);
      return o;
    },
    hint() {
      const pts = [];
      let uu = u, dd = dir;
      for (let i = 0; i <= 22; i++) {
        railAt(uu, railOff, O); pts.push([O.x, O.y]);
        uu += dd * 0.019;
        if (uu > U1) { uu = 2 * U1 - uu; dd = -1; }
        if (uu < U0) { uu = 2 * U0 - uu; dd = 1; }
      }
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      if (twistKind === 0) wins.forEach((w, i) => { w.hopAt = twistAt + 0.15 + i * 0.18; });
      railAt(0.5, 0, O);
      E.particles.burst(O.x, O.y - bw, reduced ? 4 : 10, { speed: 40, colour: '#ffffff', life: 1.3, size: 5, kind: 'glint' });
      E.sound('shimmer', { intensity: 0.3 });
    },
    finish() {
      if (finAt >= 0) return;
      finAt = E.now(); drag = null; glide = false; assistLeft = 0;
      let j = 0; for (const w of order) if (!w.waking) w.delay = 0.3 + 0.22 * j++;
      E.sound(heavy ? 'settle' : 'shimmer', { intensity: 0.4 });
    },
    destroy() {},
  };
}
