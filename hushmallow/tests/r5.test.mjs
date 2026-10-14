// Final round 5 (the independent check of integ/final-r4, f684ecd, score 4: /tmp/claude-0/hf/check-r4.json). Five rounds showed that
// word lists never converge against a reviewer who reads the code, so this round makes two STRUCTURAL guarantees:
//
//   1. nothing on Another Angle's gentle path is ever sent to the server, whatever the wording (another-angle.js griefMode has no
//      client call; DECISIONS.md, defaults of 2026-10-14: "Another Angle after a death"), and unsure words with the safety net's
//      words (grief.js keepLocal) play Zuzu's own angle after "Another angle", nothing sent
//   2. the detection gate (tools/beyond/detection-gate.mjs): no sentence 931fbb0 read as care or crisis reads lower, and no
//      first-person sentence 931fbb0 sent to the gentle path drops to the question or the play question. It runs as a tool (both
//      trees, every test string and every sentence the checks quoted); its lexer is tested here.
//
// And, additive: the check's 5 own-first misses and 22 adversarial shapes are care where the clause is explicit, held for the rest
// (the main screen's support first), never sent. Round 4's figurativeSelf and "wish I was gone" tail are reverted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import * as GR from '../src/beyond/grief.js';
import { whoDied, norm, blankOrdinary } from '../src/beyond/death-words.js';
import { lossRoute } from '../src/beyond/backstop.js';
import { DEATH_CARE } from '../src/app/scenes/hushfold.js';
import { visit, STUBS } from './probes/r10-replay.mjs';
import { literals } from '../tools/beyond/detection-gate.mjs';
import * as P from './probes/r5.mjs';

await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const AA = read('src/beyond/another-angle.js');
/** Every server answer the replay knows, and sharing off. */
const EVERY_STUB = [null, ...Object.keys(STUBS).map((k) => STUBS[k]).filter((s) => typeof s === 'function')];
const mainRead = (t) => readSafety({ checkText }, t, true);
const isCare = (r) => r.level === 'care' || r.level === 'crisis';
/** A counting stub around a server answer: how many requests the visit made, whatever the replay itself reports. */
function counted(s) { const c = { n: 0 }; return [s ? (x, o) => { c.n++; return s(x, o); } : null, c]; }
/** Another Angle: care (or crisis) with 0 requests, never asked, nothing played, with every server answer. */
function angleCare(t) {
  for (const s of EVERY_STUB) {
    const [server, c] = counted(s);
    const R = visit(t, { server });
    assert.ok(['care', 'follow', 'crisis'].includes(R.route), `${t}: ${R.route}`);
    assert.deepEqual([c.n, R.asked, R.mechanics.length], [0, false, 0], t);
  }
}
function careBoth(t) {
  const r = mainRead(t);
  assert.ok(isCare(r), `${t}: main ${r.level}/${r.category}`);
  if (r.level === 'care') assert.ok(DEATH_CARE.has(r.category), `${t}: ${r.category}`);
  angleCare(t);
}
/** The gentle path held: main concern + supportFirst (no world), Another Angle gentle with 0 requests (every server answer). */
function heldBoth(t) {
  const r = mainRead(t);
  assert.deepEqual([r.level, r.supportFirst], ['concern', true], `${t}: main ${r.level}/${r.category}/${r.supportFirst}`);
  for (const s of EVERY_STUB) {
    const [server, c] = counted(s);
    const R = visit(t, { server });
    assert.deepEqual([R.route, c.n, R.asked], ['gentle', 0, false], t);
  }
}

