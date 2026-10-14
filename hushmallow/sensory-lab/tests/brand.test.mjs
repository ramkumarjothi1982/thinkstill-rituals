// The product owner's rule: the brand is always written "hushmallow" with a
// small h, in every string, title, label, comment and doc of the lab.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAB = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAPITAL = new RegExp('H' + 'ushmallow');          // spelt in two parts so this file passes its own check
const TEXT = /\.(js|mjs|cjs|html|css|md|sql|json)$/;
const SKIP = /^docs\/phase\d\//;                         // generated results and screenshots

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (TEXT.test(name)) yield p;
  }
}

test('the brand is written with a small h everywhere in the lab', () => {
  const hits = [];
  for (const p of files(LAB)) {
    const rel = relative(LAB, p).split('\\').join('/');
    if (SKIP.test(rel)) continue;
    readFileSync(p, 'utf8').split('\n').forEach((line, i) => { if (CAPITAL.test(line)) hits.push(`${rel}:${i + 1}`); });
  }
  assert.deepEqual(hits, [], `write "hushmallow" with a small h: ${hits.join(', ')}`);
});
