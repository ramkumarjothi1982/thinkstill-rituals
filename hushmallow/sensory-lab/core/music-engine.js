// Music Engine — the conductor of Hushbeat Symphony (pure, Node-safe).
//
// Gestures come in as Part calls (from features/hushbeat/player.js); plain
// event objects go out, once per musical event (never per frame), to two
// renderers: the audio sink (core/music-audio.js) and the light and movement
// (performer, scene, effects). With no sink, or a sink that isn't ready,
// nothing changes: visual-only mode and the Node tests run the same music.
//
// Rules:
//   • a finger-started sound is never delayed: strikes happen at now();
//     only pitch and loudness are "quantised" at that moment (a chord tone
//     on a strong beat, a little louder near a beat)
//   • only continuations sit on the grid: phrase notes 2+, the chord roll,
//     bass throbs, chord changes, answers, replay and the cadence
//   • nothing sounding together ever forms a semitone or tritone (guard);
//     at most 14 onsets/s overall and one per 70 ms per Mallow (the rest are
//     visual-only ghosts); voice caps per tier; density-scaled velocity and
//     a summed-peak limiter keep rapid play soft
//
// Events (every one has kind, slot, t in performance seconds):
//   note     {id, semi, deg, hz, vel, dur, ring, src: live|phrase|chord|answer|replay|hello|cadence|shimmer,
//             x01, y01, immediate, ghost, glideFrom?, glide?, restrike?, stutter?, resolve?}
//            dur = how long the voice may live; ring = how long it counts as sounding
//   noteOff  {id, fade}                  a voice stolen for a newer note, or a queued one giving way
//                                        to live play (a voice that has not started by t never sounds)
//   bend     {id, hz, glide, start?, end?: 'snap' (+ semi, deg, ring) | 'handoff'}
//   duck     {id}                        −9 dB in 60 ms (a held glide also lets go)
//   bassOn   {hz, semi, amount, src?: 'replay'} · bassSet {hz?, semi?, amount?, glide} · bassBeat {accent} · bassOff {fade}
//   padOn    {hzs[3], semis[3], level, bright, from, src?: 'replay'} · padSet {hzs?, semis?, bright?, shimmer?, glide} · padOff {fade}
//   harmony  {a, b, interval} · bloom {on} · phraseEnd · replay {on, done?, stopped?}

import { clamp } from './math.js';
import {
  voiceFor, degSemi, nearestDeg, degOf, hz as hzOf, bassHz, chordAt, chordWith, isChordTone, ic, consonant,
  guardDeg, pickNote, harmoniseDeg, velocity, foldDeg, voicePad, leadPad, LAYER_PEAK, HARMONY_S,
} from './music-theory.js';
import { Take, softQuantise } from './music-time.js';

const mod = (a, n) => ((a % n) + n) % n;
export const CAPS = Object.freeze({ high: { part: 6, total: 16 }, medium: { part: 5, total: 13 }, low: { part: 4, total: 10 } });
export const MIN_GAP = 0.07;       // s between onsets per Mallow
export const MAX_RATE = 14;        // onsets in any second, all Mallows
export const PAD_TAIL = 1.0;       // s a released pad still counts as sounding
export const BASS_TAIL = 0.3;
export const BASE = Object.freeze({ live: 0.75, button: 0.7, phrase: 0.6, phraseBeat: 0.7, chord: 0.55, answer: 0.5, hello: 0.45, cadence: 0.55, shimmer: 0.35 });
const RECORD = new Set(['live', 'phrase', 'chord']);   // the person's own playing: recorded, and it cancels a pending answer
const REUSE_S = 0.15;              // a stroke reuses a contact note struck this recently
const DUCK = 0.35;                 // −9 dB
const MOVE_S = 0.15;               // phrase notes sound only while the finger keeps moving
const PAD_LEVEL = 0.8;
const ANSWER_GAP = 0.25, ANSWER_IDLE = 0.6;
export const REPLAY_LATE = 0.25;   // s a replay note may be late (a long frame) and still sound, at once; later it drops

/** The Music Engine. clock: BreathClock; scheduler: Scheduler; sink: { ready, event(ev) → heard } | null. */
export class MusicEngine {
  constructor({ clock, scheduler, now = null, sink = null, onEvent = null, quality = 'high', gentle = false, rand = Math.random } = {}) {
    this.clock = clock;
    this.scheduler = scheduler;
    this.now = now || (() => clock.now());
    this.sink = sink;
    this.onEvent = onEvent || (() => {});
    this.rand = rand;
    this.gentle = !!gentle;
    this.answers = true;
    this.setQuality(quality);
    this._parts = [null, null];
    this.notes = [];          // note records (pruned)
    this.onsets = [];         // onset times, all parts (pruned to ~1.5 s)
    this.harmonies = [];      // harmony times
    this.tails = [];          // released layers still ringing: { semis, t, end }
    this.take = new Take();
    this._id = 0;
    this._replay = null;
    this.lastAnswerT = -Infinity;
    this.lastMusicT = -Infinity;
    this.bloomOn = false;
    this._at = {};
    this._stats = { onsets1s: 0, bass: 0, pad: 0, bloom: false, harmony1s: 0, lastMusicT: -Infinity };
  }

  // ------------------------------------------------------------ parts --
  /** Slot 0 is the lead (it sets the key, progression and meter); slot 1 a friend in the lead's key. */
  part(slot, mallowId, { pan = 0 } = {}) {
    const s = slot === 1 ? 1 : 0;
    const old = this._parts[s];
    if (old && old.mallowId === mallowId) { old.pan = pan; return old; }
    if (old) this.removePart(s);
    const keyId = s === 0 ? mallowId : (this._parts[0]?.mallowId ?? mallowId);
    const p = new Part(this, s, mallowId, keyId, pan);
    this._parts[s] = p;
    if (s === 0) {
      this.clock.setMeter(p.V.meter);
      this._parts[1]?.rekey(mallowId);
    }
    return p;
  }

  /** A friend leaving: its layers fade over 0.6 s. */
  removePart(slot) {
    const p = this._parts[slot];
    if (!p) return;
    p._release(0.6);
    this._parts[slot] = null;
    this._checkBloom(this.now());
  }

  get parts() { return this._parts.filter(Boolean); }
  get replaying() { return !!this._replay; }
  /** Some layer (a hum or a bass) is held right now (no allocation: read every frame). */
  get holding() { const [a, b] = this._parts; return !!(a?.pad || a?.bass || b?.pad || b?.bass); }

  setQuality(q) { this.quality = CAPS[q] ? q : 'high'; this.caps = CAPS[this.quality]; }
  setGentle(b) { this.gentle = !!b; }
  setAnswers(b) { this.answers = !!b; if (!b) this._cancelAnswer(); }

  _other(p) { return this._parts[1 - p.slot]; }
  _find(id) {
    if (id == null) return null;
    for (let i = this.notes.length - 1; i >= 0; i--) if (this.notes[i].id === id) return this.notes[i];
    return null;
  }

  // ----------------------------------------------------------- output --
  _emit(ev) {
    let heard = false;
    if (!ev.ghost && this.sink) { try { heard = !!this.sink.event(ev); } catch (e) { console.error(e); } }
    if (!ev.ghost && ev.kind !== 'harmony' && ev.kind !== 'replay' && ev.kind !== 'phraseEnd') this.lastMusicT = Math.max(this.lastMusicT, ev.t);
    try { this.onEvent(ev); } catch (e) { console.error(e); }
    return heard;
  }

