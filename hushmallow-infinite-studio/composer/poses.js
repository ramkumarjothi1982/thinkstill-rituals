// Pose contracts: every move declares the pose it expects on entry and the
// pose it leaves on exit, so moves can be recombined without pops.
//
// A pose is a set of channel ranges, e.g. 'asleep' = eyes shut on the painted
// face, smile at rest, body settled. Exit poses list the values a move leaves
// (as ranges too). Two adjacent moves are compatible when every channel the
// next move's entry constrains is inside its range in the previous exit pose.
// When they are not, the composer inserts a bridge (moves/acting/bridge.js):
// a short window that springs each mismatching channel to the entry pose's
// preferred value before the next move starts. If there is no room for a
// bridge, the compile fails: a pop is never silently accepted.

/** Pose table: channel → [min, max, preferred]. Channels are catalogue names. */
export const POSES = Object.freeze({
  // the painted cover face: eyes shut, rest smile, no brows, body settled
  asleep: {
    'face.eyeOpen': [0, 0.02, 0], 'face.closedCurve': [0.95, 1.05, 1], 'face.mouthSmile': [0.9, 1.1, 1],
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

/** A pose by name, or a hard error. */
export function pose(name) {
  if (!Object.hasOwn(POSES, name)) throw new Error(`unknown pose "${name}" (have: ${Object.keys(POSES).join(', ')})`);
  return POSES[name];
}

/**
 * Channels where exit pose `a` does not satisfy entry pose `b`.
 * → [{ channel, have: [min, max], want: [min, max], to: preferred }]
 */
export function mismatches(a, b) {
  const A = typeof a === 'string' ? pose(a) : a, B = typeof b === 'string' ? pose(b) : b;
  const out = [];
  for (const [ch, [lo, hi, pref]] of Object.entries(B)) {
    const have = A[ch];
    // a channel the exit pose leaves unconstrained is assumed to be at the entry's preferred value only if the
    // entry range contains it; otherwise it must be bridged explicitly
    if (!have) continue;
    if (have[0] < lo || have[1] > hi) out.push({ channel: ch, have: [have[0], have[1]], want: [lo, hi], to: pref });
  }
  return out;
}

/** True when exit pose a flows into entry pose b without a bridge. */
export const compatible = (a, b) => mismatches(a, b).length === 0;

/**
 * Plan the bridges of a move sequence: [{ after, before, at, until, channels }]
 * for each adjacent pair whose poses do not match. seq: [{ id, entry, exit,
 * span: [from, to] }] in time order.
 */
export function planBridges(seq, { minGap = 0.25 } = {}) {
  const out = [];
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    if (!a.exit || !b.entry) continue;
    const mm = mismatches(a.exit, b.entry);
    if (!mm.length) continue;
    const from = a.span[1], until = b.span[0];
    if (!(until - from >= minGap)) {
      throw Object.assign(new Error(`pose: ${a.id} exits '${a.exit}' but ${b.id} enters '${b.entry}' (${mm.map((m) => m.channel).join(', ')}) with ${(until - from).toFixed(2)} s between them; a bridge needs ≥ ${minGap} s`), { rule: 'pose:no-room' });
    }
    out.push({ after: a.id, before: b.id, at: from, until, channels: mm });
  }
  return out;
}
