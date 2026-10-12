// The Memory Garden installation: what happens after the person taps "Keep
// this" on a discovery.
//
//   offerSave({ skillId, mallow, app, reducedMotion, signal }) → Promise<boolean>
//       The offer itself: a small non-modal card ("Keep this in your Memory
//       Garden?" + the tool's title, Not now / Keep this). Resolves true only
//       on the explicit "Keep this" tap. Play carries on around it.
//   playInstall({ canvas | ctx, from:{x,y} | origin:rect, skillId, mallow, app,
//                 reducedMotion, lowStim, onDone }) → Promise<{action}> & { skip(), cancel(), seek(t) }
//       The sequence (≈3.4 s, the card at 2.6 s; reduced motion ≈1.5 s): a
//       luminous ripple gathers above the Mallow → the charm forms in it →
//       it travels through a brief portal (one calm breath of light, ≤1.2
//       pulses/s, a single soft bloom with a ≥0.3 s rise, no flashes) → an
//       elegant card: "NEW TOOL SAVED", the title (Fraunces, --type-reward),
//       one line, "Visit the garden" / "Keep playing". The tool is already
//       saved before this starts, so skipping, leaving or never tapping the
//       card loses nothing. Skippable (Skip pill, Escape).
//   keepDiscovery({ app, store, skillId, worldId, mallow, origin, reducedMotion, signal })
//       → Promise<{ kept, already, action }>: offer → save (on the tap) → install.
//       A tool that is already kept is not offered again: it is marked as
//       practised and a quiet note says so.
//   installAvoidRects() → the offer/card rects, for subtitle placement.
//
// Draws on its own full-screen canvas above the stage (pointer-events:none,
// so the Mallow stays squeezable), or on a canvas/ctx you pass in (it then
// owns that canvas for the duration and clears it every frame). Glow and
// well sprites are made once per colour; nothing big is allocated per frame.

import { drawCharm, charmCanvas, charmPalette } from './charm.js';
import { getSkill } from './skills.js';
import { MALLOWS } from '../mallows/registry.js';
import { saveSkill, hasSkill, practised } from '../engine/garden.js';

export const INSTALL_TIMING = Object.freeze({ gather: 0, form: 0.5, portalOpen: 0.95, travel: 1.32, enter: 2.3, close: 2.5, card: 2.6, end: 3.4 });
export const INSTALL_TIMING_REDUCED = Object.freeze({ form: 0, card: 0.75, end: 1.5 });

