#!/usr/bin/env node
// The whole journey through the real app, in real browsers, against a real staging project:
// the published static site (the app and the safety desk) talking to Supabase on another host,
// as people will use it. Phone and desktop sizes; sign-up with an invitation, sign-in, releasing
// and catching feelings, the Mallow's perspective prepared by the platform's own scheduler, a
// homecoming, a share picture (and a writer changing their mind), crisis support, a report the
// safety desk decides, deletion; plus the refusals that must hold (other sites, forged tokens,
// other people's journeys, the desk for members, the database directly, a reused invitation, a
// wrong code, words that look like code). Every check is recorded as passed or failed, with
// where it was verified: "staging" only when it ran against the real project.
//
//   node tools/staging-e2e.mjs --project-ref <ref> --site https://<name>.pages.dev
//       needs what tools/staging-check.mjs needs: on the owner's computer the keys, HUSHMATES_ADMIN_PG and
//       .data/staging.env; in a cloud session SUPABASE_ACCESS_TOKEN and HUSHMATES_STAGING_ROOT_SECRET
//       (tools/staging-env.mjs). About 10 minutes
//   node tools/staging-e2e.mjs --rehearse      the same run on this machine: the packed site on one local host,
//       the local stack standing in for Supabase on another (labelled "local-rehearsal", never "staging")
//
// What it does to the project, and undoes: it shortens two timings (the Mallow's wait and a journey's
// day) for the run and puts them back; it makes four test people (no email is sent: their codes come
// from Supabase Auth's admin API, and the app's "send me a code" call is answered by the test) and
// four invitations, and removes them all at the end. It never calls AI.
// Playwright: this project's copy (npm i --no-save playwright && npx playwright install chromium) or the container's.

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync, realpathSync, mkdtempSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createFieldCrypt } from '../supabase/functions/_shared/fieldcrypt.js';
import { keyHeaders } from '../supabase/functions/_shared/postgrest-db.js';
import { createAdmin } from '../server/admin.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const playwright = (() => { try { return createRequire(import.meta.url)('playwright'); } catch { return createRequire('/opt/node-tools/node_modules/')('playwright'); } })();
const CHROMIUM = process.env.HUSHMATES_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const F1 = 'My friend hasn’t replied in days. I think they’re avoiding me.';
const F2 = 'I miss how things used to be with my brother before we stopped talking.';
const F3 = 'I keep replaying what I said in the meeting.';
const CRISIS = 'I don’t want to be alive anymore and I have a plan.';
const PERSPECTIVE = 'Maybe they’ve had a really full week and meant to reply when they had more energy.';
const PROBE = '<img src=x onerror="window.__pwned=1">I feel left out at work lately.';

/**
 * @param {object} o
 *   environment   'staging' | 'local-rehearsal' (what the report says was verified)
 *   site          the static site's origin (https://<name>.pages.dev)
 *   supabaseUrl   the project's URL
 *   anonKey, serviceKey, adminPg, secrets   as for tools/staging-check.mjs
 *   out           where the report and screenshots go
 *   timings       { fallbackAfterMs, journeyTtlMs, waitMs } for this run
 */
