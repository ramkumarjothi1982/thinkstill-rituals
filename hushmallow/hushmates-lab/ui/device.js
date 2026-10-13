// One person's Hushmates, mounted into an element: the living atmosphere,
// scenes that cross-fade into each other, sheets and gentle notices.
// The lab mounts two (one per test identity); the main app would mount one.

import { h, icon } from './dom.js';
import { Atmosphere } from './atmosphere.js';
import { springCurve, reducedMotion, CSS_EASE } from './motion.js';

export class Device {
  constructor(root, client, { name, onScreen, screens, start = 'home' } = {}) {
    this.root = root;
    this.screens = screens;
    this.startScene = start;
    this.client = client;
    this.name = name;
    this.onScreen = onScreen;
    this.history = [];
    this.current = null;
    this.prefs = { textSize: 1, safetyNoteSeen: false };
    this.memory = {};
    this.env = {};                       // set by the host (the lab says where Mallow perspectives come from)
    root.classList.add('hm-device');
    const atmoEl = h('div');
    this.atmo = new Atmosphere(atmoEl);
    this.atmo.set('dawn', { instant: true });
    this.screenHost = h('div', { class: 'hm-screens' });
    this.sheetRoot = h('div', { class: 'hm-sheet-root' });
    this.toastRoot = h('div', { class: 'hm-toast-root', role: 'status', 'aria-live': 'polite' });
    this.offline = h('div', { class: 'hm-offline', hidden: true }, icon('wifiOff'), h('span', {}, 'You’re offline. Anything unsent will wait for you.'));
    root.append(atmoEl, this.screenHost, this.offline, this.sheetRoot, this.toastRoot);
    client.on((state, detail) => this._changed(state, detail));
  }

  get state() { return this.client.state; }

  start(name = this.startScene, params = {}) {
    this.go(typeof name === 'function' ? name(this.state) : name, params, { replace: true, transition: 'none' });
  }

