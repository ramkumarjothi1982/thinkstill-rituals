// Hushflow compositor: the two on-screen canvases (#world back, #fx-layer
// front) and the melt between two worlds.
//
// Every world renders into its OWN layers (an opaque back below the Mallow
// and a transparent front above it). The compositor copies them on screen:
// one world → a straight copy; two worlds → a noise-mask melt that spreads
// outward from the shared horizon line with a molten seam (measured ≈2.3 ms
// a frame in the audit prototype). It never shows black: the back canvas is
// always filled with a world or with the palette backdrop.
//
// Mask (low-res, ~W/7 × H/7, upscaled ×3 then to full size with smoothing):
//   v(x, y) = 0.35·fbm(x/90, y/90) + 1.6·|y/H − hy/H|
//   M = clamp((1.6k − v) / 0.2)             1 = incoming visible (band widened from 0.12: smoother at cell scale)
// Seam: b = 1 − |M − 0.5|·2, added ('lighter') in mix(#7cf5ff → #ffd98a, k).
// No per-frame allocation: ImageData, scratch canvases and fields are made at resize.

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const BAND = 0.2;   // width of the melting edge in mask units (the audit's 0.12 stair-stepped at cell scale)
const hexRGB = (h) => { const s = String(h).replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// small value-noise fbm, evaluated only at resize
function noiseField(seed) {
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const G = new Float32Array(256 * 256);
  for (let i = 0; i < G.length; i++) G[i] = r() * 2 - 1;
  const at = (x, y) => G[((y & 255) << 8) | (x & 255)];
  const f = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = f(x - xi), v = f(y - yi);
    const a0 = at(xi, yi), b0 = at(xi + 1, yi), c0 = at(xi, yi + 1), d0 = at(xi + 1, yi + 1);
    return (a0 + (b0 - a0) * u) + ((c0 + (d0 - c0) * u) - (a0 + (b0 - a0) * u)) * v;
  };
  return (x, y) => n(x, y) * 0.6 + n(x * 2.03 + 17, y * 2.03 + 5) * 0.28 + n(x * 4.1 + 3, y * 4.1 + 41) * 0.12;
}

