// The Feeling Relay rules, tested at the service (the enforcement point).
//   node --test hushmallow/hushmates-lab/tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, throwsCode, rejectsCode, cid, FEELING, REFRAMES } from './relay-helpers.mjs';
import { demoProvider } from '../core/perspectives.js';

const MIN = 60e3, HOUR = 3600e3;
const json = (x) => JSON.stringify(x);

test('a released feeling travels through five different people and comes home', () => {
  const w = world();
  const r = w.release();
  assert.equal(r.status, 'released');
  const id = r.journey.id;
  ['cloud', 'star', 'fern', 'dream', 'pebble'].forEach((k, i) => {
    const out = w.give(k, REFRAMES[i]);
    assert.equal(out.slot, i + 1);
    assert.equal(out.homeward, i === 4);
  });
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.status, 'returned');
  assert.equal(j.returnReason, 'complete');
  assert.equal(j.collection.length, 5);
  assert.ok(j.collection.every((p) => p.kind === 'human' && p.label === 'A Hushmate’s perspective'));
  assert.deepEqual(j.collection.map((p) => p.text), REFRAMES);
});

test('never more than five human perspectives: a sixth person finds nothing', () => {
  const w = world();
  w.release();
  for (const [i, k] of ['cloud', 'star', 'fern', 'dream', 'pebble'].entries()) w.give(k, REFRAMES[i]);
  assert.equal(w.svc.findFeeling(w.T.ember).offer, null);
});

test('the author can never catch or reframe their own feeling', () => {
  const w = world();
  w.release();
  assert.equal(w.svc.findFeeling(w.T.moon).offer, null);
});

test('one perspective per person per feeling, and the same feeling is never offered twice', () => {
  const w = world();
  w.release();
  w.give('cloud', REFRAMES[0]);
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null);
  // letting it float past also keeps it out of that person's sky
  const { offer } = w.svc.findFeeling(w.T.star);
  w.svc.letFloatPast(w.T.star, { holdId: offer.holdId });
  assert.equal(w.svc.findFeeling(w.T.star).offer, null);
});

test('holds are atomic: two people can never take the same last slot', () => {
  const w = world({ limits: { perspectivesPerFeeling: 2 } });
  w.release();
  w.give('cloud', REFRAMES[0]);
  const a = w.svc.findFeeling(w.T.star).offer;
  const b = w.svc.findFeeling(w.T.fern).offer;
  assert.ok(a);
  assert.equal(b, null);                                  // the only slot is held
  w.svc.catchFeeling(w.T.star, { holdId: a.holdId });
  w.svc.submitReframe(w.T.star, { holdId: a.holdId, text: REFRAMES[1], clientId: cid() });
  assert.equal(w.svc.listJourneys(w.T.moon).journeys[0].status, 'returned');
});

test('an expired hold frees the slot for someone else; the late writer is told kindly', () => {
  const w = world({ limits: { perspectivesPerFeeling: 1 } });
  w.release();
  const a = w.svc.findFeeling(w.T.cloud).offer;
  w.svc.catchFeeling(w.T.cloud, { holdId: a.holdId });
  assert.equal(w.svc.findFeeling(w.T.star).offer, null);
  w.advance(11 * MIN);                                     // catch hold is 10 minutes
  const b = w.svc.findFeeling(w.T.star).offer;
  assert.ok(b, 'slot released after expiry');
  throwsCode(() => w.svc.submitReframe(w.T.cloud, { holdId: a.holdId, text: REFRAMES[0], clientId: cid() }), 'hold-expired');
});

test('an offered feeling not caught within 3 minutes drifts on', () => {
  const w = world();
  w.release();
  const a = w.svc.findFeeling(w.T.cloud).offer;
  w.advance(4 * MIN);
  throwsCode(() => w.svc.catchFeeling(w.T.cloud, { holdId: a.holdId }), 'hold-expired');
});

test('submissions and perspectives are idempotent (same clientId → same result)', () => {
  const w = world();
  const a = w.svc.submitFeeling(w.T.moon, { consent: true, text: FEELING, clientId: 'same-feeling-01' });
  const b = w.svc.submitFeeling(w.T.moon, { consent: true, text: FEELING, clientId: 'same-feeling-01' });
  assert.equal(a.journey.id, b.journey.id);
  assert.equal(b.duplicate, true);
  assert.equal(w.svc.listJourneys(w.T.moon).journeys.length, 1);
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  const r1 = w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: REFRAMES[0], clientId: 'same-reframe-1' });
  const r2 = w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: REFRAMES[0], clientId: 'same-reframe-1' });
  assert.equal(r1.perspective.id, r2.perspective.id);
  assert.equal(r2.duplicate, true);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: a.journey.id }).humanCount, 1);
});

