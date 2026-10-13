// Luminous Ocean, review r4: the melt ends a moment after the director's (no livelock, no shuffle), bubbles never stack
// or cover the thought in play, the crest light is smooth (no zigzag, no hairline, nothing seen end-on), and a long
// stroke on a wide screen never raises a wall of water — while the Stokes drift that carries the thought is unchanged.
// Headless (a fake DOM), with the geometry the browser review measured (real postcard positions, the host Mallow
// swapped mid-melt as the shell does). Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Sea, swellCap, makeCamera, strokePacket } from '../src/hushfold/flow/worlds/ocean-sea.js';
import { createRegistry, WORLDS } from '../src/hushfold/flow/registry.js';

function installFakeDom(W, H) {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const noop = () => {};
  const ctx2d = (c) => new Proxy({
    canvas: c,
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 8.4 }), getTransform: () => ({ a: 1, e: 0 }),
  }, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => { const c = { style: {}, className: '', width: 0, height: 0, children: [], setAttribute() {}, append(...x) { this.children.push(...x); }, remove() {}, addEventListener() {}, removeEventListener() {}, clientWidth: W, clientHeight: H }; c.getContext = () => ctx2d(c); return c; };
  globalThis.document = { createElement: () => el(), addEventListener() {}, removeEventListener() {}, hidden: false };
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return { el, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
const box = ([l, t, r, b]) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t });
const fakeThought = () => ({ id: 't', token: 'My boss embarrassed me today.', text: 'My boss embarrassed me today.', x: 0, y: 0, z: 0, scale: 1, state: { tension: 0.6 }, react() {}, hitTest: () => false, pointer() {} });
const subtitles = () => ({ say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} });

// ------------------------------------------------------------------ melt --
// The storms the r4 review melted in the lab (seven photos, every postcard hanging, the Glitzi → Loomi host swap halfway).
const MELTS = [
  { tag: '390×844, 7 photos, quick storm', W: 390, H: 844, n: 7, cards: [[5, 92, 351, 78, 78], [6, 207, 353, 78, 61], [0, 329, 352, 62, 78], [1, 70, 267, 56, 78], [2, 154, 268, 78, 56], [3, 241, 268, 78, 78], [4, 329, 267, 78, 56]], th: [105, 440], heroA: [79.4, 525.7, 310.6, 746.4], heroB: [84.6, 493.9, 303.5, 731.6] },
  { tag: '390×844, 7 photos, completed storm', W: 390, H: 844, n: 7, cards: [[3, 76, 345, 78, 78], [4, 195, 343, 78, 56], [5, 309, 343, 78, 78], [6, 61, 258, 78, 61], [0, 150, 262, 62, 78], [1, 236, 262, 56, 78], [2, 322, 258, 78, 56]], th: [105, 440], heroA: [79.4, 526.3, 310.6, 747], heroB: [82.8, 493, 303.7, 732.5] },
  { tag: '375×812, 7 photos', W: 375, H: 812, n: 7, cards: [[5, 93, 340, 74, 74], [6, 203, 341, 74, 58], [0, 316, 341, 58, 74], [1, 66, 260, 53, 74], [2, 151, 260, 74, 53], [3, 234, 260, 74, 74], [4, 316, 260, 74, 53]], th: [101, 421], heroA: [76.1, 506.1, 298.9, 718.7], heroB: [82.3, 475.4, 291.9, 703.2] },
  { tag: '390×844, the seven-Mallow fallback', W: 390, H: 844, n: 7, cards: [[5, 92, 351, 62, 78], [6, 208, 358, 62, 78], [0, 331, 353, 62, 78], [1, 71, 267, 62, 78], [2, 169, 268, 62, 78], [3, 252, 267, 62, 78], [4, 331, 267, 62, 78]], th: [105, 440], heroA: [79.4, 526.3, 310.6, 747], heroB: [84.6, 493.9, 303.5, 731.6] },
  // (the hero a few px further left than measured — the narrow side's slots once all went to the other side: a queue of six)
  { tag: '390×844, the seven-Mallow fallback, the hero 6 px further left', W: 390, H: 844, n: 7, cards: [[5, 92, 351, 62, 78], [6, 208, 358, 62, 78], [0, 331, 353, 62, 78], [1, 71, 267, 62, 78], [2, 169, 268, 62, 78], [3, 252, 267, 62, 78], [4, 331, 267, 62, 78]], th: [105, 440], heroA: [73.4, 518.3, 304.6, 739], heroB: [78.6, 485.9, 297.5, 723.6] },
  { tag: '320×568, 7 photos', W: 320, H: 568, n: 7, cards: [[0, 173, 244, 62, 79], [1, 262, 244, 57, 79]], th: [86, 255], heroA: [81.4, 342.1, 238.6, 492.2], heroB: [85.8, 321.8, 233.7, 482.5] },
];

