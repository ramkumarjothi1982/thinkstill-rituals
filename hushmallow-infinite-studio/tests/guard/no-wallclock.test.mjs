// Guard: no wall-clock time or unseeded randomness in engine/ or composer/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO, REPO, mkWorkTemp, isFrozen } from '../../render/lib/paths.mjs';
import { scanSource, scanDirs, DETERMINISTIC_DIRS, WALLCLOCK_ALLOWED } from '../../render/lib/determinism-scan.mjs';

test('engine/ and composer/ contain no wall-clock or unseeded-randomness reads; every allowlist entry is live', (t) => {
  const r = scanDirs(STUDIO);
  t.diagnostic(`scanned ${r.scanned.length} files in ${DETERMINISTIC_DIRS.join(', ')}${r.missing.length ? ` (not created yet: ${r.missing.join(', ')})` : ''}; `
    + `followed ${r.followed.length} studio files, ${r.locked.length} locked, ${r.packages.length} in node_modules, ${r.symlinks.length} symlinks`);
  for (const a of r.allowed) t.diagnostic(`allowlisted ${a.file}:${a.line} ${a.api}: ${a.reason}`);
  for (const w of r.watched) t.diagnostic(`watched real-clock handle ${w.kind} ${w.name} (from ${w.origin})`);
  assert.deepEqual(r.findings.map((f) => `${f.file}:${f.line} ${f.api}: ${f.text}`), []);
  assert.deepEqual(r.stale.map((s) => `${s.file}: ${s.line}`), [], 'stale allowlist entries: delete them from WALLCLOCK_ALLOWED');
  assert.deepEqual(r.pending.map((s) => `${s.file}: ${s.line}`), [], 'allowlist entries for files that are not scanned: register an exception in the same change as the line it excuses');
  assert.deepEqual(r.ambiguous.map((s) => `${s.file}: ${s.line} (lines ${s.lines})`), [], 'an allowlisted line must occur exactly once in its file');
});

