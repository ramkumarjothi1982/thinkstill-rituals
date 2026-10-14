// hm spec show — a spec as a readable sheet, with its G-SPEC status today.

export const summary = 'Show a spec (id, path or dir): slots, copy, pins, fingerprint and its G-SPEC status';
export const usage = 'hm spec show <id|spec.json|dir> [--json] [--capabilities FILE] [--ledger DIR]';

export async function run(args) {
  const cli = await import('../../planner/cli-support.mjs');
  return cli.guarded(async () => {
    const { values, positionals } = cli.parse(args, {}, 'spec show');
    if (positionals.length !== 1) throw Object.assign(new Error(`hm spec show: give one spec\n${usage}`), { usage: true });
    const { findSpec, batchSpecsOf } = await import('../../planner/runs.mjs');
    const { checkSpec } = await import('../../planner/gspec.mjs');
    const { file, spec } = findSpec(positionals[0]);
    const c = cli.loadContext(values);
    const g = checkSpec(spec, { ...c, batchSpecs: batchSpecsOf(file) });
    if (values.json) { console.log(JSON.stringify({ spec, gspec: g }, null, 2)); return g.pass ? 0 : 1; }
    const t = c.lib.template(spec.template);
    const row = (k, v) => console.log(`  ${k.padEnd(11)} ${v}`);
    console.log(`${spec.id}  (${spec.mode}${spec.internal ? ', INTERNAL' : ''}, ${spec.quality})  ${file}`);
    row('template', `${spec.template}: ${t ? t.title : '?'}`);
    row('who/where', `${spec.mallow} in ${spec.realm}, ${spec.tod}, ${spec.weather}${spec.dressing.length ? `, ${spec.dressing.map((d) => `${d.id}#${d.variant}`).join(' ')}` : ''}`);
    row('duration', `${spec.duration} s, seed ${spec.seed}`);
    if (spec.channel) row('posting', `${spec.channel} on ${spec.plannedFor} (batch ${spec.batch} #${spec.index})`);
    else row('batch', `${spec.batch} #${spec.index}`);
    row('moves', `${spec.gag.id} (${spec.gag.intensity}) > ${spec.metaphor} > ${spec.turn} > ${spec.ritual} | ${spec.loop}, ${spec.camera}, ${spec.arc}`);
    row('hook', spec.copy.hook.join(' / '));
    spec.copy.lines.forEach((l, i) => row(`L${i + 1}`, l));
    row(spec.copy.end.kind, spec.copy.end.text.join(' / '));
    if (spec.copy.nameWord) row('name word', spec.copy.nameWord);
    row('sound', `${spec.sound.motifs.join(' ')} | ${spec.sound.contour}, tick x${spec.sound.tickTempo}`);
    row('jitter', `hue ${spec.worldJitter.hue}, warmth ${spec.worldJitter.warmth}, exposure ${spec.worldJitter.exposure}`);
    row('cells', Object.entries(spec.cells).map(([k, v]) => `${k}=${v}`).join(' '));
    row('pins', `library ${spec.pins.library} (${spec.pins.librarySha256.slice(0, 12)}), capabilities ${String(spec.pins.capabilitiesSha256).slice(0, 12)}`);
    row('fingerprint', spec.fingerprint);
    console.log(`G-SPEC ${g.pass ? 'PASS' : 'FAIL'} (${g.errors.length} errors, ${g.warnings.length} warnings, ${g.metrics.ms.toFixed(1)} ms)`);
    for (const e of g.errors) console.log(`  ERROR ${e.rule}: ${e.message}`);
    for (const w of g.warnings) console.log(`  warn  ${w.rule}: ${w.message}`);
    return g.pass ? 0 : 1;
  });
}
