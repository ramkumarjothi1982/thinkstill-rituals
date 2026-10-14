// Mallow Nightlight: how bright and how warm the night looks (pure; no DOM).
//
// Brightness and colour temperature become three things:
//   the world grade   multiplied into the painted still (and the live window's multiply overlay)
//   the Mallow grade  the mesh shader's uGrade (rig.setGrade); the 2D fallback gets brightness only
//   the light         the Mallow's own glow, the halo, the sky sprites and two chrome tokens
// The world always dims further than the Mallow (mallowB ≥ worldB, and at
// least 2.5× at low brightness), and the Mallow only takes 40 % of the world's
// colour shift, so the artwork never looks washed out, masked or sepia. No
// Kelvin maths: five authored steps, interpolated.
//
//   const look = nightLook({ brightness, temp, world, mallow, glowHex }, look);   // no allocation after the first call
//   rig.setGrade(look.mallowGrade);

import { clamp, lerp } from '../../core/math.js';
import { FlashGate, rgba } from '../../core/effects.js';
import { COPY } from './copy.js';

const N = COPY.sheet.light.names;
/** [name, world gains [r, g, b], light colour] from Moon (temp 0) to Ember (temp 1). Blue strictly falls. */
export const TEMPS = Object.freeze([
  Object.freeze([N[0], Object.freeze([0.86, 0.93, 1.00]), '#cfe0ff']),
  Object.freeze([N[1], Object.freeze([1.00, 0.95, 0.88]), '#ffe9cf']),
  Object.freeze([N[2], Object.freeze([1.00, 0.86, 0.70]), '#ffd29a']),
  Object.freeze([N[3], Object.freeze([1.00, 0.76, 0.52]), '#ffb86b']),
  Object.freeze([N[4], Object.freeze([1.00, 0.64, 0.34]), '#ff9a4a']),
]);
export const MALLOW_SHIFT = 0.4;   // the Mallow takes this much of the world's colour shift
const DEFAULT_GLOW = '#ffd29a';

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// temp → segment index and fraction
function seg(temp) {
  const x = clamp(num(temp, 0.5), 0, 1) * (TEMPS.length - 1);
  const i = Math.min(TEMPS.length - 2, Math.floor(x));
  return [i, x - i];
}

/** World gains [r, g, b] for a colour temperature (0 Moon … 1 Ember), piecewise linear over TEMPS. */
export function envGains(temp, out = [0, 0, 0]) {
  const [i, f] = seg(temp), a = TEMPS[i][1], b = TEMPS[i + 1][1];
  for (let c = 0; c < 3; c++) out[c] = lerp(a[c], b[c], f);
  return out;
}

/** The Mallow's gains: 1 − 0.4·(1 − world gain), so it warms a little and never turns orange. */
export function mallowGains(temp, out = [0, 0, 0]) {
  envGains(temp, out);
  for (let c = 0; c < 3; c++) out[c] = 1 - MALLOW_SHIFT * (1 - out[c]);
  return out;
}

