// The safety desk's guide (staff/desk-guide.js) and the escalation procedure (docs/ESCALATION.md) say the
// same thing, in the same order; a priority report still open past the team's 12-hour target is marked
// as such in the report list, in words. desk.js itself runs only in a browser, so its wiring is checked
// from its source; the rule it uses (isOverdue) is checked here directly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URGENT_GUIDE, DESK_ACTIONS, OVERDUE_MS, isOverdue } from '../staff/desk-guide.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const doc = read('docs/ESCALATION.md');
const desk = read('staff/desk.js');
const css = read('styles/staff.css');

// compare words, not typography: curly quotes, markdown emphasis, case and line breaks aside
const norm = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

function section(md, n) {
  const start = md.indexOf(`\n## ${n}. `);
  assert.ok(start >= 0, `ESCALATION.md has a §${n}`);
  const end = md.indexOf('\n## ', start + 1);
  return md.slice(start, end < 0 ? undefined : end);
}

/** The numbered steps of a section, each with its indented continuation lines (sub-bullets). */
function numberedSteps(md) {
  const steps = [];
  for (const line of md.split('\n')) {
    const m = /^(\d+)\.\s+(.*)$/.exec(line);
    if (m) steps.push({ n: Number(m[1]), text: m[2] });
    else if (steps.length && /^\s+\S/.test(line)) steps[steps.length - 1].text += ` ${line.trim()}`;
    else if (steps.length && line.trim()) break;      // the first unindented paragraph ends the list
  }
  return steps;
}

// each step's key phrases, in order: they must appear in the guide's step and in the doc's step
const KEY_PHRASES = [
  ['read the words first', 'never shows who anyone is', "can't contact anyone"],
  ["if it's a feeling, take it out of circulation", "unless it clearly isn't about danger", '"someone may be in danger" report has already paused it', "if it's a perspective, remove it"],
  ['if the words point to immediate danger and the team independently holds information that identifies the person', 'for example, they emailed us directly', 'call 000', 'give what you know'],
  ['write what you saw and did in the team notes', 'no diagnosis, no guesses about who it is', 'tell the safety lead today', "if you can't decide, ring the safety lead now"],
  ['if the screen should have caught these words', 'add a paraphrase (never their words) to the review list'],
  ['look after yourself too', 'reading this is hard', 'talk to the safety lead, or one of the services below'],
];

test('the desk’s urgent steps and ESCALATION.md §3 are the same six steps, in the same order', () => {
  const docSteps = numberedSteps(section(doc, 3));
  assert.deepEqual(docSteps.map((s) => s.n), [1, 2, 3, 4, 5, 6]);
  assert.equal(URGENT_GUIDE.steps.length, 6);
  KEY_PHRASES.forEach((phrases, i) => {
    for (const p of phrases) {
      assert.ok(norm(URGENT_GUIDE.steps[i]).includes(p), `guide step ${i + 1} says "${p}"`);
      assert.ok(norm(docSteps[i].text).includes(p), `ESCALATION.md §3 step ${i + 1} says "${p}"`);
    }
  });
  // what each step tells the reader to press exists on the desk
  assert.ok(DESK_ACTIONS.feeling.some((a) => a.label === 'Take it out of circulation'));
  assert.ok(DESK_ACTIONS.perspective.some((a) => a.label === 'Remove the perspective'));
});

test('the national lines are the verified numbers, on the desk and in ESCALATION.md', () => {
  assert.deepEqual(URGENT_GUIDE.resources.map((r) => [r.label, r.detail]), [
    ['Emergency:', '000 (police, ambulance, fire).'],
    ['Lifeline:', '13 11 14, any time, day or night.'],
    ['Suicide Call Back Service:', '1300 659 467, any time.'],
    ['Beyond Blue:', '1300 22 4636, any time.'],
    ['13YARN (Aboriginal and Torres Strait Islander crisis support):', '13 92 76.'],
    ['1800RESPECT (family, domestic and sexual violence):', '1800 737 732.'],
  ]);
  const s3 = norm(section(doc, 3));
  for (const n of ['000', 'lifeline 13 11 14', 'suicide call back service 1300 659 467', 'beyond blue 1300 22 4636', '13yarn 13 92 76', '1800respect 1800 737 732']) assert.ok(s3.includes(n), n);
});

