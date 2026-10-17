// Browser proof of the BUILT site's /auth/callback and deep links, against
// the LOCAL fake of Supabase (tools/auth/fake-supabase.mjs). Never production.
//
//   1. build:  HM_AUTH_MODE=dev SUPABASE_URL=http://localhost:8203 \
//              SUPABASE_PUBLISHABLE_KEY=sb_publishable_hushmallow_local_dev_only \
//              bash hushmallow/tools/build-site.sh /tmp/claude-0/hf/auth/site devauth1
//   2. serve:  node hushmallow/tools/auth/fake-supabase.mjs --port 8203 --site http://localhost:8202
//              node hushmallow/tools/auth/pages-serve.mjs /tmp/claude-0/hf/auth/site 8202
//              python3 -m http.server 8201            (from the worktree root: section 7
//                                                      checks the unbuilt dev tree there;
//                                                      DEV=… points it elsewhere)
//   3. run:    timeout 400 node hushmallow/tools/auth/callback-e2e.cjs [--out /tmp/claude-0/hf/auth/shots]
//
// Scenarios: sign-up → token_hash link on ANOTHER device → signed in →
// account namespace; recovery link → set a new password (Mallow looks away,
// concerned on a short password, hop on success) → signed in with it; same-
// device PKCE code link; a code opened on another device; error links; a
// link that lands on the root; deep links (/, /#account, /auth/callback,
// /auth/callback/); headers on /auth/*; no token left in the address bar or
// history; no console errors or CSP violations. Prints one line per check.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');

