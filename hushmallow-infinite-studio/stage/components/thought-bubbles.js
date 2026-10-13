// Overthinking thought bubbles.
//
// Glowing cloud bubbles that pop out of a Mallow's head (tail dots first,
// head → outward, like a real thought), bob while they're read, then get
// swept into an accelerating orbit as the spiral of thoughts takes over.
// On release they slow, lose their words and break apart into soft glowing
// particles (sampled from the bubble's own outline and lettering) that drift
// up into the night sky and fade like tiny stars.
//
// Everything is an analytic function of time, so any frame renders alone.
// Coordinates are world (stage CSS) pixels; draw inside the camera transform.
//
//   const field = new ThoughtField({ bubbles, minis, orbit, dissolve });
//   field.drawBack(ctx, t, head);   // parts behind the Mallow
//   field.drawFront(ctx, t, head);  // parts in front
//   field.events → [{t, type:'bubble'|'mini'|'dissolve', x, ...}] for sound sync

import { clamp, lerp, smoothstep, springStep, wobble, ease, fbm, TAU, makeCanvas, rng, track } from './anim.js';
import { BRAND } from './captions.js';

const INK = '#1d1650';

function cloudPath(ctx, w, h, seed = 1) {
  // a soft pill with gentle scalloped bumps — reads as "thought" at a glance
  const r = rng(seed);
  const rx = w / 2, ry = h / 2;
  const n = Math.max(9, Math.round((w + h) / 46));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    // superellipse-ish outline so long bubbles stay pill shaped
    const c = Math.cos(a), s = Math.sin(a);
    const k = 2.6;
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / k) * rx;
    const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / k) * ry;
    pts.push([x, y, a]);
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const len = Math.hypot(mx, my) || 1;
    const bump = (h * 0.13) * (0.85 + r() * 0.3);
    const cx = mx + (mx / len) * bump, cy = my + (my / len) * bump;
    if (i === 0) ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
  }
  ctx.closePath();
}

