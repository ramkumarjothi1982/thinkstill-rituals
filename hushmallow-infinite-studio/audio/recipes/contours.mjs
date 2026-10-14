// Motif contours: the audio-only `sound.contour` slot of a variant spec
// (docs/SPEC.md: rise-1, rise-2, arch-1, arch-2). A contour picks the pitch
// path of the tonal motifs across the piece; it never touches timing, so
// `hm remux` can change it on an existing picture.
//
// Notes are reference notes (C5 major pentatonic, audio/pitch.mjs), so they
// transpose with the kit. Chime pitches are semitone offsets from the engine
// chime's base note A5 (+9), as v2 wrote them (st(3), 1, st(-5)).
//
//   glass     the glass ting of each thought arriving (MO-GLASS-RISE): always rises
//   dissolve  the chime of each thought dissolving into light
//   crest     the shimmer at the top of the ritual breath (two bells)
//   open      the content bells when the eyes open (MO-CLOSE, first half): always rises
//
// The close itself (the kit's 'success' on the logo, MO-CLOSE) rises in every
// contour, so the last tonal events never fall (G-AUDIO).
//
// arch-1 is v2's: the approved T01 spec carries it.

export const CHIME_BASE = 9;   // engine fx 'chime' plays 880 Hz = A5 = C5 + 9 semitones

export const CONTOURS = Object.freeze({
  'arch-1': Object.freeze({ glass: ['A6', 'C7', 'E7'], dissolve: [3, 0, -5], crest: ['E7', 'A6'], open: ['G5', 'C6'] }),
  'arch-2': Object.freeze({ glass: ['G6', 'A6', 'C7'], dissolve: [0, -2, -5], crest: ['D7', 'G6'], open: ['G5', 'C6'] }),
  'rise-1': Object.freeze({ glass: ['A6', 'C7', 'E7'], dissolve: [-5, 0, 3], crest: ['A6', 'E7'], open: ['G5', 'C6'] }),
  'rise-2': Object.freeze({ glass: ['G6', 'A6', 'C7'], dissolve: [-2, 0, 3], crest: ['G6', 'D7'], open: ['E5', 'G5'] }),
});

export const DEFAULT_CONTOUR = 'arch-1';

/** The contour table for a slot value (hard failure on an unknown name). */
export function contourOf(name = DEFAULT_CONTOUR) {
  if (!Object.hasOwn(CONTOURS, name)) throw new Error(`score: unknown sound.contour '${name}' (have: ${Object.keys(CONTOURS).join(', ')})`);
  return CONTOURS[name];
}
