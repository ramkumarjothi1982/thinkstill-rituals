// The customer build: exactly the files the app loads, and a scan that
// refuses anything meant only for developers or testers. The scan itself is
// tested by planting each kind of developer content and checking it's caught.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, scan } from '../tools/build-app.mjs';
import { appFiles, labFiles } from '../server/app-files.mjs';

test('build: dist/app holds exactly what the app loads, and none of the lab, tests, tools or server code', () => {
  const out = mkdtempSync(join(tmpdir(), 'hushmates-build-'));
  try {
    const res = build({ out });
    assert.ok(res.ok, JSON.stringify(res.problems));
    const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.files).sort(), [...appFiles().keys()].sort());
    for (const url of Object.keys(manifest.files)) {
      assert.ok(!/^\/(lab|tests|tools|docs|server|net|v1-messaging)\//.test(url), url);
      assert.ok(!['/core/relay.js', '/core/relay-seed.js', '/core/perspectives.js', '/index.html'].includes(url), url);
    }
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('build: the lab is a separate page, and nothing in the app imports it', () => {
  const app = appFiles();
  const lab = labFiles();
  assert.ok(lab.has('/lab/index.html') && lab.has('/lab/lab/lab.js') && lab.has('/lab/core/relay-seed.js'));
  for (const url of app.keys()) assert.ok(!url.startsWith('/lab/'), url);
});

test('build: the scan catches every kind of developer content (planted, one at a time)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-scan-'));
  try {
    const planted = [
      'Open the Control room', 'Scenario B · nobody catches it', 'Phone A is the author', 'Type it for me', 'Lab · canned example',
      'a test identity', 'MoonMallow', 'seedRelay(service)', 'new LocalNetwork(svc)', 'window.__lab.play()', 'move the dev clock',
      'console.log(state)', 'debugger;', 'fetch("http://localhost:8790")', 'const API_KEY = "sk-ant-123"', 'Example for testing, not generated', 'TODO: remove',
    ];
    planted.forEach((text, i) => {
      const file = join(dir, `f${i}.js`);
      writeFileSync(file, `export const x = ${JSON.stringify(text)};\n`);
      assert.ok(scan(new Map([[`/ui/f${i}.js`, file]])).length > 0, `the scan missed: ${text}`);
    });
    const clean = join(dir, 'clean.js');
    writeFileSync(clean, 'export const line = "A Mallow perspective · Automatically generated"; // labels and labelled things\n');
    assert.deepEqual(scan(new Map([['/ui/clean.js', clean]])), []);
    assert.ok(scan(new Map([['/core/relay-seed.js', clean]])).length > 0, 'a server-only file name passed');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Any new file in the customer app has to be added here on purpose: a stray import of server or lab code fails this test.
const EXPECTED = [
  '/app/app.js', '/app/index.html',
  ...['blubi', 'boppo', 'glitzi', 'loomi', 'noomi', 'pipzi', 'zuzu'].map((m) => `/assets/art/${m}.webp`),
  ...['boppo', 'glitzi', 'pipzi', 'zuzu'].map((m) => `/assets/art/${m}-lids.webp`), '/assets/art/mascot.webp',
  ...['OFL-Fraunces.txt', 'OFL-Manrope.txt', 'OFL-NunitoSans.txt', 'fraunces-italic-latin-ext.woff2', 'fraunces-italic-latin.woff2', 'fraunces-latin-ext.woff2', 'fraunces-latin.woff2',
    'manrope-latin-ext.woff2', 'manrope-latin.woff2', 'nunito-sans-italic-latin-ext.woff2', 'nunito-sans-italic-latin.woff2', 'nunito-sans-latin-ext.woff2', 'nunito-sans-latin.woff2'].map((f) => `/assets/fonts/${f}`),
  '/client/http-link.js', '/client/relay-client.js',
  '/core/feeling-safety.js', '/core/relay-config.js', '/core/text-policy.js',
  '/src/ultra/frameworks.js', '/src/ultra/lenses.js', '/src/ultra/reframe-engine.js',
  ...['app', 'fonts', 'hushfold', 'relay-scenes', 'relay', 'share', 'world'].map((f) => `/styles/${f}.css`),
  ...['atmosphere', 'device', 'dom', 'kit', 'mallow', 'mallows-data', 'motion', 'orb', 'sky', 'sound'].map((f) => `/ui/${f}.js`),
  ...['away', 'catch', 'common', 'index', 'invite', 'journeys', 'parts', 'release', 'returned', 'share-render', 'share', 'start', 'support', 'welcome', 'you', 'your-data'].map((f) => `/ui/relay/${f}.js`),
].sort();

test('build: the customer app is exactly the expected files (nothing new slips in unnoticed)', () => {
  assert.deepEqual([...appFiles().keys()].sort(), EXPECTED);
});

// ------------------------------------------------------------- comment stripping --
import { stripJs, stripCss } from '../tools/strip-comments.mjs';

test('build: stripping comments keeps strings, templates and regular expressions exactly', () => {
  const cases = [
    ["const u = 'http://x/*y*/'; // note", "const u = 'http://x/*y*/'; "],
    ['const r = /\\/\\/[a-z/]+/g; /* gone */ f(r);', 'const r = /\\/\\/[a-z/]+/g;   f(r);'],
    ['const t = `a ${b ? `in ${c /* x */}` : "//"} z`; // end', 'const t = `a ${b ? `in ${c  }` : "//"} z`; '],
    ['const half = a / 2 / b; // math', 'const half = a / 2 / b; '],
    ['if (x) return /re\\/x/.test(s); // regex after return', 'if (x) return /re\\/x/.test(s); '],
    ['const o = { a: 1 }; /*\n many\n lines */ g();', 'const o = { a: 1 }; \n g();'],
    ["const s = \"it's // not a comment\";", "const s = \"it's // not a comment\";"],
    ['const k = `line one  \n\n\n  line two`; // spaces kept', 'const k = `line one  \n\n\n  line two`; '],
  ];
  for (const [src, want] of cases) assert.equal(stripJs(src), want, src);
  assert.equal(stripCss('a { content: "/* keep */"; } /* drop */ b { c: d }'), 'a { content: "/* keep */"; }  b { c: d }');
});

test('build: every shipped module loses only its comments', () => {
  for (const [url, file] of appFiles()) {
    if (!/\.m?js$/.test(url)) continue;
    const a = readFileSync(file, 'utf8');
    const b = stripJs(a);
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (a.startsWith('//', i)) { const e = a.indexOf('\n', i); i = e < 0 ? a.length : e; continue; }
      if (a.startsWith('/*', i)) { const e = a.indexOf('*/', i + 2) + 2; assert.equal(b[j], a.slice(i, e).includes('\n') ? '\n' : ' ', url); i = e; j++; continue; }
      assert.fail(`${url}: something other than a comment changed at ${i}: ${JSON.stringify(a.slice(i, i + 40))}`);
    }
    assert.equal(stripJs(b), b, `${url}: stripping twice changes it`);
  }
});

test('build: what ships has no comments, and the scan reads words split across lines or pieces', () => {
  const out = mkdtempSync(join(tmpdir(), 'hushmates-strip-'));
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-scan2-'));
  try {
    assert.ok(build({ out }).ok);
    for (const f of ['ui/device.js', 'ui/relay/parts.js', 'client/relay-client.js', 'app/app.js', 'core/feeling-safety.js']) {
      const text = readFileSync(join(out, f), 'utf8');
      assert.ok(!/^\s*\/\/|\/\*\*/m.test(text), `${f} still has comments`);
      assert.ok(!/Phase 2|tester|test host|reviewed per region|build-app/.test(text), `${f} still has developer notes`);
    }
    const planted = ["'Example for ' + 'testing, not generated'", "'Open the control\\n room'", 'const devClock = 1', 'dev.env.labMode', 'LAB_TOOLS', "'Hushmates Labs'",
      "'Try scenarios A, B and C'", "'Switch between phones A and B'", "'A simulated account'", "'Tester note'", "'live AI response (test key)'"];
    planted.forEach((text, i) => {
      const file = join(dir, `p${i}.js`);
      writeFileSync(file, `export const x = ${text};\n`);
      assert.ok(scan(new Map([[`/ui/p${i}.js`, file]])).length > 0, `the scan missed: ${text}`);
    });
    const svg = join(dir, 'a.svg');
    writeFileSync(svg, '<svg><text>Lab · control room · Scenario A</text></svg>');
    assert.ok(scan(new Map([['/assets/a.svg', svg]])).length > 0, 'the scan skips SVG');
  } finally { rmSync(out, { recursive: true, force: true }); rmSync(dir, { recursive: true, force: true }); }
});
