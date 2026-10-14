// The composer: spec.json (hm-variant/1) → direction.json (hm-direction/3).
//
//   compose(spec, { lib, data?, measure?, options? })   async; the planner's seam
//   composeWith(spec, { lib, data, measure, options })  the pure core (sync)
//
// Stages (PHASE2-PLAN "COMPOSER STAGES"):
//   1. inputs: template, beat clock, character pack, realm preset at the ToD,
//      tuning cells, move modules; named random streams from spec.seed
//   2. layout: hook auto-fit, end card, prop sizes (moves measure their props)
//   3. moves in slot order, each writing typed channels inside its ownership
//      windows, publishing sub-anchors and posts, emitting its own cues
//   4. personality pass (composer/personality.js)
//   5. acting pass: rest windows, deferred values, auto-blinks, micro-noise,
//      bridges between mismatching poses (composer/acting.js, poses.js)
//   6. build: keys sorted, duplicates and overlaps refused (channels.js)
//   7. circular wrap: the loop move chooses the seam P (circular.js)
//   8. direction.json: every value explicit, no randomness left
// G-DIR (validate.js) and G-COST (cost.js) judge the result separately.
//
// Pure ESM: runs in the render page (data fetched, real Fredoka measurement)
// and in Node (data from disk through ./lib-node.mjs, font-metrics shim).

import { clockAnchors, jitterAnchors, at, snap, resolveRef } from './clock.js';
import { ChannelSet, CompileError, CATALOGUE, BODY_DOFS, FACE_V2, FACE_PARAMS } from './channels.js';
import { streams } from './rng.js';
import { movesForSpec, MOVES } from './moves/index.js';
import { applyPersonality, personalityOf } from './personality.js';
import { resolver, autoBlinks } from './acting.js';
import { planBridges } from './poses.js';
import { layoutHook, TEXT_STYLES } from './layout.js';
import { domain } from './circular.js';
import { PAN } from './audio.js';

export const COMPOSER_VERSION = '3.0.0';
export const DIRECTION_SCHEMA = 'hm-direction/3';

/** Frame model of the approved v2 ("exact" rules): 30 fps, shutter 0.4, 3–16 sub-frames ≤ 2 px apart. */
export const FRAME = Object.freeze({ width: 1080, height: 1920, fps: 30, shutter: 0.4, subframes: 3, subframeMax: 16, subframePx: 2 });

/** The orbit ellipse of thought props when the library gives none (story-library format.layout.thoughtBubble.orbit). */
const DEFAULT_ORBIT = Object.freeze({ cx: 540, cy: 600, rx: 270, ry: 132 });

/**
 * Compose a spec. lib: the story library (planner/library.mjs loadLibrary(),
 * or composer/library.js indexLibraryLite() in the page). data: { pack, realm,
 * tuning, faceSpec, silhouette, measure, hashes } — loaded from disk when
 * omitted (Node only). → { direction, report }
 */
export async function compose(spec, opts = {}) {
  let { lib, data, measure } = opts;
  if (!data || !lib) {
    const node = await import('./lib-node.mjs');
    data = data || node.loadComposerData(spec);
    lib = lib || node.loadLib();
  }
  return composeWith(spec, { lib, data, measure: measure || data.measure, options: opts.options || {}, moves: opts.moves });
}

/**
 * The pure core of compose(). options: { personality: true, acting: true }
 * (switching them off is for tests only). moves: the move registry (default
 * composer/moves; tests pass an extended one with fixture moves).
 */
