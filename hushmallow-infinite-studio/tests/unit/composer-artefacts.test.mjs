// composer/artefacts.js: the review artefacts of a compiled direction, from a
// dry evaluation only (R12): cue log, curves, sub-frame counts, channel plots.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { studioPath } from '../../render/lib/paths.mjs';
import { dryRun, channelPlotSvg } from '../../composer/artefacts.js';
import { createScene } from '../../composer/scene.js';
import { loadGoldenV2, compareDeep } from '../../tools/golden/compare.mjs';
import { composeNode, retriggerLoop, settledArc, registryWith, specWith, dataWithCells } from '../parity/composer-fixtures.mjs';

const golden = loadGoldenV2();
// the committed page-composed direction: its glass boxes were measured with the real font
const pageDirection = () => JSON.parse(fs.readFileSync(studioPath('specs', 'golden', 't01-v2.direction.json'), 'utf8'));

test('dry run of the golden direction: cue log byte-equal, sub-frames exact, curves within 1e-9 (Node Math.pow)', () => {
  const r = dryRun(pageDirection());
  assert.equal(JSON.stringify(r.cues), JSON.stringify(golden.cues.cues));
  assert.deepEqual(r.subframes, golden.subframes.frames);
  const res = compareDeep(golden.curves.curves, r.curves, { tol: 1e-9 });
  assert.ok(res.equal, JSON.stringify(res.diffs?.slice(0, 3)));
});

test('channel plots: one line per channel component, anchors as rules, byte-identical on every run', () => {
  const d = pageDirection();
  const svg = channelPlotSvg(d);
  assert.equal(svg, channelPlotSvg(pageDirection()));
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  const sc = createScene(d);
  const components = Object.keys(d.channels).reduce((n, name) => { const v = sc.channel(name)(0); return n + (Array.isArray(v) ? v.length : 1); }, 0);
  assert.equal((svg.match(/<polyline /g) || []).length, components, 'every component of every channel');
  assert.ok(components > Object.keys(d.channels).length, 'vector channels (e.g. amplitude and phase) plot each component');
  for (const a of ['IMPACT', 'TURN', 'END']) assert.ok(svg.includes(`>${a}</text>`), a);
  const some = channelPlotSvg(d, { names: ['face.blink', 'cam.zoom', 'no.such'] });
  assert.equal((some.match(/<polyline /g) || []).length, 2, 'unknown names are skipped');
});

test('with P > 0 the plots span the composition domain [−P, D − P)', () => {
  const loop = retriggerLoop(), arc = settledArc();
  const spec = specWith((s) => { s.loop = loop.id; s.arc = arc.id; });
  const { direction } = composeNode({ spec, data: dataWithCells([loop.id, arc.id], spec), moves: registryWith(loop, arc) });
  assert.ok(direction.meta.P > 0);
  const svg = channelPlotSvg(direction, { names: ['body.squash'] });
  const pts = /points="([^"]+)"/.exec(svg)[1].split(' ');
  assert.equal(pts.length, Math.round(15 * 30) + 1, 'D seconds at 30 Hz, both ends included');
  assert.equal(dryRun(direction).subframes.length, 450);
});
