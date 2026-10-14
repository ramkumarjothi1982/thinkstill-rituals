// The exact profile compiles the approved v2 shader text, byte for byte
// (engine/renderer/glsl-v2.js, engine/worlds/glsl/lake-v2.js). These hashes
// were taken from the WP-01 renderer.js (= stage2's text) when WP-02 cut the
// shaders out, and checked string by string against it. A change here changes
// the exact profile's pixels: the goldens would no longer match.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { FS_VERT } from '../../engine/gl.js';
import * as V2 from '../../engine/renderer/glsl-v2.js';
import { WATER, WORLD_FS, REFL_FS } from '../../engine/worlds/glsl/lake-v2.js';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

const EXACT_PROGRAM_SOURCES = () => ({
  world: [FS_VERT, WORLD_FS],
  reflection: [FS_VERT, REFL_FS],
  mesh: [V2.MESH_VS, V2.MESH_FS],
  blur: [FS_VERT, V2.BLUR_FS],
  copy: [FS_VERT, V2.COPY_FS],
  bright: [FS_VERT, V2.BRIGHT_FS],
  glass: [V2.GLASS_VS, V2.GLASS_FS],
  particles: [V2.PART_VS, V2.PART_FS],
  post: [FS_VERT, V2.postFS(1080, 1920)],
  accumulate: [FS_VERT, V2.ACC_FS],
});

const PINNED = {
  world: '9172910b4b387b73',
  reflection: 'a722d8b722a69652',
  mesh: 'c609d5b624e807a3',
  blur: 'c1859440a45a8c38',
  copy: 'bdf40d8ec88de7e6',
  bright: 'da48c6057e8bfce4',
  glass: '362e5b07f6bb455c',
  particles: 'dffc79945d6548a5',
  post: 'e05fc294ba150a31',
  accumulate: '43f49cbf6d3feae1',
};

test('the exact profile\'s shader programs are the approved v2 text, byte for byte', () => {
  const got = Object.fromEntries(Object.entries(EXACT_PROGRAM_SOURCES()).map(([k, [vs, fs]]) => [k, sha(`${vs}\n----\n${fs}`)]));
  assert.deepEqual(got, PINNED);
  assert.ok(WORLD_FS.includes(WATER) && REFL_FS.includes(WATER), 'both lake passes embed the v2 water displacement');
});
