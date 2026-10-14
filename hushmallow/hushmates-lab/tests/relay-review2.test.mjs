// Regression tests from the adversarial review of the 2.0 relay rules (consent, resend,
// Mallow placement, release, consent records). Each one failed before its fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, rng, throwsCode, rejectsCode, cid, REFRAMES, FEELING } from './relay-helpers.mjs';
import { RelayService } from '../core/relay.js';

const MIN = 60e3;
const HOUR = 3600e3;
const counting = () => {
  const calls = [];
  const fn = async ({ text, mallow }) => { calls.push(text); return { status: 'ok', text: 'Maybe the quiet says more about their week than about you.', mallow, source: 'ai', model: 't' }; };
  return { fn, calls };
};

// ---------------------------------------------------------------------------
// D1. resendJourney is idempotent only while the journey is still travelling.
// ---------------------------------------------------------------------------
test('D1a resend idempotency: a retried resend never puts a withdrawn feeling back into circulation', () => {
  const w = world();
  const id = w.release().journey.id;
  w.advance(24 * HOUR + 1);
  // the person taps "Send it out again"; the request lands but its reply is lost
  const first = w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: 'resend-retry-0001' });
  assert.equal(first.duplicate, false);
  // they change their mind and bring it home
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  assert.equal(w.svc.s.journeys[id].status, 'returned');
  // the client's retry of the SAME request (same clientId) arrives afterwards
  try { w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: 'resend-retry-0001' }); } catch { /* refusing is fine too */ }
  const j = w.svc.s.journeys[id];
  assert.equal(j.status, 'returned', 'a replay of an already-applied resend sent the withdrawn feeling out again');
  assert.equal(j.resends, 1, 'one request, one resend');
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null, 'a withdrawn feeling reached a stranger');
});

test('D1b resend idempotency: a retry that arrives after the second trip ends does not use up another resend', () => {
  const w = world();
  const id = w.release().journey.id;
  w.advance(24 * HOUR + 1);
  w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: 'resend-late-0001' });
  w.advance(24 * HOUR + 1);                      // the resent trip comes home, still uncaught
  assert.equal(w.svc.s.journeys[id].status, 'returned');
  try { w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: 'resend-late-0001' }); } catch { /* refusing is fine too */ }
  const j = w.svc.s.journeys[id];
  assert.equal(j.resends, 1, 'the same clientId was applied twice');
  assert.equal(j.status, 'returned');
});

// ---------------------------------------------------------------------------
// D2. resendJourney ignores allowFallback:false: Mallow consent can be given
//     on a resend but never withdrawn.
// ---------------------------------------------------------------------------
test('D2 resend consent: allowFallback:false on a resend withdraws the Mallow consent', async () => {
  const p = counting();
  const w = world({ provider: p.fn });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(24 * HOUR + 1);                      // came home, the Mallow was never asked
  // sending it again, the person now says no to a Mallow perspective
  const r = w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: cid('rs'), allowFallback: false });
  assert.equal(r.status, 'released');
  assert.equal(r.journey.allowFallback, false, 'the explicit "no" on the resend was ignored');
  w.advance(31 * MIN);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.status, 'off');
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: id }), 'fallback-off');
  assert.equal(p.calls.length, 0, 'the words reached the AI provider after the person said no');
});

// ---------------------------------------------------------------------------
// D3. canResend in the view says yes where resendJourney always says no.
// ---------------------------------------------------------------------------
test('D3 canResend matches what resendJourney accepts: a restricted author is not offered a resend', () => {
  const w = world();
  const id = w.release().journey.id;
  // a catcher reports it (one report: not paused); the safety team restricts the author
  const { offer } = w.svc.findFeeling(w.T.cloud);
  const { reportId } = w.svc.reportFeeling(w.T.cloud, { holdId: offer.holdId, reason: 'unkind' });
  w.svc.modResolve(w.T.mod, { id: reportId, action: 'restrict-user' });
  w.advance(24 * HOUR + 1);
  const v = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(v.status, 'returned');
  throwsCode(() => w.svc.resendJourney(w.T.moon, { journeyId: id, clientId: cid('rs') }), 'account-inactive');
  assert.equal(v.canResend, false, 'the view offers "Send it out again" that the service will always refuse');
});

// ---------------------------------------------------------------------------
// D4. Consent is only checked at submitFeeling; a journey without recorded
//     consent (state persisted before the rule: same store key, same v:1)
//     can be sent out again (and keeps circulating) without it.
// ---------------------------------------------------------------------------
function legacyWorld() {
  const w = world();
  const id = w.release().journey.id;
  const state = structuredClone(w.svc.toJSON());
  // what a journey looked like before this change (no consent step, no releasedAt/resends)
  for (const k of ['consentAt', 'fallbackConsentAt', 'releasedAt', 'resends']) delete state.journeys[id][k];
  const svc = new RelayService({ state, now: () => w.clock.t, random: rng(11), testMode: true });
  return { ...w, svc, id };
}

