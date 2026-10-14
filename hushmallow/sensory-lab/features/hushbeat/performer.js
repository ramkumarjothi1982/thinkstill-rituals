// Hushbeat performer and scene: the music made visible, in character.
//
//   Performer (one per Mallow)  sings its own notes (the mouth follows each note's
//       envelope through the shared FaceMixer), glows with its hum, puffs its cheeks
//       with the bass, blushes at a harmony, breathes with the breath clock, and moves
//       to the beat in its own way (the groove, through rig.nudge). It reacts in
//       character (entrance, proud, leave: softened() for a gentle style or reduced
//       motion) and performs a replay: pokes where the tune was played, squeezes on
//       the bass, presses in on a hum.
//   Scene  the light around the Mallows (core/music-fx.js items drawn as one
//       EffectsLayer item: breath halo, floor glow, phrase ribbon, note beads, the
//       duet's harmony arc) and the realm, which warms and clears with the music
//       through the stage's Environment (s.env): mood, transform, a ripple at the
//       feet on a bass (≤ 1 a bar), one success pulse when a replay ends.
//   Cue  a fixed ring of engine events waiting for their moment: a scheduled event
//       is seen when it is heard (ev.t + output latency), a touch at once.
//
// Pure apart from the rig and the effects it is handed: no DOM, no timers, no
// allocation per frame (face values are quantised so the mixer only rewrites the
// override when something visibly changes).

import { FaceMixer } from '../../core/expression-engine.js';
import { softened } from '../../core/personality.js';
import { clamp, approach } from '../../core/math.js';
import { MUSIC } from '../../core/music-theory.js';
import { BeadPool, BeatGlow, PhraseRibbon, HarmonyArc, BreathHalo, POOL, RIBBON, ARC } from '../../core/music-fx.js';

const mod = (a, n) => ((a % n) + n) % n;
const alt = (n) => (mod(n, 2) === 0 ? 1 : -1);
const q2 = (v) => Math.round(v * 100) / 100;

/**
 * The Mallow's personality as an instrument (persona.setFilter while it performs here): a quick run of notes
 * is music, not tickling, so from the profile's tickle point on a tap answers with the Mallow's own groove
 * face, quietly (no reaction burst: the groove and the singing carry the movement), never giggly, grumpy,
 * pretend-annoyed or dizzy. Everything else passes unchanged. p: the persona's profile (persona.p).
 */
export function musicFilter(p, out, gesture, d = {}) {
  if (!out || gesture !== 'tap' || !(d.streak >= (p?.tickleAt ?? 4))) return out;
  return { mix: p?.groove?.mix || { happy: 0.7, playful: 0.3 }, i: 0.5, hold: 1, poke: Math.min(0.8, out.poke ?? 0.8), tag: 'tap-music' };
}

/**
 * Per Mallow (spec §4): groove style, singing face weights, entrance / proud / leave reactions
 * (rig reaction kinds, softened when gentle or reduced), the resting face, and extras:
 * proudMix (an expression with the proud reaction), proudFace (face params held for it),
 * float (how far a long hum lifts it).
 */
export const TRAITS = Object.freeze({
  boppo: Object.freeze({ groove: 'hop', sing: { open: 0.95, round: 0.15, skew: 0, blush: 0.8 }, entrance: 'hop', proud: 'success', leave: 'nod', rest: { happy: 0.4, calm: 0.6 } }),
  pipzi: Object.freeze({ groove: 'bounce', sing: { open: 0.9, round: 0.1, skew: 0, blush: 0.8 }, entrance: 'doubleTap', proud: 'celebrate', leave: 'nod', rest: { calm: 0.7, happy: 0.3 } }),
  blubi: Object.freeze({ groove: 'sway', sing: { open: 0.5, round: 0.85, skew: 0, blush: 1.3 }, entrance: 'doubleTap', proud: 'comfort', proudFace: { wet: 0.5 }, leave: 'comfort', rest: { loved: 0.5, calm: 0.5 } }),
  glitzi: Object.freeze({ groove: 'bob', sing: { open: 0.45, round: 0, skew: 0.7, blush: 0.6 }, entrance: 'glitchBurst', proud: 'tap', proudMix: { embarrassed: 0.5, happy: 0.5 }, leave: 'tap', rest: { proud: 0.5, calm: 0.5 } }),
  zuzu: Object.freeze({ groove: 'tilt', sing: { open: 0.6, round: 0.7, skew: 0, blush: 0.8 }, entrance: 'doubleTap', proud: 'doubleTap', leave: 'nod', rest: { calm: 0.6, curious: 0.4 } }),
  loomi: Object.freeze({ groove: 'lean', sing: { open: 0.18, round: 0.2, skew: 0, blush: 0.6 }, entrance: 'nod', proud: 'nod', leave: 'nod', rest: { calm: 1 }, float: 0.6 }),
  noomi: Object.freeze({ groove: 'drift', sing: { open: 0.4, round: 0.75, skew: 0, blush: 0.8 }, entrance: 'yawn', proud: 'nod', proudMix: { exhausted: 0.35, happy: 0.65 }, leave: 'yawn', rest: { calm: 0.5, exhausted: 0.5 }, float: 0.45 }),
});

