// Companion — one living Mallow on a stage: gestures in, physics, face,
// personality and sound out. TouchTalk and SoftBody Lab are both built on it,
// and later experiences (Pocket Hush, Hushbeat, Nightlight…) will be too.
//
//   pointer ─▶ GestureRecognizer ─▶ Companion.handle()
//                                      ├─▶ SoftMallow (poke / grab / pinch / press / brush)
//                                      ├─▶ Personality.respond() ─▶ ExpressionDirector + rig.react()
//                                      └─▶ SoundEngine (material sounds + Mallow voice) + haptics
//
// Every gesture also has a button / keyboard path (act()), so nothing here
// requires multitouch, precise dragging, or touch at all.

import { SoftMallow } from './soft-mallow.js';
import { bindGestures } from './gesture-engine.js';
import { Personality } from './personality.js';
import { ExpressionDirector } from './expression-engine.js';
import { getMaterial } from './materials.js';
import { clamp } from './math.js';
import { haptic } from '../../src/engine/haptics.js';

export class Companion {
  /**
   * @param {HTMLElement} stage  element that receives touches (the Mallow canvas fills it)
   * @param {object} o
   * @param {string} o.mallowId
   * @param {string} [o.material]
   * @param {string} [o.quality]
   * @param {import('./sound-engine.js').SoundEngine} o.sound
   * @param {import('./prefs.js').Prefs} o.prefs
   * @param {(e:{type:string, tag?:string, label:string})=>void} [o.onEvent]
   * @param {object} [o.rig]  extra MallowRig options (fit, baseline…)
   */
  constructor(stage, o) {
    this.stage = stage;
    this.o = o;
    this.id = o.mallowId;
    this.sound = o.sound;
    this.prefs = o.prefs;
    this.onEvent = o.onEvent || (() => {});
    this.rig = new SoftMallow(stage, {
      id: this.id, material: o.material || 'marshmallow', quality: o.quality || 'high',
      reducedMotion: o.prefs.reducedMotion(), haptics: false, audio: null,
      fit: 0.6, baseline: 0.8, ...(o.rig || {}),
    });
    this.rig.showMesh = !!o.prefs.get('showMesh');
    this.persona = new Personality(this.id, { seed: o.seed ?? 7, style: o.prefs.get('style') });
    this.director = new ExpressionDirector(this.rig);
    this.wheel = { v: 0, lastT: 0, active: false, peak: 0 };
    this.hold = null;
    this.drag = null;
    this.sq = null;
    this.strokeSnd = null;
    this.stretchSnd = null;
    this.nextNuzzle = 0;
    this.lastT = 0;
    this.ready = this.rig.softReady;
    this.rig.on('impact', ({ strength }) => { if (strength > 0.15) this.sound.impact(this.mat(), strength); });
    this.rig.on('settle', () => { if (this._wasActive) this.sound.settle(this.mat()); this._wasActive = false; });
    this.gestures = bindGestures(stage, {
      hitTest: (x, y) => this.rig.hitTest(x, y),
      onGesture: (type, d) => this.handle(type, d),
      onWheel: (dy, x, y) => this._wheel(dy, x, y),
      onHover: (x, y) => this.rig.lookAtScreen(x, y),
    });
    this._raf = 0;
    this._loop = this._loop.bind(this);
    this._vis = () => { if (!document.hidden) this._kick(); };
    document.addEventListener('visibilitychange', this._vis);
    this._kick();
  }

  mat() { return getMaterial(this.rig.material); }

  _kick() { if (!this._raf) this._raf = requestAnimationFrame(this._loop); }

  _loop(t) {
    this._raf = 0;
    if (this.destroyed || document.hidden) return;
    const dt = Math.min(0.05, (t - (this.lastT || t)) / 1000);
    this.lastT = t;
    this.gestures.tick(t);
    this.persona.tick(dt);
    if (!this.hold && !this.drag && !this.sq && !this.stroking) this.director.setRest(this.persona.restExpression());
    this.director.tick(dt);
    this._tickWheel(t);
    this._tickHold(dt, t);
    if (this.stretchSnd && this.drag) {
      const m = this.rig.metrics();
      if (m) this.stretchSnd.update(clamp(m.offset * 3, 0, 1), clamp(this.drag.speed / 1500, 0, 1));
    }
    this.o.onFrame?.(t, dt);
    this._raf = requestAnimationFrame(this._loop);
  }

