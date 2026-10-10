/* The Glorious Mess Auction — your side of the easel.
 *   hook: a gavel BANG in the dark; a spotlight on a gloriously terrible blind portrait; SOLD for 4,000 bubbles; the
 *         Bubbles lose their minds.
 *   studio: blindfold on → draw yourself in 8 seconds without seeing the paper (the Bubbles can see it, and they are
 *           trying very hard not to laugh) → blindfold off, the mess draws itself back → now the hair, still blind →
 *           sign it like a master → put a secret price on it → hold to seal it in wax.
 *   then the auction (auction.ts). */
import type { RoomView, Player, Slug } from '../../room/protocol';
import type { Scene, SceneCtx } from '../../console/types';
import { h, clear, Surface, hold, clamp, ease } from '../../ui/dom';
import { BubbleActor } from '../../actor/bubble';
import { Babble } from '../../actor/babble';
import { PICTS, rrect } from '../../actor/picts';
import { Music, drumroll } from '../../audio/music';
import { mulberry32 } from '../../room/ritual';
import { PROMPTS, T_FACE, T_HAIR, EST_STEPS, fmt, worth } from './content';
import { Stroke, Pt, encode, simplify, drawStrokes, bubblePortrait, scribble } from './portrait';
import { layout, drawHouse, drawFrame, drawBoard, drawStamp, drawPodium, drawPaddle } from './house';
import { MA_CSS, MA_FONTS } from './style';
import { AuctionDirector } from './auction';
import { SONGS } from './songs';

export function createMaScene(ctx: SceneCtx): Scene { return new MaScene(ctx); }

class MaScene implements Scene {
  el: HTMLElement;
  private view: RoomView | null = null;
  private round = -1;
  private mode: string | null = null;
  private studio: Studio | null = null;
  private waitEl: HTMLElement | null = null;
  private auction: AuctionDirector | null = null;
  private hookRaf = 0;
  readonly babble: Babble;
  readonly music: Music;
  constructor(private ctx: SceneCtx) {
    addFonts();
    this.babble = new Babble(ctx.sfx);
    this.music = new Music(ctx.sfx);
    this.el = h('div', { class: 'ma', 'data-ritual': 'mess-auction' }, h('style', { text: MA_CSS }));
    ctx.stage.appendChild(this.el);
  }
  get me(): Player | null { const v = this.view; return v ? v.players.find(p => p.pid === v.you) || null : null; }
  update(v: RoomView) {
    const prev = this.view;
    this.view = v;
    if (v.round !== this.round) { this.reset(); this.round = v.round; }
    const me = this.me;
    if (v.phase === 'play') {
      if (!me || me.spectator) { this.showWait(true); return; }
      if (v.sealed[me.pid]) { this.showWait(false); return; }
      if (!this.mode) this.hook();
    } else if (v.phase === 'reveal' || v.phase === 'finale') {
      if (!this.auction) { this.clearPlay(); this.mode = 'auction'; this.auction = new AuctionDirector(this.ctx, this.el, this.babble, this.music); }
      this.auction.update(v, prev);
    }
  }
  resize() { if (this.auction) this.auction.resize(); if (this.studio) this.studio.layout(); }
  destroy() { this.reset(); this.music.stop(0.2); this.el.remove(); }
  private clearPlay() { cancelAnimationFrame(this.hookRaf); if (this.studio) { this.studio.destroy(); this.studio = null; } if (this.waitEl) { this.waitEl.remove(); this.waitEl = null; } }
  private reset() { this.clearPlay(); if (this.auction) { this.auction.destroy(); this.auction = null; } Array.from(this.el.children).forEach(c => { if (c.tagName !== 'STYLE') c.remove(); }); this.mode = null; }

