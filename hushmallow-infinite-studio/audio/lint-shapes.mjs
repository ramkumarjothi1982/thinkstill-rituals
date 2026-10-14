// The banned-recipe lint's shape detectors (WP-04): what a ringtone, an alarm, a
// heartbeat, a messenger pop and a jump scare ARE, read from the events a recipe
// (or a whole score's recipes) plays, whatever the recipe calls itself.
//
// Every event becomes a sound object (sounds()): when it starts, how long it
// rings, how fast it rises, where its energy sits in pitch (the energy-weighted
// pitch of its glide under its envelope), whether its pitch holds still, what band
// a noise covers, and its effective RMS level over time (envelope × waveform; for
// noise the engine's white noise through the band). Events starting within 30 ms
// are one sound (a cluster), led by its loudest part.
//
// The detectors (shapes()) and why each is shaped the way it is:
//
//   alarm       an alarm is a SIGNAL TONE repeated: a beep (a steady-pitched tone,
//               30 ms to 0.5 s if struck, up to 2 s if held) three or more times at a
//               steady interval of up to 4 s, its pitch allowed to drift by less than
//               a whole tone per repeat (a beep that creeps up 60 cents each time is
//               still the same beep); two identical short beeps 60 ms–0.6 s apart with
//               no note between ("beep-beep"); a held square or sawtooth tone (a
//               buzzer); a siren (one voice gliding up, down, up over the same range). Any other sound becomes alarm-like only when
//               repeated like a machine: four times at ≤ 0.6 s or five at ≤ 4 s, at a
//               steady interval. Three of the same approved sound (a triple blink,
//               three glances, three ripples) is a gag, not an alarm: v2's blink is a
//               chirp (its pitch falls 3 semitones), not a beep, and so are the others.
//   ringtone    a melodic figure of 2–12 signal notes, ≥ 2 of them different, played
//               again straight away with the same rhythm (at any transposition).
//               Long-ringing struck tones (≥ 0.5 s: v2's celesta) are chimes, not
//               ringtone notes.
//   heartbeat   a lub-dub: two body thumps 0.15–0.45 s apart (the heart's S1–S2
//               interval), the pair standing out from what is around it (no thump just
//               before or after it at the same spacing: evenly spaced thumps are a
//               bounce or a beat, not a heart). A body thump is short (≤ 0.35 s),
//               percussive (attack ≤ 50 ms) and low: ≥ 70 % of its power in tones whose
//               energy sits ≤ 250 Hz or noise whose band ends ≤ 500 Hz (the heart's own
//               sounds lie below ~200 Hz; v2's landing, a flump under a rising water
//               bloop, a squelch and a hiss, has 40 % there), whatever the interval
//               between lub and dub; or the Mallow's own short percussive gestures
//               (tap, press, hop) with nothing else in the cluster.
//   messenger   two signal notes 30–300 ms apart, at least a whole tone apart in
//   pop         either direction (a two-tone, or a step of a tri-tone).
//   jump scare  the score's level rising faster than anything approved: the largest
//               rise of the summed effective RMS envelope within any 50 ms (the startle
//               reflex integrates over tens of milliseconds, so attack time is not a
//               threshold: an 11 ms or a 200 ms attack to −1 dBFS both rise far over
//               the limit), the same for the bright broadband noise in it (the classic
//               startle stimulus), and the engine's voices starting within 50 ms summed.
//               The limits are v2's own maxima + 3 dB (LOUD; calibrateLoud() recomputes
//               them from the approved recipes and the approved v2 score).
//
// Every limit is in SHAPE; tests/unit/audio-lint.test.mjs walks both sides of
// each, and holds every approved v2 recipe, alone and repeated three times at 0.5,
// 0.9 and 1.4 s, clean.

export const NYQ = 24000;
const WHITE_RMS = 1 / Math.sqrt(3);               // the engine's white noise: uniform ±1
const WAVE_RMS = { sine: Math.SQRT1_2, triangle: WHITE_RMS, sawtooth: WHITE_RMS, square: 1 };
const CELESTA = [[1, 1, 1], [2, 0.3, 0.55], [4, 0.08, 0.3]];   // the renderer's bell partials [ratio, level, decay factor]
export const cents = (a, b) => 1200 * Math.log2(b / a);
// limits are inclusive; comparisons allow for floating point (1 + 0.3 − 1 > 0.3)
const EPS_T = 1e-9, EPS_C = 1e-6;
const within = (x, lim) => x <= lim + EPS_T;

