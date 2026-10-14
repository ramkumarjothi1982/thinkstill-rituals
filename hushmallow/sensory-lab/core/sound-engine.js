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
export const MAX_VOICES = 24;
const MIN_GAP = 0.04;

export class SoundEngine {
  constructor({ volume = 0.7, muted = false } = {}) {
    this.volume = volume;
    this.muted = muted;
    this.trim = 1;          // session trim on top of the volume (Nightlight); 1 elsewhere
    this.resting = false;   // rest(): stay suspended across visibility changes until the next gesture
    this.ctx = null;
    this.live = new Set();
    this._evicted = new WeakSet();   // voices _room() already killed (they fade for a moment)
    this.lastAt = new Map();
    this.noteIdx = 0;
    this.voiceOn = true;   // the Mallow's little voice
    this.fxOn = true;      // touch / material sounds
    this._vis = () => this._visibility();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this._vis);
  }

  /** Call from a user gesture. Safe to call often; does nothing while muted or outside a gesture. */
  unlock() {
    if (this.muted || !inGesture()) return;
    this.resting = false;
    if (this.ctx) { this._resume(); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { try { this.ctx = new AC(); } catch { return; } }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this._gain();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500; lp.Q.value = 0.5;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.2;
    this.bus = c.createGain();
    this.bus.connect(lp); lp.connect(comp); comp.connect(this.master); this.master.connect(c.destination);
    // small soft room. The noise and reverb buffers take tens of ms to build on
    // a slow phone, so they're made just after this gesture, not inside it (the
    // first tap's timing must not include them); until then sounds skip noise.
    this.verb = c.createConvolver();
    this.verbSend = c.createGain(); this.verbSend.gain.value = 0.16;
    this.verbSend.connect(this.verb); this.verb.connect(lp);
    this.noise = null;
    setTimeout(() => {
      if (this.ctx !== c) return;
      this.noise = this._noiseBuffer(1.5);
      this.verb.buffer = this._impulse(1.1);
    }, 0);
    // iOS: a silent buffer inside the gesture fully unlocks output
    try { const b = c.createBuffer(1, 1, c.sampleRate); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(); } catch { /* ignore */ }
    this._resume();
  }

  // Resume from 'suspended' (or WebKit's 'interrupted'). While a resume started
  // inside a gesture is pending, sounds are still scheduled: they start the
  // moment the context runs, so the first touch is not silent.
  _resume() {
    const c = this.ctx;
    if (!c || c.state === 'running' || c.state === 'closed' || document.hidden) return;
    // the cutoff is fixed by the first resume attempt of this suspension; later
    // attempts while it is pending (pointerup, touchend, click…) don't move it
    if (!this.pending) {
      this.pending = true;
      this.cut = performance.now();
      this.resuming = inGesture();
      c.resume().then(() => {
        this.pending = false; this.resuming = false;
        // voices queued before this gesture (where the browser can't tell us about
        // gestures) are stale: drop them rather than play them all at once
        for (const v of [...this.live]) if (v.born < this.cut - 50) v.kill?.();
      }, () => { this.pending = false; this.resuming = false; this.stopAll(); });
    } else if (inGesture()) this.resuming = true;
  }

  get ready() {
    const s = this.ctx?.state;
    return !this.muted && (s === 'running' || (this.resuming && s !== 'closed'));
  }

  setMuted(b) {
    this.muted = !!b;
    if (!this.muted) this.unlock();   // un-muting happens from a tap, which may start audio
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this._gain(), t, 0.04);
    if (this.muted) {
      this.stopAll();
      setTimeout(() => { if (this.muted && this.ctx?.state === 'running') this.ctx.suspend().catch(() => {}); }, 120);
    }
  }

  /** Comfort DNA: switch the Mallow's voice and the touch sounds independently. */
  setParts({ voice, fx } = {}) {
    if (voice != null) this.voiceOn = !!voice;
    if (fx != null) this.fxOn = !!fx;
  }

  setVolume(v) {
    this.volume = clamp(+v || 0, 0, 1);
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(this._gain(), this.ctx.currentTime, 0.04);
  }

  /** Session trim (0..1) on top of the volume; NaN or no value gives 1. */
  setTrim(k) {
    const n = k == null ? NaN : +k;
    this.trim = Number.isNaN(n) ? 1 : clamp(n, 0, 1);
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(this._gain(), this.ctx.currentTime, 0.08);
  }

  /** Stop everything and suspend; stays suspended (even on becoming visible) until the next unlock(). */
  rest() {
    this.resting = true;
    this.stopAll();
    if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
  }

  _gain() { return this.muted ? 0 : this.volume * this.trim; }

  _visibility() {
    if (!this.ctx) return;
    if (document.hidden) { this.stopAll(); this.ctx.suspend().catch(() => {}); }
    // a rest() that arrives while this resume is still pending must win
    else if (!this.muted && !this.resting) this.ctx.resume().then(() => { if (this.resting) this.ctx?.suspend().catch(() => {}); }, () => {});
  }

  _ok(key) {
    if (!this.ready) return false;
    const t = this.ctx.currentTime;
    if (t - (this.lastAt.get(key) ?? -1) < MIN_GAP) return false;
    this.lastAt.set(key, t);
    this._room();
    return true;
  }

  /** Make room under the voice cap: kill the oldest voice without `keep` (the
   *  oldest of all if every voice keeps), never one this already killed.
   *  Direct _voice() users call this first. */
  _room() {
    if (this.live.size < MAX_VOICES) return;
    let pick = null;
    for (const v of this.live) {
      if (this._evicted.has(v)) continue;
      if (!v.keep) { pick = v; break; }
      pick ||= v;
    }
    if (!pick) return;
    this._evicted.add(pick);
    pick.kill?.();
  }

  // ----------------------------------------------------------- primitives --
  // dest: where the voice goes instead of the bus (a feature sub-bus that ends in
  // the bus); send: reverb amount (1 direct, 0 none, else a per-voice gain);
  // keep: long-lived (beds, held layers), evicted last by _room().
  _voice(dur, { pan = 0, dest = null, send = 1, keep = false } = {}) {
    const c = this.ctx, out = c.createGain(), to = dest || this.bus;
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    let sg = null;
    if (p) {
      p.pan.value = clamp(pan, -1, 1); out.connect(p); p.connect(to);
      if (send === 1) p.connect(this.verbSend);
      else if (send > 0) { sg = c.createGain(); sg.gain.value = send; p.connect(sg); sg.connect(this.verbSend); }
    } else { out.connect(to); }
    const v = { out, nodes: [out, p, sg].filter(Boolean), srcs: [], t: c.currentTime + 0.005, born: performance.now(), keep: !!keep };
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
    if (!this.noise) return;
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
    if (!this.fxOn || !this._ok('poke')) return;
    const S = mat.sound, v = this._voice(0.3, { pan }), t = v.t;
    const f = 300 * S.pitch * (0.9 + intensity * 0.3);
    this._tone(v, t, { f0: f * 1.6, f1: f * 0.7, dur: 0.16 + S.wet * 0.08, peak: 0.1 + intensity * 0.06, a: 0.004, vib: S.wet * 0.04, vibRate: 14 });
    if (S.airy > 0.2) this._noise(v, t, { dur: 0.12, f0: 1800, f1: 700, q: 0.6, peak: 0.03 * S.airy });
    v.end(t + 0.3);
  }

  /** Compression: a soft "fwumph" whose depth follows how hard it was squeezed. */
  squish(mat, amount = 0.5, pan = 0) {
    if (!this.fxOn || !this._ok('squish')) return;
    const S = mat.sound, v = this._voice(0.5, { pan }), t = v.t;
    const a = clamp(amount, 0.1, 1);
    this._noise(v, t, { dur: 0.22 + a * 0.2, f0: 900 * S.pitch, f1: 220 * S.pitch, q: 0.7 + S.wet, peak: (0.05 + 0.09 * a) * S.squish, a: 0.03 });
    this._tone(v, t + 0.01, { f0: 210 * S.pitch, f1: 120 * S.pitch, dur: 0.25 + a * 0.15, peak: (0.06 + 0.08 * a) * (0.4 + S.wet), a: 0.02, vib: S.wet * 0.05, vibRate: 11 });
    v.end(t + 0.5);
  }

  /** Release: the spring back. Bigger stretch → bigger, wobblier boing. */
  release(mat, strength = 0.5, pan = 0) {
    if (!this.fxOn || !this._ok('release')) return;
    const S = mat.sound, v = this._voice(0.8, { pan }), t = v.t;
    const s = clamp(strength, 0.05, 1);
    const f = 260 * S.pitch;
    this._tone(v, t, { f0: f * (1.2 + s), f1: f * 0.85, dur: 0.25 + s * 0.35 * (0.4 + S.boing), type: 'sine', peak: 0.08 + 0.08 * s, a: 0.006, vib: 0.03 + S.boing * 0.07 * s, vibRate: 7 + S.boing * 6 });
    if (S.airy > 0.3) this._noise(v, t, { dur: 0.3, f0: 600, f1: 2400, q: 0.5, peak: 0.035 * S.airy * s });
    v.end(t + 0.8);
  }

  /** Landing on the floor. */
  impact(mat, strength = 0.5) {
    if (!this.fxOn || !this._ok('impact')) return;
    const S = mat.sound, v = this._voice(0.4), t = v.t;
    const s = clamp(strength, 0.1, 1);
    this._tone(v, t, { f0: 150 * S.pitch, f1: 70, dur: 0.18 + 0.1 * s, peak: 0.12 * s, a: 0.004 });
    this._noise(v, t, { dur: 0.12, f0: 500, f1: 180, type: 'lowpass', q: 0.5, peak: 0.06 * s * (0.5 + S.squish * 0.5) });
    v.end(t + 0.4);
  }

  /** The last little sigh as the material comes to rest. */
  settle(mat) {
    if (!this.fxOn || !this._ok('settle')) return;
    const S = mat.sound, v = this._voice(0.6), t = v.t;
    this._tone(v, t, { f0: 330 * S.pitch, f1: 300 * S.pitch, dur: 0.4, peak: 0.03, a: 0.05 });
    v.end(t + 0.6);
  }

  /**
   * Continuous stretch creak. Returns {update(amount 0..1, speed), end()}.
   */
  stretch(mat) {
    if (!this.ready || !this.fxOn) return NOOP;
    const c = this.ctx, S = mat.sound, v = this._voice(10), t = v.t;
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = S.wet > 0.5 ? 'sine' : 'triangle';
    o.frequency.value = 160 * S.pitch;
    f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 2 + S.wet * 4;
    g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(v.out);
    const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = this.noise || this._noiseBuffer(0.25); n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 500; nf.Q.value = 3; ng.gain.value = 0;
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
    if (!this.ready || !this.fxOn) return NOOP;
    const c = this.ctx, v = this._voice(10), t = v.t;
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = this.noise || this._noiseBuffer(0.25); n.loop = true; f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.7; g.gain.value = 0;
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
    if (!this.voiceOn || !this._ok('voice:' + kind)) return null;
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

  // ------------------------------------------------------ Pocket Hush --
  /** A breath: 'in' swells and brightens, 'out' sighs down. dur in seconds.
   *  Returns {end()} to fade it early (the next breath, or the moment closing). */
  breath(phase = 'in', dur = 4, intensity = 0.6, mallowId = 'loomi') {
    if (!this.fxOn || !this._ok('breath')) return NOOP;
    const V = VOICES[mallowId] || VOICES.loomi;
    const v = this._voice(dur + 1), t = v.t, I = clamp(intensity, 0, 1);
    const inhale = phase === 'in';
    this._noise(v, t, { dur: dur + 0.4, f0: inhale ? 260 : 950, f1: inhale ? 950 : 240, q: 0.9, peak: 0.02 + 0.03 * I, a: dur * (inhale ? 0.7 : 0.15) });
    this._tone(v, t, { f0: V.root * 0.5, f1: V.root * (inhale ? 0.5 * st(2) : 0.5), dur: dur + 0.6, type: 'sine', peak: 0.018 + 0.02 * I, a: dur * (inhale ? 0.6 : 0.2) });
    v.end(t + dur + 1);
    let alive = true;
    return {
      update() {},
      end: () => {
        if (!alive || !this.ctx) return; alive = false;
        const now = this.ctx.currentTime;
        v.out.gain.cancelScheduledValues(now); v.out.gain.setTargetAtTime(0, now, 0.15);
        for (const src of v.srcs) { try { src.stop(now + 0.8); } catch { /* already stopped */ } }
      },
    };
  }

  /** A soft bell on the Mallow's scale (step 0..9). */
  chime(mallowId = 'boppo', step = 0, intensity = 0.5) {
    if (!this.fxOn || !this._ok('chime' + step)) return;
    const V = VOICES[mallowId] || VOICES.boppo;
    const f = V.root * st(V.scale[step % 5] + 12 * Math.floor(step / 5));
    const v = this._voice(2), t = v.t, pk = 0.035 + 0.04 * clamp(intensity, 0, 1);
    this._tone(v, t, { f0: f, dur: 1.6, type: 'sine', peak: pk, a: 0.005 });
    this._tone(v, t, { f0: f * 2.76, dur: 0.7, type: 'sine', peak: pk * 0.28, a: 0.003 });
    this._tone(v, t, { f0: f * 5.4, dur: 0.35, type: 'sine', peak: pk * 0.12, a: 0.002 });
    v.end(t + 1.8);
  }

  /** A bubble or lantern letting go: a soft upward "bloop". pitch ≈ 0.7..1.4 */
  bubble(pitch = 1) {
    if (!this.fxOn || !this._ok('bubble')) return;
    const v = this._voice(0.5), t = v.t, f = 420 * clamp(pitch, 0.5, 2);
    this._tone(v, t, { f0: f, f1: f * 2.6, dur: 0.12, type: 'sine', peak: 0.07, a: 0.004 });
    this._tone(v, t + 0.06, { f0: f * 2, f1: f * 2.2, dur: 0.22, type: 'sine', peak: 0.025, a: 0.01 });
    v.end(t + 0.5);
  }

  /** Quiet ambient bed on the Mallow's root. Returns {alive, update(level 0..1), end()}.
   *  It is a silent no-op (alive false) before the first gesture or with touch sounds off. */
  pad(mallowId = 'loomi') {
    if (!this.ready || !this.fxOn) return NOOP;
    const V = VOICES[mallowId] || VOICES.loomi;
    const c = this.ctx, v = this._voice(600), t = v.t;
    const g = c.createGain(); g.gain.value = 0;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 0.4;
    g.connect(f); f.connect(v.out);
    const oscs = [V.root * 0.25, V.root * 0.25 * st(7), V.root * 0.5 * 1.003].map((hz, i) => {
      const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = hz;
      const og = c.createGain(); og.gain.value = i === 2 ? 0.25 : 0.5; o.connect(og); og.connect(g); o.start(t);
      v.nodes.push(o, og); v.srcs.push(o); return o;
    });
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(t); v.srcs.push(lfo); v.nodes.push(lfo, lg, g, f);
    let alive = true;
    const handle = {
      get alive() { return alive; },
      update: (level) => { if (alive) g.gain.setTargetAtTime(this.muted ? 0 : 0.035 * clamp(level, 0, 1), c.currentTime, 0.8); },
      end: () => {
        if (!alive) return; alive = false;
        const now = c.currentTime; g.gain.setTargetAtTime(0, now, 0.6);
        for (const o of [...oscs, lfo]) { try { o.stop(now + 3); } catch { /* ignore */ } }
        v.end(now + 3);
      },
    };
    handle.update(1);
    v.kill = handle.end;
    return handle;
  }

  /** A short closing motif in the Mallow's own scale: 'bright' rises, 'rest' settles. */
  motif(mallowId = 'boppo', kind = 'bright') {
    if (!this.voiceOn || !this._ok('motif')) return;
    const V = VOICES[mallowId] || VOICES.boppo;
    const steps = kind === 'rest' ? [4, 2, 0] : [0, 2, 4, 7];
    const v = this._voice(3), t = v.t;
    steps.forEach((n, i) => {
      const f = V.root * st(V.scale[n % 5] + 12 * Math.floor(n / 5));
      this._tone(v, t + i * (kind === 'rest' ? 0.32 : 0.16), { f0: f, dur: kind === 'rest' ? 1.1 : 0.7, type: 'sine', peak: 0.05, a: 0.01 });
    });
    v.end(t + 3);
  }

  stopAll() { for (const v of [...this.live]) v.kill?.(); }

  dispose() {
    this.stopAll();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._vis);
    this.ctx?.close?.().catch?.(() => {});
    this.ctx = null;
  }

  /** Debug counters: `live` must return to 0 shortly after sounds stop. */
  debug() {
    let keep = 0;
    for (const v of this.live) if (v.keep) keep++;
    return { state: this.ctx?.state || 'none', live: this.live.size, muted: this.muted, volume: this.volume, trim: this.trim, resting: this.resting, keep };
  }

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