test('melt (review r4): every glide is planned — the ocean’s melt ends within 2.5 s of the director’s; no shuffle, no winding, nothing covered, nothing popped', async () => {
  for (const C of MELTS) {
    const dom = installFakeDom(C.W, C.H);
    let D = null;
    try {
      const { createHushflow } = await import('../src/hushfold/flow/director.js');
      const { W, H } = C;
      let heroNow = box(C.heroA);
      const mallow = { rect: () => heroNow, bodyRect: () => heroNow, react() {}, setEmotion() {}, lookAt() {}, float() {} };
      const cards = C.cards.map(([i, x, y, w, h]) => ({ i, x, y, w, h, rot: 0.05, state: 'grounded' }));
      const STORM = { ...WORLDS[0], load: async () => ({ create: () => ({ prepare() {}, enter() {}, frame() {}, pointer() {}, outro() {}, intro() {}, get progress() { return 1; }, get complete() { return true; }, get metrics() { return {}; },
        handoff: () => ({ horizonY: 0.655 * H, seeds: [[[40, 0.7 * H], [W / 2, 0.7 * H + 4], [W - 40, 0.7 * H]]], thought: { x: C.th[0], y: C.th[1], scale: 1, tension: 0.3, r: 30, labelW: 260 }, photos: cards, energy: 0.1 }),
        serialize: () => ({ v: 1 }), restore() {}, pause() {}, resume() {}, destroy() {} }) }) };
      const photos = { n: C.n, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) };
      D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought: fakeThought(), photos, subtitles: subtitles(), registry: createRegistry([STORM, WORLDS[1]]), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
      await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
      assert.ok(D.next(), C.tag);
      for (let i = 0; i < 300 && D.state.phase !== 'melting'; i++) { D.debug.step(1 / 60); await new Promise((r) => setTimeout(r, 2)); }
      assert.equal(D.state.phase, 'melting', C.tag);
      const ocean = D.incoming;
      let dirEnd = -1, end = -1, worstStep = 0, overB = 0, overT = 0, overH = 0, prev = null, glideAfter = 0, skyAfter = 0, skyDeep = 0;
      const wind = new Map(), ang = new Map();
      for (let f = 0; f < 30 * 14; f++) {
        D.debug.step(1 / 30);
        if (D.state.melt != null && D.state.melt >= 0.5) heroNow = box(C.heroB);      // (the shell hands the stage to Loomi halfway)
        if (dirEnd < 0 && D.state.phase === 'playing') dirEnd = f;
        if (dirEnd >= 0 && end < 0 && !ocean.debug.melt) end = f;
        if (end >= 0 && f > end + 90 && ocean.debug.bubbles.some((b) => b.state === 'glide')) glideAfter++;
        // (once the director's melt is over, nothing is left gliding in the sky: every bubble's waterline is on the water)
        if (dirEnd >= 0) for (const b of ocean.debug.bubbles) if (b.alpha > 0.3 && b.state === 'glide') { const up = ocean.debug.hy - (b.sy + 0.3 * b.D); if (up > 0) { skyAfter++; skyDeep = Math.max(skyDeep, up); } }
        const T = ocean.debug.thought, rr = T.r * T.surf, K = heroNow, kw = K.right - K.left;
        const bs = ocean.debug.bubbles.filter((b) => b.alpha > 0.3 && b.state !== 'leave' && b.state !== 'card');
        for (let a = 0; a < bs.length; a++) for (let c = a + 1; c < bs.length; c++) {
          const A = bs[a], B = bs[c], d = Math.hypot(A.sx - B.sx, A.sy - B.sy);
          overB = Math.max(overB, (A.D + B.D) / 2 - d);
          // winding: how far the line between two close bubbles turns (one passing round another)
          const key = `${A.i}-${B.i}`, an = Math.atan2(B.sy - A.sy, B.sx - A.sx), close = d < (A.D + B.D) / 2 + 40;
          const p = ang.get(key);
          if (p && close && p[1]) { let da = an - p[0]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; wind.set(key, (wind.get(key) || 0) + da); }
          ang.set(key, [an, close]);
        }
        if (T.alpha * T.vis > 0.3) for (const b of bs) overT = Math.max(overT, b.D / 2 + rr - Math.hypot(b.sx - T.sx, b.sy - T.sy));
        for (const b of bs) { const ox = Math.min(b.sx + b.D / 2, K.right - 0.06 * kw) - Math.max(b.sx - b.D / 2, K.left + 0.06 * kw), oy = Math.min(b.sy + b.D / 2, K.bottom) - Math.max(b.sy - b.D / 2, K.top + 2); if (ox > 0 && oy > 0) overH = Math.max(overH, Math.min(ox, oy)); }
        if (prev) for (const b of bs) { const q = prev.get(b.i); if (q) worstStep = Math.max(worstStep, Math.hypot(b.sx - q[0], b.sy - q[1])); }
        prev = new Map(bs.map((b) => [b.i, [b.sx, b.sy]]));
      }
      assert.ok(dirEnd > 0, `${C.tag}: the director's melt finished`);
      assert.ok(end >= 0 && end - dirEnd <= 15, `${C.tag}: the ocean's own melt ended ${((end - dirEnd) / 30).toFixed(2)} s after the director's (its queue keeps time with it: ≤ 0.5 s; the hard deadline is 2.5 s)`);
      assert.equal(glideAfter, 0, `${C.tag}: nothing still glides 3 s after the melt`);
      assert.ok(skyAfter <= 3 && skyDeep <= 6, `${C.tag}: bubbles still glided in the sky after the director's melt (${skyAfter} bubble-frames, up to ${skyDeep.toFixed(1)} px above the horizon)`);
      // (a glide may run up to 1.25× its own pace to be down by the end of the director's melt: never a jump all the same)
      assert.ok(worstStep <= 8, `${C.tag}: a bubble moved ${worstStep.toFixed(1)} px in one 1/30 s step`);
      assert.ok(overB <= 1, `${C.tag}: two bubbles overlapped by ${overB.toFixed(1)} px`);
      assert.ok(overT <= 0.5, `${C.tag}: a bubble covered the thought by ${overT.toFixed(1)} px`);
      assert.equal(overH, 0, `${C.tag}: a bubble on the hero (${overH.toFixed(1)} px)`);
      const worstWind = Math.max(0, ...[...wind.values()].map((v) => Math.abs(v) * 180 / Math.PI));
      assert.ok(worstWind <= 120, `${C.tag}: two bubbles wound round each other by ${worstWind.toFixed(0)}°`);
      const w = D.world;
      assert.equal(w.metrics.bubbles + w.metrics.waiting, C.n, `${C.tag}: every photo is still there`);
      assert.ok(w.debug.bubbles.length >= Math.min(C.n, C.cards.length), `${C.tag}: every postcard that hung in the storm landed on the water`);
    } finally { D?.destroy(); dom.restore(); }
  }
});

