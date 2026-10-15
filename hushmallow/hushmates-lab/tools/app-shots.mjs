#!/usr/bin/env node
// End to end, with many real accounts, on the whole local stack: the production build of the
// app and the safety desk, served with the real backend (Postgres with the real migrations, the
// local copy of Supabase Auth's email-code sign-in, and the Edge Function's own code). Nothing
// is simulated in between: each person signs in with an email code (read from the local Auth
// copy's mailbox: no email is sent), joins with an invitation, and the browsers and the other
// members' apps all talk to the same gateway over HTTP.
//
//   node tools/app-shots.mjs <out-dir>
//   HUSHMATES_EDGE=deno HUSHMATES_DENO=<path to deno> node tools/app-shots.mjs <out-dir>
//     the same run with the real Edge Function entry point (supabase/functions/hushmates/index.ts)
//     under Deno, reaching the database over HTTP through the local PostgREST stand-in; Deno keeps
//     real time, so only the database's clock moves (sessions don't age)
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
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, FORBIDDEN } from './build-app.mjs';
import { builtFiles } from '../server/server.mjs';
import { startDevStack } from '../server/dev-stack.mjs';
import { freshDb } from '../tests/backend-helpers.mjs';

// Playwright from this project if it's installed (npm i --no-save playwright), else this container's copy
const playwright = (() => { try { return createRequire(import.meta.url)('playwright'); } catch { return createRequire('/opt/node-tools/node_modules/')('playwright'); } })();
const { chromium } = playwright;
const CHROMIUM = process.env.HUSHMATES_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
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
const PRIVATE_P = 'Going over it again might show how much you care about doing well, not that it went badly.';   // its writer keeps it out of share pictures
const RESEND_P = 'First days are new for everyone. Being nervous might mean it matters to you.';
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
const EDGE = process.env.HUSHMATES_EDGE === 'deno' ? 'deno' : 'node';
const stack = await startDevStack({
  port, pool: db.pool, files, keysFile: join(dist, 'keys.json'), quiet: true, tickMs: 3600e3,
  ...(EDGE === 'deno' ? { edge: 'deno', deno: process.env.HUSHMATES_DENO || 'deno', dbNow: () => clock.t } : { now: () => clock.t, moveDbClock: true }),
  invites: MEMBER_CODES, staffInvites: ['SAFETYDESK1'], log: { log() {}, error: (...a) => report.server.push(a.join(' ')) },
});
const base = stack.origin;
const ANON = JSON.parse(readFileSync(new URL('../app/config.json', import.meta.url), 'utf8')).supabaseAnonKey;
const report = { stack: EDGE === 'deno'
  ? 'production build + local Postgres + local Supabase Auth copy + the real Edge Function entry point under Deno (supabase/functions/hushmates/index.ts), through the local PostgREST stand-in'
  : 'production build + local Postgres + local Supabase Auth copy + the Edge Function code', checks: [], screens: [], problems: [], console: [], expected: [], server: [] };
const check = (ok, what) => { report.checks.push({ ok: !!ok, what }); if (!ok) report.problems.push(`check failed: ${what}`); };
const sql = async (q, p) => (await db.pool.query(q, p)).rows;
// moving the clock an hour or more ages every open session: each page's next call may be refused once (401) and refreshed
const sessions = [];
const advance = async (ms) => { clock.t += ms; if (ms >= 3600e3) for (const s of sessions) s.aged = true; await stack.gateway.tick(); };

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
async function answer(who, text, { allowShare = true } = {}) {
  const { offer } = await call(who, 'findFeeling');
  if (!offer) return null;
  await call(who, 'catchFeeling', { holdId: offer.holdId });
  return call(who, 'submitReframe', { holdId: offer.holdId, text, allowShare, clientId: `e2e-${(n += 1)}-${Date.now().toString(36)}` });
}

