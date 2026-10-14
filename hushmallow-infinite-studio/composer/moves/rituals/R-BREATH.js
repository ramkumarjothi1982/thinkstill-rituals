// R-BREATH — "one big breath" (approved v2): one huge, slow inhale (the body
// swells tall and lifts, the thoughts are drawn close), a soft crest, a long
// elastic exhale: the body melts into a luxurious squash, a calm ring spreads
// over the water, and the breath carries the thoughts away: the words fade
// first, then the glass turns into warm motes. The release warms the world.
//
// Safety (library): no counts, no holds, no instruction, no fast breathing.
// G-DIR checks inhale ≥ 1.2 s, crest ≤ 0.35 s and the exhale ratio.

import { lcg } from '../../rng.js';
import { zone, cuePan } from '../lib.js';
import { TAU } from '../../../engine/motion.js';

const CHANNELS = ['body.squash', 'body.inflate', 'body.lift', 'face.mouthSmile', 'face.mouthOpen', 'face.mouthRound', 'face.mouthWidth', 'face.blush'];
const REFERENCE_WINDOW = 4.1;      // the 15 s clock's ritual window the timing was tuned in

export default {
  id: 'R-BREATH',
  kind: 'ritual',
  library: 'R-BREATH',
  summary: 'one slow inhale, a soft crest, a long elastic exhale that carries the thoughts away',
  cost: { subframes: 'med', faceRedraws: 'low', particles: 24 },
  requires: { caps: ['body.lift', 'props.dissolve'], minWindow: 3.2 },
  span: ['RITUAL0', 'OPEN-0.25'],
  entry: 'squeezed',
  exit: 'calm',
  publishes: (A, at) => {
    const s = Math.min(1, (A.RITUAL1 - A.RITUAL0) / REFERENCE_WINDOW);
    const inhale = at(A.RITUAL0, 0.02 * s), crest = at(A.RITUAL0, 1.5 * s), exhale = at(A.RITUAL0, 1.8 * s);
    return { inhale, crest, exhale, dissolve0: at(exhale, 0.22), dissolve1: at(exhale, 0.42), dissolve2: at(exhale, 0.62) };
  },
  owns: { ...zone(CHANNELS, 'RITUAL0', 'OPEN-0.25'), 'props.thoughts.radius': ['RITUAL0', 'END'] },
  params: {
    lift: { def: 36, range: [24, 40], doc: 'how high the inhale lifts the body (art px)' },
    swell: { def: 0.21, range: [0.14, 0.24], doc: 'inflate at the crest' },
    exhaleDur: { def: 1.9, range: [1.9, 2.6], doc: 'seconds of eased exhale (cue dur)' },
    moteSeed: { def: 101, doc: 'seed of the first thought\'s motes (v2 rng)' },
    moteSeedStep: { def: 17, doc: 'seed step between thoughts' },
    motesPer: { def: 8, range: [4, 10], doc: 'motes per thought' },
  },
  cues: {
    inhale: { recipe: 'v2/inhale' }, crest: { recipe: 'v2/crest' }, exhale: { recipe: 'v2/exhale' }, release: { recipe: 'v2/release' },
    dissolve: { recipe: 'v2/dissolve' }, warm_bloom: { recipe: 'v2/warm_bloom' },
  },

  compile(ctx, A, p) {
    const { at } = ctx;
    const R0 = A.RITUAL0, inhale = A.inhale, crest = A.crest, exhale = A.exhale;
    const inDur = crest - inhale;
    const dis = [A.dissolve0, A.dissolve1, A.dissolve2];

    // inhale: grows tall and lifts; exhale: melts wide, elastic, settles
    ctx.key('body.squash', inhale, -0.10, { ease: 'inOutSine', dur: inDur });
    ctx.key('body.squash', exhale, 0.04, { f: 1.05, z: 0.42 });
    ctx.key('body.squash', at(R0, 3.6), 0, { f: 0.9, z: 0.9 });
    ctx.kick('body.squash.kicks', exhale + 0.12, 0.08, 1.5, 0.3);          // the plop of letting go
    ctx.kick('body.sway.kicks', exhale + 0.2, 0.04, 1.3, 0.3);
    ctx.shimmer(exhale + 0.12, 0.35, 2.0, 12);
    ctx.key('body.inflate', inhale, p.swell, { ease: 'inOutSine', dur: inDur });
    ctx.key('body.inflate', exhale, -0.035, { ease: 'inOutSine', dur: p.exhaleDur });
    ctx.key('body.inflate', at(R0, 4.0), 0, { f: 0.7, z: 1 });
    ctx.key('body.lift', inhale, p.lift, { ease: 'inOutSine', dur: inDur });
    ctx.key('body.lift', exhale, 0, { f: 1.1, z: 0.62 });
    // the soft 'o' of the exhale, then a content smile and a warm glow
    ctx.key('face.mouthSmile', at(R0, 3.5), 0.85, { f: 1, z: 0.9 });
    ctx.key('face.mouthOpen', exhale + 0.05, 0.28, { f: 2.2 });
    ctx.key('face.mouthOpen', at(R0, 3.3), 0, { f: 1.2, z: 1 });
    ctx.key('face.mouthRound', exhale + 0.05, 0.75, { f: 2.2 });
    ctx.key('face.mouthRound', at(R0, 3.3), 0, { f: 1.2, z: 1 });
    ctx.key('face.mouthWidth', exhale + 0.05, 0.8);
    ctx.key('face.mouthWidth', at(R0, 3.3), 1, { f: 1.2 });
    ctx.key('face.blush', R0, 0, { f: 0.6 });
    ctx.key('face.blush', at(R0, 3.1), 0.35, { f: 0.6 });
    // a calm ring spreads over the water
    ctx.ripple(exhale + 0.1, 0.5);
    ctx.ripple(exhale + 0.75, 0.24);

    // the thoughts: drawn close by the inhale, dimmed, carried away by the exhale, dissolved into warm motes
    const thoughts = ctx.prop('thoughts');
    thoughts.set('params.crowd', { alpha: 0.86, from: R0, to: at(R0, 1.2) });
    thoughts.items.forEach((it, i) => thoughts.set(`items.${i}.dissolve`, dis[i]));
    for (const [t, v] of [[R0, 1], [crest, 0.95], [at(R0, 1.9), 0.97], [at(R0, 3.1), 1.3], [A.END, 1.3]]) ctx.key('props.thoughts.radius', t, v);
    thoughts.set('motes', {
      away: ctx.pack.placement.centre, stagger: 0.12, drag: 1.6, sway: { amp: 9, freq: 2 }, spread: [0.85, 0.7],
      fadeIn: 0.4, fadeOutFrom: 0.4, flicker: { base: 0.85, amp: 0.15, freq: 2.2 }, alpha: 0.7,
      colors: [[1.7, 1.2, 0.68], [1.25, 1.0, 1.35]],
      list: thoughts.items.map((_, i) => {
        const r = lcg(p.moteSeed + i * p.moteSeedStep);
        return Array.from({ length: p.motesPer }, () => ({ u: r() * 2 - 1, v: r() * 2 - 1, up: 22 + r() * 30, push: 40 + r() * 50, life: 2.4 + r() * 1.2, size: 15 + r() * 10, ph: r() * TAU, sw: 0.4 + r() * 0.6 }));
      }),
    });

    // after the release the sleepy breathing comes back, at 70 %
    ctx.post('breath.resume', { amp: 0.7, from: at(R0, 3.4), to: at(R0, 4.4) });

    ctx.cue(inhale, 'inhale', { dur: inDur });
    ctx.cue(crest, 'crest');
    ctx.cue(exhale, 'exhale', { dur: p.exhaleDur });
    ctx.cue(exhale + 0.12, 'release');
    dis.forEach((td, i) => ctx.cue(td, 'dissolve', { i, pan: (R) => cuePan(R.propAt('thoughts', i, td).x) }));
    ctx.cue(exhale + 0.3, 'warm_bloom');                                    // the ritual's payoff: the realm warms
  },
};
