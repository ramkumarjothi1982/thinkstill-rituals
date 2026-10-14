// Integration H2 + H3, review round 1 (shell side): Finish takes the finished world's held lines with it, the
// garden offer keeps off where the person's Thought Mallow is going to rest (and steps aside when it meets it),
// a world held by the phone sheet carries on only once the Mallow has landed again, a gentle visit's new host
// keeps the attentive face, and an angry Mallow's steam is a feathered wisp. The held-line rule runs for real
// against the subtitles in a small fake DOM; the scene's wiring is checked statically (its behaviour is checked
// in the browser).
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ParticleField } from '../src/mallows/particles.js';
import { MALLOWS } from '../src/mallows/registry.js';
import { createSubtitles } from '../src/hushfold/subtitles.js';
import { worldHeldLines, waitsForTap } from '../src/app/scenes/hushfold.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');
const scene = read('src/app/scenes/hushfold.js');
const fnBody = (src, start, end) => { const a = src.indexOf(start); assert.ok(a >= 0, start); const b = src.indexOf(end, a + start.length); return src.slice(a, b > a ? b : undefined); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------- fake DOM --
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
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.body; }
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

// --------------------------------------------------------- held lines --
test('Finish: the finished world\'s held discovery line goes with it, and the closing line shows (real subtitles)', async () => {
  const dom = installDom();
  try {
    const run = async (dropOnFinish) => {
      const subs = createSubtitles({ root: dom.doc.body, prefs: { get: () => 1, set() {} } });
      const held = worldHeldLines();
      // the director's held discovery line, as flowSubtitles.say passes it on
      const o = { kind: 'discovery', hold: true, id: 'discovery:slowing', who: 'Glitzi', interrupt: true, first: true };
      // (its last line is the one held for the tap: here the only one, so it is up and waiting at once)
      held.track(subs.say(['The world responded.'], o), waitsForTap(['The world responded.'], o));
      // a passing world line is not held
      held.track(subs.say('That’s a lot of charge.', { kind: 'dialogue', who: 'Glitzi' }), waitsForTap('That’s a lot of charge.', { kind: 'dialogue' }));
      assert.equal(held.size, 1, 'only the line waiting for a tap is tracked');
      await sleep(300);
      assert.equal(subs.holding, true, 'the discovery line is up, waiting for its Continue');
      // onFinished: what the world had queued goes (held kept), then what it held for a tap goes too
      subs.clear({ keepHeld: true });
      if (dropOnFinish && held.drop()) subs.clear();
      // ... and 1.25 s later the person's own Mallow says the closing line
      subs.say('All done. Thank you for spending this with me.', { who: 'Boppo' });
      await sleep(300);
      const text = [...dom.doc.body.all()].filter((n) => n._cls?.has('hf-sub')).map((n) => n.textContent).join(' | ');
      const out = { text, holding: subs.holding };
      subs.destroy();
      return out;
    };
    const fixed = await run(true);
    assert.match(fixed.text, /^Boppo: All done\./, `the closing line is on stage: ${fixed.text}`);
    assert.doesNotMatch(fixed.text, /Glitzi/, 'no line in the old host\'s voice is left');
    assert.equal(fixed.holding, false, 'nothing waits for a tap');
    // (without the drop the old world's line stays on the home stage, and the closing line queues behind it)
    const before = await run(false);
    assert.match(before.text, /Glitzi/);
    assert.equal(before.holding, true);
  } finally { dom.restore(); }
});

test('waitsForTap / worldHeldLines: held lines and non-transient choices count; settled ones are forgotten', async () => {
  assert.equal(waitsForTap('x', { hold: true }), true);
  assert.equal(waitsForTap([{ text: 'a' }, { text: 'b', hold: true }], {}), true);
  assert.equal(waitsForTap('x', { kind: 'dialogue' }), false);
  assert.equal(waitsForTap(null, {}, true), true, 'a world\'s choice ("Stay, or drift on?") waits');
  assert.equal(waitsForTap(null, { transient: true }, true), false);
  const h = worldHeldLines();
  let done;
  const p = new Promise((r) => { done = r; });
  assert.equal(h.track(p, true), p, 'the promise itself is handed back');
  h.track(Promise.resolve(true), false);
  assert.equal(h.size, 1);
  done(true); await sleep(0);
  assert.equal(h.size, 0, 'answered: no longer waiting');
  h.track(new Promise(() => {}), true);
  assert.equal(h.drop(), true);
  assert.equal(h.size, 0);
  assert.equal(h.drop(), false);
});

