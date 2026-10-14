// hm lib validate — the story library validator (templates/validate-library.mjs,
// unchanged), then the planner's inputs (planner/validate-lib.mjs):
// capabilities, policy and intensity caps, copy lint over every library
// string, Fredoka metrics, brand.json, the spec schema and the ledger.

export const summary = 'Validate the story library, then the planner inputs (capabilities, policy, copy lint, metrics, brand, ledger)';
export const usage = 'hm lib validate [--quiet] [--capabilities FILE]';

export async function run(args, ctx) {
  const { runNode } = await import('../lib/run.mjs');
  const code = await runNode(ctx.paths.studioPath('templates', 'validate-library.mjs'), args.filter((a) => a === '--quiet'));
  const quiet = args.includes('--quiet');
  const i = args.indexOf('--capabilities');
  const { validatePlannerInputs } = await import('../../planner/validate-lib.mjs');
  const r = validatePlannerInputs(i >= 0 && args[i + 1] ? { capabilitiesFile: args[i + 1] } : {});
  if (!quiet) {
    for (const l of r.info) console.log(`planner: ${l}`);
    for (const w of r.warnings) console.log(`warn  planner: ${w}`);
  }
  for (const e of r.errors) console.log(`ERROR planner: ${e}`);
  console.log(r.errors.length ? `planner inputs FAILED: ${r.errors.length} error(s)` : 'planner inputs OK');
  return code || (r.errors.length ? 1 : 0);
}
