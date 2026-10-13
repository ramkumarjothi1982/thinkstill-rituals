// QA-around (final QA sweep, "everything around the main screen"):
//   * every openSheet() sheet is a layer with its own history entry: Back (or an
//     iOS edge swipe) closes the newest sheet first and never leaves it floating
//     over the next scene; a scene change closes the sheets still open; a scene
//     that tracks its own sheets (the Hushfold's trackSheet) owns that entry and
//     no second one is added; Escape closes the newest sheet only
//     (src/app/ui.js createSheetHistory + openSheet, src/app/layers.js, main.js);
//   * a ritual's own Back keeps the ritual's name in the address bar.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

// ------------------------------------------------------------ a tiny DOM --
class FakeEl {
  constructor(tag, doc) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1; this.doc = doc; this.children = []; this.attrs = {}; this.style = {};
    this.listeners = {}; this.parentNode = null; this.textContent = '';
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
  append(...kids) { for (const k of kids) { if (k.parentNode) k.remove(); k.parentNode = this; this.children.push(k); } }
  remove() { const p = this.parentNode; if (!p) return; p.children.splice(p.children.indexOf(this), 1); this.parentNode = null; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
  dispatch(t, ev = {}) { for (const fn of [...(this.listeners[t] || [])]) fn(ev); }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  get isConnected() { let x = this; while (x.parentNode) x = x.parentNode; return x === this.doc.root; }
  focus() { this.doc.activeElement = this; }
  matches(sel) {
    return sel.split(',').map((s) => s.trim()).some((s) => {
      if (s.startsWith('.')) return this.classList.contains(s.slice(1));
      if (s.startsWith('[') && s.endsWith(']')) return this.hasAttribute(s.slice(1, -1));
      if (s.startsWith('#')) return this.attrs.id === s.slice(1);
      return false;
    });
  }
  querySelector(sel) {
    for (const c of this.children) { if (c.matches?.(sel)) return c; const d = c.querySelector?.(sel); if (d) return d; }
    return null;
  }
}
function fakeDom() {
  const doc = {
    listeners: {}, activeElement: null,
    createElement: (t) => new FakeEl(t, doc),
    createElementNS: (_, t) => new FakeEl(t, doc),
    createTextNode: (t) => Object.assign(new FakeEl('#text', doc), { textContent: String(t) }),
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); },
    removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); },
    key(k) { const ev = { key: k }; for (const fn of [...(this.listeners.keydown || [])]) fn(ev); return ev; },
    getElementById(id) { return id === 'sheet-root' ? sheetRoot : doc.root.querySelector(`#${id}`); },
    querySelector() { return null; },
  };
  doc.root = new FakeEl('html', doc);
  doc.body = new FakeEl('body', doc);
  doc.root.append(doc.body);
  const sheetRoot = new FakeEl('div', doc);
  sheetRoot.attrs.id = 'sheet-root';
  doc.body.append(sheetRoot);
  doc.activeElement = doc.body;
  return { doc, sheetRoot };
}
const frames = [];
function installDom() {
  const { doc, sheetRoot } = fakeDom();
  globalThis.document = doc;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  return { doc, sheetRoot };
}
const flushFrames = () => frames.splice(0).forEach((f) => f());
const breath = () => new Promise((r) => queueMicrotask(r));

// ------------------------------------------------ a browser's history --
/**
 * Same-document history: pushState/replaceState, go(n) as a queued traversal
 * that fires one popstate. webkit: true keeps only the newest scheduled
 * traversal (two history.back() calls in a row land as one).
 */
