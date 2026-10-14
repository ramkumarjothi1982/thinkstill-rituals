// Engine stage: runs one direction and renders its frames through the WebGL
// renderer. Fork of stage2/stage.js (frozen), split in two: this module is a
// side-effect-free library (the frozen v2 direction imports loadImage and
// silhouette from it through the import map in index.html), and main.js is the
// page entry that builds the stage and loads the direction.
//
// Same frame model as stage2: frame i is the average of N sub-frame states
// centred on t = i / fps over the shutter, plus one centre state for the world,
// post, overlay and audio curves. Engine changes:
//   - design size and render scale are parameters (see renderer.js)
//   - curves come only from dryRun(), never from rendering (R12): rendering a
//     frame twice or out of order can no longer corrupt the cue log
//   - a non-finite or out-of-range subframes() falls back to 16 with a logged
//     error instead of producing a black frame (R18)
//   - binary readback: readback(url) POSTs the raw RGBA frame to the local
//     frame sink (render/serve.mjs) instead of base64 through the debugger, and
//     the upload overlaps the next frame's render (one frame in flight)
//   - prime(a, k) replays the face draws of the k frames before a, so a segment
//     started in a fresh page reproduces the in-order render history (Face.tmp)
//   - dispose() frees everything a direction created (R4)

import { clock } from './runtime/clock.js';   // deterministic time + seeded randomness (first)
import { createGL } from './gl.js';
import { Renderer, DESIGN_W, DESIGN_H } from './renderer.js';
import { assetLog } from './runtime/asset-log.js';

/** Sub-frame count used when a direction's subframes() returns garbage (R18). */
export const SUBFRAME_FALLBACK = 16;
/** Above this a subframes() value is treated as garbage too (it would only stall the watchdog). */
export const SUBFRAME_MAX = 64;

