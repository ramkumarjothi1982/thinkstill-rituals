// The planner and the story-library validator (FU-3):
//   - planner/library-check.mjs restates templates/validate-library.mjs; the
//     real script, run on what-if libraries, reports exactly the same lines;
//   - the planner refuses to plan, and G-SPEC refuses every spec, while the
//     library fails the validator;
//   - copy lint is a superset of the validator: every text the real script
//     rejects (time words included) is refused by the planner's lint in every
//     time of day open to the template's cast.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { lib, policy, temp } from '../property/support.mjs';
import { studioPath } from '../../render/lib/paths.mjs';
import { indexLibrary, castOf } from '../../planner/library.mjs';
import { validatorFindings, assertValidLibrary } from '../../planner/library-check.mjs';
import { lintHook, lintEnd, lintLine, errorsOf } from '../../planner/lint-copy.mjs';
import { loadCapabilities } from '../../planner/capabilities.mjs';
import { emptyLedger } from '../../planner/ledger.mjs';
import { planBatch, planSpec } from '../../planner/pick.mjs';
import { checkSpec } from '../../planner/gspec.mjs';
import { sha256Hex } from '../../planner/canonical.mjs';

const VALIDATOR = studioPath('templates', 'validate-library.mjs');

/** Run the real validator script on a library object (copied next to it in a temp dir). → { errors, warnings, status } */
function runValidator(raw, dir) {
  fs.copyFileSync(VALIDATOR, path.join(dir, 'validate-library.mjs'));
  fs.writeFileSync(path.join(dir, 'story-library.json'), JSON.stringify(raw, null, 2));
  const r = spawnSync(process.execPath, [path.join(dir, 'validate-library.mjs')], { encoding: 'utf8' });
  const lines = r.stdout.split('\n');
  return {
    status: r.status,
    errors: lines.filter((l) => l.startsWith('ERROR ')).map((l) => l.slice(6)),
    warnings: lines.filter((l) => l.startsWith('warn  ')).map((l) => l.slice(6)),
  };
}

/** A what-if library: T01 (cast: Noomi, late night) with extra hooks, lines and resolutions. → { raw, at } */
function whatIf({ hooks = [], lines = [], resolutions = [] } = {}) {
  const raw = structuredClone(lib.raw);
  const t01 = raw.templates.find((t) => t.id === 'T01-brain-at-2am');
  const at = { hooks: hooks.map((h) => { t01.hook.variants.push(h); return t01.hook.variants.length; }), resolutions: resolutions.map((r) => { t01.resolution.variants.push(r); return t01.resolution.variants.length; }) };
  t01.escalation.pools.L1.push(...lines);
  return { raw, at };
}

const PROBES = {
  hooks: [["TWO O'CLOCK IN THE MORNING"], ['3 IN THE MORNING AND', 'STILL SCROLLING'], ['UP AT 4 THIS MORNING'], ['GOOD MORNING SUNSHINE'], ['ME AT 3 PM, STILL HERE'],
    ['ME AFTER LUNCH AGAIN'], ['ME AT 2 AM AGAIN'], ['THIS HOOK LINE IS WAY TOO LONG TO FIT'], ['me at 2 am again'], ['MY THERAPIST SAID HI'], ['WHY? REALLY?'],
    ['VISIT HUSHMALLOW TODAY'], ['SMOKED AGAIN AT 2 AM']],
  resolutions: [['Good morning,', 'little one.'], ['See you after lunch.'], ['Rest now, it is late.'], ['A line that is far too long for it.'], ['Anxiety can wait.'],
    ['Visit Hushmallow.']],
  lines: ['Anxiety again.', 'A line that is far too long for it.', 'One more breath.', 'Up at 9 AM.'],
};

test('library-check reports exactly what the real templates/validate-library.mjs reports', () => {
  const tmp = temp('libcheck-');
  try {
    const cases = {
      committed: lib.raw,
      'time words and copy faults': whatIf(PROBES).raw,
      duplicates: whatIf({ hooks: [lib.raw.templates[1].hook.primary], lines: [lib.raw.templates[0].escalation.lines[0]] }).raw,
    };
    const broken = structuredClone(lib.raw);
    broken.beatClocks['10'] = { ...broken.beatClocks['10'], IMPACT: 1.2 };
    broken.rituals['R-BREATH'] = { ...broken.rituals['R-BREATH'], minDur: 9 };
    broken.templates[3].hook.variants = broken.templates[3].hook.variants.slice(0, 4);
    cases['clocks and rituals'] = broken;
    for (const [name, raw] of Object.entries(cases)) {
      const dir = path.join(tmp.dir, name.replace(/\W+/g, '-'));
      fs.mkdirSync(dir);
      const real = runValidator(raw, dir);
      const mine = validatorFindings(structuredClone(raw));
      assert.deepEqual(mine.errors, real.errors, `${name}: errors`);
      assert.deepEqual(mine.warnings, real.warnings, `${name}: warnings`);
      assert.equal(real.status, real.errors.length ? 1 : 0);
      if (name !== 'committed') assert.ok(real.errors.length > 0, `${name} is a failing library`);
    }
    assert.deepEqual(validatorFindings(lib.raw).errors, [], 'the committed library passes');
  } finally { tmp.done(); }
});

