// The body of hm approve / hm reject: one owner decision appended to the
// ledger. Decisions are append-only (a later decision supersedes an earlier
// one), and repeating the latest decision is a no-op so re-running a command
// never double-counts.
//
// Both verdicts need an intact spec (valid shape, fingerprint recomputes) and
// record exactly which spec was judged: its whole-spec hash, mode, INTERNAL
// mark and G-SPEC result (planner/integrity.mjs). An approval additionally
// needs G-SPEC to pass today (copy from the library, mode/channel agree,
// gating, posting rules ...) and, for a spec of a planned batch, the spec to
// be exactly what hm plan wrote. A rejection is allowed for any intact spec:
// the owner may reject something G-SPEC would also refuse.

import { parse, guarded, list, nowIso, loadContext } from './cli-support.mjs';
import { findSpec } from './runs.mjs';
import { appendLedger, latestDecision, REASONS } from './ledger.mjs';
import { visibleSlots } from './fingerprint.mjs';
import { specHash, planProvenance, shapeProblems, gspecOf, gspecSummary } from './integrity.mjs';

/** Build the decision record (exported for tests). gspec: a checkSpec result or its summary. */
export function decisionRecord(spec, verdict, { reasons = [], note = '', by = 'owner', at, gspec }) {
  return {
    id: spec.id, batch: spec.batch, fingerprint: spec.fingerprint, specHash: specHash(spec), mode: spec.mode, internal: spec.internal,
    visible: visibleSlots(spec), verdict, reasons, note, by, at, gspec: gspec.metrics ? gspecSummary(gspec) : gspec,
  };
}

/**
 * Why the owner cannot record this verdict for the spec in file (empty = allowed).
 * ctx: { lib, caps, policy, ledger }. → { blockers, gspec }
 */
export function decisionBlockers(verdict, file, spec, ctx) {
  const shape = shapeProblems(spec);
  if (shape.length) return { blockers: shape.map((p) => `${p}; re-plan it`), gspec: null };
  const gspec = gspecOf(file, spec, ctx);
  const blockers = [];
  if (verdict === 'approve') {
    for (const e of gspec.errors) blockers.push(`G-SPEC ${e.rule}: ${e.message}`);
    const prov = planProvenance(file, spec);
    if (prov.problem) blockers.push(prov.problem);
  }
  return { blockers, gspec };
}

export function decide(verdict, args, usage) {
  return guarded(async () => {
    const { values, positionals } = parse(args, {
      reason: { type: 'string' }, note: { type: 'string', default: '' }, by: { type: 'string', default: 'owner' }, at: { type: 'string' },
    }, verdict);
    if (positionals.length !== 1) throw Object.assign(new Error(`hm ${verdict}: give one spec\n${usage}`), { usage: true });
    const reasons = list(values.reason) || [];
    const unknown = reasons.filter((r) => !REASONS.includes(r));
    if (unknown.length) throw Object.assign(new Error(`hm ${verdict}: unknown reason code ${unknown.join(', ')} (use ${REASONS.join('|')})`), { usage: true });
    if (verdict === 'reject' && !reasons.length) throw Object.assign(new Error(`hm reject: --reason is required (${REASONS.join('|')})`), { usage: true });
    const { file, spec } = findSpec(positionals[0]);
    const ctx = loadContext(values);
    const { blockers, gspec } = decisionBlockers(verdict, file, spec, ctx);
    if (blockers.length) throw new Error(`cannot ${verdict} ${spec.id || file}:\n  ${blockers.join('\n  ')}`);
    const hash = specHash(spec);
    const last = latestDecision(ctx.ledger, spec.id);
    if (last && last.verdict === verdict && last.specHash === hash && last.reasons.join() === reasons.join()) {
      console.log(`${spec.id} is already ${verdict === 'approve' ? 'approved' : 'rejected'} (${last.at} by ${last.by}); nothing written`);
      return 0;
    }
    const at = nowIso(values.at);
    const rec = decisionRecord(spec, verdict, { reasons, note: values.note, by: values.by, at, gspec });
    const file2 = appendLedger('decisions', rec, { dir: values.ledger });
    appendLedger('fingerprints', { id: spec.id, fingerprint: spec.fingerprint, source: verdict, at }, { dir: values.ledger });
    console.log(`${verdict === 'approve' ? 'approved' : `rejected (${reasons.join(', ')})`}: ${spec.id} (spec ${hash.slice(7, 19)}) -> ${file2}`);
    if (verdict === 'reject' && !gspec.pass) console.log(`note: G-SPEC also refuses this spec (${rec.gspec.errors.join(', ')}); recorded with the decision`);
    if (verdict === 'approve' && spec.internal) console.log('note: this is an INTERNAL review spec; it is never exported or posted');
    return 0;
  });
}
