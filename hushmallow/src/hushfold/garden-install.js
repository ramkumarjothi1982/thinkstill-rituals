// The Memory Garden installation: what happens after the person taps "Keep
// this" on a discovery.
//
//   onOffer(ctx) = keepDiscovery(ctx)  ← THE entry point for the Hushfold's
//       'offer' event. ctx: { app, store, skillId, worldId, mallow, origin,
//       face, subtitles, reducedMotion, lowStim, signal } (origin and face
//       may be rects or functions that return the current rect).
//       → Promise<{ kept, already, stored, action }>: offer → save (only on
//       the "Keep this" tap) → install. A tool that is already kept is not
//       offered again: it is marked as practised and a quiet note says so.
//   offerSave({ skillId, mallow, app, origin, face, reducedMotion, signal }) → Promise<boolean>
//       Only the choice: a small non-modal card ("Keep this in your Memory
//       Garden?" + the title, Not now / Keep this). Resolves true only on the
//       explicit tap; it saves nothing itself. It never covers the Mallow's
//       face: it sits below the body or above the head when there is room,
//       else a compact card or a one-row bar below the face. Left alone for a
//       while it folds into a small chip in a corner (tap → the offer again).
//   playInstall({ canvas | ctx, from:{x,y} | origin, face, skillId, mallow, app,
//                 subtitles, reducedMotion, lowStim, bright, onDone })
//       → Promise<{action}> & { skip(), cancel(), seek(t) }
//       The sequence (≈3.4 s, the card at 2.6 s; reduced motion ≈1.5 s): a
//       luminous ripple gathers above the Mallow → the charm forms in it →
//       it travels into a brief portal (layered rings drifting into a
//       nebula tinted by the charm, soft petals of light, one calm breath a
//       second, a single soft bloom with a ≥0.3 s rise, no flashes) → an
//       elegant card: "NEW TOOL SAVED", the title (Fraunces, --type-reward),
//       one line, "Visit the garden" / "Keep playing". The tool is already
//       saved before this starts, so skipping, leaving or never tapping the
//       card loses nothing; left alone, the card folds into a small "In your
//       garden" chip. Skippable (Skip pill, Escape). While it plays, the
//       subtitles passed in are paused (passing lines dropped, a held line
//       stays), and nothing is drawn over the subtitle band, the top bar or
//       the card.
//   installAvoidRects() → the offer / card / chip rects, for subtitle placement.
//   While it plays, <body> has the class 'hm-installing' and window receives
//   'hm:install' events ({ phase: 'start' | 'card' | 'end', skillId }).
//   Screen readers: one persistent polite live region (made at load) says
//   "Keep this in your Memory Garden? <title>" and "New tool saved: <title>.
//   <essence>".
//
// Draws on its own full-screen canvas above the stage (pointer-events:none,
// so the Mallow stays squeezable), or on a canvas/ctx you pass in. It runs in
// the shared Mallow loop (rig.js addTicker). Glow, ring, petal and nebula
// sprites are made once per colour; the charm is rasterised once at its
// largest size; nothing big is allocated per frame.

import { drawCharm, charmCanvas, charmPalette } from './charm.js';
import { getSkill } from './skills.js';
import { MALLOWS } from '../mallows/registry.js';
import { facePartsSrc, addTicker, removeTicker } from '../mallows/rig.js';
import { saveSkill, hasSkill, practised } from '../engine/garden.js';

export const INSTALL_TIMING = Object.freeze({ gather: 0, form: 0.5, portalOpen: 0.95, travel: 1.32, enter: 2.3, close: 2.5, card: 2.6, end: 3.4 });
export const INSTALL_TIMING_REDUCED = Object.freeze({ form: 0, card: 0.75, end: 1.5 });
/** How long the offer and the card wait, untouched, before folding into a small chip (ms). */
export const FOLD_AFTER = Object.freeze({ offer: 16000, card: 10000, savedChip: 30000 });

