// Security review (17 Oct 2026): the server's safety layer exists to catch what
// a client misses, but the checks before the token, the burst limit, the quota
// and the spend cap ran only the lexicon on the words as typed. Wording that
// only the lexicon on the normalised spelling, or the risk screener, reads as
// crisis or care ("I've taken more pils than I should have", "i'm done.
// tonight i end it.") met a 401, a 429 daily_limit or a 'capacity' fallback,
// and used a quota unit when it did get support. Now the pre-check is the
// pipeline's own input screen (screenInput), before every limit, and on the
// validated text (and earlier angles' lines) before the quota is taken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeApp, makeEnv, req, getToken, angleReq, anchor, ANCHORS, clock } from './helpers.js';
import { checkSafety, screenInput } from '../src/safety/index.js';
import { sessionSuperseded } from '../src/app.js';

const NORMALISED_CRISIS = "I've taken more pils than I should have";
const SCREEN_CARE = "i'm done. tonight i end it.";
const TYPO_CRISIS = 'i wnat to dei';
const ALL = [NORMALISED_CRISIS, SCREEN_CARE, TYPO_CRISIS];

test('the wording here is caught only by the full input screen, not by the lexicon on the words as typed', () => {
  for (const t of ALL) {
    assert.equal(checkSafety(t).level, 'none', t);
    assert.ok(['crisis', 'care'].includes(screenInput(t).level), t);
  }
});

test('the full input screen comes before every limit: no token, an expired or superseded one, a burst', async () => {
  const now = clock();
  const { app, provider } = makeApp({ now, script: [] });
  const env = makeEnv({ TESTING_TOKEN_TTL_DAYS: '1' });
  for (const text of ALL) {
    const expect = screenInput(text).level;
    const r = await app.fetch(req('/v1/angle', { body: { consent: true, text } }), env);
    assert.equal(r.status, 200, `${text}: support with no token`);
    const j = await r.json();
    assert.equal(j.status, expect, text);
    assert.equal(j.support.level, expect);
    assert.equal(j.keep_support_close, true);
  }
  // an expired token
  const token = await getToken(app, env);
  now.advance(86400001);
  assert.equal((await (await app.fetch(angleReq(token, { text: NORMALISED_CRISIS }), env)).json()).status, 'crisis');
  // a superseded one (billing+testing without tester codes: every testing session is)
  const strict = makeEnv({ ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: '' });
  assert.equal(sessionSuperseded({ entitlementMode: 'billing+testing', inviteCodes: [] }, { src: 'testing' }), true);
  const old = await getToken(makeApp({ now }).app, makeEnv());
  assert.equal((await (await app.fetch(angleReq(old, { text: SCREEN_CARE }), strict)).json()).status, 'care');
  // during a burst (the limiter refuses everything)
  const burst = makeEnv({ ANGLE_IP_LIMITER: { async limit() { return { success: false }; } } });
  assert.equal((await (await app.fetch(req('/v1/angle', { body: { consent: true, text: TYPO_CRISIS } }), burst)).json()).status, 'crisis');
  assert.equal(provider.calls.length, 0, 'the model is never asked');
});

test('support comes before the quota and the spend cap, and never uses a unit', async () => {
  const now = clock();
  const { app, provider } = makeApp({ now, script: [anchor(0), anchor(1)] });
  const env = makeEnv({ DEVICE_DAILY_LIMIT: '2' });
  const token = await getToken(app, env, { device_id: 'dev-Abc123_xyz-0987654321' });
  // support with a valid token: no unit used
  for (const text of ALL) {
    const j = await (await app.fetch(angleReq(token, { text }), env)).json();
    assert.equal(j.status, screenInput(text).level, text);
  }
  const s = await (await app.fetch(req('/v1/session', { body: { device_id: 'dev-Abc123_xyz-0987654321' } }), env)).json();
  assert.equal(s.quota.remaining, 2, 'support answers never count');
  // the day's allowance used up by ordinary angles: support still comes, not a 429
  for (const i of [0, 1]) assert.equal((await (await app.fetch(angleReq(token, { text: ANCHORS[i].text }), env)).json()).status, 'ok');
  assert.equal((await app.fetch(angleReq(token, { text: 'My boss embarrassed me again today.' }), env)).status, 429);
  for (const text of ALL) {
    const r = await app.fetch(angleReq(token, { text }), env);
    assert.equal(r.status, 200, `${text}: support, not daily_limit`);
    assert.equal((await r.json()).status, screenInput(text).level);
  }
  // a risky line hidden in an earlier angle the device sends back: support before the quota too
  const hidden = await app.fetch(angleReq(token, { text: 'My boss embarrassed me again today.', previous_angles: [{ subtitle_line_1: SCREEN_CARE, subtitle_line_2: 'Fine.' }] }), env);
  assert.equal(hidden.status, 200);
  assert.equal((await hidden.json()).status, 'care');
  // the spend cap paused (DAILY_SPEND_CAP_USD = 0, the documented switch): support, not 'capacity'
  const paused = makeEnv({ DAILY_SPEND_CAP_USD: '0' });
  const t2 = await getToken(app, paused);
  for (const text of ALL) {
    const j = await (await app.fetch(angleReq(t2, { text }), paused)).json();
    assert.equal(j.status, screenInput(text).level, `${text}: support, not a capacity fallback`);
  }
  // no API key: support, not a provider fallback
  const nokey = makeEnv({ ANTHROPIC_API_KEY: '' });
  const t3 = await getToken(app, nokey);
  assert.equal((await (await app.fetch(angleReq(t3, { text: NORMALISED_CRISIS }), nokey)).json()).status, 'crisis');
  assert.equal(provider.calls.length, 2, 'only the two ordinary angles reached the model');
});

