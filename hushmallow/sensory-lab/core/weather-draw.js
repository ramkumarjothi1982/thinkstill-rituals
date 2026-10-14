// Weather Weaver — drawing (Canvas 2D, no state of its own).
//
// Everything the weather layer paints, as plain functions over the sims:
//   buildSprites   cloud puff tones per realm (underside, body, cool and gold lit tops),
//                  the glass bead, the light shaft; built once per realm, tier
//                  and DPR (glows come from the shared glowSprite cache)
//   drawClouds     thunderheads (three depth bands) and the rain deck, each puff
//                  a few soft blobs with a shaded underside and a lit top
//   drawShafts     warm light falling through the gaps in the bank
//   drawRain       drops as streaks (dots with reduced motion), one path per pass
//   drawBeads      glass beads: held (wobbling), rising as light, falling
//   drawRings      the touch ring every claimed pointer-down gets at once
//   drawAffordance the idle hint per weather (a crease of light, a hanging drop)
//   drawFront      the weather front that covers a realm change (a sweep, or a
//                  fade with reduced motion); its alpha never exceeds 0.96
//   stageFade      how much to fade weather near the Mallow
// Rules: no shadowBlur, no filters, no per-element gradients (one per frame for
// the front at most), no allocation per frame. Nothing runs at import time.

import { clamp, smoothstep, TAU } from './math.js';
import { glowSprite } from './effects.js';

export const PUFF_R = 48;    // sprite radius (CSS px) the puff blobs are drawn from
export const BEAD_R = 32;

