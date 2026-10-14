// TURN-SQUEEZE — "squeeze… let go" (approved v2): everything stops dead. The
// body tenses, shoulders up, eyes squeeze shut, brows knit; then a letting go
// that opens the way to the ritual. Publishes the stop window that ends the
// escalation's tremble and panting.

import { zone } from '../lib.js';

const CHANNELS = ['body.squash', 'body.lean', 'face.eyeOpen', 'face.squint', 'face.closedCurve', 'face.lookX', 'face.lookY',
  'face.browAlpha', 'face.browY', 'face.mouthSmile', 'face.mouthOpen', 'face.mouthWave', 'face.mouthWidth'];

export default {
  id: 'TURN-SQUEEZE',
  kind: 'turn',
  library: 'TURN-SQUEEZE',
  summary: 'everything stops: squeeze shut, then let go',
  cost: { subframes: 'low', faceRedraws: 'med' },
  requires: { caps: ['face.squint'] },
  span: ['TURN-0.05', 'RITUAL0'],
  entry: 'spiralling',
  exit: 'squeezed',
  publishes: (A, at) => ({ squeeze: at(A.TURN, -0.02), relax: at(A.TURN, 0.32) }),
  owns: zone(CHANNELS, 'TURN-0.05', 'RITUAL0'),
  params: {},
  cues: { squeeze: { recipe: 'v2/squeeze' } },

  compile(ctx, A) {
    const { at } = ctx;
    const sq = A.squeeze, rx = A.relax;
    // the stop: tension, then release
    ctx.post('turn.stop', [at(A.TURN, -0.05), at(A.TURN, 0.3)]);
    ctx.key('body.squash', sq, -0.05, { f: 3, z: 0.8 });                    // tense, shoulders up
    ctx.key('body.squash', rx, 0, { f: 1.5, z: 0.9 });
    ctx.key('body.lean', sq, 0);
    ctx.key('face.eyeOpen', sq, 0, { f: 7, z: 0.9 });
    ctx.key('face.squint', sq, 1, { f: 6, z: 0.8 });
    ctx.key('face.squint', rx, 0, { f: 2.2, z: 0.9 });
    ctx.key('face.closedCurve', sq, 0.55);
    ctx.key('face.closedCurve', rx, 1, { f: 2.2 });
    ctx.look(rx, [0, 0]);
    ctx.key('face.browAlpha', sq, 0.35, { f: 4 });
    ctx.key('face.browAlpha', rx, 0, { f: 2 });
    ctx.key('face.browY', rx, 0.35);
    ctx.key('face.mouthSmile', sq, -0.15, { f: 5 });
    ctx.key('face.mouthSmile', rx, 0.25, { f: 1.5 });
    ctx.key('face.mouthOpen', sq, 0, { f: 6 });
    ctx.key('face.mouthWave', sq, 0, { f: 6 });
    ctx.key('face.mouthWidth', sq, 0.72, { f: 6 });
    ctx.key('face.mouthWidth', rx, 0.9);

    ctx.cue(sq, 'squeeze');
  },
};