  // -------------------------------------------------- what's sounding --
  /**
   * Semis of everything sounding at any moment of [a, b): notes, layers (incl. the next bar's chord), tails.
   * except: a note record to leave out; skip: a Part whose layers to leave out (they are being re-voiced).
   */
  _sounding(a, b, except = null, skip = null) {
    const out = [];
    for (const n of this.notes) if (n !== except && n.t < b && a < n.end) out.push(n.semi);
    for (const p of this._parts) if (p && p !== skip) p._layerSemis(a, b, out);
    for (const tl of this.tails) if (tl.t < b && a < tl.end) for (const s of tl.semis) out.push(s);
    return out;
  }

  _sumLevel(t) {
    let s = 0;
    for (const n of this.notes) if (!n.stolen && n.t <= t + 0.15 && t < n.vEnd) s += n.peak * Math.exp(-Math.max(0, t - n.t) / n.tau);
    for (const p of this._parts) {
      if (!p) continue;
      if (p.pad) s += LAYER_PEAK.pad * p.pad.level;
      if (p.bass) s += LAYER_PEAK.bass * (0.35 + 0.65 * p.bass.amount);
    }
    return s;
  }

  _onsets1s(t) { let n = 0; for (const x of this.onsets) if (x > t - 1 && x <= t + 1e-9) n++; return n; }

  // ≥ 70 ms from this part's onsets, and no 1 s window would hold more than 14 onsets
  _rateOk(p, t) {
    for (const x of p.onsets) if (Math.abs(x - t) < MIN_GAP) return false;
    const ends = [t];
    for (const x of this.onsets) if (x > t && x < t + 1) ends.push(x);
    for (const x of ends) {
      let n = 1;
      for (const y of this.onsets) if (y > x - 1 && y <= x + 1e-9) n++;
      if (n > MAX_RATE) return false;
    }
    return true;
  }

  _voiceCount(t, slot) {
    let n = 0;
    for (const v of this.notes) if (!v.stolen && t < v.vEnd && (slot == null || v.slot === slot)) n++;
    if (slot == null) for (const p of this._parts) if (p) n += (p.pad ? 1 : 0) + (p.bass ? 1 : 0);
    return n;
  }

  // steal the oldest started melody voice (this part's first) until a new one fits the tier caps
  _makeRoom(p, t) {
    for (let guard = 0; guard < 64; guard++) {
      const mine = this._voiceCount(t, p.slot), total = this._voiceCount(t, null);
      if (mine < this.caps.part && total < this.caps.total) return true;
      let victim = null;
      const pick = (own) => {
        for (const n of this.notes) {
          if (n.stolen || n.held || n.t > t || t >= n.vEnd || (own && n.slot !== p.slot)) continue;
          if (!victim || n.t < victim.t) victim = n;
        }
      };
      pick(mine >= this.caps.part || mine > 0);
      if (!victim) pick(false);
      if (!victim) return false;
      this._steal(victim, t);
    }
    return false;
  }

  // noteOff: the voice fades out over 60 ms; one that has not started yet never sounds
  _steal(n, t) {
    n.stolen = true;
    const end = n.t > t ? n.t : t + 0.06;
    n.vEnd = Math.min(n.vEnd, end);
    n.end = Math.min(n.end, end);
    this._emit({ kind: 'noteOff', slot: n.slot, t, id: n.id, fade: 0.06 });
  }

  _prune(t) {
    if (this.notes.length > 48) this.notes = this.notes.filter((n) => n.held || n.vEnd > t - 1 || n.end > t - 1);
    if (this.onsets.length > 24) this.onsets = this.onsets.filter((x) => x > t - 1.5);
    if (this.harmonies.length > 16) this.harmonies = this.harmonies.filter((x) => x > t - 1.5);
    if (this.tails.length) this.tails = this.tails.filter((tl) => tl.end > t - 0.5);
  }

  // ------------------------------------------------- the birth of a note --
  /**
   * o: { mode: 'pick' (tap: pickNote) | 'deg' (a planned degree: guard only), deg, band01, src, base,
   *      immediate, harmonise, accent, lenK, x01, y01, glideFrom, glide, stutter, resolve }
   * → the note record, or null (a ghost when it was a touch, otherwise silently skipped)
   */
  _note(p, t, o) {
    this._prune(t);
    if (!this._rateOk(p, t)) return this._ghost(p, t, o);
    const nb = this.clock.nearest(t), bar = this.clock.barOf(t), chord = chordAt(p.V, bar), V = p.V;
    const vel = velocity({
      base: o.base, offsetMs: nb.offsetS * 1000, downbeat: nb.downbeat, accent: o.accent !== false,
      onsets1s: this._onsets1s(t), gentle: this.gentle, sumLevel: this._sumLevel(t), peak: V.peak,
    });
    if (vel < 0.05) return this._ghost(p, t, o);
    const dur = clamp((o.lenK ?? 1) * (0.15 + 3 * V.decay), 0.15, 4);
    const ring = Math.min(dur, Math.max(0.25, V.decay * Math.log(vel / 0.2)));
    const sounding = this._sounding(t, t + ring);
    let deg;
    if (o.mode === 'pick') deg = pickNote(V, p.st, { band01: o.band01, strong: nb.strong, chord, sounding, deg: o.deg, t }).deg;
    else deg = guardDeg(Math.round(o.deg), sounding, V, { chord });
    // a friend's note this close to the other Mallow's harmonises with it (3rd or 6th, else 5th or octave)
    let call = null;
    if (o.harmonise) {
      call = this._other(p)?._near(t);
      if (call) {
        deg = harmoniseDeg(call.semi, V, { sounding, near: degSemi(V.scale, deg) }).deg;
        if (o.mode === 'pick') { p.st.prev = deg; p.st.repeats = 1; }
      }
    }
    if (!this._makeRoom(p, t)) return this._ghost(p, t, o);
    const semi = degSemi(V.scale, deg);
    const n = {
      id: ++this._id, slot: p.slot, semi, deg, vel, t, dur, vEnd: t + dur, end: t + ring, tau: V.decay,
      peak: V.peak * vel, src: o.src, x01: o.x01 ?? 0, y01: o.y01 ?? 0.5, heard: false, stolen: false, held: false,
    };
    this.notes.push(n);
    this.onsets.push(t);
    p.onsets.push(t);
    if (p.onsets.length > 12) p.onsets.shift();
    p.lastNote = n;
    const ev = {
      kind: 'note', slot: p.slot, t, id: n.id, semi, deg, hz: hzOf(V, semi), vel, dur, ring, src: o.src,
      x01: n.x01, y01: n.y01, immediate: !!o.immediate, ghost: false,
    };
    if (o.glideFrom) { ev.glideFrom = o.glideFrom; ev.glide = o.glide; }
    else if (o.glide) ev.glide = o.glide;
    if (o.stutter) ev.stutter = true;
    if (o.resolve) ev.resolve = true;
    n.heard = this._emit(ev);
    if (call) {
      this.harmonies.push(t);
      this._emit({ kind: 'harmony', slot: p.slot, t, a: call.slot, b: p.slot, interval: ic(semi, call.semi) });
    }
    if (RECORD.has(o.src)) {
      this.take.barS = this.clock.barS;
      this.take.add({ beat: this.clock.at(t, this._at).beat, slot: p.slot, kind: 'n', deg, vel, x01: n.x01, y01: n.y01 }, t);
    }
    return n;
  }

