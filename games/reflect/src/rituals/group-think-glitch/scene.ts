/* Group Think Glitch — the player's side of the ritual.
 *   hook → investigate (your camera: scrub time, drag the magnifying light, pin what glints) → corkboard (order the
 *   polaroids, pull the red thread to a suspect, twist how sure you are, hold the wax seal) → waiting → reveal → finale.
 * Everything private stays on this device until the seal; the seal goes to the room authority. */
import type { RoomView, Player } from '../../room/protocol';
import type { Scene, SceneCtx } from '../../console/types';
import { h, clear, Surface, drag, hold, clamp, lerp, ease, sleep } from '../../ui/dom';
import { Projector } from '../../gfx/projector';
import { CAM_INFO, CamId, HOTSPOTS, Hotspot, hotspotsFor, SUSPECTS, Suspect, SURE, DURATION } from './content';
import { renderWorld, drawBackground, lens, rigCam, sweepCam, stateAt, hotspotAnchor, worldToUV, closeup, RIGS } from './world';
import { suspectIcon, SUSPECT_FACE } from './art';
import { GTG_CSS, GTG_FONTS } from './style';
import { RevealDirector } from './reveal';

interface Pin { id: string; t: number; photo: HTMLCanvasElement; label: string; }

export function createGtgScene(ctx: SceneCtx): Scene { return new GtgScene(ctx); }

class GtgScene implements Scene {
  el: HTMLElement;
  private mode: string | null = null;
  private round = -1;
  private view: RoomView | null = null;
  private inv: Investigation | null = null;
  private board: Board | null = null;
  private waitEl: HTMLElement | null = null;
  private rev: RevealDirector | null = null;
  private pins: Pin[] = [];
  private path: number[] = [];
  private hookTimer: any = 0;
  constructor(private ctx: SceneCtx) {
    ensureFonts();
    this.el = h('div', { class: 'gtg', 'data-ritual': 'group-think-glitch' }, h('style', { text: GTG_CSS }));
    ctx.stage.appendChild(this.el);
    ctx.faces.onReady = () => { if (this.inv) this.inv.dirty = true; };
  }
  get me(): Player | null { const v = this.view; return v ? v.players.find(p => p.pid === v.you) || null : null; }
  get myCam(): CamId { const v = this.view, me = this.me; return (v && me && v.pub && v.pub.cams && v.pub.cams[me.pid]) || 'door'; }

  update(v: RoomView) {
    const prev = this.view;
    this.view = v;
    if (v.round !== this.round) { this.resetRound(); this.round = v.round; }
    const me = this.me;
    if (v.phase === 'play') {
      if (!me || me.spectator) { this.showSpectate(); return; }
      if (v.sealed[me.pid]) { this.showWait(); return; }
      if (!this.mode) this.startHook();
    } else if (v.phase === 'reveal' || v.phase === 'finale') {
      if (!this.rev) this.startReveal();
      this.rev!.update(v, prev);
    }
  }
  resize() { if (this.inv) this.inv.layout(); if (this.board) this.board.layout(); if (this.rev) this.rev.resize(); }
  destroy() { this.resetRound(); this.el.remove(); this.ctx.sfx.bed('off'); }

  private resetRound() {
    clearTimeout(this.hookTimer);
    if (this.inv) { this.inv.destroy(); this.inv = null; }
    if (this.board) { this.board.destroy(); this.board = null; }
    if (this.rev) { this.rev.destroy(); this.rev = null; }
    if (this.waitEl) { this.waitEl.remove(); this.waitEl = null; }
    Array.from(this.el.children).forEach(c => { if (c.tagName !== 'STYLE') c.remove(); });
    this.mode = null; this.pins = []; this.path = [];
  }

  /* ---------- hook: one crane shot over the party, the splat cuts to black ---------- */
  private startHook() {
    this.mode = 'hook';
    const ctx = this.ctx;
    ctx.sfx.bed('rooftop', 0.16);
    const sf = new Surface(); sf.maxDpr = 1.5;
    const title = h('div', { class: 'tw', style: { position: 'absolute', left: '0', right: '0', bottom: '18%', textAlign: 'center', fontSize: 'clamp(22px,6vw,40px)', textShadow: '0 4px 20px rgba(0,0,0,.8)', opacity: '0', transition: 'opacity .5s' } }, 'Four cameras. One cake.');
    const cam = this.myCam;
    const yours = h('div', { style: { position: 'absolute', left: '0', right: '0', top: '42%', textAlign: 'center', opacity: '0', transition: 'opacity .4s' } },
      h('div', { class: 'tw', style: { fontSize: '13px', opacity: '.8', letterSpacing: '.2em' } }, 'YOUR CAMERA'),
      h('div', { class: 'tw', style: { fontSize: 'clamp(26px,7vw,46px)', color: '#ffd27a', marginTop: '6px' } }, CAM_INFO[cam].label),
      h('div', { style: { fontSize: '14px', opacity: '.8', marginTop: '6px' } }, CAM_INFO[cam].blurb));
    const skip = h('button', { class: 'gtg-btn ghost', style: { position: 'absolute', right: '14px', bottom: 'calc(14px + var(--rf-safe-b,0px))', minHeight: '44px' }, onclick: () => go() }, 'Skip');
    const wrap = h('div', { class: 'gtg-stage' }, sf.canvas, title, yours, skip);
    this.el.appendChild(wrap);
    const faces = (s: string, m: string) => ctx.faces.get(s, m);
    const T0 = performance.now();
    const reduce = ctx.prefs.reducedMotion;
    let raf = 0, done = false, splatted = false;
    const frame = () => {
      if (done) return;
      sf.fit();
      const k = (performance.now() - T0) / 1000;
      const g = sf.g; const W = sf.pw, H = sf.ph;
      if (k < 3.2) {
        const t = 2.3 + k * 0.85;
        const s = stateAt(Math.min(t, 4.95));
        const cm = reduce ? sweepCam(1) : sweepCam(clamp(k / 3.0, 0, 1));
        renderWorld(g, W, H, cm, s, { look: 'sweep', faces });
        lens(g, W, H, 'hero', s, false);
        if (t >= 4.86 && !splatted) { splatted = true; ctx.sfx.splat(); }
        if (t >= 4.9) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
        title.style.opacity = k > 0.5 && t < 4.9 ? '1' : '0';
      } else {
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        title.style.opacity = '0';
        yours.style.opacity = k < 4.9 ? '1' : '0';
      }
      if (k > 5.1) { go(); return; }
      raf = requestAnimationFrame(frame);
    };
    const go = () => {
      if (done) return; done = true; cancelAnimationFrame(raf); wrap.remove();
      this.startInvestigation();
    };
    raf = requestAnimationFrame(frame);
    // the shot is a flourish, not a wall: tap anywhere to skip
    wrap.addEventListener('pointerdown', (e) => { ctx.sfx.unlock(); if ((performance.now() - T0) > 600) { e.preventDefault(); go(); } });
  }

