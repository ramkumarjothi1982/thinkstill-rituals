// Build qa/fixtures/v2/render-evidence.json: what the approved v2 loaded and
// how far it magnified each raster, for G-FINAL fidelity (magnification log)
// and G-FINAL allowlist.
//
//   node qa/fixtures/build-v2-evidence.mjs [<farm job dir>]      (default runs/wp01/v2-w2)
//
// The approved master was rendered by the legacy route, which kept no asset
// log. WP-01's farm job runs/wp01/v2-w2 re-rendered the same direction at the
// same parameters and its 450 frame hashes equal qa/golden/v2/sequential-frames.json
// exactly; that file's re-encode is bit-identical to the approved H.264 stream.
// The farm job's asset log therefore describes the approved frames. This
// script refuses to write unless that chain holds, and records it.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { studioPath, studioRel } from '../../render/lib/paths.mjs';

const job = path.resolve(process.argv[2] || studioPath('runs', 'wp01', 'v2-w2'));
const prov = JSON.parse(fs.readFileSync(path.join(job, 'provenance.json'), 'utf8'));
const seq = JSON.parse(fs.readFileSync(studioPath('qa', 'golden', 'v2', 'sequential-frames.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(studioPath('qa', 'golden', 'v2', 'manifest.json'), 'utf8'));
const same = prov.frameHashes.length === seq.hashes.length && prov.frameHashes.every((h, i) => h === seq.hashes[i]);
if (!same) throw new Error(`${job}: frame hashes differ from the sequential golden; it does not describe the approved frames`);
if (!seq.reencode?.bitIdenticalToApproved) throw new Error('the sequential golden is not recorded as bit-identical to the approved stream');
const listHash = (l) => crypto.createHash('sha256').update(l.join('\n')).digest('hex');
const out = {
  schema: 'hm-qa-render-evidence/1',
  $doc: 'Render evidence for the approved v2 (legacy route, no provenance.json). Built by qa/fixtures/build-v2-evidence.mjs; see its header for the chain of evidence.',
  source: `farm job ${studioRel(job) ?? job} (WP-01): direction ${prov.job.direction}, params ${JSON.stringify(prov.job.params)}`,
  video: golden.source.approvedMp4,
  chain: {
    farmFrameHashes: listHash(prov.frameHashes),
    sequentialGolden: 'qa/golden/v2/sequential-frames.json',
    sequentialGoldenHashes: listHash(seq.hashes),
    identicalFrames: prov.frameHashes.length,
    approvedH264StreamSha256: seq.reencode.approvedH264StreamSha256,
  },
  assets: { files: prov.assets.files, rasters: prov.assets.rasters, maxMagnification: prov.assets.maxMagnification, conflicts: prov.assets.conflicts },
  runtimeErrors: prov.runtimeErrors,
  chromium: prov.tools?.chromium, webgl: prov.tools?.webgl?.renderer,
};
const file = studioPath('qa', 'fixtures', 'v2', 'render-evidence.json');
fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
console.log(`wrote ${studioRel(file)}: ${out.assets.files.length} files, max magnification ${out.assets.maxMagnification.toFixed(4)}, ${out.chain.identicalFrames} identical frames`);
