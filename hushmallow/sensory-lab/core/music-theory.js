// Music theory for Hushbeat Symphony: scales, chord loops, pitch choice,
// harmony and dynamics. Pure and Node-safe (no DOM, no Web Audio).
//
// Every Mallow keeps the root and scale of its production kit (VOICES in
// core/sound-engine.js). Chords are built only from scale tones, so a melody
// note never fights the harmony. Two numbers name a pitch here:
//   deg   a scale-step index from the key root (5 per octave; may be negative)
//   semi  semitones from the key root
// Interval classes (ic, 0..6) don't care about octaves, so semis of the lead
// and of a friend (whose root sits whole octaves away) can be compared freely.
//
// The guard keeps interval classes 1 and 6 (the semitone and the tritone) out
// of everything sounding at once. The major and minor pentatonics contain
// neither, so for six of the seven Mallows it can never move a note; only
// Zuzu's spiral scale [0,2,3,7,8] needs it.

import { VOICES } from './sound-engine.js';
import { clamp } from './math.js';

const mod = (a, n) => ((a % n) + n) % n;
const EMPTY = Object.freeze([]);
const freeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object') freeze(v); return Object.freeze(o); };

export const SHAPES = freeze({ maj: [0, 2, 4, 7, 9], min: [0, 3, 5, 7, 10], spiral: [0, 2, 3, 7, 8] });

/** Chords per scale shape, keyed by root (semis); every tone is a scale tone and the root comes first. */
export const CHORDS = freeze({
  maj: { 0: [0, 4, 7], 9: [9, 0, 4], 2: [2, 9, 0], 7: [7, 2, 9], 4: [4, 7, 0] },
  min: { 0: [0, 3, 7], 10: [10, 3, 5], 5: [5, 10, 0], 3: [3, 7, 10] },
  spiral: { 0: [0, 3, 7], 8: [8, 0, 3], 7: [7, 2] },
});

// Phrase styles (a stroke walks the scale; rightward uses `rise`, leftward `fall`, cycled):
//   len       note length relative to the Mallow's natural ring (staccato < 1 < legato)
//   max       notes before a bar of rest       wrap   leave the range by jumping an octave, not turning back
//   glide     portamento from the previous phrase note (s)   stutter  every nth note stutters
//   flourish  a fast stroke ends with a 3-note run onto a chord tone
// Shimmer (joins a hum after 4 s): unit beat|bar, every n units, chance, at most perBar,
// octave = a voice an octave up inside the pad (no extra notes), low = sounds below the pad.
// peak: a note's peak at velocity 1, tuned with offline renders of each kit (core/music-kits.js) so a tap
// note's loudness (RMS over its first 250 ms) matches across Mallows within ±2 dB (Glitzi's short chirp
// sits 2 dB under); the summed partials of a bell never exceed it.
export const MUSIC = freeze({
  boppo: {
    meter: 4, grid: 2, swing: 0.5, prog: [0, 9, 2, 7], tap: [-2, 6], walk: [2, -1, 2, -2], shape: 'maj',
    phrase: { rise: [2, -1], fall: [-2, 1], len: 0.45, max: 16 },
    decay: 0.18, send: 0.75, peak: 0.12, repeatMax: 2, shimmer: { octave: true },
  },
  pipzi: {
    meter: 4, grid: 4, swing: 0.5, prog: [0, 7, 9, 4], tap: [-5, 3], walk: [1, 1, -1, 2], shape: 'maj',
    phrase: { rise: [1], fall: [-1], len: 0.8, max: 16, flourish: true },
    decay: 0.35, send: 1.1, peak: 0.115, repeatMax: 2, shimmer: { unit: 'beat', n: 1, chance: 0.5 },
  },
  blubi: {
    meter: 3, grid: 2, swing: 0.5, prog: [9, 2, 0, 7], tap: [-5, 3], walk: [-1, -1, 2, -1], shape: 'maj',
    phrase: { rise: [1, -2], fall: [-1], len: 1.3, max: 16, wrap: true },
    decay: 0.15, send: 1.4, peak: 0.105, repeatMax: 2, shimmer: { unit: 'beat', n: 1, chance: 0.4, perBar: 2 },
  },
  glitzi: {
    meter: 4, grid: 4, swing: 0.5, prog: [0, 10, 5, 3], tap: [-3, 5], walk: [0, 0, 3, -2], shape: 'min',
    phrase: { rise: [1, 0], fall: [-1, 0], len: 0.6, max: 16, stutter: 3 },
    decay: 0.10, send: 0.4, peak: 0.12, repeatMax: 3, shimmer: { unit: 'bar', n: 1, chance: 0.3 },
  },
  zuzu: {
    meter: 3, grid: 2, swing: 0.62, prog: [0, 8, 0, 7], tap: [-3, 5], walk: [2, -1, 2, -1], shape: 'spiral',
    phrase: { rise: [2, -1], fall: [-2, 1], len: 1, max: 16, glide: 0.06 },
    decay: 0.25, send: 1.6, peak: 0.105, repeatMax: 2, shimmer: { unit: 'bar', n: 1, chance: 1, glide: true },
  },
  loomi: {
    meter: 3, grid: 1, swing: 0.5, prog: [0, 0, 9, 7], tap: [0, 7], walk: [0, 1, -1, 0], shape: 'maj',
    phrase: { rise: [1], fall: [-1], len: 1.8, max: 2, glide: 0.12 },   // with the resolve: two or three long notes
    decay: 0.60, send: 2.2, peak: 0.085, repeatMax: 2, shimmer: { unit: 'bar', n: 2, chance: 1, low: true },
  },
  noomi: {
    meter: 3, grid: 2, swing: 0.5, prog: [0, 4, 9, 7], tap: [-3, 5], walk: [-1, -1, -1, 3], shape: 'maj',
    phrase: { rise: [-1, -1, 3], fall: [-1], len: 1.2, max: 16, wrap: true },
    decay: 0.80, send: 2.1, peak: 0.085, repeatMax: 2, shimmer: { unit: 'bar', n: 1, chance: 1 },
  },
});