const frac = (x) => x - Math.floor(x);
export const hexRGB = (hex) => { const n = parseInt(String(hex || '#000000').replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const mixRGB = (a, b, k, out = [0, 0, 0]) => { for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * k; return out; };
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1).toFixed(3)})`;
const hex = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const scale = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

function canvas(px) {
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  return c;
}

/** A soft round blob of colour c: alpha follows `stops` ([offset, alpha] pairs). */
function blob(c, R, dpr, stops) {
  const px = Math.max(2, Math.ceil(2 * R * dpr)), s = canvas(px), g = s.getContext('2d');
  if (!g) return s;
  const k = px / (2 * R);
  g.setTransform(k, 0, 0, k, 0, 0);
  const gr = g.createRadialGradient(R, R, 0, R, R, R);
  for (const [o, a] of stops) gr.addColorStop(o, css(c, a));
  g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, TAU); g.fill();
  return s;
}

const BODY = [[0, 1], [0.55, 0.94], [0.8, 0.5], [1, 0]];
const STORM = [hexRGB('#25203e'), hexRGB('#373159'), hexRGB('#4c4672')];   // back → front band
const DECK = hexRGB('#5d6684');
const WHITE = [255, 255, 255];

/**
 * Sprites for one realm. palette: the realm's palette {sky, deep, glow, warm?};
 * tone: 'light' | 'dark' (chrome tone of the realm); dpr: the back canvas DPR.
 */
export function buildSprites({ palette = {}, tone = 'dark', dpr = 1 } = {}) {
  const sky = hexRGB(palette.sky), deep = hexRGB(palette.deep || palette.sky);
  const glow = hexRGB(palette.glow || '#ffffff'), warm = hexRGB(palette.warm || '#ffc98a');
  const light = tone === 'light';
  const rimCool = mixRGB(glow, WHITE, 0.35), rimWarm = mixRGB(warm, hexRGB('#ffe7b0'), 0.45);
  // each tone: the body, a darker underside and two lit tops (cool, and gold as a storm clears)
  const tones = (body, coolK, warmK) => ({
    body: blob(body, PUFF_R, dpr, BODY),
    shade: blob(scale(body, light ? 0.72 : 0.6), PUFF_R, dpr, BODY),
    lit: blob(mixRGB(body, rimCool, coolK), PUFF_R, dpr, BODY),
    litWarm: blob(mixRGB(body, rimWarm, warmK), PUFF_R, dpr, BODY),
  });
  const thunder = STORM.map((base, b) => tones(mixRGB(light ? sky : deep, base, light ? 0.8 : 0.72 - 0.04 * b), 0.22 + 0.06 * b, 0.42));
  const deck = tones(mixRGB(sky, DECK, light ? 0.55 : 0.66), 0.3, 0.4);
  return {
    dpr, tone, light,
    thunder, deck,
    bead: beadSprite(dpr, light),
    shaft: shaftSprite(mixRGB(warm, hexRGB('#fff2cc'), 0.35), dpr),
    glowHex: hex(glow), warmHex: hex(rimWarm),
    rain: light ? [36, 64, 104] : [214, 230, 255],
    ring: light ? 'rgba(42,29,61,0.9)' : 'rgba(255,255,255,0.95)',
  };
}

/** Release every sprite bitmap (layer destroy / rebuild). */
export function freeSprites(sp) {
  if (!sp) return;
  const drop = (c) => { if (c && c.width) { c.width = 0; c.height = 0; } };
  for (const t of sp.thunder) for (const k in t) drop(t[k]);
  for (const k in sp.deck) drop(sp.deck[k]);
  drop(sp.bead); drop(sp.shaft);
}

function beadSprite(dpr, light) {
  const R = BEAD_R, px = Math.ceil(2 * R * dpr), s = canvas(px), g = s.getContext('2d');
  if (!g) return s;
  const k = px / (2 * R);
  g.setTransform(k, 0, 0, k, 0, 0);
  // glass: clear middle, bright rim, a highlight up-left, refracted light low-right
  let gr = g.createRadialGradient(R, R, 0, R, R, R);
  gr.addColorStop(0, 'rgba(255,255,255,0.06)'); gr.addColorStop(0.68, 'rgba(205,232,255,0.14)');
  gr.addColorStop(0.9, 'rgba(236,247,255,0.62)'); gr.addColorStop(1, 'rgba(236,247,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, TAU); g.fill();
  gr = g.createRadialGradient(R * 0.62, R * 0.55, 0, R * 0.62, R * 0.55, R * 0.42);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(R * 0.62, R * 0.55, R * 0.42, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = R * 0.06;
  g.beginPath(); g.arc(R, R, R * 0.74, 0.25 * Math.PI, 0.8 * Math.PI); g.stroke();
  if (light) { g.strokeStyle = 'rgba(26,34,72,0.22)'; g.lineWidth = 1.2; g.beginPath(); g.arc(R, R, R * 0.93, 0, TAU); g.stroke(); }
  return s;
}

function shaftSprite(c, dpr) {
  const w = 32, hgt = 128, s = document.createElement('canvas');
  s.width = Math.ceil(w * dpr); s.height = Math.ceil(hgt * dpr);
  const g = s.getContext('2d');
  if (!g) return s;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  let gr = g.createLinearGradient(0, 0, 0, hgt);
  gr.addColorStop(0, css(c, 0.95)); gr.addColorStop(0.55, css(c, 0.5)); gr.addColorStop(1, css(c, 0.08));
  g.fillStyle = gr; g.fillRect(0, 0, w, hgt);
  g.globalCompositeOperation = 'destination-in';
  gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.5, 'rgba(0,0,0,1)');
  gr.addColorStop(0.7, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, hgt);
  return s;
}

/** 1 away from the Mallow, down to 1 − k inside its ellipse (+24 px). */
export function stageFade(x, y, body, k) {
  if (!body) return 1;
  const dx = (x - body.cx) / (body.w * 0.5 + 24), dy = (y - body.mid) / (body.h * 0.5 + 24), d = dx * dx + dy * dy;
  return d >= 1 ? 1 : 1 - k * (1 - d);
}

// ----------------------------------------------------------------- clouds --
// one puff = `blits` soft blobs along a low arc (flat-ish base, taller middle),
// drawn in three passes: the darker underside, a lit top, then the body over both
function sub(j, n, x, y, r, sd, out) {
  const t = n > 1 ? j / (n - 1) : 0.5, u = t * 2 - 1, bump = Math.sqrt(Math.max(0, 1 - u * u));
  out[0] = x + u * r * 0.62 + (frac(sd * 31 + j * 0.618) - 0.5) * r * 0.14;
  out[1] = y - bump * r * 0.34 * (0.7 + 0.6 * frac(sd * 17 + j * 0.41)) + r * 0.12;
  out[2] = r * (0.36 + 0.24 * bump) * (0.86 + 0.28 * frac(sd * 7 + j * 0.29));
  return out;
}
const SUB = [0, 0, 0];

function drawPuff(g, S, x, y, r, sd, n, a, warm) {
  const P = SUB;
  // underside (offset down), lit top (offset up, peeking out above the body), then the body
  g.globalAlpha = a * 0.92;
  for (let j = 0; j < n; j++) { sub(j, n, x, y, r, sd, P); const s = P[2] * 1.04; g.drawImage(S.shade, P[0] - s + P[2] * 0.06, P[1] - s + P[2] * 0.3, 2 * s, 2 * s); }
  const cool = a * (1 - warm), hot = a * warm;
  for (let j = 0; j < n; j++) {
    sub(j, n, x, y, r, sd, P);
    const s = P[2], lx = P[0] - s - P[2] * 0.12, ly = P[1] - s - P[2] * 0.2;
    if (cool > 0.01) { g.globalAlpha = cool; g.drawImage(S.lit, lx, ly, 2 * s, 2 * s); }
    if (hot > 0.01) { g.globalAlpha = hot; g.drawImage(S.litWarm, lx, ly, 2 * s, 2 * s); }
  }
  g.globalAlpha = a;
  for (let j = 0; j < n; j++) { sub(j, n, x, y, r, sd, P); const s = P[2] * 0.94; g.drawImage(S.body, P[0] - s + P[2] * 0.04, P[1] - s + P[2] * 0.07, 2 * s, 2 * s); }
}

/**
 * Puffs of `bank` in bands b0..b1 (thunder: 0 back .. 2 front; the deck is band 0).
 * o: {alpha, warm (0..1, rims turn gold), blend, W, dpr}. Returns puffs drawn.
 */
export function drawClouds(g, bank, sp, b0, b1, o) {
  if (!bank || bank.amount <= 0.001) return 0;
  const a0 = o.alpha * (bank.reduced ? bank.amount : smoothstep(0, 0.35, bank.amount));
  if (a0 <= 0.004) return 0;
  const deck = bank.kind === 'deck';
  let drawn = 0;
  for (let b = b0; b <= b1; b++) {
    const S = deck ? sp.deck : sp.thunder[b];
    for (let i = 0; i < bank.n; i++) {
      if (bank.band[i] !== b) continue;
      const x = bank.drawX(i), y = bank.y[i], r = bank.r[i];
      if (x + r * 1.4 < 0 || x - r * 1.4 > o.W) continue;
      drawPuff(g, S, x, y, r, bank.seedv[i], bank.blits, a0 * (deck ? 0.94 : 1), o.warm);
      const gl = bank.glowAt(i);
      if (gl > 0.01) {   // a soft light inside the cloud (≤ 0.35, rises over 0.35 s)
        const R = Math.max(16, Math.round((r * 1.5) / 16) * 16), s = glowSprite(sp.glowHex, R, { dpr: o.dpr });
        g.globalCompositeOperation = o.blend;
        g.globalAlpha = 0.35 * gl * a0;
        g.drawImage(s, x - R, y - R, 2 * R, 2 * R);
        g.globalCompositeOperation = 'source-over';
      }
      drawn++;
    }
  }
  g.globalAlpha = 1;
  return drawn;
}

/**
 * Warm light through the gaps: gaps = [x, width, …] (count n), from y0 down to the floor.
 * o: {alpha, blend, t, floorY, slant, dpr, reduced, light}.
 */
export function drawShafts(g, gaps, n, y0, sp, o) {
  if (!n || o.alpha <= 0.004) return;
  const h = Math.max(20, o.floorY - y0);
  g.globalCompositeOperation = o.blend;
  for (let k = 0; k < n; k++) {
    const x = gaps[2 * k], w = gaps[2 * k + 1], open = smoothstep(16, 90, w);
    const a = o.alpha * open * (o.light ? 0.36 : 0.3) * (o.reduced ? 0.94 : 0.88 + 0.12 * Math.sin(o.t * 0.6 + k * 1.7));   // no idle shimmer with reduced motion
    if (a <= 0.004) continue;
    g.globalAlpha = a;
    g.save();
    g.translate(x, y0);
    g.transform(1, 0, o.slant, 1, 0, 0);
    g.drawImage(sp.shaft, -w * 0.48, 0, w * 0.96, h);
    g.restore();
    // where it lands: a warm pool on the ground
    const R = 64, s = glowSprite(sp.warmHex, R, { dpr: o.dpr }), bx = x + o.slant * h;
    g.globalAlpha = a * 0.9;
    g.save(); g.translate(bx, o.floorY); g.scale(1, 0.26); g.drawImage(s, -w * 0.7, -w * 0.7, w * 1.4, w * 1.4); g.restore();
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------- rain --
/**
 * Drops with depth z in [z0, z1): streaks along their velocity (dots with reduced motion).
 * One path per call. o: {alpha, reduced}. Returns drops drawn.
 */
export function drawRain(g, rain, sp, z0, z1, o) {
  if (!rain || !rain.alive || o.alpha <= 0.004) return 0;
  const { x, y, vx, vy, z, on } = rain, zm = (z0 + z1) / 2;
  let n = 0;
  g.globalAlpha = 1;
  g.beginPath();
  if (o.reduced) {
    const s = 1.2 + zm * 1.6;
    for (let i = 0; i < rain.cap; i++) {
      if (!on[i] || z[i] < z0 || z[i] >= z1) continue;
      g.rect(x[i] - s / 2, y[i] - s / 2, s, s);
      n++;
    }
    g.fillStyle = css(sp.rain, o.alpha * (0.3 + 0.45 * zm));
    g.fill();
    return n;
  }
  for (let i = 0; i < rain.cap; i++) {
    if (!on[i] || z[i] < z0 || z[i] >= z1) continue;
    const sp2 = Math.hypot(vx[i], vy[i]) || 1, L = 7 + 17 * z[i];
    g.moveTo(x[i] - (vx[i] / sp2) * L, y[i] - (vy[i] / sp2) * L);
    g.lineTo(x[i], y[i]);
    n++;
  }
  g.strokeStyle = css(sp.rain, o.alpha * (0.22 + 0.42 * zm));
  g.lineWidth = 0.8 + 1.1 * zm;
  g.lineCap = 'round';
  g.stroke();
  return n;
}

/** Glass beads (held, rising as light, falling). o: {t, reduced, blend, deckY, dpr}. Returns beads drawn. */
export function drawBeads(g, rain, sp, o) {
  if (!rain) return 0;
  let n = 0;
  for (let k = 0; k < rain.oState.length; k++) {
    const st = rain.oState[k];
    if (!st) continue;
    const r = 10 + 3 * Math.sqrt(rain.oN[k]), x = rain.ox[k], y = rain.oy[k];
    const wob = o.reduced ? 0 : 0.055 * Math.sin(o.t * 8.5 + k * 2.1) * Math.min(1, rain.oN[k] / 6);
    let a = 1, glowA = 0.22;
    if (st === 2) { const f = clamp((y - o.deckY + 40) / 240, 0, 1); a = 0.25 + 0.75 * f; glowA = 0.55 - 0.25 * f; }   // turning into light
    if (st === 3) glowA = 0.14;
    const R = Math.max(16, Math.round((r * 2.1) / 8) * 8), gs = glowSprite(sp.glowHex, R, { dpr: o.dpr });
    g.globalCompositeOperation = o.blend;
    g.globalAlpha = glowA;
    g.drawImage(gs, x - R, y - R, 2 * R, 2 * R);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = a;
    const rx = r * (1 + wob), ry = r * (1 - wob) * (st === 3 ? 1.06 : 1);
    g.drawImage(sp.bead, x - rx, y - ry, 2 * rx, 2 * ry);
    n++;
  }
  g.globalAlpha = 1;
  return n;
}

// ------------------------------------------------------------------ rings --
export const RING_LIFE = 0.7;

/** A fixed pool of 8 touch rings. */
export function createRings() { return { x: new Float32Array(8), y: new Float32Array(8), age: new Float32Array(8).fill(9), next: 0 }; }
export function addRing(R, x, y) { const i = R.next; R.next = (i + 1) % 8; R.x[i] = x; R.y[i] = y; R.age[i] = 0; }
export function stepRings(R, dt) { for (let i = 0; i < 8; i++) if (R.age[i] < 9) R.age[i] += dt; }

export function drawRings(g, R, sp, o) {
  g.strokeStyle = sp.ring;
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const age = R.age[i];
    if (age >= RING_LIFE) continue;
    const k = age / RING_LIFE, e = 1 - (1 - k) * (1 - k);
    g.globalAlpha = 0.5 * (1 - k) * o.alpha;
    g.beginPath(); g.arc(R.x[i], R.y[i], 10 + 26 * e, 0, TAU); g.stroke();
  }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------ affordance --
/**
 * The idle hint, once per weather until it is first touched (never text).
 * kind 'storm': a lighter crease between the two front puffs nearest the middle;
 * 'rain': one glinting drop hanging under the deck. o: {t, reduced, alpha, blend, W, dpr}.
 */
export function drawAffordance(g, kind, sims, sp, o) {
  if (o.alpha <= 0.004) return;
  const breathe = o.reduced ? 0.7 : 0.55 + 0.45 * Math.sin(o.t * TAU / 2.4);
  if (kind === 'storm') {
    const c = sims.clouds;
    let a = -1, b = -1, da = Infinity, db = Infinity;
    for (let i = 0; i < c.n; i++) {
      if (c.band[i] !== 2) continue;
      const d = c.drawX(i) - o.W / 2;
      if (d < 0 && -d < da) { da = -d; a = i; } else if (d >= 0 && d < db) { db = d; b = i; }
    }
    if (a < 0 || b < 0) return;
    const x = (c.drawX(a) + c.drawX(b)) / 2, y = (c.y[a] + c.y[b]) / 2, s = glowSprite(sp.warmHex, 32, { dpr: o.dpr });
    g.globalCompositeOperation = o.blend;
    g.globalAlpha = 0.32 * breathe * o.alpha;
    g.save(); g.translate(x, y); g.scale(0.45, 1.6); g.drawImage(s, -32, -32, 64, 64); g.restore();
  } else if (kind === 'rain') {
    const d = sims.deck;
    let best = -1, bd = Infinity;
    for (let i = 0; i < d.n; i++) { const dd = Math.abs(d.drawX(i) - o.W / 2); if (dd < bd) { bd = dd; best = i; } }
    if (best < 0) return;
    const x = d.drawX(best) + d.r[best] * 0.2, y = d.y[best] + d.r[best] * 0.62 + (o.reduced ? 0 : Math.sin(o.t * 1.3) * 1.5);
    const s = glowSprite(sp.glowHex, 16, { dpr: o.dpr });
    g.globalCompositeOperation = o.blend;
    g.globalAlpha = 0.5 * breathe * o.alpha;
    g.drawImage(s, x - 16, y - 16, 32, 32);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.9 * o.alpha;
    g.drawImage(sp.bead, x - 4, y - 5, 8, 10);
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ front --
const FAMILY = { cloud: hexRGB('#4b4570'), light: hexRGB('#ffd59c'), night: hexRGB('#17153f') };
const FAMILY_K = { cloud: 0.6, light: 0.62, night: 0.72 };

/** The veil colour for a front of `family` over a realm whose sky is skyHex (into out). */
export function frontColour(skyHex, family, out = [0, 0, 0]) {
  return mixRGB(hexRGB(skyHex), FAMILY[family] || FAMILY.cloud, FAMILY_K[family] ?? 0.6, out);
}

const MIXC = [0, 0, 0];

/**
 * The weather front. f: {cover 0..1, dir ±1, swapped, mode 'sweep'|'fade', family, colA, colB (rgb), t}.
 * Before the swap the leading edge advances in `dir` (and retreats if the swap is cancelled);
 * after it the veil moves on the same way, uncovering the new realm. Alpha ≤ 0.96.
 */
export function drawFront(g, f, o) {
  const cover = clamp(f.cover, 0, 1);
  if (cover <= 0.001) return;
  const W = o.W, H = o.H, A = 0.96;
  const col = mixRGB(f.colA, f.colB, f.swapped ? 0.5 + 0.5 * (1 - cover) : 0.5 * cover, MIXC);
  const solid = css(col, A);
  if (f.mode === 'fade') {
    g.globalAlpha = cover;
    g.fillStyle = solid; g.fillRect(0, 0, W, H);
    if (f.family === 'night') stars(g, 0, W, H, f.t, cover);
    g.globalAlpha = 1;
    return;
  }
  const soft = f.family === 'light' ? 150 : 80, P = soft + 90, travel = W + 2 * P;
  const side = f.swapped ? f.dir : -f.dir;                         // which side of the edge the veil is on
  const k = f.swapped ? 1 - cover : cover;
  const e = f.dir > 0 ? -P + travel * k : W + P - travel * k;      // the edge
  g.globalAlpha = 1;
  g.fillStyle = solid;
  if (side < 0) { if (e - soft > 0) g.fillRect(0, 0, e - soft, H); } else if (e + soft < W) g.fillRect(e + soft, 0, W - e - soft, H);
  const gr = g.createLinearGradient(e + side * soft, 0, e - side * 18, 0);
  gr.addColorStop(0, solid); gr.addColorStop(1, css(col, 0));
  g.fillStyle = gr;
  g.fillRect(Math.min(e + side * soft, e - side * 18), 0, soft + 18, H);
  if (f.family !== 'light') {
    // a puffed edge: overlapping soft discs riding the boundary
    g.fillStyle = solid;
    for (let i = 0; i < 9; i++) {
      const cy = H * (i + 0.5) / 9 + 14 * Math.sin(i * 2.3), r = 44 + 28 * frac(i * 0.37 + 0.2);
      const cx = e + side * (soft * 0.55 + 24 * frac(i * 0.61)) - side * 6 * Math.sin(f.t * 0.5 + i);
      g.globalAlpha = 0.35; g.beginPath(); g.arc(cx, cy, r * 1.18, 0, TAU); g.fill();
      g.globalAlpha = 0.8; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    }
    if (f.family === 'night') stars(g, side < 0 ? 0 : e, side < 0 ? e : W, H, f.t, 1);
  }
  g.globalAlpha = 1;
}

// the first stars of a night front (a fixed scatter, faintly twinkling ≤ 1.2 Hz)
function stars(g, x0, x1, H, t, a) {
  g.fillStyle = '#fff6dc';
  for (let i = 0; i < 14; i++) {
    const x = frac(i * 0.754 + 0.13) * 1400 - 200, y = H * (0.06 + 0.5 * frac(i * 0.381 + 0.7));
    if (x < x0 || x > x1) continue;
    g.globalAlpha = a * (0.45 + 0.2 * Math.sin(t * 2.2 + i * 1.9));
    g.fillRect(x, y, 1.6, 1.6);
  }
}

