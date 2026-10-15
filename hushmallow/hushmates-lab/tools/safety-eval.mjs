#!/usr/bin/env node
// The safety screen, measured instead of argued about (docs/CRISIS_DETECTION.md).
//
//   node tools/safety-eval.mjs                       what the screen does with every known phrasing
//   node tools/safety-eval.mjs --export <file.csv>   a sheet for the clinical reviewers to label
//   node tools/safety-eval.mjs --export <file.csv> --sample   the shorter sheet for one reviewer (REVIEWS.md, Tier A)
//   node tools/safety-eval.mjs --export <file.csv> --undecided   only the phrasings the developers couldn't call
//   node tools/safety-eval.mjs --export <file.csv> --sample --display-ids <key.csv>
//                                                    the shorter sheet again, shuffled afresh and numbered 1..108,
//                                                    with a key back to the full sheet's ids (the key stays with the developers)
//   node tools/safety-eval.mjs --library <file.csv>  every Mallow line, for the reviewer to read (REVIEWS.md, Tier A)
//   node tools/safety-eval.mjs --labels <file.csv> [--key <key.csv>]   the screen scored against their labels
//                                                    (--key reports a display sheet's rows by the full sheet's ids)
//   node tools/safety-eval.mjs --probe <results.csv> [--blind <file.csv>]
//                                                    the Tier 0 probe through today's screen (its screen_now column),
//                                                    and its blind sheet for a reviewer
//
// The sheet is blind: one row per phrasing, in a shuffled order, with no hint of what Hushmates
// does with it now or how a developer filed it; a column for each of two clinicians (crisis ·
// danger · care · release · unsure), each labelling alone, then the label they agree on.
// Scored against the agreed labels it reports, for crisis and someone-in-danger together,
// how many the screen catches (sensitivity), how many everyday feelings it holds back
// (false alarms), and how far the two clinicians agreed before they settled (Cohen's kappa).
// It also shows what those figures leave out: every label against every screen (care and unsure
// too), the unsure rows, risk sent to the wrong screen, care the screen releases, and how many
// distinct phrasings stand behind each count (some appear twice on the sheet).
// Nothing here is a clinical claim: the numbers are only as good as the labels.

import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { screenFeeling } from '../core/feeling-safety.js';
import { libraryCatalogue } from '../core/perspectives.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'mallow-probes.json');
export const LABELS = ['crisis', 'danger', 'care', 'release', 'unsure'];
/** What the screen can do with a feeling, in the sheet's words. */
export const OUTCOMES = ['crisis', 'danger', 'care', 'release'];
const RISK = new Set(['crisis', 'danger']);
/** The title of the screen for someone else in danger (core/feeling-safety.js); every other crisis screen is the writer's own. */
export const DANGER_TITLE = 'Someone might be in danger';

/** What the screen does with a feeling, in the sheet's words. */
export function outcome(text) {
  const r = screenFeeling(text, { minChars: 1, maxChars: 10000 });
  if (r.ok) return 'release';
  if (r.code !== 'support') return 'release';                                // too short, contact details…: not a safety answer
  if (r.level === 'crisis') return /danger/i.test(r.support?.title || '') ? 'danger' : 'crisis';
  return 'care';
}

/**
 * The same answer in more detail: `outcome` tells the writer's own crisis screen ('crisis') from
 * "Someone might be in danger" ('danger') by that screen's exact title, `code` says why a feeling
 * that got no support wasn't released either ('too-short', 'contact', 'unkind'…; 'ok' when it was),
 * and `title` is the support screen's.
 */
export function outcomeDetail(text) {
  const r = screenFeeling(text, { minChars: 1, maxChars: 10000 });
  if (r.ok) return { outcome: 'release', code: 'ok', title: '' };
  if (r.code !== 'support') return { outcome: 'release', code: r.code, title: '' };
  const title = r.support?.title || '';
  if (r.level === 'crisis') return { outcome: title === DANGER_TITLE ? 'danger' : 'crisis', code: 'support', title };
  return { outcome: 'care', code: 'support', title };
}

