// The risk screener's check-in tier and its normaliser hardening (fix round, 15 Oct 2026; src/beyond/risk-screen.js CONCEPTS,
// normalise). A blind evaluation of six authors' fresh messages found 40.6% of concerning ones still got the play question; the
// owner asked for the detection ARCHITECTURE to be reviewed rather than phrases added. Here: the normaliser reads lookalike
// letters, invisible characters and spaced or split key words; each concept family asks the check-in on its own; care comes from
// combinations; abuse is the check-in only; the context reads a means question asked earlier; the builder's own everyday
// look-alikes (written before calibration) keep their budgets; ordinary grief keeps the gentle path; the prefilters change no
// reading; and it stays cheap. Every sentence here is the builder's own (none is copied from a held-out set).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { normalise, riskScreen, CARE_AT, CHECK_AT } from '../src/beyond/risk-screen.js';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import { lossRoute, remembrance } from '../src/beyond/backstop.js';
import { visit, STUBS } from './probes/r10-replay.mjs';
import { LOOKALIKES, LOOKALIKE_GRIEF } from './probes/risk-lookalikes.mjs';
import { FRESH, FRESH_CONTEXT } from './probes/risk-fresh.mjs';
import { EVERYDAY, GRIEF } from './probes/risk-sets.mjs';
import * as H from './probes/risk-holdout.mjs';
import { cpuPerCall, within, readings } from './helpers/cost.mjs';

await loadGrief();
const lv = (t, o) => riskScreen(t, o).level;
const main = (t, o = {}) => readSafety({ checkText }, t, true, { screen: true, ...o });
const routeOf = (r) => (r.level === 'crisis' ? 'crisis' : r.level === 'care' ? 'care' : r.level === 'concern' ? (r.supportFirst ? 'held' : r.category === 'loss' ? 'gentle' : 'support') : r.check ? 'checkin' : r.unsure ? 'ask' : 'play');
const SAFE = new Set(['crisis', 'care', 'held', 'checkin', 'support', 'gentle']);

// --------------------------------------------------------------------------------------------- the normaliser --
test('normalise: lookalike letters, invisible characters and combining marks never hide a key word (security finding 1)', () => {
  const cases = [
    ['kіll mysеlf', 'kill myself'], // Cyrillic і and е
    ['κill myself', 'kill myself'], // Greek kappa
    ['ᴋɪʟʟ ᴍʏsᴇʟꜰ', 'kill myself'], // Latin small capitals
    ['ｋｉｌｌ ｍｙｓｅｌｆ', 'kill myself'], // fullwidth
    ['𝐤𝐢𝐥𝐥 𝐦𝐲𝐬𝐞𝐥𝐟', 'kill myself'], // mathematical bold
    ['su\u{E0069}\u{E0063}icide', 'suicide'], // tag characters
    ['ki️ll myself', 'kill myself'], // a variation selector
    ['kiㅤll myself', 'kill myself'], ['kiﾠll myself', 'kill myself'], // Hangul fillers
    ['i want to d‮ie', 'i want to die'], // a bidi control
    ['k҉ill myself', 'kill myself'], ['k᪰ill myself', 'kill myself'], // combining marks outside U+0300–036F
  ];
  for (const [t, want] of cases) assert.equal(normalise(t), want, JSON.stringify(t));
});

test('normalise: spaced, dotted, dashed and split key words are joined; both words spaced too', () => {
  const cases = [
    ['k i l l m y s e l f', 'kill myself'], ['i w a n t t o d i e', 'i want to die'], ['e n d m y l i f e', 'end my life'],
    ['k.m.s', 'kill myself'], ['im gonna k m s', "i'm going to kill myself"], ['k‑i‑l‑l myself', 'kill myself'], ['k–i–l–l myself', 'kill myself'],
    ['i want to ki ll myself', 'i want to kill myself'], ['sui\ncide', 'suicide'], ['the world is better w/o me', 'the world is better without me'],
  ];
  for (const [t, want] of cases) assert.equal(normalise(t), want, JSON.stringify(t));
});

test('normalise: ordinary words and letters stay as they are (no correction outside the closed vocabulary)', () => {
  for (const t of ['a b c d', 'i a m fine', 's o s', 'my self', 'so on and so forth', 'good bye', 'over dose', 'cut ting', 'the k i t is here', 'i was a d j at the party',
    'sh, the baby is asleep', 'i went to see my mum. she is ok']) assert.equal(normalise(t), t.toLowerCase(), t);
  // a word of real Cyrillic or Greek is no lookalike: left as it is (other languages are out of scope)
  assert.equal(normalise('привет'), 'привет');
  assert.equal(normalise('καλημέρα'), 'καλημερα');
});