function glowDot(ctx, x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`);
  g.addColorStop(0.35, `rgba(${col},${a * 0.55})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

class Bubble {
  constructor(spec, i, fontSize) {
    this.spec = spec;
    this.i = i;
    this.mini = !!spec.glyph;
    this.fontSize = spec.size || (this.mini ? 46 : fontSize);
    this.lines = spec.lines || [spec.glyph];
    this.sprite = null;
    this.samples = null;
  }

  _build(ctx) {
    const fs = this.fontSize;
    ctx.save();
    ctx.font = `${this.mini ? 700 : 600} ${fs}px ${BRAND.font}`;
    const tw = Math.max(...this.lines.map((l) => ctx.measureText(l).width));
    ctx.restore();
    const lh = fs * 1.12;
    const th = lh * this.lines.length;
    let w = tw + fs * 1.5, h = th + fs * 0.95;
    if (this.mini) { const d = Math.max(w, h) * 0.86; w = d; h = d; }
    this.w = w; this.h = h;
    const pad = Math.ceil(h * 0.7);
    // supersampled 2×: the camera enlarges world px 1.5–1.9×, so 1× sprites
    // would make the joke text visibly softer than the screen-space captions
    const S = 2;
    const cw = w + pad * 2, ch = h + pad * 2;
    this.S = S; this.cw = cw; this.ch = ch;
    const c = makeCanvas(cw * S, ch * S);
    const g = c.getContext('2d');
    g.scale(S, S);
    g.translate(cw / 2, ch / 2);
    // outer glow (shadowBlur ignores the transform, so scale it by hand)
    g.save();
    g.shadowColor = 'rgba(190,170,255,0.95)';
    g.shadowBlur = h * 0.42 * S;
    cloudPath(g, w, h, 11 + this.i * 7);
    g.fillStyle = 'rgba(236,230,255,0.96)';
    g.fill();
    g.restore();
    // pearly body: lavender-white with a soft cool rim
    cloudPath(g, w, h, 11 + this.i * 7);
    const bg = g.createLinearGradient(0, -h / 2, 0, h / 2);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.55, '#f1ecff');
    bg.addColorStop(1, '#d9cdfb');
    g.fillStyle = bg;
    g.fill();
    g.save();
    g.clip();
    // inner rim tint (iridescent edge)
    const rg = g.createRadialGradient(0, 0, Math.min(w, h) * 0.3, 0, 0, Math.max(w, h) * 0.62);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.75, 'rgba(185,166,255,0.18)');
    rg.addColorStop(1, 'rgba(143,208,255,0.42)');
    g.fillStyle = rg;
    g.fillRect(-w, -h, w * 2, h * 2);
    // specular highlight
    g.globalAlpha = 0.85;
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.ellipse(-w * 0.26, -h * 0.3, w * 0.16, h * 0.09, -0.15, 0, TAU);
    g.fill();
    g.restore();
    // crisp lavender outline
    cloudPath(g, w, h, 11 + this.i * 7);
    g.strokeStyle = 'rgba(150,128,240,0.65)';
    g.lineWidth = Math.max(2, fs * 0.06);
    g.stroke();
    this.body = c;
    // text layer (separate so words can fade before the shell dissolves)
    const tc = makeCanvas(c.width, c.height);
    const tg = tc.getContext('2d');
    tg.scale(S, S);
    tg.translate(cw / 2, ch / 2);
    tg.font = `${this.mini ? 700 : 600} ${fs}px ${BRAND.font}`;
    tg.textAlign = 'center';
    tg.textBaseline = 'middle';
    tg.fillStyle = INK;
    this.lines.forEach((l, k) => tg.fillText(l, 0, (k - (this.lines.length - 1) / 2) * lh + fs * 0.04));
    this.text = tc;
    this.pad = pad;
    // particle samples from outline + lettering
    const R = rng(97 + this.i * 13);
    const samples = [];
    const td = tg.getImageData(0, 0, tc.width, tc.height).data;
    let tries = 0;
    const wantText = this.mini ? 10 : 46;
    while (samples.length < wantText && tries < 40000) {
      tries++;
      const x = Math.floor(R() * tc.width), y = Math.floor(R() * tc.height);
      if (td[(y * tc.width + x) * 4 + 3] > 140) samples.push({ x: x / S - cw / 2, y: y / S - ch / 2, text: true });
    }
    const nEdge = this.mini ? 16 : 54;
    for (let k = 0; k < nEdge; k++) {
      const a = (k / nEdge) * TAU + R() * 0.1;
      const c2 = Math.cos(a), s2 = Math.sin(a);
      const kk = 2.6;
      samples.push({
        x: Math.sign(c2) * Math.pow(Math.abs(c2), 2 / kk) * (w / 2 + h * 0.08),
        y: Math.sign(s2) * Math.pow(Math.abs(s2), 2 / kk) * (h / 2 + h * 0.08), text: false,
      });
    }
    for (const s of samples) {
      s.vx = (s.x / (w * 0.5)) * R.range(18, 60) + R.range(-14, 14);
      s.vy = R.range(-95, -35) + (s.y / h) * 30;
      s.life = R.range(1.6, 2.8);
      s.size = s.text ? R.range(3.5, 6.5) : R.range(4, 8);
      s.tw = R.range(0, TAU);
      s.hue = R();
      s.delay = R.range(0, 0.1) + (s.text ? 0 : 0.04);   // born where the letters were
    }
    this.samples = samples;
  }
}

