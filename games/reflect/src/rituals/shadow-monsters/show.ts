/* Shadow Monsters — the Shadow Show, on the room's clock.
 *   For each monster: lights out → the lamp creeps closer and the monster looms up the sheet → cut to the audience
 *   (Bubbles scream, hide, sob, film it) → its maker holds to PULL THE LIGHT BACK and it shrinks under everyone's eyes
 *   → a beat → LIGHTS UP: what it was really made of, and the Bubbles' laughter.
 *   Then: "Same stuff. More distance." — every monster at the lamp beside the junk it was built from.
 *   Finale: the shadow parade (a conga across the sheet) until Still's tiny duck quacks; the monsters scatter into a
 *   flock of birds and fly out into the sunrise. The share card: what it felt like / what it was made of. */
import type { RoomView, Player, Slug } from '../../room/protocol';
import { SLUGS } from '../../room/protocol';
import type { SceneCtx } from '../../console/types';
import { h, clear, Surface, hold, clamp, ease } from '../../ui/dom';
import { Projector } from '../../gfx/projector';
import { BubbleActor, Emote } from '../../actor/bubble';
import type { Babble } from '../../actor/babble';
import { PICTS, rrect } from '../../actor/picts';
import { Music, slideWhistle, thunder, drumroll } from '../../audio/music';
import { OBJECTS, objSprite, objPict } from './objects';
import { COMPANION_NOTE, SHOW, TAGS, TagId, lampZFor, pullCurve, listOf } from './content';
import { Placed, Light, paintSheet, renderBackstage, renderAudience, sheetCanvasFor, monsterSize, magnification, SHEET, K, ZS } from './world';
import { SmPub, timetable } from './logic';
import { SONGS } from './songs';

interface M { i: number; pid: string; name: string; human: boolean; avatar: Slug; objs: Placed[]; tag: TagId | null; mirror: boolean; size: number; mag: number; }
type Part = 'intro' | 'dark' | 'rise' | 'react' | 'loom' | 'pull' | 'beat' | 'lights' | 'evr' | 'wait';

export class ShowDirector {
  private sf = new Surface();
  private wrap: HTMLElement;
  private over: HTMLElement;
  private raf = 0;
  private view: RoomView | null = null;
  private pub: SmPub | null = null;
  private ms: M[] = [];
  private sheet = document.createElement('canvas');
  private P = new Projector();
  private aud: { a: BubbleActor; pid: string | null; human: boolean; front: boolean }[] = [];
  private crew: Record<string, BubbleActor> = {};
  private seen = 0;
  private once = new Set<string>();
  private phase: 'reveal' | 'finale' = 'reveal';
  private finaleAt = 0;
  private overlay = '';
  private last = performance.now();
  private faces: (s: string, m: string) => CanvasImageSource | null;
  private evrThumbs: HTMLCanvasElement[] = [];
  private finaleSent = false;
  private floats: { pid: string; mood: string; t: number }[] = [];
  private localPull: { i: number; at: number } | null = null;
  constructor(private ctx: SceneCtx, parent: HTMLElement, private babble: Babble, private music: Music) {
    this.faces = (s, m) => ctx.faces.get(s, m);
    this.sf.maxDpr = 1.5;
    this.over = h('div', { class: 'sm-over' });
    this.wrap = h('div', { class: 'sm-stage' }, this.sf.canvas, this.over);
    parent.appendChild(this.wrap);
    this.raf = requestAnimationFrame((n) => this.frame(n));
    (globalThis as any).__smShow = this;
  }
  destroy() { cancelAnimationFrame(this.raf); this.wrap.remove(); this.music.stop(0.3); if ((globalThis as any).__smShow === this) delete (globalThis as any).__smShow; }
  resize() { this.sf.fit(); }
  private doOnce(k: string, f: () => void) { if (!this.once.has(k)) { this.once.add(k); f(); } }
  private now() { return this.ctx.room.serverNow(); }

  /* ---------------- room updates ---------------- */
  update(v: RoomView, _prev: RoomView | null) {
    this.view = v;
    this.pub = v.pub as SmPub;
    if (!this.ms.length && v.revealed && this.pub) this.setup(v);
    if (v.phase === 'finale' && this.phase !== 'finale') { this.phase = 'finale'; this.finaleAt = performance.now(); this.setOverlay(''); }
    for (const ev of v.live) {
      if (ev.n <= this.seen) continue;
      this.seen = ev.n;
      const d = ev.data || {};
      if (d.k === 'react') this.react(ev.pid, d.r, ev.pid === v.you);
      if (d.k === 'pull' && ev.pid !== v.you) { const m = this.ms[d.i]; if (m) this.banner((m.name) + ' is pulling the light back'); }
    }
  }
  private setup(v: RoomView) {
    const pub = this.pub!;
    const byPid = new Map(v.players.map(p => [p.pid, p] as [string, Player]));
    let lastHuman: Placed[] = [];
    this.ms = pub.order.map((pid, i) => {
      const p = byPid.get(pid), c = pub.cast.find(x => x.pid === pid);
      const r = (v.revealed![pid] || { objs: [], tag: null }) as { objs: Placed[]; tag: TagId | null; mirror?: boolean };
      let objs = r.objs || [];
      if (r.mirror) objs = lastHuman.map(o => ({ ...o, x: -o.x, r: (8 - o.r) % 8 }));
      if (!r.mirror && (p ? p.human : c && c.human)) lastHuman = objs;
      const avatar = (p ? p.avatar : c ? c.avatar : 'loopie') as Slug;
      return { i, pid, name: p ? p.name : avatar.charAt(0).toUpperCase() + avatar.slice(1), human: p ? p.human : !!(c && c.human), avatar, objs, tag: r.tag || null, mirror: !!r.mirror, size: monsterSize(objs), mag: magnification(objs) };
    });
    // the audience: everyone in the room in the front row, the rest of the troupe behind
    const front = v.players.filter(p => !p.spectator || true);
    const used = new Set<string>(front.map(p => p.avatar));
    front.forEach(p => { const a = new BubbleActor(p.avatar, 0, 0, 20, this.babble); a.label = p.pid === v.you ? 'You' : p.name; this.aud.push({ a, pid: p.pid, human: p.human, front: true }); });
    SLUGS.filter(s => !used.has(s)).forEach(s => { const a = new BubbleActor(s, 0, 0, 16, this.babble); this.aud.push({ a, pid: null, human: false, front: false }); });
    for (const s of SLUGS) this.crew[s] = new BubbleActor(s, 0, 0, 20, this.babble);
    const pre: [string, string][] = [];
    for (const s of SLUGS) for (const m of ['neutral', 'surprised', 'cry', 'laugh', 'love', 'wow', 'dizzy', 'worried', 'calm', 'happy', 'celebrate', 'shy', 'cool', 'confused']) pre.push([s, m]);
    this.ctx.faces.preload(pre);
    this.ctx.sfx.duck(0.4);
  }

