// Luminous Ocean in a gentle session (after a death, a loss or harm, or "Just be with it"): the stand-in Mallow cards'
// faces (a grin, spiral eyes) never float on the water — those bubbles are plain; the person's own photos stay as they
// are, and an ordinary session keeps the cards (fix round, 15 Oct 2026). Headless, the director driving the real ocean.
import { test } from 'node:test';
import assert from 'node:assert/strict';

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
const subtitles = () => ({ say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} });
const hero = { left: 84.6, top: 493.9, right: 303.5, bottom: 731.6, width: 218.9, height: 237.7 };

/** Seconds of the ocean; → how many bubbles were drawn from the photos (warming the sprites at prepare aside). */
async function bubbleDraws({ gentle, standIn, turnGentle = false }) {
  const dom = installFakeDom(390, 844);
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const mallow = { rect: () => hero, bodyRect: () => hero, react() {}, setEmotion() {}, lookAt() {}, float() {} };
    const calls = { bubble: 0, card: 0 };
    const photos = {
      n: 7, standIn, colour: () => '#5b3fa8',
      draw: (g, i, x, y, size, o = {}) => { if (!(x === 4 && y === 4 && size === 60)) calls[o.shape === 'card' ? 'card' : 'bubble']++; return { w: size, h: size }; },
      size: (i, shape, s = 100) => ({ w: s, h: s }),
    };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought: null, photos, subtitles: subtitles(), registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
    await D.start({ worldId: 'luminous-ocean', emotion: 'sad', intention: 'calm', gentle });
    assert.equal(D.state.worldId, 'luminous-ocean');
    assert.equal(D.state.gentle, gentle);
    for (let t = 0; t < 6; t += 1 / 30) D.debug.step(1 / 30);
    const before = { ...calls };
    if (turnGentle) {
      D.setGentle(true);
      calls.bubble = 0; calls.card = 0;
      for (let t = 0; t < 3; t += 1 / 30) D.debug.step(1 / 30);
    }
    return { calls, before, bubbles: D.world.debug.bubbles.filter((b) => b.alpha > 0.2).length };
  } finally { D?.destroy(); dom.restore(); }
}

test('gentle ocean: the stand-in Mallow cards are plain bubbles (no faces); ordinary sessions and the person’s own photos are unchanged', async () => {
  const gentleCards = await bubbleDraws({ gentle: true, standIn: true });
  assert.ok(gentleCards.bubbles >= 3, `bubbles still float (${gentleCards.bubbles})`);
  assert.equal(gentleCards.calls.bubble, 0, 'no Mallow card face is drawn on the water in a gentle session');
  const ordinary = await bubbleDraws({ gentle: false, standIn: true });
  assert.ok(ordinary.calls.bubble > 0, 'an ordinary session keeps the seven Mallow cards');
  const own = await bubbleDraws({ gentle: true, standIn: false });
  assert.ok(own.calls.bubble > 0, 'the person’s own photos stay theirs');
  // a session turned gentle while the sea plays (care told in a world: hushfold.js calmTheWorld → setGentle) turns plain at once
  const turned = await bubbleDraws({ gentle: false, standIn: true, turnGentle: true });
  assert.ok(turned.before.bubble > 0);
  assert.equal(turned.calls.bubble, 0);
});

test('gentle ocean: the registry says so (the ocean’s photos)', () => {
  const ocean = WORLDS.find((w) => w.id === 'luminous-ocean');
  assert.match(ocean.input.photos.gentle, /plain bubbles/);
});
