/* The Reflect console: hub of rituals → (instant solo play with labelled Bubble companions | invite friends | join with
 * a code) → lobby → the ritual's own world → back. One instance per mount; everything lives in a shadow root so it can
 * sit inside Framer, a claude.ai artifact or a plain page without style collisions. */
import type { RoomView, RitualId, Slug, Player } from '../room/protocol';
import { SLUGS } from '../room/protocol';
import { RoomClient, LocalTransport, WsTransport, Transport, newRoomCode } from '../net/client';
import { ArtifactHost, HostSelfTransport, ArtifactGuestTransport } from '../net/artifact';
import { FaceBank, DEFAULT_ASSET_BASE } from '../actor/faces';
import { Synth } from '../audio/synth';
import { h, clear, Surface, prefersReducedMotion } from '../ui/dom';
import { Metrics, Prefs, Scene, SceneCtx, SceneFactory, RoomLike } from './types';
import { RF_CSS, RF_FONTS } from './style';
import { createGtgScene } from '../rituals/group-think-glitch/scene';
import { renderWorld, lens, stateAt, sweepCam } from '../rituals/group-think-glitch/world';
import { lookAt } from '../gfx/projector';

export interface ReflectOptions {
  roomServer?: string;                 // ws(s)://host — enables Invite / Join across devices
  assetBase?: string;                  // Bubble expression art base URL
  theme?: 'system' | 'dark' | 'bright';
  sound?: boolean;
  reducedMotion?: 'system' | 'on' | 'off';
  room?: string;                       // join this room code on mount
  ritual?: RitualId;                   // open this ritual's card / start it
  autostart?: 'solo' | null;           // start solo play immediately (tests, deep links)
  inviteUrl?: (code: string) => string;
  transportFor?: (code: string, ritual: RitualId, role: 'host' | 'guest') => Transport | null;
  liveRoom?: Promise<any>;             // claude.ai artifact: the `room` capability (claude.use('room'))
  download?: (filename: string, blob: Blob) => Promise<boolean>;
  onExit?: () => void;
  onComplete?: (info: { ritual: RitualId; players: number }) => void;
}

interface RitualCard { id: RitualId; title: string; pitch: string; genre: string; players: string; factory?: SceneFactory; preview?: (sf: Surface, t: number, faces: FaceBank) => void; }
const RITUALS: RitualCard[] = [
  { id: 'group-think-glitch', title: 'Group Think Glitch', pitch: 'Four cameras. One cake. Who saw what?', genre: 'Mystery', players: '2–4 players', factory: createGtgScene, preview: gtgPreview },
  { id: 'drama-dubbing-booth', title: 'Drama Dubbing Booth', pitch: 'One silent scene. Your voice decides what it means.', genre: 'Comedy', players: '2–4 players', preview: ddbPreview },
  { id: 'emotional-rollercoaster', title: 'Emotional Rollercoaster', pitch: 'Sculpt your ride, then ride everyone’s.', genre: 'Spectacle', players: '2–4 players', preview: erPreview }
];

const ME_KEY = '__rf_me_v1', SOUND_KEY = '__rf_sound_v1', THEME_KEY = '__ts_chat_theme_v181', MEDIA_KEY = '__ts_reset_shared_media_v1';
const sget = (k: string) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const sset = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } };

