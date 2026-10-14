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
//   weatherTints   the colours of light, stars, silk, embers, mist and water for
//                  a realm (Comfort DNA's palette tints stars, moonlight, ribbons,
//                  embers and warm swells; the sun keeps its own gold)
//   drawStars / drawConstellations  twinkling stars, held clusters, the lines that stay
//   drawBeam       the soft beam from the realm's sun or moon to the light pool
//   drawField      a FieldGrid (sun haze, fog) as one tiny putImageData, drawn scaled up
//   drawRibbons / drawFluffs  silk currents and seed fluffs riding the flow
//   drawWater / drawGlitter / drawPuddles  swells in perspective, the light's glitter path, puddles
//   drawPool / drawHalo  the light pool, and the warm rim behind a basking Mallow
//   drawEmbers / drawTrail  embers (waiting, kindling, lit), hearth rings, the warm ribbon a drag lays
//   drawDew        dew glints after the fog lifts
//   stageFade      how much to fade weather near the Mallow
// Rules: no shadowBlur, no filters, no per-element gradients (one per frame for
// the front, one for the beam at most), no allocation per frame. Nothing runs at import time.

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
// thunderheads are big (a puff can span half a phone): a firmer edge keeps them painted cumulus, not smoke
const BODY_FIRM = [[0, 1], [0.64, 0.97], [0.83, 0.8], [0.94, 0.3], [1, 0]];
const STORM = [hexRGB('#25203e'), hexRGB('#373159'), hexRGB('#4c4672')];   // back → front band
const DECK = hexRGB('#5d6684');
const WHITE = [255, 255, 255], LAVENDER = [206, 198, 255];

/**
 * Sprites for one realm. palette: the realm's palette {sky, deep, glow, warm?};
 * tone: 'light' | 'dark' (chrome tone of the realm); dpr: the back canvas DPR.
 */
export function buildSprites({ palette = {}, tone = 'dark', dpr = 1 } = {}) {
  const sky = hexRGB(palette.sky), deep = hexRGB(palette.deep || palette.sky);
  const glow = hexRGB(palette.glow || '#ffffff'), warm = hexRGB(palette.warm || '#ffc98a');
  const light = tone === 'light';
  const rimCool = mixRGB(glow, WHITE, 0.35), rimWarm = mixRGB(warm, hexRGB('#ffe7b0'), 0.45);
  // a thunderhead's rim is a cool silver-lavender whatever the realm (a gold festival glow mixed into
  // violet-grey read as a dirty tan rim); it turns gold only as the storm clears (litWarm)
  const rimStorm = mixRGB(mixRGB(glow, LAVENDER, 0.65), WHITE, 0.25);
  // each tone: the body, a darker underside and two lit tops (cool, and gold as a storm clears)
  const tones = (body, coolK, warmK, rim, stops) => ({
    body: blob(body, PUFF_R, dpr, stops),
    shade: blob(scale(body, light ? 0.72 : 0.6), PUFF_R, dpr, stops),
    lit: blob(mixRGB(body, rim, coolK), PUFF_R, dpr, stops),
    litWarm: blob(mixRGB(body, rimWarm, warmK), PUFF_R, dpr, stops),
  });
  const thunder = STORM.map((base, b) => tones(mixRGB(light ? sky : deep, base, light ? 0.8 : 0.8 - 0.04 * b), 0.24 + 0.06 * b, 0.42, rimStorm, BODY_FIRM));
  const deck = tones(mixRGB(sky, DECK, light ? 0.55 : 0.66), 0.3, 0.4, rimCool, BODY);
  return {
    dpr, tone, light,
    thunder, deck,
    bead: beadSprite(dpr, light),
    shaft: shaftSprite(mixRGB(warm, hexRGB('#fff2cc'), 0.35), dpr),
    glowHex: hex(glow), warmHex: hex(rimWarm),
    rain: light ? [78, 98, 136] : [214, 230, 255],   // over a bright sky a soft slate, never ink
    ring: light ? 'rgba(42,29,61,0.9)' : 'rgba(255,255,255,0.95)',
    tint: weatherTints(palette, tone, null),
  };
}

const SUN_GOLD = hexRGB('#ffcf7a'), SUN_AMBER = hexRGB('#ffa65a'), SUN_CRISP = hexRGB('#fff2cf');
const MOON_SILVER = hexRGB('#e4ebff'), STAR_WHITE = hexRGB('#fff4d8'), EMBER = hexRGB('#ffb057'), SWELL_GOLD = hexRGB('#ffd27a');

