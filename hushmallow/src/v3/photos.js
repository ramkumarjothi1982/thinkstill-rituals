// Hushmallow photos — the person's own images, used as ritual material.
//
// Up to six. When the person adds none, the seven Mallows take their place
// (see mallow-cards.js): photoApi() is handed those cards as a fallback, so
// every engine still gets real material to move and transform.
//
// PRIVACY: photos live only in this tab's memory. They are never written to
// storage, never sent over the network, never used for training or by any
// bot, and never placed on a share card. The session is cleared after a
// ritual unless the person ticks "keep them for my next ritual", and can be
// cleared at any time.
//
// SAFETY: rituals transform photos gently — dissolve, wash, cool, soften,
// shrink, fade, scatter into light, detach, seal away, untangle, release,
// drift into the distance. Never struck, burned, cut, shot or smashed.
//
// Drawing: every photo is shown clearly — cover-cropped around an estimated
// focal point (no awkward crops), clipped to an intentional shape with a
// feathered edge (no hard borders, no black masks), with a soft inner depth
// and a faint glossy rim.

import { clamp, rgba, rng, canvas as makeCanvas, TAU, lerp } from './fx.js';

export const MAX_PHOTOS = 6;
const MAX_EDGE = 1024;          // downscale on import (also strips metadata)
const SPRITE_STEP = 24;         // sprite size bucket (device px)
const SPRITE_MAX = 640;

// ------------------------------------------------------------- session --
let items = [];                 // { id, name, img (canvas), w, h, aspect, focus:{x,y}, colour, grid }
let keepNext = false;
let nextId = 1;
const listeners = new Set();
const emit = () => { for (const fn of listeners) { try { fn(items); } catch (e) { console.warn(e); } } };

