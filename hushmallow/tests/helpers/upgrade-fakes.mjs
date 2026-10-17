// Shared fakes for the upgrade experience's tests (tests/upgrade-flow.test.mjs, tests/upgrade-plans.test.mjs): our
// server's billing routes (sync {} answering in turn), a signed-in account holding a plan, this tab's sessionStorage,
// the confirmation's UI recorded, and a tiny DOM that openSheet() and the scenes can run in.
import { createBilling, PATHS } from '../../src/app/billing.js';
import { createEntitlements } from '../../src/app/entitlements.js';
import { createStore } from '../../src/engine/storage.js';

export const EP = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';
export const CONFIG = { provider: 'stripe', endpoint: EP };
export const tick = () => new Promise((r) => setTimeout(r, 0));
export const sleepFor = (ms) => new Promise((r) => setTimeout(r, ms));
/** The globals a test file replaces, and a way to put them back (its after()). */
export function keepGlobals() {
  const prev = { document: globalThis.document, window: globalThis.window, location: globalThis.location, requestAnimationFrame: globalThis.requestAnimationFrame, sessionStorage: globalThis.sessionStorage };
  return () => { for (const [k, v] of Object.entries(prev)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; } };
}

export const plan = (tier, period, status = 'active', extra = {}) => ({ tier, period, status, current_period_end: '2026-11-17T09:00:00.000Z', cancel_at_period_end: false, ends_at: null, manageable: true, ...extra });
/** Our server's billing routes, faked; sync {} answers from `answers` in turn (the last one stays). */
export function stripeServer({ status = plan('paid', 'monthly') } = {}) {
  const s = { calls: [], status, answers: null, sync: null, portal: { http: 200, body: { url: 'https://billing.stripe.com/p/session/test_portal' } }, down: false, hold: null };
  s.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : null;
    s.calls.push({ path, body, method: init.method });
    if (s.hold) await s.hold;
    if (s.down) throw new TypeError('Failed to fetch');
    const reply = (http, b) => new Response(JSON.stringify(b), { status: http, headers: { 'content-type': 'application/json' } });
    if (path === PATHS.status) return reply(200, s.status);
    if (path === PATHS.sync) {
      if (s.sync) { const a = typeof s.sync === 'function' ? s.sync(body) : s.sync; return reply(a.http, a.body); }
      if (s.answers) { const b = s.answers.length > 1 ? s.answers.shift() : s.answers[0]; s.status = b; return reply(200, b); }
      return reply(404, {});
    }
    if (path === PATHS.portal) { const a = typeof s.portal === 'function' ? s.portal(body) : s.portal; return reply(a.http, a.body); }
    return reply(404, {});
  };
  return s;
}
export function authHandle({ signedIn = true } = {}) {
  const h = { enabled: true, status: () => (h.signedIn ? 'signed-in' : 'guest'), signedIn };
  h.load = async () => ({ accessToken: async () => 'eyJhbGciOi.account-token.sig' });
  return h;
}
/** Two accounts' ids, as the namespace keeps them (src/auth/namespace.js). */
export const UID_A = '11111111-2222-4333-8444-555555555555';
export const UID_B = '66666666-7777-4888-9999-aaaaaaaaaaaa';
/**
 * A signed-in account holding `held` (the plan as kept before the trip), its billing and entitlements. uid: the page runs
 * in that account's namespace (a guest's when not signed in), as main.js's store does; store: a store to start from.
 */
export async function account({ held = plan('paid', 'monthly'), signedIn = true, uid = undefined, store = null } = {}) {
  const server = stripeServer({ status: held });
  const navs = [];
  const billing = createBilling({ auth: () => authHandle({ signedIn }), signIn: true, config: CONFIG, fetchImpl: server.fetch, nav: (u) => navs.push(u) });
  const st = store || createStore({ backend: 'memory' });
  if (uid !== undefined) st.namespace = uid ? Object.freeze({ mode: 'account', uid }) : Object.freeze({ mode: 'guest', uid: null });
  const ent = createEntitlements({ store: st, billing });
  if (signedIn && held) await ent.refresh({ force: true });
  server.calls.length = 0;
  return { server, billing, ent, navs };
}
export function memSession() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
/** The confirmation's UI, recorded. */
export function fakeUi() {
  const events = [];
  return {
    events,
    confirming: () => { events.push(['confirming']); return { say: (t, _ms, st) => events.push(['say', t, st]), close: () => events.push(['close']) }; },
    say: (t, _ms, st) => events.push(['say', t, st]),
    welcome: (r) => { events.push(['welcome', r]); },
    paymentIssue: (line) => events.push(['payment', line]),
  };
}

