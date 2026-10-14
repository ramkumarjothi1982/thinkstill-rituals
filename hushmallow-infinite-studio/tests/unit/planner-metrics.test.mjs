import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lib, policy } from '../property/support.mjs';
import { loadMetrics, measureText, fitSize, typographic } from '../../planner/text-metrics.mjs';
import { HUSHMALLOW } from '../../render/lib/paths.mjs';
import { sha256Hex } from '../../planner/canonical.mjs';
import { buildCaption, captionSources, loadBrand, exportBlockers, qaProblems } from '../../planner/export.mjs';
import { statedIntensityCaps, validatePlannerInputs } from '../../planner/validate-lib.mjs';

test('the committed Fredoka metrics match the app font and the render-measured strings', () => {
  const m = loadMetrics();
  assert.equal(m.schema, 'hm-font-metrics/1');
  assert.equal(m.font.sha256, sha256Hex(fs.readFileSync(`${HUSHMALLOW}/assets/fonts/fredoka-latin.woff2`)));
  assert.deepEqual(Object.keys(m.weights), ['400', '500', '600', '700']);
  for (const c of m.check) {
    const err = Math.abs(measureText(c.text, { ...c, metrics: m }) - c.measured) / c.measured;
    assert.ok(err < 0.02, `${c.text}: ${(err * 100).toFixed(2)}%`);
  }
  assert.ok(m.libraryCheck.maxRelErrorPct < ((policy.layout.margin - 1) * 100) / 2, 'model error under half the planner margin');
});

test('measureText, fitSize and the typography transform', () => {
  assert.equal(typographic("IT'S 'OK.' \"FINE\""), 'IT’S ‘OK.’ “FINE”');
  const w76 = measureText('ME TRYING TO SLEEP', { weight: 600, size: 76, tracking: 2 });
  assert.ok(Math.abs(w76 - 788.02) < 0.05, `${w76}`);
  assert.ok(Math.abs(measureText('ME TRYING TO SLEEP', { weight: 600, size: 38, tracking: 2 }) - ((w76 - 36) / 2 + 36)) < 1e-9, 'linear in size, tracking per character');
  const L = policy.layout.hook;
  assert.equal(fitSize(['ME TRYING TO SLEEP', 'AT 2 AM...'], { ...L, max: L.maxSize, min: L.minSize, margin: policy.layout.margin }), 76);
  const long = fitSize(['BEDTIME? MY BRAIN THINKS'], { ...L, max: L.maxSize, min: L.minSize, margin: policy.layout.margin });
  assert.ok(long >= 50 && long <= 76);
  assert.equal(fitSize(['W'.repeat(30)], { ...L, max: L.maxSize, min: L.minSize, margin: policy.layout.margin }), null);
  assert.throws(() => measureText('中', { weight: 500, size: 50 }), /no Fredoka metrics for character U\+4e2d/);
});

test('caption.txt: the library entries the spec names, plus the owner hashtags only', () => {
  const spec = { template: 'T01-brain-at-2am', copy: { hook: ['ME TRYING TO SLEEP', 'AT 2 AM...'], end: { kind: 'resolution', text: ['Give your feelings', 'somewhere soft to land.'] } } };
  const brand = (list) => ({ hashtags: { curatedBy: 'test', list } });
  assert.equal(buildCaption(spec, brand([]), lib), 'ME TRYING TO SLEEP AT 2 AM...\n\nGive your feelings somewhere soft to land.\n');
  assert.equal(buildCaption(spec, brand(['#hushmallow', '#cozy']), lib).split('\n').at(-2), '#hushmallow #cozy');
  const src = captionSources(spec, lib);
  assert.equal(src.hook.source, 'templates/story-library.json T01-brain-at-2am hook.primary');
  assert.equal(src.end.source, 'templates/story-library.json T01-brain-at-2am resolution.primary');
  assert.equal(src.hook.lines, lib.template('T01').hook.primary, 'the caption is made of the library\'s own entries');
  const closer = { ...spec, copy: { ...spec.copy, end: { kind: 'closer', text: lib.raw.brand.closers[1] } } };
  assert.equal(captionSources(closer, lib).end.source, 'templates/story-library.json brand.closers[1]');
  // invented copy never becomes a caption
  assert.throws(() => buildCaption({ ...spec, copy: { ...spec.copy, hook: ['BUY OUR NEW STUFF NOW'] } }, brand([]), lib), /is not a T01-brain-at-2am hook/);
  assert.throws(() => buildCaption({ ...spec, copy: { ...spec.copy, end: { kind: 'resolution', text: ['Use code SAVE20 today.'] } } }, brand([]), lib), /is not a T01-brain-at-2am resolution/);
  assert.throws(() => buildCaption({ ...spec, template: 'T12-three-pm-slump' }, brand([]), lib), /is not a T12-three-pm-slump hook/, 'a hook of another template is not this template\'s copy');
  assert.equal(loadBrand().hashtags.list.length, 0, 'ships empty until the owner curates it');
  assert.deepEqual(exportBlockers({ internal: true, mode: 'review' }, { ledger: { decisions: [] }, dir: '/nonexistent', skipQa: true }).length > 0, true, 'a malformed spec is refused before anything else');
});

