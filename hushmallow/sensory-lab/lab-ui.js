// Small DOM helpers for the Sensory Lab chrome (no framework).

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

const P = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 8.5a5 5 0 0 1 0 7"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  mesh: '<path d="M4 4h16v16H4z"/><path d="M4 12h16M12 4v16M4 4l16 16"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.6-2.2L3.2 14.6a1.5 1.5 0 0 1 2.3-1.9L8 15"/>',
  note: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  friend: '<circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10.5" r="2.5"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4 4 0 0 1 7 0"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
};

/** Any 24-px stroke paths in the lab's icon wrapper (for a feature's own icon table). */
export function svgIcon(paths) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths || ''}</svg>`;
}

export function icon(name) {
  return svgIcon(P[name]);
}

export function iconBtn(name, label, onClick, attrs = {}) {
  return h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, title: label, html: icon(name), onclick: onClick, ...attrs });
}

/** A brief, unobtrusive label for what the Mallow just understood. */
export function feedbackChip(parent) {
  const el = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  parent.append(el);
  let timer = 0;
  return {
    el,
    show(text) {
      el.textContent = text;
      el.classList.add('on');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('on'), 1100);
    },
  };
}

/**
 * Screen-reader announcements (visually hidden live region). Within gapMs of the
 * last spoken message only the newest pending text is kept, spoken when the gap
 * ends. Each message is cleared, then set 30 ms later, so a repeat is announced again.
 */
export function announcer(parent, { gapMs = 0 } = {}) {
  const el = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  parent.append(el);
  const log = [];
  let last = -Infinity, pending = '', gapT = 0, setT = 0;
  const speak = (text) => {
    gapT = 0; pending = ''; last = performance.now();
    el.textContent = '';
    clearTimeout(setT);
    setT = setTimeout(() => { el.textContent = text; }, 30);
    log.push(text); if (log.length > 10) log.shift();
  };
  return {
    el,
    say(text) {
      text = text == null ? '' : String(text);
      if (!text) return;
      const wait = last + gapMs - performance.now();
      if (wait <= 0 && !gapT) { speak(text); return; }
      pending = text;
      if (!gapT) gapT = setTimeout(() => speak(pending), Math.max(0, wait));
    },
    destroy() { clearTimeout(gapT); clearTimeout(setT); gapT = 0; pending = ''; el.remove(); },
    get log() { return log.slice(); },
  };
}

/** Segmented single-choice control. el.set(v) selects without calling onChange. */
export function segmented(options, value, onChange, label) {
  const wrap = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
  const btns = options.map(([v, text]) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': String(v === value),
    onclick: () => { for (const b of btns) b.setAttribute('aria-checked', String(b === btn(v))); onChange(v); },
  }, text));
  const btn = (v) => btns[options.findIndex((o) => o[0] === v)];
  // radio-group keyboard pattern: one tab stop, arrow keys move and select
  const sync = () => {
    for (const b of btns) b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
    if (!btns.some((b) => b.tabIndex === 0)) btns[0].tabIndex = 0;   // never leave a group unreachable
  };
  wrap.addEventListener('click', sync);
  wrap.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = btns.indexOf(document.activeElement);
    const next = btns[(i + step + btns.length) % btns.length];
    next.focus(); next.click();
  });
  wrap.append(...btns);
  sync();
  wrap.set = (v) => {
    const b = btn(v);
    if (!b) return;   // unknown value: keep the current choice
    for (const x of btns) x.setAttribute('aria-checked', String(x === b));
    sync();
  };
  return wrap;
}

/** Bottom sheet. content: () => Node. Returns close(). */
export function openSheet(root, title, content, { onClose = null } = {}) {
  const scrim = h('div', { class: 'sheet-scrim' });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    scrim.classList.remove('on'); sheet.classList.remove('on');
    // while it fades out, a closing sheet must not swallow the next tap
    scrim.style.pointerEvents = 'none'; sheet.style.pointerEvents = 'none';
    document.removeEventListener('keydown', esc);
    setTimeout(() => { scrim.remove(); sheet.remove(); }, 300);
    onClose?.();   // once, whatever closed it: Done, the scrim, Escape or the returned close()
  };
  const esc = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      // keep keyboard focus inside the sheet while it is open
      const f = tabbable();
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  const tabbable = () => [...sheet.querySelectorAll('button, input, select, [tabindex]')]
    .filter((el) => !el.disabled && el.tabIndex >= 0 && el.offsetParent !== null);
  scrim.addEventListener('click', close);
  sheet.append(h('h3', {}, title), content(close), h('button', { class: 'done', type: 'button', onclick: close }, 'Done'));
  root.append(scrim, sheet);
  document.addEventListener('keydown', esc);
  requestAnimationFrame(() => { scrim.classList.add('on'); sheet.classList.add('on'); tabbable()[0]?.focus({ preventScroll: true }); });
  return close;
}

/**
 * Press-and-hold button: start on press (pointer or keyboard), stop on release.
 */
export function holdButton(label, onStart, onEnd, attrs = {}) {
  const b = h('button', { type: 'button', class: 'chip hold', ...attrs }, label);
  let on = false;
  const start = (e) => { if (on) return; on = true; b.classList.add('active'); e?.preventDefault?.(); onStart(); };
  const end = () => { if (!on) return; on = false; b.classList.remove('active'); onEnd(); };
  b.addEventListener('pointerdown', (e) => { try { b.setPointerCapture(e.pointerId); } catch { /* ignore */ } start(e); });
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
  b.addEventListener('lostpointercapture', end);
  b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
  b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') end(); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  b.addEventListener('blur', end);
  return b;
}
