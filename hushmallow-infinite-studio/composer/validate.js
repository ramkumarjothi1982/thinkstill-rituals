// G-DIR: the compile-time gate on a direction (PHASE2-PLAN "G-DIR (compile,
// under 3 s in Node)"). Pure: evaluates the direction with composer/scene.js,
// the same code the engine runtime renders with.
//
//   gdir(compiled, { spec, lib }) → { pass, errors: [{ rule, message }], warnings, metrics }
//
// compiled is compose()'s result ({ direction, report }) or a bare direction.
//
// Rule groups: structure, loop closure, deformation (with the face inside the
// silhouette), camera, text, safety (breath, spin, pulses, exposure), craft
// (impact, C1 continuity, eye gate, dead intervals), audio linkage (with no
// absolute-time layers), pose contracts. Thresholds are the plan's, except
// where the approved v2 itself sits outside them: those are calibrated on v2,
// marked provisional in THRESHOLDS (OWNER-DECISIONS Q5: the calibrated values
// are the limits, the plan's stricter value is a warning), and listed in
// docs/wp/WP-03.md "Deviations" and docs/wp/FU-4.md.

import { createScene } from './scene.js';
import { checkChannels, channelInfo, BODY_DOFS, FACE_PARAMS, exprWindows, compileExpr } from './channels.js';
import { MOVES } from './moves/index.js';
import { textLine } from './layout.js';
import { domain } from './circular.js';
import { CONTROLLERS } from './controllers/index.js';
import { POSES, inRange, POSE_TOL } from './poses.js';
import { resolveRef } from './clock.js';
import { SCORE } from './compose.js';
import { eyeGeom, sampleCubic, sampleQuad, clamp, lerp } from '../engine/face/geometry.js';
import { NEUTRAL } from '../engine/face/params.js';

/** Thresholds. `provisional` ones were calibrated on the approved v2 (see the report). */
export const THRESHOLDS = Object.freeze({
  closureStep: 1e-3, closureSlope: 0.02, seamImpulse: 1e-3,
  restAny: 0.25, restFull: 0.15, restSampleTol: 0.002,                 // restFull: provisional (v2 0.171 s)
  deformHz: 240,
  zoom: [0.95, 1.10], zoomRate: 0.04, driftRate: 40, followMax: 0.25,
  safe: { x: [60, 1020], y: [180, 1250], rail: { x: 900, y: [700, 1500] }, floor: 1500 },
  readableAlpha: 0.9, readableSpeed: 150, glassMinAlpha: 0.75, maxGlass: 3,          // glassMinAlpha: provisional (depth dims back cards to 0.84)
  hookMin: 2.0, endMin: 2.0,
  breathInhaleMin: 1.2, breathCrestMax: 0.35, breathExhaleRatio: 1.25,  // ratio: provisional (plan 1.5; v2 1.28)
  exposureChange: 0.12, exposureRamp: 0.5,
  impact: [0.25, 1.0],
  deadInterval: 1.2, deadActivity: 0.02,
  // FU-4: the plan rules WP-03 left out. None needed calibrating: v2 sits inside every plan value.
  spinMax: 1, spinMaxClose: 0.3, closeUpCover: 0.25, spinRamp: 0.5, spinFloor: 0.01,   // turns/s, frame share, s
  pulseRamp: 0.15, pulseFloor: 0.02,                                    // s; transitions under 2 % of the range are ripple
  faceInside: 1.0,                                                      // normalised radius in the silhouette's inscribed ellipse
  // C1: a slope jump, per second, as a share of the channel's range. Error above c1Kink: provisional, calibrated
  // on v2, whose breath envelope kinks by 1.26/s where the ritual's 70 % breath hands over to the sleepy breath
  // (a max of two ramps; 0.038/s of inflate on the body). The plan's strict C1 (any visible kink) warns above c1KinkWarn.
  c1Kink: 1.5, c1KinkWarn: 0.05,
});

const C1_TYPES = new Set(['track', 'spline', 'expr', 'noise', 'sine', 'envscale', 'ramp', 'pulse', 'const', 'blinks']);
const KICK_TYPES = new Set(['impulses', 'hops', 'shimmer', 'ripples']);   // declared discontinuities of the derivative

/**
 * How each score builds its layers. 'cues': every layer window derives from a
 * cue or a curve (audio/score.mjs, R10). 'absolute': layers keyed to absolute
 * seconds (the frozen soundtrack-v2, audit R10/R11), right only for the film
 * it was written for, which is why compose.js gives it to the approved
 * film's fingerprint alone (SCORE.legacy).
 */
export const SCORE_LAYERS = Object.freeze({ 'hm-score': 'cues', 'soundtrack-v2': 'absolute' });

/** The face parameters the outline depends on (faceOutline): gaze, iris, sparkle and the wave phase do not move it. */
const OUTLINE_PARAMS = Object.freeze(['eyeOpen', 'eyeOpenL', 'eyeOpenR', 'blink', 'lidTop', 'lidBot', 'lidSlant', 'squint', 'closedCurve', 'eyeStretch', 'eyeScale',
  'browAlpha', 'browY', 'browTilt', 'mouthSmile', 'mouthOpen', 'mouthRound', 'mouthWidth', 'mouthWave', 'mouthY', 'mouthSkew', 'blush']);

/** Parameters that switch a feature's outline on or off at a threshold (engine/face/features.js). */
const OUTLINE_GATES = Object.freeze({ browAlpha: 0.02, blush: 0.02, mouthOpen: 0.04 });

/** Cue payload fields that hold a time (a layer window): they must sit on the clock, never on an absolute second. */
const CUE_TIME_FIELDS = Object.freeze(['at', 'from', 'to', 'until', 'start', 'end']);