async function loadFonts() {
  const url = new URL('../../hushmallow/assets/fonts/fredoka-latin.woff2', import.meta.url).href;
  const face = new FontFace('Fredoka', `url(${url}) format("woff2")`, { weight: '300 700', style: 'normal' });
  await face.load();
  document.fonts.add(face);
  await Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 40px Fredoka`)));
}

export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`load ${src}`)); i.src = src; });
}

/** Alpha silhouette metrics of an image (art px). Rows / columns count only
 *  when a meaningful run of them is solid, so stray specks are ignored. */
export function silhouette(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const cols = new Uint32Array(c.width), rows = new Uint32Array(c.height);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (d[(y * c.width + x) * 4 + 3] > 128) { cols[x]++; rows[y]++; }
  }
  const minC = c.height * 0.04, minR = c.width * 0.04;
  let x0 = 0, x1 = c.width - 1, y0 = 0, y1 = c.height - 1;
  while (x0 < x1 && cols[x0] < minC) x0++;
  while (x1 > x0 && cols[x1] < minC) x1--;
  while (y0 < y1 && rows[y0] < minR) y0++;
  while (y1 > y0 && rows[y1] < minR) y1--;
  return { x0, x1, top: y0, baseY: y1, cx: (x0 + x1) / 2, halfW: (x1 - x0) / 2, w: x1 - x0, h: y1 - y0 };
}

export class Stage {
  /**
   * canvas: the output canvas (sized here); width/height: design space; scale:
   * render scale; marks: optional runtime/marks.js corner mark; textKeys: 'content'
   * (default) or 'legacy' (stage2's key-only texture cache; sensitivity tests only).
   */
  constructor({ canvas, width = DESIGN_W, height = DESIGN_H, scale = 1, marks = null, textKeys = 'content' } = {}) {
    this.W = width; this.H = height; this.scale = scale;
    this.outW = Math.round(width * scale); this.outH = Math.round(height * scale);
    this.canvas = canvas;
    canvas.width = this.outW; canvas.height = this.outH;
    canvas.style.width = `${this.outW}px`; canvas.style.height = `${this.outH}px`;
    this.gl = createGL(canvas);
    this.renderer = new Renderer(this.gl, { width, height, scale, marks, textKeys });
    this.overlay = document.createElement('canvas');
    this.overlay.width = this.outW; this.overlay.height = this.outH;
    this.octx = this.overlay.getContext('2d');
    // directions draw the overlay in design space
    if (scale !== 1) this.octx.setTransform(scale, 0, 0, scale, 0, 0);
    this.cues = [];
    this.curves = [];
    this.errors = [];
    this.setUp = new Set();          // direction modules set up in this page (a v2 module is a singleton)
    this.clockFrames = 0;            // how many frames the virtual clock has advanced
    this.px = null;
    this.upload = null;              // the frame upload in flight (readback)
  }

  async init(video) {
    if (video.module && this.setUp.has(video.module)) {
      throw new Error(`direction ${video.meta.id} was already set up in this page; its module state cannot be reset, reload the page (R4)`);
    }
    this.video = video;
    this.fps = video.meta.fps;
    await loadFonts();
    await video.setup(this);
    if (video.module) this.setUp.add(video.module);
    return this;
  }

  cue(t, type, data = {}) { this.cues.push({ t: +t.toFixed(4), type, ...data }); }

  /** Record a runtime error (returned with the next frame result and logged by the worker). */
  error(kind, message, extra = {}) {
    const e = { kind, message, ...extra };
    this.errors.push(e);
    console.error(`[engine] ${kind}: ${message}`);
    return e;
  }

  takeErrors() { const e = this.errors; this.errors = []; return e; }

  /** subframes(t) with the R18 guard: garbage → SUBFRAME_FALLBACK and a logged error. */
  subframesAt(t) {
    const v = this.video;
    const N = v.subframes ? v.subframes(t, this) : (v.meta.subframes || 3);
    if (Number.isFinite(N) && N >= 1 && N <= SUBFRAME_MAX) return N;
    this.error('subframes', `subframes(${t}) returned ${N}; using ${SUBFRAME_FALLBACK}`, { t, value: String(N) });
    return SUBFRAME_FALLBACK;
  }

  /** Advance the virtual clock by one frame interval (the same additions as an in-order render). */
  stepClock() {
    clock.step(1000 / this.fps);
    this.clockFrames++;
  }

  /** The N sub-frame states of frame time t (centred shutter sampling). */
  subStates(t, N) {
    const fps = this.fps, shutter = this.video.meta.shutter ?? 0.5;   // fraction of the frame interval the shutter is open
    const subs = [];
    for (let k = 0; k < N; k++) {
      const ts = t + ((k + 0.5) / N - 0.5) * shutter / fps;
      subs.push(this.video.state(ts, this));
    }
    return subs;
  }

  /**
   * Render frame i (stage2-compatible). capture: true / 'png' → PNG data URL;
   * 'raw' → base64 RGBA (bottom-up rows); 'none' → render only (1-px read to
   * finish the GPU work); false → evaluate the states without rendering.
   */
  renderFrame(i, { capture = true } = {}) {
    const fps = this.fps, t = i / fps;
    this.stepClock();
    // adaptive motion blur: more sub-frames when something moves fast
    const N = this.subframesAt(t);
    this.lastSubframes = N;
    const subs = this.subStates(t, N);
    const center = this.video.state(t, this, { center: true });
    this.lastFrame = i;
    if (!capture) return null;
    const ov = this.video.overlay ? this.video.overlay(this.octx, t, this) : false;
    this.renderer.renderFrame(subs, center, ov ? this.overlay : null);
    const g = this.gl;
    if (capture === 'none') { g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4)); return null; }
    if (capture === 'raw') {
      g.readPixels(0, 0, this.outW, this.outH, g.RGBA, g.UNSIGNED_BYTE, this.pixels());
      let bin = '';
      const CH = 0x8000;
      for (let k = 0; k < this.px.length; k += CH) bin += String.fromCharCode.apply(null, this.px.subarray(k, k + CH));
      return btoa(bin);
    }
    return this.canvas.toDataURL('image/png');
  }

  pixels() {
    if (!this.px) this.px = new Uint8Array(this.outW * this.outH * 4);
    return this.px;
  }

  /** Render frame i and finish the GPU work. → { i, n (sub-frames), errors } */
  render(i) {
    this.renderFrame(i, { capture: 'none' });
    return { i, n: this.lastSubframes, errors: this.takeErrors() };
  }

  /**
   * Read the rendered frame (RGBA, bottom-up rows) and send it as raw bytes to
   * the frame sink at `url`. Returns once the pixels are copied out of WebGL;
   * the upload itself continues while the next frame renders (one frame in
   * flight). Before reading, it waits for the previous upload to be accepted,
   * which by then is normally long done, so a sink error surfaces at the next
   * readback() or at flush().
   */
  async readback(url) {
    await this.upload;
    const g = this.gl, px = this.pixels();
    g.readPixels(0, 0, this.outW, this.outH, g.RGBA, g.UNSIGNED_BYTE, px);
    // a Blob body, not the typed array itself: measured in WP-01, an ArrayBuffer-view body
    // takes ~690 ms per 8.3 MB frame before it reaches the server, a Blob ~29 ms.
    // The Blob is a copy, so px is free for the next frame at once.
    const body = new Blob([px]);
    this.upload = (async () => {
      const res = await fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/octet-stream' } });
      if (!res.ok) throw new Error(`frame sink refused frame (${res.status}): ${await res.text()}`);
    })();
    this.upload.catch(() => {});     // observed by the next readback() or flush()
    return true;
  }

  /** Wait until the last frame sent by readback() has been accepted by the sink. */
  async flush() {
    const u = this.upload;
    this.upload = null;
    await u;
    return true;
  }

  /**
   * Evaluate every frame's centre state (no rendering): the cue log, the audio
   * curves (R12: their only source) and the sub-frame count per frame.
   */
  dryRun(frames) {
    const curves = [], subframes = [];
    for (let i = 0; i < frames; i++) {
      const t = i / this.fps;
      subframes.push(this.subframesAt(t));
      const center = this.video.state(t, this, { center: true });
      if (center.audio) curves.push({ t: +t.toFixed(4), ...center.audio });
    }
    this.curves = curves;
    return { cues: this.cues, curves, subframes, errors: this.takeErrors() };
  }

  /**
   * Prepare a fresh page to render frame `a` exactly as an in-order render would:
   * advance the virtual clock past frames 0..a-1 and replay the face draws of the
   * `k` frames before `a` (the only render history in v2 is the face's scratch
   * canvas, see docs/CONVENTIONS.md §7), then upload the face once.
   */
  prime(a, k = 0) {
    if (this.clockFrames !== 0) throw new Error('prime() must run in a fresh page, before any frame');
    const from = Math.max(0, a - k);
    while (this.clockFrames < from) this.stepClock();
    let dirty = false;
    for (let f = from; f < a; f++) {
      this.stepClock();
      const t = f / this.fps;
      for (const S of this.subStates(t, this.subframesAt(t))) if (S.drawFace && S.drawFace()) dirty = true;
    }
    if (dirty) this.renderer.updateFace();
    return { a, replayed: a - from, errors: this.takeErrors() };
  }

  /** Free everything the current direction created; the stage can then load another one. */
  dispose() {
    this.video?.dispose?.(this);
    this.renderer.disposeScene();
    this.octx.save();
    this.octx.setTransform(1, 0, 0, 1, 0, 0);
    this.octx.clearRect(0, 0, this.outW, this.outH);
    this.octx.restore();
    this.video = null;
    this.upload = null;
    this.cues = [];
    this.curves = [];
    this.errors = [];
    assetLog.reset();
  }
}
