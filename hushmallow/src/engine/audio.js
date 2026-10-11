// Hushmallow sound engine — everything is synthesised live with the Web Audio
// API. There are no audio files.
//
// Design rules (people may be upset when they use this app):
//  • gentle only: soft attacks (>= 3 ms, most much longer), no loud or sharp
//    transients, nothing bright. A master high-shelf cut, a lowpass, a soft
//    compressor and a limiter sit on everything.
//  • no clicks: every gain starts at 0 and ends at 0 through ramps. Sustained
//    sounds fade with setTargetAtTime from whatever value they are at.
//  • no leaks: every sound is a short-lived Voice that owns its nodes and
//    disconnects them when its last source ends. Voices are capped (oldest is
//    faded out), identical sounds are rate-limited.
//  • no surprises: importing this module does nothing. No AudioContext exists
//    until unlock() is called from a user gesture, and nothing plays before it.
//
// Public API: see `audio` at the bottom of the file.

const PREF_KEY = 'hm2:sound';
const DEFAULT_VOLUME = 0.6;
const MAX_VOICES = 28;          // concurrent one-shot voices (oldest is stolen)
const MAX_HOLDS = 4;            // concurrent press-and-hold sounds
const HOLD_MAX_S = 90;          // a hold that is never stopped fades itself out
const RATE_PER_SEC = 12;        // identical sound, per rolling second
const MIN_GAP_MS = 45;          // identical sound, minimum spacing
const GLOBAL_PER_SEC = 40;      // everything, per rolling second
const AMB_LEVEL = 0.36;         // ambience bus level relative to the voices
const AMB_XFADE_S = 2.6;        // ambience crossfade time

export const MALLOW_SOUNDS = ['tap', 'press', 'squeeze', 'release', 'surprise', 'offended', 'celebrate',
  'comfort', 'sigh', 'yawn', 'hop', 'success', 'splash', 'idle'];
export const UI_SOUNDS = ['tap', 'open', 'close', 'toggle', 'whoosh', 'select', 'error-soft'];
export const FX_SOUNDS = ['charge', 'ground', 'crackle', 'sort', 'snap', 'drop-in', 'clear', 'portal', 'separate',
  'rotate-tick', 'lens-focus', 'chime', 'star', 'bloom', 'breathe-in', 'breathe-out'];
export const HOLD_SOUNDS = ['charge', 'ground', 'drain', 'hum'];
export const REALMS = ['static-storm', 'raindrop-lagoon', 'spiral-observatory', 'sunpop-orchard',
  'spark-festival', 'blue-drift', 'moonmilk-cove'];
export const MALLOW_IDS = ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'];

// ---------------------------------------------------------------------------
// small helpers

const st = (semis) => Math.pow(2, semis / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const num = (x, d) => (Number.isFinite(+x) ? +x : d);
const clampF = (f) => clamp(f, 20, 12000);

const COS_UP = Float32Array.from({ length: 32 }, (_, i) => (1 - Math.cos(Math.PI * i / 31)) / 2);
const COS_DOWN = Float32Array.from(COS_UP, (x) => 1 - x);
const scaled = (curve, k) => Float32Array.from(curve, (x) => x * k);

const CRUSH_CURVES = new Map();
function crushCurve(levels) {
  if (!CRUSH_CURVES.has(levels)) {
    const n = 2048;
    CRUSH_CURVES.set(levels, Float32Array.from({ length: n }, (_, i) => {
      const x = (i / (n - 1)) * 2 - 1;
      return Math.round(x * levels) / levels;
    }));
  }
  return CRUSH_CURVES.get(levels);
}

// Hold the current value of a param so a new ramp can start from it.
function holdAt(p, t) {
  if (typeof p.cancelAndHoldAtTime === 'function') {
    try { p.cancelAndHoldAtTime(t); return; } catch { /* fall through */ }
  }
  const v = p.value;
  p.cancelScheduledValues(t);
  p.setValueAtTime(v, t);
}

/**
 * Amplitude envelope. Starts at 0, ends at 0 — never clicks.
 * shape 'pluck': linear attack, exponential (-60 dB over r) release.
 * shape 'swell': raised-cosine attack and release (breaths, pads).
 * Returns the time at which the param is back at 0.
 */
function env(p, t, { a = 0.005, h = 0, r = 0.2, peak = 0.2, shape = 'pluck' } = {}) {
  peak = Math.max(peak, 1e-4);
  a = Math.max(a, 0.003);
  r = Math.max(r, 0.02);
  if (shape === 'swell') {
    p.setValueCurveAtTime(scaled(COS_UP, peak), t, a);
    const rs = t + a + Math.max(h, 0) + 0.002;
    p.setValueCurveAtTime(scaled(COS_DOWN, peak), rs, r);
    return rs + r + 0.005;
  }
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  if (h > 0) p.setValueAtTime(peak, t + a + h);
  const te = t + a + h + r;
  p.exponentialRampToValueAtTime(peak * 0.001, te);
  p.linearRampToValueAtTime(0, te + 0.012);
  return te + 0.015;
}

// ---------------------------------------------------------------------------
// preferences (lazy — nothing touches storage at import time)

let prefs = null;
function loadPrefs() {
  if (prefs) return prefs;
  prefs = { enabled: true, volume: DEFAULT_VOLUME };
  try {
    const raw = globalThis.localStorage?.getItem(PREF_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p?.enabled === 'boolean') prefs.enabled = p.enabled;
      if (Number.isFinite(p?.volume)) prefs.volume = clamp(p.volume, 0, 1);
    }
  } catch { /* storage blocked: keep defaults */ }
  return prefs;
}
function savePrefs() {
  try { globalThis.localStorage?.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// graph: master chain, buses, shared noise + reverb buffers

let LIVE = null;   // the real-time graph (after unlock)
let G = null;      // graph being built into (LIVE, or an offline graph during _renderOffline)

function makeNoise(ctx, color, secs) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * secs);
  const N = Math.floor(sr * 0.08); // loop crossfade so the loop point is seamless
  const raw = new Float32Array(len + N);
  let b = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'brown') { b = (b + 0.02 * w) / 1.02; raw[i] = b; } else raw[i] = w;
  }
  let peak = 0;
  for (let i = 0; i < raw.length; i++) peak = Math.max(peak, Math.abs(raw[i]));
  const k = 0.8 / (peak || 1);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    if (i < N) { const w = i / N; d[i] = (raw[i] * w + raw[len + i] * (1 - w)) * k; } else d[i] = raw[i] * k;
  }
  return buf;
}

function makeImpulse(ctx, secs = 1.5) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * secs);
  const pre = Math.floor(sr * 0.012);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let y = 0;
    for (let i = pre; i < len; i++) {
      const tt = (i - pre) / sr;
      const k = 0.55 - 0.42 * Math.min(1, tt / secs); // darker as it decays
      y += ((Math.random() * 2 - 1) - y) * k;
      const fadeIn = Math.min(1, (i - pre) / (sr * 0.006));
      d[i] = y * Math.exp(-6.9 * tt / secs) * fadeIn;
    }
  }
  return buf;
}

function buildGraph(ctx, live) {
  const g = { ctx, live, voices: new Set(), holds: new Set(), layers: new Set() };
  const master = ctx.createGain(); master.gain.value = 0;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 32; hp.Q.value = 0.6;
  const shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 4800; shelf.gain.value = -5;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.5;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.25;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -6; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.15;
  const out = ctx.createGain(); out.gain.value = 0.8;
  master.connect(hp); hp.connect(shelf); shelf.connect(lp); lp.connect(comp); comp.connect(lim); lim.connect(out);
  out.connect(ctx.destination);

  const voiceBus = ctx.createGain(); voiceBus.gain.value = 1; voiceBus.connect(master);
  const ambBus = ctx.createGain(); ambBus.gain.value = 0; ambBus.connect(master);
  const reverbIn = ctx.createGain(); reverbIn.gain.value = 1;
  const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx);
  const reverbOut = ctx.createGain(); reverbOut.gain.value = 0.42;
  reverbIn.connect(conv); conv.connect(reverbOut); reverbOut.connect(master);

  Object.assign(g, { master, voiceBus, ambBus, reverbIn, out,
    noise: { white: makeNoise(ctx, 'white', 3), brown: makeNoise(ctx, 'brown', 5) } });
  return g;
}

// ---------------------------------------------------------------------------
// Voice: a short-lived group of nodes that cleans itself up

class Voice {
  constructor({ pan = 0, send = 0.15, gain = 1, dest = null, kind = 'voice' } = {}) {
    const g = G;
    this.g = g; this.ctx = g.ctx; this.kind = kind;
    this.nodes = []; this.srcs = []; this.pending = 0; this.alive = true; this.end = 0; this.timer = 0;
    this.t = g.ctx.currentTime + 0.012;
    this.born = g.ctx.currentTime;
    if (kind === 'voice' && g.voices.size >= MAX_VOICES) {
      let oldest = null;
      for (const v of g.voices) if (!v.dying && (!oldest || v.born < oldest.born)) oldest = v;
      oldest?.kill(0.04);
    }
    this.out = this.gain(gain);
    let tail = this.out;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
      this.nodes.push(p); this.out.connect(p); tail = p;
    }
    tail.connect(dest || g.voiceBus);
    if (send > 0) { const s = this.gain(send); tail.connect(s); s.connect(g.reverbIn); }
    (kind === 'hold' ? g.holds : kind === 'layer' ? g.layers : g.voices).add(this);
  }
  gain(v = 0) { const n = this.ctx.createGain(); n.gain.value = v; this.nodes.push(n); return n; }
  filter(type, f, q = 0.707) {
    const n = this.ctx.createBiquadFilter(); n.type = type; n.frequency.value = clampF(f); n.Q.value = q;
    this.nodes.push(n); return n;
  }
  shaper(curve) { const n = this.ctx.createWaveShaper(); n.curve = curve; this.nodes.push(n); return n; }
  panner(p) {
    if (!this.ctx.createStereoPanner) return this.out;
    const n = this.ctx.createStereoPanner(); n.pan.value = clamp(p, -1, 1); n.connect(this.out);
    this.nodes.push(n); return n;
  }
  // start a source; stop === null means "until kill()"
  src(node, t, stop = null, offset) {
    if (offset !== undefined) node.start(t, offset); else node.start(t);
    if (stop !== null) { node.stop(stop); this.end = Math.max(this.end, stop); }
    this.pending++;
    node.onended = () => { if (--this.pending <= 0) this.dispose(); };
    this.srcs.push(node); this.nodes.push(node);
    return node;
  }
  osc(type, f, t, stop = null) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(clampF(f), t);
    return this.src(o, t, stop);
  }
  noiseSrc(t, stop = null, color = 'white') {
    const s = this.ctx.createBufferSource(); s.buffer = this.g.noise[color] || this.g.noise.white; s.loop = true;
    return this.src(s, t, stop, Math.random() * (s.buffer.duration - 0.2));
  }
  // LFO -> depth gain -> params. stop === null means it lives as long as the voice (holds, beds).
  lfo(t, rate, depth, stop, ...params) {
    const o = this.osc('sine', rate, t, stop); const d = this.gain(depth); o.connect(d);
    for (const p of params) d.connect(p);
    return { osc: o, depth: d };
  }
  finish() {
    if (this.pending <= 0) { this.dispose(); return this; }
    if (this.g.live) this.arm((this.end - this.ctx.currentTime + 1.5) * 1000);
    return this;
  }
  // safety net in case 'ended' never arrives (e.g. a suspended context)
  arm(ms) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.alive) return;
      const c = this.ctx;
      if (c.state !== 'running' || c.currentTime > this.end + 0.5) this.dispose();
      else this.arm(1500);
    }, Math.max(100, ms));
  }
  // fade everything out (linear from the current value) and stop
  kill(fade = 0.05) {
    if (!this.alive || this.dying) return;
    this.dying = true;
    const now = this.ctx.currentTime;
    try { holdAt(this.out.gain, now); this.out.gain.linearRampToValueAtTime(0, now + fade); } catch { /* ignore */ }
    for (const s of this.srcs) { try { s.stop(now + fade + 0.02); } catch { /* already stopped */ } }
    this.end = now + fade + 0.02;
    if (this.g.live) this.arm((fade + 0.5) * 1000);
  }
  dispose() {
    if (!this.alive) return;
    this.alive = false;
    clearTimeout(this.timer);
    for (const s of this.srcs) { s.onended = null; try { s.stop(); } catch { /* ignore */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* ignore */ } }
    this.nodes.length = 0; this.srcs.length = 0;
    this.g.voices.delete(this); this.g.holds.delete(this); this.g.layers.delete(this);
  }
}

