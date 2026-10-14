// hm spec check — run G-SPEC on specs or whole batches (no files written).

export const summary = 'Run G-SPEC on specs or batch dirs (schema, slots, capabilities, copy lint, uniqueness, posting rules)';
export const usage = 'hm spec check <id|spec.json|dir|batch-dir>... [--quiet] [--json] [--capabilities FILE] [--ledger DIR]';

export async function run(args) {
  const cli = await import('../../planner/cli-support.mjs');
  return cli.guarded(async () => {
    const { values, positionals } = cli.parse(args, { quiet: { type: 'boolean', default: false } }, 'spec check');
    if (!positionals.length) throw Object.assign(new Error(`hm spec check: nothing to check\n${usage}`), { usage: true });
    const { specFilesOf, readJSON, batchSpecsOf } = await import('../../planner/runs.mjs');
    const { checkSpec } = await import('../../planner/gspec.mjs');
    const c = cli.loadContext(values);
    const results = [], batchCache = new Map();
    for (const ref of positionals) {
      for (const file of specFilesOf(ref)) {
        const spec = readJSON(file);
        results.push({ file, id: spec.id, ...checkSpec(spec, { ...c, batchSpecs: batchSpecsOf(file, batchCache) }) });
      }
    }
    const failed = results.filter((r) => !r.pass);
    if (values.json) console.log(JSON.stringify(results, null, 2));
    else {
      for (const r of results) {
        if (r.pass && values.quiet) continue;
        console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}  (${r.errors.length} errors, ${r.warnings.length} warnings)`);
        for (const e of r.errors) console.log(`  ERROR ${e.rule}: ${e.message}`);
      }
      const ms = results.reduce((s, r) => s + r.metrics.ms, 0);
      console.log(`G-SPEC: ${results.length - failed.length}/${results.length} pass (${(ms / Math.max(1, results.length)).toFixed(2)} ms per spec)`);
    }
    return failed.length ? 1 : 0;
  });
}
