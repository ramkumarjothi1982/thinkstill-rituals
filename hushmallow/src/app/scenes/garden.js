// THE MEMORY GARDEN — the tools the person chose to keep, as living charms on
// a moonlit hillside. Each charm sways on a stem of light (brush a finger
// through the garden and they lean and spring back), fireflies drift, and
// the person's Mallow sits on the crest. Tap a charm to open it: what it is,
// one real-life example, how it goes, how it was found, Practise again
// (→ the Hushfold starts that world), related tools, where it comes from (the
// evidence label and the catalogue wording, apart from creative
// inspirations), care notes, and Forget this (with a confirm).
//
// Route 'garden', gated on hushmallow Flow ('paid' → plans otherwise). A
// person whose plan has lapsed keeps a read-only garden: what they kept stays
// readable (open it, read it, "Try it"), and only "Practise again" asks for
// the plan (owner to confirm: READ_ONLY_WHEN_LAPSED). No scores, streaks or
// counts: it describes, it never nags. Only ids are stored
// (src/engine/garden.js); the charms are drawn from skill id + Mallow.
// params.focus = skillId: that charm has just arrived from the portal (the
// arrival plays once; going Back to the garden later doesn't replay it).
// The loop runs in the shared Mallow ticker (rig.js addTicker) and stops while
// a charm is open.

import { h, iconBtn } from '../ui.js';
import { MALLOWS } from '../../mallows/registry.js';
import { getSkill, EVIDENCE_NOTE, INSPIRATION_NOTE } from '../../hushfold/skills.js';
import { garden as gardenList, gardenEntry, practised, forgetSkill } from '../../engine/garden.js';
import { charmCanvas, charmPalette, drawCharm } from '../../hushfold/charm.js';
import { registry } from '../../hushfold/flow/registry.js';
import { addTicker, removeTicker } from '../../mallows/rig.js';
import { openSupport } from './support.js';

/** A lapsed plan keeps the garden readable (Practise again asks for the plan). Owner to confirm. */
export const READ_ONLY_WHEN_LAPSED = true;
// arrivals already played in this page session (`${id}:${savedAt}`), so Back to the garden never replays one
const ARRIVED = new Set();

