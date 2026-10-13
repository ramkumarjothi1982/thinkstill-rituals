// hushmallow typography — the JS side of src/ui/type.css.
//
// Three self-hosted families, each with one job:
//   voice  "HM Nunito Sans"  warm, rounded: Mallows, subtitles, thoughts, body
//   ui     "HM Manrope"      precise: controls, settings, labels, numbers
//   story  "HM Fraunces"     cinematic titles and discoveries (DOM only,
//                            at most one element per screen)
// The 'HM ' prefix means a locally installed Nunito Sans / Manrope can never
// stand in for ours. Every token has an explicit line-height.
//
// DOM:    class="t-dialogue"  or  h('p', { style: type('caption') }, …)
// Canvas: g.font = canvasFont('thought', s)   (weights rounded to 100s,
//         because Safari's canvas font parser rejects 560 / 650)
import { h } from '../app/ui.js';
import { BRAND, brandName, logoSrcset, logoUrl } from '../brand.js';

export const CANVAS_FONT = Object.freeze({
  voice: '"HM Nunito Sans", "HM Nunito Sans Fallback", ui-rounded, system-ui, sans-serif',
  ui: '"HM Manrope", "HM Manrope Fallback", system-ui, -apple-system, "Segoe UI", sans-serif',
  story: '"HM Fraunces", "HM Fraunces Fallback", Georgia, "Times New Roman", serif',
});

// size: px, or [min, at 375px wide, at 430px wide] (fluid between, clamped).
// The CSS block in type.css is generated from this table (tests compare them).
export const TYPE = Object.freeze({
  // STORY — Fraunces, optical sizing on, balanced, at most two lines
  cinematic: { ff: 'story', size: [28, 30, 36], weight: 560, lh: 1.08, ls: '-0.015em' },  // chapter titles, the plans invitation
  world: { ff: 'story', size: [24, 25, 30], weight: 540, lh: 1.12, ls: '-0.01em' },       // world / ritual names and introductions
  discovery: { ff: 'story', size: [22, 24, 28], weight: 500, lh: 1.18, ls: '-0.005em' },  // the insight line of a discovery
  reward: { ff: 'story', size: [24, 26, 30], weight: 600, lh: 1.12, ls: '-0.01em' },      // Memory Garden skill title
  // VOICE — Nunito Sans
  dialogue: { ff: 'voice', size: [19, 20, 22], weight: 650, lh: 1.32, ls: '0em' },        // Mallow lines (bubbles)
  subtitle: { ff: 'voice', size: [19, 19.5, 21], weight: 600, lh: 1.36, ls: '0.004em' },  // cinematic subtitles
  thought: { ff: 'voice', size: [17, 18, 20], weight: 700, lh: 1.25, ls: '0em' },         // the person's words on Thought / Belief Mallows
  quote: { ff: 'voice', size: 19, weight: 600, lh: 1.45, ls: '0em' },                     // the person's full text
  body: { ff: 'voice', size: 17, weight: 500, lh: 1.5, ls: '0em' },                       // ledes, card copy, plan benefits, support copy
  howto: { ff: 'voice', size: 17, weight: 550, lh: 1.5, ls: '0em' },                      // How to play steps
  lead: { ff: 'voice', size: 17, weight: 650, lh: 1.5, ls: '0em' },                       // How to play lead line, emphasised prompts
  entry: { ff: 'voice', size: 18, weight: 500, lh: 1.4, ls: '0em' },                      // the text field where feelings are typed
  // UI — Manrope (x-height 0.54em: it reads ~11% larger than Nunito at the same px)
  'screen-title': { ff: 'ui', size: 28, weight: 700, lh: 1.12, ls: '-0.02em' },           // Settings, Library, Your journey
  heading: { ff: 'ui', size: 20, weight: 700, lh: 1.2, ls: '-0.01em' },                   // sheet titles, card titles
  button: { ff: 'ui', size: 16, weight: 700, lh: 1.15, ls: '0.005em' },
  control: { ff: 'ui', size: 15, weight: 650, lh: 1.2, ls: '0em' },                       // chips, choices, segmented controls
  input: { ff: 'ui', size: 16, weight: 500, lh: 1.3, ls: '0em' },                         // ≥16px or iOS Safari zooms on focus
  row: { ff: 'ui', size: 16, weight: 600, lh: 1.3, ls: '0em' },                           // list rows, settings rows
  label: { ff: 'ui', size: 14, weight: 600, lh: 1.35, ls: '0em' },                        // reasons, toasts, legends
  caption: { ff: 'ui', size: 13, weight: 550, lh: 1.4, ls: '0.003em' },                   // notes — the floor for reading text
  overline: { ff: 'ui', size: 13, weight: 750, lh: 1.25, ls: '0.12em', upper: true },     // eyebrows (never the brand: see brandMark)
  badge: { ff: 'ui', size: 12, weight: 800, lh: 1, ls: '0.1em', upper: true },            // decorative only: BEYOND, NEW
  stat: { ff: 'ui', size: 28, weight: 800, lh: 1, ls: '-0.02em', nums: true },            // journey tiles
});

const baseSize = (t) => (Array.isArray(t.size) ? t.size[1] : t.size);
const canvasWeight = (w) => Math.min(900, Math.max(100, Math.round(w / 100) * 100));

/** Canvas font string for a token: canvasFont('thought', 1.5) → '700 27px "HM Nunito Sans", …'.
 *  `scale` multiplies the token's phone size (pass the stage scale / DPR factor).
 *  The story family falls back to voice: Fraunces has no dependable optical
 *  size in canvas and would draw its 9pt text cut. */
