// acting/idle-breath — the sleeping breath of the cover (approved v2): a slow
// swell with a whole number of breaths per loop (LP-BASE), and the inner glow
// breathing with it. The breath stops when a gag wakes the Mallow and comes
// back where later moves say so (posts 'breath.wake' and 'breath.resume').
//
// The breath envelope is built in one place, here, from those posts; the
// score reads the same envelope (composer/acting.js breathEnvelope) instead of
// keeping its own copy (audit R11: v2's score had dropped a term).

export default {
  id: 'acting/idle-breath',
  kind: 'cover-idle',
  summary: 'sleeping breath with whole cycles per loop; glow breathes with it',
  cost: {},
  requires: { caps: ['body.inflate'] },
  owns: {},
  params: {
    amp: { def: 0.03, range: [0.02, 0.04], doc: 'inflate depth of the sleeping breath' },
    glow: { def: 0.25, range: [0, 0.3], doc: 'relative glow pulse with the breath' },
  },
  cues: {},

  compile(ctx, A, p) {
    const period = A.breathPeriod;
    const cycles = ctx.D / period;
    if (Math.abs(cycles - Math.round(cycles)) > 1e-9) ctx.fail('loop:breath-period', `breath period ${period} s gives ${cycles} cycles per ${ctx.D} s loop; it must be whole`);
    ctx.term('body.inflate.breath', { type: 'sine', amp: p.amp, period, env: 'breath' });
    ctx.term('mallow.glowPulse', { type: 'pulse', amp: p.glow, period });
    ctx.envelope('breath', (R) => {
      const wake = R.posts('breath.wake'), resume = R.posts('breath.resume');
      if (wake.length > 1) throw new Error(`${wake.length} moves wake the sleeping breath; one may`);
      const on = resume.map((r) => (r.amp === 1 ? { ss: [r.from, r.to] } : { mul: [r.amp, { ss: [r.from, r.to] }] }));
      if (!wake.length) return 1;
      const asleep = { sub: [1, { ss: wake[0] }] };
      return on.length ? { add: [asleep, on.length === 1 ? on[0] : { max: on }] } : asleep;
    });
  },
};
