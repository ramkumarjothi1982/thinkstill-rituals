// Boppo's Sunpop Orchard — the art, painted once in code (sprites and the two trees), in the Sunpop Orchard realm's own
// language (src/world/realms/sunpop-orchard.js): round lime-to-leaf foliage lit from the sun on the right, warm bark,
// apricot light, cream blossom. Nothing here runs per frame: the world blits what these return.

import { makeCanvas, clamp, TAU, rng } from '../../../world/util.js';

export const ART = Object.freeze({
  bark: '#8a4a2a', barkDark: '#5e2c1c', barkLit: '#d08a52',
  leafLight: '#e6f58a', leaf: '#a8d04a', leafMid: '#7cb83e', leafDark: '#4f8a26', leafDeep: '#3a6a22',
  gold: '#ffd23a', orange: '#ff9a16', ember: '#f06a0a', cream: '#fff6e4', blossom: '#fff2f0', blush: '#ff8fa8',
  rope: '#f0d2a0', ropeDark: '#a8764a', wood: '#c88a52', woodDark: '#8a5432',
});

/** A sunpop body (bud or ripe), S × S px, the fruit filling 0.8 S. Lit from the upper right (the realm's sun). */
export function fruitSprite(S, ripe) {
  const c = makeCanvas(S, S), g = c.getContext('2d');
  const cx = S / 2, cy = S / 2 + S * 0.02, r = S * 0.4;
  // a soft contact shade underneath (it hangs in light air: very faint)
  let gr = g.createRadialGradient(cx, cy + r * 0.92, 0, cx, cy + r * 0.92, r * 0.7);
  gr.addColorStop(0, ripe ? 'rgba(200,80,10,0.22)' : 'rgba(70,110,30,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  // body: a slightly squat sphere
  g.save(); g.translate(cx, cy); g.scale(1.04, 0.97);
  gr = g.createRadialGradient(r * 0.32, -r * 0.36, r * 0.04, 0, 0, r * 1.02);
  if (ripe) { gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.28, '#ffe36a'); gr.addColorStop(0.62, '#ffb22a'); gr.addColorStop(0.9, '#ff8a12'); gr.addColorStop(1, '#ec640c'); }
  else { gr.addColorStop(0, '#fbffe0'); gr.addColorStop(0.3, '#e4f4a4'); gr.addColorStop(0.68, '#bcdc68'); gr.addColorStop(0.92, '#92bc44'); gr.addColorStop(1, '#78a434'); }
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  // light through the far side (subsurface): warm from below-left
  g.globalCompositeOperation = 'lighter';
  gr = g.createRadialGradient(-r * 0.3, r * 0.42, 0, -r * 0.3, r * 0.42, r * 0.8);
  gr.addColorStop(0, ripe ? 'rgba(255,200,120,0.34)' : 'rgba(240,255,200,0.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over';
  // a faint seam (a sunpop has a soft crease from its stem), and the dimple where the stem meets it
  g.strokeStyle = ripe ? 'rgba(210,100,20,0.22)' : 'rgba(90,130,40,0.2)'; g.lineWidth = S * 0.012;
  g.beginPath(); g.moveTo(0, -r * 0.92); g.quadraticCurveTo(-r * 0.22, 0, -r * 0.02, r * 0.86); g.stroke();
  gr = g.createRadialGradient(0, -r * 0.86, 0, 0, -r * 0.86, r * 0.22);
  gr.addColorStop(0, ripe ? 'rgba(170,70,10,0.45)' : 'rgba(70,100,30,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, -r * 0.86, r * 0.22, 0, TAU); g.fill();
  // rim light on the sun side
  g.strokeStyle = ripe ? 'rgba(255,248,210,0.7)' : 'rgba(255,255,230,0.6)'; g.lineWidth = S * 0.018; g.lineCap = 'round';
  g.beginPath(); g.arc(0, 0, r - S * 0.012, -1.25, 0.35); g.stroke();
  // specular: a soft oval highlight, and a tiny bright catch
  g.save(); g.translate(r * 0.34, -r * 0.42); g.rotate(0.7); g.scale(1, 0.55);
  gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.3); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); g.restore();
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(r * 0.42, -r * 0.5, r * 0.05, 0, TAU); g.fill();
  g.restore();
  return c;
}

