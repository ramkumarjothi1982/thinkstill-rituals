import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, policy, REFERENCE } from '../property/support.mjs';
import { sequenceFilter, checkSchedule, copyBlock, closerRunBlocked, cadenceCap, dayNumber, dateOfDay, recordPlanned, channelContext, copyTexts } from '../../planner/schedule.mjs';
import { emptyLedger } from '../../planner/ledger.mjs';
import { openCapabilities } from '../../planner/capabilities.mjs';
import { visibleSlots, fingerprint, specId } from '../../planner/fingerprint.mjs';

const D0 = dayNumber('2026-11-01');
const T = (id) => lib.template(id);
let n = 0;
/** A synthetic post on day offset d. */
function post(d, { template = 'T03-social-battery', mallow = 'loomi', ritual = 'R-COSY', gag = 'G-FLOP', endKind = 'resolution', hook = ['X'], lines = ['a', 'b', 'c'] } = {}) {
  const t = T(template);
  n++;
  return { id: `p${n}`, fingerprint: `sha256:${String(n).padStart(64, '0')}`, day: D0 + d, family: t.feeling.family, valence: t.feeling.valence, endKind,
    visible: { template, mallow, realm: lib.raw.mallows[mallow].realm, tod: 'x', weather: 'clear', dressing: [], duration: 15, gag, metaphor: 'M-METER', turn: 'TURN-SQUEEZE', ritual, loop: 'LP-RETURN', camera: 'C-DRIFT-IN', hook, lines, end: { kind: endKind, text: ['e'] }, nameWord: null } };
}
const context = (history, { unlocked = ['loomi', 'noomi', 'blubi'], copyUsage = [], reservations = [], unlockedOn = {} } = {}) => ({
  channel: 'tiktok', batch: 'b', history, copyUsage, reservations, unlocked,
  unlockedOn: Object.fromEntries(unlocked.map((m) => [m, unlockedOn[m] ?? -Infinity])),
});
/** A production spec on day offset d. */
function spec(d, over = {}) {
  const s = { ...JSON.parse(JSON.stringify(REFERENCE)), mode: 'production', channel: 'tiktok', batch: 'b', index: 0, plannedFor: dateOfDay(D0 + d), ...over };
  s.fingerprint = fingerprint(s);
  s.id = specId(s);
  return s;
}

test('back-to-back repeats of template, ritual and gag; Mallow only with 2+ unlocked', () => {
  const ctx = context([post(0, { template: 'T01-brain-at-2am', mallow: 'noomi', ritual: 'R-BREATH', gag: 'G-JOLT' })]);
  const f = sequenceFilter(ctx, D0 + 1, { policy });
  assert.equal(f.template(T('T01')).rule, 'sequence:repeat-template');
  assert.equal(f.ritual('R-BREATH').rule, 'sequence:repeat-ritual');
  assert.equal(f.gag('G-JOLT').rule, 'sequence:repeat-gag');
  assert.equal(f.mallow('noomi').rule, 'sequence:repeat-mallow');
  assert.equal(f.template(T('T03')), null);
  const solo = sequenceFilter(context(ctx.history, { unlocked: ['noomi'] }), D0 + 1, { policy });
  assert.equal(solo.mallow('noomi'), null, 'Q1 default: Noomi-only posting has no different-Mallow rule');
});

test('quota cap: max(3, ceil(10/n))', () => {
  const ms = ['noomi', 'blubi', 'noomi', 'blubi', 'noomi', 'blubi', 'noomi', 'blubi', 'blubi'];
  const two = context(ms.map((m, i) => post(i, { mallow: m })), { unlocked: ['noomi', 'blubi'] });
  assert.equal(sequenceFilter(two, D0 + 9, { policy }).mallow('noomi'), null, 'with 2 unlocked the cap is 5 per 10');
  const seven = ['noomi', 'blubi', 'loomi', 'boppo', 'pipzi', 'zuzu', 'glitzi'];
  const hist = ['noomi', 'blubi', 'noomi', 'loomi', 'noomi', 'boppo', 'pipzi', 'zuzu', 'glitzi'].map((m, i) => post(i, { mallow: m }));
  assert.equal(sequenceFilter(context(hist, { unlocked: seven }), D0 + 9, { policy }).mallow('noomi').rule, 'sequence:mallow-quota', 'with 7 unlocked the cap is 3 per 10');
});

