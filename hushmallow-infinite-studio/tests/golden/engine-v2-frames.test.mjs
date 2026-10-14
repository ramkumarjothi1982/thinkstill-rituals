// G-PIXEL on the engine (WP-01, heavy: ≈ 2 min): the frozen v2 direction,
// rendered on engine/ through the v2 adapter and read back through the binary
// frame sink, reproduces the 16 golden frames bit for bit (each in a fresh page,
// as the goldens were captured). The full-length check, all 450 frames against
// qa/golden/v2/sequential-frames.json, runs in every full render of the farm
// (render/farm.mjs sequentialGoldenCheck) and is recorded in docs/wp/WP-01.md.
// The readback benchmark (exclusive heavy lock) checks the plan's ≤ 60 ms per frame.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GOLDEN_V2 } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { decodePNG, flipRows } from '../../render/lib/png.mjs';
import { diffStats } from '../../tools/golden/pixels.mjs';
import { EngineSession, topDownSha256 } from '../../render/worker.mjs';

const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN_V2, 'manifest.json'), 'utf8'));
const tol = manifest.tolerance.pixel;
const P = { direction: 'my-brain-at-2am-v2', width: 1080, height: 1920, scale: 1, seed: 20261013 };

test('engine: the 16 golden frames, cold, through the binary readback, match at the golden tolerance', { timeout: 1800000 }, async (t) => {
  await withHeavyLock({ mode: 'shared', label: 'test:golden engine v2 frames' }, async () => {
    const session = await EngineSession.start();
    try {
      let rgba = null;
      const sink = session.server.addSink((_, buf) => { rgba = buf; }, { bytes: 1080 * 1920 * 4 });
      const results = [];
      for (const f of manifest.frames) {
        const { page } = await session.openPage(P);
        // the 0.98 s golden sits between frames (i = 29.4): render() takes fractional indices like stage2
        await page.evaluate((i) => window.__engine.render(i), f.i);
        await page.evaluate((u) => window.__engine.readback(u), sink.url(0));
        await page.evaluate(() => window.__engine.flush());
        await page.close();
        const hash = topDownSha256(rgba, 1080, 1920);
        results.push(`${f.t}s ${hash === f.rgba ? '==' : '!='}`);
        if (hash === f.rgba) continue;
        const ref = path.join(manifest.framesDir, f.file);
        assert.ok(tol > 0 && fs.existsSync(ref), `${f.file}: engine pixels differ from the golden (tolerance ${tol})`);
        const d = diffStats(decodePNG(fs.readFileSync(ref)).data, flipRows(rgba, 1080, 1920));
        assert.ok(d.maxAbs <= tol, `${f.file}: max |Δ| ${d.maxAbs} > ${tol}`);
      }
      t.diagnostic(results.join(', '));
    } finally {
      await session.close();
    }
  });
});

test('readback by binary POST: ≤ 60 ms per 1080x1920 frame (median of 30, exclusive machine)', { timeout: 1800000 }, async (t) => {
  await withHeavyLock({ mode: 'exclusive', label: 'test:golden readback benchmark' }, async () => {
    const session = await EngineSession.start();
    try {
      const { page } = await session.openPage(P);
      await page.evaluate(() => window.__engine.render(0));
      let got = 0;
      const sink = session.server.addSink(() => { got++; }, { bytes: 1080 * 1920 * 4 });
      const critical = [], full = [], legacy = [];
      for (let k = 0; k < 30; k++) {
        const t0 = performance.now();
        await page.evaluate((u) => window.__engine.readback(u), sink.url(k));
        const t1 = performance.now();
        await page.evaluate(() => window.__engine.flush());
        critical.push(t1 - t0);
        full.push(performance.now() - t0);
      }
      // stage2's readback for comparison: readPixels, base64 in the page, through the debugger, decoded in Node
      for (let k = 0; k < 5; k++) {
        const t0 = performance.now();
        const b64 = await page.evaluate(() => {
          const st = window.__engine.stage, g = st.gl, px = st.pixels();
          g.readPixels(0, 0, st.outW, st.outH, g.RGBA, g.UNSIGNED_BYTE, px);
          let bin = '';
          for (let i = 0; i < px.length; i += 0x8000) bin += String.fromCharCode.apply(null, px.subarray(i, i + 0x8000));
          return btoa(bin);
        });
        assert.equal(Buffer.from(b64, 'base64').length, 1080 * 1920 * 4);
        legacy.push(performance.now() - t0);
      }
      await page.close();
      const med = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
      t.diagnostic(`binary POST, full round trip (readPixels + copy + upload + sink): median ${med(full).toFixed(1)} ms; on the render's critical path (upload overlapped): ${med(critical).toFixed(1)} ms; stage2's base64 readback: median ${med(legacy).toFixed(0)} ms`);
      assert.equal(got, 30);
      assert.ok(med(full) <= 60, `binary readback median ${med(full).toFixed(1)} ms > 60 ms`);
    } finally {
      await session.close();
    }
  });
});
