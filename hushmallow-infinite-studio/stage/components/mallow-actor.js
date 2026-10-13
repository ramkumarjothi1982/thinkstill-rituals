// A directable, offline Mallow built on the approved rig (src/mallows/rig.js).
//
// MallowActor is a thin subclass of MallowRig — nothing in the engine is
// edited. It adds what a hand-directed shot needs:
//   * a higher skin resolution than the rig's live-screen cap (1.25), so the
//     procedurally drawn face stays razor sharp when the camera pushes in
//   * choreography control: random idle reactions, random blinks and random
//     saccades are switched off; blinks and gaze are directed per frame
//   * pose(): set any raw rig parameters (eyeOpen, lookX, squashBias, …)
//     through the rig's own expression path, springs and all
//   * impulse(): kick the soft-body physics (squash, hop, lean, shear, tilt)
//   * anchors in stage CSS px (head top, eye midpoint, body box) so other
//     layers (thought bubbles, light passes) can follow the body
//
//   const noomi = await MallowActor.create(host, 'noomi', { fit: 0.55, baseline: 0.8 });
//   noomi.pose({ eyeOpen: 1.3, eyeScale: 1.15 });
//   noomi.look(0.4, -0.3);  noomi.blinkNow();  noomi.impulse({ squash: -0.3 });
//   noomi.tick(1/30);  ctx.drawImage(noomi.canvas, 0, 0, 720, 1280);

import { MallowRig } from '../../../hushmallow/src/mallows/rig.js';

export class MallowActor extends MallowRig {
  static async create(container, id, opts = {}) {
    const a = new MallowActor(container, {
      id, interactive: false, pristine: true, haptics: false, audio: null,
      particles: true, shadow: true, aura: true, reducedMotion: false, ...opts,
    });
    await a.loaded;
    a._directed = true;
    a._resize();
    a._installRestFade();
    return a;
  }

  // The rig shows the untouched approved art whenever the face is at rest,
  // fading it IN softly but cutting it OUT in one frame when the face moves.
  // That cut is invisible under a big action (eyes popping open) but shows on
  // a subtle one. restFade (seconds) lets a shot fade the approved art out
  // instead; 0 keeps the rig's own hard cut.
  _installRestFade() {
    let shown = this.restMix ?? 1;
    this.restFade = 0;
    Object.defineProperty(this, 'restMix', {
      configurable: true,
      get: () => shown,
      set: (raw) => {
        if (raw >= shown || !this.restFade) shown = raw;
        else shown = Math.max(raw, shown - (this._dt || 1 / 60) / this.restFade);
      },
    });
  }

  _resize() {
    super._resize();
    // the live rig caps the skin at 1.25× source px; for a 1080p master we
    // render the face at (on-screen scale × device px × headroom for push-ins)
    const head = this.opts.skinHeadroom ?? 1.3;
    const q = Math.min(3.2, Math.max(1, this.S * this.dpr * head));
    if (this.mallow && Math.abs(q - this.q) > 1e-6) {
      this.q = q;
      this.skin.width = Math.ceil(this.mallow.size[0] * q);
      this.skin.height = Math.ceil(this.mallow.size[1] * q);
      this.skinDirty = true;
    }
  }

  /** Raw parameter targets on top of the Mallow's own neutral (absolute values). */
  pose(params = {}, { anticipate = false } = {}) {
    this._lastPose = params;
    return this.setEmotion({ neutral: 1 }, 0, { extra: params, quiet: !anticipate });
  }

  /** Direct the gaze (-1..1, + = right / down). null releases it. */
  look(x, y) {
    if (x == null) { this.pointerLook = null; return this; }
    this.pointerLook = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), t: this.time };
    return this;
  }

  // (named blinkNow: the rig keeps its blink timer state in `this.blink`)
  blinkNow() { this._blinkNow(); return this; }

  /** Soft-body kicks, in the same units the rig's reactions use. */
  impulse({ squash = 0, hop = 0, lean = 0, shear = 0, tilt = 0 } = {}) {
    const b = this.body;
    if (squash) b.squashV += squash * 6;
    if (hop && b.grounded) { b.hopV = Math.sqrt(2 * 9.8 * hop * 0.14); b.grounded = false; b.squash += 0.06; }
    if (lean) b.leanV += lean * 4;
    if (shear) b.shearV += shear * 5;
    if (tilt) b.tiltV += tilt * 60;
    return this;
  }

  burst(kind, n, opts = {}) { this.particles.burst({ kind, n }, opts); return this; }

  /** Advance one frame (rig springs + body physics + particles + render). */
  tick(dt) {
    // directed performance: no unscripted idles, blinks or saccades
    this.cycles.idle = 1e9;
    this.blink.next = 1e9;
    if (this.sacc) { this.sacc.next = 1e9; this.sacc.x = 0; this.sacc.y = 0; }
    if (this.pointerLook) this.pointerLook.t = this.time;   // keep directed gaze alive
    this._tick(dt, this.time + dt);
    return this;
  }

  // ----------------------------------------------------------- anchors --
  get bodyMetrics() {
    const [bx0, by0, bx1, by1] = this.mallow.bodyBox;
    const shrink = 1 - Math.max(0, Math.min(1, this.val.shrink)) * 0.12;
    const S = this.S * shrink;
    const b = this.body;
    const sy = (1 - b.squash);
    const sx = (1 + b.squash * 0.62);
    const floatY = (this.val.float * 0.07 + Math.sin(this.time * 0.9) * this.val.float * 0.012) * this.H;
    const lift = b.hop * this.H + floatY;
    const w = (bx1 - bx0) * S * sx, h = (by1 - by0) * S * sy;
    const base = this.BASE - lift;
    return { S, sx, sy, w, h, base, top: base - h, cx: this.CX, lift, by1, bx0, bx1, cxs: (bx0 + bx1) / 2 };
  }

  /** Stage px of a point given in the approved PNG's pixel space. */
  toStage(px, py) {
    const m = this.bodyMetrics;
    return { x: m.cx + (px - m.cxs) * m.S * m.sx, y: m.base - (m.by1 - py) * m.S * m.sy };
  }

  get eyeMid() {
    const e = this.mallow.face.eyes;
    return this.toStage((e.L.x + e.R.x) / 2, (e.L.y + e.R.y) / 2);
  }

  get headTop() {
    const m = this.bodyMetrics;
    return { x: m.cx, y: m.top };
  }
}
