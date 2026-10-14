// Typed channels: the catalogue of everything a move may animate, the
// collectors moves write into, and the evaluators that turn a channel in
// direction.json back into a function of time.
//
// Channel types (direction.json → value at t):
//   track     spring/eased piecewise targets (motion.js Track)        keys [{t, v, f, z, ease?, dur?, by}]
//   spline    monotone cubic through keys (motion.js spline)          keys [{t, v, by}]
//   impulses  sum of damped rings (motion.js Impulses)                list [{t, amp, f, z, by}]
//   hops      ballistic arcs (motion.js Hops)                         list [{t0, t1, h, by}]
//   blinks    asymmetric blinks, merged by max (motion.js Blinks)     list [{t, close, hold, open, by}]
//   shimmer   decaying rim ripple; amp and phase outputs              list [{t, amp, decay, freq, by}]
//   ripples   world water rings                                       list [{t, amp, by}]
//   noise     env(t) · amp · noise1(t · rate, seed)
//   sine      amp · sin(2π t / period | 2π · freq · t) · env(t)
//   envscale  env(t) · amp
//   ramp      t · rate (· env(t))
//   pulse     1 + amp · sin(2π t / period)   (light glow breathing)
//   const     value
//   expr      an envelope expression of t (see compileExpr)
//
// Every formula is written exactly as the approved v2 direction computes it,
// operand order included, so a channel evaluates to the same double v2 did
// (G-STATE at 1e-9 and identical mesh hashes need bit-exact inputs).
//
// Merge rules when several moves write one channel:
//   - track / spline / expr / terms: OWNED. A move declares an ownership window
//     [from, to) per channel; windows on one channel never overlap, and every
//     key a move writes lies inside its own window (a compile error otherwise).
//     Keys are merged and sorted by time before the Track is built: Track.to()
//     captures d = v − last at insertion, so out-of-order keys would be silently
//     wrong (audit R5). Within one move, keys must be written in time order.
//     Duplicate key times are compile errors (spline() divides by zero on them).
//   - impulses / shimmer / ripples: SUM, merged by time (stable).
//   - blinks: MAX, merged by time.
//   - hops: SUM (a body can only hop once at a time; overlapping hops are an error).
//
// There is no roll and no shake channel: those effects cannot be authored.

import { Track, Impulses, Hops, Blinks, spline, noise1, ease, smoothstep, clamp, TAU } from '../engine/motion.js';

/** A composer error with a rule id (G-DIR uses the same ids). */
export class CompileError extends Error {
  constructor(rule, message, extra = {}) {
    super(`${rule}: ${message}`);
    this.rule = rule;
    this.detail = message;
    Object.assign(this, extra);
  }
}

// ------------------------------------------------------------ catalogue --

/** The 22 face parameters v2 drives, in v2's order (faceAt). Always present. */
export const FACE_V2 = Object.freeze([
  'eyeOpen', 'lidTop', 'lidBot', 'blink', 'squint', 'closedCurve', 'eyeStretch', 'eyeScale', 'irisScale',
  'lookX', 'lookY', 'sparkle', 'browAlpha', 'browY', 'browTilt',
  'mouthSmile', 'mouthOpen', 'mouthRound', 'mouthWave', 'mouthWavePhase', 'mouthWidth', 'blush',
]);

/**
 * Face parameter vocabulary (docs/ARCHITECTURE.md §5): the v2 set above plus
 * the canonical additions of the face-style system. Additions are emitted only
 * when a move writes them; the engine's face styles (WP-10+) consume them.
 */
export const FACE_PARAMS = Object.freeze([
  ...FACE_V2,
  'eyeOpenL', 'eyeOpenR', 'lidSlant', 'browAsym', 'browCurve', 'mouthPout', 'mouthTremble', 'mouthSkew',
  'tongue', 'tears', 'wet', 'heartEyes', 'cheekPuff', 'catchX', 'catchY', 'glitch', 'spin', 'spinJitter', 'spiralHue',
]);

