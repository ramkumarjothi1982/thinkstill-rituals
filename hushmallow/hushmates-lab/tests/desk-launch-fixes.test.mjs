// The safety desk's side of the launch fixes (staff/desk.js, staff/desk-guide.js): a decision on a report
// already decided is answered in plain words; "Let it carry on" says when the feeling stays paused; the
// activity log shows no account reference for a report's entries; an age concern shows the age steps and
// points to docs/legal/MODERATION.md §7.2. desk.js runs only in a browser, so its wiring is checked from its
// source (as tests/desk-guide.test.mjs does); the rules behind it are tested on both engines
// (tests/relay-launch-fixes.test.mjs, tests/backend-launch-fixes.test.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as guide from '../staff/desk-guide.js';   // (as a namespace: each test below fails on its own, not the whole file)
import { REPORT_REASONS } from '../core/relay-config.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const desk = read('staff/desk.js');
// compare words, not typography: curly quotes, markdown emphasis, case and line breaks aside
const norm = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

test('desk: an age concern ("Seems to be under 18") shows the age steps, the same as MODERATION.md §7.2, and names it', () => {
  assert.equal(REPORT_REASONS.find((r) => r.id === 'under18')?.label, 'Seems to be under 18');
  const g = guide.REASON_GUIDES?.under18;
  assert.ok(g, 'the desk has no age steps');
  assert.equal(g.source, 'docs/legal/MODERATION.md §7.2');
  const doc = read('docs/legal/MODERATION.md');
  const start = doc.indexOf('\n### 7.2 A member who may be under 18');
  assert.ok(start >= 0, 'MODERATION.md has the §7.2 the desk points to');
  const section = norm(doc.slice(start, doc.indexOf('\n### ', start + 1)));
  const steps = norm(g.steps.join(' '));
  for (const p of ['danger first', 'if the words suggest danger', 'the age question waits', 'if the words suggest the writer is under 18',
    'catching, and live holds end', 'write "age concern" in the team note, and nothing that would identify them', 'tell the safety lead the same day',
    'the safety lead and the owner decide what happens next']) {
    assert.ok(steps.includes(p), `the desk's age steps say "${p}"`);
    assert.ok(section.includes(p), `MODERATION.md §7.2 says "${p}"`);
  }
  // the decision the steps name is one the desk offers, for a feeling and for a perspective
  for (const k of ['feeling', 'perspective']) assert.ok(guide.DESK_ACTIONS[k].some((a) => a.id === 'restrict-user' && /^Restrict the person who wrote it$/.test(a.label)), k);
  // shown for the report's own reason, never for a Mallow's words (a Mallow isn't a person), and names the document
  assert.match(desk, /import \{[^}]*\bREASON_GUIDES\b[^}]*\} from '\.\/desk-guide\.js'/);
  assert.match(desk, /const guide = kind === 'mallow' \? null : REASON_GUIDES\[r\.reason\];/);
  assert.match(desk, /guide \? h\('aside', \{ class: 'desk-guide', 'data-test': `desk-guide-\$\{r\.reason\}` \},/);
  assert.match(desk, /h\('ol', \{ class: 'desk-steps' \}, guide\.steps\.map\(\(s\) => h\('li', \{\}, s\)\)\)/);
  assert.match(desk, /`The full steps are in \$\{guide\.source\}\.`/);
  assert.match(read('styles/staff.css'), /\.desk-guide \{/);
});

test('desk: a decision on a report already decided says so plainly and shows what stands; "Let it carry on" says when it stays paused', () => {
  const decide = desk.slice(desk.indexOf('async function decide('), desk.indexOf("const back = h('button'"));
  assert.ok(decide.length > 100);
  assert.match(decide, /if \(e\?\.code !== 'already-decided'\) \{[\s\S]*?sayError\(err, e\); return;/, 'any other refusal is shown as before');
  // a second click while the first decision is on its way does nothing (it used to be refused and say
  // "someone else decided", hiding the reader's own decision and "it stays paused")
  assert.match(decide, /if \(sending\) return;/);
  assert.match(decide, /sending = true;\s*detailPane\?\.querySelectorAll\('\.desk-actions button'\)\.forEach\(\(b\) => \{ b\.disabled = true; \}\);/);
  assert.match(decide, /said = ALREADY_DECIDED;/);
  assert.match(decide, /if \(action === 'resume-feeling' && done\?\.paused\) said = STILL_PAUSED;/);
  assert.match(decide, /await reloadList\(\);\s*await detail\(id, said\);/, 'the report is shown again, decided, with the words');
  assert.match(desk, /async function detail\(id, notice = ''\)/);
  assert.match(desk, /notice \? h\('p', \{ class: 'desk-note', role: 'status', 'data-test': 'desk-notice' \}, notice\) : null/);
  for (const name of ['ALREADY_DECIDED', 'STILL_PAUSED']) {
    const words = new RegExp(`const ${name} = '([^']+)';`).exec(desk)?.[1];
    assert.ok(words, name);
    assert.ok(!/already-decided|resume-feeling|error|invalid|status|code/i.test(words), `${name} reads like a code: ${words}`);
  }
  assert.match(desk, /const ALREADY_DECIDED = '[^']*nothing changed/);
  assert.match(desk, /const STILL_PAUSED = '[^']*stays paused[^']*another report on it is still open/);
});

test('desk: the activity log shows no account reference for a report’s entries, whatever the server sends', () => {
  const src = /const whoDid = (\(e\) => .+);\n/.exec(desk)?.[1];
  assert.ok(src, 'the log’s "Who" column has its own rule');
  const whoDid = new Function(`return ${src}`)();
  assert.equal(whoDid({ action: 'report.created', actor: 'a member' }), 'A member');
  assert.equal(whoDid({ action: 'report.created', actor: '62c33fcf' }), 'A member', 'a reference sent for a report is not shown');
  assert.equal(whoDid({ action: 'report.created', actor: '62c33fcf-1111-4222-8333-944445555666' }), 'A member');
  assert.equal(whoDid({ action: 'report.created', actor: 'system' }), 'system');
  assert.equal(whoDid({ action: 'mod.resolve', actor: '0123456789abcdef' }), '01234567', 'other entries keep their short reference');
  assert.equal(whoDid({ action: 'account.created' }), '');
  assert.match(desk, /h\('td', \{ class: 'desk-ref' \}, whoDid\(e\)\)/);
  assert.equal((desk.match(/String\(e\.actor \|\| ''\)\.slice\(0, 8\)/g) || []).length, 1, 'only whoDid shows a reference');
  assert.ok(desk.includes('a report never names who made it'), 'the log says so');
});
