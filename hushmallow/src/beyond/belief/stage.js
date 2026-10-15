// Belief Mallows — the stage: the person's Belief Mallow (src/mallows/thought/belief.js, on a ThoughtLayer of its own,
// drawn on Another Angle's canvas) and the three tactile experiences. It has a mechanic's shape (frame, pointer, bodies,
// avoid, tags, settled, assist, destroy), so Another Angle's stage draws it, routes touch to it, keeps its subtitles and
// labels clear of it and ends it exactly as it ends a mechanic (crisis or care seen: endMechanic(true) → destroy()).
//
//   const st = mountBeliefStage({ g, root, area, text, prop, explored, room, reducedMotion, lowStim, keepOut, haptic,
//                                 audio, announce, textScale });
//   await st.run('shape' | 'loosen' | 'room', { onMoment })   → { done: true } (or { stopped: true } on destroy)
//   st.snapshot() → { prop, explored, room }                   (for "Keep it on this phone")
//
//   shape   everyday moments (authored labels) wait at the side of the play area; a tap sends one across (or drag it and
//           let go). The belief pulls on what passes, by its prop's weight now: heavy, a moment bends in and comes to rest
//           against it ("leaned"); lighter, it curves and goes past ("passed"). Two moments, then it is done.
//   loosen  squeezing, stroking, stretching or carrying it explores it (the model earns it from touch too); its prop gets
//           lighter: the stone is set down beside it, the shell swings open, the thread loosens, the charm lightens.
//   room    a finger resting on the space around it (not on it) grows a calm ring of room: the belief settles farther
//           off, smaller in the sky; it is never removed.
// The assist pill does each one a step at a time (instead of touch). Reduced motion: no motes, no wobble; moments glide
// at an even pace. Nothing here is stored or sent: the words ride on the ThoughtLayer's own tag (textContent only).

import { ThoughtLayer } from '../../mallows/thought/layer.js';
import { createBelief, PROP_WEIGHT } from '../../mallows/thought/belief.js';
import { BELIEF_TINTS } from '../../mallows/thought/styles.js';
import { makeTags, drawGlow, RectList, Motes, clamp, lerp, approach, mix, rgba, TAU } from '../mechanics/kit.js';
import { BELIEF } from './lines.js';

/** How far each experience goes before it is done. */
export const DONE_AT = Object.freeze({ loosen: 0.78, room: 1, shape: 2 });
/** A moment comes to rest against the belief while its pull (0..1 of the prop's full weight) is at least this. */
export const LEAN_AT = 0.45;
const ROOM_SECONDS = 5;
/** The pull's strength (px·s⁻² at 55 px, scaled by the body's size). */
const PULL_K = 30000;

/** The belief's pull now: its weight as a share of its prop's full weight (1 at first; ≈0.25 explored; 0 once the stone is down). */
export function pullOf(b) {
  const full = PROP_WEIGHT[b?.prop] || 1;
  return clamp((Number(b?.weight) || 0) / full);
}