/** Body degrees of freedom the soft body consumes (SoftBody.build), in v2's dofAt order. */
export const BODY_DOFS = Object.freeze(['squash', 'inflate', 'lean', 'sway', 'shimmer', 'shimPhase', 'lift']);

/**
 * Channel catalogue. Body channels list the DOF they add into and their
 * position in that DOF's sum (v2's operand order). Face tracks carry the
 * default spring used by keys that give none; their rest value v0 comes from
 * the character pack (face.neutral).
 */
const FACE_SPRING = {
  eyeOpen: [7, 0.5], lidTop: [1.2, 1], lidBot: [1.2, 1], squint: [5, 0.8], closedCurve: [5, 0.9],
  eyeStretch: [2.4, 0.85], eyeScale: [2.4, 0.85], irisScale: [1, 1], lookX: [9, 0.75], lookY: [9, 0.75],
  sparkle: [1, 1], browAlpha: [1.5, 0.9], browY: [1.5, 0.9], mouthSmile: [2, 0.9], mouthOpen: [2, 0.9],
  mouthRound: [2, 0.9], mouthWave: [2, 0.9], mouthWidth: [2, 0.9], blush: [0.8, 1],
};

export const CATALOGUE = Object.freeze({
  'body.squash': { type: 'track', v0: 0, f: 3, z: 0.8, dof: 'squash', order: 0, perf: 'amp' },
  'body.squash.kicks': { type: 'impulses', dof: 'squash', order: 1, perf: 'amp' },
  'body.squash.tremble': { type: 'noise', dof: 'squash', order: 2 },
  'body.inflate': { type: 'track', v0: 0, f: 2.4, z: 0.85, dof: 'inflate', order: 0, perf: 'amp' },
  'body.inflate.breath': { type: 'sine', dof: 'inflate', order: 1 },
  'body.inflate.pant': { type: 'sine', dof: 'inflate', order: 2 },
  'body.lean': { type: 'track', v0: 0, f: 2.2, z: 0.75, dof: 'lean', order: 0, perf: 'amp' },
  'body.sway.kicks': { type: 'impulses', dof: 'sway', order: 0, perf: 'amp' },
  'body.sway.tremble': { type: 'noise', dof: 'sway', order: 1 },
  'body.shimmer.kicks': { type: 'shimmer', dof: 'shimmer+shimPhase', order: 0 },
  'body.shimmer.tremble': { type: 'envscale', dof: 'shimmer', order: 1 },
  'body.shimPhase.tremble': { type: 'ramp', dof: 'shimPhase', order: 1 },
  'body.lift.hops': { type: 'hops', dof: 'lift', order: 0, perf: 'amp' },
  'body.lift': { type: 'track', v0: 0, f: 2.4, z: 0.85, dof: 'lift', order: 1, perf: 'amp' },
  'body.squash.micro': { type: 'noise', dof: 'squash', order: 3 },
  'body.sway.micro': { type: 'noise', dof: 'sway', order: 2 },
  ...Object.fromEntries(Object.entries(FACE_SPRING).map(([p, [f, z]]) => [`face.${p}`, { type: 'track', f, z, face: p }])),
  'face.blink': { type: 'blinks', face: 'blink' },
  'face.browTilt': { type: 'const', face: 'browTilt' },
  'face.mouthWavePhase': { type: 'ramp', face: 'mouthWavePhase' },
  'cam.x': { type: 'const' },
  'cam.y': { type: 'spline' },
  'cam.zoom': { type: 'spline' },
  'cam.follow': { type: 'const' },
  'world.tension': { type: 'spline' },
  'world.warmth': { type: 'spline' },
  'world.agitation': { type: 'spline' },
  'world.ripples': { type: 'ripples' },
  'mallow.glowPulse': { type: 'pulse' },
  'env.breath': { type: 'expr' },
  'env.pant': { type: 'expr' },
  'env.tremble': { type: 'expr' },
  'env.rest': { type: 'expr' },
  'env.micro': { type: 'expr' },
});

