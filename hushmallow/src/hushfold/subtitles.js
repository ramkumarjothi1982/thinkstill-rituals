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
// createSubtitles({root, prefs, avoid, bounds, reducedMotion}) →
//   { say(lines, {who, hold, id, kind:'dialogue'|'discovery'|'title', colour, interrupt, first}) → Promise<boolean>,
//     choice(prompt, [{label, value, primary}], {who, timeoutMs}) → Promise<value|null>,
//     pause, resume, replay, skip, setSpeed, clear, layout, destroy,
//     get busy, get holding, get paused, get speed, el }

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

const asLines = (lines, opts) => [].concat(lines ?? []).filter((l) => l != null && l !== '').map((l) => (typeof l === 'string'
  ? { text: l, who: opts.who, kind: opts.kind, colour: opts.colour }
  : { text: String(l.text ?? ''), who: l.who ?? opts.who, kind: l.kind ?? opts.kind, colour: l.colour ?? opts.colour, hold: l.hold })).filter((l) => l.text);

export function createSubtitles({ root, prefs, avoid = () => [], bounds = null, reducedMotion = () => false } = {}) {
  let speed = normaliseSpeed(prefs?.get?.('subtitleSpeed'));
  const liveEl = h('div', { class: 'hf-sublive', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const chipsEl = h('div', { class: 'hf-chips hf-ui', role: 'group', hidden: true });
  const pauseBtn = h('button', { class: 'pause', type: 'button', 'aria-label': 'Pause subtitles', onclick: () => (paused ? api.resume() : api.pause()) }, hfIcon('pause'));
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
  let lastLine = null;
  let hideCtlTimer = 0;
  let placedOnce = false;
  let lastY = 0;
  let destroyed = false;
  let relayoutT = 0;          // while a line is up, keep it clear of things that move (a hop, a drifting thought)
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
    const { y } = placeBand(b, avoid() || [], need);
    // a long move jumps rather than gliding across the Mallow
    if (!placedOnce || Math.abs(y - lastY) > 140) { el.style.transition = 'none'; requestAnimationFrame(() => { el.style.transition = ''; }); placedOnce = true; }
    lastY = y;
    el.style.transform = `translateY(${y}px)`;
  }

  function lineNode(line) {
    const kind = line.kind === 'discovery' || line.kind === 'title' ? line.kind : 'dialogue';
    const node = h('div', { class: `hf-sub ${kind}` },
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
    watch(true);
    if (cur.holding) { cur.timer = 0; goBtn.focus?.({ preventScroll: true }); return; }
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
    if (cur || paused || destroyed) return;
    const item = queue.shift();
    if (!item) { showCtl(false); watch(false); return; }
    cur = { item, i: 0, lineEl: null, timer: 0, t0: 0, remaining: 0, holding: false, phase: 'in' };
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
    chipsEl.replaceChildren(...options.map((o) => h('button', { class: `hf-chip${o.primary ? ' primary' : ''}`, type: 'button', onclick: () => choose(o.value) }, o.label)));
    chipsEl.hidden = false;
    ctl.classList.add('is-hidden');
    layout();
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

  const api = {
    el,
    say(lines, opts = {}) {
      const list = asLines(lines, opts);
      if (!list.length || destroyed) return Promise.resolve(false);
      if (opts.interrupt) api.clear();
      // first: true jumps the queue (a world's name before its first line)
      return new Promise((resolve) => { const it = { lines: list, opts, resolve }; if (opts.first) queue.unshift(it); else queue.push(it); next(); });
    },
    choice(prompt, options = [], opts = {}) {
      if (destroyed || !options.length) return Promise.resolve(null);
      if (opts.interrupt) api.clear();
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
    /** Remove everything now; pending promises resolve false (choices null). */
    clear() {
      const pending = queue.splice(0);
      if (cur) { clearTimeout(cur.timer); const it = cur.item; cur = null; it.resolve(it.choice ? null : false); }
      for (const it of pending) it.resolve(it.choice ? null : false);
      liveEl.replaceChildren(); chipsEl.hidden = true; chipsEl.replaceChildren();
      ctl.classList.remove('holding'); showCtl(false); watch(false);
    },
    layout,
    get busy() { return !!cur || queue.length > 0; },
    get holding() { return !!cur?.holding; },
    get paused() { return paused; },
    get speed() { return speed; },
    /** The rectangle the subtitle block occupies now (for tests and placement). */
    rect() { return liveEl.firstChild ? el.getBoundingClientRect() : null; },
    destroy() { destroyed = true; api.clear(); watch(false); offPrefs?.(); clearTimeout(hideCtlTimer); el.remove(); },
  };
  return api;
}
