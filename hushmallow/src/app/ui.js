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
let currentBubble = null;
export function say(world, text, { who, ms = 3600, above = true } = {}) {
  currentBubble?.remove();
  if (!text) return Promise.resolve();
  const rect = world.mallowRect();
  const b = h('div', { class: 'bubble', role: 'status', 'aria-live': 'polite' }, who ? h('span', { class: 'who' }, who) : null, text);
  document.body.append(b);
  const bw = Math.min(b.offsetWidth, innerWidth - 24);
  const x = Math.max(12, Math.min(innerWidth - bw - 12, rect.cx - bw / 2));
  // never cover a ritual's instructions: above the Mallow if it fits under the
  // title block, else below the Mallow (above the controls), else over the Mallow
  const bh = b.offsetHeight;
  const titles = [...document.querySelectorAll('#scene .move-title')].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0);
  const minTop = titles.length ? Math.max(...titles.map((r) => r.bottom)) + 8 : 12;
  const dock = document.querySelector('#scene .dock');
  let maxBottom = dock && dock.children.length ? dock.getBoundingClientRect().top - 8 : innerHeight - 12;
  // nor a card's text (e.g. Meet a Mallow's ritual card)
  const cardTop = [...document.querySelectorAll('#scene .card')].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0).reduce((m, r) => Math.min(m, r.top), Infinity);
  if (cardTop < Infinity) maxBottom = Math.min(maxBottom, cardTop - 8);
  let y = rect.top + rect.height * 0.12 - bh - 6;
  let below = false;
  if (!above || y < minTop) {
    const yb = rect.bottom + 12;
    if (yb + bh <= maxBottom) { y = yb; below = true; } else y = Math.max(minTop, Math.min(y, maxBottom - bh));
  }
  b.classList.toggle('below', below);
  b.style.left = `${x}px`;
  b.style.top = `${Math.max(12, y)}px`;
  b.style.setProperty('--tail', `${Math.max(20, Math.min(bw - 20, rect.cx - x))}px`);
  currentBubble = b;
  return new Promise((resolve) => {
    setTimeout(() => {
      if (currentBubble === b) { b.classList.add('out'); setTimeout(() => b.remove(), 260); currentBubble = null; }
      resolve();
    }, ms);
  });
}
export function clearBubble() { currentBubble?.remove(); currentBubble = null; }

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const pick = (arr, seed = Math.random()) => arr[Math.floor(seed * arr.length) % arr.length];
