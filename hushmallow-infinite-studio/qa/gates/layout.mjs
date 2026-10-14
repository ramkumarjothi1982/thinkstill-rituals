// G-DRAFT layout: the Mallow stays clear of the frame edges and the props do
// not bury it. Computed from the direction's geometry (qa/gates/geometry.mjs)
// at every `every`-th frame, at quarter resolution:
//
//   margin     the silhouette contour stays >= 24 px from every frame edge
//   propCover  glass cards cover <= 15 % of the Mallow's silhouette and <= 5 %
//              of its face box (cards with alpha >= 0.5 count)
//   wraps      declared wraps keep >= 95 % of the face visible (no move
//              declares a wrap yet; WP-12's prop kit adds them)

import { check, gate, notRunGate } from './verdict.mjs';

/** Filled polygon at scale k on a w x h grid (even-odd scanline). */
export function polygonMask(flat, k, w, h) {
  const n = flat.length / 2;
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const yc = (y + 0.5) / k;
    const xs = [];
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = flat[2 * i + 1], yj = flat[2 * j + 1];
      if ((yi > yc) !== (yj > yc)) xs.push(flat[2 * i] + ((yc - yi) / (yj - yi)) * (flat[2 * j] - flat[2 * i]));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      const x0 = Math.max(0, Math.ceil(xs[q] * k - 0.5)), x1 = Math.min(w - 1, Math.floor(xs[q + 1] * k - 0.5));
      for (let x = x0; x <= x1; x++) m[y * w + x] = 1;
    }
  }
  return m;
}

function countIn(mask, w, box, k) {
  const h = mask.length / w;
  const x0 = Math.max(0, Math.floor(box[0] * k)), x1 = Math.min(w, Math.ceil(box[2] * k));
  const y0 = Math.max(0, Math.floor(box[1] * k)), y1 = Math.min(h, Math.ceil(box[3] * k));
  let c = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) c += mask[y * w + x];
  return c;
}

export function layoutGate(geometry, T) {
  if (!geometry) return notRunGate('no direction geometry');
  const L = T.gates['G-DRAFT:layout'];
  const [W, H] = geometry.design;
  const k = 0.25, w = Math.round(W * k), h = Math.round(H * k);
  let margin = { v: Infinity, i: 0 }, mallow = { v: 0, i: 0 }, face = { v: 0, i: 0 };
  geometry.perFrame.forEach((fr, i) => {
    if (i % L.every) return;
    const c = fr.contour;
    for (let q = 0; q < c.length; q += 2) {
      const d = Math.min(c[q], c[q + 1], W - c[q], H - c[q + 1]);
      if (d < margin.v) margin = { v: d, i };
    }
    const cards = fr.glass.filter((g) => g[4] >= 0.5);
    if (!cards.length) return;
    const body = polygonMask(c, k, w, h);
    const area = body.reduce((s, v) => s + v, 0);
    if (!area) return;
    // union of the cards over the body
    const cover = new Uint8Array(w * h);
    for (const g of cards) {
      for (let y = Math.max(0, Math.floor(g[1] * k)); y < Math.min(h, Math.ceil(g[3] * k)); y++) {
        for (let x = Math.max(0, Math.floor(g[0] * k)); x < Math.min(w, Math.ceil(g[2] * k)); x++) cover[y * w + x] = 1;
      }
    }
    let onBody = 0;
    for (let p = 0; p < body.length; p++) onBody += body[p] & cover[p];
    if (onBody / area > mallow.v) mallow = { v: onBody / area, i };
    const fb = fr.faceBox;
    const fa = Math.max(1, (fb[2] - fb[0]) * (fb[3] - fb[1]) * k * k);
    const onFace = countIn(cover, w, fb, k);
    if (onFace / fa > face.v) face = { v: onFace / fa, i };
  });
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const cover = (m, lim, what) => {
    const st = m.v > lim.fail ? 'fail' : lim.warn !== undefined && m.v > lim.warn ? 'warn' : 'pass';
    return check(st, r3(m.v), lim.fail, `glass cards cover at most ${(m.v * 100).toFixed(1)} % of ${what} (frame ${m.i}; limit ${lim.fail * 100} %${lim.warn !== undefined ? `, warn above ${lim.warn * 100} %` : ''}${lim.provisional ? ', provisional' : ''})`, { warn: lim.warn });
  };
  const checks = {
    margin: check(margin.v >= L.silhouetteMargin ? 'pass' : 'fail', r3(margin.v), L.silhouetteMargin, `silhouette at least ${margin.v.toFixed(1)} px from the frame edges (closest at frame ${margin.i}; limit ${L.silhouetteMargin})`),
    propCoverMallow: cover(mallow, L.propCoverMallow, 'the Mallow'),
    propCoverFace: cover(face, L.propCoverFace, 'the face box'),
    wraps: check('pass', 0, 0.95, 'no move declares a wrap yet'),
  };
  return gate(checks, { metrics: { marginPx: r3(margin.v), propCoverMallow: r3(mallow.v), propCoverFace: r3(face.v) } });
}
