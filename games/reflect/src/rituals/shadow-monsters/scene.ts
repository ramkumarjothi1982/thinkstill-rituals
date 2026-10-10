/* Shadow Monsters — your side of the sheet.
 *   hook: a match, a lamp, a GIANT monster on the sheet, a scream… cut backstage: Loopie holding a croissant.
 *   build: pick ridiculous things from the toybox, mount them on sticks between the lamp and the sheet, slide them
 *          towards the lamp until they loom. Tap to turn. The Bubbles react to every change.
 *   seal: hold the lamp's chain — the lights go down on your monster.
 *   then the Shadow Show (show.ts). */
import type { RoomView, Player, Slug } from '../../room/protocol';
import type { Scene, SceneCtx } from '../../console/types';
import { h, clear, Surface, hold, clamp } from '../../ui/dom';
import { Projector } from '../../gfx/projector';
import { BubbleActor } from '../../actor/bubble';
import { Babble } from '../../actor/babble';
import { PICTS } from '../../actor/picts';
import { Music, thunder } from '../../audio/music';
import { OBJECTS, ObjId, objSprite, objPict } from './objects';
import { MAX_OBJS, TAGS, TagId, COMPANION_MONSTERS, TAG_PICT } from './content';
import { Placed, Light, paintSheet, renderBackstage, renderAudience, sheetCanvasFor, clampX, clampZ, monsterSize, scaleAt, K } from './world';
import { SM_CSS, SM_FONTS } from './style';
import { ShowDirector } from './show';
import { SONGS } from './songs';

export function createSmScene(ctx: SceneCtx): Scene { return new SmScene(ctx); }

