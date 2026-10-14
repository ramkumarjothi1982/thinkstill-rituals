// The rest test of engine/dev/rest-test.html, for both face renderers (WP-02
// criterion: "the rest-test diff is no worse than baseline").
//
//   node cli/hm.mjs … (run through the write jail): node render/lib/write-jail.mjs -- node tools/perf/rest-test.mjs
//
// At the loop's rest windows the render cross-fades between the untouched
// painting (noomi-art.png) and the cleaned body + the procedural neutral face.
// The dev page measures how far apart those two states are: the mean absolute
// RGB difference over the art (and, here, inside the face box too). This tool
// computes it for the approved face (exact profile: Face.draw) and the final
// profile's face (the quantised neutral pose drawn with the fast tubes).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORK } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { EngineSession } from '../../render/worker.mjs';

export async function restTest() {
  return withHeavyLock({ mode: 'shared', label: 'rest-test' }, async () => {
    const session = await EngineSession.start();
    try {
      const { page } = await session.openPage({ direction: 'my-brain-at-2am-v2', width: 1080, height: 1920, scale: 1, seed: 20261013 });
      return await page.evaluate(async () => {
        const base = location.pathname.replace(/engine\/index\.html$/, '');
        const { MALLOWS } = await import('/hushmallow/src/mallows/registry.js');
        const { Face, specFromDerived } = await import(`${base}engine/face.js`);
        const { FaceQuantiser } = await import(`${base}engine/face/cache.js`);
        const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
        const art = await load(`${base}assets/noomi/noomi-art.png`);
        const clean = await load(`${base}assets/noomi/noomi-clean.png`);
        const spec = specFromDerived(await (await fetch(`${base}assets/noomi/noomi-face.json`)).json(), MALLOWS.noomi.face);
        const W = art.width, H = art.height;
        const pixels = (draw) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); draw(g); return g.getImageData(0, 0, W, H).data; };
        const pa = pixels((g) => g.drawImage(art, 0, 0));
        const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
        // exact: the approved draw of the neutral pose
        const exact = new Face(spec, mk());
        exact.draw({});
        // final: the cache's quantised neutral pose, fast tubes, placed back at the face box
        const fast = new Face(spec, mk());
        const q = new FaceQuantiser(spec).quantise({});
        const boxCanvas = fast.render(q.P, { fast: true });
        const [x0, y0, x1, y1] = fast.box;
        const diff = (faceDraw) => {
          const pb = pixels((g) => { g.drawImage(clean, 0, 0); faceDraw(g); });
          let sum = 0, n = 0, fsum = 0, fn = 0;
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const k = (y * W + x) * 4, inBox = x >= x0 && x < x1 && y >= y0 && y < y1;
              for (let ch = 0; ch < 3; ch++) { const d = Math.abs(pa[k + ch] - pb[k + ch]); sum += d; n++; if (inBox) { fsum += d; fn++; } }
            }
          }
          return { meanDiff: sum / n, faceBoxMeanDiff: fsum / fn };
        };
        return {
          box: fast.box,
          exact: diff((g) => g.drawImage(exact.canvas, 0, 0)),
          final: diff((g) => g.drawImage(boxCanvas, x0, y0)),
        };
      });
    } finally {
      await session.close();
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await restTest();
  const out = path.join(WORK, 'wp02', 'rest-test.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r, null, 1));
  console.log(`final ${r.final.meanDiff <= r.exact.meanDiff ? 'no worse than' : 'WORSE than'} exact (whole art), face box: ${r.final.faceBoxMeanDiff <= r.exact.faceBoxMeanDiff ? 'no worse' : 'WORSE'}`);
}
