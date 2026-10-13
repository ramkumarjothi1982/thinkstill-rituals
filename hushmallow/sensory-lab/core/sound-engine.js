// Sound Engine — sensory sounds for squeezing, stretching and touching a Mallow.
//
// Everything is synthesised with Web Audio (no files, no paid APIs). Rules
// carried over from the main app's engine (src/engine/audio.js):
//   • nothing exists until unlock() is called from a user gesture; nothing
//     ever plays on page load
//   • gentle: soft attacks, a lowpass + compressor on the master, no bright
//     transients; every gain ramps from and to zero (no clicks)
//   • no leaks: one-shots disconnect when they end; voices are capped and
//     identical sounds are rate-limited; continuous sounds always fade out
// Material sounds follow the material's `sound` profile; Mallow voices use
// the same root notes and scales as each Mallow's kit in the main app, so a
// Mallow sounds like itself in both places. Settings live in the Sensory
// Lab's own namespace and never touch the main app's sound preference.

import { clamp } from './math.js';

// root Hz and scale (semitones) per Mallow: mirrors KITS in src/engine/audio.js
export const VOICES = {
  glitzi: { root: 466.16, scale: [0, 3, 5, 7, 10], wave: 'square', bright: 0.35 },
  blubi: { root: 698.46, scale: [0, 2, 4, 7, 9], wave: 'sine', bright: 0.2 },
  zuzu: { root: 392, scale: [0, 2, 3, 7, 8], wave: 'triangle', bright: 0.3 },
  boppo: { root: 329.63, scale: [0, 2, 4, 7, 9], wave: 'triangle', bright: 0.45 },
  pipzi: { root: 783.99, scale: [0, 2, 4, 7, 9], wave: 'triangle', bright: 0.5 },
  loomi: { root: 196, scale: [0, 2, 4, 7, 9], wave: 'sine', bright: 0.15 },
  noomi: { root: 523.25, scale: [0, 2, 4, 7, 9], wave: 'sine', bright: 0.1 },
};

const st = (s) => Math.pow(2, s / 12);
const MAX_VOICES = 24;
const MIN_GAP = 0.04;

