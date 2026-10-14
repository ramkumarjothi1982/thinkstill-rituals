// Unit tests for the Sensory Lab's pure engines (no browser needed).
//   node --test hushmallow/sensory-lab/tests/*.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { SoftBody } from '../core/softbody.js';
import { MATERIALS, MATERIAL_IDS } from '../core/materials.js';
import { GestureRecognizer } from '../core/gesture-engine.js';
import { Personality, PROFILES } from '../core/personality.js';
import { deformationFace, ExpressionDirector } from '../core/expression-engine.js';
import { Prefs, DEFAULTS, PREFS_KEY } from '../core/prefs.js';
import { EXPERIENCES } from '../features/registry.js';

const blob = (u, v) => ((u - 0.5) / 0.5) ** 2 + ((v - 0.55) / 0.47) ** 2 < 1;
const body = (material, o = {}) => new SoftBody({ width: 370, height: 370, cols: 12, rows: 12, inside: blob, material, substeps: 8, ...o });
const run = (b, secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) b.step(dt); };
const finite = (b) => [...b.px, ...b.py, ...b.vx, ...b.vy].every(Number.isFinite);

// ------------------------------------------------------------- physics --
test('mesh follows the silhouette, not the bounding box', () => {
  const full = new SoftBody({ width: 370, height: 370, cols: 12, rows: 12 });
  const b = body('jelly');
  assert.ok(b.n < full.n, `masked mesh (${b.n}) should drop empty corners (${full.n})`);
  assert.ok(b.n > 60 && b.tri.length % 3 === 0);
});

test('every material is stable at rest and under a 20 fps frame budget', () => {
  for (const id of MATERIAL_IDS) {
    const b = body(id);
    run(b, 2, 1 / 20);
    assert.ok(finite(b), id);
    const m = b.metrics();
    assert.ok(Math.abs(m.squash) < 0.03, `${id} rests near its shape (squash ${m.squash})`);
    assert.ok(m.energy < 0.05, `${id} comes to rest (energy ${m.energy})`);
  }
});

test('a pull stretches the body with rubber-band resistance and rebounds to rest', () => {
  const b = body('mochi');
  run(b, 1);
  const top = b.restTop * 0.9;
  b.grab(1, 0, top);
  b.moveGrab(1, 0, top - 2000);                // finger far away
  run(b, 0.8);
  const pulled = b.metrics();
  assert.ok(pulled.squash < -0.15, 'visibly stretched');
  const g = b.grabs.get(1);
  assert.ok(Math.hypot(g.dx, g.dy) <= b.mat.stretch * b.H + 1e-6, 'stretch saturates at the material limit');
  b.release(1);
  run(b, 4);
  const after = b.metrics();
  assert.ok(Math.abs(after.squash) < 0.03 && after.energy < 0.05, 'settles back');
  assert.ok(finite(b));
});

test('materials feel different: jelly overshoots, marshmallow does not; mochi stretches furthest', () => {
  const overshoot = (id) => {
    const b = body(id); run(b, 1);
    b.setPose({ squeeze: { c: 0.35, ax: 0, ay: 1, px: 0 } }); run(b, 1);
    b.setPose({}); let min = 0;
    for (let i = 0; i < 180; i++) { b.step(1 / 60); min = Math.min(min, b.metrics().squash); }
    return -min;   // how far it springs past rest (taller than rest)
  };
  assert.ok(overshoot('jelly') > 3 * overshoot('marshmallow'), 'jelly wobbles, marshmallow eases back');
  const stretch = (id) => { const b = body(id); run(b, 1); b.grab(1, 0, b.restTop * 0.9); b.moveGrab(1, 0, b.restTop * 0.9 - 150); run(b, 1); return -b.metrics().squash; };
  assert.ok(stretch('mochi') > 1.5 * stretch('jelly'), 'mochi is stretchier than jelly');
});

test('squeezing compresses along the pinch and bulges across it, within limits', () => {
  const b = body('jelly'); run(b, 1);
  b.setPose({ squeeze: { c: 1, ax: 0, ay: 1, px: 0 } });   // asks for far too much
  run(b, 1.5);
  const m = b.metrics();
  assert.ok(m.squash > 0.3 && m.squash < 0.45, `vertical squeeze is capped (${m.squash})`);
  assert.ok(m.widen > 0.15, 'sides bulge');
  b.setPose({ squeeze: { c: 1, ax: 1, ay: 0, px: 0 } });
  run(b, 1.5);
  const h = b.metrics();
  assert.ok(h.squash > -0.3, `horizontal pinch never turns the Mallow into a tower (${h.squash})`);
  assert.ok(h.widen < -0.15, `narrower when pinched from the sides (${h.widen})`);
});

