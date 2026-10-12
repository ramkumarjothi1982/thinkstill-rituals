#!/usr/bin/env node
// Re-runs the quality gate ALONE over a recorded eval run and shows what the
// gate decides now: which rejected drafts would pass today, which still fail
// (and why), and whether any answer the gate accepted then now fails. No model
// call, no cost.
//
//   node eval/replay-gate.mjs                         # run 1 (eval/runs/run1-answers.json)
//   node eval/replay-gate.mjs path/to/angle-eval-….json   # any later run's JSON report
//   npm run replay:gate -- path/to/angle-eval-….json

import { readFileSync } from 'node:fs';
import { replayRun, labels } from './replay.js';
import { CASES } from './cases.js';

const path = process.argv[2] || new URL('./runs/run1-answers.json', import.meta.url).pathname;
const run = JSON.parse(readFileSync(path, 'utf8'));
const items = replayRun(run, { cases: CASES });
const tag = (/** @type {import('./replay.js').ReplayItem} */ it) => `${it.id}${it.round ? ' (another angle)' : ''}${it.attempt ? `, draft ${it.attempt}` : ''}`;
const q = (/** @type {[string, string]} */ l) => `“${l[0]}” / “${l[1]}”`;

const drafts = items.filter((i) => i.kind === 'draft');
const accepted = items.filter((i) => i.kind === 'accepted');
const cleared = drafts.filter((d) => !d.after.length);
const still = drafts.filter((d) => d.after.length);
const newlyFailing = accepted.filter((a) => a.after.length);

console.log(`Gate replay of ${path.split('/').pop()} (prompt ${run.prompt || '?'}): ${accepted.length} accepted answers, ${drafts.length} rejected drafts.\n`);
console.log(`Rejected drafts that pass now: ${cleared.length}/${drafts.length}`);
for (const d of cleared) console.log(`  PASS NOW  ${tag(d)} — was ${[...new Set(d.before)].join(', ')}\n            ${q(d.lines)}`);
console.log(`\nRejected drafts that still fail: ${still.length}/${drafts.length}`);
for (const d of still) console.log(`  STILL     ${tag(d)} — ${labels(d.after).join(', ')} (${d.words} words; was ${[...new Set(d.before)].join(', ')})\n            ${q(d.lines)}`);
console.log(`\nAccepted answers that still pass: ${accepted.length - newlyFailing.length}/${accepted.length}`);
for (const a of newlyFailing) {
  console.log(`  NOW FAILS ${tag(a)} — ${labels(a.after).join(', ')}\n            ${q(a.lines)}`);
  for (const f of a.after) console.log(`            ${f.code}: ${f.message}`);
}
const words = accepted.map((a) => a.words).sort((x, y) => x - y);
if (words.length) console.log(`\nWords in the two lines (accepted): median ${words[Math.floor(words.length / 2)]}, max ${words[words.length - 1]}, over 28: ${words.filter((w) => w > 28).length}/${words.length}`);
