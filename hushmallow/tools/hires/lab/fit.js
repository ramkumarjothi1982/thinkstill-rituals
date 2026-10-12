// W7 render-fit pass (step 3b of the high-res re-rig, see tools/hires/README.md).
//
// Tunes each face feature so the DRAWN neutral face (pristine art off)
// matches the approved art, on the real rig renderer: coordinate descent on
// the feature's numbers, loss = mean |RGB| difference at 1/3 art resolution
// inside the feature's box, each number kept within +-15% (line widths
// +-40%) of where measure.py put it.
//   fit.html?mallow=glitzi[&feats=eyeL,eyeR,mouth,browL,browR][&table=<url of a hires table module>]
// `table` should be the --no-fit table (build_table.py --no-fit), so a fit
// always starts from the measured values. Result: window.__fit
//   { id, report: { feat: { before, after, values } }, face }
// tools/hires/lab/run.cjs fit <id> <out.json> runs it headless.
import { MALLOWS, SPRITES } from '../../../src/mallows/registry.js';
import { loadRig } from './rig-loader.js';

const qs = new URLSearchParams(location.search);
const id = qs.get('mallow') || 'glitzi';
const tableUrl = qs.get('table') ? new URL(qs.get('table'), location.href).href : new URL('../../../src/mallows/hires.js', import.meta.url).href;

const DS = 3;   // compare at 1/3 of art resolution (close to how it is seen)
function lumGrid(data, w, h) {
  const gw = Math.floor(w / DS), gh = Math.floor(h / DS);
  const out = new Float32Array(gw * gh * 3);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let r = 0, g = 0, b = 0;
    for (let y = 0; y < DS; y++) for (let x = 0; x < DS; x++) {
      const i = ((gy * DS + y) * w + gx * DS + x) * 4;
      const a = data[i + 3] / 255;
      r += data[i] * a; g += data[i + 1] * a; b += data[i + 2] * a;
    }
    const k = 3 * (gy * gw + gx), n = DS * DS;
    out[k] = r / n; out[k + 1] = g / n; out[k + 2] = b / n;
  }
  return out;
}

