// Small, synchronous, deterministic content hashes for in-page cache keys.
//
// The renderer keys its text-texture cache by what a canvas actually shows
// (R4: a key such as 'b0' must never hand a second direction the first one's
// texture). WebCrypto is asynchronous, and texture creation happens inside the
// synchronous setup API of the v2 contract, so this is a 64-bit mix of two
// 32-bit multiply-xorshift lanes (the cyrb53 construction) over 32-bit words.
// It is a cache key, not a security boundary.

/** 16 hex digits for the words of `u32` (a Uint32Array). */
export function hashWords(u32, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < u32.length; i++) {
    const w = u32[i];
    h1 = Math.imul(h1 ^ w, 2654435761);
    h2 = Math.imul(h2 ^ w, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Content key of a canvas: "<w>x<h>:<hash of its RGBA pixels>". Reads the
 * canvas through its own 2D context when it has one, otherwise through a
 * scratch copy (e.g. an image or a WebGL canvas).
 */
export function canvasKey(source) {
  const w = source.width, h = source.height;
  let ctx = typeof source.getContext === 'function' ? source.getContext('2d') : null;
  if (!ctx) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    ctx = c.getContext('2d');
    ctx.drawImage(source, 0, 0);
  }
  const data = ctx.getImageData(0, 0, w, h).data;
  return `${w}x${h}:${hashWords(new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2))}`;
}