// ---------------------------------------------------------------------------
// primitives — each schedules into a Voice and returns its end time

/** Oscillator with pitch glide, vibrato, optional bit-crush, filter and envelope. */
function tone(v, t, o) {
  const { type = 'sine', f = 440, f1 = null, glide = 0.1, glideCurve = 'exp', steps = 0,
    a = 0.005, h = 0, r = 0.2, peak = 0.15, shape = 'pluck', lp = null, lpQ = 0.7, hp = null,
    vib = null, detune = 0, crush = 0, dest = v.out } = o;
  const endEnv = t + Math.max(a, 0.003) + h + r + 0.03;
  const osc = v.osc(type, f, t, endEnv);
  if (detune) osc.detune.value = detune;
  if (f1) {
    if (steps > 0) {
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        osc.frequency.setValueAtTime(clampF(f * Math.pow(f1 / f, k)), t + glide * k);
      }
    } else if (glideCurve === 'exp') osc.frequency.exponentialRampToValueAtTime(clampF(f1), t + glide);
    else osc.frequency.linearRampToValueAtTime(clampF(f1), t + glide);
  }
  if (vib) {
    const { depth } = v.lfo(t, vib.rate, 0, endEnv, osc.detune);
    const d0 = t + (vib.delay || 0);
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(vib.depth, d0 + 0.04);
    if (vib.decay) depth.gain.linearRampToValueAtTime(0, d0 + 0.04 + (vib.decay === true ? (h + r) : vib.decay));
  }
  let node = osc;
  if (crush) { const ws = v.shaper(crushCurve(crush)); node.connect(ws); node = ws; }
  if (hp) { const fl = v.filter('highpass', hp, 0.7); node.connect(fl); node = fl; }
  if (lp) { const fl = v.filter('lowpass', lp, lpQ); node.connect(fl); node = fl; }
  const g = v.gain(0); node.connect(g); g.connect(dest);
  env(g.gain, t, { a, h, r, peak, shape });
  return endEnv;
}

/** Filtered noise with an optional filter sweep. */
function noise(v, t, o) {
  const { dur = 0.4, a = 0.02, h = 0, r = null, peak = 0.05, type = 'bandpass', f = 1000, f1 = null, f2 = null,
    q = 0.8, color = 'white', shape = 'pluck', lp = null, dest = v.out } = o;
  const rr = r ?? Math.max(0.03, dur - a - h);
  const total = Math.max(a, 0.003) + h + rr;
  const end = t + total + 0.03;
  const s = v.noiseSrc(t, end, color);
  const fl = v.filter(type, f, q);
  if (f1 && f2) {
    fl.frequency.exponentialRampToValueAtTime(clampF(f1), t + total * 0.45);
    fl.frequency.exponentialRampToValueAtTime(clampF(f2), t + total);
  } else if (f1) fl.frequency.exponentialRampToValueAtTime(clampF(f1), t + total);
  s.connect(fl);
  let node = fl;
  if (lp) { const l = v.filter('lowpass', lp, 0.5); node.connect(l); node = l; }
  const g = v.gain(0); node.connect(g); g.connect(dest);
  env(g.gain, t, { a, h, r: rr, peak, shape });
  return end;
}

/** Gated noise grains — crackles, sparkles, digital static (one source, one gain). */
function grains(v, t, o) {
  const { dur = 0.5, rate = 30, len = [0.004, 0.012], peak = 0.05, type = 'bandpass', f = 2500, f1 = null, q = 1,
    lp = 5000, color = 'white', fade = 0.6, regular = false, dest = v.out } = o;
  const end = t + dur + 0.06;
  const s = v.noiseSrc(t, end, color);
  const fl = v.filter(type, f, q);
  if (f1) fl.frequency.exponentialRampToValueAtTime(clampF(f1), t + dur);
  s.connect(fl);
  let node = fl;
  if (lp) { const l = v.filter('lowpass', lp, 0.5); node.connect(l); node = l; }
  const g = v.gain(0); node.connect(g); g.connect(dest);
  const p = g.gain;
  p.setValueAtTime(0, t);
  const n = Math.max(1, Math.round(rate * dur));
  const times = Array.from({ length: n }, (_, i) => t + (regular ? (i / n) * dur : Math.random() * dur)).sort((x, y) => x - y);
  let last = t;
  for (const tg of times) {
    if (tg < last + 0.003) continue;
    const L = rnd(len[0], len[1]);
    const amp = peak * rnd(0.35, 1) * (1 - fade * (tg - t) / dur);
    p.setValueAtTime(0, tg);
    p.linearRampToValueAtTime(amp, tg + 0.002);
    p.linearRampToValueAtTime(0, tg + 0.002 + L);
    last = tg + 0.002 + L;
  }
  return end;
}

/** Simple FM pair — glitchy zaps. */
function fm(v, t, o) {
  const { f = 600, f1 = null, glide = 0.1, ratio = 1.41, index = 3, index1 = 0.3, a = 0.004, h = 0, r = 0.12,
    peak = 0.08, lp = 2600, dest = v.out } = o;
  const end = t + a + h + r + 0.03;
  const car = v.osc('sine', f, t, end);
  const mod = v.osc('sine', f * ratio, t, end);
  const mg = v.gain(0); mod.connect(mg); mg.connect(car.frequency);
  mg.gain.setValueAtTime(f * index, t);
  mg.gain.linearRampToValueAtTime(f * index1, t + a + h + r);
  if (f1) {
    car.frequency.exponentialRampToValueAtTime(clampF(f1), t + glide);
    mod.frequency.exponentialRampToValueAtTime(clampF(f1 * ratio), t + glide);
  }
  const fl = v.filter('lowpass', lp, 0.6);
  const g = v.gain(0); car.connect(fl); fl.connect(g); g.connect(dest);
  env(g.gain, t, { a, h, r, peak });
  return end;
}

const PARTIALS = {
  musicbox: [[1, 1, 1], [2, 0.2, 0.5], [3, 0.09, 0.3], [5.04, 0.035, 0.18]],
  celesta: [[1, 1, 1], [2, 0.3, 0.55], [4, 0.08, 0.3]],
  spark: [[1, 1, 1], [2, 0.32, 0.55], [3.01, 0.16, 0.4], [4.07, 0.06, 0.25]],
  lowbell: [[0.5, 0.25, 1.3], [1, 1, 1], [2.76, 0.28, 0.55], [5.4, 0.07, 0.3]],
  chime: [[1, 1, 1], [2.4, 0.22, 0.6], [3.9, 0.1, 0.4], [6.2, 0.03, 0.2]],
};

/** Additive bell — music box, celesta, sparkles, low bells. */
function bell(v, t, o) {
  const { f = 880, peak = 0.08, r = 1, partials = PARTIALS.celesta, a = 0.003, lp = 5000, dest = v.out, vib = null } = o;
  let bus = dest;
  if (lp) { bus = v.filter('lowpass', lp, 0.5); bus.connect(dest); }
  let end = t;
  for (const [ratio, amp, dec] of partials) {
    const fr = f * ratio;
    if (fr > 7500) continue;
    end = Math.max(end, tone(v, t, { type: 'sine', f: fr, a, r: r * dec, peak: peak * amp, dest: bus, vib }));
  }
  return end;
}

/** Detuned pad (pairs of oscillators per frequency into one filter). */
function pad(v, t, o) {
  const { freqs = [220], type = 'triangle', detune = 7, a = 0.4, h = 0.3, r = 0.8, peak = 0.06, lp = 900, lp1 = null,
    lpQ = 0.6, dest = v.out, shape = 'swell', vib = null } = o;
  const end = t + a + h + r + 0.04;
  const fl = v.filter('lowpass', lp, lpQ);
  if (lp1) fl.frequency.exponentialRampToValueAtTime(clampF(lp1), t + a + h);
  const g = v.gain(0); fl.connect(g); g.connect(dest);
  const vibDepth = vib ? v.lfo(t, vib.rate, vib.depth, end) : null;
  for (const f of freqs) {
    for (const dt of [-detune, detune]) {
      const osc = v.osc(type, f, t, end); osc.detune.value = dt;
      if (vibDepth) vibDepth.depth.connect(osc.detune);
      osc.connect(fl);
    }
  }
  env(g.gain, t, { a, h, r, peak: peak / Math.sqrt(freqs.length * 2), shape });
  return end;
}

/** Phaser-style swirl over noise (allpass chain swept by an LFO, mixed with dry). */
function phaser(v, t, o) {
  const { dur = 1, peak = 0.05, f = 900, rate = 0.9, depth = 600, color = 'white', pre = 2600, dest = v.out, a = null } = o;
  const end = t + dur + 0.05;
  const s = v.noiseSrc(t, end, color);
  const pf = v.filter('lowpass', pre, 0.5); s.connect(pf);
  const { depth: lg } = v.lfo(t, rate, depth, end);
  let node = pf;
  for (let i = 0; i < 4; i++) {
    const ap = v.filter('allpass', f * (1 + i * 0.35), 0.8);
    lg.connect(ap.frequency); node.connect(ap); node = ap;
  }
  const mix = v.gain(0); pf.connect(mix); node.connect(mix); mix.connect(dest);
  env(mix.gain, t, { a: a ?? dur * 0.4, r: dur * 0.6, peak, shape: 'swell' });
  return end;
}

/** Water droplet: sine with a fast downward pitch, lowpassed. */
function droplet(v, t, { f = 900, peak = 0.12, r = 0.12, drop = 0.5, lp = 2600, dest = v.out } = {}) {
  return tone(v, t, { type: 'sine', f, f1: f * drop, glide: 0.045, a: 0.003, r, peak, lp, lpQ: 0.5, dest });
}

/** Soft cork pop. */
function pop(v, t, { f = 1100, peak = 0.12, dest = v.out } = {}) {
  return tone(v, t, { type: 'sine', f, f1: f * 0.27, glide: 0.03, a: 0.003, r: 0.07, peak, lp: 3000, dest });
}

// ---------------------------------------------------------------------------
// Mallow kits — each Mallow has its own note / glide / air / accent timbres;
// the 14 gestures are built from those, so every gesture sounds like its Mallow.

function makeKit(def) {
  const k = { speed: 1, send: 0.15, scale: [0, 2, 4, 7, 9], special: {}, ...def };
  k.deg = (i) => {
    const n = k.scale.length; const o = Math.floor(i / n); const d = ((i % n) + n) % n;
    return k.scale[d] + 12 * o;
  };
  return k;
}

// semitone offsets of a major-pentatonic run from 0 towards `semis`
function pentRun(semis) {
  const P = [0, 2, 4, 7, 9];
  const out = [];
  const dir = Math.sign(semis) || 1;
  for (let i = 0; i < 20; i++) {
    const o = Math.floor(i / 5) * 12 + P[i % 5];
    if (o > Math.abs(semis) + 0.5) break;
    out.push(o * dir);
  }
  return out.length > 1 ? out : [0, semis];
}