export class FakeEl {
  constructor(tag, doc) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1; this.doc = doc;
    this.children = []; this.attrs = {}; this.style = {}; this.listeners = {}; this.parentNode = null; this.textContent = ''; this.disabled = false;
    const el = this;
    this.classList = {
      list: () => (el.attrs.class || '').split(/\s+/).filter(Boolean),
      add(...c) { el.attrs.class = [...new Set([...this.list(), ...c])].join(' '); },
      remove(...c) { el.attrs.class = this.list().filter((x) => !c.includes(x)).join(' '); },
      contains(c) { return this.list().includes(c); },
      toggle(c, on) { const has = this.contains(c); const want = on === undefined ? !has : !!on; if (want) this.add(c); else this.remove(c); return want; },
    };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return k in this.attrs; }
  toggleAttribute(k, on) { if (on) this.attrs[k] = ''; else delete this.attrs[k]; }
  append(...kids) {
    for (const k of kids) {
      if (k.parentNode) k.remove();
      k.parentNode = this; this.children.push(k);
      if (k.tagName === 'LINK') queueMicrotask(() => k.dispatch('load'));   // a stylesheet "loads"
    }
  }
  replaceChildren(...kids) { for (const c of this.children) c.parentNode = null; this.children = []; this.append(...kids); }
  remove() { const p = this.parentNode; if (!p) return; p.children.splice(p.children.indexOf(this), 1); this.parentNode = null; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
  dispatch(t, ev = {}) { for (const fn of [...(this.listeners[t] || [])]) fn({ currentTarget: this, ...ev }); }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  get isConnected() { let x = this; while (x.parentNode) x = x.parentNode; return !!this.doc && x === this.doc.root; }
  focus() { if (this.doc) this.doc.activeElement = this; }
  matches(sel) {
    return sel.split(',').map((s) => s.trim()).some((s) => {
      if (s.startsWith('.')) return this.classList.contains(s.slice(1));
      if (s.startsWith('[') && s.endsWith(']')) return this.hasAttribute(s.slice(1, -1));
      if (s.startsWith('#')) return this.attrs.id === s.slice(1);
      return this.tagName === s.toUpperCase();
    });
  }
  querySelector(sel) { for (const c of this.children) { if (c.matches?.(sel)) return c; const d = c.querySelector?.(sel); if (d) return d; } return null; }
  querySelectorAll(sel) { return all(this).slice(1).filter((n) => n.matches?.(sel)); }
  getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
}
export const text = (n) => (n.nodeType === 3 ? n.textContent : (n.children || []).map(text).join('') || n.textContent || '');
export const all = (n, out = []) => { out.push(n); for (const c of n.children || []) all(c, out); return out; };
export function installDom(hostname = 'claude-launch-rc.hushmallow.pages.dev') {
  const doc = {
    listeners: {}, activeElement: null,
    createElement: (t) => new FakeEl(t, doc), createElementNS: (_, t) => new FakeEl(t, doc),
    createTextNode: (t) => Object.assign(new FakeEl('#text', doc), { textContent: String(t) }),
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); },
    removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); },
    key(k) { const ev = { key: k }; for (const fn of [...(this.listeners.keydown || [])]) fn(ev); return ev; },
    getElementById: (id) => (id === 'sheet-root' ? sheetRoot : null),
    querySelector: () => null, querySelectorAll: () => [],
  };
  doc.root = new FakeEl('html', doc);
  doc.head = new FakeEl('head', doc);
  doc.body = new FakeEl('body', doc);
  doc.documentElement = doc.root;
  doc.root.append(doc.head, doc.body);
  const scene = new FakeEl('main', doc);
  scene.attrs.id = 'scene';
  const sheetRoot = new FakeEl('div', doc);
  sheetRoot.attrs.id = 'sheet-root';
  doc.body.append(scene, sheetRoot);
  doc.activeElement = doc.body;
  globalThis.document = doc;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.location = { hostname, protocol: 'https:', search: '', href: `https://${hostname}/`, origin: `https://${hostname}` };
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  return { doc, scene, sheetRoot };
}
export const click = async (btn) => { await btn.listeners.click[0]({ currentTarget: btn }); await tick(); };


export function welcomeApp({ reduced = false, lowStim = false, mallow = null } = {}) {
  const log = { haptics: [], reacts: [], went: [] };
  const prefs = { reducedMotion: () => reduced, get: (k) => (k === 'lowStim' ? lowStim : k === 'mallow' ? mallow : null) };
  return { log, app: { prefs, haptic: (k) => log.haptics.push(k), world: { react: (k) => log.reacts.push(k) }, go: (n) => log.went.push(n) } };
}