test('ESCALATION.md §2 says what reporters are told, that there are no alerts, and what to do when nobody can read the desk', () => {
  const s2 = norm(section(doc, 2));
  assert.ok(!s2.includes('does not promise'), 'the old "the app promises nothing" line is gone');
  for (const p of ['12 hours', 'within a day', 'nights, weekends and holidays can take longer', 'within two days', "isn't there around the clock",
    "can't see who wrote it", 'no alerts', 'fixed times', 'twice-daily phone reminder', 'when nobody can read the desk', 'more than 24 hours',
    `node server/admin.mjs set desk '{"awayuntil": "yyyy-mm-dd"}'`, 'our safety team is away until', 'more than 72 hours',
    'pauses invitations', 'tells current testers', `'{"awayuntil": null}'`]) assert.ok(s2.includes(p), p);
  // and what it quotes is what the app really says (the database's wording, and the in-memory relay's)
  const sql = read('supabase/migrations/20261015090000_hushmates_tier0.sql');
  const relay = read('core/relay.js');
  for (const p of ['during the pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer', 'within two days']) {
    assert.ok(sql.includes(p), `the database says "${p}"`);
    assert.ok(relay.includes(p), `core/relay.js says "${p}"`);
  }
  assert.ok(sql.includes('Our safety team is away until'));
});

test('isOverdue: only a priority report still open more than 12 hours after it came in', () => {
  const H = 3600e3;
  const now = Date.UTC(2026, 9, 15, 2, 0);
  const report = (over) => ({ id: 'r1', kind: 'feeling', reason: 'safety', urgent: true, status: 'open', at: now - 13 * H, ...over });
  assert.equal(OVERDUE_MS, 12 * H);
  assert.equal(isOverdue(report(), now), true);
  assert.equal(isOverdue(report({ at: now - 12 * H - 1 }), now), true);
  assert.equal(isOverdue(report({ at: now - 3 * 24 * H }), now), true);
  assert.equal(isOverdue(report({ at: String(now - 13 * H) }), now), true, 'a time sent as a string still counts');
  assert.equal(isOverdue(report({ at: now - 12 * H }), now), false, 'exactly 12 hours is not over');
  assert.equal(isOverdue(report({ at: now - 11 * H }), now), false);
  assert.equal(isOverdue(report({ at: now + H }), now), false, 'a clock ahead of the desk is not overdue');
  // not a priority report, however old
  assert.equal(isOverdue(report({ urgent: false, at: now - 30 * 24 * H }), now), false);
  assert.equal(isOverdue(report({ urgent: undefined }), now), false);
  // decided: no longer waiting
  assert.equal(isOverdue(report({ status: 'actioned' }), now), false);
  assert.equal(isOverdue(report({ status: 'no-action' }), now), false);
  // no time to go on
  for (const at of [undefined, null, '', 'yesterday', Number.NaN]) assert.equal(isOverdue(report({ at }), now), false, String(at));
  assert.equal(isOverdue(null, now), false);
  assert.equal(isOverdue(report(), Number.NaN), false);
  // without a clock it uses the desk's own (Date.now)
  assert.equal(isOverdue(report({ at: Date.now() - 13 * H })), true);
  assert.equal(isOverdue(report({ at: Date.now() - H })), false);
});

test('the desk’s list shows the overdue badge in words, with a screen-reader label, only where isOverdue says', () => {
  assert.match(desk, /import \{[^}]*\bisOverdue\b[^}]*\} from '\.\/desk-guide\.js'/);
  const row = desk.slice(desk.indexOf('function row('), desk.indexOf('function track('));
  assert.match(row, /isOverdue\(r, Date\.now\(\)\) \? \[overdueBadge\(\), ' '\] : null/, 'the badge is added only when isOverdue is true');
  const badge = /const overdueBadge = \(\) => ([\s\S]*?);\n/.exec(desk)?.[1] || '';
  assert.match(badge, /'Over 12 hours'/, 'visible text, not colour alone');
  assert.match(badge, /class: 'desk-sr' \}, 'Overdue: '/, 'a screen reader hears "Overdue: Over 12 hours"');
  assert.match(css, /\.desk-sr \{[^}]*clip: rect\(0 0 0 0\)/);
  assert.match(css, /\.desk-overdue \{[^}]*border: 1\.5px solid var\(--urgent\)/);
  assert.equal((desk.match(/'Over 12 hours'/g) || []).length, 1);
});

test('the desk says honestly when reports appear, and the team note reminds what to write', () => {
  assert.ok(desk.includes('New reports appear here by themselves while this page is open and you’re signed in. Nothing alerts anyone when it’s closed, so check at the set times.'));
  assert.ok(!desk.includes('New reports appear here by themselves.'), 'the unqualified line is gone');
  const label = desk.slice(desk.indexOf("h('label', { for: 'resolve-note' }"), desk.indexOf('note,', desk.indexOf("h('label', { for: 'resolve-note' }")));
  assert.ok(label.includes('What you saw and did. No diagnosis, no guesses about who anyone is.'), 'the reminder is part of the note field’s label');
  // the urgent steps are shown as a numbered list, in the guide's order
  assert.match(desk, /h\('ol', \{ class: 'desk-steps' \}, URGENT_GUIDE\.steps\.map\(\(s\) => h\('li', \{\}, s\)\)\)/);
});