export function composeWith(spec, { lib, data, measure, options = {}, moves = MOVES }) {
  if (spec.schema !== 'hm-variant/1') throw new CompileError('spec:schema', `expected an hm-variant/1 spec, got ${spec.schema}`);
  if (typeof measure !== 'function') throw new CompileError('layout:measure', 'compose needs a measure(text, style) function');
  const template = lib.template(spec.template);
  if (!template) throw new CompileError('spec:template', `unknown template ${spec.template}`);
  const D = Number(spec.duration);
  const { pack, realm } = data;
  if (!pack || pack.id !== spec.mallow) throw new CompileError('pack:missing', `no character pack for ${spec.mallow}`);
  if (pack.status === 'blocked') throw new CompileError('pack:blocked', `${pack.id} is blocked: ${pack.blocked ?? ''}`);
  if (!realm || realm.id !== spec.realm) throw new CompileError('realm:missing', `no realm preset for ${spec.realm}`);
  const tod = realm.tods?.[spec.tod];
  if (!tod) throw new CompileError('realm:tod', `${realm.id} has no preset for time of day "${spec.tod}"`);
  if (!(realm.weather || []).includes(spec.weather)) throw new CompileError('realm:weather', `${realm.id} offers no weather "${spec.weather}"`);
  if ((spec.dressing || []).length) throw new CompileError('realm:dressing', `dressing ${JSON.stringify(spec.dressing)} is not built yet (WP-14)`);
  const faceSpec = data.faceSpec, silhouette = data.silhouette;
  if (!faceSpec?.eyes?.L || !silhouette) throw new CompileError('pack:measured', `${pack.id}: face spec and silhouette are required (no fallback, R13)`);
  const rng = streams(spec.seed);

  // ---- 1. moves, cells, clock, seam
  const seq = movesForSpec(spec, moves);
  const cells = Object.fromEntries(seq.map(({ id }) => [id, cellOf(data.tuning, id, pack.id)]));
  let A = clockAnchors(lib.clocks[D], D);
  const jitterOk = seq.every(({ id }) => cells[id].jitter === true);
  if (jitterOk) A = jitterAnchors(A, () => rng.get('clock').next());
  const loop = seq.find((m) => m.slot === 'loop');
  const P = loop?.move.seam ? loop.move.seam(A) : 0;
  domain(D, P);
  const set = new ChannelSet({ D, P, neutral: pack.face.neutral });
  const per = personalityOf(pack);

  // ---- 2. layout and the composer's own writes
  const layout = { measuredBy: data.measuredBy || 'shim' };
  layout.hook = layoutHook(spec.copy.hook, measure);
  const texts = [];
  const cues = [];
  const posts = new Map();
  const props = [];
  const intents = [];
  const hookStyle = TEXT_STYLES.hook;
  set.setWriter('composer', 0);
  texts.push({ id: 'hook', kind: 'textblock', z: 0, by: 'composer', opts: { lines: layout.hook.lines, y: hookStyle.y, size: layout.hook.size, weight: hookStyle.weight, tracking: hookStyle.tracking, enterAt: -10, exitAt: A.HOOK_OUT, exitDur: 0.5 }, widths: layout.hook.widths, readable: { min: 2.0, with: 'hookReturn' } });
  set.term('face.browTilt', { type: 'const', value: pack.face.channels.browTilt });
  set.term('face.mouthWavePhase', { type: 'ramp', rate: pack.face.channels.mouthWaveRate });
  cues.push({ t: 0, type: 'scene', data: { loop: D }, by: 'composer' });

  // ---- 3. moves in slot order
  const ran = [];
  for (const m of seq) {
    const mv = m.move;
    const params = resolveParams(mv, cells[m.id], spec);
    set.setWriter(m.id, m.rank);
    const published = [];
    if (mv.publishes) {
      for (const [name, t] of Object.entries(mv.publishes(A, at, params))) {
        if (name in A) throw new CompileError('anchor:twice', `${m.id} publishes '${name}', already published`);
        A[name] = snap(t);
        published.push(name);
      }
    }
    for (const [ch, [from, to]] of Object.entries(mv.owns || {})) set.own(ch, resolveRef(from, A), resolveRef(to, A));
    const ctx = makeCtx({ m, mv, A, D, P, set, spec, template, pack, realm: { ...realm, tod: spec.tod, preset: tod }, layout, texts, cues, posts, props, intents, rng, measure, per, lib });
    mv.compile(ctx, A, params);
    ran.push({ slot: m.slot, id: m.id, rank: m.rank, params, published, cell: { status: cells[m.id].status, version: data.tuning?.[m.id]?.version ?? null } });
  }

  // ---- 4. personality
  const impact = (posts.get('gag.impact') || [])[0]?.value ?? null;
  const personality = options.personality === false ? null : applyPersonality(set, pack, { intents, impact });
  if (options.personality === false && intents.length) throw new CompileError('intent', 'intents need the personality pass');

  // ---- 5. acting
  set.setWriter('composer', 0);
  const leave = (posts.get('rest.leave') || []).map((p) => p.value), ret = (posts.get('rest.return') || []).map((p) => p.value);
  if (leave.length !== 1 || ret.length !== 1) throw new CompileError('loop:rest', `the painted rest needs one leave and one return window (have ${leave.length} / ${ret.length}): the loop must start and end on the painting`);
  set.term('env.rest', { type: 'expr', expr: { clamp: [{ add: [{ sub: [1, { ss: leave[0] }] }, { ss: ret[0] }] }, 0, 1] } });
  for (const p of FACE_V2) set.def(`face.${p}`);
  const R = resolver({ A, posts, provisional: set.build(), props, pack, faceSpec, silhouette });
  set.resolve(R);
  for (const c of cues) for (const k of Object.keys(c.data)) if (typeof c.data[k] === 'function') c.data[k] = c.data[k](R);
  const acting = { blinks: [], microNoise: false, bridges: [] };
  if (options.acting !== false) {
    set.setWriter('acting', 99);
    const built = set.build();
    acting.blinks = autoBlinks(built, { rate: per.blinkRate, rnd: () => rng.get('blinks').next(), avoid: impact === null ? [] : [impact], D });
    for (const t of acting.blinks) set.push('face.blink', { t, close: 0.07, hold: 0.02, open: 0.13 });
    if (per.microNoise > 0) {
      acting.microNoise = true;
      set.term('env.micro', { type: 'expr', expr: { mul: [{ ss: [at(-P, 0.5), at(-P, 1.5)] }, { sub: [1, { ss: [at(D - P, -1.5), at(D - P, -0.5)] }] }] } });
      set.term('body.squash.micro', { type: 'noise', env: 'micro', amp: per.microNoise, rate: 2.3, seed: 11 });
      set.term('body.sway.micro', { type: 'noise', env: 'micro', amp: per.microNoise * 4, rate: 1.7, seed: 13 });
    }
    const spans = seq.filter(({ move }) => move.span && move.entry).map(({ id, move }) => ({ id, entry: move.entry, exit: move.exit, span: move.span.map((r) => resolveRef(r, A)) }));
    for (const b of planBridges(spans)) {
      set.setWriter('acting/bridge', 98);
      try {
        const bridge = moves['acting/bridge'] ?? MOVES['acting/bridge'];
        bridge.compile(makeCtx({ m: { id: 'acting/bridge', rank: 98 }, mv: bridge, A, D, P, set, spec, template, pack, realm, layout, texts, cues, posts, props, intents, rng, measure, per, lib }), A, {}, b);
      } catch (e) {
        if (e.rule === 'channel:ownership') throw new CompileError('pose:bridge-conflict', `bridge ${b.after} → ${b.before}: ${e.detail}`);
        throw e;
      }
      acting.bridges.push({ after: b.after, before: b.before, at: b.at, channels: b.channels.map((c) => c.channel) });
    }
  }

  // ---- 6. build
  const channels = set.build();
  const body = Object.fromEntries(BODY_DOFS.map((d) => [d, []]));
  const layers = Object.entries(CATALOGUE).filter(([n, i]) => i.dof && channels[n]);
  for (const dof of BODY_DOFS) {
    const mine = layers.filter(([, i]) => i.dof.split('+').includes(dof)).sort((a, b) => a[1].order - b[1].order);
    body[dof] = mine.map(([n, i]) => (i.type === 'shimmer' ? `${n}#${dof === 'shimmer' ? 'amp' : 'phase'}` : n));
  }
  const face = [...FACE_V2, ...FACE_PARAMS.filter((p) => !FACE_V2.includes(p) && channels[`face.${p}`])].map((p) => [p, `face.${p}`]);
  for (const [, name] of face) if (!channels[name]) throw new CompileError('channel', `face channel ${name} missing`);

  const jitter = spec.worldJitter && (spec.worldJitter.hue || spec.worldJitter.warmth || spec.worldJitter.exposure) ? { ...spec.worldJitter } : null;
  const W = realm.constants.world, cel = tod.celestial;
  const direction = {
    schema: DIRECTION_SCHEMA,
    meta: {
      id: spec.id, title: template.title, fps: FRAME.fps, duration: D, width: FRAME.width, height: FRAME.height,
      subframes: FRAME.subframes, subframeMax: FRAME.subframeMax, subframePx: FRAME.subframePx, shutter: FRAME.shutter, P,
      runtime: 'v3', score: 'soundtrack-v2', profile: spec.quality, internal: spec.internal, layout: layout.measuredBy,
      template: template.id, spec: spec.id, fingerprint: spec.fingerprint ?? null, composer: COMPOSER_VERSION,
    },
    anchors: { ...A },
    mallow: {
      id: pack.id, registry: pack.registry, rigScale: pack.face.rigScale,
      assets: { pristine: pack.art.pristine, clean: pack.art.clean, normal: pack.art.normal, face: pack.art.face },
      artSize: pack.art.size, placement: { baseX: pack.placement.baseX, baseY: pack.placement.baseY, scale: pack.placement.scale },
      silhouette, faceSpec, faceStyle: pack.face.style, body: { lag: pack.body.lag, cols: pack.body.cols, rows: pack.body.rows },
      limits: { ...pack.body.limits },
      light: { dir: tod.light.dir, sss: pack.light.sss },
    },
    realm: {
      id: realm.id, tod: spec.tod, palette: tod.palette,
      world: { horizonY: W.horizonY, moon: [cel.x, cel.y, cel.r], fresnel: W.fresnel, reflAmt: W.reflAmt, shadow: W.shadow, shadowFall: W.shadowFall, contactSpread: W.contactSpread, skyParallax: W.skyParallax, skyCentreX: W.skyCentreX, rippleLife: W.rippleLife },
      post: { ...realm.post },
      jitter,
    },
    channels,
    body,
    face,
    props: props.map(({ provenance, ...p }) => p),
    text: [...texts].sort((a, b) => a.z - b.z),
    cues,
    // the curve-pan constants the score reads (one source: composer/audio.js PAN)
    audio: { pan: { centre: PAN.centre, curveNorm: PAN.curveNorm } },
    layout,
    probes: probesOf(A, D),
    moves: ran,
    provenance: {
      composer: COMPOSER_VERSION, cells: Object.fromEntries(ran.map((r) => [`${r.id}/${pack.id}`, r.cell])),
      pack: { file: `library/mallows/${pack.id}.json`, version: pack.version, sha256: data.hashes?.pack ?? null },
      realm: { file: `library/realms/${realm.id}.json`, version: realm.version, sha256: data.hashes?.realm ?? null },
      tuning: { file: 'library/tuning-matrix.json', sha256: data.hashes?.tuning ?? null },
      props: Object.fromEntries(props.map((p) => [p.id, p.provenance])),
      bridges: acting.bridges,
    },
  };
  return { direction, report: { personality, acting, cells, jitter: jitterOk, posts: Object.fromEntries([...posts].map(([k, l]) => [k, l.map((p) => ({ by: p.by, value: p.value }))])) } };
}

