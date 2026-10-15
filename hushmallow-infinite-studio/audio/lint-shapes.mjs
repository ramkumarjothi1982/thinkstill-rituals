// The banned-recipe lint's shape detectors (WP-04, FU-2): what a ringtone, an
// alarm, a heartbeat, a messenger pop and a jump scare ARE, read from the events
// a recipe (or a whole score plan) plays, whatever the recipe calls itself.
//
// The sound model (sounds()). Every event becomes one or more sound parts: when
// it starts, its envelope (attack, the body above −20 dB, the −60 dB length),
// its effective RMS level over time (envelope × waveform; for noise the
// engine's white noise through its band), and for a tone its pitch path:
//   - where its energy sits: the energy-weighted median of the pitch path under
//     the envelope, on a ≤ 0.25 ms grid;
//   - whether it holds still: a tone is STEADY when ≥ 85 % of its energy lies
//     within ±25 cents of that pitch, so an inaudible onset scoop under the attack
//     (2 ms of any depth under a 4 ms attack keeps ≥ 97 %) leaves a beep a beep
//     (FU-2: the raw glide in cents used to decide this), while the least-moving
//     approved chirp (v2's flinch, 78 %) stays a chirp; a vibrato deeper than 100
//     cents counts against it unless it is a trill (≥ 10 Hz: a bell ring);
//   - how far it bends while it sounds (`bend`): from the energy-weighted median
//     pitch of the earlier half of its energy to that of the later half, so an
//     onset scoop, or a glide that runs on after the sound has died, bends nothing
//     (FU-2 R2: the raw f0 → f1 glide used to decide "does a thump rise" and "are
//     two chirps the same kind");
//   - a CHIRP is a short tone whose pitch moves (v2's blink, a water drip).
// The studio's instruments (blip, ping, bell, noiseHit, air) are modelled as
// audio/render-offline.mjs plays them. The engine's fx voices are modelled as
// the app's engine builds them (hushmallow/src/engine/audio.js FX: tones,
// noise, grains, bells, pads; their pitch from `pitch` and the pentatonic
// `note`, their level A × trim), so a pitched engine voice (chime, pluck, glass,
// drip, bubble, settle, thrum …) is a pitched sound to every detector and its
// level adds to the studio's. The Mallow's own gestures are kit-specific and stay
// opaque: ranked by a representative level and limited as a stack (LOUD.voice).
// Parts starting within 30 ms are one sound (a cluster), led by its loudest part.
//
// The detectors (shapeFindings()) and why each is shaped the way it is:
//
//   alarm       a SIGNAL TONE repeated: a beep (a steady tone, 30 ms to 0.5 s if
//               struck, up to 2 s if held) three or more times at a steady interval
//               of up to 4 s, its pitch allowed to drift by less than a whole tone
//               per repeat; any steady tone (a chime, a 25 ms pip) four times so;
//               two identical short beeps 60 ms–0.6 s apart ("beep-beep"; two pips
//               under 30 ms are a double click, three a gag, four an alarm); a held
//               square or sawtooth tone (a buzzer); a siren. Any other sound
//               becomes alarm-like only when repeated like a machine: four times at
//               ≤ 0.6 s or five at ≤ 4 s, at a steady interval. Three of the same
//               approved sound (a triple blink, three glances, three chimes) is a
//               gag, not an alarm.
//   ringtone    a telephone ring: a ring burst (two tones that each hold their pitch
//               (within ±150 cents, bending ≤ a semitone: a drifting or slowly wobbling
//               ring still rings) sounding together for ≥ 0.3 s wherever each starts,
//               at an interval of 50–250 cents that holds, beating ≥ 10 Hz with a level
//               swing ≥ 3 dB: the two-tone of a phone line; or a trill, a tone
//               warbling ≥ 10 Hz) held ≥ 0.3 s, repeated within 6 s (every
//               national ring cadence: UK 3 s, Europe 5 s, US 6 s) or held ≥ 1 s; one
//               plain steady tone held ≥ 0.8 s and repeated within 6 s; or a melodic
//               figure played again straight away with the same rhythm at any
//               transposition: 2–24 signal notes, or 3–24 steady notes of any length
//               (a marimba or chime ringtone). A pair of chimes played again is a
//               doorbell figure the brand uses (MO-CLOSE), not a ringtone.
//   heartbeat   a lub-dub: two body thumps 0.15–0.45 s apart (the heart's S1–S2
//               interval), the pair standing out from what is around it (evenly
//               spaced thumps are a bounce). A thump is low (≥ 70 % of its energy in
//               tones whose energy sits ≤ 340 Hz and whose pitch bends up by at most
//               150 cents while it sounds, or in noise whose band ends ≤ 680 Hz),
//               reaches its peak within half the lub-dub interval (else the beats merge
//               into one swell) and has a body (above −20 dB) of at most 1.5 s; or the
//               Mallow's own short percussive gestures (tap, press, hop) alone; and it
//               is in the foreground: no sound twice as loud IN ITS REGISTER started in
//               the 100 ms before it (forward masking stays in its band: v2's landing
//               splat masks its own wobbling tail; a 2 kHz tick masks no 60 Hz thump).
//               Thumps within those 100 ms are one beat, heard at the loudest (a flam,
//               a grace thump). 340 Hz sits a minor third under the lowest falling tone
//               the approved v2 uses that is not a thump (the flinch's "mm?", 410 Hz);
//               a rising bloop (v2's landing, 274 Hz, bends 278 cents) is not a thump.
//   messenger   two notes 30–300 ms apart, at least a whole tone apart in either
//   pop         direction (a two-tone, or a step of a tri-tone): beeps, or pips (too
//               short for a beep, but their body holds ≥ 4 cycles: a pitch), or
//               long-ringing notes louder than v2's own celesta pairs (LOUD.chimePair:
//               soft two-chime figures are MO-CLOSE's voice); within 150 ms, two chirps
//               of the same kind (bending alike, whatever the waveform), or a chirp and
//               a note (a slide into a two-tone); v2's double blink, the closest
//               approved pair, is 240 ms apart. All above the thumps' register (340 Hz):
//               a lower pair is a body sound, judged as a heartbeat.
//   jump scare  the score's level rising faster than anything approved: the largest
//               rise of the summed effective RMS envelope (studio and engine fx
//               together) within any 50 ms and within 250 ms, the same for its noise
//               alone (the startle reflex is strongest for noise bursts, whatever
//               their top frequency) and for its bright broadband noise, and the
//               engine's voices starting within 50 ms summed (A × trim; the opaque
//               Mallow gestures on their own). The limits are v2's own maxima + 3 dB
//               (LOUD; calibrateLoud() recomputes them from the approved recipes and
//               the approved v2 score).
//
// Texture events (options.texture: the sparkle layer's cloud of tiny random pings,
// as audio/score.mjs generates it) count for the level but are no figure, train or
// pair: a twinkle cloud is the approved texture, not a melody.
//
// Every limit is in SHAPE or LOUD; tests/unit/audio-lint.test.mjs walks both sides
// of each, past the boundary, and holds every approved v2 recipe, alone and
// repeated, and every approved and default score plan clean.

export const NYQ = 24000;
const WHITE_RMS = 1 / Math.sqrt(3);               // the engine's white noise: uniform ±1
const WAVE_RMS = { sine: Math.SQRT1_2, triangle: WHITE_RMS, sawtooth: WHITE_RMS, square: 1 };
/** Bell partials [ratio, level, decay factor]: the renderer's celesta and the engine's PARTIALS. */
export const PARTIALS = Object.freeze({
  celesta: [[1, 1, 1], [2, 0.3, 0.55], [4, 0.08, 0.3]],
  musicbox: [[1, 1, 1], [2, 0.2, 0.5], [3, 0.09, 0.3], [5.04, 0.035, 0.18]],
  spark: [[1, 1, 1], [2, 0.32, 0.55], [3.01, 0.16, 0.4], [4.07, 0.06, 0.25]],
  lowbell: [[0.5, 0.25, 1.3], [1, 1, 1], [2.76, 0.28, 0.55], [5.4, 0.07, 0.3]],
  chime: [[1, 1, 1], [2.4, 0.22, 0.6], [3.9, 0.1, 0.4], [6.2, 0.03, 0.2]],
  glass: [[1, 1, 1], [2.32, 0.28, 0.6], [4.25, 0.1, 0.35], [6.8, 0.03, 0.2]],
});
export const cents = (a, b) => 1200 * Math.log2(b / a);
// limits are inclusive; comparisons allow for floating point (1 + 0.3 − 1 > 0.3)
const EPS_T = 1e-9, EPS_C = 1e-6;
const within = (x, lim) => x <= lim + EPS_T;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const num = (x, d) => (Number.isFinite(+x) ? +x : d);
const st = (s) => Math.pow(2, s / 12);

