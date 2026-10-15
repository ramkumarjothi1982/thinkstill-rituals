// Soft Breath: three slow breaths with the Mallow. It inflates as you breathe
// in and softens as you breathe out, inside a ring of light. It keeps its own
// gentle pace (from Comfort DNA's animation speed), but you can lead: press and
// hold anywhere to breathe in, let go to breathe out.

const BREATHS = 3;

export default {
  id: 'soft-breath',
  hint: 'Breathe with me. Hold anywhere to lead',
  maxSeconds: 45,
  start(api) {
    const { companion, rig, sound, effects, timing, palette } = api;
    const { BreathRing } = api.effectsKit;
    const b = api.body();
    const ring = effects.add(new BreathRing({ x: b.cx, y: b.mid, r0: b.h * 0.62, r1: b.h * 0.86, color: palette.glow }));
    companion.restOverride = { mix: { calm: 0.7, comforted: 0.3 }, i: 0.55 };
    rig.setFaceOverride({ set: { breath: 0 } });          // the breath here replaces its idle breathing
    api.realm?.setEmotion('calm', 0.6);
    let phase = 'in', pt = 0, breaths = 0, held = false, level = 0, done = false, voice = null;
    const begin = (p) => {
      phase = p; pt = 0;
      const dur = p === 'in' ? timing.inhale : timing.exhale;
      voice?.end();                                        // a led breath replaces the one still sounding
      voice = sound.breath(p, dur, 0.6, api.mallowId);
      api.hint(p === 'in' ? 'Breathe in…' : '…and out', 0);
    };
    begin('in');
    // lead with a press: down = in, up = out
    api.capture((kind) => {
      if (kind === 'down') { held = true; if (phase === 'out') begin('in'); return true; }
      if (kind === 'up') { held = false; if (phase === 'in' && pt > 1.2) begin('out'); }
      return true;
    });
    api.holdButton('Breathe in', () => { held = true; if (phase === 'out') begin('in'); }, () => { held = false; if (phase === 'in' && pt > 1.2) begin('out'); });
    return {
      tick(dt) {
        pt += dt;
        const dur = phase === 'in' ? timing.inhale : timing.exhale;
        const k = Math.min(1, pt / dur);
        const ease = k * k * (3 - 2 * k);
        level = phase === 'in' ? Math.max(level, ease) : Math.min(level, 1 - ease);
        ring.level = level;
        rig.setInflate(level);
        // follow the live body: at start the stage may not have framed the Mallow yet (the ring ran off the screen)
        const B = api.body(); ring.x = B.cx; ring.y = B.mid; ring.r0 = B.h * 0.62; ring.r1 = B.h * 0.86;
        if (phase === 'in' && k >= 1 && !held) begin('out');
        else if (phase === 'out' && k >= 1) {
          breaths++;
          api.progress(breaths / BREATHS);
          if (breaths >= BREATHS) { done = true; api.hint('', 1); } else begin('in');
        }
      },
      get phase() { return phase; },
      get breaths() { return breaths; },
      done: () => done,
      ending(why) {
        rig.setInflate(0);
        ring.gone = true;
        return { mix: { calm: 0.6, comforted: 0.4 }, i: 0.6, reaction: 'nod', motif: 'rest', line: 'rest',
          caption: why === 'complete' ? 'Three slow breaths.' : `${breaths} slow breath${breaths === 1 ? '' : 's'}.` };
      },
      stop() { voice?.end(); rig.setInflate(0); rig.setFaceOverride({}); ring.gone = true; },
    };
  },
};