window.__ready = (async () => {
  const { MallowRig } = await loadRig();
  const { HIRES, hiresMallow } = await import(tableUrl);
  const OLD = MALLOWS[id];
  const NEW = hiresMallow(OLD, id);
  Object.assign(SPRITES, HIRES[id].sprites);
  const holder = document.createElement('div');
  holder.style.cssText = 'width:400px;height:430px;position:relative';
  document.getElementById('app').append(holder);
  MALLOWS[id] = NEW;
  const r = new MallowRig(holder, { id, interactive: false, particles: false, pristine: false });
  MALLOWS[id] = OLD;
  await r.loaded;
  r.cycles.idle = 1e9; r.blink.next = 1e9; r.blink.t = -1; r.sacc.next = 1e9; r.sacc.x = 0; r.sacc.y = 0;
  r.setEmotion('neutral', 0, { instant: true });
  r.spinAngle = 0; r.base.spin = 0; r.target.spin = 0; r.val.spin = 0;
  // stop the shared loop from touching this rig while we fit
  r.destroyed = true;
  const res = NEW.res;
  r.q = res;
  r.skin.width = Math.ceil(NEW.size[0] * res);
  r.skin.height = Math.ceil(NEW.size[1] * res);
  r.restMix = 0;
  const art = document.createElement('canvas');
  art.width = r.skin.width; art.height = r.skin.height;
  const ag = art.getContext('2d');
  ag.drawImage(r.assets.original, 0, 0, art.width, art.height);
  const f = NEW.face;
  const render = () => { r.skinDirty = true; r._lastSig = null; r.restMix = 0; r._dt = 0; r._renderSkin(); };
  const roiOf = (key) => {
    let x0, y0, x1, y1;
    if (key.startsWith('eye')) {
      const e = f.eyes[key.slice(-1)];
      const rx = e.rx || e.hw, ry = e.ry || e.hw * 0.7;
      x0 = e.x - rx * 1.5; x1 = e.x + rx * 1.5; y0 = e.y - ry * 1.6; y1 = e.y + ry * 1.5;
    } else if (key.startsWith('brow')) {
      const b = f.brows[key.slice(-1)];
      x0 = Math.min(b.p0[0], b.p1[0]) - b.lw * 2; x1 = Math.max(b.p0[0], b.p1[0]) + b.lw * 2;
      y0 = Math.min(b.p0[1], b.p1[1], b.c[1]) - b.lw * 2.5; y1 = Math.max(b.p0[1], b.p1[1], b.c[1]) + b.lw * 2.5;
    } else {
      const M = f.mouth, d = M.depth || M.w * 0.45;
      x0 = M.x - M.w * 0.7; x1 = M.x + M.w * 0.7; y0 = M.y - M.w * 0.25 - M.lw * 2; y1 = M.y + Math.max(M.sag || 0, 0) + d * 1.25 + M.lw * 2;
    }
    const q = r.q;
    const X0 = Math.max(0, Math.floor(x0 * q)), Y0 = Math.max(0, Math.floor(y0 * q));
    const W = Math.min(art.width - X0, Math.ceil((x1 - x0) * q)), H = Math.min(art.height - Y0, Math.ceil((y1 - y0) * q));
    return [X0, Y0, W - W % DS, H - H % DS];
  };
  const target = {};
  const loss = (key, roi) => {
    render();
    const [x, y, w, h] = roi;
    const d = r.sctx.getImageData(x, y, w, h).data;
    const A = lumGrid(d, w, h), T = target[key];
    let s = 0;
    for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - T[i]);
    return s / A.length;
  };
  // which numbers each feature may move, with step sizes (logical px)
  const specs = {
    eye: (e) => (f.eyeStyle === 'closed'
      ? [['x', 1.5], ['y', 1.5], ['hw', 2], ['sag', 1.5], ['tilt', 1], ['lw', 0.8]]
      : [['x', 2], ['y', 2], ['rx', 2], ['ry', 2], ['sag', 1.5], ['irisR', 1], ['irisOff.0', 1.5], ['irisOff.1', 1.5]])
      // a spiral's centre is its rotation centre: it stays where measure.py
      // found the painted one, only the lid shape is fitted
      .filter(([k]) => k.split('.')[0] in e && !(f.eyeStyle === 'spiral' && (k === 'x' || k === 'y'))),
    brow: () => [['p0.0', 2], ['p0.1', 2], ['c.0', 2], ['c.1', 2], ['p1.0', 2], ['p1.1', 2], ['lw', 1]],
    mouth: (M) => [['x', 2], ['y', 2], ['w', 3], ['sag', 1.5], ['lw', 0.6], ['upper', 1.5], ['depth', 2]].filter(([k]) => k in M),
  };
  const get = (o, k) => { const [a, b] = k.split('.'); return b == null ? o[a] : o[a][+b]; };
  const set = (o, k, v) => { const [a, b] = k.split('.'); if (b == null) o[a] = v; else o[a][+b] = v; };
  const report = {};
  const feats = (qs.get('feats') || 'eyeL,eyeR,mouth,browL,browR').split(',');
  for (const key of feats) {
    let obj;
    if (key.startsWith('eye')) obj = f.eyes[key.slice(-1)];
    else if (key.startsWith('brow')) { obj = f.brows[key.slice(-1)]; if (!(obj.alpha > 0)) continue; }
    else obj = f.mouth;
    const roi = roiOf(key);
    const td = ag.getImageData(...roi).data;
    target[key] = lumGrid(td, roi[2], roi[3]);
    const vars = (key.startsWith('eye') ? specs.eye : key.startsWith('brow') ? specs.brow : specs.mouth)(obj);
    const start = Object.fromEntries(vars.map(([k]) => [k, get(obj, k)]));
    const lim = (k, v) => {
      const s0 = start[k];
      const rel = k === 'lw' ? 0.4 : 0.15;
      const span = Math.max(Math.abs(s0) * rel, k.includes('Off') || k === 'sag' || k === 'upper' ? 6 : 3);
      return Math.min(s0 + span, Math.max(s0 - span, v));
    };
    let best = loss(key, roi);
    const l0 = best;
    for (let round = 0; round < 4; round++) {
      let improved = false;
      for (const [k, step0] of vars) {
        for (const step of [step0, step0 / 2, step0 / 4].map((s) => s / (round + 1))) {
          for (const dir of [1, -1]) {
            const old = get(obj, k);
            const nv = lim(k, old + dir * step);
            if (nv === old) continue;
            set(obj, k, nv);
            const l = loss(key, roi);
            if (l < best - 1e-4) { best = l; improved = true; } else set(obj, k, old);
          }
        }
      }
      if (!improved) break;
    }
    report[key] = { before: +l0.toFixed(3), after: +best.toFixed(3), values: Object.fromEntries(vars.map(([k]) => [k, +get(obj, k).toFixed(2)])) };
  }
  render();
  window.__fit = { id, report, face: JSON.parse(JSON.stringify(f)) };
  return true;
})().catch((e) => { window.__fit = { error: String(e && e.stack || e) }; });
