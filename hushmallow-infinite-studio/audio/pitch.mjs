// Pitch for the score: notes are written once, in the reference key, and
// transposed by scale degree to the Mallow's kit (PHASE2-PLAN "notes are
// written as scale degrees and transposed to each kit's root and scale"; R8).
//
// The reference key is v2's: C5 major pentatonic, the literal frequency table
// N of the frozen audio/soundtrack.mjs (imported, never edited). A note is
// named by its semitone offset from C5 on that grid (G6 = +19, C3 = −24). For
// a kit, the offset is read as a scale degree (index into the reference scale
// plus octaves) and re-spelled in the kit's own scale and key:
//
//   +19 (G6) = degree 3 of octave +1  →  Blubi (F5 major pentatonic): C7
//                                     →  Glitzi (Bb4 minor pentatonic): F6
//
// Register: the kit's key sits in the octave of its root that is nearest C5,
// so every instrument keeps the register v2 tuned it in (phone translation:
// the gestures carry their shape in the 0.6–2.5 kHz band). For Noomi, Blubi,
// Glitzi and Zuzu that is the kit root itself (C5, F5, Bb4, G4); Loomi's G3,
// Boppo's E4 and Pipzi's G5 roots are taken an octave toward C5. A Mallow's
// sound pack may set the octave explicitly. The kit's own voice (buildMallow)
// always sounds at the kit's real root: that is the engine's, not the score's.
//
// Phone band: a cue's tonal figure (MO-CLOSE's celesta pair on the eyes opening)
// is its hit, and the hit must be heard on a phone. figure() transposes the figure
// as one unit and lifts it by whole octaves until its lowest note reaches PHONE_HZ,
// the floor of the band phones reproduce and the band the QA gate times hits in
// (qa/gates/audio.py: 600 Hz high-pass). v2's figures all sit above it; a G-rooted
// kit's re-spelled pair (D5–G5, 587–784 Hz) would leave its first note, the accent,
// below it, so the second note would be heard as the hit, 110 ms late (WP-04 R3).
//
// Identity: for the reference kit every function returns v2's exact values
// (the N table, st(k) ratios, no pitch option), so Noomi's score is bit-equal.

import { N } from './soundtrack.mjs';

export const REF_ROOT = 523.25;
export const REF_SCALE = Object.freeze([0, 2, 4, 7, 9]);
export const PHONE_HZ = 600;     // the phone band's floor (see above)
const NAMES = { C: 0, D: 2, E: 4, G: 7, A: 9 };

/** v2's table: semitone offset from C5 → Hz (the frozen N values, bit for bit). */
export const REF_HZ = Object.freeze(Object.fromEntries(Object.entries(N).map(([name, hz]) => {
  const semis = NAMES[name[0]] + 12 * (Number(name.slice(1)) - 5);
  return [semis, hz];
})));

/** The reference note named like v2's N (e.g. 'G6') → semitone offset from C5. */
export function refSemis(name) {
  const m = /^([CDEGA])(-?\d)$/.exec(name);
  if (!m) throw new Error(`pitch: '${name}' is not a note of the reference C major pentatonic`);
  return NAMES[m[1]] + 12 * (Number(m[2]) - 5);
}

const st = (semis) => Math.pow(2, semis / 12);
const floorDiv = (a, b) => Math.floor(a / b);

/** Reference semitone offset → { index, octave } on the reference scale (throws off the grid). */
export function refDegree(semis) {
  if (!Number.isInteger(semis)) throw new Error(`pitch: ${semis} is not a whole semitone offset`);
  const octave = floorDiv(semis, 12), pc = semis - 12 * octave;
  const index = REF_SCALE.indexOf(pc);
  if (index < 0) throw new Error(`pitch: ${semis} semitones from C5 is not on the reference C major pentatonic (only scale notes transpose)`);
  return { index, octave };
}

const sameScale = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The octave shift (whole octaves) that brings the kit root nearest C5. */
export function nearestOctave(root) {
  return Math.round(Math.log2(REF_ROOT / root)) + 0;   // (+ 0: never −0)
}

/**
 * A transposer for a kit { root, scale } (library/sound/soundmap.json kits).
 * octave: register override (whole octaves added to the kit root); null/undefined
 * means nearestOctave(root).
 */
export function transposer(kit, { octave = null } = {}) {
  if (!kit || !Number.isFinite(kit.root) || !Array.isArray(kit.scale) || kit.scale.length !== REF_SCALE.length) {
    throw new Error(`pitch: a kit needs a root and a ${REF_SCALE.length}-note scale, got ${JSON.stringify(kit)}`);
  }
  const oct = octave ?? nearestOctave(kit.root);
  if (!Number.isInteger(oct)) throw new Error(`pitch: octave must be a whole number, got ${oct}`);
  const identity = kit.root === REF_ROOT && sameScale(kit.scale, REF_SCALE) && oct === 0;
  const keyRoot = kit.root * Math.pow(2, oct);              // the kit's key in the score's register
  /** kit semitones above keyRoot for a reference offset */
  const kitSemis = (semis) => { const { index, octave: o } = refDegree(semis); return kit.scale[index] + 12 * o; };
  /** Hz of a reference note in this kit */
  const hz = (semis) => {
    if (identity) {
      if (!Object.hasOwn(REF_HZ, semis)) throw new Error(`pitch: ${semis} has no entry in v2's table`);
      return REF_HZ[semis];
    }
    return keyRoot * st(kitSemis(semis));
  };
  /** ratio by which this kit moves a reference note (exactly 1 for the identity) */
  const ratio = (semis) => (identity ? 1 : (keyRoot * st(kitSemis(semis))) / (REF_ROOT * st(semis)));
  return {
    identity, octave: oct, keyRoot, kit,
    kitSemis, hz, ratio,
    /** hz of a note named like v2's N ('G6') */
    note: (name) => hz(refSemis(name)),
    /**
     * Hz of a figure of notes named like v2's N, transposed as one unit and lifted by whole
     * octaves until its lowest note is at or above `floor` (the phone band). A figure already
     * in the band (every v2 figure for Noomi) is returned exactly as note() would.
     */
    figure: (names, floor = PHONE_HZ) => {
      const f = names.map((n) => hz(refSemis(n)));
      let k = 0;
      while (Math.min(...f) * 2 ** k < floor) k++;
      return k ? f.map((x) => x * 2 ** k) : f;
    },
    /**
     * Pitch option for an engine fx whose base note is `base` (reference offset) and which v2
     * played `offset` semitones away (v2: pitch st(offset)). Identity → st(offset), bit for bit.
     */
    fxPitch: (base, offset) => (identity ? st(offset) : st(offset) * ratio(base + offset)),
    /**
     * Options for the engine 'bubble' fx: v2 passes note k of the engine's major pentatonic
     * (k = 0, 2, 4). Identity → { note: k } exactly as v2; otherwise the same note with the
     * pitch that moves its degree into this kit.
     */
    bubble: (k) => {
      if (identity) return { note: k };
      const semis = REF_SCALE[k % 5] + 12 * floorDiv(k, 5);
      return { note: k, pitch: ratio(semis) };
    },
  };
}
