// hm spec compile — compile specs or a batch: G-SPEC, then the composer's
// G-DIR/G-COST as soon as composer/compose.js and composer/validate.js exist
// (WP-03; planner/composer-bridge.mjs). Writes compile.json next to each
// spec.json; a gate that did not run is reported as "not-run", never as
// passed, and a report whose gates did not all run says status "incomplete",
// pass null. Exit code: 1 when a gate that ran failed, else 0 (an incomplete
// compile is not a failure of the part that exists, and the output says
// INCOMPLETE and why).

export const summary = 'Compile specs or a batch (G-SPEC, then G-DIR/G-COST once the composer exists), writing compile.json';
export const usage = 'hm spec compile <id|spec.json|dir|batch-dir>... [--dry] [--json] [--capabilities FILE] [--ledger DIR]';

export async function run(args) {
  const cli = await import('../../planner/cli-support.mjs');
  return cli.guarded(async () => {
    const { values, positionals } = cli.parse(args, { dry: { type: 'boolean', default: false } }, 'spec compile');
    if (!positionals.length) throw Object.assign(new Error(`hm spec compile: nothing to compile\n${usage}`), { usage: true });
    const { specFilesOf } = await import('../../planner/runs.mjs');
    const { compileSpecFile } = await import('../../planner/compile.mjs');
    const c = cli.loadContext(values);
    const reports = [], batchCache = new Map();
    for (const ref of positionals) for (const file of specFilesOf(ref)) reports.push(await compileSpecFile(file, c, { write: !values.dry, batchCache }));
    const failed = reports.filter((r) => r.status === 'fail');
    const incomplete = reports.filter((r) => r.status === 'incomplete');
    if (values.json) console.log(JSON.stringify(reports, null, 2));
    else {
      for (const r of reports) {
        const g = r.gates['G-SPEC'];
        const tag = { fail: 'FAIL', incomplete: 'INCOMPLETE', pass: 'ok' }[r.status];
        const ran = ['G-DIR', 'G-COST'].filter((k) => r.gates[k].status === 'ran').map((k) => `${k} ${r.gates[k].pass ? 'pass' : 'FAIL'}`);
        console.log(`${tag.padEnd(10)} ${r.spec.id}  G-SPEC ${g.pass ? 'pass' : 'FAIL'} (${g.metrics.ms.toFixed(1)} ms)${g.warnings.length ? `, ${g.warnings.length} warnings` : ''}${ran.length ? `, ${ran.join(', ')}` : ''}${r.pending.length ? `; not run: ${r.pending.join(', ')}` : ''}`);
        for (const k of ['G-SPEC', 'G-DIR', 'G-COST']) for (const e of r.gates[k].errors || []) console.log(`  ERROR ${k === 'G-SPEC' ? '' : `${k} `}${e.rule}: ${e.message}`);
      }
      const why = [...new Set(incomplete.flatMap((r) => r.pending.map((k) => `${k}: ${r.gates[k].reason}`)))];
      console.log(`compiled ${reports.length}: ${failed.length} failed, ${incomplete.length} incomplete, ${reports.length - failed.length - incomplete.length} complete${values.dry ? ' (dry run: nothing written)' : ''}`);
      for (const w of why) console.log(`  not run: ${w}`);
    }
    return failed.length ? 1 : 0;
  });
}
