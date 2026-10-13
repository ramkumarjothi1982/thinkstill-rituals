// Phase 2 unit tests: Comfort DNA, Surprise Me rules, floating-object physics,
// per-Mallow material feel. Node only.

import test from 'node:test';
import assert from 'node:assert/strict';
import { ComfortDNA, DEFAULT_PREFS, sanitize, itemKey } from '../core/comfort-dna.js';
import { MemoryComfortStore, LocalComfortStore, COMFORT_KEY } from '../adapters/comfort-store.js';
import { SupabaseComfortStore } from '../adapters/supabase-comfort.js';
import { pickSurprise } from '../core/pocket-rules.js';
import { Floater } from '../core/effects.js';
import { tuneMaterial, MALLOW_FEEL, LOOKS, MATERIAL_IDS } from '../core/materials.js';
import { POCKET } from '../features/pocket/catalog.js';
import { PREFS_KEY } from '../core/prefs.js';

const fresh = async (initial, now) => new ComfortDNA(new MemoryComfortStore(initial), { now }).load();
const flush = () => new Promise((r) => setTimeout(r, 0));

// ---------------------------------------------------------------- comfort dna --
test('defaults until the person chooses; choices persist through the store', async () => {
  const store = new MemoryComfortStore();
  const dna = await new ComfortDNA(store).load();
  assert.equal(dna.get('responses'), 'balanced');
  assert.ok(dna.set('responses', 'gentle'));
  assert.ok(dna.set('favouriteMallow', 'noomi'));
  assert.equal(dna.set('responses', 'chaotic'), false, 'invalid values are refused');
  assert.equal(dna.set('notAPref', 1), false);
  await flush();
  const again = await new ComfortDNA(store).load();
  assert.equal(again.get('responses'), 'gentle');
  assert.equal(again.get('favouriteMallow'), 'noomi');
});

test('preferences change behaviour: tuning, breath pace, palette, environment', async () => {
  const dna = await fresh();
  const base = dna.tuning();
  dna.set('responses', 'gentle'); dna.set('animationSpeed', 'slower'); dna.set('motion', 'soft'); dna.set('voice', false);
  const t = dna.tuning();
  assert.equal(t.style, 'gentle');
  assert.ok(t.speed < base.speed && t.motion < base.motion);
  assert.equal(t.voice, false);
  assert.ok(dna.breathTiming().inhale > 4, 'slower animation slows the breath');
  assert.equal(dna.palette(), null, 'Mallow colours by default');
  dna.set('colours', 'lavender');
  assert.ok(dna.palette().glow);
  assert.equal(dna.environment('stage', 'blubi'), null, 'stage experiences stay plain by default');
  assert.equal(dna.environment('moment', 'blubi'), 'raindrop-lagoon', 'moments use the Mallow\'s own realm');
  dna.set('environment', 'moonmilk-cove');
  assert.equal(dna.environment('stage', 'blubi'), 'moonmilk-cove');
  dna.set('environment', 'stage');
  assert.equal(dna.environment('moment', 'blubi'), null);
});

test('personalisation off: every experience gets defaults, choices are kept', async () => {
  const dna = await fresh();
  dna.set('responses', 'playful'); dna.toggleFavourite({ kind: 'pocket', id: 'soft-breath' }); dna.set('comfort', ['float']);
  dna.setEnabled(false);
  assert.deepEqual(dna.tuning(), (await fresh()).tuning());
  assert.deepEqual(dna.favourites(), []);
  assert.deepEqual(dna.suggestions(), []);
  assert.deepEqual(dna.surpriseBias(), {});
  assert.equal(dna.chosen('responses'), 'playful', 'the choice is still saved');
  dna.setEnabled(true);
  assert.equal(dna.get('responses'), 'playful');
});

