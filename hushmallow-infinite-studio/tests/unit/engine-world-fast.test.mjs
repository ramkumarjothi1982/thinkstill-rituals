// The fast lake world's shader assembly (engine/worlds/glsl/*.js, WP-02 P4, P4b):
// pure strings, checked without a browser (the pixels are G-PIXEL's job).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noiseGLSL } from '../../engine/worlds/glsl/noise.js';
import { skyFS, skyLowFS, skyComposeFS, SKY_COPY_FS, worldFastFS } from '../../engine/worlds/glsl/sky.js';
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

test('P4b: each scissored sky pass holds only its region\'s terms', () => {
  const low = skyLowFS(), plain = skyComposeFS(), hills = skyComposeFS({ part: 'hills' }), moon = skyComposeFS({ part: 'moon' });
  // the 1/2-res pass: the smooth terms, none with a sharp edge
  for (const t of ['if (h < 0.32)', 'if (band > 0.)', 'exp(-dd / (mr * 0.45))', 'return vec4(mix(c, cloud, a), a)']) assert.ok(low.includes(t), `low: ${t}`);
  for (const t of ['hash12(g)', 'if (disc > 0.)', 'uHorizonY - 60.']) assert.ok(!low.includes(t), `not in low: ${t}`);
  // plain / hills: P + (1 - a) * stars, the hills only in their band's pass; no moon, no stratus fbm
  for (const src of [plain, hills]) {
    assert.ok(src.includes('vec3 c = low.rgb + (1. - low.a) * skyStars('));
    assert.ok(!src.includes('skyMoon(') && !src.includes('fbm(cp)') && !src.includes('fbm(mq'));
  }
  assert.ok(hills.includes('c = skyHills(w, c);') && !plain.includes('c = skyHills(w, c);'));
  // moon: sky() term by term in its order (stars, glow, moon, cloud colour, then the hills), cl from the low layer
  assert.ok(moon.includes('skyMoon(w, low.a / 0.88, disc)'));
  const order = ['c += skyStars(', 'uHaloCol * glow', 'mix(c, moon,', 'mix(c, cloud, cl * 0.88)', 'return skyHills(w, c)'].map((t) => moon.indexOf(t));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(order.every((i) => i > 0));
  assert.throws(() => skyComposeFS({ part: 'sun' }), /unknown sky part/);
  // the copy pass writes what the world pass's sky branch writes
  assert.ok(SKY_COPY_FS.includes('vec4(texelFetch(uSky, ivec2(gl_FragCoord.xy), 0).rgb, 1.)'));
  assert.ok(worldFastFS().includes('vec4(texelFetch(uSky, ivec2(gl_FragCoord.xy), 0).rgb, 1.)'));
  assert.ok(skyLowFS({ clouds: false }).includes('clouds off') && !skyLowFS({ clouds: false }).includes('band > 0.'));
  assert.match(skyLowFS({ octaves: 3 }), /i < 3;/);
});
