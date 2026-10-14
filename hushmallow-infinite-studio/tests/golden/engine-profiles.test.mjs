// Quality profiles on the engine (WP-02, heavy: ≈ 3 min).
//
// The exact profile's bit-identity with the goldens is tests/golden/engine-v2-frames
// (the default profile is exact). Here:
//   - G-PIXEL, final against exact: PSNR >= 45 dB on all 16 goldens, face-box SSIM
//     >= 0.995 on average and >= 0.98 on every frame (PHASE2-PLAN QA gates);
//   - the final profile's frames do not depend on render history: frames rendered
//     out of order in one page equal the same frames rendered cold (what lets the
//     farm start a segment anywhere without replaying the face).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { EngineSession } from '../../render/worker.mjs';
import { gate } from '../../tools/perf/gate.mjs';

const P = { direction: 'my-brain-at-2am-v2', width: 1080, height: 1920, scale: 1, seed: 20261013, profile: 'final' };

test('G-PIXEL final vs exact: PSNR >= 45 dB on all 16 goldens, face-box SSIM mean >= 0.995, min >= 0.98', { timeout: 1800000 }, async (t) => {
  const r = await gate({ a: 'golden', b: 'final', label: 'test-final-vs-golden', thresholds: { psnr: 45, faceSsimMean: 0.995, faceSsimMin: 0.98 }, log: () => {} });
  const s = r.summary;
  t.diagnostic(`min PSNR ${s.minPsnr.toFixed(2)} dB (mean ${s.meanPsnr.toFixed(2)}), min face PSNR ${s.minFacePsnr.toFixed(2)} dB, face SSIM mean ${s.meanFaceSsim.toFixed(5)} min ${s.minFaceSsim.toFixed(5)}`);
  for (const c of r.checks) assert.ok(c.pass, `${c.name}: ${c.value}`);
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