  /** Where the show is right now (server clock). */
  private where(): { part: Part; i: number; k: number; t: number; slotT: number } {
    const pub = this.pub!;
    const now = this.now();
    if (!pub.revealAt) return { part: 'intro', i: -1, k: 0, t: 0, slotT: 0 };
    const tt = timetable(pub);
    const e = now - pub.revealAt;
    if (now < tt.slots[0].start) return { part: 'intro', i: -1, k: e / (SHOW.intro * 1000), t: e / 1000, slotT: 0 };
    const local = this.localPull;
    for (const s of tt.slots) {
      if (now >= s.end) continue;
      let pullAt = s.pullAt;
      if (local && local.i === s.i && !s.pulled) pullAt = Math.min(pullAt, local.at);   // our own pull starts instantly here
      const lights = pullAt + s.pullDur + SHOW.beat * 1000;
      const slotT = (now - s.start) / 1000;
      const a = SHOW.dark * 1000, b = a + SHOW.rise * 1000, c = b + SHOW.react * 1000;
      const x = now - s.start;
      if (x < a) return { part: 'dark', i: s.i, k: x / a, t: x / 1000, slotT };
      if (x < b) return { part: 'rise', i: s.i, k: (x - a) / (b - a), t: x / 1000, slotT };
      if (x < c && now < pullAt) return { part: 'react', i: s.i, k: (x - b) / (c - b), t: x / 1000, slotT };
      if (now < pullAt) return { part: 'loom', i: s.i, k: 0, t: x / 1000, slotT };
      if (now < pullAt + s.pullDur) return { part: 'pull', i: s.i, k: (now - pullAt) / s.pullDur, t: x / 1000, slotT };
      if (now < lights) return { part: 'beat', i: s.i, k: (now - pullAt - s.pullDur) / (SHOW.beat * 1000), t: x / 1000, slotT };
      return { part: 'lights', i: s.i, k: (now - lights) / (SHOW.lights * 1000), t: x / 1000, slotT };
    }
    if (now < tt.end) return { part: 'evr', i: -1, k: (now - tt.evrAt) / (SHOW.evr * 1000), t: (now - tt.evrAt) / 1000, slotT: 0 };
    return { part: 'wait', i: -1, k: 0, t: (now - tt.end) / 1000, slotT: 0 };
  }

  /* ---------------- frame ---------------- */
  private frame(now: number) {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.sf.fit();
    const g = this.sf.g, W = this.sf.pw, H = this.sf.ph;
    if (!this.ms.length || W < 8) return;
    for (const x of this.aud) x.a.update(dt);
    for (const a of Object.values(this.crew)) a.update(dt);
    if (this.phase === 'finale') this.drawFinale(g, W, H, (now - this.finaleAt) / 1000);
    else {
      const w = this.where();
      this.drive(w);
      this.draw(g, W, H, w);
      if (w.part === 'wait' && this.ctx.room.isHost && !this.finaleSent) { this.finaleSent = true; this.ctx.room.act('finale'); }
    }
    this.drawFloats(g, W, H, dt);
    this.ctx.metrics.frame(now);
  }

  /* ---------------- sound, Bubble reactions and overlays, once per beat ---------------- */
  private drive(w: { part: Part; i: number; k: number }) {
    const sfx = this.ctx.sfx, v = this.view!;
    const key = w.part + ':' + w.i;
    if (w.part === 'intro') {
      this.doOnce('intro', () => { drumroll(sfx, 2.4); this.music.stop(0.3); });
      this.setOverlay('intro');
      return;
    }
    if (w.part === 'evr') { this.doOnce('evr', () => { this.music.play('dawn', SONGS.dawn, { vol: 0.35 }); sfx.chime([523, 659, 784]); this.prepEvr(); }); this.setOverlay('evr'); return; }
    if (w.part === 'wait') { this.setOverlay('wait'); return; }
    const m = this.ms[w.i];
    if (w.part === 'dark') this.doOnce(key, () => { this.music.stop(0.4); sfx.thud(); sfx.noise(0.25, { type: 'highpass', freq: 2500, vol: 0.2, at: 0.3 }); });
    if (w.part === 'rise') this.doOnce(key, () => { this.music.play('dread', SONGS.dread, { vol: 0.5 }); sfx.whoosh(true, SHOW.rise); setTimeout(() => { thunder(sfx); this.music.hit('organ', ['D3', 'F3', 'Ab3', 'C#4'], { len: 1.4, vol: 1 }); }, SHOW.rise * 900); });
    if (w.part === 'react') this.doOnce(key, () => this.audienceScared(m));
    if (w.part === 'pull') this.doOnce(key, () => { slideWhistle(sfx, 1500, 240, (this.slotDur(w.i) / 1000) * 0.9); this.music.stop(0.6); if (!m.human) this.companionPullGag(m); });
    if (w.part === 'lights') this.doOnce(key, () => { sfx.noise(0.08, { type: 'lowpass', freq: 500, vol: 0.4 }); sfx.tone(90, 0.2, { vol: 0.3 }); this.audienceLaughs(m); this.music.play('attic', SONGS.attic, { vol: 0.35 }); });
    // overlays
    const mine = m.pid === v.you;
    if ((w.part === 'loom' || w.part === 'react') && mine && m.human && !this.localPull) this.setOverlay('pull:' + w.i);
    else if (w.part === 'rise' || w.part === 'react' || w.part === 'loom' || w.part === 'pull' || w.part === 'beat') this.setOverlay('watch:' + w.i);
    else if (w.part === 'lights') this.setOverlay('lights:' + w.i);
    else if (w.part === 'dark') this.setOverlay('dark:' + w.i);
  }
  private slotDur(i: number) { const s = timetable(this.pub!).slots[i]; return s ? s.pullDur : SHOW.shrink * 1000; }

