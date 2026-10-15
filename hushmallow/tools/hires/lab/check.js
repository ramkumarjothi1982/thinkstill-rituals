// W7 check lab: the current rig (current art) against the high-res rig, on
// frozen skins rendered by the real rig code (see tools/hires/README.md).
//   check.html?mode=skins&id=glitzi&kind=new|old[&skin=600][&spin=0.7]
//        REST approved | REST drawn | |diff| x3 | every preset at intensity 1
//        | six at .35 | blink .5 / 1, and window.__jump (rest jump metric)
//   check.html?mode=pair&id=glitzi&presets=happy,excited&i=1&skin=400
//        old (top row) vs new (bottom row)
//   check.html?mode=overflow[&kind=new|old][&ids=...]
//        drawn face pixels outside the body's alpha, for every preset (at .7
//        and 1), stage and reaction overlay, with spring overshoot -> __overflow
//   check.html?mode=spin&id=zuzu&kind=new&angles=0,1.6,3.2&preset=happy
//        Zuzu's eyes at several spin angles, cropped
//   check.html?mode=jump[&kind=new|old][&skin=600]   rest jump metric for every
//        Mallow: mean |luminance| difference (0-255) in the face rect between
//        the approved art (pristine, restMix 1) and the drawn rest face, on
//        the same frozen frame (t = 1.234, no blink, reduced motion). Zuzu's
//        spirals at spinAngle 0, the painted phase (the sprites are cut from
//        the art); __jumps.zuzuSpin07 adds the arbitrary phase 0.7 (what a
//        rig that keeps spinning at rest shows the moment it leaves rest).
//        node tools/hires/lab/run.cjs json 'mode=jump&kind=new' (and kind=old)
//   check.html?mode=live&id=glitzi&kind=new&sizes=110,220,380&presets=...  live rigs (run.cjs page)
// Results: window.__ready = true, then __out (PNG data URL) and/or numbers.
// MALLOWS / SPRITES come from the loader: the registry the (patched) rig reads
let MALLOWS, SPRITES, MALLOW_IDS;
import { REACTIONS } from '../../../src/mallows/reactions.js';
import { loadRig } from './rig-loader.js';

const Q = new URLSearchParams(location.search);
const mode = Q.get('mode') || 'skins';
const id = Q.get('id') || 'glitzi';
const SK = +(Q.get('skin') || 600);
const bg = Q.get('bg') || '#15122e';
document.body.style.background = bg;
const tableUrl = Q.get('table') ? new URL(Q.get('table'), location.href).href : new URL('../../../src/mallows/hires.js', import.meta.url).href;

let RIG, H;
function make(mid, kind, el, opts = {}) {
  // a rig captures MALLOWS[id] when it is built: swap only around the constructor
  const keep = MALLOWS[mid];
  if (kind === 'new') { MALLOWS[mid] = H.hiresMallow(keep, mid); Object.assign(SPRITES, H.HIRES[mid].sprites); }
  const r = new RIG.MallowRig(el, { id: mid, interactive: false, particles: false, audio: null, haptics: false, ...opts });
  MALLOWS[mid] = keep;
  return r;
}
function holder() {
  const h = document.createElement('div');
  h.style.cssText = 'position:absolute;left:-3000px;top:0;width:300px;height:300px';
  document.body.appendChild(h);
  return h;
}
function freeze(rig, t = 1.234, spin = 0.7) {
  rig._shouldRun = () => false;
  rig._blinkAmount = () => 0;
  rig.time = t;
  rig.spinAngle = spin;
}
function renderAt(rig, params, { pristine, restMix }) {
  rig.opts.pristine = pristine;
  rig.val = { ...rig.base, ...params };
  rig.restMix = restMix;
  rig._dt = 0;
  rig.skinDirty = true;
  rig._lastSig = null;
  rig._renderSkin();
  return rig.skin;
}
function snap(rig) {
  const c = document.createElement('canvas');
  c.width = rig.skin.width; c.height = rig.skin.height;
  c.getContext('2d').drawImage(rig.skin, 0, 0);
  return c;
}
function label(g, x, y, t) { g.font = '600 15px sans-serif'; g.fillStyle = '#fff'; g.fillText(t, x + 6, y + 18); }
function sheet(cells, cw, cols) {
  const c0 = cells[0][1];
  const ch = Math.round(cw * c0.height / c0.width);
  const rows = Math.ceil(cells.length / cols);
  const out = document.createElement('canvas'); out.width = cols * cw; out.height = rows * ch;
  const g = out.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, out.width, out.height);
  cells.forEach(([t, c], i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; if (c) g.drawImage(c, x, y, cw, ch); label(g, x, y, t); });
  return out;
}
function presetState(rig, p, I) {
  if (p === 'rest') return { ...rig.base };
  if (p.startsWith('stage:')) { const st = RIG.STAGES[p.slice(6)]; rig.setEmotion(st.mix, st.intensity, { instant: true, quiet: true, extra: st.extra }); return { ...rig.target }; }
  rig.setEmotion(p, I, { instant: true, quiet: true });
  return { ...rig.target };
}