export function gdir(compiled, { spec = null, moves = MOVES } = {}) {
  const direction = compiled?.direction ?? compiled;
  const errors = [], warnings = [], metrics = {};
  const err = (rule, message) => errors.push({ rule, message });
  const warn = (rule, message) => warnings.push({ rule, message });
  const T = THRESHOLDS;

  // ---------------------------------------------------------- structure --
  if (!direction || direction.schema !== 'hm-direction/3') { err('structure:schema', `not an hm-direction/3 (${direction?.schema})`); return done(); }
  const { meta } = direction;
  const D = meta.duration, P = meta.P || 0, fps = meta.fps;
  for (const k of ['fps', 'duration', 'shutter', 'subframes', 'subframeMax', 'subframePx']) if (!(meta[k] > 0)) err('structure:meta', `meta.${k} must be > 0`);
  try { domain(D, P); } catch (e) { err('structure:seam', e.message); }
  for (const e of checkChannels(direction.channels, D)) err(`structure:${e.rule.replace(/^channel:/, '')}`, e.message);
  for (const [dof, layers] of Object.entries(direction.body || {})) {
    if (!BODY_DOFS.includes(dof)) err('structure:body', `unknown body DOF ${dof}`);
    for (const l of layers) if (!direction.channels[l.split('#')[0]]) err('structure:body', `${dof} layer ${l} has no channel`);
  }
  for (const [p, ch] of direction.face || []) {
    if (!FACE_PARAMS.includes(p)) err('structure:face', `unknown face parameter ${p}`);
    if (!direction.channels[ch]) err('structure:face', `face.${p} has no channel ${ch}`);
  }
  if (direction.channels['cam.roll'] || direction.channels['body.shake']) err('structure:forbidden', 'roll and shake cannot be authored');
  for (const p of direction.props || []) if (!CONTROLLERS[p.controller]) err('structure:prop', `prop ${p.id}: unknown controller ${p.controller}`);
  for (const c of direction.cues || []) if (!Number.isFinite(c.t) || c.t < 0 || c.t >= D) err('structure:cue', `cue ${c.type} at t=${c.t} is outside [0, ${D})`);
  if (errors.length) return done();

  let sc;
  try { sc = createScene(direction); } catch (e) { err('structure:evaluate', e.message); return done(); }

  // every frame and sub-frame time: finite numbers only, legal sub-frame counts.
  // The animated core is checked at every time; the palette is checked at the
  // corners of the dial ranges it is blended over (it is linear in each dial).
  const finite = (v, path) => {
    if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error(`${path} = ${v}`); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => finite(x, `${path}[${i}]`)); return; }
    if (v && typeof v === 'object') for (const k of Object.keys(v)) finite(v[k], `${path}.${k}`);
  };
  const dialFns = ['world.tension', 'world.warmth', 'world.agitation', 'mallow.glowPulse', 'env.rest'].map((n) => [n, sc.channel(n)]);
  const core = (t) => {
    const d = sc.dofAt(t);
    for (const k in d) if (!Number.isFinite(d[k])) throw new Error(`body.${k}(${t}) = ${d[k]}`);
    const f = sc.faceAt(t);
    for (const k in f) if (!Number.isFinite(f[k])) throw new Error(`face.${k}(${t}) = ${f[k]}`);
    const c = sc.camAt(t);
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.zoom)) throw new Error(`cam(${t}) = ${JSON.stringify(c)}`);
    for (const [n, fn] of dialFns) { const v = fn(t); if (!Number.isFinite(v)) throw new Error(`${n}(${t}) = ${v}`); }
    for (const p of sc.props) for (let i = 0; i < p.count; i++) { const b = p.at(i, t); if (b) finite(b, `${p.id}[${i}](${t})`); }
  };
  let samples = 0, subTotal = 0;
  const frames = Math.round(D * fps);
  try {
    for (let i = 0; i < frames; i++) {
      const t = i / fps;
      const N = sc.subframes(t);
      if (!Number.isFinite(N) || N < meta.subframes || N > meta.subframeMax) throw new Error(`subframes(${t}) = ${N}`);
      subTotal += N;
      for (let k = 0; k < N; k++) { core(t + ((k + 0.5) / N - 0.5) * meta.shutter / fps); samples++; }
      core(t); samples++;
      if (i % 15 === 0) finite(sc.state(t), `state(${t})`);            // full state (particles, palette, post) twice a second
    }
    for (const c of [0, 1]) for (const w of [0, 1]) finite(sc.palette(c, w), `palette(${c}, ${w})`);
  } catch (e) { err('structure:nan', e.message); return done(); }
  metrics.samples = samples;
  metrics.subframes = subTotal;

  // ------------------------------------------------------- loop closure --
  const seamL = D - P - 1e-9, seamR = -P;                                  // composition time either side of the seam
  const rest = sc.channel('env.rest');
  const restAt = (t) => rest(t);
  const faceCovered = restAt(seamL) >= 0.999 && restAt(seamR) >= 0.999;
  const scalars = () => {
    const fns = {};
    for (const d of BODY_DOFS) fns[`body.${d}`] = (t) => sc.raw.dofAt(t)[d];
    fns['cam.y'] = (t) => sc.raw.camAt(t).y; fns['cam.zoom'] = (t) => sc.raw.camAt(t).zoom;
    for (const n of ['world.tension', 'world.warmth', 'world.agitation', 'mallow.glowPulse', 'env.rest']) fns[n] = sc.channel(n);
    if (!faceCovered) for (const [p] of direction.face) fns[`face.${p}`] = (t) => sc.raw.faceAt(t)[p];
    return fns;
  };
  const closureWorst = { step: 0, slope: 0 };
  for (const [name, f] of Object.entries(scalars())) {
    if (name === 'body.shimPhase') continue;                               // a phase, multiplied by the shimmer amplitude (0 at the seam)
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 120; i++) { const v = f(-P + (D * i) / 120); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const scale = Math.max(1, hi - lo);
    const step = Math.abs(f(seamL) - f(seamR)) / scale;
    const h = 1e-3;
    const slope = Math.abs((f(seamL) - f(seamL - h)) / h - (f(seamR + h) - f(seamR)) / h) / scale;
    closureWorst.step = Math.max(closureWorst.step, step); closureWorst.slope = Math.max(closureWorst.slope, slope);
    if (step > T.closureStep) err('loop:closure', `${name} jumps ${step.toExponential(2)} (normalised) across the seam`);
    if (slope > T.closureSlope) err('loop:slope', `${name} slope changes by ${slope.toExponential(2)}/s across the seam`);
  }
  metrics.closure = closureWorst;
  metrics.faceCoveredAtSeam = faceCovered;
  for (const [name, def] of Object.entries(direction.channels)) {
    if (def.type !== 'impulses') continue;
    const f = sc.channel(name);
    const v = Math.max(Math.abs(f(seamL)), Math.abs(f(seamR)));
    if (v > T.seamImpulse) err('loop:impulse', `${name} still rings ${v.toExponential(2)} at the seam`);
  }
  // the props and particles are off screen at the seam
  const sL = sc.state(D - 1e-9), s0 = sc.state(0);
  if (sL.bubblesBack.length + sL.bubblesFront.length + s0.bubblesBack.length + s0.bubblesFront.length) err('loop:props', 'glass props are on screen at the loop seam');
  if (sL.particles.length || s0.particles.length) err('loop:particles', 'particles are alive at the loop seam');
  // the painted rest on both sides of the seam
  const restSpan = (dir, test) => { let n = 0; for (let k = 0; k <= 3000; k++) { const t = dir > 0 ? seamR + k / 1000 : seamL - k / 1000; if (!test(restAt(t))) break; n = k / 1000; } return n; };
  const rAfterAny = restSpan(1, (v) => v > 0), rBeforeAny = restSpan(-1, (v) => v > 0);
  const rAfterFull = restSpan(1, (v) => v >= 0.999), rBeforeFull = restSpan(-1, (v) => v >= 0.999);
  metrics.rest = { afterAny: rAfterAny, beforeAny: rBeforeAny, afterFull: rAfterFull, beforeFull: rBeforeFull };
  if (Math.min(rAfterAny, rBeforeAny) < T.restAny - T.restSampleTol) err('loop:rest', `the painting is on screen ${Math.min(rAfterAny, rBeforeAny).toFixed(3)} s on one side of the seam; needs ${T.restAny} s`);
  if (Math.min(rAfterFull, rBeforeFull) < T.restFull) err('loop:rest', `the painting is at full strength ${Math.min(rAfterFull, rBeforeFull).toFixed(3)} s on one side of the seam; needs ${T.restFull} s`);
  // the hook is at full alpha on frame 0
  const hook = (direction.text || []).find((x) => x.id === 'hook');
  if (!hook) err('loop:hook', 'no hook caption');
  else for (let i = 0; i < hook.opts.lines.length; i++) if (textLine(hook.opts, 0, i).a < 0.999) err('loop:hook', `hook line ${i + 1} is not at full alpha on frame 0`);

  // -------------------------------------------------------- deformation --
  const lim = direction.mallow.limits || { heightMin: 0.6, stretchMax: 1.3, shrinkMin: 0.6 };
  let syMin = Infinity, syMax = -Infinity;
  for (let i = 0; i <= D * T.deformHz; i++) {
    const t = -P + i / T.deformHz;
    for (const tt of [t, t - direction.mallow.body.lag]) {
      const d = sc.raw.dofAt(tt);
      const sy = (1 - d.squash) * (1 + 0.85 * d.inflate);
      syMin = Math.min(syMin, sy); syMax = Math.max(syMax, sy);
    }
  }
  metrics.deformation = { heightMin: syMin, stretchMax: syMax };
  if (syMin < lim.heightMin) err('deform:height', `body height falls to ${syMin.toFixed(3)} (limit ${lim.heightMin})`);
  if (syMax > lim.stretchMax) err('deform:stretch', `body stretches to ${syMax.toFixed(3)} (limit ${lim.stretchMax})`);
  faceInSilhouette(direction, sc, { D, P, err, metrics });

  // ------------------------------------------------------------- camera --
  const cz = sc.channel('cam.zoom'), cy = sc.channel('cam.y'), follow = sc.channel('cam.follow');
  let zMin = Infinity, zMax = -Infinity, zRate = 0, yRate = 0;
  for (let i = 1; i <= D * T.deformHz; i++) {
    const t = -P + i / T.deformHz, h = 1 / T.deformHz;
    const z = cz(t);
    zMin = Math.min(zMin, z); zMax = Math.max(zMax, z);
    zRate = Math.max(zRate, Math.abs(z - cz(t - h)) / h);
    yRate = Math.max(yRate, Math.abs(cy(t) - cy(t - h)) / h);
  }
  metrics.camera = { zoom: [zMin, zMax], zoomRate: zRate, driftRate: yRate, follow: follow(0) };
  if (zMin < T.zoom[0] || zMax > T.zoom[1]) err('camera:zoom', `zoom spans ${zMin.toFixed(3)}–${zMax.toFixed(3)} (allowed ${T.zoom.join('–')})`);
  if (zRate > T.zoomRate) err('camera:zoom-rate', `zoom changes ${zRate.toFixed(4)}/s (max ${T.zoomRate})`);
  if (yRate > T.driftRate) err('camera:drift', `camera drifts ${yRate.toFixed(1)} px/s (max ${T.driftRate})`);
  if (follow(0) > T.followMax) err('camera:follow', `vertical follow ${follow(0)} (max ${T.followMax})`);
  if (sc.state(0).cam.roll !== 0) err('camera:roll', 'roll must be exactly 0');

  // --------------------------------------------------------------- text --
  textChecks(direction, sc, { D, P, fps, err, warn, metrics });

  // ------------------------------------------------------------- safety --
  const A = direction.anchors;
  if ('inhale' in A && 'crest' in A && 'exhale' in A) {
    const exhaleCue = direction.cues.find((c) => c.type === 'exhale');
    const inhale = A.crest - A.inhale, crest = A.exhale - A.crest, exhale = exhaleCue?.data?.dur ?? 0;
    metrics.breath = { inhale, crest, exhale, ratio: exhale / inhale };
    if (inhale < T.breathInhaleMin) err('safety:breath', `inhale ${inhale.toFixed(2)} s (min ${T.breathInhaleMin})`);
    if (crest > T.breathCrestMax) err('safety:breath', `crest ${crest.toFixed(2)} s (max ${T.breathCrestMax}: no breath holds)`);
    if (exhale < T.breathExhaleRatio * inhale) err('safety:breath', `exhale ${exhale.toFixed(2)} s is under ${T.breathExhaleRatio}× the inhale`);
  }
  let eMin = Infinity, eMax = -Infinity, eStep = 0;
  const expo = [];
  for (let i = 0; i < frames; i++) { const e = sc.state(i / fps).post.exposure; expo.push(e); eMin = Math.min(eMin, e); eMax = Math.max(eMax, e); }
  const lagF = Math.round(T.exposureRamp * fps);
  for (let i = lagF; i < frames; i++) eStep = Math.max(eStep, Math.abs(expo[i] - expo[i - lagF]) / eMax);
  metrics.exposure = { min: eMin, max: eMax, change: (eMax - eMin) / eMax, per05s: eStep };
  if ((eMax - eMin) / eMax > T.exposureChange) err('safety:exposure', `exposure changes ${(100 * (eMax - eMin) / eMax).toFixed(1)} % (max 12 %)`);
  for (const n of Object.keys(direction.channels)) if (/sweat|exclaim/.test(n)) err('safety:disabled', `${n}: sweat and '!' are disabled`);
  spinChecks(direction, sc, { D, P, err, metrics });
  pulseChecks(direction, sc, { D, P, err, metrics });

  // -------------------------------------------------------------- craft --
  const impact = A.IMPACT;
  if (!(impact >= T.impact[0] && impact <= T.impact[1])) err('craft:impact', `gag impact at ${impact} s (must land in ${T.impact.join('–')} s)`);
  for (const [name, def] of Object.entries(direction.channels)) {
    if (!C1_TYPES.has(def.type) && !KICK_TYPES.has(def.type)) err('craft:c1', `${name}: channel type ${def.type} is not C1 and not a declared kick`);
  }
  c1Checks(direction, sc, { D, P, err, warn, metrics });
  const eye = sc.channel('face.eyeOpen');
  if (direction.mallow.faceStyle === 'closed-tube') {
    if (eye(seamR) > 0.05 || eye(seamL) > 0.05) err('craft:eye-gate', 'a closed-eye Mallow must start and end on the painted closed eyes');
  }
  deadIntervals(direction, sc, { D, fps, err, metrics });

  // ------------------------------------------------------ audio linkage --
  const ran = new Set((direction.moves || []).map((m) => m.id));
  for (const c of direction.cues) {
    if (c.by === 'composer') { if (c.type !== 'scene') err('audio:cue-owner', `the composer emits only 'scene', not '${c.type}'`); continue; }
    const mv = moves[c.by];
    if (!mv) err('audio:cue-owner', `cue ${c.type} from unknown move ${c.by}`);
    else if (!mv.cues?.[c.type]?.recipe) err('audio:recipe', `${c.by} emits '${c.type}' without a recipe`);
  }
  for (const id of ran) {
    for (const [type, decl] of Object.entries(moves[id]?.cues || {})) {
      if (!decl.optional && !direction.cues.some((c) => c.by === id && c.type === type)) err('audio:unemitted', `${id} declares cue '${type}' but never emits it`);
    }
  }
  absoluteTimeChecks(direction, { err, warn, metrics });

  // -------------------------------------------------------------- poses --
  poseChecks(direction, sc, moves, { err, metrics });

  if (spec && spec.id !== meta.spec) err('structure:spec', `direction was composed from ${meta.spec}, not ${spec.id}`);
  return done();

  function done() { return { pass: errors.length === 0, errors, warnings, metrics }; }
}

