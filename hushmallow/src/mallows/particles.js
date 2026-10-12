// Screen-space particles around a Mallow.  Every Mallow's celebration and
// reaction uses its own particle language (Glitzi shards, Blubi droplets,
// Zuzu rings, Boppo golden pops, Pipzi sparks, Loomi ribbons, Noomi moon
// stars) so their payoffs are instantly recognisable.

import { drawStar, drawHeart, drawDrop } from './shapes.js';

const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const MAX = 90;

export class ParticleField {
  constructor(rig) {
    this.rig = rig;
    this.list = [];
    this.acc = {};
    this.cloud = 0;
  }

  // body geometry in screen space (MallowTouch passes the deformed mesh bounds)
  geo() {
    const o = this.rig.geoOverride?.();
    if (o) return o;
    const r = this.rig;
    const [bx0, by0, bx1, by1] = r.mallow.bodyBox;
    const w = (bx1 - bx0) * r.S, h = (by1 - by0) * r.S;
    const lift = r.body.hop * r.H;
    return { cx: r.CX, top: r.BASE - h - lift, bottom: r.BASE - lift, w, h, mid: r.BASE - h / 2 - lift };
  }

  face(sx, sy) {
    const o = this.rig.faceOverride?.(sx, sy);
    if (o) return o;
    const r = this.rig;
    const [bx0, , bx1, by1] = r.mallow.bodyBox;
    const lift = r.body.hop * r.H;
    return { x: r.CX + (sx - (bx0 + bx1) / 2) * r.S, y: r.BASE - (by1 - sy) * r.S - lift };
  }

  burst(spec, opts = {}) {
    const list = Array.isArray(spec) ? spec : [spec];
    const rm = this.rig.opts.reducedMotion;
    for (const s of list) {
      const n = Math.max(1, Math.round((s.n || 4) * (rm ? 0.35 : 1)));
      for (let i = 0; i < n; i++) this.spawn(s.kind, i, n, opts);
    }
  }

