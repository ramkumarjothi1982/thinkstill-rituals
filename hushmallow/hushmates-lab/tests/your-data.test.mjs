// Your data: the personal-data file (exportMyData, format v2). It must hold
// everything that is the person's own, in plain words, and nothing that
// belongs to anyone else: no names, Mallows, ids or order of other people,
// no words the person was never shown, no reported text or safety-team notes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { world, throwsCode, FEELING, REFRAMES } from './relay-helpers.mjs';
import { libraryProvider } from '../core/perspectives.js';
import { RelayService } from '../core/relay.js';
import { formatExport } from '../core/export-format.js';

const OTHERS = ['CloudMallow', 'StarMallow', 'FernMallow', 'DreamMallow', 'PebbleMallow', 'EmberMallow', 'SafetyTeam'];
const INTERNAL = /\b(acc|pv|jr|hold|rep|aud|fb|tok)_[a-z0-9]{6,}/;

/** every key anywhere in the file: the schema is an allow-list, so a new field has to be added on purpose */
function keys(o, out = new Set(), path = '') {
  if (Array.isArray(o)) { for (const x of o) keys(x, out, `${path}[]`); return out; }
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { out.add(`${path}.${k}`); keys(v, out, `${path}.${k}`); }
  return out;
}
const ALLOWED = new Set([
  '.format', '.version', '.exportedAt', '.about',
  '.you', '.you.name', '.you.mallow', '.you.joinedAt', '.you.confirmedYouAre18OrOverAt', '.you.letFeelingsFindYou', '.you.gentleNotices', '.you.account',
  '.feelings', '.feelings[].words', '.feelings[].feeling', '.feelings[].status', '.feelings[].sentAt', '.feelings[].cameHomeAt',
  '.feelings[].cameHomeBecause', '.feelings[].timesSentOutAgain', '.feelings[].saved', '.feelings[].agreedToShareWithoutYourNameAt',
  '.feelings[].agreedToAMallowPerspectiveAt', '.feelings[].peopleWhoOfferedAPerspective',
  '.feelings[].perspectivesFromHushmates', '.feelings[].perspectivesFromHushmates[].from', '.feelings[].perspectivesFromHushmates[].words',
  '.feelings[].perspectivesFromHushmates[].yourChoice',
  '.feelings[].mallowPerspective', '.feelings[].mallowPerspective.from', '.feelings[].mallowPerspective.label', '.feelings[].mallowPerspective.words',
  '.feelings[].mallowPerspective.at', '.feelings[].mallowPerspective.yourChoice',
  '.feelings[].journey', '.feelings[].journey[].step', '.feelings[].journey[].at',
  '.perspectivesYouOffered', '.perspectivesYouOffered[].words', '.perspectivesYouOffered[].offeredAt', '.perspectivesYouOffered[].mayAppearInSharePictures',
  '.perspectivesYouOffered[].agreedToSharePicturesAt', '.perspectivesYouOffered[].feelingHasComeHome',
  '.feelingsThatFoundYou',
  '.reportsYouMade', '.reportsYouMade[].about', '.reportsYouMade[].reason', '.reportsYouMade[].yourWords', '.reportsYouMade[].madeAt', '.reportsYouMade[].status',
  '.peopleYouBlocked',
]);

/** Moon releases; five people answer with share consent from Cloud; it comes home. */
function fullJourney() {
  const w = world();
  const id = w.release('moon', { allowFallback: true }).journey.id;
  ['cloud', 'star', 'fern', 'dream', 'pebble'].forEach((k, i) => w.give(k, REFRAMES[i], { allowShare: k === 'cloud' }));
  return { w, id };
}

