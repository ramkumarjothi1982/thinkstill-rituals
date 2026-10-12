// THE MEMORY GARDEN — the tools the person chose to keep, as living charms on
// a moonlit hillside. Each charm sways on a stem of light (brush a finger
// through the garden and they lean and spring back), fireflies drift, and
// the person's Mallow sits on the crest. Tap a charm to open it: what it is,
// one real-life example, how it goes, how it was found, Practise again
// (→ the Hushfold starts that world), related tools, where it comes from (the
// evidence label and the catalogue wording, apart from creative
// inspirations), care notes, and Forget this (with a confirm).
//
// Route 'garden', gated on hushmallow Flow ('paid' → plans otherwise). No
// scores, streaks or counts: it describes, it never nags. Only ids are stored
// (src/engine/garden.js); the charms are drawn from skill id + Mallow.
// params.focus = skillId: that charm has just arrived from the portal.

import { h, iconBtn } from '../ui.js';
import { MALLOWS } from '../../mallows/registry.js';
import { getSkill, EVIDENCE_NOTE, INSPIRATION_NOTE } from '../../hushfold/skills.js';
import { garden as gardenList, gardenEntry, practised, forgetSkill } from '../../engine/garden.js';
import { charmCanvas, charmPalette, drawCharm } from '../../hushfold/charm.js';
import { registry } from '../../hushfold/flow/registry.js';
import { openSupport } from './support.js';

