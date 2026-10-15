// The skin's partial redraws never run without the full drawing under them (QA: a GPU process crash wiped every 2D
// canvas — Chrome fires contextlost, then contextrestored with the canvas blank — and Zuzu's tier B skin came back
// as eye, brow and mouth tiles with no body, because only the changed face parts were ever redrawn again).
//
// Runs the real rig.js (a headless Zuzu, whose spiral eyes redraw their parts every frame) and the MallowTouch
// glue against a minimal fake DOM whose canvases record what is drawn and can lose their context.
// Run: node --test hushmallow/tests/skin-loss.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---- a minimal browser: canvases that record clears / clips / images and can be lost, images that load
const stub = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : stub), apply: () => stub });
function fakeCtx(canvas) {
  const rec = { calls: [], depth: 0, lost: false, throwOn: null, alpha: 255 };
  const state = { globalAlpha: 1, lineWidth: 1, globalCompositeOperation: 'source-over', imageSmoothingEnabled: true, imageSmoothingQuality: 'low' };
  const own = {
    save() { rec.depth++; },
    restore() { rec.depth = Math.max(0, rec.depth - 1); },
    isContextLost() { return rec.lost; },
    getImageData(x, y, w, h) { const d = new Uint8ClampedArray(4 * w * h); for (let i = 3; i < d.length; i += 4) { const k = (i - 3) / 4; d[i] = rec.alphaAt ? rec.alphaAt(k % w, Math.floor(k / w)) : rec.alpha; } return { data: d, width: w, height: h }; },
    clearRect(x, y, w, h) { rec.calls.push(['clearRect', x, y, w, h]); },
    clip() { rec.calls.push(['clip']); },
    drawImage(src) {
      if (rec.throwOn === 'drawImage') { rec.throwOn = null; throw new Error('a face draw that throws'); }
      rec.calls.push(['drawImage', src]);
    },
  };
  return new Proxy(state, {
    get: (o, k) => (k === '__rec' ? rec : k === 'canvas' ? canvas : k in own ? own[k] : k in o ? o[k] : stub),
    set: (o, k, v) => { o[k] = v; return true; },
  });
}
const made = [];
function fakeCanvas() {
  const ev = {};
  const c = {
    width: 300, height: 150, style: {}, className: '', tabIndex: -1, removed: false,
    setAttribute() {}, removeAttribute() {}, remove() { c.removed = true; },
    addEventListener(t, fn) { (ev[t] ||= new Set()).add(fn); },
    removeEventListener(t, fn) { ev[t]?.delete(fn); },
    dispatch(t) { for (const fn of [...(ev[t] || [])]) fn({ type: t, preventDefault() {} }); },
    listening: (t) => ev[t]?.size || 0,
  };
  let ctx = null;
  c.getContext = () => (ctx ||= fakeCtx(c));
  made.push(c);
  return c;
}
globalThis.document = { hidden: false, createElement: () => fakeCanvas(), addEventListener() {}, removeEventListener() {} };
globalThis.Image = class {
  constructor() { this.width = 8; this.height = 8; this.naturalWidth = 8; this.naturalHeight = 8; }
  set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); }
  get src() { return this._src; }
};
globalThis.requestAnimationFrame = () => 1;     // the shared loop never runs here: the tests drive the frames
globalThis.cancelAnimationFrame = () => {};

const { MallowRig, facePartsSrc } = await import('../src/mallows/rig.js');
const { MallowTouch } = await import('../src/mallows/touch/mallow-touch.js');

