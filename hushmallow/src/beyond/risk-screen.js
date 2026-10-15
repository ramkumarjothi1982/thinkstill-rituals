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
//   normalise(text)                → the words in one spelling: lowercase, accents stripped, zero-width removed and emoji
//                                    spaced, 3+ repeated letters collapsed (diiie → die), leet read inside words (k1ll →
//                                    kill), spaced letters joined (d i e → die), texting expanded (u, ur, im, cant, wanna,
//                                    imma, idk, rn, 2nite …), and tokens FUZZY-CORRECTED against the closed key vocabulary
//                                    (Damerau–Levenshtein ≤ 1 for 4–6 letters, ≤ 2 for 7+; ≤ 3 letters only through the
//                                    explicit typo map: dei → die, kil → kill …), never an ordinary word on the protected list
//                                    (diet, dine, wife, like, lift, kiln …). Punctuation stays, so every other rule reads it too.
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
// Pure ES module, no imports, no DOM, deterministic, cheap (< 10 ms at the Tell's 600 characters). The server keeps a
// byte-identical copy (hushmallow/server/another-angle/src/safety/risk-screen.js, `npm run sync:screen`; its test fails while
// the two differ), so a client that skips its own check-in still meets the same reading there.

export const VERSION = 'risk-screen-1';
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

const ZW = /[​-‏⁠-⁤﻿­᠎]/g;
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

