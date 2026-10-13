// Quick Squeeze: squish it out. Five good squeezes (pinch, press down on the
// Mallow, or hold the Squeeze button); each one ripples the world and the
// Mallow eases a little more. Ending: it melts flat, then pops back happy.

const GOAL = 5;

export default {
  id: 'quick-squeeze',
  hint: 'Squeeze me: pinch, press down, or hold Squeeze',
  maxSeconds: 30,
  start(api) {
    const { companion, rig, sound, variant } = api;
    companion.setMaterial(variant.material || 'pillow');
    const setDots = api.dots(GOAL);
    let count = 0, peak = 0, active = false, done = false, melt = null;
    const ease = () => {
      // calmer with every squeeze: the resting face moves from playful to relieved
      const k = count / GOAL;
      companion.restOverride = k < 0.5 ? { mix: { playful: 0.6, happy: 0.4 }, i: 0.45 } : { mix: { relieved: 0.5 + k * 0.3, comforted: 0.5 - k * 0.3 }, i: 0.45 + k * 0.2 };
    };
    ease();
    api.onGesture((e) => {
      if (e.type === 'squeeze' || e.type === 'drag') { active = true; peak = 0; }
      if (e.type === 'release' && active) {
        active = false;
        if (peak > 0.12) {
          count++;
          setDots(count);
          sound.chime(api.mallowId, count + 1, 0.5);
          api.realm?.pulse('ripple');
          rig.particles.burst({ kind: 'puff', n: 2 });
          api.progress(count / GOAL);
          ease();
          if (count >= GOAL) done = true;
          else if (count === 3) api.hint('Two more', 1600);
        }
      }
    });
    api.holdButton('Squeeze', () => companion.act('squeezeStart'), () => companion.act('squeezeEnd'));
    return {
      tick() {
        const m = rig.metrics();
        if (active && m) peak = Math.max(peak, m.squash, rig.faceState.squeeze * 0.3);
      },
      get count() { return count; },
      done: () => done,
      ending(why) {
        // melt flat, then pop back
        rig.setSqueeze(0.35);
        melt = setTimeout(() => { rig.setSqueeze(0); rig.react('hop'); }, 700);
        companion.restOverride = { mix: { relieved: 0.6, happy: 0.4 }, i: 0.6 };
        return { mix: { relieved: 0.7, happy: 0.3 }, i: 0.7, reaction: 'sigh', motif: 'bright', line: 'cheer',
          caption: why === 'complete' ? 'All squished out.' : `${count} squeeze${count === 1 ? '' : 's'}. That counts.` };
      },
      stop() { clearTimeout(melt); rig.setSqueeze(0); },
    };
  },
};
