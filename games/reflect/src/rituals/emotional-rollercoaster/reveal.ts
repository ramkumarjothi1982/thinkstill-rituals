/* Emotional Rollercoaster — riding together, the station, and the finale, on the room's clock.
 *   The ride: everyone launches at the reveal moment; you ride your own track from behind your cart while the other
 *   carts rise and fall on the tracks beside you. At two junctions you can pull the switch and ride a friend's track
 *   for the next moment — everyone sees you jump.
 *   The station: every track overlaid in side view; the moments where you diverged pulse; tap one to read it.
 *   The finale: every track merges into one loop, the carts couple and go round together under fireworks, and the
 *   on-ride photo prints with each rider's face at their biggest drop (names only with consent). */
import type { RoomView, Player } from '../../room/protocol';
import type { SceneCtx } from '../../console/types';
import { h, clear, Surface, clamp, lerp } from '../../ui/dom';
import { Projector, DrawList } from '../../gfx/projector';
import { JUNCTIONS, MODS, Moment, N_SEG, RIDE_LEN, SATURDAY, SWITCH_WINDOW, Seg, divergenceLine, junctionTime } from './content';
import { buildTrack, Track } from './track';
import { renderRide, Rider, RIDER_COLORS, segAt, momentIcon, skyGround, drawTrack, cartSprite, fireworks, cartAt } from './ride';
import { renderOverlay, mapFor, segOfX } from './editor';

export class RideDirector {
  private sf = new Surface();
  private wrap: HTMLElement;
  private over: HTMLElement;
  private raf = 0;
  private view: RoomView | null = null;
  private riders: Rider[] = [];
  private seen = 0;
  private phase: 'reveal' | 'finale' = 'reveal';
  private finaleAt = 0;
  private overlay = '';
  private lastSeg = -3;
  private once = new Set<string>();
  private picked = -1;
  private local0 = performance.now();
  private faces: (s: string, m: string) => CanvasImageSource | null;
  private P = new Projector();
  private L = new DrawList();
  private loopTrack: Track | null = null;
  constructor(private ctx: SceneCtx, parent: HTMLElement) {
    this.faces = (s, m) => ctx.faces.get(s, m);
    this.sf.maxDpr = 1.5;
    this.over = h('div', { class: 'er-over' });
    this.wrap = h('div', { class: 'er-stage' }, this.sf.canvas, this.over);
    parent.appendChild(this.wrap);
    this.sf.canvas.addEventListener('pointerdown', (e) => this.tapStation(e));
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }
  destroy() { cancelAnimationFrame(this.raf); this.wrap.remove(); this.ctx.sfx.duck(0.5); }
  resize() { this.sf.fit(); }
  private get moments(): Moment[] { return (this.view && this.view.pub && this.view.pub.moments) || SATURDAY; }
  private elapsed() { const at = this.view && this.view.pub && this.view.pub.revealAt; return at ? (this.ctx.room.serverNow() - at) / 1000 : (performance.now() - this.local0) / 1000; }
  private doOnce(k: string, f: () => void) { if (!this.once.has(k)) { this.once.add(k); f(); } }
  private get meIdx() { const v = this.view; if (!v) return 0; const i = this.riders.findIndex(r => r.pid === v.you); return i >= 0 ? i : Math.max(0, this.riders.findIndex(r => r.pid === v.hostPid)); }