  _ghost(p, t, o) {
    if (!o.immediate) return null;
    const V = p.V, semi = p.lastNote ? p.lastNote.semi : degSemi(V.scale, Math.round((V.tapLo + V.tapHi) / 2));
    this._emit({
      kind: 'note', slot: p.slot, t, id: null, semi, deg: nearestDeg(V.scale, semi), hz: hzOf(V, semi), vel: 0, dur: 0, ring: 0,
      src: o.src, x01: o.x01 ?? 0, y01: o.y01 ?? 0.5, immediate: true, ghost: true,
    });
    return null;
  }

  // -------------------------------------------------------- the beat --
  // one chain runs while any layer is held: bass throbs, chord changes at bar lines, shimmer
  _ensureBeat() {
    if (this.scheduler.has('beat')) return;
    const tb = this.clock.nextGrid(this.now(), 1);
    this.scheduler.at(tb, (t) => this._beat(t, false), 'beat', (t) => this._beat(t, true));
  }

  _beat(tb, late) {
    const nb = this.clock.nearest(tb), bar = this.clock.barOf(tb + 1e-6), t = late ? this.now() : tb;
    let any = false;
    for (const p of this._parts) {
      if (!p) continue;
      if (nb.beatInBar === 0) p._barChange(bar, t);
      if (!late) {
        p._flush(t);
        if (p.bass) this._emit({ kind: 'bassBeat', slot: p.slot, t, accent: nb.beatInBar === 0 ? 1 : nb.strong ? 0.75 : 0.55 });
        p._shimmer(t, nb.beatInBar, bar);
      }
      if (p.bass || p.pad) any = true;
    }
    if (!any) return;
    this.take.touch(t);
    const next = this.clock.nextGrid(late ? this.now() : tb, 1);
    this.scheduler.at(next, (x) => this._beat(x, false), 'beat', (x) => this._beat(x, true));
  }

  _checkBloom(t) {
    const on = !!(this._parts[0]?.pad && this._parts[1]?.pad);
    if (on === this.bloomOn) return;
    this.bloomOn = on;
    this._emit({ kind: 'bloom', slot: 0, t, on });
  }

  // ---------------------------------------------------------- answers --
  _cancelAnswer() { this.scheduler.cancel('answer'); }

  // the idle friend replays the call's last ≤ 4 degrees +2 (a diatonic third) in its own register
  _answer(from, notes, tEnd) {
    const to = this._other(from);
    if (!this.answers || !to || !notes.length) return;
    const t = this.now();
    if (to.pad || to.bass || to.phrase || to.glide?.held || t - to.lastOnset() < ANSWER_IDLE) return;
    const start = this.clock.nextGrid(Math.max(tEnd, t) + ANSWER_GAP - 1e-6, 1);
    if (start - this.lastAnswerT < 2 * this.clock.barS) return;
    this.lastAnswerT = start;
    const list = notes.slice(-4), at = this._at;
    const b0 = this.clock.at(list[0].t, at).beat, sb = Math.round(this.clock.at(start, at).beat);
    for (const c of list) {
      const rel = softQuantise(this.clock.at(c.t, at).beat - b0, to.V.grid, 0.75);
      const d = foldDeg(c.deg + 2, to.V.tapLo, to.V.tapHi);
      this.scheduler.at(this.clock.beatTime(sb + rel), (x) => {
        if (!this._parts.includes(to)) return;
        this._note(to, x, { mode: 'deg', deg: d, src: 'answer', base: BASE.answer, lenK: to.V.phrase.len, x01: 0, y01: (d - to.V.tapLo) / Math.max(1, to.V.tapHi - to.V.tapLo) });
      }, 'answer');
    }
  }

  // ---------------------------------------------------- whole engine --
  /** Lead and friend together, now: the lead strikes, the friend harmonises. → [idLead, idFriend] */
  together() {
    const a = this._parts[0], b = this._parts[1];
    if (!a) return [null, null];
    const ia = a.strike({ vel: BASE.button, y01: 0.6 });
    const ib = b ? b.strike({ vel: BASE.button, y01: 0.6 }) : null;
    return [ia, ib];
  }

  /**
   * Replay a take (events with beats from 0) at the current tempo, starting on the next beat,
   * soft-quantised 75 % toward each part's grid. Live play stays allowed; replay notes aren't recorded.
   */
  replay(events) {
    this._stopReplay();
    const list = (Array.isArray(events) ? events : []).filter((e) => e && this._parts[e.slot === 1 ? 1 : 0]).slice().sort((a, b) => a.beat - b.beat);
    if (!list.length) return { stop() {} };
    const t = this.now();
    this.take.cut();
    for (const p of this._parts) if (p) { p._padOff(t, 0.15, true); p._bassOff(t, 0.15, true); }
    const start = this.clock.nextGrid(t, 1);
    const R = { list, q: this._replayGrid(list), i: 0, sb: Math.round(this.clock.at(start, this._at).beat), end: 0 };
    list.forEach((e, i) => { R.end = Math.max(R.end, R.q[i] + (e.kind === 'n' ? 1 : Math.max(1, e.len || 1))); });
    this._replay = R;
    this._emit({ kind: 'replay', slot: 0, t, on: true });
    this._replayNext(R);
    return { stop: () => { if (this._replay === R) this._stopReplay(); } };
  }

  // each event's beat in the replay: soft-quantised 75 % toward its part's grid; a note that would land on top of
  // the previous one of the same part (a chord roll's 16ths on an 8th grid) takes a finer grid, else its own beat
  _replayGrid(list) {
    const prev = [null, null], gap = (MIN_GAP + 0.005) / this.clock.beatS;
    return list.map((e) => {
      const slot = e.slot === 1 ? 1 : 0, grid = this._parts[slot]?.V.grid ?? 2;
      let q = softQuantise(e.beat, grid, 0.75);
      if (e.kind !== 'n') return q;
      if (prev[slot] != null) {
        for (const d of [grid * 2, grid * 4]) { if (q - prev[slot] >= gap) break; q = softQuantise(e.beat, d, 0.75); }
        if (q - prev[slot] < gap) q = Math.max(q, e.beat);
      }
      prev[slot] = q;
      return q;
    });
  }

  _replayNext(R) {
    if (this._replay !== R) return;
    if (R.i >= R.list.length) {
      this.scheduler.at(this.clock.beatTime(R.sb + R.end), () => this._stopReplay(true), 'replay', () => this._stopReplay(true));
      return;
    }
    const e = R.list[R.i], q = R.q[R.i];
    const go = (x, late) => { R.i++; if (!late) this._replayEvent(R, e, q, x); this._replayNext(R); };
    // a replay note caught by a long frame still sounds (at once, up to REPLAY_LATE late): the tune keeps every note
    this.scheduler.at(this.clock.beatTime(R.sb + q), (x) => go(x, false), 'replay', (x) => go(x, true), REPLAY_LATE);
  }