  private fr(slug: string) { return this.aud.find(x => x.a.slug === slug); }
  private audienceScared(m: M) {
    const tier = m.size > 1.4 ? 3 : m.size > 0.95 ? 2 : m.size > 0.5 ? 1 : 0;
    const act = (slug: string, e: Emote, delay: number, o: any = {}) => { const x = this.fr(slug); if (x && !(x.pid && x.human)) x.a.after(delay, () => x.a.emote(e, o)); };
    if (tier >= 2) { act('rush', 'scream', 0); if (tier >= 3) { const r = this.fr('rush'); if (r) r.a.after(1.3, () => r.a.faint(1)); } act('drop', 'cry', 0.35); act('loopie', 'hide', 0.2); act('glitch', 'wow', 0.5, { vol: 0.6 }); act('patch', 'uhoh', 0.6); act('still', 'nod', 0.9, { vol: 0.5 }); act('sync', 'gasp', 0.15); }
    else if (tier === 1) { act('rush', 'gasp', 0); act('drop', 'uhoh', 0.3); { const l = this.fr('loopie'); if (l && !l.pid) { l.a.setMood('worried', 1.4); l.a.shiver(1.2, 0.03); } } act('glitch', 'huh', 0.4, { vol: 0.6 }); act('still', 'nod', 0.7, { vol: 0.5 }); act('sync', 'gasp', 0.3, { vol: 0.6 }); }
    else { act('rush', 'scream', 0.6); act('still', 'nod', 0.2, { vol: 0.5 }); act('glitch', 'huh', 0.3, { vol: 0.6 }); act('loopie', 'giggle', 0.9); }
    const x = this.fr('glitch'); if (x && !x.pid) { x.a.prop = PICTS.camera; x.a.after(0.8, () => this.ctx.sfx.shutter()); }
  }
  private audienceLaughs(m: M) {
    const act = (slug: string, e: Emote, delay: number, o: any = {}) => { const x = this.fr(slug); if (x && !(x.pid && x.human)) x.a.after(delay, () => x.a.emote(e, o)); };
    const r = this.fr('rush'); if (r && r.a.fainted) r.a.recover();
    act('rush', 'laugh', 0.3); act('rush', 'shy', 1.8, { quiet: true });
    act('drop', 'love', 0.5); act('loopie', 'giggle', 0.2); act('glitch', 'laugh', 0.6, { vol: 0.7 }); act('patch', 'yay', 0.4, { vol: 0.8 }); act('still', 'nod', 0.8, { vol: 0.5 }); act('sync', 'laugh', 0.45, { vol: 0.7 });
    const objs = m.objs.map(o => o.o);
    if (objs.includes('duck')) act('still', 'love', 1.2);
    if (objs.includes('doughnut')) { const p = this.fr('patch'); if (p) p.a.after(1.4, () => { p.a.speak(objPict('doughnut'), 1.4); this.ctx.sfx.crack(); }); }
    if (m.avatar === 'loopie' && !m.human) { const l = this.fr('loopie'); if (l) l.a.after(1.6, () => l.a.speak('again', 1.6)); }
    if (m.avatar === 'still' && !m.human) { const x = this.fr('rush'); if (x) x.a.after(0.4, () => x.a.emote('faint')); }
    const own = this.aud.find(x => x.pid === m.pid);
    if (own && m.human) own.a.after(0.2, () => own.a.emote(m.size > 1.1 ? 'cheer' : 'shy', { vol: 0.7 }));
  }
  private companionPullGag(m: M) {
    const own = this.aud.find(x => x.pid === m.pid); if (!own) return;
    if (m.avatar === 'rush') { own.a.after(0.3, () => own.a.emote('faint', { vol: 0.8 })); }
    if (m.avatar === 'loopie') { own.a.emote('giggle'); own.a.after(1.4, () => own.a.emote('huh')); }
    if (m.avatar === 'still') own.a.emote('nod', { vol: 0.5 });
    if (m.avatar === 'drop') own.a.emote('cry');
  }
  private react(pid: string, r: string, local: boolean) {
    const x = this.aud.find(a => a.pid === pid); if (!x) return;
    const e: Emote = r === 'scream' ? 'scream' : r === 'laugh' ? 'laugh' : 'love';
    x.a.emote(e, { vol: local ? 0.9 : 0.6 });
    this.floats.push({ pid, mood: r === 'scream' ? 'surprised' : r === 'laugh' ? 'laugh' : 'love', t: 0 });
  }