/** Runs of 3+ single letters set apart by spaces, dots or dashes ("d i e", "k.i.l.l", "s-u-i-c-i-d-e"). */
const SPACED = /(?<![a-z0-9])[a-z](?:[ .\-_*]{1,2}[a-z](?![a-z0-9])){2,}/g;
function joinSpaced(s) {
  return s.replace(SPACED, (run) => {
    const letters = run.replace(/[^a-z]/g, '');
    const ok = (w) => VOCAB.has(w) || (w.length >= 4 && fuzzy(w));
    if (ok(letters)) return letters;
    // a word before or after the run ("i d i e", "d i e i"): only the word's own letters join
    if (/^[iau]/.test(letters) && ok(letters.slice(1))) return `${letters[0]} ${letters.slice(1)}`;
    if (/[iau]$/.test(letters) && ok(letters.slice(0, -1))) return `${letters.slice(0, -1)} ${letters.at(-1)}`;
    return run;
  });
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
  let s = String(text ?? '').slice(0, 2000).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // zero-width characters: inside a key word they are hiding it (d\u200bie), elsewhere they are a space
  s = s.replace(ZW, '\u0001').replace(/[a-z]+(?:\u0001+[a-z]+)+/g, (w) => { const j = w.replace(/\u0001/g, ''); return VOCAB.has(j) || fuzzy(j) ? j : w; })
    .replace(/\u0001+/g, ' ').replace(EMOJI, ' ').replace(/[‘’‛ʼ`´]/g, "'").replace(/[“”„‟]/g, '"');
  s = joinSpaced(s);
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
  F`\bdie for (?:a|an|some|this|that|those|these|the)\b`, F`\b(?:would|had|id|i would) (?:rather|sooner) (?:die|be dead) than\b`,
  F`\bdead (?:lol|lmao|haha|hahaha|tired|beat|on my feet|meat|serious|set|right|easy|good|funny|cute|ass|centre|center|end|line|lines|weight|battery|phone|zone|heat|calm|quiet|still|wrong|last|even|ringer)\b`,
  F`\b(?:die|dead|dying|kill myself|died) (?:lol|lmao|haha|hahaha|jk|xd)\b`, F`\b(?:lol|lmao|haha) (?:i want to|i will|i am going to) (?:die|kill myself)\b`,
  F`\b(?:die|dead) (?:if|when) (?:he|she|they|anyone|someone|somebody|my|mum|mom|dad|you|people|everyone) ${G(1)}(?:(?:see|sees|saw) me|(?:find|finds|found) out|(?:hear|hears|heard) about|knows?|says?|asks?|calls?|gets? home)\b`,
  F`\bkill(?:ed|ing)? (?:it|that|this) (?:at|on|in|today|tonight|last)\b`,
  F`\bend (?:it|things|this) (?:with|between)\b`, F`\bend (?:this|the) (?:call|meeting|conversation|chat|game|essay|day|week|month|year|lesson|session|stream|relationship|friendship|contract|lease|subscription|thread|story|chapter)\b`,
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
const frame = (id, cat, w, src, opt = {}) => FRAMES.push({ id, cat, w, re: new RegExp(bounded(src), 'g'), ...opt });
const WISH_HEAD = F`(?:${SELF}(?<pre>${GS(4)})|${START})(?<mod>${MOD}) (?:to )?(?<adv>${ADV})`;

// ---- END: the self ending -----------------------------------------------------------------------------------------
frame('end-wish', 'end', 6, F`${WISH_HEAD}(?:${END_STRONG})\b`, { neg: true });
frame('end-wish-mid', 'end', 4, F`${WISH_HEAD}(?:${END_MID})\b`, { neg: true });
frame('end-wish-soft', 'end', 3, F`${WISH_HEAD}(?:${END_SOFT})(?= [.,]| (?:forever|for good|now|tonight|today|soon|already|anymore|any more|from (?:this|it all|everything|life)|so (?:bad|much))\b)`, { neg: true });
frame('end-ideate', 'end', 6, F`${SELF}(?<pre>${GS(4)})${IDEATE} (?:about |of |up |on )?(?<adv>${ADV})(?:${END_GER_STRONG})\b`, { neg: true });
frame('end-ideate-soft', 'end', 3, F`${SELF}(?<pre>${GS(4)})${IDEATE} (?:about |of |up |on )?(?<adv>${ADV})(?:${END_GER_SOFT})\b`, { neg: true });
frame('end-tried', 'end', 4, F`${SELF}(?<pre>${GS(2)})${PAST_TRY} (?:to )?(?<adv>${ADV})(?:${END_STRONG})\b|${SELF}(?<pre2>${G(1)})(?:nearly|almost|tried to|attempted to) (?:killed myself|died|ended my life|took my life|overdosed|hanged myself|ended it)\b(?! (?:laughing|on|at|in|falling|tripping|slipping|with|by|driving|cycling|running|trying|when|from|of))`, { neg: true });
frame('end-future', 'end', 6, F`\b(?:i will|i would|i am going to|i shall|i will soon|i am gonna) (?<adv>${ADV})(?:be dead|die|not be alive|not wake up|never wake up|not make it through (?:the night|tonight|the week))\b`, { neg: true });
frame('end-future-gone', 'end', 4, F`\b(?:i will|i am going to|i shall|i would) (?<adv>${ADV})(?:be gone|be at peace|be out of (?:the picture|the way|your way|everyones way)|be too late|be over for me)\b`, { neg: true });
frame('end-state', 'end', 4, F`(?<!\b(?:when|once|after|if|before|time|since|that) )\bi am (?:already |long |finally |probably )?(?:gone|no longer here|not here anymore)\b(?= [.,]| (?:by|when|before|now|already|and|so)\b)`);
frame('end-cond', 'end', 3, F`\bif i (?:died|was dead|were dead|was gone|were gone|disappeared|vanished|killed myself|was not here|were not here|was not around|were not around|did not wake up|never woke up|was never born|had never been born|left forever|just died)\b`);
frame('suicidal', 'end', 6, F`\b(?:i am|i feel|i have been|feeling|been feeling|i get|i keep getting|i keep feeling|i was|i am getting) ${ADV}(?:so |very |really |quite |pretty |super |extremely )?suicidal\b|\bsuicidal (?:thoughts|feelings|ideation|urges|again|tonight|today|right now)\b|\bmy (?:suicide|suicide note)\b|\b(?:i|me) ${G(3)}(?:write|wrote|writing|written|left|leave|finished) ${G(1)}(?:a |my )?suicide note\b|\b(?:i have|i get|i keep having|i keep getting|having|i am having) ${G(2)}thoughts (?:of|about) (?:suicide|dying|death|killing myself|ending it|ending my life)\b`, { neg: true });
frame('suicide-answer', 'end', 6, F`\b(?:suicide|dying|death|killing myself) is (?:the |my )?(?:only|best|answer|way out|only way|only option|only answer|easiest)\b|\b(?:only|best|easiest) (?:way out|option|answer|choice) (?:is|left is) (?:suicide|death|to die|dying|killing myself|to end it)\b`);
frame('end-howto', 'end', 6, F`\bhow (?:to|do i|do you|can i|could i|would i|should i|would you|does one|easy is it to|hard is it to|painful is it to|long does it take to|long would it take to|quickly can you) ${G(3)}(?:die|kill myself|kill yourself|end my life|end it all|overdose|od|hang myself|hang yourself|drown yourself|drown myself|tie a noose|slit|suffocate|bleed out|commit suicide|suicide)\b|\b(?:is it|would it be|will it be) (?:painless|quick|easy|peaceful|possible|painful|hard) to (?:die|drown|hang|overdose|od|bleed out|suffocate|kill yourself|kill myself)\b`);
frame('it-over', 'end', 2, F`\b(?:it|this|everything|all of this|all this|it all|this all) (?:will|is going to|would|shall) ${ADV}(?:all )?be (?:over|too late)\b(?! (?:by|after|at|in|on|before|once|when|soon enough|tomorrow afternoon|for (?:the|this|today)))`);
frame('not-live', 'end', 6, F`${SELF}${G(3)}(?:do not|did not|no longer|never|really do not|honestly do not|just do not|can not|am not|will not) ${ADV}(?:want|wanna|wish|feel like|have (?:a|any) reason to|have the strength to|have the energy to|think i can|think i will|deserve) (?:to )?${ADV}(?:live|living|be alive|being alive|exist|existing|keep living|stay alive|be on this earth|be in this world)\b(?! (?:in|at|with|near|there|here|abroad|together|on my own|alone|next|like that|without (?:wifi|internet|my phone)))`);
frame('stopped-wanting', 'end', 5, F`${SELF}${G(2)}(?:stopped|have stopped|no longer|do not even) (?:wanting|want) to (?:live|be alive|exist|be here|carry on|go on)\b`);
frame('not-here', 'end', 4, F`${SELF}${G(3)}(?:do not|did not|no longer|never|really do not|honestly do not|just do not|can not|am not) ${ADV}(?:want|wanna|wish|feel like|see (?:the|any) point in|see a reason to|see myself|see a future|have (?:a|any) reason to|deserve) (?:to )?${ADV}(?:be here|being here|be around|wake up|waking up|see tomorrow|make it to|making it to|survive|go on|going on|carry on|keep going|continue|last much longer|be part of this world|stay|try anymore|keep trying|be anywhere|exist anymore)\b(?! (?:at|for|when|with|today|tonight|in this|on this|this weekend|early|so early|until|till|before|in time|on time|in the morning|tomorrow morning|the party|at the party|on this team|in this job|in this house|in this flat|in this town))`);
frame('wish-gone', 'end', 4, F`${SELF}${G(2)}(?:wish|wished) i (?:was|were|had) (?:never|not) (?:been )?born\b|${SELF}${G(2)}(?:wish|wished) i (?:was|were|could be) (?:dead|gone|not here|not alive|never here|asleep forever)\b(?! (?:to|for|on|out|home|already (?:home|there)))`);
// with no wish or plan word: the self's own reflexive ending ("kill myself tonight"), or a present-tense ending with its time
const END_REFLEX = F`kill myself|end my life|end my own life|take my life|take my own life|hang myself|shoot myself|drown myself|poison myself|overdose|unalive myself|off myself|top myself|commit suicide|kill my self|slit my wrists`;
frame('end-bare', 'end', 5, F`(?:${SELF}(?<pre>${G(2)})|${START})(?:${END_REFLEX})\b(?! (?:for (?:forgetting|being|not|doing|saying|missing|losing|that|this|it)|over (?:this|that|it)|if (?:i|he|she|they|you|my)|laughing))`, { neg: true });
const NOW_W = F`(?:tonight|today|now|soon|tomorrow|this weekend|at midnight|once and for all|by morning|this week)`;
frame('end-present', 'end', 4, F`${SELF}(?<adv>${ADV})(?:end it|end things|end everything|end it all|die|end my life|leave this world)(?= [.,])`, { neg: true });
frame('end-present-timed', 'end', 6, F`${SELF}(?<adv>${ADV})(?:die|end my life|kill myself|leave this world|end it all) ${NOW_W}\b|\b${NOW_W} ${G(1)}i ${ADV}(?:die|end my life|kill myself|leave this world|end it all|go to sleep forever)\b`, { neg: true });
frame('end-present-timed-mid', 'end', 5, F`${SELF}(?<adv>${ADV})(?:end it|end things|end everything) ${NOW_W}\b|\b${NOW_W} ${G(1)}i ${ADV}(?:end it|end things|end everything)\b`, { neg: true });
frame('end-leaving', 'end', 4, F`\bi am (?:leaving|going|going away|disappearing|checking out) (?:forever|for good|for ever|this world|this life)\b`, { neg: true });
frame('end-ready-go', 'end', 2, F`\bi am (?:so |finally |now )?ready to (?:go|leave|die|be with (?:him|her|them)|join (?:him|her|them))(?= [.,]| now\b)`, { guard: /\b(?:coat|taxi|car|uber|when you are|home|out|shops|school|work|are you|nearly done|lift|bus|train|airport|party|outside)\b/ });
// joining someone gone: a reunion with the dead, or to come (the grief rules read it beside a death named)
const AFTER = F`(?:up there(?! (?:on|at|in|by|with|near|for))|in heaven|on the other side(?! of)|in the ground|in the grave|in (?:his|her|their) grave|where (?:he|she|they) (?:went|is|are|has gone)|wherever (?:he|she|they) (?:went|is|are)|in the next life|in the afterlife|over the rainbow bridge)`;
const REUNION = F`(?:be with|join|joining|meet|meeting|see|seeing|follow|following|go to|go home to|go be with|be reunited with|rest beside|rest next to|lie (?:down )?(?:beside|next to|with)|cross over to|go where)`;
const REUNION_GUARD = /\b(?:good luck|mate|move|moving|exam|exams|surgery|op|operation|holiday|wedding|hill|stage|balcony|roof|top floor|loft)\b/;
frame('reunion-after', 'end', 6, F`${SELF}${G(3)}(?:${MOD}|will|am going to|am|shall) (?:to )?${ADV}${REUNION} ${G(2)}${AFTER}\b|\b(?:going|gonna) (?:to )?${ADV}${REUNION} ${G(2)}${AFTER}\b(?! of)`, { neg: true, guard: REUNION_GUARD });
frame('reunion-time', 'end', 3, F`${SELF}${G(3)}(?:${MOD}|will|am going to|shall) (?:to )?${ADV}(?:join|follow|be with|go be with|be joining|see|be seeing|go and see) (?:him|her|them|my ${KIN}|${KIN}) ${G(1)}(?:soon|tonight|very soon|today|now|i promise)\b(?! (?:,|\.)? (?:(?:his|her|their|the) (?:train|bus|flight|plane)|she is|he is|they are|when (?:she|he|they) (?:gets|get|comes|come)|at the|in the|after (?:school|work)|on (?:the|monday|friday)))|\b(?:going|gonna) (?:to )?(?:join|follow|meet|see) (?:my |him|her|them)${G(1)}(?:${KIN} )?(?:again )?(?:tonight|soon)\b`, { neg: true, family: 'reunion', guard: /\b(?:just went|went to (?:get|the)|tickets|shop|toilet|car park|bar|queue|picking me up|train|bus|flight|plane|be there in|on (?:his|her|my|their) way|at the (?:corner|shop|station)|after (?:school|work)|for (?:dinner|lunch|tea|drinks)|party|holiday|wedding|date|visit|visiting|cousin|baby cousin|boyfriend|girlfriend)\b/ });
// beside a death named (the DEATH family below), the self joining, following or going after the one who died; on their own
// these are longing ("i want to be with her"), and count for nothing
/** A pronoun for the one who died, with nothing after it that makes it someone else's ("her family", "him on his birthday"). */
const GONE_ONE = F`(?:him|her|them|u|you)(?= [.,]| (?:again|forever|for ever|for good|soon|now|tonight|today|too|up there|in heaven|so bad|so much|more than anything|already|wherever|properly|and i|but i|so i|i)\b)`;
frame('reunion-went', 'end', 5, F`\b(?:go|be|going|went) (?:to )?(?:where|wherever) (?:he|she|they) (?:went|is|are|has gone|have gone)\b(?! (?:buried|laid to rest|laid|resting|scattered|remembered|on the|at the|in the (?:garden|cemetery|churchyard|park)))|\b(?:be|lie|lay|rest|sleep|lie down) (?:down )?(?:in the (?:ground|grave)|in (?:his|her|their) grave|on (?:his|her|their|[a-z]+s) grave)\b(?: with (?:him|her|them))?(?! (?:to (?:talk|tell|read|sing|chat|visit|leave|put|lay flowers)|for (?:a while|an hour|a bit|his|her)|and (?:talk|cry|read|tell)))|${SELF}${G(2)}(?:want|wanna|need|would like|wish i could|am ready|am going) to (?:go|be) (?:too|there)(?= [.,])|\bgo the way (?:he|she|they) did\b|\b(?:cross over|go home|cross) to ${GONE_ONE}|\bi am coming(?: to (?:you|him|her|them))?(?= [.,]| (?:soon|now|tonight|son|mum|dad|my love)\b)`, { needsDeath: true, neg: true, guard: /\b(?:funeral|memorial|wake|service|army|school|work|house|party|choir|support group|family|cousins|kids|children|grew up|used to (?:live|walk|go))\b/ });
frame('reunion-bare', 'end', 3, F`${SELF}${G(3)}(?:${MOD}|will|am going to|shall|keep praying to|pray to|long to) (?:to )?${ADV}(?:be with|follow|folow|be reunited with|lie (?:down )?(?:beside|next to)|rest beside|rest next to|swap places with|take (?:his|her|their) place with) ${GONE_ONE}|\bwait for me(?= [.,]| (?:my love|up there|i am coming|darling)\b)|\b(?:i will|i would|i am going to|i shall) be (?:the )?next(?: one)?(?= [.,]| (?:to go|to die|soon)\b)|\b(?:it is|its|it will be) my turn(?= [.,]| (?:now|next|soon|tonight)\b)|\b(?:if|whether) i should (?:too|as well|do the same|do it too)\b|\bplanning (?:mine|my own)(?= [.,])|\bdoing it (?:in|at) the same (?:place|way|garage|room|spot|bridge)\b`, { needsDeath: true, neg: true, family: 'reunion' });
frame('end-let-me', 'end', 5, F`\b(?:let me|please let me|just let me) ${ADV}(?:die|be dead|go to (?:him|her|them|sleep forever)|not wake up)\b|\b(?:god|someone|something|death) (?:to )?(?:take|takes|took) me\b|\btake me (?:too|instead|now|home|with (?:you|him|her|them))\b|\b(?:better|happier|easier) (?:off )?dead\b|\b(?:wish|wished) (?:i had|i would have|it had been me|it was me) ${ADV}(?:died|been the one|gone instead|instead)\b|\bit should have been me\b|\b(?:hope|hoping|pray|praying) (?:that )?i (?:do not|never|will not|would not) (?:make it|wake up|see|last)\b|\b(?:pray|praying|hope|hoping|wish|wishing) (?:that )?(?:my heart|i) (?:just )?(?:stops|stop|gives out|gives up|would stop|will stop|stopped|stop breathing)\b(?! (?!breathing|beating)[a-z]+ing)|\b(?:want|wish|need|just want) (?:for )?my heart to (?:just )?stop\b(?! (?:hurting|aching|breaking|racing|pounding|feeling))|\band never get (?:up|back up)(?: again)?\b`, { neg: true });
frame('end-do-it', 'end', 3, F`${SELF}${G(2)}(?:going to|gonna|will|want to|am ready to|ready to|am about to|about to|have to|need to) (?:just )?(?:do it|go through with it)\b(?= [.,]| (?:tonight|today|now|soon|this time|for real|i promise|properly)\b)`, { guard: /\b(?:homework|exam|test|essay|dishes|washing|laundry|presentation|interview|ask (?:her|him)|tell (?:her|him|them|mum|dad)|bungee|skydive|skydiving|marathon|tattoo|piercing|haircut|later|tomorrow morning)\b/ });
frame('end-leaving-soon', 'end', 2, F`\bi am (?:checking out|leaving|signing off|logging off) (?:soon|tonight|for good|forever|now)\b`, { needsDeath: true });
frame('see-other-side', 'end', 3, F`\bsee you (?:all )?on the other side\b(?! of)`);

// ---- MEANS: a method held by the self ---------------------------------------------------------------------------------
const DRUG = F`(?:pills|pill|tablets|tablet|meds|medication|medications|medicine|medicines|painkillers|paracetamol|tylenol|ibuprofen|aspirin|insulin|sleeping pills|antidepressants|prescriptions|prescription|codeine|morphine|oxycodone|oxy|benzos|benzo|diazepam|valium|xanax|anti depressants|heart pills|blood thinners|lithium|sertraline|citalopram|fluoxetine|co codamol|cocodamol|zopiclone|sleeping tablets)`;
const HOARD = F`(?:saved|saving|save|save up|saving up|saved up|stockpiled|stockpiling|stockpile|hoarded|hoarding|hoard|collected|collecting|stashed|stashing|hidden|hid|hiding|lined up|lining up|kept back|keeping back|put aside|putting aside|set aside|setting aside|enough|all of|all the|all my|the whole|whole (?:bottle|box|packet|pack|strip)|every last|bottles of|boxes of|packets of|a stash of|my stash|the rest of)`;
/** Pills for an ordinary purpose: never a means. */
const MEANS_PURPOSE = /\b(?:for the week|into (?:the|my|a) (?:organiser|organizer|pill box|pillbox|dosette|box)|in (?:the|my|a) (?:pill box|pillbox|organiser|organizer|dosette|cabinet|bathroom|cupboard)|like the doctor said|the doctor (?:said|told)|so i do not run out|so i will not run out|for (?:the|my|a|our) (?:trip|holiday|holidays|flight|week away|journey|travels|time away)|for travel|while i am away|pharmacy|chemist|prescription refill|repeat prescription|for my (?:cold|headache|period|back)|the right dose|my dose)\b/;
frame('means-hoard', 'means', 5, F`\b${HOARD} ${G(4)}${DRUG}\b|\b${DRUG} ${G(5)}${HOARD}\b`, { guard: MEANS_PURPOSE });
frame('means-count', 'means', 3, F`\b(?:counted|count|counting|counted out|counting out) ${G(3)}${DRUG}\b`, { guard: MEANS_PURPOSE });
frame('means-take-all', 'means', 6, F`\b(?:take|taking|took|swallow|swallowing|swallowed|down|downing|downed|neck|necked|have taken|just took|just taken) ${G(1)}(?:all|all of|the whole|whole|every|a whole|loads of|lots of|too many|a handful of|handfuls of|a bottle of|a box of|a packet of|twenty|thirty|forty|fifty|a hundred|[0-9]{2,}) ${G(2)}${DRUG}\b|${SELF}${G(3)}(?:overdose|overdosed|overdosing|od|odd|oded|am overdosing)\b|\b(?:an|a) overdose\b`, { neg: true });
frame('means-take-rest', 'means', 4, F`\b(?:take|taking|use|using|have|swallow) (?:the rest of|what is left of|all of|whatever is left of) (?:his|her|their|dads|mums) (?:stuff|pills|meds|tablets|drugs|gear|medicine|medication|prescription)\b`);
frame('means-howmany', 'means', 6, F`\bhow (?:many|much) ${G(2)}${DRUG} ${G(4)}(?:would|will|does|do|to|is|are|it) ${G(2)}(?:take|kill|be lethal|be fatal|be enough|lethal|fatal|enough|overdose|die)\b|\b(?:what happens if|what if) (?:you|i|someone) (?:take|took|swallow|swallowed) ${G(2)}(?:all|loads|lots|a lot|too many|[0-9]{2,}|twenty|thirty|fifty|a bottle|a box|the whole) ${G(2)}${DRUG}\b|\b(?:lethal|fatal) (?:dose|amount)\b`);
frame('means-stop-meds', 'means', 3, F`${SELF}${G(3)}(?:stopped|stop|quit|have stopped|have quit|am not|not been|have not been|refuse to keep|will not keep) ${ADV}(?:taking|having|using|injecting) ${G(1)}(?:insulin|meds|medication|medicine|tablets|pills|antidepressants|heart pills|blood thinners|lithium)\b(?! (?:because|since|as|after|when) (?:they|it|the doctor|my doctor|of))`);
frame('means-method-decided', 'means', 3, F`${SELF}${G(2)}(?:have decided how|decided how|have worked out how|worked out how|know how i will|know how i am going to|know where i will|know where i am going to)\b|${SELF}${G(1)}know (?:how|where|when)(?= [.,])|${SELF}${G(1)}know (?:how|where) (?:to do it|i will do it|i am going to do it|i will go)\b`);
frame('means-on-purpose', 'means', 2, F`\b(?:on purpose|deliberately|so that it stops|so it will all stop|to see what happens|so i can be with)\b`);
frame('means-ligature', 'means', 5, F`\b(?:tie|tied|tying|make|made|making|bought|buy|buying|got|have|get) ${G(2)}(?:a |the )?noose\b|\bnoose\b|\b(?:rope|belt|cord|cable|ligature|scarf|dressing gown cord) ${G(4)}(?:round|around|to) (?:my|the) (?:neck|beam|ceiling|loft hatch|banister|bannister|door)\b|\b(?:hang|hanging|hung) (?:myself|from (?:the|a) (?:beam|ceiling|banister|bannister|tree|door|loft))\b|\bstrong enough to (?:hold|take) (?:me|my weight)\b`);
frame('means-rope', 'means', 3, F`${SELF}${G(2)}(?:bought|got|have|ordered|found) ${G(1)}(?:a |some |the )?(?:rope|belt|cord|cable|ligature)\b`, { guard: /\b(?:tent|camping|climbing|boat|swing|washing line|garden|craft|crafts|skipping|dog|lead|trousers|jeans|dress|outfit|bag|parcel|delivery|tie down|tow|luggage|hammock|gym|yoga)\b/ });
const HIGH = F`(?:bridge|roof|rooftop|ledge|cliff|cliffs|cliff edge|edge|platform|platform edge|tracks|track|railway|railway line|train line|trains|motorway|tower|tower block|car park|multi storey|balcony|top floor|sea|river|canal|lake|reservoir|traffic|oncoming traffic|quarry|dam|viaduct|overpass|flyover|parapet)`;
frame('means-height', 'means', 4, F`${SELF}${G(2)}(?:keep|kept|have been|been|keep going|keep walking|keep driving|keep looking|keep staring) ${G(1)}(?:going|walking|driving|looking|staring|standing|sitting|thinking about|hovering|lingering|stood|sat|leaning)? ?(?:on|at|near|over|off|onto|by|to|from|under|down at|out at|too close to|close to|on the edge of|at the edge of|over the edge of|the edge of|near the edge of) ${G(2)}${HIGH}\b(?! (?:station|stop|timetable|times|ticket|tickets|journey|was|is|got|will|to (?:work|school|uni|town|london|see)|home|ride|trip|view|views|walk|path|cafe|pub|bar|restaurant|shop|at sunset|for (?:a|the) (?:photo|view|train|bus)))|${SELF}${G(2)}(?:am|was|have been|been|keep|kept) ${G(1)}(?:standing|sitting|stood|sat|hovering|leaning) ${G(1)}(?:on the edge of|at the edge of|over the edge of|near the edge of|on the wrong side of|on (?:the|a) (?:ledge|parapet|railing|railings)|too close to|right at the edge of)\b`, { guard: /\b(?:fixing|repairing|cleaning|painting|working|gutter|aerial|satellite|tiles|photo|photos|view|views|sunset|sunrise|fireworks|waiting for (?:the|my|a) (?:train|bus))\b/ });
frame('means-height-act', 'means', 4, F`\b(?:jump|jumping|step|stepping|throw myself|throwing myself|lie|lying|walk|walking|run|running|fall|falling) (?:off|from|in front of|under|onto|into|in to|over|out into|out in front of) (?:a|the|that|this|my|oncoming|an) ?${G(1)}(?:bridge|roof|rooftop|ledge|cliff|building|tower|tower block|balcony|car park|multi storey|train|trains|tracks|railway|lorry|truck|bus|motorway|traffic|reservoir|quarry|viaduct|overpass)\b(?! (?:to (?:get|catch|see)|for (?:fun|a photo|a dare|charity)|at the (?:lido|pool)|in the summer))|\b(?:drive|driving|crash|crashing|steer|steering|swerve|swerving) ${G(1)}(?:my car |the car |it )?(?:into|off|in to|over) (?:a|the|that|this|oncoming|an) ?${G(1)}(?:wall|tree|lorry|truck|bus|river|sea|canal|lake|cliff|bridge|traffic|barrier|motorway|edge)\b|\bcrash(?:ing)? (?:my|the) car\b(?! (?:into the (?:kerb|curb|gate|bin|post)|by accident|last|again (?:into|on)|on (?:the|my) (?:way|driving test)|in (?:the|a) (?:car park|game)))`, { self: true, neg: true, guard: /\b(?:by accident|accidentally|game|level|mario|gta|fortnite|minecraft|roblox|lesson|instructor|test|driving test|insurance|garage|mechanic|parking)\b/ });
frame('means-blade', 'means', 5, F`${SELF}${G(3)}(?:cut|cutting|cuts|slit|slitting|slash|slashed|slashing|burn|burning|burnt|burned|scratch|scratching|scratched|carve|carved|carving|stab|stabbed|stabbing|hurt|hurting|harm|harming) ${G(1)}(?:myself|my (?:wrists?|arms?|thighs?|legs?|skin|veins?|stomach|body))\b(?! (?:on|by accident|accidentally|shaving|chopping|cooking|playing|when i fell|falling|at the gym|at football|while|in the kitchen|with (?:a|the) (?:knife|tin|can|paper|lid|glass) (?:by|while|chopping|when|opening)))|\b(?:blade|blades|razor|razors|knife|knives|scissors|glass|sharpener) ${G(4)}(?:to (?:cut|hurt) myself|cut myself|my wrists?|my arms?|my thighs?|my veins?|deep enough)\b|\bself harm(?:ing|ed)?\b|\bselfharm\w*\b`, { neg: true, guard: /\b(?:onions?|chopping|cooking|shaving|accident|accidentally|garden|gardening|paper cut|tin|can opener|hair|fringe|nails|toenails)\b/ });
frame('means-gun', 'means', 4, F`\b(?:gun|rifle|shotgun|pistol|firearm|revolver) ${G(4)}(?:myself|my head|my mouth|to my head|in my mouth|loaded|load it|bullet|bullets|access|in my (?:room|drawer|car|bag))\b|\b(?:put|hold|holding|held) ${G(1)}(?:a|the|his|my) (?:gun|rifle|pistol) to my (?:head|chest|mouth)\b`, { guard: /\b(?:game|games|fortnite|call of duty|cod|range|clay|shooting club|airsoft|paintball|nerf|water gun)\b/ });
frame('means-gun-access', 'means', 3, F`\baccess to (?:a|the|his|my|the same|dads|grandads) (?:gun|rifle|pistol|shotgun|firearm)\b|\b(?:holding|hold|held|cleaning|loading|looking at|keep holding) (?:his|my|the|a|dads|grandads) (?:old )?(?:gun|rifle|shotgun|pistol)\b`, { guard: /\b(?:game|games|range|club|airsoft|paintball|nerf|water gun|museum)\b/ });
frame('means-planning-how', 'means', 3, F`${SELF}${G(2)}(?:been planning|planning|planned|thought about|been thinking about|worked out) how (?:to|i will|i am going to|i could) ${G(2)}(?:do it|end it|go|die)\b|\blooking up how to\b`);
// (planning how to reach the one who died: a joining, read with the reunions — beside a death, support first, never care alone)
frame('reunion-planning', 'means', 3, F`${SELF}${G(2)}(?:been planning|planning|planned|thought about|been thinking about|worked out) how (?:to|i will|i am going to|i could) ${G(2)}(?:get to|be with|join) (?:him|her|them)\b`, { family: 'reunion' });
frame('means-car', 'means', 4, F`\b(?:car|engine|van) ${G(4)}(?:exhaust|hose|hosepipe|pipe|fumes|garage door (?:shut|closed|down))\b|${SELF}${G(3)}(?:sit|sitting|sat|been sitting) ${G(1)}in (?:the|my) (?:car|van) ${G(2)}(?:engine running|with the engine on|in the garage|exhaust)\b`, { guard: /\b(?:to (?:warm|keep|charge|cool|defrost|dry)|warm it up|waiting|outside (?:the|school|work)|heater|heating|mechanic|garage said|mot|repair|leak|smell)\b/ });
frame('means-water', 'means', 4, F`\b(?:walk|walking|walked|swim|swimming|swam|go|going|wade|wading) (?:into|out into|out to|out in|in to|off into) (?:the )?(?:sea|ocean|river|lake|water|waves|canal|reservoir)\b(?! (?:with|for (?:a|the) (?:swim|paddle|dip)|to (?:swim|paddle|cool|play|fish)|on holiday|at the beach|in the summer))|\b(?:drown|drowning) myself\b`, { guard: /\b(?:swim|swimming|paddle|paddling|surf|surfing|beach day|holiday|kids|dog|wetsuit|lido|dip|cold water|wild swim)\b/ });

// ---- FAREWELL ----------------------------------------------------------------------------------------------------------
/** A goodbye said TO someone gone, or to a thing, or a hello after it: grief or an ordinary move, never a note. */
const FW_VOCATIVE = new RegExp(F`\b(?:goodbye|good bye|bye|farewell|rip|rest in peace|sleep tight|night night|until we meet again|love you)(?: forever| for good)?(?: ,)? (?:my )?(?:sweet |little |old |dear |darling |beautiful |lovely |big |best )*(?:${PERSON}|boy|girl|one|friend|pal|buddy|angel|baby|darling|old (?:laptop|phone|house|flat|car|school|uniform|life|friend)|laptop|phone|house|flat|car|school|uniform|summer|holidays|job|office|city|town|twitter|instagram|facebook|tiktok)\b|\bhello\b|\brip\b|\brest in peace\b|\brainbow bridge\b|\bfuneral\b|\bat (?:the|his|her|their) grave\b`);
frame('fw-goodbye', 'farewell', 3, F`\b(?:goodbye|good bye|bye|farewell) ${G(1)}(?:everyone|everybody|world|forever|for good|for ever|all of you|you all|to (?:you all|everyone|all of you|the world|everybody))\b|\bthis is (?:my )?(?:goodbye|final goodbye|last goodbye|farewell)\b|\b(?:say|saying|said|made|making) (?:my )?(?:goodbyes|my goodbye|goodbye to (?:everyone|everybody|you all|all of you|the world))\b`, { guard: FW_VOCATIVE , toDead: true });
frame('fw-goodbye-bare', 'farewell', 2, F`(?:^ |[.,] )(?:goodbye|good bye|bye|farewell)(?: all| everyone| everybody)? (?=[.,])`, { guard: FW_VOCATIVE , toDead: true });
frame('fw-last', 'farewell', 3, F`\b(?:my |this is (?:my |the )?|the |this will be my |these are my )(?:last|final|very last) (?:message|post|text|words|word|letter|note|goodbye|tweet|status|update|video|entry|thing (?:i will|you will|anyone will|i am going to) (?:ever )?(?:say|write|post|send|hear|read|get)|time (?:i will|you will|anyone will|you are going to) ${G(2)}(?:hear|see|talk|speak|read|write))\b(?! (?:about|on|in|before|for (?:today|tonight|now|this|the)|got|was|is|went|says|said|until|till|of the (?:day|night|year|term)))|\b(?:written|wrote|writing|sent|sending) ${G(1)}(?:my )?(?:last|final) (?:message|letter|note|words|goodbye)\b(?! (?:about|on|in|before|for (?:today|the)))`, { guard: /\b(?:exam|exams|test|blog|diary|subject|topic|bed|goodnight|night night|sleep|asleep|deleted|by accident|the day|today|tonight on|meeting|class|lesson)\b/ });
frame('fw-letters', 'farewell', 3, F`\b(?:wrote|written|writing|left|leaving|leave|recorded|filmed|made|making|typed|hidden|hid|there is|there are) ${G(2)}(?:letters|letter|notes|note|a note|a letter|a video|videos|voice notes|messages|goodbyes|cards) ${G(3)}(?:for|to) (?:everyone|everybody|each of (?:you|them)|you all|all of you|each one of you|my (?:family|kids|children|son|daughter|mum|mom|mam|dad|parents|sister|brother|wife|husband|partner|friends|boyfriend|girlfriend|nan|gran)|mum|mom|dad|them all|each of them)\b|\b(?:wrote|written|writing|left|leaving|recorded|filmed) (?:(?:a|my|the|some|these|those) )?(?:goodbye|goodbyes|farewell) (?:letters|letter|notes|note|video|message|messages)\b|\bletters (?:to|for) each of (?:them|you)\b|\bthere is a (?:letter|note) for (?:mum|mom|dad|my [a-z]+|you|everyone)\b|\b(?:written|wrote|writing|said|made) my goodbyes\b`, { guard: /\b(?:wedding|party|birthday|christmas|thank you (?:letters|notes|cards)|pen pals?|revision|applying|application|job|interview|funeral|fridge|cake|the milkman|delivery|school|teacher|homework|work|shopping)\b/ });
frame('fw-letters-bare', 'farewell', 2, F`\b(?:writing|written|wrote|been writing|leaving|left) (?:letters|notes|goodbye notes)\b(?! (?:to|for) (?:the|my|our) (?:council|school|teacher|landlord|bank|mp|editor|job|jobs|uni|universities|newspaper))`, { guard: /\b(?:wedding|party|birthday|christmas|thank you|pen pals?|revision|applying|application|job|interview|funeral|fridge|cake|milkman|delivery|school|teacher|homework|work|shopping|council|landlord|complaint|santa)\b/ });
frame('fw-affairs', 'farewell', 3, F`\b(?:my |the )?(?:will|passwords|password|pin numbers|pin number|pins|bank details|account details|bank cards|life insurance|insurance papers|insurance details|funeral (?:wishes|plans|instructions)|deeds) ${G(3)}(?:is|are) ${G(1)}(?:on|in|under|with|inside|by|sorted|ready|written|signed|done|taped|next to) ${G(3)}(?:desk|table|drawer|envelope|bed|kitchen|room|solicitor|safe|box|notebook|folder|fridge|file|counter|shelf|sorted|ready|signed|done|written)\b|\bfor whoever (?:comes after|finds (?:me|this|them|it)|needs them)\b|\b(?:sorted|sorting|put|left|leave|leaving|written|wrote) ${G(2)}(?:my )?(?:passwords|bank details|account details|will|affairs|funeral wishes)\b`, { guard: /\b(?:flatmate|plumber|landlord|new (?:flatmate|tenant)|pay|wifi|netflix|so you can|for the (?:trip|holiday|plumber|builder)|solicitor said|sensible|at forty|at fifty|lodger|babysitter|house ?sitter|cat ?sitter|dog ?sitter)\b/ });
frame('fw-entrust', 'farewell', 2, F`\b(?:look after|take care of|care for|feed|walk|love) (?:my|the|our) (?:cat|cats|dog|dogs|kids|children|son|daughter|baby|mum|mom|mam|dad|family|hamster|rabbit|rabbits|fish|bird|birds|horse|sister|brother|pets|pet|guinea pig|tortoise|snake|parrot|girlfriend|boyfriend|wife|husband) ${G(2)}for me\b|\btake care of (?:each other|yourselves|everyone|mum|dad|my family) (?:for me|when|after|once)\b|\b(?:look after|take care of|care for|feed|walk) (?:my|the|our|mum|dad) ${G(2)}(?:when|after|once) (?:i am|im) ${G(1)}(?:gone|not here|not around|no longer here|dead)\b`, { guard: /\b(?:holiday|while i am (?:away|at|on|in)|weekend|trip|away for|next week|till|until|at work|in spain|abroad|hospital|operation)\b/ });
frame('fw-give-away', 'farewell', 3, F`\b(?:give|giving|gave|given|leave|leaving|left) ${G(1)}(?:away )?(?:all )?(?:my|of my) ${G(1)}(?:things|stuff|belongings|possessions|room|games|xbox|playstation|guitar|savings|money|jewellery|jewelry|cat|dog|everything)\b|\b(?:make sure|so that|so) ${G(2)}(?:gets|get|has|have|can have|takes) my ${G(1)}[a-z]+\b(?! (?:back|fixed|cleaned|repaired|delivered|tomorrow|today|on|at|from))|\b(?:you|he|she|they) can have my [a-z]+ (?:when|after|once) (?:i am|im) (?:gone|dead)\b|\b(?:when|once|after) i am (?:gone|dead) ${G(2)}(?:you|he|she|they|everyone) can have (?:my|all my)\b`, { guard: /\b(?:charity|charity shop|school|library|food bank|before we move|moving|do not (?:use|need|wear|ride|play)|does not fit|do not fit|outgrown|lost weight|old (?:clothes|bike|toys|books)|clear out|declutter|decluttering|car boot|ebay|vinted|sold)\b/ });
frame('fw-apology', 'farewell', 2, F`\b(?:sorry|forgive me|i apologise|i apologize) ${G(1)}(?:for everything|for being (?:a burden|me|like this|this way|such a (?:burden|disappointment|failure|mess))|for what i am (?:about to do|going to do)|for what (?:i have done|i did)|for leaving|for all of this|for all the pain|for all the trouble|for the pain|for letting (?:you|everyone) down|it had to (?:end|be) this way|i (?:was not|could not be|could not) (?:enough|better|stay|keep going|go on|do it anymore))\b|(?:^ |[.,] )forgive me(?= [.,]| mum| mom| dad| everyone| all| please)|\bsorry to everyone i (?:let down|hurt|failed)\b`, { guard: /\b(?:pizza|cake|food|said (?:last night|yesterday|in the)|the group chat|the mess|the noise|the late reply|replying|the rant|being late|missing your call|the delay|this long message|the long rant)\b/ , toDead: true });
frame('fw-sorry-about-to', 'farewell', 4, F`\bsorry (?:for|about) what i am (?:about to do|going to do)\b`, { guard: /\b(?:pizza|cake|food|chocolate|biscuits|fridge|diet|room|house|kitchen|hair|garden|car|playlist|karaoke|singing|song)\b/ });
frame('fw-sorry-bare', 'farewell', 1, F`(?:^ |[.,] )(?:i am )?(?:so |really |truly )?sorry(?: (?:${PERSON}|everyone|all|guys))? (?=[.,])`, { toDead: true });
frame('fw-love-bare', 'farewell', 1, F`(?:^ |[.,] )i love you(?: (?:${PERSON}))? (?=[.,])`, { toDead: true });
frame('fw-love', 'farewell', 2, F`\bi love you (?:all|so much|guys|everyone|forever|always)\b|(?:^ |[.,] )love you (?:all|guys|everyone|forever|always)\b|\btell (?:${G(2)})i love (?:her|him|them|you|everyone)\b|\btell (?:everyone|them|mum|dad|my [a-z]+) i (?:loved|love) (?:them|her|him|you|everyone)\b|\bi (?:always )?loved you all\b`, { guard: /\b(?:birthday|party|christmas|surprise|dinner|tomorrow|ring|call|see you|visit|weekend|jumper|cake|card|present|wedding)\b/ , toDead: true });
frame('fw-relay-past', 'farewell', 5, F`\b(?:tell|please tell) (?:my )?${G(1)}(?:${PERSON}|everyone|them|him|her|my family) (?:that )?i (?:loved|always loved) (?:them|her|him|you|everyone|them all)\b`);
frame('fw-relay', 'farewell', 3, F`\b(?:tell|please tell) (?:my )?${G(1)}(?:${PERSON}|everyone|them|him|her|my family) (?:that )?i (?:am sorry|love|loved|will always love|never meant|did not mean|tried)\b`, { guard: /\b(?:late|call|ring|tomorrow|later|see|visit|text|missed|grumpy|the car|the jumper|weekend|dinner|cake|tonight|at the|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/ , toDead: true });
frame('fw-thanks', 'farewell', 2, F`\bthank you for everything\b|\bthanks for everything\b|\bthank you (?:all |so much )?for (?:trying|putting up with me|being there for me|loving me|everything you have done|all you have done)\b|\bthanks for (?:trying|putting up with me|being there|loving me)\b`, { guard: /\b(?:course|class|term|year|birthday|party|wedding|dinner|lift|help with|teacher|miss|sir|reunion|conference|this week|today|tonight|lesson|team|trip|visit|present|gift)\b/ , toDead: true });
const BLAME_GUARD = /\b(?:exam|test|loss|match|game|ref|refs|referee|referees|weather|vase|shop|party|alarm|cancelled|the (?:car|dog|cat|plant|plan|cake|weather))\b|\bto (?:quit|leave|stay|skip|move|drop|go)\b/;
frame('fw-blame-all', 'farewell', 3, F`\b(?:do not|please do not|try not to|never) blame (?:yourselves|anyone|each other)\b`, { guard: BLAME_GUARD });
frame('fw-choice', 'farewell', 2, F`\bit was my (?:choice|decision|own choice|own decision)\b|\b(?:nobody|no one) is to blame\b`, { guard: BLAME_GUARD });
frame('fw-blame', 'farewell', 2, F`\b(?:do not|please do not|try not to|never) blame (?:yourself|mum|dad|my [a-z]+)\b|\bit (?:is|was) not (?:your|anyones|any of your|their|his|her) fault\b`, { guard: /\b(?:exam|test|loss|match|game|ref|referee|weather|vase|shop|party|alarm|cancelled|the (?:car|dog|cat|plant|plan|cake|weather))\b|\bto (?:quit|leave|stay|skip|move|drop|go)\b/ });
frame('fw-decision', 'farewell', 2, F`\bi have made (?:my|the) decision\b|\bmy (?:decision|mind) is made\b`, { guard: /\b(?:moving on|move on|job|course|move|divorce|it will be fine|chemistry|diet|being short|uni|college|school|offer)\b/ });
frame('fw-peace', 'farewell', 2, F`\b(?:made|making|make) (?:my )?peace\b(?! with (?:the fact|not|my|being|the move|it, it|it, i am|his|her|their|the|a|losing|getting))|\bi am at peace (?:now|with (?:my decision|it all|everything|this|it))\b`, { guard: /\b(?:moving on|move on|job|course|move|divorce|it will be fine|chemistry|diet|being short)\b/ });
frame('fw-do-not-grieve', 'farewell', 2, F`\b(?:do not|please do not) (?:be sad|cry for me|cry|miss me|grieve|mourn|come looking|look for me|try to find me|hate me)\b`, { guard: /\b(?:film|movie|book|ending|episode|exam|results|i will (?:text|call|ring|be back|be home|see you))\b/ });
frame('fw-this-is-it', 'farewell', 2, F`\bthis is (?:the end|the end for me|how it ends|it for me|where it ends)\b|\bit was the only way\b|\bit is (?:better|easier) this way\b|\bremember me (?:as|when|always|fondly)\b|\bi will (?:never|not) forget (?:you|any of you|you all)\b|\bwhere i am going\b|\bi will (?:always )?be watching over\b|\b(?:i will|i am going to) (?:miss|always love) you all\b|\bi promise\b(?= [.,]|$)`, { guard: /\b(?:job|this job|the film|the book|the season|the series|the game|this level|exam|school|famous|concert|we met|your mum|reunion|homework|i will (?:text|call|ring|be back|be home))\b/ });
frame('fw-this-is-it-bare', 'farewell', 1.5, F`(?:^ |[.,] )this is it (?=[.,])`);
frame('fw-read-this', 'farewell', 2, F`\b(?:by the time|when|once|if|before) (?:you|anyone|someone|somebody|they|my [a-z]+|mum|mom|dad|people|everyone) ${G(2)}(?:read|reads|see|sees|find|finds|get|gets|hear|hears|open|opens) (?:this|my message|my note|this note|this message|my letter|this letter)\b|\bif you are reading this\b`, { guard: /\b(?:parcel|wifi|washing|drawer|room [0-9]+|fridge|cake|return it|put it back|the milk|asleep on the sofa|at the cinema|on the plane|at work|home|finished|arrived|essay)\b/ });

// ---- BURDEN and HOPELESSNESS ------------------------------------------------------------------------------------------
/** Small, bounded things a burden or a hopelessness can be about: never the self. */
const SMALL = /\b(?:lift|lifts|homework|puzzle|level|game|quiz|team|match|exam|test|essay|assignment|traffic|meeting|queue|lift|cake|diet|work this week|admin|tiny flat|flat|commute|weather|this week|today|football|maths|the office|singing|karaoke|fridge|shop|shopping|wifi|signal|bus|train)\b/;
frame('bu-burden', 'burden', 3, F`${SELF}${G(3)}(?:am|was|feel like|feel|have become|have been|will always be|am just|am only|will be) ${G(1)}(?:a|such a|just a|nothing but a|the|an|only a|a huge|a massive) ${G(1)}(?:burden|waste of space|waste of oxygen|waste of air|disappointment|failure|mistake|drain|nuisance)\b|\b(?:being|be) a burden\b|\bsuch a burden\b`, { guard: SMALL });
frame('bu-better-off', 'burden', 4, F`\b(?:better|happier|easier|freer|lighter|safer|calmer|better off|relieved) ${G(2)}(?:off )?(?:without me|if i (?:was|were|am|was not|were not|am not|had never|did not) (?:not |never )?(?:here|around|gone|dead|alive|born|exist|existed|in the picture)|when i am (?:gone|not here|not around|dead)|with me gone|once i am gone|if i (?:disappeared|died|left for good|went away forever|vanished))\b|\b(?:nobody|no one|everyone|everybody|they|you|the world) (?:would|will|is going to|is gonna) ${G(1)}(?:be better|be happier|be fine|be okay|cope|manage) without me\b`, { guard: SMALL });
frame('bu-better-off-when', 'burden', 6, F`\b(?:better|happier|easier|freer|lighter|safer|calmer|better off|relieved) ${G(3)}(?:when|once|after|now that) i am (?:gone|not here|not around|dead|no longer here|no longer around|not here anymore|not around anymore)\b`, { guard: SMALL });
frame('bu-nobody-miss-gone', 'burden', 6, F`\b(?:nobody|no one|not one person|no body) ${G(3)}(?:miss|notice|care|mind|cry)\b ${G(3)}(?:when|if|once|after) i (?:am |was |were |have )?(?:gone|dead|disappeared|died|vanished|not here|not around|left forever|killed myself)\b|\b(?:nobody|no one) ${G(3)}(?:notice|care|miss me) if i (?:disappeared|died|vanished|was gone|killed myself)\b`);
frame('bu-nobody-miss', 'burden', 4, F`\b(?:nobody|no one|not one person|no body) ${G(2)}(?:would|will|is going to|is gonna|ever|even|really)? ?${G(1)}(?:miss|notice|care|mind|cry|come to my funeral)\b ${G(3)}(?:if|when|that) i\b|\b(?:nobody|no one) ${G(2)}(?:will|would) (?:even |ever |really )?(?:miss me|notice (?:i am|i am gone|me gone)|care (?:if|when) i)\b`);
frame('bu-no-point', 'burden', 3, F`\b(?:no|not any|not much|nothing|is there any|what is the) (?:point|reason|purpose|meaning) ${G(2)}(?:in |to |of )?${G(2)}(?:living|life|being alive|being here|going on|carrying on|anything|any of (?:it|this)|existing|me|my life|it all|waking up|getting up|trying|staying|staying alive)\b|\blife (?:is|has|feels) (?:pointless|meaningless|not worth (?:living|it)|no meaning|no point|over)\b|\b(?:what is|whats) the point(?: anymore| of (?:anything|it all|living|life|me))?(?= [.,?])`, { guard: /\b(?:revising|revision|exam|cancelled|bus|train|waiting|queue|arguing|asking|trying to explain|this game|the game|homework)\b/ });
frame('bu-no-point-see', 'burden', 3, F`\b(?:do not|can not|cannot|no longer) see (?:the|any) (?:point|reason|purpose)\b(?! (?:in (?:arguing|asking|going (?:out|to (?:the|that|this))|buying|paying|revising|that|this (?:class|course|job|game))|of (?:this|that) (?:game|class|course|meeting|app)))`, { guard: /\b(?:revising|revision|exam|cancelled|bus|train|waiting|queue|arguing|asking|trying to explain|this game|the game|homework|meeting|class|course|app|subscription|gym)\b/ });
frame('bu-nothing-left', 'burden', 3, F`\bnothing (?:left|more) (?:for me|to live for|to lose|to give|in me|of me|here for me)\b|\bnothing to live for\b|\bno (?:reason|reasons) (?:left )?to (?:live|stay|keep going|go on|carry on|wake up|be here|stay alive)\b|\bno future (?:for me|left|ahead)\b|\bi (?:do not|can not) see a future\b`);
frame('bu-tired', 'burden', 3, F`\b(?:tired|sick|exhausted|done|finished|fed up|weary) (?:of|with) (?:everything|it all|being me|being myself|trying|fighting|all of this|all of it|everyone|this world|people|being here|feeling like this|this pain)\b(?! (?:at|in|on|from) (?:work|school|uni|college|the office|this job))(?! [a-z]+ing)`, { guard: /\b(?:at work|this week|today|job|assignment|essay|homework|level|game|project|admin|traffic|commute|weather|rain|flat|house|meeting)\b/ });
frame('bu-tired-life', 'burden', 6, F`\b(?:tired|sick|exhausted|done|finished|fed up|weary) (?:of|with) (?:living|life|being alive|existing|this life|waking up|my life|being in this world|being on this earth)\b(?! (?:in|with|at|here|there|near|next to|on|admin|like this in))`);
frame('bu-cant-go-on', 'burden', 3, F`\b(?:can not|could not|can not seem to|do not think i can|am not able to|unable to) ${ADV}(?:go on|keep going|carry on|do this|do it|take (?:it|this|any more|anymore|much more)|live like this|handle (?:it|this|life)|face (?:another day|tomorrow|it)|keep living|keep doing this|bear it|stand it|hold on)\b(?! (?:working|studying|at work|at school|with (?:work|school|uni|my (?:job|course|studies))|as (?:normal|usual|if)|like normal|going to (?:work|school)|with (?:this|the) (?:job|course|essay|diet|level|game|puzzle)|for (?:another|much longer than) (?:minute|hour|second)|after (?:mile|lap|the first|the second|halfway)|past (?:mile|lap)|up the hill))(?! (?:to|back|there|into|round|over|past|near|by|through|outside|home|up|down|on holiday|on (?:a|the|that|this) (?:trip|ride|bus|train|stage|course|walk|date|holiday)|out (?:there|with|to|for|on)|in (?:the|to|there)))`, { guard: /\b(?:mile|miles|lap|laps|marathon|race|run|level|game|puzzle|this job|course|diet|gym|workout|set|reps)\b/ });
frame('bu-cant-cope', 'burden', 2, F`\b(?:can not|could not|do not think i can|am not able to|unable to) ${ADV}cope\b`, { guard: SMALL });
frame('bu-done', 'burden', 2, F`${SELF}am ${ADV}(?:so |completely |totally |really )?(?:done|finished|over it)(?= [.,])`);
frame('bu-nothing-matters', 'burden', 3, F`\bnothing (?:matters|means anything|is worth it|feels worth it)(?: anymore| any more| to me)?\b|\bnone of (?:this|it) (?:will |would )?(?:matter|matters)(?: soon| anymore| any more)?\b|\b(?:i|my life) (?:do not|does not) matter\b`, { guard: /\b(?:score|result|results|grade|grades|the match|the game|who wins|what they think|in the end, it is fine)\b/ });
frame('bu-give-up', 'burden', 2, F`${SELF}${G(2)}(?:give|giving|gave|have given|am giving) up\b(?! (?:on (?:this|the|that|my (?:diet|plan|essay|homework|project|dream of))|chocolate|sugar|smoking|drinking|meat|caffeine|coffee|alcohol|for lent|my seat|the (?:idea|search)))|\b(?:give|giving|gave) up on (?:life|everything|myself|living|it all|me)\b`, { guard: SMALL });
frame('bu-trapped', 'burden', 2, F`\b(?:no way out|no escape|no exit|trapped|stuck forever|can not escape|no way forward)\b`, { guard: /\b(?:traffic|meeting|queue|lift|elevator|jam|lecture|class|game|level|room|car|train|bus|conversation|call|snow|rain|toilet|loo)\b/ });
frame('bu-worthless', 'burden', 2, F`${SELF}${G(3)}(?:am|feel|was|will always be|have always been) ${G(2)}(?:worthless|useless|hopeless|pointless|empty inside|dead inside|unlovable|nothing|a nobody|a failure|broken|not worth (?:it|anything|saving))\b(?! (?:at|in|with|compared|when it comes|for (?:the|this|that|my|a) (?:team|job|exam|test|match|game|quiz)))`, { guard: SMALL });
frame('bu-not-enough', 'burden', 3, F`${SELF}${G(2)}(?:was not|am not|will never be|was never|could not be|never was|have never been) ${ADV}(?:good )?enough\b(?! (?:for (?:the|this|that|a|an|my|our|their) (?:team|job|role|part|grade|course|uni|university|band|squad|exam|test|interview|match|game|competition|prize|place|scholarship)|at|in|to (?:get|make|win|pass)))`, { guard: SMALL });
frame('bu-hate-self', 'burden', 2, F`${SELF}${G(2)}(?:hate|loathe|despise|can not stand) (?:myself|my life|being alive|existing|being me|who i am)\b(?! for (?:eating|forgetting|missing|being late|saying|doing|buying|not))`, { guard: /\b(?:cake|chocolate|crisps|pizza|biscuits|ate|eating|forgot|forgetting|late|bought|buying|sometimes lol|lol|haha)\b/ });
frame('bu-want-out', 'burden', 3, F`${SELF}${G(2)}(?:want|need|wanna|just want|wish|would like) (?:it|everything|this|it all|the pain|life|all of this|all this) (?:all )?(?:to (?:stop|end|be over|go away|finish)|over)\b(?! (?:by|before|after|at|soon,|so i can))|${SELF}${G(2)}(?:want|need|wanna|just want) out\b(?! (?:of (?:this|the|that|here) (?:meeting|class|job|relationship|house|flat|group|chat|lecture|room|town|city|marriage|contract))| for)`, { guard: /\b(?:meeting|class|lecture|rain|noise|headache|exam|exams|week|term|day|shift|lesson|game|traffic|the music|the drilling|hiccups)\b/ });
frame('bu-carry', 'burden', 4, F`\b(?:have to|need to|to|will not have to|will not need to|never have to|nobody has to|no one has to) ${ADV}(?:carry|deal with|put up with|look after|worry about|take care of|support|cope with) me ${G(1)}(?:anymore|any more|much longer|for much longer|ever again|again|forever)\b`, { guard: /\b(?:uni|university|september|move out|moving out|my own flat|holiday|trip|camp)\b/ });
frame('bu-free-of-me', 'burden', 3, F`\b(?:free|rid) of me\b|\bout of (?:your|everyones|their|his|her) (?:hair|way|life|lives) (?:for good|forever|soon|for ever)\b`, { guard: /\b(?:move out|moving out|when i move|uni|university|camp|week|whole week|for christmas|holiday|trip|travelling|off travelling|going to (?:dad|mum|my)|new job|in june|in september)\b/ });

// ---- ABSENCE: the self, absent in the future --------------------------------------------------------------------------
const TIMED_STRONG = F`(?:for much longer|much longer|for long|anymore|any more|after this weekend|after tonight|after today|after this)`;
const TIMED = F`(?:by (?:tomorrow|morning|friday|the weekend)|next week|next month|for christmas|for my birthday|tomorrow)`;
const ABSENT = F`${SELF}${G(2)}(?:will not|am not going to|am not gonna|will no longer|do not plan on|do not plan to|do not intend to|do not expect to|might not|may not|am not planning on|am not planning to|do not think i will) ${ADV}(?:be|being) ${ADV}(?:here|around|alive|there|with you|in your life|in your way|a problem|a burden|a bother|in this world|on this earth)`;
frame('ab-wont-be-long', 'absence', 6, F`${ABSENT} ${G(3)}${TIMED_STRONG}\b(?! than)`);
frame('ab-wont-be-timed', 'absence', 5, F`${ABSENT} ${G(3)}${TIMED}\b(?! than)`);
frame('ab-plan-timed', 'absence', 6, F`${SELF}${G(1)}(?:do not plan on|do not plan to|do not intend to|am not planning on|am not planning to) ${ADV}(?:be|being) ${ADV}(?:here|around|alive) ${G(2)}(?:${TIMED_STRONG}|${TIMED})\b`, { guard: /\b(?:lease|contract|job|move|moving|uni|holiday|trip|staying|flat|house)\b/ });
frame('ab-plan-not-here', 'absence', 5, F`${SELF}${G(1)}(?:do not plan on|do not plan to|do not intend to|am not planning on|am not planning to) ${ADV}(?:be|being) ${ADV}(?:here|around|alive)\b`, { guard: /\b(?:lease|contract|job|move|moving|uni|holiday|trip|after (?:june|july|august|september|christmas|summer)|staying|flat|house)\b/ });
frame('ab-wont-be', 'absence', 3, F`${SELF}${G(2)}(?:will not|am not going to|am not gonna|will no longer|would not|do not plan on|do not plan to|do not intend to|do not expect to|will never|might not|may not|am not planning on|am not planning to|do not think i will) ${ADV}(?:be|being) ${ADV}(?:here|around|alive|with you|in your life|in your way|a problem|a burden|a bother|in this world|on this earth)\b(?! (?:at|for (?:the|a|my|your|his|her|their|dinner|lunch|tea|work|school)|in (?:the|class|school|work|time)|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|time|the)|until|till|today|this (?:afternoon|morning|evening)|much (?:this|today|tomorrow|next)|after (?:june|july|august|september|the|next|this (?:term|year|month))|than|much longer than|longer than|when you (?:get|come) (?:back|home)|to (?:help|pick)))`);
frame('ab-when-gone', 'absence', 3, F`\b(?:when|after|once|by the time|before|if|now that|since) i (?:am |have |will be |have been |will have )?${ADV}(?:gone|dead|not here|not around|no longer here|no longer around|no longer alive|not alive|in the ground|at peace|out of the picture|out of the way|not here anymore|not around anymore|six feet under)\b(?! (?:to|for|on|out|home|away|back|abroad|shopping|travelling|traveling|camping|by|in(?! peace)|from|with|over|into|up|down|off|all|most|until|till|a week|a few|for the|the flat|tomorrow|today|next|this|at|when you))`, { guard: /\b(?:holiday|trip|operation|spain|abroad|work|bed|the flat will be yours|manager|takes over|cat will sulk|walk the dog|water the plants|feed the|new job|uni|camp|week)\b/ });
frame('ab-no-worry', 'absence', 3, F`\b(?:you|everyone|everybody|they|nobody|no one|anyone|you all|you guys|my family|mum|mom|dad|people|no body) ${G(2)}(?:will not|do not|never|not|will never|has to|have to|need to|needs to) ${ADV}(?:have to |need to |ever have to |ever need to |ever )?(?:worry|deal|put up|bother|carry|look after|take care|think|stress) (?:about |with |of )?me\b`, { guard: /\b(?:text|call|ring|message|land|landed|packed|snacks|coat|phone|staying with|big girl|big boy|fine|home by|safe|hike|camping|trip|uni|september|my own|grandma|nan|be back|i will be okay|i am okay)\b/ });
frame('ab-no-worry-tonight', 'absence', 6, F`\b(?:you|everyone|everybody|they|nobody|no one|anyone|you all|you guys|my family|mum|mom|dad|people|no body) ${G(2)}(?:will not|do not|never|not|will never|has to|have to|need to|needs to) ${ADV}(?:have to |need to |ever have to |ever need to |ever )?(?:worry|deal|put up|bother|carry|look after|take care|think|stress) (?:about |with |of )?me ${G(1)}(?:after tonight|after today|after this)\b`);
frame('ab-no-worry-timed', 'absence', 5, F`\b(?:you|everyone|everybody|they|nobody|no one|anyone|you all|you guys|my family|mum|mom|dad|people|no body) ${G(2)}(?:will not|do not|never|not|will never|has to|have to|need to|needs to) ${ADV}(?:have to |need to |ever have to |ever need to |ever )?(?:worry|deal|put up|bother|carry|look after|take care|think|stress) (?:about |with |of )?me ${G(1)}(?:after tonight|after today|ever again|anymore|any more|much longer|again)\b`, { guard: /\b(?:text|call|ring|message|land|landed|packed|snacks|coat|phone|staying with|big girl|big boy|fine|home by|safe|hike|camping|trip|uni|september|my own|grandma|nan|be back|i will be okay|i am okay|move out|moving)\b/ });
frame('ab-never-again-timed', 'absence', 6, F`\b(?:will not|will never|never|not) ${G(2)}(?:see|hear from) me again after (?:tonight|today|this)\b`);
frame('ab-never-again', 'absence', 4, F`\b(?:last time|the last you|never|not|nobody will|no one will|will not|will never) ${G(3)}(?:hear from me|see me|hear me|hear my voice|talk to me|speak to me|get (?:another )?(?:message|text|call) from me)\b ${G(1)}(?:again|ever again|anymore|after (?:tonight|today|this|now)|from now on)\b(?! (?:in|at|on|till|until) )|\bthis is the last (?:time )?(?:you will|you are going to|anyone will) ${G(2)}(?:hear|see|get|read)\b|\b(?:will not|will never|never) ${G(2)}see me again after (?:tonight|today|this)\b`, { guard: /\b(?:shop|gym|pub|restaurant|cafe|bar|club|place|store|until|till|results|holidays|parking|about the|on this|promise to stop|meeting)\b/ });
frame('ab-out-of-way', 'absence', 3, F`\b(?:i will|i am going to|i would|soon i will) ${ADV}(?:be out of|get out of) (?:your|everyones|their|his|her|the) (?:way|hair|life|lives|picture)\b`, { guard: /\b(?:move out|moving out|uni|holiday|trip|kitchen|bathroom|tomorrow morning|by (?:ten|nine|eight|[0-9]))\b/ });
frame('ab-wont-need', 'absence', 2, F`\b(?:will not|do not|am not going to|not going to|never) need (?:them|it|these|those|this|that|my [a-z]+|anything|any of (?:it|this|them)) ${G(1)}(?:anymore|any more|again|where i am going|after (?:tonight|today|this))\b|\b(?:will not|am not going to) need (?:them|it|these|those|anything|any of (?:it|this|them))(?= [.,])`, { guard: /\b(?:now i|now that|because|since|summer|healed|contact lenses|got (?:a|my|new)|bought|lost weight|finished the course|drive|car|sold|crutches|glasses|coat|winter|exam|course)\b/ });
frame('ab-wont-make', 'absence', 4, F`${SELF}${G(2)}(?:will not|do not think i will|am not going to|will never|do not see myself) ${ADV}(?:make it|making it|be here|be alive|see|last) (?:to|until|till|for|through|past) (?:my birthday|christmas|next (?:week|month|year)|the new year|tomorrow|the weekend|summer|the end of)\b(?! (?:party|dinner|lunch|drinks|on time|in time))`, { guard: /\b(?:going to (?:my|our|his|her)|staying (?:at|with)|work|shift|rota|flight|trip|holiday|away|abroad|busy|appointment|aunts|uncles|nans|grans|dads|mums)\b/ });

// ---- NOW: immediacy and decision --------------------------------------------------------------------------------------
frame('now-time', 'now', 1, F`\b(?:tonight|today|right now|soon|very soon|tomorrow|this weekend|after tonight|after today|by morning|by tomorrow|before morning|in an hour|in a few hours|by friday|by the weekend|much longer|for much longer|not long now|anymore|any more|once and for all|for good|next week)\b(?! than)`);
frame('now-ready', 'now', 1, F`\bi am (?:so |finally |now )?ready\b(?! (?:for|to (?:go (?:home|out|to)|leave (?:the|this|work)|order|eat|start|play)|when you))|\bit is time\b(?! (?:to|for) (?:bed|dinner|lunch|tea|school|work|the|a|my|our|me to go to (?:bed|sleep|work|school)))`);
frame('now-decided', 'now', 2, F`${SELF}${G(2)}(?:have decided|decided|have made up my mind|made up my mind|have made my decision|made my decision|have planned|planned it|have a plan|decided when|chose the date|picked the date|set a date)\b(?! (?:to (?:quit|leave|stay|move|go|take|do|study|apply|try)|on (?:a|the|which|what)|what|which|that i (?:am|will) (?:go|take|study|quit)))|\bmy mind is made up\b|\b(?:tonight|today|this) is the (?:night|day)\b`, { guard: /\b(?:big day|interview|wedding|party|exam|game|match|date|propose|ask (?:her|him) out|holiday|trip|leaving do|moving|course|uni|job|with (?:him|her|them)|boyfriend|girlfriend|relationship|cheated|lying|break up|split up|dump)\b/ });

// ---- DEATH: someone else's death named (never a risk on its own: the gentle path; beside the self ending, joining, a means,
// burden or absence, a known risk: a bereavement, and a suicide bereavement most of all)
frame('death-named', 'death', 1, F`\b(?:(?:my|our) (?:little |big |baby |older |younger |best |late |dear |twin )?${PERSON}s?|he|she|they|mum|mom|dad|grandma|grandad|grandpa|nan|everyone i (?:love|loved)) ${G(2)}(?:died|has died|have died|passed|passed away|is dead|are dead|was killed|killed (?:himself|herself|themselves)|took (?:his|her|their) (?:own )?life|shot (?:himself|herself)|hanged (?:himself|herself)|hung (?:himself|herself)|is gone|has gone|left us|is in heaven|was put down|was put to sleep|overdosed|od|odd|jumped|drowned|is not here anymore|is no longer here|is not with us|died by suicide|ended (?:his|her) life)\b|\b(?:since|after|ever since|now that) (?:my |our )?(?:${PERSON}|he|she|they) ${G(1)}(?:died|passed|went|left|is gone|has gone)\b|\b(?:${PERSON}|husband|wife) (?:gone|passed) [0-9a-z]+ (?:months|weeks|years|days)\b|\b${PERSON}s (?:not here anymore|not here any more|gone|in heaven|no longer here|no longer with us|not with us anymore)\b`);

DEATH_ANY = new RegExp(FRAMES.find((f) => f.id === 'death-named').re.source);

// ---- DAMPENERS: weak everyday bounds -----------------------------------------------------------------------------------
const DAMP = new RegExp([
  F`\bsee you (?:all )?(?:on )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|later|soon|next|tonight|then|there|in a bit|at|in the morning|after|at the|when)\b`,
  F`\b(?:for|this|next|at the) weekend\b`, F`\b(?:at|to|from|after|before) (?:work|school|uni|college|class|practice|training|the office)\b`, F`\b(?:my|the) (?:shift|office)\b`,
  F`\b(?:my|the|his|her|their|our) (?:train|bus|taxi|uber|lift|ride|flight|plane|ferry) (?:is here|gets in|leaves|is at|is outside|is waiting|home|arrives)\b`, F`\b(?:train|plane|flight|ferry|coach) (?:to|home|back)\b`,
  F`\b(?:on|for|our|my|the|summer|school) (?:holiday|holidays|vacation|trip|hike|honeymoon|gap year|interrailing|camping trip)\b`, F`\b(?:hiking|camping|travelling|traveling|interrailing|backpacking|holidays)\b`,
  F`\b(?:we|i) (?:move|moved|are moving|am moving|will move|will be moving)\b`, F`\bmoving (?:house|abroad|out|to|in)\b`, F`\b(?:the|my|our) (?:lease|contract|tenancy|notice)\b`, F`\bnew (?:job|school|flat|house|city)\b`, F`\bold (?:house|flat|home|school|job|life|phone|laptop|car|uniform)\b`,
  F`\b(?:the|this|my|an|a|our|great|last|next|first) (?:project|level|game|match|exam|exams|essay|assignment|homework|revision|test|quiz|interview|audition|presentation|deadline|meeting|conference|party|wedding|reunion|stream|show|series|episode|film|movie|book|course|module|term|semester|season|race|marathon|competition|tournament)\b`,
  F`\b(?:homework|revising|revision|exams|exam season)\b`, F`\b(?:group chat|discord|the server|twitter|instagram|insta|tiktok|facebook|snapchat|social media|online|offline|my account|this account|the internet|wifi)\b`,
  F`\b(?:my|the) (?:phone|battery|laptop|charger|computer|console)\b`, F`\bcar is outside\b`,
  F`\b(?:pizza|cake|dinner|lunch|breakfast|snacks|chocolate|leftovers|fridge|the shops|the shop|shopping|supermarket|the gym|my run|football|swimming|the dentist|appointment|haircut|my hair|to bed|alarm|alarms|my coat|picking me up|the parking|pen pals|charity shop|solicitor|plumber|landlord|flatmate|the tent|mile|miles|lap|laps)\b`,
  F`\b(?:lol|lmao|haha|hahaha|jk|xd)\b`, F`(?<!\b(?:not|no|never) )\b(?:just kidding|joking|kidding)\b`, F`\bhave a (?:lovely|great|good|nice|happy|merry|wonderful|safe) [a-z]+\b`, F`\b(?:this|my|a|the) (?:cold|flu|bug|hangover)\b|\b(?:night shift|knackered|shattered)\b`, F`\b(?:back|home) (?:soon|later|by|at|tomorrow|in)\b`, F`\bbrb\b`, F`\bfor a (?:bit|while|few days|week|month)\b`,
  F`\b(?:going|staying|off) (?:to|at|with) (?:my |our )?(?:aunt|auntie|uncle|nan|gran|grandma|grandad|dad|mum|mom|friend|cousin|sister|brother|mates?)s?\b`,
  F`\b(?:the|my|our) (?:team|colleagues|class|club|squad|job|course|students|pupils|boss)\b|\b(?:working with|pleasure|retire|retiring|retirement|leaving do|last day|new chapter|good luck)\b`,
].join('|'));
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
  for (const f of FRAMES) {
    f.re.lastIndex = 0;
    let m;
    while ((m = f.re.exec(c))) {
      if (m[0].length === 0) { f.re.lastIndex++; continue; }
      const at = m.index, end = at + m[0].length;
      const k = sentenceAt(at);
      const sent = sentText[k];
      if (f.guard && f.guard.test(sent)) continue;
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
      if (f.needsDeath && !DEATH_ANY.test(c)) continue;
      // a goodbye, a thank-you or "i love you" beside a death named is said TO the one who died: grief, never a note
      if (f.toDead && DEATH_ANY.test(c)) w *= DAMPEN;
      if (f.self && !/\b(?:i|me|myself|my)\b/.test(sent)) w = Math.min(w, 2);
      // a means held by the self is a little more (my pills, i have saved)
      if (f.cat === 'means' && /\b(?:i|me|my|myself)\b/.test(sent) && f.w >= 3) w += 1;
      const strong = (f.cat === 'end' && f.w >= 5) || (f.cat === 'means' && w >= 5);
      // (a farewell or an absence is bounded by its own sentence or the next: "goodbye everyone. see you monday")
      const near = (f.cat === 'farewell' || f.cat === 'absence') && dampAt[k + 1] ? [...dampAt[k], ...dampAt[k + 1]] : dampAt[k];
      if (near.some(([a, b]) => a < at || b > end)) w = strong ? Math.max(CHECK_AT, w * 0.6) : w * DAMPEN;
      hits.push({ id: f.id, cat: f.family || f.cat, w, at, end, sentence: k, text: m[0].trim(), ...(f.needsDeath ? { dep: true } : {}) });
    }
  }
  // one reading per stretch of words: where two frames read the same words ("i will be gone": a wish and an absence), the
  // heavier one counts; a time word inside another frame's words is that frame's
  hits.sort((a, b) => b.w - a.w || a.at - b.at);
  const kept = [];
  const overlaps = (k, h) => {
    const o = Math.min(k.end, h.end) - Math.max(k.at, h.at);
    return k.cat === h.cat ? o > 0.5 * Math.min(k.end - k.at, h.end - h.at) : o > 0.8 * Math.max(k.end - k.at, h.end - h.at);
  };
  for (const h of hits.filter((x) => x.cat !== 'now')) if (!kept.some((k) => overlaps(k, h))) kept.push(h);
  for (const h of hits.filter((x) => x.cat === 'now')) if (!kept.some((k) => Math.min(k.end, h.end) - Math.max(k.at, h.at) > 0)) kept.push(h);
  kept.sort((a, b) => a.at - b.at);
  // (indep: the families without the death and the frames that read only beside one — what the words say on their own)
  return { hits: kept, cats: catScores(kept), indep: catScores(kept.filter((h) => !h.dep && h.cat !== 'death')), canonical: c };
}

/** A death named beside a self frame adds this (scoreOf). */
const DEATH_BONUS = 3;
/** Three distinct farewells or more (a note's shape) add this. */
const NOTE_BONUS = 2.5;
/** The score per frame family: the best hit and every other distinct one (a note piles them up); a time word counts once. */
function catScores(hits) {
  const cats = { end: 0, means: 0, farewell: 0, burden: 0, absence: 0, reunion: 0, now: 0, decided: 0, death: 0 };
  for (const h of hits) if (h.id === 'now-decided') cats.decided = Math.max(cats.decided, h.w);
  const by = {};
  for (const h of hits) {
    by[h.cat] ||= new Map();
    const prev = by[h.cat].get(h.id);
    if (!prev || prev.w < h.w) by[h.cat].set(h.id, h);
  }
  for (const [cat, m] of Object.entries(by)) {
    const ws = [...m.values()].map((h) => h.w).sort((a, b) => b - a);
    const extra = cat === 'now' || cat === 'death' ? 0 : cat === 'end' || cat === 'absence' || cat === 'reunion' ? 0.5 : 1;
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
const BONUS = [
  ['end', 'now', (c) => (c.end >= 4 ? 2 : 1)], ['means', 'now', () => 2], ['farewell', 'now', (c) => (c.farewell >= 3 ? 2 : 1)],
  ['absence', 'now', () => 2], ['burden', 'now', (c) => (c.now >= 2 ? 3 : 0)],
  ['burden', 'end', () => 2], ['absence', 'farewell', () => 2], ['burden', 'absence', () => 2], ['farewell', 'end', () => 2],
  ['farewell', 'burden', () => 1], ['means', 'end', () => 2], ['means', 'farewell', () => 2], ['means', 'burden', () => 2],
  ['means', 'absence', () => 2], ['end', 'absence', () => 1], ['reunion', 'now', () => 1], ['reunion', 'means', () => 2], ['reunion', 'burden', () => 2],
];
/** A score from the families' scores. A time word adds only beside another family; a firm decision alone is a check-in. */
export function scoreOf(cats) {
  const core = cats.end + cats.means + cats.farewell + cats.burden + cats.absence + cats.reunion;
  if (core < 1) return cats.decided >= 2 ? CHECK_AT : 0;
  let s = core;
  for (const [a, b, f] of BONUS) if (cats[a] >= 1 && cats[b] >= 1) s += f(cats);
  // a death named beside the self ending, joining, a means, a burden or an absence: a bereavement's known risk, raised to the
  // check-in at most (beside a loss: support first, no world, nothing sent; never care from the death alone: "my dad died, i
  // want out", "dad died and im gonna do it tonight" and "writing goodbye letters" after a death are held, not care)
  // (DECISIONS.md: a death, then words about ending, joining or following that are less clear: the gentle path with support
  // first, held; care only when the words are care without the death, or the grief rules read the clause as explicit)
  if (cats.death >= 1 && s < CARE_AT && (cats.end >= 2 || cats.means >= 3 || cats.burden >= 3 || cats.absence >= 3 || cats.farewell >= 4)) s = Math.min(s + DEATH_BONUS, CARE_AT - 0.01);
  return s;
}
const levelOf = (s) => (s >= CARE_AT ? 'care' : s >= CHECK_AT ? 'check' : null);

/**
 * The screener's reading of one Tell, with the visit's earlier Tells as context.
 * @param {string} text
 * @param {{ history?: string[] }} [opts]
 * @returns {{ level: 'care' | 'check' | null, score: number, cats: Record<string, number>, hits: any[], context: boolean, normalised: string }}
 */
export function riskScreen(text, { history = [] } = {}) {
  const norm = normalise(text);
  const own = frames(norm);
  const ownScore = scoreOf(own.cats);
  let score = ownScore, context = false, cats = own.cats;
  // context: only when these words carry a frame of their own (an ordinary message after a heavy one never inherits care)
  const hasOwn = Object.values(own.cats).some((v) => v >= 1);
  const past = (Array.isArray(history) ? history : []).filter((h) => typeof h === 'string' && h.trim()).slice(-HISTORY);
  if (hasOwn && past.length) {
    const mixed = { ...own.cats };
    for (const h of past) {
      const hc = frames(normalise(h)).cats;
      for (const k of Object.keys(mixed)) mixed[k] = Math.max(mixed[k], (hc[k] || 0) * HISTORY_WEIGHT);
    }
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
