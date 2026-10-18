// The original Mallow art ships as lossless WebP twins (tools/art-webp.py): the PNGs in assets/mallows/ and
// assets/rig/ stay the source of truth, the app loads <name>.webp beside each one, which decodes to exactly the
// same RGBA pixels (the generator checks every pixel) in about a quarter fewer bytes.
// Kept true here: the registry names only twins, every twin is lossless (VP8L) and is the one tools/art-webp.json
// recorded for its PNG as it is now (a PNG changed without re-running the generator, or a twin edited by hand,
// fails), and every PNG has one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'tools/art-webp.json'), 'utf8'));
const sha = (p) => createHash('sha256').update(readFileSync(join(root, p))).digest('hex');
const FOLDERS = ['assets/mallows', 'assets/rig'];

test('the registry loads the WebP twins, never the PNGs', async () => {
  const src = readFileSync(join(root, 'src/mallows/registry.js'), 'utf8');
  const named = [...src.matchAll(/\bA\('([^']+)'\)/g)].map((m) => m[1]);
  assert.equal(named.length, 22, 'seven cut-outs, seven bodies, eight sprites');
  for (const n of named) {
    assert.match(n, /^(mallows|rig)\/[a-z-]+(-[LR])?\.webp$/, n);
    assert.ok(manifest[`assets/${n}`], `${n} is a twin tools/art-webp.py wrote`);
  }
  const { MALLOWS, SPRITES } = await import('../src/mallows/registry.js');
  const urls = [...Object.values(MALLOWS).flatMap((m) => [m.file, m.body, m.art].filter(Boolean)), ...Object.values(SPRITES)];
  for (const u of urls) assert.doesNotMatch(u, /\.png$/, u);
  for (const id of ['pipzi', 'loomi']) assert.match(MALLOWS[id].file, new RegExp(`/assets/mallows/${id}\\.webp$`), `${id} (original drawing)`);
});

test('every PNG of the original art has its lossless twin, recorded for the PNG as it is now', () => {
  const pngs = FOLDERS.flatMap((d) => readdirSync(join(root, d)).filter((f) => f.endsWith('.png')).map((f) => `${d}/${f}`));
  assert.equal(pngs.length, 22);
  assert.deepEqual(Object.keys(manifest).sort(), pngs.map((p) => p.replace(/\.png$/, '.webp')).sort(), 'one twin per PNG, nothing else');
  for (const png of pngs) {
    const webp = png.replace(/\.png$/, '.webp');
    const rec = manifest[webp];
    assert.ok(existsSync(join(root, webp)), `${webp} exists`);
    assert.equal(rec.from, png);
    assert.equal(rec.png_sha256, sha(png), `${png} changed since its twin was written: run python3 hushmallow/tools/art-webp.py`);
    assert.equal(rec.webp_sha256, sha(webp), `${webp} is not the twin tools/art-webp.py wrote: run it again`);
    const b = readFileSync(join(root, webp));
    assert.equal(b.toString('latin1', 0, 4), 'RIFF', webp);
    assert.equal(b.toString('latin1', 8, 16), 'WEBPVP8L', `${webp} is lossless (VP8L), one image chunk, no colour profile`);
    assert.equal(b.readUInt32LE(4) + 8, b.length, `${webp}: whole`);
    assert.ok(rec.webp_bytes < rec.png_bytes, `${webp} is smaller than its PNG`);
  }
  const total = (k) => Object.values(manifest).reduce((a, r) => a + r[k], 0);
  assert.ok(total('webp_bytes') < 0.8 * total('png_bytes'), 'a fifth or more fewer bytes overall');
});
