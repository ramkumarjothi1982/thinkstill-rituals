// WP-02 tooling, pure parts: quality profiles, the farm's profile defaults,
// hm bench's frame sampling, the pixel-gate metrics, the R14 roll assert.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, FEATURES, DEFAULT_PROFILE, resolveProfile, parseFeatures, featureLabel } from '../../engine/render/profiles.js';
import { jobParams, wantsPreview, DEFAULTS } from '../../render/farm.mjs';
import { sampleFrames, parseBenchArgs } from '../../tools/bench.mjs';
import { parseGateArgs } from '../../tools/perf/gate.mjs';
import { psnr, ssim, diffSummary } from '../../tools/perf/metrics.mjs';
import { assertNoRoll } from '../../engine/renderer/index.js';

test('profiles: exact is the default and has no optimisation; final has every one', () => {
  assert.equal(DEFAULT_PROFILE, 'exact');
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
});

test('farm: the profile supplies scale, encoder and mark defaults; explicit options win', () => {
  const exact = jobParams({ direction: 'x' });
  assert.equal(exact.profile, 'exact');
  assert.equal(exact.scale, DEFAULTS.scale);
  assert.equal(exact.encoder, 'qp15');
  const fin = jobParams({ direction: 'x', profile: 'final' });
  assert.equal(fin.profile, 'final');
  assert.equal(fin.encoder, PROFILES.final.encoder);
  assert.equal(jobParams({ direction: 'x', profile: 'final', scale: 0.25 }).scale, 0.25);
  assert.equal(jobParams({ direction: 'x', profile: 'final', encoder: 'crf16' }).encoder, 'crf16');
  assert.throws(() => jobParams({ direction: 'x', profile: 'nope' }), /unknown profile/);
  assert.equal(wantsPreview(fin, undefined), !!PROFILES.final.preview);
  assert.equal(wantsPreview(exact, undefined), false);
  assert.equal(wantsPreview(exact, true), true);
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
  const g = parseGateArgs(['--b', 'final', '--a-features', '-x', '--min-psnr', '45', '--save-png']);
  assert.deepEqual([g.b, g.aFeatures, g.thresholds.psnr, g.savePng], ['final', '-x', 45, true]);
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

test('R14: the renderer refuses a rolled camera (the reflection pass ignores roll)', () => {
  assert.doesNotThrow(() => assertNoRoll({ x: 0, y: 0, zoom: 1, roll: 0 }));
  assert.doesNotThrow(() => assertNoRoll({ x: 0, y: 0, zoom: 1 }));
  assert.throws(() => assertNoRoll({ x: 0, y: 0, zoom: 1, roll: 0.01 }), /roll 0.01 is not supported.*\(R14\)/);
});
