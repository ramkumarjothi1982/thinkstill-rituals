// Cinematic subtitles for the Hushfold.
//
// One short line at a time, softly revealed, held long enough to read
// (clamp(1400 + 55·chars, 2400, 7000) ms ÷ speed), with a natural pause between
// lines. Discoveries (hold) stay until the person acknowledges them. The band
// is placed in the free space between the top bar and the dock, never over
// the Mallow's body or any Thought Mallow (avoid()), bottom-aligned when it
// sits above them so the line reads as theirs. The root never takes a touch,
// so the person keeps squeezing while lines show; only the small ⏸ ↺ ⏭ pill
// (plus speed) and reply chips are touchable.
//
// Legibility: over a bright realm the soft scrim behind the line deepens.
// Once per line the backdrop under the band is sampled (backdrop() canvases,
// drawn into a tiny canvas) and the scrim's opacity is set so white text
// keeps ≥4.5:1 against the brightest tenth of what is behind it.
//
// createSubtitles({root, prefs, avoid, bounds, reducedMotion, backdrop, brightHint, onControl, onBand}) →
//   { say(lines, {who, hold, id, kind:'dialogue'|'discovery'|'title', colour, interrupt, first}) → Promise<boolean>,
//     choice(prompt, [{label, value, primary, onPick}], {who, timeoutMs, transient, focus, waitHidden}) → Promise<value|null>,
//     pause, resume, replay, skip, setSpeed, clear({keepHeld, keep}), drop(match), suspend, unsuspend, layout, destroy,
//     get busy, get holding, get paused, get suspended, get speed, el }
// suspend(): while the person types, nothing shows; a held discovery or a
// choice waits (parked) and comes back on unsuspend(); passing chatter is dropped.
// A choice with `focus` takes the keyboard focus to its first chip when it shows (never out of a text field), so
// keyboard and screen-reader users land on it; with `waitHidden` its timeout waits while the page is hidden (WCAG 2.2.1:
// the person who looked away comes back to the same choice, with at least HIDDEN_BACK_MS still to answer it).

import { h } from '../app/ui.js';
import { hfIcon } from './icons.js';

export const SUBTITLE_SPEEDS = Object.freeze([0.75, 1, 1.25, 1.5]);
export const normaliseSpeed = (s) => (SUBTITLE_SPEEDS.includes(+s) ? +s : 1);
const OUT_MS = 420;   // fade out
const GAP_MS = 220;   // the breath between two lines
export const HIDDEN_BACK_MS = 15000;   // a choice that waited while the page was hidden: at least this long once it is seen again

/** How long a line stays on screen, in ms. */
export function readingMs(text, speed = 1) {
  const n = String(text ?? '').length;
  return Math.round(Math.min(7000, Math.max(2400, 1400 + 55 * n)) / normaliseSpeed(speed));
}

/**
 * Where to put a block of height `need` inside bounds {top, bottom}, keeping
 * clear of `blocks` ([{top, bottom}] in viewport px, already padded by the
 * caller or by `gap`). Prefers the highest band that fits; a band that ends
 * at a block is bottom-aligned (close above it), the last band top-aligned.
 * → { y, fits, band:{top,bottom}|null }   (pure; unit-tested)
 */
export function placeBand(bounds, blocks, need, { gap = 12 } = {}) {
  const wide = placeBandAt(bounds, blocks, need, gap);
  if (wide.fits || gap <= 6) return wide;
  const tight = placeBandAt(bounds, blocks, need, 6);   // small screens: a little closer, rather than on top of something
  return tight.fits ? tight : wide;
}
/** Is the band [y, y + need] inside bounds {top, bottom} and clear of every block (± gap)? (pure; unit-tested) */
export function bandFree(bounds, blocks, y, need, gap = 6) {
  if (!Number.isFinite(y) || y < bounds.top - 0.5 || y + need > bounds.bottom + 0.5) return false;
  for (const b of blocks || []) {
    if (!b) continue;
    const t = b.top ?? b.y, bt = b.bottom ?? (b.y + (b.h ?? b.height ?? 0));
    if (!(bt > t)) continue;
    if (t - gap < y + need && bt + gap > y) return false;
  }
  return true;
}
/** A block's horizontal span [left, right] (DOMRect-like or the director's {x, w}). */
function horizOf(b) {
  if (b.left != null) return [b.left, b.right ?? b.left + (b.width ?? 0)];
  return [b.x ?? 0, (b.x ?? 0) + (b.w ?? b.width ?? 0)];
}
function placeBandAt(bounds, blocks, need, gap) {
  const top = bounds.top, bottom = bounds.bottom;
  // DOMRect-like {top, bottom} or {x, y, w, h} (the Hushflow director's shape)
  const spans = (blocks || []).map((b) => (b && b.top == null && b.y != null ? { top: b.y, bottom: b.y + (b.h ?? b.height ?? 0) } : b))
    .filter((b) => b && b.bottom > b.top)
    .map((b) => [b.top - gap, b.bottom + gap]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]); else merged.push([...s]);
  }
  const free = [];
  let y = top;
  for (const [a, b] of merged) {
    if (a > y) free.push({ top: y, bottom: Math.min(a, bottom), above: true });
    y = Math.max(y, b);
    if (y >= bottom) break;
  }
  if (y < bottom) free.push({ top: y, bottom, above: false });
  const fitting = free.filter((f) => f.bottom - f.top >= need);
  const pick = fitting[0] || free.slice().sort((p, q) => (q.bottom - q.top) - (p.bottom - p.top))[0];
  if (!pick) return { y: top, fits: false, band: null };
  const fits = fitting.length > 0;
  // (nothing fits: the largest band, but never past the bottom bound — the dock is below it — while the bounds hold it)
  const yy = Math.min(pick.above ? pick.bottom - need : pick.top, fits ? Infinity : bottom - need);
  return { y: Math.max(top, Math.round(yy)), fits, band: { top: pick.top, bottom: pick.bottom } };
}

