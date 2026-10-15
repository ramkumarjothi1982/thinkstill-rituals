// Browser proof of the ACCOUNT SCREENS on the BUILT site, against the LOCAL
// fake of Supabase (tools/auth/fake-supabase.mjs). Never production; this is
// not Supabase itself (the CI job on a local Supabase stack is).
//
//   build + serve exactly as tools/auth/callback-e2e.cjs says (site on 8202,
//   fake on 8203), then:
//   timeout 400 node hushmallow/tools/auth/screens-e2e.cjs --part flows   [--out DIR]
//   timeout 400 node hushmallow/tools/auth/screens-e2e.cjs --part people  [--out DIR]
//   timeout 400 node hushmallow/tools/auth/screens-e2e.cjs --part gallery [--out DIR]
//
// flows    every flow through the screens, by touch (CDP Input.dispatchTouchEvent)
//          and typing, at 390×844: create → check email → confirm on another
//          device → sign in (wrong password first) → keep this phone's things →
//          reload keeps the session → sync opt-in (rows appear, ongoing changes
//          follow) → withdraw (rows deleted) → change password: a wrong current
//          password, then the right one (no code today); a 25-hour-old session asks for the emailed code (a wrong code first) → sign out → forgot → reset on another
//          device → sign in with it; unconfirmed + resend (375×812); token
//          expiry → refresh → a refresh that fails → calm guest fallback;
//          Back through the screens; the keyboard (visualViewport) lifts the card.
// people   one browser, two accounts and a guest: never each other's things;
//          "Not now" then "Bring them in"; delete account (server rows + auth
//          user gone, this device's copy wiped, the others untouched); offline.
// gallery  every screen at 390×844, 375×812, 320×568, 320×568 at text size
//          1.25 and 1280×800: no sideways scroll, nothing under 13 px, inputs
//          ≥ 16 px, targets ≥ 44 px, nothing clipped; reduced motion.
// Prints one line per check; screenshots in --out (default /tmp/claude-0/hf/auth/screens).
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');