  /* ---------------- the hook: BANG — SOLD — a masterpiece of a mess ---------------- */
  private hook() {
    this.mode = 'hook';
    const ctx = this.ctx;
    const sf = new Surface(); sf.maxDpr = 1.5;
    const title = h('div', { class: 'ma-title', style: { opacity: '0', transition: 'opacity .5s' } }, 'Draw it blind. Watch it sell.');
    const sub = h('div', { class: 'ma-sub', style: { opacity: '0', transition: 'opacity .5s' } }, 'Your messiest self-portrait is going up for auction.');
    const words = h('div', { class: 'ma-words' }, title, sub);
    const skip = h('button', { class: 'ma-btn ghost ma-skip' }, 'Skip');
    const wrap = h('div', { class: 'ma-stage' }, sf.canvas, words, skip);
    this.el.appendChild(wrap);
    const rng = mulberry32(this.view ? this.view.seed : 7);
    const art = bubblePortrait('rush', rng); art.push({ p: 2, pts: scribble(rng) });
    const crowd: Slug[] = ['loopie', 'drop', 'still', 'sync'];
    const row = crowd.map(s => new BubbleActor(s, 0, 0, 20, this.babble));
    const auc = new BubbleActor('glitch', 0, 0, 20, this.babble);
    const att = new BubbleActor('patch', 0, 0, 20, this.babble);
    const rushA = new BubbleActor('rush', 0, 0, 20, this.babble);
    const pre: [string, string][] = [];
    for (const s of ['loopie', 'drop', 'still', 'sync', 'glitch', 'patch', 'rush']) for (const m of ['neutral', 'celebrate', 'laugh', 'cry', 'surprised', 'love', 'calm', 'shy']) pre.push([s, m]);
    ctx.faces.preload(pre);
    const T0 = performance.now();
    let done = false, last = T0, bang = 0;
    const once = new Set<string>();
    const doOnce = (k: string, f: () => void) => { if (!once.has(k)) { once.add(k); f(); } };
    const go = () => { if (done) return; done = true; cancelAnimationFrame(this.hookRaf); wrap.remove(); this.music.stop(0.6); this.startStudio(); };
    skip.addEventListener('click', go);
    wrap.addEventListener('pointerdown', (e) => { ctx.sfx.unlock(); if (e.target !== skip && performance.now() - T0 > 800) go(); });
    const faces = (s: string, m: string) => ctx.faces.get(s, m);
    const frame = (now: number) => {
      if (done) return;
      this.hookRaf = requestAnimationFrame(frame);
      sf.fit();
      const g = sf.g, W = sf.pw, H = sf.ph, k = (now - T0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (W < 8) return;
      if (k < 0.22) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
      doOnce('bang', () => {
        ctx.sfx.thud(); ctx.sfx.crack(); this.music.hit('timpani', ['D2'], { len: 1.2, vol: 1.2 }); this.music.hit('brass', ['D4+F#4+A4'], { at: 0.05, len: 0.9, vol: 0.9 }); bang = 1;
        row.forEach((a, i) => a.after(0.15 + i * 0.09, () => a.emote(a.slug === 'drop' ? 'cry' : a.slug === 'still' ? 'nod' : 'cheer', { vol: 0.7 })));
        auc.after(0.2, () => auc.emote('yay', { vol: 0.6 })); rushA.after(0.3, () => rushA.emote('scream'));
      });
      doOnce('push', () => setTimeout(() => { if (!done) { row[0].emote('giggle'); att.emote('love', { vol: 0.5 }); } }, 1500));
      doOnce('music', () => setTimeout(() => { if (!done) this.music.play('minuet', SONGS.minuet, { vol: 0.4 }); }, 900));
      bang = Math.max(0, bang - dt * 3);
      const L = layout(W, H, row.length + 1);
      // push in on the masterpiece
      const p = ease.inOut(clamp((k - 1.2) / 1.4, 0, 1)), z = 1 + p * (L.port ? 0.5 : 0.4);
      const fcx = L.frame.x + L.frame.w / 2, fcy = L.frame.y + L.frame.h * 0.55;
      const ax = fcx + (W / 2 - fcx) * p, ay = fcy + (H * (L.port ? 0.36 : 0.42) - fcy) * p;
      g.save();
      g.translate(ax, ay); g.scale(z, z); g.translate(-fcx, -fcy);
      drawHouse(g, W, H, L, { t: k, spot: 1, house: 0.35, curtain: Math.max(0, 1 - (k - 0.2) * 2.5) });
      drawFrame(g, L.frame, art, { t: k, cloth: 0, boil: Math.max(1, L.frame.w * 0.006), plaque: 'Self-portrait, blind', sub: 'by Rush · Bubble companion', seed: 3 });
      drawBoard(g, L.board, '4,000', '8 moons', bang * 0.8, 'SOLD');
      // the auctioneer behind the lectern, the attendant in white gloves, and the crowd
      auc.x = L.podium.x; auc.y = L.podium.y - L.podium.r * 0.78; auc.r = L.podium.r; auc.update(dt); auc.draw(g, faces, { shadow: false });
      drawPodium(g, L.podium.x, L.podium.y, L.podium.r, bang);
      att.x = L.attendant.x; att.y = L.attendant.y; att.r = L.attendant.r; att.update(dt); att.draw(g, faces);
      const all = [row[0], row[1], rushA, row[2], row[3]];
      const n = all.length, sp = Math.min(W * 0.9 / n, L.rowR * 3);
      all.forEach((a, j) => { a.x = W / 2 + (j - (n - 1) / 2) * sp; a.y = L.rowY; a.r = L.rowR; a.update(dt); a.draw(g, faces); if (a.slug !== 'rush') drawPaddle(g, a.x + a.r * 0.95, a.y - a.r * (0.5 + 1.85 * Math.min(1, k * 2)), a.r * 1.0, ({ loopie: 8, drop: 3, still: 1, sync: 22 } as Record<string, number>)[a.slug] || 5, 0, k * 6 + j, a.slug === 'still'); });
      drawStamp(g, 'SOLD!', fcx + L.frame.w * 0.14, L.frame.y + L.frame.h * 0.8, L.frame.w * 0.16, -0.18, clamp((k - 0.3) / 1, 0, 1));
      g.restore();
      if (k > 2.2) title.style.opacity = '1';
      if (k > 2.8) sub.style.opacity = '1';
      if (k > 6) go();
    };
    this.hookRaf = requestAnimationFrame(frame);
  }
  private startStudio() {
    const v = this.view; if (!v || !this.me) return;
    this.mode = 'studio';
    const prompt = PROMPTS[(v.pub && v.pub.prompt) || 0] || PROMPTS[0];
    this.studio = new Studio(this.ctx, this.me, prompt, this.babble, this.music, (strokes, est) => { this.ctx.room.act('seal', { strokes: encode(strokes), est }); this.mode = 'sealing'; });
    this.el.appendChild(this.studio.el);
    this.studio.layout();
  }
  private showWait(spectating: boolean) {
    const v = this.view; if (!v) return;
    if (!this.waitEl) { this.waitEl = h('div', { class: 'ma-wait' }); this.el.appendChild(this.waitEl); }
    if (this.studio) { this.studio.destroy(); this.studio = null; }
    cancelAnimationFrame(this.hookRaf);
    this.mode = 'wait';
    clear(this.waitEl);
    const parts = v.players.filter(p => !p.spectator);
    this.waitEl.appendChild(h('h3', null, spectating ? 'You’re in the gallery' : 'Framed. Sealed. Sent.'));
    this.waitEl.appendChild(h('div', { style: { fontSize: '14px', maxWidth: '420px', opacity: '.85' } }, spectating ? 'This auction had already started. You’ll watch every lot, and draw your own next round.' : 'Nobody has seen your price. The auction starts when every mess is framed.'));
    const chips = h('div', { class: 'ma-chips' });
    for (const p of parts) {
      const sealed = !!v.sealed[p.pid];
      chips.appendChild(h('div', { class: 'ma-chip' }, h('img', { alt: '', src: this.ctx.faces.url(p.avatar, sealed ? 'cool' : 'think') }), h('b', null, p.pid === v.you ? p.name + ' (you)' : p.name), !p.human ? h('small', null, 'Bubble companion') : null, h('small', null, sealed ? 'framed' : p.connected ? 'drawing blind…' : 'reconnecting…')));
    }
    this.waitEl.appendChild(chips);
    const waiting = parts.filter(p => !v.sealed[p.pid]);
    if (this.ctx.room.isHost && waiting.length && parts.some(p => p.human && v.sealed[p.pid])) this.waitEl.appendChild(h('button', { class: 'ma-btn ghost', onclick: () => this.ctx.room.act('force_reveal') }, 'Start the auction without ' + (waiting.length === 1 ? waiting[0].name : waiting.length + ' people')));
  }
}

/* ============================================ the studio ============================================ */
type Step = 'ready' | 'blind' | 'reveal' | 'sign' | 'price' | 'sent';
type SlotId = 'tl' | 'tr' | 'bl' | 'br';
/** The crew around your easel: someone holds the blindfold, someone can't stop giggling, someone gasps, someone cries. */
const CREW_WANT: Record<SlotId, Slug[]> = { bl: ['patch', 'glitch', 'still'], tl: ['loopie', 'sync', 'glitch'], tr: ['rush', 'sync', 'glitch'], br: ['drop', 'still', 'sync'] };
const PASS_TIME = [T_FACE, T_HAIR];
const CAPS = [450, 300, 150];

class Studio {
  el: HTMLElement;
  private head: HTMLElement;
  private headB: HTMLElement;
  private headS: HTMLElement;
  private easel: HTMLElement;
  private paper: HTMLElement;
  private pc = new Surface();
  private fx = new Surface('ma-fx');
  private foot: HTMLElement;
  private strokes: Stroke[] = [];
  private cur: Stroke | null = null;
  private pen: { x: number; y: number; down: boolean; id: number | null; last: number; lx: number; ly: number } = { x: 128, y: 128, down: false, id: null, last: 0, lx: 0, ly: 0 };
  private pass = 0;
  private step: Step = 'ready';
  private stepT = 0;
  private timer = { on: false, t: 0, dur: 8 };
  private crew = {} as Record<SlotId, BubbleActor>;
  private slots = {} as Record<SlotId, { x: number; y: number; lean: number }>;
  private mode: 'tb' | 'side' = 'tb';
  private r = 30;
  private size = 300;
  private paperBox = { x: 0, y: 0, w: 1, h: 1 };
  private raf = 0;
  private last = performance.now();
  private t = 0;
  private cool: Record<string, number> = {};
  private once = new Set<string>();
  private estI = 4;
  private seal = 0;
  private sealDone = 0;
  private idleSince = 0;
  private destroyed = false;
  private ro: ResizeObserver | null = null;
  private stamp: { text: string; t: number } | null = null;
  private nudge = { a: 0, dx: 0, dy: 0 };
  constructor(private ctx: SceneCtx, private me: Player, private prompt: { face: string; hair: string; title: string; extra: string }, private babble: Babble, private music: Music, private onSeal: (strokes: Stroke[], est: number) => void) {
    this.pc.maxDpr = 2; this.fx.maxDpr = 1.5;
    this.headB = h('b'); this.headS = h('span');
    this.head = h('div', { class: 'ma-head', 'aria-live': 'polite' }, this.headB, this.headS);
    this.paper = h('div', { class: 'ma-paper', role: 'img', tabindex: '0', 'aria-label': 'Your paper. Draw with your finger or mouse. Keyboard: arrow keys move the pen, space puts it down or lifts it.' }, this.pc.canvas);
    this.easel = h('div', { class: 'ma-easel' }, this.paper);
    this.foot = h('div', { class: 'ma-foot' });
    this.el = h('div', { class: 'ma-draw' }, this.head, this.easel, this.foot, this.fx.canvas);
    // the crew: Bubbles nobody in this room is playing as
    const taken = new Set<Slug>([me.avatar]);
    (['bl', 'tl', 'tr', 'br'] as SlotId[]).forEach(id => {
      const s = CREW_WANT[id].find(x => !taken.has(x)) || CREW_WANT[id][0];
      taken.add(s);
      const a = new BubbleActor(s, 0, 0, 20, babble);
      if (id === 'bl') { a.prop = PICTS.mask; a.propSide = 1; }
      if (id === 'tr' || id === 'br') a.facing = -1;
      this.crew[id] = a;
    });
    const pre: [string, string][] = [];
    for (const a of Object.values(this.crew)) for (const m of ['neutral', 'laugh', 'surprised', 'cry', 'love', 'wow', 'worried', 'confused', 'celebrate', 'dizzy', 'calm', 'happy', 'shy', 'determined']) pre.push([a.slug, m]);
    ctx.faces.preload(pre);
    this.bind();
    this.setStep('ready');
    music.play('minuet', SONGS.minuet, { vol: 0.32 });
    this.raf = requestAnimationFrame((n) => this.frame(n));
    try { this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(this.el); } catch (e) { /* older browsers: resize() from the console */ }
    (globalThis as any).__maStudio = this;
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect(); this.el.remove(); if ((globalThis as any).__maStudio === this) delete (globalThis as any).__maStudio; }