async function decode(file) {
  if (!file || !/^image\//.test(file.type || '') && !/\.(jpe?g|png|gif|webp|heic|heif|avif|bmp)$/i.test(file.name || '')) throw new Error('not an image');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const k = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

/** Estimate where the interesting part of a photo is (edges + skin tones, centre-biased). No AI. */
function analyse(c) {
  const N = 40, s = makeCanvas(N, N), g = s.getContext('2d', { willReadFrequently: true });
  g.drawImage(c, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  const lum = new Float32Array(N * N);
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < N * N; i++) { const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2]; lum[i] = 0.3 * R + 0.59 * G + 0.11 * B; r += R; gg += G; b += B; }
  let sx = 0, sy = 0, sw = 0;
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x;
    const gx = lum[i + 1] - lum[i - 1], gy = lum[i + N] - lum[i - N];
    const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
    const skin = R > 95 && G > 40 && B > 20 && R > G && R > B && R - Math.min(G, B) > 15 && Math.abs(R - G) > 15 ? 1 : 0;
    const nx = x / N - 0.5, ny = y / N - 0.42;
    const bias = Math.exp(-(nx * nx + ny * ny) / 0.16);
    const w = (Math.hypot(gx, gy) + 6) * (1 + 1.6 * skin) * bias;
    sx += w * x / N; sy += w * y / N; sw += w;
  }
  const fx = sw ? sx / sw : 0.5, fy = sw ? sy / sw : 0.45;
  // average colour + an 8×8 colour grid (for dust that matches the photo)
  const grid = [];
  for (let gy2 = 0; gy2 < 8; gy2++) for (let gx2 = 0; gx2 < 8; gx2++) {
    let R = 0, G = 0, B = 0, n = 0;
    for (let y = gy2 * 5; y < gy2 * 5 + 5; y++) for (let x = gx2 * 5; x < gx2 * 5 + 5; x++) { const i = (y * N + x) * 4; R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
    grid.push(hexOf(R / n, G / n, B / n));
  }
  const n = N * N;
  return { focus: { x: lerp(0.5, fx, 0.6), y: lerp(0.45, fy, 0.6) }, colour: hexOf(r / n, gg / n, b / n), grid };
}
function hexOf(r, g, b) { const c = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0'); return `#${c(r)}${c(g)}${c(b)}`; }

/** A photo entry for a canvas (focus and colours measured; `extra` overrides). */
export function photoItem(c, extra = {}) {
  return { id: nextId++, img: c, w: c.width, h: c.height, aspect: c.width / c.height, ...analyse(c), ...extra };
}

export const photoSession = {
  max: MAX_PHOTOS,
  get list() { return items; },
  get count() { return items.length; },
  get keep() { return keepNext; },
  set keep(v) { keepNext = !!v; emit(); },
  /** Add image files (extra files beyond six are ignored). Resolves to how many were added. */
  async add(files) {
    let added = 0;
    for (const f of [...(files || [])]) {
      if (items.length >= MAX_PHOTOS) break;
      try {
        items.push(photoItem(await decode(f)));
        added++;
      } catch (e) { console.warn('[photos] skipped a file', e?.message || e); }
    }
    if (added) emit();
    return added;
  },
  async replace(id, file) {
    const i = items.findIndex((p) => p.id === id);
    if (i < 0) return false;
    try {
      const next = photoItem(await decode(file));
      forget([items[i]]); items[i] = next;
      emit(); return true;
    } catch { return false; }
  },
  remove(id) {
    forget(items.filter((p) => p.id === id));
    items = items.filter((p) => p.id !== id);
    if (!items.length) keepNext = false;
    emit();
  },
  move(id, dir) {
    const i = items.findIndex((p) => p.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]]; emit();
  },
  /** Forget every photo now (wipes pixels too, including every cached copy). */
  clear() {
    forget(items);
    items = []; keepNext = false; emit();
  },
  /**
   * End of a ritual: forget the photos unless the person chose to keep them
   * for the next ritual. Keeping lasts one ritual, so the next end card
   * asks again.
   */
  release() {
    if (keepNext && items.length) { keepNext = false; emit(); } else photoSession.clear();
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  /** Small thumbnail canvas for the tray. */
  thumb(p, size = 72) {
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1), c = document.createElement('canvas');
    c.width = c.height = Math.round(size * dpr);
    c.style.width = c.style.height = `${size}px`;
    const g = c.getContext('2d');
    const s = sprite(p, 'round', size * dpr, 'natural');
    g.drawImage(s, 0, 0, c.width, c.height);
    return c;
  },
};

/** Test helper: add photos from canvases/images already in memory (dev lab and QA only). */
export function addPhotoCanvases(list) {
  for (const src of list) {
    if (items.length >= MAX_PHOTOS) break;
    const k = Math.min(1, MAX_EDGE / Math.max(src.width, src.height));
    const c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    items.push(photoItem(c));
  }
  emit();
}

/**
 * Forget photos' pixels: the canvas itself and every cached sprite, tone,
 * piece and dissolve copy made from it. (The Mallow cards are never passed
 * here, so their cache stays warm.)
 */
function forget(list) {
  const ids = new Set(list.map((p) => p.id));
  if (!ids.size) return;
  const mine = (key) => ids.has(Number(key.slice(0, key.indexOf('|'))));
  for (const [key, v] of spriteCache) if (mine(key)) { for (const c of Array.isArray(v) ? v.map((x) => x.c) : [v]) wipe(c); spriteCache.delete(key); }
  for (const [key, st] of dissolveCache) if (mine(key)) { st.src?.data?.fill(0); st.out?.data?.fill(0); wipe(st.c); dissolveCache.delete(key); }
  for (const p of list) wipe(p.img);
}
function wipe(c) { try { if (c) c.width = c.height = 0; } catch { /* ignore */ } }

// --------------------------------------------------------------- shapes --
/** Width / height of each shape. 'card' and 'natural' follow the photo. */
export function shapeAspect(shape, photo) {
  const a = photo?.aspect || 1;
  switch (shape) {
    case 'natural': return clamp(a, 0.5, 2);
    case 'card': case 'page': return clamp(a, 0.72, 1.4);
    case 'hex': return 0.866;
    case 'drop': return 0.8;
    case 'petal': return 0.64;
    case 'pill': return 0.62;
    case 'arch': return 0.78;
    case 'shard': return 0.86;
    case 'cloud': return 1.42;
    case 'stone': return 1.3;
    case 'capsule': return 1.9;
    default: return 1; // circle, round, blob, bubble
  }
}
export const SHAPES = ['circle', 'round', 'card', 'natural', 'page', 'hex', 'drop', 'petal', 'pill', 'arch', 'shard', 'cloud', 'stone', 'capsule', 'blob', 'bubble'];

/** Trace a shape inside the box (0,0)–(w,h). `seed` varies organic shapes. */
export function shapePath(g, shape, w, h, seed = 1) {
  const m = Math.min(w, h);
  g.beginPath();
  switch (shape) {
    case 'circle': case 'bubble': g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, TAU); break;
    case 'round': rr(g, 0, 0, w, h, m * 0.24); break;
    case 'card': case 'natural': rr(g, 0, 0, w, h, m * 0.1); break;
    case 'page': rr(g, 0, 0, w, h, m * 0.05); break;
    case 'pill': case 'capsule': rr(g, 0, 0, w, h, m / 2); break;
    case 'hex': {
      const pts = Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + i * TAU / 6; return [w / 2 + Math.cos(a) * w / 1.732, h / 2 + Math.sin(a) * h / 2]; });
      roundedPoly(g, pts, m * 0.12); break;
    }
    case 'drop': {
      const r = w / 2, cy = h - r;
      g.moveTo(w / 2, 0);
      g.bezierCurveTo(w * 0.62, h * 0.18, w, cy - r * 0.35, w, cy);
      g.arc(w / 2, cy, r, 0, Math.PI);
      g.bezierCurveTo(0, cy - r * 0.35, w * 0.38, h * 0.18, w / 2, 0);
      break;
    }
    case 'petal': {
      g.moveTo(w / 2, 0);
      g.bezierCurveTo(w * 1.08, h * 0.28, w * 1.08, h * 0.72, w / 2, h);
      g.bezierCurveTo(-w * 0.08, h * 0.72, -w * 0.08, h * 0.28, w / 2, 0);
      break;
    }
    case 'arch': {
      const r = w / 2, rb = m * 0.08;
      g.moveTo(0, r); g.arc(r, r, r, Math.PI, 0); g.lineTo(w, h - rb); g.arcTo(w, h, w - rb, h, rb); g.lineTo(rb, h); g.arcTo(0, h, 0, h - rb, rb); g.closePath();
      break;
    }
    case 'shard': {
      const R = rng(seed * 977 + 13);
      const pts = [[0.5 + R.range(-0.12, 0.12), 0], [1, 0.22 + R.range(0, 0.16)], [0.92 + R.range(-0.06, 0.08), 0.82 + R.range(0, 0.18)], [0.3 + R.range(-0.1, 0.1), 1], [0, 0.52 + R.range(-0.18, 0.18)]]
        .map(([x, y]) => [x * w, y * h]);
      roundedPoly(g, pts, m * 0.07); break;
    }
    case 'cloud': {
      const bumps = [[0.22, 0.62, 0.22], [0.42, 0.4, 0.3], [0.66, 0.42, 0.27], [0.82, 0.62, 0.18], [0.5, 0.68, 0.3]];
      for (const [x, y, r] of bumps) { g.moveTo(x * w + r * h, y * h); g.arc(x * w, y * h, r * h, 0, TAU); }
      break;
    }
    case 'stone': case 'blob': {
      const R = rng(seed * 131 + 7), a1 = R() * TAU, a2 = R() * TAU, k = shape === 'stone' ? 0.06 : 0.09;
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * TAU, rad = 1 + k * Math.sin(3 * a + a1) + k * 0.6 * Math.sin(5 * a + a2);
        const x = w / 2 + Math.cos(a) * (w / 2) * rad * 0.92, y = h / 2 + Math.sin(a) * (h / 2) * rad * 0.92;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); break;
    }
    default: rr(g, 0, 0, w, h, m * 0.12);
  }
}
function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function roundedPoly(g, pts, r) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  g.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.arcTo(p[0], p[1], q[0], q[1], r); }
  g.closePath();
}

