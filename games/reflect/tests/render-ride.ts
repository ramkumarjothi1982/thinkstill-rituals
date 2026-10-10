/* Visual check for the Emotional Rollercoaster ride: frames along the ride from the rider camera. */
import { renderRide, Rider, RIDER_COLORS } from '../src/rituals/emotional-rollercoaster/ride';
import { buildTrack } from '../src/rituals/emotional-rollercoaster/track';
import { SATURDAY, Seg } from '../src/rituals/emotional-rollercoaster/content';
import { FaceBank } from '../src/actor/faces';
const q = new URLSearchParams(location.search);
const W = Number(q.get('w') || 390), H = Number(q.get('h') || 520);
const times = (q.get('t') || '2,4.6,6.5,9,12.5,15,19,21.5,24,28,31,34.5').split(',').map(Number);
const faces = new FaceBank('/img/');
const mine: Seg[] = [{ h: -0.6, mod: 'drop' }, { h: -0.3, mod: 'tunnel' }, { h: 0.8, mod: 'loop' }, { h: -0.5, mod: 'cork' }, { h: 0.7, mod: 'smooth' }];
const rush: Seg[] = [{ h: -1, mod: 'drop' }, { h: 0.9, mod: 'loop' }, { h: 0.9, mod: 'loop' }, { h: -0.9, mod: 'drop' }, { h: 1, mod: 'loop' }];
const still: Seg[] = [{ h: -0.2, mod: 'smooth' }, { h: 0, mod: 'smooth' }, { h: 0.3, mod: 'smooth' }, { h: -0.1, mod: 'cork' }, { h: 0.3, mod: 'smooth' }];
const riders: Rider[] = [
  { pid: 'a', avatar: 'sync', name: 'You', human: true, track: buildTrack(mine), color: RIDER_COLORS[0] },
  { pid: 'b', avatar: 'rush', name: 'Rush', human: false, track: buildTrack(rush), color: RIDER_COLORS[1] },
  { pid: 'c', avatar: 'still', name: 'Still', human: false, track: buildTrack(still), color: RIDER_COLORS[2] }
];
(async () => {
  await faces.preload(['sync', 'rush', 'still'].flatMap(s => ['happy', 'laugh', 'wow', 'surprised', 'worried', 'determined', 'speed'].map(m => [s, m] as [string, string])));
  const grid = document.getElementById('grid')!;
  grid.style.gridTemplateColumns = `repeat(6, ${W}px)`;
  for (const t of times) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const t0 = performance.now();
    const info = renderRide(c.getContext('2d')!, W, H, { riders, me: 0, t, assign: (pid, seg) => (pid === 'a' && seg === 2 ? 'b' : pid), faces: (s, m) => faces.get(s, m), moments: SATURDAY });
    const f = document.createElement('figure'); const cap = document.createElement('figcaption'); cap.textContent = `t=${t} seg=${info.seg} v=${info.speed.toFixed(0)} (${(performance.now() - t0).toFixed(1)} ms)`;
    f.appendChild(c); f.appendChild(cap); grid.appendChild(f);
  }
  document.body.dataset.done = '1';
})().catch(e => { document.body.dataset.error = String(e && e.stack || e); document.body.dataset.done = '1'; });
