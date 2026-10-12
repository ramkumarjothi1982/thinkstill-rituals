// Core tests: ritual library, quick tricks, entitlements, rotation,
// recommender and the feeling finder. Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { RITUALS } from '../src/data/rituals.js';
import { LIBRARY } from '../src/data/library/index.js';
import { validateLibrary, validateRitual, MALLOW_IDS } from '../src/data/ritual-schema.js';
import { AVAILABLE, PAID_MODULES } from '../src/rituals/index.js';
import { FAMILIES, EMOTIONS, getEmotion } from '../src/data/emotions.js';
import { QUICK_TRICKS } from '../src/data/tricks/quick-tricks.js';
import { PLOT_TWISTS } from '../src/ultra/plot-twists.js';
import { createTrickDeck, loadTricks, loadUltraTricks, trickFit, trickRitual, titleCase } from '../src/engine/tricks.js';
import { createEntitlements, loadUltra, EntitlementError, PLANS } from '../src/app/entitlements.js';
import { createStore } from '../src/engine/storage.js';
import { createRecommender, allowedFor } from '../src/engine/recommend.js';
import { interpret } from '../src/engine/interpret.js';
import { REALMS } from '../src/world/realm.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const memStore = () => createStore({ backend: 'memory' });
async function entWith(tier) {
  const ent = createEntitlements({ store: memStore() });
  if (tier !== 'none') await ent.purchase(tier);
  return ent;
}
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

// ------------------------------------------------------------ library --
test('every ritual in the library is valid', () => {
  const res = validateLibrary(RITUALS);
  const problems = Array.isArray(res) ? res : (res.errors || []);
  assert.deepEqual(problems, []);
  for (const r of RITUALS) assert.deepEqual(validateRitual(r), [], r.id);
});

test('ritual ids are unique and every ritual has a runnable module', () => {
  const ids = RITUALS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of RITUALS) assert.ok(AVAILABLE.has(r.module), `${r.id} → ${r.module}`);
});