// mean luminance difference in the face rect, approved art vs drawn face, at rest
function jumpOf(rig) {
  const restP = { ...rig.base };
  const a = snap({ skin: renderAt(rig, restP, { pristine: true, restMix: 1 }) });
  const b = snap({ skin: renderAt(rig, restP, { pristine: false, restMix: 0 }) });
  const fr = RIG.faceRectSrc(rig.mallow), q = rig.q;
  const x0 = Math.floor(fr[0] * q), y0 = Math.floor(fr[1] * q), w = Math.ceil((fr[2] - fr[0]) * q), h = Math.ceil((fr[3] - fr[1]) * q);
  const da = a.getContext('2d').getImageData(x0, y0, w, h).data, db = b.getContext('2d').getImageData(x0, y0, w, h).data;
  let s = 0, n = 0, big = 0;
  const diff = document.createElement('canvas'); diff.width = a.width; diff.height = a.height;
  const dg = diff.getContext('2d'); const dimg = dg.createImageData(w, h);
  for (let i = 0; i < da.length; i += 4) {
    if (da[i + 3] < 200) continue;
    const la = 0.299 * da[i] + 0.587 * da[i + 1] + 0.114 * da[i + 2];
    const lb = 0.299 * db[i] + 0.587 * db[i + 1] + 0.114 * db[i + 2];
    const d = Math.abs(la - lb); s += d; n++; if (d > 40) big++;
    dimg.data[i] = dimg.data[i + 1] = dimg.data[i + 2] = Math.min(255, d * 3); dimg.data[i + 3] = 255;
  }
  dg.fillStyle = '#000'; dg.fillRect(0, 0, diff.width, diff.height); dg.putImageData(dimg, x0, y0);
  return { a, b, diff, jump: { mean: +(s / n).toFixed(2), bigFrac: +(big / n).toFixed(4) }, rect: [x0, y0, w, h] };
}

