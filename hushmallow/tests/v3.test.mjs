// V3 tests: the 1,000 rituals (engine × world law), their copy and
// corrections, the photo/words helpers and the engine registry.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ENGINES, LAWS, SKILLS, INDEX } from '../src/v3/data/catalog.js';
import { specFor, codeFor, V3_RITUALS, V3_TOTAL } from '../src/v3/rituals.js';
import { BUILT } from '../src/v3/engines/index.js';
import { validateRitual, MALLOW_IDS } from '../src/data/ritual-schema.js';
import { getEmotion } from '../src/data/emotions.js';
import { REALMS } from '../src/world/realm.js';
import { excerpt, TOKEN_MAX } from '../src/v3/words.js';
import { GATE_LAWS } from '../src/v3/laws.js';
import { RITUALS } from '../src/data/rituals.js';
import { createRecommender, allowedFor } from '../src/engine/recommend.js';
import { createStore } from '../src/engine/storage.js';
import { planOptions } from '../src/engine/next.js';
import { createRound } from '../src/engine/round.js';
import { AVAILABLE } from '../src/rituals/index.js';
import { MAX_PHOTOS, photoSession, photoApi } from '../src/v3/photos.js';
import { MALLOWS, MALLOW_IDS as REGISTRY_IDS } from '../src/mallows/registry.js';
import { orderForLead } from '../src/v3/mallow-cards.js';
import { PLANS } from '../src/app/entitlements.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const copyFor = async (id) => (await import(`../src/v3/data/copy/${id.toLowerCase()}.js`)).default;

test('catalogue: 50 engines × 20 laws, 1,000 unique pairs, 40 skills', () => {
  assert.equal(ENGINES.length, 50);
  assert.equal(LAWS.length, 20);
  assert.equal(SKILLS.length, 40);
  assert.equal(INDEX.length, 1000);
  assert.equal(V3_TOTAL, 1000);
  const pairs = new Set(INDEX.map((r) => `${r[2]}:${r[3]}`));
  assert.equal(pairs.size, 1000);
  assert.deepEqual(LAWS.map((l) => l.n), Array.from({ length: 20 }, (_, i) => i + 1));
  for (const r of INDEX) assert.match(r[0], /^HM-\d{4}$/);
});

test('every one of the 1,000 rituals is a valid ritual spec', () => {
  for (const row of INDEX) {
    const s = specFor(row[0]);
    assert.deepEqual(validateRitual(s), [], row[0]);
    assert.equal(s.tier, 'paid');
    assert.notEqual(s.family, 'reframing', `${row[0]} must not be reframing (Ultra only)`);
    assert.ok(MALLOW_IDS.includes(s.mallows[0]));
    assert.ok(REALMS[s.world.realm], s.world.realm);
    for (const e of s.emotions) assert.ok(getEmotion(e), `${row[0]}: unknown emotion ${e}`);
    assert.ok(s.durationSec >= 20 && s.durationSec <= 120);
  }
});

test('each Mallow always leads in its own realm', () => {
  const home = Object.fromEntries(Object.values(REALMS).map((r) => [r.mallow, r.id]));
  for (const r of INDEX) assert.equal(r[5], home[r[4]], r[0]);
});

test('codeFor finds the ritual for any engine × law pair', () => {
  for (const e of ENGINES) for (const l of LAWS) {
    const c = codeFor(e.id, l.n);
    assert.ok(c, `${e.id} × ${l.n}`);
    const row = INDEX.find((r) => r[0] === c);
    assert.equal(ENGINES[row[2]].id, e.id); assert.equal(LAWS[row[3]].n, l.n);
  }
});

test('every ritual has its copy: Mallow lines, mind bend, plot twist', async () => {
  for (const e of ENGINES) {
    const copy = await copyFor(e.id);
    for (const r of INDEX.filter((x) => x[2] === ENGINES.indexOf(e))) {
      const c = copy[r[0]];
      assert.ok(c, r[0]);
      assert.ok(c.open.length >= 1 && c.during.length >= 1 && c.exit.length >= 1, r[0]);
      assert.ok(c.bend.length > 20 && c.twist.length > 20, r[0]);
    }
  }
});