export const SHAPE = Object.freeze({
  clusterSec: 0.03,
  grid: 0.00025,
  steady: { cents: 25, share: 0.85, vib: 100 },
  trill: { rate: 10, cents: 50 },
  note: { minDur: 0.03, maxStruck: 0.5, maxHeld: 2, minCycles: 4 },
  chirp: { maxDur: 0.5 },
  drift: 150,
  sameBand: 0.15,
  durRatio: 2,
  train: { beeps: 3, tones: 4, spread: 0.25, maxGap: 4 },
  mechanical: { fast: 4, fastGap: 0.6, slow: 5 },
  beepBeep: { min: 0.06, max: 0.6, maxDur: 0.25, cents: 50 },
  buzzer: { minDur: 0.3, waves: ['square', 'sawtooth'] },
  siren: { min: 3, minCents: 300, joinSec: 0.1, extentRatio: 2, shared: 0.5 },
  ring: { body: 0.3, held: 1, single: 0.8, maxGap: 6, dual: [50, 250], beatDb: 3, maxBend: 100 },
  figure: { minLen: 2, chimeLen: 3, maxLen: 24, spread: 0.25, maxGap: 0.6, cents: 50 },
  lubDub: { min: 0.15, max: 0.45, pause: 1.3, lowHz: 340, lowNoiseHz: 680, lowShare: 0.7, maxBend: 150, attackShare: 0.5, maxBody: 1.5, maskSec: 0.1, maskRatio: 2 },
  pop: { min: 0.03, max: 0.3, minCents: 200, chirpMax: 0.15, chirpGlide: 1.5 },
  bright: { topHz: 6000, minBand: 3000 },
  rise: { window: 0.05, riser: 0.25, grid: 0.00025 },
});

/**
 * Jump-scare and level limits: v2's maxima + 3 dB (calibrateLoud, recomputed by the
 * tests). Over every approved v2 recipe and the approved v2 score:
 *   rise, riser  the summed effective RMS envelope's largest rise within 50 ms and
 *                within 250 ms: the landing's splat (0.0546 both: v2 has no slower
 *                loud swell);
 *   noise        its noise alone within 50 ms: the landing's squelch and splash (0.0161);
 *   bright       its bright broadband noise within 50 ms: the landing's splash hiss (0.0110);
 *   engine       engine voices starting within 50 ms (A × trim): a thought's bubble
 *                (0.8; + 3 dB would exceed full force, so the limit stays the engine at
 *                90 % of its full amplitude);
 *   voice        the Mallow's opaque gestures starting within 50 ms: the drift sigh (0.362);
 *   chimePair    the quieter note of a pair of long-ringing notes a whole tone or
 *                more apart within 300 ms: the eyes-open celesta pair (0.0126).
 */
export const LOUD = Object.freeze({ rise: 0.0773, riser: 0.0773, noise: 0.0228, bright: 0.0155, engine: 0.9, voice: 0.5125, chimePair: 0.0178 });

/**
 * The Mallow's gestures as the lint can know them without a kit (the voices are
 * kit-specific): `eff` is a representative effective RMS per unit A × trim, used
 * only to rank a gesture against other parts of its cluster; `thumps` are the
 * gestures that are short and percussive in every kit (hushmallow/src/engine/audio.js
 * GESTURES: tap is one note, press a 0.18 s glide, hop a 0.12 s glide and a note).
 */
export const ENGINE = Object.freeze({ eff: 0.07, thumps: Object.freeze(['tap', 'press', 'hop']) });

// ----------------------------------------------------------- envelopes --

/** The renderer's (and the engine's 'pluck') percussive envelope: linear attack, hold, −60 dB exponential decay. */
const envAD = (a, h, d) => (x) => (x < 0 ? 0 : x < a ? x / a : x < a + h ? 1 : x < a + h + d ? Math.pow(10, (-3 * (x - a - h)) / d) : 0);
/** A raised-cosine swell: up over a, held h, down over r (the renderer's air; the engine's 'swell'). */
const envSwell = (a, h, r) => (x) => (x < 0 ? 0 : x < a ? (1 - Math.cos((Math.PI * x) / a)) / 2 : x < a + h ? 1
  : x < a + h + r ? (1 + Math.cos((Math.PI * (x - a - h)) / r)) / 2 : 0);

const gridOf = (dur) => Math.min(8192, Math.max(64, Math.ceil(dur / SHAPE.grid)));

/** The energy-weighted median of cs[i] over the grid indices i0 ≤ i < i1 (es: the energies). */
function weightedMedian(cs, es, i0, i1) {
  const order = [];
  let w = 0;
  for (let i = i0; i < i1; i++) { order.push(i); w += es[i]; }
  if (!order.length) return 0;
  order.sort((a, b) => cs[a] - cs[b]);
  let acc = 0;
  for (const i of order) { acc += es[i]; if (acc >= w / 2) return cs[i]; }
  return cs[order[order.length - 1]];
}

/**
 * Where a tone's energy sits and how still it holds, from its pitch path under its
 * envelope (path(x) → Hz, env(x) → amplitude; energy = amplitude²):
 *   hz      the energy-weighted median pitch: where most of its energy sits;
 *   held    the share of its energy within ±SHAPE.steady.cents of that pitch (a 2 ms
 *           onset scoop under a 4 ms attack, however deep, holds ≥ 97 %);
 *   holdWide  the share within ±SHAPE.drift (150 cents: the lint's "same pitch") of it;
 *   bend    how far its pitch moves while it sounds (cents, signed): from the
 *           energy-weighted median pitch of the earlier half of its energy to that of
 *           the later half. An onset scoop or a glide that ends after the sound has
 *           died away moves neither median, so it moves nothing (FU-2 R2: the raw
 *           f0 → f1 glide used to stand for this);
 *   spread  the energy-weighted standard deviation around the mean (cents; reported).
 */
export function pitchStats(path, env, dur) {
  const n = gridOf(dur), ref = path(0), W = SHAPE.steady.cents;
  const cs = new Float64Array(n), es = new Float64Array(n);
  let w = 0, s = 0, s2 = 0;
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * dur, e = env(x) ** 2, c = 1200 * Math.log2(path(x) / ref);
    cs[i] = c; es[i] = e; w += e; s += e * c; s2 += e * c * c;
  }
  if (!(w > 0)) return { hz: ref, held: 1, holdWide: 1, bend: 0, spread: 0 };
  const med = weightedMedian(cs, es, 0, n);
  let held = 0, holdWide = 0, half = n, acc = 0;
  for (let i = 0; i < n; i++) {
    const off = Math.abs(cs[i] - med);
    if (off <= W + EPS_C) held += es[i];
    if (off <= SHAPE.drift + EPS_C) holdWide += es[i];
    if (half === n && (acc += es[i]) >= w / 2) half = i + 1;
  }
  const bend = half < n ? weightedMedian(cs, es, half, n) - weightedMedian(cs, es, 0, half) : 0;
  const m = s / w;
  return { hz: ref * Math.pow(2, med / 1200), held: held / w, holdWide: holdWide / w, bend, spread: Math.sqrt(Math.max(0, s2 / w - m * m)) };
}

/** Energy-weighted mean of f(x) under env over [0, dur]. */
function energyMean(f, env, dur) {
  const n = gridOf(dur);
  let w = 0, s = 0;
  for (let i = 0; i < n; i++) { const x = ((i + 0.5) / n) * dur, e = env(x) ** 2; w += e; s += e * f(x); }
  return w > 0 ? s / w : 0;
}

/** A part's energy: ∫ level(x)² dx over [0, dur]. */
function energyOf(level, dur) {
  const n = gridOf(dur);
  let s = 0;
  for (let i = 0; i < n; i++) s += level(((i + 0.5) / n) * dur) ** 2;
  return (s * dur) / n;
}

/** The end of the body: the last time the level is within 20 dB of its peak. */
function bodyEnd(level, dur) {
  const n = gridOf(dur);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, level(((i + 0.5) / n) * dur));
  for (let i = n - 1; i >= 0; i--) { const x = ((i + 0.5) / n) * dur; if (level(x) >= 0.1 * peak) return x; }
  return 0;
}

// ----------------------------------------------------------- sound model --

/** The band [lo, hi] (Hz) a noise filter passes (its noise bandwidth; the widest extent of a sweep). */
export function noiseBand(filter = 'lowpass', f = 1000, f1 = f, q = 0.8, ...more) {
  const fs = [f, f1, ...more].filter((x) => Number.isFinite(x) && x > 0);
  if (filter === 'highpass') return [Math.min(...fs), NYQ];
  if (filter === 'bandpass') { const c = Math.max(...fs), bw = (Math.PI / 2) * c / q; return [Math.max(0, c - bw / 2), Math.min(NYQ, c + bw / 2)]; }
  return [0, Math.min(NYQ, Math.max(...fs))];      // lowpass (the default)
}
/** Effective RMS of the engine's white noise at envelope level `peak` through a band. */
export const noiseEff = (peak, [lo, hi]) => peak * WHITE_RMS * Math.sqrt(Math.max(0, hi - lo) / NYQ);
const isBright = ([lo, hi]) => hi >= SHAPE.bright.topHz && hi - lo >= SHAPE.bright.minBand;
const expGlide = (f, f1, g) => (f1 && g > 0 ? (x) => (x < g ? f * Math.pow(f1 / f, x / g) : f1) : () => f);