async function skins() {
  const kind = Q.get('kind') || 'new';
  const rig = make(id, kind, holder(), { pristine: true, skinSize: SK, reducedMotion: true });
  await rig.loaded;
  freeze(rig, 1.234, +(Q.get('spin') ?? 0.7));
  const J = jumpOf(rig);
  const cells = [['REST approved', J.a], ['REST drawn', J.b], ['REST |diff| x3', J.diff]];
  for (const p of Object.keys(RIG.PRESETS)) cells.push([p, snap({ skin: renderAt(rig, presetState(rig, p, 1), { pristine: true, restMix: 0 }) })]);
  for (const p of ['happy', 'sad', 'angry', 'anxious', 'calm', 'surprised']) cells.push([p + ' .35', snap({ skin: renderAt(rig, presetState(rig, p, 0.35), { pristine: true, restMix: 0 }) })]);
  for (const bl of [0.5, 1]) {
    rig._blinkAmount = () => bl;
    cells.push(['blink ' + bl, snap({ skin: renderAt(rig, { ...rig.base }, { pristine: true, restMix: 0 }) })]);
  }
  rig._blinkAmount = () => 0;
  const out = sheet(cells, 300, +(Q.get('cols') || 6));
  // face crops at full skin resolution: rest approved | rest drawn | six presets
  const [x0, y0, w, h] = J.rect;
  const picks = [cells[0], cells[1], ...cells.filter(([t]) => ['happy', 'angry', 'sad', 'surprised', 'calm', 'excited'].includes(t))];
  const crop = document.createElement('canvas'); crop.width = w * 4; crop.height = h * 2;
  const cg = crop.getContext('2d'); cg.fillStyle = bg; cg.fillRect(0, 0, crop.width, crop.height);
  picks.forEach(([t, c], i) => { const x = (i % 4) * w, y = Math.floor(i / 4) * h; cg.drawImage(c, x0, y0, w, h, x, y, w, h); label(cg, x, y, t); });
  window.__out = out.toDataURL('image/png');
  window.__crop = crop.toDataURL('image/png');
  window.__jump = J.jump;
  window.__info = { kind, size: rig.mallow.size, res: rig.mallow.res || 1, q: rig.q, skin: [rig.skin.width, rig.skin.height], hires: !!rig.mallow.hires, patchedRig: RIG.patched };
}

async function pair() {
  const presets = (Q.get('presets') || 'rest,happy,excited,sad,angry,surprised').split(',');
  const I = +(Q.get('i') || 1);
  const cells = [];
  for (const kind of ['old', 'new']) {
    const rig = make(id, kind, holder(), { pristine: true, skinSize: SK, reducedMotion: true });
    await rig.loaded;
    freeze(rig, +(Q.get('t') || 1.234), +(Q.get('spin') ?? 0.7));
    for (const p of presets) cells.push([`${kind} ${p}`, snap({ skin: renderAt(rig, presetState(rig, p, I), { pristine: p === 'rest', restMix: p === 'rest' ? 1 : 0 }) })]);
  }
  window.__out = sheet(cells, +(Q.get('cw') || 320), presets.length).toDataURL('image/png');
}

async function spin() {
  const kind = Q.get('kind') || 'new';
  const angles = (Q.get('angles') || '0,1.6,3.2').split(',').map(Number);
  const rig = make(id, kind, holder(), { pristine: false, skinSize: SK, reducedMotion: true });
  await rig.loaded;
  freeze(rig);
  const st = presetState(rig, Q.get('preset') || 'happy', +(Q.get('i') || 1));
  const f = rig.mallow.face, q = rig.q;
  const cells = [];
  for (const a of angles) {
    rig.spinAngle = a;
    const sk = renderAt(rig, st, { pristine: false, restMix: 0 });
    for (const s of ['L', 'R']) {
      const e = f.eyes[s], R = Math.max(e.rx, e.ry) * 1.25;
      const c = document.createElement('canvas'); c.width = c.height = Math.round(2 * R * q);
      c.getContext('2d').drawImage(sk, (e.x - R) * q, (e.y - R) * q, 2 * R * q, 2 * R * q, 0, 0, c.width, c.height);
      cells.push([`${s} spin ${a}`, c]);
    }
  }
  window.__out = sheet(cells, +(Q.get('cw') || 300), cells.length).toDataURL('image/png');
}

// every reachable face state worth checking for containment
function states(rig, mid) {
  const out = [];
  for (const p of Object.keys(RIG.PRESETS)) for (const I of [0.7, 1]) out.push([`${p}@${I}`, presetState(rig, p, I)]);
  for (const s of Object.keys(RIG.STAGES)) out.push([`stage:${s}`, presetState(rig, 'stage:' + s, 1)]);
  const table = { ...REACTIONS._shared, ...(REACTIONS[mid] || {}) };
  for (const base of ['neutral', 'happy', 'excited', 'playful']) {
    const b = presetState(rig, base, 1);
    for (const [k, r] of Object.entries(table)) {
      const g = { ...b };
      for (const [kk, v] of Object.entries(r.params || r)) if (kk in g) g[kk] = v;
      out.push([`${k}/${base}`, g]);
    }
    out.push([`yawn-cycle/${base}`, { ...b, mouthRound: 1, mouthOpen: 1.15, mouthSmile: 0 }]);
  }
  return out;
}

