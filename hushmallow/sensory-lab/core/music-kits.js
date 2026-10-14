// Music kits — each Mallow's instrument in Hushbeat Symphony: its note, the
// sustained voice a bent note turns into, its warm bass, its hum (a pad) and
// its shimmer.
//
// The timbres follow the production kits in src/engine/audio.js (whose KITS
// aren't exported, so they are mirrored here, as VOICES is), with one rule
// added: every scoop, chirp and drop lands on the target pitch, because here
// the pitch is the music. Every bass carries a harmonic layer in 150–500 Hz so
// it is still heard on a phone speaker. Levels use the engine's units:
// MUSIC[id].peak × velocity for a note, LAYER_PEAK for the layers, so the
// engine's summed-peak limiter stays true.
//
// Kits draw through graph(ac, out, track): the same code renders into a live
// SoundEngine voice or into an OfflineAudioContext for the listening checks.
// Envelopes start and end at zero (no clicks); held layers change only with
// setTargetAtTime from a held value. No Web Audio is touched at import time.
//
// KITS[id] = {
//   id, send, peak,
//   note(g, t, f, vel, { dur, glideFrom, glide, stutter }) → end    a struck note (pluck, decay τ = MUSIC.decay)
//   shimmer(g, t, f, vel, { dur, glide }) → end                     the hum's shimmer note
//   held(g, t, f, vel) → { set(f, t, glide), duck(t), release(t, tau, stopAt) → end }   a bent note
//   bass(g, t, f, amount) → { set(f, amount, t, glide), beat(t, accent), release(t, fade, { step }) → end }
//   pad(g, t, fs, level, bright) → { set(fs, bright, t, glide), shimmer(t), breathe(level, t), release(t, fade) → end }
// }

import { noiseBuffer } from './ambience.js';
import { MUSIC, LAYER_PEAK } from './music-theory.js';
import { clamp, lerp } from './math.js';
import { COPY } from '../features/hushbeat/copy.js';

/** Two words for each Mallow's instrument (the friend picker); the strings live in the linted COPY table. */
export const SOUND_WORDS = COPY.soundWords;

const NOISE_S = 2;                                   // seconds of looping noise per colour
const WARM = new WeakMap();                          // context → Set of noise colours already built
const clampF = (f) => clamp(+f || 20, 20, 20000);
const st = (s) => 2 ** (s / 12);

// ----------------------------------------------------------------- tiers --
// Bell partials · pad oscillators · Glitzi's bit-crush · the crackle and noise beds
export const TIERS = Object.freeze({
  high: Object.freeze({ partials: 4, padOsc: 6, crush: true, beds: true }),
  medium: Object.freeze({ partials: 3, padOsc: 4, crush: true, beds: true }),
  low: Object.freeze({ partials: 2, padOsc: 3, crush: false, beds: false }),
});
let tier = TIERS.high;
/** Quality tier for the voices built from now on: 'high' | 'medium' | 'low'. */
export function setTier(q) { tier = TIERS[q] || TIERS.high; return tier; }
export const currentTier = () => tier;

/** Build the noise buffers kits use (O(n): from a timeout or a frame, never inside a gesture). */
export function warmNoise(ac, colors = ['white', 'brown', 'pink']) {
  if (!ac) return;
  let s = WARM.get(ac);
  if (!s) WARM.set(ac, (s = new Set()));
  for (const c of colors) if (!s.has(c)) { noiseBuffer(ac, NOISE_S, c); s.add(c); }
}
export const noiseReady = (ac, color = 'white') => !!WARM.get(ac)?.has(color);

// 5-level staircase: Glitzi's chirp (built once, on first use)
let CRUSH = null;
const crushCurve = () => CRUSH || (CRUSH = Float32Array.from({ length: 1024 }, (_, i) => Math.round((i / 1023 * 2 - 1) * 2.5) / 2.5));

// Freeze a param at its current value at t, so a new target starts from where it is (no jump).
export function hold(p, t) {
  if (p.cancelAndHoldAtTime) { try { p.cancelAndHoldAtTime(t); return; } catch { /* older engines */ } }
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
}