/**
 * One beat of a groove (pure): rig.nudge() impulses for the beat that just began, scaled by k
 * (groove level × style), or null for a still beat. delay: s after the beat (Glitzi lags 60 ms).
 * A gentle style never hops (a squash instead). Reduced motion has no groove at all (the caller).
 */
export function grooveStep(style, { beat = 0, beatInBar = 0, bar = 0 } = {}, k = 1, { gentle = false } = {}, out = {}) {
  out.lean = 0; out.squash = 0; out.tilt = 0; out.hop = 0; out.delay = 0;
  const down = beatInBar === 0;
  switch (style) {
    case 'hop':      // Boppo: a small hop every 2 beats, a tiny squash between
      if (mod(beatInBar, 2) === 0) { if (gentle) out.squash = 0.12 * k; else { out.hop = 0.12 * k; out.squash = 0.03 * k; } } else out.squash = 0.05 * k;
      break;
    case 'bounce':   // Pipzi: a bounce on every beat, a tiny hop on the downbeat
      out.squash = 0.09 * k;
      if (down && !gentle) out.hop = 0.06 * k;
      break;
    case 'sway':     // Blubi: sways bar by bar
      if (down) out.lean = 0.16 * k * alt(bar); else out.squash = 0.03 * k;
      break;
    case 'bob':      // Glitzi: bobs a little behind the beat
      out.squash = 0.08 * k; out.delay = 0.06;
      break;
    case 'tilt':     // Zuzu: tilts left and right on alternate beats
      out.tilt = 0.22 * k * alt(beat); out.squash = 0.02 * k;
      break;
    case 'lean':     // Loomi: leans once every 2 bars
      if (!down || mod(bar, 2) !== 0) return null;
      out.lean = 0.12 * k * alt(Math.floor(bar / 2));
      break;
    case 'drift':    // Noomi: a slow sway each bar
      if (!down) return null;
      out.lean = 0.09 * k * alt(bar); out.tilt = 0.08 * k * alt(bar);
      break;
    default: return null;
  }
  return out;
}

// ------------------------------------------------------------------ cue --
/** A fixed ring of events waiting for their due time (seconds). drain() calls fn(ev, due) in arrival order. */
export class Cue {
  constructor(n = 64) { this.n = n; this.evs = new Array(n).fill(null); this.due = new Float64Array(n); this.len = 0; }

  /** Queue ev for `due`; when full, the oldest is handed to fn at once. */
  push(ev, due, fn) {
    if (this.len >= this.n) {
      const first = this.evs[0], d = this.due[0];
      for (let i = 1; i < this.len; i++) { this.evs[i - 1] = this.evs[i]; this.due[i - 1] = this.due[i]; }
      this.len--;
      fn(first, d);
    }
    this.evs[this.len] = ev; this.due[this.len] = due; this.len++;
  }

  drain(t, fn) {
    let w = 0;
    const n = this.len;
    for (let i = 0; i < n; i++) {
      const ev = this.evs[i], d = this.due[i];
      if (d <= t) fn(ev, d);
      else { this.evs[w] = ev; this.due[w] = d; w++; }
    }
    for (let i = w; i < n; i++) this.evs[i] = null;
    this.len = w;
  }

  clear() { for (let i = 0; i < this.len; i++) this.evs[i] = null; this.len = 0; }
  get pending() { return this.len; }
}

// ------------------------------------------------------------ performer --
const MOUTH = new Set(['replay', 'answer', 'hello', 'cadence', 'shimmer']);   // the Mallow's own singing: beads from the mouth
const LEAN_MIX = Object.freeze({ calm: 0.6, loved: 0.4 });                     // a duet's bloom: leaning in together

