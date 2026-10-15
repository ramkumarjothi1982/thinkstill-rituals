import { test } from 'node:test';
import assert from 'node:assert/strict';
import { policy, realCtx, openCtx, temp } from '../property/support.mjs';
import { planBatch, planSpec } from '../../planner/pick.mjs';
import { checkSpec, checkAssets } from '../../planner/gspec.mjs';
import { fingerprint, specId, sealSpec } from '../../planner/fingerprint.mjs';
import { emptyLedger, appendLedger, loadLedger } from '../../planner/ledger.mjs';
import { visibleSlots } from '../../planner/fingerprint.mjs';
import { validateSchema } from '../../planner/spec-schema.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { compilePolicy, POLICY_FILE } from '../../planner/policy.mjs';
import { sha256Hex } from '../../planner/canonical.mjs';
import { STUDIO } from '../../render/lib/paths.mjs';

const clone = (o) => JSON.parse(JSON.stringify(o));
const rulesOf = (g) => [...new Set(g.errors.map((e) => e.rule))].sort();
/** Re-derive fingerprint and id after a tamper, so only the intended rule fires. */
const reseal = (s) => { s.fingerprint = fingerprint(s); s.id = specId(s); return s; };

const real = realCtx();
const base = planSpec({ ...real, mode: 'review', seed: 5, batch: 'g' }).spec;
const open = openCtx();
const openSpec = (constraints, seed = 1) => planSpec({ ...open, mode: 'review', seed, batch: 'g', constraints }).spec;

test('a planned spec passes; warnings only for files later packages create', () => {
  const g = checkSpec(base, real);
  assert.equal(g.pass, true, JSON.stringify(g.errors));
  const allowed = new Set(['assets-manifest-missing']);
  assert.deepEqual(g.warnings.filter((w) => !allowed.has(w.rule)), []);
  // WP-03 created the Noomi pack and the Moonmilk Cove preset: a plan pins both by sha256, so no pins:pack warning remains
  assert.ok(Object.values(base.pins.packs).every((p) => /^[0-9a-f]{64}$/.test(p.sha256)), JSON.stringify(base.pins.packs));
  assert.ok(g.metrics.ms < 100);
});

test('each tampered slot fails its own rule', () => {
  const cases = [
    ['schema', (s) => { s.extra = 1; }, false],
    ['schema', (s) => { s.duration = 13; }, false],
    ['slot:mallow', (s) => { s.mallow = 'boppo'; s.realm = 'sunpop-orchard'; }],
    ['slot:realm', (s) => { s.realm = 'blue-drift'; }],
    ['slot:tod', (s) => { s.tod = 'afternoon'; }],
    ['slot:duration', (s) => { s.duration = 10; }],
    ['slot:gag', (s) => { s.gag.id = 'G-FLOP'; }],
    ['slot:intensity', (s) => { s.template = 'T14-missing-someone'; }, true, 'slot:intensity'],
    ['slot:metaphor', (s) => { s.metaphor = 'M-TABS'; }],
    ['slot:turn', (s) => { s.turn = 'TURN-SPIN'; }],
    ['slot:ritual', (s) => { s.ritual = 'R-DEFRAG'; }],
    ['slot:loop', (s) => { s.loop = 'LP-CYCLE'; }],
    ['slot:camera', (s) => { s.camera = 'C-LOW-HERO'; }],
    ['slot:arc', (s) => { s.arc = 'A-GREY-CLEAR'; }],
    ['slot:sound', (s) => { s.sound.motifs = ['MO-CLOSE']; }],
    ['slot:sound', (s) => { s.sound.tickTempo = 1.2; }],
    ['copy:hook', (s) => { s.copy.hook = ['ME AT 2 AM AGAIN']; }],
    ['copy:lines', (s) => { s.copy.lines[0] = 'That email I wrote.'; }],
    ['copy:end', (s) => { s.copy.end = { kind: 'closer', text: ['Buy hushmallow now.'] }; }],
    ['copy:nameWord', (s) => { s.copy.nameWord = 'unsure.'; }],
    ['capability:duration', (s) => { s.duration = 12; }],
    ['capability:tod', (s) => { s.tod = 'night'; }],
    ['internal', (s) => { s.internal = false; }],
    ['mode', (s) => { s.channel = 'tiktok'; }],
    ['cells', (s) => { s.cells['G-JOLT/noomi'] = 'candidate'; }],
    ['pins:library', (s) => { s.pins.library = '0.9.0'; }],
  ];
  for (const [rule, f, sealIt = true, only] of cases) {
    const s = clone(base);
    f(s);
    if (sealIt) reseal(s);
    const got = rulesOf(checkSpec(s, real));
    assert.ok(got.includes(only || rule), `${rule}: got ${got.join(', ')}`);
  }
});

