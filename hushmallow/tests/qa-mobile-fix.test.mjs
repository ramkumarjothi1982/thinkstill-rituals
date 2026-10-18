// Mobile QA fix round (16 Oct 2026): the launch-relevant findings of the mobile QA pass on the release candidate.
// Each was reproduced and re-checked in a real browser (Playwright, touch) at the size it was found at; these keep
// the fixes in place.
//   M1  320×568 at text size Largest: a V3 ritual's play area ran under the ritual dock (Molten Tempo's rim under the
//       words chip, so it could not be turned past halfway). The stage now keeps clear of the dock at every size.
//   m2  touch targets under 44 px: .chip, the Settings Volume slider, the Thought Mallow's words tag (and, from its
//       reviews, the classic Another Angle's sort chips and six ghost buttons, the Express screen's "Need support now?"
//       among them, which kept a 38 or 40 px minimum of their own: every chip and button in src/ is now checked; and
//       the Meet-a-Mallow card's photo button, 40 px on a short screen through its other class, .photo-add-inline).
//   m3  a V3 ritual's first Mallow line covered the play dial (its bubble sat just above the small Mallow in the dock).
//   m4  the small tappable Mallow in a V3 ritual's dock stuck a few px out of the viewport at every size (and, found in
//       review: kept inside by its whole layer, on a phone on its side its body was pushed out of its spot).
//   (and, found by the gesture sweep of all 240 built rituals: world law 19's own hint could not be followed; found in
//   review: a second finger on its anchor could stop tap-to-set for good, or take over another finger's trace, and a
//   finger only resting on the anchor kept every trace begun there from counting; and, from the review of m6: Plans
//   left while Zuzu was still coming in kept its window listeners for good; and, from the second review of m2: at
//   320×568 the Express screen's top bar, "Need support now?" in it, scrolled away with the card.)
// Run: node --test hushmallow/tests/qa-mobile-fix.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const fnBody = (src, start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a, `${start} … ${end}`); return src.slice(a, b); };
const { stageRect, wantsCompact, keepBodyInside, MALLOW_NUDGE, STAGE_MIN, STAGE_FLOOR, STAGE_GAP } = await import('../src/v3/stage-fit.js');