const KITS = {
  // Chaos Mallow: bit-crushed chirps, staircase square glides, FM zaps, tiny stutters.
  glitzi: makeKit({
    root: 466.16, scale: [0, 3, 5, 7, 10], speed: 0.85, send: 0.06,
    note(v, t, f, amp, len = 0.08) {
      return tone(v, t, { type: 'triangle', f, f1: f * 1.07, glide: 0.022, crush: 5, a: 0.004, r: len + 0.05, peak: 0.15 * amp, lp: 2500 });
    },
    stutter(v, t, f, amp, n = 3, gap = 0.04) {
      for (let i = 0; i < n; i++) this.note(v, t + i * gap, f * st(i % 2 ? 0.4 : 0), amp * (1 - i * 0.22), 0.02);
    },
    glide(v, t, f0, f1, dur, amp) {
      return tone(v, t, { type: 'square', f: f0, f1, glide: dur, steps: Math.max(3, Math.round(dur / 0.03)),
        a: 0.006, h: dur * 0.75, r: 0.08, peak: 0.07 * amp, lp: 1700, lpQ: 1.1 });
    },
    air(v, t, dur, amp, dir = 0) {
      return grains(v, t, { dur, rate: 50, regular: true, len: [0.008, 0.018], peak: 0.05 * amp, f: dir < 0 ? 1700 : 1300,
        f1: dir < 0 ? 900 : dir > 0 ? 2300 : null, q: 0.9, lp: 3800, fade: 0.5 });
    },
    accent(v, t, amp, f = 466) {
      return fm(v, t, { f: f * 2.2, f1: f * 0.6, glide: 0.09, ratio: 1.41, index: 3, index1: 0.3, r: 0.1, peak: 0.08 * amp, lp: 2600 });
    },
    special: {
      tap(c) { c.k.stutter(c.v, c.t, c.D(2), c.A, 2, 0.035); },
      surprise(c) {
        fm(c.v, c.t, { f: c.F(-5), f1: c.F(12), glide: 0.12, ratio: 1.41, index: 2.5, index1: 0.6, r: 0.12, peak: 0.08 * c.A });
        c.k.stutter(c.v, c.t + 0.13, c.F(12), c.A * 0.8, 3, 0.038);
      },
      offended(c) {
        c.k.stutter(c.v, c.t, c.F(3), c.A * 0.9, 3, 0.045);
        c.k.glide(c.v, c.t + 0.17, c.F(0), c.F(-8), 0.24, c.A * 0.9);
        c.k.accent(c.v, c.t + 0.43, c.A * 0.6, c.F(-5));
      },
      celebrate(c) {
        const n = 4 + Math.round(c.I * 2);
        for (let i = 0; i < n; i++) c.k.note(c.v, c.t + i * 0.07, c.D(i), c.A * 0.85, 0.05);
        c.k.stutter(c.v, c.t + n * 0.07, c.D(n), c.A * 0.8, 3, 0.04);
        c.k.accent(c.v, c.t + n * 0.07 + 0.14, c.A * 0.6, c.F(5));
      },
      idle(c) { Math.random() < 0.5 ? c.k.stutter(c.v, c.t, c.D((Math.random() * 5) | 0), c.A * 0.4, 2, 0.05) : c.k.accent(c.v, c.t, c.A * 0.4, c.F(0)); },
      splash(c) {
        c.k.air(c.v, c.t, 0.3, c.A * 1.1, -1);
        for (let i = 0; i < 4; i++) c.k.note(c.v, c.t + 0.04 + i * 0.05, c.F(10 - i * 4), c.A * (0.7 - i * 0.12), 0.03);
      },
    },
  }),

  // Softie: water — droplet plinks, bubbly wobbles, splashes.
  blubi: makeKit({
    root: 698.46, scale: [0, 2, 4, 7, 9], speed: 1, send: 0.22,
    note(v, t, f, amp, len = 0.1) { return droplet(v, t, { f: f * 1.15, peak: 0.24 * amp, r: 0.1 + len * 0.5 }); },
    glide(v, t, f0, f1, dur, amp) {
      return tone(v, t, { type: 'sine', f: f0, f1, glide: dur, a: 0.018, h: dur * 0.5, r: dur * 0.6 + 0.08, peak: 0.14 * amp,
        lp: 1800, vib: { rate: rnd(14, 19), depth: 75, decay: true } });
    },
    air(v, t, dur, amp, dir = 0) {
      noise(v, t, { dur, a: dur * 0.3, peak: 0.07 * amp, type: 'lowpass', f: dir < 0 ? 1100 : 650, f1: dir < 0 ? 420 : dir > 0 ? 1300 : null,
        q: 0.9, color: 'brown', shape: 'swell' });
      const n = Math.max(1, Math.round(dur * 6));
      for (let i = 0; i < n; i++) droplet(v, t + rnd(0.05, dur), { f: rnd(500, 1100), peak: 0.035 * amp, r: 0.06 });
      return t + dur;
    },
    accent(v, t, amp, f = 1000) { return droplet(v, t, { f: f * 1.5 * rnd(0.96, 1.04), peak: 0.08 * amp, r: 0.08 }); },
    special: {
      splash(c) {
        const { v, t, A } = c;
        noise(v, t, { dur: 0.42, a: 0.008, peak: 0.07 * A, f: 2200, f1: 650, q: 0.8, lp: 4000 });
        noise(v, t, { dur: 0.3, a: 0.01, peak: 0.12 * A, type: 'lowpass', f: 520, f1: 260, color: 'brown' });
        for (let i = 0; i < 6; i++) droplet(v, t + rnd(0.03, 0.32), { f: c.D((Math.random() * 7) | 0), peak: (0.09 - i * 0.008) * A, r: 0.1 });
      },
      comfort(c) {
        c.k.glide(c.v, c.t, c.F(-12), c.F(-9), 0.8, c.A * 0.6);
        droplet(c.v, c.t + 0.45, { f: c.D(2), peak: 0.06 * c.A, r: 0.18 });
        droplet(c.v, c.t + 0.8, { f: c.D(4), peak: 0.05 * c.A, r: 0.2 });
      },
      idle(c) { c.k.accent(c.v, c.t, c.A * 0.8, c.D((Math.random() * 5) | 0) * 0.66); },
    },
  }),

  // Spiral: warbly vibrato, glissando whooshes, phaser swirl.
  zuzu: makeKit({
    root: 392, scale: [0, 2, 3, 7, 8], speed: 1.15, send: 0.26,
    note(v, t, f, amp, len = 0.12) {
      return tone(v, t, { type: 'triangle', f, a: 0.014, h: len * 0.4, r: len + 0.2, peak: 0.13 * amp, lp: 2000,
        vib: { rate: 6.2, depth: 40, delay: 0.03 } });
    },
    glide(v, t, f0, f1, dur, amp) {
      tone(v, t, { type: 'sine', f: f0, f1, glide: dur, a: dur * 0.25, h: dur * 0.35, r: dur * 0.5 + 0.1, peak: 0.13 * amp,
        shape: 'swell', vib: { rate: 5.5, depth: 32 } });
      tone(v, t, { type: 'triangle', f: f0 / 2, f1: f1 / 2, glide: dur, a: dur * 0.3, h: dur * 0.3, r: dur * 0.5 + 0.1,
        peak: 0.04 * amp, shape: 'swell', lp: 900 });
      return noise(v, t, { dur: dur * 1.1, a: dur * 0.5, peak: 0.02 * amp, f: Math.min(f0 * 2, 3000), f1: Math.min(f1 * 2, 3000), q: 2.2, shape: 'swell' });
    },
    air(v, t, dur, amp) { return phaser(v, t, { dur, peak: 0.06 * amp, rate: 1.4 / dur + 0.4, f: 700, depth: 450 }); },
    accent(v, t, amp, f = 600) {
      tone(v, t, { type: 'sine', f, f1: f * 1.12, glide: 0.35, a: 0.08, r: 0.32, peak: 0.05 * amp, shape: 'swell', vib: { rate: 7, depth: 30 } });
      return tone(v, t, { type: 'sine', f: f * 1.5, f1: f * 1.34, glide: 0.35, a: 0.08, r: 0.32, peak: 0.035 * amp, shape: 'swell', vib: { rate: 5, depth: 30 } });
    },
    special: {
      surprise(c) {
        c.k.glide(c.v, c.t, c.F(-5), c.F(12), 0.38, c.A);
        c.k.accent(c.v, c.t + 0.3, c.A * 0.7, c.F(12));
      },
      yawn(c) {
        c.k.glide(c.v, c.t, c.F(-7), c.F(2), 0.6, c.A * 0.55);
        c.k.glide(c.v, c.t + 0.6, c.F(2), c.F(-12), 0.9, c.A * 0.5);
        c.k.air(c.v, c.t + 0.1, 1.4, c.A * 0.6);
      },
      hop(c) { c.k.glide(c.v, c.t, c.F(-3), c.F(7), 0.14, c.A * 0.9); c.k.glide(c.v, c.t + 0.15, c.F(7), c.F(2), 0.16, c.A * 0.6); },
      idle(c) { c.k.note(c.v, c.t, c.D((Math.random() * 5) | 0) / 2, c.A * 0.4, 0.3); },
    },
  }),

  // Sunshine: springy boings, bright soft pops.
  boppo: makeKit({
    root: 329.63, scale: [0, 2, 4, 7, 9], speed: 0.9, send: 0.12,
    note(v, t, f, amp, len = 0.1) {
      return tone(v, t, { type: 'triangle', f: f * 0.8, f1: f, glide: 0.035, a: 0.004, r: len + 0.12, peak: 0.25 * amp, lp: 2600 });
    },
    glide(v, t, f0, f1, dur, amp) {
      tone(v, t, { type: 'triangle', f: f0, f1, glide: dur, a: 0.005, h: dur * 0.3, r: dur + 0.25, peak: 0.15 * amp, lp: 2400,
        vib: { rate: 11, depth: 90, delay: dur * 0.6, decay: dur + 0.25 } });
      return tone(v, t, { type: 'sine', f: f0 / 2, f1: f1 / 2, glide: dur, a: 0.005, r: dur + 0.15, peak: 0.06 * amp });
    },
    air(v, t, dur, amp, dir = 0) {
      return noise(v, t, { dur: Math.min(dur, 0.5), a: 0.02, peak: 0.05 * amp, type: 'lowpass', f: 1400, f1: dir > 0 ? 2200 : 650, q: 0.8 });
    },
    accent(v, t, amp, f = 1100) { return pop(v, t, { f: clamp(f * 2, 700, 1400) * rnd(0.95, 1.05), peak: 0.14 * amp }); },
    special: {
      hop(c) {
        c.k.glide(c.v, c.t, c.F(-12), c.F(2), 0.1, c.A);
        c.k.accent(c.v, c.t + 0.3, c.A * 0.6, c.F(5));
      },
      celebrate(c) {
        for (let i = 0; i < 3; i++) c.k.glide(c.v, c.t + i * 0.13, c.D(i * 2) * 0.7, c.D(i * 2), 0.06, c.A * 0.8);
        for (let i = 0; i < 3; i++) c.k.accent(c.v, c.t + 0.42 + i * 0.07, c.A * (0.6 - i * 0.1), c.D(i + 3));
      },
      splash(c) {
        c.k.air(c.v, c.t, 0.35, c.A);
        for (let i = 0; i < 4; i++) c.k.accent(c.v, c.t + 0.03 + i * rnd(0.05, 0.08), c.A * (0.7 - i * 0.1), c.D(i + 2));
      },
      idle(c) { c.k.accent(c.v, c.t, c.A * 0.6, c.D((Math.random() * 5) | 0)); },
    },
  }),

  // Spark: sparkly bell arpeggios, crackle sparkles, quick up-runs.
  pipzi: makeKit({
    root: 783.99, scale: [0, 2, 4, 7, 9], speed: 0.7, send: 0.18,
    note(v, t, f, amp, len = 0.1) { return bell(v, t, { f, peak: 0.13 * amp, r: 0.28 + len, partials: PARTIALS.spark, lp: 5200 }); },
    glide(v, t, f0, f1, dur, amp) {
      const run = pentRun(12 * Math.log2(f1 / f0));
      const step = clamp(dur / run.length, 0.03, 0.06);
      run.forEach((s, i) => bell(v, t + i * step, { f: f0 * st(s), peak: 0.07 * amp * (0.8 + 0.2 * i / run.length), r: 0.2, partials: PARTIALS.spark }));
      return t + run.length * step + 0.3;
    },
    air(v, t, dur, amp) {
      return grains(v, t, { dur, rate: 34, len: [0.003, 0.009], peak: 0.06 * amp, f: 3200, q: 1.4, lp: 5500 });
    },
    accent(v, t, amp, f = 784) {
      const b = clamp(f * 2, 900, 2400);
      bell(v, t, { f: b, peak: 0.045 * amp, r: 0.3, partials: PARTIALS.celesta });
      return bell(v, t + 0.06, { f: b * 1.5, peak: 0.03 * amp, r: 0.3, partials: PARTIALS.celesta });
    },
    special: {
      celebrate(c) {
        const n = 6 + Math.round(c.I * 3);
        for (let i = 0; i < n; i++) c.k.note(c.v, c.t + i * 0.048, c.D(i - 2), c.A * 0.8, 0.06);
        c.k.air(c.v, c.t + 0.1, 0.6, c.A * 0.9);
        c.k.accent(c.v, c.t + n * 0.048 + 0.05, c.A * 0.8, c.D(2));
      },
      surprise(c) { c.k.glide(c.v, c.t, c.F(-7), c.F(12), 0.2, c.A); c.k.air(c.v, c.t + 0.15, 0.3, c.A); },
      success(c) {
        [0, 2, 4, 5].forEach((d, i) => c.k.note(c.v, c.t + i * 0.08, c.D(d), c.A * 0.85, i === 3 ? 0.3 : 0.08));
        c.k.air(c.v, c.t + 0.3, 0.35, c.A * 0.7);
      },
      idle(c) { c.k.air(c.v, c.t, 0.25, c.A * 0.9); c.k.note(c.v, c.t + 0.05, c.D(4), c.A * 0.3, 0.05); },
    },
  }),

  // Chill One: soft pads, low gentle bell, breathy whoosh — slow.
  loomi: makeKit({
    root: 196, scale: [0, 2, 4, 7, 9], speed: 1.6, send: 0.36,
    note(v, t, f, amp, len = 0.2) {
      tone(v, t, { type: 'sine', f, a: 0.03, h: len * 0.4, r: 0.5 + len, peak: 0.1 * amp });
      return tone(v, t, { type: 'triangle', f: f * 2, a: 0.04, r: 0.3 + len, peak: 0.025 * amp, lp: 900 });
    },
    glide(v, t, f0, f1, dur, amp) {
      tone(v, t, { type: 'sine', f: f0, f1, glide: dur, a: dur * 0.3, h: dur * 0.3, r: dur * 0.5 + 0.2, peak: 0.1 * amp, shape: 'swell' });
      return tone(v, t, { type: 'triangle', f: f0 * 2, f1: f1 * 2, glide: dur, a: dur * 0.35, h: dur * 0.2, r: dur * 0.5 + 0.2,
        peak: 0.025 * amp, shape: 'swell', lp: 700, detune: 6 });
    },
    air(v, t, dur, amp, dir = 0) {
      return noise(v, t, { dur, a: dur * 0.45, peak: 0.07 * amp, f: dir < 0 ? 800 : 480, f1: dir < 0 ? 380 : dir > 0 ? 850 : 600,
        q: 0.6, lp: 1600, shape: 'swell' });
    },
    accent(v, t, amp, f = 196) { return bell(v, t, { f: clamp(f, 150, 400), peak: 0.08 * amp, r: 2, partials: PARTIALS.lowbell, lp: 2400 }); },
    special: {
      comfort(c) {
        pad(c.v, c.t, { freqs: [c.F(-12), c.F(-5), c.F(0)], a: 0.6, h: 0.5, r: 1.2, peak: 0.08 * c.A, lp: 700 });
        c.k.accent(c.v, c.t + 0.5, c.A * 0.6, c.F(0));
      },
      sigh(c) {
        c.k.air(c.v, c.t, 1.6, c.A * 0.9, -1);
        c.k.glide(c.v, c.t + 0.1, c.F(2), c.F(-7), 1.4, c.A * 0.5);
      },
      celebrate(c) {
        [0, 2, 4, 5].forEach((d, i) => c.k.accent(c.v, c.t + i * 0.18, c.A * 0.55, c.D(d)));
        pad(c.v, c.t, { freqs: [c.F(0), c.F(4), c.F(7)], a: 0.5, h: 0.3, r: 1, peak: 0.045 * c.A, lp: 800 });
      },
      idle(c) { c.k.air(c.v, c.t, 1.2, c.A * 0.4); },
    },
  }),

  // Dreamer: music-box / celesta, airy hums, soft yawns.
  noomi: makeKit({
    root: 523.25, scale: [0, 2, 4, 7, 9], speed: 1.3, send: 0.34,
    note(v, t, f, amp, len = 0.1) { return bell(v, t, { f, peak: 0.09 * amp, r: 0.9 + len, partials: PARTIALS.musicbox, lp: 4200 }); },
    glide(v, t, f0, f1, dur, amp) {
      tone(v, t, { type: 'sine', f: f0 / 2, f1: f1 / 2, glide: dur, a: dur * 0.3, h: dur * 0.3, r: dur * 0.5 + 0.15, peak: 0.09 * amp,
        shape: 'swell', vib: { rate: 4.5, depth: 14 } });
      tone(v, t, { type: 'sine', f: f0, f1, glide: dur, a: dur * 0.35, h: dur * 0.2, r: dur * 0.5 + 0.15, peak: 0.018 * amp, shape: 'swell' });
      return noise(v, t, { dur: dur + 0.2, a: dur * 0.4, peak: 0.012 * amp, f: 1200, q: 0.6, lp: 2400, shape: 'swell' });
    },
    air(v, t, dur, amp, dir = 0) {
      return noise(v, t, { dur, a: dur * 0.45, peak: 0.04 * amp, f: 1100, f1: dir < 0 ? 600 : dir > 0 ? 1500 : null, q: 0.55, lp: 2500, shape: 'swell' });
    },
    accent(v, t, amp, f = 523) {
      const b = clamp(f * 2, 700, 2100);
      bell(v, t, { f: b, peak: 0.04 * amp, r: 0.7, partials: PARTIALS.celesta });
      return bell(v, t + 0.11, { f: b * 1.5, peak: 0.028 * amp, r: 0.6, partials: PARTIALS.celesta });
    },
    special: {
      yawn(c) {
        const { v, t, A } = c;
        noise(v, t, { dur: 1.8, a: 0.7, peak: 0.05 * A, f: 600, f1: 1300, f2: 450, q: 0.9, lp: 2200, shape: 'swell' });
        const o = { type: 'sine', a: 0.5, shape: 'swell', vib: { rate: 4.2, depth: 18 } };
        tone(v, t, { ...o, f: c.F(-17), f1: c.F(-12), glide: 0.7, h: 0.15, r: 1.1, peak: 0.07 * A });
        tone(v, t + 0.6, { type: 'sine', f: c.F(-12), f1: c.F(-22), glide: 1.1, a: 0.3, r: 0.9, peak: 0.05 * A, shape: 'swell', vib: { rate: 4, depth: 14 } });
      },
      tap(c) { c.k.note(c.v, c.t, c.D(4), c.A * 0.9, 0.05); },
      celebrate(c) {
        [0, 2, 4, 5, 7].forEach((d, i) => c.k.note(c.v, c.t + i * 0.13, c.D(d), c.A * 0.85, 0.1));
        c.k.accent(c.v, c.t + 0.7, c.A * 0.7, c.D(4));
      },
      idle(c) { c.k.note(c.v, c.t, c.D((Math.random() * 7) | 0), c.A * 0.35, 0.2); },
    },
  }),

  // Unknown Mallow: a neutral, soft voice.
  neutral: makeKit({
    root: 440, scale: [0, 2, 4, 7, 9], speed: 1, send: 0.18,
    note(v, t, f, amp, len = 0.1) { return tone(v, t, { type: 'sine', f, a: 0.006, r: 0.15 + len, peak: 0.18 * amp, lp: 2200 }); },
    glide(v, t, f0, f1, dur, amp) { return tone(v, t, { type: 'sine', f: f0, f1, glide: dur, a: 0.02, h: dur * 0.4, r: dur * 0.6 + 0.08, peak: 0.1 * amp }); },
    air(v, t, dur, amp, dir = 0) { return noise(v, t, { dur, a: dur * 0.4, peak: 0.035 * amp, f: 900, f1: dir < 0 ? 500 : dir > 0 ? 1300 : null, q: 0.7, shape: 'swell' }); },
    accent(v, t, amp, f = 440) { return tone(v, t, { type: 'sine', f: clamp(f * 2, 500, 1600), a: 0.005, r: 0.14, peak: 0.08 * amp }); },
  }),
};