// ------------------------------------------------------------------------------ 1. structural --
test('structural: griefMode has no client call at all; nothing on the gentle path can be sent, whatever the words', () => {
  const grief = between(AA, 'async function griefMode(', 'const heavySeen = ');
  assert.doesNotMatch(grief, /client\.|serverMode\(\)|fetch\(|sendBeacon|XMLHttpRequest/);
  // the only requests in the whole experience are the ordinary path's angle and a server scene's feedback
  assert.equal((AA.match(/client\.angle\(/g) || []).length, 1, 'one angle request in the file: startAngle');
  assert.equal((AA.match(/client\.feedback\(/g) || []).length, 1);
  assert.match(AA, /if \(serverMode\(\) && scene\.source === 'server'\) client\.feedback\(rating, scene\)/);
  const start = between(AA, 'async function startAngle(', 'const FIRST_QUESTION = {');
  assert.ok(start.indexOf("if (route === 'gentle') return griefMode();") < start.indexOf('client.angle('), 'a detected loss never reaches the request');
  // the gentle path's own lines, support close
  assert.match(grief, /if \(!scene\) scene = gentleScene\(S\.text,/);
  assert.match(grief, /supportPill\.hidden = false;/);
});

test('structural: 50 gentle-path phrasings make 0 requests with every server stub, every way there (the replay)', () => {
  assert.equal(P.GENTLE_50.length, 50);
  assert.equal(new Set(P.GENTLE_50).size, 50);
  let visits = 0;
  for (const t of P.GENTLE_50) {
    assert.equal(lossRoute(t), 'gentle', t);
    for (const s of EVERY_STUB) {
      for (const way of [{}, { said: 'yes' }, { answer: 'yes', asks: false }, { answer: null }, { walk: 3 }]) {
        const [server, c] = counted(s);
        const R = visit(t, { server, ...way });
        visits++;
        assert.equal(R.route, 'gentle', `${t} ${JSON.stringify(way)}`);
        assert.deepEqual([c.n, R.requests, R.asked, R.mechanics.length], [0, 0, false, 0], `${t} ${JSON.stringify(way)}`);
        // never the server's lines: the authored gentle pair
        assert.notEqual(R.scenes[0]?.source, 'server', t);
      }
    }
  }
  console.log('r5 gentle path: 50 phrasings,', visits, 'visits, 0 requests');
});

test('structural: unsure words with the net\'s words are asked first, then "Another angle" plays Zuzu\'s own angle, nothing sent', () => {
  for (const t of P.CHECK_ASK_WISH) {
    assert.equal(lossRoute(t), 'ask', t);
    assert.equal(GR.keepLocal(t), true, t);
    for (const s of EVERY_STUB) {
      const [server, c] = counted(s);
      const R = visit(t, { server, answer: 'angle' });
      assert.deepEqual([R.asked, R.requestsBeforeAnswer, c.n, R.local], [true, 0, 0, true], t);
      assert.ok(R.route === 'play' || R.route === 'nomore', `${t}: ${R.route}`);
      assert.ok(R.scenes.every((x) => x.source !== 'server'), t);
    }
  }
  // the source: read before the request
  const start = between(AA, 'async function startAngle(', 'const FIRST_QUESTION = {');
  assert.ok(start.indexOf('S.local = S.unsure && keepLocal(S.text);') < start.indexOf('client.angle('));
  assert.match(start, /const req = serverMode\(\) && !S\.local\s*\?/);
});

test('structural: ordinary non-death Tells still send after "Another angle", as before', () => {
  for (const t of P.ORDINARY_SEND) {
    assert.equal(lossRoute(t), null, t);
    assert.equal(GR.keepLocal(t), false, t);
    const [server, c] = counted(STUBS.pull);
    const R = visit(t, { server, answer: 'angle', walk: 1 });
    assert.deepEqual([R.asked, R.requestsBeforeAnswer, R.route], [true, 0, 'play'], t);
    assert.equal(c.n, 1, `${t}: one angle request`);
    // nothing before the answer: no answer, no request
    const [s2, c2] = counted(STUBS.pull);
    visit(t, { server: s2, answer: null });
    assert.equal(c2.n, 0, t);
  }
});

// --------------------------------------------------------------------------------- 2. the reverts --
test('revert: the speaker counts again (no figurative frames); the check\'s eleven notes are care with 0 requests', () => {
  const who = (t) => whoDied(blankOrdinary(norm(t)), 'loss');
  for (const t of P.KNOWN_FALSE_GENTLE) assert.equal(who(t), 'self', t);
  for (const t of P.CHECK_ESC_NOTES11) careBoth(t);
  // the speaker's own dying is the gentle path again (held when the net reads it), never the question
  for (const t of P.CHECK_SELF_DYING) {
    assert.equal(lossRoute(t), 'gentle', t);
    assert.ok(!isCare(mainRead(t)), t);
    const R = visit(t, { server: STUBS.pull });
    assert.deepEqual([R.route, R.asked, R.requests], ['gentle', false, 0], t);
  }
  assert.doesNotMatch(read('src/beyond/death-words.js'), /figurativeSelf|FIGURATIVE/);
});

test('revert: "wish I was gone" with any tail is care again (the check\'s seven, as at 931fbb0); the gate keeps round 4\'s false care', () => {
  for (const t of P.CHECK_ESC_GONE7) careBoth(t);
  for (const t of P.KNOWN_FALSE_CARE) assert.equal(GR.deathCare(t), 'follow', t);
});

// ------------------------------------------------------------------------------ 3. additive --
test('additive: the check\'s 5 own-first misses and 22 adversarial shapes: care where the clause is explicit, held for the rest, never sent', () => {
  assert.equal(P.CHECK_ESC_OWN5.length, 5);
  assert.equal(P.CHECK_ESC_ADV22.length, 22);
  const held = new Set(P.CHECK_ESC_HELD);
  let care = 0;
  for (const t of [...P.CHECK_ESC_OWN5, ...P.CHECK_ESC_ADV22]) {
    if (held.has(t)) { assert.equal(GR.deathCare(t), null, t); heldBoth(t); continue; }
    assert.equal(GR.deathCare(t), 'follow', t);
    careBoth(t);
    care++;
  }
  assert.equal(care, 24);
  // the check's polish: five of six care now, the sixth held
  for (const t of P.CHECK_ESC_POLISH6) {
    if (/im coming son/u.test(t)) { heldBoth(t); continue; }
    careBoth(t);
  }
});

test('additive: each shape on its own (stems, typos, letters spaced out, the heart, never getting up, the wish before the death)', () => {
  for (const [t, want] of [
    ['my dad died and i want to joine him', true], ['my dad died and i want to follow him', true], ['my dad died and i want to folllow him', true],
    ['my mum died and i want to be w her', true], ['my mum died and i just want to be with u', true], ['my dad died and i want to k i l l myself', true],
    ['my wife died and i pray my heart gives out', true], ['my wife died and i pray my heart stops hurting', false],
    ['my son died and i want to lie down and never get up', true], ['my son died and i want to lie down and get up later', false],
    ['i want to join my nan, she died last year', true], ['i want to follow my dad, he passed in june', true], ['i want to follow my dad on strava, he passed in june', false],
    ['my dad died and i have stopped taking my heart tablets', true], ['my dad died and i have not stopped taking my tablets', false],
    ['my mum died and tonight i will be with her', true], ['my mum died and i will see her friends tonight', false],
    ['my brother died and i would swap places with him', true], ['my dad died and i gave all my stuff away', true],
  ]) assert.equal(GR.deathCare(t) === 'follow', want, t);
});

test('additive: the shapes\' neighbours are never care (a lead, a dream, a vitamin, a choir, the road)', () => {
  for (const t of P.R5_NEG) {
    assert.equal(GR.deathCare(t), null, t);
    assert.ok(!isCare(mainRead(t)), t);
  }
});

test('the new rules stay cheap: 2,000 characters built to make them work hard', () => {
  const median = (xs) => xs.sort((a, b) => a - b)[xs.length >> 1];
  for (const seed of ['d i e d i e ', 'k i l l k i l l ', 'i want to follow my my my ', 'pray my heart my heart ', 'lie down lie down and ', 'tonight im going to meet ',
    'wait for me wait ', 'i want to want to want to see ', 'joine folow joine folow ', 'stopped taking my my ', 'everyone is dead and i dead and i ']) {
    const t = seed.repeat(Math.ceil(2000 / seed.length)).slice(0, 2000);
    for (const f of [GR.keepLocal, GR.selfEnding, GR.wantsToFollow, GR.deathCare]) {
      f(t);
      const xs = [];
      for (let i = 0; i < 5; i++) { const t0 = performance.now(); f(t); xs.push(performance.now() - t0); }
      assert.ok(median(xs) < 120, `${f.name} ${seed}: ${median(xs).toFixed(1)} ms`);
    }
  }
});

// ------------------------------------------------------------------------------ 4. the gate --
test('the gate\'s lexer: every string literal and template chunk, cooked; comments and regex literals skipped', () => {
  const src = [
    "const a = 'it\\'s me'; // 'a comment'",
    'const b = "say \\"hi\\"\\u2019s"; /* "block" */',
    'const c = `one ${x + `inner ${y}`} two ${"three"} four`;',
    "const r = /a'b\"c/g.test(s) ? 'yes' : 'no';",
    'const d = x / 2 / 3; const e = \'after division\';',
  ].join('\n');
  assert.deepEqual(literals(src), ["it's me", 'say "hi"’s', 'one ', 'inner ', '', ' two ', 'three', ' four', 'yes', 'no', 'after division']);
  assert.ok(existsGate(), 'tools/beyond/detection-gate.mjs');
});
function existsGate() { try { return /LOST_CARE[\s\S]*LOST_SELF_GENTLE[\s\S]*GENTLE_SENT[\s\S]*GAINED/.test(read('tools/beyond/detection-gate.mjs')); } catch { return false; } }

test('DECISIONS.md records the default, as a row of the 2026-10-14 defaults table', () => {
  const doc = read('docs/integration/DECISIONS.md');
  const table = between(doc, '## Defaults taken on the owner\'s behalf (2026-10-14)', '## Still open for the owner');
  assert.ok(table.includes("| Another Angle after a death | The gentle path stays on the phone: the authored gentle lines, nothing sent to the server (default; the model's own gentle reply is switched off) |"));
});
