// The person's Thought Mallow moves continuously in the two worlds whatever presses on it (H2/H3 review r1, for B1):
// in the Static Storm postcards it cannot push aside make it give way at most a few px a frame (its rest place goes
// with it), it stays on the screen and off Glitzi; in the Luminous Ocean a cold start with the thought already on
// screen glides it from there (never a jump to its home on the water, never a size pop), and with reduced motion a
// melt fades the layer's thought out where it hung before it is moved home. Headless through the director, stepped at
// 1/60 s. Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORLDS, createRegistry } from '../src/hushfold/flow/registry.js';

function installFakeDom(W = 390, H = 844) {
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
const subtitles = { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} };
/** The shell's world-mode hero (Glitzi on the floor). */
const heroBox = (W, H) => {
  const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
  return { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B, bottom, width: B, height: B, cx: W / 2, cy: bottom - B / 2 };
};
const fakeMallow = (r) => ({ rect: () => r, bodyRect: () => r, react() {}, setEmotion() {}, lookAt() {}, float() {} });
/** A stand-in for W2's ThoughtMallow (no draw(): the layer draws it), with its own radius, depth and opacity. */
function layerThought({ x, y, z = 0, r = 38 }) {
  const h = {
    id: 'th-1', token: 'My boss embarrassed me in front of everyone today.', text: 'My boss embarrassed me in front of everyone today.', r, scale: 1, x, y, z, rot: 0, labelSide: null, state: {}, opacity: 1,
    ov: { appear: 1 }, react() {}, soften() {}, settle() {}, hitTest: () => false, pointer() {},
    extent(out = {}) { const P = h.r * h.scale * (1 - 0.5 * h.z); out.left = h.x - P; out.right = h.x + P; out.top = h.y - P; out.bottom = h.y + P; out.width = out.right - out.left; out.height = out.bottom - out.top; return out; },
  };
  return h;
}
/** Its layer, with the words the person sees: a three-line tag above the body (206 × 83, as measured at 390). */
const layerOf = (h) => ({
  primary: h, list: [h],
  rects(out = []) { out.length = 0; const e = h.extent({}); const l = Math.min(e.left, h.x - 103), rr = Math.max(e.right, h.x + 103), t = e.top - 91; out.push({ left: l, top: t, right: rr, bottom: e.bottom, width: rr - l, height: e.bottom - t, id: h.id }); return out; },
});
const drawn = (h) => ({ x: h.x, y: h.y - 0.45 * h.r * h.z, P: 2 * h.r * h.scale * (1 - 0.5 * h.z) });

async function play(worldId, h, { W = 390, H = 844, photos = null, reducedMotion = false, registry = null } = {}) {
  const dom = installFakeDom(W, H);
  const { createHushflow } = await import('../src/hushfold/flow/director.js');
  const hero = heroBox(W, H);
  const D = createHushflow({
    worldEl: dom.el(), fxEl: dom.el(), mallow: fakeMallow(hero), thoughts: layerOf(h), subtitles, photos,
    registry: registry || createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion,
  });
  await D.start({ worldId, emotion: worldId === 'static-storm' ? 'angry' : 'embarrassed', intention: 'calm' });
  return { D, dom, hero, done() { D.destroy(); dom.restore(); } };
}

// ---------------------------------------------------------------- storm --
for (const [W, H, x, y] of [[390, 844, 313, 279], [320, 568, 262, 220]]) {
  test(`storm ${W}×${H}: postcards pressing on the thought and its words move it at most a few px a frame; it stays on screen and off Glitzi`, async () => {
    const h = layerThought({ x, y, r: W < 360 ? 32 : 38 });
    const run = await play('static-storm', h, { W, H, photos: { n: 7, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) } });
    try {
      const { D, hero } = run;
      let px = h.x, py = h.y, worst = 0, off = 0, over = 0, at = null;
      for (let i = 0; i < 60 * 8; i++) {
        D.debug.step(1 / 60);
        const j = Math.hypot(h.x - px, h.y - py);
        if (j > worst) { worst = j; at = [i, Math.round(px), Math.round(py), Math.round(h.x), Math.round(h.y)]; }
        px = h.x; py = h.y;
        const e = h.extent({});
        if (e.left < 0 || e.right > W || e.top < 0 || e.bottom > H) off++;
        const top = hero.top - Math.max(12, hero.height * 0.12);
        if (i > 45 && e.right > hero.left + 2 && e.left < hero.right - 2 && e.bottom > top + 2 && e.top < hero.bottom) over++;
      }
      assert.ok(worst < 12, `largest step ${worst.toFixed(1)} px at ${JSON.stringify(at)}`);
      assert.equal(off, 0, `frames partly off the screen: ${off}`);
      assert.equal(over, 0, `frames over Glitzi: ${over}`);
      const T = D.world.debug.thoughtPos();
      assert.ok(T.x > 0 && T.x < W && T.y > 0 && T.y < H, `the storm's own spring stays on screen (${Math.round(T.x)}, ${Math.round(T.y)})`);
    } finally { run.done(); }
  });
}