/**
 * A pitched tone part. spec: { wave, f, f1, path, env, dur, attack, hold, peak, vibDepth(x), vibRate }.
 * → { …base, key, wave, dur, attack, hold, body, pitched, steady, chirp, trill, hz, spread, f0, f1,
 *     glide (cents), glideSec, eff, level(x) }
 */
function tonePart(base, { wave = 'sine', f, f1 = f, path, env, dur, attack, hold = 0, peak, glideSec = 0, vibDepth = null, vibRate = 0, key }) {
  const { hz, held, holdWide, bend, spread } = pitchStats(path, env, dur);
  const vib = vibDepth ? energyMean(vibDepth, env, dur) : 0;
  const S = SHAPE.steady, T = SHAPE.trill, still = held >= S.share - EPS_C;
  const warble = vibRate >= T.rate && vib >= T.cents - EPS_C;
  const trill = still && warble;
  const steady = still && (vib <= S.vib + EPS_C || trill);
  const eff = peak * WAVE_RMS[wave], level = (x) => eff * env(x);
  return { ...base, key: key || `${base.inst}:${wave}`, wave, dur, attack, hold, body: bodyEnd(level, dur), energy: energyOf(level, dur), pitched: true, steady, trill,
    chirp: !steady, hz, held, holds: holdWide >= S.share - EPS_C, warble, bend, spread, vib, f0: f, f1, glide: cents(f, f1), glideSec, path, eff, level };
}

/** A bell part (additive partials with their own decays; the fundamental is the note). */
function bellPart(base, { f, peak, decay, partials = PARTIALS.celesta, a = 0.003, key }) {
  const ps = partials.filter(([r]) => f * r <= 7500).map(([, amp, dec]) => ({ amp, env: envAD(a, 0, decay * dec) }));
  const level = (x) => peak * Math.SQRT1_2 * Math.sqrt(ps.reduce((s, p) => s + (p.amp * p.env(x)) ** 2, 0));
  const dur = a + Math.max(...partials.filter(([r]) => f * r <= 7500).map(([, , dec]) => decay * dec), 0);
  return { ...base, key: key || `${base.inst}:bell`, wave: 'bell', dur, attack: a, hold: 0, body: bodyEnd(level, dur), energy: energyOf(level, dur), pitched: true, steady: true, trill: false, chirp: false,
    hz: f, held: 1, holds: true, warble: false, bend: 0, spread: 0, vib: 0, f0: f, f1: f, glide: 0, glideSec: 0, path: () => f, eff: level(a), level };
}

/** A noise part: band-limited white noise; a narrow band-pass (Q ≥ 4) is heard as a pitch. */
function noisePart(base, { filter = 'lowpass', f, f1 = null, f2 = null, q = 0.8, lp = null, topCap = null, env, dur, attack, peak, glideSec = 0, key }) {
  const b = noiseBand(filter, f, f1 ?? f, q, ...(f2 ? [f2] : []));
  const band = [b[0], Math.min(b[1], ...[lp, topCap].filter(Boolean))];
  const eff = noiseEff(peak, band), level = (x) => eff * env(x);
  const narrow = filter === 'bandpass' && q >= 4;
  const path = expGlide(f, f1, glideSec);
  const ps = narrow ? pitchStats(path, env, dur) : null;
  const centre = filter === 'highpass' ? Math.sqrt(band[0] * band[1]) : (band[0] + band[1]) / 2;
  return { ...base, key: key || `noise:${filter}`, wave: 'noise', dur, attack, hold: 0, body: bodyEnd(level, dur), energy: energyOf(level, dur), pitched: narrow,
    steady: narrow && ps.held >= SHAPE.steady.share - EPS_C, trill: false, chirp: false, hz: narrow ? ps.hz : centre, held: ps ? ps.held : 0, bend: ps ? ps.bend : 0, spread: ps ? ps.spread : 0, vib: 0,
    f0: f, f1: f1 ?? f, glide: f1 ? cents(f, f1) : 0, glideSec, band, bright: isBright(band), eff, level };
}

/** A studio synth event (audio/render-offline.mjs INST) → its parts. */
function synthParts(e) {
  const base = { t: e.t, src: 'synth', inst: e.inst };
  if (e.inst === 'blip') {
    const a = e.a || 0.002, h = e.h || 0, d = e.d || 0.08, f1 = e.f1 || e.f, g = e.f1 ? e.glide || 0.05 : 0, wave = e.type || 'sine';
    const vd = e.vib ? (x) => e.vib.cents * Math.max(0, 1 - x / (e.vib.decay || 0.3)) : null;   // the renderer's linear vibrato decay
    return [tonePart(base, { wave, f: e.f, f1, path: expGlide(e.f, e.f1, g), env: envAD(a, h, d), dur: a + h + d, attack: a, hold: h, peak: e.peak,
      glideSec: g, vibDepth: vd, vibRate: e.vib?.rate || 0, key: `blip:${wave}` })];
  }
  if (e.inst === 'ping') {
    const f1 = e.f * (e.rise ?? 1);
    return [tonePart(base, { f: e.f, f1, path: (x) => e.f + (f1 - e.f) * Math.min(1, x / e.decay), env: envAD(0.002, 0, e.decay), dur: 0.002 + e.decay,
      attack: 0.002, peak: e.peak, glideSec: e.decay, key: 'ping:sine' })];
  }
  if (e.inst === 'bell') return [bellPart(base, { f: e.f, peak: e.peak, decay: e.decay, partials: PARTIALS[e.partials || 'celesta'] || PARTIALS.celesta, key: `bell:${e.partials || 'celesta'}` })];
  if (e.inst === 'noiseHit') {
    const a = e.a ?? 0.003, d = e.d || 0.08;
    return [noisePart(base, { filter: e.filter || 'lowpass', f: e.f, f1: e.f1 || null, q: e.q || 0.8, env: envAD(a, 0, d), dur: a + d, attack: a, peak: e.peak,
      glideSec: e.f1 ? e.sweep || 0.08 : 0, key: `noise:${e.filter || 'lowpass'}` })];
  }
  if (e.inst === 'air') {
    // band-passed noise swept f0 → f1, then the renderer's 3 kHz low-pass
    return [noisePart(base, { filter: 'bandpass', f: e.f0, f1: e.f1, q: e.q || 0.8, topCap: 3000, env: envSwell(e.a, 0, e.r), dur: e.a + e.r, attack: e.a, peak: e.peak,
      glideSec: e.a + e.r, key: 'noise:air' })];
  }
  return [];
}

// -------------------------------------------------------- engine voices --
//
// The app engine's fx voices (hushmallow/src/engine/audio.js FX, read-only), as
// primitives: o = { A, P, I, note, duration } exactly as buildFx computes them.

const PENTA = [0, 2, 4, 7, 9];
/** step n of the engine's major pentatonic (audio.js penta). */
const penta = (n) => { const k = Math.max(0, Math.floor(Number(n) || 0)) % 10; return st(PENTA[k % 5] + 12 * Math.floor(k / 5)); };
const tone = (dt, o) => ({ prim: 'tone', dt, ...o });
const noise = (dt, o) => ({ prim: 'noise', dt, ...o });
const grains = (dt, o) => ({ prim: 'grains', dt, ...o });
const bell = (dt, o) => ({ prim: 'bell', dt, ...o });
const pad = (dt, o) => ({ prim: 'pad', dt, ...o });
const pop = (dt, f, peak) => tone(dt, { type: 'sine', f, f1: f * 0.27, glide: 0.03, a: 0.003, r: 0.07, peak });
const droplet = (dt, { f = 900, peak = 0.12, r = 0.12, drop = 0.5 }) => tone(dt, { type: 'sine', f, f1: f * drop, glide: 0.045, a: 0.003, r, peak });

