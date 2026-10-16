// Final round 3, check-final.json blocking item 2 (and DECISIONS.md's own default: "My plant died", "the party is dead", "this
// traffic is murder" stay ordinary on the main screen): the WEAK death words count as death talk only when what died is a
// person or a pet. The rule is structural (death-words.js whoDied: the subject or the object of the weak word, past what hangs
// on it, past a relative clause; a person or a pet noun, he / she, a capitalised given name), not another phrase family:
//   - a thing, an idea or a place that died (or "killed me", "buried myself") → lossRoute null: the one question, like any Tell
//   - someone unknown ("pepper died", "my vicar is dead") → lossRoute 'ask': the question too, never the gentle path
//   - a person or a pet → the gentle path, no question, as before
// and the wish to follow the one who died keeps its recall: deathTalk's wide reading (the escalation reader's) still counts
// someone unknown, so "pepper died and I want to be with her" is care on both screens.
//
// Every list was written before the check's own list was read (tests/probes/r3-words.mjs), then the check's nine verbatim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import * as GR from '../src/beyond/grief.js';
import { lossRoute, gentleRoute, unsureLoss, strongLoss } from '../src/beyond/backstop.js';
import { firstStep } from '../src/beyond/angle-first.js';
import { norm, blankOrdinary, whoDied } from '../src/beyond/death-words.js';
import { visit, STUBS } from './probes/r10-replay.mjs';
import * as P from './probes/r3-words.mjs';

await loadGrief();

/** The main screen's route (input-overlay readSafety, lossAware): 'gentle' (concern / loss), 'care', or 'question'. */
function main(t) {
  const r = readSafety({ checkText }, t, true);
  if (r.level === 'crisis' || r.level === 'care') return 'care';
  if (r.level === 'concern') return r.category === 'loss' ? 'gentle' : 'care';
  // (level none, unsure or not: "Shall we play with this, or just be with it?" before any world, hushfold.js)
  return 'question';
}
/** Another Angle's route (startAngle → angle-first.js firstStep), after the safety check and an escalation. */
function angle(t) {
  const c = checkText(t);
  if (c.level === 'crisis' || c.level === 'care' || GR.deathEscalation(t)) return 'care';
  const step = firstStep(t);
  if (step === 'gentle') return 'gentle';
  assert.equal(step, 'choice', `${t}: every other Tell is asked first`);
  return 'question';
}
/** What the weak words say (the loss words and the grief words together, as grief.js weakDeath reads them; `which`: one of them). */
const who = (t, which = null) => (which ? whoDied(blankOrdinary(norm(t)), which) : GR.weakDeath(t));

// ------------------------------------------------------------------------------ the pins --
test('r3-words 1: the check\'s nine ordinary Tells, verbatim: the question on both screens, no loss read at all (lossRoute null)', () => {
  assert.equal(P.CHECK_ORDINARY.length, 9);
  for (const t of P.CHECK_ORDINARY) {
    assert.deepEqual([main(t), angle(t)], ['question', 'question'], t);
    assert.equal(lossRoute(t), null, t);
    assert.equal(GR.deathTalk(t), null, t);
    assert.equal(GR.deathTalk(t, { sure: true }), null, t);
    assert.equal(gentleRoute(t), false, t);
  }
});

test('r3-words 2: my 30 ordinary Tells (written first) and 51 more: the question on both screens, never the gentle path', () => {
  const ask = [];
  for (const t of [...P.MINE_ORDINARY, ...P.MORE_ORDINARY]) {
    assert.deepEqual([main(t), angle(t)], ['question', 'question'], t);
    assert.notEqual(lossRoute(t), 'gentle', t);
    assert.equal(gentleRoute(t), false, t);
    if (lossRoute(t) === 'ask') ask.push(t);
  }
  // (unsure, so asked: a noun the lists never say is a thing as what died, or a cemetery they were at themselves; the rest read
  // no loss at all, lossRoute null; both are the one question on both screens)
  assert.deepEqual(ask, [
    'My love for running died when I hurt my knee', 'The graveyard near our house is where I go running', 'Chivalry is dead', 'my fringe is dead',
    'my bike is dead, the chain snapped', 'I killed my presentation', 'my old ipod died', 'my tamagotchi died lol', 'my love for football died',
  ]);
  assert.equal(P.MINE_ORDINARY.length, 30);
});