// ------------------------------------------------------------------ play --
async function oceanAt(W, H, n, hero) {
  const dom = installFakeDom(W, H);
  const { createHushflow } = await import('../src/hushfold/flow/director.js');
  const r = box(hero);
  const mallow = { rect: () => r, bodyRect: () => r, react() {}, setEmotion() {}, lookAt() {}, float() {} };
  const photos = { n, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) };
  const D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought: fakeThought(), photos, subtitles: subtitles(), registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
  await D.start({ worldId: 'luminous-ocean', emotion: 'sad', intention: 'calm' });
  return { D, w: D.world, dom };
}
function stroke(D, x0, y0, x1, y1, pxPerSec, each) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round((len / pxPerSec) * 30));
  let t = D.debug.time * 1000;
  D.pointer({ type: 'down', id: 1, x: x0, y: y0, t, pointerType: 'touch' });
  for (let i = 1; i <= n; i++) { t += 1000 / 30; D.pointer({ type: 'move', id: 1, x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, t, pointerType: 'touch' }); D.debug.step(1 / 30); each?.(); }
  D.pointer({ type: 'up', id: 1, x: x1, y: y1, t: t + 16, pointerType: 'touch' });
}

test('play (review r4): bubbles never stack or cover the thought — swells sent away and back, seven photos crowding the near water', async () => {
  for (const [W, H, n, hero] of [[390, 844, 7, [84.6, 493.9, 303.5, 731.6]], [375, 812, 7, [82.3, 475.4, 291.9, 703.2]], [320, 568, 3, [85.8, 321.8, 233.7, 482.5]]]) {
    const tag = `${W}×${H} with ${n} photos`;
    const { D, w, dom } = await oceanAt(W, H, n, hero);
    try {
      let frames = 0, bbFrames = 0, bbMax = 0, btMax = 0, stepMax = 0;
      const prev = new Map();
      const check = () => {
        frames++;
        const T = w.debug.thought, rr = T.r * T.surf, bs = w.debug.bubbles.filter((b) => b.alpha > 0.2 && b.state !== 'leave' && b.state !== 'dive');
        let worst = 0;
        for (let a = 0; a < bs.length; a++) for (let c = a + 1; c < bs.length; c++) worst = Math.max(worst, (bs[a].D + bs[c].D) / 2 - Math.hypot(bs[a].sx - bs[c].sx, bs[a].sy - bs[c].sy));
        if (worst > 1.5) bbFrames++;
        bbMax = Math.max(bbMax, worst);
        if (T.alpha * T.vis > 0.2) for (const b of bs) btMax = Math.max(btMax, b.D / 2 + rr - Math.hypot(b.sx - T.sx, b.sy - T.sy));
        for (const b of w.debug.bubbles) { const p = prev.get(b.i); if (p && p[2] === 'float' && b.state === 'float' && b.alpha > 0.3) stepMax = Math.max(stepMax, Math.hypot(b.sx - p[0], b.sy - p[1])); prev.set(b.i, [b.sx, b.sy, b.state]); }
      };
      const steps = (sec) => { for (let t = 0; t < sec; t += 1 / 30) { D.debug.step(1 / 30); check(); } };
      steps(4);
      const g = w.debug, hy = g.hy, K = g.hero, U = Math.min(W, H), fl = H - 66;
      // out: slow long strokes up the water beside the hero and across it
      for (const [a, b] of [[[22, Math.min(fl, K.liveBottom - 10)], [30, hy + 16]], [[W - 22, Math.min(fl, K.liveBottom - 10)], [W - 30, hy + 16]], [[W * 0.3, hy + 0.55 * (K.top - hy)], [W * 0.32, hy + 10]], [[16, fl], [W - 40, hy + 14]], [[22, Math.min(fl, K.liveBottom - 10)], [30, hy + 16]]]) { stroke(D, a[0], a[1], b[0], b[1], 0.2 * U, check); steps(2.6); }
      const far = w.metrics.dist;
      // back: strokes towards you, pushing every bubble into the near water beside the hero
      for (const [a, b] of [[[W - 22, K.top + 10], [W - 24, fl]], [[22, K.top + 10], [24, fl]], [[W * 0.8, hy + 10], [W * 0.82, K.top - 4]], [[W - 22, K.top + 10], [W - 24, fl]], [[30, hy + 12], [W - 16, fl]], [[22, K.top + 10], [24, fl]], [[W * 0.22, hy + 10], [W * 0.2, K.top - 4]], [[W * 0.8, hy + 10], [W * 0.82, K.top - 4]]]) { stroke(D, a[0], a[1], b[0], b[1], 0.2 * U, check); steps(2.6); }
      steps(4);
      assert.ok(far >= 3.6, `${tag}: five slow strokes still carry the thought out (${far.toFixed(2)}·Z0): the swell cap leaves the drift alone`);
      assert.ok(w.metrics.dist <= 1.6, `${tag}: …and strokes towards you bring it back (${w.metrics.dist.toFixed(2)}·Z0)`);
      assert.ok(bbFrames <= 6 && bbMax <= 6, `${tag}: bubbles overlapped in ${bbFrames} of ${frames} frames (max ${bbMax.toFixed(1)} px)`);
      assert.ok(btMax <= 1, `${tag}: a bubble covered the thought by ${btMax.toFixed(1)} px`);
      assert.ok(stepMax <= 10, `${tag}: a floating bubble jumped ${stepMax.toFixed(1)} px in one frame`);
      assert.equal(w.metrics.bubbles + w.metrics.waiting, n, `${tag}: every photo is still there`);
    } finally { D.destroy(); dom.restore(); }
  }
});

