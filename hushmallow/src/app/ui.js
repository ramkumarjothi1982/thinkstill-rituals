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
// rects a ritual passes as `avoid`; in a ritual without them, the play area
// under the Mallow's crown). It prefers the space just above the Mallow's
// head (tail pointing down), then just below it or beside it, then any free
// band, getting compact if that helps (never below the 19px dialogue size).
// With no free band it borrows the title band (the prompt dims while the
// line shows); if even that is too small it shows the line a sentence (then
// a phrase) at a time, and as a last resort the Mallow steps down or shrinks
// a little and goes back afterwards. It never drops onto the face, and it
// follows the Mallow if the Mallow moves while it speaks.
let currentBubble = null;
let sayToken = 0;
const PIECES = '#scene button, #scene .chip, #scene .choice, #scene input, #scene textarea, #scene select, #scene .ask, #scene [data-say-avoid], .angle-stage > *, .angle-stage [data-say-avoid], #fx-layer > :not(canvas), #fx-layer > :not(canvas) > *, #fx-layer [data-say-avoid]';
const TEXTS = '#scene h1, #scene h2, #scene h3, #scene p, #scene .eyebrow, #scene .muted, #scene .lede';
// cost per px² of overlap (the face is never an option while anything else is)
const COST = { face: 400, body: 60, bar: 80, barBtn: 80, dock: 60, piece: 50, card: 40, text: 30, title: 30 };
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
  for (const el of document.querySelectorAll('#scene .topbar')) {
    add(visibleRect(el), 'bar', el);
    // its controls stay clear even when a line borrows the bar's quiet middle
    for (const c of el.querySelectorAll('button, a, .eyebrow, [role="button"]')) add(visibleRect(c), 'barBtn', c);
  }
  for (const el of document.querySelectorAll('#scene .dock')) if (el.children.length) add(visibleRect(el), 'dock', el);
  for (const el of document.querySelectorAll('#scene .move-title')) add(visibleRect(el), 'title', el);
  for (const el of document.querySelectorAll('#scene .card, #scene .ultra-card, #scene .summary-card')) add(visibleRect(el), 'card', el);
  for (const el of document.querySelectorAll(PIECES)) if (!el.closest('.topbar, .dock') && el.getAttribute('data-say-avoid') !== 'off') add(visibleRect(el), 'piece', el);
  for (const el of document.querySelectorAll(TEXTS)) if (!el.closest('.topbar, .dock, .move-title, .card')) add(visibleRect(el), 'text', el);
  try { for (const r of (typeof avoid === 'function' ? avoid() : avoid) || []) add(r, 'piece'); } catch { /* a ritual's rects are optional */ }
  const m = mallowBox(world);
  // In a ritual, the play area around and under the Mallow holds pieces drawn
  // on canvas (lanterns, the wave, the knot…) that the DOM can't see. Unless
  // the ritual names its pieces (`avoid`), only the space above the Mallow's
  // head — kept free for its lines — and the title band are fair game.
  if (m && avoid === undefined && document.querySelector('#scene .ritual-ui')) {
    const dockTop = out.filter((o) => o.kind === 'dock').reduce((v, o) => Math.min(v, o.t), innerHeight);
    if (dockTop > m.top) out.push({ l: 0, t: m.top + m.height * 0.06, r: innerWidth, b: dockTop, kind: 'piece' });
  }
  if (m) {
    // the crown may meet the tail; the eyes and mouth never get covered
    add({ left: m.left + m.width * 0.06, top: m.top + m.height * 0.06, right: m.right - m.width * 0.06, bottom: m.bottom }, 'body');
    add({ left: m.left + m.width * 0.12, top: m.top + m.height * 0.16, right: m.right - m.width * 0.12, bottom: m.top + m.height * 0.8 }, 'face');
  }
  return { list: out, mallow: m };
}

// the top bar and the dock always stay clear (unless nothing fits between them)
// the status bar / notch: #scene's top padding is safe-top + 14px
const safeTop = () => { const sc = document.getElementById('scene'); return sc ? Math.max(0, parseFloat(getComputedStyle(sc).paddingTop) - 14) : 0; };
function bounds(obs, bh, relaxTop = false) {
  const top = safeTop() + 8;
  const bar = relaxTop ? 0 : obs.list.filter((o) => o.kind === 'bar').reduce((m, o) => Math.max(m, o.b), 0);
  const dock = obs.list.filter((o) => o.kind === 'dock').reduce((m, o) => Math.min(m, o.t), innerHeight);
  let yMin = Math.max(top, bar + 6), yMax = Math.min(innerHeight - 10, dock - 6) - bh;
  if (yMax < yMin) { yMin = top; yMax = innerHeight - 10 - bh; }
  return { yMin, yMax, dockTop: Math.min(innerHeight - 10, dock) };
}

function setMode(b, mode) {
  b.classList.toggle('compact', mode !== 'normal');
  b.classList.toggle('wide', mode === 'wide');
}

