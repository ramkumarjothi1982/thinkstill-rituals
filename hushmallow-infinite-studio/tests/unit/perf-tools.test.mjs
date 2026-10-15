// WP-02 tooling, pure parts: quality profiles, the farm's profile defaults,
// hm bench's frame sampling, the pixel-gate metrics, the R14 roll assert.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, FEATURES, DEFAULT_PROFILE, PAGE_PROFILE, resolveProfile, parseFeatures, featureLabel } from '../../engine/render/profiles.js';
import { jobParams, wantsPreview, DEFAULTS } from '../../render/farm.mjs';
import { sampleFrames, parseBenchArgs } from '../../tools/bench.mjs';
import { parseGateArgs, STEP_GATES, FACE_FLOOR_DB, stepGate, pickFrames } from '../../tools/perf/gate.mjs';
import { psnr, ssim, diffSummary } from '../../tools/perf/metrics.mjs';
import { assertNoRoll, framePlan, FRAME_FEATURES } from '../../engine/renderer/index.js';

/** Every feature set resolveProfile accepts (a dependent feature only with its base): → [profile] */
function everyCombination() {
  const names = Object.keys(FEATURES), out = [];
  for (let mask = 0; mask < 1 << names.length; mask++) {
    const on = names.filter((_, k) => mask & (1 << k));
    try { out.push(resolveProfile('exact', { features: ['none', ...on.map((n) => `+${n}`)].join(',') })); } catch (e) {
      if (!/needs/.test(e.message)) throw e;
    }
  }
  return out;
}

test('profiles: the farm renders final by default, a page without a profile renders exact; exact has no optimisation, final every one', () => {
  assert.equal(DEFAULT_PROFILE, 'final', 'FU-5: hm render makes production masters unless told otherwise');
  assert.equal(PAGE_PROFILE, 'exact', 'goldens, parity and the QA re-render of v2 open pages without a profile');
  const exact = resolveProfile(), final = resolveProfile('final');
  assert.equal(exact.name, 'exact');
  for (const f of Object.keys(FEATURES)) { assert.equal(exact.features[f], false, f); assert.equal(final.features[f], true, f); }
  assert.equal(featureLabel(exact), 'none');
  assert.ok(Object.isFrozen(exact) && Object.isFrozen(exact.features));
  assert.throws(() => resolveProfile('fast'), /unknown profile "fast"/);
  for (const p of Object.values(PROFILES)) assert.ok(p.scale > 0 && typeof p.summary === 'string', p.name);
});

test('profiles: feature overrides parse, reset and reject unknown names', () => {
  assert.deepEqual(parseFeatures(''), { reset: null, on: [], off: [] });
  assert.deepEqual(parseFeatures('none'), { reset: 'none', on: [], off: [] });
  assert.throws(() => parseFeatures('-nope'), /unknown feature "nope"/);
  const names = Object.keys(FEATURES);
  if (names.length) {
    const [f] = names;
    assert.equal(resolveProfile('final', { features: `-${f}` }).features[f], false);
    assert.equal(resolveProfile('exact', { features: `+${f}` }).features[f], true);
    assert.equal(resolveProfile('exact', { features: `all,-${f}` }).features[f], false);
  }
});

test('profiles: a feature that reads another one\'s output follows it off, and cannot be asked for without it', () => {
  const p = resolveProfile('final', { features: '-faceCache' });
  assert.equal(p.features.faceCache, false);
  assert.equal(p.features.faceFastGlow, false, 'the fast face is drawn through the cache: off with it');
  assert.throws(() => resolveProfile('exact', { features: '+faceFastGlow' }), /faceFastGlow needs faceCache/);
  assert.throws(() => resolveProfile('final', { features: '-faceCache,+faceFastGlow' }), /needs faceCache/);
  assert.equal(resolveProfile('final', { features: '-worldFast' }).features.worldPasses, false, 'the half-res sky is a variant of the fast world');
  assert.throws(() => resolveProfile('exact', { features: '+worldPasses' }), /worldPasses needs worldFast/);
  assert.equal(resolveProfile('final', { features: '-fgAccum' }).features.tightPasses, false, 'the tight scissors belong to the accumulation pipeline');
});