test('world jitter stays inside the policy range (the schema bounds are the outer limit)', () => {
  const narrow = compilePolicy({ ...clone(policy), sampling: { ...clone(policy.sampling), worldJitter: { hue: 1, warmth: 0.1, exposure: 0.05 } } });
  const s = clone(base);
  s.worldJitter.hue = 2;
  assert.ok(rulesOf(checkSpec(s, { ...real, policy: narrow })).includes('slot:jitter'));
});

test('capability gating is re-checked live: blocked pack, unapproved cell', () => {
  const blubi = openSpec({ template: ['T01'], mallow: ['blubi'] });
  assert.ok(rulesOf(checkSpec(blubi, real)).includes('capability:pack'));
  const sink = openSpec({ template: ['T01'], mallow: ['noomi'], gag: ['G-SINK'], tod: ['late-night'], duration: [15], metaphor: ['M-ORBIT'], ritual: ['R-BREATH'], turn: ['TURN-SQUEEZE'] });
  const got = rulesOf(checkSpec(sink, real));
  assert.ok(got.includes('capability:cell'), got.join());
});

test('ritual window, copy lint in context, fingerprint and id integrity', () => {
  const t05 = openSpec({ template: ['T05'], duration: [10] });
  const s = clone(t05);
  s.ritual = 'R-BREATH';
  reseal(s);
  assert.ok(rulesOf(checkSpec(s, open)).includes('ritual-window'), 'R-BREATH needs 3.2 s; the 10 s window is 2.1 s');
  const t14 = openSpec({ template: ['T14'], mallow: ['loomi'] });
  const night = clone(t14);
  night.copy.hook = ['LONG DISTANCE HITS', 'DIFFERENT AT NIGHT'];
  reseal(night);
  assert.ok(rulesOf(checkSpec(night, open)).includes('lint:time-word'), 'loomi has no night ToD');
  const edited = clone(base);
  edited.copy.lines[1] = edited.copy.lines[1] === 'Was that rude?' ? 'Did they notice?' : 'Was that rude?';
  assert.deepEqual(rulesOf(checkSpec(edited, real)).filter((r) => r === 'fingerprint' || r === 'id'), ['fingerprint', 'id']);
});

test('a fingerprint used before (decided or published) is refused, except by its own spec', () => {
  const t = temp('gspec-');
  try {
    const rec = { id: 'someone-else', batch: 'x', fingerprint: base.fingerprint, specHash: `sha256:${'b'.repeat(64)}`, mode: 'review', internal: true, visible: visibleSlots(base), verdict: 'reject', reasons: ['timing'], note: '', by: 'owner', at: '2026-11-01T00:00:00Z', gspec: { pass: true, errors: [] } };
    appendLedger('decisions', rec, { dir: t.dir });
    assert.ok(rulesOf(checkSpec(base, { ...real, ledger: loadLedger({ dir: t.dir }) })).includes('fingerprint-used'));
    appendLedger('decisions', { ...rec, id: base.id }, { dir: t.dir });
    const own = { ...real, ledger: { ...emptyLedger(), decisions: [{ ...rec, id: base.id }] } };
    assert.equal(checkSpec(base, own).pass, true);
  } finally { t.done(); }
});

test('an id shared by two different specs of a batch is refused', () => {
  const other = clone(base);
  other.fingerprint = `sha256:${'f'.repeat(64)}`;
  assert.ok(rulesOf(checkSpec(base, { ...real, batchSpecs: [base, other] })).includes('id-collision'));
});