// ------------------------------------------------------------------ slots --
test('slots (review r4): the two sides of the hero stay about even — a hero a few px wider never sends every slot to one side', async () => {
  const { planOcean } = await import('../src/hushfold/flow/worlds/ocean-rules.js');
  for (const [l, t, r, b] of [[79.4, 526.3, 310.6, 747], [73.4, 508.3, 304.6, 739], [85.4, 526.3, 316.6, 747], [73.4, 526.3, 316.6, 747]]) {
    const p = planOcean({ W: 390, H: 844, band: { x: 0, y: 76, w: 390, h: 143 }, mallow: { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t }, n: 7, textW: 190, plate: { w: 209, h: 59 } });
    const cx = (l + r) / 2, nL = p.slots.filter((q) => q.x < cx).length, nR = p.slots.length - nL;
    assert.equal(p.slots.length, 7, `hero ${l}–${r}: ${p.slots.length} slots`);
    assert.ok(Math.abs(nL - nR) <= 1, `hero ${l}–${r}: ${nL} slots on the left, ${nR} on the right`);
    for (const q of p.slots) assert.ok(q.D >= 28 && q.x - q.D / 2 >= 19.9 && q.x + q.D / 2 <= 370.1, `slot ${JSON.stringify(q)}`);
  }
});

