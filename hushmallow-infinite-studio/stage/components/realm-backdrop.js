// Offline driver for an approved Hushfold realm (src/world/realm.js).
//
// Mounts the realm exactly as the app does, then takes the wheel:
//   * the engine's rAF loop is parked by clock.js; we step it with the
//     realm's own manual hook, handle.debug.frame(dtMs)
//   * the backing store is raised above the realm's 1.5× cap so the
//     compositor can push the camera in without upscaling the painting
//   * the parallax camera (st.camX / camY) is driven by the stage camera
//   * pulses run under virtual time so the photosensitivity throttle and
//     any timers behave deterministically
//
//   const realm = await RealmBackdrop.mount(container, 'moonmilk-cove', { dpr: 1.8, groundY: 0.8 });
//   realm.setMood({...}); realm.transform(p); realm.camera(x, y); realm.step(dtMs);
//   ctx.drawImage(realm.canvas, ...)

import { mountRealm } from '../../../hushmallow/src/world/realm.js';

export class RealmBackdrop {
  static mount(container, realmId, opts = {}) {
    const h = mountRealm(container, realmId, {
      mood: opts.mood, transform: opts.transform ?? 0, groundY: opts.groundY ?? 0.8,
      reducedMotion: false, lowStimulation: false, quality: 'high',
    });
    return new RealmBackdrop(h, opts);
  }

  constructor(h, opts) {
    this.h = h;
    this.st = h.debug.state;
    this.canvas = h.canvas;
    this.timers = [];
    this.simMs = 0;
    // raise the backing resolution (the engine caps dpr at 1.5); one rebuild,
    // then nothing in this render ever sets needBuild again
    if (opts.dpr && opts.dpr !== this.st.dpr) {
      this.st.dpr = opts.dpr;
      this.canvas.width = Math.round(this.st.W * opts.dpr);
      this.canvas.height = Math.round(this.st.H * opts.dpr);
      h.setLowStimulation(false);   // → realm.build(st) at the new dpr
    }
    // stage-driven parallax: step() writes are ignored, every layer reads ours
    this._cam = { x: 0, y: 0 };
    const cam = this._cam;
    Object.defineProperty(this.st, 'camX', { get: () => cam.x, set() {}, configurable: true });
    Object.defineProperty(this.st, 'camY', { get: () => cam.y, set() {}, configurable: true });
  }

  get W() { return this.st.W; }
  get H() { return this.st.H; }

  setMood(m) { this.h.setMood(m); return this; }
  transform(p) { this.h.transform(p); return this; }
  /** Parallax offset in CSS px at depth 1 (safe: |x| ≲ 28, y ∈ [-30, 20]). */
  camera(x, y) { this._cam.x = Math.max(-28, Math.min(28, x)); this._cam.y = Math.max(-30, Math.min(20, y)); return this; }

  pulse(kind, nx, ny) {
    const sT = window.setTimeout;
    window.setTimeout = (fn, ms = 0) => { this.timers.push({ at: this.simMs + ms, fn }); return 0; };
    try { this.h.pulse(kind, { nx, ny }); } finally { window.setTimeout = sT; }
    return this;
  }

  /** Settle mood/transform easing instantly (use once before recording). */
  settle() { this.h.debug.settle(); return this; }

  step(dtMs) {
    this.simMs += dtMs;
    this.timers.sort((a, b) => a.at - b.at);
    while (this.timers.length && this.timers[0].at <= this.simMs) this.timers.shift().fn();
    this.h.debug.frame(dtMs);
    return this;
  }
}
