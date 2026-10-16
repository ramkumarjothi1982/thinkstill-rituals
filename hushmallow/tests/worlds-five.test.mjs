// The five Hushflow worlds, switched on (16 Oct 2026): Glitzi's Static Storm → Loomi's Luminous Ocean → Noomi's Moonmilk
// Cove → Blubi's Raindrop Lagoon → Boppo's Sunpop Orchard. The registry (every world PLAYABLE, the authored links, the last
// world final, which worlds are calm), the selector over the real registry (it follows the links and ends in the orchard;
// a gentle session only ever picks a calm world), the director (Auto-flow off, Stay first, Finish always; a gentle session
// plays each calm world once and never one that is not calm), the Memory Garden's tools, the dev lab (no lab-only list
// left; the dev-realm fixture still melts in), and the real worlds melting along the sequence headless.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { WORLDS, STATUS, FLOW_EMOTIONS, FLOW_INTENTIONS, createRegistry, isPlayable, missingFields } from '../src/hushfold/flow/registry.js';
import { SKILLS, getSkill, validateSkill } from '../src/hushfold/skills.js';
import { REALM_HORIZON } from '../src/world/realm.js';
import { COVE } from '../src/hushfold/flow/worlds/moonmilk-cove-rules.js';
import { LAGOON } from '../src/hushfold/flow/worlds/raindrop-lagoon-core.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');
const SEQUENCE = ['static-storm', 'luminous-ocean', 'moonmilk-cove', 'raindrop-lagoon', 'sunpop-orchard'];
const CALM = ['luminous-ocean', 'moonmilk-cove'];
const byId = (id) => WORLDS.find((w) => w.id === id);
const EMOTIONS = FLOW_EMOTIONS.map((e) => e.id), INTENTIONS = FLOW_INTENTIONS.map((i) => i.id);

// ------------------------------------------------------------------------------------------------ registry --
test('registry: the five worlds in sequence, every one PLAYABLE (never DEV), with its host and its Memory Garden tool', () => {
  assert.deepEqual(WORLDS.map((w) => w.id), SEQUENCE);
  assert.ok(Object.isFrozen(WORLDS));
  const reg = createRegistry();
  for (const w of WORLDS) {
    assert.equal(w.status, STATUS.PLAYABLE, `${w.id}: PLAYABLE, never DEV`);
    assert.ok(isPlayable(w) && reg.playable(w.id), w.id);
    assert.deepEqual(missingFields(w), [], `${w.id} carries every §16 field`);
    assert.equal(typeof w.load, 'function', w.id);
  }
  assert.deepEqual(WORLDS.map((w) => w.mallow.id), ['glitzi', 'loomi', 'noomi', 'blubi', 'boppo']);
  assert.deepEqual(WORLDS.map((w) => w.memory.skillId), ['slowing-down', 'a-little-more-room', 'permission-to-rest', 'name-it', 'kinder-voice']);
  // the entries copied into registry.js keep their realm's horizon (the melts spread from it)
  for (const w of WORLDS) if (w.realm) assert.equal(w.horizon, REALM_HORIZON[w.realm], `${w.id}: horizon`);
  assert.equal(byId('moonmilk-cove').horizon, COVE.HORIZON);
  assert.equal(byId('raindrop-lagoon').horizon, LAGOON.HORIZON);
  // light to import: pure data, no static imports; a world's code loads only when it is about to play
  const src = read('src/hushfold/flow/registry.js');
  assert.doesNotMatch(src, /^\s*import\s/m, 'registry.js imports nothing statically');
  for (const id of SEQUENCE) assert.match(src, new RegExp(`load: \\(\\) => import\\('\\./worlds/${id}\\.js'\\)`), `${id} loads lazily`);
});

