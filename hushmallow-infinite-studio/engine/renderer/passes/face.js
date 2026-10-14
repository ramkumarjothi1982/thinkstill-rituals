// The face pass of the fast pipeline (profile feature faceCache; with
// faceFastGlow also the fast tubes and a face-box-sized texture). The face
// model is engine/face/cache.js; this module decides, per output frame:
//   - capture every sub-frame's face parameters and the centre's (the direction
//     draws through a closure; capture mode records instead of drawing),
//   - quantise them (coarse when the pristine painting covers the face),
//   - draw ONCE at the centre time, unless the face itself moves more than
//     MOTION_PX output px across the shutter (blinks, eye pops): then per
//     sub-frame,
//   - skip the draw and the upload whenever the canvas already holds the key.
// The canvas is a pure function of the key, so frames never depend on the
// frames rendered before them.

import { texture, updateTexture } from '../../gl.js';
import { captureFaces, FaceQuantiser, REST_FULL } from '../../face/cache.js';

/** Face motion (output px across the shutter) above which the face is redrawn per sub-frame. */
export const MOTION_PX = 1.5;

/** Largest magnification of a deformed grid mesh: output px per art px over every cell edge. */
export function maxCellScale({ cols, rows, stride, data }, artSize) {
  const ax = artSize[0] / cols, ay = artSize[1] / rows, ad = Math.hypot(ax, ay), rs = (cols + 1) * stride;
  let m = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const o = j * rs + i * stride, x = data[o], y = data[o + 1];
      m = Math.max(m,
        Math.hypot(data[o + stride] - x, data[o + stride + 1] - y) / ax,
        Math.hypot(data[o + rs] - x, data[o + rs + 1] - y) / ay,
        Math.hypot(data[o + rs + stride] - x, data[o + rs + stride + 1] - y) / ad);
    }
  }
  return m;
}

export class FacePass {
  /** r: the renderer; fast: fast tubes + box texture (faceFastGlow); glow: the tubes' glow. */
  constructor(r, { fast = false, glow = true } = {}) {
    this.r = r;
    this.fast = fast;
    this.glow = glow;
    this.quantisers = new Map();          // Face → FaceQuantiser
    this.drawn = new Map();               // Face → key its canvas holds
    this.stub = null;                     // CPU-only mesh for the art → output scale
    this.boxTex = null;
    this.boxUv = null;                    // [u0, v0, du, dv] of the face box in art UV
    this.stats = { frames: 0, draws: 0, perSubFrames: 0 };
  }

  quantiser(face) {
    let q = this.quantisers.get(face);
    if (!q) { q = new FaceQuantiser(face.spec); this.quantisers.set(face, q); }
    return q;
  }

  /** Output px per art px of the state's Mallow (centre mesh built on the CPU only). */
  artToOutput(S) {
    const { cols, rows, stride, nVerts } = this.r.mesh;
    if (!this.stub || this.stub.data.length !== nVerts * stride) this.stub = { cols, rows, stride, nVerts, data: new Float32Array(nVerts * stride), upload() {} };
    S.buildMesh(this.stub, false);
    return maxCellScale(this.stub, this.r.artSize) * S.cam.zoom * this.r.scale;
  }

  /**
   * How this frame's face is drawn. → null (no face) or
   * { face, once: quantised | null, perSub: [quantised] | null, motionPx }
   */
  plan(subStates, center) {
    const cc = captureFaces(center);
    if (!cc.length) return null;
    if (cc.length > 1) throw new Error(`a state drew ${cc.length} faces; the renderer has one face texture`);
    const { face, params } = cc[0];
    const Q = this.quantiser(face);
    this.stats.frames++;
    const coarse = subStates.every((S) => (S.mallow?.rest || 0) >= REST_FULL);
    const centre = Q.quantise(params, coarse);
    if (coarse || subStates.length < 2) return { face, once: centre, perSub: null, motionPx: 0 };
    const qs = subStates.map((S) => Q.quantise(captureFaces(S)[0]?.params ?? params, false));
    const art = Q.motionArt(qs[0].P, qs[qs.length - 1].P);
    const motionPx = art > 0 ? art * this.artToOutput(center) : 0;
    if (motionPx <= MOTION_PX) return { face, once: centre, perSub: null, motionPx };
    this.stats.perSubFrames++;
    return { face, once: null, perSub: qs, motionPx };
  }

  /** Make the face texture hold quantised parameters `q`; draws and uploads only on a key change. */
  draw(face, q) {
    if (this.drawn.get(face) === q.key) return false;
    const m = this.r.meter;
    m?.begin('face.draw');
    const canvas = face.render(q.P, { fast: this.fast, glow: this.glow });
    m?.end('face.draw');
    m?.begin('face.upload');
    if (this.fast) this.uploadBox(face, canvas);
    else this.r.updateFace();
    m?.end('face.upload');
    this.drawn.set(face, q.key);
    this.stats.draws++;
    return true;
  }

  /** The box-sized face texture (created on first use); mip-mapped like the full one. */
  uploadBox(face, canvas) {
    const gl = this.r.gl;
    if (!this.boxTex) {
      this.boxTex = texture(gl, canvas, { mip: true });
      const [aw, ah] = this.r.artSize, [x0, y0, x1, y1] = face.box;
      this.boxUv = [x0 / aw, y0 / ah, (x1 - x0) / aw, (y1 - y0) / ah];
    } else updateTexture(gl, this.boxTex, canvas, { mip: true });
  }

  /** Free GL objects and forget every cached key (a new direction, or setMallow). */
  dispose() {
    if (this.boxTex) this.r.gl.deleteTexture(this.boxTex);
    this.boxTex = this.boxUv = null;
    this.quantisers.clear();
    this.drawn.clear();
  }
}
