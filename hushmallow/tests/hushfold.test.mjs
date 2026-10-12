// Hushfold tests: MallowTouch soft body and gesture reader, Hushflow planning,
// the world registry, the Static Storm pace rule, the Flow/Beyond adapter and
// the self-hosted fonts. Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SoftBody } from '../src/hushfold/touch/softbody.js';
import { createGestureReader } from '../src/hushfold/touch/gestures.js';
import { planFlow, nextWorld, createFlowStore } from '../src/hushfold/flow.js';
import { WORLDS, PLAYABLE, worldById } from '../src/hushfold/data/worlds.js';
import { SKILLS } from '../src/hushfold/data/skills.js';
import { FEELINGS, INTENTIONS } from '../src/hushfold/data/lines.js';
import { fragments } from '../src/hushfold/thought-mallow.js';
import { PLANS, planName, createEntitlements } from '../src/app/entitlements.js';
import { createStore } from '../src/engine/storage.js';
import { MALLOW_IDS } from '../src/mallows/registry.js';
import { REALMS } from '../src/world/realm.js';

const root = fileURLToPath(new URL('../', import.meta.url));

// ---------------------------------------------------------- soft body --
test('soft body: a press dents it and it springs back to rest', () => {
  const b = new SoftBody({ width: 370, height: 372 });
  b.grab(1, { x: 0, y: -186 });
  b.setDepth(1, 1);
  for (let i = 0; i < 60; i++) b.step(1 / 60);
  const pressed = b.deformation();
  assert.ok(pressed > 0.03, `press should deform the body (got ${pressed})`);
  b.release(1, { x: 0, y: 0 });
  for (let i = 0; i < 240; i++) b.step(1 / 60);
  assert.ok(b.deformation() < pressed * 0.15, 'rebounds close to rest within four seconds');
});

test('soft body: a pull stretches it but never tears past its elastic limit', () => {
  const b = new SoftBody({ width: 370, height: 372 });
  b.grab(1, { x: 0, y: -186 });
  b.drag(1, { x: 2000, y: -2000 });
  for (let i = 0; i < 120; i++) b.step(1 / 60);
  const { x0, x1, y0, y1 } = b.bounds();
  assert.ok(x1 - x0 < 370 * 2.2 && y1 - y0 < 372 * 2.2, 'stays within the elastic limit');
  for (const v of [...b.x, ...b.y]) assert.ok(Number.isFinite(v), 'no NaN nodes');
});

test('soft body: hit-testing follows the shape', () => {
  const b = new SoftBody({ width: 370, height: 372 });
  assert.equal(b.contains({ x: 0, y: -186 }), true);
  assert.equal(b.contains({ x: 600, y: -186 }), false);
});

// ----------------------------------------------------------- gestures --
const take = (g) => g.take().map((e) => e.type);

test('gestures: tap, flick, jiggle and massage circles are told apart', () => {
  let t = 0;
  const g = createGestureReader({ bodyWidth: 250 });
  g.down({ id: 1, x: 100, y: 100, t }); t += 0.08; g.up({ id: 1, x: 101, y: 100, t });
  assert.ok(take(g).includes('tap'), 'quick touch is a tap');

  g.down({ id: 2, x: 100, y: 100, t });
  for (let i = 1; i <= 5; i++) { t += 0.016; g.move({ id: 2, x: 100 + i * 40, y: 100, t }); }
  g.up({ id: 2, x: 300, y: 100, t });
  assert.ok(take(g).includes('flick'), 'fast release is a flick');

  g.down({ id: 3, x: 0, y: 0, t });
  for (let i = 0; i < 40; i++) { t += 1 / 60; g.move({ id: 3, x: (i % 6 < 3 ? 1 : -1) * 20 + i * 0.1, y: 0, t }); }
  assert.ok(take(g).includes('jiggle'), 'quick back-and-forth is a jiggle');
  g.up({ id: 3, x: 0, y: 0, t });
  take(g);

  g.down({ id: 4, x: 140, y: 100, t });
  for (let i = 0; i < 80; i++) { t += 1 / 60; const a = i / 12; g.move({ id: 4, x: 100 + 40 * Math.cos(a), y: 100 + 40 * Math.sin(a), t }); }
  assert.ok(take(g).includes('circle'), 'round and round is a massage');
});

test('gestures: holding still deepens the simulated squeeze', () => {
  const g = createGestureReader({ bodyWidth: 250 });
  g.down({ id: 1, x: 0, y: 0, t: 0 });
  const early = g.depth(1, 0.05), late = g.depth(1, 1.2);
  assert.ok(late > early, `depth grows while held (${early} → ${late})`);
  assert.ok(late <= 1.0001);
});