export async function runStagingE2E({ environment, site, supabaseUrl, anonKey, serviceKey, adminPg, db = null, secrets, out, timings = {}, log = console } = {}) {
  site = String(site).replace(/\/+$/, '');
  supabaseUrl = String(supabaseUrl).replace(/\/+$/, '');
  const T = { fallbackAfterMs: 60e3, journeyTtlMs: 180e3, waitMs: 150e3, ...timings };
  mkdirSync(out, { recursive: true });
  const run = randomBytes(3).toString('hex').replace(/[0-9]/g, (d) => 'ghijklmnop'[d]);
  const report = {
    environment, verifiedOn: environment, site, supabase: supabaseUrl, startedAt: new Date().toISOString(), run,
    engine: 'Chromium (desktop and mobile emulation)', checks: [], screens: [], console: [], expected: [], notChecked: [],
  };
  const say = (l) => (log.log || (() => {}))(l);
  const check = (area, ok, what, detail = '') => {
    report.checks.push({ area, ok: !!ok, what, ...(ok ? {} : { detail: String(detail).slice(0, 300) }), verifiedOn: environment });
    say(`${ok ? '✓' : '✗'} ${area}: ${what}${ok || !detail ? '' : ` (${String(detail).slice(0, 160)})`}`);
  };
  const issuer = `${supabaseUrl}/auth/v1`;
  const fn = `${supabaseUrl}/functions/v1/hushmates`;
  const http = async (url, { method = 'GET', headers = {}, body, redirect = 'manual' } = {}) => {
    const r = await fetch(url, { method, headers, redirect, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    return { status: r.status, headers: r.headers, body: json, text };
  };
  const authAdmin = (path, { method = 'POST', body } = {}) => http(`${issuer}${path}`, { method, headers: { 'content-type': 'application/json', ...keyHeaders(serviceKey) }, body });
  const rpc = (token, method, args = {}, { from = site } = {}) => http(`${fn}/rpc/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(from ? { origin: from } : {}), 'x-hushmates': '1' }, body: { args },
  });

  const pool = db || new pg.Pool({ connectionString: adminPg, max: 3 });
  const sql = async (q, p) => (await pool.query(q, p)).rows;
  const crypt = await createFieldCrypt({ keys: JSON.parse(secrets.HUSHMATES_DATA_KEYS), current: secrets.HUSHMATES_DATA_KEY_ID, macKey: secrets.HUSHMATES_MAC_KEY });
  const admin = createAdmin({ db: pool, crypt });
  const made = { users: [], codes: [] };
  let restoreLimits = null;
  let browser = null;

  try {
    // ------------------------------------------------------- the published site --
    const page0 = await http(`${site}/app/`);
    check('site', page0.status === 200 && /Hushmates/.test(page0.text), 'the app is published', page0.status);
    const csp = page0.headers.get('content-security-policy') || '';
    check('site', csp.includes(`connect-src 'self' ${new URL(supabaseUrl).origin}`) && /frame-ancestors 'none'/.test(csp) && /script-src 'self'/.test(csp),
      'its security policy lets pages talk to this project only, run no outside scripts, and refuses framing', csp);
    check('site', page0.headers.get('x-frame-options') === 'DENY' && page0.headers.get('x-content-type-options') === 'nosniff' && page0.headers.get('referrer-policy') === 'no-referrer',
      'the protective headers are there', [...page0.headers].filter(([k]) => /frame|nosniff|referrer|x-content/.test(k)).join(' '));
    if (site.startsWith('https://')) check('site', /max-age=\d{6,}/.test(page0.headers.get('strict-transport-security') || ''), 'HTTPS is enforced (HSTS)', page0.headers.get('strict-transport-security'));
    else report.notChecked.push('HSTS: the rehearsal site is plain http on this machine');
    const cfg = await http(`${site}/app/config.json`);
    check('site', cfg.body?.supabaseUrl === supabaseUrl && cfg.body?.supabaseAnonKey === anonKey && !/sb_secret_|service_role/.test(cfg.text),
      'the app’s settings name this project and its public key only (no secret key)', cfg.text.slice(0, 160));
    for (const path of ['/lab/', '/lab/index.html', '/core/relay-seed.js', '/.git/config', '/server/server.mjs', '/supabase/functions/_shared/gateway.js']) {
      const r = await http(`${site}${path}`);
      check('site', r.status === 404, `${path} isn’t published`, r.status);
    }
    const staffPage = await http(`${site}/staff/`);
    check('site', staffPage.status === 200 && /Safety desk|safety desk/i.test(staffPage.text), 'the safety desk is published', staffPage.status);
    const rootRedirect = await http(`${site}/`);
    check('site', [301, 302, 307, 308].includes(rootRedirect.status) && /\/app\/$/.test(rootRedirect.headers.get('location') || ''), 'the site’s front door leads to the app', `${rootRedirect.status} ${rootRedirect.headers.get('location')}`);

    // --------------------------------------------------- refusals with no account --
    check('security', (await http(`${fn}/rpc/me`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, origin: site }, body: { args: {} } })).status === 401, 'the function refuses a call with no sign-in');
    check('security', (await http(`${fn}/jobs/tick`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: {} })).status === 404, 'the scheduler’s route is “not found” without its secret');
    const direct = await http(`${supabaseUrl}/rest/v1/rpc/settings`, { method: 'POST', headers: { ...keyHeaders(anonKey), 'content-type': 'application/json', 'content-profile': 'hushmates_api' }, body: {} });
    check('security', [401, 403].includes(direct.status) && direct.body?.code === '42501', 'a browser can’t call the database directly (permission denied)', `${direct.status} ${direct.text}`);
    const preflight = await http(`${fn}/rpc/me`, { method: 'OPTIONS', headers: { origin: 'https://elsewhere.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, apikey, content-type' } });
    check('security', !preflight.headers.get('access-control-allow-origin'), 'another website’s page isn’t allowed to call the function (no CORS for it)', preflight.headers.get('access-control-allow-origin'));
    const ourPreflight = await http(`${fn}/rpc/me`, { method: 'OPTIONS', headers: { origin: site, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, apikey, content-type, x-hushmates' } });
    check('site', ourPreflight.headers.get('access-control-allow-origin') === site, 'the app’s own site is allowed to call the function', `${ourPreflight.status} ${ourPreflight.headers.get('access-control-allow-origin')}`);

    // ---------------------------------------- shorter timings for this run only --
    const before = (await admin.settings()).limits || {};
    restoreLimits = { fallbackAfterMs: before.fallbackAfterMs, journeyTtlMs: before.journeyTtlMs };
    await admin.set('limits', { fallbackAfterMs: T.fallbackAfterMs, journeyTtlMs: T.journeyTtlMs });
    say(`  (for this run: the Mallow waits ${T.fallbackAfterMs / 1000} s instead of ${before.fallbackAfterMs / 60000} min, a journey lasts ${T.journeyTtlMs / 1000} s instead of ${before.journeyTtlMs / 3600000} h; put back at the end)`);

    // --------------------------------------------------------- people and devices --
    const invites = await admin.invite({ count: 4, role: 'member', uses: 1, expiresDays: 1, note: `staging-e2e ${run}` });
    const deskInvite = await admin.invite({ count: 1, role: 'moderator', uses: 1, expiresDays: 1, note: `staging-e2e ${run}` });
    made.codes.push(...invites.codes, ...deskInvite.codes);
    const person = async (tag) => {
      const email = `staging-e2e+${run}-${tag}@example.com`;
      const r = await authAdmin('/admin/users', { body: { email, email_confirm: true } });
      if (r.status !== 200 || !r.body?.id) throw new Error(`couldn't make a test person (${r.status} ${r.text.slice(0, 120)})`);
      made.users.push(r.body.id);
      return { email, id: r.body.id, tag };
    };
    const codeFor = async (email) => {
      const r = await authAdmin('/admin/generate_link', { body: { type: 'magiclink', email } });
      const code = r.body?.email_otp ?? r.body?.properties?.email_otp;
      if (r.status !== 200 || !code) throw new Error(`couldn't get a sign-in code (${r.status})`);
      return code;
    };
    const [A, B, C, M] = [await person('a'), await person('b'), await person('c'), await person('m')];

    browser = await playwright.chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
    let expecting = false;
    async function device(name, { width, height, mobile, motion = 'no-preference' }) {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: motion, acceptDownloads: true });
      // "send me a code" is answered here, so no email is sent: the code comes from the admin API instead
      await ctx.route(`${issuer}/otp`, (route) => (route.request().method() === 'POST'
        ? route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' })
        : route.continue()));
      await ctx.addInitScript(() => {
        window.__drawn = new Set();
        for (const K of [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D].filter(Boolean)) {
          const real = K.prototype.fillText;
          K.prototype.fillText = function fillText(t, ...rest) { if (!this.canvas?.isConnected) window.__drawn.add(String(t)); return real.call(this, t, ...rest); };
        }
      });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => report.console.push(`${name} pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') (expecting ? report.expected : report.console).push(`${name}: ${m.text()}`); });
      return { ctx, page, name, width, mobile };
    }
    const hook = (page, s) => page.locator(`[data-test="${s}"]:visible`).first();
    const settle = (page, ms = 700) => page.waitForTimeout(ms);
    async function shot(d, label) {
      const file = `${String(report.screens.length + 1).padStart(2, '0')}-${d.name}-${label}.png`;
      await d.page.screenshot({ path: join(out, file) });
      const overflow = await d.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      report.screens.push({ file, device: d.name, size: `${d.width}${d.mobile ? ' (mobile)' : ''}`, overflow });
      if (overflow) check('layout', false, `${d.name} · ${label}: nothing scrolls sideways`, 'the page is wider than the screen');
      return d.page.locator('body').innerText();
    }
    // one code per person (Supabase may limit how often codes are made for one address)
    async function signIn(d, who, { invite = null, name = null, wrongFirst = false, usedInvite = null } = {}) {
      await d.page.goto(`${site}/app/`);
      await hook(d.page, 'signin-email').waitFor({ timeout: 30000 });
      await hook(d.page, 'signin-email').fill(who.email);
      await hook(d.page, 'signin-send').click();
      await hook(d.page, 'signin-code').waitFor({ timeout: 20000 });
      if (wrongFirst) {
        expecting = true;
        await hook(d.page, 'signin-code').fill('000000');
        await hook(d.page, 'signin-continue').click();
        await hook(d.page, 'signin-error').waitFor({ timeout: 20000 }).then(() => check('security', true, 'a wrong sign-in code is refused, kindly'), () => check('security', false, 'a wrong sign-in code is refused, kindly'));
        expecting = false;
      }
      await hook(d.page, 'signin-code').fill(await codeFor(who.email));
      await hook(d.page, 'signin-continue').click();
      if (!invite) return;
      await hook(d.page, 'invite-code').waitFor({ timeout: 20000 });
      if (usedInvite) {
        expecting = true;
        await hook(d.page, 'invite-code').fill(usedInvite);
        await hook(d.page, 'invite-name').fill(name);
        await hook(d.page, 'invite-adult').click();
        await hook(d.page, 'invite-join').click();
        await hook(d.page, 'invite-error').waitFor({ timeout: 20000 }).then(() => check('security', true, 'an invitation someone already used is refused'), () => check('security', false, 'an invitation someone already used is refused'));
        expecting = false;
        await hook(d.page, 'invite-code').fill(invite);
        await hook(d.page, 'invite-join').click();
        return;
      }
      await hook(d.page, 'invite-code').fill(invite);
      await hook(d.page, 'invite-name').fill(name);
      await hook(d.page, 'invite-adult').click();
      await hook(d.page, 'invite-join').click();
    }
    async function welcome(d, { catching = false } = {}) {
      await hook(d.page, 'welcome').waitFor({ timeout: 20000 });
      for (let i = 0; i < 6 && await d.page.locator('[data-test="welcome-next"]:visible').count(); i++) { await hook(d.page, 'welcome-next').click(); await settle(d.page, 450); }
      if (catching) await hook(d.page, 'welcome-catching').click();
      await hook(d.page, 'welcome-enter').click();
      await hook(d.page, 'feeling-text').waitFor({ timeout: 20000 });
    }
    async function home(d) {
      await d.page.goto(`${site}/app/`);
      await hook(d.page, 'nav-release').waitFor({ timeout: 30000 });
    }
    async function release(d, text, { label = null, fallback = false } = {}) {
      if (!(await d.page.locator('[data-test="release-another"]:visible, [data-test="nav-release"]:visible').count())) await home(d);
      if (await d.page.locator('[data-test="release-another"]:visible').count()) await hook(d.page, 'release-another').click();
      else await hook(d.page, 'nav-release').click();
      if (await d.page.locator('[data-test="release-another"]:visible').count()) await hook(d.page, 'release-another').click();
      await hook(d.page, 'feeling-text').waitFor();
      await hook(d.page, 'feeling-text').fill(text);
      // each choice set, not toggled: coming back from the support screen keeps what was chosen
      const setTo = async (test, on) => {
        const el = hook(d.page, test);
        const now = (await el.getAttribute('aria-checked')) === 'true' || (await el.isChecked().catch(() => false));
        if (now !== on) await el.click();
      };
      if (label && (await hook(d.page, `label-${label}`).getAttribute('aria-pressed')) !== 'true' && (await hook(d.page, `label-${label}`).getAttribute('aria-checked')) !== 'true') await hook(d.page, `label-${label}`).click();
      await setTo('share-consent', true);
      if (await d.page.locator('[data-test="allow-fallback"]:visible').count()) await setTo('allow-fallback', fallback);
      await hook(d.page, 'release-submit').click();
    }
    // the page's own access token, for the test's API calls as that person (never its refresh token)
    const tokenOf = async (d) => (await d.page.evaluate(() => JSON.parse(localStorage.getItem('hushmates.session') || 'null')))?.accessToken;
    const journeys = async (token) => (await rpc(token, 'listJourneys')).body?.result?.journeys || [];
    async function until(what, fnc, ms) {
      const end = Date.now() + ms;
      for (;;) { const v = await fnc(); if (v) return v; if (Date.now() > end) return null; await new Promise((r) => setTimeout(r, 5000)); say(`  … ${what}`); }
    }

    const phone = await device('phone-390', { width: 390, height: 844, mobile: true, motion: 'reduce' });
    const laptop = await device('desktop-1280', { width: 1280, height: 800, mobile: false });
    const android = await device('phone-360', { width: 360, height: 740, mobile: true });
    const deskDev = await device('desktop-1440', { width: 1440, height: 900, mobile: false });

    // ------------------------------------------------ sign-up and sign-in, for real --
    await signIn(phone, A, { invite: invites.codes[0], name: 'Moonbeam' });
    await welcome(phone);
    await shot(phone, 'signed-up');
    const tokA = await tokenOf(phone);
    const amr = tokA ? JSON.parse(Buffer.from(tokA.split('.')[1], 'base64url').toString()).amr || [] : [];
    check('sign-in', !!tokA, 'a new person signs up on a phone: email code, invitation, name, 18+', 'no session');
    check('sign-in', amr.some((m) => ['otp', 'magiclink'].includes(m?.method || m)), 'the session is recorded as an email-code sign-in', JSON.stringify(amr));
    check('sign-in', (await rpc(tokA, 'me')).body?.result?.profile?.pseudonym === 'Moonbeam', 'the account is theirs, under the name they chose');
    await signIn(laptop, B, { invite: invites.codes[1], name: 'Riverstone' });
    await welcome(laptop, { catching: true });
    const tokB = await tokenOf(laptop);
    check('sign-in', !!tokB, 'a second person signs up on a desktop and turns on catching');

    // ------------------------------------------------------ release, catch, write --
    await release(phone, F1, { label: 'worry', fallback: true });
    await hook(phone.page, 'release-sent').waitFor({ timeout: 30000 });
    await shot(phone, 'released');
    check('relay', true, 'a feeling is released from the phone');
    await hook(laptop.page, 'nav-catch').click();
    await hook(laptop.page, 'find-feeling').click();
    await hook(laptop.page, 'catch-feeling').waitFor({ timeout: 30000 });
    const offered = await shot(laptop, 'offered');
    check('relay', offered.includes('avoiding me'), 'the other person is offered it');
    check('privacy', !/Moonbeam|staging-e2e/.test(offered), 'without learning who wrote it');
    await hook(laptop.page, 'catch-feeling').click();
    await hook(laptop.page, 'reframe-text').waitFor({ timeout: 20000 });
    await hook(laptop.page, 'reframe-text').fill(PERSPECTIVE);
    await hook(laptop.page, 'allow-share').click();
    await hook(laptop.page, 'reframe-submit').click();
    await settle(laptop.page, 3000);
    await shot(laptop, 'perspective-sent');
    const j1 = (await journeys(tokA)).find((j) => j.text === F1);
    check('relay', j1 && (await sql('select count(*)::int n from hushmates.perspectives where journey_id = $1', [j1.id]))[0].n === 1, 'the perspective is stored once');
    const stored = j1 ? (await sql('select text_enc from hushmates.journeys where id = $1', [j1.id]))[0]?.text_enc || '' : '';
    check('encryption', stored.startsWith('hmenc:v1:') && !stored.includes('avoiding'), 'the feeling is stored locked in the database');

    // ------------------------------------------- crisis support, nothing stored --
    const countBefore = (await sql('select count(*)::int n from hushmates.journeys'))[0].n;
    await release(phone, CRISIS);
    await phone.page.locator('[data-test="support-scene"]').waitFor({ timeout: 20000 });
    const support = await shot(phone, 'support');
    check('safety', /000/.test(support) && /13 11 14/.test(support), 'words that suggest someone isn’t safe get Australian crisis support');
    check('safety', await phone.page.locator('[data-test="support-call"][href="tel:000"]:visible').count() > 0 && await phone.page.locator('[data-test="support-call"][href="tel:131114"]:visible').count() > 0, 'the lines can be tapped to call');
    check('safety', (await sql('select count(*)::int n from hushmates.journeys'))[0].n === countBefore, 'and the words were never stored or sent');
    await hook(phone.page, 'support-clear').click();

    // ------------------------------ the Mallow, prepared by the platform's scheduler --
    await release(phone, F2, { label: 'sadness', fallback: true });
    await hook(phone.page, 'release-sent').waitFor({ timeout: 30000 });
    const j2 = await until('waiting for the Mallow (the scheduler)', async () => (await journeys(tokA)).find((j) => j.text === F2 && j.fallback?.status === 'ready'), T.fallbackAfterMs + T.waitMs);
    check('scheduler', !!j2, `the Mallow’s perspective was prepared by the ${environment === 'staging' ? 'platform’s scheduler (pg_cron)' : 'local scheduler'} with nobody calling`, 'not ready in time');
    if (j2) {
      check('mallow', (await sql('select source from hushmates.mallow_perspectives where journey_id = $1', [j2.id]))[0]?.source === 'library', 'it came from the free library (no AI)');
      await phone.page.goto(`${site}/app/`);
      await hook(phone.page, 'nav-journeys').waitFor({ timeout: 30000 });
      await hook(phone.page, 'nav-journeys').click();
      await hook(phone.page, `journey-${j2.id}`).click();
      await hook(phone.page, 'mallow-reveal').waitFor({ timeout: 20000 });
      await hook(phone.page, 'mallow-reveal').click();
      await phone.page.locator('[data-test="perspective"][data-kind="mallow"]').first().waitFor({ timeout: 20000 });
      await settle(phone.page, 1500);
      const mallowSeen = await shot(phone, 'mallow');
      check('mallow', /Automatically generated/i.test(mallowSeen) && /A Mallow perspective/i.test(mallowSeen), 'the Mallow’s perspective is labelled as automatic, never as a person’s');
      await rpc(tokA, 'withdrawFeeling', { journeyId: j2.id });             // out of the sky before the report below
    }

    // ------------------------------------------------------- homecoming and share --
    const home1 = await until('waiting for the first feeling to come home', async () => (await journeys(tokA)).find((j) => j.id === j1?.id && j.status === 'returned'), T.journeyTtlMs + T.waitMs);
    check('scheduler', !!home1 && home1.humanCount === 1, 'the first feeling came home when its time was up, with one person', JSON.stringify(home1 && { status: home1.status, humanCount: home1.humanCount }));
    if (home1) {
      await phone.page.goto(`${site}/app/`);
      await hook(phone.page, 'nav-returned').waitFor({ timeout: 30000 });
      await hook(phone.page, 'nav-returned').click();
      await hook(phone.page, `returned-${j1.id}`).click();
      await hook(phone.page, 'homecoming-ready').waitFor({ timeout: 30000 });
      const home = await shot(phone, 'homecoming');
      check('relay', home.includes(PERSPECTIVE) && /1 Hushmate|1 of 5/.test(home), 'the homecoming shows the perspective and the real count');
      await hook(phone.page, 'share-journey').click();
      await hook(phone.page, 'share-preview').waitFor({ timeout: 20000 });
      await phone.page.locator('[data-test="share-pick"][data-kind="human"]:visible').first().click();
      await phone.page.evaluate(() => window.__drawn.clear());
      await hook(phone.page, 'share-save').click();
      await hook(phone.page, 'share-image').waitFor({ timeout: 30000 });
      await shot(phone, 'share-picture');
      const drawn = (await phone.page.evaluate(() => [...window.__drawn])).join(' ');
      check('privacy', drawn.includes('Maybe they’ve had') && !/Moonbeam|Riverstone|staging-e2e/.test(drawn), 'the share picture draws the allowed perspective and names nobody');
      await phone.page.getByRole('button', { name: 'Done' }).click();
      const gift = (await rpc(tokB, 'myGifts')).body?.result?.gifts?.find((g) => g.text === PERSPECTIVE);
      await rpc(tokB, 'setGiftSharing', { perspectiveId: gift?.id, allowShare: false });
      await phone.page.evaluate(() => window.__drawn.clear());
      await hook(phone.page, 'share-save').click();
      await phone.page.locator('.hm-toast', { hasText: 'stopped sharing' }).waitFor({ timeout: 20000 }).catch(() => {});
      check('privacy', !(await phone.page.locator('[data-test="share-image"]').count()) && !(await phone.page.evaluate(() => window.__drawn.size)), 'when its writer stops sharing, a new picture is not made with their words');
    }

    // ------------------------------------------- a third person, a report, the desk --
    await signIn(android, C, { invite: invites.codes[2], name: 'Fernleaf', wrongFirst: true, usedInvite: invites.codes[0] });
    await welcome(android, { catching: true });
    const tokC = await tokenOf(android);
    check('sign-in', !!tokC, 'a third person signs up on a smaller phone');
    await release(android, PROBE);
    await android.page.waitForTimeout(2500);
    const probeSent = await android.page.locator('[data-test="release-sent"]:visible').count();
    if (probeSent) {
      const probeJourney = (await journeys(tokC)).find((j) => j.text === PROBE);
      if (probeJourney) {
        await hook(android.page, 'nav-journeys').click();
        await hook(android.page, `journey-${probeJourney.id}`).click();
        await android.page.waitForTimeout(2000);
      }
    }
    const pwned = await android.page.evaluate(() => window.__pwned === 1 || !!document.querySelector('img[src="x"]'));
    const shownAsText = probeSent ? (await android.page.locator('body').innerText()).includes('<img src=x') : true;
    check('security', !pwned && shownAsText, `words that look like code are shown as words, never run (${probeSent ? 'released, then opened' : 'refused by the screen'})`);
    await shot(android, 'probe');
    if (probeSent) { const pj = (await journeys(tokC)).find((j) => j.text === PROBE); if (pj) await rpc(tokC, 'withdrawFeeling', { journeyId: pj.id }); }
    await phone.page.goto(`${site}/app/`);
    await hook(phone.page, 'nav-release').waitFor({ timeout: 30000 });
    await release(phone, F3, { label: 'worry' });
    await hook(phone.page, 'release-sent').waitFor({ timeout: 30000 });
    await hook(android.page, 'nav-catch').click();
    await hook(android.page, 'find-feeling').click();
    await hook(android.page, 'offer-more').waitFor({ timeout: 30000 });
    const offeredC = await shot(android, 'offered');
    check('relay', offeredC.includes('replaying what I said'), 'a third person, on another phone, is offered the next feeling');
    await hook(android.page, 'offer-more').click();
    await hook(android.page, 'report-feeling').click();
    await hook(android.page, 'reason-safety').click();
    await hook(android.page, 'report-send').click();
    await hook(android.page, 'report-received').waitFor({ timeout: 20000 });
    await shot(android, 'reported');
    check('safety', true, 'they report it: “Someone may be in danger”');
    await deskDev.page.goto(`${site}/staff/`);
    await deskDev.page.locator('#signin-email').fill(M.email);
    await deskDev.page.keyboard.press('Enter');
    await deskDev.page.locator('#signin-code').waitFor({ timeout: 20000 });
    await deskDev.page.locator('#signin-code').fill(await codeFor(M.email));
    await deskDev.page.keyboard.press('Enter');
    await deskDev.page.locator('#join-code').waitFor({ timeout: 20000 });
    await deskDev.page.locator('#join-code').fill(deskInvite.codes[0]);
    await deskDev.page.locator('#join-name').fill('Careful Cloud');
    await deskDev.page.locator('#join-adult').check();
    await deskDev.page.locator('[data-test="desk-join"] button[type="submit"]').click();
    await deskDev.page.locator('[data-test="desk-report"]').first().waitFor({ timeout: 30000 });
    const queue = await shot(deskDev, 'desk-queue');
    check('safety', /Priority/.test(queue), 'the safety desk sees it first, marked priority');
    await deskDev.page.locator('[data-test="desk-report"]').first().click();
    await deskDev.page.locator('[data-test="desk-detail"]').waitFor({ timeout: 20000 });
    const detail = await shot(deskDev, 'desk-report');
    check('safety', detail.includes('replaying what I said') && !/Moonbeam|Fernleaf|staging-e2e/.test(detail), 'the desk reads the words, never who wrote or reported them');
    deskDev.page.on('dialog', (dlg) => dlg.accept());
    await deskDev.page.locator('#resolve-note').fill('Staging check: taken out of circulation.');
    await deskDev.page.locator('[data-test="desk-remove-feeling"]').click();
    await deskDev.page.locator('[data-test="desk-decided"]').waitFor({ timeout: 20000 });
    check('safety', true, 'the desk decides, and the decision is recorded');
    const audit = await sql("select count(*)::int n from hushmates.audit_log where action = 'mod.resolve' and at > now() - interval '30 minutes'");
    check('safety', audit[0].n >= 1, 'the activity log has the decision');

    // ------------------------------------------------------ refusals with accounts --
    const tokM = (await deskDev.page.evaluate(() => Object.values(sessionStorage).map((v) => { try { return JSON.parse(v); } catch { return null; } }).find((s) => s?.accessToken)))?.accessToken;
    check('security', (await rpc(tokA, 'modListReports')).body?.code === 'forbidden', 'a member can’t use the safety desk’s methods');
    check('security', (await rpc(tokA, 'me', {}, { from: 'https://elsewhere.example' })).body?.code === 'forbidden', 'a page on another website can’t use someone’s sign-in');
    check('security', (await rpc(`${tokA.slice(0, -6)}AAAAAA`, 'me')).status === 401, 'a forged token is refused');
    check('security', (await rpc(tokB, 'getJourney', { journeyId: j1?.id })).body?.code === 'not-found', 'one person can’t read another’s journey, even with its id');
    const asPerson = await http(`${supabaseUrl}/rest/v1/rpc/rpc`, { method: 'POST', headers: { apikey: anonKey, authorization: `Bearer ${tokA}`, 'content-type': 'application/json', 'content-profile': 'hushmates_api' }, body: { p_issuer: issuer, p_subject: B.id, p_method: 'listJourneys' } });
    check('security', [401, 403].includes(asPerson.status), 'a signed-in person can’t call the database’s door directly as someone else', `${asPerson.status} ${asPerson.text.slice(0, 120)}`);
    if (!tokM) report.notChecked.push('the moderator’s own session token (kept in the desk tab)');

    // -------------------------------------------------------------- deletion --
    await home(phone);
    await hook(phone.page, 'open-you').click();
    await hook(phone.page, 'open-data').click();
    await hook(phone.page, 'data-feelings').waitFor({ timeout: 20000 });
    const yours = await shot(phone, 'your-data');
    check('privacy', /Moonbeam/.test(yours) && !/Riverstone|Fernleaf|staging-e2e/.test(yours), 'Your data shows the person’s own account, and nobody else by name');
    await phone.page.getByRole('button', { name: 'Back' }).first().click();
    await hook(phone.page, 'delete-data').click();
    await hook(phone.page, 'confirm').click();
    await phone.page.locator('[data-test="deleted"]').waitFor({ timeout: 30000 });
    await shot(phone, 'deleted');
    const goneA = await authAdmin(`/admin/users/${A.id}`, { method: 'GET' });
    check('deletion', goneA.status === 404, 'deleting from the phone removes the sign-in from Supabase Auth', goneA.status);
    const wordsLeft = await sql("select count(*)::int n from hushmates.journeys j join hushmates.identities i on i.member_id = j.owner where i.issuer = $1 and i.subject = $2 and j.text_enc <> ''", [issuer, A.id]);
    check('deletion', wordsLeft[0].n === 0, 'and their words from the database');
    for (const [who, tok] of [[B, tokB], [C, tokC], [M, tokM]]) {
      if (!tok) continue;
      await rpc(tok, 'deleteMyData', { confirm: 'DELETE' });
      const gone = await authAdmin(`/admin/users/${who.id}`, { method: 'GET' });
      check('deletion', gone.status === 404, `test person ${who.tag.toUpperCase()}: deleted, sign-in included`, gone.status);
    }

    // ------------------------------------------------------- what each screen said --
    for (const d of [phone, laptop, android, deskDev]) await d.ctx.close();
  } catch (e) {
    check('run', false, 'the journey ran to the end', e.message.split('\n')[0]);
    if (browser) for (const ctx of browser.contexts()) for (const pg2 of ctx.pages()) await pg2.screenshot({ path: join(out, `zz-stopped-${report.screens.length}-${Math.random().toString(36).slice(2, 6)}.png`) }).catch(() => {});
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (restoreLimits) await admin.set('limits', restoreLimits).then(() => say('  (timings put back)'), (e) => check('run', false, 'the timings were put back', e.message));
    for (const id of made.users) await authAdmin(`/admin/users/${id}`, { method: 'DELETE' }).catch(() => {});
    for (const code of made.codes) await admin.revoke(code).catch(() => {});
    await pool.end();
  }
  for (const c of report.console) report.checks.push({ area: 'console', ok: false, what: 'no errors in the browser', detail: c, verifiedOn: environment });
  report.finishedAt = new Date().toISOString();
  report.notChecked.push(
    'email delivery: the app’s “send me a code” call was answered by the test (no email sent); the staging guide’s hand test covers real emails',
    'Safari/WebKit and real phones: Chromium with phone sizes and touch only (run with real devices by hand)',
  );
  report.passed = report.checks.filter((c) => c.ok).length;
  report.failed = report.checks.filter((c) => !c.ok).length;
  writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(out, 'report.md'), toMarkdown(report));
  return report;
}

function toMarkdown(r) {
  const head = r.environment === 'staging'
    ? `# Staging end-to-end: VERIFIED ON STAGING\n\nProject ${r.supabase}, site ${r.site}.`
    : `# Staging end-to-end: LOCAL REHEARSAL (not staging)\n\nRun on one machine: the packed site and a local stand-in for Supabase on two hosts. It proves the test and the cross-host set-up, not the real platform.`;
  const rows = r.checks.map((c) => `| ${c.ok ? '✅ pass' : '❌ FAIL'} | ${c.area} | ${c.what}${c.detail ? ` — ${c.detail.replace(/\|/g, '/')}` : ''} |`).join('\n');
  return `${head}\n\n${r.startedAt} → ${r.finishedAt} · ${r.engine}\n\n**${r.passed} passed, ${r.failed} failed.**\n\n| Result | Area | Check |\n|---|---|---|\n${rows}\n\n## Not checked by this run\n\n${r.notChecked.map((n) => `- ${n}`).join('\n')}\n\n## Screens\n\n${r.screens.map((s) => `- ${s.file} (${s.size})`).join('\n')}\n`;
}

const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

/** The rehearsal: the same run, here, with the two hosts staging has. */
export async function rehearse({ out, deno = process.env.HUSHMATES_DENO, log = console } = {}) {
  const { startDevStack } = await import('../server/dev-stack.mjs');
  const { freshDb } = await import('../tests/backend-helpers.mjs');
  const { packSite } = await import('./pack-site.mjs');
  const { createStaticSite } = await import('../server/static-site.mjs');
  const db = await freshDb();
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-rehearsal-'));
  const [apiPort, sitePort] = [await freePort(), await freePort()];
  const siteOrigin = `http://127.0.0.1:${sitePort}`;
  const anonKey = 'local-anon-key-dev-only';
  const stack = await startDevStack({ port: apiPort, pool: db.pool, anonKey, keysFile: join(dir, 'keys.json'), quiet: true, log: { error: (...a) => (log.error || (() => {}))(...a), log() {} },
    tickMs: 3000, extraOrigins: [siteOrigin], ...(deno ? { edge: 'deno', deno } : {}) });
  packSite({ supabaseUrl: stack.origin, anonKey, out: join(dir, 'site'), allowLocal: true });
  const site = createStaticSite({ root: join(dir, 'site') });
  await site.listen(sitePort);
  try {
    return await runStagingE2E({
      environment: 'local-rehearsal', site: siteOrigin, supabaseUrl: stack.origin, anonKey, serviceKey: stack.keys.serviceKey, adminPg: db.url,
      secrets: { HUSHMATES_DATA_KEYS: JSON.stringify({ [stack.keys.dataKeyId]: stack.keys.dataKey }), HUSHMATES_DATA_KEY_ID: stack.keys.dataKeyId, HUSHMATES_MAC_KEY: stack.keys.macKey },
      out, timings: { fallbackAfterMs: 12e3, journeyTtlMs: 45e3, waitMs: 40e3 }, log,
    });
  } finally {
    await site.close();
    await stack.close();
    await db.drop();
    rmSync(dir, { recursive: true, force: true });
  }
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let r;
  if (process.argv.includes('--rehearse')) {
    r = await rehearse({ out: arg('out') || join(ROOT, '.data', `staging-e2e-rehearsal-${stamp}`) });
  } else {
    const { resolveRun } = await import('./staging-env.mjs');
    const ref = arg('project-ref') || '';
    const site = arg('site') || '';
    const stop = (m) => { console.error(m); process.exit(2); };
    if (!/^https:\/\/[a-z0-9.-]+$/i.test(site)) stop('Give the staging site: --site https://<name>.pages.dev');
    let run;
    try { run = await resolveRun({ ref, site }); } catch (e) { stop(`✗ ${e.message}`); }
    if (!run.secrets.HUSHMATES_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).includes(site)) stop(`${site} isn’t in HUSHMATES_ALLOWED_ORIGINS: the function would refuse the app`);
    console.log(`The browser E2E on staging project ${ref} and ${site} (database reached by ${run.via}).`);
    r = await runStagingE2E({ environment: 'staging', site, supabaseUrl: `https://${ref}.supabase.co`, anonKey: run.anonKey,
      serviceKey: run.serviceKey, adminPg: run.adminPg, db: run.db, secrets: run.secrets, out: arg('out') || join(ROOT, '.data', `staging-e2e-${stamp}`) });
  }
  console.log(`\n${r.environment === 'staging' ? 'VERIFIED ON STAGING' : 'LOCAL REHEARSAL (not staging)'}: ${r.passed} passed, ${r.failed} failed. Report: report.md and report.json, with the screens.`);
  process.exit(r.failed ? 1 : 0);
}