test('Finish wiring: flowSubtitles tracks what the world holds; onFinished drops it after the pinned keepHeld clear', () => {
  assert.match(scene, /const worldHeld = worldHeldLines\(\);/);
  assert.match(scene, /say: \(lines, o\) => \{[^\n]*return worldHeld\.track\(subtitles\.say\(lines, whoOf\(o\)\), waitsForTap\(lines, o\)\); \},/);
  assert.match(scene, /choice: \(prompt, options, o\) => \([^\n]*worldHeld\.track\(subtitles\.choice\(prompt, options, whoOf\(o\)\), waitsForTap\(null, o, true\)\)\),/);
  const fin = fnBody(scene, 'function onFinished() {', 'function onFlowError(');
  assert.ok(fin.indexOf('subtitles.clear({ keepHeld: true });') < fin.indexOf('if (worldHeld.drop()) subtitles.clear();'));
  assert.ok(fin.indexOf('if (worldHeld.drop()) subtitles.clear();') < fin.indexOf('later(() => {'), 'at once, not when the closing line is said');
});

// ------------------------------------------------------- offer & card --
test('Garden offer and card: kept off the thought (where it is, and where it is going while it arrives), stepping aside when it meets them', () => {
  const avoid = fnBody(scene, 'function offerAvoid() {', 'const installing');
  assert.match(avoid, /\.\.\.\(stage\?\.thoughts\.rects\(\) \|\| \[\]\),\s*thoughtRestRect\(\),/);
  // (the card is large: while the installation plays, the world's postcards or bubbles and the paused subtitle band
  // give way to it — never the thought)
  assert.match(avoid, /const things = inst \? world\.filter\(\(r\) => r\?\.kind !== 'card' && r\?\.kind !== 'bubble'\) : world;/);
  assert.match(avoid, /worldMode && !panelSheet\(\) && !inst \? flowRef\?\.subtitleBand\?\.\(\) : null/);
  assert.match(scene, /const installing = \(\) => typeof document !== 'undefined' && !!document\.querySelector\('\.hm-install, \.hm-install-card'\);/);
  const rest = fnBody(scene, 'function thoughtRestRect() {', '/**');
  assert.match(rest, /const p = worldMode && now\(\) - S\.worldAt < 3000 \? stage\?\.thoughts\.primary : null;/, 'only while it is on its way');
  assert.match(rest, /T = w\?\.thoughtRest \|\| w\?\.layoutPlan\?\.thought \|\| null;/);
  assert.match(rest, /const r = \(stage\.thoughts\.rects\(\) \|\| \[\]\)\.find\(\(q\) => q\.id === p\.id\);/);
  assert.match(rest, /const dx = T\.x - p\.x, dy = T\.y - p\.y;/);
  assert.match(fnBody(scene, 'function onWorld(d) {', 'function hostMallow('), /worldMode = true;\s*S\.worldAt = now\(\);/);
  const watch = fnBody(scene, 'function watchInstall(on) {', '/**\n   * The installation');
  assert.match(watch, /const mine = installMod\?\.installAvoidRects\?\.\(\) \|\| \[\];/);
  // (it steps aside when it meets the thought; QA main: and, every 2 s, when it was left over the Mallow's body)
  assert.match(watch, /if \(!mine\.some\(\(r\) => th\.some\(\(t\) => overlaps\(r, t\)\)\)\) \{/);
  assert.match(watch, /if \(!body \|\| now\(\) - bodyTry < 2000 \|\| !mine\.some\(\(r\) => overlaps\(r, body\)\)\) return;/);
  assert.match(watch, /installMod\.relayoutInstall\?\.\(\);/);
  assert.match(watch, /if \(now\(\) - last < 600\) return;/, 'never more often than every 0.6 s');
  const offer = fnBody(scene, 'async function onOffer(', 'function offerAvoid()');
  assert.ok(offer.indexOf('watchInstall(true);') > 0 && offer.indexOf('watchInstall(true);') < offer.indexOf('await install.onOffer('));
  assert.match(fnBody(scene, 'leave() {', 'get blockBack()'), /watchInstall\(false\);/);
  // the card is placed again the moment it shows; the installation's pause is not the person's (no ▶ pill in its way)
  const phase = fnBody(scene, 'const onInstallPhase = (e) => {', '/** The offer\'s own life');
  assert.match(phase, /if \(ph === 'start'\) \{ root\.classList\.add\('hf-install-quiet'\); layout\(\); \}/);
  assert.match(phase, /if \(ph === 'card'\) \{ try \{ installMod\?\.relayoutInstall\?\.\(\); \}/);
  // (r2b: the ▶ pill and the stage's bounds come back once the thought has left the band it may have risen into)
  assert.match(offer, /installSubtitles\.resume\(\);[\s\S]*if \(thoughtInBand\(\) && now\(\) - t0 < 3000\) \{ later\(quietOff, 60\); return; \}\s*if \(root\.classList\.contains\('hf-install-quiet'\)\) \{ root\.classList\.remove\('hf-install-quiet'\); layout\(\); \}/);
  const enter = fnBody(scene, 'async enter() {', 'leave() {');
  assert.match(enter, /addEventListener\('hm:install', onInstallPhase\);/);
  assert.match(fnBody(scene, 'leave() {', 'get blockBack()'), /removeEventListener\('hm:install', onInstallPhase\);/);
  const css = read('src/ui/hushfold.css').replace(/\s+/g, ' ');
  assert.match(css, /\.hushfold\.hf-install-quiet \.hf-subctl \{ visibility: hidden !important; pointer-events: none !important; \}/);
  // while it plays, the thought may rise into the free band (its words with it)...
  assert.match(fnBody(scene, 'function layout() {', 'let resizeT'), /if \(root\.classList\.contains\('hf-install-quiet'\) && !ov\?\.height\) thoughtBounds\.top = Math\.min\(thoughtBounds\.top, topB \+ 10\);/);
  // ...and the world keeps the person's thought out from under the offer, its card and its chip (director keepOut)
  // (r2b: and from where the card will show, from the moment it is placed — installKeepOut)
  assert.match(fnBody(scene, 'function getFlow() {', '/** The world paused or resumed'), /keepOut: \(\) => installKeepOut\(\),/);
  assert.match(fnBody(scene, 'function installKeepOut() {', '\n  }\n'), /const shown = installMod\?\.installAvoidRects\?\.\(\) \|\| \[\], planned = plannedCardRect\(\);/);
});

// --------------------------------------------------------- phone sheet --
test('Phone sheet: a world it held carries on once the Mallow has landed again (never mid-glide), within 1.2 s', () => {
  const hold = fnBody(scene, 'function holdWorld(on) {', '// ----------------------------------------------- saved progress');
  assert.match(hold, /else if \(st\.paused\) resumeWhenLanded\(\);/);
  assert.doesNotMatch(hold.slice(0, hold.indexOf('function resumeWhenLanded')), /else if \(st\.paused\) resumeFlow\(\);/);
  const land = fnBody(scene, 'function resumeWhenLanded() {', '// ----------------------------------------------- saved progress');
  assert.match(land, /if \(S\.left \|\| !worldMode \|\| S\.finishing \|\| held \|\| S\.hold \|\| !flowRef\) return;/, 'a new hold meanwhile wins');
  assert.match(land, /still = heroGliding\(\) \? 0 : still \+ 1;/);
  assert.match(land, /if \(still >= 2 \|\| now\(\) - t0 > 1200\) \{ resumeFlow\(\); return; \}/);
  assert.match(fnBody(scene, 'const heroGliding = () => {', 'function resumeWhenLanded'), /touchMt\?\.st, g = touchMt\?\.goalSt/);
  assert.match(fnBody(scene, 'leave() {', 'get blockBack()'), /clearTimeout\(landT\);/);
});

// ---------------------------------------------------------- polish --
test('A gentle visit\'s new host (Loomi after a care melt) keeps the attentive face', () => {
  const show = fnBody(scene, 'async function showMallow(', 'let heroGhost = null;');
  const touch = show.slice(0, show.indexOf('const rig = await world.setMallow('));
  // (softNow(): after something heavy, or "Just be with it" — 'Ask before every world')
  assert.ok(touch.indexOf('if (softNow()) stageMallow?.setStage?.(CARE_FACE, { quiet: true });') > touch.indexOf('await touchMt.loaded;'));
  assert.match(show.slice(show.indexOf('const rig = await world.setMallow(')), /if \(softNow\(\)\) stageMallow\.setStage\?\.\(CARE_FACE, \{ quiet: true \}\);/);
});

test('An angry Mallow\'s steam is a feathered wisp off the head, never a flat disc', () => {
  const rig = { mallow: MALLOWS.glitzi, id: 'glitzi', opts: { reducedMotion: false, particles: true, lowStim: false }, S: 1, CX: 200, BASE: 400, H: 600, body: { hop: 0 } };
  const pf = new ParticleField(rig);
  const g = pf.geo();
  for (let i = 0; i < 12; i++) pf.spawn('steam');
  assert.equal(pf.list.length, 12);
  for (const p of pf.list) {
    assert.equal(p.wisp, true, 'feathered (a radial fade, no hard edge)');
    assert.ok(p.y < g.top + g.h * 0.2 && p.vy < 0, 'rising off the top of the head');
  }
});

test('Home: once the Mallow has landed after a layout, the home stage\'s thoughts are planned again against it (not mid-glide)', () => {
  const lay = fnBody(scene, 'function layout() {', 'let resizeT');
  assert.match(lay, /later\(\(\) => \{ subtitles\.layout\(\); installMod\?\.relayoutInstall\?\.\(\); \}, 760\);\s*\/\/[^\n]*\n\s*later\(replanThoughts, 780\);/);
  const re = fnBody(scene, 'function replanThoughts() {', 'const overlaps');
  assert.match(re, /if \(S\.left \|\| worldMode \|\| !stage \|\| !\(stage\.thoughts\.list\?\.length > 0\)\) return;/, 'at home only, with thoughts');
  assert.match(re, /Math\.abs\(p\.left - r\.left\) <= 12/, 'only when the Mallow really moved');
  assert.match(re, /stage\.thoughts\.relayout\?\.\(\);/);
});

test('The host cross-fade reveals in the shared loop (no requestAnimationFrame of its own)', () => {
  const cross = fnBody(scene, 'function crossFadeFrom() {', 'function heroPicture(');
  assert.doesNotMatch(cross, /requestAnimationFrame\(/);
  assert.match(cross, /const once = \(\) => \{\s*removeTicker\(once\);/);
  assert.match(cross, /addTicker\(once\);/);
});

test('(d) words about being hurt by someone never get a positive feeling suggested, even when the detector reads none', async () => {
  const { interpret, suggestedFeelings } = await import('../src/engine/interpret.js');
  assert.deepEqual(suggestedFeelings(interpret('I am glad he finally hit me so I could leave')), []);
  assert.deepEqual(suggestedFeelings(interpret('I’m happy she stopped hurting my kids')), [], 'hurting my kids');
  assert.equal(interpret('I am glad he finally hit me so I could leave').hurtCue, true);
  // ordinary words keep theirs
  assert.ok(suggestedFeelings(interpret('I am so glad the exam is over')).includes('joy'));
  assert.ok(suggestedFeelings(interpret('I am relieved the exam is over')).includes('relief'));
  assert.equal(interpret('I am so glad the exam is over').hurtCue, false);
});

test('Side panel: in a world the Hushflow actions lead the panel (not below the fold on a phone), at home they follow the feelings', async () => {
  const dom = installDom();
  const D = dom.doc;
  // (the panel needs a little more of a DOM: insertion before and after)
  const proto = Object.getPrototypeOf(D.body);
  proto.prepend = function (...nodes) { for (const n of nodes.reverse()) { n.remove?.(); n.parentNode = this; this.children.unshift(n); } };
  proto.after = function (...nodes) { const p = this.parentNode; if (!p) return; for (const n of nodes.reverse()) { n.remove?.(); n.parentNode = p; p.children.splice(p.children.indexOf(this) + 1, 0, n); } };
  Object.defineProperty(proto, 'nextSibling', { configurable: true, get() { const p = this.parentNode; if (!p) return null; return p.children[p.children.indexOf(this) + 1] || null; } });
  proto.addEventListener = EventTarget.prototype.addEventListener;
  try {
    const { createSidePanel } = await import('../src/hushfold/side-panel.js');
    const flow = { state: { worldId: 'static-storm', title: 'Glitzi’s Static Storm', canNext: true }, pause() {}, resume() {}, stay() {}, next() {}, finish() {}, setAutoFlow() {} };
    const app = { prefs: { reducedMotion: () => true, get: () => false, set() {} }, ent: { tier: () => 'paid', has: (t) => t === 'paid' }, store: { get: () => null, set() { return true; }, remove() {} }, haptic() {}, audio: { ui() {} }, toast() {}, go() {} };
    const panel = createSidePanel({ app, root: D.body, getFlow: async () => flow, flowAvailable: async () => true, state: () => ({ mallow: 'glitzi' }) });
    const body = [...panel.el.all()].find((n) => n._cls?.has('p-body'));
    const flowSec = [...panel.el.all()].find((n) => n._cls?.has('p-flow'));
    await panel.update();
    assert.equal(body.children[0], flowSec, 'in a world: first');
    flow.state = {};
    await panel.update();
    assert.notEqual(body.children[0], flowSec, 'at home: back after the feelings and intentions');
    assert.equal(body.children.indexOf(flowSec), 3);
  } finally { dom.restore(); }
});
