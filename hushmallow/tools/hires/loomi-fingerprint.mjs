// What the recorded Loomi sweep (data/loomi-sweep.json) was run against: a
// SHA-256 of Loomi's table entry (asset URLs as paths under assets/) and of
// its art, thumbnail, body and iris files. tests/hires.test.mjs compares it,
// so a changed table or image fails until the sweep is re-run and recorded:
//   node tools/hires/loomi-fingerprint.mjs      (prints it)
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HIRES } from '../../src/mallows/hires.js';

export function loomiFingerprint() {
  const h = HIRES.loomi;
  const rel = (u) => u.split('/assets/').pop();
  const files = [h.art, h.file, h.body, ...Object.values(h.sprites)];
  const sha = createHash('sha256');
  sha.update(JSON.stringify({ ...h, file: rel(h.file), art: rel(h.art), body: rel(h.body),
    sprites: Object.fromEntries(Object.entries(h.sprites).map(([k, v]) => [k, rel(v)])) }));
  for (const f of files) sha.update(readFileSync(fileURLToPath(f)));
  return sha.digest('hex');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(loomiFingerprint());