async function zuzu() {
  const rig = new MallowRig({}, { id: 'zuzu', headless: true, interactive: false, particles: false, skinSize: 320 });
  await rig.loaded;
  // off its resting face: the approved art is not laid over the eyes, so Zuzu's spirals redraw every frame
  rig.setEmotion({ sad: 0.4, calm: 0.4, curious: 0.2 }, 0.55, { instant: true, quiet: true });
  return rig;
}
const rec = (rig) => rig.sctx.__rec;
function frame(rig) { rig.time += 1 / 60; rig._dt = 1 / 60; if (rig.sctx) rec(rig).calls.length = 0; return rig.renderSkin(); }
const isFull = (rig) => !!rig.skinRect?.full;
// a full redraw clears the whole canvas, then draws the body art over all of it; a partial one clears only the
// changed parts' rects (inside a clip to them) and draws the body and face again there
const clears = (rig) => rec(rig).calls.filter(([k]) => k === 'clearRect');
const clearedAll = (rig) => clears(rig).some(([, x, y, w, h]) => x === 0 && y === 0 && w === rig.skin.width && h === rig.skin.height);
const clipped = (rig) => clears(rig).length > 0 && !clearedAll(rig);
const bodyDrawn = (rig) => rec(rig).calls.some(([k, src]) => k === 'drawImage' && src === rig.assets.body);
// the readback probe is one shared canvas: every test starts with it reading the skin as whole
const resetProbe = () => { for (const c of made) if (c.width === 64 && c.height === 64) { const r = c.getContext('2d').__rec; r.alpha = 255; r.alphaAt = null; } };

test('skin: a full drawing first, then only the changed face parts (clipped)', async () => {
  const rig = await zuzu();
  assert.equal(frame(rig), true);
  assert.ok(isFull(rig) && clearedAll(rig) && !clipped(rig) && bodyDrawn(rig), 'the first redraw is a full one');
  for (let i = 0; i < 3; i++) {
    assert.equal(frame(rig), true, 'Zuzu redraws every frame');
    assert.ok(!isFull(rig) && clipped(rig) && !clearedAll(rig), `frame ${i}: only the eye rects`);
    assert.ok(rig.skinRects?.length > 0);
  }
  assert.equal(rec(rig).depth, 0, 'save/restore balanced');
  assert.equal(rig.skin.listening('contextlost'), 1, 'the skin listens for its context being lost');
  assert.equal(rig.skin.listening('contextrestored'), 1);
  rig.destroy();
  assert.equal(rig.skin.listening('contextlost'), 0, 'destroy() stops listening');
});

test('skin: a lost context draws nothing; restored (blank) the next redraw is a full one — no patchwork', async () => {
  const rig = await zuzu();
  frame(rig); frame(rig);
  const events = [];
  rig.on('skin', (e) => events.push(e.reason));
  // the GPU process went away: the browser marks the context lost and says so
  rec(rig).lost = true;
  rig.skin.dispatch('contextlost');
  for (let i = 0; i < 3; i++) {
    assert.equal(frame(rig), false, 'nothing is drawn on a lost context');
    assert.equal(rec(rig).calls.length, 0);
  }
  // …and gives it back blank
  rec(rig).lost = false;
  rig.skin.dispatch('contextrestored');
  assert.deepEqual(events, ['restored'], "'skin' tells MallowTouch the canvas came back");
  assert.equal(frame(rig), true);
  assert.ok(isFull(rig) && clearedAll(rig) && bodyDrawn(rig) && !clipped(rig), 'the redraw after a restore is a full one');
  assert.ok(frame(rig) && !isFull(rig), 'then partial again, over the new full drawing');
  rig.destroy();
});

test('skin: a context lost without an event (isContextLost) is waited for, then redrawn in full', async () => {
  const rig = await zuzu();
  frame(rig); frame(rig);
  rec(rig).lost = true;
  assert.equal(frame(rig), false);
  rec(rig).lost = false;
  assert.equal(frame(rig), true);
  assert.ok(isFull(rig) && clearedAll(rig), 'full once it is back');
  rig.destroy();
});

test('skin: a new size, scale or context under the rig means a full redraw (never parts over nothing)', async () => {
  const rig = await zuzu();
  frame(rig); frame(rig);
  // a width assignment clears a canvas: whoever made it, the base is gone
  rig.skin.width += 32;
  frame(rig);
  assert.ok(isFull(rig), 'new canvas size: full');
  frame(rig);
  assert.ok(!isFull(rig));
  // another context object (a context rebuilt by someone else)
  const old = rig.sctx;
  old.__rec.calls.length = 0;
  rig.sctx = fakeCtx(rig.skin);
  frame(rig);
  assert.ok(isFull(rig), 'new context: full');
  assert.equal(old.__rec.calls.length, 0, 'the old context is not drawn on');
  // a new skin resolution (setSkinSize): full, as before
  rig.setSkinSize(384);
  frame(rig);
  assert.ok(isFull(rig), 'new skin size: full');
  rig.destroy();
});

