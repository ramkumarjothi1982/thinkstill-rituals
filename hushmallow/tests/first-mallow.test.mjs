// The first Mallow on a slow first visit (live performance run, Fast 3G + 4x CPU): its art used to be asked for only
// once every first-screen module had arrived and run (the Mallow at ~9.1 s, an empty stage from ~5 s), and on a slower
// line MallowTouch's 5 s ran out while the art was still downloading, so the visit kept the rig that cannot be squeezed.
//   * index.html asks for the art as the page starts, with a copy of the Hushfold's pick: this file holds that copy to
//     the scene (src/app/scenes/hushfold.js openingMallow, for every minute of a day and every stored preference: the
//     same Mallow or nothing, never another) and to the registry (src/mallows/registry.js loadMallowAssets: the same
//     files), and checks it runs before the stylesheets and resolves into the published v/<version>/ folder;
//   * touchReady: MallowTouch's 5 s start once its art is in; the art has its own, generous cap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { openingMallow, mallowForNow, touchReady } from '../src/app/scenes/hushfold.js';
import { authBoot } from '../src/auth/boot.js';
import { createPrefs } from '../src/app/prefs.js';
import { MALLOW_IDS } from '../src/mallows/registry.js';
import { inlineCode } from '../tools/site/security-headers.mjs';
import { memoryStorage } from './helpers/auth-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');
const HTML = read('index.html');
const ART_SCRIPT = inlineCode(HTML).scripts.find((s) => s.includes("l.as = 'image'"));
const SCRIPT = new vm.Script(ART_SCRIPT, { filename: 'index.html (first Mallow art)' });

// the files the registry loads for each Mallow, relative to assets/ (a stand-in Image records them; a registry of its
// own for each, so no picture is already in its shared cache)
const FILES = {};
{
  const seen = [];
  const had = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  globalThis.Image = class { set src(v) { seen.push(v); queueMicrotask(() => this.onload?.()); } };
  try {
    for (const id of MALLOW_IDS) {
      const registry = await import(`../src/mallows/registry.js?files=${id}`);
      seen.length = 0;
      await registry.loadMallowAssets(id);
      FILES[id] = seen.map((u) => u.replace(/^.*?\/assets\//, ''));
    }
  } finally { if (had) Object.defineProperty(globalThis, 'Image', had); else delete globalThis.Image; }
}

const FONT = 'https://example.test/v/x1/assets/fonts/nunito-sans-latin-wght-normal.woff2';
/**
 * index.html's script in a page of its own: `storage` a Storage double (or 'blocked': reading localStorage throws), the
 * address's search and hash, the first font preload at `font`. → run(now): the clock at `now`, → { links, hrefs }
 * (the script only reads storage, so one page serves every time of day)
 */
function inlinePage({ storage = memoryStorage(), search = '', hash = '', font = FONT } = {}) {
  let links = [], T = 0;
  class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(T); } }
  const sandbox = {
    Date: FakeDate, URL, JSON,
    location: { search, hash },
    document: {
      querySelector: (s) => (s === 'link[rel="preload"][as="font"]' ? { href: font } : null),
      createElement: (t) => { const el = { tagName: t, attrs: {}, setAttribute(k, v) { el.attrs[k] = String(v); } }; return el; },
      head: { appendChild: (el) => { links.push(el); return el; } },
    },
  };
  if (storage !== 'blocked') sandbox.localStorage = storage;
  const ctx = vm.createContext(sandbox);
  if (storage === 'blocked') vm.runInContext("Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('SecurityError'); } })", ctx);
  return (now) => { links = []; T = now.getTime(); SCRIPT.runInContext(ctx); return { links, hrefs: links.map((l) => l.href) }; };
}
const runInline = ({ now, ...page }) => inlinePage(page)(now);

