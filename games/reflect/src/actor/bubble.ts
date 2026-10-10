/* The Bubble actor: a squishy, springy character with timing. Bubbles anticipate (squash before a hop), overshoot,
 * wobble when they land, tremble when scared, fall over when they faint and bounce on every syllable they say.
 * Expressions come from the Bubble art; everything else (motion, particles, pictogram speech) is drawn here.
 * Positions are canvas pixels; (x, y) is the point the Bubble stands on (bottom centre), r its radius. */
import type { Slug } from '../room/protocol';
import type { Babble, Utter } from './babble';
import { Pict, PICTS, heartPath, starPath, rrect } from './picts';

export type Faces = (slug: string, mood: string) => CanvasImageSource | null;
type FxKind = 'tear' | 'sweat' | 'heart' | 'star' | 'note' | 'zzz' | 'confetti' | 'bang' | 'q' | 'spark' | 'puff' | 'orbit';
interface Fx { k: FxKind; x: number; y: number; vx: number; vy: number; life: number; max: number; rot: number; vr: number; s: number; c: string; }
interface Later { at: number; fn: () => void; }

const CONFETTI = ['#ffd166', '#ff8fb3', '#7fd8ff', '#a6f0a0', '#c3a6ff', '#ff9b5e'];
export type Emote = 'scream' | 'laugh' | 'cry' | 'love' | 'gasp' | 'cheer' | 'faint' | 'think' | 'sleep' | 'angry' | 'shy' | 'wow'
  | 'dizzy' | 'nod' | 'shake' | 'giggle' | 'uhoh' | 'yay' | 'huh' | 'cool' | 'sob' | 'hide' | 'bid' | 'talk' | 'quack';

export class BubbleActor {
  ox = 0; oy = 0; vx = 0; vy = 0;
  sx = 1; sy = 1; vsx = 0; vsy = 0;
  rot = 0; vrot = 0; restRot = 0;
  alpha = 1;
  mood = 'neutral';
  baseMood = 'neutral';
  facing = 1;
  scale = 1;            // overall size multiplier (animatable for hiding / growing)
  dim = 0;              // 0 lit … 1 silhouette (lights off)
  rim: string | null = null;   // coloured rim light, e.g. the sheet's glow
  label: string | null = null;
  sub: string | null = null;   // second label line (e.g. "Bubble companion")
  time = 0;
  fainted = false;
  airborne = false;
  prop: Pict | null = null;    // something held (tea, camera, paddle…)
  propSide = 1;
  private moodUntil = 0;
  private tremble = 0; private trembleAmp = 0;
  private shakeT = 0; private shakeAmp = 0;
  private tweens: { k: 'x' | 'y' | 'scale' | 'alpha'; from: number; to: number; t0: number; d: number; ease: (t: number) => number }[] = [];
  private later: Later[] = [];
  private fx: Fx[] = [];
  private speech: { pict: Pict; until: number; t0: number; think: boolean } | null = null;
  private idlePhase = Math.random() * 10;
  constructor(public slug: Slug, public x: number, public y: number, public r: number, public voice: Babble | null = null) {}

  /* ---------- timing helpers ---------- */
  after(sec: number, fn: () => void) { this.later.push({ at: this.time + sec, fn }); }
  setMood(m: string, dur = 0) { this.mood = m; this.moodUntil = dur > 0 ? this.time + dur : 0; if (dur <= 0) this.baseMood = m; }
  moveTo(x: number, y: number, d = 0.6, ease = (t: number) => 1 - Math.pow(1 - t, 3)) {
    this.tweens = this.tweens.filter(t => t.k !== 'x' && t.k !== 'y');
    this.tweens.push({ k: 'x', from: this.x, to: x, t0: this.time, d, ease }, { k: 'y', from: this.y, to: y, t0: this.time, d, ease });
  }
  tweenScale(to: number, d = 0.4) { this.tweens = this.tweens.filter(t => t.k !== 'scale'); this.tweens.push({ k: 'scale', from: this.scale, to, t0: this.time, d, ease: (t) => 1 - Math.pow(1 - t, 3) }); }
  fade(to: number, d = 0.4) { this.tweens = this.tweens.filter(t => t.k !== 'alpha'); this.tweens.push({ k: 'alpha', from: this.alpha, to, t0: this.time, d, ease: (t) => t }); }

