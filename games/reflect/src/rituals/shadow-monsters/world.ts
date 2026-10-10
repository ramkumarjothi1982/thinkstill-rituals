/* Shadow Monsters — the attic theatre and its light.
 * A lamp sits low on a table and shines at a bedsheet. Objects on puppet sticks between them cast shadows that obey
 * real optics: a point P throws its shadow to L + (P − L)·s with s = (Zsheet − Lz)/(Pz − Lz), so the closer an object
 * is to the lamp, the bigger (and softer) its shadow. Pulling the lamp back drives s towards 1: the monster shrinks to
 * the size of what it really is.
 * Views: backstage (behind the lamp, building and the lights-up reveal) and audience (in front of the glowing sheet). */
import { Projector, V3, lookAt, glowSprite, grainTile } from '../../gfx/projector';
import { OBJECTS, ObjId, objSprite } from './objects';

/** The theatre is a tabletop one: everything but the objects themselves is scaled by K, so the props stay big on a
 * phone while the optics (magnification = sheet distance / object distance) are unchanged. */
export const K = 0.6;
export const ZS = 2.0 * K;                              // the sheet plane
export const LAMP: V3 = [0, 0.06, 0];                   // bulb centre (the lamp sits low on the table)
export const SHEET = { x0: -1.3 * K, x1: 1.3 * K, y0: -0.05 * K, y1: 1.6 * K };
export const TABLE = { x: 0.95 * K, z0: -0.25 * K, z1: 1.92 * K };
export const Z_MIN = 0.16, Z_MAX = 1.78 * K;
const BULB_R = 0.0025;                                  // bulb radius → penumbra

export interface Placed { o: ObjId; x: number; z: number; r: number; dy?: number; }   // dy: animation only (the parade)
export interface Light {
  lampZ: number;      // 0 at rest; negative = pulled back
  lamp: number;       // lamp intensity 0..1
  house: number;      // room lights 0..1
  flicker?: number;   // 0..1 Glitch fiddling with the lamp
  dup?: number;       // 0..1 Glitch's double-shadow gag
  t: number;
}

export const clampZ = (z: number) => Math.max(Z_MIN, Math.min(Z_MAX, z));
/** Objects must stay inside the lamp's beam to throw a shadow on the sheet. */
export const clampX = (x: number, z: number) => { const m = 0.06 * K + z * 0.56; return Math.max(-m, Math.min(m, x)); };
export const scaleAt = (z: number, lampZ: number) => (ZS - lampZ) / Math.max(0.03, z - lampZ);
/** Height of the tallest shadow part, in metres on the sheet. */
export function monsterSize(objs: Placed[], lampZ = 0): number { let m = 0; for (const p of objs) m = Math.max(m, OBJECTS[p.o].h * scaleAt(p.z, lampZ)); return m; }
/** How much bigger than life it gets at the lamp. */
export function magnification(objs: Placed[]): number { let m = 1; for (const p of objs) m = Math.max(m, scaleAt(p.z, 0)); return m; }

/* ============ the sheet: light minus shadows ============ */
let tmp: HTMLCanvasElement | null = null, lightC: HTMLCanvasElement | null = null;
const canFilter = (() => { try { const c = document.createElement('canvas').getContext('2d') as any; return c && typeof c.filter === 'string'; } catch (e) { return false; } })();