/** Prop channels follow a pattern: props.<id>.<field> (splines). */
const PROP_CHANNEL = /^props\.[a-z][\w-]*\.(phase|radius)$/;

/** Catalogue entry of a channel name (prop channels included), or null. */
export function channelInfo(name) {
  if (Object.hasOwn(CATALOGUE, name)) return CATALOGUE[name];
  if (PROP_CHANNEL.test(name)) return { type: 'spline', prop: true };
  return null;
}

const MERGE = { track: 'owned', spline: 'owned', expr: 'owned', noise: 'owned', sine: 'owned', envscale: 'owned', ramp: 'owned', pulse: 'owned', const: 'owned', impulses: 'sum', shimmer: 'sum', ripples: 'sum', hops: 'sum', blinks: 'max' };
export const mergeOf = (type) => MERGE[type];

// ------------------------------------------------------------ envelopes --

/**
 * Compile an envelope expression into a function of t. Grammar:
 *   number | { ss: [a, b] } | { add: [e…] } | { sub: [e, e] } | { mul: [e…] }
 *   | { max: [e…] } | { min: [e…] } | { clamp: [e, lo, hi] }
 * add and mul fold left, exactly like JS evaluates a + b + c.
 */
export function compileExpr(e) {
  if (typeof e === 'number') return () => e;
  if (!e || typeof e !== 'object') throw new CompileError('expr', `bad expression ${JSON.stringify(e)}`);
  const [op, ...rest] = Object.keys(e);
  if (rest.length) throw new CompileError('expr', `expression node has several operators: ${Object.keys(e).join(', ')}`);
  const args = e[op];
  switch (op) {
    case 'ss': {
      const [a, b] = args;
      if (!(b > a)) throw new CompileError('expr', `smoothstep window [${a}, ${b}] is empty`);
      return (t) => smoothstep(a, b, t);
    }
    case 'add': case 'mul': {
      const fs = args.map(compileExpr);
      if (fs.length < 2) throw new CompileError('expr', `${op} needs at least 2 operands`);
      return op === 'add'
        ? (t) => { let v = fs[0](t); for (let i = 1; i < fs.length; i++) v = v + fs[i](t); return v; }
        : (t) => { let v = fs[0](t); for (let i = 1; i < fs.length; i++) v = v * fs[i](t); return v; };
    }
    case 'sub': {
      const [a, b] = args.map(compileExpr);
      return (t) => a(t) - b(t);
    }
    case 'max': case 'min': {
      const fs = args.map(compileExpr);
      const m = op === 'max' ? Math.max : Math.min;
      return (t) => m(...fs.map((f) => f(t)));
    }
    case 'clamp': {
      const [x, lo, hi] = args;
      const f = compileExpr(x);
      return (t) => clamp(f(t), lo, hi);
    }
    default: throw new CompileError('expr', `unknown envelope operator "${op}"`);
  }
}

/** Every smoothstep window of an expression: [[a, b]…] (for validation and plots). */
export function exprWindows(e, out = []) {
  if (!e || typeof e !== 'object') return out;
  const [op] = Object.keys(e);
  if (op === 'ss') out.push(e.ss);
  else if (op === 'clamp') exprWindows(e.clamp[0], out);
  else for (const a of e[op]) exprWindows(a, out);
  return out;
}

// ----------------------------------------------------------- evaluators --

/**
 * A function of t for one channel definition. envs(name) gives a compiled
 * envelope by name (for noise / sine / envscale / ramp terms).
 * Shimmer channels return [amp, phase].
 */