  /* ---------- investigation ---------- */
  private startInvestigation() {
    this.mode = 'investigate';
    this.inv = new Investigation(this.ctx, this.myCam, this.pins, this.path, () => this.toBoard());
    this.el.appendChild(this.inv.el);
    requestAnimationFrame(() => this.inv && this.inv.layout());
  }
  private toBoard() {
    if (!this.inv) return;
    this.ctx.sfx.whoosh(true, 0.45);
    const inv = this.inv; this.inv = null;
    inv.el.style.transition = 'opacity .35s, transform .35s'; inv.el.style.opacity = '0'; inv.el.style.transform = 'translateY(-24px)';
    setTimeout(() => inv.destroy(), 380);
    this.mode = 'board';
    this.board = new Board(this.ctx, this.myCam, this.pins, (payload) => this.seal(payload), () => this.backToFeed());
    this.el.appendChild(this.board.el);
    requestAnimationFrame(() => this.board && this.board.layout());
  }
  private backToFeed() {
    if (this.board) { this.board.destroy(); this.board = null; }
    this.startInvestigation();
  }
  private seal(p: { pins: string[]; suspect: Suspect; sure: number }) {
    const payload = { pins: p.pins, suspect: p.suspect, sure: p.sure, path: this.path.slice(0, 180) };
    this.ctx.room.act('seal', payload);
    this.mode = 'sealing';
  }

  /* ---------- waiting / spectating ---------- */
  private showWait() {
    if (this.mode === 'wait') { this.renderChips(); return; }
    if (this.inv) { this.inv.destroy(); this.inv = null; }
    this.mode = 'wait';
    if (!this.board) { this.board = new Board(this.ctx, this.myCam, this.pins, () => {}, () => {}); this.el.appendChild(this.board.el); this.board.lock(this.view && this.view.mine); }
    else this.board.lock(this.view && this.view.mine);
    this.waitEl = h('div', { class: 'gtg-wait' });
    this.el.appendChild(this.waitEl);
    this.renderChips();
  }
  private showSpectate() {
    if (this.mode === 'spectate') { this.renderChips(); return; }
    this.mode = 'spectate';
    this.ctx.sfx.bed('rooftop', 0.12);
    this.waitEl = h('div', { class: 'gtg-wait' });
    this.el.appendChild(this.waitEl);
    this.renderChips();
  }
  private waitingSince = 0;
  private renderChips() {
    const v = this.view; if (!v || !this.waitEl) return;
    const me = this.me;
    const parts = v.players.filter(p => !p.spectator);
    if (!this.waitingSince) this.waitingSince = Date.now();
    clear(this.waitEl);
    const spectating = !me || me.spectator;
    this.waitEl.appendChild(h('h3', null, spectating ? 'You’re watching this round' : 'Sealed.'));
    this.waitEl.appendChild(h('div', { style: { fontSize: '14px', opacity: '.85', maxWidth: '420px' } }, spectating ? 'The ritual had already started. You’ll see the reveal, and you get a seat next round.' : 'Your verdict is locked until everyone has sealed theirs. Nobody can see it yet — not even the host.'));
    const chips = h('div', { class: 'gtg-chips' });
    for (const p of parts) {
      const sealed = !!v.sealed[p.pid];
      const img = h('img', { alt: '', src: this.ctx.faces.url(p.avatar, sealed ? 'happy' : 'think') });
      chips.appendChild(h('div', { class: 'gtg-chip' },
        h('div', { class: 'av' }, img, sealed ? h('i', { class: 'wax', 'aria-hidden': 'true' }) : null),
        h('div', { class: 'nm' }, p.pid === v.you ? p.name + ' (you)' : p.name),
        !p.human ? h('div', { class: 'lab' }, 'Bubble companion') : null,
        h('div', { class: 'st' }, sealed ? 'sealed' : p.connected ? 'investigating…' : 'reconnecting…')));
    }
    this.waitEl.appendChild(chips);
    const waitingOn = parts.filter(p => !v.sealed[p.pid]);
    if (this.ctx.room.isHost && waitingOn.length && parts.some(p => p.human && v.sealed[p.pid])) {
      const ago = (Date.now() - this.waitingSince) / 1000;
      const btn = h('button', { class: 'gtg-btn ghost', onclick: () => this.ctx.room.act('force_reveal') }, 'Reveal without ' + (waitingOn.length === 1 ? waitingOn[0].name : waitingOn.length + ' players'));
      if (ago < 20) { btn.setAttribute('disabled', ''); btn.style.opacity = '.5'; setTimeout(() => this.renderChips(), (20 - ago) * 1000 + 50); }
      this.waitEl.appendChild(btn);
    }
  }

  /* ---------- reveal + finale ---------- */
  private startReveal() {
    if (this.inv) { this.inv.destroy(); this.inv = null; }
    if (this.board) { this.board.destroy(); this.board = null; }
    if (this.waitEl) { this.waitEl.remove(); this.waitEl = null; }
    this.mode = 'reveal';
    this.rev = new RevealDirector(this.ctx, this.el);
  }
}