test('frame plan: every feature combination draws the face and runs each feature where it is implemented', () => {
  const combos = everyCombination();
  // 9 features, 3 of them dependent: 3 valid states per (base, dependent) pair → 3^3 · 2^3
  assert.equal(Object.keys(FEATURES).length, 9);
  assert.equal(combos.length, 216);
  for (const f of FRAME_FEATURES) assert.ok(Object.hasOwn(FEATURES, f), f);
  for (const p of combos) {
    const f = p.features, plan = framePlan(f), tag = featureLabel(p);
    // the face: through the face pass with the cache, else the approved per-sub-frame draw; never neither
    assert.equal(plan.face, f.faceCache ? 'cache' : 'per-sub', tag);
    if (f.faceFastGlow) assert.equal(plan.face, 'cache', `${tag}: the fast face is drawn through the cache`);
    // a frame feature only exists in the fast frame: it must select it
    assert.equal(plan.pipeline, FRAME_FEATURES.some((x) => f[x]) ? 'fast' : 'exact', tag);
    if (plan.bakeMesh) assert.equal(plan.pipeline, 'fast', `${tag}: the baked normals are prepared by the fast frame`);
    assert.equal(plan.foreground, f.fgAccum ? 'fgAccum' : 'scene', tag);
    if (f.tightPasses) assert.equal(plan.foreground, 'fgAccum', tag);
  }
  // the reported regression: the foreground accumulation without the face cache still draws the face
  assert.deepEqual({ ...framePlan(resolveProfile('final', { features: '-faceCache' }).features) },
    { pipeline: 'fast', face: 'per-sub', foreground: 'fgAccum', bakeMesh: true });
  assert.deepEqual({ ...framePlan(resolveProfile('exact', { features: '+fgAccum' }).features) },
    { pipeline: 'fast', face: 'per-sub', foreground: 'fgAccum', bakeMesh: false });
  assert.equal(framePlan(resolveProfile('exact', { features: '+meshNormalTex' }).features).pipeline, 'fast');
  assert.equal(framePlan(resolveProfile('exact').features).pipeline, 'exact');
});

test('step gates: every feature has its own gate, and both of its sides resolve', () => {
  assert.deepEqual(Object.keys(STEP_GATES).sort(), Object.keys(FEATURES).sort(), 'a new feature needs a step gate');
  for (const f of Object.keys(FEATURES)) {
    const off = stepGate(f, 'off'), on = stepGate(f, 'on');
    for (const g of [off, on]) assert.ok(g.thresholds.facePsnr >= FACE_FLOOR_DB, `${f} ${g.mode}: the face floor`);
    // off: final without f (and whatever builds on it) against final
    const a = resolveProfile(off.a, { features: off.aFeatures });
    assert.equal(a.features[f], false);
    assert.equal(off.b, 'final');
    // on: exactly f and its bases against only its bases (the goldens when it has none)
    const b = resolveProfile(on.b, { features: on.bFeatures });
    const want = new Set([f, ...(on.aFeatures ? on.aFeatures.split(',').map((x) => x.slice(1)) : [])]);
    assert.deepEqual(Object.keys(FEATURES).filter((x) => b.features[x]).sort(), [...want].sort(), `${f} on`);
    if (on.a === 'golden') assert.equal(on.aFeatures, null);
    else assert.equal(resolveProfile(on.a, { features: on.aFeatures }).features[f], false);
  }
  assert.deepEqual(stepGate('faceCache', 'off'), { feature: 'faceCache', mode: 'off', a: 'final', aFeatures: '-faceCache', b: 'final', bFeatures: null, thresholds: { facePsnr: 42 } });
  assert.deepEqual(stepGate('tightPasses', 'on').bFeatures, '+fgAccum,+tightPasses');
  assert.equal(stepGate('overlaySkip', 'off').thresholds.identical, true);
  assert.throws(() => stepGate('faceCache', 'sideways'), /off or on/);
  const frames = [{ i: 0 }, { i: 33 }, { i: 135 }];
  assert.deepEqual(pickFrames(frames, '135,33').map((f) => f.i), [33, 135]);
  assert.equal(pickFrames(frames, null), frames);
  assert.throws(() => pickFrames(frames, '34'), /34 not among the golden frame indices/);
});