export const SHAPE = Object.freeze({
  clusterSec: 0.03,
  steadyCents: 100,
  note: { minDur: 0.03, maxStruck: 0.5, maxHeld: 2 },
  drift: 150,
  sameBand: 0.15,
  durRatio: 2,
  train: { beeps: 3, spread: 0.25, maxGap: 4 },
  mechanical: { fast: 4, fastGap: 0.6, slow: 5 },
  beepBeep: { min: 0.06, max: 0.6, maxDur: 0.25, cents: 50 },
  buzzer: { minDur: 0.3, waves: ['square', 'sawtooth'] },
  siren: { min: 3, minCents: 300, joinSec: 0.1, extentRatio: 2, shared: 0.5 },
  figure: { minLen: 2, maxLen: 12, spread: 0.25, maxGap: 0.6, cents: 50 },
  lubDub: { min: 0.15, max: 0.45, pause: 1.3, lowHz: 250, lowNoiseHz: 500, lowShare: 0.7, maxAttack: 0.05, maxDur: 0.35 },
  pop: { min: 0.03, max: 0.3, minCents: 200 },
  bright: { topHz: 6000, minBand: 3000 },
  rise: { window: 0.05, riser: 0.25, grid: 0.00025 },
});

/**
 * Jump-scare limits: v2's maxima + 3 dB (calibrateLoud, recomputed by the tests).
 * Over every approved v2 recipe and the approved v2 score, the largest rise of the
 * effective RMS envelope within 50 ms and within 250 ms is the landing's splat
 * (0.0546 both: v2 has no slower loud swell), the bright broadband noise's within
 * 50 ms the landing's splash hiss (0.0110), and the engine's voices starting within
 * 50 ms a thought's bubble (A × trim = 0.8; the limit is the engine at 90 % of its
 * full amplitude).
 */
export const LOUD = Object.freeze({ rise: 0.0773, riser: 0.0773, bright: 0.0155, engine: 0.9 });

/**
 * The engine's sounds as the lint can know them without a kit (the voices are
 * kit-specific): `eff` is a representative effective RMS per unit A × trim (the kit
 * voices' note peaks are 0.12–0.24 × A, the fx 0.03–0.14 × A, through the engine's
 * 0.6 master: ~0.1 × sine RMS), used only to rank an engine voice against the
 * studio's synth in a cluster; `thumps` are the Mallow gestures that are short and
 * percussive in every kit (hushmallow/src/engine/audio.js GESTURES: tap is one note,
 * press a 0.18 s glide, hop a 0.12 s glide and a note).
 */
export const ENGINE = Object.freeze({ eff: 0.07, thumps: Object.freeze(['tap', 'press', 'hop']) });

// ----------------------------------------------------------- sound model --

/** The band [lo, hi] (Hz) a noise filter passes (its noise bandwidth; the wider end of a sweep). */
export function noiseBand(filter = 'lowpass', f = 1000, f1 = f, q = 0.8) {
  if (filter === 'highpass') return [Math.min(f, f1), NYQ];
  if (filter === 'bandpass') { const c = Math.max(f, f1), bw = (Math.PI / 2) * c / q; return [Math.max(0, c - bw / 2), Math.min(NYQ, c + bw / 2)]; }
  return [0, Math.min(NYQ, Math.max(f, f1))];      // lowpass (the default)
}
/** Effective RMS of the engine's white noise at envelope level `peak` through a band. */
export const noiseEff = (peak, [lo, hi]) => peak * WHITE_RMS * Math.sqrt(Math.max(0, hi - lo) / NYQ);
const isBright = ([lo, hi]) => hi >= SHAPE.bright.topHz && hi - lo >= SHAPE.bright.minBand;

/** The renderer's percussive envelope (render-offline envAD): linear attack, hold, −60 dB exponential decay. */
const envAD = (a, h, d) => (x) => (x < 0 ? 0 : x < a ? x / a : x < a + h ? 1 : x < a + h + d ? Math.pow(10, (-3 * (x - a - h)) / d) : 0);
/** The renderer's breath swell (render-offline air): raised cosine up over a, down over r. */
const swell = (a, r) => (x) => (x < 0 || x > a + r ? 0 : x < a ? (1 - Math.cos((Math.PI * x) / a)) / 2 : (1 + Math.cos((Math.PI * (x - a)) / r)) / 2);

/**
 * Where a tone's energy sits: the energy-weighted mean pitch of its pitch path under
 * its envelope (64 steps). path(x) → Hz, level(x) → amplitude.
 */
function energyPitch(path, level, dur) {
  let w = 0, s = 0;
  for (let i = 0; i < 64; i++) {
    const x = ((i + 0.5) / 64) * dur, e = level(x) ** 2;
    w += e; s += e * Math.log(path(x));
  }
  return w > 0 ? Math.exp(s / w) : path(0);
}

