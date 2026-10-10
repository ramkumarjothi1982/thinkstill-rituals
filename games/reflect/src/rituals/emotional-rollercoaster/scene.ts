/* Emotional Rollercoaster — the rider's side.
 *   hook (the chain clanks, the cart crests, the camera tips over the drop) → build: drag each moment's peg up or down
 *   for how it felt, pick how it moved you (smooth, drop, loop, tunnel, corkscrew); a test cart rides your track as you
 *   shape it; take a test ride → pull the lever to lock the track → waiting → the ride together (reveal.ts). */
import type { RoomView, Player } from '../../room/protocol';
import type { Scene, SceneCtx } from '../../console/types';
import { h, clear, Surface, drag, hold, clamp } from '../../ui/dom';
import { MODS, Mod, Moment, N_SEG, RIDE_LEN, SATURDAY, Seg, T_PRE, T_SEG } from './content';
import { buildTrack, Track, B, AMP, speedAt } from './track';
import { renderEditor, mapFor, wy, segOfX, modIcon } from './editor';
import { renderRide, RIDER_COLORS, momentIcon, segAt } from './ride';
import { ER_CSS, ER_FONTS } from './style';
import { RideDirector } from './reveal';

export function createErScene(ctx: SceneCtx): Scene { return new ErScene(ctx); }