/**
 * The colours of the light, stars, silk, embers, mist and water over one realm.
 * dna: Comfort DNA's palette ({glow, soft, deep}) or null: it tints stars, moonlight,
 * ribbons, embers and warm swells; the sun keeps its own gold and realm colours never change.
 */
export function weatherTints(palette = {}, tone = 'dark', dna = null) {
  const sky = hexRGB(palette.sky), glow = hexRGB(palette.glow || '#ffffff'), light = tone === 'light';
  const dg = dna?.glow ? hexRGB(dna.glow) : null, ds = dna?.soft ? hexRGB(dna.soft) : dg;
  const tintK = (base, c, k) => (c ? mixRGB(base, c, k) : base);
  const moon = tintK(MOON_SILVER, ds, 0.35), star = tintK(STAR_WHITE, dg, 0.45), ember = tintK(EMBER, dg, 0.3), gold = tintK(SWELL_GOLD, dg, 0.3);
  const ribbon = ds ? mixRGB([250, 250, 255], ds, 0.45) : light ? [255, 255, 255] : [228, 234, 255];
  const crest = light ? [255, 255, 255] : mixRGB(glow, [255, 255, 255], 0.5);
  return {
    // glow sprite colours (hex) and stroke / fill styles (css, opaque: alpha goes through globalAlpha)
    sun: hex(SUN_GOLD), amber: hex(SUN_AMBER), crisp: hex(SUN_CRISP), sunRGB: SUN_GOLD, sunCss: css(SUN_GOLD),
    moon: hex(moon), moonRGB: moon, moonCss: css(moon),
    star: hex(star), starCss: css(star), coreCss: '#fffaf0',
    ember: hex(ember), emberCss: css(ember),
    goldHex: hex(gold), goldCss: css(gold),
    ribbonCss: css(ribbon), crestCss: css(crest),
    // fog: pale over day skies, a blue-grey over night ones; the overcast haze is a dull realm grey
    mist: light ? mixRGB(sky, [238, 242, 248], 0.78) : mixRGB(sky, [150, 156, 196], 0.62),
    haze: mixRGB(sky, [176, 172, 188], light ? 0.7 : 0.5),
    puddleCss: css(mixRGB(sky, glow, 0.35)), puddleRimCss: css(light ? [255, 255, 255] : mixRGB(glow, [255, 255, 255], 0.4)),
    glowHex: hex(glow),
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
        const R = Math.max(16, Math.round((r * 1.5) / 16) * 16), s = glowSprite(sp.glowHex, R, o.go);
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
    const R = 64, s = glowSprite(sp.warmHex, R, o.go), bx = x + o.slant * h;
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
  g.strokeStyle = css(sp.rain, o.alpha * (sp.light ? 0.14 + 0.26 * zm : 0.22 + 0.42 * zm));
  g.lineWidth = sp.light ? 0.7 + 0.8 * zm : 0.8 + 1.1 * zm;
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
    const R = Math.max(16, Math.round((r * 2.1) / 8) * 8), gs = glowSprite(sp.glowHex, R, o.go);
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
    const x = (c.drawX(a) + c.drawX(b)) / 2, y = (c.y[a] + c.y[b]) / 2, s = glowSprite(sp.warmHex, 32, o.go);
    g.globalCompositeOperation = o.blend;
    g.globalAlpha = 0.32 * breathe * o.alpha;
    g.save(); g.translate(x, y); g.scale(0.45, 1.6); g.drawImage(s, -32, -32, 64, 64); g.restore();
  } else if (kind === 'rain') {
    const d = sims.deck;
    let best = -1, bd = Infinity;
    for (let i = 0; i < d.n; i++) { const dd = Math.abs(d.drawX(i) - o.W / 2); if (dd < bd) { bd = dd; best = i; } }
    if (best < 0) return;
    const x = d.drawX(best) + d.r[best] * 0.2, y = d.y[best] + d.r[best] * 0.62 + (o.reduced ? 0 : Math.sin(o.t * 1.3) * 1.5);
    const s = glowSprite(sp.glowHex, 16, o.go);
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


// ------------------------------------------------------------------ stars --
const MEMBERS = new Int16Array(16);
const breathe = (o, aff) => aff * (o.reduced ? 0.7 : 0.55 + 0.45 * Math.sin(o.t * TAU / 2.4));   // idle halos: a 2.4 s breath

/**
 * The constellations' faint lines (they stay) and each held cluster's light on the ground (a hold brightens it).
 * o: {alpha, blend, floorY, go}. Returns lines drawn.
 */
export function drawConstellations(g, stars, sp, o) {
  if (!stars || stars.amount <= 0.01 || o.alpha <= 0.004) return 0;
  const T = sp.tint, shape = stars.style.shape, closed = shape === 'polygon' || shape === 'ring';
  let lines = 0;
  g.strokeStyle = T.starCss; g.lineWidth = 1; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let s = 0; s < 3; s++) {
    const m = stars.members(s, MEMBERS);
    if (m < 2) continue;
    g.globalAlpha = 0.26 * stars.style.dim * o.alpha * stars.amount;
    g.beginPath();
    for (let k = 0; k < m; k++) { const i = MEMBERS[k]; if (k) g.lineTo(stars.x[i], stars.y[i]); else g.moveTo(stars.x[i], stars.y[i]); }
    if (closed && m > 2) g.closePath();
    g.stroke();
    lines++;
  }
  const gs = glowSprite(T.star, 64, o.go);
  g.globalCompositeOperation = o.blend;
  for (let s = 0; s < 2; s++) {
    if (stars.cId[s] < 0 || !stars.cn[s]) continue;
    const w = 40 + 10 * Math.min(8, stars.cn[s]);
    g.globalAlpha = o.alpha * Math.min(0.42, 0.06 + 0.025 * stars.cn[s] + 0.16 * stars.cb[s]);
    g.save(); g.translate(stars.cx[s], o.floorY); g.scale(1, 0.28); g.drawImage(gs, -w, -w, 2 * w, 2 * w); g.restore();
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  return lines;
}

/**
 * Stars: which 0 = all but the held ones (back canvas), 1 = only held clusters (front), 2 = all.
 * Twinkle and cluster glow come from the sim's brightness (≤ 1.2 Hz, ±0.25; none with reduced motion).
 * o: {alpha, blend, go, t, reduced, aff (the brighter star's halo)}. Returns stars drawn.
 */
export function drawStars(g, stars, sp, o, which = 2) {
  if (!stars || stars.amount <= 0.001 || o.alpha <= 0.004) return 0;
  const T = sp.tint, small = glowSprite(T.star, 8, o.go), big = glowSprite(T.star, 14, o.go);
  let n = 0;
  g.globalCompositeOperation = o.blend;
  for (let pass = 0; pass < 2; pass++) {
    if (pass) { g.globalCompositeOperation = 'source-over'; g.fillStyle = T.coreCss; }
    for (let i = 0; i < stars.n; i++) {
      const held = stars.held(i);
      if ((which === 0 && held) || (which === 1 && !held)) continue;
      const a = stars.a[i] * o.alpha, b = stars.b[i];
      if (a <= 0.01) continue;
      const x = stars.x[i], y = stars.y[i];
      if (!pass) {
        const L = held || b > 1.15, R = L ? 14 : 8;
        g.globalAlpha = clamp(a * b * 0.75, 0, 1);
        g.drawImage(L ? big : small, x - R, y - R, 2 * R, 2 * R);
        n++;
      } else {
        const c = 1.6 + 0.6 * Math.min(1.5, b);
        g.globalAlpha = clamp(a * Math.min(1, b), 0, 1);
        g.fillRect(x - c / 2, y - c / 2, c, c);
      }
    }
  }
  const af = stars.affordance;
  if (o.aff > 0.01 && which !== 1 && af >= 0 && !stars.held(af)) {   // idle: the one brighter star breathes a halo
    const s = glowSprite(T.star, 24, o.go);
    g.globalCompositeOperation = o.blend;
    g.globalAlpha = 0.4 * breathe(o, o.aff) * stars.a[af] * o.alpha;
    g.drawImage(s, stars.x[af] - 24, stars.y[af] - 24, 48, 48);
    g.globalCompositeOperation = 'source-over';
  }
  g.globalAlpha = 1;
  return n;
}

// ------------------------------------------------------------ light pool --
/**
 * The soft beam from the realm's sun or moon (ax, ay) to the pool: one gradient per frame.
 * o: {alpha, blend}.
 */
export function drawBeam(g, ax, ay, pool, sp, o) {
  const a = o.alpha * (pool ? smoothstep(0, 0.5, pool.amount) : 0);
  if (a <= 0.004) return;
  const px = pool.x, py = pool.y, dx = px - ax, dy = py - ay, L = Math.hypot(dx, dy);
  if (L < 24) return;
  const nx = -dy / L, ny = dx / L, w0 = pool.r * 0.22, w1 = pool.r * 1.1;
  const c = pool.kind === 'sun' ? sp.tint.sunRGB : sp.tint.moonRGB, k = pool.kind === 'sun' ? 1 : 0.8;
  const gr = g.createLinearGradient(ax, ay, px, py);
  gr.addColorStop(0, css(c, 0.26 * a * k)); gr.addColorStop(0.75, css(c, 0.12 * a * k)); gr.addColorStop(1, css(c, 0.04 * a * k));
  g.globalCompositeOperation = lightOp(o);
  g.globalAlpha = 1;
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(ax + nx * w0, ay + ny * w0); g.lineTo(px + nx * w1, py + ny * w1);
  g.lineTo(px - nx * w1, py - ny * w1); g.lineTo(ax - nx * w0, ay - ny * w0);
  g.closePath(); g.fill();
  g.globalCompositeOperation = 'source-over';
}

/**
 * The light pool: warm (amber when low, crisp when high) for the sun, silver for the moon; where it
 * lands on the ground the ground warms or silvers. o.aff: the idle halo breathes. o: {alpha, blend, go, horizonY, t, reduced}.
 */
export function drawPool(g, pool, sp, o) {
  if (!pool || pool.amount <= 0.01 || o.alpha <= 0.004) return;
  const T = sp.tint, a = o.alpha * smoothstep(0, 0.6, pool.amount), r = pool.r, x = pool.x, y = pool.y;
  const R = Math.max(32, Math.round((r * 1.7) / 8) * 8), R2 = Math.max(16, Math.round((r * 0.8) / 8) * 8);
  g.globalCompositeOperation = lightOp(o);
  if (pool.kind === 'sun') {
    const low = 1 - pool.height;
    g.globalAlpha = a * 0.7 * low; g.drawImage(glowSprite(T.amber, R, o.go), x - R, y - R, 2 * R, 2 * R);
    g.globalAlpha = a * 0.7 * (1 - low); g.drawImage(glowSprite(T.crisp, R, o.go), x - R, y - R, 2 * R, 2 * R);
    g.globalAlpha = a * 0.85; g.drawImage(glowSprite(T.sun, R2, o.go), x - R2, y - R2, 2 * R2, 2 * R2);
    g.globalAlpha = a * 0.7; g.drawImage(glowSprite(T.crisp, 16, o.go), x - 16, y - 16, 32, 32);
  } else {
    g.globalAlpha = a * 0.5; g.drawImage(glowSprite(T.moon, R, o.go), x - R, y - R, 2 * R, 2 * R);
    g.globalAlpha = a * 0.65; g.drawImage(glowSprite(T.moon, R2, o.go), x - R2, y - R2, 2 * R2, 2 * R2);
  }
  if (y > o.horizonY && !pool.onWater) {   // the light lands: the ground warms (sun) or silvers (moon)
    const s = glowSprite(pool.kind === 'sun' ? T.sun : T.moon, R, o.go);
    g.globalAlpha = a * 0.32;
    g.save(); g.translate(x, y + r * 0.35); g.scale(1.3, 0.32); g.drawImage(s, -R, -R, 2 * R, 2 * R); g.restore();
  }
  g.globalCompositeOperation = 'source-over';
  if (o.aff > 0.01) {
    const br = breathe(o, o.aff);
    g.strokeStyle = pool.kind === 'sun' ? T.sunCss : T.moonCss; g.lineWidth = 2;
    g.globalAlpha = a * 0.34 * br;
    g.beginPath(); g.arc(x, y, r * (1.12 + 0.1 * br), 0, TAU); g.stroke();
  }
  g.globalAlpha = 1;
}

// sunlight on a day sky brightens it (screen) rather than painting over it; night: the usual glow blend
const lightOp = (o) => (o.light ? 'screen' : o.blend);

/** A soft glow behind the Mallow (a basking rim, the moonlit silver, the hearth, the fog lantern). */
export function drawHalo(g, b, hexC, a, o, k = 0.85) {
  if (!b || a <= 0.004) return;
  const R = Math.max(32, Math.round((Math.max(b.w, b.h) * k) / 16) * 16), s = glowSprite(hexC, R, o.go);
  g.globalCompositeOperation = o.blend;
  g.globalAlpha = clamp(a, 0, 1);
  g.drawImage(s, b.cx - R, b.mid - R, 2 * R, 2 * R);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

/** Warm light pooled on the ground at the Mallow's feet (the hearth): a flattened glow, w wide. */
export function drawGroundGlow(g, x, y, w, hexC, a, o) {
  if (a <= 0.004) return;
  const R = 64, s = glowSprite(hexC, R, o.go);
  g.globalCompositeOperation = o.blend;
  g.globalAlpha = clamp(a, 0, 1);
  g.save(); g.translate(x, y); g.scale(1, 0.3); g.drawImage(s, -w, -w, 2 * w, 2 * w); g.restore();
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

/** The light's glitter path on water: short dashes from the horizon down to the pool, shimmering with the waves. */
export function drawGlitter(g, pool, y0, waves, sp, o) {
  if (!pool || pool.amount <= 0.05 || !pool.onWater || o.alpha <= 0.004) return;
  const T = sp.tint, n = 12, y1 = pool.y, h = waves ? waves.height(pool.x) : 0, t = o.reduced ? 0 : o.t;
  g.fillStyle = pool.kind === 'sun' ? T.sunCss : T.moonCss;
  g.globalCompositeOperation = o.blend;
  for (let k = 0; k < n; k++) {
    const f = k / (n - 1), y = y0 + (y1 - y0) * f;
    const w = (6 + 28 * f) * (0.72 + 0.28 * Math.sin(t * 2.1 + k * 1.7 + h * 3));
    g.globalAlpha = o.alpha * pool.amount * (0.16 + 0.3 * f);
    g.fillRect(pool.x - w / 2 + Math.sin(k * 2.3 + t * 0.8) * 3, y, w, 1.4 + f);
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

// ----------------------------------------------------------------- fields --
/**
 * A FieldGrid (the sun's overcast haze, the fog) as one putImageData into a tiny canvas
 * (tiny: {c, g, img}, cols × rows, owned by the layer), drawn scaled up with smoothing.
 * rgb: colour; k: peak alpha. o: {alpha, body, fade (0..1: how far it thins near the Mallow),
 * top (y: nothing shows above it, a soft 60 px edge: mist rising from or sinking to the floor),
 * arc (0..1: the idle affordance, one pre-wiped arc over the Mallow)}.
 */
export function drawField(g, grid, tiny, rgb, k, o) {
  if (!grid || !tiny?.g || k * o.alpha <= 0.004) return;
  const { cols, rows, v, x0, y0, cw, ch } = grid, d = tiny.img.data, b = o.body, s = 255 * k * o.alpha;
  const top = o.top ?? -1e9, fade = o.fade || 0, arc = b ? o.arc || 0 : 0, R = b ? b.h * 0.95 : 0;
  for (let j = 0, p = 0; j < rows; j++) {
    // feathered bottom rows (the field never ends in a hard line at the floor); the top row carries on up
    // under the top bar (below), so the sky never shows a seam where the field begins
    const edge = j === rows - 1 ? 0.25 : j === rows - 2 ? 0.7 : 1;
    const y = y0 + (j + 0.5) * ch, rise = smoothstep(top - 30, top + 30, y) * edge;
    for (let i = 0; i < cols; i++, p += 4) {
      const x = x0 + (i + 0.5) * cw;
      let a = v[j * cols + i] * s * rise;
      if (a > 0.5 && fade && b) a *= stageFade(x, y, b, fade);
      if (a > 0.5 && arc > 0.01 && y < b.mid) {
        const dd = Math.abs(Math.hypot(x - b.cx, (y - b.mid) * 1.15) - R);
        if (dd < 26) a *= 1 - 0.7 * arc * (1 - dd / 26);
      }
      d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = a < 0 ? 0 : a > 255 ? 255 : a;
    }
  }
  tiny.g.putImageData(tiny.img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.globalAlpha = 1;
  g.drawImage(tiny.c, x0, y0, cols * cw, rows * ch);
  // the top row stretched up to the screen's top edge (the grid's own first half-row holds the same values)
  if (y0 > 0.5) g.drawImage(tiny.c, 0, 0, cols, 1, x0, 0, cols * cw, y0);
}

/** Dew glints for 3 s after the fog lifts (t: seconds since). */
export function drawDew(g, t, sp, o) {
  if (!(t >= 0) || t > 3 || o.alpha <= 0.004) return;
  const env = smoothstep(0, 0.4, t) * (1 - smoothstep(2.2, 3, t)), s = glowSprite(sp.tint.glowHex, 10, o.go);
  g.globalCompositeOperation = o.blend;
  for (let i = 0; i < 12; i++) {
    const x = frac(i * 0.618 + 0.11) * o.W, y = o.horizonY + (o.floorY - o.horizonY) * (0.15 + 0.8 * frac(i * 0.37 + 0.5));
    const tw = o.reduced ? 1 : 0.6 + 0.4 * Math.sin(t * TAU * (0.4 + 0.6 * frac(i * 0.29)) + i);   // ≤ 1 Hz
    g.globalAlpha = o.alpha * env * 0.6 * tw;
    g.drawImage(s, x - 10, y - 10, 20, 20);
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------- wind --
/**
 * Silk ribbons: each a smooth curve through its chain, unspooled by the presence (enter) or
 * unravelling (leave); a wide faint pass, then a fine bright one. o.aff: one ribbon end lifts.
 * Returns ribbons drawn.
 */
export function drawRibbons(g, rib, sp, o) {
  if (!rib || rib.amount <= 0.01 || o.alpha <= 0.004) return 0;
  const m = Math.max(2, Math.round(rib.segs * smoothstep(0, 1, rib.amount))), a = o.alpha * smoothstep(0, 0.4, rib.amount);
  let affI = -1;
  if (o.aff > 0.01) { let bd = Infinity; for (let i = 0; i < rib.n; i++) { const d = Math.abs(rib.px[i * rib.capS] - o.W / 2); if (d < bd) { bd = d; affI = i; } } }
  const lift = 12 * breathe(o, o.aff);
  g.strokeStyle = sp.tint.ribbonCss; g.lineCap = 'round'; g.lineJoin = 'round';
  // silk, not thread: a wide soft sheen, the ribbon's body, then a fine light edge
  for (let pass = 0; pass < 3; pass++) {
    g.lineWidth = RIB_W[pass];
    g.globalAlpha = a * RIB_A[pass];
    g.beginPath();
    for (let i = 0; i < rib.n; i++) {
      const b0 = i * rib.capS, up = i === affI ? lift : 0;
      g.moveTo(rib.px[b0], ribY(rib, b0, 0, m, up));
      for (let k = 1; k < m - 1; k++) {
        const y = ribY(rib, b0, k, m, up);
        g.quadraticCurveTo(rib.px[b0 + k], y, (rib.px[b0 + k] + rib.px[b0 + k + 1]) / 2, (y + ribY(rib, b0, k + 1, m, up)) / 2);
      }
      g.lineTo(rib.px[b0 + m - 1], ribY(rib, b0, m - 1, m, up));
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  return rib.n;
}

const RIB_W = [13, 5, 1.3], RIB_A = [0.06, 0.15, 0.46];
// a ribbon point's y; `up` lifts the last few points (the idle affordance)
const ribY = (rib, b0, k, m, up) => rib.py[b0 + k] - (up && k > m - 5 ? (up * (k - (m - 5))) / 4 : 0);

/** Seed fluffs riding the flow. */
export function drawFluffs(g, f, sp, o) {
  if (!f || f.amount <= 0.01 || o.alpha <= 0.004) return;
  const s = glowSprite('#ffffff', 7, o.go), a = o.alpha * smoothstep(0, 0.6, f.amount);
  g.globalCompositeOperation = o.blend;
  for (let i = 0; i < f.n; i++) { const r = 7 * f.sz[i]; g.globalAlpha = a * 0.5; g.drawImage(s, f.x[i] - r, f.y[i] - r, 2 * r, 2 * r); }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = sp.tint.coreCss;
  for (let i = 0; i < f.n; i++) { g.globalAlpha = a * 0.8; g.fillRect(f.x[i] - 1, f.y[i] - 1, 2, 2); }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ water --
const ROWS = [0.05, 0.16, 0.34, 0.6];   // crest rows down the water band (perspective: further rows flatter)

/**
 * Swells and ripples on the realm's water band (y0..y1): crests only where the water is moving
 * (calm water is the realm's own), a lit crest riding each swell (gold in Warm glow) with a glint.
 * Returns crests drawn.
 */
export function drawWater(g, waves, y0, y1, sp, o) {
  if (!waves || waves.amount <= 0.01 || o.alpha <= 0.004) return 0;
  const live = waves.swells();
  if (waves.energy < 0.004 && !live) return 0;
  const T = sp.tint, W = o.W, N = 32;
  let crests = 0;
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = T.crestCss;
  for (let r = 0; r < ROWS.length; r++) {
    const f = ROWS[r], yr = y0 + (y1 - y0) * f, amp = (5 + 20 * f) * waves.motion;
    g.globalAlpha = o.alpha * waves.amount * (0.2 + 0.3 * f);
    g.lineWidth = 0.8 + 1.6 * f;
    g.beginPath();
    let pen = false;
    for (let k = 0; k <= N; k++) {
      const x = (k / N) * W, h = waves.height(x);
      if (Math.abs(h) < 0.05) { pen = false; continue; }
      const y = yr - h * amp;
      if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; }
    }
    g.stroke();
    crests++;
  }
  for (let s = 0; s < waves.maxSwells; s++) {
    if (!waves.son[s]) continue;
    const f = 0.34, yr = y0 + (y1 - y0) * f, amp = (5 + 20 * f) * waves.motion, sx = waves.sx[s], sw = waves.sw[s], gold = !!waves.sg[s];
    g.strokeStyle = gold ? T.goldCss : T.crestCss;
    g.globalAlpha = o.alpha * clamp(waves.sa[s] * 1.4, 0, 0.85);
    g.lineWidth = 2.4;
    g.beginPath();
    for (let k = 0; k <= 10; k++) { const x = sx - sw + (2 * sw * k) / 10, y = yr - waves.height(x) * amp; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    const gs = glowSprite(gold ? T.goldHex : T.glowHex, 16, o.go), yy = yr - waves.height(sx) * amp;
    g.globalCompositeOperation = o.blend;
    g.globalAlpha = o.alpha * clamp(waves.sa[s], 0, 0.7);
    g.drawImage(gs, sx - 16, yy - 16, 32, 32);
    g.globalCompositeOperation = 'source-over';
    crests++;
  }
  g.globalAlpha = 1;
  return crests;
}

/** Puddles in dry realms after rain: they reflect the sky and glow colours, glint, and ripple when touched (rip: ages). */
export function drawPuddles(g, pud, rip, sp, o) {
  const vis = pud ? pud.visible : 0;
  if (vis <= 0.01 || o.alpha <= 0.004) return;
  const T = sp.tint, s = pud.scale * (0.6 + 0.4 * vis), gl = glowSprite(T.glowHex, 16, o.go);
  for (let k = 0; k < 2; k++) {
    const x = pud.e[4 * k], y = pud.e[4 * k + 1], rx = pud.e[4 * k + 2] * s, ry = pud.e[4 * k + 3] * s;
    if (rx <= 0) continue;
    g.globalAlpha = o.alpha * vis * 0.72; g.fillStyle = T.puddleCss;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = T.puddleRimCss; g.lineWidth = 1;
    g.globalAlpha = o.alpha * vis * 0.3; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.stroke();
    g.globalAlpha = o.alpha * vis * 0.6; g.beginPath(); g.ellipse(x, y - ry * 0.15, rx * 0.92, ry * 0.8, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    const age = rip ? rip[k] : 9;
    for (let j = 0; j < 2 && age < 1.4; j++) {
      const q = clamp((age - j * 0.3) / 1, 0, 1);
      if (q <= 0 || q >= 1) continue;
      g.globalAlpha = o.alpha * vis * 0.55 * (1 - q);
      g.beginPath(); g.ellipse(x, y, rx * (0.2 + 0.8 * q), ry * (0.2 + 0.8 * q), 0, 0, TAU); g.stroke();
    }
    g.globalCompositeOperation = o.blend;
    g.globalAlpha = o.alpha * vis * 0.42 * (o.reduced ? 1 : 0.75 + 0.25 * Math.sin(o.t * 1.1 + k * 2));
    g.drawImage(gl, x + rx * 0.35 - 16, y - ry * 0.2 - 16, 32, 32);
    g.globalCompositeOperation = 'source-over';
  }
  g.globalAlpha = 1;
}

// ----------------------------------------------------------------- embers --
const EMB_SHOW = new Float32Array(32), EMB_Y = new Float32Array(32);

/**
 * Embers: they kindle in outward from the Mallow (enter) and drift up and fade (leave); waiting ones
 * are dim, kindled ones swell and glow. The hearth's warm rings. o.aff: the nearest waiting ember flickers.
 * Returns embers drawn.
 */
export function drawEmbers(g, emb, sp, o) {
  if (!emb || emb.amount <= 0.001 || o.alpha <= 0.004) return 0;
  const T = sp.tint, b = o.body, entering = emb.target >= emb.amount, k = smoothstep(0, 1, emb.amount), reach = (o.W + o.H) * 0.6;
  const small = glowSprite(T.ember, 11, o.go), big = glowSprite(T.ember, 18, o.go), n = Math.min(emb.n, 32);
  let drawn = 0, aff = -1, ad = Infinity;
  for (let i = 0; i < n; i++) {
    let y = emb.y[i], show;
    const d = b ? Math.hypot(emb.x[i] - b.cx, y - b.mid) : 0;
    if (entering) show = clamp((k * (reach + 80) - d) / 80, 0, 1);
    else { show = k; if (!o.reduced) y -= (1 - k) * 46; }
    EMB_SHOW[i] = show * o.alpha; EMB_Y[i] = y;
    if (emb.lit[i] < 0.01 && d < ad) { ad = d; aff = i; }
  }
  g.globalCompositeOperation = o.blend;
  for (let i = 0; i < n; i++) {
    const a = EMB_SHOW[i], lit = emb.lit[i];
    if (a <= 0.01) continue;
    if (lit > 0.01) { const R = 10 + 8 * lit; g.globalAlpha = a * (0.3 + 0.5 * lit); g.drawImage(big, emb.x[i] - R, EMB_Y[i] - R, 2 * R, 2 * R); }
    else { g.globalAlpha = a * 0.42; g.drawImage(small, emb.x[i] - 11, EMB_Y[i] - 11, 22, 22); }
    drawn++;
  }
  if (o.aff > 0.01 && aff >= 0) { g.globalAlpha = EMB_SHOW[aff] * 0.5 * breathe(o, o.aff); g.drawImage(big, emb.x[aff] - 18, EMB_Y[aff] - 18, 36, 36); }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = T.emberCss;
  for (let i = 0; i < n; i++) {
    const a = EMB_SHOW[i], lit = emb.lit[i];
    if (a <= 0.01) continue;
    const c = 2 + 1.6 * lit;
    g.globalAlpha = a * (0.55 + 0.45 * lit);
    g.fillRect(emb.x[i] - c / 2, EMB_Y[i] - c / 2, c, c);
  }
  if (emb.ringR > 2) {   // the hearth: warm rings radiating from the Mallow
    const fade = clamp(1 - emb.ringR / (0.9 * Math.max(o.W, o.H)), 0, 1);
    g.strokeStyle = T.emberCss;
    for (let j = 0; j < 2; j++) {
      const R = emb.ringR * (j ? 0.7 : 1);
      g.lineWidth = j ? 1.5 : 2.5;
      g.globalAlpha = o.alpha * k * fade * (j ? 0.18 : 0.34);
      g.beginPath(); g.ellipse(emb.ringX, emb.ringY, R, R * 0.62, 0, 0, TAU); g.stroke();
    }
  }
  g.globalAlpha = 1;
  return drawn;
}

/** The warm ribbon a drag lays in Warm glow (trail: ring buffers per pointer, ages in seconds). */
export function drawTrail(g, tr, sp, o) {
  if (!tr || !tr.live || o.alpha <= 0.004) return;
  const L = tr.len;
  g.strokeStyle = sp.tint.emberCss; g.lineCap = 'round';
  g.globalCompositeOperation = o.blend;
  for (let pass = 0; pass < 2; pass++) {
    g.lineWidth = pass ? 2.6 : 11;
    for (let k = 0; k < tr.n; k++) {
      const base = k * L, hd = tr.head[k];
      for (let j = 1; j < L; j++) {
        const i0 = base + ((hd + j - 1) % L), i1 = base + ((hd + j) % L), a0 = tr.age[i0], a1 = tr.age[i1];
        if (a0 >= tr.life || a1 >= tr.life || tr.brk[i1] || a1 > a0) continue;   // older → newer, one stroke at a time
        g.globalAlpha = o.alpha * (pass ? 0.75 : 0.16) * (1 - a1 / tr.life);
        g.beginPath(); g.moveTo(tr.x[i0], tr.y[i0]); g.lineTo(tr.x[i1], tr.y[i1]); g.stroke();
      }
    }
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}