test('r3-words 3: my 30 deaths of a person or a pet (written first) and 55 more: the gentle path on both screens, never asked', () => {
  assert.equal(P.MINE_DEATHS.length, 30);
  const lexicon = [];
  for (const t of [...P.MINE_DEATHS, ...P.MORE_DEATHS]) {
    assert.equal(lossRoute(t), 'gentle', t);
    // (the safety lexicon may read one higher, as crisis: "an overdose"; never lower, never asked)
    if (['crisis', 'care'].includes(checkText(t).level)) { lexicon.push(t); assert.deepEqual([main(t), angle(t)], ['care', 'care'], t); continue; }
    assert.deepEqual([main(t), angle(t)], ['gentle', 'gentle'], t);
  }
  assert.deepEqual(lexicon, ['My mate from school died of an overdose']);
});

test('r3-words 4: in the Another Angle flow, an ordinary Tell is asked before anything is sent; a death plays gently, never asked', () => {
  for (const t of [...P.CHECK_ORDINARY, ...P.MINE_ORDINARY.slice(0, 10)]) {
    for (const server of [null, STUBS.grief, STUBS.pull]) {
      const R = visit(t, { server, answer: null });
      assert.equal(R.asked, true, t);
      assert.equal(R.question, 'choice', t);
      assert.equal(R.requestsBeforeAnswer, 0, t);
      assert.equal(R.requests, 0, t);
      assert.equal(R.scenes.filter((s) => s.grief).length, 0, `${t}: no gentle loss scene`);
    }
  }
  for (const t of P.MINE_DEATHS.slice(0, 10)) {
    const R = visit(t, { answer: null });
    assert.equal(R.route, 'gentle', t);
    assert.equal(R.asked, false, t);
  }
});

test('r3-words 5: the earlier pins that change, each justified: no one named, so asked; a thing died, so ordinary', () => {
  // "I cried at the cemetery": no person and no pet at the cemetery, so the words never say whose death it is: the one
  // question (lossRoute 'ask': the check-in with the question off); still death talk to the escalation reader (wide)
  for (const t of P.ASKED_NO_ONE) {
    assert.deepEqual([main(t), angle(t)], ['question', 'question'], t);
    assert.equal(lossRoute(t), 'ask', t);
    assert.equal(unsureLoss(t), true, t);
    assert.equal(GR.deathTalk(t), 'grief', t);
    assert.equal(GR.deathTalk(t, { sure: true }), null, t);
  }
  // r8 FALSE_ALARMS and r9 SEM_ORDINARY_GENTLE pinned these as gentle by design: a plant is a thing
  for (const t of P.THING_DIED_BEFORE) { assert.equal(lossRoute(t), null, t); assert.equal(main(t), 'question', t); }
});

// ------------------------------------------------------------------------------ the rule --
test('r3-words 6: who died, by the shape of the clause (subject, object, what hangs on it, a relative clause, a name)', () => {
  const cases = [
    // the subject, past a place or a part hanging on it, a gerund, a relative clause, an aside
    ['the plant on my desk died', 'thing'], ['my enthusiasm for the project died', 'thing'], ['My friendship with Sarah kind of died', 'thing'],
    ['My hopes of getting into the team are dead', 'thing'], ['The coach who taught me to swim died', 'who'], ['the man I married died', 'who'],
    ['the bird we had for ten years died', 'who'], ['the tree my grandad planted died', 'thing'], ['My neighbour, who used to bring us cakes, died', 'who'],
    ['a boy in my year died', 'who'], ['two of my friends died', 'who'], ['half my family died in the war', 'who'], ['Max, our old lab, died last week', 'who'],
    ['my son, 19, died', 'who'], ['killed in a crash, my cousin', 'who'], ['my sister is in the icu dying', 'who'], ['Grandad got ill and died', 'who'],
    // the object of killed / buried, passive and progressive
    ['cancer killed my dad', 'who'], ['the traffic killed me', 'thing'], ['I buried myself in work', 'thing'], ['we buried Biscuit in the garden', 'who'],
    ['we are burying my uncle on monday', 'who'], ['my uncle was killed in a crash', 'who'], ['the project was killed by management', 'thing'],
    ['that joke totally killed at the open mic', 'thing'], ['the cat killed the mouse', 'unknown'], ['our cat killed my hamster', 'who'],
    // dead and dying before a noun, after one, and as "very"
    ['my dead dog', 'who'], ['I found my dad dead', 'who'], ['my uncle was shot dead', 'who'], ["I'm not over my mum dying", 'who'], ['he is dead funny', null],
    ['my motivation is so dead', 'thing'],
    // pronouns, names, capitals
    ["I can't believe he's dead", 'who'], ["scared he'll die", 'who'], ['We had two goldfish and they both died', 'who'], ['I bought chillies but they died', 'unknown'],
    ['My tomatoes struggled and they all died', 'thing'], ['our hamster got ill and it died', 'who'], ['Pepper died this morning', 'who'], ['pepper died this morning', 'unknown'],
    ['Chivalry is dead', 'unknown'], ['Motivation died', 'thing'], ['Battery died', null], ['MY DOG DIED', 'who'], ['I nearly died', 'self'],
  ];
  for (const [t, want] of cases) assert.equal(who(t), want, t);
  // a cemetery: someone visited or lying there is a death; no one named is a place (or unsure, when they were there themselves)
  assert.equal(who('we visited my grandad at the cemetery', 'grief'), 'who');
  assert.equal(who('the cemetery where my nan is buried', 'grief'), 'who');
  assert.equal(who('the cemetery near my flat has the best trees', 'grief'), 'thing');
  assert.equal(who('my mum and I walked past the cemetery', 'grief'), 'unknown');
  // the strong words are unchanged: no person needed
  for (const t of ['passed away last night', 'lost my mum', 'the funeral of my uncle', 'RIP', 'I had a miscarriage', 'we had to put our dog down', 'he is no longer with us']) {
    assert.equal(lossRoute(t), 'gentle', t);
  }
});

