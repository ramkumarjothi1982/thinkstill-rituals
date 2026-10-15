// The risk screener (owner, 15 Oct 2026: "review the detection architecture rather than continuing to add narrow phrases").
//
// Six rounds of word lists each caught the reviewer's last examples and missed the next ones: 14 of 20 fresh goodbye notes
// and self-harm expressions got the play question. This module reads distress the way a person would, by MEANING rather
// than by sentence: it rewrites the words into one plain spelling (normalise), finds the semantic FRAMES in them (the self
// ending, a means, a farewell, burden or hopelessness, a future absence, immediacy) with windows and clause boundaries, and
// scores how they COMBINE. One frame alone is rarely enough for care; a farewell with a time, a burden with an ending, an
// absence with a goodbye, a means with the self are. Weak everyday bounds ("see you Monday", "at work", "my train is here",
// "the project", "this level") dampen a frame — they never cancel the self ending or a means held by the self.
//
// (fix round, 15 Oct 2026) A blind evaluation of six authors' fresh messages found 40.6% of concerning ones still got the
// play question. The architecture now has two tiers. THE CHECK-IN TIER is high recall: the check-in costs a false alarm no
// extra tap ([I'm okay — let's play] is its first chip), so any one risk CONCEPT asks it — the concept families (CONCEPTS
// below) are closed vocabularies with slots: a means or a method place and what the self does with it or asks about it,
// self-harm and its slang, a vague act with a near time, a note and when it is to be read, things given away, a future the
// self is not in, fading and not waking, burden, hopelessness, and abuse or coercion (the check-in only, never care here).
// CARE stays a COMBINATION (scoreOf): a means with intent, secrecy or a near time; a note or a farewell with finality or a
// near time; things given away with finality; a burden with an absence; a near act beside any other frame of the self.
// Context (riskScreen): the visit's last Tells are read as if said in one message, and a means or plan question asked
// earlier counts as a means once later words say something of the self.
//
//   normalise(text)                → the words in one spelling: NFKD, invisible characters out (tag characters, variation
//                                    selectors, bidi controls, Hangul fillers, every combining mark), lookalike letters folded
//                                    (Cyrillic, Greek, small capitals; fullwidth and mathematical letters by NFKD), lowercase,
//                                    accents stripped, zero-width removed and emoji spaced, 3+ repeated letters collapsed
//                                    (diiie → die), leet read inside words (k1ll → kill), spaced letters joined (d i e → die,
//                                    "k i l l m y s e l f" → kill myself, k.m.s, k‑i‑l‑l with non-breaking hyphens or dashes),
//                                    a key word split by one space joined ("ki ll"), texting expanded (u, ur, im, cant, wanna,
//                                    imma, idk, rn, 2nite, w/o …), and tokens FUZZY-CORRECTED against the closed key vocabulary
//                                    (Damerau–Levenshtein ≤ 1 for 4–6 letters, ≤ 2 for 7+; ≤ 3 letters only through the
//                                    explicit typo map: dei → die, kil → kill …), never an ordinary word on the protected list
//                                    (diet, dine, wife, like, lift, kiln …). Punctuation stays, so every other rule reads it too.
//                                    Out of scope (limits): reversed text, base64 and other encodings, other languages.
//   frames(text)                   → { hits, cats }: every frame found (id, frame, weight after dampening, sentence) and the
//                                    score per frame
//   riskScreen(text, { history })  → { level: 'care' | 'check' | null, score, cats, hits, context, normalised }
//                                    'care'  (score ≥ CARE_AT): no play, the care path
//                                    'check' (score ≥ CHECK_AT): ask first ("Before we go on — are you okay right now?")
//                                    `history`: the visit's recent Tells (the last HISTORY are read; in memory only, never
//                                    stored), so "I'm so tired of everything" then "goodbye everyone" combines. A message with
//                                    no frame of its own never inherits anything from them.
//   SCREEN_LEVELS, CARE_AT, CHECK_AT, HISTORY, VERSION
//
// Pure ES module, no imports, no DOM, deterministic, cheap: each frame has a prefilter (a word its own words cannot do
// without) and reads only a window around it, and the last few Tells' readings are remembered (the visit's earlier Tells are
// read again with every keystroke). The server keeps a byte-identical copy (hushmallow/server/another-angle/src/safety/
// risk-screen.js, `npm run sync:screen`; its test fails while the two differ), so a client that skips its own check-in still
// meets the same reading there.

export const VERSION = 'risk-screen-2';
export const SCREEN_LEVELS = Object.freeze(['check', 'care']);
/** Calibrated on the dev set only (docs/integration/DECISIONS.md, "The risk screener"). */
export const CARE_AT = 6;
export const CHECK_AT = 3;
/** How many of the visit's earlier Tells are read for context. */
export const HISTORY = 3;
/** History frames count at this weight beside the current message's own. */
const HISTORY_WEIGHT = 1;

// ===================================================================================================== normalise --

/**
 * The closed key vocabulary: the words the frames hang on (and the grief rules' commonest ones). Fuzzy correction only ever
 * lands on one of these, and only from a token that starts with the same letter.
 */
const KEY = `die dies died dying dead death kill kills killed killing myself suicide suicidal overdose overdosed unalive end ending
  life alive living exist existing disappear vanish forever wake sleep gone peace goodbye goodbyes farewell final message
  letter letters passwords forgive sorry everything everyone everybody burden without pointless nothing anymore trapped
  worthless useless hopeless tired exhausted hate enough tonight tomorrow today soon decided ready planned planning pill pills
  tablets meds medication medicine insulin paracetamol painkillers rope noose hang hanging hanged bridge train tracks cliff
  jump jumping blade blades razor razors cutting wrist wrists exhaust drown drowning counted saved saving stockpiled
  stockpiling hoarded hoarding swallow swallowed anybody anyone nobody happier easier breathing want wanted wanna gonna wanting
  himself herself themselves passed heaven follow join husband grandma grandad grandpa lethal should would could`.split(/\s+/).filter(Boolean);
const VOCAB = new Set(KEY);
/**
 * Ordinary words within a key word's reach (same first letter, the distance below) that must never be "corrected" into it:
 * worked out from the product's own English (docs, content, prompts: never the tests, which misspell on purpose) and read by
 * hand. Words outside a key word's reach need no entry ("my wife" can never become "my life": the first letters differ;
 * "like" and "have" are four letters, where only a dropped, added or swapped letter is read as a slip).
 */
const PROTECTED = new Set(`alike blame breaking bride casting coating counter counters counting country curling curving decades
  decide decides decoded defined depth derived desired divided doing down drawing drawn dread dried dropping drying dyeing dyed
  easter editing exciting exit exiting exits fallow fellow finale forgave granted handed handling hanger happily haven heading
  hearing hinting hogging holding homeless insulting insults joint judging latter liking litter lottery massage noise nose
  noticing overcome pace parsed passes paused peach piles place placing planner planting plating playing pointers pulls read
  reads reedy save saves saying scallop seep shallow shaving sheep sleek sleepy spoon steep sweep tables tabletop tapped targets
  tied timed traces trail trait tricks tried tripped unlived waited waiting walking warning washing wasted wasting winning
  writing lied lies diet dine dice kiln kilt dial deal dear dean deed hear heard heat have hope world cold shouldn couldn wouldn
  shoulder shout`.split(/\s+/).filter(Boolean));
// (the key words themselves are never corrected: VOCAB is checked first)

/** Texting and slang, always read this way (whole tokens). */
const TEXTING = Object.freeze({
  u: 'you', ur: 'your', ure: "you're", urself: 'yourself', yall: 'you all', im: "i'm", ive: "i've", cant: "can't", cnt: "can't",
  dont: "don't", dnt: "don't", wont: "won't", didnt: "didn't", doesnt: "doesn't", isnt: "isn't", wasnt: "wasn't", wouldnt: "wouldn't",
  couldnt: "couldn't", shouldnt: "shouldn't", havent: "haven't", hasnt: "hasn't", arent: "aren't", werent: "weren't",
  youre: "you're", youll: "you'll", youve: "you've", theyre: "they're", theyll: "they'll", thats: "that's", whats: "what's",
  theres: "there's", wanna: 'want to', wana: 'want to', wnna: 'want to', gonna: 'going to', gna: 'going to', gunna: 'going to',
  gotta: 'got to', imma: "i'm going to", ima: "i'm going to", tryna: 'trying to', finna: 'going to', idk: "i don't know",
  idc: "i don't care", tbh: 'to be honest', ngl: 'not going to lie', rn: 'right now', bc: 'because', bcuz: 'because',
  bcoz: 'because', bcs: 'because', cuz: 'because', coz: 'because', cos: 'because', b4: 'before', '2nite': 'tonight',
  '2night': 'tonight', '2nyt': 'tonight', tonite: 'tonight', '2day': 'today', '2moro': 'tomorrow', '2morrow': 'tomorrow',
  '2mrw': 'tomorrow', tmrw: 'tomorrow', tmr: 'tomorrow', tmrow: 'tomorrow', l8r: 'later', pls: 'please', plz: 'please',
  thx: 'thanks', thnx: 'thanks', thanx: 'thanks', ty: 'thank you', tysm: 'thank you so much', ily: 'i love you',
  ilysm: 'i love you so much', luv: 'love', ppl: 'people', every1: 'everyone', evry1: 'everyone', any1: 'anyone',
  some1: 'someone', no1: 'no one', nite: 'night', msg: 'message', txt: 'text', sry: 'sorry', srry: 'sorry', soz: 'sorry',
  gbye: 'goodbye', goodby: 'goodbye', cya: 'see you', lyf: 'life', lyfe: 'life', kms: 'kill myself', kys: 'kill yourself',
  sewerslide: 'suicide', '4ever': 'forever', '4eva': 'forever', foreva: 'forever', noo: 'no', soo: 'so', fr: 'for real',
  abt: 'about', wnt: 'want', jus: 'just', jst: 'just', nd: 'and', wat: 'what', wut: 'what', dunno: "don't know",
  lemme: 'let me', gimme: 'give me', outta: 'out of', kinda: 'kind of', sorta: 'sort of', ded: 'dead', kil: 'kill',
  wiht: 'with', wtih: 'with', whith: 'with', wih: 'with', ded2: 'dead too',
});
/** "ill" after these is the adjective (I feel ill), never "I'll". */
const ILL_PREV = new Set(`feel feeling felt feels am i'm im was is are were be been being so very really quite too bit look looks
  looked mentally terminally seriously critically chronically gravely got get gets getting fall fell falling become became the an
  makes made make sick of fairly pretty bit slightly`.split(/\s+/));
const ILL_NEXT = new Set(['health', 'will', 'with', 'from', 'effects', 'patients', 'people', 'person', 'at', 'treated', 'advised']);
const ID_PREV = new Set(['my', 'your', 'his', 'her', 'their', 'our', 'the', 'an', 'photo', 'student', 'no', 'with', 'show', 'need', 'lost', 'check', 'caller', 'user']);
/** After these, "2" is "to" (wanna 2 die); at a clause end it is "too" (gone 2). */
const TO_NEXT = new Set(`be die go end kill sleep live leave see do get have join follow stay wake take make hurt disappear
  stop exist`.split(/\s+/));
/** "dye" or "di" after these, with no object after, is "die". */
const DIE_PREV = new Set(['to', 'wanna', 'gonna', 'just', 'will', "i'll", 'ill', 'and', 'i', 'should', 'could', 'would', 'might', 'gotta', 'wana', 'wnna', 'shall', 'must', 'or']);
const DYE_OBJECT = new Set(`my her his their your our it them the a an this that these those some hair purple pink blue red
  black green yellow orange brown blonde grey gray silver white ginger fringe roots beard eyebrows`.split(/\s+/));
/** "b" after these is "be" (wanna b w her); "w" after "be" is "with". */
const B_PREV = new Set(['to', 'wanna', 'gonna', 'will', 'ill', "i'll", 'could', 'would', 'just', "can't", 'cant', "won't", 'wont', 'gotta', 'wana', 'should', 'might', 'must']);

// (fix round, security finding 1) Hangul fillers (U+115F, U+1160, U+3164, U+FFA0) draw as blanks: read like the zero-width
// characters (inside a key word they hide it, elsewhere they are a space)
const ZW = /[​-‏⁠-⁤﻿­᠎ᅟᅠㅤﾠ]/g;
/**
 * Characters that never show and only ever hide a word: Unicode tag characters (U+E0000–E007F), variation selectors
 * (U+FE00–FE0F, U+E0100–E01EF), bidi controls (U+200E–200F, U+202A–202E, U+2066–2069, U+061C) and the grapheme joiner
 * (U+034F). Always dropped, so the letters either side join. (Reversed text is out of scope: the controls go, the order stays.)
 */
const INVISIBLE = /[\u{E0000}-\u{E007F}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}‎‏‪-‮⁦-⁩؜͏]/gu;
/**
 * Letters that look like a Latin one (lower case, after NFKD: fullwidth and mathematical letters are already plain there):
 * Cyrillic and Greek lookalikes, Latin small capitals and IPA letters. A run of letters is folded only when every letter in
 * it outside a–z is one of these ("kіll" with a Cyrillic і), so a word of real Cyrillic or Greek is left as it is (other
 * languages are out of scope).
 */
const CONFUSABLE = Object.freeze({
  'а': 'a', 'в': 'b', 'г': 'r', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'п': 'n', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y',
  'х': 'x', 'ь': 'b', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'һ': 'h', 'ӏ': 'l', 'ԛ': 'q', 'ԝ': 'w', 'ү': 'y', 'ҳ': 'x',
  'α': 'a', 'β': 'b', 'γ': 'y', 'ε': 'e', 'η': 'n', 'ι': 'i', 'κ': 'k', 'μ': 'u', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'σ': 'o',
  'τ': 't', 'υ': 'u', 'χ': 'x', 'ω': 'w',
  'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f', 'ɢ': 'g', 'ʜ': 'h', 'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l',
  'ᴍ': 'm', 'ɴ': 'n', 'ᴏ': 'o', 'ᴘ': 'p', 'ꞯ': 'q', 'ʀ': 'r', 'ꜱ': 's', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'ʏ': 'y', 'ᴢ': 'z',
  'ɑ': 'a', 'ɡ': 'g', 'ı': 'i', 'ɩ': 'i', 'ɒ': 'a', 'ʋ': 'u',
});
const foldConfusables = (s) => s.replace(/\p{L}+/gu, (run) => {
  if (/^[a-z]+$/.test(run)) return run;
  let out = '';
  for (const ch of run) { if (ch >= 'a' && ch <= 'z') out += ch; else if (CONFUSABLE[ch]) out += CONFUSABLE[ch]; else return run; }
  return out;
});
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}︎️⃣]/gu;
const LEET = { 1: 'i', '!': 'i', '|': 'i', 3: 'e', 0: 'o', 4: 'a', '@': 'a', 5: 's', $: 's', 7: 't' };
const deleet = (s) => s.replace(/[1!|30@4$57]/g, (c) => LEET[c]);

/** Damerau–Levenshtein (optimal string alignment), stopping once past `max`. */
function dl(a, b, max) {
  const n = a.length, m = b.length;
  if (Math.abs(n - m) > max) return max + 1;
  let p2 = null, p1 = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= m; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(p1[j] + 1, row[j - 1] + 1, p1[j - 1] + c);
      if (p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
      row.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    p2 = p1; p1 = row;
  }
  return p1[m];
}
const BY_LEN = new Map();
for (const w of VOCAB) { if (!BY_LEN.has(w.length)) BY_LEN.set(w.length, []); BY_LEN.get(w.length).push(w); }
/** Two adjacent letters swapped (wnat, dide). */
function swapped(a, b) {
  if (a.length !== b.length) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i < a.length - 1 && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
}
const fuzzyCache = new Map();
/**
 * The one key word within reach of `w`, or null: the same first letter; Damerau–Levenshtein ≤ 1 for 4–6 letters (at four
 * letters only a dropped, added or swapped letter, never a changed one: "have" is not "hate") and ≤ 2 when both words have 7+;
 * never a word on the protected list, never a tie.
 */
function fuzzy(w) {
  if (fuzzyCache.has(w)) return fuzzyCache.get(w);
  let out = null;
  if (w.length >= 4 && /^[a-z]+$/.test(w) && !PROTECTED.has(w)) {
    let best = 9, tie = false;
    for (let L = w.length - 2; L <= w.length + 2; L++) {
      for (const k of BY_LEN.get(L) || []) {
        if (k.length < 4 || k[0] !== w[0]) continue;
        const max = Math.min(w.length, k.length) >= 7 ? 2 : 1;
        if (Math.abs(k.length - w.length) > max) continue;
        const d = dl(w, k, max);
        if (d > max) continue;
        if (d === 1 && w.length === 4 && k.length === 4 && !swapped(w, k)) continue;
        if (d < best) { best = d; out = k; tie = false; } else if (d === best && k !== out) tie = true;
      }
    }
    if (tie) out = null;
  }
  if (fuzzyCache.size > 5000) fuzzyCache.clear();
  fuzzyCache.set(w, out);
  return out;
}
/** A wildcard spelling (k*ll, su*cide): the one key word it fits. */
function wildcard(w) {
  if (!w.includes('*') || !/[a-z]/.test(w)) return null;
  const re = new RegExp(`^${w.replace(/[^a-z*]/g, '').replace(/\*+/g, (s) => `[a-z]{${s.length},${s.length + 1}}`)}$`);
  const hits = KEY.filter((k) => re.test(k));
  return new Set(hits).size === 1 ? hits[0] : null;
}

/**
 * Runs of 3+ single letters set apart by spaces, dots, dashes (hyphens, non-breaking hyphens, en and em dashes), slashes or
 * middle dots ("d i e", "k.i.l.l", "s-u-i-c-i-d-e", "k‑i‑l‑l", "k.m.s").
 */
const SPACED = /(?<![a-z0-9])[a-z](?:[ .\-_*/·•‐‑‒–—]{1,2}[a-z](?![a-z0-9])){2,}/g;
/** Small words a spaced run may hold beside its key words ("k i l l m y s e l f", "i w a n t t o d i e"). */
const RUN_WORDS = new Set('i a my me to it all the of am be so and is in on now want just will can not life end self'.split(' '));
const runWord = (w) => VOCAB.has(w) || RUN_WORDS.has(w) || Object.prototype.hasOwnProperty.call(TEXTING, w);
/** The run's letters as 2–5 words, each a key word, a texting word or a small word, at least one a key word of 3+ letters. */
function segmentRun(letters) {
  const n = letters.length;
  const best = Array(n + 1).fill(null);
  best[0] = [];
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(0, i - 12); j < i; j++) {
      if (!best[j]) continue;
      const w = letters.slice(j, i);
      if (!runWord(w)) continue;
      const cand = [...best[j], w];
      if (!best[i] || cand.length < best[i].length) best[i] = cand;
    }
  }
  const seg = best[n];
  return seg && seg.length >= 2 && seg.length <= 5 && seg.some((w) => w.length >= 3 && (VOCAB.has(w) || Object.prototype.hasOwnProperty.call(TEXTING, w))) ? seg : null;
}
function joinSpaced(s) {
  return s.replace(SPACED, (run) => {
    const letters = run.replace(/[^a-z]/g, '');
    // a key word, or a texting one ("k m s")
    const ok = (w) => VOCAB.has(w) || (w.length >= 3 && Object.prototype.hasOwnProperty.call(TEXTING, w) && /^k[my]s$/.test(w)) || (w.length >= 4 && fuzzy(w));
    if (ok(letters)) return letters;
    // a word before or after the run ("i d i e", "d i e i"): only the word's own letters join
    if (/^[iau]/.test(letters) && ok(letters.slice(1))) return `${letters[0]} ${letters.slice(1)}`;
    if (/[iau]$/.test(letters) && ok(letters.slice(0, -1))) return `${letters.slice(0, -1)} ${letters.at(-1)}`;
    // (fix round) both words spaced: "k i l l m y s e l f" → "kill myself"
    const seg = segmentRun(letters);
    return seg ? seg.join(' ') : run;
  });
}
/**
 * (fix round, security finding 1) A key word split by one space or line break ("ki ll myself", "sui\ncide"): joined only when
 * the two halves together are one of these and neither half is an ordinary small word or a key word itself.
 */
const SPLIT_KEYS = new Set(`kill killing killed myself suicide suicidal overdose overdosed unalive dead death dying pills tablets
  rope noose hanging blade blades razor razors cutting goodbye burden poison`.split(/\s+/));
const SPLIT_COMMON = new Set(`a i k u an am as at be by do go he if in is it me my no of on or so to up us we ok the and for all any
  one ever out with over ill you ur im its not dont can will die cut hang good bye`.split(/\s+/));
function joinSplit(s) {
  if (!/[a-z][ \n][a-z]/.test(s)) return s;
  const parts = s.split(/([ \n])/);
  const out = [parts[0]];
  for (let i = 1; i < parts.length; i += 2) {
    const a = out[out.length - 1], b = parts[i + 1] ?? '';
    if (/^[a-z]+$/.test(a) && /^[a-z]+$/.test(b) && SPLIT_KEYS.has(a + b) && !SPLIT_COMMON.has(a) && !SPLIT_COMMON.has(b) && !VOCAB.has(a) && !VOCAB.has(b)) out[out.length - 1] = a + b;
    else out.push(parts[i], b);
  }
  return out.join('');
}

/** One token's candidate spellings: as typed, repeated letters collapsed to two and to one, leet read. */
function spellings(core) {
  const out = [core];
  if (/([a-z])\1\1/.test(core)) out.push(core.replace(/([a-z])\1{2,}/g, '$1$1'), core.replace(/([a-z])\1{2,}/g, '$1'));
  if (/[a-z]/.test(core) && /[1!|30@4$57]/.test(core)) for (const v of [...out]) out.push(deleet(v));
  return [...new Set(out)];
}