// A small DOM for running a scene or a ritual step in node: elements keep their children, attributes, inline style,
// handlers and listeners; nothing is laid out (every box is 0 × 0, nothing matches a selector)
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1;
    this.children = []; this.attrs = {}; this.style = {}; this.dataset = {}; this.listeners = {}; this.parentNode = null; this.textContent = '';
    const cls = new Set();
    this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), toggle: (c, on) => { if (on ?? !cls.has(c)) cls.add(c); else cls.delete(c); }, contains: (c) => cls.has(c) };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  toggleAttribute(k, on) { if (on) this.attrs[k] = ''; else delete this.attrs[k]; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
  append(...kids) { for (const k of kids) { k.parentNode = this; this.children.push(k); } }
  prepend(...kids) { for (const k of kids) k.parentNode = this; this.children.unshift(...kids); }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this); this.parentNode = null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
  focus() {}
}
const textOf = (n) => (n.nodeType === 3 ? n.textContent : (n.children || []).map(textOf).join('') || n.textContent || '');
const allEls = (n, out = []) => { out.push(n); for (const c of n.children || []) allEls(c, out); return out; };
const classes = (n) => (n.attrs?.class || '').split(/\s+/);
const until = async (fn, what, ms = 8000) => {
  const t0 = Date.now();
  for (;;) { const v = fn(); if (v) return v; assert.ok(Date.now() - t0 < ms, `timed out waiting for ${what}`); await new Promise((r) => setTimeout(r, 10)); }
};
/** Puts a FakeEl document (and the window globals a scene reads) in place; → { body, restore }. */
function fakeWindow({ W = 320, H = 568 } = {}) {
  const keys = ['document', 'innerWidth', 'innerHeight', 'requestAnimationFrame', 'cancelAnimationFrame', 'addEventListener', 'removeEventListener'];
  const prev = Object.fromEntries(keys.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const body = new FakeEl('body');
  const listeners = [];
  Object.assign(globalThis, {
    document: {
      createElement: (t) => new FakeEl(t), createElementNS: (_, t) => new FakeEl(t),
      createTextNode: (t) => Object.assign(new FakeEl('#text'), { textContent: String(t) }),
      addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
      getElementById: () => null, head: new FakeEl('head'), body, documentElement: new FakeEl('html'),
    },
    innerWidth: W, innerHeight: H,
    requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: (id) => clearTimeout(id),
    // the window's own listeners, kept so a test can see what a scene left behind
    addEventListener: (type, fn) => listeners.push([type, fn]),
    removeEventListener: (type, fn) => { const i = listeners.findIndex(([t, f]) => t === type && f === fn); if (i >= 0) listeners.splice(i, 1); },
  });
  return {
    body, listeners,
    restore() { for (const k of keys) { if (prev[k]) Object.defineProperty(globalThis, k, prev[k]); else delete globalThis[k]; } },
  };
}

// what the browser measured on the release candidate (Playwright, HM-0001 Molten Tempo): the title's bottom in full and
// compacted, and the dock's top (the scene column is 20…W-20 on a phone, 480 wide and centred on a tablet)
const PHONES = [
  // [label, W, H, titleBottom (full), titleBottom (compact; = full where it never compacts), dockTop]
  ['320×568 Largest, a three-line prompt', 320, 568, 268, 235, 456],
  ['320×568 Largest, a two-line prompt (Pause Gate)', 320, 568, 240, 207, 456],
  ['320×568', 320, 568, 213, 213, 456],
  ['390×844', 390, 844, 227, 227, 730],
  ['390×844 Largest', 390, 844, 256, 256, 730],
  ['820×1180 tablet', 820, 1180, 231, 231, 1066],
];

test('M1: the V3 stage never reaches under the dock, at any size or text size (the old floor of 220 px did)', () => {
  for (const [label, W, H, full, compact, dockTop] of PHONES) {
    const scene = { left: W > 700 ? (W - 520) / 2 + 20 : 20, width: W > 700 ? 480 : W - 40 };
    const short = wantsCompact(full, dockTop);
    const st = stageRect({ ...scene, titleBottom: short ? compact : full, dockTop, barBottom: 58 });
    assert.ok(st.y + st.h <= dockTop - STAGE_GAP + 0.01, `${label}: the stage ends at ${st.y + st.h}, the dock starts at ${dockTop}`);
    assert.ok(st.y >= (short ? compact : full) + STAGE_GAP - 0.01, `${label}: the stage starts below the title`);
    assert.ok(st.h >= STAGE_FLOOR, `${label}: ${st.h} px is room to play`);
    assert.ok(st.s >= 0.72 && st.s <= 1.45, `${label}: scale ${st.s}`);
    assert.equal(st.cx, st.x + st.w / 2); assert.equal(st.cy, st.y + st.h / 2);
    // the old rule: max(220, band) — under the dock exactly where QA found it
    const old = Math.max(220, dockTop - 10 - (full + 10));
    if (label.startsWith('320×568 Largest')) assert.ok(full + 10 + old > dockTop, `${label}: the release candidate's stage ran under the dock`);
  }
  // the title compacts only when the stage would be short of what the engines are made for
  assert.equal(wantsCompact(268, 456), true);
  assert.equal(wantsCompact(230, 732), false);
  assert.equal(wantsCompact(456 - 2 * STAGE_GAP - STAGE_MIN, 456), false);
  assert.equal(wantsCompact(456 - 2 * STAGE_GAP - STAGE_MIN + 1, 456), true);
  // a band shorter than STAGE_FLOOR (a phone on its side) grows up behind the title (whose words never take touches),
  // never down under the dock, and never above the top bar
  const side = stageRect({ left: 20, width: 528, titleBottom: 180, dockTop: 220, barBottom: 30 });
  assert.equal(side.y + side.h, 210);
  assert.equal(side.h, STAGE_FLOOR);
  const tiny = stageRect({ left: 20, width: 528, titleBottom: 120, dockTop: 150, barBottom: 58 });
  assert.equal(tiny.y, 68, 'not above the top bar');
  assert.equal(tiny.y + tiny.h, 140, 'still never under the dock');
});

test('M1: the host lays the stage out from stage-fit.js, compacting the title first; the title keeps the prompt and the law', () => {
  const host = read('src/v3/host.js');
  assert.match(host, /import \{ stageRect, wantsCompact(, keepBodyInside)? \} from '\.\/stage-fit\.js';/);
  const lay = fnBody(host, 'function layout() {', 'function placeMallow(');
  assert.doesNotMatch(lay, /Math\.max\(220/, 'no floor that pushes the stage under the dock');
  // the dock is measured again after each toggle (compacting the title can bring it up the screen): played through the
  // host in qa-mobile-review.test.mjs (2)
  assert.match(lay, /titleBox\.classList\.remove\('v3-compact'\);\n\s+if \(wantsCompact\(titleBottom\(\), dockTop\(\)\)\) titleBox\.classList\.add\('v3-compact'\);/);
  assert.match(lay, /Object\.assign\(stage, stageRect\(\{ left: scene\.left, width: scene\.width, titleBottom: titleBottom\(\), dockTop: dockTop\(\), barBottom: bar \}\)\);/);
  // measured again whenever the title or the dock changes size (a new prompt, the law chip, the end card)
  assert.match(host, /if \(ro\) \{ if \(titleBox\) ro\.observe\(titleBox\); ro\.observe\(dock\); \}/);
  assert.match(fnBody(host, 'function cleanup() {', 'function finish('), /titleBox\?\.classList\.remove\('v3-compact'\);/);
  // compact: only the location line steps out (it is still announced by the ritual's status line)
  const css = read('src/ui/app.css');
  const rules = [...css.matchAll(/\.move-title\.v3-compact([^{]*)\{([^}]*)\}/g)].map((m) => [m[1].trim(), m[2].trim()]);
  assert.deepEqual(rules.map((r) => r[0]), ['', '.eyebrow', '.v3-law-chip']);
  for (const [sel, body] of rules) if (sel !== '.eyebrow') assert.doesNotMatch(body, /display:\s*none|font|visibility|opacity/, `${sel}: ${body}`);
  assert.match(read('src/app/scenes/ritual.js'), /status\.textContent = `\$\{e\}\. \$\{title\}\. \$\{prompt\}`;/, 'the location is still announced');
});

// Every chip- or button-family tap target (.chip, .hf-chip, .hm-chip …; .btn, .btn.ghost, .hm-auth-btn, .icon-btn …) a
// source builds, and the heights it is given: an h() / el() button or link whose class is one, with the consts its
// class and style name looked up in the same file (a 38 px minimum kept in SORT_CHIP once slipped past a one-line
// match; untangle.js's choices take their class from `cls`), a helper's options naming one as `cls` (legalLink's), a
// button given one as its className or class and then a style, and every CSS rule (a .css file, or CSS held in a .js
// string) that sizes one: by its own class, or by another class a target is built with (a co-class: the Meet-a-Mallow
// card's photo button, .btn.ghost.block.photo-add-inline, was 40 px on a short screen by `.enc-card .photo-add-inline`).
// A class that cannot be read here (a parameter, a call) counts when the button is given less than 44 px.
// → [{ at, what, px, of, via }] (what 'chip' / 'btn' / 'open': a target found; of: the kind of the one sized; via: the
// co-class a rule sized it by). known: the class names on the app's elements (tapClasses), else this source's own
const TAP_CLASS = /(?:^|[\s'"`])(?:[a-z0-9]+-)*(chip|btn)(?=[\s'"`$])/;
const FAMILY = /^(?:[a-z0-9]+-)*(chip|btn)$/;
const STRINGS = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g;
// the class names a class expression's strings spell: a template's own text and the strings in its ${…}
const classNames = (expr) => (expr.match(STRINGS) || []).flatMap((q) => [
  ...q.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter((c) => /^-?[A-Za-z_][\w-]*$/.test(c)),
  ...(q[0] === '`' ? [...q.matchAll(/\$\{([^}]*)\}/g)].flatMap((m) => classNames(m[1])) : [])]);
// a CSS prelude split at its depth-0 separators (not inside :not(…), :nth-child(n+3) or [ ]), and its depth-0 text
const splitTop = (s, sep) => {
  const out = [''];
  let d = 0;
  for (const ch of s) { if ('(['.includes(ch)) d++; else if (')]'.includes(ch)) d--; if (!d && sep.test(ch)) out.push(''); else out[out.length - 1] += ch; }
  return out.map((x) => x.trim()).filter(Boolean);
};
const topText = (s) => { let d = 0, o = ''; for (const ch of s) { if ('(['.includes(ch)) d++; else if (')]'.includes(ch)) d--; else if (!d) o += ch; } return o; };
const skipString = (src, k) => {
  const q = src[k];
  for (let j = k + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (q === '`' && src[j] === '$' && src[j + 1] === '{') { j = skipBalanced(src, j + 1) - 1; continue; }
    if (src[j] === q) return j;
  }
  return src.length;
};
// src[i] opens a bracket → the index just after its partner (strings, templates and comments skipped); with
// stopAt, the index of the first stopAt character at depth 0 (or of a bracket closing the enclosing scope)
function skipBalanced(src, i, stopAt = null) {
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    const ch = src[k];
    if (ch === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); if (k < 0) return src.length; continue; }
    if (ch === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k + 2) + 1; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { k = skipString(src, k); continue; }
    if (stopAt && depth === 0 && stopAt.includes(ch)) return k;
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) { if (--depth === 0 && !stopAt) return k + 1; if (depth < 0) return k; }
  }
  return src.length;
}
// (a template's ${…} is never read as a height: `${size + 10}px` is no 10 px)
// (and a rem or an em is read at 16 px)
const pxOf = (re, text) => [...text.replace(/\$\{[^}]*\}/g, '').matchAll(re)].flatMap((m) => [...m[2].matchAll(/(\d+(?:\.\d+)?)(px|r?em)(?![\w-])/g)].map((n) => ({ what: m[1], px: n[2] === 'px' ? +n[1] : +n[1] * 16 })));
const jsHeights = (text) => pxOf(/(?<![\w$-])(minHeight|height)\s*:\s*([^,;}\n]+)/g, text);
const cssHeights = (text) => pxOf(/(?<![\w-])(min-height|height|max-height|(?:min-|max-)?block-size)\s*:\s*([^;}]+)/g, text);
function scanTaps(src, file = 'src', known = null) {
  const out = [];
  const targets = [], others = [];   // the class names of each target made here, and of every other element
  const lineAt = (i) => `${file}:${src.slice(0, i).split('\n').length}`;
  const defs = new Map();
  for (const d of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*/g)) { if (!defs.has(d[1])) defs.set(d[1], []); defs.get(d[1]).push(d.index + d[0].length); }
  const defText = (name) => defs.get(name).map((a) => src.slice(a, skipBalanced(src, a, ';')));
  // a style's heights (an object, or CSS text) and those of the consts it names as values (spread, or passed to a
  // helper: SORT_CHIP in type('label', SORT_CHIP)); never a helper it calls, an object it reads from, an object key or
  // a template's ${…}
  const resolve = (expr, seen = new Set()) => {
    const found = [...jsHeights(expr), ...cssHeights(expr).filter((x) => x.what === 'min-height')];
    const bare = expr.replace(STRINGS, "''").replace(/\.\.\./g, ' ');
    for (const m of bare.matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*(?![\w$])/g)) {
      const name = m[0], after = bare.slice(m.index + name.length, m.index + name.length + 40);
      if (/^\s*(\(|\??\.(?!\.))/.test(after) || (/^\s*:/.test(after) && /[{,]\s*$/.test(bare.slice(Math.max(0, m.index - 40), m.index)))) continue;
      if (seen.has(name) || !defs.has(name)) continue;
      seen.add(name);
      for (const t of defText(name)) found.push(...resolve(t, seen));
    }
    return found;
  };
  // a class expression → { fam: 'chip' | 'btn' | null, open, names }: a chip- or button-family class in its strings or
  // in those of the consts it names as values (a ternary's condition is not one); open, part of it cannot be read
  // here; names, every class name in them
  const classOf = (expr, seen = new Set()) => {
    const fams = (expr.match(STRINGS) || []).map((q) => TAP_CLASS.exec(` ${q.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ')} `)?.[1]).filter(Boolean);
    const names = new Set(classNames(expr));
    let open = false;
    const bare = expr.replace(STRINGS, "''");
    for (const m of bare.matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*(?![\w$])/g)) {
      const name = m[0], after = bare.slice(m.index + name.length, m.index + name.length + 40);
      if (/^\s*(\?(?![.?])|[<>]|[=!]==?|&&)/.test(after) || /!\s*$/.test(bare.slice(0, m.index)) || /^(true|false|null|undefined|typeof)$/.test(name)) continue;
      if (/\./.test(name) || /^\s*\(/.test(after) || !defs.has(name)) { open = true; continue; }
      if (seen.has(name)) continue;
      seen.add(name);
      for (const t of defText(name)) { const r = classOf(t, seen); if (r.fam) fams.push(r.fam); open ||= r.open; r.names.forEach((c) => names.add(c)); }
    }
    return { fam: fams.includes('chip') ? 'chip' : fams[0] || null, open, names };
  };
  const tapVars = new Map();   // a variable holding a target → its kind
  const varNames = new Map();  // … → the class names it is built with (more join from its classList)
  const keyOf = (attrs, k) => { const r = new RegExp(`[{,]\\s*${k}\\s*:\\s*`).exec(attrs); if (!r) return null; const a = r.index + r[0].length; return attrs.slice(a, skipBalanced(attrs, a, ',}')); };
  // (attrs: an object literal; at: where its element is built; v: the variable it is kept in, if any)
  const element = (attrs, classKey, at, v) => {
    const cls = classOf(keyOf(attrs, classKey) ?? "''");
    (cls.fam ? targets : others).push(cls.names);
    const style = keyOf(attrs, 'style');
    const heights = style == null ? [] : resolve(style);
    if (!cls.fam && !(cls.open && heights.some((x) => x.px < 44))) return;
    const of = cls.fam || 'open';
    out.push({ at: lineAt(at), what: of }, ...heights.map((x) => ({ at: lineAt(at), of, ...x })));
    if (v) { tapVars.set(v, of); if (cls.fam) varNames.set(v, cls.names); }
  };
  for (const m of src.matchAll(/(?<![\w$.])(?:h|el)\(\s*(['"])(?:button|a)\1\s*,\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    element(src.slice(open, skipBalanced(src, open)), 'class(?:Name)?', m.index, /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(src.slice(Math.max(0, m.index - 80), m.index))?.[1]);
  }
  // (every other element's class names: a class seen only on one of those sizes no target)
  for (const m of src.matchAll(/(?<![\w$.])(?:h|el)\(\s*(['"])(?!(?:button|a)\1)[\w-]+\1\s*,\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    others.push(classOf(keyOf(src.slice(open, skipBalanced(src, open)), 'class(?:Name)?') ?? "''").names);
  }
  // a helper's options: the object round a `cls:` key (legalLink('privacy', { cls: 'btn ghost block', style }))
  for (const m of src.matchAll(/[{,]\s*cls\s*:/g)) {
    let k = m.index, depth = 0;
    for (; k >= 0 && k > m.index - 2000; k--) { if (src[k] === '}') depth++; else if (src[k] === '{' && depth-- === 0) break; }
    if (k >= 0 && src[k] === '{') element(src.slice(k, skipBalanced(src, k)), 'cls', k, null);
  }
  for (const m of src.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\.(?:className\s*=\s*|classList\.add\()/g)) {
    const a = m.index + m[0].length;
    const r = classOf(src.slice(a, skipBalanced(src, a, ';\n)')));
    // (a class that cannot be read counts on a button or link made here)
    const made = () => new RegExp(`(?:const|let|var)\\s+${m[1].replace(/\$/g, '\\$')}\\s*=\\s*(?:document\\.createElement|h|el)\\(\\s*(['"])(?:button|a)\\1`).test(src);
    if (r.fam) {
      tapVars.set(m[1], r.fam); out.push({ at: lineAt(m.index), what: r.fam });
      if (varNames.has(m[1])) r.names.forEach((c) => varNames.get(m[1]).add(c)); else { varNames.set(m[1], r.names); targets.push(r.names); }
    } else if (r.open && !tapVars.has(m[1]) && made()) tapVars.set(m[1], 'open');
    else if (!tapVars.has(m[1])) others.push(r.names);
  }
  // (a class a target is given later: b.classList.add('on'), .toggle('picked', on))
  for (const [v, names] of varNames) {
    for (const m of src.matchAll(new RegExp(`(?<![\\w$.])${v.replace(/\$/g, '\\$')}\\.classList\\.(add|toggle)\\(`, 'g'))) {
      const a = m.index + m[0].length;
      classNames(src.slice(a, skipBalanced(src, a, m[1] === 'add' ? ')' : ',)'))).forEach((c) => names.add(c));
    }
  }
  for (const [v, of] of tapVars) {
    const e = v.replace(/\$/g, '\\$');
    const at = (m, x) => ({ at: lineAt(m.index), of, ...x });
    for (const m of src.matchAll(new RegExp(`(?<![\\w$.])${e}\\.style\\.(minHeight|height)\\s*=\\s*([^;\\n]+)`, 'g'))) out.push(...pxOf(/(minHeight|height)\s*=\s*([^;\n]+)/g, m[0]).map((x) => at(m, x)));
    for (const m of src.matchAll(new RegExp(`(?<![\\w$.])${e}\\.style\\.cssText\\s*=\\s*([^;\\n]+)`, 'g'))) out.push(...cssHeights(m[1]).map((x) => at(m, x)));
    for (const m of src.matchAll(new RegExp(`Object\\.assign\\(\\s*${e}\\.style\\s*,\\s*`, 'g'))) {
      const a = m.index + m[0].length;
      out.push(...resolve(src.slice(a, skipBalanced(src, a, ')'))).map((x) => at(m, x)));
    }
  }
  // CSS: a rule whose selector ends in a chip- or button-family class (not in a pseudo-element of one, nor in what is
  // inside one: .chip .hue, .btn svg). Found from the class itself, so a long generated file is read once.
  const CSS_TAP = /\.(?:[a-z0-9]+-)*(?:chip|btn)(?![\w-])/;
  for (const m of src.matchAll(/\.(?:[a-z0-9]+-)*(chip|btn)(?![\w-])([^{};]*)\{([^{}]*)\}/g)) {
    const [own, ...others] = m[2].split(',');
    const key = (sel) => sel.trim().split(/[\s>+~]+/).pop() || '';
    const sized = (/^[^\s>+~]*\s*$/.test(own) && !own.includes('::')) || others.some((x) => CSS_TAP.test(key(x)) && !key(x).includes('::'));
    if (sized) out.push(...cssHeights(m[3]).map((x) => ({ at: lineAt(m.index), of: m[1], ...x })));
  }
  // CSS: a rule for a co-class, a class a target is built with that is not of a family (those are read just above),
  // under 44 px (`@media (max-height: 640px) { .enc-card .photo-add-inline { min-height: 40px } }` once sized the
  // Meet-a-Mallow card's photo button). Its selector's last part names one: not inside a :not(…), not a pseudo-element
  // of it, not what is inside it, and not only classes seen together on an element that is no target
  // (.photo-add-inline.photo-full: the photo tray's "7 photos added" line)
  const { targets: on, others: off } = known ?? { targets, others };
  const co = new Set(on.flatMap((s) => [...s].filter((c) => !FAMILY.test(c))));
  for (const m of src.matchAll(/\{([^{}]*)\}/g)) {
    const heights = cssHeights(m[1]);
    if (!heights.some((x) => x.px < 44)) continue;
    // (the selectors: back to the brace before, after the last statement, comments left out, an open one too)
    const prelude = src.slice(Math.max(src.lastIndexOf('{', m.index - 1), src.lastIndexOf('}', m.index - 1)) + 1, m.index);
    for (const sel of splitTop(prelude.replace(/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*/g, ' ').split(';').pop(), /,/)) {
      const key = splitTop(sel, /[\s>+~]/).pop();
      if (key.includes('::')) continue;
      const names = [...topText(key).matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((x) => x[1]);
      const via = names.filter((c) => co.has(c));
      if (!via.length || names.some((c) => FAMILY.test(c))) continue;
      const all = on.filter((s) => names.every((c) => s.has(c)));
      if (!all.length && off.some((s) => names.every((c) => s.has(c)))) continue;
      const of = (all.length ? all : on.filter((s) => via.some((c) => s.has(c)))).some((s) => [...s].some((c) => FAMILY.exec(c)?.[1] === 'btn')) ? 'btn' : 'chip';
      out.push(...heights.map((x) => ({ at: lineAt(m.index), of, via: via.join('.'), ...x })));
      break;
    }
  }
  return { found: out, classes: { targets, others } };
}
// the heights given to the chip- and button-family targets in a source (with known, the class names on the whole
// app's elements: tapClasses of each source, merged)
const tapHeights = (src, file = 'src', known = null) => scanTaps(src, file, known).found;
const tapClasses = (src) => scanTaps(src).classes;
const srcFiles = (dir = new URL('../src/', import.meta.url)) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? srcFiles(new URL(`${d.name}/`, dir)) : [new URL(d.name, dir)]));

test('m2: the tap-target scan finds a small minimum on a chip or a button: in a style const, a class held in a variable, a className, CSS', () => {
  const at = (src) => tapHeights(src).filter((x) => x.px != null).map((x) => `${x.what} ${x.px}`);
  // must catch: the classic Another Angle's sort chips, as they were
  assert.deepEqual(at("const SORT_CHIP = { minHeight: '38px', fontWeight: '700', padding: '0 12px' };\nconst b = h('button', { class: 'chip', 'data-short': 'Happened', style: type('label', SORT_CHIP), onclick: () => drop(p, 'fact') }, '← Happened');"), ['minHeight 38']);
  assert.deepEqual(at("const base = compact ? { minHeight: '40px' }\n  : { minHeight: '44px' };\nh('button', { class: `hf-chip${on ? ' primary' : ''}`, style: { ...base, borderStyle: 'dashed' } }, 'x');"), ['minHeight 40', 'minHeight 44']);
  assert.deepEqual(at("const b = document.createElement('button'); b.className = 'hfl-chip'; b.style.minHeight = '36px';"), ['minHeight 36']);
  assert.deepEqual(at('.hm-chip { min-height: 40px; line-height: 1.2 }\n.chip .hue { width: 8px; height: 8px; }\n.tm-tag::before { height: 48px; }\n@media (max-height: 600px) { .chips .chip { height: 42px; } }'), ['min-height 40', 'height 42']);
  // the button family as well: the Express screen's support button as it was, a style const on a ghost button, el()
  // and .hm-auth-btn, a link drawn as a button, a helper's options (legalLink's cls / style), and CSS
  assert.deepEqual(at("h('button', { class: 'btn ghost', style: { minHeight: '40px' }, onclick: () => openSupport(app) }, 'Need support now?')"), ['minHeight 40']);
  assert.deepEqual(at("const ROW = { minHeight: '38px', whiteSpace: 'nowrap' };\nconst skip = h('button', { class: 'btn ghost', style: { ...ROW, padding: '0 10px' } }, 'Skip');"), ['minHeight 38']);
  assert.deepEqual(at("const go = el('button', { class: 'hm-auth-btn small', type: 'submit', style: { height: '36px' } }, 'Go');"), ['height 36']);
  assert.deepEqual(at("h('a', { class: 'btn block', href: 'tel:999', style: { minHeight: '40px' } }, 'Call 999')"), ['minHeight 40']);
  assert.deepEqual(at("legalLink('privacy', { cls: 'btn ghost block', style: { textDecoration: 'none', minHeight: '40px' } })"), ['minHeight 40']);
  assert.deepEqual(at('.btn.ghost { color: var(--text-2); min-height: 40px; }\n.v3-row .btn { min-height: 46px; padding: 0 14px; }\n@media (max-height: 700px) { .v3-row .btn, .btn.icon-only { min-height: 42px; } }\n.btn svg { width: 20px; height: 20px; }\n.row-btns { min-height: 20px; }'), ['min-height 40', 'min-height 46', 'min-height 42']);
  // a class held in a variable: untangle.js's "tiny next step" choices, given 36 px instead of their 44, a class built
  // from another const, and a className from one
  assert.deepEqual(at("const compact = H < 720;\nconst cls = compact ? 'chip' : 'choice';\nfor (const [id, text, note] of STEPS) {\n  const b = h('button', { class: cls, 'aria-pressed': 'false', style: compact ? { minHeight: '36px' } : {} }, text);\n}"), ['minHeight 36']);
  assert.deepEqual(at("const base = 'chip';\nconst cls = on ? `${base} on` : base;\nh('button', { class: cls, style: { minHeight: '40px' } }, 'x');"), ['minHeight 40']);
  assert.deepEqual(at("const k = small ? 'hf-chip small' : 'hf-chip';\nconst b = document.createElement('button'); b.className = k; b.style.height = '40px';"), ['height 40']);
  // and a class that cannot be read here (a parameter) counts when the button is given less than 44 px, as its class
  // or as the className of a button made here
  const open = (src) => tapHeights(src).filter((x) => x.px != null).map((x) => `${x.of} ${x.what} ${x.px}`);
  assert.deepEqual(open("function pill(cls) { return h('button', { class: cls, style: { minHeight: '30px' } }, 'x'); }"), ['open minHeight 30']);
  assert.deepEqual(open("function pill(k) { const b = document.createElement('button'); b.className = k; b.style.minHeight = '32px'; return b; }"), ['open minHeight 32']);
  // must not count: the row of chips, a div drawn like a button (no target), a chip's line height, another control (its
  // own class), a variable class that is neither (its condition is not read as a class), a template's offset, a class
  // that cannot be read given 44 px or more, and one on a div
  assert.deepEqual(at("h('div', { class: 'chips', style: { minHeight: '20px' } }); h('div', { class: 'btn block invite-included', style: { minHeight: '30px' } }); h('button', { class: 'chip', style: { lineHeight: '1.15' } });"), []);
  assert.deepEqual(at("h('button', { class: 'emo-row', style: { minHeight: '30px' } });\nconst cls = compact ? 'row' : 'choice';\nh('button', { class: cls, style: compact ? { minHeight: '36px' } : {} });"), []);
  assert.deepEqual(at("const size = compact() ? 56 : 64;\nh('button', { class: 'icon-btn', style: { width: `${size + 10}px`, height: `${size + 10}px` } }, svg);\nfunction pill(cls) { return h('button', { class: cls, style: { minHeight: '48px' } }); }"), []);
  assert.deepEqual(at("function dot(k) { const d = document.createElement('div'); d.className = k; d.style.height = '8px'; return d; }"), []);
  // a rule for another class a target is built with (a co-class). Must catch: the Meet-a-Mallow card's photo button as
  // it was (a .btn.ghost given 40 px by its .photo-add-inline on a short screen, beside the card's 46 px .btn rule), and
  // in a media query, a chip's co-classes from a const, a template, its classList and a :not(…) key, in rem, block-size
  // and max-height
  const via = (src) => tapHeights(src).filter((x) => x.via).map((x) => `${x.of} .${x.via} ${x.what} ${x.px}`);
  const photo = "return h('button', { class: 'btn ghost block photo-add-inline', onclick: () => picker.click() }, icon('camera'), 'Add up to seven of your photos (optional)');\n";
  assert.deepEqual(via(`${photo}@media (max-height: 640px) {\n  .enc-card .btn { min-height: 46px; }\n  .enc-card .photo-add-inline { min-height: 40px; margin-top: 6px; font: var(--type-label); font-weight: 700; }\n}`), ['btn .photo-add-inline min-height 40']);
  assert.deepEqual(via("const PILL = 'chip mood-pill';\nconst b = h('button', { class: on ? `${PILL} is-on` : PILL }, 'Calm');\nb.classList.add('picked');\n" +
    '@media (max-width: 360px) and (max-height: 700px) { .row .mood-pill:not(.wide) { block-size: 2.25rem; } .is-on { max-height: 40px; } .picked:hover { height: 38px; } }'),
  ['chip .mood-pill block-size 36', 'chip .is-on max-height 40', 'chip .picked height 38']);
  // must not count: what is inside it, its pseudo-element, it only beside a class seen with it on no target (the full
  // tray's status line), classes never on a target (a div drawn like a button, a span), it inside a :not(…), 44 px,
  // the media query's own max-height, a comment naming it, and a rule commented out
  assert.deepEqual(at(`${photo}h('div', { class: 'photo-add-inline photo-full', role: 'status' }, '7 photos added');\nh('div', { class: 'btn block invite-included' }, 'Included');\nh('span', { class: 'photo-note' }, 'Kept on this device');\n` +
    '@media (max-height: 640px) {\n  .photo-add-inline svg { height: 20px; }\n  .photo-add-inline::before { height: 8px; }\n  .enc-card .photo-add-inline.photo-full { min-height: 30px; }\n  .photo-full, .photo-note, .invite-included { min-height: 30px; }\n' +
    '  .reasons span:not(.photo-add-inline) { height: 20px; }\n  .photo-add-inline { min-height: 44px; max-height: none; }\n}\n/* .photo-add-inline, as it was */ .reasons { min-height: 20px; }\n/* .photo-add-inline { min-height: 40px } */'), []);
});

test('m2: chips, buttons, the Settings Volume slider and the Thought Mallow’s words tag are at least 44 px to a finger', () => {
  const css = read('src/ui/app.css');
  assert.match(css, /^\.chip \{ flex: 0 0 auto; min-height: 44px;/m);
  assert.match(css, /^\.btn \{[^}]*min-height: 52px;/m);
  assert.match(css, /^\.btn\.ghost \{[^}]*min-height: 44px;/m);
  // no chip or button anywhere in the app is given less, inline or in CSS: every .js and .css file under src/ (the
  // check used to read five files, and then chips only: the classic Another Angle's 38 px sort chips, and then six
  // ghost buttons kept at 38 or 40 px, the Express screen's "Need support now?" among them, and then a ghost button
  // sized through its other class, the Meet-a-Mallow card's photo button, went unseen)
  const files = srcFiles().filter((u) => /\.(js|css)$/.test(u.pathname)).map((u) => [u, readFileSync(u, 'utf8')]);
  assert.ok(files.filter(([u]) => u.pathname.endsWith('.js')).length >= 200, `${files.length} files`);
  const rel = (u) => u.pathname.slice(u.pathname.indexOf('/src/') + 1);
  // (a rule in one file sizes a class built in another: the class names of every element in src/ first)
  const known = { targets: [], others: [] };
  for (const [, t] of files) { const c = tapClasses(t); known.targets.push(...c.targets); known.others.push(...c.others); }
  assert.ok(known.targets.some((s) => ['btn', 'ghost', 'block', 'photo-add-inline'].every((c) => s.has(c))), 'the photo button’s classes are read');
  const found = files.flatMap(([u, t]) => tapHeights(t, rel(u), known));
  assert.ok(found.filter((x) => x.what === 'chip').length >= 40, 'the chips themselves were found');
  assert.ok(found.filter((x) => x.what === 'btn').length >= 150, 'and the buttons');
  assert.ok(found.some((x) => x.at.startsWith('src/ultra/another-angle.js') && x.what === 'chip'), 'the classic Another Angle’s chips are in the scan');
  assert.ok(found.some((x) => x.at.startsWith('src/app/scenes/express.js') && x.what === 'btn'), 'the Express screen’s buttons are in the scan');
  // (untangle.js's "tiny next step" choices take their class from a variable, `cls`: read, with their 44 px)
  const step = fnBody(read('src/rituals/untangle.js'), "const cls = compact ? 'chip' : 'choice';", 'b.onclick');
  assert.match(step, /h\('button', \{ class: cls, [^\n]*style: compact \? \{ minHeight: '44px' \} : \{\} \}/);
  assert.ok(found.some((x) => x.at.startsWith('src/rituals/untangle.js') && x.of === 'chip' && x.px === 44), 'the variable class is read');
  assert.deepEqual(found.filter((x) => x.px != null && x.px < 44).map((x) => `${x.at}: ${x.what} ${x.px}px${x.via ? ` (.${x.via})` : ''}`), []);
  // and it would see any of them come back: the choices at 36 px, the support button at 40, the photo button at 40
  const small = (p, a, b) => { const t = read(p); assert.equal(t.split(a).length, 2, a); return tapHeights(t.replace(a, b), p, known).filter((x) => x.px < 44).map((x) => `${x.of} ${x.what} ${x.px}`); };
  assert.deepEqual(small('src/rituals/untangle.js', "class: cls, 'aria-pressed': 'false', style: compact ? { minHeight: '44px' }", "class: cls, 'aria-pressed': 'false', style: compact ? { minHeight: '36px' }"), ['chip minHeight 36']);
  assert.deepEqual(small('src/app/scenes/express.js', "class: 'btn ghost', onclick: () => openSupport(app)", "class: 'btn ghost', style: { minHeight: '40px' }, onclick: () => openSupport(app)"), ['btn minHeight 40']);
  assert.deepEqual(small('src/ui/app.css', '.enc-card .photo-add-inline { min-height: 44px;', '.enc-card .photo-add-inline { min-height: 40px;'), ['btn min-height 40']);
  // the slider: 44 px tall inside its row's own padding (the row keeps its height: 14 px padding either side)
  assert.match(css, /\.setting \.range \{ height: 44px; margin-block: -6px; \}/);
  assert.match(css, /\.setting \{ display: flex; align-items: center; gap: 12px; padding: 14px 0;/);
  assert.match(read('src/app/scenes/settings.js'), /h\('input', \{ type: 'range', class: 'range',[^\n]*'aria-label': 'Volume'/);
  // the words tag keeps its look; its target is the invisible ::before, at least 48 px tall and a little wider, and
  // nothing clips it (QA's audit measured the 36 px box; a tap 4 px above or 5 px below it reads the words)
  const layer = read('src/mallows/thought/layer.js');
  const before = /\.tm-tag::before\{([^}]*)\}/.exec(layer)?.[1];
  assert.ok(before, 'the tag has its hit area');
  assert.match(before, /content:"";position:absolute;left:-2px;right:-2px;top:50%;height:max\(100% \+ 4px,(\d+)px\);transform:translateY\(-50%\)/);
  assert.ok(+/max\(100% \+ 4px,(\d+)px\)/.exec(before)[1] >= 44);
  const tag = /\.tm-tag\{([^}]*)\}/.exec(layer)[1];
  assert.doesNotMatch(tag, /overflow\s*:|contain\s*:/, 'nothing clips the hit area');
  assert.match(tag, /pointer-events:auto/);
});

// (review of m2) the classic Another Angle's "Fact or fiction" step gave its sort chips an inline 38 px minimum, over
// the .chip's own 44 px: the step's main controls stayed 38 px tall. Run to that step and measure what it builds.
test('m2: the classic Another Angle’s “← Happened” / “Brain added →” chips are at least 44 px to a finger', async () => {
  const cssMin = +/^\.chip \{[^}]*min-height: (\d+)px/m.exec(read('src/ui/app.css'))[1];
  const win = fakeWindow({ W: 320, H: 568 });
  const ac = new AbortController();
  let running = null;
  try {
    const [angle, frameworks, engine] = await Promise.all([import('../src/ultra/another-angle.js'), import('../src/ultra/frameworks.js'), import('../src/ultra/reframe-engine.js')]);
    const dock = new FakeEl('div');
    const world = { realm: null, fx: new FakeEl('div'), layer: { offsetHeight: 470 }, showMallow() {}, setEmotion() {}, place() {}, setStage() {}, fitBetween() {} };
    const ctx = { world, dock, signal: ac.signal, audio: { fx() {}, ui() {} }, haptic() {}, setMove() {}, say() {}, toast() {}, reducedMotion: true,
      input: { text: 'My manager criticised my report in front of everyone. I think I am terrible at my job and everyone knows it.' } };
    running = angle.run(ctx, { frameworks, engine });
    const press = async (re) => { const b = await until(() => allEls(dock).find((n) => n.tagName === 'BUTTON' && re.test(textOf(n)) && n.onclick), `${re}`); b.onclick(); };
    await press(/plot twist/);
    await press(/^That’s it$/);
    const pieces = await until(() => { const p = allEls(win.body).filter((n) => classes(n).includes('piece')); return p.length ? p : null; }, 'the pieces', 5000);
    const chips = pieces.flatMap((p) => allEls(p).filter((n) => n.tagName === 'BUTTON' && classes(n).includes('chip')));
    assert.equal(chips.length, 2 * pieces.length, 'each piece has its two sort chips');
    assert.deepEqual([...new Set(chips.map(textOf))], ['← Happened', 'Brain added →']);
    for (const c of chips) {
      // an inline minimum wins over the class's; with none, the .chip's 44 px holds
      const min = c.style.minHeight ? parseFloat(c.style.minHeight) : cssMin;
      assert.ok(min >= 44, `“${textOf(c)}”: min-height ${c.style.minHeight || `${cssMin}px (.chip)`}`);
      assert.ok(!c.style.height || parseFloat(c.style.height) >= 44, `“${textOf(c)}”: height ${c.style.height}`);
    }
  } finally {
    ac.abort();
    await running?.catch(() => {});
    await new Promise((r) => setTimeout(r, 600));   // the step's own timers (its 520 ms relayout) still find the window
    win.restore();
  }
});

// (review of m2, again) the same inline minimum was kept on .btn.ghost buttons, over the class's own 44 px: the Express
// screen's "Need support now?" and "Browse every feeling A–Z →" (40 px), and the classic Another Angle's "+ Add what
// happened" (40), "Scan it all for me", "Doesn’t apply · skip" and "+ My own" (38). Build them and measure; each
// compact row also takes the room it took, so the card and the docks lay out as before.
const ghostMin = () => +/^\.btn\.ghost \{[^}]*min-height: (\d+)px/m.exec(read('src/ui/app.css'))[1];
const px = (v) => parseFloat(v) || 0;
const marginY = (st) => { const m = String(st.margin || '').trim().split(/\s+/); return [px(st.marginTop ?? m[0]), px(st.marginBottom ?? m[2] ?? m[0])]; };
/** n's minimum height (inline, else the .btn.ghost's), as a finger meets it, and the room it takes with its margins. */
function ghostBox(n) {
  assert.deepEqual(classes(n).slice(0, 2), ['btn', 'ghost'], `“${textOf(n)}”: ${n.attrs.class}`);
  const min = n.style.minHeight ? px(n.style.minHeight) : ghostMin();
  const [t, b] = marginY(n.style);
  assert.ok(min >= 44, `“${textOf(n)}”: min-height ${n.style.minHeight || `${ghostMin()}px (.btn.ghost)`}`);
  assert.ok(!n.style.height || px(n.style.height) >= 44, `“${textOf(n)}”: height ${n.style.height}`);
  return { min, room: min + t + b };
}
const button = (root, re) => allEls(root).find((n) => n.tagName === 'BUTTON' && re.test(textOf(n)));

test('m2: the Express screen’s “Need support now?” and “Browse every feeling A–Z →” are at least 44 px to a finger', async () => {
  const win = fakeWindow({ W: 320, H: 568 });
  // (the screen warms the Mallow cards when the page is idle: never, here)
  const ric = Object.getOwnPropertyDescriptor(globalThis, 'requestIdleCallback');
  globalThis.requestIdleCallback = () => 0;
  try {
    const { default: express } = await import('../src/app/scenes/express.js');
    const world = { mallowId: 'noomi', dim() {}, setStage() {}, setEmotion() {}, showMallow() {}, place() {} };
    const app = { world, state: {}, back() {}, go() {}, haptic() {}, audio: { ui() {} }, prefs: { get() {} } };
    const { el } = express(app);
    const support = button(el, /^Need support now\?$/);
    assert.ok(support && support.parentNode && classes(support.parentNode).includes('topbar'), 'in the top bar');
    // the top bar is 44 px already (its back button): a 44 px support button moves nothing
    assert.match(read('src/ui/app.css'), /^\.topbar \{[^}]*min-height: 44px;/m);
    assert.ok(ghostBox(support).room <= 44);
    const browse = button(el, /^Browse every feeling A–Z →$/);
    const picked = allEls(el).find((n) => n.attrs['aria-label'] === 'Feelings you picked').parentNode;
    assert.equal(picked.parentNode, browse.parentNode, 'the picked feelings follow the browse button');
    assert.equal(picked.parentNode.children.indexOf(picked), picked.parentNode.children.indexOf(browse) + 1);
    // 40 px and a 6 px gap before: the card is no taller
    assert.ok(ghostBox(browse).room + px(picked.style.marginTop) <= 40 + 6, `browse ${ghostBox(browse).room} + ${picked.style.marginTop}`);
  } finally {
    if (ric) Object.defineProperty(globalThis, 'requestIdleCallback', ric); else delete globalThis.requestIdleCallback;
    win.restore();
  }
});

// (review of round 2, also seen) at 320×568 the Express card is taller than the screen (Playwright: 126 px to scroll,
// 336 with words typed; 275 and 490 at text size Largest), and the top bar holding "Need support now?" scrolled away
// with it: scrolled to "Meet a Mallow", no way to support was in reach (nothing on screen, nothing fixed, and the system
// back lands on the Hushfold, which shows none either). Only the space and the card below the bar scroll now.
test('m2: the Express screen’s “Need support now?” stays in reach while the card scrolls (the top bar is not in the scroller)', async () => {
  const win = fakeWindow({ W: 320, H: 568 });
  const ric = Object.getOwnPropertyDescriptor(globalThis, 'requestIdleCallback');
  globalThis.requestIdleCallback = () => 0;
  try {
    const { default: express } = await import('../src/app/scenes/express.js');
    const world = { mallowId: 'noomi', dim() {}, setStage() {}, setEmotion() {}, showMallow() {}, place() {} };
    const app = { world, state: {}, back() {}, go() {}, haptic() {}, audio: { ui() {} }, prefs: { get() {} } };
    const { el } = express(app);
    const scrolls = (n) => /^(auto|scroll)$/.test(n.style.overflowY || n.style.overflow || '');
    const support = button(el, /^Need support now\?$/);
    const topbar = support.parentNode;
    assert.ok(classes(topbar).includes('topbar'));
    // nothing from the button to the scene scrolls
    for (let n = support; n; n = n.parentNode) assert.ok(!scrolls(n), `${n.attrs.class || n.tagName} scrolls, and the support button with it`);
    // the card does, in a scroller of its own below the bar that takes the rest of the screen and gives up its height
    const card = allEls(el).find((n) => classes(n).includes('express-card'));
    let sc = card.parentNode;
    while (sc && !scrolls(sc)) sc = sc.parentNode;
    assert.ok(sc, 'the card scrolls');
    assert.deepEqual(el.children, [topbar, sc], 'the bar, then the scroller');
    assert.deepEqual([el.style.display, el.style.flexDirection, el.style.height], ['flex', 'column', '100%']);
    assert.deepEqual([sc.style.display, sc.style.flexDirection, sc.style.flex, sc.style.minHeight], ['flex', 'column', '1 1 auto', '0']);
    // with the space above the card in it, first: where the card fits, it lays out where it did
    assert.deepEqual(sc.children.map((n) => classes(n)[0]), ['spacer', 'card']);
    assert.equal(sc.children[0].style.minHeight, '22dvh');
    // (and the stylesheets give neither the screen nor the bar a scroller or a position of their own)
    const css = ['tokens', 'type', 'app', 'hushfold'].map((f) => read(`src/ui/${f}.css`)).join('\n');
    for (const m of css.matchAll(/([^{}]*\.(?:express|topbar)\b[^{}]*)\{([^{}]*)\}/g)) {
      const own = m[1].split(',').some((s) => /\.(express|topbar)(?:[.:][\w-]+)*\s*$/.test(s.trim()) && !/\.(plans-topbar|express-scroll)/.test(s));
      if (own) assert.doesNotMatch(m[2], /overflow|position\s*:\s*(fixed|absolute|sticky)/, `${m[1].trim()}`);
    }
  } finally {
    if (ric) Object.defineProperty(globalThis, 'requestIdleCallback', ric); else delete globalThis.requestIdleCallback;
    win.restore();
  }
});

test('m2: the classic Another Angle’s ghost buttons (Fact or fiction, X-ray, Orbit) are at least 44 px to a finger', async () => {
  const win = fakeWindow({ W: 320, H: 568 });
  const gcs = Object.getOwnPropertyDescriptor(globalThis, 'getComputedStyle');
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
  const ac = new AbortController();
  let running = null;
  try {
    const [angle, frameworks, engine] = await Promise.all([import('../src/ultra/another-angle.js'), import('../src/ultra/frameworks.js'), import('../src/ultra/reframe-engine.js')]);
    const dock = new FakeEl('div');
    const world = { realm: null, fx: new FakeEl('div'), layer: { offsetHeight: 470 }, showMallow() {}, setEmotion() {}, place() {}, setStage() {}, fitBetween() {}, react() {} };
    const ctx = { world, dock, signal: ac.signal, audio: { fx() {}, ui() {} }, haptic() {}, setMove() {}, say() {}, toast() {}, reducedMotion: true,
      input: { text: 'My manager criticised my report in front of everyone. I think I am terrible at my job and everyone knows it.' } };
    running = angle.run(ctx, { frameworks, engine });
    const find = (re) => until(() => { const b = button(dock, re); return b && (b.onclick || b.listeners.click) ? b : null; }, `${re}`, 5000);
    const press = async (re) => { const b = await find(re); if (b.onclick) b.onclick(); else b.listeners.click.forEach((f) => f()); };
    await press(/plot twist/);
    await press(/^That’s it$/);
    // 1. Fact or fiction: "+ Add what happened" above "Split it", in the 40 px row it had
    const addFact = await find(/^\+ Add what happened$/);
    assert.ok(ghostBox(addFact).room <= 40, `“+ Add what happened” takes ${ghostBox(addFact).room} px`);
    // (sorted: the first piece happened, the rest the brain added)
    const pieces = await until(() => { const p = allEls(win.body).filter((n) => classes(n).includes('piece')); return p.length ? p : null; }, 'the pieces', 5000);
    pieces.forEach((p, i) => allEls(p).find((n) => n.tagName === 'BUTTON' && (i ? /^Brain added/ : /Happened$/).test(textOf(n))).listeners.click.forEach((f) => f()));
    await press(/^(Split it|Carry on)$/);
    // 2. X-ray: "Scan it all for me", in the scroller above the step's button; the scroller gives the 6 px back
    const scanAll = await find(/^Scan it all for me$/);
    const cards = scanAll.parentNode.parentNode;
    assert.equal(cards.style.overflowY, 'auto');
    assert.equal(dock.children[0], cards);
    const [ct, cb] = marginY(cards.style);
    assert.ok(ghostBox(scanAll).room + ct + cb <= 38, `the scroller takes ${ghostBox(scanAll).room + ct + cb} px`);
    await press(/carry on/i);
    // 3. Orbit: "Doesn’t apply · skip" and "+ My own", one row above "That’s enough evidence"
    const own = await find(/^\+ My own$/);
    const skip = button(dock, /^(Skip|Doesn’t apply · skip)$/);
    assert.equal(skip.parentNode, own.parentNode);
    const done = button(dock, /^That’s enough evidence$/);
    assert.equal(dock.children.indexOf(done), dock.children.indexOf(own.parentNode) + 1);
    await until(() => dock.children[0].children.length, 'the first evidence card');   // (the step is set up: an abort ends it)
    // 38 px and an 8 px margin before: the dock, and so the orbit's band, are as tall as before
    for (const b of [skip, own]) assert.ok(ghostBox(b).room + px(done.style.marginTop) <= 38 + 8, `“${textOf(b)}”: ${ghostBox(b).room} + ${done.style.marginTop}`);
  } finally {
    ac.abort();
    await running?.catch(() => {});
    await new Promise((r) => setTimeout(r, 600));   // the steps' own timers still find the window
    if (gcs) Object.defineProperty(globalThis, 'getComputedStyle', gcs); else delete globalThis.getComputedStyle;
    win.restore();
  }
});

// (review of round 2) and the Meet-a-Mallow card's photo button, a .btn.ghost given 40 px through its other class: on a
// short screen `.enc-card .photo-add-inline { min-height: 40px }` (app.css, max-height: 640px) came after the
// .btn.ghost's 44. The page's stylesheets, read as the browser reads them for one element: every rule whose selector is
// a run of tags, classes and ids matching it and its ancestors (a state, :hover or :not(…), is not read), at the top
// level or in an @media whose width, height and orientation conditions hold; !important, then the most specific, then
// the last, wins. → the value of prop (margin-top from a margin as well)
function cascade(css, prop, { W, H }, chain) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const holds = (q) => q.split(',').some((part) => {
    const fs = [...part.matchAll(/\(\s*([\w-]+)\s*:\s*([^)]+)\)/g)];
    const ok = { 'min-width': (v) => W >= v, 'max-width': (v) => W <= v, 'min-height': (v) => H >= v, 'max-height': (v) => H <= v };
    return fs.length > 0 && !/\bnot\b/.test(part) && fs.every(([, f, v]) => (f === 'orientation' ? v.trim() === (W > H ? 'landscape' : 'portrait') : !!ok[f]?.(parseFloat(v))));
  });
  const rules = [];
  const walk = (s, live) => {
    for (let i = 0; ;) {
      const open = s.indexOf('{', i);
      if (open < 0) return;
      let j = open + 1;
      for (let d = 1; j < s.length && d; j++) d += s[j] === '{' ? 1 : s[j] === '}' ? -1 : 0;
      const prelude = s.slice(i, open).split(';').pop().trim(), body = s.slice(open + 1, j - 1);
      if (prelude.startsWith('@media')) walk(body, live && holds(prelude));
      else if (live && !prelude.startsWith('@')) rules.push({ prelude, body });
      i = j;
    }
  };
  walk(text, true);
  const one = (c, n) => { const m = /^([a-z][\w-]*|\*)?((?:[.#][\w-]+)*)$/i.exec(c); return !!m && (!m[1] || m[1] === '*' || m[1] === n.tag) && (m[2].match(/[.#][\w-]+/g) || []).every((x) => (x[0] === '#' ? n.id === x.slice(1) : n.classes.includes(x.slice(1)))); };
  const matches = (sel) => {
    if (/[+~]/.test(sel)) return false;
    const parts = sel.split(/\s*>\s*|\s+/).filter(Boolean);
    if (!one(parts.pop(), chain[0])) return false;
    let k = 1;
    for (const p of parts.reverse()) { while (k < chain.length && !one(p, chain[k])) k++; if (k++ >= chain.length) return false; }
    return true;
  };
  const weight = (sel) => (sel.match(/#[\w-]+/g) || []).length * 1e4 + (sel.match(/\.[\w-]+/g) || []).length * 100 + (sel.match(/(^|[\s>])[a-z]/gi) || []).length;
  let best = null;
  rules.forEach(({ prelude, body }, order) => {
    for (const sel of prelude.split(',').map((x) => x.trim()).filter(matches)) {
      for (const d of body.split(';')) {
        const [p, ...v] = d.split(':'), name = p.trim();
        if (name !== prop && !(prop === 'margin-top' && name === 'margin')) continue;
        const raw = v.join(':').trim(), important = /!important$/.test(raw), value = raw.replace(/\s*!important$/, '');
        const w = [important ? 1 : 0, weight(sel), order];
        if (!best || w[0] > best.w[0] || (w[0] === best.w[0] && (w[1] > best.w[1] || (w[1] === best.w[1] && w[2] >= best.w[2])))) best = { w, value: name === 'margin' ? value.split(/\s+/)[0] : value, sel };
      }
    }
  });
  return best;
}

test('m2: the Meet-a-Mallow card’s photo button is at least 44 px to a finger on a short screen too, and the card is no taller', () => {
  // the button: a .btn.ghost.block with its own class, in the card, on the scene
  assert.match(read('src/app/scenes/encounter.js'), /return h\('button', \{ class: 'btn ghost block photo-add-inline', onclick: \(\) => picker\.click\(\) \},/);
  assert.match(read('src/app/scenes/encounter.js'), /const card = h\('div', \{ class: 'card enc-card' \}\);/);
  const css = ['tokens', 'type', 'app', 'hushfold'].map((f) => read(`src/ui/${f}.css`)).join('\n');
  assert.ok(/<link rel="stylesheet" href="src\/ui\/tokens\.css">\s*<link rel="stylesheet" href="src\/ui\/type\.css">\s*<link rel="stylesheet" href="src\/ui\/app\.css">\s*<link rel="stylesheet" href="src\/ui\/hushfold\.css">/.test(read('index.html')), 'in this order');
  const chain = [{ tag: 'button', classes: ['btn', 'ghost', 'block', 'photo-add-inline'] }, { tag: 'div', classes: ['card', 'enc-card'] }, { tag: 'div', classes: [] },
    { tag: 'div', id: 'scene', classes: [] }, { tag: 'body', classes: [] }, { tag: 'html', classes: [] }];
  // (the cascade reads the .btn.ghost's own 44 px where nothing else sizes it, and the card's other buttons' 46)
  assert.equal(cascade(css, 'min-height', { W: 390, H: 844 }, chain).sel, '.btn.ghost');
  assert.equal(cascade(css, 'min-height', { W: 320, H: 568 }, [{ tag: 'button', classes: ['btn', 'ghost', 'block'] }, ...chain.slice(1)]).value, '46px');
  for (const [size, W, H, room] of [['320×568', 320, 568, 40 + 6], ['667×375 (landscape)', 667, 375, 40 + 6], ['390×844', 390, 844, 44 + 10], ['1280×800', 1280, 800, 44 + 10]]) {
    const min = cascade(css, 'min-height', { W, H }, chain), top = cascade(css, 'margin-top', { W, H }, chain);
    assert.ok(parseFloat(min.value) >= 44, `${size}: min-height ${min.value} (${min.sel})`);
    // the room it takes is the room it took (40 px and a 6 px margin on a short screen): the card is no taller
    assert.ok(parseFloat(min.value) + parseFloat(top.value) <= room, `${size}: ${min.value} + ${top.value} (${top.sel})`);
  }
});

test('m3: a V3 ritual’s Mallow lines keep out of the whole stage (the title band is borrowed instead), live as it moves', () => {
  const host = read('src/v3/host.js');
  assert.match(host, /const stageAvoid = \(\) => \(phaseName === 'end' \? \[\] : \[\{ left: stage\.x, top: stage\.y, right: stage\.x \+ stage\.w, bottom: stage\.y \+ stage\.h \}\]\);/);
  assert.match(host, /const say = \(text, ms = 3400\) => \{ if \(text\) \{ ctx\.say\(text, \{ who: lead\.name, ms, avoid: stageAvoid \}\);/);
  // every line goes through it: the opening, halfway, the law's and the finale's (the law module is handed the same say)
  assert.doesNotMatch(host.replace(/const say = [^\n]*\n/, ''), /ctx\.say\(/);
  assert.match(host, /words: E\.words, photos, sound, haptic, react: \(k\) => react\(k, true\), say, setPrompt,/);
  assert.match(read('src/app/scenes/ritual.js'), /say: \(text, opts\) => say\(world, text, opts\),/, 'the ritual scene passes the options on');
  const ui = read('src/app/ui.js');
  const obs = fnBody(ui, 'function collectObstacles(world, avoid) {', '// the top bar and the dock always stay clear');
  // a rect a ritual passes is a piece however big (a tall phone's stage is more than half the screen); only layers found
  // in the page are let off for their size
  assert.match(obs, /if \(kind === 'piece' && el && \(right - r\.left\) \* \(bottom - r\.top\) > area \* 0\.5\) return;/);
  assert.match(obs, /for \(const r of \(typeof avoid === 'function' \? avoid\(\) : avoid\) \|\| \[\]\) add\(r, 'piece'\);/);
  // a title the line has dimmed is still the title band: no flicker (it was measured as gone once faded, and the line
  // moved off it and back every few hundred ms)
  assert.match(obs, /add\(el\.classList\.contains\('say-dim'\) \? boxRect\(el\) : visibleRect\(el\), 'title', el\)/);
  assert.match(ui, /function boxRect\(el\) \{\n  const r = el\.getBoundingClientRect\(\);\n  return r\.width >= 1 && r\.height >= 1 \? r : null;\n\}/);
});

// the small Mallow as fitBetween places it in the dock (Playwright, HM-0001, Glitzi; before it is kept inside): its
// layer's box, its body's box (the rig's framing), the dock's spot, where the words chip and Tap instead begin, and the
// viewport less its safe-area insets (320×568 at text size Largest has the same dock as 320×568)
const MALLOW_IN_DOCK = [
  // [label, layer, body, spot, controls' left, area]
  ['320×568', { left: -2.7, top: 436.7, right: 112.7, bottom: 570 }, { left: 17.2, top: 481.9, right: 92.8, bottom: 554 }, { left: 20, top: 474, right: 90, bottom: 552 }, 100, { left: 0, top: 0, right: 320, bottom: 568 }],
  ['375×812', { left: 5, top: 656.7, right: 119, bottom: 817.3 }, { left: 24.7, top: 726.7, right: 99.3, bottom: 798 }, { left: 20, top: 700, right: 104, bottom: 796 }, 114, { left: 0, top: 0, right: 375, bottom: 812 }],
  ['390×844', { left: 3.4, top: 686.5, right: 120.6, bottom: 851 }, { left: 23.6, top: 758, right: 100.4, bottom: 831.3 }, { left: 20, top: 732, right: 104, bottom: 828 }, 114, { left: 0, top: 0, right: 390, bottom: 844 }],
  ['430×932', { left: -2.7, top: 774.5, right: 126.8, bottom: 939 }, { left: 19.6, top: 838.3, right: 104.4, bottom: 919.3 }, { left: 20, top: 820, right: 104, bottom: 916 }, 114, { left: 0, top: 0, right: 430, bottom: 932 }],
  ['820×1180', { left: 136.8, top: 1022.5, right: 287.3, bottom: 1187 }, { left: 162.7, top: 1073.2, right: 261.3, bottom: 1167.3 }, { left: 170, top: 1068, right: 254, bottom: 1164 }, 264, { left: 0, top: 0, right: 820, bottom: 1180 }],
  ['1280×800', { left: 364.9, top: 644.7, right: 519.1, bottom: 805.3 }, { left: 391.5, top: 689.6, right: 492.5, bottom: 786 }, { left: 400, top: 688, right: 484, bottom: 784 }, 494, { left: 0, top: 0, right: 1280, bottom: 800 }],
  ['390×844, an iPhone’s notch and home bar (47, 34)', { left: 3.4, top: 652.5, right: 120.6, bottom: 817 }, { left: 23.6, top: 724, right: 100.4, bottom: 797.3 }, { left: 20, top: 698, right: 104, bottom: 794 }, 114, { left: 0, top: 47, right: 390, bottom: 810 }],
  // a phone on its side: the layer is far wider than the body
  ['667×375', { left: -35.3, top: 268.5, right: 145.3, bottom: 356.7 }, { left: 23.4, top: 285.8, right: 86.6, bottom: 346.1 }, { left: 20, top: 281, right: 90, bottom: 359 }, 100, { left: 0, top: 0, right: 667, bottom: 375 }],
  ['667×375, a notch at the side (0, 47, 21, 47)', { left: -35.3, top: 247.5, right: 145.3, bottom: 335.7 }, { left: 23.4, top: 264.8, right: 86.6, bottom: 325.1 }, { left: 20, top: 260, right: 90, bottom: 338 }, 100, { left: 47, top: 0, right: 620, bottom: 354 }],
  ['568×320', { left: -35.3, top: 220.7, right: 145.3, bottom: 295.8 }, { left: 28.1, top: 235.4, right: 81.9, bottom: 286.8 }, { left: 20, top: 226, right: 90, bottom: 304 }, 100, { left: 0, top: 0, right: 568, bottom: 320 }],
  ['568×320, a notch at the side (0, 47, 21, 47)', { left: -35.3, top: 199.7, right: 145.3, bottom: 274.8 }, { left: 28.1, top: 214.4, right: 81.9, bottom: 265.8 }, { left: 20, top: 205, right: 90, bottom: 283 }, 100, { left: 47, top: 0, right: 521, bottom: 299 }],
];

test('m4: the small Mallow in a V3 ritual’s dock stays on screen, inside the safe-area insets, and over its spot', () => {
  const move = (b, f) => ({ left: b.left + f.dx, top: b.top + f.dy, right: b.right + f.dx, bottom: b.bottom + f.dy });
  const inside = (b, a) => b.left >= a.left - 1e-9 && b.right <= a.right + 1e-9 && b.top >= a.top - 1e-9 && b.bottom <= a.bottom + 1e-9;
  for (const [label, layer, body, spot, controls, area] of MALLOW_IN_DOCK) {
    const f = keepBodyInside(layer, body, area);
    assert.equal(f.k, 1, `${label}: it only moves`);
    const b = move(body, f), L = move(layer, f);
    const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
    assert.ok(inside(b, area), `${label}: the body is on screen, inside the insets: ${JSON.stringify(b)}`);
    assert.ok(cx >= spot.left && cx <= spot.right && cy >= spot.top && cy <= spot.bottom, `${label}: the body's centre (${cx}, ${cy}) is over its spot`);
    // the layer comes in by a nudge at most: in portrait (a layer not much wider than the body) that is all of it, as
    // before, by a few px; on its side, part of its transparent margin stays off screen
    if (layer.right - layer.left < 2 * (body.right - body.left)) {
      assert.ok(inside(L, area), `${label}: in portrait all of the layer is on screen too: ${JSON.stringify(L)}`);
      assert.ok(Math.abs(f.dx) <= 3 && Math.abs(f.dy) <= 8, `${label}: by a few px only (${f.dx}, ${f.dy})`);
    }
    else assert.ok(Math.abs(f.dx) <= MALLOW_NUDGE * (body.right - body.left) + 1e-9 || f.dx === area.left - body.left, `${label}: dx ${f.dx}`);
    // and with no inset beside it, the body is clear of the words chip and Tap instead
    if (!area.left) assert.ok(b.right <= controls, `${label}: the body ends at ${b.right}, the controls begin at ${controls}`);
  }
  // a body already inside, with its layer, stays put; a body bigger than the area shrinks about its centre to fit
  assert.deepEqual(keepBodyInside({ left: 0, top: 0, right: 60, bottom: 60 }, { left: 10, top: 10, right: 50, bottom: 50 }, { left: 0, top: 0, right: 100, bottom: 100 }), { dx: 0, dy: 0, k: 1 });
  const big = keepBodyInside({ left: -80, top: -10, right: 180, bottom: 110 }, { left: -50, top: 0, right: 150, bottom: 100 }, { left: 0, top: 0, right: 100, bottom: 200 });
  assert.equal(big.k, 0.5);
  assert.equal(big.dx, 0);
  // the host keeps the body inside where it puts the Mallow, from the rig's framing, with the insets measured live
  // (played through the host in qa-mobile-review.test.mjs (3))
  const host = read('src/v3/host.js');
  const place = fnBody(host, 'function placeMallow(mode = phaseName) {', 'const resizeFns');
  assert.match(place, /\} else world\.fitBetween\(r\.top - 8, r\.bottom \+ 2, \{ maxScale: 0\.42, x: \(\(r\.left \+ r\.width \/ 2\) \/ innerWidth\) \* 100 \}\);\n    keepMallowInside\(\);/);
  assert.match(place, /padding: 'env\(safe-area-inset-top, 0px\) env\(safe-area-inset-right, 0px\) env\(safe-area-inset-bottom, 0px\) env\(safe-area-inset-left, 0px\)'/);
  assert.match(place, /const f = world\.bodyFrame\?\.\(\) \|\|/);
  assert.match(fnBody(host, 'function cleanup() {', 'function finish('), /insetProbe\.remove\(\);/);
});

test('law 19 (Anchor and Explore): its own hints, followed with one finger, finish it; two fingers still do', async () => {
  const { createLaw } = await import('../src/v3/laws.js');
  let t = 0;
  // the stage at 320×568, text size Largest (a three-line prompt)
  const L = () => ({ stage: { x: 12, y: 245, w: 296, h: 201, cx: 160, cy: 345.5, s: 0.72 }, now: () => t, sound() {}, haptic() {}, react() {}, setPrompt() {},
    words: { token: 'my words' }, pal: { glow: '#ffffff' }, photos: { n: 0 }, particles: { emit() {} } });
  const swipe = (law, h, id) => {
    law.down({ ...h.from, id });
    for (let i = 1; i <= 12; i++) law.move({ x: h.from.x + ((h.to.x - h.from.x) * i) / 12, y: h.from.y + ((h.to.y - h.from.y) * i) / 12, id });
    law.up({ ...h.to, id });
  };
  // one finger, as the ghost shows: tap the anchor, then trace out from it to each light (the first trace begins on the
  // anchor: it used to take the anchor again and never count, so the law stayed at a quarter at every size)
  const one = createLaw(19, L());
  const h0 = one.hint();
  assert.ok(h0.tap, 'first: tap the anchor');
  one.down({ ...h0.tap, id: 1 }); one.up({ ...h0.tap, id: 1 });
  assert.equal(one.progress, 0.25);
  for (let k = 0; k < 3; k++) {
    const h = one.hint();
    if (k === 0) assert.deepEqual(h.from, h0.tap, 'the first trace starts on the anchor');
    swipe(one, h, 2 + k);
    assert.equal(one.progress, 0.5 + k * 0.25, `light ${k + 1}`);
  }
  t = 5;
  assert.equal(one.done, true);
  assert.equal(one.hint(), null);
  // two fingers: one holds the anchor while another traces (from the anchor or anywhere)
  t = 0;
  const two = createLaw(19, L());
  const a = two.hint().tap;
  two.down({ ...a, id: 1 });
  for (let k = 0; k < 3; k++) swipe(two, k === 0 ? { from: { x: a.x + 60, y: a.y }, to: two.hint().to } : two.hint(), 10 + k);
  assert.equal(two.progress, 1);
  two.up({ ...a, id: 1 });
  t = 5;
  assert.equal(two.done, true);
  // Tap instead still sets the anchor, then each press lights the next light
  t = 0;
  const tap = createLaw(19, L());
  for (let i = 0; i < 4; i++) tap.assist();
  assert.equal(tap.progress, 1);
});

test('law 19 (Anchor and Explore) with several fingers: every finger but the anchor’s explores, so none stops another’s trace or tap-to-set', async (tt) => {
  const { createLaw } = await import('../src/v3/laws.js');
  const { rgba } = await import('../src/v3/fx.js');
  let t = 0;
  const L = () => ({ stage: { x: 12, y: 245, w: 296, h: 201, cx: 160, cy: 345.5, s: 0.72 }, now: () => t, sound() {}, haptic() {}, react() {}, setPrompt() {},
    words: { token: 'my words' }, pal: { glow: '#ffffff' }, photos: { n: 0 }, particles: { emit() {} } });
  // where that stage puts the three lights
  const WAY = [{ x: 154.08, y: 309.32 }, { x: 225.12, y: 349.52 }, { x: 254.72, y: 301.28 }];
  const fresh = () => { t = 0; const law = createLaw(19, L()); return [law, law.hint().tap]; };
  const steps = (from, to, k) => ({ x: from.x + ((to.x - from.x) * k) / 12, y: from.y + ((to.y - from.y) * k) / 12 });
  const swipe = (law, h, id) => { law.down({ ...h.from, id }); for (let i = 1; i <= 12; i++) law.move({ ...steps(h.from, h.to, i), id }); law.up({ ...h.to, id }); };
  const setByTap = (law, a, id = 1) => { law.down({ ...a, id }); law.up({ ...a, id }); assert.equal(law.progress, 0.25, 'a tap sets the anchor'); };
  /** One finger after that, doing only what the hints show (as the ghost does): does it finish? */
  const followHints = (law, id0 = 100) => {
    for (let n = 0; n < 10; n++) {
      const h = law.hint();
      if (!h) break;
      if (h.tap) { law.down({ ...h.tap, id: id0 + n }); law.up({ ...h.tap, id: id0 + n }); } else swipe(law, h, id0 + n);
    }
    t = 5;
    return law.done;
  };
  await tt.test('(1) a finger resting on the set or held anchor never stops a trace begun on the anchor from counting', () => {
    // (“hold the anchor with one finger while another traces”: the resting finger was taken for the one tracing, so
    // every later trace begun on the anchor counted for nothing, 0.25 for good while it rested)
    for (const how of ['set by a tap', 'held by a finger']) {
      const [law, a] = fresh();
      if (how === 'set by a tap') setByTap(law, a); else law.down({ ...a, id: 1 });
      law.down({ ...a, id: 2 }); law.move({ x: a.x + 1, y: a.y, id: 2 });   // finger 2 comes to rest on the anchor (a pixel's jitter)
      swipe(law, law.hint(), 3);                                            // finger 3 starts on the anchor, as the hint shows
      assert.equal(law.progress, 0.5, `${how}: finger 3 reached the first light`);
      law.move({ x: a.x, y: a.y + 1, id: 2 });
      swipe(law, law.hint(), 4);
      assert.equal(law.progress, 0.75, `${how}: and on from it`);
      swipe(law, law.hint(), 5);
      t = 5;
      assert.equal(law.done, true, `${how}: finished with finger 2 still resting`);
    }
  });
  await tt.test('(2) the anchor not set: two fingers land on it together, the second shifts a pixel, both lift: a tap, it is set', () => {
    // (the second took up a trace that was never cleared, so no tap could set the anchor again: stuck at 0)
    for (const lastUp of [1, 2]) {
      const [law, a] = fresh();
      law.down({ ...a, id: 1 }); law.down({ ...a, id: 2 }); law.move({ x: a.x + 2, y: a.y + 1, id: 2 });
      law.up({ ...a, id: 3 - lastUp }); law.up({ ...a, id: lastUp });
      assert.equal(law.progress, 0.25, `a two-finger tap sets the anchor (finger ${lastUp} up last)`);
      assert.ok(law.hint().from, 'the hint moves on to the first trace');
      assert.equal(followHints(law), true, 'and one finger following the hints finishes it');
    }
  });
  await tt.test('(3) the anchor set: finger B is tracing when finger A comes to rest on the anchor; B’s trace still counts', () => {
    // (A used to take the trace over)
    const [law, a] = fresh();
    setByTap(law, a);
    const from = { x: a.x + 50, y: a.y };
    law.down({ ...from, id: 2 });
    for (let i = 1; i <= 12; i++) { if (i === 3) law.down({ ...a, id: 3 }); if (i > 3) law.move({ x: a.x + (i % 2), y: a.y, id: 3 }); law.move({ ...steps(from, WAY[0], i), id: 2 }); }
    assert.equal(law.progress, 0.5, 'B reached the first light');
    law.up({ ...WAY[0], id: 2 });
    swipe(law, law.hint(), 4);
    assert.equal(law.progress, 0.75, 'A still resting, another finger traces on from the first light');
    law.up({ ...a, id: 3 });
    assert.equal(followHints(law), true);
  });
  await tt.test('(4) the anchor held by finger 1: finger 2 lands on the anchor and traces out from it, then on from each light', () => {
    const [law, a] = fresh();
    law.down({ ...a, id: 1 });
    assert.equal(law.progress, 0.25, 'held');
    swipe(law, { from: a, to: law.hint().to }, 2);
    assert.equal(law.progress, 0.5, 'a trace begun on the held anchor counts');
    for (let k = 0; k < 2; k++) swipe(law, law.hint(), 3 + k);
    assert.equal(law.progress, 1);
    law.up({ ...a, id: 1 });
    t = 5;
    assert.equal(law.done, true);
  });
  await tt.test('(5) one finger doing only what the ghost hints show finishes it', () => {
    const [law] = fresh();
    assert.equal(followHints(law, 1), true);
    assert.equal(law.hint(), null);
  });
  await tt.test('(6) a mouse (one pointer, id 1, for every press): click the anchor, then drag out from it to each light', () => {
    const [law, a] = fresh();
    setByTap(law, a, 1);
    for (let k = 0; k < 3; k++) swipe(law, law.hint(), 1);
    t = 5;
    assert.equal(law.done, true);
  });
  await tt.test('(7) Tap instead sets the anchor, then each press lights the next light', () => {
    const [law] = fresh();
    for (let i = 0; i < 4; i++) law.assist();
    assert.equal(law.progress, 1);
    t = 5;
    assert.equal(law.done, true);
  });
  await tt.test('(8) a light is reached only by a move over it, in order: never by a finger set down on it', () => {
    const [law, a] = fresh();
    setByTap(law, a);
    WAY.forEach((q, k) => { law.down({ ...q, id: 10 + k }); law.up({ ...q, id: 10 + k }); });
    assert.equal(law.progress, 0.25, 'the anchor set: set down and lifted on each light, none reached');
    law.down({ ...WAY[1], id: 20 }); law.move({ x: WAY[1].x + 1, y: WAY[1].y, id: 20 }); law.up({ ...WAY[1], id: 20 });
    assert.equal(law.progress, 0.25, 'a move on the second light does not reach it before the first');
    const [hold, b] = fresh();
    hold.down({ ...b, id: 1 });
    WAY.forEach((q, k) => { hold.down({ ...q, id: 10 + k }); hold.up({ ...q, id: 10 + k }); });
    assert.equal(hold.progress, 0.25, 'the anchor held: set down and lifted on each light, none reached');
    // and a drag begun on the anchor before it was ever set only sets it
    const [drag, c] = fresh();
    swipe(drag, { from: c, to: WAY[0] }, 1);
    assert.equal(drag.progress, 0.25);
    assert.ok(drag.hint().from, 'set: the first trace is next');
  });
  await tt.test('(9) every finger down explores: another finger set down elsewhere never stops a trace from counting', () => {
    // (only the finger down last traced: a thumb resting at the side of the stage took the trace over)
    for (const how of ['set by a tap', 'held by a finger']) {
      const [law, a] = fresh();
      if (how === 'set by a tap') setByTap(law, a); else law.down({ ...a, id: 1 });
      law.down({ ...a, id: 2 });
      for (let i = 1; i <= 12; i++) { if (i === 4) law.down({ x: 30, y: 430, id: 3 }); law.move({ ...steps(a, WAY[0], i), id: 2 }); }
      assert.equal(law.progress, 0.5, `${how}: finger 2 reached the first light, finger 3 resting at the side`);
      law.move({ x: 31, y: 430, id: 3 });
      law.up({ ...WAY[0], id: 2 });
      swipe(law, law.hint(), 4); swipe(law, law.hint(), 5);
      t = 5;
      assert.equal(law.done, true, `${how}: finished with finger 3 still down`);
    }
  });
  await tt.test('(10) each finger draws its own line: no line joins one finger’s trace to another’s', () => {
    // (one trail for every finger: a new trace was drawn joined on to where the last one ended)
    const noop = new Proxy(function () {}, { get: () => noop, apply: () => noop, set: () => true });
    const segs = []; let path = [], at = [0, 0];
    const g = new Proxy({
      createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: (s) => ({ width: String(s).length * 8 }),
      beginPath() { path = []; }, moveTo(x, y) { at = [x, y]; }, lineTo(x, y) { path.push(Math.hypot(x - at[0], y - at[1])); at = [x, y]; },
      stroke() { if (this.strokeStyle === rgba('#bfefff', 0.45)) segs.push(...path); },
    }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
    const had = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');
    globalThis.OffscreenCanvas = class { getContext() { return noop; } };
    try {
      const [law, a] = fresh();
      setByTap(law, a);
      swipe(law, law.hint(), 2);                                           // to the first light, and lifted there
      const from = { x: WAY[0].x, y: WAY[0].y + 50 };
      swipe(law, { from, to: WAY[1] }, 3);                                 // a new trace, begun 50 px from where that one ended
      law.down({ ...a, id: 4 });                                           // a finger resting on the anchor while another traces
      law.down({ ...WAY[1], id: 5 });
      for (let i = 1; i <= 12; i++) { law.move({ x: a.x + (i % 2), y: a.y, id: 4 }); law.move({ ...steps(WAY[1], WAY[2], i), id: 5 }); }
      assert.equal(law.progress, 1);
      law.frame(g, 0, 1 / 60);
      assert.ok(segs.length >= 30, `the traces are drawn (${segs.length} lines)`);
      const long = segs.filter((d) => d > 12);
      assert.deepEqual(long.map((d) => Math.round(d)), [], 'every line drawn is one finger’s step (a step here is 8 px at most)');
    } finally { if (had) Object.defineProperty(globalThis, 'OffscreenCanvas', had); else delete globalThis.OffscreenCanvas; }
  });
  await tt.test('held while another finger traced, then lifted first: the anchor is let go (as before), and a tap sets it again', () => {
    const [law, a] = fresh();
    law.down({ ...a, id: 1 });
    const from = { x: a.x + 60, y: a.y };
    law.down({ ...from, id: 2 }); for (let i = 1; i <= 12; i++) law.move({ ...steps(from, WAY[0], i), id: 2 });
    assert.equal(law.progress, 0.5, 'held, and the first light reached');
    law.up({ ...a, id: 1 }); law.up({ ...WAY[0], id: 2 });
    assert.equal(law.progress, 0.25, 'the anchor let go');
    assert.ok(law.hint().tap, 'tap the anchor');
    assert.equal(followHints(law), true, 'a tap sets it again, and the hints finish it');
  });
});

// (review of m6) "Meet Another Angle" brings Zuzu in before the rest of Plans' enter() runs. Left in that moment,
// leave() ran first (its removeEventListener found nothing yet) and enter() went on to add the resize and pageshow
// listeners for good: every later resize re-fitted the gone page's buttons and kept the page alive.
test('m6: Plans left while Zuzu is still coming in leaves no window listener behind, and the Mallow is left alone', async () => {
  const win = fakeWindow({ W: 320, H: 568 });
  try {
    const { default: plans } = await import('../src/app/scenes/plans.js');
    const page = () => {
      const calls = [];
      let arrive = null;
      const world = { mallowId: 'boppo', dim() {}, showMallow() {}, react() {},
        place: (p) => calls.push(['place', p]), setStage: (s) => calls.push(['setStage', s]), fitBetween: () => calls.push(['fitBetween']),
        setMallow: (id) => { calls.push(['setMallow', id]); world.mallowId = id; return id === 'zuzu' ? new Promise((r) => { arrive = r; }) : Promise.resolve(); } };
      const ent = { tier: () => 'none', has: () => false, canPurchase: true, isNative: false, isWeb: true, testEnded: false, webSignedIn: () => false, prices: () => null };
      const app = { ent, world, state: {}, haptic() {}, audio: { ui() {} }, go() {}, back() {} };
      return { view: plans(app, { focus: 'ultra' }), calls, arrive: () => arrive() };
    };
    const types = () => win.listeners.map(([t]) => t).sort();
    const settle = () => new Promise((r) => setTimeout(r, 20));
    // an ordinary visit: once Zuzu is in, the page sets up as before (the stage, both listeners) and leaving
    // takes the listeners away and brings the first Mallow back
    const a = page();
    const entering = a.view.enter();
    await settle();
    assert.deepEqual(types(), [], 'nothing until Zuzu is in');
    a.arrive();
    await entering;
    await settle();
    assert.deepEqual(types(), ['pageshow', 'resize']);
    assert.ok(a.calls.some(([k, v]) => k === 'setStage' && v === 'curious'));
    a.view.leave();
    assert.deepEqual(types(), []);
    assert.deepEqual(a.calls.filter(([k]) => k === 'setMallow').map(([, id]) => id), ['zuzu', 'boppo']);
    // left while Zuzu is still coming in: leave() runs first and enter() stops there
    const b = page();
    const early = b.view.enter();
    await settle();
    b.view.leave();
    const before = b.calls.length;
    b.arrive();
    await early;
    await settle();
    assert.deepEqual(types(), [], 'no resize or pageshow listener outlives the page');
    assert.deepEqual(b.calls.slice(before), [], 'nor does it set the stage or move the next scene’s Mallow');
    assert.deepEqual(b.calls.filter(([k]) => k === 'setMallow').map(([, id]) => id), ['zuzu', 'boppo'], 'the first Mallow still comes back');
  } finally { win.restore(); }
});