test('your data: the file follows the v2 allow-list, field by field, whatever has happened', () => {
  const { w, id } = fullJourney();
  const col = w.svc.getJourney(w.T.moon, { journeyId: id }).collection;
  w.svc.choosePerspective(w.T.moon, { journeyId: id, perspectiveId: col[0].id, keep: true });
  w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: col[1].id, reason: 'unkind', details: 'It felt dismissive.' });
  w.svc.blockContributor(w.T.moon, { journeyId: id, perspectiveId: col[2].id });
  w.release('moon', { allowFallback: true, text: 'I keep replaying what I said in the meeting.' });
  w.advance(31 * 60e3);
  for (const k of ['moon', 'cloud', 'mod']) {
    const file = w.svc.exportMyData(w.T[k]);
    const extra = [...keys(file)].filter((x) => !ALLOWED.has(x));
    assert.deepEqual(extra, [], `${k}'s file carries fields outside the allow-list`);
    assert.equal(file.format, 'hushmates-personal-data');
    assert.equal(file.version, 2);
  }
});

test('your data: the file says when you confirmed you’re 18 or over, a field added within v2 that breaks no reader', () => {
  let t = Date.UTC(2026, 9, 14, 9);
  const svc = new RelayService({ now: () => t });
  const joined = new Date(t).toISOString();
  const tok = svc.issueSession(svc.createMember({ pseudonym: 'Moonbeam', adult: true }));
  t += 2 * 86400e3;
  const file = svc.exportMyData(tok);
  assert.equal(file.version, 2, 'an added field keeps the version: v2 readers keep working');
  assert.equal(file.you.confirmedYouAre18OrOverAt, joined);
  assert.deepEqual([...keys(file)].filter((x) => !ALLOWED.has(x)), []);
  // everything a v2 reader already knew is still there, unchanged in shape
  for (const k of ['name', 'mallow', 'joinedAt', 'letFeelingsFindYou', 'gentleNotices', 'account']) assert.ok(k in file.you, k);
  // facts made before the field existed (no adultConfirmedAt) still make a file: it says nothing rather than make a date up
  const old = formatExport({ now: t, you: { pseudonym: 'Moonbeam', mallow: 'noomi', createdAt: t, catching: true, notifyReturn: true, state: 'active' },
    feelings: [], offered: [], feelingsThatFoundYou: 0, reports: [], blocked: 0 });
  assert.equal(old.you.confirmedYouAre18OrOverAt, null);
});

test('your data: the author’s file never names, colours or numbers the people who answered', () => {
  const { w } = fullJourney();
  const file = w.svc.exportMyData(w.T.moon);
  const text = JSON.stringify(file);
  for (const name of OTHERS) assert.ok(!text.includes(name), `the author's file contains ${name}`);
  assert.ok(!INTERNAL.test(text), `the author's file contains an internal id: ${text.match(INTERNAL)?.[0]}`);
  assert.ok(!text.includes(w.T.moon), 'the file contains the session token');
  const f = file.feelings[0];
  assert.equal(f.words, FEELING);
  assert.equal(f.status, 'came home');
  assert.equal(f.peopleWhoOfferedAPerspective, 5);
  assert.equal(f.perspectivesFromHushmates.length, 5);
  for (const p of f.perspectivesFromHushmates) assert.deepEqual(Object.keys(p).sort(), ['from', 'words', 'yourChoice'], 'a perspective carries more than its words and your choice (no time: that would say when someone wrote)');
  assert.ok(f.perspectivesFromHushmates.every((p) => p.from === 'A Hushmate'));
  // the contributors' Mallows (which colour the orb's petals in the app) are not in the file
  for (const m of ['blubi', 'pipzi', 'loomi', 'zuzu', 'boppo']) assert.ok(!text.includes(`"${m}"`), `the author's file names a contributor's Mallow (${m})`);
  assert.equal(file.you.name, 'MoonMallow');
  assert.ok(!('test' in file.you) && !('role' in file.you), 'internal account flags leak into the file');
});