export class Performer {
  /**
   * companion: its Companion (rig, director, restOverride and live gesture state);
   * pool: the scene's BeadPool; off: { x, y } this stage's offset in the effects layer (kept current by the feature);
   * color: the bead colour; tuning: { style }; now() in seconds.
   */
  constructor({ companion, slot = 0, pool = null, off = { x: 0, y: 0 }, color = '#ffffff', reduced = false, tuning = {}, now = () => performance.now() / 1000 }) {
    this.companion = companion;
    this.rig = companion.rig;
    this.id = this.rig.id;
    this.slot = slot;
    this.traits = TRAITS[this.id] || TRAITS.boppo;
    this.pool = pool; this.off = off; this.color = color; this.now = now;
    this.reduced = !!reduced;
    this.setTuning(tuning);
    this.tau = clamp((MUSIC[this.id]?.decay ?? 0.3) * 1.5, 0.2, 1);   // how long the mouth stays open after a note
    this.mix = new FaceMixer(this.rig, ['base', 'mode', 'event']);
    // the music replaces the rig's own breathing, idle bounce and floating notes
    this.mix.set('base', 'breath', 0).set('base', 'bounce', 0).set('base', 'fxNote', 0).apply();
    this.env = 0; this.pad = 0; this.padS = 0; this.bass = 0; this.bassS = 0; this.throb = 0; this.blushK = 0;
    this.groove = 0; this.lastBeat = null; this.quietUntil = -Infinity; this.burstBar = -Infinity;
    this.resting = false; this._restFace = null;
    this.strong = false;   // nothing audible: beads 1.4× stronger
    this.side = 1; this.roll = 0;
    this._mv = {}; this._pend = { at: Infinity, lean: 0, squash: 0, tilt: 0, hop: 0, beat: 0 };
    this._r = {};
    this.sq = false; this.press = false;   // a replay's squeeze / press is on
    this.watch = null; this.lookT = -Infinity; this.nodBar = -Infinity;
    this.nudges = 0; this.pokes = 0;
    const persona = companion.persona;
    this._filter = (out, g, d) => musicFilter(persona?.p, out, g, d);
    persona?.setFilter?.(this._filter);
    this.log = Array.from({ length: 16 }, () => ({ t: 0, beat: 0, at: 0 })); this.logN = 0;            // groove nudges
    this.seen = Array.from({ length: 16 }, () => ({ id: 0, t: 0, due: 0, at: 0, src: '', immediate: false })); this.seenN = 0;   // notes shown
  }

  setTuning({ style = null } = {}) { this.gentle = style === 'gentle'; this.gK = this.gentle ? 0.6 : style === 'playful' ? 1.2 : 1; }
  setReduced(b) { this.reduced = !!b; }
  setStrong(b) { this.strong = !!b; }

  // body rect in stage px, on its floor (a hop doesn't move the light around it)
  _rect() {
    const r = this.rig.bodyRect(this._r);
    r.bottom = this.rig.BASE; r.top = r.bottom - r.h; r.mid = r.bottom - r.h / 2;
    return r;
  }

  /** An engine event at its moment (the feature times it): at = now, due = when it was meant to be seen (s). */
  apply(ev, at = this.now(), due = ev.t) {
    switch (ev.kind) {
      case 'note': this._note(ev, at, due); break;
      case 'bend': if (ev.end) this.pool?.unbend(ev.id); else this.pool?.bend(ev.id, ev.hz); break;
      case 'duck': this.env *= 0.4; break;
      case 'bassOn': this.bass = 0.35 + 0.65 * (ev.amount || 0); if (ev.src === 'replay') this._squeeze(true); break;
      case 'bassSet': if (ev.amount != null) this.bass = 0.35 + 0.65 * ev.amount; break;
      case 'bassBeat': this.throb = Math.max(this.throb, ev.accent || 0.6); break;
      case 'bassOff': this.bass = 0; this._squeeze(false); break;
      case 'padOn': this.pad = ev.level ?? 0.8; if (ev.src === 'replay') this._press(true); break;
      case 'padOff': this.pad = 0; this._press(false); break;
      case 'harmony': this.blushK = 1; break;
      case 'replay': if (!ev.on) this.stopPerforming(); break;
      default:
    }
  }