test('a perspective must be caught first and must be the catcher’s own hold', () => {
  const w = world();
  w.release();
  const { offer } = w.svc.findFeeling(w.T.cloud);
  throwsCode(() => w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: REFRAMES[0], clientId: cid() }), 'invalid');
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  throwsCode(() => w.svc.submitReframe(w.T.star, { holdId: offer.holdId, text: REFRAMES[0], clientId: cid() }), 'not-found');
  throwsCode(() => w.svc.catchFeeling(w.T.star, { holdId: offer.holdId }), 'not-found');
});

test('fair distribution: older feelings are offered first and never starve', () => {
  const w = world({ limits: { fairnessPool: 1 } });
  const first = w.release('moon').journey.id;
  w.advance(5 * MIN);
  w.release('ember');
  const offer = w.svc.findFeeling(w.T.cloud).offer;
  assert.equal(w.svc.s.holds[offer.holdId].journeyId, first);
});

test('screening: contact details are refused; crisis words get support and are never circulated or stored', () => {
  const w = world();
  throwsCode(() => w.svc.submitFeeling(w.T.moon, { consent: true, text: 'message me on whatsapp 07700 900123', clientId: cid() }), 'feeling-contact');
  throwsCode(() => w.svc.submitFeeling(w.T.moon, { consent: true, text: 'I live at 22 Baker Street and it is lonely', clientId: cid() }), 'feeling-identifying');
  const crisis = w.svc.submitFeeling(w.T.moon, { consent: true, text: 'I want to end it all', clientId: cid(), allowFallback: true });
  assert.equal(crisis.status, 'support');
  assert.equal(crisis.level, 'crisis');
  assert.ok(crisis.support.message);
  assert.equal(Object.keys(w.svc.s.journeys).length, 0);
  assert.ok(!json(w.svc.s).includes('end it all'));
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null);
});

test('perspectives must be kind possibilities: no insults, diagnoses, contact details or near-copies', () => {
  const w = world();
  w.release();
  w.give('cloud', REFRAMES[0]);
  const { offer } = w.svc.findFeeling(w.T.star);
  w.svc.catchFeeling(w.T.star, { holdId: offer.holdId });
  const tryText = (text) => () => w.svc.submitReframe(w.T.star, { holdId: offer.holdId, text, clientId: cid() });
  throwsCode(tryText('Honestly you are being so dramatic about it.'), 'reframe-unkind');
  throwsCode(tryText('Sounds like they might be a narcissist.'), 'reframe-diagnosis');
  throwsCode(tryText('Add me on insta and we can talk about it'), 'reframe-contact');
  throwsCode(tryText(REFRAMES[0].replace('really ', '')), 'reframe-too-similar');
  throwsCode(tryText('ok'), 'reframe-too-short');
  assert.equal(tryText(REFRAMES[1])().slot, 2);
});

test('contributors see earlier perspectives only after giving their own, and never who wrote them', () => {
  const w = world();
  w.release();
  w.give('cloud', REFRAMES[0]);
  const { offer } = w.svc.findFeeling(w.T.star);
  assert.ok(!json(offer).includes(REFRAMES[0]), 'not shown before writing');
  w.svc.catchFeeling(w.T.star, { holdId: offer.holdId });
  const out = w.svc.submitReframe(w.T.star, { holdId: offer.holdId, text: REFRAMES[1], clientId: cid() });
  assert.deepEqual(out.earlier.map((e) => e.text), [REFRAMES[0]]);
  const cloudId = Object.values(w.svc.s.accounts).find((a) => a.key === 'cloud').id;
  assert.ok(!json(out).includes(cloudId) && !json(out).includes('CloudMallow'));
});

test('privacy: the author never learns who caught it, catchers never learn who wrote it', () => {
  const w = world();
  w.release();
  w.give('cloud', REFRAMES[0]);
  const offer = w.svc.findFeeling(w.T.star).offer;
  const authorView = json([w.svc.listJourneys(w.T.moon), w.svc.me(w.T.moon)]);
  for (const k of ['cloud', 'star']) {
    const acc = Object.values(w.svc.s.accounts).find((a) => a.key === k);
    assert.ok(!authorView.includes(acc.id));
  }
  assert.ok(!authorView.includes('CloudMallow') && !authorView.includes('StarMallow'));
  const moon = Object.values(w.svc.s.accounts).find((a) => a.key === 'moon');
  assert.ok(!json(offer).includes(moon.id) && !json(offer).includes('MoonMallow'));
});

test('perspectives stay sealed while travelling and are revealed when the feeling comes home', () => {
  const w = world();
  const id = w.release().journey.id;
  w.give('cloud', REFRAMES[0]);
  const travelling = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(travelling.humanCount, 1);
  assert.equal(travelling.collection.length, 0);
  assert.ok(!json(travelling).includes(REFRAMES[0]));
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  const home = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(home.returnReason, 'withdrawn');
  assert.equal(home.collection[0].text, REFRAMES[0]);
  assert.equal(w.svc.findFeeling(w.T.star).offer, null, 'withdrawn feelings stop circulating');
});

