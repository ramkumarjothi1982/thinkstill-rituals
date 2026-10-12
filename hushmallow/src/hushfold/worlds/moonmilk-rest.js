// Moonmilk Cove rest stop. Deliberately simple: the existing Moonmilk Cove
// realm, Noomi to squeeze, nothing to complete. A place to stop, not a full
// Hushflow world yet (see data/worlds.js).

import { REST } from '../data/lines.js';

export default function moonmilkRest(ctx) {
  const { subs, app } = ctx;
  let time = 0;
  return {
    id: 'moonmilk-rest',
    progress: 0,
    done: false,
    async enter() {
      app.world?.realm?.setMood({ agitation: 0.02, heaviness: 0.3, clarity: 0.7, warmth: 0.7 });
      await subs.say(REST.intro, { who: 'Noomi' });
    },
    pointerDown(e) { app.world?.realm?.pulse('ripple', { x: e.clientX, y: e.clientY }); },
    pointerMove() {},
    pointerUp() {},
    update(dt) {
      time += dt;
      const th = ctx.thoughts()[0];
      if (th && !th.held) {
        // the thought dozes beside Noomi
        th.tx = innerWidth * 0.7; th.ty = innerHeight * 0.62;
        th.scale += (0.7 - th.scale) * Math.min(1, dt);
        th.calm = Math.min(1, th.calm + dt * 0.03);
      }
    },
    render() {},
    pause() {}, resume() {}, resize() {}, destroy() {},
  };
}