// ----------------------------------------------------------------- graph --
/**
 * A small node factory over one context. out: where the voice ends (a SoundEngine voice's out, or a
 * destination). track(node, isSource) lets the owner keep every node for cleanup. g.srcs lists the
 * sources; g.end and g.last are the latest stop time and the source that stops then.
 */
export function graph(ac, out, track = () => {}) {
  const g = {
    ac, out, srcs: [], end: 0, last: null,
    _src(n, t, stop, offset) {
      if (offset !== undefined) n.start(t, offset); else n.start(t);
      if (stop != null) g._stopAt(n, stop);
      g.srcs.push(n);
      track(n, true);
      return n;
    },
    _stopAt(n, t) {
      try { n.stop(t); } catch { /* already stopped */ }
      if (t >= g.end) { g.end = t; g.last = n; }
    },
    /** Stop every source at t (held layers). */
    stopAll(t) { for (const n of g.srcs) g._stopAt(n, t); return t; },
    osc(type, f, t, stop = null) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(clampF(f), t);
      return g._src(o, t, stop);
    },
    gain(v = 0) { const n = ac.createGain(); n.gain.value = v; track(n, false); return n; },
    filter(type, f, q = 0.707) {
      const n = ac.createBiquadFilter();
      n.type = type; n.frequency.value = clampF(f); n.Q.value = q;
      track(n, false);
      return n;
    },
    /** Looping noise, or null while its buffer isn't built yet (the sound simply goes without). */
    noise(t, stop = null, color = 'white') {
      if (!noiseReady(ac, color)) return null;
      const s = ac.createBufferSource();
      s.buffer = noiseBuffer(ac, NOISE_S, color); s.loop = true;
      return g._src(s, t, stop, Math.random() * (NOISE_S - 0.2));
    },
    shaper(curve) { const n = ac.createWaveShaper(); n.curve = curve; track(n, false); return n; },
    /** A sine LFO into params through a depth gain (returned, so its depth can move). */
    lfo(t, rate, depth, stop, ...params) {
      const o = g.osc('sine', rate, t, stop), d = g.gain(depth);
      o.connect(d);
      for (const p of params) d.connect(p);
      return d;
    },
  };
  return g;
}

// ------------------------------------------------------------- envelopes --
// A pluck: linear attack, exponential decay with time constant tau, then the last 15 ms to zero.
// A short voice (dur) decays faster so it is at least 40 dB down before it ends. → end time
function pluck(p, t, { a = 0.005, tau, dur, peak }) {
  const r = Math.max(0.03, Math.min(dur - a - 0.02, 6.9 * tau));
  const k = Math.max(r / Math.max(1e-3, tau), 4.6);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.exponentialRampToValueAtTime(Math.max(1e-6, peak * Math.exp(-k)), t + a + r);
  p.linearRampToValueAtTime(0, t + a + r + 0.015);
  return t + a + r + 0.02;
}

const peakOf = (id, vel) => MUSIC[id].peak * clamp(+vel || 0, 0, 1);

/**
 * One oscillator: an optional scoop from f0 that lands on f after `glide`, delayed vibrato (cents),
 * the bit-crush, a lowpass and a pluck. → end
 */
function tone(g, t, { type = 'sine', f, f0 = 0, glide = 0.03, a = 0.005, tau, dur, peak, lp = 0, lpQ = 0.7, vib = null, crush = false, detune = 0, dest = g.out }) {
  const r = Math.max(0.03, Math.min(dur - a - 0.02, 6.9 * tau)), end = t + a + r + 0.02;
  const o = g.osc(type, f0 || f, t, end + 0.01);
  if (f0) o.frequency.exponentialRampToValueAtTime(clampF(f), t + glide);
  if (detune) o.detune.value = detune;
  if (vib) {
    const d = g.lfo(t, vib.rate, 0, end + 0.01, o.detune);
    d.gain.setValueAtTime(0, t + (vib.delay || 0));
    d.gain.linearRampToValueAtTime(vib.cents, t + (vib.delay || 0) + 0.08);
  }
  let n = o;
  if (crush && tier.crush) { const s = g.shaper(crushCurve()); n.connect(s); n = s; }
  if (lp) { const fl = g.filter('lowpass', lp, lpQ); n.connect(fl); n = fl; }
  const amp = g.gain(0);
  n.connect(amp); amp.connect(dest);
  pluck(amp.gain, t, { a, tau, dur, peak });
  return end;
}