  /* ---------------- drawing the show ---------------- */
  private light(part: Part, k: number, i: number): Light {
    const m = this.ms[i];
    const t = performance.now() / 1000;
    if (part === 'dark') return { lampZ: lampZFor(1), lamp: Math.max(0, (k - 0.5) * 2) * 0.6, house: 0, t };
    if (part === 'rise') return { lampZ: lampZFor(1 - ease.inOut(k)), lamp: 0.6 + 0.4 * k, house: 0, t, flicker: m && m.avatar === 'glitch' && !m.human ? 0.4 : 0 };
    if (part === 'react' || part === 'loom') return { lampZ: lampZFor(0) + Math.sin(t * 1.3) * 0.004, lamp: 1, house: 0, t, flicker: m && m.avatar === 'glitch' && !m.human ? 0.5 : 0, dup: m && m.avatar === 'glitch' && !m.human ? 0.7 : 0 };
    if (part === 'pull') { const s = timetable(this.pub!).slots[i]; return { lampZ: lampZFor(pullCurve(s ? s.curve : 'plain', k)), lamp: 1, house: 0, t }; }
    if (part === 'beat') return { lampZ: lampZFor(1), lamp: 1, house: 0, t };
    return { lampZ: lampZFor(1), lamp: 1, house: Math.min(1, k * 4) * 0.9, t };
  }
  private draw(g: CanvasRenderingContext2D, W: number, H: number, w: { part: Part; i: number; k: number; t: number; slotT: number }) {
    if (w.part === 'intro') { this.drawIntro(g, W, H, w.k); return; }
    if (w.part === 'evr' || w.part === 'wait') { this.drawEvr(g, W, H, w.part === 'wait' ? 1 : w.k); return; }
    const m = this.ms[w.i];
    const L = this.light(w.part, w.k, w.i);
    if (w.part === 'react') { this.drawReaction(g, W, H, w.k, m, L); return; }
    if (w.part === 'lights') {
      sheetCanvasFor(this.sheet, W);
      paintSheet(this.sheet, m.objs, L, false);
      const n = Math.max(1, m.objs.length);
      const cx = m.objs.reduce((a, o) => a + o.x, 0) / n, cz = m.objs.reduce((a, o) => a + o.z, 0) / n;
      const cy = m.objs.reduce((a, o) => a + OBJECTS[o.o].stick, 0) / n;
      // the owner beside its junk, everyone else gathered round laughing
      const owner = this.aud.find(x => x.pid === m.pid);
      const others = this.aud.filter(x => x !== owner && x.front).slice(0, 3);
      const spots: [number, number][] = [[0.16, 0.06], [-0.17, 0.1], [0.3, 0.16], [-0.31, 0.18]];
      const cast = [owner, ...others].filter(Boolean) as { a: BubbleActor }[];
      const extra = (P: Projector) => cast.map((x, j) => {
        const q = P.project(cx + spots[j][0] * K, 0, cz + spots[j][1] * K); if (!q) return { d: 0, draw: () => {} };
        x.a.x = q.x; x.a.y = q.y; x.a.r = q.s * 0.045; x.a.dim = 0; x.a.rim = null;
        return { d: q.d, draw: (gg: CanvasRenderingContext2D) => { const lab = x.a.label; x.a.label = j === 0 ? lab : null; x.a.draw(gg, this.faces); x.a.label = lab; } };
      });
      const port = W / H < 0.8;
      renderBackstage(g, W, H, { objs: m.objs, light: L, sheetCanvas: this.sheet, proj: this.P, extra, zoom: 1 + Math.min(1, w.k * 3) * (port ? 0.75 : 0.55), focus: [cx, cy * 0.8, cz], focusY: port ? 0.46 : 0.5 });
      return;
    }
    sheetCanvasFor(this.sheet, W);
    paintSheet(this.sheet, m.objs, L, true);
    const rect = renderAudience(g, W, H, { sheetCanvas: this.sheet, house: 0, t: w.t, zoom: w.part === 'loom' ? 1 + Math.min(0.06, (w.slotT - SHOW.dark - SHOW.rise - SHOW.react) * 0.01) : 1, shake: w.part === 'rise' && w.k > 0.9 ? 1 : 0 });
    // the backs of the audience's heads against the glow
    this.drawAudienceRow(g, W, H, rect.y + rect.h + Math.min(H - rect.y - rect.h, H * 0.3) * 0.62, 1, false);
  }
  /** One row of Bubbles. Facing the sheet (backs, dark) during the show; lit faces when the lights are up. */
  private drawAudienceRow(g: CanvasRenderingContext2D, W: number, H: number, baseY: number, scale: number, lit: boolean) {
    const front = this.aud.filter(x => x.front), back = this.aud.filter(x => !x.front);
    const port = W / H < 0.8;
    const rF = Math.min(W / (front.length * 2.9 + 1), H * (port ? 0.055 : 0.07)) * scale;
    const rB = rF * 0.72;
    back.forEach((x, j) => { const n = back.length; x.a.x = W * (0.08 + 0.84 * ((j + 0.5) / n)); x.a.y = baseY - rF * 1.9; x.a.r = rB; x.a.dim = lit ? 0.15 : 0.88; x.a.rim = lit ? null : 'rgba(255,200,130,0.8)'; x.a.draw(g, this.faces, { shadow: false }); });
    front.forEach((x, j) => { const n = front.length; x.a.x = W * (0.5 + (j - (n - 1) / 2) * Math.min(0.24, 0.9 / n)); x.a.y = baseY - (lit ? rF * 0.9 : 0); x.a.r = rF; x.a.dim = lit ? 0 : 0.8; x.a.rim = lit ? null : 'rgba(255,200,130,0.95)'; x.a.draw(g, this.faces, { shadow: lit, labelColor: lit ? '#fbefdc' : 'rgba(251,239,220,0.8)' }); });
  }
  private drawReaction(g: CanvasRenderingContext2D, W: number, H: number, k: number, m: M, L: Light) {
    const port = W / H < 0.8;
    // a cut to the audience: faces lit by the sheet, the monster's shadow flickering across them
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2b1424'); bg.addColorStop(1, '#0a0510'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(W / 2, -H * 0.2, 0, W / 2, -H * 0.2, H * 1.2); gr.addColorStop(0, 'rgba(255,190,120,0.55)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    // seat backs
    g.fillStyle = '#3a0f1e'; for (let r = 0; r < 2; r++) { const y = H * ((port ? 0.42 : 0.44) + r * 0.26); rrect(g, -10, y, W + 20, H * 0.14, 18); g.fill(); g.fillStyle = '#2a0a15'; }
    const all = this.aud;
    const front = all.filter(x => x.front), back = all.filter(x => !x.front);
    const rF = Math.min(W / (Math.max(front.length, 3) * 2.3), H * (port ? 0.1 : 0.14));
    back.forEach((x, j) => { x.a.x = W * (0.1 + 0.8 * ((j + 0.5) / back.length)); x.a.y = H * (port ? 0.4 : 0.42); x.a.r = rF * 0.72; x.a.dim = 0.25; x.a.rim = null; x.a.draw(g, this.faces, { shadow: false }); });
    front.forEach((x, j) => { const n = front.length; x.a.x = W * (0.5 + (j - (n - 1) / 2) * Math.min(0.26, 0.92 / n)); x.a.y = H * (port ? 0.66 : 0.7); x.a.r = rF; x.a.dim = 0.05; x.a.rim = 'rgba(255,200,130,0.9)'; x.a.draw(g, this.faces, { shadow: false }); });
    // the shadow sweeping over them
    g.save(); g.globalAlpha = 0.28 + 0.2 * Math.sin(k * 9); g.fillStyle = '#05020a';
    const sw = W * (0.6 + m.size * 0.2); g.beginPath(); g.ellipse(W * (0.2 + k * 0.6), H * 0.4, sw * 0.5, H * 0.5, 0.3, 0, Math.PI * 2); g.fill(); g.restore();
    void L;
  }
  private drawIntro(g: CanvasRenderingContext2D, W: number, H: number, k: number) {
    sheetCanvasFor(this.sheet, W);
    paintSheet(this.sheet, [], { lampZ: 0, lamp: Math.min(1, k * 1.5) * 0.5, house: 0, t: k }, true);
    const rect = renderAudience(g, W, H, { sheetCanvas: this.sheet, house: 0.15 * (1 - k), t: k, curtain: Math.max(0, 1 - k * 1.6) });
    g.save(); g.fillStyle = '#ffcf7a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = Math.round(Math.min(W * 0.11, rect.h * 0.22));
    g.font = `${fs}px Creepster, 'Baloo 2', Georgia, serif`;
    const tw = g.measureText('THE SHADOW SHOW').width; if (tw > rect.w * 0.88) { fs = Math.floor(fs * rect.w * 0.88 / tw); g.font = `${fs}px Creepster, 'Baloo 2', Georgia, serif`; }
    g.globalAlpha = Math.min(1, k * 2); g.fillText('THE SHADOW SHOW', W / 2, rect.y + rect.h * 0.45);
    g.font = `600 ${Math.round(Math.min(18, W * 0.04))}px Fredoka, system-ui, sans-serif`; g.fillStyle = '#fbefdc';
    g.fillText(this.ms.length + ' monsters tonight', W / 2, rect.y + rect.h * 0.62);
    g.restore();
    this.drawAudienceRow(g, W, H, rect.y + rect.h + Math.min(H - rect.y - rect.h, H * 0.3) * 0.62, 1, false);
  }