for (const [W, H, from] of [[390, 844, 'beside'], [320, 568, 'beside'], [390, 844, 'over'], [320, 568, 'over']]) {
  test(`storm ${W}×${H}: taken from ${from === 'beside' ? 'beside' : 'just over'} the person's Mallow, the thought travels to its planned place — postcards on the way make way, it is not left stuck beside Glitzi nor sent up past its place`, async () => {
    // the shell's words are three lines (206 × 83 at 390) and go where the world asks (below) only when there is room
    // above the hero, else above: on the way up they cross the postcards' rows
    // (the hero is still coming down from its place at home — larger, higher — to the world's floor: 0.72 s)
    const world = heroBox(W, H), home = { ...world, top: world.top - 0.35 * world.height, left: world.left - 0.1 * world.width, right: world.right + 0.1 * world.width };
    const hero = { ...home }, r = W < 360 ? 32 : 38;
    // (beside it at the bottom right; or over the top of it, where the way out of its box is up)
    const h = from === 'beside' ? layerThought({ x: world.right + 8, y: world.bottom - 45, r }) : layerThought({ x: W / 2 + 20, y: home.top + r + 4, r });
    const layer = {
      primary: h, list: [h],
      rects(out = []) {
        out.length = 0; const e = h.extent({}); const l = Math.min(e.left, h.x - 103), rr = Math.max(e.right, h.x + 103);
        const below = h.labelSide === 'below' && !(rr > hero.left && l < hero.right && e.bottom + 91 > hero.top - 4) && e.bottom + 91 < H;
        out.push(below ? { left: l, top: e.top, right: rr, bottom: e.bottom + 91, id: h.id } : { left: l, top: e.top - 91, right: rr, bottom: e.bottom, id: h.id });
        return out;
      },
    };
    const dom = installFakeDom(W, H);
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const D = createHushflow({
      worldEl: dom.el(), fxEl: dom.el(), mallow: fakeMallow(hero), thoughts: layer, subtitles,
      photos: { n: 7, draw: () => ({ w: 1, h: 1 }), size: (i, k, s) => ({ w: Math.round(s * 0.78), h: Math.round(s) }) },
      registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(),
    });
    try {
      await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
      let px = h.x, py = h.y, worst = 0, past = -Infinity, inBand = 0;
      for (let i = 0; i < 60 * 6; i++) {
        if (i <= 43) { const k = i / 43; for (const q of ['left', 'right', 'top']) hero[q] = home[q] + (world[q] - home[q]) * k; hero.width = hero.right - hero.left; hero.height = hero.bottom - hero.top; }
        D.debug.step(1 / 60);
        worst = Math.max(worst, Math.hypot(h.x - px, h.y - py));
        // (the place is re-planned once the hero has settled: measured against the plan of the moment, while it rises)
        const P = D.world.layoutPlan.thought, b = D.world.subtitleBand();
        if (h.y < py - 0.01) past = Math.max(past, P.y - h.y);
        px = h.x; py = h.y;
        if (h.extent({}).top < b.y + b.h - 3) inBand++;
      }
      const T = D.world.layoutPlan.thought;
      const d = Math.hypot(h.x - T.x, h.y - T.y);
      assert.ok(worst < 12, `largest step ${worst.toFixed(1)} px`);
      // (the hero's edge it slid round on the way does not send it on past its place, up towards the band)
      assert.ok(past < T.r + 12, `it never rises far past its place (${Math.round(past)} px above it at most)`);
      assert.equal(inBand, 0, `frames with its body in the subtitle band: ${inBand}`);
      assert.ok(d < 2.2 * T.r + 10, `it ends ${Math.round(d)} px from its planned place (${Math.round(T.x)}, ${Math.round(T.y)}; it is at ${Math.round(h.x)}, ${Math.round(h.y)})`);
      const e = h.extent({}), top = hero.top - Math.max(12, hero.height * 0.12);
      assert.ok(!(e.right > hero.left + 2 && e.left < hero.right - 2 && e.bottom > top + 2 && e.top < hero.bottom), 'and it is not on Glitzi');
    } finally { D.destroy(); dom.restore(); }
  });
}

