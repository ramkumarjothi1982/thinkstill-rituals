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

test('shipped code calls no remote service except Another Angle’s own server', async () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? walk(`${d}/${f.name}`) : f.name.endsWith('.js') ? [`${d}/${f.name}`] : []));
  // the requests allowed: the app's own version.json on the same site,
  // read to pick up a new deploy; it sends nothing (src/app/update.js).
  // This scans src/**/*.js only: the two other version.json reads live
  // outside it, in index.html's inline hmStale() (a module that fails to
  // load) and tools/site/forward.js (pages cached before v/<version>/)
  // — both the same no-store GET of the same file on the same site.
  const versionCheck = "fetch(new URL('../../version.json', folder), { cache: 'no-store' })";
  assert.ok(readFileSync(`${root}src/app/update.js`, 'utf8').includes(versionCheck));
  // …and exactly one more: Another Angle's client (hushmallow Beyond, src/beyond/angle-client.js),
  // only after consent, only to ANGLE_ENDPOINT from src/app/config.js + one of its three paths
  const angleFetch = 'const netFetch = (url, init) => globalThis.fetch(url, init);';
  const angleSrc = readFileSync(`${root}src/beyond/angle-client.js`, 'utf8');
  assert.equal(angleSrc.split(angleFetch).length, 2, 'one fetch site in angle-client.js');
  assert.match(angleSrc, /const url = `\$\{endpoint\}\$\{path\}`;/);
  assert.match(angleSrc, /if \(!endpoint \|\| !Object\.values\(PATHS\)\.includes\(path\)\)/);
  const { ANGLE_ENDPOINT, ANGLE_ALLOWED_HOSTS } = await import('../src/app/config.js');
  if (ANGLE_ENDPOINT) {
    const u = new URL(ANGLE_ENDPOINT);
    assert.equal(u.protocol, 'https:', 'ANGLE_ENDPOINT is https');
    assert.ok(ANGLE_ALLOWED_HOSTS.includes(u.hostname), 'ANGLE_ENDPOINT host is allow-listed');
  }
  // the Worker's address appears once, in src/app/config.js (the endpoint and its allowed host): no staging
  // or other workers.dev address anywhere in src, comments included
  const workers = [];
  for (const f of walk(`${root}src`)) readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/workers\.dev/i.test(l)) workers.push(`${f.slice(root.length)}:${i + 1}`); });
  assert.ok(workers.every((w) => w.startsWith('src/app/config.js:')), workers.join(', '));
  assert.ok(workers.length <= 2, workers.join(', '));
  if (ANGLE_ENDPOINT) assert.equal(workers.length, 2, workers.join(', '));
  // …and the optional sign-in (src/auth/client.js): one fetch handed to the vendored supabase-js,
  // which refuses every URL outside the one project (src/auth/config.js PROJECT_URL, or localhost in dev)
  const authFetch = 'const netFetch = (url, init) => globalThis.fetch(url, init);';
  const authSrc = readFileSync(`${root}src/auth/client.js`, 'utf8');
  assert.equal(authSrc.split(authFetch).length, 2, 'one fetch site in auth/client.js');
  assert.match(authSrc, /if \(u\.origin !== origin\) return Promise\.reject/);
  const { PROJECT_URL } = await import('../src/auth/config.js');
  assert.equal(PROJECT_URL, 'https://igbxbfuaoybfzsroxuln.supabase.co');
  // …and web subscriptions (src/app/billing.js; off unless src/app/config.js switches them on): one fetch, only to the
  // billing endpoint (the same Worker, one of ANGLE_ALLOWED_HOSTS) + one of its three paths, with the account's token
  const billingFetch = 'const netFetch = (url, init) => globalThis.fetch(url, init);';
  const billingSrc = readFileSync(`${root}src/app/billing.js`, 'utf8');
  assert.equal(billingSrc.split(billingFetch).length, 2, 'one fetch site in app/billing.js');
  assert.match(billingSrc, /const url = `\$\{endpoint\}\$\{path\}`;/);
  assert.match(billingSrc, /if \(!endpoint \|\| !Object\.values\(PATHS\)\.includes\(path\)\)/);
  for (const f of walk(`${root}src`)) {
    let s = readFileSync(f, 'utf8');
    if (f.endsWith('/src/app/update.js')) s = s.replace(versionCheck, '');
    if (f.endsWith('/src/beyond/angle-client.js')) s = s.replace(angleFetch, '');
    if (f.endsWith('/src/auth/client.js')) s = s.replace(authFetch, '');
    if (f.endsWith('/src/app/billing.js')) s = s.replace(billingFetch, '');
    assert.doesNotMatch(s, /\bfetch\s*\(|XMLHttpRequest|new WebSocket|EventSource\(|sendBeacon/, f);
    // the only URLs allowed: the SVG namespace, the support-line directory people can open themselves,
    // (in src/app/config.js only) the configured Another Angle endpoint, and (in src/auth/config.js
    // only) the sign-in project
    const urls = (s.match(/https?:\/\/[^'"`\s)]+/g) || []).filter((u) => !/^https?:\/\/(www\.w3\.org\/|findahelpline\.com)/.test(u))
      .filter((u) => !(ANGLE_ENDPOINT && f.endsWith('/src/app/config.js') && u === ANGLE_ENDPOINT))
      .filter((u) => !(f.endsWith('/src/auth/config.js') && u === PROJECT_URL));
    assert.deepEqual(urls, [], f);
  }
});

// ------------------------------------------------------- entitlements --
test('no plan: no Ultra; Paid: still no Ultra; Ultra: Another Angle loads', async () => {
  await assert.rejects(loadUltra(await entWith('none')), EntitlementError);
  await assert.rejects(loadUltra(await entWith('paid')), EntitlementError);
  const u = await loadUltra(await entWith('ultra'));
  assert.equal(typeof u.angle.run, 'function');
});

test('no quick tricks remain anywhere in the shipped app', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? walk(`${d}/${f.name}`) : f.name.endsWith('.js') ? [`${d}/${f.name}`] : []));
  for (const f of walk(`${root}src`)) assert.doesNotMatch(readFileSync(f, 'utf8'), /quick-trick|trick-launch|plot-twists|QUICK_TRICKS|PLOT_TWISTS/, f);
  for (const r of RITUALS) assert.notEqual(r.module, 'quick-trick');
});