test('registry: storm → ocean → cove → lagoon → orchard; only the orchard is final; calm: the ocean and the cove', () => {
  SEQUENCE.forEach((id, i) => {
    const w = byId(id), after = SEQUENCE[i + 1] || null;
    assert.deepEqual(w.next, after ? [after] : [], `${id}.next`);
    assert.equal(w.transition.next, after, `${id}.transition.next`);
    assert.equal(w.final === true, after === null, `${id}.final`);
    assert.equal(typeof w.calm, 'boolean', `${id}: calm is said, never assumed`);
    assert.match(w.dialogue.complete, /Stay, or drift on\?$/, `${id}: its completion asks`);
    assert.match(w.dialogue.completeStay, /Stay as long as you like\.$/, `${id}: …or, with nothing after it, says so`);
  });
  assert.deepEqual(WORLDS.filter((w) => w.calm === true).map((w) => w.id), CALM);
  // the lagoon stays out of gentle sessions (naming can feel heavier right after something heavy: skills.js name-it care),
  // and the orchard (playful lines and faces); the storm (charge) as before
  for (const id of ['static-storm', 'raindrop-lagoon', 'sunpop-orchard']) assert.equal(byId(id).calm, false, id);
  assert.match(getSkill('name-it').care.join(' '), /Skip it if naming the feeling makes things feel heavier right now/);
  // every calm world opens a gentle session with its own quiet lines, never a quip
  for (const id of CALM) {
    const g = byId(id).dialogue.gentle;
    assert.ok(g?.intro?.length, `${id}: gentle lines`);
    for (const l of g.intro) assert.doesNotMatch(l, /storm|splash|task|!|haha|fun/i, `${id}: "${l}"`);
  }
});

// ------------------------------------------------------------------------------------------------ selector --
test('selectNext (the real registry): from each world, every feeling × intention drifts on to its authored next; nothing after the orchard', () => {
  const reg = createRegistry();
  for (const emotion of EMOTIONS) for (const intention of INTENTIONS) {
    SEQUENCE.forEach((current, i) => {
      const r = reg.select({ current, emotion, intention, seed: 5, sessionCount: 2 });
      assert.equal(r.id, SEQUENCE[i + 1] || null, `${emotion} × ${intention}: after ${current}`);
    });
  }
});

test('selectNext (the real registry): a whole session follows the links from where it begins, ends in the orchard, never repeats', () => {
  const reg = createRegistry();
  const run = (emotion, intention, seed = 9) => {
    let bags = {}, history = [];
    let r = reg.select({ current: null, emotion, intention, bags, history, seed, sessionCount: 1 });
    const played = [r.id];
    bags = r.bags;
    for (let i = 0; i < 10; i++) {
      r = reg.select({ current: played.at(-1), emotion, intention, bags, history, seed, sessionCount: 1 });
      if (!r.id) break;
      history = [...history, played.at(-1)]; bags = r.bags; played.push(r.id);
    }
    return played;
  };
  for (const emotion of EMOTIONS) for (const intention of INTENTIONS) {
    const played = run(emotion, intention);
    assert.equal(played.at(-1), 'sunpop-orchard', `${emotion} × ${intention}: ends in the orchard (${played})`);
    assert.deepEqual(played, SEQUENCE.slice(SEQUENCE.indexOf(played[0])), `${emotion} × ${intention}: in the authored order (${played})`);
  }
  // "I'm furious about what happened at work." × Calm me down: the storm first, then all five in turn
  assert.deepEqual(run('angry', 'calm'), SEQUENCE);
});

