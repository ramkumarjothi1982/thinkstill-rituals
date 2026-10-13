// Adversarial review, lens: privacy, anonymity, safety and moderation.
// Written to fail on the code as it was reviewed; each now guards the fix (regression tests).
//   node --test tests/review-privacy-safety.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, cid, FEELING, REFRAMES } from './relay-helpers.mjs';
import { demoProvider } from '../core/perspectives.js';

const MIN = 60e3;
const json = (x) => JSON.stringify(x);
const accId = (w, key) => Object.values(w.svc.s.accounts).find((a) => a.key === key).id;
const countingProvider = (inner = demoProvider()) => {
  const p = async (args) => { p.calls += 1; p.texts.push(args.text); return inner(args); };
  p.calls = 0; p.texts = [];
  return p;
};
const SECOND = 'My sister forgot my birthday and I feel unimportant.';

// ------------------------------------------------- 1. fallback vs moderation --
test('F1a askMallow: a feeling paused by a "someone may be in danger" report is never sent to the AI provider', async () => {
  const provider = countingProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const { offer } = w.svc.findFeeling(w.T.star);
  w.svc.reportFeeling(w.T.star, { holdId: offer.holdId, reason: 'safety' });
  assert.equal(w.svc.s.journeys[id].paused, true);
  w.advance(31 * MIN);
  try { await w.svc.askMallow(w.T.moon, { journeyId: id }); } catch { /* refusing is the fix */ }
  assert.equal(provider.calls, 0, 'human-flagged (safety) text reached the provider');
});

test('F1b askMallow: a feeling a moderator removed is never sent to the AI provider', async () => {
  const provider = countingProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.reportFeeling(w.T.cloud, { holdId: offer.holdId, reason: 'identifying' });
  const rep = w.svc.modListReports(w.T.mod).reports[0];
  w.svc.modResolve(w.T.mod, { id: rep.id, action: 'remove-feeling', note: 'shares personal details' });
  assert.equal(w.svc.s.journeys[id].returnReason, 'removed');
  w.advance(31 * MIN);
  try { await w.svc.askMallow(w.T.moon, { journeyId: id }); } catch { /* refusing is the fix */ }
  assert.equal(provider.calls, 0, 'moderator-removed text reached the provider');
});

// ------------------------------------- 2. deletion races the Mallow request --
function gatedProvider() {
  let open;
  const gate = new Promise((r) => { open = r; });
  const p = async ({ text, mallow }) => { await gate; return { status: 'ok', text: `You said “${text}” — maybe not.`, mallow, source: 'ai', model: 't' }; };
  p.open = open;
  return p;
}

test('F2a deleteJourney while a Mallow perspective is in flight leaves the generated text (echoing the feeling) in state', async () => {
  const provider = gatedProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const pending = w.svc.askMallow(w.T.moon, { journeyId: id });
  w.svc.deleteJourney(w.T.moon, { journeyId: id, confirm: 'DELETE' });
  provider.open();
  await pending.catch(() => {});
  assert.ok(!json(w.svc.s).includes('avoiding me'), 'deleted feeling text resurrected via the Mallow fallback');
  assert.deepEqual(w.svc.s.journeys[id].events, [], 'events re-populated on a deleted journey');
});

test('F2b deleteMyData while a Mallow perspective is in flight leaves the generated text in state', async () => {
  const provider = gatedProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const pending = w.svc.askMallow(w.T.moon, { journeyId: id });
  w.svc.deleteMyData(w.T.moon, { confirm: 'DELETE' });
  provider.open();
  await pending.catch(() => {});
  assert.ok(!json(w.svc.s).includes('avoiding me'), 'deleted account’s words resurrected via the Mallow fallback');
});

