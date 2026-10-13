// Hushmates 2.0 upgrade rules: explicit sharing consent, "Send it out again",
// accurate returns when nobody (or only some people) caught a feeling, the
// Mallow kept apart once five people answered, the author's own Mallow, and
// contributors' consent before their words can appear in a share picture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, throwsCode, rejectsCode, cid, FEELING, REFRAMES } from './relay-helpers.mjs';
import { LocalNetwork } from '../net/local-network.js';
import { PERSPECTIVE_LABELS } from '../core/relay-config.js';

const MIN = 60e3;
const HOUR = 3600e3;
const aiLike = async ({ mallow }) => ({ status: 'ok', text: 'Maybe the quiet says more about their week than about you.', mallow, source: 'ai', model: 't' });

// ------------------------------------------------------------- consent --
test('consent: nothing is released without the author actively agreeing to share it', () => {
  const w = world();
  throwsCode(() => w.svc.submitFeeling(w.T.moon, { text: FEELING, clientId: cid() }), 'consent-required');
  throwsCode(() => w.svc.submitFeeling(w.T.moon, { text: FEELING, consent: 'yes', clientId: cid() }), 'consent-required');
  assert.equal(Object.keys(w.svc.s.journeys).length, 0);
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null);
});

test('consent: a client that skips the interface is refused the same way', async () => {
  const w = world();
  const net = new LocalNetwork(w.svc, { latency: [0, 0], random: () => 0.5, schedule: (fn) => fn() });
  await rejectsCode(net.link('moon').request('submitFeeling', w.T.moon, { text: FEELING, clientId: cid() }), 'consent-required');
  assert.equal(Object.keys(w.svc.s.journeys).length, 0);
});

test('consent: crisis words get support even before consent (they are never shared either way)', () => {
  const w = world();
  const r = w.svc.submitFeeling(w.T.moon, { text: 'I want to end it all', clientId: cid() });
  assert.equal(r.status, 'support');
  assert.equal(Object.keys(w.svc.s.journeys).length, 0);
});

test('consent: the time of each consent is recorded with the feeling', () => {
  const w = world();
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const j = w.svc.s.journeys[id];
  assert.equal(j.consentAt, w.clock.t);
  assert.equal(j.fallbackConsentAt, w.clock.t);
  const id2 = w.release('moon', { text: 'Another feeling about my week' }).journey.id;
  assert.equal(w.svc.s.journeys[id2].fallbackConsentAt, null, 'the Mallow fallback is off unless chosen');
});

// --------------------------------------------- when nobody catches it --
test('zero humans: after the journey time it comes home honestly, with nothing invented', () => {
  const w = world();
  const id = w.release().journey.id;
  w.advance(24 * HOUR + 1);
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.status, 'returned');
  assert.equal(j.returnReason, 'expired');
  assert.equal(j.humanCount, 0);
  assert.deepEqual(j.collection, []);
  assert.equal(j.mallowExtra, null);
  assert.equal(j.canResend, true);
});

test('send it out again: a feeling nobody caught travels once more, without reaching anyone who let it pass', () => {
  const w = world();
  const id = w.release().journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.letFloatPast(w.T.cloud, { holdId: offer.holdId });
  w.advance(24 * HOUR + 1);
  const t0 = w.clock.t;
  const r = w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: 'resend-0001' });
  assert.equal(r.status, 'released');
  assert.equal(r.journey.status, 'travelling');
  assert.equal(r.journey.expiresAt, t0 + 24 * HOUR);
  assert.equal(r.journey.resends, 1);
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null, 'shown twice to someone who let it float past');
  assert.ok(w.svc.findFeeling(w.T.star).offer, 'someone new can catch it');
  // a lost reply retried with the same id is the same resend
  const again = w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: 'resend-0001' });
  assert.equal(again.duplicate, true);
  assert.equal(w.svc.s.journeys[id].resends, 1);
});

