// Final integration (the additive lexicon's verifier, polish 1): the lexicon's care (violence, abuse…) beside a wish to follow
// someone who died or a suicide named. readSafety used to return the plain care first, so the main screen's no-world rule
// (DEATH_CARE) and Another Angle's follow lines were lost. Now the lexicon's category and resources stand, and `deathCare`
// carries the death-care reading on both screens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import { DEATH_CARE } from '../src/app/scenes/hushfold.js';
import { SAFETY } from '../src/beyond/lines.js';
import { visit, STUBS } from './probes/r10-replay.mjs';

await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const BOTH = [
  ['my uncle beat me after mum died and i just want to be with her', 'death-follow'],
  ['since my husband died i want to go and be with him, my grandpa beat me', 'death-follow'],
  ['my mum died and i want to join her, he put his hand down my pants', 'death-follow'],
  ['my wife died and i want to follow her. they both beat me', 'death-follow'],
  ['my sister killed herself last year and my uncle touches my private parts', 'suicide-loss'],
  ['my brother took his own life and now my step dad beats me', 'suicide-loss'],
];

test('main screen: care from the lexicon keeps its category, and carries the death-care reading', () => {
  for (const [t, dc] of BOTH) {
    const plain = checkText(t);
    const r = readSafety({ checkText }, t, true);
    assert.equal(r.level, 'care', t);
    assert.equal(r.category, plain.category, `${t}: the lexicon's category and resources stand`);
    assert.equal(r.deathCare, dc, t);
    assert.ok(DEATH_CARE.has(r.deathCare), t);
  }
  // plain care with no death: no flag
  const r = readSafety({ checkText }, 'my dad beat me last night', true);
  assert.equal(r.level, 'care');
  assert.equal(r.deathCare, undefined);
});

test('main screen: the scene reads deathCare (no world offered); the overlay forwards it', () => {
  const hf = read('src/app/scenes/hushfold.js');
  assert.match(hf, /if \(DEATH_CARE\.has\(r\?\.deathCare\)\) S\.deathCare = true;/);
  const ov = read('src/hushfold/input-overlay.js');
  assert.match(ov, /const dc = !!r\.deathCare && !worst\.deathCare;/);
  assert.match(ov, /deathCare: r\.deathCare \|\| worst\.deathCare/);
});

test('Another Angle: the lexicon\'s care beside a wish to follow gets the follow lines; a suicide named the gentle ones; 0 requests', () => {
  const aa = read('src/beyond/another-angle.js');
  // the escalation is read before the level routes, so the lexicon's care speaks with the follow / gentle lines
  const after = aa.slice(aa.indexOf('async function afterTell('), aa.indexOf('function firstLook('));
  assert.match(after, /if \(deathEscalation\(S\.text\)\) S\.follow = true; else if \(suicideDeath\(S\.text\)\) S\.suicide = true;\s*noteSafety\(seen\);/);
  assert.match(aa, /async function careMode\(\{ lines = S\.follow \? SAFETY\.follow : S\.suicide \? SAFETY\.careGentle : SAFETY\.care \} = \{\}\)/);
  for (const [t, dc] of BOTH) {
    for (const server of [null, ...Object.values(STUBS).filter((s) => typeof s === 'function')]) {
      const R = visit(t, { server });
      assert.equal(R.requests, 0, t);
      assert.deepEqual(R.careLines, dc === 'death-follow' ? SAFETY.follow : SAFETY.careGentle, t);
    }
  }
});