  _haptic(kind) { if (this.prefs.get('haptics')) haptic(kind); }

  _emit(type, r, label) { this.onEvent({ type, tag: r?.tag, label }); }

  /** Apply a personality response. */
  _apply(r) {
    if (!r) return;
    if (r.mix) this.director.play(r.mix, r.i ?? 0.6, r.hold ?? 1.2);
    if (r.react) this.rig.react(r.react);
    if (r.voice) this.sound.voice(this.id, r.voice, r.i ?? 0.6);
  }

  // ---------------------------------------------------------- gestures --
  handle(type, d = {}) {
    const rig = this.rig;
    this._wasActive = true;
    switch (type) {
      case 'contact':
        this.sound.unlock();
        rig.lookAtScreen(d.x, d.y);
        break;
      case 'tap': {
        const r = this.persona.respond('tap', d);
        rig.lookAtScreen(d.x, d.y);
        rig.poke(d.x, d.y, 0.9 * (r?.poke ?? 1));
        this.sound.poke(this.mat(), 0.6, this._pan(d.x));
        this._apply(r);
        this._haptic('light');
        this._emit('tap', r, d.streak >= 3 ? `Tap ×${d.streak}` : 'Tap');
        break;
      }
      case 'doubletap': {
        const r = this.persona.respond('doubletap', d);
        rig.poke(d.x, d.y, 1.2);
        this._apply(r);
        this._haptic('pop');
        this._emit('doubletap', r, 'Double tap');
        break;
      }
      case 'holdstart': {
        this.hold = { x: d.x, y: d.y, t: 0, depth: 0 };
        this.nextNuzzle = 1.8;
        const r = this.persona.respond('holdstart', d);
        this._apply(r);
        this._haptic('soft');
        this._emit('hold', r, 'Hold');
        break;
      }
      case 'holding': {
        if (this.hold) { this.hold.x = d.x; this.hold.y = d.y; }
        this._apply(this.persona.respond('holding', d));
        break;
      }
      case 'holdend': {
        rig.setPress(0, 0, 0);
        this.hold = null;
        this.director.clear();
        const r = this.persona.respond('holdend', d);
        this._apply(r);
        this._emit('holdend', r, 'Let go');
        break;
      }
      case 'dragstart': {
        rig.grab(1, d.x0, d.y0);
        rig.moveGrab(1, d.x, d.y);
        this.drag = { x0: d.x0, y0: d.y0, speed: 0 };
        this.stretchSnd = this.sound.stretch(this.mat());
        const r = this.persona.respond('dragstart', d);
        this._apply(r);
        this._emit('drag', r, d.y > d.y0 + 4 ? 'Press' : 'Stretch');
        break;
      }
      case 'drag':
        if (!this.drag) break;
        rig.moveGrab(1, d.x, d.y);
        rig.lookAtScreen(d.x, d.y);
        this.drag.speed = Math.hypot(d.vx, d.vy);
        if (d.dy > 30 && !this.drag.squished) { this.drag.squished = true; this.sound.squish(this.mat(), 0.5); }
        break;
      case 'dragend': {
        if (!this.drag) break;
        const stretch = rig.release(1, d.fling ? d.vx : 0, d.fling ? d.vy : 0);
        this.stretchSnd?.end(); this.stretchSnd = null;
        this.drag = null;
        this.director.clear();
        if (d.converted) break;
        this.sound.release(this.mat(), clamp(stretch * 2.5 + (d.fling ? 0.3 : 0), 0.1, 1), this._pan(d.x));
        const r = this.persona.respond('dragend', d);
        this._apply(r);
        this._haptic(d.fling ? 'pop' : 'soft');
        this._emit('release', r, d.fling ? 'Fling' : 'Release');
        break;
      }
      case 'strokestart':
        this.stroking = true;
        this.strokeSnd = this.sound.brush();
        this.persona.respond('strokestart', d);
        this._emit('stroke', null, 'Stroke');
        break;
      case 'stroke': {
        rig.brush(d.x, d.y, d.vx, d.vy);
        rig.lookAtScreen(d.x, d.y);
        // lean into the hand
        rig.body.leanV += clamp(d.vx / 3000, -0.4, 0.4) * (rig.opts.reducedMotion ? 0.2 : 0.6);
        this.strokeSnd?.update(clamp(d.speed / 1500, 0, 1));
        const r = this.persona.respond('stroke', d);
        if (r) { this._apply(r); this._emit('stroke', r, r.tag === 'stroke-tickle' ? 'Tickle' : 'Stroke'); }
        break;
      }
      case 'strokeend': {
        this.stroking = false;
        this.strokeSnd?.end(); this.strokeSnd = null;
        this.director.clear();
        const r = this.persona.respond('strokeend', d);
        this._apply(r);
        this._emit('strokeend', r, 'Stroke');
        break;
      }
      case 'squeezestart': {
        this.sq = { peak: 0, step: 0 };
        const r = this.persona.respond('squeezestart', d);
        this._apply(r);
        this._emit('squeeze', r, 'Squeeze');
        break;
      }
      case 'squeeze': {
        if (!this.sq) break;
        const a = d.amount;
        rig.setSqueeze(a > 0 ? a * 1.6 : a * 1.4, d.angle, d.cx);
        this.sq.peak = Math.max(this.sq.peak, a);
        const step = a > 0.55 ? 3 : a > 0.3 ? 2 : a > 0.1 ? 1 : 0;
        if (step > this.sq.step) { this.sound.squish(this.mat(), step / 3); this._haptic(step === 3 ? 'pop' : 'light'); }
        this.sq.step = step;
        break;
      }
      case 'squeezeend': {
        if (!this.sq) break;
        rig.setSqueeze(0);
        const peak = this.sq.peak;
        this.sq = null;
        this.director.clear();
        this.sound.release(this.mat(), clamp(peak * 1.6, 0.15, 1));
        const r = this.persona.respond('squeezeend', { peak });
        this._apply(r);
        this._haptic('soft');
        this._emit('release', r, 'Release');
        break;
      }
      default: break;
    }
  }

