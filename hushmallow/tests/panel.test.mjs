// The Hushfold side panel (A8): Another Angle link, Drift on, Stay's pressed state,
// the 'Now: …' line and the crisis lock. Static source checks, then the panel built
// in a small fake DOM with a recording flow.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = readFileSync(`${root}src/hushfold/side-panel.js`, 'utf8');

test('panel source: Another Angle link first in the links, Drift on beside Stay, lock before any flow call', () => {
  // the link, hidden by default, first child of .hf-links, shown for Beyond unless the scene says otherwise
  assert.match(src, /const angleLink = link\('sparkle', 'Another Angle', \(\) => \{ api\.close\(\); if \(onAngle\) onAngle\(\); else app\.go\('angle'\); \}, 'With Zuzu, a fresh side to something real'\);/);
  assert.match(src, /angleLink\.hidden = true;/);
  assert.match(src, /h\('div', \{ class: 'hf-links' \},\s*angleLink,/);
  assert.match(src, /angleLink\.hidden = !\(s\.angle \?\? ent\.has\('ultra'\)\);/);
  // Drift on sits next to Stay longer and calls next()
  assert.match(src, /h\('div', \{ class: 'hf-actions' \}, pauseBtn, finishBtn, stayBtn, driftBtn, favBtn\)/);
  assert.match(src, /kind === 'next'\) \{ if \(flow\?\.next\?\.\(\) !== false\) \{ api\.close\(\); return; \} \}/);
  // (H2/H3: exactly the director's state.canNext; an older director without it: a next or a complete world)
  assert.match(src, /const canNext = typeof st\.canNext === 'boolean' \? st\.canNext : !!\(st\.nextId \|\| st\.complete\);/);
  assert.match(src, /driftBtn\.disabled = !\(world && canNext\) \|\| locked;/);
  // Stay shows the director's staying state, and is a toggle now the director has stay(false) (B1)
  assert.match(src, /stayBtn\.setAttribute\('aria-pressed', String\(!!st\.staying\)\);/);
  assert.match(src, /kind === 'stay'\) flow\?\.stay\?\.\(!st\.staying\);/);
  // the title falls back to the scene's world title
  assert.match(src, /const title = st\.title \?\? s\.worldTitle;/);
  // the crisis lock is checked before the flow is touched (side-panel.js used to call flow.resume() directly)
  const act = src.slice(src.indexOf('async function act('), src.indexOf('const isPaused'));
  assert.ok(act.indexOf('state()?.locked') > 0 && act.indexOf('state()?.locked') < act.indexOf('flow?.resume?.()'));
  assert.match(src, /const LOCKABLE = new Set\(\['pause', 'stay', 'next'\]\);/);
  // the sparkle icon exists
  assert.match(readFileSync(`${root}src/hushfold/icons.js`, 'utf8'), /\bsparkle: '/);
});

// ------------------------------------------------------------- fake DOM --
function installPanelDom() {
  const KEYS = ['document', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  let doc = null;
  class El extends EventTarget {
    constructor(tag) {
      super();
      this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null;
      this.hidden = false; this.disabled = false; this.checked = false; this._text = ''; this.attrs = new Map(); this.style = {};
      const cls = new Set(); this._cls = cls;
      this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c),
        toggle: (c, on) => { const v = on === undefined ? !cls.has(c) : !!on; if (v) cls.add(c); else cls.delete(c); return v; } };
    }
    get className() { return [...this._cls].join(' '); }
    set className(v) { this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this._cls.add(c)); }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children = []; this._text = String(v ?? ''); }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.body; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); if (k === 'class') this.className = v; if (k === 'disabled') this.disabled = true; if (k === 'hidden') this.hidden = true; }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    removeAttribute(k) { this.attrs.delete(k); }
    append(...nodes) { for (const n of nodes) { if (n == null) continue; const c = typeof n === 'object' ? n : doc.createTextNode(n); c.parentNode = this; this.children.push(c); } }
    replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
    remove() { const p = this.parentNode; if (p) { p.children = p.children.filter((c) => c !== this); this.parentNode = null; } }
    focus() { doc.activeElement = this; }
    click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
    *all() { for (const c of this.children) { yield c; yield* c.all(); } }
  }
  doc = { body: new El('body'), activeElement: null };
  doc.createElement = (t) => new El(t);
  doc.createElementNS = (_ns, t) => new El(t);
  doc.createTextNode = (s) => Object.assign(new El('#text'), { nodeType: 3, _text: String(s) });
  Object.assign(globalThis, { document: doc, requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout });
  return { doc, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };

async function makePanel({ tier = 'ultra', flowState = {}, scene = {} } = {}) {
  const { createSidePanel } = await import('../src/hushfold/side-panel.js');
  const calls = [], gone = [];
  const flow = { state: flowState, pause: () => calls.push('pause'), resume: () => calls.push('resume'), stay: () => calls.push('stay'), next: () => calls.push('next'), finish: () => calls.push('finish'), setAutoFlow() {} };
  const app = {
    prefs: { reducedMotion: () => true, get: () => false, set() {} },
    ent: { tier: () => tier, has: (t) => (t === 'paid' ? tier !== 'none' : tier === t) },
    store: memStore(), haptic() {}, audio: { ui() {} }, toast() {}, go: (name) => gone.push(name),
  };
  const sceneState = { mallow: 'glitzi', ...scene };
  const panel = createSidePanel({ app, root: document.body, getFlow: async () => flow, flowAvailable: async () => true, state: () => sceneState, onAngle: scene.onAngle });
  await panel.update();
  const buttons = (within = panel.el) => [...within.all()].filter((n) => n.tagName === 'BUTTON');
  const actions = () => [...panel.el.all()].find((n) => n._cls?.has('hf-actions'));
  // the Hushflow actions are looked up inside .hf-actions (the saved-Hushflow link also says "Resume")
  const btn = (label) => buttons(['Pause', 'Resume', 'Stay longer', 'Drift on', 'Finish', 'Favourite'].includes(label) ? actions() : panel.el)
    .find((b) => b.textContent.trim().startsWith(label));
  const settle = () => new Promise((r) => setTimeout(r, 5));
  return { panel, flow, calls, gone, sceneState, btn, buttons, settle };
}

test('panel: the Another Angle link is first, shown for Beyond only (or as the scene says), and opens the angle', async () => {
  const dom = installPanelDom();
  try {
    const u = await makePanel({ tier: 'ultra' });
    const links = [...u.panel.el.all()].find((n) => n._cls?.has('hf-links'));
    assert.ok(links.children[0].textContent.startsWith('Another Angle'), 'first child of .hf-links');
    const link = u.btn('Another Angle');
    assert.equal(link.hidden, false, 'shown for Beyond');
    u.panel.open(); link.click();
    assert.deepEqual(u.gone, ['angle']);
    assert.equal(u.panel.isOpen, false, 'the panel closes first');
    // the scene can hide it (e.g. after a disclosure) or route it itself
    u.sceneState.angle = false; await u.panel.update();
    assert.equal(link.hidden, true);
    const p = await makePanel({ tier: 'paid' });
    assert.equal(p.btn('Another Angle').hidden, true, 'hidden on Flow');
    const opened = [];
    const routed = await makePanel({ tier: 'paid', scene: { angle: true, onAngle: () => opened.push(1) } });
    routed.btn('Another Angle').click();
    assert.deepEqual(opened, [1]); assert.deepEqual(routed.gone, []);
  } finally { dom.restore(); }
});