// ------------------------------------------------------------------ CSS --
const CSS = `
.hm-install, .hm-offer, .hm-note, .hm-chip { --hm-ff-ui: var(--ff-ui, "HM Manrope", system-ui, -apple-system, "Segoe UI", sans-serif); --hm-ff-voice: var(--ff-voice, "HM Nunito Sans", ui-rounded, system-ui, sans-serif); --hm-ff-story: var(--ff-story, "HM Fraunces", Georgia, "Times New Roman", serif); --hm-k: var(--type-scale, 1); }
.hm-install { position: fixed; inset: 0; z-index: 6; pointer-events: none; color: var(--text-1, #f7f3ff); }
.hm-install-fx { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.hm-install-skip { position: absolute; pointer-events: auto; min-height: 44px; min-width: 64px; padding: 0 18px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.22); background: rgba(16,12,40,.55); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); color: #f7f3ff; cursor: pointer;
  font: var(--type-control, 650 calc(15px * var(--hm-k))/1.2 var(--hm-ff-ui)); letter-spacing: var(--type-control-ls, 0); opacity: 0; transition: opacity .4s ease; }
.hm-install.is-animating .hm-install-skip { opacity: .94; }
.hm-install:not(.is-animating) .hm-install-skip, .hm-install.has-card .hm-install-skip, .hm-install.is-reduced .hm-install-skip { opacity: 0; pointer-events: none; visibility: hidden; }
.hm-install-skip:focus-visible { outline: 2.5px solid #ffd98a; outline-offset: 3px; }

.hm-install-card { --glow: 255,217,138; position: absolute; left: 0; top: 0; box-sizing: border-box; width: min(calc(100vw - 40px), 360px); padding: 0 20px 18px; border-radius: 28px; text-align: center;
  background: radial-gradient(130% 80% at 50% 0%, rgba(var(--glow), .2), rgba(var(--glow), 0) 62%), rgba(13, 9, 34, .88);
  border: 1px solid rgba(255,255,255,.14); box-shadow: 0 24px 60px rgba(4,2,16,.55), inset 0 1px 0 rgba(255,255,255,.08), 0 0 70px rgba(var(--glow), .16);
  -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
  opacity: 0; transform: translateY(16px) scale(.97); pointer-events: none; visibility: hidden;
  transition: opacity .6s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.2,.9,.25,1), visibility 0s linear .6s; }
.hm-install-card.is-in { opacity: 1; transform: none; pointer-events: auto; visibility: visible; transition-delay: 0s; }
.hm-install-card.is-out { opacity: 0; transform: translateY(8px) scale(.985); pointer-events: none; transition-duration: .32s; }
.hm-install.is-reduced .hm-install-card { transform: none; transition: opacity .45s ease, visibility 0s linear .45s; }
.hm-install.is-reduced .hm-install-card.is-in { transition-delay: 0s; }
.hm-install-slot { display: block; margin: -60px auto -4px; width: 120px; height: 120px; }
.hm-install-slot canvas { display: block; }
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
/* compact: the charm on the left, the words beside it, the two choices side by side (short screens) */
.hm-install-card.is-compact, .hm-install-card.is-tight { width: min(calc(100vw - 32px), 420px); padding: 14px 14px 14px 10px; border-radius: 24px; text-align: left;
  display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; align-items: center;
  background: radial-gradient(90% 120% at 0% 50%, rgba(var(--glow), .2), rgba(var(--glow), 0) 60%), rgba(13, 9, 34, .9); }
.hm-install-card.is-compact .hm-install-slot, .hm-install-card.is-tight .hm-install-slot { grid-row: 1 / span 3; margin: -8px -4px -8px -2px; width: 80px; height: 80px; }
.hm-install-card.is-tight .hm-install-slot { width: 64px; height: 64px; }
.hm-install-card.is-compact .hm-install-over, .hm-install-card.is-tight .hm-install-over { grid-column: 2; margin: 0; }
.hm-install-card.is-compact .hm-install-title, .hm-install-card.is-tight .hm-install-title { grid-column: 2; margin: 3px 0 0; font-size: calc(21px * var(--hm-k)); line-height: 1.14; text-wrap: balance; }
.hm-install-card.is-compact .hm-install-line { grid-column: 2; margin: 4px 0 0; max-width: none; font-size: calc(15px * var(--hm-k)); line-height: 1.4; }
.hm-install-card.is-tight .hm-install-line { display: none; }
.hm-install-card.is-compact .hm-actions, .hm-install-card.is-tight .hm-actions { grid-column: 1 / -1; margin-top: 12px; flex-wrap: nowrap; gap: 8px; }
.hm-install-card.is-compact .hm-actions button, .hm-install-card.is-tight .hm-actions button { min-height: 44px; padding: 0 10px; font-size: calc(15px * var(--hm-k)); }

.hm-actions { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-top: 16px; }
.hm-actions button { flex: 1 1 auto; white-space: nowrap; min-height: 48px; padding: 0 12px; border-radius: 999px; cursor: pointer; font: var(--type-button, 700 calc(16px * var(--hm-k))/1.15 var(--hm-ff-ui)); letter-spacing: var(--type-button-ls, .005em);
  transition: transform .14s cubic-bezier(.22,1,.36,1), background .14s; }
.hm-actions button:active { transform: scale(.97); }
.hm-actions .hm-primary { border: 0; color: #23140a; background: linear-gradient(180deg, #ffe2a3, #ffd98a 55%, #ffb86b); box-shadow: 0 10px 28px rgba(255,190,90,.28), inset 0 1px 0 rgba(255,255,255,.6); }
.hm-actions .hm-quiet { border: 1px solid rgba(255,255,255,.2); color: #f7f3ff; background: rgba(255,255,255,.07); }
.hm-actions button:focus-visible, .hm-chip:focus-visible { outline: 2.5px solid #ffd98a; outline-offset: 3px; }

/* the offer: a small glass card that never covers the Mallow's face; play carries on around it */
.hm-offer { --glow: 255,217,138; position: fixed; z-index: 6; left: 0; top: 0; box-sizing: border-box; width: min(calc(100vw - 40px), 380px); padding: 14px 16px 14px; border-radius: 24px;
  background: radial-gradient(120% 120% at 0% 0%, rgba(var(--glow), .16), rgba(var(--glow), 0) 55%), rgba(13, 9, 34, .9); border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 18px 50px rgba(4,2,16,.5), 0 0 50px rgba(var(--glow), .12); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); color: #f7f3ff;
  opacity: 0; transform: translateY(14px); transition: opacity .45s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.2,.9,.25,1), top .5s cubic-bezier(.22,1,.36,1), left .5s cubic-bezier(.22,1,.36,1); }
.hm-offer.is-in { opacity: 1; transform: none; }
.hm-offer.is-out, .hm-offer.is-folded { opacity: 0; transform: translateY(8px) scale(.97); transition-duration: .32s; pointer-events: none; }
.hm-offer.is-folded { visibility: hidden; transition: opacity .32s ease, transform .32s ease, visibility 0s linear .32s; }
.hm-offer.is-reduced, .hm-offer.is-reduced.is-out, .hm-offer.is-reduced.is-folded { transform: none; transition: opacity .35s ease, visibility 0s linear .35s; }
.hm-offer-head { display: flex; align-items: center; gap: 12px; text-align: left; }
.hm-offer-slot { flex: 0 0 auto; display: block; width: 72px; height: 72px; margin: -10px -6px -10px -8px; }
.hm-offer-slot canvas { display: block; }
.hm-offer-txt { min-width: 0; }
.hm-offer-ask { margin: 0; font: var(--type-label, 600 calc(14px * var(--hm-k))/1.35 var(--hm-ff-ui)); color: #d9d2f2; }
.hm-offer-title { margin: 3px 0 0; font: 750 calc(18px * var(--hm-k))/1.25 var(--hm-ff-voice); color: #fff6e6; text-wrap: balance; }
.hm-offer .hm-actions { margin-top: 12px; }
.hm-offer .hm-x { display: none; }
.hm-offer.is-compact { padding: 10px 12px 10px; border-radius: 22px; }
.hm-offer.is-compact .hm-offer-head { gap: 10px; }
.hm-offer.is-compact .hm-offer-slot { width: 52px; height: 52px; margin: -6px -4px -6px -6px; }
.hm-offer.is-compact .hm-offer-ask { font-size: calc(13px * var(--hm-k)); }
.hm-offer.is-compact .hm-offer-title { margin-top: 1px; font-size: calc(16px * var(--hm-k)); }
.hm-offer.is-compact .hm-actions { margin-top: 8px; flex-wrap: nowrap; }
.hm-offer.is-compact .hm-actions button { min-height: 44px; font-size: calc(15px * var(--hm-k)); }
/* the slim bar: charm, the tool's short name, Keep this, and a quiet ✕ for Not now */
.hm-offer.is-bar { display: flex; align-items: center; gap: 8px; width: min(calc(100vw - 32px), 420px); padding: 6px 6px 6px 4px; border-radius: 26px; }
.hm-offer.is-bar .hm-offer-head { flex: 1 1 auto; min-width: 0; gap: 6px; }
.hm-offer.is-bar .hm-offer-slot { width: 46px; height: 46px; margin: -4px -2px; }
.hm-offer.is-bar .hm-offer-ask { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.hm-offer.is-bar .hm-offer-title { margin: 0; font: 750 calc(15px * var(--hm-k))/1.25 var(--hm-ff-voice); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.hm-offer.is-bar .hm-actions { flex: 0 0 auto; margin: 0; flex-wrap: nowrap; gap: 6px; flex-direction: row-reverse; }
.hm-offer.is-bar .hm-actions button { flex: 0 0 auto; min-height: 44px; padding: 0 14px; font-size: calc(15px * var(--hm-k)); }
.hm-offer.is-bar .hm-actions .hm-quiet { width: 44px; padding: 0; display: grid; place-items: center; }
.hm-offer.is-bar .hm-lbl { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.hm-offer.is-bar .hm-x { display: block; font: 600 20px/1 var(--hm-ff-ui); margin-top: -2px; }

.hm-note { position: fixed; z-index: 6; left: 0; top: 0; width: max-content; max-width: min(calc(100vw - 40px), 360px); box-sizing: border-box; padding: 11px 18px; border-radius: 18px; pointer-events: none; text-wrap: balance;
  background: rgba(13, 9, 34, .86); border: 1px solid rgba(255,255,255,.14); color: #f1ecff; font: var(--type-label, 600 calc(14px * var(--hm-k))/1.35 var(--hm-ff-ui)); text-align: center;
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); opacity: 0; transition: opacity .4s ease; }
.hm-note.is-in { opacity: 1; }
/* a folded offer or card: a small chip in a corner, out of the way */
.hm-chip { position: fixed; z-index: 6; left: 0; top: 0; display: inline-flex; align-items: center; gap: 4px; box-sizing: border-box; min-height: 44px; max-width: min(calc(100vw - 40px), 260px); padding: 0 16px 0 2px; border-radius: 999px;
  border: 1px solid rgba(255,217,138,.34); background: rgba(13,9,34,.86); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); color: #fff4df; cursor: pointer; text-align: left;
  box-shadow: 0 10px 30px rgba(4,2,16,.45), 0 0 26px rgba(var(--glow, 255,217,138), .14); font: var(--type-control, 650 calc(15px * var(--hm-k))/1.2 var(--hm-ff-ui));
  opacity: 0; transform: translateY(6px) scale(.96); transition: opacity .5s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.2,.9,.25,1); }
.hm-chip.is-in { opacity: 1; transform: none; }
.hm-chip.is-out { opacity: 0; transform: scale(.96); pointer-events: none; transition-duration: .3s; }
.hm-chip.is-reduced { transform: none; transition: opacity .35s ease; }
.hm-chip canvas { flex: 0 0 auto; display: block; margin: -4px -2px; }
.hm-chip span { overflow-wrap: anywhere; }
`;
function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('hm-install-css')) return;
  const s = document.createElement('style');
  s.id = 'hm-install-css';
  s.textContent = CSS;
  document.head.append(s);
}

// ------------------------------------------------- the live region --
// One persistent polite live region, there before anything is said (a live
// region inserted with its text already in it is often not announced).
let srLive = null, srT = 0;
function ensureLive() {
  if (typeof document === 'undefined' || !document.body) return null;
  if (srLive?.isConnected) return srLive;
  srLive = document.createElement('div');
  srLive.className = 'hm-sr-live';
  srLive.setAttribute('role', 'status');
  srLive.setAttribute('aria-live', 'polite');
  srLive.setAttribute('aria-atomic', 'true');
  srLive.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;pointer-events:none';
  document.body.append(srLive);
  return srLive;
}
/** Say it once to screen readers (cleared first, so the same words can be said again). */
function announce(text) {
  const el = ensureLive();
  if (!el) return;
  clearTimeout(srT);
  el.textContent = '';
  srT = setTimeout(() => { el.textContent = text; }, 140);
}
if (typeof document !== 'undefined') {
  if (document.body) ensureLive(); else document.addEventListener?.('DOMContentLoaded', ensureLive, { once: true });
}

