// FEATURE 3 — Pocket Hush: comfort in 15 to 30 seconds.
//
// Two taps from home: the Pocket Hush card, then a moment (or one tap through
// a #pocket-<mode> link). No questions, no typing. Each moment runs inside the
// Mallow's own Hushfold realm (or the person's chosen environment) with the
// shared Effects layer, and ends with its own small closing: the Mallow's
// reaction, one of its authored lines, a short motif and the world settling.
// Every moment can be stopped at any time, replayed, kept as a favourite, and
// played without precise touch (each has a button alternative).

import { h, iconBtn, holdButton } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';
import * as effectsKit from '../core/effects.js';
import { EffectsLayer, Bloom } from '../core/effects.js';
import { pickSurprise } from '../core/pocket-rules.js';
import { POCKET, pocketById } from './pocket/catalog.js';
import { MALLOWS } from '../../src/mallows/registry.js';

export const meta = { id: 'pocket-hush', title: 'Pocket Hush' };

const MODES = {
  'quick-squeeze': () => import('./pocket/quick-squeeze.js'),
  'soft-breath': () => import('./pocket/soft-breath.js'),
  'gentle-glow': () => import('./pocket/gentle-glow.js'),
  'let-it-float': () => import('./pocket/let-it-float.js'),
  'quiet-moment': () => import('./pocket/quiet-moment.js'),
};

const recent = [];   // this session's moments, most recent first (for Surprise Me)
let lineCount = 0;

export function mount(root, ctx, { mode } = {}) {
  let view = null;     // current picker or moment
  let alive = true;

  function show(next) { view?.unmount(); view = next; }
  function picker() { show(pickerView(root, ctx, { start: (id, variant, surprise) => moment(id, variant, surprise) })); }
  async function moment(id, variant = {}, surprise = false) {
    const load = MODES[id];
    if (!load) { picker(); return; }
    const mod = (await load()).default;
    if (!alive) return;
    show(momentView(root, ctx, mod, { id, variant, surprise, onClose: picker, again: () => moment(id, variant, surprise), other: picker }));
  }

  if (mode && MODES[mode]) moment(mode); else picker();
  return { unmount() { alive = false; view?.unmount(); } };
}

// ---------------------------------------------------------------- picker --
function pickerView(root, ctx, { start }) {
  const { dna } = ctx;
  const screen = h('section', { class: 'screen home pocket', 'aria-label': 'Pocket Hush' });
  const helps = new Set(dna.suggestions(5).filter((s) => s.kind === 'pocket').map((s) => s.id));
  const favs = new Set(dna.favourites().filter((f) => f.kind === 'pocket').map((f) => f.id));
  // what the person said helps (and favourites) come first; otherwise the authored order
  const order = [...POCKET].sort((a, b) => (helps.has(b.id) || favs.has(b.id)) - (helps.has(a.id) || favs.has(a.id)));
  const surprise = () => {
    const hour = new Date().getHours();
    const history = dna.learning ? dna.history().filter((x) => x.kind === 'pocket').sort((a, b) => b.last - a.last).map((x) => x.id) : [];
    const pick = pickSurprise({ modes: POCKET, bias: dna.surpriseBias(), recent: [...recent, ...history], hour, reducedMotion: ctx.prefs.reducedMotion(), seed: Date.now() & 0x7fffffff });
    start(pick.mode, pick.variant, true);
  };
  const tile = (m) => h('button', { type: 'button', class: 'ptile', 'data-mode': m.id, onclick: () => start(m.id, {}, false) },
    h('span', { class: 'pglyph', 'aria-hidden': 'true' }, m.glyph),
    h('span', { class: 't' }, m.title),
    h('span', { class: 'd' }, m.blurb),
    h('span', { class: 'meta' }, favs.has(m.id) ? '★ Favourite' : helps.has(m.id) ? 'You said this helps' : m.seconds));
  screen.append(h('div', { class: 'home-inner' },
    h('div', { class: 'brand' },
      iconBtn('back', 'Back to the Sensory Lab', () => ctx.navigate('/')),
      h('h1', {}, 'Pocket Hush'),
      h('span', { class: 'pill' }, MALLOWS[ctx.mallowId].name)),
    h('p', { class: 'dna-lede' }, 'A short moment with your Mallow. Nothing to answer.'),
    h('div', { class: 'ptiles' }, ...order.map(tile),
      h('button', { type: 'button', class: 'ptile surprise', 'data-mode': 'surprise', onclick: surprise },
        h('span', { class: 'pglyph', 'aria-hidden': 'true' }, '✦'),
        h('span', { class: 't' }, 'Surprise Me'),
        h('span', { class: 'd' }, 'Your Mallow picks one'),
        h('span', { class: 'meta' }, 'One tap')))));
  root.append(screen);
  return { unmount() { screen.remove(); } };
}