class SmScene implements Scene {
  el: HTMLElement;
  private view: RoomView | null = null;
  private round = -1;
  private mode: string | null = null;
  private builder: Builder | null = null;
  private waitEl: HTMLElement | null = null;
  private show: ShowDirector | null = null;
  private hookRaf = 0;
  readonly babble: Babble;
  readonly music: Music;
  constructor(private ctx: SceneCtx) {
    addFonts();
    this.babble = new Babble(ctx.sfx);
    this.music = new Music(ctx.sfx);
    this.el = h('div', { class: 'sm', 'data-ritual': 'shadow-monsters' }, h('style', { text: SM_CSS }));
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
      if (!this.show) { this.clearPlay(); this.mode = 'show'; this.show = new ShowDirector(this.ctx, this.el, this.babble, this.music); }
      this.show.update(v, prev);
    }
  }
  resize() { if (this.show) this.show.resize(); }
  destroy() { this.reset(); this.music.stop(0.2); this.el.remove(); }
  private clearPlay() { cancelAnimationFrame(this.hookRaf); if (this.builder) { this.builder.destroy(); this.builder = null; } if (this.waitEl) { this.waitEl.remove(); this.waitEl = null; } }
  private reset() { this.clearPlay(); if (this.show) { this.show.destroy(); this.show = null; } Array.from(this.el.children).forEach(c => { if (c.tagName !== 'STYLE') c.remove(); }); this.mode = null; }

  /* ---------------- the hook: 0.3 s darkness, a match, a monster, a scream, a croissant ---------------- */
  private hook() {
    this.mode = 'hook';
    const ctx = this.ctx;
    const sf = new Surface(); sf.maxDpr = 1.5;
    const title = h('div', { class: 'sm-title spook', style: { opacity: '0', transition: 'opacity .5s' } }, 'Everything looks bigger in the dark.');
    const sub = h('div', { class: 'sm-sub', style: { opacity: '0', transition: 'opacity .5s' } }, 'Build what’s been looming. Then turn the lights on it.');
    const words = h('div', { class: 'sm-words low' }, title, sub);
    const skip = h('button', { class: 'sm-btn ghost sm-skip' }, 'Skip');
    const wrap = h('div', { class: 'sm-stage' }, sf.canvas, words, skip);
    this.el.appendChild(wrap);
    const dragon = COMPANION_MONSTERS.loopie[0].objs;
    const sheet = document.createElement('canvas');
    const P = new Projector();
    const loopie = new BubbleActor('loopie', 0, 0, 20, this.babble);
    const rush = new BubbleActor('rush', 0, 0, 20, this.babble);
    const T0 = performance.now();
    let done = false, last = T0;
    const once = new Set<string>();
    const doOnce = (k: string, f: () => void) => { if (!once.has(k)) { once.add(k); f(); } };
    const go = () => { if (done) return; done = true; cancelAnimationFrame(this.hookRaf); wrap.remove(); this.music.stop(0.6); this.startBuild(); };
    skip.addEventListener('click', go);
    wrap.addEventListener('pointerdown', (e) => { ctx.sfx.unlock(); if (e.target !== skip && performance.now() - T0 > 800) go(); });
    const frame = (now: number) => {
      if (done) return;
      this.hookRaf = requestAnimationFrame(frame);
      sf.fit();
      const g = sf.g, W = sf.pw, H = sf.ph, k = (now - T0) / 1000, dt = (now - last) / 1000; last = now;
      if (k < 0.3) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
      else if (k < 0.55) {
        doOnce('match', () => { ctx.sfx.noise(0.25, { type: 'highpass', freq: 2500, vol: 0.3 }); ctx.sfx.noise(0.6, { type: 'bandpass', freq: 900, vol: 0.05, at: 0.1 }); });
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        const r = Math.min(W, H) * 0.06 * (0.8 + Math.random() * 0.3);
        g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(W / 2, H * 0.78, 0, W / 2, H * 0.78, r * 3); gr.addColorStop(0, 'rgba(255,220,150,1)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
      } else if (k < 2.25) {
        doOnce('monster', () => { ctx.sfx.thud(); thunder(ctx.sfx); this.music.hit('organ', ['D3', 'F3', 'Ab3', 'C#4'], { len: 1.6, vol: 1.1 }); });
        doOnce('scream', () => { setTimeout(() => this.babble.say('rush', 'scream', { vol: 1 }), 650); });
        sheetCanvasFor(sheet, W);
        paintSheet(sheet, dragon, { lampZ: 0, lamp: 1, house: 0, t: k }, true);
        const zoom = 1 + Math.min(1, (k - 0.55) / 1.7) * 0.12;
        renderAudience(g, W, H, { sheetCanvas: sheet, house: 0, t: k, zoom: zoom * (W / H < 0.8 ? 1.35 : 1.05), shake: k < 1.0 ? 1.4 : 0 });
      } else {
        doOnce('cut', () => {
          loopie.setMood('laugh', 3); loopie.emote('giggle'); rush.faint(-1);
          ctx.sfx.tick(0.8);
        });
        sheetCanvasFor(sheet, W);
        const L: Light = { lampZ: 0, lamp: 1, house: 0.35, t: k };
        paintSheet(sheet, dragon, L, false);
        loopie.update(dt); rush.update(dt);
        renderBackstage(g, W, H, { objs: dragon, light: L, sheetCanvas: sheet, proj: P, zoom: 1.0 + Math.min(1, (k - 2.25) / 0.6) * 0.9, focus: [0, 0.12 * K, 0.4 * K], focusY: 0.42, extra: (PP) => {
          const a = PP.project(-0.16 * K, 0, 0.36 * K), b = PP.project(0.3 * K, 0, 0.5 * K);
          const out = [] as { d: number; draw: (gg: CanvasRenderingContext2D) => void }[];
          if (a) { loopie.x = a.x; loopie.y = a.y; loopie.r = a.s * 0.06; out.push({ d: a.d, draw: (gg) => loopie.draw(gg, (s, m) => ctx.faces.get(s, m)) }); }
          if (b) { rush.x = b.x; rush.y = b.y; rush.r = b.s * 0.055; out.push({ d: b.d, draw: (gg) => rush.draw(gg, (s, m) => ctx.faces.get(s, m)) }); }
          return out;
        } });
        title.style.opacity = '1';
        if (k > 2.8) sub.style.opacity = '1';
      }
      if (k > 5.6) go();
    };
    this.hookRaf = requestAnimationFrame(frame);
  }
  private startBuild() {
    const v = this.view; if (!v) return;
    this.mode = 'build';
    const box: ObjId[] = (v.pub && v.pub.box) || ['fork', 'croissant', 'glove', 'doughnut', 'teapot', 'cactus', 'duck', 'umbrella'];
    const cast: Slug[] = v.players.filter(p => !p.human).map(p => p.avatar);
    this.builder = new Builder(this.ctx, this.me!, box, cast, this.babble, this.music, (objs, tag) => { this.ctx.room.act('seal', { objs, tag }); this.mode = 'sealing'; });
    this.el.appendChild(this.builder.el);
  }
  private showWait(spectating: boolean) {
    const v = this.view; if (!v) return;
    if (!this.waitEl) { this.waitEl = h('div', { class: 'sm-wait' }); this.el.appendChild(this.waitEl); }
    if (this.builder) { this.builder.destroy(); this.builder = null; }
    this.mode = 'wait';
    clear(this.waitEl);
    const parts = v.players.filter(p => !p.spectator);
    this.waitEl.appendChild(h('h3', null, spectating ? 'You’re in the audience' : 'Lights down.'));
    this.waitEl.appendChild(h('div', { style: { fontSize: '14px', maxWidth: '420px', opacity: '.85' } }, spectating ? 'This show had already started. You’ll watch every monster, and build one next round.' : 'Your monster is waiting in the dark. Nobody sees it until the Shadow Show.'));
    const chips = h('div', { class: 'sm-chips' });
    for (const p of parts) {
      const sealed = !!v.sealed[p.pid];
      chips.appendChild(h('div', { class: 'sm-chip' }, h('img', { alt: '', src: this.ctx.faces.url(p.avatar, sealed ? 'cool' : 'think') }), h('b', null, p.pid === v.you ? p.name + ' (you)' : p.name), !p.human ? h('small', null, 'Bubble companion') : null, h('small', null, sealed ? 'monster ready' : p.connected ? 'building…' : 'reconnecting…')));
    }
    this.waitEl.appendChild(chips);
    const waiting = parts.filter(p => !v.sealed[p.pid]);
    if (this.ctx.room.isHost && waiting.length && parts.some(p => p.human && v.sealed[p.pid])) this.waitEl.appendChild(h('button', { class: 'sm-btn ghost', onclick: () => this.ctx.room.act('force_reveal') }, 'Start the show without ' + (waiting.length === 1 ? waiting[0].name : waiting.length + ' people')));
  }
}