export function canvasFont(token, scale = 1, { weight } = {}) {
  const t = TYPE[token] || TYPE.body;
  const ff = t.ff === 'story' ? 'voice' : t.ff;
  const px = Math.round(baseSize(t) * scale * 10) / 10;
  return `${canvasWeight(weight ?? t.weight)} ${px}px ${CANVAS_FONT[ff]}`;
}

/** Canvas font at an explicit pixel size: canvasFontPx(22, 700) (voice by default). */
export function canvasFontPx(px, weight = 600, family = 'voice') {
  return `${canvasWeight(weight)} ${Math.round(px * 10) / 10}px ${CANVAS_FONT[family === 'story' ? 'voice' : family] || CANVAS_FONT.voice}`;
}

/** Inline style object for a token (longhands, so later keys can override):
 *  h('p', { style: type('caption', { color: 'var(--text-3)' }) }, …) */
export function type(token, extra) {
  const k = TYPE[token] ? token : 'body';
  const t = TYPE[k];
  const s = {
    fontFamily: `var(--ff-${t.ff})`,
    fontSize: `var(--type-${k}-size)`,
    fontWeight: `var(--type-${k}-weight)`,
    lineHeight: `var(--type-${k}-lh)`,
    letterSpacing: `var(--type-${k}-ls)`,
  };
  if (t.upper) s.textTransform = 'uppercase';
  if (t.nums) s.fontVariantNumeric = 'tabular-nums';
  if (t.ff === 'story') { s.fontOpticalSizing = 'auto'; s.textWrap = 'balance'; }
  return extra ? Object.assign(s, extra) : s;
}

// a weight from each file is enough: the files are variable, one per family
const PROBE = { voice: '600 20px "HM Nunito Sans"', ui: '600 16px "HM Manrope"', story: '560 30px "HM Fraunces"' };

/** Resolves once the families' files are loaded, or after timeoutMs.
 *  Resolves true when every group loaded in time, false otherwise (never rejects). */
export function fontsReady(groups = ['voice', 'ui'], timeoutMs = 1200) {
  const fonts = typeof document !== 'undefined' ? document.fonts : null;
  if (!fonts?.load) return Promise.resolve(false);
  const loads = groups.filter((g) => PROBE[g]).map((g) => fonts.load(PROBE[g]).then((faces) => faces.length > 0, () => false));
  const all = Promise.all(loads).then((ok) => ok.every(Boolean));
  return Promise.race([all, new Promise((r) => setTimeout(() => r(false), timeoutMs))]);
}

/** Scale every voice / UI token (story tokens grow half as much): 1 | 1.12 | 1.25.
 *  Set on <html>, where the tokens are computed. */
export function setTextScale(k = 1) {
  if (typeof document === 'undefined') return;
  const v = Math.min(1.4, Math.max(1, Number(k) || 1));
  const root = document.documentElement;
  if (v === 1) root.style.removeProperty('--type-scale');
  else root.style.setProperty('--type-scale', String(v));
  // for layout rules that change shape at large sizes (CSS can't compare a custom property)
  if (v > 1.12) root.dataset.textScale = 'large'; else delete root.dataset.textScale;
}

/** The brand as text: always lowercase, even inside an uppercase style. */
export function brandMark(text = brandName, attrs = {}) {
  return h('span', { class: 'brand-name', translate: 'no', ...attrs }, text);
}

/** Plain copy with every "hushmallow" in it marked as the brand (brandMark). For h(…, ...withBrand(text)). */
export function withBrand(text) {
  return String(text).split(new RegExp(`\\b(${brandName})\\b`)).filter(Boolean).map((part) => (part === brandName ? brandMark(part) : part));
}

/** The approved logo artwork. tone 'light' for dark grounds, 'ink' for light.
 *  width: px number or any CSS length; the attributes reserve the 1540×289
 *  aspect ratio so nothing shifts when it loads. `sizes` (for srcset) is the
 *  width itself unless given: lengths such as min(54vw, 216px) are valid there. */
export function logoImg({ tone = 'light', width = 220, sizes, alt = brandName, className = '', lazy = false } = {}) {
  const w = typeof width === 'number' ? `${width}px` : width;
  const sz = sizes || (/^(min|max|clamp|calc)\(|^[\d.]+(px|vw|em|rem)$/.test(w) ? w : '280px');
  return h('img', {
    class: `hm-logo hm-logo-${tone === 'ink' ? 'ink' : 'light'} ${className}`.trim(),
    src: tone === 'ink' ? BRAND.logo.ink : BRAND.logo.light,
    srcset: logoSrcset(tone), sizes: sz,
    width: String(BRAND.logo.w), height: String(BRAND.logo.h),
    alt, decoding: 'async', loading: lazy ? 'lazy' : null, draggable: 'false',
    style: { width: w, height: 'auto' },
  });
}

/** Loads the logo for canvas drawing (share cards). Resolves the decoded image, or null. */
export function loadLogo(tone = 'light', width = 720) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  const img = new Image();
  img.decoding = 'async';
  img.src = logoUrl(tone, width > 720 ? 960 : width > 480 ? 720 : width > 360 ? 480 : 360);
  return img.decode().then(() => img, () => null);
}

/** Keep a button's label on one line: while it would wrap or clip, swap in
 *  the next shorter wording. Give the button the .fit-one class (white-space:
 *  nowrap) so overflow can be measured. The last argument may be
 *  { target } — the element whose text changes (default: the button). Run it
 *  again once the web fonts have swapped in; it never goes back to longer words. */
export function fitLabel(btn, ...shorter) {
  const opts = shorter.length && typeof shorter[shorter.length - 1] === 'object' ? shorter.pop() : {};
  const target = opts.target || btn;
  for (const t of shorter) {
    if (!btn || !(btn.scrollWidth > btn.clientWidth)) return;
    target.textContent = t;
  }
}