test('after 24 hours a feeling returns with whatever it has, even fewer than five', () => {
  const w = world();
  const id = w.release().journey.id;
  w.give('cloud', REFRAMES[0]);
  w.give('star', REFRAMES[1]);
  w.advance(25 * HOUR);
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.status, 'returned');
  assert.equal(j.returnReason, 'expired');
  assert.equal(j.collection.length, 2);
});

test('limits: concurrent travelling feelings and submission rate (no lifetime quota)', () => {
  const w = world();
  for (let i = 0; i < 3; i++) w.svc.submitFeeling(w.T.moon, { consent: true, text: `${FEELING} (${i})`, clientId: cid() });
  throwsCode(() => w.svc.submitFeeling(w.T.moon, { consent: true, text: FEELING, clientId: cid() }), 'too-many-active');
  // once feelings come home you can keep sending more over time
  w.advance(25 * HOUR);
  for (let i = 0; i < 3; i++) w.svc.submitFeeling(w.T.moon, { consent: true, text: `${FEELING} again (${i})`, clientId: cid() });
  assert.equal(w.svc.listJourneys(w.T.moon).journeys.length, 6);
});

test('catching is opt-in', () => {
  const w = world();
  w.release();
  w.svc.savePreferences(w.T.cloud, { catching: false });
  throwsCode(() => w.svc.findFeeling(w.T.cloud), 'not-catching');
});

test('choices: keep, let go, save, release and delete', () => {
  const w = world();
  const id = w.release().journey.id;
  ['cloud', 'star', 'fern'].forEach((k, i) => w.give(k, REFRAMES[i]));
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  let j = w.svc.getJourney(w.T.moon, { journeyId: id });
  w.svc.markReturnSeen(w.T.moon, { journeyId: id });
  w.svc.choosePerspective(w.T.moon, { journeyId: id, perspectiveId: j.collection[0].id, keep: true });
  w.svc.choosePerspective(w.T.moon, { journeyId: id, perspectiveId: j.collection[1].id, keep: false });
  j = w.svc.saveJourney(w.T.moon, { journeyId: id });
  assert.equal(j.saved, true);
  assert.equal(j.collection[0].kept, true);
  j = w.svc.releaseJourney(w.T.moon, { journeyId: id });
  assert.equal(j.status, 'released');
  assert.equal(j.text, '');
  assert.deepEqual(j.collection.map((p) => p.text), [REFRAMES[0]], 'only the kept perspective stays');
  throwsCode(() => w.svc.deleteJourney(w.T.moon, { journeyId: id }), 'invalid');
  w.svc.deleteJourney(w.T.moon, { journeyId: id, confirm: 'DELETE' });
  throwsCode(() => w.svc.getJourney(w.T.moon, { journeyId: id }), 'not-found');
  assert.ok(!json(w.svc.s).includes(REFRAMES[0]));
});

test('reports: a catcher’s report removes it from their sky; two reports pause it for human review', () => {
  const w = world();
  const id = w.release().journey.id;
  const a = w.svc.findFeeling(w.T.cloud).offer;
  const r = w.svc.reportFeeling(w.T.cloud, { holdId: a.holdId, reason: 'unkind' });
  assert.match(r.expectation, /person on our safety team/);
  const b = w.svc.findFeeling(w.T.star).offer;
  w.svc.reportFeeling(w.T.star, { holdId: b.holdId, reason: 'harassment' });
  assert.equal(w.svc.s.journeys[id].paused, true);
  assert.equal(w.svc.findFeeling(w.T.fern).offer, null);
  const reports = w.svc.modListReports(w.T.mod).reports;
  assert.equal(reports.length, 2);
  w.svc.modResolve(w.T.mod, { id: reports[0].id, action: 'resume-feeling', note: 'not abusive' });
  assert.ok(w.svc.findFeeling(w.T.fern).offer);
  throwsCode(() => w.svc.modListReports(w.T.moon), 'forbidden');
});

test('the author can report or block a perspective; blocking keeps the two apart without revealing who', () => {
  const w = world();
  const id = w.release().journey.id;
  w.give('cloud', REFRAMES[0]);
  w.give('star', REFRAMES[1]);
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  const col = w.svc.getJourney(w.T.moon, { journeyId: id }).collection;
  const rep = w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: col[0].id, reason: 'unkind' });
  assert.equal(rep.journey.collection.length, 1);
  w.svc.blockContributor(w.T.moon, { journeyId: id, perspectiveId: col[1].id });
  w.release('moon', { text: 'Another feeling about a different day entirely.' });
  assert.equal(w.svc.findFeeling(w.T.star).offer, null, 'the blocked contributor never meets this author again');
  assert.ok(w.svc.findFeeling(w.T.fern).offer);
});