// ---------------------------------------------- 3. blocks and in-flight holds --
test('F3a a blocked contributor holding the blocker’s other feeling can still deliver a perspective to them', () => {
  const w = world({ limits: { fairnessPool: 1 } });
  const a = w.release('moon').journey.id;
  w.advance(MIN);
  const b = w.release('moon', { text: SECOND }).journey.id;
  w.give('star', REFRAMES[0]);                                       // oldest first → A
  const { offer } = w.svc.findFeeling(w.T.star);                     // → B
  assert.equal(w.svc.s.holds[offer.holdId].journeyId, b);
  w.svc.catchFeeling(w.T.star, { holdId: offer.holdId });
  w.svc.withdrawFeeling(w.T.moon, { journeyId: a });
  const col = w.svc.getJourney(w.T.moon, { journeyId: a }).collection;
  w.svc.blockContributor(w.T.moon, { journeyId: a, perspectiveId: col[0].id });
  try { w.svc.submitReframe(w.T.star, { holdId: offer.holdId, text: REFRAMES[1], clientId: cid() }); } catch { /* refusing is the fix */ }
  w.svc.withdrawFeeling(w.T.moon, { journeyId: b });
  const bcol = w.svc.getJourney(w.T.moon, { journeyId: b }).collection;
  assert.ok(!bcol.some((p) => p.text === REFRAMES[1]), 'blocked person’s words reached the blocker after the block');
});

test('F3b the blocker, holding the blocked person’s feeling, can still deliver a perspective to them', () => {
  const w = world();
  const c = w.release('star', { text: SECOND }).journey.id;           // star's feeling
  const a = w.release('moon').journey.id;
  const { offer } = w.svc.findFeeling(w.T.moon);                      // moon holds star's feeling
  assert.equal(w.svc.s.holds[offer.holdId].journeyId, c);
  w.svc.catchFeeling(w.T.moon, { holdId: offer.holdId });
  w.give('star', REFRAMES[0]);                                        // star writes on moon's A
  w.svc.withdrawFeeling(w.T.moon, { journeyId: a });
  const col = w.svc.getJourney(w.T.moon, { journeyId: a }).collection;
  w.svc.blockContributor(w.T.moon, { journeyId: a, perspectiveId: col[0].id });
  try { w.svc.submitReframe(w.T.moon, { holdId: offer.holdId, text: REFRAMES[1], clientId: cid() }); } catch { /* refusing is the fix */ }
  w.svc.withdrawFeeling(w.T.star, { journeyId: c });
  const ccol = w.svc.getJourney(w.T.star, { journeyId: c }).collection;
  assert.ok(!ccol.some((p) => p.text === REFRAMES[1]), 'blocker’s words reached the blocked person after the block');
});

test('F3c (policy) the blocked person’s still-sealed perspective on another travelling feeling is revealed after the block', () => {
  const w = world({ limits: { fairnessPool: 1 } });
  const a = w.release('moon').journey.id;
  w.advance(MIN);
  const b = w.release('moon', { text: SECOND }).journey.id;
  w.give('star', REFRAMES[0]);                                       // A
  w.give('star', REFRAMES[1]);                                       // B (sealed while travelling)
  w.svc.withdrawFeeling(w.T.moon, { journeyId: a });
  const col = w.svc.getJourney(w.T.moon, { journeyId: a }).collection;
  w.svc.blockContributor(w.T.moon, { journeyId: a, perspectiveId: col[0].id });
  w.svc.withdrawFeeling(w.T.moon, { journeyId: b });
  const bcol = w.svc.getJourney(w.T.moon, { journeyId: b }).collection;
  assert.ok(!bcol.some((p) => p.text === REFRAMES[1]), 'blocked person’s sealed words revealed to the blocker after the block');
});

// ------------------------------------------------ 4. restricted accounts --
test('F4 a restricted account can still catch and submit a perspective through a hold taken before the restriction', () => {
  const w = world({ limits: { fairnessPool: 1 } });
  const a = w.release('moon').journey.id;
  w.advance(MIN);
  w.release('ember', { text: SECOND });
  w.give('cloud', REFRAMES[0]);                                      // cloud on moon's A
  const { offer } = w.svc.findFeeling(w.T.cloud);                    // cloud now holds ember's feeling
  w.svc.withdrawFeeling(w.T.moon, { journeyId: a });
  const col = w.svc.getJourney(w.T.moon, { journeyId: a }).collection;
  w.svc.reportPerspective(w.T.moon, { journeyId: a, perspectiveId: col[0].id, reason: 'harassment' });
  const rep = w.svc.modListReports(w.T.mod).reports[0];
  w.svc.modResolve(w.T.mod, { id: rep.id, action: 'restrict-user', note: 'pattern of harassment' });
  assert.equal(w.svc.s.accounts[accId(w, 'cloud')].state, 'restricted');
  assert.throws(() => {
    w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
    w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: REFRAMES[1], clientId: cid() });
  }, 'restricted account still reaches a stranger with a perspective');
});