// ------------------------------------------------------------ contrast --
const SCRIM_RGB = [9, 6, 28];
const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
/** Relative luminance (WCAG) of an sRGB colour (0–255 channels). */
export function luminance(r, g, b) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
/** WCAG contrast ratio of two luminances. */
export const contrastRatio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export const SCRIM_MIN = 0.5, SCRIM_MAX = 0.88;
/**
 * The scrim opacity that keeps white text (#fbf8ff) at ≥ `target`:1 over a
 * backdrop pixel [r,g,b] (the browser blends in sRGB). `cover` is how much of
 * the scrim reaches the edge of the glyphs (its feathered rim). Pure; tested.
 */
export function scrimFor([r, g, b], { target = 5.2, cover = 0.86 } = {}) {
  const text = luminance(251, 248, 255);
  for (let a = SCRIM_MIN; a <= SCRIM_MAX + 1e-9; a += 0.02) {
    const k = a * cover;
    const bl = luminance(r + (SCRIM_RGB[0] - r) * k, g + (SCRIM_RGB[1] - g) * k, b + (SCRIM_RGB[2] - b) * k);
    if (contrastRatio(text, bl) >= target) return Math.round(a * 100) / 100;
  }
  return SCRIM_MAX;
}
/** The 95th-percentile pixel (by luminance) in RGBA data → [r, g, b]. */
export function brightPixel(data) {
  const n = data.length >> 2;
  if (!n) return [0, 0, 0];
  const idx = new Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  idx.sort((p, q) => L[p] - L[q]);
  const k = idx[Math.min(n - 1, Math.floor(n * 0.95))] * 4;   // the brightest 5 % (a moon behind one word counts)
  return [data[k], data[k + 1], data[k + 2]];
}
/**
 * A bright spot behind the scrim (the daytime sun): where it is in the sampled box and how big, so the scrim is
 * deepened there and the spot never shows through the dark as a muddy blob. data: RGBA, cols × rows cells over the box.
 * → { x, y (0…1 of the box), r (0…1 of its width), a (the scrim's alpha over it) } or null (no spot much brighter than
 * the rest). Pure; unit-tested.
 */
export function hotSpot(data, cols = 48, rows = 12) {
  const n = cols * rows;
  if (!data || data.length < n * 4) return null;
  const L = new Float32Array(n);
  let sum = 0, max = 0;
  for (let i = 0; i < n; i++) { L[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]); sum += L[i]; max = Math.max(max, L[i]); }
  const mean = sum / n;
  // (a spot: the brightest there is, bright in itself and well over the rest — a white cloud band across the box is not one)
  if (max < 0.75) return null;
  const cut = Math.max(0.6, mean + 0.2, max - 0.15);
  let w = 0, cx = 0, cy = 0, hot = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const q = L[j * cols + i] - cut;
    if (q <= 0) continue;
    hot++; w += q; cx += q * (i + 0.5); cy += q * (j + 0.5);
  }
  if (!hot || hot > n * 0.35) return null;
  cx /= w; cy /= w;
  // its size: how far its light spreads round the centre (brightness-weighted, in box widths: a stray bright cell of
  // cloud at the edge does not widen it), a little more for the glow round it; a wide spread is a band, not a spot
  let s2 = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const q = L[j * cols + i] - cut;
    if (q <= 0) continue;
    s2 += q * (((i + 0.5 - cx) / cols) ** 2 + (((j + 0.5 - cy) / rows) * (rows / cols)) ** 2);
  }
  const spread = Math.sqrt(s2 / w);
  if (spread > 0.16) return null;
  // (its core — the brightest tenth of its cells — and the sky round it — the median cell —, for hotAlpha)
  const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => L[p] - L[q]);
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const core = px(order[Math.max(0, n - 1 - Math.floor(hot * 0.1))]), sky = px(order[n >> 1]);
  return { x: cx / cols, y: cy / rows, r: Math.max(0.05, spread * 2.2 + 0.03), a: 0.8, core, sky };
}
/**
 * How much the deepening over a bright spot adds on top of the scrim's own `a` (both rgba(9, 6, 28, α), the browser
 * blending in sRGB): just enough that the spot's core under both reads a touch darker than the sky round it under the
 * scrim alone (`under`: its luminance, 0.7 of the sky's — at equal luminance a warm sun still shows through a navy
 * scrim as a faint brown disc) — so the sun or the moon never shows through as a muddy disc, and the place over it is
 * never much darker than the rest of the scrim (never a dark blot). At most `max`. Pure; unit-tested.
 */
