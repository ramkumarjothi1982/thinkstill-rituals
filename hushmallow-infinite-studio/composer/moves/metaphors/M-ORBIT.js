// M-ORBIT — "thoughts in orbit" (approved v2): three glass thoughts rise from
// behind the head at L1, L2, L3 and circle faster and faster; the eyes chase
// them, the body cringes at the first, leans into each, trembles as the
// spiral builds; brows worry, the mouth wobbles. The prop's exit (the
// dissolve) belongs to the ritual that releases it.

import { clamp } from '../../../engine/motion.js';
import { TEXT_STYLES, layoutBubble } from '../../layout.js';
import { zone, cuePan } from '../lib.js';

const ESCALATION = ['body.squash', 'body.lean', 'face.eyeOpen', 'face.squint', 'face.irisScale', 'face.lookX', 'face.lookY',
  'face.browAlpha', 'face.browY', 'face.mouthSmile', 'face.mouthOpen', 'face.mouthWave', 'face.blush'];

export default {
  id: 'M-ORBIT',
  kind: 'metaphor',
  library: 'M-ORBIT',
  summary: 'three glass thoughts orbit faster and faster; the eyes chase them',
  cost: { subframes: 'high', faceRedraws: 'med', props: { glass: 3 } },
  requires: { caps: ['props.glass', 'face.lookX'], lines: [3, 3] },
  span: ['L1', 'TURN-0.05'],
  entry: 'alert',
  exit: 'spiralling',
  owns: {
    ...zone(ESCALATION, 'L1', 'TURN-0.05'),
    'props.thoughts.phase': ['COVER', 'END'],
    'props.thoughts.radius': ['COVER', 'RITUAL0'],
  },
  params: {
    slots: { def: [Math.PI, 0.08, -Math.PI / 2], doc: 'orbit angle of each thought (rad)' },
    turns: { def: 3.18, range: [2.6, 3.4], doc: 'orbit phase reached when the spiral coasts out (rad)' },
  },
  cues: { thought: { recipe: 'v2/thought' }, wince: { recipe: 'v2/wince' }, spin_up: { recipe: 'v2/spin_up' } },

  compile(ctx, A, p) {
    const { at } = ctx;
    const L = [A.L1, A.L2, A.L3];
    const lines = ctx.spec.copy.lines;
    if (lines.length !== 3) ctx.fail('move:lines', `M-ORBIT orbits exactly 3 thoughts, the spec has ${lines.length}`);
    const cringe = A.L1 + 0.42, recover = A.L1 + 0.9;

    // the prop: glass thoughts on an ellipse above the head
    const orbit = ctx.styles.orbit;                                         // story-library format.layout.thoughtBubble.orbit
    ctx.prop('thoughts', {
      controller: 'orbit',
      params: {
        ellipse: { cx: orbit.cx, cy: orbit.cy, rx: orbit.rx, ry: orbit.ry, lift: 150 },
        origin: ctx.pack.placement.thoughtOrigin,
        arrive: { f: 1.6, z: 0.62 }, depthStart: -0.9,
        spin: [A.PEAK0, at(A.PEAK0, 1.2), A.TURN, at(A.TURN, 0.8)],
        wobble: { amp: 0.09, f: 2.8, z: 0.28 }, spinWobble: { amp: 0.035, freq: 17, step: 2 },
        grow: { from: 0.12, f: 2.3, z: 0.48 }, depthScale: [0.9, 0.1], swell: { amount: 0.12, dur: 0.55 },
        fadeIn: 0.16, fadeOut: [0.06, 0.52], depthAlpha: [0.84, 0.16], crowd: { alpha: 1, from: A.END, to: A.END + 1 },
        glowUp: [-0.05, 0.2, 0.18, 0.5], textOut: [-0.08, 0.2], stress: 0.7, afterDissolve: 0.6,
      },
      items: lines.map((text, i) => {
        const box = layoutBubble(text, ctx.measure);
        return { slot: p.slots[i], born: L[i], dissolve: A.END + 10, text, lines: box.lines, tex: `b${i}`, layout: { w: box.w, hw: box.hw, hh: box.hh } };
      }),
      channels: { phase: 'props.thoughts.phase', radius: 'props.thoughts.radius' },
      style: {
        glass: { tint: [[0.92, 0.91, 1.0], [0.86, 0.88, 0.98]], edge: [0.9, 0.92, 1.0], radiusMax: 64, minAlpha: 0.004 },
        text: { ...TEXT_STYLES.bubble },
      },
      motes: null,
      audio: true,
    });
    // orbit phase: still until the first thought, accelerating through the escalation, coasting after the turn
    for (const [t, v] of [[A.COVER, 0], [A.L1, 0], [at(A.PEAK0, -0.1), 0.26], [at(A.PEAK0, 0.6), 0.8], [A.TURN, 2.15],
      [at(A.TURN, 0.5), 2.7], [at(A.TURN, 1.9), 3.05], [at(A.TURN, 2.8), p.turns], [A.END, p.turns]]) ctx.key('props.thoughts.phase', t, v);
    ctx.key('props.thoughts.radius', A.COVER, 1);

    // the eyes find each thought as it arrives; the body leans toward it
    const lookAt = (i, t) => (R) => R.lookAt('thoughts', i, t);
    ctx.key('body.squash', cringe, 0.05, { f: 5, z: 0.7 });                 // cringe at the first thought
    ctx.key('body.squash', recover, 0, { f: 2.2, z: 0.8 });
    L.forEach((tb, i) => ctx.key('body.lean', tb + 0.1, (R) => clamp(R.lookAt('thoughts', i, tb + 0.25)[0] * 0.045, -0.04, 0.04)));
    ctx.key('body.lean', A.PEAK0, 0);
    ctx.key('face.eyeOpen', cringe, 0.12, { f: 7, z: 0.8 });
    ctx.key('face.eyeOpen', recover, 1.04, { f: 2.6, z: 0.7 });
    ctx.key('face.squint', cringe, 0.7, { f: 7 });
    ctx.key('face.squint', recover, 0, { f: 3 });
    ctx.key('face.irisScale', A.L1, 0.82);
    for (const [i, tb] of L.entries()) ctx.look(tb + 0.1, lookAt(i, tb + 0.25));
    ctx.look(A.L3 + 0.42, [0.1, 0.6]);                                      // …why did I do that: a guilty look down
    // the spiral: the eyes chase the thoughts
    for (const [dt, i] of [[0.02, 0], [0.38, 1], [0.7, 2], [0.95, 0], [1.16, 1], [1.32, 2]]) {
      const t = at(A.PEAK0, dt);
      ctx.look(t, lookAt(i, t));
    }
    for (const t of [at(A.L2, 0.62), at(A.L3, 0.45), at(A.PEAK0, 0.52), at(A.PEAK0, 1.0)]) ctx.blink(t);
    ctx.key('face.browAlpha', at(A.L1, 0.1), 0.78, { f: 1.6 });
    ctx.key('face.browY', at(A.PEAK0, 0.2), 0.6);
    ctx.key('face.mouthSmile', cringe, -0.75, { f: 6 });
    ctx.key('face.mouthSmile', A.L1 + 0.92, -0.38, { f: 2 });
    ctx.key('face.mouthOpen', at(A.L1, 0.1), 0.08);
    ctx.key('face.mouthWave', at(A.L1, 0.1), 0.85, { f: 1.5 });
    ctx.key('face.blush', A.L1 + 0.4, 1.15, { f: 2 });
    ctx.key('face.blush', at(A.L1, 1.0), 0.55, { f: 0.6 });

    // a shiver that builds with the spiral and stops dead at the turn
    ctx.term('body.squash.tremble', { type: 'noise', env: 'tremble', amp: 0.012, rate: 13, seed: 3 });
    ctx.term('body.sway.tremble', { type: 'noise', env: 'tremble', amp: 0.22, rate: 9, seed: 7 });
    ctx.term('body.shimmer.tremble', { type: 'envscale', env: 'tremble', amp: 0.1 });
    ctx.term('body.shimPhase.tremble', { type: 'ramp', env: 'tremble', rate: 6 });
    const build = [A.L1, at(A.PEAK1, -0.4)];                                // 3.0 … 6.6 s
    ctx.envelope('tremble', (R) => ({ mul: [{ ss: build }, { sub: [1, { ss: R.post('turn.stop') }] }] }));

    L.forEach((tb, i) => ctx.cue(tb, 'thought', { i, pan: (R) => cuePan(R.propAt('thoughts', i, tb + 0.6).x) }));
    ctx.cue(cringe, 'wince');
    ctx.cue(A.PEAK0, 'spin_up', { until: (R) => R.A.squeeze ?? R.A.TURN });
  },
};