/** The word, with its neighbours as context, in one spelling. */
function resolve(core, prev, next) {
  const vs = spellings(core);
  for (const v of vs) {
    if (v === 'ill') return !prev || (!ILL_PREV.has(prev) && !ILL_NEXT.has(next)) ? "i'll" : 'ill';
    if (v === 'id') return prev && ID_PREV.has(prev) ? 'id' : ['card', 'badge', 'number'].includes(next) ? 'id' : "i'd";
    if (v === '2') return prev && /^[a-z']+$/.test(prev) ? (next && spellings(next).some((x) => TO_NEXT.has(x)) ? 'to' : !next ? 'too' : '2') : '2';
    if (v === '4' && ['ever', 'good', 'real', 'now'].includes(next)) return 'for';
    if (v === 'b' && prev && B_PREV.has(prev)) return 'be';
    if (v === 'w' && (prev === 'b' || prev === 'be')) return 'with';
    if ((v === 'dye' || v === 'di' || v === 'dei' || v === 'dy') && (!prev || DIE_PREV.has(prev)) && !DYE_OBJECT.has(next)) return 'die';
    if (v === 'dei' || v === 'diie') return 'die';
    if (v === 'unalive') return next === 'myself' || next === 'my' ? 'kill' : 'die';
    if (v === 'unalived') return 'killed';
    if (Object.prototype.hasOwnProperty.call(TEXTING, v)) return TEXTING[v];
    if (VOCAB.has(v)) return v;
  }
  if (PROTECTED.has(core)) return core;
  for (const v of vs) if (PROTECTED.has(v)) return v;
  // a key word's plural or possessive is itself (grandmas, letters, pills): never "corrected" to the bare word
  for (const v of vs) if (/(?:s|es)$/.test(v) && (VOCAB.has(v.replace(/e?s$/, '')) || VOCAB.has(v.slice(0, -1)))) return v;
  const wc = wildcard(core);
  if (wc) return wc;
  for (const v of vs.slice().reverse()) { const f = fuzzy(v); if (f) return f; }
  return vs.length > 1 ? vs[1] : core;
}

/**
 * The words in one spelling, punctuation kept: lowercase, no accents, no zero-width characters, emoji as spaces, repeated
 * letters collapsed, leet read inside words, spaced letters joined, texting expanded, key words fuzzy-corrected.
 * @param {string} text @returns {string}
 */
export function normalise(text) {
  // (fix round, security finding 1) NFKD (fullwidth and mathematical letters become plain), then the invisible characters out,
  // every combining mark out (not only U+0300–036F), lower case, and the lookalike letters folded
  let s = String(text ?? '').slice(0, 2000).normalize('NFKD').replace(INVISIBLE, '').replace(/\p{M}/gu, '').toLowerCase();
  s = foldConfusables(s);
  // zero-width characters: inside a key word they are hiding it (d\u200bie), elsewhere they are a space
  s = s.replace(ZW, '\u0001').replace(/[a-z]+(?:\u0001+[a-z]+)+/g, (w) => { const j = w.replace(/\u0001/g, ''); return VOCAB.has(j) || fuzzy(j) ? j : w; })
    .replace(/\u0001+/g, ' ').replace(EMOJI, ' ').replace(/[‘’‛ʼ`´]/g, "'").replace(/[“”„‟]/g, '"');
  // 'w/o' is 'without'; 's/h' is self-harm's own abbreviation
  s = s.replace(/(?<![a-z0-9])w\/o(?![a-z0-9])/g, 'without').replace(/(?<![a-z0-9])s\/h(?=[^a-z0-9]|$)/g, 'sh');
  s = joinSplit(joinSpaced(s));
  // words (with leet and wildcard characters inside them) and what lies between
  const parts = s.split(/([a-z0-9@$*|!']+)/);
  const words = [];
  for (let i = 1; i < parts.length; i += 2) {
    const m = /^([!'|*]*)(.*?)([!'|*]*)$/.exec(parts[i]);
    let [, lead, core, trail] = m;
    // a wildcard or a leet mark inside a word belongs to it; at its edges it is punctuation (but k*ll's star is inside)
    if (!core) { core = parts[i]; lead = ''; trail = ''; }
    words.push({ i, lead, core, trail });
  }
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    const gapBefore = k > 0 ? parts[w.i - 1] : '';
    const gapAfter = k < words.length - 1 ? parts[w.i + 1] : '';
    // the neighbours, only inside the same clause
    const prev = k > 0 && !/[.!?;:,]/.test(gapBefore + words[k - 1].trail) ? String(words[k - 1].out ?? words[k - 1].core).split(' ').at(-1) : null;
    const next = k < words.length - 1 && !/[.!?;:,]/.test(gapAfter + w.trail) ? words[k + 1].core : null;
    w.out = /[a-z0-9]/.test(w.core) ? resolve(w.core, prev, next) : w.core;
    parts[w.i] = `${w.lead.replace(/[|*]/g, '')}${w.out}${w.trail.replace(/[|*]/g, '')}`;
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}

// ===================================================================================================== canonical --
// The frames read a canonical form of the normalised words: contractions written out ("won't" → "will not", "i'm" → "i am"),
// no apostrophes (possessives run on: "dog's" → "dogs"), sentence ends as " . " and clause breaks as " , ". A gap in a frame
// never crosses either.

const N_T = { ca: 'can', wo: 'will', sha: 'shall', ai: 'is', do: 'do', does: 'does', did: 'did', is: 'is', was: 'was', are: 'are',
  were: 'were', has: 'has', have: 'have', had: 'had', would: 'would', could: 'could', should: 'should', must: 'must', need: 'need', might: 'might' };
const IS_S = new Set(['he', 'she', 'it', 'that', 'there', 'what', 'who', 'where', 'here', 'how', 'everyone', 'everything', 'nobody', 'someone', 'something', 'nothing', 'life', 'this', 'one', 'everybody', 'somebody', 'noone', 'today', 'tonight', 'time']);
const CANON_WORD = Object.freeze({ cannot: 'can not', gonna: 'going to', wanna: 'want to', gotta: 'got to', its: 'it is', hes: 'he is', shes: 'she is',
  lets: 'let us', noone: 'no one', tonights: 'tonight is', todays: 'today is', id: 'id', youd: 'you would', theyd: 'they would', ok: 'okay', alright: 'okay' });
function canonWord(w) {
  if (CANON_WORD[w]) return CANON_WORD[w];
  let m;
  if ((m = /^([a-z]+)n'?t$/.exec(w)) && N_T[m[1]]) return `${N_T[m[1]]} not`;
  if (w === "can't" || w === 'cant') return 'can not';
  if ((m = /^([a-z]+)'re$/.exec(w))) return `${m[1]} are`;
  if ((m = /^([a-z]+)'ve$/.exec(w))) return `${m[1]} have`;
  if ((m = /^([a-z]+)'ll$/.exec(w))) return `${m[1]} will`;
  if ((m = /^([a-z]+)'d$/.exec(w))) return `${m[1]} would`;
  if ((m = /^([a-z]+)'m$/.exec(w))) return `${m[1]} am`;
  if ((m = /^([a-z]+)'s$/.exec(w))) return IS_S.has(m[1]) ? `${m[1]} is` : `${m[1]}s`;
  return w.replace(/'/g, '');
}
/** After "i'd", these mean "had": "i'd died", "i'd been", "i'd gone". */
const HAD_NEXT = new Set(['died', 'been', 'gone', 'done', 'had', 'taken', 'left', 'known', 'seen', 'never', 'already', 'just', 'thought', 'tried', 'wanted', 'hoped', 'forgotten', 'lost', 'made', 'got']);
/** @param {string} norm the normalised words @returns {string} " i am done . tonight i will end it . " */
export function canonical(norm) {
  const s = String(norm ?? '')
    .replace(/\.{2,}|…|[.!?]+|\n+/g, ' . ')
    .replace(/[,;:()[\]{}"]|\s[-–—]+\s|[–—]+/g, ' , ')
    .replace(/[^a-z0-9'., ]+/g, ' ');
  const raw = s.split(/\s+/).filter(Boolean);
  const toks = raw.flatMap((t, i) => {
    if (t === '.' || t === ',') return [t];
    const w = t.replace(/^'+|'+$/g, '');
    if (/^[a-z]+'d$/.test(w) && HAD_NEXT.has(raw[i + 1])) return [w.slice(0, -2), 'had'];
    return canonWord(w).split(' ');
  }).filter(Boolean);
  // no doubled breaks
  const out = [];
  for (const t of toks) { if ((t === '.' || t === ',') && (!out.length || out.at(-1) === '.' || out.at(-1) === ',')) { if (t === '.' && out.length) out[out.length - 1] = '.'; continue; } out.push(t); }
  while (out.length && (out.at(-1) === '.' || out.at(-1) === ',')) out.pop();
  return ` ${out.join(' ')} . `;
}

// ======================================================================================================== frames --
// A frame is a MEANING with slots, matched over the canonical words: { id, cat, w, re }. Its slots are word classes (the self,
// a wish or plan, an ending, a means, a farewell …) joined by windows that never cross a clause break. Each match then meets
//   - its idiom guard: the words do not mean the frame at all ("dying to see", "end it with him", "gone for a week",
//     "pills for the week into the organiser") — the match is dropped;
//   - negation: a "not" / "never" before the wish in its own clause ("i do not want to die") drops it; a frame whose words
//     are themselves a negation ("i will not wake up") keeps it;
//   - weak everyday bounds in its sentence ("see you Monday", "at work", "my train is here", "the project", "this level"): the
//     frame is dampened (× DAMPEN), never below the check-in for the self ending or a means held by the self;
//   - overlap: where two frames read the same words, only the heavier counts.

const F = String.raw;
/** A gap of up to n words in one clause, never another "i" (so a frame starts at the nearest subject). */
const G = (n) => F`(?:(?!i )[a-z0-9]+ ){0,${n}}`;
/** Fillers between a wish and its verb ("want to just die", "going to actually end it"). */
const ADV = F`(?:(?:just|really|actually|literally|honestly|seriously|simply|kind of|sort of|so|finally|totally|quietly|peacefully|properly|fucking|bloody|like|already|truly|even|now|all|to|go|go and|be able to|try to|try and|rather|soon|probably|definitely|maybe|one day|eventually|someday|forever) ){0,3}`;
/** A gap after the self that never passes another subject ("i am scared my mum will die" is not the self's wish). */
const GS = (n) => F`(?:(?!(?:i|he|she|they|we|you|it|someone|somebody|everyone|everybody|people|nobody|my|his|her|their|our|your|the|mum|mom|dad|nan|gran|grandma|grandad|grandpa|brother|sister|son|daughter|husband|wife|partner|boyfriend|girlfriend|friend|baby|dog|cat) )[a-z0-9]+ ){0,${n}}`;
const SELF = F`\bi `;
/** Sentence start: an elided subject ("want to die.", "going to end it tonight"). */
const START = F`(?:^ |[.,] )`;
/** Wishes, intentions and plans before a verb of ending. */
const MOD = F`(?:want is|need is|want|wanted|wanting|wants|wish|wished|wishing|need|needed|would like|would love|would rather|rather|hope|hoping|pray|praying|long|longing|deserve|ready|am ready|tempted|desperate|am going|going|gonna|plan|planning|planned|plan on|decided|have decided|deciding|am about|about|trying|intend|intending|mean|meant|choose|chose|feel like|will|would|shall|should|must|have got|got|has to|have to|could just|might just|may as well|might as well|keep wanting|just want|only want|can not wait)`;
const PAST_TRY = F`(?:tried|attempted|have tried|have attempted|was going|was about|was planning|was ready|came close)`;
const IDEATE = F`(?:think|thinking|thought|keep thinking|thoughts|dream|dreaming|dreamt|dreamed|fantasi[sz]e|fantasi[sz]ing|obsess|obsessing|obsessed|wonder|wondering|picture|picturing|imagine|imagining|consider|considering|contemplate|contemplating|research|researching|google|googled|googling|look up|looking up|looked up|search|searching|searched|planning|planned)`;
/** Family and pets (never friends or mates: being with them is everyday). */
const KIN = F`(?:mum|mom|mam|mother|dad|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|son|daughter|baby|husband|wife|partner|fiance|fiancee|uncle|aunt|auntie|twin|dog|cat|boy|girl)`;
const PERSON = F`(?:mum|mom|mam|mummy|mother|dad|daddy|father|nan|nana|nanna|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|son|daughter|baby|husband|wife|partner|boyfriend|girlfriend|fiance|fiancee|friend|best friend|uncle|aunt|auntie|cousin|dog|cat|boy|girl|twin|grandson|granddaughter|mate|bestie)`;

// the self ending, by strength: with a wish or a plan, END_STRONG is care on its own; END_MID and END_SOFT need company
const END_STRONG = F`die|be dead|kill myself|end my life|end my own life|take my life|take my own life|commit suicide|kill my self|unalive myself|off myself|top myself|end it all|end everything|end myself|hang myself|shoot myself|drown myself|poison myself|suffocate myself|overdose|od|stop living|not be alive|not exist|stop existing|cease to exist|never wake up|not wake up|go to sleep and not wake up|go to sleep and never wake up|sleep and never wake up|sleep and not wake up|disappear forever|disappear for good|be gone forever|be gone for good|leave this world|leave this earth|leave this life|leave this planet|stop my heart|slit my wrists|cut my wrists|throw myself (?:off|under|in front of|from)|step in front of (?:a|the) (?:train|bus|lorry|truck|car)|jump (?:off|from) (?:a|the|that|this) (?:bridge|roof|building|cliff|ledge|tower|balcony|car park|multi storey|window)|jump in front of (?:a|the) (?:train|bus|lorry|truck|car)|end it once and for all|meet my maker|not be alive anymore|be done with life|stop breathing`;
const END_MID = F`be gone|sleep forever|fall asleep forever|sleep for ever|go to sleep forever|rest forever|end it|end things|end this|end all this|not make it to|not see tomorrow|not see (?:christmas|my birthday|next year|the new year)|cross over|go away forever|leave forever|go forever|leave for good|go for good|waste away|not be here anymore|not be around anymore`;
const END_SOFT = F`disappear|vanish|check out|let go|give up|be free|stop everything|jump|just stop|rest`;
const END_GER_STRONG = F`dying|killing myself|ending my life|ending it all|taking my life|taking my own life|suicide|how to die|how to kill myself|not waking up|never waking up|overdosing|hanging myself|drowning myself|my own death|my death|my funeral|being dead|not existing|not being alive|ending it|ending things|disappearing forever|jumping off|jumping in front|throwing myself|slitting my wrists|cutting my wrists|driving into|driving off|crashing my car|walking into the (?:sea|river|water)|stepping in front`;
const END_GER_SOFT = F`death|disappearing|not being here|not being around|leaving forever|going to sleep forever|sleeping forever|giving up|letting go`;

// idioms that are not the self ending at all
const END_IDIOM = new RegExp([
  F`\b(?:die|dies|died|dying|dead|kill|killing|killed) (?:of |from )?(?:laughing|laughter|embarrassment|shame|boredom|cringe|thirst|hunger|heat|cold|curiosity|jealousy|envy|happiness|excitement|old age|natural causes)\b`,
  F`\bdying (?:to|for) (?:see|know|meet|try|go|get|hear|tell|watch|eat|have|read|play|visit|find|a|some|the|this|that|those)\b`,
  F`\bdie for (?:a|an|some|this|that|those|these|the)\b`, F`\b(?:would|had|id|i would) (?:rather|sooner) (?:die|be dead) than\b`, F`\b(?:would|had|i would|i had) (?:much )?(?:rather|sooner) (?:[a-z]+ ){1,8}than\b`,
  F`\bdead (?:lol|lmao|haha|hahaha|tired|beat|on my feet|meat|serious|set|right|easy|good|funny|cute|ass|centre|center|end|line|lines|weight|battery|phone|zone|heat|calm|quiet|still|wrong|last|even|ringer)\b`,
  F`\b(?:die|dead|dying|kill myself|died) (?:lol|lmao|haha|hahaha|jk|xd)\b`, F`\b(?:lol|lmao|haha) (?:i want to|i will|i am going to) (?:die|kill myself)\b`,
  F`\b(?:die|dead) (?:if|when) (?:he|she|they|anyone|someone|somebody|my|mum|mom|dad|you|people|everyone) ${G(1)}(?:(?:see|sees|saw) me|(?:find|finds|found) out|(?:hear|hears|heard) about|knows?|says?|asks?|calls?|gets? home)\b`,
  F`\bkill(?:ed|ing)? (?:it|that|this) (?:at|on|in|today|tonight|last)\b`,
  F`\b(?:end|ending|ended|ends) (?:it|things|this|stuff) (?:off )?(?:with|between)\b`, F`\bend (?:this|the) (?:call|meeting|conversation|chat|game|essay|day|week|month|year|lesson|session|stream|relationship|friendship|contract|lease|subscription|thread|story|chapter)\b`,
  F`\b(?:disappear|vanish) (?:under|into|in|for (?:a|the) (?:bit|while|day|week|weekend|night|few|month|summer)|for a bit|for a while|for the weekend|on holiday|off (?:social|the grid|grid|the internet|insta|twitter)|from social media)\b`,
  F`\b(?:could|can) sleep forever\b`, F`\bsleep forever (?:after|this|on|tonight after|on (?:sunday|saturday))\b`, F`\b(?:stop existing|not exist) (?:on|online|in the|for a (?:bit|while))\b`,
  F`\bbe free (?:on|at|after|from|this|next|tomorrow|tonight|later|in|for|to)\b`, F`\bgive up (?:on (?:this|the|that|my (?:diet|plan|essay|homework|project))|chocolate|sugar|smoking|drinking|meat|caffeine|coffee|alcohol|for lent)\b`,
  F`\bcheck out (?:the|this|that|my|at|of|time|tomorrow)\b`, F`\blet go (?:of|off)\b`, F`\bjump (?:in|into|on|onto) (?:the|a)\b`,
  F`\b(?:die|dead) (?:one day|someday|some day|eventually|of old age|when i am old|in my sleep|peacefully)\b`,
  F`\bnot wake up (?:tomorrow |in the morning |on time )?(?:until|till|before|in time|early|on time|for|at|unless|without|if)\b`,
  F`\bgone by the time (?:you|we|they|he|she|mum|dad) (?:get|gets|come|comes|are|is|wake|wakes)\b`,
  F`\bgone (?:to|for|on|out|home|away|back|abroad|shopping|travelling|traveling|camping|from(?! this world| this earth| existence| everything| here forever)|with|over|into|up|down|off|all|most|until|till|before you wake|before anyone wakes|when you get back|a week|a few|the whole|tomorrow|today|for the|about|till about|until about)\b`,
  F`\b(?:die|dies|died|dying) (?:my|her|his|their|your|our|it) (?:hair|fringe|roots|beard|eyebrows|purple|pink|blue|red|black|green)\b|\bdie (?:it|them) (?:purple|pink|blue|red|black|green|blonde)\b`,
  F`\bnot make it to (?:the|class|school|work|uni|college|lunch|dinner|your|his|her|their|practice|training)\b`, F`\brest (?:of|for a|up|my|a bit|now|your)\b`,
  F`\bcross over (?:the|to the other side of)\b`, F`\bend (?:it|things) on a (?:good|high|positive) note\b`, F`\bnot be (?:here|around) (?:at|for|when|until|till|on|this|tomorrow (?:morning|afternoon|evening))\b`,
].join('|'));

const FRAMES = [];
/** Is someone else's death named anywhere in the words (the DEATH family's frame, compiled once it exists)? */
let DEATH_ANY = /$^/;
/**
 * Every "not followed by" in a frame ends on a word boundary: "(?! for (?:the|a))" must not refuse "for anyone" because it
 * starts with "a".
 */
function bounded(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const at = src.indexOf('(?! ', i);
    if (at < 0) { out += src.slice(i); break; }
    let depth = 0, j = at;
    for (; j < src.length; j++) {
      if (src[j] === '\\') { j++; continue; }
      if (src[j] === '(') depth++;
      else if (src[j] === ')' && --depth === 0) break;
    }
    const body = src.slice(at, j);
    out += `${src.slice(i, at)}(?! ${bounded(body.slice(4))}${body.endsWith('\\b') ? '' : '\\b'})`;
    i = j + 1;
  }
  return out;
}
/**
 * opts: neg — a negation in its clause before it (or in its own `pre` group) drops it; self — weight capped at 2 without a
 * first person in its sentence; guard — a regex over its sentence that drops it (the words mean something else).
 */
/**
 * A prefilter that is a plain list of words or phrases (\b(?:a|b c|d)\b) is also kept as the set of their first words, so a
 * message with none of them is passed over before any pattern runs (a necessary condition: a phrase holds its first word).
 */
function keysOf(pre) {
  const m = /^\\b\(\?:([a-z |]+)\)\\b$/.exec(String(pre ?? ''));
  return m ? [...new Set(m[1].split('|').map((x) => x.split(' ')[0]).filter(Boolean))] : null;
}
const frame = (id, cat, w, src, opt = {}) => FRAMES.push({ id, cat, w, re: new RegExp(bounded(src), 'g'), ...opt,
  ...(opt.pre ? { pre: new RegExp(opt.pre), preG: new RegExp(opt.pre, 'g'), keys: keysOf(opt.pre) } : {}), ...(opt.also ? { also: new RegExp(opt.also) } : {}) });
const WISH_HEAD = F`(?:${SELF}(?<pre>${GS(4)})|${START})(?<mod>${MOD}) (?:to )?(?<adv>${ADV})`;

// ---- END: the self ending -----------------------------------------------------------------------------------------
frame('end-wish', 'end', 6, F`${WISH_HEAD}(?:${END_STRONG})\b`, { pre: F`\b(?:${END_STRONG})\b`, neg: true });
frame('end-wish-mid', 'end', 4, F`${WISH_HEAD}(?:${END_MID})\b`, { pre: F`\b(?:${END_MID})\b`, neg: true });
frame('end-wish-soft', 'end', 3, F`${WISH_HEAD}(?:${END_SOFT})(?= [.,]| (?:forever|for good|now|tonight|today|soon|already|anymore|any more|from (?:this|it all|everything|life)|so (?:bad|much))\b)`, { pre: F`\b(?:${END_SOFT})\b`, neg: true });
frame('end-ideate', 'end', 6, F`${SELF}(?<pre>${GS(4)})${IDEATE} (?:about |of |up |on )?(?<adv>${ADV})(?:${END_GER_STRONG})\b`, { pre: F`\b(?:${END_GER_STRONG})\b`, neg: true });
frame('end-ideate-soft', 'end', 3, F`${SELF}(?<pre>${GS(4)})${IDEATE} (?:about |of |up |on )?(?<adv>${ADV})(?:${END_GER_SOFT})\b`, { pre: F`\b(?:${END_GER_SOFT})\b`, neg: true });
frame('end-tried', 'end', 4, F`${SELF}(?<pre>${GS(2)})${PAST_TRY} (?:to )?(?<adv>${ADV})(?:${END_STRONG})\b|${SELF}(?<pre2>${G(1)})(?:nearly|almost|tried to|attempted to) (?:killed myself|died|ended my life|took my life|overdosed|hanged myself|ended it)\b(?! (?:laughing|on|at|in|falling|tripping|slipping|with|by|driving|cycling|running|trying|when|from|of))`, { pre: F`\b(?:${PAST_TRY}|nearly|almost|tried to|attempted to)\b`, neg: true });
frame('end-future', 'end', 6, F`\b(?:i will|i would|i am going to|i shall|i will soon|i am gonna) (?<adv>${ADV})(?:be dead|die|not be alive|not wake up|never wake up|not make it through (?:the night|tonight|the week))\b`, { pre: F`\b(?:be dead|die|not be alive|not wake up|never wake up|not make it through)\b`, neg: true });
frame('end-future-gone', 'end', 4, F`\b(?:i will|i am going to|i shall|i would) (?<adv>${ADV})(?:be gone|be at peace|be out of (?:the picture|the way|your way|everyones way)|be too late|be over for me)\b`, { pre: F`\b(?:be gone|be at peace|be out of|be too late|be over for me)\b`, neg: true });
frame('end-state', 'end', 4, F`(?<!\b(?:when|once|after|if|before|time|since|that) )\bi am (?:already |long |finally |probably )?(?:gone|no longer here|not here anymore)\b(?= [.,]| (?:by|when|before|now|already|and|so)\b)`);
frame('end-cond', 'end', 3, F`\bif i (?:died|was dead|were dead|was gone|were gone|disappeared|vanished|killed myself|was not here|were not here|was not around|were not around|did not wake up|never woke up|was never born|had never been born|left forever|just died)\b`);
frame('suicidal', 'end', 6, F`\b(?:i am|i feel|i have been|feeling|been feeling|i get|i keep getting|i keep feeling|i was|i am getting) ${ADV}(?:so |very |really |quite |pretty |super |extremely )?suicidal\b|\bsuicidal (?:thoughts|feelings|ideation|urges|again|tonight|today|right now)\b|\bmy (?:suicide|suicide note)\b|\b(?:i|me) ${G(3)}(?:write|wrote|writing|written|left|leave|finished) ${G(1)}(?:a |my )?suicide note\b|\b(?:i have|i get|i keep having|i keep getting|having|i am having) ${G(2)}thoughts (?:of|about) (?:suicide|dying|death|killing myself|ending it|ending my life)\b`, { pre: F`\b(?:suicid[a-z]*|thoughts)\b`, neg: true });
frame('suicide-answer', 'end', 6, F`\b(?:suicide|dying|death|killing myself) is (?:the |my )?(?:only|best|answer|way out|only way|only option|only answer|easiest)\b|\b(?:only|best|easiest) (?:way out|option|answer|choice) (?:is|left is) (?:suicide|death|to die|dying|killing myself|to end it)\b`, { pre: F`\b(?:suicide|dying|death|killing myself|only|best|easiest)\b` });
frame('end-howto', 'end', 6, F`\bhow (?:to|do i|do you|can i|could i|would i|should i|would you|does one|easy is it to|hard is it to|painful is it to|long does it take to|long would it take to|quickly can you) ${G(3)}(?:die|kill myself|kill yourself|end my life|end it all|overdose|od|hang myself|hang yourself|drown yourself|drown myself|tie a noose|slit|suffocate|bleed out|commit suicide|suicide)\b|\b(?:is it|would it be|will it be) (?:painless|quick|easy|peaceful|possible|painful|hard) to (?:die|drown|hang|overdose|od|bleed out|suffocate|kill yourself|kill myself)\b`, { pre: F`\b(?:how|is it|would it be|will it be)\b` });
frame('it-over', 'end', 2, F`\b(?:it|this|everything|all of this|all this|it all|this all) (?:will|is going to|would|shall) ${ADV}(?:all )?be (?:over|too late)\b(?! (?:by|after|at|in|on|before|once|when|soon enough|tomorrow afternoon|for (?:the|this|today)))`, { pre: F`\bbe (?:over|too late)\b` });
frame('not-live', 'end', 6, F`${SELF}${G(3)}(?:do not|did not|no longer|never|really do not|honestly do not|just do not|can not|am not|will not) ${ADV}(?:want|wanna|wish|feel like|have (?:a|any) reason to|have the strength to|have the energy to|think i can|think i will|deserve) (?:to )?${ADV}(?:live|living|be alive|being alive|exist|existing|keep living|stay alive|be on this earth|be in this world)\b(?! (?:in|at|with|near|there|here|abroad|together|on my own|alone|next|like that|without (?:wifi|internet|my phone)))`, { pre: F`\b(?:live|living|alive|exist|existing)\b` });
frame('stopped-wanting', 'end', 5, F`${SELF}${G(2)}(?:stopped|have stopped|no longer|do not even) (?:wanting|want) to (?:live|be alive|exist|be here|carry on|go on)\b`);
frame('not-here', 'end', 4, F`${SELF}${G(3)}(?:do not|did not|no longer|never|really do not|honestly do not|just do not|can not|am not) ${ADV}(?:want|wanna|wish|feel like|see (?:the|any) point in|see a reason to|see myself|see a future|have (?:a|any) reason to|deserve) (?:to )?${ADV}(?:be here|being here|be around|wake up|waking up|see tomorrow|make it to|making it to|survive|go on|going on|carry on|keep going|continue|last much longer|be part of this world|stay|try anymore|keep trying|be anywhere|exist anymore)\b(?! (?:at|for|when|with|today|tonight|in this|on this|this weekend|early|so early|until|till|before|in time|on time|in the morning|tomorrow morning|the party|at the party|on this team|in this job|in this house|in this flat|in this town))`, { pre: F`\b(?:here|around|wake|waking|tomorrow|make it|making it|survive|go on|going on|carry on|keep going|continue|last|world|stay|try|trying|anywhere|exist)\b` });
frame('wish-gone', 'end', 4, F`${SELF}${G(2)}(?:wish|wished) i (?:was|were|had) (?:never|not) (?:been )?born\b|${SELF}${G(2)}(?:wish|wished) i (?:was|were|could be) (?:dead|gone|not here|not alive|never here|asleep forever)\b(?! (?:to|for|on|out|home|already (?:home|there)))`);
// with no wish or plan word: the self's own reflexive ending ("kill myself tonight"), or a present-tense ending with its time
const END_REFLEX = F`kill myself|end my life|end my own life|take my life|take my own life|hang myself|shoot myself|drown myself|poison myself|overdose|unalive myself|off myself|top myself|commit suicide|kill my self|slit my wrists`;
frame('end-bare', 'end', 5, F`(?:${SELF}(?<pre>${G(2)})|${START})(?:${END_REFLEX})\b(?! (?:for (?:forgetting|being|not|doing|saying|missing|losing|that|this|it)|over (?:this|that|it)|if (?:i|he|she|they|you|my)|laughing))`, { pre: F`\b(?:${END_REFLEX})\b`, neg: true });
const NOW_W = F`(?:tonight|today|now|soon|tomorrow|this weekend|at midnight|once and for all|by morning|this week)`;
frame('end-present', 'end', 4, F`${SELF}(?<adv>${ADV})(?:end it|end things|end everything|end it all|die|end my life|leave this world)(?= [.,])`, { pre: F`\b(?:end|die|leave this world)\b`, neg: true });
frame('end-present-timed', 'end', 6, F`${SELF}(?<adv>${ADV})(?:die|end my life|kill myself|leave this world|end it all) ${NOW_W}\b|\b${NOW_W} ${G(1)}i ${ADV}(?:die|end my life|kill myself|leave this world|end it all|go to sleep forever)\b`, { pre: F`\b(?:die|end my life|kill myself|leave this world|end it all|go to sleep forever)\b`, neg: true });
frame('end-present-timed-mid', 'end', 5, F`${SELF}(?<adv>${ADV})(?:end it|end things|end everything) ${NOW_W}\b|\b${NOW_W} ${G(1)}i ${ADV}(?:end it|end things|end everything)\b`, { pre: F`\b(?:end it|end things|end everything)\b`, neg: true });
frame('end-leaving', 'end', 4, F`\bi am (?:leaving|going|going away|disappearing|checking out) (?:forever|for good|for ever|this world|this life)\b`, { neg: true });
frame('end-ready-go', 'end', 2, F`\bi am (?:so |finally |now )?ready to (?:go|leave|die|be with (?:him|her|them)|join (?:him|her|them))(?= [.,]| now\b)`, { guard: /\b(?:coat|taxi|car|uber|when you are|home|out|shops|school|work|are you|nearly done|lift|bus|train|airport|party|outside)\b/ });
// joining someone gone: a reunion with the dead, or to come (the grief rules read it beside a death named)
const AFTER = F`(?:up there(?! (?:on|at|in|by|with|near|for))|in heaven|on the other side(?! of)|in the ground|in the grave|in (?:his|her|their) grave|where (?:he|she|they) (?:went|is|are|has gone)|wherever (?:he|she|they) (?:went|is|are)|in the next life|in the afterlife|over the rainbow bridge)`;
const REUNION = F`(?:be with|join|joining|meet|meeting|see|seeing|follow|following|go to|go home to|go be with|be reunited with|rest beside|rest next to|lie (?:down )?(?:beside|next to|with)|cross over to|go where)`;
const REUNION_GUARD = /\b(?:good luck|mate|move|moving|exam|exams|surgery|op|operation|holiday|wedding|hill|stage|balcony|roof|top floor|loft)\b/;
frame('reunion-after', 'end', 6, F`${SELF}${G(3)}(?:${MOD}|will|am going to|am|shall) (?:to )?${ADV}${REUNION} ${G(2)}${AFTER}\b|\b(?:going|gonna) (?:to )?${ADV}${REUNION} ${G(2)}${AFTER}\b(?! of)`, { pre: AFTER, neg: true, guard: REUNION_GUARD });
frame('reunion-time', 'end', 3, F`${SELF}${G(3)}(?:${MOD}|will|am going to|shall) (?:to )?${ADV}(?:join|follow|be with|go be with|be joining|see|be seeing|go and see) (?:him|her|them|my ${KIN}|${KIN}) ${G(1)}(?:soon|tonight|very soon|today|now|i promise|on the anniversary|by the anniversary|on (?:his|her|their|our) (?:anniversary|birthday))\b(?! (?:,|\.)? (?:(?:his|her|their|the) (?:train|bus|flight|plane)|she is|he is|they are|when (?:she|he|they) (?:gets|get|comes|come)|at the|in the|after (?:school|work)|on (?:the|monday|friday)))|\b(?:going|gonna) (?:to )?(?:join|follow|meet|see) (?:my |him|her|them)${G(1)}(?:${KIN} )?(?:again )?(?:tonight|soon)\b`, { pre: F`\b(?:join|follow|be with|go be with|be joining|see|be seeing|go and see|meet)\b`, neg: true, family: 'reunion', guard: /\b(?:just went|went to (?:get|the)|tickets|shop|toilet|car park|bar|queue|picking me up|train|bus|flight|plane|be there in|on (?:his|her|my|their) way|at the (?:corner|shop|station)|after (?:school|work)|for (?:dinner|lunch|tea|drinks)|party|holiday|wedding|date|visit|visiting|cousin|baby cousin|boyfriend|girlfriend)\b/ });
// beside a death named (the DEATH family below), the self joining, following or going after the one who died; on their own
// these are longing ("i want to be with her"), and count for nothing
/** A pronoun for the one who died, with nothing after it that makes it someone else's ("her family", "him on his birthday"). */
const GONE_ONE = F`(?:him|her|them|u|you)(?= [.,]| (?:again|forever|for ever|for good|soon|now|tonight|today|too|up there|in heaven|so bad|so much|more than anything|already|wherever|properly|and i|but i|so i|i)\b)`;
frame('reunion-went', 'end', 5, F`\b(?:go|be|going|went) (?:to )?(?:where|wherever) (?:he|she|they) (?:went|is|are|has gone|have gone)\b(?! (?:buried|laid to rest|laid|resting|scattered|remembered|on the|at the|in the (?:garden|cemetery|churchyard|park)))|\b(?:be|lie|lay|rest|sleep|lie down) (?:down )?(?:in the (?:ground|grave)|in (?:his|her|their) grave|on (?:his|her|their|[a-z]+s) grave)\b(?: with (?:him|her|them))?(?! (?:to (?:talk|tell|read|sing|chat|visit|leave|put|lay flowers)|for (?:a while|an hour|a bit|his|her)|and (?:talk|cry|read|tell)))|${SELF}${G(2)}(?:want|wanna|need|would like|wish i could|am ready|am going) to (?:go|be) (?:too|there)(?= [.,])|\bgo the way (?:he|she|they) did\b|\b(?:cross over|go home|cross) to ${GONE_ONE}|\bi am coming(?: to (?:you|him|her|them))?(?= [.,]| (?:soon|now|tonight|son|mum|dad|my love)\b)`, { needsDeath: true, neg: true, guard: /\b(?:funeral|memorial|wake|service|army|school|work|house|party|choir|support group|family|cousins|kids|children|grew up|used to (?:live|walk|go))\b/ });
frame('reunion-bare', 'end', 3, F`${SELF}${G(3)}(?:${MOD}|will|am going to|shall|keep praying to|pray to|long to) (?:to )?${ADV}(?:be with|follow|folow|be reunited with|lie (?:down )?(?:beside|next to)|rest beside|rest next to|swap places with|take (?:his|her|their) place with) ${GONE_ONE}|\bwait for me(?= [.,]| (?:my love|up there|i am coming|darling)\b)|\b(?:i will|i would|i am going to|i shall) be (?:the )?next(?: one)?(?= [.,]| (?:to go|to die|soon)\b)|\b(?:it is|its|it will be) my turn(?= [.,]| (?:now|next|soon|tonight)\b)|\b(?:if|whether) i should (?:too|as well|do the same|do it too)\b|\bplanning (?:mine|my own)(?= [.,])|\bdoing it (?:in|at) the same (?:place|way|garage|room|spot|bridge)\b`, { needsDeath: true, neg: true, family: 'reunion' });
frame('end-let-me', 'end', 5, F`\b(?:let me|please let me|just let me) ${ADV}(?:die|be dead|go to (?:him|her|them|sleep forever)|not wake up)\b|\b(?:god|someone|something|death) (?:to )?(?:take|takes|took) me\b|\btake me (?:too|instead|now|home|with (?:you|him|her|them))\b|\b(?:better|happier|easier) (?:off )?dead\b|\b(?:wish|wished) (?:i had|i would have|it had been me|it was me) ${ADV}(?:died|been the one|gone instead|instead)\b|\bit should have been me\b|\b(?:hope|hoping|pray|praying) (?:that )?i (?:do not|never|will not|would not) (?:make it|wake up|see|last)\b|\b(?:pray|praying|hope|hoping|wish|wishing) (?:that )?(?:my heart|i) (?:just )?(?:stops|stop|gives out|gives up|would stop|will stop|stopped|stop breathing)\b(?! (?!breathing|beating)[a-z]+ing)|\b(?:want|wish|need|just want) (?:for )?my heart to (?:just )?stop\b(?! (?:hurting|aching|breaking|racing|pounding|feeling))|\band never get (?:up|back up)(?: again)?\b`, { pre: F`\b(?:let me|take|takes|took|better|happier|easier|wish|wished|should have been me|hope|hoping|pray|praying|heart|never get)\b`, neg: true });
frame('end-do-it', 'end', 3, F`${SELF}${G(2)}(?:going to|gonna|will|want to|am ready to|ready to|am about to|about to|have to|need to) (?:just )?(?:do it|go through with it)\b(?= [.,]| (?:tonight|today|now|soon|this time|for real|i promise|properly)\b)`, { guard: /\b(?:homework|exam|test|essay|dishes|washing|laundry|presentation|interview|ask (?:her|him)|tell (?:her|him|them|mum|dad)|bungee|skydive|skydiving|marathon|tattoo|piercing|haircut|later|tomorrow morning)\b/, softByDeath: /\b(?:end|ending|ends|ended|finish|finishing|finishes|over|done|finished|stops)\b/ });
frame('end-leaving-soon', 'end', 2, F`\bi am (?:checking out|leaving|signing off|logging off) (?:soon|tonight|for good|forever|now)\b`, { needsDeath: true });
frame('see-other-side', 'end', 3, F`\bsee you (?:all )?on the other side\b(?! of)`);

// ---- MEANS: a method held by the self ---------------------------------------------------------------------------------
const DRUG = F`(?:pills|pill|tablets|tablet|meds|medication|medications|medicine|medicines|painkillers|paracetamol|tylenol|ibuprofen|aspirin|insulin|sleeping pills|antidepressants|prescriptions|prescription|codeine|morphine|oxycodone|oxy|benzos|benzo|diazepam|valium|xanax|anti depressants|heart pills|blood thinners|lithium|sertraline|citalopram|fluoxetine|co codamol|cocodamol|zopiclone|sleeping tablets)`;
const HOARD = F`(?:saved|saving|save|save up|saving up|saved up|stockpiled|stockpiling|stockpile|hoarded|hoarding|hoard|collected|collecting|stashed|stashing|hidden|hid|hiding|lined up|lining up|kept back|keeping back|put aside|putting aside|set aside|setting aside|enough|all of|all the|all my|the whole|whole (?:bottle|box|packet|pack|strip)|every last|bottles of|boxes of|packets of|a stash of|my stash|the rest of)`;
/** Pills for an ordinary purpose: never a means. */
const MEANS_PURPOSE = /\b(?:for the week|into (?:the|my|a) (?:organiser|organizer|pill box|pillbox|dosette|box)|in (?:the|my|a) (?:pill box|pillbox|organiser|organizer|dosette|cabinet|bathroom|cupboard)|like the doctor said|the doctor (?:said|told)|so i do not run out|so i will not run out|for (?:the|my|a|our) (?:trip|holiday|holidays|flight|week away|journey|travels|time away)|for travel|while i am away|pharmacy|pharmacist|chemist|prescription refill|repeat prescription|repeat (?:meds|medication|script)|for my (?:cold|headache|period|back)|the right dose|my dose)\b/;
frame('means-hoard', 'means', 5, F`\b${HOARD} ${G(4)}${DRUG}\b|\b${DRUG} ${G(5)}${HOARD}\b`, { pre: F`\b${DRUG}\b`, guard: MEANS_PURPOSE });
frame('means-count', 'means', 3, F`\b(?:counted|count|counting|counted out|counting out) ${G(3)}${DRUG}\b`, { pre: F`\b(?:counted|count|counting|counted out|counting out)\b`, guard: MEANS_PURPOSE });
frame('means-take-all', 'means', 6, F`\b(?:take|taking|took|swallow|swallowing|swallowed|down|downing|downed|neck|necked|have taken|just took|just taken) ${G(1)}(?:all|all of|the whole|whole|every|a whole|loads of|lots of|too many|a handful of|handfuls of|a bottle of|a box of|a packet of|twenty|thirty|forty|fifty|a hundred|[0-9]{2,}) ${G(2)}${DRUG}\b|${SELF}${G(3)}(?:overdose|overdosed|overdosing|od|odd|oded|am overdosing)\b|\b(?:an|a) overdose\b`, { pre: F`\b(?:take|taking|took|swallow|swallowing|swallowed|down|downing|downed|neck|necked|taken|overdose|overdosed|overdosing|od|odd|oded)\b`, neg: true });
frame('means-take-rest', 'means', 4, F`\b(?:take|taking|use|using|have|swallow) (?:the rest of|what is left of|all of|whatever is left of) (?:his|her|their|dads|mums) (?:stuff|pills|meds|tablets|drugs|gear|medicine|medication|prescription)\b`, { pre: F`\b(?:the rest of|what is left of|all of|whatever is left of)\b` });
frame('means-howmany', 'means', 6, F`\bhow (?:many|much) ${G(2)}${DRUG} ${G(4)}(?:would|will|does|do|to|is|are|it) ${G(2)}(?:take|kill|be lethal|be fatal|be enough|lethal|fatal|enough|overdose|die)\b|\b(?:what happens if|what if) (?:you|i|someone) (?:take|took|swallow|swallowed) ${G(2)}(?:all|loads|lots|a lot|too many|[0-9]{2,}|twenty|thirty|fifty|a bottle|a box|the whole) ${G(2)}${DRUG}\b|\b(?:lethal|fatal) (?:dose|amount)\b`, { pre: F`\b(?:how many|how much|what happens if|what if|lethal|fatal)\b` });
frame('means-stop-meds', 'means', 3, F`${SELF}${G(3)}(?:stopped|stop|quit|have stopped|have quit|am not|not been|have not been|refuse to keep|will not keep) ${ADV}(?:taking|having|using|injecting) ${G(1)}(?:insulin|meds|medication|medicine|tablets|pills|antidepressants|heart pills|blood thinners|lithium)\b(?! (?:because|since|as|after|when) (?:they|it|the doctor|my doctor|of))`, { pre: F`\b(?:insulin|meds|medication|medicine|tablets|pills|antidepressants|blood thinners|lithium)\b` });
frame('means-method-decided', 'means', 3, F`${SELF}${G(2)}(?:have decided how|decided how|have worked out how|worked out how|know how i will|know how i am going to|know where i will|know where i am going to)\b|${SELF}${G(1)}know (?:how|where|when)(?= [.,])|${SELF}${G(1)}know (?:how|where) (?:to do it|i will do it|i am going to do it|i will go)\b`);
frame('means-on-purpose', 'means', 2, F`\b(?:on purpose|deliberately|so that it stops|so it will all stop|to see what happens|so i can be with)\b`);
frame('means-ligature', 'means', 5, F`\b(?:tie|tied|tying|make|made|making|bought|buy|buying|got|have|get) ${G(2)}(?:a |the )?noose\b|\bnoose\b|\b(?:rope|belt|cord|cable|ligature|scarf|dressing gown cord) ${G(4)}(?:round|around|to) (?:my|the) (?:neck|beam|ceiling|loft hatch|banister|bannister|door)\b|\b(?:hang|hanging|hung) (?:myself|from (?:the|a) (?:beam|ceiling|banister|bannister|tree|door|loft))\b|\bstrong enough to (?:hold|take) (?:me|my weight)\b`, { pre: F`\b(?:noose|rope|belt|cord|cable|ligature|scarf|hang|hanging|hung|strong enough)\b` });
frame('means-rope', 'means', 3, F`${SELF}${G(2)}(?:bought|got|have|ordered|found) ${G(1)}(?:a |some |the )?(?:rope|belt|cord|cable|ligature)\b`, { pre: F`\b(?:rope|belt|cord|cable|ligature)\b`, guard: /\b(?:tent|camping|climbing|boat|swing|washing line|garden|craft|crafts|skipping|dog|lead|trousers|jeans|dress|outfit|bag|parcel|delivery|tie down|tow|luggage|hammock|gym|yoga)\b/ });
const HIGH = F`(?:bridge|roof|rooftop|ledge|cliff|cliffs|cliff edge|edge|platform|platform edge|tracks|track|railway|railway line|train line|trains|motorway|tower|tower block|car park|multi storey|balcony|top floor|sea|river|canal|lake|reservoir|traffic|oncoming traffic|quarry|dam|viaduct|overpass|flyover|parapet)`;
frame('means-height', 'means', 4, F`${SELF}${G(2)}(?:keep|kept|have been|been|keep going|keep walking|keep driving|keep looking|keep staring) ${G(1)}(?:going|walking|driving|looking|staring|standing|sitting|thinking about|hovering|lingering|stood|sat|leaning)? ?(?:on|at|near|over|off|onto|by|to|from|under|down at|out at|too close to|close to|on the edge of|at the edge of|over the edge of|the edge of|near the edge of) ${G(2)}${HIGH}\b(?! (?:station|stop|timetable|times|ticket|tickets|journey|was|is|got|will|to (?:work|school|uni|town|london|see)|home|ride|trip|view|views|walk|path|cafe|pub|bar|restaurant|shop|at sunset|for (?:a|the) (?:photo|view|train|bus)))|${SELF}${G(2)}(?:am|was|have been|been|keep|kept) ${G(1)}(?:standing|sitting|stood|sat|hovering|leaning) ${G(1)}(?:on the edge of|at the edge of|over the edge of|near the edge of|on the wrong side of|on (?:the|a) (?:ledge|parapet|railing|railings)|too close to|right at the edge of)\b`, { pre: F`\b${HIGH}\b`, guard: /\b(?:fixing|repairing|cleaning|painting|working|gutter|aerial|satellite|tiles|photo|photos|view|views|sunset|sunrise|fireworks|waiting for (?:the|my|a) (?:train|bus))\b/ });
frame('means-height-act', 'means', 4, F`\b(?:jump|jumping|step|stepping|throw myself|throwing myself|lie|lying|walk|walking|run|running|fall|falling) (?:off|from|in front of|under|onto|into|in to|over|out into|out in front of) (?:a|the|that|this|my|oncoming|an) ?${G(1)}(?:bridge|roof|rooftop|ledge|cliff|building|tower|tower block|balcony|car park|multi storey|train|trains|tracks|railway|lorry|truck|bus|motorway|traffic|reservoir|quarry|viaduct|overpass)\b(?! (?:to (?:get|catch|see)|for (?:fun|a photo|a dare|charity)|at the (?:lido|pool)|in the summer))|\b(?:drive|driving|crash|crashing|steer|steering|swerve|swerving) ${G(1)}(?:my car |the car |it )?(?:into|off|in to|over) (?:a|the|that|this|oncoming|an) ?${G(1)}(?:wall|tree|lorry|truck|bus|river|sea|canal|lake|cliff|bridge|traffic|barrier|motorway|edge)\b|\bcrash(?:ing)? (?:my|the) car\b(?! (?:into the (?:kerb|curb|gate|bin|post)|by accident|last|again (?:into|on)|on (?:the|my) (?:way|driving test)|in (?:the|a) (?:car park|game)))`, { pre: F`\b(?:jump|jumping|step|stepping|throw|throwing|lie|lying|walk|walking|run|running|fall|falling|drive|driving|crash|crashing|steer|steering|swerve|swerving)\b`, self: true, neg: true, guard: /\b(?:by accident|accidentally|game|level|mario|gta|fortnite|minecraft|roblox|lesson|instructor|test|driving test|insurance|garage|mechanic|parking)\b/ });
frame('means-blade', 'means', 5, F`${SELF}${G(3)}(?:cut|cutting|cuts|slit|slitting|slash|slashed|slashing|burn|burning|burnt|burned|scratch|scratching|scratched|carve|carved|carving|stab|stabbed|stabbing|hurt|hurting|harm|harming) ${G(1)}(?:myself|my (?:wrists?|arms?|thighs?|legs?|skin|veins?|stomach|body))\b(?! (?:on|by accident|accidentally|shaving|chopping|cooking|playing|when i fell|falling|at the gym|at football|while|in the kitchen|with (?:a|the) (?:knife|tin|can|paper|lid|glass) (?:by|while|chopping|when|opening)))|\b(?:blade|blades|razor|razors|knife|knives|scissors|glass|sharpener) ${G(4)}(?:to (?:cut|hurt) myself|cut myself|my wrists?|my arms?|my thighs?|my veins?|deep enough)\b|\bself harm(?:ing|ed)?\b|\bselfharm\w*\b`, { pre: F`\b(?:cut|cutting|cuts|slit|slitting|slash|slashed|slashing|burn|burning|burnt|burned|scratch|scratching|scratched|carve|carved|carving|stab|stabbed|stabbing|hurt|hurting|harm|harming|self harm|selfharm[a-z]*|blade|blades|razor|razors|knife|knives|scissors|glass|sharpener)\b`, neg: true, guard: /\b(?:onions?|chopping|cooking|shaving|accident|accidentally|garden|gardening|paper cut|tin|can opener|hair|fringe|nails|toenails)\b/ });
frame('means-gun', 'means', 4, F`\b(?:gun|rifle|shotgun|pistol|firearm|revolver) ${G(4)}(?:myself|my head|my mouth|to my head|in my mouth|loaded|load it|bullet|bullets|access|in my (?:room|drawer|car|bag))\b|\b(?:put|hold|holding|held) ${G(1)}(?:a|the|his|my) (?:gun|rifle|pistol) to my (?:head|chest|mouth)\b`, { guard: /\b(?:game|games|fortnite|call of duty|cod|range|clay|shooting club|airsoft|paintball|nerf|water gun)\b/ });
frame('means-gun-access', 'means', 3, F`\baccess to (?:a|the|his|my|the same|dads|grandads) (?:gun|rifle|pistol|shotgun|firearm)\b|\b(?:holding|hold|held|cleaning|loading|looking at|keep holding) (?:his|my|the|a|dads|grandads) (?:old )?(?:gun|rifle|shotgun|pistol)\b`, { pre: F`\b(?:gun|rifle|pistol|shotgun|firearm)\b`, guard: /\b(?:game|games|range|club|airsoft|paintball|nerf|water gun|museum)\b/ });
frame('means-planning-how', 'means', 3, F`${SELF}${G(2)}(?:been planning|planning|planned|thought about|been thinking about|worked out) how (?:to|i will|i am going to|i could) ${G(2)}(?:do it|end it|go|die)\b|\blooking up how to\b`);
// (planning how to reach the one who died: a joining, read with the reunions — beside a death, support first, never care alone)
frame('reunion-planning', 'means', 3, F`${SELF}${G(2)}(?:been planning|planning|planned|thought about|been thinking about|worked out) how (?:to|i will|i am going to|i could) ${G(2)}(?:get to|be with|join) (?:him|her|them)\b`, { family: 'reunion' });
frame('means-car', 'means', 4, F`\b(?:car|engine|van) ${G(4)}(?:exhaust|hose|hosepipe|pipe|fumes|garage door (?:shut|closed|down))\b|${SELF}${G(3)}(?:sit|sitting|sat|been sitting) ${G(1)}in (?:the|my) (?:car|van) ${G(2)}(?:engine running|with the engine on|in the garage|exhaust)\b`, { pre: F`\b(?:car|engine|van)\b`, guard: /\b(?:to (?:warm|keep|charge|cool|defrost|dry)|warm it up|waiting|outside (?:the|school|work)|heater|heating|mechanic|garage said|mot|repair|leak|smell)\b/ });
frame('means-water', 'means', 4, F`\b(?:walk|walking|walked|swim|swimming|swam|go|going|wade|wading) (?:into|out into|out to|out in|in to|off into) (?:the )?(?:sea|ocean|river|lake|water|waves|canal|reservoir)\b(?! (?:with|for (?:a|the) (?:swim|paddle|dip)|to (?:swim|paddle|cool|play|fish)|on holiday|at the beach|in the summer))|\b(?:drown|drowning) myself\b`, { pre: F`\b(?:sea|ocean|river|lake|water|waves|canal|reservoir|drown|drowning)\b`, guard: /\b(?:swim|swimming|paddle|paddling|surf|surfing|beach day|holiday|kids|dog|wetsuit|lido|dip|cold water|wild swim)\b/ });

// ---- FAREWELL ----------------------------------------------------------------------------------------------------------
/** A goodbye said TO someone gone, or to a thing, or a hello after it: grief or an ordinary move, never a note. */
const FW_VOCATIVE = new RegExp(F`\b(?:goodbye|good bye|bye|farewell|rip|rest in peace|sleep tight|night night|until we meet again|love you)(?: forever| for good)?(?: ,)? (?:my )?(?:sweet |little |old |dear |darling |beautiful |lovely |big |best )*(?:${PERSON}|boy|girl|one|friend|pal|buddy|angel|baby|darling|old (?:laptop|phone|house|flat|car|school|uniform|life|friend)|laptop|phone|house|flat|car|school|uniform|summer|holidays|job|office|city|town|twitter|instagram|facebook|tiktok)\b|\bhello\b|\brip\b|\brest in peace\b|\brainbow bridge\b|\bfuneral\b|\bat (?:the|his|her|their) grave\b`);
frame('fw-goodbye', 'farewell', 3, F`\b(?:goodbye|good bye|bye|farewell) ${G(1)}(?:everyone|everybody|world|forever|for good|for ever|all of you|you all|to (?:you all|everyone|all of you|the world|everybody))\b|\bthis is (?:my )?(?:goodbye|final goodbye|last goodbye|farewell)\b|\b(?:say|saying|said|made|making) (?:my )?(?:goodbyes|my goodbye|goodbye to (?:everyone|everybody|you all|all of you|the world))\b`, { pre: F`\b(?:goodbye|good bye|bye|farewell|goodbyes)\b`, guard: FW_VOCATIVE , toDead: true });
frame('fw-goodbye-bare', 'farewell', 2, F`(?:^ |[.,] )(?:goodbye|good bye|bye|farewell)(?: all| everyone| everybody| then)? (?=[.,])`, { guard: FW_VOCATIVE , toDead: true });
frame('fw-last', 'farewell', 3, F`\b(?:my |this is (?:my |the )?|the |this will be my |these are my )(?:last|final|very last) (?:message|post|text|words|word|letter|note|goodbye|tweet|status|update|video|entry|thing (?:i will|you will|anyone will|i am going to) (?:ever )?(?:say|write|post|send|hear|read|get)|time (?:i will|you will|anyone will|you are going to) ${G(2)}(?:hear|see|talk|speak|read|write))\b(?! (?:about|on|in|before|for (?:today|tonight|now|this|the)|got|was|is|went|says|said|until|till|of the (?:day|night|year|term)))|\b(?:written|wrote|writing|sent|sending) ${G(1)}(?:my )?(?:last|final) (?:message|letter|note|words|goodbye)\b(?! (?:about|on|in|before|for (?:today|the)))`, { pre: F`\b(?:last|final)\b`, guard: /\b(?:exam|exams|test|blog|diary|subject|topic|bed|goodnight|night night|sleep|asleep|deleted|by accident|the day|today|tonight on|meeting|class|lesson)\b/ });
frame('fw-letters', 'farewell', 3, F`\b(?:wrote|written|writing|left|leaving|leave|recorded|filmed|made|making|typed|hidden|hid|there is|there are) ${G(2)}(?:letters|letter|notes|note|a note|a letter|a video|videos|voice notes|messages|goodbyes|cards) ${G(3)}(?:for|to) (?:everyone|everybody|each of (?:you|them)|you all|all of you|each one of you|my (?:family|kids|children|son|daughter|mum|mom|mam|dad|parents|sister|brother|wife|husband|partner|friends|boyfriend|girlfriend|nan|gran)|mum|mom|dad|them all|each of them)\b|\b(?:wrote|written|writing|left|leaving|recorded|filmed) (?:(?:a|my|the|some|these|those) )?(?:goodbye|goodbyes|farewell) (?:letters|letter|notes|note|video|message|messages)\b|\bletters (?:to|for) each of (?:them|you)\b|\bthere is a (?:letter|note) for (?:mum|mom|dad|my [a-z]+|you|everyone)\b|\b(?:written|wrote|writing|said|made) my goodbyes\b`, { pre: F`\b(?:letters?|notes?|video|videos|voice notes|messages|goodbyes|cards)\b`, guard: /\b(?:wedding|party|birthday|christmas|thank you (?:letters|notes|cards)|pen pals?|revision|applying|application|job|interview|funeral|fridge|cake|the milkman|delivery|school|teacher|homework|work|shopping)\b/ });
frame('fw-letters-bare', 'farewell', 2, F`\b(?:writing|written|wrote|been writing|leaving|left|finished|finishing|finished writing|sealed) (?:some |a few |a couple of |all the |the |my )?(?:letters|notes|goodbye notes)\b(?! (?:to|for) (?:the|my|our) (?:council|school|teacher|landlord|bank|mp|editor|job|jobs|uni|universities|newspaper))`, { pre: F`\b(?:letters|notes|goodbye notes)\b`, guard: /\b(?:wedding|party|birthday|christmas|thank you|pen pals?|revision|applying|application|job|interview|funeral|fridge|cake|milkman|delivery|school|teacher|homework|work|shopping|council|landlord|complaint|santa)\b/ });
frame('fw-affairs', 'farewell', 3, F`\b(?:my |the )?(?:will|passwords|password|pin numbers|pin number|pins|bank details|account details|bank cards|life insurance|insurance papers|insurance details|funeral (?:wishes|plans|instructions)|deeds) ${G(3)}(?:is|are) ${G(1)}(?:on|in|under|with|inside|by|sorted|ready|written|signed|done|taped|next to) ${G(3)}(?:desk|table|drawer|envelope|bed|kitchen|room|solicitor|safe|box|notebook|folder|fridge|file|counter|shelf|sorted|ready|signed|done|written)\b|\bfor whoever (?:comes after|finds (?:me|this|them|it)|needs them)\b|\b(?:sorted|sorting|put|left|leave|leaving|written|wrote) ${G(2)}(?:my )?(?:passwords|bank details|account details|will|affairs|funeral wishes)\b`, { pre: F`\b(?:will|passwords?|pin|pins|bank|account|insurance|funeral|deeds|whoever|affairs)\b`, guard: /\b(?:flatmate|plumber|landlord|new (?:flatmate|tenant)|pay|wifi|netflix|so you can|for the (?:trip|holiday|plumber|builder)|solicitor said|sensible|at forty|at fifty|lodger|babysitter|house ?sitter|cat ?sitter|dog ?sitter)\b/ });
frame('fw-entrust', 'farewell', 2, F`\b(?:look after|take care of|care for|feed|walk|love) (?:my|the|our) (?:cat|cats|dog|dogs|kids|children|son|daughter|baby|mum|mom|mam|dad|family|hamster|rabbit|rabbits|fish|bird|birds|horse|sister|brother|pets|pet|guinea pig|tortoise|snake|parrot|girlfriend|boyfriend|wife|husband) ${G(2)}for me\b|\btake care of (?:each other|yourselves|everyone|mum|dad|my family) (?:for me|when|after|once)\b|\b(?:look after|take care of|care for|feed|walk) (?:my|the|our|mum|dad) ${G(2)}(?:when|after|once) (?:i am|im) ${G(1)}(?:gone|not here|not around|no longer here|dead)\b`, { pre: F`\b(?:look after|take care of|care for|feed|walk|love)\b`, guard: /\b(?:holiday|while i am (?:away|at|on|in)|weekend|trip|away for|next week|till|until|at work|in spain|abroad|hospital|operation)\b/ });
frame('fw-give-away', 'farewell', 3, F`\b(?:give|giving|gave|given|leave|leaving|left) ${G(1)}(?:away )?(?:all )?(?:my|of my) ${G(1)}(?:things|stuff|belongings|possessions|room|games|xbox|playstation|guitar|savings|money|jewellery|jewelry|cat|dog|everything)\b|\b(?:make sure|so that|so) ${G(2)}(?:gets|get|has|have|can have|takes) my ${G(1)}[a-z]+\b(?! (?:back|fixed|cleaned|repaired|delivered|tomorrow|today|on|at|from))|\b(?:you|he|she|they) can have my [a-z]+ (?:when|after|once) (?:i am|im) (?:gone|dead)\b|\b(?:when|once|after) i am (?:gone|dead) ${G(2)}(?:you|he|she|they|everyone) can have (?:my|all my)\b`, { pre: F`\b(?:give|giving|gave|given|leave|leaving|left|gets my|get my|has my|have my|takes my|can have my|can have)\b`, guard: /\b(?:charity|charity shop|school|library|food bank|before we move|moving|do not (?:use|need|wear|ride|play)|does not fit|do not fit|outgrown|lost weight|old (?:clothes|bike|toys|books)|clear out|declutter|decluttering|car boot|ebay|vinted|sold)\b/ , alias: 'give' });
frame('fw-apology', 'farewell', 2, F`\b(?:sorry|forgive me|i apologise|i apologize) ${G(1)}(?:for everything|for being (?:a burden|me|like this|this way|such a (?:burden|disappointment|failure|mess))|for what i am (?:about to do|going to do)|for what (?:i have done|i did)|for leaving|for all of this|for all the pain|for all the trouble|for the pain|for letting (?:you|everyone) down|it had to (?:end|be) this way|i (?:was not|could not be|could not) (?:enough|better|stay|keep going|go on|do it anymore))\b|(?:^ |[.,] )forgive me(?= [.,]| mum| mom| dad| everyone| all| please)|\bsorry to everyone i (?:let down|hurt|failed)\b`, { pre: F`\b(?:sorry|forgive|apologise|apologize)\b`, guard: /\b(?:pizza|cake|food|said (?:last night|yesterday|in the)|the group chat|the mess|the noise|the late reply|replying|the rant|being late|missing your call|the delay|this long message|the long rant)\b/ , toDead: true });
frame('fw-sorry-about-to', 'farewell', 4, F`\bsorry (?:for|about) what i am (?:about to do|going to do)\b`, { guard: /\b(?:pizza|cake|food|chocolate|biscuits|fridge|diet|room|house|kitchen|hair|garden|car|playlist|karaoke|singing|song)\b/ });
frame('fw-sorry-bare', 'farewell', 1, F`(?:^ |[.,] )(?:i am )?(?:so |really |truly )?sorry(?: (?:${PERSON}|everyone|all|guys))? (?=[.,])`, { toDead: true });
frame('fw-love-bare', 'farewell', 1, F`(?:^ |[.,] )i love you(?: (?:${PERSON}))? (?=[.,])`, { pre: F`\b(?:love you)\b`, toDead: true });
frame('fw-love', 'farewell', 2, F`\bi love you (?:all|so much|guys|everyone|forever|always)\b|(?:^ |[.,] )love you (?:all|guys|everyone|forever|always)\b|\btell (?:${G(2)})i love (?:her|him|them|you|everyone)\b|\btell (?:everyone|them|mum|dad|my [a-z]+) i (?:loved|love) (?:them|her|him|you|everyone)\b|\bi (?:always )?loved you all\b`, { pre: F`\b(?:love|loved)\b`, guard: /\b(?:birthday|party|christmas|surprise|dinner|tomorrow|ring|call|see you|visit|weekend|jumper|cake|card|present|wedding)\b/ , toDead: true });
frame('fw-relay-past', 'farewell', 5, F`\b(?:tell|please tell) (?:my )?${G(1)}(?:${PERSON}|everyone|them|him|her|my family) (?:that )?i (?:loved|always loved) (?:them|her|him|you|everyone|them all)\b`, { pre: F`\b(?:tell)\b` });
frame('fw-relay', 'farewell', 3, F`\b(?:tell|please tell) (?:my )?${G(1)}(?:${PERSON}|everyone|them|him|her|my family) (?:that )?i (?:am sorry|love|loved|will always love|never meant|did not mean|tried)\b`, { pre: F`\b(?:tell)\b`, guard: /\b(?:late|call|ring|tomorrow|later|see|visit|text|missed|grumpy|the car|the jumper|weekend|dinner|cake|tonight|at the|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/ , toDead: true });
frame('fw-thanks', 'farewell', 2, F`\bthank you for everything\b|\bthanks for everything\b|\bthank you (?:all |so much )?for (?:trying|putting up with me|being there for me|loving me|everything you have done|all you have done)\b|\bthanks for (?:trying|putting up with me|being there|loving me)\b`, { guard: /\b(?:course|class|term|year|birthday|party|wedding|dinner|lift|help with|teacher|miss|sir|reunion|conference|this week|today|tonight|lesson|team|trip|visit|present|gift)\b/ , toDead: true });
const BLAME_GUARD = /\b(?:exam|test|loss|match|game|ref|refs|referee|referees|weather|vase|shop|party|alarm|cancelled|the (?:car|dog|cat|plant|plan|cake|weather))\b|\bto (?:quit|leave|stay|skip|move|drop|go)\b/;
frame('fw-blame-all', 'farewell', 3, F`\b(?:do not|please do not|try not to|never) blame (?:yourselves|anyone|each other)\b`, { guard: BLAME_GUARD });
frame('fw-choice', 'farewell', 2, F`\bit was my (?:choice|decision|own choice|own decision)\b|\b(?:nobody|no one) is to blame\b`, { guard: BLAME_GUARD });
frame('fw-blame', 'farewell', 2, F`\b(?:do not|please do not|try not to|never) blame (?:yourself|mum|dad|my [a-z]+)\b|\bit (?:is|was) not (?:your|anyones|any of your|their|his|her) fault\b`, { guard: /\b(?:exam|test|loss|match|game|ref|referee|weather|vase|shop|party|alarm|cancelled|the (?:car|dog|cat|plant|plan|cake|weather))\b|\bto (?:quit|leave|stay|skip|move|drop|go)\b/ });
frame('fw-decision', 'farewell', 2, F`\bi have made (?:my|the) decision\b|\bmy (?:decision|mind) is made\b`, { guard: /\b(?:moving on|move on|job|course|move|divorce|it will be fine|chemistry|diet|being short|uni|college|school|offer)\b/ });
frame('fw-peace', 'farewell', 2, F`\b(?:made|making|make) (?:my )?peace\b(?! with (?:the fact|not|my|being|the move|it, it|it, i am|his|her|their|the|a|losing|getting))|\bi am at peace (?:now|with (?:my decision|it all|everything|this|it))\b`, { guard: /\b(?:moving on|move on|job|course|move|divorce|it will be fine|chemistry|diet|being short)\b/ });
frame('fw-do-not-grieve', 'farewell', 2, F`\b(?:do not|please do not) (?:be sad|cry for me|cry|miss me|grieve|mourn|come looking|look for me|try to find me|hate me)\b`, { guard: /\b(?:film|movie|book|ending|episode|exam|results|i will (?:text|call|ring|be back|be home|see you))\b/ });
// (fix round) asking not to be looked for is a farewell an everyday bound never lowers below the check-in
frame('fw-not-found', 'farewell', 3, F`\b(?:do not|dont|please do not|no one|nobody|no need to|no point|do not bother|dont bother) (?:come |coming |go |going )?(?:looking|look|searching|search|try to find|try and find|bother looking|bother trying to find)(?: for me)?\b(?! for (?:it|them|the|a|my|your|his|her))`, { pre: F`\b(?:looking|look|searching|search|find)\b`, guard: /\b(?:hide and seek|hide n seek|hiding game|game|i will (?:text|call|ring|be back|be home|see you|be in|be at|be out)|back (?:by|at|in|soon|later|for)|in the (?:garden|shed|bath|kitchen|loft|attic|office|study)|upstairs|downstairs|nap|napping|asleep|lost property|lost (?:my|the|his|her) (?:keys|phone|wallet|purse|bag|ring|glasses)|keys|wallet|remote|charger|it is not there|they are not there)\b/, strong: true });
frame('fw-this-is-it', 'farewell', 2, F`\bthis is (?:the end|the end for me|how it ends|it for me|where it ends)\b|\bit was the only way\b|\bit is (?:better|easier) this way\b|\bremember me (?:as|when|always|fondly)\b|\bi will (?:never|not) forget (?:you|any of you|you all)\b|\bwhere i am going\b|\bi will (?:always )?be watching over\b|\b(?:i will|i am going to) (?:miss|always love) you all\b|\bi promise\b(?= [.,]|$)`, { guard: /\b(?:job|this job|the film|the book|the season|the series|the game|this level|exam|school|famous|concert|we met|your mum|reunion|homework|i will (?:text|call|ring|be back|be home))\b/ });
frame('fw-this-is-it-bare', 'farewell', 1.5, F`(?:^ |[.,] )this is it (?=[.,])`);
frame('fw-read-this', 'farewell', 2, F`\b(?:by the time|when|once|if|before) (?:you|anyone|someone|somebody|they|my [a-z]+|mum|mom|dad|people|everyone) ${G(2)}(?:read|reads|see|sees|find|finds|get|gets|hear|hears|open|opens) (?:this|my message|my note|this note|this message|my letter|this letter)\b|\bif you are reading this\b`, { pre: F`\b(?:read|reads|see|sees|find|finds|get|gets|hear|hears|open|opens|reading)\b`, guard: /\b(?:parcel|wifi|washing|drawer|room [0-9]+|fridge|cake|return it|put it back|the milk|asleep on the sofa|at the cinema|on the plane|at work|home|finished|arrived|essay)\b/ });

// ---- BURDEN and HOPELESSNESS ------------------------------------------------------------------------------------------
/** Small, bounded things a burden or a hopelessness can be about: never the self. */
const SMALL = /\b(?:lift|lifts|homework|puzzle|level|game|quiz|team|match|exam|test|essay|assignment|traffic|meeting|queue|lift|cake|diet|work this week|admin|tiny flat|flat|commute|weather|this week|today|football|maths|the office|singing|karaoke|fridge|shop|shopping|wifi|signal|bus|train)\b/;
frame('bu-burden', 'burden', 3, F`${SELF}${G(3)}(?:am|was|feel like|feel|have become|have been|will always be|am just|am only|will be) ${G(1)}(?:a|such a|just a|nothing but a|the|an|only a|a huge|a massive) ${G(1)}(?:burden|waste of space|waste of oxygen|waste of air|disappointment|failure|mistake|drain|nuisance)\b|\b(?:being|be) a burden\b|\bsuch a burden\b`, { pre: F`\b(?:burden|waste of|disappointment|failure|mistake|drain|nuisance)\b`, guard: SMALL });
frame('bu-better-off', 'burden', 4, F`\b(?:better|happier|easier|freer|lighter|safer|calmer|better off|relieved) ${G(2)}(?:off )?(?:without me|if i (?:just |really |simply )?(?:was|were|am|was not|were not|am not|had never|did not) (?:not |never )?(?:here|around|gone|dead|alive|born|exist|existed|in the picture)|when i am (?:gone|not here|not around|dead)|with me gone|once i am gone|if i (?:disappeared|died|left for good|went away forever|vanished))\b|\b(?:nobody|no one|everyone|everybody|they|you|the world) (?:would|will|is going to|is gonna) ${G(1)}(?:be better|be happier|be fine|be okay|cope|manage) without me\b`, { pre: F`\b(?:better|happier|easier|freer|lighter|safer|calmer|relieved|fine|okay|cope|manage)\b`, guard: SMALL });
frame('bu-better-off-when', 'burden', 6, F`\b(?:better|happier|easier|freer|lighter|safer|calmer|better off|relieved) ${G(3)}(?:when|once|after|now that) i am (?:gone|not here|not around|dead|no longer here|no longer around|not here anymore|not around anymore)\b`, { pre: F`\b(?:better|happier|easier|freer|lighter|safer|calmer|relieved)\b`, guard: SMALL });
frame('bu-nobody-miss-gone', 'burden', 6, F`\b(?:nobody|no one|not one person|no body) ${G(3)}(?:miss|notice|care|mind|cry|realise|realize)\b ${G(3)}(?:when|if|once|after) i (?:am |was |were |have )?(?:gone|dead|disappeared|disappear|died|vanished|vanish|not here|not around|left forever|killed myself)\b|\b(?:nobody|no one) ${G(3)}(?:notice|care|miss me) if i (?:disappeared|died|vanished|was gone|killed myself)\b`, { pre: F`\b(?:nobody|no one|not one person|no body)\b` });
frame('bu-nobody-miss', 'burden', 4, F`\b(?:nobody|no one|not one person|no body) ${G(2)}(?:would|will|is going to|is gonna|ever|even|really)? ?${G(1)}(?:miss|notice|care|mind|cry|come to my funeral)\b ${G(3)}(?:if|when|that) i\b|\b(?:nobody|no one) ${G(2)}(?:will|would) (?:even |ever |really )?(?:miss me|notice (?:i am|i am gone|me gone)|care (?:if|when) i)\b`, { pre: F`\b(?:nobody|no one|not one person|no body)\b` });
frame('bu-no-point', 'burden', 3, F`\b(?:no|not any|not much|nothing|is there any|what is the) (?:point|reason|purpose|meaning) ${G(2)}(?:in |to |of )?${G(2)}(?:living|life|being alive|being here|going on|carrying on|anything|any of (?:it|this)|existing|me|my life|it all|waking up|getting up|trying|staying|staying alive)\b|\blife (?:is|has|feels) (?:pointless|meaningless|not worth (?:living|it)|no meaning|no point|over)\b|\b(?:what is|whats) the point(?: anymore| of (?:anything|it all|living|life|me))?(?= [.,?])`, { pre: F`\b(?:point|reason|reasons|purpose|meaning|pointless|meaningless|worth|over)\b`, guard: /\b(?:revising|revision|exam|cancelled|bus|train|waiting|queue|arguing|asking|trying to explain|this game|the game|homework)\b/ });
frame('bu-no-point-see', 'burden', 3, F`\b(?:do not|can not|cannot) (?:really |even |honestly )?see what the point (?:of (?:anything|any of it|it all|living|life|me) )?is\b|\b(?:do not|can not|cannot|no longer) (?:really |even |honestly )?see (?:the|any) (?:point|reason|purpose)\b(?! (?:in (?:arguing|asking|going (?:out|to (?:the|that|this))|buying|paying|revising|that|this (?:class|course|job|game))|of (?:this|that) (?:game|class|course|meeting|app)))`, { guard: /\b(?:revising|revision|exam|cancelled|bus|train|waiting|queue|arguing|asking|trying to explain|this game|the game|homework|meeting|class|course|app|subscription|gym)\b/ });
frame('bu-nothing-left', 'burden', 3, F`\bnothing (?:left|more) (?:for me|to live for|to lose|to give|in me|of me|here for me)\b|\bnothing to live for\b|\bno (?:reason|reasons) (?:left )?to (?:live|stay|keep going|go on|carry on|wake up|be here|stay alive)\b|\bno future (?:for me|left|ahead)\b|\bi (?:do not|can not) see a future\b`);
frame('bu-tired', 'burden', 3, F`\b(?:tired|sick|exhausted|done|finished|fed up|weary) (?:of|with) (?:everything|it all|being me|being myself|trying|fighting|all of this|all of it|everyone|this world|people|being here|feeling like this|this pain)\b(?! (?:at|in|on|from) (?:work|school|uni|college|the office|this job))(?! [a-z]+ing)`, { pre: F`\b(?:tired|sick|exhausted|done|finished|fed up|weary)\b`, guard: /\b(?:at work|this week|today|job|assignment|essay|homework|level|game|project|admin|traffic|commute|weather|rain|flat|house|meeting)\b/ });
frame('bu-tired-life', 'burden', 6, F`\b(?:tired|sick|exhausted|done|finished|fed up|weary) (?:of|with) (?:living|life|being alive|existing|this life|waking up|my life|being in this world|being on this earth|being here at all|being anywhere at all)\b(?! (?:in|with|at|here|there|near|next to|on|admin|like this in))`, { pre: F`\b(?:tired|sick|exhausted|done|finished|fed up|weary)\b` });
frame('bu-cant-go-on', 'burden', 3, F`\b(?:can not|could not|can not seem to|do not think i can|am not able to|unable to) ${ADV}(?:go on|keep going|carry on|do this|do it|take (?:it|this|any more|anymore|much more)|live like this|handle (?:it|this|life)|face (?:another day|tomorrow|it)|keep living|keep doing this|bear it|stand it|hold on)\b(?! (?:stage|air|tour|strike|holiday|holidays|a (?:trip|date|diet|course|walk|run|ride)|working|studying|at work|at school|with (?:work|school|uni|my (?:job|course|studies))|as (?:normal|usual|if)|like normal|going to (?:work|school)|with (?:this|the) (?:job|course|essay|diet|level|game|puzzle)|for (?:another|much longer than) (?:minute|hour|second)|after (?:mile|lap|the first|the second|halfway)|past (?:mile|lap)|up the hill))(?! (?:to|back|there|into|round|over|past|near|by|through|outside|home|up|down|on holiday|on (?:a|the|that|this) (?:trip|ride|bus|train|stage|course|walk|date|holiday)|out (?:there|with|to|for|on)|in (?:the|to|there)))`, { pre: F`\b(?:can not|could not|do not think i can|am not able to|unable to)\b`, guard: /\b(?:mile|miles|lap|laps|marathon|race|run|level|game|puzzle|this job|course|diet|gym|workout|set|reps)\b/ });
frame('bu-cant-cope', 'burden', 2, F`\b(?:can not|could not|do not think i can|am not able to|unable to) ${ADV}cope\b`, { pre: F`\b(?:can not|could not|do not think i can|am not able to|unable to)\b`, guard: SMALL });
frame('bu-done', 'burden', 2, F`${SELF}am ${ADV}(?:so |completely |totally |really )?(?:done|finished|over it)(?= [.,])`, { pre: F`\b(?:done|finished|over it)\b` });
frame('bu-nothing-matters', 'burden', 3, F`\bnothing (?:matters|means anything|is worth it|feels worth it)(?: anymore| any more| to me)?\b|\bnone of (?:this|it) (?:will |would )?(?:matter|matters)(?: soon| anymore| any more)?\b|\b(?:i|my life) (?:do not|does not) matter\b`, { pre: F`\b(?:matter|matters|nothing)\b`, guard: /\b(?:score|result|results|grade|grades|the match|the game|who wins|what they think|in the end, it is fine)\b/ });
frame('bu-give-up', 'burden', 2, F`${SELF}${G(2)}(?:give|giving|gave|have given|am giving) up\b(?! (?:on (?:this|the|that|my (?:diet|plan|essay|homework|project|dream of))|chocolate|sugar|smoking|drinking|meat|caffeine|coffee|alcohol|for lent|my seat|the (?:idea|search)))|\b(?:give|giving|gave) up on (?:life|everything|myself|living|it all|me)\b`, { guard: SMALL });
// (fix round) trapped said of a feeling or of life itself is hopelessness: the check-in
frame('bu-trapped', 'burden', 2, F`\b(?:no way out|no escape|no exit|trapped|stuck forever|can not escape|no way forward)\b`, { guard: /\b(?:traffic|meeting|queue|lift|elevator|jam|lecture|class|game|level|room|car|train|bus|conversation|call|snow|rain|toilet|loo)\b/, boost: { re: /\b(?:feel|feels|feeling|felt|heavy|hopeless|dark|darkness|drowning|suffocating|everything|life|my life|my head|my own head|anymore|any more)\b/, w: 3 } });
frame('bu-worthless', 'burden', 2, F`${SELF}${G(3)}(?:am|feel|was|will always be|have always been) ${G(2)}(?:worthless|useless|hopeless|pointless|empty inside|dead inside|unlovable|nothing|a nobody|a failure|broken|not worth (?:it|anything|saving))\b(?! (?:at|in|with|compared|when it comes|for (?:the|this|that|my|a) (?:team|job|exam|test|match|game|quiz)))`, { pre: F`\b(?:worthless|useless|hopeless|pointless|empty inside|dead inside|unlovable|nothing|nobody|failure|broken|not worth)\b`, guard: SMALL });
frame('bu-not-enough', 'burden', 3, F`${SELF}${G(2)}(?:was not|am not|will never be|was never|could not be|never was|have never been) ${ADV}(?:good )?enough\b(?! (?:for (?:the|this|that|a|an|my|our|their) (?:team|job|role|part|grade|course|uni|university|band|squad|exam|test|interview|match|game|competition|prize|place|scholarship)|at|in|to (?:get|make|win|pass)))`, { pre: F`\b(?:enough)\b`, guard: SMALL });
frame('bu-hate-self', 'burden', 2, F`${SELF}${G(2)}(?:hate|loathe|despise|can not stand) (?:myself|my life|being alive|existing|being me|who i am)\b(?! for (?:eating|forgetting|missing|being late|saying|doing|buying|not))`, { guard: /\b(?:cake|chocolate|crisps|pizza|biscuits|ate|eating|forgot|forgetting|late|bought|buying|sometimes lol|lol|haha)\b/ });
frame('bu-want-out', 'burden', 3, F`${SELF}${G(2)}(?:want|need|wanna|just want|wish|would like) (?:it|everything|this|it all|the pain|life|all of this|all this) (?:all )?(?:to (?:stop|end|be over|go away|finish)|over)\b(?! (?:by|before|after|at|soon,|so i can))|${SELF}${G(2)}(?:want|need|wanna|just want) out\b(?! (?:of (?:this|the|that|here) (?:meeting|class|job|relationship|house|flat|group|chat|lecture|room|town|city|marriage|contract))| for)`, { pre: F`\b(?:stop|end|over|go away|finish|out)\b`, guard: /\b(?:meeting|class|lecture|rain|noise|headache|exam|exams|week|term|day|shift|lesson|game|traffic|the music|the drilling|hiccups)\b/ });
frame('bu-carry', 'burden', 4, F`\b(?:have to|need to|to|will not have to|will not need to|never have to|nobody has to|no one has to) ${ADV}(?:carry|deal with|put up with|look after|worry about|take care of|support|cope with) me ${G(1)}(?:anymore|any more|much longer|for much longer|ever again|again|forever)\b|\b(?:will not|wont|will never|never|not|no longer) (?:have to |need to )?(?:drag|carry|pull) me (?:along|around|with them|anymore|any more)\b`, { pre: F`\b(?:carry|deal with|put up with|look after|worry about|take care of|support|cope with|drag|pull)\b`, guard: /\b(?:uni|university|september|move out|moving out|my own flat|holiday|trip|camp)\b/ });
frame('bu-free-of-me', 'burden', 3, F`\b(?:free|rid) of me\b|\bout of (?:your|everyones|their|his|her) (?:hair|way|life|lives) (?:for good|forever|soon|for ever)\b`, { pre: F`\b(?:of me|out of)\b`, guard: /\b(?:move out|moving out|when i move|uni|university|camp|week|whole week|for christmas|holiday|trip|travelling|off travelling|going to (?:dad|mum|my)|new job|in june|in september)\b/ });

// ---- ABSENCE: the self, absent in the future --------------------------------------------------------------------------
const TIMED_STRONG = F`(?:for much longer|much longer|for long|anymore|any more|after this weekend|after tonight|after today|after this)`;
const TIMED = F`(?:by (?:tomorrow|morning|friday|the weekend)|next week|next month|for christmas|for my birthday|tomorrow)`;
const ABSENT = F`${SELF}${G(2)}(?:will not|am not going to|am not gonna|will no longer|do not plan on|do not plan to|do not intend to|do not expect to|might not|may not|am not planning on|am not planning to|do not think i will) ${ADV}(?:be|being) ${ADV}(?:here|around|alive|there|with you|in your life|in your way|a problem|a burden|a bother|anyones problem|anyones burden|anybodys problem|in this world|on this earth)`;
frame('ab-wont-be-long', 'absence', 6, F`${ABSENT} ${G(3)}${TIMED_STRONG}\b(?! than)`, { pre: F`\b(?:much longer|for long|anymore|any more|after this|after tonight|after today)\b` });
frame('ab-wont-be-timed', 'absence', 5, F`${ABSENT} ${G(3)}${TIMED}\b(?! than)`, { pre: F`\b(?:tomorrow|morning|friday|weekend|next week|next month|christmas|birthday)\b` });
frame('ab-plan-timed', 'absence', 6, F`${SELF}${G(1)}(?:do not plan on|do not plan to|do not intend to|am not planning on|am not planning to) ${ADV}(?:be|being) ${ADV}(?:here|around|alive) ${G(2)}(?:${TIMED_STRONG}|${TIMED})\b`, { pre: F`\b(?:plan|intend|planning)\b`, guard: /\b(?:lease|contract|job|move|moving|uni|holiday|trip|staying|flat|house)\b/ });
frame('ab-plan-not-here', 'absence', 5, F`${SELF}${G(1)}(?:do not plan on|do not plan to|do not intend to|am not planning on|am not planning to) ${ADV}(?:be|being) ${ADV}(?:here|around|alive)\b`, { pre: F`\b(?:plan|intend|planning)\b`, guard: /\b(?:lease|contract|job|move|moving|uni|holiday|trip|after (?:june|july|august|september|christmas|summer)|staying|flat|house)\b/ });
frame('ab-wont-be', 'absence', 3, F`${SELF}${G(2)}(?:will not|am not going to|am not gonna|will no longer|would not|do not plan on|do not plan to|do not intend to|do not expect to|will never|might not|may not|am not planning on|am not planning to|do not think i will) ${ADV}(?:be|being) ${ADV}(?:here|around|alive|with you|in your life|in your way|a problem|a burden|a bother|anyones problem|anyones burden|anybodys problem|in this world|on this earth)\b(?! (?:at|for (?:the|a|my|your|his|her|their|dinner|lunch|tea|work|school)|in (?:the|class|school|work|time)|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|time|the)|until|till|today|this (?:afternoon|morning|evening)|much (?:this|today|tomorrow|next)|after (?:june|july|august|september|the|next|this (?:term|year|month))|than|much longer than|longer than|when you (?:get|come) (?:back|home)|to (?:help|pick)))`, { pre: F`\b(?:here|around|alive|with you|in your|a problem|a burden|a bother|anyones|anybodys|in this world|on this earth)\b` });
frame('ab-when-gone', 'absence', 3, F`\b(?:when|after|once|by the time|before|if|now that|since) i (?:am |have |will be |have been |will have )?${ADV}(?:gone|dead|not here|not around|no longer here|no longer around|no longer alive|not alive|in the ground|at peace|out of the picture|out of the way|not here anymore|not around anymore|six feet under)\b(?! (?:to|for|on|out|home|away|back|abroad|shopping|travelling|traveling|camping|by|in(?! peace)|from|with|over|into|up|down|off|all|most|until|till|a week|a few|for the|the flat|tomorrow|today|next|this|at|when you))`, { pre: F`\b(?:gone|dead|not here|not around|no longer|not alive|in the ground|at peace|out of the picture|out of the way|six feet under)\b`, guard: /\b(?:holiday|trip|operation|spain|abroad|work|bed|the flat will be yours|manager|takes over|cat will sulk|walk the dog|water the plants|feed the|new job|uni|camp|week)\b/ });
frame('ab-no-worry', 'absence', 3, F`\b(?:you|everyone|everybody|they|nobody|no one|anyone|you all|you guys|my family|mum|mom|dad|people|no body) ${G(2)}(?:will not|do not|never|not|will never|has to|have to|need to|needs to) ${ADV}(?:have to |need to |ever have to |ever need to |ever )?(?:worry|deal|put up|bother|carry|look after|take care|think|stress) (?:about |with |of )?me\b`, { pre: F`\b(?:worry|deal|put up|bother|carry|look after|take care|think|stress)\b`, guard: /\b(?:text|call|ring|message|land|landed|packed|snacks|coat|phone|staying with|big girl|big boy|fine|home by|safe|hike|camping|trip|uni|september|my own|grandma|nan|be back|i will be okay|i am okay)\b/ });
frame('ab-no-worry-tonight', 'absence', 6, F`\b(?:you|everyone|everybody|they|nobody|no one|anyone|you all|you guys|my family|mum|mom|dad|people|no body) ${G(2)}(?:will not|do not|never|not|will never|has to|have to|need to|needs to) ${ADV}(?:have to |need to |ever have to |ever need to |ever )?(?:worry|deal|put up|bother|carry|look after|take care|think|stress) (?:about |with |of )?me ${G(1)}(?:after tonight|after today|after this)\b`, { pre: F`\b(?:worry|deal|put up|bother|carry|look after|take care|think|stress)\b` });
frame('ab-no-worry-timed', 'absence', 5, F`\b(?:you|everyone|everybody|they|nobody|no one|anyone|you all|you guys|my family|mum|mom|dad|people|no body) ${G(2)}(?:will not|do not|never|not|will never|has to|have to|need to|needs to) ${ADV}(?:have to |need to |ever have to |ever need to |ever )?(?:worry|deal|put up|bother|carry|look after|take care|think|stress) (?:about |with |of )?me ${G(1)}(?:after tonight|after today|ever again|anymore|any more|much longer|again)\b`, { pre: F`\b(?:worry|deal|put up|bother|carry|look after|take care|think|stress)\b`, guard: /\b(?:text|call|ring|message|land|landed|packed|snacks|coat|phone|staying with|big girl|big boy|fine|home by|safe|hike|camping|trip|uni|september|my own|grandma|nan|be back|i will be okay|i am okay|move out|moving)\b/ });
frame('ab-never-again-timed', 'absence', 6, F`\b(?:will not|will never|never|not) ${G(2)}(?:see|hear from) me again after (?:tonight|today|this)\b`);
frame('ab-never-again', 'absence', 4, F`\b(?:last time|the last you|never|not|nobody will|no one will|will not|will never) ${G(3)}(?:hear from me|see me|hear me|hear my voice|talk to me|speak to me|get (?:another )?(?:message|text|call) from me)\b ${G(1)}(?:again|ever again|anymore|after (?:tonight|today|this|now)|from now on)\b(?! (?:in|at|on|till|until) )|\bthis is the last (?:time )?(?:you will|you are going to|anyone will) ${G(2)}(?:hear|see|get|read)\b|\b(?:will not|will never|never) ${G(2)}see me again after (?:tonight|today|this)\b`, { pre: F`\b(?:again|anymore|from now on|after|last|this is the last)\b`, guard: /\b(?:shop|gym|pub|restaurant|cafe|bar|club|place|store|until|till|results|holidays|parking|about the|on this|promise to stop|meeting)\b/ });
frame('ab-out-of-way', 'absence', 3, F`\b(?:i will|i am going to|i would|soon i will) ${ADV}(?:be out of|get out of) (?:your|everyones|their|his|her|the) (?:way|hair|life|lives|picture)\b`, { pre: F`\b(?:out of)\b`, guard: /\b(?:move out|moving out|uni|holiday|trip|kitchen|bathroom|tomorrow morning|by (?:ten|nine|eight|[0-9]))\b/ });
frame('ab-wont-need', 'absence', 2, F`\b(?:will not|do not|am not going to|not going to|never) need (?:them|it|these|those|this|that|my [a-z]+|anything|any of (?:it|this|them)) ${G(1)}(?:anymore|any more|again|where i am going|after (?:tonight|today|this))\b|\b(?:will not|am not going to) need (?:them|it|these|those|anything|any of (?:it|this|them))(?= [.,])`, { guard: /\b(?:now i|now that|because|since|summer|healed|contact lenses|got (?:a|my|new)|bought|lost weight|finished the course|drive|car|sold|crutches|glasses|coat|winter|exam|course)\b/ });
frame('ab-wont-make', 'absence', 4, F`${SELF}${G(2)}(?:will not|do not think i will|am not going to|will never|do not see myself) ${ADV}(?:make it|making it|be here|be alive|see|last) (?:to|until|till|for|through|past) (?:my birthday|christmas|next (?:week|month|year)|the new year|tomorrow|the weekend|summer|the end of)\b(?! (?:party|dinner|lunch|drinks|on time|in time))`, { pre: F`\b(?:make it|making it|be here|be alive|see|last)\b`, guard: /\b(?:going to (?:my|our|his|her)|staying (?:at|with)|work|shift|rota|flight|trip|holiday|away|abroad|busy|appointment|aunts|uncles|nans|grans|dads|mums)\b/ });

// ---- NOW: immediacy and decision --------------------------------------------------------------------------------------
frame('now-time', 'now', 1, F`\b(?:tonight|today|right now|soon|very soon|tomorrow|this weekend|after tonight|after today|by morning|by tomorrow|before morning|in an hour|in a few hours|by friday|by the weekend|much longer|for much longer|not long now|anymore|any more|once and for all|for good|next week)\b(?! than)`);
frame('now-ready', 'now', 1, F`\bi am (?:so |finally |now )?ready\b(?! (?:for|to (?:go (?:home|out|to)|leave (?:the|this|work)|order|eat|start|play)|when you))|\bit is time\b(?! (?:to|for) (?:bed|dinner|lunch|tea|school|work|the|a|my|our|me to go to (?:bed|sleep|work|school)))`);
frame('now-decided', 'now', 2, F`${SELF}${G(2)}(?:have decided|decided|have made up my mind|made up my mind|have made my mind up|made my mind up|have made my decision|made my decision|have planned|planned it|have a plan|decided when|chose the date|picked the date|set a date)\b(?! (?:to (?:quit|leave|stay|move|go|take|do|study|apply|try)|on (?:a|the|which|what)|what|which|that i (?:am|will) (?:go|take|study|quit)))|\bmy mind is made up\b|\b(?:tonight|today|this) is the (?:night|day)\b`, { pre: F`\b(?:decided|mind|decision|planned|plan|date|night|day)\b`, guard: /\b(?:big day|interview|wedding|party|exam|game|match|date|propose|ask (?:her|him) out|holiday|trip|leaving do|moving|course|uni|job|with (?:him|her|them)|boyfriend|girlfriend|relationship|cheated|lying|break up|split up|dump)\b/ });

// ======================================================================================================= CONCEPTS --
// (fix round, 15 Oct 2026; the owner: "review the detection ARCHITECTURE rather than adding narrow phrases") The CHECK-IN tier.
// The check-in ("Before we go on — are you okay right now?", [I'm okay — let's play] first) costs a false alarm no extra tap,
// so it fires on any one risk CONCEPT (weight 3); care stays a COMBINATION (scoreOf: two concepts, or one with its
// modifier). Each family is a closed vocabulary with slots — a means and what the self does with it or asks about it, a vague
// act and a near time, a note and when it is to be read, a thing given away and finality, a future the self is not in — never
// a sentence. Guards drop the frame where the words name an everyday purpose ("a rope swing", "waiting for the 8:15", "for
// clay shooting"); weak everyday bounds and jokes dampen it (never below the check-in for a means, self-harm or a near act).
// Families: means (+ intent: thinking about it, secrecy, "for when it gets bad"), harm (self-harm, its slang and its marks),
// end (a near act, "on my own terms", letting it happen), farewell (notes, if-gone, not-your-fault, before I go), give (giving
// things away, cancelling, a will, deleting), future (a future the self is not in), absence (fading, not waking, taken),
// burden (dead weight, the cost of me, telling me to kys), and abuse (a secret, a locked door, a threat: the check-in only,
// never care here — the lexicon's abuse care stays as it is). Modifiers: now (a near time), final (it's all sorted, won't need
// it, just in case), intent, decided.

/** The self, said ("i … bought") or left out at a clause start ("bought a rope today", "standing on the bridge"). */
const SUBJ = F`(?:${SELF}(?<pre>${GS(3)})|${START}(?:(?:just|still|already|so|and|then|anyway|honestly|lol|ok|okay|basically|literally|kinda|kind of|sometimes|some days|some mornings|some nights|every night|every morning|lately|today|tonight|yesterday|last night|again|also|been|keep|i) )*)`;
/** SUBJ without its named group (a frame that names the self twice). */
const SUBJN = SUBJ.replace('(?<pre>', '(?:');
/** A means place: somewhere high, a railway, deep water. */
const PLACE = F`(?:bridges?|viaduct|flyover|overpass|footbridge|cliffs?|cliff edge|cliff path|cliff top|clifftop|platform|platform edge|train tracks|railway tracks|tracks|railway line|train line|level crossing|roof|rooftop|roof top|top floor|top level|multi storey|multistorey|car park|tower block|balcony|reservoir|quarry|weir|pier|harbour wall|sea wall)`;
const PLACE_EDGE = F`(?:${PLACE}|(?:the|that) edge(?! of (?:my|the) (?:seat|bed|sofa|chair|table)))`;
/** A means held or reached by the self. */
const MEANS_OBJ = F`(?:rope|ropes|noose|ligature|cable ties|blade|blades|razor|razors|razor blades?|sharpener blade|scalpel|stanley knife|craft knife|box cutter|gun|guns|shotgun|rifle|pistol|handgun|firearm|bullets|ammo|ammunition|cartridges|hosepipe)`;
const GUN = F`(?:gun|guns|shotgun|rifle|pistol|handgun|firearm|revolver)`;
/** A means, a method or a method place named anywhere in the words (an act named only as "it" beside them is no grief task). */
const MEANS_WORDS = new RegExp(F`\b(?:${DRUG}|${MEANS_OBJ}|${PLACE}|knife|knives|overdose|overdosing|od|jump|jumping|hang|hanging|cut|cutting|slit|bleed|drown|drowning|gas|fumes|exhaust|engine|poison|bleach)\b`);
const DRUGX = F`(?:${DRUG}|heart (?:tablets|pills|medicine|meds)|blood pressure (?:tablets|pills|meds)|warfarin|inhaler|dialysis|chemo|treatment|insulin pen)`;
/** Everyday purposes for a means object or a place (the frame is dropped). */
const OBJ_PURPOSE = /\b(?:tent|camping|climb|climbing|boat|sail|sailing|swing|washing line|garden|gardening|craft|crafts|knitting|skipping|dog|lead|leash|parcel|delivery|tie down|tow|towing|luggage|hammock|gym|yoga|shave|shaving|shaver|beard|legs|cooking|kitchen|chef|carpentry|diy|woodwork|clay|shooting club|range|hunting|farm|farmer|vermin|rabbits|pigeons|deer|licence|license|museum|antique|collection|replica|toy|nerf|airsoft|paintball|water gun|game|games|fortnite|call of duty|minecraft|roblox|film|movie|prop|props|costume|halloween|art|watering|car wash|pencil sharpener (?:broke|for)|exam|lesson|class|careful|safe|locked away)\b/;
const PLACE_PURPOSE = /\b(?:waiting|wait for|watch|watched|watching|boats|ducks|swans|birds|the world go by|for the (?:view|views|photo|sunset|sunrise|fireworks)|photo|photos|selfie|picture|pictures|view|views|sunset|sunrise|fireworks|picnic|lunch|sandwich|coffee|ice cream|reading|fishing|birdwatching|binoculars|painting|sketching|tourist|tour|guide|holiday|trip|hike|hiking|ramble|walking the dog|dog walk|with (?:my|the|our) (?:friends|mates|family|kids|dog|class|boyfriend|girlfriend|husband|wife|partner)|wedding|festival|concert|gig|party|smoking|vape|fixing|repairing|cleaning|gutter|tiles|aerial|satellite|solar|chimney|ladder|cat|delayed|cancelled|late again|signal failure|engineering works|strike|announcement|ticket|tickets|timetable|commute|commuting|on the way to (?:work|school|uni)|closed for|roadworks|repairs|reopen|reopens|traffic|queue|parked|parking|the car is|my car|our car|top deck|drove over|cycled over|walked over|over the bridge to|crossing)\b/;

// ---- MEANS --------------------------------------------------------------------------------------------------------------
// a means place, the self lingering at it ("i hover too near the platform edge", "sitting by the railway line right now")
frame('mn-place-at', 'means', 3, F`${SUBJ}(?:keep |kept |always |still |often |sometimes |been )?(?:going back to |go back to |went back to |going to |go to )?(?:stand|stood|standing|sit|sat|sitting|linger|lingering|hover|hovering|lean|leaning|stare|staring|perched|climbed|climbing) (?:up |out |down |there )?(?:at|on|by|near|over|onto|off|under|right at|close to|too close to|at the edge of|on the edge of|near the edge of|over the edge of|on top of|on the wrong side of) (?:the |a |that |this |my |an )?(?:old |big |high |tall |local |same |top of the |edge of the )?${G(1)}${PLACE_EDGE}\b`, { pre: F`\b${PLACE_EDGE}\b`, neg: true, guard: PLACE_PURPOSE, strong: true , nodamp: true });
frame('mn-place-and', 'means', 3, F`\b(?:and|then|just|keep|kept|been) (?:standing|sitting|stood|sat|hovering|lingering|leaning|staring down) (?:at|on|by|near|over|right at|close to|too close to|at the edge of|on the edge of|near the edge of|over the edge of|on the wrong side of) (?:the |a |that )?${G(1)}${PLACE_EDGE}\b`, { pre: F`\b${PLACE_EDGE}\b`, guard: PLACE_PURPOSE, strong: true, nodamp: true, need: /\bi\b/ });
frame('mn-place-on', 'means', 3, F`(?:${START}|\bi am (?:already |just |still )?)(?:up )?(?:on|at|by|on top of|at the top of|at the edge of|on the edge of|right at the edge of) (?:the |a |that )?(?:roof of the |top of the |top floor of the |edge of the )?${G(1)}${PLACE_EDGE}\b(?= ${G(4)}(?:now|right now|again|tonight|alone|at the moment)\b)`, { pre: F`\b${PLACE_EDGE}\b`, guard: PLACE_PURPOSE, strong: true, nodamp: true });
// passing a place again and again, slowing, thinking about it, working up to it
frame('mn-place-pass', 'means', 3, F`${SUBJ}(?:keep |kept |always |still |often |been |end up |ended up |went |go )?(?:driving|drive|drove|walking|walk|walked|cycling|cycled|going|go|went|looking|look|looked|staring|stare|thinking about|end up at|ended up at)(?: up| out| back)? (?:past|over|to|by|at|towards|across|onto|up to|on|near|round) (?:the |a |that |this |our )?${G(1)}${PLACE_EDGE}\b`, { pre: F`\b${PLACE_EDGE}\b`, neg: true, guard: PLACE_PURPOSE, need: /\b(?:slow|slowing|slowed|stop|stopping|think|thinking|thought|wonder|wondering|again|keep|kept|every (?:time|day|night|morning)|longer|without (?:really )?meaning to|for (?:ages|an hour|hours|a while)|sat there|stood there|the nerve|work up|jump|the drop|how high|how far|how deep|abt it|about it|about jumping)\b/, strong: true , nodamp: true });
frame('mn-place-think', 'means', 3, F`\b${PLACE_EDGE}\b ${G(8)}(?:i |and i )?(?:keep|kept|always|cannot stop|can not stop|been|keep on|end up) (?:thinking|picturing|imagining|wondering) (?:about|abt|of)? ?(?:it|jumping|the drop|that|how)\b`, { pre: F`\b${PLACE_EDGE}\b`, guard: PLACE_PURPOSE, strong: true , nodamp: true });
// the self asks or looks up how high, how many, how long, which one has no barrier
const RESEARCH = F`(?:looked up|look up|looking up|searched|searching|search|googled|googling|google|researched|researching|checked|checking|worked out|working out|figured out|figuring out|read up on|reading up on|found out|finding out|asked|asking|been reading about)`;
const RESEARCH_PURPOSE = /\b(?:eiffel|everest|mountain|ben nevis|empire state|shard|burj|world|uk|britain|europe|famous|cake|recipe|oven|bake|cook|flight|journey|drive (?:to|from)|train (?:to|from)|bus (?:to|from)|walk (?:to|from)|get (?:to|from)|from [a-z]+ to|tickets?|quiz|homework|project|essay|assignment|fact|facts|trivia|argument|school|lesson|class|for (?:my|a) (?:book|novel|story|essay|project)|a day|per day|every [0-9a-z]+ hours|toothache|headache|period|back pain|cold|flu|child|kid|kids|son|daughter|baby|dog|cat|vet|nursing|finals|revision|revising|toxicology|pharmacology|lecture|dose for|safe dose|how much water|calories)\b/;
frame('mn-unfound', 'means', 3, F`\b(?:nobody|no one|noone|they) (?:would|will|could) (?:ever )?find (?:anything|me|you|a body|anyone|them|my body) (?:down there|there|in there|at the bottom|for (?:days|weeks|ages))\b`, { pre: F`\b(?:find)\b`, guard: /\b(?:hide and seek|game|treasure|geocach|lost property|keys|phone|wallet|the dog|ball|frisbee)\b/, strong: true });
frame('mn-research', 'means', 3, F`(?:${SUBJ})?${RESEARCH} (?:online |on google |again )?(?:how (?:high|tall|far down|deep|high up|long (?:it|does it|would it|until|before)|many|much|quickly|quick|fast|easy|painful|likely)|which (?:bridges?|floor|floors|level|levels|building|buildings|car parks?|multi storeys?|roofs?|cliffs?|one|ones|pills|tablets|drugs)|whether (?:the|they|it|you)|what (?:height|floor|dose|happens))\b`, { pre: F`\b${RESEARCH}\b`, guard: RESEARCH_PURPOSE, need: new RegExp(F`\b(?:${PLACE}|${DRUG}|barrier|barriers|fence|fences|railings|nets|drop|found|die|dying|dead|fatal|lethal|survive|hurt|hurts|takes|take to|kill|killed|living alone|top floor|roof)\b`), strong: true, nodamp: true, boost: { re: /\b(?:fatal|lethal|die|dying|dead|kill|killed|survive|found|living alone|barriers?|fences?|railings|nets|how high|how far down|how deep|which floor|which bridges?|it takes)\b/, w: 6 } });
frame('mn-barrier', 'means', 4, F`\b(?:no|without|do not have|does not have|has no|have no|with no|missing|not got|have not got|has not got|still no) (?:any )?(?:barriers?|fences?|fencing|railings?|nets?|netting|suicide nets?|anti suicide)\b`, { need: new RegExp(F`\b(?:${PLACE}|floor|level|building|top)\b`), guard: /\b(?:dog|dogs|garden|field|pitch|(?<!car )park|kids|toddler|baby|playground|pool|pond|pony|horse|sheep|cows|motorway works|roadworks|safety (?:report|inspection)|council|complaint|petition)\b/, strong: true });
// the means object: bought, got, hidden, kept, found, a gun and its key
frame('mn-object', 'means', 3, F`${SUBJ}(?:bought|buy|buying|got|getting|get|ordered|order|ordering|picked up|found|have got|have|keep|kept|keeping|hid|hide|hidden|hiding|stashed|stash|stashing|carry|carrying|took|nicked|stole|stolen|borrowed|tested|testing) (?:myself |me )?(?:a |an |the |some |my |his |her |dads |mums |a length of |a bit of |a new |another |extra |spare |enough )?(?:${G(2)})?${MEANS_OBJ}\b`, { pre: F`\b${MEANS_OBJ}\b`, neg: true, guard: OBJ_PURPOSE, strong: true , nodamp: true });
frame('mn-gun', 'means', 3, F`\b(?:${PERSON}s?|he|she|they|husband|bill|[a-z]+s) (?:still )?(?:keeps|keep|has|have|owns|own|hides|hide|kept|leaves|left|stores) (?:a |his |her |their |the |an |an old |his old |her old )?${GUN}\b|\b(?:old |dads |his |her |the )?${GUN} is (?:still |up |down |kept )?(?:in|under|on top of|at the back of|behind) (?:the |my |his |her |our )?(?:loft|closet|wardrobe|drawer|cupboard|garage|shed|cabinet|attic|safe|bedroom|car|basement|cellar)\b|\b${GUN} in (?:the |my |his |her |our |dads )?(?:[a-z]+s )?(?:loft|closet|wardrobe|drawer|cupboard|garage|shed|cabinet|gun cabinet|attic|safe|bedroom|basement|cellar)\b|\b(?:key|keys|combination|code) (?:to|for) (?:the |his |dads |my )?(?:gun|rifle|shotgun) (?:cabinet|safe|cupboard|case)\b|\b(?:access to|got hold of|get hold of|found|holding) (?:a |the |his |her |my |our |dads )?(?:[a-z]+s )?(?:old )?${GUN}\b`, { pre: F`\b(?:${GUN}|gun|rifle|shotgun)\b`, guard: OBJ_PURPOSE, strong: true , nodamp: true });
// the engine running in a closed garage
// (an engine running in a car is the check-in; shut in a garage, or a hose to the exhaust, it is the means itself)
const ENGINE_SHUT = /\b(?:garage|doors? (?:shut|closed|locked|down)|closed|shut|sealed|taped|hose|hosepipe|pipe|tube|exhaust|fumes|windows? (?:up|shut|closed)|breathing it in|breathe it in)\b/;
frame('mn-engine', 'means', 4, F`\b(?:garage|car|van) ${G(5)}(?:engine|motor) (?:running|on|idling|ticking over)\b|\b(?:engine|motor) (?:running|on|idling) ${G(5)}(?:garage|doors? (?:shut|closed)|closed garage)\b|\bin (?:the |a |my )?(?:closed |shut )?garage ${G(4)}(?:engine|motor) (?:running|on)\b|\b(?:hose|hosepipe|pipe|tube) ${G(2)}(?:from|to|on|onto|into) (?:the |my )?exhaust\b|\bexhaust ${G(2)}(?:into|in) (?:the |my )?(?:car|van|window)\b`, { pre: F`\b(?:engine|motor|exhaust)\b`, guard: /\b(?:to (?:warm|keep|charge|cool|defrost|dry)|warm it up|warm up|defrost|charging|battery|mechanic|fixing|repair|service|mot|leak|smell of|petrol|diesel|oil|lawnmower|mower|milk|ran in|nipped in|popped in|while i (?:ran|nipped|popped)|school run|pick up|picking up|outside the garage|door open|doors open)\b/, strong: true , nodamp: true, boost: { re: ENGINE_SHUT, w: 5 } });
// medicine stopped on purpose; letting it happen
frame('mn-meds-stop', 'means', 3, F`${SUBJ}(?:stopped|stop|stopping|quit|quitting|have stopped|not been|am not|have not been|refuse to|refusing to|will not|skipping|skipped|binned|thrown away|threw away|flushed) (?:${ADV})(?:taking |having |using |injecting |my |the |all my )?${G(2)}${DRUGX}\b|\b${DRUGX} ${G(3)}(?:but|and) i (?:stopped|have stopped|quit|will not)\b`, { pre: F`\b${DRUGX}\b`, guard: /\b(?:because (?:it|they) (?:made|make|upset|gave|give)|side effects|the (?:doctor|gp|nurse|consultant|pharmacist|specialist) (?:said|told me|says|advised|agreed) (?:i could|to stop|it was fine|it is fine|that was fine|that is fine|i can|we could|we can|i should stop)|(?:doctor|gp|nurse|consultant|specialist) (?:switched|changed|stopped|took me off)|course|finished|antibiotics|iron|vitamins|supplements|contraceptive|the pill|hay fever|allergy|weaning|tapering|taper|coming off|reducing|switched|switching|new prescription|ran out|forgot|forgetting|by mistake|accidentally|pharmacy|chemist|cost|so (?:it|they) (?:can|could) (?:check|test|scan))\b/, strong: true , nodamp: true });
frame('mn-ready', 'means', 4, F`\b(?:have|got|have got|keep|kept|got all|have all) (?:the |my |all the |all my |enough |a bottle of |a box of |a packet of )?(?:${DRUG}|rope|blade|blades|razor|razors|gun|noose) (?:ready|here|with me|in front of me|counted out|lined up|laid out|out on the (?:table|bed|side))\b`, { pre: F`\b(?:ready|here|with me|in front of me|counted out|lined up|laid out|out on the)\b`, guard: MEANS_PURPOSE, strong: true, nodamp: true });
frame('mn-taken', 'means', 4, F`${SUBJ}(?:already |just )(?:took|taken|have taken|swallowed|have swallowed|downed|necked|had) (?:them|it|everything|the lot|all of them|them all|all)(?= [.,]| (?:all|like|about|around|[0-9]+|an hour|half an hour|ago|feel|feeling|i)\b)|${SUBJN}(?:already |just )?(?:took|taken|have taken|swallowed|have swallowed|downed|necked) (?:everything|the lot|all of them|them all|every (?:pill|tablet|one)|the whole (?:lot|box|bottle|packet|pack|strip|thing)|(?:a|an) (?:whole|entire|full) (?:box|bottle|packet|pack|strip|blister pack|tub)(?: of [a-z]+)?|everything in (?:the |my |mums |dads )?(?:medicine )?(?:cabinet|cupboard|drawer|bathroom))\b`, { pre: F`\b(?:took|taken|swallowed|downed|necked|had)\b`, neg: true, guard: /\b(?:bins|rubbish|recycling|dog|dogs|kids|children|them to|photos|pictures|notes|exam|test|a nap|a break|a shower|the bus|the train|the washing|the shopping|to school|to the|for a walk|home|back|out)\b/, strong: true , nodamp: true });
frame('mn-taken-sym', 'means', 3, F`\b(?:feel|feeling|felt|i am|am|getting|going) ${ADV}(?:so |really |very |kind of |a bit )?(?:dizzy|weird|woozy|drowsy|sleepy|sick|numb|heavy|strange|funny|faint|spaced out|out of it|shaky|blurry|floaty)\b|\b(?:like|about|around) [0-9]{2,}\b(?= [.,]| of them| pills| tablets)|\b(?:[0-9]+|an|half an|about an|a few|a couple of|twenty|ten|thirty) (?:minutes|min|mins|hours|hrs|hour) ago\b|(?:^ |[.,] )all of them(?= [.,]|$)|\bevery (?:single )?one of them\b|\b(?:do not|dont) want (?:help|an ambulance|anyone to come)\b`, { pre: F`\b(?:feel|feeling|felt|am|getting|going|like|about|around|ago|all of them|every|do not want|dont want)\b`, need: /\b(?:took|taken|swallowed|downed|necked) (?:them|it|everything|the lot|all|a whole|an entire|the whole|a full)\b/, guard: /\b(?:roller ?coaster|ride|boat|car sick|travel sick|sea sick|seasick|flu|cold|bug|virus|hungover|hangover|drunk|wine|beer|vodka|gin|period|pregnant|migraine|vaccine|jab|booster|antibiotics|after (?:the|my) (?:run|gym|workout|swim))\b/ });

// a means or plan QUESTION (which block is highest, is the roof open after dark, an express that passes through, the most potent pills):
// nothing on its own (1.5); asked earlier in the visit, it is a means once later words say something of the self (riskScreen)
const Q_GUARD = /\b(?:world|uk|britain|country|europe|famous|eiffel|empire state|shard|burj|everest|quiz|homework|project|school trip|tourist|visit|visiting|view|views|photo|photos|fireworks|sunset|bar|restaurant|cafe|rooftop bar|party|commute|work|to get to|catch|ticket|tickets|delayed|timetable|for my (?:mum|dad|nan|kid|son|daughter|child|baby|wife|husband)|insomnia|jet lag|flight|tattoo|piercing|injection|jab|vaccine|blood test|wax|waxing|dentist|filling|braces|needle|labour|birth|period|ear|nose|tooth|parking|park the|my car|the van|deliver|delivery|drone|kite|aerial|satellite|solar|leak|gutter|the cat|the dog|pigeons)\b/;
frame('mn-q', 'means', 1.5, F`\b(?:what is |whats |which is |where is )?the (?:tallest|highest|deepest|biggest drop|highest drop) (?:building|car park|multi storey|bridge|tower|tower block|block of flats|cliff|point|place|drop|bit|one|part)\b|\b(?:roof|rooftop) access\b|\b(?:get|go|climb|get up) (?:on|onto|up onto|up on|up to|on to|up) (?:the )?(?:[a-z]+ )?(?:roof|top floor|top level)\b|\b(?:top floor|top level|roof)(?: of (?:the |that )?(?:[a-z]+ ){0,2}?(?:car park|multi storey|building|hospital|block|tower|flats))? (?:usually |still |ever )?(?:empty|locked|open|quiet|closed|deserted)\b|\block the (?:top floor|top level|roof|doors to the roof)\b|\b(?:train|trains|one) (?:go|goes|come|comes|pass|passes|run|runs) (?:straight )?through ${G(3)}(?:without stopping|stopping|station)?\b|\bwithout stopping\b|\b(?:strongest|best|most powerful) (?:sleeping )?(?:pill|pills|tablet|tablets|painkiller|painkillers)\b|\bhow many (?:would be|is|are) too many\b|\bhow (?:deep|high|tall|far down) is (?:the|that|it)\b|\b(?:would|could|can|does|do) (?:someone|anyone|you|a person|people|i) (?:survive|die from|die if|die falling)\b|\b(?:sell|sells|buy|get|order) (?:large|big|bigger|extra large|the biggest|the largest|bulk|lots of|loads of) (?:packs?|boxes|bottles|tubs) of ${DRUG}\b|\bdo you think it hurts\b|\b(?:would|does|will) it hurt\b(?= [.,]|$)|\bhow long (?:does it|would it|will it) take to (?:walk|get|drive|cycle) to the ${G(2)}${PLACE}\b|\b(?:which|what) (?:building|tower block|tower|car park|multi storey|bridge|block of flats|block|cliff|bit|part|stretch|section) ${G(4)}(?:is|has) the (?:highest|tallest|deepest|biggest drop|highest drop)\b`, { pre: F`\b(?:tallest|highest|deepest|biggest drop|highest drop|roof|rooftop|top floor|top level|through|without stopping|strongest|best|most powerful|too many|how deep|how high|how tall|how far down|hurt|hurts|survive|die from|die if|die falling|packs? of|boxes of|bottles of|tubs of|how long)\b`, guard: Q_GUARD });
frame('mn-howmany-self', 'means', 6, F`\bhow (?:many|much) (?:would be|is|are|would|it takes|does it take|would it take) (?:too many|too much|enough|lethal|fatal|to kill)? ?(?:for )?(?:someone|a person|me|somebody|an adult) (?:my|of my|at my|like me|my own)? ?(?:size|weight|age)?\b(?= [.,?]|$)|\bhow (?:many|much) ${G(2)}${DRUG} (?:it takes|does it take|would it take|it would take)\b`, { pre: F`\b(?:how many|how much)\b`, guard: /\b(?:a day|per day|in a day|every [0-9a-z]+ hours|toothache|headache|period|cold|flu|child|kid|kids|son|daughter|baby|dog|cat|vet|safe|safely|maximum dose|max dose|with food|water|calories|sugar|caffeine|coffee|protein|vitamin|vitamins)\b/, strong: true });
frame('fd-enough', 'end', 6, F`\benough ${G(4)}(?:to make sure |that |so that |so )?i (?:do not|will not|never|wont|dont|can not) (?:have to )?(?:wake|waking) up\b|\bmake sure i (?:do not|never|will not|wont|dont) wake up\b`, { guard: /\b(?:alarm|coffee|caffeine|sleep in|tired|lie in|weekend|holiday|night shift|blackout blinds|curtains|earplugs)\b/, strong: true });

frame('mn-enough', 'means', 3, F`\b(?:there is|there are|i have|i have got|i have now got|now i have|now there is|that is|thats|i have saved|i have kept|i have collected) (?:more than |just about |about |finally )?enough(?: now| of them| saved| here)?(?= [.,]|$)|\benough (?:to (?:do it|end it|kill (?:me|myself|someone)|make sure|not wake up|be sure|finish it)|for (?:it to work|the job))\b`, { need: new RegExp(F`\b(?:${DRUG}|rope|blade|blades|razor|counted|count|counting|saved|saving|stockpiled|hoarded|collected|stash)\b`), guard: /\b(?:money|food|milk|bread|time|savings|holiday|deposit|fuel|petrol|chairs|plates|space|room|seats|tickets|presents|cake|wine|beer|snacks|for everyone|for the week|till friday|until friday|for the trip|for the holiday|to last|to get by|for a (?:deposit|car|holiday|trip))\b/, strong: true, nodamp: true, boost: { re: /\b(?:counted|count|counting|saved|saving|stockpiled|stockpiling|hoarded|hoarding|collected|collecting|stash|kept back)\b/, w: 6 } });
// a disclosure before an act ("i only wanted somebody to know", "had to tell someone first")
frame('fw-someone-know', 'farewell', 2, F`\b(?:just |only )?(?:wanted|want|needed|need) (?:someone|somebody|anyone|anybody|something|someone real|one person|you) to know\b|\b(?:just |only )?(?:wanted|want|needed|need) to (?:tell|talk to|say it to) (?:someone|somebody|anyone|anybody|something|someone real|one person|you) (?:first|before|now)?(?= [.,]|$| first| before)`, { guard: /\b(?:passed|got the job|engaged|pregnant|won|exam|news|results|good news|birthday|excited|proud|promotion|offer|baby|wedding|married|moving|new job|got in|accepted|scan|surprise|secret santa|gossip|crush|recipe|trick|tip|hack)\b/ });

// ---- HARM: self-harm, its slang, its marks --------------------------------------------------------------------------------
/** Self-harm that recurs, is ongoing, is hidden or relied on: care, not only the check-in. */
const HARM_ON = /\b(?:again|agian|agen|agin|keep|keeps|kept|been|still|getting worse|worse|deeper|every (?:day|night|time)|the only thing|only thing|helps|helped|calms|relapsed|relapse|ruined|streak|so (?:no one|nobody|noone) (?:sees|can see|knows)|no one sees|nobody sees|hide|hiding|hid|tonight|right now|now|for when (?:it|things) gets?|bleeding|will not stop|won't stop|is a mess|on purpose|purpose|purpse|deliberately)\b/;
const HARM_GUARD = /\b(?:finger|thumb|chopping|cooking|kitchen|onions?|veg|vegetables|knife slipped|paper|glass|tin|lid|shaving|accident|accidentally|by mistake|fell|fall|tripped|nosebleed|nose|gums|dentist|tooth|graze|grazed|knee|toddler|paw|hair|fringe|nails|toenails|mosquito|bites|bite|eczema|itch|itchy|itching|rash|chickenpox|spots|hives|nettle|nettles|sunburn|psoriasis|scab|toast|oven|cake|dinner|tea|coffee|soup|pizza|iron(?:ing)? (?:my|a) (?:shirt|dress)|sparkler|bonfire|candle|wax|hob (?:by|while)|coupons|costs|back on|down on|corners|the grass|hedge|lawn|wood|logs|cardboard|fabric|pattern|paper chains)\b/;
frame('hm-sh', 'harm', 3, F`\b(?:been|keep|kept|started|start|starting|relapsed|did|doing|urges? to|urge to|wanting to|want to|going to|gonna|stopped|stop|my|first|more|after|before|and|i) (?:sh|s h)(?: ing| ed| d)?\b(?! (?:up|it|the|your|you|he|she|they))|\b(?:sh|s h) (?:ing|ed|d|again|agian|agen|tonight|last night|today|scars|marks|cuts|urges|relapse|streak|free|clean)\b|\bself ?harm(?:ing|ed|er)?\b`, { strong: true, boost: { re: HARM_ON, w: 6 } , nodamp: true });
const HARM_ACT = F`(?:cut|cutting|cuttin|cuts|slit|slash|slashing|slashed|burn|burning|burnt|burned|scratch|scratching|scratched|scrub|scrubbing|scrubbed|carve|carving|carved|stab|stabbing|stabbed|punch|punching|punched|hit|hitting|bang|banging|starve|starving|starved|hurt|hurting|hurtin|harm|harming)`;
frame('hm-act', 'harm', 3, F`${SUBJ}(?:${ADV})${HARM_ACT} (?:myself|my self|my (?:wrists?|arms?|thighs?|legs?|skin|stomach|hips?|body|hand|hands|face|head))\b`, { pre: F`\b(?:myself|my self|my (?:wrists?|arms?|thighs?|legs?|skin|stomach|hips?|body|hand|hands|face|head))\b`, neg: true, guard: HARM_GUARD, strong: true, boost: { re: HARM_ON, w: 6 } , nodamp: true });
frame('hm-take-out', 'harm', 3, F`\b(?:take|taking|took|takes) it (?:all )?out on (?:myself|my (?:own )?body)\b`, { pre: F`\b(?:myself|body)\b`, guard: /\b(?:food|eating|eat|junk|gym|running|run|workout|exercise|shopping|spending|the pillow|pillow|drums|punch bag|punching bag)\b/, strong: true, nodamp: true, boost: { re: HARM_ON, w: 6 } });
frame('hm-cutting', 'harm', 3, F`\b(?:been|keep|kept|started|start|i am|still|was|stopped|relapsed|back to|go back to|went back to|not stopped|can not stop|can not stop myself) (?:cutting|cuttin|burning myself|scratching myself|hurting myself|hurtin myself|harming|harming myself)\b|\b(?:cutting|cuttin) (?:again|agian|agen|more|deeper|worse|is the only|helps|calms|was the only)\b|\bcut (?:too |so |really |way )?deep\b|\b(?:relapsed|i|been|and|so|then|i have) (?:and )?cut (?:again|agian|agen|myself|deeper|last night|tonight|today|my (?:arm|arms|wrist|wrists|leg|legs|thigh|thighs))\b|\b(?:cut|cuts|cutting|wound|wounds|it) ${G(4)}(?:will not|would not|can not|does not|is not|wont) stop bleeding\b`, { pre: F`\b(?:cutting|cuttin|burning|scratching|hurting|hurtin|harming|cut|cuts|wound|wounds|bleeding)\b`, guard: HARM_GUARD, strong: true, boost: { re: HARM_ON, w: 6 } , nodamp: true });
frame('hm-bleeds', 'harm', 3, F`\b(?:scratch|scratching|scratched|scrub|scrubbing|scrubbed|pick|picking|picked|bite|biting|claw|clawing|rub|rubbing|punch|punching|punched|hit|hitting) (?:at )?(?:my |myself|the )?${G(1)}(?:skin|arms?|legs?|face|hands?|knuckles|myself|walls?|head)? ?(?:till|until|so hard) (?:it|they|i|my [a-z]+|the [a-z]+|it all) ?(?:bleeds|bleed|bled|is raw|are raw|raw|bleeding|bruises|bruise)\b`, { pre: F`\b(?:till|until|so hard)\b`, guard: HARM_GUARD, strong: true, boost: { re: HARM_ON, w: 6 } , nodamp: true });
frame('hm-burn', 'harm', 3, F`\b(?:burn|burnt|burned|burning) (?:myself|my (?:hand|hands|arm|arms|wrist|wrists|skin|leg|legs|thigh|thighs|fingers?))\b ${G(5)}(?:on purpose|on purpse|on purpos|deliberately|again|agian|agen|with (?:a|the) (?:lighter|cigarette|iron|match|matches))\b|\b(?:the thing|doing the thing|did the thing|do the thing) with the (?:lighter|razor|blade|matches|compass|sharpener|scissors)\b|\b(?:lighter|cigarette|match|flame)(?: flame)? (?:on|against|to) my (?:skin|arm|arms|wrist|leg|thigh)\b`, { pre: F`\b(?:burn|burnt|burned|burning|lighter|cigarette|match|flame|the thing|did the thing|do the thing|doing the thing)\b`, strong: true, boost: { re: HARM_ON, w: 6 } , nodamp: true });
frame('hm-hide', 'harm', 3, F`\b(?:long sleeves|sleeves|hoodies?|bracelets|plasters|bandages?)\b ${G(6)}(?:so|to|because|or) (?:that )?(?:nobody|no one|noone|people|anyone|my mum|mum|they|school|teachers) (?:sees|see|can see|will see|notices|notice|asks|ask|finds out|find out|knows|know)\b|\b(?:thighs|hips|stomach|upper arms?) ${G(3)}(?:, )?(?:so|where) (?:nobody|no one|noone|people|they) (?:sees|see|can see|will see|notices|will not see)\b|\b(?:my|the) (?:marks|cuts|scars|burns) (?:are )?(?:getting worse|again|worse|deeper|new)\b|\bmy arms? (?:is|are) (?:a mess|covered)\b`, { pre: F`\b(?:sleeves|hoodie|hoodies|bracelets|plasters|bandage|bandages|thighs|hips|stomach|upper arm|upper arms|marks|cuts|scars|burns|arm|arms)\b`, guard: /\b(?:tattoo|tattoos|sunburn|tan|eczema|psoriasis|cold|freezing|chilly|weather|uniform|fashion|style|surgery|operation|stitches|cast)\b/, strong: true, boost: { re: HARM_ON, w: 6 } , nodamp: true });
// (fix round) arms or legs kept covered through the heat (long sleeves in summer, a hoodie in PE) is concealment: the check-in
frame('hm-cover', 'harm', 3, F`\b(?:wear|wearing|wore|in|always in|live in|lived in|stuck in|keep|keeping|kept) (?:a |my )?(?:long sleeves|long sleeved (?:tops|shirts|tshirts)|hoodies?|jumpers?|cardigans?|leggings|tights|joggers)\b ${G(4)}(?:even |all )?(?:in|during|through) (?:the |a )?(?:summer|heat|heatwave|hot weather|pe|gym class|swimming|sports day|30 degrees|august|july)\b`, { pre: F`\b(?:sleeves|sleeved|hoodie|hoodies|jumper|jumpers|cardigan|cardigans|leggings|tights|joggers)\b`, guard: /\b(?:cold|chilly|freezing|sun|sunburn|burn easily|pale|allergic|modest|modesty|religion|religious|hijab|abaya|tattoo|tattoos|eczema|psoriasis|fashion|style|aesthetic|comfy|comfortable|uniform|dress code|work|office|air con|aircon|mosquitoes|bugs|ticks|hiking|insecure|my weight|my body|fat|skinny|hairy)\b/, strong: true, boost: { re: /\b(?:so (?:no one|nobody|noone) (?:sees|can see|knows|notices|asks)|hide|hiding|hid|marks|scars|cuts|burns|bruises|again|relapsed)\b/, w: 6 } });
frame('hm-starve', 'harm', 3, F`\b(?:have not|not|did not|have not really|barely|hardly) (?:eaten|eat|had anything|had a meal|had any food) ${G(2)}(?:in|for) (?:[0-9]+|two|three|four|five|six|seven|a few|several) (?:days|weeks)\b ${G(6)}(?:on purpose|deliberately|hiding|so i|to punish|i do not deserve)|\b(?:making|make|made) myself (?:sick|throw up|vomit) (?:after|every|again)\b|\bstarving myself\b`, { pre: F`\b(?:eaten|eat|eating|had|sick|throw up|vomit|starving)\b`, guard: /\b(?:flu|bug|virus|food poisoning|sick bug|stomach bug|ramadan|fast|fasting|lent|surgery|operation|dentist|tooth|wisdom|braces|stomach ache|tummy|hospital|nil by mouth)\b/, strong: true, boost: { re: /\b(?:hiding|hide|hid|nobody knows|no one knows|on purpose|deliberately|again|keep)\b/, w: 6 } , nodamp: true });
frame('hm-razor', 'harm', 3, F`\b(?:used|using|use) (?:the |my |a )?(?:razor|blade|blades|razor blade|sharpener)\b(?! (?:on my (?:legs|face|beard|head)|to shave|for shaving))|\b(?:razor|blade|blades|sharpener blade|knife)(?:s| is| are|s are) (?:the only thing|in my hand|next to (?:it|me|the bath)|ready|out|on the side)\b|\b(?:razor|blade) (?:again|agian|agen)\b|\bfor when (?:it|things|everything) (?:gets?|get) (?:bad|too much|really bad|worse|too loud|too hard)\b`, { pre: F`\b(?:razor|razors|blade|blades|sharpener|knife|knifes|for when)\b`, guard: /\b(?:shave|shaving|beard|legs|stubble|craft|crafts|art|lino|wood|paper|box|parcel|tape|cardboard|kitchen|cooking|lawnmower|mower|hedge|plaster|painting|decorating|wallpaper|carpet|lino|vinyl|scraper)\b/, strong: true, boost: { re: HARM_ON, w: 6 } , nodamp: true });
frame('hm-clean', 'harm', 2, F`\b[0-9a-z]+ (?:days|weeks|months) (?:clean|sh free|free) ${G(2)}(?:ruined|gone|over|broken|lost|reset|wasted|down the drain)\b|\bclean streak ${G(2)}(?:ruined|gone|over|broken|lost)\b`, { pre: F`\b(?:clean|free)\b`, guard: /\b(?:drugs|drug|alcohol|drink|drinking|sober|smoking|vaping|vape|sugar|caffeine|gambling|porn|gaming|junk food|chocolate|social media)\b/ });

// ---- END: a vague act with a near time, the self's own terms, letting it happen ------------------------------------------
/** A near time: now, tonight, in a few minutes, once everyone is asleep. */
const NEAR = F`(?:right now|now|tonight|in (?:a few|a couple of|[0-9]+|ten|five|twenty|thirty|fifteen|two|three|four|an|half an|about an|about [0-9]+) (?:minutes?|mins?|min|hours?|hrs?|seconds?)|in an hour|in half an hour|(?:after|when|once|as soon as) (?:everyone|everybody|everyones|everybodys|they|theyre|mum|dad|my parents|my mum|my dad|the house|the kids|he|she) (?:is |are |has |have |goes |go |gets |get )?(?:gone )?(?:asleep|to bed|to sleep|in bed|out|quiet|left)|(?:by|at|before|after) (?:midnight|dark|nightfall)|before morning|by morning|after tonight|after today)`;
const ACT_GUARD = /\b(?:exam|exams|test|paper|match|game|meeting|shift|class|lesson|lecture|surgery|operation|appointment|interview|flight|journey|drive|commute|queue|presentation|speech|recital|concert|show|play|performance|race|marathon|run|party|holiday|term|school|week|dentist|injection|jab|labour|labor|contractions|homework|essay|assignment|deadline|washing|dishes|laundry|cleaning|tidy|tidying|ironing|shopping|cooking|baking|asking (?:her|him|them) out|ask (?:her|him|them) out|propose|proposing|tell (?:her|him|them|mum|dad)|telling|signing up|signed up|tattoo|piercing|haircut|bungee|skydive|swim|dive|bake off|final|episode|season|series|film|movie|stream|the move|moving|wish me luck|fingers crossed|excited|exciting|nervous|cannot wait|can not wait|so ready|first time|date|confess|hair|dye|my nails|painting|decorating|gym|workout|diet|detox|revision|revising|exam paper|wedding|recording|editing|uploading|posting|launch|release)\b/;
frame('now-act', 'end', 6, F`${SUBJ}(?:am |will |will be |is |am going to |going to |gonna |i will |i am )?(?:doing|do|end|ending|finish|finishing|going through with) (?:it|this|things|everything|it all)\b ${G(2)}${NEAR}\b|\b${NEAR} ${G(1)}(?:i |i am |i will |i am going to )?(?:doing|do|end|ending) (?:it|things|everything)\b|\b(?:it|this|everything|all of this|it all) (?:will|is going to|would) (?:all )?be (?:over|done|finished)\b ${G(1)}${NEAR}\b|\b${NEAR} ${G(1)}(?:it|this|everything|all of this) (?:will|is going to|would) (?:all )?be (?:over|done|finished)\b|\b(?:ending|end) it ${G(1)}${NEAR}\b|\b(?:it|this|everything|all of this|it all) (?:ends|is ending|will end|finishes|stops|is over) ${G(1)}${NEAR}\b`, { pre: F`\b(?:doing|do|end|ending|finish|finishing|going through with) (?:it|this|things|everything|it all)\b|\bbe (?:over|done|finished)\b|\b(?:ends|is ending|will end|finishes|stops|is over)\b`, also: F`\b(?:${NEAR})\b`, neg: true, guard: ACT_GUARD, guardAll: true, strong: true, softByDeath: /\b(?:end|ending|ends|ended|finish|finishing|finishes|over|done|finished|stops)\b/ });
frame('now-set', 'end', 3, F`\b(?:everything|it all|all|it) is (?:ready|set|set up|sorted|prepared|in place|laid out) (?:for )?${NEAR}\b`, { pre: F`\b(?:${NEAR})\b`, guard: ACT_GUARD, guardAll: true, strong: true });
frame('now-night', 'end', 3, F`\b(?:tonight|today|this) is the (?:night|day)(?= [.,]|$)|(?:^ |[.,] )this is it(?= [.,])|^ (?:it is|so it is|well it is) time(?: now)? \. $|\b(?:tonight|today|this weekend) is when (?:it|this|everything) (?:happens|ends|stops)\b`, { guard: /\b(?:big day|interview|wedding|party|exam|game|match|date|propose|final|bake off|episode|concert|gig|show|premiere|results|draw|lottery|first day|birthday|anniversary|christmas|halloween|bonfire|fireworks|prom|leaving do|launch|opening|holiday|trip|flight|move|moving|graduation|competition|race|marathon|recital|play|performance|audition|bed|dinner|lunch|tea|school|work|bath|homework|walk|the dog|feed|kids|pick up|marry|proposing|ring|bake|baking|cook|cooking|we both|both of us|both know|end(?:ing)? (?:things|it) with|break up|breaking up|split up|dump|dumping)\b/, guardAll: true, strong: true });
frame('now-stop-me', 'farewell', 3, F`\b(?:do not|please do not|no one can|nobody can|no one is going to|nobody is going to|you can not|you will not|no one will|nobody will) (?:try (?:to |and )?)?(?:stop|talk) me(?: out of it)?\b|\bnot (?:looking for|asking for|wanting|here for) (?:anyone|anybody|someone|you) to (?:talk me out of|stop me|change my mind)\b|\bdo not try (?:to|and) change my mind\b`, { guard: /\b(?:cake|pizza|chocolate|biscuits|crisps|food|eat|eating|ordering|buying|shopping|dancing|singing|karaoke|dye|haircut|tattoo|piercing|marathon|gym|working out|party|getting a (?:dog|cat|puppy|kitten)|kitten|puppy|moving|quitting my job|job|course|uni|travel|trip|holiday|playing|game|sale|wine|drink|drinks|another one|one more|binge|series|episode|ice cream|dessert|second helping|leaving early|going out|bed)\b/ });
frame('end-own-terms', 'end', 3, F`\b(?:do it|go|end it|die|leave|finish it|end things) (?:on|in) my own (?:terms|way|time)\b|\b(?:not going to|not gonna|will not|refuse to|do not want to|can not) wait (?:for|until|till|around for) (?:the )?(?:six months|the end|cancer|it to (?:get|happen|take me)|the illness|the disease|nature|the inevitable|it to come|the [a-z]+ months)\b|\b(?:rather |would rather |prefer to )?(?:pick|choose) my own time\b`, { pre: F`\b(?:own|wait)\b`, boost: { re: /\b(?:doctor|doctors|diagnosis|diagnosed|cancer|terminal|tumou?r|months to live|prognosis|[a-z]+ months|consultant|oncologist|chemo|hospice|dementia|alzheimers|parkinsons|motor neurone|mnd)\b/, w: 6 }, guard: /\b(?:holiday|leave|retire|retirement|job|work|quit|resign|wedding|move|moving|exam|uni|course|meeting|appointment|results|baby|bus|train|taxi|lift|turn|queue|the sale|black friday|tickets)\b/ });
frame('end-let-it', 'end', 3, F`\blet(?:ting)? nature (?:do what it (?:likes|wants|will)|finish (?:the job|it|me off)|take its course|run its course|decide|have its way)\b|\b(?:just |am |i am )?letting it (?:happen|take me|win|finish me)\b|\blet it (?:take me|finish me)\b`, { guard: /\b(?:garden|gardening|plants|lawn|weeds|hair|beard|wild|meadow|cold|flu|bug|virus|bruise|tooth|labour|labor|birth|baby|fever|rash|cough|knee|ankle|cut|scab|blister)\b/ });
frame('end-way-out', 'end', 3, F`\b(?:a|the|one|my) way out\b ${G(8)}(?:taking it|take it|i will take|i am taking|to take it|it is time)\b|\bmade (?:my )?peace with (?:taking it|doing it|going|leaving|dying|my decision|what i am going to do|what (?:that|it) means)\b|\bi (?:think i |already |now )?know how (?:this|it|my story|my life|all this) (?:ends|will end|is going to end|ends for me)\b|\b(?:be |am |i am )?the one (?:who|that|to) closes? the book\b|\bclose the book on (?:my life|it all|everything|myself)\b`, { pre: F`\b(?:way out|peace|know how|close the book|closes the book|the one who|the one that|the one to)\b`, guard: /\b(?:escape room|game|level|maze|puzzle|film|movie|book club|novel|story|series|show|episode|season|plot|trailer|cold|flu|bug|virus|relationship|marriage|the band|career|job|the project|debt|loan|contract|lease|the case)\b/ });
frame('end-run-course', 'absence', 3, F`\b(?:life|my life|my time|it) has (?:run|had) (?:its|it is) course(?: for me)?\b|\bi have had (?:a good innings|my time|enough time|a long life)(?= [.,]|$| and| now)`, { guard: /\b(?:cold|flu|bug|virus|cough|rash|relationship|marriage|the band|career|job|the project|series|show|season|trend|fad|phase|car|phone|laptop|boiler|fridge|washing machine|sofa|shoes|tree|plant|lawn)\b/ , nodamp: true });
frame('end-unjoke', 'end', 6, F`\b(?:no but|but no|ok but|okay but|jokes aside|joking aside|in all seriousness|but seriously|no seriously|for real though|but for real|not even joking|i am not joking|no joke|seriously though|lol jk but|jk but)\b (?:[a-z]+ ){0,6}(?:thinking about it|thought about it|think about it|mean it|meant it|actually want|really want|been thinking)\b`, { guard: /\b(?:pizza|food|holiday|trip|getting a dog|tattoo|moving|buying|dress|shoes|game|haircut|car|phone|holiday)\b/ , need: /\b(?:kill|die|dying|dead|suicide|suicidal|end it|kms|myself|not be here|disappear)\b/, strong: true });
frame('end-hope-hit', 'end', 5, F`\b(?:hope|hoping|wish|wishing|pray|praying|half hoping|kind of hoping) (?:that )?(?:something|a car|a bus|a lorry|a truck|a train|someone|lightning|the plane|i get hit|i die|i do not wake|i get run over|i crash)\b ${G(5)}(?:happens to me|hits me|kills me|runs me over|takes me out|hit me|kill me|crashes|over|die|me)\b|\b(?:would not|wouldnt|would not really|do not think i would|honestly would not) mind (?:if )?(?:i |something |a car |a bus )?(?:just )?(?:did not come back|never came back|did not wake up|never woke up|got hit|died|was not here|was gone|crashed|hit me|happened to me|did not make it)\b`, { pre: F`\b(?:hope|hoping|wish|wishing|pray|praying|mind)\b`, guard: /\b(?:lottery|win|wins|winning|good|nice|exciting|great|amazing|lucky|fun|interesting|wonderful|positive|soon so i can|snow day|day off|cancelled|cancel|rain|so school|so (?:i|we) (?:get|have|can) (?:off|a day|out))\b/, strong: true, nodamp: true });
// escape, beside a wish to be hurt or gone ("so i never have to face any of it"): never alone
frame('bu-escape', 'burden', 2, F`\bso (?:that )?i (?:do not|dont|will not|would not|never|wont) (?:ever )?(?:have to|need to) (?:deal with|deal w|face|cope with|be here for|go through|feel|do) (?:any of )?(?:it|this|anything|it all|everything|life|tomorrow|any more|anymore|them|people)\b`, { pre: F`\b(?:so)\b`, guard: /\b(?:snow|snow day|day off|cancelled|cancel|homework|exam|test|lesson|pe|assembly|maths|the dentist|chores|washing up|dishes|cooking|cleaning|shopping|work tomorrow|the meeting)\b/ , nodamp: true });
// a plan not to go on, with a date ("once the funeral is over i don't intend to keep going")
frame('end-not-wanting', 'end', 4, F`\b(?:not|never|no longer) wanting to (?:be here|be around|be alive|live|exist|wake up|go on|carry on)\b`, { pre: F`\b(?:wanting)\b`, boost: { re: /\b(?:meant it|mean it|serious|not joking|was not joking|i meant)\b/, w: 6 } });
frame('now-plan', 'end', 3, F`\bi (?:now )?know (?:exactly )?what i am (?:doing|going to do) (?:tonight|today|now|later)\b|\bi know what i (?:have|need) to do (?:tonight|now)\b`, { pre: F`\b(?:know)\b`, guard: ACT_GUARD, guardAll: true, strong: true });
frame('end-plan-not', 'end', 4, F`${SELF}${G(2)}(?:do not|no longer|will not|am not going to) (?:plan|intend|expect|mean|want) (?:on |to )?(?:carry|carrying|go|going|keep|keeping) (?:on|going)\b(?! (?:with|at|in|working|doing|playing|living here|paying))`, { pre: F`\b(?:plan|intend|expect|mean|want)\b`, neg: false, guard: /\b(?:job|course|team|club|uni|lease|contract|the band|relationship|marriage|working|this diet|the diet|the gym|this game|the game|the course|degree|lessons|piano|guitar|football|swimming|the podcast|the blog|the series)\b/ });
frame('now-date', 'now', 1, F`\b(?:after|before|by|on|until|till) (?:the |this |next )?(?:anniversary|weekend|funeral|monday|tuesday|wednesday|thursday|friday|saturday|sunday|christmas|new year|my birthday|his birthday|her birthday)\b`, { pre: F`\b(?:anniversary|weekend|funeral|monday|tuesday|wednesday|thursday|friday|saturday|sunday|christmas|new year|birthday)\b` });
// an accident staged, the insurance paying out
frame('end-accident', 'end', 4, F`\b(?:make|making|made|need|needs|want|wants|get) (?:it|this|my death|things|everything) (?:to )?look like an accident\b`, { guard: /\b(?:game|film|movie|book|novel|story|plot|crime|detective|murder mystery|writing|character|chapter|script|vase|spill|stain|broke|broken|cracked|dent|scratch|homework|the dog|the cat|the car|the window|the plate|my brother|my sister|the kids)\b/, guardAll: true, strong: true });

// ---- FAREWELL: notes, if-gone, not-your-fault, before I go --------------------------------------------------------------
const FW_GUARD = /\b(?:funeral|memorial|eulogy|service|wake|celebration of life|graveside|pen ?pals?|pen ?friends?|excited|reply|replies|write back|keys|key|mat|door|parcel|milk|oven|dinner|fridge|text me|call me|ring me|back by|wifi|signal|battery|phone dies|lost|airplane mode|plane|flight|camping|festival|hike|no signal|reception|working|work|shift|exam|busy|bed|cleaner|plumber|milkman|delivery|neighbour about|dog walker|babysitter|sitter|santa|teacher|homework|shopping list|recipe|birthday|christmas|valentines|thank you (?:card|note|letter)|wedding|anniversary|surprise|treasure hunt|scavenger|time capsule|future self|in case i forget|in case you forget|revision|meeting|dentist|appointment|charging|charger|holiday|abroad)\b/;
frame('fw-if-gone', 'farewell', 3, F`\bif (?:i am|i am not|i do not|i did not|i have not|i never|i stop) ${G(1)}(?:not )?(?:on here|here|around|online|back|alive|answer|answering|reply|replying|respond|responding|come back|wake up|make it|posting)\b|\bif (?:you|anyone|anybody|someone|nobody|no one|you all|everyone|you guys) (?:do not |does not |never |will not |stop )?(?:hear|hears|hearing) (?:from )?(?:me|from me)\b|\bif (?:you|anyone|anybody|someone|you all|people|you guys) (?:see|sees|read|reads|find|finds|get|gets) this (?:later|afterwards|after|tomorrow|in the morning|one day|when)\b|\bif anyone (?:reads|finds|sees) this\b`, { pre: F`\b(?:if)\b`, guard: FW_GUARD });
frame('fw-not-fault', 'farewell', 3, F`\b(?:it|this|any of (?:it|this)|none of (?:it|this)|that) (?:is|was|will be|is not|was not|will not be|is never) (?:not )?(?:your|anyones|anybodys|their|any of your|you guys|yall|my familys|mums|dads) fault\b|\bnone of (?:it|this) (?:is|was|is ever) (?:your|anyones|anybodys) fault\b|\bi chose this\b|\bthis (?:is|was) my (?:own )?(?:choice|decision)(?= [.,]|$)|\b(?:it is|that is|it was|that will be|it will be) my (?:own )?(?:choice|doing|decision)(?= [.,]|$| not)`, { pre: F`\b(?:fault|chose|choice|decision|doing|blame)\b`, guard: /\b(?:exam|test|failed|fail|loss|lost the|match|game|ref|referee|weather|vase|dog|cat|broke|broken|spilled|spilt|mess|traffic|late|delay|delayed|cancelled|crash|accident|stain|dent|scratch|power cut|internet|wifi|grade|grades|marks|divorce|split|break up|breakup|the rain|the bus|the train|she left|he left|they left|you failed|you lost|you missed|you forgot|wallpaper|paint|colour|hair|outfit|dress|the car|the flat|the house|degree|course|job|uni|to quit|to leave|to stay|to move)\b/ });
frame('fw-before-go', 'farewell', 3, F`\b(?:goodbye|bye|thank you|thanks|say (?:a )?(?:proper )?goodbye|say goodbye properly|say thank you|wanted to say|tell you|tell you all|to thank you)\b ${G(4)}(?:before i (?:go|leave|am gone|die|do it|go for good|go (?:to be|and be) with)|before (?:it is|it gets) too late)\b|\bbefore i go (?:for good|forever|for ever|(?:to be|and be) with)\b`, { guard: /\b(?:holiday|trip|work|bed|sleep|school|shop|shops|on leave|maternity|abroad|the move|moving|uni|camp|airport|flight|plane|weekend|tomorrow|shift|surgery|operation|hospital|in for|class|lesson|exam|meeting|lunch|dinner|train|bus|party|wedding|interview|travel|travelling|gap year|army|deployment|tour)\b/ });
frame('fw-note', 'farewell', 3, F`\b(?:wrote|written|writing|left|leaving|leave|put|hidden|hid|sealed|finished|finished writing|recorded|addressed) (?:out )?(?:a |the |my |some |these |those |little |short )?(?:letters?|notes?|cards?|envelopes?|video messages?|voice notes?|messages)\b ${G(4)}(?:for|to|addressed to) (?:each|every|all|everyone|everybody|my|the|mum|dad|you|them|each of)\b`, { pre: F`\b(?:letter|letters|note|notes|card|cards|envelope|envelopes|video|messages|voice)\b`, guard: FW_GUARD });
frame('fw-relay-group', 'farewell', 3, F`\btell (?:the |my |our )?(?:group|team|class|friends|everyone|everybody|all of them|them all|the others|the guys|the girls|people|gang|lads) (?:that )?i (?:am sorry|was sorry|loved|love|tried|never meant|did not mean|will miss)\b`, { guard: /\b(?:late|call|ring|tomorrow|later|see you|visit|text|missed|grumpy|weekend|dinner|cake|tonight|at the|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|running late|stuck|traffic|on my way|cannot make it|can not make it|ill|sick)\b/ });
frame('fw-recipients', 'farewell', 2, F`\bone for (?:my |our |the )?(?:${PERSON}|you|him|her|them)\b (?:, |and |)(?:one for)\b`, { pre: F`\b(?:one for)\b`, guard: /\b(?:cake|cakes|slice|slices|biscuit|biscuits|sweets|cookies|cupcakes|presents?|gifts?|cards?|tickets?|sandwiches|drinks?|pint|round|ice creams?|seats?|plates?|bowls?|toys?|bags?|party|birthday|christmas|shopping|chocolate|pizza|cup|cups|mugs?)\b/ });
frame('fw-loved', 'farewell', 2, F`\b(?:just know |know that |remember (?:that )?|always remember )?i (?:loved|always loved|really loved|have always loved) (?:you|you all|you guys|you both|everyone|them|all of you|each of you|every one of you)\b|\bthat i (?:loved|always loved) (?:them|you|her|him|everyone)\b`, { pre: F`\b(?:loved)\b`, guard: /\b(?:that song|that film|this song|that place|the show|the book|it|the meal|dinner|the present|your cooking)\b/, toDead: true });
frame('fw-logoff', 'farewell', 3, F`\b(?:logging|signing|logged|signed|checking|checked) (?:off|out) (?:for good|forever|for ever|for the last time|permanently)\b|\bmy (?:last|final) (?:game|match|stream|video|post|message|login|day) (?:ever|for good)\b|\bthat (?:was|is|will be) my (?:last|final) [a-z]+ ever\b|\blast (?:game|match|stream|post|message|login) ever\b`, { guard: /\b(?:twitter|insta|instagram|facebook|tiktok|snapchat|social media|this server|discord|reddit|youtube|this account|the app for|until|till|for a (?:while|month|week|bit)|detox|break|uni|exam|exams|revision|holiday|retire|retiring|retirement|career|season|team|club|league|tournament|at this school|before the move|moving|new job|old job)\b/ });
frame('fw-grateful-past', 'farewell', 2, F`\byou (?:were|have been|was) (?:always )?(?:so |really |very )?(?:kind|good|nice|lovely|there for me|a good friend|the only one who|the only one) (?:to me)?(?= [.,]|$| to me)|\b(?:they|it|you|these|the rituals|this app) (?:helped|did help) (?:for a (?:while|bit|time)|a little|for a little while|while it lasted)\b|\bthanks for (?:everything you did|always being there|being there)\b|\b(?:thanks|thank you) for (?:always )?(?:being (?:so )?(?:nice|kind|good|lovely|there) (?:to|for) me|listening to me|putting up with me)\b`, { guard: /\b(?:today|tonight|this week|yesterday|this morning|the party|dinner|the lift|the help with|teacher|miss|sir|holiday|trip|visit|present|gift|team|class|course|meeting|we will|see you|next time|again soon|the shift|work)\b/, toDead: true });
frame('fw-to-read-after', 'final', 2, F`\bto (?:read|open|find|have|keep) (?:after|afterwards|when i am gone|later on|when i am not here)(?= [.,]|$)|\bfor (?:afterwards|after i am gone|when i am gone|when i am not here)\b|\bwhoever finds (?:me|this|them|it)\b|\b(?:they|she|he|mum|dad|someone|everyone|people) (?:will|is going to|are going to) (?:find|read|get|open) (?:them|it|the (?:letters|notes|letter|note)) ${G(1)}(?:tomorrow|in the morning|after|afterwards|when)\b|\bjust in case\b|\bin case (?:anything|something) happens to me\b|\bfor (?:my |the )?(?:${PERSON}s?|parents|family|kids|children|you|them|everyone|someone) to (?:find|read|open)\b(?! (?:at|during|out|aloud|on)\b)(?! in (?:the )?(?:church|service|class|school|assembly|chapel)\b)`, { pre: F`\b(?:after|afterwards|whoever|find|finds|read|get|open|case|gone|here)\b`, guard: FW_GUARD });

// ---- GIVE: giving things away, cancelling, a will, deleting --------------------------------------------------------------
const GIVE_GUARD = /\b(?:charity|charity shop|school|library|food bank|before (?:we|i) move|moving|do not (?:use|need|wear|ride|play)|does not fit|do not fit|outgrown|grown out|lost weight|clear out|clearing out|declutter|decluttering|car boot|ebay|vinted|depop|marketplace|sold (?:it|them|my|the|our) [a-z]+ (?:on|for|to)|selling (?:it|them|my|the|our)|swap|swapped|lend|lent|borrow|borrowed|back|birthday|christmas|present|gift|got a new|getting a new|upgrade|upgraded|new one|begging|wanted one|always wanted|learning to|so (?:he|she|they) can learn|hand me down|save money|saving money|to save|too expensive|cost of living|budget|switching (?:to|provider)|switched (?:to|provider)|switch (?:to )?(?:a |another )?(?:provider|supplier|network|deal|plan)|new provider|cheaper|better deal|routine|organised|organized|safe side|responsible|grown up thing|op|operation|surgery|knee|hip|solicitor (?:says|said)|everyone (?:[a-z]+ ){0,3}should|holiday|while (?:we|i) (?:are|am) away|(?:are|am|is|be|been|going|go|went) away|abroad|trip|the price|price went up|never use|barely use|free trial|trial|scam|fraud|hacked|for a (?:month|week|while|bit|few)|to focus|focus|revision|exams?|detox|break|free up|space|storage|memory|blurry|duplicates|screenshots|new phone|old phone|privacy|spam|my ex|break up|breakup|blocked|toxic|bought (?:a|the|our) (?:house|flat)|mortgage|baby|born|pregnant|married|wedding|engaged|solicitor (?:said|recommended|advised)|recommended|sensible|advised|everyone should|turned (?:forty|fifty|sixty|seventy)|new job|retire|retiring|before the move|emigrat[a-z]*|canada|australia|tax|accountant|business|project|essay|homework|thesis|dissertation|nephew|niece|grandson|granddaughter|godson|goddaughter)\b/;
frame('gv-give', 'give', 2, F`${SUBJ}(?:gave|given|giving|give|handed|handing|left|leaving|passed on|passing on) (?:away )?(?:all |most |some |the rest )?(?:of )?(?:my|the|our) (?:[a-z]+ ){0,5}?(?:to|away)\b|\b(?:gave|given|giving) away (?:my|our) [a-z]+\b|\b(?:rehomed|re homed|found a (?:new )?home for) (?:the |my |our )?(?:dog|cat|pets?|rabbit|rabbits|bird|birds|horse|budgie|hamster)\b|\bthe (?:dog|cat|pets) (?:has|have) (?:got )?a new home\b|\band my [a-z]+ to my\b`, { pre: F`\b(?:gave|given|giving|give|handed|handing|left|leaving|passed on|passing on|rehomed|re homed|home|and my|gone|moved)\b`, neg: true, guard: GIVE_GUARD , guardAll: true });
frame('gv-pet', 'give', 3, F`\b(?:gave|given|giving|give|handed|left|leaving) (?:away )?(?:my|our|the) (?:dog|dogs|cat|cats|pets?|rabbit|rabbits|bird|birds|budgie|hamster|guinea pig|guinea pigs|tortoise|horse|pony|kitten|puppy|fish) (?:to|away)\b|\b(?:the|my|our) (?:dog|dogs|cat|cats|pets?|rabbit|rabbits) (?:has|have|is|are) (?:gone|moved) (?:to live )?(?:with|to)\b`, { guard: /\b(?:holiday|while (?:i am|we are|im) away|for the (?:week|weekend|night)|sitter|sitting|look after (?:it|him|her|them) while|allergic|allergy|allergies|moving|move|new baby|landlord|can not afford|cannot afford|vet|for a (?:walk|bath)|a treat|a bath|a biscuit|its dinner|their dinner|some food|back)\b/, guardAll: true });
frame('gv-can-have', 'give', 2, F`\b(?:you|he|she|they|u|you guys|you all) can (?:have|keep) (?:my|all my) (?:[a-z]+ ){0,2}?(?:room|things|stuff|clothes|games|xbox|playstation|switch|phone|laptop|guitar|books|records|bike|car|jewellery|jewelry|savings|money|plants|cat|dog|everything)\b`, { guard: GIVE_GUARD, guardAll: true });
frame('gv-all', 'give', 3, F`\b(?:gave|given|giving|give) away (?:all|most|everything|all of|most of|loads of) (?:my |of my )?(?:things|stuff|belongings|possessions|clothes|books|games|records)?\b|\b(?:gave|given|giving) (?:all|everything) (?:of )?(?:my )?(?:things|stuff)? ?away\b|\bsorted (?:out )?who (?:is having|gets|will have|is getting|has) my\b`, { guard: GIVE_GUARD , guardAll: true });
frame('gv-cancel', 'give', 2, F`${SUBJ}(?:cancelled|canceled|cancelling|canceling|cancel|ended|ending) (?:all )?(?:of )?(?:my |the |our )?(?:subscriptions?|phone contract|phone|contract|contracts|milk|milk delivery|papers?|newspaper|paper round|gym membership|gym|membership|memberships|insurance|direct debits?|standing orders?|window cleaner|bills|broadband|netflix|spotify|bank account|appointments)\b`, { pre: F`\b(?:cancelled|canceled|cancelling|canceling|cancel|ended|ending)\b`, neg: true, guard: GIVE_GUARD , guardAll: true });
frame('gv-will', 'give', 3, F`\b(?:updated|update|updating|sorted|sorting|made|making|wrote|written|writing|finished|redone|redid|changed|changing|signed|done) (?:out )?(?:my |a )?will\b(?! (?:power|you|be|have|not|i|probably|never|always))|\bmy will is (?:sorted|done|ready|updated|signed|written)\b|\b(?:getting|got|get|put|putting|have put|been getting|been putting) (?:all )?(?:my )?affairs in order\b|\baffairs (?:are )?in order\b|\b(?:tying|tied|tie) up (?:all )?(?:the |my |some )?loose ends\b|\bmade sure (?:the house|everything|my (?:money|savings|things)) (?:goes|will go|go) to\b`, { pre: F`\b(?:will|affairs|loose ends|made sure)\b`, guard: GIVE_GUARD , guardAll: true });
frame('gv-delete', 'give', 2, F`${SUBJ}(?:deleted|deleting|delete|wiped|wiping|wipe|erased|erasing|deactivated|deactivating|closing|closed|shut down|shutting down) (?:all )?(?:of )?(?:my |the )?(?:accounts?|socials|social media|photos|pictures|pics|messages|texts|chats|profiles?|instagram|insta|snapchat|tiktok|facebook|twitter|search history|browser history|everything)\b`, { pre: F`\b(?:deleted|deleting|delete|wiped|wiping|wipe|erased|erasing|deactivated|deactivating|closing|closed|shut down|shutting down)\b`, neg: true, guard: GIVE_GUARD, boost: { re: /\b(?:all|everything|tonight|right now|now|for good|forever)\b/, w: 3 } , guardAll: true });
// finality: it is all sorted, won't need them, ready now, no reason left to stay (a modifier: never the check-in alone)
frame('fi-sorted', 'final', 2, F`\b(?:will not|do not|am not going to|not going to) (?:need|be needing) (?:it|them|him|her|these|those|any of (?:it|this|them)|this app|the app|this|that|my [a-z]+|anything|you)(?= [.,]|$| anymore| any more| again| after| where| soon| much longer)|\b(?:it is|its|it is all|everything is|that is everything|all|have it all|got it all|everything) (?:all )?(?:sorted|done|in order|taken care of|tied up|settled|set|set out|laid out|ready|in place|prepared)(?= [.,]|$| now)|\b(?:almost|nearly|finally|all) ready(?= [.,]|$| now)|\bfeels? (?:right|good|lighter|calm|peaceful|ready) (?:to have|having|now that|knowing) ${G(3)}(?:sorted|done|in order|settled|ready|finished|sealed|written|given)\b|\bi feel (?:lighter|ready|calm|at peace|peaceful)(?= [.,]|$| like| now)|\bthere (?:will not|wont|will be no) (?:be )?(?:any |a )?need\b|\bthere is no (?:need|point) (?:anymore|any more|now)\b|\b(?:no one|nobody) (?:has|will have|needs|will need) to deal with (?:any of )?(?:it|this|me|anything)\b|\bloose ends\b|\bthat is everything done\b|\beverything (?:is )?done (?:before|by)\b|\bi have (?:lingered|stayed|been here|hung on|held on|lived) long enough\b|\b(?:will not|do not|wont|am not going to) need (?:a |the )?(?:return|ticket back|way back|return ticket|ticket home)\b|\b(?:need|use|want|enjoy) (?:them|it|these|those) more than (?:me|i do|i will|i ever will)\b|\b(?:the )?bath (?:is )?(?:running|filling|run)\b|\bi have locked (?:myself in|the (?:bathroom |bedroom )?door)\b`, { pre: F`\b(?:use|want|enjoy|need|needing|sorted|done|order|care|tied|settled|set|laid|ready|place|prepared|feel|feels|point|deal|loose|enough|bath|locked)\b`, guard: /\b(?:party|dinner|table|guests|picnic|presents|meal|bags|packed|packing|luggage|suitcase|holiday|trip|exam|uniform|clothes|school|work|meeting|presentation|stall|bake sale|wedding|coat|umbrella|winter|spring|summer|glasses|crutches|cast|car|course|job|kitchen|house move|the move|moving|flight|the room|nursery|baby|leaving do|essay|homework|project|tax|visa|passport|application)\b/ });

// ---- FUTURE: a future the self is not in ----------------------------------------------------------------------------------
const FUTURE_GUARD = /\b(?:busy|working|work|shift|abroad|away|holiday|spain|france|cornwall|in laws|in-laws|cruise|flight|visiting|staying with|at my (?:dads|mums)|at (?:dads|mums)|this year we|we are going|spending it|party|concert|tickets|(?:in|at) (?:this|the|our|my) (?:house|flat|home|job|school|uni|town|city|country)|before (?:we|i) (?:move|leave|graduate|retire)|moving|move|as a (?:student|teenager|kid|child|single)|in my twenties|as an only child|at this job|at school|before uni|work here|job|weather|forecast|rain|covid|lockdown|strike|strikes|trains|the boss|rota|shifts|until (?:i|we) (?:know|hear|get)|exam results|the scan|the test|hospital|the baby is born|due date|the sale|completion|offer|job offer|interview|career|relationship|him|her|boyfriend|girlfriend|marriage|the band|this team|this company|the club|living here|this town|the economy|politics|in a suit|in a dress|on stage|as a teacher|as a mum|as a dad|retired)\b/;
frame('fu-not-see', 'future', 3, F`${SUBJ}(?:(?:do not|dont) think i will |will not|wont|will never|am not going to|might not|may not|do not expect to|never going to|not going to|do not think i will|probably will not) ${ADV}(?:see|make it to|reach|get to|live to see|be alive (?:for|at|by)|be here (?:for|at|by)|be around (?:for|at|by)|last (?:till|until|to)) (?:another |next |this |my |the |our )?(?:christmas|xmas|summer|spring|autumn|winter|birthday|bday|new year|easter|thirty|forty|fifty|30|40|50|18|21|[0-9]+(?:th|st|nd|rd) birthday|graduation|results day|exams?|next (?:week|month|year)|the end of (?:the )?(?:week|month|year|term))\b`, { pre: F`\b(?:see|make it to|reach|get to|live to see|alive|be here|be around|last)\b`, neg: false, guard: FUTURE_GUARD });
frame('fu-wont-be-for', 'future', 3, F`(?:${START}|\bi (?:do not think i )?)(?:(?:do not|dont) think i will |will not|wont|might not|may not|am not going to|not going to|probably will not|do not think i will) ${ADV}(?:be|being) ${ADV}(?:here|around|alive|there) ${G(1)}(?:for|at|by|on|in time for) (?:my |the |our |her |his |their |your )?(?:bday|birthday|results day|results|exams?|graduation|christmas|xmas|new year|summer|wedding|18th|21st|[0-9]+(?:th|st|nd|rd))\b`, { pre: F`\b(?:be|being)\b`, guard: FUTURE_GUARD });
frame('fu-last', 'future', 3, F`\b(?:this|it|next|that|today) (?:is going to be|will be|is|was|would be|could be|has to be|must be) my (?:very )?last (?:winter|christmas|xmas|summer|birthday|bday|spring|autumn|year|new year|easter|anniversary)\b|\bmy last (?:christmas|xmas|birthday|bday|winter|summer) (?:ever|on earth|alive)\b|\b(?:want|wish|hope|need|going|planning) (?:for )?(?:this|it|today|tonight|next) (?:year |one )?to be my (?:very )?last (?:winter|christmas|xmas|summer|birthday|bday|spring|autumn|year|new year|easter|day|night)\b`, { guard: FUTURE_GUARD });
frame('fu-older', 'future', 3, F`\b(?:can not|cannot|do not|could not|never|genuinely can not|really can not|honestly can not) (?:picture|imagine|see|see myself|picture myself|imagine myself) ${G(1)}(?:getting|growing|being|living to be|making it to|reaching) (?:any )?(?:older|old|thirty|forty|fifty|twenty|30|40|50|20|25|an adult|a grown up)\b|\b(?:can not|cannot|could not|never|genuinely can not|really can not|honestly can not) (?:picture|imagine|see) (?:myself )?(?:still )?(?:being alive|alive|being here|being around|living) (?:at|by|in|past|for) (?:thirty|forty|fifty|twenty|[0-9]+|next year|a year|ten years|five years)\b|\b(?:can not|cannot|could not|never|genuinely can not|really can not|honestly can not) (?:picture|imagine) (?:a |any )?(?:future|tomorrow|next year|a life)\b(?! (?:with (?:him|her|them)|together|in this|here|at this|where|without (?:him|her|them)))`, { pre: F`\b(?:picture|imagine|see)\b`, guard: FUTURE_GUARD });
frame('fu-plans', 'future', 3, F`\b(?:stopped|stop|no point|not|no longer|given up|gave up|do not see the point in|there is no point|no reason|not bothering) (?:in )?(?:making|making any|planning|making plans|bothering with) (?:any )?(?:plans|plan|anything)? ?(?:past|after|beyond|for (?:next|after|the future|the summer|next year|then|it))\b(?: (?:this|next|the) (?:weekend|week|month|year|summer|christmas)| [a-z]+day)?|\bno point (?:making|in making|planning) (?:any )?plans\b`, { guard: FUTURE_GUARD });

// ---- ABSENCE: fading, not waking, taken, joining the dead -----------------------------------------------------------------
frame('fd-nothing-keeping', 'absence', 3, F`\bnothing (?:left |more )?(?:keeping|holding|to keep|to hold) me (?:here|going|back|alive)\b|\bno (?:reason|reasons) (?:left )?to stay(?= [.,]|$| here| alive)|\b(?:can not|could not|cannot) (?:stay|be here|hold on|hang on) (?:any longer|much longer|anymore|any more)\b`, { guard: /\b(?:job|this job|town|city|country|london|relationship|marriage|club|team|course|uni|school|flat|house share|party|work|shift|meeting|wedding|dinner|at the|in this (?:house|flat|town|job|relationship)|with (?:him|her|them)|awake|up|stay up|the sun|the heat)\b/ });
frame('fd-unafraid', 'absence', 3, F`\b(?:not|no longer|never|not even) (?:scared|afraid|frightened|worried) of (?:dying|death|being dead|ending it|not waking up|the end)(?: anymore| any more| now)?\b`, { pre: F`\b(?:scared|afraid|frightened|worried)\b`, guard: /\b(?:heights|spiders|flying|the dark|dogs|needles|the dentist|exams|public speaking|game|level|character|film|book)\b/ });
frame('ab-noone-here', 'absence', 3, F`\bthere (?:will not|wont|will be no one|will be nobody|is not going to|is no one going to) (?:be )?(?:anyone|anybody|no one|nobody)? ?(?:here|around|left|home) to\b`, { pre: F`\b(?:here|around|left|home)\b`, guard: /\b(?:holiday|away|trip|moving|move|empty|sold|at work|work|abroad|cruise|hospital|while we|while i|for the week|feed the cat|water the plants)\b/ });
frame('ab-app', 'absence', 3, F`\b(?:will not|wont|am not going to|not going to|do not|will not be) (?:need|be needing|use|be using) (?:this app|the app|this|you|any of this|these rituals) (?=(?:after (?:tonight|today|this|now)|anymore|any more|again)\b)`, { pre: F`\b(?:app|this|you|rituals)\b`, guard: /\b(?:better|feeling better|helped|thanks to|cured|recovered|therapy|therapist|counsellor|counselor|new app|switching|subscription|premium|too expensive|cost|uninstall because|phone is full|storage)\b/ });
frame('fd-fade', 'absence', 3, F`\bi (?:feel|am|have been|keep|been|just feel) (?:like )?(?:i am )?${ADV}(?:slowly |just |sort of |kind of )?(?:fading|disappearing|vanishing|dissolving|slipping) ?(?:out|away)?\b(?! (?:into (?:the|a) (?:background|crowd|book|film)|from (?:the|memory|the group chat)|in the (?:wash|sun)|at (?:work|parties)|online|for a))`, { guard: /\b(?:wash|stain|colour|color|paint|tan|bruise|scar|signal|music|song|sunset|photo|ink|tattoo|jeans|hair dye|dye|flowers|light|background|group chat|party|parties|sleep|asleep|nap|dozing|tired|after the gym)\b/ });
frame('fd-ghost', 'absence', 3, F`\b(?:feel|feeling|am|like) (?:like )?(?:a |the )?ghost\b(?! (?:story|stories|town|ship|train|kitchen|writer|pepper|costume|tour|hunt|hunting|film|movie|game))|\bgoing through the motions (?:till|until) (?:it|this|everything|i) (?:ends|is over|stops|die|go)\b|\bjust existing (?:till|until)\b`, { guard: /\b(?:halloween|costume|party|ghosted|film|movie|tour|story|game|pale|white|make up|makeup|sheet)\b/ });
frame('fd-not-wake', 'end', 5, F`\b(?:sleep|go to sleep|fall asleep|close my eyes|drift off|lie down)\b ${G(3)}(?:and |then )?(?:simply |just )?(?:not|never) (?:bother )?(?:waking|wake|wakeing) up\b|\b(?:not|never) (?:bother )?waking up (?:again|ever|anymore|any more)\b|\b(?:sleep|go to sleep|fall asleep|close my eyes)\b ${G(3)}(?:and |then )?(?:just )?stay asleep(?: forever| for good)?\b`, { neg: false, guard: /\b(?:till|until|before) (?:noon|lunch|midday|[0-9]+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|the weekend|next week|the afternoon|ten|eleven|twelve)\b|\b(?:alarm|lie in|weekend|holiday|hangover|jet lag|night shift|nap|the baby|kids|school run)\b/, strong: true, nodamp: true, boost: { re: /\b(?:want|wanted|would like|wish|wished|hope|hoping|pray|praying|longing|long to|ready|just want)\b/, w: 6 } });
frame('fd-take-me', 'end', 5, F`\b(?:lord|god|jesus|father|death|please)(?: ,)? (?:please )?(?:take|takes) me (?:tonight|now|in my sleep|home|away|soon|instead|too|with (?:him|her|them))\b|\b(?:ask|asking|asked|pray|praying|prayed|beg|begging|begged) (?:the lord|god|jesus|him|death) (?:every night |each night |again )?(?:to )?(?:take me|let me (?:die|go|not wake up))\b`, { guard: /\b(?:take me (?:to|out|shopping|for|with you to|back to)|lol|haha|this meeting|this lesson|this class|kill me|make it stop|the noise|the music|the traffic|this queue|this heat)\b/, strong: true, nodamp: true, boost: { re: /\b(?:tonight|now|in my sleep|soon|every night|each night)\b/, w: 6 } });
frame('fd-join', 'reunion', 3, F`${SUBJ}(?:will be |am |going to be |am going to be |soon |time i |want to |ready to |going to |longing to |long to |hope to )?(?:joining|join|go to be with|went to be with|go be with|go home to|going home to|be with) (?:the ancestors|my ancestors|my maker|the lord|jesus|god|my god)\b|\b(?:soon|shortly|before long) i (?:will|shall) be joining [a-z]+\b|\bi will be joining [a-z]+ (?:soon|shortly|before long)\b|\bbefore i go (?:to be|and be) with\b`, { pre: F`\b(?:joining|join|be with|go home to|going home to)\b`, guard: /\b(?:in (?:paris|spain|london|the|a)|for (?:dinner|lunch|tea|drinks|the|a)|at (?:the|work|school)|class|team|club|gym|choir|company|firm|course|uni|army|navy|church on|service on|on (?:holiday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|next (?:week|month)|zoom|call|meeting|stream|group|the queue|one day|not yet|someday|some day|eventually)\b/ });
frame('fd-rather-not', 'absence', 3, F`\b(?:would|i would|i had|id) (?:much )?(?:rather|prefer to) (?:not be|not exist|not be alive|not wake up|be dead|be gone|disappear)\b(?! (?:here|there|around) (?:at (?!all)|for|in|on|with|tonight|today|this))(?! (?:here|there|around) when (?:(?:the|my|our|his|her) )?(?:builders?|plumber|guests?|visitors?|kids|in laws|inlaws|cousins|party|they (?:arrive|visit|come)|he (?:arrives|visits)|she (?:arrives|visits)))(?= (?:here|around|alive|at all|anymore|any more|tbh|to be honest|honestly)\b|[ ]?[.,]|$)`, { guard: /\b(?:than|party|meeting|lesson|class|work|school|wedding|dinner|event|gym|dentist|trip|holiday|concert|disco|prom|the match)\b/ });
frame('fd-dont-care', 'absence', 3, F`\b(?:do not|really do not|honestly do not|kind of do not|kinda do not|just do not) (?:care|mind|even care) (?:anymore )?(?:what happens to me|if i (?:die|live|wake up|do not wake up|get hurt|disappear|make it)|whether i (?:live|die|wake up|make it))\b`, { guard: /\b(?:exam|grade|grades|results|score|game|match|lol|haha|in the game|at work|if i get fired|if i get told off|if i fail|if i get caught|in the (?:film|book|story)|detention|grounded|the teacher)\b/ });
frame('fd-out-picture', 'absence', 4, F`\b(?:take|took|taking|takes) myself out of (?:the picture|the equation|the way|everyones (?:way|lives|life)|this world|the world)\b|\bif i (?:was|were|am|went|got) (?:just |quietly )?(?:out of the picture|out of the way|out of everyones way)\b`, { guard: /\b(?:photo|photos|picture taken|group photo|selfie|the kitchen|the hallway|the road|traffic|the shot|camera)\b/ });
frame('fd-went', 'absence', 3, F`\bif i (?:just |quietly |simply )?(?:went|go|disappeared|disappear|vanished|vanish|died|was gone|were gone|was not here|was not around|did not exist|stopped existing)(?: now| tonight| for good| forever| anymore| any more)?(?= [.,]|$| and| so| then| anymore| any more)`, { guard: /\b(?:to (?:the|bed|work|school|uni)|home|out|shopping|abroad|away|on holiday|for a|first|early|late|instead|with (?:you|him|her|them)|alone|by bus|by train|tomorrow|next week)\b/ });

// ---- BURDEN: dead weight, the cost of me, people telling me to kys ----------------------------------------------------------
const BURDEN_GUARD = /\b(?:luggage|suitcase|bags|backpack|rucksack|shopping|furniture|sofa|box|boxes|gym|weights|lifting|squat|deadlift|kettlebell|dumbbell|film|movie|plot|script|team project|group project|project|slides|essay|homework|first hour|episode|season|exam|test|quiz|match|game|level|party|wedding|holiday|surprise|cake|dinner|spoiler|day out|trip|insurance quote|phone bill|my phone|contract|uni fees|tuition|takeaway|meal|haircut|petrol|lol can you|drive me|a lift|lifts|work|shift|rota|meeting|kitchen|team|traffic|lane|parking|parked|when i was little|when i was a (?:baby|kid|child)|surgery|operation|after my (?:op|operation|surgery|knee|hip)|broken (?:leg|arm|wrist|ankle)|cast|crutches|flu|cold)\b/;
frame('bd-weight', 'burden', 3, F`\b(?:dead weight|a weight|a drain|a millstone|an anchor|a dead loss) (?:on|to|around|round|for|dragging|holding)? ?(?:everyone|everyones|everybody|everybodys|my family|my familys|the family|them|you|people|my (?:kids|children|parents|mum|dad|son|daughter|husband|wife|partner|friends))\b|\b(?:dragging|drag|dragged|holding|pulling|weighing) (?:everyone|everybody|my family|them|you all|people|my (?:kids|children|parents)) (?:down|back)\b|\bdead weight\b`, { guard: BURDEN_GUARD });
frame('bd-waste', 'burden', 3, F`\b(?:waste|a waste|such a waste|total waste|complete waste) of (?:space|oxygen|air|skin|a life|life)\b`, { guard: /\b(?:money|time|paper|food|petrol|talent|this (?:film|game|lesson|meeting|class)|that (?:film|game|lesson|meeting|class)|the (?:film|game|lesson|meeting|class|cupboard|loft|room|garage|shed))\b/ });
frame('bd-ruin', 'burden', 3, F`\b(?:ruin|ruining|ruined|wreck|wrecking|mess up|messing up|destroy|destroying) (?:everyones|everybodys|everyone is|everybody is|everyone|their|my familys|the familys|all their|peoples|my parents|my kids) (?:life|lives|day|everything)?\b ${G(3)}(?:by existing|just by (?:existing|being here|being alive|being me)|by being (?:here|alive|born|me))\b|\bi ruin everything(?: i touch| for everyone| always)?(?= [.,]|$)`, { pre: F`\b(?:ruin|ruining|ruined|wreck|wrecking|mess up|messing up|destroy|destroying)\b`, guard: BURDEN_GUARD });
frame('bd-cost', 'burden', 3, F`\b(?:cost|costing|costs) (?:everyone|everybody|this family|my family|the family|them|my (?:son|daughter|kids|children|parents|husband|wife)) (?:so much|a fortune|too much|more than i am worth|everything)\b|\bmore than i am worth\b|\b(?:save|saved|saving) (?:so much |a lot of |loads of |so much more )?money if i (?:was not|were not|was|were|am not|did not exist|died) ?(?:around|here|gone|alive|dead)?\b|\blife insurance (?:pays|would pay|will pay|paying) out\b|\binsurance (?:pays|would pay|will pay) out after\b|\b(?:would|will) (?:actually )?be (?:fine|better off|okay|alright|comfortable) financially\b|\beating (?:my|his|her|their) (?:sons|daughters|kids|childrens|familys) inheritance\b`, { guard: BURDEN_GUARD });
frame('bd-kinder', 'burden', 3, F`\b(?:kinder|better|easier|cheaper|fairer|best|simpler|lighter) (?:for|to|on) (?:everyone|everybody|all of them|my family|the family|them|my (?:kids|children|son|daughter|husband|wife)) (?:all )?(?:round )?(?=if i|without me|when i am gone)`, { guard: BURDEN_GUARD });
frame('fd-without-me', 'absence', 4, F`\b(?:cheaper|kinder|fairer|richer) ${G(2)}(?:without me|if i (?:was|were) (?:gone|dead|not here|not around))\b|\b(?:the world|everyone|they|my family) would be (?:so much |a lot )?(?:cheaper|kinder)\b|\b(?:kinder|better|easier|cheaper|fairer|best|simpler|lighter) (?:for|to|on) (?:everyone|everybody|all of them|my family|the family|them|my (?:kids|children|son|daughter|husband|wife)) (?:all )?(?:round )?(?:without me|when i am gone)\b`, { guard: BURDEN_GUARD });
frame('bd-in-the-way', 'burden', 3, F`\b(?:no one|nobody|noone|not one person) (?:needs|wants|would need|would want|would notice|will notice|would miss|will miss) me\b(?! (?:to|for|at|in|on|today|tonight|this|until|till|here at|anymore at))|\b(?:i am|i am just|just|always) (?:in the way|in everyones way|getting in the way|a spare part|a nuisance to everyone)\b(?! (?:of|at|in the kitchen|when|while))`, { guard: BURDEN_GUARD });
frame('bd-told-kys', 'burden', 3, F`\b(?:people|they|everyone|kids|girls|boys|someone|people at school|he|she|my (?:brother|sister|dad|mum|stepdad|stepmum|bf|gf|boyfriend|girlfriend|class|year)|everyone in my (?:class|year|school)|people in my (?:class|year|school)|ppl in my (?:class|year|school)) (?:in my (?:class|year|school) )?(?:keep |keeps |kept |always |)(?:telling|tell|told|tells|saying|say|said|says|messaging|texting|commenting) (?:me )?(?:to |i should |that i should |i ought to )(?:kill (?:myself|yourself)|kms|kys|die|go die|go and die|end it|end myself|disappear|jump|hang myself|drink bleach)\b`, { pre: F`\b(?:kill|kms|kys|die|end it|end myself|disappear|jump|hang myself|drink bleach)\b`, guard: /\b(?:game|games|fortnite|cod|call of duty|minecraft|roblox|lobby|server|stream|joke|joking|banter|lol jk)\b/ });
frame('bd-right', 'burden', 3, F`\b(?:starting|beginning|started|begun) to (?:think|believe|agree|feel) (?:they are|they were|he is|she is|they might be|maybe they are|it is true|they have a point) ?(?:right)?\b|\bmaybe (?:they are|they were) right\b`, { need: /\b(?:kill|die|dead|kms|kys|end it|disappear|burden|worthless|useless|waste|better off|nobody|no one|loser|freak|ugly)\b/, guard: /\b(?:game|games|fortnite|cod|call of duty|minecraft|roblox|lobby|server|stream|joke|joking|banter|lol jk|exam|grade|team|pineapple|pizza|film|movie)\b/ });
frame('bd-pieces', 'burden', 3, F`\b(?:having to|have to|has to|had to|keep having to|keeps having to|keep needing to) (?:pick(?:ing)? up the pieces (?:of|after) me|pick up after me|look after me|care for me|feed (?:and wash )?me|wash me|carry me|clean up after me)\b|\b(?:should not|shouldnt|should never|ought not|do not deserve to|did not sign up to) have to (?:feed|wash|look after|care for|deal with|carry|support|worry about|put up with|clean|change) ${G(2)}me\b|\b(?:waste|wasting|give up|giving up|gave up) (?:their|his|her|your) (?:life|lives|time|years|youth|retirement) (?:caring for|looking after|on|for) ${G(4)}me\b|\buseless (?:old )?(?:woman|man|lump|thing|person|wreck)(?: like me)?\b|\bthe broken one\b`, { pre: F`\b(?:have to|has to|had to|having to|needing to|waste|wasting|give up|giving up|gave up|useless|broken one)\b`, guard: BURDEN_GUARD });
frame('bd-deserve', 'burden', 3, F`\b(?:deserve|deserves|would get|would have|could have|should have) (?:a |someone |something )?(?:better than me|a (?:mum|mom|dad|mother|father|wife|husband|partner|friend|daughter|son|sister|brother) who (?:is not|isnt) (?:a burden|like me|broken|useless|always ill|always sad))\b`, { guard: /\b(?:boss|job|team|teacher|coach|service|restaurant|deal|refund|customer|pay|raise|grade|mark|break|holiday|treat|rest|award)\b/ });

// ---- HOPELESS: can't anymore, what's the point, not okay ---------------------------------------------------------------------
const HOPE_GUARD = /\b(?:crossword|puzzle|game|level|homework|essay|exam|work|job|this class|lesson|gym|run|mile|diet|wait|queue|heat|cold|weather|noise|music|traffic|commute|meeting|eat another|chocolate|food|laughing|stop laughing|semicolon|of (?:a|the|this|that|these|those|homework|school|exams|maths|meetings|it if)|in (?:arguing|asking)|quiz|app|button|feature|subscription|exercise|food poisoning|sick|flu|hungover|hangover|tummy|stomach|migraine|headache|period|injured|knee|ankle|back|with (?:that|this|it|pineapple|the)|about (?:the|it|that)|to drive|the team|the club|my knee|the economy|government|the trains|wifi|signal|this show|the series|my handwriting|my cooking|maths|my phone|the printer|computer|laptop)\b/;
frame('hp-cant', 'burden', 3, F`(?:^ |[.,] |\bi )(?:just |really |honestly |simply |literally |seriously )?(?:can not|could not) (?:do (?:this|it) )?(?:anymore|any more|continue|go on|carry on|keep going|keep doing this|do this anymore|take it anymore|take any more|cope anymore|be here anymore|keep living like this|keep this up|hold on)(?= [.,]|$| tbh| to be honest| honestly| anymore| any more| lol| though| tho)`, { guard: HOPE_GUARD });
frame('hp-longer', 'burden', 3, F`\bhow much (?:longer|more) (?:i can|can i|i could|i am going to be able to|i will be able to) (?:do this|keep (?:going|doing this|this up)|go on|take (?:this|it)|cope|hold on|last|survive|handle (?:this|it)|carry on)\b`, { guard: HOPE_GUARD });
frame('hp-not-ok', 'burden', 3, F`\bi am (?:really |just |honestly |so |actually |genuinely |still )?not (?:okay|ok|alright|all right|fine|doing (?:okay|ok|well|good))(?= [.,]|$| and| at all| anymore| any more| really| right now| tbh| to be honest| honestly)|\b(?:do not|dont) think i am (?:ever )?going to be (?:okay|ok|alright|fine)?(?= [.,]|$)`, { guard: HOPE_GUARD });
frame('hp-better', 'burden', 3, F`\b(?:nothing|it|things|life) (?:is|are) (?:never |not |ever )?(?:going to|gonna) (?:get|be) (?:better|any better|okay|ok|easier)\b|\bit (?:will|is going to) never get better\b|\bnothing (?:will|is going to) ever change\b`, { guard: HOPE_GUARD });
frame('hp-point', 'burden', 3, F`\b(?:what is|whats|what s) (?:even |the actual |really )?the point(?: of (?:anything|it all|living|life|me|any of (?:it|this)|trying|carrying on|going on|getting up))?\b(?= [.,?]|$| anymore| any more| tbh| to be honest| honestly| really| lol| though| tho| even)`, { guard: HOPE_GUARD });
frame('hp-nowhere', 'burden', 3, F`\b(?:do not|have not got|have no|got no) (?:have )?(?:anywhere|anyplace|a place|somewhere) to (?:go|stay|sleep)\b|\bnowhere (?:else )?to (?:go|stay|sleep|turn)\b`, { pre: F`\b(?:anywhere|anyplace|a place|somewhere|nowhere)\b`, guard: /\b(?:holiday|holidays|party|parties|new year|nye|half term|summer|friday night|on saturday|for lunch|for dinner|to eat|to park|park|parking|the weekend|this weekend|interesting|exciting|fun|out with|date)\b/ });
frame('hp-tired-deep', 'burden', 3, F`\b(?:tired|exhausted) in a way (?:that )?(?:sleep|rest|a nap|a holiday) (?:does not|do not|can not|will not|never|wont) (?:fix|help|touch)\b|\b(?:a|the|this) (?:kind of )?(?:tired|exhaustion) (?:that )?(?:sleep|rest) (?:does not|can not|will not|wont) fix\b|\b(?:no amount of|not even) (?:sleep|rest) (?:fixes|helps|touches|can fix|will fix|is going to fix|gets rid of)\b|\bdeeper than (?:any amount of )?sleep\b`, { pre: F`\b(?:tired|exhausted|exhaustion|sleep|rest)\b`, guard: /\b(?:jet lag|newborn|baby|night shift|shifts|insomnia clinic|mattress|pillow|caffeine|hangover)\b/ });
frame('hp-done-only', 'burden', 3, F`^ (?:i am |i am just |i am so |honestly i am |i think i am |i am really )?(?:so |just |completely |totally |really )?(?:done|finished|over it)(?: with (?:it all|everything|life|all of it|this|living))?(?: now)? \. $`);
frame('hp-done-bare', 'burden', 2, F`(?:^ |[.,] )(?:i am )?(?:so |just |completely )?done(?= [.,])`);

// ---- ABUSE and COERCION: the check-in only, never care here ------------------------------------------------------------------
const ABUSE_GUARD = /\b(?:surprise|party|present|presents|gift|gifts|birthday|christmas|secret santa|santa|spoiler|spoilers|ending|plot|book|film|movie|series|episode|recipe|game|quiz|score|crush|who i fancy|thunderstorm|storm|nightmare|nightmares|scared of the dark|cuddle|baby|toddler|little (?:sister|brother)|the cat|the dog|child lock|by accident|keys|my keys|myself out|forgot|to stop me falling|from falling|on the ice|crossing the road|so i would not fall|post office for me|for me (?:every|because|when)|helps me|to help me|because of my (?:knee|hip|eyes|back|legs)|the bank for me|joking|joke|lol|haha|if i am late|if i eat|when (?:she|he|they) finds? out (?:i|about)|baby photos|family group chat|holiday photos)\b/;
frame('ab-tell', 'abuse', 3, F`\bif i (?:ever )?(?:tell|told|say anything to|speak to|talk to) (?:anyone|anybody|someone|mum|dad|my mum|my dad|the teacher|a teacher|you|the police|people)\b (?:[a-z]+ ){0,8}?(?:he|she|they|it) (?:will|would|said|says|is going to|gonna|threatened)\b|\b(?:do not|dont|do not even) (?:know|no) who (?:to tell|i can tell|to talk to about (?:it|this|him|her))\b|\b(?:told|tells|tell) me not to tell (?:anyone|anybody|mum|my mum|dad|my dad|people)\b|\b(?:nobody|no one) (?:would|will) (?:ever )?believe me\b|\b(?:says|said|told me) (?:it is|its) (?:our|a) (?:little )?secret\b|\bour (?:little )?secret\b|\b(?:keep|keeping|kept) (?:it|this|what happens|what he does|what she does|what they do)(?: [a-z]+){0,4}? (?:between us|our secret|a secret|quiet)\b`, { pre: F`\b(?:tell|told|tells|believe|secret|who|say|speak|talk|keep|keeping|kept)\b`, guard: ABUSE_GUARD , nodamp: true });
frame('ab-room', 'abuse', 3, F`\b(?:comes|came|keeps coming|coming|come|creeps|sneaks|let us himself|let us herself|lets himself|lets herself|gets|climbs|visits) (?:in |into |in to )?my (?:room|bed|bedroom)\b ${G(4)}(?:at night|when|while|after|every)?|\b(?:locks|locked|lock|keeps|kept|shuts|shut) me (?:in|out)\b(?: of)?`, { guard: ABUSE_GUARD , nodamp: true });
frame('ab-money', 'abuse', 3, F`\b(?:takes|took|keeps|has taken|kept|controls|won't give me|will not give me) my (?:pension|pension card|bank card|card|money|benefits|wages|passport|phone|own money)\b`, { need: /\b(?:shouts|shouted|will not|won't|refuses|every week|without asking|if i ask|if i tell|threaten|threatens|threatened|put me in a home|hits|hit|scared|afraid|my own money|let me|allowed)\b/, guard: ABUSE_GUARD , nodamp: true });
frame('ab-grab', 'abuse', 3, F`\b(?:grabbed|grabs|grab|squeezed|squeezes|choked|chokes|strangled|strangles|pinned|pins|held) (?:me by )?(?:my|the|me by the) (?:throat|neck|wrist|wrists|arm|hair)\b|\b(?:twisted|twists|twist) my (?:wrist|arm)\b|\bgrabbed me by the (?:neck|throat|hair)\b`, { guard: ABUSE_GUARD , nodamp: true });
frame('ab-pics', 'abuse', 3, F`\b(?:threatened|threatens|threatening|says he will|said he would|says she will|said she would|will|going to|gonna) (?:to )?(?:post|share|send|leak|put up|show) (?:my |the |them|those |all my )?(?:pics|pictures|photos|nudes|videos|them)\b|\bkeeps? asking (?:me )?for (?:pics|photos|pictures|nudes)\b|\b(?:he is|he s|hes|she is|they are) [0-9]{2} and ${G(3)}(?:pics|photos|pictures|nudes|meet up|meet)\b`, { guard: ABUSE_GUARD , nodamp: true });
frame('ab-control', 'abuse', 3, F`\b(?:will not|won't|does not|doesnt|never) (?:let|allow) me (?:eat|phone|call|see|leave|go out|have my|use the phone|use my phone|talk to|speak to|out of)\b|\b(?:says|saying|said|threatening|threatened|threatens) (?:that )?(?:he|she|they) (?:will|would|is going to|gonna|is gonna) (?:kill|hurt|stab|beat|batter) me\b|\b(?:hurt|hit|beat) me (?:again|worse)\b|\b(?:he|she|they|fella|bf|boyfriend|partner|husband|wife|stepdad|stepmum|dad|mum|uncle) (?:beats|beets|batters|kicks|punches|slaps|hits|hurts) (?:me|us)\b|\b(?:i am|i am still|still) (?:covered in|got|have) (?:the )?bruises?\b`, { pre: F`\b(?:let|allow|kill|hurt|stab|beat|batter|hit|bruise|bruises|beats|beets|batters|kicks|punches|slaps|hits|hurts)\b`, guard: ABUSE_GUARD , nodamp: true });

// ---- MODIFIERS: intent, secrecy, a near time --------------------------------------------------------------------------------
frame('in-think', 'intent', 2, F`\b(?:keep|kept|keeps|been|can not stop|cannot stop|always|still|i am|keep on|end up|just|i cant stop|and|then|while) (?:thinking|picturing|imagining|wondering|dreaming|obsessing) (?:about|of|abt)? ?(?:it|that|them|using it|doing it|jumping|the drop|it a lot|it every)\b|\b(?:longer|closer|nearer) than i (?:should|ought to)\b|\b(?:it is |its )?all i (?:can )?(?:think|ever think) about\b|\bpicturing using (?:it|them) on myself\b|\b(?:use|using|used) (?:it|them) on myself\b|\b(?:work|working|worked) up (?:the )?nerve\b|\bfor when (?:it|things|everything) (?:gets?|get) (?:bad|too much|really bad|worse|too loud|too hard)\b|\bi know where (?:the key|the keys|it|he keeps it|they keep it|she keeps it|he hides it) is\b`, { pre: F`\b(?:thinking|picturing|imagining|wondering|dreaming|obsessing|on myself|nerve|for when|know where|longer than|closer than|nearer than|think)\b`, guard: /\b(?:holiday|trip|the job|the offer|the dress|the house|the film|the book|the exam|the game|the party|the dog|puppy|kitten|tattoo|moving|asking her|asking him|the question|proposal|the idea|the menu|dinner)\b/ , nodamp: true });
frame('in-secret', 'intent', 2, F`\b(?:did not|have not|never|not|had not) (?:tell|told) (?:anyone|anybody|a soul|my family|mum|my mum|dad|them|you)(?: (?:what|why|about|where))?\b|\b(?:do not|dont|please do not) ask (?:what|why|me why|me what)\b|\b(?:nobody|no one) (?:knows|needs to know|has to know)\b|\bso (?:nobody|no one|noone) (?:sees|can see|will see|notices|will notice|finds out|asks)\b|\b(?:hiding|hide|hid|hidden) (?:it|this) from (?:everyone|everybody|my family|them|mum|my mum|dad)\b|\bjust curious\b|\b(?:asking|the question is|it is) for (?:a friend|me|myself)\b|\bi am asking (?:about|for) (?:me|myself)\b|\bno reason(?:, just| just)?(?= [.,]|$| just| lol| really)|\bjust wondering\b|\b(?:does not|doesnt|do not|dont) matter why\b`, { pre: F`\b(?:tell|told|ask|knows|know|hiding|hide|hid|hidden|curious|asking|reason|wondering|matter|for|sees|see|notices|notice|finds|asks)\b`, guard: /\b(?:surprise|party|present|gift|birthday|christmas|proposal|propose|ring|engagement|pregnant|pregnancy|baby|crush|plan for (?:mum|dad)|santa|tooth fairy)\b/ , nodamp: true, nojoke: true });
frame('now-near', 'now', 2, F`\b(?!now\b)${NEAR}\b(?! than)`, { pre: F`\b(?:${NEAR})\b`, guard: /\b(?:see you|bed|dinner|tea|home|back|ready|shower|bath|homework|work|school|shift|meeting|class|lesson|party|film|movie|game|match|show|episode|stream|pick up|picking up|shopping|cooking|out with|going out|text you|call you|ring you|talk later|ttyl|brb|gym|run)\b/ });

// ---- DEATH: someone else's death named (never a risk on its own: the gentle path; beside the self ending, joining, a means,
// burden or absence, a known risk: a bereavement, and a suicide bereavement most of all)
frame('death-named', 'death', 1, F`\b(?:(?:my|our) (?:little |big |baby |older |younger |best |late |dear |twin )?${PERSON}s?|he|she|they|mum|mom|dad|grandma|grandad|grandpa|nan|everyone i (?:love|loved)) ${G(2)}(?:died|has died|have died|passed|passed away|is dead|are dead|was killed|killed (?:himself|herself|themselves)|took (?:his|her|their) (?:own )?life|shot (?:himself|herself)|hanged (?:himself|herself)|hung (?:himself|herself)|is gone|has gone|left us|is in heaven|was put down|was put to sleep|overdosed|od|odd|jumped|drowned|is not here anymore|is no longer here|is not with us|died by suicide|ended (?:his|her) life)\b|\b(?:since|after|ever since|now that) (?:my |our )?(?:${PERSON}|he|she|they) ${G(1)}(?:died|passed|went|left|is gone|has gone)\b|\b(?:${PERSON}|husband|wife) (?:gone|passed) [0-9a-z]+ (?:months|weeks|years|days)\b|\b${PERSON}s (?:not here anymore|not here any more|gone|in heaven|no longer here|no longer with us|not with us anymore)\b`, { pre: F`\b(?:died|passed|dead|killed|took|shot|hanged|hung|gone|left|heaven|put|overdosed|od|odd|jumped|drowned|not here|no longer|not with us|ended|went)\b` });

DEATH_ANY = new RegExp(FRAMES.find((f) => f.id === 'death-named').re.source);

// ---- DAMPENERS: weak everyday bounds -----------------------------------------------------------------------------------
const DAMP = new RegExp([
  F`\bsee you (?:all )?(?:on )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|later|soon|next|tonight|then|there|in a bit|at|in the morning|after|at the|when)\b`,
  F`\b(?:for|this|next|at the) weekend\b`, F`\b(?:at|to|from|after|before) (?:work|school|uni|college|class|practice|training|the office)\b(?! (?:up|out) )`, F`\b(?:my|the) (?:shift|office)\b`,
  F`\b(?:my|the|his|her|their|our) (?:train|bus|taxi|uber|lift|ride|flight|plane|ferry) (?:is here|gets in|leaves|is at|is outside|is waiting|home|arrives)\b`, F`\b(?:train|plane|flight|ferry|coach) (?:to|home|back)\b`,
  F`\b(?:on|for|our|my|the|summer|school) (?:holiday|holidays|vacation|trip|hike|honeymoon|gap year|interrailing|camping trip)\b`, F`\b(?:hiking|camping|travelling|traveling|interrailing|backpacking|holidays)\b`,
  F`\b(?:we|i) (?:move|moved|are moving|am moving|will move|will be moving)\b`, F`\bmoving (?:house|abroad|out|to|in)\b`, F`\b(?:the|my|our) (?:lease|contract|tenancy|notice)\b`, F`\bnew (?:job|school|flat|house|city)\b`, F`\bold (?:house|flat|home|school|job|life|phone|laptop|car|uniform)\b`,
  F`\b(?:the|this|my|an|a|our|great|last|next|first) (?:project|level|game|match|exam|exams|essay|assignment|homework|revision|test|quiz|interview|audition|presentation|deadline|meeting|conference|party|wedding|reunion|stream|show|series|episode|film|movie|book|course|module|term|semester|season|race|marathon|competition|tournament)\b`,
  F`\b(?:homework|revising|revision|exams|exam season)\b`, F`\b(?:group chat|discord|the server|twitter|instagram|insta|tiktok|facebook|snapchat|social media|online|offline|my account|this account|the internet|wifi)\b`,
  F`(?<!\b(?:cancelled|canceled|cancelling|canceling|cancel|cut off|stopped|closed|ended) )\b(?:my|the) (?:phone|battery|laptop|charger|computer|console)\b`, F`\bcar is outside\b`,
  F`\b(?:pizza|cake|dinner|lunch|breakfast|snacks|chocolate|leftovers|fridge|the shops|the shop|shopping|supermarket|the gym|my run|football|swimming|the dentist|appointment|haircut|my hair|to bed|alarm|alarms|my coat|picking me up|the parking|pen pals|charity shop|solicitor|plumber|landlord|flatmate|the tent|mile|miles|lap|laps)\b`,
  F`\bhave a (?:lovely|great|good|nice|happy|merry|wonderful|safe) [a-z]+\b`, F`\b(?:this|my|a|the) (?:cold|flu|bug|hangover)\b|\b(?:night shift|knackered|shattered)\b`, F`\b(?:back|home) (?:soon|later|by|at|tomorrow|in)\b`, F`\bbrb\b`, F`(?<!\b(?:helped|worked|lasted|held|helps|help|did|kept me going|was fine|was good) )\bfor a (?:bit|while|few days|week|month)\b`,
  F`\b(?:going|staying|off) (?:to|at|with) (?:my |our )?(?:aunt|auntie|uncle|nan|gran|grandma|grandad|dad|mum|mom|friend|cousin|sister|brother|mates?)s?\b`,
  F`\b(?:the|my|our) (?:team|colleagues|class|club|squad|job|course|students|pupils|boss)\b|\b(?:working with|pleasure|retire|retiring|retirement|leaving do|last day|new chapter|good luck)\b`,
].join('|'));
/**
 * (fix round) A joke ("lol", "jk", "haha", "kidding") dampens only the frame in its own clause, or a sentence made of the joke
 * alone right after it ("i'm gonna kms. jk"): "lol whatever, i won't be around for my exams anyway" keeps the second
 * clause's reading.
 */
const JOKE = F`\b(?:lol|lmao|lmfao|haha|hahaha|hehe|jk|xd|rofl)\b|(?<!\b(?:not|no|never) )\b(?:just kidding|joking|kidding)\b`;
const JOKE_ONLY = new RegExp(F`^ (?:(?:${JOKE}|just|only|i am|im|ok|okay|no|but|lol) )+\. ?$`);
/** How far before its prefilter's word a frame's words can begin (frames() reads a window from there). */
const PRE_REACH = 260;
/** × this in a sentence with a weak everyday bound. */
const DAMPEN = 0.35;

/** Negation before a frame's wish, in its own clause (a frame whose words are a negation does not ask). */
const NEG = /\b(?:not|never|no|nobody|neither|nor|without|stop myself from|resist|refuse to)\b/;
const NEG_PROJECT = /\b(?:not|never|no)\b(?:(?![.,]).)*\b(?:think|thinks|thought|say|says|said|mean|means|meant|believe|believes|imply|implies|assume|assumes|that|saying|pretend|pretending)\s*$/;
const NEG_OK = /\b(?:not|never) (?:only|just)\b|\bnot (?:sure|certain)\b|\bno (?:one|longer)\b|\b(?:can|could) not (?:stop|help) (?:thinking|wanting|wishing)\b|\bdo not know (?:why|how|if|whether)\b|\bnot a day goes by\b/;

/**
 * Every frame in the words. `norm` is already normalised. → { hits, cats, canonical } (cats: the score per frame family
 * after dampening).
 * @param {string} norm
 */
export function frames(norm) {
  const c = canonical(norm);
  const hits = [];
  // sentence spans: dampeners and guards apply within a sentence
  const sentences = [];
  for (let i = 1, start = 0; i < c.length; i++) if (c[i] === '.' && c[i - 1] === ' ') { sentences.push([start, i]); start = i + 1; }
  if (!sentences.length) sentences.push([0, c.length]);
  const sentenceAt = (pos) => { for (let k = 0; k < sentences.length; k++) if (pos <= sentences[k][1]) return k; return sentences.length - 1; };
  const sentText = sentences.map(([a, b]) => c.slice(a, b + 1));
  // the weak everyday bounds in each sentence, as spans (a bound inside a frame's own words is that frame's: "after this weekend")
  const DAMP_G = new RegExp(DAMP.source, 'g');
  const dampAt = sentences.map(([a, b]) => { const out = []; let d; DAMP_G.lastIndex = 0; const s = c.slice(a, b + 1); while ((d = DAMP_G.exec(s))) { out.push([a + d.index, a + d.index + d[0].length]); if (!d[0].length) DAMP_G.lastIndex++; } return out; });
  // (fix round) the jokes in each sentence, as spans: each dampens only the frame in its own clause (no " , " between them), and
  // a sentence that is only a joke dampens the sentence before it
  const JOKE_G = new RegExp(JOKE, 'g');
  const jokeAt = sentences.map(([a, b]) => { const out = []; let d; JOKE_G.lastIndex = 0; const s = c.slice(a, b + 1); while ((d = JOKE_G.exec(s))) out.push([a + d.index, a + d.index + d[0].length]); return out; });
  const jokeOnly = sentText.map((s) => JOKE_ONLY.test(s));
  const joked = (k, at, end) => jokeAt[k].some(([a, b]) => (a < at || b > end) && !c.slice(Math.min(b, at), Math.max(a, end)).includes(' , ')) || !!jokeOnly[k + 1];
  // (fix round) a death named, once; each frame's prefilter (a word its own words cannot do without) before its full pattern
  const deathHere = DEATH_ANY.test(c);
  const words = new Set(c.split(' '));
  const windowsOf = (P) => {
    const ws = [];
    P.lastIndex = 0;
    let pm;
    while ((pm = P.exec(c))) {
      if (!pm[0].length) { P.lastIndex++; continue; }
      const [a, b] = sentences[sentenceAt(pm.index)];
      ws.push([Math.max(a > 0 ? a - 1 : 0, pm.index - PRE_REACH), Math.min(c.length, b + 2)]);
    }
    ws.sort((x, y) => x[0] - y[0]);
    const out = [];
    for (const w of ws) { const last = out[out.length - 1]; if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]); else out.push(w); }
    // a window that starts inside a sentence starts on a letter, so a clause-start pattern never reads its first space
    for (const w of out) if (w[0] > 0 && c[w[0]] === ' ' && c[w[0] - 1] !== '.' && c[w[0] - 1] !== ',') w[0]--;
    return out;
  };
  for (const f of FRAMES) {
    if (f.needsDeath && !deathHere) continue;
    if (f.keys && !f.keys.some((x) => words.has(x))) continue;
    // (fix round) a frame never crosses a sentence break and its words hold its prefilter's word, so in a long message it reads
    // only a window of its sentence around each such word (from PRE_REACH characters before it): the same reading, cheaper
    const long = f.pre && !f.whole && c.length > 2 * PRE_REACH;
    if (f.pre && !long && !f.pre.test(c)) continue;
    if (f.also && !f.also.test(c)) continue;
    // (the message-level conditions before any scan: a slot the frame needs somewhere in the words, a guard read on them all)
    if (f.need && !f.need.test(c)) continue;
    if (f.guard && f.guardAll && f.guard.test(c)) continue;
    const spans = long ? windowsOf(f.preG) : [[0, c.length]];
    for (const [sa, sb] of spans) {
    const sub = sa === 0 && sb === c.length ? c : c.slice(sa, sb);
    f.re.lastIndex = 0;
    let m;
    while ((m = f.re.exec(sub))) {
      if (m[0].length === 0) { f.re.lastIndex++; continue; }
      const at = sa + m.index, end = at + m[0].length;
      const k = sentenceAt(at);
      const sent = sentText[k];
      if (f.guard && !f.guardAll && f.guard.test(sent)) continue;
      // the frame's words and the few after them, against the idioms that are no ending at all
      if ((f.cat === 'end') && END_IDIOM.test(c.slice(Math.max(0, at - 12), Math.min(c.length, end + 40)))) continue;
      if (f.neg) {
        // the negation must govern the wish: inside its own words before the verb, or among the four words just before it in
        // its clause ("i do not want to die", "not that i want to die"; never "mum is not here and i want to be with her")
        const clauseStart = Math.max(c.lastIndexOf(' , ', at), c.lastIndexOf(' . ', at), 0);
        const g = m.groups || {};
        const leadWords = c.slice(clauseStart, at).trim().split(' ').filter((x) => x && x !== ',' && x !== '.');
        const joint = Math.max(...['and', 'but', 'so', 'because', 'then', 'while', 'although', 'though', 'since'].map((j) => leadWords.lastIndexOf(j)));
        const lead = leadWords.slice(Math.max(joint + 1, leadWords.length - 4)).join(' ');
        const before = `${lead} ${g.pre ?? g.pre2 ?? ''} ${g.mod ?? ''} ${g.adv ?? g.adv2 ?? ''}`;
        if (NEG.test(before) && !NEG_OK.test(before)) continue;
        // a negation that governs a thought or a saying the frame sits inside ("i do not want people to think i want to die")
        if (NEG_PROJECT.test(c.slice(clauseStart, at))) continue;
      }
      let w = f.w;
      if (f.needsDeath && !deathHere) continue;
      // (fix round) a frame that goes further with its modifier in the words (self-harm again, or hidden: care)
      if (f.boost && f.boost.re.test(c)) w = Math.max(w, f.boost.w);
      // a goodbye, a thank-you or "i love you" beside a death named is said TO the one who died: grief, never a note
      if (f.toDead && deathHere) w *= DAMPEN;
      // (fix round) an act named only as "it" ("im gonna do it tonight") right beside a death named may be the loss's own task:
      // it is left out of what the words say on their own (indep), so the death rule holds it (support first) instead of care;
      // "end it", "be over" or a means named anywhere ("the pills") stays itself
      const soft = !!f.softByDeath && deathHere && !f.softByDeath.test(m[0]) && !MEANS_WORDS.test(c);
      if (f.self && !/\b(?:i|me|myself|my)\b/.test(sent)) w = Math.min(w, 2);
      // a means held by the self is a little more (my pills, i have saved)
      if (f.cat === 'means' && /\b(?:i|me|my|myself)\b/.test(sent) && f.w >= 3) w += 1;
      // (fix round) a means, self-harm or a near act (the concept frames marked strong) is never dampened below the check-in
      const strong = (f.cat === 'end' && f.w >= 5) || (f.cat === 'means' && w >= 5) || !!f.strong;
      // (a farewell or an absence is bounded by its own sentence or the next: "goodbye everyone. see you monday")
      const near = (f.cat === 'farewell' || f.cat === 'absence') && dampAt[k + 1] ? [...dampAt[k], ...dampAt[k + 1]] : dampAt[k];
      // (fix round) `nodamp`: a place, an object or a time that is part of the frame's meaning ("on the walk home", "for an
      // hour last week") is no everyday bound for it; a joke still dampens it
      if ((!f.nodamp && near.some(([a, b]) => a < at || b > end)) || (!f.nojoke && joked(k, at, end))) w = strong ? Math.max(CHECK_AT, w * 0.6) : w * DAMPEN;
      hits.push({ id: f.id, cat: f.family || f.cat, w, at, end, sentence: k, text: m[0].trim(), ...(f.needsDeath ? { dep: true } : {}), ...(soft ? { soft: true } : {}), ...(f.alias ? { alias: f.alias } : {}) });
    }
    }
  }
  // one reading per stretch of words: where two frames read the same words ("i will be gone": a wish and an absence), the
  // heavier one counts; a time word inside another frame's words is that frame's
  hits.sort((a, b) => b.w - a.w || a.at - b.at);
  const kept = [];
  const overlaps = (k, h) => {
    const o = Math.min(k.end, h.end) - Math.max(k.at, h.at);
    // (fix round) `alias`: a frame of one family that reads another family's concept (giving things away, said as a farewell)
    // is that concept here, so the same words never count twice
    const same = k.cat === h.cat || (k.alias || k.cat) === (h.alias || h.cat);
    return same ? o > 0.5 * Math.min(k.end - k.at, h.end - h.at) : o > 0.8 * Math.max(k.end - k.at, h.end - h.at);
  };
  for (const h of hits.filter((x) => x.cat !== 'now')) if (!kept.some((k) => overlaps(k, h))) kept.push(h);
  // (fix round) a near time inside the words of a lighter frame that is not itself about time ("i won't be using this app
  // after today": an absence and its near time) still counts beside it
  const timeOwn = (k, h) => h.id === 'now-near' && !['end', 'now', 'means', 'harm'].includes(k.cat) && k.w < 5 && k.at <= h.at && k.end >= h.end;
  for (const h of hits.filter((x) => x.cat === 'now')) if (!kept.some((k) => Math.min(k.end, h.end) - Math.max(k.at, h.at) > 0 && !timeOwn(k, h))) kept.push(h);
  kept.sort((a, b) => a.at - b.at);
  // (indep: the families without the death and the frames that read only beside one — what the words say on their own)
  return { hits: kept, cats: catScores(kept), indep: catScores(kept.filter((h) => !h.dep && !h.soft && h.cat !== 'death')), canonical: c };
}

