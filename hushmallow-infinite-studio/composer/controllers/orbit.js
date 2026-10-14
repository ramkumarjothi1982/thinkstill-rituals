// Prop controller 'orbit': glass cards that rise from behind the head and
// circle on an ellipse (M-ORBIT, v2's thought bubbles). Pure and
// deterministic, so the composer (look-at targets, cue pans, audio curves)
// and the engine runtime (glass passes) place the cards with the same code.
//
// Prop controller interface (frozen in WP-03, docs/ARCHITECTURE.md §6):
//   controller.create(prop, channel) → { count, at(i, t) → item | null }
//     prop     the direction's prop record { id, controller, params, items[], channels }
//     channel  (name) → function of t (composer/channels.js evaluators)
//     item     { x, y (world px), depth (−1 back … 1 front), scale, squash: [sx, sy],
//                alpha, stress, th, glowUp, textAlpha }  or null when not on screen
//
// The formulas are v2's bubbleAt() verbatim with its constants moved into
// prop.params (M-ORBIT's tuning), operand order kept so every value is the
// double v2 computed.

import { spring, ring, lerp, clamp, smoothstep } from '../../engine/motion.js';

export const orbit = {
  id: 'orbit',
  create(prop, channel) {
    const P = prop.params;
    const phase = channel(prop.channels.phase), radius = channel(prop.channels.radius);
    const E = P.ellipse, origin = P.origin, sw = P.spinWobble;
    const at = (i, t) => {
      const it = prop.items[i], tb = it.born;
      if (t < tb) return null;
      const dis = t - it.dissolve;
      if (dis > P.afterDissolve) return null;
      const th = it.slot + phase(t);
      const R = radius(t);
      const ox = E.cx + E.rx * R * Math.cos(th);
      const oy = E.cy + E.ry * R * Math.sin(th) - (R - 1) * E.lift;
      const k = spring(t - tb, P.arrive.f, P.arrive.z);
      const depth = lerp(P.depthStart, Math.sin(th), clamp(k));
      const spin = smoothstep(P.spin[0], P.spin[1], t) * (1 - smoothstep(P.spin[2], P.spin[3], t));
      const wob = P.wobble.amp * ring(t - tb, P.wobble.f, P.wobble.z) + spin * sw.amp * Math.sin(t * sw.freq + i * sw.step);
      const grow = spring(t - tb, P.grow.f, P.grow.z);
      const scale = lerp(P.grow.from, 1, grow) * (P.depthScale[0] + P.depthScale[1] * depth) * (1 + P.swell.amount * smoothstep(0, P.swell.dur, dis));
      const alpha = smoothstep(tb, tb + P.fadeIn, t) * (1 - smoothstep(P.fadeOut[0], P.fadeOut[1], dis))
        * (P.depthAlpha[0] + P.depthAlpha[1] * (depth * 0.5 + 0.5)) * lerp(1, P.crowd.alpha, smoothstep(P.crowd.from, P.crowd.to, t));
      // dissolving: the words go first, then the glass turns to warm light
      const glowUp = smoothstep(P.glowUp[0], P.glowUp[1], dis) * (1 - smoothstep(P.glowUp[2], P.glowUp[3], dis));
      const textAlpha = 1 - smoothstep(P.textOut[0], P.textOut[1], dis);
      return { x: lerp(origin[0], ox, k), y: lerp(origin[1], oy, k), depth, scale, squash: [1 + wob, 1 - wob], alpha, stress: spin * P.stress, th, glowUp, textAlpha };
    };
    return { count: prop.items.length, at };
  },
};