const CSS = `
.hg { --hg-ff-ui: var(--ff-ui, "HM Manrope", system-ui, -apple-system, "Segoe UI", sans-serif); --hg-ff-voice: var(--ff-voice, "HM Nunito Sans", ui-rounded, system-ui, sans-serif); --hg-ff-story: var(--ff-story, "HM Fraunces", Georgia, "Times New Roman", serif); --hg-k: var(--type-scale, 1);
  position: absolute; inset: 0; pointer-events: none !important; color: var(--text-1, #f7f3ff); }
.hg.scene-enter { animation: hgFade 520ms cubic-bezier(.22,1,.36,1) both; transform: none; }
@keyframes hgFade { from { opacity: 0; } to { opacity: 1; } }
.hg .hg-ui { pointer-events: auto; }
.hg-canvas { position: fixed; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
/* the hills sit between the realm and the Mallow (a sibling of #mallow-layer), so nothing veils the Mallow */
.hg-canvas.hg-back { z-index: 0; animation: hgFade 520ms cubic-bezier(.22,1,.36,1) both; }
.hg-head { position: fixed; z-index: 1; top: calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 12px); left: 20px; right: 20px; display: flex; align-items: flex-start; gap: 12px; pointer-events: none; }
.hg-head > .icon-btn { pointer-events: auto; flex: 0 0 auto; }
.hg-titles { position: relative; isolation: isolate; min-width: 0; padding-top: 1px; }
.hg-titles::before { content: ''; position: absolute; z-index: -1; inset: -12px -22px -12px -16px; border-radius: 999px; background: rgba(8,6,26,.5); filter: blur(14px); pointer-events: none; }
.hg-titles h1 { margin: 0; font: var(--type-world, 540 calc(clamp(24px, 9.091vw - 9.091px, 30px) * var(--hg-k))/1.12 var(--hg-ff-story)); letter-spacing: var(--type-world-ls, -.01em); font-optical-sizing: auto; text-wrap: balance;
  color: #fff6ea; text-shadow: 0 2px 22px rgba(6,4,22,.85), 0 0 2px rgba(6,4,22,.6); }
.hg-titles p { margin: 4px 0 0; font: var(--type-caption, 550 calc(13px * var(--hg-k))/1.4 var(--hg-ff-ui)); letter-spacing: var(--type-caption-ls, .003em); color: #ddd6f5; text-shadow: 0 1px 10px rgba(6,4,22,.95); }
.hg-field { position: fixed; left: 0; right: 0; bottom: 0; touch-action: none; pointer-events: auto; -webkit-user-select: none; user-select: none; }
.hg-plant { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; box-sizing: border-box; padding: 0 2px 2px; margin: 0;
  border: 0; border-radius: 20px; background: none; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: none; }
.hg-plant:focus-visible { outline: 2.5px solid #ffd98a; outline-offset: 2px; }
.hg-plant .txt { position: absolute; left: 2px; right: 2px; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.hg-plant .lbl { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 100%; text-align: center; text-wrap: balance;
  font: var(--type-label, 600 calc(14px * var(--hg-k))/1.35 var(--hg-ff-ui)); letter-spacing: var(--type-label-ls, 0); color: #f3efff; text-shadow: 0 1px 10px rgba(4,2,16,.95), 0 0 3px rgba(4,2,16,.9); }
.hg-plant .lbl.is-small { font-size: calc(13px * var(--hg-k)); }
.hg-plant .lbl.is-wrap { overflow-wrap: anywhere; -webkit-hyphens: auto; hyphens: auto; }
.hg-plant.is-hero .lbl { font: var(--type-heading, 700 calc(20px * var(--hg-k))/1.2 var(--hg-ff-ui)); letter-spacing: var(--type-heading-ls, -.01em); }
.hg-plant .ess { margin-top: 4px; max-width: 30ch; font: var(--type-label, 600 calc(14px * var(--hg-k))/1.35 var(--hg-ff-ui)); font-weight: 500; color: #d9d2f2; text-shadow: 0 1px 10px rgba(4,2,16,.95); text-align: center; }
.hg-plant.is-leaving { opacity: 0; transition: opacity .5s ease; }
.hg-empty { position: fixed; z-index: 1; left: 20px; right: 20px; margin: 0 auto; max-width: 420px; text-align: center; pointer-events: none; }
.hg-empty .lead { margin: 0; text-wrap: balance; font: var(--type-lead, 650 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #fff6ea; text-shadow: 0 1px 12px rgba(4,2,16,.9); }
.hg-empty .body { margin: 8px 0 0; font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #d9d2f2; text-shadow: 0 1px 12px rgba(4,2,16,.9); }
.hg-empty .btn { margin-top: 20px; pointer-events: auto; }
.hg-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

/* the open charm */
.hg-detail { position: fixed; inset: 0; z-index: 3; display: flex; justify-content: center; pointer-events: auto;
  background: linear-gradient(180deg, rgba(9,7,26,.9), rgba(7,5,20,.96)); -webkit-backdrop-filter: blur(18px) saturate(1.1); backdrop-filter: blur(18px) saturate(1.1);
  opacity: 0; transition: opacity .38s cubic-bezier(.22,1,.36,1); }
.hg-detail.is-in { opacity: 1; }
.hg-col { position: relative; width: 100%; max-width: 560px; height: 100%; transform: translateY(18px); transition: transform .55s cubic-bezier(.2,.9,.25,1); }
/* behind the words, the column is nearly solid: the garden only glows at its edges */
.hg-col::before { content: ''; position: absolute; inset: 0 -24px; z-index: -1; pointer-events: none; background: linear-gradient(90deg, rgba(7,5,20,0), rgba(7,5,20,.6) 24px, rgba(7,5,20,.6) calc(100% - 24px), rgba(7,5,20,0)); }
.hg-detail.is-in .hg-col { transform: none; }
.hg-detail.is-reduced .hg-col { transform: none; transition: none; }
.hg-sheet { --top: calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 68px); position: absolute; inset: 0; box-sizing: border-box; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  padding: var(--top) 20px calc(var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 32px);
  -webkit-mask-image: linear-gradient(180deg, transparent calc(var(--top) - 14px), #000 calc(var(--top) + 18px)); mask-image: linear-gradient(180deg, transparent calc(var(--top) - 14px), #000 calc(var(--top) + 18px)); }
.hg-sheet-top { position: absolute; z-index: 2; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 10px; padding: calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 12px) 20px 10px; }
.hg-sheet-top .where { font: var(--type-label, 600 calc(14px * var(--hg-k))/1.35 var(--hg-ff-ui)); color: #cdc6ea; }
.hg-hero { display: block; margin: -40px auto -22px; }
.hg-over { margin: 0; text-align: center; font: var(--type-overline, 750 calc(13px * var(--hg-k))/1.25 var(--hg-ff-ui)); letter-spacing: var(--type-overline-ls, .12em); text-transform: uppercase; color: #ffd98a; }
.hg-title { margin: 8px 0 0; text-align: center; font: var(--type-reward, 600 calc(clamp(24px, 7.273vw - 1.273px, 30px) * var(--hg-k))/1.12 var(--hg-ff-story)); letter-spacing: var(--type-reward-ls, -.01em); font-optical-sizing: auto; text-wrap: balance; color: #fff6e6; }
.hg-title:focus { outline: none; }
.hg-essence { margin: 10px auto 0; max-width: 32ch; text-align: center; font: var(--type-lead, 650 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #f7f3ff; text-wrap: balance; }
.hg-sec { margin-top: 26px; }
.hg-sec > h3 { margin: 0 0 9px; font: var(--type-overline, 750 calc(13px * var(--hg-k))/1.25 var(--hg-ff-ui)); letter-spacing: var(--type-overline-ls, .12em); text-transform: uppercase; color: #a9a2cf; }
.hg-p { margin: 0; font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #dcd5f3; }
.hg-p + .hg-p { margin-top: 10px; }
.hg-try { margin-top: 18px; padding: 15px 16px 16px; border-radius: 20px; background: linear-gradient(135deg, rgba(255,217,138,.15), rgba(255,217,138,.04)); border: 1px solid rgba(255,217,138,.3); }
.hg-try p { margin: 0; font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #fff4df; }
.hg-try b { font-weight: 800; color: #ffd98a; }
.hg-steps { list-style: none; margin: 0; padding: 0; counter-reset: s; display: grid; gap: 10px; }
.hg-steps li { counter-increment: s; display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 10px; align-items: start; font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #dcd5f3; }
.hg-steps li::before { content: counter(s); display: grid; place-items: center; width: 28px; height: 28px; margin-top: 0; border-radius: 50%; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16);
  font: 750 calc(13px * var(--hg-k))/1 var(--hg-ff-ui); color: #ffd98a; }
.hg-found { margin: 0; padding-left: 14px; border-left: 2px solid rgba(255,217,138,.5); font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); font-style: italic; color: #e6e0fa; }
.hg-practise { margin-top: 24px; }
.hg-practise .btn { width: 100%; }
.hg-note { margin: 10px 0 0; text-align: center; font: var(--type-caption, 550 calc(13px * var(--hg-k))/1.4 var(--hg-ff-ui)); color: #b9b2dc; }
.hg-related { display: flex; flex-wrap: wrap; gap: 8px; }
.hg-chip { display: inline-flex; align-items: center; gap: 4px; min-height: 48px; max-width: 100%; padding: 0 16px 0 2px; border-radius: 999px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06);
  color: #f3efff; cursor: pointer; text-align: left; font: var(--type-control, 650 calc(15px * var(--hg-k))/1.2 var(--hg-ff-ui)); }
.hg-chip canvas { flex: 0 0 auto; margin: -4px -2px; }
.hg-chip small { display: block; margin-top: 2px; font: var(--type-caption, 550 calc(13px * var(--hg-k))/1.4 var(--hg-ff-ui)); color: #b9b2dc; }
.hg-chip.is-away { border-style: dashed; background: transparent; }
.hg-lapsed { margin: 0 0 14px; padding: 12px 14px; border-radius: 16px; background: rgba(255,217,138,.08); border: 1px solid rgba(255,217,138,.24); font: var(--type-label, 600 calc(14px * var(--hg-k))/1.35 var(--hg-ff-ui)); color: #f3e9d2; }
.hg-chip:focus-visible, .hg-link:focus-visible, .hg-forget:focus-visible { outline: 2.5px solid #ffd98a; outline-offset: 3px; }
.hg-scope { display: inline-block; margin: 0 0 10px; padding: 6px 12px; border-radius: 999px; background: rgba(143,227,255,.1); border: 1px solid rgba(143,227,255,.32);
  font: var(--type-label, 600 calc(14px * var(--hg-k))/1.35 var(--hg-ff-ui)); color: #c9f2ff; }
.hg-sources { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 12px; }
.hg-sources li { padding: 12px 14px; border-radius: 16px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); }
.hg-sources .n { font: var(--type-row, 600 calc(16px * var(--hg-k))/1.3 var(--hg-ff-ui)); font-weight: 700; color: #f3efff; }
.hg-sources .g { font: var(--type-caption, 550 calc(13px * var(--hg-k))/1.4 var(--hg-ff-ui)); color: #b9b2dc; margin-top: 2px; }
.hg-sources q { display: block; margin-top: 8px; font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #dcd5f3; quotes: "“" "”"; }
.hg-more { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-top: 6px; padding: 0 4px 0 0; border: 0; background: none; color: #ffd98a; cursor: pointer;
  font: var(--type-row, 600 calc(16px * var(--hg-k))/1.3 var(--hg-ff-ui)); }
/* the chevron is a rotated 10 px square (about 14 px across): the 4 px of end padding keep it inside the button */
.hg-more::after { content: ''; flex: 0 0 auto; width: 8px; height: 8px; margin-top: -4px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); transition: transform .25s ease, margin .25s ease; }
.hg-more[aria-expanded="true"]::after { transform: rotate(-135deg); margin-top: 4px; }
.hg-more:focus-visible { outline: 2.5px solid #ffd98a; outline-offset: 3px; }
.hg-more-body[hidden] { display: none; }
.hg-small { margin: 12px 0 0; font: var(--type-caption, 550 calc(13px * var(--hg-k))/1.4 var(--hg-ff-ui)); color: #b9b2dc; }
.hg-care { margin: 0; padding-left: 20px; display: grid; gap: 8px; font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #dcd5f3; }
.hg-link { display: inline-flex; align-items: center; min-height: 44px; margin-top: 8px; padding: 0; border: 0; background: none; color: #ffd98a; cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
  font: var(--type-row, 600 calc(16px * var(--hg-k))/1.3 var(--hg-ff-ui)); }
.hg-end { margin-top: 30px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.1); text-align: center; }
.hg-forget { min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid rgba(255,160,160,.3); background: transparent; color: #ffc2c2; cursor: pointer; font: var(--type-button, 700 calc(16px * var(--hg-k))/1.15 var(--hg-ff-ui)); }
.hg-confirm { margin-top: 4px; padding: 16px; border-radius: 20px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); text-align: left; }
.hg-confirm p { margin: 0; font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #f1ecff; }
.hg-confirm .row-btns { margin-top: 14px; }
.hg-confirm .danger { background: rgba(255,138,138,.16); border-color: rgba(255,160,160,.45); color: #ffd6d6; }
`;
function ensureCss() {
  if (document.getElementById('hm-garden-css')) return;
  const s = document.createElement('style');
  s.id = 'hm-garden-css';
  s.textContent = CSS;
  document.head.append(s);
}