  update(v: RoomView, _prev: RoomView | null) {
    this.view = v;
    if (!this.riders.length && v.revealed) {
      const order: string[] = (v.pub && v.pub.riders) || Object.keys(v.revealed);
      this.riders = order.filter(pid => v.revealed![pid]).map((pid, i) => { const p = v.players.find(x => x.pid === pid)!; return { pid, avatar: p ? p.avatar : 'loopie', name: p ? p.name : 'Rider', human: p ? p.human : false, track: buildTrack(v.revealed![pid].segs as Seg[]), color: RIDER_COLORS[i % RIDER_COLORS.length] }; });
      this.ctx.sfx.duck(0.12);
      this.seen = v.live.length ? v.live[v.live.length - 1].n : 0;
    }
    if (v.phase === 'finale' && this.phase !== 'finale') { this.phase = 'finale'; this.finaleAt = performance.now(); this.overlay = ''; clear(this.over); }
    for (const ev of v.live) {
      if (ev.n <= this.seen) continue;
      this.seen = ev.n;
      if (ev.data && ev.data.kind === 'switch') {
        const who = v.players.find(p => p.pid === ev.pid), to = v.players.find(p => p.pid === ev.data.to);
        if (who && to) this.banner((ev.pid === v.you ? 'You' : who.name) + ' jumped onto ' + (ev.data.to === v.you ? 'your' : to.name + '’s') + ' track!');
        this.ctx.sfx.whoosh(true, 0.5);
        if (this.overlay === 'switch') { this.overlay = ''; }
      }
    }
    if (this.overlay === 'station') this.stationActions();
    if (this.overlay === 'photo') this.photoActions();
  }
  /** Whose track a rider rides for a given segment: their own, unless they switched at the junction before it. */
  private assign = (pid: string, seg: number): string => {
    const v = this.view; if (!v) return pid;
    const j = JUNCTIONS.find(x => x.seg === seg); if (!j) return pid;
    const ev = v.live.find(e => e.pid === pid && e.data && e.data.kind === 'switch' && e.data.j === j.j);
    return ev ? ev.data.to : pid;
  };
  private banner(text: string) { const el = h('div', { class: 'er-banner' }, text); this.wrap.appendChild(el); setTimeout(() => el.remove(), 2700); }

  private frame(now: number) {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    this.sf.fit();
    const g = this.sf.g, W = this.sf.pw, H = this.sf.ph;
    if (!this.riders.length || W < 4) return;
    if (this.phase === 'finale') this.drawFinale(g, W, H, (now - this.finaleAt) / 1000);
    else {
      const e = this.elapsed();
      if (e < RIDE_LEN + 1.2) this.drawRide(g, W, H, Math.max(0, e));
      else this.drawStation(g, W, H, e);
    }
    this.ctx.metrics.frame(now);
  }

  /* ---------------- the ride ---------------- */
  private drawRide(g: CanvasRenderingContext2D, W: number, H: number, e: number) {
    const t = Math.min(e + 1.2, RIDE_LEN);
    const info = renderRide(g, W, H, { riders: this.riders, me: this.meIdx, t, assign: this.assign, faces: this.faces, moments: this.moments });
    const sfx = this.ctx.sfx;
    if (t < 3.6) { const k = Math.floor(t * 5); this.doOnce('ck' + k, () => sfx.tick(0.5)); }
    if (info.seg !== this.lastSeg) {
      this.lastSeg = info.seg;
      if (info.seg >= 0 && info.seg < N_SEG) { const m = this.moments[info.seg]; this.banner(m.time + ' · ' + m.text); sfx.chime([392 + info.seg * 44]); }
      if (info.seg === -1 && t > 3.8) this.doOnce('drop0', () => sfx.whoosh(false, 1.6));
    }
    if (info.speed > 18) this.doOnce('w' + Math.floor(t * 1.5), () => sfx.whoosh(false, 0.6));
    if (info.inverted) this.doOnce('fw' + Math.floor(t * 2), () => sfx.pop(900 + Math.random() * 500));
    // the switch lever before each junction
    const v = this.view!;
    const meRider = this.riders[this.meIdx];
    const amRider = !!this.riders.find(r => r.pid === v.you);
    let want = '';
    for (const j of JUNCTIONS) {
      const tj = junctionTime(j.j);
      if (amRider && t >= tj - SWITCH_WINDOW && t < tj - 0.3 && !v.live.some(x => x.pid === v.you && x.data && x.data.kind === 'switch' && x.data.j === j.j)) want = 'switch' + j.j;
    }
    if (want && this.overlay !== want) {
      this.overlay = want; clear(this.over);
      const j = Number(want.slice(6));
      const box = h('div', { class: 'er-switch' }, h('b', null, 'Switch tracks for “' + this.moments[JUNCTIONS[j].seg].short + '”?'));
      const row = h('div', { class: 'row' });
      this.riders.filter(r => r.pid !== meRider.pid).forEach(r => row.appendChild(h('button', { onclick: (ev: Event) => { this.ctx.sfx.gesture(ev); this.ctx.metrics.mark(ev); this.ctx.room.act('live', { kind: 'switch', j, to: r.pid }); this.overlay = ''; clear(this.over); } }, h('img', { alt: '', src: this.ctx.faces.url(r.avatar as any, 'wink') }), 'Ride ' + (r.human ? r.name + '’s' : r.name + '’s (companion)'))));
      box.appendChild(row);
      this.over.appendChild(box);
      this.ctx.sfx.tone(660, 0.12, { vol: 0.08 });
    } else if (!want && this.overlay.startsWith('switch')) { this.overlay = ''; clear(this.over); }
    if (e > RIDE_LEN) { g.fillStyle = `rgba(7,6,26,${clamp((e - RIDE_LEN) / 1.2, 0, 1)})`; g.fillRect(0, 0, W, H); }
  }