test('history is recorded only when the person opts in, and can be deleted', async () => {
  let clock = 1000;
  const dna = await fresh(null, () => clock);
  assert.equal(dna.record({ kind: 'pocket', id: 'soft-breath' }), false, 'off by default');
  assert.deepEqual(dna.history(), []);
  dna.setLearning(true);
  dna.record({ kind: 'pocket', id: 'soft-breath' }); clock += 5;
  dna.record({ kind: 'pocket', id: 'soft-breath' });
  dna.record({ kind: 'softbody', mallow: 'blubi', material: 'jelly' });
  dna.record({ kind: 'pocket', id: 'not-a-mode' });
  dna.record({ text: 'I feel sad' });
  const h = dna.history();
  assert.equal(h.length, 2, 'only known items are counted; nothing free-form');
  assert.equal(h[0].id, 'soft-breath'); assert.equal(h[0].n, 2); assert.equal(h[0].last, 1005);
  assert.ok(!JSON.stringify(dna.view()).includes('sad'));
  dna.deleteHistory();
  assert.deepEqual(dna.history(), []);
});

test('familiar offers: favourites first, then often-used, then what helps; never invented', async () => {
  const dna = await fresh();
  assert.deepEqual(dna.suggestions(), []);
  dna.set('comfort', ['breathe']);
  dna.toggleFavourite({ kind: 'softbody', mallow: 'blubi', material: 'jelly' });
  dna.setLearning(true);
  for (let i = 0; i < 3; i++) dna.record({ kind: 'pocket', id: 'let-it-float' });
  const s = dna.suggestions(3);
  assert.deepEqual(s.map((x) => x.reason), ['favourite', 'often', 'helps']);
  assert.deepEqual(s.map((x) => x.id || x.material), ['softbody', 'let-it-float', 'soft-breath']);
  const bias = dna.surpriseBias();
  assert.ok(bias['soft-breath'] > 1 && bias['let-it-float'] > 1);
});

test('reset, delete everything, and isolation of stores and keys', async () => {
  const store = new MemoryComfortStore();
  const dna = await new ComfortDNA(store).load();
  dna.set('motion', 'bouncy'); dna.toggleFavourite({ kind: 'pocket', id: 'gentle-glow' }); dna.setLearning(true); dna.record({ kind: 'pocket', id: 'gentle-glow' });
  dna.resetPreferences();
  assert.equal(dna.get('motion'), 'normal');
  assert.deepEqual(dna.favourites(), []);
  assert.equal(dna.history().length, 1, 'reset keeps history (it has its own delete)');
  await dna.deleteAll();
  assert.equal(store.value, null, 'store cleared');
  assert.equal(dna.history().length, 0);
  // two people / two stores never share anything
  const a = await fresh(), b = await fresh();
  a.set('favouriteMallow', 'zuzu');
  assert.equal(b.get('favouriteMallow'), DEFAULT_PREFS.favouriteMallow);
  assert.notEqual(COMFORT_KEY, PREFS_KEY);
  assert.ok(!COMFORT_KEY.startsWith('hm2:'));
});

test('corrupted or hostile stored data is cleaned on load', () => {
  const d = sanitize({ version: 1, enabled: 'yes', prefs: { responses: 'gentle', motion: 'nope', comfort: ['float', 'hack'], evil: '<script>' },
    favourites: [{ kind: 'pocket', id: 'soft-breath' }, { kind: 'pocket', id: 'x' }, 'junk'], history: { a: { kind: 'pocket', id: 'quiet-moment', n: 2, last: 5 }, b: { kind: 'pocket', id: 'quiet-moment', n: 'x' } } });
  assert.equal(d.enabled, true);
  assert.deepEqual(d.prefs, { responses: 'gentle' });
  assert.equal(d.favourites.length, 1);
  assert.equal(Object.keys(d.history).length, 1);
  assert.deepEqual(sanitize({ version: 2, prefs: { responses: 'gentle' } }).prefs, {});
  assert.equal(itemKey({ kind: 'softbody', material: 'jelly' }), 'softbody:*:jelly');
});

test('local store keeps working when storage is blocked', async () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const store = new LocalComfortStore(blocked);
  assert.equal(store.persistent, false);
  assert.match(store.describe().where, /Nowhere/);
  const dna = await new ComfortDNA(store).load();
  dna.set('voice', false);
  await flush();
  assert.equal((await new ComfortDNA(store).load()).get('voice'), false, 'kept in memory for this visit');
});