/* ============================================ building ============================================ */
interface Disp { rot: number; hop: number; vh: number; }
const STAGEHANDS: { slug: Slug; at: [number, number]; r: number; prop?: string }[] = [
  { slug: 'glitch', at: [-0.4 * K, 0.12 * K], r: 0.05 },
  { slug: 'patch', at: [0.52 * K, 0.66 * K], r: 0.05 },
  { slug: 'still', at: [-0.88 * K, 1.42 * K], r: 0.055, prop: 'tea' },
  { slug: 'rush', at: [0.84 * K, 1.56 * K], r: 0.055 }
];

class Builder {
  el: HTMLElement;
  private sf = new Surface();
  private sheet = document.createElement('canvas');
  private P = new Projector();
  private objs: Placed[] = [];
  private disp: Disp[] = [];
  private sel = -1;
  private held = -1;
  private grab = { dx: 0, dz: 0, x0: 0, y0: 0, t0: 0, moved: false, out: false };
  private tag: TagId | null = null;
  private actors: Record<string, BubbleActor> = {};
  private raf = 0;
  private last = performance.now();
  private t = 0;
  private flicker = 0;
  private chain = 0;
  private sealing = 0;          // 0 = building; >0 = lights going down (seconds)
  private cool: Record<string, number> = {};
  private lastInteract = performance.now();
  private wasBig = false;
  private tray: HTMLElement;
  private tip: HTMLElement;
  private tagBtn: HTMLButtonElement;
  private tagsEl: HTMLElement | null = null;
  private lever: HTMLButtonElement;
  private canvasBox: HTMLElement;
  private destroyed = false;
  constructor(private ctx: SceneCtx, private me: Player, private box: ObjId[], cast: Slug[], private babble: Babble, private music: Music, private onSeal: (objs: Placed[], tag: TagId | null) => void) {
    this.sf.maxDpr = 1.5;
    this.tip = h('div', { class: 'sm-tip' }, 'Pick something from the box');
    this.canvasBox = h('div', { class: 'sm-canvas', role: 'application', tabindex: '0', 'aria-label': 'The stage. Drag an object towards the lamp to make its shadow loom, away to shrink it. Tap an object to turn it.' }, this.sf.canvas, this.tip);
    this.tray = h('div', { class: 'sm-tray', role: 'group', 'aria-label': 'The toybox' });
    this.tagBtn = h('button', { class: 'sm-btn ghost sm-tagbtn', 'aria-label': 'Name tag (optional)', onclick: () => this.toggleTags() }) as HTMLButtonElement;
    this.lever = h('button', { class: 'sm-btn sm-chain', 'aria-label': 'Hold to pull the chain and dim the lights' }, 'Hold the chain · lights down', h('i')) as HTMLButtonElement;
    this.el = h('div', { class: 'sm-build' },
      h('div', { class: 'sm-head' }, h('div', null, h('b', null, 'Build what’s been looming'), h('span', null, 'Slide things towards the lamp to make them loom. Tap one to turn it.'))),
      this.canvasBox, this.tray, h('div', { class: 'sm-foot' }, this.tagBtn, this.lever));
    this.renderTray(); this.renderTagBtn();
    // the stagehands (the Bubbles in this room first, then whoever is free)
    const want = new Set<Slug>(cast);
    STAGEHANDS.forEach(s => { const a = new BubbleActor(s.slug, 0, 0, 20, babble); if (s.prop) { a.prop = PICTS[s.prop]; a.propSide = 1; } if (s.slug === 'rush') a.facing = -1; if (s.slug === 'still') a.setMood('calm'); this.actors[s.slug] = a; void want; });
    this.bind();
    music.play('attic', SONGS.attic, { vol: 0.42 });
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const preload: [string, string][] = [];
    for (const s of STAGEHANDS) for (const m of ['neutral', 'surprised', 'cry', 'laugh', 'love', 'wow', 'dizzy', 'worried', 'calm', 'confused', 'happy', 'celebrate', 'sleepy']) preload.push([s.slug, m]);
    ctx.faces.preload(preload);
    (globalThis as any).__smBuilder = this;
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); this.el.remove(); if ((globalThis as any).__smBuilder === this) delete (globalThis as any).__smBuilder; }

  /* ---- test hooks ---- */
  list() { return this.objs.map(o => ({ ...o })); }
  boxList() { return this.box.slice(); }
  add(o: ObjId, x?: number, z?: number, r = 0) { const i = this.addObj(o, x, z); if (i >= 0) { this.objs[i].r = r; this.disp[i].rot = r; } return i; }
  move(i: number, x: number, z: number) { const p = this.objs[i]; if (!p) return; p.z = clampZ(z); p.x = clampX(x, p.z); }
  size() { return monsterSize(this.objs); }

  private frame(now: number) {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    if (this.sf.fit()) { /* resized */ }
    const g = this.sf.g, W = this.sf.pw, H = this.sf.ph; if (W < 8) return;
    // animate displayed rotations and hops
    this.objs.forEach((p, i) => { const d = this.disp[i]; d.rot += (p.r + Math.round((d.rot - p.r) / 8) * 8 - d.rot) * Math.min(1, dt * 14); d.vh -= 9.8 * dt; d.hop = Math.max(0, d.hop + d.vh * dt); if (d.hop === 0) d.vh = 0; });
    if (this.flicker > 0) this.flicker = Math.max(0, this.flicker - dt);
    this.brain(now);
    for (const a of Object.values(this.actors)) a.update(dt);
    const house = this.sealing > 0 ? Math.max(0, 0.14 - this.sealing * 0.2) : 0.14;
    const lampI = 1;
    const L: Light = { lampZ: 0, lamp: lampI, house, flicker: this.flicker > 0 ? Math.min(1, this.flicker) : 0, t: this.t };
    sheetCanvasFor(this.sheet, W);
    paintSheet(this.sheet, this.objs, L, false);
    renderBackstage(g, W, H, {
      objs: this.objs, light: L, sel: this.sel, held: this.held, dispRot: this.disp.map(d => d.rot), hop: this.disp.map(d => d.hop),
      sheetCanvas: this.sheet, chain: this.chain, proj: this.P,
      extra: (P) => STAGEHANDS.map(s => {
        const a = this.actors[s.slug]; const q = P.project(s.at[0], 0, s.at[1]);
        if (!q) return { d: 0, draw: () => {} };
        a.x = q.x; a.y = q.y; a.r = q.s * s.r;
        return { d: q.d, draw: (gg: CanvasRenderingContext2D) => a.draw(gg, (sl, m) => this.ctx.faces.get(sl, m)) };
      })
    });
    if (this.sealing > 0) {
      this.sealing += dt;
      g.fillStyle = `rgba(4,2,8,${Math.min(0.85, this.sealing * 0.7)})`; g.fillRect(0, 0, W, H);
    }
    this.ctx.metrics.frame(now);
  }

  /* ---- the Bubbles notice what you do ---- */
  private can(k: string, sec: number) { const n = performance.now(); if ((this.cool[k] || 0) > n) return false; this.cool[k] = n + sec * 1000; return true; }
  private brain(now: number) {
    const A = this.actors;
    const size = monsterSize(this.objs);
    const big = size > 1.05;
    if (big && !this.wasBig && this.can('rushHide', 7)) { A.rush.emote('scream'); A.rush.after(1.0, () => A.rush.emote('hide', { quiet: true })); A.glitch.after(0.5, () => A.glitch.emote('wow', { vol: 0.6 })); }
    if (size > 1.5 && this.can('huge', 9)) { A.patch.after(0.3, () => A.patch.emote('uhoh')); A.still.after(1.2, () => A.still.emote('nod', { vol: 0.5 })); }
    this.wasBig = big;
    if (now - this.lastInteract > 7000 && this.can('idle', 9)) {
      const r = Math.random();
      if (r < 0.4) { this.flicker = 1.1; A.glitch.emote('uhoh'); this.ctx.sfx.noise(0.3, { type: 'bandpass', freq: 3000, vol: 0.05 }); }
      else if (r < 0.7) A.still.emote('nod', { vol: 0.5 });
      else if (!this.objs.length) { const o = this.box[Math.floor(Math.random() * this.box.length)]; A.patch.speak(objPict(o), 1.8); A.patch.emote('talk'); }
      else A.rush.emote('gasp', { vol: 0.6 });
    }
    // the tip line follows what you have done so far
    const n = this.objs.length;
    const tip = this.held >= 0 ? (this.grab.out ? 'Let go to put it back in the box' : 'Closer to the lamp = bigger shadow')
      : n === 0 ? 'Pick something from the box' : size < 0.55 ? 'Slide it towards the lamp' : n < 2 ? 'Add more — mix and match' : 'Hold the chain when it looks scary enough';
    if (this.tip.textContent !== tip) this.tip.textContent = tip;
  }

  /* ---- toybox ---- */
  private renderTray() {
    clear(this.tray);
    for (const o of this.box) {
      const d = OBJECTS[o];
      const c = h('canvas', { width: '112', height: '88' }) as HTMLCanvasElement;
      const spr = objSprite(o, 96); const g2 = c.getContext('2d')!; const sc = Math.min(100 / spr.width, 80 / spr.height); g2.drawImage(spr, (112 - spr.width * sc) / 2, (88 - spr.height * sc) / 2, spr.width * sc, spr.height * sc);
      const used = this.objs.some(p => p.o === o), full = !used && this.objs.length >= MAX_OBJS;
      const b = h('button', { class: 'sm-item' + (used ? ' used' : full ? ' full' : ''), 'data-obj': o, 'aria-pressed': String(used), 'aria-label': (used ? 'Take back ' : 'Add ') + d.name }, c, h('span', null, d.name)) as HTMLButtonElement;
      this.bindTrayItem(b, o);
      this.tray.appendChild(b);
    }
  }
  private bindTrayItem(b: HTMLButtonElement, o: ObjId) {
    let id: number | null = null, x0 = 0, y0 = 0, dragging = -1;
    b.addEventListener('pointerdown', (e) => {
      if (id !== null) return; id = e.pointerId; x0 = e.clientX; y0 = e.clientY; dragging = -1;
      this.ctx.sfx.unlock(); this.ctx.sfx.gesture(e); this.ctx.metrics.mark(e); this.lastInteract = performance.now();
      try { b.setPointerCapture(e.pointerId); } catch (_) { /* fine */ }
    });
    b.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const r = this.canvasBox.getBoundingClientRect();
      const inside = e.clientY < r.bottom - 4 && e.clientY > r.top && e.clientX > r.left && e.clientX < r.right;
      if (dragging < 0 && inside && Math.hypot(e.clientX - x0, e.clientY - y0) > 12 && !this.objs.some(p => p.o === o)) {
        dragging = this.addObj(o);
        if (dragging >= 0) { this.held = dragging; this.grab = { dx: 0, dz: 0, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: true, out: false }; }
      }
      if (dragging >= 0) { this.ctx.metrics.mark(e); this.dragTo(dragging, e.clientX - r.left, e.clientY - r.top, false); }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return; id = null;
      if (dragging >= 0) { const r = this.canvasBox.getBoundingClientRect(); if (e.clientY > r.bottom) this.removeObj(dragging); this.held = -1; dragging = -1; return; }
      if (Math.hypot(e.clientX - x0, e.clientY - y0) < 12) {
        const i = this.objs.findIndex(p => p.o === o);
        if (i >= 0) this.removeObj(i); else this.addObj(o);
      }
    };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', (e) => { if (e.pointerId === id) { id = null; if (dragging >= 0) this.held = -1; dragging = -1; } });
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const i = this.objs.findIndex(p => p.o === o); if (i >= 0) this.removeObj(i); else this.addObj(o); } });
  }
  private addObj(o: ObjId, x?: number, z?: number): number {
    if (this.objs.length >= MAX_OBJS || this.objs.some(p => p.o === o)) { this.ctx.sfx.tone(220, 0.12, { vol: 0.06 }); if (this.objs.length >= MAX_OBJS) this.actors.patch.emote('shake'); return -1; }
    const zz = clampZ(z ?? (0.62 + (this.objs.length % 3) * 0.1) * K), xx = clampX(x ?? ((this.objs.length % 2 ? 1 : -1) * 0.05 * K * Math.ceil(this.objs.length / 2)), zz);
    this.objs.push({ o, x: xx, z: zz, r: 0 });
    this.disp.push({ rot: 0, hop: 0.12, vh: 1.6 });
    this.sel = this.objs.length - 1;
    this.ctx.sfx.pop(520 + this.objs.length * 60);
    const A = this.actors;
    if (o === 'duck' && this.can('duck', 20)) A.still.after(0.3, () => { A.still.emote('love'); A.still.after(0.9, () => A.still.emote('quack', { vol: 0.7 })); });
    else if (o === 'doughnut' && this.can('donut', 20)) A.patch.after(0.3, () => A.patch.emote('love'));
    else if (o === 'cactus' && this.can('cactus', 20)) A.glitch.after(0.3, () => A.glitch.emote('uhoh'));
    else if (this.objs.length === 1 && this.can('first', 30)) A.patch.after(0.2, () => A.patch.emote('yay', { vol: 0.6 }));
    this.renderTray();
    this.lastInteract = performance.now();
    return this.objs.length - 1;
  }
  private removeObj(i: number) {
    if (!this.objs[i]) return;
    this.objs.splice(i, 1); this.disp.splice(i, 1);
    this.sel = -1; this.ctx.sfx.whoosh(true, 0.25); this.ctx.sfx.pop(380);
    this.renderTray();
  }

  /* ---- dragging on the stage ---- */
  private pick(cx: number, cy: number): number {
    // nearest to the camera first
    const order = this.objs.map((p, i) => i).sort((a, b) => this.objs[a].z - this.objs[b].z);
    for (const i of order) {
      const p = this.objs[i], d = OBJECTS[p.o];
      const c = this.P.project(p.x, d.stick, p.z); if (!c) continue;
      const hh = d.h * c.s * 0.62, ww = Math.max(hh * d.aspect, hh * 0.7);
      const pad = Math.max(10, 22 - hh * 0.1) * (this.sf.dpr || 1);
      if (Math.abs(cx - c.x) < ww + pad && cy > c.y - hh - pad && cy < c.y + hh + pad + d.stick * c.s * 0.4) return i;
    }
    return -1;
  }
  private dragTo(i: number, x: number, y: number, allowOut = true) {
    const p = this.objs[i]; if (!p) return;
    const dpr = this.sf.dpr || 1, d = OBJECTS[p.o];
    const r = this.canvasBox.getBoundingClientRect();
    this.grab.out = allowOut && y > r.height - 8;
    const w = this.P.unproject(x * dpr, y * dpr, d.stick);
    if (!w) return;
    const prevS = scaleAt(p.z, 0);
    p.z = clampZ(w[2] + this.grab.dz); p.x = clampX(w[0] + this.grab.dx, p.z);
    const s = scaleAt(p.z, 0);
    const nowT = performance.now();
    if (Math.abs(s - prevS) > 0.15 && (this.cool.tick || 0) < nowT) { this.cool.tick = nowT + 45; this.ctx.sfx.tick(0.6 + Math.min(1.4, s / 8)); }
  }
  private bind() {
    const box = this.canvasBox;
    let id: number | null = null;
    box.addEventListener('pointerdown', (e) => {
      if (id !== null || this.sealing > 0) return;
      this.ctx.sfx.unlock(); this.ctx.sfx.gesture(e); this.ctx.metrics.mark(e);
      this.lastInteract = performance.now();
      const r = box.getBoundingClientRect(), dpr = this.sf.dpr || 1;
      const i = this.pick((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
      if (i < 0) { this.sel = -1; return; }
      id = e.pointerId; try { box.setPointerCapture(e.pointerId); } catch (_) { /* fine */ }
      const p = this.objs[i], d = OBJECTS[p.o];
      const w = this.P.unproject((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr, d.stick);
      this.held = i; this.sel = i;
      this.grab = { dx: w ? p.x - w[0] : 0, dz: w ? p.z - w[2] : 0, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, out: false };
      this.ctx.sfx.pop(700);
    });
    box.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id || this.held < 0) return;
      this.ctx.metrics.mark(e);
      if (!this.grab.moved && Math.hypot(e.clientX - this.grab.x0, e.clientY - this.grab.y0) < 8) return;
      this.grab.moved = true;
      const r = box.getBoundingClientRect();
      this.dragTo(this.held, e.clientX - r.left, e.clientY - r.top);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return; id = null;
      const i = this.held; this.held = -1;
      if (i < 0) return;
      if (this.grab.out) { this.removeObj(i); return; }
      if (!this.grab.moved && performance.now() - this.grab.t0 < 450) this.rotate(i);
      else this.ctx.sfx.thud();
    };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    box.addEventListener('keydown', (e) => {
      if (!this.objs.length) return;
      if (this.sel < 0) this.sel = 0;
      const p = this.objs[this.sel];
      if (e.key === 'ArrowUp') p.z = clampZ(p.z + 0.04); else if (e.key === 'ArrowDown') p.z = clampZ(p.z - 0.04);
      else if (e.key === 'ArrowLeft') p.x = clampX(p.x - 0.02, p.z); else if (e.key === 'ArrowRight') p.x = clampX(p.x + 0.02, p.z);
      else if (e.key === 'r' || e.key === 'R' || e.key === ' ') this.rotate(this.sel);
      else if (e.key === 'Tab') return;
      else if (e.key === 'Delete' || e.key === 'Backspace') this.removeObj(this.sel);
      else return;
      e.preventDefault(); p.x = clampX(p.x, p.z);
    });
    const bar = this.lever.querySelector('i') as HTMLElement;
    hold(this.lever, 900, {
      start: () => { if (!this.objs.length) { this.actors.patch.emote('shake'); this.ctx.toast('Put something on the stage first'); return; } this.ctx.sfx.tone(300, 0.9, { type: 'triangle', glide: 160, vol: 0.05 }); },
      progress: (k) => { if (!this.objs.length) return; bar.style.width = (k * 100) + '%'; this.chain = k; },
      done: () => {
        if (!this.objs.length) return;
        this.chain = 1; this.ctx.sfx.tick(0.5); this.ctx.sfx.thud(); this.sealing = 0.01; this.music.stop(1.2);
        Object.values(this.actors).forEach((a, i) => a.after(0.15 * i, () => a.emote('gasp', { vol: 0.5 })));
        setTimeout(() => { if (this.destroyed) return; this.onSeal(this.objs.map(o => ({ ...o })), this.tag); }, 1100);
        // if the room refused (or lost) the seal, bring the lights back so it can be tried again
        setTimeout(() => { if (this.destroyed) return; this.sealing = 0; this.chain = 0; bar.style.width = '0'; this.music.play('attic', SONGS.attic, { vol: 0.42 }); }, 4500);
      },
      cancel: () => { bar.style.width = '0'; this.chain = 0; }
    });
  }
  private rotate(i: number) {
    const p = this.objs[i]; if (!p) return;
    p.r = (p.r + 1) % 8; this.sel = i;
    this.ctx.sfx.whoosh(true, 0.18); this.ctx.sfx.tick(1.4);
    if (this.can('rot', 6)) this.actors.glitch.emote('huh', { vol: 0.5 });
  }

  /* ---- optional name tag ---- */
  private renderTagBtn() {
    clear(this.tagBtn);
    const c = h('canvas', { width: '52', height: '52' }) as HTMLCanvasElement;
    const g = c.getContext('2d')!; g.translate(26, 26);
    (PICTS[this.tag ? TAG_PICT[this.tag] : 'q'] || PICTS.q)(g, 44);
    this.tagBtn.appendChild(c);
    this.tagBtn.appendChild(h('span', null, this.tag ? (TAGS.find(t => t.id === this.tag)!.label) : 'Name tag'));
  }
  private toggleTags() {
    if (this.tagsEl) { this.tagsEl.remove(); this.tagsEl = null; return; }
    const grid = h('div', { class: 'grid' });
    for (const t of TAGS) {
      const c = h('canvas', { width: '60', height: '60' }) as HTMLCanvasElement; const g = c.getContext('2d')!; g.translate(30, 30); PICTS[TAG_PICT[t.id]](g, 52);
      grid.appendChild(h('button', { class: this.tag === t.id ? 'on' : '', onclick: () => { this.tag = t.id; this.renderTagBtn(); this.toggleTags(); this.ctx.sfx.pop(640); } }, c, h('span', null, t.label)));
    }
    grid.appendChild(h('button', { class: 'none', onclick: () => { this.tag = null; this.renderTagBtn(); this.toggleTags(); } }, 'No tag — keep it to myself'));
    this.tagsEl = h('div', { class: 'sm-tags', role: 'dialog', 'aria-label': 'Name tag' }, h('p', null, 'What’s it about? Optional — everyone in this room sees it after the show.'), grid);
    this.el.appendChild(this.tagsEl);
  }
}

let fontsAdded = false;
function addFonts() { if (fontsAdded) return; fontsAdded = true; try { if (!document.querySelector('link[data-sm-fonts]')) document.head.appendChild(h('link', { rel: 'stylesheet', href: SM_FONTS, 'data-sm-fonts': '1' })); } catch (e) { /* optional */ } }