test('your data: a catcher’s file has their own words, never the feeling they answered or whose it was', () => {
  const { w } = fullJourney();
  const file = w.svc.exportMyData(w.T.cloud);
  const text = JSON.stringify(file);
  assert.ok(!text.includes(FEELING), 'the catcher’s file contains the author’s feeling');
  assert.ok(!text.includes('MoonMallow'), 'the catcher’s file names the author');
  assert.ok(!INTERNAL.test(text), 'the catcher’s file contains an internal id');
  assert.equal(file.perspectivesYouOffered.length, 1);
  assert.equal(file.perspectivesYouOffered[0].words, REFRAMES[0]);
  assert.equal(file.perspectivesYouOffered[0].mayAppearInSharePictures, true);
  assert.equal(file.perspectivesYouOffered[0].feelingHasComeHome, true);
  assert.equal(file.feelingsThatFoundYou, 1);
  assert.equal(file.feelings.length, 0);
});

test('your data: people’s words stay sealed in the file while the feeling travels, as in the app', () => {
  const w = world();
  w.release('moon');
  w.give('cloud', REFRAMES[0]);
  w.give('star', REFRAMES[1]);
  const f = w.svc.exportMyData(w.T.moon).feelings[0];
  assert.equal(f.status, 'travelling');
  assert.equal(f.peopleWhoOfferedAPerspective, 2);
  assert.deepEqual(f.perspectivesFromHushmates, [], 'the file reveals perspectives before the feeling came home');
  const text = JSON.stringify(f);
  for (const r of REFRAMES.slice(0, 2)) assert.ok(!text.includes(r), 'a sealed perspective is in the file');
});

test('your data: words let go, reported, blocked, taken back or removed are not in the file', () => {
  const { w, id } = fullJourney();
  const col = w.svc.getJourney(w.T.moon, { journeyId: id }).collection;
  const byText = Object.fromEntries(col.map((p) => [p.text, p.id]));
  w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: byText[REFRAMES[1]], reason: 'unkind' });
  w.svc.blockContributor(w.T.moon, { journeyId: id, perspectiveId: byText[REFRAMES[2]] });
  w.svc.withdrawPerspective(w.T.dream, { perspectiveId: byText[REFRAMES[3]] });
  // a moderator removes one after a report by its author
  w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: byText[REFRAMES[4]], reason: 'harassment' });
  const rep = w.svc.modListReports(w.T.mod).reports.find((r) => r.reason === 'harassment');
  w.svc.modResolve(w.T.mod, { id: rep.id, action: 'remove-perspective' });
  const words = w.svc.exportMyData(w.T.moon).feelings[0].perspectivesFromHushmates.map((p) => p.words);
  assert.deepEqual(words, [REFRAMES[0]], 'only the one perspective still shown in the app belongs in the file');
  // letting the feeling go clears its words, and every perspective not kept goes with them
  w.svc.releaseJourney(w.T.moon, { journeyId: id });
  const after = w.svc.exportMyData(w.T.moon).feelings[0];
  assert.equal(after.words, null);
  assert.equal(after.status, 'let go');
  assert.deepEqual(after.perspectivesFromHushmates, []);
  // a deleted journey is gone from the file
  w.svc.deleteJourney(w.T.moon, { journeyId: id, confirm: 'DELETE' });
  assert.equal(w.svc.exportMyData(w.T.moon).feelings.length, 0);
});

test('your data: reports carry your own reason and words, never the reported text or the safety team’s notes', () => {
  const w = world();
  w.release('moon');
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.reportFeeling(w.T.cloud, { holdId: offer.holdId, reason: 'identifying', details: 'It names a workplace.' });
  const rep = w.svc.modListReports(w.T.mod).reports[0];
  w.svc.modResolve(w.T.mod, { id: rep.id, action: 'dismiss', note: 'Internal: looked fine, no names. Reporter is CloudMallow.' });
  const file = w.svc.exportMyData(w.T.cloud);
  const text = JSON.stringify(file);
  assert.equal(file.reportsYouMade.length, 1);
  assert.deepEqual(file.reportsYouMade[0], {
    about: 'A feeling that found you', reason: 'Shares personal details', yourWords: 'It names a workplace.',
    madeAt: file.reportsYouMade[0].madeAt, status: 'reviewed by our safety team',
  });
  assert.ok(!text.includes(FEELING), 'the reporter’s file contains the reported feeling');
  assert.ok(!text.includes('Internal:'), 'the reporter’s file contains the safety team’s notes');
  // the person reported doesn't learn of it from their file either
  const moon = JSON.stringify(w.svc.exportMyData(w.T.moon));
  assert.ok(!moon.includes('It names a workplace') && !moon.includes('identifying'), 'the reported person’s file reveals the report');
});