// -------------------------------------------------------------- sprites --
// sprite(photo, shape, px, tone) → a canvas (px = longest side in device px)
const spriteCache = new Map();
function bucket(px) { return clamp(Math.ceil(px / SPRITE_STEP) * SPRITE_STEP, SPRITE_STEP, SPRITE_MAX); }

function baseSprite(p, shape, px, seed) {
  const key = `${p.id}|${shape}|${px}|${seed}|base`;
  let c = spriteCache.get(key);
  if (c) return c;
  const asp = shapeAspect(shape, p);
  const w = Math.round(asp >= 1 ? px : px * asp), h = Math.round(asp >= 1 ? px / asp : px);
  c = makeCanvas(w, h);
  const g = c.getContext('2d');
  // cover-crop around the focal point
  const sc = Math.max(w / p.w, h / p.h) * (shape === 'natural' ? 1 : 1.02);
  const dw = p.w * sc, dh = p.h * sc;
  const ox = clamp(w / 2 - p.focus.x * dw, w - dw, 0), oy = clamp(h / 2 - p.focus.y * dh, h - dh, 0);
  g.imageSmoothingQuality = 'high';
  g.drawImage(p.img, ox, oy, dw, dh);
  // soft inner depth (sits the photo into the scene; never a black mask)
  g.globalCompositeOperation = 'source-atop';
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.62);
  vg.addColorStop(0, 'rgba(10,6,30,0)'); vg.addColorStop(1, 'rgba(10,6,30,0.22)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  // feathered shape mask: blur a filled shape via an offset shadow
  const feather = Math.max(1.5, Math.min(w, h) * 0.035);
  const mask = makeCanvas(w, h), mg = mask.getContext('2d');
  const inset = feather * 0.6, OFF = 10000;
  mg.save();
  mg.shadowColor = '#000'; mg.shadowBlur = feather; mg.shadowOffsetX = OFF;
  mg.translate(inset - OFF, inset);
  shapePath(mg, shape, w - inset * 2, h - inset * 2, seed);
  mg.fillStyle = '#000'; mg.fill();
  mg.restore();
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mask, 0, 0);
  // faint glossy rim, brightest at the top-left (light, not a border)
  g.globalCompositeOperation = 'source-atop';
  const lg = g.createLinearGradient(0, 0, w, h);
  lg.addColorStop(0, 'rgba(255,255,255,0.55)'); lg.addColorStop(0.45, 'rgba(255,255,255,0.06)'); lg.addColorStop(1, 'rgba(255,255,255,0.18)');
  g.save(); g.translate(inset, inset); shapePath(g, shape, w - inset * 2, h - inset * 2, seed); g.restore();
  g.strokeStyle = lg; g.lineWidth = Math.max(1.2, Math.min(w, h) * 0.022); g.stroke();
  g.globalCompositeOperation = 'source-over';
  spriteCache.set(key, c);
  return c;
}