  /* ---- test hooks ---- */
  state() { return { step: this.step, pass: this.pass, strokes: this.strokes.length, points: this.strokes.reduce((a, s) => a + s.pts.length, 0), est: EST_STEPS[this.estI], timer: this.timer.on ? Math.max(0, this.timer.dur - this.timer.t) : null, paper: this.paperBox, mode: this.mode }; }
  endTimer() { if (this.step === 'blind') this.timer.t = this.timer.dur; }

  /* ---- sizing: the paper as big as possible with room for the crew around it ---- */
  layout() {
    if (this.destroyed) return;
    const root = this.el.getBoundingClientRect(), cell = this.easel.getBoundingClientRect();
    if (cell.width < 20 || cell.height < 20) return;
    let r = clamp(Math.min(cell.width, cell.height) * 0.1, 24, 56);
    const tb = Math.min(cell.width - 28, cell.height - 2 * (2 * r + 16));
    const side = Math.min(cell.height - 24, cell.width - 2 * (2.25 * r + 8));
    this.mode = side > tb ? 'side' : 'tb';
    let size = Math.max(tb, side);
    if (size < Math.min(cell.width, cell.height) * 0.6) { this.mode = 'tb'; r = Math.max(18, r * 0.8); size = Math.min(cell.width - 28, cell.height - 2 * (2 * r + 10)); }
    size = Math.max(120, Math.floor(size));
    this.r = r; this.size = size;
    this.paper.style.width = size + 'px'; this.paper.style.height = size + 'px';
    const px = cell.left - root.left + (cell.width - size) / 2, py = cell.top - root.top + (cell.height - size) / 2;
    this.paperBox = { x: px, y: py, w: size, h: size };
    const fr = 11;   // the gilded frame around the paper
    if (this.mode === 'tb') {
      this.slots = {
        tl: { x: px + size * 0.24, y: py - fr, lean: 0.32 }, tr: { x: px + size * 0.78, y: py - fr, lean: -0.32 },
        bl: { x: px + size * 0.2, y: py + size + fr + 2 * r + 4, lean: 0 }, br: { x: px + size * 0.8, y: py + size + fr + 2 * r + 4, lean: 0 }
      };
    } else {
      this.slots = {
        tl: { x: px - fr - r * 0.95, y: py + size * 0.42, lean: 0.3 }, bl: { x: px - fr - r * 1.15, y: py + size + fr, lean: 0.12 },
        tr: { x: px + size + fr + r * 0.95, y: py + size * 0.42, lean: -0.3 }, br: { x: px + size + fr + r * 1.15, y: py + size + fr, lean: -0.12 }
      };
    }
  }