test('production specs: posting rules against the batch and the ledger', () => {
  const r = planBatch({ ...open, mode: 'production', count: 12, seed: 4, batch: 'pb', channel: 'tiktok', start: '2026-11-03' });
  for (const s of r.specs) assert.equal(checkSpec(s, { ...open, batchSpecs: r.specs }).pass, true, s.id);
  // swap the order of two adjacent posts with the same template family to break a rule: duplicate the first post later
  const dup = clone(r.specs[0]);
  dup.index = 1;
  dup.plannedFor = r.specs[1].plannedFor;
  dup.seed = (dup.seed + 1) >>> 0;
  reseal(dup);
  const got = rulesOf(checkSpec(dup, { ...open, batchSpecs: [r.specs[0], dup] }));
  assert.ok(got.includes('sequence:repeat-template') && got.includes('distance') && got.includes('cooldown:hook'), got.join());
});

test('assets: hashes checked against library/assets-manifest.json once it exists', () => {
  const t = temp('assets-');
  try {
    const man = path.join(t.dir, 'assets-manifest.json');
    const art = 'assets/noomi/noomi-art.png';
    fs.writeFileSync(man, JSON.stringify({ files: { [art]: '0'.repeat(64) } }));
    assert.deepEqual(checkAssets(man, 'noomi'), [`${art} does not match its manifest hash`]);
    assert.ok(rulesOf(checkSpec(base, { ...real, assetsManifest: man })).includes('assets'));
    fs.writeFileSync(man, JSON.stringify({ files: { [art]: sha256Hex(fs.readFileSync(path.join(STUDIO, art))) } }));
    assert.deepEqual(checkAssets(man, 'noomi'), []);
  } finally { t.done(); }
});

test('the schema validator implements exactly the keywords the schema uses', () => {
  assert.deepEqual(validateSchema(base), []);
  assert.throws(() => validateSchema(1, { type: 'number', multipleOf: 2 }), /not supported/);
  assert.deepEqual(validateSchema('x', { type: ['string', 'null'], pattern: '^y$' }), ['$: "x" does not match ^y$']);
  assert.deepEqual(validateSchema(null, { type: ['string', 'null'], pattern: '^y$' }), []);
});

test('the approved v2 is expressible as a valid hm-variant/1 spec (what WP-03 pins as specs/golden/t01-v2.json)', () => {
  const t = real.lib.template('T01');
  const v2 = sealSpec({
    schema: 'hm-variant/1', id: null, batch: 'golden', index: 0, mode: 'production', internal: false, quality: 'final', channel: 'golden', plannedFor: '2026-10-13',
    template: t.id, mallow: 'noomi', realm: 'moonmilk-cove', tod: 'late-night', weather: 'clear', dressing: [], duration: 15, seed: 20261013,
    gag: { id: 'G-JOLT', intensity: 1 }, metaphor: 'M-ORBIT', turn: 'TURN-SQUEEZE', ritual: 'R-BREATH', loop: 'LP-RETURN', camera: 'C-DRIFT-IN', arc: 'A-COLD-DIP-WARM',
    worldJitter: { hue: 0, warmth: 0, exposure: 0 },
    copy: { hook: t.hook.primary, lines: t.escalation.lines, end: { kind: 'resolution', text: t.resolution.primary }, nameWord: null },
    sound: { motifs: t.sound.motifs, contour: 'arch-1', tickTempo: 1, panSeed: 0 },
    cells: Object.fromEntries(['G-JOLT', 'M-ORBIT', 'TURN-SQUEEZE', 'R-BREATH', 'LP-RETURN', 'C-DRIFT-IN', 'A-COLD-DIP-WARM'].map((id) => [`${id}/noomi`, 'approved'])),
    pins: {
      library: real.lib.version, librarySha256: real.lib.sha256, capabilitiesSha256: real.caps.sha256, policySha256: sha256Hex(fs.readFileSync(POLICY_FILE)),   // a real pin (FU-3 r2: 64 zeros is a stripped pin)
      packs: Object.fromEntries([['noomi', real.caps.packFile('noomi')], ['moonmilk-cove', real.caps.presetFile('moonmilk-cove')]].map(([id, f]) => [id, { file: f, sha256: sha256Hex(fs.readFileSync(path.join(STUDIO, f))) }])),
      engine: null,
    },
    fingerprint: null,
  });
  const g = checkSpec(v2, real);
  assert.deepEqual(g.errors, []);
  assert.deepEqual(v2.copy.hook, ['ME TRYING TO SLEEP', 'AT 2 AM...']);
  assert.deepEqual(v2.copy.end.text, ['Give your feelings', 'somewhere soft to land.']);
});