// The 14 gestures, written once in terms of each kit's timbres.
const GESTURES = {
  tap: (c) => c.k.note(c.v, c.t, c.D(2), c.A * 0.85, 0.1 * c.s),
  press: (c) => { c.k.glide(c.v, c.t, c.F(0), c.F(-3), 0.18 * c.s, c.A * 0.8); },
  squeeze: (c) => {
    c.k.glide(c.v, c.t, c.F(2), c.F(-6), 0.36 * c.s, c.A * 0.85);
    c.k.air(c.v, c.t + 0.02, 0.34 * c.s, c.A * 0.5, -1);
  },
  release: (c) => {
    c.k.glide(c.v, c.t, c.F(-5), c.F(4), 0.2 * c.s, c.A * 0.85);
    c.k.accent(c.v, c.t + 0.17 * c.s, c.A * 0.5, c.F(4));
  },
  surprise: (c) => {
    c.k.glide(c.v, c.t, c.F(0), c.F(9), 0.11 * c.s, c.A);
    c.k.note(c.v, c.t + 0.13 * c.s, c.F(12), c.A * 0.7, 0.12);
    c.k.accent(c.v, c.t + 0.2 * c.s, c.A * 0.5, c.F(12));
  },
  offended: (c) => {
    c.k.note(c.v, c.t, c.F(3), c.A * 0.8, 0.12 * c.s);
    c.k.glide(c.v, c.t + 0.17 * c.s, c.F(0), c.F(-5), 0.26 * c.s, c.A * 0.75);
    c.k.air(c.v, c.t + 0.2 * c.s, 0.22 * c.s, c.A * 0.4, -1);
  },
  celebrate: (c) => {
    const n = 4 + Math.round(c.I * 2);
    for (let i = 0; i < n; i++) c.k.note(c.v, c.t + i * 0.085 * c.s, c.D(i), c.A * 0.8, i === n - 1 ? 0.3 : 0.08);
    c.k.accent(c.v, c.t + n * 0.085 * c.s, c.A * 0.6, c.D(n));
  },
  comfort: (c) => {
    c.k.glide(c.v, c.t, c.F(-12), c.F(-8), 0.9 * c.s, c.A * 0.6);
    c.k.air(c.v, c.t + 0.1, 1.0 * c.s, c.A * 0.3, 0);
  },
  sigh: (c) => {
    c.k.air(c.v, c.t, 1.1 * c.s, c.A * 0.6, -1);
    c.k.glide(c.v, c.t + 0.05, c.F(-3), c.F(-10), 0.9 * c.s, c.A * 0.35);
  },
  yawn: (c) => {
    c.k.glide(c.v, c.t, c.F(-7), c.F(0), 0.45 * c.s, c.A * 0.5);
    c.k.glide(c.v, c.t + 0.45 * c.s, c.F(0), c.F(-9), 0.7 * c.s, c.A * 0.45);
    c.k.air(c.v, c.t, 1.15 * c.s, c.A * 0.35, 0);
  },
  hop: (c) => {
    c.k.glide(c.v, c.t, c.F(-5), c.F(5), 0.12 * c.s, c.A * 0.9);
    c.k.note(c.v, c.t + 0.15 * c.s, c.F(7), c.A * 0.5, 0.08);
  },
  success: (c) => {
    [0, 2, 4].forEach((d, i) => c.k.note(c.v, c.t + i * 0.11 * c.s, c.D(d), c.A * 0.85, i === 2 ? 0.35 : 0.1));
    c.k.accent(c.v, c.t + 0.3 * c.s, c.A * 0.5, c.D(4));
  },
  splash: (c) => {
    c.k.air(c.v, c.t, 0.4 * c.s, c.A * 0.9, -1);
    for (let i = 0; i < 3; i++) c.k.note(c.v, c.t + 0.04 + i * 0.07 * c.s, c.D(4 - i), c.A * (0.6 - i * 0.12), 0.05);
  },
  idle: (c) => c.k.accent(c.v, c.t, c.A * 0.6, c.F(0)),
};