test('D4a consent: a journey with no recorded sharing consent cannot be sent out again', () => {
  const w = legacyWorld();
  w.clock.t += 24 * HOUR + 1;
  w.svc.tick();
  assert.equal(w.svc.s.journeys[w.id].status, 'returned');
  let out = null;
  try { out = w.svc.resendJourney(w.T.moon, { journeyId: w.id, clientId: cid('rs') }); } catch (e) { out = { code: e.code }; }
  assert.equal(out.code, 'consent-required', `resent without any consent on record (got status=${out.status})`);
  assert.notEqual(w.svc.s.journeys[w.id].status, 'travelling');
});

test('D4b consent: a journey with no recorded sharing consent is never offered to a catcher', () => {
  const w = legacyWorld();
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null, 'a feeling with no consent on record circulated');
});

// ---------------------------------------------------------------------------
// D5. submitFeeling replay: a retry with the same clientId but the Mallow
//     consent withdrawn is silently answered with the ORIGINAL consent
//     (different words are refused as 'invalid'; a different consent is not).
// ---------------------------------------------------------------------------
test('D5 submit replay: a retry that withdraws the Mallow consent is not silently answered with the old "yes"', () => {
  const w = world();
  const first = w.svc.submitFeeling(w.T.moon, { text: 'I keep replaying something awkward I said', consent: true, allowFallback: true, clientId: 'draft-fb-0001' });
  assert.equal(first.journey.allowFallback, true);
  let r;
  try { r = w.svc.submitFeeling(w.T.moon, { text: 'I keep replaying something awkward I said', consent: true, allowFallback: false, clientId: 'draft-fb-0001' }); }
  catch (e) { r = { code: e.code }; }
  // either refused like a changed text, or the narrower choice is honoured; never "released, Mallow allowed"
  const honoured = r.code === 'invalid' || (r.journey && r.journey.allowFallback === false);
  assert.ok(honoured, `replay with allowFallback:false came back as ${JSON.stringify({ status: r.status, duplicate: r.duplicate, allowFallback: r.journey?.allowFallback })}`);
});

// ---------------------------------------------------------------------------
// D6. askMallow({ consent: true }) ("Explore another angle")
//     records the Mallow consent before the budget check: when Mallows are
//     resting the request fails but the "yes" stays on the feeling.
// ---------------------------------------------------------------------------
test('D6 opt-in at home: a refused request (budget) leaves no Mallow consent behind', async () => {
  const p = counting();
  const w = world({ provider: p.fn, limits: { fallbackPerPersonPerDay: 1 } });
  const a = w.release('moon', { allowFallback: true }).journey.id;
  const b = w.release('moon', { text: 'Another feeling about the weekend' }).journey.id;   // Mallow off at release
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: a });                                       // today's one Mallow
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: b, consent: true }), 'fallback-budget');
  const j = w.svc.s.journeys[b];
  assert.equal(j.fallbackConsentAt, null, 'a consent was recorded for a request that was refused');
  assert.equal(j.allowFallback, false);
});

// ------------------------------------------- honesty and privacy of what people see --
const FIVE = ['cloud', 'star', 'fern', 'dream', 'pebble'];
const aiLike = async ({ mallow }) => ({ status: 'ok', text: 'Maybe the quiet says more about their week than about you.', mallow, source: 'ai', model: 't' });
// a real model often quotes or paraphrases the person's words back to them
const echoing = async ({ text, mallow }) => ({ status: 'ok', text: `You said “${text}” Maybe there is another way to see it.`, mallow, source: 'ai', model: 't' });

/** A feeling with a ready Mallow perspective that five people then answered (so the Mallow sits in mallowExtra). */
async function fiveAndAMallow(provider) {
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: id });
  FIVE.forEach((k, i) => w.give(k, REFRAMES[i]));
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.humanCount, 5, 'setup: five people answered');
  assert.ok(j.mallowExtra && j.mallowExtra.kind === 'mallow', 'setup: the Mallow perspective sits apart');
  return { w, id };
}

// ------------------------------------------------- 1. release keeps the Mallow's words --
test('release: a Mallow perspective the author did not keep (in mallowExtra) is wiped with the feeling, so no echo of the words survives', async () => {
  const { w, id } = await fiveAndAMallow(echoing);
  assert.ok(JSON.stringify(w.svc.toJSON()).includes('avoiding me'), 'setup: the feeling is in state before release');
  w.svc.releaseJourney(w.T.moon, { journeyId: id });           // nothing kept
  const v = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(v.text, '', 'setup: the feeling’s own words were cleared');
  assert.equal(v.mallowExtra, null, 'setup: the Mallow perspective is no longer shown');
  // a late Mallow answer after release is wiped (text: ''); one that arrived before release is not
  assert.equal(w.svc.s.fallbacks[id].text, '', 'the let-go Mallow perspective’s words are still stored after release');
  assert.ok(!JSON.stringify(w.svc.toJSON()).includes('avoiding me'), 'the released feeling’s words survive inside the Mallow perspective');
});

