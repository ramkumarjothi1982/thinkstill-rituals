// Browser proof of the round-1 review fixes on the BUILT site, against the
// LOCAL fake of Supabase (tools/auth/fake-supabase.mjs). Never production;
// this is not Supabase itself (the CI job on a local Supabase stack is).
//
//   build + serve exactly as tools/auth/callback-e2e.cjs says (site on 8202,
//   fake on 8203), then:
//   timeout 400 node hushmallow/tools/auth/fixes-e2e.cjs [--out DIR]
//
// guestkeys   coordinator decision 3: a snapshot of today's guest keys
//             (tests/helpers/guest-snapshot.mjs) boots in the real app as a
//             guest, then sign in → "Not now" → the account → sign out: every
//             guest key byte-identical and unmoved, before and after.
// mallow      decision 4: Delete account tapped right after arriving signed in
//             (the arrival smile and the "You're signed in." notice still
//             playing): the Mallow is concerned from the very first frames
//             (data-mood, the rig's mouth, no reaction left), in full and in
//             reduced motion, at 390×844 and 320×568; the notice has gone.
//             Remove this phone's data the same.
// shared      B's reset link opened in a second tab while A is signed in on
//             this browser: B's new password is saved, A's session ends on the
//             server, the first tab moves out of A's namespace, A's things stay A's.
// deleterace  delete account while a sync is mid-pull (the fake holds the
//             request): nothing of the deleted account is left on the device.
// Prints one line per check; screenshots in --out (default /tmp/claude-0/hf/auth/fixes).
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const { pathToFileURL } = require('url');
const path = require('path');

const SITE = process.env.SITE || 'http://localhost:8202';
const FAKE = process.env.FAKE || 'http://localhost:8203';
const KEY = 'sb_publishable_hushmallow_local_dev_only';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', '/tmp/claude-0/hf/auth/fixes');
const ONLY = arg('--part', null);
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (ok, label, extra = '') => { results.push({ ok: !!ok, label }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  (${String(extra).slice(0, 400)})` : ''}`); return !!ok; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (p, body) => fetch(`${FAKE}${p}`, { method: 'POST', body: JSON.stringify(body || {}) }).then((r) => r.json());
const state = () => fetch(`${FAKE}/__fake/state`).then((r) => r.json());
const outbox = (to) => fetch(`${FAKE}/__fake/outbox?to=${encodeURIComponent(to)}`).then((r) => r.json());
async function mail(to, kind, after = 0) {
  for (let i = 0; i < 60; i++) { const m = (await outbox(to)).filter((x) => x.kind === kind && x.at > after).pop(); if (m) return m; await sleep(100); }
  return null;
}
async function api(p, body, token) {
  const r = await fetch(`${FAKE}${p}`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body || {}) });
  return { status: r.status, json: await r.json().catch(() => null) };
}
async function canSignIn(email, password) {
  const r = await api('/auth/v1/token?grant_type=password', { email, password });
  if (r.json?.access_token) await api('/auth/v1/logout?scope=local', {}, r.json.access_token);
  return r.status;
}
async function makeAccount(email, password) {
  await post('/__fake/config', { autoconfirm: true });
  const r = await api('/auth/v1/signup', { email, password });
  await post('/__fake/config', { autoconfirm: false });
  if (r.json?.access_token) await api('/auth/v1/logout?scope=local', {}, r.json.access_token);
  return r.json?.user?.id || null;
}

