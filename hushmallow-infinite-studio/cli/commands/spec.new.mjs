// hm spec new — plan one spec with pinned slots (everything not pinned is
// sampled from the seed exactly as hm plan would). Review mode by default:
// an ad-hoc spec is for looking at, not for posting.

export const summary = 'Plan one spec with pinned slots (--template T01 --mallow noomi ...); prints it or writes --out';
export const usage = `hm spec new --template T01 [--mallow noomi] [--tod late-night] [--duration 15] [--gag G-JOLT] [--metaphor ..]
        [--ritual ..] [--camera ..] [--turn ..] [--weather ..] [--seed N] [--batch NAME]
        [--channel C --date YYYY-MM-DD (production)] [--quality final|draft|proof] [--out FILE.json|DIR] [--capabilities FILE] [--ledger DIR]`;

export async function run(args) {
  const cli = await import('../../planner/cli-support.mjs');
  return cli.guarded(async () => {
    const { values } = cli.parse(args, {
      seed: { type: 'string' }, batch: { type: 'string', default: 'adhoc' }, channel: { type: 'string' }, date: { type: 'string' },
      quality: { type: 'string', default: 'final' }, out: { type: 'string' }, ...cli.CONSTRAINT_OPTIONS,
    }, 'spec new');
    if (!values.template) throw Object.assign(new Error('hm spec new: --template is required'), { usage: true });
    const { QUALITIES } = await import('../../planner/pick.mjs');
    if (!QUALITIES.includes(values.quality)) throw Object.assign(new Error(`hm spec new: --quality must be ${QUALITIES.join('|')}`), { usage: true });
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { planSpec } = await import('../../planner/pick.mjs');
    const { seedOf } = await import('../../planner/rng.mjs');
    const { pretty } = await import('../../planner/canonical.mjs');
    const { assertWritable } = await import('../../render/lib/paths.mjs');
    const constraints = cli.constraintsFrom(values);
    const seed = values.seed !== undefined ? Number(values.seed) : seedOf('spec-new', JSON.stringify(constraints));
    const production = Boolean(values.channel || values.date);
    if (production && !(values.channel && /^\d{4}-\d{2}-\d{2}$/.test(values.date || ''))) throw Object.assign(new Error('hm spec new: a production spec needs --channel and --date YYYY-MM-DD'), { usage: true });
    const c = cli.loadContext(values);
    const r = planSpec({ ...c, mode: production ? 'production' : 'review', seed, batch: values.batch, constraints, quality: values.quality, channel: values.channel, start: values.date });
    if (!r.spec) { console.error(`hm spec new: no spec fits: ${cli.explainFailure(r.failure)}`); return 1; }
    const text = pretty(r.spec);
    if (!values.out) { process.stdout.write(text); return 0; }
    const file = values.out.endsWith('.json') ? path.resolve(values.out) : path.resolve(values.out, r.spec.id, 'spec.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(assertWritable(file), text);
    console.log(`wrote ${file}`);
    return 0;
  });
}