  _replayEvent(R, e, q, t) {
    const p = this._parts[e.slot === 1 ? 1 : 0];
    if (!p) return;
    const y01 = e.y01 ?? (e.deg - p.V.tapLo) / Math.max(1, p.V.tapHi - p.V.tapLo);
    if (e.kind === 'n') {
      this._note(p, t, { mode: 'deg', deg: e.deg, src: 'replay', base: e.vel || 0.6, accent: false, x01: e.x01 ?? 0, y01 });
      return;
    }
    const off = this.clock.beatTime(R.sb + q + Math.max(1, e.len || 1));
    if (e.kind === 'b' && !p.bass) {
      p._bassOn(0.6, t, R);   // a bass follows the chord of the bar it sounds in, as it did live
      this.scheduler.at(off, (x) => { if (p.bass?.owner === R) p._bassOff(x, null, true); }, 'replay', () => { if (p.bass?.owner === R) p._bassOff(this.now(), null, true); });
    } else if (e.kind === 'h' && !p.pad) {
      p._padOn(degSemi(p.V.scale, e.deg), clamp(y01, 0, 1), null, R, t);
      this.scheduler.at(off, (x) => { if (p.pad?.owner === R) p._padOff(x, null, true); }, 'replay', () => { if (p.pad?.owner === R) p._padOff(this.now(), null, true); });
    }
  }

  _stopReplay(done = false) {
    const R = this._replay;
    if (!R) return;
    this._replay = null;
    this.scheduler.cancel('replay');
    const t = this.now();
    for (const p of this._parts) {
      if (!p) continue;
      if (p.bass?.owner === R) p._bassOff(t, 0.15, true);
      if (p.pad?.owner === R) p._padOff(t, 0.15, true);
    }
    this._emit({ kind: 'replay', slot: 0, t, on: false, ...(done ? { done: true } : { stopped: true }) });
  }

  /** End every layer and phrase, cancel queued continuations, answers and the replay (hidden page, leaving). */
  releaseAll() {
    const t = this.now();
    this._stopReplay();
    for (const tag of ['answer', 'cadence', 'beat']) this.scheduler.cancel(tag);
    for (const p of this._parts) if (p) p._release(0.15);
    // notes already decided inside the look-ahead never start
    for (const n of this.notes) if (n.t > t && !n.stolen) this._steal(n, t);
    this._checkBloom(t);
  }

  /** Three notes home on every part (8th grid, 16ths if that would take too long). → seconds until the last. */
  cadence() {
    const lead = this._parts[0];
    if (!lead) return 0;
    const t0 = this.now(), times = [t0];
    for (const div of [2, 4]) {
      times.length = 1;
      for (let i = 0; i < 2; i++) times.push(this.clock.nextGrid(times[i] + MIN_GAP, div));
      if (times[2] - t0 <= 0.75) break;
    }
    for (const p of [lead, this._parts[1]]) {
      if (!p) continue;
      const home = p._home(p === lead ? (p.st.prev ?? null) : null);
      const degs = [home + 2, home + 1, home];
      times.forEach((tt, i) => {
        const o = { mode: 'deg', deg: degs[i], src: 'cadence', base: BASE.cadence, lenK: i === 2 ? 2 : 1.2, immediate: i === 0, harmonise: p !== lead && i < 2 };
        if (i === 0) this._note(p, tt, o);
        else this.scheduler.at(tt, (x) => this._note(p, x, o), 'cadence');
      });
    }
    return times[2] - t0;
  }

  /** For the scene and debug (a reused object). */
  stats(t = this.now()) {
    const s = this._stats;
    let bass = 0, pad = 0, h = 0;
    for (const p of this._parts) { if (p?.bass) bass = Math.max(bass, p.bass.amount); if (p?.pad) pad = Math.max(pad, p.pad.level); }
    for (const x of this.harmonies) if (x > t - 1 && x <= t) h++;
    s.onsets1s = this._onsets1s(t); s.bass = bass; s.pad = pad; s.bloom = this.bloomOn; s.harmony1s = h; s.lastMusicT = this.lastMusicT;
    return s;
  }

  /** Held layers now (the audio sink restores them after unmute while still held). */
  layers() {
    const out = [];
    for (const p of this._parts) {
      if (!p) continue;
      if (p.pad) out.push({ slot: p.slot, kind: 'pad', hzs: p.pad.semis.map((s) => hzOf(p.V, s)), semis: p.pad.semis.slice(), level: p.pad.level, bright: p.pad.bright, shimmer: !!p.pad.shimmer });
      if (p.bass) out.push({ slot: p.slot, kind: 'bass', hz: p.bass.hz, semi: p.bass.semi, amount: p.bass.amount });
    }
    return out;
  }

  dispose() {
    this.releaseAll();
    this.scheduler.clear();
    this.disposed = true;
    this.onEvent = () => {};
    this.sink = null;
  }
}

// =================================================================== Part ==
/** One Mallow's instrument inside the engine (engine.part(slot, id)). */
class Part {
  constructor(engine, slot, mallowId, keyId, pan) {
    this.e = engine;
    this.slot = slot;
    this.mallowId = mallowId;
    this.pan = pan;
    this.V = voiceFor(mallowId, keyId);
    this.st = { prev: null, walkI: 0, repeats: 0, lastT: -1e9 };
    this.onsets = [];
    this.lastNote = null;
    this.lastStrikeT = -Infinity;
    this.bass = null; this.pad = null; this.glide = null; this.phrase = null;
  }

  rekey(keyId) {
    this._release(0.6);
    this.V = voiceFor(this.mallowId, keyId);
    this.st.prev = null;
  }

  get state() {
    return { bass: this.bass ? this.bass.amount : 0, pad: this.pad ? this.pad.level : 0, phrase: !!this.phrase, bending: !!this.glide, lastStrikeT: this.lastStrikeT };
  }

  lastOnset() { return this.onsets.length ? this.onsets[this.onsets.length - 1] : -Infinity; }

  // this part's note nearest t within the harmony window (for the friend to harmonise with)
  _near(t) {
    let best = null;
    for (const n of this.e.notes) {
      if (n.slot !== this.slot || n.stolen || Math.abs(n.t - t) > HARMONY_S) continue;
      if (!best || Math.abs(n.t - t) < Math.abs(best.t - t)) best = n;
    }
    return best;
  }

  _home(near = null) {
    const V = this.V, mid = near ?? Math.round((V.tapLo + V.tapHi) / 2);
    return clamp(Math.round(mid / 5) * 5, V.tapLo, Math.max(V.tapLo, V.tapHi - 2));
  }

  _bandDeg(y01) { const V = this.V; return Math.round(V.tapLo + clamp(+y01 || 0, 0, 1) * (V.tapHi - V.tapLo)); }

  // ------------------------------------------------------------ notes --
  /** The contact note, now. → id, or null when it became a ghost (too fast, too many). */
  strike({ y01 = 0.5, x01 = 0, deg = null, src = 'live', vel = null } = {}) {
    const e = this.e, t = e.now();
    if (RECORD.has(src)) e._cancelAnswer();
    const n = e._note(this, t, { mode: 'pick', band01: y01, deg, x01, y01, src, base: vel ?? BASE.live, immediate: true, harmonise: deg == null });
    if (n) this.lastStrikeT = t;
    return n ? n.id : null;
  }

