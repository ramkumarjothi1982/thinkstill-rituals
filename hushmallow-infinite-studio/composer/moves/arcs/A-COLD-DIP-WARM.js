// A-COLD-DIP-WARM — the world goes cold and choppy through the escalation,
// stills through the ritual and warms at the release, then eases back into
// the night for the loop (approved v2: night → cold → warm). Keys on three
// world dials; the realm preset maps them onto its palette triple and water.
// The Mallow is relit by the realm's light, never recoloured.

export default {
  id: 'A-COLD-DIP-WARM',
  kind: 'arc',
  library: 'A-COLD-DIP-WARM',
  summary: 'night → cold and choppy → still and warm → night',
  cost: {},
  requires: { caps: ['world.tension', 'world.warmth', 'world.agitation'] },
  span: ['COVER', 'END'],
  owns: { 'world.tension': ['COVER', 'END'], 'world.warmth': ['COVER', 'END'], 'world.agitation': ['COVER', 'END'] },
  params: {},
  cues: {},

  compile(ctx, A) {
    const { at } = ctx;
    const R0 = A.RITUAL0, still = at(A.HOOK_OUT, -0.12);
    const tension = [[A.COVER, 0], [at(A.GAG, 0.05), 0], [at(A.IMPACT, 0.42), 0.2], [still, 0.28], [at(A.L3, -0.2), 1], [at(A.TURN, 0.2), 1], [at(R0, 2.3), 0], [A.END, 0]];
    const warmth = [[A.COVER, 0], [at(R0, 1.85), 0], [at(R0, 4.0), 1], [at(A.SETTLE, 0.1), 1], [at(A.END, -0.05), 0], [A.END, 0]];
    const agitation = [[A.COVER, 0], [at(A.IMPACT, -0.08), 0], [at(A.IMPACT, 0.32), 0.12], [still, 0.08], [at(A.L2, 0.2), 0.32], [A.TURN, 0.62], [at(R0, 1.5), 0.32], [at(R0, 3.2), 0], [A.END, 0]];
    for (const [t, v] of tension) ctx.key('world.tension', t, v);
    for (const [t, v] of warmth) ctx.key('world.warmth', t, v);
    for (const [t, v] of agitation) ctx.key('world.agitation', t, v);
  },
};
