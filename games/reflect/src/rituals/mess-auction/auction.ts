/* The Glorious Mess Auction — the sale, on the room's clock.
 *   For every lot: the attendant whisks the velvet cloth off a blind portrait (gasps) → "Opening at ten bubbles!" →
 *   paddles up: the price climbs while you HOLD your paddle; let go and you're out → the Bubble collectors crack one
 *   by one (Rush panics, Loopie raises it again, Sync copies whoever let go first, Drop weeps and holds on far too
 *   long) → going once, going twice → SOLD.
 *   Then the estimates come out: what each artist secretly thought their mess was worth, next to what it sold for.
 *   Finale: the Museum of Glorious Messes — every lot on the wall, yours behind a velvet rope and a laser grid, and at
 *   the end, the smallest exhibit of all: your own price tag. */
import type { RoomView, Slug } from '../../room/protocol';
import type { SceneCtx } from '../../console/types';
import { h, clear, Surface, clamp, ease, lerp } from '../../ui/dom';
import { BubbleActor } from '../../actor/bubble';
import type { Babble } from '../../actor/babble';
import { PICTS, rrect } from '../../actor/picts';
import { Music } from '../../audio/music';
import { hashStr } from '../../room/ritual';
import { AUC, P0, PROMPTS, PADDLE, HUMAN_PADDLES, fmt, worth, priceAt } from './content';
import { Stroke, decode } from './portrait';
import { layout, Layout, drawHouse, drawFrame, drawBoard, drawStamp, drawPodium, drawPaddle, drawSoldDot, drawMuseum, Exhibit } from './house';
import { MaPub, Lot, Bidder, timetable } from './logic';
import { SONGS } from './songs';

const NAME: Record<Slug, string> = { loopie: 'Loopie', glitch: 'Glitch', patch: 'Patch', drop: 'Drop', rush: 'Rush', still: 'Still', sync: 'Sync' };
interface LotV { i: number; pid: string; name: string; human: boolean; avatar: Slug; strokes: Stroke[]; est: number; seed: number; tape: boolean; }
interface Seat { id: string; slug: Slug; human: boolean; pid: string | null; name: string; num: number; a: BubbleActor; }
type Part = 'intro' | 'present' | 'open' | 'bid' | 'going' | 'sold' | 'gap' | 'wait';
interface Where { part: Part; i: number; k: number; lot: Lot | null; lots: Lot[]; now: number; gapAt: number; }

export class AuctionDirector {
  private sf = new Surface();
  private wrap: HTMLElement;
  private over: HTMLElement;
  private raf = 0;
  private view: RoomView | null = null;
  private pub: MaPub | null = null;
  private lots: LotV[] = [];
  private seats: Seat[] = [];
  private auc!: BubbleActor;
  private att!: BubbleActor;
  private extras: Record<string, BubbleActor> = {};
  private once = new Set<string>();
  private phase: 'reveal' | 'finale' = 'reveal';
  private finaleAt = 0;
  private overlay = '';
  private last = performance.now();
  private faces: (s: string, m: string) => CanvasImageSource | null;
  private finaleSent = false;
  private seen = 0;
  private local: { ins: Record<string, number>; drops: Record<string, number> } = { ins: {}, drops: {} };
  private lastSend = 0;
  private gavel = 0;
  private flash = 0;
  private shownPrice = -1;
  private tickAt = 0;
  private chantAt = 0;
  private paddle: { i: number; btn: HTMLButtonElement; state: 'ready' | 'up' | 'down' | 'late'; downAt: number } | null = null;
  private mirror: { big: string; small: string } | null = null;
  private museum: { ex: Exhibit[]; path: { t: number; x: number }[]; tAlarm: number; tOut: number; tEnd: number; mineK: number; tagK: number } | null = null;
  constructor(private ctx: SceneCtx, parent: HTMLElement, private babble: Babble, private music: Music) {
    this.faces = (s, m) => ctx.faces.get(s, m);
    this.sf.maxDpr = 1.5;
    this.over = h('div', { class: 'ma-over' });
    this.wrap = h('div', { class: 'ma-stage' }, this.sf.canvas, this.over);
    parent.appendChild(this.wrap);
    this.raf = requestAnimationFrame((n) => this.frame(n));
    (globalThis as any).__maAuction = this;
  }
  destroy() { cancelAnimationFrame(this.raf); this.wrap.remove(); this.music.stop(0.3); if ((globalThis as any).__maAuction === this) delete (globalThis as any).__maAuction; }
  resize() { this.sf.fit(); }
  private doOnce(k: string, f: () => void) { if (!this.once.has(k)) { this.once.add(k); f(); } }
  private now() { return this.ctx.room.serverNow(); }

  /* ---------------- room updates ---------------- */
  update(v: RoomView, _prev: RoomView | null) {
    this.view = v;
    this.pub = v.pub as MaPub;
    if (!this.lots.length && v.revealed && this.pub && this.pub.revealAt) this.setup(v);
    if (v.phase === 'finale' && this.phase !== 'finale') { this.phase = 'finale'; this.finaleAt = performance.now(); this.setOverlay(''); }
    for (const ev of v.live) {
      if (ev.n <= this.seen) continue;
      this.seen = ev.n;
      if (ev.pid === v.you) continue;
      const s = this.seats.find(x => x.human && x.pid === ev.pid); if (!s) continue;
      if (ev.data && ev.data.k === 'in') s.a.emote('bid', { vol: 0.55 });
      if (ev.data && ev.data.k === 'drop') s.a.emote('shake', { vol: 0.45 });
    }
  }
  private setup(v: RoomView) {
    const pub = this.pub!;
    const byPid = new Map(v.players.map(p => [p.pid, p]));
    this.lots = pub.order.map((pid, i) => {
      const c = pub.cast.find(x => x.pid === pid), p = byPid.get(pid);
      const r = (v.revealed && v.revealed[pid]) || { strokes: [], est: 5 };
      const avatar = (c ? c.avatar : p ? p.avatar : 'loopie') as Slug;
      return { i, pid, name: p ? p.name : c ? c.name : NAME[avatar], human: c ? c.human : !!(p && p.human), avatar, strokes: decode(r.strokes), est: Number(r.est) || 5, seed: hashStr(pid) % 997, tape: hashStr(pid + ':tape') % 3 === 0 };
    });
    // the room: Bubble collectors either side, the people in the middle
    const bubbles = (pub.collectors || []).map(s => ({ id: 'bot:' + s, slug: s, human: false, pid: (pub.cast.find(c => !c.human && c.avatar === s) || { pid: null as string | null }).pid, name: NAME[s], num: PADDLE[s] || 5 }));
    const humans = pub.cast.filter(c => c.human).map((c, j) => ({ id: c.pid, slug: c.avatar, human: true, pid: c.pid as string | null, name: c.pid === v.you ? 'You' : c.name, num: HUMAN_PADDLES[j % HUMAN_PADDLES.length] }));
    const half = Math.ceil(bubbles.length / 2);
    const row = [...bubbles.slice(0, half), ...humans, ...bubbles.slice(half)];
    this.seats = row.map(s => { const a = new BubbleActor(s.slug, 0, 0, 20, this.babble); a.label = s.name; return { ...s, a }; });
    this.auc = new BubbleActor(pub.staff ? pub.staff.auctioneer : 'glitch', 0, 0, 20, this.babble);
    this.att = new BubbleActor(pub.staff ? pub.staff.attendant : 'patch', 0, 0, 20, this.babble); this.att.facing = -1;
    const pre: [string, string][] = [];
    const slugs = new Set<string>([...this.seats.map(s => s.slug), this.auc.slug, this.att.slug, 'drop', 'still', 'rush']);
    for (const s of slugs) for (const m of ['neutral', 'surprised', 'cry', 'laugh', 'love', 'wow', 'worried', 'calm', 'happy', 'celebrate', 'shy', 'cool', 'confused', 'determined', 'dizzy']) pre.push([s, m]);
    this.ctx.faces.preload(pre);
  }
  /** The authority's state plus my own paddle, applied the moment I move it. */
  private eff(): MaPub {
    const pub = this.pub!, me = this.view && this.view.you;
    if (!me) return pub;
    let ins = pub.ins || {}, drops = pub.drops || {};
    for (const [i, t] of Object.entries(this.local.ins)) if (!(ins[i] && ins[i][me] != null)) ins = { ...ins, [i]: { ...(ins[i] || {}), [me]: t } };
    for (const [i, t] of Object.entries(this.local.drops)) if (!(drops[i] && drops[i][me] != null)) drops = { ...drops, [i]: { ...(drops[i] || {}), [me]: t } };
    return { ...pub, ins, drops };
  }

