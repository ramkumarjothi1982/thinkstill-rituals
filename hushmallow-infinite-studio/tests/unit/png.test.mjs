import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { encodePNG, decodePNG, flipRows } from '../../render/lib/png.mjs';
import { sha256 } from '../../render/lib/tree-hash.mjs';

function gradient(w, h) {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    data[o] = (x * 7) & 255; data[o + 1] = (y * 13) & 255; data[o + 2] = (x * y) & 255; data[o + 3] = 255 - ((x + y) & 127);
  }
  return data;
}

test('encode → decode is lossless and encoding is byte-reproducible', () => {
  const img = { width: 37, height: 23, data: gradient(37, 23) };
  const a = encodePNG(img), b = encodePNG(img);
  assert.equal(sha256(a), sha256(b));
  const back = decodePNG(a);
  assert.equal(back.width, 37);
  assert.equal(back.height, 23);
  assert.ok(back.data.equals(img.data));
});

test('decodes ffmpeg-written RGB and RGBA PNGs (other filters, other encoders) to the same pixels', () => {
  const d = mkWorkTemp('png-');
  try {
    const img = { width: 64, height: 40, data: gradient(64, 40) };
    const src = path.join(d, 'src.png');
    fs.writeFileSync(src, encodePNG(img));
    for (const [fmt, alpha] of [['rgba', true], ['rgb24', false]]) {
      const out = path.join(d, `ff-${fmt}.png`);
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-pix_fmt', fmt, '-pred', 'mixed', out]);
      const got = decodePNG(fs.readFileSync(out));
      for (let i = 0; i < img.data.length; i += 4) {
        assert.equal(got.data[i], img.data[i]); assert.equal(got.data[i + 1], img.data[i + 1]); assert.equal(got.data[i + 2], img.data[i + 2]);
        assert.equal(got.data[i + 3], alpha ? img.data[i + 3] : 255);
      }
    }
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('flipRows reverses row order and is its own inverse', () => {
  const w = 3, h = 4, data = gradient(w, h);
  const f = flipRows(data, w, h);
  assert.ok(f.subarray(0, w * 4).equals(data.subarray((h - 1) * w * 4)));
  assert.ok(flipRows(f, w, h).equals(data));
});

test('rejects wrong buffer sizes and non-PNG input', () => {
  assert.throws(() => encodePNG({ width: 2, height: 2, data: Buffer.alloc(3) }), /expected 16 bytes/);
  assert.throws(() => decodePNG(Buffer.from('hello world, not a png')), /not a PNG/);
});
