// audio/splice.mjs: the loop's splice. A circular mix is shifted by at most 1 ms to
// where both channels are flat, and that splice is verified as delivered: through
// the loop-aware AAC encode exactly as the mux delivers it, the gate's raw wrap step
// is under −63 dBFS, its click estimate under −60, and the global A/V offset stays 0.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotate, quantize24, spliceCandidates, spliceLoop, SPLICE } from '../../audio/splice.mjs';
import { rawStepAt, globalOffset } from '../../audio/check.mjs';
import { SEAM_STEP_TARGET } from '../../audio/loop-aac.mjs';

const SR = 48000;
const db = (v) => 20 * Math.log10(v);
/**
 * A 3 s loop like a score's: decorrelated low-passed noise in each channel (the filters run
 * twice around the loop, so it is circular), a low tone with whole cycles in the loop, and a
 * ping on each cue.
 */
const CUES = [{ t: 0.4, type: 'take' }, { t: 1.1, type: 'land' }, { t: 1.9, type: 'thought' }, { t: 2.5, type: 'logo' }];
function loop() {
  const n = 3 * SR, y = new Float32Array(2 * n);
  let seed = 8;
  const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 - 0.5; };
  const a = Math.exp((-2 * Math.PI * 900) / SR);
  for (let c = 0; c < 2; c++) {
    const w = Float64Array.from({ length: n }, r), s = [0, 0, 0, 0];         // four one-pole stages: 24 dB/octave above 900 Hz
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        let v = w[i];
        for (let k = 0; k < 4; k++) { s[k] = a * s[k] + (1 - a) * v; v = s[k]; }
        if (pass) y[2 * i + c] = 1.2 * v;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ping = CUES.reduce((v, c) => v + (t >= c.t ? 0.2 * Math.exp(-(t - c.t) / 0.04) * Math.sin(2 * Math.PI * 1500 * (t - c.t)) : 0), 0);
    y[2 * i] += 0.08 * Math.sin(2 * Math.PI * 110 * t) + ping;
    y[2 * i + 1] += 0.08 * Math.sin(2 * Math.PI * 110 * t + 1.1) + ping;
  }
  return y;
}

test('rotate is a circular shift; quantize24 is what a 24-bit WAV holds', () => {
  const y = loop();
  const z = rotate(y, 37);
  assert.equal(z[0], y[74]); assert.equal(z[1], y[75]);
  assert.deepEqual(rotate(z, -37), y);
  const q = quantize24(new Float32Array([0.5, -1, 1, 1e-9]));
  assert.deepEqual([...q], [0.5, -1, 1 - 2 ** -23, 0]);
});

test('splice candidates: every shift within ±1 ms, flattest first (the raw wrap step if spliced there)', () => {
  const y = loop(), c = spliceCandidates(y);
  assert.equal(c.length, 2 * SPLICE.maxShift + 1);
  for (let i = 1; i < c.length; i++) assert.ok(c[i].stepDbfs >= c[i - 1].stepDbfs);
  for (const { k, stepDbfs } of c.slice(0, 5)) assert.ok(Math.abs(db(rawStepAt(y, k)) - stepDbfs) < 0.01);
  assert.ok(c[0].stepDbfs < db(rawStepAt(y, 0)) - 10, `the flattest point within 1 ms (${c[0].stepDbfs}) is far flatter than the picture's loop point (${db(rawStepAt(y, 0)).toFixed(1)})`);
});

test('the splice passes as delivered: wrap step ≤ −63 dBFS and click < −60 through the loop-aware AAC, the A/V offset unmoved', () => {
  const y = loop();
  assert.ok(db(rawStepAt(y, 0)) > -60, 'unspliced, the picture\'s loop point fails the gate\'s seam step');
  const s = spliceLoop(y, 3, { cues: CUES });
  assert.ok(s.pass, JSON.stringify(s.tried));
  assert.ok(Math.abs(s.k) <= SPLICE.maxShift && Math.abs(s.ms) <= 1);
  assert.ok(s.delivered.stepDbfs <= SEAM_STEP_TARGET && s.delivered.clickDbfs < -60);
  assert.equal(s.delivered.offsetMs, 0);
  assert.ok(db(rawStepAt(s.y, 0)) <= s.wavStepDbfs + 0.01);
  assert.equal(globalOffset(s.y, CUES).lagMs, 0);
  assert.deepEqual(spliceLoop(y, 3, { cues: CUES }).k, s.k, 'deterministic');
});
