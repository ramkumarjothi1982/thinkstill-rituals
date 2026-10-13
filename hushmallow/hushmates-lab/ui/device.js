// One person's Hushmates interface, mounted into an element. The lab mounts
// two (one per test identity); the main app would mount one.

import { h, icon } from './dom.js';
import { SCREENS } from './screens/index.js';

export class Device {
  constructor(root, client, { name, onScreen } = {}) {
    this.root = root;
    this.client = client;
    this.name = name;
    this.onScreen = onScreen;
    this.history = [];
    this.current = null;
    this.prefs = { textSize: 1, safetyNoteSeen: false };
    this.memory = {};      // per-screen remembered UI state (filters, drafts)
    root.classList.add('hm-device');
    this.screenHost = h('div', { class: 'hm-screens' });
    this.sheetRoot = h('div', { class: 'hm-sheet-root' });
    this.toastRoot = h('div', { class: 'hm-toast-root', role: 'status', 'aria-live': 'polite' });
    this.offline = h('div', { class: 'hm-offline', hidden: true }, icon('wifiOff'), h('span', {}, 'Offline. Messages will wait for you to retry.'));
    root.append(this.offline, this.screenHost, this.sheetRoot, this.toastRoot);
    client.on((state, detail) => this._changed(state, detail));
  }

  get state() { return this.client.state; }

  start() {
    const me = this.state.me;
    this.go(me?.profile ? 'home' : 'welcome', {}, { replace: true });
  }

  go(name, params = {}, { replace = false, back = false } = {}) {
    if (this.current && !replace && !back) this.history.push({ name: this.current.name, params: this.current.params });
    const prev = this.current;
    const def = SCREENS[name];
    const view = def(this, params);
    const el = h('section', { class: `hm-screen hm-screen--${name} ${back ? 'is-back' : ''}`, dataset: { screen: name } }, view.el);
    this.screenHost.append(el);
    if (prev) {
      prev.view.destroy?.();
      prev.el.classList.add('is-leaving');
      setTimeout(() => prev.el.remove(), 320);
    }
    this.closeSheet();
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
      const scroller = cur.el.querySelector('.hm-body');
      const top = scroller?.scrollTop || 0;
      const fresh = SCREENS[cur.name](this, cur.params);
      cur.view.destroy?.();
      cur.el.replaceChildren(fresh.el);
      cur.view = fresh;
      fresh.mounted?.();
      const s2 = cur.el.querySelector('.hm-body');
      if (s2) s2.scrollTop = top;
    }
  }

  // --------------------------------------------------------------- sheets --
  sheet({ title, body, actions = [], label, dismissible = true, onClose }) {
    this.closeSheet();
    const close = () => this.closeSheet();
    const panel = h('div', { class: 'hm-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label || title || 'Options' },
      h('div', { class: 'hm-sheet__grab', 'aria-hidden': 'true' }),
      title ? h('h2', { class: 'hm-sheet__title', 'data-autofocus': '' }, title) : null,
      h('div', { class: 'hm-sheet__body' }, body),
      actions.length ? h('div', { class: 'hm-sheet__actions' }, actions) : null);
    const scrim = h('div', { class: 'hm-scrim', onclick: () => dismissible && close() });
    const wrap = h('div', { class: 'hm-sheet-wrap' }, scrim, panel);
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); close(); }
      if (e.key === 'Tab') trapFocus(panel, e);
    });
    this.sheetRoot.append(wrap);
    this._sheet = { wrap, onClose, returnFocus: document.activeElement };
    const f = panel.querySelector('[data-autofocus]') || panel.querySelector('button, input, textarea');
    if (f) { if (!f.matches('button, input, textarea')) f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
    return { close };
  }
  closeSheet() {
    const s = this._sheet;
    if (!s) return;
    this._sheet = null;
    s.wrap.classList.add('is-closing');
    setTimeout(() => s.wrap.remove(), 220);
    s.onClose?.();
    if (s.returnFocus && this.root.contains(s.returnFocus)) s.returnFocus.focus?.({ preventScroll: true });
  }

  confirm({ title, text, confirmLabel = 'Confirm', cancelLabel = 'Not now', danger = false }) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); this.closeSheet(); } };
      this.sheet({
        title,
        body: h('p', { class: 'hm-p' }, text),
        actions: [
          h('button', { class: `hm-btn ${danger ? 'hm-btn--danger' : 'hm-btn--primary'}`, onclick: () => finish(true), dataset: { test: 'confirm' } }, confirmLabel),
          h('button', { class: 'hm-btn hm-btn--ghost', onclick: () => finish(false) }, cancelLabel),
        ],
        onClose: () => { if (!done) { done = true; resolve(false); } },
      });
    });
  }

  toast(text, { tone = 'calm', ms = 2600 } = {}) {
    const t = h('div', { class: `hm-toast hm-toast--${tone}` }, text);
    this.toastRoot.append(t);
    setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 300); }, ms);
  }

  /** Runs an action; shows the service's own words if it says no. */
  async run(fn, { ok } = {}) {
    try {
      const r = await fn();
      if (ok) this.toast(ok);
      return r;
    } catch (e) {
      this.toast(e?.message || 'Something went wrong. Please try again.', { tone: 'warn', ms: 3800 });
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
