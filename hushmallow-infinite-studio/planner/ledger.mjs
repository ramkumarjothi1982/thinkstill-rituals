// The append-only ledger (PHASE2-PLAN data model 7): one JSONL file per kind
// in ledger/ (or HM_LEDGER_DIR, or an explicit dir for tests). Lines are
// validated before they are written and when they are read; a corrupt line
// is a hard error with its line number. Nothing here ever rewrites or
// deletes a line: corrections are new lines (the latest decision wins).
//
//   decisions     owner approve/reject with reason codes   (hm approve, hm reject); each names
//                 the exact spec (specHash), its mode and its G-SPEC result,
//                 and an approval needs a passing G-SPEC
//   fingerprints  exact fingerprint of every decided spec   (hm approve, hm reject; WP-25 adds perceptual signatures)
//   published     a post the owner made by hand            (hm export --mark-posted)
//   copy-usage    each copy string of a post               (hm export --mark-posted)
//   reservations  copy held by a planned production batch  (hm plan --reserve)
//   cells         tuning-cell status changes               (WP-13 tools)

import fs from 'node:fs';
import path from 'node:path';
import { studioPath, assertWritable } from '../render/lib/paths.mjs';
import { canonical } from './canonical.mjs';

export const DEFAULT_LEDGER_DIR = studioPath('ledger');
export const REASONS = Object.freeze(['acting', 'timing', 'copy', 'world', 'face', 'sameness', 'brand', 'other']);
export const VERDICTS = Object.freeze(['approve', 'reject']);
export const COPY_KINDS = Object.freeze(['hook', 'line', 'resolution', 'closer', 'nameWord']);

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isIso = (v) => isStr(v) && !Number.isNaN(Date.parse(v));
const isFp = (v) => typeof v === 'string' && /^sha256:[0-9a-f]{64}$/.test(v);

/** Per-kind record validators → list of problems. */
export const KINDS = Object.freeze({
  decisions: (r) => [
    !isStr(r.id) && 'id', !isFp(r.fingerprint) && 'fingerprint', !isFp(r.specHash) && 'specHash (sha256 of the whole spec)',
    !['review', 'production'].includes(r.mode) && 'mode', typeof r.internal !== 'boolean' && 'internal',
    !VERDICTS.includes(r.verdict) && 'verdict',
    !(Array.isArray(r.reasons) && r.reasons.every((x) => REASONS.includes(x))) && `reasons (${REASONS.join('|')})`,
    r.verdict === 'reject' && !r.reasons?.length && 'reasons (a reject needs at least one)',
    !(r.gspec && typeof r.gspec.pass === 'boolean' && Array.isArray(r.gspec.errors)) && 'gspec {pass, errors}',
    r.verdict === 'approve' && r.gspec?.pass !== true && 'gspec (an approval needs a passing G-SPEC)',
    !isStr(r.by) && 'by', !isIso(r.at) && 'at', !(r.visible && typeof r.visible === 'object') && 'visible',
  ],
  fingerprints: (r) => [!isStr(r.id) && 'id', !isFp(r.fingerprint) && 'fingerprint', !isStr(r.source) && 'source', !isIso(r.at) && 'at'],
  published: (r) => [
    !isStr(r.id) && 'id', !isFp(r.fingerprint) && 'fingerprint', !isStr(r.channel) && 'channel', !isIso(r.postedAt) && 'postedAt',
    !(r.visible && typeof r.visible === 'object') && 'visible', !isStr(r.family) && 'family', !isStr(r.valence) && 'valence',
  ],
  'copy-usage': (r) => [!isStr(r.text) && 'text', !COPY_KINDS.includes(r.kind) && 'kind', !isStr(r.id) && 'id', !isStr(r.channel) && 'channel', !isIso(r.at) && 'at'],
  reservations: (r) => [!isStr(r.text) && 'text', !COPY_KINDS.includes(r.kind) && 'kind', !isStr(r.batch) && 'batch', !isStr(r.channel) && 'channel', !isIso(r.until) && 'until'],
  cells: (r) => [!isStr(r.move) && 'move', !isStr(r.mallow) && 'mallow', !isStr(r.from) && 'from', !isStr(r.to) && 'to', !isIso(r.at) && 'at'],
});