export function hotAlpha(core, sky, a, { max = 0.8, under = 0.7 } = {}) {
  if (!core || !sky || !(a >= 0) || a >= 1) return 0;
  const over = ([r, g, b], k) => luminance(r + (SCRIM_RGB[0] - r) * k, g + (SCRIM_RGB[1] - g) * k, b + (SCRIM_RGB[2] - b) * k);
  // (a spot no brighter than the sky round it needs nothing)
  const sk = over(sky, a);
  if (over(core, a) <= sk) return 0;
  const want = sk * under;
  // the total cover the core needs (between a and 1), then what the second layer adds to reach it: 1 − (1 − k)/(1 − a)
  let lo = a, hi = 1;
  for (let i = 0; i < 18; i++) { const k = (lo + hi) / 2; if (over(core, k) > want) lo = k; else hi = k; }
  const t = 1 - (1 - hi) / (1 - a);
  return Math.round(Math.min(max, Math.max(0, t)) * 100) / 100;
}
/**
 * The deepening over a bright spot, coloured as well as dark (review r2 P3: on Boppo's home at 320 the sun under the pill's
 * right end read murky olive-brown — a warm white under a navy scrim is a grey of another hue than the warm sky round it,
 * however dark). The layer's colour and alpha that bring the spot's core under both layers to the colour the sky round it
 * has under the scrim alone, a touch darker (`under`, per sRGB channel: ~0.7 of its luminance) — the least alpha that does
 * it with a colour in range, at most `max`. → { a, rgb: [r, g, b] }, or null when nothing is needed. Both layers are blended
 * the browser's way (sRGB). Pure; unit-tested.
 */
export function hotTint(core, sky, a, { max = 0.8, under = 0.86 } = {}) {
  if (!core || !sky || !(a >= 0) || a >= 1) return null;
  const mix = (p, k) => p.map((v, i) => v + (SCRIM_RGB[i] - v) * k);
  const P = mix(core, a), Sk = mix(sky, a);
  // (a spot no brighter than the sky round it needs nothing)
  if (luminance(...P) <= luminance(...Sk)) return null;
  const T = Sk.map((v) => v * under);
  let t = 0;
  for (let i = 0; i < 3; i++) {
    if (P[i] > T[i]) t = Math.max(t, (P[i] - T[i]) / P[i]);              // (its colour no less than 0)
    else if (T[i] > P[i]) t = Math.max(t, (T[i] - P[i]) / Math.max(1, 255 - P[i]));   // (...nor more than 255)
  }
  t = Math.min(max, t);
  if (!(t > 0.02)) return null;
  const rgb = P.map((p, i) => Math.round(Math.min(255, Math.max(0, (T[i] - p * (1 - t)) / t))));
  return { a: Math.round(t * 100) / 100, rgb };
}
let sampler = null;
/**
 * Draw what is behind `rect` (client px) from the given canvases into a tiny canvas; → RGBA data or null. `full`: each
 * layer that is partly faded (a realm still fading in as the Hushfold opens, a world melting) drawn as it will be, fully
 * shown; `out.partial` says whether there was one.
 */
function sampleBackdrop(rect, canvases, { full = false, out = null } = {}) {
  try {
    if (!rect || rect.width < 4 || rect.height < 4 || !canvases?.length) return null;
    sampler ||= Object.assign(document.createElement('canvas'), { width: 48, height: 12 });
    const g = sampler.getContext('2d', { willReadFrequently: true });
    g.globalAlpha = 1; g.fillStyle = '#0b0820'; g.fillRect(0, 0, 48, 12);
    for (const c of canvases) {
      if (!c?.width || !c.isConnected) continue;
      const cr = c.getBoundingClientRect();
      if (!cr.width || !cr.height) continue;
      let a = 1;
      for (let el = c; el && el !== document.body; el = el.parentElement) { const o = +getComputedStyle(el).opacity; if (Number.isFinite(o)) a *= o; }
      if (a < 0.05) continue;
      if (a < 0.97 && out) out.partial = true;
      const kx = c.width / cr.width, ky = c.height / cr.height;
      const sx = (rect.left - cr.left) * kx, sy = (rect.top - cr.top) * ky;
      g.globalAlpha = full ? 1 : Math.min(1, a);
      g.drawImage(c, sx, sy, rect.width * kx, rect.height * ky, 0, 0, 48, 12);
    }
    g.globalAlpha = 1;
    return g.getImageData(0, 0, 48, 12).data;
  } catch { return null; }
}

const asLines = (lines, opts) => [].concat(lines ?? []).filter((l) => l != null && l !== '').map((l) => (typeof l === 'string'
  ? { text: l, who: opts.who, kind: opts.kind, colour: opts.colour }
  : { text: String(l.text ?? ''), who: l.who ?? opts.who, kind: l.kind ?? opts.kind, colour: l.colour ?? opts.colour, hold: l.hold })).filter((l) => l.text);

