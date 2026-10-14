// Quality profiles on the engine (WP-02, heavy: ≈ 9 min).
//
// The exact profile's bit-identity with the goldens is tests/golden/engine-v2-frames
// (the default profile is exact). Here:
//   - G-PIXEL, final against exact: PSNR >= 45 dB on all 16 goldens, face-box SSIM
//     >= 0.995 on average and >= 0.98 on every frame (PHASE2-PLAN QA gates);
//   - the feature matrix: every feature switched off on its own (final without it)
//     and on on its own (exact plus it) passes its step gate, face floor included,
//     on three golden frames (the rest pose, a bubble over the face, the face close
//     up). A combination that drops a layer, like the faceless frame that fgAccum
//     without faceCache once rendered, fails here;
//   - the final profile's frames do not depend on render history: frames rendered
//     out of order in one page equal the same frames rendered cold (what lets the
//     farm start a segment anywhere without replaying the face);
//   - the draft profile renders at 540×960 within 26 dB of the exact golden (box-
//     filtered to half size), and the proof profile's stills are the final
//     profile's frames.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GOLDEN_V2 } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { decodePNG, flipRows } from '../../render/lib/png.mjs';
import { EngineSession } from '../../render/worker.mjs';
import { gate, steps } from '../../tools/perf/gate.mjs';
import { psnr, fmtDb } from '../../tools/perf/metrics.mjs';

const P = { direction: 'my-brain-at-2am-v2', width: 1080, height: 1920, scale: 1, seed: 20261013, profile: 'final' };

test('G-PIXEL final vs exact: PSNR >= 45 dB on all 16 goldens, face-box SSIM mean >= 0.995, min >= 0.98', { timeout: 1800000 }, async (t) => {
  const r = await gate({ a: 'golden', b: 'final', label: 'test-final-vs-golden', thresholds: { psnr: 45, faceSsimMean: 0.995, faceSsimMin: 0.98 }, log: () => {} });
  const s = r.summary;
  t.diagnostic(`min PSNR ${s.minPsnr.toFixed(2)} dB (mean ${s.meanPsnr.toFixed(2)}), min face PSNR ${s.minFacePsnr.toFixed(2)} dB, face SSIM mean ${s.meanFaceSsim.toFixed(5)} min ${s.minFaceSsim.toFixed(5)}`);
  for (const c of r.checks) assert.ok(c.pass, `${c.name}: ${c.value}`);
});

test('feature matrix: each feature switched off alone (final) and on alone (exact) passes its step gate', { timeout: 3600000 }, async (t) => {
  const r = await steps({ steps: 'both', frames: '0,96,135', label: 'test-feature-matrix', log: () => {} });
  assert.equal(r.steps.length, 18);
  for (const x of r.steps) {
    t.diagnostic(`${x.feature} ${x.mode}: min PSNR ${fmtDb(x.summary.minPsnr)} dB, min face PSNR ${fmtDb(x.summary.minFacePsnr)} dB, identical ${x.summary.identical}/3`);
  }
  for (const x of r.steps) {
    assert.ok(x.pass, `${x.feature} ${x.mode} (${x.b} against ${x.a}): ${x.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.value}`).join('; ')}`);
  }
});

test('final profile: frames do not depend on render order (out of order in one page = cold)', { timeout: 1800000 }, async () => {
  await withHeavyLock({ mode: 'shared', label: 'test:golden final render order' }, async () => {
    const session = await EngineSession.start();
    let buf = null;
    const sink = session.server.addSink((_, b) => { buf = b; }, { bytes: 1080 * 1920 * 4 });
    const grab = async (page, i) => {
      await page.evaluate((i) => window.__engine.render(i), i);
      await page.evaluate((u) => window.__engine.readback(u), sink.url(0));
      await page.evaluate(() => window.__engine.flush());
      return crypto.createHash('sha256').update(buf).digest('hex');
    };
    try {
      const frames = [300, 42, 140, 33];       // spin, blinks, glances, the landing's aftermath
      const { page } = await session.openPage(P);
      const inOrder = [];
      for (const i of frames) inOrder.push(await grab(page, i));
      await page.close();
      for (const [k, i] of frames.entries()) {
        const fresh = (await session.openPage(P)).page;
        assert.equal(await grab(fresh, i), inOrder[k], `frame ${i}: out-of-order render differs from a cold render`);
        await fresh.close();
      }
    } finally {
      sink.close();
      await session.close();
    }
  });
});

/** RGBA 1080×1920 → 540×960, 2×2 box filter. */
function halve(full) {
  const half = Buffer.alloc(540 * 960 * 4);
  for (let y = 0; y < 960; y++) {
    for (let x = 0; x < 540; x++) {
      for (let c = 0; c < 4; c++) {
        const o = (2 * y * 1080 + 2 * x) * 4 + c;
        half[(y * 540 + x) * 4 + c] = (full[o] + full[o + 4] + full[o + 4320] + full[o + 4324] + 2) >> 2;
      }
    }
  }
  return half;
}

test('draft renders at half size close to the exact frame; proof stills equal the final profile\'s frames', { timeout: 1800000 }, async (t) => {
  const m = JSON.parse(fs.readFileSync(path.join(GOLDEN_V2, 'manifest.json'), 'utf8'));
  const goldens = m.frames.filter((f) => [96, 315].includes(f.i));       // a bubble over the face; the glow act
  await withHeavyLock({ mode: 'shared', label: 'test:golden draft + proof' }, async () => {
    const session = await EngineSession.start();
    let buf = null;
    const take = (_, b) => { buf = Buffer.from(b); };
    const sink = session.server.addSink(take, { bytes: 1080 * 1920 * 4 }), small = session.server.addSink(take, { bytes: 540 * 960 * 4 });
    const grab = async (page, i, s = sink) => {
      await page.evaluate((i) => window.__engine.render(i), i);
      await page.evaluate((u) => window.__engine.readback(u), s.url(0));
      await page.evaluate(() => window.__engine.flush());
      return buf;
    };
    try {
      const draft = await session.openPage({ ...P, profile: 'draft', scale: 0.5, mark: 'DRAFT' });
      assert.deepEqual([draft.info.width, draft.info.height, draft.info.profile], [540, 960, 'draft']);
      for (const g of goldens) {
        const d = flipRows(await grab(draft.page, g.i, small), 540, 960);
        const half = halve(decodePNG(fs.readFileSync(path.join(m.framesDir, g.file))).data);
        const db = psnr(d, half, 540, 960, [0, 120, 540, 960]);          // below the DRAFT mark
        t.diagnostic(`draft frame ${g.i}: ${db.toFixed(2)} dB against the exact golden at half size`);
        assert.ok(db >= 26, `draft frame ${g.i}: ${db.toFixed(2)} dB against the exact golden at half size`);
      }
      await draft.page.close();
      const proof = await session.openPage({ ...P, profile: 'proof' });
      const final = await session.openPage(P);
      for (const i of [96, 315]) {
        const a = await grab(proof.page, i), b = await grab(final.page, i);
        assert.ok(a.equals(b), `frame ${i}: the proof still differs from the final profile's frame`);
      }
    } finally {
      small.close();
      sink.close();
      await session.close();
    }
  });
});