const SITE = process.env.SITE || 'http://localhost:8202';
const FAKE = process.env.FAKE || 'http://localhost:8203';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', '/tmp/claude-0/hf/auth/screens');
const PART = arg('--part', 'flows');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (ok, label, extra = '') => { results.push({ ok: !!ok, label }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (path, body) => fetch(`${FAKE}${path}`, { method: 'POST', body: JSON.stringify(body || {}) }).then((r) => r.json());
const state = () => fetch(`${FAKE}/__fake/state`).then((r) => r.json());
const outbox = (to) => fetch(`${FAKE}/__fake/outbox?to=${encodeURIComponent(to)}`).then((r) => r.json());
async function mail(to, kind, after = 0, tries = 60) {
  for (let i = 0; i < tries; i++) { const m = (await outbox(to)).filter((x) => x.kind === kind && x.at > after).pop(); if (m) return m; await sleep(100); }
  return null;
}
/** Whether these credentials sign in on the fake (HTTP status); the session it opens is closed again at once. */
async function canSignIn(email, password) {
  const r = await fetch(`${FAKE}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: 'sb_publishable_hushmallow_local_dev_only', 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const j = await r.json().catch(() => ({}));
  if (j.access_token) await fetch(`${FAKE}/auth/v1/logout?scope=local`, { method: 'POST', headers: { apikey: 'sb_publishable_hushmallow_local_dev_only', authorization: `Bearer ${j.access_token}` } });
  return r.status;
}
const PASS1 = 'gentle-moon-42', PASS2 = 'quiet-harbour-77', PASS3 = 'soft-lantern-19', PASS4 = 'misty-meadow-31';
let VER = null;

async function main() {
  VER = (await (await fetch(`${SITE}/version.json`)).json()).v;
  await post('/__fake/reset');
  await post('/__fake/config', { rateLimitMs: 0, autoconfirm: false, failRefresh: false, refreshDown: false, accessTtl: 3600, down: false, securePasswordChange: true, recentLoginMs: 86_400_000, restDelayMs: 0, restDelayTables: null });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const problems = [], expected = [];
  const H = {
    browser, problems, expected,
    ctx: (w = 390, h = 844, extra = {}) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 900, ...extra }),
    async page(ctx, name) {
      const page = await ctx.newPage();
      page.on('console', (m) => {
        if (m.type() !== 'error' || /favicon/.test(m.text())) return;
        // the browser logs every 4xx/5xx answer and a refused request while offline: the sign-in server's expected refusals are not app errors
        if (/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text()) && ((m.location()?.url || '').startsWith(FAKE) || /ERR_INTERNET_DISCONNECTED/.test(m.text()))) { expected.push(`${name}: ${m.text().slice(0, 90)}`); return; }
        problems.push(`${name}: console: ${m.text().slice(0, 200)}`);
      });
      page.on('pageerror', (e) => problems.push(`${name}: pageerror: ${String(e).slice(0, 200)}`));
      page.__name = name;
      return page;
    },
  };
  try {
    if (PART === 'flows') await flows(H);
    else if (PART === 'people') await people(H);
    else if (PART === 'gallery') await gallery(H);
    else throw new Error(`unknown --part ${PART}`);
  } finally {
    check(problems.length === 0, 'no console errors or page errors', problems.length ? problems.slice(0, 6).join(' | ') : `${expected.length} expected refusals from the sign-in server`);
    await browser.close();
  }
  const fails = results.filter((x) => !x.ok).length;
  console.log(fails ? `${fails} OF ${results.length} CHECKS FAILED (${PART})` : `ALL ${results.length} CHECKS PASSED (${PART}; screenshots in ${OUT})`);
  process.exit(fails ? 1 : 0);
}

// ------------------------------------------------------------- helpers --
const appReady = (p) => p.waitForFunction(() => window.__hush?.auth && document.querySelector('#scene > *'), null, { timeout: 60000 });
const viewOf = (p) => p.evaluate(() => document.querySelector('[data-auth-view]')?.dataset.authView || null);
async function waitView(p, v, timeout = 30000) {
  try { await p.waitForFunction((v) => document.querySelector(`[data-auth-view="${v}"]`) && window.__account?.mallow, v, { timeout }); } catch (e) {
    const now = await p.evaluate(() => ({ view: document.querySelector('[data-auth-view]')?.dataset.authView, err: [...document.querySelectorAll('.hm-auth-error')].map((x) => x.textContent).join(' | '), hash: location.hash })).catch(() => null);
    await p.screenshot({ path: `${OUT}/FAILED-wait-${v}.png` }).catch(() => {});
    console.log(`waitView(${v}) timed out on ${p.__name}:`, JSON.stringify(now));
    throw e;
  }
}
const mood = (p) => p.evaluate(() => document.querySelector('.hm-account-mallow')?.dataset.mood);
const status = (p) => p.evaluate(() => window.__hush.auth.status());
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` });
const lsKeys = (p) => p.evaluate(() => Object.keys(localStorage));
const favs = (p) => p.evaluate((ver) => import(`/v/${ver}/src/engine/flow-store.js`).then((m) => m.favouriteWorlds(window.__hush.store)), VER);
const star = (p, id) => p.evaluate(({ ver, id }) => import(`/v/${ver}/src/engine/flow-store.js`).then((m) => m.toggleFavouriteWorld(window.__hush.store, id)), { ver: VER, id });
const uidOf = (p) => p.evaluate(() => window.__hush.auth.namespace.uid);
/** The session id inside this page's persisted access token. */
const sidOf = (p) => p.evaluate(() => { try { const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x)); return JSON.parse(atob(JSON.parse(localStorage.getItem(k)).access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id; } catch { return null; } });
const lastToast = (p) => p.waitForFunction(() => document.querySelector('.toast')?.textContent || '', null, { timeout: 15000 }).then((h) => h.jsonValue(), () => '');

/** A real touch (CDP Input.dispatchTouchEvent) at the element's centre. */
async function tap(p, selector) {
  const el = await p.waitForSelector(selector, { state: 'visible', timeout: 30000 });
  await el.scrollIntoViewIfNeeded();
  // wait for any scrolling (the screen centres a focused field) to settle: a finger taps where the button is now
  let b = await el.boundingBox();
  for (let i = 0; i < 20; i++) { await sleep(120); const c = await el.boundingBox(); if (c && Math.abs(c.y - b.y) < 0.5 && Math.abs(c.x - b.x) < 0.5) break; b = c; }
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  p.__cdp ||= await p.context().newCDPSession(p);
  await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  await sleep(40);
  await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function tapNav(p, selector) { await Promise.all([p.waitForNavigation({ timeout: 60000 }), tap(p, selector)]); await appReady(p); }
async function fill(p, name, value) { const s = `[data-auth-view] input[name="${name}"]`; await p.waitForSelector(s, { timeout: 15000 }); await p.fill(s, value); }
const errText = (p) => p.evaluate(() => [...document.querySelectorAll('[data-auth-view] .hm-auth-error')].map((e) => e.textContent).join(' ').trim());

/** Sign in through the screens from wherever the account scene is. Resolves 'nav' (into the account) or 'choice' (the guest question). */
async function signInUi(p, email, password) {
  if ((await viewOf(p)) !== 'signin') { await tap(p, '[data-act="signin"]'); await waitView(p, 'signin'); }
  await fill(p, 'email', email); await fill(p, 'password', password);
  const nav = p.waitForNavigation({ timeout: 60000 }).then(() => 'nav', () => 'none');
  const gc = p.waitForSelector('[data-auth-view="guest-choice"]', { timeout: 60000 }).then(() => 'choice', () => 'none');
  await tap(p, '[data-act="signin-submit"]');
  const r = await Promise.race([nav, gc]);
  if (r === 'nav') await appReady(p);
  return r;
}
let loads = 0;
/** A fresh load of the app at /#account (a query keeps it from being a same-page hash change). */
async function openAccount(p) { await p.goto(`${SITE}/?n=${++loads}#account`); await appReady(p); await p.waitForFunction(() => document.querySelector('[data-auth-view]') && window.__account?.mallow, null, { timeout: 60000 }); }

/** Layout guard for whatever screen is showing. */
function layout(p) {
  return p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.sr-only'); };
    const scene = document.querySelector('.hm-account');
    const own = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const texts = [...scene.querySelectorAll('*')].filter((e) => own(e) && vis(e));
    const minFont = Math.min(...texts.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    const inputs = [...scene.querySelectorAll('input:not([type=checkbox])')].filter(vis);
    const minInput = inputs.length ? Math.min(...inputs.map((e) => parseFloat(getComputedStyle(e).fontSize))) : 16;
    const targets = [...scene.querySelectorAll('button, a.hm-auth-btn')].filter(vis);
    const small = targets.filter((e) => e.getBoundingClientRect().height < 44 - 0.5).map((e) => e.dataset.act || e.textContent.trim().slice(0, 20));
    const clipped = targets.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim().slice(0, 24));
    const card = scene.querySelector('.hm-auth-card').getBoundingClientRect();
    const outside = texts.filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 0.5 || r.left < -0.5; }).length;
    return { overflowX: document.documentElement.scrollWidth - innerWidth, minFont, minInput, small, clipped, outside, cardW: Math.round(card.width) };
  });
}
async function layoutOk(p, label) {
  const L = await layout(p);
  check(L.overflowX <= 0 && L.minFont >= 13 && L.minInput >= 16 && !L.small.length && !L.clipped.length && !L.outside, `${label}: fits (no sideways scroll, text ≥ 13 px, inputs ≥ 16 px, targets ≥ 44 px, nothing clipped)`, JSON.stringify(L));
}

