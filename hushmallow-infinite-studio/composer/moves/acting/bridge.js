// acting/bridge — inserted by the acting pass between two moves whose poses
// do not match (composer/poses.js planBridges): in the gap between them it
// springs each mismatching channel to the next move's preferred entry value.
// It owns those channels only inside the gap, so it can never overwrite a
// move; if a move already owns the gap on a channel, the compile fails
// (pose:bridge-conflict) rather than hiding the pop.

export default {
  id: 'acting/bridge',
  kind: 'bridge',
  summary: 'springs mismatching channels from one pose to the next in the gap between moves',
  cost: {},
  requires: {},
  owns: {},
  params: {},
  cues: {},

  /** b: one planned bridge { after, before, at, until, channels: [{ channel, to }] }. */
  compile(ctx, A, p, b) {
    const t = ctx.at(b.at, Math.min(0.05, (b.until - b.at) / 4));
    for (const m of b.channels) {
      ctx.own(m.channel, b.at, b.until);
      ctx.key(m.channel, t, m.to, { f: 3, z: 0.9 });
    }
  },
};