test('send it out again: only when nobody caught it, a few times at most, within the usual limits', () => {
  const w = world({ limits: { maxResends: 1 } });
  const a = w.release().journey.id;
  w.give('cloud', REFRAMES[0]);
  w.advance(24 * HOUR + 1);
  throwsCode(() => w.svc.resendJourney(w.T.moon, { journeyId: a, clientId: cid() }), 'not-available');   // one person caught it
  const b = w.release('moon', { text: 'Nobody noticed my new haircut and I feel invisible' }).journey.id;
  w.advance(24 * HOUR + 1);
  w.svc.resendJourney(w.T.moon, { journeyId: b, clientId: cid() });
  w.advance(24 * HOUR + 1);
  throwsCode(() => w.svc.resendJourney(w.T.moon, { journeyId: b, clientId: cid() }), 'resend-limit');
  throwsCode(() => w.svc.resendJourney(w.T.cloud, { journeyId: b, clientId: cid() }), 'not-found');   // not theirs
  const travelling = w.svc.s.journeys[a].status;
  assert.equal(travelling, 'returned');
});

test('send it out again: counts against feelings travelling at once', () => {
  const w = world({ limits: { maxActiveJourneys: 1 } });
  const a = w.release().journey.id;
  w.advance(24 * HOUR + 1);
  w.release('moon', { text: 'A different feeling about my exams' });
  throwsCode(() => w.svc.resendJourney(w.T.moon, { journeyId: a, clientId: cid() }), 'too-many-active');
});

test('send it out again: the Mallow can be allowed now, and becomes available 30 minutes after the new release', () => {
  const w = world({ provider: aiLike });
  const id = w.release().journey.id;
  w.advance(24 * HOUR + 1);
  w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: cid(), allowFallback: true });
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.status, 'waiting');
  w.advance(31 * MIN);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.status, 'available');
});

// --------------------------------------------- partial participation --
test('partial: two people catch it, then time runs out; exactly their two perspectives come home', () => {
  const w = world();
  const id = w.release().journey.id;
  w.give('cloud', REFRAMES[0]);
  w.give('star', REFRAMES[1]);
  w.advance(24 * HOUR + 1);
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.status, 'returned');
  assert.equal(j.returnReason, 'expired');
  assert.equal(j.humanCount, 2);
  assert.equal(j.petals.length, 2);
  assert.deepEqual(j.collection.map((p) => p.text), [REFRAMES[0], REFRAMES[1]]);
  assert.ok(j.collection.every((p) => p.kind === 'human' && p.label === PERSPECTIVE_LABELS.human));
  assert.equal(j.canResend, false);
});

// --------------------------------------- the Mallow, kept in its place --
test('mallow: comes from the author’s own Mallow, labelled as automatically generated, never counted', async () => {
  const w = world({ provider: aiLike });
  const id = w.release('moon', { allowFallback: true, mallow: 'zuzu' }).journey.id;
  w.advance(31 * MIN);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.mallow, 'zuzu');
  const j = await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(j.collection[0].mallow, 'zuzu');
  assert.equal(j.collection[0].label, 'A Mallow perspective · Automatically generated');
  assert.equal(j.humanCount, 0);
  assert.equal(j.petals.length, 0);
});

test('mallow: once five people answer, it moves to its own optional place and the human count stays exact', async () => {
  const w = world({ provider: aiLike });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: id });
  ['cloud', 'star', 'fern', 'dream', 'pebble'].forEach((k, i) => w.give(k, REFRAMES[i]));
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.humanCount, 5);
  assert.equal(j.collection.length, 5);
  assert.ok(j.collection.every((p) => p.kind === 'human'));
  assert.ok(j.mallowExtra && j.mallowExtra.kind === 'mallow');
  assert.equal(j.mallowExtra.label, 'A Mallow perspective · Automatically generated');
  // it can still be kept, reported or let go
  const kept = w.svc.choosePerspective(w.T.moon, { journeyId: id, perspectiveId: j.mallowExtra.id, keep: true });
  assert.equal(kept.mallowExtra.kept, true);
  const released = w.svc.releaseJourney(w.T.moon, { journeyId: id });
  assert.ok(released.mallowExtra, 'kept Mallow perspective stays after letting the feeling go');
  assert.equal(released.collection.length, 0, 'un-kept human perspectives leave with the feeling');
});

