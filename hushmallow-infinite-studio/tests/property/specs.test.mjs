// Property tests for the planner (PHASE2-PLAN WP-06):
//   - 1,000 specs over the enabled cells compile with 0 violations: G-SPEC
//     now, and G-DIR/G-COST through the composer as soon as composer/ exists
//     (that half is a skipped subtest until WP-03 lands, then it runs and must
//     pass); while G-DIR is pending the report says "incomplete" (pass null),
//     never "pass";
//   - the compile path end to end through a STUB composer (fixtures/), which
//     proves the seam and the verdicts, not G-DIR;
//   - the same over a much wider enabled-cell set (Noomi with every cell,
//     ToD and duration of hers approved), so cell combinations vary too;
//   - the whole library (every capability opened) plans clean specs;
//   - 90-day posting plans at the capped cadence satisfy every posting rule,
//     checked by an independent re-statement of the rules;
//   - tampered specs never pass G-SPEC;
//   - 10k specs through the CLI in under 10 s, byte-reproducible.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lib, policy, realCtx, openCtx, capsFrom, temp, hm, independentPostingCheck } from './support.mjs';
import { planBatch } from '../../planner/pick.mjs';
import { checkSpec } from '../../planner/gspec.mjs';
import { compileSpecFile } from '../../planner/compile.mjs';
import { loadComposer, COMPOSER_DIR } from '../../planner/composer-bridge.mjs';
import { fileURLToPath } from 'node:url';
import { writeBatch } from '../../planner/runs.mjs';
import { openCapabilities } from '../../planner/capabilities.mjs';
import { stream } from '../../planner/rng.mjs';
import { fingerprint, specId } from '../../planner/fingerprint.mjs';
import { hooksOf, linePools } from '../../planner/library.mjs';
import { sha256Hex } from '../../planner/canonical.mjs';

const errorsIn = (specs, ctx) => {
  const rules = {};
  for (const s of specs) for (const e of checkSpec(s, { ...ctx, batchSpecs: specs }).errors) rules[`${e.rule}: ${e.message}`] = (rules[`${e.rule}: ${e.message}`] || 0) + 1;
  return rules;
};

/**
 * Compile every spec of a planned batch from its file (through the composer
 * given, or the one in force). → { gspecPass, statuses, gdirRan, gdirPass, gdirErrors, slots, reports }
 */
async function compileAll(r, ctx, t, { composer } = {}) {
  const tmp = temp('prop-compile-');
  try {
    writeBatch(path.join(tmp.dir, 'b'), r);
    let gspecPass = 0, gdirRan = 0, gdirPass = 0;
    const statuses = {}, gdirErrors = {}, reports = [];
    const batchCache = new Map();
    for (const s of r.specs) {
      const rep = await compileSpecFile(path.join(tmp.dir, 'b', s.id, 'spec.json'), ctx, { batchCache, composer });
      reports.push(rep);
      assert.deepEqual(rep.gates['G-SPEC'].errors, [], s.id);
      if (rep.gates['G-SPEC'].pass) gspecPass++;
      statuses[rep.status] = (statuses[rep.status] || 0) + 1;
      const g = rep.gates['G-DIR'];
      if (g.status === 'ran') {
        gdirRan++;
        if (g.pass) gdirPass++;
        for (const e of g.errors) gdirErrors[e.rule] = (gdirErrors[e.rule] || 0) + 1;
      } else {
        // a gate that did not run is never reported as passed, and neither is the compile
        assert.equal(g.pass, null, s.id);
        assert.equal(rep.pass, null, s.id);
        assert.equal(rep.status, 'incomplete', s.id);
      }
    }
    const distinct = (f) => new Set(r.specs.map(f)).size;
    const slots = {
      cellSets: distinct((s) => Object.keys(s.cells).sort().join()), templates: distinct((s) => s.template), tods: distinct((s) => s.tod),
      durations: distinct((s) => s.duration), hooks: distinct((s) => s.copy.hook.join(' ')), lineTriples: distinct((s) => s.copy.lines.join('|')),
      ends: distinct((s) => s.copy.end.text.join(' ')), intensities: distinct((s) => s.gag.intensity), jitters: distinct((s) => JSON.stringify(s.worldJitter)),
    };
    t.diagnostic(`G-SPEC ${gspecPass}/${r.specs.length}; G-DIR ran ${gdirRan}, passed ${gdirPass}${Object.keys(gdirErrors).length ? ` (errors ${JSON.stringify(gdirErrors)})` : ''}; compile ${JSON.stringify(statuses)}; distinct ${JSON.stringify(slots)}`);
    return { gspecPass, statuses, gdirRan, gdirPass, gdirErrors, slots, reports };
  } finally { tmp.done(); }
}

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
const realComposer = await loadComposer(COMPOSER_DIR);
const GDIR_SKIP = realComposer ? false : 'composer/compose.js and composer/validate.js do not exist yet (WP-03): G-DIR has not run on these specs';

