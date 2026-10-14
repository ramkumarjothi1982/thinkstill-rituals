// planner/policy.json loader: checks that every section the planner reads is
// present and well-formed, and compiles the lint word lists into regular
// expressions once. A malformed policy is a hard error, never a silent default.

import fs from 'node:fs';
import { studioPath } from '../render/lib/paths.mjs';

export const POLICY_FILE = studioPath('planner', 'policy.json');
let cached = null;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * English inflections of a name used as a word: s, es, 's, ed, d, ing, er,
 * ers; the final e dropped (googling, facetiming) and the final consonant
 * doubled (Instagrammed, snapchatting).
 */
function inflected(term) {
  const alts = [`${escapeRe(term)}(?:s|es|'s|’s|ed|d|ing|er|ers)?`];
  const last = term.at(-1);
  if (last === 'e') alts.push(`${escapeRe(term.slice(0, -1))}(?:ing|ed|er|ers)`);
  else if (/[b-df-hj-np-tv-z]/i.test(last)) alts.push(`${escapeRe(term)}${escapeRe(last)}(?:ed|ing|er|ers)`);
  return `(?:${alts.join('|')})`;
}

/**
 * 'term' → whole-word/phrase regex; 'term+' → the same plus its English
 * inflections (google+ → Googled, googling); 're:<src>' → that regex. All
 * case-insensitive. flex: a space or hyphen inside the term matches a space,
 * a hyphen or nothing (names: 'coca-cola' → Coca Cola, cocacola; 'tik tok+'
 * → TikTok, Tik-Tok, tiktoks).
 */
export function termRegex(term, { flex = false } = {}) {
  if (term.startsWith('re:')) return new RegExp(term.slice(3), 'i');
  let body = term.length > 1 && term.endsWith('+') ? inflected(term.slice(0, -1)) : escapeRe(term);
  if (flex) body = body.replace(/[ -]/g, '[\\s-]?');
  return new RegExp(`(^|[^a-z0-9À-ÿ])${body}($|[^a-z0-9À-ÿ])`, 'i');
}

/**
 * A term as it would appear glued inside a hashtag: lowercase letters and
 * digits only ('panic attack' → panicattack, 'mcdonald's' → mcdonalds,
 * 'pokémon' → pokemon, 'google+' → google). null for 're:' patterns.
 */
export function gluedForm(term) {
  if (term.startsWith('re:')) return null;
  const t = term.endsWith('+') && term.length > 1 ? term.slice(0, -1) : term;
  const g = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return g || null;
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
  const glue = (rule, term) => ({ rule, term, glued: gluedForm(term) });
  const compiled = {
    topics: lists(lint.topics).flatMap(([cat, terms]) => terms.map((t) => ({ cat, term: t, re: termRegex(t) }))),
    names: lists(lint.names).flatMap(([cat, terms]) => terms.map((t) => ({ cat, term: t, re: termRegex(t, { flex: true }) }))),
    breathHold: lint.breathHold.map((t) => ({ term: t, re: termRegex(t) })),
    breathWordKinds: new Set(lint.breathWords.kinds),
    timePhrases: timePhrases.flatMap(([classes, terms]) => terms.map((t) => ({ classes: classes.split('|'), term: t, re: termRegex(t) }))),
    // hashtag search (lint-copy adds the library's medical/caution terms and its vocabulary as carriers)
    gluedTerms: [
      ...lists(lint.topics).flatMap(([cat, terms]) => terms.map((t) => glue(`topic:${cat}`, t))),
      ...lists(lint.names).flatMap(([cat, terms]) => terms.map((t) => glue(`name:${cat}`, t))),
      ...Object.entries(ht.terms).flatMap(([rule, terms]) => terms.map((t) => glue(rule, t))),
    ].filter((g) => g.glued),
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