/** Paint the sheet as seen from the audience (mirror) or from backstage into `out` (sized by the caller). */
export function paintSheet(out: HTMLCanvasElement, objs: Placed[], L: Light, mirror: boolean) {
  const W = out.width, H = out.height, k = W / (SHEET.x1 - SHEET.x0);
  if (!tmp) tmp = document.createElement('canvas');
  if (!lightC) lightC = document.createElement('canvas');
  if (tmp.width !== W || tmp.height !== H) { tmp.width = W; tmp.height = H; }
  if (lightC.width !== W || lightC.height !== H) { lightC.width = W; lightC.height = H; }
  const g = out.getContext('2d')!, lg = lightC.getContext('2d')!, tg = tmp.getContext('2d')!;
  const sx = (x: number) => (mirror ? SHEET.x1 - x : x - SHEET.x0) * k, sy = (y: number) => (SHEET.y1 - y) * k;
  // base: the fabric in the room's own light
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  const hb = L.house;
  g.fillStyle = `rgb(${Math.round(36 + 196 * hb)},${Math.round(30 + 186 * hb)},${Math.round(52 + 160 * hb)})`;
  g.fillRect(0, 0, W, H);
  // the lamp's light on the sheet (inverse-square-ish falloff from the beam axis)
  lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.filter = 'none'; lg.clearRect(0, 0, W, H);
  const fl = L.flicker ? 1 - L.flicker * (0.35 + 0.35 * Math.sin(L.t * 47) * Math.sin(L.t * 13)) : 1;
  const I = Math.max(0, L.lamp * fl);
  if (I > 0.01) {
    const back = -L.lampZ, spread = 1 + back * 0.35 / K;
    const cx = sx(LAMP[0]), cy = sy(LAMP[1] + 0.25 * K), R = k * 2.3 * K * spread;
    const gr = lg.createRadialGradient(cx, cy, 0, cx, cy, R);
    const a = I * Math.min(1, 1.15 / Math.sqrt(spread));
    gr.addColorStop(0, `rgba(255,236,190,${a})`); gr.addColorStop(0.35, `rgba(255,214,150,${a * 0.92})`); gr.addColorStop(0.75, `rgba(240,160,90,${a * 0.55})`); gr.addColorStop(1, `rgba(200,110,60,${a * 0.18})`);
    lg.fillStyle = gr; lg.fillRect(0, 0, W, H);
    // cut every object's shadow out of the light
    const dupN = L.dup && L.dup > 0.02 ? 2 : 1;
    for (const p of objs) {
      const d = OBJECTS[p.o];
      const s = scaleAt(p.z, L.lampZ);
      const cyW = d.stick + (p.dy || 0);
      const X = sx(LAMP[0] + (p.x - LAMP[0]) * s), Y = sy(LAMP[1] + (cyW - LAMP[1]) * s);
      const px = d.h * s * k;
      if (px < 0.5) continue;
      const blur = Math.min(40, Math.max(0, BULB_R * (ZS - p.z) / Math.max(0.03, p.z - L.lampZ) * k * (1 + back * 0.05)));
      for (let dI = 0; dI < dupN; dI++) {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H);
        const off = dI ? (L.dup || 0) * k * 0.18 * K : 0;
        tg.translate(X + off, Y - off * 0.3); tg.scale(mirror ? -1 : 1, 1); tg.rotate(p.r * Math.PI / 4); tg.scale(px, px);
        tg.fillStyle = '#000'; tg.strokeStyle = '#000';
        d.sil(tg);
        // the puppet stick (straight down from the object to the table)
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over';
        const yTop = sy(LAMP[1] + (cyW - d.h * 0.42 - LAMP[1]) * s), yBot = sy(LAMP[1] + (0 - LAMP[1]) * s);
        tg.fillStyle = '#000'; tg.fillRect(X + off - Math.max(1, 0.006 * s * k) / 2, yTop, Math.max(1, 0.006 * s * k), Math.max(0, yBot - yTop));
        lg.save(); lg.globalCompositeOperation = 'destination-out';
        if (canFilter && blur > 0.6) lg.filter = `blur(${blur.toFixed(1)}px)`;
        lg.globalAlpha = dI ? 0.55 * (L.dup || 0) : 1;
        lg.drawImage(tmp, 0, 0);
        lg.restore();
      }
    }
  }
  g.drawImage(lightC, 0, 0);
  // fabric: soft vertical folds and a darker hem
  g.globalCompositeOperation = 'multiply';
  const folds = g.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 12; i++) folds.addColorStop(i / 12, i % 2 ? 'rgba(235,225,215,1)' : 'rgba(255,255,255,1)');
  g.fillStyle = folds; g.fillRect(0, 0, W, H);
  const hem = g.createLinearGradient(0, H * 0.88, 0, H); hem.addColorStop(0, 'rgba(255,255,255,1)'); hem.addColorStop(1, 'rgba(190,170,160,1)');
  g.fillStyle = hem; g.fillRect(0, H * 0.88, W, H * 0.12);
  g.globalCompositeOperation = 'source-over';
}