/** Text: safe zones and reading time for captions (errors); glass thoughts (calibrated warnings). */
function textChecks(direction, sc, { D, P, fps, err, warn, metrics }) {
  const T = THRESHOLDS, S = T.safe;
  const out = { captions: {}, glass: [] };
  const dt = 1 / (fps * 2);
  for (const x of direction.text || []) {
    if (x.kind === 'logocard') {
      const o = x.opts, y = o.y;
      if (y - 120 < S.y[0] || y + 140 > S.floor) err('text:safe-zone', `logo card at y=${y} leaves the safe zone`);
      continue;
    }
    const o = x.opts;
    const n = o.lines.length, size = o.size, lh = (o.lineHeight ?? 1.16) * size;
    const top = o.y - size, bottom = o.y + (n - 1) * lh + 0.3 * size;
    const halfW = Math.max(...(x.widths || [0])) / 2;
    if (540 - halfW < S.x[0] || 540 + halfW > S.x[1]) err('text:safe-zone', `${x.id}: ${(2 * halfW).toFixed(0)} px wide, outside x ${S.x.join('–')}`);
    if (top < S.y[0] || bottom > S.y[1]) err('text:safe-zone', `${x.id}: rows span y ${top.toFixed(0)}–${bottom.toFixed(0)}, outside ${S.y.join('–')}`);
    // captions only rise or fade: TextBlock motion is a rise of o.rise px (≤ 150 px/s)
    const rise = o.rise ?? 22, inDur = o.inDur ?? 0.6;
    if (rise > 0 && (3 * rise) / inDur > T.readableSpeed) err('text:motion', `${x.id}: rises at ${((3 * rise) / inDur).toFixed(0)} px/s`);
    // reading time, two measures in composition time over the loop:
    //   window  entry (or drawFrom) to the start of the exit: the clock window the planner checks copy against
    //   clear   every row at alpha ≥ 0.9 (fades excluded)
    let clear = 0;
    for (let t = -P; t < D - P; t += dt) {
      let ok = x.drawFrom === undefined || t >= x.drawFrom;
      for (let i = 0; ok && i < n; i++) if (textLine(o, t, i).a < T.readableAlpha) ok = false;
      if (ok) clear += dt;
    }
    const from = Math.max(-P, x.drawFrom ?? o.enterAt), to = Math.min(D - P, o.exitAt ?? 1e9);
    out.captions[x.id] = { window: Math.max(0, to - from), clear };
  }
  // cyclic captions (the hook and its return) count together, as one reading across the seam
  for (const x of direction.text || []) {
    if (x.kind === 'logocard' || !x.readable || x.id === 'hookReturn') continue;
    const chars = x.opts.lines.join(' ').length;
    const need = Math.max(x.readable.min, 0.25 + 0.05 * chars);
    const other = x.readable.with ? out.captions[x.readable.with] : null;
    const window = out.captions[x.id].window + (other ? other.window : 0);
    const clear = out.captions[x.id].clear + (other ? other.clear : 0);
    if (window + 1e-6 < need) err('text:reading', `${x.id} "${x.opts.lines.join(' ')}" is on screen ${window.toFixed(2)} s, needs ${need.toFixed(2)} s`);
    else if (clear + 1e-6 < need) warn('text:reading-clear', `${x.id} "${x.opts.lines.join(' ')}" is fully clear (every row at alpha ≥ 0.9) ${clear.toFixed(2)} s of the ${need.toFixed(2)} s its length asks (provisional: v2's end card is clear 1.96 s of 2.35 s)`);
  }
  // glass thoughts: readable while the words are up, the card clearly visible and slow
  for (const p of direction.props || []) {
    const tr = sc.props.find((q) => q.id === p.id);
    p.items.forEach((it, i) => {
      let slow = 0, rail = 0, outside = 0;
      for (let t = -P; t < D - P; t += dt) {
        const b = tr.at(i, t);
        if (!b) continue;
        if (b.textAlpha < T.readableAlpha || b.alpha < T.glassMinAlpha) continue;
        const b2 = tr.at(i, t + dt);
        const v = b2 ? Math.hypot(b2.x - b.x, b2.y - b.y) / dt : 0;
        if (v <= T.readableSpeed) slow += dt;
        const w = (it.layout.w / 2) * b.scale, h = ((it.lines.length * p.style.text.lineHeight) / 2) * b.scale;
        if (b.x + w > S.rail.x && b.y + h > S.rail.y[0] && b.y - h < S.rail.y[1]) rail += dt;
        if (b.x - w < S.x[0] || b.x + w > S.x[1] || b.y - h < S.y[0] || b.y + h > S.y[1]) outside += dt;
      }
      const need = Math.max(1.0, 0.25 + 0.05 * it.text.length);
      out.glass.push({ prop: p.id, i, readable: slow, need, rail, outside });
      if (slow + 1e-6 < need) err('text:glass-reading', `${p.id}[${i}] "${it.text}" is readable ${slow.toFixed(2)} s (words up, card at alpha ≥ ${T.glassMinAlpha}, ≤ ${T.readableSpeed} px/s); needs ${need.toFixed(2)} s`);
      if (rail > 0) warn('text:glass-rail', `${p.id}[${i}] crosses the right rail for ${rail.toFixed(2)} s while readable (provisional: v2's second thought does, 0.73 s)`);
      if (outside > 0) err('text:glass-zone', `${p.id}[${i}] leaves the safe zone for ${outside.toFixed(2)} s while readable`);
    });
    // at most 3 readable glass texts at once
    for (let t = -P; t < D - P; t += 1 / fps) {
      let k = 0;
      for (let i = 0; i < tr.count; i++) { const b = tr.at(i, t); if (b && b.textAlpha >= T.readableAlpha && b.alpha >= T.glassMinAlpha) k++; }
      if (k > T.maxGlass) { err('text:glass-count', `${k} readable glass texts at t=${t.toFixed(2)}`); break; }
    }
  }
  metrics.text = out;
}

