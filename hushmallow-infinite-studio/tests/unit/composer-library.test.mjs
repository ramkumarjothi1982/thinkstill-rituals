// Library data owned by the composer: the Noomi pack, the Moonmilk Cove preset
// and the tuning matrix: schemas, measured values re-measured, v2 values kept,
// move versions current.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { studioPath } from '../../render/lib/paths.mjs';
import { validateSchema } from '../../planner/spec-schema.mjs';
import { decodePNG } from '../../render/lib/png.mjs';
import { loadGoldenV2 } from '../../tools/golden/compare.mjs';
import { makePalette } from '../../composer/palette.js';
import { moveVersions } from '../../composer/versions.mjs';
import { TUNABLE, MOVES } from '../../composer/moves/index.js';

const read = (rel) => JSON.parse(fs.readFileSync(studioPath(rel), 'utf8'));
const schema = (name) => read(`composer/schemas/${name}.schema.json`);
const pack = read('library/mallows/noomi.json');
const realm = read('library/realms/moonmilk-cove.json');
const matrix = read('library/tuning-matrix.json');
const golden = loadGoldenV2();

test('pack, preset and matrix validate against their schemas', () => {
  assert.deepEqual(validateSchema(pack, schema('mallow-pack')), []);
  assert.deepEqual(validateSchema(realm, schema('realm-preset')), []);
  assert.deepEqual(validateSchema(matrix, schema('tuning-matrix')), []);
});

test('the pack records the art it was measured on, and the silhouette re-measures exactly from the PNG', () => {
  for (const [k, sha] of Object.entries(pack.art.sha256)) {
    const got = crypto.createHash('sha256').update(fs.readFileSync(studioPath(pack.art[k]))).digest('hex');
    assert.equal(got, sha, k);
  }
  const { width: W, height: H, data: d } = decodePNG(fs.readFileSync(studioPath(pack.art.pristine)));
  assert.deepEqual([W, H], pack.art.size);
  // engine/stage.js silhouette(): alpha > 128, rows/columns count when ≥ 4 % solid
  const cols = new Uint32Array(W), rows = new Uint32Array(H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 128) { cols[x]++; rows[y]++; }
  let x0 = 0, x1 = W - 1, y0 = 0, y1 = H - 1;
  while (x0 < x1 && cols[x0] < H * 0.04) x0++;
  while (x1 > x0 && cols[x1] < H * 0.04) x1--;
  while (y0 < y1 && rows[y0] < W * 0.04) y0++;
  while (y1 > y0 && rows[y1] < W * 0.04) y1--;
  const { sha256, ...sil } = pack.measured.silhouette;
  assert.deepEqual(sil, { x0, x1, top: y0, baseY: y1, cx: (x0 + x1) / 2, halfW: (x1 - x0) / 2, w: x1 - x0, h: y1 - y0 });
  assert.equal(sha256, pack.art.sha256.pristine);
  // and it is the body box v2's state carried
  assert.deepEqual(golden.states[0].S.mallow.bodyBox, [sil.cx, sil.baseY, sil.halfW, sil.h]);
});

test('placement, light and world constants are v2\'s', () => {
  const S0 = golden.states[0].S;
  assert.deepEqual([pack.placement.baseX, pack.placement.baseY], [S0.world.contact[0], S0.world.contactY]);
  assert.equal(realm.constants.world.horizonY, S0.world.horizonY);
  assert.deepEqual([realm.tods['late-night'].celestial.x, realm.tods['late-night'].celestial.y, realm.tods['late-night'].celestial.r], S0.world.moon);
  assert.deepEqual(realm.tods['late-night'].light.dir, S0.mallow.light.dir);
  assert.equal(pack.light.sss, S0.mallow.light.sss);
  for (const k of ['fresnel', 'reflAmt']) assert.equal(realm.constants.world[k], S0.world[k]);
  for (const k of ['bloom', 'bloomThresh', 'contrast', 'grain']) assert.equal(realm.post[k], S0.post[k]);
});

test('the palette triple reproduces v2\'s world colours (to Node\'s Math.pow; the page is bit-exact, tests/parity)', () => {
  const pal = makePalette(realm.tods['late-night'].palette);
  let worst = 0;
  for (const r of golden.states.filter((_, i) => i % 7 === 0)) {
    const P = pal(r.S.audio.cold, r.S.audio.warm);
    for (const k of ['zenith', 'high', 'horizon', 'haze', 'moonCol', 'cloudLit', 'waterFar']) for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(P[k][c] - r.S.world[k][c]));
    assert.equal(P.n.exposure, r.S.post.exposure);
    assert.deepEqual(P.shadowTint, r.S.post.shadowTint);
  }
  assert.ok(worst < 1e-15, `max |Δ| ${worst}`);
});

test('every tunable move has a Noomi cell; cell tuning sits inside its approved ranges; capabilities agree', () => {
  for (const id of TUNABLE) {
    const cell = matrix[id]?.cells?.noomi;
    assert.ok(cell, `${id} × noomi`);
    assert.equal(cell.status, 'approved');
    for (const [k, v] of Object.entries(cell.tuning)) {
      assert.ok(k in MOVES[id].params, `${id}.${k} is a declared param`);
      const r = cell.ranges[k];
      if (typeof v === 'number') assert.ok(r && v >= r[0] && v <= r[1], `${id}.${k}`);
    }
  }
  const caps = read('library/capabilities.json');
  for (const [id, m] of Object.entries(caps.moves)) for (const [mallow, st] of Object.entries(m.cells)) {
    if (st === 'approved' || st === 'candidate') assert.ok(matrix[id]?.cells?.[mallow], `capabilities enable ${id} × ${mallow}; the matrix must hold that cell`);
  }
});

test('move versions in the matrix are current (a changed move output demotes its cells: update the matrix with them)', async () => {
  const now = await moveVersions();
  for (const [id, v] of Object.entries(now)) assert.equal(matrix[id].version, v, `${id}: matrix version is stale; its cells must drop to candidate and be re-approved`);
});