async function overflow() {
  const kind = Q.get('kind') || 'new';
  const ids = (Q.get('ids') || MALLOW_IDS.join(',')).split(',');
  const res = {};
  for (const mid of ids) {
    const rig = make(mid, kind, holder(), { pristine: false, skinSize: 400, reducedMotion: true });
    await rig.loaded;
    freeze(rig);
    const W = rig.skin.width, Hh = rig.skin.height;
    const bc = document.createElement('canvas'); bc.width = W; bc.height = Hh;
    const g2 = bc.getContext('2d'); g2.drawImage(rig.assets.body, 0, 0, W, Hh);
    const ba = g2.getImageData(0, 0, W, Hh).data;
    const flagged = [];
    let worst = 0;
    for (const [name, P0] of states(rig, mid)) {
      for (const os of [1, 1.07]) {
        const P = { ...P0, mouthOpen: P0.mouthOpen * os, eyeOpen: P0.eyeOpen * os, glitch: 0.3, tears: 0, sweat: 0 };
        renderAt(rig, P, { pristine: false, restMix: 0 });
        const d = rig.sctx.getImageData(0, 0, W, Hh).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > ba[i + 3] + 40) n++;
        worst = Math.max(worst, n);
        if (n > 30) flagged.push([name + (os > 1 ? '+overshoot' : ''), n]);
      }
    }
    res[mid] = { kind, hires: !!rig.mallow.hires, worstPx: worst, flagged };
  }
  window.__overflow = res;
}

// live rigs (the real ticking renderer, strip-warp body) at several sizes:
// screenshot the page (run.cjs page ...)
async function live() {
  const kind = Q.get('kind') || 'new';
  const sizes = (Q.get('sizes') || '110,220,380').split(',').map(Number);
  const presets = (Q.get('presets') || 'neutral,happy,excited,sad').split(',');
  document.body.style.margin = '0';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:8px';
  document.body.appendChild(wrap);
  const rigs = [];
  for (const s of sizes) {
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px';
    wrap.appendChild(row);
    for (const p of presets) {
      const c = document.createElement('div');
      c.style.cssText = `width:${s}px;height:${s}px;position:relative;background:rgba(255,255,255,.03);border-radius:10px`;
      row.appendChild(c);
      rigs.push([make(id, kind, c, { reducedMotion: Q.get('rm') === '1' }), p]);
    }
  }
  await Promise.all(rigs.map(([r]) => r.loaded));
  for (const [r, p] of rigs) if (RIG.STAGES[p]) r.setStage(p); else r.setEmotion(p, +(Q.get('i') || 0.85));
  await new Promise((res) => setTimeout(res, +(Q.get('wait') || 2500)));
}

async function jump() {
  const kind = Q.get('kind') || 'new';
  const out = {};
  for (const mid of MALLOW_IDS) {
    const rig = make(mid, kind, holder(), { pristine: true, skinSize: SK, reducedMotion: true });
    await rig.loaded;
    freeze(rig, 1.234, 0);            // the painted phase: what the art shows
    out[mid] = jumpOf(rig).jump;
    if (mid === 'zuzu') { rig.spinAngle = 0.7; out.zuzuSpin07 = jumpOf(rig).jump; }
  }
  window.__jumps = out;
}

(async () => {
  RIG = await loadRig();
  ({ MALLOWS, SPRITES, MALLOW_IDS } = RIG.registry);
  H = await import(tableUrl);
  await ({ skins, pair, spin, overflow, jump, live })[mode]();
})().catch((e) => { window.__err = String(e && e.stack || e); }).finally(() => { window.__ready = true; });
