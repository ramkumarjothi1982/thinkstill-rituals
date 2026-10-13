// Minimal, dependency-free PNG codec for 8-bit RGBA / RGB images.
//
// Golden frames must be lossless and byte-reproducible, so we encode them
// ourselves (fixed filter + fixed zlib level) instead of relying on a
// browser's PNG encoder. The decoder reads any non-interlaced 8-bit
// greyscale/RGB/RGBA PNG (all five row filters), which covers our own files,
// Chromium screenshots and ffmpeg's -c:v png output.
//
//   encodePNG({ width, height, data })          data: RGBA, top-down rows → Buffer
//   decodePNG(buf) → { width, height, data }    data: RGBA, top-down rows
//   flipRows(data, width, height)               bottom-up (WebGL readPixels) ↔ top-down

import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const tb = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body, zlib.crc32(tb)) >>> 0);
  return Buffer.concat([len, tb, body, crc]);
}

/** Encode RGBA (top-down) as PNG. Filter 1 (Sub) on every row, zlib level 6: deterministic. */
export function encodePNG({ width, height, data }) {
  if (data.length !== width * height * 4) throw new Error(`encodePNG: expected ${width * height * 4} bytes, got ${data.length}`);
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1), s = y * stride;
    raw[o] = 1;                                       // Sub
    for (let x = 0; x < stride; x++) raw[o + 1 + x] = (data[s + x] - (x >= 4 ? data[s + x - 4] : 0)) & 0xff;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8-bit RGBA, no interlace
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Decode a non-interlaced 8-bit grey / grey+alpha / RGB / RGBA PNG to RGBA (top-down). */
export function decodePNG(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('decodePNG: not a PNG');
  let off = 8, width = 0, height = 0, ctype = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4); ctype = body[9];
      if (body[8] !== 8 || body[12] !== 0 || ![0, 2, 4, 6].includes(ctype)) throw new Error('decodePNG: only 8-bit non-interlaced grey/RGB/RGBA');
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype];
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let p;
      if (f === 0) p = 0;
      else if (f === 1) p = a;
      else if (f === 2) p = b;
      else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else throw new Error(`decodePNG: bad filter ${f}`);
      cur[x] = (line[x] + p) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4, s = x * bpp;
      if (ctype === 6) { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = cur[s + 3]; }
      else if (ctype === 2) { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = 255; }
      else if (ctype === 4) { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = cur[s + 1]; }
      else { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = 255; }
    }
    cur.copy(prev);
  }
  return { width, height, data: out };
}

/** Reverse the row order (WebGL readPixels is bottom-up; PNG and ffmpeg are top-down). */
export function flipRows(data, width, height) {
  const stride = width * 4;
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < height; y++) Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(out, (height - 1 - y) * stride);
  return out;
}