export function createSubtitles({ root, prefs, avoid = () => [], bounds = null, reducedMotion = () => false, backdrop = null, brightHint = () => false, onControl = null, onBand = null } = {}) {
  let speed = normaliseSpeed(prefs?.get?.('subtitleSpeed'));
  const liveEl = h('div', { class: 'hf-sublive', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const chipsEl = h('div', { class: 'hf-chips hf-ui', role: 'group', hidden: true });
  // the person's own pause / resume: the scene may pause or resume more than the lines (a world)
  const pauseBtn = h('button', { class: 'pause', type: 'button', 'aria-label': 'Pause subtitles', onclick: () => { const was = paused; if (was) api.resume(); else api.pause(); onControl?.(was ? 'resume' : 'pause'); } }, hfIcon('pause'));
  const replayBtn = h('button', { class: 'replay', type: 'button', 'aria-label': 'Replay line', onclick: () => api.replay() }, hfIcon('replay'));
  const skipBtn = h('button', { class: 'skip', type: 'button', 'aria-label': 'Next line', onclick: () => api.skip() }, hfIcon('skip'));
  const goBtn = h('button', { class: 'go', type: 'button', 'aria-label': 'Continue', onclick: () => api.skip() }, 'Continue', hfIcon('next'));
  const speedBtn = h('button', { class: 'speed', type: 'button', onclick: () => api.setSpeed(SUBTITLE_SPEEDS[(SUBTITLE_SPEEDS.indexOf(speed) + 1) % SUBTITLE_SPEEDS.length]) });
  const ctl = h('div', { class: 'hf-subctl hf-ui is-hidden', role: 'group', 'aria-label': 'Subtitle controls' }, pauseBtn, replayBtn, skipBtn, goBtn, speedBtn);
  const el = h('div', { class: 'hf-subs', 'data-hf': 'subtitles' }, liveEl, chipsEl, ctl);
  root.append(el);

  const queue = [];            // { lines, opts, resolve, choice? }
  let cur = null;              // { item, i, lineEl, timer, t0, remaining, holding, phase }
  let paused = false;
  let suspended = false, parked = null;   // while the person types (the Tell overlay)
  let lastLine = null;
  let hideCtlTimer = 0;
  let placedOnce = false;
  let jumpNext = false;       // the next layout places a new line: no glide
  let lastY = 0;
  let destroyed = false;
  let relayoutT = 0;          // while a line is up, keep it clear of things that move (a hop, a drifting thought)
  let reserved = 0;           // the band height the scene was asked to keep free (onBand)
  const release = () => { if (reserved) { reserved = 0; onBand?.(0); } };
  // (and, in a line's first seconds, what is behind it is looked at again: a line said while the realm is still fading in
  // — just after the Hushfold opens — or that has moved, would keep a scrim sampled from a dimmer or other backdrop: the
  // daytime sun left muddy under it. Until two looks in a row agree, four at most)
  const watch = (on) => { clearInterval(relayoutT); relayoutT = on ? setInterval(() => { if (cur?.lineEl || !chipsEl.hidden) layout(); rescrim(); }, 600) : 0; };
  function rescrim() {
    const c = cur, n = c?.lineEl;
    if (!n?.isConnected || c.phase === 'out' || (c.scrimLooks || 0) >= 4 || c.scrimStill >= 2) return;
    c.scrimLooks = (c.scrimLooks || 0) + 1;
    const key = sampleScrim(n);
    c.scrimStill = key === c.scrimKey ? (c.scrimStill || 0) + 1 : 0;
    c.scrimKey = key;
  }
  const offPrefs = prefs?.onChange?.((k, v) => { if (k === 'subtitleSpeed') { speed = normaliseSpeed(v); renderSpeed(); } });
  // a line that changes size while it shows (its type face arriving: a world's title in story type, placed on one line
  // in the fallback face, wraps to two once the face is there) is placed again at once — never left grown over what it
  // was placed clear of; a line still arriving (its first 0.8 s) jumps there
  let shownAt = 0;
  const resized = () => { if (destroyed || !(cur?.lineEl || !chipsEl.hidden)) return; if (performance.now() - shownAt < 800) jumpNext = true; layout(); };
  const sizeObs = typeof ResizeObserver === 'function' ? new ResizeObserver(resized) : null;
  sizeObs?.observe(liveEl); sizeObs?.observe(chipsEl);
  // (the face arriving also changes the widest line, which sets the line's width for its scrim: measured again)
  const onFonts = () => { const n = cur?.lineEl; if (destroyed || !n?.isConnected) return; n.style.width = ''; adaptScrim(n); resized(); };
  try { document.fonts?.addEventListener?.('loadingdone', onFonts); } catch { /* no font events: the size observer still places it again */ }

  function renderSpeed() {
    const label = `${speed === 1 ? '1' : String(speed)}×`;
    speedBtn.textContent = label;
    speedBtn.setAttribute('aria-label', `Subtitle speed ${label}. Tap to change.`);
  }
  renderSpeed();

  function showCtl(on) {
    clearTimeout(hideCtlTimer);
    ctl.classList.remove('gap');
    ctl.classList.toggle('idle', !on);
    if (on) ctl.classList.remove('is-hidden');
    // the pill leaves with the last line (it never lingers alone on the stage); a paused pill stays
    else if (!paused) ctl.classList.add('is-hidden');
  }

  function layout() {
    if (destroyed) return;
    const b = bounds?.() || { top: 70, bottom: innerHeight - 90 };
    // only what is visible counts (a hidden pill keeps its box but must not push the line onto something)
    const gapPx = 10;
    let need = liveEl.offsetHeight || 0;
    if (!chipsEl.hidden) need += chipsEl.offsetHeight + gapPx;
    if (!ctl.classList.contains('is-hidden')) need += ctl.offsetHeight + gapPx;
    need = need || 64;
    // a stage narrower than the viewport (beside an open side panel): the lines keep to it, and only what is beside
    // them across that width can push them up or down (a thought under the panel does not)
    const right = Number.isFinite(b.right) && b.right < innerWidth - 1 ? Math.max(160, b.right) : null;
    const left = Number.isFinite(b.left) && b.left > 1 ? b.left : null;
    el.style.right = right != null ? `${Math.round(innerWidth - right)}px` : '';
    el.style.left = left != null ? `${Math.round(left)}px` : '';
    let blocks = avoid() || [];
    if (right != null || left != null) blocks = blocks.filter((r) => !r || !(horizOf(r)[0] >= (right ?? Infinity) || horizOf(r)[1] <= (left ?? -Infinity)));
    // a line already showing stays where it is while that place is still free (inside the bounds, nothing on it): it
    // never trails something that moves away from it (a world's title following the person's thought down, gliding
    // into it as it travels); it moves only when something comes onto it, the bounds move, or a new line is placed
    const keep = !jumpNext && placedOnce && (!!liveEl.firstChild || !chipsEl.hidden) && bandFree(b, blocks, lastY, need);
    const { y, fits } = keep ? { y: lastY, fits: true } : placeBand(b, blocks, need);
    // no free band is tall enough (a choice with two rows of chips on a small phone): ask the
    // scene for room (it shrinks the Mallow); the reservation lasts until the lines go away
    const showing = !!liveEl.firstChild || !chipsEl.hidden;
    if (showing && !fits && need > reserved) { reserved = need; onBand?.(need); }
    // a long move jumps rather than gliding across the Mallow; so does a new line (it fades in where it belongs: gliding
    // there from where the last line was, it would cross whatever it was placed clear of — a world's title over the
    // person's thought that has just landed)
    if (!placedOnce || jumpNext || Math.abs(y - lastY) > 140) { el.style.transition = 'none'; requestAnimationFrame(() => { el.style.transition = ''; }); placedOnce = true; }
    jumpNext = false;
    lastY = y;
    el.style.transform = `translateY(${y}px)`;
  }

  /**
   * A new line, just before its first paint (in the frame's rAF, after its last placing): what is behind it is sampled
   * again where it now is, still with no fade (.fresh); from the next frame on a later look deepens in softly. One quick
   * look follows at 160 ms (a realm drawing its first frames as the Hushfold opens), then rescrim's every 600 ms.
   */
  function settle(node) {
    if (!node?.isConnected) return;
    const key = sampleScrim(node);
    if (cur?.lineEl === node) { cur.scrimKey = key; cur.scrimStill = 0; }
    requestAnimationFrame(() => requestAnimationFrame(() => node.classList.remove('fresh')));
    setTimeout(() => { if (!destroyed && cur?.lineEl === node && cur.phase !== 'out') rescrim(); }, 160);
  }
  /** Deepen the scrim over a bright backdrop (once per line, and again in its first seconds: rescrim; cheap: 48×12 samples). */
  function adaptScrim(node) {
    if (!node) return;
    // shrink-wrap the block to its longest line, so the scrim hugs the words (not the screen's width)
    try {
      const p = node.querySelector('.text');
      node.style.width = '';
      const rng = document.createRange();
      rng.selectNodeContents(p);
      let w = 0;
      for (const r of rng.getClientRects()) w = Math.max(w, r.width);
      if (w > 0) node.style.width = `${Math.ceil(w + 4)}px`;
    } catch { /* keep the natural width */ }
    const key = sampleScrim(node);
    if (cur && cur.lineEl === node) { cur.scrimKey = key; cur.scrimStill = 0; }
  }
  /** What is behind the line now → its scrim (and the deepening over a bright spot); a key of what was found. */
  function sampleScrim(node) {
    let a = brightHint() ? 0.8 : SCRIM_MIN;
    // (what is behind it may still be fading in — the realm as the Hushfold opens —: it is read as it will be too, and
    // the deeper scrim of the two is kept, so the first look, before the line is first painted, is already right)
    const layers = backdrop ? backdrop() : null;
    const seen = { partial: false };
    const data = layers ? sampleBackdrop(node.getBoundingClientRect(), layers, { out: seen }) : null;
    const whole = seen.partial ? sampleBackdrop(node.getBoundingClientRect(), layers, { full: true }) : null;
    if (data) a = Math.max(scrimFor(brightPixel(data)), whole ? scrimFor(brightPixel(whole)) : 0);
    node.style.setProperty('--hf-scrim', String(a));
    el.classList.toggle('bright', a > 0.62);
    // a bright spot behind the scrim's whole box (its feathered rim reaches past the words): the scrim is deepened over it
    // (--hf-hot-*), so the daytime sun never shows through the dark as a muddy brown blob — wherever it lies under the
    // scrim, its rounded ends and rim included: the deepening is its own layer (.hf-sub::after), not cut to the scrim's
    // pill, placed in px from the line's own box (--hf-hot-cx / -cy)
    let hs = null, ha = 0;
    try {
      const r = node.getBoundingClientRect();
      const box = { left: r.left - 24, top: r.top - 14, width: r.width + 48, height: r.height + 30 };
      const seen2 = { partial: false };
      const d2 = layers ? sampleBackdrop(box, layers, { out: seen2 }) : null;
      hs = d2 ? hotSpot(d2) : null;
      if (!hs && seen2.partial) { const w2 = sampleBackdrop(box, layers, { full: true }); hs = w2 ? hotSpot(w2) : null; }
      // (only as deep as the spot needs to read as the sky round it does — in its colour too, never a grey or olive disc on
      // a warm sky: hotTint — and never a dark blot on a bright home)
      const tint = hs ? hotTint(hs.core, hs.sky, a, { max: hs.a }) : null;
      ha = tint ? tint.a : 0;
      if (hs && ha > 0.02) {
        node.style.setProperty('--hf-hot-rgb', tint.rgb.join(', '));
        node.style.setProperty('--hf-hot-x', `${(hs.x * 100).toFixed(1)}%`);
        node.style.setProperty('--hf-hot-y', `${(hs.y * 100).toFixed(1)}%`);
        node.style.setProperty('--hf-hot-cx', `${Math.round(hs.x * box.width - 24)}px`);
        node.style.setProperty('--hf-hot-cy', `${Math.round(hs.y * box.height - 14)}px`);
        node.style.setProperty('--hf-hot-r', `${Math.round(hs.r * box.width)}px`);
        node.style.setProperty('--hf-hot-a', String(ha));
      } else hs = null;
    } catch { hs = null; }
    if (!hs) node.style.setProperty('--hf-hot-a', '0');
    // (what was found, coarsely: two looks in a row that agree end the looking)
    return `${a}|${hs ? `${Math.round(hs.x * 20)},${Math.round(hs.y * 10)},${Math.round(hs.r * 40)}` : '-'}`;
  }

  function lineNode(line) {
    const kind = line.kind === 'discovery' || line.kind === 'title' ? line.kind : 'dialogue';
    // (fresh: until it is first painted its scrim and its deepening take what is sampled at once, with no fade from the
    // default — the first ~0.9 s never shows the sun or moon through a scrim still deepening: settle())
    const node = h('div', { class: `hf-sub ${kind} fresh` },
      // the name in near-white; only the dot wears the Mallow's colour (contrast over bright realms)
      line.who ? h('div', { class: 'who', style: line.colour ? { '--hf-who': line.colour } : null }, line.who, h('span', { class: 'sr-only' }, ': ')) : null,
      h('p', { class: 'text' }, line.text));
    return node;
  }

  function startTimer(ms) {
    clearTimeout(cur.timer);
    cur.remaining = ms; cur.t0 = performance.now();
    cur.timer = paused ? 0 : setTimeout(advance, ms);
  }

  function showLine() {
    const line = cur.item.lines[cur.i];
    const last = cur.i === cur.item.lines.length - 1;
    cur.holding = !!(line.hold ?? (last && cur.item.opts.hold));
    el.classList.toggle('reduced', !!reducedMotion());
    const node = lineNode(line);
    liveEl.replaceChildren(node);
    cur.lineEl = node; cur.phase = 'in';
    lastLine = line;
    chipsEl.hidden = true;
    ctl.classList.toggle('holding', cur.holding);
    // a world's name is a title card, not dialogue: no controls under it
    if (line.kind === 'title' && !cur.holding) { clearTimeout(hideCtlTimer); ctl.classList.add('is-hidden'); } else showCtl(true);
    jumpNext = true;
    shownAt = performance.now();
    layout();
    adaptScrim(node);
    // ...and placed once more before it is first painted, now that it has its final width (adaptScrim) and the scene
    // has answered a band it asked for: the line never shows first where it does not belong and then moves — and what is
    // behind it where it now is, sampled again (its scrim and the deepening over a bright spot are right from its first frame)
    requestAnimationFrame(() => { if (!destroyed && cur?.lineEl === node) { jumpNext = true; layout(); settle(node); } });
    watch(true);
    if (cur.holding) {
      cur.timer = 0;
      // never pull focus out of a text field (on iPhone that would drop the keyboard mid-sentence)
      const a = document.activeElement;
      if (!a || !(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) goBtn.focus?.({ preventScroll: true });
      return;
    }
    startTimer(readingMs(line.text, speed));
  }

  function fadeOut(node, then) {
    if (!node) { then(); return; }
    node.classList.add('out');
    setTimeout(() => { node.remove(); then(); }, OUT_MS);
  }

  function advance() {
    if (!cur || cur.phase === 'out') return;
    clearTimeout(cur.timer); cur.timer = 0;
    cur.phase = 'out';
    const mine = cur;
    // the last line of all: the pill fades out together with it (never left alone on the stage)
    if (cur.i >= cur.item.lines.length - 1 && !queue.length && !paused) { clearTimeout(hideCtlTimer); ctl.classList.add('idle', 'is-hidden'); }
    // another line follows: the pill steps out with this one for the gap between them and comes back with the next (it
    // is never seen alone, with no line; it keeps its focus meanwhile — a held line's Continue)
    else if (!paused) ctl.classList.add('gap');
    fadeOut(cur.lineEl, () => {
      if (cur !== mine) return;
      cur.i += 1;
      if (cur.i < cur.item.lines.length) { setTimeout(() => { if (cur === mine) { cur.phase = 'in'; showLine(); } }, GAP_MS); return; }
      finish(true);
    });
  }

  function finish(result) {
    const item = cur?.item;
    cur = null;
    chipsEl.hidden = true; chipsEl.replaceChildren(); chipsEl.classList.remove('out');
    ctl.classList.remove('holding');
    item?.resolve(result);
    next();
  }

  function next() {
    if (cur || paused || destroyed || suspended) return;
    const item = queue.shift();
    if (!item) { showCtl(false); watch(false); release(); return; }
    cur = { item, i: Math.min(item.resumeAt || 0, Math.max(0, (item.lines?.length || 1) - 1)), lineEl: null, timer: 0, t0: 0, remaining: 0, holding: false, phase: 'in' };
    if (item.choice) showChoice(); else setTimeout(() => { if (cur?.item === item) showLine(); }, GAP_MS);
  }

  function showChoice() {
    const { prompt, options, opts } = cur.item;
    const mine = cur;
    el.classList.toggle('reduced', !!reducedMotion());
    const node = prompt ? lineNode({ text: prompt, who: opts.who, colour: opts.colour, kind: 'dialogue' }) : null;
    liveEl.replaceChildren(...(node ? [node] : []));
    cur.lineEl = node;
    if (node) lastLine = { text: prompt, who: opts.who, colour: opts.colour };
    chipsEl.setAttribute('aria-label', prompt || 'Choose');
    // onPick runs inside the tap itself (an iPhone keyboard only opens from a real gesture)
    chipsEl.replaceChildren(...options.map((o) => h('button', { class: `hf-chip${o.primary ? ' primary' : ''}${o.soft ? ' soft' : ''}`, type: 'button', onclick: () => { try { o.onPick?.(); } catch (e) { console.warn(e); } choose(o.value); } }, o.label)));
    chipsEl.classList.remove('out');
    chipsEl.hidden = false;
    ctl.classList.add('is-hidden');
    layout();
    adaptScrim(node);
    if (node) requestAnimationFrame(() => { if (!destroyed && cur === mine && mine.lineEl === node) { layout(); settle(node); } });
    watch(true);
    // (keyboard and screen readers: the first chip has the focus — never taken out of a text field, where on iPhone it
    // would drop the keyboard mid-sentence)
    if (opts.focus) {
      const a = document.activeElement;
      if (!a || !(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) chipsEl.firstChild?.focus?.({ preventScroll: true });
    }
    if (mine.onVis) { document.removeEventListener?.('visibilitychange', mine.onVis); mine.onVis = null; }
    if (opts.timeoutMs > 0) {
      // (waitHidden: the clock stops while the page is hidden and starts again, with at least HIDDEN_BACK_MS, once it is seen)
      let left = opts.timeoutMs, t0 = 0;
      const arm = () => {
        clearTimeout(mine.timer); mine.timer = 0;
        if (opts.waitHidden && document.hidden) return;
        t0 = performance.now();
        mine.timer = setTimeout(() => choose(null, { faded: true }), left);
      };
      if (opts.waitHidden) {
        const onVis = mine.onVis = () => {
          if (cur !== mine || mine.phase === 'out' || mine.onVis !== onVis) { document.removeEventListener?.('visibilitychange', onVis); return; }
          if (document.hidden) {
            if (mine.timer) { clearTimeout(mine.timer); mine.timer = 0; left = Math.max(0, left - (performance.now() - t0)); }
          } else if (!mine.timer) { left = Math.max(left, opts.hiddenBackMs ?? HIDDEN_BACK_MS); arm(); }
        };
        document.addEventListener?.('visibilitychange', onVis);
      }
      arm();
    }
    function choose(value, { faded = false } = {}) {
      if (cur !== mine || mine.phase === 'out') return;
      clearTimeout(mine.timer);
      if (mine.onVis) { document.removeEventListener?.('visibilitychange', mine.onVis); mine.onVis = null; }
      mine.phase = 'out';
      // (let go by its clock, the chips fade out with the line — the soft chip after "Just be with it" fades, never pops;
      // a tapped one goes at once)
      if (faded) chipsEl.classList.add('out'); else chipsEl.hidden = true;
      if (!mine.lineEl && faded) setTimeout(() => { if (cur === mine) finish(value); }, OUT_MS);
      else fadeOut(mine.lineEl, () => { if (cur === mine) finish(value); });
    }
    cur.choose = choose;
  }

  /** Items worth keeping through a clear or a suspend: held discoveries and real choices. */
  const keeper = (it) => !!(it && ((it.choice && !it.opts?.transient) || it.opts?.hold || it.lines?.some((l) => l.hold)));
  function hideNow() {
    liveEl.replaceChildren(); chipsEl.hidden = true; chipsEl.replaceChildren();
    ctl.classList.remove('holding', 'gap'); clearTimeout(hideCtlTimer); ctl.classList.add('is-hidden'); watch(false);
  }

  const api = {
    el,
    say(lines, opts = {}) {
      const list = asLines(lines, opts);
      if (!list.length || destroyed) return Promise.resolve(false);
      // typing: passing chatter is let go; a held discovery waits for the overlay to close
      if (suspended && !keeper({ lines: list, opts })) return Promise.resolve(false);
      if (opts.interrupt) api.clear({ keepHeld: suspended });
      // first: true jumps the queue (a world's name before its first line)
      return new Promise((resolve) => { const it = { lines: list, opts, resolve }; if (opts.first) queue.unshift(it); else queue.push(it); next(); });
    },
    choice(prompt, options = [], opts = {}) {
      if (destroyed || !options.length) return Promise.resolve(null);
      if (suspended && opts.transient) return Promise.resolve(null);
      if (opts.interrupt) api.clear({ keepHeld: suspended });
      return new Promise((resolve) => { queue.push({ choice: true, prompt, options, opts, resolve, lines: [] }); next(); });
    },
    pause() {
      if (paused) return;
      paused = true;
      if (cur?.timer) { clearTimeout(cur.timer); cur.timer = 0; cur.remaining = Math.max(400, cur.remaining - (performance.now() - cur.t0)); }
      pauseBtn.replaceChildren(hfIcon('play')); pauseBtn.setAttribute('aria-label', 'Resume subtitles');
      showCtl(true);
    },
    resume() {
      if (!paused) return;
      paused = false;
      pauseBtn.replaceChildren(hfIcon('pause')); pauseBtn.setAttribute('aria-label', 'Pause subtitles');
      if (cur && !cur.item.choice && !cur.holding && cur.phase === 'in' && !cur.timer && cur.lineEl) startTimer(cur.remaining || 1200);
      else if (!cur) next();
    },
    replay() {
      if (cur && !cur.item.choice && cur.phase === 'in') { showLine(); return; }
      if (!cur && lastLine) api.say([{ ...lastLine }], {});
    },
    skip() {
      if (!cur) return;
      if (cur.item.choice) { cur.choose?.(null); return; }
      if (cur.phase === 'in' && cur.lineEl) advance();
    },
    setSpeed(s) {
      const v = normaliseSpeed(s);
      if (cur?.timer && !paused) {
        const left = Math.max(300, cur.remaining - (performance.now() - cur.t0)) * (speed / v);
        speed = v; startTimer(left);
      } else speed = v;
      prefs?.set?.('subtitleSpeed', v);
      renderSpeed();
    },
    /**
     * Remove everything now; pending promises resolve false (choices null).
     * keepHeld: held discoveries and non-transient choices stay (queued, or parked).
     * keep(opts): what else stays — the one showing stays exactly as it is, on screen with its clock running (a world
     * pausing under the shell's own question never takes the question with it).
     */
    clear({ keepHeld = false, keep = null } = {}) {
      const stays = (it) => { try { return !!(keep && it && keep(it.opts || {})); } catch { return false; } };
      const kept = [];
      for (const it of queue.splice(0)) { if ((keepHeld && keeper(it)) || stays(it)) kept.push(it); else it.resolve(it.choice ? null : false); }
      if (cur && cur.phase !== 'out' && stays(cur.item)) {
        // (it stays on screen, untouched: only what was queued behind it is let go)
        if (parked && !(keepHeld && keeper(parked.item)) && !stays(parked.item)) { parked.item.resolve(parked.item.choice ? null : false); parked = null; }
        queue.push(...kept);
        return;
      }
      if (cur) {
        clearTimeout(cur.timer);
        const c = cur; cur = null;
        if (keepHeld && keeper(c.item)) { c.phase = 'in'; c.lineEl = null; kept.unshift({ ...c.item, resumeAt: c.i }); }
        else c.item.resolve(c.item.choice ? null : false);
      }
      if (parked && !(keepHeld && keeper(parked.item)) && !stays(parked.item)) { parked.item.resolve(parked.item.choice ? null : false); parked = null; }
      queue.push(...kept);
      liveEl.replaceChildren(); chipsEl.hidden = true; chipsEl.replaceChildren();
      ctl.classList.remove('holding'); showCtl(false); watch(false);
      if (!suspended) next();
      if (!cur && !queue.length) release();
    },
    /**
     * Let go of the lines and choices match(opts) picks — held ones too (a world that has melted away takes its
     * discovery line and its Continue with it): queued or parked ones resolve false (choices null) at once; the
     * one showing fades out, then the queue carries on. Everything else stays as it is. True when one was dropped.
     */
    drop(match) {
      if (typeof match !== 'function' || destroyed) return false;
      const pick = (it) => { try { return !!match(it?.opts || {}); } catch { return false; } };
      let any = false;
      for (let i = queue.length - 1; i >= 0; i--) if (pick(queue[i])) { const [it] = queue.splice(i, 1); it.resolve(it.choice ? null : false); any = true; }
      if (parked && pick(parked.item)) { parked.item.resolve(parked.item.choice ? null : false); parked = null; any = true; }
      if (cur && pick(cur.item)) {
        any = true;
        const mine = cur;
        clearTimeout(mine.timer); mine.timer = 0;
        chipsEl.hidden = true; chipsEl.replaceChildren(); ctl.classList.remove('holding');
        if (mine.phase !== 'out') {
          mine.phase = 'out';
          // (the pill goes with it unless another line follows)
          if (!queue.length && !paused) { clearTimeout(hideCtlTimer); ctl.classList.add('idle', 'is-hidden'); }
          fadeOut(mine.lineEl, () => { if (cur === mine) finish(mine.item.choice ? null : false); });
        }
      }
      return any;
    },
    /** While the person types: nothing shows; held lines and choices wait, chatter is dropped. */
    suspend() {
      if (suspended || destroyed) return;
      suspended = true;
      for (let i = queue.length - 1; i >= 0; i--) if (!keeper(queue[i])) { const [it] = queue.splice(i, 1); it.resolve(it.choice ? null : false); }
      if (cur) {
        clearTimeout(cur.timer); cur.timer = 0;
        if (keeper(cur.item)) { parked = cur; cur = null; }
        else { const it = cur.item; cur = null; it.resolve(it.choice ? null : false); }
      }
      hideNow();
      release();
    },
    /** The overlay closed: a parked discovery or choice comes back, then the queue carries on. */
    unsuspend() {
      if (!suspended || destroyed) return;
      suspended = false;
      if (parked) {
        cur = parked; parked = null;
        cur.phase = 'in'; cur.lineEl = null;
        if (cur.item.choice) showChoice(); else showLine();
        return;
      }
      next();
    },
    layout,
    get busy() { return !!cur || queue.length > 0 || !!parked; },
    /** A discovery waits for acknowledgement (on screen, or parked while the person types). */
    get holding() { return !!cur?.holding || !!(parked && keeper(parked.item) && !parked.item.choice) || (suspended && queue.some((it) => !it.choice && keeper(it))); },
    get paused() { return paused; },
    get suspended() { return suspended; },
    get speed() { return speed; },
    /** The rectangle the subtitle block occupies now (for tests and placement). */
    rect() { return liveEl.firstChild ? el.getBoundingClientRect() : null; },
    destroy() { suspended = false; api.clear(); destroyed = true; watch(false); offPrefs?.(); clearTimeout(hideCtlTimer); sizeObs?.disconnect(); try { document.fonts?.removeEventListener?.('loadingdone', onFonts); } catch { /* */ } el.remove(); },
  };
  return api;
}
