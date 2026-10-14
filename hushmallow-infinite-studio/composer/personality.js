// Personality pass: how one Mallow performs the moves (PHASE2-PLAN composer
// stage 4).
//
//   - Intents. Moves may write semantic face intents (ctx.intent('surprised', t))
//     instead of raw parameters. They expand into per-Mallow face keys from the
//     pack's own intent map, falling back to the app's expression presets
//     (hushmallow/src/mallows/expressions.js, read-only) through adaptPreset().
//   - Amplitude, tempo and reaction lag, relative to the REFERENCE performer.
//     Noomi is the reference (amp 1, tempo 1, lag 0): every move's numbers are
//     her v2 numbers, so for her this pass is an exact identity, operation by
//     operation (v·1, f·1, d/1, t+0 are exact in IEEE arithmetic), not a skip.
//     Amp scales the body's deformation keys and kicks; tempo scales spring
//     frequencies and eased durations; lag delays the keys moves mark as
//     reactions, never past the 1.0 s impact limit.
//   - Eye gate. Closed-eye Mallows open their eyes only when intensity × opening
//     reaches the pack's gate (the app's own rule, PERSONALITY[id].eyeGate).

import { PRESETS, PERSONALITY } from '../../hushmallow/src/mallows/expressions.js';
import { CompileError, channelInfo } from './channels.js';

/** The reference performer: base numbers of every move are tuned on it. */
export const REFERENCE = Object.freeze({ amp: 1, tempo: 1, reactLag: 0 });

/** The latest a gag's impact may land, after any lag (G-DIR craft rule). */
export const IMPACT_BY = 1.0;

/** A pack's personality, resolved. */
export function personalityOf(pack) {
  const P = pack.personality || {};
  const gate = pack.face?.eyeGate ?? null;
  return {
    amp: P.amp ?? 1, tempo: P.tempo ?? 1, reactLag: P.reactLag ?? 0,
    blinkRate: P.blinkRate ?? null, microNoise: P.microNoise ?? 0, eyeGate: gate,
    /** eyeOpen value to use for an opening of `value` at intensity k: value, or 0 when gated shut. */
    eyesOpen(k, value) {
      if (!gate) return value;
      return k * value >= gate[0] ? value : 0;
    },
  };
}

// --------------------------------------------------- app preset adapter --

const id = (v) => v;
/**
 * App expression parameters → studio face parameters (v2 semantics). The app's
 * rest values differ from the painted v2 rest: its neutral smile is 0.5 where
 * the pack's painted smile is mouthSmile 1, and its blush 1 is the painted
 * cheek where v2's blush is the extra flush on top.
 */
const ADAPT = {
  eyeOpen: id, closedCurve: id, lidTop: id, lidBot: id, lidSlant: id, lookX: id, lookY: id, irisScale: id, eyeScale: id,
  sparkle: (v) => Math.min(1.5, Math.max(0, v - 1)),
  browAlpha: id, browY: id, browTilt: id, browCurve: id, browAsym: id,
  mouthSmile: (v, n) => n.mouthSmile + (v - 0.5), mouthOpen: id, mouthWidth: id, mouthRound: id, mouthWave: id,
  mouthSkew: id, mouthPout: id, tongue: id, mouthTremble: id,
  blush: (v) => Math.max(0, v - 1), cheekPuff: id, tears: id, wet: id, heartEyes: id,
};

/** Face targets of an app expression preset for one Mallow (its app overrides applied). */
export function adaptPreset(name, mallowId, neutral) {
  if (!Object.hasOwn(PRESETS, name)) throw new CompileError('intent:unknown', `no app expression preset "${name}"`);
  const app = { ...PRESETS[name], ...(PERSONALITY[mallowId]?.overrides?.[name] || {}) };
  const out = {};
  for (const [k, v] of Object.entries(app)) if (Object.hasOwn(ADAPT, k)) out[k] = ADAPT[k](v, neutral);
  return out;
}

/** Face targets of an intent for a pack: the pack's own map wins over the app preset. */
export function intentTargets(pack, name) {
  const own = pack.face?.intents?.[name];
  const base = Object.hasOwn(PRESETS, name) ? adaptPreset(name, pack.id, pack.face.neutral) : null;
  if (!own && !base) throw new CompileError('intent:unknown', `intent "${name}" is neither in ${pack.id}'s pack nor an app preset`);
  return { ...(base || {}), ...(own || {}) };
}

// ----------------------------------------------------------------- pass --

/**
 * Apply the personality pass to a ChannelSet in place. intents: [{ name, t,
 * amount, f, z, by, rank }]. → report { intents, keysScaled, kicksScaled, lagged, lag }.
 */
export function applyPersonality(set, pack, { intents = [], impact = null } = {}) {
  const per = personalityOf(pack);
  const report = { intents: 0, keysScaled: 0, kicksScaled: 0, lagged: 0, lag: 0 };

  // 1. intents → face keys, written as the move that asked for them
  for (const it of intents) {
    const targets = intentTargets(pack, it.name);
    const prev = { writer: set.writer, rank: set.rank };
    set.setWriter(it.by, it.rank);
    for (const [param, target] of Object.entries(targets)) {
      const name = `face.${param}`;
      if (!channelInfo(name) || channelInfo(name).type !== 'track') continue;
      const rest = pack.face.neutral[param] ?? 0;
      let v = rest + (target - rest) * it.amount;
      if (param === 'eyeOpen') v = per.eyesOpen(it.amount, v);
      set.key(name, it.t, v, { f: it.f, z: it.z, intent: true });
      report.intents++;
    }
    set.setWriter(prev.writer, prev.rank);
  }

  // 2. amplitude, tempo, lag
  const lag = impact === null ? per.reactLag : Math.max(0, Math.min(per.reactLag, IMPACT_BY - impact));
  report.lag = lag;
  for (const d of set.defs.values()) {
    const ampOk = d.info.perf === 'amp';
    if (d.type === 'track') {
      for (const k of d.keys) {
        if (ampOk) { const v = k.v; k.v = typeof v === 'function' ? (R) => v(R) * per.amp : v * per.amp; report.keysScaled++; }
        k.f = k.f * per.tempo;
        if (k.ease) k.dur = k.dur / per.tempo;
        if (k.react) { k.t = k.t + lag; report.lagged++; }
      }
    } else if (ampOk && d.type === 'impulses') {
      for (const e of d.list) { e.amp = e.amp * per.amp; report.kicksScaled++; }
    } else if (ampOk && d.type === 'hops') {
      for (const e of d.list) { e.h = e.h * per.amp; report.kicksScaled++; }
    }
  }
  return report;
}