// ----------------------------------------------------------------- crests --
test('crest light (review r4): smooth curves — no zigzag, points a few px apart, faint tails gone; a swell sent across the view lights no ruled line', async () => {
  for (const [W, H, hero] of [[390, 844, [84.6, 493.9, 303.5, 731.6]], [1280, 800, [470, 450, 810, 720]]]) {
    const { D, w, dom } = await oceanAt(W, H, 3, hero);
    try {
      for (let t = 0; t < 4; t += 1 / 30) D.debug.step(1 / 30);
      const g = w.debug, hy = g.hy, K = g.hero, U = Math.min(W, H);
      let lines = 0, worstTurn = 0, worstGap = 0, steep = 0;
      const look = () => {
        for (const c of w.debug.crests) {
          if (c.closed) continue;
          lines++;
          const P = c.pts;
          for (let m = 1; m < P.length; m++) if (P[m][0] > 0 && P[m][0] < W && P[m - 1][0] > 0 && P[m - 1][0] < W) worstGap = Math.max(worstGap, Math.hypot(P[m][0] - P[m - 1][0], P[m][1] - P[m - 1][1]));
          for (let m = 1; m < P.length - 1; m++) {
            if (P[m][2] < 0.05) continue;
            const ux = P[m][0] - P[m - 1][0], uy = P[m][1] - P[m - 1][1], vx = P[m + 1][0] - P[m][0], vy = P[m + 1][1] - P[m][1], lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
            if (lu < 0.5 || lv < 0.5) continue;
            worstTurn = Math.max(worstTurn, (Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)))) * 180) / Math.PI);
          }
          // a lit line running steeply down the screen is a crest seen end-on (towards the vanishing point)
          const lit = P.filter((p) => p[2] > 0.1);
          if (lit.length > 3) { const a = lit[0], b = lit[lit.length - 1]; if (Math.abs(b[1] - a[1]) > 1.2 * Math.abs(b[0] - a[0]) && Math.hypot(b[0] - a[0], b[1] - a[1]) > 60) steep++; }
        }
      };
      const run = (pts) => { stroke(D, pts[0][0], pts[0][1], pts[1][0], pts[1][1], 0.22 * U, look); for (let t = 0; t < 2; t += 1 / 30) { D.debug.step(1 / 30); look(); } };
      const wy = hy + 0.5 * (K.top - hy);
      run([[W * 0.08, wy], [W * 0.92, wy - 6]]);                                 // across the view
      run([[W * 0.1, K.top - 10], [W * 0.85, hy + 0.15 * (K.top - hy)]]);        // diagonal, away
      run([[W * 0.3, Math.min(H - 40, K.top + 0.15 * (H - 40 - K.top))], [W * 0.32, hy + 0.2 * (K.top - hy)]]);   // away
      assert.ok(lines > 20, `${W}×${H}: crest light was traced (${lines} lines over the frames)`);
      assert.ok(worstTurn <= 30, `${W}×${H}: a lit crest turned ${worstTurn.toFixed(1)}° between two points (a kink)`);
      assert.ok(worstGap <= 12, `${W}×${H}: crest points ${worstGap.toFixed(1)} px apart on screen`);
      assert.equal(steep, 0, `${W}×${H}: ${steep} lit crest lines ran steeply towards the vanishing point`);
    } finally { D.destroy(); dom.restore(); }
  }
});