test('pillow compresses more readily than jelly (lower volume preservation)', () => {
  const area = (id) => { const b = body(id); run(b, 1); b.setPose({ squeeze: { c: 0.4, ax: 0, ay: 1, px: 0 } }); run(b, 1.5); return b.metrics().area; };
  assert.ok(area('pillow') < area('jelly') - 0.1);
});

test('cloud floats off the floor; others sit on it', () => {
  const c = body('cloud'); run(c, 2);
  assert.ok(c.metrics().bottom < -10, 'cloud hovers');
  const j = body('jelly'); run(j, 2);
  assert.ok(Math.abs(j.metrics().bottom) < 1, 'jelly rests on the floor');
});

test('pokes dent and wobble locally, then fade', () => {
  const b = body('marshmallow'); run(b, 1);
  b.poke(0, b.restTop * 0.9, 1.5);
  run(b, 0.1);
  assert.ok(b.metrics().offset > 0.02);
  run(b, 4);
  assert.ok(b.metrics().offset < 0.01 && finite(b));
});

// ------------------------------------------------------------- gestures --
function rec() {
  const ev = [];
  const r = new GestureRecognizer((type, d) => ev.push([type, d]));
  return { r, ev, types: () => ev.map((e) => e[0]).filter((t) => t !== 'contact' && t !== 'holding') };
}

test('tap and double tap', () => {
  const { r, types } = rec();
  r.down(1, 100, 100, 0, true); r.up(1, 101, 100, 120);
  r.down(1, 102, 101, 300, true); r.up(1, 102, 101, 380);
  assert.deepEqual(types(), ['tap', 'doubletap']);
});

test('slow repeated taps are separate taps with a streak and steady rhythm', () => {
  const { r, ev } = rec();
  for (let i = 0; i < 5; i++) { const t = i * 500; r.down(1, 100, 100, t, true); r.up(1, 100, 100, t + 80); }
  const taps = ev.filter((e) => e[0] === 'tap');
  assert.equal(taps.length, 5);
  assert.equal(taps[4][1].streak, 5);
  assert.equal(taps[4][1].steady, true);
});

test('a slow, still press shorter than a hold is still a tap', () => {
  const { r, types } = rec();
  r.down(1, 100, 100, 0, true); r.tick(200); r.up(1, 101, 100, 420);
  assert.deepEqual(types(), ['tap']);
});

test('press and hold, then release', () => {
  const { r, types } = rec();
  r.down(1, 100, 100, 0, true);
  r.tick(300); r.tick(600); r.tick(900);
  r.up(1, 100, 100, 1000);
  assert.deepEqual(types(), ['holdstart', 'holdend']);
});

test('hold that starts moving becomes a drag', () => {
  const { r, types } = rec();
  r.down(1, 100, 100, 0, true); r.tick(600);
  r.move(1, 100, 140, 700, true);
  r.up(1, 100, 140, 800);
  assert.deepEqual(types().filter((t) => t !== 'drag'), ['holdstart', 'holdend', 'dragstart', 'dragend']);
});

test('drag with fling', () => {
  const { r, ev } = rec();
  r.down(1, 100, 200, 0, true);
  for (let i = 1; i <= 6; i++) r.move(1, 100 + i * 30, 200, i * 16, true);
  r.up(1, 280, 200, 100);
  const end = ev.find((e) => e[0] === 'dragend')[1];
  assert.equal(end.fling, true);
  assert.equal(end.converted, false);
});

test('a pause before letting go is a release, not a fling', () => {
  const { r, ev } = rec();
  r.down(1, 100, 200, 0, true);
  for (let i = 1; i <= 6; i++) r.move(1, 100 + i * 30, 200, i * 16, true);
  r.up(1, 280, 200, 400);
  assert.equal(ev.find((e) => e[0] === 'dragend')[1].fling, false);
});

test('back-and-forth on the body converts a drag into a stroke', () => {
  const { r, types } = rec();
  r.down(1, 100, 100, 0, true);
  let t = 0;
  for (let k = 0; k < 4; k++) for (let i = 0; i < 10; i++) { t += 16; r.move(1, 100 + (k % 2 ? 60 - i * 6 : i * 6), 100, t, true); }
  r.up(1, 100, 100, t + 10);
  const ty = types();
  assert.ok(ty.includes('dragstart') && ty.includes('strokestart') && ty.includes('stroke'), ty.join());
  assert.equal(ty[ty.length - 1], 'strokeend');
});