/* ============ cameras ============ */
export function backstageCam(_aspect: number, lampBack = 0) {
  const pull = Math.min(1, lampBack / 6);
  return lookAt([0, (0.92 + pull * 0.1) * K, (-0.78 - pull * 0.5) * K], [0, 0.42 * K, 1.5 * K], 0.8);
}

/* ============ backstage: the table, the lamp, the sheet, the sticks ============ */
export interface Billboard { d: number; draw: (g: CanvasRenderingContext2D) => void; }
export interface BackstageFrame {
  objs: Placed[]; light: Light; sel?: number; held?: number;
  dispRot?: number[];               // displayed rotation (animated) per object
  hop?: number[];                   // per-object pop/hop offset (m)
  extra?: (P: Projector) => Billboard[];   // Bubbles and props placed in the world
  sheetCanvas: HTMLCanvasElement;
  chain?: number;                   // pull-chain extension 0..1
  proj?: Projector;                 // each view keeps its own projector (pointer picking uses it)
  zoom?: number; focus?: V3; focusY?: number;   // a closer shot around a point (the hook, the lights-up reveal)
}

const SHARED = new Projector();

/** Frame the backstage camera so the whole sheet and the lamp fit, whatever the screen shape. */
export function fitBackstage(P: Projector, W: number, H: number, lampBack = 0) {
  const cam = backstageCam(W / H, lampBack);
  P.set(cam, W, H, 1000, W / 2, H / 2);
  const a = (x: number, y: number, z: number) => { const c = P.toCam(x, y, z); return [c[0] / c[2], c[1] / c[2]]; };
  const top = a(0, SHEET.y1 + 0.1 * K, ZS)[1], bot = a(0, -0.03, -0.16 * K)[1];
  const side = Math.max(Math.abs(a(SHEET.x1 + 0.06 * K, SHEET.y0, ZS)[0]), Math.abs(a(SHEET.x1 + 0.06 * K, SHEET.y1, ZS)[0]));
  const fv = (H * 0.94) / (top - bot), fh = (W * 0.98) / (2 * side);
  const f = Math.min(fv, fh);
  const oy = H / 2 + ((top + bot) / 2) * f + (fh < fv ? H * 0.02 : 0);
  P.set(cam, W, H, f, W / 2, oy);
  return P;
}