test('selectNext (the real registry): a gentle session only ever picks a calm world, from anywhere, whatever was played or favoured', () => {
  const reg = createRegistry();
  const histories = [[], ['luminous-ocean'], ['moonmilk-cove', 'luminous-ocean'], [...SEQUENCE], ['raindrop-lagoon', 'sunpop-orchard', 'static-storm']];
  const favourites = [[], ['raindrop-lagoon', 'sunpop-orchard', 'static-storm']];
  for (const emotion of EMOTIONS) for (const intention of INTENTIONS) for (const current of [null, ...SEQUENCE]) for (const history of histories) for (const fav of favourites) {
    const r = reg.select({ current, emotion, intention, history, favourites: fav, gentle: true, seed: 4 });
    const where = `${emotion} × ${intention}, from ${current}, history ${history}, favourites ${fav}`;
    if (current === 'sunpop-orchard') assert.equal(r.id, null, `${where}: nothing after the orchard`);
    else assert.ok(CALM.includes(r.id), `${where}: picked ${r.id}`);
  }
  // the gentle way along the sequence: the storm's link (the ocean), then the ocean's (the cove)
  assert.equal(reg.select({ current: 'static-storm', emotion: 'angry', intention: 'calm', gentle: true }).id, 'luminous-ocean');
  assert.equal(reg.select({ current: 'luminous-ocean', emotion: 'angry', intention: 'calm', gentle: true }).id, 'moonmilk-cove');
  assert.equal(reg.select({ current: null, emotion: 'angry', intention: 'calm', gentle: true }).id, 'luminous-ocean', 'anger, gently: the ocean, as before');
});

