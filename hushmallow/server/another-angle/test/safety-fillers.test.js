// Safety pre-check, second pass: filler words between the person and the
// verb ("he finally hit me"). Mirrors the app's src/engine/safety.js and its
// tests/safety-fillers.test.mjs; the probe table is shared with the app
// (hushmallow/tests/safety-fillers.probes.mjs) when the app is in this
// checkout, and a core set below always runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkSafety, checkSafetyFirstPass, fillerFreeCopy, tidyForSafety, FILLERS, SECOND_PASS } from '../src/safety/index.js';
import { HARM_LEXICON, CONCERN_LEXICON } from '../src/safety/shared-lexicon.js';
import { EXTRA_LEXICON } from '../src/safety/extra-lexicon.js';

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };
const APP_PROBES = new URL('../../../tests/safety-fillers.probes.mjs', import.meta.url);
const APP_SAFETY = new URL('../../../src/engine/safety.js', import.meta.url);
const noApp = !existsSync(APP_PROBES) && 'app probes not in this checkout';
const copyOf = (/** @type {string} */ t) => fillerFreeCopy(tidyForSafety(t));

test('fillers: the cases this started from are caught, and the everyday ones are not', () => {
  for (const [t, level, category] of [
    ['he finally hit me', 'care', 'violence'], ['glad he finally hit me', 'care', 'violence'], ['she always hits me', 'care', 'violence'],
    ['he literally choked me', 'care', 'violence'], ['they keep on hitting me', 'care', 'violence'], ['my husband hit me again', 'care', 'violence'],
    ['I really want to die', 'crisis', 'self-harm'], ['I just want to end it', 'crisis', 'self-harm'], ["I've finally cut myself again", 'crisis', 'self-harm'],
    ['I want to just really die', 'crisis', 'self-harm'], ["I don't really want to be alive anymore", 'crisis', 'self-harm'],
    ['my sister honestly wants to die', 'crisis', 'someone-in-danger'], ["he won't even let me see my friends", 'care', 'abuse'],
    ["he said he'd really kill me", 'care', 'threat'], ["she won't ever stop messaging me", 'care', 'harassment'], ["I don't really feel safe at home", 'care', 'unsafe'],
    // review round 1: 'like' after 'to', 'even if', guards and denials that hid disclosures, comma chains
    ['i want to like die', 'crisis', 'self-harm'], ['i wanna like die', 'crisis', 'self-harm'], ['i just want to like end it', 'crisis', 'self-harm'],
    ['i want to like disappear forever', 'crisis', 'self-harm'], ['nobody would care even if i died', 'crisis', 'self-harm'],
    ['no one would notice even if i was gone', 'crisis', 'self-harm'], ['i want to actually die', 'crisis', 'self-harm'],
    ['nobody would even really miss me', 'crisis', 'self-harm'], ['my sister wants to like die', 'crisis', 'someone-in-danger'],
    ['my boss actually grabbed me a couple of times', 'care', 'violence'], ['he finally grabbed me a few times', 'care', 'violence'],
    ['he just hit me back when i pushed him', 'care', 'violence'], ['he just hit me up the side of the head', 'care', 'violence'],
    ["it's not because he always hits me", 'care', 'violence'], ['no doubt he actually hit me', 'care', 'violence'],
    ['my boyfriend, honestly, like, hit me', 'care', 'violence'], ['he always hits me with his belt', 'care', 'violence'],
  ]) assert.deepEqual(checkSafety(t), { level, category }, t);
  for (const t of [
    'this deadline is really killing me', "it's really killing me", 'I could literally die of embarrassment', 'he finally hit the ball',
    'hit me up later', 'he always hits the snooze button', "I'm dying to see you", "I'd really kill for a coffee",
    'he never hit me', "he didn't hit me", 'he would never hurt me', 'he never really hurt me', 'my uncle has never actually touched me',
    'i want to like him', "i'd like to die my hair", 'i would like to go home', 'i used to like dying my hair',
    "I'd go even if it killed me", 'nobody would care even if I was late', 'she just grabbed me a coffee', 'he really hit me with the truth',
    'not once has he ever hit me', 'my boyfriend, honestly, like, loves me',
  ]) assert.equal(checkSafety(t).level, 'none', `${t} {${copyOf(t)}}`);
  // negations without fillers are exactly as they were
  assert.equal(checkSafety('he never hurt me').level, checkSafetyFirstPass('he never hurt me').level);
});

test('fillers: the shared probe table (positives match their words without fillers; negatives stay none)', { skip: noApp }, async () => {
  const P = await import(APP_PROBES.href);
  let n = 0;
  for (const [group, text, plain] of P.POSITIVE) {
    const g = P.GROUPS[group];
    const base = checkSafety(plain);
    const r = checkSafety(text);
    // The server has no harm-others rules; there it only has to agree with itself.
    if (!g.appOnly) {
      assert.deepEqual(base, { level: g.level, category: g.category }, `without fillers: ${plain}`);
      n++;
    }
    assert.deepEqual(r, base, `${text} → ${r.level}/${r.category} {${copyOf(text)}}`);
  }
  assert.ok(n >= 60, `server positives: ${n}`);
  for (const t of P.NEGATIVE) assert.equal(checkSafety(t).level, 'none', `${t} {${copyOf(t)}}`);
  // Flagged by the server's own extra rules before the second pass existed; never taken away.
  for (const t of P.NEGATIVE_APP_ONLY) assert.deepEqual(checkSafety(t), checkSafetyFirstPass(t), t);
  for (const [t, level] of P.NEGATIONS_TODAY) assert.deepEqual(checkSafety(t), checkSafetyFirstPass(t), `${t} (${level} in the app)`);
  // words the server already flags without fillers get that same level with them
  for (const [t, plain] of P.AS_WITHOUT_FILLERS) assert.equal(checkSafety(t).level, checkSafety(plain).level, `${t} {${copyOf(t)}}`);
});

