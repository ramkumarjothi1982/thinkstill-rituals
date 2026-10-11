// Hushfold world engine — shared helpers.
// Pure drawing / maths utilities used by every realm. No per-frame allocation
// in the particle pools; sprites and gradients are cached.

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const TAU = Math.PI * 2;

/** Deterministic PRNG (mulberry32) so layouts are stable across resizes. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

/** Smooth 1D value noise, returns fn(x) in [-1, 1]. */
export function noise1(seed = 1, n = 256) {
  const r = rng(seed);
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = r() * 2 - 1;
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = v[((i % n) + n) % n];
    const b = v[(((i + 1) % n) + n) % n];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

/** Fractal (3 octave) version of noise1. */
export function fbm1(seed = 1) {
  const a = noise1(seed), b = noise1(seed + 7), c = noise1(seed + 13);
  return (x) => a(x) * 0.6 + b(x * 2.1) * 0.28 + c(x * 4.3) * 0.12;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Offscreen layer in CSS px coordinates (internally scaled by dpr). */
export function makeLayer(w, h, dpr) {
  const c = makeCanvas(w * dpr, h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.cssW = w; c.cssH = h;
  return { c, g, w, h };
}

// ---------------------------------------------------------------- colour --
const hexCache = new Map();
export function hex(h) {
  let v = hexCache.get(h);
  if (v) return v;
  const s = h.replace('#', '');
  const n = s.length === 3 ? s.split('').map((x) => x + x).join('') : s;
  v = [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  hexCache.set(h, v);
  return v;
}
export function rgba(h, a = 1) { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; }
export function mix(h1, h2, t, a = 1) {
  const A = hex(h1), B = hex(h2);
  return `rgba(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)},${a})`;
}
export function mixHex(h1, h2, t) {
  const A = hex(h1), B = hex(h2);
  const c = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`;
}

/** Vertical gradient helper: stops = [[offset, colour], ...]. */
export function vgrad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

// --------------------------------------------------------------- sprites --
const spriteCache = new Map();
/** Soft gaussian-ish glow disc, white core optional. Draw scaled with drawImage. */
export function glowSprite(colour, opts = {}) {
  const { size = 128, core = 0, falloff = 4.2 } = opts;
  const key = `g|${colour}|${size}|${core}|${falloff}`;
  let c = spriteCache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  const [R, G, B] = hex(colour);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    let a = Math.exp(-t * t * falloff) * (1 - t * t);
    gr.addColorStop(t, `rgba(${R},${G},${B},${a.toFixed(4)})`);
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  if (core > 0) {
    const cg = g.createRadialGradient(r, r, 0, r, r, r * 0.35);
    cg.addColorStop(0, `rgba(255,255,255,${core})`);
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cg;
    g.fillRect(0, 0, size, size);
  }
  spriteCache.set(key, c);
  return c;
}

/** Four-point star glint (cross flare) with soft core. */
export function glintSprite(colour, size = 64) {
  const key = `x|${colour}|${size}`;
  let c = spriteCache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const r = size / 2;
  const [R, G, B] = hex(colour);
  const core = g.createRadialGradient(r, r, 0, r, r, r * 0.5);
  core.addColorStop(0, 'rgba(255,255,255,0.95)');
  core.addColorStop(0.18, `rgba(${R},${G},${B},0.6)`);
  core.addColorStop(1, `rgba(${R},${G},${B},0)`);
  g.fillStyle = core;
  g.fillRect(0, 0, size, size);
  for (const horiz of [true, false]) {
    const lg = horiz ? g.createLinearGradient(0, 0, size, 0) : g.createLinearGradient(0, 0, 0, size);
    lg.addColorStop(0, `rgba(${R},${G},${B},0)`);
    lg.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    lg.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = lg;
    if (horiz) { g.beginPath(); g.ellipse(r, r, r, size * 0.03, 0, 0, TAU); g.fill(); }
    else { g.beginPath(); g.ellipse(r, r, size * 0.03, r, 0, 0, TAU); g.fill(); }
  }
  spriteCache.set(key, c);
  return c;
}

/** Draw a sprite centred at (x,y) with radius r. */
export function blit(g, s, x, y, r, rx) {
  const w = rx || r;
  g.drawImage(s, x - w, y - r, w * 2, r * 2);
}

// --------------------------------------------------------- painting aids --
/** Fill a soft radial blob (prerender use). */
export function softBlob(g, x, y, r, colour, a = 1, sx = 1, sy = 1) {
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  const [R, G, B] = hex(colour);
  gr.addColorStop(0, `rgba(${R},${G},${B},${a})`);
  gr.addColorStop(0.45, `rgba(${R},${G},${B},${a * 0.55})`);
  gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  g.restore();
}

/**
 * Puffy cumulus/marshmallow cloud (prerender use). Circles packed along a base
 * line, shaded with a lit top and a shadowed belly. Returns nothing.
 */
export function puffCloud(g, x, y, w, h, r, c) {
  const { light, mid, shade, rim = null, rimA = 0.5, flat = true } = c;
  const n = Math.max(4, Math.round(w / (h * 0.55)));
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const bell = Math.sin(t * Math.PI);
    const pr = h * (0.32 + 0.5 * bell) * r.range(0.8, 1.15);
    const px = x - w / 2 + t * w + r.range(-0.08, 0.08) * h;
    const py = y - pr * 0.55 - bell * h * 0.18;
    puffs.push([px, py, pr]);
  }
  // second row of top puffs
  for (let i = 0; i < n - 2; i++) {
    const t = (i + 1) / (n - 1);
    const bell = Math.sin(t * Math.PI);
    if (r() < 0.4) continue;
    const pr = h * (0.22 + 0.35 * bell) * r.range(0.85, 1.1);
    puffs.push([x - w / 2 + t * w, y - h * (0.55 + 0.4 * bell), pr]);
  }
  g.save();
  // silhouette with vertical shading
  const top = y - h * 1.25;
  const sh = g.createLinearGradient(0, top, 0, y + 2);
  sh.addColorStop(0, light);
  sh.addColorStop(0.55, mid);
  sh.addColorStop(1, shade);
  g.fillStyle = sh;
  g.beginPath();
  for (const [px, py, pr] of puffs) { g.moveTo(px + pr, py); g.arc(px, py, pr, 0, TAU); }
  if (flat) g.rect(x - w / 2, y - h * 0.3, w, h * 0.3);
  g.fill();
  // lit crowns
  if (rim) {
    g.globalCompositeOperation = 'source-atop';
    for (const [px, py, pr] of puffs) {
      const gr = g.createRadialGradient(px - pr * 0.25, py - pr * 0.45, 0, px - pr * 0.25, py - pr * 0.45, pr * 1.05);
      gr.addColorStop(0, rgba(rim, rimA));
      gr.addColorStop(1, rgba(rim, 0));
      g.fillStyle = gr;
      g.fillRect(px - pr * 1.4, py - pr * 1.6, pr * 2.8, pr * 2.6);
    }
  }
  g.restore();
}

/** Stage clearance: 1 far from the Mallow stage, down to `min` inside it. */
export function stageFade(x, y, W, H, groundY, min = 0.25) {
  const cx = W * 0.5, cy = H * (groundY - 0.15);
  const dx = (x - cx) / (W * 0.34), dy = (y - cy) / (H * 0.2);
  const d = dx * dx + dy * dy;
  return min + (1 - min) * smoothstep(0.55, 1.4, d);
}

// ------------------------------------------------------------ particles --
/** Fixed-size pooled particle set (no allocation per frame). */
export class Pool {
  constructor(max) {
    this.max = max;
    this.n = 0;
    this.x = new Float32Array(max); this.y = new Float32Array(max);
    this.vx = new Float32Array(max); this.vy = new Float32Array(max);
    this.age = new Float32Array(max); this.ttl = new Float32Array(max);
    this.size = new Float32Array(max); this.c = new Uint8Array(max);
    this.a = new Float32Array(max);
  }
  spawn(x, y, vx, vy, ttl, size, c = 0, a = 1) {
    let i = this.n;
    if (i >= this.max) {
      // recycle the oldest-by-ratio particle
      let best = 0, bv = -1;
      for (let k = 0; k < this.max; k++) { const v = this.age[k] / this.ttl[k]; if (v > bv) { bv = v; best = k; } }
      i = best;
    } else this.n++;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.age[i] = 0; this.ttl[i] = ttl; this.size[i] = size; this.c[i] = c; this.a[i] = a;
    return i;
  }
  update(dt, gravity = 0, drag = 0) {
    const k = drag ? Math.exp(-drag * dt) : 1;
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.ttl[i]) { this.kill(i); i--; continue; }
      this.vy[i] += gravity * dt;
      this.vx[i] *= k; this.vy[i] *= k;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
    }
  }
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    this.x[i] = this.x[j]; this.y[i] = this.y[j]; this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j];
    this.age[i] = this.age[j]; this.ttl[i] = this.ttl[j]; this.size[i] = this.size[j]; this.c[i] = this.c[j]; this.a[i] = this.a[j];
  }
  /** Envelope 0..1: ramps in over `rise` s and out over the last `fall` fraction. */
  env(i, rise = 0.25) {
    const age = this.age[i], ttl = this.ttl[i];
    const up = rise > 0 ? clamp(age / rise) : 1;
    const down = clamp((ttl - age) / (ttl * 0.6));
    return up * down * down;
  }
  draw(g, sprites, mul = 1, rise = 0.25) {
    for (let i = 0; i < this.n; i++) {
      const a = this.a[i] * this.env(i, rise) * mul;
      if (a < 0.004) continue;
      g.globalAlpha = a;
      const s = this.size[i];
      g.drawImage(sprites[this.c[i]], this.x[i] - s, this.y[i] - s, s * 2, s * 2);
    }
    g.globalAlpha = 1;
  }
}

/** Expanding rings (ripples, shock-rings). Elliptical with aspect. */
export class Rings {
  constructor(max = 16) {
    this.max = max; this.list = [];
    for (let i = 0; i < max; i++) this.list.push({ on: false, x: 0, y: 0, r0: 0, r1: 0, age: 0, ttl: 1, aspect: 1, colour: '#fff', a: 1, w: 1.5 });
  }
  add(x, y, r0, r1, ttl, aspect, colour, a = 1, w = 1.5) {
    let o = this.list.find((q) => !q.on);
    if (!o) o = this.list.reduce((m, q) => (q.age / q.ttl > m.age / m.ttl ? q : m));
    Object.assign(o, { on: true, x, y, r0, r1, age: 0, ttl, aspect, colour, a, w });
    return o;
  }
  update(dt) { for (const o of this.list) if (o.on) { o.age += dt; if (o.age >= o.ttl) o.on = false; } }
  draw(g, mul = 1) {
    for (const o of this.list) {
      if (!o.on) continue;
      const t = o.age / o.ttl;
      const e = 1 - Math.pow(1 - t, 2.2);
      const r = o.r0 + (o.r1 - o.r0) * e;
      const a = o.a * mul * clamp(o.age / 0.25) * (1 - t) * (1 - t);
      if (a < 0.004) continue;
      g.globalAlpha = a;
      g.strokeStyle = o.colour;
      g.lineWidth = o.w * (1 - t * 0.5);
      g.beginPath();
      g.ellipse(o.x, o.y, r, r * o.aspect, 0, 0, TAU);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
}

/**
 * Brightness envelope for photosensitive-safe flashes: rises over >= 0.28 s,
 * holds, then decays.  value(t) in 0..1.
 */
export function flashEnv(age, rise = 0.3, hold = 0.12, fall = 0.9) {
  if (age < 0) return 0;
  if (age < rise) { const t = age / rise; return t * t * (3 - 2 * t); }
  if (age < rise + hold) return 1;
  const t = (age - rise - hold) / fall;
  return t >= 1 ? 0 : (1 - t) * (1 - t);
}

/**
 * Scene layer covering the full width (+ parallax margin) and a vertical band
 * [y0, y1] in CSS px.  Its context is pre-translated so callers paint in scene
 * coordinates.  Draw it with drawLayer().
 */
export function sceneLayer(st, y0 = -st.M, y1 = st.H + st.M, x0 = -st.M, x1 = st.W + st.M) {
  const w = x1 - x0, h = y1 - y0;
  const L = makeLayer(w, h, st.dpr);
  L.g.translate(-x0, -y0);
  L.ox = x0; L.oy = y0;
  return L;
}
export function drawLayer(g, L, st, depth = 0, a = 1, dy = 0, dx = 0) {
  if (!L || a <= 0.003) return;
  if (a < 1) g.globalAlpha = a;
  g.drawImage(L.c, L.ox + st.camX * depth + dx, L.oy + st.camY * depth + dy, L.w, L.h);
  if (a < 1) g.globalAlpha = 1;
}

/**
 * Stylised billow cloud (animated-film look).  `billows` = [[x, y, r], ...].
 * Silhouette = union of circles.  A rim light hugs the outer silhouette on the
 * side opposite to (rimDx, rimDy) — painted by filling the union in the rim
 * colour and then the body over a shifted union.  Crowns add soft per-puff
 * modelling without hard inner outlines.
 */
export function billowCloud(g, billows, c) {
  const { top, bottom, y0, y1, rim = null, rimA = 0.6, rimDx = 0, rimDy = -3, crown = null, crownA = 0.35, under = null, underA = 0.3, shade = null, shadeA = 0.25 } = c;
  const union = (dx = 0, dy = 0) => {
    g.beginPath();
    for (const b of billows) {
      if (b.length === 4) g.rect(b[0] + dx, b[1] + dy, b[2], b[3]);
      else { g.moveTo(b[0] + dx + b[2], b[1] + dy); g.arc(b[0] + dx, b[1] + dy, b[2], 0, TAU); }
    }
  };
  let minX = 1e9, maxX = -1e9;
  for (const b of billows) {
    if (b.length === 4) { minX = Math.min(minX, b[0]); maxX = Math.max(maxX, b[0] + b[2]); }
    else { minX = Math.min(minX, b[0] - b[2]); maxX = Math.max(maxX, b[0] + b[2]); }
  }
  if (rim) { g.fillStyle = rgba(rim, rimA); union(); g.fill(); }
  const body = vgrad(g, y0, y1, [[0, top], [1, bottom]]);
  g.fillStyle = body;
  union(rim ? rimDx : 0, rim ? rimDy : 0);
  g.fill();
  g.save();
  union(rim ? rimDx : 0, rim ? rimDy : 0);
  g.clip();
  // lower puffs first so upper crowns sit on top
  const order = billows.filter((b) => b.length === 3).sort((a, b) => b[1] - a[1]);
  for (const [x, y, r] of order) {
    if (shade) {
      const gr = g.createRadialGradient(x, y + r * 0.9, 0, x, y + r * 0.9, r * 0.9);
      gr.addColorStop(0, rgba(shade, shadeA)); gr.addColorStop(1, rgba(shade, 0));
      g.fillStyle = gr; g.fillRect(x - r, y, r * 2, r * 1.8);
    }
    if (crown) {
      const gr = g.createRadialGradient(x - r * 0.18, y - r * 0.5, 0, x - r * 0.18, y - r * 0.5, r * 0.95);
      gr.addColorStop(0, rgba(crown, crownA)); gr.addColorStop(0.6, rgba(crown, crownA * 0.35)); gr.addColorStop(1, rgba(crown, 0));
      g.fillStyle = gr; g.fillRect(x - r * 1.3, y - r * 1.6, r * 2.6, r * 2.2);
    }
  }
  if (under) {
    g.fillStyle = vgrad(g, y0 + (y1 - y0) * 0.55, y1, [[0, rgba(under, 0)], [1, rgba(under, underA)]]);
    g.fillRect(minX, y0, maxX - minX, y1 - y0 + 4);
  }
  g.restore();
}

/** Billows for a flat-bottomed cloud bank sitting on baseY (use with billowCloud). */
export function bankBillows(r, cx, baseY, w, h, bumpiness = 1) {
  const out = [];
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const er = h * 0.32;
  out.push([x0 + er, baseY - h * 0.3, w - er * 2, h * 0.3]);
  const n = Math.max(3, Math.ceil(w / (h * 0.42)));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), bell = Math.sin(t * Math.PI);
    const rr = h * (0.3 + 0.28 * bell) * r.range(0.85, 1.15);
    out.push([x0 + er + t * (w - er * 2), baseY - rr, rr]);
  }
  const m = Math.round(n * 0.5 * bumpiness);
  for (let i = 0; i < m; i++) {
    const t = r.range(0.15, 0.85), bell = Math.sin(t * Math.PI);
    const rr = h * (0.22 + 0.32 * bell) * r.range(0.8, 1.15);
    out.push([x0 + t * w, baseY - h * (0.35 + 0.4 * bell) - rr * 0.3, rr]);
  }
  return out;
}
