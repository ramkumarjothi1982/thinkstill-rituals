/* Drama Dubbing Booth — the player's booth.
 *   hook (the reel clatters in, the short plays silent, the ON AIR light turns red) → dub: drag lines onto Patch's or
 *   Sync's lane at the exact frame, perform the face on the expression wheel, set pitch and pace, preview with Bubble
 *   voices → hold PRINT IT to seal the cut → waiting → premiere (reveal.ts). The cut stays on this device until the seal. */
import type { RoomView, Player } from '../../room/protocol';
import type { Scene, SceneCtx } from '../../console/types';
import { h, clear, Surface, drag, hold, clamp } from '../../ui/dom';
import { BEATS, Cue, FACES, FACE_LABEL, FILM_LEN, LINES, Line, MAX_CUES, TONES, Tone, Who, cleanLine } from './content';
import { renderFilm, cueDur, cueText } from './film';
import { VoiceBox, Projector } from './voice';
import { DDB_CSS, DDB_FONTS } from './style';
import { PremiereDirector } from './reveal';

export function createDdbScene(ctx: SceneCtx): Scene { return new DdbScene(ctx); }

const toneColor = (t: Tone) => (TONES.find(x => x.id === t) || TONES[0]).color;
const DEFAULT_WHO: Who[] = ['patch', 'patch', 'sync', 'patch'];

