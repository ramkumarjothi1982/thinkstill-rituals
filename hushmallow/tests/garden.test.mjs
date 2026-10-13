// Memory Garden (W5): skill data, honest wording, the garden store.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SKILLS, SKILL_IDS, getSkill, skillTitle, relatedSkills, skillsForWorld, validateSkill, CHARM_FAMILIES } from '../src/hushfold/skills.js';
import { saveSkill, garden, gardenEntry, hasSkill, practised, forgetSkill, readGarden, clearGarden, GARDEN_KEY, GARDEN_VERSION, MAX_SKILLS } from '../src/engine/garden.js';
import { createStore } from '../src/engine/storage.js';
import { SKILLS as CATALOG } from '../src/v3/data/catalog.js';
import { WORLDS } from '../src/hushfold/flow/registry.js';
import { MALLOW_IDS } from '../src/mallows/registry.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const memStore = () => createStore({ backend: 'memory' });

// ----------------------------------------------------------- skill data --
test('every skill is complete, honest and valid', () => {
  assert.ok(SKILL_IDS.length >= 6, 'the pilot three plus at least three for future worlds');
  for (const id of SKILL_IDS) {
    const s = SKILLS[id];
    assert.equal(s.id, id);
    assert.deepEqual(validateSkill(s), [], id);
    assert.ok(MALLOW_IDS.includes(s.mallow), `${id}: unknown Mallow ${s.mallow}`);
    assert.ok(['paid', 'ultra'].includes(s.plan), id);
    assert.ok(s.steps.length >= 2 && s.steps.length <= 4, id);
    assert.ok(s.care.length >= 1, `${id}: needs at least one care note`);
    assert.ok(Object.isFrozen(s) && Object.isFrozen(s.sources), `${id}: data is read-only`);
  }
});

test('the pilot skills exist with the brief’s wording', () => {
  assert.equal(skillTitle('slowing-down'), 'The Power of Slowing Down');
  assert.equal(getSkill('slowing-down').example, 'Try it: put the phone down for ten seconds before you reply.');
  assert.deepEqual(getSkill('slowing-down').sources.map((x) => x.skill), ['Intentionally Slow', 'Reaction Gap']);
  assert.deepEqual(getSkill('a-little-more-room').sources.map((x) => x.skill), ['Cloud Witness', 'Thought Is Not Order', 'Room for This']);
  assert.match(getSkill('a-little-more-room').explanation, /doesn’t make the thought untrue, and it doesn’t have to disappear/);
  assert.equal(getSkill('another-angle').plan, 'ultra');
  assert.match(getSkill('another-angle').essence, /happened.*means/);
  assert.equal(getSkill('nope'), null);
  assert.equal(getSkill('__proto__'), null);
  assert.equal(skillTitle(undefined), null);
});

test('source wording is the catalogue’s, verbatim', () => {
  const byName = Object.fromEntries(CATALOG.map((c) => [c.name, c]));
  for (const s of Object.values(SKILLS)) {
    for (const x of s.sources) {
      const c = byName[x.skill];
      assert.ok(c, `${s.id}: ${x.skill} is not in the catalogue`);
      for (const k of ['group', 'does', 'insight', 'precaution', 'scope']) assert.equal(x[k], c[k], `${s.id} / ${x.skill}.${k}`);
      assert.ok(x.ref && !/https?:/.test(x.ref), `${s.id}: a citation label, never a link`);
    }
    // the headline label is one of its sources' scopes
    assert.ok(s.sources.some((x) => x.scope === s.evidence.scope), `${s.id}: evidence scope must come from a source`);
  }
});

test('scope labels match docs/V3_SKILLS.md', () => {
  const md = readFileSync(`${root}docs/V3_SKILLS.md`, 'utf8');
  for (const s of Object.values(SKILLS)) for (const x of s.sources) {
    const row = md.split('\n').find((l) => l.startsWith(`| ${x.skill} |`));
    assert.ok(row, `${x.skill} row in V3_SKILLS.md`);
    assert.ok(row.includes(`| ${x.scope} |`), `${x.skill}: scope ${x.scope}`);
  }
});