/** A phrasing however it was typed (case, curly quotes, spacing, a full stop at the end), for counting distinct phrasings. */
export function normalisePhrasing(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase().replace(/[‘’ʼ′`´]/g, "'").replace(/[“”″]/g, '"')
    .replace(/\s+/g, ' ').trim().replace(/[\s.!?…]+$/u, '');
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
const csvOf = (lines) => `${lines.map((line) => line.map(quote).join(',')).join('\n')}\n`;
/** The rows in an order that doesn't group them, the same every time for the same seed. */
function shuffle(rows, seed) {
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  return rows.map((r) => [rand(), r]).sort((a, b) => a[0] - b[0]).map(([, r]) => r);
}
/** Every phrasing in the sheet's order, which doesn't group them (the same order every time), with its sheet id. */
export function blindOrder(rows) {
  return shuffle(rows, 20261015).map((r, i) => ({ ...r, id: i + 1 }));
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
export function sampleIds(rows, { others: withOthers = true } = {}) {
  const order = blindOrder(rows);
  const undecided = order.filter((r) => r.group === 'undecided');
  const others = withOthers ? order.filter((r) => r.group !== 'undecided') : [];
  const ids = new Set(undecided.map((r) => r.id));
  for (const g of [...new Set(others.map((r) => r.group))]) {
    const inGroup = others.filter((r) => r.group === g);
    const n = Math.max(1, Math.round((undecided.length * inGroup.length) / others.length));
    for (const r of inGroup.slice(0, n)) ids.add(r.id);
  }
  return ids;
}

/**
 * The shorter sheet as the reviewer sees it: the same rows, shuffled afresh (its own seed, not the full
 * sheet's) and numbered 1..n, so the order and the gaps in the full sheet's ids say nothing about how the
 * rows were chosen. Each row keeps its full sheet id (`id`) beside its `display_id`, for the key.
 */
export const DISPLAY_SEED = 20261016;
export function displaySample(rows, ids = sampleIds(rows)) {
  return shuffle(blindOrder(rows).filter((r) => ids.has(r.id)), DISPLAY_SEED).map((r, i) => ({ ...r, display_id: i + 1 }));
}
/** The display sheet: display ids and phrasings only, with the same label columns as the full sheet. */
export function displayCsv(rows, ids) {
  const head = ['display_id', 'phrasing', 'clinician_1', 'clinician_2', 'agreed', 'notes'];
  return csvOf([head, ...displaySample(rows, ids).map((r) => [r.display_id, r.phrasing, '', '', '', ''])]);
}
/** The key from display ids to the full sheet's: for the developers, never the reviewer's pack. */
export function displayKeyCsv(rows, ids) {
  return csvOf([['display_id', 'full_sheet_id'], ...displaySample(rows, ids).map((r) => [r.display_id, r.id])]);
}
/** A labelled display sheet's rows with the full sheet's ids (`id`), so the labels drop straight into it. */
export function withSheetIds(displayRows, keyRows) {
  const key = new Map(keyRows.map((k) => [String(k.display_id), String(k.full_sheet_id)]));
  return displayRows.map((r) => {
    const id = key.get(String(r.display_id));
    if (!id) throw new Error(`display id ${r.display_id} is not in the key`);
    return { ...r, id };
  });
}

/**
 * The Tier 0 probe (docs/clinical/tier0-probe-results.csv): developer-written phrasings, each with the
 * developer's intended answer and what the screen did at commit 000c0cd. Every column is kept;
 * `screen_now` is what today's screen does, and `id` is the row's id on the probe's blind sheet
 * (its own seed, so it isn't the order the rows were written in, which groups them by kind).
 */
export const PROBE_SEED = 20261017;
export function probeResults(rows) {
  const ids = new Map(shuffle(rows.map((_, i) => i), PROBE_SEED).map((i, n) => [i, n + 1]));
  return rows.map((r, i) => ({ id: ids.get(i), ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'id' && k !== 'screen_now')), screen_now: outcome(r.phrasing) }));
}
export function probeResultsCsv(results) {
  const head = Object.keys(results[0]);
  return csvOf([head, ...results.map((r) => head.map((h) => r[h] ?? ''))]);
}
/** The probe's blind sheet: an id and the phrasing, in id order, with empty label columns; nothing about intent or the screen. */
export function probeBlindCsv(results) {
  const head = ['id', 'phrasing', 'clinician_1', 'clinician_2', 'agreed', 'notes'];
  return csvOf([head, ...[...results].sort((a, b) => a.id - b.id).map((r) => [r.id, r.phrasing, '', '', '', ''])]);
}
/** The probe against what the developers intended, at a baseline column (e.g. screen_000c0cd) and now. */
export function probeSummary(results, baseline = 'screen_000c0cd') {
  const caughtAt = (list, col) => list.filter((r) => RISK.has(r[col])).length;
  const heldAt = (list, col) => list.filter((r) => r[col] !== 'release').length;
  const risk = results.filter((r) => RISK.has(r.intended));
  const care = results.filter((r) => r.intended === 'care');
  const everyday = results.filter((r) => r.intended === 'release');
  const pick = (r) => ({ id: r.id, phrasing: r.phrasing, intended: r.intended, before: r[baseline], now: r.screen_now });
  return {
    baseline,
    rows: results.length,
    phrasings: new Set(results.map((r) => normalisePhrasing(r.phrasing))).size,
    risk: { rows: risk.length, caughtBefore: caughtAt(risk, baseline), caughtNow: caughtAt(risk, 'screen_now'),
      routedBefore: risk.filter((r) => r[baseline] === r.intended).length, routedNow: risk.filter((r) => r.screen_now === r.intended).length },
    care: { rows: care.length, heldBefore: heldAt(care, baseline), heldNow: heldAt(care, 'screen_now') },
    everyday: { rows: everyday.length, heldBefore: heldAt(everyday, baseline), heldNow: heldAt(everyday, 'screen_now') },
    unsure: results.filter((r) => r.intended === 'unsure').length,
    newlyCaught: risk.filter((r) => !RISK.has(r[baseline]) && RISK.has(r.screen_now)).map(pick),
    newlyMissed: risk.filter((r) => RISK.has(r[baseline]) && !RISK.has(r.screen_now)).map(pick),
    newlyHeldEveryday: everyday.filter((r) => r[baseline] === 'release' && r.screen_now !== 'release').map(pick),
    changed: results.filter((r) => r[baseline] !== r.screen_now).map(pick),
  };
}

/**
 * Every line a Mallow can say, for a reviewer to read in one sitting: the openers and every
 * perspective line, with where it comes from (Hushmates' themes, a feeling's own lines, or Reframe's
 * library, which Hushmates uses read-only and can leave out line by line). A column for the
 * reviewer's call (ok · change · remove) and notes.
 */
export function libraryCsv(catalogue = libraryCatalogue()) {
  const head = ['n', 'kind', 'from', 'mallow', 'line', 'review', 'notes'];
  const rows = [
    ...catalogue.openers.map((o) => ['opener', `opener:${o.family}`, o.mallow, o.text]),
    ...catalogue.angles.map((a) => ['perspective', a.from, '', a.text]),
  ];
  return `${[head, ...rows.map((r, i) => [i + 1, ...r, '', ''])].map((line) => line.map(quote).join(',')).join('\n')}\n`;
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

/**
 * The screen against the clinicians' agreed labels. Sensitivity, false alarms and PPV leave out rows labelled
 * "unsure" or not at all; the rest of the report shows what those figures hide:
 * - `matrix`: every agreed label (unsure too) against every screen (crisis · danger · care · release), zeros included;
 * - `unsureRows`: the rows labelled unsure, with what the screen does now (each needs a check-in or a decision);
 * - `misrouted`: risk sent to the wrong screen (agreed danger, shown the writer's own crisis screen, or the reverse),
 *   which sensitivity still counts as caught;
 * - `careReleased`: rows labelled care that the screen releases to strangers;
 * - `counts`: rows and distinct phrasings behind each figure, since a phrasing can appear twice on a sheet;
 *   `repeated` lists those phrasings with their ids and labels;
 * - `awaitingAgreement`: rows a clinician labelled with no agreed label yet, which aren't scored;
 * - `prevalence`: the share of labelled rows at risk, on this sheet (it sets PPV; real traffic differs).
 * A display sheet (display_id, no id) is reported by its display ids.
 */
export function score(rows) {
  const idOf = (r) => r.id ?? r.display_id;
  const bad = rows.filter((r) => r.agreed && !LABELS.includes(r.agreed)).map((r) => `${idOf(r)}: "${r.agreed}"`);
  if (bad.length) throw new Error(`labels must be one of ${LABELS.join(', ')} (${bad.slice(0, 5).join('; ')})`);
  const all = rows.map((r) => ({ ...r, id: idOf(r), now: outcomeDetail(r.phrasing ?? '').outcome }));
  const labelled = all.filter((r) => r.agreed && r.agreed !== 'unsure');
  const unsure = all.filter((r) => r.agreed === 'unsure');
  const risk = labelled.filter((r) => RISK.has(r.agreed));
  const everyday = labelled.filter((r) => r.agreed === 'release');
  const care = labelled.filter((r) => r.agreed === 'care');
  const caught = risk.filter((r) => RISK.has(r.now));
  const missed = risk.filter((r) => !RISK.has(r.now));
  const heldBack = everyday.filter((r) => r.now !== 'release');
  const careReleased = care.filter((r) => r.now === 'release');
  const misrouted = risk.filter((r) => RISK.has(r.now) && r.now !== r.agreed);
  const flagged = labelled.filter((r) => RISK.has(r.now));
  const confusion = {};
  for (const r of labelled) { confusion[r.agreed] ||= {}; confusion[r.agreed][r.now] = (confusion[r.agreed][r.now] || 0) + 1; }
  const matrix = Object.fromEntries(LABELS.map((l) => [l, Object.fromEntries(OUTCOMES.map((o) => [o, 0]))]));
  for (const r of all) if (r.agreed) matrix[r.agreed][r.now]++;
  const count = (list) => ({ rows: list.length, phrasings: new Set(list.map((r) => normalisePhrasing(r.phrasing))).size });
  const byPhrasing = new Map();
  for (const r of all) { const k = normalisePhrasing(r.phrasing); byPhrasing.set(k, [...(byPhrasing.get(k) || []), r]); }
  const both = rows.filter((r) => LABELS.includes(r.clinician_1) && LABELS.includes(r.clinician_2)).map((r) => [r.clinician_1, r.clinician_2]);
  return {
    labelled: labelled.length,
    unsure: unsure.length,
    sensitivity: risk.length ? caught.length / risk.length : null,
    missed: missed.map((r) => ({ id: r.id, phrasing: r.phrasing, agreed: r.agreed, now: r.now })),
    falseAlarmRate: everyday.length ? heldBack.length / everyday.length : null,
    falseAlarms: heldBack.map((r) => ({ id: r.id, phrasing: r.phrasing, now: r.now })),
    ppv: flagged.length ? flagged.filter((r) => RISK.has(r.agreed)).length / flagged.length : null,
    confusion,
    kappa: kappa(both),
    raterPairs: both.length,
    prevalence: labelled.length ? risk.length / labelled.length : null,
    matrix,
    unsureRows: unsure.map((r) => ({ id: r.id, phrasing: r.phrasing, now: r.now })),
    misrouted: misrouted.map((r) => ({ id: r.id, phrasing: r.phrasing, agreed: r.agreed, now: r.now })),
    careReleased: careReleased.map((r) => ({ id: r.id, phrasing: r.phrasing, now: r.now })),
    awaitingAgreement: all.filter((r) => !r.agreed && (LABELS.includes(r.clinician_1) || LABELS.includes(r.clinician_2))).map((r) => r.id),
    counts: {
      sheet: count(all), labelled: count(labelled), unsure: count(unsure), risk: count(risk), caught: count(caught), missed: count(missed),
      everyday: count(everyday), heldBack: count(heldBack), care: count(care), careReleased: count(careReleased), misrouted: count(misrouted),
    },
    repeated: [...byPhrasing.values()].filter((list) => list.length > 1)
      .map((list) => ({ phrasing: list[0].phrasing, ids: list.map((r) => r.id), agreed: list.map((r) => r.agreed || '') })),
  };
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const pct = (x) => (x == null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
  const fail = (message) => { console.error(message); process.exit(1); };
  if (arg('export') && process.argv.includes('--display-ids')) {
    const file = arg('export');
    const keyFile = arg('display-ids');
    if (!process.argv.includes('--sample')) fail('--display-ids numbers the shorter sheet: use it with --sample.');
    if (!keyFile || keyFile.startsWith('--')) fail('--display-ids needs a file for the key: --display-ids <key.csv>.');
    if (resolve(keyFile) === resolve(file)) fail('The key and the sheet must be different files: the key never goes to the reviewer.');
    const rows = phrasings();
    for (const f of [file, keyFile]) mkdirSync(dirname(f), { recursive: true });
    writeFileSync(file, displayCsv(rows));
    writeFileSync(keyFile, displayKeyCsv(rows));
    const n = sampleIds(rows).size;
    console.log(`Wrote ${n} of the ${rows.length} phrasings to ${file}, shuffled afresh with display ids 1 to ${n}, for one reviewer (docs/REVIEWS.md, Tier A).`);
    console.log(`The key from display ids to the full sheet's ids is in ${keyFile}: keep it out of the reviewer's pack.`);
  } else if (arg('export')) {
    const file = arg('export');
    const rows = phrasings();
    const only = process.argv.includes('--sample') ? sampleIds(rows) : process.argv.includes('--undecided') ? sampleIds(rows, { others: false }) : undefined;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, toCsv(rows, { only }));
    console.log(only
      ? `Wrote ${only.size} of the ${rows.length} phrasings to ${file}, for one reviewer (docs/REVIEWS.md, Tier A). The ids are the full sheet's.`
      : `Wrote ${rows.length} phrasings to ${file}, for two clinicians to label (${LABELS.join(' · ')}).`);
  } else if (arg('library')) {
    const file = arg('library');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, libraryCsv());
    const c = libraryCatalogue();
    console.log(`Wrote ${c.openers.length} openers and ${c.angles.length} perspective lines to ${file}, for the reviewer to read (ok · change · remove).`);
  } else if (arg('labels')) {
    let sheet = parseCsv(readFileSync(arg('labels'), 'utf8'));
    if (arg('key')) sheet = withSheetIds(sheet, parseCsv(readFileSync(arg('key'), 'utf8')));
    const s = score(sheet);
    const c = s.counts;
    const n = (x) => `${x.rows} row${x.rows === 1 ? '' : 's'}, ${x.phrasings} distinct phrasing${x.phrasings === 1 ? '' : 's'}`;
    const ids = sheet.some((r) => r.display_id && !r.id) ? ' (ids are the display sheet’s: add --key <key.csv> for the full sheet’s)' : '';
    console.log(`Sheet: ${n(c.sheet)}${ids}.  Labelled: ${n(c.labelled)}; unsure: ${n(c.unsure)}.`);
    console.log(`Clinicians' agreement before settling: kappa ${s.kappa == null ? 'n/a' : s.kappa.toFixed(2)} over ${s.raterPairs}.`);
    if (!s.raterPairs) console.log('One reviewer, so no agreement was measured: this is an expert review of these phrasings, not a validation of the screen.');
    const w = s.awaitingAgreement.length;
    if (w) console.log(`Not scored: ${w} row${w === 1 ? ' has' : 's have'} a clinician's label but no agreed label (ids ${s.awaitingAgreement.join(', ')}).`);
    console.log(`Crisis and someone-in-danger caught: ${pct(s.sensitivity)} (${c.caught.rows} of ${c.risk.rows} rows; ${c.caught.phrasings} of ${c.risk.phrasings} distinct phrasings)`);
    console.log(`Everyday feelings held back: ${pct(s.falseAlarmRate)} (${c.heldBack.rows} of ${c.everyday.rows} rows; ${c.heldBack.phrasings} of ${c.everyday.phrasings} distinct phrasings)`);
    console.log(`Care released to strangers: ${c.careReleased.rows} of ${c.care.rows} rows labelled care (${c.careReleased.phrasings} of ${c.care.phrasings} distinct phrasings)`);
    console.log(`Of those flagged, really at risk: ${pct(s.ppv)}, on this sheet only (prevalence ${pct(s.prevalence)} on the sheet, not real traffic)`);
    console.log('\nAgreed label (rows) × what the screen does now (columns):');
    console.log(`  ${''.padEnd(9)}${OUTCOMES.map((o) => o.padStart(9)).join('')}${'all'.padStart(9)}`);
    for (const l of LABELS) {
      const row = OUTCOMES.map((o) => s.matrix[l][o]);
      console.log(`  ${l.padEnd(9)}${row.map((x) => String(x).padStart(9)).join('')}${String(row.reduce((a, b) => a + b, 0)).padStart(9)}`);
    }
    const list = (title, items, line) => { if (items.length) { console.log(`\n${title} (${items.length}):`); for (const x of items) console.log(`  ${line(x)}`); } };
    list('Missed', s.missed, (m) => `${m.id} (${m.agreed}, screen says ${m.now}): ${m.phrasing}`);
    list('Sent to the wrong screen (danger shown the writer’s own crisis screen, or crisis shown "Someone might be in danger"); counted as caught above', s.misrouted, (m) => `${m.id} (${m.agreed}, screen says ${m.now}): ${m.phrasing}`);
    list('Care the screen releases', s.careReleased, (m) => `${m.id}: ${m.phrasing}`);
    list('Held back', s.falseAlarms, (f) => `${f.id} (screen says ${f.now}): ${f.phrasing}`);
    list('Unsure: each needs a check-in or a decision', s.unsureRows, (u) => `${u.id} (screen says ${u.now}): ${u.phrasing}`);
    list('The same phrasing more than once on the sheet', s.repeated, (r) => `ids ${r.ids.join(', ')} (labelled ${r.agreed.map((a) => a || 'blank').join(' / ')}${new Set(r.agreed).size > 1 ? ', DIFFERENTLY' : ''}): ${r.phrasing}`);
  } else if (arg('probe')) {
    const file = arg('probe');
    const results = probeResults(parseCsv(readFileSync(file, 'utf8')));
    const baseline = Object.keys(results[0]).find((k) => k.startsWith('screen_') && k !== 'screen_now');
    if (!baseline) fail(`${file} needs a baseline column named screen_<commit>, e.g. screen_000c0cd.`);
    writeFileSync(file, probeResultsCsv(results));
    if (arg('blind')) { mkdirSync(dirname(arg('blind')), { recursive: true }); writeFileSync(arg('blind'), probeBlindCsv(results)); }
    const p = probeSummary(results, baseline);
    console.log(`Tier 0 probe: ${p.rows} rows, ${p.phrasings} distinct phrasings, developer-written (the intended answers are developers' guesses, not clinical labels).`);
    console.log(`Refreshed screen_now in ${file}${arg('blind') ? `; the blind sheet is ${arg('blind')}` : ''}.`);
    console.log(`Intended crisis or danger: ${p.risk.rows}. Caught ${p.risk.caughtBefore} at ${baseline}, ${p.risk.caughtNow} now (the right screen: ${p.risk.routedBefore}, ${p.risk.routedNow}).`);
    console.log(`Intended care: ${p.care.rows}. Held ${p.care.heldBefore} at ${baseline}, ${p.care.heldNow} now.`);
    console.log(`Intended everyday: ${p.everyday.rows}. Held back ${p.everyday.heldBefore} at ${baseline}, ${p.everyday.heldNow} now.   Unsure: ${p.unsure}.`);
    for (const r of p.changed) console.log(`  ${r.id} (${r.intended}: ${r.before} → ${r.now}): ${r.phrasing}`);
  } else {
    const rows = phrasings();
    const by = {};
    for (const r of rows) { const o = outcome(r.phrasing); by[r.group] ||= {}; by[r.group][o] = (by[r.group][o] || 0) + 1; }
    for (const [g, counts] of Object.entries(by)) console.log(`${g.padEnd(14)} ${Object.entries(counts).map(([o, n]) => `${o} ${n}`).join(' · ')}`);
    console.log('\nThese are developer-written phrasings, not a clinical evaluation: export them for clinicians (--export).');
  }
}