  /** Where the auction is right now (server clock). */
  private where(): Where {
    const pub = this.eff(), now = this.now();
    if (!pub.revealAt) return { part: 'intro', i: -1, k: 0, lot: null, lots: [], now, gapAt: 0 };
    const tt = timetable(pub, now);
    const base = { lots: tt.lots, now, gapAt: tt.gapAt };
    if (!tt.lots.length || now < tt.lots[0].start) return { part: 'intro', i: -1, k: (now - pub.revealAt) / (AUC.intro * 1000), lot: null, ...base };
    for (const L of tt.lots) {
      if (now >= L.next) continue;
      if (now < L.open) return { part: 'present', i: L.i, k: (now - L.start) / (L.open - L.start), lot: L, ...base };
      if (now < L.bid) return { part: 'open', i: L.i, k: (now - L.open) / (L.bid - L.open), lot: L, ...base };
      if (!L.decided || now < L.end) return { part: 'bid', i: L.i, k: (now - L.bid) / 1000, lot: L, ...base };
      if (now < L.sold) return { part: 'going', i: L.i, k: (now - L.end) / (AUC.going * 1000), lot: L, ...base };
      return { part: 'sold', i: L.i, k: (now - L.sold) / (AUC.sold * 1000), lot: L, ...base };
    }
    if (now < tt.end) return { part: 'gap', i: -1, k: (now - tt.gapAt) / (AUC.gap * 1000), lot: null, ...base };
    return { part: 'wait', i: -1, k: 0, lot: null, ...base };
  }
  /** test hook */
  state() { if (!this.lots.length) return { part: 'setup' }; if (this.phase === 'finale') return { part: 'finale', t: (performance.now() - this.finaleAt) / 1000 }; const w = this.where(); return { part: w.part, i: w.i, k: w.k, paddle: this.paddle ? this.paddle.state : null, price: w.lot ? w.lot.price : null, decided: w.lot ? w.lot.decided : null, lots: w.lots.map(l => ({ pid: l.pid, price: l.price, winner: l.winner.map(b => b.id), decided: l.decided })) }; }

  /* ---------------- frame ---------------- */
  private frame(now: number) {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.sf.fit();
    const g = this.sf.g, W = this.sf.pw, H = this.sf.ph;
    if (!this.lots.length || W < 8) return;
    for (const s of this.seats) s.a.update(dt);
    this.auc.update(dt); this.att.update(dt);
    for (const a of Object.values(this.extras)) a.update(dt);
    this.gavel = Math.max(0, this.gavel - dt * 2.6); this.flash = Math.max(0, this.flash - dt * 3);
    if (this.phase === 'finale') this.drawFinale(g, W, H, (now - this.finaleAt) / 1000);
    else {
      const w = this.where();
      this.drive(w);
      this.draw(g, W, H, w);
      this.updatePaddle(w);
      if (w.part === 'wait' && this.ctx.room.isHost && !this.finaleSent) { this.finaleSent = true; this.ctx.room.act('finale'); }
    }
    this.ctx.metrics.frame(now);
  }