  /**
   * transition: 'soft' (default), 'back', 'portal' (a bloom of light into a
   * shared place), 'none'
   */
  go(name, params = {}, { replace = false, back = false, transition } = {}) {
    if (this.current && !replace && !back) this.history.push({ name: this.current.name, params: this.current.params });
    const prev = this.current;
    const view = this.screens[name](this, params);
    const el = h('section', { class: `hm-screen hm-screen--${name}`, dataset: { screen: name } }, view.el);
    this.screenHost.append(el);
    this.closeSheet();
    const kind = transition || (back ? 'back' : 'soft');
    const rm = reducedMotion();
    this.atmo.set(view.mood || 'day', { tint: view.tint, glow: view.glow });
    this.atmo.quiet(!!view.quiet);
    if (prev) {
      prev.view.destroy?.();
      prev.el.classList.add('is-leaving');
      prev.el.setAttribute('aria-hidden', 'true');
      prev.el.inert = true;
      const out = rm || kind === 'none' ? [{ opacity: 1 }, { opacity: 0 }]
        : kind === 'portal' ? [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(1.06)', filter: 'blur(10px)' }]
          : [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: `translateY(${back ? 10 : -8}px) scale(.985)`, filter: 'blur(6px)' }];
      const a = prev.el.animate(out, { duration: kind === 'portal' ? 520 : 320, easing: CSS_EASE, fill: 'forwards' });
      a.onfinish = () => prev.el.remove();
      setTimeout(() => prev.el.remove(), 900);
    }
    if (kind !== 'none') {
      const inn = rm ? [{ opacity: 0 }, { opacity: 1 }]
        : kind === 'portal' ? [{ opacity: 0, transform: 'scale(.94)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }]
          : [{ opacity: 0, transform: `translateY(${back ? -10 : 16}px)`, filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }];
      el.animate(inn, { duration: kind === 'portal' ? 900 : 560, delay: prev ? (kind === 'portal' ? 260 : 90) : 0, easing: CSS_EASE, fill: 'backwards' });
      if (kind === 'portal' && !rm) this.atmo.bloom({ y: 0.42 });
    }
    this.current = { name, params, view, el };
    view.mounted?.();
    const focusTarget = el.querySelector('[data-autofocus]') || el.querySelector('h1, h2');
    if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: true }); }
    this.onScreen?.(name, params);
  }
  back() {
    const prev = this.history.pop();
    if (prev) this.go(prev.name, prev.params, { back: true });
    else this.go('home', {}, { back: true });
  }
  home() { this.history = []; this.go('home', {}, { back: true }); }

  _changed(state, detail) {
    this.offline.hidden = state.online;
    this.root.classList.toggle('is-offline', !state.online);
    const cur = this.current;
    if (!cur) return;
    if (cur.view.update) { cur.view.update(state, detail); return; }
    if (cur.view.live) {
      const active = document.activeElement;
      if (active && cur.el.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) return;
      if (this._sheet) return;            // never rebuild behind an open sheet
      const scroller = cur.el.querySelector('.hm-scroll');
      const top = scroller?.scrollTop || 0;
      const fresh = this.screens[cur.name](this, { ...cur.params, refresh: true });
      cur.view.destroy?.();
      cur.el.replaceChildren(fresh.el);
      cur.view = fresh;
      fresh.mounted?.();
      const s2 = cur.el.querySelector('.hm-scroll');
      if (s2) s2.scrollTop = top;
      this.atmo.set(fresh.mood || 'day', { tint: fresh.tint, glow: fresh.glow });
      this.atmo.quiet(!!fresh.quiet);
    }
  }

  // --------------------------------------------------------------- sheets --
  sheet({ title, body, actions = [], label, dismissible = true, onClose, art = null }) {
    this.closeSheet(true);
    const close = () => this.closeSheet();
    const panel = h('div', { class: 'hm-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label || title || 'Options' },
      h('span', { class: 'hm-sheet-grab', 'aria-hidden': 'true' }),
      dismissible ? h('button', { type: 'button', class: 'hm-sheet-close', 'aria-label': 'Close', onclick: close }, icon('x')) : null,
      art ? h('div', { class: 'hm-sheet-art' }, art) : null,
      title ? h('h2', { class: 'hm-sheet-title', 'data-autofocus': '' }, title) : null,
      h('div', { class: 'hm-sheet-body' }, body),
      actions.length ? h('div', { class: 'hm-sheet-actions' }, actions) : null);
    const scrim = h('div', { class: 'hm-scrim', onclick: () => dismissible && close() });
    const wrap = h('div', { class: 'hm-sheet-wrap' }, scrim, panel);
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); close(); }
      if (e.key === 'Tab') trapFocus(panel, e);
    });
    this.sheetRoot.append(wrap);
    if (!reducedMotion()) {
      const s = springCurve({ stiffness: 300, damping: 30 });
      panel.animate(s.pts.map((v) => ({ transform: `translateY(${60 * (1 - v)}px) scale(${0.97 + 0.03 * v})`, opacity: Math.min(1, v * 1.5) })), { duration: s.duration, easing: 'linear', fill: 'backwards' });
    }
    scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: CSS_EASE });
    this._sheet = { wrap, panel, scrim, onClose, returnFocus: document.activeElement };
    const f = panel.querySelector('[data-autofocus]') || panel.querySelector('button, input, textarea');
    if (f) { if (!f.matches('button, input, textarea')) f.setAttribute('tabindex', '-1'); setTimeout(() => f.focus({ preventScroll: true }), 30); }
    return { close, panel };
  }
  closeSheet(immediate = false) {
    const s = this._sheet;
    if (!s) return;
    this._sheet = null;
    s.wrap.inert = true;
    if (immediate || reducedMotion()) s.wrap.remove();
    else {
      s.panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(40px) scale(.98)' }], { duration: 220, easing: CSS_EASE, fill: 'forwards' });
      s.scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = () => s.wrap.remove();
      setTimeout(() => s.wrap.remove(), 400);
    }
    s.onClose?.();
    if (s.returnFocus && this.root.contains(s.returnFocus) && s.returnFocus.isConnected) s.returnFocus.focus?.({ preventScroll: true });
  }

  confirm({ title, text, confirmLabel = 'Confirm', cancelLabel = 'Not now', danger = false, art = null, extra = null }) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); this.closeSheet(); } };
      this.sheet({
        title, art,
        body: extra ? h('div', { class: 'kit-stack' }, h('p', { class: 'hm-sheet-text' }, text), extra) : h('p', { class: 'hm-sheet-text' }, text),
        actions: [
          h('button', { type: 'button', class: `kit-btn ${danger ? 'kit-btn--quiet-danger' : 'kit-btn--ink'} kit-btn--block`, onclick: () => finish(true), dataset: { test: 'confirm' } }, confirmLabel),
          h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => finish(false) }, cancelLabel),
        ],
        onClose: () => { if (!done) { done = true; resolve(false); } },
      });
    });
  }

  /** A soft notice pill near the top (system feedback only, never a person's words). */
  toast(text, { tone = 'calm', ms = 2800 } = {}) {
    const t = h('div', { class: `hm-toast hm-toast--${tone}` }, h('span', { class: 'hm-toast-dot', 'aria-hidden': 'true' }), h('span', {}, text));
    this.toastRoot.append(t);
    const rm = reducedMotion();
    t.animate(rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: CSS_EASE });
    setTimeout(() => {
      const a = t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 300, easing: CSS_EASE, fill: 'forwards' });
      a.onfinish = () => t.remove();
    }, ms);
  }

  /** Runs an action; shows the service's own words if it says no. */
  async run(fn, { ok } = {}) {
    try {
      const r = await fn();
      if (ok) this.toast(ok);
      return r;
    } catch (e) {
      this.toast(e?.message || 'Something went wrong. Please try again.', { tone: 'warn', ms: 4200 });
      return undefined;
    }
  }
}

function trapFocus(panel, e) {
  const items = [...panel.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
  if (!items.length) return;
  const first = items[0]; const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
