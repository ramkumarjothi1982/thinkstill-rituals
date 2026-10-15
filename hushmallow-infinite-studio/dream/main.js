// Dream stage page (dream/index.html). One page renders one direction.
//
// Query string:  direction=<id> (videos/<id>.js, see DIRECTIONS)   scale (render scale, default 1)
//                seed (virtual clock's Math.random)                 play=1 (preview in real time)
//
// window.__dream is the render tool's API (tools/render-dream.mjs).

import { clock } from '../engine/runtime/clock.js';   // FIRST: virtual time and seeded randomness
import { DreamStage } from './stage.js';

// constant import thunks (no computed module paths)
const DIRECTIONS = {
  'feel-something': () => import('../videos/feel-something.js'),
};

const q = new URLSearchParams(location.search);
const id = q.get('direction') || 'feel-something';
const scale = Number(q.get('scale') || 1);
if (!Object.hasOwn(DIRECTIONS, id)) throw new Error(`unknown direction ${id}`);

const stage = new DreamStage({ canvas: document.getElementById('out'), scale, clock });
const ready = (async () => {
  const mod = await DIRECTIONS[id]();
  await stage.init(mod.default);
  const m = mod.default.meta;
  return { id: m.id, title: m.title, fps: m.fps, duration: m.duration, frames: Math.round(m.duration * m.fps), width: stage.outW, height: stage.outH };
})();
ready.catch((e) => console.error(`[dream] ${e.stack || e.message}`));

window.__dream = {
  ready,
  stage,
  renderFrame: (i, o) => stage.renderFrame(i, o),
  readback: (url) => stage.readback(url),
  flush: () => stage.flush(),
  dryRun: (n) => stage.dryRun(n),
};

if (q.get('play') === '1') {
  ready.then((info) => {
    let i = 0;
    const tick = () => { stage.renderFrame(i % info.frames, { capture: false }); i++; setTimeout(tick, 0); };
    tick();
  });
}