  /** A tap lets the contact note ring; if it was struck unheard (audio still locked) and audio is ready now, strike it again. */
  ring(id) {
    const e = this.e, n = e._find(id);
    if (!n || n.heard || n.stolen || !e.sink?.ready) return false;
    const t = e.now(), ring = n.end - n.t;
    if (!e._sounding(t, t + ring, n).every((s) => consonant(s, n.semi))) return false;
    const i = this.onsets.lastIndexOf(n.t), j = e.onsets.lastIndexOf(n.t);
    if (i >= 0) this.onsets[i] = t;
    if (j >= 0) e.onsets[j] = t;
    n.t = t; n.vEnd = t + n.dur; n.end = t + ring;
    n.heard = e._emit({
      kind: 'note', slot: this.slot, t, id: n.id, semi: n.semi, deg: n.deg, hz: hzOf(this.V, n.semi), vel: n.vel, dur: n.dur, ring,
      src: n.src, x01: n.x01, y01: n.y01, immediate: true, ghost: false, restrike: true,
    });
    return n.heard;
  }

  /** Double tap: the note opens into a rolled chord, the other chord tones on the next 16ths. */
  chord(id) {
    const e = this.e, n = e._find(id), V = this.V;
    if (!n) return;
    const ch = chordWith(V, n.semi, chordAt(V, e.clock.barOf(n.t)));
    const ups = [];
    for (const pc of ch.tones) if (pc !== mod(n.semi, 12)) ups.push(n.semi + mod(pc - n.semi, 12));
    ups.sort((a, b) => a - b);
    const calls = [{ deg: n.deg, t: n.t }];
    let t = Math.max(n.t, e.now());
    for (const s of ups) {
      t = e.clock.nextGrid(t + MIN_GAP - 1e-6, 4);
      const d = degOf(V.scale, s) ?? nearestDeg(V.scale, s);
      calls.push({ deg: d, t });
      e.scheduler.at(t, (x) => e._note(this, x, { mode: 'deg', deg: d, src: 'chord', base: BASE.chord, x01: n.x01, y01: n.y01 }), `roll${this.slot}`);
    }
    e._answer(this, calls, t);
  }

  /** Two quiet notes when a friend arrives. */
  hello() {
    const e = this.e, t = e.now(), home = this._home();
    e._note(this, t, { mode: 'deg', deg: home, src: 'hello', base: BASE.hello, immediate: true });
    const t2 = e.clock.nextGrid(t + MIN_GAP, 2);
    e.scheduler.at(t2, (x) => e._note(this, x, { mode: 'deg', deg: home + 2, src: 'hello', base: BASE.hello }), `roll${this.slot}`);
  }

  /** This part alone resolves home (engine.cadence() does every part together). */
  cadence() {
    const e = this.e, t0 = e.now(), home = this._home(this.st.prev);
    let t = t0;
    [home + 2, home + 1, home].forEach((d, i) => {
      if (i) t = e.clock.nextGrid(t + MIN_GAP, 2);
      const o = { mode: 'deg', deg: d, src: 'cadence', base: BASE.cadence, lenK: i === 2 ? 2 : 1.2, immediate: i === 0 };
      if (i === 0) e._note(this, t, o); else e.scheduler.at(t, (x) => e._note(this, x, o), 'cadence');
    });
    return t - t0;
  }

  // ------------------------------------------------------------- bend --
  bendStart(id) {
    const n = this.e._find(id);
    this.glide = n ? { id: n.id, n, deg0: n.deg, semi0: n.semi, k: 0, hz: hzOf(this.V, n.semi), lastT: -1, held: false } : { id: null, held: false };
  }

  /** k 0..1: up to +2 scale degrees. Events at most every 40 ms and only for ≥ 8 cents. */
  bend(k01) {
    const B = this.glide, e = this.e;
    if (!B || B.id == null || B.n.stolen) return;
    const t = e.now(), k = clamp(+k01 || 0, 0, 1);
    B.k = k;
    const semi = B.semi0 + (degSemi(this.V.scale, B.deg0 + 2) - B.semi0) * k;
    // in the original note's octave (it may have been folded down from above 2400 Hz)
    const f = hzOf(this.V, B.semi0) * 2 ** ((semi - B.semi0) / 12);
    if (Math.abs(1200 * Math.log2(f / B.hz)) < 8 || t - B.lastT < 0.04) return;
    const start = !B.held;
    B.held = true; B.n.held = true; B.n.end = Infinity; B.n.vEnd = Infinity;
    // the held note now rings on: a queued continuation that would clash with it gives way (live play wins)
    if (start) for (const m of e.notes) if (m.t > t && !m.stolen && !consonant(m.semi, B.semi0)) e._steal(m, t);
    B.hz = f; B.lastT = t;
    e._emit({ kind: 'bend', slot: this.slot, t, id: B.id, hz: f, glide: 0.03, ...(start ? { start: true } : {}) });
  }

  /** Release: snap to the nearest scale tone (80 ms); a fling adds an upward arpeggio; a handoff fades into the phrase. */
  bendEnd({ fling = false, handoff = false } = {}) {
    const B = this.glide, e = this.e, V = this.V;
    this.glide = null;
    if (!B || B.id == null || B.n.stolen) return;
    const n = B.n, t = e.now();
    n.held = false;
    if (handoff) {   // the note fades as the phrase takes over (bent or not): every renderer has to know
      e._emit({ kind: 'bend', slot: this.slot, t, id: n.id, hz: B.hz, glide: 0.12, end: 'handoff' });
      n.vEnd = Math.min(n.vEnd, t + 0.12); n.end = Math.min(n.end, t + 0.12);
      return;
    }
    const semiNow = B.semi0 + (degSemi(V.scale, B.deg0 + 2) - B.semi0) * B.k;
    if (B.held) {
      const ring = Math.max(0.25, V.decay * Math.log(Math.max(0.21, n.vel) / 0.2));
      const d = guardDeg(nearestDeg(V.scale, semiNow), e._sounding(t, t + ring, n), V, { chord: chordAt(V, e.clock.barOf(t)) });
      n.deg = d; n.semi = degSemi(V.scale, d); n.vEnd = t + n.dur; n.end = t + Math.min(n.dur, ring);
      e._emit({ kind: 'bend', slot: this.slot, t, id: n.id, hz: hzOf(V, n.semi), semi: n.semi, deg: d, ring: n.end - t, glide: 0.08, end: 'snap' });
    }
    if (fling) this._arpeggio(n.deg, t);
  }

  _arpeggio(deg, t0) {
    const e = this.e, V = this.V;
    let d = deg, t = t0;
    for (let i = 0; i < 3; i++) {
      const ch = chordAt(V, e.clock.barOf(t));
      do d++; while (!isChordTone(ch, degSemi(V.scale, d)) && d < deg + 10);
      t = e.clock.nextGrid(t + MIN_GAP - 1e-6, 4);
      const dd = d;
      e.scheduler.at(t, (x) => e._note(this, x, { mode: 'deg', deg: dd, src: 'chord', base: BASE.chord, x01: 0, y01: 1 }), `roll${this.slot}`);
    }
  }

  /** The note drops under the bass (−9 dB in 60 ms). */
  duck(id) {
    const e = this.e, n = e._find(id);
    if (!n || n.stolen) return;
    const t = e.now();
    if (this.glide?.id === id) this.glide = null;
    if (n.held) { n.held = false; n.vEnd = t + 0.5; }
    n.peak *= DUCK;
    n.end = Math.max(n.t + 0.25, Math.min(n.end, t + 0.1));
    e._emit({ kind: 'duck', slot: this.slot, t, id });
  }

