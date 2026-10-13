// Stage v2 runtime: loads the video's direction module, the Mallow's
// high-res assets, and renders frames through the WebGL renderer.
//
// window.__stage = { ready, renderFrame(i, {capture}), dryRun(n), cues, curves }

import { clock } from '../stage/components/clock.js';   // deterministic time + seeded randomness (first)
import { createGL } from './gl.js';
import { Renderer, W, H } from './renderer.js';

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

class Stage {
  constructor() {
    this.canvas = document.getElementById('out');
    this.gl = createGL(this.canvas);
    this.renderer = new Renderer(this.gl);
    this.overlay = document.createElement('canvas');
    this.overlay.width = W; this.overlay.height = H;
    this.octx = this.overlay.getContext('2d');
    this.cues = [];
    this.curves = [];
  }

  async init(video) {
    this.video = video;
    await loadFonts();
    this.fps = video.meta.fps;
    await video.setup(this);
    return this;
  }

  cue(t, type, data = {}) { this.cues.push({ t: +t.toFixed(4), type, ...data }); }

  /**
   * capture: true / 'png' → PNG data URL; 'raw' → base64 RGBA (bottom-up rows,
   * flip in the encoder; ~10× faster than PNG encoding); 'none' → render only.
   */
  renderFrame(i, { capture = true } = {}) {
    const fps = this.fps, t = i / fps;
    clock.step(1000 / fps);
    // adaptive motion blur: more sub-frames when something moves fast
    const N = this.video.subframes ? this.video.subframes(t, this) : (this.video.meta.subframes || 3);
    this.lastSubframes = N;
    const shutter = this.video.meta.shutter ?? 0.5;     // fraction of the frame interval the shutter is open
    const subs = [];
    for (let k = 0; k < N; k++) {
      const ts = t + ((k + 0.5) / N - 0.5) * shutter / fps;
      subs.push(this.video.state(ts, this));
    }
    const center = this.video.state(t, this, { center: true });
    if (center.audio) this.curves.push({ t: +t.toFixed(4), ...center.audio });
    if (!capture) return null;
    const ov = this.video.overlay ? this.video.overlay(this.octx, t, this) : false;
    this.renderer.renderFrame(subs, center, ov ? this.overlay : null);
    if (capture === 'none') { const g = this.gl; g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4)); return null; }
    if (capture === 'raw') {
      const g = this.gl;
      if (!this.px) this.px = new Uint8Array(W * H * 4);
      g.readPixels(0, 0, W, H, g.RGBA, g.UNSIGNED_BYTE, this.px);
      let bin = '';
      const CH = 0x8000;
      for (let k = 0; k < this.px.length; k += CH) bin += String.fromCharCode.apply(null, this.px.subarray(k, k + CH));
      return btoa(bin);
    }
    return this.canvas.toDataURL('image/png');
  }

  dryRun(frames) {
    for (let i = 0; i < frames; i++) this.renderFrame(i, { capture: false });
    return { cues: this.cues, curves: this.curves };
  }
}

const params = new URLSearchParams(location.search);
const videoId = params.get('video') || 'my-brain-at-2am-v2';
const stage = new Stage();
const ready = (async () => {
  const mod = await import(`../videos/${videoId}.js`);
  await stage.init(mod.default);
  const m = mod.default.meta;
  return { id: videoId, fps: m.fps, duration: m.duration, frames: Math.round(m.duration * m.fps), width: W, height: H, title: m.title };
})();

window.__stage = {
  ready,
  renderFrame: (i, o) => stage.renderFrame(i, o),
  dryRun: (n) => stage.dryRun(n),
  get cues() { return stage.cues; },
  get curves() { return stage.curves; },
  stage,
};

if (params.get('play')) {
  ready.then(async (info) => {
    const hud = document.getElementById('hud');
    for (let i = 0; i < info.frames; i++) { stage.renderFrame(i); hud.textContent = `${(i / info.fps).toFixed(2)}s`; await new Promise((r) => setTimeout(r, 0)); }
  });
}