function parseHex(hex) {
  let s = typeof hex === 'string' ? hex.trim().replace(/^#/, '') : '';
  if (s.length === 3) s = s.replace(/./g, (ch) => ch + ch);
  const n = /^[0-9a-f]{6}$/i.test(s) ? parseInt(s, 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const hex2 = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');

/** Mix two hex colours (t = 0 → a, 1 → b); '#rrggbb'. Unreadable input counts as black. */
export function mixHex(a, b, t) {
  const A = parseHex(a), B = parseHex(b), k = clamp(num(t, 0), 0, 1);
  return `#${hex2(lerp(A[0], B[0], k))}${hex2(lerp(A[1], B[1], k))}${hex2(lerp(A[2], B[2], k))}`;
}

/** The temperature's own light colour (interpolated between the five steps). */
export function tempColour(temp) {
  const [i, f] = seg(temp);
  return mixHex(TEMPS[i][2], TEMPS[i + 1][2], f);
}

/** The light: 40 % of the palette (or the Mallow's) glow with 60 % of the temperature colour. */
export function lightColour(glowHex, temp) {
  return mixHex(glowHex || DEFAULT_GLOW, tempColour(temp), 0.6);
}

/** WCAG relative luminance of a hex colour (tests, contrast checks). */
export function luminance(hex) {
  const c = parseHex(hex).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/**
 * Everything the screen needs from the settings and the displayed levels.
 *   brightness B 0.05..1 · temp 0..1 · world Lw, mallow Lm 0..1 (displayed levels) · glowHex
 * → { worldB, worldGain, worldGrade, mallowB, mallowGain, mallowGrade, glow, haloAlpha, warmth, light, star }
 *   worldB = (0.10 + 0.90·B^1.3)·Lw          mallowB = (0.45 + 0.55·B)·(0.15 + 0.85·Lm)
 *   glow = (0.35 + 0.5·B)·Lm                 haloAlpha = (0.18 + 0.4·B^0.7)·Lm
 *   warmth = 0.2 + 0.5·temp (the realm's warmth axis, before each world's cap)
 * Arrays are reused; the colour strings are rebuilt only when the glow or the temperature changes.
 */
export function nightLook({ brightness, temp, world, mallow, glowHex } = {}, out = {}) {
  const B = clamp(num(brightness, 0.4), 0, 1), T = clamp(num(temp, 0.5), 0, 1);
  const Lw = clamp(num(world, 1), 0, 1), Lm = clamp(num(mallow, 1), 0, 1);
  out.worldB = (0.10 + 0.90 * B ** 1.3) * Lw;
  out.mallowB = (0.45 + 0.55 * B) * (0.15 + 0.85 * Lm);
  out.glow = (0.35 + 0.5 * B) * Lm;
  out.haloAlpha = (0.18 + 0.4 * B ** 0.7) * Lm;
  out.warmth = 0.2 + 0.5 * T;
  out.worldGain = envGains(T, out.worldGain || [0, 0, 0]);
  out.mallowGain = mallowGains(T, out.mallowGain || [0, 0, 0]);
  const wg = out.worldGrade || (out.worldGrade = [0, 0, 0]), mg = out.mallowGrade || (out.mallowGrade = [0, 0, 0]);
  for (let c = 0; c < 3; c++) { wg[c] = out.worldGain[c] * out.worldB; mg[c] = out.mallowGain[c] * out.mallowB; }
  const g = glowHex || DEFAULT_GLOW;
  if (out._glowHex !== g || out._temp !== T) {
    out._glowHex = g; out._temp = T;
    out.light = lightColour(g, T);
    out.star = mixHex('#f4f1ff', out.light, 0.25);   // twinkles: mostly white, touched by the light
  }
  return out;
}

/**
 * Night chrome tokens that follow the light (custom properties for
 * .screen.nightlight): the light itself, and the selected chip's fill tinted
 * by it. Text colours stay the fixed night tokens, so contrast never changes.
 */
export function chromeTokens(look, out = {}) {
  const light = look?.light || DEFAULT_GLOW;
  if (out['--nl-light'] !== light) {
    out['--nl-light'] = light;
    out['--nl-chip-on'] = rgba(mixHex(light, '#ffd696', 0.5), 0.24);
  }
  return out;
}

/**
 * Photosafe brightenings (touch-lamp swells): at most one start per 2 s,
 * each rising over ≥ 300 ms (600 ms by default). A refused request returns
 * null; the caller only extends the hold of the swell already showing.
 * Wraps the shared FlashGate (SHARED L7), whose log is kept for tests.
 */
export class LightLimiter {
  constructor({ now = () => performance.now(), gapMs = 2000, riseMs = 600 } = {}) {
    this.gate = new FlashGate({ max: 1, windowMs: gapMs, now });
    this.riseMs = Math.max(300, riseMs);
  }

  request(k = 1, { riseMs = this.riseMs } = {}) {
    if (!this.gate.allow('swell')) return null;
    return { k: clamp(num(k, 1), 0, 1), riseMs: Math.max(300, num(riseMs, this.riseMs)) };
  }

  /** The gate's ring of { t, kind, ok } (newest last). */
  get log() { return this.gate.log; }
}
