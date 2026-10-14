// QA suite v1 (WP-05): the Node side of the gates. Verdict rules, targets and
// contexts, geometry, layout, brand marks, allowlist, delivery helpers, dupes,
// the fixture judge, the gallery template, and the Python metric tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { studioPath, mkWorkTemp } from '../../render/lib/paths.mjs';
import { gate, notRunGate, reportVerdict, check } from '../../qa/gates/verdict.mjs';
import { expandTarget, loadContext, V2_TARGET, LEGACY } from '../../qa/gates/context.mjs';
import { faceBoxArt, overlayText, directionGeometry } from '../../qa/gates/geometry.mjs';
import { polygonMask, layoutGate } from '../../qa/gates/layout.mjs';
import { expectedMark, brandMarksGate } from '../../qa/gates/brand-marks.mjs';
import { allowlistGate, magnificationCheck, allowlist } from '../../qa/gates/allowlist.mjs';
import { topAtoms, provenanceCheck } from '../../qa/gates/delivery.mjs';
import { hamming, dupesGate } from '../../qa/gates/dupes.mjs';
import { pickFrames, referenceOf } from '../../qa/gates/determinism.mjs';
import { judge } from '../../qa/fixtures/run-fixtures.mjs';
import { loadThresholds, logoWindows, GATE_ORDER } from '../../qa/run-qa.mjs';
import { qaProblems } from '../../planner/export.mjs';

const T = loadThresholds();
const golden = JSON.parse(fs.readFileSync(studioPath('specs', 'golden', 't01-v2.direction.json'), 'utf8'));

test('a gate fails on any failed check, does not run when a required check did not, and ignores report-only checks', () => {
  assert.equal(gate({ a: check('pass'), b: check('warn') }).pass, true);
  assert.equal(gate({ a: check('pass'), b: check('warn') }).warn, true);
  assert.equal(gate({ a: check('pass'), b: check('fail') }).pass, false);
  assert.equal(gate({ a: check('pass'), b: check('not-run') }).pass, null);
  assert.equal(gate({ a: check('fail'), b: check('not-run') }).pass, false);
  assert.equal(gate({ a: check('pass'), b: check('not-run', null, null, '', { reportOnly: true }) }).pass, true);
  assert.equal(gate({}).pass, null);
  assert.throws(() => gate({ a: { status: 'maybe' } }), /bad status/);
  assert.equal(notRunGate('x').pass, null);
});

test('the report verdict: fail beats incomplete beats pass, and a passing report meets the export QA contract', () => {
  const p = { pass: true, warn: false }, f = { pass: false }, n = { pass: null };
  assert.deepEqual(reportVerdict({ a: p, b: p }), { status: 'pass', pass: true, failed: [], pending: [], warnings: [] });
  assert.equal(reportVerdict({ a: p, b: n }).status, 'incomplete');
  assert.equal(reportVerdict({ a: f, b: n }).status, 'fail');
  const report = { video: { sha256: 'ab' }, spec: { fingerprint: 'sha256:x' }, gates: { 'G-FINAL:flash': p, 'G-AUDIO': p } };
  assert.deepEqual(qaProblems(report, { videoSha256: 'ab', fingerprint: 'sha256:x', required: ['G-FINAL', 'G-AUDIO'] }), []);
  assert.ok(qaProblems({ ...report, gates: { ...report.gates, 'G-DUPES': n } }, { videoSha256: 'ab', fingerprint: 'sha256:x', required: [] }).length);
});

test('every gate the report orders has a threshold block or needs none, and the plan stages are named', () => {
  const ids = GATE_ORDER.map(([id]) => id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['G-FINAL:flash', 'G-FINAL:seam', 'G-DRAFT:safezone', 'G-FINAL:fidelity', 'G-FINAL:logo', 'G-AUDIO', 'G-DUPES']) assert.ok(T.gates[id], id);
  assert.ok(GATE_ORDER.every(([, st]) => ['both', 'final'].includes(st)));
});

