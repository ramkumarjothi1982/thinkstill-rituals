// dream2 page (dream2/index.html). One page renders one direction.
//
// Query string:  direction=<id>   scale (render scale, default 1)   seed (virtual Math.random)
//                preview=1        draft quality: at most 2 motion-blur sub-frames (use with scale=0.5)
//                motion=reduced   the direction's reduced-motion cut (if it has one)
//
// window.__dream is the render tool's API (tools/render-dream.mjs --stage dream2).

import { clock } from '../engine/runtime/clock.js';   // FIRST: virtual time and seeded randomness
import { Dream2Stage } from './stage.js';

const DIRECTIONS = {
  'feel-something-v2': () => import('../videos/feel-something-v2.js'),
};

const q = new URLSearchParams(location.search);
const id = q.get('direction') || 'feel-something-v2';
const scale = Number(q.get('scale') || 1);
if (!Object.hasOwn(DIRECTIONS, id)) throw new Error(`unknown direction ${id}`);
const opts = { preview: q.get('preview') === '1', motion: q.get('motion') || 'full' };

const stage = new Dream2Stage({ canvas: document.getElementById('out'), scale, clock, ...opts });
const ready = (async () => {
  const mod = await DIRECTIONS[id]();
  await stage.init(mod.default);
  const m = mod.default.meta;
  return { id: m.id, title: m.title, fps: m.fps, duration: m.duration, frames: Math.round(m.duration * m.fps), width: stage.outW, height: stage.outH, preview: opts.preview, motion: opts.motion };
})();
ready.catch((e) => console.error(`[dream2] ${e.stack || e.message}`));

window.__dream = {
  ready, stage,
  renderFrame: (i, o) => stage.renderFrame(i, o),
  readback: (url) => stage.readback(url),
  flush: () => stage.flush(),
  dryRun: (n) => stage.dryRun(n),
  timings: () => stage.timings,
};