// ------------------------------------------------------------------ CSS --
const CSS = `
.hm-install, .hm-offer, .hm-note { --hm-ff-ui: var(--ff-ui, "HM Manrope", system-ui, -apple-system, "Segoe UI", sans-serif); --hm-ff-voice: var(--ff-voice, "HM Nunito Sans", ui-rounded, system-ui, sans-serif); --hm-ff-story: var(--ff-story, "HM Fraunces", Georgia, "Times New Roman", serif); --hm-k: var(--type-scale, 1); }
.hm-install { position: fixed; inset: 0; z-index: 6; pointer-events: none; color: var(--text-1, #f7f3ff); }
.hm-install-fx { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.hm-install-skip { position: absolute; top: calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 74px); right: 20px; pointer-events: auto; min-height: 44px; min-width: 64px; padding: 0 18px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.22); background: rgba(16,12,40,.55); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); color: #f7f3ff; cursor: pointer;
  font: var(--type-control, 650 calc(15px * var(--hm-k))/1.2 var(--hm-ff-ui)); letter-spacing: var(--type-control-ls, 0); opacity: 0; transition: opacity .4s ease; }
.hm-install.is-animating .hm-install-skip { opacity: .94; }
.hm-install:not(.is-animating) .hm-install-skip { pointer-events: none; visibility: hidden; }
.hm-install-card { --glow: 255,217,138; position: absolute; left: 50%; top: 0; box-sizing: border-box; width: min(calc(100vw - 40px), 360px); padding: 0 20px 18px; border-radius: 28px; text-align: center;
  background: radial-gradient(130% 80% at 50% 0%, rgba(var(--glow), .2), rgba(var(--glow), 0) 62%), rgba(13, 9, 34, .88);
  border: 1px solid rgba(255,255,255,.14); box-shadow: 0 24px 60px rgba(4,2,16,.55), inset 0 1px 0 rgba(255,255,255,.08), 0 0 70px rgba(var(--glow), .16);
  -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
  opacity: 0; transform: translate(-50%, 16px) scale(.97); pointer-events: none; visibility: hidden;
  transition: opacity .6s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.2,.9,.25,1), visibility 0s linear .6s; }
.hm-install-card.is-in { opacity: 1; transform: translate(-50%, 0) scale(1); pointer-events: auto; visibility: visible; transition-delay: 0s; }
.hm-install-card.is-out { opacity: 0; transform: translate(-50%, 8px) scale(.985); pointer-events: none; transition-duration: .32s; }
.hm-install.is-reduced .hm-install-card { transform: translate(-50%, 0); transition: opacity .45s ease, visibility 0s linear .45s; }
.hm-install.is-reduced .hm-install-card.is-in { transition-delay: 0s; }
.hm-install-charm { display: block; margin: -60px auto -4px; width: 120px; height: 120px; }
.hm-install-card.is-compact { padding: 0 16px 14px; border-radius: 24px; }
.hm-install-card.is-compact .hm-install-charm { width: 88px; height: 88px; margin-top: -44px; margin-bottom: -6px; }
.hm-install-card.is-compact .hm-install-title { margin-top: 6px; }
.hm-install-card.is-compact .hm-install-line { margin-top: 6px; }
.hm-install-card.is-compact .hm-actions { margin-top: 12px; }

.hm-install-over { margin: 2px 0 0; font: var(--type-overline, 750 calc(13px * var(--hm-k))/1.25 var(--hm-ff-ui)); letter-spacing: var(--type-overline-ls, .12em); text-transform: uppercase; color: #ffd98a; text-shadow: 0 0 18px rgba(255,217,138,.35); }
.hm-install-title { margin: 8px 0 0; font: var(--type-reward, 600 calc(clamp(24px, 7.273vw - 1.273px, 30px) * var(--hm-k))/1.12 var(--hm-ff-story)); letter-spacing: var(--type-reward-ls, -.01em); font-optical-sizing: auto; text-wrap: balance; color: #fff6e6; }
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .hm-install-title span { background: linear-gradient(100deg, #fff1d6 0%, #fff1d6 38%, #ffffff 48%, #ffe7b0 54%, #fff1d6 64%, #fff1d6 100%); background-size: 260% 100%; background-position: 100% 0;
    -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .hm-install-card.is-in .hm-install-title span { animation: hmTitleLight 2.2s cubic-bezier(.4,0,.2,1) .35s 1 both; }
  .hm-install.is-reduced .hm-install-title span { animation: none; background-position: 100% 0; }
}
@keyframes hmTitleLight { from { background-position: 100% 0; } to { background-position: 0% 0; } }
.hm-install-line { margin: 8px auto 0; max-width: 30ch; font: var(--type-body, 500 calc(17px * var(--hm-k))/1.5 var(--hm-ff-voice)); letter-spacing: var(--type-body-ls, 0); color: #d9d2f2; }
.hm-actions { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-top: 16px; }
.hm-actions button { flex: 1 1 auto; white-space: nowrap; min-height: 48px; padding: 0 12px; border-radius: 999px; cursor: pointer; font: var(--type-button, 700 calc(16px * var(--hm-k))/1.15 var(--hm-ff-ui)); letter-spacing: var(--type-button-ls, .005em);
  transition: transform .14s cubic-bezier(.22,1,.36,1), background .14s; }
.hm-actions button:active { transform: scale(.97); }
.hm-actions .hm-primary { border: 0; color: #23140a; background: linear-gradient(180deg, #ffe2a3, #ffd98a 55%, #ffb86b); box-shadow: 0 10px 28px rgba(255,190,90,.28), inset 0 1px 0 rgba(255,255,255,.6); }
.hm-actions .hm-quiet { border: 1px solid rgba(255,255,255,.2); color: #f7f3ff; background: rgba(255,255,255,.07); }
.hm-actions button:focus-visible { outline: 2.5px solid #ffd98a; outline-offset: 3px; }
/* the offer: a small glass card above the dock, play carries on around it */
.hm-offer { --glow: 255,217,138; position: fixed; z-index: 6; left: 50%; bottom: 96px; box-sizing: border-box; width: min(calc(100vw - 40px), 380px); padding: 14px 16px 14px; border-radius: 24px;
  background: radial-gradient(120% 120% at 0% 0%, rgba(var(--glow), .16), rgba(var(--glow), 0) 55%), rgba(13, 9, 34, .9); border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 18px 50px rgba(4,2,16,.5), 0 0 50px rgba(var(--glow), .12); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); color: #f7f3ff;
  opacity: 0; transform: translate(-50%, 14px); transition: opacity .45s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.2,.9,.25,1); }
.hm-offer.is-in { opacity: 1; transform: translate(-50%, 0); }
.hm-offer.is-out { opacity: 0; transform: translate(-50%, 8px); transition-duration: .28s; pointer-events: none; }
.hm-offer.is-reduced { transform: translate(-50%, 0); transition: opacity .35s ease; }
.hm-offer-head { display: flex; align-items: center; gap: 12px; text-align: left; }
.hm-offer-head canvas { flex: 0 0 auto; margin: -10px -6px -10px -8px; }
.hm-offer-ask { margin: 0; font: var(--type-label, 600 calc(14px * var(--hm-k))/1.35 var(--hm-ff-ui)); color: #d9d2f2; }
.hm-offer-title { margin: 3px 0 0; font: 750 calc(18px * var(--hm-k))/1.25 var(--hm-ff-voice); color: #fff6e6; text-wrap: balance; }
.hm-offer .hm-actions { margin-top: 12px; }
.hm-note { position: fixed; z-index: 6; left: 50%; bottom: 104px; transform: translateX(-50%); width: max-content; max-width: min(calc(100vw - 40px), 360px); box-sizing: border-box; padding: 11px 18px; border-radius: 18px; pointer-events: none; text-wrap: balance;
  background: rgba(13, 9, 34, .86); border: 1px solid rgba(255,255,255,.14); color: #f1ecff; font: var(--type-label, 600 calc(14px * var(--hm-k))/1.35 var(--hm-ff-ui)); text-align: center;
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); opacity: 0; transition: opacity .4s ease; }
.hm-note.is-in { opacity: 1; }
`;
function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('hm-install-css')) return;
  const s = document.createElement('style');
  s.id = 'hm-install-css';
  s.textContent = CSS;
  document.head.append(s);
}