/** A small leaf (its base at the sprite's left middle), S × S/2. */
export function leafSprite(S) {
  const c = makeCanvas(S, Math.ceil(S / 2)), g = c.getContext('2d');
  const h = S / 2;
  const gr = g.createLinearGradient(0, 0, S, h);
  gr.addColorStop(0, ART.leafMid); gr.addColorStop(0.55, ART.leaf); gr.addColorStop(1, ART.leafLight);
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(1, h / 2); g.quadraticCurveTo(S * 0.45, -h * 0.05, S - 1, h / 2); g.quadraticCurveTo(S * 0.45, h * 1.05, 1, h / 2); g.fill();
  g.strokeStyle = 'rgba(60,100,30,0.45)'; g.lineWidth = Math.max(1, S * 0.03);
  g.beginPath(); g.moveTo(2, h / 2); g.quadraticCurveTo(S * 0.5, h * 0.42, S * 0.9, h / 2); g.stroke();
  return c;
}

/** The glass ring round a photo sunpop (the photo shows through its middle), S × S: tinted green or gold. */
export function rimSprite(S, ripe) {
  const c = makeCanvas(S, S), g = c.getContext('2d');
  const cx = S / 2, cy = S / 2, r = S * 0.4, w = S * 0.07;
  let gr = g.createRadialGradient(cx, cy, r - w, cx, cy, r + 1);
  if (ripe) { gr.addColorStop(0, 'rgba(255,214,90,0)'); gr.addColorStop(0.35, 'rgba(255,190,60,0.95)'); gr.addColorStop(0.75, 'rgba(255,150,30,1)'); gr.addColorStop(1, 'rgba(236,100,12,1)'); }
  else { gr.addColorStop(0, 'rgba(220,240,160,0)'); gr.addColorStop(0.35, 'rgba(200,226,120,0.95)'); gr.addColorStop(0.75, 'rgba(150,190,70,1)'); gr.addColorStop(1, 'rgba(110,150,50,1)'); }
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r + 1, 0, TAU); g.arc(cx, cy, r - w, 0, TAU, true); g.fill();
  // glassy sheen over the photo
  g.save(); g.beginPath(); g.arc(cx, cy, r - w * 0.6, 0, TAU); g.clip();
  gr = g.createLinearGradient(cx + r, cy - r, cx - r * 0.2, cy + r * 0.2);
  gr.addColorStop(0, 'rgba(255,255,255,0.42)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); g.restore();
  g.strokeStyle = 'rgba(255,252,230,0.85)'; g.lineWidth = S * 0.02; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, r - w * 0.2, -1.3, 0.2); g.stroke();
  return c;
}

/** The swing's seat: a small rounded plank with a garland of cream blossom, W × H px at `d` device px per px. */
export function plankSprite(w, h, d) {
  const c = makeCanvas(Math.ceil((w + 8) * d), Math.ceil((h + 10) * d)), g = c.getContext('2d');
  g.scale(d, d); g.translate(4, 4);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#e6aa6c'); gr.addColorStop(0.45, ART.wood); gr.addColorStop(1, ART.woodDark);
  g.fillStyle = gr;
  const rr = h / 2;
  g.beginPath(); g.moveTo(rr, 0); g.arcTo(w, 0, w, h, rr); g.arcTo(w, h, 0, h, rr); g.arcTo(0, h, 0, 0, rr); g.arcTo(0, 0, w, 0, rr); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,230,190,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(rr, 1); g.lineTo(w - rr, 1); g.stroke();
  // blossom along its front edge
  const R = rng(77);
  for (let k = 0; k < Math.max(3, Math.round(w / 9)); k++) {
    const x = rr * 0.6 + (k + 0.5) * ((w - rr * 1.2) / Math.max(3, Math.round(w / 9))), y = h * 0.8 + (R() - 0.5) * 2;
    g.fillStyle = ART.leafMid; g.beginPath(); g.ellipse(x + 2.5, y + 1, 2.6, 1.2, 0.5, 0, TAU); g.fill();
    g.fillStyle = k % 3 === 1 ? '#ffd0dc' : ART.blossom; g.beginPath(); g.arc(x, y, 2.1, 0, TAU); g.fill();
    g.fillStyle = ART.gold; g.beginPath(); g.arc(x, y, 0.8, 0, TAU); g.fill();
  }
  c.cssW = w + 8; c.cssH = h + 10;
  return c;
}

// ------------------------------------------------------------------ trees --
/**
 * The arbour: two sunpop trees at the sides, their canopies meeting over the swing, a branch out to every sunpop's
 * stem and a bough across the middle the ropes are tied to. Painted once per layout into one canvas (CSS px × d).
 * plan: planOrchard()'s result. Returns { canvas, x, y, w, h } (CSS px: where to draw it).
 */
