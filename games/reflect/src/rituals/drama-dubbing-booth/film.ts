/* Drama Dubbing Booth — "The Gift", a 12-second silent short rendered live: a golden-hour park in parallax layers,
 * four shots with real cuts, Patch and Sync acting with their bodies while their faces and voices come from the dub.
 * Deterministic in t, so the studio preview, the premiere and the director's-cut grid all show the same frames. */
import { Cue, FILM_LEN, Who, lineById } from './content';

export type Faces = (slug: string, mood: string) => CanvasImageSource | null;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const hash = (n: number) => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };

/* ---------------- the performance: when each cue speaks and how long ---------------- */
export function cueText(c: Cue): string { return c.line === 'custom' ? (c.text || '') : (lineById(c.line)?.text || ''); }
export function syllables(text: string) { return Math.max(2, Math.round(text.replace(/[^a-z0-9]/gi, '').length / 3.1)); }
export function sylDur(c: Cue) { return 0.115 * (1 - 0.35 * c.pace) * (c.tone === 'sarcastic' ? 1.18 : c.tone === 'nervous' ? 0.82 : 1); }
export function cueDur(c: Cue) { return syllables(cueText(c)) * sylDur(c) + 0.25; }

export interface ActorState { face: string; talk: number; line: string | null; tone: string | null; }
export function castAt(cues: Cue[], t: number): Record<Who, ActorState> {
  const out: Record<Who, ActorState> = { patch: { face: 'neutral', talk: 0, line: null, tone: null }, sync: { face: 'neutral', talk: 0, line: null, tone: null } };
  for (const c of cues) {
    if (c.t > t) continue;
    const a = out[c.who];
    a.face = c.face;
    const d = cueDur(c);
    if (t <= c.t + d + 0.6) { a.line = cueText(c); a.tone = c.tone; }
    if (t <= c.t + d) { const k = (t - c.t) / sylDur(c); a.talk = Math.abs(Math.sin(k * Math.PI)) * (c.tone === 'deadpan' ? 0.5 : 1); }
    else if (a.line !== cueText(c)) a.talk = 0;
  }
  return out;
}

/* ---------------- the staging ---------------- */
const G = 0.43;                    // ground line (world units; frame is 1 wide, 0.5625 tall at zoom 1)
interface Shot { t0: number; t1: number; x0: number; x1: number; y: number; z0: number; z1: number; }
export const SHOTS: Shot[] = [
  { t0: 0, t1: 3, x0: 0.4, x1: 0.47, y: 0.29, z0: 1.0, z1: 1.06 },
  { t0: 3, t1: 6, x0: 0.51, x1: 0.52, y: 0.31, z0: 1.2, z1: 1.36 },
  { t0: 6, t1: 9, x0: 0.7, x1: 0.71, y: 0.335, z0: 2.1, z1: 2.2 },
  { t0: 9, t1: 12, x0: 0.5, x1: 0.44, y: 0.29, z0: 1.0, z1: 0.98 }
];
export function shotAt(t: number) { const s = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1]; const k = ease(seg(t, s.t0, s.t1)); return { x: lerp(s.x0, s.x1, k), y: s.y, z: lerp(s.z0, s.z1, k) }; }

export function stage(t: number) {
  // Patch walks in, holds out the box, watches, walks away
  let px = 0.38, pBob = 0, pLean = 0;
  if (t < 2.6) { px = lerp(-0.12, 0.38, ease(seg(t, 0, 2.6))); pBob = Math.abs(Math.sin(t * 9)) * 0.014 * (t < 2.4 ? 1 : 0.3); }
  else if (t >= 9.1) { px = lerp(0.38, -0.2, ease(seg(t, 9.1, 12))); pBob = Math.abs(Math.sin(t * 9)) * 0.014; }
  if (t >= 3.2 && t < 5.8) pLean = Math.sin(seg(t, 3.2, 5.8) * Math.PI) * 0.12;
  // Sync steps closer to take it
  const sx = t < 5.4 ? 0.66 : lerp(0.66, 0.6, ease(seg(t, 5.4, 6.0)));
  const sHop = t >= 6.55 && t < 7.0 ? Math.sin(seg(t, 6.55, 7.0) * Math.PI) * 0.03 : 0;
  // the box: carried → held out → handed over → opened
  let bx: number, by: number, bRot = 0;
  if (t < 3.2) { bx = px + 0.075; by = G - 0.055 - pBob; bRot = Math.sin(t * 9) * 0.06; }
  else if (t < 4.6) { const k = ease(seg(t, 3.2, 4.6)); bx = lerp(px + 0.075, 0.5, k); by = lerp(G - 0.055, G - 0.085, k); }
  else if (t < 5.6) { bx = 0.5 + Math.sin(t * 5) * 0.003; by = G - 0.085; }
  else if (t < 6.1) { const k = ease(seg(t, 5.6, 6.1)); bx = lerp(0.5, sx - 0.055, k); by = lerp(G - 0.085, G - 0.07, k); }
  else { bx = sx - 0.055; by = G - 0.07; }
  const lid = t >= 6.5 ? seg(t, 6.5, 7.3) : 0;
  const cactus = t >= 6.7 ? ease(seg(t, 6.7, 7.4)) : 0;
  const cactusHold = t >= 7.6 ? ease(seg(t, 7.6, 8.2)) : 0;
  return { px, pBob, pLean, sx, sHop, bx, by, bRot, lid, cactus, cactusHold, t };
}