test('farm: the profile supplies scale, encoder, master and mark defaults; explicit options win', () => {
  const fin = jobParams({ direction: 'x' });
  assert.equal(fin.profile, 'final', 'the default profile');
  assert.equal(fin.scale, DEFAULTS.scale);
  assert.deepEqual([fin.encoder, fin.master], ['lossless', 'crf16'], 'lossless segments, one CRF 16 master pass (Q4(b))');
  const exact = jobParams({ direction: 'x', profile: 'exact' });
  assert.deepEqual([exact.profile, exact.encoder, exact.master], ['exact', 'lossless', 'crf16']);
  assert.equal(jobParams({ direction: 'x', profile: 'final', scale: 0.25 }).scale, 0.25);
  const qp = jobParams({ direction: 'x', profile: 'final', encoder: 'qp15' });
  assert.deepEqual([qp.encoder, qp.master], ['qp15', null], 'a segment-invariant encoder is joined with concat -c copy: no master pass');
  assert.throws(() => jobParams({ direction: 'x', encoder: 'crf16' }), /not a segment encoder/, 'CRF is never segment-invariant');
  assert.throws(() => jobParams({ direction: 'x', encoder: 'crf20' }), /not a segment encoder/);
  assert.throws(() => jobParams({ direction: 'x', master: 'qp15' }), /unknown master encoder/);
  assert.throws(() => jobParams({ direction: 'x', profile: 'nope' }), /unknown profile/);
  assert.equal(wantsPreview(fin, undefined), !!PROFILES.final.preview);
  assert.equal(wantsPreview(exact, undefined), false);
  assert.equal(wantsPreview(exact, true), true);
});

test('farm: an odd output size is refused before anything renders (yuv420p needs even dimensions)', () => {
  assert.throws(() => jobParams({ direction: 'x', width: 1081 }), /output size 1081x1920 .* even width and height/);
  assert.equal(jobParams({ direction: 'x', scale: 0.3 }).scale, 0.3, '324x576 is even');
  assert.throws(() => jobParams({ direction: 'x', scale: 0.21 }), /output size 227x403 \(1080x1920 at scale 0\.21\)/);
  assert.throws(() => jobParams({ direction: 'x', height: 1919 }), /1080x1919/);
  assert.deepEqual([jobParams({ direction: 'x', scale: 0.25 }).scale, jobParams({ direction: 'x', profile: 'draft' }).scale], [0.25, 0.5], 'even sizes pass (270x480, 540x960)');
});

test('profiles: draft cuts quality knobs and marks the frame; proof is final quality as stills', () => {
  const d = resolveProfile('draft'), f = resolveProfile('final'), p = resolveProfile('proof');
  assert.equal(d.scale, 0.5);
  assert.deepEqual({ ...d.quality }, { subframes: 1, faceGlow: false, worldOctaves: 3, worldClouds: false, bloomEighth: false });
  assert.equal(d.mark, 'DRAFT');
  assert.equal(d.encoder, 'draft');
  assert.equal(d.features.faceCache, true, 'the face once per frame comes from the cache');
  for (const q of [resolveProfile('exact').quality, f.quality, p.quality]) {
    assert.deepEqual({ ...q }, { subframes: null, faceGlow: true, worldOctaves: 5, worldClouds: true, bloomEighth: true });
  }
  assert.deepEqual({ ...p.features }, { ...f.features });
  assert.equal(p.stills, 6);
  assert.equal(p.encoder, null);
  assert.equal(featureLabel(resolveProfile('draft', { features: '-worldFast' })), featureLabel(resolveProfile('final', { features: '-worldFast' })));
});

test('farm: the draft profile renders at half size with its encoder and mark; proof is not a video', async () => {
  const { ENCODERS, x264Args } = await import('../../render/encode.mjs');
  const d = jobParams({ direction: 'x', profile: 'draft' });
  assert.deepEqual([d.scale, d.encoder, d.mark], [0.5, 'draft', 'DRAFT']);
  assert.equal(ENCODERS.draft.segmentSafe, true);
  const a = x264Args('draft');
  assert.equal(a[a.indexOf('-preset') + 1], 'veryfast');
  assert.equal(x264Args('crf16')[x264Args('crf16').indexOf('-preset') + 1], 'slow', 'the master encoder is the approved render\'s');
  assert.equal(x264Args('crf20')[x264Args('crf20').indexOf('-preset') + 1], 'fast', 'the preview copy');
  assert.equal(wantsPreview(d, undefined), false);
  assert.throws(() => jobParams({ direction: 'x', profile: 'proof' }), /stills, not a video/);
  const { proofTimes } = await import('../../tools/proof.mjs');
  assert.deepEqual(proofTimes(15), [1.25, 3.75, 6.25, 8.75, 11.25, 13.75]);
});