  /* ---- steps ---- */
  private setStep(s: Step) {
    this.step = s; this.stepT = 0; this.once.clear();
    const A = this.crew;
    clear(this.foot);
    if (s === 'ready') {
      this.headB.textContent = this.pass === 0 ? this.prompt.face : this.prompt.hair;
      this.headS.textContent = this.pass === 0 ? 'Blindfolded. ' + T_FACE + ' seconds. No peeking.' : 'Pink marker. ' + T_HAIR + ' seconds. Still no peeking.';
      const go = h('button', { class: 'ma-btn', 'data-act': 'blindfold', onclick: (e: Event) => { this.ctx.sfx.unlock(); this.ctx.sfx.gesture(e); this.blindfold(); } }, 'Put the blindfold on');
      this.foot.appendChild(h('div', { class: 'ma-row' }, go));
      this.foot.appendChild(h('div', { class: 'ma-hint' }, this.pass === 0 ? 'Then draw on the paper. Big is good.' : 'Where was the top of your head again?'));
      if (this.pass === 0) A.bl.after(0.6, () => { A.bl.speak('mask', 1.6); A.bl.emote('talk', { vol: 0.5 }); });
      else A.tl.after(0.3, () => A.tl.emote('giggle', { vol: 0.5 }));
    } else if (s === 'blind') {
      this.headB.textContent = this.pass === 0 ? 'Draw!' : 'Now the ' + this.prompt.extra + '!';
      this.headS.textContent = 'You can’t see it. They can.';
      this.foot.appendChild(h('div', { class: 'ma-hint', 'data-hint': 'blind' }, 'Keep going — the timer stops you'));
      this.foot.appendChild(h('div', { class: 'ma-row' }, h('button', { class: 'ma-btn ghost', 'data-act': 'done-early', onclick: () => { this.timer.t = this.timer.dur; } }, 'Done already')));
    } else if (s === 'reveal') {
      this.headB.textContent = 'Blindfold off…';
      this.headS.textContent = '';
    } else if (s === 'sign') {
      this.headB.textContent = 'Sign it like a master';
      this.headS.textContent = 'Eyes open for this bit. Bottom corner.';
      const done = h('button', { class: 'ma-btn', 'data-act': 'signed', onclick: () => this.setStep('price') }, 'Signed') as HTMLButtonElement;
      done.disabled = true;
      this.foot.appendChild(h('div', { class: 'ma-row' }, h('button', { class: 'ma-btn ghost', 'data-act': 'skip-sign', onclick: () => this.setStep('price') }, 'Leave it unsigned'), done));
      this.foot.appendChild(h('div', { class: 'ma-hint' }, 'A flourish adds at least ten bubbles.'));
    } else if (s === 'price') {
      this.headB.textContent = 'What’s it worth?';
      this.headS.textContent = 'Your secret estimate. Nobody sees it until after the auction.';
      this.buildPrice();
    } else if (s === 'sent') {
      this.headB.textContent = 'Off to the auction house';
      this.headS.textContent = '';
    }
  }
  private blindfold() {
    if (this.step !== 'ready') return;
    const A = this.crew;
    this.setStep('blind');
    this.timer = { on: true, t: -0.45, dur: PASS_TIME[this.pass] };
    this.idleSince = performance.now();
    this.ctx.sfx.whoosh(false, 0.35); this.ctx.sfx.noise(0.18, { type: 'lowpass', freq: 600, vol: 0.25, at: 0.3 });
    A.bl.hop(0.4); A.bl.prop = null;
    if (this.pass === 1) {
      // the attendant "straightens" your easel while you can't see. Of course it does.
      const sgn = () => (Math.random() < 0.5 ? -1 : 1);
      this.nudge = { a: sgn() * (0.07 + Math.random() * 0.07), dx: sgn() * (10 + Math.random() * 12), dy: sgn() * (6 + Math.random() * 9) };
      A.bl.after(0.25, () => { A.bl.moveTo(A.bl.x, A.bl.y, 0.01); A.bl.emote('talk', { vol: 0.45 }); this.ctx.sfx.noise(0.12, { type: 'lowpass', freq: 500, vol: 0.3 }); this.ctx.sfx.tone(140, 0.12, { vol: 0.12 }); });
    }
    Object.values(A).forEach((a, i) => a.after(0.1 + i * 0.07, () => a.setMood(a === A.bl ? 'determined' : 'happy', 1.2)));
    this.music.stop(0.3);
    this.paper.focus({ preventScroll: true });
  }
  private endPass() {
    if (this.cur) this.endStroke();
    this.timer.on = false;
    this.setStep('reveal');
    this.stamp = { text: 'PENCILS DOWN!', t: 0 };
    this.ctx.sfx.chime([1046.5, 1318.5]);
    setTimeout(() => { if (!this.destroyed) drumroll(this.ctx.sfx, 1.0); }, 450);
  }
  private afterReveal() {
    const A = this.crew;
    const mine = this.strokes.filter(s => s.p === this.pass);
    const pts = mine.reduce((a, s) => a + s.pts.length, 0);
    this.ctx.sfx.tone(196, 0.12, { type: 'triangle', vol: 0.25 }); this.ctx.sfx.tone(147, 0.12, { type: 'triangle', vol: 0.25, at: 0.12 }); this.ctx.sfx.noise(0.5, { type: 'highpass', freq: 6000, vol: 0.12, at: 0.26 });
    if (pts < 3) {
      Object.values(A).forEach((a, i) => a.after(i * 0.15, () => a.emote('huh', { vol: 0.6 })));
      A.bl.after(0.8, () => A.bl.speak('q', 1.6));
      this.headB.textContent = this.pass === 0 ? 'Bold. Minimal. Invisible.' : 'The hair is… implied.';
    } else {
      const big = this.pass === 1 || mine.length >= 4;
      A.tl.emote('laugh'); if (big) A.tl.after(0.9, () => { A.tl.faint(-1); A.tl.after(1.8, () => A.tl.recover()); });
      A.tr.after(0.2, () => A.tr.emote(this.pass === 1 ? 'scream' : 'wow', { vol: 0.8 }));
      A.br.after(0.35, () => A.br.emote('cry', { vol: 0.7 }));
      A.bl.after(0.5, () => { A.bl.emote(this.pass === 1 ? 'love' : 'laugh', { vol: 0.6 }); });
      this.headB.textContent = this.pass === 0 ? 'A masterpiece. Probably.' : 'Magnificent.';
    }
    this.headS.textContent = this.pass === 0 ? 'Now the ' + this.prompt.extra + ' goes on. Blind.' : 'Every artist signs their work.';
    if (this.pass === 1 && this.nudge.a) {
      this.headS.textContent = A.bl.slug.charAt(0).toUpperCase() + A.bl.slug.slice(1) + ' “straightened” your easel while you couldn’t see.';
      A.bl.after(1.0, () => { A.bl.emote('shy', { vol: 0.5 }); A.bl.speak('tape', 1.6); });
    }
    const next = h('button', { class: 'ma-btn', 'data-act': 'next', onclick: (e: Event) => { this.ctx.sfx.gesture(e); if (this.pass === 0) { this.pass = 1; this.setStep('ready'); } else this.setStep('sign'); } }, this.pass === 0 ? 'Now the ' + this.prompt.extra + ' →' : 'Sign it →');
    this.foot.appendChild(h('div', { class: 'ma-row' }, next));
  }