test('storm 320×568: the shell\'s garden card below the thought (ctx.keepOut) moves it up out of the way — into the quiet band if that is the only room — gently, on screen', async () => {
  const W = 320, H = 568, hero = heroBox(W, H);
  const h = layerThought({ x: 86, y: 237, r: 32 });
  const dom = installFakeDom(W, H);
  const { createHushflow } = await import('../src/hushfold/flow/director.js');
  let card = null;
  const D = createHushflow({
    worldEl: dom.el(), fxEl: dom.el(), mallow: fakeMallow(hero), thoughts: layerOf(h), subtitles,
    photos: { n: 7, draw: () => ({ w: 1, h: 1 }), size: (i, k, s) => ({ w: Math.round(s * 0.78), h: Math.round(s) }) },
    registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), keepOut: () => (card ? [card] : []),
  });
  try {
    await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
    for (let i = 0; i < 60 * 3; i++) D.debug.step(1 / 60);
    // the card opens just under the thought's middle, across the screen (as measured at 320: 16..304)
    const e0 = h.extent({});
    card = { left: 16, top: Math.round((e0.top + e0.bottom) / 2), right: 304, bottom: Math.round((e0.top + e0.bottom) / 2) + 155 };
    let px = h.x, py = h.y, worst = 0;
    for (let i = 0; i < 60 * 3; i++) { D.debug.step(1 / 60); worst = Math.max(worst, Math.hypot(h.x - px, h.y - py)); px = h.x; py = h.y; }
    const e = h.extent({});
    assert.ok(worst < 12, `largest step ${worst.toFixed(1)} px`);
    assert.ok(e.bottom <= card.top + 2, `its body is clear of the card (bottom ${Math.round(e.bottom)}, card top ${card.top})`);
    assert.ok(e.top >= 0, 'and on the screen');
  } finally { D.destroy(); dom.restore(); }
});

// ---------------------------------------------------------------- ocean --
for (const [W, H, x, y] of [[390, 844, 322, 276], [320, 568, 276, 212]]) {
  test(`ocean ${W}×${H}, a cold start with the thought on screen: it glides from where it is drawn — no jump, no size pop`, async () => {
    const h = layerThought({ x, y, z: 0.2, r: W < 360 ? 32 : 38 });
    const d0 = drawn(h);
    const run = await play('luminous-ocean', h, { W, H, photos: { n: 4, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) } });
    try {
      const { D } = run;
      D.debug.step(1 / 60);
      let p = drawn(h);
      assert.ok(Math.hypot(p.x - d0.x, p.y - d0.y) < 3, `its first frame is where it was drawn (${p.x.toFixed(1)}, ${p.y.toFixed(1)} vs ${d0.x}, ${d0.y.toFixed(1)})`);
      assert.ok(Math.abs(p.P / d0.P - 1) < 0.03, `at the size it was drawn (${p.P.toFixed(1)} vs ${d0.P.toFixed(1)})`);
      let worst = 0, size = 0;
      for (let i = 0; i < 60 * 5; i++) {
        D.debug.step(1 / 60);
        const q = drawn(h);
        worst = Math.max(worst, Math.hypot(q.x - p.x, q.y - p.y));
        size = Math.max(size, Math.abs(q.P / p.P - 1));
        p = q;
      }
      assert.ok(worst < 12, `largest step ${worst.toFixed(1)} px`);
      assert.ok(size < 0.12, `largest size step ${(size * 100).toFixed(1)} %`);
      const t = D.world.debug.thought;
      assert.equal(t.from, null, 'it has landed on the water');
      assert.ok(Math.hypot(p.x - d0.x, p.y - d0.y) > 4 || Math.abs(p.P - d0.P) > 2, 'and it did go somewhere (its home on the water)');
    } finally { run.done(); }
  });
}

