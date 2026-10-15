// planner/policy.json loader: checks that every section the planner reads is
// present and well-formed, and compiles the lint word lists into regular
// expressions once. A malformed policy is a hard error, never a silent default.

import fs from 'node:fs';
import { studioPath } from '../render/lib/paths.mjs';
import { phraseForms, gluedForms } from './morph.mjs';

export const POLICY_FILE = studioPath('planner', 'policy.json');
let cached = null;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * How a list entry is matched. 're:<src>' is a regular expression; '=term' is
 * the term exactly as written; 'term+' inflects (names opt in this way); any
 * other entry inflects when `inflectByDefault` (topics and medical terms are
 * lemma lists) and is matched as written otherwise (names).
 * → { kind: 're'|'term', text, inflect }
 */
export function parseTerm(term, { inflectByDefault = false } = {}) {
  if (term.startsWith('re:')) return { kind: 're', text: term.slice(3), inflect: false };
  if (term.length > 1 && term.startsWith('=')) return { kind: 'term', text: term.slice(1), inflect: false };
  if (term.length > 1 && term.endsWith('+')) return { kind: 'term', text: term.slice(0, -1), inflect: true };
  return { kind: 'term', text: term, inflect: inflectByDefault };
}

/** A non-capturing alternation of literal forms, longest first. */
const alternation = (fs) => (fs.length === 1 ? escapeRe(fs[0]) : `(?:${[...new Set(fs)].sort((a, b) => b.length - a.length || (a < b ? -1 : 1)).map(escapeRe).join('|')})`);

/**
 * A list entry → a case-insensitive whole-word/phrase regex.
 *   'term'   the word or phrase as written ('re:<src>' is that regex);
 *   'term+'  plus its inflections (planner/morph.mjs: google+ → Googled,
 *            googling; instagram+ → Instagrammed; smoke → smoked, smoker);
 *   '=term'  only as written, even where the list inflects by default.
 * opts.inflect: inflect plain entries (topic and medical lemma lists).
 * opts.flex: a space or hyphen inside the term matches a space, a hyphen or
 * nothing ('coca-cola' → Coca Cola, cocacola; 'self harm' → self-harming,
 * selfharm). opts.morph: { irregular, notForms } (policy.lint.morphology).
 */
export function termRegex(term, { flex = false, inflect = false, morph = null } = {}) {
  const t = parseTerm(term, { inflectByDefault: inflect });
  if (t.kind === 're') return new RegExp(t.text, 'i');
  let body;
  if (t.inflect) {
    const { words, seps } = phraseForms(t.text, morph);
    body = words.map(alternation).reduce((acc, part, i) => `${acc}${flex ? '[\\s-]?' : escapeRe(seps[i - 1])}${part}`);
  } else {
    body = escapeRe(t.text);
    if (flex) body = body.replace(/[ -]/g, '[\\s-]?');
  }
  return new RegExp(`(^|[^a-z0-9\u00c0-\u00ff])${body}($|[^a-z0-9\u00c0-\u00ff])`, 'i');
}

/**
 * A term as it would appear glued inside a hashtag: lowercase letters and
 * digits only ('panic attack' → panicattack, 'mcdonald's' → mcdonalds,
 * 'pokémon' → pokemon, 'google+' → google). null for 're:' patterns.
 */
export function gluedForm(term) {
  const t = parseTerm(term);
  if (t.kind === 're') return null;
  const g = t.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return g || null;
}

/**
 * Every glued spelling of a term inside a hashtag: gluedForm(), plus, for an
 * inflecting entry, its inflected forms glued (planner/morph.mjs gluedForms:
 * #suicidal, #smoked, #selfharming). [] for 're:' patterns.
 */
export function gluedVariants(term, { inflect = false, morph = null } = {}) {
  const t = parseTerm(term, { inflectByDefault: inflect });
  if (t.kind === 're') return [];
  const base = gluedForm(term);
  return [...new Set([...(base ? [base] : []), ...(t.inflect ? gluedForms(t.text, morph) : [])])];
}