// Additive bells [ratio, amp, decay ratio]: sine partials, each with its own pluck (tier caps the count)
const PARTIALS = Object.freeze({
  spark: [[1, 1, 1], [2, 0.32, 0.55], [3.01, 0.16, 0.4], [4.07, 0.06, 0.25]],
  musicbox: [[1, 1, 1], [2, 0.2, 0.5], [3, 0.09, 0.3], [5.04, 0.035, 0.18]],
  celesta: [[1, 1, 1], [2, 0.3, 0.55], [4, 0.08, 0.3]],
  lowbell: [[1, 1, 1], [2.76, 0.28, 0.55], [5.4, 0.07, 0.3]],
});

function bell(g, t, { f, partials, tau, dur, peak, a = 0.003, lp = 5000, dest = g.out }) {
  let bus = dest;
  if (lp) { bus = g.filter('lowpass', lp, 0.5); bus.connect(dest); }
  const list = partials.slice(0, tier.partials);
  const norm = 1 / list.reduce((s, p) => s + p[1], 0);   // the summed partials never exceed the peak
  let end = t;
  for (const [ratio, amp, dec] of list) {
    if (f * ratio > 7500) continue;
    end = Math.max(end, tone(g, t, { f: f * ratio, a, tau: tau * dec, dur, peak: peak * amp * norm, dest: bus }));
  }
  return end;
}

// ---------------------------------------------------------- held (bends) --
// The sustained voice a bent note becomes: the kit's tone without its pluck.
// oscs: [type, ratio, amp, detuneCents?]
function heldVoice(g, t, f, peak, { oscs, lp = 2400, wob = null, crush = false }) {
  const amp = g.gain(0), fl = g.filter('lowpass', lp, 0.6);
  let input = fl;
  if (crush && tier.crush) { const s = g.shaper(crushCurve()); s.connect(fl); input = s; }
  fl.connect(amp); amp.connect(g.out);
  const norm = 1 / oscs.reduce((s, o) => s + o[2], 0);
  const list = oscs.map(([type, ratio, k, det = 0]) => {
    const o = g.osc(type, f * ratio, t), og = g.gain(k * norm);
    if (det) o.detune.value = det;
    o.connect(og); og.connect(input);
    return { o, ratio };
  });
  if (wob) g.lfo(t, wob.rate, wob.cents, null, ...list.map((x) => x.o.detune));
  amp.gain.setValueAtTime(0, t);
  amp.gain.setTargetAtTime(peak, t, 0.012);
  return {
    set(f1, tt, glide = 0.03) {
      for (const { o, ratio } of list) { hold(o.frequency, tt); o.frequency.setTargetAtTime(clampF(f1 * ratio), tt, Math.max(0.004, glide / 3)); }
    },
    /** −9 dB in 60 ms, then let go over half a second. */
    duck(tt) {
      hold(amp.gain, tt);
      amp.gain.setTargetAtTime(peak * 0.35, tt, 0.02);
      amp.gain.setTargetAtTime(0, tt + 0.06, 0.12);
      return g.stopAll(tt + 0.7);
    },
    release(tt, tau, stopAt) {
      hold(amp.gain, tt);
      amp.gain.setTargetAtTime(0, tt, Math.max(0.005, tau));
      return g.stopAll(Math.max(tt + 0.05, stopAt));
    },
  };
}

// ------------------------------------------------------------------ bass --
// The fundamental (the kit's own colour) through a lowpass that opens with the amount, plus a harmonic
// layer (2nd, 3rd and 4th) through its own gentle lowpass, so ≥ 15 % of the energy sits in 150–500 Hz
// for every root in [65, 131) Hz. Level = LAYER_PEAK.bass × (0.35 + 0.65 · amount).
const HARM = [[2, 0.5], [3, 0.5], [4, 0.3]];

