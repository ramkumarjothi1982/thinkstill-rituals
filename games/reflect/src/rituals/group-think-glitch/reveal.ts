/* Group Think Glitch — the collective reveal and the finale, played on every device from the same sealed data.
 *   Reveal: every camera at once in slow motion → freeze at the lunge → cracks and verdict stamps ("4 cameras,
 *   3 stories") → the shards swing up into the ceiling camera, the angle nobody had → the whole chain plays with each
 *   player's search path → "Everyone saw a true piece. Nobody had the whole picture."
 *   Finale: rewind until the cake is whole again → the cast poses → four cameras flash → four polaroids develop →
 *   share card (cameras and verdict icons; names only if everyone agrees). */
import type { RoomView, Player } from '../../room/protocol';
import type { SceneCtx } from '../../console/types';
import { h, clear, Surface, clamp, lerp, ease } from '../../ui/dom';
import { CAM_INFO, CamId, HOTSPOTS, SUSPECTS, Suspect, SURE, TRUTH } from './content';
import { renderWorld, lens, rigCam, stateAt, hotspotAnchor, closeup, drawPose, uvToWorld, projectLast, RIGS, Look } from './world';
import { lookAt, V3 } from '../../gfx/projector';
import { suspectIcon, SUSPECT_FACE } from './art';

const COLORS = ['#ffd27a', '#7fd8ff', '#ff8fb3', '#a6f0a0', '#c3a6ff', '#ffb36b'];
const TAGS: { tag: string; label: string }[] = [
  { tag: 'cat', label: 'The cat!' }, { tag: 'edge', label: 'The cake was at the edge' }, { tag: 'string', label: 'That balloon string' },
  { tag: 'nobody', label: 'Nobody saw all of it' }, { tag: 'angles', label: 'How different the angles were' }
];
const COMPANION_TAG: Record<string, string> = { glitch: 'angles', loopie: 'cat', sync: 'string', patch: 'edge', rush: 'nobody', drop: 'nobody', still: 'angles' };

interface Seat { p: Player; cam: CamId; seal: any; color: string; tile?: HTMLCanvasElement; shards?: Shard[]; impact?: [number, number]; cracks?: [number, number][][]; }
interface Shard { pts: [number, number][]; vx: number; vy: number; va: number; cx: number; cy: number; }

export class RevealDirector {
  private sf = new Surface();
  private wrap: HTMLElement;
  private over: HTMLElement;
  private raf = 0;
  private t0 = 0;
  private phase: 'reveal' | 'finale' = 'reveal';
  private view: RoomView | null = null;
  private seats: Seat[] = [];
  private stories = 1;
  private overlayShown = '';
  private seenLive = 0;
  private sounds = new Set<string>();
  private faces: (s: string, m: string) => CanvasImageSource | null;
  private photos: { cam: CamId; c: HTMLCanvasElement }[] = [];
  private skipTo = 0;
  constructor(private ctx: SceneCtx, parent: HTMLElement) {
    this.faces = (s, m) => ctx.faces.get(s, m);
    this.sf.maxDpr = 1.5;
    this.over = h('div', { class: 'gtg-over' });
    this.wrap = h('div', { class: 'gtg-stage' }, this.sf.canvas, this.over);
    parent.appendChild(this.wrap);
    this.wrap.addEventListener('pointerdown', (e) => { if (e.target === this.sf.canvas && this.phase === 'reveal' && this.elapsed() > 1.2 && this.elapsed() < 15.5) { this.skipTo = 15.5; } });
  }
  destroy() { cancelAnimationFrame(this.raf); this.wrap.remove(); this.ctx.sfx.duck(0.5); }
  resize() { this.sf.fit(); this.seats.forEach(s => { s.tile = undefined; s.shards = undefined; }); }
  private elapsed() { return (performance.now() - this.t0) / 1000 + this.skipTo; }

  update(v: RoomView, prev: RoomView | null) {
    this.view = v;
    const parts = v.players.filter(p => !p.spectator).sort((a, b) => a.seat - b.seat);
    if (!this.seats.length || (prev && prev.phase !== v.phase)) {
      this.seats = parts.map((p, i) => ({ p, cam: (v.pub && v.pub.cams && v.pub.cams[p.pid]) || 'door', seal: v.revealed ? v.revealed[p.pid] : null, color: COLORS[i % COLORS.length] }));
      this.stories = new Set(this.seats.filter(s => s.seal).map(s => s.seal.suspect)).size || 1;
    } else {
      this.seats.forEach(s => { const np = parts.find(p => p.pid === s.p.pid); if (np) s.p = np; });
    }
    const want = v.phase === 'finale' ? 'finale' : 'reveal';
    if (!this.t0 || want !== this.phase) {
      this.phase = want; this.t0 = performance.now(); this.skipTo = 0; this.overlayShown = ''; this.sounds.clear();
      clear(this.over);
      this.wrap.querySelectorAll('.gtg-float').forEach(n => n.remove());
      this.ctx.sfx.duck(0.18);
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame((n) => this.frame(n));
      if (want === 'reveal') this.seenLive = v.live.length ? v.live[v.live.length - 1].n : 0;
    }
    // new "what surprised you" taps float up for everyone
    for (const ev of v.live) {
      if (ev.n <= this.seenLive) continue;
      this.seenLive = ev.n;
      const who = v.players.find(p => p.pid === ev.pid);
      const tag = TAGS.find(t => t.tag === (ev.data && ev.data.tag));
      if (tag && who) this.float((ev.pid === v.you ? 'You' : who.name) + ': ' + tag.label);
    }
    if (this.overlayShown) this.refreshOverlay();
  }