  _pan(x) { return clamp((x - this.rig.W / 2) / (this.rig.W / 2), -1, 1) * 0.5; }

  _tickHold(dt) {
    const h = this.hold;
    if (!h) return;
    h.t += dt;
    // the finger sinks in a little, then rests
    h.depth = Math.min(0.085, h.depth + dt * 0.08);
    this.rig.setPress(h.x, h.y, h.depth);
    this.nextNuzzle -= dt;
    if (this.nextNuzzle <= 0) {
      this.nextNuzzle = 2.6 + (h.t % 1.3);
      const dir = Math.sign(h.x - this.rig.CX) || 1;
      if (!this.rig.opts.reducedMotion) this.rig.body.leanV += 0.25 * dir;
      this.sound.voice(this.id, 'coo', 0.35);
    }
  }

  // desktop: the scroll wheel squeezes
  _wheel(dy) {
    this.sound.unlock();
    const w = this.wheel;
    if (!w.active) { w.active = true; w.peak = 0; w.step = 0; this.handle('squeezestart', {}); this.sq = this.sq || { peak: 0, step: 0 }; }
    w.v = clamp(w.v + dy * 0.0016, 0, 1);
    w.lastT = performance.now();
    this.handle('squeeze', { amount: w.v, angle: Math.PI / 2 });
  }

  _tickWheel(t) {
    const w = this.wheel;
    if (!w.active || t - w.lastT < 160) return;
    w.v = Math.max(0, w.v - 0.06);
    this.handle('squeeze', { amount: w.v, angle: Math.PI / 2 });
    if (w.v <= 0) { w.active = false; this.handle('squeezeend', {}); }
  }