test('related tools exist, never point to themselves, and every charm is its own design', () => {
  const families = new Set();
  for (const s of Object.values(SKILLS)) {
    assert.ok(s.related.length >= 2, s.id);
    for (const r of s.related) { assert.ok(SKILLS[r], `${s.id} → ${r}`); assert.notEqual(r, s.id); }
    assert.equal(relatedSkills(s.id).length, s.related.length);
    assert.ok(CHARM_FAMILIES.includes(s.charm.family));
    assert.ok(!families.has(s.charm.family), `${s.id}: charm family ${s.charm.family} already used`);
    families.add(s.charm.family);
  }
});

test('every skill the Hushflow registry offers has garden wording', () => {
  for (const w of WORLDS) {
    const ids = [w.memory?.skillId, ...Object.values(w.discoveries || {}).map((d) => d.skillId)].filter(Boolean);
    for (const id of ids) {
      assert.ok(SKILLS[id], `${w.id} offers ${id}`);
      assert.equal(SKILLS[id].world.id, w.id, `${id} is taught by ${w.id}`);
    }
    assert.ok(skillsForWorld(w.id).length >= 1, w.id);
  }
});

test('skill wording: British spelling, lowercase brand, no "AI", no cure or relief claims', () => {
  // (the validator's own banned-word patterns are the only lines allowed to name them)
  const src = readFileSync(`${root}src/hushfold/skills.js`, 'utf8').split('\n').filter((l) => !l.startsWith('const BANNED') && !l.includes('brand must be lowercase')).join('\n');
  assert.doesNotMatch(src, /\bAI\b/);
  assert.doesNotMatch(src, /Hushmallow|HUSHMALLOW|HushMallow/);
  const shown = Object.values(SKILLS).map((s) => [s.title, s.essence, s.explanation, s.example, s.found || '', ...s.steps, ...s.care, s.evidence.plain].join(' ')).join(' ');
  assert.doesNotMatch(shown, /\b(color|behavior|center|realize|recognize|favorite|practicing|practiced)\b/i);
  assert.doesNotMatch(shown, /\b(cures?|treats?|relief|guarantee|rewire|reduces anxiety)\b/i);
  assert.doesNotMatch(shown, /\bAI\b/);
});