/** No dead interval longer than 1.2 s outside rest windows and the end card. */
function deadIntervals(direction, sc, { D, fps, err, metrics }) {
  const T = THRESHOLDS;
  const A = direction.anchors;
  const rest = sc.channel('env.rest');
  const card = [A.RESOLVE ?? D, A.CARD_OUT ?? D];
  let run = 0, worst = 0, at = 0;
  let prev = null;
  for (let i = 0; i <= D * fps; i++) {
    const t = i / fps;
    const d = sc.dofAt(t), f = sc.faceAt(t), cam = sc.camAt(t);
    const props = sc.props.flatMap((p) => Array.from({ length: p.count }, (_, k) => p.at(k, t)).filter(Boolean));
    const cur = { d, f, cam, props };
    if (prev) {
      let act = 0;
      for (const k of BODY_DOFS) if (k !== 'shimPhase') act = Math.max(act, Math.abs(d[k] - prev.d[k]) * fps);
      for (const k of Object.keys(f)) if (k !== 'mouthWavePhase') act = Math.max(act, Math.abs(f[k] - prev.f[k]) * fps);
      act = Math.max(act, Math.abs(cam.y - prev.cam.y) * fps / 50, Math.abs(cam.zoom - prev.cam.zoom) * fps * 10);
      for (let k = 0; k < Math.min(props.length, prev.props.length); k++) act = Math.max(act, Math.hypot(props[k].x - prev.props[k].x, props[k].y - prev.props[k].y) * fps / 100);
      const exempt = rest(t) > 0.5 || (t >= card[0] && t <= card[1]);
      if (act < T.deadActivity && !exempt) { run += 1 / fps; if (run > worst) { worst = run; at = t; } } else run = 0;
    }
    prev = cur;
  }
  metrics.deadInterval = { longest: worst, endingAt: at };
  if (worst > T.deadInterval) err('craft:dead', `nothing moves for ${worst.toFixed(2)} s (ending ${at.toFixed(2)} s)`);
}