class DdbScene implements Scene {
  el: HTMLElement;
  private view: RoomView | null = null;
  private round = -1;
  private mode: string | null = null;
  private studio: Studio | null = null;
  private waitEl: HTMLElement | null = null;
  private prem: PremiereDirector | null = null;
  private hookRaf = 0;
  constructor(private ctx: SceneCtx) {
    addFonts();
    this.el = h('div', { class: 'ddb', 'data-ritual': 'drama-dubbing-booth' }, h('style', { text: DDB_CSS }));
    ctx.stage.appendChild(this.el);
    ctx.faces.onReady = () => { if (this.studio) this.studio.dirty = true; };
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
      if (!this.prem) { this.clearPlay(); this.mode = 'premiere'; this.prem = new PremiereDirector(this.ctx, this.el); }
      this.prem.update(v, prev);
    }
  }
  resize() { if (this.studio) this.studio.layout(); if (this.prem) this.prem.resize(); }
  destroy() { this.reset(); this.el.remove(); }
  private clearPlay() {
    cancelAnimationFrame(this.hookRaf);
    if (this.studio) { this.studio.destroy(); this.studio = null; }
    if (this.waitEl) { this.waitEl.remove(); this.waitEl = null; }
  }
  private reset() {
    this.clearPlay();
    if (this.prem) { this.prem.destroy(); this.prem = null; }
    Array.from(this.el.children).forEach(c => { if (c.tagName !== 'STYLE') c.remove(); });
    this.mode = null;
  }

  /* the reel clatters in; the short plays silent at speed; the booth light goes red */
  private hook() {
    this.mode = 'hook';
    const ctx = this.ctx;
    const proj = new Projector(ctx.sfx);
    const sf = new Surface(); sf.maxDpr = 1.5;
    const title = h('div', { class: 'deco', style: { position: 'absolute', left: '0', right: '0', top: '62%', textAlign: 'center', fontSize: 'clamp(26px,7.5vw,48px)', color: '#ffd27a', textShadow: '0 4px 24px rgba(0,0,0,.9)', opacity: '0', transition: 'opacity .4s' } }, 'Your voice decides');
    const sub = h('div', { style: { position: 'absolute', left: '0', right: '0', top: 'calc(62% + 54px)', textAlign: 'center', fontSize: '14px', opacity: '0', transition: 'opacity .4s' } }, 'One silent scene. You dub it. Nobody hears your cut until the premiere.');
    const skip = h('button', { class: 'ddb-btn ghost', style: { position: 'absolute', right: '14px', bottom: 'calc(14px + var(--rf-safe-b,0px))', minHeight: '44px' } }, 'Skip');
    const wrap = h('div', { class: 'ddb-cin' }, sf.canvas, title, sub, skip);
    this.el.appendChild(wrap);
    const faces = (s: string, m: string) => ctx.faces.get(s, m);
    const T0 = performance.now();
    let done = false, started = false, lit = false;
    const go = () => { if (done) return; done = true; cancelAnimationFrame(this.hookRaf); proj.stop(); wrap.remove(); this.startStudio(); };
    skip.addEventListener('click', go);
    wrap.addEventListener('pointerdown', (e) => { ctx.sfx.unlock(); if (e.target !== skip && performance.now() - T0 > 700) go(); });
    const frame = () => {
      if (done) return;
      this.hookRaf = requestAnimationFrame(frame);
      sf.fit();
      const k = (performance.now() - T0) / 1000, g = sf.g, W = sf.pw, H = sf.ph;
      g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H);
      // the projector beam onto a screen
      const sw = Math.min(W * 0.92, H * 1.35), sh = sw * 9 / 16, sx = (W - sw) / 2, sy = H * 0.12;
      if (k > 0.9) {
        if (!started) { started = true; proj.start(0.05); }
        g.save(); g.globalCompositeOperation = 'lighter';
        const beam = g.createLinearGradient(W / 2, H, W / 2, sy + sh); beam.addColorStop(0, 'rgba(255,230,180,0.22)'); beam.addColorStop(1, 'rgba(255,230,180,0.02)');
        g.fillStyle = beam; g.beginPath(); g.moveTo(W / 2 - 8, H); g.lineTo(sx, sy + sh); g.lineTo(sx + sw, sy + sh); g.lineTo(W / 2 + 8, H); g.fill(); g.restore();
        const ft = Math.min(FILM_LEN - 0.01, (k - 0.9) * 3.2);
        const off = document.createElement('canvas');
        g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip(); g.translate(sx, sy);
        renderFilm(g, sw, sh, ft, { faces, cues: [], subtitles: false });
        g.restore();
        void off;
      } else {
        // the reel spinning up
        const r = Math.min(W, H) * 0.16, cx = W / 2, cy = H * 0.4, a = k * k * 30;
        g.strokeStyle = '#c8b48f'; g.lineWidth = r * 0.08; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 3; i++) { const b = a + i * Math.PI * 2 / 3; g.beginPath(); g.arc(cx + Math.cos(b) * r * 0.5, cy + Math.sin(b) * r * 0.5, r * 0.22, 0, Math.PI * 2); g.stroke(); }
        if (k > 0.3) ctx.sfx.tick(0.7);
      }
      if (k > 4.6 && !lit) { lit = true; ctx.sfx.thud(); }
      title.style.opacity = k > 4.6 ? '1' : '0'; sub.style.opacity = k > 5.0 ? '1' : '0';
      if (k > 4.6) { g.fillStyle = 'rgba(120,0,0,0.25)'; g.fillRect(0, 0, W, H); g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(W / 2, H * 0.08, Math.max(6, W * 0.012), 0, Math.PI * 2); g.fill(); }
      if (k > 7.2) go();
    };
    this.hookRaf = requestAnimationFrame(frame);
  }
  private startStudio() {
    this.mode = 'studio';
    this.studio = new Studio(this.ctx, (cues) => { this.ctx.room.act('seal', { cues }); this.mode = 'sealing'; });
    this.el.appendChild(this.studio.el);
    requestAnimationFrame(() => this.studio && this.studio.layout());
  }
  private showWait(spectating: boolean) {
    const v = this.view; if (!v) return;
    if (this.studio) { this.studio.pause(); }
    if (!this.waitEl) { this.waitEl = h('div', { class: 'ddb-wait' }); this.el.appendChild(this.waitEl); }
    this.mode = 'wait';
    clear(this.waitEl);
    const parts = v.players.filter(p => !p.spectator);
    this.waitEl.appendChild(h('h3', null, spectating ? 'Tonight you’re in the audience' : 'Printed.'));
    this.waitEl.appendChild(h('div', { style: { fontSize: '14px', maxWidth: '420px', opacity: '.85' } }, spectating ? 'This ritual had already started. You’ll see every premiere, and you get a booth next round.' : 'Your cut is locked in the can. Nobody hears it until the premiere — not even the host.'));
    const chips = h('div', { class: 'ddb-chips' });
    for (const p of parts) {
      const sealed = !!v.sealed[p.pid];
      chips.appendChild(h('div', { class: 'ddb-chip' }, h('img', { alt: '', src: this.ctx.faces.url(p.avatar, sealed ? 'happy' : 'think') }), h('b', null, p.pid === v.you ? p.name + ' (you)' : p.name), !p.human ? h('small', null, 'Bubble companion') : null, h('small', null, sealed ? 'printed' : p.connected ? 'in the booth…' : 'reconnecting…')));
    }
    this.waitEl.appendChild(chips);
    const waiting = parts.filter(p => !v.sealed[p.pid]);
    if (this.ctx.room.isHost && waiting.length && parts.some(p => p.human && v.sealed[p.pid])) this.waitEl.appendChild(h('button', { class: 'ddb-btn ghost', onclick: () => this.ctx.room.act('force_reveal') }, 'Start the premiere without ' + (waiting.length === 1 ? waiting[0].name : waiting.length + ' players')));
  }
}