function buildMallow(mallowId, name, opts = {}) {
  const k = KITS[mallowId] || KITS.neutral;
  const I = clamp(num(opts.intensity, 0.6), 0, 1);
  const A = 0.45 + 0.55 * I;
  const v = new Voice({ pan: num(opts.pan, 0), send: k.send });
  const root = k.root * clamp(num(opts.pitch, 1), 0.25, 4) * st(rnd(-0.2, 0.2));
  const c = { k, v, t: v.t, A, I, s: k.speed, F: (x) => root * st(x), D: (i) => root * st(k.deg(i)) };
  (k.special[name] || GESTURES[name] || GESTURES.tap)(c);
  v.finish();
  return true;
}

// ---------------------------------------------------------------------------
// interface sounds (neutral, warm, quiet)

const UI = {
  tap(v, t) { tone(v, t, { type: 'sine', f: 760, f1: 700, glide: 0.04, a: 0.004, r: 0.08, peak: 0.12, lp: 2400 }); },
  open(v, t) {
    bell(v, t, { f: 523.25, peak: 0.05, r: 0.3, partials: PARTIALS.celesta, lp: 3000 });
    bell(v, t + 0.06, { f: 783.99, peak: 0.05, r: 0.35, partials: PARTIALS.celesta, lp: 3000 });
    noise(v, t, { dur: 0.22, a: 0.08, peak: 0.018, f: 600, f1: 1600, q: 0.8, shape: 'swell' });
  },
  close(v, t) {
    bell(v, t, { f: 783.99, peak: 0.045, r: 0.25, partials: PARTIALS.celesta, lp: 3000 });
    bell(v, t + 0.06, { f: 523.25, peak: 0.045, r: 0.3, partials: PARTIALS.celesta, lp: 3000 });
    noise(v, t, { dur: 0.2, a: 0.05, peak: 0.016, f: 1500, f1: 600, q: 0.8, shape: 'swell' });
  },
  toggle(v, t) { tone(v, t, { type: 'sine', f: 900, f1: 520, glide: 0.022, a: 0.003, r: 0.06, peak: 0.13, lp: 2400 }); },
  whoosh(v, t) { noise(v, t, { dur: 0.38, a: 0.15, peak: 0.05, f: 420, f1: 1700, f2: 700, q: 1, lp: 3200, shape: 'swell' }); },
  select(v, t) { bell(v, t, { f: 1046.5, peak: 0.06, r: 0.45, partials: PARTIALS.celesta, lp: 3500 }); },
  'error-soft'(v, t) {
    tone(v, t, { type: 'triangle', f: 392, a: 0.01, r: 0.14, peak: 0.08, lp: 1100 });
    tone(v, t + 0.13, { type: 'triangle', f: 349.23, a: 0.01, r: 0.22, peak: 0.07, lp: 1000 });
  },
};

// ---------------------------------------------------------------------------
// sustained sounds (holds). Each builder returns { set(I, P, when, tau), level(I) }.

const HOLDS = {
  // rising buzz: detuned saws through a resonant lowpass with a shimmering tremolo
  charge(v, t) {
    const o1 = v.osc('sawtooth', 110, t), o2 = v.osc('sawtooth', 110, t), sub = v.osc('triangle', 55, t);
    o2.detune.value = 11;
    const lp = v.filter('lowpass', 500, 2.2);
    const trem = v.gain(0.75);
    const { osc: lfo } = v.lfo(t, 6, 0.25, null, trem.gain);
    const sg = v.gain(0.6);
    o1.connect(lp); o2.connect(lp); sub.connect(sg); sg.connect(lp); lp.connect(trem);
    return {
      out: trem,
      set(I, P, w, tau) {
        const f = 98 * P * Math.pow(2, I * 1.5);
        o1.frequency.setTargetAtTime(f, w, tau); o2.frequency.setTargetAtTime(f, w, tau); sub.frequency.setTargetAtTime(f / 2, w, tau);
        lp.frequency.setTargetAtTime(380 + 1900 * I * I, w, tau);
        lfo.frequency.setTargetAtTime(5 + 9 * I, w, tau);
      },
      level: (I) => 0.035 + 0.04 * I,
    };
  },
  // warm low thrum: sine + triangle with a slow amplitude pulse and a little brown rumble
  ground(v, t) {
    const o = v.osc('sine', 55, t), tri = v.osc('triangle', 110, t);
    const tg = v.gain(0.35);
    const lp = v.filter('lowpass', 260, 0.7);
    const n = v.noiseSrc(t, null, 'brown'); const nlp = v.filter('lowpass', 160, 0.7); const ng = v.gain(0.25);
    const thrum = v.gain(0.7);
    const { osc: lfo } = v.lfo(t, 3.2, 0.3, null, thrum.gain);
    o.connect(lp); tri.connect(tg); tg.connect(lp); n.connect(nlp); nlp.connect(ng); ng.connect(lp); lp.connect(thrum);
    return {
      out: thrum,
      set(I, P, w, tau) {
        o.frequency.setTargetAtTime(55 * P, w, tau); tri.frequency.setTargetAtTime(110 * P, w, tau);
        lp.frequency.setTargetAtTime(220 + 300 * I, w, tau);
        lfo.frequency.setTargetAtTime(2.6 + 2.4 * I, w, tau);
      },
      level: (I) => 0.07 + 0.06 * I,
    };
  },
  // draining swirl: resonant band of noise and a tone falling as intensity rises
  drain(v, t) {
    const n = v.noiseSrc(t, null, 'white');
    const bp = v.filter('bandpass', 1200, 3.5);
    const { osc: gurgle } = v.lfo(t, 5, 90, null, bp.frequency);
    const ng = v.gain(0.55);
    const o = v.osc('sine', 440, t);
    const og = v.gain(0.35);
    v.lfo(t, 4.5, 18, null, o.detune);
    const mix = v.gain(1);
    n.connect(bp); bp.connect(ng); ng.connect(mix); o.connect(og); og.connect(mix);
    return {
      out: mix,
      set(I, P, w, tau) {
        bp.frequency.setTargetAtTime(1300 * P * (1 - 0.78 * I), w, tau);
        o.frequency.setTargetAtTime(440 * P * (1 - 0.7 * I), w, tau);
        gurgle.frequency.setTargetAtTime(4 + 4 * I, w, tau);
      },
      level: (I) => 0.06 + 0.04 * I,
    };
  },
  // gentle sustained hum: root + fifth + octave with a slow shared vibrato
  hum(v, t) {
    const a = v.osc('sine', 196, t), b = v.osc('sine', 294, t), c = v.osc('triangle', 392, t);
    const bg = v.gain(0.3), cg = v.gain(0.12);
    const lp = v.filter('lowpass', 900, 0.6);
    v.lfo(t, 4.8, 7, null, a.detune, b.detune, c.detune);
    a.connect(lp); b.connect(bg); bg.connect(lp); c.connect(cg); cg.connect(lp);
    return {
      out: lp,
      set(I, P, w, tau) {
        a.frequency.setTargetAtTime(196 * P, w, tau); b.frequency.setTargetAtTime(294 * P, w, tau); c.frequency.setTargetAtTime(392 * P, w, tau);
        lp.frequency.setTargetAtTime(700 + 1100 * I, w, tau);
      },
      level: (I) => 0.05 + 0.035 * I,
    };
  },
};

function startHold(name, opts = {}) {
  const g = G;
  const builder = HOLDS[name] || HOLDS.hum;
  const active = [...g.holds].filter((h) => h.handle?.active);
  if (active.length >= MAX_HOLDS) {
    active.sort((x, y) => x.born - y.born);
    active[0].handle.stop();
  }
  const v = new Voice({ pan: num(opts.pan, 0), send: 0.12, kind: 'hold' });
  const t = v.t;
  const b = builder(v, t);
  const lvl = v.gain(0); b.out.connect(lvl); lvl.connect(v.out);
  let I = clamp(num(opts.intensity, 0.3), 0, 1);
  let P = clamp(num(opts.pitch, 1), 0.25, 4);
  b.set(I, P, t, 0.01);
  lvl.gain.setTargetAtTime(b.level(I), t, 0.09); // ~0.3 s soft attack
  let stopped = false;
  const handle = {
    update({ intensity, pitch } = {}, when) {
      if (stopped) return;
      if (intensity !== undefined) I = clamp(num(intensity, I), 0, 1);
      if (pitch !== undefined) P = clamp(num(pitch, P), 0.25, 4);
      const w = Math.max(when ?? 0, v.ctx.currentTime);
      b.set(I, P, w, 0.06);
      lvl.gain.setTargetAtTime(b.level(I), w, 0.08);
    },
    stop(when) {
      if (stopped) return;
      stopped = true;
      clearTimeout(v.maxTimer);
      const w = Math.max(when ?? 0, v.ctx.currentTime);
      lvl.gain.setTargetAtTime(0, w, 0.09);      // smooth fade from wherever it is
      for (const s of v.srcs) { try { s.stop(w + 0.8); } catch { /* ignore */ } }
      v.end = w + 0.8;
      if (v.g.live) v.arm(2000);
    },
    get active() { return !stopped; },
  };
  v.handle = handle;
  if (g.live) v.maxTimer = setTimeout(() => handle.stop(), HOLD_MAX_S * 1000);
  return handle;
}

const NOOP_HOLD = Object.freeze({ update() {}, stop() {}, active: false });

// ---------------------------------------------------------------------------
// ritual sounds

// one-shot versions of hold sounds: rise to an intensity, hold, fade
function fxFromHold(name, opts, { from, to, rise, hold }) {
  const h = startHold(name, { ...opts, intensity: from });
  const t0 = G.ctx.currentTime + 0.012;
  const steps = 6; // step the target along the rise so the setTarget curve feels like a ramp
  for (let i = 1; i <= steps; i++) h.update({ intensity: from + (to - from) * (i / steps) }, t0 + rise * (i / steps));
  h.stop(t0 + rise + hold);
}
const FX_FROM_HOLD = {
  charge: (o) => fxFromHold('charge', o, { from: 0.05, to: 0.4 + 0.6 * o.I, rise: 1.1, hold: 0.15 }),
  ground: (o) => fxFromHold('ground', o, { from: 0.3, to: 0.3 + 0.6 * o.I, rise: 0.4, hold: 1.0 }),
};

