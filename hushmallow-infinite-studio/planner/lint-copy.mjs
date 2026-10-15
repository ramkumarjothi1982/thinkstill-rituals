// Copy lint: every per-string rule of templates/validate-library.mjs, plus
// the planner's additions (PHASE2-PLAN WP-06 / G-SPEC):
//   - the tone/topic blocklist (self-harm, death, illness, body/food, alcohol,
//     drugs, appearance, body image, self-hatred, catastrophe, violence,
//     outcome claims). Each entry is a lemma matched in all its inflections
//     (planner/morph.mjs: smoke → Smoked, smokers; vomit → Vomiting); derived
//     words are lemmas of their own (suicidal, sickly). The library's banned
//     medical terms are lemmas too (diagnose → diagnosed, panic → panicking);
//   - Latin-1 only (the renderer's Fredoka subset, audit R16) and clean spacing;
//   - time words must match the spec's chosen time of day (lines included):
//     the library's timeWords and the planner's timePhrases ('late night',
//     'sunrise') read on the text with its clock phrases masked, intersected
//     with every explicit clock time (2:00 AM, 2.30am, 3 a.m., two o'clock in
//     the morning, 02:00, 0200 hours, noon; planner/time-words.mjs), and with
//     the validator's own reading (the library's timeWords on the whole text)
//     as the floor, so the lint never allows a time the validator would not;
//   - lowercase 'hushmallow' (so never inside an ALL-CAPS hook), never split
//     ('Hush Mallow', 'hush-mallow', or over a hook's two rows);
//   - breath-hold phrasing, holds and breathing counts; no breath word in a
//     hook or end card (policy.lint.breathWords);
//   - caution terms are errors unless whitelisted for that exact string;
//   - no brand, app or song names;
//   - a hook or end card is one text however it wraps: every phrase rule
//     (medical, caution, topics, names, breath-hold) also reads its rows
//     joined, so a banned phrase split across the row break is caught;
//   - hashtags (export captions): the same terms, inflections included,
//     searched inside glued words (#anxietyrelief, #suicidal), excused only by
//     a carrier word, and no time word (#2am: one list goes on every video);
//   - reading-time pre-checks against the beat clock: every copy element is
//     one readable text (a thought, the whole hook, the whole end card);
//   - layout pre-checks with the Fredoka metrics;
//   - set rules: thought-line first words, question marks, grief pairing.
// Copy itself only ever comes from the library (G-SPEC checks membership);
// the lint decides which library strings fit a given spec.
//
// Issues are { rule, severity: 'error'|'warn', where, text, message, term? }.

import { wrap2, hooksOf, linePools, resolutionsOf } from './library.mjs';
import { loadPolicy, gluedForm, gluedVariants, wordMatcher } from './policy.mjs';
import { inflectionalBases, tokenize } from './morph.mjs';
import { measureText, fitSize, typographic, loadMetrics } from './text-metrics.mjs';
import { clockClasses, allowedTods, maskClockTimes } from './time-words.mjs';

