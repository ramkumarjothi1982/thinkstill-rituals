// Let It Float: the Mallow breathes out a few bubbles (or lanterns, petals,
// leaves). Flick or tap each one to send it drifting up and away; the Mallow
// watches it go. When the last one is gone, the world settles. "Let one go"
// releases the next one without touch.

const COUNT = 6;
const COLOURS = { bubbles: '#bfe9ff', lanterns: '#ffb35c', petals: '#ffc2dc', leaves: '#9fdc8a' };

export default {
  id: 'let-it-float',
  hint: 'Flick them up and let them go',
  maxSeconds: 40,
  start(api) {
    const { companion, rig, sound, effects, variant, palette } = api;
    const { Floater } = api.effectsKit;
    const kind = variant.kind || 'bubbles';
    const color = api.dna.palette() ? palette.glow : COLOURS[kind];
    const items = [];
    const held = new Map();   // pointerId → the floater that finger holds
    let gone = 0, done = false, t = 0, spawned = 0, autoAt = 26, auto = 0;
    companion.restOverride = { mix: { calm: 0.6, curious: 0.4 }, i: 0.4 };
    const spawn = () => {
      const B = api.body(), i = spawned++;
      // a loose arc around the Mallow, out from where it breathed them
      const a = Math.PI * (1.12 + (i / (COUNT - 1)) * 0.76), R = B.w * (0.85 + (i % 2) * 0.18);
      const f = effects.add(new Floater({ x: B.cx + Math.cos(a) * R, y: B.mid + Math.sin(a) * R * 0.75, kind, color, seed: i }));
      items.push(f);
      sound.bubble(0.8 + i * 0.06);
    };
    const release = (f, vx = 0, vy = -220) => {
      f.release(vx, vy);
      sound.bubble(1.1 + Math.random() * 0.25);
      rig.lookAtScreen(f.x, f.y);
      if (rig.mallow.face.eyeStyle === 'closed') rig.peek(f.x, f.y, 1);
      if (Math.random() < 0.4) rig.react('nod');
    };
    api.capture((k, p, e, v) => {
      if (k === 'down') {
        const f = items.find((x) => x.state === 'waiting' && x.hit(p.x, p.y));
        if (!f) return false;             // a touch on the Mallow itself still reaches it
        f.hold(p.x, p.y); f.downAt = performance.now(); f.downP = p;
        held.set(e.pointerId, f);
        return true;
      }
      const f = held.get(e.pointerId);
      if (!f) return false;
      if (k === 'move') f.drag(p.x, p.y);
      if (k === 'up') {
        const tap = performance.now() - f.downAt < 300 && Math.hypot(p.x - f.downP.x, p.y - f.downP.y) < 12;
        release(f, tap ? 0 : v.vx, tap ? -220 : v.vy);
        held.delete(e.pointerId);
      }
      return true;
    });
    api.button('Let one go', () => { const f = items.find((x) => x.state === 'waiting'); if (f) release(f); });
    return {
      tick(dt) {
        t += dt;
        if (spawned < COUNT && t > 0.4 + spawned * 0.32) spawn();
        if (spawned === COUNT && t > autoAt) {          // near the end, the rest drift off on their own
          const f = items.find((x) => x.state === 'waiting'); if (f) { release(f, 0, -160); autoAt = t + 0.6; auto++; }
        }
        let g = 0;
        for (const f of items) if (f.state === 'gone') g++;
        if (g > gone) { gone = g; api.progress(gone / COUNT); if (gone === COUNT - 1) api.hint('One more', 1400); }
        if (spawned === COUNT && gone === COUNT) done = true;
      },
      done: () => done,
      ending(why) {
        const caption = why !== 'complete' ? 'They’re drifting off on their own.' : auto ? 'All floated away, some on their own.' : 'All floated away.';
        return { mix: { relieved: 0.7, calm: 0.3 }, i: 0.65, reaction: 'sigh', motif: 'rest', line: 'rest', caption };
      },
      items,
      stop() { held.clear(); for (const f of items) f.state = 'gone'; },
    };
  },
};
