// hm proof — a few full-quality stills of a direction (the proof profile).
//
//   node cli/hm.mjs proof [direction] [--times 1.25,3.75,…] [--out dir]
//
// The proof profile renders with the final profile's settings (every WP-02
// optimisation at scale 1). Its frames do not depend on render history (face
// cache), so all stills come from one engine page, in any order. Default: 6
// stills at the middle of six equal parts of the film. Plan budget: <= 45 s for
// 6 stills, page setup included. Holds one shared heavy-lock slot.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STUDIO, assertWritable } from '../render/lib/paths.mjs';
import { withHeavyLock } from '../render/lib/heavy-lock.mjs';
import { encodePNG, flipRows } from '../render/lib/png.mjs';
import { EngineSession, outputSize } from '../render/worker.mjs';
import { PROFILES } from '../engine/render/profiles.js';

/** Default still times: the middles of `n` equal parts of a film of `duration` s. */
export const proofTimes = (duration, n = PROFILES.proof.stills) => Array.from({ length: n }, (_, k) => +(((k + 0.5) * duration) / n).toFixed(4));

/** → { dir, stills: [{ t, file }], ms: { total, setup, render } } */
export async function proof({ direction = 'my-brain-at-2am-v2', times = null, out = null, log = console.log } = {}) {
  const t0 = performance.now();
  const p = { direction, width: 1080, height: 1920, scale: PROFILES.proof.scale, seed: 20261013, profile: 'proof' };
  const dir = assertWritable(out || path.join(STUDIO, 'runs', 'proof', direction.replace(/[^a-z0-9.-]+/gi, '-')));
  fs.mkdirSync(dir, { recursive: true });
  return withHeavyLock({ mode: 'shared', label: `proof ${direction}` }, async () => {
    const session = await EngineSession.start({ log: (m) => log(`[proof] ${m}`) });
    try {
      const { page, info } = await session.openPage(p);
      const { width, height } = outputSize(p);
      const ts = times || proofTimes(info.duration);
      let buf = null;
      const sink = session.server.addSink((_, b) => { buf = b; }, { bytes: width * height * 4 });
      const t1 = performance.now();
      const stills = [];
      for (const want of ts) {
        if (!(want >= 0 && want < info.duration)) throw new Error(`still time ${want} is outside the film (0..${info.duration})`);
        // A still is a film frame: the nearest one, so it matches the render of that frame.
        const frame = Math.min(info.frames - 1, Math.round(want * info.fps)), t = frame / info.fps;
        await page.evaluate((i) => window.__engine.render(i), frame);
        await page.evaluate((u) => window.__engine.readback(u), sink.url(0));
        await page.evaluate(() => window.__engine.flush());
        const file = path.join(dir, `proof-f${String(frame).padStart(4, '0')}.png`);
        fs.writeFileSync(file, encodePNG({ width, height, data: flipRows(Buffer.from(buf), width, height) }));
        stills.push({ t, frame, file });
      }
      sink.close();
      const t2 = performance.now();
      const res = { dir, direction, profile: 'proof', stills, ms: { total: Math.round(t2 - t0), setup: Math.round(t1 - t0), render: Math.round(t2 - t1) } };
      fs.writeFileSync(path.join(dir, 'proof.json'), JSON.stringify(res, null, 1) + '\n');
      return res;
    } finally {
      await session.close();
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { confine } = await import('../render/lib/write-jail.mjs');
  await confine();
  const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : null; };
  const times = opt('times') ? opt('times').split(',').map(Number) : null;
  proof({ direction: argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--')), times, out: opt('out') })
    .then((r) => console.log(`${r.stills.length} stills in ${(r.ms.total / 1000).toFixed(1)} s → ${r.dir}`))
    .catch((e) => { console.error(`proof: ${e.message}`); process.exitCode = 1; });
}
