// Full-length composer parity (WP-03, about 25 min, opt-in): all 450 frames of
// T01, composed in the page and rendered in order by runtime v3, must equal
// qa/golden/v2/sequential-frames.json: the in-order render whose re-encode is
// byte-identical to the approved master, and which the WP-01 legacy farm render
// reproduced 450/450. Equal hashes here therefore mean the composer render is
// bit-identical to the WP-01 legacy render.
//
//   HM_PARITY_SEQUENTIAL=1 node cli/hm.mjs test parity
//
// Takes a shared heavy-lock slot; frames go straight to the frame sink and are
// hashed in Node (nothing is written to disk).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GOLDEN_V2 } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { topDownSha256 } from '../../render/worker.mjs';
import { EngineSession, openComposerPage, goldenSpec } from './composer-support.mjs';

const RUN = process.env.HM_PARITY_SEQUENTIAL === '1';
const seq = JSON.parse(fs.readFileSync(path.join(GOLDEN_V2, 'sequential-frames.json'), 'utf8'));

test('composer → runtime v3: all 450 frames in order equal the sequential golden (the WP-01 legacy render)', { timeout: 7200000, skip: RUN ? false : 'opt-in: HM_PARITY_SEQUENTIAL=1 (about 25 min)' }, async (t) => {
  await withHeavyLock({ mode: 'shared', label: 'test:parity composer v2 sequential' }, async () => {
    const session = await EngineSession.start();
    try {
      const hashes = new Array(seq.frames).fill(null);
      const sink = session.server.addSink((i, buf) => { hashes[i] = topDownSha256(buf, 1080, 1920); }, { bytes: 1080 * 1920 * 4 });
      const { page } = await openComposerPage(session, { spec: goldenSpec() }, { probe: false });
      const t0 = Date.now();
      for (let i = 0; i < seq.frames; i++) {
        await page.evaluate((k) => window.__engine.render(k), i);
        await page.evaluate((u) => window.__engine.readback(u), sink.url(i));
        if (i % 90 === 89) t.diagnostic(`frame ${i + 1}/${seq.frames}, ${((Date.now() - t0) / (i + 1) / 1000).toFixed(2)} s/frame`);
      }
      await page.evaluate(() => window.__engine.flush());
      const bad = hashes.map((h, i) => (h === seq.hashes[i] ? null : i)).filter((i) => i !== null);
      t.diagnostic(`${seq.frames - bad.length}/${seq.frames} identical in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      assert.deepEqual(bad, [], `frames differing from the sequential golden: ${bad.slice(0, 20).join(', ')}`);
    } finally {
      await session.close();
    }
  });
});