// --------------------------------------------------------------------- browsers --
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let probing = false;
async function device({ width = 390, height = 844, mobile = true, motion = 'reduce' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: mobile, isMobile: mobile, reducedMotion: motion, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.console.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) (probing ? report.expected : report.console).push(`${m.type()}: ${m.text()}`); });
  // every refusal of a session is accounted for: the script asked for it, or the clock aged the session
  const session = { aged: false };
  sessions.push(session);
  page.on('response', (r) => {
    if (!r.url().includes('/functions/v1/hushmates/rpc/')) return;
    if (r.status() === 401) { if (!probing && !session.aged) report.problems.push(`unexpected 401: ${r.url().replace(base, '')}`); else report.refreshed = (report.refreshed || 0) + 1; }
    else if (r.ok()) session.aged = false;
  });
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
// what a share picture or video actually draws: the text drawn on canvases that aren't on the
// screen (the preview is; the picture and the video are drawn off screen), from each page's start
await page.addInitScript(() => {
  window.__drawn = new Set();
  for (const C of [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D].filter(Boolean)) {
    const real = C.prototype.fillText;
    C.prototype.fillText = function fillText(t, ...rest) { if (!this.canvas?.isConnected) window.__drawn.add(String(t)); return real.call(this, t, ...rest); };
  }
});
const drawnText = async () => (await page.evaluate(() => [...window.__drawn])).join(' ');
const clearDrawn = () => page.evaluate(() => window.__drawn.clear());
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
  const two = await Promise.allSettled([answer(members[0], PERSPECTIVES[2]), answer(members[1], PRIVATE_P, { allowShare: false })]);
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

  // ---------------- 3b. another angle, the share story, and a second journey for the quiet one --
  // Explore another angle on the two-person feeling: one Mallow perspective, labelled, and still two people
  await hook(page, `returned-${j3.id}`).click();
  await hook(page, 'explore-angle').waitFor({ timeout: 20000 });
  await hook(page, 'explore-angle').click();
  await hook(page, 'confirm').click();
  await page.locator('[data-test="perspective"][data-kind="mallow"]').first().waitFor({ timeout: 20000 });
  await settle(page, 1500);
  const angle = await shot(page, '17a-explore-angle');
  check(/Automatically generated/i.test(angle), 'Explore another angle: the Mallow’s perspective is labelled as automatic');
  const j3m = await sql('select source, requested_by from hushmates.mallow_perspectives where journey_id = $1', [j3.id]);
  check(j3m.length === 1 && j3m[0].source === 'library', `Explore another angle: one perspective, from the free library (${JSON.stringify(j3m)})`);
  check((await journeysOf(A)).find((j) => j.id === j3.id)?.humanCount === 2, 'Explore another angle: the count of people stays 2');
  // the share story: a perspective its writer kept private is never offered for the picture
  await hook(page, 'share-journey').click();
  await hook(page, 'share-preview').waitFor({ timeout: 15000 });
  const story = await shot(page, '17b-share-story', { full: true });
  check(!story.includes(PRIVATE_P), 'the share story leaves out a perspective its writer kept private');
  check(/kept theirs private/.test(story), 'and says only that a Hushmate kept theirs private');
  check(story.includes(PERSPECTIVES[2]), 'a perspective its writer allowed can be chosen');
  const humanPick = page.locator('[data-test="share-pick"][data-kind="human"]:visible');
  const mallowPick = page.locator('[data-test="share-pick"][data-kind="mallow"]:visible');
  await humanPick.first().click();
  await mallowPick.first().click();
  // its writer stops sharing while the screen is open: nothing is made, and their words go from the choices
  const allowedGift = (await call(members[0], 'myGifts')).gifts.find((g) => g.text === PERSPECTIVES[2]);
  await call(members[0], 'setGiftSharing', { perspectiveId: allowedGift.id, allowShare: false });
  await clearDrawn();
  await hook(page, 'share-save').click();
  await page.locator('.hm-toast', { hasText: 'stopped sharing' }).waitFor({ timeout: 15000 });
  await shot(page, '17c-share-writer-stopped');
  check(!(await page.locator('[data-test="share-image"]').count()), 'a writer stopped sharing while the screen was open: no picture is made');
  check(!(await drawnText()), 'and nothing was drawn for one');
  check(!(await humanPick.count()) && !(await page.locator('body').innerText()).includes(PERSPECTIVES[2]), 'their words are no longer offered, or shown');
  // they allow it again: the screen follows by itself (the app's next look at the journeys)
  await call(members[0], 'setGiftSharing', { perspectiveId: allowedGift.id, allowShare: true });
  await humanPick.first().waitFor({ timeout: 40000 });
  check((await mallowPick.first().getAttribute('aria-checked')) === 'true', 'the share screen followed the change without losing the other choice');
  // a keyboard user on a choice keeps their place when a refresh brings nothing new (the app looks every 20 seconds)
  await mallowPick.first().focus();
  await settle(page, 25000);
  check(await page.evaluate(() => document.activeElement?.dataset?.test === 'share-pick' && document.activeElement.dataset.kind === 'mallow'),
    'a refresh with nothing new leaves a keyboard user’s focus where it was');
  await humanPick.first().click();
  await clearDrawn();
  await hook(page, 'share-save').click();
  await hook(page, 'share-image').waitFor({ timeout: 20000 });
  await shot(page, '17c-share-picture');
  const pictured = await drawnText();
  const j3now = (await journeysOf(A)).find((j) => j.id === j3.id);
  const mallowWords = [...(j3now?.collection || []), ...(j3now?.mallowExtra ? [j3now.mallowExtra] : [])].find((p) => p.kind === 'mallow')?.text || '';
  check(mallowWords.length > 20, 'the Mallow’s words to look for are known');
  check(pictured.includes(PERSPECTIVES[2].split(' ').slice(0, 3).join(' ')), 'the picture draws the perspective its writer allowed');
  check(!pictured.includes(PRIVATE_P.split(' ').slice(0, 4).join(' ')), 'the picture never draws the one its writer kept private');
  check(!/Moonbeam|author@example|Starling|Cloudlet|member0@/i.test(pictured), 'the picture names nobody');
  // the Mallow's perspective on its own: drawn with its whole label, never as a person's
  await page.getByRole('button', { name: 'Done' }).click();
  await humanPick.first().click();
  await clearDrawn();
  await hook(page, 'share-save').click();
  await hook(page, 'share-image').waitFor({ timeout: 20000 });
  const mallowPictured = await drawnText();
  const opening = mallowWords.split(' ').slice(0, 3).join(' ') || '(none)';
  report.drawn = { picture: pictured, mallowPicture: mallowPictured };          // the evidence: every line the pictures drew
  const labelled = (t) => /A MALLOW PERSPECTIVE/i.test(t) && /AUTOMATICALLY/i.test(t) && /GENERATED/i.test(t) && !/HUSHMATE’S PERSPECTIVE/i.test(t);
  // a long one may not fit the still (the screen says so); then the picture leaves it out whole, label and words together
  check(!!mallowWords && (mallowPictured.includes(opening) ? labelled(mallowPictured) : !/A MALLOW PERSPECTIVE/i.test(mallowPictured)),
    `a Mallow perspective in the picture carries its whole label, or is left out whole (${mallowPictured.includes(opening) ? 'drawn' : 'too long for the still'})`);
  check(/Two strangers saw it differently/.test(mallowPictured), 'and the picture counts people only: two, not three');
  await page.getByRole('button', { name: 'Done' }).click();
  // the video shows every perspective chosen, each in turn: the Mallow's with its label, frame by frame
  if (await page.locator('[data-test="share-video"]:visible').count()) {
    await clearDrawn();
    await hook(page, 'share-video').click();
    await hook(page, 'share-video-out').waitFor({ timeout: 90000 });
    const filmed = await drawnText();
    check(filmed.includes(opening) && labelled(filmed), 'the video draws the Mallow’s perspective with “A Mallow perspective · Automatically generated”');
    await shot(page, '17c-share-video');
    await page.getByRole('button', { name: 'Done' }).click();
    // a writer stops sharing while a video of their words is recording: it is stopped or thrown away, never handed over
    await humanPick.first().click();
    await hook(page, 'share-video').click();
    await hook(page, 'share-video-making').waitFor({ timeout: 15000 });
    await call(members[0], 'setGiftSharing', { perspectiveId: allowedGift.id, allowShare: false });
    await page.locator('.hm-toast', { hasText: /video (was stopped and )?wasn’t kept/ }).waitFor({ timeout: 90000 });
    await shot(page, '17c-share-video-stopped');
    check(!(await page.locator('[data-test="share-video-out"]').count()) && !(await page.locator('[data-test="share-video-making"]').count()),
      'a writer stopped sharing while a video with their words was recording: the video is stopped or not kept, never handed over');
    check(!(await humanPick.count()) && (await mallowPick.first().getAttribute('aria-checked')) === 'true', 'their words are no longer offered, and the other choice stays');
    await call(members[0], 'setGiftSharing', { perspectiveId: allowedGift.id, allowShare: true });
    await humanPick.first().waitFor({ timeout: 40000 });
    await page.locator('.hm-toast').first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  } else report.expected.push('this browser can’t record video: the video checks were not run');
  // its writer takes their words back while the screen is open: nothing is made, and the words are gone from the choices
  await humanPick.first().click();
  await call(members[0], 'withdrawPerspective', { perspectiveId: allowedGift.id });
  await clearDrawn();
  await hook(page, 'share-save').click();
  await page.locator('.hm-toast', { hasText: 'isn’t available any more' }).waitFor({ timeout: 15000 });
  check(!(await page.locator('[data-test="share-image"]').count()) && !(await drawnText()), 'a writer took their words back mid-share: nothing is made or drawn');
  check(!(await humanPick.count()) && !(await page.locator('body').innerText()).includes(PERSPECTIVES[2]), 'and their words are gone from the screen');
  // the author lets the feeling go in another tab, having chosen their own words: they go, and the Mallow's (not kept) with them
  await page.locator('.hm-toast').first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  await hook(page, 'share-words').click();
  await call(A, 'releaseJourney', { journeyId: j3.id });
  await clearDrawn();
  await hook(page, 'share-save').click();
  await page.locator('.hm-toast', { hasText: 'was let go' }).waitFor({ timeout: 15000 });
  await shot(page, '17c-share-let-go');
  check(!(await page.locator('[data-test="share-image"]').count()) && !(await drawnText()), 'the feeling was let go mid-share: nothing is made until the author looks again');
  check(!(await page.locator('[data-test="share-words"]').count()), 'and “Include my own words” is gone');
  await page.locator('.hm-toast').first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  await clearDrawn();
  await hook(page, 'share-save').click();
  await hook(page, 'share-image').waitFor({ timeout: 20000 });
  const afterLetGo = await drawnText();
  check(!afterLetGo.includes('replaying what I said') && !afterLetGo.includes(PERSPECTIVES[2].split(' ').slice(0, 3).join(' '))
    && !afterLetGo.includes(PRIVATE_P.split(' ').slice(0, 4).join(' ')) && !afterLetGo.includes(opening), 'a picture made afterwards draws none of the words that were let go or taken back');
  await page.getByRole('button', { name: 'Done' }).click();
  // the same journey deleted elsewhere while its share screen is still open: nothing is made, and making is switched off
  probing = true;                                                        // the check is refused on purpose: the journey is gone
  await call(A, 'deleteJourney', { journeyId: j3.id, confirm: 'DELETE' });
  await clearDrawn();
  await hook(page, 'share-save').click();
  await page.locator('.hm-toast', { hasText: 'isn’t here any more' }).waitFor({ timeout: 15000 });
  probing = false;
  const videoOff = !(await page.locator('[data-test="share-video"]').count()) || await hook(page, 'share-video').isDisabled();
  check(!(await page.locator('[data-test="share-image"]').count()) && !(await drawnText()) && await hook(page, 'share-save').isDisabled() && videoOff, 'a journey deleted mid-share: nothing is made, and both buttons are switched off');
  // Send it out again: the quiet feeling travels once more, a second account catches it, it comes home with 1
  await page.goto(`${base}/app/`);
  await hook(page, 'nav-returned').waitFor({ timeout: 20000 });
  await hook(page, 'nav-returned').click();
  await hook(page, `returned-${j4.id}`).click();
  await hook(page, 'send-again').waitFor({ timeout: 20000 });
  await hook(page, 'send-again').click();
  await hook(page, 'confirm').click();
  await hook(page, `journey-${j4.id}`).waitFor({ timeout: 20000 });
  check((await journeysOf(A)).find((j) => j.id === j4.id)?.status === 'travelling', 'Send it out again: the feeling travels again');
  probing = true;                                                       // the catcher's session aged a day: the app refreshes it (401 first)
  await catcher.page.goto(`${base}/app/`);
  await hook(catcher.page, 'nav-catch').waitFor({ timeout: 20000 });
  await hook(catcher.page, 'nav-catch').click();
  await hook(catcher.page, 'find-feeling').click();
  await hook(catcher.page, 'catch-feeling').waitFor({ timeout: 20000 });
  check((await catcher.page.locator('body').innerText()).includes('new job'), 'a second account is offered the feeling sent out again');
  await hook(catcher.page, 'catch-feeling').click();
  await hook(catcher.page, 'reframe-text').waitFor({ timeout: 15000 });
  await hook(catcher.page, 'reframe-text').fill(RESEND_P);
  await hook(catcher.page, 'reframe-submit').click();
  await catcher.page.waitForTimeout(2500);
  probing = false;
  check((await sql('select count(*)::int n from hushmates.perspectives where journey_id = $1', [j4.id]))[0].n === 1, 'the second account’s perspective was stored once');
  probing = true;
  await advance(24 * 3600e3 + 60e3);
  const j4b = (await journeysOf(A)).find((j) => j.id === j4.id);
  check(j4b?.status === 'returned' && j4b.humanCount === 1 && j4b.resends === 1, `it came home again with 1 (${j4b?.status}, ${j4b?.humanCount}, sent out again ${j4b?.resends})`);
  await page.goto(`${base}/app/`);
  await hook(page, 'nav-returned').waitFor({ timeout: 20000 });
  await hook(page, 'nav-returned').click();
  await hook(page, `returned-${j4.id}`).click();
  await hook(page, 'homecoming-ready').waitFor({ timeout: 30000 });
  probing = false;
  const again = await shot(page, '17d-resend-home-one');
  check(/\b1 Hushmate\b/.test(again) && /1 of 5/.test(again) && !/5 of 5/.test(again), 'the second homecoming says one person, truthfully');
  check(again.includes(RESEND_P), 'and shows that person’s perspective');
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
  const storedBefore = (await sql('select count(*)::int n from hushmates.journeys'))[0].n;
  await hook(page, 'release-submit').click();
  await page.locator('[data-test="support-scene"]').waitFor({ timeout: 15000 });
  const support = await shot(page, '19-support-au', { full: true });
  check(/000/.test(support) && /13 11 14/.test(support), 'support shows Australian crisis lines (000, Lifeline)');
  check(await page.locator('[data-test="support-call"][href="tel:000"]:visible').count() > 0 && await page.locator('[data-test="support-call"][href="tel:131114"]:visible').count() > 0,
    'the crisis lines can be tapped to call (000, Lifeline)');
  check((await sql('select count(*)::int n from hushmates.journeys'))[0].n === storedBefore, 'words needing care were never stored (no new feeling in the database)');
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
  await desk.page.clock.install();                                      // time flows as usual, and the test can skip a minute
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
  check(await desk.page.evaluate(() => document.activeElement?.id === 'desk-detail-title'), 'opening a report moves focus to it (a screen reader reads its title)');
  const evidence = await shot(desk.page, '22-desk-report', { staff: true, full: true });
  check(evidence.includes('useless'), 'the desk shows the reported words');
  check(!/Emberly|member5@/.test(evidence), 'the desk never shows who wrote them');
  // the list refreshes every minute: the moderator keeps their place, in the note and in the list
  const refreshed = () => desk.page.waitForRequest((r) => r.url().endsWith('/rpc/modListReports'), { timeout: 10000 });
  await desk.page.locator('#resolve-note').fill('Aimed at a whole team');
  let refresh = refreshed();
  await desk.page.clock.fastForward(61e3);
  await refresh;
  await settle(desk.page, 600);
  const kept = await desk.page.evaluate(() => ({ id: document.activeElement?.id || document.activeElement?.tagName, value: document.getElementById('resolve-note')?.value }));
  check(kept.id === 'resolve-note' && kept.value === 'Aimed at a whole team', `the desk’s refresh leaves the note being written, and its focus, alone (${JSON.stringify(kept)})`);
  await desk.page.locator('[data-test="desk-report"]').first().focus();
  refresh = refreshed();
  await desk.page.clock.fastForward(61e3);
  await refresh;
  await settle(desk.page, 600);
  check(await desk.page.evaluate(() => document.activeElement?.dataset?.test === 'desk-report'), 'and leaves focus on the report row it was on');
  check(!(await desk.page.locator('[aria-live]:not(.desk-error):not([role="alert"])').count()), 'the desk doesn’t read itself out on every refresh (no live regions around the list or report)');
  desk.page.on('dialog', (d) => d.accept());
  await desk.page.locator('#resolve-note').fill('Aimed at a whole team: taken out of circulation.');
  await desk.page.locator('[data-test="desk-remove-feeling"]').click();
  await desk.page.locator('[data-test="desk-decided"]').waitFor();
  check(await desk.page.evaluate(() => document.activeElement?.id === 'desk-detail-title'), 'after a decision, focus is back on the report, not lost');
  check((await desk.page.locator('.desk-notes').innerText()).includes('Decision: Take it out of circulation'), 'the team notes say which decision was taken');
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
  const ring = await kb.page.evaluate(() => { const el = document.activeElement; const s = el && getComputedStyle(el); return !!s && el.matches(':focus-visible') && (s.outlineStyle !== 'none' || s.boxShadow !== 'none'); });
  check(ring, 'the focused control shows where focus is');
  await kb.page.keyboard.press('Enter');
  await hook(kb.page, 'welcome').waitFor({ timeout: 15000 });
  check(true, 'signing in and joining work with the keyboard alone');
  await kb.ctx.close();

  // --------------------------------- 9. the author’s laptop: the same account --
  const laptop = await device({ width: 1280, height: 860, mobile: false, motion: 'no-preference' });
  await signInUi(laptop.page, 'author@example.com');
  await hook(laptop.page, 'nav-journeys').waitFor({ timeout: 20000 });
  await hook(laptop.page, 'nav-returned').click();
  await laptop.page.locator('[data-test^="returned-"]:visible').first().waitFor({ timeout: 20000 });
  const laptopSees = await shot(laptop.page, '27-desktop-same-account');
  check(laptopSees.includes('avoiding me') || (await laptop.page.locator('[data-test^="returned-"]').count()) >= 3, 'a new device has everything (no second invitation)');
  // (the laptop stays open: the phone deletes everything below, and the laptop must notice)

  // --------------------------------------- 10. your data, then delete it all --
  await hook(page, 'open-you').click();
  await hook(page, 'open-data').waitFor();
  await shot(page, '28-you');
  // "Get support now" carries the same tappable lines, any time
  await hook(page, 'open-support').click();
  await page.locator('.hm-sheet [data-test="support-resources"]').waitFor({ timeout: 10000 });
  const lines = await page.locator('.hm-sheet [data-test="support-call"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  check(['tel:000', 'tel:131114', 'tel:1300659467', 'tel:139276'].every((t) => lines.includes(t)), `“Get support now”: 000, Lifeline, Suicide Call Back and 13YARN can be tapped (${lines.join(' ')})`);
  await page.locator('.hm-sheet-close').click();
  await page.locator('.hm-sheet').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
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
  // the laptop, still open, finds itself signed out at its next look (polling every 20 s), never showing deleted feelings
  // (its last requests are refused on purpose: the membership and the sign-in are gone)
  probing = true;
  await hook(laptop.page, 'signin-email').waitFor({ timeout: 45000 }).then(() => check(true, 'another open device is signed out after the deletion'), () => check(false, 'another open device is signed out after the deletion'));
  await shot(laptop.page, '31-desktop-after-deletion-elsewhere');
  await laptop.page.reload();
  await hook(laptop.page, 'signin-email').waitFor({ timeout: 20000 }).then(() => check(true, 'and stays signed out after a reload'), () => check(false, 'and stays signed out after a reload'));
  await laptop.ctx.close();
  probing = false;
  check(!(await sql("select 1 from hushmates.journeys j join hushmates.members m on m.id = j.owner where m.state = 'deleted' and j.text_enc <> ''")).length, 'deleting removed the words');
  // (perspectives others gave on the deleted feelings go with them, as the privacy notes say; everyone's own feelings stay)
  check((await journeysOf(members[5])).length >= 1 && (await call(members[0], 'me')).profile.pseudonym === 'Cloudlet', 'other people’s own data is untouched');

  // ------------------------------------------------------ 11. small screens --
  const small = await device({ width: 320, height: 568 });
  await small.page.goto(`${base}/app/`);
  await hook(small.page, 'signin-email').waitFor();
  await shot(small.page, '32-320-signin');
  await signInUi(small.page, 'member1@example.com');
  await hook(small.page, 'nav-journeys').waitFor({ timeout: 20000 });
  await hook(small.page, 'nav-journeys').click();
  await settle(small.page, 1200);
  await shot(small.page, '33-320-journeys');
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
