// Thought Mallow styles: how each feeling looks and moves, and how the verbs
// (soften, slow, make space, settle, transform, move farther) change that.
//
// Pure data + maths (no DOM): Node tests the whole table.
//
// A Thought Mallow is never one of the seven. Its silhouette is a rounder
// superellipse (n 2.25 against the family's 3.0), it is translucent jelly
// with an inner light (no sugar-fuzz, no painted art), its face is a simple
// bean-eyed one, and its tints are soft pastels that sit away from every
// Mallow's body colour (tests/thought.test.mjs measures the distance).
//
// Every style is written "at full feeling". deriveLook() blends it with the
// resting face by how tense the thought is right now, then with the relieved
// face and the calm palette by how much it has been soothed or transformed.
// Nothing here ever removes a thought: the strongest verb only changes how it
// looks and moves.

import { getEmotion } from '../../data/emotions.js';

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Body silhouette (lattice uv): rounder than the seven (their family mask fits n ≈ 3.0). */
export const SHAPE = Object.freeze({ n: 2.25, aspect: 1.06, flatBottom: 0.1, dimple: 0.016 });

/** The feelings a Thought Mallow can carry (ids of THOUGHT_STYLES). */
export const THOUGHT_KINDS = Object.freeze(['anger', 'frustration', 'anxiety', 'overwhelm', 'sadness', 'loneliness', 'embarrassment', 'restlessness', 'neutral']);

// emotion words and ids (the shell's quick chips, the A–Z picker, the director's
// FLOW ids, plain English) → a style id
const ALIAS = {
  anger: 'anger', angry: 'anger', mad: 'anger', rage: 'anger', fury: 'anger', furious: 'anger', outrage: 'anger', hostility: 'anger', resentment: 'anger', bitterness: 'anger', indignation: 'anger',
  frustration: 'frustration', frustrated: 'frustration', irritation: 'frustration', irritated: 'frustration', annoyance: 'frustration', annoyed: 'frustration', impatience: 'frustration',
  irritable: 'frustration', grumpy: 'frustration', cranky: 'frustration', aggravation: 'frustration', hangry: 'frustration',
  anxiety: 'anxiety', anxious: 'anxiety', worry: 'anxiety', worried: 'anxiety', nervous: 'anxiety', nervousness: 'anxiety', fear: 'anxiety', scared: 'anxiety', panic: 'anxiety', dread: 'anxiety',
  stress: 'anxiety', stressed: 'anxiety', unease: 'anxiety', 'on-edge': 'anxiety', jittery: 'anxiety', tense: 'anxiety', apprehension: 'anxiety', insecurity: 'anxiety',
  overwhelm: 'overwhelm', overwhelmed: 'overwhelm', overthinking: 'overwhelm', rumination: 'overwhelm', ruminating: 'overwhelm', overstimulated: 'overwhelm', frazzled: 'overwhelm',
  confusion: 'overwhelm', confused: 'overwhelm', 'racing-thoughts': 'overwhelm',
  sadness: 'sadness', sad: 'sadness', sorrow: 'sadness', grief: 'sadness', hurt: 'sadness', disappointment: 'sadness', disappointed: 'sadness', heartache: 'sadness', gloom: 'sadness',
  down: 'sadness', low: 'sadness', melancholy: 'sadness', tearful: 'sadness', 'heavy-hearted': 'sadness',
  loneliness: 'loneliness', lonely: 'loneliness', isolated: 'loneliness', isolation: 'loneliness', 'left-out': 'loneliness', rejected: 'loneliness', rejection: 'loneliness', excluded: 'loneliness',
  embarrassment: 'embarrassment', embarrassed: 'embarrassment', shame: 'embarrassment', ashamed: 'embarrassment', humiliation: 'embarrassment', humiliated: 'embarrassment',
  awkward: 'embarrassment', awkwardness: 'embarrassment', 'self-consciousness': 'embarrassment', sheepish: 'embarrassment', flustered: 'embarrassment', exposed: 'embarrassment', shy: 'embarrassment', shyness: 'embarrassment',
  restlessness: 'restlessness', restless: 'restlessness', fidgety: 'restlessness', bored: 'restlessness', boredom: 'restlessness', agitated: 'restlessness', impatient: 'restlessness',
  neutral: 'neutral', none: 'neutral', other: 'neutral', 'something-else': 'neutral', '': 'neutral',
};
const BY_FAMILY = { anger: 'anger', fear: 'anxiety', sadness: 'sadness', loneliness: 'loneliness', shame: 'embarrassment', boredom: 'restlessness', confusion: 'overwhelm' };