class ErScene implements Scene {
  el: HTMLElement;
  private view: RoomView | null = null;
  private round = -1;
  private mode: string | null = null;
  private builder: Builder | null = null;
  private waitEl: HTMLElement | null = null;
  private dir: RideDirector | null = null;
  private hookRaf = 0;
  constructor(private ctx: SceneCtx) {
    addFonts();
    this.el = h('div', { class: 'er', 'data-ritual': 'emotional-rollercoaster' }, h('style', { text: ER_CSS }));
    ctx.stage.appendChild(this.el);
    ctx.faces.onReady = () => { if (this.builder) this.builder.dirty = true; };
  }
  get me(): Player | null { const v = this.view; return v ? v.players.find(p => p.pid === v.you) || null : null; }
  get moments(): Moment[] { return (this.view && this.view.pub && this.view.pub.moments) || SATURDAY; }
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
      if (!this.dir) { this.clearPlay(); this.mode = 'ride'; this.dir = new RideDirector(this.ctx, this.el); }
      this.dir.update(v, prev);
    }
  }
  resize() { if (this.builder) this.builder.dirty = true; if (this.dir) this.dir.resize(); }
  destroy() { this.reset(); this.el.remove(); }
  private clearPlay() { cancelAnimationFrame(this.hookRaf); if (this.builder) { this.builder.destroy(); this.builder = null; } if (this.waitEl) { this.waitEl.remove(); this.waitEl = null; } }
  private reset() { this.clearPlay(); if (this.dir) { this.dir.destroy(); this.dir = null; } Array.from(this.el.children).forEach(c => { if (c.tagName !== 'STYLE') c.remove(); }); this.mode = null; }

  private hook() {
    this.mode = 'hook';
    const ctx = this.ctx, me = this.me!;
    const sf = new Surface(); sf.maxDpr = 1.5;
    const title = h('div', { class: 'sign', style: { fontSize: 'clamp(24px,7vw,46px)', lineHeight: '1.1', color: '#ffd27a', textShadow: '0 4px 24px rgba(0,0,0,.8)', opacity: '0', transition: 'opacity .4s' } }, 'Same day. Different drops.');
    const sub = h('div', { style: { fontSize: '14px', marginTop: '10px', opacity: '0', transition: 'opacity .4s' } }, 'One Saturday, five moments. Build the ride of how it felt to you.');
    const words = h('div', { style: { position: 'absolute', left: '16px', right: '16px', top: '40%', textAlign: 'center', pointerEvents: 'none' } }, title, sub);
    const skip = h('button', { class: 'er-btn ghost', style: { position: 'absolute', right: '14px', bottom: 'calc(14px + var(--rf-safe-b,0px))', minHeight: '44px', padding: '0 18px', width: 'auto' } }, 'Skip');
    const wrap = h('div', { class: 'er-stage' }, sf.canvas, words, skip);
    this.el.appendChild(wrap);
    const demo = [buildTrack([{ h: -0.5, mod: 'drop' }, { h: -0.2, mod: 'tunnel' }, { h: 0.7, mod: 'loop' }, { h: -0.4, mod: 'cork' }, { h: 0.6, mod: 'smooth' }]), buildTrack([{ h: -0.9, mod: 'drop' }, { h: 0.8, mod: 'loop' }, { h: 0.9, mod: 'loop' }, { h: -0.8, mod: 'drop' }, { h: 1, mod: 'loop' }]), buildTrack([{ h: -0.1, mod: 'smooth' }, { h: 0.1, mod: 'smooth' }, { h: 0.3, mod: 'smooth' }, { h: 0, mod: 'cork' }, { h: 0.3, mod: 'smooth' }])];
    const riders = [{ pid: 'me', avatar: me.avatar, name: 'You', human: true, track: demo[0], color: RIDER_COLORS[0] }, { pid: 'r', avatar: 'rush', name: 'Rush', human: false, track: demo[1], color: RIDER_COLORS[1] }, { pid: 's', avatar: 'still', name: 'Still', human: false, track: demo[2], color: RIDER_COLORS[2] }];
    const T0 = performance.now();
    let done = false, lastClank = 0;
    const go = () => { if (done) return; done = true; cancelAnimationFrame(this.hookRaf); wrap.remove(); this.startBuild(); };
    skip.addEventListener('click', go);
    wrap.addEventListener('pointerdown', (e) => { ctx.sfx.unlock(); if (e.target !== skip && performance.now() - T0 > 700) go(); });
    const frame = () => {
      if (done) return;
      this.hookRaf = requestAnimationFrame(frame);
      sf.fit();
      const k = (performance.now() - T0) / 1000;
      const t = 2.6 + k * 0.85;
      renderRide(sf.g, sf.pw, sf.ph, { riders, me: 0, t: Math.min(t, 7.5), assign: (p) => p, faces: (s, m) => ctx.faces.get(s, m), moments: this.moments });
      if (t < 3.6 && k - lastClank > 0.18) { lastClank = k; ctx.sfx.tick(0.5); }
      if (t >= 4.3) (this as any)._wh || ((this as any)._wh = 1, ctx.sfx.whoosh(false, 1.4));
      title.style.opacity = k > 2.2 ? '1' : '0'; sub.style.opacity = k > 2.6 ? '1' : '0';
      if (k > 5.4) go();
    };
    this.hookRaf = requestAnimationFrame(frame);
  }
  private startBuild() {
    this.mode = 'build';
    this.builder = new Builder(this.ctx, this.me!, this.moments, (segs) => { this.ctx.room.act('seal', { segs }); this.mode = 'sealing'; });
    this.el.appendChild(this.builder.el);
  }
  private showWait(spectating: boolean) {
    const v = this.view; if (!v) return;
    if (this.builder) this.builder.stopTest();
    if (!this.waitEl) { this.waitEl = h('div', { class: 'er-wait' }); this.el.appendChild(this.waitEl); }
    this.mode = 'wait';
    clear(this.waitEl);
    const parts = v.players.filter(p => !p.spectator);
    this.waitEl.appendChild(h('h3', null, spectating ? 'You’re watching this ride' : 'Track locked.'));
    this.waitEl.appendChild(h('div', { style: { fontSize: '14px', maxWidth: '420px', opacity: '.85' } }, spectating ? 'This ritual had already started. You’ll see the ride, and you get a cart next round.' : 'Nobody sees your track until everyone rides together.'));
    const chips = h('div', { class: 'er-chips' });
    for (const p of parts) {
      const sealed = !!v.sealed[p.pid];
      chips.appendChild(h('div', { class: 'er-chip' }, h('img', { alt: '', src: this.ctx.faces.url(p.avatar, sealed ? 'happy' : 'think') }), h('b', null, p.pid === v.you ? p.name + ' (you)' : p.name), !p.human ? h('small', null, 'Bubble companion') : null, h('small', null, sealed ? 'locked in' : p.connected ? 'building…' : 'reconnecting…')));
    }
    this.waitEl.appendChild(chips);
    const waiting = parts.filter(p => !v.sealed[p.pid]);
    if (this.ctx.room.isHost && waiting.length && parts.some(p => p.human && v.sealed[p.pid])) this.waitEl.appendChild(h('button', { class: 'er-btn ghost', style: { padding: '0 18px' }, onclick: () => this.ctx.room.act('force_reveal') }, 'Ride without ' + (waiting.length === 1 ? waiting[0].name : waiting.length + ' players')));
  }
}