// ------------------------------------------------------------- helpers --
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const k01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eOut = (k) => 1 - (1 - k) ** 3;
const eIn = (k) => k * k * k;
const eInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const eBack = (k) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2; };
/** Photosafe envelope: rises over `rise` s (≥0.28), holds, decays. */
const env = (t, start, rise, hold, decay) => {
  if (t < start) return 0;
  if (t < start + rise) { const k = (t - start) / rise; return k * k * (3 - 2 * k); }
  if (t < start + rise + hold) return 1;
  const k = (t - start - rise - hold) / decay;
  return k >= 1 ? 0 : 1 - k * k * (3 - 2 * k);
};
const hex = (h) => { const v = String(h || '#ffffff').replace('#', ''); return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0); };
const rgbaOf = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1).toFixed(3)})`;
const reducedPref = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const mallowOf = (m) => (m && typeof m === 'object' && m.colours ? m : MALLOWS[m] || null);

const SPRITES = new Map();
function glowSprite(c) {
  const key = `g${c.join(',')}`;
  if (SPRITES.has(key)) return SPRITES.get(key);
  const s = document.createElement('canvas'); s.width = s.height = 128;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, rgbaOf(c, 1)); gr.addColorStop(0.22, rgbaOf(c, 0.55)); gr.addColorStop(0.55, rgbaOf(c, 0.16)); gr.addColorStop(1, rgbaOf(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  SPRITES.set(key, s);
  return s;
}
/** The portal's depth: a dark violet well with a far, small light. */
function wellSprite(deep, glow) {
  const key = `w${deep.join(',')}|${glow.join(',')}`;
  if (SPRITES.has(key)) return SPRITES.get(key);
  const s = document.createElement('canvas'); s.width = s.height = 256;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,248,230,0.95)');
  gr.addColorStop(0.07, rgbaOf(glow, 0.85));
  gr.addColorStop(0.3, rgbaOf(deep.map((v, i) => Math.round(v * 0.6 + glow[i] * 0.15)), 0.96));
  gr.addColorStop(0.78, rgbaOf(deep.map((v) => Math.round(v * 0.45)), 0.97));
  gr.addColorStop(0.93, rgbaOf(glow, 0.55));
  gr.addColorStop(1, rgbaOf(glow, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  SPRITES.set(key, s);
  return s;
}
const GOLD = [255, 217, 138], WHITE = [255, 255, 255];

let openCard = null, openOffer = null;
// move focus to the card only for people using a keyboard (touch play is never interrupted)
let keyboardUser = false;
if (typeof addEventListener === 'function') {
  addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') keyboardUser = true; }, true);
  addEventListener('pointerdown', () => { keyboardUser = false; }, true);
}
/** Rects of the offer / card on screen now (for subtitle avoidance). */
export function installAvoidRects() {
  return [openOffer, openCard].filter((e) => e?.isConnected).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
}

function sceneRoot() { return typeof document !== 'undefined' ? document.querySelector('#scene > *') : null; }
/** Calls fn once if the scene that was showing is replaced (the person navigated away). */
function onSceneLeave(fn) {
  const sceneEl = document.getElementById('scene'), root = sceneRoot();
  if (!sceneEl || !root || typeof MutationObserver === 'undefined') return () => {};
  const mo = new MutationObserver(() => { if (!root.isConnected) { mo.disconnect(); fn(); } });
  mo.observe(sceneEl, { childList: true });
  return () => mo.disconnect();
}
function dockTop() {
  const d = document.querySelector('.hf-dock');
  const r = d?.getBoundingClientRect();
  return r && r.height > 0 ? r.top : innerHeight - 84;
}

// --------------------------------------------------------------- offer --
/** The explicit choice. Resolves true only on "Keep this". */
export function offerSave({ skillId, mallow, app = null, reducedMotion, signal, title } = {}) {
  ensureCss();
  const skill = getSkill(skillId);
  const reduced = reducedMotion ?? reducedPref();
  const name = title || skill?.title || 'This discovery';
  openOffer?.__close?.(false);
  return new Promise((resolve) => {
    const m = mallowOf(mallow) || MALLOWS[skill?.mallow] || MALLOWS.noomi;
    const el = document.createElement('section');
    el.className = `hm-offer${reduced ? ' is-reduced' : ''}`;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Keep this discovery');
    el.style.setProperty('--glow', hex(m.colours.glow).join(','));
    el.style.bottom = `${Math.max(24, innerHeight - dockTop() + 12)}px`;
    const charm = charmCanvas({ skillId, mallow: m.id, box: 72, reducedMotion: reduced });
    const head = document.createElement('div'); head.className = 'hm-offer-head';
    const txt = document.createElement('div');
    const ask = document.createElement('p'); ask.className = 'hm-offer-ask'; ask.textContent = 'Keep this in your Memory Garden?';
    const t = document.createElement('p'); t.className = 'hm-offer-title'; t.textContent = name;
    txt.append(ask, t); head.append(charm.el, txt);
    const actions = document.createElement('div'); actions.className = 'hm-actions';
    const no = document.createElement('button'); no.type = 'button'; no.className = 'hm-quiet'; no.textContent = 'Not now';
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'hm-primary'; yes.textContent = 'Keep this';
    actions.append(no, yes);
    el.append(head, actions);
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
    openOffer = el;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    let done = false;
    const stopLeave = onSceneLeave(() => close(false));
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    function close(v) {
      if (done) return;
      done = true;
      stopLeave(); document.removeEventListener('keydown', onKey); signal?.removeEventListener?.('abort', onAbort);
      el.classList.remove('is-in'); el.classList.add('is-out');
      setTimeout(() => { el.remove(); charm.destroy(); if (openOffer === el) openOffer = null; }, 320);
      if (v) { try { app?.audio?.ui?.('select'); app?.haptic?.('soft'); } catch { /* sound is decoration */ } }
      resolve(v);
    }
    const onAbort = () => close(false);
    if (signal?.aborted) { close(false); return; }
    signal?.addEventListener?.('abort', onAbort);
    el.__close = close;
    no.addEventListener('click', () => close(false));
    yes.addEventListener('click', () => close(true));
  });
}

/** A quiet one-line note above the dock (already kept, etc.). */
function note(text, ms = 2800) {
  ensureCss();
  const el = document.createElement('div');
  el.className = 'hm-note'; el.setAttribute('role', 'status'); el.textContent = text;
  el.style.bottom = `${Math.max(24, innerHeight - dockTop() + 12)}px`;
  document.body.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 450); }, ms);
}

// -------------------------------------------------------- the sequence --
function fromPoint({ from, origin }) {
  if (from && Number.isFinite(from.x) && Number.isFinite(from.y)) return { x: from.x, y: from.y };
  if (origin && Number.isFinite(origin.top)) {
    const w = origin.width || 0, h = origin.height || 0;
    const cx = origin.cx ?? (origin.left + w / 2);
    // just above the Mallow's head, where the ripple can form
    return { x: cx, y: origin.top - Math.min(56, h * 0.16) };
  }
  return { x: innerWidth / 2, y: innerHeight * 0.42 };
}

export function playInstall(opts = {}) {
  ensureCss();
  const { skillId, app = null, onDone = null, lowStim = false } = opts;
  const skill = getSkill(skillId);
  const reduced = opts.reducedMotion ?? reducedPref();
  const m = mallowOf(opts.mallow) || MALLOWS[skill?.mallow] || MALLOWS.noomi;
  const P = charmPalette(skillId, m.id);
  const C = { glow: hex(m.colours.glow), accent: hex(m.colours.accent), rim: P.rim, core: P.core, deep: P.deep };
  const T = reduced ? INSTALL_TIMING_REDUCED : INSTALL_TIMING;

  // ---- DOM: overlay, canvas, skip, card
  openCard?.__finish?.('replaced');
  const root = document.createElement('div');
  root.className = `hm-install is-animating${reduced ? ' is-reduced' : ''}`;
  let canvas = opts.canvas || opts.ctx?.canvas || null;
  const own = !canvas;
  if (own) { canvas = document.createElement('canvas'); canvas.className = 'hm-install-fx'; canvas.setAttribute('aria-hidden', 'true'); root.append(canvas); }
  const g = opts.ctx || canvas.getContext('2d');
  const skip = document.createElement('button');
  skip.type = 'button'; skip.className = 'hm-install-skip'; skip.textContent = 'Skip'; skip.setAttribute('aria-label', 'Skip the animation');
  const card = document.createElement('section');
  card.className = 'hm-install-card';
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'false');
  card.style.setProperty('--glow', C.glow.join(','));
  const cid = `hm-install-${Math.random().toString(36).slice(2, 8)}`;
  const charm = charmCanvas({ skillId, mallow: m.id, box: 120, reducedMotion: reduced, animate: false });
  charm.el.classList.add('hm-install-charm');
  const over = document.createElement('p'); over.className = 'hm-install-over'; over.textContent = 'New tool saved';
  const h = document.createElement('h2'); h.className = 'hm-install-title'; h.id = cid;
  const hs = document.createElement('span'); hs.textContent = skill?.title || 'A new discovery'; h.append(hs);
  const line = document.createElement('p'); line.className = 'hm-install-line'; line.textContent = skill?.essence || 'It’s waiting for you in your Memory Garden.';
  const actions = document.createElement('div'); actions.className = 'hm-actions';
  const visit = document.createElement('button'); visit.type = 'button'; visit.className = 'hm-primary'; visit.textContent = 'Visit the garden';
  const keep = document.createElement('button'); keep.type = 'button'; keep.className = 'hm-quiet'; keep.textContent = 'Keep playing';
  actions.append(visit, keep);
  card.setAttribute('aria-labelledby', cid);
  card.append(charm.el, over, h, line, actions);
  root.append(skip, card);
  document.body.append(root);
  openCard = card;

  // ---- geometry (client CSS px)
  let W = innerWidth, H = innerHeight, dpr = 1;
  const F = fromPoint(opts);
  const Pp = { x: 0, y: 0 };
  let S = 80, Rp = 64;
  function measure() {
    W = innerWidth; H = innerHeight;
    if (own) {
      dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    } else dpr = canvas.width / Math.max(1, canvas.clientWidth || W);
    const U = Math.min(W, H);
    S = clamp(U * 0.22, 64, 112);
    Rp = clamp(U * 0.17, 52, 92);
    F.x = clamp(F.x, S, W - S); F.y = clamp(F.y, 90 + S * 0.6, H - S);
    const top = 96 + Rp;
    Pp.y = Math.max(top, F.y - Math.max(170, H * 0.3));
    Pp.x = W / 2;
    if (F.y - Pp.y < 120) { Pp.y = Math.max(top, F.y - 60); Pp.x = F.x < W / 2 ? W * 0.72 : W * 0.28; }
    placeCard();
  }
  function placeCard() {
    card.classList.toggle('is-compact', H < 700 || W < 360);
    const ch = card.offsetHeight || 260;
    const lift = card.classList.contains('is-compact') ? 44 : 60;     // the charm rises above the card's edge
    const safeTop = 64, safeBottom = Math.max(H - dockTop(), 24);
    const avoid = opts.origin && Number.isFinite(opts.origin.top) ? opts.origin : null;
    let y = clamp(Pp.y - 40, safeTop + lift, Math.max(safeTop + lift, H - safeBottom - ch - 12));
    // keep the Mallow's face clear when there is room above it; else sit as high as possible
    if (avoid && y + ch > avoid.top + avoid.height * 0.28) y = Math.max(safeTop + lift, Math.min(y, avoid.top - ch - 8));
    card.style.top = `${Math.round(y)}px`;
  }

  // ---- drawing
  const glowS = glowSprite(C.glow), goldS = glowSprite(GOLD), whiteS = glowSprite(WHITE), accentS = glowSprite(C.accent);
  const well = wellSprite(C.deep, C.glow);
  const N = lowStim ? 12 : 26;
  const motes = new Float32Array(N * 4);       // angle, radius, start, size
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < N; i++) { motes[i * 4] = rnd() * Math.PI * 2; motes[i * 4 + 1] = 0.9 + rnd() * 0.7; motes[i * 4 + 2] = 0.02 + rnd() * 0.36; motes[i * 4 + 3] = 0.6 + rnd() * 0.8; }
  const dust = new Float32Array(12 * 3);
  for (let i = 0; i < 12; i++) { dust[i * 3] = rnd() * Math.PI * 2; dust[i * 3 + 1] = 0.4 + rnd() * 0.6; dust[i * 3 + 2] = rnd(); }

  const sprite = (s, x, y, r, a) => { if (a > 0.003 && r > 0.5) { g.globalAlpha = Math.min(1, a); g.drawImage(s, x - r, y - r, r * 2, r * 2); } };
  const ctrl = () => ({ x: lerp(F.x, Pp.x, 0.5) + (F.x <= Pp.x ? -1 : 1) * W * 0.2, y: lerp(F.y, Pp.y, 0.55) });
  function bez(e, c) { const u = 1 - e; return { x: u * u * F.x + 2 * u * e * c.x + e * e * Pp.x, y: u * u * F.y + 2 * u * e * c.y + e * e * Pp.y }; }

  function frameFull(t) {
    const U = S / 80;
    g.globalCompositeOperation = 'lighter';
    // 1. a luminous ripple gathers above the Mallow
    const gather = env(t, 0, 0.32, 0.5, 0.6);
    sprite(glowS, F.x, F.y, S * (0.7 + 0.5 * eOut(k01(t, 0, 0.8))), gather * 0.55);
    for (let i = 0; i < 3; i++) {
      const k = k01(t, 0.04 + i * 0.17, 0.82 + i * 0.17);
      if (k <= 0 || k >= 1) continue;
      const a = Math.sin(Math.PI * k), rx = (12 + 78 * eOut(k)) * U, ry = (6 + 30 * eOut(k)) * U;
      g.strokeStyle = rgbaOf(i === 1 ? C.accent : C.glow, 1);
      g.globalAlpha = a * 0.16; g.lineWidth = (9 - 4 * k) * U;
      g.beginPath(); g.ellipse(F.x, F.y, rx, ry, 0, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = a * 0.6; g.lineWidth = (2.2 - 1.2 * k) * U;
      g.beginPath(); g.ellipse(F.x, F.y, rx, ry, 0, 0, Math.PI * 2); g.stroke();
    }
    for (let i = 0; i < N; i++) {
      const k = k01(t, motes[i * 4 + 2], motes[i * 4 + 2] + 0.56);
      if (k <= 0 || k >= 1) continue;
      const e = eIn(k), a0 = motes[i * 4], r0 = motes[i * 4 + 1] * 120 * U;
      const r = r0 * (1 - e), a = a0 + 1.7 * e;
      sprite(i % 3 ? glowS : goldS, F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.62, (3 + 3 * motes[i * 4 + 3]) * U * (1.2 - e * 0.5), Math.sin(Math.PI * k) * 0.9);
    }
    // 2. the portal: opens, breathes (≈1.1/s, shallow), takes the charm, closes
    const open = eOut(k01(t, T.portalOpen, T.portalOpen + 0.55)) * (1 - eIn(k01(t, T.close, T.close + 0.6)));
    if (open > 0.002) {
      // one calm breath a second, shallow: light, never flicker
      const r = Rp * open, breath = 0.88 + 0.12 * Math.sin(Math.PI * 2 * t);
      sprite(glowS, Pp.x, Pp.y, r * 2.7, 0.36 * open * breath);
      sprite(accentS, Pp.x, Pp.y, r * 1.8, 0.14 * open);
      // a corona of slow rays round the rim
      g.lineCap = 'round';
      for (let i = 0; i < 24; i++) {
        const a = i * (Math.PI / 12) + t * 0.16;
        const w = 0.5 + 0.5 * Math.sin(t * 1.2 + i * 2.1);
        const r0 = r * 1.08, r1 = r * (1.16 + 0.22 * w);
        g.strokeStyle = rgbaOf(i % 4 === 0 ? GOLD : i % 4 === 2 ? C.accent : C.glow, 1);
        g.globalAlpha = (0.08 + 0.16 * w) * open;
        g.lineWidth = (1 + 0.9 * w) * U;
        g.beginPath(); g.moveTo(Pp.x + Math.cos(a) * r0, Pp.y + Math.sin(a) * r0); g.lineTo(Pp.x + Math.cos(a) * r1, Pp.y + Math.sin(a) * r1); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = Math.min(1, open * 1.4);
      g.drawImage(well, Pp.x - r * 1.08, Pp.y - r * 1.08, r * 2.16, r * 2.16);
      g.globalCompositeOperation = 'lighter';
      // spiral arms of light turning slowly inwards, into the depth
      const spin = 1 + 1.4 * env(t, T.enter - 0.25, 0.3, 0.1, 0.5);
      g.save();
      g.beginPath(); g.arc(Pp.x, Pp.y, r * 0.99, 0, Math.PI * 2); g.clip();
      for (let arm = 0; arm < 4; arm++) {
        const base = -t * 1.05 * spin + arm * (Math.PI / 2);
        g.strokeStyle = rgbaOf(arm % 2 ? C.accent : C.glow, 1);
        for (let pass = 0; pass < 2; pass++) {
          g.lineWidth = (pass ? 1.5 : 6) * U;
          g.globalAlpha = (pass ? 0.6 : 0.13) * open * breath;
          g.beginPath();
          for (let q = 0; q <= 24; q++) {
            const u = q / 24, th = base + u * 3.3, rr = r * 0.97 * Math.exp(-u * 2.4);
            const x = Pp.x + Math.cos(th) * rr, y = Pp.y + Math.sin(th) * rr;
            if (q) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.stroke();
        }
      }
      g.restore();
      // the rim: a soft glow under a fine bright line, and one slow ripple breathing out
      g.strokeStyle = rgbaOf(C.glow, 1); g.globalAlpha = 0.24 * open; g.lineWidth = 8 * U;
      g.beginPath(); g.arc(Pp.x, Pp.y, r, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,1)'; g.globalAlpha = 0.7 * open; g.lineWidth = 1.4 * U;
      g.beginPath(); g.arc(Pp.x, Pp.y, r, 0, Math.PI * 2); g.stroke();
      const rk = (t * 0.6) % 1;
      g.strokeStyle = rgbaOf(C.glow, 1); g.globalAlpha = (1 - rk) * 0.3 * open; g.lineWidth = 1.3 * U;
      g.beginPath(); g.arc(Pp.x, Pp.y, r * (1.04 + 0.5 * rk), 0, Math.PI * 2); g.stroke();
      g.lineCap = 'butt';
      // specks drawn into the depth
      for (let i = 0; i < 10; i++) {
        const k = ((t * 0.9 + i / 10) % 1), e = eIn(k), a = i * 2.39 + e * 2.4;
        const rr = r * (1.55 - 1.5 * e);
        sprite(i % 2 ? whiteS : glowS, Pp.x + Math.cos(a) * rr, Pp.y + Math.sin(a) * rr, (2.2 + 2 * (1 - e)) * U, Math.sin(Math.PI * k) * 0.7 * open);
      }
      // one soft bloom as the charm arrives (rise 0.3 s, never a flash)
      sprite(whiteS, Pp.x, Pp.y, r * 1.6, 0.42 * env(t, T.enter - 0.08, 0.3, 0.08, 0.6));
    }
    // 3. the charm: forms in the ripple, then travels into the portal
    const formK = k01(t, T.form, T.form + 0.62);
    if (formK > 0) {
      const travelK = k01(t, T.travel, T.enter);
      const e = eInOut(travelK);
      const c = ctrl();
      const p = travelK > 0 ? bez(e, c) : F;
      const sc = (travelK > 0 ? 1 - 0.68 * travelK ** 1.6 : eBack(formK)) * S;
      const al = Math.min(1, formK * 2.2) * (1 - k01(travelK, 0.82, 1));
      // trail
      if (travelK > 0 && travelK < 1) {
        // a comet's tail of light along the path it came
        g.lineCap = 'round';
        let q0 = p;
        for (let j = 1; j <= 14; j++) {
          const q = bez(Math.max(0, e - j * 0.024), c);
          const f = 1 - j / 15;
          g.strokeStyle = rgbaOf(j < 5 ? GOLD : C.glow, 1);
          g.globalAlpha = 0.5 * f * al; g.lineWidth = Math.max(1, sc * 0.2 * f);
          g.beginPath(); g.moveTo(q0.x, q0.y); g.lineTo(q.x, q.y); g.stroke();
          q0 = q;
        }
        g.lineCap = 'butt';
        for (let j = 1; j <= 6; j++) { const q = bez(Math.max(0, e - j * 0.05), c); sprite(glowS, q.x, q.y, sc * (0.34 - j * 0.035), (0.34 - j * 0.04) * al); }
      }
      sprite(goldS, p.x, p.y, sc * 1.1, 0.5 * env(t, T.form, 0.32, 0.12, 0.6) * al);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      const wob = travelK > 0 ? Math.sin(t * 9) * 0.06 * (1 - travelK) : Math.sin(t * 7) * 0.12 * (1 - formK);
      const glint = k01(t, T.form + 0.4, T.form + 1.1);
      drawCharm(g, { skillId, mallow: m.id, x: p.x, y: p.y, size: sc, t, alpha: al, rot: wob, glint: glint > 0 && glint < 1 ? glint : null, dpr, sparkle: travelK < 0.5 });
      g.globalCompositeOperation = 'lighter';
    }
    // 4. dust settling as the portal closes
    const dk = k01(t, T.close - 0.05, T.end);
    if (dk > 0 && dk < 1) {
      for (let i = 0; i < 12; i++) {
        const a = dust[i * 3], sp = dust[i * 3 + 1];
        const rr = Rp * (0.3 + 1.2 * eOut(dk) * sp);
        sprite(i % 3 ? glowS : goldS, Pp.x + Math.cos(a) * rr, Pp.y + Math.sin(a) * rr * 0.8 + dk * 18 * U, 2.6 * U, (1 - dk) * 0.7 * (0.5 + dust[i * 3 + 2] * 0.5));
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function frameReduced(t) {
    // no travel, no rings: the charm simply appears in a soft light, then the card takes it
    const a = k01(t, 0, 0.5) * (1 - k01(t, T.card + 0.1, T.end));
    g.globalCompositeOperation = 'lighter';
    sprite(glowS, F.x, F.y, S * 1.1, 0.4 * a);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    drawCharm(g, { skillId, mallow: m.id, x: F.x, y: F.y, size: S, t: 1.3, alpha: a, dpr, sparkle: true, breathe: false });
  }

  function render(t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (t >= T.end) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    (reduced ? frameReduced : frameFull)(t);
  }

  // ---- clock, phases, sound
  let t0 = performance.now(), raf = 0, manual = null, cardShown = false, finished = false, skipped = false, buzzed = false;
  const cues = reduced ? [] : [[0.02, 'shimmer'], [T.portalOpen + 0.05, 'portal'], [T.enter, 'chime']];
  let cue = 0;
  const audio = (name) => { try { app?.audio?.fx?.(name, { intensity: 0.45 }); } catch { /* decoration */ } };
  function showCard() {
    if (cardShown) return;
    cardShown = true;
    placeCard();
    card.classList.add('is-in');
    charm.draw(1.3);
    if (!reduced) setTimeout(() => { if (!finished) charmLive(); }, 50);
    if (reduced || skipped) audio('chime');
    // keyboard users land on the main choice; touch play is never interrupted
    if (keyboardUser && (!document.activeElement || document.activeElement === document.body)) visit.focus({ preventScroll: true });
  }
  let liveCharm = null;
  function charmLive() {
    // swap the still charm for a live one once the card is in
    liveCharm = charmCanvas({ skillId, mallow: m.id, box: card.classList.contains('is-compact') ? 88 : 120, reducedMotion: reduced });
    liveCharm.el.classList.add('hm-install-charm');
    charm.el.replaceWith(liveCharm.el);
  }
  function step(now) {
    raf = 0;
    if (finished) return;
    const t = manual ?? (now - t0) / 1000;
    while (manual == null && cue < cues.length && t >= cues[cue][0]) audio(cues[cue++][1]);
    if (t >= T.enter - 0.02 && !reduced && !buzzed && manual == null) { buzzed = true; try { app?.haptic?.('success'); } catch { /* optional */ } }
    render(t);
    if (t >= T.card) showCard();
    if (t >= T.end) { root.classList.remove('is-animating'); if (own) canvas.style.display = 'none'; return; }
    if (manual == null) raf = requestAnimationFrame(step);
  }
  measure();
  const onResize = () => { measure(); if (manual != null) render(manual); };
  addEventListener('resize', onResize);
  raf = requestAnimationFrame(step);

  // ---- endings
  let resolveP;
  const done = new Promise((r) => { resolveP = r; });
  const stopLeave = onSceneLeave(() => finish('cancelled'));
  function doSkip() {
    if (finished || !root.classList.contains('is-animating')) return;
    skipped = true;
    manual = null;
    t0 = performance.now() - T.end * 1000;   // the next frame is past the end: clear and show the card
    cancelAnimationFrame(raf); raf = requestAnimationFrame(step);
  }
  function finish(action) {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    stopLeave();
    card.classList.remove('is-in'); card.classList.add('is-out');
    root.classList.remove('is-animating');
    if (!own) { try { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); } catch { /* ignore */ } }
    const gone = () => { root.remove(); charm.destroy(); liveCharm?.destroy(); if (openCard === card) openCard = null; };
    if (action === 'garden' || action === 'cancelled' || action === 'replaced') gone(); else setTimeout(gone, 340);
    const result = { action, skillId };
    try { onDone?.(result); } catch (e) { console.warn('[garden-install]', e); }
    resolveP(result);
    if (action === 'garden' && app?.go) app.go('garden', { focus: skillId });
  }
  card.__finish = finish;
  const onKey = (e) => { if (e.key !== 'Escape') return; if (root.classList.contains('is-animating')) doSkip(); else if (cardShown) finish('play'); };
  document.addEventListener('keydown', onKey);
  skip.addEventListener('click', doSkip);
  visit.addEventListener('click', () => { try { app?.audio?.ui?.('open'); } catch { /* */ } finish('garden'); });
  keep.addEventListener('click', () => { try { app?.audio?.ui?.('close'); } catch { /* */ } finish('play'); });

  return Object.assign(done, {
    skip: doSkip,
    cancel: () => finish('cancelled'),
    /** QA: freeze the sequence at t seconds (the card appears from T.card). */
    seek(t) {
      if (finished) return;
      manual = Math.max(0, t);
      cancelAnimationFrame(raf); raf = 0;
      root.classList.toggle('is-animating', manual < T.end);
      if (own) canvas.style.display = '';
      render(manual);
      if (manual >= T.card) showCard(); else if (cardShown) { cardShown = false; card.classList.remove('is-in'); }
    },
    timing: T,
    get geometry() { return { from: { ...F }, portal: { ...Pp }, charm: S, portalRadius: Rp }; },
    el: root,
  });
}

// ------------------------------------------------- offer → save → install --
/**
 * The whole "keep this discovery" moment for the Hushfold / director:
 * nothing is saved unless the person taps "Keep this"; a tool that's already
 * in the garden isn't offered again (it counts as practised, with a quiet note).
 */
export async function keepDiscovery({ app = null, store = app?.store, skillId, worldId = null, mallow = null, origin = null, from = null, reducedMotion, signal } = {}) {
  if (!store || !getSkill(skillId)) return { kept: false, already: false, action: null };
  if (hasSkill(store, skillId)) {
    practised(store, skillId);
    note(`${getSkill(skillId).title} is already in your Memory Garden.`);
    return { kept: false, already: true, action: null };
  }
  const yes = await offerSave({ skillId, mallow, app, reducedMotion, signal });
  if (!yes || signal?.aborted) return { kept: false, already: false, action: null };
  const saved = saveSkill(store, { id: skillId, fromWorld: worldId, mallow: typeof mallow === 'string' ? mallow : mallow?.id || null });
  if (!saved) return { kept: false, already: false, action: null };
  const r = await playInstall({ app, skillId, mallow, origin, from, reducedMotion });
  return { kept: true, already: false, action: r.action };
}

// ------------------------------------------------------------ dev lab --
/**
 * Localhost only (main.js devLab): ?gardenlab=install&skill=slowing-down&mallow=glitzi
 *   &reduced=1 &t=1.2 (freeze at t) &show=1 (the Mallow and its realm behind it)
 *   ?gardenlab=offer&skill=…            the offer → save → install moment
 *   ?gardenlab=garden&n=6&focus=<id>    seed n kept tools and open the garden
 */
export async function gardenLab(app, qs) {
  const kind = qs.get('gardenlab');
  const skillId = qs.get('skill') || 'slowing-down';
  const skill = getSkill(skillId);
  const mallow = qs.get('mallow') || skill?.mallow || 'glitzi';
  const reducedMotion = qs.get('reduced') === '1' ? true : qs.get('reduced') === '0' ? false : undefined;
  history.replaceState({ i: 0 }, '', '#home');
  if (kind === 'garden') {
    if (!app.ent.has('paid')) await app.ent.purchase('paid');
    const { SKILL_IDS } = await import('./skills.js');
    const g = await import('../engine/garden.js');
    if (qs.has('n')) {
      g.clearGarden(app.store);
      const n = Math.max(0, Math.min(SKILL_IDS.length, Number(qs.get('n')) || 0));
      SKILL_IDS.slice(0, n).forEach((id, i) => g.saveSkill(app.store, { id, fromWorld: getSkill(id).world.id, mallow: getSkill(id).mallow }, Date.now() - (n - i) * 86400000));
    }
    await app.go('garden', qs.get('focus') ? { focus: qs.get('focus') } : {}, { replace: true });
    window.__gardenLabReady = true;
    return true;
  }
  if (qs.get('show') === '1') {
    await app.world.setMallow(mallow, { entrance: false, interactive: true });
    app.world.setRealm(MALLOWS[mallow]?.realm || 'moonmilk-cove');
  } else app.world.showMallow(false);
  const origin = qs.get('show') === '1' ? app.world.bodyRect() : null;
  const from = origin ? null : { x: innerWidth / 2, y: innerHeight * 0.56 };
  const lab = { handle: null, log: [] };
  window.__gardenLab = lab;
  lab.play = (o = {}) => { lab.handle = playInstall({ app, skillId, mallow, origin, from, reducedMotion, onDone: (r) => lab.log.push(r), ...o }); return lab.handle; };
  lab.offer = (o = {}) => keepDiscovery({ app, skillId, worldId: skill?.world.id, mallow, origin, from, reducedMotion, ...o }).then((r) => { lab.log.push(r); return r; });
  if (kind === 'offer') lab.offer();
  else { lab.play(); if (qs.has('t')) lab.handle.seek(Number(qs.get('t')) || 0); }
  window.__gardenLabReady = true;
  return true;
}