export class ThoughtField {
  /**
   * opts.bubbles: [{ lines:[...], appearAt, home:[dx,dy] (from head) }]
   * opts.minis:   [{ glyph, appearAt, home:[dx,dy], size }]
   * opts.orbit:   { start, full, rx, ry, cy, speed: [[t, rad/s], ...] }
   * opts.dissolve:{ at, stagger }
   * opts.stress:  (t) → 0..1 (jitter / rim pulse)
   */
  constructor(opts) {
    this.o = { fontSize: 50, ...opts };
    this.items = [
      ...opts.bubbles.map((b, i) => new Bubble(b, i, this.o.fontSize)),
      ...(opts.minis || []).map((m, i) => new Bubble(m, 10 + i, this.o.fontSize)),
    ];
    this.built = false;
    // orbit angle integral, precomputed at 1/240 s
    const sp = this.o.orbit.speed;
    const T = 16, h = 1 / 240;
    this.angTable = new Float32Array(Math.ceil(T / h) + 2);
    let acc = 0;
    for (let k = 1; k < this.angTable.length; k++) {
      acc += track(sp, (k - 0.5) * h) * h;
      this.angTable[k] = acc;
    }
    this.events = [];
    for (const it of this.items) {
      const s = it.spec;
      // tail dots pop first: 3 dots × 70 ms, then the bubble
      const popAt = s.appearAt + (it.mini ? 0 : 0.21);
      this.events.push({ t: popAt, type: it.mini ? 'mini' : 'bubble', id: it.i, pan: clamp((s.home?.[0] || 0) / 420, -1, 1) });
      if (!it.mini) for (let d = 0; d < 3; d++) this.events.push({ t: s.appearAt + d * 0.07, type: 'tail', id: it.i, step: d, pan: clamp((s.home?.[0] || 0) / 600, -1, 1) });
    }
    const D = this.o.dissolve;
    this.items.forEach((it, k) => this.events.push({ t: D.at + this._dissolveDelay(it, k), type: it.mini ? 'dissolveMini' : 'dissolve', id: it.i }));
    this.events.sort((a, b) => a.t - b.t);
  }

  _dissolveDelay(it, k) {
    const D = this.o.dissolve;
    return it.mini ? 0.05 * (k % 5) : D.stagger * it.i;
  }

  angle(t) {
    const h = 1 / 240;
    const u = clamp(t, 0, 15.99) / h;
    const k = Math.floor(u), f = u - k;
    return lerp(this.angTable[k], this.angTable[k + 1], f);
  }

  _ensure(ctx) {
    if (this.built) return;
    for (const it of this.items) it._build(ctx);
    this.built = true;
  }

  // world position + depth of an item at t, relative to the head anchor
  _place(it, t, head) {
    const o = this.o, ob = o.orbit;
    const s = it.spec;
    const n = this.items.length;
    const home = s.home || [0, -200];
    const bob = Math.sin(t * 1.6 + it.i * 1.9) * 9 + Math.sin(t * 0.7 + it.i) * 5;
    let x = head.x + home[0], y = head.y + home[1] + bob, z = 1;
    const om = smoothstep(ob.start, ob.full, t) * (it.mini ? 1 : 1);
    if (om > 0) {
      const ex = ob.expand ? ob.expand(t) : 1;      // vertical spread
      const exX = 1 + (ex - 1) * 0.2;                 // barely widen (stay inside the frame)
      const lift = ob.lift ? ob.lift(t) : 0;
      const base = Math.atan2((home[1] - ob.cy) / ob.ry, home[0] / ob.rx);
      const a = base + this.angle(t) * (it.mini ? 1.35 : 1) - this.angle(ob.start) * (it.mini ? 1.35 : 1);
      const rr = it.mini ? 1.18 : 1;
      const ox = head.x + Math.cos(a) * ob.rx * rr * exX;
      const oy = head.y + ob.cy + lift + Math.sin(a) * ob.ry * rr * ex + bob * 0.5;
      x = lerp(x, ox, om); y = lerp(y, oy, om);
      z = lerp(1, Math.sin(a), om);   // + front / - behind
    }
    if (o.topSafe) y = Math.max(y, o.topSafe(t) + (it.h || 0) * 0.5);
    // stress jitter
    const st = o.stress ? o.stress(t) : 0;
    // (kept tiny: the brand avoids shaking text)
    x += fbm(t * 5 + it.i * 3.3, it.i) * 3 * st;
    y += fbm(t * 5 + it.i * 5.1, it.i + 3) * 3 * st;
    return { x, y, z, om };
  }