  /* ---------------- once-per-beat: sound, Bubble business, overlays ---------------- */
  private seatOf(id: string) { return this.seats.find(s => s.id === id); }
  private artistSeat(lot: LotV) { return this.seats.find(s => s.pid === lot.pid); }
  private drive(w: Where) {
    const sfx = this.ctx.sfx;
    if (w.part === 'intro') {
      this.doOnce('intro', () => {
        this.music.play('minuet', SONGS.minuet, { vol: 0.4 }); sfx.whoosh(true, 1.1);
        this.auc.after(0.9, () => { this.auc.emote('talk', { vol: 0.7 }); this.gavel = 1; sfx.thud(); });
        this.seats.forEach((s, j) => s.a.after(1.3 + j * 0.1, () => s.a.emote(s.human ? 'yay' : s.slug === 'still' ? 'nod' : 'cheer', { vol: 0.4 })));
      });
      this.setOverlay('intro'); return;
    }
    if (w.part === 'gap') { this.doOnce('gap', () => { this.music.play('waltz', SONGS.waltz, { vol: 0.32 }); sfx.chime([523.25, 659.25, 783.99]); this.mirror = this.computeMirror(w); }); this.gapSounds(w.k); this.setOverlay('gap'); return; }
    if (w.part === 'wait') { this.setOverlay('wait'); return; }
    const lot = this.lots[w.i], L = w.lot!;
    const key = w.part + ':' + w.i;
    if (w.part === 'present') { this.doOnce(key, () => this.present(lot)); this.setOverlay('present:' + w.i); return; }
    if (w.part === 'open') { this.doOnce(key, () => this.openLot()); this.setOverlay('bidding:' + w.i); return; }
    if (w.part === 'bid') { this.doOnce(key, () => this.music.play('bidding', SONGS.bidding, { vol: 0.36 })); this.bidding(lot, L, w); this.setOverlay('bidding:' + w.i); return; }
    if (w.part === 'going') {
      this.doOnce(key, () => { this.music.stop(0.15); this.tap(); this.auc.voiceSay('talk', { n: 3, vol: 0.6 }); });
      if (w.k >= 0.5) this.doOnce(key + ':2', () => { this.tap(); this.auc.voiceSay('talk', { n: 3, vol: 0.6, pitch: 1.1 }); });
      this.bidding(lot, L, w);
      this.setOverlay('going:' + w.i); return;
    }
    if (w.part === 'sold') { this.doOnce(key, () => this.sold(lot, L)); this.setOverlay('sold:' + w.i); }
  }
  private tap() { this.gavel = 0.6; this.ctx.sfx.tone(320, 0.06, { type: 'square', vol: 0.08, filter: 900 }); this.ctx.sfx.noise(0.04, { type: 'bandpass', freq: 1200, vol: 0.2 }); }
  private present(lot: LotV) {
    const sfx = this.ctx.sfx;
    this.shownPrice = -1;
    this.att.after(0.2, () => { this.att.hop(0.6); });
    setTimeout(() => { sfx.whoosh(true, 0.45); sfx.noise(0.3, { type: 'bandpass', freq: 700, sweep: 2400, vol: 0.08 }); }, 480);
    // the room sees it
    const crowd = this.seats.filter(s => !s.human && s.pid !== lot.pid);
    setTimeout(() => { crowd.slice(0, 3).forEach((s, j) => s.a.after(j * 0.12, () => s.a.voiceSay('ooh', { vol: 0.5 }))); }, 1150);
    const art = this.artistSeat(lot);
    if (art) art.a.after(1.6, () => {
      if (art.human) { art.a.emote('shy', { vol: 0.5 }); return; }
      const e = ({ rush: 'hide', drop: 'cry', loopie: 'giggle', still: 'nod', sync: 'yay', glitch: 'cool', patch: 'love' } as Record<string, any>)[art.slug] || 'shy';
      art.a.emote(e, { vol: 0.6 });
    });
    else if (lot.avatar === this.auc.slug) this.auc.after(1.6, () => this.auc.emote('cool', { vol: 0.6 }));
    else if (lot.avatar === this.att.slug) this.att.after(1.6, () => this.att.emote('shy', { vol: 0.6 }));
    // the attendant "restores" some of them
    if (lot.tape) {
      this.att.after(1.75, () => { this.att.speak('tape', 1.3); this.att.emote('talk', { vol: 0.5 }); });
      setTimeout(() => { sfx.noise(0.12, { type: 'highpass', freq: 3000, vol: 0.18 }); sfx.noise(0.1, { type: 'highpass', freq: 2600, vol: 0.15, at: 0.18 }); }, 2000);
      this.auc.after(2.4, () => this.auc.emote('huh', { vol: 0.5 }));
    }
  }
  private openLot() {
    this.auc.voiceSay('talk', { n: 6, vol: 0.7 }); this.auc.hop(0.3); this.tap();
    this.seats.forEach((s, j) => { if (!s.human) setTimeout(() => this.ctx.sfx.pop(500 + j * 60), 1100 + j * 80); });
  }
  private bidding(lot: LotV, L: Lot, w: Where) {
    const sfx = this.ctx.sfx, now = w.now;
    const price = this.priceNow(L, now);
    if (price !== this.shownPrice) {
      if (this.shownPrice >= 0 && performance.now() > this.tickAt) { this.tickAt = performance.now() + 85; sfx.tick(0.7 + Math.min(1.6, Math.log10(Math.max(10, price)) - 1)); this.flash = 0.6; }
      this.shownPrice = price;
    }
    if (w.part === 'bid' && performance.now() > this.chantAt) { this.chantAt = performance.now() + 1150; this.auc.voiceSay('talk', { n: 5, vol: 0.32, pitch: 1 + Math.min(0.35, w.k * 0.04) }); }
    // the Bubbles crack, one by one
    L.bidders.forEach(b => {
      if (b.human || !Number.isFinite(b.drop) || now < b.drop || b.drop <= L.bid) return;
      if (L.winner.some(x => x.id === b.id)) return;
      this.doOnce('drop:' + L.i + ':' + b.id, () => {
        const s = this.seatOf(b.id); if (!s) return;
        const a = s.a;
        switch (s.slug) {
          case 'rush': a.emote('gasp', { vol: 0.7 }); a.after(0.7, () => a.emote('uhoh', { vol: 0.6 })); break;
          case 'loopie': a.emote('giggle', { vol: 0.5 }); this.auc.after(0.7, () => { this.auc.emote('shake', { vol: 0.5 }); }); a.after(1.1, () => a.speak('again', 1.2)); break;
          case 'drop': a.emote('sob', { vol: 0.6 }); break;
          case 'still': a.emote('nod', { vol: 0.5 }); break;
          case 'sync': a.emote('gasp', { vol: 0.5 }); a.after(0.3, () => a.speak('again', 1.0)); break;
          default: a.emote('uhoh', { vol: 0.5 });
        }
      });
    });
    // whoever is smitten makes it known
    if (w.part === 'bid' && price >= 600) this.doOnce('smitten:' + L.i, () => {
      const holding = L.bidders.filter(b => !b.human && (!Number.isFinite(b.drop) || b.drop > now));
      const top = holding.sort((x, y) => y.drop - x.drop)[0]; if (!top) return;
      const s = this.seatOf(top.id); if (!s) return;
      if (s.slug === 'rush') s.a.emote('scream', { vol: 0.6 }); else if (s.slug === 'drop') s.a.emote('cry', { vol: 0.6 }); else s.a.emote('love', { vol: 0.5 });
    });
    void lot;
  }
  private priceNow(L: Lot, now: number) { if (now < L.bid) return P0; if (L.decided && now >= L.end) return L.price; return priceAt((Math.min(now, L.cap) - L.bid) / 1000); }
  private sold(lot: LotV, L: Lot) {
    const sfx = this.ctx.sfx, v = this.view!;
    this.gavel = 1; this.flash = 1;
    sfx.thud(); sfx.crack(); this.music.stop(0.1);
    this.music.hit('timpani', ['D2'], { len: 1.1, vol: 1.2 }); this.music.hit('brass', ['D4+F#4+A4'], { at: 0.06, len: 1.1, vol: 0.9 });
    this.auc.voiceSay('cheer', { vol: 0.6 });
    for (const b of L.winner) {
      const s = this.seatOf(b.id); if (!s) continue;
      const a = s.a;
      if (s.human) { a.emote('yay', { vol: 0.7 }); continue; }
      switch (s.slug) {
        case 'still': a.emote('nod', { vol: 0.6 }); a.prop = PICTS.tea; a.after(2.6, () => { a.prop = null; }); break;
        case 'drop': a.emote('cry', { vol: 0.7 }); a.after(1.0, () => a.emote('love', { quiet: true })); break;
        case 'rush': a.emote('scream', { vol: 0.7 }); a.after(1.0, () => a.emote('cheer', { vol: 0.6 })); break;
        case 'loopie': a.emote('giggle', { vol: 0.6 }); a.after(0.8, () => a.speak('again', 1.4)); break;
        default: a.emote('cheer', { vol: 0.6 });
      }
    }
    const art = this.artistSeat(lot);
    if (art && !L.winner.some(b => b.id === art.id)) art.a.after(0.5, () => art.a.emote(art.human ? 'yay' : art.slug === 'drop' ? 'cry' : 'love', { vol: 0.6 }));
    if (L.winner.some(b => b.id === v.you)) { this.banner(L.winner.length > 1 ? 'Shared! You own a piece of it' : 'It’s yours!'); sfx.chime(); }
    else if (lot.pid === v.you) { this.banner(L.winner.length ? 'Your mess sold for ' + fmt(L.price) + '!' : 'Nobody could part with a bubble'); sfx.chime([523.25, 659.25, 783.99, 1046.5]); }
    setTimeout(() => this.music.play('minuet', SONGS.minuet, { vol: 0.3 }), 1300);
  }
  private gapSounds(k: number) {
    const n = this.lots.length;
    this.lots.forEach((l, i) => { const at = 0.06 + i * 0.07; if (k >= at) this.doOnce('gap:' + i, () => { this.ctx.sfx.pop(420 + i * 70); }); if (k >= at + 0.08) this.doOnce('gapx:' + i, () => { this.ctx.sfx.tone(l.pid === this.view!.you ? 1046 : 784, 0.18, { vol: 0.08 }); }); });
    void n;
  }