test('absence streak and rotation: every unlocked Mallow appears in any 10 consecutive posts', () => {
  const five = ['loomi', 'noomi', 'zuzu', 'blubi', 'boppo'];
  const hist = ['loomi', 'noomi', 'zuzu', 'blubi', 'loomi', 'noomi', 'zuzu', 'blubi', 'loomi'].map((m, i) => post(i, { mallow: m }));
  const f = sequenceFilter(context(hist, { unlocked: five }), D0 + 9, { policy });
  assert.equal(f.mallow('noomi').rule, 'sequence:mallow-absent', 'boppo has been absent for 9 posts');
  assert.match(f.mallow('noomi').message, /boppo would be missing from 10 consecutive posts/);
  assert.equal(f.mallow('boppo'), null);
  // a newly unlocked Mallow is not overdue on day one
  const fresh = sequenceFilter(context(hist, { unlocked: five, unlockedOn: { boppo: D0 + 8 } }), D0 + 9, { policy });
  assert.equal(fresh.mallow('noomi'), null);
  // rotation: two Mallows both due on the next post cannot both be served
  const h2 = Array.from({ length: 8 }, (_, i) => post(i, { mallow: 'noomi' }));
  const r = sequenceFilter(context(h2, { unlocked: ['noomi', 'blubi', 'loomi', 'zuzu'] }), D0 + 8, { policy });
  assert.equal(r.mallow('blubi').rule, 'sequence:mallow-rotation');
});

test('feeling families (>= 4) and positive/mixed (>= 2) in any 7 posts', () => {
  const hist = ['T03-social-battery', 'T01-brain-at-2am', 'T07-procrastination-guilt', 'T03-social-battery', 'T01-brain-at-2am', 'T07-procrastination-guilt'].map((t, i) => post(i, { template: t }));
  const f = sequenceFilter(context(hist), D0 + 6, { policy });
  assert.equal(f.template(T('T02')).rule, 'sequence:valence', 'a 7th difficult template leaves 0 positive/mixed');
  const five = ['T03-social-battery', 'T01-brain-at-2am', 'T07-procrastination-guilt', 'T03-social-battery', 'T07-procrastination-guilt'].map((t, i) => post(i, { template: t }));
  const fam = sequenceFilter(context(five), D0 + 5, { policy });
  assert.equal(fam.template(T('T01')).rule, 'sequence:template-week', 'T01 at most once per 7 days');
  assert.equal(fam.template(T('T21')), null, 'still achievable: 6 posts, 4 families, 1 positive with 1 to go');
  assert.equal(fam.template(T('T09')).rule, 'sequence:valence', 'a 6th difficult post leaves no room for 2 positive/mixed in 7');
});

test('cadence cap follows the unlocked set (Q1 default)', () => {
  assert.equal(cadenceCap(1, policy), 5);
  assert.equal(cadenceCap(2, policy), 5);
  assert.equal(cadenceCap(3, policy), policy.cadence.maxPerWeek);
  const hist = [0, 1, 2, 3, 4].map((d) => post(d, { template: ['T03-social-battery', 'T21-plans-cancelled'][d % 2] }));
  const v = checkSchedule(spec(5), context(hist, { unlocked: ['noomi'] }), { lib, policy });
  assert.ok(v.some((x) => x.rule === 'cadence'), JSON.stringify(v));
});

