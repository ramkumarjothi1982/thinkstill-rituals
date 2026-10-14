// G-FINAL determinism: N frames of the video, chosen pseudo-randomly from the
// video's own sha256 (so a re-run picks the same frames), are rendered again,
// each in a fresh engine page primed exactly as the render farm primes a
// segment start (window.__engine.prime(i, preroll)), and the RGBA hash of each
// must equal the hash the original render recorded for that frame:
//   - a farm job: provenance.json frameHashes (and the job's own parameters);
//   - the approved v2 (legacy route, no provenance): the in-order reference
//     hashes qa/golden/v2/sequential-frames.json, whose re-encode is
//     bit-identical to the approved master's H.264 stream.
// It runs under a shared slot of the heavy-job lock, in parallel with the
// pixel gates.

import fs from 'node:fs';
import crypto from 'node:crypto';
import { studioPath } from '../../render/lib/paths.mjs';

/** n distinct frame indices in [0, frames) derived from a hex digest. */
export function pickFrames(hex, frames, n = 3) {
  const out = [];
  let h = hex;
  while (out.length < Math.min(n, frames)) {
    for (let k = 0; k + 8 <= h.length && out.length < Math.min(n, frames); k += 8) {
      const i = parseInt(h.slice(k, k + 8), 16) % frames;
      if (!out.includes(i)) out.push(i);
    }
    h = crypto.createHash('sha256').update(h).digest('hex');
  }
  return out.sort((a, b) => a - b);
}

/** The reference a video can be re-rendered against, or null with a reason. */
export function referenceOf(ctx) {
  const p = ctx.provenance;
  if (p?.frameHashes?.length && p.job?.direction && p.job?.params) {
    return { direction: p.job.direction, params: p.job.params, hashes: p.frameHashes, source: 'provenance.json frameHashes', preroll: p.job.params.preroll ?? 1 };
  }
  if (ctx.legacy?.id === 'my-brain-at-2am-v2' && ctx.legacy.sequentialGolden) {
    const g = JSON.parse(fs.readFileSync(studioPath(ctx.legacy.sequentialGolden), 'utf8'));
    return {
      direction: 'my-brain-at-2am-v2', hashes: g.hashes, source: `${ctx.legacy.sequentialGolden} (in-order reference; its re-encode is the approved H.264 stream)`,
      params: { width: 1080, height: 1920, scale: 1, seed: 20261013, mark: null, textKeys: 'content', profile: 'exact', features: null }, preroll: 1,
    };
  }
  return null;
}

/**
 * Re-render and compare. → gate part { checks: { frames }, metrics }
 * opts: { frames (count), log }
 */
export async function runDeterminism(ctx, { frames = 3, log = () => {} } = {}) {
  const ref = referenceOf(ctx);
  if (!ref) return { checks: { frames: { status: 'not-run', detail: 'no recorded frame hashes to re-render against (no provenance.json frameHashes)' } }, metrics: {} };
  const pick = pickFrames(ctx.videoSha256, ref.hashes.length, frames);
  const { withHeavyLock } = await import('../../render/lib/heavy-lock.mjs');
  const { EngineSession, topDownSha256 } = await import('../../render/worker.mjs');
  return withHeavyLock({ mode: 'shared', label: `qa determinism ${ctx.label}` }, async () => {
    const t0 = process.hrtime.bigint();
    const session = await EngineSession.start({ log });
    const results = [];
    try {
      for (const i of pick) {
        const p = { ...ref.params, direction: ref.direction };
        const { page, info } = await session.openPage(p);
        try {
          const bytes = info.width * info.height * 4;
          let got = null;
          const sink = session.server.addSink(async (k, buf) => { if (k === i) got = topDownSha256(buf, info.width, info.height); }, { bytes });
          try {
            await page.evaluate(([a, n]) => window.__engine.prime(a, n), [i, ref.preroll]);
            await page.evaluate((k) => window.__engine.render(k), i);
            await page.evaluate((u) => window.__engine.readback(u), sink.url(i));
            await page.evaluate(() => window.__engine.flush());
          } finally {
            sink.close();
          }
          results.push({ frame: i, hash: got, expected: ref.hashes[i], identical: got === ref.hashes[i] });
        } finally {
          await page.close().catch(() => {});
        }
      }
    } finally {
      await session.close();
    }
    const bad = results.filter((r) => !r.identical);
    const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
    return {
      checks: {
        frames: {
          status: bad.length ? 'fail' : 'pass', value: results.length - bad.length, limit: results.length,
          detail: bad.length ? `frames ${bad.map((r) => r.frame).join(', ')} re-rendered with different RGBA hashes (reference: ${ref.source})`
            : `frames ${pick.join(', ')} re-rendered bit-identically (reference: ${ref.source})`,
        },
      },
      metrics: { frames: results, reference: ref.source, direction: ref.direction, profile: ref.params.profile ?? 'exact', seconds: Math.round(seconds * 10) / 10 },
    };
  });
}