// ------------------------------------------------------------------------------------------- the director --
function installFakeDom(W = 390, H = 844) {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const noop = () => {};
  const ctx2d = (c) => new Proxy({
    canvas: c,
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(D, fn, n = 600, dt = 1 / 30) {
  for (let i = 0; i < n && !fn(); i++) { D.debug.step(dt); await wait(1); }
  return fn();
}
const steps = (D, sec, dt = 1 / 30) => { for (let t = 0; t < sec; t += dt) D.debug.step(dt); };
/** The real registry entry with a stand-in world (instant to build): ctl[id].complete drives it. */
function standIn(entry, ctl) {
  const c = (ctl[entry.id] ||= {});
  return {
    ...entry,
    load: async () => ({
      create() {
        return {
          prepare() {}, enter() {}, intro() {}, outro() {}, frame() {}, pointer() {},
          get progress() { return c.complete ? 1 : 0; }, get complete() { return !!c.complete; }, get metrics() { return {}; },
          handoff: () => ({ horizonY: 400 }), serialize: () => ({ v: 1 }), restore() {}, pause() {}, resume() {}, destroy() {}, setGentle() {},
        };
      },
    }),
  };
}
function subs() {
  const said = [], choices = [];
  return {
    said, choices,
    say(lines, o) { said.push({ lines: [].concat(lines), kind: o?.kind }); return Promise.resolve(); },
    choice(q, opts) { choices.push({ q, opts }); return new Promise(() => {}); },
    clear() {}, pause() {}, resume() {},
  };
}
/** What the real worlds read from the shell, faked: the hero's box, the person's thought, two photos, quiet audio. */
function realDeps(W = 390, H = 844) {
  const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
  const r = { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B, bottom, width: B, height: B, cx: W / 2, cy: bottom - B / 2 };
  return {
    mallow: { rect: () => r, bodyRect: () => r, react() {}, setEmotion() {}, lookAt() {}, float() {} },
    thought: { id: 't', token: 'I’m furious about what happened at work.', text: 'I’m furious about what happened at work.', x: 0, y: 0, z: 0, scale: 1, r: 40, state: { tension: 0.7 }, react() {}, settle() {}, soften() {}, hitTest: () => false, pointer() {} },
    photos: { n: 2, standIn: false, colour: () => '#ffd98a', size: (i, sh, d) => ({ w: d, h: d }), draw: (g, i, x, y, d) => ({ w: d, h: d }) },
    audio: { fx: () => true, hold: () => ({ update() {}, stop() {} }), ambience() {}, setAmbienceMood() {} },
    safeRect: () => ({ x: 20, y: 64, w: W - 40, h: 400 }),
  };
}
async function makeDirector(dom, list, extra = {}) {
  const { createHushflow } = await import('../src/hushfold/flow/director.js');
  return createHushflow({ worldEl: dom.el(), fxEl: dom.el(), registry: createRegistry(list), ticker: fakeTicker(), store: memStore(), reducedMotion: true, ...extra });
}

test('director: storm → ocean → cove → lagoon → orchard, each host halfway; Auto-flow off and Stay first; nothing after the orchard; Finish ends it', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const ctl = {}, s = subs(), hosts = [], worlds = [];
    D = await makeDirector(dom, WORLDS.map((w) => standIn(w, ctl)), { subtitles: s });
    D.on('host', (e) => hosts.push(e.mallow));
    D.on('world', (e) => worlds.push(e.id));
    assert.equal(D.autoFlow, false, 'Auto-flow is off unless the person turns it on');
    assert.match(read('src/app/prefs.js'), /autoFlow: false,/, 'and off by default in the saved preferences');
    await D.start({ emotion: 'angry', intention: 'calm', input: { text: 'I’m furious about what happened at work.' } });
    assert.equal(D.state.worldId, 'static-storm');
    for (let i = 1; i < SEQUENCE.length; i++) {
      const id = SEQUENCE[i - 1];
      ctl[id].complete = true;
      assert.ok(await until(D, () => s.choices.some((c) => c.q === byId(id).dialogue.complete), 200), `${id}: "Stay, or drift on?"`);
      const c = s.choices.find((x) => x.q === byId(id).dialogue.complete);
      assert.deepEqual(c.opts.map((o) => o.value), ['stay', 'next'], 'Stay comes first');
      steps(D, 12);
      assert.equal(D.state.worldId, id, `${id}: stays while nobody asks (no Auto-flow)`);
      assert.equal(D.state.canNext, true, `${id}: Drift on is there`);
      assert.ok(D.next(), `${id}: drift on`);
      assert.ok(await until(D, () => D.state.worldId === SEQUENCE[i] && D.state.phase === 'playing'), `melted into ${SEQUENCE[i]}`);
    }
    assert.deepEqual(worlds, SEQUENCE);
    assert.deepEqual(hosts, ['loomi', 'noomi', 'blubi', 'boppo'], 'each world’s host takes the stage halfway through its melt');
    // the orchard: nothing follows it — "Stay as long as you like" (the shell puts Finish beside it), never a choice
    assert.equal(D.state.canNext, false);
    assert.equal(D.next(), false);
    ctl['sunpop-orchard'].complete = true;
    steps(D, 1); await wait(20);
    assert.ok(s.said.some((x) => x.lines[0] === byId('sunpop-orchard').dialogue.completeStay), 'Stay as long as you like');
    assert.ok(!s.choices.some((c) => c.q === byId('sunpop-orchard').dialogue.complete), 'no "Stay, or drift on?" after the last world');
    D.setAutoFlow(true);
    steps(D, 12);
    assert.equal(D.state.worldId, 'sunpop-orchard', 'never a melt back, Auto-flow or not');
    D.finish();
    assert.equal(D.state.phase, 'finished', 'the person can always finish');
  } finally { D?.destroy(); dom.restore(); }
});

test('director: a gentle session plays the ocean, then the cove, and never drifts back or into a world that is not calm — even with Auto-flow on', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const ctl = {}, s = subs(), melted = [];
    D = await makeDirector(dom, WORLDS.map((w) => standIn(w, ctl)), { subtitles: s });
    D.on('melt', (e) => { if (e.k === 1) melted.push(e.to); });
    await D.start({ emotion: 'angry', intention: 'calm', worldId: 'static-storm', gentle: true });
    assert.equal(D.state.worldId, 'luminous-ocean', 'never the storm in a gentle session');
    assert.equal(D.state.gentle, true);
    assert.equal(D.state.canNext, true, 'the cove follows the ocean, gently');
    assert.equal(D.next({ worldId: 'raindrop-lagoon' }), false, 'never a world that is not calm');
    assert.equal(D.next({ worldId: 'sunpop-orchard' }), false);
    D.setAutoFlow(true);
    ctl['luminous-ocean'].complete = true;
    assert.ok(await until(D, () => D.state.worldId === 'moonmilk-cove' && D.state.phase === 'playing', 900), 'Auto-flow drifts on into the cove');
    assert.equal(D.state.canNext, false, 'both calm worlds played: nothing follows');
    assert.equal(D.next(), false);
    ctl['moonmilk-cove'].complete = true;
    steps(D, 20); await wait(20);
    assert.equal(D.state.worldId, 'moonmilk-cove', 'never back into the ocean');
    assert.deepEqual(melted, ['moonmilk-cove']);
    assert.ok(s.said.some((x) => x.lines[0] === byId('moonmilk-cove').dialogue.completeStay), 'the cove: Stay as long as you like');
    // the shell's "Somewhere calm" (a calm world asked for by name) still goes
    assert.equal(D.next({ worldId: 'luminous-ocean' }), true);
    D.finish();
    assert.equal(D.state.phase, 'finished');
    D.destroy();
    // sad × calm, gently: the cove first (its best fit), then the ocean, then nothing
    const ctl2 = {};
    D = await makeDirector(dom, WORLDS.map((w) => standIn(w, ctl2)), { subtitles: subs() });
    await D.start({ emotion: 'sad', intention: 'calm', gentle: true });
    assert.equal(D.state.worldId, 'moonmilk-cove');
    assert.ok(D.next());
    assert.ok(await until(D, () => D.state.worldId === 'luminous-ocean' && D.state.phase === 'playing'), 'then the ocean');
    assert.equal(D.state.canNext, false, 'and never back into the cove');
  } finally { D?.destroy(); dom.restore(); }
});