// ------------------------------------------------- the face in the body --

/**
 * The face inside the silhouette (plan: deformation). The face is drawn in art
 * space onto the body mesh (engine/face), so it deforms with the body and the
 * test lives in art space: every face feature, its outline padded by half its
 * line width, must lie inside the ellipse inscribed in the measured silhouette
 * box (mallow.silhouette). A Mallow's real outline is fuller than that ellipse,
 * so the test is conservative. Checked at 240 Hz wherever the painting does
 * not cover the face (env.rest < 0.999).
 */
function faceInSilhouette(direction, sc, { D, P, err, metrics }) {
  const T = THRESHOLDS;
  const sil = direction.mallow.silhouette, spec = direction.mallow.faceSpec;
  const cx = (sil.x0 + sil.x1) / 2, cy = (sil.top + sil.baseY) / 2, ax = (sil.x1 - sil.x0) / 2, ay = (sil.baseY - sil.top) / 2;
  const rho = (x, y, pad) => Math.hypot((Math.abs(x - cx) + pad) / ax, (Math.abs(y - cy) + pad) / ay);
  const rest = sc.channel('env.rest');
  const fns = direction.face.filter(([p]) => OUTLINE_PARAMS.includes(p)).map(([p, ch]) => [p, sc.channel(ch)]);
  const face = { ...NEUTRAL }, last = {};
  let worst = { rho: 0, t: null, feature: null }, outlined = 0;
  for (let i = 0; i <= D * T.deformHz; i++) {
    const t = -P + i / T.deformHz;
    if (rest(t) >= 0.999) continue;
    // a face whose outline parameters all sit within 5e-3 of the last face outlined, on the same side of the
    // features' on/off thresholds, has the same outline to half a pixel (0.001 of normalised radius): skip it
    let moved = outlined === 0;
    for (const [p, fn] of fns) {
      const v = fn(t);
      face[p] = v;
      if (!moved && (Math.abs(v - last[p]) >= 5e-3 || (p in OUTLINE_GATES && (v >= OUTLINE_GATES[p]) !== (last[p] >= OUTLINE_GATES[p])))) moved = true;
    }
    if (!moved) continue;
    Object.assign(last, face);
    outlined++;
    for (const [feature, pts, pad] of faceOutline(spec, face)) {
      for (const [x, y] of pts) { const r = rho(x, y, pad); if (r > worst.rho) worst = { rho: r, t, feature }; }
    }
  }
  metrics.faceInSilhouette = { ...worst, limit: T.faceInside, outlined, ellipse: { cx, cy, ax, ay } };
  if (worst.rho > T.faceInside) err('deform:face', `the ${worst.feature} leaves the silhouette at t=${worst.t.toFixed(3)}: normalised radius ${worst.rho.toFixed(3)} in the inscribed ellipse (limit ${T.faceInside})`);
}

/**
 * Every face feature's outline in art px: [[feature, points, pad]]. The eyes go
 * through the engine's own eye model (engine/face/geometry.js eyeGeom); brows,
 * mouth and blush mirror the geometry of engine/face/features.js drawBrow,
 * drawMouth and drawBlush (the mouth's wave taken at its worst phase, so the
 * outline does not depend on mouthWavePhase). P: a full face parameter set
 * (NEUTRAL filled in).
 */
