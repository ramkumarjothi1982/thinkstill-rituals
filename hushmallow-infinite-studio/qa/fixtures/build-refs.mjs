// Build the realm-likeness references (G-FINAL realm likeness) from the approved v2.
//
//   node qa/fixtures/build-refs.mjs
//
// Writes qa/fixtures/ref/realms/moonmilk-cove.json: per mood of the realm
// (base, tense, resolved, classed by the direction's world dials exactly as
// the gate classes frames) the median 9x16 Lab grid of the approved v2's
// frames. Marked provisional: WP-19 replaces it with stills captured from the
// app's own realm (PHASE2-PLAN G-FINAL world), and the owner's realm
// checkpoint stills stay the primary on-model check.

import fs from 'node:fs';
import path from 'node:path';
import { studioPath, studioRel, WORK } from '../../render/lib/paths.mjs';
import { loadContext, V2_TARGET } from '../gates/context.mjs';
import { directionGeometry } from '../gates/geometry.mjs';
import { runPython } from '../run-qa.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';

const { confine } = await import('../../render/lib/write-jail.mjs');
await confine();
const ctx = await loadContext({ kind: 'manifest', path: V2_TARGET });
const work = path.join(WORK, 'qa-fixtures', 'refs');
fs.mkdirSync(work, { recursive: true });
const frames = Math.round(ctx.duration * ctx.fps);
const geometryFile = path.join(work, 'geometry.json');
fs.writeFileSync(geometryFile, JSON.stringify(directionGeometry(ctx.direction, { frames, fps: ctx.fps })));
const out = await withHeavyLock({ mode: 'shared', label: 'qa realm refs' }, () => runPython('pixels.py', {
  video: ctx.video, fps: ctx.fps, framesExpected: frames, gates: ['G-FINAL:realm-likeness'], geometryFile, realmRef: null, realm: ctx.direction.realm.id,
}, work, 'refs'));
const r = out.gates['G-FINAL:realm-likeness'];
const ref = {
  schema: 'hm-qa-realm-ref/1',
  realm: ctx.direction.realm.id,
  provisional: true,
  source: `approved v2 (${studioRel(ctx.video)}, sha256 ${ctx.videoSha256.slice(0, 12)}...): median 9x16 Lab grid per mood; replaced by app-captured stills in WP-19`,
  grid: { cols: 9, rows: 16, space: 'CIE Lab (D65), area-averaged in linear light' },
  moods: Object.fromEntries(Object.entries(r.grids).map(([m, g]) => [m, { frames: r.metrics.moods[m], grid: g }])),
};
const file = studioPath('qa', 'fixtures', 'ref', 'realms', `${ref.realm}.json`);
fs.writeFileSync(file, `${JSON.stringify(ref)}\n`);
console.log(`wrote ${studioRel(file)}: moods ${Object.entries(r.metrics.moods).map(([m, n]) => `${m} (${n} frames)`).join(', ')}`);