  /* ---------- body motion ---------- */
  squash(k = 0.25) { this.sy = 1 - k; this.sx = 1 + k * 0.8; }
  stretch(k = 0.25) { this.sy = 1 + k; this.sx = 1 - k * 0.6; }
  hop(h = 0.8, n = 1, gap = 0.05) {
    if (this.fainted) return;
    const go = () => { this.squash(0.18); this.after(0.06, () => { this.vy = -Math.sqrt(2 * 30 * h) * this.r; this.airborne = true; this.stretch(0.16); }); };
    go();
    for (let i = 1; i < n; i++) this.after(i * (Math.sqrt(2 * h / 30) * 2 + gap + 0.06), go);
  }
  shake(d = 0.5, amp = 0.08) { this.shakeT = d; this.shakeAmp = amp; }
  shiver(d = 1.2, amp = 0.025) { this.tremble = d; this.trembleAmp = amp; }
  spin(turns = 1) { this.vrot += turns * 14; }
  faint(dir = 1) {
    if (this.fainted) return;
    this.fainted = true; this.restRot = dir * Math.PI * 0.5; this.vrot += dir * 4; this.setMood('dizzy', 0); this.emit('orbit', 3);
  }
  recover() { if (!this.fainted) return; this.fainted = false; this.restRot = 0; this.setMood('neutral', 0); this.fx = this.fx.filter(f => f.k !== 'orbit'); this.hop(0.5); }
  lean(a: number) { this.restRot = a; }

  /** Show a pictogram in a speech (or thought) bubble for `d` seconds. */
  speak(p: Pict | string, d = 1.6, think = false) { const pict = typeof p === 'string' ? (PICTS[p] || PICTS.dots) : p; this.speech = { pict, until: this.time + d, t0: this.time, think }; }

  /** Say something wordless; the body bounces on every syllable. */
  voiceSay(u: Utter, o: { vol?: number; n?: number; pitch?: number } = {}) {
    if (!this.voice) return 0.5;
    const r = this.voice.say(this.slug, u, o);
    for (const b of r.beats) this.after(b, () => { if (!this.fainted) { this.sy = Math.min(this.sy, 0.9); this.sx = Math.max(this.sx, 1.07); } });
    return r.dur;
  }