/* ======================================================================================================== */
class Builder {
  el: HTMLElement;
  dirty = true;
  private segs: Seg[] = Array.from({ length: N_SEG }, () => ({ h: 0, mod: 'smooth' as Mod }));
  private track: Track;
  private sel = 0;
  private sf = new Surface();
  private box: HTMLElement;
  private card: HTMLElement;
  private mods: HTMLElement;
  private raf = 0;
  private destroyed = false;
  private t0 = performance.now();
  private test: { el: HTMLElement; sf: Surface; t0: number; raf: number; hud: HTMLElement; lastSeg: number } | null = null;
  private lever: HTMLButtonElement;
  private touched = new Set<number>();
  private hint: HTMLElement;
  private lastTick = 0;
  constructor(private ctx: SceneCtx, private me: Player, private moments: Moment[], private onLock: (segs: Seg[]) => void) {
    this.track = buildTrack(this.segs);
    this.card = h('div', { class: 'er-card', 'aria-live': 'polite' });
    this.box = h('div', { class: 'er-canvas', role: 'application', tabindex: '0', 'aria-label': 'Your track. Drag a moment up for how high it lifted you, down for how low it took you. Arrow keys work too.' }, this.sf.canvas, h('div', { class: 'lab', style: { top: '16%' } }, 'lifted me'), h('div', { class: 'lab', style: { bottom: '14%' } }, 'sank me'));
    this.mods = h('div', { class: 'er-mods', role: 'group', 'aria-label': 'How it moved you' });
    this.lever = h('button', { class: 'er-btn er-lever', 'aria-label': 'Hold to lock your track' }, 'HOLD TO LOCK', h('i')) as HTMLButtonElement;
    const testBtn = h('button', { class: 'er-btn ghost', onclick: (e: Event) => { ctx.sfx.unlock(); ctx.sfx.gesture(e); this.startTest(); } }, '▶ Test ride');
    this.hint = h('div', { class: 'er-hint' });
    this.el = h('div', { class: 'er-build' }, this.card, this.box, this.mods, h('div', { class: 'er-actions' }, testBtn, this.lever), this.hint);
    this.bind();
    this.renderCard(); this.renderMods(); this.updateHint();
    this.raf = requestAnimationFrame((n) => this.frame(n));
    ctx.faces.preload([[me.avatar, 'happy'], [me.avatar, 'wow'], [me.avatar, 'surprised'], [me.avatar, 'worried'], [me.avatar, 'determined'], [me.avatar, 'laugh']]);
    (globalThis as any).__erBuilder = this;
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); this.stopTest(); this.el.remove(); if ((globalThis as any).__erBuilder === this) delete (globalThis as any).__erBuilder; }
  get segList() { return this.segs.map(s => ({ ...s })); }
  /** Test hook / keyboard: set one moment directly. */
  setSeg(i: number, hgt: number, mod?: Mod) { this.sel = i; this.segs[i].h = clamp(Math.round(hgt * 100) / 100, -1, 1); if (mod) this.segs[i].mod = mod; this.touched.add(i); this.rebuild(); this.renderCard(); this.renderMods(); }
  private rebuild() { this.track = buildTrack(this.segs); this.dirty = true; this.updateHint(); }
  private frame(now: number) {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame((n) => this.frame(n));
    this.sf.fit();
    const W = this.sf.pw, H = this.sf.ph; if (W < 4) return;
    const loopT = T_PRE + ((now - this.t0) / 1000) % (N_SEG * T_SEG);
    renderEditor(this.sf.g, W, H, this.track, { sel: this.sel, cartT: loopT, face: this.ctx.faces.get(this.me.avatar, Math.abs(Math.sin(loopT)) > 0.7 ? 'wow' : 'happy'), moments: this.moments });
    this.ctx.metrics.frame(now);
  }
  private renderCard() {
    clear(this.card);
    const m = this.moments[this.sel], sg = this.segs[this.sel];
    const ic = momentIcon(m.icon, 104); const c = h('canvas', { width: '104', height: '104' }) as HTMLCanvasElement; c.getContext('2d')!.drawImage(ic, 0, 0);
    const feel = sg.h > 0.55 ? 'lifted you high' : sg.h > 0.15 ? 'lifted you a little' : sg.h < -0.55 ? 'took you low' : sg.h < -0.15 ? 'dipped a little' : 'felt level';
    const mod = MODS.find(x => x.id === sg.mod)!;
    this.card.appendChild(c);
    this.card.appendChild(h('div', null, h('b', null, 'Moment ' + (this.sel + 1) + ' of 5 · ' + m.time), h('span', null, m.text), h('small', null, this.touched.has(this.sel) ? `It ${feel} · ${mod.label.toLowerCase()}: ${mod.blurb.toLowerCase()}` : 'Drag its peg up or down for how it felt.')));
  }
  private renderMods() {
    clear(this.mods);
    for (const md of MODS) {
      const c = h('canvas', { width: '56', height: '40' }) as HTMLCanvasElement;
      const g = c.getContext('2d')!; modIcon(g, md.id, 28, 22, 34, '#fff4ea');
      const on = this.segs[this.sel].mod === md.id;
      this.mods.appendChild(h('button', { class: 'er-mod' + (on ? ' on' : ''), 'aria-pressed': String(on), 'aria-label': md.label + ': ' + md.blurb, onclick: (e: Event) => { this.ctx.sfx.gesture(e); this.ctx.metrics.mark(e); this.segs[this.sel].mod = md.id; this.touched.add(this.sel); this.ctx.sfx.whoosh(md.id !== 'tunnel', 0.35); this.rebuild(); this.renderMods(); this.renderCard(); } }, c, h('span', null, md.label)));
    }
  }
  private updateHint() {
    const left = N_SEG - this.touched.size;
    this.hint.textContent = left > 0 ? `${left} moment${left === 1 ? '' : 's'} still level — tap a moment, then drag its peg.` : 'Your whole Saturday is built. Test ride it, then hold the lever to lock it in.';
  }
  private bind() {
    const ctx = this.ctx;
    const setFromPointer = (x: number, y: number) => {
      const r = this.box.getBoundingClientRect();
      const m = mapFor(r.width, r.height);
      const i = segOfX(m, x);
      if (i !== this.sel) { this.sel = i; this.renderMods(); ctx.sfx.pop(440 + i * 60); }
      const hh = clamp((wy(m, y) - B) / AMP, -1, 1);
      this.segs[i].h = Math.round(hh * 20) / 20;
      this.touched.add(i);
      this.rebuild(); this.renderCard();
      const now = performance.now(); if (now - this.lastTick > 60) { this.lastTick = now; ctx.sfx.tick(1.2 + hh * 0.5); }
    };
    drag(this.box, {
      down: (x, y, e) => { ctx.sfx.unlock(); ctx.sfx.gesture(e); ctx.metrics.mark(e); setFromPointer(x, y); },
      move: (x, y, e) => { ctx.metrics.mark(e); setFromPointer(x, y); }
    });
    this.box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.sel = Math.max(0, this.sel - 1);
      else if (e.key === 'ArrowRight') this.sel = Math.min(N_SEG - 1, this.sel + 1);
      else if (e.key === 'ArrowUp') { this.segs[this.sel].h = clamp(this.segs[this.sel].h + 0.1, -1, 1); this.touched.add(this.sel); }
      else if (e.key === 'ArrowDown') { this.segs[this.sel].h = clamp(this.segs[this.sel].h - 0.1, -1, 1); this.touched.add(this.sel); }
      else return;
      e.preventDefault(); this.rebuild(); this.renderCard(); this.renderMods();
    });
    const bar = this.lever.querySelector('i') as HTMLElement;
    hold(this.lever, 800, {
      start: () => { ctx.sfx.tone(160, 0.8, { type: 'sawtooth', glide: 320, vol: 0.04, filter: 900 }); },
      progress: (k) => { bar.style.width = (k * 100) + '%'; },
      done: () => { this.stopTest(); ctx.sfx.thud(); ctx.sfx.tick(0.6); this.onLock(this.segs.map(s => ({ ...s }))); },
      cancel: () => { bar.style.width = '0'; }
    });
  }
  /* a solo test ride of your own track */
  private startTest() {
    if (this.test) return;
    const sf = new Surface(); sf.maxDpr = 1.5;
    const hud = h('div', { class: 'er-hud' });
    const close = h('button', { class: 'er-btn ghost er-close', style: { padding: '0 18px', width: 'auto' }, onclick: () => this.stopTest() }, 'Back to building');
    const el = h('div', { class: 'er-test' }, sf.canvas, hud, close);
    this.el.appendChild(el);
    this.test = { el, sf, t0: performance.now(), raf: 0, hud, lastSeg: -2 };
    const riders = [{ pid: 'me', avatar: this.me.avatar, name: 'You', human: true, track: this.track, color: RIDER_COLORS[0] }];
    let lastClank = 0;
    const frame = () => {
      const T = this.test; if (!T) return;
      T.raf = requestAnimationFrame(frame);
      sf.fit();
      const t = 2.4 + ((performance.now() - T.t0) / 1000) * 1.35;
      if (t > RIDE_LEN) { this.stopTest(); return; }
      renderRide(sf.g, sf.pw, sf.ph, { riders, me: 0, t, assign: (p) => p, faces: (s, m) => this.ctx.faces.get(s, m), moments: this.moments });
      const seg = segAt(t);
      if (seg !== T.lastSeg) { T.lastSeg = seg; this.hudFor(hud, seg); if (seg >= 0 && seg < N_SEG) this.ctx.sfx.chime([392 + seg * 40]); }
      if (t < 3.6 && t - lastClank > 0.2) { lastClank = t; this.ctx.sfx.tick(0.5); }
      const v = speedAt(this.track, t); if (v > 18 && Math.random() < 0.03) this.ctx.sfx.whoosh(false, 0.5);
    };
    this.test.raf = requestAnimationFrame(frame);
  }
  private hudFor(hud: HTMLElement, seg: number) {
    clear(hud);
    if (seg < 0 || seg >= N_SEG) return;
    const m = this.moments[seg];
    const c = h('canvas', { width: '68', height: '68' }) as HTMLCanvasElement; c.getContext('2d')!.drawImage(momentIcon(m.icon, 68), 0, 0);
    hud.appendChild(h('div', null, c, h('b', null, m.time), m.text));
  }
  stopTest() { if (!this.test) return; cancelAnimationFrame(this.test.raf); this.test.el.remove(); this.test = null; }
}

let fontsAdded = false;
function addFonts() { if (fontsAdded) return; fontsAdded = true; try { if (!document.querySelector('link[data-er-fonts]')) document.head.appendChild(h('link', { rel: 'stylesheet', href: ER_FONTS, 'data-er-fonts': '1' })); } catch (e) { /* optional */ } }
