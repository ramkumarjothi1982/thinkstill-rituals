// Ambience — long, quiet beds of looping filtered noise and a soft pad, for
// Weather Weaver (rain, wind, rumble…) and Mallow Nightlight (its night texture).
//
// One bed is one long-lived SoundEngine voice (`keep`, so the voice cap evicts
// it last), built only once `sound.ready` and wanted. Levels and filter
// centres ease with setTargetAtTime; ramp() schedules one linear swell (a
// breath). Anything that stops every voice (mute, a hidden page, the cap, the
// resume purge) marks the bed not alive, and the next eligible tick() rebuilds
// it with a fresh fade-in. Noise buffers are cached per AudioContext and built
// in a timeout, never inside a gesture. No Web Audio is touched at import time.

import { clamp } from './math.js';
import { VOICES } from './sound-engine.js';

const COLORS = ['white', 'pink', 'brown'];
const BUFFERS = new WeakMap();   // AudioContext → Map(`${color}:${secs}` → AudioBuffer)
const NO_NODES = Object.freeze({});
const st = (s) => Math.pow(2, s / 12);
const hz = (v, d) => (+v > 0 ? clamp(+v, 20, 20000) : d);
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);

const colour = (c) => (COLORS.includes(c) ? c : 'brown');
const length = (secs) => (+secs > 0 ? +secs : 4);
const cached = (ac, secs, color) => BUFFERS.get(ac)?.get(`${colour(color)}:${length(secs)}`) || null;

/**
 * A mono looping noise buffer, cached per AudioContext by colour and length.
 * 'white' uniform ±0.9; 'pink' (Paul Kellet's filter) and 'brown' (leaky
 * integrated white) are made seamless at the loop point and normalised to a
 * 0.9 peak. O(n): build it from a frame or a timeout, never inside a gesture.
 */
export function noiseBuffer(ac, secs = 4, color = 'brown') {
  const c = colour(color), len = length(secs), k = `${c}:${len}`;
  let m = BUFFERS.get(ac);
  if (!m) BUFFERS.set(ac, (m = new Map()));
  let b = m.get(k);
  if (b) return b;
  b = ac.createBuffer(1, Math.max(2, Math.floor(ac.sampleRate * len)), ac.sampleRate);
  fill(b.getChannelData(0), c);
  m.set(k, b);
  return b;
}

function fill(d, color) {
  const n = d.length, rnd = () => Math.random() * 2 - 1;
  if (color === 'white') { for (let i = 0; i < n; i++) d[i] = rnd() * 0.9; return; }
  if (color === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rnd();
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < n; i++) { last = (last + 0.02 * rnd()) / 1.02; d[i] = last; }
  }
  // no step where the loop wraps (a brown walk drifts; the seam would thump every few seconds), no DC
  const drift = (d[n - 1] - d[0]) / (n - 1);
  let mean = 0;
  for (let i = 0; i < n; i++) { d[i] -= drift * i; mean += d[i]; }
  mean /= n;
  let peak = 1e-9;
  for (let i = 0; i < n; i++) { d[i] -= mean; peak = Math.max(peak, Math.abs(d[i])); }
  const k = 0.9 / peak;
  for (let i = 0; i < n; i++) d[i] *= k;
}

// Freeze a param where it is now (no jump when a running ramp is cut short).
function hold(p, t) {
  if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
  else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
}

// Fade a bed voice out and stop its sources; returns the stop time.
function fadeOut(v, fade, stopIn = fade + 0.1) {
  const t = v.out.context.currentTime, g = v.out.gain, end = t + stopIn;
  hold(g, t); g.setTargetAtTime(0, t, Math.max(0.005, fade / 3));
  for (const s of v.srcs) { try { s.stop(end); } catch { /* already stopped */ } }
  return end;
}

