// The v2 cue recipes: the sounds of T01's moves (G-JOLT, aftermath-startled,
// M-ORBIT, TURN-SQUEEZE, R-BREATH, content-card, LP-RETURN), lifted from the
// cue → sound switch of the frozen audio/soundtrack-v2.mjs buildPlanV2.
//
// The bodies are v2's, expression for expression (operand order included), so
// a recipe run on v2's cue log pushes exactly v2's events; the parity test
// (tests/unit/audio-score.test.mjs) holds the generated plan byte-equal to
// buildPlanV2. What changed is only where the values come from:
//   - tonal notes are reference notes resolved by the kit's transposer
//     (R.pitch.note('G6') is v2's N.G6 for Noomi, a re-spelled degree otherwise;
//     a cue's tonal figure, R.pitch.figure, is kept in the phone band as a unit);
//   - the motif pitches come from the contour slot (arch-1 = v2);
//   - times are the cue's own time plus offsets: a recipe never names an
//     absolute time (audio/lint-recipes.mjs checks translation invariance).
//
// Recipe fields:
//   id, cue         recipe id ('v2/take') and the cue type it sounds
//   role            'foley' | 'voice' | 'motif' | 'marker' (silent by design) | 'anchor' (feeds a layer)
//   transient       true: a percussive pop the clock keeps clear of (tick layer)
//   layers          layers this recipe owns (the score runs them when the cue is present)
//   motif           motif name for tonal notes (G-AUDIO contour check)
//   silent          for markers and anchors: why the cue has no discrete sound
//   tags, doc       description, checked by the banned-recipe lint
//   emit(R, c)      push events for cue c (R: see audio/score.mjs recipeContext)

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const st = (s) => Math.pow(2, s / 12);