export function faceOutline(spec, P) {
  const out = [];
  for (const side of ['L', 'R']) {
    const e = spec.eyes[side];
    const g = eyeGeom(e, side, P);
    out.push([`eye ${side}`, [...sampleCubic([g.xout, g.yout], g.up[0], g.up[1], [g.xin, g.yin], 12), ...sampleCubic([g.xin, g.yin], g.lo[0], g.lo[1], [g.xout, g.yout], 12)], (e.lw * (1 + P.squint * 0.12)) / 2]);
    const b = spec.brows?.[side];
    if (b && P.browAlpha >= 0.02) {
      const unit = e.r * 0.42;
      const innerIsP1 = side === 'L' ? b.p1[0] > b.p0[0] : b.p1[0] < b.p0[0];
      const lift = -P.browY * unit, tiltIn = -P.browTilt * unit * 1.55, tiltOut = P.browTilt * unit * 0.45;
      const p0 = [b.p0[0], b.p0[1] + lift + (innerIsP1 ? tiltOut : tiltIn)];
      const p1 = [b.p1[0], b.p1[1] + lift + (innerIsP1 ? tiltIn : tiltOut)];
      const mid = [(b.p0[0] + b.p1[0]) / 2, (b.p0[1] + b.p1[1]) / 2];
      const c = [b.c[0], mid[1] + lift + (b.c[1] - mid[1]) + (tiltIn + tiltOut) * 0.5];
      out.push([`brow ${side}`, sampleQuad(p0, c, p1, 12), b.lw / 2]);
    }
    if (P.blush >= 0.02) {
      const [x, y, r] = spec.cheeks[side];
      const rr = r * (1.1 + 0.25 * clamp(P.blush, 0, 1.5));
      out.push([`blush ${side}`, Array.from({ length: 16 }, (_, k) => [x + rr * Math.cos((k * Math.PI) / 8), y + rr * Math.sin((k * Math.PI) / 8)]), 0]);
    }
  }
  const M = spec.mouth;
  const s = clamp(P.mouthSmile, -1.2, 1.2), o = clamp(P.mouthOpen, 0, 1.4), r = clamp(P.mouthRound, 0, 1);
  const W = M.w * clamp(P.mouthWidth, 0.3, 1.5) * (1 - 0.5 * r);
  const sag = M.sag * s * (1 - 0.6 * r), y0 = M.y + P.mouthY, skew = P.mouthSkew * M.w * 0.1;
  const waveAmp = P.mouthWave * M.w * 0.06, roundness = clamp(r * 0.9 + o * 0.25, 0, 1);
  const depth = o * M.w * 0.42 * (1 + 0.2 * r) * (1 - 0.35 * r);
  const line = (yOff, dep) => Array.from({ length: 13 }, (_, i) => {
    const u = i / 12, par0 = 4 * u * (1 - u), par = lerp(par0, Math.sqrt(par0), roundness);
    const x = lerp(M.x - W / 2, M.x + W / 2, u), y = y0 + lerp(skew, -skew, u) + par * (sag + dep) + yOff * par;
    const wv = Math.abs(waveAmp) * Math.sin(Math.PI * u);                  // the wave at its worst phase, either way
    return [[x, y - wv], [x, y + wv]];
  }).flat();
  out.push(['mouth', o < 0.04 ? line(0, 0) : [...line(-depth * (0.12 + 0.4 * r), 0), ...line(0, depth)], M.lw / 2]);
  return out;
}

// --------------------------------------------------------- spin, pulses --

/**
 * Spin (plan safety): whatever turns on screen turns at most 1 turn/s, at most
 * 0.3 turn/s while its disc covers more than 25 % of the frame (a close-up),
 * and changes speed no faster than an inOutSine ease from rest to its top
 * speed over 0.5 s would: its ramp, (π/2)·peak / max |dω/dt|, is ≥ 0.5 s.
 * What turns: props whose controller reports an angle (item.th in radians:
 * the orbit; its disc is the orbit ellipse at the prop's radius, zoomed), and
 * the face's spiral (face.spin, a phase in turns; its disc is both eyes).
 */
function spinChecks(direction, sc, { D, P, err, metrics }) {
  const T = THRESHOLDS, hz = T.deformHz, h = 1e-3;
  const frame = direction.meta.width * direction.meta.height;
  const zoom = (t) => sc.raw.camAt(t).zoom;
  const sources = [];
  for (const p of sc.props) {
    const def = (direction.props || []).find((q) => q.id === p.id);
    const E = def?.params?.ellipse;
    const radius = def?.channels?.radius ? sc.channel(def.channels.radius) : () => 1;
    for (let i = 0; i < p.count; i++) {
      sources.push({
        id: p.id,
        rate: (t) => { const a = p.at(i, t - h), b = p.at(i, t + h); return a && b && Number.isFinite(a.th) && Number.isFinite(b.th) ? (b.th - a.th) / (2 * h) / (2 * Math.PI) : null; },
        cover: (t) => (E ? (Math.PI * E.rx * E.ry * radius(t) ** 2 * zoom(t) ** 2) / frame : 0),
      });
    }
  }
  if (direction.channels['face.spin']) {
    const f = sc.channel('face.spin'), eyes = direction.mallow.faceSpec.eyes, s = direction.mallow.placement.scale;
    sources.push({
      id: 'face.spin',
      rate: (t) => (f(t + h) - f(t - h)) / (2 * h),
      cover: (t) => (Math.PI * (eyes.L.r ** 2 + eyes.R.r ** 2) * ((sc.raw.faceAt(t).eyeScale ?? 1) * s * zoom(t)) ** 2) / frame,
    });
  }
  const byId = new Map();
  for (const src of sources) {
    let peak = 0, at = null, acc = 0, cover = 0, close = null, prev = null;
    for (let k = 0; k <= D * hz; k++) {
      const t = -P + k / hz;
      const w = src.rate(t);
      if (w === null) { prev = null; continue; }
      const c = src.cover(t);
      cover = Math.max(cover, c);
      if (Math.abs(w) > peak) { peak = Math.abs(w); at = t; }
      if (c > T.closeUpCover && Math.abs(w) > T.spinMaxClose && (!close || Math.abs(w) > close.rate)) close = { rate: Math.abs(w), t, cover: c };
      if (prev !== null) acc = Math.max(acc, Math.abs(w - prev) * hz);
      prev = w;
    }
    const ramp = peak >= T.spinFloor ? ((Math.PI / 2) * peak) / Math.max(acc, 1e-12) : Infinity;
    const m = byId.get(src.id);
    if (!m || peak > m.peak) byId.set(src.id, { id: src.id, peak, at, maxAccel: acc, ramp: Math.min(ramp, m?.ramp ?? Infinity), cover, close: close ?? m?.close ?? null });
    else { m.ramp = Math.min(m.ramp, ramp); m.close = m.close ?? close; }
  }
  const out = [...byId.values()];
  metrics.spin = out.map((m) => ({ ...m, ramp: Number.isFinite(m.ramp) ? m.ramp : null }));
  for (const m of out) {
    if (m.peak > T.spinMax) err('safety:spin', `${m.id} spins ${m.peak.toFixed(3)} turns/s at t=${m.at.toFixed(2)} (max ${T.spinMax})`);
    if (m.close) err('safety:spin', `${m.id} spins ${m.close.rate.toFixed(3)} turns/s at t=${m.close.t.toFixed(2)} while its disc covers ${(100 * m.close.cover).toFixed(0)} % of the frame (close-up max ${T.spinMaxClose})`);
    if (m.ramp < T.spinRamp) err('safety:spin-ramp', `${m.id} changes speed by up to ${m.maxAccel.toFixed(2)} turns/s² against a top speed of ${m.peak.toFixed(3)} turns/s: a ${m.ramp.toFixed(2)} s ramp (min ${T.spinRamp} s)`);
  }
}