/**
 * One event → a sound part: { t, src, inst, key, wave, dur, attack, hold, pitched,
 * steady, hz (energy pitch, or the band centre of noise), f0, f1, glide (cents),
 * glideSec, band, bright, eff (peak effective RMS), level(x) (effective RMS at x s
 * after onset), low, engine (A × trim), name, voice, opts }
 */
function synthPart(e) {
  const base = { t: e.t, src: 'synth', inst: e.inst, glide: 0, glideSec: 0, hold: 0 };
  if (e.inst === 'blip') {
    const a = e.a || 0.002, h = e.h || 0, d = e.d || 0.08, f1 = e.f1 || e.f, g = e.f1 ? e.glide || 0.05 : 0;
    const wave = e.type || 'sine', env = envAD(a, h, d), dur = a + h + d, eff = e.peak * WAVE_RMS[wave];
    const path = (x) => (g > 0 && x < g ? e.f * Math.pow(f1 / e.f, x / g) : f1);
    const vib = e.vib ? e.vib.cents : 0;
    const glide = cents(e.f, f1);
    return { ...base, key: `blip:${wave}`, wave, dur, attack: a, hold: h, pitched: true, steady: Math.abs(glide) <= SHAPE.steadyCents + EPS_C && vib <= SHAPE.steadyCents + EPS_C,
      hz: energyPitch(path, env, dur), f0: e.f, f1, glide, glideSec: g, eff, level: (x) => eff * env(x) };
  }
  if (e.inst === 'ping') {
    const env = envAD(0.002, 0, e.decay), dur = 0.002 + e.decay, eff = e.peak * Math.SQRT1_2, f1 = e.f * (e.rise ?? 1);
    const glide = cents(e.f, f1);
    return { ...base, key: 'ping:sine', wave: 'sine', dur, attack: 0.002, pitched: true, steady: Math.abs(glide) <= SHAPE.steadyCents + EPS_C,
      hz: energyPitch((x) => e.f + (f1 - e.f) * Math.min(1, x / e.decay), env, dur), f0: e.f, f1, glide, glideSec: e.decay, eff, level: (x) => eff * env(x) };
  }
  if (e.inst === 'bell') {
    const partials = CELESTA.filter(([r]) => e.f * r <= 7500).map(([, amp, dec]) => ({ amp, env: envAD(0.003, 0, e.decay * dec) }));
    const level = (x) => e.peak * Math.SQRT1_2 * Math.sqrt(partials.reduce((s, p) => s + (p.amp * p.env(x)) ** 2, 0));
    return { ...base, key: `bell:${e.partials || 'celesta'}`, wave: 'bell', dur: e.decay, attack: 0.003, pitched: true, steady: true,
      hz: e.f, f0: e.f, f1: e.f, eff: level(0.003), level };
  }
  if (e.inst === 'noiseHit') {
    const a = e.a ?? 0.003, d = e.d || 0.08, f1 = e.f1 || e.f, env = envAD(a, 0, d);
    const band = noiseBand(e.filter, e.f, f1, e.q || 0.8), eff = noiseEff(e.peak, band);
    const narrow = e.filter === 'bandpass' && (e.q || 0.8) >= 4;        // a narrow band is heard as a pitch
    const glide = cents(e.f, f1), g = e.f1 ? e.sweep || 0.08 : 0;
    const centre = e.filter === 'highpass' ? Math.sqrt(band[0] * band[1]) : (band[0] + band[1]) / 2;
    return { ...base, key: `noise:${e.filter || 'lowpass'}`, wave: 'noise', dur: a + d, attack: a, pitched: narrow, steady: narrow && Math.abs(glide) <= SHAPE.steadyCents + EPS_C,
      hz: narrow ? energyPitch((x) => (g > 0 && x < g ? e.f * Math.pow(f1 / e.f, x / g) : f1), env, a + d) : centre,
      f0: e.f, f1, glide, glideSec: g, band, bright: isBright(band), eff, level: (x) => eff * env(x) };
  }
  if (e.inst === 'air') {
    // band-passed noise swept f0 → f1, then the renderer's 3 kHz low-pass
    const b = noiseBand('bandpass', e.f0, e.f1, e.q || 0.8), band = [b[0], Math.min(b[1], 3000)];
    const env = swell(e.a, e.r), eff = noiseEff(e.peak, band);
    return { ...base, key: 'noise:air', wave: 'noise', dur: e.a + e.r, attack: e.a, pitched: false, steady: false,
      hz: (band[0] + band[1]) / 2, f0: e.f0, f1: e.f1, glide: cents(e.f0, e.f1), glideSec: e.a + e.r, band, bright: isBright(band), eff, level: (x) => eff * env(x) };
  }
  return null;
}

