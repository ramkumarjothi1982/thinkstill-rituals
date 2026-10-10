/* Drama Dubbing Booth — the premiere and the finale, on every device at the same moment.
 * The schedule hangs off the room's reveal time (pub.revealAt, set by the authority), so every cut, voice and live
 * reaction lands on the same frame for everyone, and anyone who reconnects joins mid-screening.
 *   Premiere: lights down → each cut gets a title card ("A film by …") and plays with its Bubble voices; seat-side
 *   Laugh / Gasp / Aww buttons float the reacting player's own Bubble face up from their seat → freeze on the moment
 *   the box opens, every cut side by side → the board.
 *   Finale: the director's cut (every cut at once, perfectly synced) → the red carpet marquee and flashbulbs → the
 *   premiere poster, with only the cuts whose authors said yes. */
import type { RoomView, Player } from '../../room/protocol';
import type { SceneCtx } from '../../console/types';
import { h, clear, Surface, clamp, lerp, ease } from '../../ui/dom';
import { Cue, FILM_LEN, cutTitle } from './content';
import { renderFilm, castAt, cueText } from './film';
import { VoiceBox, Projector } from './voice';

const INTRO = 3.2, CARD = 2.6, GAP = 0.8, SLOT = CARD + FILM_LEN + GAP, FREEZE = 9;
const OPEN_FRAME = 7.15;
const REACTS: { icon: string; label: string; mood: string }[] = [{ icon: 'laugh', label: 'Laugh', mood: 'laugh' }, { icon: 'gasp', label: 'Gasp', mood: 'surprised' }, { icon: 'aww', label: 'Aww', mood: 'love' }];

interface Cut { p: Player; cues: Cue[]; title: string; }

export class PremiereDirector {
  private sf = new Surface();
  private wrap: HTMLElement;
  private over: HTMLElement;
  private raf = 0;
  private view: RoomView | null = null;
  private cuts: Cut[] = [];
  private phase: 'reveal' | 'finale' = 'reveal';
  private finaleAt = 0;
  private voice: VoiceBox;
  private proj: Projector;
  private playingSlot = -1;
  private seenLive = 0;
  private overlay = '';
  private once = new Set<string>();
  private faces: (s: string, m: string) => CanvasImageSource | null;
  private seatX = new Map<string, number>();
  private local0 = 0;
  constructor(private ctx: SceneCtx, parent: HTMLElement) {
    this.faces = (s, m) => ctx.faces.get(s, m);
    this.sf.maxDpr = 1.5;
    this.voice = new VoiceBox(ctx.sfx);
    this.proj = new Projector(ctx.sfx);
    this.over = h('div', { class: 'ddb-over' });
    this.wrap = h('div', { class: 'ddb-cin' }, this.sf.canvas, this.over);
    parent.appendChild(this.wrap);
    this.local0 = performance.now();
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }
  destroy() { cancelAnimationFrame(this.raf); this.voice.stop(); this.proj.stop(); this.wrap.remove(); this.ctx.sfx.duck(0.5); }
  resize() { this.sf.fit(); }

  /** Seconds since the premiere began, on the room's clock. */
  private elapsed(): number {
    const v = this.view;
    const at = v && v.pub && v.pub.revealAt;
    if (!at) return (performance.now() - this.local0) / 1000;
    return (this.ctx.room.serverNow() - at) / 1000;
  }
  update(v: RoomView, prev: RoomView | null) {
    this.view = v;
    if (!this.cuts.length && v.revealed) {
      const order: string[] = (v.pub && v.pub.order) || Object.keys(v.revealed);
      this.cuts = order.map(pid => { const p = v.players.find(x => x.pid === pid); const seal = v.revealed![pid]; return p && seal ? { p, cues: seal.cues as Cue[], title: cutTitle(seal.cues) } : null; }).filter(Boolean) as Cut[];
      const seated = v.players.filter(p => !p.spectator).sort((a, b) => a.seat - b.seat);
      seated.forEach((p, i) => this.seatX.set(p.pid, (i + 0.5) / seated.length));
      this.ctx.sfx.duck(0.12);
      this.seenLive = v.live.length ? v.live[v.live.length - 1].n : 0;
    }
    if (v.phase === 'finale' && this.phase !== 'finale') {
      this.phase = 'finale'; this.finaleAt = performance.now(); this.overlay = ''; this.once.clear(); clear(this.over);
      this.voice.stop(); this.playingSlot = -1;
    }
    for (const ev of v.live) {
      if (ev.n <= this.seenLive) continue;
      this.seenLive = ev.n;
      if (ev.data && ev.data.kind === 'react') this.floatReact(ev.pid, ev.data.icon);
    }
    if (this.overlay === 'finale') this.finaleActions();
    if (this.overlay === 'board') this.boardActions();
    void prev;
  }

