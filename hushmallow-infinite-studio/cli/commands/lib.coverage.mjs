// hm lib coverage — what is plannable now (capabilities x library x copy
// lint), and with --all, what blocks every other template x Mallow pair.
// (The plan calls it `hm library coverage`; it lives in the `hm lib` group.)

export const summary = 'Which templates x Mallows are plannable now, with ToDs, durations, moves, copy counts; --all shows blockers';
export const usage = 'hm lib coverage [--review] [--all] [--open] [--json] [--capabilities FILE]';

export async function run(args) {
  const cli = await import('../../planner/cli-support.mjs');
  return cli.guarded(async () => {
    const { values } = cli.parse(args, { review: { type: 'boolean', default: false }, all: { type: 'boolean', default: false }, open: { type: 'boolean', default: false } }, 'lib coverage');
    const { coverageReport, formatCoverage } = await import('../../planner/coverage.mjs');
    const { loadLibrary } = await import('../../planner/library.mjs');
    const { loadPolicy } = await import('../../planner/policy.mjs');
    const { loadCapabilities, openCapabilities, CAPABILITIES_FILE } = await import('../../planner/capabilities.mjs');
    const lib = loadLibrary();
    // --open: what-if every capability were approved (library limits only)
    const caps = values.open ? openCapabilities(lib) : loadCapabilities(lib, values.capabilities || CAPABILITIES_FILE);
    const rep = coverageReport({ lib, caps, policy: loadPolicy(), mode: values.review ? 'review' : 'production' });
    if (values.json) console.log(JSON.stringify(rep, null, 2));
    else console.log(`${values.open ? '[what-if: everything enabled] ' : ''}${formatCoverage(rep, { all: values.all })}`);
    return 0;
  });
}