export const ENGINE_FX = Object.freeze({
  crackle: (o) => [grains(0, { dur: 0.7, rate: 28 + 40 * o.I, len: [0.003, 0.011], peak: 0.12 * o.A, f: 2300 * o.P, q: 1.2, lp: 4800 })],
  sort: (o) => [...[0, 4, 7].map((s, i) => tone(i * 0.065, { type: 'triangle', f: 523.25 * o.P * st(s), a: 0.005, r: 0.16, peak: 0.08 * o.A })),
    noise(0, { dur: 0.22, a: 0.05, peak: 0.025 * o.A, f: 1100, f1: 2000, q: 0.9, lp: 3500, shape: 'swell' })],
  snap: (o) => [pop(0, 1150 * o.P, 0.2 * o.A), noise(0, { dur: 0.035, a: 0.003, peak: 0.04 * o.A, f: 2400, q: 1, lp: 3800 })],
  'drop-in': (o) => [tone(0, { f: 900 * o.P, f1: 320 * o.P, glide: 0.17, a: 0.006, h: 0.05, r: 0.12, peak: 0.08 * o.A }),
    tone(0.17, { f: 150, f1: 70, glide: 0.1, a: 0.005, r: 0.22, peak: 0.14 * o.A }), droplet(0.2, { f: 1050 * o.P, peak: 0.05 * o.A, r: 0.12 })],
  clear: (o) => [noise(0, { dur: 2.4, a: 0.9, peak: 0.04 * o.A, filter: 'lowpass', f: 500, f1: 3600, q: 0.7, shape: 'swell' }),
    ...[0, 4, 7, 11, 14, 19].map((s, i) => bell(0.3 + i * 0.12, { f: 523.25 * o.P * st(s), peak: 0.045 * o.A, r: 1.3, partials: PARTIALS.celesta })),
    pad(0.2, { freqs: [261.6 * o.P, 329.6 * o.P, 392 * o.P], a: 0.9, h: 0.4, r: 1.4, peak: 0.07 * o.A })],
  portal: (o) => [tone(0, { f: 45 * o.P, f1: 75 * o.P, glide: 1.6, a: 0.8, h: 0.6, r: 1.6, peak: 0.1 * o.A, shape: 'swell' }),
    pad(0.1, { freqs: [110, 164.8, 220, 277.2].map((f) => f * o.P), a: 1.0, h: 0.5, r: 1.8, peak: 0.07 * o.A }),
    noise(0, { dur: 2.6, a: 1.1, peak: 0.03 * o.A, f: 220, f1: 1500, q: 1.4, shape: 'swell' }),
    bell(1.3, { f: 440 * o.P, peak: 0.06 * o.A, r: 2, partials: PARTIALS.lowbell })],
  separate: (o) => [tone(0, { f: 440 * o.P, a: 0.02, h: 0.12, r: 0.12, peak: 0.08 * o.A, shape: 'swell' }),
    tone(0.12, { f: 440 * o.P, f1: 440 * o.P * st(4), glide: 0.35, a: 0.04, h: 0.25, r: 0.4, peak: 0.08 * o.A, vib: { rate: 5, depth: 10 } }),
    tone(0.12, { type: 'triangle', f: 440 * o.P, f1: 440 * o.P * st(-5), glide: 0.35, a: 0.04, h: 0.25, r: 0.4, peak: 0.08 * o.A })],
  'rotate-tick': (o) => [tone(0, { type: 'triangle', f: 1500 * o.P, a: 0.003, r: 0.03, peak: 0.06 * o.A }), tone(0, { f: 750 * o.P, a: 0.003, r: 0.04, peak: 0.06 * o.A })],
  'lens-focus': (o) => [tone(0, { f: 440 * o.P * 1.07, f1: 440 * o.P, glide: 0.7, a: 0.15, h: 0.3, r: 0.35, peak: 0.055 * o.A, shape: 'swell' }),
    tone(0, { f: 440 * o.P * 0.93, f1: 440 * o.P, glide: 0.7, a: 0.15, h: 0.3, r: 0.35, peak: 0.055 * o.A, shape: 'swell' }),
    noise(0, { dur: 0.75, a: 0.3, peak: 0.022 * o.A, f: 2800, f1: 900, q: 3, shape: 'swell' }),
    bell(0.72, { f: 880 * o.P, peak: 0.05 * o.A, r: 0.6, partials: PARTIALS.celesta })],
  chime: (o) => [bell(0, { f: 880 * o.P, peak: 0.1 * o.A, r: 1.6, partials: PARTIALS.chime })],
  star: (o) => [bell(0, { f: 1318.5 * o.P, peak: 0.055 * o.A, r: 0.7, partials: PARTIALS.spark }), bell(0.07, { f: 1975.5 * o.P, peak: 0.035 * o.A, r: 0.55, partials: PARTIALS.celesta }),
    grains(0.02, { dur: 0.3, rate: 22, len: [0.002, 0.006], peak: 0.03 * o.A, f: 3600, q: 1.5, lp: 5200 })],
  bloom: (o) => [0, 4, 7, 11, 14].map((s, i) => tone(i * 0.09, { type: 'triangle', f: 261.63 * o.P * st(s), a: 0.15, h: 0.25, r: 1.1, peak: 0.042 * o.A, shape: 'swell' })),
  pluck: (o) => { const f = 392 * o.P * penta(o.note); return [tone(0, { type: 'triangle', f, a: 0.004, r: 0.42, peak: 0.07 * o.A }), tone(0, { f: f * 2, a: 0.003, r: 0.22, peak: 0.022 * o.A })]; },
  glass: (o) => [bell(0, { f: 1046.5 * o.P * penta(o.note), peak: 0.05 * o.A, r: 1.4, partials: PARTIALS.glass })],
  drip: (o) => [droplet(0, { f: 980 * o.P * penta(o.note), peak: 0.07 * o.A, r: 0.14, drop: 0.55 })],
  paper: (o) => [noise(0, { dur: 0.26, a: 0.03, peak: 0.035 * o.A, f: 2600 * o.P, f1: 1500 * o.P, q: 0.6, lp: 5200 }),
    grains(0, { dur: 0.22, rate: 40, len: [0.002, 0.006], peak: 0.02 * o.A, f: 3400 * o.P, q: 0.8, lp: 6000 })],
  wind: (o) => [noise(0, { dur: 1.6, a: 0.6, peak: 0.04 * o.A, f: 380 * o.P, f1: 900 * o.P, f2: 420 * o.P, q: 1.4, shape: 'swell' })],
  settle: (o) => [tone(0, { f: 196 * o.P, f1: 147 * o.P, glide: 0.5, a: 0.02, h: 0.1, r: 0.7, peak: 0.07 * o.A, shape: 'swell' }),
    bell(0.05, { f: 587.3 * o.P, peak: 0.03 * o.A, r: 1.1, partials: PARTIALS.celesta })],
  swish: (o) => [noise(0, { dur: 0.32, a: 0.1, peak: 0.032 * o.A, f: 700 * o.P, f1: 2400 * o.P, q: 0.9, lp: 4200, shape: 'swell' })],
  shimmer: (o) => [0, 2, 4, 7, 9].map((s, i) => bell(i * 0.07, { f: 1318.5 * o.P * st(s), peak: 0.02 * o.A, r: 0.9, partials: PARTIALS.celesta })),
  thrum: (o) => [tone(0, { f: 98 * o.P, a: 0.05, h: 0.15, r: 0.6, peak: 0.1 * o.A, shape: 'swell' }), tone(0, { type: 'triangle', f: 196 * o.P, a: 0.05, h: 0.1, r: 0.4, peak: 0.03 * o.A })],
  click: (o) => [tone(0, { type: 'triangle', f: 1800 * o.P, a: 0.002, r: 0.025, peak: 0.045 * o.A })],
  bubble: (o) => [tone(0, { f: 420 * o.P * penta(o.note), f1: 820 * o.P * penta(o.note), glide: 0.06, a: 0.004, r: 0.1, peak: 0.06 * o.A })],
  unlock: (o) => [pop(0, 900 * o.P, 0.08 * o.A), bell(0.06, { f: 784 * o.P, peak: 0.045 * o.A, r: 0.8, partials: PARTIALS.musicbox }),
    bell(0.16, { f: 1174.7 * o.P, peak: 0.035 * o.A, r: 0.9, partials: PARTIALS.musicbox })],
  'breathe-in': (o) => { const d = clamp(num(o.duration, 4), 1, 10); return [noise(0, { dur: d + 0.6, a: d * 0.85, r: 0.6, peak: 0.05 * o.A, f: 350, f1: 900, q: 0.8, lp: 2000, shape: 'swell' }),
    tone(0, { f: 196 * o.P, f1: 294 * o.P, glide: d, a: d * 0.85, r: 0.7, peak: 0.04 * o.A, shape: 'swell' })]; },
  'breathe-out': (o) => { const d = clamp(num(o.duration, 5), 1, 12); return [noise(0, { dur: d, a: 0.35, r: d - 0.35, peak: 0.05 * o.A, f: 900, f1: 300, q: 0.8, lp: 2000, shape: 'swell' }),
    tone(0, { f: 294 * o.P, f1: 196 * o.P, glide: d, a: 0.4, r: d - 0.4, peak: 0.04 * o.A, shape: 'swell' })]; },
});

/** The engine's envelope (audio.js env): attack ≥ 3 ms, release ≥ 20 ms; a swell holds 2 ms more. */
function engineEnv({ a = 0.005, h = 0, r = 0.2, shape = 'pluck' }) {
  const A = Math.max(a, 0.003), R = Math.max(r, 0.02), H = Math.max(h, 0);
  return shape === 'swell' ? { env: envSwell(A, H + 0.002, R), dur: A + H + 0.002 + R, attack: A, hold: H }
    : { env: envAD(A, H, R), dur: A + H + R, attack: A, hold: H };
}