/** A death named beside a self frame adds this (scoreOf). */
const DEATH_BONUS = 3;
/** Three distinct farewells or more (a note's shape) add this. */
const NOTE_BONUS = 2.5;
/** The score per frame family: the best hit and every other distinct one (a note piles them up); a time word counts once. */
function catScores(hits) {
  // (fix round) harm, give and future are families like the others; abuse is the check-in only; intent and final are modifiers
  const cats = { end: 0, means: 0, farewell: 0, burden: 0, absence: 0, reunion: 0, now: 0, decided: 0, plan: 0, death: 0, harm: 0, give: 0, future: 0, abuse: 0, intent: 0, final: 0 };
  for (const h of hits) if (h.id === 'now-decided') cats.decided = Math.max(cats.decided, h.w);
  // (fix round) a plan or a set time (not a bare time word: "can't do it tonight" scopes the inability, it times no act)
  for (const h of hits) if (h.cat === 'now' && h.id !== 'now-near' && h.id !== 'now-time') cats.plan = Math.max(cats.plan, h.w);
  const by = {};
  for (const h of hits) {
    by[h.cat] ||= new Map();
    const prev = by[h.cat].get(h.id);
    if (!prev || prev.w < h.w) by[h.cat].set(h.id, h);
  }
  for (const [cat, m] of Object.entries(by)) {
    const ws = [...m.values()].map((h) => h.w).sort((a, b) => b - a);
    const extra = cat === 'now' || cat === 'death' || cat === 'abuse' || cat === 'intent' || cat === 'final' ? 0 : cat === 'end' || cat === 'absence' || cat === 'reunion' ? 0.5 : 1;
    cats[cat] = ws[0] + ws.slice(1).reduce((s, w) => s + w * extra, 0);
    if (cat === 'farewell') {
      // three or more distinct farewells are a note's shape; a strong one (a goodbye, a last message, letters) with another, a pair
      if (ws.filter((w) => w >= 1).length >= 3) cats[cat] += NOTE_BONUS;
      else if (ws.length >= 2 && ws[0] >= 3 && ws[1] >= 1) cats[cat] += 1;
    }
  }
  return cats;
}