test('panel: Drift on calls next() when there is somewhere to drift; Stay shows staying; Now: falls back to the world title', async () => {
  const dom = installPanelDom();
  try {
    const none = await makePanel({ flowState: { worldId: 'static-storm', nextId: null, complete: false } });
    assert.equal(none.btn('Drift on').disabled, true, 'nothing to drift into yet');
    const home = await makePanel({ flowState: {} });
    assert.equal(home.btn('Drift on').disabled, true, 'no world');
    const p = await makePanel({ flowState: { worldId: 'static-storm', nextId: 'luminous-ocean', staying: true }, scene: { worldTitle: 'Glitzi’s Static Storm' } });
    assert.equal(p.btn('Stay longer').getAttribute('aria-pressed'), 'true');
    assert.ok([...p.panel.el.all()].some((n) => n._cls?.has('fine') && n.textContent === 'Now: Glitzi’s Static Storm'));
    const drift = p.btn('Drift on');
    assert.equal(drift.disabled, false);
    p.panel.open(); drift.click(); await p.settle();
    assert.deepEqual(p.calls, ['next']);
    assert.equal(p.panel.isOpen, false, 'the melt plays on the stage');
    // nowhere to drift after all (the director's next() says false): the panel stays open
    const stuck = await makePanel({ flowState: { worldId: 'luminous-ocean', complete: true } });
    stuck.flow.next = () => { stuck.calls.push('next'); return false; };
    stuck.panel.open(); stuck.btn('Drift on').click(); await stuck.settle();
    assert.deepEqual(stuck.calls, ['next']);
    assert.equal(stuck.panel.isOpen, true);
    // a complete world can drift on too; the flow's own title wins
    const c = await makePanel({ flowState: { worldId: 'luminous-ocean', complete: true, title: 'Loomi’s Luminous Ocean', staying: false }, scene: { worldTitle: 'x' } });
    assert.equal(c.btn('Drift on').disabled, false);
    assert.equal(c.btn('Stay longer').getAttribute('aria-pressed'), 'false');
    assert.ok([...c.panel.el.all()].some((n) => n.textContent === 'Now: Loomi’s Luminous Ocean'));
  } finally { dom.restore(); }
});

test('panel: a crisis hold (locked) disables Pause/Resume, Stay and Drift on, and they do nothing; Finish still works', async () => {
  const dom = installPanelDom();
  try {
    const p = await makePanel({ flowState: { worldId: 'static-storm', nextId: 'luminous-ocean', paused: true }, scene: { locked: true } });
    const resume = p.btn('Resume'), stay = p.btn('Stay longer'), drift = p.btn('Drift on'), finish = p.btn('Finish');
    assert.ok(resume && stay && drift && finish);
    assert.deepEqual([resume.disabled, stay.disabled, drift.disabled, finish.disabled], [true, true, true, false]);
    // even a click that gets through (e.g. dispatched) changes nothing
    for (const b of [resume, stay, drift]) b.dispatchEvent(new Event('click'));
    await p.settle();
    assert.deepEqual(p.calls, [], 'no resume, stay or next while locked');
    finish.click(); await p.settle();
    assert.deepEqual(p.calls, ['finish']);
    // unlocked: Resume resumes
    const q = await makePanel({ flowState: { worldId: 'static-storm', paused: true } });
    assert.equal(q.btn('Resume').disabled, false);
    q.btn('Resume').click(); await q.settle();
    assert.deepEqual(q.calls, ['resume']);
  } finally { dom.restore(); }
});

test('panel (H2/H3): Drift on is exactly the director\'s canNext; Stay longer toggles with stay(false)', async () => {
  const dom = installPanelDom();
  try {
    // after the ocean (owner P1) or while safety holds the world: a next id or a complete world is not enough
    const after = await makePanel({ flowState: { worldId: 'luminous-ocean', complete: true, nextId: null, canNext: false } });
    assert.equal(after.btn('Drift on').disabled, true);
    const held = await makePanel({ flowState: { worldId: 'static-storm', nextId: 'luminous-ocean', paused: true, reason: 'safety', canNext: false } });
    assert.equal(held.btn('Drift on').disabled, true, 'held for safety: nothing drifts on');
    // a paused world the person paused: next() resumes and melts, so Drift on is there
    const paused = await makePanel({ flowState: { worldId: 'static-storm', nextId: 'luminous-ocean', paused: true, canNext: true } });
    assert.equal(paused.btn('Drift on').disabled, false);
    paused.panel.open(); paused.btn('Drift on').click(); await paused.settle();
    assert.deepEqual(paused.calls, ['next']);
    // Stay longer: on, then off again (no melt)
    const stays = [];
    const s = await makePanel({ flowState: { worldId: 'static-storm', staying: false, canNext: true } });
    s.flow.stay = (on) => { stays.push(on); s.flow.state = { ...s.flow.state, staying: !!on }; };
    s.btn('Stay longer').click(); await s.settle();
    assert.equal(s.btn('Stay longer').getAttribute('aria-pressed'), 'true');
    s.btn('Stay longer').click(); await s.settle();
    assert.deepEqual(stays, [true, false]);
    assert.equal(s.btn('Stay longer').getAttribute('aria-pressed'), 'false');
  } finally { dom.restore(); }
});