function fakeHistory({ webkit = false } = {}) {
  const h = {
    entries: [{ state: { i: 0 }, url: '#home' }], at: 0, pending: [], onpop: null,
    get state() { return h.entries[h.at].state; },
    get hash() { return h.entries[h.at].url; },
    pushState(state, _t, url) { h.entries.splice(h.at + 1); h.entries.push({ state, url: url ?? h.hash }); h.at = h.entries.length - 1; },
    replaceState(state, _t, url) { h.entries[h.at] = { state, url: url ?? h.hash }; },
    go(n) { if (webkit) h.pending = [n]; else h.pending.push(n); setTimeout(() => h.flush(), 0); },
    back() { h.go(-1); },
    flush() {
      while (h.pending.length) {
        const n = h.pending.shift();
        const to = h.at + n;
        if (to < 0 || to >= h.entries.length) continue;
        h.at = to;
        h.onpop?.({ state: h.state });
      }
    },
    /** The person presses Back (or swipes). */
    userBack() { h.go(-1); return new Promise((r) => setTimeout(r, 5)); },
  };
  return h;
}

/** main.js's layer wiring, on a fake history: the same calls main.js makes. */
async function appShell({ webkit = false } = {}) {
  const { createLayers, closeLayerOnBack } = await import('../src/app/layers.js');
  const { createSheetHistory, setSheetHistory, openSheets } = await import('../src/app/ui.js');
  // sheets a previous test left open belong to its page: gone, without its history
  setSheetHistory(null);
  for (const s of openSheets()) s.close('test');
  const hist = fakeHistory({ webkit });
  const stack = [{ name: 'home' }];
  const app = { scene: null, went: [] };
  const layers = createLayers({ history: hist, index: () => stack.length - 1, here: () => hist.hash });
  const sheets = createSheetHistory({ push: () => layers.push(), pop: (t) => layers.popMany([t]) });
  setSheetHistory(sheets);
  app.pushLayer = () => { const t = layers.push(); sheets.claim(t); return t; };
  app.popLayer = (t) => { layers.popMany([t]); };
  app.go = async (name) => {
    await layers.settled();
    if (layers.popMany(sheets.closeAll())) await layers.settled();
    layers.forget();
    stack.push({ name }); hist.pushState({ i: stack.length - 1 }, '', `#${name}`);
    app.went.push(name);
  };
  hist.onpop = (e) => {
    const t = layers.onPop();
    if (t === 'ours') return;
    if (t) { closeLayerOnBack(t, { sheets, scene: app.scene }); return; }
    if (app.scene?.blockBack) { hist.pushState({ i: stack.length - 1 }, '', `#${stack[stack.length - 1]?.name || 'home'}`); app.scene.blockBack(); return; }
    stack.length = Math.max(1, (e.state?.i ?? 0) + 1);
    app.went.push(`pop:${stack[stack.length - 1].name}`);
  };
  return { hist, stack, app, layers, sheets, setSheetHistory };
}

// --------------------------------------------------------------- tests --
test('sheets: Back closes the open sheet and stays on the scene (Settings: Delete everything / Support lines)', async () => {
  const { sheetRoot } = installDom();
  const { openSheet } = await import('../src/app/ui.js');
  const S = await appShell();
  await S.app.go('settings');
  assert.equal(S.hist.hash, '#settings');
  let closedWith = null;
  const s = openSheet({ title: 'Delete everything?', body: 'x', onClose: (r) => { closedWith = r; } });
  flushFrames();
  assert.equal(S.hist.entries.length, 2, 'home and Settings until the breath is over…');
  await breath();
  assert.equal(S.hist.entries.length, 3, '…then the sheet has an entry of its own');
  assert.equal(S.hist.hash, '#settings', 'under the scene’s own name');
  await S.hist.userBack();
  assert.equal(closedWith, 'back', 'Back closed the sheet');
  assert.ok(!s.el.classList.contains('open'));
  assert.deepEqual(S.app.went, ['settings'], 'and did not leave Settings');
  assert.equal(S.hist.hash, '#settings');
  // the next Back leaves Settings as usual
  await S.hist.userBack();
  assert.deepEqual(S.app.went, ['settings', 'pop:home']);
  assert.equal(sheetRoot.children.length >= 0, true);
});