test('copy corrections hold: no broken templates, British spelling, no third person', async () => {
  const bad = [
    /when you (inch|wake|half-speed hush)\b/, /\bthat gentle gentle\b/, /That was your (choose your exit|lighten the hold|inch|wake)!/,
    /, At the end/, /^Visible gap,/, /\.;/, /\btoward\b/, /counter-?clockwise/, /\bthe user\b/, /\bcolor\b/, /\bcenter\b/,
    /(notice|guided|through|Let|Ha\.|Ooh,|Oh,|Oh!|that—) (molten|feather|three glass|layered|two |gravity|padded|electrostatic|graded|paper|crescent|transparent|crossed|elastic|embers|spiral|luminous|floating|detached|cable|movable|pressure|luminescent|mist|small|double|rotating|soft|descending|triangular|radiant|rippling|magnetic|three-tier|staircase|balance|fabric|glass|folding|ringing|foldable|resting)/,
  ];
  for (const e of ENGINES) {
    const copy = await copyFor(e.id);
    for (const [id, c] of Object.entries(copy)) {
      for (const line of [...c.open, ...c.during, ...c.exit, c.bend, c.twist]) {
        for (const re of bad) assert.doesNotMatch(line, re, `${id}: ${line}`);
        assert.match(line, /^[A-Z'"“]/, `${id} starts with a capital: ${line}`);
      }
    }
  }
  for (const x of [...ENGINES.flatMap((e) => [e.motion, e.physics, e.win]), ...LAWS.flatMap((l) => [l.rule, l.payoff, l.finale]), ...SKILLS.flatMap((s) => [s.does, s.insight])]) {
    assert.doesNotMatch(x, /\btoward\b|counter-?clockwise|\bthe user\b|\bpractice an\b/, x);
  }
});

test('the workbook corrections are documented', () => {
  const doc = readFileSync(`${root}docs/V3_CORRECTIONS.md`, 'utf8');
  assert.match(doc, /corrections in total/);
});

test('words: the excerpt is the person’s own words, short, never reworded', () => {
  assert.equal(excerpt('I am fine'), 'I am fine');
  const long = 'My manager shouted at me in front of everyone, and I still cannot stop replaying it tonight';
  const ex = excerpt(long);
  assert.ok(ex.length <= TOKEN_MAX, ex);
  assert.ok(long.startsWith(ex.replace(/…$/, '')), ex);
  assert.equal(excerpt(''), '');
});

test('laws: exactly five gate laws; the rest are closing moves', () => {
  assert.deepEqual([...GATE_LAWS].sort((a, b) => a - b), [1, 2, 5, 6, 10]);
});

test('built engines exist and follow the module shape; only built engines are offered', async () => {
  const files = readdirSync(`${root}src/v3/engines`).filter((f) => /^ge-\d\d\.js$/.test(f));
  for (const id of BUILT) assert.ok(files.includes(`${id.toLowerCase()}.js`), `${id} is listed but has no file`);
  for (const id of BUILT) {
    const src = readFileSync(`${root}src/v3/engines/${id.toLowerCase()}.js`, 'utf8');
    assert.match(src, /export const meta = \{/, id);
    assert.match(src, /export function create\(E\)/, id);
    for (const k of ['howTo', 'steps', 'tapAlt', 'photos']) assert.match(src, new RegExp(`\\b${k}:`), `${id} meta.${k}`);
    for (const k of ['progress', 'done', 'frame', 'assist', 'pointAt', 'hint', 'finish']) assert.match(src, new RegExp(`\\b${k}\\b`), `${id} ${k}`);
    assert.match(src, /E\.gate\(/, `${id} must route progress through the world law`);
    assert.doesNotMatch(src, /localStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket|sendBeacon/, `${id} must not store or send anything`);
    assert.doesNotMatch(src, /\b(shoot|smash|stab|explode|burn)\w*\s*\(/i, `${id}: no violent photo transformations`);
  }
  const offered = new Set(V3_RITUALS.map((r) => ENGINES[r.params.v3.engine].id));
  for (const id of offered) assert.ok(BUILT.has(id));
  assert.equal(V3_RITUALS.length, BUILT.size * 20);
});

test('the app offers the V3 rituals first, then the ten signature rituals and Another Angle', () => {
  assert.ok(AVAILABLE.has('v3'));
  const v3 = RITUALS.filter((r) => r.module === 'v3');
  assert.equal(v3.length, V3_RITUALS.length);
  assert.equal(RITUALS[0].module === 'v3' || v3.length === 0, true);
  assert.equal(RITUALS[RITUALS.length - 1].id, 'another-angle');
});

test('rounds: no V3 ritual repeats until the whole plan has been offered', () => {
  const store = createStore({ backend: 'memory' });
  const rituals = RITUALS.filter((r) => (r.tier || 'paid') === 'paid' && allowedFor(r, { paid: true }) && AVAILABLE.has(r.module));
  const rec = createRecommender({ rituals, store, rng: () => 0.3, modules: AVAILABLE });
  const round = createRound(store, 'paid');
  const seen = new Set();
  const req = { emotions: [{ id: 'anger', confidence: 1 }], intensity: 0.7, entitlements: { paid: true }, tier: 'paid' };
  for (let i = 0; i < rituals.length; i++) {
    const plan = planOptions({ rec, req, rituals, seen: round.seen(), limit: 1 });
    assert.ok(plan.options.length, `offer ${i} of ${rituals.length}`);
    const id = plan.options[0].item.id;
    assert.ok(!seen.has(id), `${id} repeated before the round finished`);
    seen.add(id); round.mark(id);
  }
  assert.equal(seen.size, rituals.length);
  assert.equal(planOptions({ rec, req, rituals, seen: round.seen(), limit: 1 }).options.length, 0);
});

test('photos: up to six of the person’s own; with none, the seven Mallows stand in', () => {
  assert.equal(MAX_PHOTOS, 6);
  assert.equal(photoSession.max, 6);
  assert.equal(photoSession.count, 0);
  // the cards are painted from the seven approved Mallow artworks
  assert.equal(REGISTRY_IDS.length, 7);
  for (const id of REGISTRY_IDS) assert.ok(existsSync(fileURLToPath(MALLOWS[id].file)), `${id} artwork`);
  // engines see the stand-ins as ordinary material while the person has no photos
  const card = (i) => ({ id: 1000 + i, colour: `#00000${i}`, grid: Array(64).fill(`#00000${i}`), aspect: 0.8, w: 560, h: 700 });
  const api = photoApi({ fallback: Array.from({ length: 7 }, (_, i) => card(i)) });
  assert.equal(api.n, 7);
  assert.equal(api.standIn, true);
  assert.deepEqual(api.assign(9), [0, 1, 2, 3, 4, 5, 6, 0, 1]);
  assert.equal(api.colour(3), '#000003');
  const none = photoApi();
  assert.equal(none.n, 0); assert.equal(none.standIn, false); assert.deepEqual(none.assign(2), [-1, -1]);
  // the host uses them only when the person added none, and never treats them as theirs
  const host = readFileSync(`${root}src/v3/host.js`, 'utf8');
  assert.match(host, /photoSession\.count \|\| v\.noMallows \? \[\] : soon\(mallowMaterial\(/);
  assert.match(host, /photoSession\.count \? h\('label', \{ class: 'v3-keep' \}/, 'the keep option is only for the person’s own photos');
  assert.match(host, /photoSession\.count && pm \?/, 'the “Your photos” card is only for the person’s own photos');
  assert.doesNotMatch(readFileSync(`${root}src/v3/mallow-cards.js`, 'utf8'), /photoSession|items\.push/, 'the cards never join the person’s photo session');
  // a slow artwork never holds a ritual back
  assert.match(host, /soon\(mallowMaterial\(ritual\.mallows\[0\]\), \d+\)/);
  // lead last: the six companions first, starting after the lead
  const cards = REGISTRY_IDS.map((id) => ({ mallow: id }));
  for (const lead of REGISTRY_IDS) {
    const order = orderForLead(cards, lead).map((p) => p.mallow);
    assert.equal(order.length, 7); assert.equal(order[6], lead); assert.equal(new Set(order).size, 7);
    assert.equal(order[0], REGISTRY_IDS[(REGISTRY_IDS.indexOf(lead) + 1) % 7]);
  }
  assert.deepEqual(orderForLead(cards.slice(0, 3), 'noomi').map((p) => p.mallow), ['glitzi', 'blubi', 'zuzu'], 'a missing lead keeps the registry order');
});

test('clearing photos wipes every cached copy; keeping lasts one ritual', () => {
  const src = readFileSync(`${root}src/v3/photos.js`, 'utf8');
  assert.match(src, /function forget\(list\)/);
  for (const m of ['clear() {', 'remove(id) {', 'async replace(id, file) {']) {
    const body = src.slice(src.indexOf(m), src.indexOf('\n  },', src.indexOf(m)));
    assert.match(body, /forget\(/, `${m} forgets the pixels`);
  }
  assert.match(src, /dissolveCache\) if \(mine\(key\)\)/, 'dissolve copies are wiped too');
  assert.match(src, /release\(\) \{\s*if \(keepNext && items\.length\) \{ keepNext = false;/, 'keep applies to the next ritual only');
});

test('the plan page says only what is switched on', () => {
  const paid = RITUALS.filter((r) => (r.tier || 'paid') === 'paid').length;
  const line = PLANS.paid.includes.find((x) => /touch rituals/.test(x));
  if (paid < 1000) assert.match(line, new RegExp(`^${paid.toLocaleString('en-GB')} more touch rituals in the library`));
  else assert.match(line, /^Over 1,000/);
  assert.doesNotMatch(line, /growing towards/, 'the 1,000-ritual programme is stopped (D14): promise nothing');
  assert.match(PLANS.paid.includes.join(' '), /up to seven of your own photos/);   // D5: up to 7
  assert.match(PLANS.ultra.includes[0], /^Everything in hushmallow Flow$/);
});

test('photos never leave the device: no storage or network in the photo system', () => {
  const src = ['photos', 'tray', 'host', 'mallow-cards'].map((f) => readFileSync(`${root}src/v3/${f}.js`, 'utf8')).join('\n');
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|toDataURL/);
  assert.match(readFileSync(`${root}src/v3/host.js`, 'utf8'), /photoSession\.release\(\)/);
  assert.ok(existsSync(`${root}src/v3/dev/sample-photos.js`));
});