test('fillers: the server and the app agree (same word lists, same copy, server at least as careful)', { skip: !existsSync(APP_SAFETY) && 'app not in this checkout' }, async () => {
  const app = await import(APP_SAFETY.href);
  assert.deepEqual(FILLERS, app.FILLERS);
  assert.deepEqual(SECOND_PASS, app.SECOND_PASS);
  const P = existsSync(APP_PROBES) ? await import(APP_PROBES.href) : { POSITIVE: [], NEGATIVE: [], NEGATIVE_APP_ONLY: [] };
  const texts = [...P.POSITIVE.flatMap((/** @type {string[]} */ [, a, b]) => [a, b]), ...P.NEGATIVE, ...P.NEGATIVE_APP_ONLY,
    'honestly he, like, just keeps on hitting me', 'I keep on wanting to die', "he didn't even really hurt me", 'what kind of pills are these'];
  for (const t of texts) {
    assert.equal(fillerFreeCopy(tidyForSafety(t)), app.fillerFreeCopy(app.tidyForSafety(t)), t);
    const a = app.checkText(t);
    const s = checkSafety(t);
    if (a.category !== 'harm-others') assert.ok(RANK[s.level] >= RANK[a.level], `${t}: app=${a.level} server=${s.level}`);
  }
});

test('fillers: additive — never less serious than the first pass, and filler-free text is unchanged', () => {
  const dir = fileURLToPath(new URL('./', import.meta.url));
  const texts = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.test.js'))) {
    for (const m of readFileSync(dir + f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.){4,200})'|"((?:[^"\\\n]|\\.){4,200})"/g)) {
      const s = (m[1] ?? m[2]).replace(/\\'/g, "'");
      if (/[a-z] [a-z]/i.test(s)) texts.add(s);
    }
  }
  assert.ok(texts.size > 300, `texts: ${texts.size}`);
  for (const t of texts) {
    const first = checkSafetyFirstPass(t);
    const r = checkSafety(t);
    assert.ok(RANK[r.level] >= RANK[first.level], `${t}: ${first.level} → ${r.level}`);
    if (r.level === first.level || copyOf(t) === tidyForSafety(t)) assert.deepEqual(r, first, t);
  }
});

// The pre-check exactly as it was before the second pass (13 Oct 2026),
// rebuilt here from the shared and extra lexicons, so an accidental edit to
// the first pass in src/safety/index.js shows up.
/** @param {string} text */
function referenceCheck(text) {
  const c = (/** @type {readonly string[]} */ list, flags = 'i') => list.map((src) => new RegExp(src, flags));
  const any = (/** @type {RegExp[]} */ regexes, /** @type {string} */ t) => regexes.some((re) => re.test(t));
  let t = String(text ?? '').slice(0, 2000).replace(/[‘’‛ʼ`´]/g, "'").replace(/[“”„‟]/g, '"').replace(/\s+/g, ' ').trim();
  if (!t) return { level: 'none', category: null };
  for (const re of c([...HARM_LEXICON.idiomGuards, ...EXTRA_LEXICON.idiomGuards], 'gi')) t = t.replace(re, (m) => ' '.repeat(m.length));
  let self = t;
  for (const re of c(EXTRA_LEXICON.crisisOther, 'gi')) self = self.replace(re, (m) => ' '.repeat(m.length));
  if (any(c([...HARM_LEXICON.crisis, ...EXTRA_LEXICON.crisis]), self)) return { level: 'crisis', category: 'self-harm' };
  if (any(c([...HARM_LEXICON.crisisOther, ...EXTRA_LEXICON.crisisOther]), t)) return { level: 'crisis', category: 'someone-in-danger' };
  /** @type {Record<string, readonly string[]>} */
  const shared = HARM_LEXICON.care;
  /** @type {Record<string, readonly string[]>} */
  const extra = EXTRA_LEXICON.care;
  const categories = [...Object.keys(shared), ...Object.keys(extra).filter((k) => !(k in shared))];
  for (const category of categories) if (any(c([...(shared[category] || []), ...(extra[category] || [])]), t)) return { level: 'care', category };
  if (any(c(CONCERN_LEXICON), t)) return { level: 'concern', category: 'distress' };
  return { level: 'none', category: null };
}

test('fillers: the first pass is the original pre-check, rebuilt from the lexicons (frozen reference)', async () => {
  const dir = fileURLToPath(new URL('./', import.meta.url));
  const texts = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.test.js'))) {
    for (const m of readFileSync(dir + f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.){4,200})'|"((?:[^"\\\n]|\\.){4,200})"/g)) {
      const s = (m[1] ?? m[2]).replace(/\\'/g, "'");
      if (/[a-z] [a-z]/i.test(s)) texts.add(s);
    }
  }
  if (existsSync(APP_PROBES)) {
    const P = await import(APP_PROBES.href);
    for (const t of [...P.POSITIVE.flatMap((/** @type {string[]} */ [, a, b]) => [a, b]), ...P.NEGATIVE, ...P.NEGATIVE_APP_ONLY, ...P.AS_WITHOUT_FILLERS.flat()]) texts.add(t);
  }
  assert.ok(texts.size > 300, `texts: ${texts.size}`);
  for (const t of texts) {
    const ref = referenceCheck(t);
    assert.deepEqual(checkSafetyFirstPass(t), ref, t);
    const r = checkSafety(t);
    assert.ok(RANK[r.level] >= RANK[ref.level], `${t}: ${ref.level} → ${r.level}`);
    if (r.level === ref.level) assert.deepEqual(r, ref, t);
  }
});
