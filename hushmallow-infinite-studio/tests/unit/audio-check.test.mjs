// audio/check.mjs, audio/loop-aac.mjs and the pure parts of audio/render-offline.mjs:
// the seam numbers are the QA gate's own (checked against qa/gates/audio.py on the
// same file); the click estimate reads the size of a real discontinuity and nothing
// else; loop-aware AAC keeps a loop a loop; the closing-contour rules; the circular
// pieces (wrap-add, bed crossfade statistics, circular limiter).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { seamMetrics, clickPass, contourRules, synthTonal, closeCheck, gAudio, globalOffset, maxWindowRmsDbfs, peakDbfs, LIMITS } from '../../audio/check.mjs';
import { hearHits } from '../../audio/hits.mjs';
import { wrapAdd, bedCorrelation, bedCrossfadeStats, limitCircular, limitLinear } from '../../audio/render-offline.mjs';
import { loopExtended, lagSamples, deliveredRoundTrip } from '../../audio/loop-aac.mjs';
import { studioPath, mkWorkTemp } from '../../render/lib/paths.mjs';

const SR = 48000;
/** interleaved stereo from a per-sample function of t (both channels) */
const signal = (sec, f) => { const n = Math.round(sec * SR), y = new Float32Array(2 * n); for (let i = 0; i < n; i++) { const v = f(i / SR, i, n); y[2 * i] = v; y[2 * i + 1] = v; } return y; };
const rnd = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 - 0.5; };
const db = (x) => 20 * Math.log10(x);

test('seam step is the gate\'s |x[0] − x[N−1]|; it reads the local slope of continuous content, the click estimate reads discontinuities only', () => {
  // a mathematically perfect loop: 440 Hz, whole cycles in 1 s, at −20 dBFS peak
  const loop = signal(1, (t) => 0.1 * Math.sin(2 * Math.PI * 440 * t));
  const s = seamMetrics(loop);
  const want = db(Math.abs(loop[0] - loop[loop.length - 2]));
  assert.ok(Math.abs(s.wrapStepDbfs - want) < 0.06, 'the raw wrap step, exactly as qa/gates/audio.py computes it');
  assert.ok(Math.abs(s.wrapStepDbfs - -44.8) < 0.1, `a perfect loop's wrap step reads ${s.wrapStepDbfs} dBFS: the sine's own sample-to-sample step`);
  assert.ok(Math.abs(s.wrapNeighboursDbfs.before - s.wrapStepDbfs) < 0.1 && Math.abs(s.wrapNeighboursDbfs.after - s.wrapStepDbfs) < 0.1, 'the steps either side are the same size: no discontinuity');
  assert.ok(s.clickDbfs < -90 && clickPass(s), `click estimate ${s.clickDbfs} dBFS`);
  // the same loop cut at its crest instead of its zero crossing: the raw step now passes, the loop is no different
  const crest = seamMetrics(signal(1, (t) => 0.1 * Math.cos(2 * Math.PI * 440 * t)));
  assert.ok(crest.wrapStepDbfs < LIMITS.seamStep && crest.clickDbfs < -90, `cut at the crest: wrap step ${crest.wrapStepDbfs} dBFS, click ${crest.clickDbfs}`);
  assert.ok(s.interiorStepDbfs.shareAtOrBelowLimit < 0.15, `only near its crests is a step of this loop ≤ −60 dBFS (${s.interiorStepDbfs.shareAtOrBelowLimit})`);
  // a real discontinuity: a ramp that drops back at the seam (a step of `jump`)
  for (const jump of [0.03, 0.003, 0.0003]) {
    const cut = signal(1, (t, i, n) => 0.1 * Math.sin(2 * Math.PI * 440 * t) + jump * (i / n));
    const got = seamMetrics(cut);
    assert.ok(Math.abs(got.clickDbfs - db(jump)) < 1.5, `a ${db(jump).toFixed(1)} dBFS step reads ${got.clickDbfs}`);
    assert.equal(clickPass(got), db(jump) < LIMITS.seamClick);
  }
});