/** Every cell combination the capabilities allow for the planner's options (move ids per slot). */
const enabledCellSets = (caps, mode) => ['gag', 'metaphor', 'turn', 'ritual', 'loop', 'camera', 'arc'].reduce((n, k) => n * caps.movesOfKind(k, 'noomi', mode).length, 1);

test('1,000 specs over the enabled cells compile through G-SPEC and G-DIR with 0 violations', async (t) => {
  const ctx = realCtx();
  const r = planBatch({ ...ctx, mode: 'review', count: 1000, seed: 2026, batch: 'prop-real' });
  assert.equal(r.specs.length, 1000);
  const res = await compileAll(r, ctx, t, { composer: realComposer });
  assert.equal(res.gspecPass, 1000);
  // the committed capabilities enable exactly one cell per slot (the approved v2 moves), so every
  // spec has that one cell set by construction; what varies is copy, seed, intensity and jitter
  assert.equal(enabledCellSets(ctx.caps, 'review'), 1);
  assert.equal(res.slots.cellSets, 1);
  // T01 / late night / 15 s offers 8 lint-clean hooks and 4 lines per slot (hm lib coverage): at most 64 triples
  assert.equal(res.slots.hooks, 8, JSON.stringify(res.slots));
  assert.ok(res.slots.lineTriples >= 48 && res.slots.lineTriples <= 64, JSON.stringify(res.slots));
  assert.ok(res.slots.intensities >= 10, JSON.stringify(res.slots));
  // the G-DIR half: runs by itself the day composer/ lands, and must then hold for all 1,000
  await t.test('G-DIR (composer/validate.js) passes on all 1,000 specs', { skip: GDIR_SKIP }, () => {
    assert.equal(res.gdirRan, 1000);
    assert.deepEqual(res.gdirErrors, {});
    assert.equal(res.gdirPass, 1000);
  });
  if (!realComposer) assert.deepEqual(res.statuses, { incomplete: 1000 }, 'without the composer every compile is incomplete, never passed');
});

