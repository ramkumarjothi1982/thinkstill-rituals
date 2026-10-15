// Pose contracts: every move declares the pose it expects on entry and the
// pose it leaves on exit, so moves can be recombined without pops.
//
// A pose is a set of channel ranges, e.g. 'asleep' = eyes shut on the painted
// face, smile at rest, body settled. The ranges are contracts on COMPILED
// values (FU-4): a move's entry pose must hold at the start of its span and
// its exit pose at the end, judged on the value of each named channel in the
// built direction. G-DIR checks both for every span move (rules pose:entry and
// pose:exit), so a declared pose can never claim what the channels do not do.
//
// Junctions are judged on compiled values too. When the composer plans the
// bridges it hands planBridges() the channels as built so far; a junction then
// needs a bridge exactly when some channel the next move's entry pose declares
// is out of its range at the entry time, whether or not the previous exit pose
// mentions that channel. The bridge (moves/acting/bridge.js) eases each such
// channel over the gap so it LANDS inside the entry range at the entry time
// (planned here, written there), and hands the channel on afterwards (below).
// If there is no room for a bridge, or the previous move's spring is still too
// far from rest for any bridge to land in range, the compile fails: a pop is
// never silently accepted.
//
// Without compiled channels (mismatches(a, b) on two pose names) only the
// declarations are compared, and a channel the exit pose leaves unconstrained
// counts as a mismatch: an unknown value is never assumed to be in range.

import { channelTable, channelInfo, CompileError } from './channels.js';

/** Numeric slack of every range test: springs settle asymptotically (v2's body.lift reads −4.1e-9 at rest). */
export const POSE_TOL = 1e-6;

/** The ease a bridge lands with: zero slope at both ends, so the channel stays C1 through the gap. */
export const BRIDGE_EASE = 'inOutSine';

/**
 * Pose table: channel → [min, max, preferred]. Channels are catalogue track
 * names, the channels a bridge can key. A pose describes the channel's own
 * value (the track), not the transient layers summed on top of it (kicks,
 * hops, noise), which have their own G-DIR rules.
 */
export const POSES = Object.freeze({
  // the painted cover face: eyes shut, rest smile, no brows, body settled. "Shut" is eyeOpen ≤ 0.05, the
  // level G-DIR's eye gate already calls the painted closed eyes (v2 reads 0.026 at CARD_OUT, under the
  // painting's return; the 0.02 WP-03 declared was never met by the approved film)
  asleep: {
    'face.eyeOpen': [0, 0.05, 0], 'face.closedCurve': [0.95, 1.05, 1], 'face.mouthSmile': [0.9, 1.1, 1],
    'face.browAlpha': [0, 0.05, 0], 'face.mouthOpen': [0, 0.05, 0], 'body.squash': [-0.02, 0.02, 0], 'body.lift': [0, 1, 0],
  },
  // eyes snapped open, body still ringing from an impact
  startled: { 'face.eyeOpen': [0.8, 1.6, 1.1], 'face.mouthSmile': [-1, 0.5, 0] },
  // awake and watchful (the escalation can start)
  alert: { 'face.eyeOpen': [0.8, 1.3, 1], 'face.browAlpha': [0, 1, 0.3] },
  // mid-escalation, thoughts on screen, tense
  spiralling: { 'face.eyeOpen': [0.6, 1.3, 1], 'face.browAlpha': [0.3, 1, 0.78] },
  // the stop beat: squeezed shut, holding
  squeezed: { 'face.eyeOpen': [0, 0.1, 0], 'face.squint': [0.5, 1, 1] },
  // after the ritual: eyes shut, soft smile, warm
  calm: { 'face.eyeOpen': [0, 0.1, 0], 'face.mouthSmile': [0.2, 1.1, 0.85], 'face.squint': [0, 0.1, 0] },
  // eyes open softly at the resolution
  content: { 'face.eyeOpen': [0.8, 1.2, 1], 'face.mouthSmile': [0.8, 1.1, 0.95] },
});

/** A pose by name (or a pose object, returned as is), or a hard error. */
export function pose(name) {
  if (name && typeof name === 'object') return name;
  if (!Object.hasOwn(POSES, name)) throw new Error(`unknown pose "${name}" (have: ${Object.keys(POSES).join(', ')})`);
  return POSES[name];
}

/** v inside [lo, hi], with the numeric slack. */
export const inRange = (v, [lo, hi], tol = POSE_TOL) => Number.isFinite(v) && v >= lo - tol && v <= hi + tol;

/**
 * Channels of entry pose b that the junction from exit pose a does not satisfy.
 *
 *   value  (channel) → the compiled value at the entry time. Given, every channel
 *          b declares is judged by that value alone (the declared exit is a
 *          contract G-DIR checks separately, not evidence).
 *   absent the declarations only: a's range must lie inside b's, and a channel a
 *          leaves unconstrained is a mismatch.
 *
 * → [{ channel, have: [min, max] | null, value: number | null, want: [min, max], to: preferred }]
 */
export function mismatches(a, b, { value = null, tol = POSE_TOL } = {}) {
  const A = pose(a), B = pose(b);
  const out = [];
  for (const [ch, [lo, hi, pref]] of Object.entries(B)) {
    const have = A[ch] ? [A[ch][0], A[ch][1]] : null;
    if (value) {
      const v = value(ch);
      if (!inRange(v, [lo, hi], tol)) out.push({ channel: ch, have, value: v, want: [lo, hi], to: pref });
    } else if (!have || have[0] < lo || have[1] > hi) {
      out.push({ channel: ch, have, value: null, want: [lo, hi], to: pref });
    }
  }
  return out;
}

/** True when exit pose a flows into entry pose b without a bridge (declarations only). */
export const compatible = (a, b) => mismatches(a, b).length === 0;

