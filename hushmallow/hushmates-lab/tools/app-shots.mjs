#!/usr/bin/env node
// End to end, with many real accounts, on the whole local stack: the production build of the
// app and the safety desk, served with the real backend (Postgres with the real migrations, the
// local copy of Supabase Auth's email-code sign-in, and the Edge Function's own code). Nothing
// is simulated in between: each person signs in with an email code (read from the local Auth
// copy's mailbox: no email is sent), joins with an invitation, and the browsers and the other
// members' apps all talk to the same gateway over HTTP.
//
//   node tools/app-shots.mjs <out-dir>
//
// People: the author on a phone (reduced motion), a catcher on a laptop (full motion), a
// moderator at the safety desk, a newcomer who uses only the keyboard, and six more members
// whose apps act through the API, several at the same moment. Time moves only in this script
// (the stack is given its clock; the scheduler's job is run when the script says so).
// Every screen's visible text is checked for developer content, raw data and internal ids, and
// any console error outside the moments the script provokes on purpose fails the run.
// Nothing is deployed; everything listens on 127.0.0.1 and is removed at the end.

import { createRequire } from 'node:module';
import net from 'node:net';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, FORBIDDEN } from './build-app.mjs';
import { builtFiles } from '../server/server.mjs';
import { startDevStack } from '../server/dev-stack.mjs';
import { freshDb } from '../tests/backend-helpers.mjs';

const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const out = process.argv[2] || join(process.cwd(), 'app-shots');
mkdirSync(out, { recursive: true });