test('the compile path end to end through a stub composer: verdicts, failures and the G-SPEC gate (wiring, not G-DIR)', async (t) => {
  const ctx = realCtx();
  const r = planBatch({ ...ctx, mode: 'review', count: 1000, seed: 2026, batch: 'prop-real' });
  // full stub (compose, gdir, gcost): every gate runs and passes, so the compile is complete
  const stub = await loadComposer(path.join(FIXTURES, 'composer-stub'));
  const a = await compileAll(r, ctx, t, { composer: stub });
  assert.deepEqual([a.gspecPass, a.gdirRan, a.gdirPass], [1000, 1000, 1000]);
  assert.deepEqual(a.statuses, { pass: 1000 });
  assert.ok(a.reports.every((rep) => rep.pass === true && rep.pending.length === 0 && rep.gates['G-COST'].status === 'ran'));
  // strict stub (no cost.js; refuses intensity > 0.9): G-DIR failures fail the compile, the rest stay incomplete
  const strict = await loadComposer(path.join(FIXTURES, 'composer-strict'));
  const b = await compileAll(r, ctx, t, { composer: strict });
  const hot = r.specs.filter((s) => s.gag.intensity > 0.9).length;
  assert.ok(hot > 0 && hot < 1000, `${hot} specs above 0.9`);
  assert.deepEqual(b.statuses, { fail: hot, incomplete: 1000 - hot });
  assert.deepEqual(b.gdirErrors, { 'stub:strict-intensity': hot });
  assert.ok(b.reports.filter((rep) => rep.status === 'fail').every((rep) => rep.pass === false && rep.gates['G-COST'].status === 'not-run'));
  // a spec G-SPEC refuses never reaches the composer
  const tmp = temp('prop-compile-bad-');
  try {
    const bad = { ...r.specs[0], mallow: 'zuzu' };
    fs.writeFileSync(path.join(tmp.dir, 'bad.json'), JSON.stringify(bad));
    const rep = await compileSpecFile(path.join(tmp.dir, 'bad.json'), ctx, { composer: stub });
    assert.equal(rep.status, 'fail');
    assert.equal(rep.gates['G-DIR'].status, 'not-run');
    assert.match(rep.gates['G-DIR'].reason, /G-SPEC failed/);
  } finally { tmp.done(); }
  // and the CLI takes the same seam (HM_COMPOSER_DIR): a planned batch compiles complete through the stub
  const tmp2 = temp('prop-compile-cli-');
  try {
    const env = { HM_LEDGER_DIR: path.join(tmp2.dir, 'ledger') };
    assert.equal(hm(['plan', '--count', '3', '--seed', '3', '--review', '--out', path.join(tmp2.dir, 'batch')], { env }).status, 0);
    const c = hm(['spec', 'compile', path.join(tmp2.dir, 'batch')], { env: { ...env, HM_COMPOSER_DIR: path.join(FIXTURES, 'composer-stub') } });
    assert.equal(c.status, 0, c.out);
    assert.match(c.stdout, /compiled 3: 0 failed, 0 incomplete, 3 complete/);
    assert.match(c.stdout, /G-DIR pass, G-COST pass/);
    const s = hm(['spec', 'compile', path.join(tmp2.dir, 'batch')], { env: { ...env, HM_COMPOSER_DIR: path.join(FIXTURES, 'composer-strict') } });
    // seed 3 plans three gags above 0.9: each fails the strict stub's G-DIR, and the exit code says so
    assert.equal(s.status, 1, s.out);
    assert.match(s.stdout, /G-DIR FAIL; not run: G-COST\n {2}ERROR G-DIR stub:strict-intensity: intensity/);
    assert.match(s.stdout, /compiled 3: 3 failed, 0 incomplete, 0 complete/);
  } finally { tmp2.done(); }
});

test('1,000 specs over a wide enabled-cell set compile with 0 violations: Noomi with every cell, ToD and duration approved', async (t) => {
  const open = openCapabilities(lib);
  const raw = structuredClone(open.raw);
  for (const m of Object.keys(raw.mallows)) if (m !== 'noomi') raw.mallows[m] = { status: 'blocked' };
  const caps = capsFrom(raw);
  const ctx = { ...openCtx(), caps };
  const r = planBatch({ ...ctx, mode: 'review', count: 1000, seed: 2027, batch: 'prop-noomi' });
  assert.equal(r.specs.length, 1000);
  const { gspecPass, slots, gdirRan, reports } = await compileAll(r, ctx, t, { composer: realComposer });
  assert.equal(gspecPass, 1000);
  if (realComposer) {
    // the wide set opens cells, ToDs and durations the composer has not built yet (moves arrive from WP-13 on,
    // Moonmilk ToDs with WP-14): those specs must be refused by compose, never passed; every spec the composer
    // can build must pass G-DIR
    assert.equal(gdirRan, 1000);
    const UNBUILT = /move:unbuilt|realm:tod|realm:weather|realm:dressing|cell:missing/;
    const built = reports.filter((rep) => !rep.gates['G-DIR'].errors.some((e) => e.rule === 'compose' && UNBUILT.test(e.message)));
    for (const rep of built) assert.deepEqual(rep.gates['G-DIR'].errors, [], rep.id);
    for (const rep of reports) for (const e of rep.gates['G-DIR'].errors) assert.ok(e.rule !== 'compose' || UNBUILT.test(e.message), `${rep.id}: ${e.message}`);
    t.diagnostic(`G-DIR on the wide set: ${built.length} composable specs pass, ${1000 - built.length} refused as not built yet`);
  }
  const noomiTemplates = [...lib.templates.values()].filter((x) => [...x.mallows.primary, ...x.mallows.secondary].includes('noomi') && !x.mallows.avoid?.noomi).length;
  assert.equal(slots.templates, noomiTemplates, 'every template Noomi is cast in');
  assert.ok(slots.cellSets >= 200, `cell combinations vary: ${slots.cellSets}`);
  assert.equal(slots.tods, lib.raw.mallows.noomi.tods.length, 'every Noomi time of day');
  assert.equal(slots.durations, 4);
});