// The early check and the pipeline read the same words (review of 9ee68bfc, 17 Oct 2026): app.js screened the text and
// all eight earlier-angle lines, then runAngle's steps 1b and 1c screened them all again. Now the request keeps one
// reading per text (screenInput is pure: the same words always read the same) and hands it to runAngle (deps.screen),
// so each text is screened once per request, and what every step decides is unchanged.
test('one reading per text per request: app.js hands its screen to runAngle, which reads the text and each earlier line through it', async () => {
  const { runAngle } = await import('../src/pipeline.js');
  const { createMockProvider } = await import('../src/providers/mock.js');
  const { SYSTEM_PROMPT } = await import('./helpers.js');
  const deps = (provider, extra = {}) => ({ provider, systemPrompt: SYSTEM_PROMPT, maxTokens: 3000, attemptTimeoutMs: 15000, deadlineMs: 28000, ...extra });
  const previous = [{ subtitle_line_1: 'Maybe the meeting was about timing.', subtitle_line_2: 'Not about your work at all.' }, { subtitle_line_1: 'A pause can be a plan.', subtitle_line_2: 'Ask what ready would look like.' }];
  const input = (text) => ({ text, emotion: null, intention: null, previous });
  // every text runAngle screens goes through the request's screen, in order, once
  const seen = [];
  const screen = (t) => { seen.push(t); return screenInput(t); };
  const text = ANCHORS[0].text;
  const withScreen = await runAngle(input(text), deps(createMockProvider({ script: [anchor(0)] }), { screen }));
  assert.deepEqual(seen, [text, ...previous.flatMap((p) => [p.subtitle_line_1, p.subtitle_line_2])]);
  const without = await runAngle(input(text), deps(createMockProvider({ script: [anchor(0)] })));
  assert.deepEqual([withScreen.status, withScreen.meta.safety_level, withScreen.meta.screen_level], [without.status, without.meta.safety_level, without.meta.screen_level]);
  // and for every kind of reading, the same answer as screenInput itself gives (support, a check, nothing)
  for (const t of [...ALL, 'My boss embarrassed me again today.', "i'm so done with this week"]) {
    const memo = new Map();
    const once = (x) => { if (!memo.has(x)) memo.set(x, screenInput(x)); return memo.get(x); };
    const a = await runAngle(input(t), deps(createMockProvider({ script: [anchor(1)] }), { screen: once }));
    const b = await runAngle(input(t), deps(createMockProvider({ script: [anchor(1)] })));
    assert.deepEqual([a.status, a.support?.level ?? null, a.support?.source ?? null, a.keep_support_close, a.meta.safety_source, a.meta.screen_level], [b.status, b.support?.level ?? null, b.support?.source ?? null, b.keep_support_close, b.meta.safety_source, b.meta.screen_level], t);
  }
  // app.js: one screen for the request, used for the early check, the validated text and each line, and handed on
  const src = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(src, /const screen = \(t\) => \{ let r = screens\.get\(t\); if \(!r\) \{ r = screenInput\(t\); screens\.set\(t, r\); \} return r; \};/);
  assert.match(src, /const early = screen\(cleanText\(raw\.slice\(0, EARLY_CHECK_CHARS\)\)\);/);
  assert.match(src, /const safety = screen\(input\.text\);/);
  assert.match(src, /const r = screen\(line\);/);
  assert.match(src, /deadlineMs: cfg\.deadlineMs, userTag: await userTag\(cfg, subject, day\), now, usage, screen,/);
  assert.equal((src.match(/screenInput\(/g) || []).length, 1, 'screenInput itself only inside the request\'s screen');
});
