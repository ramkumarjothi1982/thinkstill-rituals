// The Spark Festival — Pipzi's realm.
// A warm night fair on rolling plum hills.  Festoon strings of paper lanterns
// and glass bulbs sway between two tall poles, a Ferris wheel turns slowly on
// the far hill, a striped big top and a little carousel glow from inside,
// paper sky-lanterns drift upward and soft round fireworks bloom far away.
// Pipzi stands on a round wooden dais ringed with bulbs.
//
// Agitation swings the lanterns, fizzes the sparks and swirls the confetti;
// heaviness leaves lanterns unlit and drains the colour from an emptied fair;
// clarity clears the haze and brings out the stars; warmth gilds everything.
// The ritual transform lights every lantern one by one, sends the sky
// lanterns up together and crowns the sky with one slow golden bloom.
//
// Photosensitivity: no full-screen flashes, every firework rises over
// ≥0.45 s and fades over seconds, sky glow from a bloom stays local and dim;
// reduced motion drops fireworks entirely (a static glinting crown instead).

import {
  clamp, lerp, smoothstep, rng, TAU, vgrad, rgba, glowSprite, glintSprite, blit, softBlob,
  Pool, Rings, flashEnv, stageFade, makeCanvas, sceneLayer, drawLayer, billowCloud, mixHex,
} from '../util.js';

const C = {
  deep: '#0b0213', sky: '#1c0627', plum: '#34093f', berry: '#5a1150', magenta: '#8c1f5c', rose: '#c2416a', ember: '#ff8a5a',
  gold: '#ffcf4a', lantern: '#ff8a3d', red: '#f2073b', pink: '#ff5a9a', cream: '#fff1d6', violet: '#a77bff', mint: '#8ff0d2',
};
// lantern hues (index into sprite arrays)
const HUES = ['#ff8a3d', '#ffcf4a', '#f2073b', '#ff5a9a', '#ffa860'];
// firework sprite colours
const FWC = ['#ffd45e', '#ff6aa6', '#ff8a5a', '#ff2f5c', '#fff1d6', '#b68cff', '#8ff0d2'];
const FW_PAIRS = [[0, 1], [2, 0], [1, 4], [3, 0], [5, 1], [6, 4], [0, 4], [1, 2]];
const CONF = ['#ffcf4a', '#ff5a9a', '#ff8a3d', '#f2073b', '#fff1d6', '#a77bff', '#8ff0d2'];
const BUNT_LIT = ['#ffcf4a', '#f2073b', '#ff8a3d', '#ff5a9a', '#fff1d6'];
const BUNT_DARK = ['#5a3a34', '#4a1028', '#5a2a2a', '#4a1a3a', '#4a3a40'];

const NC = 110;   // confetti slots
const NSKY = 24;  // sky lantern slots
const NFW = 5;    // firework slots
const FWN = 72;   // max particles per shell