test('copy cooldowns: hook 90 days (semantic), line 3 per 30 days, resolution 1 per 7 days; reservations', () => {
  const ctx = context([], {
    copyUsage: [
      { kind: 'hook', text: 'ME TRYING TO SLEEP / AT 3 AM', id: 'old', day: D0 },
      { kind: 'line', text: 'Was that rude?', id: 'a', day: D0 }, { kind: 'line', text: 'Was that rude?', id: 'b', day: D0 + 5 }, { kind: 'line', text: 'Was that rude?', id: 'c', day: D0 + 10 },
      { kind: 'resolution', text: 'Rest is a plan too.', id: 'd', day: D0 + 3 },
    ],
    reservations: [{ kind: 'line', text: 'Did they notice?', batch: 'other', channel: 'tiktok', until: '2026-12-01T00:00:00Z', untilDay: dayNumber('2026-12-01') }],
  });
  assert.equal(copyBlock('hook', ['ME TRYING TO SLEEP', 'AT 2 AM...'], D0 + 89, ctx, policy).rule, 'cooldown:hook');
  assert.equal(copyBlock('hook', ['ME TRYING TO SLEEP', 'AT 2 AM...'], D0 + 90, ctx, policy), null);
  assert.equal(copyBlock('line', 'Was that rude?', D0 + 20, ctx, policy).rule, 'cooldown:line');
  assert.equal(copyBlock('line', 'Was that rude?', D0 + 31, ctx, policy), null, 'the first use left the 30-day window');
  assert.equal(copyBlock('resolution', 'Rest is a plan too.', D0 + 9, ctx, policy).rule, 'cooldown:resolution');
  assert.equal(copyBlock('resolution', 'Rest is a plan too.', D0 + 10, ctx, policy), null);
  assert.equal(copyBlock('line', 'Did they notice?', D0 + 1, ctx, policy).rule, 'reservation');
  assert.equal(copyBlock('line', 'Was that rude?', D0 + 20, ctx, policy, 'c'), null, 'a spec\'s own recorded use never counts against it');
});

test('brand closers: never more than 2 in a row', () => {
  const ctx = context([post(0, { endKind: 'closer' }), post(1, { endKind: 'closer' })]);
  assert.equal(closerRunBlocked(D0 + 2, ctx, policy), true);
  assert.equal(closerRunBlocked(D0 + 2, context([post(0, { endKind: 'closer' }), post(1)]), policy), false);
});

test('distance and exact repeats against the last 14 days; a spec never conflicts with itself', () => {
  const s = spec(10);
  const twin = { ...post(0), id: 'twin', fingerprint: s.fingerprint, visible: visibleSlots(s), family: 'overthinking', valence: 'difficult' };
  let v = checkSchedule(s, context([twin], { unlocked: ['noomi'] }), { lib, policy }).map((x) => x.rule);
  assert.ok(v.includes('distance') && v.includes('fingerprint-repeat'), v.join());
  const old = { ...twin, day: D0 - 10 };
  v = checkSchedule(s, context([old], { unlocked: ['noomi'] }), { lib, policy }).map((x) => x.rule);
  assert.ok(!v.includes('distance'), '20 days ago is outside the 14-day window');
  const ctx = context([], { unlocked: ['noomi'] });
  recordPlanned(ctx, s, lib);
  assert.deepEqual(checkSchedule(s, ctx, { lib, policy }), [], 'a recorded spec re-checks clean against itself');
});

test('a batch post already recorded as published counts once, not twice', () => {
  const caps = openCapabilities(lib);
  const first = spec(0, { index: 0 });
  const t = lib.template(first.template);
  const ledger = { ...emptyLedger(),
    published: [{ id: first.id, fingerprint: first.fingerprint, channel: 'tiktok', postedAt: `${first.plannedFor}T18:00:00.000Z`, visible: visibleSlots(first), family: t.feeling.family, valence: t.feeling.valence }],
    copyUsage: copyTexts(first).map((u) => ({ ...u, id: first.id, channel: 'tiktok', at: `${first.plannedFor}T18:00:00.000Z` })) };
  const ctx = channelContext({ ledger, channel: 'tiktok', batch: 'b', batchSpecs: [first], lib, caps });
  assert.equal(ctx.history.filter((p) => p.id === first.id).length, 1, 'once in the history');
  assert.equal(ctx.copyUsage.filter((u) => u.id === first.id && u.kind === 'line').length, first.copy.lines.length, 'its lines count once toward the cooldown');
  const fresh = channelContext({ ledger: emptyLedger(), channel: 'tiktok', batch: 'b', batchSpecs: [first], lib, caps });
  assert.equal(fresh.history.length, 1, 'an unposted batch spec is still counted as planned');
});