test('the whole library (every capability opened) plans clean specs: 3,000 review specs', () => {
  const ctx = openCtx();
  const r = planBatch({ ...ctx, mode: 'review', count: 3000, seed: 77, batch: 'prop-open' });
  assert.equal(r.specs.length, 3000);
  assert.deepEqual(errorsIn(r.specs, ctx), {});
  const templates = new Set(r.specs.map((s) => s.template));
  const mallows = new Set(r.specs.map((s) => s.mallow));
  assert.equal(templates.size, 28);
  assert.equal(mallows.size, 7);
});

test('90-day posting plans at the capped cadence satisfy every posting rule (3 seeds, independent check)', (t) => {
  const ctx = openCtx();
  for (const seed of [1, 2, 3]) {
    const r = planBatch({ ...ctx, mode: 'production', count: 180, seed, batch: `sim-${seed}`, channel: 'tiktok', start: '2026-11-03' });
    assert.equal(r.specs.length, 180, JSON.stringify(r.failures));
    assert.equal(r.manifest.perWeek, 14);
    assert.deepEqual(errorsIn(r.specs, ctx), {}, `seed ${seed}`);
    assert.deepEqual(independentPostingCheck(r.specs, { unlocked: ctx.caps.unlocked() }), [], `seed ${seed}`);
    t.diagnostic(`seed ${seed}: 180 posts ${r.specs[0].plannedFor}..${r.specs.at(-1).plannedFor}, ${r.manifest.backtracks} backtracks`);
  }
});

test('Q1 default: Noomi-only posting at 5 per week for 90 days', () => {
  const open = openCapabilities(lib);
  const raw = structuredClone(open.raw);
  for (const m of Object.keys(raw.mallows)) if (m !== 'noomi') raw.mallows[m] = { status: 'blocked' };
  const caps = capsFrom(raw);
  const ctx = { ...openCtx(), caps };
  const r = planBatch({ ...ctx, mode: 'production', count: 64, seed: 5, batch: 'q1', channel: 'tiktok', start: '2026-11-03' });
  assert.equal(r.manifest.perWeek, 5);
  assert.equal(r.specs.length, 64, JSON.stringify(r.failures));
  assert.ok(r.specs.every((s) => s.mallow === 'noomi'));
  assert.deepEqual(errorsIn(r.specs, ctx), {});
  assert.deepEqual(independentPostingCheck(r.specs, { unlocked: ['noomi'] }), []);
});