// ---------------------------------------------------------- Hushflow --
test('Hushflow: angry starts in the storm, anxious starts on the ocean, rest never opens', () => {
  assert.equal(planFlow({ feeling: 'angry', intention: 'calm' })[0], 'static-storm');
  assert.equal(planFlow({ feeling: 'anxious', intention: 'calm' })[0], 'luminous-ocean');
  for (const f of FEELINGS) for (const i of INTENTIONS) {
    const plan = planFlow({ feeling: f.id, intention: i.id });
    assert.ok(plan.length >= 2, `${f.id}/${i.id} has somewhere to go`);
    assert.notEqual(plan[0], 'moonmilk-rest', `${f.id}/${i.id} opens on a real world`);
    for (const id of plan) assert.equal(worldById(id).status, 'playable', 'only playable worlds are offered');
  }
});

test('Hushflow: next world never repeats the current one', () => {
  const plan = planFlow({ feeling: 'angry' });
  for (const id of plan) assert.notEqual(nextWorld(plan, id), id);
});

test('Hushflow: words are only kept when the person asked for it', () => {
  const store = createStore({ backend: 'memory' });
  const flow = createFlowStore(store);
  flow.save({ world: 'static-storm', feeling: 'angry', text: 'secret words', keepWords: false });
  assert.ok(!JSON.stringify(store.get('hushflow', {})).includes('secret words'));
  flow.save({ world: 'static-storm', feeling: 'angry', text: 'kept words', keepWords: true });
  assert.ok(JSON.stringify(store.get('hushflow', {})).includes('kept words'));
  flow.saveSkill('slowing', 'static-storm');
  assert.equal(flow.hasSkill('slowing'), true);
});

// ---------------------------------------------------- world registry --
const FIELDS = ['id', 'title', 'status', 'realm', 'mallow', 'purpose', 'feelings', 'intentions', 'technique', 'evidence',
  'environment', 'touch', 'mallowBehaviour', 'userInput', 'progression', 'dialogue', 'sound', 'completion', 'transition',
  'reward', 'accessibility', 'playtest'];

test('world registry: playable worlds are complete, real and wired', () => {
  assert.ok(PLAYABLE.length >= 2);
  for (const w of PLAYABLE) {
    for (const f of FIELDS) assert.ok(w[f] !== undefined, `${w.id} has ${f}`);
    assert.ok(MALLOW_IDS.includes(w.mallow), `${w.id} uses a real Mallow`);
    assert.ok(REALMS[w.realm], `${w.id} uses a real realm`);
    assert.ok(existsSync(`${root}src/hushfold/worlds/${w.module}.js`), `${w.id} has a module`);
    if (w.reward && w.reward !== 'none' && w.id !== 'moonmilk-rest') assert.ok(SKILLS[w.reward], `${w.id} rewards a real skill`);
  }
});

test('world registry: planned worlds are labelled planned and have no module', () => {
  const planned = WORLDS.filter((w) => w.status === 'planned');
  assert.ok(planned.length >= 1);
  for (const w of planned) assert.ok(!w.module, `${w.id} must not be offered`);
  for (const w of WORLDS) assert.ok(['playable', 'planned'].includes(w.status));
});

test('skills: evidence is stated plainly, with no cure claims', () => {
  for (const s of Object.values(SKILLS)) {
    assert.ok(s.evidence && s.what && s.example);
    assert.ok(!/\b(cure|cures|heal your|fix your|guaranteed)\b/i.test(JSON.stringify(s)), `${s.id} makes no cure claims`);
  }
});

test('thought fragments keep the person’s exact words', () => {
  const text = 'My manager rewrote my whole report without asking';
  assert.equal(fragments(text, 3).join(' '), text);
});

