/* Visual check for "The Gift": frames across the 12 seconds with a sample dub. */
import { renderFilm } from '../src/rituals/drama-dubbing-booth/film';
import { FaceBank } from '../src/actor/faces';
import type { Cue } from '../src/rituals/drama-dubbing-booth/content';
const q = new URLSearchParams(location.search);
const W = Number(q.get('w') || 480), H = Number(q.get('h') || 270);
const times = (q.get('t') || '0.5,2,3.6,4.8,5.8,6.6,7.1,7.9,9.6,11.2').split(',').map(Number);
const faces = new FaceBank('/img/');
const cues: Cue[] = [
  { t: 0.8, who: 'patch', line: 'b0n', tone: 'nervous', face: 'worried', pitch: 0.2, pace: 0.3 },
  { t: 3.6, who: 'patch', line: 'b1s', tone: 'sarcastic', face: 'cool', pitch: 0, pace: -0.2 },
  { t: 6.9, who: 'sync', line: 'b2w', tone: 'warm', face: 'love', pitch: 0.3, pace: 0 },
  { t: 9.4, who: 'patch', line: 'b3d', tone: 'deadpan', face: 'cool', pitch: -0.5, pace: -0.3 }
];
(async () => {
  await faces.preload([['patch', 'neutral'], ['sync', 'neutral'], ['patch', 'worried'], ['patch', 'cool'], ['sync', 'love']]);
  const grid = document.getElementById('grid')!;
  grid.style.gridTemplateColumns = `repeat(5, ${W}px)`;
  for (const t of times) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const t0 = performance.now();
    renderFilm(c.getContext('2d')!, W, H, t, { faces: (s, m) => faces.get(s, m), cues });
    const f = document.createElement('figure'); const cap = document.createElement('figcaption'); cap.textContent = `t=${t} (${(performance.now() - t0).toFixed(1)} ms)`;
    f.appendChild(c); f.appendChild(cap); grid.appendChild(f);
  }
  document.body.dataset.done = '1';
})().catch(e => { document.body.dataset.error = String(e && e.stack || e); document.body.dataset.done = '1'; });