/* ======================================================================================================== */
class Investigation {
  el: HTMLElement;
  dirty = true;
  private feed = new Surface();
  private feedBox: HTMLElement;
  private wrap: HTMLElement;
  private found: HTMLElement;
  private trackSf = new Surface();
  private track: HTMLElement;
  private head: HTMLElement;
  private timeEl: HTMLElement;
  private playBtn: HTMLButtonElement;
  private pinBtn: HTMLButtonElement;
  private caseBtn: HTMLButtonElement;
  private slots: HTMLElement[] = [];
  private t = 2.0;
  private playing = false;
  private lastNow = 0;
  private loupe = { x: 0.5, y: 0.55 };     // fraction of the feed
  private R = 70;                          // loupe radius, CSS px
  private mag = 2.1;
  private hit: Hotspot | null = null;
  private glintT = 0;
  private raf = 0;
  private PM = new Projector();
  private zoom: HTMLCanvasElement = document.createElement('canvas');
  private bgFrame: HTMLCanvasElement = document.createElement('canvas');
  private thumbs: HTMLCanvasElement | null = null;
  private lastTickStep = -1;
  private lastPathAt = 0;
  private guided = false;
  private destroyed = false;
  private unbind: (() => void)[] = [];
  private faces: (s: string, m: string) => CanvasImageSource | null;
  constructor(private ctx: SceneCtx, private cam: CamId, private pins: Pin[], private path: number[], private onCase: () => void) {
    this.faces = (s, m) => ctx.faces.get(s, m);
    const info = CAM_INFO[cam];
    this.feedBox = h('div', { class: 'gtg-feed', role: 'application', 'aria-label': info.label + ' feed. Drag the light to search; arrow keys move it.', tabindex: '0' }, this.feed.canvas);
    this.found = h('div', { class: 'gtg-found', 'aria-live': 'polite' }, 'Evidence — pin it');
    this.feedBox.appendChild(this.found);
    this.wrap = h('div', { class: 'gtg-feedwrap' }, this.feedBox);
    this.playBtn = h('button', { class: 'gtg-play', 'aria-label': 'Play', onclick: (e: Event) => { ctx.sfx.unlock(); ctx.sfx.gesture(e); ctx.metrics.mark(e); this.togglePlay(); } }) as HTMLButtonElement;
    this.track = h('div', { class: 'gtg-track', role: 'slider', 'aria-label': 'Time', 'aria-valuemin': '0', 'aria-valuemax': String(DURATION), tabindex: '0' }, this.trackSf.canvas, h('div', { class: 'gtg-head2' }));
    this.timeEl = h('div', { class: 'gtg-time' }, '0.0 s');
    this.pinBtn = h('button', { class: 'gtg-pinbtn', disabled: '', onclick: (e: Event) => { ctx.sfx.gesture(e); ctx.metrics.mark(e); this.pinOrCase(); } }) as HTMLButtonElement;
    this.caseBtn = h('button', { class: 'gtg-btn', style: { minHeight: '40px', padding: '0 14px', fontSize: '13px', display: 'none' }, onclick: () => this.onCase() }, 'Build case →') as HTMLButtonElement;
    const tray = h('div', { class: 'gtg-tray' });
    for (let i = 0; i < 3; i++) { const s = h('div', { class: 'gtg-slot' }, ['First clue', 'Second clue', 'Third clue'][i]); this.slots.push(s); tray.appendChild(s); }
    tray.appendChild(this.pinBtn);
    this.head = h('div', { class: 'gtg-head' },
      h('div', { class: 'gtg-camchip tw' }, h('i'), info.label),
      h('div', { class: 'gtg-hint' }, 'Drag the light. Scrub time. Pin what glints.'),
      this.caseBtn);
    this.el = h('div', { class: 'gtg-inv' }, this.head, this.wrap, h('div', { class: 'gtg-scrub' }, this.playBtn, this.track, this.timeEl), tray);
    this.setPlayIcon();
    this.bind();
    this.renderTray();
    this.updatePin();
    this.raf = requestAnimationFrame((n) => this.frame(n));
    (globalThis as any).__gtgInv = this;   // test hook: lets the automated two-device run aim at real evidence
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); this.unbind.forEach(f => f()); this.el.remove(); if ((globalThis as any).__gtgInv === this) delete (globalThis as any).__gtgInv; }
  /** Test hook: where (fraction of the feed) and when a hotspot of this camera can be found. */
  target(i = 0): { id: string; t: number; fx: number; fy: number } | null {
    const list = hotspotsFor(this.cam);
    const hs = list[i % list.length];
    if (!hs) return null;
    const t = (hs.t0 + hs.t1) / 2;
    const W = this.feed.pw, H = this.feed.ph;
    this.PM.set(rigCam(this.cam, t), W, H);
    const a = hotspotAnchor(hs.id, stateAt(t)); const q = this.PM.project(a[0], a[1], a[2]);
    return q ? { id: hs.id, t, fx: q.x / W, fy: q.y / H } : null;
  }
  get camId() { return this.cam; }

  layout() {
    const r = this.wrap.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const desk = r.width >= 560 && innerWidth >= 900;
    let w = r.width, hh = r.height;
    const asp = w / hh;
    if (asp > 1.7) w = hh * 1.7; else if (asp < 0.66) hh = w / 0.66;
    this.feedBox.style.width = Math.floor(w) + 'px'; this.feedBox.style.height = Math.floor(hh) + 'px';
    this.feed.maxDpr = w > 700 ? 1.5 : 2;
    this.feed.fit(Math.floor(w), Math.floor(hh));
    this.R = clamp(Math.min(w, hh) * (desk ? 0.17 : 0.2), 56, 104);
    this.trackSf.fit();
    this.thumbs = null;
    this.dirty = true;
  }

  private bind() {
    const ctx = this.ctx;
    const touchOffset = (e: PointerEvent) => (e.pointerType === 'touch' ? -this.R * 0.9 : 0);
    const moveLoupe = (x: number, y: number, e: PointerEvent) => {
      const W = this.feed.w, H = this.feed.h;
      this.loupe.x = clamp(x / W, 0.04, 0.96); this.loupe.y = clamp((y + touchOffset(e)) / H, 0.04, 0.96);
      this.dirty = true; this.guided = true;
      ctx.metrics.mark(e);
      this.recordPath();
    };
    this.unbind.push(drag(this.feedBox, {
      down: (x, y, e) => { ctx.sfx.unlock(); moveLoupe(x, y, e); },
      move: moveLoupe,
      hover: (x, y, e) => moveLoupe(x, y, e)
    }));
    const scrubTo = (x: number, e: PointerEvent) => {
      const w = this.track.getBoundingClientRect().width;
      this.t = clamp((x / w) * DURATION, 0, DURATION - 0.001);
      if (this.playing) this.togglePlay();
      this.dirty = true;
      ctx.metrics.mark(e);
      const step = Math.floor(this.t * 6);
      if (step !== this.lastTickStep) { this.lastTickStep = step; ctx.sfx.gesture(e); ctx.sfx.tick(0.8 + (this.t / DURATION) * 0.6); }
    };
    this.unbind.push(drag(this.track, { down: (x, _y, e) => { ctx.sfx.unlock(); scrubTo(x, e); }, move: (x, _y, e) => scrubTo(x, e) }));
    const key = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 0.08 : 0.03;
      if (document.activeElement !== this.feedBox && document.activeElement !== this.track && !this.feedBox.contains(document.activeElement as Node)) {
        if (!(e.target instanceof Node) || !this.el.contains(e.target)) return;
      }
      if (e.key === 'ArrowLeft' && e.target === this.track) { this.t = Math.max(0, this.t - 0.1); this.dirty = true; e.preventDefault(); return; }
      if (e.key === 'ArrowRight' && e.target === this.track) { this.t = Math.min(DURATION - 0.01, this.t + 0.1); this.dirty = true; e.preventDefault(); return; }
      if (e.key === 'ArrowLeft') { this.loupe.x = clamp(this.loupe.x - step, 0.04, 0.96); }
      else if (e.key === 'ArrowRight') { this.loupe.x = clamp(this.loupe.x + step, 0.04, 0.96); }
      else if (e.key === 'ArrowUp') { this.loupe.y = clamp(this.loupe.y - step, 0.04, 0.96); }
      else if (e.key === 'ArrowDown') { this.loupe.y = clamp(this.loupe.y + step, 0.04, 0.96); }
      else if (e.key === ',' || e.key === '<') { this.t = Math.max(0, this.t - 0.1); }
      else if (e.key === '.' || e.key === '>') { this.t = Math.min(DURATION - 0.01, this.t + 0.1); }
      else if (e.key === ' ') { this.togglePlay(); }
      else if (e.key === 'Enter' || e.key === 'p') { this.pinOrCase(); }
      else return;
      e.preventDefault(); this.dirty = true; this.guided = true; this.recordPath();
    };
    this.el.addEventListener('keydown', key);
    const ro = new ResizeObserver(() => this.layout());
    ro.observe(this.wrap);
    this.unbind.push(() => ro.disconnect());
  }
  private togglePlay() { this.playing = !this.playing; if (this.playing && this.t > DURATION - 0.05) this.t = 0; this.setPlayIcon(); this.dirty = true; }
  private setPlayIcon() {
    this.playBtn.innerHTML = this.playing ? '<svg viewBox="0 0 20 20"><rect x="4" y="3" width="4" height="14" rx="1" fill="currentColor"/><rect x="12" y="3" width="4" height="14" rx="1" fill="currentColor"/></svg>' : '<svg viewBox="0 0 20 20"><path d="M5 3l12 7-12 7z" fill="currentColor"/></svg>';
    this.playBtn.setAttribute('aria-label', this.playing ? 'Pause' : 'Play');
  }
  private recordPath() {
    const now = performance.now();
    if (now - this.lastPathAt < 180) return;
    this.lastPathAt = now;
    const W = this.feed.pw, H = this.feed.ph;
    this.PM.set(rigCam(this.cam, this.t), W, H);
    const p = this.PM.unproject(this.loupe.x * W, this.loupe.y * H, 0.3);
    if (!p) return;
    const [u, v] = worldToUV(p[0], p[2]);
    this.path.push(Math.round(this.t * 100) / 100, Math.round(u * 1000) / 1000, Math.round(v * 1000) / 1000);
    if (this.path.length > 180) { const keep: number[] = []; for (let i = 0; i < this.path.length; i += 6) keep.push(this.path[i], this.path[i + 1], this.path[i + 2]); this.path.length = 0; this.path.push(...keep); }
  }

  private frame(now: number) {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const dt = this.lastNow ? Math.min(0.05, (now - this.lastNow) / 1000) : 0;
    this.lastNow = now;
    if (this.playing) { this.t += dt; if (this.t >= DURATION) this.t = 0; this.dirty = true; }
    if (!this.guided && now > 900) { const k = (now / 1000) % 4; this.loupe.x = 0.5 + Math.sin(k * 1.6) * 0.22; this.loupe.y = 0.55 + Math.cos(k * 1.1) * 0.12; this.dirty = true; }
    if (this.glintT > 0) this.dirty = true;
    if (!this.dirty) { this.ctx.metrics.idle(); return; }
    this.dirty = false;
    this.draw(now);
    this.ctx.metrics.frame(now);
  }

  private draw(now: number) {
    const sf = this.feed, g = sf.g, W = sf.pw, H = sf.ph, dpr = sf.dpr;
    if (W < 4 || H < 4) return;
    const t = this.t, s = stateAt(t), cam = rigCam(this.cam, t);
    // background plate for this frame (shared by the feed and the magnifier, so both line up exactly)
    if (this.bgFrame.width !== W || this.bgFrame.height !== H) { this.bgFrame.width = W; this.bgFrame.height = H; }
    const bg = this.bgFrame.getContext('2d')!;
    drawBackground(bg, W, H, this.cam, cam);
    renderWorld(g, W, H, cam, s, { look: this.cam, faces: this.faces, bg: (gg) => gg.drawImage(this.bgFrame, 0, 0) });
    lens(g, W, H, this.cam, s, true);
    // what is under the light right now?
    this.PM.set(cam, W, H);
    const lx = this.loupe.x * W, ly = this.loupe.y * H, R = this.R * dpr;
    let best: Hotspot | null = null, bestD = 1e9, bestPt: [number, number] = [0, 0];
    for (const hs of hotspotsFor(this.cam)) {
      if (t < hs.t0 || t > hs.t1) continue;
      const a = hotspotAnchor(hs.id, s); const q = this.PM.project(a[0], a[1], a[2]);
      if (!q) continue;
      const d = Math.hypot(q.x - lx, q.y - ly);
      if (d < R * 0.9 && d < bestD) { best = hs; bestD = d; bestPt = [q.x, q.y]; }
    }
    if (best !== this.hit) {
      const was = this.hit; this.hit = best;
      if (best && (!was || was.id !== best.id)) { this.glintT = 1; this.ctx.sfx.glint(HOTSPOTS.indexOf(best)); }
      this.updatePin();
    }
    // darkness with a soft hole where the light is
    g.save();
    g.fillStyle = 'rgba(6,4,16,0.64)';
    g.beginPath(); g.rect(0, 0, W, H); g.arc(lx, ly, R * 1.02, 0, Math.PI * 2, true); g.fill('evenodd');
    const halo = g.createRadialGradient(lx, ly, R * 0.98, lx, ly, R * 1.6);
    halo.addColorStop(0, 'rgba(255,214,140,0.16)'); halo.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(lx, ly, R * 1.6, 0, Math.PI * 2); g.fill();
    g.restore();
    // the magnifier: same camera, longer lens, centred on the light
    const Z = Math.ceil(R * 2);
    if (this.zoom.width !== Z) { this.zoom.width = Z; this.zoom.height = Z; }
    const zg = this.zoom.getContext('2d')!;
    const m = this.mag;
    zg.setTransform(m, 0, 0, m, R - m * lx, R - m * ly);
    zg.drawImage(this.bgFrame, 0, 0);
    zg.setTransform(1, 0, 0, 1, 0, 0);
    renderWorld(zg, Z, Z, cam, s, { look: this.cam, faces: this.faces, focal: this.PM.f * m, ox: (W / 2 - lx) * m + R, oy: (H / 2 - ly) * m + R, bg: () => {} });
    if (this.cam === 'phone' && s.flash > 0) { zg.fillStyle = `rgba(255,255,255,${0.9 * s.flash})`; zg.fillRect(0, 0, Z, Z); }
    g.save();
    g.beginPath(); g.arc(lx, ly, R, 0, Math.PI * 2); g.clip();
    g.drawImage(this.zoom, lx - R, ly - R);
    // glint on the evidence
    if (this.hit) {
      const gx = (bestPt[0] - lx) * m + lx, gy = (bestPt[1] - ly) * m + ly;
      const k = this.glintT > 0 ? this.glintT : 0;
      const pulse = 0.6 + 0.4 * Math.sin(now / 140);
      drawStar(g, gx, gy, R * (0.22 + 0.25 * k) * pulse, `rgba(255,236,170,${0.75 + 0.25 * k})`);
      this.glintT = Math.max(0, this.glintT - 0.04);
    }
    g.restore();
    // brass rim + glass glare
    g.save();
    g.lineWidth = Math.max(3, R * 0.07);
    g.strokeStyle = this.hit ? '#ffd27a' : '#c9a46a';
    g.shadowColor = this.hit ? 'rgba(255,210,122,0.9)' : 'rgba(0,0,0,0.6)'; g.shadowBlur = this.hit ? 18 * dpr : 8 * dpr;
    g.beginPath(); g.arc(lx, ly, R, 0, Math.PI * 2); g.stroke();
    g.shadowBlur = 0;
    const gl = g.createLinearGradient(lx - R, ly - R, lx + R * 0.2, ly + R * 0.2);
    gl.addColorStop(0, 'rgba(255,255,255,0.22)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, R * 0.96, Math.PI * 0.9, Math.PI * 1.6); g.lineTo(lx, ly); g.fill();
    g.restore();
    // scrubber
    this.drawTrack();
    this.timeEl.textContent = t.toFixed(1) + ' s';
    this.track.setAttribute('aria-valuenow', t.toFixed(1));
    this.found.classList.toggle('on', !!this.hit && !this.pins.some(p => p.id === this.hit!.id));
  }

  private drawTrack() {
    const sf = this.trackSf; sf.fit();
    const g = sf.g, W = sf.pw, H = sf.ph;
    if (W < 4) return;
    if (!this.thumbs || this.thumbs.width !== W || this.thumbs.height !== H) {
      // a filmstrip of this camera, rendered once
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const cg = c.getContext('2d')!;
      const n = Math.max(6, Math.round(W / (H * 1.1)));
      const tw = W / n;
      const tmp = document.createElement('canvas'); tmp.width = Math.ceil(tw); tmp.height = H;
      const tg = tmp.getContext('2d')!;
      for (let i = 0; i < n; i++) {
        const tt = ((i + 0.5) / n) * DURATION;
        renderWorld(tg, tmp.width, H, rigCam(this.cam, tt), stateAt(tt), { look: this.cam, faces: this.faces });
        cg.drawImage(tmp, Math.round(i * tw), 0);
        cg.fillStyle = 'rgba(0,0,0,0.5)'; cg.fillRect(Math.round(i * tw), 0, 1.5, H);
      }
      cg.fillStyle = 'rgba(0,0,0,0.25)'; cg.fillRect(0, 0, W, H);
      this.thumbs = c;
    }
    g.drawImage(this.thumbs, 0, 0);
    // marks where you pinned
    for (const p of this.pins) { const x = (p.t / DURATION) * W; g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(x, H - 7 * sf.dpr, 4 * sf.dpr, 0, Math.PI * 2); g.fill(); }
    const head = this.track.querySelector('.gtg-head2') as HTMLElement;
    head.style.left = (this.t / DURATION) * 100 + '%';
  }

  private updatePin() {
    const b = this.pinBtn;
    const already = this.hit && this.pins.some(p => p.id === this.hit!.id);
    b.classList.remove('ready', 'case');
    if (this.hit && !already) { b.disabled = false; b.classList.add('ready'); b.innerHTML = 'PIN IT<small>' + (this.pins.length >= 3 ? 'replaces your first clue' : 'snap a polaroid') + '</small>'; }
    else if (this.pins.length) { b.disabled = false; b.classList.add('case'); b.innerHTML = 'Build case →<small>' + this.pins.length + ' of 3 clues</small>'; }
    else { b.disabled = true; b.innerHTML = 'Find a clue<small>light it at the right moment</small>'; }
    this.caseBtn.style.display = this.pins.length && this.hit && !already ? '' : 'none';
  }
  private pinOrCase() {
    if (this.hit && !this.pins.some(p => p.id === this.hit!.id)) this.pin(this.hit);
    else if (this.pins.length) this.onCase();
  }
  private pin(hs: Hotspot) {
    const ctx = this.ctx;
    const photo = document.createElement('canvas'); photo.width = photo.height = 320;
    closeup(photo.getContext('2d')!, 320, this.cam, this.t, hotspotAnchor(hs.id, stateAt(this.t)), this.faces, 130);
    if (this.pins.length >= 3) this.pins.shift();
    const pin: Pin = { id: hs.id, t: Math.round(this.t * 100) / 100, photo, label: hs.label };
    this.pins.push(pin);
    this.pins.sort((a, b) => a.t - b.t);
    ctx.sfx.shutter();
    setTimeout(() => ctx.sfx.develop(), 250);
    // flash + fly from the light to the tray
    const fl = h('div', { style: { position: 'absolute', inset: '0', background: '#fff', opacity: '0.85', transition: 'opacity .35s', pointerEvents: 'none' } });
    this.feedBox.appendChild(fl); requestAnimationFrame(() => { fl.style.opacity = '0'; }); setTimeout(() => fl.remove(), 400);
    const idx = this.pins.indexOf(pin);
    const slot = this.slots[idx];
    const fr = this.feedBox.getBoundingClientRect(), sr = slot.getBoundingClientRect(), er = this.el.getBoundingClientRect();
    const fly = polaroid(pin, -4 + Math.random() * 8);
    fly.classList.add('fly');
    Object.assign(fly.style, { position: 'absolute', zIndex: '30', width: sr.width + 'px', height: sr.height + 'px', left: (sr.left - er.left) + 'px', top: (sr.top - er.top) + 'px' });
    const sx = fr.left + this.loupe.x * fr.width - (sr.left + sr.width / 2), sy = fr.top + this.loupe.y * fr.height - (sr.top + sr.height / 2);
    fly.style.transform = `translate(${sx}px,${sy}px) scale(1.3) rotate(-8deg)`;
    this.el.appendChild(fly);
    requestAnimationFrame(() => requestAnimationFrame(() => { fly.style.transform = 'translate(0,0) scale(1) rotate(var(--rot))'; }));
    setTimeout(() => { fly.remove(); this.renderTray(true); }, 600);
    this.updatePin();
    this.dirty = true;
  }
  private renderTray(fresh = false) {
    this.slots.forEach((s, i) => {
      clear(s);
      const p = this.pins[i];
      if (!p) { s.textContent = ['First clue', 'Second clue', 'Third clue'][i]; return; }
      const el = polaroid(p, [-3, 2.5, -1.5][i], () => { this.pins.splice(this.pins.indexOf(p), 1); this.renderTray(); this.updatePin(); this.ctx.sfx.pop(420); });
      if (fresh) develop(el);
      s.appendChild(el);
    });
  }
}