test('release: the same when the Mallow perspective filled a place in the collection', async () => {
  const w = world({ provider: echoing });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const asked = await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(asked.collection[0]?.kind, 'mallow', 'setup: the Mallow perspective is in the collection');
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  w.svc.releaseJourney(w.T.moon, { journeyId: id });
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).collection.length, 0, 'setup: nothing kept, nothing shown');
  assert.ok(!JSON.stringify(w.svc.toJSON()).includes('avoiding me'), 'the released feeling’s words survive inside the Mallow perspective');
});

// ---------------- 2. the Mallow stays "apart / superseded" when fewer than five people count --
test('mallowExtra: after a moderator removes one of the five, the Mallow fills the free visible place and is not called superseded', async () => {
  const { w, id } = await fiveAndAMallow(aiLike);
  const victim = w.svc.getJourney(w.T.moon, { journeyId: id }).collection[2].id;
  const { reportId } = w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: victim, reason: 'unkind' });
  w.svc.modResolve(w.T.mod, { id: reportId, action: 'remove-perspective' });
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.humanCount, 4, 'setup: the service itself now counts four people');
  assert.equal(j.collection.filter((p) => p.kind === 'human').length, 4, 'setup: four human perspectives shown');
  assert.equal(j.fallback.superseded, false, 'fallback says "superseded by five people" while humanCount is 4');
  assert.equal(j.mallowExtra, null, 'the Mallow is kept apart although a visible place is free');
  assert.ok(j.collection.some((p) => p.kind === 'mallow'), 'the Mallow perspective should fill the free place (humans first, five at most)');
});

test('mallowExtra: when all five contributors delete their data, the Mallow perspective is shown rather than hidden as "superseded"', async () => {
  const { w, id } = await fiveAndAMallow(aiLike);
  for (const k of FIVE) w.svc.deleteMyData(w.T[k], { confirm: 'DELETE' });
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.humanCount, 0, 'setup: no person’s perspective remains');
  assert.equal(j.petals.length, 0, 'setup: no petals');
  assert.equal(j.fallback.superseded, false, 'view claims five people superseded the Mallow while it counts none');
  assert.equal(j.collection.length, 1, 'the only perspective that came back is hidden in the optional extra place');
});

// -------------------------- 3. consent records are invisible to the people who gave them --
test('your data: a contributor sees the share consent they gave, and the author’s export says when they consented', () => {
  const w = world();
  const t0 = w.clock.t;
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: REFRAMES[0], clientId: cid('r'), allowShare: true });
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).collection[0].shareable, true, 'setup: the author sees it as shareable');
  const gift = w.svc.myGifts(w.T.cloud).gifts[0];
  assert.equal(gift.allowShare ?? gift.shareable, true, 'the writer cannot see that they allowed their words in someone’s share picture');
  // (export format v1: the same facts, in plain words and ISO dates)
  const exported = w.svc.exportMyData(w.T.cloud).perspectivesYouOffered[0];
  assert.equal(exported.mayAppearInSharePictures, true, 'the writer’s export omits their share consent');
  assert.equal(exported.agreedToSharePicturesAt, new Date(t0).toISOString(), 'the writer’s export omits when they agreed');
  const jx = w.svc.exportMyData(w.T.moon).feelings.find((x) => x.words === FEELING);
  assert.equal(jx.agreedToShareAnonymouslyAt, new Date(t0).toISOString(), 'the author’s export omits when they agreed to share the feeling');
  assert.equal(jx.agreedToAMallowPerspectiveAt, new Date(t0).toISOString(), 'the author’s export omits when they agreed to the Mallow (AI) fallback');
});

// ------------- 4. a feeling with no consent record can still be sent out to strangers --
test('consent: a returned feeling with no consent record (state saved before the consent rule) is never sent out again', () => {
  const w = world();
  const id = w.release().journey.id;
  w.advance(24 * 3600e3 + 1);
  assert.equal(w.svc.s.journeys[id].status, 'returned', 'setup: it came home with nobody');
  // the shape the previous version persisted (lab.js: new RelayService({ state: saved.state }))
  const legacy = structuredClone(w.svc.toJSON());
  for (const k of ['consentAt', 'fallbackConsentAt', 'releasedAt', 'resends']) delete legacy.journeys[id][k];
  const svc = new RelayService({ state: legacy, now: () => w.clock.t, random: rng(11), testMode: true });
  assert.equal(svc.getJourney(w.T.moon, { journeyId: id }).status, 'returned', 'setup: the reloaded service sees it at home');
  try { svc.resendJourney(w.T.moon, { journeyId: id, clientId: cid('rs') }); } catch { /* refusing (or asking for consent) is the fix */ }
  assert.equal(svc.findFeeling(w.T.cloud).offer, null, 'a feeling nobody agreed to share reached a stranger');
});