// ------------------------------------------------------------- swell cap --
test('swell cap (review r4): a long slow stroke on a wide screen never raises a wall — how tall a swell looks is capped, what it carries is not', async () => {
  // the cap itself: 0.03 H on screen at the hero's waterline, on every screen
  for (const [W, H] of [[390, 844], [375, 812], [320, 568], [1280, 800], [844, 390]]) {
    const cam = makeCamera({ W, H, hy: 0.44 * H, homeY: 0.53 * H, waterY: 0.84 * H });
    const sW = (cam.waterY - cam.hy) / cam.Hw;
    assert.ok(Math.abs(swellCap(cam) * sW - 0.03 * H) < 0.01, `${W}×${H}`);
  }
  // the sea: heights, slopes and crest shifts saturate at capA; the drift does not
  const sea = new Sea(), o = {}, oc = {};
  sea.launch({ x: 0, z: 600, dx: 0, dz: 1, lambda: 900, A: 60, len: 1600 });
  sea.prepare(); sea.sample(0, 600, o);
  sea.capA = 15; sea.prepare(); sea.sample(0, 600, oc);
  assert.ok(Math.abs(o.h) > 50 && Math.abs(oc.h) <= 15.01, `height ${o.h.toFixed(1)} → ${oc.h.toFixed(1)}`);
  assert.ok(Math.abs(oc.uz - o.uz) < 1e-9, 'the Stokes drift is the stroke’s own');
  // in the world: a long slow stroke across the near water at 1280×800 (the review's 1075 px stroke)
  const { D, w, dom } = await oceanAt(1280, 800, 3, [470, 450, 810, 720]);
  try {
    for (let t = 0; t < 4; t += 1 / 30) D.debug.step(1 / 30);
    const hy = w.debug.hy, cam = w.debug.cam;
    const P = strokePacket(cam, 800, { x0: 100, y0: 560, x1: 1175, y1: 555, len: 1075, speed: 170 });
    assert.ok(P.A > w.debug.sea.capA * 2, `the stroke's own swell (A ${P.A.toFixed(0)}) is far taller than the cap (${w.debug.sea.capA.toFixed(1)})`);
    // (out to the hero's waterline: the cap's own place; and anywhere, down to the bottom edge where the view is nearest)
    const sW = (cam.waterY - cam.hy) / cam.Hw;
    let peakW = 0, peak = 0;
    const look = () => { peakW = Math.max(peakW, w.debug.peakLift(sW)); peak = Math.max(peak, w.debug.peakLift()); };
    stroke(D, 100, 560, 1175, 555, 170, look);
    for (let t = 0; t < 3; t += 1 / 30) { D.debug.step(1 / 30); look(); }
    assert.ok(peakW <= 0.055 * 800, `the water rose ${peakW.toFixed(1)} px on screen out to the hero's waterline (cap ${(0.03 * 800).toFixed(0)} px a swell, a little more where swells meet)`);
    assert.ok(peak <= 0.08 * 800, `…and ${peak.toFixed(1)} px down at the bottom edge`);
    assert.ok(hy > 0);
  } finally { D.destroy(); dom.restore(); }
});