test('qaProblems: a report must judge this video and spec, run every gate, and include the required ones', () => {
  const v = 'c'.repeat(64), fp = `sha256:${'d'.repeat(64)}`, required = ['G-FINAL', 'G-AUDIO'];
  const ok = { video: { sha256: v }, spec: { fingerprint: fp }, gates: { 'G-FINAL': { pass: true }, 'G-AUDIO': { pass: true, warn: true } } };
  const check = (rep) => qaProblems(rep, { videoSha256: v, fingerprint: fp, required });
  assert.deepEqual(check(ok), []);
  assert.deepEqual(check({ ...ok, video: { sha256: `sha256:${v}` } }), [], "'sha256:' prefix accepted");
  assert.deepEqual(check({ ...ok, gates: { 'G-FINAL:delivery': { pass: true }, 'G-FINAL-flash': { pass: true }, 'G-AUDIO': { pass: true } } }), [], 'sub-gates satisfy a required gate');
  const cases = [
    [{ nothing: 1 }, /no gates object/],
    [[], /not a JSON object/],
    [{ ...ok, gates: {} }, /lists no gates/],
    [{ ...ok, gates: { ...ok.gates, 'G-FINAL': { pass: false } } }, /QA gates failed: G-FINAL/],
    [{ ...ok, gates: { ...ok.gates, 'G-AUDIO': { pass: null } } }, /did not run.*G-AUDIO/],
    [{ ...ok, gates: { ...ok.gates, 'G-AUDIO': { status: 'not-run' } } }, /did not run.*G-AUDIO/],
    [{ ...ok, gates: { ...ok.gates, 'G-AUDIO': { pass: 'yes' } } }, /did not run.*G-AUDIO/],
    [{ ...ok, gates: { 'G-FINAL': { pass: true } } }, /required QA gate G-AUDIO is missing/],
    [{ ...ok, gates: { 'G-FINALIZE': { pass: true }, 'G-AUDIO': { pass: true } } }, /required QA gate G-FINAL is missing/],
    [{ ...ok, video: undefined }, /does not name the video/],
    [{ ...ok, video: { sha256: 'e'.repeat(64) } }, /judged another video/],
    [{ ...ok, spec: undefined }, /does not name the spec/],
    [{ ...ok, spec: { fingerprint: `sha256:${'0'.repeat(64)}` } }, /judged spec/],
  ];
  for (const [rep, re] of cases) assert.ok(check(rep).some((p) => re.test(p)), `${JSON.stringify(rep).slice(0, 90)} -> ${check(rep)}`);
});

test('lib validate (planner half): inputs agree with the library; caps cover the stated ones', () => {
  assert.deepEqual(statedIntensityCaps(lib), { 'T09-rejection-sting': 0.6, 'T14-missing-someone': 0.4, 'T26-nostalgia': 0.4 });
  const r = validatePlannerInputs({ lib });
  assert.deepEqual(r.errors, []);
  assert.ok(r.info.some((l) => /652 library texts/.test(l)));
});