test('the lexicon reads the normalised words on both screens: obfuscated self-harm words are crisis, not the play question', () => {
  for (const t of ['і wаnt tо kіll mysеlf', 'k i l l m y s e l f tonight', 'i want to ki ll myself', 'su\u{E0069}icidal']) {
    assert.equal(main(t).level, 'crisis', t);
    const R = visit(t, { server: STUBS.pull, walk: 1, answer: null });
    assert.equal(R.route, 'crisis', t);
  }
});

// ------------------------------------------------------------------------------------ the check-in tier --
/** One concept of each family, in the builder's own words: the check-in at least (never the play question). */
const ONE_CONCEPT = {
  means: ['keep walking up to the viaduct at night and staring down', 'googled whether the drop from the pier would kill you', 'got hold of my brothers rifle', 'sitting on the edge of the multi storey roof'],
  harm: ['sh urges are bad tonight', 'relapsed and cut again', 'scratching my arms till they bleed', 'whenever i am furious i take it all out on my own body',
    'kept my cardigan on all through sports day'],
  immediacy: ['it ends tonight', 'doing it once my parents are asleep', 'in half an hour it will all be over'],
  farewell: ['if i stop replying after tonight please know you did nothing wrong', 'left envelopes for each of the kids in my desk', 'logging off for good'],
  give: ['putting all my affairs in order', 'gave my cat to my neighbour, wont be needing her'],
  future: ["can't imagine still being alive at thirty", 'no point planning anything for the summer', 'this will be my last birthday'],
  absence: ["i feel like i'm vanishing bit by bit", "honestly don't care if i live or die", 'wish a bus would hit me on the way home',
    "i'd rather not be here when my report card arrives"],
  burden: ["i'm a drain on my whole family", "i'm a waste of oxygen", 'everyone keeps telling me to go die'],
  hopeless: ["i honestly don't see what the point of anything is now", 'how much longer can i keep this up', 'no amount of sleep fixes this kind of tired'],
  abuse: ['my stepdad says that if i ever say anything to a teacher he will throw me out', 'my stepmum shuts me in the box room whenever she leaves the house', 'coach makes me promise to keep what happens after practice between us'],
};
test('each concept family asks the check-in on its own (or more): never the play question on either screen', () => {
  for (const [fam, xs] of Object.entries(ONE_CONCEPT)) {
    for (const t of xs) {
      assert.ok(lv(t), `${fam}: ${t} → ${JSON.stringify(riskScreen(t).hits.map((h) => h.id))}`);
      assert.ok(SAFE.has(routeOf(main(t))), `${fam} (main): ${t}`);
      const R = visit(t, { server: STUBS.pull, walk: 1, answer: null });
      assert.ok(['crisis', 'care', 'follow', 'gentle'].includes(R.route) || R.question === 'check', `${fam} (angle): ${t} → ${R.route}/${R.question}`);
      assert.equal(R.requests, 0, `${t}: nothing sent before an answer`);
    }
  }
});

test('care comes from combinations: a means with intent or secrecy, a note or things given away with finality, a burden with an absence, a near act', () => {
  const CARE = [
    'ordered some rope online. nobody knows', // a means and secrecy
    "grandad's rifle is up in the attic and it's all i can think about", // a means and intent
    'standing at the top of the cliffs right now', // a means place and a near time
    "i've written a note for my wife to find in the morning", // a note and finality
    "gave my books and my bike away, won't be needing them", // things given away and finality
    'my kids would have a better life without me dragging them down', // a burden and an absence
    "i'm doing it right now, don't stop me", // a near act and a farewell
    'took a whole packet about an hour ago', // taken, and when
  ];
  for (const t of CARE) assert.equal(lv(t), 'care', `${t}: ${JSON.stringify(riskScreen(t).hits.map((h) => [h.id, h.w]))}`);
  // one concept alone stays the check-in
  for (const t of ['bought some rope today', 'putting all my affairs in order', "i'm a waste of oxygen", 'logging off for good']) assert.equal(lv(t), 'check', t);
});

test('abuse and coercion are the check-in only, never the screener\'s care (the lexicon\'s abuse care stays as it is)', () => {
  for (const t of ['after lights out my uncle sneaks into my bedroom and makes me promise to keep it between us',
    'my carer keeps my bank card and wont let me phone anyone, she says no one would believe me']) {
    const r = riskScreen(t);
    assert.equal(r.level, 'check', `${t}: ${r.level}`);
    assert.ok(r.cats.abuse >= 2);
  }
});