/**
 * Pulse ramps (plan safety; realm presets: "strike → falling star or shaft,
 * ramp ≥ 150 ms"): a light pulse never switches; it rises and falls over at
 * least 150 ms. Each pulse channel is measured, not trusted: on its periodic
 * extension over two loops, every swing between successive turning points
 * (swings under 2 % of its range are ripple) lasts at least pulseRamp.
 */
function pulseChecks(direction, sc, { D, P, err, metrics }) {
  const T = THRESHOLDS, hz = 1000;
  const out = [];
  for (const [name, def] of Object.entries(direction.channels)) {
    if (def.type !== 'pulse') continue;
    const f = sc.channel(name);
    const v = Array.from({ length: Math.round(2 * D * hz) + 1 }, (_, k) => { const t = -P + k / hz; return f(t >= D - P ? t - D : t); });
    let lo = Infinity, hi = -Infinity;
    for (const x of v) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    const piv = turningPoints(v, T.pulseFloor * (hi - lo));
    let shortest = Infinity, at = null;
    for (let j = 2; j < piv.length - 1; j++) {                               // swings that touch neither end of the scan
      const dur = (piv[j] - piv[j - 1]) / hz;
      if (dur < shortest) { shortest = dur; at = -P + piv[j - 1] / hz; }
    }
    if (hi - lo <= 1e-9) shortest = Infinity;
    out.push({ channel: name, ramp: Number.isFinite(shortest) ? shortest : null, at: at === null ? null : at % D });
    if (shortest < T.pulseRamp) err('safety:pulse', `${name} swings in ${shortest.toFixed(3)} s at t=${(at % D).toFixed(2)} (pulse ramps ≥ ${T.pulseRamp} s)`);
  }
  metrics.pulses = out;
}

/** Indices of the turning points of v, ignoring reversals smaller than floor (a zigzag); the first and last index included. */
function turningPoints(v, floor) {
  const piv = [0];
  let dir = 0, cand = 0;
  for (let k = 1; k < v.length; k++) {
    if (dir === 0) {
      if (Math.abs(v[k] - v[0]) > floor) { dir = Math.sign(v[k] - v[0]); cand = k; }
    } else if ((v[k] - v[cand]) * dir >= 0) cand = k;
    else if ((v[cand] - v[k]) * dir > floor) { piv.push(cand); dir = -dir; cand = k; }
  }
  if (dir !== 0) piv.push(cand);
  if (piv[piv.length - 1] !== v.length - 1) piv.push(v.length - 1);
  return piv;
}

// --------------------------------------------------------- continuity --

/**
 * C1 continuity except at declared kicks (plan craft). Every channel that is
 * not a declared kick (impulses, hops, shimmer, ripples) keeps a continuous
 * value and slope. The slope is compared on either side of every time where
 * the channel's definition can break it: key times and the ends of eased keys
 * (an ease whose end slope is not 0, e.g. outCubic, breaks it), spline knots
 * (a spline that ends inside the loop on a slope breaks it), blink phases,
 * smoothstep edges and the times a min / max / clamp switches branch, and the
 * same for the envelope the channel is scaled by. Inside the loop only: the
 * seam is loop closure's (loop:slope). A slope jump above c1Kink × the
 * channel's range per second is an error, above c1KinkWarn × range a warning.
 */
function c1Checks(direction, sc, { D, P, err, warn, metrics }) {
  const T = THRESHOLDS, lo = -P, hi = D - P;
  const channels = direction.channels;
  const timesOf = (def, seen) => {
    const ts = [];
    if (def.type === 'track') for (const k of def.keys) { ts.push(k.t); if (k.ease) ts.push(k.t + k.dur); }
    else if (def.type === 'spline') for (const k of def.keys) ts.push(k.t);
    else if (def.type === 'blinks') for (const b of def.list) ts.push(b.t, b.t + b.close, b.t + b.close + b.hold, b.t + b.close + b.hold + b.open);
    else if (def.type === 'expr') ts.push(...exprWindows(def.expr).flat(), ...exprSwitchTimes(def.expr, lo, hi));
    const env = def.env === undefined ? null : channels[`env.${def.env}`];
    if (env && !seen.has(def.env)) { seen.add(def.env); ts.push(...timesOf(env, seen)); }
    return ts;
  };
  // the slope jump at t: one-sided slopes at two step sizes, extrapolated to h → 0 (the smooth part of the
  // difference is linear in h; a kink is not, a jump grows as 1/h)
  const kinkAt = (f, t) => {
    const k = (h) => (f(t + h) - f(t)) / h - (f(t) - f(t - h)) / h;
    return Math.abs((10 * k(1e-6) - k(1e-5)) / 9);
  };
  let worst = { kink: 0, perRange: 0, channel: null, t: null }, checked = 0;
  const kinks = [];
  for (const [name, def] of Object.entries(channels)) {
    if (!C1_TYPES.has(def.type) || def.type === 'const') continue;
    const ts = [...new Set(timesOf(def, new Set()))].filter((t) => t > lo + 1e-5 && t < hi - 1e-5);
    if (!ts.length) continue;
    const f = sc.channel(name);
    let vmin = Infinity, vmax = -Infinity;
    for (let i = 0; i <= D * 120; i++) { const v = f(lo + i / 120); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }
    const range = Math.max(vmax - vmin, 1e-9);
    let top = null;
    for (const t of ts) {
      checked++;
      const k = kinkAt(f, t);
      if (k / range > worst.perRange) worst = { kink: k, perRange: k / range, channel: name, t };
      if (k > Math.max(T.c1KinkWarn * range, 1e-6) && (!top || k > top.k)) top = { k, t };
    }
    if (!top) continue;
    kinks.push({ channel: name, t: top.t, kink: top.k, perRange: top.k / range });
    const msg = `${name}: the slope jumps by ${top.k.toPrecision(3)}/s at t=${top.t.toFixed(4)} (${(top.k / range).toPrecision(3)}× its range per s)`;
    if (top.k > T.c1Kink * range) err('craft:c1', `${msg}: not C1 and not a declared kick (limit ${T.c1Kink}× range per s)`);
    else warn('craft:c1-kink', `${msg}: under the calibrated limit (${T.c1Kink}×; provisional: v2's breath envelope kinks 1.26×), over the plan's strict C1 (${T.c1KinkWarn}×)`);
  }
  metrics.c1 = { checked, worst, kinks };
}