test('FU-3 pins: G-SPEC refuses a spec that empties, re-points or strips its pins (the round-4 tamper probe)', () => {
  assert.deepEqual(Object.keys(base.pins.packs).sort(), ['moonmilk-cove', 'noomi']);
  const cases = [
    ['pins:pack', 'packs emptied', (s) => { s.pins.packs = {}; }],
    ['pins:pack', 'pack points elsewhere', (s) => { s.pins.packs = { noomi: { file: 'library/capabilities.json', sha256: null }, 'moonmilk-cove': s.pins.packs['moonmilk-cove'] }; }],
    ['pins:pack', 'pack hash stripped', (s) => { s.pins.packs.noomi.sha256 = null; }],
    ['pins:pack', 'preset hash wrong', (s) => { s.pins.packs['moonmilk-cove'].sha256 = 'f'.repeat(64); }],
    ['pins:pack', 'preset dropped', (s) => { delete s.pins.packs['moonmilk-cove']; }],
    ['pins:pack', 'extra pin', (s) => { s.pins.packs.blubi = { file: null, sha256: null }; }],
    ['pins:engine', 'engine pinned', (s) => { s.pins.engine = 'git:deadbeef'; }],
    ['pins:capabilities', 'capabilities hash emptied', (s) => { s.pins.capabilitiesSha256 = ''; }],
  ];
  for (const [rule, name, f] of cases) {
    const s = clone(base);
    f(s);
    reseal(s);
    const g = checkSpec(s, real);
    assert.equal(g.pass, false, name);
    assert.ok(rulesOf(g).includes(rule), `${name}: ${rulesOf(g).join(', ')}`);
  }
  // open capabilities name no pack files: the pins are { file: null, sha256: null } and nothing else
  const o = openSpec({ template: ['T01'], mallow: ['noomi'] });
  assert.deepEqual(o.pins.packs, { noomi: { file: null, sha256: null }, 'moonmilk-cove': { file: null, sha256: null } });
  assert.equal(checkSpec(o, open).pass, true);
  const forged = clone(o);
  forged.pins.packs.noomi = { file: 'library/mallows/noomi.json', sha256: null };
  assert.ok(rulesOf(checkSpec(reseal(forged), open)).includes('pins:pack'), 'a pin the capabilities do not give');
});

test('FU-3 r2 pins: a placeholder, malformed, empty-file or re-pointed hash is a stripped pin (error); a real older digest warns', () => {
  const cases = [
    ['pins:policy', 'policy zeros', (s) => { s.pins.policySha256 = '0'.repeat(64); }],
    ['pins:library', 'library zeros', (s) => { s.pins.librarySha256 = '0'.repeat(64); }],
    ['pins:capabilities', "capabilities 'x'", (s) => { s.pins.capabilitiesSha256 = 'x'; }],
    ['pins:capabilities', 'capabilities f…f', (s) => { s.pins.capabilitiesSha256 = 'f'.repeat(64); }],
    ['pins:policy', 'policy = sha256 of an empty file', (s) => { s.pins.policySha256 = sha256Hex(Buffer.alloc(0)); }],
    ['pins:policy', 'policy holds the library hash', (s) => { s.pins.policySha256 = s.pins.librarySha256; }],
    ['pins:library', 'library holds the capabilities hash', (s) => { s.pins.librarySha256 = s.pins.capabilitiesSha256; }],
  ];
  for (const [rule, name, f] of cases) {
    const s = clone(base);
    f(s);
    reseal(s);
    const g = checkSpec(s, real);
    assert.equal(g.pass, false, name);
    assert.ok(rulesOf(g).includes(rule), `${name}: ${rulesOf(g).join(', ')}`);
  }
  // a real digest of another version: a warning, as designed (copy and capabilities are re-checked live)
  const older = clone(base);
  older.pins.policySha256 = sha256Hex('an older planner/policy.json');
  const g = checkSpec(reseal(older), real);
  assert.equal(g.pass, true);
  assert.ok(g.warnings.some((w) => w.rule === 'pins:policy'));
  // open capabilities pin 'open'
  const o = openSpec({ template: ['T01'], mallow: ['noomi'] });
  assert.equal(o.pins.capabilitiesSha256, 'open');
  assert.equal(checkSpec(o, open).pass, true);
});