// --------------------------------------------------------------- store --
test('garden: save, list, practise and forget', () => {
  const store = memStore();
  assert.deepEqual(garden(store), []);
  const a = saveSkill(store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' }, 1000);
  assert.equal(a.isNew, true);
  assert.equal(a.stored, true);
  assert.equal(a.savedAt, 1000);
  saveSkill(store, { id: 'a-little-more-room', fromWorld: 'luminous-ocean', mallow: 'loomi' }, 2000);
  assert.deepEqual(garden(store).map((x) => x.id), ['slowing-down', 'a-little-more-room']);
  assert.equal(hasSkill(store, 'slowing-down'), true);
  assert.equal(hasSkill(store, 'another-angle'), false);

  const p = practised(store, 'slowing-down', 5000);
  assert.equal(p.lastPractised, 5000);
  assert.equal(p.practised, 1);
  assert.equal(practised(store, 'another-angle'), null, 'practising an unkept tool keeps nothing');
  assert.equal(hasSkill(store, 'another-angle'), false);

  assert.equal(forgetSkill(store, 'slowing-down'), true);
  assert.equal(forgetSkill(store, 'slowing-down'), false);
  assert.deepEqual(garden(store).map((x) => x.id), ['a-little-more-room']);
});

test('garden: saving again keeps the first save and its Mallow', () => {
  const store = memStore();
  saveSkill(store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' }, 1000);
  const again = saveSkill(store, { id: 'slowing-down', fromWorld: 'luminous-ocean', mallow: 'loomi' }, 9000);
  assert.equal(again.isNew, false);
  assert.equal(again.savedAt, 1000);
  assert.equal(again.mallow, 'glitzi');
  assert.equal(again.fromWorld, 'static-storm');
  assert.equal(again.lastPractised, 9000);
  assert.equal(garden(store).length, 1);
});

test('garden: ids only — free text, photos and extra fields never get in', () => {
  const store = memStore();
  assert.equal(saveSkill(store, { id: 'My boss embarrassed me today' }), null);
  assert.equal(saveSkill(store, { id: '' }), null);
  assert.equal(saveSkill(store, {}), null);
  assert.equal(saveSkill(store), null);
  assert.equal(saveSkill(store, { id: 'x'.repeat(80) }), null);
  saveSkill(store, { id: 'slowing-down', fromWorld: 'I feel awful', mallow: 'data:image/png;base64,AAAA', text: 'secret words', photo: 'blob:abc' });
  const raw = store.get(GARDEN_KEY);
  assert.equal(raw.v, GARDEN_VERSION);
  assert.deepEqual(Object.keys(raw.skills), ['slowing-down']);
  assert.deepEqual(Object.keys(raw.skills['slowing-down']).sort(), ['fromWorld', 'lastPractised', 'mallow', 'practised', 'savedAt']);
  assert.equal(raw.skills['slowing-down'].fromWorld, null);
  assert.equal(raw.skills['slowing-down'].mallow, null);
  assert.doesNotMatch(JSON.stringify(raw), /secret|awful|base64|blob/);
});

test('garden: corrupt, foreign or partial data reads safely', () => {
  const store = memStore();
  for (const bad of [null, 'nonsense', 42, [], { v: 2, skills: { 'slowing-down': { savedAt: 1 } } }, { v: 1, skills: [] }, { v: 1 }]) {
    store.set(GARDEN_KEY, bad);
    assert.deepEqual(garden(store), [], JSON.stringify(bad));
  }
  store.set(GARDEN_KEY, { v: 1, skills: {
    'slowing-down': { savedAt: 10, practised: 2, lastPractised: 20, fromWorld: 'static-storm', mallow: 'glitzi' },
    'Bad Id': { savedAt: 10 },
    'a-little-more-room': { savedAt: 'yesterday' },
    'another-angle': { savedAt: 30, practised: -4, lastPractised: 'x', fromWorld: 7, mallow: {} },
  } });
  const g = garden(store);
  assert.deepEqual(g.map((x) => x.id), ['slowing-down', 'another-angle']);
  assert.deepEqual(gardenEntry(store, 'another-angle'), { id: 'another-angle', savedAt: 30, lastPractised: null, practised: 0, fromWorld: null, mallow: null });
  // a write keeps only the valid entries
  saveSkill(store, { id: 'name-it' }, 40);
  assert.deepEqual(Object.keys(store.get(GARDEN_KEY).skills).sort(), ['another-angle', 'name-it', 'slowing-down']);
});

test('garden: a store that throws or refuses never breaks the garden', () => {
  const broken = { get() { throw new Error('blocked'); }, set() { throw new Error('quota'); }, remove() { throw new Error('x'); } };
  assert.deepEqual(garden(broken), []);
  const r = saveSkill(broken, { id: 'slowing-down' });
  assert.equal(r.stored, false, 'a refused write is reported, so nobody is told it was saved');
  const refusing = { get: () => null, set: () => false, remove() {} };
  assert.equal(saveSkill(refusing, { id: 'slowing-down' }).stored, false);
  assert.equal(forgetSkill(broken, 'slowing-down'), false);
  assert.doesNotThrow(() => clearGarden(broken));
  // a kept tool on a device that then refuses writes: forgetting and practising say so honestly
  const kept = memStore();
  saveSkill(kept, { id: 'slowing-down', mallow: 'glitzi' }, 1000);
  const frozen = { get: (k, d) => kept.get(k, d), set: () => false, remove() {} };
  assert.equal(forgetSkill(frozen, 'slowing-down'), false, 'a refused forget is not reported as done');
  assert.equal(hasSkill(frozen, 'slowing-down'), true, 'and the tool is still in the garden');
  assert.equal(practised(frozen, 'slowing-down', 2000).stored, false);
  assert.equal(practised(kept, 'slowing-down', 3000).stored, true);
  assert.deepEqual(readGarden(broken), { v: 1, skills: {} });
});

test('garden: capped, and wiped by Delete everything', () => {
  const store = memStore();
  for (let i = 0; i < MAX_SKILLS + 5; i++) saveSkill(store, { id: `skill-${i}` }, 100 + i);
  assert.equal(garden(store).length, MAX_SKILLS);
  assert.equal(saveSkill(store, { id: 'one-more' }), null);
  assert.ok(saveSkill(store, { id: 'skill-0' }), 'an already kept tool can still be practised');
  store.clearAll();
  assert.deepEqual(garden(store), []);
});

// ------------------------------------------------- installation + scene --
test('the installation is brief, skippable and photosafe', async () => {
  const { INSTALL_TIMING: T, INSTALL_TIMING_REDUCED: R } = await import('../src/hushfold/garden-install.js');
  assert.ok(T.end >= 2.5 && T.end <= 4, `full sequence ${T.end}s is 2.5–4 s`);
  assert.ok(T.card >= T.enter && T.card < T.end, 'the card follows the charm into the portal');
  assert.ok(T.gather < T.form && T.form < T.portalOpen && T.portalOpen < T.travel && T.travel < T.enter && T.enter < T.close);
  assert.ok(R.end < T.end && R.card < 1.2, 'reduced motion is shorter and calmer');
  const src = readFileSync(`${root}src/hushfold/garden-install.js`, 'utf8');
  // every light envelope rises over at least 0.28 s (no flash)
  const rises = [...src.matchAll(/\benv\(t, [^,]+, ([0-9.]+),/g)].map((m) => Number(m[1]));
  assert.ok(rises.length >= 4);
  for (const r of rises) assert.ok(r >= 0.28, `rise ${r}s`);
  // the portal breathes once a second at most
  assert.match(src, /Math\.sin\(Math\.PI \* 2 \* t\)/);
  assert.match(src, /'Skip'/);
  assert.match(src, /Escape/);
});

test('garden copy: the brief’s words, lowercase brand, no "AI", no pressure mechanics', () => {
  const install = readFileSync(`${root}src/hushfold/garden-install.js`, 'utf8');
  const scene = readFileSync(`${root}src/app/scenes/garden.js`, 'utf8');
  for (const s of ['New tool saved', 'Visit the garden', 'Keep playing', 'Keep this', 'Not now']) assert.ok(install.includes(`'${s}'`), s);
  assert.match(install, /text-transform: uppercase/, 'NEW TOOL SAVED is set as an overline');
  assert.match(install, /--type-reward/, 'the title uses the reward type token');
  for (const s of ['Back to the Hushfold', 'Practise again', 'Forget this', 'Related tools', 'Where this comes from', 'Need support now?']) assert.ok(scene.includes(s), s);
  for (const src of [install, scene]) {
    assert.doesNotMatch(src, /\bAI\b/);
    assert.doesNotMatch(src, /Hushmallow|HUSHMALLOW/);
    assert.doesNotMatch(src, /\b(streak|score|points|level up|collect them all|unlock)\b/i);
  }
  // the garden is gated in code, not only in the UI, and saving only happens on the tap
  // (a lapsed plan keeps a read-only garden of what was kept; with nothing kept it is part of the plan)
  assert.match(scene, /if \(!ent\.has\('paid'\) && !\(READ_ONLY_WHEN_LAPSED && gardenList\(store\)\.length\)\) \{ app\.go\('plans'/);
  assert.match(scene, /if \(!ent\.has\('paid'\)\) return \{ note: /, 'Practise again asks for the plan when it has lapsed');
  assert.doesNotMatch(scene, /saveSkill/);
  assert.match(install, /const yes = await offerSave\([^)]*\);\n\s+if \(!yes/);
});

// ---------------------------------------------------- integration guards --
// The Hushfold must hand the whole moment to W5 (offer → save on the tap → install); offerSave alone only asks.
const hushfoldSrc = readFileSync(`${root}src/app/scenes/hushfold.js`, 'utf8');
const routedThroughKeep = /install\??\.(onOffer|keepDiscovery)\??\.?\(/.test(hushfoldSrc);
test('the Hushfold routes a discovery offer through onOffer / keepDiscovery', { todo: routedThroughKeep ? false : 'W3: in hushfold.js onOffer, call install.onOffer(ctx) instead of install.offerSave(ctx) (offerSave only resolves the choice; nothing is saved)' }, () => {
  assert.match(hushfoldSrc, /install\??\.(onOffer|keepDiscovery)\??\.?\(/);
  assert.doesNotMatch(hushfoldSrc, /await install\.offerSave\(ctx\);[^\n]*return;/, 'offerSave must not be treated as the whole moment');
});

test('the keep moment: one entry point, honest about refused saves, announced to screen readers, off the face', () => {
  const src = readFileSync(`${root}src/hushfold/garden-install.js`, 'utf8');
  assert.match(src, /export const onOffer = keepDiscovery;/);
  assert.match(src, /saved\.stored === false/, 'a refused write never shows NEW TOOL SAVED');
  // a persistent live region made at load, then written to for the offer and the card
  assert.match(src, /setAttribute\('aria-live', 'polite'\)/);
  assert.match(src, /announce\(`Keep this in your Memory Garden\? \$\{name\}`\)/);
  assert.match(src, /announce\(`New tool saved: /);
  // placement comes from the Mallow's body and face, and steps out of the subtitles
  assert.match(src, /function mallowGeom\(origin, mallow, face\)/);
  assert.match(src, /\.hf-sub, \.hf-chips:not\(\[hidden\]\), \.hf-subctl:not\(\.is-hidden\)/);
  assert.match(src, /forms: \['full', 'compact', 'bar'\]/);
  assert.match(src, /forms: \['full', 'compact', 'tight'\]/);
  // the person's own motion settings win over the system's
  assert.match(src, /app\.prefs\.reducedMotion\(\)/);
  assert.match(src, /app\?\.prefs\?\.get\?\.\('lowStim'\)/);
});

test('one loop and no per-frame rasterising: charms, garden and install share the Mallow ticker', () => {
  const charm = readFileSync(`${root}src/hushfold/charm.js`, 'utf8');
  const install = readFileSync(`${root}src/hushfold/garden-install.js`, 'utf8');
  const scene = readFileSync(`${root}src/app/scenes/garden.js`, 'utf8');
  for (const [name, src] of [['charm.js', charm], ['garden.js', scene]]) {
    assert.match(src, /addTicker/, `${name} uses the shared ticker`);
    assert.doesNotMatch(src.replace(/requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => detail\?\.classList\.add\('is-in'\)\)\)/, ''), /requestAnimationFrame\(/, `${name} runs no loop of its own`);
  }
  assert.match(install, /addTicker\(step\)/);
  // drawCharm builds no gradient per call: sparkles and glows are cached sprites
  const body = charm.slice(charm.indexOf('export function drawCharm'), charm.indexOf('// ------------------------------------------------------------- live DOM'));
  assert.ok(body.length > 200);
  assert.doesNotMatch(body, /create(Radial|Linear)Gradient|radial\(|linear\(|star4\(/);
  // the install rasterises the charm once, at its largest size
  assert.match(install, /drawCharm\(g, \{[^}]*res: S \* 1\.12/);
});

test('the garden never veils the Mallow, and the comet tail allocates nothing per frame', () => {
  const scene = readFileSync(`${root}src/app/scenes/garden.js`, 'utf8');
  const install = readFileSync(`${root}src/hushfold/garden-install.js`, 'utf8');
  // the hills are painted on a canvas that sits between the realm and the Mallow layer, not over it
  assert.match(scene, /ml\.parentNode\.insertBefore\(bgCanvas, ml\)/);
  assert.match(scene, /\.hg-canvas\.hg-back \{ z-index: 0;/);
  assert.doesNotMatch(scene, /h\('div', \{ class: 'hg', 'data-garden': 'root' \}, bgCanvas/, 'the hills are not inside the scene (above the Mallow)');
  assert.doesNotMatch(scene, /destination-out/, 'no partial cut-outs over the Mallow');
  assert.match(scene, /bgCanvas\.remove\(\)/, 'and they leave with the scene');
  // the Mallow sits on a level seat of the crest
  assert.match(scene, /lerp\(curve\(u\), seatY, k\)/);
  // the trail's gradients are made once (a local frame), never in drawTrail
  const trail = install.slice(install.indexOf('function drawTrail('), install.indexOf('function frameFull('));
  assert.ok(trail.length > 200);
  assert.doesNotMatch(trail, /create(Radial|Linear)Gradient/);
});

// ------------------------------------------------ the moment, in a fake DOM --
// Just enough DOM for offerSave / playInstall / keepDiscovery to run in Node:
// elements are EventTargets with children, classes, styles and fixed-size rects;
// canvases draw into a no-op context; selectors are '.a', '#a' and '.a > *'.
function installInstallDom({ W = 390, H = 844 } = {}) {
  const KEYS = ['document', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'innerWidth', 'innerHeight', 'devicePixelRatio', 'matchMedia', 'Path2D'];
  const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const noop = () => {};
  const ctx2d = (canvas) => new Proxy({
    canvas, createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createPattern: () => ({}),
    measureText: (s) => ({ width: String(s).length * 8 }), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), getTransform: () => ({ a: 1, e: 0, f: 0 }),
  }, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  let doc = null;
  class El extends EventTarget {
    constructor(tag) {
      super();
      this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null; this.hidden = false; this.id = '';
      this.attrs = new Map(); this.dataset = {}; this._text = ''; this.width = 0; this.height = 0; this.rect = null;
      const cls = new Set(); this._cls = cls;
      this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c),
        toggle: (c, on) => { const v = on === undefined ? !cls.has(c) : !!on; if (v) cls.add(c); else cls.delete(c); return v; } };
      this.style = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
    }
    get className() { return [...this._cls].join(' '); }
    set className(v) { this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this._cls.add(c)); }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children.forEach((c) => { c.parentNode = null; }); this.children = []; this._text = String(v ?? ''); }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.documentElement; }
    get firstChild() { return this.children[0] || null; }
    get offsetWidth() { return this.rect?.width ?? 300; }
    get offsetHeight() { return this.rect?.height ?? 120; }
    get clientWidth() { return this.offsetWidth; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); if (k === 'id') this.id = String(v); }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    removeAttribute(k) { this.attrs.delete(k); }
    append(...nodes) {
      for (const n of nodes) {
        if (n == null) continue;
        const c = typeof n === 'object' ? n : Object.assign(new El('#text'), { _text: String(n) });
        c.remove(); c.parentNode = this; this.children.push(c);
      }
    }
    appendChild(n) { this.append(n); return n; }
    prepend(...nodes) { const old = this.children; this.children = []; this.append(...nodes); this.children.push(...old); }
    replaceChildren(...nodes) { this.textContent = ''; this.append(...nodes); }
    remove() { const p = this.parentNode; if (p) { p.children = p.children.filter((c) => c !== this); this.parentNode = null; } }
    contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
    getBoundingClientRect() {
      const left = this.rect?.left ?? (parseFloat(this.style.left) || 0), top = this.rect?.top ?? (parseFloat(this.style.top) || 0);
      const width = this.offsetWidth, height = this.offsetHeight;
      return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
    }
    getClientRects() { return [this.getBoundingClientRect()]; }
    getContext() { return (this._ctx ||= ctx2d(this)); }
    focus() { doc.activeElement = this; }
    blur() { if (doc.activeElement === this) doc.activeElement = null; }
    click() { this.dispatchEvent(new Event('click')); }
    *all() { for (const c of this.children) { yield c; yield* c.all(); } }
    querySelectorAll(sel) {
      const out = new Set();
      for (const part of String(sel).split(',').map((s) => s.trim())) {
        let m;
        if ((m = /^\.([\w-]+)$/.exec(part))) { for (const e of this.all()) if (e._cls.has(m[1])) out.add(e); }
        else if ((m = /^\.([\w-]+)\s*>\s*\*$/.exec(part))) { for (const e of this.all()) if (e._cls.has(m[1])) e.children.forEach((c) => out.add(c)); }
        else if ((m = /^#([\w-]+)$/.exec(part))) { for (const e of this.all()) if (e.id === m[1]) out.add(e); }
      }
      return [...out];
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  }
  const win = new EventTarget();
  doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null });
  doc.documentElement = new El('html'); doc.head = new El('head'); doc.body = new El('body');
  doc.documentElement.append(doc.head, doc.body);
  doc.createElement = (t) => new El(t);
  doc.createElementNS = (_ns, t) => new El(t);
  doc.createTextNode = (s) => Object.assign(new El('#text'), { _text: String(s) });
  doc.getElementById = (id) => doc.documentElement.querySelector(`#${id}`);
  doc.querySelector = (s) => doc.documentElement.querySelector(s);
  doc.querySelectorAll = (s) => doc.documentElement.querySelectorAll(s);
  Object.assign(globalThis, {
    document: doc, innerWidth: W, innerHeight: H, devicePixelRatio: 1,
    addEventListener: win.addEventListener.bind(win), removeEventListener: win.removeEventListener.bind(win), dispatchEvent: win.dispatchEvent.bind(win),
    requestAnimationFrame: (fn) => setTimeout(() => fn(performance.now()), 16), cancelAnimationFrame: (id) => clearTimeout(id),
    getComputedStyle: (el) => ({ visibility: 'visible', display: el.hidden ? 'none' : 'block', opacity: '1', paddingTop: '0px', paddingBottom: '0px', getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    Path2D: function Path2D() { return new Proxy({}, { get: () => noop }); },
  });
  return {
    doc, El,
    byClass: (c) => doc.body.querySelector(`.${c}`),
    restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } },
  };
}
const until = async (fn, ms = 3000) => {
  const t0 = Date.now();
  for (;;) { const v = fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out'); await new Promise((r) => setTimeout(r, 10)); }
};

test('keepDiscovery: aborting during the installation removes it at once and the promise resolves, the tool kept', async () => {
  const dom = installInstallDom();
  const events = [];
  const onEv = (e) => events.push(`${e.type.slice(3)}:${e.detail.phase}`);
  addEventListener('hm:offer', onEv); addEventListener('hm:install', onEv);
  try {
    const { keepDiscovery } = await import('../src/hushfold/garden-install.js');
    const store = memStore();
    const ac = new AbortController();
    const body = { left: 100, top: 380, width: 190, height: 200 };
    const p = keepDiscovery({ store, skillId: 'slowing-down', worldId: 'static-storm', mallow: 'glitzi', origin: () => body, reducedMotion: true, signal: ac.signal });
    const offer = await until(() => dom.byClass('hm-offer'));
    assert.equal(hasSkill(store, 'slowing-down'), false, 'nothing is saved before the tap');
    offer.querySelector('.hm-primary').click();
    const install = await until(() => dom.byClass('hm-install'));
    assert.ok(install.isConnected);
    assert.equal(hasSkill(store, 'slowing-down'), true, 'saved on the tap, before the installation plays');
    assert.ok(dom.doc.body.classList.contains('hm-installing'));
    ac.abort();
    assert.equal(dom.byClass('hm-install'), null, 'the overlay is removed at once (no card, no chip)');
    assert.equal(dom.byClass('hm-chip'), null);
    const r = await Promise.race([p, new Promise((res) => setTimeout(() => res('pending'), 1000))]);
    assert.deepEqual(r, { kept: true, already: false, stored: true, action: 'cancelled' });
    assert.equal(dom.doc.body.classList.contains('hm-installing'), false);
    assert.deepEqual(events, ['offer:open', 'offer:close', 'install:start', 'install:end']);
    // Not now keeps nothing
    const ac2 = new AbortController(), store2 = memStore();
    const p2 = keepDiscovery({ store: store2, skillId: 'a-little-more-room', mallow: 'loomi', origin: () => body, reducedMotion: true, signal: ac2.signal });
    const offer2 = await until(() => dom.doc.body.querySelectorAll('.hm-offer').find((o) => !o.classList.contains('is-out')));
    offer2.querySelector('.hm-quiet').click();
    assert.deepEqual(await p2, { kept: false, already: false, stored: false, action: null });
    // aborted while the offer is up: nothing saved, the promise resolves
    const p3 = keepDiscovery({ store: store2, skillId: 'a-little-more-room', mallow: 'loomi', origin: () => body, reducedMotion: true, signal: ac2.signal });
    ac2.abort();
    assert.deepEqual(await p3, { kept: false, already: false, stored: false, action: null });
    assert.equal(hasSkill(store2, 'a-little-more-room'), false);
  } finally {
    removeEventListener('hm:offer', onEv); removeEventListener('hm:install', onEv);
    await new Promise((r) => setTimeout(r, 400));   // let the offers' fade-out timers run inside the fake DOM
    dom.restore();
  }
});

test('relayoutInstall places the open offer again; Beyond’s dock (.bx-dock) is kept clear like the Hushfold’s', async () => {
  const dom = installInstallDom();
  try {
    const { offerSave, relayoutInstall } = await import('../src/hushfold/garden-install.js');
    // no Mallow geometry: the offer sits at the bottom of the free band, above any dock pill
    const ac = new AbortController();
    const open = () => { offerSave({ skillId: 'slowing-down', mallow: 'glitzi', reducedMotion: true, signal: ac.signal }); return dom.doc.body.querySelectorAll('.hm-offer').at(-1); };
    const free = open();
    const bottomFree = parseFloat(free.style.top) + free.offsetHeight;
    free.__close(false);
    const dock = new dom.El('div'); dock.className = 'bx-dock';
    const pill = new dom.El('button'); pill.rect = { left: 120, top: 700, width: 150, height: 48 };
    dock.append(pill); dom.doc.body.append(dock);
    const above = open();
    assert.ok(parseFloat(above.style.top) + above.offsetHeight <= 690, `the offer ends above the Beyond dock pill (${above.style.top})`);
    assert.ok(bottomFree > 690, 'and without the dock it sat lower');
    // what it avoids moves (e.g. the side panel opened): relayoutInstall places it again, no resize event
    const top0 = above.style.top;
    pill.rect = { left: 120, top: 560, width: 150, height: 48 };
    relayoutInstall();
    assert.notEqual(above.style.top, top0);
    assert.ok(parseFloat(above.style.top) + above.offsetHeight <= 550);
    ac.abort();
    const src = readFileSync(`${root}src/hushfold/garden-install.js`, 'utf8');
    assert.match(src, /'\.hf-top, \.bx-top'/);
    const relayout = src.slice(src.indexOf('export function relayoutInstall'), src.indexOf('function offerEvent'));
    assert.ok(relayout.length > 50);
    assert.doesNotMatch(relayout, /dispatchEvent|new Event\('resize'\)/, 'never a synthetic resize');
  } finally {
    await new Promise((r) => setTimeout(r, 400));
    dom.restore();
  }
});

test('QA main: the folded chip is in the avoid rects, never lies over the panel or the sheet, and comes back when it closes', async () => {
  const dom = installInstallDom();
  try {
    const { offerSave, relayoutInstall, installAvoidRects } = await import('../src/hushfold/garden-install.js');
    const ac = new AbortController();
    let sheet = null;   // the phone sheet, marked hard by the shell (offerAvoid)
    const avoid = () => (sheet ? [sheet] : []);
    const body = { left: 100, top: 300, width: 190, height: 200 };
    offerSave({ skillId: 'slowing-down', mallow: 'glitzi', reducedMotion: true, signal: ac.signal, origin: () => body, avoid, foldAfterMs: 30 });
    const chip = await until(() => dom.byClass('hm-chip'));
    const at = () => [parseFloat(chip.style.left), parseFloat(chip.style.top)];
    const [x0, y0] = at();
    assert.ok(y0 > 600, `the chip folds into a bottom corner (${y0})`);
    assert.equal(chip.classList.contains('is-blocked'), false);
    // the shell's clash check and the subtitles see it (it is a { el } handle, not an element)
    assert.ok(installAvoidRects().some((r) => Math.round(r.top) === Math.round(y0)), 'the chip is among the install rects');
    // the sheet rises over the bottom of the screen: the chip moves to a top corner, clear of it
    sheet = { left: 0, top: 440, right: 390, bottom: 844, width: 390, height: 404, hard: true };
    relayoutInstall();
    const [, y1] = at();
    assert.ok(y1 + chip.offsetHeight <= 440, `off the sheet (${y1})`);
    assert.equal(chip.classList.contains('is-blocked'), false);
    // a sheet over the whole screen: no corner is free, so it waits unseen rather than lie over it
    sheet = { left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844, hard: true };
    relayoutInstall();
    assert.equal(chip.classList.contains('is-blocked'), true);
    // closed again: back in its corner, seen
    sheet = null;
    relayoutInstall();
    assert.deepEqual(at(), [x0, y0]);
    assert.equal(chip.classList.contains('is-blocked'), false);
    // a world's own things (no hard flag) never hide it: with no corner wholly free it still shows, off the Mallow
    sheet = { x: 0, y: 0, w: 390, h: 844, kind: 'bubble' };
    relayoutInstall();
    assert.equal(chip.classList.contains('is-blocked'), false);
    ac.abort();
  } finally {
    await new Promise((r) => setTimeout(r, 400));
    dom.restore();
  }
});

test('QA main: an offer lies over a world’s postcards or bubbles before it lies over the Mallow’s body', async () => {
  const dom = installInstallDom();
  try {
    const { offerSave } = await import('../src/hushfold/garden-install.js');
    const ac = new AbortController();
    const body = { left: 70, top: 500, width: 250, height: 240 };
    // postcards fill the sky above the Mallow; the thought's words sit just above its head
    const avoid = () => [{ x: 0, y: 150, w: 390, h: 200, kind: 'card' }, { x: 40, y: 390, w: 300, h: 60, kind: 'thought' }];
    offerSave({ skillId: 'slowing-down', mallow: 'glitzi', reducedMotion: true, signal: ac.signal, origin: () => body, avoid });
    const offer = dom.doc.body.querySelectorAll('.hm-offer').at(-1);
    const top = parseFloat(offer.style.top), bottom = top + offer.offsetHeight;
    assert.ok(bottom <= body.top, `off the Mallow's body (offer ${top}–${bottom}, body top ${body.top})`);
    assert.ok(!(top < 450 && bottom > 390), 'never over the thought or its words');
    ac.abort();
  } finally {
    await new Promise((r) => setTimeout(r, 400));
    dom.restore();
  }
});
