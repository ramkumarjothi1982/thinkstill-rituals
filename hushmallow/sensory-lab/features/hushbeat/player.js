// Hushbeat player: one per Mallow. Turns the Companion's gestures (through
// stage-screen's onGesture hook: pointer, wheel, keys and buttons alike)
// into calls on that Mallow's Part of the Music Engine. Pure: no DOM.
//
// Every touch on the body starts with a note (onset at contact); the gesture
// then decides what that note becomes, and no second note is ever struck:
//   tap        it rings (re-struck if audio was still locked when it began)
//   double tap it opens into a rolled chord
//   hold       it blooms into a pad (a hum)
//   drag up    it bends, then snaps to a scale tone; a fling adds an arpeggio
//   press down / second finger   it ducks under a warm bass
//   stroke     it becomes the first note of a phrase
// Button and key paths (Companion.act) arrive with no contact, so they strike
// their own note (marked tip: false: no fingertip, so its bead rises above the
// head). The held Hum and Bass chips and the H and S keys are layers beside the
// touch (layer()): notes, strokes and holds on the body keep playing over them,
// and no touch ends them. A watchdog ends anything left hanging (a
// pointercancel on a pending pointer emits no gesture at all).

import { clamp } from '../../core/math.js';

const TAIL_S = 0.005;   // the recognizer emits some pairs back to back: holdend → dragstart, dragend → squeezestart
const STUCK_S = 0.6;    // a state this old with nothing touching the stage is stale
const PRESS_PX = 20;    // a drag this far down presses (bass) instead of bending
const REUSE_S = 0.15;   // a stroke reuses a contact note this fresh as its first note
const BUTTON = 0.7;     // velocity base for button and key notes
const LAYER_Y = 0.75;   // a held Hum chip or H: the hum's top note from high on the body
const RAMP = 2;         // a held Bass chip or S: its bass swells by this much a second…
const RAMP_MAX = 0.7;   // …to this (as the Companion's button squeeze does)
const BASS = new Set(['pressing', 'pressHold', 'squeezing']);   // touch states that hold the bass

/** Body-relative point: y01 0 at the base (belly, low notes) → 1 at the top (head, high); x01 −1..1 across. */
export function bodyPoint(geo, x, y) {
  const g = geo || {}, h = g.h > 0 ? g.h : 1, w = g.w > 0 ? g.w : 1;
  return { y01: clamp((g.base - y) / h, 0, 1), x01: clamp((x - g.cx) / (w / 2), -1, 1) };
}

export class Player {
  /** part: the Mallow's Part; geo() → { cx, base, w, h } of the body in stage px; now() in seconds. */
  constructor(part, { geo = () => null, now = () => performance.now() / 1000 } = {}) {
    this.part = part;
    this.geo = geo;
    this.now = now;
    this._state = 'idle';   // idle | struck | sustaining | bending | handoff | pressing | pressHold | phrasing | squeezing
    this.since = now();
    this.id = null;         // the current gesture's note
    this.strikeT = -Infinity;
    this.tail = null;       // { t } when a gesture just ended (a paired event may follow at once)
    this.btn = { pad: false, bass: false };   // layers held by a chip or a key (beside the touch)
    this.btnT = 0;          // when the held bass began (its swell)
  }

  get state() { return this._state; }

  /** Does a touch gesture hold this layer ('pad' | 'bass') right now? */
  holds(kind) { return kind === 'pad' ? this._state === 'sustaining' : BASS.has(this._state); }

  /**
   * A layer held by a chip or a key (the Hum or Bass chip, H or S), on or off. It lives beside the touch:
   * the touch state machine stays free, so taps, strokes and holds on the body keep playing over it, and
   * no touch gesture ends it. A layer a finger already holds is shared (the one let go last ends it).
   * → true when it changed.
   */
  layer(kind, on) {
    const b = this.btn, p = this.part;
    on = !!on;
    if ((kind !== 'pad' && kind !== 'bass') || b[kind] === on) return false;
    b[kind] = on;
    if (kind === 'bass' && on) this.btnT = this.now();
    if (this.holds(kind)) return true;   // a finger holds it too: it carries on with the finger
    if (kind === 'pad') { if (on) p.padStart({ y01: LAYER_Y }); else p.padEnd(); }
    else if (on) p.bassStart(0); else p.bassEnd();
    return true;
  }