test('director: care mid-sequence (setGentle) drops a staged world that is not calm or already played; only an unplayed calm one follows', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const ctl = {};
    D = await makeDirector(dom, WORLDS.map((w) => standIn(w, ctl)), { subtitles: subs() });
    await D.start({ emotion: 'angry', intention: 'calm', worldId: 'static-storm' });
    assert.ok(D.next());
    assert.ok(await until(D, () => D.state.worldId === 'luminous-ocean' && D.state.phase === 'playing'));
    assert.ok(D.next());
    assert.ok(await until(D, () => D.state.worldId === 'moonmilk-cove' && D.state.phase === 'playing'));
    ctl['moonmilk-cove'].complete = true;
    assert.ok(await until(D, () => !!D.incoming, 200), 'the lagoon is staged');
    D.setGentle(true);
    assert.equal(D.incoming, null, 'the staged lagoon is dropped');
    assert.equal(D.state.canNext, false, 'the ocean was played already: nothing follows in the gentle session');
    D.setAutoFlow(true);
    steps(D, 20); await wait(20);
    assert.equal(D.state.worldId, 'moonmilk-cove');
    D.destroy();
    // in the storm: the ocean (calm, unplayed) still follows once the session turns gentle
    D = await makeDirector(dom, WORLDS.map((w) => standIn(w, {})), { subtitles: subs() });
    await D.start({ emotion: 'angry', intention: 'calm', worldId: 'static-storm' });
    D.setGentle(true);
    assert.equal(D.state.canNext, true);
    assert.ok(D.next());
    assert.ok(await until(D, () => D.state.worldId === 'luminous-ocean' && D.state.phase === 'playing'));
  } finally { D?.destroy(); dom.restore(); }
});

// ------------------------------------------------------------------------------------------ Memory Garden --
test('Memory Garden: each world’s tool says where it was found, as the storm’s and the ocean’s do; unbuilt worlds stay unfound', () => {
  for (const w of WORLDS) {
    const s = getSkill(w.memory.skillId);
    assert.ok(s, w.id);
    assert.equal(s.world.id, w.id, `${s.id} is taught by ${w.id}`);
    assert.equal(s.world.title, w.title);
    assert.equal(s.mallow, w.mallow.id);
    assert.equal(typeof s.found, 'string', `${s.id}: found`);
    assert.ok(s.found.length > 30 && s.found.length < 200, s.found);
    assert.deepEqual(validateSkill(s), [], s.id);
    for (const [id, d] of Object.entries(w.discoveries)) if (d.skillId) assert.equal(d.skillId, s.id, `${w.id}/${id}`);
  }
  const ids = new Set(WORLDS.map((w) => w.id));
  for (const s of Object.values(SKILLS)) if (s.world.id !== 'another-angle' && !ids.has(s.world.id)) assert.equal(s.found, null, `${s.id}: its world is not built yet`);
  // the garden offers "Visit" / "Practise again" for any playable world
  assert.match(read('src/app/scenes/garden.js'), /const isPlayableWorld = \(id\) => \{ try \{ return registry\.playable\(id\); \} catch \{ return false; \} \};/);
});

