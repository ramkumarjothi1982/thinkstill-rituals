#!/usr/bin/env node
// Screenshots and a content audit of the CUSTOMER app, the way customers get it:
// the production build (tools/build-app.mjs) on a production-mode server, with
// people joining by invitation. No lab, no test identities, no simulated service.
//
//   node tools/app-shots.mjs <out-dir>
//
// One person (the author) is driven through the interface in Chromium; five
// other members answer through the same API their apps would use, typing
// perspectives this script supplies. Time moves only inside this script (the
// server it starts in-process is given a clock); the server has no clock route.
// Every screen's visible text, labels and placeholders are checked for
// developer content, raw data, internal ids and testing words; any hit, or any
// console error, fails the run. Nothing is deployed; the server listens on
// localhost and stops at the end.

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, FORBIDDEN } from './build-app.mjs';
import { createHushmatesServer, builtFiles } from '../server/server.mjs';

const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const out = process.argv[2] || join(process.cwd(), 'app-shots');
mkdirSync(out, { recursive: true });

const FEELING = 'My friend hasn’t replied in days. I think they’re avoiding me.';
const SECOND = 'I keep replaying what I said in the meeting.';
const THIRD = 'I’m nervous about starting my new job on Monday.';
const PEOPLE = [
  ['HUSH-CLOUD', 'Cloudlet', 'Maybe they’ve had a really full week and meant to reply when they had more energy.', true],
  ['HUSH-STAR', 'Starling', 'Could it be that they read it on the go and forgot it was still unanswered?', false],
  ['HUSH-FERN', 'Fernleaf', 'Perhaps they’re worried about saying the wrong thing, and silence felt safer.', true],
  ['HUSH-DREAM', 'Daydream', 'The quiet might say more about their week than about how they feel about you.', true],
  ['HUSH-PEBBLE', 'Pebbles', 'It might help to send something light, with no pressure, and see how they are.', true],
];
/** On screen: none of this may ever appear to a customer. */
const SCREEN_ONLY = [
  [/\{\s*"|"\s*:\s*[{["\d]/, 'raw data (JSON)'],
  [/\b(?:undefined|NaN)\b|\[object |\bnull\b/, 'programming values'],
  [/\b(?:tok|acc|jr|pv|hold|rep|fb)_[a-z0-9]{6,}/, 'internal ids'],
  [/Error:|TypeError|Failed to fetch|\bstack\b|status code|\bHTTP\b|\bJSON\b/, 'technical errors'],
  [/\b(?:mock|simulated|debug|prototype|test(?:ing)? (?:account|data|key))\b/i, 'testing words'],
];

const clock = { t: Date.UTC(2026, 9, 14, 9, 0) };
const dist = mkdtempSync(join(tmpdir(), 'hushmates-shots-'));
const res = build({ out: dist });
if (!res.ok) { console.error('build refused', res.problems); process.exit(1); }
const invites = [{ code: 'HUSH-AUTHOR', role: 'member' }, { code: 'HUSH-CATCHER', role: 'member' }, ...PEOPLE.map(([code]) => ({ code, role: 'member' }))];
const app = createHushmatesServer({ mode: 'production', files: builtFiles(dist), invites, now: () => clock.t, log: { error: (...a) => console.error('[server]', ...a) } });
await new Promise((r) => app.server.listen(0, 'localhost', r));
const base = `http://localhost:${app.server.address().port}`;

// ------------------------------------------------------------ API helpers (other members' apps) --
const H = { 'content-type': 'application/json', 'x-hushmates': '1' };
async function join_(code, name) {
  const r = await fetch(`${base}/api/v1/session`, { method: 'POST', headers: H, body: JSON.stringify({ invite: code, name, adult: true }) });
  if (!r.ok) throw new Error(`join ${code}: ${await r.text()}`);
  return r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}
async function call(cookie, method, args = {}) {
  const r = await fetch(`${base}/api/v1/rpc/${method}`, { method: 'POST', headers: { ...H, cookie }, body: JSON.stringify({ args }) });
  const body = await r.json();
  if (!body.ok) throw new Error(`${method}: ${body.message}`);
  return body.result;
}
const members = [];
for (const [code, name, words, share] of PEOPLE) {
  const cookie = await join_(code, name);
  await call(cookie, 'savePreferences', { catching: true, onboarded: true });
  members.push({ cookie, words, share });
}
async function answer(m, n) {
  const { offer } = await call(m.cookie, 'findFeeling');
  if (!offer) throw new Error('nothing to catch');
  await call(m.cookie, 'catchFeeling', { holdId: offer.holdId });
  await call(m.cookie, 'submitReframe', { holdId: offer.holdId, text: m.words, allowShare: m.share, clientId: `shots-${n}-xxxxxxxx` });
}

// ------------------------------------------------------------------------ the author's phone --
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { base: 'production build, production-mode server', screens: [], problems: [], console: [], expected: [] };
let probing = false;                       // while this script asks for missing pages or cuts the connection on purpose

async function phone({ width = 390, height = 844, mobile = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.console.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) (probing ? report.expected : report.console).push(`${m.type()}: ${m.text()}`); });
  return { ctx, page };
}
const hook = (page, s) => page.locator(`[data-test="${s}"]:visible`).first();
const settle = (page, ms = 700) => page.waitForTimeout(ms);
async function shot(page, name, { full = false } = {}) {
  await settle(page);
  const file = `${name}.png`;
  await page.screenshot({ path: join(out, file), fullPage: full });
  // everything a person can see or hear: text, labels, titles, placeholders, alt text
  const seen = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const bits = [document.body.innerText];
    for (const el of document.querySelectorAll('[aria-label], [title], [placeholder], img[alt]')) if (vis(el)) bits.push(el.getAttribute('aria-label') || '', el.getAttribute('title') || '', el.getAttribute('placeholder') || '', el.getAttribute('alt') || '');
    return bits.join('\n');
  });
  const hits = [];
  for (const [re, why] of [...FORBIDDEN, ...SCREEN_ONLY]) { const m = re.exec(seen); if (m) hits.push(`${why}: “${m[0]}”`); }
  report.screens.push({ name, file, url: page.url().replace(base, ''), hits });
  for (const h of hits) report.problems.push(`${name}: ${h}`);
}

const { ctx, page } = await phone();
try {
  // the door
  await page.goto(`${base}/app/`);
  await hook(page, 'invite-code').waitFor();
  await shot(page, '01-invite');
  await hook(page, 'invite-code').fill('hush-author');
  await hook(page, 'invite-name').fill('Moonbeam');
  await hook(page, 'invite-adult').click();
  await shot(page, '02-invite-filled');
  await hook(page, 'invite-join').click();

  // welcome
  await hook(page, 'welcome').waitFor();
  await shot(page, '03-welcome');
  for (let i = 0; i < 6 && await page.locator('[data-test="welcome-next"]:visible').count(); i++) { await hook(page, 'welcome-next').click(); await settle(page, 500); }
  await hook(page, 'welcome-catching').click();
  await shot(page, '04-welcome-promises');
  await hook(page, 'welcome-enter').click();

  // release
  await hook(page, 'feeling-text').waitFor();
  await hook(page, 'feeling-text').fill(FEELING);
  await hook(page, 'label-worry').click();
  await hook(page, 'share-consent').click();
  await shot(page, '05-release');
  await hook(page, 'release-submit').click();
  await hook(page, 'release-sent').waitFor({ timeout: 20000 });
  await shot(page, '06-release-sent');

  // five people answer through their own apps; it comes home
  for (const [i, m] of members.entries()) await answer(m, i);
  await settle(page, 1500);
  await hook(page, 'nav-returned').click();
  await page.locator('[data-test^="returned-"]:visible').first().waitFor();
  await shot(page, '07-returned-shelf');
  await page.locator('[data-test^="returned-"]:visible').first().click();
  await hook(page, 'homecoming-ready').waitFor({ timeout: 30000 });
  await shot(page, '08-homecoming');
  await hook(page, 'keep').click().catch(() => {});
  await shot(page, '09-perspective-kept');

  // a second feeling nobody catches: after 30 minutes the author's own Mallow can offer one, labelled as automatic
  await page.getByRole('button', { name: 'Back' }).first().click();
  await hook(page, 'nav-release').click();
  await hook(page, 'feeling-text').waitFor();
  await hook(page, 'feeling-text').fill(SECOND);
  await hook(page, 'share-consent').click();
  await hook(page, 'allow-fallback').click();
  await hook(page, 'release-submit').click();
  await hook(page, 'release-sent').waitFor({ timeout: 20000 });
  clock.t += 31 * 60e3;
  app.service.tick();
  await settle(page, 1200);
  await hook(page, 'nav-journeys').click();
  await page.locator('[data-test^="journey-"]:visible').first().waitFor();
  await shot(page, '10-journeys');
  await page.locator('[data-test^="journey-"]:visible').first().click();
  await hook(page, 'ask-mallow').waitFor({ timeout: 15000 });
  await shot(page, '11-mallow-available');
  await hook(page, 'ask-mallow').click();
  await hook(page, 'mallow-ready').waitFor({ timeout: 20000 });
  await page.evaluate(() => document.querySelector('[data-test="mallow-ready"]')?.scrollIntoView({ block: 'center' }));
  await shot(page, '12-mallow-perspective');
  await page.getByRole('button', { name: 'Back' }).first().click();

  // words that suggest someone isn't safe: support, nothing sent
  await hook(page, 'nav-release').click();
  await hook(page, 'feeling-text').waitFor();
  await hook(page, 'feeling-text').fill('I don’t want to be here anymore');
  await hook(page, 'share-consent').click();
  await hook(page, 'release-submit').click();
  await hook(page, 'support-scene').waitFor({ timeout: 15000 });
  await shot(page, '13-support');
  await hook(page, 'support-clear').click();

  // You & safety, and Your data
  await hook(page, 'open-you').click();
  await hook(page, 'open-data').waitFor();
  await shot(page, '14-you');
  await page.evaluate(() => { const s = [...document.querySelectorAll('.hf-scroll')].pop(); s.scrollTop = s.scrollHeight; });
  await shot(page, '15-you-end');
  await hook(page, 'open-data').click();
  await hook(page, 'data-feelings').waitFor();
  await shot(page, '16-your-data');
  await page.evaluate(() => { const s = [...document.querySelectorAll('.hf-scroll')].pop(); s.scrollTop = s.scrollHeight; });
  await shot(page, '17-your-data-end');
  const [download] = await Promise.all([page.waitForEvent('download'), hook(page, 'download-data').click()]);
  const saved = join(out, download.suggestedFilename());
  await download.saveAs(saved);
  await shot(page, '18-your-data-downloaded');
  const file = JSON.parse(readFileSync(saved, 'utf8'));
  const text = JSON.stringify(file);
  report.download = { name: download.suggestedFilename(), format: file.format, version: file.version, feelings: file.feelings.length, perspectivesFromHushmates: file.feelings.reduce((n, f) => n + f.perspectivesFromHushmates.length, 0) };
  for (const name of PEOPLE.map((p) => p[1])) if (text.includes(name)) report.problems.push(`download: names another member (${name})`);
  if (/\b(?:tok|acc|jr|pv|hold|rep)_[a-z0-9]{6,}/.test(text)) report.problems.push('download: contains internal ids');

  // the lab doesn't exist for a customer, signed in or not
  probing = true;
  await page.goto(`${base}/lab/`);
  await shot(page, '19-lab-is-not-here');
  for (const path of ['/lab/index.html', '/index.html', '/core/relay-seed.js', '/lab/?key=anything']) {
    const r = await page.goto(base + path);
    if (r.status() !== 404) report.problems.push(`${path} answered ${r.status()} to a customer`);
  }
  probing = false;
  await page.goto(`${base}/app/`);
  await hook(page, 'nav-release').waitFor();

  // a catcher's phone
  const catcher = await phone();
  await catcher.page.goto(`${base}/app/`);
  await hook(catcher.page, 'invite-code').fill('HUSH-CATCHER');
  await hook(catcher.page, 'invite-name').fill('Riverstone');
  await hook(catcher.page, 'invite-adult').click();
  await hook(catcher.page, 'invite-join').click();
  await hook(catcher.page, 'welcome').waitFor();
  for (let i = 0; i < 6 && await catcher.page.locator('[data-test="welcome-next"]:visible').count(); i++) { await hook(catcher.page, 'welcome-next').click(); await settle(catcher.page, 400); }
  await catcher.page.locator('[data-test="welcome-catching"]:visible').first().click();
  await hook(catcher.page, 'welcome-enter').click();
  await hook(catcher.page, 'feeling-text').waitFor();
  await call(members[0].cookie, 'submitFeeling', { text: THIRD, label: 'worry', consent: true, clientId: 'shots-third-feeling' });
  await hook(catcher.page, 'nav-catch').click();
  await hook(catcher.page, 'find-feeling').click();
  await hook(catcher.page, 'catch-feeling').waitFor({ timeout: 20000 });
  await shot(catcher.page, '20-catch-offer');
  await hook(catcher.page, 'catch-feeling').click();
  await hook(catcher.page, 'reframe-text').waitFor({ timeout: 15000 });
  await hook(catcher.page, 'reframe-text').fill('A new start can feel shaky and exciting at once. Being nervous may just mean it matters to you.');
  await shot(catcher.page, '21-catch-write');
  await catcher.ctx.close();

  // Hushmates can't be reached when it opens: a gentle screen, not a blank one
  probing = true;
  const away = await phone();
  await away.page.route('**/api/**', (r) => r.abort());
  await away.page.goto(`${base}/app/`);
  await hook(away.page, 'away').waitFor({ timeout: 15000 });
  await shot(away.page, '22-away');
  await away.ctx.close();
  probing = false;

  // other sizes for the screens this change is about
  for (const size of [{ width: 320, height: 568 }, { width: 1280, height: 860, mobile: false }]) {
    const p = await phone(size);
    const tag = `${size.width}x${size.height}`;
    await p.page.goto(`${base}/app/`);
    await hook(p.page, 'invite-code').waitFor();
    await shot(p.page, `23-invite-${tag}`);
    await p.ctx.addCookies((await ctx.cookies()).map((c) => ({ ...c })));
    await p.page.goto(`${base}/app/`);
    await hook(p.page, 'open-you').click();
    await hook(p.page, 'open-data').click();
    await hook(p.page, 'data-feelings').waitFor();
    await shot(p.page, `24-your-data-${tag}`);
    await p.ctx.close();
  }
} catch (e) {
  report.problems.push(`flow stopped: ${e.message.split('\n')[0]}`);
  await page.screenshot({ path: join(out, 'zz-stopped.png') }).catch(() => {});
} finally {
  await browser.close();
  await app.close();
  rmSync(dist, { recursive: true, force: true });
}
report.problems.push(...report.console.map((c) => `console: ${c}`));
writeFileSync(join(out, 'app-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.screens.length} screens, ${report.problems.length} problems`);
for (const p of report.problems) console.log(`  ${p}`);
process.exit(report.problems.length ? 1 : 0);