test('mallow: a reported extra Mallow perspective disappears', async () => {
  const w = world({ provider: aiLike });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: id });
  ['cloud', 'star', 'fern', 'dream', 'pebble'].forEach((k, i) => w.give(k, REFRAMES[i]));
  const { mallowExtra } = w.svc.getJourney(w.T.moon, { journeyId: id });
  const out = w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: mallowExtra.id, reason: 'unkind' });
  assert.equal(out.journey.mallowExtra, null);
});

test('mallow: a canned example is never called generated', () => {
  assert.ok(!/generated/i.test(PERSPECTIVE_LABELS.demo.replace('not generated', '')));
  assert.match(PERSPECTIVE_LABELS.demo, /not generated/);
  assert.equal(PERSPECTIVE_LABELS.human, 'A Hushmate’s perspective');
});

// ------------------------------------ contributors' consent to sharing --
test('share consent: a perspective may appear in the author’s picture only if its writer said yes', () => {
  const w = world();
  const id = w.release().journey.id;
  const catchAndGive = (key, text, allowShare) => {
    const { offer } = w.svc.findFeeling(w.T[key]);
    w.svc.catchFeeling(w.T[key], { holdId: offer.holdId });
    return w.svc.submitReframe(w.T[key], { holdId: offer.holdId, text, clientId: cid(), allowShare });
  };
  catchAndGive('cloud', REFRAMES[0], true);
  catchAndGive('star', REFRAMES[1]);
  catchAndGive('fern', REFRAMES[2], 'yes');
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.deepEqual(j.collection.map((p) => p.shareable), [true, false, false]);
  assert.ok(!JSON.stringify(j).includes(Object.values(w.svc.s.accounts).find((a) => a.key === 'cloud').id), 'no contributor identity in the view');
});

// ----------------------------------------------------- honest counts --
test('counts: human count, petals and progress never include a Mallow or a hidden person', async () => {
  const w = world({ provider: aiLike });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: id });
  w.give('cloud', REFRAMES[0]);
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.humanCount, 1);
  assert.equal(j.petals.length, 1);
  assert.equal(j.of, 5);
});

test('explore another angle: the author can opt in at home with consent; never silently, never for nothing', async () => {
  const w = world({ provider: aiLike });
  const id = w.release().journey.id;                       // Mallow fallback off at release
  w.advance(10 * MIN);
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: id, consent: true }), 'fallback-not-yet');   // too early: nothing recorded
  assert.equal(w.svc.s.journeys[id].fallbackConsentAt, null);
  w.advance(24 * HOUR);
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: id }), 'fallback-off');                  // no consent, no call
  const j = await w.svc.askMallow(w.T.moon, { journeyId: id, consent: true });
  assert.equal(j.fallback.status, 'ready');
  assert.ok(w.svc.s.journeys[id].fallbackConsentAt);
  const partly = w.release('moon', { text: 'Another feeling about the weekend' }).journey.id;
  w.give('cloud', REFRAMES[0]);
  w.advance(31 * MIN);
  // still travelling and a person caught it: humans first, and nothing is recorded
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: partly, consent: true }), 'fallback-not-yet');
  assert.equal(w.svc.s.journeys[partly].fallbackConsentAt, null);
  assert.equal(w.svc.s.journeys[partly].allowFallback, false);
});

// ------------------------------------------------ a catcher who may not be safe --
test('a catcher whose words suggest they may not be safe gets support; nothing is stored or passed on, the feeling floats on', () => {
  const w = world();
  const id = w.release().journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  const res = w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: 'Honestly I feel the same, I don’t want to be alive any more either.', clientId: cid('r') });
  assert.equal(res.status, 'support');
  assert.equal(res.level, 'crisis');
  assert.ok(res.support.resources.length >= 2);
  assert.doesNotMatch(JSON.stringify(res.support), /reframe/i);
  assert.equal(Object.values(w.svc.s.reframes).length, 0, 'their words are never stored');
  assert.doesNotMatch(JSON.stringify(w.svc.toJSON()), /alive any more/, 'nor kept anywhere in state');
  assert.equal(w.svc.s.holds[offer.holdId].status, 'passed');
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.status, 'travelling');
  assert.equal(j.humanCount, 0);
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null, 'not offered to them again');
  assert.ok(w.svc.findFeeling(w.T.star).offer, 'someone else can catch it');
});