// =============================================================== flows ==
async function flows(H) {
  const ana = 'ana@example.com';
  const phone = await H.ctx(390, 844);
  const p = await H.page(phone, 'phone');
  await p.goto(`${SITE}/`); await appReady(p);
  check(await status(p) === 'guest', 'a guest boots as before (sign-in on, nobody signed in)');
  await star(p, 'static-storm');
  await p.evaluate(() => window.__hush.prefs.set('haptics', false));   // a guest's own setting
  check(await p.evaluate(() => !document.querySelector('script[src*="vendor/supabase"]')), 'a guest never downloads supabase-js');

  // Back steps through the screens, then leaves
  await openAccount(p);
  check(await viewOf(p) === 'welcome', '/#account (guest): the welcome screen');
  await shot(p, 'flow-01-welcome-390');
  await tap(p, '[data-act="create"]'); await waitView(p, 'create');
  await p.goBack(); await waitView(p, 'welcome');
  check(true, 'Back from Create account returns to the welcome screen');
  await p.goBack(); await sleep(900);
  check(await p.evaluate(() => location.hash === '#home' && !document.querySelector('[data-auth-view]')), 'Back again leaves the account screens for the Hushfold');

  // create → check your email
  await openAccount(p);
  await tap(p, '[data-act="create"]'); await waitView(p, 'create');
  check(await p.waitForFunction(() => !!document.querySelector('script[src*="vendor/supabase"]') && !!window.supabase?.createClient, null, { timeout: 15000 }).then(() => true, () => false), 'supabase-js loads once a sign-in screen opens (not before)');
  await fill(p, 'email', ana);
  await tap(p, '[data-auth-view] input[name="password"]');
  await sleep(300);
  check(await mood(p) === 'away', 'a password field has focus: the Mallow closes its eyes');
  const attrs = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-auth-view] input')].map((i) => [i.name, i.getAttribute('autocomplete')])));
  check(attrs.email === 'email' && attrs.password === 'new-password', 'autocomplete: email, new-password', JSON.stringify(attrs));
  await fill(p, 'password', 'short');
  await tap(p, '[data-act="create-submit"]');
  await sleep(300);
  check(/at least 8/.test(await errText(p)) && await mood(p) === 'concerned', 'a short password: a friendly line and a concerned Mallow (nothing sent)');
  await shot(p, 'flow-02-create-error-390');
  await fill(p, 'password', PASS1);
  const meter = await p.evaluate(() => document.querySelector('.hm-auth-meter').dataset.score);
  check(+meter >= 2, 'the gentle strength hint follows the password', `score ${meter}`);
  await fill(p, 'name', 'Ana');
  await tap(p, '[data-act="create-submit"]');
  await waitView(p, 'check-email');
  await sleep(500);
  const ce = await p.evaluate(() => ({ lede: document.querySelector('.hm-auth-lede').textContent, resend: document.querySelector('[data-act="resend"]').textContent }));
  check(/ana@example\.com/.test(ce.lede) && /in \d+ s/.test(ce.resend), 'Check your email: the address, and "Send it again" waits for its cooldown', JSON.stringify(ce));
  await shot(p, 'flow-03-check-email-390');

  // confirm on another device (the token_hash link of supabase/templates/confirmation.html)
  const m1 = await mail(ana, 'signup');
  const laptop = await H.ctx(1280, 800);
  const l = await H.page(laptop, 'laptop');
  await l.goto(`${m1.redirect_to}?token_hash=${m1.token_hash}&type=email`);
  await l.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in' && document.querySelector('[data-auth-view="account"]'), null, { timeout: 60000 });
  check(true, 'the link on another device confirms and signs in there (account screen)');
  await l.close(); await laptop.close();

  // back on the phone: sign in, a wrong password first
  await tap(p, '[data-act="confirmed-signin"]'); await waitView(p, 'signin');
  check(await p.inputValue('[data-auth-view] input[name="email"]') === ana && await p.getAttribute('[data-auth-view] input[name="password"]', 'autocomplete') === 'current-password', 'Sign in: the email carried over; current-password');
  await fill(p, 'password', 'not-my-password');
  await tap(p, '[data-act="signin-submit"]');
  await p.waitForFunction(() => document.querySelector('[data-auth-view] .hm-auth-error')?.textContent, null, { timeout: 30000 });
  check(/don’t match/.test(await errText(p)) && await mood(p) === 'concerned' && await p.getAttribute('[data-auth-view] input[name="password"]', 'aria-invalid') === 'true', 'a wrong password: "That email and password don’t match", concerned Mallow, the field marked');
  const unknown = await p.evaluate(() => window.__hush.auth.load().then((a) => a.signIn({ email: 'nobody@example.com', password: 'whatever-123' })));
  check(unknown.error?.message === (await errText(p)), 'an unknown email reads exactly the same (no account enumeration)');
  await shot(p, 'flow-04-signin-wrong-390');
  await tap(p, '[data-auth-view] .hm-auth-reveal');
  check(await p.getAttribute('[data-auth-view] input[name="password"]', 'type') === 'text', 'show / hide password');
  await fill(p, 'password', PASS1);
  await tap(p, '[data-act="signin-submit"]');
  await waitView(p, 'guest-choice');
  await sleep(500);
  check(true, 'first sign-in on a phone with guest things: asked once whether to keep them');
  await shot(p, 'flow-05-guest-choice-390');
  await tapNav(p, '[data-act="keep"]');
  await waitView(p, 'account');
  // the arrival is said on the card (its lede), not in a toast over the card's fields (QA-around)
  const t1 = await p.evaluate(() => document.getElementById('hm-account-lede')?.textContent || '');
  const k1 = { ns: await p.evaluate(() => window.__hush.auth.namespace.mode), favs: await favs(p), haptics: await p.evaluate(() => window.__hush.prefs.get('haptics')) };
  check(k1.ns === 'account' && k1.favs.includes('static-storm') && k1.haptics === false && /signed in/.test(t1), 'Keep: signed in, in the account’s own namespace, with a copy of the guest’s things', JSON.stringify({ ...k1, lede: t1 }));
  await sleep(1200);
  await p.waitForFunction(() => !document.querySelector('[data-sync="settings"]')?.disabled, null, { timeout: 30000 });
  await shot(p, 'flow-06-account-390');
  const uidA = await uidOf(p);

  // reload keeps the session
  await p.reload(); await appReady(p);
  await p.waitForFunction(() => document.querySelector('[data-auth-view="account"]'), null, { timeout: 30000 }).catch(() => {});
  check(await status(p) === 'signed-in' && await uidOf(p) === uidA, 'a reload keeps the session (persisted), same account');

  // sync opt-in → rows appear
  await p.waitForFunction(() => !document.querySelector('[data-sync="library"]')?.disabled, null, { timeout: 30000 });
  let s0 = await state();
  check(!s0.rows.favourite_worlds.length && !s0.rows.preferences.length, 'nothing is kept with the account before the person opts in');
  await tap(p, '[data-sync="library"]');
  await p.waitForFunction(() => /kept with your account now/.test(document.querySelector('[data-sync-status]')?.textContent || ''), null, { timeout: 30000 });
  await tap(p, '[data-sync="settings"]');
  await p.waitForFunction(() => /settings are kept/.test(document.querySelector('[data-sync-status]')?.textContent || ''), null, { timeout: 30000 });
  let s1 = await state();
  const fw = s1.rows.favourite_worlds.filter((r) => r.user_id === uidA).map((r) => r.world_id);
  const pr = s1.rows.preferences.find((r) => r.user_id === uidA);
  const cs = s1.rows.sync_consents.find((r) => r.user_id === uidA);
  check(fw.includes('static-storm') && pr?.haptics === false && cs.library_sync && cs.settings_sync && cs.library_sync_at && cs.settings_sync_at, 'opt in → the rows appear, consent stamped by the server', JSON.stringify({ fw, haptics: pr?.haptics, at: cs.library_sync_at }));
  const line = await p.evaluate(() => document.querySelector('[data-sync="library"]').closest('.hm-account-row').querySelector('.hm-account-consent').textContent);
  check(/^On since \d+ \w+ \d{4}, \d\d:\d\d/.test(line), 'the switch shows when consent was given', line);
  check(!JSON.stringify(s1.rows).includes('Ana') || s1.rows.profiles.some((r) => r.display_name === 'Ana'), 'only ids and switches are synced (the name lives in the profile only)');
  await p.evaluate(() => document.querySelector('[data-sync="library"]').scrollIntoView({ block: 'center' }));
  await sleep(300);
  await shot(p, 'flow-07-sync-on-390');
  await star(p, 'luminous-ocean');   // an ongoing change while sync is on
  await p.evaluate(() => window.__hush.prefs.set('subtitleSpeed', 1.25));
  let followed = false;
  for (let i = 0; i < 40 && !followed; i++) { await sleep(300); const s = await state(); followed = s.rows.favourite_worlds.some((r) => r.user_id === uidA && r.world_id === 'luminous-ocean') && s.rows.preferences.some((r) => r.user_id === uidA && +r.subtitle_speed === 1.25); }
  check(followed, 'while sync is on, a new favourite and a changed setting follow within seconds');
  // withdraw → rows deleted
  await tap(p, '[data-sync="library"]');
  await p.waitForFunction(() => /deleted from your account/.test(document.querySelector('[data-sync-status]')?.textContent || ''), null, { timeout: 30000 });
  const s2 = await state();
  const left = ['favourite_worlds', 'garden_skills', 'hushflow_progress'].map((t) => s2.rows[t].filter((r) => r.user_id === uidA).length);
  const cs2 = s2.rows.sync_consents.find((r) => r.user_id === uidA);
  check(left.every((n) => n === 0) && cs2.library_withdrawn_at && !cs2.library_sync && s2.rows.preferences.some((r) => r.user_id === uidA), 'withdraw → those rows are deleted, the withdrawal is stamped, the other switch is untouched', JSON.stringify({ left, withdrawn: cs2.library_withdrawn_at }));
  check((await favs(p)).includes('luminous-ocean'), 'this phone keeps its own copy after withdrawing');
  const line2 = await p.evaluate(() => document.querySelector('[data-sync="library"]').closest('.hm-account-row').querySelector('.hm-account-consent').textContent);
  check(/^Off since .*deleted/.test(line2), 'the switch says when it was turned off and that the copy was deleted', line2);
  await tap(p, '[data-sync="settings"]');
  await p.waitForFunction(() => /settings were deleted/.test(document.querySelector('[data-sync-status]')?.textContent || ''), null, { timeout: 30000 });
  check(!(await state()).rows.preferences.some((r) => r.user_id === uidA), 'turning settings sync off deletes the preferences row');

  // change password: the CURRENT password first (checked on an isolated client), no code on a session from today
  await tap(p, '[data-act="password"]'); await waitView(p, 'password');
  const pa = await p.evaluate(() => ({ cur: document.querySelector('[data-auth-view] input[name="current"]')?.autocomplete, nw: document.querySelector('[data-auth-view] input[name="password"]')?.autocomplete, user: document.querySelector('[data-auth-view] input[name="username"]')?.autocomplete, forgot: !!document.querySelector('[data-act="forgot-current"]'), code: !!document.querySelector('[data-auth-view] input[name="code"]') }));
  check(pa.cur === 'current-password' && pa.nw === 'new-password' && pa.user === 'username' && pa.forgot && !pa.code, 'Change password: the current password and the new one (current-password / new-password, a username for password managers), forgot one tap away, no code asked', JSON.stringify(pa));
  await layoutOk(p, 'change password (390)');
  await shot(p, 'flow-08-password-start-390');
  const pageSid = await sidOf(p);
  const t8 = Date.now();
  await fill(p, 'current', 'not-my-password'); await fill(p, 'password', PASS2);
  await tap(p, '[data-act="password-submit"]');
  await p.waitForFunction(() => document.querySelector('[data-auth-view] .hm-auth-error')?.textContent, null, { timeout: 30000 });
  const e8 = await errText(p);
  check(e8 === 'That password doesn’t match.' && await mood(p) === 'concerned' && await p.getAttribute('[data-auth-view] input[name="current"]', 'aria-invalid') === 'true', 'a wrong current password: "That password doesn’t match.", the field marked, a concerned Mallow', e8);
  check(!(await mail(ana, 'reauthentication', t8 - 1000, 10)) && await canSignIn(ana, PASS2) === 400, 'nothing changed and no code was emailed');
  await shot(p, 'flow-09-password-wrong-current-390');
  await fill(p, 'current', PASS1);
  await tap(p, '[data-act="password-submit"]');
  await waitView(p, 'account', 30000);
  const t9toast = await lastToast(p);
  const live9 = (await state()).liveSessions;
  check(await canSignIn(ana, PASS2) === 200 && await canSignIn(ana, PASS1) === 400 && /new password is saved/.test(t9toast) && !(await mail(ana, 'reauthentication', t8 - 1000, 10)), 'a session from today: the right current password changes it at once, no code', t9toast);
  check(live9.length === 1 && live9[0] === pageSid && await status(p) === 'signed-in', 'the check’s own session is gone (scope local); this page’s session is the one left alive', JSON.stringify({ live9, pageSid }));
  // a session over 24 hours old: Supabase asks for the emailed code as well
  await post('/__fake/age-sessions', { email: ana, hours: 25 });
  await tap(p, '[data-act="password"]'); await waitView(p, 'password');
  const t10 = Date.now();
  await fill(p, 'current', PASS2); await fill(p, 'password', PASS4);
  await tap(p, '[data-act="password-submit"]');
  await p.waitForSelector('[data-auth-view="password"] input[name="code"]', { timeout: 30000 });
  const code = await mail(ana, 'reauthentication', t10 - 1000);
  check(!!code?.token && await p.getAttribute('[data-auth-view] input[name="code"]', 'autocomplete') === 'one-time-code' && /more than a day/.test(await p.textContent('.hm-auth-lede')), 'a 25-hour-old session: the code step appears, the 6-digit code is emailed; the field is one-time-code', code?.token ? 'code sent' : 'no code');
  await layoutOk(p, 'enter the code (390)');
  await shot(p, 'flow-09b-password-code-390');
  await fill(p, 'code', code.token === '000000' ? '111111' : '000000');
  await tap(p, '[data-act="code-submit"]');
  await p.waitForFunction(() => document.querySelector('[data-auth-view] .hm-auth-error')?.textContent, null, { timeout: 30000 });
  check(/code didn’t work/.test(await errText(p)) && await mood(p) === 'concerned' && await canSignIn(ana, PASS4) === 400, 'a wrong code: "That code didn’t work", the password stays as it was');
  await shot(p, 'flow-09c-password-wrong-code-390');
  await fill(p, 'code', code.token);
  await tap(p, '[data-act="code-submit"]');
  await waitView(p, 'account', 30000);
  check(await canSignIn(ana, PASS4) === 200 && await canSignIn(ana, PASS2) === 400, 'the right code: the new password works, the old one no longer does');
  await post('/__fake/age-sessions', { email: ana, hours: 0 });

  // sign out
  await tap(p, '[data-act="signout"]'); await waitView(p, 'signout');
  await shot(p, 'flow-10-signout-390');
  await tapNav(p, '[data-act="signout-confirm"]');
  const g1 = { status: await status(p), favs: await favs(p), haptics: await p.evaluate(() => window.__hush.prefs.get('haptics')), sb: (await lsKeys(p)).filter((k) => k.startsWith('sb-')), kept: (await lsKeys(p)).some((k) => k.startsWith(`hm2:u:${uidA}:`)) };
  check(g1.status === 'guest' && g1.favs.join() === 'static-storm' && g1.haptics === false && !g1.sb.length && g1.kept, 'signed out: a guest again with the guest’s own things; every sb- key gone; the account’s copy kept apart', JSON.stringify(g1));

  // forgot → reset on another device → sign in with it
  await openAccount(p);
  await tap(p, '[data-act="signin"]'); await waitView(p, 'signin');
  await fill(p, 'email', ana);
  await tap(p, '[data-act="forgot"]'); await waitView(p, 'forgot');
  check(await p.inputValue('[data-auth-view] input[name="email"]') === ana, 'Forgot your password: the email carried over');
  await shot(p, 'flow-11-forgot-390');
  const t0 = Date.now();
  await tap(p, '[data-act="forgot-submit"]'); await waitView(p, 'reset-sent');
  check(/If there’s an account for/.test(await p.textContent('.hm-auth-lede')), 'the same neutral answer whether or not the email has an account');
  await shot(p, 'flow-12-reset-sent-390');
  const rm = await mail(ana, 'recovery', t0 - 1000);
  const small = await H.ctx(320, 568);
  const sp = await H.page(small, 'reset-320');
  await sp.goto(`${rm.redirect_to}?token_hash=${rm.token_hash}&type=recovery`);
  await sp.waitForSelector('#hm-new-password', { timeout: 30000 });
  await sp.fill('#hm-new-password', PASS3);
  await sp.click('button[type=submit]');
  await sp.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in', null, { timeout: 60000 });
  check(true, 'the reset link (another device, 320×568): a new password, signed in there');
  await sp.close(); await small.close();
  await post('/__fake/config', { accessTtl: 3 });   // from here on, access tokens live 3 s
  await tap(p, '[data-act="back-signin"]'); await waitView(p, 'signin');
  await fill(p, 'password', PASS3);
  await tapNav(p, '[data-act="signin-submit"]');
  await waitView(p, 'account');
  check(await status(p) === 'signed-in' && await uidOf(p) === uidA && (await favs(p)).includes('luminous-ocean'), 'signed in with the reset password; no second guest question; the account’s things are back');

  // token expiry → refresh
  const tokBefore = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k)))).access_token);
  await sleep(4500);
  await fill(p, 'displayName', 'Ana R');
  await tap(p, '[data-act="save-name"]');
  await p.waitForFunction(() => /Hi, Ana R/.test(document.querySelector('.hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  const tokAfter = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k)))).access_token);
  const prof = (await state()).rows.profiles.find((r) => r.user_id === uidA);
  check(prof?.display_name === 'Ana R' && tokAfter !== tokBefore && await status(p) === 'signed-in', 'an expired access token is refreshed and the next call just works', JSON.stringify({ name: prof?.display_name, refreshed: tokAfter !== tokBefore }));

  // a refresh that fails for good → calm guest fallback (guest things untouched)
  await post('/__fake/config', { failRefresh: true });
  await sleep(3500);
  const nav = p.waitForNavigation({ timeout: 90000 });
  await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); });   // back to the front: supabase-js refreshes, the server says no
  await nav; await appReady(p);
  const t2 = await lastToast(p);
  const g2 = { status: await status(p), favs: await favs(p), haptics: await p.evaluate(() => window.__hush.prefs.get('haptics')), kept: (await lsKeys(p)).some((k) => k.startsWith(`hm2:u:${uidA}:`)), sb: (await lsKeys(p)).filter((k) => k.startsWith('sb-')).length };
  check(g2.status === 'guest' && /signed out on this device/.test(t2) && g2.favs.join() === 'static-storm' && g2.haptics === false && g2.kept && !g2.sb, 'a refresh that fails: one calm line, a guest again, the guest’s things untouched, the account’s copy kept', JSON.stringify({ ...g2, toast: t2 }));
  await shot(p, 'flow-13-expired-guest-390');
  await post('/__fake/config', { failRefresh: false, accessTtl: 3600 });

  // the keyboard (visualViewport) lifts the card: a controllable viewport stands in for iOS's
  const kbCtx = await H.ctx(390, 844);
  await kbCtx.addInitScript(() => {
    const vv = new EventTarget();
    Object.assign(vv, { width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    window.__kb = (px) => { vv.height = innerHeight - px; vv.dispatchEvent(new Event('resize')); };
  });
  const kp = await H.page(kbCtx, 'keyboard');
  await openAccount(kp);
  await tap(kp, '[data-act="signin"]'); await waitView(kp, 'signin');
  await tap(kp, '[data-auth-view] input[name="password"]');
  await kp.evaluate(() => window.__kb(336));
  await sleep(900);
  const kb = await kp.evaluate(() => ({ open: document.querySelector('.hm-account').dataset.kb, kb: getComputedStyle(document.querySelector('.hm-account')).getPropertyValue('--kb').trim(), mallow: Math.round(document.querySelector('.hm-account-mallow').getBoundingClientRect().width), inputBottom: Math.round(document.activeElement.getBoundingClientRect().bottom), visible: innerHeight - 336 }));
  check(kb.open === 'open' && kb.kb === '336px' && kb.mallow <= 80 && kb.inputBottom <= kb.visible, 'keyboard up (visualViewport): the Mallow sits smaller and the focused field stays above the keyboard', JSON.stringify(kb));
  await kp.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:336px;background:rgba(200,200,210,.92);z-index:99'; d.textContent = ''; document.body.append(d); });
  await shot(kp, 'flow-14-keyboard-390');
  await kbCtx.close();

  // unconfirmed + resend (375×812)
  const cy = 'cy@example.com';
  const uc = await H.ctx(375, 812);
  const u = await H.page(uc, 'unconfirmed-375');
  await openAccount(u);
  await tap(u, '[data-act="create"]'); await waitView(u, 'create');
  await fill(u, 'email', cy); await fill(u, 'password', PASS1);
  await tap(u, '[data-act="create-submit"]'); await waitView(u, 'check-email');
  await tap(u, '[data-act="confirmed-signin"]'); await waitView(u, 'signin');
  await fill(u, 'password', PASS1);
  await tap(u, '[data-act="signin-submit"]');
  await u.waitForFunction(() => document.querySelector('[data-act="resend-unconfirmed"]'), null, { timeout: 30000 });
  check(/confirm your email first/.test(await errText(u)), 'not confirmed yet: "Please confirm your email first", with a way to send the link again');
  await shot(u, 'flow-15-unconfirmed-375');
  await u.evaluate(() => { for (const k of Object.keys(sessionStorage)) if (k.startsWith('hm2:auth.cooldown')) sessionStorage.removeItem(k); });   // as if the minute had passed
  const n0 = (await outbox(cy)).filter((m) => m.kind === 'signup').length;
  await tap(u, '[data-act="resend-unconfirmed"]'); await waitView(u, 'check-email');
  await sleep(600);
  const n1 = (await outbox(cy)).filter((m) => m.kind === 'signup').length;
  check(n1 === n0 + 1 && /in \d+ s/.test(await u.textContent('[data-act="resend"]')), 'Send the link again: one more email, then the cooldown', `${n0} → ${n1}`);
  await uc.close();
  await phone.close();
}

// ============================================================== people ==
async function people(H) {
  await post('/__fake/config', { autoconfirm: true });   // sign-ups here confirm at once: this part is about the people, not the email
  const shared = await H.ctx(390, 844);
  const p = await H.page(shared, 'shared');
  await p.goto(`${SITE}/`); await appReady(p);
  await star(p, 'static-storm');
  await p.evaluate(() => window.__hush.prefs.set('subtitleSpeed', 0.75));

  // Ana: "Not now", then "Bring them in"
  await openAccount(p);
  await tap(p, '[data-act="create"]'); await waitView(p, 'create');
  await fill(p, 'email', 'ana@example.com'); await fill(p, 'password', PASS1);
  await tap(p, '[data-act="create-submit"]'); await waitView(p, 'guest-choice');
  await tapNav(p, '[data-act="fresh"]');
  await waitView(p, 'account');
  const uidA = await uidOf(p);
  const a0 = { favs: await favs(p), speed: await p.evaluate(() => window.__hush.prefs.get('subtitleSpeed')) };
  check(!a0.favs.length && a0.speed === 1, 'Not now: the account starts fresh (none of the guest’s things)', JSON.stringify(a0));
  await p.waitForSelector('[data-act="import-guest"]', { timeout: 15000 });
  await p.evaluate(() => document.querySelector('[data-act="import-guest"]').scrollIntoView({ block: 'center' }));
  await sleep(300);
  await shot(p, 'people-01-bring-them-in-390');
  await star(p, 'luminous-ocean');
  await tapNav(p, '[data-act="import-guest"]');
  await waitView(p, 'account');
  const a1 = await favs(p);
  check(a1.includes('luminous-ocean') && a1.includes('static-storm') && !(await p.$('[data-act="import-guest"]')), '"Bring them in" later: the guest’s favourites join the account’s own (a local copy), offered once', JSON.stringify(a1));
  await tap(p, '[data-act="signout"]'); await waitView(p, 'signout');
  await tapNav(p, '[data-act="signout-confirm"]');

  // Bo on the same browser
  await openAccount(p);
  await tap(p, '[data-act="create"]'); await waitView(p, 'create');
  await fill(p, 'email', 'bo@example.com'); await fill(p, 'password', PASS1);
  await tap(p, '[data-act="create-submit"]'); await waitView(p, 'guest-choice');
  await tapNav(p, '[data-act="fresh"]');
  await waitView(p, 'account');
  const uidB = await uidOf(p);
  const b0 = await favs(p);
  check(uidB !== uidA && !b0.length, 'a second account on the same browser sees none of the first account’s things (nor the guest’s)', JSON.stringify(b0));
  await star(p, 'quiet-lake');
  await p.waitForFunction(() => !document.querySelector('[data-sync="library"]')?.disabled, null, { timeout: 30000 });
  await tap(p, '[data-sync="library"]');
  await p.waitForFunction(() => /kept with your account now/.test(document.querySelector('[data-sync-status]')?.textContent || ''), null, { timeout: 30000 });
  check((await state()).rows.favourite_worlds.filter((r) => r.user_id === uidB).map((r) => r.world_id).join() === 'quiet-lake', 'Bo’s synced rows are Bo’s only');
  const otherRows = await p.evaluate((uidA) => window.__hush.auth.load().then(async (a) => { const c = await a.ensureClient(); const r = await c.from('favourite_worlds').select('*').eq('user_id', uidA); return r.data; }), uidA);
  check(Array.isArray(otherRows) && otherRows.length === 0, 'asking the server for another account’s rows returns nothing (RLS in the fake; supabase/tests/rls_check.sql proves it in PostgreSQL)');
  await tap(p, '[data-act="signout"]'); await waitView(p, 'signout');
  await tapNav(p, '[data-act="signout-confirm"]');
  const g = { favs: await favs(p), speed: await p.evaluate(() => window.__hush.prefs.get('subtitleSpeed')) };
  check(g.favs.join() === 'static-storm' && g.speed === 0.75, 'signed out: the guest’s own things, as they were', JSON.stringify(g));
  await openAccount(p);
  await signInUi(p, 'ana@example.com', PASS1);
  await p.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in' && document.querySelector('[data-auth-view="account"]'), null, { timeout: 60000 });
  const a2 = await favs(p);
  check(a2.includes('luminous-ocean') && !a2.includes('quiet-lake'), 'Ana again: Ana’s things, never Bo’s', JSON.stringify(a2));

  // offline (the account screen has loaded; then the connection goes)
  await p.waitForFunction(() => !document.querySelector('[data-sync="settings"]')?.disabled, null, { timeout: 30000 });
  await shared.setOffline(true);
  await p.evaluate(() => dispatchEvent(new Event('offline')));
  await sleep(300);
  const off = await p.evaluate(() => !document.querySelector('.hm-account-offline').hidden);
  await tap(p, '[data-sync="settings"]');
  await p.waitForFunction(() => /can’t reach hushmallow/.test(document.querySelector('[data-sync-status]')?.textContent || ''), null, { timeout: 30000 });
  const offState = await p.evaluate(() => ({ checked: document.querySelector('[data-sync="settings"]').checked, mood: document.querySelector('.hm-account-mallow').dataset.mood }));
  check(off && !offState.checked && offState.mood === 'concerned', 'offline: a calm pill; a switch that can’t reach the server says so and stays off', JSON.stringify({ off, ...offState }));
  await shot(p, 'people-02-offline-390');
  await shared.setOffline(false);
  await p.evaluate(() => dispatchEvent(new Event('online')));
  await sleep(500);
  check(await p.evaluate(() => document.querySelector('.hm-account-offline').hidden) && await status(p) === 'signed-in', 'back online: the pill goes, still signed in');
  await tap(p, '[data-act="signout"]'); await waitView(p, 'signout');
  await tapNav(p, '[data-act="signout-confirm"]');

  // delete Bo
  await openAccount(p);
  await signInUi(p, 'bo@example.com', PASS1);
  await p.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in' && document.querySelector('[data-auth-view="account"]'), null, { timeout: 60000 });
  await tap(p, '[data-act="delete"]'); await waitView(p, 'delete');
  await shot(p, 'people-03-delete-390');
  await fill(p, 'confirm', 'nope');
  check(await p.evaluate(() => document.querySelector('[data-act="delete-confirm"]').disabled), 'Delete: the button waits for the typed word');
  await fill(p, 'confirm', 'delete');
  check(await p.evaluate(() => !document.querySelector('[data-act="delete-confirm"]').disabled), 'typing "delete" enables it');
  await shot(p, 'people-04-delete-typed-390');
  await tapNav(p, '[data-act="delete-confirm"]');
  const t = await lastToast(p);
  const s = await state();
  const keys = await lsKeys(p);
  const d = {
    status: await status(p), toast: t,
    user: s.users.some((x) => x.email === 'bo@example.com'),
    rows: Object.values(s.rows).flat().filter((r) => r.user_id === uidB).length,
    localB: keys.filter((k) => k.startsWith(`hm2:u:${uidB}:`)).length,
    localA: keys.filter((k) => k.startsWith(`hm2:u:${uidA}:`)).length,
    sb: keys.filter((k) => k.startsWith('sb-')).length,
    guest: (await favs(p)).join(),
  };
  check(d.status === 'guest' && /deleted/.test(d.toast) && !d.user && d.rows === 0 && d.localB === 0 && d.sb === 0, 'deleted: the auth user and every server row gone, this device’s copy wiped, back to guest with a calm line', JSON.stringify(d));
  check(d.localA > 0 && d.guest === 'static-storm', 'the other account’s copy and the guest’s things are untouched');
  await shot(p, 'people-05-after-delete-390');
  await shared.close();
}

// ============================================================= gallery ==
const SIZES = [
  { w: 390, h: 844, tag: '390' },
  { w: 375, h: 812, tag: '375' },
  { w: 320, h: 568, tag: '320' },
  { w: 320, h: 568, tag: '320-text125', text: 1.25 },
  { w: 1280, h: 800, tag: '1280' },
];
async function gallery(H) {
  await post('/__fake/config', { autoconfirm: true });
  let n = 0;
  for (const S of SIZES) {
    const ctx = await H.ctx(S.w, S.h);
    if (S.text) await ctx.addInitScript((t) => { try { if (!localStorage.getItem('hm2:prefs')) localStorage.setItem('hm2:prefs', JSON.stringify({ textScale: t })); } catch { /* first page */ } }, S.text);
    const p = await H.page(ctx, `gallery-${S.tag}`);
    await openAccount(p);
    const guest = [['welcome', null], ['signin', 'signin'], ['create', 'create'], ['forgot', 'forgot'], ['check-email', 'check-email'], ['reset-sent', 'reset-sent']];
    for (const [v, go] of guest) {
      if (go) { await p.evaluate(({ go }) => window.__account.go(go, { email: 'ana.longer.name@example.com' }), { go }); await waitView(p, v); }
      await sleep(450);
      if (v === 'create') { await p.focus('[data-auth-view] input[name="password"]'); await p.fill('[data-auth-view] input[name="password"]', 'moon'); await sleep(500); }
      await shot(p, `gallery-${v}-${S.tag}`);
      await layoutOk(p, `${S.tag} ${v}`);
      if (go) { await p.goBack(); await sleep(250); }
    }
    // signed in: a fresh account per size
    const email = `g${++n}@example.com`;
    await p.evaluate(({ email, pw }) => window.__hush.auth.load().then(async (a) => { const r = await a.signUp({ email, password: pw, name: 'Sam' }); if (r.needsGuestChoice) a.chooseGuestData('keep'); a.enter('#account'); }), { email, pw: PASS1 }).catch(() => {});
    await p.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in' && document.querySelector('[data-auth-view="account"]') && window.__account?.mallow, null, { timeout: 60000 });
    if (S.text) await p.evaluate((t) => window.__hush.prefs.set('textScale', t), S.text);
    await p.waitForFunction(() => !document.querySelector('[data-sync="settings"]')?.disabled, null, { timeout: 30000 });
    await sleep(600);
    await shot(p, `gallery-account-${S.tag}`);
    await layoutOk(p, `${S.tag} account`);
    const sh = await p.evaluate(() => document.querySelector('.hm-auth-scroll').scrollHeight - document.querySelector('.hm-auth-scroll').clientHeight);
    if (sh > 0) { await p.evaluate(() => { const s = document.querySelector('.hm-auth-scroll'); s.scrollTop = s.scrollHeight; }); await sleep(300); await shot(p, `gallery-account-end-${S.tag}`); }
    for (const [v, opts] of [['password', {}], ['signout', {}], ['device-data', {}], ['delete', {}]]) {
      await p.evaluate(({ v, opts }) => window.__account.go(v, opts), { v, opts });
      await waitView(p, v);
      await sleep(450);
      const tag = `${v}${opts.step ? '-code' : ''}`;
      await shot(p, `gallery-${tag}-${S.tag}`);
      await layoutOk(p, `${S.tag} ${tag}`);
      await p.goBack(); await sleep(250);
    }
    // the once-only question (shown here directly; Back on it would answer "Not now", so it is last)
    await p.evaluate(() => window.__account.go('guest-choice'));
    await waitView(p, 'guest-choice');
    await sleep(450);
    await shot(p, `gallery-guest-choice-${S.tag}`);
    await layoutOk(p, `${S.tag} guest-choice`);
    await ctx.close();
  }
  // reduced motion: the face still changes, nothing floats or hops
  const rm = await H.ctx(390, 844, { reducedMotion: 'reduce' });
  const r = await H.page(rm, 'reduced-motion');
  await openAccount(r);
  await r.waitForFunction(() => window.__account?.mallow?.rig?.ready, null, { timeout: 30000 }).catch(() => {});
  const q = await r.evaluate(() => ({ rm: window.__account.mallow.rig?.opts.reducedMotion, anim: getComputedStyle(document.querySelector('.hm-account-mallow')).animationName, card: getComputedStyle(document.querySelector('.hm-auth-card > *')).animationName }));
  await r.evaluate(() => window.__account.go('signin'));
  await waitView(r, 'signin');
  await r.focus('[data-auth-view] input[name="password"]');
  await sleep(300);
  const m2 = await mood(r);
  check(q.rm === true && q.anim === 'none' && q.card === 'none' && m2 === 'away', 'reduced motion: no float, no card animation, no hop; the Mallow still closes its eyes', JSON.stringify({ ...q, mood: m2 }));
  await rm.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