test('targets: v2, a manifest, a job directory, a batch and a video expand; anything else is refused', () => {
  assert.deepEqual(expandTarget('v2'), [{ kind: 'manifest', path: V2_TARGET }]);
  const dir = mkWorkTemp('qa-ctx-');
  try {
    const a = path.join(dir, 'a'), b = path.join(dir, 'b');
    fs.mkdirSync(a); fs.mkdirSync(b);
    fs.writeFileSync(path.join(a, 'final.mp4'), 'x'); fs.writeFileSync(path.join(b, 'final.mp4'), 'y');
    assert.deepEqual(expandTarget(dir).map((d) => path.basename(d.path)), ['a', 'b']);
    assert.equal(expandTarget(a)[0].kind, 'dir');
    assert.equal(expandTarget(path.join(a, 'final.mp4'))[0].kind, 'video');
    fs.mkdirSync(path.join(dir, 'empty'));
    assert.throws(() => expandTarget(path.join(dir, 'empty')), /no final\.mp4/);
    assert.throws(() => expandTarget(path.join(dir, 'missing')), /does not exist/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the v2 target resolves the approved master, its production twin, the golden direction and the render evidence', async () => {
  const c = await loadContext({ kind: 'manifest', path: V2_TARGET });
  assert.equal(c.videoSha256, '7d28467c04437465bb4ec451faf31e64de2f62ee5355937e0623f4e898b76134');
  assert.equal(c.spec.mode, 'production');
  assert.equal(c.spec.internal, false);
  assert.equal(c.spec.fingerprint, JSON.parse(fs.readFileSync(studioPath('specs', 'golden', 't01-v2.json'), 'utf8')).fingerprint, 'same visible slots and seed as the golden spec');
  assert.equal(c.direction.schema, 'hm-direction/3');
  assert.equal(c.legacy.id, 'my-brain-at-2am-v2');
  assert.equal(c.legacy.sequentialGolden, LEGACY['my-brain-at-2am-v2'].sequentialGolden);
  assert.equal(c.evidence.video.sha256, c.videoSha256);
  assert.equal(c.evidence.chain.farmFrameHashes, c.evidence.chain.sequentialGoldenHashes, 'the evidence describes the approved frames');
  assert.equal(c.duration, 15);
  assert.equal(referenceOf(c).hashes.length, 450);
});

test('geometry: the face box, overlay text boxes and per-frame screen geometry of the golden direction', () => {
  const fb = faceBoxArt(golden.mallow.faceSpec);
  assert.ok(fb[0] < fb[2] && fb[1] < fb[3]);
  const hook = overlayText(golden.text, 0);
  assert.equal(hook.length, 2);
  assert.ok(hook.every((b) => b.alpha === 1 && b.box[1] > 180 && b.box[3] < 400));
  assert.equal(overlayText(golden.text, 5).length, 0, 'no overlay text at 5 s');
  const g = directionGeometry(golden, { frames: 30 });
  assert.equal(g.perFrame.length, 30);
  const f0 = g.perFrame[0];
  assert.equal(f0.cam[2], 1);
  assert.ok(f0.contour.length > 100 && f0.skin.length > 400);
  const xs = f0.contour.filter((_, i) => i % 2 === 0), ys = f0.contour.filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...xs) > 150 && Math.max(...xs) < 930 && Math.max(...ys) <= 1301, 'Noomi stands in the middle, on the water line at y 1300');
});

test('layout: the polygon fill is exact for a square, and the golden film stays inside its calibrated limits', () => {
  const m = polygonMask([10, 10, 30, 10, 30, 30, 10, 30], 1, 40, 40);
  assert.equal(m.reduce((s, v) => s + v, 0), 400);
  const g = directionGeometry(golden);
  const r = layoutGate(g, T);
  assert.equal(r.pass, true);
  assert.ok(r.checks.margin.value >= 24);
  assert.equal(r.checks.propCoverMallow.status, 'warn', 'v2 sits in the provisional warn band');
});

test('brand marks: a mark is required exactly for internal, draft or marked renders', () => {
  const det = (d) => ({ metrics: { detected: d, ncc: {} } });
  assert.equal(expectedMark({ spec: { internal: false, quality: 'final' }, stage: 'final' }).expected, false);
  assert.equal(expectedMark({ spec: { internal: true }, stage: 'final' }).expected, true);
  assert.equal(expectedMark({ stage: 'draft' }).expected, true);
  assert.equal(expectedMark({ stage: 'final', provenance: { job: { params: { mark: 'DRAFT' } } } }).label, 'DRAFT');
  const spec = { internal: false, quality: 'final', copy: { hook: ['A'], lines: ['b'], end: { kind: 'resolution', text: ['c'] } } };
  assert.equal(brandMarksGate({ spec, stage: 'final' }, det(null)).pass, true);
  assert.equal(brandMarksGate({ spec, stage: 'final' }, det('DRAFT')).checks.mark.status, 'fail');
  assert.equal(brandMarksGate({ spec: { ...spec, internal: true }, stage: 'final' }, det(null)).checks.mark.status, 'fail');
  assert.equal(brandMarksGate({ spec: { ...spec, internal: true }, stage: 'final' }, det('INTERNAL')).checks.mark.status, 'pass');
  assert.equal(brandMarksGate({ spec: { ...spec, copy: { ...spec.copy, lines: ['Wow!'] } }, stage: 'final' }, det(null)).checks.noBang.status, 'fail');
  assert.equal(brandMarksGate({ spec: { ...spec, copy: { ...spec.copy, end: { kind: 'both', text: [] } } }, stage: 'final' }, det(null)).checks.endCard.status, 'fail');
});