test('copy lint is a superset of the real validator: every text it rejects is refused in every time of day the cast can have', () => {
  const tmp = temp('superset-');
  try {
    const { raw, at } = whatIf(PROBES);
    const real = runValidator(raw, tmp.dir);
    const lib2 = indexLibrary(raw);
    const t = lib2.template('T01');
    const contexts = castOf(t).flatMap((m) => lib2.todsFor(t, m)).map((tod) => ({ lib: lib2, policy, tod }));
    assert.ok(contexts.length >= 1);
    const flagged = (where) => real.errors.some((e) => e.startsWith(`${where}: `) && !/duplicate copy/.test(e));
    const refusedEverywhere = (fn) => contexts.every((c) => errorsOf(fn(c)).length > 0);
    let rejected = 0;
    PROBES.hooks.forEach((h, i) => {
      if (!flagged(`T01-brain-at-2am hook[${at.hooks[i]}]`)) return;
      rejected++;
      assert.ok(refusedEverywhere((c) => lintHook(h, c)), `hook ${h.join(' / ')}: the validator rejects it, the planner must too`);
    });
    PROBES.resolutions.forEach((r, i) => {
      if (!flagged(`T01-brain-at-2am resolution[${at.resolutions[i]}]`)) return;
      rejected++;
      assert.ok(refusedEverywhere((c) => lintEnd(r, c)), `resolution ${r.join(' / ')}`);
    });
    for (const l of PROBES.lines) {
      if (!real.errors.some((e) => e.startsWith('T01-brain-at-2am line: ') && e.includes(`"${l}"`))) continue;
      rejected++;
      assert.ok(refusedEverywhere((c) => lintLine(l, 0, c)), `line ${l}`);
    }
    // the validator's time rule is among them: the clock phrases with MORNING inside, a morning and an afternoon hook
    for (const h of ["TWO O'CLOCK IN THE MORNING", '3 IN THE MORNING AND STILL SCROLLING', 'UP AT 4 THIS MORNING', 'GOOD MORNING SUNSHINE', 'ME AFTER LUNCH AGAIN']) {
      assert.ok(real.errors.some((e) => e.includes(`time words in "${h}" fit no cast Mallow's ToD`)), h);
    }
    assert.ok(rejected >= 14, `${rejected} probe texts rejected by the validator`);
    // and the clean late-night hook passes both (the floor does not over-refuse)
    assert.ok(!flagged(`T01-brain-at-2am hook[${at.hooks[6]}]`));
    assert.ok(contexts.every((c) => !errorsOf(lintHook(['ME AT 2 AM AGAIN'], c)).length));
  } finally { tmp.done(); }
});

test('the planner refuses to plan from a library the validator rejects, and G-SPEC refuses its specs', () => {
  const ctx = { lib, policy, caps: loadCapabilities(lib), ledger: emptyLedger() };
  const good = planSpec({ ...ctx, mode: 'review', seed: 3, batch: 'lc' }).spec;
  assert.ok(good);
  const { raw } = whatIf({ hooks: [["TWO O'CLOCK IN THE MORNING"]] });
  const bad = indexLibrary(raw, { sha256: sha256Hex(JSON.stringify(raw)) });
  assert.throws(() => assertValidLibrary(bad), /fails templates\/validate-library\.mjs with 1 error\(s\)[\s\S]*fit no cast Mallow's ToD/);
  const c2 = { ...ctx, lib: bad, caps: loadCapabilities(bad) };
  assert.throws(() => planBatch({ ...c2, mode: 'review', count: 5, seed: 1, batch: 'x' }), /fails templates\/validate-library\.mjs/);
  assert.throws(() => planSpec({ ...c2, mode: 'review', seed: 1, batch: 'x' }), /fails templates\/validate-library\.mjs/);
  const g = checkSpec(good, { ...c2, batchSpecs: [good] });
  assert.ok(g.errors.some((e) => e.rule === 'library'), JSON.stringify(g.errors.map((e) => e.rule)));
  assert.equal(checkSpec(good, { ...ctx, batchSpecs: [good] }).pass, true, 'the same spec passes against the committed library');
});