test('Supabase store is an interface only: needs an injected client, never connects by itself', async () => {
  assert.throws(() => new SupabaseComfortStore({}), /authenticated client/);
  const calls = [];
  const fake = { from: (t) => ({
    select: () => ({ eq: (c, v) => ({ maybeSingle: async () => { calls.push(['select', t, c, v]); return { data: { profile: { version: 1 } }, error: null }; } }) }),
    upsert: async (row, o) => { calls.push(['upsert', t, row.user_id, o.onConflict]); return { error: null }; },
    delete: () => ({ eq: async (c, v) => { calls.push(['delete', t, c, v]); return { error: null }; } }),
  }) };
  const s = new SupabaseComfortStore({ client: fake, userId: 'u1' });
  assert.deepEqual(await s.load(), { version: 1 });
  await s.save({ version: 1 }); await s.clear();
  assert.deepEqual(calls.map((c) => c[0]), ['select', 'upsert', 'delete']);
  assert.ok(calls.every((c) => c.includes('u1')), 'every query is scoped to the user');
});

// ------------------------------------------------------------------ surprise --
test('Surprise Me is deterministic per seed and never repeats the last two moments', () => {
  const a = pickSurprise({ modes: POCKET, seed: 42 }), b = pickSurprise({ modes: POCKET, seed: 42 });
  assert.deepEqual(a, b);
  for (let seed = 1; seed < 200; seed++) {
    const p = pickSurprise({ modes: POCKET, recent: ['soft-breath', 'gentle-glow'], seed });
    assert.ok(!['soft-breath', 'gentle-glow'].includes(p.mode));
  }
  const all = POCKET.map((m) => m.id);
  assert.ok(all.includes(pickSurprise({ modes: POCKET, recent: all, seed: 3 }).mode), 'falls back when everything was recent');
});

test('Surprise Me leans towards what helps and towards calm moments in the evening', () => {
  const count = (o) => { const c = {}; for (let seed = 1; seed <= 600; seed++) { const m = pickSurprise({ modes: POCKET, seed, ...o }).mode; c[m] = (c[m] || 0) + 1; } return c; };
  const plain = count({ hour: 12 });
  const helped = count({ hour: 12, bias: { 'let-it-float': 3 } });
  assert.ok(helped['let-it-float'] > plain['let-it-float'] * 1.6);
  const night = count({ hour: 22 });
  assert.ok(night['quiet-moment'] > plain['quiet-moment']);
  const v = pickSurprise({ modes: [{ id: 'let-it-float' }], seed: 5 });
  assert.ok(['bubbles', 'lanterns', 'petals', 'leaves'].includes(v.variant.kind));
});

// ---------------------------------------------------------------- floaters --
test('a released floater rises, sways and floats away; a waiting one stays put', () => {
  const L = { H: 800, W: 400 };
  const f = new Floater({ x: 200, y: 600, kind: 'bubbles' });
  for (let i = 0; i < 60; i++) f.step(1 / 60, L);
  assert.ok(Math.abs(f.y - 600) < 8 && f.state === 'waiting');
  assert.ok(f.hit(f.x, f.y) && !f.hit(f.x + 200, f.y));
  f.release(0, -200);
  let alive = true, frames = 0;
  while (alive && frames < 1200) { alive = f.step(1 / 60, L); frames++; }
  assert.equal(f.state, 'gone');
  assert.ok(frames < 1200, 'leaves within 20 s');
  const g = new Floater({ x: 0, y: 0 });
  g.release(5000, 5000);
  assert.ok(g.vy < 0 && Math.abs(g.vx) <= 900 * 0.6, 'flings are clamped and always rise');
});

// ------------------------------------------------------------ material feel --
test('every Mallow has its own feel on every material, with a look per material', () => {
  const ids = Object.keys(MALLOW_FEEL);
  assert.equal(ids.length, 7);
  for (const m of MATERIAL_IDS) {
    assert.ok(LOOKS[m], m);
    const ks = new Set(ids.map((id) => tuneMaterial(m, id).goalK.toFixed(2)));
    assert.ok(ks.size >= 5, `${m}: Mallows feel different`);
  }
  assert.ok(tuneMaterial('jelly', 'noomi').goalK < tuneMaterial('jelly', 'glitzi').goalK, 'Noomi softer than Glitzi');
  assert.ok(tuneMaterial('jelly', 'boppo', { reducedMotion: true }).damping > tuneMaterial('jelly', 'boppo').damping * 1.9);
});
