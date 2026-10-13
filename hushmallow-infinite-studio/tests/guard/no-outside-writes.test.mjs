// Guard: studio work never lands outside the studio root. Large artefacts go
// to WORK (/home/user/hm-work), which is outside the repository; inside the
// repository, nothing outside hushmallow-infinite-studio/ may be modified,
// added or deleted (the app is additionally hash-locked by app-untouched).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { STUDIO, REPO, WORK, HUSHMALLOW, isInside, assertWritable } from '../../render/lib/paths.mjs';
import { repoChangesOutsideStudio } from '../../render/lib/frozen.mjs';

test('the repository has no uncommitted changes outside the studio root', () => {
  const outside = repoChangesOutsideStudio();
  assert.deepEqual(outside, [], `writes outside the studio root: ${outside.join(', ')}. Only ${path.relative(REPO, STUDIO)}/ and ${WORK} may be written.`);
});

test('WORK (shared scratch) lies outside the repository, so scratch files never show up in git', () => {
  assert.ok(!isInside(WORK, REPO), `${WORK} must not be inside ${REPO}`);
});

test('tools refuse output paths outside the studio and WORK, in the app, or in the frozen v2', () => {
  assert.throws(() => assertWritable(path.join(REPO, 'notes.txt')), /outside/);
  assert.throws(() => assertWritable(path.join(HUSHMALLOW, 'index.html')), /live app/);
  assert.throws(() => assertWritable(path.join(STUDIO, 'render/render.mjs')), /frozen/);
  assert.doesNotThrow(() => assertWritable(path.join(STUDIO, 'runs/batch/x.mp4')));
  assert.doesNotThrow(() => assertWritable(path.join(WORK, 'golden/v2/frames/x.png')));
});
