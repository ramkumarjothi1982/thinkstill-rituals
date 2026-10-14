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
    writeFileSync(clean, 'export const line = "A Mallow perspective · Automatically generated"; // labels and labs-free\n');
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
