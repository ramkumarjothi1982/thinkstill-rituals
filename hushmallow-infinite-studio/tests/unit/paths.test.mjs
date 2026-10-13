import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  STUDIO, REPO, HUSHMALLOW, WORK, FROZEN, isInside, isFrozen, studioRel, assertWritable, mkWorkTemp,
} from '../../render/lib/paths.mjs';

test('roots resolve to the studio, its repo, the app next to it and the shared scratch dir', () => {
  assert.equal(path.basename(STUDIO), 'hushmallow-infinite-studio');
  assert.ok(fs.existsSync(path.join(STUDIO, 'package.json')));
  assert.equal(REPO, path.dirname(STUDIO));
  assert.equal(HUSHMALLOW, path.join(REPO, 'hushmallow'));
  assert.ok(fs.existsSync(path.join(HUSHMALLOW, 'src')), 'the live app sits next to the studio');
  assert.equal(WORK, path.resolve(process.env.HM_WORK || '/home/user/hm-work'));
});

test('isInside is lexical and handles the root itself and look-alike prefixes', () => {
  assert.ok(isInside('/a/b', '/a/b'));
  assert.ok(isInside('/a/b/c/d', '/a/b'));
  assert.ok(!isInside('/a/bc', '/a/b'));
  assert.ok(!isInside('/a', '/a/b'));
  assert.ok(!isInside('/a/b/../c', '/a/b'));
});

test('frozen paths: whole directories and single files', () => {
  assert.ok(FROZEN.includes('stage2/') && FROZEN.includes('output/v2/') && FROZEN.includes('render/render.mjs'));
  assert.ok(isFrozen(path.join(STUDIO, 'stage2/renderer.js')));
  assert.ok(isFrozen(path.join(STUDIO, 'stage2')));
  assert.ok(isFrozen(path.join(STUDIO, 'output/v2/cues.json')));
  assert.ok(isFrozen(path.join(STUDIO, 'audio/soundtrack.mjs')));
  assert.ok(!isFrozen(path.join(STUDIO, 'stage2x/a.js')), 'prefix look-alikes are not frozen');
  assert.ok(!isFrozen(path.join(STUDIO, 'render/serve.mjs')));
  assert.ok(!isFrozen(path.join(STUDIO, 'videos/my-brain-at-2am.js')), 'only the approved v2 direction is frozen');
  assert.equal(studioRel('/etc/passwd'), null);
});

test('assertWritable allows the studio and WORK, refuses the app, frozen v2 and the rest of the disk', () => {
  assert.equal(assertWritable(path.join(STUDIO, 'qa/golden/v2/x.json')), path.join(STUDIO, 'qa/golden/v2/x.json'));
  assert.ok(assertWritable(path.join(WORK, 'golden/v2/frames/a.png')));
  assert.throws(() => assertWritable(path.join(HUSHMALLOW, 'src/x.js')), /live app/);
  assert.throws(() => assertWritable(path.join(STUDIO, 'stage2/renderer.js')), /frozen/);
  assert.throws(() => assertWritable(path.join(STUDIO, 'output/v2/new.mp4')), /frozen/);
  assert.throws(() => assertWritable('/tmp/x'), /outside/);
  assert.throws(() => assertWritable(path.join(REPO, 'README.md')), /outside/);
});

test('mkWorkTemp creates a private directory under WORK/tmp', () => {
  const d = mkWorkTemp('paths-test-');
  try {
    assert.ok(isInside(d, path.join(WORK, 'tmp')));
    assert.ok(fs.statSync(d).isDirectory());
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