// Tone recipes: composite passes over the photo, then the alpha is restored.
const TONES = {
  gray: [['saturation', '#808080', 1]],
  mist: [['saturation', '#808080', 0.85], ['screen', '#e8ecff', 0.42]],
  warm: [['soft-light', '#ffb36b', 0.7], ['screen', '#3a1800', 0.18]],
  gold: [['color', '#ffcf6a', 0.5], ['screen', '#40280a', 0.25]],
  cool: [['soft-light', '#5fb4ff', 0.75], ['saturation', '#808080', 0.25]],
  ember: [['multiply', '#ff6a3d', 0.72], ['screen', '#5a1400', 0.35]],
  storm: [['multiply', '#6a7cff', 0.55], ['screen', '#3b0a4a', 0.3]],
  night: [['multiply', '#2b2f80', 0.7], ['screen', '#0a0830', 0.2]],
  rain: [['multiply', '#4a7ad8', 0.5], ['soft-light', '#ffffff', 0.25]],
  dawn: [['soft-light', '#ffc2a8', 0.6], ['screen', '#2a1440', 0.2]],
  glow: [['screen', '#ffffff', 0.35]],
};
export const PHOTO_TONES = Object.keys(TONES);

function toneSprite(p, shape, px, tone, seed) {
  const key = `${p.id}|${shape}|${px}|${seed}|${tone}`;
  let c = spriteCache.get(key);
  if (c) return c;
  const base = baseSprite(p, shape, px, seed);
  c = makeCanvas(base.width, base.height);
  const g = c.getContext('2d');
  if (tone === 'blur') {
    const k = 7, sm = makeCanvas(Math.max(2, base.width / k), Math.max(2, base.height / k));
    const sg = sm.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(base, 0, 0, sm.width, sm.height);
    g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, base.width, base.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(base, 0, 0);
  } else {
    g.drawImage(base, 0, 0);
    for (const [op, col, a] of TONES[tone] || []) { g.globalCompositeOperation = op; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(base, 0, 0);
  }
  g.globalCompositeOperation = 'source-over';
  spriteCache.set(key, c);
  return c;
}

/** The whole photo (no mask) in a tone, same size as p.img — for clipped/cover drawing. */
function toneImage(p, tone) {
  const key = `${p.id}|full|${tone}`;
  let c = spriteCache.get(key);
  if (c) return c;
  c = makeCanvas(p.w, p.h);
  const g = c.getContext('2d');
  g.drawImage(p.img, 0, 0);
  if (tone === 'blur') {
    const sm = makeCanvas(Math.max(2, p.w / 7), Math.max(2, p.h / 7)); const sg = sm.getContext('2d'); sg.drawImage(p.img, 0, 0, sm.width, sm.height);
    g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, p.w, p.h);
  } else for (const [op, col, a] of TONES[tone] || []) { g.globalCompositeOperation = op; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, p.w, p.h); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  spriteCache.set(key, c);
  return c;
}