  private once(key: string, fn: () => void) { if (!this.sounds.has(key)) { this.sounds.add(key); fn(); } }

  private frame(now: number) {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    this.sf.fit();
    const k = this.elapsed();
    if (this.phase === 'reveal') this.drawReveal(k); else this.drawFinale(k);
    this.ctx.metrics.frame(now);
  }

  /* ------------------------------------------------ reveal ------------------------------------------------ */
  private layoutTiles(W: number, H: number) {
    const n = this.seats.length || 1;
    const land = W / H > 1.25;
    const cols = land ? Math.min(n, 4) : (n <= 2 ? 1 : 2);
    const rows = Math.ceil(n / cols);
    const pad = Math.round(Math.min(W, H) * 0.025);
    const top = Math.round(H * (land ? 0.1 : 0.08)), bottom = Math.round(H * (land ? 0.16 : 0.15));
    const tw = (W - pad * (cols + 1)) / cols, th = (H - top - bottom - pad * (rows - 1)) / rows;
    return this.seats.map((_, i) => { const c = i % cols, r = Math.floor(i / cols); const rowN = Math.min(cols, n - r * cols); const off = (cols - rowN) * (tw + pad) / 2; return { x: pad + off + c * (tw + pad), y: top + r * (th + pad), w: tw, h: th }; });
  }
  private drawReveal(k: number) {
    const sf = this.sf, g = sf.g, W = sf.pw, H = sf.ph, dpr = sf.dpr;
    const sfx = this.ctx.sfx;
    g.fillStyle = '#07060f'; g.fillRect(0, 0, W, H);
    const boxes = this.layoutTiles(W, H);
    const FREEZE = 4.3;
    if (k < 8.0) {
      // the mosaic: every camera at once, slow motion, then freeze on the lunge
      const tt = k < 5.0 ? lerp(2.4, FREEZE, clamp((k - 0.6) / 4.4, 0, 1)) : FREEZE;
      if (k > 1.0 && k < 5.0) { const beat = Math.floor((k - 1.0) / 1.15); this.once('hb' + beat, () => sfx.heartbeat()); }
      this.seats.forEach((s, i) => {
        const b = boxes[i];
        const tw = Math.max(2, Math.round(b.w)), th = Math.max(2, Math.round(b.h));
        if (!s.tile || s.tile.width !== tw || s.tile.height !== th) { s.tile = document.createElement('canvas'); s.tile.width = tw; s.tile.height = th; s.shards = undefined; }
        if (k < 5.4 || !(s.tile as any)._frozen) {
          const tg = s.tile.getContext('2d')!;
          const st = stateAt(tt);
          renderWorld(tg, tw, th, rigCam(s.cam, tt), st, { look: s.cam, faces: this.faces });
          lens(tg, tw, th, s.cam, st, false);
          (s.tile as any)._frozen = k >= 5.0;
        }
        if (!s.impact) { const r = mulberry(hashS(s.p.pid)); s.impact = [0.35 + r() * 0.3, 0.35 + r() * 0.3]; }
        const fade = clamp(k / 0.6, 0, 1);
        if (k < 6.4) {
          g.globalAlpha = fade;
          g.drawImage(s.tile, b.x, b.y);
          g.globalAlpha = 1;
          this.tileFrame(g, b, s, dpr, k);
          if (k >= 5.0) this.cracks(g, b, s, clamp((k - 5.0 - i * 0.12) / 0.35, 0, 1), dpr);
          if (k >= 5.4 + i * 0.22) { this.once('stamp' + i, () => sfx.thud()); this.stamp(g, b, s, clamp((k - 5.4 - i * 0.22) / 0.25, 0, 1), dpr); }
        } else {
          // shards swing up and away
          if (!s.shards) s.shards = makeShards(b, s.impact!);
          const u = clamp((k - 6.4) / 1.5, 0, 1);
          for (const sh of s.shards) {
            g.save();
            const dx = sh.vx * u * W * 0.25, dy = sh.vy * u * H * 0.5 - u * u * H * 0.9;
            g.translate(sh.cx + dx, sh.cy + dy); g.rotate(sh.va * u * 2.2); g.translate(-sh.cx, -sh.cy);
            g.globalAlpha = 1 - ease.in(u);
            g.beginPath(); sh.pts.forEach((p, j) => j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
            g.drawImage(s.tile!, b.x, b.y);
            g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5 * dpr; g.stroke();
            g.restore();
          }
        }
      });
      if (k >= 5.0) this.once('crack', () => sfx.crack());
      if (k >= 6.4) this.once('whoosh', () => sfx.whoosh(true, 1.2));
      // caption
      if (k >= 5.3 && k < 7.2) this.caption(g, `${this.seats.length} cameras. ${this.stories} ${this.stories === 1 ? 'story' : 'stories'}.`, W, H, dpr, clamp((k - 5.3) / 0.4, 0, 1) * (1 - clamp((k - 6.8) / 0.4, 0, 1)), 0.93);
      else if (k < 1.6) this.caption(g, 'Every camera, at the same moment', W, H, dpr, clamp(k / 0.4, 0, 1) * (1 - clamp((k - 1.2) / 0.4, 0, 1)), 0.93);
    }
    if (k >= 7.6) {
      // the ceiling: the angle nobody had
      const into = clamp((k - 7.6) / 1.0, 0, 1);
      const tt = k < 9.0 ? 0.6 : Math.min(5.6, 0.6 + (k - 9.0) * 0.72);
      const st = stateAt(tt);
      const cam = rigCam('ceiling', tt);
      cam.fov = (W / H < 1 ? 0.66 : 0.86) * lerp(1.5, 1, ease.out(into));
      renderWorld(g, W, H, cam, st, { look: 'ceiling', faces: this.faces });
      lens(g, W, H, 'ceiling', st, false);
      this.paths(g, tt, dpr, k);
      g.fillStyle = `rgba(7,6,15,${1 - into})`; g.fillRect(0, 0, W, H);
      this.once('ceiling', () => sfx.chime([392, 523.25, 659.25]));
      if (k < 9.4) this.caption(g, 'The angle nobody had', W, H, dpr, clamp((k - 7.9) / 0.4, 0, 1) * (1 - clamp((k - 9.0) / 0.4, 0, 1)), 0.12);
      if (k >= 9.0) {
        let beat = -1; TRUTH.forEach((b, i) => { if (tt >= b.t) beat = i; });
        if (beat >= 0) { this.once('beat' + beat, () => sfx.pluck([262, 294, 330, 349, 392][beat] || 262, 0.1)); this.caption(g, TRUTH[beat].text, W, H, dpr, k < 15.6 ? 1 : clamp(1 - (k - 15.6) / 0.4, 0, 1), 0.9); }
        if (tt >= 4.82) this.once('splat', () => sfx.splat());
      }
      if (k > 15.8) { g.fillStyle = 'rgba(7,6,15,0.55)'; g.fillRect(0, 0, W, H); }
    }
    if (k > 16 && this.overlayShown !== 'reveal') this.showRevealOverlay();
  }
  private tileFrame(g: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, s: Seat, dpr: number, k: number) {
    const me = this.view && s.p.pid === this.view.you;
    g.save();
    g.strokeStyle = me ? '#ffd27a' : 'rgba(255,255,255,0.25)'; g.lineWidth = (me ? 3 : 1.5) * dpr;
    g.strokeRect(b.x, b.y, b.w, b.h);
    // label strip: avatar, who, which camera
    const lh = Math.max(30 * dpr, Math.min(44 * dpr, b.h * 0.14));
    g.fillStyle = 'rgba(7,6,15,0.72)'; g.fillRect(b.x, b.y + b.h - lh, b.w, lh);
    const img = this.faces(s.p.avatar, 'neutral');
    if (img) g.drawImage(img, b.x + 6 * dpr, b.y + b.h - lh + 3 * dpr, lh - 6 * dpr, lh - 6 * dpr);
    g.fillStyle = '#fff'; g.textBaseline = 'middle';
    const fs = Math.max(10 * dpr, Math.min(14 * dpr, b.w * 0.06));
    g.font = `600 ${fs}px Fredoka, system-ui, sans-serif`;
    const name = (me ? 'You' : s.p.name) + (s.p.human ? '' : ' · Bubble companion');
    g.fillText(fit(g, name, b.w - lh - 14 * dpr), b.x + lh + 4 * dpr, b.y + b.h - lh * 0.66);
    g.font = `${fs * 0.85}px 'Special Elite', monospace`; g.fillStyle = '#ffd27a';
    g.fillText(CAM_INFO[s.cam].label, b.x + lh + 4 * dpr, b.y + b.h - lh * 0.28);
    if (k < 5.0) { g.fillStyle = '#ff4d5e'; g.beginPath(); g.arc(b.x + b.w - 12 * dpr, b.y + 12 * dpr, 4 * dpr, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  private cracks(g: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, s: Seat, u: number, dpr: number) {
    if (u <= 0) return;
    const ix = b.x + s.impact![0] * b.w, iy = b.y + s.impact![1] * b.h;
    if (!s.cracks) {
      const r = mulberry(hashS(s.p.pid) + 7); s.cracks = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + r() * 0.5, line: [number, number][] = [[0, 0]];
        let x = 0, y = 0; const steps = 6;
        for (let j = 1; j <= steps; j++) { const d = (j / steps) * Math.max(b.w, b.h) * 0.75; x = Math.cos(a + (r() - 0.5) * 0.5) * d; y = Math.sin(a + (r() - 0.5) * 0.5) * d; line.push([x, y]); }
        s.cracks.push(line);
      }
    }
    g.save(); g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.4 * dpr; g.shadowColor = 'rgba(255,255,255,0.8)'; g.shadowBlur = 4 * dpr;
    for (const line of s.cracks) {
      const n = Math.max(1, Math.round(line.length * u));
      g.beginPath(); for (let j = 0; j < n; j++) { const p = line[j]; if (j) g.lineTo(ix + p[0], iy + p[1]); else g.moveTo(ix + p[0], iy + p[1]); } g.stroke();
    }
    g.beginPath(); g.arc(ix, iy, 10 * dpr * u, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  private stamp(g: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, s: Seat, u: number, dpr: number) {
    if (!s.seal) return;
    const sus = SUSPECTS.find(x => x.id === s.seal.suspect);
    const r = Math.min(b.w, b.h) * 0.2;
    const cx = b.x + b.w / 2, cy = b.y + b.h * 0.42;
    const sc = lerp(1.8, 1, ease.back(u));
    g.save(); g.translate(cx, cy); g.scale(sc, sc); g.rotate(-0.08); g.globalAlpha = clamp(u * 2, 0, 1);
    g.fillStyle = 'rgba(178,18,28,0.92)'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,220,220,0.8)'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(0, 0, r * 0.88, 0, Math.PI * 2); g.stroke();
    const face = SUSPECT_FACE[s.seal.suspect as Suspect];
    const icon = face ? this.faces(face[0], face[1]) : suspectIcon(s.seal.suspect, 128);
    if (icon) { g.save(); g.beginPath(); g.arc(0, -r * 0.12, r * 0.55, 0, Math.PI * 2); g.fillStyle = '#fbf7ef'; g.fill(); g.clip(); g.drawImage(icon as CanvasImageSource, -r * 0.55, -r * 0.67, r * 1.1, r * 1.1); g.restore(); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${Math.max(9 * dpr, r * 0.2)}px 'Special Elite', monospace`;
    g.fillText(((sus ? sus.label : '?') + ' · ' + (SURE[s.seal.sure] || '')).toUpperCase(), 0, r * 0.66);
    g.restore();
  }
  private paths(g: CanvasRenderingContext2D, tt: number, dpr: number, k: number) {
    const show = clamp((k - 9.0) / 0.6, 0, 1);
    if (show <= 0) return;
    this.seats.forEach((s) => {
      if (!s.seal || !Array.isArray(s.seal.path) || s.seal.path.length < 6) return;
      const pts: { x: number; y: number; t: number }[] = [];
      for (let i = 0; i + 2 < s.seal.path.length; i += 3) { const [x, z] = uvToWorld(s.seal.path[i + 1], s.seal.path[i + 2]); const q = projectLast(x, 0.02, z); if (q) pts.push({ x: q.x, y: q.y, t: s.seal.path[i] }); }
      if (pts.length < 2) return;
      g.save();
      g.globalAlpha = 0.55 * show; g.strokeStyle = s.color; g.lineWidth = 2.2 * dpr; g.lineJoin = 'round';
      if (!s.p.human) g.setLineDash([6 * dpr, 6 * dpr]);
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
      g.setLineDash([]);
      // where this light was looking at this moment of the incident
      g.globalAlpha = show;
      for (const p of pts) { const near = Math.abs(p.t - tt); if (near < 0.45) { const a = 1 - near / 0.45; g.fillStyle = s.color; g.shadowColor = s.color; g.shadowBlur = 12 * dpr; g.beginPath(); g.arc(p.x, p.y, (4 + 6 * a) * dpr, 0, Math.PI * 2); g.fill(); } }
      g.restore();
    });
  }
  private caption(g: CanvasRenderingContext2D, text: string, W: number, H: number, dpr: number, a: number, at: number) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    const fs = Math.max(15 * dpr, Math.min(28 * dpr, W * 0.045));
    g.font = `${fs}px 'Special Elite', monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = wrap(g, text, W * 0.86);
    const y0 = H * at - (lines.length - 1) * fs * 0.6;
    lines.forEach((ln, i) => { const y = y0 + i * fs * 1.2; const tw = g.measureText(ln).width; g.fillStyle = 'rgba(7,6,15,0.65)'; g.fillRect(W / 2 - tw / 2 - 12 * dpr, y - fs * 0.7, tw + 24 * dpr, fs * 1.4); g.fillStyle = '#fff6e6'; g.fillText(ln, W / 2, y); });
    g.restore();
  }

  private showRevealOverlay() {
    this.overlayShown = 'reveal';
    const ctx = this.ctx, v = this.view!;
    clear(this.over);
    this.over.style.justifyContent = 'flex-end';
    const line = h('div', { class: 'gtg-line' }, 'Everyone saw a true piece. Nobody had the whole picture.');
    const rows = h('div', { class: 'gtg-verdicts' });
    for (const s of this.seats) {
      if (!s.seal) continue;
      const sus = SUSPECTS.find(x => x.id === s.seal.suspect);
      const face = SUSPECT_FACE[s.seal.suspect as Suspect];
      const ic = face ? h('img', { alt: '', src: ctx.faces.url(face[0] as any, face[1]), style: { width: '30px', height: '30px', borderRadius: '50%', background: '#fbf7ef' } }) : suspectIcon(s.seal.suspect, 60);
      const clues = (s.seal.pins || []).map((id: string) => { const hs = HOTSPOTS.find(x => x.id === id); return hs ? hs.label : id; }).join(' → ');
      rows.appendChild(h('div', { class: 'gtg-vrow', style: { borderColor: s.color } },
        h('img', { alt: '', src: ctx.faces.url(s.p.avatar, 'think') }),
        h('div', { class: 'who' }, h('b', null, s.p.pid === v.you ? 'You' : s.p.name), h('small', null, (s.p.human ? '' : 'Bubble companion · ') + CAM_INFO[s.cam].short + ' cam')),
        h('div', { class: 'vd' }, ic, h('span', null, (sus ? sus.label : '?') + ' · ' + (SURE[s.seal.sure] || '').toLowerCase())),
        h('div', { class: 'clue' }, clues)));
    }
    const tags = h('div', { class: 'gtg-tags', role: 'group', 'aria-label': 'What surprised you?' });
    TAGS.forEach(t => tags.appendChild(h('button', { class: 'gtg-tag', 'data-tag': t.tag, onclick: (e: Event) => { ctx.sfx.gesture(e); ctx.sfx.pop(660); (e.currentTarget as HTMLElement).classList.add('on'); ctx.room.act('live', { kind: 'surprise', tag: t.tag }); } }, t.label)));
    const actions = h('div', { class: 'gtg-actions' });
    this.over.appendChild(line);
    this.over.appendChild(rows);
    this.over.appendChild(h('div', { class: 'gtg-note' }, 'What surprised you? Everyone sees your tap.'));
    this.over.appendChild(tags);
    this.over.appendChild(actions);
    this.refreshOverlay();
    // companions react too, by their own rules, labelled
    this.seats.filter(s => !s.p.human).forEach((s, i) => setTimeout(() => { if (this.overlayShown === 'reveal') { const tg = TAGS.find(x => x.tag === COMPANION_TAG[s.p.avatar]); if (tg) this.float(s.p.name + ' (Bubble companion): ' + tg.label); } }, 1600 + i * 1300));
  }
  private refreshOverlay() {
    const actions = this.over.querySelector('.gtg-actions') as HTMLElement;
    if (!actions) return;
    clear(actions);
    const ctx = this.ctx;
    if (this.overlayShown === 'reveal') {
      actions.appendChild(h('button', { class: 'gtg-btn ghost', onclick: () => { this.t0 = performance.now(); this.skipTo = 0; this.overlayShown = ''; this.sounds.clear(); clear(this.over); this.seats.forEach(s => { s.tile = undefined; s.shards = undefined; }); } }, 'Watch again'));
      if (ctx.room.isHost) actions.appendChild(h('button', { class: 'gtg-btn', onclick: (e: Event) => { ctx.sfx.gesture(e); ctx.room.act('finale'); } }, 'Finale →'));
      else actions.appendChild(h('div', { class: 'gtg-note' }, 'The host starts the finale.'));
    } else if (this.overlayShown === 'finale') {
      const v = this.view!;
      const me = v.players.find(p => p.pid === v.you);
      if (me && me.human) {
        const box = h('input', { type: 'checkbox' }) as HTMLInputElement;
        box.checked = !!v.consent[me.pid];
        box.addEventListener('change', () => ctx.room.act('consent', { share: box.checked }));
        actions.appendChild(h('label', { class: 'gtg-consent' }, box, 'Show my name on the card'));
      }
      actions.appendChild(h('button', { class: 'gtg-btn ghost', onclick: () => this.saveCard() }, 'Save card'));
      if (ctx.room.isHost) actions.appendChild(h('button', { class: 'gtg-btn', onclick: () => ctx.next('replay') }, 'Play again'));
      actions.appendChild(h('button', { class: 'gtg-btn ghost', onclick: () => ctx.next('hub') }, 'Rituals'));
      this.drawCard();
    }
  }
  private float(text: string) {
    const el = h('div', { class: 'gtg-float', style: { left: (50 + (Math.random() - 0.5) * 16) + '%' } }, h('span', null, text));
    this.wrap.appendChild(el);
    setTimeout(() => el.remove(), 3300);
  }

  /* ------------------------------------------------ finale ------------------------------------------------ */
  private posePositions(): { slug: string; mood: string; pos: V3; hgt?: number }[] {
    const n = this.seats.length;
    const out: { slug: string; mood: string; pos: V3; hgt?: number }[] = this.seats.map((s, i) => ({ slug: s.p.avatar, mood: ['celebrate', 'laugh', 'happy', 'wink'][i % 4], pos: [lerp(-1.25, 1.05, n === 1 ? 0.5 : i / (n - 1)), 0, 1.25 - Math.abs(i - (n - 1) / 2) * 0.12] as V3 }));
    out.push({ slug: 'cat', mood: '', pos: [-0.35, 0.76, 2.05], hgt: 0.42 });
    return out;
  }
  private drawFinale(k: number) {
    const sf = this.sf, g = sf.g, W = sf.pw, H = sf.ph, dpr = sf.dpr, sfx = this.ctx.sfx;
    const hero = lookAt([2.6, 1.7, -1.6], [-0.3, 0.7, 2.0], 0.85);
    if (k < 2.6) {
      // rewind: the splat flows back up onto the table
      const tt = lerp(7.0, 4.12, ease.inOut(clamp(k / 2.4, 0, 1)));
      const st = stateAt(tt);
      renderWorld(g, W, H, hero, st, { look: 'hero', faces: this.faces });
      lens(g, W, H, 'hero', st, false);
      vhs(g, W, H, dpr, k);
      this.once('rw', () => sfx.rewind(2.4));
    } else {
      const st = stateAt(4.12);
      const dolly = lookAt([lerp(2.6, 2.1, clamp((k - 2.6) / 3, 0, 1)), lerp(1.7, 1.5, clamp((k - 2.6) / 3, 0, 1)), lerp(-1.6, -0.9, clamp((k - 2.6) / 3, 0, 1))], [-0.2, 0.62, 1.8], 0.85);
      renderWorld(g, W, H, dolly, { ...st, rush: [-9, 0, -9] as V3, patch: [-9, 0, -9] as V3, syncPos: [-9, 0, -9] as V3, loopiePos: [-9, 0, -9] as V3, glitchPos: [-9, 0, -9] as V3, cat: [-9, 0, -9] as V3, pawK: 0 }, { look: 'hero', faces: this.faces });
      const pose = this.posePositions();
      drawPose(g, pose.map((p, i) => ({ ...p, bob: p.slug === 'cat' ? 0 : Math.abs(Math.sin(k * 3 + i)) * 0.04 })), this.faces);
      lens(g, W, H, 'hero', st, false);
      if (k < 3.4) this.caption(g, 'Before anyone decided anything.', W, H, dpr, clamp((k - 2.6) / 0.3, 0, 1), 0.88);
      // countdown, then four cameras flash from four sides
      if (k >= 3.6 && k < 5.0) { const n = 3 - Math.floor((k - 3.6) / 0.45); if (n >= 1) { this.once('cd' + n, () => sfx.tone(660 + (3 - n) * 110, 0.12, { vol: 0.12 })); this.caption(g, String(n), W, H, dpr, 1, 0.45); } }
      const flashes: [number, string, number, number][] = [[5.0, 'rgba(255,190,140,1)', 0.15, 0.3], [5.25, 'rgba(140,190,255,1)', 0.85, 0.15], [5.5, 'rgba(255,255,255,1)', 0.9, 0.75], [5.75, 'rgba(255,140,220,1)', 0.1, 0.8]];
      flashes.forEach(([at, col, fx, fy], i) => {
        const u = k - at;
        if (u >= 0) this.once('fl' + i, () => sfx.flash());
        if (u >= 0 && u < 0.5) { const a = 1 - u / 0.5; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const R = Math.max(W, H) * 0.9; g.drawImage(glow(col), fx * W - R / 2, fy * H - R / 2, R, R); g.fillStyle = `rgba(255,255,255,${0.35 * a})`; g.fillRect(0, 0, W, H); g.restore(); }
      });
      if (k >= 6.2) {
        if (!this.photos.length) this.takePhotos();
        this.once('dev', () => { sfx.shutter(); sfx.develop(); });
        g.fillStyle = `rgba(7,6,15,${0.55 * clamp((k - 6.2) / 0.5, 0, 1)})`; g.fillRect(0, 0, W, H);
        this.polaroids(g, W, H, dpr, k - 6.2);
      }
      if (k > 9.2 && this.overlayShown !== 'finale') this.showFinaleOverlay();
      if (k > 9.2) { g.fillStyle = `rgba(7,6,15,${0.75 * clamp((k - 9.2) / 0.5, 0, 1)})`; g.fillRect(0, 0, W, H); }
    }
  }
  private takePhotos() {
    const cams: CamId[] = ['door', 'balcony', 'phone', 'booth'];
    const used = Array.from(new Set(this.seats.map(s => s.cam)));
    const list = cams.filter(c => used.includes(c)).concat(cams.filter(c => !used.includes(c))).slice(0, 4);
    const st = stateAt(4.12);
    const hidden = { ...st, rush: [-9, 0, -9] as V3, patch: [-9, 0, -9] as V3, syncPos: [-9, 0, -9] as V3, loopiePos: [-9, 0, -9] as V3, glitchPos: [-9, 0, -9] as V3, cat: [-9, 0, -9] as V3, pawK: 0 };
    const pose = this.posePositions();
    const aim: Record<CamId, [V3, V3, number]> = { door: [[-1.4, 0.95, -0.7], [-0.1, 0.62, 1.6], 0.8], balcony: [[1.0, 4.2, 4.2], [-0.1, 0.4, 1.7], 0.62], phone: [[1.95, 1.05, 0.5], [-0.2, 0.55, 1.6], 0.8], booth: [[0.4, 1.6, 4.6], [-0.1, 0.6, 1.6], 0.75] };
    this.photos = list.map(cam => {
      const c = document.createElement('canvas'); c.width = c.height = 360;
      const g = c.getContext('2d')!;
      const [from, to, fov] = aim[cam];
      const cm = lookAt(from, to, fov);
      renderWorld(g, 360, 360, cm, hidden, { look: 'hero', faces: this.faces });
      drawPose(g, pose, this.faces);
      lens(g, 360, 360, cam, st, false);
      return { cam, c };
    });
  }
  private polaroids(g: CanvasRenderingContext2D, W: number, H: number, dpr: number, u: number) {
    const n = this.photos.length;
    const land = W / H > 1.1;
    const cols = land ? n : 2, rows = Math.ceil(n / cols);
    const size = Math.min((W * 0.86) / cols, (H * (land ? 0.5 : 0.56)) / rows / 1.18);
    const gap = size * 0.08;
    const totalW = cols * size + (cols - 1) * gap, totalH = rows * size * 1.18 + (rows - 1) * gap;
    const x0 = (W - totalW) / 2, y0 = H * (land ? 0.1 : 0.08) + ((H * (land ? 0.55 : 0.6)) - totalH) / 2;
    this.photos.forEach((p, i) => {
      const a = clamp((u - i * 0.18) / 0.5, 0, 1);
      if (a <= 0) return;
      const c = i % cols, r = Math.floor(i / cols);
      const x = x0 + c * (size + gap), y = y0 + r * (size * 1.18 + gap) - (1 - ease.out(a)) * H * 0.4;
      const rot = [-0.05, 0.04, -0.03, 0.06][i];
      g.save(); g.translate(x + size / 2, y + size * 0.59); g.rotate(rot); g.translate(-size / 2, -size * 0.59);
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 16 * dpr; g.fillStyle = '#fbf7ef'; g.fillRect(0, 0, size, size * 1.18); g.shadowBlur = 0;
      const pad = size * 0.06;
      g.drawImage(p.c, pad, pad, size - pad * 2, size - pad * 2);
      const dev = clamp((u - i * 0.18 - 0.3) / 1.6, 0, 1);
      g.fillStyle = `rgba(40,30,20,${0.92 * (1 - dev)})`; g.fillRect(pad, pad, size - pad * 2, size - pad * 2);
      g.fillStyle = '#2b2540'; g.font = `700 ${Math.max(12 * dpr, size * 0.075)}px Caveat, cursive`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const seat = this.seats.find(s => s.cam === p.cam);
      const sus = seat && seat.seal ? SUSPECTS.find(x => x.id === seat.seal.suspect) : null;
      g.globalAlpha = dev;
      g.fillText(CAM_INFO[p.cam].short + ' cam' + (sus ? ' · ' + sus.label.toLowerCase() : ''), size / 2, size * 1.09);
      g.restore();
    });
  }
  private showFinaleOverlay() {
    this.overlayShown = 'finale';
    clear(this.over);
    this.over.style.justifyContent = 'flex-end';
    this.over.appendChild(h('div', { class: 'gtg-card' }, h('canvas', { width: '1080', height: '1350' })));
    this.over.appendChild(h('div', { class: 'gtg-note' }, 'Cameras and verdicts only. Names appear only if everyone ticks the box.'));
    this.over.appendChild(h('div', { class: 'gtg-actions' }));
    this.ctx.sfx.chime();
    this.refreshOverlay();
  }
  private drawCard() {
    const c = this.over.querySelector('.gtg-card canvas') as HTMLCanvasElement;
    if (!c) return;
    const card = c.parentElement as HTMLElement;
    card.style.maxHeight = '52vh'; c.style.maxHeight = '52vh'; c.style.width = 'auto'; c.style.margin = '0 auto';
    const g = c.getContext('2d')!, W = 1080, H = 1350;
    const v = this.view!;
    const humans = this.seats.filter(s => s.p.human);
    const names = humans.length > 0 && humans.every(s => v.consent[s.p.pid]);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#241d4a'); bg.addColorStop(0.6, '#5a2e5e'); bg.addColorStop(1, '#f08a6c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff6e6'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = "64px 'Special Elite', monospace"; g.fillText('GROUP THINK GLITCH', W / 2, 120);
    g.font = "40px 'Special Elite', monospace"; g.fillStyle = '#ffd27a';
    g.fillText(`${this.seats.length} cameras · ${this.stories} ${this.stories === 1 ? 'story' : 'stories'} · 1 cake`, W / 2, 185);
    const size = 440, gap = 40, x0 = (W - size * 2 - gap) / 2, y0 = 232, ph = size * 1.2;
    this.photos.slice(0, 4).forEach((p, i) => {
      const x = x0 + (i % 2) * (size + gap), y = y0 + Math.floor(i / 2) * (ph + gap);
      g.save(); g.translate(x + size / 2, y + ph / 2); g.rotate([-0.03, 0.025, -0.02, 0.03][i]); g.translate(-size / 2, -ph / 2);
      g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24; g.fillStyle = '#fbf7ef'; g.fillRect(0, 0, size, ph); g.shadowBlur = 0;
      g.drawImage(p.c, 22, 22, size - 44, size - 44);
      const seat = this.seats.find(s => s.cam === p.cam);
      g.fillStyle = '#2b2540'; g.font = "700 42px Caveat, cursive"; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(CAM_INFO[p.cam].short + ' cam', 26, size + 6);
      if (seat && seat.seal) {
        const face = SUSPECT_FACE[seat.seal.suspect as Suspect];
        const ic = face ? this.faces(face[0], face[1]) : suspectIcon(seat.seal.suspect, 128);
        if (ic) { g.save(); g.beginPath(); g.arc(size - 52, size + 18, 32, 0, Math.PI * 2); g.fillStyle = '#efe6d6'; g.fill(); g.clip(); g.drawImage(ic as CanvasImageSource, size - 84, size - 14, 64, 64); g.restore(); }
        const who = seat.p.human ? (names ? seat.p.name : '') : seat.p.name + ' · Bubble companion';
        if (who) { g.font = "30px Caveat, cursive"; g.fillStyle = '#5a5070'; g.fillText(who.slice(0, 30), 26, size + 46); }
      }
      g.restore();
    });
    g.fillStyle = 'rgba(255,246,230,0.9)'; g.font = "34px 'Special Elite', monospace"; g.textAlign = 'center';
    g.fillText('Everyone saw a true piece.', W / 2, H - 92);
    g.font = "26px Fredoka, system-ui, sans-serif"; g.fillStyle = 'rgba(255,246,230,0.75)';
    g.fillText('ThinkStill Reflect', W / 2, H - 44);
  }
  private saveCard() {
    const c = this.over.querySelector('.gtg-card canvas') as HTMLCanvasElement;
    if (!c) return;
    c.toBlob((b) => { if (b) this.ctx.download('group-think-glitch.png', b).then(ok => { if (!ok) this.ctx.toast('Saving isn’t available here'); }); }, 'image/png');
  }
}

/* ---------- helpers ---------- */
function makeShards(b: { x: number; y: number; w: number; h: number }, imp: [number, number]): Shard[] {
  const ix = b.x + imp[0] * b.w, iy = b.y + imp[1] * b.h;
  const ring: [number, number][] = [[b.x, b.y], [b.x + b.w / 2, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h / 2], [b.x + b.w, b.y + b.h], [b.x + b.w / 2, b.y + b.h], [b.x, b.y + b.h], [b.x, b.y + b.h / 2]];
  return ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length];
    const cx = (ix + p[0] + q[0]) / 3, cy = (iy + p[1] + q[1]) / 3;
    const dx = cx - ix, dy = cy - iy, d = Math.hypot(dx, dy) || 1;
    return { pts: [[ix, iy], p, q], vx: dx / d * (0.4 + (i % 3) * 0.2), vy: dy / d * 0.3, va: (i % 2 ? 1 : -1) * (0.6 + (i % 4) * 0.25), cx, cy };
  });
}
function vhs(g: CanvasRenderingContext2D, W: number, H: number, dpr: number, k: number) {
  g.save();
  for (let y = 0; y < H; y += 3 * dpr) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y, W, dpr); }
  const band = ((k * 0.9) % 1) * H;
  g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, band, W, 18 * dpr);
  g.globalCompositeOperation = 'source-over';
  const fs = Math.max(18 * dpr, W * 0.05);
  g.font = `${fs}px 'Special Elite', monospace`; g.fillStyle = '#fff'; g.textBaseline = 'top';
  g.fillText('◀◀ REWIND', 18 * dpr, 16 * dpr);
  const t = Math.max(0, 7 - k * 1.2);
  g.textAlign = 'right'; g.fillText('00:00:0' + Math.floor(t) + ':' + String(Math.floor((t % 1) * 24)).padStart(2, '0'), W - 18 * dpr, 16 * dpr);
  g.restore();
}
const glowCache = new Map<string, HTMLCanvasElement>();
function glow(col: string) {
  let c = glowCache.get(col); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); glowCache.set(col, c); return c;
}
function fit(g: CanvasRenderingContext2D, s: string, w: number) { if (g.measureText(s).width <= w) return s; while (s.length > 2 && g.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
function wrap(g: CanvasRenderingContext2D, text: string, w: number): string[] {
  const words = text.split(' '), out: string[] = []; let cur = '';
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > w && cur) { out.push(cur); cur = wd; } else cur = t; }
  if (cur) out.push(cur); return out;
}
function hashS(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export { RIGS, hotspotAnchor, closeup };
export type { Look };