  // ------------------------------------------------------------- bass --
  bassStart(amount = 0) {
    const t = this.e.now();
    if (this.bass?.owner === 'live') { this.bassAmount(amount); return; }
    if (this.bass) this._bassOff(t, 0.15, true);
    this._bassOn(amount, t, 'live');
  }

  bassAmount(a) {
    const B = this.bass, e = this.e;
    if (!B || B.owner !== 'live') return;
    const t = e.now(), v = clamp(+a || 0, 0, 1);
    if (v === B.amount) return;
    const edge = (v === 0 || v === 1) && B.sent !== v;
    B.amount = v;
    if (!edge && (Math.abs(v - B.sent) < 0.02 || t - B.lastT < 0.04)) return;
    this._sendAmount(t);
  }

  _sendAmount(t) {
    const B = this.bass;
    B.sent = B.amount; B.lastT = t;
    this.e._emit({ kind: 'bassSet', slot: this.slot, t, amount: B.amount, glide: 0.06 });
  }

  // on each beat: a rate-limited amount or brightness that never got sent goes out now
  _flush(t) {
    if (this.bass && Math.abs(this.bass.amount - this.bass.sent) > 0.004) this._sendAmount(t);
    const P = this.pad;
    if (P && Math.abs(P.bright - P.brightSent) > 0.004) {
      P.brightSent = P.bright; P.brightT = t;
      this.e._emit({ kind: 'padSet', slot: this.slot, t, bright: P.bright, glide: 0.2 });
    }
  }

  bassEnd() { if (this.bass?.owner === 'live') this._bassOff(this.e.now(), null, true); }

  // the chord root in the bass; in a duet the second bass is the other's 5th (or octave). A root that would
  // clash with something sounding takes another chord tone (or stays where it was).
  _bassSemi(bar, t, prev = null, skip = null) {
    const V = this.V, e = this.e, ch = chordAt(V, bar), other = e._other(this)?.bass;
    let semi = ch.root, up = false;
    if (other) {
      const fifth = mod(other.semi + 7, 12);
      if (V.scale.includes(fifth)) semi = fifth; else { semi = mod(other.semi, 12); up = true; }
    }
    const around = e._sounding(t, t + 0.3, null, skip);
    const fits = (pc) => around.every((s) => consonant(s, pc));
    if (!fits(semi)) {
      // another chord tone, else any scale tone that agrees (Zuzu's tonic always does), else where it was
      const alt = ch.tones.find(fits) ?? V.scale.find(fits);
      if (alt != null) { semi = alt; up = false; } else if (prev != null) semi = prev;
    }
    return { semi: mod(semi, 12), up };
  }

  _bassOn(amount, t, owner) {
    const e = this.e, V = this.V, bar = e.clock.barOf(t);
    const { semi, up } = this._bassSemi(bar, t);
    const f = bassHz(V, semi) * (up ? 2 : 1);
    this.bass = { semi, hz: f, up, amount: clamp(+amount || 0, 0, 1), sent: 0, lastT: t, t0: t, bar, owner, prev: semi, changeT: t, take: null };
    this.bass.sent = this.bass.amount;
    e._emit({ kind: 'bassOn', slot: this.slot, t, hz: f, semi, amount: this.bass.amount, ...(owner !== 'live' ? { src: 'replay' } : {}) });
    if (owner === 'live') {
      e.take.barS = e.clock.barS;
      this.bass.take = e.take.add({ beat: e.clock.at(t, e._at).beat, slot: this.slot, kind: 'b', deg: nearestDeg(V.scale, semi), vel: 0.6, len: 1 }, t);
    }
    e._ensureBeat();
  }

  _bassOff(t, fade = null, emit = true) {
    const B = this.bass, e = this.e;
    if (!B) return;
    this.bass = null;
    // released before an announced bar change lands: both pitches ring on in the release
    e.tails.push({ semis: t < B.changeT ? [B.semi, B.prev] : [B.semi], t, end: t + BASS_TAIL });
    if (B.take) { B.take.len = clamp(Math.round((t - B.t0) / e.clock.beatS), 1, 9); e.take.touch(t); }
    if (emit) e._emit({ kind: 'bassOff', slot: this.slot, t, ...(fade != null ? { fade } : {}) });
  }

  // -------------------------------------------------------------- pad --
  /** Hold after a contact note: the note blooms into a pad, the chord with that note on top. */
  bloom(id) {
    const n = this.e._find(id);
    if (!n) { this.padStart({ y01: 0.5 }); return; }
    this._padOn(n.semi, n.y01, n.id, 'live', this.e.now());
  }

  /** A hum with no contact note (H key, Hum chip): the chord tone nearest the touch height on top. */
  padStart({ y01 = 0.5 } = {}) {
    const e = this.e, V = this.V, t = e.now(), ch = chordAt(V, e.clock.barOf(t));
    const band = this._bandDeg(y01);
    let best = band, bd = Infinity;
    for (let d = V.tapLo; d <= V.tapHi; d++) {
      if (!isChordTone(ch, degSemi(V.scale, d))) continue;
      if (Math.abs(d - band) < bd) { bd = Math.abs(d - band); best = d; }
    }
    best = guardDeg(best, e._sounding(t, t + 0.5), V, { chord: ch });
    this._padOn(degSemi(V.scale, best), y01, null, 'live', t);
  }

  padBright(y01) {
    const P = this.pad, e = this.e;
    if (!P || P.owner !== 'live') return;
    const t = e.now(), b = clamp(+y01 || 0, 0, 1);
    if (Math.abs(b - P.bright) < 0.004) return;
    P.bright = b;
    if (Math.abs(b - P.brightSent) < 0.04 || t - P.brightT < 0.05) return;
    P.brightSent = b; P.brightT = t;
    e._emit({ kind: 'padSet', slot: this.slot, t, bright: b, glide: 0.2 });
  }

  padEnd() { if (this.pad?.owner === 'live') this._padOff(this.e.now(), null, true); }

  // Voices that would clash with something sounding move to another chord tone, or double a free
  // voice an octave down. skip: this Part at a bar line (its pad and bass change together, from one chord).
  _fit(semis, chord, t, top, skip = null) {
    const e = this.e, around = e._sounding(t, t + 0.3, null, skip);
    const out = [];
    const ok = (s) => around.every((m) => consonant(m, s)) && out.every((o) => o == null || consonant(o, s));
    // the top first (a bloom keeps its note), then each voice: itself, another chord tone, any scale tone that agrees
    const order = semis.map((s, i) => i).sort((a, b) => (semis[b] === top) - (semis[a] === top));
    for (const i of order) {
      const s = semis[i];
      let c = s === top || ok(s) ? s : null;
      for (const pc of chord.tones) { if (c != null) break; const x = s - mod(s - pc, 12); if (ok(x)) c = x; }
      for (const pc of this.V.scale) { if (c != null) break; const x = s - mod(s - pc, 12); if (ok(x)) c = x; }
      out[i] = c;
    }
    const spare = out.find((s) => s != null) ?? semis[semis.length - 1];
    for (let i = 0; i < out.length; i++) if (out[i] == null) out[i] = spare - 12;   // a voice with no room doubles another
    out.sort((a, b) => a - b);
    // two Mallows humming bloom into one chord: a two-tone chord gains a third consonant tone
    const other = e._other(this)?.pad;
    if (other) {
      const have = new Set([...out, ...other.semis].map((s) => mod(s, 12)));
      const add = have.size < 3 ? this.V.scale.find((pc) => !have.has(pc) && [...have].every((h) => consonant(h, pc)) && ok(pc)) : undefined;
      if (add != null) {
        const dup = out.findIndex((s, i) => out.some((x, j) => j !== i && mod(x, 12) === mod(s, 12)));
        const i = dup >= 0 ? dup : 0, ref = out[i === 0 ? 1 : 0];
        out[i] = ref - mod(ref - add, 12);
        out.sort((a, b) => a - b);
      }
    }
    return out;
  }