/** Times in [lo, hi] where a min, max or clamp in an envelope expression switches branch (where it can kink). */
function exprSwitchTimes(e, lo, hi, step = 0.002) {
  const gs = [];
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    const [op] = Object.keys(n);
    if (op === 'ss') return;
    const args = n[op];
    if (op === 'max' || op === 'min') {
      const fs = args.map(compileExpr);
      for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) gs.push((t) => fs[i](t) - fs[j](t));
    }
    if (op === 'clamp') { const f = compileExpr(args[0]); gs.push((t) => f(t) - args[1], (t) => f(t) - args[2]); }
    for (const a of op === 'clamp' ? [args[0]] : args) walk(a);
  };
  walk(e);
  const out = [];
  const n = Math.ceil((hi - lo) / step);
  for (const g of gs) {
    let t0 = lo, g0 = g(lo);
    for (let i = 1; i <= n; i++) {
      const t1 = lo + i * step, g1 = g(t1);
      if ((g0 < 0 && g1 > 0) || (g0 > 0 && g1 < 0)) {
        let a = t0, b = t1;
        for (let k = 0; k < 60; k++) { const m = (a + b) / 2; if (g(m) < 0 === g0 < 0) a = m; else b = m; }
        out.push((a + b) / 2);
      }
      t0 = t1; g0 = g1;
    }
  }
  return out;
}

// ------------------------------------------------------- audio linkage --

/**
 * No absolute-time layers (plan audio linkage; audit R10/R11). Every time a cue
 * hands the score for a layer window (CUE_TIME_FIELDS) sits on the clock, at an
 * anchor or at another cue, never on a bare second; and the score the
 * direction names builds its layers from cues. The frozen soundtrack-v2 keys
 * its layers to v2's own seconds: it is accepted, as a warning, only for the
 * approved film it was written for (compose.js SCORE.legacy), never for
 * another direction.
 */
function absoluteTimeChecks(direction, { err, warn, metrics }) {
  const clock = [...Object.values(direction.anchors), ...direction.cues.map((c) => c.t)].filter(Number.isFinite);
  let fields = 0;
  for (const c of direction.cues) {
    for (const k of CUE_TIME_FIELDS) {
      if (!c.data || !Object.hasOwn(c.data, k)) continue;
      const v = c.data[k];
      fields++;
      if (typeof v !== 'number' || !clock.some((a) => Math.abs(a - v) <= 1e-9)) err('audio:absolute-time', `cue '${c.type}' (${c.by}, t=${c.t}): data.${k} = ${v} is neither an anchor nor a cue time`);
    }
  }
  const score = direction.meta.score, layers = Object.hasOwn(SCORE_LAYERS, score) ? SCORE_LAYERS[score] : null;
  if (!layers) err('audio:score', `unknown score '${score}' (known: ${Object.keys(SCORE_LAYERS).join(', ')})`);
  else if (layers === 'absolute') {
    const msg = `score ${score} keys its tick, swirl and bed layers to absolute seconds (audit R10/R11)`;
    if (SCORE.legacy[direction.meta.fingerprint] === score) warn('audio:absolute-layers', `${msg}: accepted for the approved film only (frozen)`);
    else err('audio:absolute-layers', `${msg}; only the approved film may keep it (fingerprint ${direction.meta.fingerprint})`);
  }
  metrics.audioTimes = { fields, score, layers };
}

// -------------------------------------------------------------- poses --

/**
 * Pose contracts on compiled values (composer/poses.js): every span move's
 * entry pose holds at the start of its span and its exit pose at its end,
 * channel by channel (the track's own value). A junction that needed a bridge
 * is judged after the bridge, so pose:entry is the proof the bridge landed.
 * Recorded bridges must join two adjacent span moves, inside their gap.
 */
function poseChecks(direction, sc, moves, { err, metrics }) {
  const A = direction.anchors;
  const value = (ch, t) => (direction.channels[ch] ? sc.channel(ch)(t) : channelInfo(ch)?.v0 ?? 0);
  const fmt = (v) => (Math.abs(v) >= 1e-3 || v === 0 ? v.toFixed(4) : v.toExponential(2));
  const spans = [];
  for (const m of direction.moves || []) {
    const mv = moves[m.id];
    if (!mv?.span || !mv.entry) continue;
    const unknown = [mv.entry, mv.exit].filter((p) => !Object.hasOwn(POSES, p));
    for (const p of unknown) err('pose:unknown', `${m.id} declares pose '${p}', which is not in the pose table (composer/poses.js)`);
    spans.push({ id: m.id, entry: mv.entry, exit: mv.exit, span: mv.span.map((r) => resolveRef(r, A)) });
  }
  const bridges = direction.provenance?.bridges || [];
  const out = [];
  spans.forEach((s, i) => {
    const prev = spans[i - 1];
    for (const [which, t, name] of [['entry', s.span[0], s.entry], ['exit', s.span[1], s.exit]]) {
      if (!Object.hasOwn(POSES, name)) continue;
      const bad = [];
      for (const [ch, [lo, hi]] of Object.entries(POSES[name])) {
        const v = value(ch, t);
        if (!inRange(v, [lo, hi], POSE_TOL)) bad.push(`${ch} = ${fmt(v)} ∉ [${lo}, ${hi}]`);
      }
      out.push({ move: s.id, which, t, pose: name, ok: bad.length === 0 });
      if (!bad.length) continue;
      const after = which === 'entry' && prev ? ` after ${prev.id}${bridges.some((b) => b.after === prev.id && b.before === s.id) ? ' and its bridge' : ' (no bridge)'}` : '';
      err(`pose:${which}`, `${s.id} ${which === 'entry' ? 'enters' : 'exits'} '${name}' at t=${t}${after}, but ${bad.join(', ')}`);
    }
  });
  for (const b of bridges) {
    const i = spans.findIndex((s) => s.id === b.before);
    if (i < 1 || spans[i - 1].id !== b.after) err('pose:bridge', `bridge ${b.after} → ${b.before} does not join two adjacent span moves`);
    else if (!(b.at >= spans[i - 1].span[1] - 1e-9 && b.at < spans[i].span[0])) err('pose:bridge', `bridge ${b.after} → ${b.before} at t=${b.at} is outside the gap [${spans[i - 1].span[1]}, ${spans[i].span[0]})`);
  }
  metrics.poses = out;
}