function sprite(p, shape, px, tone = 'natural', seed = 1) {
  px = bucket(px);
  return tone && tone !== 'natural' ? toneSprite(p, shape, px, tone, seed) : baseSprite(p, shape, px, seed);
}

// ------------------------------------------------------------- dissolve --
// A per-sprite noise field; pixels whose field value is below t are gone,
// and a narrow band just above t glows (the edge "turning into light").
const dissolveCache = new Map();
function dissolveState(p, shape, px, seed, mode) {
  const key = `${p.id}|${shape}|${px}|${seed}|${mode}`;
  let s = dissolveCache.get(key);
  if (s) return s;
  const base = baseSprite(p, shape, px, seed);
  const k = Math.min(1, 200 / Math.max(base.width, base.height));
  const w = Math.max(8, Math.round(base.width * k)), h = Math.max(8, Math.round(base.height * k));
  const c = makeCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(base, 0, 0, w, h);
  const src = g.getImageData(0, 0, w, h);
  const field = new Float32Array(w * h);
  const R = rng(p.id * 7919 + seed);
  // two octaves of blocky value noise, smoothed
  const grid = (n) => { const a = new Float32Array((n + 1) * (n + 1)); for (let i = 0; i < a.length; i++) a[i] = R(); return a; };
  const g1 = grid(6), g2 = grid(14);
  const sample = (a, n, x, y) => { const X = x * n, Y = y * n, xi = Math.min(n - 1, X | 0), yi = Math.min(n - 1, Y | 0), xf = X - xi, yf = Y - yi; const s2 = (t) => t * t * (3 - 2 * t); const u = s2(xf), v = s2(yf); const i = yi * (n + 1) + xi; return lerp(lerp(a[i], a[i + 1], u), lerp(a[i + n + 1], a[i + n + 2], u), v); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = x / w, ny = y / h;
    const n = sample(g1, 6, nx, ny) * 0.65 + sample(g2, 14, nx, ny) * 0.35;
    let base01;
    if (mode === 'up') base01 = ny;                       // bottom leaves first → rises away
    else if (mode === 'down') base01 = 1 - ny;            // top leaves first → washes down
    else if (mode === 'centre') base01 = 1 - Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 2);
    else base01 = Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 2); // 'edge': edges first
    field[y * w + x] = clamp(0.02 + (1 - base01) * 0.6 + n * 0.38, 0, 0.999); // low = leaves first
  }
  // order of pixels by field value (for dust emitted along the glowing edge)
  const order = Array.from({ length: w * h }, (_, i) => i).filter((i) => src.data[i * 4 + 3] > 40).sort((a, b) => field[a] - field[b]);
  s = { c, g, w, h, src, out: g.createImageData(w, h), field, order: Uint32Array.from(order), t: -1, bw: base.width, bh: base.height };
  dissolveCache.set(key, s);
  if (dissolveCache.size > 24) dissolveCache.delete(dissolveCache.keys().next().value);
  return s;
}
function renderDissolve(s, t, edge) {
  if (Math.abs(s.t - t) < 0.006) return s.c;
  s.t = t;
  const { src, out, field, w, h } = s, a = src.data, o = out.data;
  const [er, eg, eb] = edge;
  const band = 0.07;
  for (let i = 0, n = w * h; i < n; i++) {
    const f = field[i], j = i * 4;
    if (f < t) { o[j + 3] = 0; continue; }
    const d = f - t;
    if (d < band) {
      const k = 1 - d / band;
      o[j] = a[j] + (er - a[j]) * k; o[j + 1] = a[j + 1] + (eg - a[j + 1]) * k; o[j + 2] = a[j + 2] + (eb - a[j + 2]) * k;
      o[j + 3] = a[j + 3] * (1 - k * 0.35);
    } else { o[j] = a[j]; o[j + 1] = a[j + 1]; o[j + 2] = a[j + 2]; o[j + 3] = a[j + 3]; }
  }
  s.g.putImageData(out, 0, 0);
  return s.c;
}