export function evaluator(def, envs) {
  switch (def.type) {
    case 'track': {
      const tr = new Track(def.v0, { f: def.f, z: def.z });
      for (const k of def.keys) {
        tr.to(k.t, k.v, { f: k.f, z: k.z, ease: k.ease ? easeFn(k.ease) : undefined, dur: k.dur });
      }
      return (t) => tr.value(t);
    }
    case 'spline': {
      const keys = def.keys.map((k) => [k.t, k.v]);
      if (keys.length === 0) throw new CompileError('channel', 'spline with no keys');
      return (t) => spline(keys, t);
    }
    case 'impulses': {
      const im = new Impulses();
      for (const k of def.list) im.kick(k.t, k.amp, k.f, k.z);
      return (t) => im.value(t);
    }
    case 'hops': {
      const h = new Hops();
      for (const k of def.list) h.add(k.t0, k.t1, k.h);
      return (t) => h.value(t);
    }
    case 'blinks': {
      const b = new Blinks();
      for (const k of def.list) b.add(k.t, { close: k.close, hold: k.hold, open: k.open });
      return (t) => b.value(t);
    }
    case 'shimmer': {
      const list = def.list.map((k) => [k.t, k.amp, k.decay, k.freq]);
      return (t) => {
        let shim = 0, shimP = 0;
        for (const [t0, a, d, w] of list) if (t > t0) { const k = a * Math.exp(-(t - t0) * d); if (k > shim) { shim = k; shimP = (t - t0) * w; } }
        return [shim, shimP];
      };
    }
    case 'noise': {
      const env = envs(def.env), { amp, rate, seed } = def;
      return (t) => env(t) * amp * noise1(t * rate, seed);
    }
    case 'sine': {
      const env = envs(def.env), amp = def.amp;
      if (def.period !== undefined) { const p = def.period; return (t) => amp * Math.sin(TAU * t / p) * env(t); }
      const fq = def.freq;
      return (t) => amp * Math.sin(TAU * fq * t) * env(t);
    }
    case 'envscale': {
      const env = envs(def.env), amp = def.amp;
      return (t) => env(t) * amp;
    }
    case 'ramp': {
      const rate = def.rate;
      if (def.env === undefined) return (t) => t * rate;
      const env = envs(def.env);
      return (t) => t * rate * env(t);
    }
    case 'pulse': {
      const { amp, period } = def;
      return (t) => 1 + amp * Math.sin(TAU * t / period);
    }
    case 'const': { const v = def.value; return () => v; }
    case 'expr': return compileExpr(def.expr);
    case 'ripples': {
      const list = def.list.map((k) => [k.t, k.amp]);
      return (t) => list;
    }
    default: throw new CompileError('channel', `unknown channel type "${def.type}"`);
  }
}

function easeFn(name) {
  const f = ease[name];
  if (typeof f !== 'function') throw new CompileError('channel', `unknown ease "${name}"`);
  return f;
}

/**
 * Evaluators for every channel of a direction, with envelopes resolved by
 * name ('breath' → channels['env.breath']). → { get(name) → fn, has(name) }
 */
export function channelTable(channels) {
  const fns = new Map();
  const envs = (name) => get(`env.${name}`);
  function get(name) {
    if (!fns.has(name)) {
      const def = channels[name];
      if (!def) throw new CompileError('channel', `channel "${name}" is not in the direction`);
      fns.set(name, evaluator(def, envs));
    }
    return fns.get(name);
  }
  return { get, has: (name) => Object.hasOwn(channels, name) };
}

// ----------------------------------------------------------- collectors --

const EPS = 1e-12;

/**
 * Collects what moves write, enforcing ownership and ordering, and builds the
 * channels of direction.json. Writers are move ids; the composer sets the
 * current writer (and its slot rank) before each move compiles.
 */
export class ChannelSet {
  constructor({ D, P = 0, neutral = {} } = {}) {
    this.D = D;
    this.P = P;
    this.neutral = neutral;            // face rest values (pack face.neutral)
    this.defs = new Map();             // name → { type, info, keys|list|term, windows: [{by, from, to}] }
    this.writer = null;
    this.rank = 0;
  }

