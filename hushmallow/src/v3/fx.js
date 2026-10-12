// Hushmallow V3 effects library — shared by all 50 touch engines.
//
// Everything here is canvas 2D, allocation-free per frame (pools and typed
// arrays), and degrades for reduced motion / low stimulation. Additive light
// ('lighter') is used for glow; nothing here flashes the full screen.

// ------------------------------------------------------------------ maths --
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a || 1));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - clamp(t), 3),
  inOutSine: (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2,
  outBack: (t) => { t = clamp(t); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: (t) => { t = clamp(t); return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1; },
  outQuint: (t) => 1 - Math.pow(1 - clamp(t), 5),
};
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
/** shortest signed angle from a to b */
export const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/** Deterministic random generator (mulberry32). */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  return r;
}

/** Smooth 2D value noise in [-1, 1]. */
export function noise2(seed = 7) {
  const r = rng(seed); const P = new Uint8Array(512); const G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const f = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = P[(xi & 255) + P[yi & 255]], b = P[((xi + 1) & 255) + P[yi & 255]];
    const c = P[(xi & 255) + P[(yi + 1) & 255]], d = P[((xi + 1) & 255) + P[(yi + 1) & 255]];
    const u = f(xf), v = f(yf);
    return lerp(lerp(G[a], G[b], u), lerp(G[c], G[d], u), v);
  };
}