  _note(ev, at, due) {
    const r = this._rect(), vel = ev.ghost ? 0.2 : clamp(ev.vel || 0, 0, 1);
    const fx = r.cx + clamp(ev.x01 || 0, -1, 1) * r.w * 0.42, fy = r.bottom - clamp(ev.y01 ?? 0.5, 0, 1) * r.h;
    let x = fx, y = fy;
    if (MOUTH.has(ev.src)) { x = r.cx; y = r.top + r.h * 0.48; }
    if (ev.src === 'chord') { this.roll = (this.roll + 1) % 3; x += (this.roll - 1) * 15; y -= (this.roll === 1 ? 10 : 0); }
    this.side = -this.side;
    if (this.pool) {
      const k = this.strong ? 1.4 : 1;
      this.pool.spawn({
        x: x + this.off.x, y: y + this.off.y, r: ev.ghost ? 5 : 6 + 8 * vel, a: Math.min(0.5, (ev.ghost ? 0.16 : 0.24 + 0.2 * vel) * k),
        color: this.color, drift: 8 * this.side, id: ev.id, hz: ev.hz || 0, slot: this.slot,
      });
    }
    if (ev.ghost) return;
    this.env = Math.max(this.env, 0.35 + 0.65 * Math.min(1, vel / 0.85));
    if (ev.immediate) this._face();   // a touch: the mouth opens in this very frame
    if (ev.src === 'replay' && this.rig.soft && !this._busy()) { this.rig.poke(fx, fy, 0.5); this.pokes++; }   // performs it where it was played
    const s = this.seen[this.seenN++ % 16];
    s.id = ev.id; s.t = ev.t; s.due = due; s.at = at; s.src = ev.src; s.immediate = !!ev.immediate;
  }

  _busy() { const c = this.companion; return !!(c.hold || c.sq || c.drag || c.stroking); }

  // a replayed bass: the Mallow squeezes itself; a replayed hum: it presses in (never over a live touch)
  _squeeze(on) {
    if (on && !this.sq && !this._busy()) { this.rig.setSqueeze?.(0.32); this.sq = true; }
    else if (!on && this.sq) { this.sq = false; if (!this.companion.sq && !this.companion.drag) this.rig.setSqueeze?.(0); }
  }

  _press(on) {
    if (on && !this.press && !this._busy() && this.rig.soft) {
      const r = this._rect();
      this.rig.setPress(r.cx, r.top + r.h * 0.34, 0.06);
      this.press = true;
    } else if (!on && this.press) { this.press = false; if (!this.companion.hold) this.rig.setPress?.(0, 0, 0); }
  }

  /** Let go of any replay squeeze or press now. */
  stopPerforming() { this._squeeze(false); this._press(false); }

  /**
   * Every frame. cs: clock.at() output; o: { playing (groove eases in over a bar, out over two),
   * resting, onsets1s, barS }.
   */
  frame(t, dt, cs, { playing = false, resting = false, onsets1s = 0, barS = 2.5 } = {}) {
    const rig = this.rig;
    rig.setInflate(cs.level * (this.reduced ? 0.4 : 0.8));   // the breath you can see
    this.env *= Math.exp(-dt / this.tau);
    if (this.env < 0.004) this.env = 0;
    this.padS = approach(this.padS, this.pad, this.pad > this.padS ? 0.32 : 0.45, dt);   // ~0.8 s in, ~1 s out
    this.bassS = approach(this.bassS, this.bass, 0.05, dt);
    this.throb *= Math.exp(-dt / 0.22);
    this.blushK *= Math.exp(-dt / 1.4);
    this._ons = onsets1s;
    this._face(resting, onsets1s);
    // the groove
    const B = Math.max(0.5, barS);
    this.groove = playing ? Math.min(1, this.groove + dt / B) : Math.max(0, this.groove - dt / (2 * B));
    const b = Math.floor(cs.beat + 1e-6);
    if (this.lastBeat == null || b < this.lastBeat || b > this.lastBeat + 2) this.lastBeat = b;   // first frame or a jump: resync
    else if (b !== this.lastBeat) { this.lastBeat = b; this._beat(t, b, cs, onsets1s); }
    const P = this._pend;
    if (t >= P.at) { P.at = Infinity; this._nudge(P, t, P.beat); }
    // duet: the idle one watches the other
    if (this.watch && this.env < 0.05 && !this.pad && !this.bass && t - this.lookT > 0.5) { this.lookT = t; rig.lookAtScreen(this.watch.x, this.watch.y); }
  }

