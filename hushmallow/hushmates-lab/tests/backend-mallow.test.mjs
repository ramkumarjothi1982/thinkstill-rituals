// The hybrid Mallow, server side: the Reframe library by default, AI only behind the
// owner's switch and inside its limits, honest labels, and the Another Angle adapter
// against a fake server on this machine. No paid service is ever called.
//   node --test tests/backend-mallow.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { libraryProvider, libraryCatalogue, textHash } from '../core/perspectives.js';
import { screenReframe } from '../core/feeling-safety.js';
import { LABEL_IDS, MALLOW_IDS } from '../core/relay-config.js';
import { createMallow, createMemoryUsage, readAiSettings } from '../supabase/functions/_shared/mallow.js';
import { createAnotherAngle, anotherAngleSettings, ANOTHER_ANGLE_DEFAULTS } from '../supabase/functions/_shared/ai-another-angle.js';

const T0 = Date.UTC(2026, 9, 14, 9);
const DAY = 24 * 3600e3;
const FEELING = 'My friend hasn’t replied to my message since yesterday and I think she’s annoyed with me.';
const AI_TEXT = 'Maybe the quiet says more about how full her week is than about how she feels about you.';
const ON = { enabled: true, monthlyCapAud: 10, perMemberDaily: 5, perDayGlobal: 100, timeoutMs: 2000, model: 'another-angle', costPerCallAud: 0.06 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A stand-in AI provider that counts its calls. */
function fakeAi(reply = () => ({ status: 'ok', text: AI_TEXT, source: 'ai', model: 'another-angle:angle-v5', mallow: 'zuzu', costAud: 0.06 })) {
  const p = async (args) => { p.calls.push(args); return typeof reply === 'function' ? reply(args, p.calls.length) : reply; };
  p.calls = [];
  p.providerName = 'another-angle';
  return p;
}
function rig({ ai = fakeAi(), aiSettings = ON, usage, library = libraryProvider() } = {}) {
  const clock = { t: T0 };
  const logs = [];
  const u = usage || createMemoryUsage({ now: () => clock.t });
  const settings = typeof aiSettings === 'function' ? aiSettings : () => ({ ai: aiSettings });
  const mallow = createMallow({ library, ai, settings, usage: u, now: () => clock.t, log: { info: (m, meta) => logs.push(meta), warn: () => {}, error: () => {} } });
  return { mallow, usage: u, clock, logs, ai };
}
const ask = (r, o = {}) => r.mallow.perspective({ text: FEELING, label: 'worry', mallow: 'loomi', memberId: 'm-1', journeyId: null, ...o });

// ------------------------------------------------------------- the switch --
test('AI off (the default): always the Reframe library, and the AI provider is never called', async () => {
  const ai = fakeAi();
  for (const aiSettings of [{ ...ON, enabled: false }, {}, { ...ON, enabled: 'true' }, { ...ON, enabled: 1 }]) {
    const r = rig({ ai, aiSettings });
    const out = await ask(r);
    assert.equal(out.status, 'ok');
    assert.equal(out.source, 'library');
    assert.match(out.model, /^reframe-library:/);
    assert.equal(r.usage.rows().length, 0, 'nothing is recorded as AI');
  }
  // settings that can't be read, or no settings at all, also mean library
  const broken = rig({ ai, aiSettings: () => { throw new Error('db down'); } });
  assert.equal((await ask(broken)).source, 'library');
  assert.equal(ai.calls.length, 0);
  // the migration's defaults keep it off
  assert.equal(readAiSettings({ ai: { enabled: false, monthlyCapAud: 0 } }).enabled, false);
  assert.equal(readAiSettings(null).enabled, false);
});

test('AI on with a provider: the AI answers, is labelled AI, and the call is recorded with its cost', async () => {
  const r = rig();
  const out = await ask(r, { journeyId: 'jr-1' });
  assert.equal(out.status, 'ok');
  assert.equal(out.source, 'ai');
  assert.equal(out.text, AI_TEXT);
  assert.equal(out.model, 'another-angle:angle-v5');
  assert.equal(out.mallow, 'loomi', 'the author’s Mallow offers it, whatever character the provider picked');
  assert.equal(out.voice, 'zuzu');
  assert.equal(out.angleId, undefined);
  assert.equal(r.ai.calls.length, 1);
  // only the words, the label and the Mallow go to the provider: never who or which feeling
  assert.deepEqual(Object.keys(r.ai.calls[0]).sort(), ['estimateAud', 'label', 'mallow', 'signal', 'text']);
  assert.equal(r.ai.calls[0].estimateAud, 0.06);
  const [row] = r.usage.rows();
  assert.equal(row.status, 'ok');
  assert.equal(row.memberId, 'm-1');
  assert.equal(row.journeyId, 'jr-1');
  assert.equal(row.provider, 'another-angle');
  assert.equal(row.costAud, 0.06);
  assert.equal(await r.usage.aiSpentThisMonthAud(T0), 0.06);
});

test('AI on but no provider configured, or no member, or no cost estimate: the library', async () => {
  assert.equal((await ask(rig({ ai: null }))).source, 'library');
  const r = rig();
  assert.equal((await ask(r, { memberId: null })).source, 'library');
  for (const costPerCallAud of [0, -1, undefined, 'lots']) {
    const c = rig({ aiSettings: { ...ON, costPerCallAud } });
    assert.equal((await ask(c)).source, 'library', `estimate ${costPerCallAud}`);
    assert.equal(c.ai.calls.length, 0);
  }
  assert.equal(r.ai.calls.length, 0);
});

// ----------------------------------------------------------------- limits --
test('monthly AUD cap: a call that would pass the cap goes to the library; a new month has room again', async () => {
  const r = rig({ aiSettings: { ...ON, monthlyCapAud: 0.15 } });
  const sources = [];
  for (let i = 0; i < 4; i++) sources.push((await ask(r, { memberId: `m-${i}` })).source);
  // 0.06 + 0.06 = 0.12 fits; a third would be 0.18 > 0.15
  assert.deepEqual(sources, ['ai', 'ai', 'library', 'library']);
  assert.equal(r.ai.calls.length, 2);
  assert.equal(await r.usage.aiSpentThisMonthAud(T0), 0.12);
  // exactly at the cap is allowed, never over it (and no rounding drift)
  // (a provider that states no cost of its own is charged the estimate)
  const exact = rig({ ai: fakeAi({ status: 'ok', text: AI_TEXT, source: 'ai', model: 'x' }), aiSettings: { ...ON, monthlyCapAud: 0.3, costPerCallAud: 0.1 } });
  const got = [];
  for (let i = 0; i < 4; i++) got.push((await ask(exact, { memberId: `m-${i}` })).source);
  assert.deepEqual(got, ['ai', 'ai', 'ai', 'library']);
  // a cap of zero means no AI at all
  const zero = rig({ aiSettings: { ...ON, monthlyCapAud: 0 } });
  assert.equal((await ask(zero)).source, 'library');
  assert.equal(zero.ai.calls.length, 0);
  r.clock.t = Date.UTC(2026, 10, 1, 0, 0, 1);    // 1 November
  assert.equal((await ask(r, { memberId: 'm-9' })).source, 'ai');
});

test('per-person daily limit and the whole service’s daily ceiling; tomorrow has room again', async () => {
  const r = rig({ aiSettings: { ...ON, perMemberDaily: 2, perDayGlobal: 3 } });
  const a = [];
  for (let i = 0; i < 3; i++) a.push((await ask(r, { memberId: 'm-a', text: `${FEELING} (${i})` })).source);   // new words each time (not the cache)
  assert.deepEqual(a, ['ai', 'ai', 'library'], 'two a day for one person');
  assert.equal((await ask(r, { memberId: 'm-b' })).source, 'ai', 'someone else still has room');
  assert.equal((await ask(r, { memberId: 'm-c' })).source, 'library', 'the service’s ceiling of three is reached');
  assert.equal(r.ai.calls.length, 3);
  r.clock.t += DAY;
  assert.equal((await ask(r, { memberId: 'm-a' })).source, 'ai');
});

test('failed AI attempts count towards the daily limits (abuse can’t retry for free)', async () => {
  const ai = fakeAi({ status: 'unavailable', reason: 'quality' });
  const r = rig({ ai, aiSettings: { ...ON, perMemberDaily: 2 } });
  for (let i = 0; i < 4; i++) assert.equal((await ask(r, { memberId: 'm-a', text: `${FEELING} (${i})` })).source, 'library');
  assert.equal(ai.calls.length, 2);
});

test('limits hold under concurrency: with room for two calls, five at once make exactly two', async () => {
  for (const reserving of [true, false]) {
    const mem = createMemoryUsage({ now: () => T0 });
    // the database's current interface may only have the reads and recordAi: no atomic reserve
    const usage = reserving ? mem : { ...mem, reserveAi: undefined };
    const ai = fakeAi(async () => { await sleep(20); return { status: 'ok', text: AI_TEXT, source: 'ai', model: 'x', costAud: 0.06 }; });
    const r = rig({ ai, usage, aiSettings: { ...ON, monthlyCapAud: 0.12 } });
    const outs = await Promise.all([0, 1, 2, 3, 4].map((i) => ask(r, { memberId: `m-${i}` })));
    assert.equal(outs.filter((o) => o.source === 'ai').length, 2, reserving ? 'atomic reserve' : 'reads plus in-instance holds');
    assert.equal(ai.calls.length, 2);
    assert.ok((await mem.aiSpentThisMonthAud(T0)) <= 0.12);
  }
});

test('a missing ledger or one that can’t be read never lets AI spend', async () => {
  const ai = fakeAi();
  const none = createMallow({ library: libraryProvider(), ai, settings: () => ({ ai: ON }), usage: null });
  assert.equal((await none.perspective({ text: FEELING, label: 'worry', mallow: 'loomi', memberId: 'm-1' })).source, 'library');
  const bad = { aiSpentThisMonthAud: async () => { throw new Error('x'); }, aiCallsToday: async () => 0, aiCallsTodayGlobal: async () => 0, recordAi: async () => {} };
  assert.equal((await ask(rig({ ai, usage: bad }))).source, 'library');
  const odd = { aiSpentThisMonthAud: async () => 'n/a', aiCallsToday: async () => 0, aiCallsTodayGlobal: async () => 0, recordAi: async () => {} };
  assert.equal((await ask(rig({ ai, usage: odd }))).source, 'library');
  assert.equal(ai.calls.length, 0);
  // a call that can't be recorded pauses AI in this instance
  const mem = createMemoryUsage({ now: () => T0 });
  const r = rig({ usage: { ...mem, recordAi: async () => { throw new Error('write failed'); } } });
  assert.equal((await ask(r)).source, 'ai');
  assert.equal((await ask(r, { text: `${FEELING} again` })).source, 'library');
  assert.equal(r.ai.calls.length, 1);
});

// --------------------------------------------------------------- failures --
test('AI error, timeout, unavailable, rate-limited or unsafe output: the library answers, and the attempt is recorded', async () => {
  const cases = [
    ['throws', async () => { throw new Error('boom'); }, 'unavailable', 0.06],
    ['unavailable', { status: 'unavailable', reason: 'http-500', costAud: 0.06 }, 'unavailable', 0.06],
    ['rate-limited', { status: 'unavailable', reason: 'rate-limited', costAud: 0 }, 'unavailable', 0],
    ['unkind', { status: 'ok', source: 'ai', text: 'Honestly you’re overreacting. Get over it.', model: 'x', costAud: 0.06 }, 'rejected', 0.06],
    ['contact', { status: 'ok', source: 'ai', text: 'Text me on 07700 900123 and we can talk it through.', model: 'x', costAud: 0.06 }, 'rejected', 0.06],
    ['diagnosis', { status: 'ok', source: 'ai', text: 'It sounds like you have an anxiety disorder.', model: 'x', costAud: 0.06 }, 'rejected', 0.06],
    ['curly unkind', { status: 'ok', source: 'ai', text: 'You’re so pathetic about this.', model: 'x', costAud: 0.06 }, 'rejected', 0.06],
    ['too long', { status: 'ok', source: 'ai', text: 'Maybe. '.repeat(120), model: 'x', costAud: 0.06 }, 'rejected', 0.06],
    ['empty', { status: 'ok', source: 'ai', text: '', model: 'x' }, 'rejected', 0.06],
  ];
  for (const [name, reply, status, cost] of cases) {
    const ai = fakeAi(typeof reply === 'function' ? reply : () => reply);
    const r = rig({ ai });
    const out = await ask(r);
    assert.equal(out.status, 'ok', name);
    assert.equal(out.source, 'library', name);
    const [row] = r.usage.rows();
    assert.equal(row.status, status, name);
    assert.equal(row.costAud, cost, `${name}: cost`);
  }
});

test('a slow AI is abandoned at its deadline: the library answers, and the attempt is charged at the estimate', async () => {
  let aborted = false;
  const ai = fakeAi(({ signal }) => new Promise(() => { signal?.addEventListener('abort', () => { aborted = true; }); }));
  const r = rig({ ai, aiSettings: { ...ON, timeoutMs: 500 } });
  const t = Date.now();
  const out = await ask(r);
  assert.ok(Date.now() - t < 2000, 'waited too long');
  assert.equal(out.source, 'library');
  assert.ok(aborted, 'the provider was told to stop');
  const [row] = r.usage.rows();
  assert.equal(row.status, 'unavailable');
  assert.equal(row.reason, 'timeout');
  assert.equal(row.costAud, 0.06);
});

test('a provider’s safety verdict is support, never a perspective (and the library is not asked)', async () => {
  let libraryCalls = 0;
  const library = async (a) => { libraryCalls += 1; return libraryProvider()(a); };
  const r = rig({ ai: fakeAi({ status: 'support', level: 'crisis', costAud: 0.06 }), library });
  const out = await ask(r);
  assert.deepEqual(out, { status: 'support', level: 'crisis' });
  assert.equal(libraryCalls, 0);
  assert.equal(r.usage.rows()[0].status, 'support');
});

test('crisis or unsafe words: no perspective from anyone, and nothing is sent to a provider', async () => {
  for (const text of ['I want to end it all', 'I took a load of paracetamol an hour ago and feel strange.', 'My partner hits me when he is angry.']) {
    const ai = fakeAi();
    let libraryCalls = 0;
    const library = async (a) => { libraryCalls += 1; return libraryProvider()(a); };
    const r = rig({ ai, library });
    const out = await r.mallow.perspective({ text, label: 'sadness', mallow: 'noomi', memberId: 'm-1' });
    assert.equal(out.status, 'support', text);
    assert.ok(['crisis', 'care'].includes(out.level));
    assert.equal(ai.calls.length, 0, 'sent to the AI provider');
    assert.equal(libraryCalls, 0);
    assert.equal(r.usage.rows().length, 0);
    // and the library on its own refuses too (the old behaviour, kept)
    assert.equal((await libraryProvider()({ text, label: 'sadness', mallow: 'noomi' })).status, 'support');
  }
});

test('words with contact or identifying details are never sent to AI; the library still answers', async () => {
  const r = rig();
  const out = await ask(r, { text: 'My friend at 12 Rose Street hasn’t replied and I think she’s annoyed with me.' });
  assert.equal(out.source, 'library');
  assert.equal(r.ai.calls.length, 0);
});

// ------------------------------------------------------- labels and honesty --
test('sources are honest: a mock or mislabelled AI answer never shows as AI; the library never relabels', async () => {
  for (const reply of [{ status: 'ok', source: 'demo', text: AI_TEXT, model: 'mock' }, { status: 'ok', source: 'library', text: AI_TEXT }, { status: 'ok', text: AI_TEXT }]) {
    const r = rig({ ai: fakeAi(reply) });
    const out = await ask(r);
    assert.equal(out.source, 'library');
    assert.notEqual(out.text, AI_TEXT, 'the AI slot’s words were shown under the library’s label');
    assert.equal(r.usage.rows()[0].status, 'not-ai');
  }
  // a "library" that claims to be AI is refused, not shown under either label
  const liar = rig({ aiSettings: { ...ON, enabled: false }, library: async () => ({ status: 'ok', source: 'ai', text: AI_TEXT, model: 'x' }) });
  assert.deepEqual(await ask(liar), { status: 'unavailable', reason: 'mislabelled' });
  // every library answer names its angle in its model
  const lib = await ask(rig({ aiSettings: {} }));
  assert.equal(lib.model, `reframe-library:${lib.angleId}`);
});

test('a library line that fails screening: the next angle is tried (avoiding the failed one), at most three times', async () => {
  const seen = [];
  // (the first is written with a phone's curly apostrophe: the Mallow screens a straightened copy too)
  const lines = [['bad-1', 'You’re being dramatic, honestly.'], ['bad-2', 'Get over it and stop whining.'], ['ok-3', 'Maybe this is a smaller thing than it feels tonight.']];
  const library = async ({ avoid, attempt }) => { seen.push({ avoid: [...avoid], attempt }); const [id, text] = lines[attempt]; return { status: 'ok', text, source: 'library', model: `reframe-library:${id}`, angleId: id, mallow: 'loomi' }; };
  const out = await ask(rig({ aiSettings: {}, library }));
  assert.equal(out.angleId, 'ok-3');
  assert.deepEqual(seen.map((s) => s.attempt), [0, 1, 2]);
  assert.ok(seen[1].avoid.includes('bad-1') && seen[2].avoid.includes('bad-2'));
  const never = async () => ({ status: 'ok', text: 'You’re being dramatic.', source: 'library', angleId: 'x' });
  assert.deepEqual(await ask(rig({ aiSettings: {}, library: never })), { status: 'unavailable', reason: 'screening' });
});

// ----------------------------------------------------- caching and repeats --
test('the same person sending the same words again within the hour reuses the AI answer (no second charge)', async () => {
  const r = rig();
  const a = await ask(r, { journeyId: 'jr-1' });
  const b = await ask(r, { journeyId: 'jr-2' });
  assert.equal(a.source, 'ai');
  assert.deepEqual(b, a);
  assert.equal(r.ai.calls.length, 1);
  assert.equal(r.usage.rows().length, 1);
  // someone else's identical words are their own call (nothing is shared between people)
  await ask(r, { memberId: 'm-2' });
  assert.equal(r.ai.calls.length, 2);
  // after the hour, or once the person is forgotten, it's a new call
  r.mallow.forgetMember('m-1');
  await ask(r, { journeyId: 'jr-3' });
  assert.equal(r.ai.calls.length, 3);
  r.clock.t += 2 * 3600e3;
  await ask(r, { journeyId: 'jr-4' });
  assert.equal(r.ai.calls.length, 4);
});

test('asked twice at once for one feeling: one generation', async () => {
  const ai = fakeAi(async () => { await sleep(20); return { status: 'ok', text: AI_TEXT, source: 'ai', model: 'x', costAud: 0.06 }; });
  const r = rig({ ai });
  const [a, b] = await Promise.all([ask(r, { journeyId: 'jr-1' }), ask(r, { journeyId: 'jr-1' })]);
  assert.deepEqual(a, b);
  assert.equal(ai.calls.length, 1);
});

// ------------------------------------------------------- library relevance --
const lib = libraryProvider();
const allMallows = async (text, label) => Promise.all(MALLOW_IDS.map((mallow) => lib({ text, label, mallow })));

test('library relevance: each situation gets angles written for it, from every Mallow', async () => {
  const CASES = [
    // [label, words, the angle family that fits, why]
    ['sadness', 'My grandad died last month and I miss him so much.', /^hm-loss-/, 'grief, not "distance" or a reframe'],
    ['joy', 'I finally passed my driving test today!', /^hm-achievement-/, 'an achievement to savour'],
    ['frustration', 'My flatmates never clean up and I always end up doing it.', /^hm-load-/, 'an unfair share of the load'],
    ['worry', 'I have a job interview tomorrow and I’m scared I’ll mess it up.', /^hm-perform-/, 'interview nerves'],
    ['worry', FEELING, /^(um|sa)-ang/, 'Reframe’s unanswered-message (or seemed-annoyed) situation'],
    ['anger', 'My mum criticised my cooking in front of everyone.', /^fc-ang/, 'family criticism, not work criticism'],
    ['anger', 'My manager took credit for my work in the meeting today.', /^cp-ang/, 'credit taken'],
    ['loneliness', 'I moved here a month ago and I don’t know anyone.', /^hm-belonging-/, 'new place, belonging'],
    ['confusion', 'I don’t know whether I should take the new job or stay where I am.', /^hm-decision-/, 'a decision'],
    ['excitement', 'I’m going to Japan next month!', /^hm-begin-/, 'something to look forward to'],
  ];
  for (const [label, text, family, why] of CASES) {
    for (const r of await allMallows(text, label)) {
      assert.equal(r.status, 'ok');
      assert.match(r.angleId, family, `${r.mallow} · ${why}: got ${r.angleId} “${r.text}”`);
      assert.equal(r.model, `reframe-library:${r.angleId}`);
    }
  }
});

test('library relevance: good news is never reframed as a worry, and grief is never told to “soak it up”', async () => {
  const GOOD = [['joy', 'My sister had her baby today!'], ['joy', 'The sun came out and I sat in the garden with a coffee.'], ['excitement', 'I just got accepted into university!'], ['excitement', 'My band is playing our first gig on Saturday.']];
  for (const [label, text] of GOOD) {
    for (const r of await allMallows(text, label)) {
      assert.ok(r.angleId.startsWith('hm-'), `${r.mallow}: a Reframe worry line for good news: ${r.text}`);
      assert.doesNotMatch(r.text, /\bworr|bothering|data point|not enough to know/i, `${r.mallow}: ${r.text}`);
    }
  }
  for (const r of await allMallows('The funeral was beautiful and we laughed remembering grandma.', 'joy')) {
    assert.match(r.angleId, /^hm-loss-/, `${r.mallow}: ${r.text}`);
    assert.doesNotMatch(r.text, /soak it up|cheer|brilliant|bounce|cartwheel/i);
  }
  // the old generic line is gone for all of these
  for (const [label, text] of [['sadness', 'My grandad died last month.'], ['joy', 'I finally passed my driving test today!'], ['excitement', 'I got the job! I start next week.']]) {
    for (const r of await allMallows(text, label)) assert.doesNotMatch(r.text, /clearly bothering you/);
  }
});

test('library relevance: the label changes the angle for the same words', async () => {
  const text = 'I start my new job on Monday.';
  const worry = await allMallows(text, 'worry');
  const excited = await allMallows(text, 'excitement');
  worry.forEach((w, i) => assert.notEqual(w.text, excited[i].text, w.mallow));
  // worried: a heavy opener, never the celebration ones
  for (const w of worry) assert.doesNotMatch(w.text, /cheer|brilliant|bounce|cartwheel|lovely to hear/i);
  // a feeling with no label still gets something fitting, guessed lightly from its words
  const r = await lib({ text: 'I am so happy, we spent the whole day at the beach with my family.', label: null, mallow: 'blubi' });
  assert.ok(r.angleId.startsWith('hm-together-') || r.angleId.startsWith('hm-small-joys-') || r.angleId.startsWith('hm-joy-'), r.angleId);
});

test('library voice: each Mallow opens in its own voice, and the seven differ for the same feeling', async () => {
  const outs = await allMallows(FEELING, 'worry');
  assert.equal(new Set(outs.map((o) => o.text)).size, 7);
  const { openers } = libraryCatalogue();
  for (const o of outs) {
    const own = openers.filter((x) => x.mallow === o.mallow).map((x) => x.text.split('{adj}')[0]);
    assert.ok(own.some((start) => o.text.startsWith(start)), `${o.mallow} didn’t open in its own voice: ${o.text}`);
  }
});

const WORRIES = [
  FEELING,
  'I have a job interview tomorrow and I’m scared I’ll mess it up.',
  'I keep worrying that something bad will happen to my mum.',
  'Money is really tight this month and rent is due.',
  'I have my exams next week and I haven’t revised enough.',
  'I’m waiting for my blood test results and I can’t stop thinking about it.',
  'My partner has been really quiet and distant lately.',
  'I made a mistake at work today and I think everyone noticed.',
  'My boss wants a meeting tomorrow and didn’t say why.',
  'I said something awkward at the party and I keep replaying it.',
  'I’m moving to a new city next month and I don’t know anyone there.',
  'I have so much to do this week and I can’t keep up.',
  'I don’t know whether I should take the new job or stay where I am.',
  'My performance review is on Friday and I’m dreading it.',
  'I sent a message to the group chat and nobody answered.',
  'I’m worried my friends are leaving me out of things.',
  'I have to give a presentation to the whole team on Monday.',
  'My dog is getting old and I worry about how long he has left.',
  'I can’t sleep because I keep thinking about everything that could go wrong.',
  'My sister and I had an argument and I’m worried she won’t forgive me.',
];

test('library variety: twenty different worries get (nearly) twenty different perspectives, for every Mallow', async () => {
  for (const mallow of MALLOW_IDS) {
    const outs = await Promise.all(WORRIES.map((text) => lib({ text, label: 'worry', mallow })));
    const texts = new Set(outs.map((o) => o.text));
    const angles = new Set(outs.map((o) => o.angleId));
    assert.ok(texts.size >= 18, `${mallow}: only ${texts.size} distinct texts`);
    assert.ok(angles.size >= 16, `${mallow}: only ${angles.size} distinct angles`);
    assert.ok(outs.every((o) => !/clearly bothering you/.test(o.text)));
  }
});

test('library variety: one person’s consecutive feelings never repeat an angle while there are others to choose', async () => {
  // the same words six times (six feelings), through the server-side Mallow with the in-memory ledger
  const r = rig({ aiSettings: {} });
  const ids = [];
  for (let i = 0; i < 6; i++) { r.clock.t += 60e3; ids.push((await ask(r, { memberId: 'm-1', journeyId: `jr-${i}` })).angleId); }
  assert.equal(new Set(ids).size, 6, ids.join(' '));
  // the gateway's path: recent angles passed in from the database
  const g = createMallow({ library: libraryProvider(), settings: () => ({}) });
  const recent = [];
  for (let i = 0; i < 6; i++) {
    const out = await g.perspective({ text: 'I feel a bit lost lately.', label: 'confusion', mallow: 'glitzi', memberId: 'm-2', recentAngles: [...recent] });
    assert.ok(!recent.includes(out.angleId), `repeated ${out.angleId}`);
    recent.unshift(out.angleId);
  }
  // and another person isn't steered by someone else's history
  const other = await ask(r, { memberId: 'm-9' });
  assert.equal(other.angleId, (await libraryProvider()({ text: FEELING, label: 'worry', mallow: 'loomi' })).angleId);
});

test('library avoid list: never an avoided angle (by id or by text hash) when there is another; the oldest when there isn’t', async () => {
  const first = await lib({ text: FEELING, label: 'worry', mallow: 'noomi' });
  const byId = await lib({ text: FEELING, label: 'worry', mallow: 'noomi', avoid: [first.angleId] });
  assert.notEqual(byId.angleId, first.angleId);
  const byHash = await lib({ text: FEELING, label: 'worry', mallow: 'noomi', avoid: [textHash(first.text)] });
  assert.notEqual(byHash.text, first.text);
  // avoid everything it could say: it still answers, with the one seen longest ago
  const everything = libraryCatalogue().angles.map((a) => a.id);
  const all = [...everything.filter((id) => id !== 'um-ang7'), 'um-ang7'];   // um-ang7 is the oldest
  const last = await lib({ text: FEELING, label: 'worry', mallow: 'noomi', avoid: all });
  assert.equal(last.status, 'ok');
  assert.equal(last.angleId, 'um-ang7');
});

test('library determinism: the same words, label, Mallow and attempt always give the same answer (no Math.random)', async () => {
  const random = Math.random;
  Math.random = () => { throw new Error('Math.random was used'); };
  try {
    for (const text of WORRIES.slice(0, 8)) {
      const a = await libraryProvider()({ text, label: 'worry', mallow: 'pipzi' });
      const b = await libraryProvider()({ text, label: 'worry', mallow: 'pipzi' });
      assert.deepEqual(a, b);
    }
    // a different attempt reseeds: across the twenty worries, some answers change
    const changed = (await Promise.all(WORRIES.map(async (text) => (await lib({ text, label: 'worry', mallow: 'zuzu' })).text !== (await lib({ text, label: 'worry', mallow: 'zuzu', attempt: 1 })).text))).filter(Boolean).length;
    assert.ok(changed >= 5, `only ${changed} changed with a new attempt`);
  } finally { Math.random = random; }
});

test('library content: every authored opener and line meets the perspective standard, in every label’s words', () => {
  const { openers, angles, adjectives } = libraryCatalogue();
  assert.ok(openers.length >= 49 && angles.length >= 150, `${openers.length} openers, ${angles.length} lines`);
  const longestOpener = Math.max(...openers.map((o) => o.text.length + 12));
  const straight = (t) => t.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
  for (const a of angles) {
    const sc = screenReframe(a.text, { minChars: 1, maxChars: 600 });
    assert.ok(sc.ok, `${a.id}: ${a.text} (${sc.code})`);
    assert.ok(screenReframe(straight(a.text), { minChars: 1, maxChars: 600 }).ok, `${a.id} (straight apostrophes)`);
    assert.ok(a.text.length + longestOpener + 1 <= 600, `${a.id} could pass 600 characters`);
    assert.doesNotMatch(a.text, /\{thought\}/, `${a.id} would quote the person back`);
    if (a.id.startsWith('hm-')) {
      assert.doesNotMatch(a.text, /\b(?:definitely|obviously|clearly|for sure|certainly|always will|never will)\b/i, `${a.id}: certainty`);
      assert.doesNotMatch(a.text, /\bI(?:'|’)?(?:m|ve|d)?\b/, `${a.id}: a Mallow speaking as if it were a person`);
    }
  }
  for (const o of openers) {
    for (const label of [...LABEL_IDS, null]) {
      if (!label && o.text.includes('{adj}')) continue;
      const text = o.text.replace('{adj}', adjectives[label] || '');
      const sc = screenReframe(text, { minChars: 1, maxChars: 600 });
      assert.ok(sc.ok, `${o.mallow} opener: ${text} (${sc.code})`);
      assert.ok(screenReframe(straight(text), { minChars: 1, maxChars: 600 }).ok, `${o.mallow} opener (straight apostrophes): ${text}`);
      assert.doesNotMatch(text, /\bI(?:'|’)?(?:m|ve|d)?\b/, `${o.mallow}: a Mallow speaking as if it were a person`);
      assert.deepEqual(sc.nudges, [], `${o.mallow} opener sounds certain: ${text}`);
    }
  }
  // each Mallow has openers for heavy and good feelings, and tender ones for grief
  for (const m of MALLOW_IDS) {
    for (const family of ['heavy', 'bright']) assert.ok(openers.some((o) => o.mallow === m && o.family === family), `${m} ${family}`);
    assert.ok(openers.some((o) => o.mallow === m && o.soft), `${m} soft`);
  }
});

test('library: empty words are unavailable, an unknown Mallow speaks as Loomi, odd input never throws', async () => {
  assert.deepEqual(await lib({ text: '   ' }), { status: 'unavailable', reason: 'empty' });
  assert.equal((await lib({ text: FEELING, mallow: 'nobody' })).mallow, 'loomi');
  assert.equal((await lib({ text: FEELING, label: 'not-a-label', avoid: 'x' })).status, 'ok');
  assert.equal((await lib({ text: '😭😭😭', label: 'sadness' })).status, 'ok');
});

// ------------------------------------------------------- the Another Angle adapter --
const SCENE = { status: 'ok', prompt_version: 'angle-v5', scene: { subtitle_line_1: 'That quiet is the part that happened.', subtitle_line_2: 'What it means is still an open question.', mallow_character: 'zuzu', alternative_angle: '' } };

/** A fake Another Angle on 127.0.0.1 (a real HTTP server, so the real fetch and deadlines are exercised). */
async function angleServer({ provider = 'anthropic', angle = (req, body, res, send) => send(res, 200, SCENE), session } = {}) {
  const seen = [];
  const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  const srv = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : null;
      seen.push({ method: req.method, url: req.url, headers: req.headers, body });
      if (req.url === '/v1/health') return send(res, 200, { ok: true, provider, configured: { provider_key: true } });
      if (req.url === '/v1/session') return session ? session(req, body, res, send) : send(res, 200, { status: 'ok', token: 'session-token' });
      if (req.url === '/v1/angle') return angle(req, body, res, send);
      return send(res, 404, {});
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${srv.address().port}`, seen, close: () => { srv.closeAllConnections(); srv.close(); } };
}

test('Another Angle adapter: a real-model answer is AI, with its estimated cost; only the words and the feeling are sent', async () => {
  const s = await angleServer();
  try {
    const p = createAnotherAngle({ baseUrl: s.base, serviceToken: 'service-token', timeoutMs: 2000 });
    assert.equal(p.configured, true);
    const r = await p({ text: FEELING, label: 'worry', mallow: 'loomi', estimateAud: 0.07 });
    assert.equal(r.status, 'ok');
    assert.equal(r.source, 'ai');
    assert.equal(r.text, 'That quiet is the part that happened. What it means is still an open question.');
    assert.equal(r.model, 'another-angle:angle-v5');
    assert.equal(r.mallow, 'zuzu');
    assert.equal(r.costAud, 0.07, 'the Mallow’s estimate is used');
    assert.ok(Number.isFinite(r.ms));
    const call = s.seen.find((x) => x.url === '/v1/angle');
    assert.equal(call.headers.authorization, 'Bearer service-token');
    assert.deepEqual(Object.keys(call.body).sort(), ['consent', 'emotion', 'intention', 'locale', 'text']);
    assert.equal(call.body.emotion, 'worry');
    assert.ok(!JSON.stringify(s.seen).includes('m-1'), 'nothing about the person');
    // without an estimate from the Mallow, its own configured one
    assert.equal((await createAnotherAngle({ baseUrl: s.base, serviceToken: 't', costPerCallAud: 0.05 })({ text: FEELING, label: 'worry' })).costAud, 0.05);
  } finally { s.close(); }
});

test('Another Angle adapter: a session from Hushmates’ own device id (and invite), renewed once on 401', async () => {
  let sessions = 0;
  let first = true;
  const s = await angleServer({
    session: (req, body, res, send) => { sessions += 1; send(res, 200, { status: 'ok', token: `tok-${sessions}` }); },
    angle: (req, body, res, send) => (first ? (first = false, send(res, 401, { status: 'error' })) : send(res, 200, SCENE)),
  });
  try {
    const p = createAnotherAngle({ baseUrl: s.base, deviceId: 'hushmates-server-0001', invite: 'MALLOW-OCT', timeoutMs: 2000 });
    const r = await p({ text: FEELING, label: 'sadness' });
    assert.equal(r.status, 'ok');
    assert.equal(sessions, 2);
    const asked = s.seen.find((x) => x.url === '/v1/session');
    assert.deepEqual(asked.body, { device_id: 'hushmates-server-0001', invite: 'MALLOW-OCT' });
    assert.equal(s.seen.filter((x) => x.url === '/v1/angle').at(-1).headers.authorization, 'Bearer tok-2');
  } finally { s.close(); }
});

test('Another Angle adapter: errors, limits, fallbacks, support and the mock model map safely, with honest costs', async () => {
  const est = ANOTHER_ANGLE_DEFAULTS.costPerCallAud;
  const cases = [
    ['server error', (q, b, res, send) => send(res, 500, { status: 'error' }), { status: 'unavailable', reason: 'http-500' }, est],
    ['not configured', (q, b, res, send) => send(res, 503, { status: 'error' }), { status: 'unavailable', reason: 'http-503' }, 0],
    ['bad request', (q, b, res, send) => send(res, 400, { status: 'error' }), { status: 'unavailable', reason: 'http-400' }, 0],
    ['daily limit', (q, b, res, send) => send(res, 429, { status: 'limit' }), { status: 'unavailable', reason: 'rate-limited' }, 0],
    ['spending cap', (q, b, res, send) => send(res, 200, { status: 'fallback', fallback: { reason: 'capacity' } }), { status: 'unavailable', reason: 'over-budget' }, 0],
    ['quality', (q, b, res, send) => send(res, 200, { status: 'fallback', fallback: { reason: 'quality' } }), { status: 'unavailable', reason: 'quality' }, est],
    ['unclear', (q, b, res, send) => send(res, 200, { status: 'fallback', fallback: { reason: 'unclear' } }), { status: 'unavailable', reason: 'unclear' }, 0],
    ['crisis', (q, b, res, send) => send(res, 200, { status: 'crisis', support: {} }), { status: 'support', level: 'crisis' }, est],
    ['care', (q, b, res, send) => send(res, 200, { status: 'care', support: {} }), { status: 'support', level: 'care' }, est],
  ];
  for (const [name, angle, expected, cost] of cases) {
    const s = await angleServer({ angle });
    try {
      const r = await createAnotherAngle({ baseUrl: s.base, serviceToken: 't', timeoutMs: 2000 })({ text: FEELING, label: 'worry' });
      for (const [k, v] of Object.entries(expected)) assert.equal(r[k], v, `${name}: ${k}`);
      assert.equal(r.costAud, cost, `${name}: cost`);
      assert.equal(r.text, undefined, `${name}: words shown`);
    } finally { s.close(); }
  }
  // the service's mock model: a placeholder, never AI, never charged
  const mock = await angleServer({ provider: 'mock' });
  try {
    const r = await createAnotherAngle({ baseUrl: mock.base, serviceToken: 't', timeoutMs: 2000 })({ text: FEELING, label: 'worry' });
    assert.deepEqual([r.status, r.reason, r.costAud], ['unavailable', 'mock', 0]);
  } finally { mock.close(); }
});

test('Another Angle adapter: a stalled service is cut off at the deadline and charged at the estimate', async () => {
  const s = await angleServer({ angle: () => { /* never answers */ } });
  try {
    const p = createAnotherAngle({ baseUrl: s.base, serviceToken: 't', timeoutMs: 300 });
    const t = Date.now();
    const r = await p({ text: FEELING, label: 'worry' });
    assert.ok(Date.now() - t < 1500, `took ${Date.now() - t} ms`);
    assert.equal(r.status, 'unavailable');
    assert.equal(r.reason, 'timeout');
    assert.equal(r.costAud, ANOTHER_ANGLE_DEFAULTS.costPerCallAud);
    // a session request that stalls is cut off too
    const slow = await angleServer({ session: () => { /* never answers */ } });
    try {
      const q = await createAnotherAngle({ baseUrl: slow.base, deviceId: 'hushmates-server-0001', timeoutMs: 300 })({ text: FEELING, label: 'worry' });
      assert.equal(q.status, 'unavailable');
      assert.equal(q.costAud, 0, 'nothing reached the model');
    } finally { slow.close(); }
  } finally { s.close(); }
});

test('Another Angle adapter: unconfigured or a plain-HTTP remote address never sends anything', async () => {
  let calls = 0;
  const fetch = async () => { calls += 1; return new Response('{}'); };
  for (const cfg of [{}, { baseUrl: 'http://angle.example.com', serviceToken: 't' }, { baseUrl: 'https://angle.example.com' }, { baseUrl: 'https://angle.example.com', deviceId: 'short' }]) {
    const p = createAnotherAngle({ ...cfg, fetch });
    assert.equal(p.configured, false, JSON.stringify(cfg));
    assert.deepEqual(await p({ text: FEELING, label: 'worry' }), { status: 'unavailable', reason: 'unconfigured', costAud: 0, ms: 0 });
  }
  assert.equal(calls, 0);
  const env = anotherAngleSettings({ ANOTHER_ANGLE_URL: 'https://angle.example.com/', ANOTHER_ANGLE_DEVICE_ID: 'hushmates-server-0001', ANOTHER_ANGLE_TIMEOUT_MS: '5000', ANOTHER_ANGLE_COST_PER_CALL_AUD: '0.48' });
  assert.deepEqual(env, { baseUrl: 'https://angle.example.com', serviceToken: null, deviceId: 'hushmates-server-0001', invite: null, timeoutMs: 5000, costPerCallAud: 0.48 });
  assert.deepEqual(anotherAngleSettings((k) => ({ ANOTHER_ANGLE_URL: 'http://evil.example' })[k]).baseUrl, null);
  assert.equal(anotherAngleSettings({}).costPerCallAud, 0.06);
  // the names the Edge Function's entry point uses work too
  assert.deepEqual([anotherAngleSettings({ HUSHMATES_AI_URL: 'https://a.example', HUSHMATES_AI_TOKEN: 'tok' }).baseUrl, anotherAngleSettings({ HUSHMATES_AI_TOKEN: 'tok' }).serviceToken], ['https://a.example', 'tok']);
});

test('end to end: the Mallow with the Another Angle adapter, against the fake service', async () => {
  let fail = false;
  const s = await angleServer({ angle: (q, b, res, send) => (fail ? send(res, 500, { status: 'error' }) : send(res, 200, SCENE)) });
  try {
    const ai = createAnotherAngle({ baseUrl: s.base, serviceToken: 't', timeoutMs: 2000 });
    const r = rig({ ai });
    const out = await ask(r, { journeyId: 'jr-1' });
    assert.equal(out.source, 'ai');
    assert.equal(out.model, 'another-angle:angle-v5');
    assert.equal(out.voice, 'zuzu');
    fail = true;
    const next = await ask(r, { memberId: 'm-2', journeyId: 'jr-2' });
    assert.equal(next.source, 'library');
    const rows = r.usage.rows();
    assert.deepEqual(rows.map((x) => [x.status, x.costAud, x.reason]), [['ok', 0.06, null], ['unavailable', 0.06, 'http-500']]);
    assert.equal(await r.usage.aiSpentThisMonthAud(T0), 0.12);
    // with AI switched off, the service isn't contacted at all
    const before = s.seen.length;
    const off = rig({ ai, aiSettings: { ...ON, enabled: false } });
    assert.equal((await ask(off)).source, 'library');
    assert.equal(s.seen.length, before);
  } finally { s.close(); }
});