/** The ledger directory: explicit dir, else $HM_LEDGER_DIR, else <studio>/ledger. */
export const ledgerDir = (dir) => path.resolve(dir || process.env.HM_LEDGER_DIR || DEFAULT_LEDGER_DIR);
const fileOf = (kind, dir) => path.join(ledgerDir(dir), `${kind}.jsonl`);

function check(kind, rec) {
  const v = KINDS[kind];
  if (!v) throw new Error(`unknown ledger kind "${kind}" (have: ${Object.keys(KINDS).join(', ')})`);
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) throw new Error(`${kind}: a record must be an object`);
  const problems = v(rec).filter(Boolean);
  if (problems.length) throw new Error(`${kind}: invalid record (${problems.join(', ')}): ${JSON.stringify(rec).slice(0, 200)}`);
}

/** All records of one kind, in file order (validated). */
export function readLedger(kind, { dir } = {}) {
  const f = fileOf(kind, dir);
  if (!fs.existsSync(f)) return [];
  const text = fs.readFileSync(f, 'utf8');
  if (text.length && !text.endsWith('\n')) throw new Error(`${f}: last line is incomplete (append-only files end with a newline)`);
  return text.split('\n').filter((l) => l.length).map((l, i) => {
    let rec;
    try { rec = JSON.parse(l); } catch (e) { throw new Error(`${f}:${i + 1}: not JSON (${e.message})`); }
    try { check(kind, rec); } catch (e) { throw new Error(`${f}:${i + 1}: ${e.message}`); }
    return rec;
  });
}

/** Append records (validated first; all or nothing per call). Returns the file path. */
export function appendLedger(kind, records, { dir } = {}) {
  const list = Array.isArray(records) ? records : [records];
  list.forEach((r) => check(kind, r));
  const f = assertWritable(fileOf(kind, dir));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (fs.existsSync(f)) {
    const size = fs.statSync(f).size;
    if (size) {
      const fd = fs.openSync(f, 'r');
      const last = Buffer.alloc(1);
      fs.readSync(fd, last, 0, 1, size - 1);
      fs.closeSync(fd);
      if (last[0] !== 0x0a) throw new Error(`${f}: last line is incomplete; refusing to append`);
    }
  }
  fs.appendFileSync(f, list.map((r) => `${canonical(r)}\n`).join(''), { flag: 'a' });
  return f;
}

/** Every kind at once. → { decisions, fingerprints, published, copyUsage, reservations, cells } */
export function loadLedger({ dir } = {}) {
  return {
    dir: ledgerDir(dir),
    decisions: readLedger('decisions', { dir }),
    fingerprints: readLedger('fingerprints', { dir }),
    published: readLedger('published', { dir }),
    copyUsage: readLedger('copy-usage', { dir }),
    reservations: readLedger('reservations', { dir }),
    cells: readLedger('cells', { dir }),
  };
}

/** An empty ledger (for tests and what-if plans). */
export const emptyLedger = () => ({ dir: null, decisions: [], fingerprints: [], published: [], copyUsage: [], reservations: [], cells: [] });

/** Fingerprint → spec ids that used it (decided, fingerprinted or published). */
export function usedFingerprints(ledger) {
  const used = new Map();
  for (const r of [...ledger.decisions, ...ledger.fingerprints, ...ledger.published]) {
    if (!used.has(r.fingerprint)) used.set(r.fingerprint, new Set());
    used.get(r.fingerprint).add(r.id);
  }
  return used;
}

/** The latest decision for a spec id, or null. */
export function latestDecision(ledger, id) {
  let last = null;
  for (const r of ledger.decisions) if (r.id === id) last = r;
  return last;
}