  private frame(now: number) {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    this.sf.fit();
    if (this.phase === 'finale') this.drawFinale((now - this.finaleAt) / 1000);
    else this.drawPremiere(this.elapsed());
    this.ctx.metrics.frame(now);
  }

  /* ---------------- the cinema ---------------- */
  private screenRect(W: number, H: number) {
    const land = W / H > 1.2;
    const sw = Math.min(W * (land ? 0.7 : 0.94), (H * (land ? 0.62 : 0.4)) * 16 / 9), sh = sw * 9 / 16;
    return { x: (W - sw) / 2, y: H * (land ? 0.07 : 0.09), w: sw, h: sh };
  }
  private drawCinema(g: CanvasRenderingContext2D, W: number, H: number, light: number) {
    g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H);
    const s = this.screenRect(W, H);
    // curtains
    for (const side of [-1, 1]) {
      const cx = side < 0 ? 0 : W, w = Math.max(16, (W - s.w) / 2 - 4);
      for (let i = 0; i < 6; i++) {
        const x = side < 0 ? cx + (i / 6) * w : cx - ((i + 1) / 6) * w;
        const gr = g.createLinearGradient(x, 0, x + w / 6, 0); gr.addColorStop(0, '#3a0610'); gr.addColorStop(0.5, '#8e1426'); gr.addColorStop(1, '#3a0610');
        g.fillStyle = gr; g.fillRect(x, 0, w / 6 + 1, H * 0.78);
      }
    }
    // screen glow and the projector beam
    g.save(); g.globalCompositeOperation = 'lighter';
    const beam = g.createLinearGradient(W / 2, H, W / 2, s.y + s.h); beam.addColorStop(0, `rgba(255,230,190,${0.04 + 0.12 * light})`); beam.addColorStop(1, 'rgba(255,230,190,0.01)');
    g.fillStyle = beam; g.beginPath(); g.moveTo(W / 2 - 6, H * 0.98); g.lineTo(s.x, s.y + s.h); g.lineTo(s.x + s.w, s.y + s.h); g.lineTo(W / 2 + 6, H * 0.98); g.fill();
    for (let i = 0; i < 40; i++) { const k = (i * 0.618 + performance.now() / 9000) % 1; const x = lerp(W / 2, s.x + (i / 40) * s.w, k), y = lerp(H * 0.98, s.y + s.h, k); g.fillStyle = `rgba(255,240,210,${0.12 * light})`; g.fillRect(x, y, 1.5, 1.5); }
    g.restore();
    // seats with everyone in them
    const rowY = W / H > 1.2 ? H * 0.82 : H * 0.6, seatW = Math.min(W / Math.max(4, this.seatX.size + 1), 120 * this.sf.dpr);
    this.seatX.forEach((fx, pid) => {
      const p = this.view && this.view.players.find(x => x.pid === pid); if (!p) return;
      const x = W * 0.1 + fx * W * 0.8;
      const img = this.faces(p.avatar, 'neutral');
      const sz = seatW * 0.7;
      if (img) { g.save(); g.globalAlpha = 0.85; g.drawImage(img, x - sz / 2, rowY - sz * 0.8, sz, sz); g.restore(); }
      g.fillStyle = '#5a0e1a'; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(x - seatW * 0.45, rowY, seatW * 0.9, H * 0.12, 10 * this.sf.dpr) : g.rect(x - seatW * 0.45, rowY, seatW * 0.9, H * 0.12); g.fill();
      g.fillStyle = 'rgba(255,236,200,0.85)'; g.font = `600 ${Math.max(10, 11 * this.sf.dpr)}px Fredoka, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText(this.view && p.pid === this.view.you ? 'You' : p.name, x, rowY + 6 * this.sf.dpr);
      if (!p.human) { g.font = `${Math.max(8, 9 * this.sf.dpr)}px Fredoka, system-ui, sans-serif`; g.fillStyle = 'rgba(255,236,200,0.6)'; g.fillText('Bubble companion', x, rowY + 20 * this.sf.dpr); }
    });
    return s;
  }
  private titleCard(g: CanvasRenderingContext2D, s: { x: number; y: number; w: number; h: number }, cut: Cut, k: number) {
    g.save(); g.beginPath(); g.rect(s.x, s.y, s.w, s.h); g.clip();
    g.fillStyle = '#120a06'; g.fillRect(s.x, s.y, s.w, s.h);
    const a = clamp(k * 3, 0, 1) * clamp((1 - k) * 4, 0, 1);
    g.globalAlpha = a;
    g.strokeStyle = '#d9b26a'; g.lineWidth = Math.max(1.5, s.w * 0.005);
    g.strokeRect(s.x + s.w * 0.06, s.y + s.h * 0.1, s.w * 0.88, s.h * 0.8);
    g.strokeRect(s.x + s.w * 0.075, s.y + s.h * 0.13, s.w * 0.85, s.h * 0.74);
    g.fillStyle = '#e9cf98'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${s.h * 0.075}px 'Limelight', Georgia, serif`;
    g.fillText('A FILM BY', s.x + s.w / 2, s.y + s.h * 0.3);
    const by = this.view && cut.p.pid === this.view.you ? 'YOU' : cut.p.name.toUpperCase();
    g.font = `${s.h * 0.13}px 'Limelight', Georgia, serif`; g.fillStyle = '#ffe2a8';
    g.fillText(by, s.x + s.w / 2, s.y + s.h * 0.45);
    if (!cut.p.human) { g.font = `600 ${s.h * 0.055}px Fredoka, system-ui, sans-serif`; g.fillStyle = '#c8b48f'; g.fillText('Bubble companion', s.x + s.w / 2, s.y + s.h * 0.56); }
    g.font = `italic ${s.h * 0.07}px Georgia, serif`; g.fillStyle = '#e9cf98';
    g.fillText('“' + cut.title + '”', s.x + s.w / 2, s.y + s.h * 0.72);
    g.restore();
  }
  private drawPremiere(e: number) {
    const sf = this.sf, g = sf.g, W = sf.pw, H = sf.ph, n = this.cuts.length;
    const total = INTRO + n * SLOT;
    const light = e < INTRO ? 1 - clamp(e / INTRO, 0, 1) * 0.7 : e < total ? 0.3 : 0.6;
    const s = this.drawCinema(g, W, H, light);
    if (e < INTRO) {
      g.fillStyle = '#120a06'; g.fillRect(s.x, s.y, s.w, s.h);
      g.fillStyle = '#ffe2a8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${s.h * 0.11}px 'Limelight', Georgia, serif`;
      g.globalAlpha = clamp(e / 0.6, 0, 1); g.fillText('TONIGHT’S PREMIERES', s.x + s.w / 2, s.y + s.h * 0.42);
      g.font = `${s.h * 0.065}px Georgia, serif`; g.fillText(`${n} cuts of “The Gift”`, s.x + s.w / 2, s.y + s.h * 0.6); g.globalAlpha = 1;
      if (e > 0.2) this.doOnce('lights', () => { this.ctx.sfx.whoosh(false, 1.2); });
      this.setOverlay('intro');
    } else if (e < total) {
      const i = Math.floor((e - INTRO) / SLOT), k = e - INTRO - i * SLOT, cut = this.cuts[i];
      if (k < CARD) { this.titleCard(g, s, cut, k / CARD); this.doOnce('card' + i, () => this.ctx.sfx.chime([392, 523.25])); }
      else if (k < CARD + FILM_LEN) {
        const ft = k - CARD;
        if (this.playingSlot !== i) { this.playingSlot = i; this.voice.stop(); this.voice.play(cut.cues, ft); this.proj.start(0.03); }
        g.save(); g.beginPath(); g.rect(s.x, s.y, s.w, s.h); g.clip(); g.translate(s.x, s.y);
        renderFilm(g, s.w, s.h, ft, { faces: this.faces, cues: cut.cues });
        g.restore();
      } else { if (this.playingSlot === i) { this.proj.stop(); } g.fillStyle = '#120a06'; g.fillRect(s.x, s.y, s.w, s.h); }
      this.setOverlay('react');
    } else {
      if (this.playingSlot !== -2) { this.playingSlot = -2; this.voice.stop(); this.proj.stop(); }
      const f = e - total;
      this.freeze(g, W, H, s, clamp(f / 0.8, 0, 1));
      this.doOnce('freeze', () => this.ctx.sfx.chime([523.25, 659.25, 783.99]));
      this.setOverlay(f > 3.0 ? 'board' : 'none');
    }
    // the gold frame of the screen
    g.strokeStyle = 'rgba(217,178,106,0.6)'; g.lineWidth = 2 * sf.dpr; g.strokeRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
  }
  /** Perspective shift: the same frame, every cut. */
  private freeze(g: CanvasRenderingContext2D, W: number, H: number, s: { x: number; y: number; w: number; h: number }, a: number) {
    const n = this.cuts.length, cols = n <= 1 ? 1 : 2, rows = Math.ceil(n / cols);
    const land = W / H > 1.2;
    const areaH = land ? H * 0.62 : H * 0.5, areaW = W * 0.94;
    const tw = Math.min(areaW / cols - 8, ((areaH / rows) - 26 * this.sf.dpr) * 16 / 9), th = tw * 9 / 16;
    const x0 = (W - (cols * tw + (cols - 1) * 8)) / 2, y0 = H * 0.05;
    g.fillStyle = `rgba(7,5,10,${0.9 * a})`; g.fillRect(0, 0, W, H);
    this.cuts.forEach((c, i) => {
      const x = x0 + (i % cols) * (tw + 8), y = y0 + Math.floor(i / cols) * (th + 30 * this.sf.dpr);
      g.save(); g.globalAlpha = a; g.beginPath(); g.rect(x, y, tw, th); g.clip(); g.translate(x, y);
      renderFilm(g, tw, th, OPEN_FRAME, { faces: this.faces, cues: c.cues, grain: false });
      g.restore();
      g.globalAlpha = a;
      g.fillStyle = '#ffe2a8'; g.font = `600 ${Math.max(11, 12 * this.sf.dpr)}px Fredoka, system-ui, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top';
      const who = (this.view && c.p.pid === this.view.you ? 'You' : c.p.name) + (c.p.human ? '' : ' · Bubble companion');
      g.fillText(who, x + 2, y + th + 4 * this.sf.dpr);
      g.globalAlpha = 1;
    });
    const cap = `Same frame. ${n} different ${n === 1 ? 'story' : 'stories'}.`;
    g.fillStyle = '#ffe2a8'; g.textAlign = 'center'; g.font = `${Math.max(16, W * 0.04)}px 'Limelight', Georgia, serif`; g.textBaseline = 'middle';
    g.globalAlpha = a; g.fillText(cap, W / 2, Math.min(H * 0.74, y0 + rows * (th + 30 * this.sf.dpr) + 24 * this.sf.dpr)); g.globalAlpha = 1;
  }
  private doOnce(k: string, f: () => void) { if (!this.once.has(k)) { this.once.add(k); f(); } }

  /* ---------------- overlays ---------------- */
  private setOverlay(kind: string) {
    if (this.overlay === kind) return;
    this.overlay = kind;
    clear(this.over);
    const ctx = this.ctx, v = this.view!;
    if (kind === 'react') {
      const me = v.players.find(p => p.pid === v.you);
      const row = h('div', { class: 'ddb-react', role: 'group', 'aria-label': 'React — everyone sees it' });
      REACTS.forEach(r => row.appendChild(h('button', { 'aria-label': r.label, title: r.label, onclick: (e: Event) => { ctx.sfx.gesture(e); ctx.metrics.mark(e); ctx.sfx.pop(r.icon === 'laugh' ? 700 : r.icon === 'gasp' ? 420 : 560); ctx.room.act('live', { kind: 'react', icon: r.icon, at: Math.round(this.elapsed() * 10) / 10 }); } }, h('img', { alt: '', src: ctx.faces.url((me ? me.avatar : 'loopie') as any, r.mood), style: { width: '46px', height: '46px', objectFit: 'contain' } }))));
      this.over.appendChild(row);
      this.over.appendChild(h('div', { class: 'ddb-note' }, 'Laugh, gasp or aww — your Bubble pops up from your seat for everyone.'));
      if (ctx.room.isHost) this.over.appendChild(h('button', { class: 'ddb-btn ghost', style: { minHeight: '40px', fontSize: '13px' }, onclick: () => ctx.room.act('finale') }, 'Skip to the director’s cut'));
    } else if (kind === 'board') {
      this.over.appendChild(h('div', { class: 'ddb-line2' }, 'Same scene. Same frames. The meaning came from the voices.'));
      const rows = h('div', { class: 'ddb-rows' });
      for (const c of this.cuts) {
        const lines = c.cues.map(q => (q.who === 'patch' ? 'Patch' : 'Sync') + ': “' + cueText(q) + '”').join('  ·  ');
        rows.appendChild(h('div', { class: 'ddb-vrow' }, h('img', { alt: '', src: ctx.faces.url(c.p.avatar, 'laugh') }), h('b', null, (c.p.pid === v.you ? 'You' : c.p.name) + (c.p.human ? '' : ' · Bubble companion') + ' — ' + c.title), h('small', null, lines)));
      }
      this.over.appendChild(rows);
      this.over.appendChild(h('div', { class: 'ddb-actions' }));
      this.boardActions();
    }
  }
  private boardActions() {
    const a = this.over.querySelector('.ddb-actions') as HTMLElement; if (!a) return;
    clear(a);
    if (this.ctx.room.isHost) a.appendChild(h('button', { class: 'ddb-btn', onclick: (e: Event) => { this.ctx.sfx.gesture(e); this.ctx.room.act('finale'); } }, 'Director’s cut →'));
    else a.appendChild(h('div', { class: 'ddb-note' }, 'The host rolls the director’s cut.'));
  }
  private floatReact(pid: string, icon: string) {
    const v = this.view; if (!v) return;
    const p = v.players.find(x => x.pid === pid); if (!p) return;
    const r = REACTS.find(x => x.icon === icon) || REACTS[0];
    const fx = this.seatX.get(pid) ?? 0.5;
    const el = h('div', { class: 'ddb-float', style: { left: `calc(${10 + fx * 80}% - 24px)`, top: (this.sf.w / Math.max(1, this.sf.h) > 1.2 ? 72 : 52) + '%' } }, h('img', { alt: '', src: this.ctx.faces.url(p.avatar, r.mood), style: { width: '48px', height: '48px', objectFit: 'contain' } }));
    this.wrap.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  /* ---------------- finale ---------------- */
  private drawFinale(k: number) {
    const sf = this.sf, g = sf.g, W = sf.pw, H = sf.ph, n = this.cuts.length, dpr = sf.dpr;
    g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H);
    if (k < FILM_LEN + 0.6) {
      // the director's cut: every cut at once, perfectly synced
      const ft = clamp(k - 0.6, 0, FILM_LEN - 0.01);
      if (k > 0.6) this.doOnce('dc', () => { this.cuts.forEach(c => this.voice.play(c.cues, 0, 1, 0.55)); this.proj.start(0.03); });
      const cols = n <= 1 ? 1 : 2, rows = Math.ceil(n / cols);
      const tw = Math.min(W * 0.96 / cols - 6, (H * 0.86 / rows - 24 * dpr) * 16 / 9), th = tw * 9 / 16;
      const x0 = (W - (cols * tw + (cols - 1) * 6)) / 2, y0 = (H - rows * (th + 24 * dpr)) / 2;
      this.cuts.forEach((c, i) => {
        const x = x0 + (i % cols) * (tw + 6), y = y0 + Math.floor(i / cols) * (th + 24 * dpr);
        g.save(); g.beginPath(); g.rect(x, y, tw, th); g.clip(); g.translate(x, y);
        renderFilm(g, tw, th, ft, { faces: this.faces, cues: c.cues, grain: i === 0 });
        g.restore();
        g.fillStyle = '#ffe2a8'; g.font = `600 ${Math.max(10, 11 * dpr)}px Fredoka, system-ui, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top';
        g.fillText(c.title, x + 2, y + th + 3 * dpr);
      });
      g.fillStyle = '#ffe2a8'; g.textAlign = 'center'; g.textBaseline = 'top'; g.font = `${Math.max(14, W * 0.032)}px 'Limelight', Georgia, serif`;
      g.fillText('THE DIRECTOR’S CUT', W / 2, 8 * dpr);
    } else {
      if (this.playingSlot !== -3) { this.playingSlot = -3; this.voice.stop(); this.proj.stop(); }
      this.redCarpet(g, W, H, k - FILM_LEN - 0.6, dpr);
      if (k > FILM_LEN + 5.0 && this.overlay !== 'finale') this.showPoster();
    }
  }
  private redCarpet(g: CanvasRenderingContext2D, W: number, H: number, k: number, dpr: number) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#120a1a'); bg.addColorStop(1, '#2a0a12'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // the carpet
    g.fillStyle = '#9b111e'; g.beginPath(); g.moveTo(W * 0.38, H * 0.55); g.lineTo(W * 0.62, H * 0.55); g.lineTo(W * 0.95, H); g.lineTo(W * 0.05, H); g.closePath(); g.fill();
    // marquee with chasing bulbs
    const mw = Math.min(W * 0.9, 640 * dpr), mh = mw * 0.32, mx = (W - mw) / 2, my = H * 0.06;
    g.fillStyle = '#1a1006'; g.fillRect(mx, my, mw, mh);
    g.strokeStyle = '#d9b26a'; g.lineWidth = 3 * dpr; g.strokeRect(mx, my, mw, mh);
    const nb = 28;
    for (let i = 0; i < nb; i++) {
      const per = 2 * (mw + mh), d = (i / nb) * per; let x, y;
      if (d < mw) { x = mx + d; y = my; } else if (d < mw + mh) { x = mx + mw; y = my + d - mw; } else if (d < 2 * mw + mh) { x = mx + mw - (d - mw - mh); y = my + mh; } else { x = mx; y = my + mh - (d - 2 * mw - mh); }
      const on = (Math.floor(k * 8) + i) % 3 === 0;
      g.fillStyle = on ? '#fff3c4' : '#7a5a20'; g.beginPath(); g.arc(x, y, 4 * dpr, 0, Math.PI * 2); g.fill();
      if (on) { g.fillStyle = 'rgba(255,230,160,0.25)'; g.beginPath(); g.arc(x, y, 10 * dpr, 0, Math.PI * 2); g.fill(); }
    }
    const idx = Math.floor(k / 1.4) % Math.max(1, this.cuts.length);
    const c = this.cuts[idx];
    g.fillStyle = '#ffe2a8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${mh * 0.13}px 'Limelight', Georgia, serif`; g.fillText('NOW SHOWING', W / 2, my + mh * 0.25);
    if (c) { g.font = `${mh * 0.17}px 'Limelight', Georgia, serif`; g.fillText(c.title.toUpperCase(), W / 2, my + mh * 0.55); g.font = `${mh * 0.1}px Georgia, serif`; g.fillText('a film by ' + (this.view && c.p.pid === this.view.you ? 'you' : c.p.name), W / 2, my + mh * 0.8); }
    // the cast on the carpet
    const cast: { slug: string; mood: string }[] = [{ slug: 'patch', mood: 'celebrate' }, { slug: 'sync', mood: 'love' }];
    this.cuts.forEach(cu => { if (!cast.some(x => x.slug === cu.p.avatar)) cast.push({ slug: cu.p.avatar, mood: 'wink' }); });
    const sz = Math.min(W / (cast.length + 1), H * 0.2);
    cast.forEach((a, i) => {
      const x = W / 2 + (i - (cast.length - 1) / 2) * sz * 0.95, y = H * 0.82 + Math.abs(Math.sin(k * 3 + i)) * -sz * 0.06;
      const img = this.faces(a.slug, a.mood); if (img) g.drawImage(img, x - sz / 2, y - sz, sz, sz);
    });
    // flashbulbs
    for (let i = 0; i < 6; i++) {
      const t = (k * 1.7 + i * 0.37) % 1.6;
      if (t < 0.12) {
        this.doOnce('fl' + Math.floor(k * 1.7 + i * 0.37) + '-' + i, () => this.ctx.sfx.flash());
        const x = (0.08 + ((i * 0.31) % 0.84)) * W, y = H * (0.45 + (i % 3) * 0.12);
        const r = Math.min(W, H) * 0.35 * (1 - t / 0.12);
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
  }
  private showPoster() {
    this.overlay = 'finale';
    clear(this.over);
    this.over.appendChild(h('div', { class: 'ddb-poster' }, h('canvas', { width: '1080', height: '1350' })));
    this.over.appendChild(h('div', { class: 'ddb-note' }, 'Only cuts whose authors tick the box appear on the poster.'));
    this.over.appendChild(h('div', { class: 'ddb-actions' }));
    this.ctx.sfx.chime();
    this.finaleActions();
  }
  private finaleActions() {
    const a = this.over.querySelector('.ddb-actions') as HTMLElement; if (!a) return;
    const ctx = this.ctx, v = this.view!;
    clear(a);
    const me = v.players.find(p => p.pid === v.you);
    if (me && me.human && this.cuts.some(c => c.p.pid === me.pid)) {
      const box = h('input', { type: 'checkbox' }) as HTMLInputElement;
      box.checked = !!v.consent[me.pid];
      box.addEventListener('change', () => ctx.room.act('consent', { share: box.checked }));
      a.appendChild(h('label', { class: 'ddb-consent' }, box, 'Put my cut on the poster'));
    }
    a.appendChild(h('button', { class: 'ddb-btn ghost', onclick: () => this.savePoster() }, 'Save poster'));
    if (ctx.room.isHost) a.appendChild(h('button', { class: 'ddb-btn', onclick: () => ctx.next('replay') }, 'Play again'));
    a.appendChild(h('button', { class: 'ddb-btn ghost', onclick: () => ctx.next('hub') }, 'Rituals'));
    this.drawPoster();
  }
  private drawPoster() {
    const c = this.over.querySelector('.ddb-poster canvas') as HTMLCanvasElement; if (!c) return;
    const g = c.getContext('2d')!, W = 1080, H = 1350, v = this.view!;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1a0d08'); bg.addColorStop(1, '#3a0d16'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#d9b26a'; g.lineWidth = 6; g.strokeRect(30, 30, W - 60, H - 60); g.lineWidth = 2; g.strokeRect(46, 46, W - 92, H - 92);
    g.fillStyle = '#ffe2a8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = "52px 'Limelight', Georgia, serif"; g.fillText('PREMIERE NIGHT', W / 2, 120);
    g.font = "86px 'Limelight', Georgia, serif"; g.fillText('THE GIFT', W / 2, 210);
    const shown = this.cuts.filter(cu => !cu.p.human || v.consent[cu.p.pid]);
    g.font = "30px Georgia, serif"; g.fillStyle = '#e9cf98';
    g.fillText(shown.length ? `${shown.length} ${shown.length === 1 ? 'cut' : 'cuts'} of one silent scene` : 'Tick the box to put your cut here', W / 2, 272);
    const cols = shown.length <= 2 ? 1 : 2, tw = shown.length <= 1 ? 820 : shown.length === 2 ? 680 : 470, th = tw * 9 / 16;
    shown.slice(0, 4).forEach((cu, i) => {
      const x = cols === 1 ? (W - tw) / 2 : 60 + (i % 2) * (tw + 20), y = 320 + Math.floor(i / cols) * (th + 110);
      const off = document.createElement('canvas'); off.width = Math.round(tw); off.height = Math.round(th);
      renderFilm(off.getContext('2d')!, off.width, off.height, OPEN_FRAME, { faces: this.faces, cues: cu.cues, grain: false });
      g.drawImage(off, x, y);
      g.strokeStyle = '#d9b26a'; g.lineWidth = 3; g.strokeRect(x, y, tw, th);
      g.fillStyle = '#ffe2a8'; g.font = "34px 'Limelight', Georgia, serif"; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText(cu.title.length > 26 ? cu.title.slice(0, 25) + '…' : cu.title, x, y + th + 12);
      g.font = "26px Georgia, serif"; g.fillStyle = '#c8b48f';
      g.fillText(cu.p.human ? 'a film by ' + cu.p.name : 'a film by ' + cu.p.name + ' · Bubble companion', x, y + th + 54);
    });
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,226,168,0.8)'; g.font = "28px Fredoka, system-ui, sans-serif";
    g.fillText('ThinkStill Reflect · Drama Dubbing Booth', W / 2, H - 90);
  }
  private savePoster() {
    const c = this.over.querySelector('.ddb-poster canvas') as HTMLCanvasElement; if (!c) return;
    c.toBlob((b) => { if (b) this.ctx.download('the-gift-premiere.png', b).then(ok => { if (!ok) this.ctx.toast('Saving isn’t available here'); }); }, 'image/png');
  }
}
export { castAt };