/**
 * One engine primitive (with the voice's trim and cut) → parts. `mono`: the gain of an
 * oscillator source relative to the studio's strips. A Voice at pan 0 has no panner, so
 * its mono oscillators reach both channels at full gain (+3 dB against the studio's
 * equal-power strip); the engine's noise buffers are stereo already. Measured against the
 * engine (tests/parity/audio-lint-engine.test.mjs, the onset's 250 ms): within 1.2 dB for
 * 20 of the 29 voices tried; the shortest clicks, the grains' worst case and the slow
 * noise swells read 1.4–2.5 dB high (conservative); the sustained tonal swells (thrum,
 * bloom, lens-focus, portal) 2–4 dB low, from the reverb building up under them and
 * their partials beating.
 */
function primParts(p, base, trim, cutAt, mono = 1) {
  const t = base.t + p.dt, b = { ...base, t };
  // the voice's cut: its gain ramps to 0 over [at, at + fade] (render-offline: v.out.gain)
  const cut = (env, dur) => (cutAt ? { env: (x) => env(x) * clamp((cutAt.end - (t + x)) / cutAt.fade, 0, 1), dur: clamp(cutAt.end - t, 0, dur) } : { env, dur });
  if (p.prim === 'tone') {
    const e = engineEnv(p), wave = p.type || 'sine', g = p.f1 ? p.glide ?? 0.1 : 0;
    const vd = p.vib ? (x) => { const d0 = p.vib.delay || 0; const up = clamp(x / (d0 + 0.04), 0, 1) * p.vib.depth; return p.vib.decay ? up * clamp(1 - (x - d0 - 0.04) / p.vib.decay, 0, 1) : up; } : null;
    const c = cut(e.env, e.dur);
    return [tonePart(b, { wave, f: p.f, f1: p.f1 || p.f, path: expGlide(p.f, p.f1, g), env: c.env, dur: Math.max(c.dur, 1e-4), attack: e.attack, hold: e.hold,
      peak: Math.max(p.peak, 1e-4) * trim * mono, glideSec: g, vibDepth: vd, vibRate: p.vib?.rate || 0, key: `${base.key}:tone:${wave}` })];
  }
  if (p.prim === 'noise') {
    const dur0 = p.dur ?? 0.4, a = p.a ?? 0.02, h = p.h ?? 0, r = p.r ?? Math.max(0.03, dur0 - a - h);
    const e = engineEnv({ a, h, r, shape: p.shape }), c = cut(e.env, e.dur);
    return [noisePart(b, { filter: p.filter || 'bandpass', f: p.f ?? 1000, f1: p.f1 ?? null, f2: p.f2 ?? null, q: p.q ?? 0.8, lp: p.lp ?? null, env: c.env,
      dur: Math.max(c.dur, 1e-4), attack: e.attack, peak: Math.max(p.peak ?? 0.05, 1e-4) * trim, glideSec: p.f1 ? e.dur : 0, key: `${base.key}:noise` })];
  }
  if (p.prim === 'grains') {
    // gated noise grains at random times: modelled at their worst case, a grain at full
    // level (2 ms up) from the onset, the peaks fading by `fade` over the burst
    const dur0 = p.dur ?? 0.5, fade = p.fade ?? 0.6;
    const env0 = (x) => (x < 0 || x > dur0 ? 0 : Math.min(1, x / 0.002) * (1 - (fade * x) / dur0)), c = cut(env0, dur0);
    return [noisePart(b, { filter: p.filter || 'bandpass', f: p.f ?? 2500, f1: p.f1 ?? null, q: p.q ?? 1, lp: p.lp ?? 5000, env: c.env, dur: Math.max(c.dur, 1e-4), attack: 0.002,
      peak: (p.peak ?? 0.05) * trim, key: `${base.key}:grains` })];
  }
  if (p.prim === 'bell') {
    const part = bellPart(b, { f: p.f ?? 880, peak: (p.peak ?? 0.08) * trim * mono, decay: p.r ?? 1, partials: p.partials || PARTIALS.celesta, a: Math.max(p.a ?? 0.003, 0.003), key: `${base.key}:bell` });
    if (!cutAt) return [part];
    const level0 = part.level, c = cut((x) => level0(x) / (part.eff || 1), part.dur);
    const level = (x) => (part.eff || 1) * c.env(x);
    return [{ ...part, dur: Math.max(c.dur, 1e-4), level, body: bodyEnd(level, Math.max(c.dur, 1e-4)), energy: energyOf(level, Math.max(c.dur, 1e-4)) }];
  }
  if (p.prim === 'pad') {
    // N notes, each two detuned oscillators summing in power (peak / √(2N) each)
    const n = p.freqs.length, e = engineEnv({ a: p.a ?? 0.4, h: p.h ?? 0.3, r: p.r ?? 0.8, shape: p.shape || 'swell' }), c = cut(e.env, e.dur);
    return p.freqs.map((f) => tonePart(b, { wave: p.type || 'triangle', f, path: () => f, env: c.env, dur: Math.max(c.dur, 1e-4), attack: e.attack, hold: e.hold,
      peak: ((p.peak ?? 0.06) / Math.sqrt(n)) * trim * mono, key: `${base.key}:pad` }));
  }
  return [];
}

/**
 * An engine event → its parts. fx voices are modelled (ENGINE_FX); the Mallow's
 * gestures, the hold-based fx (charge, ground) and unknown names are opaque: one
 * unpitched part ranked by ENGINE.eff and limited as a stack.
 */
function engineParts(e) {
  const I = clamp(num(e.opts?.intensity, 0.6), 0, 1), A = 0.45 + 0.55 * I, P = clamp(num(e.opts?.pitch, 1), 0.25, 4), trim = e.trim ?? 1;
  const base = { t: e.t, src: 'engine', inst: e.kind, name: e.name, voice: e.kind === 'mallow', engine: A * trim, key: `${e.kind}:${e.name}` };
  const model = e.kind === 'fx' && Object.hasOwn(ENGINE_FX, e.name) ? ENGINE_FX[e.name] : null;
  if (!model) {
    const p = (e.opts?.pitch ?? 1) * Math.pow(2, (e.opts?.note ?? 0) / 12);
    return [{ ...base, opaque: true, head: true, dur: e.opts?.duration ?? 0.3, attack: 0.005, hold: 0, body: e.opts?.duration ?? 0.3, pitched: false, steady: false, trill: false, chirp: false,
      hz: 440 * p, held: 0, bend: 0, spread: 0, vib: 0, f0: 440 * p, f1: 440 * p, glide: 0, glideSec: 0, eff: A * trim * ENGINE.eff, cut: e.cut }];
  }
  const cutAt = e.cut ? { at: e.cut.at, fade: Math.max(e.cut.fade, 1e-4), end: e.cut.at + Math.max(e.cut.fade, 1e-4) } : null;
  const mono = num(e.opts?.pan, 0) === 0 ? Math.SQRT2 : 1;      // buildFx: new Voice({ pan }) adds a panner only for pan ≠ 0
  const parts = model({ A, P, I, note: e.opts?.note, duration: e.opts?.duration }).flatMap((p) => primParts(p, base, trim, cutAt, mono));
  return parts.map((p, i) => (i === 0 ? { ...p, head: true } : p));
}

/**
 * The sound parts of a probe (or of a whole score plan's events), in time order.
 * options.texture: events (by identity, or a predicate) that count only for the level.
 */
export function sounds({ engine = [], synth = [] }, { texture = null } = {}) {
  const isTex = typeof texture === 'function' ? texture : texture ? (e) => texture.has(e) : () => false;
  const out = [];
  for (const e of synth) for (const p of synthParts(e)) out.push(isTex(e) ? { ...p, texture: true } : p);
  for (const e of engine) for (const p of engineParts(e)) out.push(isTex(e) ? { ...p, texture: true } : p);
  return out.sort((a, b) => a.t - b.t || a.key.localeCompare(b.key) || a.hz - b.hz);
}

/** Parts starting within SHAPE.clusterSec of a cluster's first onset are one sound, led by its loudest part. */
export function clusters(list) {
  const out = [];
  for (const s of list) {
    const last = out[out.length - 1];
    if (last && s.t - last.t <= SHAPE.clusterSec) last.parts.push(s); else out.push({ t: s.t, parts: [s] });
  }
  for (const c of out) {
    c.parts.sort((a, b) => a.key.localeCompare(b.key) || a.hz - b.hz);
    c.dur = Math.max(...c.parts.map((p) => p.t - c.t + p.dur));
    c.lead = c.parts.reduce((a, b) => (b.eff > a.eff ? b : a));
  }
  return out;
}

// --------------------------------------------------------------- classes --

/** A note: the cluster's lead is a pitched sound (a tone, a bell, a narrow noise band) whose pitch holds still. */
export const isNote = (c) => c.lead.pitched && c.lead.steady;
/** A signal note (a beep): a note 30 ms–0.5 s long if struck, up to 2 s if held. */
export const isSignal = (c) => isNote(c) && c.lead.dur >= SHAPE.note.minDur - EPS_T && within(c.lead.dur, c.lead.hold > 0 ? SHAPE.note.maxHeld : SHAPE.note.maxStruck);
/**
 * A pip: a note too short to be a beep (under note.minDur) that still has a definite
 * pitch, its body (above −20 dB) holding ≥ note.minCycles cycles. Below about four
 * cycles a tone is a click: its spectral blur (about one over its cycles, > 25 %) is
 * wider than a major third, so no interval is heard. A pip carries a two-tone (a
 * messenger pop's notes need a pitch, not a beep's length); it is no alarm beep.
 */