/** Any emotion id or word (or an {id} / [{id}] emotions list) → a THOUGHT_STYLES id. */
export function normaliseEmotion(e) {
  if (Array.isArray(e)) e = e[0];
  if (e && typeof e === 'object') e = e.id;
  const k = String(e ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (ALIAS[k]) return ALIAS[k];
  const fam = getEmotion(k)?.family;
  return BY_FAMILY[fam] || 'neutral';
}

// A face at rest (resting curiosity), and the relieved face every verb leads to.
// eyeOpen: lid opening (1 = wide bean) · lid: heavy top lid (0..1 of the eye) ·
// lidTilt: + inner corner lower (cross), − inner corner higher (worried / sad) ·
// browA: brow opacity · browTilt: + V (cross), − worried · browY: + raised ·
// curve: mouth −1 frown … +1 smile · mouthW: width · wave: wobble · open: open
// mouth · skew: pressed to one side · puff: cheek puff · blush · lines: blush
// lines · sweat · lookX/lookY: gaze · closed: soft closed (content) eyes
export const FACE_KEYS = Object.freeze(['eyeOpen', 'lid', 'lidTilt', 'browA', 'browTilt', 'browY', 'curve', 'mouthW', 'wave', 'open', 'skew', 'puff', 'blush', 'lines', 'sweat', 'lookX', 'lookY', 'closed']);
export const REST_FACE = Object.freeze({ eyeOpen: 0.95, lid: 0, lidTilt: 0, browA: 0, browTilt: 0, browY: 0, curve: 0.18, mouthW: 0.85, wave: 0, open: 0, skew: 0, puff: 0, blush: 0.3, lines: 0, sweat: 0, lookX: 0, lookY: 0, closed: 0 });
export const RELIEVED_FACE = Object.freeze({ eyeOpen: 0.4, lid: 0, lidTilt: 0, browA: 0, browTilt: 0, browY: 0.1, curve: 0.72, mouthW: 0.9, wave: 0, open: 0.1, skew: 0, puff: 0, blush: 0.5, lines: 0, sweat: 0, lookX: 0, lookY: 0.08, closed: 0.88 });

// Motion signatures (fractions of the body height P, Hz, rates per second):
// bob/bobHz breathing float · tremble/trembleHz shiver · dart gaze darts per
// second · hop small hops per second · sway side-to-side · sink how far it
// sinks (× P) · drift how strongly it drifts away from others · shrink (0..1)
const M = (o) => Object.freeze({ bob: 0.03, bobHz: 0.42, tremble: 0, trembleHz: 0, dart: 0, hop: 0, sway: 0, sink: 0, drift: 0, shrink: 0, crowd: 0, ...o });
// fx: crackle (micro-arcs/s) · steam (huffs/s) · rain (drops/s) · motes (inner lights)
const FX = (o) => Object.freeze({ crackle: 0, steam: 0, rain: 0, motes: 5, chatter: 0, heat: 0, ...o });
const F = (o) => Object.freeze({ ...REST_FACE, ...o });

// Tints: light (the lit core), mid (the jelly), deep (the rim), glow (inner
// light) and ink (the face). Alpha is the jelly's opacity.
const tint = (light, mid, deep, glow, ink) => Object.freeze({ light, mid, deep, glow, ink });

export const THOUGHT_STYLES = Object.freeze({
  anger: Object.freeze({
    id: 'anger', label: 'tense and crackling', tension: 0.92, charge: 0.85, alpha: 0.8,
    tint: tint('#ffd2bd', '#ff8f78', '#d93b5c', '#ffb07a', '#3d0a1f'),
    face: F({ eyeOpen: 0.82, lid: 0.32, lidTilt: 0.95, browA: 1, browTilt: 1, browY: -0.25, curve: -0.5, mouthW: 0.5, wave: 0.12, puff: 1, blush: 0.75, lookY: 0 }),
    motion: M({ bob: 0.012, bobHz: 0.6, tremble: 0.012, trembleHz: 17 }),
    body: Object.freeze({ squash: 0.05, puff: 1.4, droop: 0 }),
    fx: FX({ crackle: 2.6, heat: 1 }),
  }),
  frustration: Object.freeze({
    id: 'frustration', label: 'huffing steam', tension: 0.78, charge: 0.7, alpha: 0.78,
    tint: tint('#ffe8c2', '#ffb35c', '#df7524', '#ffd08a', '#3a1a05'),
    face: F({ eyeOpen: 0.72, lid: 0.42, lidTilt: 0.45, browA: 0.95, browTilt: 0.55, browY: -0.15, curve: -0.38, mouthW: 0.62, skew: 0.7, puff: 0.55, blush: 0.4 }),
    motion: M({ bob: 0.02, bobHz: 0.5, tremble: 0.004, trembleHz: 12 }),
    body: Object.freeze({ squash: 0.07, puff: 0.5, droop: 0 }),
    fx: FX({ steam: 0.42, heat: 0.45 }),
  }),
  anxiety: Object.freeze({
    id: 'anxiety', label: 'restless and trembling', tension: 0.8, charge: 0.92, alpha: 0.74,
    tint: tint('#f1ecff', '#c7b8ff', '#7f69e0', '#e2d8ff', '#22144a'),
    face: F({ eyeOpen: 1.18, lid: 0, lidTilt: -0.35, browA: 0.95, browTilt: -0.95, browY: 0.35, curve: -0.3, mouthW: 0.58, wave: 1, open: 0.08, blush: 0.2, sweat: 1 }),
    motion: M({ bob: 0.02, bobHz: 0.95, tremble: 0.016, trembleHz: 11, dart: 1.7, sway: 0.02 }),
    body: Object.freeze({ squash: -0.02, puff: 0, droop: 0 }),
    fx: FX({}),
  }),
  overwhelm: Object.freeze({
    id: 'overwhelm', label: 'several voices at once', tension: 0.74, charge: 0.8, alpha: 0.76,
    tint: tint('#f7e2ff', '#dcaaf0', '#9a58c4', '#f2d2ff', '#2e0f3e'),
    face: F({ eyeOpen: 1.12, browA: 0.65, browTilt: -0.6, browY: 0.3, curve: -0.2, mouthW: 0.5, wave: 0.35, open: 0.4, blush: 0.25, sweat: 0.45 }),
    motion: M({ bob: 0.025, bobHz: 0.8, tremble: 0.004, trembleHz: 9, dart: 1.2, crowd: 1 }),
    body: Object.freeze({ squash: 0, puff: 0, droop: 0 }),
    fx: FX({ chatter: 1 }),
  }),
  sadness: Object.freeze({
    id: 'sadness', label: 'slow and heavy', tension: 0.62, charge: 0.3, alpha: 0.78,
    tint: tint('#dde3f4', '#7f8fc0', '#43568f', '#c9d4f2', '#121a3c'),
    face: F({ eyeOpen: 0.66, lid: 0.48, lidTilt: -0.85, browA: 0.8, browTilt: -0.85, browY: 0.15, curve: -0.62, mouthW: 0.66, blush: 0.15, lookY: 0.55 }),
    motion: M({ bob: 0.02, bobHz: 0.16, sink: 0.42, shrink: 0 }),
    body: Object.freeze({ squash: 0.03, puff: 0, droop: 0.85 }),
    fx: FX({ rain: 2.2, motes: 3 }),
  }),
  loneliness: Object.freeze({
    id: 'loneliness', label: 'drifting apart', tension: 0.5, charge: 0.4, alpha: 0.72,
    tint: tint('#e2f5f1', '#a3d8cc', '#4f9a98', '#d6fff5', '#0f2a2b'),
    face: F({ eyeOpen: 0.86, lid: 0.22, lidTilt: -0.4, browA: 0.45, browTilt: -0.45, curve: -0.18, mouthW: 0.5, blush: 0.2, lookY: 0.1 }),
    motion: M({ bob: 0.04, bobHz: 0.24, drift: 1, shrink: 0.35 }),
    body: Object.freeze({ squash: 0, puff: 0, droop: 0.25 }),
    fx: FX({ motes: 6 }),
  }),
  embarrassment: Object.freeze({
    id: 'embarrassment', label: 'blushing and shrinking', tension: 0.68, charge: 0.6, alpha: 0.76,
    tint: tint('#ffe3ee', '#ffa3c6', '#de6390', '#ffd0e2', '#3e0b23'),
    face: F({ eyeOpen: 0.62, lid: 0.2, lidTilt: -0.3, browA: 0.6, browTilt: -0.55, browY: 0.15, curve: 0.18, mouthW: 0.5, wave: 0.65, blush: 1.7, lines: 1, lookX: 0.55, lookY: 0.6 }),
    motion: M({ bob: 0.02, bobHz: 0.55, tremble: 0.004, trembleHz: 10, shrink: 1 }),
    body: Object.freeze({ squash: 0.02, puff: 0.2, droop: 0 }),
    fx: FX({}),
  }),
  restlessness: Object.freeze({
    id: 'restlessness', label: 'fidgeting', tension: 0.55, charge: 0.9, alpha: 0.74,
    tint: tint('#fff4c8', '#ffd96e', '#d89a22', '#fff0b0', '#3a2600'),
    face: F({ eyeOpen: 1.02, browA: 0.35, browTilt: -0.2, browY: 0.15, curve: 0, mouthW: 0.6, wave: 0.45, blush: 0.25, skew: -0.3 }),
    motion: M({ bob: 0.02, bobHz: 0.7, dart: 0.9, hop: 0.75, sway: 0.03 }),
    body: Object.freeze({ squash: 0, puff: 0, droop: 0 }),
    fx: FX({}),
  }),
  neutral: Object.freeze({
    id: 'neutral', label: 'floating', tension: 0.35, charge: 0.4, alpha: 0.72,
    tint: tint('#f6f2ff', '#d9d1f3', '#9b90c9', '#f4efff', '#1d1638'),
    face: F({}),
    motion: M({ bob: 0.035, bobHz: 0.4 }),
    body: Object.freeze({ squash: 0, puff: 0, droop: 0 }),
    fx: FX({}),
  }),
});

/** The palette a transformed thought settles into: pearl, mint and a warm inner light. */
export const CALM_TINT = tint('#fffdf4', '#c9efe0', '#76c3ad', '#ffe7a6', '#173530');

/** Belief Mallows: denser, more opaque jelly, one palette per prop (the prop is the accent). */
export const BELIEF_TINTS = Object.freeze({
  stone: tint('#ece9f4', '#aaa4c6', '#5f5884', '#e6e0ff', '#1b1633'),
  shell: tint('#fff0e8', '#f2bca9', '#c47670', '#ffe2d2', '#3a1512'),
  thread: tint('#e6f0f4', '#a3bfcd', '#587a91', '#e3f4ff', '#102330'),
  charm: tint('#fffaf0', '#e5def5', '#9c90c8', '#ffe9b0', '#1e1838'),
});

export function styleFor(emotion) { return THOUGHT_STYLES[normaliseEmotion(emotion)] || THOUGHT_STYLES.neutral; }

// ---------------------------------------------------------------- colour --
export function hexRgb(h) {
  const s = String(h).replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export function mixHex(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]); }