  /* ---------------- the station ---------------- */
  private divergence(): number[] {
    return Array.from({ length: N_SEG }, (_, i) => {
      const hs = this.riders.map(r => r.track.segs[i].h), mods = new Set(this.riders.map(r => r.track.segs[i].mod));
      const spread = Math.max(...hs) - Math.min(...hs);
      return clamp(spread / 1.2 + (mods.size - 1) * 0.25, 0, 1);
    });
  }
  private drawStation(g: CanvasRenderingContext2D, W: number, H: number, e: number) {
    const pulse = this.divergence().map((p, i) => (p > 0.45 || i === this.picked ? p : 0));
    renderOverlay(g, W, H, this.riders.map(r => ({ tr: r.track, color: r.color, face: this.faces(r.avatar, 'happy') })), this.moments, pulse, e);
    if (this.picked >= 0) { const m = mapFor(W, H, 0.16, 0.12); const a = ((8 + this.picked * 34) - m.x0) / (m.x1 - m.x0) * W, b = ((8 + (this.picked + 1) * 34) - m.x0) / (m.x1 - m.x0) * W; g.fillStyle = 'rgba(255,214,140,0.14)'; g.fillRect(a, 0, b - a, H); }
    this.doOnce('station', () => { this.ctx.sfx.chime([523.25, 659.25, 783.99, 1046.5]); const d = this.divergence(); this.picked = d.indexOf(Math.max(...d)); });
    if (this.overlay !== 'station') { this.overlay = 'station'; this.stationOverlay(); }
  }
  private tapStation(e: PointerEvent) {
    if (this.overlay !== 'station') return;
    const r = this.sf.canvas.getBoundingClientRect();
    const m = mapFor(r.width, r.height, 0.16, 0.12);
    this.picked = segOfX(m, e.clientX - r.left);
    this.ctx.sfx.pop(500 + this.picked * 60);
    this.stationOverlay();
  }
  private stationOverlay() {
    clear(this.over);
    const v = this.view!;
    const i = Math.max(0, this.picked);
    const m = this.moments[i];
    const line = divergenceLine(m, this.riders.map(r => ({ name: r.pid === v.you ? 'you' : r.name + (r.human ? '' : ' (companion)'), seg: r.track.segs[i] })));
    this.over.appendChild(h('div', { class: 'er-line' }, 'Same day. Different drops.'));
    this.over.appendChild(h('div', { class: 'er-div' }, h('b', null, m.time + ' · ' + m.text), line));
    // peak and end: what each rider will remember vs the whole ride
    const peaks = this.riders.map(r => { let lo = 0; r.track.segs.forEach((s, k) => { if (s.h < r.track.segs[lo].h) lo = k; }); return (r.pid === v.you ? 'Your' : r.name + '’s') + ' biggest drop: ' + this.moments[lo].short.toLowerCase(); });
    this.over.appendChild(h('div', { class: 'er-note' }, peaks.join(' · ') + '. We remember the biggest drop and the ending — tap any moment to see the whole ride.'));
    this.over.appendChild(h('div', { class: 'er-acts' }));
    this.stationActions();
  }
  private stationActions() {
    const a = this.over.querySelector('.er-acts') as HTMLElement; if (!a) return;
    clear(a);
    if (this.ctx.room.isHost) a.appendChild(h('button', { class: 'er-btn', style: { padding: '0 22px' }, onclick: (e: Event) => { this.ctx.sfx.gesture(e); this.ctx.room.act('finale'); } }, 'Ride together →'));
    else a.appendChild(h('div', { class: 'er-note' }, 'The host starts the last ride.'));
  }

