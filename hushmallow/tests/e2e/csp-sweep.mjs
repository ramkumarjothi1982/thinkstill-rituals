// CSP sweep: every scene and route of the BUILT site, served with its
// generated _headers applied the way Cloudflare Pages applies them
// (tools/site/pages-headers.mjs), in Chromium at 390×844 and 1280×800.
// Collects every securitypolicyviolation event (reported to Node through a
// binding, so nothing is lost across navigations) and every console message
// about a Content Security Policy or Permissions Policy; passes only with ZERO.
//
//   node hushmallow/tests/e2e/csp-sweep.mjs [--out DIR] [--only 390|1280] [--scenes a,b] [--strict-styles]
//
// Nothing live is called. The site is built as production (sign-in on with the
// real project URL and a made-up publishable key, so the policy names the real
// Supabase and Worker origins), and the browser's requests to those origins are
// answered by local doubles: the Supabase fake (tools/auth/fake-supabase.mjs)
// and a tiny Another Angle mock (health, session, a 'fallback' angle). Any
// other off-site request is aborted and reported.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../tools/site/pages-headers.mjs';
import { createFakeSupabase } from '../../tools/auth/fake-supabase.mjs';
import { PROJECT_URL } from '../../src/auth/config.js';
import { ANGLE_ENDPOINT } from '../../src/app/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', join(tmpdir(), 'csp-sweep'));
const ONLY = arg('only', '');
const PICK = arg('scenes', '') ? arg('scenes', '').split(',') : null;
const VER = 'cspsweep';
const FAKE_KEY = 'sb_publishable_cspsweep_local_fake_0000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadPlaywright() {
  for (const dir of [process.env.PLAYWRIGHT_DIR, '/opt/node-tools/node_modules/'].filter(Boolean)) {
    try { return createRequire(dir.endsWith('/') ? dir : `${dir}/`)('playwright'); } catch { /* next */ }
  }
  return createRequire(import.meta.url)('playwright');
}

// ---------------------------------------------------------------- build --
const site = mkdtempSync(join(tmpdir(), 'csp-site-'));
execFileSync('bash', [join(ROOT, 'tools/build-site.sh'), site, VER], {
  cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'],
  env: { PATH: process.env.PATH, HOME: process.env.HOME || '/tmp', SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: FAKE_KEY },
});
// --strict-styles: measure what 'unsafe-inline' for styles is needed for (an inventory run; it is expected to fail)
if (argv.includes('--strict-styles')) writeFileSync(join(site, '_headers'), readFileSync(join(site, '_headers'), 'utf8').replace("style-src 'self' 'unsafe-inline'", "style-src 'self'"));
const headersText = readFileSync(join(site, '_headers'), 'utf8');

