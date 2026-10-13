// Gentle Glow: move a warm light around. The Mallow follows it with its eyes,
// and while the light rests near it, it warms up and glows. When it is fully
// warm, the light blooms. Drag anywhere, use the arrow keys, or hold
// "Bring the light".

const TINTS = { warm: '#ffcf7a', moon: '#e9efff' };

export default {
  id: 'gentle-glow',
  hint: 'Drag the light. Bring it close',
  maxSeconds: 35,
  start(api) {
    const { companion, rig, sound, effects, palette, variant } = api;
    const { GlowOrb } = api.effectsKit;
    const b = api.body();
    const color = TINTS[variant.tint] || palette.glow;
    const orb = effects.add(new GlowOrb({ x: b.cx + b.w * 0.9, y: Math.max(90, b.top - b.h * 0.45), color, r: Math.max(22, b.h * 0.13) }));
    let warmth = 0, done = false, step = 0, bring = false, nearNow = false;
    const keys = (e) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      orb.moveTo(orb.tx + d[0] * 28, orb.ty + d[1] * 28);
    };
    document.addEventListener('keydown', keys);
    api.capture((kind, p) => { if (kind !== 'up') orb.moveTo(p.x, p.y); return true; });
    api.holdButton('Bring the light', () => { bring = true; }, () => { bring = false; });
    return {
      tick(dt) {
        const B = api.body();
        if (bring) orb.moveTo(orb.tx + (B.cx - orb.tx) * Math.min(1, dt * 1.6), orb.ty + (B.mid - orb.ty) * Math.min(1, dt * 1.6));
        const d = Math.hypot(orb.x - B.cx, orb.y - B.mid);
        const near = d < B.h * 0.8, touching = d < B.h * 0.45;
        warmth = Math.max(0, Math.min(1, warmth + dt * (touching ? 0.17 : near ? 0.1 : -0.03)));
        rig.lookAtScreen(orb.x, orb.y);
        if (near !== nearNow) {
          nearNow = near;
          companion.restOverride = near ? { mix: { loved: 0.5, comforted: 0.5 }, i: 0.45 + warmth * 0.3 } : { mix: { curious: 0.6, calm: 0.4 }, i: 0.4 };
          if (near && rig.mallow.face.eyeStyle === 'closed') rig.peek(orb.x, orb.y, 1.2);
        }
        rig.setFaceOverride({ min: { glow: warmth * 1.3, blush: 1 + warmth * 0.9 } });
        api.realm?.setFocus((orb.x / B.W - 0.5) * 1.6, (orb.y / B.H - 0.5) * 1.2);
        api.progress(warmth);
        const s = Math.floor(warmth * 5);
        if (s > step) { step = s; sound.chime(api.mallowId, s + 2, 0.4); }
        if (warmth >= 1) done = true;
      },
      done: () => done,
      ending(why) {
        orb.moveTo(api.body().cx, api.body().top - 20);
        return { mix: { loved: 0.6, happy: 0.4 }, i: 0.75, reaction: 'comfort', motif: 'bright', line: 'cheer',
          caption: why === 'complete' ? 'All warm.' : 'A little warmer.' };
      },
      finish() { setTimeout(() => { orb.gone = true; }, 1500); },
      stop() { document.removeEventListener('keydown', keys); rig.setFaceOverride({}); orb.gone = true; },
    };
  },
};