test('sweeping onto the body from outside is a stroke, never a grab', () => {
  const { r, types } = rec();
  r.down(1, 0, 100, 0, false);
  r.move(1, 20, 100, 16, false);
  r.move(1, 50, 100, 32, true);
  r.move(1, 80, 100, 48, true);
  r.up(1, 80, 100, 60);
  assert.deepEqual(types(), ['strokestart', 'stroke', 'strokeend']);
});

test('two fingers squeeze; the first finger\'s drag is cancelled cleanly', () => {
  const { r, ev, types } = rec();
  r.down(1, 100, 100, 0, true);
  r.move(1, 100, 120, 16, true);
  r.down(2, 200, 100, 30, true);
  r.move(2, 160, 100, 50, true);
  r.up(2, 160, 100, 80);
  r.up(1, 100, 120, 90);
  const ty = types().filter((t) => t !== 'drag');
  assert.deepEqual(ty, ['dragstart', 'dragend', 'squeezestart', 'squeeze', 'squeezeend']);
  const sq = ev.filter((e) => e[0] === 'squeeze').pop()[1];
  assert.ok(sq.amount > 0.25, 'pinching in is a positive squeeze');
  r.down(3, 10, 10, 200, true); r.up(3, 10, 10, 260);
  assert.equal(types().pop(), 'tap', 'recogniser recovers after a squeeze');
});

test('taps off the body are ignored', () => {
  const { r, types } = rec();
  r.down(1, 5, 5, 0, false); r.up(1, 5, 5, 80);
  assert.deepEqual(types(), []);
});

// ---------------------------------------------------------- personality --
test('personality is deterministic for a seed and avoids repeating itself', () => {
  const a = new Personality('boppo', { seed: 3 }), b = new Personality('boppo', { seed: 3 });
  const seq = (p) => Array.from({ length: 8 }, (_, i) => p.respond('tap', { streak: 1 + (i % 2) }).tag);
  const sa = seq(a);
  assert.deepEqual(sa, seq(b));
  for (let i = 1; i < sa.length; i++) assert.notEqual(sa[i], sa[i - 1], 'no identical consecutive tap answers');
});

test('repeated taps escalate (giggly, then dizzy) and steady rhythm grooves', () => {
  const p = new Personality('boppo');
  assert.equal(p.respond('tap', { streak: PROFILES.boppo.tickleAt }).tag, 'tap-giggle');
  assert.equal(p.respond('tap', { streak: PROFILES.boppo.dizzyAt }).tag, 'tap-dizzy');
  assert.equal(p.respond('tap', { streak: 5, steady: true, interval: 500 }).tag, 'tap-groove');
});

test('each Mallow answers the same gesture in its own way', () => {
  const tags = Object.keys(PROFILES).map((id) => new Personality(id).respond('tap', { streak: 6 }).tag);
  assert.ok(new Set(tags).size >= 5, tags.join());
});

test('every Mallow authors every gesture with real reactions, presets and voices', async () => {
  const { REACTIONS } = await import('../../src/mallows/reactions.js');
  const { PRESETS } = await import('../../src/mallows/expressions.js');
  const VOICE_KINDS = ['tap', 'giggle', 'surprise', 'boing', 'content', 'coo', 'hum', 'grumble'];
  const KEYS = ['tap', 'tickle', 'doubletap', 'holdstart', 'holdlong', 'holdend', 'strokeslow', 'strokefast', 'strokeend',
    'dragstart', 'release', 'fling', 'squeezestart', 'squeezesoft', 'squeezehard', 'rest'];
  const ids = ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'];
  for (const id of ids) {
    const p = PROFILES[id];
    assert.ok(p, id);
    for (const k of KEYS) assert.ok(p[k], `${id} authors ${k}`);
    const all = KEYS.filter((k) => k !== 'rest').flatMap((k) => (Array.isArray(p[k]) ? p[k] : [p[k]]));
    for (const r of all) {
      if (r.react) assert.ok(REACTIONS[id]?.[r.react] || REACTIONS._shared[r.react], `${id}: reaction ${r.react} exists`);
      for (const preset of Object.keys(r.mix || {})) assert.ok(PRESETS[preset], `${id}: preset ${preset} exists`);
      if (r.voice) assert.ok(VOICE_KINDS.includes(r.voice), `${id}: voice ${r.voice}`);
      assert.ok(r.tag, `${id}: every answer is tagged`);
    }
    for (const mix of Object.values(p.rest)) for (const preset of Object.keys(mix)) assert.ok(PRESETS[preset], `${id}: rest preset ${preset}`);
  }
  // distinct characters: no two Mallows give the same answers to the core gestures
  const sig = (id) => ['holdstart', 'strokeslow', 'fling', 'squeezehard'].map((k) => PROFILES[id][k].tag + JSON.stringify(PROFILES[id][k].mix)).join('|');
  assert.equal(new Set(ids.map(sig)).size, ids.length);
});