// ----------------------------------------- 5. report counting after review --
test('F5 a moderator-resumed feeling is re-paused by one original reporter replaying their stale hold', () => {
  const w = world();
  const id = w.release().journey.id;
  const a = w.svc.findFeeling(w.T.cloud).offer;
  w.svc.reportFeeling(w.T.cloud, { holdId: a.holdId, reason: 'unkind' });
  const b = w.svc.findFeeling(w.T.star).offer;
  w.svc.reportFeeling(w.T.star, { holdId: b.holdId, reason: 'harassment' });
  assert.equal(w.svc.s.journeys[id].paused, true);
  for (const r of w.svc.modListReports(w.T.mod).reports) w.svc.modResolve(w.T.mod, { id: r.id, action: 'resume-feeling', note: 'not abusive' });
  assert.equal(w.svc.s.journeys[id].paused, false);
  w.svc.reportFeeling(w.T.cloud, { holdId: a.holdId, reason: 'unkind' });   // same person, same stale hold, no new reporter
  assert.equal(w.svc.s.journeys[id].paused, false, 'one person overrode the moderator’s decision');
});

// --------------------------------------------- 6. identifying details --
test('F6 a perspective carrying a home address or real name is stored and passed on (feelings refuse the same text)', () => {
  const w = world();
  w.release();
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  assert.throws(() => w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: 'Maybe talk to someone nearby, I live at 22 Baker Street and could listen.', clientId: cid() }),
    (e) => e.code === 'reframe-identifying');
});

test('F7a feeling screening: “my zip code is 90210” passes (the ZIP rule only looks for “zip” AFTER the number)', () => {
  const w = world();
  assert.throws(() => w.svc.submitFeeling(w.T.moon, { text: 'My zip code is 90210 and everyone here knows me', clientId: cid() }), (e) => e.code === 'feeling-identifying');
});

test('F7b feeling screening: “My name’s …” and a lower-case UK postcode pass', () => {
  const w = world();
  assert.throws(() => w.svc.submitFeeling(w.T.moon, { text: 'My name’s Sarah Jones and I feel invisible at work', clientId: cid() }), (e) => e.code === 'feeling-identifying');
  assert.throws(() => w.svc.submitFeeling(w.T.moon, { text: 'I live in sw1a 1aa and feel so alone', clientId: cid() }), (e) => e.code === 'feeling-identifying');
});

// ------------------------------------- 8. compatibility characters (NFKC) --
test('F8a full-width crisis words are released to strangers and sent to the AI provider', async () => {
  const provider = countingProvider();
  const w = world({ provider });
  const r = w.svc.submitFeeling(w.T.moon, { text: 'I want to ｅｎｄ ｉｔ ａｌｌ', clientId: cid(), allowFallback: true });
  assert.equal(r.status, 'support', 'crisis words circulated instead of answered with support');
});

test('F8b full-width digits carry a phone number past the contact rule', () => {
  const w = world();
  assert.throws(() => w.svc.submitFeeling(w.T.moon, { text: 'Nobody listens, call ０７７００ ９００１２３ tonight', clientId: cid() }), (e) => e.code === 'feeling-contact');
});

// ----------------------------------------------------- 9. clientId replay --
test('F9 crisis words sent with a reused clientId get “released”, not support', () => {
  const w = world();
  w.svc.submitFeeling(w.T.moon, { text: FEELING, clientId: 'draft-000001' });   // reply lost; person edits, client retries
  const r = w.svc.submitFeeling(w.T.moon, { text: 'I want to end it all', clientId: 'draft-000001' });
  assert.equal(r.status, 'support', 'a person who just wrote crisis words was shown “released”');
});