  /* ---------------- the finale: one shared loop ---------------- */
  private drawFinale(g: CanvasRenderingContext2D, W: number, H: number, k: number) {
    if (!this.loopTrack) {
      const S: any[] = []; const R = 12, cy = 14; let s = 0;
      for (let i = 0; i <= 160; i++) { const a = -Math.PI / 2 + (i / 160) * Math.PI * 2; const x = Math.cos(a) * R, y = cy + Math.sin(a) * R; if (i) s += (Math.PI * 2 * R) / 160; S.push({ x, y, ang: a + Math.PI / 2, roll: 0, tunnel: false, seg: 0, s, t: 0 }); }
      this.loopTrack = { samples: S, len: s, segs: [] };
    }
    const P = this.P, L = this.L;
    const orbit = 0.5 + k * 0.16;
    const dist = 30 - Math.min(6, k * 0.8);
    const cam = { x: Math.sin(orbit) * dist, y: 13 + Math.sin(k * 0.4) * 2, z: Math.cos(orbit) * dist, yaw: 0, pitch: 0, roll: 0, fov: 1.0 };
    const dx = -cam.x, dy = 14 - cam.y, dz = -cam.z;
    cam.yaw = Math.atan2(dx, dz); cam.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    P.set(cam, W, H);
    skyGround(g, P, W, H, 1);
    // the riders' own tracks, fading into the one loop
    const n = this.riders.length;
    drawTrack(P, L, this.loopTrack, 0, '#ffd27a', 0, 1e9, false);
    L.flush(g);
    const th0 = k * 1.6;
    this.riders.forEach((r, i) => {
      const a = -Math.PI / 2 + th0 - i * 0.26, R = 12;
      const x = Math.cos(a) * (R - 0.9), y = 14 + Math.sin(a) * (R - 0.9);
      const q = P.project(x, y, 0); if (!q) return;
      const sz = q.s * 3.2;
      const face = this.faces(r.avatar, Math.sin(a) > 0.5 ? 'wow' : 'celebrate');
      if (face) g.drawImage(face, q.x - sz * 0.36, q.y - sz * 0.78, sz * 0.72, sz * 0.72);
      g.drawImage(cartSprite(r.color), q.x - sz / 2, q.y - sz * 0.42, sz, sz * 0.69);
    });
    fireworks(g, W, H, k);
    if (k > 0.3) this.doOnce('f' + Math.floor(k * 2), () => this.ctx.sfx.pop(700 + Math.random() * 600));
    g.fillStyle = '#ffd27a'; g.textAlign = 'center'; g.textBaseline = 'top'; g.font = `${Math.max(16, W * 0.04)}px Bungee, 'Baloo 2', sans-serif`;
    g.globalAlpha = clamp(k / 0.8, 0, 1) * clamp((8.5 - k) / 0.6, 0, 1);
    g.fillText(n + ' tracks. One loop.', W / 2, H * 0.08); g.globalAlpha = 1;
    if (k > 8.5) {
      g.fillStyle = `rgba(7,6,26,${clamp((k - 8.5) / 0.6, 0, 0.8)})`; g.fillRect(0, 0, W, H);
      if (this.overlay !== 'photo') { this.overlay = 'photo'; this.photoOverlay(); this.ctx.sfx.flash(); setTimeout(() => this.ctx.sfx.shutter(), 320); }
    }
    void lerp; void cartAt;
  }
  private photoOverlay() {
    clear(this.over);
    this.over.appendChild(h('div', { class: 'er-photo' }, h('canvas', { width: '1200', height: '900' })));
    this.over.appendChild(h('div', { class: 'er-note' }, 'Each face is caught at that rider’s biggest drop. Names only if everyone ticks the box.'));
    this.over.appendChild(h('div', { class: 'er-acts' }));
    this.photoActions();
  }
  private photoActions() {
    const a = this.over.querySelector('.er-acts') as HTMLElement; if (!a) return;
    const v = this.view!, ctx = this.ctx;
    clear(a);
    const me = v.players.find(p => p.pid === v.you);
    if (me && me.human) {
      const box = h('input', { type: 'checkbox' }) as HTMLInputElement; box.checked = !!v.consent[me.pid];
      box.addEventListener('change', () => ctx.room.act('consent', { share: box.checked }));
      a.appendChild(h('label', { class: 'er-consent' }, box, 'Show my name on the photo'));
    }
    a.appendChild(h('button', { class: 'er-btn ghost', style: { padding: '0 18px' }, onclick: () => this.savePhoto() }, 'Save photo'));
    if (ctx.room.isHost) a.appendChild(h('button', { class: 'er-btn', style: { padding: '0 18px' }, onclick: () => ctx.next('replay') }, 'Ride again'));
    a.appendChild(h('button', { class: 'er-btn ghost', style: { padding: '0 18px' }, onclick: () => ctx.next('hub') }, 'Rituals'));
    this.drawPhoto();
  }
  private drawPhoto() {
    const c = this.over.querySelector('.er-photo canvas') as HTMLCanvasElement; if (!c) return;
    const g = c.getContext('2d')!, W = 1200, H = 900, v = this.view!;
    const humans = this.riders.filter(r => r.human);
    const names = humans.length > 0 && humans.every(r => v.consent[r.pid]);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1f5e'); bg.addColorStop(0.6, '#c65d8a'); bg.addColorStop(1, '#ff9a76'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffd27a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = "44px Bungee, 'Baloo 2', sans-serif"; g.fillText('THINKSTILL PARK · ON-RIDE PHOTO', W / 2, 70);
    g.font = "30px Fredoka, system-ui, sans-serif"; g.fillStyle = '#fff4ea'; g.fillText('Same day. Different drops.', W / 2, 120);
    // the coupled cars, front view
    const n = this.riders.length, cw = Math.min(260, (W - 120) / n), x0 = (W - cw * n) / 2, y0 = 300;
    this.riders.forEach((r, i) => {
      const x = x0 + i * cw;
      let lo = 0; r.track.segs.forEach((s, k) => { if (s.h < r.track.segs[lo].h) lo = k; });
      const face = this.faces(r.avatar, r.avatar === 'rush' ? 'speed' : r.track.segs[lo].h < -0.5 ? 'surprised' : 'wow');
      if (face) g.drawImage(face, x + cw * 0.1, y0, cw * 0.8, cw * 0.8);
      g.drawImage(cartSprite(r.color), x, y0 + cw * 0.52, cw, cw * 0.69);
      g.fillStyle = '#fff4ea'; g.font = "600 34px Fredoka, system-ui, sans-serif";
      const who = r.human ? (names ? r.name : '') : r.name;
      if (who) g.fillText(who.slice(0, 16), x + cw / 2, y0 + cw * 1.32);
      if (!r.human) { g.font = "24px Fredoka, system-ui, sans-serif"; g.fillStyle = 'rgba(255,244,234,0.75)'; g.fillText('Bubble companion', x + cw / 2, y0 + cw * 1.32 + 32); }
      g.font = "28px Fredoka, system-ui, sans-serif"; g.fillStyle = '#ffd27a';
      g.fillText('dropped at: ' + this.moments[lo].short.toLowerCase(), x + cw / 2, y0 + cw * 1.32 + (r.human ? 40 : 70));
      const ic = momentIcon(this.moments[lo].icon, 96); g.drawImage(ic, x + cw / 2 - 30, y0 - 80, 60, 60);
    });
    g.fillStyle = 'rgba(255,244,234,0.85)'; g.font = "24px Fredoka, system-ui, sans-serif";
    g.fillText('ThinkStill Reflect · Emotional Rollercoaster', W / 2, H - 50);
    void MODS;
  }
  private savePhoto() {
    const c = this.over.querySelector('.er-photo canvas') as HTMLCanvasElement; if (!c) return;
    c.toBlob((b) => { if (b) this.ctx.download('on-ride-photo.png', b).then(ok => { if (!ok) this.ctx.toast('Saving isn’t available here'); }); }, 'image/png');
  }
}
export type { Player };