const FX = {
  crackle(v, t, o) { grains(v, t, { dur: 0.7, rate: 28 + 40 * o.I, len: [0.003, 0.011], peak: 0.12 * o.A, f: 2300 * o.P, q: 1.2, lp: 4800 }); },
  sort(v, t, o) {
    [0, 4, 7].forEach((s, i) => tone(v, t + i * 0.065, { type: 'triangle', f: 523.25 * o.P * st(s), a: 0.005, r: 0.16, peak: 0.08 * o.A, lp: 2200 }));
    noise(v, t, { dur: 0.22, a: 0.05, peak: 0.025 * o.A, f: 1100, f1: 2000, q: 0.9, lp: 3500, shape: 'swell' });
  },
  snap(v, t, o) {
    pop(v, t, { f: 1150 * o.P, peak: 0.2 * o.A });
    noise(v, t, { dur: 0.035, a: 0.003, peak: 0.04 * o.A, f: 2400, q: 1, lp: 3800 });
  },
  'drop-in'(v, t, o) {
    tone(v, t, { type: 'sine', f: 900 * o.P, f1: 320 * o.P, glide: 0.17, a: 0.006, h: 0.05, r: 0.12, peak: 0.08 * o.A, lp: 2400 });
    tone(v, t + 0.17, { type: 'sine', f: 150, f1: 70, glide: 0.1, a: 0.005, r: 0.22, peak: 0.14 * o.A, lp: 400 });
    droplet(v, t + 0.2, { f: 1050 * o.P, peak: 0.05 * o.A, r: 0.12 });
  },
  clear(v, t, o) {
    noise(v, t, { dur: 2.4, a: 0.9, peak: 0.04 * o.A, type: 'lowpass', f: 500, f1: 3600, q: 0.7, shape: 'swell' });
    [0, 4, 7, 11, 14, 19].forEach((s, i) => bell(v, t + 0.3 + i * 0.12, { f: 523.25 * o.P * st(s), peak: 0.045 * o.A, r: 1.3, partials: PARTIALS.celesta, lp: 4500 }));
    pad(v, t + 0.2, { freqs: [261.6 * o.P, 329.6 * o.P, 392 * o.P], a: 0.9, h: 0.4, r: 1.4, peak: 0.07 * o.A, lp: 600, lp1: 1800 });
  },
  portal(v, t, o) {
    tone(v, t, { type: 'sine', f: 45 * o.P, f1: 75 * o.P, glide: 1.6, a: 0.8, h: 0.6, r: 1.6, peak: 0.1 * o.A, shape: 'swell' });
    pad(v, t + 0.1, { freqs: [110, 164.8, 220, 277.2].map((f) => f * o.P), a: 1.0, h: 0.5, r: 1.8, peak: 0.07 * o.A, lp: 500, lp1: 1800, vib: { rate: 0.6, depth: 6 } });
    noise(v, t, { dur: 2.6, a: 1.1, peak: 0.03 * o.A, f: 220, f1: 1500, q: 1.4, shape: 'swell' });
    bell(v, t + 1.3, { f: 440 * o.P, peak: 0.06 * o.A, r: 2, partials: PARTIALS.lowbell, lp: 3000 });
  },
  separate(v, t, o) {
    const L = v.panner(-0.7), R = v.panner(0.7);
    const f = 440 * o.P;
    tone(v, t, { type: 'sine', f, a: 0.02, h: 0.12, r: 0.12, peak: 0.08 * o.A, shape: 'swell' });
    tone(v, t + 0.12, { type: 'sine', f, f1: f * st(4), glide: 0.35, a: 0.04, h: 0.25, r: 0.4, peak: 0.08 * o.A, dest: L, vib: { rate: 5, depth: 10 } });
    tone(v, t + 0.12, { type: 'triangle', f, f1: f * st(-5), glide: 0.35, a: 0.04, h: 0.25, r: 0.4, peak: 0.08 * o.A, lp: 1600, dest: R });
  },
  'rotate-tick'(v, t, o) {
    tone(v, t, { type: 'triangle', f: 1500 * o.P, a: 0.003, r: 0.03, peak: 0.06 * o.A, lp: 3400 });
    tone(v, t, { type: 'sine', f: 750 * o.P, a: 0.003, r: 0.04, peak: 0.06 * o.A });
  },
  'lens-focus'(v, t, o) {
    const f = 440 * o.P;
    tone(v, t, { type: 'sine', f: f * 1.07, f1: f, glide: 0.7, a: 0.15, h: 0.3, r: 0.35, peak: 0.055 * o.A, shape: 'swell' });
    tone(v, t, { type: 'sine', f: f * 0.93, f1: f, glide: 0.7, a: 0.15, h: 0.3, r: 0.35, peak: 0.055 * o.A, shape: 'swell' });
    noise(v, t, { dur: 0.75, a: 0.3, peak: 0.022 * o.A, f: 2800, f1: 900, q: 3, shape: 'swell' });
    bell(v, t + 0.72, { f: f * 2, peak: 0.05 * o.A, r: 0.6, partials: PARTIALS.celesta });
  },
  chime(v, t, o) { bell(v, t, { f: 880 * o.P, peak: 0.1 * o.A, r: 1.6, partials: PARTIALS.chime, lp: 4500 }); },
  star(v, t, o) {
    bell(v, t, { f: 1318.5 * o.P, peak: 0.055 * o.A, r: 0.7, partials: PARTIALS.spark, vib: { rate: 6, depth: 8 } });
    bell(v, t + 0.07, { f: 1975.5 * o.P, peak: 0.035 * o.A, r: 0.55, partials: PARTIALS.celesta });
    grains(v, t + 0.02, { dur: 0.3, rate: 22, len: [0.002, 0.006], peak: 0.03 * o.A, f: 3600, q: 1.5, lp: 5200 });
  },
  bloom(v, t, o) {
    const fl = v.filter('lowpass', 600, 0.7);
    fl.frequency.exponentialRampToValueAtTime(2600, t + 1.0);
    fl.connect(v.out);
    [0, 4, 7, 11, 14].forEach((s, i) => tone(v, t + i * 0.09, { type: 'triangle', f: 261.63 * o.P * st(s), a: 0.15, h: 0.25, r: 1.1,
      peak: 0.042 * o.A, shape: 'swell', dest: fl }));
  },
  'breathe-in'(v, t, o) {
    const d = clamp(num(o.duration, 4), 1, 10);
    noise(v, t, { dur: d + 0.6, a: d * 0.85, r: 0.6, peak: 0.05 * o.A, f: 350, f1: 900, q: 0.8, lp: 2000, shape: 'swell' });
    tone(v, t, { type: 'sine', f: 196 * o.P, f1: 294 * o.P, glide: d, a: d * 0.85, r: 0.7, peak: 0.04 * o.A, shape: 'swell' });
  },
  'breathe-out'(v, t, o) {
    const d = clamp(num(o.duration, 5), 1, 12);
    noise(v, t, { dur: d, a: 0.35, r: d - 0.35, peak: 0.05 * o.A, f: 900, f1: 300, q: 0.8, lp: 2000, shape: 'swell' });
    tone(v, t, { type: 'sine', f: 294 * o.P, f1: 196 * o.P, glide: d, a: 0.4, r: d - 0.4, peak: 0.04 * o.A, shape: 'swell' });
  },
};

function buildFx(name, opts = {}) {
  const I = clamp(num(opts.intensity, 0.6), 0, 1);
  const o = { ...opts, I, A: 0.45 + 0.55 * I, P: clamp(num(opts.pitch, 1), 0.25, 4), pan: num(opts.pan, 0) };
  if (FX_FROM_HOLD[name]) { FX_FROM_HOLD[name]({ pitch: o.P, pan: o.pan, I }); return true; }
  const v = new Voice({ pan: o.pan, send: 0.24 });
  (FX[name] || FX.chime)(v, v.t, o);
  v.finish();
  return true;
}

function buildUi(name) {
  const v = new Voice({ send: 0.08 });
  (UI[name] || UI.tap)(v, v.t);
  v.finish();
  return true;
}

// ---------------------------------------------------------------------------
// ambience — one quiet generative bed per realm. A bed is a 'layer' Voice of a
// few continuous sources plus sparse scheduled events; changes crossfade.

const DEFAULT_MOOD = { agitation: 0.3, heaviness: 0.3, clarity: 0.5, warmth: 0.5 };

function setP(p, value, when, tau) { if (tau > 0) p.setTargetAtTime(value, when, tau); else p.setValueAtTime(value, when); }

function loopNoise(L, t, color, type, f, q, gain) {
  const s = L.noiseSrc(t, null, color); const fl = L.filter(type, f, q); const g = L.gain(gain);
  s.connect(fl); fl.connect(g); g.connect(L.out);
  return { filter: fl, gain: g };
}
function loopOsc(L, t, type, f, gain, lp = null, detune = 0) {
  const o = L.osc(type, f, t); o.detune.value = detune; const g = L.gain(gain);
  if (lp) { const fl = L.filter('lowpass', lp, 0.6); o.connect(fl); fl.connect(g); } else o.connect(g);
  g.connect(L.out);
  return { osc: o, gain: g };
}

