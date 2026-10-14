// Engine page entry (engine/index.html). One page renders one direction; the
// render worker opens a fresh page for every video (R4).
//
// Query string:
//   direction=<id>     registry id (engine/directions.js); `video` is accepted as an alias
//   w, h               design size in px (default 1080×1920)
//   scale              render scale (default 1): the output is round(w·scale) × round(h·scale)
//   seed               seed of the virtual clock's Math.random (default 20261013, read by runtime/clock.js)
//   mark               burn a corner mark with this text (e.g. DRAFT), see runtime/marks.js
//   textKeys           'legacy' only for the R4 sensitivity test (stage2's key-only texture cache)
//
// window.__engine is the worker's API; window.__stage keeps the stage2 surface
// that tools/golden/v2-probe.js and v2-harness.mjs use, so the golden probes run
// unchanged against the engine.

import { clock } from './runtime/clock.js';   // FIRST: virtual time and seeded randomness before any other module runs
import { Stage } from './stage.js';
import { loadDirection } from './directions.js';
import { Marks } from './runtime/marks.js';
import { assetLog } from './runtime/asset-log.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => {
  if (!q.has(k)) return d;
  const v = Number(q.get(k));
  if (!(v > 0)) throw new Error(`engine: ?${k}= must be a positive number, got ${q.get(k)}`);
  return v;
};

const width = num('w', 1080), height = num('h', 1920), scale = num('scale', 1);
const stage = new Stage({
  canvas: document.getElementById('out'),
  width, height, scale,
  marks: q.get('mark') ? new Marks(q.get('mark')) : null,
  textKeys: q.get('textKeys') || 'content',
});

function describe(d) {
  const m = d.meta;
  if ((m.width && m.width !== width) || (m.height && m.height !== height)) {
    throw new Error(`direction ${m.id} is designed for ${m.width}×${m.height}, the page was opened at ${width}×${height}`);
  }
  return {
    id: m.id, title: m.title, runtime: m.runtime, score: m.score ?? null, meta: { ...m },
    fps: m.fps, duration: m.duration, frames: Math.round(m.duration * m.fps),
    design: [width, height], scale, width: stage.outW, height: stage.outH, seed: clock.seed,
  };
}

/** Set up direction `id` on the stage (disposing the current one first unless dispose === false). */
async function load(id, { dispose = true } = {}) {
  if (stage.video && dispose) stage.dispose();
  const d = await loadDirection(id);
  await stage.init(d);
  return describe(d);
}

const id = q.get('direction') || q.get('video');
const ready = id ? load(id) : Promise.reject(new Error('engine: open with ?direction=<id>'));
ready.catch((e) => console.error(`[engine] ${e.message}`));

window.__engine = {
  ready,
  stage,
  load,
  render: (i) => stage.render(i),
  readback: (url) => stage.readback(url),
  flush: () => stage.flush(),
  dryRun: (frames) => stage.dryRun(frames),
  prime: (a, k) => stage.prime(a, k),
  dispose: () => stage.dispose(),
  assets: () => assetLog.snapshot(),
  glInfo() {
    const gl = stage.gl, dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
      version: gl.getParameter(gl.VERSION),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      extensions: ['EXT_color_buffer_float', 'OES_texture_float_linear', 'EXT_texture_filter_anisotropic'].filter((e) => gl.getExtension(e)),
      fredoka: document.fonts.check('600 40px Fredoka'),
    };
  },
};

window.__stage = {
  ready,
  renderFrame: (i, o) => stage.renderFrame(i, o),
  dryRun: (n) => stage.dryRun(n),
  get cues() { return stage.cues; },
  get curves() { return stage.curves; },
  stage,
};