test('allowlist: hash-locked assets pass, an unknown or changed asset fails, and an upscaled raster fails fidelity', () => {
  const { map } = allowlist();
  const art = 'hushmallow-infinite-studio/assets/noomi/noomi-art.png';
  assert.ok(map.has(art) && map.has('hushmallow/assets/fonts/fredoka-latin.woff2'));
  const files = [{ url: `/${art}`, sha256: map.get(art) }, { url: '/hushmallow-infinite-studio/engine/gl.js', sha256: 'code is not an asset' }];
  assert.equal(allowlistGate({ provenance: { assets: { files } } }, T).pass, true);
  assert.equal(allowlistGate({ provenance: { assets: { files: [{ url: `/${art}`, sha256: '0'.repeat(64) }] } } }, T).pass, false);
  assert.equal(allowlistGate({ provenance: { assets: { files: [{ url: '/hushmallow-infinite-studio/assets/blubi/x.png', sha256: '1'.repeat(64) }] } } }, T).pass, false);
  assert.equal(allowlistGate({}, T).pass, null);
  const r = (m) => ({ provenance: { assets: { rasters: [{ role: 'art', kind: 'image', maxMagnification: m }, { role: 'face', kind: 'canvas', maxMagnification: 3 }] } } });
  assert.equal(magnificationCheck(r(0.87), T).status, 'pass');
  assert.equal(magnificationCheck(r(1.6), T).status, 'fail');
});