export class SoundEngine {
  constructor({ volume = 0.7, muted = false } = {}) {
    this.volume = volume;
    this.muted = muted;
    this.ctx = null;
    this.live = new Set();
    this.lastAt = new Map();
    this.noteIdx = 0;
    this._vis = () => this._visibility();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this._vis);
  }

  /** Call from a user gesture. Safe to call often. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {}); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { try { this.ctx = new AC(); } catch { return; } }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500; lp.Q.value = 0.5;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.2;
    this.bus = c.createGain();
    this.bus.connect(lp); lp.connect(comp); comp.connect(this.master); this.master.connect(c.destination);
    // small soft room
    this.verb = c.createConvolver();
    this.verb.buffer = this._impulse(1.1);
    this.verbSend = c.createGain(); this.verbSend.gain.value = 0.16;
    this.verbSend.connect(this.verb); this.verb.connect(lp);
    this.noise = this._noiseBuffer(1.5);
    // iOS: a silent buffer inside the gesture fully unlocks output
    try { const b = c.createBuffer(1, 1, c.sampleRate); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(); } catch { /* ignore */ }
    if (c.state === 'suspended') c.resume().catch(() => {});
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running' && !this.muted; }

  setMuted(b) {
    this.muted = !!b;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, t, 0.04);
    if (this.muted) this.stopAll();
  }

  setVolume(v) {
    this.volume = clamp(+v || 0, 0, 1);
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
  }

  _visibility() {
    if (!this.ctx) return;
    if (document.hidden) { this.stopAll(); this.ctx.suspend().catch(() => {}); } else this.ctx.resume().catch(() => {});
  }

  _ok(key) {
    if (!this.ready) return false;
    const t = this.ctx.currentTime;
    if (t - (this.lastAt.get(key) ?? -1) < MIN_GAP) return false;
    this.lastAt.set(key, t);
    if (this.live.size >= MAX_VOICES) { const [old] = this.live; old.kill?.(); }
    return true;
  }

  // ----------------------------------------------------------- primitives --
  _voice(dur, { pan = 0 } = {}) {
    const c = this.ctx, out = c.createGain();
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) { p.pan.value = clamp(pan, -1, 1); out.connect(p); p.connect(this.bus); p.connect(this.verbSend); }
    else { out.connect(this.bus); }
    const v = { out, nodes: [out, p].filter(Boolean), srcs: [], t: c.currentTime + 0.005 };
    v.kill = () => {
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.02);
      for (const s of v.srcs) { try { s.stop(t + 0.1); } catch { /* stopped */ } }
    };
    this.live.add(v);
    const done = () => {
      this.live.delete(v);
      for (const n of v.nodes) { try { n.disconnect(); } catch { /* ignore */ } }
    };
    v.end = (t) => { const last = v.srcs[v.srcs.length - 1]; if (last) last.onended = done; else setTimeout(done, (t - c.currentTime) * 1000 + 50); };
    v.dur = dur;
    return v;
  }

  /** Enveloped oscillator: frequency glide f0 → f1. */
  _tone(v, t, { f0, f1 = f0, dur = 0.2, type = 'sine', peak = 0.15, a = 0.008, vib = 0, vibRate = 6, lp = 0 }) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    let last = g;
    o.connect(g);
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); last = f; v.nodes.push(f); }
    last.connect(v.out);
    if (vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = vibRate; lg.gain.setValueAtTime(f0 * vib, t); lg.gain.exponentialRampToValueAtTime(0.01, t + dur);
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); v.srcs.push(l); v.nodes.push(l, lg);
    }
    v.out.gain.value = 1;
    o.start(t); o.stop(t + dur + 0.05);
    v.srcs.push(o); v.nodes.push(o, g);
    return o;
  }

  /** Filtered noise burst. */
  _noise(v, t, { dur = 0.2, f0 = 800, f1 = f0, q = 0.8, type = 'bandpass', peak = 0.1, a = 0.01 }) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(20, f0), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(v.out);
    s.start(t, Math.random() * 1); s.stop(t + dur + 0.05);
    v.srcs.push(s); v.nodes.push(s, f, g);
  }

  // ------------------------------------------------------ material sounds --
  /** Finger poke / tap on the surface. */
  poke(mat, intensity = 0.6, pan = 0) {
    if (!this._ok('poke')) return;
    const S = mat.sound, v = this._voice(0.3, { pan }), t = v.t;
    const f = 300 * S.pitch * (0.9 + intensity * 0.3);
    this._tone(v, t, { f0: f * 1.6, f1: f * 0.7, dur: 0.16 + S.wet * 0.08, peak: 0.1 + intensity * 0.06, a: 0.004, vib: S.wet * 0.04, vibRate: 14 });
    if (S.airy > 0.2) this._noise(v, t, { dur: 0.12, f0: 1800, f1: 700, q: 0.6, peak: 0.03 * S.airy });
    v.end(t + 0.3);
  }

  /** Compression: a soft "fwumph" whose depth follows how hard it was squeezed. */
  squish(mat, amount = 0.5, pan = 0) {
    if (!this._ok('squish')) return;
    const S = mat.sound, v = this._voice(0.5, { pan }), t = v.t;
    const a = clamp(amount, 0.1, 1);
    this._noise(v, t, { dur: 0.22 + a * 0.2, f0: 900 * S.pitch, f1: 220 * S.pitch, q: 0.7 + S.wet, peak: (0.05 + 0.09 * a) * S.squish, a: 0.03 });
    this._tone(v, t + 0.01, { f0: 210 * S.pitch, f1: 120 * S.pitch, dur: 0.25 + a * 0.15, peak: (0.06 + 0.08 * a) * (0.4 + S.wet), a: 0.02, vib: S.wet * 0.05, vibRate: 11 });
    v.end(t + 0.5);
  }

  /** Release: the spring back. Bigger stretch → bigger, wobblier boing. */
  release(mat, strength = 0.5, pan = 0) {
    if (!this._ok('release')) return;
    const S = mat.sound, v = this._voice(0.8, { pan }), t = v.t;
    const s = clamp(strength, 0.05, 1);
    const f = 260 * S.pitch;
    this._tone(v, t, { f0: f * (1.2 + s), f1: f * 0.85, dur: 0.25 + s * 0.35 * (0.4 + S.boing), type: 'sine', peak: 0.08 + 0.08 * s, a: 0.006, vib: 0.03 + S.boing * 0.07 * s, vibRate: 7 + S.boing * 6 });
    if (S.airy > 0.3) this._noise(v, t, { dur: 0.3, f0: 600, f1: 2400, q: 0.5, peak: 0.035 * S.airy * s });
    v.end(t + 0.8);
  }

  /** Landing on the floor. */
  impact(mat, strength = 0.5) {
    if (!this._ok('impact')) return;
    const S = mat.sound, v = this._voice(0.4), t = v.t;
    const s = clamp(strength, 0.1, 1);
    this._tone(v, t, { f0: 150 * S.pitch, f1: 70, dur: 0.18 + 0.1 * s, peak: 0.12 * s, a: 0.004 });
    this._noise(v, t, { dur: 0.12, f0: 500, f1: 180, type: 'lowpass', q: 0.5, peak: 0.06 * s * (0.5 + S.squish * 0.5) });
    v.end(t + 0.4);
  }

  /** The last little sigh as the material comes to rest. */
  settle(mat) {
    if (!this._ok('settle')) return;
    const S = mat.sound, v = this._voice(0.6), t = v.t;
    this._tone(v, t, { f0: 330 * S.pitch, f1: 300 * S.pitch, dur: 0.4, peak: 0.03, a: 0.05 });
    v.end(t + 0.6);
  }

  /**
   * Continuous stretch creak. Returns {update(amount 0..1, speed), end()}.
   */
  stretch(mat) {
    if (!this.ready) return NOOP;
    const c = this.ctx, S = mat.sound, v = this._voice(10), t = v.t;
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = S.wet > 0.5 ? 'sine' : 'triangle';
    o.frequency.value = 160 * S.pitch;
    f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 2 + S.wet * 4;
    g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(v.out);
    const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = this.noise; n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 500; nf.Q.value = 3; ng.gain.value = 0;
    n.connect(nf); nf.connect(ng); ng.connect(v.out);
    o.start(t); n.start(t);
    v.srcs.push(o, n); v.nodes.push(o, g, f, n, nf, ng);
    let alive = true;
    const handle = {
      update: (amount, speed = 0) => {
        if (!alive || !this.ctx) return;
        const now = c.currentTime, a = clamp(amount, 0, 1), sp = clamp(speed, 0, 1);
        o.frequency.setTargetAtTime((140 + a * 260) * S.pitch, now, 0.05);
        f.frequency.setTargetAtTime(500 + a * 1500, now, 0.05);
        g.gain.setTargetAtTime(this.muted ? 0 : (0.015 + 0.05 * a) * (0.3 + sp * 0.7), now, 0.06);
        nf.frequency.setTargetAtTime(300 + a * 900, now, 0.05);
        ng.gain.setTargetAtTime(this.muted ? 0 : 0.03 * sp * (1 - S.wet * 0.6) * a, now, 0.04);
      },
      end: () => {
        if (!alive) return; alive = false;
        const now = c.currentTime;
        g.gain.setTargetAtTime(0, now, 0.04); ng.gain.setTargetAtTime(0, now, 0.03);
        try { o.stop(now + 0.3); n.stop(now + 0.3); } catch { /* ignore */ }
        v.end(now + 0.3);
      },
    };
    v.kill = handle.end;
    return handle;
  }

  /** Continuous soft brushing for strokes. Returns {update(speed 0..1), end()}. */
  brush() {
    if (!this.ready) return NOOP;
    const c = this.ctx, v = this._voice(10), t = v.t;
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = this.noise; n.loop = true; f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.7; g.gain.value = 0;
    n.connect(f); f.connect(g); g.connect(v.out); n.start(t);
    v.srcs.push(n); v.nodes.push(n, f, g);
    let alive = true;
    const handle = {
      update: (speed) => {
        if (!alive) return;
        const now = c.currentTime, s = clamp(speed, 0, 1);
        f.frequency.setTargetAtTime(700 + s * 1800, now, 0.05);
        g.gain.setTargetAtTime(this.muted ? 0 : 0.012 + s * 0.035, now, 0.05);
      },
      end: () => {
        if (!alive) return; alive = false;
        const now = c.currentTime; g.gain.setTargetAtTime(0, now, 0.06);
        try { n.stop(now + 0.4); } catch { /* ignore */ }
        v.end(now + 0.4);
      },
    };
    v.kill = handle.end;
    return handle;
  }

  // ---------------------------------------------------------- Mallow voice --
  /**
   * A Mallow's little voice. kind: tap | giggle | hum | surprise | content | boing | grumble | coo
   * Notes come from the Mallow's own scale and step around it, so repeated taps make melodies, not repeats.
   */
  voice(mallowId, kind = 'tap', intensity = 0.6) {
    if (!this._ok('voice:' + kind)) return null;
    const V = VOICES[mallowId] || VOICES.boppo;
    const v = this._voice(1.6), t = v.t;
    const I = clamp(intensity, 0, 1);
    const deg = (i) => V.root * st(V.scale[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5));
    const pk = 0.05 + 0.05 * I;
    const lp = 1800 + V.bright * 3000;
    const steps = [0, 2, 1, 3, 2, 4, 3, 1];
    switch (kind) {
      case 'tap': {
        const f = deg(steps[this.noteIdx++ % steps.length]);
        this._tone(v, t, { f0: f, f1: f * 0.985, dur: 0.22, type: V.wave, peak: pk, a: 0.006, lp });
        break;
      }
      case 'giggle':
        for (let i = 0; i < 4; i++) this._tone(v, t + i * 0.075, { f0: deg(2 + i), f1: deg(2 + i) * 1.04, dur: 0.1, type: V.wave, peak: pk * 0.85, a: 0.005, lp });
        break;
      case 'surprise':
        this._tone(v, t, { f0: deg(0), f1: deg(5), dur: 0.28, type: V.wave, peak: pk, a: 0.01, lp });
        break;
      case 'boing':
        this._tone(v, t, { f0: deg(4), f1: deg(0) * 0.9, dur: 0.35, type: 'sine', peak: pk, a: 0.006, vib: 0.06, vibRate: 9 });
        break;
      case 'content':
        this._tone(v, t, { f0: deg(2), f1: deg(2), dur: 0.25, type: 'sine', peak: pk * 0.8, a: 0.03 });
        this._tone(v, t + 0.2, { f0: deg(0), f1: deg(0) * 0.98, dur: 0.45, type: 'sine', peak: pk * 0.7, a: 0.04 });
        break;
      case 'coo':
        this._tone(v, t, { f0: deg(1) * 0.5, f1: deg(3) * 0.5, dur: 0.5, type: 'sine', peak: pk * 0.8, a: 0.08, vib: 0.01, vibRate: 5 });
        break;
      case 'hum':
        this._tone(v, t, { f0: V.root * 0.5, f1: V.root * 0.5, dur: 1.4, type: 'sine', peak: pk * 0.7, a: 0.25, vib: 0.006, vibRate: 4 });
        break;
      case 'grumble':
        this._tone(v, t, { f0: deg(1) * 0.5, f1: deg(0) * 0.42, dur: 0.35, type: 'triangle', peak: pk * 0.8, a: 0.02, lp: 900, vib: 0.03, vibRate: 13 });
        break;
      default: break;
    }
    v.end(t + 1.6);
    return true;
  }

  stopAll() { for (const v of [...this.live]) v.kill?.(); }

  dispose() {
    this.stopAll();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._vis);
    this.ctx?.close?.().catch?.(() => {});
    this.ctx = null;
  }

  /** Debug counters: `live` must return to 0 shortly after sounds stop. */
  debug() { return { state: this.ctx?.state || 'none', live: this.live.size, muted: this.muted, volume: this.volume }; }

  _noiseBuffer(secs) {
    const c = this.ctx, n = Math.floor(c.sampleRate * secs), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = (w * 0.5 + last * 3) * 0.5; }
    return b;
  }

  _impulse(secs) {
    const c = this.ctx, n = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    return b;
  }
}

const NOOP = { update() {}, end() {} };
