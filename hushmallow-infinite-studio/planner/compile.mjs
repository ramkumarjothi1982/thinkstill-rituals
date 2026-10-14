// Compile a variant spec: the cheap-to-expensive gate order of the plan
// (G-SPEC, then the composer's G-DIR and G-COST, then renders). G-SPEC runs
// here; G-DIR and G-COST run through planner/composer-bridge.mjs as soon as
// composer/compose.js and composer/validate.js exist (WP-03). Until then they
// are recorded as not run, never as passed. They never run on a spec G-SPEC
// refuses.
//
// The report (compile.json next to spec.json) follows the QA report shape of
// the plan (qa/report.json): { gates: { <gate>: { pass, warn, metrics, ... } } }.
// Its top-level verdict is honest about what ran:
//   status 'fail'        a gate that ran failed            pass: false
//   status 'incomplete'  everything that ran passed, but   pass: null
//                        gates are still pending (G-DIR, G-COST until WP-03)
//   status 'pass'        every gate ran and passed         pass: true
// so a consumer testing report.pass never mistakes a G-SPEC-only compile for
// a full one.

import fs from 'node:fs';
import path from 'node:path';
import { assertWritable } from '../render/lib/paths.mjs';
import { checkSpec } from './gspec.mjs';
import { readJSON, batchSpecsOf } from './runs.mjs';
import { sha256Hex, pretty } from './canonical.mjs';
import { loadComposer, composerGates, COMPOSER_MISSING } from './composer-bridge.mjs';

export const GDIR_PENDING = COMPOSER_MISSING;

/**
 * Compile one spec file. ctx: { lib, caps, policy, ledger }; batchCache: a Map
 * shared across one run; composer: from loadComposer() (default: the
 * composer in force, or null when it is not built). → Promise<report>
 */
export async function compileSpecFile(file, ctx, { write = true, batchCache = null, composer } = {}) {
  const bytes = fs.readFileSync(file);
  const spec = JSON.parse(bytes.toString('utf8'));
  const gspec = checkSpec(spec, { ...ctx, batchSpecs: batchSpecsOf(file, batchCache) });
  const gates = {
    'G-SPEC': { pass: gspec.pass, warn: gspec.warnings.length > 0, errors: gspec.errors, warnings: gspec.warnings, metrics: gspec.metrics },
  };
  if (gspec.pass) {
    Object.assign(gates, await composerGates(spec, { lib: ctx.lib, composer: composer === undefined ? await loadComposer() : composer }));
  } else {
    const skipped = { pass: null, status: 'not-run', reason: 'G-SPEC failed: the composer never sees a spec G-SPEC refuses' };
    Object.assign(gates, { 'G-DIR': skipped, 'G-COST': { ...skipped } });
  }
  const report = {
    schema: 'hm-compile/1',
    spec: { id: spec.id, file: path.basename(file), sha256: sha256Hex(bytes), fingerprint: spec.fingerprint },
    ...verdict(gates),
    gates,
    outputs: [],
  };
  if (write) fs.writeFileSync(assertWritable(path.join(path.dirname(file), 'compile.json')), pretty(report));
  return report;
}

/** Top-level verdict from the gates: { status, pass, pending }. A gate with pass null did not run. */
export function verdict(gates) {
  const all = Object.entries(gates);
  const pending = all.filter(([, g]) => g.pass === null || g.pass === undefined).map(([k]) => k);
  if (all.some(([, g]) => g.pass === false)) return { status: 'fail', pass: false, pending };
  if (pending.length) return { status: 'incomplete', pass: null, pending };
  return { status: 'pass', pass: true, pending };
}

export { readJSON };