test('care-level words in a perspective are refused without support for the writer; release support copy is Hushmates’ own', () => {
  const w = world();
  w.release();
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  throwsCode(() => w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: 'Maybe what they did was abuse and you could talk to someone.', clientId: cid('r') }), 'reframe-unsafe');
  const bullying = w.svc.submitFeeling(w.T.star, { text: 'Someone at school keeps bullying me every day and I dread going in.', consent: true, clientId: cid('f') });
  assert.equal(bullying.status, 'support');
  assert.doesNotMatch(JSON.stringify(bullying.support), /reframe|rethink/i);
  assert.ok(!bullying.support.resources.some((r) => /domestic/i.test(r.label)), 'bullying gets general support lines, not domestic-abuse lines');
});

// ------------------------------------------------------------- early recall --
test('early recall: it comes home with the perspectives so far; a live hold ends and that person can’t add theirs', () => {
  const w = world();
  const id = w.release().journey.id;
  w.give('cloud', REFRAMES[0]);
  w.give('star', REFRAMES[1]);
  const { offer } = w.svc.findFeeling(w.T.fern);
  w.svc.catchFeeling(w.T.fern, { holdId: offer.holdId });
  const v = w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  assert.equal(v.status, 'returned');
  assert.equal(v.returnReason, 'withdrawn');
  assert.equal(v.humanCount, 2);
  assert.equal(v.collection.length, 2);
  throwsCode(() => w.svc.submitReframe(w.T.fern, { holdId: offer.holdId, text: REFRAMES[2], clientId: cid('r') }), 'not-available');
  assert.equal(w.svc.findFeeling(w.T.dream).offer, null, 'it no longer travels');
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).humanCount, 2);
});

// ------------------------------------------------------- taking a perspective back --
test('a writer can take back their perspective: removed for good, the count drops honestly, nobody else can do it', () => {
  const w = world();
  const id = w.release().journey.id;
  const pid = w.give('cloud', REFRAMES[0]).perspective.id;
  w.give('star', REFRAMES[1]);
  throwsCode(() => w.svc.withdrawPerspective(w.T.moon, { perspectiveId: pid }), 'not-found');   // not the author of the feeling
  throwsCode(() => w.svc.withdrawPerspective(w.T.star, { perspectiveId: pid }), 'not-found');   // nor anyone else
  const gifts = w.svc.withdrawPerspective(w.T.cloud, { perspectiveId: pid }).gifts;
  assert.equal(gifts.length, 0);
  assert.doesNotMatch(JSON.stringify(w.svc.toJSON()), /really full week/, 'the words are gone from state');
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  const v = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(v.humanCount, 1);
  assert.equal(v.collection.length, 1);
  assert.ok(v.events.some((e) => e.type === 'perspective-withdrawn'));
  assert.ok(!JSON.stringify(v.events).includes('cloud'), 'never who');
  throwsCode(() => w.svc.withdrawPerspective(w.T.cloud, { perspectiveId: pid }), 'not-found');   // once
});

// ------------------------------------------------- canned examples stay in the lab --
test('outside the lab, a canned example is never shown as a Mallow perspective; the Reframe library is', async () => {
  const { demoProvider, libraryProvider } = await import('../core/perspectives.js');
  const prod = world({ provider: demoProvider(), cannedExamples: false });
  const a = prod.release('moon', { allowFallback: true }).journey.id;
  prod.advance(31 * MIN);
  const v = await prod.svc.askMallow(prod.T.moon, { journeyId: a });
  assert.equal(v.fallback.status, 'failed');
  assert.equal(v.collection.length, 0);
  const lib = world({ provider: libraryProvider(), cannedExamples: false });
  const b = lib.release('moon', { allowFallback: true }).journey.id;
  lib.advance(31 * MIN);
  const u = await lib.svc.askMallow(lib.T.moon, { journeyId: b });
  assert.equal(u.fallback.status, 'ready');
  assert.equal(u.collection[0].label, 'A Mallow perspective · Automatically generated');
});

test('the canned examples speak in each Mallow’s own voice', async () => {
  const { demoProvider } = await import('../core/perspectives.js');
  const p = demoProvider();
  const lines = new Set();
  for (const m of ['noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi']) lines.add((await p({ text: 'x', label: 'worry', mallow: m })).text);
  assert.equal(lines.size, 7);
});