/** Peak of a held layer at level 1, in the same units as MUSIC[id].peak (the summed-peak limiter uses them). */
export const LAYER_PEAK = freeze({ pad: 0.06, bass: 0.09 });
export const SUM_PEAK = 0.45;        // the estimated sum of everything sounding never exceeds this
export const MELODY_MAX_HZ = 2400;   // melody above folds down an octave
export const BASS_RANGE = freeze([65, 131]);
export const HARMONY_S = 0.4;        // a friend's note this close to the other's harmonises with it
const WALK_RESET = 2;                // s without a strike: the walk starts again from the touch height
const LEAP = 5;                      // at most an octave (5 degrees) between successive tap notes

export function shapeOf(scale) {
  for (const [k, s] of Object.entries(SHAPES)) if (s.length === scale.length && s.every((v, i) => v === scale[i])) return k;
  return 'maj';
}

/**
 * A playing voice: Mallow `id` in the key of `keyId` (a duet friend plays in the lead's key).
 * The friend takes the lead's scale, progression and meter, moved by whole octaves into its own
 * register, and keeps its own tap window, walk, phrase style, grid, decay, peak and send.
 */
export function voiceFor(id, keyId = id) {
  const own = Object.hasOwn(MUSIC, id) ? id : 'boppo';
  const key = Object.hasOwn(MUSIC, keyId) ? keyId : own;
  const m = MUSIC[own], km = MUSIC[key];
  const oct = key === own ? 0 : Math.round(Math.log2(VOICES[own].root / VOICES[key].root));
  return {
    id: own, key, oct, rootHz: VOICES[key].root * 2 ** oct, scale: VOICES[key].scale, shape: km.shape,
    meter: km.meter, prog: km.prog, grid: m.grid, swing: m.swing, tapLo: m.tap[0], tapHi: m.tap[1],
    walk: m.walk, phrase: m.phrase, decay: m.decay, peak: m.peak, send: m.send, repeatMax: m.repeatMax, shimmer: m.shimmer,
  };
}

/** Any integer degree → semitones from the key root. */
export function degSemi(scale, i) {
  const n = scale.length, d = Math.round(i);
  return scale[mod(d, n)] + 12 * Math.floor(d / n);
}

/** The degree whose pitch is nearest `semi` (ties: the lower degree). */
export function nearestDeg(scale, semi) {
  const n = scale.length, o = Math.floor(semi / 12);
  let best = 0, bd = Infinity;
  for (let d = (o - 1) * n; d < (o + 2) * n; d++) {
    const e = Math.abs(degSemi(scale, d) - semi);
    if (e < bd - 1e-9) { bd = e; best = d; }
  }
  return best;
}

/** Degree of an in-scale semi, or null. */
export function degOf(scale, semi) {
  const d = nearestDeg(scale, semi);
  return degSemi(scale, d) === semi ? d : null;
}

/** Frequency of a melody pitch; anything above 2400 Hz folds down by octaves. */
export function hz(V, semi) {
  let f = V.rootHz * 2 ** (semi / 12);
  while (f > MELODY_MAX_HZ) f /= 2;
  return f;
}

/** A bass pitch: the chord root folded into [65, 131) Hz. */
export function bassHz(V, rootSemi) {
  let f = V.rootHz * 2 ** (rootSemi / 12);
  while (f >= BASS_RANGE[1]) f /= 2;
  while (f < BASS_RANGE[0]) f *= 2;
  return f;
}

