// Browser-side probe for the frozen v2 stage (loaded into stage2/index.html by
// tools/golden/v2-harness.mjs). It records what the approved module computes,
// without changing a single line of it:
//
//   - every video.state() call that stage.renderFrame() makes (the N sub-frame
//     states, then the centre state), by wrapping video.state for one call of
//     the real renderFrame(i, { capture: false }) — so sub-frame times come
//     from the frozen code, not from a re-implementation;
//   - the face parameters each state would draw, by tapping Face.prototype.draw
//     (the same module instance the video imported) while the tap is armed;
//   - sha256 of the soft-body mesh buffer each state builds (main and mirrored),
//     filled into a stub with the renderer's own grid layout.
//
// Output per state: { i, k, n, t, S, face, mesh, meshFlip } where k is the
// sub-frame index or 'c' for the centre state and S is the numeric state:
// functions dropped (captured as face/mesh above), WebGL textures replaced by
// { $tex: <renderer key> }, non-finite numbers by { $num: 'NaN' | 'Infinity' | '-Infinity' }.

import { Face } from '../../stage2/face.js';

let tap = null;
const originalDraw = Face.prototype.draw;
Face.prototype.draw = function draw(params) {
  if (tap) { tap.face = { ...params }; return false; }   // armed: record, do not draw
  return originalDraw.call(this, params);
};

const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (view) => hex(await crypto.subtle.digest('SHA-256', view));

function toData(v, texNames) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : { $num: String(v) };
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
  if (v === undefined || typeof v === 'function') return undefined;
  if (ArrayBuffer.isView(v)) return Array.from(v, (x) => toData(x, texNames));
  if (Array.isArray(v)) return v.map((x) => { const d = toData(x, texNames); return d === undefined ? null : d; });
  if (texNames.has(v)) return { $tex: texNames.get(v) };
  if (Object.getPrototypeOf(v) === Object.prototype) {
    const o = {};
    for (const k of Object.keys(v)) { const d = toData(v[k], texNames); if (d !== undefined) o[k] = d; }
    return o;
  }
  return { $obj: v.constructor?.name || 'unknown' };
}

function context() {
  const stage = window.__stage.stage;
  const r = stage.renderer;
  const texNames = new Map([...r.textTex].map(([k, t]) => [t, k]));
  const { cols, rows, stride, nVerts } = r.mesh;
  const stub = { cols, rows, stride, nVerts, data: new Float32Array(nVerts * stride), upload() {} };
  return { stage, texNames, stub };
}

/** All states of one output frame i (i may be fractional: t = i / fps). */
async function sampleFrame(ctx, i) {
  const { stage, texNames, stub } = ctx;
  const video = stage.video;
  const original = video.state;
  const calls = [];
  video.state = (t, st, opt) => { const S = original(t, st, opt); calls.push({ t, center: !!opt?.center, S }); return S; };
  try {
    stage.renderFrame(i, { capture: false });
  } finally {
    video.state = original;
  }
  const n = stage.lastSubframes;
  if (calls.length !== n + 1) throw new Error(`frame ${i}: expected ${n} sub-frame states + centre, saw ${calls.length}`);
  const out = [];
  for (const [j, c] of calls.entries()) {
    const k = c.center ? 'c' : j;
    let face = null;
    tap = {};
    try { c.S.drawFace?.(); face = tap.face ?? null; } finally { tap = null; }
    c.S.buildMesh(stub, false);
    const mesh = await sha256(stub.data);
    c.S.buildMesh(stub, true);
    const meshFlip = await sha256(stub.data);
    out.push({ i, k, n, t: c.t, S: toData(c.S, texNames), face, mesh, meshFlip });
  }
  return out;
}

/** Sample frames [from, to) in order; returns NDJSON-ready objects. */
export async function sampleFrames(from, to) {
  const ctx = context();
  const out = [];
  for (let i = from; i < to; i++) out.push(...await sampleFrame(ctx, i));
  return out;
}

/** Sample arbitrary (possibly fractional) frame indices. */
export async function sampleIndices(indices) {
  const ctx = context();
  const out = [];
  for (const i of indices) out.push(...await sampleFrame(ctx, i));
  return out;
}

/** The cue log emitted by setup() and the curves recorded so far (one per renderFrame call). */
export function cueLog() {
  const st = window.__stage.stage;
  return { cues: JSON.parse(JSON.stringify(st.cues)), curves: JSON.parse(JSON.stringify(st.curves)) };
}

/** WebGL implementation strings, for provenance. */
export function glInfo() {
  const gl = window.__stage.stage.gl;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    version: gl.getParameter(gl.VERSION),
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  };
}