  // the singing face: floors over whatever the Mallow is feeling; signature systems follow the music
  _face(resting = this.resting, onsets1s = this._ons || 0) {
    const S = this.traits.sing, e = this.env, hum = 0.22 * this.padS;
    this._min('mouthOpen', S.open * (e + hum));
    this._min('mouthRound', S.round * Math.max(e, hum));
    this._min('mouthSkew', S.skew * e);
    this._min('glow', this.padS > 0.01 ? 0.25 + 0.75 * this.padS : 0);
    this._min('cheekPuff', this.bassS > 0.01 ? 0.5 * this.bassS + 0.25 * this.throb : 0);
    this._min('blush', this.blushK > 0.01 ? 1 + S.blush * this.blushK : 0);
    if (this.traits.float) this._min('float', this.traits.float * this.padS);
    if (this.id === 'zuzu') this.mix.set('mode', 'spin', q2(resting ? 0.15 : 0.25 + 0.5 * clamp(onsets1s / 6, 0, 1)));
    if (this.id === 'glitzi') this.mix.set('mode', 'glitch', q2(resting ? 0.45 : 0.62 + 0.14 * e));   // < 0.8: no random bursts
    this.mix.apply();
  }

  _min(key, v) { this.mix.min('event', key, v > 0.005 ? q2(v) : null); }

  _beat(t, b, cs, onsets1s) {
    if (this.reduced || t < this.quietUntil || !this.rig.ready) return;
    if (this.watch && this.groove < 0.05 && cs.beatInBar === 0 && cs.bar - this.nodBar >= 2) {   // nods along on bar lines
      this.nodBar = cs.bar;
      this.rig.react(softened('nod', { gentle: this.gentle, reduced: this.reduced }));
      return;
    }
    if (this.groove < 0.05) return;
    const mv = grooveStep(this.traits.groove, { beat: b, beatInBar: cs.beatInBar, bar: cs.bar }, this.groove * this.gK, { gentle: this.gentle }, this._mv);
    if (mv) {
      if (mv.delay > 0) { const P = this._pend; P.at = t + mv.delay; P.lean = mv.lean; P.squash = mv.squash; P.tilt = mv.tilt; P.hop = mv.hop; P.beat = b; }
      else this._nudge(mv, t, b);
    }
    // Glitzi: a glitch burst at most once per 4 bars, on the downbeat of a busy bar
    if (this.id === 'glitzi' && cs.beatInBar === 0 && mod(cs.bar, 4) === 0 && this.groove > 0.6 && onsets1s >= 2 && cs.bar - this.burstBar >= 4) {
      this.burstBar = cs.bar;
      this.rig.react(softened('glitchBurst', { gentle: this.gentle, reduced: this.reduced }));
    }
  }

  _nudge(mv, t, beat) {
    this.rig.nudge(mv);
    this.nudges++;
    const L = this.log[this.logN++ % 16];
    L.t = t; L.beat = beat; L.at = this.now();
  }

  /** A personality reaction is playing: the groove pauses (default 300 ms) so the two never pile up. */
  suppress(ms = 300) { this.quietUntil = Math.max(this.quietUntil, this.now() + ms / 1000); }

  /** A rig reaction in character, made calmer for a gentle style; reduced motion maps it as gentle does (spec §8). */
  react(kind) {
    if (!kind) return;
    this.rig.react(softened(kind, { gentle: this.gentle || this.reduced, reduced: this.reduced }));
    this.suppress(700);
  }

  enter() { this.react(this.traits.entrance); }
  leave() { this.react(this.traits.leave); }
  /** After a replay: proud, in character. */
  proud() {
    const T = this.traits;
    this.react(T.proud);
    if (T.proudMix) this.companion.director?.play(T.proudMix, 0.6, 1.6);
    if (T.proudFace) this.rig.overlay?.('hb-proud', T.proudFace, 1.6);
  }

  /** Resting (40 s untouched): the Mallow's own resting face; the scene dims the light. */
  rest(on) {
    on = !!on;
    if (on === this.resting) return;
    this.resting = on;
    const c = this.companion;
    if (on) { this._restFace = { mix: this.traits.rest, i: 0.55 }; c.restOverride = this._restFace; }
    else if (c.restOverride === this._restFace) c.restOverride = null;
  }

  /** Duet: watch a point (this stage's px) while idle, nodding on bar lines; null stops. */
  listen(pt) { this.watch = pt || null; }