/** The chord of bar `bar` (one breath = four bars = one turn of the loop). */
export function chordAt(V, bar) {
  const root = V.prog[mod(bar, V.prog.length)];
  return { root, tones: CHORDS[V.shape][root] };
}

/** An authored chord that contains pitch class `pc`, preferring `pref` (the chord of the bar). */
export function chordWith(V, pc, pref = null) {
  const p = mod(pc, 12);
  if (pref && pref.tones.includes(p)) return pref;
  const table = CHORDS[V.shape];
  for (const r of V.prog) if (table[r].includes(p)) return { root: r, tones: table[r] };
  for (const [r, tones] of Object.entries(table)) if (tones.includes(p)) return { root: +r, tones };
  return pref || chordAt(V, 0);
}

export const isChordTone = (chord, semi) => !!chord && chord.tones.includes(mod(semi, 12));

/** Interval class 0..6. */
export function ic(a, b) { const d = mod(a - b, 12); return Math.min(d, 12 - d); }
export const consonant = (a, b) => ic(a, b) !== 1 && ic(a, b) !== 6;
const free = (s, sounding) => { for (let i = 0; i < sounding.length; i++) if (!consonant(s, sounding[i])) return false; return true; };

/** Strong beats: 0 and 2 in 4/4, 0 in 3/4. */
export const strongBeat = (meter, beatInBar) => beatInBar === 0 || (meter === 4 && beatInBar === 2);

/**
 * Guard a degree against everything sounding: if it forms interval class 1 or 6 with any
 * sounding pitch, move it to the nearest free scale degree (inside the tap window first,
 * chord tones first at equal distance); unison with a sounding note is the fallback.
 */
export function guardDeg(deg, sounding, V, { chord = null, lo = V.tapLo, hi = V.tapHi } = {}) {
  const sc = V.scale;
  if (!sounding?.length || free(degSemi(sc, deg), sounding)) return deg;
  const at = (d) => (free(degSemi(sc, d), sounding) ? d : null);
  const pass = (inside, kMax) => {
    for (let k = 1; k <= kMax; k++) {
      let other = null;
      for (const d of [deg - k, deg + k]) {
        if ((d >= lo && d <= hi) !== inside || at(d) == null) continue;
        if (isChordTone(chord, degSemi(sc, d))) return d;
        if (other == null) other = d;
      }
      if (other != null) return other;
    }
    return null;
  };
  const d = pass(true, Math.max(1, hi - lo)) ?? pass(false, 7);
  if (d != null) return d;
  // unison with a sounding pitch that agrees with all the others, in the octave nearest the candidate
  const s0 = degSemi(sc, deg);
  for (const x of sounding) {
    if (!free(x, sounding)) continue;
    const u = degOf(sc, x + 12 * Math.round((s0 - x) / 12));
    if (u != null) return u;
  }
  return deg;
}

/** guard() on semis (spec API): an in-scale semi that is consonant with everything sounding. */
export function guard(semi, sounding, V, opts) {
  return degSemi(V.scale, guardDeg(nearestDeg(V.scale, semi), sounding, V, opts));
}

// the allowed degree nearest the proposal (ties: toward the touch band, then lower)
function choose(V, p, band, st, chord) {
  const lo = V.tapLo, hi = V.tapHi;
  const rules = [
    (d) => st.prev == null || Math.abs(d - st.prev) <= LEAP,
    (d) => !(d === st.prev && st.repeats >= V.repeatMax),
    (d) => !chord || isChordTone(chord, degSemi(V.scale, d)),
  ];
  for (let relax = 0; relax <= rules.length; relax++) {
    let best = null, bs = Infinity;
    for (let d = lo; d <= hi; d++) {
      let ok = true;
      for (let r = 0; r < rules.length - relax; r++) if (!rules[r](d)) { ok = false; break; }
      if (!ok) continue;
      const s = Math.abs(d - p) * 100 + Math.abs(d - band);
      if (s < bs) { bs = s; best = d; }
    }
    if (best != null) return best;
  }
  return clamp(Math.round(p), lo, hi);
}

/**
 * Pick the next tap note for a voice. st = { prev, walkI, repeats, lastT } (mutated).
 *  1. touch height → a band in the tap window   2. the walk proposes prev + walk[i]; > 2 degrees
 *  from the band, the band wins (the walk restarts after 2 s)   3. repeat limit   4. leap ≤ 5
 *  5. strong beat → a chord tone   6. guard.  An explicit degree (digit keys) skips 2–5.
 * → { deg, semi }
 */