export class AmbientBed {
  /**
   * @param {import('./sound-engine.js').SoundEngine} sound
   * @param {object} [o]
   *   layers[name] = { type = 'bandpass', f, q = 0.7, peak, lfo = 0, depth = 0, color = 'brown' }
   *     (lfo: amplitude LFO in Hz, depth 0..1; 'pad' is reserved for the pad)
   *   pad = { root, peak = 0.035, lp = 700, lfo = 0.07, lfoDepth = 180 } | null (SoundEngine.pad's recipe)
   *   respectFx: follow Touch sounds (sound.fxOn). tau: level / frequency easing (s).
   *   fadeIn: master fade-in of each build (s). send: reverb send. noiseSecs: noise buffer length.
   */
  constructor(sound, { layers = {}, pad = null, respectFx = true, tau = 0.6, fadeIn = 1, send = 1, noiseSecs = 4 } = {}) {
    this.sound = sound;
    this.respectFx = !!respectFx;
    this.tau = Math.max(0.01, num(tau, 0.6));
    this.fadeIn = Math.max(0.01, num(fadeIn, 1));
    this.send = send;
    this.noiseSecs = +noiseSecs > 0 ? +noiseSecs : 4;
    this.layers = {};
    this._levels = {}; this._freq = {};      // targets (0..1, Hz)
    this._sent = {}; this._fsent = {};       // what the live graph was last told
    this._rampEnd = {};                       // ctx time a ramp() ends (tick leaves the layer alone until then)
    for (const name of Object.keys(layers)) {
      if (name === 'pad' || !layers[name]) continue;
      const L = layers[name];
      this.layers[name] = Object.freeze({
        type: L.type || 'bandpass', f: hz(L.f, 800), q: Math.max(0.0001, num(L.q, 0.7)), peak: Math.max(0, num(L.peak, 0)),
        lfo: Math.max(0, num(L.lfo, 0)), depth: clamp(num(L.depth, 0), 0, 1), color: COLORS.includes(L.color) ? L.color : 'brown',
      });
      this._levels[name] = 0; this._freq[name] = this.layers[name].f;
    }
    this.padSpec = pad ? Object.freeze({
      root: +pad.root > 0 ? +pad.root : VOICES.loomi.root, peak: Math.max(0, num(pad.peak, 0.035)),
      lp: hz(pad.lp, 700), lfo: Math.max(0, num(pad.lfo, 0.07)), lfoDepth: Math.max(0, num(pad.lfoDepth, 180)),
    }) : null;
    if (this.padSpec) { this._levels.pad = 0; this._freq.pad = this.padSpec.lp; }
    for (const k in this._levels) { this._sent[k] = 0; this._fsent[k] = this._freq[k]; this._rampEnd[k] = 0; }
    this.v = null;            // the live voice
    this._ac = null;          // its AudioContext
    this._nodes = NO_NODES;   // name → { g, f, peak } of the live graph
    this._wanted = false;
    this._last = -Infinity;
    this._timer = 0;
    this.builds = 0;
  }

  /** Target levels { [layer | 'pad']: 0..1 }; unknown names are ignored. Applied by tick(). */
  set(levels) {
    for (const k in levels) {
      if (!Object.hasOwn(this._levels, k)) continue;
      const v = +levels[k];
      if (v === v) this._levels[k] = clamp(v, 0, 1);
    }
  }

  /** Filter centre of a layer, or the pad's lowpass ('pad'); eased with tau by tick(). */
  setFreq(name, f) {
    if (Object.hasOwn(this._freq, name) && +f > 0) this._freq[name] = clamp(+f, 20, 20000);
  }

  /** One linear ramp to `level` over `secs` (a breath swell); it becomes the layer's target. */
  ramp(name, level, secs) {
    if (!Object.hasOwn(this._levels, name)) return;
    const lv = clamp(+level || 0, 0, 1);
    this._levels[name] = lv;
    const n = this.v ? this._nodes[name] : null;
    if (!n) return;   // not built: the next build starts at this level
    const t = this._ac.currentTime, p = n.g.gain, end = t + Math.max(0.02, +secs || 0);
    hold(p, t); p.linearRampToValueAtTime(lv * n.peak, end);
    this._sent[name] = lv; this._rampEnd[name] = end;
  }

  want(on) { this._wanted = !!on; }

  /** Reconcile (at most every 100 ms): build when wanted and the sound is ready, fade out when not, ease levels. */
  tick(nowMs = performance.now()) {
    if (nowMs - this._last < 100) return;
    this._last = nowMs;
    const s = this.sound;
    if (this.v && s.ctx !== this._ac) { this.v = null; this._nodes = NO_NODES; }   // the context went away with the voice
    const ok = this._wanted && s.ready && (!this.respectFx || s.fxOn);
    if (ok && !this.v) {
      if (!this._buffersReady(s.ctx)) { this._prepare(s.ctx); return; }
      this._build();
    } else if (!ok && this.v && s.ready) this._drop(1.5);   // not ready: the engine already stopped it
    if (this.v) this._update();
  }

  get alive() { return !!this.v; }
  get wanted() { return this._wanted; }
  /** The live targets (read only). */
  get levels() { return this._levels; }

  end(fadeS = 1.5) {
    this.want(false);
    if (this._timer) { clearTimeout(this._timer); this._timer = 0; }
    this._drop(fadeS);
  }