test('delivery: faststart is read from the atom order, and stamps are verified against provenance', async () => {
  const dir = mkWorkTemp('qa-mp4-');
  try {
    for (const [name, extra] of [['fast.mp4', ['-movflags', '+faststart']], ['slow.mp4', []]]) {
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=0.2', '-c:v', 'libx264', ...extra, path.join(dir, name)]);
      assert.equal(r.status, 0);
    }
    const order = (f) => topAtoms(path.join(dir, f)).map((a) => a.type);
    assert.ok(order('fast.mp4').indexOf('moov') < order('fast.mp4').indexOf('mdat'));
    assert.equal(order('slow.mp4').indexOf('moov'), -1, 'moov after mdat is never reached');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const prov = { final: { sha256: 'abc' }, job: { key: '0123456789abcdef', direction: 'd1' } };
  assert.equal((await provenanceCheck({ videoSha256: 'abc', provenance: prov }, 'hushmallow-infinite-studio d1 @ 9a16084d9477 job 0123456789ab')).status, 'pass');
  assert.equal((await provenanceCheck({ videoSha256: 'zzz', provenance: prov }, 'hushmallow-infinite-studio d1 @ 9a16084d9477 job 0123456789ab')).status, 'fail');
  assert.equal((await provenanceCheck({ videoSha256: 'abc', provenance: prov }, 'hushmallow-infinite-studio d1 @ 9a16084d9477-dirty job 0123456789ab')).status, 'warn');
  assert.equal((await provenanceCheck({ videoSha256: 'abc' }, 'hushmallow-infinite-studio d1 @ 9a16084d9477 job 0123456789ab')).status, 'fail');
  assert.equal((await provenanceCheck({ videoSha256: 'abc' }, null)).status, 'fail');
  assert.equal((await provenanceCheck({ videoSha256: 'abc' }, 'made with love')).status, 'fail');
});

test('dupes: held at 5 of 7 close anchors within the 14-day window; the video itself and older records are skipped', async () => {
  assert.equal(hamming('ffffffffffffffff', '0000000000000000'), 64);
  assert.equal(hamming('00000000000000f0', '0000000000000000'), 4);
  const anchors = (base, flip) => ['cover', 'gag', 'impact', 'peak', 'ritual-mid', 'eyes-open', 'end-card'].map((label, i) => ({ label, phash: i < flip ? (BigInt(`0x${base}`) ^ 0xffffn).toString(16).padStart(16, '0') : base }));
  const mine = { anchors: anchors('0123456789abcdef', 0) };
  const dir = mkWorkTemp('qa-dupes-');
  try {
    const corpus = path.join(dir, 'c.jsonl');
    const rec = (id, at, flip) => JSON.stringify({ id, at, signature: { anchors: anchors('0123456789abcdef', flip) } });
    fs.writeFileSync(corpus, [rec('other', '2026-10-10T00:00:00Z', 2), rec('self', '2026-10-10T00:00:00Z', 0), rec('old', '2026-09-01T00:00:00Z', 0)].join('\n'));
    const ctx = (extra) => ({ label: 'self', ledgerDir: 'empty', corpus: [corpus], at: '2026-10-14T12:00:00Z', ...extra });
    const held = await dupesGate(ctx({}), mine, T);
    assert.equal(held.pass, false, '5 of 7 anchors identical, 2 at Hamming 16');
    assert.match(held.checks.held.detail, /other/);
    fs.writeFileSync(corpus, rec('other', '2026-10-10T00:00:00Z', 3));
    assert.equal((await dupesGate(ctx({}), mine, T)).pass, true, 'only 4 of 7 close');
    assert.equal((await dupesGate(ctx({ corpus: [] }), mine, T)).pass, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('determinism picks the same distinct frames for the same video', () => {
  const a = pickFrames('7d28467c04437465bb4ec451faf31e64de2f62ee5355937e0623f4e898b76134', 450, 3);
  assert.deepEqual(a, pickFrames('7d28467c04437465bb4ec451faf31e64de2f62ee5355937e0623f4e898b76134', 450, 3));
  assert.equal(new Set(a).size, 3);
  assert.ok(a.every((i) => i >= 0 && i < 450));
  assert.equal(referenceOf({ provenance: null, legacy: null }), null);
});

test('the logo window is the LogoCard at full alpha and full scale', () => {
  const w = logoWindows(golden, 30, 450);
  assert.equal(w.length, 1);
  assert.deepEqual(w[0].frames, [399, 429], 'enter 12.6 + 0.7 s .. exit 14.3 s');
});

test('the fixture judge: exactly the expected gate, with the expected check failing', () => {
  const rep = (gates) => ({ gates });
  const g = (pass, checks = {}) => ({ pass, checks });
  const expect = { gate: 'G-FINAL:flash', check: 'flash' };
  assert.equal(judge(rep({ 'G-FINAL:flash': g(false, { flash: { status: 'fail' } }), 'G-AUDIO': g(true), 'G-DUPES': g(null) }), expect).ok, true);
  assert.match(judge(rep({ 'G-FINAL:flash': g(false, { flash: { status: 'fail' } }), 'G-AUDIO': g(false) }), expect).why, /also fails G-AUDIO/);
  assert.match(judge(rep({ 'G-FINAL:flash': g(true) }), expect).why, /did not fail/);
  assert.match(judge(rep({ 'G-FINAL:flash': g(false, { flash: { status: 'pass' }, red: { status: 'fail' } }) }), expect).why, /not on flash/);
});

test('the fixture list covers the plan\'s thirteen faults, each aimed at a gate the report orders', () => {
  const f = JSON.parse(fs.readFileSync(studioPath('qa', 'fixtures', 'fixtures.json'), 'utf8'));
  const plan = f.fixtures.filter((x) => x.plan);
  assert.deepEqual([...new Set(plan.map((x) => x.planItem))].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const ids = GATE_ORDER.map(([id]) => id);
  for (const x of f.fixtures) {
    assert.ok(ids.includes(x.expect.gate), `${x.id}: ${x.expect.gate}`);
    assert.ok(x.expect.check, x.id);
  }
  assert.equal(new Set(f.fixtures.map((x) => x.id)).size, f.fixtures.length);
});

test('the gallery template is self-contained (no network) and carries the data slot', () => {
  const html = fs.readFileSync(studioPath('gallery', 'template.html'), 'utf8');
  assert.ok(html.includes('/*__GALLERY_DATA__*/null'));
  assert.doesNotMatch(html, /(src|href)=["']https?:/i, 'no external script, style or font');
  assert.doesNotMatch(html, /@import|url\(\s*["']?https?:/i);
  assert.match(html, /decisions\.json/);
});

test('the Python metric tests pass (dE2000 against Sharma et al., SSIM, the text detector, flash blocks, pHash)', () => {
  const r = spawnSync('python3', ['-I', studioPath('qa', 'gates', 'tests', 'run.py')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr.slice(-2000));
});
