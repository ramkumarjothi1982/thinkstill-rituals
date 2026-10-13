// Adversarial review, lens: five-perspective cap and the relay state machine.
// Written to fail on the code as it was reviewed; each now guards the fix (regression tests).
//   node --test tests/review-cap-state-machine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, throwsCode, cid, FEELING, REFRAMES } from './relay-helpers.mjs';

const MIN = 60e3;
const json = (x) => JSON.stringify(x);

// A provider whose answer we release by hand, so we can act while it is in flight.
function gatedProvider() {
  let open;
  const gate = new Promise((r) => { open = r; });
  const p = async ({ mallow }) => { p.calls += 1; await gate; return { status: 'ok', text: 'GENERATED-AFTER-DELETE: maybe the silence is about their week.', mallow, source: 'ai', model: 't' }; };
  p.calls = 0;
  p.open = () => open();
  return p;
}
const countingProvider = () => {
  const p = async ({ mallow }) => { p.calls += 1; return { status: 'ok', text: 'A Mallow line for this feeling.', mallow, source: 'demo' }; };
  p.calls = 0;
  return p;
};

// ---------------------------------------------------------------------------
test('deleteJourney while a Mallow perspective is in flight: the deleted journey must stay empty', async () => {
  const provider = gatedProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const asking = w.svc.askMallow(w.T.moon, { journeyId: id });     // provider now pending
  assert.equal(provider.calls, 1);
  w.svc.deleteJourney(w.T.moon, { journeyId: id, confirm: 'DELETE' });
  provider.open();
  await asking.catch(() => {});
  const f = w.svc.s.fallbacks[id];
  assert.equal(f.text, '', 'deleted journey’s Mallow perspective was re-filled after deletion');
  assert.deepEqual(w.svc.s.journeys[id].events, [], 'events re-appeared on a deleted journey');
  assert.ok(!json(w.svc.s).includes('GENERATED-AFTER-DELETE'));
});

test('deleteMyData while a Mallow perspective is in flight: nothing generated survives the deletion', async () => {
  const provider = gatedProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const asking = w.svc.askMallow(w.T.moon, { journeyId: id });
  w.svc.deleteMyData(w.T.moon, { confirm: 'DELETE' });
  provider.open();
  await asking.catch(() => {});
  assert.ok(!json(w.svc.s).includes('GENERATED-AFTER-DELETE'), 'account deleted, yet the generated perspective was stored afterwards');
});

// ---------------------------------------------------------------------------
test('a catcher restricted by a moderator cannot finish a perspective on a hold they already had', () => {
  const w = world();
  // cloud writes something on moon’s feeling A; moon reports it after it comes home
  const a = w.release('moon').journey.id;
  w.give('cloud', REFRAMES[0]);
  w.svc.withdrawFeeling(w.T.moon, { journeyId: a });
  const pid = w.svc.getJourney(w.T.moon, { journeyId: a }).collection[0].id;
  // meanwhile cloud has caught ember’s feeling B
  w.release('ember', { text: 'Ember’s feeling about a long and tiring week.' });
  const { offer } = w.svc.findFeeling(w.T.cloud);
  assert.ok(offer);
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  // moderator restricts cloud
  w.svc.reportPerspective(w.T.moon, { journeyId: a, perspectiveId: pid, reason: 'unkind' });
  const rep = w.svc.modListReports(w.T.mod).reports[0];
  w.svc.modResolve(w.T.mod, { id: rep.id, action: 'restrict-user' });
  throwsCode(() => w.svc.findFeeling(w.T.cloud), 'account-inactive');            // can't find…
  throwsCode(() => w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: REFRAMES[1], clientId: cid() }), 'account-inactive');   // …but can still write
});