  /* ---------------- the house ---------------- */
  private byLine(lot: LotV) { return lot.pid === this.view!.you ? 'by you' : lot.human ? 'by ' + lot.name : 'by ' + lot.name + ' · Bubble companion'; }
  private winnerName(L: Lot) {
    const me = this.view!.you;
    const names = L.winner.map(b => b.id === me ? 'you' : b.human ? (this.pub!.cast.find(c => c.pid === b.id) || { name: 'Someone' }).name : NAME[b.slug]);
    return names.length > 2 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(' and ');
  }
  private draw(g: CanvasRenderingContext2D, W: number, H: number, w: Where) {
    if (w.part === 'gap' || w.part === 'wait') { this.drawGap(g, W, H, w.part === 'wait' ? 1.5 : w.k); return; }
    const L = layout(W, H, this.seats.length), t = performance.now() / 1000;
    const intro = w.part === 'intro';
    const lot = this.lots[intro ? 0 : w.i], LT = w.lot;
    const push = w.part === 'bid' ? Math.min(1, w.k / 9) : w.part === 'going' ? 1 : w.part === 'sold' ? Math.max(0, 1 - w.k * 3) : 0;
    const z = 1 + ease.inOut(push) * 0.05, fy0 = L.frame.y + L.frame.h * 0.6;
    g.save(); g.translate(W / 2, fy0); g.scale(z, z); g.translate(-W / 2, -fy0);
    drawHouse(g, W, H, L, { t, spot: intro ? clamp(w.k * 2 - 0.5, 0, 1) : 1, house: intro ? 0.45 : 0.16, curtain: intro ? Math.max(0, 1 - w.k * 1.5) : 0 });
    // the lot on its easel
    const pk = w.part === 'present' ? w.k * AUC.present : 99;
    const cloth = intro ? 1 : w.part === 'present' ? 1 - ease.inOut(clamp((pk - 0.45) / 0.7, 0, 1)) : 0;
    const tape = lot.tape && !intro ? clamp((pk - 1.95) / 0.25, 0, 1) : 0;
    const title = (PROMPTS[this.pub!.prompt] || PROMPTS[0]).title;
    drawFrame(g, L.frame, lot.strokes, { t, cloth, boil: Math.max(1, L.frame.w * 0.005), plaque: cloth < 0.7 ? title : undefined, sub: cloth < 0.7 ? this.byLine(lot) : undefined, seed: lot.seed, tape });
    if (w.part === 'sold') drawSoldDot(g, L.frame, w.k * AUC.sold);
    // the board
    if (intro) drawBoard(g, L.board, this.lots.length + ' lots', 'tonight', 0, 'THE SALE');
    else if (w.part === 'present') drawBoard(g, L.board, 'Lot ' + (w.i + 1) + ' of ' + this.lots.length, '', 0, 'NEXT');
    else if (LT) {
      const price = this.priceNow(LT, w.now);
      const label = w.part === 'open' ? 'OPENING BID' : w.part === 'sold' ? (LT.winner.length ? 'SOLD' : 'NO SALE') : 'CURRENT BID';
      drawBoard(g, L.board, fmt(price), worth(price), this.flash, label);
    }
    // the auctioneer at the lectern, the attendant in white gloves
    this.auc.x = L.podium.x; this.auc.y = L.podium.y - L.podium.r * 0.78; this.auc.r = L.podium.r;
    this.auc.draw(g, this.faces, { shadow: false });
    drawPodium(g, L.podium.x, L.podium.y, L.podium.r, this.gavel);
    this.att.x = L.attendant.x; this.att.y = L.attendant.y; this.att.r = L.attendant.r;
    this.att.draw(g, this.faces);
    // the room
    this.drawRow(g, W, L, w, lot, t);
    // stamps
    const fcx = L.frame.x + L.frame.w / 2, fcy = L.frame.y + L.frame.h * 0.78, ss = L.frame.w * 0.14;
    if (w.part === 'going') {
      if (w.k < 0.5) drawStamp(g, 'GOING ONCE…', fcx, fcy, ss * 0.8, -0.1, clamp(w.k * 2 / 0.6, 0, 1), '#e9c46a');
      else drawStamp(g, 'GOING TWICE…', fcx, fcy, ss * 0.8, 0.08, clamp((w.k - 0.5) * 2 / 0.6, 0, 1), '#e9c46a');
    }
    if (w.part === 'sold' && LT) drawStamp(g, LT.winner.length ? 'SOLD!' : 'NO SALE', fcx + L.frame.w * 0.12, fcy, ss * 1.15, -0.16, clamp(w.k * AUC.sold / 0.5, 0, 1));
    if (intro) {
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = clamp(w.k * 3 - 0.3, 0, 1) * clamp((1 - w.k) * 4, 0, 1);
      g.fillStyle = '#e9c46a'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 20;
      let fs = Math.round(Math.min(W * 0.085, H * 0.06)); g.font = `italic 900 ${fs}px 'Playfair Display', Georgia, serif`;
      const lines = L.port ? ['The Glorious', 'Mess Auction'] : ['The Glorious Mess Auction'];
      const tw = Math.max(...lines.map(s => g.measureText(s).width)); if (tw > W * 0.9) { fs = Math.floor(fs * W * 0.9 / tw); g.font = `italic 900 ${fs}px 'Playfair Display', Georgia, serif`; }
      lines.forEach((s, j) => g.fillText(s, W / 2, L.frame.y + L.frame.h * 0.42 + (j - (lines.length - 1) / 2) * fs * 1.05));
      g.restore();
    }
    g.restore();
  }
  /** One paddle per bidder: up while they hold it, down when they let go; the winner's stays up. */
  private paddleUp(s: Seat, L: Lot, now: number, j: number): number {
    if (now < L.bid - 450) return 0;
    const b = L.bidders.find(x => x.id === s.id); if (!b) return 0;
    let raise: number;
    if (s.human) { const up = this.insOf(L.i, s.id); if (up == null) return 0; raise = up; }
    else raise = L.bid - 380 + j * 70;
    const won = L.decided && now >= L.end && L.winner.some(x => x.id === s.id);
    const drop = won ? L.next : b.drop;
    let u = clamp((now - raise) / 160, 0, 1) - clamp((now - drop) / 200, 0, 1);
    if (s.slug === 'loopie' && !s.human && Number.isFinite(drop)) { const z = now - drop; if (z > 450 && z < 1250) u = Math.max(u, Math.sin((z - 450) / 800 * Math.PI) * 0.9); }
    return clamp(u, 0, 1);
  }
  private insOf(i: number, pid: string): number | null {
    const k = String(i), pub = this.pub!;
    if (pub.ins && pub.ins[k] && pub.ins[k][pid] != null) return pub.ins[k][pid];
    if (pid === this.view!.you && this.local.ins[k] != null) return this.local.ins[k];
    return null;
  }
  private drawRow(g: CanvasRenderingContext2D, W: number, L: Layout, w: Where, lot: LotV, t: number) {
    const n = this.seats.length, sp = Math.min(W * 0.93 / n, L.rowR * 3.1);
    const LT = w.lot, me = this.view!.you;
    this.seats.forEach((s, j) => {
      const x = W / 2 + (j - (n - 1) / 2) * sp, y = L.rowY, r = L.rowR;
      s.a.x = x; s.a.y = y; s.a.r = r;
      const isArtist = s.pid === lot.pid;
      const u = LT && !isArtist && w.part !== 'present' ? this.paddleUp(s, LT, w.now, j) : 0;
      const won = !!LT && (w.part === 'going' || w.part === 'sold') && LT.winner.some(b => b.id === s.id);
      // paddle behind the shoulder when resting, high in the air when bidding
      const ps = r * lerp(0.66, 1.05, u);
      const py = lerp(y - r * 0.5, y - r * 2.35, u);
      if (u < 0.5 && !isArtist && w.part !== 'intro') drawPaddle(g, x + r * 0.95, py, ps, s.num, 0, 0, false);
      s.a.draw(g, this.faces, { labelColor: s.human && s.pid === me ? '#ffe9a8' : '#fbf3e3', labelFont: `${s.pid === me ? 800 : 600} ${Math.max(11, Math.round(r * 0.4))}px Fredoka, system-ui, sans-serif` });
      if (u >= 0.5) drawPaddle(g, x + r * 0.95, py, ps, s.num, 0, t * 9 + j * 1.7, won || (s.human && s.pid === me));
      if (isArtist && w.part !== 'intro') { g.save(); g.globalAlpha = 0.85; g.fillStyle = '#e9c46a'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.font = `700 ${Math.max(10, Math.round(r * 0.34))}px Fredoka, system-ui, sans-serif`; g.fillText('the artist', x, y - r * 2.15); g.restore(); }
    });
  }