/* ---------------- painting helpers ---------------- */
const cache = new Map<string, HTMLCanvasElement>();
function mk(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) { let c = cache.get(key); if (c) return c; c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); cache.set(key, c); return c; }
function tree(g: CanvasRenderingContext2D, x: number, y: number, s: number, hue: number, light: number) {
  g.fillStyle = `hsl(${hue - 10},30%,${18 + light * 6}%)`; g.fillRect(x - s * 0.06, y - s * 0.7, s * 0.12, s * 0.7);
  const blobs: [number, number, number][] = [[0, -0.95, 0.42], [-0.3, -0.75, 0.32], [0.32, -0.78, 0.34], [-0.1, -1.2, 0.3], [0.18, -1.1, 0.28]];
  for (const [bx, by, r] of blobs) {
    const gr = g.createRadialGradient(x + (bx + 0.12) * s, y + (by - 0.12) * s, r * s * 0.1, x + bx * s, y + by * s, r * s);
    gr.addColorStop(0, `hsl(${hue + 18},62%,${52 + light * 10}%)`); gr.addColorStop(0.7, `hsl(${hue},48%,${34 + light * 8}%)`); gr.addColorStop(1, `hsl(${hue - 6},45%,${26 + light * 6}%)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2); g.fill();
  }
  // golden rim from the low sun (right)
  g.strokeStyle = `rgba(255,214,140,${0.35 + light * 0.2})`; g.lineWidth = s * 0.03;
  g.beginPath(); g.arc(x + 0.32 * s, y - 0.78 * s, 0.34 * s, -0.9, 0.6); g.stroke();
  g.beginPath(); g.arc(x, y - 0.95 * s, 0.42 * s, -1.0, 0.2); g.stroke();
}
function giftBox(g: CanvasRenderingContext2D, s: number, lidOff: number, lidRot: number) {
  const w = s, hh = s * 0.8;
  const body = g.createLinearGradient(-w / 2, 0, w / 2, 0); body.addColorStop(0, '#d8344f'); body.addColorStop(0.55, '#ff5d73'); body.addColorStop(1, '#b8233c');
  g.fillStyle = body; g.fillRect(-w / 2, -hh, w, hh);
  g.fillStyle = '#ffd166'; g.fillRect(-w * 0.08, -hh, w * 0.16, hh);
  g.save(); g.translate(lidOff * w * 0.9, -hh - lidOff * hh * 2.2); g.rotate(lidRot);
  g.fillStyle = '#ff6b81'; g.fillRect(-w * 0.56, -hh * 0.22, w * 1.12, hh * 0.24);
  g.fillStyle = '#ffd166'; g.fillRect(-w * 0.08, -hh * 0.22, w * 0.16, hh * 0.24);
  g.beginPath(); g.ellipse(-w * 0.17, -hh * 0.3, w * 0.17, hh * 0.13, -0.5, 0, Math.PI * 2); g.ellipse(w * 0.17, -hh * 0.3, w * 0.17, hh * 0.13, 0.5, 0, Math.PI * 2); g.fill();
  g.restore();
}
function cactusArt(g: CanvasRenderingContext2D, s: number) {
  // terracotta pot + a round little cactus with a pink flower
  g.fillStyle = '#c96a3a'; g.beginPath(); g.moveTo(-s * 0.32, 0); g.lineTo(s * 0.32, 0); g.lineTo(s * 0.4, -s * 0.38); g.lineTo(-s * 0.4, -s * 0.38); g.closePath(); g.fill();
  g.fillStyle = '#e07e4a'; g.fillRect(-s * 0.44, -s * 0.46, s * 0.88, s * 0.1);
  const gr = g.createRadialGradient(-s * 0.1, -s * 0.85, s * 0.05, 0, -s * 0.72, s * 0.36); gr.addColorStop(0, '#9be36b'); gr.addColorStop(1, '#3f9a4a');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, -s * 0.74, s * 0.3, s * 0.34, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e8ffd8'; g.lineWidth = Math.max(1, s * 0.025);
  for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.95 + i * 0.24, x = Math.cos(a) * s * 0.3, y = -s * 0.74 + Math.sin(a) * s * 0.34; g.beginPath(); g.moveTo(x, y); g.lineTo(x * 1.22, y + (y + s * 0.74) * 0.22); g.stroke(); }
  g.fillStyle = '#ff7eb6'; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.ellipse(Math.cos(a) * s * 0.07, -s * 1.1 + Math.sin(a) * s * 0.05, s * 0.06, s * 0.035, a, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#ffd166'; g.beginPath(); g.arc(0, -s * 1.1, s * 0.035, 0, Math.PI * 2); g.fill();
}

/* ---------------- render one frame ---------------- */
export interface FilmOpts { faces: Faces; cues: Cue[]; subtitles?: boolean; grain?: boolean; frameNo?: number; names?: Partial<Record<Who, string>>; }
let grainC: HTMLCanvasElement | null = null;
function grainTile() { if (grainC) return grainC; grainC = document.createElement('canvas'); grainC.width = grainC.height = 128; const g = grainC.getContext('2d')!, d = g.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 15; } g.putImageData(d, 0, 0); return grainC; }

export function renderFilm(g: CanvasRenderingContext2D, W: number, H: number, t: number, o: FilmOpts) {
  t = clamp(t, 0, FILM_LEN - 0.001);
  const st = stage(t);
  const cam = shotAt(t);
  const fno = Math.floor(t * 24);
  const weave = o.grain === false ? 0 : (hash(fno * 3 + 1) - 0.5) * W * 0.003;
  const A = H / W;                                // frame height in world units at zoom 1
  g.save();
  g.translate(weave, (hash(fno * 7 + 2) - 0.5) * H * 0.003);
  // a parallax layer: world (x, y) → screen, for depth p (0 = sky, 1 = the action plane)
  const L = (p: number) => { const z = 1 + (cam.z - 1) * p; const s = W * z; const cx = lerp(0.5, cam.x, p), cy = lerp(0.28, cam.y, p); return { s, x: (x: number) => W / 2 + (x - cx) * s, y: (y: number) => H / 2 + (y - cy) * s }; };
  // sky
  const sk = g.createLinearGradient(0, 0, 0, H);
  sk.addColorStop(0, '#8aa0e6'); sk.addColorStop(0.42, '#f6b98f'); sk.addColorStop(0.7, '#ffd79a'); sk.addColorStop(1, '#ffe7b0');
  g.fillStyle = sk; g.fillRect(-W, -H, W * 3, H * 3);
  const sl = L(0.06);
  const sunX = sl.x(0.8), sunY = sl.y(0.27), sunR = sl.s * 0.05;
  const glow = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 9); glow.addColorStop(0, 'rgba(255,240,200,0.95)'); glow.addColorStop(0.12, 'rgba(255,214,150,0.6)'); glow.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = glow; g.fillRect(sunX - sunR * 9, sunY - sunR * 9, sunR * 18, sunR * 18);
  g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(sunX, sunY, sunR, 0, Math.PI * 2); g.fill();
  // clouds
  const cl = L(0.1);
  for (let i = 0; i < 5; i++) {
    const x = ((i * 0.27 + t * 0.004) % 1.4) - 0.2, y = 0.08 + (i % 3) * 0.045;
    g.fillStyle = 'rgba(255,224,214,0.55)';
    for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(cl.x(x + j * 0.03), cl.y(y + (j % 2) * 0.008), cl.s * (0.05 + j * 0.006), cl.s * 0.016, 0, 0, Math.PI * 2); g.fill(); }
  }
  // far hills
  for (const [p, col, base, amp, f] of [[0.18, '#b8a3da', 0.31, 0.04, 7], [0.26, '#9c87c9', 0.34, 0.035, 11]] as [number, string, number, number, number][]) {
    const l = L(p); g.fillStyle = col; g.beginPath(); g.moveTo(l.x(-1), l.y(0.6));
    for (let x = -1; x <= 2; x += 0.02) g.lineTo(l.x(x), l.y(base - Math.sin(x * f) * amp - Math.sin(x * f * 2.3 + 1) * amp * 0.4));
    g.lineTo(l.x(2), l.y(0.6)); g.closePath(); g.fill();
  }
  // lake with the sun's path on it
  const lk = L(0.32);
  const lg = g.createLinearGradient(0, lk.y(0.345), 0, lk.y(0.385)); lg.addColorStop(0, '#9fb7ea'); lg.addColorStop(1, '#f2c4a0');
  g.fillStyle = lg; g.fillRect(lk.x(-1), lk.y(0.345), lk.s * 3, lk.s * 0.04);
  g.fillStyle = 'rgba(255,240,200,0.75)';
  for (let i = 0; i < 14; i++) { const yy = 0.35 + i * 0.0026, ww = 0.012 + 0.03 * hash(i * 13 + Math.floor(t * 6)); g.fillRect(lk.x(0.8 - ww / 2 + Math.sin(t * 2 + i) * 0.004), lk.y(yy), lk.s * ww, Math.max(1, lk.s * 0.0012)); }
  // mid trees
  const tr = L(0.55);
  [[-0.05, 0.395, 0.17, 105], [0.12, 0.39, 0.13, 115], [0.88, 0.392, 0.15, 98], [1.05, 0.39, 0.18, 110], [0.3, 0.385, 0.09, 120]].forEach(([x, y, s, hue], i) => tree(g, tr.x(x), tr.y(y), tr.s * s, hue, i % 2));
  // ground: grass and the path
  const gl = L(1);
  const gg = g.createLinearGradient(0, gl.y(0.38), 0, gl.y(0.6)); gg.addColorStop(0, '#a8d46e'); gg.addColorStop(1, '#5f9e45');
  g.fillStyle = gg; g.fillRect(gl.x(-1), gl.y(0.385), gl.s * 3, gl.s * 0.5);
  g.fillStyle = '#e9cf9a'; g.beginPath(); g.moveTo(gl.x(-1), gl.y(0.445)); g.bezierCurveTo(gl.x(0.2), gl.y(0.43), gl.x(0.6), gl.y(0.452), gl.x(2), gl.y(0.44)); g.lineTo(gl.x(2), gl.y(0.47)); g.bezierCurveTo(gl.x(0.6), gl.y(0.48), gl.x(0.2), gl.y(0.46), gl.x(-1), gl.y(0.475)); g.closePath(); g.fill();
  // lamp post + bench
  g.fillStyle = '#3b3346'; g.fillRect(gl.x(0.16) - gl.s * 0.004, gl.y(0.25), gl.s * 0.008, gl.s * 0.19);
  g.fillStyle = '#fff1c4'; g.beginPath(); g.arc(gl.x(0.16), gl.y(0.25), gl.s * 0.012, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7a4b33'; for (let i = 0; i < 3; i++) g.fillRect(gl.x(0.74), gl.y(0.395 + i * 0.008), gl.s * 0.13, gl.s * 0.005);
  g.fillStyle = '#3b3346'; g.fillRect(gl.x(0.745), gl.y(0.4), gl.s * 0.004, gl.s * 0.035); g.fillRect(gl.x(0.865), gl.y(0.4), gl.s * 0.004, gl.s * 0.035);
  // the actors
  const cast = castAt(o.cues, t);
  const bubble = (slug: Who, x: number, bob: number, lean: number, hop: number) => {
    const a = cast[slug], hgt = 0.15;
    const talk = a.talk;
    const sx = 1 + talk * 0.06 - bob * 2, sy = 1 - talk * 0.05 + bob * 2.5;
    const shx = gl.x(x), shy = gl.y(G);
    g.fillStyle = 'rgba(40,30,20,0.28)'; g.beginPath(); g.ellipse(shx, shy, gl.s * hgt * 0.36, gl.s * hgt * 0.07, 0, 0, Math.PI * 2); g.fill();
    const img = o.faces(slug, a.face);
    const size = gl.s * hgt;
    g.save(); g.translate(shx, shy - gl.s * (bob + hop)); g.rotate(lean); g.scale(sx, sy);
    // warm rim light from the sun
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.28;
    const rim = g.createRadialGradient(size * 0.25, -size * 0.65, 0, size * 0.25, -size * 0.65, size * 0.7); rim.addColorStop(0, 'rgba(255,214,150,1)'); rim.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = rim; g.fillRect(-size, -size * 1.4, size * 2, size * 1.6);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    if (img) g.drawImage(img, -size / 2, -size, size, size); else { g.fillStyle = slug === 'patch' ? '#ff9f43' : '#5aaaff'; g.beginPath(); g.arc(0, -size / 2, size * 0.45, 0, Math.PI * 2); g.fill(); }
    g.restore();
  };
  bubble('sync', st.sx, 0, 0, st.sHop);
  // the box and the cactus (between the two)
  const bs = gl.s * 0.055;
  g.save(); g.translate(gl.x(st.bx), gl.y(st.by + 0.05)); g.rotate(st.bRot);
  if (st.cactus > 0) { g.save(); const cs = bs * 0.75 * (0.6 + 0.4 * st.cactus); g.translate(lerp(0, gl.s * 0.012, st.cactusHold), -bs * 0.55 * st.cactus + lerp(0, gl.s * 0.012, st.cactusHold)); cactusArt(g, cs); g.restore(); }
  if (st.cactusHold < 1) { g.globalAlpha = 1 - st.cactusHold * 0.0; giftBox(g, bs, st.lid, st.lid * 2.4); }
  g.restore();
  if (st.cactus > 0 && st.cactus < 1) { for (let i = 0; i < 8; i++) { const a = i * 0.8 + t * 3, r = gl.s * 0.05 * st.cactus; g.fillStyle = `rgba(255,236,170,${1 - st.cactus})`; g.beginPath(); g.arc(gl.x(st.bx) + Math.cos(a) * r, gl.y(st.by) - bs + Math.sin(a) * r, gl.s * 0.004, 0, Math.PI * 2); g.fill(); } }
  bubble('patch', st.px, st.pBob, st.pLean, 0);
  // foreground grass and falling leaves
  const fg = L(1.25);
  g.fillStyle = '#4c8a3a';
  for (let i = 0; i < 70; i++) { const x = -0.2 + i * 0.02, h = 0.03 + 0.03 * hash(i), sway = Math.sin(t * 2 + i) * 0.006; g.beginPath(); g.moveTo(fg.x(x), fg.y(0.6)); g.quadraticCurveTo(fg.x(x + sway), fg.y(0.6 - h * 0.6), fg.x(x + sway * 2 + 0.004), fg.y(0.6 - h)); g.lineTo(fg.x(x + 0.008), fg.y(0.6)); g.fill(); }
  for (let i = 0; i < 7; i++) { const k = ((t * 0.08 + i * 0.137) % 1), x = 0.1 + i * 0.13 + Math.sin(t + i) * 0.02, y = -0.05 + k * 0.6; const lf = L(1.1); g.save(); g.translate(lf.x(x), lf.y(y)); g.rotate(t * 2 + i); g.fillStyle = i % 2 ? '#f4a259' : '#e76f51'; g.beginPath(); g.ellipse(0, 0, lf.s * 0.006, lf.s * 0.003, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.restore();
  // film character: warm grade, vignette, flicker, grain, dust
  const flick = 0.03 * (hash(fno * 11) - 0.5);
  g.fillStyle = `rgba(255,190,120,${0.05 + flick})`; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72); vg.addColorStop(0, 'rgba(30,15,5,0)'); vg.addColorStop(1, 'rgba(30,15,5,0.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  if (o.grain !== false) {
    const gt = grainTile(); const ox = (fno * 37) % 128, oy = (fno * 71) % 128;
    for (let y = -oy; y < H; y += 128) for (let x = -ox; x < W; x += 128) g.drawImage(gt, x, y);
    if (hash(fno * 5) > 0.82) { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; const x = hash(fno) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 3, H); g.stroke(); }
  }
  // subtitles
  if (o.subtitles !== false) {
    const lines: { who: Who; text: string }[] = [];
    (['patch', 'sync'] as Who[]).forEach(w => { if (cast[w].line) lines.push({ who: w, text: cast[w].line! }); });
    const fs = Math.max(11, Math.min(26, W * 0.04));
    g.font = `700 ${fs}px 'Courier Prime', 'Courier New', ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'bottom';
    lines.forEach((ln, i) => {
      const y = H - fs * 0.6 - (lines.length - 1 - i) * fs * 1.25;
      const txt = (o.names && o.names[ln.who] ? o.names[ln.who] + ': ' : '') + ln.text;
      g.lineWidth = Math.max(2, fs * 0.22); g.strokeStyle = 'rgba(10,6,2,0.9)'; g.strokeText(txt, W / 2, y);
      g.fillStyle = ln.who === 'patch' ? '#ffd9a8' : '#cfe6ff'; g.fillText(txt, W / 2, y);
    });
  }
}

/** A small "who speaks when" strip for the reveal / poster (beats and cue ticks). */
export function beatOf(t: number) { return t < 3 ? 0 : t < 6 ? 1 : t < 9 ? 2 : 3; }