export const isPip = (c) => isNote(c) && c.lead.dur < SHAPE.note.minDur - EPS_T && c.lead.body * c.lead.hz >= SHAPE.note.minCycles - EPS_C;
/** A chime: a struck note that rings longer than a beep. */
export const isChime = (c) => isNote(c) && !(c.lead.hold > 0) && c.lead.dur > SHAPE.note.maxStruck + EPS_T;
/** A chirp: a short tone whose pitch moves (v2's blink, a water drip, a bubble). */
export const isChirp = (c) => c.lead.pitched && c.lead.chirp && c.lead.wave !== 'noise' && within(c.lead.dur, SHAPE.chirp.maxDur);

/**
 * A low part: a tone (or a narrow noise band) whose energy sits ≤ lowHz and whose pitch
 * does not bend up by more than lubDub.maxBend while it sounds (its `bend`, read from
 * where its energy is: an inaudible onset scoop moves nothing), or broadband noise whose
 * band ends ≤ lowNoiseHz.
 */
const isLow = (p) => (p.wave === 'noise' && !p.pitched ? within(p.band[1], SHAPE.lubDub.lowNoiseHz) : within(p.hz, SHAPE.lubDub.lowHz) && p.bend <= SHAPE.lubDub.maxBend + EPS_C);
/**
 * A part's level in the thumps' register (what can mask a thump): a tone, bell or narrow
 * noise band whose energy sits ≤ lowHz in full, whichever way it glides; broadband noise
 * by the share of its band below lowNoiseHz; a higher tone, and an opaque gesture (its
 * spectrum unknown: it masks nothing), not at all.
 */
const registerLevel = (p) => {
  if (p.opaque || !(p.eff > 0)) return 0;
  if (p.wave === 'noise' && !p.pitched) { const [lo, hi] = p.band; return hi > lo ? p.eff * Math.sqrt(clamp((SHAPE.lubDub.lowNoiseHz - lo) / (hi - lo), 0, 1)) : 0; }
  return within(p.hz, SHAPE.lubDub.lowHz) ? p.eff : 0;
};
/** The modelled (non-opaque, sounding) parts of a cluster. */
const modelled = (c) => c.parts.filter((p) => !p.opaque && p.eff > 0);
/** When a thump peaks: its low parts' attack, from the cluster's onset. */
const thumpPeak = (c) => { const low = modelled(c).filter(isLow); return low.length ? Math.min(...low.map((p) => p.t - c.t + p.attack)) : 0; };
/** A body thump: low, peaking within half the longest lub-dub, a body ≤ maxBody; or only the Mallow's short percussive gestures. */
export function isThump(c) {
  const L = SHAPE.lubDub, ms = modelled(c);
  if (!ms.length) return c.parts.every((p) => p.voice && ENGINE.thumps.includes(p.name));
  const low = ms.filter(isLow);
  if (!low.length) return false;
  const energy = (ps) => ps.reduce((s, p) => s + p.energy, 0);
  const body = Math.max(...ms.map((p) => p.t - c.t + p.body));
  return energy(low) >= L.lowShare * energy(ms) && within(thumpPeak(c), L.max * L.attackShare) && within(body, L.maxBody);
}

const durClose = (a, b) => within(Math.max(a, b), SHAPE.durRatio * Math.min(a, b));
/** Two notes are the same tone: pitch within SHAPE.drift (whatever the waveform), length within 2×. */
export const sameBeep = (a, b) => Math.abs(cents(a.lead.hz, b.lead.hz)) <= SHAPE.drift + EPS_C && durClose(a.lead.dur, b.lead.dur);
/** Two clusters are the same sound: the same instruments, each pitch within SHAPE.drift (noise bands within 15 %), lengths within 2×. */
export function sameSound(a, b) {
  if (a.parts.length !== b.parts.length || !durClose(a.dur, b.dur)) return false;
  return a.parts.every((p, i) => {
    const q = b.parts[i];
    if (p.key !== q.key) return false;
    if (p.pitched || p.src === 'engine') return Math.abs(cents(p.hz, q.hz)) <= SHAPE.drift + EPS_C;
    return Math.abs(Math.log(p.hz / q.hz)) <= Math.log1p(SHAPE.sameBand);
  });
}
/**
 * Two chirps of the same kind: bending the same way by a similar amount while they sound
 * (their `bend`, within pop.chirpGlide×: a glide that runs on after the sound has died
 * away changes nothing), lengths within 2×, whatever the waveform (a timbre swap is the
 * same drip again).
 */
const sameChirp = (a, b) => {
  const p = a.lead, q = b.lead, g = Math.abs(p.bend), h = Math.abs(q.bend);
  return Math.sign(p.bend) === Math.sign(q.bend) && within(Math.max(g, h), SHAPE.pop.chirpGlide * Math.min(g, h)) && durClose(p.dur, q.dur);
};

/**
 * The longest run of `same` sounds at a steady interval: starting from each pair
 * (i, j) at most maxGap apart, each next member is the one nearest the expected time
 * (within `spread` of the running mean interval) and the same as the previous member
 * (so a drift accumulates). → { n, gap } (n = 0 when no pair).
 */
export function longestTrain(list, same, maxGap, spread = SHAPE.train.spread) {
  let best = { n: 0, gap: 0 };
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const d0 = list[j].t - list[i].t;
    if (!within(d0, maxGap)) break;
    if (d0 <= 0 || !same(list[i], list[j])) continue;
    let n = 2, last = j, sum = d0;
    for (;;) {
      const mean = sum / (n - 1), want = list[last].t + mean;
      let k = -1;
      for (let m = last + 1; m < list.length && within(list[m].t, want + spread * mean); m++) {
        if (within(Math.abs(list[m].t - want), spread * mean) && same(list[last], list[m]) && (k < 0 || Math.abs(list[m].t - want) < Math.abs(list[k].t - want))) k = m;
      }
      if (k < 0) break;
      sum += list[k].t - list[last].t; last = k; n++;
    }
    if (n > best.n) best = { n, gap: sum / (n - 1) };
  }
  return best;
}

/**
 * A tone that can ring: a tone (not a bell or noise) that holds its pitch: ≥ steady.share
 * of its energy within ±SHAPE.drift of its pitch (`holds`), and bending by at most
 * ring.maxBend (a semitone) between the earlier and later half of its energy, vibrato
 * aside. A ring that drifts up to about 200 cents over a burst, or wobbles in a slow
 * vibrato, still rings: a beep's ±25 cents is the beep/chirp boundary, calibrated on v2's
 * chirps, not a ring's. v2's breaths (the engine's breathe-in and breathe-out tones, gliding
 * a fifth) bend 142–181 cents at every duration: a sigh, not a ring. Its body (above
 * −20 dB) is held ≥ ring.body.
 */
const ringTone = (p) => p.pitched && p.wave !== 'bell' && p.wave !== 'noise' && p.holds && Math.abs(p.bend) <= SHAPE.ring.maxBend + EPS_C && p.body >= SHAPE.ring.body - EPS_T;
/**
 * The level swing (dB) of two tones beating: (1 + r) / (1 − r), r the quieter's level
 * over the louder's. A swing of ring.beatDb (3 dB: the quieter at 17 % of the louder)
 * is a warble anyone hears; a phone line's two equal tones swing fully.
 */
export const beatDepth = (a, b) => { const r = Math.min(a, b) / Math.max(a, b); return r >= 1 ? Infinity : 20 * Math.log10((1 + r) / (1 - r)); };
/**
 * The interval two tones keep while they sound together over [t0, t1] (their pitch paths,
 * vibrato aside; weighted by the product of their levels, the strength of their beat):
 * → { cents: its median, bend: how far it moves from the earlier to the later half,
 *     beat: the beat rate (Hz) at the median }
 */