test('skin: a face draw that throws leaves the context balanced and the next redraw full', async () => {
  const rig = await zuzu();
  frame(rig); frame(rig);
  rec(rig).throwOn = 'drawImage';
  assert.throws(() => frame(rig), /throws/);
  assert.equal(rec(rig).depth, 0, 'save/restore balanced: no clip or transform left on the skin for later frames');
  assert.equal(frame(rig), true);
  assert.ok(isFull(rig) && clearedAll(rig) && !clipped(rig), 'full after the failed draw');
  rig.destroy();
});

test('skin: verifySkin finds a body that silently went transparent and the next redraw is full', async () => {
  const rig = await zuzu();
  // a solid mask: the sentinels are body pixels away from every face part
  rig.assets.mask = new Float32Array(64 * 64).fill(1);
  frame(rig); frame(rig);
  assert.equal(rig.verifySkin(), true, 'all there');
  // one readback of the skin per check, into the mask-sized probe (never the skin's own context)
  const reads = (c) => c.getContext('2d').__rec.calls.filter(([k, src]) => k === 'drawImage' && src === rig.skin).length;
  const probe = made.find((c) => c.width === 64 && c.height === 64 && reads(c) > 0);
  assert.ok(probe && reads(probe) === 1, 'one drawImage of the skin into the 64 px probe');
  const pg = probe.getContext('2d').__rec;
  const sent = rig._sentinels();
  assert.ok(sent.length >= 2 && sent.length <= 3, `a few sentinels (${sent.length})`);
  const parts = Object.values(facePartsSrc(rig.mallow));
  for (const [i, j] of sent) {
    assert.ok(i > 0 && j > 0 && i < 63 && j < 63);
    const x = ((i + 0.5) / 64) * rig.mallow.size[0], y = ((j + 0.5) / 64) * rig.mallow.size[1];
    assert.ok(!parts.some((r) => x > r[0] && x < r[2] && y > r[1] && y < r[3]), 'never on a face part');
  }
  // the pixels went away with no event: the next redraw is a full one
  pg.alpha = 0;
  assert.equal(rig.verifySkin(), false);
  assert.equal(frame(rig), true);
  assert.ok(isFull(rig) && clearedAll(rig), 'full after verifySkin found the body gone');
  // every sentinel gone again right after that full redraw: still a loss (a lost skin is transparent everywhere),
  // redrawn in full again — but three in a row straight after full drawings is the readback, not the skin: the
  // check stops asking (no endless redraws) and never drops every sentinel
  assert.equal(rig.verifySkin(), false, 'second loss');
  assert.ok(frame(rig) && isFull(rig));
  assert.equal(rig.verifySkin(), false, 'third loss');
  assert.ok(frame(rig) && isFull(rig));
  assert.equal(rig.verifySkin(), true, 'the readback, not the skin: stop asking');
  assert.equal(rig.verifySkin(), true);
  assert.ok(rig._sentinels().length > 0, 'the sentinels are never all dropped');
  assert.ok(frame(rig) && !isFull(rig), 'partial again');
  rig.destroy();
});

test('skin: a second silent loss within one check interval is found again (verify review: never switched off)', async () => {
  const rig = await zuzu();
  rig.assets.mask = new Float32Array(64 * 64).fill(1);
  resetProbe();
  frame(rig); frame(rig);
  const probe = () => made.find((c) => c.width === 64 && c.height === 64 && c.getContext('2d').__rec.calls.some(([k, src]) => k === 'drawImage' && src === rig.skin));
  assert.equal(rig.verifySkin(), true);
  const pg = probe().getContext('2d').__rec;
  const n = rig._sentinels().length;
  pg.alpha = 0;                                   // the first silent clear
  assert.equal(rig.verifySkin(), false);
  assert.ok(frame(rig) && isFull(rig), 'full redraw after the first');
  for (let i = 0; i < 30; i++) frame(rig);        // half a second of partial frames (the spirals)
  // the second silent clear, before the next check: found, redrawn in full, sentinels kept
  assert.equal(rig.verifySkin(), false, 'the second loss is found');
  assert.ok(frame(rig) && isFull(rig), 'full redraw after the second');
  assert.equal(rig._sentinels().length, n, 'no sentinel dropped');
  pg.alpha = 255;                                 // the skin is whole again
  assert.equal(rig.verifySkin(), true);
  assert.ok(frame(rig) && !isFull(rig), 'partial again');
  // and a later loss is still found (the check is on)
  pg.alpha = 0;
  assert.equal(rig.verifySkin(), false, 'a later loss is still found');
  rig.destroy();
});