// The scanner itself must catch what it claims to catch, or the guard above is vacuous.
const cases = [
  // the three APIs, plain and through any receiver
  ['const x = Math.random();', ['Math.random']],
  ['const t0 = Date.now(), t1 = performance.now();', ['Date.now', 'performance.now']],
  ['const f = Math . random;', ['Math.random']],
  ['if (Math.random == null) {}', ['Math.random']],
  ['const r = Math?.random?.();', ['Math.random']],
  ['const t = globalThis.performance.now();', ['performance.now']],
  ['const t = window.Date.now();', ['Date.now']],
  // round-3 review: every spelling the reviewer found, each must be a finding
  ['globalThis?.Math.random();', ['Math.random']],
  ['window?.performance.now();', ['performance.now']],
  ['globalThis?.performance?.now?.();', ['performance.now']],
  ['window.window.Date.now();', ['Date.now']],
  ['self.self.performance.now();', ['performance.now']],
  ['window.self.Math.random();', ['Math.random']],
  ['globalThis.globalThis.Math.random();', ['Math.random']],
  ['frames.Math.random();', ['Math.random']],
  ['top.Date.now();', ['Date.now']],
  ['parent.performance.now();', ['performance.now']],
  ['document.defaultView.performance.now();', ['performance.now']],
  ['const x = {} / Math.random() / 1;', ['Math.random']],
  ['M\\u0061th.random();', ['Math.random']],
  ['D\\u0061te.now();', ['Date.now']],
  ['\\u004Dath.random(); performance.n\\u006Fw();', ['Math.random', 'performance.now']],
  ['Math.r\\u{61}ndom();', ['Math.random']],
  ['Function.prototype.constructor("return Math.ran"+"dom()")();', ['Function (dynamic code)', '.constructor (reaches Function: dynamic code)']],
  // bracket, constant keys, destructuring, aliasing, reflection
  ['const r = Math["random"]();', ['Math.random']],
  ["const r = Math['ran' + 'dom']();", ['Math.random']],
  ['const r = Math[`ran${"dom"}`]();', ['Math.random']],
  ["const k = 'ran' + 'dom'; const r = Math[k]();", ['Math.random']],
  ["x['Ma' + 'th'].random();", ['Math.random']],
  ["const r = globalThis['Math']['random']();", ['Math.random']],
  ['const { now } = performance; export const t = now();', ['performance.now']],
  ['const { random: rnd, PI } = Math;', ['Math.random']],
  ['const { now: n } = Date;', ['Date.now']],
  ['const { ...all } = Math;', ['Math (rest destructuring)']],
  ['const { Math: M } = window; M.random();', ['Math (destructured)']],
  ['const { performance: p } = globalThis;', ['performance (destructured)']],
  ['const M = Math; M.random();', ['Math (as a value)']],
  ['const r = Reflect.get(Math, "random")();', ['Math (as a value)']],
  ['const r = Math[pick()]();', ['Math[…] (computed member)']],
  ['const p = performance; p.now();', ['performance (as a value)']],
  ['const t = performance.timeOrigin;', ['performance.timeOrigin']],
  ['class V extends Date {}', ['Date (as a value)']],
  // the global object reached by a computed key or reflection
  ['const g = globalThis; g[name()]();', ['global object[…] (computed member)']],
  ["const g = window; g['M' + 'ath'].random();", ['Math.random']],
  ['window[k];', ['global object[…] (computed member)']],
  ['Reflect.get(globalThis, k);', ['global object passed to Reflect.get']],
  ['Object.getOwnPropertyDescriptor(window, k);', ['global object passed to Object.getOwnPropertyDescriptor']],
  // other wall-clock and randomness sources
  ['const d = new Date();', ['new Date() (current time)']],
  ['const d = new Date;', ['new Date() (current time)']],
  ['const d = new Date(...args);', ['new Date() (current time)']],
  ['const s = Date();', ['Date() (current time)']],
  ['const b = crypto.getRandomValues(new Uint32Array(1));', ['crypto.getRandomValues']],
  ['const id = window.crypto.randomUUID();', ['crypto.randomUUID']],
  ['const n = Temporal.Now.instant();', ['Temporal.Now']],
  ['const t = process.hrtime.bigint();', ['process.hrtime']],
  ["import { randomBytes } from 'node:crypto';", ['node:crypto randomBytes']],
  ["import * as c from 'crypto';", ['node:crypto (namespace/default import: import the functions you need by name)']],
  ["import { performance as p } from 'node:perf_hooks';", ['node:perf_hooks (reads the clock)']],
  ["const { hrtime } = require('node:process');", ['node:process (require: import the functions you need by name)']],
  // every syntactic route from a string to running code
  ['const v = eval("1");', ['eval (dynamic code)']],
  ["window['ev' + 'al']('1');", ['eval (dynamic code)']],
  ['const f = new Function("return 1");', ['Function (dynamic code)']],
  ['const F = (() => {}).constructor;', ['.constructor (reaches Function: dynamic code)']],
  ["const F = Reflect.get(f, 'constructor');", ['"constructor" passed to a call (reaches Function: dynamic code)']],
  ['const { constructor: F } = f;', ['.constructor (destructured: reaches Function)']],
  ['setTimeout("tick()", 10);', ['setTimeout with a code string (dynamic code)']],
  ["const code = 'tick()'; window.setInterval(code, 10);", ['setInterval with a code string (dynamic code)']],
  ['const m = await import(`./moves/${id}.js`);', ['import() with a computed specifier (dynamic code)']],
  ['const w = new Worker(url);', ['new Worker() with a computed specifier (dynamic code)']],
  ['const m = require(name);', ['require() with a computed specifier (dynamic code)']],
  ['document.write(html);', ['document.write (dynamic code)']],
  ['el.innerHTML = html;', ['innerHTML assignment (HTML can run code)']],
  ["el.insertAdjacentHTML('beforeend', html);", ['insertAdjacentHTML (HTML can run code)']],
  ["const s = document.createElement('script');", ['creates a <script> element (dynamic code)']],
  ["el.setAttribute('onload', code);", ['setAttribute("onload") (inline handler: dynamic code)']],
  ["a.href = 'javascript:void 0';", ['javascript: URL (dynamic code)']],
  ["import vm from 'node:vm';", ['node:vm (runs code from strings)']],
  ['const st = setTimeout; st(code, 1);', ['setTimeout (as a value: could run a code string)']],
  ["setTimeout.call(window, 'tick()', 1);", ['setTimeout (as a value: could run a code string)']],
  ['const W = window.Worker; new W(url);', ['Worker (as a value: could run a code string)']],
  ['const el = document.createElement(tag);', ['createElement with a computed tag (could create a <script>: dynamic code)']],
  // the global object reached through a parameter default, other clocks
  ['function f(g = globalThis) { return g[k]; }', ['global object[…] (computed member)']],
  ['const now = new Intl.DateTimeFormat("en").format();', ['format() with no date (Intl formats the current time)']],
  ['const t = event.timeStamp, u = document.timeline.currentTime;', ['event.timeStamp (wall-clock time)', 'document.timeline (wall-clock time)']],
  // strings that spell a banned call (could be eval'd or injected)
  ["log('uses Math.random');", ['Math.random (in a string)']],
  ['const s = `${Date.now()}`;', ['Date.now']],
  ['const s = `t=${ `${performance.now()}` }`;', ['performance.now']],
  // parsing: comments, strings and regex literals cannot hide code, and nothing unparseable passes
  ['const s = "// not a comment"; Date.now();', ['Date.now']],
  ['const r = /a\\/\\//; const x = Math.random();', ['Math.random']],
  ["const q = /'/g; const y = Date.now();", ['Date.now']],
  ['const z = {a: 1} / 2; Math.random();', ['Math.random']],
  ['{} / Math.random() / 1', ['unparseable (Unexpected token): the guard cannot check it']],
  // deterministic uses: not findings
  ['// Math.random and Date.now are banned here', []],
  ['/* performance.now()\n   Date.now() */ const a = 1;', []],
  ['const { sin, cos, PI } = Math; const m = Math.max(1, 2);', []],
  ['const e = Date.UTC(2026, 9, 13), p = Date.parse("2026-10-13"), d = new Date(e);', []],
  ['if (x instanceof Date || typeof performance === "undefined" || f instanceof Function) {}', []],
  ['const h = await crypto.subtle.digest("SHA-256", buf);', []],
  ["import { createHash } from 'node:crypto';", []],
  ['const re = /Math.random/; const half = 4 / 2;', []],
  ['const o = { random: 1, now: 2 }; o.random + o.now; rng.random(); clock.now();', []],
  ["for (const key in src) { if (key === 'constructor') continue; out[key] = src[key]; }", []],
  ['const frames = []; frames[i] = 1; const self = this; self[k] = 2;', []],
  ['const w = new Worker(new URL("./w.js", import.meta.url), { type: "module" });', []],
  ['const mod = await import("./moves/g-jolt.js"); setTimeout(() => tick(), 0);', []],
  ['window.requestAnimationFrame = (cb) => 0; const mm = window.matchMedia?.bind(window);', []],
  ['const label = new Intl.DateTimeFormat("en", { hour: "numeric" }).format(virtualDate); window.setTimeout = fakeTimeout;', []],
  ["if (typeof setTimeout === 'function') {} const c = document.createElement('canvas');", []],
  // installing the virtual clock (assignment) is allowed
  ['Math.random = mulberry32(seed);', []],
  ['performance.now = () => state.nowMs;', []],
  ['Date.now = () => epoch + nowMs; window.Date = VirtualDate;', []],
  // inline opt-out comments are not honoured
  ['export const jitter = () => Math.random(); // hm-allow-wallclock: any text', ['Math.random']],
  ['x = Date.now(); // hm-allow-wallclock: progress log only', ['Date.now']],
];