export function renderBackstage(g: CanvasRenderingContext2D, W: number, H: number, f: BackstageFrame) {
  const L = f.light;
  const P = fitBackstage(f.proj || SHARED, W, H, -L.lampZ);
  if (f.zoom && f.zoom !== 1) {
    const fc = f.focus || [0, 0.1 * K, 0.45 * K];
    const c = P.toCam(fc[0], fc[1], fc[2]), f2 = P.f * f.zoom;
    P.set(P.cam, W, H, f2, W / 2 - (c[0] * f2) / c[2], H * (f.focusY ?? 0.55) + (c[1] * f2) / c[2]);
  }
  const house = L.house, lamp = L.lamp;
  // room: dark attic boards, a round moonlit window, rafters
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix('#140f22', '#6b4f3e', house)); bg.addColorStop(1, mix('#0b0816', '#4a3426', house));
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = 0.18 + house * 0.2; g.strokeStyle = mix('#2a1f38', '#3a2a20', house); g.lineWidth = Math.max(1, W / 300);
  for (let i = -8; i <= 8; i++) { const a = P.project(i * 0.42 * K, 2.6 * K, 3.4 * K), b = P.project(i * 0.42 * K, -0.9 * K, 3.4 * K); if (a && b) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
  g.restore();
  // round window, top left of the sheet, moonlight
  const win = P.project(-1.85 * K, 1.75 * K, 3.3 * K);
  if (win) {
    const r = win.s * 0.42 * K;
    g.save(); g.fillStyle = mix('#1d2a4a', '#9fc4e8', house * 0.6); g.beginPath(); g.arc(win.x, win.y, r, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'lighter'; g.drawImage(glowSprite('rgba(170,200,255,1)'), win.x - r * 2, win.y - r * 2, r * 4, r * 4); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#f4f1dc'; g.beginPath(); g.arc(win.x + r * 0.25, win.y - r * 0.2, r * 0.28, 0, Math.PI * 2); g.fill();
    g.strokeStyle = mix('#3a2a40', '#5c4030', house); g.lineWidth = r * 0.12; g.beginPath(); g.arc(win.x, win.y, r, 0, Math.PI * 2); g.moveTo(win.x - r, win.y); g.lineTo(win.x + r, win.y); g.moveTo(win.x, win.y - r); g.lineTo(win.x, win.y + r); g.stroke();
    g.restore();
  }
  // the sheet on its rod
  const tl = P.project(SHEET.x0, SHEET.y1, ZS), tr = P.project(SHEET.x1, SHEET.y1, ZS), bl = P.project(SHEET.x0, SHEET.y0, ZS);
  if (tl && tr && bl) {
    g.save();
    g.setTransform((tr.x - tl.x) / f.sheetCanvas.width, (tr.y - tl.y) / f.sheetCanvas.width, (bl.x - tl.x) / f.sheetCanvas.height, (bl.y - tl.y) / f.sheetCanvas.height, tl.x, tl.y);
    g.drawImage(f.sheetCanvas, 0, 0);
    g.restore();
    const rodL = P.project(SHEET.x0 - 0.12 * K, SHEET.y1 + 0.03 * K, ZS), rodR = P.project(SHEET.x1 + 0.12 * K, SHEET.y1 + 0.03 * K, ZS);
    if (rodL && rodR) { g.strokeStyle = mix('#3b2a1f', '#8a6040', house); g.lineWidth = Math.max(2, rodL.s * 0.035 * K); g.lineCap = 'round'; g.beginPath(); g.moveTo(rodL.x, rodL.y); g.lineTo(rodR.x, rodR.y); g.stroke(); }
  }
  // the table top (wood), a cloth runner where the lamp sits
  const quad = (pts: V3[], fill: string | CanvasGradient) => { const q = pts.map(p => P.project(p[0], p[1], p[2])); if (q.some(x => !x)) return; g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p!.x, p!.y) : g.moveTo(p!.x, p!.y)); g.closePath(); g.fillStyle = fill; g.fill(); };
  const near = P.project(0, 0, TABLE.z0), far = P.project(0, 0, TABLE.z1);
  const tg = g.createLinearGradient(0, near ? near.y : H, 0, far ? far.y : 0);
  tg.addColorStop(0, mix('#3a2418', '#9a6a44', house)); tg.addColorStop(1, mix('#1a110c', '#6e4a30', house));
  quad([[-TABLE.x, 0, TABLE.z0], [TABLE.x, 0, TABLE.z0], [TABLE.x, 0, TABLE.z1], [-TABLE.x, 0, TABLE.z1]], tg);
  g.save(); g.strokeStyle = `rgba(0,0,0,${0.18 - house * 0.06})`; g.lineWidth = 1;
  for (let i = -6; i <= 6; i++) { const a = P.project(i * 0.15 * K, 0.001, TABLE.z0), b = P.project(i * 0.15 * K, 0.001, TABLE.z1); if (a && b) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
  g.restore();
  // the beam on the table: a warm wedge from the lamp towards the sheet
  if (lamp > 0.01) {
    const lz = L.lampZ, wedge: V3[] = [[-0.05 * K, 0.002, lz + 0.05 * K], [0.05 * K, 0.002, lz + 0.05 * K], [1.12 * K, 0.002, TABLE.z1], [-1.12 * K, 0.002, TABLE.z1]];
    const q = wedge.map(p => P.project(p[0], p[1], Math.max(TABLE.z0, p[2])));
    if (q.every(Boolean)) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const a = q[0]!, c = q[2]!;
      const gr = g.createLinearGradient(a.x, a.y, a.x, c.y); gr.addColorStop(0, `rgba(255,200,120,${0.35 * lamp})`); gr.addColorStop(1, `rgba(255,170,90,${0.04 * lamp})`);
      g.fillStyle = gr; g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p!.x, p!.y) : g.moveTo(p!.x, p!.y)); g.closePath(); g.fill();
      g.restore();
    }
  }
  // world things in depth order: objects on sticks, Bubbles, the lamp
  const items: Billboard[] = [];
  f.objs.forEach((p, i) => {
    const d = OBJECTS[p.o];
    const hop = (f.hop && f.hop[i]) || 0;
    const c = P.project(p.x, d.stick + hop, p.z), base = P.project(p.x, 0, p.z);
    if (!c || !base) return;
    const px = d.h * c.s;
    const rot = (f.dispRot && f.dispRot[i] != null ? f.dispRot[i] : p.r) * Math.PI / 4;
    items.push({ d: c.d, draw: (gg) => {
      // stick
      gg.strokeStyle = mix('#5b3b22', '#c08a52', 0.4 + house * 0.6); gg.lineWidth = Math.max(1.5, 0.009 * c.s); gg.lineCap = 'round';
      gg.beginPath(); gg.moveTo(base.x, base.y); gg.lineTo(c.x, c.y + px * 0.2); gg.stroke();
      gg.fillStyle = 'rgba(0,0,0,0.35)'; gg.beginPath(); gg.ellipse(base.x, base.y, Math.max(2, 0.03 * c.s), Math.max(1, 0.01 * c.s), 0, 0, Math.PI * 2); gg.fill();
      // object, lit from the lamp side
      const spr = objSprite(p.o, px > 90 ? 256 : 128);
      const sc = px / (spr.height * 0.86);
      gg.save(); gg.translate(c.x, c.y); gg.rotate(rot);
      if (f.sel === i || f.held === i) { gg.shadowColor = f.held === i ? 'rgba(255,220,140,0.95)' : 'rgba(255,220,140,0.7)'; gg.shadowBlur = Math.max(8, px * 0.18); }
      gg.drawImage(spr, -spr.width * sc / 2, -spr.height * sc / 2, spr.width * sc, spr.height * sc);
      gg.restore();
    } });
  });
  if (f.extra) items.push(...f.extra(P));
  // the lamp itself (we see the back of its shade; the bulb glows round the rim)
  const lp = P.project(LAMP[0], 0, L.lampZ - 0.02), bulb = P.project(LAMP[0], LAMP[1], L.lampZ);
  if (lp && bulb) items.push({ d: lp.d - 0.02, draw: (gg) => drawLamp(gg, lp, bulb, lamp, house, f.chain || 0) });
  items.sort((a, b) => b.d - a.d).forEach(it => it.draw(g));
  // volumetric beam + dust from the bulb to the sheet
  if (lamp > 0.01 && bulb && tl && tr) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(bulb.x, bulb.y, (tl.x + tr.x) / 2, tl.y);
    gr.addColorStop(0, `rgba(255,220,160,${0.16 * lamp})`); gr.addColorStop(1, 'rgba(255,220,160,0)');
    const b1 = P.project(SHEET.x0 * 0.85, SHEET.y1 * 0.9, ZS), b2 = P.project(SHEET.x1 * 0.85, SHEET.y1 * 0.9, ZS), b3 = P.project(SHEET.x1 * 0.85, 0.02, ZS), b4 = P.project(SHEET.x0 * 0.85, 0.02, ZS);
    if (b1 && b2 && b3 && b4) { g.fillStyle = gr; g.beginPath(); g.moveTo(bulb.x, bulb.y); g.lineTo(b1.x, b1.y); g.lineTo(b2.x, b2.y); g.closePath(); g.fill(); }
    for (let i = 0; i < 40; i++) {
      const u = hash(i * 3.1), v = hash(i * 7.7), w = (hash(i * 1.3) + L.t * 0.02 * (0.5 + hash(i))) % 1;
      const z = L.lampZ + 0.2 * K + w * (ZS - 0.3 * K - L.lampZ), x = (u - 0.5) * z * 0.9, y = LAMP[1] + v * z * 0.75;
      const q = P.project(x, y, z); if (!q) continue;
      g.fillStyle = `rgba(255,230,190,${0.35 * lamp * (1 - w)})`; g.fillRect(q.x, q.y, Math.max(1, q.s * 0.004), Math.max(1, q.s * 0.004));
    }
    g.restore();
  }
  // vignette + grain
  const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.55 - house * 0.3})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  grain(g, W, H, L.t);
}