  /** Duet: a look at the other Mallow (a point in this stage's px): a friend arriving, a harmony. */
  glance(pt) {
    if (!pt || !this.rig.ready) return;
    this.rig.lookAtScreen(pt.x, pt.y);
    this.lookT = this.now();
  }

  /** Duet: two hums bloomed into one chord; lean in toward the other (dir +1 right, −1 left), softly content. */
  leanIn(dir = 1) {
    this.companion.director?.play(LEAN_MIX, 0.6, 2.2);
    if (!this.reduced && this.rig.ready) this.rig.nudge({ lean: 0.2 * Math.sign(dir) * this.gK });
    this.suppress(600);
  }

  /** The page went hidden: everything stops at once (nothing resumes on its own). */
  hush() {
    this.stopPerforming();
    this.groove = 0; this.env = 0; this.pad = 0; this.bass = 0; this.throb = 0;
    this._pend.at = Infinity; this.lastBeat = null;
  }

  debug() {
    const m = this.mix.out.min;
    return {
      slot: this.slot, mallow: this.id, groove: q2(this.groove), sing: q2(this.env), hum: q2(this.padS), bass: q2(this.bassS),
      resting: this.resting, performing: { squeeze: this.sq, press: this.press }, nudges: this.nudges, pokes: this.pokes,
      face: { mouthOpen: m.mouthOpen ?? 0, mouthRound: m.mouthRound ?? 0, mouthSkew: m.mouthSkew ?? 0, glow: m.glow ?? 0, cheekPuff: m.cheekPuff ?? 0, blush: m.blush ?? 0 },
      grooveLog: this._ring(this.log, this.logN), notes: this._ring(this.seen, this.seenN),
    };
  }

  _ring(arr, n) { const out = []; for (let i = Math.max(0, n - arr.length); i < n; i++) out.push({ ...arr[i % arr.length] }); return out; }

  destroy() {
    this.stopPerforming();
    this.rest(false);
    this.mix.clear();
    this.rig.setInflate(0);
    this.watch = null;
    const persona = this.companion.persona;
    if (persona && persona.filter === this._filter) persona.setFilter(null);
  }
}

// ---------------------------------------------------------------- scene --
export class Scene {
  /**
   * env: the stage's Environment (s.env); gate: the screen's FlashGate (also s.env.gate);
   * tone: 'light' | 'dark' surface; quality: lab tier. Add the scene to the EffectsLayer: it is one item.
   */
  constructor({ env = null, gate = null, tone = 'dark', reduced = false, quality = 'high', now = () => performance.now() / 1000 } = {}) {
    this.env = env; this.gate = gate; this.tone = tone; this.reduced = !!reduced; this.quality = quality; this.now = now;
    this.pool = new BeadPool({ cap: POOL[quality] || POOL.medium, tone, gate, reduced });
    this.cast = [];        // per slot: { performer, off, halo, glow, ribbon }
    this.arc = null;
    this.M = { agitation: 0, heaviness: 0, clarity: 0, warmth: 0 };   // the mood sent to the realm (reused)
    this.start = null;     // the realm's own mood when it mounted
    this.presence = 0; this.agS = 0; this.harmS = 0; this.padS = 0; this.bassS = 0;
    this.moodT = -Infinity; this.p = 0; this.bar = 0; this.lastBeat = null; this.rippleBar = -Infinity;
    this.success = null;   // { until } while a replay's success pulse waits for the flash budget
    this.strong = false;
    this.ripples = 0; this.successes = 0;
  }

  /**
   * list: [{ performer, off, color, accent }] by slot: color for the halo, floor glow and arc (the Mallow's glow),
   * accent for its trail (the beads take the performer's own colour). The lead's light stays when a friend comes or goes.
   */
  setPerformers(list) {
    const next = [];
    list.forEach((it, i) => {
      const old = this.cast[i];
      if (old && old.performer === it.performer) { next.push(old); return; }
      old?.halo.destroy();
      next.push({
        performer: it.performer, off: it.off || { x: 0, y: 0 },
        halo: new BreathHalo({ color: it.color, tone: this.tone }),
        glow: new BeatGlow({ color: it.color, tone: this.tone }),
        ribbon: new PhraseRibbon({ color: it.accent || it.color, tone: this.tone, max: RIBBON[this.quality] || RIBBON.medium, reduced: this.reduced }),
      });
    });
    for (let i = list.length; i < this.cast.length; i++) this.cast[i].halo.destroy();
    this.cast = next;
    this.arc = next.length > 1 ? (this.arc || new HarmonyArc({ color: list[1].color, tone: this.tone, segments: ARC[this.quality] || ARC.medium })) : null;
    if (this.arc) this.arc.color = list[1].color;   // a new friend: the arc takes its light
  }

