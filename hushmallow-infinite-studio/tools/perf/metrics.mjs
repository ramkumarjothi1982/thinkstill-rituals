// Image metrics for the WP-02 pixel gates (G-PIXEL, final profile against exact):
// full-frame PSNR over RGB, and PSNR / SSIM inside a box (the face box).
//
// Images are RGBA Uint8 buffers, top-down rows, all the same size. SSIM is the
// standard Wang et al. index on BT.709 luma: an 11-tap Gaussian window (σ 1.5),
// K1 = 0.01, K2 = 0.03, L = 255, averaged over the box's valid window centres.

/** PSNR (dB) over the R, G, B channels of a box [x0, y0, x1, y1) (default: the whole frame). Infinity when equal. */
export function psnr(a, b, width, height, box = [0, 0, width, height]) {
  if (a.length !== b.length || a.length !== width * height * 4) throw new Error('psnr: size mismatch');
  const [x0, y0, x1, y1] = clampBox(box, width, height);
  let se = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0, o = (y * width + x0) * 4; x < x1; x++, o += 4) {
      const dr = a[o] - b[o], dg = a[o + 1] - b[o + 1], db = a[o + 2] - b[o + 2];
      se += dr * dr + dg * dg + db * db;
      n += 3;
    }
  }
  if (se === 0) return Infinity;
  return 10 * Math.log10((255 * 255) / (se / n));
}

/** Largest per-channel |Δ| (RGB) and the share of pixels that differ at all. */
export function diffSummary(a, b) {
  let max = 0, px = 0;
  for (let o = 0; o < a.length; o += 4) {
    const d = Math.max(Math.abs(a[o] - b[o]), Math.abs(a[o + 1] - b[o + 1]), Math.abs(a[o + 2] - b[o + 2]));
    if (d) { px++; if (d > max) max = d; }
  }
  return { maxAbs: max, differingPixels: px, differingShare: px / (a.length / 4) };
}

export function clampBox([x0, y0, x1, y1], width, height) {
  const c = (v, hi) => Math.max(0, Math.min(hi, Math.round(v)));
  return [c(x0, width), c(y0, height), c(x1, width), c(y1, height)];
}

/** BT.709 luma of a box as Float64Array (w*h). */
function luma(img, width, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0, out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = ((y + y0) * width + x + x0) * 4;
      out[y * w + x] = 0.2126 * img[o] + 0.7152 * img[o + 1] + 0.0722 * img[o + 2];
    }
  }
  return out;
}

const GAUSS = (() => {
  const r = 5, s = 1.5, k = [];
  for (let i = -r; i <= r; i++) k.push(Math.exp(-(i * i) / (2 * s * s)));
  const sum = k.reduce((a, b) => a + b, 0);
  return k.map((v) => v / sum);
})();

/** Separable Gaussian filter, 'valid' region only: (w-10) x (h-10). */
function filter(src, w, h) {
  const r = 5, vw = w - 2 * r, vh = h - 2 * r;
  const tmp = new Float64Array(vw * h), out = new Float64Array(vw * vh);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < vw; x++) {
      let s = 0;
      for (let k = 0; k <= 2 * r; k++) s += GAUSS[k] * src[y * w + x + k];
      tmp[y * vw + x] = s;
    }
  }
  for (let y = 0; y < vh; y++) {
    for (let x = 0; x < vw; x++) {
      let s = 0;
      for (let k = 0; k <= 2 * r; k++) s += GAUSS[k] * tmp[(y + k) * vw + x];
      out[y * vw + x] = s;
    }
  }
  return out;
}

/** Mean SSIM (luma) inside a box. 1 when equal. */
export function ssim(a, b, width, height, box = [0, 0, width, height]) {
  const bx = clampBox(box, width, height);
  const w = bx[2] - bx[0], h = bx[3] - bx[1];
  if (w < 11 || h < 11) throw new Error(`ssim: box ${bx.join(',')} smaller than the 11 px window`);
  const A = luma(a, width, bx), B = luma(b, width, bx);
  const sq = (X) => X.map((v) => v * v);
  const AB = A.map((v, i) => v * B[i]);
  const mA = filter(A, w, h), mB = filter(B, w, h);
  const sAA = filter(sq(A), w, h), sBB = filter(sq(B), w, h), sAB = filter(AB, w, h);
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  let total = 0;
  for (let i = 0; i < mA.length; i++) {
    const ma = mA[i], mb = mB[i];
    const va = sAA[i] - ma * ma, vb = sBB[i] - mb * mb, cov = sAB[i] - ma * mb;
    total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
  }
  return total / mA.length;
}

export const fmtDb = (v) => (Number.isFinite(v) ? v.toFixed(2) : '∞');