  /** A full reaction: expression + motion + particles + voice. Returns roughly how long it takes. */
  emote(e: Emote, o: { vol?: number; quiet?: boolean } = {}): number {
    const v = (u: Utter, extra: { n?: number; pitch?: number } = {}) => o.quiet ? 0.5 : this.voiceSay(u, { vol: o.vol, ...extra });
    switch (e) {
      case 'scream': this.setMood(this.slug === 'rush' ? 'cry' : 'surprised', 1.4); this.stretch(0.35); this.shiver(1.1, 0.035); this.emit('bang', 1); this.emit('sweat', 3); this.vy -= this.r * 3; this.airborne = true; v('scream'); return 1.2;
      case 'laugh': this.setMood('laugh', 1.6); this.hop(0.25, 3, 0.02); this.emit('note', 1); v('laugh', { n: 5 }); return 1.4;
      case 'giggle': this.setMood('laugh', 1.0); this.shiver(0.8, 0.02); v('giggle'); return 0.8;
      case 'cry': case 'sob': this.setMood('cry', 2.2); this.emit('tear', 6); this.squash(0.12); v('sob'); return 1.8;
      case 'love': this.setMood('love', 1.8); this.emit('heart', 4); this.hop(0.3); v('aww'); return 1.4;
      case 'gasp': this.setMood('surprised', 1.2); this.stretch(0.22); this.vx -= this.facing * this.r * 1.5; v('gasp'); return 0.8;
      case 'cheer': case 'yay': this.setMood('celebrate', 1.8); this.hop(0.9); this.emit('confetti', 14); v(e === 'yay' ? 'yay' : 'cheer'); return 1.4;
      case 'faint': this.setMood('dizzy', 0); v('uhoh'); this.after(0.25, () => this.faint(this.facing)); return 1.6;
      case 'think': this.setMood('think', 2.0); this.speak('q', 1.8, true); v('hmm'); return 1.6;
      case 'sleep': this.setMood('sleepy', 2.6); this.emit('zzz', 3); v('snore'); return 2.0;
      case 'angry': this.setMood('angry', 1.6); this.shake(0.5, 0.06); this.emit('puff', 4); v('no'); return 1.2;
      case 'shy': this.setMood('shy', 1.8); this.tweenScale(0.88, 0.3); this.after(1.4, () => this.tweenScale(1, 0.4)); v('hmm', { pitch: 1.2 }); return 1.4;
      case 'wow': this.setMood('wow', 1.6); this.emit('spark', 6); this.stretch(0.2); v('wow'); return 1.2;
      case 'dizzy': this.setMood('dizzy', 1.8); this.emit('orbit', 3); this.after(1.8, () => { this.fx = this.fx.filter(f => f.k !== 'orbit'); }); v('uhoh'); return 1.6;
      case 'nod': this.setMood('calm', 1.2); this.squash(0.12); this.after(0.18, () => this.squash(0.12)); v('hmm', { pitch: 0.9 }); return 0.8;
      case 'shake': this.setMood('worried', 1.0); this.shake(0.45, 0.05); v('no'); return 0.8;
      case 'uhoh': this.setMood('worried', 1.4); this.emit('sweat', 2); v('uhoh'); return 1.0;
      case 'huh': this.setMood('confused', 1.4); this.speak('q', 1.2); this.restRot = 0.18 * this.facing; this.after(1.2, () => { if (!this.fainted) this.restRot = 0; }); v('huh'); return 1.0;
      case 'cool': this.setMood('cool', 2.0); v('hmm', { pitch: 0.8 }); return 1.0;
      case 'hide': this.setMood('worried', 2.0); this.tweenScale(0.55, 0.25); this.shiver(1.6, 0.03); this.after(1.8, () => this.tweenScale(1, 0.4)); v('gasp'); return 2.0;
      case 'bid': this.setMood('determined', 1.0); this.hop(0.35); v('bid'); return 0.6;
      case 'quack': this.setMood('happy', 1.0); this.squash(0.2); v('quack'); return 0.4;
      default: this.setMood('happy', 1.2); v('talk', { n: 4 }); return 1.0;
    }
  }