test('skin: one sentinel transparent on a fresh full drawing is a bad sentinel (dropped); the others stay', async () => {
  const rig = await zuzu();
  rig.assets.mask = new Float32Array(64 * 64).fill(1);
  resetProbe();
  frame(rig); frame(rig);
  assert.equal(rig.verifySkin(), true);
  const probe = made.find((c) => c.width === 64 && c.height === 64 && c.getContext('2d').__rec.calls.some(([k, src]) => k === 'drawImage' && src === rig.skin));
  const pg = probe.getContext('2d').__rec;
  const sent = rig._sentinels(), [bi, bj] = sent[0];
  pg.alphaAt = (i, j) => (i === bi && j === bj ? 0 : 255);
  assert.equal(rig.verifySkin(), false, 'first: treated as a loss');
  assert.ok(frame(rig) && isFull(rig));
  assert.equal(rig.verifySkin(), true, 'still transparent on the fresh full drawing: a bad sentinel');
  assert.equal(rig._sentinels().length, sent.length - 1);
  assert.ok(!rig._sentinels().some(([i, j]) => i === bi && j === bj));
  pg.alphaAt = null; pg.alpha = 0;
  assert.equal(rig.verifySkin(), false, 'a real loss is still found');
  rig.destroy();
});

test('skin: lost for more than 2 s, or with no context, the skin becomes a new canvas', async () => {
  const rig = await zuzu();
  frame(rig); frame(rig);
  const events = [];
  rig.on('skin', (e) => events.push(e.reason));
  const old = rig.skin;
  rec(rig).lost = true;
  old.dispatch('contextlost');
  assert.equal(frame(rig), false);
  rig._skinLostAt -= 2500;   // 2.5 s later, still lost
  assert.equal(frame(rig), true, 'drawn on a new canvas');
  assert.notEqual(rig.skin, old);
  assert.equal(rig.skin.width, Math.ceil(rig.mallow.size[0] * rig.q));
  assert.equal(old.width, 0, 'the lost canvas is let go');
  assert.equal(old.listening('contextlost'), 0);
  assert.equal(rig.skin.listening('contextrestored'), 1, 'the new one is watched');
  assert.deepEqual(events, ['new']);
  assert.ok(isFull(rig) && clearedAll(rig) && bodyDrawn(rig));
  // no context at all (allocation failed): a new canvas too, at most every 2 s
  rig.sctx = null;
  rig._skinNewAt -= 2500;
  assert.equal(frame(rig), true);
  assert.ok(rig.sctx && isFull(rig));
  rig.destroy();
});

// ------------------------------------------------ MallowTouch's side --
function core(tier = 'tri') {
  const mt = Object.create(MallowTouch.prototype);
  const log = { renders: 0, verifies: 0, verifyAnswer: true, glBodies: 0, drawn: [] };
  const rig = {
    particles: { list: [], cloud: 0 }, body: { grounded: true, spin: 0, glitchBurst: 0 }, val: { glitch: 0 }, restMix: 0, opts: {},
    renderSkin() { log.renders++; return true; },
    verifySkin() { log.verifies++; return log.verifyAnswer; },
  };
  Object.assign(mt, {
    rig, sb: { awake: false, energy: 0 }, tier, time: 0, opts: {}, view: { w: 390, h: 844, dpr: 2 },
    reader: { ptrs: new Map([[1, {}]]) },      // a finger down: the 2D tiers redraw the face every other frame
    touch: { depth: 0, stretch: 1, jiggle: 0 }, st: { vx: 0, vy: 0, vs: 0 }, fl: { vl: 0, vt: 0 }, _rim: 0, _layers: new Set(),
    _layerInfo: {}, _lastSkinFrame: -9, renderer: null,
    stats: { frames: 0, skinMs: 0, drawMs: 0, uploadMs: 0, uploadPx: 0, skipped: 0, idle: false, tier: 'B', last: {} },
    _ensure2d: () => true, _draw2d: (body) => log.drawn.push(body), _addGLBody: () => { log.glBodies++; },
  });
  const step = (n = 1) => { for (let i = 0; i < n; i++) { mt.time += 1 / 60; mt._render(1 / 60); mt.stats.frames++; } };
  return { mt, log, step };
}