  _padOn(top0, bright, from, owner, t) {
    const e = this.e, V = this.V;
    if (this.pad) this._padOff(t, 0.15, true);
    const bar = e.clock.barOf(t);
    // the top is guarded like a note (a bloom's own contact note aside): it may have stopped
    // ringing, and something struck since must not be contradicted by it coming back
    const top = degSemi(V.scale, guardDeg(nearestDeg(V.scale, top0), e._sounding(t, t + 0.5, e._find(from)), V, { chord: chordAt(V, bar) }));
    const chord = chordWith(V, top, chordAt(V, bar));
    const semis = this._fit(voicePad(top, chord.tones), chord, t, top);
    const b = clamp(+bright || 0, 0, 1);
    this.pad = { semis, prev: semis, changeT: t, chord, bar, t0: t, level: PAD_LEVEL, bright: b, brightSent: b, brightT: t, owner, shimmer: false, shimBar: null, shimN: 0, take: null };
    e._emit({ kind: 'padOn', slot: this.slot, t, hzs: semis.map((s) => hzOf(V, s)), semis: semis.slice(), level: PAD_LEVEL, bright: this.pad.bright, from: from ?? null, ...(owner !== 'live' ? { src: 'replay' } : {}) });
    if (owner === 'live') {
      e.take.barS = e.clock.barS;
      this.pad.take = e.take.add({ beat: e.clock.at(t, e._at).beat, slot: this.slot, kind: 'h', deg: nearestDeg(V.scale, top), vel: 0.6, len: 1 }, t);
    }
    const P = this.pad;
    e.scheduler.at(t + 4, (x) => {
      if (this.pad !== P) return;
      P.shimmer = true;
      e._emit({ kind: 'padSet', slot: this.slot, t: x, shimmer: true, glide: 1 });
    }, `shim${this.slot}`);
    e._ensureBeat();
    e._checkBloom(t);
  }

  _padOff(t, fade = null, emit = true) {
    const P = this.pad, e = this.e;
    if (!P) return;
    this.pad = null;
    e.scheduler.cancel(`shim${this.slot}`);
    e.tails.push({ semis: t < P.changeT ? [...P.semis, ...P.prev] : P.semis.slice(), t, end: t + PAD_TAIL });
    if (P.take) { P.take.len = clamp(Math.round((t - P.t0) / e.clock.beatS), 1, 9); e.take.touch(t); }
    if (emit) e._emit({ kind: 'padOff', slot: this.slot, t, ...(fade != null ? { fade } : {}) });
    e._checkBloom(t);
  }

  // a bar line while layers are held: the pad voice-leads to the new chord (0.4 s), the bass glides (120 ms)
  _barChange(bar, t) {
    const e = this.e, V = this.V, ch = chordAt(V, bar), P = this.pad, B = this.bass;
    // both layers are re-voiced from the same new chord before either changes
    const pad = P && P.bar !== bar ? this._fit(leadPad(P.semis, ch.tones), ch, t, null, this) : null;
    const bass = B && B.bar !== bar ? this._bassSemi(bar, t, B.semi, this) : null;
    if (bass) {
      B.bar = bar;
      if (bass.semi !== B.semi || bass.up !== B.up) {
        B.prev = B.semi; B.changeT = t; B.semi = bass.semi; B.up = bass.up; B.hz = bassHz(V, bass.semi) * (bass.up ? 2 : 1);
        e._emit({ kind: 'bassSet', slot: this.slot, t, hz: B.hz, semi: B.semi, glide: 0.12 });
      }
    }
    if (pad) {
      P.prev = P.semis; P.changeT = t; P.semis = pad; P.chord = ch; P.bar = bar;
      e._emit({ kind: 'padSet', slot: this.slot, t, hzs: pad.map((s) => hzOf(V, s)), semis: pad.slice(), glide: 0.4 });
    }
  }

  // Semis this part's layers contribute to sounding in [a, b): current (and the previous until the
  // change lands), plus the planned chord of any later bar line inside the window.
  _layerSemis(a, b, out) {
    const e = this.e, V = this.V, P = this.pad, B = this.bass;
    if (!P && !B) return;
    const b0 = e.clock.barOf(a), b1 = e.clock.barOf(b + 0.1 * e.clock.barS);
    if (P && P.t0 < b) {
      for (const s of P.semis) out.push(s);
      if (a < P.changeT) for (const s of P.prev) out.push(s);
      for (let bar = Math.max(b0, P.bar + 1); bar <= b1; bar++) for (const s of chordAt(V, bar).tones) out.push(s);
    }
    if (B && B.t0 < b) {
      out.push(B.semi);
      if (a < B.changeT) out.push(B.prev);
      for (let bar = Math.max(b0, B.bar + 1); bar <= b1; bar++) out.push(chordAt(V, bar).root);
    }
  }

  _shimmer(t, beatInBar, bar) {
    const P = this.pad, S = this.V.shimmer, e = this.e, V = this.V;
    if (!P || !P.shimmer || !S || S.octave) return;
    if (S.unit === 'bar' && (beatInBar !== 0 || mod(bar, S.n || 1) !== 0)) return;
    if (S.perBar) { if (P.shimBar !== bar) { P.shimBar = bar; P.shimN = 0; } if (P.shimN >= S.perBar) return; }
    if (e.rand() >= (S.chance ?? 1)) return;
    const ch = chordAt(V, bar), ref = S.low ? Math.min(...P.semis) - 12 : Math.max(...P.semis) + 12;
    let d = nearestDeg(V.scale, ref);
    for (let k = 0; k < 5 && !isChordTone(ch, degSemi(V.scale, d)); k++) d += S.low ? -1 : 1;
    const n = e._note(this, t, { mode: 'deg', deg: d, src: 'shimmer', base: BASE.shimmer, lenK: 1.2, glide: S.glide ? 0.3 : 0, x01: 0, y01: S.low ? 0 : 1 });
    if (n) P.shimN++;
  }