/* ======================================================================================================== */
class Studio {
  el: HTMLElement;
  dirty = true;
  private cues: Cue[] = [];
  private sel = -1;
  private t = 0;
  private playing = false;
  private p0 = 0; private t0 = 0;
  private browseBeat = -1;
  private screen = new Surface();
  private screenBox: HTMLElement;
  private playBig: HTMLElement;
  private tc: HTMLElement;
  private onair: HTMLElement;
  private ruler: HTMLElement;
  private lanesEl: HTMLElement;
  private tracks: Record<Who, HTMLElement>;
  private head: HTMLElement;
  private panel: HTMLElement;
  private previewBtn: HTMLButtonElement;
  private printBtn: HTMLButtonElement;
  private hint: HTMLElement;
  private meters: Surface[] = [new Surface(), new Surface()];
  private reels: HTMLElement[] = [];
  private voice: VoiceBox;
  private proj: Projector;
  private raf = 0;
  private destroyed = false;
  private panelMode: 'tray' | 'perf' | 'own' = 'tray';
  private ownTone: Tone = 'warm';
  private needle = [0, 0];
  private faces: (s: string, m: string) => CanvasImageSource | null;
  constructor(private ctx: SceneCtx, private onSeal: (cues: Cue[]) => void) {
    this.faces = (s, m) => ctx.faces.get(s, m);
    this.voice = new VoiceBox(ctx.sfx);
    this.proj = new Projector(ctx.sfx);
    ctx.faces.preload(['patch', 'sync'].flatMap(s => ['neutral', ...FACES].map(f => [s, f] as [string, string])));
    this.playBig = h('div', { class: 'ddb-playbig', 'aria-hidden': 'true', html: '<svg viewBox="0 0 20 20"><path d="M5 3l12 7-12 7z" fill="#fff"/></svg>' });
    this.tc = h('div', { class: 'ddb-tc' }, '00:00');
    this.onair = h('div', { class: 'ddb-onair' }, h('i'), 'ON AIR');
    this.screenBox = h('div', { class: 'ddb-screen', role: 'button', tabindex: '0', 'aria-label': 'Screen: tap to preview your cut' }, this.screen.canvas, this.onair, this.tc, this.playBig);
    this.screenBox.addEventListener('click', (e) => { ctx.sfx.unlock(); ctx.sfx.gesture(e); ctx.metrics.mark(e); this.togglePlay(); });
    this.screenBox.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.togglePlay(); } });
    this.ruler = h('div', { class: 'ddb-ruler', role: 'slider', 'aria-label': 'Film time', 'aria-valuemin': '0', 'aria-valuemax': String(FILM_LEN), tabindex: '0' });
    BEATS.forEach(b => this.ruler.appendChild(h('div', { class: 'bt', style: { left: (b.t0 / FILM_LEN * 100) + '%', width: (100 / 4) + '%' } }, 'Beat ' + (b.i + 1))));
    this.head = h('div', { class: 'ddb-head' });
    const lane = (who: Who) => {
      const track = h('div', { class: 'ddb-track', 'data-who': who, 'aria-label': (who === 'patch' ? 'Patch' : 'Sync') + ' lane' });
      const row = h('div', { class: 'ddb-lane' }, h('div', { class: 'who', title: who === 'patch' ? 'Patch' : 'Sync' }, h('img', { alt: who === 'patch' ? 'Patch' : 'Sync', src: ctx.faces.url(who, 'neutral') })), track);
      return { row, track };
    };
    const lp = lane('patch'), ls = lane('sync');
    this.tracks = { patch: lp.track, sync: ls.track };
    this.lanesEl = h('div', { class: 'ddb-lanes' }, lp.row, ls.row);
    const desk = h('div', { class: 'ddb-desk' }, this.ruler, this.lanesEl, this.head);
    this.panel = h('div', { class: 'ddb-panel' });
    this.previewBtn = h('button', { class: 'ddb-preview', onclick: (e: Event) => { ctx.sfx.unlock(); ctx.sfx.gesture(e); ctx.metrics.mark(e); this.togglePlay(); } }, '▶ Preview') as HTMLButtonElement;
    const reel = () => { const s = h('div', { class: 'ddb-reel', html: '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="15" cy="15" r="3" fill="currentColor"/><circle cx="15" cy="7.5" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="21.5" cy="18.8" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="18.8" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }); this.reels.push(s); return s; };
    this.meters.forEach(m => { m.maxDpr = 2; });
    this.printBtn = h('button', { class: 'ddb-print', 'aria-label': 'Hold to print your cut (seal it)' }, 'HOLD TO\nPRINT IT', h('i')) as HTMLButtonElement;
    this.printBtn.style.whiteSpace = 'pre-line';
    this.hint = h('div', { class: 'ddb-hint', 'aria-live': 'polite' });
    const controls = h('div', { class: 'ddb-controls' }, this.previewBtn, h('div', { class: 'ddb-meters' }, reel(), this.meters[0].canvas, this.meters[1].canvas, reel()), this.printBtn);
    this.el = h('div', { class: 'ddb-studio' }, h('div', { class: 'ddb-win' }, this.screenBox), desk, this.panel, h('div', null, controls, this.hint));
    this.bind();
    this.renderPanel();
    this.renderCues();
    this.updateHint();
    this.raf = requestAnimationFrame((n) => this.frame(n));
    (globalThis as any).__ddbStudio = this;
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); this.voice.stop(); this.proj.stop(); this.el.remove(); if ((globalThis as any).__ddbStudio === this) delete (globalThis as any).__ddbStudio; }
  layout() { this.dirty = true; }
  pause() { if (this.playing) this.togglePlay(); }
  get cueList() { return this.cues.slice(); }

  /* ---------- time ---------- */
  private togglePlay() {
    this.playing = !this.playing;
    if (this.playing) {
      if (this.t >= FILM_LEN - 0.05) this.t = 0;
      this.p0 = performance.now(); this.t0 = this.t;
      this.voice.play(this.cues, this.t);
      this.proj.start(0.035);
    } else { this.voice.stop(); this.proj.stop(); }
    this.onair.classList.toggle('on', this.playing);
    this.previewBtn.textContent = this.playing ? '❚❚ Pause' : '▶ Preview';
    this.playBig.style.opacity = this.playing ? '0' : '1';
    this.reels.forEach(r => r.classList.toggle('spin', this.playing));
    this.dirty = true;
  }
  private seek(t: number) {
    if (this.playing) this.togglePlay();
    this.t = clamp(t, 0, FILM_LEN - 0.01);
    this.browseBeat = -1;
    this.dirty = true;
    if (this.panelMode === 'tray') this.renderPanel();
  }
  private frame(now: number) {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame((n) => this.frame(n));
    if (this.playing) {
      this.t = this.t0 + (now - this.p0) / 1000;
      if (this.t >= FILM_LEN) { this.t = FILM_LEN - 0.01; this.togglePlay(); }
      this.dirty = true;
      const beat = Math.floor(this.t / 3);
      if (this.panelMode === 'tray' && this.browseBeat < 0 && beat !== (this as any)._lastBeat) { (this as any)._lastBeat = beat; this.renderPanel(); }
    }
    this.drawMeters();
    if (!this.dirty) { this.ctx.metrics.idle(); return; }
    this.dirty = false;
    this.screen.fit();
    renderFilm(this.screen.g, this.screen.pw, this.screen.ph, this.t, { faces: this.faces, cues: this.cues });
    const pct = (this.t / FILM_LEN) * 100;
    const rr = this.ruler.getBoundingClientRect(), dr = (this.ruler.parentElement as HTMLElement).getBoundingClientRect();
    this.head.style.left = (rr.left - dr.left + rr.width * pct / 100) + 'px';
    this.head.style.top = (rr.top - dr.top) + 'px';
    this.tc.textContent = '00:' + String(Math.floor(this.t)).padStart(2, '0') + ':' + String(Math.floor((this.t % 1) * 24)).padStart(2, '0');
    this.ruler.setAttribute('aria-valuenow', this.t.toFixed(1));
    this.ctx.metrics.frame(now);
  }
  private drawMeters() {
    const lvl = this.voice.level();
    this.meters.forEach((m, i) => {
      m.fit(); const g = m.g, W = m.pw, H = m.ph; if (W < 4) return;
      this.needle[i] += ((lvl * (i ? 0.85 : 1)) - this.needle[i]) * (i ? 0.25 : 0.35);
      g.fillStyle = '#efe2c4'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#2a1f14'; g.lineWidth = Math.max(1, W * 0.012);
      for (let k = 0; k <= 10; k++) { const a = -Math.PI * 0.8 + (k / 10) * Math.PI * 0.6; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * H * 0.8, H * 0.95 + Math.sin(a) * H * 0.8); g.lineTo(W / 2 + Math.cos(a) * H * 0.68, H * 0.95 + Math.sin(a) * H * 0.68); g.stroke(); }
      g.fillStyle = '#c0392b'; g.fillRect(W * 0.66, H * 0.1, W * 0.2, H * 0.06);
      const a = -Math.PI * 0.8 + clamp(this.needle[i], 0, 1) * Math.PI * 0.6;
      g.strokeStyle = '#1a1209'; g.lineWidth = Math.max(1.2, W * 0.02); g.beginPath(); g.moveTo(W / 2, H * 0.95); g.lineTo(W / 2 + Math.cos(a) * H * 0.82, H * 0.95 + Math.sin(a) * H * 0.82); g.stroke();
    });
  }

  /* ---------- lanes and cues ---------- */
  private timeAt(clientX: number) { const r = this.tracks.patch.getBoundingClientRect(); return clamp(Math.round(((clientX - r.left) / r.width) * FILM_LEN * 20) / 20, 0, FILM_LEN - 0.3); }
  private laneAt(clientX: number, clientY: number): Who | null {
    for (const w of ['patch', 'sync'] as Who[]) { const r = this.tracks[w].getBoundingClientRect(); if (clientX >= r.left - 20 && clientX <= r.right + 20 && clientY >= r.top - 10 && clientY <= r.bottom + 10) return w; }
    return null;
  }
  private renderCues() {
    (['patch', 'sync'] as Who[]).forEach(w => this.tracks[w].querySelectorAll('.ddb-cue').forEach(n => n.remove()));
    this.cues.forEach((c, i) => {
      const chip = h('div', { class: 'ddb-cue' + (i === this.sel ? ' sel' : ''), 'data-i': String(i), role: 'button', tabindex: '0', 'aria-label': (c.who === 'patch' ? 'Patch' : 'Sync') + ' says ' + cueText(c) + ' at ' + c.t.toFixed(1) + ' seconds', style: { left: (c.t / FILM_LEN * 100) + '%', width: Math.max(8, cueDur(c) / FILM_LEN * 100) + '%', background: toneColor(c.tone) } },
        h('img', { alt: '', src: this.ctx.faces.url(c.who, c.face) }), h('span', null, cueText(c)));
      this.tracks[c.who].appendChild(chip);
      this.bindCue(chip, i);
    });
    this.printBtn.disabled = !this.cues.length;
    this.updateHint();
  }
  private bindCue(chip: HTMLElement, i: number) {
    const ctx = this.ctx;
    let sx = 0, sy = 0, st = 0, moved = false;
    const cue = this.cues[i];
    drag(chip, {
      down: (_x, _y, e) => { e.stopPropagation(); sx = e.clientX; sy = e.clientY; st = cue.t; moved = false; },
      move: (_x, _y, e) => {
        if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
        moved = true;
        const r = this.tracks.patch.getBoundingClientRect();
        const c = cue;
        c.t = clamp(Math.round((st + ((e.clientX - sx) / r.width) * FILM_LEN) * 20) / 20, 0, FILM_LEN - 0.3);
        const w = this.laneAt(e.clientX, e.clientY);
        if (w && w !== c.who) { c.who = w; ctx.sfx.pop(w === 'patch' ? 500 : 640); }
        const out = !w && Math.abs(e.clientY - sy) > 70;
        chip.style.opacity = out ? '0.35' : '1';
        chip.style.left = (c.t / FILM_LEN * 100) + '%';
        if (chip.parentElement !== this.tracks[c.who]) this.tracks[c.who].appendChild(chip);
        this.t = c.t + 0.05; this.dirty = true;
      },
      up: (_x, _y, e) => {
        if (!moved) { this.select(this.cues.indexOf(cue), true); return; }
        const w = this.laneAt(e.clientX, e.clientY);
        if (!w && Math.abs(e.clientY - sy) > 70) { this.cues.splice(this.cues.indexOf(cue), 1); this.sel = -1; ctx.sfx.whoosh(false, 0.3); this.panelMode = 'tray'; this.renderPanel(); }
        else { this.cues.sort((a, b) => a.t - b.t); this.sel = this.cues.indexOf(cue); ctx.sfx.tick(1); if (this.panelMode === 'perf') this.renderPanel(); }
        this.renderCues(); this.dirty = true;
      }
    });
  }
  private select(i: number, say: boolean) {
    this.sel = i;
    this.panelMode = 'perf';
    const c = this.cues[i];
    if (c && !this.playing) { this.t = Math.min(FILM_LEN - 0.01, c.t + Math.min(0.6, cueDur(c) * 0.4)); this.dirty = true; }
    if (say && c) this.voice.say(c);
    this.renderCues(); this.renderPanel();
  }
  private addCue(line: Line | null, who: Who, t: number, custom?: { text: string; tone: Tone }) {
    if (this.cues.length >= MAX_CUES) { this.ctx.toast('Six lines is the most a cut can hold'); return; }
    const tone: Tone = line ? line.tone : (custom ? custom.tone : 'warm');
    const face = ({ warm: 'happy', sarcastic: 'cool', nervous: 'worried', deadpan: 'cool' } as Record<Tone, string>)[tone];
    const c: Cue = { t: clamp(t, 0, FILM_LEN - 0.3), who, line: line ? line.id : 'custom', tone, face, pitch: 0, pace: 0 };
    if (custom) c.text = custom.text;
    this.cues.push(c);
    this.cues.sort((a, b) => a.t - b.t);
    const i = this.cues.indexOf(c);
    this.ctx.sfx.pop(who === 'patch' ? 480 : 620);
    this.select(i, true);
  }

  /* ---------- the panel: script tray / performance / your own line ---------- */
  private currentBeat() { return this.browseBeat >= 0 ? this.browseBeat : Math.min(3, Math.floor(this.t / 3)); }
  private renderPanel() {
    clear(this.panel);
    if (this.panelMode === 'perf' && this.cues[this.sel]) return this.renderPerf();
    if (this.panelMode === 'own') return this.renderOwn();
    this.panelMode = 'tray';
    const b = this.currentBeat();
    const bar = h('div', { class: 'ddb-beatbar' },
      h('button', { class: 'ddb-arrow', 'aria-label': 'Previous beat', onclick: () => { this.browseBeat = (b + 3) % 4; this.t = BEATS[this.browseBeat].t0 + 0.5; this.dirty = true; this.renderPanel(); } }, '‹'),
      h('b', null, 'Beat ' + (b + 1) + ' · ' + BEATS[b].title),
      h('button', { class: 'ddb-arrow', 'aria-label': 'Next beat', onclick: () => { this.browseBeat = (b + 1) % 4; this.t = BEATS[this.browseBeat].t0 + 0.5; this.dirty = true; this.renderPanel(); } }, '›'));
    const grid = h('div', { class: 'ddb-lines' });
    for (const L of LINES.filter(l => l.beat === b)) {
      const card = h('button', { class: 'ddb-line', style: { '--tone': toneColor(L.tone) } as any, 'aria-label': 'Line: ' + L.text + ' (' + L.tone + '). Drag onto a lane, or tap to place at the playhead.' }, '“' + L.text + '”', h('small', null, L.tone));
      card.style.setProperty('--tone', toneColor(L.tone));
      this.bindLineCard(card, L);
      grid.appendChild(card);
    }
    grid.appendChild(h('button', { class: 'ddb-line own', onclick: () => { this.panelMode = 'own'; this.renderPanel(); } }, '✎ Write your own line', h('small', null, 'optional · 40 letters')));
    this.panel.appendChild(bar);
    this.panel.appendChild(grid);
  }
  private bindLineCard(card: HTMLElement, L: Line) {
    const ctx = this.ctx;
    let ghost: HTMLElement | null = null, sx = 0, sy = 0, marker: HTMLElement | null = null;
    const cleanup = () => { if (ghost) ghost.remove(); ghost = null; if (marker) marker.remove(); marker = null; (['patch', 'sync'] as Who[]).forEach(w => this.tracks[w].classList.remove('over')); };
    drag(card, {
      down: (_x, _y, e) => { ctx.sfx.unlock(); sx = e.clientX; sy = e.clientY; },
      move: (_x, _y, e) => {
        if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
        if (!ghost) { ghost = h('div', { class: 'ddb-ghost' }, '“' + L.text + '”'); (this.el.getRootNode() as any).appendChild ? (this.el.getRootNode() as ShadowRoot).appendChild(ghost) : document.body.appendChild(ghost); ctx.sfx.pop(700); }
        ghost.style.left = (e.clientX - 40) + 'px'; ghost.style.top = (e.clientY - 46) + 'px';
        const w = this.laneAt(e.clientX, e.clientY);
        (['patch', 'sync'] as Who[]).forEach(x => this.tracks[x].classList.toggle('over', x === w));
        if (w) {
          const t = this.timeAt(e.clientX);
          if (!marker) marker = h('div', { class: 'ddb-drop' });
          if (marker.parentElement !== this.tracks[w]) this.tracks[w].appendChild(marker);
          marker.style.left = (t / FILM_LEN * 100) + '%';
          if (!this.playing) { this.t = t; this.dirty = true; }
        } else if (marker) { marker.remove(); marker = null; }
      },
      up: (_x, _y, e) => {
        const wasDrag = !!ghost;
        const w = wasDrag ? this.laneAt(e.clientX, e.clientY) : null;
        const t = this.timeAt(e.clientX);
        cleanup();
        ctx.sfx.gesture(e); ctx.metrics.mark(e);
        if (!wasDrag) this.addCue(L, DEFAULT_WHO[L.beat], Math.max(L.beat * 3 + 0.3, Math.min(this.t, L.beat * 3 + 2.6)));
        else if (w) this.addCue(L, w, t);
      }
    });
  }
  private renderPerf() {
    const ctx = this.ctx, c = this.cues[this.sel];
    const name = c.who === 'patch' ? 'Patch' : 'Sync';
    const wheel = h('div', { class: 'ddb-wheel', role: 'group', 'aria-label': 'Expression wheel for ' + name });
    const mid = h('div', { class: 'mid' }, FACE_LABEL[c.face] || c.face);
    const setFace = (f: string) => {
      if (c.face === f) return;
      c.face = f; mid.textContent = FACE_LABEL[f] || f;
      wheel.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.getAttribute('data-face') === f));
      ctx.sfx.pop(520 + FACES.indexOf(f) * 40);
      this.renderCues(); this.dirty = true;
    };
    FACES.forEach((f, i) => {
      const a = -Math.PI / 2 + (i / FACES.length) * Math.PI * 2;
      const b = h('button', { class: f === c.face ? 'on' : '', 'data-face': f, 'aria-label': FACE_LABEL[f], style: { left: (50 + Math.cos(a) * 38) + '%', top: (50 + Math.sin(a) * 38) + '%' }, onclick: (e: Event) => { ctx.sfx.gesture(e); ctx.metrics.mark(e); setFace(f); } }, h('img', { alt: '', src: ctx.faces.url(c.who, f) }));
      wheel.appendChild(b);
    });
    wheel.appendChild(mid);
    drag(wheel, {
      down: (x, y, e) => { if ((e.target as HTMLElement).closest('button')) return false; pick(x, y); },
      move: (x, y) => pick(x, y)
    });
    const pick = (x: number, y: number) => { const r = wheel.getBoundingClientRect(); const a = Math.atan2(y - r.height / 2, x - r.width / 2) + Math.PI / 2; const i = ((Math.round(a / (Math.PI * 2 / FACES.length)) % FACES.length) + FACES.length) % FACES.length; setFace(FACES[i]); };
    const fader = (label: string, key: 'pitch' | 'pace', lo: string, hi: string) => {
      const inp = h('input', { type: 'range', min: '-1', max: '1', step: '0.05', value: String(c[key]), 'aria-label': label + ' (' + lo + ' to ' + hi + ')' }) as HTMLInputElement;
      inp.addEventListener('input', () => { c[key] = Number(inp.value); this.renderCues(); });
      inp.addEventListener('change', () => this.voice.say(c));
      return h('label', { class: 'ddb-fader' }, h('span', null, label), inp);
    };
    this.panel.appendChild(h('div', { class: 'ddb-perf' },
      h('h4', null, h('span', null, name + ': “' + cueText(c) + '”'), h('button', { class: 'ddb-sbtn', onclick: () => { this.sel = -1; this.panelMode = 'tray'; this.renderCues(); this.renderPanel(); } }, 'Done')),
      wheel,
      h('div', { class: 'ddb-faders' },
        fader('Pitch', 'pitch', 'low', 'high'),
        fader('Pace', 'pace', 'slow', 'fast'),
        h('div', { class: 'ddb-row' },
          h('button', { class: 'ddb-sbtn', onclick: (e: Event) => { ctx.sfx.gesture(e); this.voice.say(c); } }, '▶ Hear it'),
          h('button', { class: 'ddb-sbtn', onclick: () => { c.who = c.who === 'patch' ? 'sync' : 'patch'; this.renderCues(); this.renderPanel(); this.voice.say(c); } }, '⇅ Swap voice'),
          h('button', { class: 'ddb-sbtn', onclick: () => { this.cues.splice(this.sel, 1); this.sel = -1; this.panelMode = 'tray'; ctx.sfx.whoosh(false, 0.3); this.renderCues(); this.renderPanel(); this.dirty = true; } }, '✕ Cut it')))));
  }
  private renderOwn() {
    const ctx = this.ctx;
    const inp = h('input', { maxlength: '40', placeholder: 'Your line (40 letters)', 'aria-label': 'Your own line', enterkeyhint: 'done' }) as HTMLInputElement;
    const tones = h('div', { class: 'ddb-tones', role: 'group', 'aria-label': 'Tone' });
    TONES.forEach(t => { const b = h('button', { class: t.id === this.ownTone ? 'on' : '', onclick: () => { this.ownTone = t.id; tones.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); } }, t.label); b.style.setProperty('--tone', t.color); tones.appendChild(b); });
    const add = () => {
      const text = cleanLine(inp.value);
      if (!text) { ctx.toast(inp.value.trim() ? 'Let’s keep that one off the reel' : 'Type a line first'); return; }
      this.panelMode = 'tray';
      const b = Math.min(3, Math.floor(this.t / 3));
      this.addCue(null, DEFAULT_WHO[b], this.t, { text, tone: this.ownTone });
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    this.panel.appendChild(h('div', { class: 'ddb-own' },
      h('div', { class: 'ddb-beatbar' }, h('b', null, 'Your own line at ' + this.t.toFixed(1) + ' s'), h('button', { class: 'ddb-sbtn', onclick: () => { this.panelMode = 'tray'; this.renderPanel(); } }, 'Back')),
      inp, tones,
      h('div', { class: 'ddb-row' }, h('button', { class: 'ddb-btn', onclick: add }, 'Add to the reel')),
      h('div', { class: 'ddb-hint' }, 'Typed lines are optional and only played at the premiere, to the people in this room.')));
    setTimeout(() => { try { inp.focus(); } catch (e) { /* ok */ } }, 50);
  }
  private updateHint() {
    this.hint.textContent = !this.cues.length ? 'Drag a line onto Patch or Sync at the frame you want — timing is the joke.' : this.cues.length < 3 ? 'Tap the screen to watch your cut. Add more lines, or perform a face.' : 'Love it? Hold PRINT IT to seal your cut for the premiere.';
  }

  private bind() {
    const ctx = this.ctx;
    const scrub = (x: number) => { const r = this.tracks.patch.getBoundingClientRect(); const rr = this.ruler.getBoundingClientRect(); this.seek(((x + rr.left - r.left) / r.width) * FILM_LEN); };
    drag(this.ruler, { down: (x, _y, e) => { ctx.sfx.unlock(); ctx.metrics.mark(e); scrub(x); }, move: (x, _y, e) => { ctx.metrics.mark(e); scrub(x); } });
    (['patch', 'sync'] as Who[]).forEach(w => drag(this.tracks[w], { down: (_x, _y, e) => { if ((e.target as HTMLElement).closest('.ddb-cue')) return false; ctx.metrics.mark(e); this.seek(this.timeAt(e.clientX)); }, move: (_x, _y, e) => this.seek(this.timeAt(e.clientX)) }));
    this.ruler.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') this.seek(this.t - 0.25); else if (e.key === 'ArrowRight') this.seek(this.t + 0.25); });
    const bar = this.printBtn.querySelector('i') as HTMLElement;
    hold(this.printBtn, 800, {
      start: () => { if (!this.cues.length) return; ctx.sfx.tone(196, 0.8, { type: 'triangle', glide: 392, vol: 0.05 }); },
      progress: (k) => { bar.style.width = (k * 100) + '%'; },
      done: () => {
        if (!this.cues.length) { ctx.toast('Put at least one line on the reel first'); return; }
        this.pause();
        ctx.sfx.thud(); ctx.sfx.shutter();
        this.onSeal(this.cues.map(c => ({ ...c })));
      },
      cancel: () => { bar.style.width = '0'; }
    });
    const ro = new ResizeObserver(() => { this.dirty = true; });
    ro.observe(this.screenBox);
  }
}

let fontsAdded = false;
function addFonts() {
  if (fontsAdded) return; fontsAdded = true;
  try { if (!document.querySelector('link[data-ddb-fonts]')) document.head.appendChild(h('link', { rel: 'stylesheet', href: DDB_FONTS, 'data-ddb-fonts': '1' })); } catch (e) { /* optional */ }
}
