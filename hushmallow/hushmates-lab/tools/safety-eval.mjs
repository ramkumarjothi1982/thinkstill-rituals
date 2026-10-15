#!/usr/bin/env node
// The safety screen, measured instead of argued about (docs/CRISIS_DETECTION.md).
//
//   node tools/safety-eval.mjs                       what the screen does with every known phrasing
//   node tools/safety-eval.mjs --export <file.csv>   a sheet for the clinical reviewers to label
//   node tools/safety-eval.mjs --export <file.csv> --sample   the shorter sheet for one reviewer (REVIEWS.md)
//   node tools/safety-eval.mjs --labels <file.csv>   the screen scored against their labels
//
// The sheet is blind: one row per phrasing, in a shuffled order, with no hint of what Hushmates
// does with it now or how a developer filed it; a column for each of two clinicians (crisis ·
// danger · care · release · unsure), each labelling alone, then the label they agree on.
// Scored against the agreed labels it reports, for crisis and someone-in-danger together,
// how many the screen catches (sensitivity), how many everyday feelings it holds back
// (false alarms), and how far the two clinicians agreed before they settled (Cohen's kappa).
// Nothing here is a clinical claim: the numbers are only as good as the labels.

import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { screenFeeling } from '../core/feeling-safety.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'mallow-probes.json');
export const LABELS = ['crisis', 'danger', 'care', 'release', 'unsure'];
const RISK = new Set(['crisis', 'danger']);

/** What the screen does with a feeling, in the sheet's words. */
export function outcome(text) {
  const r = screenFeeling(text, { minChars: 1, maxChars: 10000 });
  if (r.ok) return 'release';
  if (r.code !== 'support') return 'release';                                // too short, contact details…: not a safety answer
  if (r.level === 'crisis') return /danger/i.test(r.support?.title || '') ? 'danger' : 'crisis';
  return 'care';
}

/** Every phrasing the reviews found, with the group it was filed under (and any reviewer's note). */
export function phrasings(fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'))) {
  const rows = [];
  const add = (group, text) => {
    const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(text);
    rows.push({ group, phrasing: m && m[2].length > 12 ? m[1] : text, note: m && m[2].length > 12 ? m[2] : '' });
  };
  for (const g of ['crisis', 'danger', 'crisisNotCare', 'careNotCrisis', 'released']) for (const t of fixture[g]) add(g, t);
  for (const t of fixture.clinicianCandidates.phrasings) add('undecided', t);
  return rows;
}

const quote = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
/** Every phrasing in the sheet's order, which doesn't group them (the same order every time), with its sheet id. */
export function blindOrder(rows) {
  let seed = 20261015;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  return rows.map((r) => [rand(), r]).sort((a, b) => a[0] - b[0]).map(([, r], i) => ({ ...r, id: i + 1 }));
}

/** The blind sheet: phrasings only. `only` keeps some rows, with the full sheet's ids and order. */
export function toCsv(rows, { only } = {}) {
  const head = ['id', 'phrasing', 'clinician_1', 'clinician_2', 'agreed', 'notes'];
  const order = blindOrder(rows).filter((r) => !only || only.has(r.id));
  return `${[head, ...order.map((r) => [r.id, r.phrasing, '', '', '', ''])].map((line) => line.map(quote).join(',')).join('\n')}\n`;
}

/**
 * The shorter sheet for one reviewer (docs/REVIEWS.md, Tier A): every undecided phrasing, plus as many
 * of the others again, drawn from each group in proportion so no kind is left out. The ids are the
 * full sheet's, so the labels drop straight into it later; the full sheet itself never changes.
 */
export function sampleIds(rows) {
  const order = blindOrder(rows);
  const undecided = order.filter((r) => r.group === 'undecided');
  const others = order.filter((r) => r.group !== 'undecided');
  const ids = new Set(undecided.map((r) => r.id));
  for (const g of [...new Set(others.map((r) => r.group))]) {
    const inGroup = others.filter((r) => r.group === g);
    const n = Math.max(1, Math.round((undecided.length * inGroup.length) / others.length));
    for (const r of inGroup.slice(0, n)) ids.add(r.id);
  }
  return ids;
}