// ---------------------------------------------------------------- moment --
function momentView(root, ctx, mod, { id, variant, surprise, onClose, again, other }) {
  const { dna, sound } = ctx;
  const info = pocketById(id);
  const mallow = MALLOWS[ctx.mallowId];
  let mode = null, ended = false, closed = false, t = 0, raf = 0, last = 0, captureFn = null, gestureFn = null;
  const s = stageScreen(root, ctx, {
    title: info.title, subtitle: surprise ? 'Surprise' : mallow.name, material: variant.material || 'marshmallow',
    backdrop: dna.environment('moment', ctx.mallowId), settings: false,
    onExit: () => close(), onEvent: (e) => gestureFn?.(e),
  });
  s.screen.classList.add('moment', 'entering');
  requestAnimationFrame(() => s.screen.classList.remove('entering'));
  const companion = s.companion, rig = companion.rig;
  const effects = new EffectsLayer(s.screen, { quality: ctx.quality, reducedMotion: ctx.prefs.reducedMotion() });
  const hintEl = h('p', { class: 'moment-hint', role: 'status', 'aria-live': 'polite' });
  s.screen.append(hintEl);
  const pal = dna.palette();
  const palette = pal || { glow: mallow.colours.glow, soft: mallow.colours.accent, deep: mallow.colours.body };

  // pointer routing: a mode may own a touch (a light, a bubble) before the Mallow sees it
  const owned = new Map();
  const local = (e) => { const r = s.stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const skip = (e) => e.target.closest?.('button, input, .end-card, .topbar, .bottom');
  const onDown = (e) => {
    if (!captureFn || ended || skip(e)) return;
    const p = local(e);
    if (captureFn('down', p, e)) {
      owned.set(e.pointerId, { ...p, t: performance.now(), vx: 0, vy: 0 });
      e.stopPropagation(); e.preventDefault();
      sound.unlock();
    }
  };
  const onMove = (e) => {
    const o = owned.get(e.pointerId);
    if (!o) return;
    const p = local(e), now = performance.now(), dt = Math.max(8, now - o.t);
    o.vx = o.vx * 0.5 + ((p.x - o.x) / dt * 1000) * 0.5; o.vy = o.vy * 0.5 + ((p.y - o.y) / dt * 1000) * 0.5;
    Object.assign(o, p, { t: now });
    captureFn?.('move', p, e, o);
    e.stopPropagation();
  };
  const onUp = (e) => {
    const o = owned.get(e.pointerId);
    if (!o) return;
    owned.delete(e.pointerId);
    const stale = performance.now() - o.t > 90;
    captureFn?.('up', local(e), e, { vx: stale ? 0 : o.vx, vy: stale ? 0 : o.vy });   // the moment may have ended mid-touch
    e.stopPropagation();
  };
  for (const [ev, fn] of [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onUp]]) s.screen.addEventListener(ev, fn, true);

  const api = {
    ctx, id, variant, mallowId: ctx.mallowId, mallow, companion, rig, sound, dna, effects, effectsKit, screen: s.screen, stage: s.stage,
    get realm() { return s.realm; },
    palette, reduced: ctx.prefs.reducedMotion(), timing: dna.breathTiming(), quality: ctx.quality,
    /** Mallow geometry on screen (CSS px in the stage). */
    body() {
      const S = rig._S || rig.S, soft = rig.soft;
      const [bx0, by0, bx1, by1] = rig.mallow.bodyBox;
      const hh = (soft ? soft.H : by1 - by0) * S, ww = (soft ? soft.W : bx1 - bx0) * S;
      const bottom = rig.BASE - (rig._lift || 0);
      return { cx: rig.CX, bottom, top: bottom - hh, mid: bottom - hh / 2, h: hh, w: ww, W: rig.W, H: rig.H };
    },
    hint(text, ms = 2600) {
      hintEl.textContent = text;
      hintEl.classList.add('on');
      clearTimeout(api._hintT);
      if (ms) api._hintT = setTimeout(() => hintEl.classList.remove('on'), ms);
    },
    button(label, onPress, attrs = {}) { const b = h('button', { type: 'button', class: 'chip', onclick: onPress, ...attrs }, label); actions.append(b); actions.hidden = false; return b; },
    holdButton(label, onStart, onEnd, attrs = {}) { const b = holdButton(label, onStart, onEnd, attrs); actions.append(b); actions.hidden = false; return b; },
    dots(n) {
      const wrap = h('div', { class: 'moment-dots', role: 'img', 'aria-label': `0 of ${n}` }, ...Array.from({ length: n }, () => h('span', {})));
      s.bottom.prepend(wrap);
      return (k) => { [...wrap.children].forEach((d, i) => d.classList.toggle('on', i < k)); wrap.setAttribute('aria-label', `${k} of ${n}`); };
    },
    capture(fn) { captureFn = fn; },
    onGesture(fn) { gestureFn = fn; },
    progress(p) { s.realm?.transform(Math.min(0.85, p * 0.85)); },
    complete() { finish('complete'); },
  };
  const actions = h('div', { class: 'chips', role: 'group', 'aria-label': 'Without touch', hidden: true });
  s.bottom.append(actions);

  companion.restOverride = { mix: { calm: 0.5, comforted: 0.5 }, i: 0.35 };
  mode = mod.start(api);
  api.hint(mod.hint, 3200);
  // test / debugging handle (development lab only)
  if (globalThis.__lab) globalThis.__lab.moment = { id, variant, api, get mode() { return mode; }, get t() { return t; }, get ended() { return ended; } };

  const loop = (now) => {
    raf = 0;
    if (closed || document.hidden) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (ended) return;
    t += dt;
    mode.tick?.(dt, t);
    if (mode.done?.()) finish('complete');
    else if (t >= (mod.maxSeconds || 30)) finish('time');
  };
  const vis = () => { if (!document.hidden && !raf && !closed) { last = 0; raf = requestAnimationFrame(loop); } };
  document.addEventListener('visibilitychange', vis);
  raf = requestAnimationFrame(loop);

  function finish(why) {
    if (ended) return;
    ended = true;
    captureFn = null;
    actions.hidden = true;
    const e = mode.ending?.(why) || {};
    if (e.mix) companion.director.play(e.mix, e.i ?? 0.65, 3);
    if (e.reaction) rig.react(e.reaction);
    sound.motif(ctx.mallowId, e.motif || 'rest');
    s.realm?.transform(1);
    const b = api.body();
    effects.add(new Bloom({ x: b.cx, y: b.mid, r: b.h * 1.4, color: palette.glow, dur: 2 }));
    mode.finish?.(why);
    recent.unshift(id); recent.length = Math.min(recent.length, 4);
    dna.record({ kind: 'pocket', id });
    setTimeout(() => { if (!closed) endCard(e); }, 1300);
  }

  function endCard(e) {
    const lines = mallow.voice[e.line || 'rest'] || mallow.voice.rest;
    const line = lines[lineCount++ % lines.length];
    const fav = { kind: 'pocket', id };
    const keep = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(dna.isFavourite(fav)), hidden: !dna.enabled,
      onclick: () => keep.setAttribute('aria-pressed', String(dna.toggleFavourite(fav))) }, '★ Keep');
    const card = h('div', { class: 'end-card', role: 'dialog', 'aria-label': `${info.title} finished` },
      e.caption ? h('p', { class: 'end-cap' }, e.caption) : null,
      h('p', { class: 'end-line' }, `“${line}”`, h('span', {}, ` ${mallow.name}`)),
      h('div', { class: 'end-actions' },
        h('button', { type: 'button', class: 'chip primary', onclick: () => again() }, 'Again'),
        h('button', { type: 'button', class: 'chip', onclick: () => other() }, 'Something else'),
        keep,
        h('button', { type: 'button', class: 'chip', onclick: () => ctx.navigate('/') }, 'Done')));
    s.screen.append(card);
    requestAnimationFrame(() => card.classList.add('on'));
    card.querySelector('button')?.focus({ preventScroll: true });
  }

  function close() {
    if (closed) return;
    s.screen.classList.add('leaving');
    setTimeout(() => onClose(), 260);
  }

  return {
    unmount() {
      closed = true;
      if (globalThis.__lab?.moment?.api === api) globalThis.__lab.moment = null;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', vis);
      for (const [ev, fn] of [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onUp]]) s.screen.removeEventListener(ev, fn, true);
      clearTimeout(api._hintT);
      try { mode?.stop?.(); } catch (err) { console.warn(err); }
      effects.destroy();
      s.unmount();
    },
  };
}