/** The best spot for one bubble size: the nearest free one, the nearest one
 *  that only covers the title (which then dims), and the least bad one. */
function bestSpot(b, mode, obs, { above = true, relaxTop = false } = {}) {
  setMode(b, mode);
  const bw = Math.min(b.offsetWidth, innerWidth - 24), bh = b.offsetHeight;
  const sc = document.getElementById('scene')?.getBoundingClientRect();
  const xMin = Math.max(12, (sc?.left ?? 0) + 8), xMax = Math.max(xMin, Math.min(innerWidth - 12, (sc?.right ?? innerWidth) - 8) - bw);
  const m = obs.mallow;
  const cx = m ? m.cx : innerWidth / 2;
  const xs = [...new Set([Math.max(xMin, Math.min(xMax, cx - bw / 2)), xMin, xMax].map(Math.round))];
  const { yMin, yMax } = bounds(obs, bh, relaxTop);
  const PAD = 6;
  let free = null, titled = null, any = null;
  for (const x of xs) {
    for (let y = yMin; y <= yMax; y += 3) {
      let cost = 0, title = 0, blocked = false;
      for (const o of obs.list) {
        const w = Math.min(x + bw + PAD, o.r) - Math.max(x - PAD, o.l);
        if (w <= 0) continue;
        const hgt = Math.min(y + bh + PAD, o.b) - Math.max(y - PAD, o.t);
        if (hgt <= 0) continue;
        if (o.kind === 'barBtn') { blocked = true; break; }   // the top bar's controls: never covered
        // the title band (and, when relaxed, the top bar's quiet middle) can be borrowed
        if (o.kind === 'title' || (relaxTop && o.kind === 'bar')) title += w * hgt; else cost += w * hgt * COST[o.kind];
      }
      if (blocked) continue;
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
  const t = String(text);
  const m = t.match(/^(.{14,}?[,;:—–])\s+(.{12,})$/);
  if (m) return [m[1], m[2]];
  // no pause in it: break at the space nearest the middle, as subtitles do
  if (t.length < 28) return null;
  const mid = t.length / 2;
  let at = -1;
  for (let i = t.indexOf(' '); i > 0; i = t.indexOf(' ', i + 1)) if (at < 0 || Math.abs(i - mid) < Math.abs(at - mid)) at = i;
  return at > 8 && at < t.length - 8 ? [t.slice(0, at), t.slice(at + 1)] : null;
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
function makeRoom(world, obs, bh, { force = false } = {}) {
  const m = obs.mallow, cur = layerVars();
  if (!m || !cur || typeof world?.place !== 'function') return false;
  const { yMin, dockTop } = bounds(obs, bh);
  const headTop = yMin + bh + 10;               // where the crown may start
  const need = headTop - m.top;
  if (need <= 0) return false;
  // free room under the body (none if pieces, cards or text sit there)
  let below = dockTop - 8 - m.bottom;
  for (const o of obs.list) {
    if (o.kind === 'body' || o.kind === 'face' || o.kind === 'title' || o.kind === 'bar' || o.kind === 'dock') continue;
    if (o.r > m.left && o.l < m.right && o.b > m.bottom - 2 && o.t < m.bottom + below) below = Math.max(0, Math.min(below, o.t - 8 - m.bottom));
  }
  let next;
  if (need <= below) next = { x: cur.x, y: cur.y + (need / innerHeight) * 100, s: cur.s };
  else {
    const bottom = Math.min(dockTop - 8, m.bottom + Math.max(0, below));
    const avail = bottom - headTop;
    // never shrink a Mallow to a speck (a little further only rather than cover its face)
    if (avail < m.height * (force ? 0.3 : 0.45)) return false;
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

function placeBubble(b, world, opts, { allowTitle = false, allowMove = false, mode, dry = false } = {}) {
  const above = opts.above !== false;
  const modes = mode ? [mode] : MODES;
  const search = (obs, relaxTop) => modes.map((md) => bestSpot(b, md, obs, { above, relaxTop }));
  const choose = (r) => r.find((x) => x.free)?.free || (allowTitle ? r.find((x) => x.titled)?.titled : null) || null;
  let obs = collectObstacles(world, opts.avoid);
  let r = search(obs, false);
  let pick = choose(r);
  // the title band, then the top bar's quiet middle too (its buttons stay clear)
  if (!pick && allowTitle) { const r2 = search(obs, true); pick = choose(r2); if (!pick) r = r2; }
  if (!pick && allowMove && obs.mallow) {
    for (const force of [false, true]) {
      const wide = r[r.length - 1].any;
      if (!wide || !makeRoom(world, obs, wide.bh, { force })) continue;
      obs = collectObstacles(world, opts.avoid);
      r = search(obs, false); pick = choose(r);
      if (!pick) { r = search(obs, true); pick = choose(r); }
      if (pick) break;
    }
  }
  if (!pick) pick = r.map((x) => x.any).filter(Boolean).sort((a, z) => a.sc - z.sc)[0];
  if (!pick || dry) return pick || null;
  setMode(b, pick.mode);
  const m = obs.mallow;
  const tailUp = m && pick.y >= m.bottom - 4 && pick.y - m.bottom < 44;
  const tailDown = m && pick.y + pick.bh <= m.top + m.height * 0.2 && m.top - (pick.y + pick.bh) < 44;
  const overX = m && pick.x < m.right - m.width * 0.12 && pick.x + pick.bw > m.left + m.width * 0.12;
  // beside the Mallow (wide screens, short lines): the tail points sideways
  const overY = m && pick.y < m.bottom && pick.y + pick.bh > m.top;
  const toLeft = m && overY && !overX && pick.x + pick.bw <= m.left + m.width * 0.12 && m.left - (pick.x + pick.bw) < 44;
  const toRight = m && overY && !overX && pick.x >= m.right - m.width * 0.12 && pick.x - m.right < 44;
  b.classList.toggle('below', !!(tailUp && overX));
  b.classList.toggle('tail-r', !!toLeft);
  b.classList.toggle('tail-l', !!toRight);
  b.classList.toggle('no-tail', !(((tailUp || tailDown) && overX) || toLeft || toRight));
  if (m) b.style.setProperty('--tail-y', `${Math.max(18, Math.min(pick.bh - 18, m.top + m.height * 0.42 - pick.y))}px`);
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

/** Joins neighbouring parts back together for as long as they still fit somewhere free. */
function groupParts(world, parts, opts) {
  const fits = (t) => {
    const probe = h('div', { class: 'bubble', 'aria-hidden': 'true' }, opts.who ? h('span', { class: 'who' }, opts.who) : null, t);
    probe.style.visibility = 'hidden';
    document.body.append(probe);
    const p = placeBubble(probe, world, opts, { dry: true, allowTitle: true });
    probe.remove();
    return !!p && p.cost === 0;
  };
  const out = [];
  for (let i = 0; i < parts.length;) {
    let k = parts.length;
    for (; k > i + 1; k--) if (!(i === 0 && k === parts.length) && fits(parts.slice(i, k).join(' '))) break;
    out.push(parts.slice(i, k).join(' '));
    i = k;
  }
  return out;
}

function showBubble(world, text, opts, token) {
  const { who, ms = 3600 } = opts;
  const b = h('div', { class: 'bubble', role: 'status', 'aria-live': 'polite' }, who ? h('span', { class: 'who' }, who) : null, text);
  b.style.visibility = 'hidden';
  document.body.append(b);
  // free space first, then the title band (the prompt dims while it shows)
  let pick = placeBubble(b, world, opts, { allowTitle: true });
  // a line that fits nowhere is shown a sentence (then a phrase) at a time
  if (pick && pick.cost > 0 && (opts.part || 0) < 2) {
    const parts = splitLine(text, true);
    if (parts) { b.remove(); return { parts: groupParts(world, parts, opts) }; }
  }
  if (pick && pick.cost > 0) pick = placeBubble(b, world, opts, { allowTitle: true, allowMove: true });
  b.style.visibility = '';
  currentBubble = b;
  // follow the Mallow (and the pieces) while the line shows; a line belongs
  // to its step, so it bows out once the ritual moves on (after a moment)
  let last = sig(world, opts.avoid);
  const step = moveText(), shownAt = Date.now();
  const follow = setInterval(() => {
    if (currentBubble !== b || token !== sayToken) { clearInterval(follow); return; }
    if (moveText() !== step && Date.now() - shownAt > 1200) {
      clearInterval(follow);
      b.classList.add('out'); currentBubble = null; dimTitles(false);
      setTimeout(() => b.remove(), 260);
      restoreRoom();
      return;
    }
    const now = sig(world, opts.avoid);
    if (now === last) return;
    last = now;
    b.classList.add('moving');
    // the Mallow moved or grew (or a new piece arrived): find a new spot, and
    // if nowhere is free any more, let the Mallow make room again
    const p = placeBubble(b, world, opts, { allowTitle: true, mode: pick?.mode });
    if (p && p.cost > 0) placeBubble(b, world, opts, { allowTitle: true, allowMove: true });
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

/**
 * Fit the Mallow into the open band between two viewport y's (px). When the
 * band is too small to show a Mallow worth looking at, it fades out instead
 * of ghosting under text. Returns whether it is shown.
 */
export function fitMallow(world, top, bottom, { maxScale = 1, minPx = 64, x = 50 } = {}) {
  const band = bottom - top;
  if (band < minPx) { world.showMallow?.(false); return false; }
  world.showMallow?.(true);
  const H = document.getElementById('mallow-layer')?.offsetHeight || 470;
  const scale = Math.min(maxScale, band / (0.66 * H));
  if (scale >= 0.35) world.fitBetween(top, bottom, { maxScale, x });
  else world.place({ x, y: (((top + bottom) / 2 - 0.05 * H * scale) / innerHeight) * 100, scale });
  return true;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const pick = (arr, seed = Math.random()) => arr[Math.floor(seed * arr.length) % arr.length];