/** RFC 4180 CSV → objects keyed by the header row. */
export function parseCsv(text) {
  const out = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(field); out.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); out.push(row); }
  const [head, ...rest] = out.filter((r) => r.some((c) => c.trim()));
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/** Cohen's kappa between two raters over the rows both labelled. */
export function kappa(pairs) {
  const n = pairs.length;
  if (!n) return null;
  const agree = pairs.filter(([a, b]) => a === b).length / n;
  const cats = [...new Set(pairs.flat())];
  const chance = cats.reduce((s, c) => s + (pairs.filter(([a]) => a === c).length / n) * (pairs.filter(([, b]) => b === c).length / n), 0);
  return chance === 1 ? 1 : (agree - chance) / (1 - chance);
}

/** The screen against the clinicians' agreed labels (rows labelled "unsure" or not at all are left out). */
export function score(rows) {
  const bad = rows.filter((r) => r.agreed && !LABELS.includes(r.agreed)).map((r) => `${r.id}: "${r.agreed}"`);
  if (bad.length) throw new Error(`labels must be one of ${LABELS.join(', ')} (${bad.slice(0, 5).join('; ')})`);
  const labelled = rows.filter((r) => r.agreed && r.agreed !== 'unsure').map((r) => ({ ...r, now: outcome(r.phrasing) }));
  const risk = labelled.filter((r) => RISK.has(r.agreed));
  const everyday = labelled.filter((r) => r.agreed === 'release');
  const caught = risk.filter((r) => RISK.has(r.now));
  const heldBack = everyday.filter((r) => r.now !== 'release');
  const flagged = labelled.filter((r) => RISK.has(r.now));
  const confusion = {};
  for (const r of labelled) { confusion[r.agreed] ||= {}; confusion[r.agreed][r.now] = (confusion[r.agreed][r.now] || 0) + 1; }
  const both = rows.filter((r) => LABELS.includes(r.clinician_1) && LABELS.includes(r.clinician_2)).map((r) => [r.clinician_1, r.clinician_2]);
  return {
    labelled: labelled.length,
    unsure: rows.filter((r) => r.agreed === 'unsure').length,
    sensitivity: risk.length ? caught.length / risk.length : null,
    missed: risk.filter((r) => !RISK.has(r.now)).map((r) => ({ id: r.id, phrasing: r.phrasing, agreed: r.agreed, now: r.now })),
    falseAlarmRate: everyday.length ? heldBack.length / everyday.length : null,
    falseAlarms: heldBack.map((r) => ({ id: r.id, phrasing: r.phrasing, now: r.now })),
    ppv: flagged.length ? flagged.filter((r) => RISK.has(r.agreed)).length / flagged.length : null,
    confusion,
    kappa: kappa(both),
    raterPairs: both.length,
  };
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const pct = (x) => (x == null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
  if (arg('export')) {
    const file = arg('export');
    const rows = phrasings();
    const only = process.argv.includes('--sample') ? sampleIds(rows) : undefined;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, toCsv(rows, { only }));
    console.log(only
      ? `Wrote ${only.size} of the ${rows.length} phrasings to ${file}, for one reviewer (docs/REVIEWS.md, Tier A). The ids are the full sheet's.`
      : `Wrote ${rows.length} phrasings to ${file}, for two clinicians to label (${LABELS.join(' · ')}).`);
  } else if (arg('labels')) {
    const s = score(parseCsv(readFileSync(arg('labels'), 'utf8')));
    console.log(`Labelled: ${s.labelled} (unsure: ${s.unsure}).  Clinicians' agreement before settling: kappa ${s.kappa == null ? 'n/a' : s.kappa.toFixed(2)} over ${s.raterPairs}.`);
    if (!s.raterPairs) console.log('One reviewer, so no agreement was measured: this is an expert review of these phrasings, not a validation of the screen.');
    console.log(`Crisis and someone-in-danger caught: ${pct(s.sensitivity)}   ·   everyday feelings held back: ${pct(s.falseAlarmRate)}   ·   of those flagged, really at risk: ${pct(s.ppv)}`);
    for (const m of s.missed) console.log(`  missed (${m.agreed}, screen says ${m.now}): ${m.phrasing}`);
    for (const f of s.falseAlarms) console.log(`  held back (screen says ${f.now}): ${f.phrasing}`);
  } else {
    const rows = phrasings();
    const by = {};
    for (const r of rows) { const o = outcome(r.phrasing); by[r.group] ||= {}; by[r.group][o] = (by[r.group][o] || 0) + 1; }
    for (const [g, counts] of Object.entries(by)) console.log(`${g.padEnd(14)} ${Object.entries(counts).map(([o, n]) => `${o} ${n}`).join(' · ')}`);
    console.log('\nThese are developer-written phrasings, not a clinical evaluation: export them for clinicians (--export).');
  }
}