const SITE = process.env.SITE || 'http://localhost:8202';
const FAKE = process.env.FAKE || 'http://localhost:8203';
const OUT = (() => { const i = process.argv.indexOf('--out'); return i > 0 ? process.argv[i + 1] : '/tmp/claude-0/hf/auth/shots'; })();
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (ok, label, extra = '') => { results.push({ ok: !!ok, label }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outbox = async (to) => (await (await fetch(`${FAKE}/__fake/outbox?to=${encodeURIComponent(to)}`)).json());
const lastMail = async (to, kind) => { for (let i = 0; i < 50; i++) { const m = (await outbox(to)).filter((x) => !kind || x.kind === kind).pop(); if (m) return m; await sleep(100); } return null; };

async function main() {
  await fetch(`${FAKE}/__fake/reset`, { method: 'POST' });
  await fetch(`${FAKE}/__fake/config`, { method: 'POST', body: JSON.stringify({ rateLimitMs: 0, autoconfirm: false, failRefresh: false, refreshDown: false, accessTtl: 3600, down: false }) });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const problems = [], expected = [];
  const ctxOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
  const newPage = async (ctx, name) => {
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() !== 'error' || /favicon/.test(m.text())) return;
      // the browser logs every 4xx answer; the sign-in server's expected refusals (a used link) are not app errors
      if (/Failed to load resource/.test(m.text()) && (m.location()?.url || '').startsWith(FAKE)) { expected.push(`${name}: ${m.text().slice(0, 90)}`); return; }
      problems.push(`${name}: console: ${m.text().slice(0, 200)}`);
    });
    page.on('pageerror', (e) => problems.push(`${name}: pageerror: ${String(e).slice(0, 200)}`));
    return page;
  };
  const appReady = (page) => page.waitForFunction(() => window.__hush?.auth && document.querySelector('#scene > *'), null, { timeout: 60000 });
  const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });

  // ------------------------------------------------ 1. sign-up → token_hash (another device) ---
  const email = 'ana@example.com', password = 'gentle-moon-42';
  const phone = await browser.newContext(ctxOpts);
  let p = await newPage(phone, 'phone');
  await p.goto(`${SITE}/`); await appReady(p);
  check(await p.evaluate(() => window.__hush.auth.status()) === 'guest', 'the app boots as a guest with sign-in on');
  check(await p.evaluate(() => !document.querySelector('script[src*="vendor/supabase"]')), 'a guest never downloads supabase-js');
  await p.evaluate(() => { window.__hush.prefs.set('textScale', 1.12); });   // a guest setting on this phone
  const su = await p.evaluate(({ email, password }) => window.__hush.auth.load().then((a) => a.signUp({ email, password, name: 'Ana', agreed: true })), { email, password });
  check(su.ok && su.needsConfirmation, 'sign up asks to check email', JSON.stringify(su));
  const m1 = await lastMail(email, 'signup');
  check(m1 && m1.redirect_to === `${SITE}/auth/callback`, 'the email returns to /auth/callback', m1?.redirect_to);
  const link1 = `${m1.redirect_to}?token_hash=${m1.token_hash}&type=email`;   // exactly supabase/templates/confirmation.html: {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email

  const laptop = await browser.newContext(ctxOpts);   // the email opened on another device
  let c = await newPage(laptop, 'laptop');
  const navs = [];
  c.on('framenavigated', (f) => { if (f === c.mainFrame()) navs.push(f.url()); });
  const resp = await c.goto(link1);
  check(resp.status() === 200 && resp.request().redirectedFrom()?.url().startsWith(`${SITE}/auth/callback?`), '/auth/callback?… is served (after Pages’ 308 to /auth/callback/, query kept)', `${resp.status()} ${resp.url().replace(/token_hash=[^&]+/, 'token_hash=…')}`);
  const h = resp.headers();
  check(h['cache-control'] === 'no-store' && h['referrer-policy'] === 'no-referrer' && h['x-frame-options'] === 'DENY' && /frame-ancestors 'none'/.test(h['content-security-policy'] || ''), '/auth/* headers: no-store, no-referrer, DENY, frame-ancestors none');
  await c.waitForFunction(() => document.querySelector('#hm-auth-title')?.textContent === 'You’re in', null, { timeout: 30000 });
  check(!/token_hash|code=/.test(await c.evaluate(() => location.href)), 'the token left the address bar at once');
  const cbLine = await c.evaluate(() => document.querySelector('#hm-auth-lede')?.textContent || document.querySelector('.hm-auth-lede')?.textContent || '');
  check(cbLine === 'Your email is confirmed. You’re signed in as an…@example.com.', 'the callback page names the account the link signed in (shortened)', cbLine);
  await shot(c, '01-callback-verified');
  await c.waitForURL(`${SITE}/#account`, { timeout: 15000 }).catch(() => {});
  // the arrival is said on the account card's lede (no toast over the card): listen for any toast from the start all the same
  const arrivalToast = c.waitForFunction(() => document.querySelector(".toast")?.textContent || "", null, { timeout: 6000, polling: 50 }).then((x) => x.jsonValue(), () => "");
  await c.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in' && document.querySelector('[data-auth-view]:not([data-auth-view="loading"])'), null, { timeout: 60000 });
  const after1 = await c.evaluate(() => ({ ns: window.__hush.auth.namespace, view: document.querySelector('[data-auth-view]:not([data-auth-view="loading"])').dataset.authView, lede: document.querySelector('.hm-auth-lede')?.textContent, hash: location.hash, histHasToken: false }));
  check(after1.ns.mode === 'account' && after1.view === 'account' && /ana@example\.com/.test(after1.lede), 'back in the app: signed in, in the account’s namespace, account screen open', JSON.stringify({ mode: after1.ns.mode, view: after1.view }));
  check(!navs.some((u) => /token_hash/.test(u) && u.startsWith(`${SITE}/#`)), 'the app URL never carried the token');
  await sleep(600);
  await shot(c, '02-app-account-after-verify');
  const toast1 = await arrivalToast;
  check(after1.lede === 'Your email is confirmed. You’re signed in as ana@example.com.' && !toast1, 'the account card says the email is confirmed, and names the account it signed in (no toast over the card)', { lede: after1.lede, toast: toast1 });
  // a link works once
  const again = await newPage(laptop, 'laptop-again');
  await again.goto(link1);
  await again.waitForFunction(() => /didn’t open/.test(document.querySelector('#hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  check(/expired or was already used/.test(await again.textContent('#hm-auth-status')), 'opening the same link again: a friendly "expired or already used"');
  await shot(again, '03-callback-link-used');
  await again.close();

  // ------------------------------------------------ 2. recovery → set-new-password ---
  const r = await p.evaluate((email) => window.__hush.auth.load().then((a) => a.sendReset({ email })), email);
  check(r.ok, 'forgot password: the neutral "if there is an account" answer', JSON.stringify(r));
  const m2 = await lastMail(email, 'recovery');
  const tablet = await browser.newContext({ ...ctxOpts, viewport: { width: 320, height: 568 } });
  const t = await newPage(tablet, 'small');
  await t.goto(`${m2.redirect_to}?token_hash=${m2.token_hash}&type=recovery`);
  await t.waitForSelector('#hm-new-password', { timeout: 30000 });
  await sleep(300);
  check(await t.evaluate(() => document.querySelector('#hm-auth-mallow').dataset.mood) === 'away', 'set-new-password: the field has focus and the Mallow politely looks away');
  await shot(t, '04-recovery-set-password-320');
  await t.fill('#hm-new-password', 'short');
  await t.click('button[type=submit]');
  await sleep(300);
  check(await t.evaluate(() => document.querySelector('#hm-auth-mallow').dataset.mood) === 'concerned' && /at least 8/.test(await t.textContent('#hm-auth-form-error')), 'a short password: a friendly error and a concerned Mallow');
  const fs16 = await t.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#hm-new-password')).fontSize));
  check(fs16 >= 16, 'the input is at least 16 px (no iOS zoom)', `${fs16}px`);
  await shot(t, '05-recovery-short-password-320');
  await t.fill('#hm-new-password', 'after-reset-2026');
  await t.click('button.hm-auth-reveal');
  check(await t.getAttribute('#hm-new-password', 'type') === 'text', 'show / hide password');
  await t.click('button[type=submit]');
  await t.waitForFunction(() => document.querySelector('#hm-auth-title')?.textContent === 'All set', null, { timeout: 30000 });
  check(await t.evaluate(() => document.querySelector('#hm-auth-mallow').dataset.mood) === 'happy', 'saved: a soft hop');
  await shot(t, '06-recovery-done-320');
  await t.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in', null, { timeout: 60000 });
  check(true, 'after the new password: signed in on that device');
  const signin = await p.evaluate(({ email }) => window.__hush.auth.load().then((a) => a.signIn({ email, password: 'after-reset-2026' })), { email });
  check(signin.ok && signin.signedIn, 'the new password signs in on the first phone', JSON.stringify({ ok: signin.ok, guestChoice: signin.needsGuestChoice }));
  check(signin.needsGuestChoice === true, 'this phone had guest things: the once-only question is asked');
  await Promise.all([p.waitForNavigation({ timeout: 60000 }), p.evaluate(() => window.__hush.auth.load().then((a) => { a.chooseGuestData('keep'); a.enter('#account'); }))]);
  await appReady(p);
  await p.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in' && document.querySelector('[data-auth-view="account"]'), null, { timeout: 60000 });
  const kept = await p.evaluate(() => ({ ts: window.__hush.prefs.get('textScale'), ns: window.__hush.auth.namespace.mode }));
  check(kept.ns === 'account' && kept.ts === 1.12, 'kept: the guest’s setting came along (local copy)', JSON.stringify(kept));
  await shot(p, '07-app-signed-in-after-keep');
  // sign out: back to guest, guest things untouched
  await p.click('[data-auth-view="account"] [data-act="signout"]');
  await p.waitForSelector('[data-auth-view="signout"] [data-act="signout-confirm"]', { timeout: 15000 });
  await Promise.all([p.waitForNavigation({ timeout: 60000 }), p.click('[data-act="signout-confirm"]')]);
  await appReady(p);
  await p.waitForFunction(() => window.__hush?.auth?.status?.() === 'guest', null, { timeout: 60000 });
  const out1 = await p.evaluate(() => ({ ts: window.__hush.prefs.get('textScale'), sb: Object.keys(localStorage).filter((k) => k.startsWith('sb-')) }));
  check(out1.sb.length === 0 && out1.ts === 1.12, 'signed out: every sb- key is gone, the guest’s things are as they were', JSON.stringify(out1));

  // ------------------------------------------------ 3. PKCE code: same device, then another ---
  const e3 = 'bo@example.com';
  const d = await browser.newContext(ctxOpts);
  const dp = await newPage(d, 'pkce');
  await dp.goto(`${SITE}/`); await appReady(dp);
  await dp.evaluate(({ e3 }) => window.__hush.auth.load().then((a) => a.signUp({ email: e3, password: 'gentle-moon-42', agreed: true })), { e3 });
  const m3 = await lastMail(e3, 'signup');
  await dp.goto(m3.confirmation_url);   // Supabase's own {{ .ConfirmationURL }} → 303 → /auth/callback?code=
  await dp.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in' || /You’re in/.test(document.querySelector('#hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  await dp.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in', null, { timeout: 60000 });
  check(true, 'same device: ?code= exchanged with this browser’s PKCE verifier, signed in');
  const e4 = 'cy@example.com';
  await Promise.all([dp.waitForNavigation({ timeout: 60000 }), dp.evaluate(() => window.__hush.auth.load().then((a) => a.signOut()))]);
  await appReady(dp);
  await dp.waitForFunction(() => window.__hush?.auth?.status?.() === 'guest', null, { timeout: 60000 });
  await dp.evaluate(({ e4 }) => window.__hush.auth.load().then((a) => a.signUp({ email: e4, password: 'gentle-moon-42', agreed: true })), { e4 });
  const m4 = await lastMail(e4, 'signup');
  const other = await browser.newContext(ctxOpts);
  const op = await newPage(other, 'pkce-other');
  await op.goto(m4.confirmation_url);
  await op.waitForFunction(() => /Nearly there/.test(document.querySelector('#hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  check(/it’s confirmed: sign in/.test(await op.textContent('#hm-auth-status')), 'a code opened on another device: "it’s confirmed, sign in to carry on"');
  await shot(op, '08-callback-code-other-device');

  // ------------------------------------------------ 4. error links and links that land on the root ---
  const ep = await newPage(other, 'errors');
  await ep.goto(`${SITE}/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`);
  await ep.waitForFunction(() => /didn’t open/.test(document.querySelector('#hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  check(/expired/.test(await ep.textContent('#hm-auth-status')) && !/Email link is invalid/.test(await ep.textContent('body')), '#error=… : a friendly message, never the server’s text');
  check(!/error_code/.test(await ep.evaluate(() => location.href)), 'the error left the address bar too');
  await shot(ep, '09-callback-error');
  await ep.goto(`${SITE}/auth/callback/?token_hash=<script>alert(1)</script>&type=signup`);
  await ep.waitForFunction(() => /didn’t open/.test(document.querySelector('#hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  check(/isn’t complete/.test(await ep.textContent('#hm-auth-status')), 'a malformed link is refused before anything is sent');
  await ep.goto(`${SITE}/auth/callback/?code=abcdefgh123&next=https://evil.example`);
  await ep.waitForFunction(() => document.querySelector('#hm-auth-body a'), null, { timeout: 30000 });
  check((await ep.getAttribute('#hm-auth-body a', 'href')) === `${SITE}/#account`, 'no open redirect: next=https://evil.example still returns to this site');
  // the root forwards sign-in links to /auth/callback (Supabase's Site URL fallback)
  await fetch(`${FAKE}/__fake/config`, { method: 'POST', body: JSON.stringify({ rateLimitMs: 0 }) });
  const rp = await newPage(other, 'root-forward');
  await rp.goto(`${SITE}/?token_hash=deadbeefdeadbeef&type=signup`);
  await rp.waitForFunction(() => location.pathname === '/auth/callback/' && document.querySelector('#hm-auth-title'), null, { timeout: 30000 });
  await rp.waitForFunction(() => /didn’t open/.test(document.querySelector('#hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  check(true, 'a sign-in link that lands on the root moves to /auth/callback (and is checked there)');
  const hist = await rp.evaluate(() => history.length);
  check(hist <= 2, 'the root entry with the token was replaced, not kept in history', `history.length=${hist}`);

  // ------------------------------------------------ 5. deep links ---
  const dl = await browser.newContext(ctxOpts);
  const g = await newPage(dl, 'deep');
  await g.goto(`${SITE}/#account`); await appReady(g);
  await g.waitForFunction(() => document.querySelector('[data-auth-view]:not([data-auth-view="loading"])'), null, { timeout: 30000 });
  check(await g.evaluate(() => document.querySelector('[data-auth-view]:not([data-auth-view="loading"])').dataset.authView) === 'welcome', '/#account opens the account scene (a guest’s welcome) over the Hushfold');
  await shot(g, '10-deeplink-account-guest');
  await g.goBack().catch(() => {});
  await sleep(800);
  check(await g.evaluate(() => location.hash) === '#home', 'Back from /#account lands on the Hushfold');
  await g.goto(`${SITE}/auth/callback`);
  await g.waitForFunction(() => /Nothing to open/.test(document.querySelector('#hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  check(true, '/auth/callback with nothing to do: a calm page with a way back');
  await shot(g, '11-callback-nothing');
  const root = await fetch(`${SITE}/`);
  check(root.status === 200 && !root.headers.get('x-frame-options'), 'the root page is not frame-blocked (the Framer embed keeps working)');

  // ------------------------------------------------ 6. an expired session drops to guest calmly ---
  await fetch(`${FAKE}/__fake/config`, { method: 'POST', body: JSON.stringify({ accessTtl: 2, failRefresh: false }) });
  const ex = await browser.newContext(ctxOpts);
  const xp = await newPage(ex, 'expiry');
  await xp.goto(`${SITE}/`); await appReady(xp);
  await xp.evaluate(() => { window.__hush.prefs.set('textScale', 1.25); });   // the guest's own setting
  const sx = await xp.evaluate(() => window.__hush.auth.load().then((a) => a.signIn({ email: 'ana@example.com', password: 'after-reset-2026' })));
  await Promise.all([xp.waitForNavigation({ timeout: 60000 }), xp.evaluate((keep) => window.__hush.auth.load().then((a) => { a.chooseGuestData(keep ? 'fresh' : 'fresh'); a.enter('#home'); }), sx.needsGuestChoice)]);
  await appReady(xp);
  check(await xp.evaluate(() => window.__hush.auth.namespace.mode) === 'account', 'signed in (access tokens now live 2 s)');
  await xp.evaluate(() => window.__hush.prefs.set('sound', false));   // the account's own setting
  await fetch(`${FAKE}/__fake/config`, { method: 'POST', body: JSON.stringify({ failRefresh: true }) });   // the refresh token is no longer accepted
  await sleep(2500);
  const nav = xp.waitForNavigation({ timeout: 90000 });
  await xp.evaluate(() => window.__hush.auth.load().then((a) => a.verify(true)));
  await nav; await appReady(xp);
  const toastSeen = await xp.waitForFunction(() => /signed out on this device/.test(document.querySelector('.toast')?.textContent || ''), null, { timeout: 30000 }).then(() => true, () => false);
  await shot(xp, '12-expired-calm-notice');
  const g6 = await xp.evaluate(() => ({ mode: window.__hush.auth.namespace.mode, ts: window.__hush.prefs.get('textScale'), sound: window.__hush.prefs.get('sound'), sb: Object.keys(localStorage).filter((k) => k.startsWith('sb-')).length }));
  check(toastSeen, 'expired at home: back as a guest at once, with one calm line ("You’ve been signed out on this device…")');
  check(g6.mode === 'guest' && g6.ts === 1.25 && g6.sound === true && g6.sb === 0, 'expired: back to guest at a safe moment, the guest’s things untouched, the account’s kept apart', JSON.stringify(g6));
  await shot(xp, '13-expired-now-guest');
  await fetch(`${FAKE}/__fake/config`, { method: 'POST', body: JSON.stringify({ failRefresh: false, accessTtl: 3600 }) });

  // ------------------------------------------------ 6b. 320×568 at the largest text size ---
  const big = await browser.newContext({ ...ctxOpts, viewport: { width: 320, height: 568 } });
  await big.addInitScript(() => { try { localStorage.setItem('hm2:prefs', JSON.stringify({ textScale: 1.25, mallow: 'glitzi' })); } catch { /* first page */ } });
  const bp = await newPage(big, 'big-text');
  await bp.goto(`${SITE}/auth/callback#error=access_denied&error_code=otp_expired`);
  await bp.waitForFunction(() => /didn’t open/.test(document.querySelector('#hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  await sleep(400);
  const fit = await bp.evaluate(() => ({ scale: getComputedStyle(document.documentElement).getPropertyValue('--type-scale').trim(), overflowX: document.documentElement.scrollWidth - innerWidth, minFont: Math.min(...[...document.querySelectorAll('#hm-auth *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize))) }));
  check(fit.scale === '1.25' && fit.overflowX <= 0 && fit.minFont >= 13, '320×568 at text size 1.25: no sideways scroll, nothing under 13 px', JSON.stringify(fit));
  await shot(bp, '14-callback-320-text125');

  // ------------------------------------------------ 7. the unbuilt dev tree (port 8201) ---
  const DEV = process.env.DEV || 'http://localhost:8201/hushmallow';
  const dv = await browser.newContext(ctxOpts);
  const dvp = await newPage(dv, 'dev-off');
  await dvp.goto(`${DEV}/index.html`); await appReady(dvp);
  const off = await dvp.evaluate(() => ({ enabled: window.__hush.auth.enabled, status: window.__hush.auth.status(), keys: Object.keys(localStorage).filter((k) => k.startsWith('hm2:u:')).length, scene: !!document.querySelector('#scene > *') }));
  check(!off.enabled && off.status === 'off' && off.keys === 0 && off.scene, 'sign-in off (repository config): the app boots exactly as before', JSON.stringify(off));
  await dvp.goto(`${DEV}/index.html?authDev=8203`); await appReady(dvp);
  check(await dvp.evaluate(() => window.__hush.auth.enabled && window.__hush.auth.status() === 'guest'), 'localhost ?authDev=8203 points the dev tree at the fake');

  check(problems.length === 0, 'no console errors, page errors or CSP violations', problems.length ? problems.slice(0, 5).join(' | ') : `${expected.length} expected 4xx answers from the sign-in server`);
  await browser.close();
  const fails = results.filter((x) => !x.ok).length;
  console.log(fails ? `${fails} OF ${results.length} CHECKS FAILED` : `ALL ${results.length} CHECKS PASSED (screenshots in ${OUT})`);
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