/** How the families combine (each pair once): [a, b, bonus(cats)]. */
// (fix round) a near time (now-near: right now, tonight, in ten minutes, once everyone is asleep) weighs 2 in `now`; beside a
// means, a note, an absence, self-harm or a future without the self it is care's other half
const near = (c) => c.now >= 2;
const BONUS = [
  ['end', 'now', (c) => (near(c) && c.end >= 3 ? 3 : c.end >= 4 ? 2 : 1)], ['means', 'now', (c) => (near(c) ? 3 : 2)], ['farewell', 'now', (c) => (near(c) && c.farewell >= 2 ? 3 : c.farewell >= 3 ? 2 : 1)],
  ['absence', 'now', (c) => (near(c) ? 3 : 2)], ['burden', 'now', (c) => (c.plan >= 2 ? 3 : 0)],
  ['burden', 'end', () => 2], ['absence', 'farewell', () => 2], ['burden', 'absence', () => 2], ['farewell', 'end', () => 2],
  ['farewell', 'burden', () => 1], ['means', 'end', () => 2], ['means', 'farewell', () => 2], ['means', 'burden', () => 2],
  ['means', 'absence', () => 2], ['end', 'absence', () => 1], ['reunion', 'now', () => 1], ['reunion', 'means', () => 2], ['reunion', 'burden', () => 2],
  // (fix round) the concept families' combinations: a means with intent or secrecy; self-harm going on with a near time; things
  // given away, a note or a future without the self, with finality or a decision; a near act with a decision
  ['means', 'intent', (c) => (c.intent >= 2 ? 3 : 0)], ['harm', 'intent', (c) => (c.intent >= 2 ? 3 : 0)], ['harm', 'now', (c) => (near(c) ? 3 : 0)],
  ['harm', 'means', () => 2], ['harm', 'final', (c) => (c.final >= 2 ? 3 : 0)], ['harm', 'end', () => 2], ['harm', 'farewell', () => 2], ['harm', 'burden', () => 1],
  ['give', 'final', (c) => (c.final >= 2 ? 4 : 0)], ['give', 'farewell', () => 2], ['give', 'absence', () => 3], ['give', 'future', () => 2], ['give', 'now', (c) => (near(c) ? 3 : 0)],
  ['give', 'end', () => 2], ['give', 'burden', () => 2], ['give', 'reunion', () => 2],
  ['farewell', 'final', (c) => (c.final >= 2 ? 4 : 0)], ['means', 'final', (c) => (c.final >= 2 ? 3 : 0)], ['absence', 'final', (c) => (c.final >= 2 ? 3 : 0)],
  ['future', 'final', (c) => (c.final >= 2 ? 3 : 0)], ['end', 'final', (c) => (c.final >= 2 ? 3 : 0)], ['reunion', 'final', (c) => (c.final >= 2 ? 3 : 0)],
  ['burden', 'final', (c) => (c.final >= 2 ? 2 : 0)],
  ['future', 'decided', (c) => (c.decided >= 2 ? 3 : 0)], ['absence', 'decided', (c) => (c.decided >= 2 ? 3 : 0)], ['end', 'decided', (c) => (c.decided >= 2 ? 3 : 0)],
  ['reunion', 'decided', (c) => (c.decided >= 2 ? 3 : 0)], ['farewell', 'decided', (c) => (c.decided >= 2 ? 2 : 0)],
  ['future', 'now', (c) => (near(c) ? 3 : 1)], ['future', 'burden', () => 2], ['future', 'farewell', () => 2], ['future', 'end', () => 2], ['future', 'absence', () => 1],
  ['reunion', 'farewell', () => 2],
];
/** The families that add up (the modifiers — now, decided, intent, final — and abuse only ever join one of these). */
const CORE = ['end', 'means', 'farewell', 'burden', 'absence', 'reunion', 'harm', 'give', 'future'];
/**
 * A score from the families' scores. A time word adds only beside another family; a firm decision alone is a check-in; abuse
 * and coercion are the check-in at most, never care here (fix round: the lexicon's abuse care stays as it is).
 */