  // ------------------------------------------------- accessible actions --
  /** Point on the body for button-driven gestures. */
  _spot(fy = 0.3) {
    const r = this.rig, s = r.soft;
    if (!s) return [r.W / 2, r.H / 2];
    return [r.CX, r.BASE - s.H * r.S * (1 - fy)];
  }

  /**
   * Gestures without gestures. kind: tap | double | holdStart | holdEnd | stroke | squeezeStart | squeezeEnd | stretch
   */
  act(kind) {
    this.sound.unlock();
    const [x, y] = this._spot(0.25);
    switch (kind) {
      case 'tap': this.handle('tap', { x, y, streak: 1 }); break;
      case 'double': this.handle('doubletap', { x, y }); break;
      case 'holdStart': if (!this.hold) this.handle('holdstart', { x, y }); break;
      case 'holdEnd': if (this.hold) this.handle('holdend', { x, y, dur: 0 }); break;
      case 'stroke': this._autoStroke(); break;
      case 'squeezeStart': this._btnSqueeze(true); break;
      case 'squeezeEnd': this._btnSqueeze(false); break;
      case 'stretch': this._autoStretch(); break;
      default: break;
    }
  }

  _btnSqueeze(on) {
    clearInterval(this._sqTimer);
    if (on) {
      if (!this.sq) this.handle('squeezestart', {});
      let a = 0;
      this._sqTimer = setInterval(() => { a = Math.min(0.7, a + 0.06); this.handle('squeeze', { amount: a, angle: Math.PI / 2 }); }, 30);
    } else if (this.sq) this.handle('squeezeend', {});
  }

  _autoStroke() {
    if (this._auto) return;
    const r = this.rig, s = r.soft;
    if (!s) return;
    const w = s.W * r.S * 0.32, [cx, cy] = this._spot(0.3);
    let i = 0;
    this.handle('strokestart', { x: cx - w, y: cy });
    this._auto = setInterval(() => {
      i++;
      const ph = i / 40;
      const x = cx + Math.sin(ph * Math.PI * 3) * w, vx = Math.cos(ph * Math.PI * 3) * w * Math.PI * 3 / 1.2;
      this.handle('stroke', { x, y: cy + Math.sin(ph * Math.PI * 6) * 6, vx, vy: 0, speed: Math.abs(vx) * 0.6 });
      if (i >= 40) { clearInterval(this._auto); this._auto = null; this.handle('strokeend', { dur: 1200, dist: w * 6 }); }
    }, 30);
  }

  _autoStretch() {
    if (this._auto) return;
    const [x, y] = this._spot(0.08), r = this.rig, s = r.soft;
    if (!s) return;
    const up = s.H * r.S * 0.45;
    let i = 0;
    this.handle('dragstart', { x0: x, y0: y, x, y });
    this._auto = setInterval(() => {
      i++;
      const k = Math.min(1, i / 18);
      this.handle('drag', { x: x + Math.sin(k * 2) * 8, y: y - up * k * k * (3 - 2 * k), dx: 0, dy: -up * k, vx: 0, vy: -300 });
      if (i >= 26) { clearInterval(this._auto); this._auto = null; this.handle('dragend', { x, y: y - up, dx: 0, dy: -up, vx: 0, vy: 0, fling: false }); }
    }, 30);
  }

  // ---------------------------------------------------------- settings --
  /** Re-frame the Mallow (e.g. when controls change height). baseline/fit are fractions of the stage. */
  setLayout({ baseline, fit } = {}) {
    if (baseline != null) this.rig.opts.baseline = baseline;
    if (fit != null) this.rig.opts.fit = fit;
    this.rig._resize();
  }

  setMaterial(id) { this.rig.setMaterial(id); }
  setStyle(s) { this.persona.setStyle(s); }
  setReducedMotion(b) { this.rig.setReducedMotion(b); }
  setShowMesh(b) { this.rig.showMesh = !!b; }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this._raf);
    clearInterval(this._sqTimer); clearInterval(this._auto);
    document.removeEventListener('visibilitychange', this._vis);
    this.gestures.dispose();
    this.stretchSnd?.end(); this.strokeSnd?.end();
    this.rig.destroy();
  }
}