// ------------------------------------------------------------- doubles --
const fake = createFakeSupabase();
const FAKE = `http://127.0.0.1:${await fake.listen(0, '127.0.0.1')}`;
const server = createServer(site);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${server.address().port}`;
await fetch(`${FAKE}/__fake/config`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rateLimitMs: 0, autoconfirm: false }) });

const SUPA_ORIGIN = new URL(PROJECT_URL).origin;
const ANGLE_ORIGIN = new URL(ANGLE_ENDPOINT).origin;
const angleCalls = [];
const external = [];

async function routeAll(ctx) {
  await ctx.route((u) => !u.href.startsWith(SITE) && !u.href.startsWith('data:') && !u.href.startsWith('blob:'), async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.origin === SUPA_ORIGIN) {
      const resp = await route.fetch({ url: `${FAKE}${u.pathname}${u.search}` });
      return route.fulfill({ response: resp });
    }
    if (process.env.CSP_DEBUG) console.log(`  [route] ${req.method()} ${req.url().slice(0, 100)}`);
    if (u.origin === ANGLE_ORIGIN) {
      angleCalls.push(`${req.method()} ${u.pathname}`);
      const origin = req.headers().origin || SITE;
      const cors = { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type', vary: 'Origin', 'cache-control': 'no-store' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      const json = (body) => route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (u.pathname === '/v1/health') return json({ ok: true, service: 'another-angle', prompt_version: 'sweep-mock', schema_version: 'scene-v1', provider: 'anthropic', entitlement_mode: 'testing', invite_required: false, configured: { signing_key: true, provider_key: true } });
      if (u.pathname === '/v1/session') return json({ status: 'ok', token: 'mock-token', expires_at: new Date(Date.now() + 3600e3).toISOString() });
      if (u.pathname === '/v1/angle') return json({ status: 'fallback', scene: null, support: null, fallback: { reason: 'provider', hint: null }, keep_support_close: false });
      return json({ status: 'ok' });
    }
    external.push(req.url().slice(0, 120));
    return route.abort();
  });
}

// --------------------------------------------------------- violations --
const results = [];   // { vp, scene, violations: [], console: [], errors: [], ok, note }
let cur = null;
const record = (kind, v) => { if (cur) cur[kind].push(v); else results.push({ vp: '?', scene: '(between scenes)', violations: kind === 'violations' ? [v] : [], console: kind === 'console' ? [v] : [], errors: [], ok: false }); };

async function newContext(browser, W, H) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: W < 700 });
  await ctx.exposeBinding('__cspReport', (_src, v) => record('violations', v));
  await ctx.addInitScript(() => {
    const send = (e) => {
      try {
        window.__cspReport({ directive: e.effectiveDirective || e.violatedDirective, blocked: String(e.blockedURI || '').slice(0, 140), sample: String(e.sample || '').slice(0, 80), source: `${String(e.sourceFile || '').replace(/^https?:\/\/[^/]+/, '')}:${e.lineNumber}`, page: location.pathname + location.search, disposition: e.disposition });
      } catch { /* binding gone during navigation */ }
    };
    document.addEventListener('securitypolicyviolation', send, true);
  });
  await routeAll(ctx);
  return ctx;
}

function watch(page) {
  page.on('console', (m) => {
    const t = m.text();
    if (process.env.CSP_DEBUG) console.log(`  [console ${m.type()}] ${t.slice(0, 200)}`);
    if (/Content.Security.Policy|Refused to (load|execute|apply|connect|frame|create|evaluate)|Permissions.Policy|Unrecognized feature/i.test(t)) record('console', `${m.type()}: ${t.slice(0, 220)}`);
    else if (m.type() === 'error' && !/favicon|Failed to load resource: the server responded with a status of 4\d\d/.test(t)) cur?.errors.push(`console: ${t.slice(0, 160)}`);
  });
  page.on('pageerror', (e) => cur?.errors.push(`pageerror: ${String(e).slice(0, 160)}`));
}

// ------------------------------------------------------------- helpers --
let tid = 40;
async function tap(page, x, y, hold = 60) {
  page.__cdp ||= await page.context().newCDPSession(page);
  const id = ++tid;
  await page.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id }] });
  await sleep(hold);
  await page.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function tapSel(page, sel, timeout = 10000) {
  const el = await page.waitForSelector(sel, { state: 'visible', timeout });
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const b = await el.boundingBox();
  await tap(page, b.x + b.width / 2, b.y + b.height / 2);
}
async function tapText(page, sel, re) {
  for (const b of await page.$$(sel)) {
    if (!re.test((await b.textContent()) || '')) continue;
    const r = await b.boundingBox();
    if (!r || !r.width) continue;
    await tap(page, r.x + r.width / 2, r.y + r.height / 2);
    return true;
  }
  return false;
}
const waitFor = (page, fn, arg, timeout = 20000) => page.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true, () => false);
const appReady = (page) => page.waitForFunction(() => window.__hush && document.querySelector('#scene > *'), null, { timeout: 90000 });
const hfReady = (page) => page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 60000 });

async function fresh(page, path = '/', { tier = 'ultra' } = {}) {
  await page.goto(`${SITE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tier) => {
    for (const k of Object.keys(localStorage)) if (/^hm2:/.test(k)) localStorage.removeItem(k);
    if (tier) localStorage.setItem('hm2:entitlement', JSON.stringify({ tier, source: 'test', since: Date.now() }));
    localStorage.setItem('hm2:prefs', JSON.stringify({ seenIntro: true }));
  }, tier);
  await page.goto(`${SITE}${path}${path.includes('?') ? '&' : '?'}r=${Date.now()}`, { waitUntil: 'domcontentloaded' });
}
async function typeTell(page, text, { chip = false, send = true } = {}) {
  await page.evaluate(() => window.__hushfold.openTell());
  await page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await page.focus('.hf-input textarea');
  await page.keyboard.type(text, { delay: 5 });
  await sleep(700);
  if (chip) { try { await tapSel(page, '.hf-input .hf-opt.suggested', 4000); } catch { /* no suggestion */ } await sleep(300); }
  if (send) await tapSel(page, '.hf-input .hf-send:not([disabled])');
}
async function goScene(page, name, params = {}) {
  if (!(await page.evaluate(() => !!window.__hush?.go && !!document.querySelector('script[type=module][src*="/src/app/main.js"]')).catch(() => false))) { await fresh(page); await appReady(page); await sleep(2000); }
  await page.evaluate(async ([name, params]) => {
    const app = window.__hush;
    document.querySelectorAll('#sheet-root > *').forEach((n) => n.remove());
    const base = document.querySelector('script[type=module][src*="/src/app/main.js"]').src.replace(/src\/app\/main\.js.*$/, '');
    const { RITUALS } = await import(`${base}src/data/rituals.js`);
    app.state.input = { text: 'I am anxious about tomorrow', emotions: [{ id: 'anxiety', confidence: 1, intensity: 0.7 }], intensity: 0.7, contexts: [], desires: [], safety: { level: 'none' } };
    if (name === 'support') { const m = await import(`${base}src/app/scenes/support.js`); return m.openSupport(app); }
    if (name === 'ritual') { app.state.ritual = RITUALS.find((r) => r.id === params.id); return app.go('ritual', { id: params.id }); }
    if (name === 'landing') { app.state.ritual = RITUALS.find((r) => r.id === 'drift-and-dock'); app.state.result = { summary: [{ label: 'You let go of', text: 'Two worries' }] }; return app.go('landing'); }
    return app.go(name, params);
  }, [name, params]);
}
async function pokeAround(page, W, H, n = 4) {
  for (let i = 0; i < n; i++) { await tap(page, Math.round(W * (0.3 + 0.4 * (i % 2))), Math.round(H * (0.45 + 0.1 * (i % 3)))); await sleep(450); }
}
async function mail(email, kind) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${FAKE}/__fake/outbox?to=${encodeURIComponent(email)}`)).json();
    const m = [...list].reverse().find((x) => !kind || x.type === kind || x.kind === kind);
    if (m) return m;
    await sleep(250);
  }
  throw new Error(`no ${kind} email for ${email}`);
}

// ---------------------------------------------------------------- scenes --
// Each scene: async (page, W, H) => note. A thrown error marks the scene not
// reached (it still reports the violations it saw).
const appScene = (name, params, wait = 2500, poke = false) => async (page, W, H) => { await goScene(page, name, params); await sleep(wait); if (poke) await pokeAround(page, W, H); };
let accountN = 0;
const SCENES = [
  ['home (Hushfold)', async (page, W, H) => { await fresh(page); await appReady(page); await hfReady(page); await sleep(2500); const b = await page.evaluate(() => { const r = window.__hushfold.mallow.bodyRect(); return { x: r.cx ?? r.left + r.width / 2, y: r.cy ?? r.top + r.height / 2 }; }); await tap(page, b.x, b.y, 500); await sleep(800); }],
  ['Tell → question → Static Storm (real path)', async (page, W, H) => {
    await fresh(page); await appReady(page); await hfReady(page); await sleep(1500);
    await typeTell(page, 'I am so angry my boss ignored me again', { chip: true });
    if (!(await waitFor(page, () => [...document.querySelectorAll('.hf-subs .hf-chip')].some((b) => b.textContent === 'Play with it'), null, 12000))) throw new Error('the question never showed');
    await sleep(1000);
    for (let i = 0; i < 4 && !(await page.evaluate(() => window.__hushfold.flow?.state?.worldId)); i++) { await tapText(page, '.hf-subs .hf-chips:not([hidden]) .hf-chip', /^Play with it$/); await sleep(1500); }
    if (!(await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing', null, 30000))) throw new Error('no world played');
    await sleep(3000); await pokeAround(page, W, H, 6);
    return `world ${await page.evaluate(() => window.__hushfold.flow.state.worldId)}`;
  }],
  ['Tell → Just be with it (gentle)', async (page, W, H) => {
    await fresh(page); await appReady(page); await hfReady(page); await sleep(1500);
    await typeTell(page, 'I keep thinking about the weekend');
    await waitFor(page, () => [...document.querySelectorAll('.hf-subs .hf-chip')].some((b) => b.textContent === 'Just be with it'), null, 12000);
    await sleep(1000);
    await tapText(page, '.hf-subs .hf-chips:not([hidden]) .hf-chip', /^Just be with it$/);
    await sleep(2500);
    if (await tapText(page, '.hf-subs .hf-chips:not([hidden]) .hf-chip', /calm|quiet/i)) { await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing', null, 30000); await sleep(3500); }
  }],
  ['crisis words → urgent support sheet', async (page) => {
    await fresh(page); await appReady(page); await hfReady(page); await sleep(1200);
    await typeTell(page, 'I want to die', { send: false });
    if (!(await waitFor(page, () => !!document.querySelector('#sheet-root .sheet.open'), null, 8000))) throw new Error('no urgent sheet');
    await sleep(1200);
  }],
  ['care words → care line', async (page) => {
    await fresh(page); await appReady(page); await hfReady(page); await sleep(1200);
    await typeTell(page, 'he hit me again last night');
    await sleep(4000);
  }],
  ['Hushflow lab: Static Storm', async (page, W, H) => { await fresh(page, '/?hushflow=static-storm&photos=0'); await waitFor(page, () => window.__hushflow || window.__hushfold?.flow, null, 60000); await sleep(5000); await pokeAround(page, W, H, 6); }],
  ['Hushflow lab: Luminous Ocean', async (page, W, H) => { await fresh(page, '/?hushflow=luminous-ocean&photos=0'); await waitFor(page, () => window.__hushflow || window.__hushfold?.flow, null, 60000); await sleep(5000); await pokeAround(page, W, H, 6); }],
  ['Memory Garden lab: install', async (page) => { await fresh(page, '/?gardenlab=install'); await sleep(6000); }],
  ['Memory Garden lab: offer', async (page) => { await fresh(page, '/?gardenlab=offer'); await sleep(6000); }],
  ['V3 ritual lab (HM-0001)', async (page, W, H) => { await fresh(page, '/?v3=HM-0001&photos=0'); await appReady(page); await sleep(5000); await pokeAround(page, W, H, 5); }],
  ['classic home', async (page) => { await fresh(page); await appReady(page); await sleep(2500); await goScene(page, 'classic'); await sleep(2500); }],
  ['Express', appScene('express')],
  ['Encounter', appScene('encounter', {}, 3000)],
  ['classic ritual (moonmilk-wind-down)', appScene('ritual', { id: 'moonmilk-wind-down' }, 4500, true)],
  ['landing (share card)', appScene('landing', {}, 3000)],
  ['Memory Garden', async (page) => {
    await page.evaluate(async () => {
      const base = document.querySelector('script[type=module][src*="/src/app/main.js"]').src.replace(/src\/app\/main\.js.*$/, '');
      const g = await import(`${base}src/engine/garden.js`);
      g.saveSkill(window.__hush.store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' });
      g.saveSkill(window.__hush.store, { id: 'a-little-more-room', fromWorld: 'luminous-ocean', mallow: 'loomi' });
    });
    await goScene(page, 'garden'); await sleep(4500);
  }],
  ['plans', appScene('plans')],
  ['plans (Beyond)', appScene('plans', { reason: 'ultra' })],
  ['settings', appScene('settings', {}, 3000)],
  ['library', appScene('library')],
  ['journey', appScene('journey')],
  ['mallows', appScene('mallows')],
  ['support sheet', appScene('support')],
  ['Another Angle: consent → accept (local mock)', async (page, W, H) => {
    angleCalls.length = 0;
    await goScene(page, 'angle', {});
    let consent = false, told = false;
    const vis = (sel, re) => page.evaluate(([sel, re]) => [...document.querySelectorAll(sel)].some((e) => !e.hidden && e.offsetParent && new RegExp(re).test(e.textContent)), [sel, re.source]);
    for (let i = 0; i < 60 && !angleCalls.some((c) => c.endsWith('/v1/angle')); i++) {
      if (await vis('[data-bx=consent] .bx-accept', /Accept/)) { await sleep(600); await tapSel(page, '[data-bx=consent] .bx-accept').catch(() => {}); consent = true; }
      else if (!told && await vis('.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]', /Tell Zuzu/)) {
        await sleep(400);
        await tapText(page, '.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]', /Tell Zuzu/);
        await page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 30000 });
        await sleep(350);
        await page.fill('.hf-input textarea', 'Everyone at work thinks I am useless because I made one mistake');
        await sleep(700);
        told = true;
      } else if (await vis('.hf-input .hf-send:not([disabled])', /./) || await page.$('.hf-input .hf-send:not([disabled])')) {
        await tapSel(page, '.hf-input .hf-send:not([disabled])', 3000).catch(() => {});
      } else await tapText(page, '.hf-chips:not([hidden]) .hf-chip', /^Another angle$/);
      await sleep(1000);
    }
    await sleep(5000);
    await pokeAround(page, W, H, 3);
    if (process.env.CSP_DEBUG) console.log('  [angle state]', told, JSON.stringify(await page.evaluate(() => ({ ep: window.__angle?.endpoint, server: window.__angle?.serverMode?.(), phase: window.__angle?.S?.phase, text: window.__angle?.S?.text }))));
    if (!angleCalls.some((c) => c.endsWith('/v1/angle'))) throw new Error(`no angle request (consent ${consent ? 'seen' : 'not seen'}; calls: ${angleCalls.join(', ') || 'none'})`);
    return `consent ${consent ? 'accepted' : 'already given'}; worker calls (mocked): ${angleCalls.join(', ')}`;
  }],
  ['account (guest): welcome, sign in, create, forgot', async (page) => {
    await fresh(page, '/#account'); await appReady(page);
    for (const v of ['welcome', 'signin', 'create', 'forgot']) { await goScene(page, 'account', { view: v }); await waitFor(page, (v) => document.querySelector(`[data-auth-view="${v}"]`), v, 20000); await sleep(800); }
    await page.fill('[data-auth-view] input[name="email"]', 'nobody@example.com').catch(() => {});
    await tapSel(page, '[data-act="forgot-submit"]', 4000).catch(() => {});
    await sleep(2500);
  }],
  ['account: create → email → /auth/callback (verify) → signed in → account screens', async (page, W) => {
    const email = `csp${W}-${++accountN}@example.com`;
    await fresh(page, '/#account', { tier: null }); await appReady(page);
    await goScene(page, 'account', { view: 'create' });
    await page.waitForSelector('[data-auth-view="create"] input[name="email"]', { timeout: 20000 });
    await page.fill('[data-auth-view] input[name="email"]', email);
    await page.fill('[data-auth-view] input[name="password"]', 'a-long-sweep-password-1');
    await page.fill('[data-auth-view] input[name="name"]', 'Sweep').catch(() => {});
    await page.check('[data-auth-view] input[name="agree"]');   // the required 18+ / Terms and Privacy Policy tick
    await tapSel(page, '[data-act="create-submit"]');
    if (!(await waitFor(page, () => document.querySelector('[data-auth-view="check-email"]'), null, 30000))) throw new Error('no check-email screen');
    const m = await mail(email, 'signup');
    const to = new URL(m.redirect_to || `${SITE}/auth/callback/`);
    await page.goto(`${SITE}${to.pathname}?token_hash=${m.token_hash}&type=email`);
    if (!(await waitFor(page, () => window.__hush?.auth?.status?.() === 'signed-in', null, 60000))) throw new Error('not signed in after the link');
    await sleep(1500);
    for (const v of ['account', 'password', 'device-data', 'signout', 'delete']) { await goScene(page, 'account', { view: v }); await sleep(1200); }
    return `signed in as ${email}`;
  }],
  ['/auth/callback: error link, bogus token, Site-URL fallback', async (page) => {
    await page.goto(`${SITE}/auth/callback/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`); await sleep(2500);
    await page.goto(`${SITE}/auth/callback/?token_hash=not-a-real-token&type=email`); await sleep(3500);
    await page.goto(`${SITE}/auth/callback`); await sleep(2000);
    await page.goto(`${SITE}/?code=not-a-real-code`); await sleep(4000);
    return `ended at ${new URL(page.url()).pathname}`;
  }],
  ['stale page: module 404 → onerror → version.json', async (page) => {
    let n = 0;
    await page.route(`${SITE}/v/${VER}/src/app/main.js`, (r) => (n++ === 0 ? r.fulfill({ status: 404, body: 'gone' }) : r.continue()));
    await page.goto(`${SITE}/?stale=1`);
    await waitFor(page, () => /[?&]v=/.test(location.search), null, 15000);
    await sleep(3000);
    await page.unroute(`${SITE}/v/${VER}/src/app/main.js`);
    return `forwarded to ${new URL(page.url()).search}`;
  }],
];

// ------------------------------------------------------------------ run --
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
mkdirSync(OUT, { recursive: true });
const kill = setTimeout(() => { console.log('TIMEOUT'); finish(2); }, 30 * 60 * 1000);
const viewports = [[390, 844], [1280, 800]].filter(([w]) => !ONLY || String(w) === ONLY);
for (const [W, H] of viewports) {
  const ctx = await newContext(browser, W, H);
  const page = await ctx.newPage();
  watch(page);
  for (const [name, fn] of SCENES) {
    if (PICK && !PICK.some((p) => name.toLowerCase().includes(p.toLowerCase()))) continue;
    cur = { vp: `${W}x${H}`, scene: name, violations: [], console: [], errors: [], ok: true, note: '' };
    try { cur.note = (await fn(page, W, H)) || ''; } catch (e) { cur.ok = false; cur.note = `not reached: ${String(e.message || e).slice(0, 160)}`; }
    await sleep(300);
    await page.screenshot({ path: join(OUT, `${W}x${H}-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.png`) }).catch(() => {});
    results.push(cur);
    const n = cur.violations.length + cur.console.length;
    console.log(`${n ? 'VIOLATION' : 'ok       '} ${cur.vp} ${name}: ${n} violation(s)${cur.ok ? '' : ' [NOT REACHED]'}${cur.note ? ` — ${cur.note}` : ''}`);
    for (const v of cur.violations) console.log(`    ${JSON.stringify(v)}`);
    for (const c of cur.console) console.log(`    ${c}`);
    cur = null;
  }
  await ctx.close();
}
finish(0);

function finish(code) {
  clearTimeout(kill);
  const total = results.reduce((s, r) => s + r.violations.length + r.console.length, 0);
  const unreached = results.filter((r) => !r.ok);
  const report = { headers: headersText, site: SITE, total, external, results };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const lines = ['| viewport | scene | violations | reached | note |', '|---|---|---|---|---|', ...results.map((r) => `| ${r.vp} | ${r.scene} | ${r.violations.length + r.console.length} | ${r.ok ? 'yes' : 'no'} | ${(r.note || '').replace(/\|/g, '/')} |`)];
  writeFileSync(join(OUT, 'summary.md'), `${lines.join('\n')}\n`);
  console.log(`\n${results.length} scene visits, ${total} CSP / permissions-policy violation(s), ${unreached.length} scene(s) not reached, ${external.length} off-site request(s) aborted${external.length ? `: ${[...new Set(external)].slice(0, 5).join(', ')}` : ''}`);
  console.log(`report: ${join(OUT, 'report.json')}, ${join(OUT, 'summary.md')}`);
  Promise.allSettled([browser?.close(), new Promise((r) => server.close(r)), fake.close()]).finally(() => {
    rmSync(site, { recursive: true, force: true });
    process.exit(code || (total || unreached.length || external.length ? 1 : 0));
  });
}