  /**
   * Times keys may carry: [−P, D]. The runtime evaluates composition time
   * [−P, D − P) (composer/circular.js); keys up to D still shape what comes
   * before D − P (a spline's closing key at END), and keys in [−P, 0) are the
   * beats that play across frame 0 when the seam is moved (P > 0).
   */
  get domain() { return [-this.P, this.D]; }

  setWriter(id, rank) { this.writer = id; this.rank = rank; }

  def(name) {
    if (!this.defs.has(name)) {
      const info = channelInfo(name);
      if (!info) throw new CompileError('channel:unknown', `"${name}" is not in the channel catalogue (composer/channels.js)`);
      this.defs.set(name, { name, type: info.type, info, keys: [], list: [], term: null, windows: [], lastBy: new Map() });
    }
    return this.defs.get(name);
  }

  /** Declare that the current writer owns channel `name` on [from, to) (to === D is inclusive). */
  own(name, from, to) {
    const d = this.def(name);
    if (mergeOf(d.type) !== 'owned') throw new CompileError('channel:ownership', `"${name}" is a ${d.type} channel (merged by ${mergeOf(d.type)}); it has no owner`);
    if (!(to > from)) throw new CompileError('channel:ownership', `${this.writer}: empty window [${from}, ${to}) on ${name}`);
    for (const w of d.windows) {
      if (w.by === this.writer) {
        if (from < w.to && w.from < to) throw new CompileError('channel:ownership', `${this.writer} declares overlapping windows of its own on ${name}`);
        continue;
      }
      if (from < w.to - EPS && w.from < to - EPS) {
        throw new CompileError('channel:ownership', `${this.writer} window [${from}, ${to}) on ${name} overlaps ${w.by}'s [${w.from}, ${w.to})`, { channel: name, a: w.by, b: this.writer });
      }
    }
    d.windows.push({ by: this.writer, from, to });
    return this;
  }

  /** The window of the current writer containing t on channel d, or throw. */
  checkOwned(d, t) {
    const mine = d.windows.filter((w) => w.by === this.writer);
    if (!mine.length) throw new CompileError('channel:ownership', `${this.writer} writes ${d.name} without owning it (declare owns['${d.name}'])`, { channel: d.name });
    const inside = mine.some((w) => t >= w.from - EPS && (t < w.to - EPS || (w.to >= this.D - EPS && t <= w.to + EPS)));
    if (!inside) throw new CompileError('channel:ownership', `${this.writer} writes ${d.name} at t=${t}, outside its window(s) ${mine.map((w) => `[${w.from}, ${w.to})`).join(' ')}`, { channel: d.name });
  }

  checkTime(name, t) {
    if (!Number.isFinite(t)) throw new CompileError('channel:time', `${this.writer}: non-finite time ${t} on ${name}`);
    const [a, b] = this.domain;
    if (t < a - EPS || t > b + EPS) throw new CompileError('channel:time', `${this.writer}: t=${t} on ${name} is outside [${a}, ${b}] (−P … D)`);
  }

  checkOrder(d, t, stream = this.writer) {
    const last = d.lastBy.get(stream);
    if (last !== undefined && t < last) throw new CompileError('channel:unsorted', `${this.writer} writes ${d.name} at t=${t} after a key at t=${last}: keys must be written in time order (R5)`, { channel: d.name });
    d.lastBy.set(stream, t);
  }