  spawn(kind, i = 0, n = 1, opts = {}) {
    if (this.list.length >= MAX) this.list.shift();
    const g = this.geo();
    const m = this.rig.mallow;
    const rm = this.rig.opts.reducedMotion;
    const sp = rm ? 0.4 : 1;
    const p = { kind, age: 0, life: 1.2, x: g.cx, y: g.mid, vx: 0, vy: 0, size: g.w * 0.05, rot: 0, vr: 0,
      g: 0, drag: 1.5, col: m.colours.accent, alpha: 1 };
    const ang = (i / n) * TAU + rand(-0.3, 0.3);
    switch (kind) {
      case 'spark': {
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const v = rand(g.w * 1.2, g.w * 2.6) * sp;
        Object.assign(p, { x: g.cx + rand(-g.w * 0.2, g.w * 0.2), y: g.top + g.h * 0.25, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g: g.h * 2.2, life: rand(0.7, 1.2), size: rand(g.w * 0.03, g.w * 0.06),
          col: ['#ffd84a', '#ff7ae0', '#7af0ff', '#ffffff', '#ff9a3d'][(Math.random() * 5) | 0], trail: [] });
        break;
      }
      case 'star': case 'moon': {
        const a = rand(0, TAU);
        const rr = rand(g.w * 0.45, g.w * 0.8);
        Object.assign(p, { x: g.cx + Math.cos(a) * rr, y: g.mid + Math.sin(a) * rr * 0.75, vy: -g.h * 0.12 * sp,
          life: rand(1.2, 2.2), size: rand(g.w * 0.025, g.w * 0.05), col: kind === 'moon' ? '#fff3c4' : '#ffffff', twinkle: rand(0, 6) });
        break;
      }
      case 'heart': case 'pixelHeart': {
        Object.assign(p, { x: g.cx + rand(-g.w * 0.4, g.w * 0.4), y: g.top + g.h * 0.2, vx: rand(-20, 20) * sp, vy: -rand(g.h * 0.25, g.h * 0.45) * sp,
          life: rand(1.4, 2), size: rand(g.w * 0.07, g.w * 0.11), col: kind === 'pixelHeart' ? '#ff3df2' : '#ff5fa8', drag: 0.6, wob: rand(0, 6) });
        break;
      }
      case 'drop': {
        const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
        const v = rand(g.w * 0.8, g.w * 1.6) * sp;
        Object.assign(p, { x: g.cx + rand(-g.w * 0.3, g.w * 0.3), y: g.top + g.h * 0.15, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g: g.h * 3, life: rand(0.9, 1.4), size: rand(g.w * 0.035, g.w * 0.055) });
        break;
      }
      case 'tear': {
        const pos = this.face(opts.x, opts.y);
        Object.assign(p, { x: pos.x, y: pos.y, vx: rand(-8, 8), vy: 10, g: g.h * 1.6, life: 1.1, size: g.w * 0.03 });
        break;
      }
      case 'rain': {
        Object.assign(p, { x: g.cx + rand(-g.w * 0.3, g.w * 0.3), y: g.top - g.h * 0.32, vy: g.h * 0.9, g: g.h * 1.2, life: 0.55,
          size: g.w * 0.018, col: '#9fd8ff' });
        break;
      }
      case 'shard': {
        const v = rand(g.w * 0.8, g.w * 2) * sp;
        Object.assign(p, { x: g.cx + rand(-g.w * 0.35, g.w * 0.35), y: g.mid + rand(-g.h * 0.3, g.h * 0.3), vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v * 0.5, life: rand(0.5, 0.9), size: rand(g.w * 0.03, g.w * 0.09), drag: 4,
          col: ['#3ee8ff', '#ff3df2', '#ffffff', '#7a5cff'][(Math.random() * 4) | 0], h2: rand(0.15, 0.35) });
        break;
      }
      case 'ring': {
        Object.assign(p, { x: g.cx, y: g.kind === 'zuzu' ? g.mid : g.bottom - g.h * 0.02, life: rand(1, 1.5) + i * 0.15,
          size: g.w * 0.3, grow: g.w * (0.9 + i * 0.2), col: m.colours.glow, delay: i * 0.18 });
        if (this.rig.id === 'zuzu') p.y = g.mid;
        break;
      }
      case 'pop': {
        const v = rand(g.w * 1.1, g.w * 2.2) * sp;
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        Object.assign(p, { x: g.cx, y: g.top + g.h * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: g.h * 2.6,
          life: rand(0.8, 1.3), size: rand(g.w * 0.04, g.w * 0.075), col: ['#ffd23a', '#ffb12a', '#fff1a0', '#ff8a3d'][(Math.random() * 4) | 0] });
        break;
      }
      case 'ribbon': {
        Object.assign(p, { x: g.cx + rand(-g.w * 0.5, g.w * 0.5), y: g.bottom, vy: -rand(g.h * 0.5, g.h * 0.9) * sp,
          life: rand(1.6, 2.4), size: g.w * 0.5, col: [m.colours.glow, m.colours.accent, '#ffffff'][(Math.random() * 3) | 0],
          phase: rand(0, TAU), drag: 0.4 });
        break;
      }
      case 'puff': {
        const mo = this.rig.mallow.face.mouth;
        const pos = this.face(mo.x, mo.y);
        Object.assign(p, { x: pos.x + rand(-8, 8), y: pos.y, vx: rand(-15, 15), vy: -rand(20, 40), life: rand(1, 1.6),
          size: g.w * rand(0.06, 0.1), col: 'rgba(255,255,255,0.7)', drag: 0.8 });
        break;
      }
      case 'steam': {
        const side = Math.random() < 0.5 ? -1 : 1;
        Object.assign(p, { x: g.cx + side * g.w * 0.38, y: g.top + g.h * 0.1, vx: side * rand(10, 30), vy: -rand(40, 80) * sp,
          life: rand(0.8, 1.2), size: g.w * rand(0.06, 0.1), col: 'rgba(255,255,255,0.75)', drag: 0.8 });
        break;
      }
      case 'z': {
        Object.assign(p, { x: g.cx + g.w * 0.35, y: g.top + g.h * 0.05, vx: rand(8, 20), vy: -rand(18, 30), life: 2.2,
          size: g.w * rand(0.07, 0.11), col: '#e7f0ff', drag: 0.3, wob: rand(0, 6) });
        break;
      }
      case 'question': case 'exclaim': case 'note': {
        if (this.list.some((q) => q.kind === kind)) return;
        Object.assign(p, { x: g.cx + g.w * (kind === 'note' ? rand(-0.5, 0.5) : 0.42), y: g.top, vy: kind === 'note' ? -30 : -6,
          life: kind === 'note' ? 1.6 : 1.4, size: g.w * 0.14, col: kind === 'exclaim' ? '#ffd84a' : '#ffffff', drag: 0.5, wob: rand(0, 6) });
        break;
      }
      case 'dust': {
        const side = i % 2 ? 1 : -1;
        Object.assign(p, { x: g.cx + side * g.w * 0.4, y: g.bottom, vx: side * rand(20, 50), vy: -rand(5, 15), life: 0.6,
          size: g.w * 0.05, col: 'rgba(255,255,255,0.35)', drag: 2 });
        break;
      }
      case 'cloud': {
        Object.assign(p, { x: g.cx + (i ? 1 : -1) * g.w * 0.45, y: g.top, vx: (i ? 1 : -1) * 12, vy: -12, life: 2.4,
          size: g.w * 0.16, col: 'rgba(255,248,230,0.85)', drag: 0.2 });
        break;
      }
      default:
        return;
    }
    this.list.push(p);
  }