export function createCompositor({ backCanvas, frontCanvas }) {
  const gB = backCanvas.getContext('2d', { alpha: false });
  const gF = frontCanvas.getContext('2d');
  let W = 1, H = 1, dprB = 1, dprF = 1;
  let tmpB = null, tB = null, tmpF = null, tF = null;
  let mask = null, mg = null, mdata = null, seam = null, sg = null, sdata = null, mw = 0, mh = 0;
  let mask2 = null, m2g = null, seam2 = null, s2g = null;   // ×3 intermediate: a smoother edge than one bilinear step
  let fA = null, fB = null;
  let fallback = { sky: '#0b0e33', deep: '#05061f' }, fallbackGrad = null;
  let lastMode = 'none';

  function resize(w, h, { back = 1, front = 1 } = {}) {
    W = Math.max(1, Math.round(w)); H = Math.max(1, Math.round(h)); dprB = back; dprF = front;
    backCanvas.width = Math.round(W * dprB); backCanvas.height = Math.round(H * dprB);
    frontCanvas.width = Math.round(W * dprF); frontCanvas.height = Math.round(H * dprF);
    tmpB = makeCanvas(backCanvas.width, backCanvas.height); tB = tmpB.getContext('2d');
    tmpF = makeCanvas(frontCanvas.width, frontCanvas.height); tF = tmpF.getContext('2d');
    mw = Math.max(16, Math.round(W / 7)); mh = Math.max(16, Math.round(H / 7));
    mask = makeCanvas(mw, mh); mg = mask.getContext('2d'); mdata = mg.createImageData(mw, mh);
    seam = makeCanvas(mw, mh); sg = seam.getContext('2d'); sdata = sg.createImageData(mw, mh);
    mask2 = makeCanvas(mw * 3, mh * 3); m2g = mask2.getContext('2d'); m2g.imageSmoothingEnabled = true;
    seam2 = makeCanvas(mw * 3, mh * 3); s2g = seam2.getContext('2d'); s2g.imageSmoothingEnabled = true;
    const nA = noiseField(4242), nB = noiseField(977);
    fA = new Float32Array(mw * mh); fB = new Float32Array(mw * mh);
    for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) {
      const x = (i + 0.5) * (W / mw), y = (j + 0.5) * (H / mh);
      fA[j * mw + i] = nA(x / 90, y / 90); fB[j * mw + i] = nB(x / 90, y / 90);
    }
    fallbackGrad = null;
    lastMode = 'none';
  }

  function setFallback(p) { if (p) { fallback = { sky: p.sky || fallback.sky, deep: p.deep || fallback.deep }; fallbackGrad = null; } }

  /** The palette backdrop: what shows while the first world is still being prepared (never black). */
  function drawFallback() {
    gB.setTransform(dprB, 0, 0, dprB, 0, 0);
    gB.globalAlpha = 1; gB.globalCompositeOperation = 'source-over';
    if (!fallbackGrad) {
      fallbackGrad = gB.createLinearGradient(0, 0, 0, H);
      fallbackGrad.addColorStop(0, fallback.deep); fallbackGrad.addColorStop(0.55, fallback.sky); fallbackGrad.addColorStop(1, fallback.deep);
    }
    gB.fillStyle = fallbackGrad; gB.fillRect(0, 0, W, H);
  }

  function clearFront() { gF.setTransform(1, 0, 0, 1, 0, 0); gF.globalAlpha = 1; gF.globalCompositeOperation = 'source-over'; gF.clearRect(0, 0, frontCanvas.width, frontCanvas.height); }

  /** One world on screen. `alpha` < 1 fades it in over the palette backdrop (cold start). */
  function single(back, front, alpha = 1) {
    lastMode = 'single';
    if (!back || alpha < 1) drawFallback();
    if (back) {
      gB.setTransform(1, 0, 0, 1, 0, 0);
      gB.globalAlpha = clamp(alpha); gB.globalCompositeOperation = 'source-over';
      gB.drawImage(back, 0, 0, backCanvas.width, backCanvas.height);
      gB.globalAlpha = 1;
    }
    clearFront();
    if (front) { gF.globalAlpha = clamp(alpha); gF.drawImage(front, 0, 0, frontCanvas.width, frontCanvas.height); gF.globalAlpha = 1; }
  }

  function buildMask(k, hy, t, tintA, tintB) {
    const md = mdata.data, sd = sdata.data;
    const c = Math.cos(t * 0.23), s = Math.sin(t * 0.23);
    // v is offset to be ≥ 0, and the sweep scaled to reach its maximum: k = 0 shows only the
    // outgoing world, k = 1 only the incoming one (no pop at either end)
    const hyN = clamp(hy / H), vMax = 0.35 + 0.35 + 1.6 * Math.max(hyN, 1 - hyN);
    const k16 = (vMax + BAND) * k;
    const A = hexRGB(tintA), B = hexRGB(tintB);
    const tr = A[0] + (B[0] - A[0]) * k, tg = A[1] + (B[1] - A[1]) * k, tb = A[2] + (B[2] - A[2]) * k;
    for (let j = 0; j < mh; j++) {
      const dy = 1.6 * Math.abs((j + 0.5) / mh - hyN);
      for (let i = 0; i < mw; i++) {
        const q = j * mw + i;
        const v = 0.35 + 0.35 * clamp(fA[q] * c + fB[q] * s, -1, 1) + dy;
        const M = clamp((k16 - v) / BAND);
        const o = q * 4;
        md[o] = 0; md[o + 1] = 0; md[o + 2] = 0; md[o + 3] = Math.round(M * 255);
        const b = clamp(1 - Math.abs(M - 0.5) * 2);
        const hot = b * b * b;  // a whiter core in the middle of the seam
        sd[o] = tr + (255 - tr) * hot; sd[o + 1] = tg + (255 - tg) * hot; sd[o + 2] = tb + (255 - tb) * hot;
        sd[o + 3] = Math.round(Math.pow(b, 1.5) * 255);
      }
    }
    mg.putImageData(mdata, 0, 0);
    sg.putImageData(sdata, 0, 0);
    m2g.globalCompositeOperation = 'copy'; m2g.drawImage(mask, 0, 0, mask2.width, mask2.height);
    s2g.globalCompositeOperation = 'copy'; s2g.drawImage(seam, 0, 0, seam2.width, seam2.height);
  }

  /**
   * Melt `from` into `to` at k (0..1, already eased). from/to: { back, front } canvases.
   * opts: { horizonY (px), t (s, animates the noise), reduced, tintA, tintB, seam (0..1 strength) }
   */
  function melt(from, to, k, { horizonY = H * 0.655, t = 0, reduced = false, tintA = '#7cf5ff', tintB = '#ffd98a', seamA = 0.5 } = {}) {
    lastMode = 'melt';
    k = clamp(k);
    gB.setTransform(1, 0, 0, 1, 0, 0);
    gB.globalCompositeOperation = 'source-over'; gB.globalAlpha = 1;
    const bw = backCanvas.width, bh = backCanvas.height, fw = frontCanvas.width, fh = frontCanvas.height;
    if (reduced) {
      // a calm crossfade, with a faint warm wash at the midpoint
      if (from.back) gB.drawImage(from.back, 0, 0, bw, bh); else drawFallback();
      gB.setTransform(1, 0, 0, 1, 0, 0);
      if (to.back) { gB.globalAlpha = k; gB.drawImage(to.back, 0, 0, bw, bh); gB.globalAlpha = 1; }
      const wash = 0.25 * Math.sin(Math.PI * k);
      if (wash > 0.004) {
        gB.globalCompositeOperation = 'lighter'; gB.globalAlpha = wash;
        const A = hexRGB(tintA), B = hexRGB(tintB);
        gB.fillStyle = `rgba(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)},0.18)`;
        gB.fillRect(0, 0, bw, bh);
        gB.globalCompositeOperation = 'source-over'; gB.globalAlpha = 1;
      }
      clearFront();
      // (W4b) the front layers carry the thought, its words, postcards and bubbles: they never show twice —
      // the outgoing world's fade in the first half, the incoming world's in the second
      if (from.front && k < 0.5) { gF.globalAlpha = clamp(1 - 2 * k); gF.drawImage(from.front, 0, 0, fw, fh); }
      if (to.front && k > 0.5) { gF.globalAlpha = clamp(2 * k - 1); gF.drawImage(to.front, 0, 0, fw, fh); }
      gF.globalAlpha = 1;
      return;
    }
    buildMask(k, horizonY, t, tintA, tintB);
    // back: incoming underneath, outgoing on top with the mask cut out of it
    if (to.back) gB.drawImage(to.back, 0, 0, bw, bh); else drawFallback();
    gB.setTransform(1, 0, 0, 1, 0, 0);
    if (from.back && k < 1) {
      tB.globalCompositeOperation = 'copy'; tB.globalAlpha = 1;
      tB.drawImage(from.back, 0, 0, bw, bh);
      tB.globalCompositeOperation = 'destination-out'; tB.imageSmoothingEnabled = true;
      tB.drawImage(mask2, 0, 0, bw, bh);
      tB.globalCompositeOperation = 'source-over';
      gB.drawImage(tmpB, 0, 0);
    }
    if (seamA > 0 && k > 0 && k < 1) {
      gB.globalCompositeOperation = 'lighter'; gB.globalAlpha = seamA; gB.imageSmoothingEnabled = true;
      gB.drawImage(seam2, 0, 0, bw, bh);
      gB.globalCompositeOperation = 'source-over'; gB.globalAlpha = 1;
    }
    // front: incoming where M, outgoing where 1 − M
    clearFront();
    if (to.front) {
      tF.globalCompositeOperation = 'copy'; tF.drawImage(to.front, 0, 0, fw, fh);
      tF.globalCompositeOperation = 'destination-in'; tF.imageSmoothingEnabled = true; tF.drawImage(mask2, 0, 0, fw, fh);
      tF.globalCompositeOperation = 'source-over';
      gF.drawImage(tmpF, 0, 0);
    }
    if (from.front && k < 1) {
      tF.globalCompositeOperation = 'copy'; tF.drawImage(from.front, 0, 0, fw, fh);
      tF.globalCompositeOperation = 'destination-out'; tF.drawImage(mask2, 0, 0, fw, fh);
      tF.globalCompositeOperation = 'source-over';
      gF.drawImage(tmpF, 0, 0);
    }
  }

  /** Pause: the last frame stays, under a soft veil (drawn once; the loop then rests). */
  function veil(a = 0.2) {
    gF.setTransform(1, 0, 0, 1, 0, 0);
    gF.globalCompositeOperation = 'source-over'; gF.globalAlpha = 1;
    gF.fillStyle = `rgba(8,6,26,${a})`;
    gF.fillRect(0, 0, frontCanvas.width, frontCanvas.height);
  }

  return {
    resize, setFallback, drawFallback, single, melt, veil, clearFront,
    get size() { return { W, H, dprB, dprF }; },
    get mode() { return lastMode; },
    get maskSize() { return { mw, mh }; },
    /** QA: the mask value 0..1 at a CSS px point after the last melt frame. */
    maskAt(x, y) { const i = clamp(Math.floor((x / W) * mw), 0, mw - 1), j = clamp(Math.floor((y / H) * mh), 0, mh - 1); return mdata ? mdata.data[(j * mw + i) * 4 + 3] / 255 : 0; },
  };
}
