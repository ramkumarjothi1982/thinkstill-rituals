/* Sightline test: renders each camera with and without the cat and counts the pixels that differ.
 * The doorway and the phone must (almost) never see the cat; the balcony and the DJ booth must see it on the stool. */
import { renderWorld, rigCam, stateAt } from '../src/rituals/group-think-glitch/world';
import { FaceBank } from '../src/actor/faces';

const q = new URLSearchParams(location.search);
const W = Number(q.get('w') || 366), H = Number(q.get('h') || 458);
const faces = new FaceBank(q.get('img') || '/img/');
const rigs = ['door', 'phone', 'balcony', 'booth'] as const;

function px(c: HTMLCanvasElement) { return c.getContext('2d', { willReadFrequently: true } as any)!.getImageData(0, 0, W, H).data; }
async function diffView(r: any, t: number) {
  const a = document.createElement('canvas'), b = document.createElement('canvas');
  a.width = b.width = W; a.height = b.height = H;
  const ga = a.getContext('2d', { willReadFrequently: true } as any)!, gb = b.getContext('2d', { willReadFrequently: true } as any)!;
  const s = stateAt(t), cam = rigCam(r, t);
  renderWorld(ga, W, H, cam, s, { look: r, faces: (sl, m) => faces.get(sl, m) });
  renderWorld(gb, W, H, cam, s, { look: r, faces: (sl, m) => faces.get(sl, m), debugHide: ['cat'] });
  const ia = ga.getImageData(0, 0, W, H), db = gb.getImageData(0, 0, W, H).data, da = ia.data;
  for (let k = 0; k < da.length; k += 4) if (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) > 24) { da[k] = 255; da[k + 1] = 0; da[k + 2] = 255; }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let k = 0; k < da.length; k += 4) if (da[k] === 255 && da[k + 1] === 0 && da[k + 2] === 255) { const i = k / 4, x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  ga.putImageData(ia, 0, 0);
  const z = document.createElement('canvas'); z.width = 240; z.height = 240; const gz = z.getContext('2d')!; gz.imageSmoothingEnabled = false;
  if (x1 >= 0) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, half = Math.max(20, Math.max(x1 - x0, y1 - y0) / 2 + 10); gz.drawImage(a, cx - half, cy - half, half * 2, half * 2, 0, 0, 240, 240); }
  const cap = document.createElement('figcaption'); cap.textContent = r + ' t=' + t + (x1 >= 0 ? ` bbox ${x0},${y0}-${x1},${y1}` : ' clean');
  const f = document.createElement('figure'); f.appendChild(z); f.appendChild(cap); document.getElementById('grid')!.appendChild(f);
}
async function main() {
  const want: [string, string][] = [];
  for (let t = 0; t <= 9; t += 0.5) { const m = stateAt(t).mood as Record<string, string>; Object.keys(m).forEach(k => want.push([k, m[k]])); }
  await faces.preload(want);
  if (q.get('bench')) {
    // time the world renderer: 120 frames of one rig
    const r = q.get('bench') as any; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
    const run = () => { const t0 = performance.now(); for (let i = 0; i < 120; i++) { const t = (i % 180) * 0.05; renderWorld(g, W, H, rigCam(r, t), stateAt(t), { look: r, faces: (sl, m) => faces.get(sl, m) }); } return (performance.now() - t0) / 120; };
    run(); (window as any).__bench = [run(), run(), run()]; document.body.dataset.done = '1'; return;
  }
  if (q.get('dump')) {
    // list the pixels the cat changes (x, y, with cat, without cat) — for diagnosing seams and sightlines
    const [r, ts] = q.get('dump')!.split('@'); const t = Number(ts);
    const a = document.createElement('canvas'), b = document.createElement('canvas'); a.width = b.width = W; a.height = b.height = H;
    const ga = a.getContext('2d', { willReadFrequently: true } as any)!, gb = b.getContext('2d', { willReadFrequently: true } as any)!;
    const s = stateAt(t), cam = rigCam(r as any, t);
    const same = q.get('same');   // 'cat' | 'nocat': render the same thing twice (checks the renderer is deterministic)
    renderWorld(ga, W, H, cam, s, { look: r as any, faces: (sl, m) => faces.get(sl, m), debugHide: same === 'nocat' ? ['cat'] : [] });
    renderWorld(gb, W, H, cam, s, { look: r as any, faces: (sl, m) => faces.get(sl, m), debugHide: same === 'cat' ? [] : ['cat'] });
    const da = px(a), db = px(b), rows: number[][] = [];
    for (let k = 0, i = 0; k < da.length; k += 4, i++) { const d = Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]); if (d > 40) rows.push([i % W, (i / W) | 0, da[k], da[k + 1], da[k + 2], db[k], db[k + 1], db[k + 2]]); }
    (window as any).__dump = { cat: s.cat, pose: s.catPose, rows }; document.body.dataset.done = '1'; return;
  }
  if (q.get('diff')) { for (const spec of q.get('diff')!.split(';')) { const [r, t] = spec.split('@'); await diffView(r, Number(t)); } document.body.dataset.done = '1'; return; }
  const a = document.createElement('canvas'), b = document.createElement('canvas');
  a.width = b.width = W; a.height = b.height = H;
  const ga = a.getContext('2d', { willReadFrequently: true } as any)!, gb = b.getContext('2d', { willReadFrequently: true } as any)!;
  const out: Record<string, [number, number][]> = {};
  for (const r of rigs) {
    out[r] = [];
    for (let i = 0; i <= 180; i++) {
      const t = i * 0.05, s = stateAt(t), cam = rigCam(r, t);
      renderWorld(ga, W, H, cam, s, { look: r, faces: (sl, m) => faces.get(sl, m) });
      renderWorld(gb, W, H, cam, s, { look: r, faces: (sl, m) => faces.get(sl, m), debugHide: ['cat'] });
      const da = px(a), db = px(b);
      // count differing pixels that have a differing neighbour (ignores single-pixel rasteriser noise)
      const diff = new Uint8Array(W * H);
      for (let k = 0, i = 0; k < da.length; k += 4, i++) if (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) > 40) diff[i] = 1;
      let n = 0;
      for (let i = W; i < W * H - W; i++) if (diff[i] && (diff[i - 1] || diff[i + 1] || diff[i - W] || diff[i + W])) n++;
      out[r].push([+t.toFixed(2), n]);
    }
  }
  (window as any).__result = out;
  document.body.dataset.done = '1';
}
main().catch(e => { document.body.dataset.error = String(e && e.stack || e); document.body.dataset.done = '1'; });