test('seam click on bright content: a step below the content\'s own high end is masked; a step above it is not', () => {
  const r = rnd(9);
  // white noise at −65 dBFS RMS: its own high end puts the click estimate's local floor above −60
  const noise = signal(1, () => 0.002 * r());
  const s = seamMetrics(noise);
  assert.ok(s.clickLocalDbfs.p90 > LIMITS.seamClick, `local floor ${s.clickLocalDbfs.p90} dBFS`);
  assert.ok(clickPass(s), `no discontinuity: ${s.clickDbfs} ≤ floor ${s.clickLocalDbfs.p90}`);
  const r2 = rnd(9);
  const stepped = signal(1, (t, i, n) => 0.002 * r2() + 0.1 * (i / n));     // a −20 dBFS step at the seam
  const st = seamMetrics(stepped);
  assert.ok(st.clickDbfs > st.clickLocalDbfs.p90 + 6 && !clickPass(st), `a −20 dBFS step reads ${st.clickDbfs} over a floor of ${st.clickLocalDbfs.p90}`);
});

test('seam level: the gate\'s rule (dB outside the range of the two 10 ms neighbours), with the symmetric difference for context', () => {
  const s = seamMetrics(signal(1, (t) => 0.2 * Math.sin(2 * Math.PI * 300 * t)));
  assert.ok(s.rmsOutsideDb < 0.1 && s.rmsDeltaDb < 0.1);
  const dip = seamMetrics(signal(1, (t, i, n) => 0.2 * Math.sin(2 * Math.PI * 300 * t) * (i < 240 || i > n - 240 ? 0.2 : 1)));
  assert.ok(dip.rmsOutsideDb > 3, `a dip at the seam: ${dip.rmsOutsideDb} dB below both neighbours`);
  // a level change across the seam (quiet end, loud start) is not a click: the seam sits between its neighbours
  const ramp = seamMetrics(signal(1, (t, i, n) => 0.2 * Math.sin(2 * Math.PI * 300 * t) * (i < n / 2 ? 1 : 0.3)));
  assert.ok(ramp.rmsOutsideDb < 0.5 && ramp.rmsDeltaDb > 3, `${ramp.rmsOutsideDb} outside, ${ramp.rmsDeltaDb} symmetric`);
});