export function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${+clamp(a).toFixed(3)})`; }
/** Desaturate toward the colour's own luminance (0..1). */
export function soften(h, t) { const [r, g, b] = hexRgb(h); const y = 0.299 * r + 0.587 * g + 0.114 * b; return rgbHex([lerp(r, y, t), lerp(g, y, t), lerp(b, y, t)]); }

/** The tint for a style at desaturation `soft` (0..1) and calm transform `k` (0..1). */
export function tintAt(base, soft, k, out = {}) {
  for (const key of ['light', 'mid', 'deep', 'glow', 'ink']) {
    const s = soften(base[key], 0.42 * clamp(soft));
    out[key] = mixHex(key === 'light' || key === 'glow' ? mixHex(s, '#ffffff', 0.12 * clamp(soft)) : s, CALM_TINT[key], clamp(k));
  }
  return out;
}

// ----------------------------------------------------------------- look --
/**
 * How a thought looks this frame.
 *   style   a THOUGHT_STYLES entry
 *   s       { tension, charge, calm, transform, soft, settle, space, slow, intensity }
 *           (all 0..1: tension / charge are the live state, the rest the verbs' levels)
 * Returns (into `out`) { e, relief, pace, face{…FACE_KEYS}, motion{…}, body{squash, puff, droop, shrink},
 *   fx{crackle, steam, rain, motes, chatter, glow, halo}, tintK, soft }.
 */
export function deriveLook(style, s, out = makeLook()) {
  const calm = clamp(s.calm), k = clamp(s.transform), soft = clamp(s.soft), settle = clamp(s.settle), slow = clamp(s.slow);
  // e: how strongly the feeling shows now (its own tension, eased by every kind of care)
  const tension = clamp(s.tension);
  const e = clamp((0.3 + 0.7 * tension) * (1 - 0.72 * calm) * (1 - 0.92 * k) * (1 - 0.45 * settle) * (1 - 0.25 * soft));
  // relief: the relieved face and the calm light (transform leads; deep soothing gets most of the way)
  const relief = clamp(Math.max(k, 0.82 * Math.pow(calm, 1.25), 0.55 * settle * calm));
  // pace: how fast it lives (charge, eased by slowing and settling)
  const charge = clamp(s.charge);
  const pace = clamp((0.35 + 0.65 * charge) * (1 - 0.6 * slow) * (1 - 0.35 * settle) * (1 - 0.4 * calm) * (1 - 0.5 * k), 0.12, 1);
  out.e = e; out.relief = relief; out.pace = pace; out.soft = soft; out.tintK = k;
  const F0 = REST_FACE, FE = style.face, FR = RELIEVED_FACE, f = out.face;
  for (const key of FACE_KEYS) f[key] = lerp(lerp(F0[key], FE[key], e), FR[key], relief);
  const mo = style.motion, m = out.motion;
  m.bob = lerp(mo.bob * (0.6 + 0.4 * e), 0.022, relief) * (1 - 0.6 * settle);
  m.bobHz = lerp(mo.bobHz, 0.22, relief) * (0.55 + 0.45 * pace);
  m.tremble = mo.tremble * e * pace;
  m.trembleHz = mo.trembleHz;
  m.dart = mo.dart * e * pace;
  m.hop = mo.hop * e * pace;
  m.sway = mo.sway * e;
  m.sink = mo.sink * e + 0.12 * settle;
  m.drift = mo.drift * e;
  m.shrink = mo.shrink * e;
  m.crowd = mo.crowd * e * (1 - clamp(s.space));
  const b = style.body, bo = out.body;
  bo.squash = b.squash * e + 0.035 * settle;
  bo.puff = b.puff * e;
  bo.droop = b.droop * e;
  bo.shrink = m.shrink;
  const fx = style.fx, fo = out.fx;
  // photosafe: arcs ≤ 3 a second, steam huffs and rain stay gentle
  fo.crackle = Math.min(3, fx.crackle * e * (0.5 + 0.5 * pace));
  fo.steam = fx.steam * e * (0.5 + 0.5 * pace);
  fo.rain = fx.rain * e;
  fo.motes = fx.motes;
  fo.chatter = fx.chatter * e * (0.4 + 0.6 * pace);
  fo.heat = (fx.heat || 0) * e;
  fo.glow = 0.35 + 0.45 * relief + 0.15 * soft;
  fo.halo = smooth(0.15, 0.9, relief);
  return out;
}

export function makeLook() {
  const face = {};
  for (const k of FACE_KEYS) face[k] = REST_FACE[k];
  return { e: 0, relief: 0, pace: 1, soft: 0, tintK: 0, face,
    motion: { bob: 0, bobHz: 0, tremble: 0, trembleHz: 0, dart: 0, hop: 0, sway: 0, sink: 0, drift: 0, shrink: 0, crowd: 0 },
    body: { squash: 0, puff: 0, droop: 0, shrink: 0 },
    fx: { crackle: 0, steam: 0, rain: 0, motes: 0, chatter: 0, heat: 0, glow: 0, halo: 0 } };
}

/** Siblings an overwhelm / overthinking thought brings: 3, or 4 when it is strong. */
export function siblingCount(style, intensity = 0.6) { return style?.fx?.chatter ? (intensity >= 0.6 ? 4 : 3) : 0; }

// ------------------------------------------------------------- outline --
/** n points around the superellipse body in lattice uv (clockwise on screen), flat-ish base, a shallow top dimple. */
export function outlineUV(n = 44, shape = SHAPE) {
  const out = new Float32Array(2 * n), e = 2 / shape.n;
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    let u = 0.5 + 0.5 * Math.sign(c) * Math.pow(Math.abs(c), e);
    let v = 0.5 + 0.5 * Math.sign(s) * Math.pow(Math.abs(s), e);
    // a softly flattened base (it rests on its own cushion of air)…
    if (v > 0.5) v = 0.5 + (v - 0.5) * (1 - shape.flatBottom * Math.pow((v - 0.5) * 2, 6)) / (1 - shape.flatBottom);
    // …and a shallow dimple on top, so it reads as a soft drop, not a ball
    if (v < 0.5) v += shape.dimple * Math.exp(-(((u - 0.5) / 0.11) ** 2)) * Math.pow((0.5 - v) * 2, 4);
    out[2 * i] = clamp(u); out[2 * i + 1] = clamp(v);
  }
  return out;
}

/** Inside the superellipse (lattice uv), with soft edge `pad` (uv). */
export function insideUV(u, v, pad = 0, shape = SHAPE) {
  const x = Math.abs(u - 0.5) / (0.5 + pad), y = Math.abs(v - 0.5) / (0.5 + pad);
  return Math.pow(x, shape.n) + Math.pow(y, shape.n) <= 1;
}

// ---------------------------------------------------------------- words --
/** How much of the words a tag shows at depth z (0 near … 1 far). The tag is never smaller than 15 px. */
export const TAG_MIN_PX = 15;
export function tagBudget(z) { return z < 0.34 ? 96 : z < 0.68 ? 48 : 26; }

/** The start of the person's words, cut at a word and marked "…" (never a later clause, never reworded). */
export function wordsExcerpt(text, max) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  let out = '';
  for (const w of t.split(' ')) { if ((out ? out.length + 1 : 0) + w.length > max - 1) break; out = out ? `${out} ${w}` : w; }
  // a single word longer than the budget: cut inside it (by code point, so emoji stay whole)
  if (!out) out = Array.from(t).slice(0, max - 1).join('');
  return out.replace(/[\s.,;:!?…–—-]+$/u, '') + '…';
}