/** The cell of (move, mallow) in the tuning matrix; a missing cell is a hard error. */
function cellOf(tuning, moveId, mallow) {
  const cell = tuning?.[moveId]?.cells?.[mallow];
  if (!cell) throw new CompileError('cell:missing', `no tuning cell for ${moveId} × ${mallow} in library/tuning-matrix.json`);
  if (cell.status === 'untuned') throw new CompileError('cell:untuned', `${moveId} × ${mallow} is untuned`);
  return cell;
}

/** Move params: module defaults ← cell tuning ← spec-driven values, each checked against the cell's approved range. */
function resolveParams(mv, cell, spec) {
  const p = {};
  for (const [k, d] of Object.entries(mv.params || {})) p[k] = d.def;
  Object.assign(p, cell.tuning || {});
  if (mv.kind === 'gag' && 'intensity' in (mv.params || {})) p.intensity = spec.gag.intensity;
  for (const [k, v] of Object.entries(p)) {
    if (!(k in (mv.params || {}))) throw new CompileError('param:unknown', `${mv.id}: unknown param "${k}"`);
    const r = cell.ranges?.[k] ?? mv.params[k].range;
    if (r && typeof v === 'number' && (v < r[0] - 1e-12 || v > r[1] + 1e-12)) throw new CompileError('param:range', `${mv.id}.${k} = ${v} is outside the approved range [${r[0]}, ${r[1]}]`);
  }
  return p;
}