export function mountBeliefStage(ctx) {
  const g = ctx.g;
  const rm = () => !!ctx.reducedMotion?.();
  const low = () => !!ctx.lowStim?.();
  const A = () => ctx.area();
  const tint = BELIEF_TINTS[ctx.prop] || BELIEF_TINTS.stone;
  const tags = makeTags(ctx.root, { bounds: () => A(), announce: ctx.announce });
  const motes = new Motes(24);
  const BL = new RectList(), AL = new RectList();
  const rectsTL = [];
  let destroyed = false, failed = false;

  // the person's Belief Mallow, on its own layer (drawn on the scene's canvas, in the scene's frame)
  const layer = new ThoughtLayer({
    ctx2d: g, tagRoot: ctx.root, reducedMotion: rm, lowStim: low, keepOut: ctx.keepOut,
    bounds: () => { const a = A(); return { left: a.x, top: a.y, right: a.x + a.w, bottom: a.y + a.h }; },
    haptic: ctx.haptic, audio: ctx.audio, textScale: ctx.textScale,
  });
  let run = null;   // { kind, resolve, ... } the experience under way
  const moments = [];
  const a0 = A();
  const r = clamp(Math.min(a0.w, a0.h) * 0.12, 24, 38);
  // (while moments are sent past it, it rests right of centre: the moments and their labels wait on the left, clear of it)
  const home = () => { const a = A(); return { x: a.x + a.w * (run?.kind === 'shape' || moments.length ? 0.64 : 0.5), y: a.y + a.h * 0.56 }; };
  const belief = createBelief({ text: ctx.text, prop: ctx.prop, r, explored: clamp(ctx.explored || 0), seed: ctx.seed, reducedMotion: rm(), lowStim: low() });
  layer.add(belief, { from: { x: home().x, y: a0.y + 8 }, home: home() });
  let room = clamp(ctx.room || 0);
  if (room > 0) { belief.farther(room * 0.6); belief.makeSpace(room); }
  let rmWas = rm();

  // ------------------------------------------------------------ touch → loosen --
  // (beyond what the model earns itself: every deliberate touch while loosening is a visible step)
  const STEP = { squeeze: 0.07, stroke: 0.05, massage: 0.06, stretch: 0.06, jiggle: 0.03, carry: 0.02, put: 0.02, flick: 0.03 };
  let announced = { prop: false, room: room >= 1 };
  layer.on('touch', (d) => {
    if (destroyed || d.thought !== belief || run?.kind !== 'loosen') return;
    const s = STEP[d.kind];
    if (s) belief.explore(Math.min(1, belief.explored + s));
  });

  // ------------------------------------------------------------- moments --
  let nextMoment = 0;
  const MR = () => clamp(r * 0.42, 11, 16);
  function waitingSpot() { const a = A(), b = bodyOf(); return { x: a.x + MR() + 14, y: clamp(b.cy - r * 0.2, a.y + MR() + 6, a.y + a.h - MR() - 40) }; }
  function bodyOf() { const b = belief._bbox?.(); return b && Number.isFinite(b.cx) ? b : { left: belief.x - r, right: belief.x + r, top: belief.y - r, bottom: belief.y + r, cx: belief.x, cy: belief.y, width: r * 2, height: r * 2 }; }
  function offerMoment() {
    if (moments.some((m) => m.state === 'waiting')) return;
    const label = BELIEF.shape.moments[nextMoment % BELIEF.shape.moments.length];
    nextMoment++;
    const p = waitingSpot();
    const m = { label, x: p.x, y: p.y, vx: 0, vy: 0, state: 'waiting', k: 0, born: rm() ? 1 : 0, fade: 1, rest: 0, ang: 0, held: null, tag: tags.add(label, { kind: 'label', colour: '#cfe6ff', max: 170, tie: 56 }) };
    moments.push(m);
  }
  function launch(m, vx = null, vy = null) {
    if (m.state !== 'waiting' && m.state !== 'held') return;
    const b = bodyOf();
    // aimed to pass just beside the belief (above its middle): a heavy belief pulls it in, a light one lets it by
    const R = Math.max(b.width, b.height) / 2;
    const tx = b.cx, ty = b.cy - (R + MR() * 1.6 + 6);
    const sp = rm() ? 150 : 175;
    let dx = tx - m.x, dy = ty - m.y;
    if (Number.isFinite(vx) && Math.hypot(vx, vy) > 40) { dx = vx; dy = vy; }
    const l = Math.hypot(dx, dy) || 1;
    m.vx = (dx / l) * sp; m.vy = (dy / l) * sp;
    // a drag pointing away from it still gets near enough to feel it (the moment always crosses the stage)
    if (m.vx < sp * 0.5) { m.vx = sp * 0.8; m.vy = clamp(m.vy, -sp * 0.6, sp * 0.6); }
    m.state = 'moving'; m.pull = pullOf(belief); m.closest = Infinity;
    ctx.haptic?.('light');
  }
  function stepMoments(dt) {
    const a = A(), b = bodyOf(), R = Math.max(b.width, b.height) / 2, cx = b.cx, cy = b.cy;
    for (let i = moments.length - 1; i >= 0; i--) {
      const m = moments[i];
      m.born = Math.min(1, m.born + dt / 0.5);
      if (m.state === 'waiting') {
        const p = waitingSpot();
        m.x = approach(m.x, p.x, 6, dt); m.y = approach(m.y, p.y + (rm() ? 0 : Math.sin(performance.now() / 700) * 3), 6, dt);
      } else if (m.state === 'moving') {
        const dx = cx - m.x, dy = cy - m.y, d = Math.hypot(dx, dy) || 1;
        m.closest = Math.min(m.closest, d);
        // the pull: by the belief's weight when it set off (the experience shows the weight it had then)
        const acc = PULL_K * (R / 55) * m.pull / Math.max(d, R) ** 1.2;
        m.vx += (dx / d) * acc * dt; m.vy += (dy / d) * acc * dt;
        m.x += m.vx * dt; m.y += m.vy * dt;
        m.k = Math.max(m.k, clamp((R * 2.6 - d) / (R * 1.6)) * m.pull);
        const touchR = R + MR() * 0.6;
        // (heavy enough, it always comes in: a near pass is drawn the last of the way)
        if (d < touchR || (m.pull >= LEAN_AT && d < touchR + MR() * 2.2)) {
          if (m.pull >= LEAN_AT) { m.state = 'leaned'; m.ang = Math.atan2(m.y - cy, m.x - cx); m.rest = 0; ctx.haptic?.('soft'); if (!rm() && !low()) motes.burst(m.x, m.y, tint.glow, 6, { speed: 30, size: 2, life: 0.9, up: 6 }); }
          else { const n = touchR / d; m.x = cx - dx * n; m.y = cy - dy * n; const vn = (m.vx * -dx + m.vy * -dy) / d; if (vn < 0) { m.vx -= (-dx / d) * vn; m.vy -= (-dy / d) * vn; } }
        }
        if (m.x > a.x + a.w + MR() * 2 || m.y < a.y - 60 || m.y > a.y + a.h + 60 || m.x < a.x - 60) m.state = 'passed';
      } else if (m.state === 'leaned') {
        // it rests against the belief, leaning in, and slides down its side a little
        m.rest += dt;
        const tA = lerp(m.ang, Math.PI * 0.18, clamp(m.rest / 1.6));
        m.ang = rm() ? tA : approach(m.ang, tA, 3, dt);
        const rr = R + MR() * 0.7;
        m.x = cx + Math.cos(m.ang) * rr; m.y = cy + Math.sin(m.ang) * rr;
        m.k = Math.max(m.k, m.pull);
        if (m.rest > 2.2) m.fade = Math.max(0, m.fade - dt / (rm() ? 0.3 : 0.9));
      } else if (m.state === 'passed') {
        m.x += m.vx * dt; m.y += m.vy * dt;
        m.fade = Math.max(0, m.fade - dt / (rm() ? 0.2 : 0.5));
      }
      if ((m.state === 'leaned' || m.state === 'passed') && !m.told) { m.told = true; run?.onMoment?.(m.state === 'leaned' ? 'leaned' : 'passed'); if (run?.kind === 'shape') run.count++; }
      if (m.fade <= 0) { m.tag.remove(); moments.splice(i, 1); }
    }
  }
  function drawMoments() {
    const MRr = MR();
    for (const m of moments) {
      const al = m.fade * m.born;
      if (al <= 0.01) continue;
      const light = mix('#e8f4ff', tint.light, m.k), deep = mix('#7fa8d6', tint.deep, m.k);
      drawGlow(g, m.x, m.y, MRr * 2.6, mix('#bfe2ff', tint.glow, m.k), 0.34 * al);
      const gr = g.createRadialGradient(m.x - MRr * 0.35, m.y - MRr * 0.4, 1, m.x, m.y, MRr);
      gr.addColorStop(0, rgba(light, 0.96 * al)); gr.addColorStop(1, rgba(deep, 0.9 * al));
      g.fillStyle = gr;
      g.beginPath(); g.arc(m.x, m.y, MRr, 0, TAU); g.fill();
      if (m.state === 'waiting' && !rm()) {
        // a soft ring says "touch me"
        const p = (performance.now() / 1400) % 1;
        g.strokeStyle = rgba('#dff1ff', (1 - p) * 0.5 * al); g.lineWidth = 1.5;
        g.beginPath(); g.arc(m.x, m.y, MRr + 4 + p * 10, 0, TAU); g.stroke();
      }
      // its label: under it while it waits; once it moves, the label fades (it is heard, and the subtitle says what happened)
      const o = m.state === 'waiting' || m.state === 'held' ? al : 0;
      m.tag.at(m.x, m.y + MRr + 6, 'bottom', o).own(m.x, m.y);
    }
  }
  const momentAt = (x, y) => moments.find((m) => (m.state === 'waiting' || m.state === 'held') && Math.hypot(x - m.x, y - m.y) < MR() + 18);

  // ------------------------------------------------------------- room --
  let hold = null, ringR = 0;
  function stepRoom(dt) {
    if (hold && run?.kind === 'room') {
      room = Math.min(1, room + dt / (rm() ? ROOM_SECONDS * 0.8 : ROOM_SECONDS));
      belief.farther(room * 0.6); belief.makeSpace(room);
      if (room >= 1 && !announced.room) { announced.room = true; ctx.say?.(BELIEF.heard.room); ctx.haptic?.('soft'); }
    }
    const b = bodyOf(), R = Math.max(b.width, b.height) / 2;
    const want = room > 0 ? R * (1.25 + room * 1.1) : 0;
    ringR = rm() ? want : approach(ringR, want, 4, dt);
  }
  function drawRoom() {
    if (ringR <= 1) return;
    const b = bodyOf();
    const al = (low() ? 0.12 : 0.2) * clamp(room * 2);
    drawGlow(g, b.cx, b.cy, ringR * 1.25, '#bfe6ff', al * 0.7);
    g.strokeStyle = rgba('#dff4ff', al * 1.6); g.lineWidth = 1.5;
    g.setLineDash(rm() ? [] : [3, 7]);
    g.beginPath(); g.arc(b.cx, b.cy, ringR, 0, TAU); g.stroke();
    g.setLineDash([]);
    if (hold) {
      const p = rm() ? 0.5 : (performance.now() / 900) % 1;
      g.strokeStyle = rgba('#e6f6ff', 0.45 * (1 - p)); g.lineWidth = 2;
      g.beginPath(); g.arc(hold.x, hold.y, 12 + p * 22, 0, TAU); g.stroke();
    }
  }

  // ------------------------------------------------------------- frame --
  function frame(dt, t) {
    if (destroyed || failed) return;
    dt = Math.min(0.05, Math.max(0, dt || 0));
    if (rm() !== rmWas) { rmWas = rm(); layer.setReducedMotion(rmWas); }
    // the belief rests a little lower in the area (its words above it), and follows the area as it changes
    const h = home();
    if (Math.hypot(h.x - belief.home.x, h.y - belief.home.y) > 24 && !belief.pressed) belief.moveHome(h);
    stepRoom(dt);
    drawRoom();
    layer.frame(dt, t, g);
    stepMoments(dt);
    drawMoments();
    if (!rm()) motes.draw(g, dt);
    checkRun(dt);
  }

  function checkRun(dt) {
    if (!run) return;
    run.t += dt;
    let done = false;
    if (run.kind === 'loosen') {
      const ex = belief.explored;
      const ps = belief.propState;
      if (!announced.prop) {
        const said = ctx.prop === 'stone' ? ps.down > 0.2 : ex >= DONE_AT.loosen;
        if (said) { announced.prop = true; ctx.say?.(BELIEF.heard[{ stone: 'set', shell: 'open', thread: 'loose', charm: 'light' }[ctx.prop]]); }
      }
      // the stone lands before it is done (it is seen being set down)
      done = ex >= DONE_AT.loosen && (ctx.prop !== 'stone' || ps.landed || ps.down >= 1 || run.t - (run.at ||= run.t) > 2.4);
      if (ex < DONE_AT.loosen) run.at = 0;
    } else if (run.kind === 'room') {
      done = room >= DONE_AT.room && !hold;
    } else if (run.kind === 'shape') {
      if (run.count < DONE_AT.shape && !moments.some((m) => m.state === 'waiting' || m.state === 'moving' || m.state === 'held')) offerMoment();
      done = run.count >= DONE_AT.shape && !moments.some((m) => m.state === 'moving');
    }
    if (done) { const r_ = run; run = null; r_.resolve({ done: true }); }
  }

  // ------------------------------------------------------------- input --
  const owned = new Map();   // pointer id → 'moment' | 'belief' | 'room'
  function pointer(e) {
    if (destroyed || failed) return false;
    if (e.type === 'down') {
      const m = run?.kind === 'shape' ? momentAt(e.x, e.y) : null;
      if (m) { m.state = 'held'; m.held = { x0: e.x, y0: e.y, t0: e.t || performance.now(), x: e.x, y: e.y, t: e.t || performance.now(), vx: 0, vy: 0 }; owned.set(e.id, { kind: 'moment', m }); ctx.haptic?.('light'); return true; }
      if (layer.pointer(e)) { owned.set(e.id, { kind: 'belief' }); return true; }
      if (run?.kind === 'room') {
        const a = A();
        if (e.x >= a.x && e.x <= a.x + a.w && e.y >= a.y && e.y <= a.y + a.h) { hold = { x: e.x, y: e.y }; owned.set(e.id, { kind: 'room' }); ctx.haptic?.('light'); return true; }
      }
      return false;
    }
    const o = owned.get(e.id);
    if (!o) return false;
    if (o.kind === 'belief') { const ok = layer.pointer(e); if (e.type === 'up' || e.type === 'cancel') owned.delete(e.id); return ok; }
    if (o.kind === 'room') {
      if (e.type === 'move') { hold = { x: e.x, y: e.y }; return true; }
      if (e.type === 'up' || e.type === 'cancel') { hold = null; owned.delete(e.id); }
      return true;
    }
    if (o.kind === 'moment') {
      const m = o.m, H = m.held, tt = e.t || performance.now();
      if (e.type === 'move' && H) {
        const dt = Math.max(1, tt - H.t) / 1000;
        H.vx = lerp(H.vx, (e.x - H.x) / dt, 0.5); H.vy = lerp(H.vy, (e.y - H.y) / dt, 0.5);
        H.x = e.x; H.y = e.y; H.t = tt;
        const a = A();
        m.x = clamp(e.x, a.x + MR(), a.x + a.w - MR()); m.y = clamp(e.y, a.y + MR(), a.y + a.h - MR());
        return true;
      }
      if (e.type === 'up' || e.type === 'cancel') {
        owned.delete(e.id);
        const moved = H ? Math.hypot(H.x - H.x0, H.y - H.y0) : 0;
        if (e.type === 'cancel' && moved < 8) { m.state = 'waiting'; m.held = null; return true; }
        m.held = null;
        launch(m, moved > 24 ? H.vx : null, moved > 24 ? H.vy : null);
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------ the API --
  const stage = {
    id: 'belief', belief, layer, tags, frame, pointer,
    get failed() { return failed; }, set failed(v) { failed = !!v; if (failed) stop(); },
    /** Another Angle's stage hides the assist pill once this is true (no experience under way). */
    get settled() { return !run; },
    get experience() { return run?.kind || null; },
    run(kind, { onMoment = null } = {}) {
      stop();
      if (destroyed || failed) return Promise.resolve({ stopped: true });
      return new Promise((resolve) => {
        run = { kind, resolve, t: 0, count: 0, onMoment };
        if (kind === 'shape') offerMoment();
        if (kind === 'loosen') announced.prop = false;
        // moments still waiting from an earlier look drift off quietly
        if (kind !== 'shape') for (const m of moments) if (m.state === 'waiting') { m.state = 'passed'; m.told = true; m.vx = 0; m.vy = 0; }
      });
    },
    /** The assist pill (instead of touch): one step of the experience under way. */
    assist() {
      if (!run) return;
      if (run.kind === 'loosen') belief.explore(Math.min(1, belief.explored + 0.26));
      else if (run.kind === 'room') { room = Math.min(1, room + 0.34); belief.farther(room * 0.6); belief.makeSpace(room); if (room >= 1 && !announced.room) { announced.room = true; ctx.say?.(BELIEF.heard.room); } }
      else if (run.kind === 'shape') { const m = moments.find((x) => x.state === 'waiting'); if (m) launch(m); }
    },
    /** What "Keep it on this phone" keeps (never pixels). */
    snapshot() { return { prop: ctx.prop, explored: +belief.explored.toFixed(3), room: +room.toFixed(3) }; },
    /** How heavy it is now, 0 … 1 of its prop's full weight. */
    get pull() { return pullOf(belief); },
    bodies() {
      BL.begin();
      for (const q of layer.rects(rectsTL)) BL.box(q.left, q.top, q.right, q.bottom);
      const pr = belief.propRect?.();
      if (pr) BL.box(pr.left, pr.top, pr.right, pr.bottom);
      for (const m of moments) if (m.fade > 0.05) BL.circle(m.x, m.y, MR(), 2);
      return BL.end();
    },
    avoid() {
      AL.begin();
      for (const q of stage.bodies()) AL.box(q.left, q.top, q.right, q.bottom);
      for (const q of tags.rects()) AL.box(q.left, q.top, q.right, q.bottom);
      return AL.end();
    },
    /** QA (localhost): where things are. */
    probe() { const b = bodyOf(); return { belief: { x: b.cx, y: b.cy, explored: belief.explored, z: belief.z, pull: pullOf(belief), down: belief.propState.down }, room, moments: moments.map((m) => ({ label: m.label, x: m.x, y: m.y, state: m.state })), run: run?.kind || null }; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      tags.clear();
      try { layer.destroy(); } catch { /* ignore */ }
    },
  };
  function stop() { if (run) { const r_ = run; run = null; r_.resolve({ stopped: true }); } hold = null; }
  return stage;
}