export const RECIPES_V2 = [
  {
    id: 'v2/flinch', cue: 'flinch', role: 'foley', tags: ['dream', 'mm'],
    doc: 'a dream flinch: a tiny muffled "mm?"',
    emit(R, c) {
      const t = c.t;
      R.S(t, 'blip', { type: 'triangle', f: 420, f1: 360, glide: 0.08, a: 0.01, d: 0.1, peak: 0.022, lp: 1400, send: 0.15 });
    },
  },
  {
    id: 'v2/take', cue: 'take', role: 'voice', transient: true, tags: ['eye-pop', 'boing', 'surprise'],
    doc: 'the comedic beat: eye-pop on the frame, a rubbery boing, the Mallow\'s surprise, air rushing up',
    emit(R, c) {
      const t = c.t;
      R.S(t, 'blip', { f: 340, f1: 1500, glide: 0.045, a: 0.0015, h: 0.012, d: 0.055, peak: 0.064, lp: 4200, send: 0.12 });
      R.S(t, 'blip', { type: 'triangle', f: 170, f1: 750, glide: 0.045, a: 0.0015, h: 0.012, d: 0.06, peak: 0.032, lp: 1800 });
      R.S(t + 0.02, 'blip', { type: 'triangle', f: 300, f1: 720, glide: 0.12, a: 0.006, d: 0.42, peak: 0.034, lp: 2000, send: 0.15,
        vib: { rate: 13, cents: 80, decay: 0.42 } });
      R.E(t, 'mallow', 'surprise', { intensity: 0.9, pitch: st(4) }, 0.25);
      R.S(t + 0.01, 'air', { a: 0.08, r: 0.22, f0: 700, f1: 2200, q: 0.8, peak: 0.03, width: 0.3, send: 0.1 });
    },
  },
  {
    id: 'v2/lift_off', cue: 'lift_off', role: 'foley', transient: true, tags: ['water', 'plip'],
    doc: 'leaving the water: a small, bright plip',
    emit(R, c) {
      const t = c.t;
      R.S(t, 'blip', { f: 820, f1: 1500, glide: 0.03, a: 0.002, d: 0.05, peak: 0.03, lp: 3400, send: 0.25 });
      R.S(t, 'noiseHit', { filter: 'highpass', f: 2600, a: 0.002, d: 0.09, peak: 0.016, send: 0.2 });
    },
  },
  {
    id: 'v2/land', cue: 'land', role: 'foley', transient: true, tags: ['jelly', 'water', 'squelch'],
    payload: { amp: 1 },
    doc: 'heavy wet jelly landing: flump, squelch, water bloop, splash hiss, a wobbling tail',
    emit(R, c) {
      const t = c.t;
      const a = c.amp ?? 1;
      R.S(t, 'blip', { f: 190, f1: 92, glide: 0.11, a: 0.003, d: 0.22, peak: 0.055 * a, lp: 900 });
      R.S(t, 'noiseHit', { filter: 'bandpass', f: 1900, f1: 520, sweep: 0.12, a: 0.003, d: 0.18, peak: 0.1 * a, q: 1.6 });
      R.S(t + 0.008, 'blip', { f: 240, f1: 760, glide: 0.07, a: 0.003, d: 0.12, peak: 0.062 * a, lp: 2600, send: 0.2 });
      R.S(t + 0.01, 'noiseHit', { filter: 'highpass', f: 2400, f1: 5200, sweep: 0.2, a: 0.004, d: 0.28, peak: 0.02 * a, send: 0.3 });
      R.S(t + 0.05, 'blip', { type: 'triangle', f: 310, f1: 260, glide: 0.4, a: 0.01, d: 0.6, peak: 0.028 * a, lp: 1500, send: 0.18,
        vib: { rate: 6.2, cents: 90, decay: 0.6 } });
      R.E(t + 0.02, 'mallow', 'press', { intensity: 0.5 }, 0.18);
    },
  },
  {
    id: 'v2/ripple', cue: 'ripple', role: 'foley', tags: ['water', 'ring'],
    payload: { amp: 0.4 },
    doc: 'the landing ring answering on the water',
    emit(R, c) {
      const t = c.t;
      R.S(t, 'blip', { f: 420, f1: 980, glide: 0.06, a: 0.003, d: 0.1, peak: 0.03 * (c.amp ?? 0.4) / 0.4, lp: 3000, send: 0.35 });
    },
  },
  {
    id: 'v2/blink', cue: 'blink', role: 'foley', transient: true, tags: ['blink', 'bip', 'celesta'],
    doc: 'wide-eyed double blink "bip ... bip" (the second higher); a sleepy blink is one tiny celesta tink',
    emit(R, c) {
      const t = c.t;
      if (c.soft) R.S(t, 'bell', { f: R.pitch.note('G6'), peak: 0.022, decay: 0.55, partials: 'celesta', send: 0.4, lp: 5200 });
      else {
        const f = R.of('blink').filter((b) => !b.soft).indexOf(c) === 0 ? 1320 : 1500;
        R.S(t, 'blip', { f, f1: f * 0.84, glide: 0.022, a: 0.0015, d: 0.04, peak: 0.06, lp: 3600, send: 0.1 });
        R.S(t, 'blip', { f: f / 2, a: 0.0015, d: 0.025, peak: 0.028, lp: 2000 });
      }
    },
  },
  {
    id: 'v2/glance', cue: 'glance', role: 'foley', transient: true, tags: ['swish', 'eyes'],
    doc: 'a soft swish toward each suspicious glance',
    emit(R, c) {
      const t = c.t;
      R.E(t, 'fx', 'swish', { intensity: 0.15, pan: c.pan ?? 0, pitch: 0.8 }, 0.7);
    },
  },
  {
    id: 'v2/thought', cue: 'thought', role: 'motif', motif: 'MO-GLASS-RISE', transient: true, tags: ['glass', 'bubble', 'ting'],
    doc: 'a glass thought pops in: bubble + glass ting, a step higher each time, panned to the bubble',
    emit(R, c) {
      const t = c.t;
      const i = clamp(c.i ?? 0, 0, 2);
      R.E(t, 'fx', 'bubble', { intensity: 1, ...R.pitch.bubble([0, 2, 4][i]), pan: c.pan }, [0.8, 0.72, 0.6][i]);
      R.S(t + 0.004, 'noiseHit', { filter: 'lowpass', f: 1900, f1: 380, sweep: 0.06, a: 0.003, d: 0.07, peak: 0.032, q: 1.2, pan: c.pan });
      const f = R.pitch.note(R.contour.glass[i]);
      R.S(t + 0.018, 'bell', { f, peak: 0.016, decay: 0.6, partials: 'celesta', pan: c.pan, send: 0.4, lp: 6500 });
      R.tonal(t + 0.018, f, 'MO-GLASS-RISE');
    },
  },
  {
    id: 'v2/wince', cue: 'wince', role: 'voice', transient: true, tags: ['cringe', 'squeak'],
    doc: 'cringe at the memory: a tiny tight squeak',
    emit(R, c) {
      const t = c.t;
      R.E(t, 'mallow', 'squeeze', { intensity: 0.35, pitch: 2.4 }, 0.11, { at: t + 0.22, fade: 0.06 });
      R.S(t, 'blip', { f: 1180, f1: 900, glide: 0.09, a: 0.004, d: 0.09, peak: 0.026, lp: 3200, send: 0.12 });
    },
  },
  {
    id: 'v2/spin_up', cue: 'spin_up', role: 'anchor', layers: ['swirl'], tags: ['orbit'],
    silent: 'anchors the orbit swirl: the whooshes start here (fix "swirl at spin_up"; v2 started them at a hard-coded 2.9 s)',
    doc: 'the thoughts start to spiral',
    emit() {},
  },
  {
    id: 'v2/squeeze', cue: 'squeeze', role: 'voice', tags: ['squeeze', 'turn'],
    doc: 'the turn: a squeezed little sound, and the swirl muffles and stops dead (layers)',
    emit(R, c) {
      const t = c.t;
      R.E(t, 'mallow', 'squeeze', { intensity: 0.5, pitch: 2 }, 0.14, { at: t + 0.3, fade: 0.06 });
    },
  },
  {
    id: 'v2/inhale', cue: 'inhale', role: 'foley', tags: ['breath', 'air', 'rising'],
    payload: { dur: 1.5 },
    doc: 'one long inhale, air rising',
    emit(R, c) {
      const t = c.t;
      const dur = clamp(c.dur || 1.5, 1, 3);
      R.E(t, 'fx', 'breathe-in', { duration: dur, intensity: 0.7 }, 0.3, { at: t + dur - 0.05, fade: 0.2 });
      R.S(t, 'air', { a: dur - 0.1, r: 0.3, f0: 600, f1: 1250, q: 1.1, peak: 0.03, width: 0.3, send: 0.25 });
    },
  },
  {
    id: 'v2/crest', cue: 'crest', role: 'motif', motif: 'ritual', tags: ['glass', 'shimmer', 'stillness'],
    doc: 'the stillness at the top of the breath: one high glassy shimmer',
    emit(R, c) {
      const t = c.t;
      const [a, b] = R.contour.crest.map((n) => R.pitch.note(n));
      R.S(t, 'bell', { f: a, peak: 0.009, decay: 1.1, partials: 'celesta', send: 0.6, lp: 7000 });
      R.S(t + 0.07, 'bell', { f: b, peak: 0.007, decay: 1.2, partials: 'celesta', send: 0.6, lp: 7000 });
      R.tonal(t, a, 'ritual');
      R.tonal(t + 0.07, b, 'ritual');
    },
  },
  {
    id: 'v2/exhale', cue: 'exhale', role: 'foley', tags: ['breath', 'air', 'sigh'],
    payload: { dur: 1.9 },
    doc: 'a long exhale and a soft sigh',
    emit(R, c) {
      const t = c.t;
      const dur = clamp((c.dur || 1.9), 1, 3);
      R.E(t, 'fx', 'breathe-out', { duration: dur, intensity: 0.7 }, 0.22);
      R.E(t + 0.06, 'mallow', 'sigh', { intensity: 0.35 }, 0.2);
      R.S(t, 'air', { a: 0.14, r: dur, f0: 1100, f1: 380, q: 0.9, peak: 0.034, width: 0.65, send: 0.35 });
    },
  },
  {
    id: 'v2/release', cue: 'release', role: 'foley', tags: ['squash', 'release', 'water', 'bloom'],
    doc: 'the luxurious squash-and-release, and the calm ring blooming over the water',
    emit(R, c) {
      const t = c.t;
      R.S(t, 'noiseHit', { filter: 'bandpass', f: 2000, f1: 650, sweep: 0.12, a: 0.004, d: 0.18, peak: 0.085, q: 1.8 });
      R.S(t, 'blip', { f: 880, f1: 440, glide: 0.1, a: 0.003, d: 0.16, peak: 0.06, lp: 2400 });
      R.S(t + 0.16, 'blip', { type: 'triangle', f: 420, f1: 840, glide: 0.08, a: 0.004, d: 0.5, peak: 0.026, lp: 2600, send: 0.22,
        vib: { rate: 6.5, cents: 85, decay: 0.55 } });
      R.E(t + 0.16, 'mallow', 'release', { intensity: 0.6, pitch: 2 }, 0.22);
      R.S(t + 0.02, 'blip', { f: 150, f1: 300, glide: 0.25, a: 0.02, d: 0.7, peak: 0.03, lp: 700, send: 0.5 });
      R.S(t + 0.04, 'blip', { f: 330, f1: 660, glide: 0.2, a: 0.01, d: 0.5, peak: 0.022, lp: 1800, send: 0.55 });
    },
  },
  {
    id: 'v2/dissolve', cue: 'dissolve', role: 'motif', motif: 'MO-GLASS-RISE', layers: ['sparkles'], tags: ['glass', 'chime', 'light'],
    doc: 'each thought turns to light: a glass chime (and the cloud of rising sparkles, layer)',
    emit(R, c) {
      const t = c.t;
      const i = clamp(c.i ?? 0, 0, 2);
      const pitch = R.pitch.fxPitch(R.CHIME_BASE, R.contour.dissolve[i]);
      R.E(t, 'fx', 'chime', { intensity: 0.35, pitch, pan: (c.pan || 0) * 0.8 }, 0.13);
      R.tonal(t, 880 * pitch, 'MO-GLASS-RISE');
    },
  },
  {
    id: 'v2/warm_bloom', cue: 'warm_bloom', role: 'marker', tags: ['warm', 'palette'],
    silent: 'the palette blooms warm; the warm pad (layer, from the inhale and exhale) already swells with the same warm curve',
    doc: 'the warm bloom of the ritual',
    emit() {},
  },
  {
    id: 'v2/eyes_open', cue: 'eyes_open', role: 'motif', motif: 'MO-CLOSE', tags: ['content', 'celesta', 'open'],
    doc: 'eyes open: a warm content glide and two rising celesta notes (MO-CLOSE, first half), the pair in the phone band (R.pitch.figure)',
    emit(R, c) {
      const t = c.t;
      const [a, b] = R.pitch.figure(R.contour.open);
      R.E(t, 'mallow', 'comfort', { intensity: 0.3, pitch: 2 }, 0.24);
      R.S(t, 'bell', { f: a, peak: 0.022, decay: 0.7, partials: 'celesta', send: 0.4, lp: 5000 });
      R.S(t + 0.11, 'bell', { f: b, peak: 0.017, decay: 0.8, partials: 'celesta', send: 0.45, lp: 5000 });
      R.tonal(t, a, 'MO-CLOSE');
      R.tonal(t + 0.11, b, 'MO-CLOSE');
    },
  },
  {
    id: 'v2/tagline', cue: 'tagline', role: 'marker', tags: ['text'],
    silent: 'the end line rises silently between the two halves of MO-CLOSE (eyes open, logo)',
    doc: 'the end line appears',
    emit() {},
  },
  {
    id: 'v2/logo', cue: 'logo', role: 'motif', motif: 'MO-CLOSE', tags: ['close', 'chime', 'success'],
    doc: 'the logo: the Mallow\'s soothing closing chime, its own success phrase (MO-CLOSE; audio/score.mjs arrangeClose keeps the ending rising for every kit)',
    emit(R, c) {
      const t = c.t;
      const e = R.E(t, 'mallow', 'success', { intensity: 0.5 }, 0.28);
      R.kitGesture(e, 'MO-CLOSE');
    },
  },
  {
    id: 'v2/drift', cue: 'drift', role: 'voice', tags: ['sigh', 'sleep'],
    doc: 'drifting back to sleep under the chime: a soft sigh',
    emit(R, c) {
      const t = c.t;
      R.E(t, 'mallow', 'sigh', { intensity: 0.28 }, 0.6);
    },
  },
  {
    id: 'v2/loop', cue: 'loop', role: 'marker', tags: ['loop'],
    silent: 'the hook returns silently; the circular render carries the sound across the loop seam',
    doc: 'the hook comes back for the loop',
    emit() {},
  },
];