  /** A finger stroking slot's stage: phase 'start' | 'move' | 'end', screen px of the effects layer. */
  stroke(slot, phase, x, y) {
    const rb = this.cast[slot]?.ribbon;
    if (!rb) return;
    if (phase === 'start') rb.clear();
    if (phase === 'end') rb.end(); else rb.push(x, y);
  }

  /** An engine event at its moment. */
  apply(ev) {
    const c = this.cast[ev.slot];
    switch (ev.kind) {
      case 'note': if (c && ev.src === 'phrase' && !ev.immediate && !ev.ghost) c.ribbon.bump(); break;
      case 'bassOn':
        c?.glow.kick(0.7, 0.3);
        if (c && this.bar !== this.rippleBar && this.env?.realm) {   // one ripple at the feet per bar at most
          this.rippleBar = this.bar;
          if (this.env.pulse('ripple', this._norm(c.glow.x, c.glow.y))) this.ripples++;
        }
        break;
      case 'bassBeat': c?.glow.kick(0.35 + 0.45 * (ev.accent || 0.5), 0.3); break;
      case 'harmony': if (this.arc && (!this.gate || this.gate.allow('arc'))) this.arc.pulse(1); else this.arc?.pulse(0.5); break;
      case 'bloom': this.arc?.hold(ev.on); break;
      case 'replay': if (!ev.on && ev.done) this.success = { until: this.now() + 1.2 }; break;
      default:
    }
  }

  _norm(x, y) {
    const L = this.layer;
    return { nx: clamp(x / (L?.W || 1), 0, 1), ny: clamp(y / (L?.H || 1), 0, 1) };
  }

  _place(c) {
    const rig = c.performer.rig, r = c.performer._rect(), o = c.off;
    const cx = o.x + r.cx, mid = o.y + r.mid, bottom = o.y + r.bottom;
    const r0 = Math.min(0.86 * r.h, Math.max(0.56 * r.w, 0.64 * r.h), 0.47 * (rig.W || 1e4));
    c.halo.place(cx, mid - 0.04 * r.h, r0);
    c.glow.place(cx, bottom + 0.015 * r.h, r.w);
  }

  /**
   * Every frame. stats: engine.stats(t); o: { state, groove (0..1, the performers'), }.
   * Ring alpha: listening 0.25 → playing up to 0.5 (groove or a hum) → resting 0.15.
   */
  frame(t, dt, cs, stats, { state = 'listening', groove = 0 } = {}) {
    const playing = state === 'playing' || state === 'replaying', resting = state === 'resting';
    this.bar = cs.bar;
    this.padS = approach(this.padS, stats.pad, stats.pad > this.padS ? 0.32 : 0.45, dt);
    this.bassS = approach(this.bassS, stats.bass, 0.08, dt);
    const ringA = resting ? 0.15 : state === 'replaying' ? 0.5 : playing ? 0.25 + 0.25 * Math.max(groove, this.padS) : 0.25;
    const b = Math.floor(cs.beat + 1e-6);
    const crossed = this.lastBeat != null && b === this.lastBeat + 1;
    this.lastBeat = b;
    for (const c of this.cast) {
      this._place(c);
      const P = c.performer;
      c.halo.set(cs.level, ringA);
      c.glow.base = resting ? 0.2 : playing ? 0.55 + 0.45 * groove : 0.35;
      c.glow.level = Math.max(P.bassS, 0.5 * P.padS);
      c.glow.boost = this.strong ? 1.4 : 1;
      // the floor glow swells on the beat (it carries the beat alone in reduced motion)
      if (crossed && playing) c.glow.kick(this.reduced ? 0.6 : 0.3 * groove, 0.3);
    }
    if (this.arc && this.cast.length > 1) {
      const a = this.cast[0].halo, z = this.cast[1].halo;
      this.arc.place(a.cx, a.cy - a.r0 * 0.6, z.cx, z.cy - z.r0 * 0.6);
    }
    this._mood(t, dt, stats, state, groove);
    // the world transforms with a long hum (solo) or a bloom (duet)
    const target = stats.bloom ? 0.8 : this.cast.length < 2 ? 0.5 * this.padS : 0;
    this.p = approach(this.p, target, target > this.p ? 1.2 : 1.6, dt);
    if (this.env?.realm) this.env.transform(this.p < 0.004 ? 0 : this.p);
    // one success pulse per finished replay, as soon as the flash budget allows (≤ 1.2 s)
    if (this.success && this.env?.realm && this.cast[0]) {
      const h = this.cast[0].halo;
      if (this.env.pulse('success', this._norm(h.cx, h.cy - h.r0 * 0.5))) { this.success = null; this.successes++; }
      else if (t > this.success.until) this.success = null;
    }
  }