// -------------------------------------------------------------------------------------------- the dev lab --
test('lab: every world comes from WORLDS (no lab-only list left); the dev-realm fixture only for a melt test, and it still melts in', async () => {
  const lab = read('src/hushfold/flow/lab.js');
  assert.doesNotMatch(lab, /LAB_WORLDS|MOONMILK_COVE|RAINDROP_LAGOON|SUNPOP_ORCHARD/);
  assert.match(read('src/app/main.js'), /if \(qs\.get\('hushflow'\) && \['localhost', '127\.0\.0\.1'\]\.includes\(location\.hostname\)\)/, 'localhost only');
  const { labRegistry } = await import('../src/hushfold/flow/lab.js');
  const reg = labRegistry();
  assert.deepEqual(reg.list.map((e) => e.id), SEQUENCE);
  for (const id of SEQUENCE) assert.ok(reg.playable(id), id);
  assert.equal(reg.has('dev-realm'), false, 'the fixture only when asked for');
  const dev = labRegistry('dev-realm');
  assert.deepEqual(dev.list.map((e) => e.id), [...SEQUENCE, 'dev-realm']);
  assert.equal(dev.get('dev-realm').status, STATUS.DEV);
  assert.ok(dev.playable('dev-realm'));
  assert.ok(!WORLDS.some((w) => w.status === STATUS.DEV), 'never a DEV world in production');
  // ?hushflow=moonmilk-cove&next=dev-realm: the cove melts into the fixture
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), ...realDeps(), registry: dev, forceNext: 'dev-realm', ticker: fakeTicker(), store: memStore(), reducedMotion: true, subtitles: subs() });
    const errors = [];
    D.on('error', (e) => errors.push(e));
    await D.start({ worldId: 'moonmilk-cove', emotion: 'angry', intention: 'calm' });
    assert.equal(D.state.worldId, 'moonmilk-cove');
    assert.ok(D.next());
    assert.ok(await until(D, () => D.state.worldId === 'dev-realm' && D.state.phase === 'playing', 900), 'melted into the fixture');
    assert.deepEqual(errors, []);
  } finally { D?.destroy(); dom.restore(); }
});

// ------------------------------------------------------------------------------ the real worlds, headless --
test('worlds: the real ocean melts into the real cove, the cove into the lagoon, the lagoon into the orchard — the thought carried, no errors', async () => {
  const W = 390, H = 844;
  const dom = installFakeDom(W, H);
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const errors = [], hosts = [];
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), ...realDeps(W, H), registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: true, subtitles: subs() });
    D.on('error', (e) => errors.push(e));
    D.on('host', (e) => hosts.push(e.mallow));
    await D.start({ worldId: 'luminous-ocean', emotion: 'angry', intention: 'calm' });
    steps(D, 1);
    for (const to of ['moonmilk-cove', 'raindrop-lagoon', 'sunpop-orchard']) {
      const from = D.state.worldId;
      assert.equal(D.state.canNext, true, `${from}: Drift on`);
      assert.ok(D.next(), `${from} → ${to}`);
      assert.ok(await until(D, () => D.state.worldId === to && D.state.phase === 'playing', 900), `melted into ${to}`);
      steps(D, 1);
      const ho = D.world.handoff?.();
      assert.ok(ho && ho.horizonY > 0, `${to} hands over`);
      assert.ok(ho.thought, `${to} carries the thought`);
    }
    assert.deepEqual(hosts, ['noomi', 'blubi', 'boppo']);
    assert.deepEqual(errors, []);
    assert.equal(D.state.canNext, false, 'the orchard is the last world');
  } finally { D?.destroy(); dom.restore(); }
});
