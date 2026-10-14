// G-PIXEL through the composer (WP-03, exact profile): T01 composed in the page
// and rendered by runtime v3 reproduces the golden frames bit for bit, each in
// a fresh page as the goldens were captured (cold).
//
// By default 4 representative goldens run (the painted rest crossfade, the
// impact between frames, the spinning glass, the end card with logo and slow
// blink: about 30 s). HM_PARITY_FULL=1 runs all 16, the end-of-package check.
// The full-length check, all 450 frames in order against the in-order render
// whose re-encode is the approved master, is composer-v2-sequential.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GOLDEN_V2 } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { topDownSha256 } from '../../render/worker.mjs';
import { EngineSession, openComposerPage, goldenSpec, pageDirection } from './composer-support.mjs';

const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN_V2, 'manifest.json'), 'utf8'));
const FULL = process.env.HM_PARITY_FULL === '1';
const PICK = [0.2, 0.98, 6.5, 12.8];
const frames = FULL ? manifest.frames : manifest.frames.filter((f) => PICK.includes(f.t));

test(`composer → runtime v3: ${frames.length} golden frames, cold, bit-identical (tolerance ${manifest.tolerance.pixel}/255)`, { timeout: 1800000 }, async (t) => {
  assert.equal(manifest.tolerance.pixel, 0, 'goldens are exact (WP-00 measured SwiftShader deterministic)');
  await withHeavyLock({ mode: 'shared', label: 'test:parity composer v2 pixels' }, async () => {
    const session = await EngineSession.start();
    try {
      // compose once in a page (real font), then render every frame from that direction in a fresh page
      const first = await openComposerPage(session, { spec: goldenSpec() }, { probe: false });
      const direction = await pageDirection(first.page);
      await first.page.close();
      let rgba = null;
      const sink = session.server.addSink((_, buf) => { rgba = buf; }, { bytes: 1080 * 1920 * 4 });
      const results = [];
      for (const f of frames) {
        const { page } = await openComposerPage(session, { direction }, { probe: false });
        await page.evaluate((i) => window.__engine.render(i), f.i);
        await page.evaluate((u) => window.__engine.readback(u), sink.url(0));
        await page.evaluate(() => window.__engine.flush());
        await page.close();
        const hash = topDownSha256(rgba, 1080, 1920);
        results.push(`${f.t}s ${hash === f.rgba ? '==' : '!='}`);
        assert.equal(hash, f.rgba, `${f.file}: composer frame differs from the golden`);
      }
      t.diagnostic(results.join(', '));
    } finally {
      await session.close();
    }
  });
});