  /**
   * A track key. opts: { f, z, ease, dur, react, intent }; defaults are the
   * channel's spring. Keys expanded from intents (personality pass) are an
   * ordered stream of their own.
   */
  key(name, t, v, opts = {}) {
    const d = this.def(name);
    if (d.type !== 'track' && d.type !== 'spline') throw new CompileError('channel:type', `${name} is a ${d.type} channel, not a track or spline`);
    this.checkTime(name, t);
    this.checkOwned(d, t);
    this.checkOrder(d, t, opts.intent ? `${this.writer}#intent` : this.writer);
    if (typeof v !== 'function' && !Number.isFinite(v)) throw new CompileError('channel:value', `${this.writer}: non-finite value ${v} on ${name} at t=${t}`);
    const k = { t, v, by: this.writer, rank: this.rank, seq: d.keys.length };
    if (d.type === 'track') {
      if (opts.ease) { k.ease = opts.ease; k.dur = opts.dur; if (!(opts.dur > 0)) throw new CompileError('channel:value', `${name}: eased key at t=${t} needs dur > 0`); }
      k.f = opts.f ?? d.info.f;
      k.z = opts.z ?? d.info.z;
      if (opts.react) k.react = true;
    } else if (opts.f !== undefined || opts.ease) throw new CompileError('channel:type', `${name} is a spline: keys take no spring or ease`);
    d.keys.push(k);
    return this;
  }

  /** Merged list entries (impulses, shimmer, ripples, hops, blinks). */
  push(name, entry) {
    const d = this.def(name);
    const m = mergeOf(d.type);
    if (m === 'owned') throw new CompileError('channel:type', `${name} is an owned ${d.type} channel; use key()/term()`);
    const t = entry.t ?? entry.t0;
    this.checkTime(name, t);
    for (const [k, v] of Object.entries(entry)) if (typeof v === 'number' && !Number.isFinite(v)) throw new CompileError('channel:value', `${this.writer}: non-finite ${k} on ${name}`);
    d.list.push({ ...entry, by: this.writer, rank: this.rank, seq: d.list.length });
    return this;
  }

  /** A single-writer term (noise, sine, envscale, ramp, pulse, const, expr). */
  term(name, term) {
    const d = this.def(name);
    if (!['noise', 'sine', 'envscale', 'ramp', 'pulse', 'const', 'expr'].includes(d.type)) throw new CompileError('channel:type', `${name} is a ${d.type} channel, not a term`);
    if (d.term) throw new CompileError('channel:ownership', `${name} is already written by ${d.term.by}; ${this.writer} cannot write it too`, { channel: name });
    d.term = { ...term, by: this.writer };
    return this;
  }

  has(name) { return this.defs.has(name) && (this.defs.get(name).keys.length || this.defs.get(name).list.length || this.defs.get(name).term); }

  /**
   * Resolve deferred values (functions of a resolver) in keys, list entries and
   * terms. Called once, after every move has run.
   */
  resolve(R) {
    const val = (v) => (typeof v === 'function' ? v(R) : v);
    for (const d of this.defs.values()) {
      for (const k of d.keys) { k.v = val(k.v); if (!Number.isFinite(k.v)) throw new CompileError('channel:value', `${k.by}: deferred value on ${d.name} at t=${k.t} resolved to ${k.v}`); }
      for (const e of d.list) for (const f of Object.keys(e)) e[f] = val(e[f]);
      if (d.term) { for (const f of Object.keys(d.term)) d.term[f] = val(d.term[f]); }
    }
  }