export function paintTrees(plan, d = 1, seed = 1) {
  const { W, H, bandB, arbour, slots } = plan;
  const R = rng(seed ^ 0x5eed);
  const aw = arbour.x1 - arbour.x0;
  const top = 0, bottom = Math.min(H, Math.round(Math.max(plan.ground + 40, H * 0.86)));
  const x0 = Math.max(0, arbour.x0 - 20), x1 = Math.min(W, arbour.x1 + 20);
  const c = makeCanvas(Math.ceil((x1 - x0) * d), Math.ceil((bottom - top) * d));
  const g = c.getContext('2d');
  g.setTransform(d, 0, 0, d, -x0 * d, -top * d);
  const cx = plan.cx;
  const trunkW = clamp(aw * 0.085, 26, 64);
  const canopyY = bandB - Math.min(46, (bandB - 60) * 0.42);
  const trunks = [-1, 1].map((side) => {
    const base = side < 0 ? arbour.x0 + trunkW * 0.25 : arbour.x1 - trunkW * 0.25;
    return { side, xb: base, yb: bottom + 6, xt: base - side * trunkW * 0.9, yt: canopyY + 24 };
  });
  /** The trunk's centre line at height y (a gentle S). */
  const trunkX = (T, y) => { const t = clamp((T.yb - y) / (T.yb - T.yt)); return T.xb + (T.xt - T.xb) * t + T.side * -trunkW * 0.22 * Math.sin(t * Math.PI); };
  const trunkHalf = (T, y) => { const t = clamp((T.yb - y) / (T.yb - T.yt)); return (trunkW / 2) * (1 - 0.42 * t); };

  // ---- canopy blobs behind everything (the far, darker leaves)
  const blob = (x, y, r, dark) => {
    g.fillStyle = dark ? ART.leafDeep : ART.leafDark;
    g.beginPath(); g.arc(x - r * 0.06, y + r * 0.12, r, 0, TAU); g.fill();
    const gr = g.createRadialGradient(x + r * 0.32, y - r * 0.38, r * 0.05, x, y, r * 1.02);
    if (dark) { gr.addColorStop(0, '#b6d85a'); gr.addColorStop(0.5, '#7cb83e'); gr.addColorStop(1, '#4f8a26'); }
    else { gr.addColorStop(0, ART.leafLight); gr.addColorStop(0.42, ART.leaf); gr.addColorStop(0.85, ART.leafMid); gr.addColorStop(1, ART.leafDark); }
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 0.96, 0, TAU); g.fill();
    // the sun's rim on the upper right
    g.strokeStyle = 'rgba(255,252,206,0.55)'; g.lineWidth = 1.4; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y, r * 0.93, -1.35, -0.1); g.stroke();
  };
  const canopy = [];
  for (const T of trunks) {
    // a cloud of leaves from the trunk's top in towards the middle, sagging a little, meeting the other tree's
    const n = 9;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      const x = T.xt + (cx - T.xt) * (u * 1.08) + (R() - 0.5) * 8;
      const sag = Math.sin(u * Math.PI) * 10;
      const r = (0.13 - 0.06 * u) * aw * (0.85 + 0.3 * R());
      const y = canopyY - r * 0.35 + sag - (1 - u) * 14 + (R() - 0.5) * 8;
      canopy.push({ x, y, r, dark: k % 3 === 2 });
      // a crown above, so the canopy reads as a full tree top (it runs into the band: backdrop only)
      if (k < 6) canopy.push({ x: x + (R() - 0.5) * r * 0.6, y: y - r * (0.8 + 0.3 * R()), r: r * (0.8 + 0.2 * R()), dark: R() < 0.4 });
    }
  }
  canopy.sort((a, b) => (a.dark === b.dark ? a.y - b.y : a.dark ? -1 : 1));
  for (const b of canopy) if (b.dark) blob(b.x, b.y, b.r, true);

  // ---- trunks
  for (const T of trunks) {
    const N = 22, left = [], right = [];
    for (let k = 0; k <= N; k++) {
      const y = T.yb + (T.yt - T.yb) * (k / N), x = trunkX(T, y), h = trunkHalf(T, y);
      left.push([x - h, y]); right.push([x + h, y]);
    }
    const gr = g.createLinearGradient(T.xb - trunkW, 0, T.xb + trunkW, 0);
    gr.addColorStop(0, ART.barkDark); gr.addColorStop(0.55, ART.bark); gr.addColorStop(1, ART.barkLit);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(left[0][0], left[0][1]);
    for (const p of left) g.lineTo(p[0], p[1]);
    for (let k = right.length - 1; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
    g.closePath(); g.fill();
    // bark: soft vertical grain and a lit edge on the sun side
    g.strokeStyle = 'rgba(60,24,14,0.25)'; g.lineWidth = 1.2;
    for (let s = -0.5; s <= 0.5; s += 0.33) {
      g.beginPath();
      for (let k = 0; k <= N; k++) { const y = T.yb + (T.yt - T.yb) * (k / N); const x = trunkX(T, y) + s * trunkHalf(T, y) + Math.sin(y * 0.05 + s * 3) * 1.5; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,214,160,0.55)'; g.lineWidth = 2;
    g.beginPath(); for (let k = 0; k <= N; k++) { const y = T.yb + (T.yt - T.yb) * (k / N), x = trunkX(T, y) + trunkHalf(T, y) * 0.86; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    T.trunkX = trunkX; T.trunkHalf = trunkHalf;
  }

  // ---- a branch out to every sunpop's stem (tapered, from the nearer trunk), a leafy tuft where the stem hangs
  const branch = (xa, ya, xb, yb, w0, w1) => {
    const mx = (xa + xb) / 2, my = Math.min(ya, yb) - Math.abs(xb - xa) * 0.18;
    const N = 10;
    for (let k = 0; k < N; k++) {
      const t0 = k / N, t1 = (k + 1) / N;
      const p = (t) => [(1 - t) * (1 - t) * xa + 2 * t * (1 - t) * mx + t * t * xb, (1 - t) * (1 - t) * ya + 2 * t * (1 - t) * my + t * t * yb];
      const [ax, ay] = p(t0), [bx, by] = p(t1);
      const w = w0 + (w1 - w0) * ((t0 + t1) / 2);
      g.strokeStyle = ART.bark; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      g.strokeStyle = 'rgba(232,160,100,0.6)'; g.lineWidth = Math.max(1, w * 0.3);
      g.beginPath(); g.moveTo(ax, ay - w * 0.28); g.lineTo(bx, by - w * 0.28); g.stroke();
    }
  };
  const tufts = [];
  for (const s of slots) {
    const T = trunks[s.side < 0 ? 0 : 1];
    const yb = clamp(s.ay - 6, T.yt + 10, T.yb - 30);
    const xb = trunkX(T, yb) - T.side * trunkHalf(T, yb) * 0.5;
    branch(xb, yb, s.ax, s.ay - 2, clamp(trunkW * 0.3, 7, 13), 3);
    tufts.push({ x: s.ax, y: s.ay - 6, r: clamp(s.D * 0.3, 12, 20) });
  }
  // the bough the swing hangs from: across the middle, under the meeting canopies
  if (plan.ropes) {
    const { xl, xr, y0 } = plan.ropes, span = Math.max(80, (xr - xl) * 2.6);
    branch(cx - span, y0 - 10, cx + span * 0.1, y0 - 1, 9, 6);
    branch(cx + span, y0 - 10, cx - span * 0.1, y0 - 1, 9, 6);
  }

  // ---- the near canopy, lit
  for (const b of canopy) if (!b.dark) blob(b.x, b.y, b.r, false);
  for (const t of tufts) {
    blob(t.x - t.r * 0.7, t.y - t.r * 0.2, t.r * 0.8, true);
    blob(t.x + t.r * 0.5, t.y - t.r * 0.45, t.r * 0.9, false);
  }
  // blossom and dappled light over the leaves
  for (let k = 0; k < Math.round(aw / 6); k++) {
    const b = canopy[(R() * canopy.length) | 0];
    if (!b) break;
    const a = R() * TAU, rr = b.r * Math.sqrt(R()) * 0.85, x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr;
    if (R() < 0.55) { g.fillStyle = R() < 0.3 ? '#ffd0dc' : ART.blossom; g.beginPath(); g.arc(x, y, 1.3 + R() * 1.2, 0, TAU); g.fill(); }
    else { g.fillStyle = 'rgba(255,250,200,0.35)'; g.beginPath(); g.ellipse(x, y, 3 + R() * 4, 1.6 + R() * 2, -0.4, 0, TAU); g.fill(); }
  }
  return { canvas: c, x: x0, y: top, w: x1 - x0, h: bottom - top };
}