  update(dt, v) {
    const rm = this.rig.opts.reducedMotion;
    // ambient emitters from expression parameters
    const emit = (key, rate, kind) => {
      const s = v[key];
      if (!(s > 0.04)) { this.acc[key] = 0; return; }
      this.acc[key] = (this.acc[key] || 0) + dt * rate * s * (rm ? 0.3 : 1);
      while (this.acc[key] >= 1) { this.acc[key] -= 1; this.spawn(kind); }
    };
    emit('fxSpark', 5, this.rig.id === 'glitzi' ? 'shard' : 'spark');
    emit('fxStar', 2.5, this.rig.id === 'noomi' ? 'moon' : 'star');
    emit('fxHeart', 1.4, this.rig.id === 'glitzi' ? 'pixelHeart' : 'heart');
    emit('fxSteam', 3, 'steam');
    emit('fxZzz', 0.7, 'z');
    emit('fxQuestion', 0.6, 'question');
    emit('fxExclaim', 0.6, 'exclaim');
    emit('fxNote', 1.1, 'note');
    emit('fxRain', 6, 'rain');
    this.cloud += ((v.fxRain > 0.05 ? 1 : 0) - this.cloud) * Math.min(1, dt * 3);
    // tears drip from the outer eye corners
    if (v.tears > 0.25) {
      this.acc.tear = (this.acc.tear || 0) + dt * v.tears * 1.4 * (rm ? 0.3 : 1);
      if (this.acc.tear >= 1) {
        this.acc.tear = 0;
        const e = this.rig.mallow.face.eyes[Math.random() < 0.5 ? 'L' : 'R'];
        const side = e === this.rig.mallow.face.eyes.L ? -1 : 1;
        this.spawn('tear', 0, 1, { x: e.x + side * (e.hw || e.rx) * 0.55, y: e.y + (e.ry || 30) * 3 });
      }
    }
    for (const p of this.list) {
      p.age += dt;
      if (p.delay && p.age < p.delay) continue;
      p.vy += p.g * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.trail) { p.trail.push([p.x, p.y]); if (p.trail.length > 6) p.trail.shift(); }
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }

