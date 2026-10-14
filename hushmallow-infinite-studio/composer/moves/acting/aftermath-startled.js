// acting/aftermath-startled — the wide-eyed aftermath of a startle (approved
// v2): a double blink, a glance left and right, worried brows, a wobbly
// mouth, cheeks flushing, and a little panting that lasts until the turn
// stops everything. Follows gags whose exit pose is 'startled'.

import { zone } from '../lib.js';

const CHANNELS = ['body.lean', 'face.eyeOpen', 'face.irisScale', 'face.lookX', 'face.lookY', 'face.browAlpha',
  'face.mouthSmile', 'face.mouthOpen', 'face.mouthRound', 'face.mouthWave', 'face.mouthWidth', 'face.blush'];

export default {
  id: 'acting/aftermath-startled',
  kind: 'aftermath',
  summary: 'double blink, glances, worried brows, wobbly mouth, flush, panting',
  cost: { subframes: 'low', faceRedraws: 'med' },
  requires: { caps: ['face.blink', 'face.lookX'] },
  span: ['IMPACT', 'HOOK_OUT'],
  entry: 'startled',
  exit: 'alert',
  owns: zone(CHANNELS, 'IMPACT', 'L1'),
  params: {
    glance: { def: 0.75, range: [0.5, 0.85], doc: 'how far the eyes travel on the first glance (look units)' },
    pant: { def: 0.012, range: [0, 0.02], doc: 'panting depth (inflate)' },
  },
  cues: { blink: { recipe: 'v2/blink' }, glance: { recipe: 'v2/glance' } },

  compile(ctx, A, p) {
    const { at } = ctx;
    const land = A.IMPACT;
    const g1 = at(land, 0.87), g2 = at(land, 1.22), g3 = at(land, 1.6);    // 1.85, 2.2, 2.58 s
    const eyesOpen = ctx.posts('gag.eyes').every(Boolean);

    // lean into each glance
    ctx.key('body.lean', g1, -0.025);
    ctx.key('body.lean', g2, 0.025);
    ctx.key('body.lean', g3, 0);
    // eyes stay wide, settle; pupils recover; double blink; glances left, right, back
    if (eyesOpen) {
      ctx.key('face.eyeOpen', at(land, 0.12), 1.12, { f: 2, z: 0.9 });
      ctx.key('face.eyeOpen', at(land, 1.62), 1.02, { f: 1.5, z: 0.9 });
    }
    ctx.key('face.irisScale', at(land, 0.42), 0.72);
    ctx.blink(at(land, 0.44));
    ctx.blink(at(land, 0.68));
    ctx.look(g1, [-p.glance, -0.1]);
    ctx.look(g2, [0.72, -0.05]);
    ctx.look(g3, [0, 0.12]);
    // worried brows, a wobbly unsure mouth, a flush
    ctx.key('face.browAlpha', at(land, 0.22), 0.3);
    ctx.key('face.mouthSmile', at(land, 0.17), -0.25);
    ctx.key('face.mouthOpen', at(land, 0.12), 0.06);
    ctx.key('face.mouthRound', at(land, 0.12), 0.1);
    ctx.key('face.mouthWave', at(land, 0.17), 0.35);
    ctx.key('face.mouthWidth', at(land, 0.17), 0.85);
    ctx.key('face.blush', at(land, 0.52), 0.8);

    // panting: from just after the landing until the turn stops everything
    ctx.term('body.inflate.pant', { type: 'sine', amp: p.pant, freq: 1.7, env: 'pant' });
    const rise = [at(land, 0.32), at(land, 1.02)];                          // 1.3 … 2.0 s
    ctx.envelope('pant', (R) => ({ mul: [{ ss: rise }, { sub: [1, { ss: R.post('turn.stop') }] }] }));

    ctx.cue(at(land, 0.44), 'blink');
    ctx.cue(at(land, 0.68), 'blink');
    ctx.cue(g1, 'glance', { pan: -0.5 });
    ctx.cue(g2, 'glance', { pan: 0.5 });
  },
};
