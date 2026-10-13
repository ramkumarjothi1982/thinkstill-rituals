// Integration H2 + H3, review round 2: a world melting away takes what it was still saying with it (its discovery
// line held for a tap, its Continue, its passing lines), and its garden offer never comes over the next world's host
// — the director offers only for a world on stage, the subtitles drop one world's lines, the shell does both at the
// melt's start and ignores an offer from a world that has melted away. Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { STATUS, createRegistry } from '../src/hushfold/flow/registry.js';
import { createSubtitles } from '../src/hushfold/subtitles.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');
const scene = read('src/app/scenes/hushfold.js');
const fnBody = (src, start, end) => { const a = src.indexOf(start); assert.ok(a >= 0, start); const b = src.indexOf(end, a + start.length); return src.slice(a, b > a ? b : undefined); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------- director harness --
function installCanvasDom() {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const ctx2d = () => new Proxy({
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 8 }), getTransform: () => ({ a: 1, e: 0 }),
  }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => ({ style: {}, className: '', width: 0, height: 0, children: [], setAttribute() {}, getContext: () => ctx2d(), append(...c) { this.children.push(...c); }, remove() {}, addEventListener() {}, removeEventListener() {}, clientWidth: 390, clientHeight: 844 });
  globalThis.document = { createElement: () => el(), addEventListener() {}, removeEventListener() {}, hidden: false };
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return { el, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
function world(id, { next = [], ctl = {}, discoveries = {}, mallow = null } = {}) {
  return {
    id, title: `${id} title`, status: STATUS.PLAYABLE, mallow: mallow ? { id: mallow } : undefined,
    fits: { emotions: { other: 1 }, intentions: {} }, next, dialogue: { complete: `${id}: stay, or drift on?` },
    discoveries, memory: {}, palette: { sky: '#111', deep: '#000' }, sound: {},
    load: async () => ({
      create(ctx) {
        ctl.ctx = ctx;
        ctl.discover = (d) => ctx.discover(d, {});
        return {
          async prepare() {}, enter() { ctx.say([`${id} intro`], { kind: 'dialogue' }); },
          frame() {}, pointer() {}, get progress() { return ctl.progress ?? 0; }, get complete() { return !!ctl.complete; }, get metrics() { return {}; },
          handoff: () => ({ horizonY: 500 }), outro() {}, intro() {}, serialize() { return { v: 1 }; }, restore() {}, pause() {}, resume() {}, destroy() {},
        };
      },
    }),
  };
}
/** Subtitles that keep a held line waiting until the test lets it go (as the person's tap, or the shell's drop, would). */
function heldSubs() {
  const said = [], held = [];
  return {
    said, held,
    say(lines, o = {}) {
      said.push({ lines: [].concat(lines).map((l) => (typeof l === 'string' ? l : l.text)), world: o.world ?? null, hold: !!o.hold, kind: o.kind });
      if (!o.hold) return Promise.resolve(true);
      let resolve; const p = new Promise((r) => { resolve = r; }); held.push({ world: o.world, resolve }); return p;
    },
    choice(q, opts, o = {}) { said.push({ choice: q, world: o.world ?? null }); return new Promise(() => {}); },
    clear() {}, pause() {}, resume() {},
    get holding() { return false; },
  };
}
async function until(D, fn, n = 600) { for (let i = 0; i < n && !fn(); i++) { D.debug.step(1 / 60); await sleep(1); } return fn(); }

async function meltWithHeldLine({ tapBefore }) {
  const dom = installCanvasDom();
  const { createHushflow } = await import('../src/hushfold/flow/director.js');
  const ctlA = {}, subs = heldSubs(), events = [];
  const A = world('storm', { next: ['ocean'], ctl: ctlA, mallow: 'glitzi', discoveries: { stillness: { lines: ['The storm let go a little.'], skillId: 'slowing-down' } } });
  const B = world('ocean', { mallow: 'loomi', discoveries: { distance: { lines: ['Further out, it is smaller.'], skillId: 'more-room' } } });
  const D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), registry: createRegistry([A, B]), ticker: fakeTicker(), store: memStore(), reducedMotion: true, subtitles: subs });
  for (const ev of ['offer', 'melt', 'world']) D.on(ev, (d) => events.push({ ev, ...d }));
  try {
    await D.start({ worldId: 'storm' });
    await until(D, () => D.state.phase === 'playing');
    assert.equal(ctlA.discover('stillness'), true);
    const line = subs.held.find((h) => h.world === 'storm');
    assert.ok(line, 'the discovery line is held, tagged with its world');
    if (tapBefore) { line.resolve(true); await sleep(5); }
    assert.equal(D.next(), true, 'Drift on');
    await until(D, () => D.state.phase === 'melting');
    // the line lets go during the melt (the shell drops the melting world's lines; or the person taps Continue now)
    if (!tapBefore) { line.resolve(false); await sleep(5); }
    await until(D, () => D.state.phase === 'playing' && D.state.worldId === 'ocean');
    for (let i = 0; i < 30; i++) { D.debug.step(1 / 60); await sleep(1); }
    return { events, subs, D };
  } finally { D.destroy(); dom.restore(); }
}