const REALM_BEDS = {
  'static-storm'(L, t) {
    const rumble = loopNoise(L, t, 'brown', 'lowpass', 300, 0.7, 0);
    L.lfo(t, 0.07, 110, null, rumble.filter.frequency);
    const hiss = loopNoise(L, t, 'white', 'bandpass', 1600, 0.6, 0);
    const swell = L.gain(1); hiss.gain.disconnect(); hiss.gain.connect(swell); swell.connect(L.out);
    L.lfo(t, 0.21, 0.5, null, swell.gain);
    const d1 = loopOsc(L, t, 'square', 55, 0, 200), d2 = loopOsc(L, t, 'square', 55.35, 0, 200);
    const warm = loopOsc(L, t, 'sine', 110, 0);
    return {
      apply(m, w, tau) {
        setP(rumble.gain.gain, 0.12 * (0.4 + 0.8 * m.agitation) * (1 - 0.35 * m.clarity), w, tau);
        setP(rumble.filter.frequency, 200 + 380 * m.agitation - 100 * m.heaviness + 150 * m.clarity, w, tau);
        setP(hiss.gain.gain, (0.004 + 0.012 * m.agitation) * (1 - 0.6 * m.clarity), w, tau);
        setP(d1.gain.gain, 0.01 + 0.025 * m.heaviness, w, tau); setP(d2.gain.gain, 0.01 + 0.025 * m.heaviness, w, tau);
        setP(warm.gain.gain, 0.022 * m.warmth, w, tau);
      },
      events: [
        { rate: (m) => 0.12 + 0.5 * m.agitation, play(v, t) { tone(v, t, { type: 'triangle', f: 466 * st(pick([0, 3, 5, 7, 10])), crush: 4, a: 0.006, r: 0.08, peak: 0.03, lp: 2000 }); } },
        { rate: (m) => (0.015 + 0.05 * m.agitation) * (1 - 0.7 * m.clarity), play(v, t) { noise(v, t, { dur: 3.6, a: 1.2, peak: 0.13, type: 'lowpass', f: 150, f1: 90, color: 'brown', shape: 'swell' }); } },
        { rate: (m) => 0.07 * m.clarity, play(v, t) { bell(v, t, { f: 932 * st(pick([0, 3, 7])), peak: 0.02, r: 1.4, partials: PARTIALS.celesta, lp: 3500 }); } },
      ],
    };
  },
  'raindrop-lagoon'(L, t) {
    const rain = loopNoise(L, t, 'white', 'highpass', 1400, 0.5, 0);
    const rainLp = L.filter('lowpass', 4200, 0.5); rain.gain.disconnect(); rain.gain.connect(rainLp); rainLp.connect(L.out);
    const lap = loopNoise(L, t, 'brown', 'lowpass', 480, 0.8, 0);
    const lapSwell = L.gain(1); lap.gain.disconnect(); lap.gain.connect(lapSwell); lapSwell.connect(L.out);
    L.lfo(t, 0.12, 0.45, null, lapSwell.gain);
    const p1 = loopOsc(L, t, 'sine', 174.6, 0), p2 = loopOsc(L, t, 'sine', 261.6, 0);
    return {
      apply(m, w, tau) {
        setP(rain.gain.gain, 0.006 + 0.016 * m.agitation, w, tau);
        setP(rainLp.frequency, 2600 + 1800 * m.clarity, w, tau);
        setP(lap.gain.gain, 0.065 + 0.04 * m.heaviness, w, tau);
        setP(lap.filter.frequency, 380 + 260 * m.clarity - 120 * m.heaviness, w, tau);
        setP(p1.gain.gain, 0.018 * m.warmth, w, tau); setP(p2.gain.gain, 0.01 * m.warmth, w, tau);
      },
      events: [
        { rate: (m) => 0.5 + 2.2 * m.agitation, play(v, t, m) { droplet(v, t, { f: 698 * st(pick([0, 2, 4, 7, 9, 12])) * (0.85 + 0.3 * m.clarity), peak: rnd(0.015, 0.035), r: 0.12 }); } },
        { rate: (m) => 0.05 * m.heaviness, play(v, t) { tone(v, t, { type: 'sine', f: 220, f1: 330, glide: 0.5, a: 0.1, r: 0.5, peak: 0.025, vib: { rate: 15, depth: 60, decay: true } }); } },
      ],
    };
  },
  'spiral-observatory'(L, t) {
    const padOut = L.gain(0);
    const lp = L.filter('lowpass', 900, 0.6); lp.connect(padOut); padOut.connect(L.out);
    const { depth: lg } = L.lfo(t, 0.08, 380, null);
    let node = L.gain(1);
    const dry = node;
    for (const [f, d] of [[98, -6], [146.8, 5], [233.1, -4], [98, 7]]) { const o = L.osc('triangle', f, t); o.detune.value = d; o.connect(dry); }
    for (let i = 0; i < 4; i++) { const ap = L.filter('allpass', 500 * (1 + i * 0.4), 0.8); lg.connect(ap.frequency); node.connect(ap); node = ap; }
    dry.connect(lp); node.connect(lp);
    const air = loopNoise(L, t, 'brown', 'bandpass', 600, 0.8, 0);
    L.lfo(t, 0.05, 280, null, air.filter.frequency);
    return {
      apply(m, w, tau) {
        setP(padOut.gain, 0.012 + 0.012 * m.warmth, w, tau);
        setP(lp.frequency, 600 + 900 * m.clarity - 250 * m.heaviness, w, tau);
        setP(air.gain.gain, 0.02 + 0.03 * m.agitation, w, tau);
      },
      events: [
        { rate: (m) => 0.06 + 0.14 * m.agitation, play(v, t) {
          const f = 392 * st(pick([0, 2, 3, 7, 8])); const up = Math.random() < 0.5;
          tone(v, t, { type: 'sine', f: up ? f : f * 1.5, f1: up ? f * 1.5 : f, glide: 3, a: 1.2, h: 0.4, r: 1.6, peak: 0.018, shape: 'swell', vib: { rate: 5, depth: 28 } });
        } },
        { rate: (m) => 0.08 + 0.12 * m.clarity, play(v, t) { bell(v, t, { f: 784 * st(pick([0, 2, 3, 7, 8, 12])), peak: 0.016, r: 1.6, partials: PARTIALS.celesta, lp: 3500 }); } },
      ],
    };
  },
  'sunpop-orchard'(L, t) {
    const padOut = L.gain(0); const lp = L.filter('lowpass', 1200, 0.6); lp.connect(padOut); padOut.connect(L.out);
    for (const [f, ty] of [[164.8, 'sine'], [207.6, 'triangle'], [246.9, 'sine'], [329.6, 'sine']]) {
      for (const d of [-5, 5]) { const o = L.osc(ty, f, t); o.detune.value = d; o.connect(lp); }
    }
    const leaves = loopNoise(L, t, 'white', 'bandpass', 2300, 0.5, 0);
    const swell = L.gain(1); leaves.gain.disconnect(); leaves.gain.connect(swell); swell.connect(L.out);
    L.lfo(t, 0.17, 0.6, null, swell.gain);
    return {
      apply(m, w, tau) {
        setP(padOut.gain, (0.009 + 0.013 * m.warmth) * (1 - 0.3 * m.heaviness), w, tau);
        setP(lp.frequency, 900 + 900 * m.clarity, w, tau);
        setP(leaves.gain.gain, 0.004 + 0.008 * m.agitation, w, tau);
      },
      events: [
        { rate: (m) => 0.15 + 0.3 * m.clarity, play(v, t) {
          const f = rnd(1100, 1600); const n = 2 + ((Math.random() * 3) | 0);
          for (let i = 0; i < n; i++) tone(v, t + i * 0.09, { type: 'sine', f, f1: f * rnd(1.15, 1.3), glide: 0.05, a: 0.01, r: 0.07, peak: 0.012, lp: 2600 });
        } },
        { rate: (m) => 0.1 + 0.3 * m.agitation, play(v, t) { pop(v, t, { f: rnd(700, 1000), peak: 0.03 }); } },
        { rate: () => 0.05, play(v, t) { tone(v, t, { type: 'triangle', f: 165, f1: 330, glide: 0.08, a: 0.005, r: 0.4, peak: 0.03, lp: 1500, vib: { rate: 10, depth: 70, delay: 0.05, decay: 0.4 } }); } },
      ],
    };
  },
  'spark-festival'(L, t) {
    const padOut = L.gain(0); const lp = L.filter('lowpass', 1000, 0.6); lp.connect(padOut); padOut.connect(L.out);
    for (const f of [220, 277.2, 329.6]) for (const d of [-6, 6]) { const o = L.osc('triangle', f, t); o.detune.value = d; o.connect(lp); }
    const crowd = loopNoise(L, t, 'brown', 'bandpass', 420, 0.7, 0);
    L.lfo(t, 0.09, 120, null, crowd.filter.frequency);
    return {
      apply(m, w, tau) {
        setP(padOut.gain, (0.012 + 0.018 * m.warmth), w, tau);
        setP(lp.frequency, 800 + 800 * m.clarity - 200 * m.heaviness, w, tau);
        setP(crowd.gain.gain, 0.025 + 0.04 * m.agitation, w, tau);
      },
      events: [
        { rate: (m) => 0.5 + 1.4 * m.agitation, play(v, t, m) { bell(v, t, { f: 880 * st(pick([0, 2, 4, 7, 9, 12])) * (m.clarity > 0.6 ? 1.5 : 1), peak: rnd(0.01, 0.022), r: 0.5, partials: PARTIALS.spark, lp: 4500 }); } },
        { rate: (m) => 0.04 + 0.12 * m.agitation, play(v, t) {
          tone(v, t, { type: 'sine', f: 70, f1: 42, glide: 0.4, a: 0.02, r: 0.6, peak: 0.06, lp: 300 });
          grains(v, t + 0.12, { dur: 1.1, rate: 26, len: [0.003, 0.01], peak: 0.03, f: 2400, q: 1, lp: 4200, fade: 0.9 });
        } },
      ],
    };
  },
  'blue-drift'(L, t) {
    const d1 = loopOsc(L, t, 'sine', 65.4, 0), d2 = loopOsc(L, t, 'sine', 65.7, 0), fifth = loopOsc(L, t, 'sine', 98, 0);
    const padOut = L.gain(0); const lp = L.filter('lowpass', 600, 0.6); lp.connect(padOut); padOut.connect(L.out);
    for (const f of [196, 293.7]) for (const d of [-7, 7]) { const o = L.osc('triangle', f, t); o.detune.value = d; o.connect(lp); }
    const wind = loopNoise(L, t, 'brown', 'bandpass', 500, 0.5, 0);
    const breath = L.gain(1); wind.gain.disconnect(); wind.gain.connect(breath); breath.connect(L.out);
    L.lfo(t, 0.1, 0.7, null, breath.gain);
    return {
      apply(m, w, tau) {
        setP(d1.gain.gain, 0.018 + 0.025 * m.heaviness, w, tau); setP(d2.gain.gain, 0.018 + 0.025 * m.heaviness, w, tau);
        setP(fifth.gain.gain, 0.012 + 0.012 * m.warmth, w, tau);
        setP(padOut.gain, 0.008 + 0.018 * m.warmth, w, tau);
        setP(lp.frequency, 450 + 500 * m.clarity, w, tau);
        setP(wind.gain.gain, 0.025 + 0.035 * m.agitation, w, tau);
        setP(wind.filter.frequency, 380 + 300 * m.clarity, w, tau);
      },
      events: [
        { rate: (m) => 0.035 + 0.05 * m.clarity, play(v, t) { bell(v, t, { f: pick([130.8, 196, 261.6]), peak: 0.035, r: 2.6, partials: PARTIALS.lowbell, lp: 2000 }); } },
        { rate: (m) => 0.03 + 0.05 * m.agitation, play(v, t) { noise(v, t, { dur: 4, a: 1.8, peak: 0.03, f: 350, f1: 800, f2: 400, q: 0.7, shape: 'swell' }); } },
      ],
    };
  },
  'moonmilk-cove'(L, t) {
    const waves = loopNoise(L, t, 'brown', 'lowpass', 650, 0.7, 0);
    const swell = L.gain(1); waves.gain.disconnect(); waves.gain.connect(swell); swell.connect(L.out);
    L.lfo(t, 0.07, 0.7, null, swell.gain);
    const humOut = L.gain(0); humOut.connect(L.out);
    const { depth: vib } = L.lfo(t, 0.3, 6, null);
    for (const f of [261.6, 329.6, 392]) { const o = L.osc('sine', f, t); vib.connect(o.detune); o.connect(humOut); }
    return {
      apply(m, w, tau) {
        setP(waves.gain.gain, 0.06 + 0.04 * m.agitation + 0.02 * m.heaviness, w, tau);
        setP(waves.filter.frequency, 450 + 400 * m.clarity, w, tau);
        setP(humOut.gain, 0.004 + 0.008 * m.warmth, w, tau);
      },
      events: [
        { rate: (m) => 0.12 + 0.25 * m.clarity, play(v, t) {
          const phrase = Math.random() < 0.3 ? [0, 4, 7] : [pick([0, 2, 4, 7, 9, 12, 14])];
          phrase.forEach((s, i) => bell(v, t + i * 0.32, { f: 523.25 * st(s), peak: 0.022, r: 1.4, partials: PARTIALS.musicbox, lp: 3800 }));
        } },
        { rate: (m) => 0.03 + 0.04 * m.warmth, play(v, t) { tone(v, t, { type: 'sine', f: 196, f1: 174.6, glide: 2.5, a: 1, r: 1.6, peak: 0.02, shape: 'swell', vib: { rate: 4, depth: 10 } }); } },
      ],
    };
  },
};

function startBed(realmId, mood, fadeIn) {
  const g = G;
  const L = new Voice({ dest: g.ambBus, send: 0.3, kind: 'layer', gain: 0 });
  const t = L.t;
  const bed = (REALM_BEDS[realmId] || REALM_BEDS['blue-drift'])(L, t);
  bed.apply(mood, t, 0);
  L.out.gain.setValueAtTime(0, t);
  L.out.gain.linearRampToValueAtTime(1, t + fadeIn);
  L.realm = realmId; L.bed = bed; L.nextAt = t + 0.3; L.fading = false;
  return L;
}

// schedule a layer's sparse events in [t0, t1)
function tickBed(L, t0, t1, mood) {
  if (L.fading || !L.alive) return;
  const g = L.g;
  for (const e of L.bed.events) {
    let expected = e.rate(mood) * (t1 - t0);
    while (Math.random() < expected) {
      expected -= 1;
      if (g.voices.size > MAX_VOICES * 0.7) return;
      const prev = G; G = g;
      try {
        const v = new Voice({ dest: L.out, send: 0, pan: rnd(-0.6, 0.6) });
        e.play(v, rnd(t0, t1), mood);
        v.finish();
      } finally { G = prev; }
    }
  }
}

// ---------------------------------------------------------------------------
// live state, iOS / visibility handling, rate limiting

const state = {
  unlocked: false, realm: null, mood: { ...DEFAULT_MOOD }, layer: null, sched: 0,
  dropped: 0, played: 0, hidden: false, listening: false, suspendTimer: 0,
};
const recent = new Map(); // key -> timestamps (ms)
let globalRecent = [];

function allow(key) {
  const now = (globalThis.performance?.now?.() ?? Date.now());
  globalRecent = globalRecent.filter((x) => now - x < 1000);
  const arr = (recent.get(key) || []).filter((x) => now - x < 1000);
  if (arr.length >= RATE_PER_SEC || (arr.length && now - arr[arr.length - 1] < MIN_GAP_MS) || globalRecent.length >= GLOBAL_PER_SEC) {
    recent.set(key, arr); state.dropped++; return false;
  }
  arr.push(now); recent.set(key, arr); globalRecent.push(now);
  return true;
}

function isHidden() { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; }

function canPlay() {
  if (!LIVE || !loadPrefs().enabled) return false;
  if (LIVE.ctx.state !== 'running') { tryResume(); return false; } // never queue sounds into a suspended context
  return true;
}

function tryResume() {
  if (!LIVE || state.hidden || !loadPrefs().enabled) return;
  const c = LIVE.ctx;
  if (c.state !== 'running' && c.state !== 'closed') { try { c.resume().catch(() => {}); } catch { /* ignore */ } }
}

function applyMaster(tau = 0.05) {
  if (!LIVE) return;
  const p = loadPrefs();
  const now = LIVE.ctx.currentTime;
  LIVE.master.gain.setTargetAtTime(p.enabled ? p.volume : 0, now, tau);
}

