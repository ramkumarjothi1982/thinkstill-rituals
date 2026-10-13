// Quiet Moment: nothing to do. The Mallow breathes slowly and blinks, light
// drifts, a soft bed of sound plays (or silence, if you prefer). Rest a finger
// on it and it leans in; tap and it notices you. Thirty seconds, then a nod.

export default {
  id: 'quiet-moment',
  hint: 'Nothing to do. Just be here',
  maxSeconds: 30,
  start(api) {
    const { companion, rig, sound, effects, palette } = api;
    const { Motes } = api.effectsKit;
    const motes = effects.add(new Motes({ color: palette.glow, count: 22 }));
    companion.restOverride = { mix: { calm: 0.8, comforted: 0.2 }, i: 0.6 };
    rig.setFaceOverride({ set: { breathRate: 0.11, breath: 1.5 } });
    api.realm?.setEmotion('calm', 0.8);
    let pad = sound.pad(api.mallowId), silent = false, t = 0;
    const silence = api.button('Silence', () => {
      silent = !silent;
      silence.setAttribute('aria-pressed', String(silent));
      if (silent) { pad.end(); pad = { update() {}, end() {} }; } else { pad = sound.pad(api.mallowId); }
    }, { 'aria-pressed': 'false' });
    return {
      tick(dt) { t += dt; api.progress(t / 30 * 0.8); },
      done: () => false,
      ending() {
        pad.end();
        return { mix: { calm: 0.5, happy: 0.5 }, i: 0.55, reaction: 'nod', motif: 'rest', line: 'rest', caption: 'A quiet half minute.' };
      },
      stop() { pad.end(); motes.gone = true; rig.setFaceOverride({}); },
    };
  },
};