function bassVoice(g, t, f0, amount, K) {
  const [lo, hi] = K.lp || [220, 1200];
  const lpFor = (a) => lo * (hi / lo) ** clamp(a, 0, 1);
  const levelFor = (a) => LAYER_PEAK.bass * (0.35 + 0.65 * clamp(a, 0, 1));
  const harm = K.harm || HARM;
  const norm = 1 / (K.main.reduce((s, m) => s + m[2], 0) + harm.reduce((s, h) => s + h[1], 0));
  const out = g.gain(0), throb = g.gain(1), lp = g.filter('lowpass', lpFor(amount), K.q || 0.7), hlp = g.filter('lowpass', 620, 0.5);
  lp.connect(throb); hlp.connect(throb); throb.connect(out); out.connect(g.out);
  const oscs = [];
  const add = (type, ratio, k, det, to) => {
    const o = g.osc(type, f0 * ratio * (K.scoop || 1), t), og = g.gain(k * norm);
    if (K.scoop) o.frequency.exponentialRampToValueAtTime(clampF(f0 * ratio), t + 0.06);   // "bwomp": lands on the root
    if (det) o.detune.value = det;
    o.connect(og); og.connect(to);
    oscs.push({ o, ratio });
  };
  for (const [type, ratio, k, det = 0] of K.main) add(type, ratio, k, det, lp);
  for (const [ratio, k] of harm) add('sine', ratio, k, 0, hlp);
  const dets = oscs.map((x) => x.o.detune);
  if (K.wob) g.lfo(t, K.wob.rate, K.wob.cents, null, ...dets);                 // Blubi's bubbles, Noomi's hum
  const wobble = K.release === 'wobble' ? g.lfo(t, 7, 0, null, ...dets) : null;  // Boppo: wobbles as it lets go
  // a faint crackle (Pipzi): noise gated by two square LFOs
  if (K.crackle && tier.beds) {
    const n = g.noise(t, null, 'white');
    if (n) {
      const bp = g.filter('bandpass', 2600, 1.4), cg = g.gain(0), gate = g.gain(0.03);
      n.connect(bp); bp.connect(cg); cg.connect(gate); gate.connect(out);
      for (const [rate, type] of [[11, 'square'], [17.3, 'square']]) { const l = g.osc(type, rate, t); const lg = g.gain(0.5); l.connect(lg); lg.connect(cg.gain); }
    }
  }
  let f = f0, level = levelFor(amount);
  out.gain.setValueAtTime(0, t);
  out.gain.setTargetAtTime(level, t, 0.014);                                     // 40 ms attack
  if (K.swell) out.gain.setTargetAtTime(level * (1 + K.swell), t + 0.06, 0.25);  // Loomi swells on
  return {
    get f() { return f; },
    set(f1, a, tt, glide = 0.06) {
      if (f1) {
        f = f1;
        for (const { o, ratio } of oscs) { hold(o.frequency, tt); o.frequency.setTargetAtTime(clampF(f1 * ratio), tt, Math.max(0.005, glide / 3)); }
      }
      if (a != null) {
        level = levelFor(a);
        hold(out.gain, tt); out.gain.setTargetAtTime(level * (1 + (K.swell || 0)), tt, Math.max(0.01, glide / 2));
        hold(lp.frequency, tt); lp.frequency.setTargetAtTime(lpFor(a), tt, 0.04);
      }
    },
    /** A soft throb on the beat. */
    beat(tt, accent = 0.6) {
      hold(throb.gain, tt);
      throb.gain.setTargetAtTime(1 + 0.22 * clamp(accent, 0, 1), tt, 0.012);
      throb.gain.setTargetAtTime(1, tt + 0.05, 0.1);
    },
    /** Let go in the Mallow's way; quiet after 0.3 s (the engine's BASS_TAIL) unless a fade is given. */
    release(tt, fade = null, { step = 0.5 } = {}) {
      let tau = fade != null ? Math.max(0.005, fade / 3) : 0.07;
      if (fade == null && K.release === 'wobble' && wobble) wobble.gain.setTargetAtTime(38, tt, 0.06);
      if (fade == null && K.release === 'step') {   // Glitzi steps down (a 5th where the key allows, else an octave)
        for (const { o, ratio } of oscs) { hold(o.frequency, tt + 0.06); o.frequency.setValueAtTime(clampF(f * ratio * step), tt + 0.06); }
      }
      if (fade == null && K.release === 'yawn') {   // Noomi glides down like a yawn
        tau = 0.09;
        for (const { o, ratio } of oscs) { hold(o.frequency, tt); o.frequency.setTargetAtTime(clampF(f * ratio * 0.5), tt, 0.3); }
      }
      hold(out.gain, tt);
      out.gain.setTargetAtTime(0, tt, tau);
      return g.stopAll(tt + Math.max(0.12, 7 * tau) + 0.05);
    },
  };
}

