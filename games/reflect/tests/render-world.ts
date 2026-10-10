/* Visual check for the Group Think Glitch world: renders camera rigs × times into a grid.
 *   /render.html?rigs=door,balcony&t=1,4.3&w=480&h=300 */
import { renderWorld, lens, rigCam, stateAt, RIGS } from '../src/rituals/group-think-glitch/world';
import { FaceBank } from '../src/actor/faces';

const q = new URLSearchParams(location.search);
const rigs = (q.get('rigs') || Object.keys(RIGS).join(',')).split(',') as (keyof typeof RIGS)[];
const times = (q.get('t') || '1,2.6,3.7,4.3,4.6,5.0,7').split(',').map(Number);
const W = Number(q.get('w') || 400), H = Number(q.get('h') || 260);
const faces = new FaceBank(q.get('img') || '/img/');

async function main() {
  const want: [string, string][] = [];
  for (const t of times) { const m = stateAt(t).mood as Record<string, string>; Object.keys(m).forEach(k => want.push([k, m[k]])); }
  await faces.preload(want);
  const grid = document.getElementById('grid')!;
  grid.style.gridTemplateColumns = `repeat(${times.length}, ${W}px)`;
  for (const r of rigs) for (const t of times) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    const s = stateAt(t);
    const t0 = performance.now();
    renderWorld(g, W, H, rigCam(r, t), s, { look: r, faces: (sl, m) => faces.get(sl, m) });
    lens(g, W, H, r as any, s, true);
    const ms = performance.now() - t0;
    const cell = document.createElement('figure');
    const cap = document.createElement('figcaption'); cap.textContent = `${r} t=${t} (${ms.toFixed(1)} ms)`;
    cell.appendChild(c); cell.appendChild(cap); grid.appendChild(cell);
  }
  document.body.dataset.done = '1';
}
main().catch(e => { document.body.dataset.error = String(e && e.stack || e); document.body.dataset.done = '1'; });