test('MallowTouch: the 2D tiers verify the skin about once a second; a lost one is redrawn in that frame', () => {
  const { log, step } = core('tri');
  step(1);
  assert.equal(log.verifies, 1, 'checked on the first frame');
  step(59);
  assert.equal(log.verifies, 1, 'not every frame');
  step(2);
  assert.equal(log.verifies, 2, 'again after a second');
});

test('MallowTouch: a skin verifySkin found gone is redrawn in that same frame, even between face frames', () => {
  const { mt, log, step } = core('tri');
  step(3);
  // a finger is down: the face was just redrawn, so this frame would skip it…
  mt._lastSkinFrame = mt.stats.frames;
  let r = log.renders;
  mt._verifyT = mt.time;               // (no check due)
  step(1);
  assert.equal(log.renders, r, 'between face frames nothing is redrawn');
  // …unless the check due now finds the body gone
  mt._lastSkinFrame = mt.stats.frames;
  mt._verifyT = mt.time - 2;
  log.verifyAnswer = false;
  r = log.renders;
  step(1);
  assert.equal(log.renders, r + 1, 'redrawn (in full: the rig marked it dirty) in the frame that found it');
});

test('MallowTouch: tier A never reads the skin back; a skin event or a restored WebGL context re-binds its sources', () => {
  const { mt, log, step } = core('gl');
  step(120);
  assert.equal(log.verifies, 0, 'tier A keeps its own texture: no readback');
  mt._skinMoved = true;
  step(1);
  assert.equal(log.glBodies, 0, 'no renderer: nothing to re-bind');
  mt.renderer = { lost: true };
  mt._skinMoved = true;
  step(1);
  assert.equal(log.glBodies, 1, 'the texture sources are made again');
  assert.equal(mt._skinMoved, false);
});

test('MallowTouch: the visible 2D canvas waits while lost, is redrawn whole when back, replaced if it stays lost', () => {
  const mt = Object.create(MallowTouch.prototype);
  const root = { kids: [], appendChild(c) { this.kids.push(c); } };
  Object.assign(mt, { root, view: { w: 390, h: 844, dpr: 2 }, _dirty: [0, 0, 10, 10] });
  mt.c2d = fakeCanvas(); mt.c2d.width = 780; mt.c2d.height = 1688;
  mt.ctx = mt.c2d.getContext('2d');
  mt._watch2d();
  assert.equal(mt._ensure2d(), true);
  const old = mt.c2d;
  mt.ctx.__rec.lost = true;
  old.dispatch('contextlost');
  assert.equal(mt._ensure2d(), false, 'a lost canvas draws nothing');
  assert.equal(mt._dirty, null, 'and is cleared whole when it draws again');
  mt.ctx.__rec.lost = false;
  old.dispatch('contextrestored');
  assert.equal(mt._ensure2d(), true, 'back');
  // lost again and not given back within 2 s: a new canvas of the same size takes its place
  mt.ctx.__rec.lost = true;
  old.dispatch('contextlost');
  assert.equal(mt._ensure2d(), false);
  mt._c2dLostAt -= 2500;
  assert.equal(mt._ensure2d(), true, 'replaced');
  assert.notEqual(mt.c2d, old);
  assert.ok(old.removed && old.width === 0, 'the lost canvas is removed');
  assert.equal(mt.c2d.width, 780);
  assert.equal(mt.c2d.height, 1688);
  assert.ok(root.kids.includes(mt.c2d));
  assert.equal(mt.c2d.listening('contextrestored'), 1, 'the new one is watched');
  assert.equal(old.listening('contextlost'), 0);
});