// ------------------------------------------------------------------- pad --
// Three voices (a detuned pair each on the high tier) into a lowpass that breathes with the breath
// clock (lo → hi on the in-breath) and opens with the finger's height; 0.8 s attack; 2.2 s release,
// quiet after the first second (the engine's PAD_TAIL). Level = LAYER_PEAK.pad × level.
function padVoice(g, t, fs, level, bright, K) {
  const [lo, hi] = K.lp || [600, 1400];
  const amp = g.gain(0), lp = g.filter('lowpass', lo, K.q || 0.5);
  lp.connect(amp); amp.connect(g.out);
  // oscillators per voice: 2, 2, 2 (high) · 2, 1, 1 (medium) · 1, 1, 1 (low); the top voice is the last
  const per = tier.padOsc >= 6 ? [2, 2, 2] : tier.padOsc >= 4 ? [1, 1, 2] : [1, 1, 1];
  const n = per.reduce((s, x) => s + x, 0), norm = 1 / n;   // the summed voices never exceed the level
  const voices = fs.slice(0, 3).map((f, i) => {
    const list = [];
    for (let j = 0; j < per[i]; j++) {
      const o = g.osc(K.type || 'sine', f, t), og = g.gain(norm * (K.voiceK?.[i] ?? 1));
      o.detune.value = per[i] > 1 ? (j ? K.detune : -K.detune) : 0;
      o.connect(og); og.connect(lp);
      list.push(o);
    }
    return list;
  });
  if (K.warble) g.lfo(t, K.warble.rate, K.warble.cents, null, ...voices.flat().map((o) => o.detune));   // Zuzu
  // breathy air / a rain bed / an airy hum, following the pad's level and the breath
  let air = null;
  if (K.air && tier.beds) {
    const s = g.noise(t, null, K.air.color);
    if (s) {
      const f = g.filter(K.air.type || 'bandpass', K.air.f[0], K.air.q || 0.7), ag = g.gain(K.air.k);
      s.connect(f); f.connect(ag); ag.connect(amp);
      air = f;
    }
  }
  let oct = null, octG = null, top = Math.max(...fs);
  const t0 = t;
  let cut = 0;
  const target = LAYER_PEAK.pad * clamp(+level || 0, 0, 1);
  amp.gain.setValueAtTime(0, t);
  amp.gain.setTargetAtTime(target, t, 0.27);   // ≈ 0.8 s to full
  const h = {
    bright: clamp(+bright || 0, 0, 1),
    set(f1s, b, tt, glide = 0.4) {
      if (f1s) {
        f1s.slice(0, 3).forEach((f, i) => { for (const o of voices[i] || []) { hold(o.frequency, tt); o.frequency.setTargetAtTime(clampF(f), tt, Math.max(0.01, glide / 3)); } });
        top = Math.max(...f1s);
        if (oct) { hold(oct.frequency, tt); oct.frequency.setTargetAtTime(clampF(top * 2), tt, Math.max(0.01, glide / 3)); }
      }
      if (b != null) h.bright = clamp(+b || 0, 0, 1);
    },
    /** Boppo's shimmer: an octave above the top joins inside the pad. */
    shimmer(tt) {
      if (!K.octave || oct) return;
      oct = g.osc(K.type || 'triangle', top * 2, tt);
      octG = g.gain(0);
      oct.connect(octG); octG.connect(lp);
      octG.gain.setValueAtTime(0, tt);
      octG.gain.setTargetAtTime(0.35 * norm, tt, 0.4);
    },
    /** The breath (0..1) and the finger's height open the filter; an airy hum thins over 8 s. */
    breathe(lvl, tt) {
      const thin = K.thin ? 1 - 0.4 * clamp((tt - t0) / 8, 0, 1) : 1;
      const f = clamp(lerp(lo, hi, clamp(lvl, 0, 1)) * 2 ** ((h.bright - 0.5) * 0.8) * thin, 200, 6000);
      if (Math.abs(f - cut) / (cut || 1) < 0.02) return;
      cut = f;
      lp.frequency.setTargetAtTime(f, tt, 0.25);
      if (air) air.frequency.setTargetAtTime(lerp(K.air.f[0], K.air.f[1], clamp(lvl, 0, 1)), tt, 0.3);
    },
    release(tt, fade = null) {
      const tau = fade != null ? Math.max(0.01, fade / 3) : 0.3;
      hold(amp.gain, tt);
      amp.gain.setTargetAtTime(0, tt, tau);
      return g.stopAll(tt + 7.2 * tau + 0.05);
    },
  };
  h.breathe(0.5, t);
  return h;
}