test('the recommender never offers Ultra rituals to Paid', () => {
  const rec = createRecommender({ rituals: RITUALS, store: memStore(), modules: AVAILABLE });
  const req = { emotions: [{ id: 'rejection', confidence: 1 }], intensity: 0.6, entitlements: { paid: true } };
  for (const g of rec.recommend(req, { limit: 10 })) assert.notEqual(g.ritual.tier, 'ultra', g.ritual.id);
  const none = rec.recommend({ ...req, entitlements: {} }, { limit: 10 });
  assert.deepEqual(none, []);
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

function playWholeRound(tier) {
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
      rituals: offer, seen: round.seen(), rng: seq([0.33, 0.66, 0.11]) });
    if (!options.length) return { order, total, round };
    const pick = options[0].item.id;
    assert.ok(!round.seen().has(pick), `${pick} offered twice in round 1 (visit ${visit})`);
    round.mark(pick);
    order.push(options[0]);
  }
  throw new Error('round never finished');
}

test('nothing repeats until every Paid ritual has been offered', () => {
  const { order, total } = playWholeRound('paid');
  assert.equal(order.length, total);
  assert.equal(new Set(order.map((o) => o.item.id)).size, total);
});

test('rituals made for the feeling come first, then a fresh round starts clean', () => {
  const store = memStore();
  const rec = createRecommender({ rituals: RITUALS, store, modules: AVAILABLE });
  const offer = RITUALS.filter((r) => (r.tier || 'paid') === 'paid');
  const round = createRound(store, 'paid');
  const req = { emotions: [{ id: 'fury', confidence: 1 }], intensity: 0.7, entitlements: { paid: true }, tier: 'paid' };
  const first = planOptions({ rec, req, rituals: offer, seen: round.seen() }).options[0];
  assert.ok(getEmotion('fury') && first.item.emotions.some((e) => e === 'fury' || e === 'family:anger' || getEmotion(e)?.family === 'anger'), first.item.id);
  round.mark(first.item.id);
  const next = planOptions({ rec, req, rituals: offer, seen: round.seen() }).options;
  assert.ok(next.every((o) => o.item.id !== first.item.id));
  round.restart();
  assert.equal(round.number(), 2);
  assert.equal(round.count(), 0);
});

// ------------------------------------------------------------ journey --
import { logFinish, setFelt, journeyEntries, summarise } from '../src/engine/journey.js';

test('journey: logs finishes (no words), attaches check-ins, summarises honestly', () => {
  const store = memStore();
  const now = new Date(2026, 9, 12, 12).getTime();
  const DAY = 86400000;
  const add = (id, mallow, fam, daysAgo, seconds) => { logFinish(store, { id, name: id, kind: 'ritual', mallow, families: [fam], seconds });
    const xs = journeyEntries(store); xs[xs.length - 1].at = now - daysAgo * DAY; store.set('journey', xs); };
  add('static-to-signal', 'glitzi', 'anger', 0, 180);
  add('raindrop-keeper', 'blubi', 'sadness', 2, 200);
  add('static-to-signal', 'glitzi', 'anger', 10, 160);
  setFelt(store, 'static-to-signal', 'lighter'); // latest static-to-signal entry
  setFelt(store, 'raindrop-keeper', 'same');
  const s = summarise(journeyEntries(store), now);
  assert.equal(s.total, 3);
  assert.equal(s.week, 2);
  assert.equal(s.minutes, 9);
  assert.deepEqual(s.felt, { lighter: 1, same: 1, heavier: 0, unsure: 0 });
  assert.equal(s.checkIns, 2);
  assert.deepEqual(s.families[0], ['anger', 2]);
  assert.deepEqual(s.mallows[0], ['glitzi', 2]);
  assert.equal(s.helped[0].id, 'static-to-signal');
  assert.equal(s.days.length, 7);
  assert.equal(s.days[6].n, 1);
  for (const e of journeyEntries(store)) assert.ok(!('text' in e), 'no typed words stored');
});