test('gentle style removes jumps and softens; playful amplifies', () => {
  const g = new Personality('boppo', { style: 'gentle' });
  const r = g.respond('doubletap', {});
  assert.ok(!['hop', 'doubleTap', 'celebrate'].includes(r.react));
  const n = new Personality('boppo', { seed: 9 }).respond('doubletap', {});
  const pl = new Personality('boppo', { seed: 9, style: 'playful' }).respond('doubletap', {});
  assert.ok(pl.i >= n.i);
});

test('mood builds from touch, sets a resting face, and fades', () => {
  const p = new Personality('blubi');
  for (let i = 0; i < 60; i++) p.respond('stroke', { speed: 300 });
  p.respond('holdstart', {});
  assert.ok(p.restExpression(), 'warm Mallow rests with a warm face');
  for (let i = 0; i < 400; i++) p.tick(0.5);
  assert.equal(p.restExpression(), null, 'mood fades back to neutral');
});

test('squeeze strength chooses the answer', () => {
  const p = new Personality('boppo');
  assert.equal(p.respond('squeezeend', { peak: 0.1 }).tag, 'squeeze-soft');
  assert.equal(p.respond('squeezeend', { peak: 0.6 }).tag, 'squeeze-boop');
});

// ------------------------------------------------------------ expression --
test('deformation face: squeeze narrows eyes and puffs cheeks; stretch widens eyes', () => {
  const base = { eyeOpen: 1, eyeScale: 1, irisScale: 1, closedCurve: 0, browY: 0, browAlpha: 0, mouthRound: 0, mouthOpen: 0, mouthSmile: 0.5, mouthWave: 0, cheekPuff: 0, blush: 1 };
  const sq = deformationFace({ ...base }, { squeeze: 1 }, { eyeOpen: 0, closedCurve: -1 });
  assert.ok(sq.eyeOpen < 0.1 && sq.cheekPuff > 0.5);
  const st = deformationFace({ ...base }, { stretch: 1 }, null);
  assert.ok(st.eyeOpen > 1.2 && st.mouthRound > 0.5);
  const closed = deformationFace({ ...base, eyeOpen: 0 }, { stretch: 0.4, closedEyes: true }, null);
  assert.equal(closed.eyeOpen, 0, 'closed-eyed Mallows keep eyes shut for small stretches');
});

test('expression director returns to rest after a transient', () => {
  const calls = [];
  const d = new ExpressionDirector({ setEmotion: (mix, i) => calls.push([Object.keys(mix)[0], i]) });
  d.setRest({ mix: { calm: 1 }, i: 0.3 });
  d.tick(0.01);
  d.play({ happy: 1 }, 0.7, 1);
  d.tick(0.5);
  d.tick(0.6);
  assert.deepEqual(calls.map((c) => c[0]), ['calm', 'happy', 'calm']);
});

// ----------------------------------------------------------------- prefs --
test('lab prefs use their own namespace and reset cleanly', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const p = new Prefs(storage);
  p.set('material', 'jelly');
  p.set('notARealPref', 1);
  assert.deepEqual([...store.keys()], [PREFS_KEY]);
  assert.ok(!PREFS_KEY.startsWith('hm2:'), 'never collides with the main app keys');
  assert.equal(new Prefs(storage).get('material'), 'jelly');
  p.reset();
  assert.equal(p.get('material'), DEFAULTS.material);
  assert.equal(store.size, 0);
});

test('only built experiences are playable; all ten are listed', () => {
  assert.equal(EXPERIENCES.length, 10);
  const live = EXPERIENCES.filter((e) => e.load).map((e) => e.id);
  assert.deepEqual(live, ['touchtalk', 'softbody', 'pocket-hush', 'comfort-dna', 'weather', 'hushbeat', 'nightlight']);
  for (const id of MATERIAL_IDS) assert.ok(MATERIALS[id].label && MATERIALS[id].sound);
});