function pairInterval(p, q, t0, t1) {
  const n = gridOf(t1 - t0), cs = new Float64Array(n), ws = new Float64Array(n), fs = new Float64Array(n);
  let w = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + ((i + 0.5) / n) * (t1 - t0), fp = p.path(t - p.t), fq = q.path(t - q.t);
    cs[i] = Math.abs(cents(fp, fq)); fs[i] = Math.abs(fp - fq); ws[i] = p.level(t - p.t) * q.level(t - q.t); w += ws[i];
  }
  if (!(w > 0)) return { cents: 0, bend: 0, beat: 0 };
  let half = n, acc = 0;
  for (let i = 0; i < n && half === n; i++) if ((acc += ws[i]) >= w / 2) half = i + 1;
  const med = weightedMedian(cs, ws, 0, n);
  return { cents: med, bend: half < n ? weightedMedian(cs, ws, half, n) - weightedMedian(cs, ws, 0, half) : 0, beat: weightedMedian(fs, ws, 0, n) };
}
/**
 * Ring bursts, in time order. A burst is ring tones (above) that:
 *   - beat like a phone line: two tones SOUNDING TOGETHER for ≥ ring.body (their bodies
 *     overlap that long, wherever each starts: a tone that starts 40 ms late still beats
 *     for the rest of the ring) at an interval of 50–250 cents that HOLDS (it moves by at
 *     most half itself while they sound: the app's lens-focus pair, converging to unison,
 *     is a tuning, not a ring), beating at least as fast as a trill (≥ trill.rate: the
 *     phone lines beat at 25–50 Hz; two low tones beating at 7 Hz are a slow wobble), with
 *     a level swing of ≥ ring.beatDb ('dual', at the start of the overlap, its body the
 *     overlap);
 *   - warble like a bell: a vibrato ≥ trill.rate and ≥ trill.cents deep ('trill');
 *   - or are one plain tone (vibrato ≤ steady.vib) held ≥ ring.single that leads its
 *     sound (the single-frequency rings, 425 Hz in most of Europe), a ring only when it
 *     repeats ('tone').
 * → [{ kind, t, hz: [Hz…], body }]
 */
export function ringBursts(cs) {
  const R = SHAPE.ring, out = [];
  const tones = cs.flatMap((c) => c.parts.filter(ringTone));
  for (const p of tones) if (p.warble) out.push({ kind: 'trill', t: p.t, hz: [p.hz], body: p.body });
  for (let i = 0; i < tones.length; i++) for (let j = i + 1; j < tones.length; j++) {
    const [p, q] = [tones[i], tones[j]], t0 = Math.max(p.t, q.t), overlap = Math.min(p.t + p.body, q.t + q.body) - t0;
    if (overlap < R.body - EPS_T || beatDepth(p.eff, q.eff) < R.beatDb - EPS_C) continue;
    const iv = pairInterval(p, q, t0, t0 + overlap);
    if (iv.cents < R.dual[0] - EPS_C || iv.cents > R.dual[1] + EPS_C || iv.beat < SHAPE.trill.rate - EPS_C || Math.abs(iv.bend) > iv.cents / 2 + EPS_C) continue;
    out.push({ kind: 'dual', t: t0, hz: [Math.min(p.hz, q.hz), Math.max(p.hz, q.hz)], body: overlap });
  }
  for (const c of cs) if (ringTone(c.lead) && !c.lead.warble && c.lead.vib <= SHAPE.steady.vib + EPS_C && c.lead.body >= R.single - EPS_T) out.push({ kind: 'tone', t: c.t, hz: [c.lead.hz], body: c.lead.body });
  return out.sort((x, y) => x.t - y.t || x.kind.localeCompare(y.kind) || x.hz[0] - y.hz[0]);
}
const burstName = (b) => ({ trill: 'bell trill', dual: 'two-tone ring', tone: 'single-tone ring' })[b.kind];
const sameBurst = (a, b) => a.kind === b.kind && a.hz.every((f, i) => Math.abs(cents(f, b.hz[i])) <= SHAPE.drift + EPS_C);

// ------------------------------------------------------------- detectors --

function alarm(cs) {
  const T = SHAPE.train, M = SHAPE.mechanical, B = SHAPE.beepBeep;
  const signals = cs.filter(isSignal);
  if (longestTrain(signals, sameBeep, T.maxGap).n >= T.beeps) return 'a beep repeated at a steady interval';
  if (longestTrain(cs.filter(isNote), sameBeep, T.maxGap).n >= T.tones) return `a steady tone repeated ${T.tones} times at a steady interval`;
  for (let i = 0; i + 1 < signals.length; i++) {
    const [a, b] = [signals[i], signals[i + 1]], d = b.t - a.t;
    if (d >= B.min - EPS_T && within(d, B.max) && within(a.lead.dur, B.maxDur) && within(b.lead.dur, B.maxDur) && Math.abs(cents(a.lead.hz, b.lead.hz)) <= B.cents + EPS_C) return 'beep-beep';
  }
  if (cs.some((c) => isNote(c) && SHAPE.buzzer.waves.includes(c.lead.wave) && c.lead.dur >= SHAPE.buzzer.minDur)) return 'a buzzer';
  // a siren: one voice gliding up and down over the same range, each glide starting as the previous one ends
  const glides = cs.map((c) => c.lead).filter((p) => p.pitched && p.wave !== 'noise' && Math.abs(p.glide) >= SHAPE.siren.minCents && p.glideSec > 0);
  for (let i = 0, run = 1; i + 1 < glides.length; i++) {
    const a = glides[i], b = glides[i + 1];
    const lo = Math.max(Math.min(a.f0, a.f1), Math.min(b.f0, b.f1)), hi = Math.min(Math.max(a.f0, a.f1), Math.max(b.f0, b.f1));
    const shared = hi > lo ? cents(lo, hi) / Math.min(Math.abs(a.glide), Math.abs(b.glide)) : 0;
    const chained = a.key === b.key && Math.sign(a.glide) !== Math.sign(b.glide) && Math.abs(b.t - (a.t + a.glideSec)) <= SHAPE.siren.joinSec
      && Math.max(Math.abs(a.glide), Math.abs(b.glide)) <= SHAPE.siren.extentRatio * Math.min(Math.abs(a.glide), Math.abs(b.glide)) && shared >= SHAPE.siren.shared;
    run = chained ? run + 1 : 1;
    if (run >= SHAPE.siren.min) return 'a siren';
  }
  const mech = longestTrain(cs, sameSound, SHAPE.train.maxGap);
  if (mech.n >= M.slow || (mech.n >= M.fast && within(mech.gap, M.fastGap))) return 'a sound repeated like a machine';
  return null;
}

/** A melodic figure of `minLen`..maxLen notes, ≥ 2 of them different, played again straight away with the same rhythm (any transposition). */
function figure(notes, minLen) {
  const F = SHAPE.figure;
  for (let k = minLen; k <= F.maxLen; k++) {
    for (let i = 0; i + 2 * k <= notes.length; i++) {
      const w = notes.slice(i, i + 2 * k), hz = w.map((c) => c.lead.hz);
      const fig = hz.slice(0, k);
      if (Math.abs(cents(Math.min(...fig), Math.max(...fig))) <= F.cents) continue;          // one pitch only: the alarm's case
      const shift = cents(hz[0], hz[k]);
      if (!fig.every((f, j) => Math.abs(cents(f, hz[j + k]) - shift) <= F.cents)) continue;
      const iv = w.slice(1).map((c, j) => c.t - w[j].t);
      if (!within(Math.max(...iv), F.maxGap)) continue;
      const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
      if (iv.slice(0, iv.length - k).every((x, j) => Math.abs(x - iv[j + k]) <= F.spread * mean)) return k;
    }
  }
  return 0;
}

function ringtone(cs) {
  const R = SHAPE.ring, bursts = ringBursts(cs);
  for (const b of bursts) if (b.kind !== 'tone' && b.body >= R.held - EPS_T) return `a ${burstName(b)} held ${b.body.toFixed(2)} s`;
  // a cadence: the same burst rung again, once the first has ended, within ring.maxGap
  for (let i = 0; i < bursts.length; i++) for (let j = i + 1; j < bursts.length; j++) {
    const d = bursts[j].t - bursts[i].t;
    if (!within(d, R.maxGap)) break;
    if (d >= bursts[i].body - EPS_T && sameBurst(bursts[i], bursts[j])) return `a ${burstName(bursts[i])} cadence (bursts ${d.toFixed(2)} s apart)`;
  }
  const k = figure(cs.filter(isSignal), SHAPE.figure.minLen);
  if (k) return `a ${k}-note figure played again`;
  const kk = figure(cs.filter(isNote), SHAPE.figure.chimeLen);
  if (kk) return `a ${kk}-note figure of ringing notes played again`;
  return null;
}

/** The level of a thump's low parts (their power summed). */
const lowLevel = (c) => Math.sqrt(modelled(c).filter(isLow).reduce((s, p) => s + p.eff * p.eff, 0)) || c.lead.eff;
/** A cluster's level in the thumps' register (its parts' registerLevel, their power summed). */
const clusterRegister = (c) => Math.sqrt(c.parts.reduce((s, p) => s + registerLevel(p) ** 2, 0));
/**
 * A thump is a beat only in the foreground: not in the wake of a sound that started up to
 * lubDub.maskSec before it and is ≥ maskRatio× as loud IN THE THUMP'S REGISTER (forward
 * masking stays in its band: v2's landing splat masks its own wobbling tail, but a 2 kHz
 * tick masks no 60 Hz thump, however loud). A louder thump masks too.
 */
const masked = (cs, i) => {
  const L = SHAPE.lubDub, c = cs[i], lv = lowLevel(c);
  for (let j = i - 1; j >= 0 && c.t - cs[j].t <= L.maskSec + EPS_T; j--) if (clusterRegister(cs[j]) >= L.maskRatio * lv) return true;
  return false;
};
/**
 * The beats: the unmasked thumps, those starting within lubDub.maskSec of a beat's first
 * thump heard as that one beat (a flam, or a grace thump before the beat, is one beat),
 * each beat at its loudest thump.
 */