let VER = null, loads = 0;
const appReady = (p) => p.waitForFunction(() => window.__hush?.auth && document.querySelector('#scene > *'), null, { timeout: 60000 });
const viewOf = (p) => p.evaluate(() => document.querySelector('[data-auth-view]')?.dataset.authView || null);
async function waitView(p, v, timeout = 30000) { await p.waitForFunction((v) => document.querySelector(`[data-auth-view="${v}"]`) && window.__account?.mallow, v, { timeout }); }
async function openAccount(p) { await p.goto(`${SITE}/?n=${++loads}#account`); await appReady(p); await p.waitForFunction(() => document.querySelector('[data-auth-view]') && window.__account?.mallow, null, { timeout: 60000 }); }
async function fill(p, name, value) { const s = `[data-auth-view] input[name="${name}"]`; await p.waitForSelector(s, { timeout: 15000 }); await p.fill(s, value); }
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` });
const status = (p) => p.evaluate(() => window.__hush.auth.status());
const uidOf = (p) => p.evaluate(() => window.__hush.auth.namespace.uid || null);
const guestKeys = (p) => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('hm2:') && !k.startsWith('hm2:u:')).sort().map((k) => [k, localStorage.getItem(k)])));
async function tap(p, selector) {
  const el = await p.waitForSelector(selector, { state: 'visible', timeout: 30000 });
  await el.scrollIntoViewIfNeeded();
  let b = await el.boundingBox();
  for (let i = 0; i < 12; i++) { await sleep(60); const c = await el.boundingBox(); if (c && Math.abs(c.y - b.y) < 0.5 && Math.abs(c.x - b.x) < 0.5) break; b = c; }
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  p.__cdp ||= await p.context().newCDPSession(p);
  await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  await sleep(30);
  await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function tapNav(p, selector) { await Promise.all([p.waitForNavigation({ timeout: 60000 }), tap(p, selector)]); await appReady(p); }
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

// ============================================================ guestkeys ==
async function guestkeys(H) {
  const { todayGuestKeys, APP_REWRITES } = await import(pathToFileURL(path.join(__dirname, '../../tests/helpers/guest-snapshot.mjs')).href);
  const email = 'gwen@example.com', pw = 'gentle-moon-42';
  await makeAccount(email, pw);
  const ctx = await H.ctx(390, 844);
  const p = await H.page(ctx, 'guestkeys');
  const snap = todayGuestKeys(Date.now());
  await p.goto(`${SITE}/version.json`);
  await p.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, snap);
  await p.goto(`${SITE}/`); await appReady(p);
  await sleep(3000);
  const want = Object.fromEntries(Object.entries(snap).sort());
  // the phone's own keys (src/auth/namespace.js DEVICE_KEYS) are shared by whoever uses it: hm2:sound / hm2:haptics
  // mirror the current person's settings and are re-mirrored from the guest's hm2:prefs at the guest's next boot
  const DEVICE = ['hm2:entitlement', 'hm2:beyond.device', 'hm2:beyond.session', 'hm2:beyond.invite', 'hm2:sound', 'hm2:haptics'];
  const same = (got, label, { device = true } = {}) => {
    const diff = Object.keys({ ...want, ...got }).filter((k) => (!device && DEVICE.includes(k) ? false : APP_REWRITES.includes(k) ? !(k in got) : got[k] !== want[k]));
    const extra = Object.keys(got).filter((k) => !(k in want));
    return check(!diff.length && !extra.length, label, JSON.stringify({ changed: diff, added: extra }));
  };
  const reads = await p.evaluate((ver) => Promise.all([import(`/v/${ver}/src/engine/flow-store.js`), import(`/v/${ver}/src/engine/garden.js`), import(`/v/${ver}/src/beyond/consent.js`)]).then(([f, g, c]) => ({ favs: f.favouriteWorlds(window.__hush.store), garden: Object.keys(g.readGarden(window.__hush.store).skills), consent: c.consentState(window.__hush.store), textScale: window.__hush.prefs.get('textScale'), motion: window.__hush.prefs.get('motion'), tier: window.__hush.ent?.tier?.() ?? null, status: window.__hush.auth.status() })), VER);
  check(reads.status === 'guest' && reads.favs.join() === 'static-storm,luminous-ocean' && reads.garden.join() === 'slowing-down' && reads.consent === 'yes' && reads.textScale === 1.25 && reads.motion === 'reduced', 'today’s guest keys boot in the real app (sign-in on): favourites, garden, Another Angle consent and settings read as before', JSON.stringify(reads));
  same(await guestKeys(p), 'after boot: every guest key byte-identical, nothing moved or added (hushfold.lines: present; the Hushfold itself rewrites it)');
  await shot(p, 'guestkeys-01-guest-390');
  await openAccount(p);
  const r = await signInUi(p, email, pw);
  check(r === 'choice', 'sign in: the once-only question about this phone’s guest things', r);
  same(await guestKeys(p), 'signed in, before answering: the guest keys are untouched');
  await tapNav(p, '[data-act="fresh"]');
  await waitView(p, 'account');
  const acc = await p.evaluate((ver) => import(`/v/${ver}/src/engine/flow-store.js`).then((f) => ({ favs: f.favouriteWorlds(window.__hush.store), textScale: window.__hush.prefs.get('textScale'), ns: window.__hush.auth.namespace.mode })), VER);
  check(acc.ns === 'account' && acc.favs.length === 0 && acc.textScale === 1, '“Not now”: the account starts fresh, none of the guest’s things', JSON.stringify(acc));
  await p.evaluate(() => window.__hush.prefs.set('textScale', 1.12));   // the account uses the app
  same(await guestKeys(p), 'in the account: the guest’s own keys are untouched (the phone’s sound / haptics switches follow the person using it)', { device: false });
  const mirror = await p.evaluate(() => localStorage.getItem('hm2:sound'));
  check(mirror === JSON.stringify({ enabled: true, volume: 0.6 }), 'in the account, hm2:sound mirrors the account’s own settings (as today’s app mirrors prefs)', mirror);
  await tap(p, '[data-act="signout"]'); await waitView(p, 'signout');
  await tapNav(p, '[data-act="signout-confirm"]');
  await sleep(2500);
  check(await status(p) === 'guest', 'signed out: a guest again');
  same(await guestKeys(p), 'after sign-in → “Not now” → sign-out: every guest key byte-identical and unmoved');
  const back = await p.evaluate((ver) => import(`/v/${ver}/src/engine/flow-store.js`).then((f) => ({ favs: f.favouriteWorlds(window.__hush.store), textScale: window.__hush.prefs.get('textScale') })), VER);
  check(back.favs.join() === 'static-storm,luminous-ocean' && back.textScale === 1.25, 'and the app reads them exactly as before', JSON.stringify(back));
  await shot(p, 'guestkeys-02-guest-again-390');
  await ctx.close();
}

// =============================================================== mallow ==
/** The rig's face on the next few animation frames: [{ t, mood, smile, overlays }]. */
const faceFrames = (p, n = 8) => p.evaluate((n) => new Promise((done) => {
  const out = [];
  const t0 = performance.now();
  const step = () => {
    const m = window.__account?.mallow;
    out.push({ t: Math.round(performance.now() - t0), mood: document.querySelector('.hm-account-mallow')?.dataset.mood, view: document.querySelector('[data-auth-view]')?.dataset.authView, smile: m?.rig?.val ? +m.rig.val.mouthSmile.toFixed(3) : null, overlays: (m?.rig?.overlays || []).map((o) => o.kind) });
    if (out.length >= n) done(out); else requestAnimationFrame(step);
  };
  step();
}), n);

async function mallow(H) {
  const email = 'mo@example.com', pw = 'gentle-moon-42';
  await makeAccount(email, pw);
  for (const [w, h, motion] of [[390, 844, 'full'], [390, 844, 'reduced'], [320, 568, 'full'], [320, 568, 'reduced']]) {
    const tag = `${w}-${motion}`;
    const ctx = await H.ctx(w, h);
    const p = await H.page(ctx, `mallow-${tag}`);
    await p.goto(`${SITE}/version.json`);
    await p.evaluate((motion) => { localStorage.clear(); localStorage.setItem('hm2:prefs', JSON.stringify({ motion, seenIntro: true })); }, motion);
    await openAccount(p);
    const r = await signInUi(p, email, pw);
    if (r === 'choice') await tapNav(p, '[data-act="fresh"]');
    // the reload into the account: "You're signed in." and the arrival smile (450 ms in)
    await waitView(p, 'account');
    await p.waitForFunction(() => window.__account?.mallow?.rig?.ready, null, { timeout: 30000 }).catch(() => {});
    const arrivedAt = Date.now();
    // the arrival hop (mood 'happy' 450 ms in): wait until its reaction is actually playing, as in the review
    let playing = await p.waitForFunction(() => (window.__account?.mallow?.rig?.overlays || []).length > 0, null, { timeout: 2500, polling: 10 }).then(() => true, () => false);
    if (!playing) { await p.evaluate(() => window.__account.mallow.mood('happy')); playing = 'forced'; }
    await sleep(60);
    const happyAt = Date.now() - arrivedAt;
    const before = (await faceFrames(p, 1))[0];
    await tap(p, '[data-act="delete"]');
    const frames = await faceFrames(p, 10);
    const first = frames.find((f) => f.view === 'delete') || frames[0];
    const allDelete = frames.filter((f) => f.view === 'delete');
    const ok = allDelete.length >= 5 && allDelete.every((f) => f.mood === 'concerned' && (f.smile == null || f.smile <= 0) && !f.overlays.length);
    check(ok && before.overlays.length > 0 && before.smile > 0.3, `${tag}: Delete tapped ${happyAt} ms after arriving, while the arrival reaction plays (${before.overlays.join()}, smile ${before.smile}${playing === 'forced' ? ', started by the check' : ''}): concerned from the first frame, no smile, no reaction left`, JSON.stringify(allDelete.slice(0, 4)));
    await sleep(30);
    await shot(p, `mallow-01-quick-delete-${tag}`);
    const toastGone = await p.waitForFunction(() => !document.querySelector('body > .toast') || getComputedStyle(document.querySelector('body > .toast')).opacity === '0', null, { timeout: 1500 }).then(() => true, () => false);
    check(toastGone, `${tag}: the "You’re signed in." notice fades as the person moves on (it covers nothing on Delete)`);
    // typing the word keeps it sombre; the word stands out
    await fill(p, 'confirm', 'delete');
    await sleep(200);
    const typed = (await faceFrames(p, 3)).at(-1);
    const word = await p.evaluate(() => { const s = document.querySelector('[data-field="confirm"] label strong'); return s ? { text: s.textContent, weight: getComputedStyle(s).fontWeight } : null; });
    check(typed.mood === 'concerned' && word?.text === '“delete”' && +word.weight >= 700, `${tag}: typing the confirmation keeps the Mallow concerned; the word to type stands out`, JSON.stringify({ typed, word }));
    await shot(p, `mallow-02-delete-typed-${tag}`);
    // a late "happy" (e.g. a name save that finishes after the tap) is ignored on this screen
    await p.evaluate(() => window.__account.mallow && window.__account.go && null);
    // Remove this phone's data: the same, straight from a happy moment
    await p.goBack(); await waitView(p, 'account');
    await p.evaluate(() => window.__account.mallow.mood('happy'));
    await sleep(60);
    await tap(p, '[data-act="device-data"]');
    const dd = (await faceFrames(p, 8)).filter((f) => f.view === 'device-data');
    check(dd.length >= 4 && dd.every((f) => f.mood === 'concerned' && (f.smile == null || f.smile <= 0) && !f.overlays.length), `${tag}: Remove this phone’s data, tapped mid-smile: concerned from the first frame`, JSON.stringify(dd.slice(0, 3)));
    await shot(p, `mallow-03-device-data-${tag}`);
    await ctx.close();
  }
}

// =============================================================== shared ==
async function shared(H) {
  const A = 'ana.shared@example.com', B = 'bo.shared@example.com', pw = 'gentle-moon-42', pwB = 'bo-after-reset-9';
  const uidA = await makeAccount(A, pw), uidB = await makeAccount(B, pw);
  const ctx = await H.ctx(390, 844);
  const t1 = await H.page(ctx, 'tab1-ana');
  await t1.goto(`${SITE}/version.json`);
  await t1.evaluate(() => localStorage.clear());
  await openAccount(t1);
  const r = await signInUi(t1, A, pw);
  if (r === 'choice') await tapNav(t1, '[data-act="fresh"]');
  await waitView(t1, 'account');
  await t1.evaluate((ver) => import(`/v/${ver}/src/engine/flow-store.js`).then((f) => f.toggleFavouriteWorld(window.__hush.store, 'static-storm')), VER);
  await t1.evaluate(() => window.__hush.prefs.set('textScale', 1.25));
  check(await uidOf(t1) === uidA, 'tab 1: Ana is signed in on this browser, with a favourite and a setting of her own');
  const sidA = await t1.evaluate(() => { const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x)); return JSON.parse(atob(JSON.parse(localStorage.getItem(k)).access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id; });
  // Bo asks for a reset elsewhere; the link is opened in a second tab of this same browser
  const t0 = Date.now();
  await api(`/auth/v1/recover?redirect_to=${encodeURIComponent(`${SITE}/auth/callback`)}`, { email: B });
  const m = await mail(B, 'recovery', t0 - 1000);
  const t2 = await H.page(ctx, 'tab2-bo-reset');
  const reload1 = t1.waitForNavigation({ timeout: 60000 }).then(() => true, () => false);
  await t2.goto(`${SITE}/auth/callback?token_hash=${m.token_hash}&type=recovery`);
  await t2.waitForSelector('#hm-new-password', { timeout: 30000 });
  await t2.fill('#hm-new-password', pwB);
  await shot(t2, 'shared-01-bo-reset-while-ana-signed-in-390');
  await t2.click('#hm-auth-body button[type=submit]');
  await t2.waitForFunction(() => /All set/.test(document.getElementById('hm-auth-title')?.textContent || '') || document.querySelector('.hm-auth-error')?.textContent, null, { timeout: 30000 });
  const res = await t2.evaluate(() => ({ title: document.getElementById('hm-auth-title').textContent, err: document.querySelector('.hm-auth-error')?.textContent || '' }));
  await shot(t2, 'shared-02-bo-all-set-390');
  check(res.title === 'All set' && !res.err, 'Bo’s reset link works on a browser where Ana is signed in: "All set"', JSON.stringify(res));
  check(await canSignIn(B, pwB) === 200 && await canSignIn(A, pw) === 200, 'Bo signs in with the new password; Ana’s password is untouched');
  await t2.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in', null, { timeout: 60000 });
  check(await uidOf(t2) === uidB, 'tab 2 opens the app as Bo, in Bo’s own namespace');
  const st = await state();
  check(!st.liveSessions.includes(sidA) && !(st.sessionsByUser[uidA] > 0), 'Ana’s session on this browser was ended on the server (scope local)', JSON.stringify({ sidA, live: st.liveSessions.length }));
  check(await reload1, 'tab 1 hears the change and leaves Ana’s namespace');
  await appReady(t1);
  const t1now = { uid: await uidOf(t1), favs: await t1.evaluate((ver) => import(`/v/${ver}/src/engine/flow-store.js`).then((f) => f.favouriteWorlds(window.__hush.store)), VER), textScale: await t1.evaluate(() => window.__hush.prefs.get('textScale')) };
  check(t1now.uid !== uidA && t1now.favs.length === 0 && t1now.textScale === 1, 'tab 1 now shows none of Ana’s things', JSON.stringify(t1now));
  const kept = await t1.evaluate((a) => JSON.parse(localStorage.getItem(`hm2:u:${a}:hushfold.favourites`) || 'null'), uidA);
  check(kept?.ids?.includes('static-storm'), 'Ana’s own copy stays on the device for her next sign-in');
  await ctx.close();
}

// =========================================================== deleterace ==
async function deleterace(H) {
  const email = 'del.race@example.com', pw = 'gentle-moon-42';
  await makeAccount(email, pw);
  const ctx = await H.ctx(390, 844);
  const p = await H.page(ctx, 'deleterace');
  await p.goto(`${SITE}/version.json`);
  await p.evaluate(() => localStorage.clear());
  await openAccount(p);
  const r = await signInUi(p, email, pw);
  if (r === 'choice') await tapNav(p, '[data-act="fresh"]');
  await waitView(p, 'account');
  const uid = await uidOf(p);
  await p.waitForFunction(() => !document.querySelector('[data-sync="library"]')?.disabled, null, { timeout: 30000 });
  await p.evaluate((ver) => import(`/v/${ver}/src/engine/flow-store.js`).then((f) => f.toggleFavouriteWorld(window.__hush.store, 'static-storm')), VER);
  await tap(p, '[data-sync="library"]');
  await p.waitForFunction(() => /kept with your account now/.test(document.querySelector('[data-sync-status]')?.textContent || ''), null, { timeout: 30000 });
  await p.waitForFunction(() => window.__hush.auth.autosync, null, { timeout: 30000 });
  // another device keeps one more favourite; the next pull brings it, and that pull is slow
  const s0 = await state();
  check(s0.rows.favourite_worlds.some((x) => x.user_id === uid), 'library sync on: the favourite is kept with the account');
  await api('/auth/v1/token?grant_type=password', { email, password: pw }).then((g) => fetch(`${FAKE}/rest/v1/favourite_worlds`, { method: 'POST', headers: { apikey: KEY, authorization: `Bearer ${g.json.access_token}`, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ user_id: uid, world_id: 'cosy-cave', position: 5 }) }));
  await post('/__fake/config', { restDelayMs: 2500, restDelayTables: ['favourite_worlds'] });
  await p.evaluate(() => { window.__syncDone = window.__hush.auth.autosync.syncNow(); });
  for (let i = 0; i < 100 && !(await state()).pending; i++) await sleep(30);
  check((await state()).pending > 0, 'a sync is mid-pull (the fake is holding its request)');
  await tap(p, '[data-act="delete"]'); await waitView(p, 'delete');
  await fill(p, 'confirm', 'delete');
  await tapNav(p, '[data-act="delete-confirm"]');
  await sleep(3500);
  await post('/__fake/config', { restDelayMs: 0, restDelayTables: null });
  const keys = await p.evaluate(() => Object.keys(localStorage));
  const left = keys.filter((k) => k.startsWith(`hm2:u:${uid}:`));
  const st = await state();
  check(await status(p) === 'guest' && !left.length && !keys.some((k) => k.startsWith('sb-')), 'deleted while a sync was in flight: nothing of the deleted account is left on this device', JSON.stringify(left));
  check(!st.users.some((u) => u.id === uid) && !Object.values(st.rows).some((rows) => rows.some((x) => x.user_id === uid)), 'and nothing of it on the server');
  await shot(p, 'deleterace-01-guest-again-390');
  await ctx.close();
}

async function main() {
  VER = (await (await fetch(`${SITE}/version.json`)).json()).v;
  await post('/__fake/reset');
  await post('/__fake/config', { rateLimitMs: 0, autoconfirm: false, failRefresh: false, refreshDown: false, accessTtl: 3600, down: false, securePasswordChange: true, recentLoginMs: 86_400_000, restDelayMs: 0, restDelayTables: null, singleToken: false });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const problems = [], expected = [];
  const H = {
    ctx: (w = 390, h = 844) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 900 }),
    async page(ctx, name) {
      const page = await ctx.newPage();
      page.on('console', (m) => {
        if (m.type() !== 'error' || /favicon/.test(m.text())) return;
        if (/Failed to load resource/.test(m.text()) && (m.location()?.url || '').startsWith(FAKE)) { expected.push(`${name}: ${m.text().slice(0, 90)}`); return; }
        problems.push(`${name}: console: ${m.text().slice(0, 200)}`);
      });
      page.on('pageerror', (e) => problems.push(`${name}: pageerror: ${String(e).slice(0, 200)}`));
      page.__name = name;
      return page;
    },
  };
  try {
    for (const [name, fn] of [['guestkeys', guestkeys], ['mallow', mallow], ['shared', shared], ['deleterace', deleterace]]) {
      if (ONLY && ONLY !== name) continue;
      try { await fn(H); } catch (e) { check(false, `${name}: stopped early: ${String(e?.message || e).split('\n')[0]}`); }
    }
  } finally {
    check(problems.length === 0, 'no console errors or page errors', problems.length ? problems.slice(0, 6).join(' | ') : `${expected.length} expected refusals from the sign-in server`);
    await browser.close();
  }
  const fails = results.filter((r) => !r.ok).length;
  console.log(fails ? `${fails} OF ${results.length} CHECKS FAILED` : `ALL ${results.length} CHECKS PASSED (screenshots in ${OUT})`);
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