/**
 * Plan the bridges of a move sequence.
 *
 *   seq      [{ id, entry, exit, span: [from, to] }] in time order (span moves only)
 *   channels the direction's channels as built so far (ChannelSet.build()); given,
 *            junctions are judged and bridges aimed on compiled values (the
 *            composer always passes them). Bridges planned earlier in the
 *            sequence are simulated, so a later junction sees their effect.
 *   end      the last time a window may reach (the composer passes D); without
 *            it a bridge never owns past the entry, so it holds instead of releasing.
 *
 * → [{ after, before, at, until, channels: [{ channel, have, value, want, pref,
 *      to, ease, dur, landing, own: [from, to], release: { v } | null }] }]
 *
 * For each channel the bridge keys `to` at `at`, eased (BRIDGE_EASE) over the
 * whole gap, so it lands at `landing` (inside the entry range) exactly at
 * `until`. `to` is the preferred entry value corrected for the residual of the
 * previous move's still-settling spring and clamped to the entry range: the
 * channel then rests inside the range after the entry too. After the entry the
 * channel is handed on:
 *   - a move owns it from the entry on: nothing more, that move's keys take over;
 *   - nobody does, and holding `to` would break the next move's exit pose: the
 *     bridge keeps ownership up to the next window and releases the channel at
 *     `until` (the channel's own spring) toward the value the previous move left,
 *     or the exit pose's preferred value when that one is outside the exit range;
 *   - otherwise the channel holds at `to`.
 */
export function planBridges(seq, { minGap = 0.25, channels = null, end = null, tol = POSE_TOL } = {}) {
  const out = [];
  const work = channels ? { ...channels } : null;
  let table = work ? channelTable(work) : null;
  const valueAt = (ch, t) => {
    if (work[ch]) return table.get(ch)(t);
    return channelInfo(ch)?.v0 ?? 0;                                         // never written: the track's rest value
  };
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    if (!a.exit || !b.entry) continue;
    const from = a.span[1], until = b.span[0];
    const mm = mismatches(a.exit, b.entry, work ? { value: (ch) => valueAt(ch, until), tol } : { tol });
    if (!mm.length) continue;
    const list = mm.map((m) => `${m.channel}${m.value === null ? '' : ` ${m.value.toFixed(3)}`} ∉ [${m.want.join(', ')}]`).join(', ');
    if (!(until - from >= minGap)) {
      throw new CompileError('pose:no-room', `${a.id} exits '${typeof a.exit === 'string' ? a.exit : 'pose'}' but ${b.id} enters '${typeof b.entry === 'string' ? b.entry : 'pose'}' (${list}) with ${(until - from).toFixed(2)} s between them; a bridge needs ≥ ${minGap} s`);
    }
    const dur = until - from;
    const exitPose = b.exit ? pose(b.exit) : {};
    const bridged = mm.map((m) => {
      if (!work) return { ...m, pref: m.to, ease: BRIDGE_EASE, dur, landing: m.to, own: [from, until], release: null };
      const def = work[m.channel];
      if (def && def.type !== 'track') throw new CompileError('pose:channel', `pose channel ${m.channel} is a ${def.type} channel; a bridge can only key tracks`);
      const keys = def?.keys || [];
      let last = def ? def.v0 : (channelInfo(m.channel)?.v0 ?? 0);
      for (const k of keys) if (k.t < from) last = k.v;
      const residual = last - m.value;                                       // what the previous springs still owe at the entry
      const to = Math.min(m.want[1], Math.max(m.want[0], m.to + residual));
      const landing = to - residual;
      if (!inRange(landing, m.want, tol)) {
        throw new CompileError('pose:bridge-short', `${a.id} → ${b.id}: ${m.channel} is still ${Math.abs(residual).toFixed(3)} from where ${a.id} sends it at ${until}; no bridge in ${dur.toFixed(2)} s lands it in [${m.want.join(', ')}]`);
      }
      // hand-on after the entry
      const windows = def?.windows || [];
      const ownedAtEntry = windows.some((w) => w.from <= until + 1e-12 && until < w.to - 1e-12);
      let release = null, ownTo = until;
      if (!ownedAtEntry && exitPose[m.channel] && !inRange(to, exitPose[m.channel], tol)) {
        const [elo, ehi, epref] = exitPose[m.channel];
        const next = windows.filter((w) => w.from >= until).map((w) => w.from);
        const upTo = next.length ? Math.min(...next) : end ?? until;
        if (upTo > until) { release = { v: inRange(last, [elo, ehi], tol) ? last : epref }; ownTo = upTo; }
      }
      return { ...m, pref: m.to, to, ease: BRIDGE_EASE, dur, landing, own: [from, ownTo], release };
    });
    out.push({ after: a.id, before: b.id, at: from, until, channels: bridged });
    if (work) {
      // simulate the bridge's keys so later junctions see them
      for (const m of bridged) {
        const prev = work[m.channel] || { type: 'track', v0: channelInfo(m.channel)?.v0 ?? 0, f: channelInfo(m.channel)?.f, z: channelInfo(m.channel)?.z, keys: [], windows: [] };
        const add = [{ t: from, v: m.to, f: prev.f, z: prev.z, ease: m.ease, dur: m.dur, by: 'acting/bridge' }];
        if (m.release) add.push({ t: until, v: m.release.v, f: prev.f, z: prev.z, by: 'acting/bridge' });
        work[m.channel] = { ...prev, keys: [...prev.keys, ...add].sort((x, y) => x.t - y.t), windows: [...(prev.windows || []), { by: 'acting/bridge', from: m.own[0], to: m.own[1] }] };
      }
      table = channelTable(work);
    }
  }
  return out;
}