test('the two implementations agree: qa/gates/audio.py reads the same seam step and seam RMS from the same file', () => {
  const dir = mkWorkTemp('audio-gate-agree-');
  try {
    const r = rnd(4);
    // content with a real step and a dip at the seam, so both numbers are far from trivial
    const y = signal(2, (t, i, n) => (0.15 * Math.sin(2 * Math.PI * 523.25 * t) + 0.01 * r() + 0.02 * (i / n)) * (i > n - 300 ? 0.4 : 1));
    const raw = path.join(dir, 'y.f32'), wav = path.join(dir, 'y.wav');
    fs.writeFileSync(raw, Buffer.from(y.buffer));
    assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', raw, '-c:a', 'pcm_f32le', wav]).status, 0);
    const job = path.join(dir, 'job.json'), out = path.join(dir, 'out.json');
    fs.writeFileSync(job, JSON.stringify({ video: wav, duration: 2, fps: 30, cues: [], plan: null, turn: null, score: 'hm-score', artefacts: null }));
    const p = spawnSync('python3', ['-I', studioPath('qa', 'gates', 'audio.py'), job, out], { encoding: 'utf8' });
    assert.equal(p.status, 0, p.stderr);
    const gate = JSON.parse(fs.readFileSync(out, 'utf8'));
    const mine = seamMetrics(y);
    assert.ok(Math.abs(gate.metrics.seam.stepDbfs - mine.wrapStepDbfs) < 0.06, `seam step: gate ${gate.metrics.seam.stepDbfs}, WP-04 ${mine.wrapStepDbfs}`);
    assert.ok(Math.abs(gate.checks.seamRms.value - mine.rmsOutsideDb) < 0.01, `seam RMS: gate ${gate.checks.seamRms.value}, WP-04 ${mine.rmsOutsideDb}`);
    for (const k of ['rmsSeamDb', 'rmsBeforeDb', 'rmsAfterDb']) assert.ok(Math.abs(gate.metrics.seam[k] - mine.rmsDb[{ rmsSeamDb: 'seam', rmsBeforeDb: 'before', rmsAfterDb: 'after' }[k]]) < 0.01, k);
    assert.equal(gate.checks.seamStep.status === 'pass', mine.wrapStepDbfs <= LIMITS.seamStep);
    assert.equal(gate.checks.seamRms.status === 'pass', mine.rmsOutsideDb <= LIMITS.seamRmsDb);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the hit detector and the A/V offset are the gate\'s: audio/hits.py and globalOffset read what qa/gates/audio.py reads from the same file', () => {
  const dir = mkWorkTemp('audio-hits-agree-');
  try {
    // cue hits: a 1.2 kHz ping on time, one heard late (a quiet first note, the loud one 80 ms on),
    // one masked (too quiet over the floor), the rest of the film 30 ms late (the global offset)
    const cues = [{ t: 0.5, type: 'take' }, { t: 1.2, type: 'logo' }, { t: 2.0, type: 'blink' }, { t: 2.6, type: 'land' }, { t: 3.2, type: 'thought' }, { t: 3.7, type: 'release' }];
    const hits = [[0.53, 0.3], [1.23, 0.05], [1.31, 0.3], [2.03, 0.0012], [2.63, 0.3], [3.23, 0.3], [3.73, 0.3]];
    const r = rnd(9);
    const y = signal(4, (t) => 0.002 * r() + hits.reduce((v, [at, a]) => v + (t >= at ? a * Math.exp(-(t - at) / 0.03) * Math.sin(2 * Math.PI * 1200 * (t - at)) : 0), 0));
    const raw = path.join(dir, 'y.f32'), wav = path.join(dir, 'y.wav');
    fs.writeFileSync(raw, Buffer.from(y.buffer));
    assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', raw, '-c:a', 'pcm_f32le', wav]).status, 0);
    const job = path.join(dir, 'job.json'), out = path.join(dir, 'out.json');
    fs.writeFileSync(job, JSON.stringify({ video: wav, duration: 4, fps: 30, cues, plan: null, turn: null, score: 'hm-score', artefacts: null }));
    const p = spawnSync('python3', ['-I', studioPath('qa', 'gates', 'audio.py'), job, out], { encoding: 'utf8' });
    assert.equal(p.status, 0, p.stderr);
    const gate = JSON.parse(fs.readFileSync(out, 'utf8'));
    const mine = hearHits(wav, cues, 4);
    assert.deepEqual(mine.map((h) => [h.type, Math.round(h.errorMs * 10) / 10, h.graded, h.pass]), gate.metrics.onsets.map((g) => [g.cue, g.errorMs, g.graded, g.pass]), 'the same cues graded, the same errors (the gate rounds to 0.1 ms), the same verdicts');
    const logo = mine.find((h) => h.type === 'logo');
    assert.ok(logo.errorMs > 100 && Math.abs(logo.peakT - 1.31) < 0.01 && logo.lateDb > 10, 'the late hit: its peak at the second note, well over the first');
    assert.ok(!mine.find((h) => h.type === 'blink').graded, 'the masked cue is not graded');
    const o = globalOffset(y, cues);
    assert.equal(o.lagMs, gate.metrics.globalOffsetMs, `global offset: gate ${gate.metrics.globalOffsetMs} ms, WP-04 ${o.lagMs} ms`);
    assert.equal(o.lagMs, 30);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('loop-aware AAC: the encoder sees the loop\'s own audio around it, so the delivered seam is as clean as the WAV\'s', () => {
  const x = signal(2, (t) => 0.2 * Math.sin(2 * Math.PI * 440 * t) + 0.1 * Math.sin(2 * Math.PI * 1500 * t));   // whole cycles: a perfect loop
  const ext = loopExtended(x, 0.25), n = x.length / 2, p = Math.round(0.25 * SR);
  assert.equal(ext.length, 2 * (n + 2 * p));
  assert.equal(ext[2 * p], x[0]); assert.equal(ext[0], x[2 * (n - p)]); assert.equal(ext[2 * (n + p)], x[0]);
  const plain = seamMetrics(deliveredRoundTrip(x, 2, { loopAware: false }));
  const aware = deliveredRoundTrip(x, 2, { loopAware: true });
  const s = seamMetrics(aware);
  assert.equal(aware.length, x.length, 'exactly D seconds');
  assert.equal(lagSamples(x, aware), 0, 'in sync with the WAV');
  assert.ok(plain.clickDbfs > -45, `the plain mux clicks where the MP4 loops: ${plain.clickDbfs} dBFS`);
  assert.ok(s.clickDbfs < -70 && clickPass(s), `loop-aware: ${s.clickDbfs} dBFS (interior ${s.clickInteriorDbfs.median})`);
});

test('wrap-add folds the tail past D onto the start; the bed\'s crossfade statistics, anti-correlation included', () => {
  const D = 0.5, n = Math.round(D * SR);
  const x = signal(0.7, (t, i) => (i >= n ? 0.25 : 0.5));
  const y = wrapAdd(x, D);
  assert.equal(y.length, 2 * n);
  assert.equal(y[0], 0.75);
  assert.equal(y[2 * (n - 1)], 0.5);
  assert.equal(y[2 * Math.round(0.2 * SR) - 2], 0.75);
  assert.equal(y[2 * Math.round(0.2 * SR)], 0.5);
  const periodic = signal(0.8, (t) => Math.sin(2 * Math.PI * 50 * t));       // 50 Hz: period divides 0.5 s
  assert.ok(Math.abs(bedCorrelation(periodic, D, 0.2) - 1) < 1e-6);
  const r = rnd(3), white = signal(0.8, () => r());
  assert.ok(Math.abs(bedCorrelation(white, D, 0.2)) < 0.05);
  // the continuation past D is the start inverted and twice as loud: ρ = −1, P2 = 4 P1, block by block
  const r2 = rnd(5), w = signal(0.5, () => r2());
  const anti = signal(0.7, (t, i) => (i < n ? w[2 * (i % n)] : -2 * w[2 * (i - n)]));
  const xf = bedCrossfadeStats(anti, D, 0.2);
  assert.equal(xf.at.length, 19, '20 ms blocks every 10 ms over 0.2 s');
  assert.ok(xf.rho.every((v) => v < -0.999) && xf.global < -0.999);
  assert.ok(xf.p2.every((v, k) => Math.abs(v / xf.p1[k] - 4) < 1e-6));
});

test('the circular limiter carries its gain across the seam; the linear one (v2\'s) restarts at unity', () => {
  // DC so the gain reads off directly; a loud stretch at the very end of the loop
  const x = signal(1, (t, i, n) => (i > n - 2400 ? 0.9 : 0.1));
  const n = x.length / 2, gain = (y, i) => y[2 * i] / x[2 * i];
  const c = limitCircular(x, 0, -6).y, l = limitLinear(x, 0, -6).y;
  assert.ok(peakDbfs(c) <= -6 + 0.01 && peakDbfs(l) <= -6 + 0.01, 'both hold the ceiling');
  assert.ok(gain(l, n - 1) < 0.6 && gain(l, 0) === 1, 'linear: limited at the end, unity at frame 0 → a step where the file loops');
  assert.ok(Math.abs(gain(c, 0) - gain(c, n - 1)) < 1e-3, `circular: continuous across the seam (${gain(c, n - 1)} → ${gain(c, 0)})`);
  assert.ok(gain(c, 0) < 0.6, 'the release continues into the loop start');
  const y = signal(1, (t, i) => (i < 48 ? 0.9 : 0.1));
  const cy = limitCircular(y, 0, -6).y, ny = y.length / 2;
  assert.ok(cy[2 * (ny - 1)] / y[2 * (ny - 1)] < 1, 'circular look-ahead wraps: the gain is already down before frame 0');
});

test('closing contour: the line never falls (onsets and landings), no audible component glides down, the kit\'s articulation excepted', () => {
  const note = (t, f0, f1 = f0, glide = 0, level = 1, extra = {}) => ({ t, source: 'test', comps: [{ f0, f1, glide, level, ...extra }] });
  assert.equal(contourRules([note(1, 523.25), note(2, 659.25), note(3, 880)]).pass, true);
  assert.equal(contourRules([note(1, 880), note(2, 523.25), note(3, 659.25), note(4, 880)]).pass, true, 'only the last three count');
  const fall = contourRules([note(1, 523.25), note(2, 880), note(3, 659.25)]);
  assert.deepEqual(fall.falls.map((f) => f.rule), ['line', 'line']);
  assert.equal(contourRules([note(1, 523.25), note(2, 880), note(3, 875)]).pass, true, 'within 50 cents');
  // Glitzi's zap: starts above the line, lands below it
  const zap = contourRules([note(1, 622), note(2, 830, 888), note(3, 1827, 498, 0.09)]);
  assert.ok(!zap.pass && zap.falls.some((f) => f.rule === 'line' && /landing/.test(f.what)) && zap.falls.some((f) => f.rule === 'gesture'));
  // Zuzu's swell: the louder voice rises, the top voice (−3 dB) falls a whole tone
  const swell = { t: 3, source: 'test', comps: [{ f0: 622, f1: 697, glide: 0.35, level: 1 }, { f0: 933, f1: 833, glide: 0.35, level: 0.7 }] };
  const z = contourRules([note(1, 466), note(2, 622), swell]);
  assert.deepEqual(z.falls.map((f) => f.rule), ['gesture']);
  assert.equal(contourRules([note(1, 466), note(2, 622), { ...swell, comps: [swell.comps[0], { ...swell.comps[1], level: 0.2 }] }]).pass, true, 'a falling partial 14 dB down is inaudible under the rising one');
  // Blubi's droplets: every note drops an octave in 45 ms; the line compares where they start and land
  const drop = (t, f) => note(t, f, f / 2, 0.045, 1, { articulation: true });
  assert.equal(contourRules([drop(1, 1012), drop(2, 1351), drop(3, 1762)]).pass, true);
  assert.equal(contourRules([drop(1, 1012), drop(2, 1351), note(3, 1762, 881, 0.045)]).pass, false, 'the same glide on a non-articulation component is a falling gesture');
  // the gate's tonal events: bell, ping, blip (with their glides)
  assert.deepEqual(synthTonal({ t: 1, inst: 'blip', f: 340, f1: 1500, glide: 0.045 }).comps[0], { f0: 340, f1: 1500, glide: 0.045, level: 1 });
  assert.equal(synthTonal({ t: 1, inst: 'bell', f: 880 }).comps[0].f1, 880);
  assert.equal(synthTonal({ t: 1, inst: 'noiseHit', f: 880 }), null);
});

test('MO-CLOSE check and the G-AUDIO summary name what fails', () => {
  const report = { cues: [{ t: 11.7, type: 'eyes_open' }, { t: 12.6, type: 'logo' }] };
  const plan = { engine: [{ t: 11.7, kind: 'mallow', name: 'comfort' }, { t: 12.6, kind: 'mallow', name: 'success' }] };
  assert.deepEqual(closeCheck(plan, report), { open: true, logo: true, pass: true });
  assert.equal(closeCheck({ engine: plan.engine.slice(0, 1) }, report).pass, false);
  const seam = { wrapStepDbfs: -70, wrapNeighboursDbfs: {}, interiorStepDbfs: {}, clickDbfs: -100, clickLocalDbfs: { p90: -110 }, rmsOutsideDb: 0 };
  const contour = { pass: true, last3: [], falls: [] };
  const g = gAudio({ loud: { I: -16.2, TP: -2, LRA: 3 }, seam, contour, close: { pass: true }, humDbfs: -25 });
  assert.equal(g.pass, true);
  assert.deepEqual(g.failing, []);
  const raw = gAudio({ loud: { I: -16, TP: -2, LRA: 3 }, seam, delivered: { ...seam, wrapStepDbfs: -42 }, contour, close: { pass: true } });
  assert.deepEqual(raw.failing, ['seamStep'], 'the gate judges the wrap step on the delivered audio');
  assert.equal(gAudio({ loud: { I: -12, TP: -2, LRA: 3 }, seam, contour, close: { pass: true } }).checks.loudness.pass, false);
  assert.equal(maxWindowRmsDbfs(signal(1, () => 0.1)), -20);
});