// ------------------------------------------------------------- helpers --
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = (k) => 1 - (1 - k) ** 3;
const k01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const hash01 = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return ((x >>> 0) % 10000) / 10000; };
const hexRgb = (h) => { const v = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0); };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1).toFixed(3)})`;
const env = (t, start, rise, hold, decay) => {
  if (t < start) return 0;
  if (t < start + rise) { const k = (t - start) / rise; return k * k * (3 - 2 * k); }
  if (t < start + rise + hold) return 1;
  const k = (t - start - rise - hold) / decay;
  return k >= 1 ? 0 : 1 - k * k * (3 - 2 * k);
};
const SPRITES = new Map();
function glowSprite(c) {
  const key = c.join(',');
  if (SPRITES.has(key)) return SPRITES.get(key);
  const s = document.createElement('canvas'); s.width = s.height = 96;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(0.25, rgba(c, 0.5)); gr.addColorStop(0.6, rgba(c, 0.13)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
  SPRITES.set(key, s);
  return s;
}
const when = (t) => { try { return new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return ''; } };

export default function gardenScene(app, params = {}) {
  ensureCss();
  const { world, prefs, ent, store } = app;
  // signed in, the account's sync may keep the garden with it too (src/auth): never claim 'only on this device' then
  const deviceOnly = () => app.auth?.status?.() !== 'signed-in';
  const reduced = () => prefs?.reducedMotion?.() ?? false;
  const lowStim = () => !!prefs?.get?.('lowStim');
  const mallowId = (MALLOWS[app.state?.homeMallow] && app.state.homeMallow) || (MALLOWS[prefs?.get?.('mallow')] && prefs.get('mallow')) || 'noomi';

  // ------------------------------------------------------------- DOM --
  // the hills are painted behind the Mallow (inserted before #mallow-layer in enter()), the living garden in front
  const bgCanvas = h('canvas', { class: 'hg-canvas hg-back', 'aria-hidden': 'true' });
  const canvas = h('canvas', { class: 'hg-canvas', 'aria-hidden': 'true' });
  const titleEl = h('h1', {}, 'Memory Garden');
  const captionEl = h('p', {});
  const head = h('header', { class: 'hg-head' }, iconBtn('back', 'Back to the Hushfold', () => back()), h('div', { class: 'hg-titles' }, titleEl, captionEl));
  const field = h('div', { class: 'hg-field hg-ui', role: 'group', 'aria-label': 'Your kept tools' });
  const live = h('div', { class: 'hg-live', 'aria-live': 'polite' });
  const el = h('div', { class: 'hg', 'data-garden': 'root' }, canvas, head, field, live);
  let emptyEl = null, detail = null, layerToken = 0, openerId = null, mallowHidden = false;

  // ----------------------------------------------------------- state --
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, crest = 0, bg = null, ticking = false, left = false, lastT = 0, t0 = performance.now();
  const readOnly = () => !ent.has('paid');
  let plants = [];
  let blades = null, flies = null;
  const pointer = { x: -999, y: -999, vx: 0, t: 0, down: false };
  const crestPts = new Float32Array(65 * 2);

  const kept = () => gardenList(store).map((e) => ({ entry: e, skill: getSkill(e.id) })).filter((x) => x.skill);
  const isPlayableWorld = (id) => { try { return registry.playable(id); } catch { return false; } };

  function back() { app.back(); }
  // env(safe-area-inset-bottom) in px (the iPhone home indicator), measured once per layout
  function safeBottom() {
    const probe = h('div', { style: { position: 'fixed', bottom: '0', height: '0', paddingBottom: 'env(safe-area-inset-bottom, 0px)', visibility: 'hidden', pointerEvents: 'none' } });
    document.body.append(probe);
    const v = probe.getBoundingClientRect().height || 0;
    probe.remove();
    return v;
  }

  // ------------------------------------------------------------ layout --
  function crestY(x) {
    const i = clamp((x / Math.max(1, W)) * 64, 0, 64), i0 = Math.floor(i), i1 = Math.min(64, i0 + 1), f = i - i0;
    return lerp(crestPts[i0 * 2 + 1], crestPts[i1 * 2 + 1], f);
  }
  function layout() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const items = kept();
    const n = items.length;
    const hb = head.getBoundingClientRect().bottom || 80;
    // on short screens the keeper is a little smaller, so it never sits squeezed under the title
    const mallowH = H < 700 ? clamp(Math.min(W, H) * 0.18, 56, 96) : clamp(Math.min(W, H) * 0.2, 64, 118);
    const bottom = H - 22 - safeBottom();
    const minCrest = hb + mallowH + (H < 700 ? 24 : 20);
    let M = null;
    if (n) {
      // the garden takes the room it needs; the rest is sky (the moon stays in view when the plants fit under a lower crest)
      const skyCrest = Math.max(minCrest, H * (W >= 700 ? 0.4 : 0.34));
      const Ms = metrics(n, Math.max(160, bottom - (skyCrest + 24)));
      const s1 = Ms.sizeFor(1);
      const roomy = s1 >= (W < 560 ? 54 : 72) && Ms.rowH >= s1 * 1.75 + Ms.labelH + Ms.depth;
      M = roomy ? Ms : metrics(n, Math.max(160, bottom - (minCrest + 24)));
      crest = clamp(bottom - M.rowH * M.rows - 54, roomy ? skyCrest : minCrest, Math.max(minCrest, H * 0.5));
      renderEmpty(false);
    } else {
      renderEmpty(true);
      const eh = emptyEl.offsetHeight || 220;
      crest = clamp(H * 0.5, minCrest + 28, Math.max(minCrest + 28, bottom - eh - 64));
      emptyEl.style.top = `${Math.round(crest + 52)}px`;
    }
    // the hill's crest: a gentle curve, lower at the edges, with a level seat where the Mallow sits (never perched on a slope)
    const curve = (u) => crest + 22 * (2 * u - 1) ** 2 - 10 * Math.sin(u * Math.PI * 1.2 + 0.4) + 6 * Math.sin(u * 7.1);
    const mx = mallowX(n, mallowH);
    const seatY = curve(mx / Math.max(1, W));
    const seatHalf = Math.max(mallowH * 0.62, (perch?.width || 0) / 2) + 8, ramp = clamp(mallowH * 0.8, 30, 80);
    for (let i = 0; i <= 64; i++) {
      const x = (i / 64) * W, u = i / 64;
      const d = Math.abs(x - mx), k = d <= seatHalf ? 1 : d >= seatHalf + ramp ? 0 : 1 - ((d - seatHalf) / ramp) ** 2 * (3 - 2 * ((d - seatHalf) / ramp));
      crestPts[i * 2] = x; crestPts[i * 2 + 1] = lerp(curve(u), seatY, k);
    }
    field.style.top = `${Math.round(crest - 10)}px`;
    captionEl.textContent = readOnly() && n ? 'Everything you kept is still here to read.' : n ? 'Tap a charm to open it again.' : deviceOnly() ? 'Kept only on this device.' : 'Kept on this phone, and with your account if its sync is on.';
    buildPlants(items, M, bottom);
    buildBackground();
    buildAmbient();
    placeMallow(mallowH, mx);
    draw(performance.now());
  }
  /** Where the Mallow sits on the crest (x in px): beside the empty garden's seed, or at the right of the kept tools. */
  function mallowX(n, mh) {
    const half = mh * 0.62;
    return clamp(n === 0 ? W * 0.5 + Math.min(120, W * 0.27) : W - Math.max(60, Math.min(W * 0.17, 130)), half + 18, W - half - 18);
  }

  /** How the plants are arranged for n tools in a region of height regionH. */
  function metrics(n, regionH) {
    const wide = W >= 700;
    const usable = wide ? Math.min(W - 64, 1200) : Math.min(W - 32, 1100);
    // wide screens: one meadow of charms at two depths (two rows only when there are many), never a long grid
    const oneRow = W >= 1200 ? 8 : W >= 1000 ? 6 : 5;
    const perRow = W < 560 ? 3 : !wide ? 4 : n <= oneRow ? oneRow : Math.ceil(n / 2);
    const rows = n <= 1 ? 1 : Math.ceil(n / perRow);
    const base = Math.floor(n / rows), extra = n % rows;
    const counts = Array.from({ length: rows }, (_, r) => base + (r >= rows - extra ? 1 : 0));
    const hero = n === 1;
    const labelH = hero ? 132 : 46;
    const maxCount = Math.max(1, ...counts);
    const cellW = usable / Math.max(maxCount, hero ? 1 : 2.4);
    const maxSize = wide ? (W >= 1000 ? 150 : 136) : 124;
    const short = H < 700;
    // the depth step between the back and front charms of a row (wide screens only)
    const depthOf = (size) => (wide && !hero && n > 1 ? clamp(size * 0.6, 26, 90) : 0);
    const raw = (sc, room) => (hero
      ? clamp(Math.min(W * (short ? 0.3 : 0.36), regionH * (short ? 0.28 : 0.34)), short ? 92 : 104, 160)
      : clamp(Math.min(cellW * 0.68, (room / rows) * 0.46), 46, maxSize) * sc);
    // the depth is taken from the room first, so the rows never press into each other
    let depth = depthOf(raw(1, regionH));
    const sizeFor = (sc) => raw(sc, Math.max(120, regionH - depth * rows));
    depth = depthOf(sizeFor(1));
    const rowH = Math.min(regionH / rows, (hero ? (short ? 1.8 : 2.05) : 2.25) * sizeFor(1) + labelH + depth);
    return { usable, rows, counts, hero, labelH, maxCount, cellW, sizeFor, rowH, depth };
  }

  // does a label fit in two lines, with no word cut? Measured in the label's own computed face (W1's --type-label or the fallback)
  let measureG = null, labelFont = null;
  function readLabelFont() {
    const probe = h('span', { class: 'hg-plant', style: { visibility: 'hidden', left: '-999px', top: '0' } }, h('span', { class: 'lbl' }, 'Mg'));
    field.append(probe);
    const cs = getComputedStyle(probe.firstChild);
    const k = parseFloat(getComputedStyle(probe).getPropertyValue('--hg-k')) || 1;
    labelFont = { style: cs.fontStyle, weight: cs.fontWeight, size: parseFloat(cs.fontSize) || 14 * k, small: 13 * k, family: cs.fontFamily };
    probe.remove();
  }
  function fitsTwoLines(text, maxW, small = false) {
    measureG ||= document.createElement('canvas').getContext('2d');
    if (!labelFont) readLabelFont();
    measureG.font = `${labelFont.style} ${labelFont.weight} ${small ? labelFont.small : labelFont.size}px ${labelFont.family}`;
    let lines = 1, w = 0;
    const space = measureG.measureText(' ').width;
    for (const word of text.split(' ')) {
      const ww = measureG.measureText(word).width;
      if (ww > maxW) return false;
      if (w && w + space + ww > maxW) { lines++; w = ww; } else w += (w ? space : 0) + ww;
    }
    return lines <= 2;
  }
  /** The label for a plant button: the title, at 14 px then 13 px; then the short name; never a word cut mid-way unless nothing else fits. */
  function plantLabel(skill, maxW) {
    for (const text of [...new Set([skill.title, skill.short || skill.title])]) {
      if (fitsTwoLines(text, maxW)) return { text, cls: 'lbl' };
      if (fitsTwoLines(text, maxW, true)) return { text, cls: 'lbl is-small' };
    }
    return { text: skill.short || skill.title, cls: 'lbl is-small is-wrap' };
  }

  function buildPlants(items, M, bottom) {
    const n = items.length;
    const old = new Map(plants.map((p) => [p.id, p]));
    field.replaceChildren();
    plants = [];
    labelFont = null;
    if (!n) return;
    const top = crest + 24;
    const regionH = Math.max(160, bottom - top);
    const { usable, rows, counts, hero, labelH, maxCount, sizeFor, rowH, depth } = M;
    let k = 0;
    const blockTop = top + Math.max(0, regionH - rowH * rows) * (hero ? 0.42 : 0.36);
    for (let r = 0; r < rows; r++) {
      const sc = rows === 1 ? 1 : lerp(0.84, 1, r / (rows - 1));
      const count = counts[r];
      const cell = usable / count;
      const rowBottom = blockTop + rowH * (r + 1);
      for (let i = 0; i < count; i++, k++) {
        const { entry, skill } = items[k];
        const jit = hash01(skill.id);
        // wide screens: every other charm stands a step further back (higher and a little smaller), so a row reads as a meadow
        const back = depth > 0 && count > 1 && (i + r) % 2 === 0;
        const size = sizeFor(sc) * (back ? 0.86 : 1);
        const stagger = rows > 1 && count === maxCount && maxCount > 1 ? (r % 2 ? 0.08 : -0.08) * cell : 0;
        const cx = clamp((W - usable) / 2 + cell * (i + 0.5) + stagger + (jit - 0.5) * Math.min(14, cell * 0.12), 24 + size * 0.5, W - 24 - size * 0.5);
        const gy = rowBottom - labelH - (back ? depth : 0) - (jit * 8);
        const stem = clamp(rowH - depth - labelH - size - 14, size * 0.3, size * (hero ? 0.62 : 0.8));
        const cy = gy - stem - size * 0.48;
        const prev = old.get(skill.id);
        const P = charmPalette(skill.id, entry.mallow || skill.mallow);
        const p = {
          id: skill.id, skill, entry, cx, cy, gy, size, stem, P, back,
          phase: jit * 6.28, swayA: 0.035 + jit * 0.02, swayW: (Math.PI * 2) / (5.2 + jit * 2.2),
          th: prev?.th || 0, om: prev?.om || 0, poke: prev?.poke || -9, arrive: prev?.arrive ?? -9, fade: 1,
          glintAt: 2 + jit * 6,
        };
        // the button stays inside its own cell, centred on its charm (neighbours never overlap)
        const cellL = (W - usable) / 2 + cell * i, cellR = cellL + cell;
        const bw = Math.max(44, Math.min(cell - 6, Math.max(size * 1.6, 120), 240, 2 * Math.min(cx - cellL, cellR - cx) - 4));
        const btnTop = cy - size * 0.62;
        const lab = hero ? { text: skill.title, cls: 'lbl' } : plantLabel(skill, bw - 8);
        const txt = h('span', { class: 'txt', style: { top: `${Math.round(p.gy - btnTop + 10)}px` } },
          h('span', { class: lab.cls }, lab.text),
          hero ? h('span', { class: 'ess' }, skill.essence) : null);
        const btn = h('button', {
          class: `hg-plant${hero ? ' is-hero' : ''}`, type: 'button',
          'aria-label': `${skill.title}. ${skill.essence}`,
          style: { left: `${Math.round(cx - bw / 2)}px`, top: `${Math.round(btnTop - (crest - 10))}px`, width: `${Math.round(bw)}px`, height: `${Math.round(gy + labelH - btnTop)}px` },
          onclick: () => tapPlant(p),
        }, txt);
        p.btn = btn; p.txt = txt;
        field.append(btn);
        plants.push(p);
      }
    }
    const p = params.focus && plants.find((x) => x.id === params.focus);
    if (p) {
      const key = `${p.id}:${p.entry.savedAt}`;
      if (!ARRIVED.has(key)) {
        ARRIVED.add(key);
        live.textContent = `${p.skill.title} is in your garden now.`;
        if (!reduced() && p.arrive < 0) p.arrive = (performance.now() - t0) / 1000 + 0.35;
        greet(p, reduced() ? 0.3 : 1.7);
      }
    }
  }

  // the static backdrop (veil, hills, moonlight, ground flowers) is painted once per layout on its own canvas, behind the Mallow
  function buildBackground() {
    bg = bgCanvas;
    bg.width = canvas.width; bg.height = canvas.height;
    const b = bg.getContext('2d');
    b.scale(dpr, dpr);
    // a veil at the top so the title reads over any sky
    let gr = b.createLinearGradient(0, 0, 0, Math.min(H, crest + 40));
    gr.addColorStop(0, 'rgba(8,6,26,0.62)'); gr.addColorStop(0.45, 'rgba(8,6,26,0.18)'); gr.addColorStop(1, 'rgba(8,6,26,0)');
    b.fillStyle = gr; b.fillRect(0, 0, W, crest + 40);
    // far hill
    b.beginPath(); b.moveTo(0, crest - 6);
    for (let i = 0; i <= 64; i++) { const u = i / 64; b.lineTo(u * W, crestPts[i * 2 + 1] - 26 - 18 * Math.sin(u * Math.PI * 2.1 + 1.2)); }
    b.lineTo(W, H); b.lineTo(0, H); b.closePath();
    gr = b.createLinearGradient(0, crest - 50, 0, crest + 120);
    gr.addColorStop(0, 'rgba(70,58,150,0.55)'); gr.addColorStop(1, 'rgba(26,20,70,0.7)');
    b.fillStyle = gr; b.fill();
    // near hill
    const hill = new Path2D();
    hill.moveTo(0, crestPts[1]);
    for (let i = 1; i <= 64; i++) hill.lineTo(crestPts[i * 2], crestPts[i * 2 + 1]);
    hill.lineTo(W, H); hill.lineTo(0, H); hill.closePath();
    gr = b.createLinearGradient(0, crest - 30, 0, H);
    gr.addColorStop(0, 'rgba(34,26,84,0.97)'); gr.addColorStop(0.35, 'rgba(18,13,50,0.985)'); gr.addColorStop(1, 'rgba(7,5,20,1)');
    b.fillStyle = gr; b.fill(hill);
    // moonlight along the crest
    b.save(); b.clip(hill);
    gr = b.createRadialGradient(W * 0.62, crest - 40, 10, W * 0.62, crest - 40, Math.max(W, 420) * 0.75);
    gr.addColorStop(0, 'rgba(190,175,255,0.2)'); gr.addColorStop(1, 'rgba(190,175,255,0)');
    b.fillStyle = gr; b.fillRect(0, crest - 60, W, H);
    b.restore();
    b.beginPath(); b.moveTo(0, crestPts[1]);
    for (let i = 1; i <= 64; i++) b.lineTo(crestPts[i * 2], crestPts[i * 2 + 1]);
    b.strokeStyle = 'rgba(210,200,255,0.35)'; b.lineWidth = 1.4; b.stroke();
    b.globalCompositeOperation = 'lighter';
    b.strokeStyle = 'rgba(160,140,255,0.12)'; b.lineWidth = 7; b.stroke();
    if (perch) {
      // its seat: a soft pool of its own light on the level crest, glowing out from under it
      const c = hexRgb(MALLOWS[mallowId]?.colours?.glow || '#c9c0ff');
      const s0 = glowSprite(c);
      b.globalAlpha = 0.55;
      b.drawImage(s0, perch.cx - perch.width * 0.85, perch.bottom - 14, perch.width * 1.7, 30);
      b.globalAlpha = 1;
    }
    b.globalCompositeOperation = 'source-over';
    // tiny flowers of light scattered over the ground
    const dot = glowSprite([200, 190, 255]), warm = glowSprite([255, 217, 138]);
    for (let i = 0; i < Math.round(W / 9); i++) {
      const x = hash01(`fx${i}`) * W, y0 = crestY(x) + 12;
      const y = y0 + hash01(`fy${i}`) ** 1.6 * (H - y0 - 10);
      const r = 1.6 + hash01(`fr${i}`) * 2.4;
      b.globalAlpha = 0.25 + hash01(`fa${i}`) * 0.35;
      b.drawImage(i % 4 ? dot : warm, x - r * 2, y - r * 2, r * 4, r * 4);
    }
    b.globalAlpha = 1;
  }

  function buildAmbient() {
    const nb = Math.round(W / 8);
    blades = new Float32Array(nb * 4);    // x, height, lean, phase
    for (let i = 0; i < nb; i++) { blades[i * 4] = (i + hash01(`b${i}`)) * (W / nb); blades[i * 4 + 1] = 5 + hash01(`bh${i}`) * 11; blades[i * 4 + 2] = (hash01(`bl${i}`) - 0.5) * 0.5; blades[i * 4 + 3] = hash01(`bp${i}`) * 6.28; }
    const nf = lowStim() ? 6 : 15;
    flies = new Float32Array(nf * 6);     // x, y, phase, speed, size, warm
    for (let i = 0; i < nf; i++) {
      flies[i * 6] = hash01(`fl${i}`) * W; flies[i * 6 + 1] = lerp(crest - 90, H - 40, hash01(`fly${i}`));
      flies[i * 6 + 2] = hash01(`flp${i}`) * 6.28; flies[i * 6 + 3] = 0.25 + hash01(`fls${i}`) * 0.4; flies[i * 6 + 4] = 1.6 + hash01(`flz${i}`) * 1.8; flies[i * 6 + 5] = i % 3 ? 1 : 0;
    }
  }

  // the keeper of the garden: the person's Mallow sits on a level seat on the crest, in front of the hills, whole and lit
  let perch = null, corrT = 0, greetT = 0;
  function placeMallow(mh, xpx) {
    if (!world) return;
    const Hl = Math.min(H * 0.56, 470);
    const scale = clamp(mh / (0.66 * Hl), 0.12, 0.6);
    const bottom = crestY(xpx) + 3;
    world.place({ x: (xpx / W) * 100, y: ((bottom - 0.38 * Hl * scale) / H) * 100, scale, calm: true });
    placeMallow.want = { xpx, bottom, h: mh };
    scheduleCorrect(4);
  }
  function scheduleCorrect(n) { clearTimeout(corrT); corrT = setTimeout(() => correctMallow(n), 780); }
  function correctMallow(n = 1) {
    // corrections from the rig's true body box, once each move has landed (the layer heuristic is approximate)
    if (left || !world?.bodyRect || !placeMallow.want) return;
    const r = world.bodyRect();
    if (!r || !r.height) return;
    const want = placeMallow.want;
    const dy = want.bottom - r.bottom, dx = want.xpx - r.cx, k = want.h / r.height;
    if (Math.abs(dy) < 1.5 && Math.abs(dx) < 2 && Math.abs(k - 1) < 0.05) { setPerch(r); return; }
    const layer = world.layer;
    const cur = parseFloat(layer?.style.getPropertyValue('--my')) || 50;
    const sc = parseFloat(layer?.style.getPropertyValue('--ms')) || 0.3;
    const cx = parseFloat(layer?.style.getPropertyValue('--mx')) || 80;
    // the layer scales about its centre: a new scale moves the body's bottom by (k - 1) × its distance from that centre
    const lr = layer?.getBoundingClientRect?.();
    const ns = clamp(sc * (Math.abs(k - 1) < 0.05 ? 1 : k), 0.12, 0.8);
    const lcy = lr && lr.height ? lr.top + lr.height / 2 : r.bottom - r.height;
    const bottomAfter = lcy + (r.bottom - lcy) * (ns / sc);
    const cxAfter = (lr && lr.width ? lr.left + lr.width / 2 : r.cx) + (r.cx - (lr && lr.width ? lr.left + lr.width / 2 : r.cx)) * (ns / sc);
    world.place({ x: cx + ((want.xpx - cxAfter) / W) * 100, y: cur + ((want.bottom - bottomAfter) / H) * 100, scale: ns, calm: true });
    if (n > 1) scheduleCorrect(n - 1); else setTimeout(() => { if (!left) setPerch(world.bodyRect()); }, 780);
  }
  /** The Mallow's true seat: a pool of its light marks it (the hills are behind it, so nothing veils it). */
  function setPerch(r) {
    if (!r?.height) return;
    const same = perch && Math.abs(perch.left - r.left) < 1 && Math.abs(perch.bottom - r.bottom) < 1 && Math.abs(perch.width - r.width) < 1;
    const wider = !perch || r.width > perch.width + 2;
    perch = { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.top + r.height, cx: r.left + r.width / 2 };
    if (same) return;
    // a wider body than planned: widen its level seat too (the crest is rebuilt; the plants stay where they are)
    if (wider && placeMallow.want && r.width / 2 + 8 > placeMallow.want.h * 0.62 + 8) { layout(); return; }
    buildBackground(); if (reduced()) draw(performance.now());
  }
  /** A little life: the Mallow looks towards a charm (and is pleased when one arrives). */
  function greet(p, delay = 0, kind = 'success') {
    clearTimeout(greetT);
    greetT = setTimeout(() => {
      const pr = perch || world?.bodyRect?.();
      if (left || !pr?.height || !world?.rig) return;
      const pose = plantPose(p, (performance.now() - t0) / 1000);
      const pcx = pr.cx ?? pr.left + pr.width / 2;
      try {
        world.rig.lookAt?.(clamp((pose.x - pcx) / (W * 0.4), -1, 1), clamp((pose.y - (pr.top + pr.height * 0.45)) / (H * 0.4), -1, 1));
        if (kind) world.react?.(kind);
        setTimeout(() => { if (!left) world.rig?.lookAt?.(null); }, 2600);
      } catch { /* the rig is decoration here */ }
    }, delay * 1000);
  }

  function renderEmpty(on) {
    emptyEl?.remove(); emptyEl = null;
    if (!on) return;
    emptyEl = h('div', { class: 'hg-empty' },
      h('p', { class: 'lead' }, 'Nothing planted yet, and that’s fine.'),
      h('p', { class: 'body' }, 'When you discover something while you play, you can choose to keep it here as a charm, to come back to whenever you like.'),
      h('button', { class: 'btn primary hg-ui', type: 'button', onclick: () => back() }, 'Back to the Hushfold'));
    el.append(emptyEl);
  }

  // ------------------------------------------------------------ frame --
  function plantPose(p, t) {
    const sway = reduced() ? 0 : p.swayA * Math.sin(t * p.swayW + p.phase) + p.th;
    let grow = 1, drop = 0, alpha = p.fade;
    if (p.arrive > -1) {
      const k = k01(t, p.arrive, p.arrive + 1.5);
      if (t < p.arrive) { alpha = 0; grow = 0; } else if (k < 1) { drop = (1 - eOut(k)) * (p.cy + p.size * 1.2); grow = eOut(k01(k, 0.35, 1)); alpha = Math.min(1, k * 4) * p.fade; }
    }
    const L = p.gy - p.cy;
    const x = p.cx + Math.sin(sway) * L, y = p.gy - Math.cos(sway) * L - drop;
    return { x, y, sway, grow, alpha, drop };
  }

  function draw(now) {
    const t = (now - t0) / 1000;
    const dt = clamp(t - lastT, 0, 0.05);
    lastT = t;
    const still = reduced();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // grass along the crest, bending in the breeze and away from a finger
    if (blades) {
      g.strokeStyle = 'rgba(176,164,255,0.42)'; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < blades.length / 4; i++) {
        const x = blades[i * 4], hgt = blades[i * 4 + 1];
        const y = crestY(x) + 1.5;
        let lean = blades[i * 4 + 2] + (still ? 0 : 0.16 * Math.sin(t * 0.9 + x * 0.018 + blades[i * 4 + 3] * 0.3));
        const dx = x - pointer.x, dy = y - pointer.y;
        if (!still && dx * dx + dy * dy < 3600) lean += (dx > 0 ? 0.6 : -0.6) * (1 - Math.sqrt(dx * dx + dy * dy) / 60);
        g.moveTo(x, y);
        g.quadraticCurveTo(x + lean * hgt * 0.4, y - hgt * 0.6, x + Math.sin(lean) * hgt, y - Math.cos(lean) * hgt);
      }
      g.stroke();
      g.lineCap = 'butt';
    }
    // fireflies
    if (flies) {
      const warm = glowSprite([255, 222, 150]), cool = glowSprite([190, 255, 225]);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < flies.length / 6; i++) {
        const ph = flies[i * 6 + 2], sp = flies[i * 6 + 3];
        let x = flies[i * 6] + (still ? 0 : Math.sin(t * sp + ph) * 26 + Math.sin(t * sp * 0.37 + ph * 2) * 18);
        let y = flies[i * 6 + 1] + (still ? 0 : Math.cos(t * sp * 0.8 + ph) * 16);
        const dx = x - pointer.x, dy = y - pointer.y, d2 = dx * dx + dy * dy;
        if (!still && d2 < 6400) { const d = Math.sqrt(d2) || 1, push = (1 - d / 80) * 28; x += (dx / d) * push; y += (dy / d) * push; }
        // a firefly drifting past the Mallow goes behind it (never a speck on its face)
        if (perch && x > perch.left && x < perch.left + perch.width && y > perch.top && y < perch.bottom - 4) continue;
        const tw = still ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.9 + sp) + ph * 3));
        const r = flies[i * 6 + 4] * 3.2;
        g.globalAlpha = tw * 0.75;
        g.drawImage(flies[i * 6 + 5] ? warm : cool, x - r, y - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    // the empty garden: one glowing seed, waiting without hurry
    if (!plants.length) {
      const x = W / 2 - Math.min(40, W * 0.08), y = crestY(W / 2) + 6;
      const b = still ? 0.7 : 0.55 + 0.45 * Math.sin(t * 1.05);
      const s = glowSprite([255, 217, 138]);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.3 + 0.2 * b;
      g.drawImage(s, x - 60, y - 22, 120, 44);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(12,9,32,0.95)';
      g.beginPath(); g.ellipse(x, y + 4, 26, 7.5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(210,200,255,0.32)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 4, 26, 7.5, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      // the seed itself, resting in its mound and breathing a little light
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.45 + 0.35 * b;
      g.drawImage(s, x - 26, y - 24, 52, 52);
      g.globalAlpha = 0.95;
      g.drawImage(s, x - 8, y - 6, 16, 16);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(255,240,205,0.95)';
      g.beginPath(); g.ellipse(x, y + 1.5, 4.2, 3.2, -0.3, 0, Math.PI * 2); g.fill();
    }
    // the plants: a pool of light, a mound, a stem, two leaves, the charm
    for (const p of plants) {
      if (p.leaving) p.fade = Math.max(0, 1 - (now - p.leaving) / 550);
      if (!still) {
        // a soft spring: brushed by a finger, it leans and comes back
        const k = 20, c = 2.2;
        p.om += (-k * p.th - c * p.om) * dt;
        p.th = clamp(p.th + p.om * dt, -0.4, 0.4);
      }
      const pose = plantPose(p, t);
      const sz = p.size;
      const pool = glowSprite(p.P.glow);
      // an arriving charm's name appears as it lands, not before
      if (p.txt && p.arrive > -1 && !p.txtShown) {
        const la = k01(t, p.arrive + 0.9, p.arrive + 1.5);
        if (la < 1) p.txt.style.opacity = la.toFixed(2); else { p.txt.style.opacity = ''; p.txtShown = true; }
      }
      const bloom = p.arrive > -1 ? env(t, p.arrive + 1.2, 0.32, 0.1, 0.9) : 0;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = (0.42 + 0.5 * bloom) * Math.max(pose.grow, 0.2) * p.fade;
      g.drawImage(pool, p.cx - sz * 0.95, p.gy - sz * 0.3, sz * 1.9, sz * 0.6);
      if (bloom > 0) {
        g.globalAlpha = bloom * 0.6;
        g.strokeStyle = rgba(p.P.glow, 1); g.lineWidth = 1.4;
        const rr = sz * (0.4 + 0.9 * k01(t, p.arrive + 1.2, p.arrive + 2.4));
        g.beginPath(); g.ellipse(p.cx, p.gy + 2, rr, rr * 0.26, 0, 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = p.fade;
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(10,8,30,0.92)';
      g.beginPath(); g.ellipse(p.cx, p.gy + 2, sz * 0.32, sz * 0.085, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = rgba(p.P.rim, 0.35); g.lineWidth = 1;
      g.beginPath(); g.ellipse(p.cx, p.gy + 2, sz * 0.32, sz * 0.085, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      // stem of light, growing to meet an arriving charm
      if (pose.grow > 0.01) {
        const tipX = lerp(p.cx, pose.x, pose.grow), tipY = lerp(p.gy, pose.y + sz * 0.42 + pose.drop, pose.grow);
        const midX = p.cx + (tipX - p.cx) * 0.25, midY = lerp(p.gy, tipY, 0.55);
        g.lineCap = 'round';
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rgba(p.P.glow, 0.22 * p.fade); g.lineWidth = 5.5;
        g.beginPath(); g.moveTo(p.cx, p.gy); g.quadraticCurveTo(midX, midY, tipX, tipY); g.stroke();
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = rgba(p.P.rim, 0.85 * p.fade); g.lineWidth = 1.7;
        g.beginPath(); g.moveTo(p.cx, p.gy); g.quadraticCurveTo(midX, midY, tipX, tipY); g.stroke();
        // two leaves
        const lx = lerp(p.cx, midX, 0.7), ly = lerp(p.gy, midY, 0.7), ls = Math.min(14, sz * 0.16) * pose.grow;
        for (const dir of [-1, 1]) {
          g.save(); g.translate(lx, ly + (dir > 0 ? -ls * 0.5 : 0)); g.rotate(dir * 0.9 + pose.sway * 0.6); g.scale(dir, 1);
          g.fillStyle = rgba(p.P.rim, 0.55 * p.fade);
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(ls * 0.5, -ls * 0.45, ls, 0); g.quadraticCurveTo(ls * 0.5, ls * 0.3, 0, 0); g.fill();
          g.restore();
        }
        g.lineCap = 'butt';
      }
      // an arriving charm leaves a short trail of light
      if (pose.drop > 1) {
        g.globalCompositeOperation = 'lighter';
        for (let j = 1; j <= 8; j++) { g.globalAlpha = (0.4 - j * 0.045) * pose.alpha; g.drawImage(pool, pose.x - sz * 0.22, pose.y - sz * 0.22 - j * sz * 0.16, sz * 0.44, sz * 0.44); }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
      const pokeK = k01(t, p.poke, p.poke + 0.5);
      const bob = pokeK > 0 && pokeK < 1 ? Math.sin(pokeK * Math.PI) * 0.08 : 0;
      let glint = null;
      if (!still) { const gk = (t - p.glintAt) / 1.3; if (gk > 0 && gk < 1) glint = gk; else if (gk >= 1) p.glintAt = t + 5 + hash01(`${p.id}${Math.floor(t)}`) * 6; }
      drawCharm(g, { skillId: p.id, mallow: p.entry.mallow || p.skill.mallow, x: pose.x, y: pose.y - bob * sz, size: sz * (1 + bob), t: still ? 1.3 : t, alpha: pose.alpha, rot: pose.sway * 0.5, glint, dpr, sparkle: true, breathe: !still });
      g.globalAlpha = 1;
    }
  }

  // one ticker in the shared Mallow loop; it stops while a charm is open, when hidden and in reduced motion
  function tick() {
    if (left || detail || document.hidden || reduced()) { stopLoop(); return; }
    draw(performance.now());
  }
  function kick() { if (!ticking && !left && !detail && !reduced()) { ticking = true; addTicker(tick); } }
  function stopLoop() { if (ticking) { removeTicker(tick); ticking = false; } }

  // ------------------------------------------------------------ touch --
  // every finger brushes on its own (two fingers through the garden lean two rows)
  const fingers = new Map();
  function onMove(e) {
    const now = performance.now();
    const f = fingers.get(e.pointerId);
    const dtp = f ? Math.max(8, now - f.t) : 16;
    const vx = f ? (e.clientX - f.x) / dtp : 0;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: now });
    pointer.vx = vx; pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = now;
    if (reduced() || !vx) return;
    const t = (now - t0) / 1000;
    for (const p of plants) {
      const pose = plantPose(p, t);
      // the charm and its stem both catch the finger
      const dy = e.clientY < pose.y ? pose.y - e.clientY : Math.max(0, e.clientY - p.gy);
      const dx = Math.abs(lerp(p.cx, pose.x, clamp((p.gy - e.clientY) / Math.max(1, p.gy - pose.y), 0, 1)) - e.clientX);
      const d = Math.hypot(dx, dy);
      const r = p.size * 0.75;
      if (d < r) p.om = clamp(p.om + vx * 1.5 * (1 - d / r), -3.2, 3.2);
    }
  }
  function onUpPointer(e) { fingers.delete(e.pointerId); if (!fingers.size && e.pointerType !== 'mouse') pointer.x = pointer.y = -999; }
  function onLeavePointer(e) { fingers.delete(e.pointerId); if (!fingers.size) pointer.x = pointer.y = -999; }
  field.addEventListener('pointermove', onMove, { passive: true });
  field.addEventListener('pointerdown', onMove, { passive: true });
  field.addEventListener('pointerleave', onLeavePointer);
  field.addEventListener('pointercancel', onLeavePointer);
  field.addEventListener('pointerup', onUpPointer);

  function tapPlant(p) {
    p.poke = (performance.now() - t0) / 1000;
    greet(p, 0, null);
    if (!reduced()) p.om += (p.cx < W / 2 ? 1 : -1) * 0.6;
    app.audio?.ui?.('open');
    app.haptic?.('light');
    if (reduced()) openDetail(p.id); else setTimeout(() => { if (!left) openDetail(p.id); }, 200);
    openerId = p.id;
  }

  // ----------------------------------------------------------- detail --
  function practiseTarget(skill) {
    if (skill.practise?.route === 'angle') return ent.has('ultra') ? { go: () => app.go('angle'), label: 'Practise again' } : { note: 'You practise this one in Another Angle, part of hushmallow Beyond.' };
    if (!ent.has('paid')) return { note: 'Practising it in its world comes with hushmallow Flow. The “Try it” above works anywhere.', plans: true };
    if (isPlayableWorld(skill.world.id)) return { go: () => app.go('home', { flow: { worldId: skill.world.id } }), label: 'Practise again' };
    return { note: 'You can practise this one with the “Try it” above, anywhere.' };
  }
  /** Close the open charm (and its history entry) first, then go: Back from there lands on the garden, once. */
  function leaveTo(go) { closeDetail(true, { keepLayer: false, refocus: false }); go(); }

  function openDetail(id) {
    const skill = getSkill(id);
    if (!skill) return;
    const entry = gardenEntry(store, id);
    // Back, Escape or ✕ return focus to the plant that opened it (a related tool opened from inside keeps the first one)
    if (!detail) { const a = document.activeElement; const ap = plants.find((x) => x.btn === a); if (ap) openerId = ap.id; else if (!plants.some((x) => x.id === openerId)) openerId = null; }
    closeDetail(true);
    const isReduced = reduced();
    const sheet = h('div', { class: 'hg-sheet' });
    const box = Math.round(clamp(Math.min(innerWidth * 0.62, innerHeight * 0.32), 170, 280));
    const hero = charmCanvas({ skillId: id, mallow: entry?.mallow || skill.mallow, box, reducedMotion: isReduced, label: `${skill.title} charm` });
    hero.el.classList.add('hg-hero');
    const titleId = `hg-t-${id}`;
    const title = h('h2', { class: 'hg-title', id: titleId, tabindex: '-1' }, skill.title);
    const [tryLead, ...tryRest] = skill.example.split(': ');
    const target = entry ? practiseTarget(skill) : null;
    const charms = [hero];

    // every related tool is listed: kept ones open as they are, the others open as "Not in your garden yet" (with their "Try it")
    const related = skill.related.map(getSkill).filter(Boolean).map((r) => {
      const re = gardenEntry(store, r.id);
      const c = charmCanvas({ skillId: r.id, mallow: re ? re.mallow || r.mallow : r.mallow, box: 48, reducedMotion: isReduced, bob: false });
      if (!re) c.el.style.opacity = '0.6';
      charms.push(c);
      return h('button', { class: `hg-chip${re ? '' : ' is-away'}`, type: 'button', onclick: () => openDetail(r.id) },
        c.el, h('span', {}, r.title, re ? null : h('small', {}, 'Not in your garden yet')));
    });

    const sources = h('ul', { class: 'hg-sources' }, ...skill.sources.map((s) => h('li', {},
      h('div', { class: 'n' }, s.skill), h('div', { class: 'g' }, `${s.group} · ${s.scope}`), h('q', {}, s.insight), h('div', { class: 'g', style: { marginTop: '6px' } }, `Source: ${s.ref}`))));
    // the catalogue's sources, inspirations and the evidence note wait behind a disclosure
    const moreId = `hg-more-${id}`;
    const moreBody = h('div', { class: 'hg-more-body', id: moreId, hidden: true }, sources,
      h('p', { class: 'hg-small' }, `Also inspired by: ${skill.inspiredBy.join(', ')}. ${INSPIRATION_NOTE}`),
      h('p', { class: 'hg-small' }, EVIDENCE_NOTE));
    const moreBtn = h('button', { class: 'hg-more', type: 'button', 'aria-expanded': 'false', 'aria-controls': moreId,
      onclick: () => { const open = moreBody.hidden; moreBody.hidden = !open; moreBtn.setAttribute('aria-expanded', String(open)); } }, 'Where this comes from');

    let endEl;
    const forget = () => {
      endEl.replaceChildren(h('div', { class: 'hg-confirm', role: 'group', 'aria-label': 'Forget this tool?' },
        h('p', {}, `Forget “${skill.title}”? It will leave your garden. You can keep it again whenever you come across it.`),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn', type: 'button', onclick: () => { endEl.replaceChildren(...endKids()); endEl.querySelector('.hg-forget')?.focus(); } }, 'Keep it'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => doForget(id, endEl, endKids) }, 'Forget'))));
      endEl.querySelector('.btn')?.focus();
    };
    const endKids = () => [
      entry ? h('p', { class: 'hg-small', style: { margin: '0 0 12px' } }, `Kept on ${when(entry.savedAt)}. ${deviceOnly() ? 'It lives only on this device.' : 'It lives on this phone, and with your account if its sync is on.'}`) : null,
      entry ? h('button', { class: 'hg-forget', type: 'button', onclick: forget }, 'Forget this') : null,
    ].filter(Boolean);
    endEl = h('div', { class: 'hg-end' }, ...endKids());

    const topBar = h('div', { class: 'hg-sheet-top' }, iconBtn('back', 'Back to the garden', () => closeDetail()), h('span', { class: 'where' }, 'Memory Garden'));
    sheet.append(...[
      hero.el,
      !entry ? h('p', { class: 'hg-over' }, 'Not in your garden yet') : skill.world.title !== skill.title ? h('p', { class: 'hg-over' }, `From ${skill.world.title}`) : null,
      title,
      h('p', { class: 'hg-essence' }, skill.essence),
      h('section', { class: 'hg-sec', 'aria-label': 'What it is' }, h('p', { class: 'hg-p' }, skill.explanation),
        h('div', { class: 'hg-try' }, h('p', {}, h('b', {}, `${tryLead}:`), ` ${tryRest.join(': ')}`))),
      h('section', { class: 'hg-sec' }, h('h3', {}, 'How it goes'), h('ol', { class: 'hg-steps' }, ...skill.steps.map((s) => h('li', {}, s)))),
      entry && skill.found ? h('section', { class: 'hg-sec' }, h('h3', {}, 'How you found it'), h('p', { class: 'hg-found' }, skill.found)) : null,
      target?.go ? h('div', { class: 'hg-practise' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { practised(store, id); leaveTo(target.go); } }, target.label),
        h('p', { class: 'hg-note' }, `In ${skill.world.title}. Stay as long as you like.`)) : null,
      target?.note ? h('p', { class: 'hg-note', style: { marginTop: '22px' } }, target.note) : null,
      target?.plans ? h('p', { class: 'hg-note', style: { marginTop: '2px' } }, h('button', { class: 'hg-link', type: 'button', onclick: () => leaveTo(() => app.go('plans', { reason: 'garden' })) }, 'About hushmallow Flow')) : null,
      !entry && isPlayableWorld(skill.world.id) && ent.has('paid') ? h('div', { class: 'hg-practise' }, h('button', { class: 'btn primary', type: 'button', onclick: () => leaveTo(() => app.go('home', { flow: { worldId: skill.world.id } })) }, `Visit ${skill.world.title}`)) : null,
      related.length ? h('section', { class: 'hg-sec' }, h('h3', {}, 'Related tools'), h('div', { class: 'hg-related' }, ...related)) : null,
      h('section', { class: 'hg-sec', 'aria-label': 'How well it’s backed' },
        h('span', { class: 'hg-scope' }, `Evidence: ${skill.evidence.scope}`),
        h('p', { class: 'hg-p' }, skill.evidence.plain),
        moreBtn, moreBody),
      h('section', { class: 'hg-sec' }, h('h3', {}, 'Take care'),
        h('ul', { class: 'hg-care' }, ...skill.care.map((c) => h('li', {}, c))),
        h('button', { class: 'hg-link', type: 'button', onclick: () => openSupport(app) }, 'Need support now?')),
      endEl,
    ].filter(Boolean));
    detail = h('div', { class: `hg-detail${isReduced ? ' is-reduced' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, h('div', { class: 'hg-col' }, topBar, sheet));
    detail.__charms = charms;
    el.append(detail);
    head.style.visibility = 'hidden';
    field.setAttribute('aria-hidden', 'true');
    field.style.visibility = 'hidden';            // the plant names never ghost through behind the words
    // while a charm is open the Mallow steps out of sight, so nothing shows through behind the words
    if (!mallowHidden) { mallowHidden = true; world?.showMallow?.(false); }
    requestAnimationFrame(() => requestAnimationFrame(() => detail?.classList.add('is-in')));
    setTimeout(() => title.focus({ preventScroll: true }), 60);
    if (!layerToken) layerToken = app.pushLayer?.() || 0;
    stopLoop();
  }

  /**
   * instant: remove at once (no fade). keepLayer: keep the history entry (one
   * open charm replacing another); by default an instant close keeps it and a
   * normal close pops it. fromBack: Back already consumed the entry.
   */
  function closeDetail(instant = false, { fromBack = false, keepLayer = instant, refocus = !keepLayer } = {}) {
    if (!detail) return;
    const d = detail;
    detail = null;
    d.__charms?.forEach((c) => c.destroy());
    head.style.visibility = '';
    field.removeAttribute('aria-hidden');
    field.style.visibility = '';
    if (instant) d.remove();
    else { d.classList.remove('is-in'); setTimeout(() => d.remove(), 380); }
    if (!keepLayer && layerToken) { const t = layerToken; layerToken = 0; if (!fromBack) app.popLayer?.(t); }
    if (!keepLayer) {
      if (mallowHidden) { mallowHidden = false; world?.showMallow?.(true); }
      kick(); if (reduced()) draw(performance.now());
    }
    if (refocus && !left) {
      // back to where the person was: the plant that opened it (else the first plant, else Back)
      const target = plants.find((x) => x.id === openerId)?.btn || plants[0]?.btn || emptyEl?.querySelector('button') || head.querySelector('button');
      target?.focus?.({ preventScroll: true });
    }
  }

  function doForget(id, endEl, endKids) {
    const skill = getSkill(id);
    if (!forgetSkill(store, id) && gardenEntry(store, id)) {
      // the device refused the write: say so quietly, and keep the charm open (it is still in the garden)
      const msg = h('p', { class: 'hg-small', role: 'status', style: { margin: '0 0 12px' } }, 'This device couldn’t remove it just now, so it’s still in your garden. You could try again in a moment.');
      endEl?.replaceChildren(msg, ...(endKids?.().filter((x) => x.classList?.contains('hg-forget')) || []));
      endEl?.querySelector('.hg-forget')?.focus();
      return;
    }
    app.audio?.ui?.('close');
    closeDetail(false, { refocus: false });
    live.textContent = `${skill?.title || 'That tool'} has left your garden.`;
    // focus lands on the garden again once it has re-formed (never lost to the page)
    const settle = () => { layout(); (plants[0]?.btn || emptyEl?.querySelector('button') || head.querySelector('button'))?.focus?.({ preventScroll: true }); };
    const p = plants.find((x) => x.id === id);
    if (p && !reduced()) {
      p.btn?.classList.add('is-leaving');
      p.leaving = performance.now();
      setTimeout(() => { if (!left) settle(); }, 580);
    } else settle();
  }

  // ------------------------------------------------------- lifecycle --
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (!left) layout(); }, 120); };
  const onKey = (e) => {
    if (!detail) return;
    if (e.key === 'Escape') { closeDetail(); return; }
    if (e.key !== 'Tab') return;
    // the open charm is a dialog: Tab stays inside it
    const f = [...detail.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.getClientRects().length);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!detail.contains(a)) { e.preventDefault(); first.focus(); } else if (e.shiftKey && (a === first || a?.classList?.contains('hg-title'))) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  };
  const onVis = () => { if (!document.hidden) kick(); };

  const view = {
    el, title: 'Memory Garden',
    async enter() {
      // a lapsed plan keeps what was kept readable; with nothing kept, the garden is part of hushmallow Flow
      if (!ent.has('paid') && !(READ_ONLY_WHEN_LAPSED && gardenList(store).length)) { app.go('plans', { reason: 'garden' }, { replace: true }); return; }
      world.dim(true);
      world.showMallow(true);
      // the hills go between the realm and the Mallow, so the Mallow is never veiled by them
      const ml = world.layer;
      if (ml?.parentNode) ml.parentNode.insertBefore(bgCanvas, ml); else el.prepend(bgCanvas);
      world.setRealm('moonmilk-cove', { crossfadeMs: 1200 });
      world.setMallow(mallowId, { entrance: false, interactive: true }).then(() => { if (!left) { world.setStage('listening'); scheduleCorrect(3); } }).catch(() => {});
      addEventListener('resize', onResize);
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVis);
      // fonts first, so labels measure in their final face
      await import('../../ui/type.js').then((m) => m.fontsReady?.(['ui', 'story'], 700)).catch(() => {});
      if (left) return;
      layout();
      kick();
      if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__garden = { get plants() { return plants; }, openDetail, closeDetail, layout, get detail() { return detail; }, get mallow() { return { want: placeMallow.want, perch, body: world.bodyRect(), crest: placeMallow.want && crestY(placeMallow.want.xpx), seat: perch && [crestY(perch.left), crestY(perch.cx), crestY(perch.left + perch.width)] }; }, back: bgCanvas, front: canvas };
    },
    leave() {
      left = true;
      stopLoop();
      clearTimeout(resizeT); clearTimeout(corrT); clearTimeout(greetT);
      removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      detail?.__charms?.forEach((c) => c.destroy());
      layerToken = 0;
      bgCanvas.remove();
      if (mallowHidden) { mallowHidden = false; world.showMallow(true); }
      world.dim(false);
      if (window.__garden?.openDetail === openDetail) delete window.__garden;
    },
    get blockBack() {
      if (detail) return () => closeDetail(false, { fromBack: true });
      return null;
    },
  };
  return view;
}