// ---- library-derived matchers (built once per library and policy) ----------
const libCache = new WeakMap();
function libMatchers(lib, policy) {
  let byPolicy = libCache.get(lib);
  if (!byPolicy) libCache.set(lib, (byPolicy = new WeakMap()));
  if (byPolicy.has(policy)) return byPolicy.get(policy);
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const f = lib.raw.medicalTherapyFlags;
  const morph = policy.compiled.morph;
  const m = {
    // the validator's exact patterns
    banned: f.banned.map((t) => [t, new RegExp(`(^|[^a-z0-9])${esc(t)}($|[^a-z0-9])`, 'i')]),
    caution: f.caution.map((t) => [t, new RegExp(`(^|[^a-z])${esc(t)}`, 'i')]),
    // planner addition: a banned term is a lemma too, matched by the stemmer in its inflections and regular
    // derivatives ('diagnosed', 'panicking', 'symptomatic', 'traumatised'); a term the library writes as an
    // inflected form stands for its base ('triggered' → trigger, 'depressed' → depress, so 'Triggers.',
    // 'Depressing.'); the caution patterns already match any ending
    bannedLemmas: f.banned.map((t) => [t, wordMatcher(t, { derive: true, morph, heads: inflectionalBases(t, morph) })]),
    // the same terms as they would sit inside a glued hashtag (with their inflections and derivative stems)
    gluedFlags: [
      ...f.banned.flatMap((t) => gluedVariants(t, { inflect: true, derive: true, morph, heads: inflectionalBases(t, morph) }).map((g) => ({ rule: 'medical', term: t, glued: g }))),
      ...f.caution.map((t) => ({ rule: 'caution', term: t, glued: gluedForm(t) })).filter((g) => g.glued),
    ],
    // every word of the library's copy: all of it is lint-clean, so a library word that contains a
    // term ('still' contains 'ill') is an innocent carrier of it inside a hashtag
    vocabulary: libraryVocabulary(lib),
    // time words as they would sit inside a glued hashtag: the library's literal timeWords
    // ('bedtime', 'tonight', 'sundaynight', '2am') and the planner's timePhrases ('latenight')
    gluedTimes: [
      ...Object.entries(lib.raw.timeWords).filter(([k]) => !k.startsWith('$')).flatMap(([classes, pats]) => pats.flatMap(literalExpansions).map((g) => ({ glued: g, classes: classes.split('|') }))),
      ...policy.compiled.timePhrases.map((p) => ({ glued: gluedForm(p.term), classes: p.classes })).filter((g) => g.glued),
      ...['noon', 'midday'].map((g) => ({ glued: g, classes: classesOfHour(12, policy) })),
    ],
  };
  byPolicy.set(policy, m);
  return m;
}

/**
 * The literal spellings a simple time-word pattern stands for, glued
 * ('\\b(1|2|3|4) ?AM\\b' → 1am, 2am, 3am, 4am; '\\bSUNDAY (6 PM|NIGHT)\\b' →
 * sunday6pm, sundaynight). Patterns with other regex syntax, and spellings
 * without a letter ('8:15'), give nothing.
 */