function ambienceTarget() { return state.hidden ? 0 : AMB_LEVEL; }

function ensureScheduler() {
  if (state.sched || !LIVE) return;
  state.sched = setInterval(() => {
    if (!LIVE || LIVE.ctx.state !== 'running' || state.hidden) return;
    const now = LIVE.ctx.currentTime;
    for (const L of LIVE.layers) {
      if (L.fading) continue;
      const t0 = Math.max(L.nextAt, now + 0.05), t1 = now + 0.6;
      if (t1 > t0) { tickBed(L, t0, t1, state.mood); L.nextAt = t1; }
    }
    if (!LIVE.layers.size && !state.realm) { clearInterval(state.sched); state.sched = 0; }
  }, 250);
}

function fadeOutLayer(L, secs) {
  if (!L || L.fading) return;
  L.fading = true;
  const now = L.ctx.currentTime;
  holdAt(L.out.gain, now);
  L.out.gain.linearRampToValueAtTime(0, now + secs);
  for (const s of L.srcs) { try { s.stop(now + secs + 0.05); } catch { /* ignore */ } }
  L.end = now + secs + 0.05;
  if (L.g.live) L.arm((secs + 1) * 1000);
}

function startAmbienceNow() {
  if (!LIVE || !state.realm || !loadPrefs().enabled) return;
  if (state.layer?.alive && !state.layer.fading && state.layer.realm === state.realm) return;
  const old = state.layer;
  G = LIVE;
  state.layer = startBed(state.realm, state.mood, AMB_XFADE_S);
  fadeOutLayer(old, AMB_XFADE_S);
  LIVE.ambBus.gain.setTargetAtTime(ambienceTarget(), LIVE.ctx.currentTime, 0.3);
  ensureScheduler();
}

function stopAllHolds() { if (LIVE) for (const h of [...LIVE.holds]) h.handle?.stop(); }

function onVisibility() {
  if (!LIVE) return;
  const hidden = isHidden();
  if (hidden === state.hidden) return;
  state.hidden = hidden;
  const c = LIVE.ctx;
  clearTimeout(state.suspendTimer);
  if (hidden) {
    stopAllHolds();
    LIVE.ambBus.gain.setTargetAtTime(0, c.currentTime, 0.12);
    state.suspendTimer = setTimeout(() => { if (state.hidden && c.state === 'running') c.suspend().catch(() => {}); }, 600);
  } else {
    tryResume();
    LIVE.ambBus.gain.setTargetAtTime(ambienceTarget(), c.currentTime, 0.5);
  }
}

function onGesture() { if (LIVE && LIVE.ctx.state !== 'running') tryResume(); }

function listen() {
  if (state.listening || typeof document === 'undefined') return;
  state.listening = true;
  document.addEventListener('visibilitychange', onVisibility);
  globalThis.addEventListener?.('pagehide', onVisibility);
  globalThis.addEventListener?.('pageshow', onVisibility);
  // iOS: an 'interrupted' (phone call, Siri) or system-suspended context can only be resumed from a gesture
  for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, onGesture, { capture: true, passive: true });
  LIVE.ctx.addEventListener?.('statechange', () => {
    if (LIVE.ctx.state === 'running') {
      // a resume after an interruption: make sure the beds are back
      LIVE.ambBus.gain.setTargetAtTime(ambienceTarget(), LIVE.ctx.currentTime, 0.4);
    }
  });
}

function unlock() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return Promise.resolve(false);
  if (!LIVE) {
    let ctx;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch { try { ctx = new AC(); } catch { return Promise.resolve(false); } }
    LIVE = buildGraph(ctx, true);
    G = LIVE;
    state.hidden = isHidden();
    listen();
  }
  const c = LIVE.ctx;
  // iOS: play one silent sample inside the gesture to fully unlock output
  try {
    const b = c.createBuffer(1, 1, c.sampleRate); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination);
    s.onended = () => s.disconnect(); s.start();
  } catch { /* ignore */ }
  state.unlocked = true;
  applyMaster(0.08);
  const done = () => {
    if (c.state === 'running') { startAmbienceNow(); return true; }
    return false;
  };
  if (c.state === 'running') return Promise.resolve(done());
  try { return c.resume().then(done, () => false); } catch { return Promise.resolve(false); }
}

// ---------------------------------------------------------------------------
// offline rendering (QA): render any sound into an OfflineAudioContext and
// measure it. Used by sound-lab.html and the automated checks.

function analyse(buf, volume) {
  const sr = buf.sampleRate;
  let peak = 0, sum = 0, dsum = 0, maxStep = 0, n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 1; i < d.length; i++) {
      const x = d[i], dx = x - d[i - 1];
      const ax = Math.abs(x); if (ax > peak) peak = ax;
      sum += x * x; dsum += dx * dx; n++;
      const s = Math.abs(dx); if (s > maxStep) maxStep = s;
    }
  }
  const tailN = Math.floor(sr * 0.05);
  let tail = 0, head = 0, nonfinite = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = d.length - tailN; i < d.length; i++) tail = Math.max(tail, Math.abs(d[i]));
    for (let i = 0; i < Math.floor(sr * 0.01); i++) head = Math.max(head, Math.abs(d[i]));
    for (let i = 0; i < d.length; i += 64) if (!Number.isFinite(d[i])) nonfinite++;
  }
  const rms = Math.sqrt(sum / Math.max(1, n));
  return {
    volume, duration: buf.duration, peak, peakDb: 20 * Math.log10(peak || 1e-9), rms, rmsDb: 20 * Math.log10(rms || 1e-9),
    // energy-weighted mean frequency (Hz) — a brightness indicator
    brightnessHz: sum > 0 ? (sr / (2 * Math.PI)) * Math.sqrt(dsum / sum) : 0,
    maxStep, head, tail, nonfinite,
  };
}

async function renderOffline({ kind, args = [], duration = 3, sampleRate = 44100, volume = DEFAULT_VOLUME, script = [], stopAt = null, mood = null } = {}) {
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!OAC) throw new Error('OfflineAudioContext unavailable');
  const ctx = new OAC(2, Math.ceil(duration * sampleRate), sampleRate);
  const g = buildGraph(ctx, false);
  g.master.gain.value = volume; g.ambBus.gain.value = AMB_LEVEL;
  const prev = G; G = g;
  try {
    if (kind === 'play') buildMallow(args[0], args[1], args[2] || {});
    else if (kind === 'ui') buildUi(args[0]);
    else if (kind === 'fx') buildFx(args[0], args[1] || {});
    else if (kind === 'hold') {
      const h = startHold(args[0], args[1] || {});
      for (const s of script) h.update(s, s.at);
      h.stop(stopAt ?? duration - 1.2);
    } else if (kind === 'ambience') {
      const m = { ...DEFAULT_MOOD, ...(mood || {}) };
      const L = startBed(args[0], m, 0.8);
      tickBed(L, 0.1, duration - 1.5, m);
      L.out.gain.setValueAtTime(1, duration - 1.3); L.out.gain.linearRampToValueAtTime(0, duration - 0.3);
      for (const s of L.srcs) { try { s.stop(duration - 0.25); } catch { /* ignore */ } }
    } else throw new Error(`unknown kind ${kind}`);
  } finally { G = prev; }
  const buf = await ctx.startRendering();
  const res = analyse(buf, volume);
  res.leftoverNodes = g.voices.size + g.holds.size + g.layers.size; // all should have cleaned up
  return res;
}

// ---------------------------------------------------------------------------
// public API

export const audio = {
  /** Call from a user gesture. Creates/resumes the AudioContext. Safe to call repeatedly. Resolves to true when running. */
  unlock,

  setEnabled(on) {
    const p = loadPrefs();
    p.enabled = Boolean(on); savePrefs();
    if (!LIVE) return;
    applyMaster(0.06);
    if (!p.enabled) {
      stopAllHolds();
      fadeOutLayer(state.layer, 0.4); state.layer = null; // remember state.realm so it comes back
    } else {
      tryResume();
      if (LIVE.ctx.state === 'running') startAmbienceNow();
    }
  },
  isEnabled() { return loadPrefs().enabled; },
  setVolume(v) { const p = loadPrefs(); p.volume = clamp(num(v, DEFAULT_VOLUME), 0, 1); savePrefs(); applyMaster(0.05); },
  getVolume() { return loadPrefs().volume; },
  isUnlocked() { return state.unlocked && Boolean(LIVE) && LIVE.ctx.state === 'running'; },

  /** A Mallow's voice. Unknown mallowId → neutral soft voice. Returns true if it played. */
  play(mallowId, name, opts = {}) {
    if (!canPlay() || !allow(`m:${mallowId}:${name}`)) return false;
    G = LIVE; state.played++;
    return buildMallow(mallowId, name, opts || {});
  },

  /** Interface sounds: tap, open, close, toggle, whoosh, select, error-soft. */
  ui(name) {
    if (!canPlay() || !allow(`ui:${name}`)) return false;
    G = LIVE; state.played++;
    return buildUi(name);
  },

  /** Ritual sounds (see FX_SOUNDS). opts: {intensity 0..1, pan -1..1, pitch ratio (1 = normal), duration (breathe-*)}. */
  fx(name, opts = {}) {
    if (!canPlay() || !allow(`fx:${name}`)) return false;
    G = LIVE; state.played++;
    return buildFx(name, opts || {});
  },

  /** Sustained sound for press-and-hold. Returns {update({intensity, pitch}), stop()}; both always safe to call. */
  hold(name, opts = {}) {
    if (!canPlay() || !allow(`hold:${name}`)) return NOOP_HOLD;
    G = LIVE; state.played++;
    return startHold(name, opts || {});
  },

  /** Start (or crossfade to) a realm's ambience bed. Remembered if called before unlock / while sound is off. */
  ambience(realmId, { mood } = {}) {
    if (mood) Object.assign(state.mood, sanitizeMood(mood));
    state.realm = realmId;
    if (state.layer?.alive && !state.layer.fading && state.layer.realm === realmId) { audio.setAmbienceMood(state.mood); return; }
    if (LIVE && LIVE.ctx.state === 'running' && loadPrefs().enabled) startAmbienceNow();
  },
  setAmbienceMood(mood = {}) {
    Object.assign(state.mood, sanitizeMood(mood));
    const L = state.layer;
    if (L?.alive && !L.fading) L.bed.apply(state.mood, L.ctx.currentTime, 1.2);
  },
  stopAmbience() {
    state.realm = null;
    fadeOutLayer(state.layer, AMB_XFADE_S); state.layer = null;
  },

  /** Lists of everything the engine can play (for tools like the sound lab). */
  catalog: { mallows: MALLOW_IDS, mallowSounds: MALLOW_SOUNDS, ui: UI_SOUNDS, fx: FX_SOUNDS, holds: HOLD_SOUNDS, realms: REALMS },

  /** Debug counters. activeVoices must return to 0 shortly after sounds finish. */
  _debug() {
    return {
      state: LIVE ? LIVE.ctx.state : 'none', unlocked: state.unlocked, enabled: loadPrefs().enabled, volume: loadPrefs().volume,
      activeVoices: LIVE ? LIVE.voices.size : 0, fadingVoices: LIVE ? [...LIVE.voices].filter((v) => v.dying).length : 0, holds: LIVE ? LIVE.holds.size : 0,
      activeHolds: LIVE ? [...LIVE.holds].filter((h) => h.handle?.active).length : 0, ambienceLayers: LIVE ? LIVE.layers.size : 0,
      realm: state.realm, mood: { ...state.mood }, played: state.played, dropped: state.dropped, hidden: state.hidden,
    };
  },
  /** QA: render one sound offline and measure it. spec: {kind:'play'|'ui'|'fx'|'hold'|'ambience', args, duration, ...} */
  _renderOffline: renderOffline,
};

function sanitizeMood(m) {
  const out = {};
  for (const k of Object.keys(DEFAULT_MOOD)) if (m && m[k] !== undefined) out[k] = clamp(num(m[k], DEFAULT_MOOD[k]), 0, 1);
  return out;
}

export default audio;
