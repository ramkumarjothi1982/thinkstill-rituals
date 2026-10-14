// The fast lake world's shader assembly (engine/worlds/glsl/*.js, WP-02 P4):
// pure strings, checked without a browser (the pixels are G-PIXEL's job).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noiseGLSL } from '../../engine/worlds/glsl/noise.js';
import { skyFS, worldFastFS } from '../../engine/worlds/glsl/sky.js';
import { WORLD_FS, WATER } from '../../engine/worlds/glsl/lake-v2.js';

test('fbm octaves are a compile-time loop bound (5 = the approved world, 3 = draft)', () => {
  assert.match(noiseGLSL(5), /i < 5;/);
  assert.match(noiseGLSL(3), /i < 3;/);
  assert.throws(() => noiseGLSL(0), /positive integer/);
  assert.throws(() => noiseGLSL(2.5), /positive integer/);
  // the approved COMMON fbm, with the bound as the only change
  assert.ok(WORLD_FS.includes(noiseGLSL(5).trim().split('\n')[2]), 'same fbm line as the approved world');
});

test('the sky pass evaluates every term behind its zero-region branch; clouds can be compiled out', () => {
  const s = skyFS();
  for (const guard of ['if (h < 0.32)', 'if (s >= 0.9972)', 'if (disc > 0.)', 'if (band > 0.)', 'if (w.y > uHorizonY - 60.)']) assert.ok(s.includes(guard), guard);
  assert.ok(s.includes(WATER), 'loopA() and the water uniforms come from the approved WATER chunk');
  const noClouds = skyFS({ clouds: false });
  assert.ok(!noClouds.includes('band > 0.') && noClouds.includes('clouds off'));
  assert.match(skyFS({ octaves: 3 }), /i < 3;/);
});

test('the fast world pass copies sky pixels and samples the sky layer for the mirror (clamped to the rows written)', () => {
  const w = worldFastFS();
  assert.ok(w.includes('texelFetch(uSky, ivec2(gl_FragCoord.xy), 0)'));
  assert.ok(w.includes('ms.y = min(ms.y, uSkyMaxY)'));
  assert.ok(!/vec3 sky\(/.test(w), 'no sky evaluation left in the world pass');
  assert.ok(w.includes(WATER));
});
