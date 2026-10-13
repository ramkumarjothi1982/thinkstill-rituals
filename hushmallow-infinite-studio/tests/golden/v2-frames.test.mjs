// G-PIXEL baseline (heavy, ≈ 2 min; `npm run test:golden`): re-render the 16
// golden frames of the frozen v2 — each in a fresh page, as captured — and
// require them to match qa/golden/v2/manifest.json within the measured
// tolerance (0 = bit-identical). When the lossless PNGs are present in
// WORK/golden/v2/frames they are verified against frames.sha256 as well.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GOLDEN_V2 } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { hashFile, parseManifest, sha256 } from '../../render/lib/tree-hash.mjs';
import { decodePNG } from '../../render/lib/png.mjs';
import { diffStats } from '../../tools/golden/pixels.mjs';
import * as V2 from '../../tools/golden/v2-harness.mjs';

const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN_V2, 'manifest.json'), 'utf8'));
const tol = manifest.tolerance.pixel;
const pngSums = parseManifest(fs.readFileSync(path.join(GOLDEN_V2, 'frames.sha256'), 'utf8'));

test('the manifest lists the 16 planned golden times with their hashes', () => {
  assert.deepEqual(manifest.frames.map((f) => f.t), [...V2.GOLDEN_TIMES]);
  for (const f of manifest.frames) {
    assert.match(f.rgba, /^[0-9a-f]{64}$/);
    assert.equal(pngSums[f.file], f.png);
  }
  assert.ok(tol === 0 || (tol > 0 && tol <= 1), `pixel tolerance must be exact or ≤ 1/255, got ${tol}`);
});

test('the sequential reference (all 450 frames in order) agrees with the cold goldens and the approved master', (t) => {
  const file = path.join(GOLDEN_V2, 'sequential-frames.json');
  if (!fs.existsSync(file)) { t.skip('sequential-frames.json not captured (hm golden sequential)'); return; }
  const seq = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(seq.hashes.length, 450);
  for (const f of manifest.frames.filter((x) => Number.isInteger(x.i))) assert.equal(seq.hashes[f.i], f.rgba, `${f.file} vs sequential frame ${f.i}`);
  assert.equal(seq.reencode.bitIdenticalToApproved, true, 're-encoded sequential render must equal the approved H.264 stream');
});

test('lossless golden PNGs in WORK match their committed sha256', (t) => {
  const dir = manifest.framesDir;
  if (!fs.existsSync(dir)) { t.skip(`${dir} not present on this machine (re-create with: hm golden capture)`); return; }
  for (const f of manifest.frames) assert.equal(hashFile(path.join(dir, f.file)), f.png, f.file);
});

test('re-rendered golden frames match (cold render, fresh page per frame)', { timeout: 1800000 }, async (t) => {
  await withHeavyLock({ mode: 'shared', label: 'test:golden v2 frames' }, async () => {
    const env = await V2.launch();
    try {
      for (const f of manifest.frames) {
        const { page } = await V2.openStage(env);
        const rgba = await V2.renderRaw(page, f.i);
        await page.close();
        if (sha256(rgba) === f.rgba) continue;
        const ref = path.join(manifest.framesDir, f.file);
        assert.ok(tol > 0 && fs.existsSync(ref), `${f.file}: pixels differ from the golden (tolerance ${tol})`);
        const d = diffStats(decodePNG(fs.readFileSync(ref)).data, rgba);
        assert.ok(d.maxAbs <= tol, `${f.file}: max |Δ| ${d.maxAbs} > ${tol}`);
      }
      t.diagnostic(`${manifest.frames.length} frames checked at tolerance ${tol}/255`);
    } finally {
      await env.close();
    }
  });
});