for (const [src, want] of cases) {
  test(`scanner: ${JSON.stringify(src).slice(0, 72)}`, () => {
    assert.deepEqual(scanSource(src).map((f) => f.api).sort(), [...want].sort());
  });
}

test('scanner: line numbers come from the source, and HTML is scanned (scripts, handlers, javascript: URLs)', () => {
  const src = '/* a\n b */\nconst s = "x";\nconst x = Math.random();';
  assert.deepEqual(scanSource(src).map((f) => [f.line, f.text]), [[4, 'const x = Math.random();']]);
  const html = [
    '<!doctype html>',
    '<script type="module">',
    '  const t = performance.now();',
    '</script>',
    '<script type="application/json">{"Math.random": 1}</script>',
    '<body onload="go(Date.now())">',
    '<a href="javascript:run()">x</a>',
  ].join('\n');
  assert.deepEqual(scanSource(html, { html: true }).map((f) => `${f.line} ${f.api}`),
    ['3 performance.now', '6 Date.now', '7 javascript: URL (dynamic code)']);
});

/** A throw-away studio-like tree: { root, write(rel, text), scan(allow) } */
function tree() {
  const root = mkWorkTemp('wallclock-');
  const studio = path.join(root, 'studio');
  const write = (rel, text) => { const p = path.join(studio, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
  const link = (rel, target) => { const p = path.join(studio, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.symlinkSync(target, p); };
  return { root, studio, write, link, scan: (allow = [], dirs = ['engine', 'composer']) => scanDirs(studio, dirs, allow), done: () => fs.rmSync(root, { recursive: true, force: true }) };
}
const keys = (r) => r.findings.map((f) => `${f.file}:${f.line} ${f.api}`).sort();

test('allowlist: an entry excuses one exact line in one file for the listed finding only, and goes stale when the line changes', () => {
  const t = tree();
  try {
    const allow = [{ file: 'engine/runtime/clock.js', line: 'const realPerfNow = performance.now.bind(performance);', apis: ['performance.now', 'performance (as a value)'], reason: 'test entry' }];
    t.write('engine/runtime/clock.js', 'const realPerfNow = performance.now.bind(performance);\nperformance.now = () => 0;\n');
    let r = t.scan(allow);
    assert.deepEqual([r.findings, r.stale, r.pending, r.allowed.length], [[], [], [], 2]);
    // the same text in another file, or another call in the same file, is not excused
    t.write('composer/b.js', 'const realPerfNow = performance.now.bind(performance);\n');
    t.write('engine/runtime/clock.js', 'const realPerfNow = performance.now.bind(performance);\nconst t = Date.now();\n');
    r = t.scan(allow);
    assert.deepEqual(keys(r), ['composer/b.js:1 performance (as a value)', 'composer/b.js:1 performance.now', 'engine/runtime/clock.js:2 Date.now']);
    // the pinned line edited: its findings reappear and the entry is stale
    t.write('engine/runtime/clock.js', 'const realPerfNow = performance.now.bind(performance); // tweaked\n');
    r = t.scan(allow);
    assert.equal(r.findings.filter((f) => f.file === 'engine/runtime/clock.js').length, 2);
    assert.equal(r.stale.length, 1);
  } finally { t.done(); }
});

test('allowlist: entries for files that do not exist are pending (the guard fails), and a duplicated line is ambiguous', () => {
  const t = tree();
  try {
    const allow = [{ file: 'engine/runtime/clock.js', line: 'const RealDate = Date;', apis: ['Date (as a value)'], reason: 'test entry' }];
    t.write('engine/a.js', 'export const a = 1;\n');
    let r = t.scan(allow);
    assert.deepEqual(r.pending.map((p) => p.file), ['engine/runtime/clock.js']);
    // the same line twice: neither copy is excused, and the entry is reported as ambiguous
    t.write('engine/runtime/clock.js', 'const RealDate = Date;\nfunction f() {\n  const RealDate = Date;\n  return RealDate;\n}\n');
    r = t.scan(allow);
    assert.deepEqual(r.ambiguous.map((a) => a.lines), [[1, 3]]);
    assert.deepEqual(keys(r), ['engine/runtime/clock.js:1 Date (as a value)', 'engine/runtime/clock.js:3 Date (as a value)']);
    assert.deepEqual([r.pending, r.stale], [[], []]);
  } finally { t.done(); }
});

test('allowlist: excusing a capture never excuses its handle: every use and every export of it is a finding (round-3 review scenario)', () => {
  const t = tree();
  try {
    const allow = [
      { file: 'engine/runtime/clock.js', line: 'const realPerfNow = performance.now.bind(performance);', apis: ['performance.now', 'performance (as a value)'], reason: 'test entry' },
      { file: 'engine/runtime/clock.js', line: 'const RealDate = Date;', apis: ['Date (as a value)'], reason: 'test entry' },
    ];
    // the reviewer's tree: the two pinned lines, a wall-clock helper, and an export object
    t.write('engine/runtime/clock.js', [
      'const realPerfNow = performance.now.bind(performance);',
      'const RealDate = Date;',
      'export const wall = () => RealDate.now() + realPerfNow();',
      'export const clock = { realNow: realPerfNow, RealDate };',
    ].join('\n'));
    t.write('engine/stage/use.js', "import { clock } from '../runtime/clock.js';\nexport const x = clock.realNow() % 7, d = new clock.RealDate();\n");
    const r = t.scan(allow);
    assert.equal(r.allowed.length, 3);
    assert.deepEqual(keys(r), [
      'engine/runtime/clock.js:3 real-clock handle RealDate (from allowlisted line 2)',
      'engine/runtime/clock.js:3 real-clock handle realPerfNow (from allowlisted line 1)',
      'engine/runtime/clock.js:4 real-clock handle RealDate (from allowlisted line 2)',
      'engine/runtime/clock.js:4 real-clock handle realPerfNow (from allowlisted line 1)',
    ]);
    // exporting the capture directly is a finding too
    t.write('engine/runtime/clock.js', 'export const RealDate = Date;\n');
    const r2 = t.scan([{ file: 'engine/runtime/clock.js', line: 'export const RealDate = Date;', apis: ['Date (as a value)'], reason: 'test entry' }]);
    assert.deepEqual(keys(r2), ['engine/runtime/clock.js:1 exports the real-clock handle RealDate (declared on an allowlisted line)']);
  } finally { t.done(); }
});

test('imports: studio code imported from elsewhere is scanned too, locked code is followed and judged, unfollowable imports are findings', () => {
  const t = tree();
  try {
    t.write('lib/now.js', 'export const now = () => Date.now();\n');                    // a helper outside engine/
    t.write('lib/ok.js', 'export const two = 2;\n');
    t.write('stage2/frozen.js', 'export const r = () => Math.random();\n');              // FROZEN path: hash-locked, still judged
    t.write('../hushmallow/src/registry.js', 'export const REGISTRY = {};\n');           // the live app: hash-locked, clean
    t.write('data/cfg.json', '{"Math.random": true}\n');
    t.write('engine/a.js', [
      "import { now } from '../lib/now.js';",
      "import { two } from '../lib/ok.js?v=1';",
      "import { r } from '../stage2/frozen.js';",
      "import cfg from '../data/cfg.json' with { type: 'json' };",
      "import { REGISTRY } from '../../hushmallow/src/registry.js';",
      "import lodash from 'lodash';",
      "import x from 'https://cdn.example/x.js';",
      "import y from '/abs/y.js';",
      "import z from '../../elsewhere/z.js';",
      "import w from '../lib/plain';",
    ].join('\n'));
    t.write('../elsewhere/z.js', 'export default 1;\n');
    t.write('lib/plain', 'export default Date.now();\n');
    const r = t.scan();
    assert.deepEqual(r.followed, [{ file: 'lib/now.js', from: 'engine/a.js' }, { file: 'lib/ok.js', from: 'engine/a.js' }]);
    assert.deepEqual(r.locked.map((l) => l.file).sort(), ['../hushmallow/src/registry.js', 'stage2/frozen.js']);
    assert.deepEqual(keys(r), [
      'engine/a.js:10 imports a file the guard cannot read as JS: the guard cannot follow it',
      'engine/a.js:6 imports a package (lodash) that is not installed here: the guard cannot follow it',
      'engine/a.js:7 imports code from a URL (https:): the guard cannot follow it',
      'engine/a.js:8 imports an absolute import path: the guard cannot follow it',
      'engine/a.js:9 imports code from outside the studio: the guard cannot follow it',
      'lib/now.js:1 Date.now',
      'stage2/frozen.js:1 Math.random',
    ]);
  } finally { t.done(); }
});

// ---- FU-1 regression tests: one per bypass the Wave A review and the M0 audit reported (docs/wp/FU-1.md)

test('bypass: code in node_modules that engine code imports is scanned (relative imports into node_modules and package imports)', () => {
  const t = tree();
  try {
    // round 3 skipped every node_modules directory, so this file was never parsed although engine/a.js runs it
    t.write('engine/node_modules/x/index.js', 'export const t = () => Date.now();\n');
    t.write('engine/node_modules/unused/index.js', 'export const u = Math.random();\n');  // never imported: never runs, not scanned
    // a package: every entry it can expose is judged (exports conditions, main, CommonJS requires with probing)
    t.write('node_modules/pkg/package.json', JSON.stringify({ name: 'pkg', main: './main.cjs', exports: { '.': { browser: './b.js', default: './main.cjs' }, './sub': './sub.js' } }));
    t.write('node_modules/pkg/b.js', 'export const b = performance.now();\n');
    t.write('node_modules/pkg/main.cjs', "module.exports = require('./lib');\n");
    t.write('node_modules/pkg/lib.js', 'module.exports = Math.random();\n');
    t.write('node_modules/pkg/sub.js', "module.exports = require('@scope/dep');\n");
    t.write('node_modules/@scope/dep/package.json', JSON.stringify({ name: '@scope/dep' }));
    t.write('node_modules/@scope/dep/index.js', 'module.exports = new Date();\n');
    t.write('engine/a.js', "import { t } from './node_modules/x/index.js';\nimport p from 'pkg';\nimport s from 'pkg/sub';\nimport n from 'not-installed';\n");
    const r = t.scan();
    assert.deepEqual(keys(r), [
      'engine/a.js:4 imports a package (not-installed) that is not installed here: the guard cannot follow it',
      'engine/node_modules/x/index.js:1 Date.now',
      'node_modules/@scope/dep/index.js:1 new Date() (current time)',
      'node_modules/pkg/b.js:1 performance.now',
      'node_modules/pkg/lib.js:1 Math.random',
    ]);
    assert.deepEqual(r.packages.map((p) => p.file).sort(), ['node_modules/@scope/dep/index.js', 'node_modules/pkg/b.js', 'node_modules/pkg/lib.js', 'node_modules/pkg/main.cjs', 'node_modules/pkg/sub.js']);
    assert.ok(!r.scanned.includes('engine/node_modules/unused/index.js'));
  } finally { t.done(); }
});

test('bypass: symlinked directories are followed, imports through them are judged, links out of the studio are findings', () => {
  const t = tree();
  try {
    // round 3 did not follow engine/<symlink>/ and skipped imports through it as "inside engine/"
    t.write('lib/shared/clock.js', 'export const now = () => performance.now();\n');
    t.link('engine/shared', '../lib/shared');
    t.write('engine/a.js', "import { now } from './shared/clock.js';\n");
    // a link out of the studio is a finding, whether walked or imported through
    t.write('../outside/x.js', 'export default Math.random();\n');
    t.link('engine/out', '../../outside');
    t.link('composer/x.js', '../../outside/x.js');
    t.link('lib/out', '../../outside');
    t.write('engine/b.js', "import x from '../lib/out/x.js';\n");
    // a symlinked file resolves its imports from both its own path (browsers) and its real path (Node)
    t.write('other/linked.js', "import { h } from './helper.js';\nexport default h;\n");
    t.write('other/helper.js', 'export const h = Date.now();\n');
    t.write('engine/helper.js', 'export const h = new Date();\n');
    t.link('engine/linked.js', '../other/linked.js');
    t.link('engine/loop', '.');                                                       // a cycle terminates
    const r = t.scan();
    assert.deepEqual(keys(r), [
      'composer/x.js:1 a symlink to a file outside the studio: the guard cannot follow it',
      'engine/b.js:1 imports code from outside the studio (through a symlink): the guard cannot follow it',
      'engine/helper.js:1 new Date() (current time)',
      'engine/out:1 a symlink to a directory outside the studio: the guard cannot follow it',
      'lib/shared/clock.js:1 performance.now',
      'other/helper.js:1 Date.now',
    ]);
    assert.ok(r.symlinks.some((s) => s.link === 'engine/shared' && s.target === 'lib/shared'));
  } finally { t.done(); }
});

/** The v1 clock, copied (read-only) from the frozen file into a test tree's stage/components/. */
const V1_CLOCK = fs.readFileSync(path.join(STUDIO, 'stage/components/clock.js'), 'utf8');
const V1_CLOCK_ENTRIES = WALLCLOCK_ALLOWED.filter((e) => e.file === 'stage/components/clock.js');

test('bypass: imports of locked code are followed: a live-app module that reads the clock is a finding (rig.js)', () => {
  const t = tree();
  try {
    // round 3 listed these imports and never read the files, so engine code reached the clock through them with zero findings
    t.write('../hushmallow/src/mallows/rig.js', 'export const blink = () => Math.random() < 0.1;\nexport const t0 = performance.now();\nperformance.now();\n');
    t.write('engine/a.js', "import { blink } from '../../hushmallow/src/mallows/rig.js';\nexport const b = blink();\n");
    let r = t.scan();
    assert.deepEqual(keys(r), ['../hushmallow/src/mallows/rig.js:1 Math.random', '../hushmallow/src/mallows/rig.js:2 performance.now', '../hushmallow/src/mallows/rig.js:3 performance.now']);
    assert.deepEqual(r.locked, [{ file: '../hushmallow/src/mallows/rig.js', from: 'engine/a.js' }]);
    // a reviewed entry may pin a line of a locked file (it cannot change: the app is hash-locked) ...
    const entry = (line, apis) => ({ file: '../hushmallow/src/mallows/rig.js', line, apis, reason: 'test entry' });
    r = t.scan([entry('performance.now();', ['performance.now'])]);
    assert.deepEqual(keys(r), ['../hushmallow/src/mallows/rig.js:1 Math.random', '../hushmallow/src/mallows/rig.js:2 performance.now']);
    // ... but excusing a line never excuses the handle it exports
    r = t.scan([entry('export const blink = () => Math.random() < 0.1;', ['Math.random'])]);
    assert.deepEqual(keys(r), ['../hushmallow/src/mallows/rig.js:1 exports the real-clock handle blink (declared on an allowlisted line)',
      '../hushmallow/src/mallows/rig.js:2 performance.now', '../hushmallow/src/mallows/rig.js:3 performance.now']);
  } finally { t.done(); }
});

test('bypass: the v1 clock\'s real-clock handles (realNow, RealDate, window.__hushClock) are findings wherever they are read', () => {
  const t = tree();
  try {
    t.write('stage/components/clock.js', V1_CLOCK);
    t.write('engine/a.js', "import { clock } from '../stage/components/clock.js';\nexport const step = (dt) => clock.step(dt);\n");
    // without entries, importing the frozen clock is a finding (its real-timer captures)
    assert.deepEqual(keys(t.scan()), [
      'stage/components/clock.js:42 performance (as a value)', 'stage/components/clock.js:42 performance.now', 'stage/components/clock.js:44 Date (as a value)',
    ]);
    // with the studio's reviewed entries the import is clean, and every way to read the handles is a finding
    assert.equal(V1_CLOCK_ENTRIES.length, 4);
    assert.deepEqual(keys(t.scan(V1_CLOCK_ENTRIES)), []);
    t.write('engine/b.js', [
      "import { clock } from '../stage/components/clock.js';",
      'export const a = window.__hushClock.realNow();',
      'export const b = new clock.RealDate();',
      'const { realNow } = clock; export const c = realNow();',
      "export const d = globalThis['__hush' + 'Clock'];",
      "export const e = Reflect.get(clock, 'realNow');",
      'export const f = __hushClock;',
    ].join('\n'));
    const r = t.scan(V1_CLOCK_ENTRIES);
    assert.deepEqual(keys(r), [
      'engine/b.js:2 real-clock carrier __hushClock (published by stage/components/clock.js:89)',
      'engine/b.js:2 real-clock handle .realNow (exported by stage/components/clock.js:85)',
      'engine/b.js:3 real-clock handle .RealDate (exported by stage/components/clock.js:86)',
      'engine/b.js:4 real-clock handle .realNow (exported by stage/components/clock.js:85)',
      'engine/b.js:5 real-clock carrier __hushClock (published by stage/components/clock.js:89)',
      'engine/b.js:6 names the real-clock handle "realNow" in a string (exported by stage/components/clock.js:85)',
      'engine/b.js:7 real-clock carrier __hushClock (published by stage/components/clock.js:89)',
    ]);
    assert.deepEqual(r.watched.filter((w) => w.kind !== 'binding').map((w) => `${w.kind} ${w.name}`), ['property realNow', 'property RealDate', 'global __hushClock']);
    // installing a replacement (assignment) is not a read
    t.write('engine/b.js', 'window.__hushClock = { step() {} };\n');
    assert.deepEqual(keys(t.scan(V1_CLOCK_ENTRIES)), []);
  } finally { t.done(); }
});

test('allowlist: a handle that leaves an excused line where the guard cannot follow it is a finding no entry can excuse', () => {
  const t = tree();
  try {
    const entry = (line, apis) => ({ file: 'engine/c.js', line, apis, reason: 'test entry' });
    t.write('engine/c.js', 'export default performance.now.bind(performance);\n');
    let r = t.scan([entry('export default performance.now.bind(performance);', ['performance.now', 'performance (as a value)'])]);
    assert.deepEqual(keys(r), ['engine/c.js:1 a real-clock handle leaves this allowlisted line (returned, exported, thrown or passed on where the guard cannot follow it)']);
    // stored on the global object: the global name is watched in every file
    t.write('engine/c.js', 'window.rn = performance.now.bind(performance);\n');
    t.write('composer/d.js', 'export const x = rn() + window.rn();\n');
    r = t.scan([entry('window.rn = performance.now.bind(performance);', ['performance.now', 'performance (as a value)'])]);
    assert.deepEqual(keys(r), ['composer/d.js:1 real-clock carrier rn (published by engine/c.js:1)', 'composer/d.js:1 real-clock handle .rn (exported by engine/c.js:1)']);
  } finally { t.done(); }
});

test('bypass: import maps, frames and script sources of HTML pages are followed', () => {
  const t = tree();
  try {
    t.write('lib/evil.js', 'export const t = Date.now();\n');
    t.write('lib/dir/a.js', 'export const r = Math.random();\n');
    t.write('lib/frame.html', '<script type="module">const t = performance.now();</script>\n');
    t.write('engine/index.html', [
      '<script type="importmap">',
      '{ "imports": { "./util.js": "../lib/evil.js", "lib/": "../lib/dir/" } }',
      '</script>',
      '<iframe src="../lib/frame.html"></iframe>',
      '<script type="module" src="./util.js"></script>',
      '<script src="vendor/../../lib/page-relative.js"></script>',
    ].join('\n'));
    t.write('lib/page-relative.js', 'var p = Math.random();\n');                       // src="x/y.js" is a URL relative to the page, not a package
    t.write('engine/util.js', 'export const u = 1;\n');
    t.write('engine/bad.html', '<script type="importmap">{ nope }</script>\n<script type="importmap" src="map.json"></script>\n');
    const r = t.scan();
    assert.deepEqual(keys(r), [
      'engine/bad.html:1 unparseable import map (Expected property name or \'}\' in JSON at position 2 (line 1 column 3)): the guard cannot follow it',
      'engine/bad.html:2 an external import map (src=): the guard cannot follow it',
      'lib/dir/a.js:1 Math.random',
      'lib/evil.js:1 Date.now',
      'lib/frame.html:1 performance.now',
      'lib/page-relative.js:1 Math.random',
    ]);
  } finally { t.done(); }
});

test('files the guard cannot parse or read are findings', () => {
  const t = tree();
  try {
    t.write('engine/a.ts', 'export const t: number = Date.now();\n');
    t.write('composer/b.js', 'export const x = ;\n');
    assert.deepEqual(keys(t.scan()), ['composer/b.js:1 unparseable (Unexpected token): the guard cannot check it', 'engine/a.ts:1 file type the guard cannot scan (use .js/.mjs)']);
  } finally { t.done(); }
});

test('allowlist: every entry is in a deterministic dir or in hash-locked code, has a reason, and its file exists', () => {
  for (const a of WALLCLOCK_ALLOWED) {
    const abs = path.join(STUDIO, a.file);
    const lockedCode = isFrozen(abs) || !path.relative(path.join(REPO, 'hushmallow'), abs).startsWith('..');
    assert.ok(DETERMINISTIC_DIRS.some((dir) => a.file.startsWith(`${dir}/`)) || lockedCode, a.file);
    assert.ok(a.reason.length > 20 && a.apis.length);
    assert.ok(fs.existsSync(abs), `${a.file} does not exist`);
  }
});

test('the allowlist\'s premise: in the engine page, every stage2 module the frozen v2 module imports is redirected to engine/ by the import map', () => {
  // the entries for stage2/stage.js and the v1 clock rest on this: frozen stage2 never loads in the engine page
  const html = fs.readFileSync(path.join(STUDIO, 'engine/index.html'), 'utf8');
  const map = JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(html)[1]).imports;
  const v2 = fs.readFileSync(path.join(STUDIO, 'videos/my-brain-at-2am-v2.js'), 'utf8');
  const stage2 = [...v2.matchAll(/from '(\.\.\/stage2\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(stage2.includes('../stage2/stage.js'));
  for (const spec of stage2) {
    assert.ok(map[spec], `${spec} is not redirected by engine/index.html`);
    assert.ok(fs.existsSync(path.join(STUDIO, 'engine', map[spec])), `${map[spec]} does not exist in engine/`);
  }
});

test('the v1 clock (which WP-01 inlines as engine/runtime/clock.js): only its unused real-timer captures are findings, and dropping them makes it clean', () => {
  const src = fs.readFileSync(path.join(STUDIO, 'stage/components/clock.js'), 'utf8');
  assert.deepEqual(scanSource(src).map((f) => `${f.api}: ${f.text}`), [
    'performance.now: const realPerfNow = performance.now.bind(performance);',
    'performance (as a value): const realPerfNow = performance.now.bind(performance);',
    'Date (as a value): const RealDate = Date;',
  ]);
  // what WP-01 does when it inlines the clock: drop the two captures and the two export properties (nothing reads them)
  const drop = new Set(['const realPerfNow = performance.now.bind(performance);', 'const RealDate = Date;', 'realNow: realPerfNow,', 'RealDate,']);
  const inlined = src.split('\n').filter((l) => !drop.has(l.trim())).join('\n');
  assert.equal(src.split('\n').length - inlined.split('\n').length, 4);
  assert.deepEqual(scanSource(inlined), []);
});

test('the code WP-01 forked (stage2/) and the v2 direction under the full rules: the computed direction import and the v1 clock\'s captures', () => {
  const r = scanDirs(STUDIO, ['stage2'], []);
  assert.ok(r.scanned.length >= 10);
  // engine/ loads directions through constant import() thunks (followed by the guard); the frozen line and the v1 clock
  // (followed now: locked code is judged too) are what WALLCLOCK_ALLOWED pins
  assert.deepEqual(keys(r), [
    'stage/components/clock.js:42 performance (as a value)', 'stage/components/clock.js:42 performance.now', 'stage/components/clock.js:44 Date (as a value)',
    'stage2/stage.js:109 import() with a computed specifier (dynamic code)',
  ]);
  assert.deepEqual(r.locked.map((l) => l.file).sort(), ['../hushmallow/src/mallows/registry.js', 'stage/components/clock.js']);
  assert.deepEqual(scanSource(fs.readFileSync(path.join(STUDIO, 'videos/my-brain-at-2am-v2.js'), 'utf8')), []);
  // the studio's entries excuse exactly these, and the handles they let out stay watched
  const s = scanDirs(STUDIO, ['stage2']);
  assert.deepEqual([keys(s), s.stale, s.pending], [[], [], []]);
});