  _drawItem(ctx, it, t, head) {
    const s = it.spec;
    const ta = t - s.appearAt;
    if (ta < 0) return;
    const D = this.o.dissolve;
    const dAt = D.at + this._dissolveDelay(it, this.items.indexOf(it));
    const p = this._place(it, t, head);
    const depthS = 0.8 + 0.2 * (p.z * 0.5 + 0.5);
    const kz = p.z * 0.5 + 0.5;
    let depthA = it.mini ? 0.55 + 0.45 * kz : 0.92 + 0.08 * kz;   // word plates stay opaque
    if (it.mini && this.built) {
      for (const o of this.items) {
        if (o.mini || t < o.spec.appearAt + 0.21) continue;
        const q = this._place(o, t, head);
        const d = Math.max(Math.abs(p.x - q.x) / ((o.w + it.w) * 0.5), Math.abs(p.y - q.y) / ((o.h + it.h) * 0.5));
        depthA *= smoothstep(0.9, 1.2, d);
      }
    }
    // --- tail dots (head → bubble), fade once the orbit takes over
    if (!it.mini) {
      const tailA = (1 - smoothstep(this.o.orbit.start, this.o.orbit.start + 0.6, t)) * (1 - smoothstep(dAt - 0.2, dAt, t));
      for (let d = 0; d < 3; d++) {
        const td = ta - d * 0.07;
        if (td < 0 || tailA <= 0.01) continue;
        const k = springStep(td, 3, 0.4);
        const u = 0.26 + d * 0.22;
        const hx = head.x + (s.tailFrom?.[0] || 0), hy = head.y + (s.tailFrom?.[1] || 0);
        const x = lerp(hx, p.x, u), y = lerp(hy, p.y + it.h * 0.25, u);
        const r = (7 + d * 5.5) * k;
        ctx.save();
        ctx.globalAlpha = tailA;
        glowDot(ctx, x, y, r * 2.6, '200,185,255', 0.5);
        ctx.fillStyle = '#f2edff';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(150,128,240,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
    // --- the bubble
    const tb = ta - (it.mini ? 0 : 0.21);
    if (tb < 0) return;
    const shellA = 1 - smoothstep(dAt - 0.02, dAt + 0.16, t);
    if (shellA > 0.004) {
      const sp = it.mini ? springStep(tb, 3.2, 0.36) : springStep(tb, 2.4, 0.62);
      const wob = wobble(tb, 3.4, 5.5) * (it.mini ? 1 : 0.36);
      const breathe = 1 + 0.018 * Math.sin(t * 2.1 + it.i);
      // dissolve swell: a soft inhale-like expansion right before breaking
      const swell = 1 + 0.12 * smoothstep(dAt - 0.25, dAt + 0.3, t);
      const orbitShrink = 1 - 0.14 * p.om;
      const sc = sp * depthS * breathe * swell * orbitShrink;
      const sx = sc * (1 + 0.14 * wob), sy = sc * (1 - 0.14 * wob);
      const st = this.o.stress ? this.o.stress(t) : 0;
      const w = Math.abs(track(this.o.orbit.speed, t)) * p.om;
      if (w > 1.2) {
        const k = smoothstep(1.2, 3.2, w);
        for (const [lag, al] of [[0.022, 0.2], [0.044, 0.1]]) {
          const q = this._place(it, t - lag, head);
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.scale(sx, sy);
          ctx.globalAlpha = al * k * shellA * depthA;
          ctx.drawImage(it.body, -it.cw / 2, -it.ch / 2, it.cw, it.ch);
          ctx.restore();
        }
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(wob * (it.mini ? 0.06 : 0.055) + Math.sin(t * 1.3 + it.i) * (it.mini ? 0.02 : 0.01));
      ctx.scale(sx, sy);
      ctx.globalAlpha = clamp(tb / 0.08) * shellA * depthA;
      // anxious rim pulse: a warm pink halo that throbs with stress
      if (st > 0.05) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 9 + it.i * 2);
        glowDot(ctx, 0, 0, Math.max(it.w, it.h) * 0.85, '255,140,200', 0.22 * st * (0.6 + 0.4 * pulse));
      }
      ctx.drawImage(it.body, -it.cw / 2, -it.ch / 2, it.cw, it.ch);
      const textA = 1 - smoothstep(dAt - 0.04, dAt + 0.1, t);   // words hold until the break
      if (textA > 0.004) {
        // words arrive once the shell has landed (no bouncing text)
        ctx.globalAlpha *= textA * (it.mini ? clamp((tb - 0.06) / 0.12) : clamp((tb - 0.16) / 0.14));
        ctx.drawImage(it.text, -it.cw / 2, -it.ch / 2, it.cw, it.ch);
      }
      ctx.restore();
    }
    // --- dissolve particles
    const td = t - dAt;
    if (td > 0 && td < 4) {
      const dep = depthS;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const q of it.samples) {
        const tq = td - q.delay;
        if (tq < 0 || tq > q.life) continue;
        const u = tq / q.life;
        // eased drift: burst outward, then float up and slow down
        const k = 1 - Math.exp(-tq * 1.6);
        const x = p.x + q.x * dep + q.vx * k * 1.2 + Math.sin(tq * 1.7 + q.tw) * 10;
        const y = p.y + q.y * dep + q.vy * k * 1.6 - tq * tq * 9;
        // born at full glow (the bubble breaks into light), then fades out
        const a = smoothstep(0, 0.08, tq) * (1 - smoothstep(0.5, 1, u)) * (0.65 + 0.35 * Math.sin(tq * 7 + q.tw));
        const col = q.hue < 0.45 ? '255,236,190' : q.hue < 0.8 ? '214,200,255' : '190,232,255';
        const r = q.size * (1 - u * 0.5);
        glowDot(ctx, x, y, r * 2.6, col, 0.3 * a);
        ctx.fillStyle = `rgba(255,250,236,${0.75 * a})`;
        ctx.beginPath(); ctx.arc(x, y, r * 0.36, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  // glyph minis are always painted first (back pass), so no mini can ever sit
  // over a worded thought, whichever pass that thought lands in
  drawBack(ctx, t, head) {
    this._ensure(ctx);
    const items = this._sorted(t, head);
    for (const it of items) if (it.mini) this._drawItem(ctx, it, t, head);
    for (const it of items) if (!it.mini && this._place(it, t, head).z < -0.05) this._drawItem(ctx, it, t, head);
  }

  drawFront(ctx, t, head) {
    this._ensure(ctx);
    for (const it of this._sorted(t, head)) if (!it.mini && this._place(it, t, head).z >= -0.05) this._drawItem(ctx, it, t, head);
  }

  _sorted(t, head) {
    // glyph minis always sit behind worded thoughts so they never cover words
    const key = (it) => this._place(it, t, head).z + (it.mini ? -10 : 0);
    return [...this.items].sort((a, b) => key(a) - key(b));
  }

  /** World positions of visible bubbles (for eye-tracking). */
  positions(t, head) {
    const out = [];
    for (const it of this.items) {
      const s = it.spec;
      if (t < s.appearAt + 0.21) continue;
      const D = this.o.dissolve;
      if (t > D.at + this._dissolveDelay(it, this.items.indexOf(it))) continue;
      const p = this._place(it, t, head);
      out.push({ ...p, mini: it.mini, i: it.i, appearAt: s.appearAt });
    }
    return out;
  }
}