// sign-in on this machine (as tests/auth-namespace.test.mjs): a session in localStorage puts the page in its account's namespace
const PUBLISHED = { enabled: true, url: 'http://localhost:8203', key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' };
const SESSION_KEY = 'sb-localhost-auth-token';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const session = (uid) => JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r1', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, email: 'someone@example.com' } });

/** The Hushfold's own pick on this device (its real chain: authBoot's store, the prefs, openingMallow), as a fresh page makes it. → (now) => id */
function scenePicker({ seed = {}, blocked = false, signIn = false }) {
  const ls = blocked ? undefined : memoryStorage(seed);
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', blocked ? { configurable: true, get() { throw new Error('SecurityError'); } } : { configurable: true, value: ls });
  try {
    const loc = { hostname: 'localhost', protocol: 'http:', search: '', hash: '', href: 'http://localhost:8202/', replace() { throw new Error('not a sign-in link'); } };
    const boot = authBoot({ loc, ls, ss: memoryStorage(), published: signIn ? PUBLISHED : { enabled: false } });
    // a fresh page: no explicit pick in this visit yet (app.state is new)
    const prefs = createPrefs(boot.store);
    return (now) => openingMallow({ homeMallow: null }, prefs, now);
  } finally { if (had) Object.defineProperty(globalThis, 'localStorage', had); else delete globalThis.localStorage; }
}

const prefsWith = (mallow) => JSON.stringify({ sound: true, seenIntro: true, mallow });
// every kind of stored preference: unset, null, each Mallow, a value that is not one, an unreadable entry
const STORED = [undefined, null, ...MALLOW_IDS, 'nobody', 'toString'];
const STATES = [
  { name: 'a new visitor', seed: {} },
  { name: 'storage blocked', blocked: true },
  { name: 'unreadable prefs', seed: { 'hm2:prefs': '{' } },
  { name: 'prefs null', seed: { 'hm2:prefs': 'null' } },
  { name: 'prefs a string', seed: { 'hm2:prefs': '"pipzi"' } },
  { name: 'prefs a list', seed: { 'hm2:prefs': '["pipzi"]' } },
  { name: 'prefs without a Mallow', seed: { 'hm2:prefs': JSON.stringify({ sound: false }) } },
  ...STORED.flatMap((v) => [
    { name: `sign-in off, prefs.mallow ${v}`, seed: { 'hm2:prefs': prefsWith(v) } },
    { name: `a guest, prefs.mallow ${v}`, seed: { 'hm2:prefs': prefsWith(v) }, signIn: true },
    { name: `an account, its prefs.mallow ${v}`, seed: { [SESSION_KEY]: session(A), [`hm2:u:${A}:prefs`]: prefsWith(v) }, signIn: true },
    { name: `an account with none of its own, the guest's prefs.mallow ${v}`, seed: { [SESSION_KEY]: session(A), 'hm2:prefs': prefsWith(v) }, signIn: true },
    { name: `a guest, another account's prefs.mallow ${v}`, seed: { [`hm2:u:${B}:prefs`]: prefsWith(v) }, signIn: true },
    { name: `an account, its own unset, another account's prefs.mallow ${v}`, seed: { [SESSION_KEY]: session(A), [`hm2:u:${A}:prefs`]: prefsWith(null), [`hm2:u:${B}:prefs`]: prefsWith(v) }, signIn: true },
  ]),
];
// nothing on this device names a Mallow: the page must ask for the hour's art (else the preload does nothing)
const chosenNowhere = (st) => !st.seed || Object.entries(st.seed).every(([k, raw]) => {
  if (!/prefs$/.test(k)) return true;
  try { const p = JSON.parse(raw); return !p || p.mallow == null; } catch { return true; }
});
const DAY = Array.from({ length: 24 * 60 }, (_, m) => new Date(2026, 9, 17, 0, m, 30));
const fileOf = (href) => href.replace(/^https:\/\/example\.test\/v\/x1\/assets\//, '');

test('the inline pick is the Hushfold\'s: every minute of a day, every stored preference — the same Mallow\'s files, or nothing', () => {
  assert.ok(ART_SCRIPT, 'index.html has the first Mallow\'s art script');
  let asked = 0, held = 0;
  for (const st of STATES) {
    const pick = scenePicker(st), page = inlinePage({ storage: st.blocked ? 'blocked' : memoryStorage(st.seed) });
    for (const now of DAY) {
      const scene = pick(now);
      const { hrefs } = page(now);
      if (hrefs.length) {
        asked++;
        assert.deepEqual(hrefs.map(fileOf), FILES[scene], `${st.name}, ${now.toTimeString().slice(0, 8)}: the scene shows ${scene}; the page asked for ${hrefs.map(fileOf)}`);
        continue;
      }
      held++;
      // nothing asked for: only when the pick is not certain
      const turning = mallowForNow(now) !== mallowForNow(new Date(now.getTime() + 120000));
      assert.ok(turning || !chosenNowhere(st), `${st.name}, ${now.toTimeString().slice(0, 8)}: nothing chosen, ${scene} is the hour's, yet no art was asked for`);
    }
  }
  assert.ok(asked > 20000 && held > 20000, `both kinds of case covered (${asked} asked, ${held} held)`);
});

test('the inline pick holds back in the two minutes before the hour\'s Mallow changes', () => {
  const at = (h, m, s = 0) => runInline({ now: new Date(2026, 9, 17, h, m, s) }).hrefs.map(fileOf)[0] || null;
  assert.equal(at(10, 57, 59), 'mallows-hires/boppo.webp');
  assert.equal(at(10, 58, 0), null, 'Boppo until 11:00, then Pipzi: the scene may run after it');
  assert.equal(at(11, 0, 0), 'mallows/pipzi.webp');
  for (const h of [5, 10, 16, 20]) { assert.equal(at(h, 58, 30), null, `${h}:58`); assert.ok(at(h, 30), `${h}:30`); }
  assert.ok(at(1, 59, 0), 'within Noomi\'s hours nothing changes at the hour');
});

test('the inline pick only runs on a plain address: a sign-in link, a return from Stripe or a lab asks for nothing', () => {
  const now = new Date(2026, 9, 17, 14, 0);
  for (const search of ['?code=c0de1234-5678', '?token_hash=pkce_abc&type=signup', '?billing=success', '?hires=0', '?v=x2', '?lab=src/rituals/x.js']) {
    assert.deepEqual(runInline({ now, search }).hrefs, [], search);
  }
  for (const hash of ['#access_token=a.b.c&refresh_token=r', '#error=access_denied&error_code=otp_expired&error_description=x']) {
    assert.deepEqual(runInline({ now, hash }).hrefs, [], hash);
  }
  for (const hash of ['', '#home', '#account', '#garden']) assert.equal(runInline({ now, hash }).hrefs.length, 4, hash || '(none)');
});

test('the inline preloads are what the scene\'s images need: as=image, high priority, no CORS mode, in the head', () => {
  const { links } = runInline({ now: new Date(2026, 9, 17, 22, 0) });
  assert.deepEqual(links.map((l) => fileOf(l.href)), FILES.noomi);
  for (const l of links) {
    assert.equal(l.tagName, 'link');
    assert.equal(l.rel, 'preload');
    assert.equal(l.as, 'image');
    assert.equal(l.attrs.fetchpriority, 'high');
    // the registry's new Image() is a no-CORS request: a crossorigin preload would not match it, and the art would come twice
    assert.equal(l.crossOrigin ?? l.attrs.crossorigin, undefined);
  }
  // every Mallow the hour can pick, file for file the registry's (its high-res art included)
  const hourly = [...new Set(DAY.map((d) => mallowForNow(d)))].sort();
  assert.deepEqual(hourly, ['boppo', 'loomi', 'noomi', 'pipzi']);
  for (const id of hourly) {
    const h = { boppo: 8, loomi: 18, noomi: 23, pipzi: 12 }[id];
    assert.deepEqual(runInline({ now: new Date(2026, 9, 17, h, 0) }).hrefs.map(fileOf), FILES[id], id);
  }
});

test('index.html: the script runs before the stylesheets (a script after them waits for them), and its art is in the published folder', () => {
  const at = HTML.indexOf(ART_SCRIPT);
  assert.ok(at > HTML.lastIndexOf('<link rel="preload" href="assets/fonts/'), 'after the font preloads it resolves against');
  assert.ok(at < HTML.indexOf('<link rel="stylesheet"'), 'before the first stylesheet');
  assert.ok(at < HTML.indexOf('<link rel="modulepreload"'), 'and before the module preloads');
  // published as tools/build-site.sh writes it: the fonts (and so the art) under v/<version>/assets/
  const pub = HTML.replace(/(href|src)="src\//g, '$1="v/x1/src/').replace(/href="assets\//g, 'href="v/x1/assets/');
  assert.ok(pub.includes(ART_SCRIPT), 'the rewrite leaves the script as it is (its Content-Security-Policy hash holds)');
  const font = /<link rel="preload" href="([^"]+)" as="font"/.exec(pub)[1];
  assert.equal(font, 'v/x1/assets/fonts/nunito-sans-latin-wght-normal.woff2');
  for (const h of [3, 8, 12, 19]) {
    const { hrefs } = runInline({ now: new Date(2026, 9, 17, h, 0), font: new URL(font, 'https://example.test/').href });
    assert.ok(hrefs.length >= 3);
    for (const u of hrefs) {
      assert.match(u, /^https:\/\/example\.test\/v\/x1\/assets\/(mallows|rig)(-hires)?\/[\w-]+\.webp$/);
      assert.ok(existsSync(`${root}assets/${fileOf(u)}`), `${fileOf(u)} is in assets/ (build-site.sh publishes every art folder)`);
    }
  }
  // the pick it copies is the one the scene makes
  assert.match(read('src/app/scenes/hushfold.js'), /let mallowId = openingMallow\(app\.state, prefs\);/);
});

test('touchReady: MallowTouch\'s 5 s start once its art is in; the art has its own generous cap', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const flush = () => new Promise((r) => setImmediate(r));
  const later = () => { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; };
  const run = (art, setup) => {
    const out = { v: null };
    touchReady({ get loaded() { return setup.p; } }, art.p).then((v) => { out.v = ['ready', v]; }, (e) => { out.v = ['fallback', e.message]; });
    return out;
  };
  // a slow line (0.8 Mbps): the art at 12.4 s, MallowTouch set up 0.1 s later: the squeezable Mallow, not the rig
  {
    const art = later(), setup = later(), out = run(art, setup);
    t.mock.timers.tick(12400); await flush();
    assert.equal(out.v, null, 'still waiting for the art at 12.4 s (a 5 s race from the start had given up at 5 s)');
    art.res({}); await flush();
    t.mock.timers.tick(100); setup.res('touch'); await flush();
    assert.deepEqual(out.v, ['ready', 'touch']);
  }
  // the art in, but MallowTouch's own set-up stuck: the rig after 5 s of it
  {
    const art = later(), setup = later(), out = run(art, setup);
    t.mock.timers.tick(9000); art.res({}); await flush();
    t.mock.timers.tick(4999); await flush();
    assert.equal(out.v, null);
    t.mock.timers.tick(1); await flush();
    assert.deepEqual(out.v, ['fallback', 'not ready after 5 s']);
  }
  // an art load that never ends still falls back, after 30 s; one that fails falls back at once
  {
    const art = later(), setup = later(), out = run(art, setup);
    t.mock.timers.tick(29999); await flush();
    assert.equal(out.v, null);
    t.mock.timers.tick(1); await flush();
    assert.deepEqual(out.v, ['fallback', 'its art not in after 30 s']);
    const art2 = later(), out2 = run(art2, later());
    art2.rej(new Error('Could not load assets/mallows/pipzi.webp')); await flush();
    assert.deepEqual(out2.v, ['fallback', 'Could not load assets/mallows/pipzi.webp']);
  }
});

test('the Hushfold waits with touchReady on the registry\'s art (the download already on its way), never a 5 s race from the start', () => {
  const src = read('src/app/scenes/hushfold.js');
  const enter = src.slice(src.indexOf('    async enter() {'), src.indexOf('if (!touchMt) world.showMallow(true);'));
  assert.match(enter, /touchMt = new MallowTouch\(touchBox, \{ id: mallowId,[\s\S]*?await touchReady\(touchMt, loadMallowAssets\(touchMt\.id\)\);\s*\} catch \(e\) \{/);
  assert.doesNotMatch(enter, /Promise\.race\(\[touchMt\.loaded/);
});