  /* ---------------- the estimates ---------------- */
  private drawGap(g: CanvasRenderingContext2D, W: number, H: number, k: number) {
    const bg = g.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.4, Math.max(W, H)); bg.addColorStop(0, '#6e1529'); bg.addColorStop(1, '#1d040b'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const pub = this.eff(), tt = timetable(pub, this.now());
    const n = this.lots.length, port = W / H < 0.8, me = this.view!.you;
    const cols = port ? (n > 1 ? 2 : 1) : Math.min(4, n), rows = Math.ceil(n / cols);
    const top = H * (port ? 0.11 : 0.15), pad = Math.min(W, H) * 0.03;
    const cw = (W - pad * (cols + 1)) / cols, ch = (H * (port ? 0.68 : 0.6) - pad * (rows - 1)) / rows;
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#e9c46a'; g.font = `italic 900 ${Math.round(Math.min(W * 0.075, H * 0.05))}px 'Playfair Display', Georgia, serif`;
    g.globalAlpha = clamp(k * 4, 0, 1); g.fillText('The estimates are in', W / 2, H * 0.06, W * 0.92);
    g.restore();
    const t = performance.now() / 1000;
    this.lots.forEach((lot, i) => {
      const L = tt.lots[i]; if (!L) return;
      const col = i % cols, row = Math.floor(i / cols);
      const x = pad + col * (cw + pad), y = top + row * (ch + pad);
      const at = 0.06 + i * 0.07, a = clamp((k - at) * 8, 0, 1); if (a <= 0) return;
      const mine = lot.pid === me;
      g.save(); g.globalAlpha = a; g.translate(0, (1 - ease.out(a)) * 16);
      g.fillStyle = mine ? 'rgba(233,196,106,.16)' : 'rgba(255,255,255,.05)'; rrect(g, x, y, cw, ch, 14); g.fill();
      if (mine) { g.strokeStyle = 'rgba(233,196,106,.8)'; g.lineWidth = 2; rrect(g, x, y, cw, ch, 14); g.stroke(); }
      // the work
      const fw = Math.min(cw * 0.56, ch * 0.44), fh = fw * 1.12;
      drawFrame(g, { x: x + cw / 2 - fw / 2, y: y + ch * 0.05, w: fw, h: fh }, lot.strokes, { t: t + i, cloth: 0, boil: Math.max(0.8, fw * 0.005), seed: lot.seed, easel: false });
      // who
      const fs = Math.max(11, Math.min(18, cw * 0.075));
      g.fillStyle = mine ? '#ffe9a8' : '#fbf3e3'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 ${Math.round(fs)}px Fredoka, system-ui, sans-serif`;
      g.fillText(mine ? 'Yours' : lot.human ? lot.name + '’s' : lot.name + '’s (Bubble)', x + cw / 2, y + ch * 0.05 + fh + fs * 0.95, cw * 0.92);
      // asked → sold
      const ty = y + ch * 0.05 + fh + fs * 2.3, tw = cw * 0.4, th = Math.max(fs * 1.9, ch * 0.13);
      const sold = L.winner.length ? L.price : 0;
      const slam = clamp((k - at - 0.06) * 10, 0, 1);
      this.tag(g, x + cw * 0.27, ty, tw, th, 'ASKED', fmt(lot.est), '#fbf3e3', '#3a2508', 1);
      g.save(); g.translate(x + cw * 0.73, ty + th / 2); const sc = 1 + (1 - ease.out(slam)) * 0.6; g.scale(sc, sc); g.globalAlpha *= slam;
      this.tag(g, 0, -th / 2, tw, th, sold ? 'SOLD' : 'NO SALE', sold ? fmt(sold) : '—', '#e9c46a', '#2a1606', 1);
      g.restore();
      // the gap
      const m = sold / Math.max(1, lot.est);
      const gap = !sold ? '' : m >= 1.5 ? '×' + (m >= 10 ? fmt(Math.round(m)) : m.toFixed(1)) : m <= 0.67 ? '÷' + fmt(Math.round(1 / Math.max(0.0001, m))) : '≈';
      if (gap) {
        const pop = clamp((k - at - 0.1) * 8, 0, 1);
        g.save(); g.globalAlpha *= pop; g.fillStyle = m >= 1.5 ? '#ffe9a8' : '#ff9b9b'; g.font = `italic 900 ${Math.round(fs * 1.9 * (1 + (1 - pop) * 0.5))}px 'Playfair Display', Georgia, serif`;
        g.fillText(gap, x + cw / 2, ty + th + fs * 1.5, cw * 0.9); g.restore();
      }
      g.restore();
    });
  }
  private tag(g: CanvasRenderingContext2D, cx: number, y: number, w: number, hh: number, label: string, value: string, bg: string, fg: string, alpha: number) {
    const x = cx - w / 2;
    g.save(); g.globalAlpha *= alpha;
    g.fillStyle = bg; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.86, y); g.lineTo(x + w, y + hh / 2); g.lineTo(x + w * 0.86, y + hh); g.lineTo(x, y + hh); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + w * 0.86, y + hh / 2, hh * 0.08, 0, Math.PI * 2); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round(hh * 0.22)}px Fredoka, system-ui, sans-serif`; g.fillText(label, x + w * 0.43, y + hh * 0.27, w * 0.8);
    g.font = `900 ${Math.round(hh * 0.42)}px 'Playfair Display', Georgia, serif`; g.fillText(value, x + w * 0.43, y + hh * 0.66, w * 0.8);
    g.restore();
  }
  /** The one line that matters: what you asked for yours, against what you (and they) held on for. */
  private computeMirror(w: Where): { big: string; small: string } {
    const me = this.view!.you!, pub = this.eff();
    const mine = this.lots.find(l => l.pid === me), myL = mine ? w.lots[mine.i] : null;
    const held = (L: Lot, pid: string) => {
      const up = (pub.ins[String(L.i)] || {})[pid]; if (up == null || up > L.bid + AUC.grace * 1000) return null;
      const b = L.bidders.find(x => x.id === pid); if (!b) return null;
      return priceAt((Math.min(b.drop, L.end, L.cap) - L.bid) / 1000);
    };
    let best: { p: number; name: string } | null = null;
    w.lots.forEach(L => { if (L.pid === me) return; const p = held(L, me); const lot = this.lots[L.i]; if (p != null && (!best || p > best.p)) best = { p, name: lot.human ? lot.name : lot.name }; });
    if (!mine || !myL) {
      const all = w.lots.every((L, i) => L.winner.length && L.price > this.lots[i].est);
      return { big: all ? 'Every artist asked less than their mess sold for.' : 'The room has spoken.', small: (best as { p: number; name: string } | null) ? 'You held on to ' + fmt((best as any).p) + ' for ' + (best as any).name + '’s.' : '' };
    }
    const est = mine.est, sold = myL.winner.length ? myL.price : 0;
    const fans = this.pub!.cast.filter(c => c.human && c.pid !== me).map(c => ({ name: c.name, p: held(myL, c.pid) })).filter(x => x.p != null) as { name: string; p: number }[];
    const big = sold ? 'You asked ' + fmt(est) + '. It sold for ' + fmt(sold) + '.' : 'You asked ' + fmt(est) + '. Nobody could afford to let go of their bubbles.';
    let small = '';
    if (fans.length) { fans.sort((a, b) => b.p - a.p); small = (fans.length > 1 ? fans.map(f => f.name).slice(0, -1).join(', ') + ' and ' + fans[fans.length - 1].name : fans[0].name) + ' held on to ' + fmt(fans[0].p) + ' for yours.'; }
    else if (best) small = 'You’d pay ' + fmt((best as any).p) + ' for ' + (best as any).name + '’s mess. You’d sell your own for ' + fmt(est) + '.';
    else if (sold && est > sold * 1.5) small = 'Confidence like that can’t be taught.';
    else small = 'Same blindfold. Same mess. Different price tag.';
    return { big, small };
  }

  /* ---------------- the Museum of Glorious Messes ---------------- */
  private prepMuseum() {
    const pub = this.eff(), tt = timetable(pub, this.now()), me = this.view!.you;
    const title = (PROMPTS[this.pub!.prompt] || PROMPTS[0]).title;
    const ex: Exhibit[] = this.lots.map((l, i) => {
      const L = tt.lots[i];
      const sold = L && L.winner.length ? 'SOLD ' + fmt(L.price) + ' · to ' + this.winnerName(L) : 'Not for sale';
      return { strokes: l.strokes, title: title + ' — ' + (l.pid === me ? 'you' : l.name), sub: sold, mine: l.pid === me, seed: l.seed, price: '' };
    });
    const mine = this.lots.find(l => l.pid === me);
    const cols = this.pub!.collectors || [];
    const keeper: Slug = cols.includes('drop') ? 'drop' : cols.find(c => c !== 'still' && c !== 'rush') || cols[0] || 'drop';
    if (mine) ex.push({ strokes: [], small: true, title: 'The artist’s own estimate', sub: 'Acquired by ' + NAME[keeper] + ' for one pickle', mine: true, seed: 0, price: fmt(mine.est) });
    const path: { t: number; x: number }[] = [{ t: 0, x: -0.95 }, { t: 1.2, x: -0.85 }];
    let T = 2.2;
    path.push({ t: T, x: 0 });
    ex.forEach((e, k) => {
      T += e.small ? 2.8 : e.mine ? 2.7 : 1.15; path.push({ t: T, x: k });
      if (k < ex.length - 1) { T += 0.8; path.push({ t: T, x: k + 1 }); }
    });
    const tAlarm = T + 0.1, tOut = tAlarm + 2.1, tEnd = tOut + 0.7;
    this.museum = { ex, path, tAlarm, tOut, tEnd, mineK: ex.findIndex(e => e.mine && !e.small), tagK: ex.findIndex(e => e.small) };
    const meAv = (this.pub!.cast.find(c => c.pid === me) || { avatar: '' }).avatar;
    const guard: Slug = meAv === 'still' ? 'patch' : 'still', runner: Slug = meAv === 'rush' ? 'loopie' : 'rush';
    this.extras.keeper = new BubbleActor(keeper, 0, 0, 20, this.babble); this.extras.keeper.prop = PICTS.pickle;
    this.extras.guard = new BubbleActor(guard, 0, 0, 20, this.babble); this.extras.guard.prop = PICTS.tea;
    this.extras.runner = new BubbleActor(runner, 0, 0, 20, this.babble); this.extras.runner.facing = -1;
  }
  private camX(t: number) {
    const p = this.museum!.path;
    if (t <= p[0].t) return p[0].x;
    for (let i = 1; i < p.length; i++) if (t < p[i].t) { const a = p[i - 1], b = p[i]; return lerp(a.x, b.x, ease.inOut((t - a.t) / (b.t - a.t))); }
    return p[p.length - 1].x;
  }
  private drawFinale(g: CanvasRenderingContext2D, W: number, H: number, t: number) {
    if (!this.museum) { this.prepMuseum(); this.setOverlay(''); }
    const M = this.museum!, sfx = this.ctx.sfx;
    this.doOnce('fin:music', () => this.music.play('waltz', SONGS.waltz, { vol: 0.45 }));
    const camX = this.camX(t);
    const shake = t > M.tAlarm && t < M.tAlarm + 0.5 ? Math.sin(t * 90) * W * 0.006 : 0;
    g.save(); g.translate(shake, 0);
    const res = drawMuseum(g, W, H, camX, M.ex, { t, laser: 1 });
    const port = W / H < 0.8, floor = res.wallH + (H - res.wallH) * (port ? 0.62 : 0.58), r = port ? W * 0.085 : H * 0.075;
    const sx = (k: number) => W / 2 + (k - camX) * res.spacing;
    // the artists stand beside their work
    M.ex.forEach((e, k) => {
      if (e.small) return;
      const lot = this.lots[k]; if (!lot) return;
      const s = this.seats.find(z => z.pid === lot.pid);
      const a = s ? s.a : (this.extras['art:' + k] = this.extras['art:' + k] || (() => { const b = new BubbleActor(lot.avatar, 0, 0, 20, this.babble); b.label = lot.name; return b; })());
      const fw = res.rects[k] ? res.rects[k].w : W * 0.3;
      a.x = sx(k) + fw * 0.5 + r * 0.15; a.y = floor; a.r = r; a.facing = -1;
      if (Math.abs(k - camX) < 0.6) this.doOnce('fin:art:' + k, () => a.emote(lot.pid === this.view!.you ? 'shy' : lot.human ? 'yay' : 'love', { vol: 0.5 }));
      if (a.x > -r * 3 && a.x < W + r * 3) a.draw(g, this.faces, { labelColor: '#2b2416' });
    });
    // the guard with tea by yours, the keeper of the price tag
    if (M.mineK >= 0) {
      const a = this.extras.guard; a.x = sx(M.mineK) - (res.rects[M.mineK] ? res.rects[M.mineK].w : W * 0.3) * 0.5 - r * 0.15; a.y = floor; a.r = r * 0.92;
      if (Math.abs(M.mineK - camX) < 0.5) this.doOnce('fin:guard', () => { a.emote('nod', { vol: 0.5 }); this.ctx.sfx.tone(60, 1.6, { type: 'sawtooth', vol: 0.03, filter: 300 }); });
      if (a.x > -r * 3 && a.x < W + r * 3) a.draw(g, this.faces);
    }
    if (M.tagK >= 0) {
      const a = this.extras.keeper; const tr = res.rects[M.tagK]; a.x = sx(M.tagK) + (tr ? tr.w * 0.62 : W * 0.15) + r * 0.6; a.y = floor + r * 0.2; a.r = r; a.facing = -1;
      if (Math.abs(M.tagK - camX) < 0.4) this.doOnce('fin:tag', () => { a.emote('cry', { vol: 0.6 }); a.after(1.4, () => a.speak('heart', 1.3)); });
      if (a.x > -r * 3 && a.x < W + r * 3) a.draw(g, this.faces);
    }
    // the alarm: Rush can't resist a closer look
    if (t > M.tAlarm - 1.2 && t < M.tOut + 0.6) {
      const a = this.extras.runner, run = clamp((t - (M.tAlarm - 1.2)) / 1.2, 0, 1);
      a.x = lerp(W + r * 2, W * 0.5 - r * 0.4, ease.out(run)); a.y = floor + r * 0.45; a.r = r;
      this.doOnce('fin:rush', () => a.emote('wow', { vol: 0.6 }));
      a.draw(g, this.faces);
    }
    g.restore();
    if (t > M.tAlarm) {
      this.doOnce('fin:alarm', () => {
        this.music.stop(0.05);
        for (let i = 0; i < 8; i++) sfx.tone(i % 2 ? 1180 : 1480, 0.11, { type: 'square', vol: 0.05, at: i * 0.13, filter: 2400 });
        this.extras.runner.emote('scream'); this.extras.keeper.after(0.2, () => this.extras.keeper.emote('gasp')); this.extras.guard.after(1.1, () => this.extras.guard.emote('nod', { vol: 0.6 }));
      });
      if (t < M.tOut) { g.save(); g.globalAlpha = 0.22 * (0.5 + 0.5 * Math.sin((t - M.tAlarm) * 18)); g.fillStyle = '#ff2030'; g.fillRect(0, 0, W, H); g.restore(); }
    }
    // the museum's name in gold letters on the wall, just before the first exhibit
    {
      const x = sx(-0.85), y = res.wallH * 0.36;
      if (x > -W * 0.6 && x < W * 1.6) {
        g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
        let fs = Math.round(Math.min(W * 0.075, H * 0.05)); g.font = `italic 900 ${fs}px 'Playfair Display', Georgia, serif`;
        const s = ['The Museum of', 'Glorious Messes'];
        const tw = Math.max(...s.map(q => g.measureText(q).width)); if (tw > res.spacing * 0.8) { fs = Math.floor(fs * res.spacing * 0.8 / tw); g.font = `italic 900 ${fs}px 'Playfair Display', Georgia, serif`; }
        g.fillStyle = 'rgba(90,60,20,.35)'; s.forEach((q, j) => g.fillText(q, x + 2, y + j * fs * 1.15 + 3));
        const gold = g.createLinearGradient(0, y - fs, 0, y + fs * 2); gold.addColorStop(0, '#f6d77a'); gold.addColorStop(0.5, '#b8862e'); gold.addColorStop(1, '#e8c060');
        g.fillStyle = gold; s.forEach((q, j) => g.fillText(q, x, y + j * fs * 1.15));
        g.font = `600 ${Math.round(fs * 0.32)}px Fredoka, system-ui, sans-serif`; g.fillStyle = '#6b5a40';
        g.fillText('Every work drawn blindfolded', x, y + fs * 2.3);
        g.restore();
      }
    }
    // in from black, out to black
    const dark = t < 0.6 ? 1 - t / 0.6 : t > M.tOut ? clamp((t - M.tOut) / 0.6, 0, 1) * 0.86 : 0;
    if (dark > 0) { g.fillStyle = `rgba(12,6,10,${dark})`; g.fillRect(0, 0, W, H); }
    if (t > M.tEnd) this.setOverlay('end');
  }

  /* ---------------- overlays (DOM) ---------------- */
  private banner(text: string) { const el = h('div', { class: 'ma-banner' }, text); this.wrap.appendChild(el); setTimeout(() => el.remove(), 2500); }
  private cap(main: string, small?: string) { this.over.appendChild(h('div', { class: 'ma-cap' }, main, small ? h('small', null, small) : null)); }
  private setOverlay(key: string) {
    if (this.overlay === key) return;
    this.overlay = key; clear(this.over);
    if (this.paddle && !key.startsWith('bidding:')) this.paddle = null;
    this.over.classList.toggle('dim', key === 'end');
    const v = this.view; if (!v) return;
    if (key === '' || key === 'intro') return;
    if (key === 'wait') { this.cap(this.ctx.room.isHost ? 'To the museum…' : 'Waiting for the host…'); return; }
    if (key === 'gap') { const m = this.mirror; if (m) this.cap(m.big, m.small); return; }
    if (key === 'end') { this.endCard(); return; }
    const [kind, si] = key.split(':'); const i = Number(si), lot = this.lots[i]; if (!lot) return;
    const me = v.you;
    if (kind === 'present') { this.cap('Lot ' + (i + 1) + ' of ' + this.lots.length, this.byLine(lot).replace(/^by /, 'By ')); return; }
    if (kind === 'bidding') {
      if (lot.pid === me) { this.cap('Your mess is on the block', 'You can’t bid on your own. Watch what it’s worth to everyone else.'); return; }
      const bidder = this.pub!.cast.some(c => c.human && c.pid === me);
      if (!bidder) { this.cap('Watching from the gallery', 'You’ll have a paddle next round'); return; }
      this.cap(this.byLine(lot).replace(/^by /, 'By '));
      this.mountPaddle(i);
      return;
    }
    if (kind === 'going') { const L = timetable(this.eff(), this.now()).lots[i]; if (L && L.winner.some(b => b.id === me)) this.cap('You’re the last paddle up!', 'Going once… going twice…'); return; }
    if (kind === 'sold') {
      const L = timetable(this.eff(), this.now()).lots[i]; if (!L) return;
      if (!L.winner.length) { this.cap('No sale', 'The artist keeps it. Lucky artist.'); return; }
      const who = this.winnerName(L);
      const bubble = L.winner.every(b => !b.human);
      this.cap('SOLD to ' + who + ' · ' + fmt(L.price) + ' bubbles', worth(L.price) + (bubble ? ' · Bubble companion' + (L.winner.length > 1 ? 's' : '') : ''));
    }
  }
  /** The paddle: press and hold to keep it up while the price climbs; let go and you're out of this lot. */
  private mountPaddle(i: number) {
    const btn = h('button', { class: 'ma-paddle', 'data-act': 'paddle', 'aria-label': 'Hold your paddle up to bid. Let go to drop out.' }, 'Hold your paddle up') as HTMLButtonElement;
    const P = { i, btn, state: 'ready' as 'ready' | 'up' | 'down' | 'late', downAt: 0 };
    const k = String(i), me = this.view!.you!;
    const pub = this.pub!;
    if ((pub.ins[k] || {})[me] != null || this.local.ins[k] != null) P.state = ((pub.drops[k] || {})[me] != null || this.local.drops[k] != null) ? 'down' : 'up';
    this.paddle = P;
    const raise = (e?: Event) => {
      if (P.state !== 'ready') return;
      const L = timetable(this.eff(), this.now()).lots[i];
      if (!L || this.now() > L.bid + AUC.grace * 1000) { P.state = 'late'; return; }
      this.ctx.sfx.unlock(); if (e) { this.ctx.sfx.gesture(e); this.ctx.metrics.mark(e); }
      P.state = 'up'; this.local.ins[k] = this.now(); this.send({ k: 'in', i });
      this.ctx.sfx.pop(760); this.ctx.sfx.whoosh(true, 0.15);
      const s = this.seatOf(me); if (s) s.a.emote('bid', { vol: 0.6 });
    };
    const lower = (e?: Event) => {
      if (P.state !== 'up') return;
      if (e) this.ctx.metrics.mark(e);
      P.state = 'down'; this.local.drops[k] = this.now(); P.downAt = this.priceNow(timetable(this.eff(), this.now()).lots[i], this.now()); this.send({ k: 'drop', i });
      this.ctx.sfx.whoosh(false, 0.2);
      const s = this.seatOf(me); if (s) s.a.emote('shake', { vol: 0.4 });
    };
    btn.addEventListener('pointerdown', (e) => { try { btn.setPointerCapture(e.pointerId); } catch (_) { /* fine */ } e.preventDefault(); raise(e); });
    btn.addEventListener('pointerup', (e) => lower(e)); btn.addEventListener('pointercancel', (e) => lower(e)); btn.addEventListener('lostpointercapture', (e) => lower(e));
    btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); raise(e); } });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); lower(e); } });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    this.over.appendChild(btn);
  }
  private updatePaddle(w: Where) {
    const P = this.paddle; if (!P) return;
    const L = w.lots[P.i]; if (!L) return;
    if (P.state === 'ready' && w.now > L.bid + AUC.grace * 1000) P.state = 'late';
    const txt = P.state === 'ready' ? (w.now < L.bid ? 'Get ready — hold your paddle up' : 'Hold your paddle up!')
      : P.state === 'up' ? 'Holding at ' + fmt(this.priceNow(L, w.now)) + ' · let go to drop out'
      : P.state === 'down' ? 'Paddle down at ' + fmt(P.downAt || this.priceNow(L, w.now))
      : 'You sat this one out';
    if (P.btn.textContent !== txt) P.btn.textContent = txt;
    P.btn.classList.toggle('up', P.state === 'up');
    P.btn.classList.toggle('out', P.state === 'down' || P.state === 'late');
    P.btn.classList.toggle('pulse', P.state === 'ready');
  }
  /** Live events are rate-limited by the room; space them out so a quick press-and-release never loses the release. */
  private send(data: any) {
    const now = performance.now(), wait = Math.max(0, this.lastSend + 260 - now);
    this.lastSend = now + wait;
    if (wait) setTimeout(() => this.ctx.room.act('live', data), wait); else this.ctx.room.act('live', data);
  }
  private endCard() {
    const v = this.view!, ctx = this.ctx, me = v.you;
    const mine = this.lots.find(l => l.pid === me);
    const box = h('div', { class: 'ma-end' });
    box.appendChild(h('div', { class: 'ma-line' }, 'Ritual complete'));
    if (mine) {
      const L = timetable(this.eff(), this.now()).lots[mine.i];
      const c = h('canvas', { width: '1080', height: '1350' }) as HTMLCanvasElement;
      box.appendChild(h('div', { class: 'ma-card' }, c));
      this.drawCard(c, mine, L);
      const meP = v.players.find(p => p.pid === me);
      const acts = h('div', { class: 'ma-acts' });
      if (meP && meP.human) {
        const cb = h('input', { type: 'checkbox' }) as HTMLInputElement; cb.checked = !!v.consent[meP.pid];
        cb.addEventListener('change', () => { ctx.room.act('consent', { share: cb.checked }); setTimeout(() => this.drawCard(c, mine, L), 200); });
        acts.appendChild(h('label', { class: 'ma-consent' }, cb, 'Put my name on the card'));
      }
      acts.appendChild(h('button', { class: 'ma-btn ghost', onclick: () => c.toBlob((b) => { if (b) ctx.download('glorious-mess.png', b).then(ok => { if (!ok) ctx.toast('Saving isn’t available here'); }); }, 'image/png') }, 'Save the card'));
      box.appendChild(acts);
    }
    const nav = h('div', { class: 'ma-acts' });
    if (ctx.room.isHost) nav.appendChild(h('button', { class: 'ma-btn', onclick: () => ctx.next('replay') }, 'Draw another mess'));
    nav.appendChild(h('button', { class: 'ma-btn ghost', onclick: () => ctx.next('hub') }, 'Try another ritual'));
    box.appendChild(nav);
    this.over.appendChild(box);
  }
  private drawCard(c: HTMLCanvasElement, lot: LotV, L: Lot | undefined) {
    const g = c.getContext('2d')!, W = c.width, H = c.height, v = this.view!;
    const named = !!v.consent[lot.pid];
    const bg = g.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.45, H); bg.addColorStop(0, '#6e1529'); bg.addColorStop(1, '#1d040b'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e9c46a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = "italic 900 66px 'Playfair Display', Georgia, serif";
    g.fillText('The Glorious Mess Auction', W / 2, 92, W * 0.9);
    const title = (PROMPTS[this.pub!.prompt] || PROMPTS[0]).title;
    const f = { x: 210, y: 170, w: 660, h: 739 };
    drawFrame(g, f, lot.strokes, { t: 0, cloth: 0, boil: 0, plaque: title, sub: named ? 'by ' + lot.name : 'by the artist', seed: lot.seed, easel: false });
    const sold = L && L.winner.length ? L.price : 0;
    if (sold) drawStamp(g, 'SOLD', f.x + f.w * 0.84, f.y + f.h * 0.12, 74, 0.22, 1);
    g.fillStyle = '#ffe9a8'; g.font = "900 76px 'Playfair Display', Georgia, serif";
    g.fillText(sold ? fmt(sold) + ' bubbles' : 'Priceless (no sale)', W / 2, 1100, W * 0.9);
    g.fillStyle = '#fbf3e3'; g.font = '600 36px Fredoka, system-ui, sans-serif';
    g.fillText('Artist’s own estimate: ' + fmt(lot.est), W / 2, 1172, W * 0.9);
    g.font = '500 28px Fredoka, system-ui, sans-serif'; g.globalAlpha = 0.8;
    g.fillText('Drawn blindfolded · ' + (named ? lot.name + ' · ' : '') + 'ThinkStill Reflect', W / 2, H - 56, W * 0.9);
    g.globalAlpha = 1;
  }
}
export type { Bidder };
