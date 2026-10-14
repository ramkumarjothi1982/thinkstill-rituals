// A Mallow's animated face, drawn at the approved artwork's full resolution
// into an art-space canvas that the soft-body mesh then deforms together with
// the body (so the face can never slide off or warp differently).
//
// Style is matched to the approved painting: every line is a glossy navy
// "gummy" tube (tube.js) — slightly fuller in the middle, round ends, a thin
// bright specular along the top edge, small highlight beads near the ends and a
// saturated blue glow where the groove meets the skin. Open eyes follow the
// approved Hushmallow rig (sclera, navy galaxy iris, lid line), procedurally
// reconstructed so they stay sharp at any size (features.js). Geometry of the
// approved rig (rig.js eyeGeom/drawEye/drawMouth/drawBrow) is reused so
// expressions read the same as in the app.
//
// Engine fork of stage2/face.js (frozen), split into modules by WP-02. Face
// keeps the approved contract the v2 direction uses: `draw(params)` redraws
// when the expression changed, exactly as before (the exact profile). WP-02
// adds the engine-driven path of the face cache (cache.js, renderer/passes/face.js):
//   - while the renderer captures (cache.js facePolicy), draw() records its
//     parameters instead of drawing;
//   - render(P) draws already quantised parameters with the approved tubes into
//     the art-size canvas, scratch canvas cleared first, so the result does not
//     depend on earlier draws.

import { NEUTRAL, specFromRig, specFromDerived } from './params.js';
import { legacyTube } from './tube.js';
import { drawEye, drawBrow, drawMouth, drawBlush } from './features.js';
import { facePolicy } from './cache.js';

export { NEUTRAL, specFromRig, specFromDerived };

/** Clear the face box, clip to it, and draw every feature with `tube` (the approved order). */
function paint(ctx, box, spec, P, tube) {
  const [x0, y0, x1, y1] = box;
  ctx.save();
  ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  drawBlush(ctx, spec, P);
  drawBrow(ctx, tube, spec, 'L', P);
  drawBrow(ctx, tube, spec, 'R', P);
  drawEye(ctx, tube, spec, 'L', P);
  drawEye(ctx, tube, spec, 'R', P);
  drawMouth(ctx, tube, spec, P);
  ctx.restore();
}

export class Face {
  constructor(spec, canvas) {
    this.spec = spec;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tmp = document.createElement('canvas');
    this.tmp.width = 1024; this.tmp.height = 512;
    // only the face region is ever touched
    const xs = [spec.eyes.L.x - spec.eyes.L.r * 2, spec.eyes.R.x + spec.eyes.R.r * 2, spec.cheeks.L[0] - spec.cheeks.L[2] * 2, spec.cheeks.R[0] + spec.cheeks.R[2] * 2];
    const ys = [spec.brows.L.c[1] - spec.eyes.L.r * 1.8, spec.mouth.y + spec.mouth.w * 0.9];
    this.box = [Math.floor(Math.min(...xs)), Math.floor(Math.min(...ys)), Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...ys))];
    this.last = '';
  }

  /** Redraw if the expression changed. Returns true when the canvas was updated. */
  draw(params) {
    if (facePolicy.capture) { facePolicy.capture.push({ face: this, params }); return false; }   // the face cache asks
    const P = { ...NEUTRAL, ...params };
    const key = JSON.stringify(P, (k, v) => (typeof v === 'number' ? Math.round(v * 2000) / 2000 : v));
    if (key === this.last) return false;
    this.last = key;
    const { ctx, tmp, spec } = this;
    paint(ctx, this.box, spec, P, (pts, lw, alpha, opts) => legacyTube(ctx, tmp, pts, lw, alpha, opts));
    return true;
  }

  /**
   * Draw complete, already quantised parameters (the face cache decides when)
   * with the approved tubes into the art-size canvas. → the canvas drawn into
   */
  render(P) {
    this.last = '';                     // draw()'s cache no longer describes the canvas
    const { ctx, tmp, spec } = this;
    const g = tmp.getContext('2d');     // no stale scratch texels from earlier draws (CONVENTIONS §7)
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, tmp.width, tmp.height);
    paint(ctx, this.box, spec, P, (pts, lw, alpha, opts) => legacyTube(ctx, tmp, pts, lw, alpha, opts));
    return this.canvas;
  }
}