function drawStar(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter'; g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.22 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill();
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.8); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.8, 0, Math.PI * 2); g.fill();
  g.restore();
}

function polaroid(p: { photo: HTMLCanvasElement; label: string }, rot: number, onRemove?: () => void): HTMLElement {
  const c = document.createElement('canvas'); c.width = p.photo.width; c.height = p.photo.height;
  c.getContext('2d')!.drawImage(p.photo, 0, 0);
  const el = h('div', { class: 'pol', style: { '--rot': rot + 'deg' } as any }, c, h('b', null, p.label));
  el.style.setProperty('--rot', rot + 'deg');
  if (onRemove) el.appendChild(h('button', { class: 'x', 'aria-label': 'Remove clue', onclick: (e: Event) => { e.stopPropagation(); onRemove(); } }, '×'));
  return el;
}
function develop(el: HTMLElement) {
  const c = el.querySelector('canvas') as HTMLCanvasElement;
  const b = el.querySelector('b') as HTMLElement;
  if (!c) return;
  c.style.transition = 'filter 1.6s ease-out, opacity 1.6s'; c.style.filter = 'brightness(0.15) sepia(1) blur(2px)';
  if (b) { b.style.transition = 'opacity .6s 1.1s'; b.style.opacity = '0'; }
  requestAnimationFrame(() => requestAnimationFrame(() => { c.style.filter = 'none'; if (b) b.style.opacity = '1'; }));
}