const CSS = `
.hg { --hg-ff-ui: var(--ff-ui, "HM Manrope", system-ui, -apple-system, "Segoe UI", sans-serif); --hg-ff-voice: var(--ff-voice, "HM Nunito Sans", ui-rounded, system-ui, sans-serif); --hg-ff-story: var(--ff-story, "HM Fraunces", Georgia, "Times New Roman", serif); --hg-k: var(--type-scale, 1);
  position: absolute; inset: 0; pointer-events: none !important; color: var(--text-1, #f7f3ff); }
.hg.scene-enter { animation: hgFade 520ms cubic-bezier(.22,1,.36,1) both; transform: none; }
@keyframes hgFade { from { opacity: 0; } to { opacity: 1; } }
.hg .hg-ui { pointer-events: auto; }
.hg-canvas { position: fixed; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
.hg-head { position: fixed; z-index: 1; top: calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 12px); left: 20px; right: 20px; display: flex; align-items: flex-start; gap: 12px; pointer-events: none; }
.hg-head > .icon-btn { pointer-events: auto; flex: 0 0 auto; }
.hg-titles { min-width: 0; padding-top: 1px; }
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
  background: linear-gradient(180deg, rgba(9,7,26,.78), rgba(7,5,20,.9)); -webkit-backdrop-filter: blur(16px) saturate(1.1); backdrop-filter: blur(16px) saturate(1.1);
  opacity: 0; transition: opacity .38s cubic-bezier(.22,1,.36,1); }
.hg-detail.is-in { opacity: 1; }
.hg-col { position: relative; width: 100%; max-width: 560px; height: 100%; transform: translateY(18px); transition: transform .55s cubic-bezier(.2,.9,.25,1); }
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
.hg-chip:focus-visible, .hg-link:focus-visible, .hg-forget:focus-visible { outline: 2.5px solid #ffd98a; outline-offset: 3px; }
.hg-scope { display: inline-block; margin: 0 0 10px; padding: 6px 12px; border-radius: 999px; background: rgba(143,227,255,.1); border: 1px solid rgba(143,227,255,.32);
  font: var(--type-label, 600 calc(14px * var(--hg-k))/1.35 var(--hg-ff-ui)); color: #c9f2ff; }
.hg-sources { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 12px; }
.hg-sources li { padding: 12px 14px; border-radius: 16px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); }
.hg-sources .n { font: var(--type-row, 600 calc(16px * var(--hg-k))/1.3 var(--hg-ff-ui)); font-weight: 700; color: #f3efff; }
.hg-sources .g { font: var(--type-caption, 550 calc(13px * var(--hg-k))/1.4 var(--hg-ff-ui)); color: #b9b2dc; margin-top: 2px; }
.hg-sources q { display: block; margin-top: 8px; font: var(--type-body, 500 calc(17px * var(--hg-k))/1.5 var(--hg-ff-voice)); color: #dcd5f3; quotes: "“" "”"; }
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
  const reduced = () => prefs?.reducedMotion?.() ?? false;
  const lowStim = () => !!prefs?.get?.('lowStim');
  const mallowId = (MALLOWS[app.state?.homeMallow] && app.state.homeMallow) || (MALLOWS[prefs?.get?.('mallow')] && prefs.get('mallow')) || 'noomi';

  // ------------------------------------------------------------- DOM --
  const bgCanvas = h('canvas', { class: 'hg-canvas', 'aria-hidden': 'true' });
  const canvas = h('canvas', { class: 'hg-canvas', 'aria-hidden': 'true' });
  const titleEl = h('h1', {}, 'Memory Garden');
  const captionEl = h('p', {});
  const head = h('header', { class: 'hg-head' }, iconBtn('back', 'Back to the Hushfold', () => back()), h('div', { class: 'hg-titles' }, titleEl, captionEl));
  const field = h('div', { class: 'hg-field hg-ui', role: 'group', 'aria-label': 'Your kept tools' });
  const live = h('div', { class: 'hg-live', 'aria-live': 'polite' });
  const el = h('div', { class: 'hg', 'data-garden': 'root' }, bgCanvas, canvas, head, field, live);
  let emptyEl = null, detail = null, layerToken = 0;

  // ----------------------------------------------------------- state --
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, crest = 0, bg = null, raf = 0, left = false, lastT = 0, t0 = performance.now();
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
    const mallowH = clamp(Math.min(W, H) * 0.15, 54, 92);
    const bottom = H - 22 - safeBottom();
    const minCrest = hb + mallowH + 12;
    let M = null;
    if (n) {
      // the garden takes the room it needs; the rest is sky
      M = metrics(n, Math.max(160, bottom - (minCrest + 24)));
      crest = clamp(bottom - M.rowH * M.rows - 54, minCrest, Math.max(minCrest, H * 0.5));
      renderEmpty(false);
    } else {
      renderEmpty(true);
      const eh = emptyEl.offsetHeight || 220;
      crest = clamp(H * 0.5, minCrest + 28, Math.max(minCrest + 28, bottom - eh - 64));
      emptyEl.style.top = `${Math.round(crest + 52)}px`;
    }
    // the hill's crest: a gentle curve, lower at the edges
    for (let i = 0; i <= 64; i++) {
      const x = (i / 64) * W, u = i / 64;
      const y = crest + 22 * (2 * u - 1) ** 2 - 10 * Math.sin(u * Math.PI * 1.2 + 0.4) + 6 * Math.sin(u * 7.1);
      crestPts[i * 2] = x; crestPts[i * 2 + 1] = y;
    }
    field.style.top = `${Math.round(crest - 10)}px`;
    captionEl.textContent = n ? 'Tap a charm to open it again.' : 'Kept only on this phone.';
    buildPlants(items, M, bottom);
    buildBackground();
    buildAmbient();
    placeMallow(mallowH);
    draw(performance.now());
  }

  /** How the plants are arranged for n tools in a region of height regionH. */
  function metrics(n, regionH) {
    const usable = Math.min(W - 32, 1100);
    const perRow = W < 560 ? 3 : W < 800 ? 4 : W < 1100 ? 5 : 6;
    const rows = n <= 1 ? 1 : Math.ceil(n / perRow);
    const base = Math.floor(n / rows), extra = n % rows;
    const counts = Array.from({ length: rows }, (_, r) => base + (r >= rows - extra ? 1 : 0));
    const hero = n === 1;
    const labelH = hero ? 132 : 46;
    const maxCount = Math.max(1, ...counts);
    const cellW = usable / Math.max(maxCount, hero ? 1 : 2.4);
    const sizeFor = (sc) => (hero ? clamp(Math.min(W * 0.36, regionH * 0.34), 104, 160) : clamp(Math.min(cellW * 0.68, (regionH / rows) * 0.46), 46, 124) * sc);
    const rowH = Math.min(regionH / rows, (hero ? 2.05 : 2.25) * sizeFor(1) + labelH);
    return { usable, rows, counts, hero, labelH, maxCount, cellW, sizeFor, rowH };
  }

  // does a label fit in two lines at the label size? (else its short name)
  let measureG = null;
  function fitsTwoLines(text, maxW) {
    measureG ||= document.createElement('canvas').getContext('2d');
    const k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--type-scale')) || 1;
    measureG.font = `600 ${14 * k}px ${getComputedStyle(document.documentElement).getPropertyValue('--ff-ui') || 'system-ui'}`;
    let lines = 1, w = 0;
    const space = measureG.measureText(' ').width;
    for (const word of text.split(' ')) {
      const ww = measureG.measureText(word).width;
      if (w && w + space + ww > maxW) { lines++; w = ww; } else w += (w ? space : 0) + ww;
      if (ww > maxW) return false;
    }
    return lines <= 2;
  }

  function buildPlants(items, M, bottom) {
    const n = items.length;
    const old = new Map(plants.map((p) => [p.id, p]));
    field.replaceChildren();
    plants = [];
    if (!n) return;
    const top = crest + 24;
    const regionH = Math.max(160, bottom - top);
    const { usable, rows, counts, hero, labelH, maxCount, sizeFor, rowH } = M;
    let k = 0;
    const blockTop = top + Math.max(0, regionH - rowH * rows) * (hero ? 0.42 : 0.36);
    for (let r = 0; r < rows; r++) {
      const sc = rows === 1 ? 1 : lerp(0.84, 1, r / (rows - 1));
      const size = sizeFor(sc);
      const count = counts[r];
      const cell = usable / count;
      const rowBottom = blockTop + rowH * (r + 1);
      for (let i = 0; i < count; i++, k++) {
        const { entry, skill } = items[k];
        const jit = hash01(skill.id);
        const stagger = rows > 1 && count === maxCount && maxCount > 1 ? (r % 2 ? 0.08 : -0.08) * cell : 0;
        const cx = clamp((W - usable) / 2 + cell * (i + 0.5) + stagger + (jit - 0.5) * Math.min(14, cell * 0.12), 24 + size * 0.5, W - 24 - size * 0.5);
        const gy = rowBottom - labelH - (jit * 8);
        const stem = clamp(rowH - labelH - size - 14, size * 0.3, size * (hero ? 0.62 : 0.8));
        const cy = gy - stem - size * 0.48;
        const prev = old.get(skill.id);
        const P = charmPalette(skill.id, entry.mallow || skill.mallow);
        const p = {
          id: skill.id, skill, entry, cx, cy, gy, size, stem, P,
          phase: jit * 6.28, swayA: 0.035 + jit * 0.02, swayW: (Math.PI * 2) / (5.2 + jit * 2.2),
          th: prev?.th || 0, om: prev?.om || 0, poke: prev?.poke || -9, arrive: prev?.arrive ?? -9, fade: 1,
          glintAt: 2 + jit * 6,
        };
        const bw = Math.min(cell - 6, Math.max(size * 1.6, 120), 240);
        const btnTop = cy - size * 0.62;
        const btn = h('button', {
          class: `hg-plant${hero ? ' is-hero' : ''}`, type: 'button',
          'aria-label': `${skill.title}. ${skill.essence}`,
          style: { left: `${Math.round(cx - bw / 2)}px`, top: `${Math.round(btnTop - (crest - 10))}px`, width: `${Math.round(bw)}px`, height: `${Math.round(gy + labelH - btnTop)}px` },
          onclick: () => tapPlant(p),
        }, h('span', { class: 'txt', style: { top: `${Math.round(p.gy - btnTop + 10)}px` } },
          h('span', { class: 'lbl' }, hero || fitsTwoLines(skill.title, bw - 8) ? skill.title : skill.short || skill.title),
          hero ? h('span', { class: 'ess' }, skill.essence) : null));
        p.btn = btn;
        field.append(btn);
        plants.push(p);
      }
    }
    if (params.focus && !reduced()) {
      const p = plants.find((x) => x.id === params.focus);
      if (p && p.arrive < 0) p.arrive = (performance.now() - t0) / 1000 + 0.35;
    }
  }

  // the static backdrop (veil, hills, moonlight, ground flowers) is painted once per layout on its own canvas
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

  function placeMallow(mh) {
    if (!world) return;
    const Hl = Math.min(H * 0.56, 470), Wl = Math.min(W * 0.86, 430);
    const scale = clamp(mh / (0.66 * Hl), 0.12, 0.6);
    const n = plants.length;
    const xpx = n === 0 ? W * 0.5 + Math.min(110, W * 0.26) : W - Math.max(52, Math.min(W * 0.16, 120));
    const ypx = crestY(xpx) + 4 - 0.38 * Hl * scale;
    world.place({ x: (clamp(xpx, Wl * scale * 0.4, W - Wl * scale * 0.4) / W) * 100, y: (ypx / H) * 100, scale, calm: true });
    placeMallow.want = { xpx, bottom: crestY(xpx) + 4 };
  }
  function correctMallow() {
    // one correction from the rig's true body box (the layer heuristic is approximate)
    if (left || !world?.bodyRect || !placeMallow.want) return;
    const r = world.bodyRect();
    if (!r || !r.height) return;
    const dy = placeMallow.want.bottom - r.bottom;
    if (Math.abs(dy) < 2) return;
    const layer = world.layer;
    const cur = parseFloat(layer?.style.getPropertyValue('--my')) || 50;
    const sc = parseFloat(layer?.style.getPropertyValue('--ms')) || 0.3;
    const cx = parseFloat(layer?.style.getPropertyValue('--mx')) || 80;
    world.place({ x: cx, y: cur + (dy / H) * 100, scale: sc, calm: true });
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
      if (!still) {
        // a soft spring: brushed by a finger, it leans and comes back
        const k = 20, c = 2.2;
        p.om += (-k * p.th - c * p.om) * dt;
        p.th = clamp(p.th + p.om * dt, -0.4, 0.4);
      }
      const pose = plantPose(p, t);
      const sz = p.size;
      const pool = glowSprite(p.P.glow);
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

  function loop(now) {
    raf = 0;
    if (left) return;
    if (!document.hidden && !detail) draw(now);
    if (!reduced()) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && !left && !reduced()) raf = requestAnimationFrame(loop); }

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
    if (!reduced()) p.om += (p.cx < W / 2 ? 1 : -1) * 0.6;
    app.audio?.ui?.('open');
    app.haptic?.('light');
    if (reduced()) openDetail(p.id); else setTimeout(() => { if (!left) openDetail(p.id); }, 200);
  }

  // ----------------------------------------------------------- detail --
  function practiseTarget(skill) {
    if (skill.practise?.route === 'angle') return ent.has('ultra') ? { go: () => app.go('angle'), label: 'Practise again' } : { note: 'You practise this one in Another Angle, part of hushmallow Beyond.' };
    if (ent.has('paid') && isPlayableWorld(skill.world.id)) return { go: () => app.go('home', { flow: { worldId: skill.world.id } }), label: 'Practise again' };
    return { note: 'Its world isn’t open right now, but the “Try it” above works anywhere.' };
  }

  function openDetail(id) {
    const skill = getSkill(id);
    if (!skill) return;
    const entry = gardenEntry(store, id);
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

    const related = skill.related.map(getSkill).filter(Boolean).map((r) => {
      const has = !!gardenEntry(store, r.id);
      const away = !has && isPlayableWorld(r.world.id);
      if (!has && !away) return null;
      const c = charmCanvas({ skillId: r.id, mallow: has ? gardenEntry(store, r.id).mallow || r.mallow : r.mallow, box: 48, reducedMotion: isReduced, bob: false });
      if (!has) c.el.style.opacity = '0.55';
      charms.push(c);
      return h('button', { class: `hg-chip${away ? ' is-away' : ''}`, type: 'button', onclick: () => openDetail(r.id) },
        c.el, h('span', {}, r.title, away ? h('small', {}, `Waiting in ${r.world.title}`) : null));
    }).filter(Boolean);

    const sources = h('ul', { class: 'hg-sources' }, ...skill.sources.map((s) => h('li', {},
      h('div', { class: 'n' }, s.skill), h('div', { class: 'g' }, `${s.group} · ${s.scope}`), h('q', {}, s.insight), h('div', { class: 'g', style: { marginTop: '6px' } }, `Source: ${s.ref}`))));

    let endEl;
    const forget = () => {
      endEl.replaceChildren(h('div', { class: 'hg-confirm', role: 'group', 'aria-label': 'Forget this tool?' },
        h('p', {}, `Forget “${skill.title}”? It will leave your garden. You can keep it again whenever you come across it.`),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn', type: 'button', onclick: () => { endEl.replaceChildren(...endKids()); endEl.querySelector('.hg-forget')?.focus(); } }, 'Keep it'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => doForget(id) }, 'Forget'))));
      endEl.querySelector('.btn')?.focus();
    };
    const endKids = () => [
      entry ? h('p', { class: 'hg-small', style: { margin: '0 0 12px' } }, `Kept on ${when(entry.savedAt)}. It lives only on this phone.`) : null,
      entry ? h('button', { class: 'hg-forget', type: 'button', onclick: forget }, 'Forget this') : null,
    ].filter(Boolean);
    endEl = h('div', { class: 'hg-end' }, ...endKids());

    const topBar = h('div', { class: 'hg-sheet-top' }, iconBtn('back', 'Back to the garden', () => closeDetail()), h('span', { class: 'where' }, 'Memory Garden'));
    sheet.append(...[
      hero.el,
      h('p', { class: 'hg-over' }, entry ? `From ${skill.world.title}` : 'Not in your garden yet'),
      title,
      h('p', { class: 'hg-essence' }, skill.essence),
      h('section', { class: 'hg-sec', 'aria-label': 'What it is' }, h('p', { class: 'hg-p' }, skill.explanation),
        h('div', { class: 'hg-try' }, h('p', {}, h('b', {}, `${tryLead}:`), ` ${tryRest.join(': ')}`))),
      h('section', { class: 'hg-sec' }, h('h3', {}, 'How it goes'), h('ol', { class: 'hg-steps' }, ...skill.steps.map((s) => h('li', {}, s)))),
      entry && skill.found ? h('section', { class: 'hg-sec' }, h('h3', {}, 'How you found it'), h('p', { class: 'hg-found' }, skill.found)) : null,
      target?.go ? h('div', { class: 'hg-practise' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { practised(store, id); target.go(); } }, target.label),
        h('p', { class: 'hg-note' }, `In ${skill.world.title}. Stay as long as you like.`)) : null,
      target?.note ? h('p', { class: 'hg-note', style: { marginTop: '22px' } }, target.note) : null,
      !entry && isPlayableWorld(skill.world.id) && ent.has('paid') ? h('div', { class: 'hg-practise' }, h('button', { class: 'btn primary', type: 'button', onclick: () => app.go('home', { flow: { worldId: skill.world.id } }) }, `Visit ${skill.world.title}`)) : null,
      related.length ? h('section', { class: 'hg-sec' }, h('h3', {}, 'Related tools'), h('div', { class: 'hg-related' }, ...related)) : null,
      h('section', { class: 'hg-sec' }, h('h3', {}, 'Where this comes from'),
        h('span', { class: 'hg-scope' }, `Evidence: ${skill.evidence.scope}`),
        h('p', { class: 'hg-p' }, skill.evidence.plain),
        sources,
        h('p', { class: 'hg-small' }, `Also inspired by: ${skill.inspiredBy.join(', ')}. ${INSPIRATION_NOTE}`),
        h('p', { class: 'hg-small' }, EVIDENCE_NOTE)),
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
    requestAnimationFrame(() => requestAnimationFrame(() => detail?.classList.add('is-in')));
    setTimeout(() => title.focus({ preventScroll: true }), 60);
    if (!layerToken) layerToken = app.pushLayer?.() || 0;
  }

  function closeDetail(instant = false, { fromBack = false } = {}) {
    if (!detail) return;
    const d = detail;
    detail = null;
    d.__charms?.forEach((c) => c.destroy());
    head.style.visibility = '';
    field.removeAttribute('aria-hidden');
    if (instant) d.remove();
    else { d.classList.remove('is-in'); setTimeout(() => d.remove(), 380); }
    if (!instant && layerToken) { const t = layerToken; layerToken = 0; if (!fromBack) app.popLayer?.(t); }
    if (!instant) { kick(); if (reduced()) draw(performance.now()); }
  }

  function doForget(id) {
    const skill = getSkill(id);
    forgetSkill(store, id);
    app.audio?.ui?.('close');
    closeDetail();
    live.textContent = `${skill?.title || 'That tool'} has left your garden.`;
    // focus lands on the garden again once it has re-formed (never lost to the page)
    const settle = () => { layout(); (plants[0]?.btn || emptyEl?.querySelector('button') || head.querySelector('button'))?.focus?.({ preventScroll: true }); };
    const p = plants.find((x) => x.id === id);
    if (p && !reduced()) {
      p.btn?.classList.add('is-leaving');
      const start = performance.now();
      const fade = () => { if (left) return; p.fade = Math.max(0, 1 - (performance.now() - start) / 550); if (p.fade > 0) requestAnimationFrame(fade); else settle(); };
      requestAnimationFrame(fade);
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
      if (!ent.has('paid')) { app.go('plans', { reason: 'garden' }, { replace: true }); return; }
      world.dim(true);
      world.showMallow(true);
      world.setRealm('moonmilk-cove', { crossfadeMs: 1200 });
      world.setMallow(mallowId, { entrance: false, interactive: true }).then(() => { if (!left) { world.setStage('listening'); setTimeout(correctMallow, 820); } }).catch(() => {});
      addEventListener('resize', onResize);
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVis);
      // fonts first, so labels measure in their final face
      await import('../../ui/type.js').then((m) => m.fontsReady?.(['ui', 'story'], 700)).catch(() => {});
      if (left) return;
      layout();
      kick();
      if (params.focus) {
        const s = getSkill(params.focus);
        if (s) live.textContent = `${s.title} is in your garden now.`;
      }
      if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__garden = { get plants() { return plants; }, openDetail, closeDetail, layout, get detail() { return detail; } };
    },
    leave() {
      left = true;
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(resizeT);
      removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      detail?.__charms?.forEach((c) => c.destroy());
      layerToken = 0;
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