// ----------------------------------------------------------------- colour --
const hexCache = new Map();
export function hex(h) {
  let v = hexCache.get(h);
  if (!v) {
    let s = String(h).replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    hexCache.set(h, v);
  }
  return v;
}
export const rgba = (h, a = 1) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
export function mix(h1, h2, t) {
  const a = hex(h1), b = hex(h2);
  const c = (i) => Math.round(lerp(a[i], b[i], clamp(t))).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`;
}

// ---------------------------------------------------------------- sprites --
export function canvas(w, h) {
  const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(Math.max(1, w), Math.max(1, h)) : Object.assign(document.createElement('canvas'), { width: Math.max(1, w), height: Math.max(1, h) });
  return c;
}
const glowCache = new Map();
/** Soft radial glow sprite (cached per colour). Draw with drawImage, centred. */
export function glowSprite(colour, size = 128, core = 0.18) {
  const key = `${colour}|${size}|${core}`;
  let s = glowCache.get(key);
  if (s) return s;
  s = canvas(size, size);
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, rgba(colour, 1)); gr.addColorStop(core, rgba(colour, 0.65)); gr.addColorStop(0.5, rgba(colour, 0.18)); gr.addColorStop(1, rgba(colour, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  glowCache.set(key, s);
  return s;
}
/** Additive glow at (x, y) with radius r. */
export function glow(g, x, y, r, colour, a = 1) {
  if (r <= 0 || a <= 0) return;
  const s = glowSprite(colour);
  const op = g.globalCompositeOperation, ga = g.globalAlpha;
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga * clamp(a);
  g.drawImage(s, x - r, y - r, r * 2, r * 2);
  g.globalCompositeOperation = op; g.globalAlpha = ga;
}
/** Four-point star glint. */
export function glint(g, x, y, r, colour, a = 1, rot = 0) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= clamp(a);
  g.fillStyle = rgba(colour, 0.9);
  for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(0, 0, r, r * 0.08, i * Math.PI / 2, 0, TAU); g.fill(); }
  g.restore();
  glow(g, x, y, r * 0.7, colour, a * 0.6);
}

// -------------------------------------------------------------- particles --
/**
 * Pool of additive particles. emit() never allocates; draw() batches by sprite.
 *   const p = new Particles(400); p.emit({x,y,vx,vy,life,size,colour,drag,gravity,grow,spin});
 */
export class Particles {
  constructor(max = 300) {
    this.max = max; this.n = 0;
    const F = () => new Float32Array(max);
    this.x = F(); this.y = F(); this.vx = F(); this.vy = F(); this.life = F(); this.age = F(); this.size = F();
    this.drag = F(); this.grav = F(); this.grow = F(); this.alpha = F(); this.kind = new Uint8Array(max);
    this.col = new Array(max).fill('#ffffff');
  }
  emit(o) {
    let i = this.n < this.max ? this.n++ : (Math.random() * this.max) | 0;
    this.x[i] = o.x; this.y[i] = o.y; this.vx[i] = o.vx || 0; this.vy[i] = o.vy || 0;
    this.life[i] = o.life || 1; this.age[i] = 0; this.size[i] = o.size || 6; this.drag[i] = o.drag ?? 0.9;
    this.grav[i] = o.gravity || 0; this.grow[i] = o.grow ?? -0.4; this.alpha[i] = o.alpha ?? 1;
    this.kind[i] = o.kind === 'glint' ? 1 : o.kind === 'dot' ? 2 : 0; this.col[i] = o.colour || '#ffffff';
    return i;
  }
  /** Emit n particles in a burst. */
  burst(x, y, n, { speed = 120, life = 0.9, size = 6, colour = '#ffffff', spread = TAU, dir = 0, gravity = 0, drag = 0.9, kind } = {}) {
    for (let k = 0; k < n; k++) {
      const a = dir + (Math.random() - 0.5) * spread, v = speed * (0.35 + Math.random() * 0.65);
      this.emit({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.8), colour, gravity, drag, kind });
    }
  }
  update(dt) {
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      const age = this.age[i] + dt;
      if (age >= this.life[i]) continue;
      const k = Math.pow(this.drag[i], dt * 60);
      const vx = this.vx[i] * k, vy = (this.vy[i] + this.grav[i] * dt) * k;
      if (j !== i) {
        this.size[j] = this.size[i]; this.life[j] = this.life[i]; this.drag[j] = this.drag[i]; this.grav[j] = this.grav[i];
        this.grow[j] = this.grow[i]; this.alpha[j] = this.alpha[i]; this.kind[j] = this.kind[i]; this.col[j] = this.col[i];
      }
      this.x[j] = this.x[i] + vx * dt; this.y[j] = this.y[i] + vy * dt; this.vx[j] = vx; this.vy[j] = vy; this.age[j] = age;
      j++;
    }
    this.n = j;
  }
  draw(g) {
    for (let i = 0; i < this.n; i++) {
      const t = this.age[i] / this.life[i];
      const a = this.alpha[i] * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
      const s = Math.max(0.2, this.size[i] * (1 + this.grow[i] * t));
      if (this.kind[i] === 1) glint(g, this.x[i], this.y[i], s * 1.6, this.col[i], a);
      else if (this.kind[i] === 2) { g.globalAlpha = clamp(a); g.fillStyle = this.col[i]; g.beginPath(); g.arc(this.x[i], this.y[i], s * 0.5, 0, TAU); g.fill(); g.globalAlpha = 1; }
      else glow(g, this.x[i], this.y[i], s, this.col[i], a);
    }
  }
  clear() { this.n = 0; }
}

// ------------------------------------------------------------------ trail --
/** Glowing finger trail: tapered, fading ribbon of the last points. */
export class Trail {
  constructor(max = 48, life = 0.7) { this.max = max; this.life = life; this.x = new Float32Array(max); this.y = new Float32Array(max); this.t = new Float32Array(max); this.n = 0; this.head = 0; this.now = 0; }
  add(x, y) {
    const i = (this.head + this.n) % this.max;
    if (this.n < this.max) this.n++; else this.head = (this.head + 1) % this.max;
    this.x[i] = x; this.y[i] = y; this.t[i] = this.now;
  }
  update(dt) { this.now += dt; while (this.n && this.now - this.t[this.head] > this.life) { this.head = (this.head + 1) % this.max; this.n--; } }
  draw(g, colour, width = 10, core = '#ffffff') {
    if (this.n < 2) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 1; k < this.n; k++) {
        const i0 = (this.head + k - 1) % this.max, i1 = (this.head + k) % this.max;
        const age = (this.now - this.t[i1]) / this.life, a = clamp(1 - age) * (k / this.n);
        g.strokeStyle = pass ? rgba(core, a * 0.9) : rgba(colour, a * 0.45);
        g.lineWidth = pass ? width * 0.28 * (0.3 + 0.7 * k / this.n) : width * (0.3 + 0.7 * k / this.n);
        g.beginPath(); g.moveTo(this.x[i0], this.y[i0]); g.lineTo(this.x[i1], this.y[i1]); g.stroke();
      }
    }
    g.restore();
  }
  clear() { this.n = 0; }
}

// ---------------------------------------------------------------- ripples --
export class Ripples {
  constructor(max = 24) { this.max = max; this.x = new Float32Array(max); this.y = new Float32Array(max); this.r = new Float32Array(max); this.v = new Float32Array(max); this.a = new Float32Array(max); this.col = new Array(max).fill('#ffffff'); this.n = 0; }
  add(x, y, { speed = 90, alpha = 0.8, colour = '#ffffff', r = 4 } = {}) {
    const i = this.n < this.max ? this.n++ : 0;
    this.x[i] = x; this.y[i] = y; this.r[i] = r; this.v[i] = speed; this.a[i] = alpha; this.col[i] = colour;
  }
  update(dt) {
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      const a = this.a[i] - dt * 0.7; if (a <= 0) continue;
      this.x[j] = this.x[i]; this.y[j] = this.y[i]; this.r[j] = this.r[i] + this.v[i] * dt; this.v[j] = this.v[i] * Math.pow(0.985, dt * 60); this.a[j] = a; this.col[j] = this.col[i]; j++;
    }
    this.n = j;
  }
  draw(g, squash = 1) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.n; i++) {
      g.strokeStyle = rgba(this.col[i], this.a[i]); g.lineWidth = 1.5 + this.a[i] * 2;
      g.beginPath(); g.ellipse(this.x[i], this.y[i], this.r[i], this.r[i] * squash, 0, 0, TAU); g.stroke();
    }
    g.restore();
  }
  get active() { return this.n > 0; }
}

// ---------------------------------------------------------------- physics --
/** Critically-dampable 1D spring. */
export class Spring {
  constructor(value = 0, { stiffness = 120, damping = 14 } = {}) { this.x = value; this.v = 0; this.target = value; this.k = stiffness; this.c = damping; }
  update(dt) { const f = -this.k * (this.x - this.target) - this.c * this.v; this.v += f * dt; this.x += this.v * dt; return this.x; }
  set(v) { this.x = v; this.target = v; this.v = 0; }
  get settled() { return Math.abs(this.x - this.target) < 0.001 && Math.abs(this.v) < 0.01; }
}
export class Spring2 {
  constructor(x = 0, y = 0, opts) { this.sx = new Spring(x, opts); this.sy = new Spring(y, opts); }
  to(x, y) { this.sx.target = x; this.sy.target = y; }
  set(x, y) { this.sx.set(x); this.sy.set(y); }
  update(dt) { this.sx.update(dt); this.sy.update(dt); }
  get x() { return this.sx.x; } get y() { return this.sy.x; }
  get settled() { return this.sx.settled && this.sy.settled; }
}

/** Verlet rope/ribbon (for cords, ribbons, tethers). */
export class Rope {
  constructor(n, x0, y0, x1, y1, { gravity = 320, iterations = 6, slack = 1 } = {}) {
    this.n = n; this.x = new Float32Array(n); this.y = new Float32Array(n); this.px = new Float32Array(n); this.py = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / (n - 1); this.x[i] = this.px[i] = lerp(x0, x1, t); this.y[i] = this.py[i] = lerp(y0, y1, t); }
    this.seg = (dist(x0, y0, x1, y1) / (n - 1)) * slack; this.gravity = gravity; this.iter = iterations; this.pinA = true; this.pinB = true;
  }
  pin(i, x, y) { this.x[i] = this.px[i] = x; this.y[i] = this.py[i] = y; }
  update(dt, ax, ay, bx, by) {
    for (let i = 0; i < this.n; i++) {
      const vx = (this.x[i] - this.px[i]) * 0.985, vy = (this.y[i] - this.py[i]) * 0.985;
      this.px[i] = this.x[i]; this.py[i] = this.y[i];
      this.x[i] += vx; this.y[i] += vy + this.gravity * dt * dt;
    }
    for (let k = 0; k < this.iter; k++) {
      if (this.pinA && ax != null) { this.x[0] = ax; this.y[0] = ay; }
      if (this.pinB && bx != null) { this.x[this.n - 1] = bx; this.y[this.n - 1] = by; }
      for (let i = 0; i < this.n - 1; i++) {
        const dx = this.x[i + 1] - this.x[i], dy = this.y[i + 1] - this.y[i], d = Math.hypot(dx, dy) || 1e-4, f = (d - this.seg) / d * 0.5;
        if (!(i === 0 && this.pinA)) { this.x[i] += dx * f; this.y[i] += dy * f; } else { this.x[i + 1] -= dx * f; this.y[i + 1] -= dy * f; }
        if (!(i + 1 === this.n - 1 && this.pinB)) { this.x[i + 1] -= dx * f; this.y[i + 1] -= dy * f; } else { this.x[i] += dx * f; this.y[i] += dy * f; }
      }
    }
  }
  /** current stretch ratio (1 = rest length) */
  get tension() { let L = 0; for (let i = 0; i < this.n - 1; i++) L += dist(this.x[i], this.y[i], this.x[i + 1], this.y[i + 1]); return L / (this.seg * (this.n - 1)); }
  path(g) { g.beginPath(); g.moveTo(this.x[0], this.y[0]); for (let i = 1; i < this.n - 1; i++) { const mx = (this.x[i] + this.x[i + 1]) / 2, my = (this.y[i] + this.y[i + 1]) / 2; g.quadraticCurveTo(this.x[i], this.y[i], mx, my); } g.lineTo(this.x[this.n - 1], this.y[this.n - 1]); }
}

// --------------------------------------------------------------- hypnosis --
/** Slowly turning luminous spiral (hypnotic depth element). */
export function spiral(g, cx, cy, r, t, colour, { arms = 3, turns = 2.2, alpha = 0.5, width = 2 } = {}) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let a = 0; a < arms; a++) {
    g.beginPath();
    for (let i = 0; i <= 90; i++) {
      const k = i / 90, ang = t + (a / arms) * TAU + k * turns * TAU, rr = r * k;
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = rgba(colour, alpha); g.lineWidth = width; g.stroke();
  }
  g.restore();
}
/** Concentric breathing rings (hypnotic halo). */
export function halo(g, cx, cy, r, t, colour, { rings = 5, alpha = 0.35, speed = 0.25 } = {}) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < rings; i++) {
    const k = ((i / rings) + t * speed) % 1, rr = r * (0.25 + k * 0.85);
    g.strokeStyle = rgba(colour, alpha * Math.sin(k * Math.PI)); g.lineWidth = 1.5 + 2 * (1 - k);
    g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.stroke();
  }
  g.restore();
}
/** Field of slowly twinkling motes (cheap, deterministic). */
const moteCache = new Map();
export function motes(g, x, y, w, h, t, colour, { n = 40, alpha = 0.6, seed = 3, size = 2 } = {}) {
  const key = seed * 1000 + n;
  let m = moteCache.get(key);
  if (!m) { const r = rng(seed); m = new Float32Array(n * 5); for (let i = 0; i < n * 5; i++) m[i] = r(); moteCache.set(key, m); }
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = colour;
  for (let i = 0; i < n; i++) {
    const o = i * 5, px = x + m[o] * w, py = y + ((m[o + 1] * h - t * (8 + m[o + 2] * 14)) % h + h) % h, tw = 0.5 + 0.5 * Math.sin(t * (1 + m[o + 3] * 2) + i);
    g.globalAlpha = alpha * tw; g.beginPath(); g.arc(px, py, size * (0.5 + m[o + 4]), 0, TAU); g.fill();
  }
  g.restore();
}

// ------------------------------------------------------------------- text --
/** Wrap text into lines that fit maxWidth (measures with the current font). */
export function wrap(g, text, maxWidth, maxLines = 3) {
  const words = String(text).split(/\s+/).filter(Boolean); const lines = []; let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width <= maxWidth || !line) line = test; else { lines.push(line); line = w; }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  return lines;
}
export const FONT = '"Fredoka", ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
/**
 * Glowing, legible label (the person's words on an object). Always readable:
 * dark halo underneath, light ink, optional coloured glow.
 */
export function label(g, text, x, y, { size = 16, weight = 600, colour = '#ffffff', glowColour = '#ffd98a', glowA = 0.6, maxWidth = 260, lines = 2, align = 'center', alpha = 1, plate = true } = {}) {
  if (!text || alpha <= 0) return { w: 0, h: 0 };
  g.save();
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
  const ls = wrap(g, text, maxWidth, lines), lh = size * 1.22, h = ls.length * lh;
  let w = 0; for (const l of ls) w = Math.max(w, g.measureText(l).width);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.globalAlpha = alpha;
  if (plate) {
    g.fillStyle = 'rgba(10,6,30,0.55)';
    roundRect(g, x0 - 10, y - h / 2 - 6, w + 20, h + 12, Math.min(18, (h + 12) / 2)); g.fill();
  }
  if (glowA > 0) glow(g, x, y, Math.max(w, h) * 0.75, glowColour, glowA * 0.35 * alpha);
  g.fillStyle = colour; g.shadowColor = 'rgba(5,3,20,0.9)'; g.shadowBlur = 6;
  ls.forEach((l, i) => g.fillText(l, x, y - h / 2 + lh * (i + 0.5)));
  g.restore();
  return { w: w + 20, h: h + 12 };
}
/** Text bent along a circular arc (etched on rims, dials, shells). */
export function arcText(g, text, cx, cy, r, startAngle, { size = 14, colour = '#ffffff', glowColour = '#ffd98a', alpha = 1, inward = false, maxSweep = Math.PI * 1.4 } = {}) {
  if (!text || alpha <= 0) return;
  g.save(); g.font = `600 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = alpha;
  let s = String(text); let total = g.measureText(s).width / r;
  while (total > maxSweep && s.length > 4) { s = s.slice(0, -2); total = g.measureText(s + '…').width / r; }
  if (s !== String(text)) s += '…';
  let a = startAngle - total / 2;
  for (const ch of s) {
    const cw = g.measureText(ch).width / r; a += cw / 2;
    g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a + (inward ? -Math.PI / 2 : Math.PI / 2));
    g.shadowColor = glowColour; g.shadowBlur = 8; g.fillStyle = colour; g.fillText(ch, 0, 0); g.restore();
    a += cw / 2;
  }
  g.restore();
}

// ----------------------------------------------------------------- shapes --
export function roundRect(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** Soft drop shadow ellipse under an object (grounds it in the scene). */
export function shadow(g, x, y, rx, ry, a = 0.35) {
  g.save(); const gr = g.createRadialGradient(x, y, 0, x, y, rx);
  gr.addColorStop(0, `rgba(0,0,10,${a})`); gr.addColorStop(1, 'rgba(0,0,10,0)');
  g.fillStyle = gr; g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore();
}
/** Glossy sphere / bead (premium material). */
export function orb(g, x, y, r, colour, { alpha = 1, light = '#ffffff' } = {}) {
  g.save(); g.globalAlpha = alpha;
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  gr.addColorStop(0, mix(colour, light, 0.75)); gr.addColorStop(0.45, colour); gr.addColorStop(1, mix(colour, '#05031a', 0.55));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(light, 0.35);
  g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.42, r * 0.38, r * 0.2, -0.5, 0, TAU); g.fill();
  g.restore();
}