test('sheets: closing a sheet another way (✕, its own button, Escape) removes its entry, once', async () => {
  installDom();
  const { openSheet } = await import('../src/app/ui.js');
  const S = await appShell();
  await S.app.go('plans');
  const s = openSheet({ title: 'Support', body: 'x' });
  await breath();
  assert.equal(S.hist.at, 2);
  s.close();
  s.close();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(S.hist.at, 1, 'stepped back over the sheet’s entry');
  assert.equal(S.hist.hash, '#plans');
  assert.deepEqual(S.app.went, ['plans'], 'that step back is ours: no navigation');
  // a sheet closed in the same breath it opened never gets an entry at all
  const q = openSheet({ title: 'Quick', body: 'x' });
  q.close();
  await breath();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(S.hist.at, 1);
});

test('sheets: a sheet over a sheet takes two Backs, newest first; Escape closes only the newest', async () => {
  const { doc } = installDom();
  const { openSheet, openSheets } = await import('../src/app/ui.js');
  const S = await appShell();
  await S.app.go('settings');
  const consent = openSheet({ title: 'Another Angle and your words', body: 'x' });
  await breath();
  const support = openSheet({ title: 'Support', body: 'x' });
  await breath();
  assert.equal(openSheets().length, 2);
  doc.key('Escape');
  assert.deepEqual(openSheets().map((x) => x.el), [consent.el], 'Escape: the support sheet only');
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(S.hist.at, 2, 'its entry went with it');
  await S.hist.userBack();
  assert.equal(openSheets().length, 0, 'Back: then the consent sheet');
  assert.deepEqual(S.app.went, ['settings']);
  void support;
});

test('sheets: a scene that tracks its own sheet (the Hushfold trackSheet) owns its entry; no second one is added', async () => {
  installDom();
  const { openSheet, openSheets } = await import('../src/app/ui.js');
  const S = await appShell();
  // the Hushfold's pattern: trackSheet(openSupport(app)) asks for a layer in the same breath
  const own = new Map();
  S.app.scene = { get blockBack() { return (t) => { const sh = own.get(t); if (sh) { own.delete(t); sh.close('back'); } }; } };
  const sh = openSheet({ title: 'Support', body: 'x' });
  const t = S.app.pushLayer();
  own.set(t, sh);
  await breath();
  assert.equal(S.hist.entries.length, 2, 'home + the scene’s one entry for its sheet');
  await S.hist.userBack();
  assert.equal(openSheets().length, 0, 'the scene closed it by its token');
  assert.equal(S.hist.at, 0);
  // a scene that forgets to close its claimed sheet on Back: the sheet still goes
  S.app.scene = { blockBack: () => {} };
  openSheet({ title: 'Support', body: 'x' });
  S.app.pushLayer();
  await breath();
  await S.hist.userBack();
  assert.equal(openSheets().length, 0, 'a sheet never outlives the entry it was opened with');
});

test('sheets: Back on a sheet over a scene layer (Another Angle input + support) closes the sheet, then the layer', async () => {
  installDom();
  const { openSheet, openSheets } = await import('../src/app/ui.js');
  const S = await appShell();
  await S.app.go('angle');
  let overlay = 'open';
  const tOverlay = S.app.pushLayer();
  S.app.scene = { get blockBack() { return overlay === 'open' ? (t) => { assert.equal(t, tOverlay); overlay = 'closed'; } : null; } };
  openSheet({ title: 'Support', body: 'x' });   // Another Angle's header "Need support now?" (src/beyond, unchanged)
  await breath();
  await S.hist.userBack();
  assert.equal(openSheets().length, 0, 'first Back: the sheet');
  assert.equal(overlay, 'open', 'the input under it stays');
  await S.hist.userBack();
  assert.equal(overlay, 'closed', 'second Back: the input');
  assert.deepEqual(S.app.went, ['angle'], 'still in Another Angle');
});

