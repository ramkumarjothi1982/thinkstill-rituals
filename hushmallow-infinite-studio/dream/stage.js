// Dream stage: runs one direction and renders its frames through the dream
// renderer. Same frame model as the engine (engine/stage.js): frame i is the
// average of N sub-frame states centred on t = i / fps over the shutter, plus
// one centre state for the sky, the face, post, the type overlay and the audio
// curves. Every state is a pure function of time.
//
// Direction contract (videos/feel-something.js):
//   meta { id, title, fps, duration, shutter }
//   setup(stage)            load assets, register Mallows, log cues
//   state(t, { center })    → { cam, ph, mallows, orbs, partsBack, partsFront [, sky, post, audio, faces] }
//   subframes(t)            → sub-frame count
//   overlay(ctx, t)         draw the type in design px; true when anything is drawn

import { createGL } from '../engine/gl.js';
import { DreamRenderer } from './renderer.js';

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

export class DreamStage {
  constructor({ canvas, width = 1080, height = 1920, scale = 1, clock }) {
    this.W = width; this.H = height;
    this.outW = Math.round(width * scale); this.outH = Math.round(height * scale);
    canvas.width = this.outW; canvas.height = this.outH;
    canvas.style.width = `${this.outW}px`; canvas.style.height = `${this.outH}px`;
    this.canvas = canvas;
    this.clock = clock;
    this.gl = createGL(canvas);
    this.renderer = new DreamRenderer(this.gl, { width, height, scale });
    this.overlay = document.createElement('canvas');
    this.overlay.width = this.outW; this.overlay.height = this.outH;
    this.octx = this.overlay.getContext('2d');
    if (scale !== 1) this.octx.setTransform(scale, 0, 0, scale, 0, 0);
    this.cues = [];
    this.px = null;
    this.upload = null;
  }

  async init(video) {
    this.video = video;
    this.fps = video.meta.fps;
    await loadFonts();
    await video.setup(this);
    return this;
  }

  cue(t, type, data = {}) { this.cues.push({ t: +t.toFixed(4), type, ...data }); }

  renderFrame(i, { capture = true } = {}) {
    const v = this.video, fps = this.fps, t = i / fps;
    this.clock.step(1000 / fps);
    const N = Math.max(1, Math.min(12, v.subframes(t)));
    const sh = v.meta.shutter ?? 0.5;
    const subs = [];
    for (let k = 0; k < N; k++) subs.push(v.state(t + ((k + 0.5) / N - 0.5) * sh / fps, { center: false }));
    const C = v.state(t, { center: true });
    // faces are drawn once per frame, at the centre time
    for (const f of C.faces || []) if (f.draw()) this.renderer.updateFace(f.id);
    const ov = v.overlay(this.octx, t);
    this.renderer.frame(subs, C, ov ? this.overlay : null);
    this.lastSubframes = N;
    if (capture === 'png') return this.canvas.toDataURL('image/png');
    if (capture === 'none') { const g = this.gl; g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4)); }
    return { i, n: N };
  }

  pixels() { if (!this.px) this.px = new Uint8Array(this.outW * this.outH * 4); return this.px; }

  /** Send the rendered frame (RGBA, bottom-up rows) to the frame sink; the upload overlaps the next frame. */
  async readback(url) {
    await this.upload;
    const g = this.gl, px = this.pixels();
    g.readPixels(0, 0, this.outW, this.outH, g.RGBA, g.UNSIGNED_BYTE, px);
    const body = new Blob([px]);
    this.upload = (async () => {
      const res = await fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/octet-stream' } });
      if (!res.ok) throw new Error(`frame sink refused frame (${res.status}): ${await res.text()}`);
    })();
    this.upload.catch(() => {});
    return true;
  }

  async flush() { const u = this.upload; this.upload = null; await u; return true; }

  /** Centre states only: the cue log and the audio curves. */
  dryRun(frames) {
    const curves = [];
    for (let i = 0; i < frames; i++) {
      const t = i / this.fps;
      const C = this.video.state(t, { center: true, dry: true });
      if (C.audio) curves.push({ t: +t.toFixed(4), ...C.audio });
    }
    return { cues: this.cues, curves };
  }
}