test('every library file is listed, and every Paid module file exists', () => {
  const files = readdirSync(`${root}src/data/library`).filter((f) => f !== 'index.js' && f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
  assert.deepEqual(files.sort(), LIBRARY.map((r) => r.id).sort());
  for (const id of Object.keys(PAID_MODULES)) readFileSync(`${root}src/rituals/${id}.js`);
});

test('reframing lives only in Ultra', () => {
  for (const r of RITUALS) if (r.family === 'reframing') assert.equal(r.tier, 'ultra', r.id);
  for (const r of RITUALS.filter((x) => (x.tier || 'paid') === 'paid')) assert.ok(!PAID_MODULES[r.module] || r.family !== 'reframing');
  assert.equal(allowedFor({ tier: 'paid', family: 'reframing' }, { paid: true }), false);
});

test('rituals use only real emotions, Mallows and realms', () => {
  for (const r of RITUALS) {
    for (const m of r.mallows) assert.ok(MALLOW_IDS.includes(m), `${r.id}: ${m}`);
    assert.ok(REALMS[r.world.realm], `${r.id}: realm ${r.world.realm}`);
  }
});

test('the Paid library has a fitting ritual for every emotion family', () => {
  const rec = createRecommender({ rituals: RITUALS, store: memStore(), modules: AVAILABLE, rng: seq([0.3]) });
  for (const fam of FAMILIES) {
    const e = EMOTIONS.find((x) => x.family === fam.id);
    const got = rec.recommend({ emotions: [{ id: e.id, confidence: 1 }], intensity: 0.6, entitlements: { paid: true }, tier: 'paid' });
    assert.ok(got.length, `no Paid ritual for ${fam.id} (${e.id})`);
    for (const g of got) assert.notEqual(g.ritual.tier, 'ultra');
  }
});

test('shipped code calls no AI or remote service', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? walk(`${d}/${f.name}`) : f.name.endsWith('.js') ? [`${d}/${f.name}`] : []));
  for (const f of walk(`${root}src`)) {
    const s = readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /\bfetch\s*\(|XMLHttpRequest|new WebSocket|EventSource\(|sendBeacon/, f);
    // the only URLs allowed: the SVG namespace and the support-line directory people can open themselves
    const urls = (s.match(/https?:\/\/[^'"`\s)]+/g) || []).filter((u) => !/^https?:\/\/(www\.w3\.org\/|findahelpline\.com)/.test(u));
    assert.deepEqual(urls, [], f);
  }
});

// ------------------------------------------------------------- tricks --
test('all 1,000 ThinkStill tricks are imported exactly once', () => {
  const all = [...QUICK_TRICKS, ...PLOT_TWISTS];
  assert.equal(all.length, 1000);
  const refs = new Set(all.map((t) => t.ref));
  assert.equal(refs.size, 1000);
  for (let i = 1; i <= 1000; i++) assert.ok(refs.has(`TS-${String(i).padStart(3, '0')}`), `TS-${i}`);
});

test('Paid tricks are attention/action only; the rest are Ultra', () => {
  const paidIssues = new Set(['Sensory / attention reset', 'Action / procrastination']);
  for (const t of QUICK_TRICKS) { assert.equal(t.tier, 'paid'); assert.ok(paidIssues.has(t.issue), t.ref); }
  for (const t of PLOT_TWISTS) { assert.equal(t.tier, 'ultra'); assert.ok(!paidIssues.has(t.issue), t.ref); }
});

test('plan copy matches the trick counts', () => {
  assert.ok(PLANS.paid.includes.some((l) => l.startsWith(`${QUICK_TRICKS.length} `)));
  assert.ok(PLANS.ultra.includes.some((l) => l.startsWith(`${PLOT_TWISTS.length} `)));
});

test('every trick is complete and playable', () => {
  const famIds = new Set(FAMILIES.map((f) => f.id));
  for (const t of [...QUICK_TRICKS, ...PLOT_TWISTS]) {
    assert.ok(MALLOW_IDS.includes(t.mallow), t.ref);
    for (const k of ['title', 'mission', 'rule', 'move', 'twist', 'bend', 'why', 'loop', 'safety']) assert.ok(t[k]?.length > 5, `${t.ref}.${k}`);
    for (const v of ['jolly', 'cheeky', 'unfiltered']) assert.ok(t.lines[v], `${t.ref} ${v}`);
    for (const f of t.families) assert.ok(famIds.has(f), `${t.ref} family ${f}`);
    assert.ok(['percent', 'yesno', 'either', 'count', 'seal'].includes(t.predict.kind));
    if (t.predict.kind === 'either') assert.ok(t.predict.options.length >= 2 && t.predict.options.length <= 4, t.ref);
    const r = trickRitual(t);
    assert.equal(r.module, 'quick-trick');
    assert.equal(r.tier, t.tier);
    assert.ok(REALMS[r.world.realm]);
  }
});

test('swearing only appears in the opt-in Unfiltered voice', () => {
  const rude = /\b(fuck\w*|shit\w*|bullshit|crap|damn)\b/i;
  for (const t of [...QUICK_TRICKS, ...PLOT_TWISTS]) {
    for (const k of ['title', 'mission', 'rule', 'move', 'twist', 'bend', 'why', 'loop']) assert.doesNotMatch(t[k], rude, `${t.ref}.${k}`);
    assert.doesNotMatch(t.lines.jolly, rude, t.ref);
    assert.doesNotMatch(t.lines.cheeky, rude, t.ref);
  }
});

test('title case keeps small words small', () => {
  assert.equal(titleCase('THE PRIZE SHRINKS WHEN THE STAIRS APPEAR'), 'The Prize Shrinks When the Stairs Appear');
  assert.equal(titleCase('THUMB VS DISTANCE'), 'Thumb vs Distance');
});

// ------------------------------------------------------- entitlements --
test('no plan: no rituals, no tricks, no Ultra', async () => {
  const ent = await entWith('none');
  await assert.rejects(loadTricks(ent), EntitlementError);
  await assert.rejects(loadUltraTricks(ent), EntitlementError);
  await assert.rejects(loadUltra(ent), EntitlementError);
});

test('Paid gets Paid tricks only; Ultra code and plot twists stay locked', async () => {
  const ent = await entWith('paid');
  const tricks = await loadTricks(ent);
  assert.equal(tricks.length, QUICK_TRICKS.length);
  assert.ok(tricks.every((t) => t.tier === 'paid'));
  await assert.rejects(loadUltraTricks(ent), EntitlementError);
  await assert.rejects(loadUltra(ent), EntitlementError);
});

test('Ultra gets everything', async () => {
  const ent = await entWith('ultra');
  assert.equal((await loadTricks(ent)).length, 1000);
  const u = await loadUltra(ent);
  assert.equal(typeof u.angle.run, 'function');
});

test('the recommender never offers Ultra rituals to Paid', () => {
  const rec = createRecommender({ rituals: RITUALS, store: memStore(), modules: AVAILABLE });
  const req = { emotions: [{ id: 'rejection', confidence: 1 }], intensity: 0.6, entitlements: { paid: true } };
  for (const g of rec.recommend(req, { limit: 10 })) assert.notEqual(g.ritual.tier, 'ultra', g.ritual.id);
  const none = rec.recommend({ ...req, entitlements: {} }, { limit: 10 });
  assert.deepEqual(none, []);
});

// ----------------------------------------------------------- rotation --
test('trick deck: no repeats until the pool is used, fits the feeling', () => {
  const pool = QUICK_TRICKS.slice(0, 12);
  const deck = createTrickDeck({ store: memStore(), tricks: pool, rng: seq([0.13, 0.71, 0.42, 0.9, 0.05]) });
  const seen = new Set();
  for (let i = 0; i < pool.length; i++) { const t = deck.pick({}); assert.ok(!seen.has(t.id), `repeat ${t.id}`); seen.add(t.id); }
  assert.equal(seen.size, pool.length);
  // next round may start again, but never with the one just played
  const last = [...seen].pop();
  assert.notEqual(deck.pick({}).id, last);
});

test('trick deck matches feelings and holds back extra-care tricks when intense', () => {
  const store = memStore();
  const deck = createTrickDeck({ store, tricks: [...QUICK_TRICKS, ...PLOT_TWISTS] });
  for (let i = 0; i < 30; i++) {
    const t = deck.pick({ emotions: [{ id: 'anger' }], intensity: 0.95 });
    assert.ok(trickFit(t, [{ id: 'anger' }]) >= 0.5);
    assert.notEqual(t.care, 'extra');
  }
  const paidOnly = createTrickDeck({ store, tricks: [...QUICK_TRICKS, ...PLOT_TWISTS] });
  for (let i = 0; i < 20; i++) assert.equal(paidOnly.pick({ tier: 'paid' }).tier, 'paid');
});

// ------------------------------------------------------ feeling finder --
test('Experience A input finds anger at work, and a Paid Glitzi ritual fits', () => {
  const r = interpret('I’m furious about what happened at work.');
  assert.equal(getEmotion(r.emotions[0].id).family, 'anger');
  assert.ok(r.contexts.includes('work'));
  const rec = createRecommender({ rituals: RITUALS, store: memStore(), modules: AVAILABLE });
  const got = rec.recommend({ ...r, entitlements: { paid: true }, tier: 'paid' }, { limit: 5 });
  assert.ok(got.some((g) => g.ritual.id === 'static-to-signal'));
});

test('crisis language is flagged for support, not a ritual', () => {
  assert.equal(interpret('I want to kill myself').safety.level, 'crisis');
});

// ------------------------------------------------- no repeats per round --
import { planOptions } from '../src/engine/next.js';
import { createRound } from '../src/engine/round.js';

function playWholeRound(tier, tricks) {
  const store = memStore();
  const rec = createRecommender({ rituals: RITUALS, store, modules: AVAILABLE, rng: seq([0.21, 0.77, 0.4]) });
  const ent = { paid: true, ultra: tier === 'ultra' };
  const offer = RITUALS.filter((r) => (r.tier || 'paid') === 'paid' && allowedFor(r, ent) && AVAILABLE.has(r.module));
  const round = createRound(store, tier);
  const feelings = EMOTIONS.filter((_, i) => i % 7 === 0).map((e) => e.id);
  const order = [];
  for (let visit = 0; visit < 5000; visit++) {
    const emo = feelings[visit % feelings.length];
    const { options, total } = planOptions({ rec, req: { emotions: [{ id: emo, confidence: 1 }], intensity: 0.6, entitlements: ent, tier: 'paid' },
      rituals: offer, tricks, seen: round.seen(), rng: seq([0.33, 0.66, 0.11]) });
    if (!options.length) return { order, total, round };
    const pick = options[0].item.id;
    assert.ok(!round.seen().has(pick), `${pick} offered twice in round 1 (visit ${visit})`);
    round.mark(pick);
    order.push(options[0]);
  }
  throw new Error('round never finished');
}

test('Paid: nothing repeats until all 301 have been offered', () => {
  const { order, total } = playWholeRound('paid', QUICK_TRICKS);
  assert.equal(total, 301);
  assert.equal(order.length, 301);
  assert.equal(new Set(order.map((o) => o.item.id)).size, 301);
});

test('Ultra: nothing repeats until every ritual and all 1,000 tricks have been offered', () => {
  const { order, total } = playWholeRound('ultra', [...QUICK_TRICKS, ...PLOT_TWISTS]);
  assert.equal(total, 1010); // + Another Angle, which has its own door
  assert.equal(new Set(order.map((o) => o.item.id)).size, 1010);
});

test('rituals made for the feeling come before tricks, then a fresh round starts clean', () => {
  const store = memStore();
  const rec = createRecommender({ rituals: RITUALS, store, modules: AVAILABLE });
  const offer = RITUALS.filter((r) => (r.tier || 'paid') === 'paid');
  const round = createRound(store, 'paid');
  const req = { emotions: [{ id: 'fury', confidence: 1 }], intensity: 0.7, entitlements: { paid: true }, tier: 'paid' };
  const first = planOptions({ rec, req, rituals: offer, tricks: QUICK_TRICKS, seen: round.seen() }).options[0];
  assert.equal(first.item.id, 'static-to-signal');
  round.mark('static-to-signal');
  const next = planOptions({ rec, req, rituals: offer, tricks: QUICK_TRICKS, seen: round.seen() }).options;
  assert.ok(next.every((o) => o.item.id !== 'static-to-signal'));
  assert.equal(round.number(), 1);
  round.restart();
  assert.equal(round.number(), 2);
  assert.equal(round.count(), 0);
});
