// The overlay ink tracker (engine/render/overlay-ink.js, WP-02 P2): pure logic, no browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackInk } from '../../engine/render/overlay-ink.js';

/** A minimal 2D context: records clears and paints, with a settable transform. */
function fakeCtx() {
  const log = [];
  const ctx = {
    m: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    getTransform() { return this.m; },
    clearRect(...a) { log.push(['clear', ...a]); },
    save() {}, restore() {}, clip() {},
  };
  for (const k of ['fillRect', 'strokeRect', 'fillText', 'strokeText', 'fill', 'stroke', 'drawImage', 'putImageData']) ctx[k] = () => log.push([k]);
  return { ctx, log };
}

test('overlay ink: clean until painted; a whole-canvas clear cleans it and is skipped when already clean', () => {
  const { ctx, log } = fakeCtx();
  const ink = trackInk(ctx, 1080, 1920);
  assert.equal(ink.inked, false);
  ctx.clearRect(0, 0, 1080, 1920);
  assert.equal(log.length, 0, 'clearing a clean canvas is skipped');
  ctx.drawImage();
  assert.equal(ink.inked, true);
  ctx.clearRect(0, 0, 1080, 1920);
  assert.deepEqual(log.at(-1), ['clear', 0, 0, 1080, 1920]);
  assert.equal(ink.inked, false);
  // a partial clear neither skips nor cleans
  ctx.fillText();
  ctx.clearRect(0, 0, 500, 500);
  assert.equal(ink.inked, true);
  // inside save() a whole clear still clears but cannot be trusted to clean (a clip may be active)
  ctx.save(); ctx.clearRect(0, 0, 1080, 1920); ctx.restore();
  assert.equal(ink.inked, true);
});

test('overlay ink: the design-space transform of a scaled render, and a top-level clip', () => {
  const { ctx } = fakeCtx();
  ctx.m = { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0 };          // a 0.5-scale render draws in design space
  const ink = trackInk(ctx, 540, 960);
  ctx.fill();
  ctx.clearRect(0, 0, 1080, 1920);
  assert.equal(ink.inked, false, 'design-space clear covers the scaled canvas');
  const b = fakeCtx(); const ink2 = trackInk(b.ctx, 1080, 1920);
  b.ctx.clip(); b.ctx.fill(); b.ctx.clearRect(0, 0, 1080, 1920);
  assert.equal(ink2.inked, true, 'after a top-level clip no clear counts as whole');
});
