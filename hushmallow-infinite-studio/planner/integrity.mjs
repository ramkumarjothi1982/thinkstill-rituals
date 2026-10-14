// What the owner-facing steps (hm approve, hm export, hm export --mark-posted)
// check before they trust a spec.json on disk. A fingerprint covers only the
// visible slots and the seed, so it cannot tell whether mode, internal,
// channel, intensity, jitter or quality were edited. Three stronger checks:
//
//   specHash      sha256 of the canonical JSON of the whole spec. hm plan
//                 records it per spec in plan.json, hm approve records it in
//                 the decision, and export / mark-posted require the spec to
//                 still hash to exactly what the owner approved.
//   plan.json     a spec that lives in a planned batch must still be the spec
//                 hm plan wrote (catches a hand edit re-sealed with hm spec
//                 seal, which keeps fingerprint and id consistent).
//   G-SPEC        re-run in the spec's real context (its batch, today's
//                 capabilities and ledger): copy must still come from the
//                 library, mode/channel/INTERNAL must agree, and so on.

import fs from 'node:fs';
import path from 'node:path';
import { hashOf } from './canonical.mjs';
import { checkSpec } from './gspec.mjs';
import { batchSpecsOf, readJSON } from './runs.mjs';
import { validateSpecShape } from './spec-schema.mjs';
import { fingerprint } from './fingerprint.mjs';

/** 'sha256:<hex>' of the whole spec (canonical JSON: key order and whitespace never matter). */
export const specHash = (spec) => hashOf(spec);

/**
 * The spec's entry in its batch manifest (../plan.json), if it has one.
 * → { planned: false } for a loose spec, or { planned: true, problem: null | string }.
 */
export function planProvenance(file, spec) {
  const planFile = path.join(path.dirname(path.dirname(path.resolve(file))), 'plan.json');
  if (!fs.existsSync(planFile)) return { planned: false, problem: null };
  let plan;
  try { plan = readJSON(planFile); } catch (e) { return { planned: true, problem: `${planFile} is not JSON (${e.message})` }; }
  // look up by folder as well as by id: re-sealing an edited spec changes its id, not its folder
  const folder = path.basename(path.dirname(path.resolve(file)));
  const entries = plan.specs || [];
  const entry = entries.find((e) => e.id === folder) || entries.find((e) => e.id === spec.id);
  if (!entry) return { planned: false, problem: null };
  if (entry.id !== spec.id) return { planned: true, problem: `spec.json in ${folder} claims the id ${spec.id}, but hm plan wrote ${entry.id} there (edited and re-sealed after planning); re-plan it` };
  if (!entry.hash) return { planned: true, problem: `plan.json lists ${spec.id} without a spec hash (planned by an older planner); re-plan it` };
  if (entry.hash !== specHash(spec)) return { planned: true, problem: `spec.json differs from the spec hm plan wrote for ${spec.id} (edited after planning; re-sealing with hm spec seal does not make it the planned spec); re-plan it` };
  return { planned: true, problem: null };
}

/**
 * Everything that makes a spec untrustworthy as a file, before any decision:
 * a broken shape, a fingerprint or id that does not recompute.
 */
export function shapeProblems(spec) {
  const shape = validateSpecShape(spec);
  if (shape.length) return shape.map((s) => `spec.json is not a valid hm-variant/1 spec: ${s}`);
  if (spec.fingerprint !== fingerprint(spec)) return ['spec.json was edited after planning (fingerprint mismatch)'];
  return [];
}

/** G-SPEC for a spec file in its real context. ctx: { lib, caps, policy, ledger }. */
export function gspecOf(file, spec, ctx) {
  return checkSpec(spec, { ...ctx, batchSpecs: batchSpecsOf(path.resolve(file)) });
}

/** A short G-SPEC summary for ledger records: { pass, errors: [rule ids] }. */
export const gspecSummary = (g) => ({ pass: g.pass, errors: [...new Set(g.errors.map((e) => e.rule))] });