  _go(s) { this._state = s; this.since = this.now(); }
  _pt(x, y) { const g = this.geo(); return g && x != null && y != null ? bodyPoint(g, x, y) : { y01: 0.5, x01: 0 }; }
  _h() { const g = this.geo(); return g && g.h > 0 ? g.h : 200; }
  _press(dy) { return clamp(dy / (0.6 * this._h()), 0, 1); }
  _fresh() { return !!this.tail && this.now() - this.tail.t <= TAIL_S; }
  _ended() { this.tail = { t: this.now() }; this._go('idle'); }

  /** A Companion gesture (type and data exactly as core/gesture-engine.js emits them). */
  gesture(type, d = {}) {
    const p = this.part, s = this._state;
    switch (type) {
      case 'contact': {
        if (!d.onBody) return;                   // off the body: the breath router's
        if (s === 'pressHold') this._endAll();   // a stale press (its pointer was cancelled)
        if (this._state !== 'idle') return;      // another finger mid-gesture: no new note
        this.id = p.strike(this._pt(d.x, d.y));
        this.strikeT = this.now(); this.tail = null;
        this._go('struck');
        return;
      }
      case 'tap':
        if (s === 'struck') p.ring(this.id);
        else if (s === 'idle') this.id = p.strike({ ...this._pt(d.x, d.y), vel: BUTTON, tip: false });
        else return;
        this._go('idle');
        return;
      case 'doubletap':
        if (s === 'struck') p.chord(this.id);
        else if (s === 'idle') { this.id = p.strike({ ...this._pt(d.x, d.y), vel: BUTTON, tip: false }); p.chord(this.id); }
        else return;
        this._go('idle');
        return;
      case 'holdstart':
        // a hum already held by a chip or H: the contact note just rings inside it (no second hum)
        if (s === 'struck') { if (this.btn.pad) p.ring(this.id); else p.bloom(this.id); }
        else if (s === 'idle') { if (!this.btn.pad) p.padStart(this._pt(d.x, d.y)); }
        else return;
        this._go('sustaining');
        return;
      case 'holding':
        if (s === 'sustaining') p.padBright(this._pt(d.x, d.y).y01);
        return;
      case 'holdend':
        if (s !== 'sustaining') return;
        if (!this.btn.pad) p.padEnd();   // a chip's or key's hum stays
        this._ended();
        return;
      case 'dragstart':
        if (s === 'struck') p.bendStart(this.id);
        else if (s === 'idle' && this._fresh()) p.bendStart(null);   // a hold broke into a drag: silent, it may still press
        else if (s === 'idle') {                                      // T key / auto stretch: a note to bend
          this.id = p.strike({ ...this._pt(d.x0 ?? d.x, d.y0 ?? d.y), vel: BUTTON, tip: false });
          this.strikeT = this.now();
          p.bendStart(this.id);
        } else return;
        this._go('bending');
        return;
      case 'drag': {
        const dy = +d.dy || 0;
        if (s === 'bending') {
          if (dy > PRESS_PX) { p.duck(this.id); p.bassStart(this._press(dy)); this._go('pressing'); }
          else p.bend(clamp(-dy / (0.45 * this._h()), 0, 1));
        } else if (s === 'pressing') p.bassAmount(this._press(dy));
        return;
      }
      case 'dragend':
        if (s === 'bending') {
          if (d.converted) { p.bendEnd({ handoff: true }); this._go('handoff'); }
          else { p.bendEnd({ fling: !!d.fling && !d.cancelled }); this._ended(); }
        } else if (s === 'pressing') {
          if (d.cancelled) this._go('pressHold');   // a second finger: the press's bass carries on into the squeeze
          else { if (!this.btn.bass) p.bassEnd(); this._ended(); }
        }
        return;
      case 'strokestart': {
        if (!['idle', 'struck', 'bending', 'handoff'].includes(s)) return;
        if (s === 'bending') p.bendEnd({ handoff: true });
        // only a contact note still ringing as struck can be the first phrase note (a handed-off one is fading)
        const reuse = s === 'struck' && this.now() - this.strikeT < REUSE_S ? this.id : null;
        const id = p.phraseStart({ reuse, ...this._pt(d.x, d.y) });
        if (id != null) this.id = id;
        this._go('phrasing');
        return;
      }
      case 'stroke':
        if (s === 'phrasing') p.phraseMove({ ...this._pt(d.x, d.y), vx: +d.vx || 0, speed: +d.speed || 0 });
        return;
      case 'strokeend':
        if (s !== 'phrasing') return;
        p.phraseEnd();
        this._ended();
        return;
      case 'squeezestart':
        if (s === 'pressHold') { this._go('squeezing'); return; }
        if (s === 'squeezing') return;
        if (s === 'struck' || (s === 'idle' && this._fresh())) p.duck(this.id);
        else if (s !== 'idle') this._endLayers();   // the wheel while something else is held
        if (!this.btn.bass) p.bassStart(0);          // a chip's or key's bass carries the squeeze (no second bass)
        this._go('squeezing');
        return;
      case 'squeeze':   // only this player's own squeeze (never a held chip's button squeeze on the face)
        if (s === 'squeezing') p.bassAmount(Math.max(0, +d.amount || 0));
        return;
      case 'squeezeend':
        if (s !== 'squeezing') return;
        if (!this.btn.bass) p.bassEnd();
        this._ended();
        return;
      default:
    }
  }