const F1 = 'My friend hasn’t replied in days. I think they’re avoiding me.';
const F2 = 'I miss how things used to be with my brother before we stopped talking.';
const F3 = 'I keep replaying what I said in the meeting.';
const F4 = 'I’m nervous about starting my new job on Monday.';
const PERSPECTIVES = [
  'Maybe they’ve had a really full week and meant to reply when they had more energy.',
  'Could it be that they read it on the go and forgot it was still unanswered?',
  'Perhaps they’re worried about saying the wrong thing, and silence felt safer.',
  'The quiet might say more about their week than about how they feel about you.',
  'It might help to send something light, with no pressure, and see how they are.',
];
const SCREEN_ONLY = [
  [/\{\s*"|"\s*:\s*[{["\d]/, 'raw data (JSON)'],
  [/\b(?:undefined|NaN)\b|\[object |\bnull\b/, 'programming values'],
  [/\b(?:tok|acc|jr|pv|hold|rep|fb)_[a-z0-9]{6,}|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/, 'internal ids'],
  [/Error:|TypeError|Failed to fetch|\bstack\b|status code|\bHTTP\b|\bJSON\b|\bJWT\b|\bOTP\b|\btoken\b/i, 'technical words'],
  [/\b(?:mock|simulated|debug|prototype|test(?:ing)? (?:account|data|key))\b|\bpassword\b/i, 'testing words'],
];
const STAFF_SCREEN = SCREEN_ONLY.filter(([, why]) => why !== 'internal ids');   // the desk shows account references on purpose

// ---------------------------------------------------------------------- the stack --
const dist = mkdtempSync(join(tmpdir(), 'hushmates-e2e-'));
for (const which of ['app', 'staff']) {
  const res = build({ out: join(dist, which), which });
  if (!res.ok) { console.error('build refused', res.problems); process.exit(1); }
}
const files = builtFiles(join(dist, 'app'));
for (const [url, file] of builtFiles(join(dist, 'staff'))) files.set(url, file);
const port = await new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = await freshDb();
const clock = { t: Date.now() };
const MEMBER_CODES = ['AUTHORCODE1', 'CATCHERCD2', 'KEYBOARDC3', ...Array.from({ length: 8 }, (_, i) => `MEMBERCODE${i}`)];
const stack = await startDevStack({
  port, pool: db.pool, files, keysFile: join(dist, 'keys.json'), quiet: true, tickMs: 3600e3, now: () => clock.t, moveDbClock: true,
  invites: MEMBER_CODES, staffInvites: ['SAFETYDESK1'], log: { log() {}, error: (...a) => report.server.push(a.join(' ')) },
});
const base = stack.origin;
const ANON = JSON.parse(readFileSync(new URL('../app/config.json', import.meta.url), 'utf8')).supabaseAnonKey;
const report = { stack: 'production build + local Postgres + local Supabase Auth copy + the Edge Function code', checks: [], screens: [], problems: [], console: [], expected: [], server: [] };
const check = (ok, what) => { report.checks.push({ ok: !!ok, what }); if (!ok) report.problems.push(`check failed: ${what}`); };
const sql = async (q, p) => (await db.pool.query(q, p)).rows;
const advance = async (ms) => { clock.t += ms; await stack.gateway.tick(); };

// --------------------------------------------------- other members' apps (the API) --
const H = { 'content-type': 'application/json', apikey: ANON };
async function apiSignIn(email) {
  await fetch(`${base}/auth/v1/otp`, { method: 'POST', headers: H, body: JSON.stringify({ email, create_user: true }) });
  const r = await fetch(`${base}/auth/v1/verify`, { method: 'POST', headers: H, body: JSON.stringify({ type: 'email', email, token: stack.auth.mailbox(email) }) });
  const s = await r.json();
  return { token: s.access_token, refresh: s.refresh_token, email };
}
async function call(who, method, args = {}) {
  for (let tries = 0; tries < 2; tries++) {
    const r = await fetch(`${base}/functions/v1/hushmates/rpc/${method}`, { method: 'POST', headers: { ...H, authorization: `Bearer ${who.token}` }, body: JSON.stringify({ args }) });
    const body = await r.json();
    if (r.status === 401 && tries === 0) {                                   // the clock jumped a day: refresh, as the app does
      const t = await (await fetch(`${base}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: H, body: JSON.stringify({ refresh_token: who.refresh }) })).json();
      Object.assign(who, { token: t.access_token, refresh: t.refresh_token });
      continue;
    }
    if (!body.ok) throw Object.assign(new Error(`${method}: ${body.message}`), { code: body.code });
    return body.result;
  }
  throw new Error(`${method}: still not signed in`);
}
const members = [];
for (let i = 0; i < 6; i++) {
  const who = await apiSignIn(`member${i}@example.com`);
  await call(who, 'redeemInvite', { code: MEMBER_CODES[3 + i], name: ['Cloudlet', 'Starling', 'Fernleaf', 'Daydream', 'Pebbles', 'Emberly'][i], adult: true });
  await call(who, 'savePreferences', { catching: true, onboarded: true });
  members.push(who);
}
let n = 0;
async function answer(who, text) {
  const { offer } = await call(who, 'findFeeling');
  if (!offer) return null;
  await call(who, 'catchFeeling', { holdId: offer.holdId });
  return call(who, 'submitReframe', { holdId: offer.holdId, text, allowShare: true, clientId: `e2e-${(n += 1)}-${Date.now().toString(36)}` });
}

// --------------------------------------------------------------------- browsers --
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let probing = false;
async function device({ width = 390, height = 844, mobile = true, motion = 'reduce' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: mobile, isMobile: mobile, reducedMotion: motion, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.console.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) (probing ? report.expected : report.console).push(`${m.type()}: ${m.text()}`); });
  return { ctx, page };
}
const hook = (page, s) => page.locator(`[data-test="${s}"]:visible`).first();
const settle = (page, ms = 700) => page.waitForTimeout(ms);
async function shot(page, name, { full = false, staff = false } = {}) {
  await settle(page);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: full });
  const seen = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const bits = [document.body.innerText];
    for (const el of document.querySelectorAll('[aria-label], [title], [placeholder], img[alt]')) if (vis(el)) bits.push(el.getAttribute('aria-label') || '', el.getAttribute('title') || '', el.getAttribute('placeholder') || '', el.getAttribute('alt') || '');
    return bits.join('\n');
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const hits = [];
  for (const [re, why] of [...FORBIDDEN, ...(staff ? STAFF_SCREEN : SCREEN_ONLY)]) { const m = re.exec(seen); if (m) hits.push(`${why}: “${m[0]}”`); }
  if (overflow) hits.push('the page scrolls sideways');
  report.screens.push({ name, url: page.url().replace(base, ''), hits });
  for (const h of hits) report.problems.push(`${name}: ${h}`);
  return seen;
}
async function signInUi(page, email, { invite = null, name = null } = {}) {
  await page.goto(`${base}/app/`);
  await hook(page, 'signin-email').waitFor();
  await hook(page, 'signin-email').fill(email);
  await hook(page, 'signin-send').click();
  await hook(page, 'signin-code').waitFor();
  await hook(page, 'signin-code').fill(stack.auth.mailbox(email));
  await hook(page, 'signin-continue').click();
  if (!invite) return;
  await hook(page, 'invite-code').waitFor();
  await hook(page, 'invite-code').fill(invite);
  await hook(page, 'invite-name').fill(name);
  await hook(page, 'invite-adult').click();
  await hook(page, 'invite-join').click();
}
async function welcome(page, { catching = false } = {}) {
  await hook(page, 'welcome').waitFor();
  for (let i = 0; i < 6 && await page.locator('[data-test="welcome-next"]:visible').count(); i++) { await hook(page, 'welcome-next').click(); await settle(page, 450); }
  if (catching) await hook(page, 'welcome-catching').click();
  await hook(page, 'welcome-enter').click();
  await hook(page, 'feeling-text').waitFor();
}
async function release(page, text, { label = null, fallback = false } = {}) {
  if (await page.locator('[data-test="release-another"]:visible').count()) await hook(page, 'release-another').click();
  else await hook(page, 'nav-release').click();
  if (await page.locator('[data-test="release-another"]:visible').count()) await hook(page, 'release-another').click();
  await hook(page, 'feeling-text').waitFor();
  await hook(page, 'feeling-text').fill(text);
  if (label) await hook(page, `label-${label}`).click();
  await hook(page, 'share-consent').click();
  if (fallback) await hook(page, 'allow-fallback').click();
  await hook(page, 'release-submit').click();
  await hook(page, 'release-sent').waitFor({ timeout: 20000 });
}
const tokenOf = async (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hushmates.session') || 'null'));
const journeysOf = async (who) => (await call(who, 'listJourneys')).journeys;

const author = await device();
const catcher = await device({ width: 1280, height: 860, mobile: false, motion: 'no-preference' });
const { page } = author;
try {
  // ----------------------------------------------------------- 1. signing in --
  await page.goto(`${base}/app/`);
  await hook(page, 'signin-email').waitFor();
  await shot(page, '01-signin-email');
  await hook(page, 'signin-email').fill('author@example.com');
  await hook(page, 'signin-send').click();
  await hook(page, 'signin-code').waitFor();
  await shot(page, '02-signin-code');
  probing = true;                                                       // a wrong code on purpose
  await hook(page, 'signin-code').fill('000000');
  await hook(page, 'signin-continue').click();
  await hook(page, 'signin-error').waitFor();
  await shot(page, '03-signin-wrong-code');
  probing = false;
  await hook(page, 'signin-code').fill(stack.auth.mailbox('author@example.com'));
  await hook(page, 'signin-continue').click();
  await hook(page, 'invite-code').waitFor();
  await shot(page, '04-invitation');
  await hook(page, 'invite-code').fill('authorcode1');
  await hook(page, 'invite-name').fill('Moonbeam');
  await hook(page, 'invite-adult').click();
  await hook(page, 'invite-join').click();
  await hook(page, 'welcome').waitFor();
  await shot(page, '05-welcome');
  check(!(await page.locator('[data-test="welcome-adult"]:visible').count()), 'the 18+ question isn’t asked twice');
  await welcome(page);
  check(!!(await tokenOf(page))?.accessToken, 'the author is signed in, the session kept on the device');
  // the script reads the author's account through a session of its own (sharing the phone's would,
  // rightly, end it: a refresh token used twice looks stolen)
  const A = await apiSignIn('author@example.com');

  // ----------------------------------------------- 2. five people catch one feeling --
  await hook(page, 'feeling-text').fill(F1);
  await hook(page, 'label-worry').click();
  await hook(page, 'share-consent').click();
  await shot(page, '06-release');
  await hook(page, 'release-submit').click();
  await hook(page, 'release-sent').waitFor({ timeout: 20000 });
  await shot(page, '07-release-sent');

  await signInUi(catcher.page, 'catcher@example.com', { invite: 'CATCHERCD2', name: 'Riverstone' });
  await welcome(catcher.page, { catching: true });
  await hook(catcher.page, 'nav-catch').click();
  await hook(catcher.page, 'find-feeling').click();
  await hook(catcher.page, 'catch-feeling').waitFor({ timeout: 20000 });
  const offered = await shot(catcher.page, '08-desktop-catch-offer');
  check(offered.includes('avoiding me'), 'the catcher is offered the author’s feeling');
  check(!/Moonbeam|author@/.test(offered), 'the catcher never learns who wrote it');
  await hook(catcher.page, 'catch-feeling').click();
  await hook(catcher.page, 'reframe-text').waitFor({ timeout: 15000 });
  await hook(catcher.page, 'reframe-text').fill(PERSPECTIVES[0]);
  await shot(catcher.page, '09-desktop-catch-write');
  await hook(catcher.page, 'reframe-submit').click();
  await catcher.page.waitForTimeout(2500);
  await shot(catcher.page, '10-desktop-catch-sent');
  // four more at the same moment, through their own apps
  const four = await Promise.allSettled(members.slice(0, 4).map((m, i) => answer(m, PERSPECTIVES[i + 1])));
  check(four.every((x) => x.status === 'fulfilled' && x.value), `four people wrote at once (${four.map((x) => x.status).join(', ')})`);
  const late = await call(members[4], 'findFeeling');
  check(!late.offer, 'a sixth person isn’t offered a feeling that has five');
  const j1 = (await journeysOf(A)).find((j) => j.text === F1);
  check(j1?.status === 'returned' && j1.humanCount === 5, `the feeling came home with five (${j1?.status}, ${j1?.humanCount})`);
  check((await sql('select count(*)::int n from hushmates.perspectives where journey_id = $1', [j1.id]))[0].n === 5, 'five perspectives in the database, no more');
  await page.reload();
  await hook(page, 'nav-returned').waitFor({ timeout: 20000 });
  await hook(page, 'nav-returned').click();
  await page.locator('[data-test^="returned-"]:visible').first().waitFor({ timeout: 20000 });
  await shot(page, '11-returned-shelf');
  await page.locator('[data-test^="returned-"]:visible').first().click();
  await hook(page, 'homecoming-ready').waitFor({ timeout: 30000 });
  const home5 = await shot(page, '12-homecoming-five');
  check(/5 of 5 human perspectives/.test(home5), 'the homecoming says five people caught it');

  // --------------------------- 3. two people (partial), nobody (zero), and the Mallow --
  await page.getByRole('button', { name: 'Back' }).first().click().catch(() => {});
  await release(page, F3, { label: 'worry' });
  const two = await Promise.allSettled(members.slice(0, 2).map((m, i) => answer(m, PERSPECTIVES[i + 2])));
  check(two.every((x) => x.status === 'fulfilled' && x.value), 'two people wrote on the second feeling');
  await release(page, F2, { label: 'sadness', fallback: true });
  await release(page, F4, { label: 'worry' });
  // 31 minutes, nobody caught the one that allows the Mallow: the scheduler prepares it, the app closed or not
  await advance(31 * 60e3);
  const j2 = (await journeysOf(A)).find((j) => j.text === F2);
  check(j2?.fallback?.status === 'ready' && j2.fallback.seen === false, `the Mallow’s perspective was prepared by the scheduler (${JSON.stringify(j2?.fallback?.status)})`);
  check((await journeysOf(A)).find((j) => j.text === F4)?.fallback?.status === 'off', 'no Mallow without the person’s consent');
  await page.reload();
  await hook(page, 'nav-journeys').waitFor({ timeout: 20000 });
  await hook(page, 'nav-journeys').click();
  await page.locator('[data-test^="journey-"]:visible').first().waitFor();
  await shot(page, '13-journeys');
  await hook(page, `journey-${j2.id}`).click();
  await hook(page, 'mallow-reveal').waitFor({ timeout: 15000 });
  await shot(page, '14-mallow-found');
  await hook(page, 'mallow-reveal').click();
  await page.locator('[data-test="perspective"][data-kind="mallow"]').first().waitFor({ timeout: 15000 });
  await settle(page, 1500);
  const mallowSeen = await shot(page, '15-mallow-perspective');
  check(/Automatically generated/i.test(mallowSeen), 'the Mallow’s perspective is labelled as automatic, never as a person');
  check((await sql('select seen, source from hushmates.mallow_perspectives where journey_id = $1', [j2.id]))[0]?.seen === true, 'seeing it was recorded');
  check((await sql('select source from hushmates.mallow_perspectives where journey_id = $1', [j2.id]))[0]?.source === 'library', 'it came from the free library (AI is off)');
  // a day later everything comes home, the app closed
  await page.getByRole('button', { name: 'Back' }).first().click().catch(() => {});
  probing = true;                                                       // tokens expire across the jump: the app refreshes (401 first)
  await advance(24 * 3600e3);
  const all = await journeysOf(A);
  const [j3, j4, j2b] = [F3, F4, F2].map((t) => all.find((j) => j.text === t));
  check(j3.status === 'returned' && j3.humanCount === 2, `two people: came home with 2 (${j3.humanCount})`);
  check(j4.status === 'returned' && j4.humanCount === 0, `nobody: came home with 0 (${j4.humanCount})`);
  check(j2b.status === 'returned' && j2b.humanCount === 0, 'the Mallow isn’t counted as a person');
  await page.reload();
  await hook(page, 'nav-returned').waitFor({ timeout: 20000 });
  await hook(page, 'nav-returned').click();
  await hook(page, `returned-${j3.id}`).click();
  await hook(page, 'homecoming-ready').waitFor({ timeout: 30000 });
  probing = false;
  const partial = await shot(page, '16-homecoming-two');
  check(/2 Hushmates|2 of 5 human/.test(partial) && !/5 of 5/.test(partial), 'the homecoming says two people, not five');
  await page.getByRole('button', { name: 'Back' }).first().click();
  await hook(page, `returned-${j4.id}`).click();
  await page.waitForTimeout(2500);
  const zero = await shot(page, '17-homecoming-nobody');
  check(!/\d Hushmates? caught/.test(zero) && /No one|nobody/i.test(zero), 'nobody: says so plainly, invents no one');
  await page.getByRole('button', { name: 'Back' }).first().click();

  // ------------------------------------------------- 4. connection lost, then back --
  probing = true;
  await author.ctx.setOffline(true);
  await hook(page, 'nav-release').click();
  if (await page.locator('[data-test="release-another"]:visible').count()) await hook(page, 'release-another').click();
  await hook(page, 'feeling-text').fill('I feel unsettled today and I can’t say why.');
  await hook(page, 'share-consent').click();
  await hook(page, 'release-submit').click();
  await page.waitForTimeout(2500);
  const offline = await shot(page, '18-offline');
  check(/connection|offline|internet/i.test(offline), 'offline: says so in plain words');
  await author.ctx.setOffline(false);
  await page.waitForTimeout(1500);
  await hook(page, 'release-submit').click();
  await hook(page, 'release-sent').waitFor({ timeout: 20000 });
  check(true, 'back online: the same feeling went (once)');
  probing = false;
  const sentTwice = await sql("select count(*)::int n from hushmates.journeys where text_mac = (select text_mac from hushmates.journeys order by created_at desc limit 1)");
  check(sentTwice[0].n === 1, 'the retried feeling exists once');

  // --------------------------------------- 5. words that need care: support, nothing sent --
  await hook(page, 'nav-release').click();
  if (await page.locator('[data-test="release-another"]:visible').count()) await hook(page, 'release-another').click();
  await hook(page, 'feeling-text').fill('I don’t want to be here anymore');
  await hook(page, 'share-consent').click().catch(() => {});
  await hook(page, 'release-submit').click();
  await page.locator('[data-test="support-scene"]').waitFor({ timeout: 15000 });
  const support = await shot(page, '19-support-au', { full: true });
  check(/000/.test(support) && /13 11 14/.test(support), 'support shows Australian crisis lines (000, Lifeline)');
  check(!(await sql("select 1 from hushmates.journeys where text_mac is not null and text_enc like '%want to be here%'")).length, 'words needing care were never stored');
  await hook(page, 'support-clear').click();

  // ------------------------------------------------ 6. reporting, and the safety desk --
  const unkind = members[5];
  for (const j of (await journeysOf(A)).filter((x) => x.status === 'travelling')) await call(A, 'withdrawFeeling', { journeyId: j.id });
  await call(unkind, 'submitFeeling', { text: 'Everyone at my work is useless and I can’t stand any of them.', label: 'anger', consent: true, clientId: `e2e-unkind-${Date.now().toString(36)}` });
  if (await catcher.page.locator('[data-test="catch-another"]:visible').count()) await hook(catcher.page, 'catch-another').click();
  else { await hook(catcher.page, 'nav-catch').click(); await hook(catcher.page, 'find-feeling').click(); }
  await hook(catcher.page, 'offer-more').waitFor({ timeout: 20000 });
  check((await catcher.page.locator('body').innerText()).includes('useless'), 'the catcher is offered the feeling they then report');
  await hook(catcher.page, 'offer-more').click();
  await hook(catcher.page, 'report-feeling').click();
  await hook(catcher.page, 'reason-unkind').click();
  await hook(catcher.page, 'report-send').click();
  await hook(catcher.page, 'report-received').waitFor({ timeout: 15000 });
  await shot(catcher.page, '20-desktop-report-received');
  const desk = await device({ width: 1280, height: 860, mobile: false, motion: 'no-preference' });
  await desk.page.goto(`${base}/staff/`);
  await desk.page.locator('#signin-email').fill('safety@example.com');
  await desk.page.keyboard.press('Enter');
  await desk.page.locator('#signin-code').waitFor();
  await desk.page.locator('#signin-code').fill(stack.auth.mailbox('safety@example.com'));
  await desk.page.keyboard.press('Enter');
  await desk.page.locator('#join-code').waitFor();
  await desk.page.locator('#join-code').fill('SAFETYDESK1');
  await desk.page.locator('#join-name').fill('Careful Cloud');
  await desk.page.locator('#join-adult').check();
  await desk.page.locator('[data-test="desk-join"] button[type="submit"]').click();
  await desk.page.locator('[data-test="desk-report"]').first().waitFor({ timeout: 15000 });
  await shot(desk.page, '21-desk-queue', { staff: true });
  await desk.page.locator('[data-test="desk-report"]').first().click();
  await desk.page.locator('[data-test="desk-detail"]').waitFor();
  const evidence = await shot(desk.page, '22-desk-report', { staff: true, full: true });
  check(evidence.includes('useless'), 'the desk shows the reported words');
  check(!/Emberly|member5@/.test(evidence), 'the desk never shows who wrote them');
  desk.page.on('dialog', (d) => d.accept());
  await desk.page.locator('#resolve-note').fill('Aimed at a whole team: taken out of circulation.');
  await desk.page.locator('[data-test="desk-remove-feeling"]').click();
  await desk.page.locator('[data-test="desk-decided"]').waitFor();
  await shot(desk.page, '23-desk-decided', { staff: true, full: true });
  await desk.page.locator('[data-test="desk-tab-activity"]').click();
  await desk.page.locator('[data-test="desk-activity"]').waitFor();
  await shot(desk.page, '24-desk-activity', { staff: true, full: true });
  check((await sql("select paused from hushmates.journeys where owner = (select member_id from hushmates.identities i join auth.users u on u.id::text = i.subject where u.email = 'member5@example.com')"))[0]?.paused === true, 'the decision took it out of circulation');
  // a member can't use the desk
  const nosy = await device({ width: 1280, height: 860, mobile: false });
  await nosy.page.goto(`${base}/staff/`);
  await nosy.page.locator('#signin-email').fill('member0@example.com');
  await nosy.page.keyboard.press('Enter');
  await nosy.page.locator('#signin-code').waitFor();
  await nosy.page.locator('#signin-code').fill(stack.auth.mailbox('member0@example.com'));
  await nosy.page.keyboard.press('Enter');
  await nosy.page.locator('[data-test="desk-not-staff"]').waitFor({ timeout: 15000 });
  await shot(nosy.page, '25-desk-not-for-members', { staff: true });
  await nosy.ctx.close();
  await desk.ctx.close();

  // ---------------------------------------- 7. blocking: their words never reach you --
  const catcherApi = await apiSignIn('catcher@example.com');
  const fromCatcher = (await call(A, 'getJourney', { journeyId: j1.id })).collection.find((p) => p.text === PERSPECTIVES[0]);
  await call(A, 'blockContributor', { journeyId: j1.id, perspectiveId: fromCatcher.id });
  const blockedSee = await call(A, 'getJourney', { journeyId: j1.id });
  check(!blockedSee.collection.some((p) => p.text === PERSPECTIVES[0]), 'a blocked person’s words leave the collection');
  check(blockedSee.humanCount === 4, `the count stays truthful after blocking (${blockedSee.humanCount})`);
  for (const j of (await journeysOf(A)).filter((x) => x.status === 'travelling')) await call(A, 'withdrawFeeling', { journeyId: j.id });
  await call(A, 'submitFeeling', { text: 'I’m dreading the family dinner this weekend.', label: 'worry', consent: true, clientId: `e2e-after-block-${Date.now().toString(36)}` });
  const offerToBlocked = await call(catcherApi, 'findFeeling');
  check(!offerToBlocked.offer || !/family dinner/.test(offerToBlocked.offer.text), 'the blocked person is never offered the blocker’s feelings');
  check(!JSON.stringify(await call(catcherApi, 'myGifts')).includes('blocked'), 'nobody is told they were blocked');

  // ----------------------------------------------------- 8. only the keyboard --
  const kb = await device({ width: 1280, height: 860, mobile: false, motion: 'no-preference' });
  await kb.page.goto(`${base}/app/`);
  await hook(kb.page, 'signin-email').waitFor();
  let reached = false;
  for (let i = 0; i < 15 && !reached; i++) { await kb.page.keyboard.press('Tab'); reached = await kb.page.evaluate(() => document.activeElement?.dataset?.test === 'signin-email'); }
  check(reached, 'the email field is reachable with Tab');
  await kb.page.keyboard.type('keyboard@example.com');
  await kb.page.keyboard.press('Enter');
  await hook(kb.page, 'signin-code').waitFor();
  check(await kb.page.evaluate(() => /code/i.test(document.activeElement?.textContent || '') || document.activeElement?.tagName === 'H1' || document.activeElement?.dataset?.test === 'signin-code'), 'focus moves to the code step');
  if (await kb.page.evaluate(() => document.activeElement?.dataset?.test !== 'signin-code')) {
    for (let i = 0; i < 6; i++) { await kb.page.keyboard.press('Tab'); if (await kb.page.evaluate(() => document.activeElement?.dataset?.test === 'signin-code')) break; }
  }
  await kb.page.keyboard.type(stack.auth.mailbox('keyboard@example.com'));
  await kb.page.keyboard.press('Enter');
  await hook(kb.page, 'invite-code').waitFor();
  for (let i = 0; i < 10; i++) { if (await kb.page.evaluate(() => document.activeElement?.dataset?.test === 'invite-code')) break; await kb.page.keyboard.press('Tab'); }
  await kb.page.keyboard.type('KEYBOARDC3');
  await kb.page.keyboard.press('Tab');
  await kb.page.keyboard.type('Quietly');
  for (let i = 0; i < 6; i++) { await kb.page.keyboard.press('Tab'); if (await kb.page.evaluate(() => document.activeElement?.dataset?.test === 'invite-adult')) break; }
  await kb.page.keyboard.press('Space');
  await shot(kb.page, '26-desktop-keyboard-invitation');
  for (let i = 0; i < 6; i++) { await kb.page.keyboard.press('Tab'); if (await kb.page.evaluate(() => document.activeElement?.dataset?.test === 'invite-join')) break; }
  await kb.page.keyboard.press('Enter');
  await hook(kb.page, 'welcome').waitFor({ timeout: 15000 });
  check(true, 'signing in and joining work with the keyboard alone');
  const ring = await kb.page.evaluate(() => { const el = document.activeElement; const s = el && getComputedStyle(el); return !!s && (s.outlineStyle !== 'none' || s.boxShadow !== 'none'); });
  check(ring, 'the focused control shows where focus is');
  await kb.ctx.close();

  // --------------------------------- 9. the author’s laptop: the same account --
  const laptop = await device({ width: 1280, height: 860, mobile: false, motion: 'no-preference' });
  await signInUi(laptop.page, 'author@example.com');
  await hook(laptop.page, 'nav-journeys').waitFor({ timeout: 20000 });
  await hook(laptop.page, 'nav-returned').click();
  await laptop.page.locator('[data-test^="returned-"]:visible').first().waitFor({ timeout: 20000 });
  const laptopSees = await shot(laptop.page, '27-desktop-same-account');
  check(laptopSees.includes('avoiding me') || (await laptop.page.locator('[data-test^="returned-"]').count()) >= 3, 'a new device has everything (no second invitation)');
  await laptop.ctx.close();

  // --------------------------------------- 10. your data, then delete it all --
  await hook(page, 'open-you').click();
  await hook(page, 'open-data').waitFor();
  await shot(page, '28-you');
  await hook(page, 'open-data').click();
  await hook(page, 'data-feelings').waitFor();
  await shot(page, '29-your-data');
  const [download] = await Promise.all([page.waitForEvent('download'), hook(page, 'download-data').click()]);
  const saved = join(out, 'downloaded-data.json');
  await download.saveAs(saved);
  const file = readFileSync(saved, 'utf8');
  check(!/Riverstone|Cloudlet|Starling|catcher@|member\d@/.test(file), 'the download names nobody else');
  check(!/hmenc:|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/.test(file), 'the download has no locked text or internal ids');
  check(file.includes('avoiding me'), 'the download has the person’s own words');
  rmSync(saved);
  await page.getByRole('button', { name: 'Back' }).first().click();
  await hook(page, 'delete-data').click();
  await hook(page, 'confirm').click();
  await page.locator('[data-test="deleted"]').waitFor({ timeout: 20000 });
  await shot(page, '30-deleted');
  check(!(await sql("select 1 from auth.users where email = 'author@example.com'")).length, 'deleting removed the sign-in');
  check(!(await sql("select 1 from hushmates.journeys j join hushmates.members m on m.id = j.owner where m.state = 'deleted' and j.text_enc <> ''")).length, 'deleting removed the words');
  check((await call(members[0], 'myGifts')).gifts.length >= 1, 'other people’s own data is untouched');

  // ------------------------------------------------------ 11. small screens --
  const small = await device({ width: 320, height: 568 });
  await small.page.goto(`${base}/app/`);
  await hook(small.page, 'signin-email').waitFor();
  await shot(small.page, '31-320-signin');
  await signInUi(small.page, 'member1@example.com');
  await hook(small.page, 'nav-journeys').waitFor({ timeout: 20000 });
  await hook(small.page, 'nav-journeys').click();
  await settle(small.page, 1200);
  await shot(small.page, '32-320-journeys');
  await small.ctx.close();

  // ---------------------------------- 12. the lab doesn't exist for a customer --
  probing = true;
  for (const path of ['/lab/', '/lab/index.html', '/core/relay-seed.js', '/lab/?key=anything']) {
    const r = await catcher.page.goto(base + path);
    check(r.status() === 404, `${path} isn’t there for a customer`);
  }
  probing = false;
} catch (e) {
  report.problems.push(`flow stopped: ${e.message.split('\n')[0]}`);
  await page.screenshot({ path: join(out, 'zz-stopped-author.png') }).catch(() => {});
  await catcher.page.screenshot({ path: join(out, 'zz-stopped-catcher.png') }).catch(() => {});
} finally {
  await browser.close();
  await stack.close();
  await db.drop();
  rmSync(dist, { recursive: true, force: true });
}
// a 4xx answer the script asked for (a wrong code, offline) is logged by the browser as "Failed to load resource"
// tokens expire when the script moves the clock a day on: the app's refresh answers the 401 (expected)
const unexpected = report.console.filter((c) => !/status of 401 \(Unauthorized\)/.test(c));
report.problems.push(...unexpected.map((c) => `console: ${c}`));
writeFileSync(join(out, 'app-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.checks.filter((c) => c.ok).length}/${report.checks.length} checks passed, ${report.screens.length} screens, ${report.problems.length} problems`);
for (const p of report.problems) console.log(`  ${p}`);
process.exit(report.problems.length ? 1 : 0);