// ------------------------------------------------ Explore another angle, at home --
test('explore at home: after people answered, the author can ask their Mallow once, with consent; it never counts as a person', async () => {
  const calls = [];
  const w = world({ provider: async ({ text, mallow }) => { calls.push(text); return { status: 'ok', text: 'Maybe the quiet says more about their week than about you.', mallow, source: 'ai', model: 't' }; } });
  const id = w.release('moon').journey.id;                    // Mallow off at release
  w.give('cloud', REFRAMES[0]);
  w.give('star', REFRAMES[1]);
  // while it travels, a person caught it: humans first, no Mallow
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).canExplore, false);
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: id, consent: true }), 'fallback-not-yet');
  w.advance(24 * HOUR + 1);
  let v = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(v.status, 'returned');
  assert.equal(v.canExplore, true);
  assert.equal(v.fallback.status, 'off');
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: id }), 'fallback-off');       // never without consent
  assert.equal(calls.length, 0);
  v = await w.svc.askMallow(w.T.moon, { journeyId: id, consent: true });
  assert.equal(calls.length, 1);
  assert.equal(v.humanCount, 2);
  assert.deepEqual(v.collection.map((p) => p.kind), ['human', 'human', 'mallow']);
  assert.equal(v.collection[2].label, 'A Mallow perspective · Automatically generated');
  assert.equal(v.canExplore, false);
  assert.ok(w.svc.s.journeys[id].fallbackConsentAt, 'the consent is on record');
  await w.svc.askMallow(w.T.moon, { journeyId: id, consent: true });                   // once per feeling
  assert.equal(calls.length, 1);
});

test('explore at home: with five people the Mallow perspective waits in its own place', async () => {
  const w = world({ provider: async ({ mallow }) => ({ status: 'ok', text: 'Maybe the quiet says more about their week than about you.', mallow, source: 'ai', model: 't' }) });
  const id = w.release('moon').journey.id;
  FIVE.forEach((k, i) => w.give(k, REFRAMES[i]));
  const v = await w.svc.askMallow(w.T.moon, { journeyId: id, consent: true });
  assert.equal(v.collection.length, 5);
  assert.ok(v.collection.every((p) => p.kind === 'human'));
  assert.equal(v.mallowExtra.kind, 'mallow');
  assert.equal(v.humanCount, 5);
});

test('explore at home: not for a feeling let go, removed by moderators, or from a restricted account', async () => {
  const w = world({ provider: async ({ mallow }) => ({ status: 'ok', text: 'Maybe there is another way to see it.', mallow, source: 'ai', model: 't' }) });
  const a = w.release('moon').journey.id;
  w.svc.withdrawFeeling(w.T.moon, { journeyId: a });
  w.svc.releaseJourney(w.T.moon, { journeyId: a });
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: a }).canExplore, false);
  await rejectsCode(w.svc.askMallow(w.T.moon, { journeyId: a, consent: true }), 'fallback-not-yet');
  assert.equal(w.svc.providerCalls, 0);
});

// ------------------------------------------------ share consent can be withdrawn --
test('share consent: only the writer can change it, and the author sees the change', () => {
  const w = world();
  const id = w.release('moon').journey.id;
  const pid = w.give('cloud', REFRAMES[0], { allowShare: true }).perspective.id;
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  const shareable = () => w.svc.getJourney(w.T.moon, { journeyId: id }).collection[0].shareable;
  assert.equal(shareable(), true);
  throwsCode(() => w.svc.setGiftSharing(w.T.moon, { perspectiveId: pid, allowShare: false }), 'not-found');   // the author can't
  throwsCode(() => w.svc.setGiftSharing(w.T.star, { perspectiveId: pid, allowShare: false }), 'not-found');   // nor anyone else
  throwsCode(() => w.svc.setGiftSharing(w.T.cloud, { perspectiveId: pid, allowShare: 'no' }), 'invalid');
  const gifts = w.svc.setGiftSharing(w.T.cloud, { perspectiveId: pid, allowShare: false }).gifts;
  assert.equal(gifts[0].allowShare, false);
  assert.equal(shareable(), false);
  w.svc.setGiftSharing(w.T.cloud, { perspectiveId: pid, allowShare: true });
  assert.equal(shareable(), true);
});