function beats(cs) {
  const L = SHAPE.lubDub, out = [];
  for (const [i, c] of cs.entries()) {
    if (!isThump(c) || masked(cs, i)) continue;
    const g = out[out.length - 1];
    if (g && c.t - g.first.t <= L.maskSec + EPS_T) { if (lowLevel(c) > lowLevel(g.beat)) g.beat = c; } else out.push({ first: c, beat: c });
  }
  return out.map((g) => g.beat);
}

function heartbeat(cs) {
  const L = SHAPE.lubDub, th = beats(cs);
  for (let i = 0; i + 1 < th.length; i++) {
    const d = th[i + 1].t - th[i].t;
    if (d < L.min - EPS_T || !within(d, L.max)) continue;
    if (!within(thumpPeak(th[i]), L.attackShare * d) || !within(thumpPeak(th[i + 1]), L.attackShare * d)) continue;   // the beats merge into one swell
    const before = i > 0 ? th[i].t - th[i - 1].t : Infinity, after = i + 2 < th.length ? th[i + 2].t - th[i + 1].t : Infinity;
    if (before >= L.pause * d - EPS_T && after >= L.pause * d - EPS_T) return 'a lub-dub';
  }
  return null;
}

/** The loudest pair of long-ringing notes (chimes) a whole tone or more apart within pop.max: the quieter note's level (calibration). */
export function chimePairLevel(cs) {
  const P = SHAPE.pop, ch = cs.filter(isChime);
  let best = 0;
  for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) {
    const d = ch[j].t - ch[i].t;
    if (!within(d, P.max)) break;
    if (d >= P.min - EPS_T && Math.abs(cents(ch[i].lead.hz, ch[j].lead.hz)) >= P.minCents - EPS_C) best = Math.max(best, Math.min(ch[i].lead.eff, ch[j].lead.eff));
  }
  return best;
}

function messengerPop(cs) {
  const P = SHAPE.pop, above = (c) => c.lead.hz > SHAPE.lubDub.lowHz;             // lower two-tones are thumps: the heartbeat's
  const apart = (a, b) => Math.abs(cents(a.lead.hz, b.lead.hz)) >= P.minCents - EPS_C;
  // the notes of a two-tone: beeps, pips (a pitch, if not a beep's length) and long-ringing notes louder than v2's celesta pairs
  const isPopNote = (c) => isSignal(c) || isPip(c) || (isChime(c) && c.lead.eff > LOUD.chimePair);
  const kind = (c) => (isSignal(c) ? 'beep' : isPip(c) ? 'pip' : 'chime');
  const notes = cs.filter((c) => above(c) && isPopNote(c));
  for (let i = 0; i < notes.length; i++) for (let j = i + 1; j < notes.length; j++) {
    const d = notes[j].t - notes[i].t;
    if (!within(d, P.max)) break;
    if (d < P.min - EPS_T || !apart(notes[i], notes[j])) continue;
    const k = [kind(notes[i]), kind(notes[j])];
    return k.includes('chime') ? 'a two-tone of chimes louder than any approved pair' : k.includes('pip') ? 'a two-tone of pips' : 'a two-tone';
  }
  // brief sounds pair only when close (≤ pop.chirpMax): two chirps of the same kind, or a chirp and a note (a slide into a two-tone)
  const brief = cs.filter((c) => above(c) && (isChirp(c) || isPopNote(c)));
  for (let i = 0; i < brief.length; i++) for (let j = i + 1; j < brief.length; j++) {
    const [a, b] = [brief[i], brief[j]], d = b.t - a.t;
    if (!within(d, P.chirpMax)) break;
    if (d < P.min - EPS_T || !apart(a, b)) continue;
    const ca = isChirp(a), cb = isChirp(b);
    if (ca && cb && sameChirp(a, b)) return 'a two-tone of chirps';
    if (ca !== cb) return 'a two-tone: a chirp and a note';
  }
  return null;
}

/**
 * The level's fastest rises: the summed effective RMS envelope of every modelled part
 * (studio synth and engine fx) on a 0.25 ms grid (identical simultaneous parts add
 * coherently: one noise buffer, one oscillator phase; others in power), and its largest
 * rise within SHAPE.rise.window (a hit) and within SHAPE.rise.riser (a stinger's quick
 * swell); the same 50 ms rise for its noise alone and for its bright broadband noise;
 * the engine's voices starting within the window, summed (A × trim), all of them and the
 * opaque Mallow gestures alone. → { rise, riser, noise, bright, engine, voice }
 */
export function riseMetrics(parts) {
  const R = SHAPE.rise, live = parts.filter((p) => !p.opaque && p.eff > 0 && p.level);
  const out = { rise: 0, riser: 0, noise: 0, bright: 0, engine: 0, voice: 0 };
  // engine voices stacked: one entry per event (its head part carries A × trim)
  const stack = (list) => {
    let best = 0;
    for (let i = 0; i < list.length; i++) { let s = 0; for (let j = i; j < list.length && list[j].t - list[i].t <= R.window; j++) s += list[j].engine; best = Math.max(best, s); }
    return best;
  };
  const heads = parts.filter((p) => p.src === 'engine' && p.head).sort((a, b) => a.t - b.t);
  out.engine = stack(heads);
  out.voice = stack(heads.filter((p) => p.opaque));
  if (!live.length) return out;
  const t0 = Math.min(...live.map((p) => p.t)) - R.window, t1 = Math.max(...live.map((p) => p.t + p.dur)) + 0.01;
  const n = Math.ceil((t1 - t0) / R.grid) + 1;
  const envelope = (ps) => {
    const groups = new Map();
    for (const p of ps) { const k = `${p.key}|${p.f0}|${p.f1}|${p.attack}|${p.dur}|${p.t.toFixed(6)}`; (groups.get(k) || groups.set(k, []).get(k)).push(p); }
    const pow = new Float64Array(n);
    for (const g of groups.values()) {
      const p = g[0], i0 = Math.max(0, Math.floor((p.t - t0) / R.grid)), i1 = Math.min(n - 1, Math.ceil((p.t + p.dur - t0) / R.grid));
      for (let i = i0; i <= i1; i++) { const x = t0 + i * R.grid - p.t; if (x < 0) continue; const v = p.level(x) * g.length; pow[i] += v * v; }
    }
    return pow.map(Math.sqrt);
  };
  const maxRise = (e, win = R.window) => {
    const w = Math.round(win / R.grid), q = [];             // q: indices of a rising-min deque over the last w samples
    let best = 0;
    for (let i = 0; i < e.length; i++) {
      while (q.length && e[q[q.length - 1]] >= e[i]) q.pop();
      q.push(i);
      while (q[0] < i - w) q.shift();
      best = Math.max(best, e[i] - e[q[0]]);
    }
    return best;
  };
  const all = envelope(live);
  out.rise = maxRise(all);
  out.riser = maxRise(all, R.riser);
  const noisy = live.filter((p) => p.wave === 'noise');
  out.noise = noisy.length ? maxRise(envelope(noisy)) : 0;
  const bright = noisy.filter((p) => p.bright);
  out.bright = bright.length ? maxRise(envelope(bright)) : 0;
  return out;
}

/**
 * Shape detectors over a set of events → [{ category, why }].
 * options.texture: events that count only for the level (see sounds()).
 */
export function shapeFindings(events, options = {}) {
  const parts = sounds(events, options), cs = clusters(parts.filter((p) => !p.texture)), out = [];
  const add = (category, why) => { if (why) out.push({ category, why }); };
  add('alarm', alarm(cs));
  add('ringtone', ringtone(cs));
  add('heartbeat', heartbeat(cs));
  add('messenger-pop', messengerPop(cs));
  const r = riseMetrics(parts);
  add('jump-scare', r.rise > LOUD.rise ? `the level rises by ${r.rise.toFixed(4)} RMS within 50 ms (limit ${LOUD.rise})`
    : r.riser > LOUD.riser ? `the level rises by ${r.riser.toFixed(4)} RMS within 250 ms (limit ${LOUD.riser})`
      : r.noise > LOUD.noise ? `noise rises by ${r.noise.toFixed(4)} RMS within 50 ms (limit ${LOUD.noise})`
        : r.bright > LOUD.bright ? `bright noise rises by ${r.bright.toFixed(4)} RMS within 50 ms (limit ${LOUD.bright})`
          : r.engine >= LOUD.engine ? `engine voices stacked to ${r.engine.toFixed(2)} of full force (limit ${LOUD.engine})`
            : r.voice > LOUD.voice ? `the Mallow's voice stacked to ${r.voice.toFixed(2)} of full force (limit ${LOUD.voice})` : null);
  return out;
}

/** Shape detectors over a set of events → [category]. */
export const shapes = (events, options) => shapeFindings(events, options).map((f) => f.category);
