// Music Audio — Hushbeat Symphony's sound renderer. It is the Music Engine's
// sink ({ ready, event(ev) → heard }): every musical event becomes sound in the
// instrument of the Mallow that played it (core/music-kits.js).
//
// Routing: every voice is a SoundEngine voice — sound._room(), then
// sound._voice(dur, { pan, dest: musicBus, send: kit.send, keep }) — so the
// master lowpass, compressor, volume, mute and the hidden-page stop apply to the
// music too, and the engine's 24-voice cap keeps the last word. musicBus is one
// GainNode into sound.bus: Visual only ramps it to 0 over 300 ms, and the first
// note of a visit eases it from 0.6 to 1 over 2 s, so nothing starts loud.
//
// Timing: a touch-started note is never delayed or mapped (currentTime + 5 ms).
// Scheduled events (grid notes, bar-line changes, throbs) map musical time
// (performance seconds) onto audio time through a smoothed offset, never
// earlier than now; the offset re-seeds after a jump of 30 ms or a context
// state change.
//
// Held layers (a bass, a hum, a bent note) are `keep` voices whose kill() ends
// their handle, so sound.stopAll() (mute, a hidden page) marks them gone, and
// reconcile(engine.layers()) brings them back after unmute while the gesture
// is still held. No Web Audio is touched at import time.

import { KITS, graph, hold, setTier, warmNoise } from './music-kits.js';
import { CAPS } from './music-engine.js';
import { MAX_VOICES } from './sound-engine.js';
import { clamp } from './math.js';

const LIVE_LIMIT = MAX_VOICES - 2;   // above this many live voices, the oldest music note gives way first
const SOFT = [0.6, 2];               // the visit's first note: the bus eases from 0.6 to 1 over 2 s
const mod = (a, n) => ((a % n) + n) % n;
const perfS = () => performance.now() / 1000;