test('bench: sample specs', () => {
  assert.deepEqual(sampleFrames('windows', 450).length, 48);
  assert.deepEqual(sampleFrames('windows', 450).slice(0, 9), [0, 1, 2, 3, 4, 5, 6, 7, 75]);
  assert.deepEqual(sampleFrames('windows:2x3', 10), [0, 1, 2, 5, 6, 7]);
  assert.deepEqual(sampleFrames('3:6', 450), [3, 4, 5]);
  assert.deepEqual(sampleFrames('every:100', 450), [0, 100, 200, 300, 400]);
  assert.equal(sampleFrames('all', 450).length, 450);
  assert.throws(() => sampleFrames('most', 450), /bad --sample/);
  const o = parseBenchArgs(['my-dir', '--profile', 'exact', '--runs', '2', '--no-passes']);
  assert.deepEqual([o.direction, o.profile, o.runs, o.passes], ['my-dir', 'exact', 2, false]);
  assert.throws(() => parseBenchArgs(['--runs', '0']), /positive integer/);
  assert.deepEqual(parseBenchArgs(['--chromium-args', '--a  --b=1']).chromiumArgs, ['--a', '--b=1']);
  const g = parseGateArgs(['--b', 'final', '--a-features', '-x', '--min-psnr', '45', '--save-png']);
  assert.deepEqual([g.b, g.aFeatures, g.thresholds.psnr, g.savePng], ['final', '-x', 45, true]);
  assert.equal(parseGateArgs(['--a', 'golden', '--b', 'exact', '--identical']).thresholds.identical, true);
  assert.equal(parseGateArgs(['--frames', '33,135']).frames, '33,135');
  const s = parseGateArgs(['--steps', 'both', '--only', 'faceCache,fgAccum']);
  assert.deepEqual([s.steps, s.only], ['both', 'faceCache,fgAccum']);
  assert.throws(() => parseGateArgs(['--steps', 'all']), /off, on or both/);
  assert.throws(() => parseGateArgs(['--steps', 'off', '--min-psnr', '40']), /own sides and thresholds/);
  assert.throws(() => parseGateArgs(['--only', 'faceCache']), /--only needs --steps/);
});

test('metrics: PSNR and SSIM behave on known images', () => {
  const w = 64, h = 48, n = w * h * 4;
  const a = new Uint8Array(n), b = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = b[i] = (i * 37) % 251;
  assert.equal(psnr(a, b, w, h), Infinity);
  assert.equal(ssim(a, b, w, h), 1);
  assert.deepEqual(diffSummary(a, b), { maxAbs: 0, differingPixels: 0, differingShare: 0 });
  // every R, G, B value off by 1: MSE 1 → PSNR = 20·log10(255) = 48.13 dB
  for (let i = 0; i < n; i += 4) { b[i] = a[i] ^ 1; b[i + 1] = a[i + 1] ^ 1; b[i + 2] = a[i + 2] ^ 1; }
  assert.ok(Math.abs(psnr(a, b, w, h) - 48.1308) < 1e-3);
  assert.ok(ssim(a, b, w, h) < 1 && ssim(a, b, w, h) > 0.99);
  // a box measures only inside itself
  const c = Uint8Array.from(a);
  c[(5 * w + 5) * 4] ^= 0xff;
  assert.equal(psnr(a, c, w, h, [20, 20, 40, 40]), Infinity);
  assert.ok(Number.isFinite(psnr(a, c, w, h, [0, 0, 20, 20])));
  assert.throws(() => ssim(a, b, w, h, [0, 0, 8, 8]), /smaller than the 11 px window/);
});

test('P5b: a blur pass reads its outer tap (3.23 k texels) plus the bilinear neighbour on each side', async () => {
  const { blurReach } = await import('../../engine/renderer/passes/filters.js');
  assert.equal(blurReach({ scale: 1 }, 2.2), 9);          // 7.11 texels -> 8, + 1
  assert.equal(blurReach({ scale: 0.5 }, 2.2), 5);
  assert.equal(blurReach({ scale: 1 }, 0.5), 3);          // 1.62 -> 2, + 1
});

test('R14: the renderer refuses a rolled camera (the reflection pass ignores roll)', () => {
  assert.doesNotThrow(() => assertNoRoll({ x: 0, y: 0, zoom: 1, roll: 0 }));
  assert.doesNotThrow(() => assertNoRoll({ x: 0, y: 0, zoom: 1 }));
  assert.throws(() => assertNoRoll({ x: 0, y: 0, zoom: 1, roll: 0.01 }), /roll 0.01 is not supported.*\(R14\)/);
});