  draw(ctx) {
    const g = this.geo();
    // a small rain cloud above sad Mallows
    if (this.cloud > 0.02) {
      ctx.save();
      ctx.globalAlpha = this.cloud * 0.9;
      const y = g.top - g.h * 0.32, w = g.w * 0.42;
      ctx.fillStyle = 'rgba(200,215,240,0.92)';
      for (const [dx, dy, r] of [[-0.3, 0.05, 0.22], [0, -0.06, 0.3], [0.3, 0.04, 0.22], [0.12, 0.1, 0.2], [-0.12, 0.1, 0.2]]) {
        ctx.beginPath(); ctx.arc(g.cx + dx * w * 1.6, y + dy * w, r * w, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    for (const p of this.list) {
      if (p.delay && p.age < p.delay) continue;
      const t = (p.age - (p.delay || 0)) / (p.life - (p.delay || 0));
      const fade = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.55) / 0.45);
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade) * p.alpha;
      switch (p.kind) {
        case 'spark': {
          if (p.trail?.length > 1) {
            ctx.strokeStyle = p.col; ctx.lineWidth = p.size * 0.35; ctx.lineCap = 'round';
            ctx.globalAlpha *= 0.5;
            ctx.beginPath(); p.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
            ctx.globalAlpha /= 0.5;
          }
          ctx.globalCompositeOperation = 'lighter';
          drawStar(ctx, p.x, p.y, p.size, p.col);
          break;
        }
        case 'star': case 'moon': {
          const tw = 0.6 + 0.4 * Math.sin(p.age * 8 + p.twinkle);
          ctx.globalCompositeOperation = 'lighter';
          drawStar(ctx, p.x, p.y, p.size * tw, p.col);
          break;
        }
        case 'heart': case 'pixelHeart': {
          const x = p.x + Math.sin(p.age * 4 + p.wob) * 6;
          if (p.kind === 'pixelHeart') {
            const s = p.size / 7;
            const map = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
            ctx.fillStyle = p.col;
            map.forEach((row, ry) => [...row].forEach((c, rx) => { if (c === 'X') ctx.fillRect(x + (rx - 3.5) * s, p.y + (ry - 3) * s, s * 0.92, s * 0.92); }));
          } else drawHeart(ctx, x, p.y, p.size, p.col, '#ffe0ef');
          break;
        }
        case 'drop': case 'tear': drawDrop(ctx, p.x, p.y, p.size); break;
        case 'rain': {
          ctx.strokeStyle = p.col; ctx.lineWidth = p.size * 0.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.size * 2.5); ctx.stroke();
          break;
        }
        case 'shard': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = p.col;
          ctx.fillRect(p.x - p.size, p.y - p.size * p.h2 / 2, p.size * 2, p.size * p.h2);
          break;
        }
        case 'ring': {
          const r = p.size + p.grow * t;
          ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1, g.w * 0.02 * (1 - t));
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, r, this.rig.id === 'zuzu' ? r : r * 0.28, 0, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'pop': {
          ctx.globalCompositeOperation = 'lighter';
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.5, p.col); gr.addColorStop(1, 'rgba(255,180,40,0)');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
          break;
        }
        case 'ribbon': {
          ctx.strokeStyle = p.col; ctx.lineWidth = g.w * 0.015; ctx.lineCap = 'round';
          ctx.beginPath();
          for (let k = 0; k <= 12; k++) {
            const u = k / 12;
            const x = p.x + Math.sin(p.phase + u * 5 + p.age * 3) * g.w * 0.06;
            const y = p.y + u * p.size * 0.6;
            k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
          break;
        }
        case 'puff': case 'steam': case 'dust': case 'cloud': {
          ctx.fillStyle = p.col;
          const r = p.size * (0.6 + t * 0.8);
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
          if (p.kind === 'cloud') { ctx.beginPath(); ctx.arc(p.x + r * 0.8, p.y + r * 0.2, r * 0.7, 0, TAU); ctx.arc(p.x - r * 0.8, p.y + r * 0.2, r * 0.7, 0, TAU); ctx.fill(); }
          break;
        }
        case 'z': case 'question': case 'exclaim': case 'note': {
          const ch = { z: 'z', question: '?', exclaim: '!', note: '♪' }[p.kind];
          const pop = Math.min(1, p.age / 0.18);
          const s = p.size * (0.6 + 0.4 * pop + (p.kind === 'exclaim' ? 0.1 * Math.sin(p.age * 12) : 0));
          ctx.font = `800 ${s}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = s * 0.16;
          ctx.strokeStyle = 'rgba(30,10,60,0.55)';
          const x = p.x + Math.sin(p.age * 3 + (p.wob || 0)) * 5;
          ctx.strokeText(ch, x, p.y);
          ctx.fillStyle = p.col;
          ctx.fillText(ch, x, p.y);
          break;
        }
        default: break;
      }
      ctx.restore();
    }
  }
}