for (const reducedMotion of [false, true]) {
  test(`ocean${reducedMotion ? ', reduced motion' : ''}, a cold start while the hero is still coming to rest — on the thought: it slides off, never jumps`, async () => {
    // (the host takes over and glides to the ocean's place while the thought waits where it was drawn beside the
    // person's Mallow at home: the keep-out must not throw it 300 px up in one frame)
    const W = 390, H = 844, h = layerThought({ x: 322, y: 690, z: 0 });
    const hero = { left: 20, right: 246, top: 521, bottom: 747, width: 226, height: 226, cx: 133, cy: 634 };
    const dom = installFakeDom(W, H);
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const D = createHushflow({
      worldEl: dom.el(), fxEl: dom.el(), mallow: fakeMallow(hero), thoughts: layerOf(h), subtitles, reducedMotion,
      photos: { n: 4, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) },
      registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(),
    });
    try {
      await D.start({ worldId: 'luminous-ocean', emotion: 'embarrassed', intention: 'calm' });
      let p = drawn(h), op = h.opacity, worst = 0, at = null, size = 0;
      for (let i = 0; i < 60 * 6; i++) {
        // the hero glides right, onto the thought, over 0.4 s (frames 6..30), then rests there (the sea re-plans)
        if (i >= 6 && i <= 30) { const k = (i - 6) / 24; Object.assign(hero, { left: 20 + 144 * k, right: 246 + 144 * k, cx: 133 + 144 * k }); }
        D.debug.step(1 / 60);
        const q = drawn(h), j = Math.hypot(q.x - p.x, q.y - p.y);
        if (Math.min(op, h.opacity) > 0.05) {
          if (j > worst) { worst = j; at = [i, Math.round(p.x), Math.round(p.y), Math.round(q.x), Math.round(q.y)]; }
          size = Math.max(size, Math.abs(q.P / p.P - 1));
        }
        p = q; op = h.opacity;
      }
      assert.ok(worst < 12, `largest step while it can be seen ${worst.toFixed(1)} px at ${JSON.stringify(at)}`);
      assert.ok(size < 0.12, `largest size step while it can be seen ${(size * 100).toFixed(1)} %`);
      const e = h.extent({});
      assert.ok(!(e.right > hero.left + 2 && e.left < hero.right - 2 && e.bottom > hero.top + 2 && e.top < hero.bottom), `it ends off the hero (${Math.round(e.left)}..${Math.round(e.right)} × ${Math.round(e.top)}..${Math.round(e.bottom)})`);
      assert.ok(h.opacity > 0.99, 'fully there');
    } finally { D.destroy(); dom.restore(); }
  });
}

test('ocean, reduced motion, a cold start: the thought fades out where it was, then in at home (never seen jumping)', async () => {
  const h = layerThought({ x: 322, y: 276, z: 0.2 });
  const run = await play('luminous-ocean', h, { reducedMotion: true, photos: { n: 4, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) } });
  try {
    const { D } = run;
    let p = drawn(h), op = h.opacity, seen = 0, moved = false;
    for (let i = 0; i < 60 * 2; i++) {
      D.debug.step(1 / 60);
      const q = drawn(h);
      const j = Math.hypot(q.x - p.x, q.y - p.y);
      if (j > 12) { moved = true; if (Math.max(op, h.opacity) > 0.15 || Math.min(op, h.opacity) > 0.05) seen++; }
      p = q; op = h.opacity;
    }
    assert.ok(moved, 'it is moved home');
    assert.equal(seen, 0, 'only while it is (nearly) invisible');
    assert.ok(h.opacity > 0.99, `and it is fully there afterwards (${h.opacity})`);
  } finally { run.done(); }
});

test('melt storm → ocean, reduced motion: the layer\'s thought fades out where it hung, is moved home unseen, fades in', async () => {
  const W = 390, H = 844;
  const STORM = { ...WORLDS[0], load: async () => ({ create: () => ({ prepare() {}, enter() {}, frame() {}, pointer() {}, outro() {}, intro() {}, get progress() { return 1; }, get complete() { return true; }, get metrics() { return {}; },
    handoff: () => ({ horizonY: 0.655 * H, seeds: [[[40, 0.7 * H], [W / 2, 0.7 * H + 4], [W - 40, 0.7 * H]]], thought: { x: 111, y: 462, scale: 1, tension: 0.3, r: 38, labelW: 230 }, photos: [], energy: 0.1 }),
    serialize: () => ({ v: 1 }), restore() {}, pause() {}, resume() {}, destroy() {} }) }) };
  const h = layerThought({ x: 111, y: 462 });
  const run = await play('static-storm', h, { reducedMotion: true, registry: createRegistry([STORM, WORLDS[1]]) });
  try {
    const { D } = run;
    assert.ok(D.next());
    for (let i = 0; i < 300 && D.state.phase !== 'melting'; i++) { D.debug.step(1 / 60); await new Promise((r) => setTimeout(r, 2)); }
    assert.equal(D.state.phase, 'melting');
    let p = drawn(h), op = h.opacity, seen = 0, moved = 0, minOp = 1;
    for (let i = 0; i < 60 * 4; i++) {
      D.debug.step(1 / 60);
      const q = drawn(h);
      if (D.state.phase === 'melting') minOp = Math.min(minOp, h.opacity);
      if (Math.hypot(q.x - p.x, q.y - p.y) > 12) { moved++; if (Math.min(op, h.opacity) > 0.05) seen++; }
      p = q; op = h.opacity;
    }
    assert.ok(moved >= 1, 'the thought is moved home during the melt');
    assert.ok(minOp <= 0.05, `it fades out first (lowest opacity ${minOp.toFixed(3)})`);
    assert.equal(seen, 0, 'never moved while it can be seen');
    assert.ok(h.opacity > 0.99, 'and it is fully there in the ocean');
  } finally { run.done(); }
});