  // realm mood (spec §10), eased back to the realm's own after 8 s of silence; sent ≤ every 500 ms
  _mood(t, dt, stats, state, groove) {
    const env = this.env;
    if (!env?.realm) return;
    if (!this.start) { const m = env.mood; if (!m) return; this.start = { ...m }; }
    const live = state === 'playing' || state === 'replaying';
    this.presence = approach(this.presence, live ? 1 : 0, live ? 1.5 : 3, dt);
    this.agS = approach(this.agS, Math.min(0.35, 0.4 * stats.onsets1s / 12), 0.8, dt);
    this.harmS = approach(this.harmS, Math.min(1, stats.harmony1s / 2), 0.6, dt);
    const S = this.start, p = this.presence, M = this.M;
    M.agitation = S.agitation + (this.agS - S.agitation) * p;
    M.clarity = S.clarity + (0.5 + 0.3 * groove + 0.15 * Math.max(this.padS, stats.bloom ? 1 : 0) - S.clarity) * p;
    M.warmth = S.warmth + (0.45 + 0.25 * this.bassS + 0.2 * this.padS + 0.1 * this.harmS - S.warmth) * p;
    M.heaviness = clamp(S.heaviness - 0.2 * groove * p, 0, 1);
    if (t - this.moodT >= 0.5) { this.moodT = t; env.setMood(M); }
  }

  setStrong(b) { this.strong = !!b; for (const c of this.cast) c.performer.setStrong(b); }

  setReduced(b) {
    this.reduced = !!b;
    this.pool.setReduced(b);
    for (const c of this.cast) { c.ribbon.setReduced(b); c.performer.setReduced(b); }
  }

  /** A lower tier: smaller pools (never larger). */
  setQuality(q) {
    this.quality = q;
    this.pool.setCap(POOL[q] || POOL.medium);
    for (const c of this.cast) c.ribbon.setMax(RIBBON[q] || RIBBON.medium);
    this.arc?.setSegments(ARC[q] || ARC.medium);
  }

  setTone(tone) {
    if (tone === this.tone) return;
    this.tone = tone; this.pool.tone = tone;
    for (const c of this.cast) { c.halo.setTone(tone); c.glow.tone = tone; c.ribbon.tone = tone; }
    if (this.arc) this.arc.tone = tone;
  }

  /** The page went hidden: the light settles (beads and trails go). */
  hush() { this.pool.clear(); for (const c of this.cast) c.ribbon.clear(); this.success = null; this.arc?.hold(false); }

  // ------------------------------------------------- EffectsLayer item --
  step(dt, L) {
    if (L) this.layer = L;
    for (const c of this.cast) { c.halo.step(dt); c.glow.step(dt); c.ribbon.step(dt); }
    this.pool.step(dt);
    this.arc?.step(dt);
    return !this.gone;
  }

  draw(g, L) {
    for (const c of this.cast) { c.glow.draw(g, L); c.halo.draw(g, L); }
    for (const c of this.cast) c.ribbon.draw(g, L);
    this.pool.draw(g, L);
    this.arc?.draw(g, L);
  }

  debug() {
    const c = this.cast[0];
    return {
      beads: this.pool.alive, ring: c ? +c.halo.alpha.toFixed(3) : 0, ringTarget: c ? c.halo.alphaT : 0, ringR: c ? Math.round(c.halo.r) : 0,
      glow: c ? +c.glow.alpha.toFixed(3) : 0, ribbon: c ? c.ribbon.n : 0, transform: +this.p.toFixed(3), presence: +this.presence.toFixed(3),
      mood: { ...this.M }, start: this.start ? { ...this.start } : null, ripples: this.ripples, successes: this.successes, successPending: !!this.success,
    };
  }

  destroy() {
    for (const c of this.cast) c.halo.destroy();
    this.pool.clear();
    this.cast = [];
    this.arc = null;
    this.gone = true;
  }
}