function literalExpansions(src) {
  let outs = [src.replace(/\\b/g, '').replace(/ \?/g, ' ')];
  const group = /\(([^()]*)\)/;
  for (let guard = 0; guard < 8 && outs.some((x) => group.test(x)); guard++) {
    outs = outs.flatMap((x) => { const g = group.exec(x); return g ? g[1].split('|').map((alt) => x.slice(0, g.index) + alt + x.slice(g.index + g[0].length)) : [x]; });
  }
  return outs.filter((x) => /^[A-Za-z0-9 :]+$/.test(x) && /[a-z]/i.test(x)).map((x) => x.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

/** The ToD classes policy.lint.clockTimes maps an hour (0-23) to. */
function classesOfHour(hour, policy) {
  for (const [classes, hs] of Object.entries(policy.lint.clockTimes.hours)) if (hs.includes(hour)) return classes.split('|');
  return [];
}

/** Lowercase words (letters and digits, apostrophes dropped) of every copy string in the library. */
function libraryVocabulary(lib) {
  const words = new Set();
  const add = (text) => { for (const w of String(text).toLowerCase().replace(/'/g, '').split(/[^a-z0-9]+/)) if (w) words.add(w); };
  for (const t of lib.templates.values()) {
    hooksOf(t).forEach((h) => h.forEach(add));
    linePools(t).flat().forEach(add);
    resolutionsOf(t).forEach((r) => r.lines.forEach(add));
    (t.nameWords || []).forEach(add);
  }
  lib.raw.brand.closers.flat().forEach(add);
  return words;
}

const issue = (rule, where, text, message, severity = 'error', term = undefined) => ({ rule, severity, where, text, message, ...(term === undefined ? {} : { term }) });
const keyOf = (i) => `${i.rule}␟${(i.term ?? '').toLowerCase()}`;
// every form of a breath word (FU-3: 'Exhaling slowly.' and 'Inhaling.' passed the whole-word list)
const BREATH_WORD = /\b(breath|inhal|exhal)/i;
const SPLIT_BRAND = /\bhush[\s-]+mallow/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const COUNT_WORDS = Object.freeze({ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 });
const COUNT_TOKEN = new RegExp(`\\b(\\d{1,2}|${Object.keys(COUNT_WORDS).join('|')})\\b`, 'gi');

/**
 * A breathing count: three or more consecutive numbers in a row, up or down,
 * with only punctuation, spaces or 'and' between them ('2... 3... 4',
 * 'one, two, three', '4, 3, 2'). → the matched run, or null.
 */
export function countRun(text) {
  const toks = [...String(text).matchAll(COUNT_TOKEN)].map((m) => ({ n: /^\d+$/.test(m[1]) ? Number(m[1]) : COUNT_WORDS[m[1].toLowerCase()], at: m.index, end: m.index + m[0].length }));
  for (let i = 0; i + 2 < toks.length; i++) {
    let len = 1;
    const step = toks[i + 1].n - toks[i].n;
    if (Math.abs(step) !== 1) continue;
    while (i + len < toks.length && toks[i + len].n - toks[i + len - 1].n === step && /^[\s.,!?:;-]*(?:and[\s.,!?:;-]*)?$/i.test(text.slice(toks[i + len - 1].end, toks[i + len].at))) len++;
    if (len >= 3) return text.slice(toks[i].at, toks[i + len - 1].end);
  }
  return null;
}

/** How a matched word relates to its lemma, for messages ('a form (+ing) of', 'a derivative (+al+ly) of'). */
function derivedFrom(h) {
  if (!h.path.length) return 'a use of';
  const how = h.path.map((id) => (id === 'irregular' ? 'irregular form' : `+${id}`)).join(' ');
  return h.path.every((id) => ['s', "'s", 'ed', 'ing', 'est', 'er', 'irregular'].includes(id)) ? `a form (${how}) of` : `a derivative (${how}) of`;
}

/**
 * Raw phrase hits of a text, whatever kind of copy it is: banned medical
 * terms, caution terms (before the whitelist), topics, names and breath-hold
 * phrasing. Shared by the per-string rules and the joined-rows check.
 * → [{ rule, term, message }] (cached per lib and policy).
 */
const hitCache = new WeakMap();
function phraseHits(text, lib, policy) {
  let byPolicy = hitCache.get(lib);
  if (!byPolicy) hitCache.set(lib, (byPolicy = new WeakMap()));
  let cache = byPolicy.get(policy);
  if (!cache) byPolicy.set(policy, (cache = new Map()));
  if (cache.has(text)) return cache.get(text);
  const m = libMatchers(lib, policy), c = policy.compiled, out = [];
  const toks = tokenize(text);
  for (const [t, re] of m.banned) if (re.test(text)) out.push({ rule: 'medical', term: t, message: `banned medical/therapy/safety term "${t}" in "${text}"` });
  for (const [t, matcher] of m.bannedLemmas) {
    if (out.some((h) => h.rule === 'medical' && h.term === t)) continue;
    const h = matcher.hit(text, toks);
    if (h) out.push({ rule: 'medical', term: t, message: `"${h.word}", ${derivedFrom(h)} the banned medical/therapy/safety term "${t}", in "${text}"` });
  }
  for (const [t, re] of m.caution) if (re.test(text)) out.push({ rule: 'caution', term: t, message: `caution term "${t}" in "${text}" (needs a cautionWhitelist entry in planner/policy.json)` });
  for (const t of c.topics) {
    const h = t.match.hit(text, toks);
    if (h) out.push({ rule: `topic:${t.cat}`, term: t.term, message: `${t.cat} topic ("${t.term}"${h.path.length ? `, as "${h.word}": ${derivedFrom(h)} "${h.lemma}"` : ''}) in "${text}"` });
  }
  for (const t of c.names) if (t.re.test(text)) out.push({ rule: `name:${t.cat}`, term: t.term, message: `real ${t.cat} name ("${t.term}") in "${text}"` });
  for (const t of c.breathHold) if (t.re.test(text)) out.push({ rule: 'breath-hold', term: t.term, message: `breath-hold, breathing-count or breathing-instruction phrasing in "${text}"` });
  const run = countRun(text);
  if (run) out.push({ rule: 'breath-hold', term: 'count-run', message: `a breathing count ("${run}") in "${text}"` });
  // the brand split in two ('Hush Mallow', 'hush-mallow', or over the rows of a hook or end card)
  if (SPLIT_BRAND.test(text)) out.push({ rule: 'brand-case', term: 'hush mallow', message: `the brand is one lowercase word 'hushmallow', never split ("${text}")` });
  cache.set(text, out);
  return out;
}

/**
 * Context-free rules for one string. kind: 'hook-line' | 'line' | 'end-line' |
 * 'name-word' | 'caption'. Cached per (lib, policy, kind, text).
 */
const strCache = new WeakMap();
export function lintString(text, kind, { lib, policy = loadPolicy(), where = kind } = {}) {
  let byPolicy = strCache.get(lib);
  if (!byPolicy) strCache.set(lib, (byPolicy = new WeakMap()));
  let cache = byPolicy.get(policy);
  if (!cache) byPolicy.set(policy, (cache = new Map()));
  const key = `${kind}␟${text}`;
  let found = cache.get(key);
  if (!found) {
    found = stringRules(text, kind, lib, policy);
    cache.set(key, found);
  }
  return found.map((i) => ({ ...i, where }));
}

function stringRules(text, kind, lib, policy) {
  const out = [];
  const add = (rule, message) => out.push(issue(rule, kind, text, message));
  const c = policy.compiled;
  if (typeof text !== 'string' || !text.length) { add('empty', 'empty text'); return out; }
  if (EMOJI.test(text)) add('emoji', `emoji in "${text}"`);
  const nonLatin = [...text].filter((ch) => { const cp = ch.codePointAt(0); return !((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff)); });
  if (nonLatin.length) add('latin1', `characters outside Latin-1 (${[...new Set(nonLatin)].map((ch) => `U+${ch.codePointAt(0).toString(16).padStart(4, '0')}`).join(', ')}) in "${text}"`);
  if (/^\s|\s$|\s{2}/.test(text)) add('spacing', `leading, trailing or double spaces in "${text}"`);
  for (const h of phraseHits(text, lib, policy)) {
    if (h.rule === 'caution' && c.cautionOk.has(`${h.term.toLowerCase()}␟${text}`)) continue;
    out.push(issue(h.rule, kind, text, h.message, 'error', h.term));
  }
  // every occurrence lowercase (the validator only demands one lowercase occurrence)
  if ((text.match(/hushmallow/gi) || []).some((s) => s !== 'hushmallow')) add('brand-case', `brand name must be lowercase 'hushmallow' in "${text}"`);
  if (c.breathWordKinds.has(kind) && BREATH_WORD.test(text)) add('breath-word', `breath word in "${text}": the breath belongs to the ritual, never to on-screen copy (policy.lint.breathWords)`);

  if (kind === 'hook-line') {
    if (text.length > 32) add('hook-length', `"${text}" ${text.length} > 32 chars`);
    if (/[a-z]/.test(text)) add('hook-caps', `not ALL CAPS: "${text}"`);
  } else if (kind === 'line') {
    if (text.length > 28) add('line-length', `"${text}" ${text.length} > 28 chars`);
    if (!wrap2(text, policy.layout.bubble.maxRowChars)) add('line-wrap', `"${text}" cannot wrap into 2 bubble rows of <= ${policy.layout.bubble.maxRowChars} chars`);
    if (BREATH_WORD.test(text)) add('line-breath', `breath word in escalation line "${text}"`);
  } else if (kind === 'end-line') {
    if (text.length > 28) add('end-length', `"${text}" ${text.length} > 28 chars`);
  } else if (kind === 'name-word') {
    if (/[A-Z]/.test(text)) add('name-case', `name word not lowercase: "${text}"`);
  }
  return out;
}

/** Seconds a text element must stay readable: max(minimum, base + perChar * chars). */
export function readingSeconds(chars, minimum, policy = loadPolicy()) {
  return Math.max(minimum, policy.reading.base + policy.reading.perChar * chars);
}

/**
 * The readable window (s) the beat clock of `duration` gives an element.
 * slot: 'hook' | 'end' | 0..3 (thought line). The hook's window is cyclic by
 * default: it returns at HOOK_IN and stays through the loop seam until
 * HOOK_OUT (policy.reading.hookWindow; 'first-view' counts 0..HOOK_OUT only).
 */
export function readingWindow(clock, slot, { duration, hookWindow = 'cyclic' } = {}) {
  if (slot === 'hook') {
    if (hookWindow === 'cyclic' && clock.HOOK_IN !== undefined && Number(duration) > clock.HOOK_IN) return clock.HOOK_OUT + (Number(duration) - clock.HOOK_IN);
    return clock.HOOK_OUT;
  }
  if (slot === 'end') return clock.CARD_OUT - clock.RESOLVE;
  const at = clock[`L${slot + 1}`];
  if (at === undefined) return 0;
  return clock.RITUAL[0] - at;
}

/**
 * The times of day a text allows (null = it names no time).
 *
 * The planner's reading: the keyword classes (the library's timeWords plus
 * policy.lint.timePhrases, unioned as the library validator unions them) are
 * read on the text with its clock phrases blanked out, so "two o'clock in the
 * morning" is 2 AM and not MORNING, and intersected with the classes of the
 * explicit clock times (planner/time-words.mjs).
 *
 * The validator's reading is the floor: templates/validate-library.mjs reads
 * the library's timeWords on the raw text, and the planner's answer is
 * intersected with it, so the planner never allows a time of day the
 * validator would not (copy lint is a superset of the validator). Where the
 * two readings disagree ("3 IN THE MORNING": the validator reads MORNING,
 * the clock reads 3 AM) no time of day fits, and the text is never planned.
 */
export function timeClassesOf(text, { lib, policy = loadPolicy() }) {
  return timeReading(text, { lib, policy }).allowed;
}

/** Both readings of a text's time words, and what they allow together: { validator, planner, allowed } (null = no time named). */
export function timeReading(text, { lib, policy = loadPolicy() }) {
  if (policy.compiled.timeExempt.has(text)) return { validator: null, planner: null, allowed: null, exempt: true };
  const planner = allowedTods(keywordClasses(maskClockTimes(text), lib, policy), clockClasses(text, policy.lint.clockTimes.hours));
  const validator = lib.timeClasses(text);
  return { validator, planner, allowed: allowedTods(validator, planner) };
}

/** Union of the ToD classes of the library's timeWords and the planner's timePhrases in text, or null. */
export function keywordClasses(text, lib, policy = loadPolicy()) {
  let out = lib.timeClasses(text);
  for (const p of policy.compiled.timePhrases) if (p.re.test(text)) out = [...new Set([...(out || []), ...p.classes])];
  return out;
}

/**
 * Phrase rules read across the row break of a 2-row hook or end card. The
 * rows are one text on screen, so a banned phrase split over them ("Hold
 * your" / "breath now.", "WHEN YOU WANT TO END" / "IT ALL") is as visible as
 * one inside a row. Reports only hits no single row has (single words never
 * straddle the break: rows split at spaces).
 */
function crossRowIssues(lines, where, ctx) {
  if (!Array.isArray(lines) || lines.length < 2 || !lines.every((l) => typeof l === 'string' && l)) return [];
  const P = ctx.policy, joined = lines.join(' ');
  const inRows = new Set(lines.flatMap((l) => phraseHits(l, ctx.lib, P)).map(keyOf));
  return phraseHits(joined, ctx.lib, P)
    .filter((h) => !inRows.has(keyOf(h)))
    .filter((h) => h.rule !== 'caution' || !P.compiled.cautionOk.has(`${h.term.toLowerCase()}␟${joined}`))
    .map((h) => issue(h.rule, where, joined, `${h.message}, read across the row break ("${lines.join(' / ')}")`, 'error', h.term));
}

/** Time-of-day agreement for one text: contradictory time words always, the spec's ToD when known. */
function timeIssue(text, where, ctx) {
  const r = timeReading(text, ctx);
  const allowed = r.allowed;
  if (!allowed) return null;
  if (!allowed.length) {
    const why = r.validator && r.planner && !r.validator.some((c) => r.planner.includes(c))
      ? `: the library validator reads ${r.validator.join('|')} (its timeWords on the whole text), the planner reads ${r.planner.join('|')} (the clock phrase as a whole); the library could not hold this text in any template, so write the time another way ("3 AM", not "3 in the morning")`
      : ' (no time of day fits them all)';
    return issue('time-word', where, text, `time words in "${text}" contradict each other${why}`);
  }
  if (ctx.tod && !allowed.includes(ctx.tod)) return issue('time-word', where, text, `time words in "${text}" need ToD ${allowed.join('|')}, the spec is ${ctx.tod}`);
  return null;
}

function withCtx(ctx) {
  const policy = ctx.policy || loadPolicy();
  return { ...ctx, policy, metrics: ctx.metrics || loadMetrics() };
}

/** All issues of a hook (array of 1-2 ALL-CAPS lines) in context { lib, tod?, duration? }. */
export function lintHook(lines, ctx0) {
  const ctx = withCtx(ctx0), out = [], P = ctx.policy;
  const text = Array.isArray(lines) ? lines.join(' ') : String(lines);
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 2) out.push(issue('hook-lines', 'hook', text, 'hook must be 1-2 lines'));
  for (const l of [].concat(lines)) out.push(...lintString(l, 'hook-line', { lib: ctx.lib, policy: P, where: 'hook' }));
  out.push(...crossRowIssues(lines, 'hook', ctx));
  if ((text.match(/[?!]/g) || []).length > 1) out.push(issue('hook-punct', 'hook', text, `more than one ?/! in "${text}"`));
  const t = timeIssue(text, 'hook', ctx); if (t) out.push(t);
  const L = P.layout.hook;
  if (Array.isArray(lines) && out.every((i) => i.rule !== 'latin1') &&
      fitSize(lines, { weight: L.weight, tracking: L.tracking, max: L.maxSize, min: L.minSize, maxWidth: L.maxWidth, margin: P.layout.margin, metrics: ctx.metrics }) === null) {
    out.push(issue('layout-hook', 'hook', text, `"${text}" does not fit ${L.maxWidth} px even at ${L.minSize} px`));
  }
  if (ctx.duration && Array.isArray(lines)) out.push(...readingIssues(lines, 'hook', ctx));
  return out;
}

/**
 * Reading time of a caption block (hook or end card). The block is one
 * readable text however it wraps (G-DIR: each readable line, and the hook and
 * end line each >= 2.0 s), so all its rows are read in the one window the
 * clock shows it: an error when max(minCaption, base + perChar * chars of the
 * joined rows) exceeds that window.
 */
function readingIssues(lines, slot, ctx) {
  const P = ctx.policy;
  const clock = ctx.lib.clocks[ctx.duration];
  if (!clock) return [issue('reading-time', slot, lines.join(' '), `no beat clock for ${ctx.duration} s`)];
  const have = readingWindow(clock, slot, { duration: ctx.duration, hookWindow: P.reading.hookWindow });
  const text = lines.join(' '), need = readingSeconds(text.length, P.reading.minCaption, P);
  if (need > have + 1e-9) return [issue('reading-time', slot, text, `the ${slot} "${text}" (${text.length} chars) needs ${need.toFixed(2)} s to read; the ${ctx.duration} s clock shows it ${have.toFixed(2)} s`)];
  return [];
}

/** All issues of an end-card text (resolution or brand closer: 1-2 lines). */
export function lintEnd(lines, ctx0) {
  const ctx = withCtx(ctx0), out = [], P = ctx.policy;
  const text = Array.isArray(lines) ? lines.join(' ') : String(lines);
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 2) out.push(issue('end-lines', 'end', text, 'end text must be 1-2 lines'));
  for (const l of [].concat(lines)) {
    const found = lintString(l, 'end-line', { lib: ctx.lib, policy: P, where: 'end' });
    out.push(...found);
    const L = P.layout.end;
    if (!found.some((i) => i.rule === 'latin1') && measureText(typographic(l), { weight: L.weight, size: L.size, tracking: L.tracking, metrics: ctx.metrics }) * P.layout.margin > L.maxWidth) {
      out.push(issue('layout-end', 'end', l, `"${l}" is wider than ${L.maxWidth} px at ${L.size} px`));
    }
  }
  out.push(...crossRowIssues(lines, 'end', ctx));
  const t = timeIssue(text, 'end', ctx); if (t) out.push(t);
  if (ctx.duration && Array.isArray(lines)) out.push(...readingIssues(lines, 'end', ctx));
  return out;
}

/** Issues of one thought line in slot k (0..3) of a spec. */
export function lintLine(text, slot, ctx0) {
  const ctx = withCtx(ctx0), P = ctx.policy, where = `lines[${slot}]`;
  const out = lintString(text, 'line', { lib: ctx.lib, policy: P, where });
  const t = timeIssue(text, where, ctx); if (t) out.push(t);
  const B = P.layout.bubble;
  if (!out.some((i) => i.rule === 'latin1')) {
    for (const row of wrap2(text, B.maxRowChars) || []) {
      const w = measureText(typographic(row), { weight: B.weight, size: B.size, tracking: B.tracking, metrics: ctx.metrics }) * P.layout.margin + 2 * B.padX;
      if (w > B.maxWidth) out.push(issue('layout-bubble', where, text, `bubble row "${row}" is ${w.toFixed(0)} px wide (> ${B.maxWidth})`));
    }
  }
  if (ctx.duration) {
    const clock = ctx.lib.clocks[ctx.duration];
    if (clock[`L${slot + 1}`] === undefined) out.push(issue('line-slot', where, text, `the ${ctx.duration} s clock has no L${slot + 1} beat`));
    else {
      const need = readingSeconds(text.length, P.reading.minLine, P), have = readingWindow(clock, slot, { duration: ctx.duration });
      if (need > have + 1e-9) out.push(issue('reading-time', where, text, `line needs ${need.toFixed(2)} s to read, L${slot + 1} of the ${ctx.duration} s clock gives ${have.toFixed(2)} s`));
    }
  }
  return out;
}

/** Set rules over the thought lines: first words differ, <= 2 question marks. */
export function lintLineSet(lines) {
  const out = [];
  const first = lines.map((l) => (l.match(/[A-Za-z0-9']+/) || [''])[0].toLowerCase());
  const dup = first.find((w, i) => w && first.indexOf(w) !== i);
  if (dup) out.push(issue('lines-first-word', 'lines', lines.join(' | '), `two lines start with "${dup}"`));
  if ((lines.join(' ').match(/\?/g) || []).length > 2) out.push(issue('lines-questions', 'lines', lines.join(' | '), 'more than 2 question marks across the lines'));
  return out;
}

/** Grief pairing (policy.lint.griefPairing): a sensitive hook never with a comic L3. */
export function lintGrief(template, hook, lines, policy = loadPolicy()) {
  const out = [];
  for (const g of policy.lint.griefPairing) {
    if (g.template !== template || hook.join(' ') !== g.hook.join(' ')) continue;
    if (lines[2] && g.comicL3.includes(lines[2])) out.push(issue('grief-pairing', 'lines[2]', lines[2], `"${hook.join(' ')}" is grief-adjacent and never pairs with the comic L3 "${lines[2]}"`));
  }
  return out;
}

/**
 * Lint the whole copy of a spec. ctx: { lib, policy?, template (id), tod, duration, ritual }.
 * → issues (errors and warnings).
 */
export function lintCopy(copy, ctx0) {
  const ctx = withCtx(ctx0), out = [];
  if (!copy || typeof copy !== 'object') return [issue('copy-shape', 'copy', '', 'copy missing')];
  out.push(...lintHook(copy.hook, ctx));
  const lines = Array.isArray(copy.lines) ? copy.lines : [];
  lines.forEach((l, k) => out.push(...lintLine(l, k, ctx)));
  out.push(...lintLineSet(lines));
  if (ctx.template) out.push(...lintGrief(ctx.template, [].concat(copy.hook), lines, ctx.policy));
  if (copy.end?.text) out.push(...lintEnd(copy.end.text, ctx));
  if (copy.nameWord != null) out.push(...lintString(copy.nameWord, 'name-word', { lib: ctx.lib, policy: ctx.policy, where: 'nameWord' }));
  return out;
}

/**
 * Lint one hashtag ('#word', lowercase letters, digits, '_'): every medical,
 * caution, topic and name term (with the inflections of the lemma lists and
 * the stems their derivatives start with: #smoked, #suicidally, #starvation),
 * and policy.lint.hashtags.terms, searched as a substring of the glued tag
 * ('_' removed). An occurrence is excused only when a longer carrier word
 * covers it: a library copy word, policy.lint.hashtags.carriers ('pillow'
 * covers 'pill') or an innocent look-alike of policy.lint.morphology.notForms
 * ('gravy', 'treaty'), so the line lint and the hashtag lint agree on them. Terms of one or
 * two letters ('ig', 'fb') count only as the whole tag. Fails closed.
 * A tag may not name a time of day either (#2am, #latenight, #bedtime): the
 * owner's list in library/brand.json goes on every video, whatever its time
 * of day (rule time-word).
 */
export function lintHashtag(tag, { lib, policy = loadPolicy(), where = 'hashtag' }) {
  const out = [];
  if (!/^#[A-Za-z0-9_]+$/.test(tag)) return [issue('hashtag-shape', where, tag, `"${tag}" is not a hashtag (#, then letters, digits or _)`)];
  const body = tag.slice(1).toLowerCase().replace(/_/g, '');
  const m = libMatchers(lib, policy), c = policy.compiled;
  const carrierSpans = [];
  for (const w of new Set([...m.vocabulary, ...c.carriers, ...c.morph.notForms.keys()])) {
    if (w.length < 3) continue;
    for (let j = body.indexOf(w); j >= 0; j = body.indexOf(w, j + 1)) carrierSpans.push([j, j + w.length, w]);
  }
  /** Is there an occurrence of glued in the tag that no longer carrier word covers? */
  const uncovered = (glued) => {
    // a 1-2 letter term ('ig', 'fb', 'hm' from h&m) is only a hit as the whole tag: as a substring it is noise
    if (glued.length < 3) return body === glued;
    for (let i = body.indexOf(glued); i >= 0; i = body.indexOf(glued, i + 1)) {
      const end = i + glued.length;
      if (!carrierSpans.some(([a, b, w]) => a <= i && end <= b && w !== glued && w.length > glued.length)) return true;
    }
    return false;
  };
  const reported = new Set();
  for (const t of [...m.gluedFlags, ...c.gluedTerms]) {
    const k = `${t.rule}␟${t.term}`;
    if (reported.has(k) || !uncovered(t.glued)) continue;
    reported.add(k);
    out.push(issue(t.rule, where, tag, `${t.rule} term "${t.term}"${t.glued === gluedForm(t.term) ? '' : ` (as "${t.glued}")`} inside the hashtag "${tag}" (if this is an innocent word, add the word that contains it to policy.lint.hashtags.carriers)`, 'error', t.term));
  }
  // a glued time word, or a clock time glued to its meridiem (#2am, #brainat2am, #4pmslump)
  const time = m.gluedTimes.find((g) => uncovered(g.glued));
  const clock = /(?<![0-9])(1[0-2]|0?[1-9])(?:[0-5][0-9])?([ap])m/.exec(body);
  if (time || clock) {
    const hour = clock ? (Number(clock[1]) % 12) + (clock[2] === 'p' ? 12 : 0) : null;
    const [said, classes] = time ? [time.glued, time.classes] : [clock[0], classesOfHour(hour, policy)];
    out.push(issue('time-word', where, tag, `the hashtag "${tag}" names a time of day ("${said}": ${classes.join('|')}); the owner's hashtags go on every video, whatever its time of day`, 'error', said));
  }
  return out;
}

/** Lint a caption (export caption.txt): context-free string rules per line, plus every hashtag searched inside. */
export function lintCaption(text, { lib, policy = loadPolicy() }) {
  const out = [];
  text.split('\n').filter(Boolean).forEach((l, i) => {
    const where = `caption:${i + 1}`;
    const found = lintString(l, 'caption', { lib, policy, where });
    out.push(...found);
    const seen = new Set(found.map(keyOf));
    for (const tag of l.match(/#[A-Za-z0-9_]+/g) || []) {
      for (const h of lintHashtag(tag, { lib, policy, where })) if (!seen.has(keyOf(h))) { seen.add(keyOf(h)); out.push(h); }
    }
  });
  return out;
}

export const errorsOf = (issues) => issues.filter((i) => i.severity === 'error');