test('jokes and everyday bounds dampen a frame, never a means, self-harm or a near act below the check-in', () => {
  assert.equal(lv('such a burden haha'), null, 'a burden in a joke');
  for (const t of ['bought a rope lol', 'cut myself again lol', 'gonna do it after midnight lol', 'standing on the bridge rn lol']) assert.ok(lv(t), t);
  // a joke dampens its own clause, not the next one
  assert.ok(lv("lol idk, i won't be around for my birthday anyway"), 'the second clause keeps its reading');
});

test('context: a means question asked earlier counts as a means once later words say something of the self', () => {
  for (const [h, t, want] of FRESH_CONTEXT) {
    const r = riskScreen(t, { history: h });
    assert.ok(want === 'care' ? r.level === 'care' : !!r.level, `${JSON.stringify(h)} → ${t}: ${r.level}`);
  }
  // the question alone, and an ordinary turn after it: nothing
  assert.equal(lv('which tower block round here is the highest'), null);
  assert.equal(lv('thanks, we are going up for the view at sunset', { history: ['which tower block round here is the highest'] }), null);
  assert.equal(lv('fine, film night later?', { history: ['i keep thinking about the bridge'] }), null);
  // a secrecy said after a concealment combines with it; the same words after an ordinary turn are nothing
  assert.equal(lv('so no one can see', { history: ['kept my cardigan on all through sports day'] }), 'care');
  assert.equal(lv('so no one can see', { history: ['got a terrible haircut this morning'] }), null);
  // covering up for the cold, for modesty or for a tattoo is no concealment
  for (const t of ['always in a jumper even in summer, i get so cold', 'i wear long sleeves in summer for modesty', 'wore long sleeves at the beach to hide my new tattoo from mum']) assert.equal(lv(t), null, t);
});

// ------------------------------------------------------------------------------- false alarms and griefs --
test('the builder\'s second everyday set (88 look-alikes, written before calibration): check-in ≤ 15%, the screener\'s care on none', () => {
  assert.ok(LOOKALIKES.length >= 80);
  const levels = LOOKALIKES.map((t) => lv(t));
  const check = levels.filter((l) => l === 'check').length, care = levels.filter((l) => l === 'care').length;
  const mainFp = LOOKALIKES.filter((t) => ['checkin', 'held', 'care', 'crisis'].includes(routeOf(main(t)))).length;
  console.log(`  look-alikes: screener check ${check}/${LOOKALIKES.length}, care ${care}; main-screen false alarms (any source) ${mainFp}`);
  assert.ok(check <= 0.15 * LOOKALIKES.length, `check ${check}`);
  assert.equal(care, 0, LOOKALIKES.filter((t) => lv(t) === 'care').join(' | '));
  // the earlier sets keep their budgets
  assert.ok(EVERYDAY.filter((t) => lv(t) === 'check').length <= 12);
  assert.ok(EVERYDAY.filter((t) => lv(t) === 'care').length <= 2);
});

test('ordinary grief keeps the gentle path: remembrance reads as a loss, never care, never the screener\'s check-in', () => {
  for (const t of [...LOOKALIKE_GRIEF, ...GRIEF, ...H.HOLDOUT_GRIEF]) {
    assert.notEqual(lv(t), 'care', t);
    assert.notEqual(main(t).category, 'self-risk', t);
  }
  for (const t of ["still wear my grandad's watch every day, it makes me feel close to him", 'some nights i still lay a second plate at the table for him',
    'every morning i say good morning to her picture on the mantelpiece', 'i miss her voice, i keep her voicemail saved on my phone']) {
    assert.ok(remembrance(t), t);
    assert.equal(lossRoute(t), 'gentle', t);
    assert.deepEqual([main(t).level, main(t).category], ['concern', 'loss'], t);
    const R = visit(t, { server: STUBS.pull, walk: 1, answer: null });
    assert.deepEqual([R.route, R.requests], ['gentle', 0], t);
  }
  // someone alive and away, or an everyday thing: no remembrance
  for (const t of ['his hoodie smells of him, he gets back from his trip on friday', 'i put two mugs out for me and my flatmate',
    'the flat feels so quiet without the kids while they are at camp', 'i wore my dads jumper today because i was cold']) assert.equal(remembrance(t), false, t);
  for (const t of LOOKALIKES) assert.equal(remembrance(t), false, t);
});