export default function create({ ctx }) {
  let L = {};
  let S = {};
  let grads = {};
  let lanterns = [], strings = [], daisBulbs = [], lamps = [], stars = [];
  let wheel = { cx: 0, cy: 0, R: 0 };
  const R = rng(5150);
  const fizz = new Pool(120);
  const sparks = new Pool(170);
  const rings = new Rings(14);

  // confetti (typed arrays — no allocation per frame)
  const cf = {
    on: new Uint8Array(NC), x: new Float32Array(NC), y: new Float32Array(NC), vx: new Float32Array(NC), vy: new Float32Array(NC),
    rot: new Float32Array(NC), spin: new Float32Array(NC), fl: new Float32Array(NC), fls: new Float32Array(NC),
    w: new Float32Array(NC), h: new Float32Array(NC), fall: new Float32Array(NC), age: new Float32Array(NC), c: new Uint8Array(NC), ph: new Float32Array(NC), bz: new Uint8Array(NC),
  };
  const lifts = [];
  for (let i = 0; i < NSKY; i++) lifts.push({ on: false, x: 0, y: 0, z: 0, vy: 0, ph: 0, size: 0, age: 0, wob: 0 });
  const fw = [];
  for (let i = 0; i < NFW; i++) fw.push({ on: false, x0: 0, y0: 0, x: 0, y: 0, R: 0, c1: 0, c2: 1, age: 0, rise: 1, ttl: 3, n: 0, big: false, a: 1, ang: new Float32Array(FWN), spd: new Float32Array(FWN) });
  const glows = [];
  for (let i = 0; i < 5; i++) glows.push({ on: false, x: 0, y: 0, r: 0, age: 0, ttl: 2, a: 0, c: 0 });

  let swayPh = 0, wheelRot = 0, fwTimer = 2.5, crownTimer = 0, prevP = -1, clearBoost = 0;
  let litAvg = 0.7, festLit = 0.7, fizzAcc = 0, confAcc = 0, skyAcc = 0, rippleAge = 9, rippleX = 0;

  // ------------------------------------------------------------- sprites --
  function globeSprite(hue, lit) {
    const k = 2, c = makeCanvas(40 * k, 52 * k), g = c.getContext('2d');
    g.scale(k, k);
    const dark = mixHex(hue, '#4a0618', 0.5), light = mixHex(hue, '#fff3d0', 0.55);
    g.strokeStyle = '#1a0614'; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 0); g.lineTo(20, 8); g.stroke();
    // globe
    const gr = g.createRadialGradient(20, 27, 0.5, 20, 25, 16);
    if (lit) { gr.addColorStop(0, '#fff8e2'); gr.addColorStop(0.3, light); gr.addColorStop(0.72, hue); gr.addColorStop(1, dark); }
    else { gr.addColorStop(0, mixHex(hue, '#2a0a26', 0.72)); gr.addColorStop(1, mixHex(hue, '#10031a', 0.86)); }
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(20, 25, 15, 14.5, 0, 0, TAU); g.fill();
    // paper ribs
    g.strokeStyle = lit ? rgba(dark, 0.42) : 'rgba(0,0,0,0.32)'; g.lineWidth = 0.7;
    for (let i = -2; i <= 2; i++) {
      const y = 25 + i * 5.2, w = Math.sqrt(Math.max(0, 1 - (i * 5.2 / 14.5) ** 2)) * 15;
      g.beginPath(); g.ellipse(20, y, w, 1.6, 0, 0.05, Math.PI - 0.05); g.stroke();
    }
    g.beginPath(); g.ellipse(20, 25, 5.5, 14.5, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.beginPath(); g.ellipse(20, 25, 5.5, 14.5, 0, Math.PI / 2, Math.PI * 1.5); g.stroke();
    // sheen
    g.fillStyle = lit ? 'rgba(255,255,240,0.35)' : 'rgba(255,170,200,0.08)';
    g.beginPath(); g.ellipse(14, 18, 3.4, 5.5, 0.5, 0, TAU); g.fill();
    if (!lit) { g.strokeStyle = 'rgba(255,140,170,0.18)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(20, 25, 14.5, 14, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke(); }
    // caps + tassel
    g.fillStyle = lit ? '#3a1410' : '#1a0614';
    g.fillRect(15, 8, 10, 3.2); g.fillRect(16, 38.8, 8, 2.6);
    g.fillStyle = lit ? 'rgba(255,214,140,0.8)' : 'rgba(120,70,80,0.4)';
    g.fillRect(15, 8, 10, 0.8); g.fillRect(16, 38.8, 8, 0.7);
    g.strokeStyle = lit ? light : '#3a1430'; g.lineWidth = 0.9; g.lineCap = 'round';
    g.beginPath();
    for (const dx of [-1.6, 0, 1.6]) { g.moveTo(20, 41.4); g.lineTo(20 + dx, 50); }
    g.stroke();
    return c;
  }
  function bulbSprite(hue, lit) {
    const k = 2.5, c = makeCanvas(10 * k, 14 * k), g = c.getContext('2d');
    g.scale(k, k);
    g.strokeStyle = '#1a0614'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(5, 0); g.lineTo(5, 3.5); g.stroke();
    g.fillStyle = '#1e0816'; g.fillRect(3.6, 3, 2.8, 2.6);
    const gr = g.createRadialGradient(5, 8.6, 0.2, 5, 8.6, 3.4);
    if (lit) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, mixHex(hue, '#fff6d8', 0.6)); gr.addColorStop(1, hue); }
    else { gr.addColorStop(0, '#4a2440'); gr.addColorStop(1, '#22091e'); }
    g.fillStyle = gr; g.beginPath(); g.arc(5, 8.6, 3.2, 0, TAU); g.fill();
    g.fillStyle = lit ? 'rgba(255,255,255,0.6)' : 'rgba(255,200,230,0.18)';
    g.beginPath(); g.ellipse(4, 7.6, 0.9, 1.3, 0.4, 0, TAU); g.fill();
    return c;
  }
  function skyLanternSprite() {
    const k = 3, c = makeCanvas(20 * k, 28 * k), g = c.getContext('2d');
    g.scale(k, k);
    g.beginPath();
    g.moveTo(3, 4); g.quadraticCurveTo(10, -0.5, 17, 4); g.lineTo(15.2, 24); g.lineTo(4.8, 24); g.closePath();
    const gr = g.createLinearGradient(0, 1, 0, 24);
    gr.addColorStop(0, '#d8402e'); gr.addColorStop(0.45, '#ff8a3d'); gr.addColorStop(0.85, '#ffd27a'); gr.addColorStop(1, '#fff0c0');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    const ig = g.createRadialGradient(10, 23, 0, 10, 20, 12);
    ig.addColorStop(0, 'rgba(255,250,220,0.9)'); ig.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = ig; g.fillRect(0, 0, 20, 28);
    g.strokeStyle = 'rgba(150,40,30,0.35)'; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(8, 2); g.lineTo(8.6, 24); g.moveTo(12, 2); g.lineTo(11.4, 24); g.stroke();
    g.fillStyle = 'rgba(255,255,240,0.25)'; g.fillRect(4, 3, 2.2, 21);
    g.restore();
    g.fillStyle = '#6a2418'; g.fillRect(4.6, 23.6, 10.8, 1.4);
    g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(10, 25.8, 1.4, 1.8, 0, 0, TAU); g.fill();
    return c;
  }
  function gondolaSprite(lit) {
    const k = 2.5, c = makeCanvas(12 * k, 14 * k), g = c.getContext('2d');
    g.scale(k, k);
    g.strokeStyle = '#1a0618'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(6, 0); g.lineTo(6, 4); g.stroke();
    g.fillStyle = lit ? '#e3264a' : '#2a0a2a';
    g.beginPath(); g.moveTo(1.5, 5); g.quadraticCurveTo(6, 2.4, 10.5, 5); g.lineTo(10.5, 6); g.lineTo(1.5, 6); g.closePath(); g.fill();
    g.fillStyle = lit ? '#ffd27a' : '#1e0822'; g.fillRect(2.5, 6, 7, 3.4);
    g.fillStyle = lit ? '#7a1a3a' : '#22091f';
    g.beginPath(); g.moveTo(1.5, 9.2); g.lineTo(10.5, 9.2); g.quadraticCurveTo(10, 12.5, 6, 12.6); g.quadraticCurveTo(2, 12.5, 1.5, 9.2); g.fill();
    return c;
  }
  function wheelSprite(Rw, dpr, neon) {
    const half = Rw + 6, c = makeCanvas(half * 2 * dpr, half * 2 * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(half, half);
    g.lineCap = 'round';
    if (!neon) {
      g.strokeStyle = '#2a0c34'; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 0, Rw, 0, TAU); g.stroke();
      g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, Rw * 0.88, 0, TAU); g.stroke();
      g.lineWidth = 0.9;
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); g.lineTo(Math.cos(a) * Rw, Math.sin(a) * Rw); }
      for (let i = 0; i < 32; i++) {
        const a0 = (i / 32) * TAU, a1 = ((i + 1) / 32) * TAU, r0 = i % 2 ? Rw : Rw * 0.88, r1 = i % 2 ? Rw * 0.88 : Rw;
        g.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); g.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
      }
      g.stroke();
      g.lineWidth = 1; g.beginPath(); g.arc(0, 0, Rw * 0.42, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,120,170,0.16)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, Rw + 1.2, 0, TAU); g.stroke();
    } else {
      g.strokeStyle = 'rgba(255,110,170,0.85)'; g.lineWidth = 1.1; g.beginPath(); g.arc(0, 0, Rw, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,110,170,0.22)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, Rw, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,207,110,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, Rw * 0.88, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,207,110,0.2)'; g.lineWidth = 0.7;
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); g.lineTo(Math.cos(a) * Rw * 0.88, Math.sin(a) * Rw * 0.88); }
      g.stroke();
      g.strokeStyle = 'rgba(255,150,200,0.45)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, Rw * 0.42, 0, TAU); g.stroke();
    }
    c.cssW = half * 2;
    return c;
  }

  // ------------------------------------------------------- scene helpers --
  function stripedRoof(g, cx, peakY, eaveY, hw, n, colA, colB, curve = 0.3) {
    g.save();
    g.beginPath();
    g.moveTo(cx - hw, eaveY);
    g.quadraticCurveTo(cx - hw * curve, eaveY - (eaveY - peakY) * 0.28, cx, peakY);
    g.quadraticCurveTo(cx + hw * curve, eaveY - (eaveY - peakY) * 0.28, cx + hw, eaveY);
    g.closePath();
    g.clip();
    for (let k = 0; k < n; k++) {
      const x0 = cx - hw * 1.2 + (2.4 * hw * k) / n, x1 = cx - hw * 1.2 + (2.4 * hw * (k + 1)) / n;
      g.fillStyle = k % 2 ? colB : colA;
      g.beginPath(); g.moveTo(cx, peakY - 2); g.lineTo(x0, eaveY + 4); g.lineTo(x1, eaveY + 4); g.closePath(); g.fill();
    }
    const sh = g.createLinearGradient(cx - hw, 0, cx + hw, 0);
    sh.addColorStop(0, 'rgba(20,0,20,0.5)'); sh.addColorStop(0.35, 'rgba(20,0,20,0)'); sh.addColorStop(0.7, 'rgba(20,0,20,0.05)'); sh.addColorStop(1, 'rgba(20,0,20,0.55)');
    g.fillStyle = sh; g.fillRect(cx - hw, peakY - 4, hw * 2, eaveY - peakY + 8);
    g.fillStyle = vgrad(g, peakY, eaveY, [[0, 'rgba(30,0,30,0.45)'], [1, 'rgba(30,0,30,0)']]);
    g.fillRect(cx - hw, peakY - 4, hw * 2, eaveY - peakY + 8);
    g.restore();
  }
  function scallops(g, x0, x1, y, n, r, cols) {
    const w = (x1 - x0) / n;
    for (let k = 0; k < n; k++) {
      g.fillStyle = cols[k % cols.length];
      g.beginPath(); g.moveTo(x0 + k * w, y); g.arc(x0 + k * w + w / 2, y, w / 2, 0, Math.PI); g.closePath(); g.fill();
    }
  }
  function bunting(g, x0, y0, x1, y1, sag, n, cols, lit) {
    g.strokeStyle = lit ? 'rgba(255,220,180,0.45)' : 'rgba(40,10,40,0.9)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); g.stroke();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + 4 * u * (1 - u) * sag;
      const u2 = (i + 0.95) / n, xx = lerp(x0, x1, u2), yy = lerp(y0, y1, u2) + 4 * u2 * (1 - u2) * sag;
      g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.moveTo(x - (xx - x) * 0.45, y - (yy - y) * 0.45); g.lineTo(xx, yy); g.lineTo((x + xx) / 2 - (xx - x) * 0.25, (y + yy) / 2 + 7); g.closePath(); g.fill();
    }
  }
  function lightDot(g, x, y, r, col, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 3);
    gr.addColorStop(0, rgba('#fffaf0', a)); gr.addColorStop(0.25, rgba(col, a * 0.8)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }

  function paintMid(g, st, lit) {
    const { W, H, M } = st;
    const u = unit(st);
    // mid hill under the tents
    const hillY = (x) => H * (0.712 + 0.01 * Math.sin(x * 0.009 + 0.6)) + (Math.abs(x / W - 0.5) < 0.3 ? H * 0.012 : 0) * Math.cos((x / W - 0.5) * 5.2);
    g.fillStyle = vgrad(g, H * 0.69, H * 0.8, [[0, lit ? '#3a1040' : '#2a0a32'], [1, '#170520']]);
    g.beginPath(); g.moveTo(-M, H * 0.8);
    for (let x = -M; x <= W + M; x += 8) g.lineTo(x, hillY(x));
    g.lineTo(W + M, H * 0.8); g.closePath(); g.fill();
    g.strokeStyle = lit ? 'rgba(255,120,150,0.35)' : 'rgba(255,120,150,0.12)'; g.lineWidth = 1;
    g.beginPath(); for (let x = -M; x <= W + M; x += 8) (x === -M ? g.moveTo(x, hillY(x)) : g.lineTo(x, hillY(x))); g.stroke();

    const span = Math.min(W / 2 - Math.max(10, W * 0.04), u * 1.15);
    const topX = Math.min(W - u * 0.115, W / 2 + span + u * 0.05);
    // ---- big top (right); a smaller one joins it on wide screens
    const bigTop = (cx, sc, base, flagLine) => {
      const hw = u * 0.165 * sc, eave = base - u * 0.1 * sc, peak = base - u * 0.34 * sc;
      if (lit) softBlob(g, cx, base - u * 0.1 * sc, u * 0.3 * sc, '#ff7a4a', 0.32, 1, 0.75);
      // wall
      g.save();
      g.beginPath(); g.rect(cx - hw * 0.94, eave, hw * 1.88, base - eave); g.clip();
      for (let k = 0; k < 14; k++) {
        g.fillStyle = k % 2 ? (lit ? '#ffe0c0' : '#33122e') : (lit ? '#d81f45' : '#4a0e2c');
        g.fillRect(cx - hw * 0.94 + (hw * 1.88 * k) / 14, eave, hw * 1.88 / 14 + 0.5, base - eave);
      }
      g.fillStyle = lit ? 'rgba(40,0,20,0.3)' : 'rgba(10,0,10,0.35)'; g.fillRect(cx - hw, eave, hw * 2, 4);
      // door
      const dw = hw * 0.36, dTop = eave + (base - eave) * 0.12;
      const dg = g.createLinearGradient(0, dTop, 0, base);
      if (lit) { dg.addColorStop(0, '#ffe7a8'); dg.addColorStop(1, '#ff9a4a'); } else { dg.addColorStop(0, '#1e0618'); dg.addColorStop(1, '#12030f'); }
      g.fillStyle = dg;
      g.beginPath(); g.moveTo(cx - dw / 2, base); g.lineTo(cx - dw / 2, dTop + dw * 0.4); g.quadraticCurveTo(cx, dTop - dw * 0.2, cx + dw / 2, dTop + dw * 0.4); g.lineTo(cx + dw / 2, base); g.fill();
      if (lit) { g.fillStyle = 'rgba(90,20,40,0.55)'; g.beginPath(); g.ellipse(cx - dw * 0.08, base - 4, 2.2, 4, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx + dw * 0.18, base - 3.5, 1.8, 3.5, 0, 0, TAU); g.fill(); }
      g.restore();
      // roof
      stripedRoof(g, cx, peak, eave + 1, hw * 1.04, 12, lit ? '#e3264a' : '#4a0e2c', lit ? '#ffe2c4' : '#33122e', 0.32);
      scallops(g, cx - hw * 1.04, cx + hw * 1.04, eave, 12, 0, lit ? ['#ffe2c4', '#e3264a'] : ['#33122e', '#4a0e2c']);
      // flag
      g.strokeStyle = lit ? '#e8c890' : '#2a1020'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx, peak + 2); g.lineTo(cx, peak - 16); g.stroke();
      g.fillStyle = lit ? '#ffcf4a' : '#4a3020';
      g.beginPath(); g.moveTo(cx, peak - 16); g.quadraticCurveTo(cx + 7, peak - 15, cx + 12, peak - 11); g.quadraticCurveTo(cx + 6, peak - 11, cx, peak - 9); g.fill();
      if (lit) {
        for (let k = 0; k <= 12; k++) lightDot(g, cx - hw * 1.04 + (hw * 2.08 * k) / 12, eave + 0.5, 1, k % 2 ? '#ffcf4a' : '#ff5a9a', 0.85);
        lightDot(g, cx, peak - 1, 1.6, '#ffcf4a', 0.9);
      }
      if (flagLine) bunting(g, cx, peak - 1, W + M + 10, H * 0.6, 10, 7, lit ? BUNT_LIT : BUNT_DARK, lit);
    };
    if (W > u * 1.6) {
      bigTop(W / 2 + span * 0.62, 0.62, H * 0.716, false);
      bigTop(W / 2 - span * 0.42, 0.5, H * 0.714, false);
    }
    bigTop(topX, 1, H * 0.728, true);

    // ---- carousel (left)
    {
      const cx = Math.max(u * 0.055, W / 2 - span - u * 0.05), base = H * 0.733, hw = u * 0.14, eave = base - u * 0.155, peak = eave - u * 0.125;
      if (lit) softBlob(g, cx, base - u * 0.1, u * 0.26, '#ff9a4a', 0.32, 1, 0.8);
      // interior glow
      g.fillStyle = lit ? vgrad(g, eave, base, [[0, 'rgba(255,170,90,0.75)'], [1, 'rgba(255,110,90,0.4)']]) : 'rgba(26,6,30,0.9)';
      g.fillRect(cx - hw * 0.9, eave, hw * 1.8, base - eave);
      // horses + poles
      const nP = 5;
      for (let i = 0; i < nP; i++) {
        const px = cx - hw * 0.75 + (hw * 1.5 * i) / (nP - 1);
        g.strokeStyle = lit ? '#ffd88a' : '#2a0c2a'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(px, eave); g.lineTo(px, base - 2); g.stroke();
        const hy = eave + (base - eave) * (0.5 + 0.12 * Math.sin(i * 2.1));
        g.fillStyle = lit ? '#fff1e0' : '#1a0618';
        g.beginPath(); g.ellipse(px, hy, 7, 3.4, 0, 0, TAU); g.fill();
        const dir = i % 2 ? 1 : -1;
        g.beginPath(); g.moveTo(px + dir * 4, hy - 1); g.lineTo(px + dir * 8, hy - 7); g.lineTo(px + dir * 11, hy - 6); g.lineTo(px + dir * 7, hy + 0.5); g.fill();
        g.strokeStyle = lit ? '#fff1e0' : '#1a0618'; g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(px - 4, hy + 2); g.lineTo(px - 6, hy + 7); g.moveTo(px + 4, hy + 2); g.lineTo(px + 6, hy + 7); g.stroke();
        if (lit) { g.fillStyle = i % 2 ? '#ff5a9a' : '#ffcf4a'; g.fillRect(px - 2, hy - 3.6, 4, 2); }
      }
      // platform
      g.fillStyle = lit ? '#7a2a3a' : '#22081e';
      g.beginPath(); g.ellipse(cx, base, hw, 5, 0, 0, TAU); g.fill();
      g.fillStyle = lit ? '#c25a4a' : '#2e0c28'; g.fillRect(cx - hw, base - 1, hw * 2, 4);
      // valance band + roof
      g.fillStyle = lit ? '#ffe2c4' : '#33122e'; g.fillRect(cx - hw * 1.02, eave - 7, hw * 2.04, 7);
      stripedRoof(g, cx, peak, eave - 7, hw * 1.05, 10, lit ? '#e3264a' : '#4a0e2c', lit ? '#ffcf4a' : '#3a2028', 0.45);
      scallops(g, cx - hw * 1.02, cx + hw * 1.02, eave, 9, 0, lit ? ['#e3264a', '#ffcf4a'] : ['#4a0e2c', '#3a2028']);
      g.fillStyle = lit ? '#ffcf4a' : '#3a2a20';
      g.beginPath(); g.arc(cx, peak - 2, 2.6, 0, TAU); g.fill();
      if (lit) {
        for (let k = 0; k <= 9; k++) lightDot(g, cx - hw * 1.02 + (hw * 2.04 * k) / 9, eave - 3.5, 1, k % 2 ? '#fff1d6' : '#ffcf4a', 0.9);
        for (let k = 0; k <= 8; k++) lightDot(g, cx - hw + (hw * 2 * k) / 8, base + 1, 0.8, '#ffcf4a', 0.7);
      }
      bunting(g, cx, peak - 2, -M - 10, H * 0.62, 6, 4, lit ? BUNT_LIT : BUNT_DARK, lit);
      bunting(g, cx + hw * 0.9, eave - 6, cx + u * 0.215, H * 0.705, 6, 4, lit ? BUNT_LIT : BUNT_DARK, lit);
    }
    // a little booth by the big top (dark wood, lit hatch)
    {
      const bx = topX - u * 0.14, base = H * 0.725, bw = u * 0.06, bh = u * 0.065;
      g.fillStyle = lit ? '#4a1830' : '#1e0820'; g.fillRect(bx - bw / 2, base - bh, bw, bh);
      g.fillStyle = lit ? '#ffd27a' : '#14040f'; g.fillRect(bx - bw * 0.36, base - bh * 0.8, bw * 0.72, bh * 0.42);
      stripedRoof(g, bx, base - bh - 8, base - bh, bw * 0.62, 6, lit ? '#ff5a9a' : '#3a0e2e', lit ? '#fff1d6' : '#2a1028', 0.6);
    }
  }

  // ---------------------------------------------------------------- build --
  function unit(st) { return Math.min(st.W, st.H * 0.55); }

  function build(st) {
    const { W, H, M, dpr } = st;
    const u = unit(st);
    const gy = H * st.groundY, hy = H * 0.6;
    const r = rng(2024);

    // ------------------------------------------------------------- sky
    const skyBottom = H * 0.84;
    const sky = sceneLayer(st, -M, skyBottom);
    {
      const g = sky.g;
      const f = (y) => clamp((y + M) / (skyBottom + M));
      g.fillStyle = vgrad(g, -M, skyBottom, [
        [0, C.deep], [f(H * 0.14), C.sky], [f(H * 0.34), '#2c0838'], [f(H * 0.48), '#4a0f4a'],
        [f(H * 0.56), '#7a1a58'], [f(H * 0.61), '#b0365e'], [f(H * 0.65), '#d2566a'], [f(H * 0.72), '#5a1446'], [1, '#2a0a30'],
      ]);
      g.fillRect(-M, -M, W + 2 * M, skyBottom + M);
      softBlob(g, W * 0.08, H * 0.24, W * 0.7, '#3e1470', 0.32, 1, 0.9);
      softBlob(g, W * 0.95, H * 0.36, W * 0.55, '#7a1060', 0.22, 1, 0.9);
      softBlob(g, W * 0.5, H * 0.62, W * 0.95, '#ff4f7a', 0.3, 1.3, 0.3);
      softBlob(g, W * 0.5, H * 0.63, W * 0.55, '#ff9a5a', 0.28, 1.5, 0.22);
      // moon
      const mx = W * 0.8, my = H * 0.125, mr = clamp(u * 0.034, 10, 17);
      softBlob(g, mx, my, mr * 6, '#ffd9b8', 0.16);
      const mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
      mg.addColorStop(0, '#fff4dc'); mg.addColorStop(0.65, '#ffdcb0'); mg.addColorStop(1, '#ffc392');
      g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
      g.fillStyle = 'rgba(200,120,120,0.12)';
      for (const [dx, dy, s] of [[0.3, 0.1, 0.22], [-0.25, 0.35, 0.16], [0.05, -0.4, 0.13]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, s * mr, 0, TAU); g.fill(); }
      L.moon = { x: mx, y: my, r: mr };
    }
    // stars (alpha follows clarity)
    const starL = sceneLayer(st, -M, H * 0.6);
    {
      const g = starL.g;
      for (let i = 0; i < 200; i++) {
        const y = Math.pow(r(), 1.5) * H * 0.56, x = r() * W;
        const s = r() < 0.88 ? r.range(0.35, 0.8) : r.range(0.9, 1.4);
        g.globalAlpha = r.range(0.3, 0.9) * (1 - y / (H * 0.62));
        g.fillStyle = r() < 0.7 ? '#fff4f0' : r() < 0.5 ? '#ffd9a8' : '#ffb3d9';
        g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }
    stars = [];
    for (let i = 0; i < 14; i++) stars.push({ x: r.range(0.04, 0.96) * W, y: Math.pow(r(), 1.3) * H * 0.42, s: r.range(3, 6), ph: r() * TAU, w: r.range(0.3, 0.8) });

    // wisps lit from below by the fair (baked into the sky)
    {
      const wl = sceneLayer(st, -M, H * 0.45);
      const g = wl.g;
      const wisp = (cx, by, w, h) => {
        const b = [];
        const n = Math.max(6, Math.round(w / (h * 0.62)));
        for (let i = 0; i < n; i++) {
          const t = 0.04 + 0.92 * i / (n - 1), bell = Math.sin(t * Math.PI);
          const rr = h * (0.42 + 0.55 * bell) * r.range(0.85, 1.12);
          b.push([cx - w / 2 + t * w, by - rr * 0.55 - bell * h * 0.2, rr]);
        }
        for (let i = 0; i < Math.ceil(n * 0.5); i++) {
          const t = r.range(0.22, 0.78), bell = Math.sin(t * Math.PI);
          b.push([cx - w / 2 + t * w, by - h * (0.55 + 0.45 * bell), h * (0.35 + 0.45 * bell) * r.range(0.85, 1.1)]);
        }
        billowCloud(g, b, {
          top: '#2e0c3c', bottom: '#4e1652', y0: by - h * 1.5, y1: by + h * 0.2, rim: '#ff8aa6', rimA: 0.55, rimDy: -2.2,
          crown: '#6e2c78', crownA: 0.3, under: '#ff6a8a', underA: 0.25, shade: '#1a0628', shadeA: 0.25,
        });
      };
      const ch = Math.min(H * 0.034, u * 0.075);
      wisp(W * 0.14, H * 0.228, u * 0.44, ch);
      wisp(W * 0.88, H * 0.315, u * 0.38, ch * 0.82);
      wisp(W * 0.5, H * 0.085, u * 0.24, ch * 0.6);
      if (W > u * 1.6) { wisp(W * 0.36, H * 0.17, u * 0.32, ch * 0.7); wisp(W * 0.68, H * 0.24, u * 0.36, ch * 0.75); }
      sky.g.globalAlpha = 0.85;
      sky.g.drawImage(wl.c, wl.ox, wl.oy, wl.w, wl.h);
      sky.g.globalAlpha = 1;
    }

    // ------------------------------------------------------- far hills
    const far = sceneLayer(st, H * 0.5, H * 0.8);
    {
      const g = far.g;
      const hA = (x) => H * (0.598 + 0.012 * Math.sin(x * 0.011 + 1) + 0.005 * Math.sin(x * 0.027));
      const hB = (x) => H * (0.636 + 0.013 * Math.sin(x * 0.008 + 2.4) + 0.004 * Math.sin(x * 0.031 + 1));
      g.fillStyle = vgrad(g, H * 0.58, H * 0.68, [[0, '#5a1a5a'], [1, '#2e0c3a']]);
      g.beginPath(); g.moveTo(-M, H * 0.8); for (let x = -M; x <= W + M; x += 6) g.lineTo(x, hA(x)); g.lineTo(W + M, H * 0.8); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,140,160,0.35)'; g.lineWidth = 1;
      g.beginPath(); for (let x = -M; x <= W + M; x += 6) (x === -M ? g.moveTo(x, hA(x)) : g.lineTo(x, hA(x))); g.stroke();
      // distant tents + village lights on hill A
      for (const [tx, s] of [[0.42, 1], [0.56, 0.8], [0.64, 0.7]]) {
        const x = tx * W, b = hA(x) + 2, tw = 9 * s, th = 10 * s;
        g.fillStyle = '#3a1240'; g.beginPath(); g.moveTo(x - tw, b); g.lineTo(x, b - th); g.lineTo(x + tw, b); g.fill();
        g.fillStyle = 'rgba(255,190,120,0.55)'; g.fillRect(x - 1.2 * s, b - 4 * s, 2.4 * s, 4 * s);
      }
      for (let i = 0; i < 46; i++) {
        const x = r() * W, y = hA(x) + r.range(2, H * 0.03);
        lightDot(g, x, y, r.range(0.4, 0.9), r() < 0.6 ? '#ffcf7a' : '#ff7aa6', r.range(0.35, 0.8));
      }
      g.fillStyle = vgrad(g, H * 0.6, H * 0.7, [[0, '#3a1046'], [1, '#1e0628']]);
      g.beginPath(); g.moveTo(-M, H * 0.8); for (let x = -M; x <= W + M; x += 6) g.lineTo(x, hB(x)); g.lineTo(W + M, H * 0.8); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,140,160,0.2)';
      g.beginPath(); for (let x = -M; x <= W + M; x += 6) (x === -M ? g.moveTo(x, hB(x)) : g.lineTo(x, hB(x))); g.stroke();
      // horizon mist sitting in the valley
      g.fillStyle = vgrad(g, H * 0.6, H * 0.66, [[0, 'rgba(255,120,150,0)'], [0.5, 'rgba(255,120,150,0.14)'], [1, 'rgba(255,120,150,0)']]);
      g.fillRect(-M, H * 0.6, W + 2 * M, H * 0.06);
      L.hB = hB;
    }

    // ------------------------------------------------------ Ferris wheel
    {
      const Rw = Math.min(W * 0.19, H * 0.095);
      wheel = { cx: W * 0.2, cy: H * 0.636 - Rw - H * 0.045, R: Rw };
      const groundY = L.hB(wheel.cx) + 3;
      const front = sceneLayer(st, wheel.cy - 8, groundY + 6, wheel.cx - Rw * 0.7, wheel.cx + Rw * 0.7);
      const g = front.g;
      g.strokeStyle = '#1a0622'; g.lineCap = 'round';
      for (const s of [-1, 1]) {
        g.lineWidth = 2.6; g.beginPath(); g.moveTo(wheel.cx, wheel.cy); g.lineTo(wheel.cx + s * Rw * 0.48, groundY); g.stroke();
        g.lineWidth = 1; g.beginPath();
        for (let k = 1; k < 4; k++) { const t = k / 4; g.moveTo(wheel.cx + s * Rw * 0.48 * t, wheel.cy + (groundY - wheel.cy) * t); g.lineTo(wheel.cx + s * Rw * 0.48 * (t + 0.25), wheel.cy + (groundY - wheel.cy) * (t - 0.12)); }
        g.stroke();
      }
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(wheel.cx - Rw * 0.36, wheel.cy + (groundY - wheel.cy) * 0.75); g.lineTo(wheel.cx + Rw * 0.36, wheel.cy + (groundY - wheel.cy) * 0.75); g.stroke();
      g.fillStyle = '#2a0c30'; g.beginPath(); g.arc(wheel.cx, wheel.cy, 3.6, 0, TAU); g.fill();
      // ticket booth
      g.fillStyle = '#24081e'; g.fillRect(wheel.cx - 9, groundY - 9, 18, 9);
      g.fillStyle = 'rgba(255,200,120,0.8)'; g.fillRect(wheel.cx - 5, groundY - 7, 10, 3.5);
      g.fillStyle = '#e3264a'; g.beginPath(); g.moveTo(wheel.cx - 11, groundY - 9); g.lineTo(wheel.cx, groundY - 14); g.lineTo(wheel.cx + 11, groundY - 9); g.fill();
      L.wheelFront = front;
      S.wheel = wheelSprite(Rw, dpr, false);
      S.wheelNeon = wheelSprite(Rw, dpr, true);
    }

    // --------------------------------------------- mid: tents, carousel
    const midDark = sceneLayer(st, H * 0.5, H * 0.8);
    const midLit = sceneLayer(st, H * 0.5, H * 0.8);
    paintMid(midDark.g, st, false);
    paintMid(midLit.g, st, true);

    // ------------------------------------------------------------ ground
    const ground = sceneLayer(st, H * 0.72, H + M);
    const crest = (x) => H * (0.772 + 0.013 * Math.cos((x / W - 0.5) * TAU * 0.85)) + Math.sin(x * 0.021) * 2;
    const daisRx = Math.min(W * 0.34, u * 0.32), daisRy = clamp(daisRx * 0.2, 14, 30), daisY = gy + 2;
    {
      const g = ground.g;
      g.fillStyle = vgrad(g, H * 0.75, H + M, [[0, '#3e1446'], [0.18, '#2a0a32'], [0.6, '#1a0522'], [1, '#0e0216']]);
      g.beginPath(); g.moveTo(-M, H + M); for (let x = -M; x <= W + M; x += 6) g.lineTo(x, crest(x)); g.lineTo(W + M, H + M); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,140,160,0.4)'; g.lineWidth = 1.2;
      g.beginPath(); for (let x = -M; x <= W + M; x += 6) (x === -M ? g.moveTo(x, crest(x)) : g.lineTo(x, crest(x))); g.stroke();
      // warm pool of light around the stage
      softBlob(g, W * 0.5, gy, daisRx * 1.85, '#ff4f7a', 0.22, 1, 0.3);
      softBlob(g, W * 0.5, gy, daisRx * 1.35, '#ffa65a', 0.3, 1, 0.26);
      // grass silhouettes along the crest
      g.strokeStyle = '#1a0520'; g.lineWidth = 1;
      for (let i = 0; i < 160; i++) {
        const x = r.range(-M, W + M), y = crest(x) + r.range(1, 6), s = r.range(3, 7);
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - s * 0.3, y - s * 0.6, x - s * 0.5, y - s); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.2, y - s * 0.7, x + s * 0.4, y - s * 1.1); g.stroke();
      }
      // fallen confetti + tiny ground lights
      for (let i = 0; i < 90; i++) {
        const x = r.range(-M, W + M), y = r.range(crest(x) + 6, H * 0.995);
        const dx = (x - W / 2) / daisRx, dy = (y - daisY) / (daisRy * 1.8);
        if (dx * dx + dy * dy < 1.15) continue;
        g.save(); g.translate(x, y); g.rotate(r() * TAU); g.scale(1, r.range(0.3, 1));
        g.fillStyle = rgba(CONF[Math.floor(r() * CONF.length)], r.range(0.25, 0.55) * (0.5 + 0.5 * (y - H * 0.78) / (H * 0.22)));
        g.fillRect(-2, -1, 4, 2.2);
        g.restore();
      }
      for (let i = 0; i < 26; i++) {
        const x = r.range(0, W), y = r.range(crest(x) + 4, H * 0.97);
        const dx = (x - W / 2) / daisRx, dy = (y - daisY) / (daisRy * 1.8);
        if (dx * dx + dy * dy < 1.2) continue;
        lightDot(g, x, y, r.range(0.5, 1), r() < 0.6 ? '#ffcf7a' : '#ff7aa6', r.range(0.3, 0.7));
      }
      // the round wooden dais
      g.fillStyle = '#2a0c22';
      g.beginPath(); g.ellipse(W / 2, daisY + 8, daisRx, daisRy, 0, 0, TAU); g.fill();
      g.fillStyle = vgrad(g, daisY, daisY + daisRy + 8, [[0, '#6a2a36'], [1, '#3a1226']]);
      g.beginPath(); g.ellipse(W / 2, daisY + 4, daisRx, daisRy, 0, 0, Math.PI); g.lineTo(W / 2 - daisRx, daisY); g.ellipse(W / 2, daisY, daisRx, daisRy, 0, Math.PI, 0, true); g.closePath(); g.fill();
      const top = g.createRadialGradient(W / 2, daisY, 0, W / 2, daisY, daisRx);
      top.addColorStop(0, '#b0603e'); top.addColorStop(0.6, '#8a4038'); top.addColorStop(1, '#5e2232');
      g.fillStyle = top;
      g.beginPath(); g.ellipse(W / 2, daisY, daisRx, daisRy, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(60,15,30,0.35)'; g.lineWidth = 0.8;
      for (const k of [0.4, 0.7]) { g.beginPath(); g.ellipse(W / 2, daisY, daisRx * k, daisRy * k, 0, 0, TAU); g.stroke(); }
      g.strokeStyle = 'rgba(255,190,140,0.55)'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(W / 2, daisY, daisRx - 0.5, daisRy - 0.5, 0, 0.02, Math.PI - 0.02); g.stroke();
      softBlob(g, W / 2, daisY, daisRx * 0.55, '#3a0c24', 0.55, 1, 0.22);
      // short lamp posts
      lamps = [];
      for (const sx of [-1, 1]) {
        const x = W / 2 + sx * (daisRx + u * 0.07), b = H * 0.9, top2 = b - Math.min(H * 0.085, u * 0.19);
        g.fillStyle = '#12030f'; g.fillRect(x - 1.6, top2, 3.2, b - top2);
        g.fillStyle = 'rgba(255,150,170,0.25)'; g.fillRect(x + 0.6, top2, 1, b - top2);
        g.fillStyle = '#12030f'; g.beginPath(); g.ellipse(x, b, 6, 2, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x - 5, top2); g.lineTo(x + 5, top2); g.lineTo(x + 3, top2 - 9); g.lineTo(x - 3, top2 - 9); g.closePath(); g.fill();
        g.fillStyle = '#ffdc9a'; g.fillRect(x - 2.6, top2 - 7.5, 5.2, 6.5);
        g.fillStyle = '#12030f'; g.beginPath(); g.moveTo(x - 4.5, top2 - 9); g.lineTo(x, top2 - 13); g.lineTo(x + 4.5, top2 - 9); g.fill();
        lamps.push({ x, y: top2 - 4.5, d: 0.75, big: false });
      }
      g.fillStyle = vgrad(g, H * 0.93, H + M, [[0, 'rgba(8,0,12,0)'], [1, 'rgba(8,0,12,0.55)']]);
      g.fillRect(-M, H * 0.93, W + 2 * M, H * 0.07 + M);
    }
    daisBulbs = [];
    for (let i = 0; i < 17; i++) {
      const a = 0.08 * Math.PI + (i / 16) * 0.84 * Math.PI;
      daisBulbs.push({ x: W / 2 + Math.cos(a) * daisRx, y: daisY + 4 + Math.sin(a) * daisRy, c: i % 2 });
    }

    // -------------------------------------------------- festoon poles
    const poleTop = H * 0.42;
    const span = Math.min(W / 2 - Math.max(10, W * 0.04), u * 1.15);
    const poleX = [W / 2 - span, W / 2 + span];
    const nearL = sceneLayer(st, poleTop - 30, H + M, poleX[0] - 30, poleX[0] + 30);
    const nearR = sceneLayer(st, poleTop - 30, H + M, poleX[1] - 30, poleX[1] + 30);
    for (const [Ln, x, s] of [[nearL, poleX[0], 1], [nearR, poleX[1], -1]]) {
      const g = Ln.g;
      g.fillStyle = vgrad(g, poleTop, H + M, [[0, '#1e0820'], [1, '#0c0210']]);
      g.fillRect(x - 2.4, poleTop - 4, 4.8, H + M - poleTop + 4);
      g.fillStyle = 'rgba(255,140,170,0.28)'; g.fillRect(x + (s > 0 ? 1.2 : -2.2), poleTop, 1, H * 0.5);
      g.fillStyle = '#1e0820';
      g.fillRect(x - 5, poleTop + 2, 10, 2.5);
      g.beginPath(); g.moveTo(x - 4, poleTop - 4); g.lineTo(x + 4, poleTop - 4); g.lineTo(x + 3, poleTop - 16); g.lineTo(x - 3, poleTop - 16); g.closePath(); g.fill();
      g.fillStyle = '#ffe2a8'; g.fillRect(x - 2.2, poleTop - 14, 4.4, 8.5);
      g.fillStyle = '#1e0820'; g.beginPath(); g.moveTo(x - 4.5, poleTop - 16); g.lineTo(x, poleTop - 21); g.lineTo(x + 4.5, poleTop - 16); g.fill();
      // pennant
      g.strokeStyle = '#1e0820'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, poleTop - 21); g.lineTo(x, poleTop - 28); g.stroke();
      g.fillStyle = '#c21a40'; g.beginPath(); g.moveTo(x, poleTop - 28); g.lineTo(x + s * 9, poleTop - 25.5); g.lineTo(x, poleTop - 23); g.fill();
      lamps.push({ x, y: poleTop - 10, d: 0.75, big: true });
    }
    for (const Ln of [nearL, nearR]) {
      Ln.g.fillStyle = vgrad(Ln.g, H * 0.92, H + M, [[0, 'rgba(8,0,12,0)'], [1, 'rgba(8,0,12,0.6)']]);
      Ln.g.fillRect(-M, H * 0.92, W + 2 * M, H * 0.08 + M);
    }

    // -------------------------------------------------- festoon strings
    strings = [
      { x0: W / 2 - span * 1.2, y0: H * 0.315, x1: poleX[1], y1: poleTop + 2, sag: H * 0.07, back: true, ph: 1.7 },
      { x0: poleX[0], y0: poleTop + 2, x1: W / 2 + span * 1.2, y1: H * 0.305, sag: H * 0.07, back: true, ph: 3.9 },
      { x0: poleX[0], y0: poleTop + 2, x1: poleX[1], y1: poleTop + 2, sag: H * 0.1, back: false, ph: 0.3 },
    ];
    const lr = rng(808);
    lanterns = [];
    strings.forEach((s, si) => {
      const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
      const n = Math.max(9, Math.round(len / (s.back ? 21 : 24)));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const globe = s.back ? (i % 3 === 1) : (i % 2 === 0);
        const size = globe ? (s.back ? lr.range(6.5, 8.5) : lr.range(9, 11.5)) : (s.back ? 2.4 : 3);
        lanterns.push({
          s: si, u, kind: globe ? 0 : 1, size, hue: Math.floor(lr() * HUES.length), lit: 1, ang: 0, angV: 0,
          ph: lr() * TAU, ph2: lr() * TAU, fph: lr() * TAU, boost: 0, delay: -1, boostDur: 0, kick: -1, kickA: 0,
          rankM: lr(), rankS: 0, ax: 0, ay: 0, gx: 0, gy: 0, fade: 1, xs: lerp(s.x0, s.x1, u),
        });
      }
    });
    // transform sweep: left to right across the whole canopy, one by one
    const order = lanterns.map((l, i) => [l.xs / W + lr.range(-0.04, 0.04), i]).sort((a, b) => a[0] - b[0]);
    order.forEach(([, i], k) => { lanterns[i].rankS = (k + 0.5) / order.length; });
    const lf = litFracFor(st.m, st.p, 0);
    for (const l of lanterns) l.lit = (l.rankM < lf.mood || l.rankS < lf.sweep) ? 1 : 0;

    // ---------------------------------------------------------- sprites
    S.globeOn = HUES.map((h) => globeSprite(h, true));
    S.globeOff = HUES.map((h) => globeSprite(h, false));
    S.bulbOn = HUES.map((h) => bulbSprite(h, true));
    S.bulbOff = HUES.map((h) => bulbSprite(h, false));
    S.glow = HUES.map((h) => glowSprite(h, { size: 64, core: 0.35 }));
    S.skyLantern = skyLanternSprite();
    S.gondolaOn = gondolaSprite(true);
    S.gondolaOff = gondolaSprite(false);
    S.fw = FWC.map((c) => glowSprite(c, { size: 32, core: 1, falloff: 2.4 }));
    S.fwSoft = FWC.map((c) => glowSprite(c, { size: 128 }));
    S.spark = [glowSprite('#ffd45e', { size: 32, core: 0.8 }), glowSprite('#ff6aa6', { size: 32, core: 0.7 }), glowSprite('#fff4dc', { size: 32, core: 0.9 }), glowSprite('#ff8a3d', { size: 32, core: 0.7 }), glowSprite('#ffcf4a', { size: 32, core: 0.8 })];
    S.soft = { gold: glowSprite('#ffcf6a', { size: 128 }), rose: glowSprite('#ff5a8a', { size: 128 }), ember: glowSprite('#ff8a4a', { size: 128 }), moon: glowSprite('#ffe6c8', { size: 128 }), violet: glowSprite('#8a4aff', { size: 128 }) };
    S.glint = glintSprite('#fff0c8', 48);
    S.glintP = glintSprite('#ffb8dc', 48);

    grads.haze = vgrad(ctx, 0, H, [[0, 'rgba(70,24,80,0)'], [0.3, 'rgba(90,34,96,0.32)'], [0.58, 'rgba(150,64,124,0.6)'], [0.7, 'rgba(90,30,84,0.38)'], [1, 'rgba(30,8,40,0)']]);
    grads.golden = vgrad(ctx, 0, H, [[0, 'rgba(255,110,60,0)'], [0.4, 'rgba(255,150,70,0.1)'], [0.64, 'rgba(255,190,90,0.24)'], [0.86, 'rgba(255,170,70,0.2)'], [1, 'rgba(255,140,60,0.08)']]);
    grads.heavy = vgrad(ctx, 0, H, [[0, 'rgba(14,10,30,0.6)'], [0.55, 'rgba(40,32,56,0.4)'], [1, 'rgba(14,10,24,0.55)']]);
    grads.cool = vgrad(ctx, 0, H, [[0, 'rgba(30,16,90,0.25)'], [0.45, 'rgba(60,36,150,0.26)'], [0.7, 'rgba(110,36,130,0.24)'], [1, 'rgba(16,8,50,0.2)']]);

    L = { ...L, sky, starL, far, midDark, midLit, ground, nearL, nearR, gy, hy, poleTop, daisY, daisRx, daisRy };

    // seed ambient particles so the first frame is alive
    for (let i = 0; i < NC; i++) cf.on[i] = 0;
    const nConf = Math.round(40 * st.density);
    for (let i = 0; i < nConf; i++) spawnConfetti(st, R() * W, R() * H * 0.8, 0, 0, false);
    for (const s of lifts) s.on = false;
    const nSky = Math.round(5 * st.density * (1 - st.m.heaviness * 0.7));
    for (let i = 0; i < nSky; i++) { const s = spawnSky(st, R.range(0.06, 0.94) * W, H * R.range(0.12, 0.58)); if (s) s.age = 3; }
  }

  function litFracFor(m, p, boost) {
    const hv = m.heaviness * (1 - boost * 0.7);
    return { mood: clamp(0.97 - hv * 1.06 + m.warmth * 0.08), sweep: p * 1.12 - 0.04 };
  }

  // ------------------------------------------------------------ spawners --
  function spawnConfetti(st, x, y, vx, vy, burst) {
    let i = -1;
    for (let k = 0; k < NC; k++) if (!cf.on[k]) { i = k; break; }
    if (i < 0) { if (!burst) return -1; i = Math.floor(R() * NC); }
    const z = R.range(0.5, 1);
    cf.on[i] = 1; cf.x[i] = x; cf.y[i] = y; cf.vx[i] = vx; cf.vy[i] = vy;
    cf.rot[i] = R() * TAU; cf.spin[i] = R.range(-2.5, 2.5); cf.fl[i] = R() * TAU; cf.fls[i] = R.range(2, 5);
    const big = burst ? 1.6 : 1;
    cf.bz[i] = burst ? 1 : 0;
    cf.w[i] = R.range(2.2, 3.4) * z * big; cf.h[i] = R.range(4.5, 6.5) * z * big; cf.fall[i] = R.range(14, 28) * z; cf.age[i] = burst ? 0.6 : 0;
    cf.c[i] = Math.floor(R() * CONF.length); cf.ph[i] = R() * TAU;
    return i;
  }
  function spawnSky(st, x, y) {
    const s = lifts.find((q) => !q.on);
    if (!s) return null;
    const z = R.range(0.3, 1);
    s.on = true; s.x = x; s.y = y; s.z = z; s.size = 3.6 + z * 5.4; s.vy = -(5 + z * 9); s.ph = R() * TAU; s.age = 0; s.wob = R.range(0.6, 1.2);
    return s;
  }
  function launch(st, x, y, Rr, opts = {}) {
    let f = null;
    for (const q of fw) if (!q.on) { f = q; break; }
    if (!f) { if (!opts.big) return null; f = fw[0]; }
    const pair = opts.pair || FW_PAIRS[Math.floor(R() * FW_PAIRS.length)];
    f.on = true; f.big = !!opts.big; f.x = x; f.y = y; f.R = Rr; f.x0 = opts.x0 ?? x + R.range(-12, 12); f.y0 = opts.y0 ?? st.H * 0.62;
    f.c1 = pair[0]; f.c2 = pair[1]; f.age = 0; f.rise = opts.rise ?? R.range(1.1, 1.5); f.ttl = opts.ttl ?? R.range(2.6, 3.4); f.a = opts.a ?? 1;
    const n = Math.min(FWN, Math.round((opts.n ?? R.range(36, 52)) * Math.min(1, st.density + 0.25)) & ~1);
    f.n = n;
    const rot = R() * TAU;
    for (let i = 0; i < n; i++) {
      const inner = i % 2 === 1;
      f.ang[i] = rot + (i / n) * TAU + R.range(-0.04, 0.04);
      f.spd[i] = inner ? R.range(0.5, 0.62) : R.range(0.9, 1.04);
    }
    return f;
  }
  function addGlow(x, y, r, ttl, a, c) {
    let o = glows.find((q) => !q.on) || glows[0];
    o.on = true; o.x = x; o.y = y; o.r = r; o.age = 0; o.ttl = ttl; o.a = a; o.c = c;
  }
  function burstSparks(st, x, y, n, spd, cols, life = 1.1, size = 3) {
    n = Math.round(n * st.density);
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, v = spd * R.range(0.3, 1);
      sparks.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - spd * 0.25, life * R.range(0.7, 1.2), size * R.range(0.6, 1.2), cols[i % cols.length], 0.95);
    }
  }

  // ---------------------------------------------------------------- frame --
  function frame(g, st) {
    const { W, H, m, p, dt, rdt, dpr, density } = st;
    const camX = st.camX, camY = st.camY;
    const ag = m.agitation, cl = m.clarity, wm = m.warmth;
    clearBoost *= Math.exp(-rdt / 3);
    const hv = m.heaviness * (1 - clearBoost * 0.7);
    const lf = litFracFor(m, p, clearBoost);
    swayPh += dt * (0.9 + ag * 1.4);
    const excite = clamp(wm * 0.55 + ag * 0.45 + p * 0.5 - hv * 1.2);

    // 1 sky, stars, moon
    drawLayer(g, L.sky, st, 0.05);
    const starA = (0.15 + 0.85 * smoothstep(0.25, 0.9, cl)) * (1 - hv * 0.45);
    drawLayer(g, L.starL, st, 0.07, starA);
    g.globalCompositeOperation = 'lighter';
    if (cl > 0.35) {
      const ga = smoothstep(0.35, 0.95, cl) * (1 - hv * 0.6);
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(st.t * s.w + s.ph);
        g.globalAlpha = ga * tw * 0.8;
        g.drawImage(S.glint, s.x + camX * 0.07 - s.s, s.y + camY * 0.07 - s.s, s.s * 2, s.s * 2);
      }
    }
    g.globalAlpha = (0.2 + 0.25 * cl) * (1 - hv * 0.5);
    blit(g, S.soft.moon, L.moon.x + camX * 0.05, L.moon.y + camY * 0.05, L.moon.r * 5);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 2 fireworks (far away, soft and slow)
    updateFireworks(st, excite, hv);
    drawFireworks(g, st, hv);

    // 3 sky lanterns
    drawSkyLanterns(g, st, hv);

    // 4 far hills, wheel
    drawLayer(g, L.far, st, 0.3);
    festLit += (clamp(0.12 + 0.88 * litAvg) - festLit) * (1 - Math.exp(-rdt / 0.8));
    drawWheel(g, st, hv, ag);

    // 5 mid: tents + carousel (dark silhouettes, lit from inside)
    if (festLit < 0.985) drawLayer(g, L.midDark, st, 0.5);
    if (festLit > 0.015) drawLayer(g, L.midLit, st, 0.5, Math.min(1, festLit));

    // 6 haze over everything distant (low clarity)
    const haze = clamp((0.64 - cl) * 1.35 - clearBoost * 0.4) * (1 - p * 0.8);
    if (haze > 0.01) { g.globalAlpha = haze; g.fillStyle = grads.haze; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }

    // 7 ground + dais + lamps
    drawLayer(g, L.ground, st, 0.75);
    g.globalCompositeOperation = 'lighter';
    const gx = camX * 0.75, gyo = camY * 0.75;
    g.globalAlpha = (0.18 + 0.22 * wm + 0.15 * p) * (0.4 + 0.6 * festLit);
    blit(g, S.soft.ember, W * 0.5 + gx, L.daisY + gyo, L.daisRy * 2.2, L.daisRx * 1.5);
    // stage halo lifts the Mallow off the night
    g.globalAlpha = 0.16 + 0.1 * wm + 0.04 * Math.sin(st.t * 0.5);
    blit(g, S.soft.rose, W * 0.5, L.gy - H * 0.15, L.daisRx * 1.4, L.daisRx * 1.75);
    rippleAge += rdt;
    for (let i = 0; i < daisBulbs.length; i++) {
      const b = daisBulbs[i];
      let k = festLit * (0.75 + 0.25 * Math.sin(st.t * 0.8 + i * 0.9));
      if (rippleAge < 2.5) { const d = Math.abs(b.x - rippleX) - rippleAge * W * 0.7; k += Math.exp(-(d * d) / 900) * 0.8 * (1 - rippleAge / 2.5); }
      if (k < 0.02) continue;
      g.globalAlpha = Math.min(1, k * 0.9);
      g.drawImage(S.spark[b.c ? 1 : 0], b.x + gx - 4.5, b.y + gyo - 4.5, 9, 9);
      g.globalAlpha = Math.min(1, k * 0.25);
      blit(g, S.soft[b.c ? 'rose' : 'gold'], b.x + gx, b.y + gyo, 12);
    }
    for (const lp of lamps) {
      const x = lp.x + camX * lp.d, y = lp.y + camY * lp.d;
      const k = 0.35 + 0.65 * festLit;
      g.globalAlpha = k * (0.32 + 0.2 * wm); blit(g, S.soft.gold, x, y, lp.big ? 44 : 34);
      g.globalAlpha = k * 0.9; blit(g, S.spark[2], x, y, lp.big ? 6 : 5);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 8 festoon strings + lanterns
    updateLanterns(st, lf, ag);
    drawStrings(g, st, cl, wm);

    // 9 poles
    drawLayer(g, L.nearL, st, 0.75);
    drawLayer(g, L.nearR, st, 0.75);

    // 10 confetti + fizzing sparks
    drawConfetti(g, st, ag, hv);
    drawFizz(g, st, ag, hv);

    // 11 mood grading
    if (ag > 0.4 && cl < 0.6) { g.globalAlpha = Math.min(1, (ag - 0.4) * (0.6 - cl) * 7); g.fillStyle = grads.cool; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    const gold = clamp((wm - 0.5) * 1.6 + p * 0.7);
    if (gold > 0.01) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = gold * 0.75; g.fillStyle = grads.golden; g.fillRect(0, H * 0.28, W, H * 0.72); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    if (hv > 0.03) {
      g.globalCompositeOperation = 'saturation';
      g.globalAlpha = Math.min(0.85, hv * 0.85);
      g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = hv * 0.55; g.fillStyle = grads.heavy; g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }

    // 12 pulses
    g.globalCompositeOperation = 'lighter';
    for (const o of glows) {
      if (!o.on) continue;
      o.age += rdt;
      if (o.age > o.ttl + 0.6) { o.on = false; continue; }
      const e = flashEnv(o.age, 0.45, 0.2, o.ttl);
      g.globalAlpha = e * o.a; blit(g, o.c ? S.soft.rose : S.soft.gold, o.x, o.y, o.r);
      g.globalAlpha = e * o.a * 0.8; blit(g, S.soft.gold, o.x, o.y, o.r * 0.35);
    }
    g.globalAlpha = 1;
    rings.update(rdt); rings.draw(g);
    sparks.update(rdt, 70, 1.4);
    sparks.draw(g, S.spark, 1, 0.04);
    g.globalCompositeOperation = 'source-over';
    prevP = p;
  }

  // ------------------------------------------------------------ fireworks --
  function updateFireworks(st, excite, hv) {
    const { W, H, rdt, p } = st;
    if (st.reduced) { for (const f of fw) f.on = false; return; }
    // crown bloom when the ritual resolves
    if (prevP >= 0 && prevP < 0.82 && p >= 0.82) { crown(st, 1); crownTimer = 11; }
    if (p > 0.95) { crownTimer -= rdt; if (crownTimer <= 0) { crown(st, 0.8); crownTimer = R.range(10, 13); } }
    if (hv < 0.62) {
      const interval = lerp(9, 3.4, excite) * (st.low ? 1.7 : 1);
      fwTimer -= rdt;
      if (fwTimer <= 0) {
        fwTimer = interval * R.range(0.75, 1.3);
        let active = 0; for (const f of fw) if (f.on) active++;
        if (active < 3) {
          const y = H * R.range(0.12, 0.4), near = 1 - (y / H - 0.12) / 0.28;
          launch(st, W * R.range(0.14, 0.86), y, Math.min(W, H * 0.5) * R.range(0.08, 0.13) * (0.75 + near * 0.4), { a: R.range(0.7, 1), pair: p > 0.5 && R() < 0.6 ? [0, R() < 0.5 ? 1 : 4] : undefined });
        }
      }
    }
  }
  function crown(st, k) {
    const { W, H } = st;
    launch(st, W * 0.5, H * 0.35, Math.min(W * 0.34, H * 0.19) * k, { big: true, n: 68, rise: 1.7, ttl: 4.6, pair: [0, 1], a: 1, x0: W * 0.5, y0: H * 0.6 });
  }
  function drawFireworks(g, st, hv) {
    const { W, H, rdt } = st;
    const cx = st.camX * 0.1, cy = st.camY * 0.1;
    const lowK = st.low ? 0.65 : 1;
    g.globalCompositeOperation = 'lighter';
    for (const f of fw) {
      if (!f.on) continue;
      f.age += rdt;
      const tb = f.age - f.rise;
      if (tb > f.ttl) { f.on = false; continue; }
      const A = f.a * lowK * (1 - hv * 0.6);
      if (tb < 0) {
        // rising trail: a soft ember climbing, easing out
        const t = f.age / f.rise, e = 1 - (1 - t) * (1 - t);
        const x = lerp(f.x0, f.x, e) + cx, y = lerp(f.y0, f.y, e) + cy;
        const fade = smoothstep(0, 0.2, t) * (1 - smoothstep(0.85, 1, t) * 0.6);
        for (let k = 0; k < 6; k++) {
          const tk = Math.max(0, t - k * 0.035), ek = 1 - (1 - tk) * (1 - tk);
          g.globalAlpha = A * fade * (0.7 - k * 0.11);
          const s = (f.big ? 6 : 4.5) * (1 - k * 0.12);
          g.drawImage(S.fw[4], lerp(f.x0, f.x, ek) + cx - s, lerp(f.y0, f.y, ek) + cy - s, s * 2, s * 2);
        }
        g.globalAlpha = A * fade * 0.25; blit(g, S.fwSoft[0], x, y, 10);
        continue;
      }
      const u = tb / f.ttl;
      const env = smoothstep(0, 0.45, tb) * Math.pow(1 - u, 1.25);
      if (env < 0.004) continue;
      const ex = 1 - Math.exp(-tb * 2.4), droop = f.R * 0.16 * tb * tb / f.ttl;
      const x = f.x + cx, y = f.y + cy;
      // local sky glow — dim, slow, never full-screen
      g.globalAlpha = A * env * (f.big ? 0.2 : 0.13); blit(g, S.fwSoft[f.c1], x, y, f.R * 1.6);
      const s0 = (f.big ? 6.5 : 5) * (1 - u * 0.4) * Math.max(0.75, Math.min(1.25, f.R / 50));
      for (let i = 0; i < f.n; i++) {
        const c = i & 1 ? f.c2 : f.c1;
        const rr = f.R * f.spd[i] * ex;
        const ca = Math.cos(f.ang[i]), sa = Math.sin(f.ang[i]);
        const spr = S.fw[c];
        const tw = 0.85 + 0.15 * Math.sin(tb * 2.2 + i * 1.7);
        g.globalAlpha = A * env * tw;
        g.drawImage(spr, x + ca * rr - s0, y + sa * rr + droop - s0, s0 * 2, s0 * 2);
        // trailing streak
        g.globalAlpha = A * env * 0.42;
        const r2 = rr * 0.8, s1 = s0 * 0.85;
        g.drawImage(spr, x + ca * r2 - s1, y + sa * r2 + droop * 0.8 - s1, s1 * 2, s1 * 2);
      }
      if (f.big) {
        g.globalAlpha = A * env * 0.5;
        blit(g, S.fwSoft[0], x, y, f.R * 0.25);
      }
    }
    g.globalAlpha = 1;
    // reduced motion: a still, glinting crown instead of a bloom
    if (st.reduced && st.p > 0.6) {
      const k = smoothstep(0.6, 1, st.p) * (1 - hv);
      const x = W * 0.5 + cx, y = H * 0.35 + cy, rr = Math.min(W * 0.3, H * 0.17);
      g.globalAlpha = k * 0.24; blit(g, S.fwSoft[0], x, y, rr * 1.4);
      g.globalAlpha = k * 0.3; blit(g, S.fwSoft[1], x, y, rr * 0.5);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU, d = rr * (i % 2 ? 0.6 : 1);
        g.globalAlpha = k * (0.7 + 0.25 * Math.sin(st.t * 0.6 + i));
        const s = i % 2 ? 8 : 11;
        g.drawImage(i % 2 ? S.glintP : S.glint, x + Math.cos(a) * d - s, y + Math.sin(a) * d - s, s * 2, s * 2);
      }
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
  }

  // --------------------------------------------------------- sky lanterns --
  function drawSkyLanterns(g, st, hv) {
    const { W, H, dt, rdt, p, density } = st;
    // a cohort rises together as the ritual resolves
    if (prevP >= 0 && prevP < 0.45 && p >= 0.45) releaseCohort(st, 12);
    const want = Math.round((2 + 5 * (1 - hv)) * density + p * 6);
    let active = 0; for (const s of lifts) if (s.on) active++;
    skyAcc += rdt * 0.35;
    if (active < want && skyAcc > 1) { skyAcc = 0; spawnSky(st, R.range(0.06, 0.94) * W, H * R.range(0.6, 0.64)); }
    g.globalCompositeOperation = 'source-over';
    for (const s of lifts) {
      if (!s.on) continue;
      s.age += rdt;
      s.y += s.vy * dt * (1 - hv * 0.4);
      s.x += Math.sin(st.t * 0.35 * s.wob + s.ph) * (2 + st.m.agitation * 9) * dt;
      if (s.y < -30) { s.on = false; continue; }
      const top = smoothstep(-20, H * 0.12, s.y);
      const a = smoothstep(0, 2.5, s.age) * top * stageFade(s.x, s.y, W, H, st.groundY, 0.35);
      if (a < 0.01) continue;
      const x = s.x + st.camX * s.z * 0.3, y = s.y + st.camY * s.z * 0.3;
      const k = s.size / 10, flick = 0.9 + 0.1 * Math.sin(st.t * 1.3 + s.ph * 3);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = a * 0.42 * flick; blit(g, S.soft.ember, x, y + 3 * k, s.size * 3.4);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = a * (0.6 + 0.4 * s.z);
      g.drawImage(S.skyLantern, x - 10 * k, y - 14 * k, 20 * k, 28 * k);
    }
    g.globalAlpha = 1;
  }
  function releaseCohort(st, n) {
    const { W, H } = st;
    n = Math.max(4, Math.round(n * st.density));
    for (let i = 0; i < n; i++) {
      const s = spawnSky(st, W * (0.08 + 0.84 * (i + 0.5) / n) + R.range(-10, 10), H * R.range(0.6, 0.66));
      if (s) { s.vy = -R.range(12, 16) * (0.6 + s.z * 0.5); s.age = R.range(-0.8, 0); }
    }
  }

  // ---------------------------------------------------------------- wheel --
  function drawWheel(g, st, hv, ag) {
    const { dt, dpr, p } = st;
    wheelRot += dt * ((0.055 * (1 + ag * 0.7)) * (1 - hv * 0.8) + p * 0.025);
    const x = wheel.cx + st.camX * 0.3, y = wheel.cy + st.camY * 0.3, Rw = wheel.R;
    const cs = Math.cos(wheelRot), sn = Math.sin(wheelRot);
    const hw = S.wheel.cssW / 2;
    g.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * x, dpr * y);
    g.drawImage(S.wheel, -hw, -hw, hw * 2, hw * 2);
    if (festLit > 0.02) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = festLit * 0.85;
      g.drawImage(S.wheelNeon, -hw, -hw, hw * 2, hw * 2);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // gondolas hang level
    for (let i = 0; i < 8; i++) {
      const a = wheelRot + (i / 8) * TAU;
      const px = x + Math.cos(a) * Rw, py = y + Math.sin(a) * Rw;
      if (festLit < 0.97) { g.globalAlpha = 1; g.drawImage(S.gondolaOff, px - 5, py - 0.5, 10, 11.7); }
      if (festLit > 0.02) { g.globalAlpha = festLit < 0.97 ? festLit : 1; g.drawImage(S.gondolaOn, px - 5, py - 0.5, 10, 11.7); }
    }
    g.globalAlpha = 1;
    drawLayer(g, L.wheelFront, st, 0.3);
    if (festLit > 0.02) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const a = wheelRot + ((i + 0.5) / 16) * TAU;
        g.globalAlpha = festLit * (0.75 + 0.25 * Math.sin(st.t * 0.7 + i * 1.3));
        g.drawImage(S.spark[i % 2 ? 1 : 0], x + Math.cos(a) * Rw - 3, y + Math.sin(a) * Rw - 3, 6, 6);
      }
      g.globalAlpha = festLit * 0.5; blit(g, S.soft.rose, x, y, 9);
      g.globalAlpha = festLit * 0.12; blit(g, S.soft.rose, x, y, Rw * 1.5);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  // ------------------------------------------------------------- lanterns --
  function updateLanterns(st, lf, ag) {
    const { rdt, dt } = st;
    const amp0 = (0.03 + ag * 0.5) * (st.reduced ? 0.35 : 1);
    const kUp = 1 - Math.exp(-rdt / 0.3), kDn = 1 - Math.exp(-rdt / 1.5);
    let sum = 0;
    for (const l of lanterns) {
      if (l.delay > 0) { l.delay -= rdt; if (l.delay <= 0) l.boost = l.boostDur; }
      else if (l.boost > 0) l.boost -= rdt;
      const want = (l.rankM < lf.mood || l.rankS < lf.sweep || l.boost > 0) ? 1 : 0;
      const before = l.lit;
      l.lit += (want - l.lit) * (want > l.lit ? kUp : kDn);
      if (before < 0.5 && l.lit >= 0.5 && l.ax) {
        const n = l.kind ? 2 : 4;
        for (let i = 0; i < n; i++) sparks.spawn(l.gx, l.gy, R.range(-30, 30), R.range(-50, -10), R.range(0.5, 0.9), R.range(1.5, 2.6), i % 2 ? 0 : 2, 0.9);
      }
      const amp = amp0 * (l.kind ? 0.7 : 1);
      const wind = amp * (Math.sin(swayPh * 1.1 + l.ph) * 0.65 + Math.sin(swayPh * 2.3 + l.ph2) * 0.35);
      if (l.kick > 0) { l.kick -= rdt; if (l.kick <= 0) l.angV += l.kickA; }
      l.angV += ((wind - l.ang) * 16 - l.angV * 2.4) * dt;
      l.ang += l.angV * dt;
      if (l.ang > 0.9) l.ang = 0.9; else if (l.ang < -0.9) l.ang = -0.9;
      sum += l.lit;
    }
    litAvg = lanterns.length ? sum / lanterns.length : 0;
  }

  function drawStrings(g, st, cl, wm) {
    const { W, H, dpr, t, m } = st;
    const cx = st.camX * 0.75, cy = st.camY * 0.75;
    const ag = m.agitation;
    const glowK = 2.3 + (1 - cl) * 1.6 + wm * 0.5;
    for (let pass = 0; pass < 2; pass++) {
      for (let si = 0; si < strings.length; si++) {
        const s = strings[si];
        if (s.back !== (pass === 0)) continue;
        const bob = Math.sin(t * (0.55 + ag * 0.9) + s.ph) * (1.5 + ag * 6) * (st.reduced ? 0.4 : 1);
        const sag = s.sag + bob;
        const x0 = s.x0 + cx, y0 = s.y0 + cy, x1 = s.x1 + cx, y1 = s.y1 + cy;
        g.strokeStyle = s.back ? '#2e1030' : '#3a1438'; g.lineWidth = s.back ? 0.9 : 1.2;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); g.stroke();
        // anchors + bodies
        for (const l of lanterns) {
          if (l.s !== si) continue;
          const u = l.u;
          const ax = lerp(x0, x1, u), ay = lerp(y0, y1, u) + 4 * u * (1 - u) * sag;
          const unit = l.kind ? 3.2 : 15, k = l.size / unit;
          const ca = Math.cos(l.ang), sa = Math.sin(l.ang);
          const off = (l.kind ? 8.6 : 25) * k;
          l.ax = ax; l.ay = ay; l.gx = ax - sa * off; l.gy = ay + ca * off;
          const fade = stageFade(l.gx, l.gy, W, H, st.groundY, 0.55);
          l.fade = fade;
          const b = l.lit;
          if (l.kind) {
            const bx = l.gx - 5 * k, by = l.gy - 8.6 * k, bw = 10 * k, bh = 14 * k;
            if (b < 0.99) { g.globalAlpha = fade; g.drawImage(S.bulbOff[l.hue], bx, by, bw, bh); }
            if (b > 0.01) { g.globalAlpha = fade * b; g.drawImage(S.bulbOn[l.hue], bx, by, bw, bh); }
          } else {
            g.setTransform(dpr * ca * k, dpr * sa * k, -dpr * sa * k, dpr * ca * k, dpr * ax, dpr * ay);
            if (b < 0.99) { g.globalAlpha = fade; g.drawImage(S.globeOff[l.hue], -20, 0, 40, 52); }
            if (b > 0.01) { g.globalAlpha = fade * b; g.drawImage(S.globeOn[l.hue], -20, 0, 40, 52); }
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
        }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        // glows
        g.globalCompositeOperation = 'lighter';
        for (const l of lanterns) {
          if (l.s !== si || l.lit < 0.01) continue;
          const fade = l.fade;
          const flick = 0.93 + 0.07 * Math.sin(t * 1.6 + l.fph) * Math.sin(t * 0.7 + l.ph);
          const a = l.lit * fade * flick;
          if (l.kind) {
            g.globalAlpha = a * 0.5; blit(g, S.glow[l.hue], l.gx, l.gy, l.size * glowK * 2.2);
          } else {
            g.globalAlpha = a * 0.55; blit(g, S.glow[l.hue], l.gx, l.gy, l.size * glowK);
            if (wm > 0.5) { g.globalAlpha = a * (wm - 0.5) * 0.5; blit(g, S.soft.gold, l.gx, l.gy, l.size * glowK * 1.3); }
          }
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    }
  }

  // ------------------------------------------------------------- confetti --
  function drawConfetti(g, st, ag, hv) {
    const { W, H, dt, rdt, dpr, density, p, t } = st;
    const want = Math.round(48 * density * (0.25 + 0.75 * (1 - hv)) * (1 + ag * 1.1) + p * 20 * density);
    let active = 0; for (let i = 0; i < NC; i++) active += cf.on[i];
    confAcc += rdt * (2 + ag * 4);
    if (active < want && confAcc > 1) { confAcc = 0; spawnConfetti(st, R.range(-10, W + 10), -10, 0, 0, false); }
    const swirl = ag * 110 * (st.reduced ? 0.4 : 1);
    const relax = Math.min(1, dt * 1.6);
    const fallK = 1 - hv * 0.45;
    for (let i = 0; i < NC; i++) {
      if (!cf.on[i]) continue;
      cf.age[i] += rdt;
      const x = cf.x[i], y = cf.y[i];
      const tvx = Math.sin(t * 0.3 + cf.ph[i]) * 7 + Math.cos(y * 0.012 + t * 0.9 + cf.ph[i]) * swirl;
      const tvy = cf.fall[i] * fallK + Math.sin(x * 0.014 - t * 0.7) * swirl * 0.55;
      const rl = cf.bz[i] && cf.age[i] < 1.8 ? relax * 0.35 : relax;
      cf.vx[i] += (tvx - cf.vx[i]) * rl;
      cf.vy[i] += (tvy - cf.vy[i]) * rl;
      cf.x[i] += cf.vx[i] * dt; cf.y[i] += cf.vy[i] * dt;
      cf.rot[i] += cf.spin[i] * dt * (1 + ag * 1.5);
      cf.fl[i] += cf.fls[i] * dt * (1 + ag);
      if (cf.y[i] > H * 0.97 || cf.x[i] < -40 || cf.x[i] > W + 40 || cf.y[i] < -80) cf.on[i] = 0;
    }
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < NC; i++) {
      if (!cf.on[i]) continue;
      const x = cf.x[i] + st.camX * 0.8, y = cf.y[i] + st.camY * 0.8;
      const fade = stageFade(x, y, W, H, st.groundY, cf.bz[i] ? 0.75 : 0.25) * smoothstep(0, 0.6, cf.age[i]) * (1 - smoothstep(H * 0.9, H * 0.97, y));
      if (fade < 0.02) continue;
      const f = Math.cos(cf.fl[i]);
      const ca = Math.cos(cf.rot[i]), sa = Math.sin(cf.rot[i]);
      g.setTransform(dpr * ca, dpr * sa, -dpr * sa * f, dpr * ca * f, dpr * x, dpr * y);
      g.globalAlpha = fade * (0.5 + 0.45 * Math.abs(f));
      g.fillStyle = CONF[cf.c[i]];
      g.fillRect(-cf.w[i] / 2, -cf.h[i] / 2, cf.w[i], cf.h[i]);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
  }

  function drawFizz(g, st, ag, hv) {
    const { W, H, rdt, density } = st;
    const rate = (5 + ag * 70) * density * (0.25 + 0.75 * festLit) * (st.reduced ? 0.4 : 1);
    fizzAcc += rate * rdt;
    while (fizzAcc >= 1) {
      fizzAcc -= 1;
      let x, y;
      const pick = R();
      if (pick < 0.3 && lamps.length) { const lp = lamps[Math.floor(R() * lamps.length)]; x = lp.x + R.range(-3, 3); y = lp.y; }
      else if (pick < 0.55) { const b = daisBulbs[Math.floor(R() * daisBulbs.length)]; x = b.x; y = b.y; }
      else if (pick < 0.8 && lanterns.length) { const l = lanterns[Math.floor(R() * lanterns.length)]; if (l.lit < 0.5) continue; x = l.gx; y = l.gy; }
      else { x = R() * W; y = H * R.range(0.78, 0.95); }
      const sp = 1 + ag * 0.9;
      fizz.spawn(x, y, R.range(-10, 10), -R.range(16, 42) * sp, R.range(0.6, 1.5) * (1 - ag * 0.3), R.range(1.3, 2.7), Math.floor(R() * 5), 0.85);
    }
    const jit = (60 + ag * 520) * rdt;
    for (let i = 0; i < fizz.n; i++) fizz.vx[i] += (R() - 0.5) * jit;
    fizz.update(st.dt, -6, 0.9);
    g.globalCompositeOperation = 'lighter';
    fizz.draw(g, S.spark, (1 - hv * 0.5), 0.12);
    g.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- pulse --
  function nearest(x, y, maxD) {
    let best = null, bd = maxD;
    for (const l of lanterns) { const d = Math.hypot(l.gx - x, l.gy - y); if (d < bd) { bd = d; best = l; } }
    return best;
  }
  function boostLantern(l, delay, dur) { if (!l) return; l.delay = Math.max(0.001, delay); l.boostDur = dur; }

  function pulse(kind, x, y, st, gentle) {
    const { W, H } = st;
    const k = gentle ? 0.5 : 1;
    const onGround = y > H * 0.76;
    if (kind === 'tap') {
      rings.add(x, y, 3, 30, 0.9, onGround ? 0.32 : 1, '#ffd98a', 0.55 * k, 1.3);
      burstSparks(st, x, y, 9 * k, 75, [0, 1, 2]);
      const l = nearest(x, y, W * 0.35);
      if (l) { boostLantern(l, 0, 4); l.kick = 0.001; l.kickA = 1.2 * (R() < 0.5 ? -1 : 1); }
    } else if (kind === 'ripple') {
      const fy = onGround ? y : y;
      for (let i = 0; i < 3; i++) rings.add(x, fy, 6 + i * 5, 70 + i * 36, 1.6 + i * 0.35, onGround ? 0.3 : 1, i % 2 ? '#ff7aa6' : '#ffd98a', (0.6 - i * 0.14) * k, 1.6);
      for (const l of lanterns) {
        const d = Math.hypot(l.gx - x, l.gy - y);
        l.kick = 0.001 + d / (W * 1.1); l.kickA = (1.4 - d / W) * (l.gx < x ? -1 : 1) * k;
      }
      rippleAge = 0; rippleX = x;
    } else if (kind === 'success') {
      rings.add(x, y, 6, 70, 1.3, 1, '#ffd98a', 0.7 * k, 1.8);
      burstSparks(st, x, y, 18 * k, 120, [0, 2, 1, 4], 1.3, 3.4);
      if (!st.reduced && !gentle && st.m.heaviness < 0.9) {
        const fx = clamp(x, W * 0.16, W * 0.84), fyy = clamp(y - H * 0.3, H * 0.14, H * 0.42);
        launch(st, fx, fyy, Math.min(W, H * 0.5) * 0.12, { x0: x, y0: y - 10, rise: 0.9, ttl: 2.6, n: 40, pair: [0, 1], a: 0.95 });
      } else addGlow(x, y - H * 0.06, W * 0.22, 1.6, 0.3 * k, 0);
      let n = 0;
      for (const l of lanterns) if (n < 4 && Math.hypot(l.gx - x, l.gy - y) < W * 0.5 && l.lit < 0.5) { boostLantern(l, 0.15 * n, 5); n++; }
    } else if (kind === 'burst') {
      // confetti popper
      const n = Math.round(34 * k * st.density) + 4;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + R.range(-1.25, 1.25), v = R.range(260, 520) * (gentle ? 0.7 : 1);
        spawnConfetti(st, x, y, Math.cos(a) * v, Math.sin(a) * v, true);
      }
      rings.add(x, y, 6, 90, 1.2, 1, '#ff7aa6', 0.6 * k, 2);
      burstSparks(st, x, y, 22 * k, 160, [0, 1, 2, 3], 1.2, 3.4);
    } else if (kind === 'strike') {
      // a soft spark of warmth landing — never lightning
      addGlow(x, y, W * 0.3, 1.8, (gentle || st.reduced ? 0.22 : 0.34), 1);
      rings.add(x, y, 10, 64, 1.7, onGround ? 0.32 : 1, '#ffe2b0', 0.45 * k, 2);
      const sn = Math.round(12 * k * st.density);
      for (let i = 0; i < sn; i++) sparks.spawn(x + R.range(-14, 14), y + R.range(-6, 6), R.range(-20, 20), -R.range(40, 110), R.range(0.8, 1.4), R.range(2, 3.5), i % 2 ? 0 : 4, 0.85);
      const l = nearest(x, y, W * 0.5); if (l) boostLantern(l, 0.2, 6);
    } else if (kind === 'clear') {
      clearBoost = 1;
      rings.add(x, y, 10, Math.max(W, H) * 0.7, 2.8, 1, '#ffd98a', 0.45 * k, 2.6);
      rings.add(x, y, 10, Math.max(W, H) * 0.45, 2.3, 1, '#ffb8d0', 0.35 * k, 1.4);
      for (const l of lanterns) {
        const d = Math.hypot(l.gx - x, l.gy - y);
        boostLantern(l, 0.1 + d / (W * 0.95), 8);
      }
      rippleAge = 0; rippleX = x;
      releaseCohort(st, 4);
      burstSparks(st, x, y, 12 * k, 70, [0, 2], 1.6, 3);
    }
  }

  return { build, frame, pulse };
}
