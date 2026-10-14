// G-DIR: the compile-time gate on a direction (PHASE2-PLAN "G-DIR (compile,
// under 3 s in Node)"). Pure: evaluates the direction with composer/scene.js,
// the same code the engine runtime renders with.
//
//   gdir(compiled, { spec, lib }) → { pass, errors: [{ rule, message }], warnings, metrics }
//
// compiled is compose()'s result ({ direction, report }) or a bare direction.
//
// Rule groups: structure, loop closure, deformation, camera, text, safety,
// craft, audio linkage, poses. Thresholds are the plan's, except where the
// approved v2 itself sits outside them: those are calibrated on v2, marked
// provisional in THRESHOLDS, and listed in docs/wp/WP-03.md "Deviations".

import { createScene } from './scene.js';
import { checkChannels, BODY_DOFS, FACE_PARAMS } from './channels.js';
import { MOVES } from './moves/index.js';
import { textLine } from './layout.js';
import { domain } from './circular.js';
import { CONTROLLERS } from './controllers/index.js';
import { mismatches } from './poses.js';

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
});

const C1_TYPES = new Set(['track', 'spline', 'expr', 'noise', 'sine', 'envscale', 'ramp', 'pulse', 'const', 'blinks']);
const KICK_TYPES = new Set(['impulses', 'hops', 'shimmer', 'ripples']);   // declared discontinuities of the derivative

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

  // -------------------------------------------------------------- craft --
  const impact = A.IMPACT;
  if (!(impact >= T.impact[0] && impact <= T.impact[1])) err('craft:impact', `gag impact at ${impact} s (must land in ${T.impact.join('–')} s)`);
  for (const [name, def] of Object.entries(direction.channels)) {
    if (!C1_TYPES.has(def.type) && !KICK_TYPES.has(def.type)) err('craft:c1', `${name}: channel type ${def.type} is not C1 and not a declared kick`);
  }
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

  // -------------------------------------------------------------- poses --
  const seq = (direction.moves || []).map((m) => moves[m.id]).filter((m) => m?.entry);
  for (let i = 1; i < seq.length; i++) {
    const mm = mismatches(seq[i - 1].exit, seq[i].entry);
    if (mm.length && !(direction.provenance?.bridges || []).length) warn('pose:mismatch', `${seq[i - 1].id} exits ${seq[i - 1].exit}, ${seq[i].id} enters ${seq[i].entry} (${mm.map((m) => m.channel).join(', ')})`);
  }

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