// ---------------------------------------------------------------------------
test('blocking a contributor also stops a hold they already have on another of your feelings', () => {
  const w = world();
  const a = w.release('moon').journey.id;
  w.give('cloud', REFRAMES[0]);
  w.svc.withdrawFeeling(w.T.moon, { journeyId: a });
  const pid = w.svc.getJourney(w.T.moon, { journeyId: a }).collection[0].id;
  const b = w.release('moon', { text: 'Another feeling about a different day entirely.' }).journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  assert.equal(w.svc.s.holds[offer.holdId].journeyId, b);
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  w.svc.blockContributor(w.T.moon, { journeyId: a, perspectiveId: pid });       // "never meet this person again"
  throwsCode(() => w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: REFRAMES[1], clientId: cid() }), 'not-available');
});

// ---------------------------------------------------------------------------
test('a feeling paused by a catcher’s safety report is never sent to the Mallow provider', async () => {
  const provider = countingProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.reportFeeling(w.T.cloud, { holdId: offer.holdId, reason: 'safety' });
  assert.equal(w.svc.s.journeys[id].paused, true);
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: id }).catch(() => {});
  assert.equal(provider.calls, 0, 'text under human safety review was sent to the provider');
});

test('a feeling a moderator removed is never sent to the Mallow provider', async () => {
  const provider = countingProvider();
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.reportFeeling(w.T.cloud, { holdId: offer.holdId, reason: 'harassment' });
  const rep = w.svc.modListReports(w.T.mod).reports[0];
  w.svc.modResolve(w.T.mod, { id: rep.id, action: 'remove-feeling' });
  assert.equal(w.svc.s.journeys[id].returnReason, 'removed');
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: id }).catch(() => {});
  assert.equal(provider.calls, 0, 'removed feeling was sent to the provider');
});

// ---------------------------------------------------------------------------
test('a reused perspective clientId on a DIFFERENT hold is not silently treated as a replay', () => {
  const w = world();
  w.release('moon');
  w.release('ember', { text: 'Ember’s feeling about a long and tiring week.' });
  const first = w.svc.findFeeling(w.T.cloud).offer;
  w.svc.catchFeeling(w.T.cloud, { holdId: first.holdId });
  w.svc.submitReframe(w.T.cloud, { holdId: first.holdId, text: REFRAMES[0], clientId: 'cloud-draft-01' });
  const second = w.svc.findFeeling(w.T.cloud).offer;
  assert.ok(second && second.holdId !== first.holdId);
  w.svc.catchFeeling(w.T.cloud, { holdId: second.holdId });
  let out;
  try { out = w.svc.submitReframe(w.T.cloud, { holdId: second.holdId, text: REFRAMES[1], clientId: 'cloud-draft-01' }); } catch (e) { return; }  // rejecting is fine
  // if it succeeds, it must have written to the second feeling
  const secondJourney = w.svc.s.holds[second.holdId].journeyId;
  assert.ok(Object.values(w.svc.s.reframes).some((r) => r.journeyId === secondJourney && r.author === w.svc.s.sessions[w.T.cloud]),
    `reported success (duplicate=${out.duplicate}, slot ${out.slot}) but nothing was written to the held feeling; the hold stays ${w.svc.s.holds[second.holdId].status}`);
});

// ---------------------------------------------------------------------------
test('a submission refused by the daily limit does not use up the hourly allowance', () => {
  const HOUR = 3600e3;
  const w = world({ limits: { submissionsPerHour: 2, submissionsPerDay: 3, maxActiveJourneys: 10 } });
  w.release('moon', { text: 'first feeling of the day' });
  w.release('moon', { text: 'second feeling of the day' });
  w.clock.t += 2 * HOUR;
  w.release('moon', { text: 'third feeling of the day' });                     // daily allowance now used
  w.clock.t += 22 * HOUR - 5 * MIN;                                           // just before the first two age out
  for (let i = 0; i < 2; i++) throwsCode(() => w.release('moon', { text: `refused try ${i}` }), 'rate-limited');
  w.clock.t += 10 * MIN;                                                       // two daily slots are free again
  // nothing was released in the last hour, so the hourly allowance (2) must be intact
  const r = w.release('moon', { text: 'a new day, a new feeling' });
  assert.equal(r.status, 'released');
});