test('your data: blocks are a count, and the people blocked are never named', () => {
  const { w, id } = fullJourney();
  const col = w.svc.getJourney(w.T.moon, { journeyId: id }).collection;
  w.svc.blockContributor(w.T.moon, { journeyId: id, perspectiveId: col[0].id });
  const file = w.svc.exportMyData(w.T.moon);
  assert.equal(file.peopleYouBlocked, 1);
  assert.equal(JSON.stringify(w.svc.exportMyData(w.T.cloud)).includes('block'), false, 'the blocked person’s file reveals the block');
});

test('your data: only the signed-in person’s own file, whatever the request says', () => {
  const { w } = fullJourney();
  throwsCode(() => w.svc.exportMyData(undefined), 'not-signed-in');
  throwsCode(() => w.svc.exportMyData('tok_forged0000000000000000000000000'), 'not-signed-in');
  throwsCode(() => w.svc.exportMyData({ accountId: 'x' }), 'not-signed-in');
  // arguments naming someone else are ignored: it is still your own file
  const mine = w.svc.exportMyData(w.T.cloud, { account: 'moon', accountId: Object.keys(w.svc.s.accounts)[0], key: 'moon' });
  assert.equal(mine.you.name, 'CloudMallow');
  // a moderator gets their own file, not anyone else's
  assert.equal(w.svc.exportMyData(w.T.mod).you.name, 'SafetyTeam');
  // after deleting their data the person is signed out, and there is nothing to export
  w.svc.deleteMyData(w.T.cloud, { confirm: 'DELETE' });
  throwsCode(() => w.svc.exportMyData(w.T.cloud), 'not-signed-in');
});

test('your data: the Mallow perspective is in the file, with its honest label, apart from the people', () => {
  const w = world({ provider: libraryProvider() });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * 60e3);
  return w.svc.askMallow(w.T.moon, { journeyId: id }).then(() => {
    const f = w.svc.exportMyData(w.T.moon).feelings[0];
    assert.equal(f.peopleWhoOfferedAPerspective, 0);
    assert.deepEqual(f.perspectivesFromHushmates, []);
    assert.equal(f.mallowPerspective.from, 'Your Mallow');
    assert.match(f.mallowPerspective.label, /^A Mallow perspective/);
    assert.ok(f.mallowPerspective.words.length > 0);
    assert.ok(f.journey.some((e) => e.step === 'your Mallow offered a perspective'));
  });
});

test('your data: dates are ISO, choices and states are plain words', () => {
  const { w, id } = fullJourney();
  const col = w.svc.getJourney(w.T.moon, { journeyId: id }).collection;
  w.svc.choosePerspective(w.T.moon, { journeyId: id, perspectiveId: col[0].id, keep: true });
  w.svc.choosePerspective(w.T.moon, { journeyId: id, perspectiveId: col[1].id, keep: false });
  const file = w.svc.exportMyData(w.T.moon);
  const f = file.feelings[0];
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  for (const d of [file.exportedAt, file.you.joinedAt, f.sentAt, f.cameHomeAt, f.agreedToShareWithoutYourNameAt]) assert.match(d, iso);
  // your own steps to the millisecond; other people's (a Hushmate offered or took back a perspective) by day only
  for (const e of f.journey) assert.match(e.at, /^a Hushmate/.test(e.step) ? /^\d{4}-\d{2}-\d{2}$/ : iso, `${e.step}: ${e.at}`);
  assert.equal(f.cameHomeBecause, 'five people offered a perspective');
  assert.deepEqual(f.perspectivesFromHushmates.map((p) => p.yourChoice).slice(0, 3), ['kept', 'let go', 'not chosen yet']);
  assert.equal(f.feeling, 'Worry');
  assert.ok(f.journey.every((e) => !/[A-Z_]{3,}|-/.test(e.step)), 'a journey step is a code, not words');
});