/** QA probe times (G-DUPES anchors and rest probes), on frame times. */
function probesOf(A, D) {
  const f = (t) => Math.round(t * FRAME.fps) / FRAME.fps;
  return [
    { label: 'cover', t: 0 }, { label: 'gag', t: f(A.GAG) }, { label: 'impact', t: f(A.IMPACT) },
    { label: 'peak', t: f((A.PEAK0 + A.PEAK1) / 2) }, { label: 'ritual-mid', t: f((A.RITUAL0 + A.RITUAL1) / 2) },
    { label: 'eyes-open', t: f(A.OPEN + 0.5) }, { label: 'end-card', t: f(A.LOGO + 0.5) }, { label: 'rest-end', t: f(D - 0.2) },
  ];
}

/** The context a move compiles with (docs/ARCHITECTURE.md §3). */
function makeCtx({ m, mv, A, D, P, set, spec, template, pack, realm, layout, texts, cues, posts, props, intents, rng, measure, per, lib }) {
  const by = m.id;
  const fail = (rule, msg) => { throw new CompileError(rule, `${by}: ${msg}`); };
  const ctx = {
    id: by, D, P, A, spec, template, pack, realm, layout, measure, personality: per,
    frame: FRAME,
    styles: { orbit: lib.raw?.format?.layout?.thoughtBubble?.orbit ?? DEFAULT_ORBIT },
    at,
    ref: (r) => resolveRef(r, A),
    fail,
    rng: (name) => rng.get(`${by}/${name}`),
    own: (ch, from, to) => set.own(ch, from, to),
    key: (ch, t, v, o) => { set.key(ch, t, v, o); return ctx; },
    kick: (ch, t, amp, f, z) => { set.push(ch, { t, amp, f, z }); return ctx; },
    hop: (t0, t1, h) => { set.push('body.lift.hops', { t0, t1, h }); return ctx; },
    blink: (t, { close = 0.07, hold = 0.02, open = 0.13 } = {}) => { set.push('face.blink', { t, close, hold, open }); return ctx; },
    ripple: (t, amp) => { set.push('world.ripples', { t, amp }); return ctx; },
    shimmer: (t, amp, decay, freq) => { set.push('body.shimmer.kicks', { t, amp, decay, freq }); return ctx; },
    term: (ch, term) => { set.term(ch, term); return ctx; },
    envelope: (name, expr) => { set.term(`env.${name}`, { type: 'expr', expr }); return ctx; },
    look: (t, xy) => {
      const v = (i) => (typeof xy === 'function' ? (R) => xy(R)[i] : xy[i]);
      set.key('face.lookX', t, v(0));
      set.key('face.lookY', t, v(1));
      return ctx;
    },
    intent: (name, t, { amount = 1, f, z } = {}) => { intents.push({ name, t, amount, f, z, by, rank: m.rank }); return ctx; },
    cue: (t, type, data = {}) => {
      if (!mv.cues || !Object.hasOwn(mv.cues, type)) fail('audio:undeclared-cue', `emits cue '${type}' that it does not declare (move.cues)`);
      if (!Number.isFinite(t)) fail('audio:cue-time', `cue '${type}' at t=${t}`);
      cues.push({ t, type, data, by });
      return ctx;
    },
    post: (topic, value) => { if (!posts.has(topic)) posts.set(topic, []); posts.get(topic).push({ value, by }); return ctx; },
    posts: (topic) => (posts.get(topic) || []).map((p) => p.value),
    text: (item) => { texts.push({ ...item, by }); return ctx; },
    prop(id, def) {
      if (def) {
        if (props.some((p) => p.id === id)) fail('prop:twice', `prop "${id}" already exists`);
        const rec = { id, ...def, provenance: { created: by } };
        props.push(rec);
        return handle(rec);
      }
      const rec = props.find((p) => p.id === id);
      if (!rec) fail('prop:missing', `no prop "${id}" (the metaphor creates it)`);
      return handle(rec);
    },
  };
  function handle(rec) {
    return {
      id: rec.id,
      items: rec.items,
      set(path, value) {
        const parts = path.split('.');
        let o = rec;
        for (const k of parts.slice(0, -1)) { if (!(k in o)) fail('prop:path', `prop ${rec.id}: no field "${path}"`); o = o[k]; }
        o[parts[parts.length - 1]] = value;
        rec.provenance[path] = by;
      },
    };
  }
  return ctx;
}