/**
 * A Companion's `sound` option with its own character (Hushbeat, Nightlight).
 * An explicit object, never Object.create. fx scales the touch sounds (0 = none)
 * and is read at call time; `skip` silences named ones; voice(id, kind, i) maps
 * a voice to [kind, i] or null (silent); voice null forwards unchanged. The
 * global voice / touch-sound switches stay with lab.js, so setParts is a no-op.
 */
export function soundFacade(sound, { fx = 1, voice = null, skip = [] } = {}) {
  let k = Math.max(0, +fx || 0), map = typeof voice === 'function' ? voice : null;
  const off = (name) => k === 0 || skip.includes(name);
  const wrap = (h) => ({ update: (a, b) => h.update(a * k, b), end: () => h.end() });   // stretch(amount, speed) · brush(speed)
  return {
    unlock() { sound.unlock(); },
    get ready() { return sound.ready; },
    get muted() { return sound.muted; },
    setParts() {},
    poke(mat, i = 0.6, pan) { if (!off('poke')) sound.poke(mat, i * k, pan); },
    squish(mat, a = 0.5, pan) { if (!off('squish')) sound.squish(mat, a * k, pan); },
    release(mat, s = 0.5, pan) { if (!off('release')) sound.release(mat, s * k, pan); },
    impact(mat, s = 0.5) { if (!off('impact')) sound.impact(mat, s * k); },
    settle(mat) { if (!off('settle')) sound.settle(mat); },
    stretch(mat) { return off('stretch') ? NOOP : wrap(sound.stretch(mat)); },
    brush() { return off('brush') ? NOOP : wrap(sound.brush()); },
    voice(id, kind, i = 0.6) {
      if (!map) return sound.voice(id, kind, i);
      const r = map(id, kind, i);
      return r ? sound.voice(id, r[0], r[1]) : null;
    },
    setFx(v) { k = Math.max(0, +v || 0); },
    setVoice(fn) { map = typeof fn === 'function' ? fn : null; },
    get fx() { return k; },
  };
}

/** A Companion that moves and feels but makes no sound of its own (Hushbeat: the music is its voice). */
export const quietSound = (sound) => soundFacade(sound, { fx: 0, voice: () => null });

// Browsers only start audio after a user gesture (touch *pointerdown* and wheel
// don't count). navigator.userActivation.isActive is true for a few seconds after
// one; where the browser has no such API, unlock attempts go ahead as before.
function inGesture() {
  const ua = globalThis.navigator?.userActivation;
  return ua ? ua.isActive : true;
}