// --------------------------------------------------------- ritual API --
/**
 * The photo API handed to a ritual engine. `particles` is the host's shared
 * Particles pool (for dust). All sizes are CSS px; `dpr` is the canvas scale.
 * `fallback` (the Mallow cards) stands in while the person has no photos.
 */
export function photoApi({ particles, dpr = 1, seed = 1, fallback = [] } = {}) {
  const mat = () => (items.length ? items : fallback);
  const P = (i) => (i == null || i < 0 ? null : mat()[i] || null);
  const api = {
    get n() { return mat().length; },
    get list() { return mat(); },
    /** True when the Mallow cards are standing in for the person's photos. */
    get standIn() { return !items.length && fallback.length > 0; },
    /**
     * Spread photos over k objects: [-1…] with none, the single photo on
     * object 0 (or every object with {repeat:true}), else round-robin.
     */
    assign(k, { repeat = false } = {}) {
      const n = mat().length;
      return Array.from({ length: k }, (_, i) => (n === 0 ? -1 : n === 1 ? (repeat || i === 0 ? 0 : -1) : i % n));
    },
    /** Width/height of photo i in a shape at a given longest side. */
    size(i, shape = 'card', size = 100) {
      const a = shapeAspect(shape, P(i));
      return a >= 1 ? { w: size, h: size / a } : { w: size * a, h: size };
    },
    colour(i) { return P(i)?.colour || '#ffd98a'; },
    /** A colour sampled from the photo's 8×8 grid (u,v in 0..1). */
    sampleColour(i, u, v) { const p = P(i); if (!p) return '#ffffff'; return p.grid[clamp(Math.floor(v * 8), 0, 7) * 8 + clamp(Math.floor(u * 8), 0, 7)]; },
    /**
     * Draw photo i centred at (x, y). opts:
     *   shape, rot, alpha, scale, tone + toneMix (crossfade to a tone),
     *   blur (0..1 crossfade to a soft-focus copy), glow (0..1 halo in glowColour),
     *   dissolve (0..1, mode 'edge'|'up'|'down'|'centre', edgeColour), shadow, sheen (bubble/glass highlight)
     * Returns {w, h} drawn, or null if there's no such photo.
     */
    draw(g, i, x, y, size, o = {}) {
      const p = P(i);
      if (!p || size <= 0) return null;
      const { shape = 'card', rot = 0, alpha = 1, scale = 1, tone = null, toneMix = 0, blur = 0, glow = 0, glowColour = p.colour,
        dissolve = 0, mode = 'edge', edgeColour = '#fff2c8', shadow = true, sheen = shape === 'bubble', seed: sd = 1, flipX = false, skewY = 0 } = o;
      if (alpha <= 0.002 || dissolve >= 0.999) return { w: 0, h: 0 };
      // the Mallow cards are characters, not material to erode: tones stay
      // light and a dissolve becomes a soft fade into light
      const soft = !!p.mallow, fade = soft ? clamp(dissolve) : 0;
      const S = size * scale, px = S * dpr;
      const { w, h } = api.size(i, shape, S);
      g.save();
      g.translate(x, y); if (rot) g.rotate(rot); if (flipX) g.scale(-1, 1); if (skewY) g.transform(1, skewY, 0, 1, 0, 0);
      g.globalAlpha *= clamp(alpha);
      if (glow > 0) {
        const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(0, 0, Math.min(w, h) * 0.2, 0, 0, Math.max(w, h) * 0.85);
        gr.addColorStop(0, rgba(glowColour, 0.45 * glow)); gr.addColorStop(1, rgba(glowColour, 0));
        g.fillStyle = gr; g.fillRect(-w, -h, w * 2, h * 2); g.globalCompositeOperation = op;
      }
      if (shadow && dissolve < 0.5) {
        const a0 = g.globalAlpha;
        g.globalAlpha = a0 * 0.35 * (1 - dissolve * 2);
        const sg = g.createRadialGradient(0, h * 0.5, 0, 0, h * 0.5, w * 0.6);
        sg.addColorStop(0, 'rgba(0,0,12,0.9)'); sg.addColorStop(1, 'rgba(0,0,12,0)');
        g.fillStyle = sg; g.save(); g.scale(1, 0.25); g.beginPath(); g.arc(0, h * 2.2, w * 0.6, 0, TAU); g.fill(); g.restore();
        g.globalAlpha = a0;
      }
      if (dissolve > 0.001 && !soft) {
        const st = dissolveState(p, shape, bucket(px), sd, mode);
        const c = renderDissolve(st, clamp(dissolve), hexRGB(edgeColour));
        g.imageSmoothingQuality = 'high';
        g.drawImage(c, -w / 2, -h / 2, w, h);
      } else {
        const a1 = g.globalAlpha;
        if (fade) g.globalAlpha = a1 * (1 - fade) ** 1.3;
        const base = sprite(p, shape, px, 'natural', sd);
        const tm = clamp(toneMix) * (soft ? 0.45 : 1), bm = Math.max(clamp(blur), fade * 0.8);
        if (tm < 1 && bm < 1) g.drawImage(base, -w / 2, -h / 2, w, h);
        if (tone && tm > 0) { const a0 = g.globalAlpha; g.globalAlpha = a0 * tm; g.drawImage(sprite(p, shape, px, tone, sd), -w / 2, -h / 2, w, h); g.globalAlpha = a0; }
        if (bm > 0) { const a0 = g.globalAlpha; g.globalAlpha = a0 * bm; g.drawImage(sprite(p, shape, px, 'blur', sd), -w / 2, -h / 2, w, h); g.globalAlpha = a0; }
        if (fade) {
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = a1 * Math.sin(fade * Math.PI) * 0.5;
          g.drawImage(sprite(p, shape, px, 'glow', sd), -w / 2, -h / 2, w, h);
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = a1;
        }
      }
      if (sheen) {
        g.globalCompositeOperation = 'lighter';
        const hg = g.createRadialGradient(-w * 0.22, -h * 0.28, 0, -w * 0.22, -h * 0.28, w * 0.42);
        hg.addColorStop(0, 'rgba(255,255,255,0.42)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = hg; g.beginPath(); g.ellipse(-w * 0.2, -h * 0.26, w * 0.28, h * 0.16, -0.6, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = Math.max(1, w * 0.018);
        g.beginPath(); g.ellipse(0, 0, w / 2 - 1, h / 2 - 1, 0, 0, TAU); g.stroke();
      }
      g.restore();
      return { w, h };
    },
    /** Emit n dust motes coloured like the photo, spread over its area. */
    dust(i, x, y, size, n = 18, { shape = 'card', speed = 40, up = 30, life = 1.4, sizePx = 5, kind } = {}) {
      const p = P(i); if (!p || !particles) return;
      const { w, h } = api.size(i, shape, size);
      for (let k = 0; k < n; k++) {
        const u = Math.random(), v = Math.random();
        const a = Math.random() * TAU, sp = speed * (0.3 + Math.random() * 0.7);
        particles.emit({ x: x + (u - 0.5) * w * 0.9, y: y + (v - 0.5) * h * 0.9, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up,
          life: life * (0.6 + Math.random() * 0.6), size: sizePx * (0.6 + Math.random() * 0.9), colour: api.sampleColour(i, u, v), drag: 0.95, kind });
      }
    },
    /** While dissolving, emit glowing motes from the current dissolve edge. */
    edgeDust(i, x, y, size, t, n = 6, { shape = 'card', mode = 'edge', rot = 0, colour, up = 26, speed = 30, sizePx = 4.5, seed: sd = 1 } = {}) {
      const p = P(i); if (!p || !particles || t <= 0 || t >= 1) return;
      const st = dissolveState(p, shape, bucket(size * dpr), sd, mode);
      const { field, order, w: fw, h: fh } = st;
      // binary search the first pixel at or above t
      let lo = 0, hi = order.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (field[order[m]] < t) lo = m + 1; else hi = m; }
      const span = Math.max(1, Math.floor(order.length * 0.03));
      const { w, h } = api.size(i, shape, size);
      const c = Math.cos(rot), s = Math.sin(rot);
      for (let k = 0; k < n && lo < order.length; k++) {
        const idx = order[Math.min(order.length - 1, lo + Math.floor(Math.random() * span))];
        const u = (idx % fw) / fw, v = Math.floor(idx / fw) / fh;
        const lx = (u - 0.5) * w, ly = (v - 0.5) * h;
        const a = Math.random() * TAU;
        particles.emit({ x: x + lx * c - ly * s, y: y + lx * s + ly * c, vx: Math.cos(a) * speed * Math.random(), vy: Math.sin(a) * speed * Math.random() - up,
          life: 0.9 + Math.random() * 0.8, size: sizePx * (0.6 + Math.random()), colour: colour || api.sampleColour(i, u, v), drag: 0.94 });
      }
    },
    /**
     * Split photo i into n soft pieces (for scatter / untangle / drift apart).
     * Returns [{c (canvas), ox, oy (centre offset, CSS px at `size`), w, h}].
     */
    pieces(i, size, n = 5, { shape = 'card', seed: sd = 1 } = {}) {
      const p = P(i); if (!p) return [];
      const key = `${p.id}|${shape}|${bucket(size * dpr)}|${n}|${sd}|pieces`;
      let out = spriteCache.get(key);
      if (out) return out;
      const base = baseSprite(p, shape, bucket(size * dpr), sd);
      const W = base.width, H = base.height, R = rng(p.id * 31 + n * 7 + sd);
      const seeds = Array.from({ length: n }, (_, k) => { const a = (k / n) * TAU + R() * 0.8; const r = 0.12 + R() * 0.3; return [0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]; });
      const N = 64, owner = new Uint8Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let best = 0, bd = 9;
        for (let k = 0; k < n; k++) { const dx = x / N - seeds[k][0], dy = y / N - seeds[k][1]; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
        owner[y * N + x] = best;
      }
      const { w: cw, h: ch } = api.size(i, shape, size);
      out = seeds.map((sdp, k) => {
        const m = makeCanvas(N, N), mg = m.getContext('2d'), id = mg.createImageData(N, N);
        for (let j = 0; j < N * N; j++) if (owner[j] === k) id.data[j * 4 + 3] = 255;
        mg.putImageData(id, 0, 0);
        const c = makeCanvas(W, H), g = c.getContext('2d');
        g.drawImage(base, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(m, 0, 0, W, H);
        return { c, ox: (sdp[0] - 0.5) * cw, oy: (sdp[1] - 0.5) * ch, w: cw, h: ch };
      });
      spriteCache.set(key, out);
      return out;
    },
    /** Draw one piece from pieces() at (x, y) = where the photo centre would be, plus its offset. */
    drawPiece(g, piece, x, y, { rot = 0, alpha = 1, scale = 1 } = {}) {
      if (!piece || alpha <= 0) return;
      g.save(); g.globalAlpha *= clamp(alpha); g.translate(x + piece.ox, y + piece.oy); g.rotate(rot); g.scale(scale, scale);
      g.drawImage(piece.c, -piece.w / 2 - piece.ox, -piece.h / 2 - piece.oy, piece.w, piece.h);
      g.restore();
    },
    /** Draw the photo clipped to any path you trace (e.g. a window, a lens). */
    drawClipped(g, i, pathFn, x, y, w, h, { alpha = 1, tone, toneMix = 0 } = {}) {
      const p = P(i); if (!p) return;
      g.save(); pathFn(g); g.clip(); g.globalAlpha *= alpha;
      const sc = Math.max(w / p.w, h / p.h), dw = p.w * sc, dh = p.h * sc;
      const ox = clamp(w / 2 - p.focus.x * dw, w - dw, 0), oy = clamp(h / 2 - p.focus.y * dh, h - dh, 0);
      g.drawImage(p.img, x - w / 2 + ox, y - h / 2 + oy, dw, dh);
      const tm = clamp(toneMix) * (p.mallow ? 0.45 : 1);
      if (tone && tm > 0) { g.globalAlpha *= tm; g.drawImage(toneImage(p, tone), x - w / 2 + ox, y - h / 2 + oy, dw, dh); }
      g.restore();
    },
  };
  return api;
}

function hexRGB(h) { const s = String(h).replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; }