  /* ---- price + seal ---- */
  private buildPrice() {
    const amt = h('div', { class: 'amt' });
    const conv = h('div', { class: 'ma-hint' });
    const range = h('input', { type: 'range', min: '0', max: String(EST_STEPS.length - 1), step: '1', value: String(this.estI), 'aria-label': 'Your secret estimate in bubbles' }) as HTMLInputElement;
    const show = () => { const n = EST_STEPS[this.estI]; clear(amt); amt.appendChild(document.createTextNode(fmt(n))); amt.appendChild(h('small', null, n === 1 ? 'bubble' : 'bubbles')); conv.textContent = '≈ ' + worth(n); range.setAttribute('aria-valuetext', fmt(n) + ' bubbles'); };
    show();
    range.addEventListener('input', (e) => { const i = Number(range.value); if (i !== this.estI) { this.estI = i; show(); this.ctx.sfx.tick(0.6 + i / 18); this.ctx.metrics.mark(e); this.priceReact(); } });
    const bar = h('i');
    const sealBtn = h('button', { class: 'ma-btn ma-seal', 'data-act': 'seal', 'aria-label': 'Hold to seal it in wax and send it to the auction' }, 'Hold to seal it · send to auction', bar) as HTMLButtonElement;
    hold(sealBtn, 950, {
      start: () => { if (this.step !== 'price') return; this.ctx.sfx.unlock(); this.ctx.sfx.tone(180, 0.95, { type: 'triangle', glide: 90, vol: 0.05 }); },
      progress: (k) => { if (this.step !== 'price') return; bar.style.width = (k * 100) + '%'; this.seal = k; },
      done: () => { if (this.step !== 'price') return; this.sendOff(); },
      cancel: () => { bar.style.width = '0'; this.seal = 0; }
    });
    this.foot.appendChild(h('div', { class: 'ma-price' }, amt, conv, range));
    this.foot.appendChild(sealBtn);
  }
  private priceReact() {
    const A = this.crew, n = EST_STEPS[this.estI];
    if (n <= 2 && this.can('cheap', 3)) { A.br.emote('sob'); A.br.after(0.6, () => A.br.speak('heart', 1.4)); }
    else if (n >= 3000 && this.can('rich', 4)) { A.tr.emote('faint'); A.tr.after(2.2, () => A.tr.recover()); A.tl.after(0.3, () => A.tl.emote('wow', { vol: 0.6 })); }
    else if (n >= 300 && n < 3000 && this.can('mid', 5)) A.bl.emote('cool', { vol: 0.5 });
  }
  private sendOff() {
    this.sealDone = 0.001; this.seal = 1;
    this.ctx.sfx.thud(); this.ctx.sfx.noise(0.12, { type: 'lowpass', freq: 400, vol: 0.4 });
    Object.values(this.crew).forEach((a, i) => a.after(0.1 + i * 0.1, () => a.emote(i % 2 ? 'cheer' : 'yay', { vol: 0.5 })));
    this.setStep('sent');
    setTimeout(() => {
      if (this.destroyed) return;
      this.ctx.sfx.whoosh(true, 0.6);
      this.paper.style.transition = 'transform .7s cubic-bezier(.5,-0.3,.7,1), opacity .7s';
      this.paper.style.transform = 'translate(40%,-120%) rotate(14deg) scale(.35)'; this.paper.style.opacity = '0';
    }, 650);
    setTimeout(() => { if (this.destroyed) return; this.onSeal(this.packed(), EST_STEPS[this.estI]); }, 1300);
    // if the room refused the seal, bring the paper back so it can be tried again
    setTimeout(() => { if (this.destroyed) return; this.paper.style.transition = ''; this.paper.style.transform = ''; this.paper.style.opacity = ''; this.seal = 0; this.sealDone = 0; this.setStep('price'); }, 5200);
  }
  /** Simplify every pass to fit the room's limits. */
  private packed(): Stroke[] {
    const out: Stroke[] = [];
    for (const p of [0, 1, 2]) {
      const ss = this.strokes.filter(s => s.p === p && s.pts.length);
      let eps = 0.9, res: Stroke[] = [];
      for (let k = 0; k < 8; k++) {
        res = ss.map(s => ({ p, pts: simplify(s.pts, eps) }));
        if (res.reduce((a, s) => a + s.pts.length, 0) <= CAPS[p]) break;
        eps *= 1.7;
      }
      let left = CAPS[p];
      for (const s of res) { if (left <= 0) break; const pts = s.pts.slice(0, left); left -= pts.length; out.push({ p, pts }); }
    }
    return out.slice(0, 110);
  }

