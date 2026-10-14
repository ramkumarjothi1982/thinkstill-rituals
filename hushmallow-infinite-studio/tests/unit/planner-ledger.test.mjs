import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { temp, REFERENCE, REFERENCE_FINGERPRINT } from '../property/support.mjs';
import { appendLedger, readLedger, loadLedger, usedFingerprints, latestDecision, ledgerDir, DEFAULT_LEDGER_DIR } from '../../planner/ledger.mjs';
import { visibleSlots } from '../../planner/fingerprint.mjs';

const SPEC_HASH = `sha256:${'a'.repeat(64)}`;
const decision = (over = {}) => ({
  id: 'T01-noomi-late-night-15s-fdde38', batch: 'b', fingerprint: REFERENCE_FINGERPRINT, specHash: SPEC_HASH, mode: 'production', internal: false,
  visible: visibleSlots(REFERENCE), verdict: 'approve', reasons: [], note: '', by: 'owner', at: '2026-11-02T10:00:00.000Z', gspec: { pass: true, errors: [] }, ...over,
});

test('append then read: canonical lines, append-only, latest decision wins', () => {
  const t = temp('ledger-');
  try {
    const f = appendLedger('decisions', decision(), { dir: t.dir });
    appendLedger('decisions', decision({ verdict: 'reject', reasons: ['acting'], at: '2026-11-03T10:00:00.000Z' }), { dir: t.dir });
    const text = fs.readFileSync(f, 'utf8');
    assert.equal(text.split('\n').length, 3, 'two lines and a final newline');
    assert.ok(text.startsWith('{"at":"2026-11-02T10:00:00.000Z","batch":"b"'), 'keys sorted (canonical JSON)');
    const all = loadLedger({ dir: t.dir });
    assert.equal(all.decisions.length, 2);
    assert.equal(latestDecision(all, decision().id).verdict, 'reject');
    assert.deepEqual([...usedFingerprints(all).get(REFERENCE_FINGERPRINT)], [decision().id]);
    assert.deepEqual(readLedger('published', { dir: t.dir }), [], 'missing file = no records');
  } finally { t.done(); }
});

test('invalid records are refused before anything is written', () => {
  const t = temp('ledger-');
  try {
    const bad = [
      ['decisions', decision({ verdict: 'reject', reasons: [] }), /a reject needs at least one/],
      ['decisions', decision({ reasons: ['vibes'] }), /reasons/],
      ['decisions', decision({ fingerprint: 'abc' }), /fingerprint/],
      ['decisions', decision({ at: 'yesterday' }), /at/],
      ['decisions', decision({ specHash: undefined }), /specHash/],
      ['decisions', decision({ mode: 'draft' }), /mode/],
      ['decisions', decision({ internal: 'no' }), /internal/],
      ['decisions', decision({ gspec: undefined }), /gspec \{pass, errors\}/],
      ['decisions', decision({ gspec: { pass: false, errors: ['copy:hook'] } }), /an approval needs a passing G-SPEC/],
      ['published', { id: 'x', fingerprint: REFERENCE_FINGERPRINT, channel: 'tiktok' }, /postedAt/],
      ['copy-usage', { text: 'x', kind: 'tagline', id: 'x', channel: 'c', at: '2026-01-01' }, /kind/],
      ['nonsense', {}, /unknown ledger kind/],
    ];
    for (const [kind, rec, re] of bad) assert.throws(() => appendLedger(kind, rec, { dir: t.dir }), re);
    // a rejection may record a failing G-SPEC (the owner can reject what G-SPEC refuses too)
    appendLedger('decisions', decision({ verdict: 'reject', reasons: ['copy'], gspec: { pass: false, errors: ['copy:hook'] } }), { dir: path.join(t.dir, 'ok') });
    assert.throws(() => appendLedger('decisions', [decision(), decision({ verdict: 'x' })], { dir: t.dir }), /verdict/);
    assert.equal(fs.existsSync(path.join(t.dir, 'decisions.jsonl')), false, 'all or nothing per call');
  } finally { t.done(); }
});

test('a corrupt or truncated file is a hard error with its line number', () => {
  const t = temp('ledger-');
  try {
    const f = path.join(t.dir, 'decisions.jsonl');
    fs.writeFileSync(f, `${JSON.stringify(decision())}\n{oops\n`);
    assert.throws(() => readLedger('decisions', { dir: t.dir }), /decisions\.jsonl:2: not JSON/);
    fs.writeFileSync(f, `${JSON.stringify(decision({ by: '' }))}\n`);
    assert.throws(() => readLedger('decisions', { dir: t.dir }), /:1: .*by/);
    fs.writeFileSync(f, JSON.stringify(decision()));
    assert.throws(() => readLedger('decisions', { dir: t.dir }), /incomplete/);
    assert.throws(() => appendLedger('decisions', decision(), { dir: t.dir }), /refusing to append/);
  } finally { t.done(); }
});

test('the directory: explicit dir, else HM_LEDGER_DIR, else <studio>/ledger', () => {
  const prev = process.env.HM_LEDGER_DIR;
  try {
    delete process.env.HM_LEDGER_DIR;
    assert.equal(ledgerDir(), DEFAULT_LEDGER_DIR);
    process.env.HM_LEDGER_DIR = '/home/user/hm-work/tmp/x';
    assert.equal(ledgerDir(), '/home/user/hm-work/tmp/x');
    assert.equal(ledgerDir('/home/user/hm-work/tmp/y'), '/home/user/hm-work/tmp/y');
  } finally { if (prev === undefined) delete process.env.HM_LEDGER_DIR; else process.env.HM_LEDGER_DIR = prev; }
  assert.throws(() => appendLedger('decisions', decision(), { dir: '/etc/hm-ledger' }), /refusing to write outside/);
});