export class MusicAudio {
  /** sound: the lab's SoundEngine; quality: 'high' | 'medium' | 'low'; now() in performance seconds; timers injectable. */
  constructor(sound, { quality = 'high', now = perfS, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) } = {}) {
    this.sound = sound;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.attached = true;
    this.disposed = false;
    this.parts = [null, null];          // engine Parts (mallowId, V, pan), by slot
    this.notes = new Map();             // note id → { v, slot, T, end, dur, vel, held: { v, h, alive } | null }
    this.layer = [{ bass: null, pad: null }, { bass: null, pad: null }];   // { v, h, alive, semi }
    this.bus = null;
    this._busCtx = null;
    this.offset = null;
    this._offT = 0;
    this._state = null;
    this.soft = false;
    this.breath = 0.5;
    this._killed = new WeakSet();
    this._warm = 0;
    this._disc = 0;
    this.capped = 0;
    this.setQuality(quality);
  }

  /** Sound can be heard now: attached (not Visual only), unlocked, not muted. */
  get ready() { return this.attached && !this.disposed && !!this.sound.ctx && this.sound.ready; }

  /** Which Mallow plays in a slot (an engine Part, read live: a re-keyed friend keeps working). */
  setPart(slot, part) { this.parts[slot === 1 ? 1 : 0] = part || null; }

  setQuality(q) { this.q = CAPS[q] ? q : 'high'; setTier(this.q); }

  // ------------------------------------------------------------ plumbing --
  _bus() {
    const c = this.sound.ctx;
    if (!c) return null;
    if (this._busCtx !== c) {
      this.bus = c.createGain();
      this.bus.gain.value = this.attached ? 1 : 0;
      this.bus.connect(this.sound.bus);
      this._busCtx = c; this.soft = false; this.offset = null;
      // noise for airs, beds and whooshes: built just after this gesture, never inside it
      this.clearTimer(this._warm);
      this._warm = this.setTimer(() => { if (this.sound.ctx === c && !this.disposed) warmNoise(c); }, 0);
    }
    return this.bus;
  }

  // the smoothed offset from musical time to audio time (half-life ≈ 1 s)
  _sync() {
    const c = this.sound.ctx, now = this.now(), raw = c.currentTime - now;
    if (this.offset == null || c.state !== this._state || Math.abs(raw - this.offset) > 0.03) this.offset = raw;
    else this.offset += (raw - this.offset) * (1 - Math.pow(0.5, Math.max(0, now - this._offT)));
    this._state = c.state; this._offT = now;
  }

  /** Audio time for an event: touch-started notes at once; the rest mapped, never in the past. */
  _when(ev) {
    const c = this.sound.ctx, floor = c.currentTime + 0.005;
    if (ev.immediate) return floor;
    this._sync();
    return Math.max(floor, ev.t + this.offset);
  }

  // Too many voices: the oldest music note gives way (≈ 60 ms fade), before the SoundEngine's own cap.
  _cap() {
    let own = 0, oldest = null;
    for (const v of this.sound.live) {   // insertion order: the first note found is the oldest
      if (v.music == null || this._killed.has(v)) continue;
      own++;
      if (!oldest && v.layer === 'note') oldest = v;
    }
    if (oldest && (own >= CAPS[this.q].total || this.sound.live.size >= LIVE_LIMIT)) {
      this._killed.add(oldest);
      oldest.kill();
      this.capped++;
    }
  }

  _voice(slot, dur, { pan = 0, send = 1, keep = false, layer = 'note' } = {}) {
    this._cap();
    this.sound._room();
    const v = this.sound._voice(dur, { pan: clamp(pan, -1, 1), dest: this.bus, send, keep });
    v.music = slot; v.layer = layer;
    return v;
  }

  _graph(v) { return graph(this.sound.ctx, v.out, (n, src) => { v.nodes.push(n); if (src) v.srcs.push(n); }); }

  // one-shots: the voice is done when the source that stops last has ended
  _finish(v, g) {
    const i = g.last ? v.srcs.indexOf(g.last) : -1;
    if (i >= 0 && i !== v.srcs.length - 1) { v.srcs.splice(i, 1); v.srcs.push(g.last); }
    v.end(g.end || this.sound.ctx.currentTime + 0.1);
  }

  // fade a note voice from T and stop it (never before it began, so it always ends cleanly)
  _fade(n, T, tau, stopAt) {
    const p = n.v.out.gain, end = Math.min(n.end, Math.max(stopAt, n.T + 0.01));
    hold(p, T);
    p.setTargetAtTime(0, T, Math.max(0.004, tau));
    for (const s of n.v.srcs) { try { s.stop(end); } catch { /* already stopped */ } }
    n.v.end(end);
    n.end = end;
  }

  _release(rec, T, fade = null, opts) {
    if (!rec?.alive) return;
    rec.alive = false;
    rec.v.end(rec.h.release(T, fade, opts));
  }

  _held(rec, v) {
    // a global stop (mute, hidden, the voice cap) ends the handle and marks it gone
    v.kill = () => { const t = this.sound.ctx.currentTime; this._release(rec, t, 0.06); };
    return rec;
  }

  _prune() {
    if (this.notes.size < 32) return;
    for (const [id, n] of this.notes) if (!this.sound.live.has(n.v) && !n.held?.alive) this.notes.delete(id);
  }

  _pan(part, x01 = 0) { return clamp((part.pan || 0) + clamp(+x01 || 0, -1, 1) * 0.3, -1, 1); }

  // ------------------------------------------------------------- events --
  /** Render one engine event. → true when a note will be heard. */
  event(ev) {
    if (!this.ready || ev.ghost) return false;
    const slot = ev.slot === 1 ? 1 : 0, part = this.parts[slot];
    if (!part || !this._bus()) return false;
    const kit = KITS[part.mallowId] || KITS.boppo, L = this.layer[slot];
    switch (ev.kind) {
      case 'note': return this._note(ev, slot, part, kit);
      case 'noteOff': return this._noteOff(ev);
      case 'bend': return this._bend(ev, slot, part, kit);
      case 'duck': return this._duck(ev);
      case 'bassOn': {
        const T = this._when(ev);
        this._release(L.bass, T, 0.05);
        const v = this._voice(slot, 60, { pan: part.pan || 0, send: kit.send * 0.4, keep: true, layer: 'bass' });
        L.bass = this._held({ v, h: kit.bass(this._graph(v), T, ev.hz, ev.amount), alive: true, semi: ev.semi }, v);
        this._soften(T);
        return true;
      }
      case 'bassSet':
        if (!L.bass?.alive) return false;
        L.bass.h.set(ev.hz || null, ev.amount ?? null, this._when(ev), ev.glide);
        if (ev.semi != null) L.bass.semi = ev.semi;
        return true;
      case 'bassBeat':
        if (!L.bass?.alive) return false;
        L.bass.h.beat(this._when(ev), ev.accent);
        return true;
      case 'bassOff': {
        if (!L.bass) return false;
        // Glitzi's step down: a 5th where that pitch is in a key without semitones, else an octave
        const V = part.V, step = V && V.shape !== 'spiral' && V.scale.includes(mod(L.bass.semi + 5, 12)) ? 2 ** (-7 / 12) : 0.5;
        this._release(L.bass, this._when(ev), ev.fade ?? null, { step });
        L.bass = null;
        return true;
      }
      case 'padOn': {
        const T = this._when(ev);
        this._release(L.pad, T, 0.15);
        const v = this._voice(slot, 60, { pan: part.pan || 0, send: kit.send, keep: true, layer: 'pad' });
        const h = kit.pad(this._graph(v), T, ev.hzs, ev.level, ev.bright);
        h.breathe(this.breath, T);
        L.pad = this._held({ v, h, alive: true }, v);
        this._soften(T);
        return true;
      }
      case 'padSet': {
        if (!L.pad?.alive) return false;
        const T = this._when(ev);
        L.pad.h.set(ev.hzs || null, ev.bright ?? null, T, ev.glide);
        if (ev.shimmer) L.pad.h.shimmer(T);
        L.pad.h.breathe(this.breath, T);
        return true;
      }
      case 'padOff':
        if (!L.pad) return false;
        this._release(L.pad, this._when(ev), ev.fade ?? null);
        L.pad = null;
        return true;
      default: return false;   // harmony, bloom, phraseEnd, replay: light, not sound
    }
  }

  _note(ev, slot, part, kit) {
    const c = this.sound.ctx, T = this._when(ev);
    const v = this._voice(slot, ev.dur, { pan: this._pan(part, ev.x01), send: kit.send, layer: 'note' });
    const g = this._graph(v), o = { dur: ev.dur, glideFrom: ev.glideFrom || 0, glide: ev.glide || 0, stutter: !!ev.stutter };
    if (ev.src === 'shimmer') kit.shimmer(g, T, ev.hz, ev.vel, o); else kit.note(g, T, ev.hz, ev.vel, o);
    this._finish(v, g);
    this._prune();
    this.notes.set(ev.id, { v, slot, T, end: g.end, dur: ev.dur, vel: ev.vel, held: null });
    this._soften(T);
    ev.heard = true; ev.audioT = T; ev.ctxNow = c.currentTime;   // for the log only
    return true;
  }

  // a stolen voice fades over 60 ms; one that has not started yet never sounds
  _noteOff(ev) {
    const n = this.notes.get(ev.id);
    if (!n) return false;
    this.notes.delete(ev.id);
    const T = this._when(ev), fade = ev.fade ?? 0.06;
    if (n.held) this._release(n.held, T, fade / 3, T + fade + 0.05);
    if (n.T >= T - 1e-3) { hold(n.v.out.gain, this.sound.ctx.currentTime); n.v.out.gain.setValueAtTime(0, this.sound.ctx.currentTime); this._fade(n, T, 0.004, n.T + 0.01); } else this._fade(n, T, fade / 3, T + fade + 0.05);
    return true;
  }

  // a bent note becomes a held voice (keep) that follows the finger, then snaps or hands off
  _bend(ev, slot, part, kit) {
    const n = this.notes.get(ev.id);
    if (!n) return false;
    const T = this._when(ev);
    if (ev.start && !n.held) {
      const v = this._voice(slot, 30, { pan: part.pan || 0, send: kit.send, keep: true, layer: 'glide' });
      const g = this._graph(v), h = kit.held(g, T, ev.hz, n.vel);
      // release(t, tau, stopAt): tau is the fade's time constant here (a kill passes 0.06)
      const rel = (t, tau = 0.02, stopAt = null) => h.release(t, tau, stopAt ?? t + 7 * tau + 0.02);
      n.held = this._held({ v, h: { release: rel, set: h.set, duck: h.duck }, alive: true }, v);
      this._fade(n, T, 0.01, T + 0.08);   // the plucked note gives way: a 25 ms cross-fade
      return true;
    }
    const H = n.held;
    if (!H?.alive) {
      if (ev.end === 'handoff') { this._fade(n, T, 0.04, T + 0.25); this.notes.delete(ev.id); }
      return false;
    }
    if (ev.end === 'snap') {
      H.h.set(ev.hz, T, ev.glide ?? 0.08);
      const tau = part.V?.decay ?? 0.3;
      this._release(H, T + 0.08, tau, T + Math.min(n.dur || 1, 0.08 + 6.9 * tau));
    } else if (ev.end === 'handoff') {
      this._release(H, T, 0.04, T + 0.25);
      this.notes.delete(ev.id);
    } else H.h.set(ev.hz, T, ev.glide ?? 0.03);
    return true;
  }

  // −9 dB in 60 ms, then the note lets go (a held bend too)
  _duck(ev) {
    const n = this.notes.get(ev.id);
    if (!n) return false;
    const T = this._when(ev);
    if (n.held?.alive) { n.held.alive = false; n.held.v.end(n.held.h.duck(T)); return true; }
    const p = n.v.out.gain;
    hold(p, T);
    p.setTargetAtTime(0.35, T, 0.02);
    p.setTargetAtTime(0, T + 0.06, 0.1);
    const end = Math.min(n.end, Math.max(T + 0.6, n.T + 0.01));
    for (const s of n.v.srcs) { try { s.stop(end); } catch { /* stopped */ } }
    n.v.end(end); n.end = end;
    return true;
  }

  _soften(T) {
    if (this.soft || !this.bus) return;
    this.soft = true;
    const p = this.bus.gain;
    hold(p, T);
    p.setValueAtTime(SOFT[0], T);
    p.linearRampToValueAtTime(1, T + SOFT[1]);
  }

  // -------------------------------------------------------------- state --
  /** Every frame (or so): the breath level opens and closes the hums; the clock offset is sampled. */
  frame(level) {
    this.breath = clamp(+level || 0, 0, 1);
    if (!this.ready || this._busCtx !== this.sound.ctx) return;
    this._sync();
    const t = this.sound.ctx.currentTime;
    for (const L of this.layer) if (L.pad?.alive) L.pad.h.breathe(this.breath, t);
  }

  /** After unmute (or Visual only off) while layers are held: bring them back. → layers restarted */
  reconcile(layers = []) {
    if (!this.ready || !this._bus()) return 0;
    const want = [{}, {}];
    for (const l of layers) if (l && (l.kind === 'pad' || l.kind === 'bass')) want[l.slot === 1 ? 1 : 0][l.kind] = l;
    let n = 0;
    const t = this.now(), now = this.sound.ctx.currentTime;
    for (const slot of [0, 1]) {
      for (const kind of ['pad', 'bass']) {
        const rec = this.layer[slot][kind], w = want[slot][kind];
        if (w && !rec?.alive && this.parts[slot]) {
          this.event(kind === 'pad'
            ? { kind: 'padOn', slot, t, immediate: true, hzs: w.hzs, semis: w.semis, level: w.level, bright: w.bright }
            : { kind: 'bassOn', slot, t, immediate: true, hz: w.hz, semi: w.semi, amount: w.amount });
          if (kind === 'pad' && w.shimmer) this.layer[slot].pad?.h.shimmer(now);
          n++;
        } else if (!w && rec?.alive) { this._release(rec, now, 0.15); this.layer[slot][kind] = null; }
      }
    }
    return n;
  }

  /** false = Visual only: the bus ramps to 0 over 300 ms and every voice ends. true brings sound back. */
  setAttached(b) {
    b = !!b;
    if (b === this.attached) return;
    this.attached = b;
    const c = this.sound.ctx;
    if (!c || !this.bus || this._busCtx !== c) return;
    const t = c.currentTime, p = this.bus.gain;
    hold(p, t);
    p.setTargetAtTime(b ? 1 : 0, t, 0.1);
    if (!b) this._endAll(0.3);
  }

  /** End every music voice (fade in seconds). */
  stopAll(fade = 0.15) { this._endAll(fade); }

  _endAll(fade) {
    const c = this.sound.ctx;
    if (c && this._busCtx === c) {
      const t = c.currentTime;
      for (const n of this.notes.values()) {
        if (n.held?.alive) this._release(n.held, t, fade / 3, t + fade + 0.05);
        if (this.sound.live.has(n.v)) this._fade(n, t, fade / 3, t + fade + 0.1);
      }
      for (const L of this.layer) { this._release(L.bass, t, fade); this._release(L.pad, t, fade); }
    }
    this.notes.clear();
    for (const L of this.layer) { L.bass = null; L.pad = null; }
  }

  /** Output latency in seconds, [0, 0.15] (scheduled events animate this much after their time). */
  outputLatency() {
    const c = this.sound.ctx;
    return c ? clamp(c.outputLatency || c.baseLatency || 0, 0, 0.15) : 0;
  }

  /** Live music voices (tagged v.music), not counting ones already fading out for the cap. */
  get voices() {
    let n = 0;
    for (const v of this.sound.live) if (v.music != null && !this._killed.has(v)) n++;
    return n;
  }

  debug() {
    return {
      ready: this.ready, attached: this.attached, voices: this.voices, notes: this.notes.size, capped: this.capped,
      layers: this.layer.map((L) => ({ bass: !!L.bass?.alive, pad: !!L.pad?.alive })),
      offset: this.offset == null ? null : +this.offset.toFixed(4), latency: +this.outputLatency().toFixed(3),
    };
  }

  /**
   * Leaving: held layers end over 150 ms; notes still ringing (the cadence) ring out, but are gone within
   * 2.5 s; then the bus disconnects. Nothing is rendered after this.
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearTimer(this._warm);
    const c = this.sound.ctx;
    if (c && this._busCtx === c) {
      const t = c.currentTime;
      for (const L of this.layer) { this._release(L.bass, t, 0.15); this._release(L.pad, t, 0.15); }
      for (const n of this.notes.values()) {
        if (n.held?.alive) this._release(n.held, t, 0.05, t + 0.2);
        if (this.sound.live.has(n.v) && n.end > t + 2.5) this._fade(n, t + 1.8, 0.15, t + 2.5);
      }
      const bus = this.bus;
      this._disc = this.setTimer(() => { try { bus.disconnect(); } catch { /* gone */ } }, 2700);
    }
    this.notes.clear();
    for (const L of this.layer) { L.bass = null; L.pad = null; }
    this.parts = [null, null];
  }
}