  destroy() { this.end(0.4); }

  debug() { return { alive: this.alive, wanted: this._wanted, builds: this.builds, levels: { ...this._levels } }; }

  // ------------------------------------------------------------ internals --
  _buffersReady(ac) {
    for (const k in this.layers) if (!cached(ac, this.noiseSecs, this.layers[k].color)) return false;
    return true;
  }

  _prepare(ac) {
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = 0;
      for (const k in this.layers) noiseBuffer(ac, this.noiseSecs, this.layers[k].color);
    }, 0);
  }

  _build() {
    const s = this.sound, c = s.ctx;
    s._room();
    const v = s._voice(600, { send: this.send, keep: true }), t = v.t;
    const og = v.out.gain;
    og.value = 0; og.setValueAtTime(0, t); og.linearRampToValueAtTime(1, t + this.fadeIn);
    const nodes = {};
    // every gain starts at its target: the master fade-in covers the start
    for (const name in this.layers) {
      const L = this.layers[name], buf = noiseBuffer(c, this.noiseSecs, L.color);
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; src.loop = true;
      f.type = L.type; f.frequency.value = this._freq[name]; f.Q.value = L.q;
      g.gain.value = this._levels[name] * L.peak;
      src.connect(f); f.connect(g);
      if (L.lfo > 0 && L.depth > 0) {   // amplitude LFO: 1 − depth/2 ± depth/2
        const am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
        am.gain.value = 1 - L.depth / 2; lfo.type = 'sine'; lfo.frequency.value = L.lfo; lg.gain.value = L.depth / 2;
        lfo.connect(lg); lg.connect(am.gain); g.connect(am); am.connect(v.out);
        lfo.start(t); v.srcs.push(lfo); v.nodes.push(am, lfo, lg);
      } else g.connect(v.out);
      src.start(t, Math.random() * buf.duration);
      v.srcs.push(src); v.nodes.push(src, f, g);
      nodes[name] = { g, f, peak: L.peak };
    }
    const P = this.padSpec;
    if (P) {
      const g = c.createGain(), f = c.createBiquadFilter();
      g.gain.value = this._levels.pad * P.peak;
      f.type = 'lowpass'; f.frequency.value = this._freq.pad; f.Q.value = 0.4;
      g.connect(f); f.connect(v.out);
      [P.root * 0.25, P.root * 0.25 * st(7), P.root * 0.5 * 1.003].forEach((fr, i) => {
        const o = c.createOscillator(), og2 = c.createGain();
        o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = fr; og2.gain.value = i === 2 ? 0.25 : 0.5;
        o.connect(og2); og2.connect(g); o.start(t);
        v.srcs.push(o); v.nodes.push(o, og2);
      });
      if (P.lfo > 0 && P.lfoDepth > 0) {
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = P.lfo; lg.gain.value = P.lfoDepth;
        lfo.connect(lg); lg.connect(f.frequency); lfo.start(t);
        v.srcs.push(lfo); v.nodes.push(lfo, lg);
      }
      v.nodes.push(g, f);
      nodes.pad = { g, f, peak: P.peak };
    }
    // stopAll (mute, hidden), the voice cap or the resume purge: not alive; the next tick rebuilds.
    // Sources stop within 0.1 s like any killed voice (mute suspends the context 120 ms later,
    // and a voice still scheduled then would linger in `live`). An older voice still fading
    // out only has its fade shortened.
    v.kill = () => { if (this.v === v) this._drop(0.05, 0.1); else fadeOut(v, 0.05, 0.1); };
    this.v = v; this._ac = c; this._nodes = nodes; this.builds++;
    for (const k in this._levels) { this._sent[k] = this._levels[k]; this._fsent[k] = this._freq[k]; this._rampEnd[k] = 0; }
  }

  _update() {
    const t = this._ac.currentTime, tau = this.tau;
    for (const name in this._nodes) {
      const n = this._nodes[name], lv = this._levels[name], f = this._freq[name];
      if (this._rampEnd[name] <= t && Math.abs(lv - this._sent[name]) > 1e-3) { n.g.gain.setTargetAtTime(lv * n.peak, t, tau); this._sent[name] = lv; }
      if (Math.abs(f - this._fsent[name]) > 1e-3) { n.f.frequency.setTargetAtTime(f, t, tau); this._fsent[name] = f; }
    }
  }

  _drop(fade, stopIn) {
    const v = this.v;
    if (!v) return;
    this.v = null; this._nodes = NO_NODES;
    v.end(fadeOut(v, fade, stopIn));
  }
}