// ------------------------------------------------------------- helpers --
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const k01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eOut = (k) => 1 - (1 - k) ** 3;
const eIn = (k) => k * k * k;
const eInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const eBack = (k) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2; };
const TAU = Math.PI * 2;
/** Photosafe envelope: rises over `rise` s (≥0.28), holds, decays. */
const env = (t, start, rise, hold, decay) => {
  if (t < start) return 0;
  if (t < start + rise) { const k = (t - start) / rise; return k * k * (3 - 2 * k); }
  if (t < start + rise + hold) return 1;
  const k = (t - start - rise - hold) / decay;
  return k >= 1 ? 0 : 1 - k * k * (3 - 2 * k);
};
const hex = (h) => { const v = String(h || '#ffffff').replace('#', ''); return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0); };
const mixC = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
const rgbaOf = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1).toFixed(3)})`;
const reducedPref = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const mallowOf = (m) => (m && typeof m === 'object' && m.colours ? m : MALLOWS[m] || null);
const call = (v) => { if (typeof v !== 'function') return v; try { return v(); } catch { return null; } };
const mkCanvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
/** The person's own settings first (app.prefs), then the system's. */
function motionPrefs(app, opts) {
  const reduced = opts.reducedMotion ?? (typeof app?.prefs?.reducedMotion === 'function' ? !!app.prefs.reducedMotion() : reducedPref());
  const lowStim = opts.lowStim ?? !!app?.prefs?.get?.('lowStim');
  return { reduced, lowStim };
}

// ---------------------------------------------------------------- sprites --
const SPRITES = new Map();
function cached(key, make) {
  let s = SPRITES.get(key);
  if (!s) { s = make(); if (SPRITES.size > 64) SPRITES.clear(); SPRITES.set(key, s); }
  return s;
}
function glowSprite(c) {
  return cached(`g${c}`, () => {
    const s = mkCanvas(128), g = s.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgbaOf(c, 1)); gr.addColorStop(0.22, rgbaOf(c, 0.55)); gr.addColorStop(0.55, rgbaOf(c, 0.16)); gr.addColorStop(1, rgbaOf(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return s;
  });
}
/** A soft ring (radius 0.86 of the sprite), for the portal's rim and its tunnel. */
function ringSprite(c, soft = 1) {
  return cached(`r${c}|${soft}`, () => {
    const s = mkCanvas(256), g = s.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    const w = 0.035 * soft;
    gr.addColorStop(0, rgbaOf(c, 0)); gr.addColorStop(Math.max(0, 0.86 - w * 3), rgbaOf(c, 0));
    gr.addColorStop(0.86 - w, rgbaOf(c, 0.55)); gr.addColorStop(0.86, rgbaOf(c, 1)); gr.addColorStop(0.86 + w, rgbaOf(c, 0.5));
    gr.addColorStop(Math.min(1, 0.86 + w * 3.2), rgbaOf(c, 0)); gr.addColorStop(1, rgbaOf(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return s;
  });
}
/** One soft petal of light (a long feathered teardrop), pointing up. */
function petalSprite(c) {
  return cached(`p${c}`, () => {
    const s = mkCanvas(64, 128), g = s.getContext('2d');
    g.translate(32, 74); g.scale(1, 2.1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30);
    gr.addColorStop(0, rgbaOf(mixC(c, [255, 255, 255], 0.5), 0.95)); gr.addColorStop(0.35, rgbaOf(c, 0.6)); gr.addColorStop(1, rgbaOf(c, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
    return s;
  });
}
/** The portal's depth: a well (deep violet, or pale light over a bright realm) with a far, small light. */
function wellSprite(P, bright) {
  return cached(`w${P.deep}|${P.glow}|${P.light}|${bright ? 1 : 0}`, () => {
    const s = mkCanvas(256), g = s.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    if (bright) {
      gr.addColorStop(0, 'rgba(255,252,244,1)');
      gr.addColorStop(0.16, rgbaOf(mixC(P.light, [255, 255, 255], 0.6), 0.97));
      gr.addColorStop(0.55, rgbaOf(mixC(P.body, P.light, 0.55), 0.94));
      gr.addColorStop(0.82, rgbaOf(mixC(P.body, P.deep, 0.15), 0.9));
      gr.addColorStop(0.93, rgbaOf(P.glow, 0.6));
    } else {
      gr.addColorStop(0, 'rgba(255,248,230,0.95)');
      gr.addColorStop(0.07, rgbaOf(mixC(P.core, P.light, 0.4), 0.85));
      gr.addColorStop(0.3, rgbaOf(P.deep.map((v, i) => Math.round(v * 0.62 + P.light[i] * 0.16)), 0.96));
      gr.addColorStop(0.78, rgbaOf(P.deep.map((v) => Math.round(v * 0.5)), 0.97));
      gr.addColorStop(0.9, rgbaOf(P.deep.map((v, i) => Math.round(v * 0.6 + P.light[i] * 0.12)), 0.72));
    }
    gr.addColorStop(1, rgbaOf(bright ? P.light : P.deep, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return s;
  });
}
/** A soft nebula in the charm's own colours, and a layer of far specks (they turn at different speeds). */
function nebulaSprite(P, bright) {
  return cached(`n${P.body}|${P.light}|${P.accent}|${P.core}|${bright ? 1 : 0}`, () => {
    const s = mkCanvas(256), g = s.getContext('2d');
    g.translate(128, 128);
    g.beginPath(); g.arc(0, 0, 124, 0, TAU); g.clip();
    g.globalCompositeOperation = bright ? 'source-over' : 'lighter';
    const cols = [P.body, P.light, P.accent, P.glow, P.core, P.light, P.accent];
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + rnd() * 0.6, d = 26 + rnd() * 70, r = 34 + rnd() * 46;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c = cols[i % cols.length];
      gr.addColorStop(0, rgbaOf(c, 0.3)); gr.addColorStop(1, rgbaOf(c, 0));
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // two faint arms of a spiral, drawn as soft dust
    for (let arm = 0; arm < 2; arm++) {
      for (let q = 0; q < 40; q++) {
        const u = q / 40, th = arm * Math.PI + u * 4.2, rr = 118 * Math.exp(-u * 2.1);
        const x = Math.cos(th) * rr, y = Math.sin(th) * rr, r = 10 + 14 * (1 - u);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, rgbaOf(arm ? P.accent : P.light, (bright ? 0.15 : 0.16) * (1 - u * 0.5))); gr.addColorStop(1, rgbaOf(P.light, 0));
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    return s;
  });
}
function specksSprite(P, bright) {
  return cached(`s${P.core}|${bright ? 1 : 0}`, () => {
    const s = mkCanvas(256), g = s.getContext('2d');
    let seed = 29;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const dot = bright ? P.deep : [255, 255, 255];
    for (let i = 0; i < 46; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 118, r = 0.6 + rnd() * 1.6;
      g.fillStyle = rgbaOf(i % 4 ? dot : P.core, (bright ? 0.25 : 0.4) + rnd() * 0.45);
      g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r, 0, TAU); g.fill();
    }
    return s;
  });
}
const GOLD = [255, 217, 138], WHITE = [255, 255, 255];

/** Is the backdrop behind (x, y) bright? (sampled once from the world's canvases) */
let probeC = null;
function brightAt(x, y) {
  try {
    const layers = [...document.querySelectorAll('#world canvas, #fx-layer canvas')].filter((c) => c.width && c.height && c.getClientRects().length);
    if (!layers.length) return false;
    probeC ||= mkCanvas(4);
    const g = probeC.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, 4, 4);
    for (const c of layers) {
      const r = c.getBoundingClientRect();
      const kx = c.width / r.width, ky = c.height / r.height;
      g.drawImage(c, (x - 60 - r.left) * kx, (y - 60 - r.top) * ky, 120 * kx, 120 * ky, 0, 0, 4, 4);
    }
    const d = g.getImageData(0, 0, 4, 4).data;
    let L = 0, A = 0;
    for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; L += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * a; A += a; }
    return A > 4 && L / A > 150;
  } catch { return false; }
}

// ---------------------------------------------------------- geometry --
let insetProbe = null;
function insets() {
  if (typeof document === 'undefined' || !document.body) return { top: 0, bottom: 0 };
  if (!insetProbe?.isConnected) {
    insetProbe = document.createElement('div');
    insetProbe.setAttribute('aria-hidden', 'true');
    insetProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.append(insetProbe);
  }
  const cs = getComputedStyle(insetProbe);
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
}
function visibleRect(el) {
  if (!el?.isConnected || el.hidden) return null;
  const r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return null;
  return r;
}
/** What the moment must never cover: the subtitle lines and their controls, choices, the reader. */
const OBSTACLES = '.hf-sub, .hf-chips:not([hidden]), .hf-subctl:not(.is-hidden), .hf-read';
function obstacleRects() {
  if (typeof document === 'undefined') return [];
  return [...document.querySelectorAll(OBSTACLES)].map(visibleRect).filter(Boolean);
}
/** The free band of the screen: under the top bar, above the dock and the home indicator. */
function screenFrame() {
  const W = innerWidth, H = innerHeight, ins = insets();
  const tr = visibleRect(document.querySelector('.hf-top'));
  const topLimit = Math.max(ins.top + 14, (tr ? tr.bottom : ins.top + 60) + 10);
  let bottomLimit = H - ins.bottom - 18;
  for (const d of document.querySelectorAll('.hf-dock > *')) { const r = visibleRect(d); if (r) bottomLimit = Math.min(bottomLimit, r.top - 10); }
  return { W, H, ins, topLimit, bottomLimit: Math.max(topLimit + 60, bottomLimit) };
}

// the face (eyes to just under the mouth) as fractions of each Mallow's body box, from the rig's own face geometry
const FACE = new Map();
const FACE_DEFAULT = Object.freeze([0.1, 0.22, 0.9, 0.86]);
function faceFrac(m) {
  if (!m?.face || !m.bodyBox) return FACE_DEFAULT;
  if (FACE.has(m.id)) return FACE.get(m.id);
  let fr = FACE_DEFAULT;
  try {
    const p = facePartsSrc(m), [bx0, by0, bx1, by1] = m.bodyBox, bw = bx1 - bx0, bh = by1 - by0, M = m.face.mouth;
    const x0 = Math.min(p.eyes[0], p.mouth?.[0] ?? p.eyes[0]), x1 = Math.max(p.eyes[2], p.mouth?.[2] ?? p.eyes[2]);
    fr = [clamp((x0 - bx0) / bw, 0, 1), clamp((p.eyes[1] - by0) / bh - 0.03, 0, 1), clamp((x1 - bx0) / bw, 0, 1), clamp((M.y + M.w * 0.32 - by0) / bh, 0.4, 1)];
  } catch { /* the default face box */ }
  FACE.set(m.id, fr);
  return fr;
}
const asRect = (r) => (r && Number.isFinite(r.top) && Number.isFinite(r.left) && (r.height > 0 || r.bottom > r.top)
  ? (() => { const width = r.width ?? r.right - r.left, height = r.height ?? r.bottom - r.top; return { left: r.left, top: r.top, width, height, right: r.left + width, bottom: r.top + height, cx: r.cx ?? r.left + width / 2 }; })()
  : null);
/** The Mallow's body and face in client px (face from the caller, else from the art's face geometry). */
function mallowGeom(origin, mallow, face) {
  const body = asRect(call(origin));
  if (!body) return null;
  let f = asRect(call(face));
  if (!f) {
    const [x0, y0, x1, y1] = faceFrac(mallowOf(mallow));
    f = asRect({ left: body.left + x0 * body.width, top: body.top + y0 * body.height, width: (x1 - x0) * body.width, height: (y1 - y0) * body.height });
  }
  return { body, face: f, hop: Math.max(14, body.height * 0.1) };
}
/** The Mallow's face (eyes to just under the mouth) in client px, from its body rect: what nothing here may cover. */
export function mallowFaceRect(bodyRect, mallow) { return mallowGeom(bodyRect, mallow, null)?.face || null; }
const hits = (a, b, pad = 0) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
/** Vertical free spans of [y0, y1] in the column [xL, xR], with the obstacles cut out (in order, top to bottom). */
function freeSpans(y0, y1, xL, xR, obstacles) {
  let spans = [[y0, y1]];
  for (const r of obstacles) {
    if (r.right <= xL || r.left >= xR) continue;
    const a = r.top - 8, b = r.bottom + 8;
    spans = spans.flatMap(([s, e]) => (b <= s || a >= e ? [[s, e]] : [[s, Math.min(e, a)], [Math.max(s, b), e]].filter(([p, q]) => q - p > 1)));
  }
  return spans;
}
/**
 * Place a box (offer, card, note) where it covers neither the face nor the
 * subtitles: first in the clear (below the body / above the head), trying
 * each form from the roomiest; then over the body but off the face; else the
 * smallest form against the face's edge with the most room.
 * apply(form) sets the form; lift(form) is how far a part (the card's charm)
 * rises above the box. Returns { form, left, top, w, h } (top of the box).
 */
function placeBox(el, { forms, apply = () => {}, kind = 'offer', geom = null, lift = () => 0, extra = [] }) {
  const fr = screenFrame();
  const obstacles = obstacleRects().concat(extra);
  const regions = (() => {
    if (!geom) return { clear: [[fr.topLimit, fr.bottomLimit, 'bottom']], face: [] };
    const below = [geom.body.bottom + 10, fr.bottomLimit, 'top'], above = [fr.topLimit, geom.body.top - geom.hop, 'bottom'];
    const belowFace = [geom.face.bottom + 8, fr.bottomLimit, 'top'], aboveFace = [fr.topLimit, geom.face.top - 8, 'bottom'];
    return kind === 'card' ? { clear: [above, below], face: [aboveFace, belowFace] } : { clear: [below, above], face: [belowFace, aboveFace] };
  })();
  const cx = geom ? geom.body.cx : fr.W / 2;
  const size = (form) => { apply(form); return { w: el.offsetWidth || 300, h: (el.offsetHeight || 120) + lift(form), lift: lift(form) }; };
  const leftFor = (w) => clamp(cx - w / 2, 16, Math.max(16, fr.W - 16 - w));
  const tryIn = (list) => {
    for (const form of forms) {
      const { w, h, lift: l } = size(form);
      const left = leftFor(w);
      for (const [y0, y1, anchor] of list) {
        if (y1 - y0 < h) continue;
        const spans = freeSpans(y0, y1, left, left + w, obstacles).filter(([s, e]) => e - s >= h);
        if (!spans.length) continue;
        const span = anchor === 'top' ? spans[0] : spans[spans.length - 1];
        const top = (anchor === 'top' ? span[0] : span[1] - h) + l;
        return { form, left, top, w, h: h - l, region: anchor === 'top' ? 'below' : 'above' };
      }
    }
    return null;
  };
  let p = tryIn(regions.clear) || tryIn(regions.face);
  if (!p) {
    const form = forms[forms.length - 1];
    const { w, h, lift: l } = size(form);
    let top;
    if (geom) {
      const roomBelow = fr.bottomLimit - (geom.face.bottom + 8), roomAbove = geom.face.top - 8 - fr.topLimit;
      top = roomBelow >= roomAbove ? geom.face.bottom + 8 : geom.face.top - 8 - h;
    } else top = fr.bottomLimit - h;
    top = clamp(top, fr.ins.top + 8, Math.max(fr.ins.top + 8, fr.H - fr.ins.bottom - 8 - h)) + l;
    p = { form, left: leftFor(w), top, w, h: h - l, region: 'squeezed' };
  }
  apply(p.form);
  return p;
}

let openCard = null, openOffer = null, openChip = null;
// move focus to the card only for people using a keyboard (touch play is never interrupted)
let keyboardUser = false;
if (typeof addEventListener === 'function') {
  addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') keyboardUser = true; }, true);
  addEventListener('pointerdown', () => { keyboardUser = false; }, true);
}
/** Rects of the offer / card / chip on screen now (for subtitle avoidance). */
export function installAvoidRects() {
  return [openOffer, openCard, openChip].map(visibleRect).filter(Boolean);
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
/** Calls fn (debounced) when the subtitle band changes, so a box can step out of its way. */
function onBandChange(fn) {
  const band = document.querySelector('.hf-subs');
  if (!band || typeof MutationObserver === 'undefined') return () => {};
  let raf = 0;
  const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fn(); }); });
  mo.observe(band, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  return () => { mo.disconnect(); cancelAnimationFrame(raf); };
}

// --------------------------------------------------------------- chip --
/** A folded offer or card: a small chip in a corner that covers no face, no subtitle and no control. */
function showChip({ text, label, skillId, mallow, reduced, glow, geom = null, onTap, ttl = 0 }) {
  hideChip(true);
  ensureCss();
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `hm-chip${reduced ? ' is-reduced' : ''}`;
  b.setAttribute('aria-label', label);
  if (glow) b.style.setProperty('--glow', glow.join(','));
  const c = charmCanvas({ skillId, mallow, box: 44, reducedMotion: reduced, bob: false });
  const s = document.createElement('span'); s.textContent = text;
  b.append(c.el, s);
  document.body.append(b);
  const fr = screenFrame(), obstacles = obstacleRects();
  const w = b.offsetWidth, h = b.offsetHeight;
  const face = geom?.face || null;
  const spots = [[20, fr.bottomLimit - h], [fr.W - 20 - w, fr.bottomLimit - h], [20, fr.topLimit], [fr.W - 20 - w, fr.topLimit]];
  const free = spots.find(([x, y]) => { const r = { left: x, top: y, right: x + w, bottom: y + h }; return !(face && hits(r, face, 6)) && !obstacles.some((o) => hits(r, o, 6)); }) || spots[0];
  b.style.left = `${Math.round(free[0])}px`; b.style.top = `${Math.round(free[1])}px`;
  requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('is-in')));
  let ttlT = 0;
  const chip = { el: b, gone: false, close(instant = false) {
    if (chip.gone) return;
    chip.gone = true; clearTimeout(ttlT); stopLeave();
    if (openChip === chip) openChip = null;
    b.classList.remove('is-in'); b.classList.add('is-out');
    const rm = () => { b.remove(); c.destroy(); };
    if (instant) rm(); else setTimeout(rm, 320);
  } };
  const stopLeave = onSceneLeave(() => chip.close(true));
  b.addEventListener('click', () => { chip.close(); onTap?.(); });
  if (ttl) ttlT = setTimeout(() => chip.close(), ttl);
  openChip = chip;
  return chip;
}
function hideChip(instant) { openChip?.close(instant); openChip = null; }

// --------------------------------------------------------------- offer --
/** The explicit choice. Resolves true only on "Keep this"; saves nothing itself. */
export function offerSave({ skillId, mallow, app = null, reducedMotion, signal, title, origin = null, face = null, foldAfterMs = FOLD_AFTER.offer } = {}) {
  ensureCss(); ensureLive();
  const skill = getSkill(skillId);
  const { reduced } = motionPrefs(app, { reducedMotion });
  const name = title || skill?.title || 'This discovery';
  const shortName = (!title && skill?.short) || name;
  openOffer?.__close?.(false);
  hideChip(true);
  return new Promise((resolve) => {
    const m = mallowOf(mallow) || MALLOWS[skill?.mallow] || MALLOWS.noomi;
    const glow = hex(m.colours.glow);
    const uid = Math.random().toString(36).slice(2, 8);
    const el = document.createElement('section');
    el.className = `hm-offer${reduced ? ' is-reduced' : ''}`;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-labelledby', `hm-oa-${uid}`);
    el.setAttribute('aria-describedby', `hm-ot-${uid}`);
    el.style.setProperty('--glow', glow.join(','));
    const slot = document.createElement('span'); slot.className = 'hm-offer-slot'; slot.setAttribute('aria-hidden', 'true');
    const head = document.createElement('div'); head.className = 'hm-offer-head';
    const txt = document.createElement('div'); txt.className = 'hm-offer-txt';
    const ask = document.createElement('p'); ask.className = 'hm-offer-ask'; ask.id = `hm-oa-${uid}`; ask.textContent = 'Keep this in your Memory Garden?';
    const t = document.createElement('p'); t.className = 'hm-offer-title'; t.id = `hm-ot-${uid}`; t.textContent = name;
    txt.append(ask, t); head.append(slot, txt);
    const actions = document.createElement('div'); actions.className = 'hm-actions';
    const no = document.createElement('button'); no.type = 'button'; no.className = 'hm-quiet';
    const noL = document.createElement('span'); noL.className = 'hm-lbl'; noL.textContent = 'Not now';
    const noX = document.createElement('span'); noX.className = 'hm-x'; noX.setAttribute('aria-hidden', 'true'); noX.textContent = '×';
    no.append(noL, noX);
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'hm-primary'; yes.textContent = 'Keep this';
    actions.append(no, yes);
    el.append(head, actions);
    document.body.append(el);
    openOffer = el;

    let form = null, charm = null, rect = null, folded = false, foldT = 0, done = false;
    const apply = (f) => {
      el.classList.toggle('is-compact', f === 'compact');
      el.classList.toggle('is-bar', f === 'bar');
      t.textContent = f === 'bar' ? shortName : name;
    };
    function place() {
      if (done) return;
      const geom = mallowGeom(origin, m, face);
      const p = placeBox(el, { forms: ['full', 'compact', 'bar'], apply, kind: 'offer', geom });
      el.style.left = `${Math.round(p.left)}px`; el.style.top = `${Math.round(p.top)}px`;
      rect = { left: p.left, top: p.top, right: p.left + p.w, bottom: p.top + p.h };
      if (p.form !== form) {
        form = p.form;
        charm?.destroy();
        charm = charmCanvas({ skillId, mallow: m.id, box: form === 'full' ? 72 : form === 'compact' ? 52 : 46, reducedMotion: reduced });
        slot.replaceChildren(charm.el);
      }
      return geom;
    }
    let geom = place();
    const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => { if (!done) el.classList.add('is-in'); }));
    reveal();
    announce(`Keep this in your Memory Garden? ${name}`);

    // left alone, it folds into a chip in a corner (nothing is saved, nothing lost)
    const armFold = () => { clearTimeout(foldT); if (foldAfterMs > 0) foldT = setTimeout(fold, foldAfterMs); };
    function fold() {
      if (done || folded) return;
      if (el.contains(document.activeElement)) { armFold(); return; }
      folded = true;
      el.classList.remove('is-in'); el.classList.add('is-folded');
      showChip({ text: `Keep “${shortName}”?`, label: `${name}. Show the choice to keep it in your Memory Garden.`, skillId, mallow: m.id, reduced, glow, geom,
        onTap: () => { if (done) return; folded = false; el.classList.remove('is-folded'); geom = place(); reveal(); armFold(); yes.focus({ preventScroll: true }); } });
    }
    armFold();
    el.addEventListener('pointerdown', armFold);
    el.addEventListener('focusin', armFold);

    const stopLeave = onSceneLeave(() => close(false));
    const stopBand = onBandChange(() => {
      if (done || folded || !rect) return;
      if (obstacleRects().some((o) => hits(rect, o, 4))) geom = place();
    });
    const onResize = () => { if (!folded) geom = place(); };
    addEventListener('resize', onResize);
    const onKey = (e) => { if (e.key === 'Escape' && !folded) close(false); };
    document.addEventListener('keydown', onKey);
    function close(v) {
      if (done) return;
      done = true;
      clearTimeout(foldT);
      stopLeave(); stopBand(); removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey); signal?.removeEventListener?.('abort', onAbort);
      if (folded) hideChip(true);
      el.classList.remove('is-in'); el.classList.add('is-out');
      setTimeout(() => { el.remove(); charm?.destroy(); if (openOffer === el) openOffer = null; }, 340);
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

/** A quiet one-line note (already kept, couldn't save…), off the face and the subtitles. */
function note(text, { ms = 2800, origin = null, face = null, mallow = null } = {}) {
  ensureCss();
  const el = document.createElement('div');
  el.className = 'hm-note'; el.setAttribute('aria-hidden', 'true'); el.textContent = text;
  document.body.append(el);
  const p = placeBox(el, { forms: ['note'], kind: 'offer', geom: mallowGeom(origin, mallow, face) });
  el.style.left = `${Math.round(p.left)}px`; el.style.top = `${Math.round(p.top)}px`;
  announce(text);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 450); }, ms);
}

// -------------------------------------------------------- the sequence --
function fromPoint({ from, origin }) {
  if (from && Number.isFinite(from.x) && Number.isFinite(from.y)) return { x: from.x, y: from.y };
  const o = asRect(call(origin));
  // just above the Mallow's head, where the ripple can form
  if (o) return { x: o.cx, y: o.top - Math.min(56, o.height * 0.16) };
  return { x: innerWidth / 2, y: innerHeight * 0.42 };
}

export function playInstall(opts = {}) {
  ensureCss(); ensureLive();
  const { skillId, app = null, onDone = null, subtitles = null } = opts;
  const skill = getSkill(skillId);
  const { reduced, lowStim } = motionPrefs(app, opts);
  const m = mallowOf(opts.mallow) || MALLOWS[skill?.mallow] || MALLOWS.noomi;
  const P = charmPalette(skillId, m.id);
  const C = { glow: hex(m.colours.glow), accent: hex(m.colours.accent) };
  const T = reduced ? INSTALL_TIMING_REDUCED : INSTALL_TIMING;
  const stim = lowStim ? 0.7 : 1;

  // ---- DOM: overlay, canvas, skip, card
  openCard?.__finish?.('replaced');
  openOffer?.__close?.(false);
  hideChip(true);
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
  const slot = document.createElement('span'); slot.className = 'hm-install-slot'; slot.setAttribute('aria-hidden', 'true');
  const over = document.createElement('p'); over.className = 'hm-install-over'; over.textContent = 'New tool saved';
  const h = document.createElement('h2'); h.className = 'hm-install-title'; h.id = cid;
  const titleText = skill?.title || 'A new discovery';
  const hs = document.createElement('span'); hs.textContent = titleText; h.append(hs);
  const line = document.createElement('p'); line.className = 'hm-install-line'; line.textContent = skill?.essence || 'It’s waiting for you in your Memory Garden.';
  const actions = document.createElement('div'); actions.className = 'hm-actions';
  const visit = document.createElement('button'); visit.type = 'button'; visit.className = 'hm-primary'; visit.textContent = 'Visit the garden';
  const keep = document.createElement('button'); keep.type = 'button'; keep.className = 'hm-quiet'; keep.textContent = 'Keep playing';
  actions.append(visit, keep);
  card.setAttribute('aria-labelledby', cid);
  card.append(slot, over, h, line, actions);
  root.append(skip, card);
  document.body.append(root);
  openCard = card;
  const phase = (name) => {
    try {
      document.body.classList.toggle('hm-installing', name !== 'end');
      dispatchEvent(new CustomEvent('hm:install', { detail: { phase: name, skillId } }));
    } catch { /* old browsers: no signal, nothing breaks */ }
  };
  // the band above the Mallow clears while the charm forms there: passing lines are dropped, a held line stays
  let subsPaused = false;
  const pauseSubs = () => { if (subsPaused) return; subsPaused = true; try { subtitles?.pause?.(); } catch { /* optional */ } };
  const resumeSubs = () => { if (!subsPaused) return; subsPaused = false; try { subtitles?.resume?.(); } catch { /* optional */ } };
  pauseSubs();
  phase('start');

  // ---- geometry (client CSS px)
  let W = innerWidth, H = innerHeight, dpr = 1, bright = false;
  const F = { x: 0, y: 0 }, Pp = { x: 0, y: 0 };
  let S = 80, Rp = 64, geom = null, cardP = null, cardForm = null, charm = null;
  const applyCard = (f) => { card.classList.toggle('is-compact', f === 'compact'); card.classList.toggle('is-tight', f === 'tight'); };
  function placeCard() {
    cardP = placeBox(card, { forms: ['full', 'compact', 'tight'], apply: applyCard, kind: 'card', geom, lift: (f) => (f === 'full' ? 60 : 0) });
    card.style.left = `${Math.round(cardP.left)}px`; card.style.top = `${Math.round(cardP.top)}px`;
    if (cardP.form !== cardForm) {
      cardForm = cardP.form;
      charm?.destroy();
      charm = charmCanvas({ skillId, mallow: m.id, box: cardForm === 'full' ? 120 : cardForm === 'compact' ? 80 : 64, reducedMotion: reduced, animate: cardShown && !reduced });
      slot.replaceChildren(charm.el);
    }
  }
  /** Where the card's charm sits on screen (the portal closes there when the card is above the Mallow). */
  function cardCharmAt() {
    if (!cardP) return null;
    if (cardP.form === 'full') return { x: cardP.left + cardP.w / 2, y: cardP.top };
    const s = cardP.form === 'compact' ? 80 : 64;
    return { x: cardP.left + 8 + s / 2, y: cardP.top + cardP.h / 2 - 22 };
  }
  function measure() {
    W = innerWidth; H = innerHeight;
    if (own) {
      dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    } else dpr = canvas.width / Math.max(1, canvas.clientWidth || W);
    const fr = screenFrame();
    const obstacles = obstacleRects();
    geom = mallowGeom(opts.origin, m, opts.face);
    const U = Math.min(W, H);
    S = clamp(U * 0.22, 64, 112);
    Rp = clamp(U * 0.17, 52, 92);
    // the ripple: above the head, out of the subtitle band (onto the crown, never the eyes)
    Object.assign(F, fromPoint(opts));
    F.x = clamp(F.x, S, W - S); F.y = clamp(F.y, fr.topLimit + S * 0.6, H - S);
    const rip = () => ({ left: F.x - S * 0.9, right: F.x + S * 0.9, top: F.y - S * 0.6, bottom: F.y + S * 0.6 });
    const block = obstacles.find((o) => hits(rip(), o));
    if (block && geom) F.y = Math.min(Math.max(F.y, block.bottom + S * 0.6 + 4), geom.face.top - S * 0.3);
    placeCard();
    // the portal: above, in the clear, where the card's charm will appear when the card is above too
    const topP = fr.topLimit + Rp * 1.25;
    const at = cardP.region === 'above' ? cardCharmAt() : null;
    Pp.x = at ? at.x : W / 2;
    Pp.y = Math.max(topP, at ? at.y : F.y - Math.max(170, H * 0.3));
    const circle = (x, y) => ({ left: x - Rp * 1.3, right: x + Rp * 1.3, top: y - Rp * 1.3, bottom: y + Rp * 1.3 });
    const clearAt = (x, y) => !obstacles.some((o) => hits(circle(x, y), o));
    if (!clearAt(Pp.x, Pp.y)) {
      // step out of the subtitle band: up, down (above the ripple), then to a side
      const ys = [], hiY = Math.max(topP, F.y - 110);
      for (let d = 12; d < H; d += 12) { ys.push(Pp.y - d, Pp.y + d); }
      const y = ys.find((yy) => yy >= topP && yy <= hiY && clearAt(Pp.x, yy));
      if (y != null) Pp.y = y;
      else { const x = [W * 0.28, W * 0.72].find((xx) => clearAt(xx, Pp.y)); if (x != null) Pp.x = x; }
    }
    if (F.y - Pp.y < 110) { Pp.y = Math.max(topP, Math.min(Pp.y, F.y - 60)); if (Math.abs(Pp.x - F.x) < Rp * 1.6) Pp.x = F.x < W / 2 ? W * 0.72 : W * 0.28; }
    Pp.x = clamp(Pp.x, Rp * 1.3 + 12, W - Rp * 1.3 - 12);
    bright = opts.bright ?? brightAt(Pp.x, Pp.y);
    placeSkip(fr, obstacles);
  }
  function placeSkip(fr, obstacles) {
    const w = skip.offsetWidth || 72, hh = skip.offsetHeight || 44;
    const avoid = [...obstacles, geom?.face, { left: Pp.x - Rp * 1.4, right: Pp.x + Rp * 1.4, top: Pp.y - Rp * 1.4, bottom: Pp.y + Rp * 1.4 },
      { left: F.x - S, right: F.x + S, top: F.y - S, bottom: F.y + S },
      cardP && { left: cardP.left, right: cardP.left + cardP.w, top: cardP.top - (cardP.form === 'full' ? 60 : 0), bottom: cardP.top + cardP.h }].filter(Boolean);
    const spots = [[fr.W - 20 - w, fr.topLimit], [fr.W - 20 - w, fr.bottomLimit - hh], [20, fr.bottomLimit - hh], [20, fr.topLimit]];
    const s = spots.find(([x, y]) => !avoid.some((a) => hits({ left: x, top: y, right: x + w, bottom: y + hh }, a, 6))) || spots[1];
    skip.style.left = `${Math.round(s[0])}px`; skip.style.top = `${Math.round(s[1])}px`;
  }

  // ---- drawing
  const glowS = glowSprite(C.glow), goldS = glowSprite(GOLD), whiteS = glowSprite(WHITE), accentS = glowSprite(C.accent);
  // the portal is lit in the charm's own colours (the Mallow's glow only in the aura), feathered, never a hard neon line
  const rimC = mixC(mixC(P.rim, P.light, 0.35), C.glow, 0.18);
  const ringRim = ringSprite(rimC, 2.2), ringHalo = ringSprite(mixC(P.light, C.glow, 0.3), 2.4), ringIn = ringSprite(mixC(P.light, WHITE, 0.3), 1.6);
  const petalA = petalSprite(mixC(P.core, P.rim, 0.4)), petalB = petalSprite(mixC(P.light, C.accent, 0.5));
  const N = lowStim ? 12 : 26;
  const motes = new Float32Array(N * 4);       // angle, radius, start, size
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < N; i++) { motes[i * 4] = rnd() * TAU; motes[i * 4 + 1] = 0.9 + rnd() * 0.7; motes[i * 4 + 2] = 0.02 + rnd() * 0.36; motes[i * 4 + 3] = 0.6 + rnd() * 0.8; }
  const dust = new Float32Array(12 * 3);
  for (let i = 0; i < 12; i++) { dust[i * 3] = rnd() * TAU; dust[i * 3 + 1] = 0.4 + rnd() * 0.6; dust[i * 3 + 2] = rnd(); }
  const TRAIL = 18;
  const trail = new Float32Array((TRAIL + 1) * 2);
  const PETALS = lowStim ? 8 : 12;

  const sprite = (s, x, y, r, a) => { if (a > 0.003 && r > 0.5) { g.globalAlpha = Math.min(1, a); g.drawImage(s, x - r, y - r, r * 2, r * 2); } };
  const ctrl = { x: 0, y: 0 };
  const setCtrl = () => { ctrl.x = lerp(F.x, Pp.x, 0.5) + (F.x <= Pp.x ? -1 : 1) * W * 0.2; ctrl.y = lerp(F.y, Pp.y, 0.55); };
  const bez = (e, out, i) => { const u = 1 - e; out[i] = u * u * F.x + 2 * u * e * ctrl.x + e * e * Pp.x; out[i + 1] = u * u * F.y + 2 * u * e * ctrl.y + e * e * Pp.y; };
  const pos = new Float32Array(2);

  function drawTrail(e, sc, al) {
    // one tapered ribbon of light along the path it came (no beads)
    const span = Math.min(e, 0.3);
    if (span < 0.02) return;
    for (let j = 0; j <= TRAIL; j++) bez(e - span * (j / TRAIL), trail, j * 2);
    const w0 = sc * 0.17;
    for (let pass = 0; pass < 2; pass++) {
      const wk = pass ? 0.38 : 1;
      g.beginPath();
      for (let side = 0; side < 2; side++) {
        for (let q = 0; q <= TRAIL; q++) {
          const j = side ? TRAIL - q : q;
          const x = trail[j * 2], y = trail[j * 2 + 1];
          const j0 = Math.max(0, j - 1), j1 = Math.min(TRAIL, j + 1);
          let nx = -(trail[j1 * 2 + 1] - trail[j0 * 2 + 1]), ny = trail[j1 * 2] - trail[j0 * 2];
          const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
          const w = w0 * wk * (1 - j / TRAIL) ** 1.25 * (side ? -1 : 1);
          if (!side && !q) g.moveTo(x + nx * w, y + ny * w); else g.lineTo(x + nx * w, y + ny * w);
        }
      }
      g.closePath();
      const gr = g.createLinearGradient(trail[0], trail[1], trail[TRAIL * 2], trail[TRAIL * 2 + 1]);
      gr.addColorStop(0, rgbaOf(pass ? WHITE : GOLD, pass ? 0.6 : 0.5));
      gr.addColorStop(0.45, rgbaOf(pass ? GOLD : C.glow, pass ? 0.3 : 0.28));
      gr.addColorStop(1, rgbaOf(C.glow, 0));
      g.fillStyle = gr; g.globalAlpha = al * stim; g.fill();
    }
  }

  function frameFull(t) {
    const U = S / 80;
    const lit = bright ? 'source-over' : 'lighter';
    g.globalCompositeOperation = 'lighter';
    // 1. a luminous ripple gathers above the Mallow
    const gather = env(t, 0, 0.32, 0.5, 0.6);
    sprite(glowS, F.x, F.y, S * (0.7 + 0.5 * eOut(k01(t, 0, 0.8))), gather * 0.55 * stim);
    for (let i = 0; i < 3; i++) {
      const k = k01(t, 0.04 + i * 0.17, 0.82 + i * 0.17);
      if (k <= 0 || k >= 1) continue;
      const a = Math.sin(Math.PI * k), rx = (12 + 78 * eOut(k)) * U, ry = (6 + 30 * eOut(k)) * U;
      g.strokeStyle = rgbaOf(i === 1 ? C.accent : C.glow, 1);
      g.globalAlpha = a * 0.16 * stim; g.lineWidth = (9 - 4 * k) * U;
      g.beginPath(); g.ellipse(F.x, F.y, rx, ry, 0, 0, TAU); g.stroke();
      g.globalAlpha = a * 0.6 * stim; g.lineWidth = (2.2 - 1.2 * k) * U;
      g.beginPath(); g.ellipse(F.x, F.y, rx, ry, 0, 0, TAU); g.stroke();
    }
    for (let i = 0; i < N; i++) {
      const k = k01(t, motes[i * 4 + 2], motes[i * 4 + 2] + 0.56);
      if (k <= 0 || k >= 1) continue;
      const e = eIn(k), a0 = motes[i * 4], r0 = motes[i * 4 + 1] * 120 * U;
      const r = r0 * (1 - e), a = a0 + 1.7 * e;
      sprite(i % 3 ? glowS : goldS, F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.62, (3 + 3 * motes[i * 4 + 3]) * U * (1.2 - e * 0.5), Math.sin(Math.PI * k) * 0.9);
    }

    // the charm's state this frame
    const formK = k01(t, T.form, T.form + 0.62);
    const travelK = k01(t, T.travel, T.enter);
    const e = eInOut(travelK);
    setCtrl();
    if (travelK > 0) bez(e, pos, 0); else { pos[0] = F.x; pos[1] = F.y; }
    const depth = k01(travelK, 0.62, 1);                       // how far into the well it has gone
    const sc = (travelK > 0 ? (1 - 0.6 * travelK ** 1.6) * (1 - 0.5 * depth) : eBack(formK)) * S;
    const al = Math.min(1, formK * 2.2) * (1 - eIn(depth) * 0.96);
    const inside = k01(travelK, 0.52, 0.66);                   // cross-fade from in front of the portal to inside it
    const wob = travelK > 0 ? Math.sin(t * 9) * 0.06 * (1 - travelK) : Math.sin(t * 7) * 0.12 * (1 - formK);
    const glint = k01(t, T.form + 0.4, T.form + 1.1);
    const charmAt = (a) => {
      if (a <= 0.003) return;
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      drawCharm(g, { skillId, mallow: m.id, x: pos[0], y: pos[1], size: sc, res: S * 1.12, t, alpha: a, rot: wob, glint: glint > 0 && glint < 1 ? glint : null, dpr, sparkle: travelK < 0.5 && !lowStim });
    };

    // 2. the portal: opens, breathes (≈1/s, shallow), takes the charm, closes
    const open = eOut(k01(t, T.portalOpen, T.portalOpen + 0.55)) * (1 - eIn(k01(t, T.close, T.close + 0.6)));
    if (open > 0.002) {
      // one calm breath a second, shallow: light, never flicker
      const r = Rp * open, breath = 0.88 + 0.12 * Math.sin(Math.PI * 2 * t);
      g.globalCompositeOperation = lit;
      sprite(glowS, Pp.x, Pp.y, r * 2.5, (bright ? 0.2 : 0.32) * open * breath * stim);
      sprite(accentS, Pp.x, Pp.y, r * 1.7, (bright ? 0.08 : 0.12) * open * stim);
      // soft petals of light open round the rim, turning slowly; they fold a little inwards as the charm is taken in
      const take = env(t, T.enter - 0.3, 0.3, 0.1, 0.5);
      for (let i = 0; i < PETALS; i++) {
        const a = i * (TAU / PETALS) + t * 0.12;
        const w = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 2.1);
        const len = r * (0.42 + 0.14 * w) * (1 - 0.18 * take), dist = r * 1.06 + len * 0.36;
        g.save();
        g.translate(Pp.x + Math.cos(a) * dist, Pp.y + Math.sin(a) * dist);
        g.rotate(a + Math.PI / 2);
        g.globalAlpha = (bright ? 0.26 : 0.2 + 0.16 * w) * (1 + 0.4 * take) * open * stim;
        g.drawImage(i % 2 ? petalB : petalA, -len * 0.26, -len * 0.62, len * 0.52, len);
        g.restore();
      }
      // the comet's tail leads into the rim; the well (drawn next) swallows its end
      g.globalCompositeOperation = 'lighter';
      if (travelK > 0 && travelK < 1) drawTrail(e, sc, al * (1 - depth));
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = Math.min(1, open * 1.4);
      const well = wellSprite(P, bright);
      g.drawImage(well, Pp.x - r * 1.08, Pp.y - r * 1.08, r * 2.16, r * 2.16);
      // inside: a nebula in the charm's colours and far specks, turning at different speeds (depth), rings drifting inwards
      g.save();
      g.beginPath(); g.arc(Pp.x, Pp.y, r * 0.97, 0, TAU); g.clip();
      g.globalCompositeOperation = lit;
      const neb = nebulaSprite(P, bright), sp = specksSprite(P, bright);
      g.save(); g.translate(Pp.x, Pp.y); g.rotate(t * 0.22);
      g.globalAlpha = 0.95 * open; g.drawImage(neb, -r, -r, r * 2, r * 2);
      g.rotate(-t * 0.58); const ks = 0.86 + 0.06 * Math.sin(t * 1.3);
      g.globalAlpha = 0.85 * open * stim; g.drawImage(sp, -r * ks, -r * ks, r * 2 * ks, r * 2 * ks);
      g.restore();
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < (lowStim ? 2 : 3); k++) {
        const q = (t * 0.36 + k / 3) % 1;                     // a ring passes every ≈0.9 s: calm, never a pulse
        const rr = r * (1.04 - 0.8 * eIn(q)) / 0.86;
        sprite(ringIn, Pp.x, Pp.y, rr, Math.sin(Math.PI * q) * (bright ? 0.22 : 0.3) * open * stim);
      }
      if (inside > 0) charmAt(al * inside);
      g.restore();
      // the rim: two feathered rings at different scales breathing out of step (depth), and one slow ripple breathing out
      g.globalCompositeOperation = lit;
      sprite(ringRim, Pp.x, Pp.y, (r * 1.0) / 0.86, (bright ? 0.5 : 0.36) * open);
      sprite(ringHalo, Pp.x, Pp.y, (r * (1.16 + 0.025 * Math.sin(t * 1.1 + 1))) / 0.86, (bright ? 0.24 : 0.11) * open * stim);
      g.globalCompositeOperation = 'lighter';
      const rk = (t * 0.55) % 1;
      sprite(ringRim, Pp.x, Pp.y, (r * (1.04 + 0.42 * rk)) / 0.86, (1 - rk) * 0.22 * open * stim);
      // specks drawn into the depth
      for (let i = 0; i < 10; i++) {
        const k = (t * 0.9 + i / 10) % 1, ee = eIn(k), a = i * 2.39 + ee * 2.4;
        const rr = r * (1.55 - 1.5 * ee);
        sprite(i % 2 ? whiteS : glowS, Pp.x + Math.cos(a) * rr, Pp.y + Math.sin(a) * rr, (2.2 + 2 * (1 - ee)) * U, Math.sin(Math.PI * k) * 0.7 * open * stim);
      }
      // one soft bloom as the charm arrives (rise 0.3 s, never a flash)
      sprite(whiteS, Pp.x, Pp.y, r * 1.5, (bright ? 0.25 : 0.38) * env(t, T.enter - 0.08, 0.3, 0.08, 0.6) * stim);
    } else if (travelK > 0 && travelK < 1) {
      g.globalCompositeOperation = 'lighter';
      drawTrail(e, sc, al);
    }
    // 3. the charm in front (forming, travelling), until it passes into the well
    if (formK > 0) {
      g.globalCompositeOperation = 'lighter';
      sprite(goldS, pos[0], pos[1], sc * 1.1, 0.5 * env(t, T.form, 0.32, 0.12, 0.6) * al * (1 - inside) * stim);
      charmAt(al * (1 - inside));
    }
    // 4. dust settling as the portal closes
    g.globalCompositeOperation = 'lighter';
    const dk = k01(t, T.close - 0.05, T.end);
    if (dk > 0 && dk < 1) {
      for (let i = 0; i < 12; i++) {
        const a = dust[i * 3], spd = dust[i * 3 + 1];
        const rr = Rp * (0.3 + 1.2 * eOut(dk) * spd);
        sprite(i % 3 ? glowS : goldS, Pp.x + Math.cos(a) * rr, Pp.y + Math.sin(a) * rr * 0.8 + dk * 18 * U, 2.6 * U, (1 - dk) * 0.7 * (0.5 + dust[i * 3 + 2] * 0.5) * stim);
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

  // ---- clock, phases, sound (in the shared Mallow loop)
  let brightSeen = false;
  let t0 = performance.now(), ticking = false, manual = null, cardShown = false, finished = false, skipped = false, buzzed = false, foldT = 0;
  const cues = reduced ? [] : [[0.02, 'shimmer'], [T.portalOpen + 0.05, 'portal'], [T.enter, 'chime']];
  let cue = 0;
  const audio = (name) => { try { app?.audio?.fx?.(name, { intensity: 0.45 }); } catch { /* decoration */ } };
  function showCard() {
    if (cardShown) return;
    cardShown = true;
    phase('card');
    root.classList.add('has-card');
    placeCard();
    card.classList.add('is-in');
    charm.draw(1.3);
    if (!reduced) setTimeout(() => { if (!finished && cardShown) liveCharm(); }, 50);
    if (reduced || skipped) audio('chime');
    announce(`New tool saved: ${titleText}. ${skill?.essence || ''}`.trim());
    armFold();
    // keyboard users land on the main choice; touch play is never interrupted
    if (keyboardUser && (!document.activeElement || document.activeElement === document.body)) visit.focus({ preventScroll: true });
  }
  function liveCharm() {
    // swap the still charm for a live one once the card is in
    const box = cardForm === 'full' ? 120 : cardForm === 'compact' ? 80 : 64;
    const live = charmCanvas({ skillId, mallow: m.id, box, reducedMotion: reduced });
    charm?.destroy();
    charm = live;
    slot.replaceChildren(live.el);
  }
  // left alone, the card folds into a small "In your garden" chip (the tool is already saved)
  function armFold() { clearTimeout(foldT); const ms = opts.foldAfterMs ?? FOLD_AFTER.card; if (ms > 0 && manual == null) foldT = setTimeout(() => { if (card.contains(document.activeElement)) armFold(); else finish('folded'); }, ms); }
  card.addEventListener('pointerdown', armFold);
  card.addEventListener('focusin', armFold);
  function stopTicker() { if (ticking) { removeTicker(step); ticking = false; } }
  function startTicker() { if (!ticking && !finished) { ticking = true; addTicker(step); } }
  function step() {
    if (finished) { stopTicker(); return; }
    const t = manual ?? (performance.now() - t0) / 1000;
    while (manual == null && cue < cues.length && t >= cues[cue][0]) audio(cues[cue++][1]);
    // look at what is behind the portal once, just before it opens (the backdrop is settled by then)
    if (!brightSeen && t >= T.portalOpen - 0.12) { brightSeen = true; if (opts.bright == null && !reduced) bright = brightAt(Pp.x, Pp.y); }
    if (t >= T.enter - 0.02 && !reduced && !buzzed && manual == null) { buzzed = true; try { app?.haptic?.('success'); } catch { /* optional */ } }
    render(t);
    if (t >= T.card) showCard();
    if (t >= T.end) { stopTicker(); root.classList.remove('is-animating'); if (own) canvas.style.display = 'none'; resumeSubs(); return; }
    if (manual != null) stopTicker();
  }
  measure();
  const onResize = () => { measure(); if (manual != null) render(manual); };
  addEventListener('resize', onResize);
  startTicker();

  // ---- endings
  let resolveP;
  const done = new Promise((r) => { resolveP = r; });
  const stopLeave = onSceneLeave(() => finish('cancelled'));
  function doSkip() {
    if (finished || !root.classList.contains('is-animating')) return;
    skipped = true;
    manual = null;
    t0 = performance.now() - T.end * 1000;   // straight to the end: clear and show the card now
    step();
  }
  function finish(action) {
    if (finished) return;
    finished = true;
    clearTimeout(foldT);
    stopTicker();
    resumeSubs();
    removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    stopLeave();
    phase('end');
    card.classList.remove('is-in'); card.classList.add('is-out');
    root.classList.remove('is-animating');
    if (!own) { try { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); } catch { /* ignore */ } }
    const gone = () => { root.remove(); charm?.destroy(); if (openCard === card) openCard = null; };
    if (action === 'garden' || action === 'cancelled' || action === 'replaced') gone(); else setTimeout(gone, 340);
    if (action === 'folded') {
      showChip({ text: 'In your garden', label: `${titleText} is saved in your Memory Garden. Visit the garden.`, skillId, mallow: m.id, reduced, glow: C.glow, geom,
        ttl: FOLD_AFTER.savedChip, onTap: () => { try { app?.audio?.ui?.('open'); } catch { /* */ } app?.go?.('garden', { focus: skillId }); } });
    }
    const result = { action, skillId };
    try { onDone?.(result); } catch (e) { console.warn('[garden-install]', e); }
    resolveP(result);
    if (action === 'garden' && app?.go) app.go('garden', { focus: skillId });
  }
  card.__finish = finish;
  const onKey = (e) => { if (e.key !== 'Escape') return; if (cardShown) finish('play'); else if (root.classList.contains('is-animating')) doSkip(); };
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
      clearTimeout(foldT);
      stopTicker();
      if (opts.bright == null && !reduced) bright = brightAt(Pp.x, Pp.y);
      root.classList.toggle('is-animating', manual < T.end);
      if (own) canvas.style.display = '';
      render(manual);
      if (manual >= T.card) showCard(); else if (cardShown) { cardShown = false; root.classList.remove('has-card'); card.classList.remove('is-in'); }
      clearTimeout(foldT);
    },
    timing: T,
    get geometry() { return { from: { ...F }, portal: { ...Pp }, charm: S, portalRadius: Rp, card: cardP && { ...cardP }, bright, face: geom?.face || null, body: geom?.body || null, skip: skip.getBoundingClientRect() }; },
    el: root,
  });
}

// ------------------------------------------------- offer → save → install --
/**
 * The whole "keep this discovery" moment for the Hushfold / director:
 * nothing is saved unless the person taps "Keep this"; a tool that's already
 * in the garden isn't offered again (it counts as practised, with a quiet
 * note); a save the device refused is said honestly, never "saved".
 */
export async function keepDiscovery({ app = null, store = app?.store, skillId, worldId = null, mallow = null, origin = null, face = null, from = null, subtitles = null, reducedMotion, lowStim, signal } = {}) {
  const skill = getSkill(skillId);
  if (!store || !skill) return { kept: false, already: false, stored: false, action: null };
  const mallowId = typeof mallow === 'string' ? mallow : mallow?.id || null;
  if (hasSkill(store, skillId)) {
    practised(store, skillId);
    note(`${skill.title} is already in your Memory Garden.`, { origin, face, mallow: mallowId || skill.mallow });
    return { kept: false, already: true, stored: true, action: null };
  }
  const yes = await offerSave({ skillId, mallow, app, reducedMotion, signal, origin, face });
  if (!yes || signal?.aborted) return { kept: false, already: false, stored: false, action: null };
  const saved = saveSkill(store, { id: skillId, fromWorld: worldId, mallow: mallowId });
  if (!saved) return { kept: false, already: false, stored: false, action: null };
  if (saved.stored === false) {
    note('This device wouldn’t let it be saved just now, so it may not be in your garden next time.', { ms: 5200, origin, face, mallow: mallowId || skill.mallow });
    return { kept: true, already: false, stored: false, action: null };
  }
  const r = await playInstall({ app, skillId, mallow, origin, face, from, subtitles, reducedMotion, lowStim });
  return { kept: true, already: false, stored: true, action: r.action };
}
/** The single entry point for the Hushfold's 'offer' event: hushfold.js calls install.onOffer(ctx). */
export const onOffer = keepDiscovery;

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
  const origin = qs.get('show') === '1' ? () => app.world.bodyRect() : null;
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