export function scoreOf(cats) {
  const core = CORE.reduce((s, k) => s + (cats[k] || 0), 0);
  const floor = (cats.abuse || 0) >= 2 ? CHECK_AT : 0;
  if (core < 1) return Math.max(floor, cats.decided >= 2 ? CHECK_AT : 0);
  let s = core;
  for (const [a, b, f] of BONUS) if (cats[a] >= 1 && cats[b] >= 1) s += f(cats);
  s = Math.max(s, floor);
  // a death named beside the self ending, joining, a means, a burden or an absence: a bereavement's known risk, raised to the
  // check-in at most (beside a loss: support first, no world, nothing sent; never care from the death alone: "my dad died, i
  // want out", "dad died and im gonna do it tonight" and "writing goodbye letters" after a death are held, not care)
  // (DECISIONS.md: a death, then words about ending, joining or following that are less clear: the gentle path with support
  // first, held; care only when the words are care without the death, or the grief rules read the clause as explicit)
  if (cats.death >= 1 && s < CARE_AT && (cats.end >= 2 || cats.means >= 3 || cats.burden >= 3 || cats.absence >= 3 || cats.farewell >= 4)) s = Math.min(s + DEATH_BONUS, CARE_AT - 0.01);
  return s;
}
const levelOf = (s) => (s >= CARE_AT ? 'care' : s >= CHECK_AT ? 'check' : null);
/** These words say something of the self after a means question ("it's for me", "for a person my weight", "no reason"). */
const SELF_REF = /\b(?:for me|asking for (?:me|myself)|i mean|(?:someone|a person|somebody) (?:my|of my) (?:size|weight)|my (?:size|weight)|i need to|i just need|i have to|i want|i am going|i will|myself|no reason|just wondering|just asking|just curious|does not matter why|do not ask|need to get|one way|a return)\b/;