  /* ---------- particles ---------- */
  emit(k: FxKind, n = 1) {
    const r = this.r;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const f: Fx = { k, x: 0, y: -r, vx: 0, vy: 0, life: 0, max: 1.2, rot: 0, vr: 0, s: r * 0.28, c: '#fff' };
      switch (k) {
        case 'tear': f.x = (i % 2 ? 1 : -1) * r * 0.45; f.y = -r * 1.05; f.vx = (i % 2 ? 1 : -1) * r * (1.5 + Math.random()); f.vy = -r * (1 + Math.random()); f.max = 0.9; f.s = r * 0.13; f.life = -i * 0.12; break;
        case 'sweat': f.x = (Math.random() < 0.5 ? -1 : 1) * r * 0.8; f.y = -r * 1.6; f.vx = Math.sign(f.x) * r * 1.2; f.vy = -r * 0.6; f.max = 0.8; f.s = r * 0.16; f.life = -i * 0.15; break;
        case 'heart': f.x = (Math.random() - 0.5) * r; f.y = -r * 1.6; f.vx = (Math.random() - 0.5) * r * 0.8; f.vy = -r * (1.4 + Math.random()); f.max = 1.4; f.s = r * (0.22 + Math.random() * 0.12); f.life = -i * 0.18; break;
        case 'note': f.x = r * 0.6; f.y = -r * 1.7; f.vx = r * 0.5; f.vy = -r * 1.2; f.max = 1.2; f.s = r * 0.32; break;
        case 'zzz': f.x = r * 0.5; f.y = -r * 1.8; f.vx = r * 0.35; f.vy = -r * 0.7; f.max = 1.8; f.s = r * (0.22 + i * 0.06); f.life = -i * 0.5; break;
        case 'confetti': f.x = (Math.random() - 0.5) * r; f.y = -r * 1.5; f.vx = Math.cos(a) * r * (2 + Math.random() * 3); f.vy = -r * (3 + Math.random() * 4); f.max = 1.6; f.rot = a; f.vr = (Math.random() - 0.5) * 20; f.s = r * 0.12; f.c = CONFETTI[i % CONFETTI.length]; break;
        case 'bang': f.x = r * 0.95; f.y = -r * 2.05; f.max = 0.9; f.s = r * 0.7; break;
        case 'q': f.x = r * 0.9; f.y = -r * 2.0; f.max = 1.2; f.s = r * 0.6; break;
        case 'spark': f.x = Math.cos(a) * r * 1.1; f.y = -r + Math.sin(a) * r * 1.1; f.vx = Math.cos(a) * r * 0.8; f.vy = Math.sin(a) * r * 0.8; f.max = 0.7; f.s = r * 0.14; f.life = -i * 0.05; break;
        case 'puff': f.x = (i % 2 ? 1 : -1) * r * 0.7; f.y = -r * 1.9; f.vx = (i % 2 ? 1 : -1) * r * 0.6; f.vy = -r * 1.1; f.max = 0.9; f.s = r * 0.22; f.life = -i * 0.1; break;
        case 'orbit': f.rot = (i / n) * Math.PI * 2; f.max = 99; f.s = r * 0.2; break;
      }
      this.fx.push(f);
    }
  }

  /* ---------- simulation ---------- */
  update(dt: number) {
    dt = Math.min(0.05, Math.max(0, dt));
    this.time += dt;
    for (let i = this.later.length - 1; i >= 0; i--) if (this.time >= this.later[i].at) { const l = this.later[i]; this.later.splice(i, 1); l.fn(); }
    if (this.moodUntil && this.time > this.moodUntil) { this.mood = this.fainted ? 'dizzy' : this.baseMood; this.moodUntil = 0; }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i], k = Math.min(1, (this.time - tw.t0) / tw.d), v = tw.from + (tw.to - tw.from) * tw.ease(k);
      (this as any)[tw.k] = v;
      if (k >= 1) this.tweens.splice(i, 1);
    }
    const r = this.r;
    // vertical: gravity while airborne, spring home otherwise
    if (this.airborne || this.oy < -0.5) {
      this.vy += 30 * r * dt; this.oy += this.vy * dt;
      if (this.oy >= 0) { const impact = Math.min(0.32, Math.abs(this.vy) / (r * 30)); this.oy = 0; this.vy = 0; this.airborne = false; this.sy = 1 - impact; this.sx = 1 + impact * 0.8; }
    } else { this.vy += (-this.oy * 120 - this.vy * 16) * dt; this.oy += this.vy * dt; }
    // horizontal: spring back to the rest x
    this.vx += (-this.ox * 90 - this.vx * 12) * dt; this.ox += this.vx * dt;
    // squash/stretch: underdamped spring → jelly wobble
    this.vsx += (-(this.sx - 1) * 320 - this.vsx * 13) * dt; this.sx += this.vsx * dt;
    this.vsy += (-(this.sy - 1) * 320 - this.vsy * 13) * dt; this.sy += this.vsy * dt;
    // rotation spring
    this.vrot += (-(this.rot - this.restRot) * 60 - this.vrot * 9) * dt; this.rot += this.vrot * dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.tremble > 0) this.tremble -= dt;
    // particles
    for (const f of this.fx) {
      f.life += dt; if (f.life < 0) continue;
      if (f.k === 'orbit') { f.rot += dt * 5; continue; }
      const grav = f.k === 'tear' || f.k === 'sweat' ? 18 : f.k === 'confetti' ? 9 : 0;
      f.vy += grav * r * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.k === 'heart' || f.k === 'note' || f.k === 'zzz') f.vx *= 0.98;
    }
    this.fx = this.fx.filter(f => f.life < f.max);
    if (this.speech && this.time > this.speech.until) this.speech = null;
  }

  /** Where the Bubble's centre is drawn this frame (for attaching things, aiming, hit tests). */
  centre(): { x: number; y: number } {
    const s = this.scale, idle = Math.sin((this.time + this.idlePhase) * 2.2) * 0.012;
    return { x: this.x + this.ox, y: this.y + this.oy - this.r * s * this.sy * (1 + idle) };
  }

  draw(g: CanvasRenderingContext2D, faces: Faces, o: { shadow?: boolean; labelColor?: string; labelFont?: string } = {}) {
    if (this.alpha <= 0.01 || this.scale <= 0.01) return;
    const r = this.r * this.scale;
    const idle = this.fainted ? 0 : Math.sin((this.time + this.idlePhase) * 2.2) * 0.012;
    let jx = 0, jy = 0;
    if (this.shakeT > 0) jx += Math.sin(this.time * 70) * this.shakeAmp * r;
    if (this.tremble > 0) { jx += (Math.random() - 0.5) * this.trembleAmp * r * 2; jy += (Math.random() - 0.5) * this.trembleAmp * r; }
    const px = this.x + this.ox + jx, py = this.y + this.oy + jy;
    g.save();
    g.globalAlpha *= this.alpha;
    if (o.shadow !== false) {
      const hgt = Math.min(1, -this.oy / (r * 3));
      g.fillStyle = `rgba(10,6,24,${0.32 * (1 - hgt * 0.7) * (1 - this.dim * 0.5)})`;
      g.beginPath(); g.ellipse(this.x + this.ox, this.y + r * 0.02, r * 0.78 * (1 - hgt * 0.4) * this.sx, r * 0.16 * (1 - hgt * 0.4), 0, 0, Math.PI * 2); g.fill();
    }
    g.translate(px, py);
    g.rotate(this.rot);
    g.scale(this.sx * (1 + idle * 0.5) * this.facing, this.sy * (1 + idle));
    const img = faces(this.slug, this.mood);
    if (img) g.drawImage(img, -r, -2 * r, 2 * r, 2 * r);
    else { const gr = g.createRadialGradient(-r * 0.3, -r * 1.3, r * 0.1, 0, -r, r); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#7aa7ff'); g.fillStyle = gr; g.beginPath(); g.arc(0, -r, r * 0.96, 0, Math.PI * 2); g.fill(); }
    if (this.dim > 0.01) { g.fillStyle = `rgba(14,8,30,${this.dim * 0.86})`; g.beginPath(); g.arc(0, -r, r * 0.97, 0, Math.PI * 2); g.fill(); }
    if (this.rim) {
      const gr = g.createLinearGradient(0, -2 * r, 0, 0); gr.addColorStop(0, this.rim); gr.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.strokeStyle = gr; g.lineWidth = Math.max(1.5, r * 0.07); g.beginPath(); g.arc(0, -r, r * 0.95, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    if (this.prop) { g.save(); g.translate(this.propSide * r * 0.95 * this.facing, -r * 0.55); g.scale(this.facing, 1); this.prop(g, r * 0.9); g.restore(); }
    g.restore();
    // particles (unrotated, around the bubble)
    g.save(); g.globalAlpha *= this.alpha;
    const cx = this.x + this.ox, cy = this.y + this.oy;
    for (const f of this.fx) {
      if (f.life < 0) continue;
      const a = f.k === 'orbit' ? 1 : Math.max(0, 1 - f.life / f.max);
      g.globalAlpha = this.alpha * Math.min(1, a * 1.4);
      const x = cx + f.x, y = cy + f.y;
      switch (f.k) {
        case 'tear': case 'sweat': g.fillStyle = f.k === 'tear' ? '#6cc6ff' : '#a8e2ff'; g.beginPath(); g.moveTo(x, y - f.s * 1.4); g.quadraticCurveTo(x + f.s, y, x, y + f.s); g.quadraticCurveTo(x - f.s, y, x, y - f.s * 1.4); g.fill(); break;
        case 'heart': g.save(); g.translate(x, y); heartPath(g, f.s * 2); g.fillStyle = '#ff5d8f'; g.fill(); g.restore(); break;
        case 'note': g.save(); g.translate(x, y); PICTS.note(g, f.s * 2); g.restore(); break;
        case 'zzz': g.fillStyle = '#c9d3ff'; g.font = `800 ${f.s * 2}px Fredoka, system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('z', x, y); break;
        case 'confetti': g.save(); g.translate(x, y); g.rotate(f.rot); g.fillStyle = f.c; g.fillRect(-f.s, -f.s * 0.5, f.s * 2, f.s); g.restore(); break;
        case 'bang': { g.save(); g.translate(x, y); const k = Math.min(1, f.life / 0.12); g.scale(k, k); PICTS.bang(g, f.s); g.restore(); break; }
        case 'q': g.save(); g.translate(x, y); PICTS.q(g, f.s); g.restore(); break;
        case 'spark': g.save(); g.translate(x, y); starPath(g, f.s, 0.35, 4); g.fillStyle = '#fff2b0'; g.fill(); g.restore(); break;
        case 'puff': g.fillStyle = 'rgba(235,235,245,0.8)'; g.beginPath(); g.arc(x, y, f.s * (1 + f.life), 0, Math.PI * 2); g.fill(); break;
        case 'orbit': { const ccx = cx, ccy = cy - r * 2.1, a2 = f.rot; const sx = ccx + Math.cos(a2) * r * 0.75, sy = ccy + Math.sin(a2) * r * 0.22; g.save(); g.translate(sx, sy); starPath(g, f.s, 0.45, 5); g.fillStyle = '#ffd166'; g.fill(); g.restore(); break; }
      }
    }
    g.restore();
    // speech / thought bubble with a pictogram
    if (this.speech) {
      const k = Math.min(1, (this.time - this.speech.t0) / 0.14), s = r * 1.15 * (0.6 + 0.4 * k);
      const bx = cx + this.facing * r * 1.05, by = cy - r * 2.35;
      g.save(); g.globalAlpha *= this.alpha;
      g.fillStyle = '#fffaf2'; g.strokeStyle = 'rgba(40,30,70,.35)'; g.lineWidth = Math.max(1, r * 0.04);
      rrect(g, bx - s * 0.6, by - s * 0.55, s * 1.2, s * 1.0, s * 0.35); g.fill(); g.stroke();
      if (this.speech.think) { g.beginPath(); g.arc(bx - this.facing * s * 0.35, by + s * 0.6, s * 0.1, 0, Math.PI * 2); g.arc(bx - this.facing * s * 0.6, by + s * 0.82, s * 0.06, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.moveTo(bx - this.facing * s * 0.2, by + s * 0.42); g.lineTo(bx - this.facing * s * 0.55, by + s * 0.78); g.lineTo(bx + this.facing * s * 0.02, by + s * 0.44); g.fill(); }
      g.translate(bx, by - s * 0.05); this.speech.pict(g, s * 0.8);
      g.restore();
    }
    if (this.label) {
      g.save(); g.globalAlpha *= this.alpha;
      g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillStyle = o.labelColor || '#f5f1ff';
      g.font = o.labelFont || `600 ${Math.max(10, Math.round(r * 0.42))}px Fredoka, system-ui, sans-serif`;
      g.fillText(this.label, this.x + this.ox, this.y + r * 0.22, Math.max(40, r * 2.7));
      if (this.sub) { g.globalAlpha *= 0.75; g.font = `500 ${Math.max(9, Math.round(r * 0.32))}px Fredoka, system-ui, sans-serif`; g.fillText(this.sub, this.x + this.ox, this.y + r * 0.22 + Math.max(12, r * 0.5)); }
      g.restore();
    }
  }
}

/** Personality notes the rituals share, so a Bubble behaves like itself everywhere. */
export const PERSONA: Record<Slug, { scared: Emote; delighted: Emote; sad: Emote; quirk: string }> = {
  rush: { scared: 'scream', delighted: 'cheer', sad: 'cry', quirk: 'panics first, apologises later' },
  still: { scared: 'nod', delighted: 'nod', sad: 'nod', quirk: 'unbothered; tea in hand' },
  loopie: { scared: 'hide', delighted: 'giggle', sad: 'huh', quirk: 'does the same thing again, expecting a different result' },
  glitch: { scared: 'dizzy', delighted: 'wow', sad: 'uhoh', quirk: 'takes everything literally; breaks the equipment' },
  drop: { scared: 'cry', delighted: 'love', sad: 'sob', quirk: 'cries at everything, happy or sad' },
  patch: { scared: 'uhoh', delighted: 'love', sad: 'uhoh', quirk: 'tries to fix things that are not broken' },
  sync: { scared: 'gasp', delighted: 'yay', sad: 'uhoh', quirk: 'copies whoever moved last' }
};