// ----------------------------------------- from the separation review (privacy lens) --
test('review: a perspective from someone who blocked the author leaves no trace the author could notice', () => {
  const w = world({ limits: { fairnessPool: 1 } });
  // Cloud's own feeling G, answered by Moon; Cloud then catches Moon's feeling F
  const g = w.release('cloud', { text: 'I keep wondering whether I said too much at dinner.' }).journey.id;
  w.give('moon', REFRAMES[0]);
  const f = w.release('moon').journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  assert.equal(w.svc.s.holds[offer.holdId].journeyId, f, 'setup: Cloud holds Moon’s feeling');
  w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId });
  // Cloud blocks whoever answered G (Moon), without knowing who that is
  w.svc.withdrawFeeling(w.T.cloud, { journeyId: g });
  const gcol = w.svc.getJourney(w.T.cloud, { journeyId: g }).collection;
  w.svc.blockContributor(w.T.cloud, { journeyId: g, perspectiveId: gcol[0].id });
  // Cloud writes on F: Cloud sees the usual thanks
  const res = w.svc.submitReframe(w.T.cloud, { holdId: offer.holdId, text: REFRAMES[1], clientId: 'blocked-writer-01' });
  assert.equal(res.slot, 1);
  assert.ok(w.svc.myGifts(w.T.cloud).gifts.some((x) => x.text === REFRAMES[1]), 'the writer lost their own words');
  // Moon learns nothing: no count, petal, step or file entry, and the place stays open
  const view = w.svc.getJourney(w.T.moon, { journeyId: f });
  assert.equal(view.humanCount, 0, 'the author can count a hidden perspective');
  assert.equal(view.petals.length, 0);
  assert.ok(!view.events.some((e) => e.type === 'perspective'), 'the journey shows a step for a hidden perspective');
  const file = w.svc.exportMyData(w.T.moon);
  assert.equal(file.feelings.find((x) => x.words === FEELING).peopleWhoOfferedAPerspective, 0);
  assert.equal(file.peopleYouBlocked, 0);
  assert.ok(!JSON.stringify(file).includes(REFRAMES[1]));
  w.give('star', REFRAMES[2]);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: f }).humanCount, 1, 'a set-aside perspective took a place someone else could have had');
  // taking it back or changing its share choice never touches Moon's journey either
  const before = JSON.stringify(w.svc.getJourney(w.T.moon, { journeyId: f }).events);
  const id = w.svc.myGifts(w.T.cloud).gifts.find((x) => x.text === REFRAMES[1]).id;
  w.svc.setGiftSharing(w.T.cloud, { perspectiveId: id, allowShare: true });
  w.svc.withdrawPerspective(w.T.cloud, { perspectiveId: id });
  assert.equal(JSON.stringify(w.svc.getJourney(w.T.moon, { journeyId: f }).events), before);
});

test('review: a perspective the author hid (by blocking) leaves no count or petal to link its writer to a feeling', () => {
  const w = world({ limits: { fairnessPool: 1 } });
  const a = w.release('moon').journey.id;
  w.advance(60e3);
  const b = w.release('moon', { text: 'I keep replaying what I said in the meeting.' }).journey.id;
  w.give('cloud', REFRAMES[0]);                      // on A
  w.give('cloud', REFRAMES[1]);                      // on B, still sealed
  w.svc.withdrawFeeling(w.T.moon, { journeyId: a });
  const col = w.svc.getJourney(w.T.moon, { journeyId: a }).collection;
  w.svc.blockContributor(w.T.moon, { journeyId: a, perspectiveId: col[0].id });
  const vb = w.svc.getJourney(w.T.moon, { journeyId: b });
  assert.equal(vb.humanCount, 0, 'the blocked person’s place on another feeling still shows');
  assert.equal(vb.petals.length, 0);
  assert.equal(w.svc.exportMyData(w.T.moon).feelings.find((x) => x.words !== FEELING).peopleWhoOfferedAPerspective, 0);
});
