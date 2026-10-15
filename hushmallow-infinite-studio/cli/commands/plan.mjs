// hm plan — plan a batch of variant specs (planner/pick.mjs) into
// runs/<batch>/<id>/spec.json plus runs/<batch>/plan.json.
//
// Production (default): a posting plan for one channel from --start, checked
// against the channel's ledger (sequencing, cooldowns, distance, cadence).
// --review: an internal review batch (INTERNAL mark, candidate cells allowed,
// no posting rules; no two specs share their visible slots).

export const summary = 'Plan a batch of specs: seeded, capability-gated, lint-clean (runs/<batch>/<id>/spec.json)';
export const usage = `hm plan --count N (--seed S | --batch NAME) [--review | --channel C --start YYYY-MM-DD [--per-week K]]
        [--template T01,T26] [--mallow noomi] [--tod late-night] [--duration 15] [--gag ..] [--metaphor ..] [--ritual ..]
        [--camera ..] [--turn ..] [--weather ..] [--quality final|draft|proof] [--no-distinct] [--reserve]
        [--out DIR] [--force] [--dry] [--json] [--capabilities FILE] [--ledger DIR]`;

export async function run(args, ctx) {
  const cli = await import('../../planner/cli-support.mjs');
  return cli.guarded(async () => {
    const { values } = cli.parse(args, {
      count: { type: 'string' }, seed: { type: 'string' }, batch: { type: 'string' }, review: { type: 'boolean', default: false },
      channel: { type: 'string' }, start: { type: 'string' }, 'per-week': { type: 'string' }, quality: { type: 'string', default: 'final' },
      'no-distinct': { type: 'boolean', default: false }, reserve: { type: 'boolean', default: false },
      out: { type: 'string' }, force: { type: 'boolean', default: false }, dry: { type: 'boolean', default: false },
      ...cli.CONSTRAINT_OPTIONS,
    }, 'plan');
    const { planBatch } = await import('../../planner/pick.mjs');
    const { seedOf } = await import('../../planner/rng.mjs');
    const { writeBatch, RUNS_DIR } = await import('../../planner/runs.mjs');
    const { appendLedger } = await import('../../planner/ledger.mjs');
    const { copyTexts } = await import('../../planner/schedule.mjs');
    const path = await import('node:path');

    const count = Number(values.count);
    if (!Number.isInteger(count) || count < 1) throw Object.assign(new Error('hm plan: --count N (a positive integer) is required'), { usage: true });
    if (values.seed === undefined && !values.batch) throw Object.assign(new Error('hm plan: give --seed S (or --batch NAME, which seeds from the name) so the plan is reproducible'), { usage: true });
    const seed = values.seed !== undefined ? Number(values.seed) : seedOf('batch', values.batch);
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Object.assign(new Error('hm plan: --seed must be an integer 0..4294967295'), { usage: true });
    const mode = values.review ? 'review' : 'production';
    if (mode === 'production' && (!values.channel || !values.start)) {
      throw Object.assign(new Error('hm plan: a production plan needs --channel and --start YYYY-MM-DD (or use --review for an internal review batch)'), { usage: true });
    }
    if (values.start && !/^\d{4}-\d{2}-\d{2}$/.test(values.start)) throw Object.assign(new Error('hm plan: --start must be YYYY-MM-DD'), { usage: true });
    const batch = values.batch || (mode === 'review' ? `review-s${seed}` : `${values.start}-${values.channel}-s${seed}`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(batch)) throw Object.assign(new Error(`hm plan: batch id "${batch}" must be letters, digits, . _ - (max 80)`), { usage: true });
    if (values.reserve && mode !== 'production') throw Object.assign(new Error('hm plan: --reserve is for production plans'), { usage: true });
    const { QUALITIES } = await import('../../planner/pick.mjs');
    if (!QUALITIES.includes(values.quality)) throw Object.assign(new Error(`hm plan: --quality must be ${QUALITIES.join('|')} (only final is ever exported)`), { usage: true });

    const c = cli.loadContext(values);
    const t0 = process.hrtime.bigint();
    const r = planBatch({
      ...c, mode, count, seed, batch, channel: values.channel, start: values.start,
      perWeek: values['per-week'] ? Number(values['per-week']) : undefined,
      constraints: cli.constraintsFrom(values), quality: values.quality, distinct: !values['no-distinct'],
    });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    let dir = null;
    if (!values.dry && r.specs.length) {
      dir = writeBatch(values.out ? path.resolve(values.out) : path.join(RUNS_DIR, batch), r, { force: values.force });
      if (values.reserve) {
        appendLedger('reservations', r.specs.flatMap((s) => copyTexts(s).map((u) => ({ ...u, batch, channel: s.channel, until: `${s.plannedFor}T23:59:59.000Z` }))), { dir: values.ledger });
      }
    }
    if (values.json) console.log(JSON.stringify({ ...r.manifest, dir, ms }, null, 2));
    else {
      console.log(`${mode} batch ${batch}: ${r.specs.length}/${count} specs planned in ${ms.toFixed(0)} ms (seed ${seed})`);
      const byT = {};
      for (const s of r.specs) byT[s.template] = (byT[s.template] || 0) + 1;
      for (const [t, n] of Object.entries(byT)) console.log(`  ${String(n).padStart(5)}  ${t}`);
      if (!r.manifest.plannable.length) console.log('  nothing is plannable with the current capabilities (hm lib coverage --all shows why)');
      for (const f of r.failures) console.log(`  ${cli.explainFailure(f)}`);
      if (dir) console.log(`wrote ${path.relative(ctx.paths.STUDIO, dir) || dir}/plan.json and ${r.specs.length} spec.json${values.reserve ? ' (+ reservations)' : ''}`);
    }
    return r.specs.length === count ? 0 : 1;
  });
}
