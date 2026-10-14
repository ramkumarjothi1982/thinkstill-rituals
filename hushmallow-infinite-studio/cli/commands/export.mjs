// hm export — hand an approved final to the owner: <variant>/export/
// {final.mp4, caption.txt, metadata.json}. It re-runs G-SPEC, requires the
// approval to cover exactly this spec.json, and a QA report that judged this
// final.mp4 with every gate passed (planner/export.mjs). caption.txt uses the
// library's own hook and end-card entries plus the owner's hashtags from
// library/brand.json only: there is deliberately no option to read hashtags
// from another file, and metadata.json records the brand file's sha256.
// Nothing is posted.
// After posting by hand: hm export <id> --mark-posted --channel <c> records it.

export const summary = 'Export an approved, QA-passed final (final.mp4, caption.txt, metadata.json); never posts. --mark-posted records a post';
export const usage = `hm export <id|spec.json|dir> [--out DIR] [--skip-qa] [--capabilities FILE] [--ledger DIR]
hm export <id|spec.json|dir> --mark-posted [--channel C] [--at ISO] [--capabilities FILE] [--ledger DIR]`;

export async function run(args) {
  const cli = await import('../../planner/cli-support.mjs');
  return cli.guarded(async () => {
    const { values, positionals } = cli.parse(args, {
      out: { type: 'string' }, 'skip-qa': { type: 'boolean', default: false },
      'mark-posted': { type: 'boolean', default: false }, channel: { type: 'string' }, at: { type: 'string' },
    }, 'export');
    if (positionals.length !== 1) throw Object.assign(new Error(`hm export: give one spec\n${usage}`), { usage: true });
    const { findSpec } = await import('../../planner/runs.mjs');
    const { exportVariant, markPosted } = await import('../../planner/export.mjs');
    const { file, dir, spec } = findSpec(positionals[0]);
    const c = cli.loadContext(values);
    const at = cli.nowIso(values.at);
    if (values['mark-posted']) {
      const channel = values.channel || spec.channel;
      if (!channel) throw Object.assign(new Error('hm export --mark-posted: --channel is required'), { usage: true });
      const { warnings } = markPosted({ ...c, spec, channel, at, dir: values.ledger });
      console.log(`recorded: ${spec.id} posted on ${channel} at ${at} (ledger published + copy-usage)`);
      for (const w of warnings) console.log(`warn  ${w}`);
      return 0;
    }
    const r = exportVariant({ ...c, dir, file, spec, out: values.out, skipQa: values['skip-qa'], at });
    console.log(`exported ${spec.id} -> ${r.outDir} (${r.files.join(', ')}) from ${file}`);
    console.log(`caption from ${r.metadata.caption.sources.join('; ')}`);
    if (values['skip-qa']) console.log('warn  QA was skipped (--skip-qa); metadata.json records it');
    if (!r.brand.hashtags.list.length) console.log(`note: ${r.brand.provenance.file} has no owner-curated hashtags yet, so caption.txt has none`);
    console.log('nothing was posted. After posting by hand: hm export ' + spec.id + ' --mark-posted --channel ' + (spec.channel || '<channel>'));
    return 0;
  });
}