test('director: the storm\'s held discovery line resolving after its melt began offers nothing (no storm offer over the ocean)', async () => {
  const { events, subs } = await meltWithHeldLine({ tapBefore: false });
  const offers = events.filter((e) => e.ev === 'offer');
  assert.deepEqual(offers, [], `no offer from a world melting away: ${JSON.stringify(offers)}`);
  assert.ok(events.some((e) => e.ev === 'world' && e.id === 'ocean'), 'the ocean arrived');
  // every line the worlds said carries its world (the shell drops one world's lines by it)
  assert.ok(subs.said.filter((s) => s.lines?.length).every((s) => s.world === 'storm' || s.world === 'ocean'), JSON.stringify(subs.said));
  assert.ok(subs.said.some((s) => s.world === 'ocean' && /ocean intro/.test(s.lines?.join(' '))), 'the ocean\'s own lines are its own');
});

test('director: tapped in the storm before Drift on, the storm\'s offer comes as before (in the storm)', async () => {
  const { events } = await meltWithHeldLine({ tapBefore: true });
  const offers = events.filter((e) => e.ev === 'offer');
  assert.equal(offers.length, 1);
  assert.equal(offers[0].worldId, 'storm');
  const meltAt = events.findIndex((e) => e.ev === 'melt' && e.k === 0);
  assert.ok(events.indexOf(offers[0]) < meltAt, 'offered before the melt began');
});

test('director: a world melting in may offer its own discovery during the melt', async () => {
  const dom = installCanvasDom();
  const { createHushflow } = await import('../src/hushfold/flow/director.js');
  const ctlB = {}, subs = heldSubs(), offers = [];
  const A = world('storm', { next: ['ocean'] });
  const B = world('ocean', { ctl: ctlB, discoveries: { distance: { lines: ['Further out.'], skillId: 'more-room' } } });
  const D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), registry: createRegistry([A, B]), ticker: fakeTicker(), store: memStore(), reducedMotion: false, subtitles: subs });
  D.on('offer', (d) => offers.push(d));
  try {
    await D.start({ worldId: 'storm' });
    await until(D, () => D.state.phase === 'playing');
    D.next();
    await until(D, () => D.state.phase === 'melting');
    assert.equal(ctlB.discover('distance'), true);
    subs.held.find((h) => h.world === 'ocean').resolve(true);
    await sleep(5);
    assert.deepEqual(offers.map((o) => o.worldId), ['ocean']);
  } finally { D.destroy(); dom.restore(); }
});

// --------------------------------------------------------- subtitles --
function installDom() {
  const KEYS = ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'innerWidth', 'innerHeight'];
  const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  let doc = null;
  class El extends EventTarget {
    constructor(tag) {
      super();
      this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null;
      this.hidden = false; this._text = ''; this.attrs = new Map();
      const props = new Map();
      this.style = { setProperty: (k, v) => props.set(k, v), getPropertyValue: (k) => props.get(k) ?? '', removeProperty: (k) => props.delete(k) };
      const cls = new Set(); this._cls = cls;
      this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c),
        toggle: (c, on) => { const v = on === undefined ? !cls.has(c) : !!on; if (v) cls.add(c); else cls.delete(c); return v; } };
    }
    get className() { return [...this._cls].join(' '); }
    set className(v) { this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this._cls.add(c)); }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children = []; this._text = String(v ?? ''); }
    get firstChild() { return this.children[0] || null; }
    get offsetHeight() { return 0; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); if (k === 'class') this.className = v; if (k === 'hidden') this.hidden = true; }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    removeAttribute(k) { this.attrs.delete(k); if (k === 'hidden') this.hidden = false; }
    append(...nodes) { for (const n of nodes) { if (n == null) continue; const c = typeof n === 'object' ? n : doc.createTextNode(n); c.parentNode = this; this.children.push(c); } }
    replaceChildren(...nodes) { for (const c of this.children) c.parentNode = null; this.children = []; this._text = ''; this.append(...nodes); }
    remove() { const p = this.parentNode; if (p) { p.children = p.children.filter((c) => c !== this); this.parentNode = null; } }
    focus() { doc.activeElement = this; }
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
    *all() { for (const c of this.children) { yield c; yield* c.all(); } }
    querySelector(sel) { const c = sel.replace(/^\./, ''); for (const n of this.all()) if (n._cls?.has(c)) return n; return null; }
  }
  doc = { body: new El('body'), activeElement: null, addEventListener() {}, removeEventListener() {}, createRange: () => { throw new Error('no ranges here'); } };
  doc.createElement = (t) => new El(t);
  doc.createElementNS = (_ns, t) => new El(t);
  doc.createTextNode = (s) => Object.assign(new El('#text'), { nodeType: 3, _text: String(s) });
  Object.assign(globalThis, { document: doc, requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout, innerWidth: 390, innerHeight: 844 });
  return { doc, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}