// --------------------------------------------------------------- the kits --
const D = (id) => MUSIC[id].decay;

function kit(id, def) {
  const k = { id, send: MUSIC[id].send, peak: MUSIC[id].peak, ...def };
  k.held = (g, t, f, vel) => heldVoice(g, t, f, peakOf(id, vel) * 0.6, def.heldDef);
  k.bass = (g, t, f, amount) => bassVoice(g, t, f, amount, def.bassDef);
  k.pad = (g, t, fs, level, bright) => padVoice(g, t, fs, level, bright, def.padDef);
  return Object.freeze(k);
}

export const KITS = Object.freeze({
  // Sunshine: a springy triangle that scoops up onto its note · a round "bwomp" bass that wobbles as it
  // lets go · a warm detuned-triangle hum · its shimmer is an octave inside the hum
  boppo: kit('boppo', {
    note(g, t, f, vel, o = {}) {
      return tone(g, t, { type: 'triangle', f, f0: o.glideFrom || f * 0.8, glide: o.glideFrom ? o.glide || 0.035 : 0.035, a: 0.004, tau: D('boppo'), dur: o.dur ?? 0.7, peak: peakOf('boppo', vel), lp: 2600 });
    },
    shimmer(g, t, f, vel, o = {}) { return this.note(g, t, f, vel * 0.7, o); },
    heldDef: { oscs: [['triangle', 1, 1], ['sine', 0.5, 0.3]], lp: 2400 },
    bassDef: { main: [['triangle', 1, 0.7], ['sine', 1, 0.6]], scoop: 0.85, release: 'wobble' },
    padDef: { type: 'triangle', detune: 7, lp: [600, 1400], octave: true },
  }),

  // Spark: a spark bell · a sine bass with an octave triangle and a faint crackle · a high, clear hum ·
  // whisper sparks
  pipzi: kit('pipzi', {
    note(g, t, f, vel, o = {}) { return bell(g, t, { f, partials: PARTIALS.spark, tau: D('pipzi'), dur: o.dur ?? 1.2, peak: peakOf('pipzi', vel), lp: 5200 }); },
    shimmer(g, t, f, vel, o = {}) {
      const end = bell(g, t, { f, partials: PARTIALS.celesta, tau: 0.22, dur: Math.min(o.dur ?? 0.8, 0.8), peak: peakOf('pipzi', vel) * 0.55, lp: 6000 });
      const n = tier.beds ? g.noise(t, t + 0.08, 'white') : null;
      if (n) { const f1 = g.filter('bandpass', 5200, 2), a = g.gain(0); n.connect(f1); f1.connect(a); a.connect(g.out); pluck(a.gain, t, { a: 0.002, tau: 0.012, dur: 0.07, peak: peakOf('pipzi', vel) * 0.12 }); }
      return end;
    },
    heldDef: { oscs: [['sine', 1, 1], ['triangle', 2, 0.25]], lp: 4200 },
    bassDef: { main: [['sine', 1, 1], ['triangle', 2, 0.2]], crackle: true },
    padDef: { type: 'sine', detune: 5, lp: [900, 2400], voiceK: [0.8, 0.9, 1] },
  }),

  // Softie: a droplet that falls onto its note · a bubbly wobbling bass · a sine hum over soft rain ·
  // droplets
  blubi: kit('blubi', {
    note(g, t, f, vel, o = {}) {
      return tone(g, t, { type: 'sine', f, f0: o.glideFrom || f / 0.94, glide: o.glideFrom ? o.glide || 0.045 : 0.045, a: 0.003, tau: D('blubi'), dur: o.dur ?? 0.6, peak: peakOf('blubi', vel), lp: 2600 });
    },
    shimmer(g, t, f, vel, o = {}) {
      return tone(g, t, { type: 'sine', f, f0: f / 0.94, glide: 0.04, a: 0.003, tau: 0.1, dur: Math.min(o.dur ?? 0.5, 0.5), peak: peakOf('blubi', vel) * 0.7, lp: 3000 });
    },
    heldDef: { oscs: [['sine', 1, 1]], lp: 1800, wob: { rate: 5, cents: 12 } },
    bassDef: { main: [['sine', 1, 1]], wob: { rate: 5, cents: 18 } },
    padDef: { type: 'sine', detune: 6, lp: [600, 1400], air: { color: 'brown', type: 'lowpass', f: [500, 900], q: 0.5, k: 0.35 } },
  }),

  // Chaos: a bit-crushed chirp that lands on its note (a stutter on accents) · a square bass through a
  // low filter that steps down as it lets go · a detuned square hum · a rare bit twinkle
  glitzi: kit('glitzi', {
    note(g, t, f, vel, o = {}) {
      const pk = peakOf('glitzi', vel), dur = o.dur ?? 0.4;
      let end = tone(g, t, { type: 'triangle', f, f0: o.glideFrom || f / 1.07, glide: o.glideFrom ? o.glide || 0.022 : 0.022, a: 0.004, tau: D('glitzi'), dur, peak: pk, lp: 2500, crush: true });
      if (o.stutter) for (let i = 1; i <= 2; i++) end = Math.max(end, tone(g, t + 0.035 * i, { type: 'triangle', f, a: 0.003, tau: 0.03, dur: 0.07, peak: pk * (1 - 0.28 * i), lp: 2500, crush: true }));
      return end;
    },
    shimmer(g, t, f, vel) {
      const pk = peakOf('glitzi', vel) * 0.6;
      tone(g, t, { type: 'triangle', f, a: 0.002, tau: 0.03, dur: 0.08, peak: pk, lp: 3400, crush: true });
      return tone(g, t + 0.06, { type: 'triangle', f, a: 0.002, tau: 0.04, dur: 0.12, peak: pk * 0.7, lp: 3400, crush: true });
    },
    heldDef: { oscs: [['triangle', 1, 1]], lp: 2000, crush: true },
    bassDef: { main: [['square', 1, 0.55]], lp: [300, 900], q: 0.9, harm: [[2, 0.3], [3, 0.45], [4, 0.3]], release: 'step' },
    padDef: { type: 'square', detune: 9, lp: [500, 1000], q: 0.9, voiceK: [0.6, 0.7, 0.8] },
  }),

  // Spiral: a triangle with delayed vibrato (portamento between phrase notes) · a sine pair swirling
  // ±8 cents · a warbling hum · a glissando whoosh that lands on its note
  zuzu: kit('zuzu', {
    note(g, t, f, vel, o = {}) {
      return tone(g, t, { type: 'triangle', f, f0: o.glideFrom || 0, glide: o.glide || 0.06, a: 0.014, tau: D('zuzu'), dur: o.dur ?? 0.9, peak: peakOf('zuzu', vel), lp: 2000, vib: { rate: 6.2, cents: 40, delay: 0.03 } });
    },
    shimmer(g, t, f, vel, o = {}) {
      const gl = o.glide || 0.3, pk = peakOf('zuzu', vel) * 0.8, dur = Math.max(gl + 0.3, Math.min(o.dur ?? 1, 1.2));
      const end = tone(g, t, { type: 'sine', f, f0: f * st(-5), glide: gl, a: gl * 0.6, tau: 0.25, dur, peak: pk, vib: { rate: 5.5, cents: 25, delay: gl } });
      const n = tier.beds ? g.noise(t, t + gl + 0.25, 'pink') : null;
      if (n) {
        const bp = g.filter('bandpass', 900, 2.2), a = g.gain(0);
        bp.frequency.setValueAtTime(900, t);
        bp.frequency.exponentialRampToValueAtTime(2400, t + gl);
        n.connect(bp); bp.connect(a); a.connect(g.out);
        a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk * 0.12, t + gl * 0.7); a.gain.linearRampToValueAtTime(0, t + gl + 0.2);
      }
      return end;
    },
    heldDef: { oscs: [['triangle', 1, 1]], lp: 2000, wob: { rate: 6.2, cents: 30 } },
    bassDef: { main: [['sine', 1, 0.5, -8], ['sine', 1, 0.5, 8]] },
    padDef: { type: 'triangle', detune: 4, lp: [600, 1400], warble: { rate: 5, cents: 20 } },
  }),

  // Chill one: a soft sine with an octave triangle, long tail · a deep swelling sine bass with its 2nd
  // harmonic · a wide hum with breathy air · a low bell
  loomi: kit('loomi', {
    note(g, t, f, vel, o = {}) {
      const pk = peakOf('loomi', vel), dur = o.dur ?? 2;
      const gl = o.glideFrom ? { f0: o.glideFrom, glide: o.glide || 0.12 } : {};
      tone(g, t, { type: 'triangle', f: f * 2, f0: o.glideFrom ? o.glideFrom * 2 : 0, glide: gl.glide, a: 0.04, tau: D('loomi') * 0.6, dur, peak: pk * 0.2, lp: 900 });
      return tone(g, t, { type: 'sine', f, ...gl, a: 0.03, tau: D('loomi'), dur, peak: pk * 0.8 });
    },
    shimmer(g, t, f, vel, o = {}) { return bell(g, t, { f, partials: PARTIALS.lowbell, tau: 0.9, dur: Math.min(o.dur ?? 2.5, 2.5), peak: peakOf('loomi', vel) * 0.8, lp: 2400 }); },
    heldDef: { oscs: [['sine', 1, 1], ['triangle', 2, 0.25]], lp: 1600 },
    bassDef: { main: [['sine', 1, 1]], swell: 0.25 },
    padDef: { type: 'sine', detune: 9, lp: [600, 1400], air: { color: 'pink', type: 'bandpass', f: [480, 850], q: 0.6, k: 0.5 } },
  }),

  // Dreamer: a music box · a humming sine bass with 4.5 Hz vibrato that yawns down as it lets go ·
  // an airy hum that thins · a celesta note
  noomi: kit('noomi', {
    note(g, t, f, vel, o = {}) { return bell(g, t, { f, partials: PARTIALS.musicbox, tau: D('noomi'), dur: o.dur ?? 2.5, peak: peakOf('noomi', vel), lp: 4200 }); },
    shimmer(g, t, f, vel, o = {}) { return bell(g, t, { f, partials: PARTIALS.celesta, tau: 0.7, dur: Math.min(o.dur ?? 2, 2), peak: peakOf('noomi', vel) * 0.8, lp: 4800 }); },
    heldDef: { oscs: [['sine', 1, 1], ['sine', 2, 0.15]], lp: 2600, wob: { rate: 4.5, cents: 10 } },
    bassDef: { main: [['sine', 1, 1]], wob: { rate: 4.5, cents: 15 }, release: 'yawn' },
    padDef: { type: 'sine', detune: 5, lp: [600, 1400], air: { color: 'white', type: 'bandpass', f: [900, 1300], q: 0.6, k: 0.2 }, thin: true },
  }),
});
