// Small DOM helpers shared by scenes and ritual modules.

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

const P = {
  close: 'M6 6l12 12M18 6L6 18', back: 'M15 5l-7 7 7 7', gear: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3h-4l-.4 2.6a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1L11 21h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.4z',
  heart: 'M12 20s-7-4.4-9.2-9A5 5 0 0112 5.5 5 5 0 0121.2 11C19 15.6 12 20 12 20z', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  arrow: 'M5 12h14M13 6l6 6-6 6', support: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9',
  share: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6', search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4', sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 5v6h-6', camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 100-8 4 4 0 000 8z', journey: 'M4 20V10M10 20V4M16 20v-7M21 20H3', library: 'M4 5h4v14H4zM10 5h4v14h-4zM16.5 5.5l3.6 1-3.4 12.9-3.6-1z', mallow: 'M6 9c0-3 2.7-5 6-5s6 2 6 5v7c0 2.2-2.7 4-6 4s-6-1.8-6-4z',
};
export function icon(name, label) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', name === 'heart' || name === 'star' ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', P[name] || P.sparkle);
  svg.append(p);
  return svg;
}

export function iconBtn(name, label, onclick) {
  return h('button', { class: 'icon-btn', 'aria-label': label, title: label, onclick }, icon(name));
}

// --------------------------------------------------------------- sheets --
export function openSheet({ title, body, foot, full = false, onClose, label } = {}) {
  const root = document.getElementById('sheet-root');
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const closeBtn = iconBtn('close', 'Close', () => close());
  const sheet = h('div', { class: `sheet${full ? ' full' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label || title || 'Panel' },
    h('div', { class: 'grab', 'aria-hidden': 'true' }),
    title != null ? h('div', { class: 'sheet-head' }, h('h2', {}, title), closeBtn) : null,
    h('div', { class: 'sheet-body' }, body),
    foot ? h('div', { class: 'sheet-foot' }, foot) : null);
  root.append(backdrop, sheet);
  const prevFocus = document.activeElement;
  requestAnimationFrame(() => { backdrop.classList.add('open'); sheet.classList.add('open'); });
  let closed = false;
  function close(reason) {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('open'); sheet.classList.remove('open');
    setTimeout(() => { backdrop.remove(); sheet.remove(); prevFocus?.focus?.(); }, 470);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerup', onUp);
    onClose?.(reason);
  }
  const onKey = (e) => { if (e.key === 'Escape') close('escape'); };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', () => close('backdrop'));
  // swipe down on the grab bar to dismiss
  let y0 = null;
  sheet.querySelector('.grab').addEventListener('pointerdown', (e) => { y0 = e.clientY; });
  const onUp = (e) => { if (y0 != null && e.clientY - y0 > 60) close('swipe'); y0 = null; };
  window.addEventListener('pointerup', onUp);
  setTimeout(() => (sheet.querySelector('[autofocus]') || closeBtn)?.focus?.(), 480);
  return { el: sheet, body: sheet.querySelector('.sheet-body'), close };
}

export function toast(text, ms = 2200) {
  const t = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

// ------------------------------------------------- Mallow speech bubble --
// A Mallow's line, placed where it covers nothing that matters: never the
// Mallow's face, the top bar, the dock, cards, or the pieces you are meant to
// touch (buttons, chips, choices, fields, anything marked data-say-avoid, and
// rects a ritual passes as `avoid`). It prefers the space just above the
// Mallow's head (tail pointing down), then just below it, then any free band.
// With no free band it gets compact (never below the 19px dialogue size),
// then shows a long line one sentence at a time, then borrows the title band
// (the prompt dims while it shows). It follows the Mallow if the Mallow
// moves while it speaks.
let currentBubble = null;
let sayToken = 0;
const PIECES = '#scene button, #scene .chip, #scene .choice, #scene input, #scene textarea, #scene select, #scene .ask, #scene [data-say-avoid], .angle-stage > *, .angle-stage [data-say-avoid], #fx-layer > :not(canvas), #fx-layer > :not(canvas) > *, #fx-layer [data-say-avoid]';
const TEXTS = '#scene h1, #scene h2, #scene h3, #scene p, #scene .eyebrow, #scene .muted, #scene .lede';
// cost per px² of overlap (the face is never an option while anything else is)
const COST = { face: 400, body: 60, bar: 80, dock: 60, piece: 50, card: 40, text: 30, title: 30 };
const MODES = ['normal', 'compact', 'wide'];

function visibleRect(el) {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return null;
  return r;
}

/** Where the Mallow's body is (or is about to be: a move in progress is read from its target). */
function mallowBox(world) {
  const layer = document.getElementById('mallow-layer');
  if (!world || !layer || layer.classList.contains('hidden')) return null;
  const body = world.bodyRect?.() || world.mallowRect?.();
  if (!body || !(body.width > 0)) return null;
  const L = layer.getBoundingClientRect();
  const cs = getComputedStyle(layer);
  const mx = parseFloat(cs.getPropertyValue('--mx')), my = parseFloat(cs.getPropertyValue('--my')), ms = parseFloat(cs.getPropertyValue('--ms') || '1');
  let box = { left: body.left, top: body.top, width: body.width, height: body.height };
  if (Number.isFinite(mx) && Number.isFinite(my) && L.width > 0 && L.height > 0) {
    // the layer is translate(mx vw, my vh) scale(ms) about its centre: map the body into the target frame
    const sc = Number.isFinite(ms) && ms > 0 ? ms : 1;
    const tw = layer.offsetWidth * sc, th = layer.offsetHeight * sc;
    const T = { left: (mx / 100) * innerWidth - tw / 2, top: (my / 100) * innerHeight - th / 2, width: tw, height: th };
    box = { left: T.left + ((body.left - L.left) / L.width) * T.width, top: T.top + ((body.top - L.top) / L.height) * T.height,
      width: (body.width / L.width) * T.width, height: (body.height / L.height) * T.height };
  }
  box.right = box.left + box.width; box.bottom = box.top + box.height; box.cx = box.left + box.width / 2;
  return box;
}

function collectObstacles(world, avoid) {
  const out = [];
  const area = innerWidth * innerHeight;
  const add = (r, kind, el) => {
    if (!r) return;
    const right = r.right ?? r.left + r.width, bottom = r.bottom ?? r.top + r.height;
    if ((right - r.left) * (bottom - r.top) > area * 0.5 && kind !== 'bar' && kind !== 'dock') return;   // full-screen layers aren't obstacles
    out.push({ l: r.left, t: r.top, r: right, b: bottom, kind, el });
  };
  for (const el of document.querySelectorAll('#scene .topbar')) add(visibleRect(el), 'bar', el);
  for (const el of document.querySelectorAll('#scene .dock')) if (el.children.length) add(visibleRect(el), 'dock', el);
  for (const el of document.querySelectorAll('#scene .move-title')) add(visibleRect(el), 'title', el);
  for (const el of document.querySelectorAll('#scene .card, #scene .ultra-card, #scene .summary-card')) add(visibleRect(el), 'card', el);
  for (const el of document.querySelectorAll(PIECES)) if (!el.closest('.topbar, .dock') && el.getAttribute('data-say-avoid') !== 'off') add(visibleRect(el), 'piece', el);
  for (const el of document.querySelectorAll(TEXTS)) if (!el.closest('.topbar, .dock, .move-title, .card')) add(visibleRect(el), 'text', el);
  try { for (const r of (typeof avoid === 'function' ? avoid() : avoid) || []) add(r, 'piece'); } catch { /* a ritual's rects are optional */ }
  const m = mallowBox(world);
  if (m) {
    // the crown may meet the tail; the eyes and mouth never get covered
    add({ left: m.left + m.width * 0.06, top: m.top + m.height * 0.06, right: m.right - m.width * 0.06, bottom: m.bottom }, 'body');
    add({ left: m.left + m.width * 0.12, top: m.top + m.height * 0.16, right: m.right - m.width * 0.12, bottom: m.top + m.height * 0.8 }, 'face');
  }
  return { list: out, mallow: m };
}

// the top bar and the dock always stay clear (unless nothing fits between them)
function bounds(obs, bh) {
  const bar = obs.list.filter((o) => o.kind === 'bar').reduce((m, o) => Math.max(m, o.b), 0);
  const dock = obs.list.filter((o) => o.kind === 'dock').reduce((m, o) => Math.min(m, o.t), innerHeight);
  let yMin = Math.max(10, bar + 6), yMax = Math.min(innerHeight - 10, dock - 6) - bh;
  if (yMax < yMin) { yMin = 10; yMax = innerHeight - 10 - bh; }
  return { yMin, yMax, dockTop: Math.min(innerHeight - 10, dock) };
}

function setMode(b, mode) {
  b.classList.toggle('compact', mode !== 'normal');
  b.classList.toggle('wide', mode === 'wide');
}

/** The best spot for one bubble size: the nearest free one, the nearest one
 *  that only covers the title (which then dims), and the least bad one. */
function bestSpot(b, mode, obs, { above = true } = {}) {
  setMode(b, mode);
  const bw = Math.min(b.offsetWidth, innerWidth - 24), bh = b.offsetHeight;
  const sc = document.getElementById('scene')?.getBoundingClientRect();
  const xMin = Math.max(12, (sc?.left ?? 0) + 8), xMax = Math.max(xMin, Math.min(innerWidth - 12, (sc?.right ?? innerWidth) - 8) - bw);
  const m = obs.mallow;
  const cx = m ? m.cx : innerWidth / 2;
  const xs = [...new Set([Math.max(xMin, Math.min(xMax, cx - bw / 2)), xMin, xMax].map(Math.round))];
  const { yMin, yMax } = bounds(obs, bh);
  const PAD = 6;
  let free = null, titled = null, any = null;
  for (const x of xs) {
    for (let y = yMin; y <= yMax; y += 3) {
      let cost = 0, title = 0;
      for (const o of obs.list) {
        const w = Math.min(x + bw + PAD, o.r) - Math.max(x - PAD, o.l);
        if (w <= 0) continue;
        const hgt = Math.min(y + bh + PAD, o.b) - Math.max(y - PAD, o.t);
        if (hgt <= 0) continue;
        if (o.kind === 'title') title += w * hgt; else cost += w * hgt * COST[o.kind];
      }
      // close to the head (above) or the body's base (below), and centred on the Mallow
      let dist;
      if (m) {
        const up = Math.abs(y + bh + 12 - (m.top + m.height * 0.06));
        const down = Math.abs(y - (m.bottom + 12));
        dist = Math.min(up + (above ? 0 : 60), down + (above ? 60 : 0)) + Math.abs(x + bw / 2 - cx) * 0.25;
      } else dist = Math.abs(y - innerHeight * 0.3);
      const c = { x, y, bw, bh, mode, cost, title, dist, sc: cost + title + dist };
      if (!cost && !title && (!free || dist < free.dist)) free = c;
      if (!cost && (!titled || c.sc < titled.sc)) titled = c;
      if (!any || c.sc < any.sc) any = c;
    }
  }
  return { free, titled, any };
}

/** Sentences, then (for a sentence that still won't fit) its phrases. */
function splitLine(text, phrases) {
  const parts = String(text).split(/(?<=[.!?…])\s+(?=[A-Z“"‘'(])/).map((t) => t.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  if (!phrases) return null;
  const m = String(text).match(/^(.{14,}?[,;:—–])\s+(.{12,})$/);
  return m ? [m[1], m[2]] : null;
}

const moveText = () => [...document.querySelectorAll('#scene .move-title h2')].map((e) => e.textContent).join('|');

function dimTitles(on) {
  for (const el of document.querySelectorAll('#scene .move-title')) el.classList.toggle('say-dim', !!on);
}

// ---- making room: when a line fits nowhere, the Mallow steps down or
// shrinks a little (gently) and goes back once the line has gone
let room = null;
const layerVars = () => {
  const layer = document.getElementById('mallow-layer');
  if (!layer) return null;
  const cs = getComputedStyle(layer);
  const v = { x: parseFloat(cs.getPropertyValue('--mx')), y: parseFloat(cs.getPropertyValue('--my')), s: parseFloat(cs.getPropertyValue('--ms') || '1') };
  return Number.isFinite(v.x) && Number.isFinite(v.y) ? { ...v, s: Number.isFinite(v.s) && v.s > 0 ? v.s : 1 } : null;
};
function makeRoom(world, obs, bh) {
  const m = obs.mallow, cur = layerVars();
  if (!m || !cur || typeof world?.place !== 'function') return false;
  const { yMin, dockTop } = bounds(obs, bh);
  const headTop = yMin + bh + 10;               // where the crown may start
  const need = headTop - m.top;
  if (need <= 0) return false;
  const below = dockTop - 8 - m.bottom;          // free room under the body
  let next;
  if (need <= below) next = { x: cur.x, y: cur.y + (need / innerHeight) * 100, s: cur.s };
  else {
    const bottom = Math.min(dockTop - 8, m.bottom + Math.max(0, below));
    const avail = bottom - headTop;
    if (avail < m.height * 0.45) return false;   // never shrink a Mallow to a speck
    const k = avail / m.height;
    const offset = (m.top + m.height / 2) - (cur.y / 100) * innerHeight;   // body centre vs layer centre
    next = { x: cur.x, y: (((headTop + bottom) / 2 - offset * k) / innerHeight) * 100, s: cur.s * k };
  }
  world.place({ x: next.x, y: next.y, scale: next.s, calm: true });
  if (room) clearTimeout(room.timer);
  room = { prev: room?.prev || cur, set: next, world, timer: 0 };
  return true;
}
function restoreRoom(delay = 700) {
  if (!room) return;
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    if (!room || currentBubble) return;            // the next line's end restores it
    const r = room; room = null;
    const now = layerVars();
    // only if nothing else has moved the Mallow since
    if (now && Math.abs(now.x - r.set.x) < 0.01 && Math.abs(now.y - r.set.y) < 0.01 && Math.abs(now.s - r.set.s) < 0.001) r.world.place({ x: r.prev.x, y: r.prev.y, scale: r.prev.s, calm: true });
  }, delay);
}

function placeBubble(b, world, opts, { allowTitle = false, allowMove = false, mode } = {}) {
  const above = opts.above !== false;
  const modes = mode ? [mode] : MODES;
  const search = (obs) => modes.map((md) => bestSpot(b, md, obs, { above }));
  const choose = (r) => r.find((x) => x.free)?.free || (allowTitle ? r.find((x) => x.titled)?.titled : null) || null;
  let obs = collectObstacles(world, opts.avoid);
  let r = search(obs);
  let pick = choose(r);
  if (!pick && allowMove && obs.mallow) {
    const wide = r[r.length - 1].any;
    if (wide && makeRoom(world, obs, wide.bh)) { obs = collectObstacles(world, opts.avoid); r = search(obs); pick = choose(r); }
  }
  if (!pick) pick = r.map((x) => x.any).filter(Boolean).sort((a, z) => a.sc - z.sc)[0];
  if (!pick) return null;
  setMode(b, pick.mode);
  const m = obs.mallow;
  const tailUp = m && pick.y >= m.bottom - 4 && pick.y - m.bottom < 44;
  const tailDown = m && pick.y + pick.bh <= m.top + m.height * 0.2 && m.top - (pick.y + pick.bh) < 44;
  const overX = m && pick.x < m.right && pick.x + pick.bw > m.left;
  b.classList.toggle('below', !!(tailUp && overX));
  b.classList.toggle('no-tail', !((tailUp || tailDown) && overX));
  b.style.left = `${pick.x}px`;
  b.style.top = `${pick.y}px`;
  b.style.setProperty('--tail', `${Math.max(22, Math.min(pick.bw - 22, (m ? m.cx : innerWidth / 2) - pick.x))}px`);
  dimTitles(pick.title > 0);
  return pick;
}

function sig(world, avoid) {
  const m = mallowBox(world);
  const o = collectObstacles(world, avoid).list.filter((x) => x.kind !== 'body' && x.kind !== 'face');
  const q = (v) => Math.round(v / 8);
  return `${m ? [m.left, m.top, m.width].map(q).join(',') : '-'}|${o.map((x) => [x.l, x.t, x.r, x.b].map(q).join(',')).join(';')}`;
}

function showBubble(world, text, opts, token) {
  const { who, ms = 3600 } = opts;
  const b = h('div', { class: 'bubble', role: 'status', 'aria-live': 'polite' }, who ? h('span', { class: 'who' }, who) : null, text);
  b.style.visibility = 'hidden';
  document.body.append(b);
  let pick = placeBubble(b, world, opts);
  // a line that fits nowhere is shown a sentence (then a phrase) at a time
  if (pick && pick.cost + pick.title > 0 && (opts.part || 0) < 2) {
    const parts = splitLine(text, true);
    if (parts) { b.remove(); return { parts }; }
  }
  if (pick && pick.cost + pick.title > 0) pick = placeBubble(b, world, opts, { allowTitle: true, allowMove: true });
  b.style.visibility = '';
  currentBubble = b;
  // follow the Mallow (and the pieces) while the line shows
  let last = sig(world, opts.avoid);
  const follow = setInterval(() => {
    if (currentBubble !== b || token !== sayToken) { clearInterval(follow); return; }
    const now = sig(world, opts.avoid);
    if (now === last) return;
    last = now;
    b.classList.add('moving');
    placeBubble(b, world, opts, { allowTitle: true, mode: pick?.mode });
  }, 280);
  return { b, follow, ms };
}

export function say(world, text, opts = {}) {
  const token = ++sayToken;
  clearBubble({ keepToken: true });
  if (!text) return Promise.resolve();
  const run = (t, o) => new Promise((resolve) => {
    if (token !== sayToken) { resolve(); return; }
    const shown = showBubble(world, t, o, token);
    if (shown.parts) {
      // one part at a time, sharing the line's time (each at least 1.6 s);
      // the rest is dropped once the ritual moves on to its next step
      const total = shown.parts.reduce((n, p) => n + p.length, 0);
      const ms = o.ms ?? 3600;
      const step = moveText();
      shown.parts.reduce((p, part, k) => p.then(() => (k && moveText() !== step ? null
        : run(part, { ...o, part: (o.part || 0) + 1, ms: Math.max(1600, Math.round((ms * part.length) / total) + 400) }))), Promise.resolve()).then(resolve);
      return;
    }
    const { b, follow } = shown;
    setTimeout(() => {
      clearInterval(follow);
      if (currentBubble === b) {
        b.classList.add('out'); currentBubble = null; dimTitles(false);
        setTimeout(() => b.remove(), 260);
        restoreRoom();
      }
      resolve();
    }, shown.ms);
  });
  return run(text, opts);
}
export function clearBubble({ keepToken = false } = {}) {
  if (!keepToken) sayToken++;
  currentBubble?.remove(); currentBubble = null; dimTitles(false);
  restoreRoom();
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const pick = (arr, seed = Math.random()) => arr[Math.floor(seed * arr.length) % arr.length];