test('tampered specs never pass G-SPEC (600 seeded mutations)', () => {
  const ctx = openCtx();
  const specs = planBatch({ ...ctx, mode: 'review', count: 200, seed: 9, batch: 'fuzz' }).specs;
  const all = [...lib.templates.values()];
  const otherTemplate = (s, r) => r.pick(all.filter((t) => t.id !== s.template));
  const mutators = {
    'foreign hook': (s, r) => { s.copy.hook = r.pick(hooksOf(otherTemplate(s, r))); },
    'foreign line': (s, r) => { s.copy.lines[r.int(3)] = r.pick(linePools(otherTemplate(s, r))[0]); },
    'Mallow not cast': (s, r) => { const t = lib.template(s.template); const m = r.pick(lib.MALLOWS.filter((x) => !t.mallows.primary.includes(x) && !t.mallows.secondary.includes(x))); if (!m) return false; s.mallow = m; s.realm = lib.raw.mallows[m].realm; },
    'duration not offered': (s) => { const t = lib.template(s.template); const d = [10, 12, 15, 20].find((x) => !t.durations.includes(x)); if (!d) return false; s.duration = d; },
    'ritual not offered': (s, r) => { const t = lib.template(s.template); s.ritual = r.pick(lib.ids.rituals.filter((x) => x !== t.ritual.primary && !t.ritual.alts.includes(x))); },
    'intensity over cap': (s) => { s.gag.intensity = 1; s.template = 'T14-missing-someone'; },
    'unsealed edit': (s) => { s.seed = (s.seed + 1) >>> 0; return 'raw'; },
    'wrong ToD': (s) => { s.tod = 'afternoon-x'; },
    'arc swap': (s) => { s.arc = s.arc === 'A-GREY-CLEAR' ? 'A-DIM-SOFT' : 'A-GREY-CLEAR'; },
    'closer edit': (s) => { s.copy.end = { kind: 'closer', text: ['Your second brain', 'for feeling.'] }; },
  };
  const names = Object.keys(mutators);
  const r = stream(424242, 'fuzz');
  let tried = 0;
  for (let i = 0; i < 600; i++) {
    const s = structuredClone(r.pick(specs));
    const name = names[i % names.length];
    const res = mutators[name](s, r);
    if (res === false) continue;
    if (res !== 'raw') { s.fingerprint = fingerprint(s); s.id = specId(s); }
    tried++;
    const g = checkSpec(s, ctx);
    assert.equal(g.pass, false, `${name} slipped through: ${s.id}`);
  }
  assert.ok(tried >= 500, `${tried} mutations applied`);
});

test('10k specs through `hm plan` in under 10 s each run, byte-reproducible across processes', (t) => {
  const tmp = temp('prop-10k-');
  try {
    const run = (out) => {
      const t0 = process.hrtime.bigint();
      const r = hm(['plan', '--count', '10000', '--seed', '20261014', '--review', '--no-distinct', '--out', out, '--ledger', path.join(tmp.dir, 'ledger')]);
      return { ...r, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
    };
    const a = run(path.join(tmp.dir, 'a'));
    const b = run(path.join(tmp.dir, 'b'));
    assert.equal(a.status, 0, a.out);
    assert.equal(b.status, 0, b.out);
    const plannedMs = Number(/planned in (\d+) ms/.exec(a.stdout)[1]);
    t.diagnostic(`planning ${plannedMs} ms; whole command incl. writing 10,000 spec files ${a.ms.toFixed(0)} / ${b.ms.toFixed(0)} ms`);
    assert.ok(plannedMs < 10000 && a.ms < 10000 && b.ms < 10000);
    const digest = (dir) => {
      const plan = fs.readFileSync(path.join(dir, 'plan.json'));
      const ids = JSON.parse(plan).specs.map((e) => e.id);
      assert.equal(ids.length, 10000);
      assert.equal(new Set(ids).size, 10000, 'ids are unique: one folder per spec');
      assert.equal(fs.readdirSync(dir).length, 10001);
      return sha256Hex(Buffer.concat([plan, ...ids.map((id) => fs.readFileSync(path.join(dir, id, 'spec.json')))]));
    };
    assert.equal(digest(path.join(tmp.dir, 'a')), digest(path.join(tmp.dir, 'b')));
  } finally { tmp.done(); }
});

test('fingerprints are unique across a large plan and stable when re-derived', () => {
  const r = planBatch({ ...openCtx(), mode: 'review', count: 5000, seed: 31, batch: 'fp' });
  const fps = new Set(r.specs.map((s) => s.fingerprint));
  assert.equal(fps.size, 5000);
  for (const s of r.specs.slice(0, 500)) assert.equal(fingerprint(structuredClone(s)), s.fingerprint);
  void policy;
});