test('sheets: a scene change closes every open sheet and steps back over their entries in one traversal (WebKit too)', async () => {
  installDom();
  const { openSheet, openSheets } = await import('../src/app/ui.js');
  const S = await appShell({ webkit: true });
  await S.app.go('angle');
  const reasons = [];
  openSheet({ title: 'A', body: 'x', onClose: (r) => reasons.push(r) });
  await breath();
  openSheet({ title: 'B', body: 'x', onClose: (r) => reasons.push(r) });
  await breath();
  assert.equal(S.hist.entries.length, 4);
  await S.app.go('home');   // e.g. Another Angle finishing by itself
  assert.equal(openSheets().length, 0);
  assert.deepEqual(reasons, ['scene', 'scene']);
  assert.deepEqual(S.hist.entries.map((e) => e.url), ['#home', '#angle', '#home'], 'no sheet entry left behind under the new scene');
  // Back from there goes to Another Angle's own entry, not to a leftover duplicate
  await S.hist.userBack();
  assert.equal(S.hist.hash, '#angle');
});

test('layers: a layer opened while our own step back is in flight waits for it to land', async () => {
  const { createLayers } = await import('../src/app/layers.js');
  const hist = fakeHistory({ webkit: true });
  const L = createLayers({ history: hist, here: () => hist.hash });
  hist.onpop = () => { L.onPop(); };
  const a = L.push();
  assert.equal(hist.entries.length, 2);
  L.popMany([a]);           // the panel closes…
  const b = L.push();       // …as the overlay opens, in one tap
  assert.equal(hist.entries.length, 2, 'the new entry waits');
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(hist.at, 1, 'popped back to home, then pushed the overlay’s entry');
  assert.deepEqual(L.open, [b]);
  assert.equal(L.popMany([999]), 0, 'an unknown token steps over nothing');
});

test('main.js wires sheets into the layers: Back on a sheet first, the safety net on a scene change, the ritual keeps its name', () => {
  const main = read('src/app/main.js');
  assert.match(main, /const sheets = createSheetHistory\(\{ push: \(\) => layers\.push\(\), pop: \(t\) => layers\.popMany\(\[t\]\) \}\);\s*setSheetHistory\(sheets\);/);
  assert.match(main, /app\.pushLayer = \(\) => \{ const t = layers\.push\(\); sheets\.claim\(t\); return t; \};/);
  assert.match(main, /if \(t\) \{ closeLayerOnBack\(t, \{ sheets, scene: current \}\); return; \}/);
  // the safety net runs once the next scene has loaded, before its entry is pushed
  const go = main.slice(main.indexOf('app.go = async function go('), main.indexOf('app.back = '));
  assert.ok(go.indexOf('layers.popMany(sheets.closeAll())') > go.indexOf('await load()'));
  assert.ok(go.indexOf('layers.popMany(sheets.closeAll())') < go.indexOf('history.pushState'));
  // a ritual's "Leave this ritual?" Back: the entry comes back under the ritual's name, not the previous entry's
  assert.match(main, /history\.pushState\(\{ i: stack\.length - 1 \}, '', `#\$\{stack\[stack\.length - 1\]\?\.name \|\| 'home'\}`\); current\.blockBack\(\);/);
  assert.doesNotMatch(main, /pushState\(\{ i: stack\.length - 1 \}, '', location\.hash\); current\.blockBack/);
  // deep links: only #account (sign-in builds) is honoured, said where it happens
  assert.match(main, /#account is the only one honoured/);
});

test('ui.js: openSheet reports open and close to the history hooks, Escape is for the newest sheet only', () => {
  const ui = read('src/app/ui.js');
  assert.match(ui, /try \{ sheetHooks\?\.closed\?\.\(handle, reason\); \}[^\n]*\n\s*onClose\?\.\(reason\);/, 'the entry goes before onClose (a scene change from onClose lands after it)');
  assert.match(ui, /liveSheets\[liveSheets\.length - 1\] !== handle\) return;/);
  assert.match(ui, /requestAnimationFrame\(\(\) => \{ if \(!closed\)/, 'a sheet closed before its first frame never shows');
});