// ------------------------------------------------------- Static Storm --
test('Static Storm: fast strokes raise the storm, slowing down calms it and leads to the discovery', async () => {
  let now = 0;
  const realPerf = globalThis.performance;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => now }, configurable: true, writable: true });
  Object.assign(globalThis, { innerWidth: 390, innerHeight: 844, devicePixelRatio: 1 });
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });
  const said = [];
  let offered = null;
  const ctx = {
    canvas: { clientWidth: 390, clientHeight: 844, getContext: () => g },
    subs: { say: (l) => { said.push(...[].concat(l)); return Promise.resolve(null); }, clear() {} },
    app: { world: null, audio: { fx() {}, hold: () => null, setAmbienceMood() {} }, haptic() {} },
    reduced: false, startCharge: 0.5,
    thoughts: () => [], mallow: () => null,
    offerSkill: (id) => { offered = id; }, complete() {},
  };
  try {
    const { default: staticStorm } = await import('../src/hushfold/worlds/static-storm.js');
    const w = staticStorm(ctx);
    const frame = (ms) => { now += ms; w.update(ms / 1000); };
    // fast scribbles: ~2000 px/s
    for (let k = 0; k < 8; k++) {
      w.pointerDown({ pointerId: 1, clientX: 20, clientY: 300 });
      for (let i = 1; i <= 10; i++) { now += 16; w.pointerMove({ pointerId: 1, clientX: 20 + i * 34, clientY: 300 }); }
      w.pointerUp({ pointerId: 1 });
      frame(16);
    }
    assert.ok(w.charge > 0.5, `fast strokes charge the storm (${w.charge})`);
    assert.ok(w.pace.fastT > 0.6);
    // slow ribbons: ~120 px/s
    for (let k = 0; k < 4; k++) {
      w.pointerDown({ pointerId: 2, clientX: 40, clientY: 400 });
      for (let i = 1; i <= 90; i++) { now += 16; w.pointerMove({ pointerId: 2, clientX: 40 + i * 2, clientY: 400 }); if (i % 4 === 0) frame(0.001); }
      w.pointerUp({ pointerId: 2 });
    }
    frame(16);
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(w.charge < 0.5, `slowing calms the storm (${w.charge})`);
    assert.equal(w.pace.discovered, true, 'the discovery fires');
    assert.ok(said.includes('You changed your pace.'), 'the fast-then-slow discovery is spoken');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(offered, 'slowing', 'the skill is offered after the discovery');
  } finally {
    Object.defineProperty(globalThis, 'performance', { value: realPerf, configurable: true, writable: true });
  }
});

// --------------------------------------------------- Flow and Beyond --
test('plans: exactly two, renamed to Flow and Beyond, product ids unchanged', async () => {
  assert.deepEqual(Object.keys(PLANS), ['paid', 'ultra']);
  assert.equal(PLANS.paid.name, 'Hushmallow Flow');
  assert.equal(PLANS.paid.tagline, 'A little more room for your feelings.');
  assert.equal(PLANS.ultra.name, 'Hushmallow Beyond');
  assert.equal(PLANS.ultra.tagline, 'There’s more than one way to see it.');
  assert.deepEqual(PLANS.paid.productIds, { monthly: 'hushmallow.paid.monthly', yearly: 'hushmallow.paid.yearly' });
  assert.deepEqual(PLANS.ultra.productIds, { monthly: 'hushmallow.ultra.monthly', yearly: 'hushmallow.ultra.yearly' });
  assert.equal(planName('paid'), 'Hushmallow Flow');
  assert.equal(planName('ultra'), 'Hushmallow Beyond');
  assert.ok(PLANS.ultra.includes.some((x) => /Another Angle/.test(x)));
});

test('plans: the annual option buys the yearly product through the native bridge', async () => {
  const bought = [];
  globalThis.window = { HushNative: { store: { current: async () => ({ tier: 'none' }), purchase: async (pid) => { bought.push(pid); return { tier: 'ultra' }; }, restore: async () => ({}) } } };
  try {
    const ent = createEntitlements({ store: createStore({ backend: 'memory' }) });
    await ent.purchase('ultra', 'yearly');
    assert.deepEqual(bought, ['hushmallow.ultra.yearly']);
    assert.equal(ent.has('ultra'), true);
  } finally { delete globalThis.window; }
});

test('no user-facing "Ultra" or "Paid" plan names remain in scenes', () => {
  for (const f of ['home', 'hushfold', 'plans', 'settings', 'encounter', 'library']) {
    const src = readFileSync(`${root}src/app/scenes/${f}.js`, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/'[^']*\bUltra\b[^']*'|'ULTRA'|Hushmallow Paid/.test(src.replace(/loadUltra|openUltra|ultra-card/g, '')), `${f}.js still shows an old plan name`);
  }
});

// -------------------------------------------------------------- fonts --
test('fonts: Nunito Sans, Manrope and Fraunces are self-hosted with their licences', () => {
  const css = readFileSync(`${root}src/ui/tokens.css`, 'utf8');
  for (const fam of ['Nunito Sans', 'Manrope', 'Fraunces']) assert.ok(css.includes(`font-family: "${fam}"`), `${fam} has an @font-face`);
  for (const m of css.matchAll(/url\("?([^")]+)"?\)/g)) {
    assert.ok(!/^https?:/.test(m[1]), 'no remote font URLs');
    assert.ok(existsSync(new URL(m[1], new URL('../src/ui/', import.meta.url))), `${m[1]} exists`);
  }
  for (const lic of ['OFL-NunitoSans.txt', 'OFL-Manrope.txt', 'OFL-Fraunces.txt']) assert.ok(existsSync(`${root}assets/fonts/${lic}`));
  for (const tok of ['--type-cinema', '--type-world', '--type-dialogue', '--type-subtitle', '--type-body', '--type-button', '--type-label'])
    assert.ok(css.includes(tok), `${tok} defined`);
});
