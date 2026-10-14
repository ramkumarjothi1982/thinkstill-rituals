// Scratch layers of the fast face renderer (tube.js fastTube).
//
// The approved tube spends ~85 % of a face redraw in ctx.filter blurs at full
// art resolution (measured in WP-02: 155–294 ms per redraw with them, 21–50 ms
// without). Every blurred element of the tube is soft by construction, so the
// fast renderer blurs it at reduced resolution and draws the result back with
// bilinear upscaling:
//   - the glow and the light band under each stroke at 1/4 resolution (blur
//     sigma 0.26 and 0.3 × line width: 1.4–1.7 quarter-res px for Noomi),
//   - the soft inner bands of the stroke body (core, upper and lower band) at
//     1/2 resolution; the body's outer edge stays crisp at full resolution.
//
// Unlike the approved renderer's shared scratch canvas (Face.tmp, CONVENTIONS
// §7), every layer is cleared over its whole area before each use, so a draw
// never reads texels left by an earlier stroke or frame: the fast face is a
// pure function of its parameters, whatever was rendered before.

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/** Grow a canvas to at least w×h (never shrinks, so sizes settle after the first frames). */
function ensure(c, w, h) {
  if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
  return c;
}

export class FaceLayers {
  /** glow: draw the blurred glow and light band (false in the draft profile). */
  constructor({ glow = true } = {}) {
    this.glow = glow;
    this.full = canvas(512, 256);      // the stroke body at full resolution (crisp edge)
    this.half = canvas(256, 128);      // the body's soft inner bands at 1/2
    this.quarter = canvas(128, 64);    // a glow silhouette at 1/4
    this.blurred = canvas(128, 64);    // ... and blurred
  }

  /** A context for `c` reset to identity, source-over, no filter, after clearing all of it. */
  static clean(c) {
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.filter = 'none';
    g.clearRect(0, 0, c.width, c.height);
    return g;
  }

  /**
   * Draw a blurred silhouette into ctx at 1/4 resolution. box: { x, y, w, h }
   * art-px region holding the silhouette with room for the blur; fill(g) draws
   * the silhouette in art px; sigma: blur in art px. Drawn with ctx's current
   * globalAlpha and composite operation.
   */
  blurredQuarter(ctx, box, fill, sigma) {
    const k = 0.25, m = 1;                                   // 1 px transparent margin around the layer
    const qw = Math.ceil(box.w * k) + 2 * m, qh = Math.ceil(box.h * k) + 2 * m;
    const q = FaceLayers.clean(ensure(this.quarter, qw, qh));
    q.setTransform(k, 0, 0, k, m - box.x * k, m - box.y * k);
    fill(q);
    const b = FaceLayers.clean(ensure(this.blurred, qw, qh));
    b.filter = `blur(${(sigma * k).toFixed(2)}px)`;
    b.drawImage(this.quarter, 0, 0, qw, qh, 0, 0, qw, qh);
    b.filter = 'none';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.blurred, 0, 0, qw, qh, box.x - m / k, box.y - m / k, qw / k, qh / k);
  }
}

export { ensure as ensureCanvas };