// ------------------------------------------------------------------------------ the fresh set, recorded --
test('the builder\'s fresh set (written after the H1 work): at least 95% handled on the main screen, care for 90% meant as care', () => {
  // (measured ONCE before any change it prompted: 67/77 handled, care for 26 of the 31 meant as care; the mechanism gaps it
  // showed were then closed, so these are now development figures, not a holdout; 76/77 and 31/31 at the end of the fix round,
  // the one left a look-up that is as likely ordinary: "how late the top deck of the hospital car park stays open")
  const routes = FRESH.map(([t]) => routeOf(main(t)));
  const safe = routes.filter((r) => SAFE.has(r)).length;
  const wantCare = FRESH.filter(([, , w]) => w === 'care');
  const care = wantCare.filter(([t]) => ['care', 'crisis'].includes(routeOf(main(t)))).length;
  console.log(`  fresh: handled ${safe}/${FRESH.length}; care for ${care}/${wantCare.length} meant as care`);
  assert.ok(safe >= 0.95 * FRESH.length, `${safe}`);
  assert.ok(care >= 0.9 * wantCare.length, `${care}`);
});

// ------------------------------------------------------------------- the prefilters are optimisations only --
test('the prefilters and windows change no reading (a copy of the screener without them reads every probe string the same)', async () => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const src = readFileSync(join(here, '../src/beyond/risk-screen.js'), 'utf8');
  const off = src
    .replace("    if (f.keys && !f.keys.some((x) => words.has(x))) continue;\n", '')
    .replace("    if (f.pre && !long && !f.pre.test(c)) continue;\n    if (f.also && !f.also.test(c)) continue;\n", '')
    .replace('    const spans = long ? windowsOf(f.preG) : [[0, c.length]];', '    const spans = [[0, c.length]];');
  assert.notEqual(off, src, 'the optimisations were found and switched off');
  const dir = mkdtempSync(join(tmpdir(), 'risk-nopre-'));
  try {
    writeFileSync(join(dir, 'risk-screen.mjs'), off);
    const Z = await import(pathToFileURL(join(dir, 'risk-screen.mjs')).href);
    const pool = [...LOOKALIKES, ...LOOKALIKE_GRIEF, ...FRESH.map(([t]) => t), ...EVERYDAY, ...GRIEF, ...H.HOLDOUT_POSITIVES.map(([t]) => t), ...H.HOLDOUT_EVERYDAY,
      ...Object.values(ONE_CONCEPT).flat()];
    const long = Array.from({ length: 120 }, (_, i) => { let t = ''; let k = i * 7; while (t.length < 600) t += pool[k++ % pool.length] + '. '; return t.slice(0, 600); });
    const sig = (r) => `${r.level}|${r.score}|${r.hits.map((h) => `${h.id}:${Math.round(h.w * 100)}`).join(',')}`;
    for (const t of [...pool, ...long]) assert.equal(sig(riskScreen(t)), sig(Z.riskScreen(t)), t);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------------------------------------- cost --
test('cheap: p95 under 10 ms for 600 characters read with the visit\'s history, as the app reads it (each message\'s CPU time over six reads)', () => {
  const pool = [...EVERYDAY, ...GRIEF, ...LOOKALIKES, ...FRESH.map(([t]) => t)];
  const mk = (i) => { let t = ''; let k = i; while (t.length < 600) t += pool[k++ % pool.length] + '. '; return t.slice(0, 600); };
  for (let i = 0; i < 30; i++) riskScreen(mk(i * 11 + 500), { history: [mk(i * 11 + 501)] });
  // each message's cost is this thread's CPU time over six reads of it (tests/helpers/cost.mjs): the other test files'
  // turns on a busy runner's cores never count (they took the best of three wall-clock reads past 10 ms), a slow rule costs
  // CPU on every read. The p95 is read again at most twice if it misses: a slow screener misses all three
  const pass = () => {
    const warm = [];
    for (let i = 0; i < 60; i++) {
      const h = [mk(i * 5 + 1), mk(i * 5 + 2), mk(i * 5 + 3)];
      riskScreen(mk(i * 5), { history: h }); // (the earlier Tells are read once, as each was when it was told)
      const ts = Array.from({ length: 6 }, (_, r) => `${mk(i * 5)} ok${r}`);
      warm.push(cpuPerCall((r) => riskScreen(ts[r], { history: h }), ts.length));
    }
    warm.sort((a, b) => a - b);
    console.log(`  600 characters with 3 earlier Tells: median ${warm[30].toFixed(2)} ms, p95 ${warm[Math.floor(0.95 * warm.length)].toFixed(2)} ms (CPU)`);
    return warm[Math.floor(0.95 * warm.length)];
  };
  const r = within(10, pass);
  assert.ok(r.ok, `p95 ${readings(r.seen, 2)} ms of CPU`);
  assert.equal(CARE_AT, 6); assert.equal(CHECK_AT, 3);
});