/* ======================================================================================================== */
class Board {
  el: HTMLElement;
  private order: (Pin | null)[] = [null, null, null];
  private suspect: Suspect | null = null;
  private sure = 1;
  private svg: SVGSVGElement;
  private threadPath: SVGPathElement;
  private cakeEl: HTMLElement;
  private toks = new Map<Suspect, HTMLElement>();
  private knob: HTMLButtonElement;
  private knobI: HTMLElement;
  private knobL: HTMLElement;
  private sealBtn: HTMLButtonElement;
  private sealRing: SVGCircleElement;
  private caseEl: HTMLElement;
  private dragEnd: [number, number] | null = null;
  private locked = false;
  private wob = 0; private raf = 0;
  private bslots: HTMLElement[] = [];
  constructor(private ctx: SceneCtx, private cam: CamId, pins: Pin[], private onSeal: (p: { pins: string[]; suspect: Suspect; sure: number }) => void, private onBack: () => void) {
    // place clues in time order: BEFORE / MOMENT / AFTER (drag to swap)
    const ps = pins.slice().sort((a, b) => a.t - b.t);
    if (ps.length === 1) this.order = [null, ps[0], null];
    else if (ps.length === 2) this.order = [ps[0], ps[1], null];
    else this.order = [ps[0] || null, ps[1] || null, ps[2] || null];
    const slots = h('div', { class: 'gtg-slots' });
    ['BEFORE', 'THE MOMENT', 'AFTER'].forEach((lab, i) => { const s = h('div', { class: 'gtg-bslot', 'data-i': String(i) }, h('span', null, lab)); this.bslots.push(s); slots.appendChild(s); });
    const cakeC = document.createElement('canvas'); cakeC.width = cakeC.height = 124;
    closeup(cakeC.getContext('2d')!, 124, 'door', 1.6, [-0.74, 0.95, 2.2], (s, m) => ctx.faces.get(s, m), 90);
    this.cakeEl = h('div', { class: 'gtg-cake', role: 'button', tabindex: '0', 'aria-label': 'The cake. Drag the red thread to who or what caused the splat.' }, cakeC);
    const sus = h('div', { class: 'gtg-sus' });
    for (const s of SUSPECTS) {
      const face = SUSPECT_FACE[s.id];
      const img = face ? h('img', { alt: '', src: ctx.faces.url(face[0] as any, face[1]) }) : suspectIcon(s.id, 96);
      const tok = h('button', { class: 'gtg-tok', 'aria-label': 'Thread to ' + s.label, onclick: (e: Event) => { ctx.sfx.gesture(e); ctx.metrics.mark(e); this.choose(s.id); } }, h('div', { class: 'c' }, img), h('span', null, s.label));
      this.toks.set(s.id, tok); sus.appendChild(tok);
    }
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'gtg-thread');
    this.threadPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.threadPath.setAttribute('fill', 'none'); this.threadPath.setAttribute('stroke', '#d62828'); this.threadPath.setAttribute('stroke-width', '3.5'); this.threadPath.setAttribute('stroke-linecap', 'round');
    this.threadPath.style.filter = 'drop-shadow(0 2px 2px rgba(0,0,0,.45))';
    this.svg.appendChild(this.threadPath);
    this.caseEl = h('div', { class: 'gtg-case' }, this.svg, this.cakeEl, sus);
    this.knobI = h('i');
    this.knob = h('button', { class: 'gtg-knob', 'aria-label': 'How sure are you? Tap or twist.', onclick: (e: Event) => { if ((this.knob as any)._twisted) { (this.knob as any)._twisted = false; return; } ctx.sfx.gesture(e); this.setSure((this.sure + 1) % 3); } }, this.knobI) as HTMLButtonElement;
    this.knobL = h('b', null, SURE[1]);
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ring.setAttribute('viewBox', '0 0 100 100');
    this.sealRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.sealRing.setAttribute('cx', '50'); this.sealRing.setAttribute('cy', '50'); this.sealRing.setAttribute('r', '46'); this.sealRing.setAttribute('fill', 'none'); this.sealRing.setAttribute('stroke', '#ffd27a'); this.sealRing.setAttribute('stroke-width', '5'); this.sealRing.setAttribute('stroke-dasharray', '289'); this.sealRing.setAttribute('stroke-dashoffset', '289'); this.sealRing.setAttribute('transform', 'rotate(-90 50 50)');
    ring.appendChild(this.sealRing);
    this.sealBtn = h('button', { class: 'gtg-seal', 'aria-label': 'Hold to seal your verdict' }, ring, 'HOLD\nTO SEAL') as HTMLButtonElement;
    this.sealBtn.style.whiteSpace = 'pre-line';
    this.el = h('div', { class: 'gtg-board' },
      h('h2', null, 'Build your case'),
      h('div', { class: 'sub' }, 'From the ' + CAM_INFO[cam].short.toLowerCase() + ' camera. Pull the red thread from the cake to whoever caused it.'),
      slots, this.caseEl,
      h('div', { class: 'gtg-row' },
        h('button', { class: 'gtg-btn ghost', style: { minHeight: '44px', padding: '0 14px', fontSize: '13px', color: '#2a160a', background: 'rgba(255,245,225,.85)' }, onclick: () => this.onBack() }, '← Feed'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, this.knob, h('div', { class: 'gtg-knobl' }, 'How sure?', this.knobL)),
        this.sealBtn));
    this.renderSlots();
    this.bind();
    this.setSure(1, true);
    this.updateSeal();
    const loop = () => { this.raf = requestAnimationFrame(loop); this.wob *= 0.92; this.drawThread(); };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() { cancelAnimationFrame(this.raf); this.el.remove(); }
  layout() { this.drawThread(); }
  lock(mine?: any) {
    this.locked = true;
    if (mine && mine.suspect) { this.suspect = mine.suspect; this.sure = mine.sure; this.toks.forEach((t, k) => t.classList.toggle('on', k === mine.suspect)); this.knobL.textContent = SURE[this.sure] || SURE[1]; }
    this.el.style.pointerEvents = 'none';
    this.sealBtn.classList.add('stamped');
  }
  private renderSlots() {
    this.bslots.forEach((s, i) => {
      s.querySelectorAll('.pol').forEach(n => n.remove());
      const p = this.order[i];
      if (!p) return;
      const el = polaroid(p, [-4, 2, -2][i]);
      el.setAttribute('data-i', String(i));
      s.appendChild(el);
    });
  }
  private bind() {
    const ctx = this.ctx;
    // drag polaroids between slots
    let from = -1; let ghost: HTMLElement | null = null;
    const slotAt = (x: number, y: number) => this.bslots.findIndex(s => { const r = s.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
    this.bslots.forEach((s, i) => {
      drag(s, {
        down: (_x, _y, e) => { if (this.locked || !this.order[i]) return false; from = i; ctx.sfx.pop(520); ghost = (s.querySelector('.pol') as HTMLElement); if (ghost) { ghost.style.zIndex = '10'; ghost.style.transition = 'none'; } (ghost as any)._sx = e.clientX; (ghost as any)._sy = e.clientY; },
        move: (_x, _y, e) => { if (!ghost) return; ghost.style.transform = `translate(${e.clientX - (ghost as any)._sx}px,${e.clientY - (ghost as any)._sy}px) rotate(4deg) scale(1.06)`; const j = slotAt(e.clientX, e.clientY); this.bslots.forEach((b, k) => b.classList.toggle('over', k === j && k !== from)); },
        up: (_x, _y, e) => {
          const j = slotAt(e.clientX, e.clientY);
          this.bslots.forEach(b => b.classList.remove('over'));
          if (j >= 0 && j !== from) { const a = this.order[from]; this.order[from] = this.order[j]; this.order[j] = a; ctx.sfx.pop(700); }
          ghost = null; from = -1; this.renderSlots();
        }
      });
    });
    // pull the thread from the cake
    drag(this.cakeEl, {
      down: (_x, _y, e) => { if (this.locked) return false; ctx.sfx.unlock(); const r = this.caseEl.getBoundingClientRect(); this.dragEnd = [e.clientX - r.left, e.clientY - r.top]; ctx.sfx.pluck(147, 0.12); },
      move: (_x, _y, e) => { const r = this.caseEl.getBoundingClientRect(); this.dragEnd = [e.clientX - r.left, e.clientY - r.top]; const over = this.tokAt(e.clientX, e.clientY); this.toks.forEach((t, k) => t.classList.toggle('on', k === (over || this.suspect))); },
      up: (_x, _y, e) => { const over = this.tokAt(e.clientX, e.clientY); this.dragEnd = null; if (over) { ctx.sfx.gesture(e); this.choose(over); } else this.toks.forEach((t, k) => t.classList.toggle('on', k === this.suspect)); }
    });
    // twist the knob
    let a0 = 0, s0 = 1, acc = 0;
    drag(this.knob, {
      down: (x, y) => { const r = this.knob.getBoundingClientRect(); a0 = Math.atan2(y - r.height / 2, x - r.width / 2); s0 = this.sure; acc = 0; },
      move: (x, y) => {
        const r = this.knob.getBoundingClientRect(); const a = Math.atan2(y - r.height / 2, x - r.width / 2);
        let d = a - a0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; a0 = a; acc += d;
        const ns = clamp(Math.round(s0 + acc / 0.9), 0, 2);
        if (Math.abs(acc) > 0.2) (this.knob as any)._twisted = true;
        if (ns !== this.sure) this.setSure(ns);
      }
    });
    hold(this.sealBtn, 750, {
      start: () => { if (!this.suspect || this.locked) return; ctx.sfx.unlock(); ctx.sfx.tone(220, 0.75, { type: 'triangle', glide: 440, vol: 0.06 }); },
      progress: (k) => { if (!this.suspect || this.locked) return; this.sealRing.setAttribute('stroke-dashoffset', String(289 * (1 - k))); },
      done: () => {
        if (!this.suspect || this.locked) { if (!this.suspect) this.ctx.toast('Pull the red thread to a suspect first'); return; }
        this.locked = true;
        this.sealBtn.classList.add('stamped'); ctx.sfx.thud();
        const pins = this.order.filter(Boolean).map(p => p!.id);
        this.onSeal({ pins, suspect: this.suspect, sure: this.sure });
      },
      cancel: () => { this.sealRing.setAttribute('stroke-dashoffset', '289'); }
    });
  }
  private tokAt(x: number, y: number): Suspect | null {
    for (const [k, t] of this.toks) { const r = (t.querySelector('.c') as HTMLElement).getBoundingClientRect(); if (Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < r.width * 0.75) return k; }
    return null;
  }
  private choose(s: Suspect) {
    if (this.locked) return;
    this.suspect = s; this.wob = 1;
    this.toks.forEach((t, k) => t.classList.toggle('on', k === s));
    this.ctx.sfx.pluck([196, 220, 247, 262, 294][SUSPECTS.findIndex(x => x.id === s)] || 196);
    this.updateSeal();
  }
  private setSure(n: number, quiet = false) {
    this.sure = n;
    this.knobI.style.transform = `rotate(${(n - 1) * 60}deg)`;
    this.knobL.textContent = SURE[n];
    this.wob = Math.max(this.wob, 0.6);
    if (!quiet) this.ctx.sfx.pluck([165, 196, 247][n], 0.14);
  }
  private updateSeal() { this.sealBtn.toggleAttribute('disabled', !this.suspect); this.sealBtn.setAttribute('aria-disabled', String(!this.suspect)); }
  private drawThread() {
    const cr = this.caseEl.getBoundingClientRect();
    const k = this.cakeEl.getBoundingClientRect();
    const x0 = k.left - cr.left + k.width / 2, y0 = k.top - cr.top + 4;
    let end: [number, number] | null = this.dragEnd;
    if (!end && this.suspect) { const t = this.toks.get(this.suspect)!.querySelector('.c') as HTMLElement; const r = t.getBoundingClientRect(); end = [r.left - cr.left + r.width / 2, r.top - cr.top + 6]; }
    this.svg.setAttribute('viewBox', `0 0 ${cr.width} ${cr.height}`);
    if (!end) { this.threadPath.setAttribute('d', `M${x0},${y0} q 10 26 -4 40`); return; }
    // slack for a hunch, taut when certain; it wobbles when plucked
    const mx = (x0 + end[0]) / 2, my = (y0 + end[1]) / 2;
    const sag = this.dragEnd ? 18 : [46, 22, 2][this.sure];
    const wob = Math.sin(performance.now() / 40) * 10 * this.wob;
    this.threadPath.setAttribute('d', `M${x0},${y0} Q${mx + wob},${my + sag + wob * 0.5} ${end[0]},${end[1]}`);
  }
}

let fontsAdded = false;
function ensureFonts() {
  if (fontsAdded || typeof document === 'undefined') return; fontsAdded = true;
  try { if (!document.querySelector('link[data-gtg-fonts]')) document.head.appendChild(h('link', { rel: 'stylesheet', href: GTG_FONTS, 'data-gtg-fonts': '1' })); } catch (e) { /* fonts are optional */ }
}
export { sleep, lerp, ease, RIGS };