export function pickNote(V, st, { band01 = 0.5, strong = false, chord = null, sounding = EMPTY, deg = null, t = 0 } = {}) {
  const lo = V.tapLo, hi = V.tapHi;
  let d;
  if (deg != null && Number.isFinite(+deg)) d = Math.round(+deg);
  else {
    const band = Math.round(lo + clamp(+band01 || 0, 0, 1) * (hi - lo));
    if (st.prev == null || t - st.lastT > WALK_RESET) { st.prev = null; st.walkI = 0; st.repeats = 0; }
    let p = st.prev == null ? band : st.prev + V.walk[st.walkI++ % V.walk.length];
    if (Math.abs(p - band) > 2) p = band;
    d = choose(V, p, band, st, strong ? chord : null);
  }
  d = guardDeg(d, sounding, V, { chord });
  st.repeats = d === st.prev ? (st.repeats || 0) + 1 : 1;
  st.prev = d; st.lastT = t;
  return { deg: d, semi: degSemi(V.scale, d) };
}

/**
 * A pitch for V that harmonises with `otherSemi`: the nearest (to `near`) in-scale pitch in V's
 * register a 3rd or 6th away (ic 3 or 4); else a 4th or 5th (ic 5); else an octave or unison.
 * Never ic 1, 2 or 6, and always consonant with everything sounding. → { deg, semi }
 */
export function harmoniseDeg(otherSemi, V, { sounding = EMPTY, near = null, lo = V.tapLo - 2, hi = V.tapHi + 2 } = {}) {
  const mid = degSemi(V.scale, Math.round((V.tapLo + V.tapHi) / 2));
  const target = near ?? otherSemi + 12 * Math.round((mid - otherSemi) / 12);
  for (const ics of [[3, 4], [5], [0]]) {
    let best = null, bs = Infinity;
    for (let d = lo; d <= hi; d++) {
      const s = degSemi(V.scale, d);
      if (!ics.includes(ic(s, otherSemi)) || !free(s, sounding)) continue;
      const e = Math.abs(s - target);
      if (e < bs) { bs = e; best = d; }
    }
    if (best != null) return { deg: best, semi: degSemi(V.scale, best) };
  }
  // nothing in those intervals is free (only possible for Zuzu's spiral scale): whatever the guard allows
  const d = guardDeg(nearestDeg(V.scale, target), sounding, V, { lo, hi });
  return { deg: d, semi: degSemi(V.scale, d) };
}

/** harmonise() on semis (spec API). */
export function harmonise(otherSemi, V, opts = {}) { return harmoniseDeg(otherSemi, V, opts).semi; }

/**
 * Velocity of a new note: base × accent (within ±60 ms of a beat ×1.15, of a downbeat ×1.25,
 * else ×0.88) × density 1/√(1 + n/4) × gentle 0.8, then scaled so the estimated sum of
 * everything sounding (sumLevel) plus this note's peak (vel × peak) stays ≤ 0.45.
 * accent: false keeps the base as it is (a replayed note already carries its accent).
 */
export function velocity({ base = 0.75, offsetMs = 0, downbeat = false, onsets1s = 0, gentle = false, sumLevel = 0, peak = 0.1, accent = true } = {}) {
  let v = base * (!accent ? 1 : downbeat ? 1.25 : Math.abs(offsetMs) <= 60 ? 1.15 : 0.88);
  v /= Math.sqrt(1 + Math.max(0, onsets1s) / 4);
  if (gentle) v *= 0.8;
  v = Math.min(1, v);
  if (sumLevel + v * peak > SUM_PEAK) v = Math.max(0, (SUM_PEAK - sumLevel) / peak);
  return v;
}

/** A degree moved by whole octaves (5 degrees) into [lo, hi] when it can be. */
export function foldDeg(d, lo, hi) {
  let x = d;
  while (x > hi && x - 5 >= lo) x -= 5;
  while (x < lo && x + 5 <= hi) x += 5;
  return x;
}

// ------------------------------------------------------------- pads --
/** Three pad voices (semis), close-voiced below `top`: the chord's other tones, then top − 12 for a 2-tone chord. */
export function voicePad(top, tones) {
  const out = [top], pcs = [];
  for (const t of tones) if (mod(t, 12) !== mod(top, 12)) pcs.push(mod(t, 12));
  for (const pc of pcs) { if (out.length >= 3) break; out.push(top - mod(top - pc, 12)); }
  for (let k = 1; out.length < 3; k++) out.push(top - 12 * k);
  return out.sort((a, b) => a - b);
}

const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

/** Voice-lead three pad voices to a new chord: every chord tone covered, the least total movement. */
export function leadPad(prev, tones) {
  const pcs = tones.length >= 3 ? tones.slice(0, 3) : [tones[0], tones[1] ?? tones[0], tones[0]];
  let best = null, bc = Infinity;
  for (const p of PERMS) {
    let cost = 0;
    const v = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const pc = pcs[p[i]];
      v[i] = pc + 12 * Math.round((prev[i] - pc) / 12);
      cost += Math.abs(v[i] - prev[i]);
    }
    if (cost < bc) { bc = cost; best = v; }
  }
  return best.sort((a, b) => a - b);
}