  /** Digit keys 1–7: that degree from the bottom of the Mallow's tap window. → note id | null */
  degree(n) {
    const k = Math.round(+n);
    if (!(k >= 1 && k <= 7)) return null;
    const V = this.part.V;
    return this.part.strike({ deg: V.tapLo + k - 1, vel: BUTTON, y01: (k - 1) / 6, x01: 0, tip: false });
  }

  /**
   * Call every frame. busy: the stage still has pointers or a held Companion gesture (computed by the
   * feature). Anything not idle, older than 600 ms, with nothing touching, ends → true. A held chip's or
   * key's bass swells here too (to 0.7 over 0.35 s) while no finger sets its amount.
   */
  watchdog(t = this.now(), busy = false) {
    if (this.btn.bass && !this.holds('bass')) this.part.bassAmount(Math.min(RAMP_MAX, (t - this.btnT) * RAMP));
    const s = this._state;
    if (s === 'idle' || busy) return false;
    if (s !== 'pressHold' && s !== 'handoff' && t - this.since < STUCK_S) return false;
    this._endAll();
    return true;
  }

  // the touch's own layers (a layer a chip or key also holds stays)
  _endLayers() {
    const p = this.part;
    switch (this._state) {
      case 'sustaining': if (!this.btn.pad) p.padEnd(); break;
      case 'bending': p.bendEnd({}); break;
      case 'pressing': case 'pressHold': case 'squeezing': if (!this.btn.bass) p.bassEnd(); break;
      case 'phrasing': p.phraseEnd(); break;
      default:
    }
  }

  _endAll() { this._endLayers(); this.tail = null; this._go('idle'); }

  /** Back to idle, ending anything this player holds, chip and key layers included (a no-op after engine.releaseAll()). */
  reset() {
    const b = this.btn, pad = b.pad && !this.holds('pad'), bass = b.bass && !this.holds('bass');
    b.pad = false; b.bass = false;
    this._endAll();
    if (pad) this.part.padEnd();
    if (bass) this.part.bassEnd();
    this.id = null; this.strikeT = -Infinity;
  }
}