// ----------------------------------------------- the Mallow fallback --
const countingProvider = (inner = demoProvider()) => {
  const p = async (args) => { p.calls += 1; await new Promise((r) => setTimeout(r, 5)); return inner(args); };
  p.calls = 0;
  return p;
};

test('fallback is opt-in: without consent the text never reaches a provider', async () => {
  const provider = countingProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: false }).journey.id;
  w.advance(31 * MIN);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.status, 'off');
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: id }), 'fallback-off');
  assert.equal(provider.calls, 0);
});

test('fallback is human-first: not before 30 minutes, and not once a person has caught it', async () => {
  const provider = countingProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: id }), 'fallback-not-yet');
  w.give('cloud', REFRAMES[0]);
  w.advance(31 * MIN);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.status, 'not-needed');
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: id }), 'fallback-not-yet');
  assert.equal(provider.calls, 0);
});

test('fallback: one generation per feeling, ever: concurrent and repeated requests share it', async () => {
  const provider = countingProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.status, 'available');
  const [a, b] = await Promise.all([w.svc.askMallow(w.T.moon, { journeyId: id }), w.svc.askMallow(w.T.moon, { journeyId: id })]);
  await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(provider.calls, 1);
  assert.deepEqual(a.collection, b.collection);
  const p = a.collection[0];
  assert.equal(p.kind, 'mallow');
  assert.equal(p.label, 'A Mallow perspective · Example for testing, not generated');
  assert.equal(a.humanCount, 0, 'a Mallow is never counted as a person');
});

test('fallback is labelled honestly by source and never fills a slot five people filled', async () => {
  const aiLike = async ({ mallow }) => ({ status: 'ok', text: 'Maybe the silence is about their week, not about you.', mallow, source: 'ai', model: 'test' });
  const w = world({ provider: aiLike });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  let j = await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(j.collection[0].label, 'A Mallow perspective · Automatically generated');
  // humans keep coming while the journey is open; five people push the Mallow out
  ['cloud', 'star', 'fern', 'dream', 'pebble'].forEach((k, i) => w.give(k, REFRAMES[i]));
  j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.status, 'returned');
  assert.equal(j.collection.length, 5);
  assert.ok(j.collection.every((x) => x.kind === 'human'));
  assert.equal(j.fallback.superseded, true);
});

test('fallback failure is graceful: the feeling still comes home, and nothing retries', async () => {
  const broken = countingProvider(async () => { throw new Error('provider down'); });
  const w = world({ provider: broken });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const j = await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(j.fallback.status, 'failed');
  await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(broken.calls, 1);
  w.advance(24 * HOUR);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).status, 'returned');
});

test('fallback budget: per person per day and for the whole service', async () => {
  const provider = countingProvider();
  const w = world({ provider, limits: { fallbackPerPersonPerDay: 1, maxActiveJourneys: 5 } });
  const a = w.release('moon', { allowFallback: true, text: 'First feeling that nobody catches today.' }).journey.id;
  const b = w.release('moon', { allowFallback: true, text: 'Second feeling that nobody catches today.' }).journey.id;
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: a });
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: b }), 'fallback-budget');
  assert.equal(provider.calls, 1);
});

test('a provider asked to support is never shown as a perspective', async () => {
  const w = world({ provider: async () => ({ status: 'support' }) });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const j = await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(j.fallback.status, 'failed');
  assert.equal(j.collection.length, 0);
});

test('deleting your data withdraws your feelings and the perspectives you gave', () => {
  const w = world();
  const id = w.release().journey.id;
  w.give('cloud', REFRAMES[0]);
  w.svc.deleteMyData(w.T.cloud, { confirm: 'DELETE' });
  throwsCode(() => w.svc.me(w.T.cloud), 'not-signed-in');
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).collection.length, 0);
  w.svc.deleteMyData(w.T.moon, { confirm: 'DELETE' });
  assert.ok(!json(w.svc.s).includes('avoiding me'));
});

test('a Mallow perspective that breaks the perspective rules is never shown (provider output is screened too)', async () => {
  const w = world({ provider: async ({ mallow }) => ({ status: 'ok', text: 'You are just being dramatic, get over it.', mallow, source: 'ai' }) });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * 60e3);
  const j = await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(j.fallback.status, 'failed');
  assert.equal(j.collection.length, 0);
});

test('a restricted person who writes crisis words is still answered with support', () => {
  const w = world();
  const cloud = Object.values(w.svc.s.accounts).find((a) => a.key === 'cloud');
  cloud.state = 'restricted';
  const r = w.svc.submitFeeling(w.T.cloud, { consent: true, text: 'I want to end it all', clientId: cid('f') });
  assert.equal(r.status, 'support');
});
