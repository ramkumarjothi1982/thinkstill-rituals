// render/lib/provenance.mjs: the job key (what makes --resume safe) and the
// provenance records (asset hashes, magnification, stamp).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, hashValue, jobKey, assetReport, stamp, treeHash, playwrightVersion, gitInfo, machineInfo } from '../../render/lib/provenance.mjs';

const base = {
  direction: 'my-brain-at-2am-v2', directionSha256: 'd', engineTree: 'e', appTree: 'a',
  params: { width: 1080, height: 1920, scale: 1, seed: 20261013 }, encoderArgs: { encoder: 'qp15' },
  chromium: '141.0.7390.37', chromiumArgs: ['--use-angle=vulkan', '--enable-unsafe-swiftshader'],
};

test('canonical JSON ignores key order', () => {
  assert.equal(canonicalJson({ b: 1, a: [1, { d: 2, c: 3 }] }), '{"a":[1,{"c":3,"d":2}],"b":1}');
  assert.equal(hashValue({ x: 1, y: 2 }), hashValue({ y: 2, x: 1 }));
});

test('the job key changes with every input that decides segment bytes, and only with them', () => {
  const k0 = jobKey(base).key;
  assert.match(k0, /^[0-9a-f]{64}$/);
  assert.equal(jobKey({ ...base, params: { seed: 20261013, scale: 1, height: 1920, width: 1080 } }).key, k0, 'order does not matter');
  for (const [name, change] of [
    ['direction source', { directionSha256: 'd2' }], ['engine tree', { engineTree: 'e2' }], ['live app', { appTree: 'a2' }],
    ['render scale', { params: { ...base.params, scale: 0.5 } }], ['seed', { params: { ...base.params, seed: 1 } }],
    ['encoder', { encoderArgs: { encoder: 'crf16' } }], ['Chromium build', { chromium: '142' }], ['Chromium flags', { chromiumArgs: ['--use-angle=swiftshader'] }],
    ['composer runtime code', { runtimeTrees: { composer: 'c', planner: 'p' } }],
  ]) assert.notEqual(jobKey({ ...base, ...change }).key, k0, name);
  assert.equal(jobKey({ ...base, runtimeTrees: undefined }).key, k0, 'no runtime trees: a v2 key is unchanged');
  const v3 = { ...base, runtimeTrees: { composer: 'c', planner: 'p' } };
  assert.notEqual(jobKey({ ...v3, runtimeTrees: { composer: 'c2', planner: 'p' } }).key, jobKey(v3).key, 'composer code');
});

test('asset report: one hash per URL (a change mid-job is a conflict), rasters joined with hashes and max magnification', () => {
  const served = [
    [{ url: '/s/assets/noomi/noomi-art.png', sha256: 'A', bytes: 10 }, { url: '/s/engine/gl.js', sha256: 'G', bytes: 5 }],
    [{ url: '/s/assets/noomi/noomi-art.png', sha256: 'A', bytes: 10 }],
  ];
  const snaps = [
    { rasters: [{ role: 'art', url: '/s/assets/noomi/noomi-art.png', kind: 'image', width: 1199, height: 1110 }, { role: 'face', url: null, kind: 'canvas' }], maxMagnification: { art: 0.56, face: 0.56 } },
    { rasters: [{ role: 'art', url: '/s/assets/noomi/noomi-art.png', kind: 'image', width: 1199, height: 1110 }], maxMagnification: { art: 0.79 } },
  ];
  const r = assetReport(served, snaps);
  assert.deepEqual(r.files.map((f) => f.url), ['/s/assets/noomi/noomi-art.png', '/s/engine/gl.js']);
  assert.deepEqual(r.conflicts, []);
  const art = r.rasters.find((x) => x.role === 'art');
  assert.equal(art.sha256, 'A');
  assert.equal(art.maxMagnification, 0.79);
  assert.equal(r.maxMagnification, 0.79, 'the max over loaded images');
  const bad = assetReport([[{ url: '/x.png', sha256: '1', bytes: 1 }], [{ url: '/x.png', sha256: '2', bytes: 1 }]], []);
  assert.deepEqual(bad.conflicts, [{ url: '/x.png', a: '1', b: '2' }]);
});

test('stamp, tree hash and tool versions', () => {
  assert.equal(stamp({ job: { direction: 'my-brain-at-2am-v2', key: 'abcdef0123456789' }, git: { sha: '0123456789abcdef', dirty: true } }),
    'hushmallow-infinite-studio my-brain-at-2am-v2 @ 0123456789ab-dirty job abcdef012345');
  const t = treeHash('engine');
  assert.ok(t.files >= 20);
  assert.match(t.sha256, /^[0-9a-f]{64}$/);
  assert.equal(treeHash('engine').sha256, t.sha256, 'stable');
  assert.equal(playwrightVersion(), '1.56.1');
  assert.match(gitInfo().sha ?? '', /^[0-9a-f]{40}$/);
  assert.ok(machineInfo().cores >= 1);
});
