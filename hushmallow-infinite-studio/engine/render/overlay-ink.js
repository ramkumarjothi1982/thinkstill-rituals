// P2 (profile feature overlaySkip): know whether anything is drawn on the
// overlay canvas.
//
// A direction paints its type through the stage's overlay context every frame,
// typically a clearRect of the whole canvas and then its text. v2's overlay is
// empty for 8.7 of its 15 s, yet stage2 uploaded all 8 MB of it and composited
// it every frame. trackInk() wraps the context: every painting call marks the
// canvas inked; a clearRect that covers the whole canvas (not inside save(),
// and never after a clip at the top level) marks it clean, and is skipped when
// the canvas is clean already. The stage neither uploads nor composites a clean
// overlay. Compositing a transparent overlay (o = 0: c = 0 + c·1) changes no
// pixel, so the step is bit-identical.

const PAINT = ['fillRect', 'strokeRect', 'fillText', 'strokeText', 'fill', 'stroke', 'drawImage', 'putImageData'];

/** Wrap a 2D context of a w×h canvas. → live state { inked } */
export function trackInk(ctx, w, h) {
  const st = { inked: false, depth: 0, clipped: false };
  for (const name of PAINT) {
    const paint = ctx[name];
    ctx[name] = function (...args) { st.inked = true; return paint.apply(this, args); };
  }
  const { save, restore, clip, clearRect, reset } = ctx;
  ctx.save = function () { st.depth++; return save.call(this); };
  ctx.restore = function () { st.depth = Math.max(0, st.depth - 1); return restore.call(this); };
  ctx.clip = function (...args) { if (st.depth === 0) st.clipped = true; return clip.apply(this, args); };
  if (reset) ctx.reset = function () { Object.assign(st, { inked: false, depth: 0, clipped: false }); return reset.call(this); };
  ctx.clearRect = function (x, y, cw, ch) {
    const m = this.getTransform();
    const xs = [m.a * x + m.e, m.a * (x + cw) + m.e], ys = [m.d * y + m.f, m.d * (y + ch) + m.f];
    const whole = st.depth === 0 && !st.clipped && m.b === 0 && m.c === 0
      && Math.min(...xs) <= 0 && Math.max(...xs) >= w && Math.min(...ys) <= 0 && Math.max(...ys) >= h;
    if (whole && !st.inked) return;                     // already transparent
    clearRect.call(this, x, y, cw, ch);
    if (whole) st.inked = false;
  };
  return st;
}
