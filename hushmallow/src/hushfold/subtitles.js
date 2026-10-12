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
//     choice(prompt, [{label, value, primary, onPick}], {who, timeoutMs, transient}) → Promise<value|null>,
//     pause, resume, replay, skip, setSpeed, clear({keepHeld}), suspend, unsuspend, layout, destroy,
//     get busy, get holding, get paused, get suspended, get speed, el }
// suspend(): while the person types, nothing shows; a held discovery or a
// choice waits (parked) and comes back on unsuspend(); passing chatter is dropped.

import { h } from '../app/ui.js';
import { hfIcon } from './icons.js';

export const SUBTITLE_SPEEDS = Object.freeze([0.75, 1, 1.25, 1.5]);
export const normaliseSpeed = (s) => (SUBTITLE_SPEEDS.includes(+s) ? +s : 1);
const OUT_MS = 420;   // fade out
const GAP_MS = 220;   // the breath between two lines

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
  const yy = pick.above ? pick.bottom - need : pick.top;
  return { y: Math.max(top, Math.round(yy)), fits: fitting.length > 0, band: { top: pick.top, bottom: pick.bottom } };
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
export function scrimFor([r, g, b], { target = 4.8, cover = 0.86 } = {}) {
  const text = luminance(251, 248, 255);
  for (let a = SCRIM_MIN; a <= SCRIM_MAX + 1e-9; a += 0.02) {
    const k = a * cover;
    const bl = luminance(r + (SCRIM_RGB[0] - r) * k, g + (SCRIM_RGB[1] - g) * k, b + (SCRIM_RGB[2] - b) * k);
    if (contrastRatio(text, bl) >= target) return Math.round(a * 100) / 100;
  }
  return SCRIM_MAX;
}
/** The brightest tenth of the pixels (by luminance) in RGBA data → [r, g, b]. */
export function brightPixel(data) {
  const n = data.length >> 2;
  if (!n) return [0, 0, 0];
  const idx = new Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  idx.sort((p, q) => L[p] - L[q]);
  const k = idx[Math.min(n - 1, Math.floor(n * 0.9))] * 4;
  return [data[k], data[k + 1], data[k + 2]];
}
let sampler = null;
/** Draw what is behind `rect` (client px) from the given canvases into a tiny canvas; → RGBA data or null. */
function sampleBackdrop(rect, canvases) {
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
      const kx = c.width / cr.width, ky = c.height / cr.height;
      const sx = (rect.left - cr.left) * kx, sy = (rect.top - cr.top) * ky;
      g.globalAlpha = Math.min(1, a);
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
  let lastY = 0;
  let destroyed = false;
  let relayoutT = 0;          // while a line is up, keep it clear of things that move (a hop, a drifting thought)
  let reserved = 0;           // the band height the scene was asked to keep free (onBand)
  const release = () => { if (reserved) { reserved = 0; onBand?.(0); } };
  const watch = (on) => { clearInterval(relayoutT); relayoutT = on ? setInterval(() => { if (cur?.lineEl || !chipsEl.hidden) layout(); }, 600) : 0; };
  const offPrefs = prefs?.onChange?.((k, v) => { if (k === 'subtitleSpeed') { speed = normaliseSpeed(v); renderSpeed(); } });

  function renderSpeed() {
    const label = `${speed === 1 ? '1' : String(speed)}×`;
    speedBtn.textContent = label;
    speedBtn.setAttribute('aria-label', `Subtitle speed ${label}. Tap to change.`);
  }
  renderSpeed();

  function showCtl(on) {
    clearTimeout(hideCtlTimer);
    ctl.classList.toggle('idle', !on);
    if (on) ctl.classList.remove('is-hidden');
    else hideCtlTimer = setTimeout(() => { if (!paused) ctl.classList.add('is-hidden'); }, 1800);
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
    const { y, fits } = placeBand(b, avoid() || [], need);
    // no free band is tall enough (a choice with two rows of chips on a small phone): ask the
    // scene for room (it shrinks the Mallow); the reservation lasts until the lines go away
    const showing = !!liveEl.firstChild || !chipsEl.hidden;
    if (showing && !fits && need > reserved) { reserved = need; onBand?.(need); }
    // a long move jumps rather than gliding across the Mallow
    if (!placedOnce || Math.abs(y - lastY) > 140) { el.style.transition = 'none'; requestAnimationFrame(() => { el.style.transition = ''; }); placedOnce = true; }
    lastY = y;
    el.style.transform = `translateY(${y}px)`;
  }

  /** Deepen the scrim over a bright backdrop (once per line; cheap: one 48×12 sample). */
  function adaptScrim(node) {
    if (!node) return;
    let a = brightHint() ? 0.8 : SCRIM_MIN;
    const data = backdrop ? sampleBackdrop(node.getBoundingClientRect(), backdrop()) : null;
    if (data) a = scrimFor(brightPixel(data));
    node.style.setProperty('--hf-scrim', String(a));
    el.classList.toggle('bright', a > 0.62);
  }

  function lineNode(line) {
    const kind = line.kind === 'discovery' || line.kind === 'title' ? line.kind : 'dialogue';
    const node = h('div', { class: `hf-sub ${kind}` },
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
    layout();
    adaptScrim(node);
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
    chipsEl.hidden = true; chipsEl.replaceChildren();
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
    chipsEl.replaceChildren(...options.map((o) => h('button', { class: `hf-chip${o.primary ? ' primary' : ''}`, type: 'button', onclick: () => { try { o.onPick?.(); } catch (e) { console.warn(e); } choose(o.value); } }, o.label)));
    chipsEl.hidden = false;
    ctl.classList.add('is-hidden');
    layout();
    adaptScrim(node);
    watch(true);
    if (opts.timeoutMs > 0) cur.timer = setTimeout(() => choose(null), opts.timeoutMs);
    function choose(value) {
      if (cur !== mine || mine.phase === 'out') return;
      clearTimeout(mine.timer);
      mine.phase = 'out';
      chipsEl.hidden = true;
      fadeOut(mine.lineEl, () => { if (cur === mine) finish(value); });
    }
    cur.choose = choose;
  }

  /** Items worth keeping through a clear or a suspend: held discoveries and real choices. */
  const keeper = (it) => !!(it && ((it.choice && !it.opts?.transient) || it.opts?.hold || it.lines?.some((l) => l.hold)));
  function hideNow() {
    liveEl.replaceChildren(); chipsEl.hidden = true; chipsEl.replaceChildren();
    ctl.classList.remove('holding'); clearTimeout(hideCtlTimer); ctl.classList.add('is-hidden'); watch(false);
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
     */
    clear({ keepHeld = false } = {}) {
      const kept = [];
      for (const it of queue.splice(0)) { if (keepHeld && keeper(it)) kept.push(it); else it.resolve(it.choice ? null : false); }
      if (cur) {
        clearTimeout(cur.timer);
        const c = cur; cur = null;
        if (keepHeld && keeper(c.item)) { c.phase = 'in'; c.lineEl = null; kept.unshift({ ...c.item, resumeAt: c.i }); }
        else c.item.resolve(c.item.choice ? null : false);
      }
      if (parked && !(keepHeld && keeper(parked.item))) { parked.item.resolve(parked.item.choice ? null : false); parked = null; }
      queue.push(...kept);
      liveEl.replaceChildren(); chipsEl.hidden = true; chipsEl.replaceChildren();
      ctl.classList.remove('holding'); showCtl(false); watch(false);
      if (!suspended) next();
      if (!cur && !queue.length) release();
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
    destroy() { suspended = false; api.clear(); destroyed = true; watch(false); offPrefs?.(); clearTimeout(hideCtlTimer); el.remove(); },
  };
  return api;
}