function drawLamp(g: CanvasRenderingContext2D, base: { x: number; y: number; s: number }, bulb: { x: number; y: number; s: number }, lamp: number, house: number, chain: number) {
  const s = base.s;
  // glow spilling round the shade
  if (lamp > 0.01) { g.save(); g.globalCompositeOperation = 'lighter'; const r = s * 0.5; g.globalAlpha = lamp; g.drawImage(glowSprite('rgba(255,200,120,1)'), bulb.x - r, bulb.y - r, r * 2, r * 2); g.restore(); }
  // base plate + arm + the back of the shade (a brass cone seen from behind)
  g.fillStyle = mix('#3a2a1a', '#a0783c', 0.35 + house * 0.5);
  g.beginPath(); g.ellipse(base.x, base.y, s * 0.11, s * 0.035, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = mix('#2a1d12', '#7a5a2c', 0.4 + house * 0.5); g.lineWidth = Math.max(2, s * 0.018); g.lineCap = 'round';
  g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(bulb.x, bulb.y + s * 0.02); g.stroke();
  const shR = s * 0.055;
  const sg = g.createRadialGradient(bulb.x - shR * 0.3, bulb.y - shR * 0.3, shR * 0.1, bulb.x, bulb.y, shR);
  sg.addColorStop(0, mix('#6a4a1e', '#e0b060', 0.3 + house * 0.6)); sg.addColorStop(1, mix('#24180c', '#7a5420', 0.3 + house * 0.5));
  g.fillStyle = sg; g.beginPath(); g.arc(bulb.x, bulb.y, shR, 0, Math.PI * 2); g.fill();
  g.strokeStyle = `rgba(255,214,140,${0.5 * lamp + 0.15})`; g.lineWidth = Math.max(1.5, s * 0.01); g.beginPath(); g.arc(bulb.x, bulb.y, shR * 1.02, 0, Math.PI * 2); g.stroke();
  // the pull chain (hold-to-dim pulls it down)
  const cx = bulb.x + shR * 0.55, cy0 = bulb.y + shR * 0.6, len = s * (0.1 + chain * 0.07);
  g.fillStyle = mix('#8a6a3a', '#e8c070', 0.6);
  for (let k = 0; k < len; k += Math.max(2, s * 0.012)) { g.beginPath(); g.arc(cx, cy0 + k, Math.max(0.8, s * 0.004), 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.arc(cx, cy0 + len + s * 0.008, Math.max(2, s * 0.01), 0, Math.PI * 2); g.fill();
}

/* ============ audience: the glowing sheet in a little proscenium ============ */
export interface AudienceFrame { sheetCanvas: HTMLCanvasElement; house: number; t: number; curtain?: number; zoom?: number; shake?: number; }
/** Returns the sheet's screen rectangle so the scene can place the audience row and overlays. */
export function renderAudience(g: CanvasRenderingContext2D, W: number, H: number, f: AudienceFrame) {
  const house = f.house;
  g.fillStyle = mix('#07050d', '#3a2430', house); g.fillRect(0, 0, W, H);
  const port = W / H < 0.8;
  const zoom = f.zoom || 1;
  const aspect = (SHEET.x1 - SHEET.x0) / (SHEET.y1 - SHEET.y0);
  let sw = Math.min(W * (port ? 0.98 : 0.8), H * (port ? 0.62 : 0.7) * aspect) * zoom;
  let sh = sw / aspect;
  const cx = W / 2 + (f.shake ? (Math.random() - 0.5) * f.shake * 8 : 0), top = H * (port ? 0.1 : 0.07) - (zoom - 1) * sh * 0.2;
  const x0 = cx - sw / 2;
  // glow of the sheet on the room
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5;
  g.drawImage(glowSprite('rgba(255,190,120,1)'), cx - sw, top - sh * 0.4, sw * 2, sh * 1.9);
  g.restore();
  g.drawImage(f.sheetCanvas, x0, top, sw, sh);
  // proscenium: velvet curtains and a valance
  const cur = f.curtain ?? 0;
  const velvet = (x: number, w: number, flip: boolean) => {
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, i % 2 ? mix('#3b0a17', '#8f1d33', 0.4 + house * 0.4) : mix('#22050c', '#5c1020', 0.4 + house * 0.4));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.quadraticCurveTo(x + w * (flip ? 0.2 : 0.8), H * 0.5, x + w, H); g.lineTo(x, H); g.closePath(); g.fill();
  };
  const cw = Math.max(W * 0.06, (W - sw) / 2 + sw * 0.04) + cur * sw * 0.5;
  velvet(-2, cw, false); g.save(); g.translate(W, 0); g.scale(-1, 1); velvet(-2, cw, true); g.restore();
  const vh = Math.max(top * 0.9, H * 0.05);
  const vgr = g.createLinearGradient(0, 0, 0, vh); vgr.addColorStop(0, mix('#2a0610', '#7a1428', 0.5)); vgr.addColorStop(1, mix('#4a0c1a', '#a8233d', 0.5));
  g.fillStyle = vgr; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, vh * 0.7);
  for (let i = 10; i >= 0; i--) { const x = (i / 10) * W; g.quadraticCurveTo(x + W / 20, vh * 1.15, x, vh * 0.7); }
  g.closePath(); g.fill();
  g.strokeStyle = '#d9a441'; g.lineWidth = Math.max(1.5, W / 400); g.beginPath(); g.moveTo(0, vh * 0.3); g.lineTo(W, vh * 0.3); g.stroke();
  const vg = g.createRadialGradient(W / 2, top + sh / 2, Math.min(W, H) * 0.3, W / 2, top + sh / 2, Math.max(W, H) * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.6 - house * 0.3})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  grain(g, W, H, f.t);
  return { x: x0, y: top, w: sw, h: sh };
}

