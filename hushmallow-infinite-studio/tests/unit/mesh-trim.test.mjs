// The P7 mesh trim (engine/renderer/passes/normals.js trimmedIndex): which grid
// cells can show anything. Pure logic, no browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimmedIndex } from '../../engine/renderer/passes/normals.js';

/** A w×h alpha raster, opaque inside [x0, x1) × [y0, y1). */
function alpha(w, h, [x0, y0, x1, y1]) {
  const a = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) a[y * w + x] = 255;
  return { a, w, h };
}
const cells = (idx) => idx.length / 6;

test('cells with no opaque texel within the margin are dropped; the winding is gridMesh\'s', () => {
  const img = alpha(40, 40, [15, 15, 25, 25]);            // a 10 px square in the middle of a 4×4 grid of 10 px cells
  const idx = trimmedIndex(4, 4, [img], { margin: 0 });
  assert.equal(cells(idx), 4, 'the four cells the square touches');
  // first kept cell (1, 1): a = 1·5 + 1 = 6 → triangles (a, c, b), (b, c, d)
  assert.deepEqual([...idx.slice(0, 6)], [6, 11, 7, 7, 11, 12]);
  assert.equal(cells(trimmedIndex(4, 4, [img], { margin: 6 })), 16, 'a margin wider than the gap keeps every cell');
});

test('any raster counts (art or pristine), keep boxes are always drawn, a blank raster drops everything', () => {
  const blank = alpha(40, 40, [0, 0, 0, 0]);
  assert.equal(cells(trimmedIndex(4, 4, [blank], { margin: 0 })), 0);
  assert.equal(cells(trimmedIndex(4, 4, [blank, alpha(40, 40, [0, 0, 5, 5])], { margin: 0 })), 1);
  assert.equal(cells(trimmedIndex(4, 4, [blank], { margin: 0, keep: [[31, 31, 39, 39]] })), 1, 'the face box cell');
});
