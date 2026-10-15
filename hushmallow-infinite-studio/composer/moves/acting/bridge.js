// acting/bridge — inserted by the acting pass between two moves whose junction
// does not satisfy the next move's entry pose (composer/poses.js planBridges,
// judged on the compiled channels). For each such channel it writes the key
// planBridges aimed: eased over the whole gap (zero slope at both ends, so
// the channel stays C1), it lands inside the entry range exactly when the next
// move starts. When no move takes the channel over at the entry and the next
// move's exit pose constrains it, the bridge keeps the channel past the entry
// and releases it with the channel's own spring (see planBridges).
//
// It owns those channels only in windows nobody else owns (the gap, and for a
// release the stretch up to the next owner), so it can never overwrite a move;
// if a move already owns the gap on a channel, the compile fails
// (pose:bridge-conflict) rather than hiding the pop.

export default {
  id: 'acting/bridge',
  kind: 'bridge',
  summary: 'eases mismatching channels into the next pose over the gap between moves',
  cost: {},
  requires: {},
  owns: {},
  params: {},
  cues: {},

  /** b: one planned bridge { after, before, at, until, channels: [{ channel, to, ease, dur, own, release }] }. */
  compile(ctx, A, p, b) {
    for (const m of b.channels) {
      ctx.own(m.channel, m.own[0], m.own[1]);
      ctx.key(m.channel, b.at, m.to, { ease: m.ease, dur: m.dur });
      if (m.release) ctx.key(m.channel, b.until, m.release.v);
    }
  },
};