test('r3-words 7: the wish to follow keeps its recall: someone unknown who died, with the wish, is care on both screens', () => {
  for (const t of ['pepper died and I want to be with her', 'coco died, I want to join her', 'my sensei died and I want to go with him']) {
    assert.equal(GR.deathTalk(t), 'loss', t);
    assert.equal(GR.deathTalk(t, { sure: true }), null, t);
    assert.deepEqual([main(t), angle(t)], ['care', 'care'], t);
  }
  // a thing that died, with a wish to die, is the lexicon's crisis, never missed
  for (const t of ['my plant died and I want to die too', 'my motivation is dead and I want to kill myself']) assert.equal(checkText(t).level, 'crisis', t);
  // the speaker as the one who dies keeps the gentle path wherever the lexicon reads less (a safety backstop, as before): never the
  // ordinary question; "killed me" / "buried myself" are no death at all
  for (const t of ['I feel like dying', 'I nearly killed myself last year', 'I keep thinking about dying', "that doesn't mean i want to actually die",
    'no no no no no want to actually die', "I don't necessarily want to really die"]) {
    assert.equal(GR.deathTalk(t, { sure: true }), 'loss', t);
    assert.ok([main(t), angle(t)].every((r) => r === 'gentle' || r === 'care'), `${t}: ${[main(t), angle(t)]}`);
  }
  // (and the lexicon's own: "better off dead" is crisis on both screens whatever the reading)
  assert.deepEqual([main("I'd be better off dead"), angle("I'd be better off dead")], ['care', 'care']);
  // ", who died": the one before the comma ("I want to be with my dad, who died last year": care, as before)
  assert.equal(who('I want to be with my dad, who died last year'), 'who');
  // and nothing here touches strongLoss (the main screen's backstop for the strong cues)
  for (const t of P.CHECK_ORDINARY) assert.equal(strongLoss(t), false, t);
});

test('r3-words 8: the safety lexicons are untouched (byte-identical, as approved)', () => {
  // (the hash moved since for the lexicon-gaps pass of 14 Oct 2026 and its rounds 3 and 4: tests/lexicon-gaps.test.mjs; and on
  // 15 Oct 2026 for the detection fix's one additive care rule, the threat still being made: lexicon-diff LOST 0; and on
  // 16 Oct 2026 for the Australian lines in HARM_COPY's support copy only, every rule verbatim: lexicon-diff LOST 0, GAINED 0)
  const app = readFileSync(new URL('../src/data/safety-lexicon.js', import.meta.url));
  const server = readFileSync(new URL('../server/another-angle/src/safety/shared-lexicon.js', import.meta.url));
  assert.match(createHash('sha256').update(app).digest('hex'), /^41c4a5c8a4a98f39/);
  assert.ok(app.equals(server));
});