test('subtitles.drop(match): the melting world\'s held line (and its Continue) goes; the next world\'s line follows at once; others stay', async () => {
  const dom = installDom();
  try {
    const subs = createSubtitles({ root: dom.doc.body, prefs: { get: () => 1, set() {} } });
    const shown = () => [...dom.doc.body.all()].filter((n) => n._cls?.has('hf-sub')).map((n) => n.textContent).join(' | ');
    const held = subs.say(['The storm let go a little.'], { kind: 'discovery', hold: true, who: 'Glitzi', world: 'static-storm', interrupt: true, first: true });
    const passing = subs.say('Everything’s crackling in here.', { kind: 'dialogue', who: 'Glitzi', world: 'static-storm' });
    const mine = subs.say('Breathe with me.', { who: 'Boppo' });
    await sleep(300);
    assert.equal(subs.holding, true);
    assert.match(shown(), /Glitzi: The storm let go a little\./);
    // the melt begins; the ocean's host speaks as it comes in
    const loomi = subs.say('Oh, hello. It’s softer here.', { kind: 'dialogue', who: 'Loomi', world: 'luminous-ocean' });
    assert.equal(subs.drop((o) => o.world === 'static-storm'), true);
    assert.equal(subs.drop((o) => o.world === 'nowhere'), false, 'nothing of that world: nothing dropped');
    assert.equal(await held, false, 'the held line resolves unanswered');
    assert.equal(await passing, false, 'its queued passing line goes too');
    await sleep(800);
    assert.equal(subs.holding, false, 'nothing of the old world waits for a tap');
    assert.doesNotMatch(shown(), /Glitzi/);
    assert.match(shown(), /Boppo: Breathe with me\./, 'a line that is not the world\'s stays and comes next');
    subs.skip(); await sleep(800);
    assert.match(shown(), /Loomi:/, 'then the ocean\'s');
    assert.equal(await Promise.race([loomi.then(() => 'done'), sleep(10).then(() => 'pending')]), 'pending');
    void mine;
    subs.destroy();
  } finally { dom.restore(); }
});

// ------------------------------------------------------------- shell --
test('shell wiring: the melt\'s start drops the melting world\'s lines; an offer from a world that melted away is ignored', () => {
  assert.match(scene, /f\.on\?\.\('melt', \(d\) => \{ if \(d\?\.k === 0\) onMeltBegins\(d\); panel\?\.update\(\); \}\);/);
  const begins = fnBody(scene, 'function onMeltBegins(d) {', 'function onFinished() {');
  assert.match(begins, /loadMallowAssets\(d\.mallow\)/, 'the incoming host\'s art still starts loading');
  assert.match(begins, /S\.meltedFrom = d\.from;/);
  assert.match(begins, /subtitles\.drop\?\.\(\(o\) => o\?\.world === d\.from\);/);
  const offer = fnBody(scene, 'async function onOffer(', 'function offerAvoid() {');
  const guard = offer.indexOf('if (worldId && worldId === S.meltedFrom) return;');
  assert.ok(guard > 0 && guard < offer.indexOf('await import('), 'checked before anything is shown');
  const onWorld = fnBody(scene, 'function onWorld(d) {', 'function ');
  assert.match(onWorld, /if \(d\?\.id && d\.id === S\.meltedFrom\) S\.meltedFrom = null;/, 'a world entered again offers again');
});
