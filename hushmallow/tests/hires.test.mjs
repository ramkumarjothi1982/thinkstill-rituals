// High-res Mallow rigs (W7): the patch table in src/mallows/hires.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MALLOWS, MALLOW_IDS, SPRITES } from '../src/mallows/registry.js';
import { HIRES, HIRES_VERIFIED, applyHires, hiresMallow } from '../src/mallows/hires.js';

// width/height from a WebP header (VP8X, VP8L or VP8)
function webpSize(path) {
  const b = readFileSync(path);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', path);
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', path);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8L') {
    const v = b.readUInt32LE(21);
    return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)];
  }
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  throw new Error(`unknown WebP chunk ${kind}`);
}

const path = (url) => fileURLToPath(url);

test('every Mallow has a high-res rig whose files exist', () => {
  assert.deepEqual(Object.keys(HIRES).sort(), [...MALLOW_IDS].sort());
  for (const [id, h] of Object.entries(HIRES)) {
    for (const f of [h.file, h.body, ...Object.values(h.sprites)]) assert.ok(existsSync(path(f)), `${id}: ${f}`);
    assert.match(h.file, /mallows-hires\/.+\.webp$/);
    assert.match(h.body, /rig-hires\/.+-body\.webp$/);
  }
});

test('art, body and logical size agree (res = art px per logical px)', () => {
  for (const [id, h] of Object.entries(HIRES)) {
    const art = webpSize(path(h.file));
    assert.deepEqual(webpSize(path(h.body)), art, `${id} body matches the cut-out`);
    assert.ok(Math.max(...art) === 1024, `${id} is 1024 px on its long side`);
    assert.ok(h.res > 2 && h.res < 3, `${id} res ${h.res}`);
    assert.ok(Math.abs(h.size[0] * h.res - art[0]) < 1 && Math.abs(h.size[1] * h.res - art[1]) < 1, `${id} size`);
    const [x0, y0, x1, y1] = h.bodyBox;
    assert.ok(x0 >= 0 && y0 >= 0 && x1 <= h.size[0] && y1 <= h.size[1] && x1 - x0 > h.size[0] * 0.9, `${id} bodyBox`);
  }
});

test('face specs keep every key the rig reads, with geometry on the body', () => {
  for (const [id, h] of Object.entries(HIRES)) {
    const old = MALLOWS[id].face, f = h.face;
    assert.equal(f.eyeStyle, old.eyeStyle);
    for (const side of ['L', 'R']) {
      for (const k of Object.keys(old.eyes[side])) assert.ok(k in f.eyes[side], `${id} eye ${side}.${k}`);
      for (const k of Object.keys(old.brows[side])) assert.ok(k in f.brows[side], `${id} brow ${side}.${k}`);
      const e = f.eyes[side];
      assert.ok(e.x > 0 && e.x < h.size[0] && e.y > 0 && e.y < h.size[1], `${id} eye ${side} inside`);
      const key = e.iris || e.sprite;
      assert.ok(h.sprites[key], `${id} sprite ${key}`);
      const [cx, cy, r] = f.cheeks[side];
      assert.ok(cx > 0 && cx < h.size[0] && cy > 0 && cy < h.size[1] && r > 0, `${id} cheek ${side}`);
    }
    for (const k of Object.keys(old.mouth)) assert.ok(k in f.mouth, `${id} mouth.${k}`);
    // left features left of right features, mouth below the eyes
    assert.ok(f.eyes.L.x < f.eyes.R.x && f.mouth.y > f.eyes.L.y && f.mouth.y > f.eyes.R.y, `${id} layout`);
    assert.equal(typeof f.neutral, 'object');
  }
});

test('Glitzi carries its own iris and re-measured glitch rows', () => {
  const g = HIRES.glitzi;
  assert.equal(g.glitchRows.length, 9);
  assert.ok(g.glitchRows.every((y, i, a) => y > 0 && y < g.size[1] && (i === 0 || y > a[i - 1])));
  assert.equal(g.face.eyes.L.iris, 'hires:glitzi-iris-L');
  assert.equal(g.face.eyes.R.iris, 'hires:glitzi-iris-R');
  assert.equal(g.face.eyes.L.lw, 6);
  // Zuzu's spirals are drawn at native px / res: spriteR matches the file
  for (const s of ['L', 'R']) {
    const z = HIRES.zuzu.face.eyes[s];
    const w = webpSize(path(HIRES.zuzu.sprites[z.sprite]))[0];
    assert.ok(Math.abs(w / 2 / HIRES.zuzu.res - z.spriteR) < 0.1, `zuzu spriteR ${s}`);
  }
});

test('hiresMallow copies; applyHires switches in place, once, and only the ids asked', () => {
  const base = MALLOWS.zuzu;
  const before = JSON.stringify(base);
  const z = hiresMallow(base);
  assert.equal(JSON.stringify(base), before, 'base untouched');
  assert.equal(z.id, 'zuzu');
  assert.equal(z.name, base.name);
  assert.ok(z.hires && z.res === HIRES.zuzu.res);
  z.face.eyes.L.x = -1;
  assert.notEqual(HIRES.zuzu.face.eyes.L.x, -1, 'face is a deep copy');

  const mallows = structuredClone({ glitzi: MALLOWS.glitzi, zuzu: MALLOWS.zuzu, noomi: MALLOWS.noomi });
  const sprites = { ...SPRITES };
  assert.deepEqual(applyHires(mallows, sprites, ['glitzi', 'nobody']), ['glitzi']);
  assert.equal(mallows.glitzi.file, HIRES.glitzi.file);
  assert.equal(mallows.glitzi.voice.hello[0], MALLOWS.glitzi.voice.hello[0], 'personality kept');
  assert.equal(mallows.zuzu.file, MALLOWS.zuzu.file, 'others untouched');
  assert.ok(sprites['hires:glitzi-iris-L'] && sprites['iris-amber'], 'sprites added, none removed');
  const once = JSON.stringify(mallows.glitzi);
  applyHires(mallows, sprites, ['glitzi']);
  assert.equal(JSON.stringify(mallows.glitzi), once, 'idempotent');
  assert.ok(HIRES_VERIFIED.every((id) => HIRES[id]), 'verified ids are known');
});