  // ----------------------------------------------------------- phrase --
  /** A stroke: note 1 now (or the contact note, if it is under 150 ms old), then the Mallow's phrase grid. */
  phraseStart({ reuse = null, x01 = 0, y01 = 0.5 } = {}) {
    const e = this.e, t = e.now();
    if (this.phrase) this._phraseStop();
    e.scheduler.cancel(`resolve${this.slot}`);
    e._cancelAnswer();
    let n = e._find(reuse);
    if (n && (t - n.t > REUSE_S || n.stolen)) n = null;
    if (!n) n = e._note(this, t, { mode: 'pick', band01: y01, x01, y01, src: 'phrase', base: BASE.phrase, immediate: true, harmonise: true });
    if (n) this.lastStrikeT = Math.max(this.lastStrikeT, n.t);
    const deg = n ? n.deg : (this.st.prev ?? this._bandDeg(y01));
    this.phrase = {
      deg, hz: hzOf(this.V, degSemi(this.V.scale, deg)), n: n ? 1 : 0, i: 0, dir: 1, moves: 0, speed: 0, speedT: t,
      lastMoveT: t, lastT: n ? n.t : t, x01, y01, restUntil: -Infinity, recent: n ? [{ deg: n.deg, t: n.t }] : [],
    };
    this._phraseNext(t);
    return n ? n.id : null;
  }

  phraseMove({ x01 = null, y01 = null, vx = 0, speed = 0 } = {}) {
    const P = this.phrase, e = this.e;
    if (!P) return;
    const t = e.now();
    P.lastMoveT = t;
    if (x01 != null) P.x01 = x01;
    if (y01 != null) P.y01 = y01;
    if (Math.abs(vx) > 30) P.dir = vx > 0 ? 1 : -1;
    const sp = Math.max(0, +speed || 0);
    P.speed = P.moves++ ? P.speed + (sp - P.speed) * (1 - Math.pow(0.5, Math.max(0, t - P.speedT) / 0.15)) : sp;
    P.speedT = t;
    if (!e.scheduler.has(`phrase${this.slot}`)) this._phraseNext(t);
  }

  // faster strokes double the grid, slow ones halve it (never slower than one note per beat, nor closer than 80 ms)
  _div() {
    const P = this.phrase, beat = this.e.clock.beatS;
    let div = this.V.grid * (P.speed > 900 ? 2 : P.speed < 250 ? 0.5 : 1);
    div = Math.max(1, div);
    while (div > 1 && beat / div < 0.08) div /= 2;
    return div;
  }

  _phraseNext(after) {
    const e = this.e, P = this.phrase;
    if (!P) return;
    const g = e.clock.nextGrid(Math.max(after, P.lastT + MIN_GAP - 1e-6), this._div(), this.V.swing);
    e.scheduler.at(g, (t) => this._phraseTick(t), `phrase${this.slot}`, () => this._phraseNext(e.now()));
  }

  _phraseTick(t) {
    const P = this.phrase, e = this.e, V = this.V, S = V.phrase;
    if (!P) return;
    if (t < P.restUntil || t - P.lastMoveT > MOVE_S) { this._phraseNext(t); return; }
    if (P.restUntil > -Infinity) { P.restUntil = -Infinity; P.n = 0; }
    const pat = P.dir > 0 ? S.rise : S.fall;
    let step = pat[P.i++ % pat.length];
    if (step < -1 && e.clock.at(t, e._at).phase === 'in') step += 1;   // the in-breath leans phrases upward
    const lo = V.tapLo - 1, hi = V.tapHi + 1;
    let d = P.deg + step;
    if (d > hi || d < lo) {
      if (S.wrap) d = foldDeg(d + (d > hi ? -5 : 5), lo, hi);
      else { P.dir = -P.dir; d = clamp(P.deg - step, lo, hi); }
    }
    const nb = e.clock.nearest(t), onBeat = Math.abs(nb.offsetS) < 1e-6;
    if (onBeat && nb.strong) {   // strong beats outline the harmony
      const ch = chordAt(V, e.clock.barOf(t));
      if (!isChordTone(ch, degSemi(V.scale, d))) d += isChordTone(ch, degSemi(V.scale, d + P.dir)) ? P.dir : -P.dir;
    }
    const n = e._note(this, t, {
      mode: 'deg', deg: d, src: 'phrase', base: onBeat ? BASE.phraseBeat : BASE.phrase, harmonise: true, lenK: S.len,
      x01: P.x01, y01: P.y01, glideFrom: S.glide && P.n ? P.hz : 0, glide: S.glide || 0, stutter: !!S.stutter && (P.n + 1) % S.stutter === 0,
    });
    if (n) {
      P.deg = n.deg; P.hz = hzOf(V, n.semi); P.n++; P.lastT = t;
      P.recent.push({ deg: n.deg, t });
      if (P.recent.length > 4) P.recent.shift();
      if (P.n >= S.max) P.restUntil = t + e.clock.barS;
    }
    this._phraseNext(t);
  }

  _phraseStop() {
    this.phrase = null;
    this.e.scheduler.cancel(`phrase${this.slot}`);
  }

  /** Stroke end: resolve to a chord tone on the next beat (Pipzi: a fast stroke ends with a 3-note flourish). */
  phraseEnd() {
    const P = this.phrase, e = this.e, V = this.V;
    if (!P) return;
    this._phraseStop();
    const t = e.now();
    e._emit({ kind: 'phraseEnd', slot: this.slot, t });
    const calls = P.recent.slice();
    let tEnd;
    if (V.phrase.flourish && P.speed > 900) {
      let tt = Math.max(t, P.lastT);
      for (let i = 1; i <= 3; i++) {
        tt = e.clock.nextGrid(tt + MIN_GAP - 1e-6, 4);
        const last = i === 3, raw = clamp(P.deg + P.dir * i, V.tapLo - 1, V.tapHi + 1);
        calls.push({ deg: raw, t: tt });
        e.scheduler.at(tt, (x) => {
          const d = last ? this._chordDeg(raw, x) : raw;
          e._note(this, x, { mode: 'deg', deg: d, src: 'phrase', base: BASE.phrase, lenK: last ? 1.5 : V.phrase.len, resolve: last, x01: P.x01, y01: P.y01 });
        }, `resolve${this.slot}`);
      }
      tEnd = tt;
    } else {
      tEnd = e.clock.nextGrid(Math.max(t, P.lastT + MIN_GAP) - 1e-6, 1);
      calls.push({ deg: P.deg, t: tEnd });
      e.scheduler.at(tEnd, (x) => {
        e._note(this, x, { mode: 'deg', deg: this._chordDeg(P.deg, x), src: 'phrase', base: BASE.phraseBeat, lenK: 1.5, resolve: true, x01: P.x01, y01: P.y01 });
      }, `resolve${this.slot}`);
    }
    e._answer(this, calls, tEnd);
  }

  // the chord tone of the bar at t nearest a degree (ties: the lower)
  _chordDeg(d, t) {
    const ch = chordAt(this.V, this.e.clock.barOf(t)), sc = this.V.scale;
    for (let k = 0; k <= 5; k++) for (const c of [d - k, d + k]) if (isChordTone(ch, degSemi(sc, c))) return c;
    return d;
  }

  // ---------------------------------------------------------- release --
  // everything this part holds ends now: phrase (no resolve), queued notes, the glide, the pad and the bass
  _release(fade) {
    const e = this.e, t = e.now();
    this._phraseStop();
    for (const tag of [`resolve${this.slot}`, `roll${this.slot}`, `shim${this.slot}`]) e.scheduler.cancel(tag);
    if (this.glide?.held && !this.glide.n.stolen) this.duck(this.glide.id);
    this.glide = null;
    this._padOff(t, fade, true);
    this._bassOff(t, fade, true);
  }
}