  /* ---- input ---- */
  private toGrid(e: PointerEvent): Pt { const r = this.paper.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width * 256, 0, 255), clamp((e.clientY - r.top) / r.height * 256, 0, 255)]; }
  private bind() {
    const P = this.paper;
    P.addEventListener('pointerdown', (e) => {
      this.ctx.sfx.unlock(); this.ctx.sfx.gesture(e); this.ctx.metrics.mark(e);
      if (this.step === 'ready' && this.stepT > 0.3) { this.blindfold(); return; }
      if (!(this.step === 'blind' && this.timer.t >= 0) && this.step !== 'sign') return;
      if (this.pen.id !== null) return;
      this.pen.id = e.pointerId; try { P.setPointerCapture(e.pointerId); } catch (_) { /* fine */ }
      const [x, y] = this.toGrid(e);
      this.beginStroke(x, y);
      e.preventDefault();
    });
    P.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pen.id || !this.cur) return;
      this.ctx.metrics.mark(e);
      const evs = (e as any).getCoalescedEvents ? (e as any).getCoalescedEvents() as PointerEvent[] : [e];
      for (const ce of (evs.length ? evs : [e])) { const [x, y] = this.toGrid(ce); this.addPoint(x, y); }
    });
    const end = (e: PointerEvent) => { if (e.pointerId !== this.pen.id) return; this.pen.id = null; if (this.cur) this.endStroke(); };
    P.addEventListener('pointerup', end); P.addEventListener('pointercancel', end); P.addEventListener('lostpointercapture', end);
    // keyboard drawing: arrows move the pen, space puts it down / lifts it
    P.addEventListener('keydown', (e) => {
      if (this.step === 'ready' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.blindfold(); return; }
      if (!(this.step === 'blind' && this.timer.t >= 0) && this.step !== 'sign') return;
      const d = 9, k = e.key;
      if (k === ' ') { e.preventDefault(); if (this.cur) this.endStroke(); else this.beginStroke(this.pen.x, this.pen.y); return; }
      const dx = k === 'ArrowLeft' ? -d : k === 'ArrowRight' ? d : 0, dy = k === 'ArrowUp' ? -d : k === 'ArrowDown' ? d : 0;
      if (!dx && !dy) return;
      e.preventDefault();
      const x = clamp(this.pen.x + dx, 0, 255), y = clamp(this.pen.y + dy, 0, 255);
      if (this.cur) this.addPoint(x, y); else { this.pen.x = x; this.pen.y = y; }
    });
  }
  /** Where a point really lands on the paper (the easel may have been "straightened"). */
  private land(x: number, y: number): Pt {
    if (this.step !== 'blind' || this.pass !== 1 || !this.nudge.a) return [x, y];
    const c = Math.cos(this.nudge.a), s = Math.sin(this.nudge.a), dx = x - 128, dy = y - 128;
    return [clamp(128 + dx * c - dy * s + this.nudge.dx, 0, 255), clamp(128 + dx * s + dy * c + this.nudge.dy, 0, 255)];
  }
  private beginStroke(x: number, y: number) {
    const p = this.step === 'sign' ? 2 : this.pass;
    const prev = this.strokes.filter(s => s.p === p).pop();
    this.cur = { p, pts: [this.land(x, y)] };
    this.strokes.push(this.cur);
    this.pen.x = x; this.pen.y = y; this.pen.down = true; this.pen.last = performance.now(); this.pen.lx = x; this.pen.ly = y;
    this.idleSince = performance.now();
    if (this.step === 'blind') this.blindReact('start', prev ? Math.hypot(x - prev.pts[prev.pts.length - 1][0], y - prev.pts[prev.pts.length - 1][1]) : 0);
    if (this.step === 'sign') { const b = this.foot.querySelector('[data-act="signed"]') as HTMLButtonElement | null; if (b) b.disabled = false; if (this.can('signwow', 30)) { this.crew.tr.after(0.4, () => this.crew.tr.emote('wow', { vol: 0.6 })); this.crew.br.after(0.8, () => this.crew.br.emote('love', { vol: 0.5 })); } }
  }
  private addPoint(x: number, y: number) {
    const c = this.cur; if (!c) return;
    if (Math.hypot(x - this.pen.x, y - this.pen.y) < 1.6) return;
    if (c.pts.length > 900) return;
    c.pts.push(this.land(x, y));
    this.pen.x = x; this.pen.y = y; this.idleSince = performance.now();
    // the sound of a pencil (or a squeaky marker) on paper, louder when you scribble fast
    const now = performance.now(), dt = Math.max(1, now - this.pen.last);
    if (now - this.pen.last > 34) {
      const sp = Math.hypot(x - this.pen.lx, y - this.pen.ly) / dt * 1000;
      const p = c.p;
      this.ctx.sfx.noise(0.05, { type: 'bandpass', freq: p === 1 ? 3400 + Math.min(1500, sp * 2) : p === 2 ? 2600 : 1500 + Math.min(1400, sp * 3), q: p === 1 ? 4 : 1.2, vol: clamp(sp / 4000, 0.012, 0.06) });
      this.pen.last = now; this.pen.lx = x; this.pen.ly = y;
    }
    if (this.step === 'blind') { if (x < 10 || x > 246 || y < 10 || y > 246) this.blindReact('edge', 0); if (c.pts.length === 90) this.blindReact('long', 0); }
  }
  private endStroke() { this.cur = null; this.pen.down = false; }

  /* ---- the crew can see it ---- */
  private can(k: string, sec: number) { const n = performance.now(); if ((this.cool[k] || 0) > n) return false; this.cool[k] = n + sec * 1000; return true; }
  private blindReact(kind: 'start' | 'edge' | 'long' | 'idle', jump: number) {
    const A = this.crew;
    const n = this.strokes.filter(s => s.p === this.pass).length;
    if (kind === 'edge' && this.can('edge', 2.5)) { A.bl.emote('uhoh', { vol: 0.6 }); return; }
    if (kind === 'long' && this.can('long', 4)) { A.tl.emote('laugh', { vol: 0.7 }); A.bl.after(0.5, () => { A.bl.voiceSay('shush', { vol: 0.7 }); A.bl.speak('mouth', 1.0); A.bl.shake(0.3, 0.05); }); A.tl.after(0.9, () => A.tl.emote('shy', { quiet: true })); return; }
    if (kind === 'idle' && this.can('idle', 3)) { A.bl.emote('huh', { vol: 0.5 }); A.bl.speak('pencil', 1.4); return; }
    if (kind !== 'start') return;
    if (jump > 85 && this.can('jump', 1.6)) { A.tr.emote('gasp', { vol: 0.7 }); A.tr.speak('bang', 0.9); return; }
    if (n >= 2 && this.can('giggle', 1.4)) { const who = Math.random() < 0.6 ? A.tl : A.br; who.emote(who === A.br ? 'cry' : 'giggle', { vol: 0.45 }); }
  }

  /* ---- frame ---- */
  private frame(now: number) {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.stepT += dt;
    this.pc.fit(); this.fx.fit();
    if (this.timer.on) {
      this.timer.t += dt;
      const left = this.timer.dur - this.timer.t;
      for (const s of [3, 2, 1]) if (left <= s && left > s - 0.1 && !this.once.has('cd' + s)) { this.once.add('cd' + s); this.ctx.sfx.tick(1.6); this.ctx.sfx.tone(880, 0.06, { vol: 0.06 }); }
      if (this.timer.t >= 0 && !this.once.has('go')) { this.once.add('go'); this.ctx.sfx.tone(660, 0.1, { vol: 0.08 }); this.music.play('bidding', SONGS.bidding, { vol: 0.22 }); }
      if (left <= 0) { this.music.stop(0.2); this.endPass(); }
      else if (this.timer.t > 1.4 && performance.now() - this.idleSince > 1900 && !this.pen.down) this.blindReact('idle', 0);
    }
    if (this.step === 'reveal' && this.stepT > 1.7 && !this.once.has('laugh')) { this.once.add('laugh'); this.afterReveal(); this.music.play('minuet', SONGS.minuet, { vol: 0.3 }); }
    for (const a of Object.values(this.crew)) a.update(dt);
    this.drawPaper();
    this.drawFx(dt);
    this.ctx.metrics.frame(now);
  }
  private drawPaper() {
    const g = this.pc.g, S = this.pc.pw; if (S < 8) return;
    g.fillStyle = '#f7efe0'; g.fillRect(0, 0, S, this.pc.ph);
    // paper tooth
    g.fillStyle = 'rgba(160,130,90,.05)'; for (let i = 0; i < 60; i++) { const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * S, y = (Math.sin(i * 37.3) * 0.5 + 0.5) * S; g.fillRect(x, y, 2, 2); }
    const k = S / 256, boil = Math.max(0.6, k * 0.55);
    const st = this.step;
    if (st === 'blind') {
      // under the blindfold: nothing to see but your own fingertip
      const drop = ease.out(clamp((this.timer.t + 0.45) / 0.35, 0, 1));
      if (this.pass === 1) drawStrokes(g, this.strokes, 0, 0, S, { t: this.t, boil, passes: [0] });
      this.drawCover(g, S, drop);
      if (this.pen.down || this.pen.id !== null) {
        const x = this.pen.x * k, y = this.pen.y * k;
        const gr = g.createRadialGradient(x, y, 0, x, y, S * 0.06); gr.addColorStop(0, 'rgba(255,233,168,.9)'); gr.addColorStop(1, 'rgba(255,233,168,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, S * 0.06, 0, Math.PI * 2); g.fill();
      }
      return;
    }
    if (st === 'reveal') {
      const lift = ease.inOut(clamp((this.stepT - 0.45) / 0.4, 0, 1));
      const prev = this.pass === 0 ? [] : [0];
      if (prev.length) drawStrokes(g, this.strokes, 0, 0, S, { t: this.t, boil, passes: prev });
      const mine = this.strokes.filter(s => s.p === this.pass);
      drawStrokes(g, mine, 0, 0, S, { t: this.t, boil, upto: clamp((this.stepT - 0.55) / 1.1, 0, 1) });
      if (lift < 1) { g.save(); g.translate(0, -lift * S * 1.05); this.drawCover(g, S, 1); g.restore(); }
      return;
    }
    drawStrokes(g, this.strokes, 0, 0, S, { t: this.t, boil });
    if (st === 'sign' && !this.strokes.some(s => s.p === 2)) {
      g.save(); g.setLineDash([S * 0.02, S * 0.015]); g.strokeStyle = `rgba(42,95,214,${0.45 + 0.3 * Math.sin(this.t * 4)})`; g.lineWidth = Math.max(1.5, S * 0.006);
      rrect(g, S * 0.5, S * 0.8, S * 0.46, S * 0.16, S * 0.03); g.stroke(); g.restore();
      g.save(); g.translate(S * 0.9, S * 0.78); PICTS.pencil(g, S * 0.12); g.restore();
    }
  }
  /** The blindfold, as seen from outside: a velvet cover over the paper. */
  private drawCover(g: CanvasRenderingContext2D, S: number, k: number) {
    const y0 = -S + k * S;
    g.save(); g.translate(0, y0);
    const v = g.createLinearGradient(0, 0, S, 0); for (let i = 0; i <= 8; i++) v.addColorStop(i / 8, i % 2 ? '#6e1529' : '#4a0d1e');
    g.fillStyle = v; g.fillRect(0, 0, S, S);
    const sh = g.createLinearGradient(0, 0, 0, S); sh.addColorStop(0, 'rgba(0,0,0,.25)'); sh.addColorStop(0.5, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = sh; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(233,196,106,.55)'; g.lineWidth = Math.max(1, S * 0.006); g.setLineDash([S * 0.015, S * 0.012]); rrect(g, S * 0.05, S * 0.05, S * 0.9, S * 0.9, S * 0.03); g.stroke(); g.setLineDash([]);
    g.save(); g.translate(S / 2, S * 0.42); PICTS.mask(g, S * 0.42); g.restore();
    g.fillStyle = '#e9c46a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 800 ${Math.round(S * 0.075)}px 'Playfair Display', Georgia, serif`;
    g.fillText('No peeking', S / 2, S * 0.64, S * 0.86);
    g.restore();
  }
  private drawFx(_dt: number) {
    const g = this.fx.g, W = this.fx.pw, H = this.fx.ph; if (W < 8) return;
    const d = this.fx.dpr || 1;
    g.clearRect(0, 0, W, H);
    const pb = this.paperBox;
    const r = this.r * d;
    const faces = (s: string, m: string) => this.ctx.faces.get(s, m);
    // the crew, leaning in to peek while you can't
    const peek = this.step === 'blind' ? 1 : 0;
    (Object.keys(this.crew) as SlotId[]).forEach(id => {
      const a = this.crew[id], s = this.slots[id]; if (!s) return;
      let x = s.x, y = s.y;
      const pk = this.step === 'blind' ? clamp((this.timer.t + 0.45) / 0.5, 0, 1) : 0;
      if (this.mode === 'tb' && (id === 'tl' || id === 'tr')) { x += (id === 'tl' ? 1 : -1) * this.r * 0.3 * pk; y += this.r * 0.75 * pk; }
      if (this.mode === 'tb' && (id === 'bl' || id === 'br')) y -= this.r * 0.25 * pk;
      if (this.mode === 'side') x += (id === 'tl' || id === 'bl' ? 1 : -1) * this.r * 0.5 * pk;
      a.x = x * d; a.y = y * d; a.r = r;
      if (!a.fainted) a.restRot = s.lean * peek * 1.25;
      a.draw(g, faces, { shadow: this.mode === 'side' ? id === 'bl' || id === 'br' : id === 'bl' || id === 'br' });
    });
    // the timer: a gold fuse burning round the frame
    if (this.timer.on && this.timer.t > 0) {
      const left = clamp(1 - this.timer.t / this.timer.dur, 0, 1);
      const x0 = (pb.x - 16) * d, y0 = (pb.y - 16) * d, w = (pb.w + 32) * d, hh = (pb.h + 32) * d;
      const per = 2 * (w + hh), len = per * left;
      g.save(); g.lineWidth = Math.max(3, 4 * d); g.lineCap = 'round';
      g.strokeStyle = left < 0.3 ? '#ff5d5d' : '#ffd98f';
      g.shadowColor = g.strokeStyle; g.shadowBlur = 10 * d;
      g.setLineDash([len, per]); g.lineDashOffset = 0;
      g.beginPath(); g.moveTo(x0 + w / 2, y0); g.lineTo(x0 + w, y0); g.lineTo(x0 + w, y0 + hh); g.lineTo(x0, y0 + hh); g.lineTo(x0, y0); g.lineTo(x0 + w / 2, y0); g.stroke();
      g.restore();
      const secs = Math.ceil(this.timer.dur - this.timer.t);
      if (secs <= 3) {
        const f = (this.timer.dur - this.timer.t) % 1;
        g.save(); g.globalAlpha = clamp(f * 1.6, 0, 1); g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `900 ${Math.round(pb.w * d * 0.28 * (1 + (1 - f) * 0.25))}px 'Playfair Display', Georgia, serif`;
        g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 16 * d;
        g.fillText(String(secs), (pb.x + pb.w / 2) * d, (pb.y + pb.h * 0.82) * d);
        g.restore();
      }
    }
    if (this.stamp) {
      this.stamp.t += _dt;
      drawStamp(g, this.stamp.text, (pb.x + pb.w / 2) * d, (pb.y + pb.h * 0.5) * d, pb.w * d * 0.11, -0.12, clamp(this.stamp.t / 0.9, 0, 1) * (this.stamp.t < 1.1 ? 1 : Math.max(0, 1 - (this.stamp.t - 1.1) * 4)), '#e63946');
      if (this.stamp.t > 1.5) this.stamp = null;
    }
    // the wax seal grows as you hold, then thumps onto the corner
    if (this.seal > 0 && (this.step === 'price' || (this.step === 'sent' && this.stepT < 0.68))) {
      const k = this.step === 'sent' ? 1 : this.seal;
      const cx = (pb.x + pb.w * 0.86) * d, cy = (pb.y + pb.h * 0.86) * d, rr = pb.w * d * 0.09 * (0.4 + 0.6 * k);
      g.save(); g.globalAlpha = Math.min(1, k * 2);
      g.fillStyle = '#9b1b30'; g.beginPath(); for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2, rad = rr * (1 + 0.08 * Math.sin(i * 2.7)); g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,190,190,.35)'; g.lineWidth = rr * 0.12; g.beginPath(); g.arc(cx, cy, rr * 0.66, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(255,220,220,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 900 ${Math.round(rr * 0.8)}px 'Playfair Display', Georgia, serif`; g.fillText('M', cx, cy + rr * 0.04);
      g.restore();
    }
  }
}

let fontsAdded = false;
function addFonts() { if (fontsAdded) return; fontsAdded = true; try { if (!document.querySelector('link[data-ma-fonts]')) document.head.appendChild(h('link', { rel: 'stylesheet', href: MA_FONTS, 'data-ma-fonts': '1' })); } catch (e) { /* optional */ } }
