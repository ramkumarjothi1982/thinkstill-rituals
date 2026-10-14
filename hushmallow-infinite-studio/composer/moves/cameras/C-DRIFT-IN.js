// C-DRIFT-IN — locked framing with a slow push-in across the escalation and
// an ease back through the ritual (approved v2). One continuous shot: no
// cuts, no roll, no shake (there is no channel for either). A soft vertical
// follow of the body's lift keeps hops in frame.

export default {
  id: 'C-DRIFT-IN',
  kind: 'camera',
  library: 'C-DRIFT-IN',
  summary: 'push in 1.00 → 1.075 across the escalation, ease back through the ritual',
  cost: {},
  requires: {},
  span: ['COVER', 'END'],
  owns: { 'cam.y': ['COVER', 'END'], 'cam.zoom': ['COVER', 'END'] },
  params: {
    push: { def: 1.075, range: [1.04, 1.08], doc: 'zoom at the turn' },
    follow: { def: 0.2, range: [0, 0.25], doc: 'vertical follow of the body lift' },
  },
  cues: {},

  compile(ctx, A, p) {
    const { at } = ctx;
    const R0 = A.RITUAL0, still = at(A.HOOK_OUT, -0.12);                   // 2.6 s: the hook has gone
    ctx.term('cam.x', { type: 'const', value: ctx.frame.width / 2 });
    ctx.term('cam.follow', { type: 'const', value: p.follow });
    for (const [t, v] of [[A.COVER, 960], [still, 960], [A.L3, 936], [A.TURN, 926], [at(R0, 1.5), 932], [at(A.OPEN, -0.1), 960], [A.END, 960]]) ctx.key('cam.y', t, v);
    for (const [t, v] of [[A.COVER, 1], [still, 1], [A.L3, 1.045], [A.TURN, p.push], [at(R0, 0.8), 1.07], [at(R0, 1.8), 1.055], [at(A.OPEN, 0.1), 1], [A.END, 1]]) ctx.key('cam.zoom', t, v);
  },
};