function enginePart(e) {
  const A = 0.45 + 0.55 * (e.opts?.intensity ?? 0.6), level = A * (e.trim ?? 1);
  const p = (e.opts?.pitch ?? 1) * Math.pow(2, (e.opts?.note ?? 0) / 12);
  return { t: e.t, src: 'engine', inst: e.kind, key: `${e.kind}:${e.name}`, name: e.name, voice: e.kind === 'mallow', dur: e.opts?.duration ?? 0.3, attack: 0.005, hold: 0,
    pitched: false, steady: false, hz: 440 * p, f0: 440 * p, f1: 440 * p, glide: 0, glideSec: 0, engine: level, eff: level * ENGINE.eff, cut: e.cut };
}

/** The sound parts of a probe (or of a whole score's recipe events), in time order. */
export function sounds({ engine = [], synth = [] }) {
  const out = [...synth.map(synthPart).filter(Boolean), ...engine.map(enginePart)];
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

/** A note: the cluster's lead is a studio tone (or a narrow noise band) whose pitch holds still. */
export const isNote = (c) => c.lead.src === 'synth' && c.lead.pitched && c.lead.steady;
/** A signal note (a beep): a note 30 ms–0.5 s long if struck, up to 2 s if held; a longer-ringing struck note is a chime. */
export const isSignal = (c) => isNote(c) && c.lead.dur >= SHAPE.note.minDur - EPS_T && within(c.lead.dur, c.lead.hold > 0 ? SHAPE.note.maxHeld : SHAPE.note.maxStruck);

/** A low part: a tone whose energy sits ≤ 250 Hz, or noise whose band ends ≤ 500 Hz. */
const isLow = (p) => (p.wave === 'noise' && !p.pitched ? within(p.band[1], SHAPE.lubDub.lowNoiseHz) : within(p.hz, SHAPE.lubDub.lowHz));
/** A body thump: short, percussive and low; or only the Mallow's short percussive gestures. */
export function isThump(c) {
  const L = SHAPE.lubDub;
  const synth = c.parts.filter((p) => p.src === 'synth' && p.eff > 0);
  if (!synth.length) return c.parts.every((p) => p.voice && ENGINE.thumps.includes(p.name));
  const low = synth.filter(isLow);
  if (!low.length) return false;
  const power = (ps) => ps.reduce((s, p) => s + p.eff * p.eff, 0);
  const dur = Math.max(...synth.map((p) => p.t - c.t + p.dur));
  return power(low) >= L.lowShare * power(synth) && within(Math.min(...low.map((p) => p.attack)), L.maxAttack) && within(dur, L.maxDur);
}

const durClose = (a, b) => within(Math.max(a, b), SHAPE.durRatio * Math.min(a, b));
/** Two signal notes are the same beep: pitch within SHAPE.drift (whatever the waveform), length within 2×. */
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

// ------------------------------------------------------------- detectors --

function alarm(cs) {
  const T = SHAPE.train, M = SHAPE.mechanical, B = SHAPE.beepBeep;
  const signals = cs.filter(isSignal);
  if (longestTrain(signals, sameBeep, T.maxGap).n >= T.beeps) return 'a beep repeated at a steady interval';
  for (let i = 0; i + 1 < signals.length; i++) {
    const [a, b] = [signals[i], signals[i + 1]], d = b.t - a.t;
    if (d >= B.min - EPS_T && within(d, B.max) && within(a.lead.dur, B.maxDur) && within(b.lead.dur, B.maxDur) && Math.abs(cents(a.lead.hz, b.lead.hz)) <= B.cents + EPS_C) return 'beep-beep';
  }
  if (cs.some((c) => isNote(c) && SHAPE.buzzer.waves.includes(c.lead.wave) && c.lead.dur >= SHAPE.buzzer.minDur)) return 'a buzzer';
  // a siren: one voice gliding up and down over the same range, each glide starting as the previous one ends
  const glides = cs.map((c) => c.lead).filter((p) => p.src === 'synth' && p.pitched && Math.abs(p.glide) >= SHAPE.siren.minCents && p.glideSec > 0);
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

function ringtone(cs) {
  const F = SHAPE.figure, notes = cs.filter(isSignal);
  for (let k = F.minLen; k <= F.maxLen; k++) {
    for (let i = 0; i + 2 * k <= notes.length; i++) {
      const w = notes.slice(i, i + 2 * k), hz = w.map((c) => c.lead.hz);
      const fig = hz.slice(0, k);
      if (Math.abs(cents(Math.min(...fig), Math.max(...fig))) <= F.cents) continue;          // one pitch only: the alarm's case
      const shift = cents(hz[0], hz[k]);
      if (!fig.every((f, j) => Math.abs(cents(f, hz[j + k]) - shift) <= F.cents)) continue;
      const iv = w.slice(1).map((c, j) => c.t - w[j].t);
      if (!within(Math.max(...iv), F.maxGap)) continue;
      const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
      if (iv.slice(0, iv.length - k).every((x, j) => Math.abs(x - iv[j + k]) <= F.spread * mean)) return `a ${k}-note figure played again`;
    }
  }
  return null;
}

function heartbeat(cs) {
  const L = SHAPE.lubDub, th = cs.filter(isThump);
  for (let i = 0; i + 1 < th.length; i++) {
    const d = th[i + 1].t - th[i].t;
    if (d < L.min - EPS_T || !within(d, L.max)) continue;
    const before = i > 0 ? th[i].t - th[i - 1].t : Infinity, after = i + 2 < th.length ? th[i + 2].t - th[i + 1].t : Infinity;
    if (before >= L.pause * d - EPS_T && after >= L.pause * d - EPS_T) return 'a lub-dub';
  }
  return null;
}

function messengerPop(cs) {
  const P = SHAPE.pop, notes = cs.filter(isSignal);
  for (let i = 0; i < notes.length; i++) for (let j = i + 1; j < notes.length; j++) {
    const d = notes[j].t - notes[i].t;
    if (!within(d, P.max)) break;
    if (d >= P.min - EPS_T && Math.abs(cents(notes[i].lead.hz, notes[j].lead.hz)) >= P.minCents - EPS_C) return 'a two-tone';
  }
  return null;
}

/**
 * The level's fastest rises: the summed effective RMS envelope of every studio part on
 * a 0.25 ms grid (identical simultaneous parts add coherently: one noise buffer, one
 * oscillator phase; others in power), and its largest rise within SHAPE.rise.window
 * (a hit) and within SHAPE.rise.riser (a stinger's quick swell); the same 50 ms rise
 * for the bright broadband noise alone; the engine's voices starting within the
 * window, summed (A × trim). → { rise, riser, bright, engine }
 */
export function riseMetrics(parts) {
  const R = SHAPE.rise, synth = parts.filter((p) => p.src === 'synth' && p.eff > 0);
  const out = { rise: 0, riser: 0, bright: 0, engine: 0 };
  const eng = parts.filter((p) => p.src === 'engine');
  for (let i = 0; i < eng.length; i++) {
    let s = 0;
    for (let j = i; j < eng.length && eng[j].t - eng[i].t <= R.window; j++) s += eng[j].engine;
    out.engine = Math.max(out.engine, s);
  }
  if (!synth.length) return out;
  const t0 = Math.min(...synth.map((p) => p.t)) - R.window, t1 = Math.max(...synth.map((p) => p.t + p.dur)) + 0.01;
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
  const all = envelope(synth);
  out.rise = maxRise(all);
  out.riser = maxRise(all, R.riser);
  const bright = synth.filter((p) => p.bright);
  out.bright = bright.length ? maxRise(envelope(bright)) : 0;
  return out;
}

/** Shape detectors over a set of events → [{ category, why }]. */
export function shapeFindings(events) {
  const parts = sounds(events), cs = clusters(parts), out = [];
  const add = (category, why) => { if (why) out.push({ category, why }); };
  add('alarm', alarm(cs));
  add('ringtone', ringtone(cs));
  add('heartbeat', heartbeat(cs));
  add('messenger-pop', messengerPop(cs));
  const r = riseMetrics(parts);
  add('jump-scare', r.rise > LOUD.rise ? `the level rises by ${r.rise.toFixed(4)} RMS within 50 ms (limit ${LOUD.rise})`
    : r.riser > LOUD.riser ? `the level rises by ${r.riser.toFixed(4)} RMS within 250 ms (limit ${LOUD.riser})`
      : r.bright > LOUD.bright ? `bright noise rises by ${r.bright.toFixed(4)} RMS within 50 ms (limit ${LOUD.bright})`
      : r.engine >= LOUD.engine ? `engine voices stacked to ${r.engine.toFixed(2)} of full force (limit ${LOUD.engine})` : null);
  return out;
}

/** Shape detectors over a set of events → [category]. */
export const shapes = (events) => shapeFindings(events).map((f) => f.category);