const need = (cond, msg) => { if (!cond) throw new Error(`planner/policy.json: ${msg}`); };
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Validate a parsed policy object and attach compiled matchers. Exported for tests. */
export function compilePolicy(p) {
  need(p.schema === 'hm-planner-policy/1', `schema must be hm-planner-policy/1, got ${p.schema}`);
  const s = p.sampling;
  need(s && isNum(s.mallowWeight?.primary) && isNum(s.mallowWeight?.secondary), 'sampling.mallowWeight.{primary,secondary}');
  need(isNum(s.slotWeight?.primary) && isNum(s.slotWeight?.alt), 'sampling.slotWeight.{primary,alt}');
  need(s.signatureGag?.rate >= 0 && s.signatureGag.rate <= 1, 'sampling.signatureGag.rate in [0,1]');
  need(isNum(s.duration?.['15']) && isNum(s.duration?.rest), 'sampling.duration.{15,rest}');
  need(isNum(s.closer?.rate) && isNum(s.closer?.positiveRate) && Number.isInteger(s.closer?.maxConsecutive), 'sampling.closer');
  need(isNum(s.fourthLine?.rate), 'sampling.fourthLine.rate');
  need(Number.isInteger(s.retries?.perSpec) && s.retries.perSpec >= 1 && Number.isInteger(s.retries.backtrack) && s.retries.backtrack >= 0, 'sampling.retries.{perSpec,backtrack}');
  need(['hue', 'warmth', 'exposure'].every((k) => isNum(s.worldJitter?.[k])), 'sampling.worldJitter');
  need(Array.isArray(s.sound?.contours) && s.sound.contours.length && s.sound.tickTempo?.length === 2, 'sampling.sound');
  const it = p.intensity;
  need(it && isNum(it.low) && it.low > 0 && it.low <= 1 && it.byTone && it.byTemplate, 'intensity.{low,byTone,byTemplate}');
  for (const [k, v] of Object.entries(it.byTemplate)) need(isNum(v.cap) && v.cap > 0 && v.cap <= 1, `intensity.byTemplate.${k}.cap`);
  const u = p.uniqueness;
  need(u && isNum(u.windowDays) && Number.isInteger(u.minSlotsDiffer) && isNum(u.minWeightedDistance) && isNum(u.hookJaccard), 'uniqueness');
  need(Array.isArray(u.ruleSlots) && Array.isArray(u.mustDifferOneOf) && u.weights, 'uniqueness.{ruleSlots,mustDifferOneOf,weights}');
  const q = p.sequencing;
  need(q && Array.isArray(q.noRepeat) && Number.isInteger(q.mallowWindow) && Number.isInteger(q.mallowMaxPerWindow) &&
    Number.isInteger(q.familyWindow) && Number.isInteger(q.minFamilies) && Number.isInteger(q.minPositiveOrMixed) &&
    Number.isInteger(q.templatePerWeek) && q.templatePerWeekOverrides, 'sequencing');
  const c = p.cooldowns;
  need(c && ['hookDays', 'lineUses', 'lineDays', 'resolutionUses', 'resolutionDays'].every((k) => isNum(c[k])), 'cooldowns');
  const cad = p.cadence;
  need(cad && ['fewMallowsBelow', 'maxPerWeekFewMallows', 'maxPerWeek'].every((k) => Number.isInteger(cad[k])), 'cadence');
  const r = p.reading;
  need(r && ['base', 'perChar', 'minLine', 'minCaption'].every((k) => isNum(r[k])), 'reading');
  need(['cyclic', 'first-view'].includes(r.hookWindow), 'reading.hookWindow must be cyclic|first-view');
  const l = p.layout;
  need(l && isNum(l.margin) && l.margin >= 1 && l.hook && l.end && l.bubble, 'layout.{margin,hook,end,bubble}');
  const lint = p.lint;
  need(lint && lint.topics && lint.names && Array.isArray(lint.breathHold) && Array.isArray(lint.cautionWhitelist) &&
    Array.isArray(lint.timeWordExemptions) && Array.isArray(lint.griefPairing), 'lint.{topics,names,breathHold,cautionWhitelist,timeWordExemptions,griefPairing}');
  need(lint.breathWords && Array.isArray(lint.breathWords.kinds) && lint.breathWords.kinds.every((k) => ['hook-line', 'end-line', 'line', 'caption'].includes(k)), 'lint.breathWords.kinds (hook-line, end-line, line, caption)');
  const ht = lint.hashtags;
  need(ht && Array.isArray(ht.carriers) && ht.carriers.every((w) => typeof w === 'string' && /^[a-z0-9]+$/.test(w)), 'lint.hashtags.carriers (lowercase words)');
  need(ht.terms && typeof ht.terms === 'object' && Object.entries(ht.terms).every(([rule, ts]) => /^(breath-hold|medical|caution|topic:[a-z-]+|name:[a-z]+)$/.test(rule) && Array.isArray(ts) && ts.every((t) => typeof t === 'string' && /^[a-z0-9]+$/.test(t))), 'lint.hashtags.terms ({ rule: [lowercase glued terms] })');
  const mo = lint.morphology;
  const lower = (w) => typeof w === 'string' && /^[a-z][a-z']*$/.test(w);
  need(mo && mo.irregular && typeof mo.irregular === 'object' && Object.entries(mo.irregular).every(([k, v]) => lower(k) && Array.isArray(v) && v.length && v.every(lower)), 'lint.morphology.irregular ({ lemma: [irregular forms] }, lowercase words)');
  need(Array.isArray(mo.notForms) && mo.notForms.every(lower), 'lint.morphology.notForms (lowercase words)');
  for (const [cat, terms] of Object.entries(lint.topics).filter(([k]) => k !== 'source' && !k.startsWith('$'))) {
    need(Array.isArray(terms) && terms.every((t) => typeof t === 'string' && t.trim() === t && t.length > 0 && (t.startsWith('re:') || t === t.toLowerCase())), `lint.topics.${cat}: lowercase terms (a lemma, '=term' as written, or 're:<regex>')`);
  }
  const tp = lint.timePhrases;
  need(tp && typeof tp === 'object', 'lint.timePhrases');
  const hours = lint.clockTimes?.hours;
  need(hours && typeof hours === 'object', 'lint.clockTimes.hours');
  const seen = Object.values(hours).flat();
  need(seen.every((h) => Number.isInteger(h) && h >= 0 && h <= 23), 'lint.clockTimes.hours: hours are integers 0..23');
  need(seen.length === 24 && new Set(seen).size === 24, 'lint.clockTimes.hours: every hour 0..23 exactly once');
  const ex = p.export;
  need(ex && Array.isArray(ex.requiredQaGates) && ex.requiredQaGates.length && ex.requiredQaGates.every((g) => typeof g === 'string' && /^G-[A-Z0-9-]+$/.test(g)), 'export.requiredQaGates (gate names like G-FINAL)');

  const lists = (o) => Object.entries(o).filter(([k]) => k !== 'source' && !k.startsWith('$'));
  const timePhrases = lists(tp);
  for (const [classes, terms] of timePhrases) need(/^[a-z-]+(\|[a-z-]+)*$/.test(classes) && Array.isArray(terms) && terms.every((t) => typeof t === 'string' && t && !t.startsWith('re:')), `lint.timePhrases.${classes}`);
  // topic entries are lemmas: each matches its inflections (planner/morph.mjs); names inflect when written 'name+'
  const morph = Object.freeze({ irregular: mo.irregular, notForms: new Set(mo.notForms) });
  // the term as messages show it: the entry without its '+' or '=' marker
  const shown = (t) => (t.startsWith('re:') ? t : parseTerm(t).text);
  const glue = (rule, term, inflect) => gluedVariants(term, { inflect, morph }).map((g) => ({ rule, term: shown(term), glued: g }));
  const compiled = {
    morph,
    topics: lists(lint.topics).flatMap(([cat, terms]) => terms.map((t) => ({ cat, term: shown(t), re: termRegex(t, { flex: true, inflect: true, morph }) }))),
    names: lists(lint.names).flatMap(([cat, terms]) => terms.map((t) => ({ cat, term: shown(t), re: termRegex(t, { flex: true, morph }) }))),
    breathHold: lint.breathHold.map((t) => ({ term: t, re: termRegex(t) })),
    breathWordKinds: new Set(lint.breathWords.kinds),
    timePhrases: timePhrases.flatMap(([classes, terms]) => terms.map((t) => ({ classes: classes.split('|'), term: t, re: termRegex(t) }))),
    // hashtag search (lint-copy adds the library's medical/caution terms and its vocabulary as carriers)
    gluedTerms: [
      ...lists(lint.topics).flatMap(([cat, terms]) => terms.flatMap((t) => glue(`topic:${cat}`, t, true))),
      ...lists(lint.names).flatMap(([cat, terms]) => terms.flatMap((t) => glue(`name:${cat}`, t, false))),
      ...Object.entries(ht.terms).flatMap(([rule, terms]) => terms.flatMap((t) => glue(rule, t, false))),
    ],
    carriers: ht.carriers,
    cautionOk: new Set(lint.cautionWhitelist.map((w) => `${w.term.toLowerCase()}␟${w.text}`)),
    timeExempt: new Set(lint.timeWordExemptions.map((w) => w.text)),
  };
  return Object.freeze({ ...p, compiled });
}

/** The committed planner policy (cached), or a policy file given explicitly. */
export function loadPolicy(file = POLICY_FILE) {
  if (file === POLICY_FILE && cached) return cached;
  const p = compilePolicy(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (file === POLICY_FILE) cached = p;
  return p;
}
