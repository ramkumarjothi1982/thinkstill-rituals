// Node side of the composer's inputs: library files from disk, the face spec
// derived exactly as the engine derives it (engine/face.js specFromDerived on
// the pack's face JSON and the app registry's rig), the silhouette recorded in
// the pack (checked against the art's sha256), and the font-metrics shim as
// measure(). The render page builds the same inputs from fetched files and
// real canvas measurement (engine/runtime/direction-runtime.js).
//
// Loaded on demand by compose() when it is called without data (the planner's
// compile path); never imported by page code.

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { STUDIO, REPO } from '../render/lib/paths.mjs';
import { indexLibraryLite } from './library.js';
import { measureText } from '../planner/text-metrics.mjs';
import { specFromDerived } from '../engine/face.js';
import { MALLOWS } from '../../hushmallow/src/mallows/registry.js';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const cache = new Map();

/** A studio file: bytes, parsed JSON and sha256 (cached per process). */
function studioFile(rel, { json = true } = {}) {
  const key = `${rel}|${json}`;
  if (!cache.has(key)) {
    const abs = rel.startsWith('../') ? path.join(REPO, rel.slice(3)) : path.join(STUDIO, rel);
    const bytes = fs.readFileSync(abs);
    cache.set(key, { bytes, sha256: sha256(bytes), value: json ? JSON.parse(bytes.toString('utf8')) : null });
  }
  return cache.get(key);
}

/** The story library, indexed the composer's way (the planner passes its own, richer index). */
export const loadLib = () => indexLibraryLite(studioFile('templates/story-library.json').value);

/** measure() from the committed Fredoka metrics (the shim; the page measures for real). */
export const shimMeasure = (text, { weight, size, tracking = 0 }) => measureText(text, { weight, size, tracking });

/**
 * Character pack + derived geometry. The silhouette is the one the pack
 * records, valid only for the exact art it was measured on.
 */
export function loadMallow(id) {
  const packFile = studioFile(`library/mallows/${id}.json`);
  const pack = packFile.value;
  const art = studioFile(pack.art.pristine, { json: false });
  const rec = pack.measured.silhouette;
  if (rec.sha256 !== art.sha256) throw new Error(`${id}: the recorded silhouette was measured on ${rec.sha256.slice(0, 12)}…, the art is ${art.sha256.slice(0, 12)}… (re-measure: tests/unit/composer-library.test.mjs)`);
  const faceJson = studioFile(pack.art.face).value;
  const rig = MALLOWS[pack.registry]?.face;
  if (!rig) throw new Error(`${id}: the app registry has no face rig for "${pack.registry}"`);
  const faceSpec = specFromDerived(faceJson, rig, pack.face.rigScale);
  const { sha256: _, ...silhouette } = rec;
  return { pack, faceSpec, silhouette, sha256: packFile.sha256 };
}

/** Everything compose() needs for a spec, from disk. */
export function loadComposerData(spec) {
  const m = loadMallow(spec.mallow);
  const realm = studioFile(`library/realms/${spec.realm}.json`);
  const tuning = studioFile('library/tuning-matrix.json');
  return {
    pack: m.pack, faceSpec: m.faceSpec, silhouette: m.silhouette,
    realm: realm.value, tuning: tuning.value,
    measure: shimMeasure, measuredBy: 'shim',
    hashes: { pack: m.sha256, realm: realm.sha256, tuning: tuning.sha256 },
  };
}
