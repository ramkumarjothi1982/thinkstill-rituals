// Guard: no wall-clock time or unseeded randomness in engine/ or composer/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO, mkWorkTemp } from '../../render/lib/paths.mjs';
import { scanSource, scanDirs, DETERMINISTIC_DIRS, WALLCLOCK_ALLOWED } from '../../render/lib/determinism-scan.mjs';

test('engine/ and composer/ contain no wall-clock or unseeded-randomness reads; every allowlist entry is live', (t) => {
  const r = scanDirs(STUDIO);
  t.diagnostic(`scanned ${r.scanned.length} files in ${DETERMINISTIC_DIRS.join(', ')}${r.missing.length ? ` (not created yet: ${r.missing.join(', ')})` : ''}; followed ${r.followed.length} imports, ${r.locked.length} locked`);
  for (const a of r.allowed) t.diagnostic(`allowlisted ${a.file}:${a.line} ${a.api}: ${a.reason}`);
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
  return { root, studio, write, scan: (allow = [], dirs = ['engine', 'composer']) => scanDirs(studio, dirs, allow), done: () => fs.rmSync(root, { recursive: true, force: true }) };
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

test('imports: studio code imported from elsewhere is scanned too; locked code is not followed; unfollowable imports are findings', () => {
  const t = tree();
  try {
    t.write('lib/now.js', 'export const now = () => Date.now();\n');                    // a helper outside engine/
    t.write('lib/ok.js', 'export const two = 2;\n');
    t.write('stage2/frozen.js', 'export const r = () => Math.random();\n');              // FROZEN path: hash-locked elsewhere
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
    t.write('lib/plain', 'export default Date.now();\n');
    const r = t.scan();
    assert.deepEqual(r.followed, [{ file: 'lib/now.js', from: 'engine/a.js' }, { file: 'lib/ok.js', from: 'engine/a.js' }]);
    assert.deepEqual(r.locked.map((l) => l.file).sort(), ['../hushmallow/src/registry.js', 'stage2/frozen.js']);
    assert.deepEqual(keys(r), [
      'engine/a.js:10 imports a file the guard cannot read as JS: the guard cannot follow it',
      'engine/a.js:6 imports a package (lodash): the guard cannot follow it',
      'engine/a.js:7 imports code from a URL (https:): the guard cannot follow it',
      'engine/a.js:8 imports an absolute import path: the guard cannot follow it',
      'engine/a.js:9 imports code from outside the studio: the guard cannot follow it',
      'lib/now.js:1 Date.now',
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

test('allowlist: every entry is in a deterministic dir and has a reason; none is registered ahead of its file', () => {
  for (const a of WALLCLOCK_ALLOWED) {
    assert.ok(DETERMINISTIC_DIRS.some((dir) => a.file.startsWith(`${dir}/`)), a.file);
    assert.ok(a.reason.length > 20 && a.apis.length);
    assert.ok(fs.existsSync(path.join(STUDIO, a.file)), `${a.file} does not exist`);
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

test('the code WP-01 forks (stage2/) and the v2 direction under the full rules: one finding, the computed direction import', () => {
  const r = scanDirs(STUDIO, ['stage2'], []);
  assert.ok(r.scanned.length >= 10);
  // engine/ must load directions through constant import() thunks (followed by the guard) or pin this line with a reason
  assert.deepEqual(keys(r), ['stage2/stage.js:109 import() with a computed specifier (dynamic code)']);
  assert.deepEqual(r.locked.map((l) => l.file).sort(), ['../hushmallow/src/mallows/registry.js', '../hushmallow/src/mallows/registry.js', 'stage/components/clock.js']);
  assert.deepEqual(scanSource(fs.readFileSync(path.join(STUDIO, 'videos/my-brain-at-2am-v2.js'), 'utf8')), []);
});
