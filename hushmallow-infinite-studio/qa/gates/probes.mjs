// Reference probes for the brand gates: the LogoCard at full alpha (G-FINAL
// logo) and the corner mark (G-FINAL brand-marks), drawn in Chromium by the
// engine's own LogoCard and Marks classes (qa/gates/probe/), never re-drawn in
// Python, so a probe is exactly what an untouched overlay contains.
//
// A probe is cached under WORK/qa-cache/probes, keyed by the sha256 of every
// input that shapes it (the two engine modules, the logo file, the font, the
// probe page and the options), so the Chromium launch happens once per change.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STUDIO, REPO, WORK, assertWritable } from '../../render/lib/paths.mjs';
import { encodePNG } from '../../render/lib/png.mjs';

export const PROBE_CACHE = path.join(WORK, 'qa-cache', 'probes');
const INPUTS = [
  path.join(STUDIO, 'engine', 'type.js'),
  path.join(STUDIO, 'engine', 'runtime', 'marks.js'),
  path.join(STUDIO, 'qa', 'gates', 'probe', 'probe.js'),
  path.join(REPO, 'hushmallow', 'assets', 'source', 'brand', 'hushmallow-logo.webp'),
  path.join(REPO, 'hushmallow', 'assets', 'fonts', 'fredoka-latin.woff2'),
];

function inputsHash(extra) {
  const h = crypto.createHash('sha256');
  for (const f of INPUTS) h.update(f).update(fs.readFileSync(f));
  h.update(JSON.stringify(extra));
  return h.digest('hex').slice(0, 24);
}

/** Crop an RGBA buffer to the bounding box of alpha > 0. → { x, y, w, h, data } */
function cropAlpha(buf, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (buf[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, data = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) buf.copy(data, y * cw * 4, ((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4);
  return { x: x0, y: y0, w: cw, h: ch, data };
}

/**
 * Probes for one QA run. want: { logos: [{ id, opts, t }], marks: [{ label, k }] }
 * → { logos: [{ id, png, x, y, w, h, t }], marks: [{ label, k, png, x, y, w, h }], cached }
 */
export async function makeProbes(want, { log = () => {} } = {}) {
  const key = inputsHash(want);
  const dir = path.join(PROBE_CACHE, key);
  const index = path.join(dir, 'probes.json');
  if (fs.existsSync(index)) return { ...JSON.parse(fs.readFileSync(index, 'utf8')), cached: true };
  fs.mkdirSync(assertWritable(dir), { recursive: true });
  const { startServer } = await import('../../render/serve.mjs');
  const { ENGINE_ARGS } = await import('../../render/worker.mjs');
  const { chromium } = await import('playwright');
  const server = await startServer(0);
  const browser = await chromium.launch({ args: [...ENGINE_ARGS] });
  const out = { key, logos: [], marks: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => log(`[probe] ${e.message}`));
    await page.goto(`http://127.0.0.1:${server.address().port}/${path.relative(REPO, STUDIO)}/qa/gates/probe/index.html`);
    await page.evaluate(() => window.__probe.ready);
    for (const l of want.logos || []) {
      const r = await page.evaluate(([o, t]) => window.__probe.logo(o, t), [l.opts, l.t]);
      const c = cropAlpha(Buffer.from(r.rgba, 'base64'), r.w, r.h);
      if (!c) throw new Error(`the LogoCard probe for ${l.id} at t=${l.t} drew nothing`);
      const png = path.join(dir, `logo-${l.id}.png`);
      fs.writeFileSync(png, encodePNG({ width: c.w, height: c.h, data: c.data }));
      out.logos.push({ id: l.id, t: l.t, png, x: c.x, y: c.y, w: c.w, h: c.h });
    }
    for (const m of want.marks || []) {
      const r = await page.evaluate(([label, k]) => window.__probe.mark(label, k), [m.label, m.k]);
      const png = path.join(dir, `mark-${m.label.replace(/[^A-Za-z]+/g, '_')}-${m.k}.png`);
      fs.writeFileSync(png, encodePNG({ width: r.w, height: r.h, data: Buffer.from(r.rgba, 'base64') }));
      out.marks.push({ label: m.label, k: m.k, png, x: r.x, y: r.y, w: r.w, h: r.h });
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
  fs.writeFileSync(index, JSON.stringify(out, null, 1));
  return { ...out, cached: false };
}