  /* ---------------- "same stuff, more distance" ---------------- */
  private prepEvr() {
    this.evrThumbs = this.ms.map(m => {
      const c = document.createElement('canvas'); c.width = 260; c.height = Math.round(260 * (SHEET.y1 - SHEET.y0) / (SHEET.x1 - SHEET.x0));
      paintSheet(c, m.objs, { lampZ: 0, lamp: 1, house: 0, t: 0 }, true);
      return c;
    });
  }
  private drawEvr(g: CanvasRenderingContext2D, W: number, H: number, k: number) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#20142e'); bg.addColorStop(1, '#0b0712'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (!this.evrThumbs.length) this.prepEvr();
    const n = this.ms.length, port = W / H < 0.8;
    const cols = port ? (n > 2 ? 2 : 1) : Math.min(4, n), rows = Math.ceil(n / cols);
    const top = H * (port ? 0.15 : 0.18), pad = W * 0.03;
    const cw = (W - pad * (cols + 1)) / cols, ch = (H * (port ? 0.7 : 0.66) - pad * (rows - 1)) / rows;
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffcf7a'; g.font = `${Math.round(Math.min(W * 0.085, 54))}px Creepster, 'Baloo 2', Georgia, serif`;
    g.globalAlpha = Math.min(1, k * 3); g.fillText('Same stuff. More distance.', W / 2, H * 0.075);
    g.restore();
    this.ms.forEach((m, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = pad + col * (cw + pad), y = top + row * (ch + pad);
      const appear = clamp(k * 3 - i * 0.25, 0, 1); if (appear <= 0) return;
      g.save(); g.globalAlpha = appear; g.translate(0, (1 - ease.out(appear)) * 20);
      g.fillStyle = 'rgba(255,255,255,0.05)'; rrect(g, x, y, cw, ch, 14); g.fill();
      const th = this.evrThumbs[i]; const tw = cw * 0.92, thh = Math.min(ch * 0.52, tw * th.height / th.width), tww = thh * th.width / th.height;
      g.drawImage(th, x + (cw - tww) / 2, y + ch * 0.05, tww, thh);
      // the junk, lined up on a little shelf
      const shelfY = y + ch * 0.05 + thh + ch * 0.2;
      g.fillStyle = '#6e4a30'; g.fillRect(x + cw * 0.08, shelfY, cw * 0.84, Math.max(3, ch * 0.025));
      const nn = m.objs.length || 1, slot = (cw * 0.8) / nn;
      m.objs.forEach((o, j) => { const spr = objSprite(o.o, 96); const hh = Math.min(ch * 0.16, slot * 0.9 / OBJECTS[o.o].aspect * 0.86, ch * 0.16); const sc = hh / (spr.height * 0.86); g.drawImage(spr, x + cw * 0.1 + slot * (j + 0.5) - spr.width * sc / 2, shelfY - spr.height * sc, spr.width * sc, spr.height * sc); });
      g.fillStyle = '#fbefdc'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.font = `700 ${Math.round(Math.max(11, Math.min(15, cw * 0.075)))}px Fredoka, system-ui, sans-serif`;
      const who = m.pid === this.view!.you ? 'Yours' : m.human ? m.name + '’s' : m.name + '’s (Bubble companion)';
      g.fillText(who, x + cw / 2, shelfY + ch * 0.05);
      g.font = `500 ${Math.round(Math.max(10, Math.min(13, cw * 0.065)))}px Fredoka, system-ui, sans-serif`; g.globalAlpha *= 0.85;
      const tag = m.tag ? (TAGS.find(t => t.id === m.tag) || { label: '' }).label + ' · ' : '';
      g.fillText(tag + '×' + Math.round(m.mag) + ' bigger at the lamp', x + cw / 2, shelfY + ch * 0.05 + 18);
      g.restore();
    });
  }

  /* ---------------- the finale: parade → duck → birds → dawn ---------------- */
  private drawFinale(g: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const sfx = this.ctx.sfx;
    if (t < 0.1) this.setOverlay('');
    this.doOnce('fin:music', () => { this.music.play('parade', SONGS.parade, { vol: 0.55 }); });
    const T_DUCK = 7.6, T_SCATTER = 8.9, T_DAWN = 12.2;
    const lampZ = -1.4 * K;
    let objs: Placed[] = [];
    const n = this.ms.length;
    if (t < T_SCATTER + 0.6) {
      this.ms.forEach((m, j) => {
        const enter = 0.5 + j * 1.35;
        const prog = Math.max(0, t - enter);
        const sheetX = (1.9 - prog * 0.62 + (t > T_DUCK ? (t - T_DUCK) * 0.9 : 0)) * K;   // flee right once the duck quacks
        const beat = Math.floor((t * 112) / 60) % 2;
        const bob = (t < T_DUCK ? Math.abs(Math.sin((t * 112 / 60) * Math.PI)) * 0.06 : t < T_SCATTER ? (t - T_DUCK) * 0.18 : 0) * K;
        m.objs.forEach(o => {
          const s = (ZS - lampZ) / (o.z - lampZ);
          objs.push({ ...o, x: o.x + sheetX / s, dy: bob + (beat ? 0.01 * K : 0) });
        });
      });
      objs = objs.filter(o => { const s = (ZS - lampZ) / (o.z - lampZ); const sx = o.x * s; return sx > -2.2 * K && sx < 2.4 * K; });
    }
    if (t > T_DUCK - 0.2 && t < T_SCATTER + 1.4) objs.push({ o: 'duck', x: -0.7 * K, z: 1.65 * K, r: 0 });
    this.doOnce('fin:duck', () => setTimeout(() => { this.music.stop(0.05); sfx.noise(0.35, { type: 'bandpass', freq: 2500, sweep: 300, vol: 0.2 }); const s = this.fr('still'); if (s) { s.a.emote('quack'); } else this.babble.say('still', 'quack'); }, T_DUCK * 1000));
    this.doOnce('fin:flee', () => setTimeout(() => { const r = this.fr('rush'); if (r) r.a.emote('scream'); sfx.whoosh(true, 0.8); }, (T_DUCK + 0.5) * 1000));
    this.doOnce('fin:birds', () => setTimeout(() => { for (let i = 0; i < 6; i++) sfx.noise(0.1, { type: 'bandpass', freq: 1400 + i * 200, vol: 0.12, at: i * 0.07 }); this.music.play('dawn', SONGS.dawn, { vol: 0.45 }); }, T_SCATTER * 1000));
    this.doOnce('fin:cheer', () => setTimeout(() => { this.aud.forEach((x, i) => x.a.after(i * 0.12, () => x.a.emote(x.human ? 'yay' : x.a.slug === 'still' ? 'nod' : 'cheer', { vol: 0.5 }))); }, (T_DAWN + 0.5) * 1000));
    const dawn = clamp((t - T_SCATTER) / 2.6, 0, 1);
    const house = clamp((t - T_DAWN) / 1.5, 0, 1) * 0.7;
    sheetCanvasFor(this.sheet, W);
    paintSheet(this.sheet, t < T_SCATTER ? objs : objs.filter(o => o.o === 'duck'), { lampZ, lamp: 1, house: 0, t }, true);
    if (dawn > 0) this.paintDawn(this.sheet, dawn, t - T_SCATTER);
    const rect = renderAudience(g, W, H, { sheetCanvas: this.sheet, house, t });
    this.drawAudienceRow(g, W, H, rect.y + rect.h + Math.min(H - rect.y - rect.h, H * 0.3) * 0.62, 1, house > 0.3);
    if (t > T_DAWN + 1.2) this.setOverlay('end');
    void n;
  }
  /** The sheet becomes a window: dawn, a rising sun, and the monsters as a flock of birds flying into it. */
  private paintDawn(c: HTMLCanvasElement, k: number, tt: number) {
    const g = c.getContext('2d')!, W = c.width, H = c.height;
    g.save(); g.globalAlpha = Math.min(1, k * 1.3);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#3a2a6a'); sky.addColorStop(0.5, '#e07a8a'); sky.addColorStop(1, '#ffc27a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sunY = H * (1.05 - k * 0.45);
    const sg = g.createRadialGradient(W * 0.5, sunY, 0, W * 0.5, sunY, W * 0.5); sg.addColorStop(0, 'rgba(255,248,220,1)'); sg.addColorStop(0.15, 'rgba(255,225,160,0.9)'); sg.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    g.restore();
    // birds: one flock per monster object, flapping up and away
    g.save(); g.fillStyle = '#1d1430'; g.strokeStyle = '#1d1430';
    let b = 0;
    this.ms.forEach((m, j) => m.objs.forEach((_o, q) => {
      for (let i = 0; i < 3; i++, b++) {
        const seed = b * 1.37 + j;
        const x0 = W * (0.25 + ((seed * 0.618) % 0.5)), y0 = H * (0.55 + ((seed * 0.33) % 0.3));
        const fly = Math.max(0, tt - (i + q) * 0.08);
        const x = x0 + fly * W * (0.12 + ((seed * 0.21) % 0.12)), y = y0 - fly * H * (0.22 + ((seed * 0.17) % 0.15));
        const s = Math.max(2, W * 0.018 * (1 - Math.min(0.7, fly * 0.18)));
        const flap = Math.sin(tt * 14 + seed * 3) * 0.7;
        g.lineWidth = Math.max(1, s * 0.28); g.lineCap = 'round';
        g.beginPath(); g.moveTo(x - s, y - s * flap * 0.6); g.quadraticCurveTo(x - s * 0.4, y - s * 0.2, x, y); g.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s, y - s * flap * 0.6); g.stroke();
      }
    }));
    g.restore();
  }

  /* ---------------- floating reaction faces ---------------- */
  private drawFloats(g: CanvasRenderingContext2D, _W: number, _H: number, dt: number) {
    this.floats = this.floats.filter(f => f.t < 1.6);
    for (const f of this.floats) {
      f.t += dt;
      const x = this.aud.find(a => a.pid === f.pid); if (!x) continue;
      const face = this.faces(x.a.slug, f.mood);
      const sz = x.a.r * 1.3;
      g.save(); g.globalAlpha = Math.max(0, 1 - f.t / 1.6);
      const yy = x.a.y - x.a.r * 2.2 - f.t * x.a.r * 2.4;
      if (face) g.drawImage(face, x.a.x - sz / 2 + Math.sin(f.t * 6) * 4, yy - sz, sz, sz);
      g.restore();
    }
  }

  /* ---------------- overlays (DOM) ---------------- */
  private banner(text: string) { const el = h('div', { class: 'sm-banner' }, text); this.wrap.appendChild(el); setTimeout(() => el.remove(), 2500); }
  private setOverlay(key: string) {
    if (this.overlay === key) return;
    this.overlay = key; clear(this.over);
    this.over.classList.toggle('dim', key === 'end');
    const v = this.view; if (!v) return;
    const me = v.players.find(p => p.pid === v.you);
    if (key === 'intro' || key === '' || key === 'wait') { if (key === 'wait') this.over.appendChild(h('div', { class: 'sm-cap' }, this.ctx.room.isHost ? 'One last thing…' : 'Waiting for the host…')); return; }
    if (key === 'evr') { this.over.appendChild(h('div', { class: 'sm-cap' }, 'The closer you hold it, the bigger it looms.', h('small', null, 'Every monster here was a pile of ordinary things, held close to the light.'))); return; }
    if (key === 'end') { this.endCard(); return; }
    const [kind, si] = key.split(':'); const i = Number(si); const m = this.ms[i]; if (!m) return;
    const owner = m.pid === v.you ? 'Your' : m.human ? m.name + '’s' : m.name + '’s';
    if (kind === 'dark') { this.over.appendChild(h('div', { class: 'sm-cap' }, 'Monster ' + (i + 1) + ' of ' + this.ms.length + ' · ' + owner + ' monster', !m.human ? h('small', null, 'Bubble companion') : null)); return; }
    if (kind === 'pull') {
      const bar = h('i');
      const btn = h('button', { class: 'sm-btn sm-pull', 'aria-label': 'Hold to pull the light back' }, 'Hold to pull the light back', bar) as HTMLButtonElement;
      hold(btn, 650, {
        start: () => { this.ctx.sfx.unlock(); this.ctx.sfx.tone(200, 0.65, { type: 'triangle', glide: 120, vol: 0.05 }); },
        progress: (kk) => { bar.style.width = (kk * 100) + '%'; },
        done: () => { this.localPull = { i, at: this.now() }; this.ctx.room.act('live', { k: 'pull', i }); this.setOverlay('watch:' + i); },
        cancel: () => { bar.style.width = '0'; }
      });
      this.over.appendChild(h('div', { class: 'sm-cap' }, 'Your monster. When you’re ready…'));
      this.over.appendChild(btn);
      if (me && me.human) this.over.appendChild(this.reactRow(i));
      return;
    }
    if (kind === 'watch') {
      if (m.human && m.pid !== v.you) this.over.appendChild(h('div', { class: 'sm-cap' }, m.name + ' holds the lamp', h('small', null, 'They decide when the light pulls back')));
      else if (!m.human) this.over.appendChild(h('div', { class: 'sm-cap' }, owner + ' monster: ' + (COMPANION_NOTE[m.avatar] || ''), h('small', null, 'Bubble companion')));
      if (me) this.over.appendChild(this.reactRow(i));
      return;
    }
    if (kind === 'lights') {
      const tag = m.tag ? (TAGS.find(t => t.id === m.tag) || { label: '' }).label : '';
      const list = listOf(m.objs.map(o => OBJECTS[o.o].name));
      const what = m.human ? (tag ? owner + ' “' + tag.toLowerCase() + '”' : owner + ' monster') : owner + ' monster, ' + (COMPANION_NOTE[m.avatar] || '').replace(/\.$/, '') + ',';
      this.over.appendChild(h('div', { class: 'sm-cap' }, what + ' was ' + list + '.', !m.human ? h('small', null, 'Bubble companion') : null));
    }
  }
  private reactRow(i: number) {
    const me = this.view!.players.find(p => p.pid === this.view!.you);
    const av = me ? me.avatar : 'loopie';
    const row = h('div', { class: 'sm-react', role: 'group', 'aria-label': 'React' });
    const mk = (r: string, mood: string, label: string) => h('button', { 'aria-label': label, onclick: (e: Event) => { this.ctx.sfx.unlock(); this.ctx.sfx.gesture(e); this.ctx.metrics.mark(e); const now = performance.now(); if ((this as any)._lr && now - (this as any)._lr < 450) return; (this as any)._lr = now; this.react(this.view!.you!, r, true); this.ctx.room.act('live', { k: 'react', r, i }); } }, h('img', { alt: '', src: this.ctx.faces.url(av as Slug, mood) }));
    row.appendChild(mk('scream', 'surprised', 'Scream'));
    row.appendChild(mk('laugh', 'laugh', 'Laugh'));
    row.appendChild(mk('hug', 'love', 'Hug it'));
    return row;
  }
  private endCard() {
    const v = this.view!, ctx = this.ctx;
    const mine = this.ms.find(m => m.pid === v.you);
    const box = h('div', { class: 'sm-end' });
    box.appendChild(h('div', { class: 'sm-line' }, 'Ritual complete'));
    if (mine) {
      const c = h('canvas', { width: '1080', height: '1350' }) as HTMLCanvasElement;
      box.appendChild(h('div', { class: 'sm-card' }, c));
      this.drawCard(c, mine);
      const me = v.players.find(p => p.pid === v.you);
      const acts = h('div', { class: 'sm-acts' });
      if (me && me.human) {
        const cb = h('input', { type: 'checkbox' }) as HTMLInputElement; cb.checked = !!v.consent[me.pid];
        cb.addEventListener('change', () => { ctx.room.act('consent', { share: cb.checked }); setTimeout(() => this.drawCard(c, mine), 200); });
        acts.appendChild(h('label', { class: 'sm-consent' }, cb, 'Put my name and tag on the card'));
      }
      acts.appendChild(h('button', { class: 'sm-btn ghost', onclick: () => c.toBlob((b) => { if (b) ctx.download('shadow-monster.png', b).then(ok => { if (!ok) ctx.toast('Saving isn’t available here'); }); }, 'image/png') }, 'Save the card'));
      box.appendChild(acts);
    }
    const nav = h('div', { class: 'sm-acts' });
    if (ctx.room.isHost) nav.appendChild(h('button', { class: 'sm-btn', onclick: () => ctx.next('replay') }, 'Build another monster'));
    nav.appendChild(h('button', { class: 'sm-btn ghost', onclick: () => ctx.next('hub') }, 'Try another ritual'));
    box.appendChild(nav);
    this.over.appendChild(box);
  }
  private drawCard(c: HTMLCanvasElement, m: M) {
    const g = c.getContext('2d')!, W = c.width, H = c.height, v = this.view!;
    const named = !!v.consent[m.pid];
    g.fillStyle = '#120c1f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffcf7a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = "92px Creepster, 'Baloo 2', Georgia, serif";
    g.fillText('SHADOW MONSTERS', W / 2, 90);
    const sh = document.createElement('canvas'); sh.width = 980; sh.height = Math.round(980 * (SHEET.y1 - SHEET.y0) / (SHEET.x1 - SHEET.x0));
    paintSheet(sh, m.objs, { lampZ: 0, lamp: 1, house: 0, t: 0 }, true);
    g.drawImage(sh, 50, 160, 980, sh.height);
    g.fillStyle = '#fbefdc'; g.font = '600 34px Fredoka, system-ui, sans-serif';
    const tag = named && m.tag ? '“' + (TAGS.find(t => t.id === m.tag) || { label: '' }).label + '”' : 'What it felt like';
    g.fillText(tag, W / 2, 160 + sh.height + 44);
    // what it was made of
    const shelfY = 1150;
    const tbl = g.createLinearGradient(0, shelfY, 0, H); tbl.addColorStop(0, '#8a5c38'); tbl.addColorStop(1, '#4a3020'); g.fillStyle = tbl; g.fillRect(0, shelfY, W, H - shelfY);
    const nn = Math.max(1, m.objs.length), slot = 900 / nn;
    m.objs.forEach((o, j) => { const spr = objSprite(o.o, 256); const hh = Math.min(260, slot * 0.85 / OBJECTS[o.o].aspect); const sc = hh / (spr.height * 0.86); g.drawImage(spr, 90 + slot * (j + 0.5) - spr.width * sc / 2, shelfY - spr.height * sc + 20, spr.width * sc, spr.height * sc); });
    g.fillStyle = '#fbefdc'; g.font = '600 34px Fredoka, system-ui, sans-serif'; g.fillText('What it was made of', W / 2, shelfY + 70);
    g.font = '500 26px Fredoka, system-ui, sans-serif'; g.globalAlpha = 0.8;
    g.fillText((named ? (m.human ? m.name : m.name + ' · Bubble companion') + ' · ' : '') + 'ThinkStill Reflect', W / 2, H - 50);
    g.globalAlpha = 1;
  }
}