/**
 * The screener's reading of one Tell, with the visit's earlier Tells as context.
 * @param {string} text
 * @param {{ history?: string[] }} [opts]
 * @returns {{ level: 'care' | 'check' | null, score: number, cats: Record<string, number>, hits: any[], context: boolean, normalised: string }}
 */
const READ_CACHE = new Map();
/** frames(normalise(text)), remembered for the last few texts (pure: the same words always read the same). */
function readOf(text) {
  const key = String(text ?? '');
  let r = READ_CACHE.get(key);
  if (r) { READ_CACHE.delete(key); READ_CACHE.set(key, r); return r; }
  const norm = normalise(key);
  r = { norm, fr: frames(norm) };
  READ_CACHE.set(key, r);
  if (READ_CACHE.size > 48) READ_CACHE.delete(READ_CACHE.keys().next().value);
  return r;
}
export function riskScreen(text, { history = [] } = {}) {
  const { norm, fr: own } = readOf(text);
  const ownScore = scoreOf(own.cats);
  let score = ownScore, context = false, cats = own.cats;
  // context: only when these words carry a frame of their own (an ordinary message after a heavy one never inherits care)
  const hasOwn = Object.values(own.cats).some((v) => v >= 1);
  const past = (Array.isArray(history) ? history : []).filter((h) => typeof h === 'string' && h.trim()).slice(-HISTORY);
  if (hasOwn && past.length) {
    // (fix round) the earlier Tells' frames and these words' together, as if said in one message (each frame once, at its
    // heaviest): "the letters are written" … "they'll be found in the morning" combine as they would in one Tell. A means or plan
    // question asked earlier (mn-q: which block is highest, is the roof open after dark, the most potent pills) counts as a means
    // at the check-in's weight once these words say something of the self or of finality ("it's for me", "won't need a
    // ticket back", "i only need to get up there once it's dark").
    const selfNow = own.cats.intent >= 1 || own.cats.final >= 1 || own.cats.now >= 2 || CORE.some((k) => own.cats[k] >= 1) || SELF_REF.test(own.canonical);
    const earlier = past.flatMap((h) => readOf(h).fr.hits).map((x) => (x.id === 'mn-q' && selfNow ? { ...x, w: Math.max(x.w, CHECK_AT) * HISTORY_WEIGHT } : { ...x, w: x.w * HISTORY_WEIGHT }));
    const mixed = catScores([...own.hits, ...earlier]);
    // (a time word alone, "see you tomorrow", raises them to the check-in at most: never care from what was said before)
    const weakOnly = Object.entries(own.cats).every(([k, v]) => k === 'now' || v < 1) && !own.hits.some((h) => h.cat === 'now' && h.w >= 2 || h.id === 'now-ready');
    const s = Math.min(scoreOf(mixed), weakOnly ? CARE_AT - 0.01 : Infinity);
    if (s > ownScore) { score = s; context = true; cats = mixed; }
  }
  // (DECISIONS.md) beside a death named, care stands only on what the words say without it (a death, then words about ending,
  // joining or following that are less clear: the gentle path with support first; the grief rules read the explicit clauses)
  if (own.cats.death >= 1 && score >= CARE_AT && !context && scoreOf(own.indep) < CARE_AT) score = CARE_AT - 0.01;
  return { level: levelOf(score), score: Math.round(score * 100) / 100, cats, hits: own.hits, context, normalised: norm };
}
