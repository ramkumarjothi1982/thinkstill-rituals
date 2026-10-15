// Browser probe for the sign-in readiness gate (src/auth/readiness.js), against the local fake of Supabase.
//
//   node hushmallow/tools/auth/fake-supabase.mjs --port 8203 --site http://127.0.0.1:8311 &
//   node hushmallow/tools/auth/readiness-probe.cjs [port=8311] [fake=8203] [out=DIR]
//
// The repo root must be served (python3 -m http.server <port> from it). Sign-in is pointed at the fake with the
// localhost-only ?authDev=<fake port> override. Scenarios, each in a fresh browser context (a fresh session):
//   ready     a guest boots: nothing is sent to the fake; Settings → the two questions go out once and the
//             "Sign in" row shows; Settings again (same session): no new question
//   schema    the fake's tables missing (noSchema): Settings shows no account row, one console info line says why;
//             /#account stays on the Hushfold (no account scene)
//   autoconf  "Confirm email" off on the fake: a dev build may confirm at once, so the row shows (production refuses:
//             tests/auth-readiness.test.mjs)
//   down      the fake answers 503: no row, nothing stored for the session; a reload asks once more, never in a loop
// Prints "RESULT {...}" and writes screenshots to out/shots.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const PORT = +opt('port', 8311), FAKE = +opt('fake', 8203);
const OUT = opt('out', path.join(os.tmpdir(), 'readiness-probe'));
const W = +opt('w', 390), H = +opt('h', 844);
const BASE = `http://localhost:${PORT}/hushmallow/index.html?authDev=${FAKE}`;
const FAKE_URL = `http://localhost:${FAKE}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { fails: [], notes: {}, shots: [] };
const fail = (k, v) => { res.fails.push({ k, v }); console.log('FAIL', k, JSON.stringify(v ?? null).slice(0, 400)); };
const check = (ok, k, v) => { if (!ok) fail(k, v); else console.log('PASS', k); return ok; };
const fakeCfg = (c) => fetch(`${FAKE_URL}/__fake/config`, { method: 'POST', body: JSON.stringify(c) }).then((r) => r.json());

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const asks = [], info = [], errors = [];
  page.on('request', (r) => { if (r.url().startsWith(FAKE_URL)) asks.push(r.url().replace(FAKE_URL, '')); });
  page.on('console', (m) => { if (m.type() === 'info' && /\[auth\]/.test(m.text())) info.push(m.text()); if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page, asks, info, errors };
}
async function shot(o, name) { const p = path.join(OUT, 'shots', `readiness-${name}.png`); fs.mkdirSync(path.dirname(p), { recursive: true }); await o.page.screenshot({ path: p }); res.shots.push(p); }
const appReady = (page) => page.waitForFunction(() => !!window.__hush?.auth && !!document.querySelector('#scene > *'), null, { timeout: 30000 });
async function settings(o) {
  await o.page.evaluate(() => window.__hush.go('settings'));
  await o.page.waitForSelector('.settings', { timeout: 15000 });
  await sleep(1500);
  // (the Privacy section in view, for the screenshot)
  await o.page.evaluate(() => { const h = [...document.querySelectorAll('.settings h2')].find((x) => /Privacy/.test(x.textContent)); h?.scrollIntoView({ block: 'start' }); });
  await sleep(300);
  return o.page.evaluate(() => { const b = document.querySelector('[data-act="account-row"]'); return b ? b.textContent : null; });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const kill = setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 380000);
  try {
    // ---- ready
    await fetch(`${FAKE_URL}/__fake/reset`, { method: 'POST' });
    await fakeCfg({ autoconfirm: false, noSchema: false, emailOff: false, down: false });
    let o = await open(browser);
    await o.page.goto(BASE, { waitUntil: 'domcontentloaded' }); await appReady(o.page); await sleep(2500);
    check(o.asks.length === 0, 'ready: a guest boots and nothing goes to the sign-in server', o.asks);
    const row = await settings(o);
    res.notes.readyAsks = [...o.asks];
    check(row === 'Sign in', 'ready: Settings shows the "Sign in" row', row);
    check(o.asks.filter((a) => /\/rest\/v1\/profiles|\/auth\/v1\/settings/.test(a)).length === 2, 'ready: the two questions, once', o.asks);
    await shot(o, '01-ready-settings-390');
    await o.page.evaluate(() => window.__hush.back()); await sleep(800);
    const n0 = o.asks.length;
    const row2 = await settings(o);
    check(row2 === 'Sign in' && o.asks.length === n0, 'ready: Settings again: the row, no new question', { row2, asks: o.asks.slice(n0) });
    await o.page.reload(); await appReady(o.page); await sleep(1200);
    const n1 = o.asks.length;
    await settings(o);
    check(o.asks.length === n1, 'ready: a reload in the same session asks nothing more (kept for the session)', o.asks.slice(n1));
    await o.ctx.close();

    // ---- schema missing
    await fakeCfg({ noSchema: true });
    o = await open(browser);
    await o.page.goto(BASE, { waitUntil: 'domcontentloaded' }); await appReady(o.page); await sleep(1500);
    const rowS = await settings(o);
    check(rowS === null, 'schema missing: no account row in Settings', rowS);
    check(o.info.length === 1 && /database tables are missing/.test(o.info[0]), 'schema missing: one console info line says why', o.info);
    res.notes.schemaInfo = o.info[0] || null;
    await shot(o, '02-schema-missing-settings-390');
    // a guest's /#account link: stays on the Hushfold
    await o.page.goto(`${BASE.replace('index.html?', 'index.html?n=2&')}#account`, { waitUntil: 'domcontentloaded' }); await appReady(o.page); await sleep(2500);
    const deep = await o.page.evaluate(() => ({ view: document.querySelector('[data-auth-view]')?.dataset.authView || null, home: !!document.querySelector('.hushfold') }));
    check(!deep.view && deep.home, 'schema missing: a guest\'s /#account link stays on the Hushfold', deep);
    await shot(o, '03-schema-missing-deeplink-390');
    // the account scene itself, if reached some other way: the "doesn't use accounts" card, never the sign-in screens
    await o.page.evaluate(() => window.__hush.go('account'));
    await o.page.waitForSelector('[data-auth-view]', { timeout: 15000 }).catch(() => {});
    await sleep(800);
    const view = await o.page.evaluate(() => document.querySelector('[data-auth-view]')?.dataset.authView || null);
    check(view === 'off', 'schema missing: the account scene shows its "off" card', view);
    await shot(o, '04-schema-missing-account-scene-390');
    await o.ctx.close();

    // ---- autoconfirm on (dev build: allowed)
    await fakeCfg({ noSchema: false, autoconfirm: true });
    o = await open(browser);
    await o.page.goto(BASE, { waitUntil: 'domcontentloaded' }); await appReady(o.page); await sleep(1200);
    const rowA = await settings(o);
    check(rowA === 'Sign in', 'autoconfirm on, a dev build: the row shows (production refuses it: node tests)', rowA);
    await o.ctx.close();

    // ---- the project down (503)
    await fakeCfg({ autoconfirm: false, down: true });
    o = await open(browser);
    await o.page.goto(BASE, { waitUntil: 'domcontentloaded' }); await appReady(o.page); await sleep(1200);
    const rowD = await settings(o);
    const stored = await o.page.evaluate(() => sessionStorage.getItem('hm2:auth.ready'));
    check(rowD === null && stored === null, 'down: no row, nothing kept for the session', { rowD, stored });
    check(/could not be checked/.test(o.info[0] || ''), 'down: the console line says it could not be checked', o.info);
    const nD = o.asks.length;
    await sleep(6000);
    check(o.asks.length === nD, 'down: nothing is retried while the page stays open', o.asks.slice(nD));
    await o.page.evaluate(() => window.__hush.back()); await sleep(600);
    await settings(o);
    check(o.asks.length === nD, 'down: Settings again on the same page asks nothing more', o.asks.slice(nD));
    await shot(o, '05-down-settings-390');
    res.notes.errors = o.errors.slice(0, 5);
    await o.ctx.close();
    await fakeCfg({ down: false });
  } catch (e) { fail('exception', String(e && e.stack || e)); }
  clearTimeout(kill);
  await browser.close();
  console.log('RESULT', JSON.stringify(res));
  process.exit(res.fails.length ? 1 : 0);
})();