/** Map a point on the sheet (metres, audience-side mirror) to the rect returned by renderAudience. */
export function sheetToScreen(rect: { x: number; y: number; w: number; h: number }, x: number, y: number, mirror = true) {
  const u = mirror ? (SHEET.x1 - x) / (SHEET.x1 - SHEET.x0) : (x - SHEET.x0) / (SHEET.x1 - SHEET.x0);
  const v = (SHEET.y1 - y) / (SHEET.y1 - SHEET.y0);
  return { x: rect.x + u * rect.w, y: rect.y + v * rect.h };
}

/* ============ little helpers ============ */
export function mix(a: string, b: string, t: number): string {
  t = Math.max(0, Math.min(1, t));
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = ((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * t), gg = ((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t), bb = (pa & 255) + (((pb & 255) - (pa & 255)) * t);
  return `rgb(${r | 0},${gg | 0},${bb | 0})`;
}
export function hash(n: number) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function grain(g: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const gt = grainTile(); g.save(); g.globalAlpha = 0.4; const ox = (t * 977) % 128, oy = (t * 613) % 128;
  for (let y = -oy; y < H; y += 128) for (let x = -ox; x < W; x += 128) g.drawImage(gt, x, y);
  g.restore();
}
/** Size the offscreen sheet canvas for a target on-screen width (half resolution keeps the blur cheap). */
export function sheetCanvasFor(c: HTMLCanvasElement, screenW: number) {
  const w = Math.max(160, Math.min(900, Math.round(screenW * 0.6)));
  const h = Math.round(w * (SHEET.y1 - SHEET.y0) / (SHEET.x1 - SHEET.x0));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}