export class ReflectConsole {
  private shadow: ShadowRoot;
  private root: HTMLElement;
  private view: HTMLElement;
  private toastEl: HTMLElement;
  private statusEl: HTMLElement;
  private faces: FaceBank;
  private sfx = new Synth();
  private metrics = new Metrics();
  private prefs: Prefs;
  private me: { name: string; avatar: Slug };
  private client: RoomClient | null = null;
  private code = '';
  private solo = false;
  private soloStarted = false;
  private scene: Scene | null = null;
  private sceneRitual: RitualId | null = null;
  private stage: HTMLElement | null = null;
  private screen: 'hub' | 'lobby' | 'stage' | '' = '';
  private unsub: (() => void)[] = [];
  private previews: { sf: Surface; card: RitualCard; io?: IntersectionObserver; vis: boolean }[] = [];
  private raf = 0;
  private music: string | null = null;
  constructor(private host: HTMLElement, private opts: ReflectOptions = {}) {
    this.shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    clear(this.shadow as any);
    addFonts();
    const media = readMedia();
    this.faces = new FaceBank(opts.assetBase || DEFAULT_ASSET_BASE, media.avatars || {});
    this.music = (media.music && media.music.global) || null;
    const snd = sget(SOUND_KEY);
    this.prefs = { sound: opts.sound ?? (snd == null ? true : snd === '1'), reducedMotion: opts.reducedMotion === 'on' || (opts.reducedMotion !== 'off' && prefersReducedMotion()), theme: resolveTheme(opts.theme) };
    this.sfx.setEnabled(this.prefs.sound);
    let me: any = null; try { me = JSON.parse(sget(ME_KEY) || 'null'); } catch (e) { me = null; }
    this.me = me && me.name && SLUGS.includes(me.avatar) ? me : { name: 'Player', avatar: SLUGS[Math.floor(Math.random() * SLUGS.length)] };
    this.toastEl = h('div', { class: 'rf-toast', role: 'status', 'aria-live': 'polite' });
    this.statusEl = h('div', { class: 'rf-status', hidden: '' });
    this.view = h('div', { style: { position: 'absolute', inset: '0' } });
    this.root = h('div', { class: 'rf', 'data-theme': this.prefs.theme }, this.view, this.statusEl, this.toastEl);
    this.shadow.appendChild(h('style', { text: RF_CSS }));
    this.shadow.appendChild(this.root);
    const unlock = () => this.sfx.unlock();
    this.root.addEventListener('pointerdown', unlock, { capture: true });
    this.root.addEventListener('keydown', unlock, { capture: true });
    const onResize = () => { if (this.scene) this.scene.resize(); };
    window.addEventListener('resize', onResize);
    this.unsub.push(() => window.removeEventListener('resize', onResize));
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY) { this.prefs.theme = resolveTheme(this.opts.theme); this.root.setAttribute('data-theme', this.prefs.theme); } };
    window.addEventListener('storage', onStorage);
    this.unsub.push(() => window.removeEventListener('storage', onStorage));
    (window as any).__reflect = this;    // test hook: metrics + state
    if (opts.room) this.join(opts.room);
    else if (opts.autostart === 'solo') this.playSolo(opts.ritual || 'group-think-glitch');
    else this.showHub();
  }
  destroy() {
    this.leave(true);
    cancelAnimationFrame(this.raf);
    this.unsub.forEach(f => f());
    this.previews.forEach(p => p.io && p.io.disconnect());
    this.sfx.stopAll();
    clear(this.shadow as any);
    if ((window as any).__reflect === this) delete (window as any).__reflect;
  }
  get state() { return { screen: this.screen, code: this.code, view: this.client && this.client.view, pid: this.client && this.client.pid, metrics: this.metrics, sound: this.sfx.metrics }; }

  /* ---------------- chrome ---------------- */
  toast(msg: string) { this.toastEl.textContent = msg; this.toastEl.classList.add('on'); clearTimeout((this.toastEl as any)._t); (this.toastEl as any)._t = setTimeout(() => this.toastEl.classList.remove('on'), 2600); }
  private icon(name: 'back' | 'sound' | 'mute' | 'theme' | 'close') {
    const P: Record<string, string> = {
      back: '<path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
      sound: '<path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path d="M13 7.5a3.5 3.5 0 0 1 0 5M15 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      mute: '<path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path d="m13 8 4 4m0-4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      theme: '<path d="M10 2a8 8 0 1 0 8 8 6 6 0 0 1-8-8z" fill="currentColor"/>',
      close: '<path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
    };
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 20 20'); s.innerHTML = P[name]; return s;
  }
  private soundBtn() {
    const b = h('button', { class: 'rf-ib', 'aria-label': this.prefs.sound ? 'Mute' : 'Sound on' }, this.icon(this.prefs.sound ? 'sound' : 'mute'));
    b.addEventListener('click', () => {
      this.prefs.sound = !this.prefs.sound; sset(SOUND_KEY, this.prefs.sound ? '1' : '0');
      this.sfx.unlock(); this.sfx.setEnabled(this.prefs.sound);
      clear(b); b.appendChild(this.icon(this.prefs.sound ? 'sound' : 'mute')); b.setAttribute('aria-label', this.prefs.sound ? 'Mute' : 'Sound on');
    });
    return b;
  }
  private themeBtn() {
    return h('button', { class: 'rf-ib', 'aria-label': 'Switch dark / bright', onclick: () => { this.prefs.theme = this.prefs.theme === 'dark' ? 'bright' : 'dark'; sset(THEME_KEY, this.prefs.theme); this.root.setAttribute('data-theme', this.prefs.theme); } }, this.icon('theme'));
  }

  /* ---------------- hub ---------------- */
  private showHub() {
    this.screen = 'hub'; this.lobby = null;
    this.unmountScene();
    clear(this.view);
    this.sfx.bed('off');
    if (this.music) this.sfx.music(this.music, 0.3);
    const cards = h('div', { class: 'rf-cards' });
    this.previews = [];
    for (const r of RITUALS) {
      const sf = new Surface(); sf.maxDpr = 1.5;
      const built = !!r.factory;
      const card = h('div', { class: 'rf-card' + (built ? '' : ' soon'), 'data-ritual': r.id },
        h('div', { class: 'pv' }, sf.canvas, h('span', { class: 'tag' }, r.genre)),
        h('div', { class: 'bd' },
          h('h2', null, r.title), h('p', null, r.pitch),
          h('div', { class: 'meta' }, h('span', null, r.players), h('span', null, 'Bubble companions fill empty seats')),
          h('div', { class: 'act' },
            built ? h('button', { class: 'rf-btn', 'data-act': 'solo', onclick: (e: Event) => { this.sfx.unlock(); this.sfx.gesture(e); this.playSolo(r.id); } }, 'Play now') : h('button', { class: 'rf-btn', disabled: '' }, 'Pilot in progress'),
            built ? h('button', { class: 'rf-btn sec', 'data-act': 'invite', onclick: () => this.invite(r.id) }, 'Invite friends') : null)));
      cards.appendChild(card);
      const p = { sf, card: r, vis: true } as any;
      if (r.preview && 'IntersectionObserver' in window) { p.io = new IntersectionObserver((es) => { p.vis = es.some(e => e.isIntersecting); }); p.io.observe(sf.canvas); }
      this.previews.push(p);
    }
    const code = h('input', { class: 'rf-in rf-code', maxlength: '5', placeholder: 'CODE', 'aria-label': 'Room code', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' }) as HTMLInputElement;
    const joinBtn = h('button', { class: 'rf-btn sec', onclick: () => { const c = code.value.trim().toUpperCase(); if (/^[A-Z2-9]{5}$/.test(c)) this.join(c); else this.toast('Room codes are 5 letters or numbers'); } }, 'Join');
    code.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinBtn.click(); });
    const hub = h('div', { class: 'rf-hub' },
      h('div', { class: 'rf-brand' }, h('h1', null, 'Reflect'), h('div', { class: 'sp' }), this.themeBtn(), this.soundBtn(), this.opts.onExit ? h('button', { class: 'rf-ib', 'aria-label': 'Close', onclick: () => this.opts.onExit && this.opts.onExit() }, this.icon('close')) : null),
      h('p', { class: 'rf-sub' }, 'Rituals for seeing the same moment differently, together. Play now with Bubble companions, or bring your people.'),
      cards,
      h('div', { class: 'rf-join' }, h('span', { class: 'rf-note' }, 'Got a code?'), code, joinBtn));
    this.view.appendChild(h('div', { class: 'rf-scroll' }, hub));
    cancelAnimationFrame(this.raf);
    let last = 0;
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      if (this.screen !== 'hub' || now - last < 66) return;
      last = now;
      for (const p of this.previews) { if (!p.card.preview || !p.vis) continue; if (p.sf.fit() || true) p.card.preview(p.sf, now / 1000, this.faces); }
    };
    this.raf = requestAnimationFrame(loop);
  }

  /* ---------------- sessions ---------------- */
  private connect(code: string, ritual: RitualId, t: Transport, solo: boolean) {
    this.leave(true);
    this.code = code; this.solo = solo; this.soloStarted = false;
    const client = new RoomClient(t, code, this.me, solo ? undefined : '__rf_tok_' + code);
    this.client = client;
    client.on((v) => this.onView(v));
    client.onError((c) => this.onError(c));
    client.onStatus((s) => { this.statusEl.hidden = s === 'open' || solo; this.statusEl.textContent = s === 'reconnecting' ? 'Reconnecting…' : s === 'connecting' ? 'Connecting…' : s; });
    client.connect(ritual);
  }
  private playSolo(ritual: RitualId) {
    const code = newRoomCode();
    this.connect(code, ritual, new LocalTransport(code, ritual), true);
    // instant entry: two labelled Bubble companions take seats and the ritual starts
    const c = this.client!;
    const go = () => {
      const v = c.view; if (!v || !c.isHost) { setTimeout(go, 16); return; }
      const want = Math.max(0, 3 - v.players.filter(p => !p.spectator).length);
      const picks = (['glitch', 'loopie', 'sync', 'patch'] as Slug[]).filter(s => s !== this.me.avatar).slice(0, want);
      picks.forEach(a => c.act('add_companion', { avatar: a }));
      setTimeout(() => { c.act('start'); this.soloStarted = true; }, 30);
    };
    go();
  }
  private invite(ritual: RitualId) {
    const code = newRoomCode();
    const t = this.transport(code, ritual, 'host');
    if (!t) { this.toast('Inviting needs the Reflect room server (see the setup notes)'); return; }
    this.connect(code, ritual, t, false);
  }
  private join(code: string) {
    const t = this.transport(code, 'group-think-glitch', 'guest');
    if (!t) { this.toast('Joining needs the Reflect room server'); this.showHub(); return; }
    this.connect(code, 'group-think-glitch', t, false);
  }
  private transport(code: string, ritual: RitualId, role: 'host' | 'guest'): Transport | null {
    if (this.opts.transportFor) { const t = this.opts.transportFor(code, ritual, role); if (t) return t; }
    if (!this.opts.roomServer && this.opts.liveRoom) {
      if (role === 'host') return new HostSelfTransport(new ArtifactHost(this.opts.liveRoom, code, ritual, (st) => { if (st === 'closed' && this.code === code) { this.toast('Live rooms aren’t available in this view — playing with Bubble companions instead'); this.leave(true); this.playSolo(ritual); } }));
      return new ArtifactGuestTransport(this.opts.liveRoom, code);
    }
    if (!this.opts.roomServer) return null;
    const base = this.opts.roomServer.replace(/\/+$/, '').replace(/^http/, 'ws');
    return new WsTransport(`${base}/room/${code}?ritual=${encodeURIComponent(ritual)}`);
  }
  private leave(silent = false) {
    if (this.client) { try { if (!silent || !this.solo) this.client.act('leave'); } catch (e) { /* gone */ } const c = this.client; this.client = null; setTimeout(() => c.close(), 60); }
    this.unmountScene();
    this.code = '';
  }
  private onError(code: string) {
    const msg: Record<string, string> = { room_full: 'That room is full', not_allowed: 'Only the host can do that', need_players: 'Two players needed — add a Bubble companion', invalid: 'That didn’t go through — try again', already_sealed: 'Already sealed', no_host: 'That room isn’t open right now — ask the host to open their invite', no_live_rooms: 'Live rooms aren’t available in this view', host_left: 'The host closed the room', replaced: 'This seat opened in another window' };
    if (code === 'room_full' || code === 'no_host' || code === 'no_live_rooms' || code === 'host_left' || code === 'replaced') { this.leave(true); this.showHub(); }
    if (msg[code]) this.toast(msg[code]);
  }
  private onView(v: RoomView) {
    if (v.phase === 'lobby') {
      if (this.scene) this.unmountScene();
      if (this.solo) { if (this.soloStarted && this.client && this.client.isHost) setTimeout(() => this.client && this.client.view && this.client.view.phase === 'lobby' && this.client.act('start'), 40); return; }
      this.showLobby(v);
    } else this.showStage(v);
  }

  /* ---------------- lobby ---------------- */
  private lobby: { code: string; seats: HTMLElement; hostRow: HTMLElement; title: HTMLElement } | null = null;
  private showLobby(v: RoomView) {
    const c = this.client!; if (!c) return;
    const ritual = RITUALS.find(r => r.id === v.ritual) || RITUALS[0];
    if (this.screen !== 'lobby' || !this.lobby || this.lobby.code !== v.code) {
      this.screen = 'lobby';
      clear(this.view);
      const link = this.opts.inviteUrl ? this.opts.inviteUrl(v.code) : inviteLink(v.code);
      const lnk = h('div', { class: 'lnk' }, link);
      const copy = h('button', { class: 'rf-btn sec', onclick: () => { const done = () => this.toast('Invite link copied'); try { navigator.clipboard.writeText(link).then(done, () => { sel(lnk); this.toast('Select and copy the link'); }); } catch (e) { sel(lnk); } } }, 'Copy invite');
      const name = h('input', { class: 'rf-in', value: this.me.name, maxlength: '24', 'aria-label': 'Your name', enterkeyhint: 'done' }) as HTMLInputElement;
      const commit = () => { const nm = name.value.trim() || 'Player'; if (nm === this.me.name && c.mePlayer && c.mePlayer.name === nm) return; this.me.name = nm; sset(ME_KEY, JSON.stringify(this.me)); c.act('rename', { name: nm, avatar: this.me.avatar }); };
      name.addEventListener('change', commit);
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { commit(); name.blur(); } });
      const avs = h('div', { class: 'rf-avs', role: 'group', 'aria-label': 'Your Bubble' });
      SLUGS.forEach(sl => avs.appendChild(h('button', { class: 'rf-av', 'data-slug': sl, 'aria-pressed': String(sl === this.me.avatar), 'aria-label': sl, onclick: () => { this.me.avatar = sl; sset(ME_KEY, JSON.stringify(this.me)); avs.querySelectorAll('.rf-av').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-slug') === sl))); c.act('rename', { name: this.me.name, avatar: sl }); } }, h('img', { alt: '', src: this.faces.url(sl, 'happy') }))));
      const title = h('div', { class: 'ttl' }, ritual.title);
      const bar = h('div', { class: 'rf-bar' }, h('button', { class: 'rf-ib', 'aria-label': 'Back to rituals', onclick: () => { this.leave(); this.showHub(); } }, this.icon('back')), title, this.soundBtn());
      const seats = h('div', { class: 'rf-seats' });
      const hostRow = h('div');
      const lobby = h('div', { class: 'rf-lobby' },
        h('h2', null, 'Room'),
        h('div', { class: 'rf-roomcode' }, h('b', { 'data-code': v.code }, v.code), lnk, copy),
        h('div', { class: 'rf-note' }, 'Friends join with the link or the code. Seats left empty are filled by Bubble companions, always labelled.'),
        seats,
        h('div', { class: 'rf-me' }, h('div', { class: 'rf-note' }, 'You'), name, avs),
        hostRow);
      this.view.appendChild(h('div', { class: 'rf-scroll' }, lobby));
      this.view.appendChild(bar);
      this.lobby = { code: v.code, seats, hostRow, title };
    }
    const L = this.lobby!;
    L.title.textContent = ritual.title;
    clear(L.seats);
    const parts = v.players.slice().sort((a, b) => a.seat - b.seat);
    for (const p of parts) {
      L.seats.appendChild(h('div', { class: 'rf-seat' },
        h('img', { alt: '', src: this.faces.url(p.avatar, p.human ? 'happy' : 'wink') }),
        h('div', null, h('b', null, p.name + (p.pid === v.you ? ' (you)' : '')), h('small', null, p.human ? (p.pid === v.hostPid ? 'host' : p.connected ? 'here' : 'reconnecting…') + (p.spectator ? ' · watching' : '') : 'Bubble companion · plays by its own rules')),
        c.isHost && p.pid !== v.you ? h('button', { class: 'x', onclick: () => c.act('remove_player', { pid: p.pid }) }, 'Remove') : h('span')));
    }
    clear(L.hostRow);
    const nParts = parts.filter(p => !p.spectator).length;
    L.hostRow.appendChild(c.isHost ? h('div', { class: 'rf-row' },
      h('button', { class: 'rf-btn sec', disabled: nParts >= 4 ? '' : null, onclick: () => c.act('add_companion', {}) }, '+ Bubble companion'),
      h('button', { class: 'rf-btn', 'data-act': 'start', disabled: nParts < 2 ? '' : null, onclick: (e: Event) => { this.sfx.unlock(); this.sfx.gesture(e); c.act('start'); } }, 'Start ' + ritual.title),
      nParts < 2 ? h('div', { class: 'rf-note' }, 'Two seats needed: invite someone or add a Bubble companion.') : null) : h('div', { class: 'rf-note' }, 'Waiting for the host to start…'));
  }

  /* ---------------- stage ---------------- */
  private showStage(v: RoomView) {
    const card = RITUALS.find(r => r.id === v.ritual);
    if (!card || !card.factory) { this.toast('That ritual isn’t ready yet'); return; }
    if (this.screen !== 'stage' || this.sceneRitual !== v.ritual || !this.scene) {
      this.screen = 'stage'; this.lobby = null;
      this.unmountScene();
      clear(this.view);
      this.sfx.music(null);
      let armed = false;
      const back = h('button', { class: 'rf-ib', 'aria-label': 'Leave ritual' }, this.icon('back'));
      back.addEventListener('click', () => {
        if (!armed) { armed = true; this.toast('Tap again to leave'); setTimeout(() => (armed = false), 2400); return; }
        this.leave(); this.showHub();
      });
      const bar = h('div', { class: 'rf-bar' }, back, h('div', { class: 'ttl' }, card.title), this.soundBtn());
      this.stage = h('div', { class: 'rf-stage' });
      this.view.appendChild(this.stage);
      this.view.appendChild(bar);
      const c = this.client!;
      const room: RoomLike = { get view() { return c.view; }, get pid() { return c.pid; }, get isHost() { return c.isHost; }, act: (k, d) => c.act(k, d), serverNow: () => c.serverNow(), on: (f) => c.on(f), onError: (f) => c.onError(f) };
      const ctx: SceneCtx = {
        stage: this.stage, room, faces: this.faces, sfx: this.sfx, prefs: this.prefs, metrics: this.metrics,
        toast: (m) => this.toast(m), exit: () => { this.leave(); this.showHub(); },
        label: (p: Player) => (p.human ? p.name : p.name + ' · Bubble companion'),
        next: (choice) => {
          if (choice === 'replay') { if (c.isHost) c.act('replay'); }
          else { if (this.opts.onComplete && c.view) this.opts.onComplete({ ritual: c.view.ritual, players: c.view.players.filter(p => p.human).length }); this.leave(); this.showHub(); }
        },
        download: (name, blob) => this.download(name, blob)
      };
      this.scene = card.factory(ctx);
      this.sceneRitual = v.ritual;
    }
    this.scene!.update(v);
  }
  private unmountScene() { if (this.scene) { this.scene.destroy(); this.scene = null; this.sceneRitual = null; } this.stage = null; }
  private async download(name: string, blob: Blob): Promise<boolean> {
    if (this.opts.download) return this.opts.download(name, blob);
    try {
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (e) { return false; }
  }
}

/* ---------------- helpers ---------------- */
function ddbPreview(sf: Surface, now: number, faces: FaceBank) {
  sf.fit(); const g = sf.g, W = sf.pw, H = sf.ph; if (W < 4) return;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1810'); bg.addColorStop(1, '#120a08'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // projector beam onto a screen
  const sx = W * 0.18, sy = H * 0.12, sw = W * 0.64, sh = H * 0.5;
  g.save(); g.globalCompositeOperation = 'lighter';
  const beam = g.createLinearGradient(W * 0.5, H, W * 0.5, sy); beam.addColorStop(0, 'rgba(255,220,150,0.25)'); beam.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = beam; g.beginPath(); g.moveTo(W * 0.5 - 6, H); g.lineTo(sx, sy + sh); g.lineTo(sx + sw, sy + sh); g.lineTo(W * 0.5 + 6, H); g.fill(); g.restore();
  const sc = g.createLinearGradient(0, sy, 0, sy + sh); sc.addColorStop(0, '#ffcf8a'); sc.addColorStop(1, '#e8835a');
  g.fillStyle = sc; g.fillRect(sx, sy, sw, sh);
  const a = faces.get('patch', 'shy'), b = faces.get('sync', Math.floor(now) % 2 ? 'surprised' : 'laugh');
  const bob = Math.sin(now * 3) * sh * 0.02;
  if (a) g.drawImage(a, sx + sw * 0.16, sy + sh * 0.3 + bob, sh * 0.62, sh * 0.62);
  if (b) g.drawImage(b, sx + sw * 0.56, sy + sh * 0.3 - bob, sh * 0.62, sh * 0.62);
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(40,20,10,' + (0.05 + 0.1 * Math.random()) + ')'; g.fillRect(sx + Math.random() * sw, sy + Math.random() * sh, 1.5, 1.5); }
  // waveform
  g.strokeStyle = '#ffd27a'; g.lineWidth = Math.max(1.5, W * 0.004); g.beginPath();
  for (let x = 0; x <= W * 0.8; x += 3) { const k = x / (W * 0.8); const y = H * 0.82 + Math.sin(k * 40 + now * 9) * H * 0.05 * Math.sin(k * Math.PI) * (0.6 + 0.4 * Math.sin(now * 2 + k * 6)); if (x) g.lineTo(W * 0.1 + x, y); else g.moveTo(W * 0.1 + x, y); }
  g.stroke();
  g.fillStyle = Math.floor(now * 2) % 2 ? '#ff4d5e' : '#7a1c24'; g.beginPath(); g.arc(W * 0.92, H * 0.1, Math.max(3, W * 0.012), 0, Math.PI * 2); g.fill();
}
function erPreview(sf: Surface, now: number, faces: FaceBank) {
  sf.fit(); const g = sf.g, W = sf.pw, H = sf.ph; if (W < 4) return;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1240'); bg.addColorStop(1, '#3a1450'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) { const x = (i * 97.3) % W, y = (i * 53.1) % (H * 0.6); g.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(now * 2 + i)) + ')'; g.fillRect(x, y, 1.5, 1.5); }
  const pt = (k: number) => { const x = W * (0.06 + 0.88 * k); const y = H * (0.62 - 0.3 * Math.sin(k * Math.PI * 2.2) * Math.sin(k * Math.PI) - 0.12 * Math.sin(k * 13)); return [x, y]; };
  for (const [col, wd] of [['rgba(255,80,200,0.25)', 10], ['#ff5ec8', 3], ['#7fd8ff', 1.2]] as [string, number][]) {
    g.strokeStyle = col; g.lineWidth = wd * (W / 400); g.beginPath();
    for (let i = 0; i <= 160; i++) { const [x, y] = pt(i / 160); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  const k = (now * 0.12) % 1; const [cx, cy] = pt(k); const img = faces.get('rush', 'wow');
  const r = H * 0.12; if (img) g.drawImage(img, cx - r, cy - r * 1.7, r * 2, r * 2);
}
function gtgPreview(sf: Surface, now: number, faces: FaceBank) {
  sf.fit();
  const W = sf.pw, H = sf.ph; if (W < 4) return;
  const t = (now * 0.9) % 9;
  const s = stateAt(t);
  const a = now * 0.05;
  const cam = lookAt([Math.sin(a) * 3.6 - 0.4, 2.1, 2.2 - Math.cos(a) * 3.6], [-0.4, 0.7, 2.2], 0.9);
  renderWorld(sf.g, W, H, cam, s, { look: 'sweep', faces: (sl, m) => faces.get(sl, m) });
  lens(sf.g, W, H, 'hero', s, false);
}
let fontsDone = false;
function addFonts() {
  if (fontsDone) return; fontsDone = true;
  try { if (!document.querySelector('link[data-rf-fonts]')) document.head.appendChild(h('link', { rel: 'stylesheet', href: RF_FONTS, 'data-rf-fonts': '1' })); } catch (e) { /* optional */ }
}
function resolveTheme(t?: string): 'dark' | 'bright' {
  if (t === 'dark' || t === 'bright') return t;
  const c = sget(THEME_KEY); if (c === 'dark' || c === 'bright') return c;
  const hd = document.documentElement.getAttribute('data-theme'); if (hd === 'dark') return 'dark'; if (hd === 'light' || hd === 'bright') return 'bright';
  try { return matchMedia('(prefers-color-scheme: light)').matches ? 'bright' : 'dark'; } catch (e) { return 'dark'; }
}
function readMedia(): { avatars?: Partial<Record<Slug, string>>; music?: Record<string, string> } {
  try { const m = JSON.parse(sget(MEDIA_KEY) || 'null'); if (m && typeof m === 'object') return { avatars: m.avatars || {}, music: m.music || {} }; } catch (e) { /* none */ }
  return {};
}
function inviteLink(code: string) {
  try { const u = new URL(location.href); u.searchParams.set('reflectRoom', code); u.hash = ''; return u.toString(); } catch (e) { return code; }
}
function sel(el: HTMLElement) { try { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); if (s) { s.removeAllRanges(); s.addRange(r); } } catch (e) { /* ignore */ } }
export { sweepCam };