  /**
   * Build the channels of direction.json: keys sorted by time (stable on slot
   * rank and write order), duplicates refused, every value explicit.
   */
  build() {
    const out = {};
    const names = [...this.defs.keys()].sort();
    for (const name of names) {
      const d = this.defs.get(name);
      const order = (a, b) => (a.t ?? a.t0) - (b.t ?? b.t0) || a.rank - b.rank || a.seq - b.seq;
      switch (d.type) {
        case 'track': case 'spline': {
          const keys = [...d.keys].sort(order);
          for (let i = 1; i < keys.length; i++) {
            if (keys[i].t === keys[i - 1].t) {
              throw new CompileError(d.type === 'spline' ? 'channel:duplicate-spline-time' : 'channel:duplicate-key-time',
                `${name}: ${keys[i - 1].by} and ${keys[i].by} both key t=${keys[i].t}`, { channel: name });
            }
          }
          const def = { type: d.type };
          if (d.type === 'track') {
            def.v0 = d.info.face ? this.faceRest(d.info.face) : d.info.v0;
            def.f = d.info.f; def.z = d.info.z;
            def.keys = keys.map((k) => strip({ t: k.t, v: k.v, f: k.f, z: k.z, ease: k.ease, dur: k.dur, by: k.by }));
          } else {
            if (!keys.length) throw new CompileError('channel', `${name}: spline with no keys`);
            def.keys = keys.map((k) => ({ t: k.t, v: k.v, by: k.by }));
          }
          def.windows = d.windows.map((w) => ({ ...w }));
          out[name] = def;
          break;
        }
        case 'impulses': out[name] = { type: d.type, list: [...d.list].sort(order).map(({ t, amp, f, z, by }) => ({ t, amp, f, z, by })) }; break;
        case 'shimmer': out[name] = { type: d.type, list: [...d.list].sort(order).map(({ t, amp, decay, freq, by }) => ({ t, amp, decay, freq, by })) }; break;
        case 'ripples': out[name] = { type: d.type, list: [...d.list].sort(order).map(({ t, amp, by }) => ({ t, amp, by })) }; break;
        case 'blinks': out[name] = { type: d.type, list: [...d.list].sort(order).map(({ t, close, hold, open, by }) => ({ t, close, hold, open, by })) }; break;
        case 'hops': {
          const list = [...d.list].sort(order);
          for (let i = 1; i < list.length; i++) if (list[i].t0 < list[i - 1].t1) throw new CompileError('channel:overlap', `${name}: hops of ${list[i - 1].by} and ${list[i].by} overlap`);
          out[name] = { type: d.type, list: list.map(({ t0, t1, h, by }) => ({ t0, t1, h, by })) };
          break;
        }
        default: {
          if (!d.term) continue;
          out[name] = { type: d.type, ...d.term };
        }
      }
    }
    return out;
  }

  faceRest(param) {
    const v = this.neutral[param];
    if (!Number.isFinite(v)) throw new CompileError('pack:neutral', `the character pack gives no neutral value for face.${param}`);
    return v;
  }
}

function strip(o) {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
}

/**
 * Structural checks of built channels (direction.json): sorted keys, no
 * duplicate spline times, windows disjoint, keys inside their writer's window.
 * → list of { rule, message }. Used by G-DIR and by the runtime on load.
 */
export function checkChannels(channels, D) {
  const errs = [];
  for (const [name, def] of Object.entries(channels)) {
    if (!channelInfo(name)) errs.push({ rule: 'channel:unknown', message: `${name} is not in the catalogue` });
    if (def.type === 'track' || def.type === 'spline') {
      for (let i = 1; i < def.keys.length; i++) {
        const a = def.keys[i - 1].t, b = def.keys[i].t;
        if (b < a) errs.push({ rule: 'channel:unsorted', message: `${name}: key ${i} at t=${b} comes after t=${a}` });
        else if (b === a) errs.push({ rule: def.type === 'spline' ? 'channel:duplicate-spline-time' : 'channel:duplicate-key-time', message: `${name}: two keys at t=${a}` });
      }
      const ws = def.windows || [];
      for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
        if (ws[i].by !== ws[j].by && ws[i].from < ws[j].to - EPS && ws[j].from < ws[i].to - EPS) errs.push({ rule: 'channel:ownership', message: `${name}: windows of ${ws[i].by} and ${ws[j].by} overlap` });
      }
      for (const k of def.keys) {
        const mine = ws.filter((w) => w.by === k.by);
        if (ws.length && !mine.some((w) => k.t >= w.from - EPS && (k.t < w.to - EPS || (w.to >= D - EPS && k.t <= w.to + EPS)))) {
          errs.push({ rule: 'channel:ownership', message: `${name}: ${k.by}'s key at t=${k.t} is outside its window` });
        }
        if (!Number.isFinite(k.t) || !Number.isFinite(k.v)) errs.push({ rule: 'channel:value', message: `${name}: non-finite key ${JSON.stringify(k)}` });
      }
    }
  }
  return errs;
}
