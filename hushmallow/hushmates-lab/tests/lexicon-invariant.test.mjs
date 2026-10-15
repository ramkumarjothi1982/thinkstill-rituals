// An invariant between the two layers of the safety screen (Tier 0 self-assessment, synthesis item 18):
// whatever the shared safety lexicon on its own calls a crisis (src/ultra/reframe-engine.js checkSafety,
// Reframe's, reused unchanged), Hushmates' screen (core/feeling-safety.js screenFeeling) answers with a
// support screen and never releases to strangers. Hushmates' own layer reads more than the lexicon (its
// extra rules, normalisation), so it may hold back more; it may release less only where a sentence is on
// the pinned list below. Checked over every phrasing the reviews found (tests/fixtures/mallow-probes.json,
// all groups) and the Tier 0 probe (docs/clinical/tier0-probe-results.csv).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkSafety } from '../../src/ultra/reframe-engine.js';
import { screenFeeling } from '../core/feeling-safety.js';
import { parseCsv, phrasings } from '../tools/safety-eval.mjs';

const P = JSON.parse(readFileSync(new URL('./fixtures/mallow-probes.json', import.meta.url), 'utf8'));
const PROBE = parseCsv(readFileSync(new URL('../docs/clinical/tier0-probe-results.csv', import.meta.url), 'utf8'));

// Everyday sentences the lexicon alone calls a crisis, which the screen releases on purpose: its everyday
// blanking (core/feeling-safety.js, EVERYDAY_NOT_WANT) reads the concrete place, person or thing after the
// lexicon's words. Each is a developer decision, pinned in the fixture's released group and awaiting the
// Tier A clinical review (docs/REVIEWS.md). It is not a clinical judgement. If the reviewer calls one for
// support, it leaves this list and the released group together. Nothing joins this list without that review.
const PINNED_EVERYDAY = [
  "I don't want to go on the school camp.",              // lexicon: "don't want to go on" (going on living); here a school trip
  "I don't want to wake up early tomorrow.",             // lexicon: "don't want to wake up"; here an early alarm
  "I don't want to live in this city anymore.",          // lexicon: "don't want to live"; here a city
  "I don't want to be around my family this Christmas.", // lexicon: "don't want to be around"; here a family Christmas
  "I no longer want to live with my parents.",           // lexicon: "no longer want to live"; here a home
];

/** Every phrasing: each fixture group's raw text (a [label, text] pair gives its text), the same with any reviewer's note left off, and the probe. */
function everyPhrasing() {
  const out = new Map();
  const add = (where, text) => { if (typeof text === 'string' && text.trim() && !out.has(text)) out.set(text, where); };
  for (const [group, value] of Object.entries(P)) {
    if (group === 'about') continue;
    const list = Array.isArray(value) ? value : value.phrasings;
    assert.ok(Array.isArray(list), `the fixture's ${group} group has no list of phrasings`);
    for (const item of list) add(`fixture:${group}`, Array.isArray(item) ? item[item.length - 1] : item);
  }
  for (const r of phrasings(P)) add(`fixture:${r.group}`, r.phrasing);
  for (const r of PROBE) add(`probe:${r.category}`, r.phrasing);
  return [...out].map(([text, where]) => ({ text, where }));
}

const lexiconCrisis = (text) => checkSafety(text).level === 'crisis';
const support = (text) => { const r = screenFeeling(text, { minChars: 1, maxChars: 10000 }); return !r.ok && r.code === 'support'; };

test('the invariant reads every fixture group and the whole Tier 0 probe', () => {
  const all = everyPhrasing();
  for (const g of Object.keys(P).filter((k) => k !== 'about')) assert.ok(all.some((p) => p.where === `fixture:${g}`), `nothing read from the fixture's ${g} group`);
  assert.equal(PROBE.length, 246);
  assert.equal(all.filter((p) => p.where.startsWith('probe:')).length, PROBE.length, 'the probe was not read in full');
  // about 20 in the fixture (most of its crisis phrasings are Hushmates' own rules) and 40 in the probe
  assert.ok(all.filter(({ text }) => lexiconCrisis(text)).length >= 50, 'too few lexicon crises: the invariant would prove little');
});

test('what the shared lexicon alone calls a crisis, the screen never releases (except the pinned everyday sentences)', () => {
  const pinned = new Set(PINNED_EVERYDAY);
  const violations = everyPhrasing().filter(({ text }) => lexiconCrisis(text) && !support(text) && !pinned.has(text))
    .map(({ text, where }) => `[${where}] ${text} (lexicon: "${checkSafety(text).matched}")`);
  assert.deepEqual(violations, [],
    `The screen releases ${violations.length} phrasing(s) the shared lexicon calls a crisis. This is a safety regression in core/feeling-safety.js, `
    + `not a reason to extend the allow-list (that needs the clinical review):\n  ${violations.join('\n  ')}`);
});

test('the pinned everyday sentences are exactly those the screen releases, and each is pinned in the fixture’s released group', () => {
  for (const t of PINNED_EVERYDAY) {
    assert.ok(P.released.includes(t), `"${t}" is not in the fixture's released group: it can't be on the allow-list`);
    assert.ok(lexiconCrisis(t), `the lexicon no longer calls "${t}" a crisis: take it off the allow-list`);
  }
  const released = everyPhrasing().filter(({ text }) => lexiconCrisis(text) && !support(text)).map(({ text }) => text);
  assert.deepEqual(released.filter((t) => PINNED_EVERYDAY.includes(t)).sort(), [...PINNED_EVERYDAY].sort(),
    'a pinned sentence now gets support: take it off the allow-list (and out of the released group, after the review)');
});
