// G-JOLT — "Jolt & flump" (approved v2): asleep on the cover, a dream flinch
// at ANTIC, then the memory hits like a hypnic jerk at GAG: eyes snap wide,
// pin-prick pupils, a stretched launch out of the water, round at the apex,
// and a heavy jelly landing at IMPACT; the wave travels up the body and
// ripples roll across the lake.
//
// Numbers are v2's (videos/my-brain-at-2am-v2.js), tuned on Noomi at full
// intensity; `amount` scales the deformation toward gentler values as the
// spec's gag intensity drops, exactly reproducing v2 at intensity 1.

import { amount, zone } from '../lib.js';

const FACE_IMPACT = ['face.eyeOpen', 'face.squint', 'face.irisScale', 'face.mouthSmile', 'face.mouthOpen', 'face.mouthRound'];

export default {
  id: 'G-JOLT',
  kind: 'gag',
  library: 'G-JOLT',
  summary: 'hypnic jerk: dream flinch, stretched launch, heavy jelly landing',
  cost: { subframes: 'high', faceRedraws: 'high', world: 'ripples' },
  requires: { ground: ['mirror'], caps: ['body.lift', 'world.ripples', 'face.eyeOpen'] },
  span: ['ANTIC-0.09', 'IMPACT'],
  entry: 'asleep',
  exit: 'startled',
  next: { aftermath: 'acting/aftermath-startled' },
  owns: {
    ...zone(['body.squash', 'body.inflate', 'face.eyeStretch', 'face.eyeScale'], 'ANTIC', 'L1'),
    ...zone(FACE_IMPACT, 'ANTIC', 'IMPACT'),
  },
  params: {
    intensity: { def: 1, range: [0.4, 1], doc: 'from spec.gag.intensity; 1 = the approved v2 jolt' },
    height: { def: 165, range: [110, 180], doc: 'hop height at full intensity (art px)' },
    eyePop: { def: 1.32, range: [1.1, 1.4], doc: 'eyeOpen at the snap (gated by the pack eye gate)' },
  },
  cues: {
    flinch: { recipe: 'v2/flinch' }, take: { recipe: 'v2/take' }, lift_off: { recipe: 'v2/lift_off' },
    land: { recipe: 'v2/land' }, ripple: { recipe: 'v2/ripple' },
  },

  compile(ctx, A, p) {
    const amt = amount(p.intensity);
    const { at } = ctx;
    const antic = A.ANTIC, take = A.GAG, land = A.IMPACT;

    // body: the flinch sinks, the jolt shoots up stretched, rounds out toward the apex,
    // falls stretched and lands; the landing rings through squash, sway and the rim
    ctx.key('body.squash', antic, amt(0.07, 0.03), { f: 4.5, z: 0.75 });
    ctx.key('body.squash', take, amt(-0.26, -0.1), { f: 6.0, z: 0.5, react: true });
    ctx.key('body.squash', at(take, 0.13), amt(-0.02, -0.01), { f: 4.5, z: 0.75, react: true });
    ctx.key('body.squash', at(take, 0.4), amt(-0.09, -0.04), { f: 3.5, z: 0.9, react: true });
    ctx.key('body.squash', land, 0, { f: 9, z: 1 });
    ctx.kick('body.squash.kicks', land, amt(0.27, 0.1), 3.0, 0.24);
    ctx.kick('body.sway.kicks', land, amt(0.06, 0.025), 2.1, 0.2);
    ctx.shimmer(land, amt(1.0, 0.4), 3.0, 19);
    ctx.hop(take, land, amt(p.height, p.height * 0.36));
    ctx.key('body.inflate', take, amt(0.06, 0.02), { f: 6, z: 0.6, react: true });   // gasp
    ctx.key('body.inflate', at(take, 0.35), 0, { f: 2, z: 0.8 });

    // face: squeezed in the flinch, then eyes snap wide with pin-prick pupils
    const eyes = ctx.personality.eyesOpen(p.intensity, p.eyePop, take);    // a closure is recorded at the snap
    ctx.post('gag.eyes', eyes > 0);
    if (eyes > 0) ctx.key('face.eyeOpen', take, eyes, { f: 8, z: 0.42, react: true });
    ctx.key('face.squint', antic, 0.6);
    ctx.key('face.squint', take, 0, { f: 10, z: 1 });
    ctx.key('face.eyeStretch', take, 1.12, { f: 8, z: 0.4, react: true });
    ctx.key('face.eyeStretch', at(land, 0.02), 1, { f: 1.6, z: 0.8 });
    ctx.key('face.eyeScale', take, 1.1, { f: 7, z: 0.45, react: true });
    ctx.key('face.eyeScale', at(land, 0.22), 1, { f: 1.5, z: 0.9 });
    ctx.key('face.irisScale', take, 0.58, { f: 9, z: 0.8 });
    ctx.key('face.mouthSmile', antic, 0.7, { f: 4 });
    ctx.key('face.mouthSmile', take, 0, { f: 9, z: 0.8 });
    ctx.key('face.mouthOpen', take, 0.62, { f: 9, z: 0.55 });
    ctx.key('face.mouthRound', take, 0.85, { f: 9 });

    // world: the lake answers the launch and the landing
    ctx.ripple(take + 0.02, amt(0.32, 0.15));
    ctx.ripple(land, amt(1.0, 0.45));
    ctx.ripple(land + 0.2, amt(0.42, 0.2));

    // the cover rest (pristine painting) ends with the flinch; the sleeping breath stops
    ctx.post('rest.leave', [at(antic, -0.09), at(antic, -0.01)]);
    ctx.post('breath.wake', [at(antic, -0.08), at(antic, 0.08)]);
    ctx.post('gag.impact', land);

    ctx.cue(antic, 'flinch');
    ctx.cue(take, 'take');
    ctx.cue(take + 0.02, 'lift_off');
    ctx.cue(land, 'land', { amp: amt(1, 0.5) });
    ctx.cue(land + 0.2, 'ripple', { amp: amt(0.4, 0.2) });
  },
};
