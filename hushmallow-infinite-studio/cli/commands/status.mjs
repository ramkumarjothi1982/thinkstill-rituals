// hm status — render jobs (state, segments, ETA), free disk and the heavy lock.

export const summary = 'Show render jobs (state, segments, ETA), free disk and who holds the heavy lock';
export const usage = 'hm status [job-dir …] [--all] [--json]';

const fmtEta = (s) => (s == null ? '' : s >= 3600 ? `${(s / 3600).toFixed(1)} h` : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);

export async function run(args, ctx) {
  const path = await import('node:path');
  const farm = await import('../../render/farm.mjs');
  const { heavyStatus, formatStatus } = await import('../../render/lib/heavy-lock.mjs');
  const json = args.includes('--json'), all = args.includes('--all');
  const dirs = args.filter((a) => !a.startsWith('--')).map((d) => path.resolve(d));
  const jobs = (dirs.length ? dirs : farm.findJobs().slice(0, all ? undefined : 10)).map((d) => farm.jobStatus(d)).filter(Boolean);
  const disk = { studio: farm.diskCheck(ctx.paths.STUDIO), work: farm.diskCheck(ctx.paths.WORK) };
  const lock = await heavyStatus();
  if (json) {
    console.log(JSON.stringify({ jobs, disk, heavyLock: lock }, null, 1));
    return 0;
  }
  if (!jobs.length) console.log(`no render jobs${dirs.length ? '' : ` under ${path.relative(ctx.paths.STUDIO, farm.RUNS_DIR)}/`}`);
  for (const j of jobs) {
    const s = j.segments;
    const segs = s.total ? `${s.done}/${s.total} segments done${s.running ? `, ${s.running} running` : ''}${s.stale ? `, ${s.stale} stale` : ''}${s.failed ? `, ${s.failed} FAILED` : ''}` : 'not compiled';
    const eta = j.state === 'segments' && j.etaSeconds ? `, ETA ~${fmtEta(j.etaSeconds)}` : '';
    console.log(`${(j.state || '?').padEnd(9)} ${j.id}  ${segs}${eta}`);
    console.log(`          ${path.relative(ctx.paths.STUDIO, j.jobDir) || j.jobDir}${j.final ? '  → final.mp4' : ''}  (updated ${j.updated ?? '?'}${j.farm ? `; farm pid ${j.farm.pid} running since ${j.farm.since}` : ''})`);
    for (const d of j.detail.filter((x) => x.state === 'running' || x.state === 'stale' || x.state === 'failed')) {
      console.log(`            seg ${d.k} [${d.a}-${d.b - 1}] ${d.state}${d.owner ? ` (worker ${d.owner.worker}, pid ${d.owner.pid})` : ''}${d.stale ? `: ${d.stale}` : ''}${d.attempts ? `, ${d.attempts} failed attempt(s)` : ''}`);
    }
  }
  for (const [name, d] of Object.entries(disk)) console.log(`disk ${name}: ${d.freeGB} GB free${d.level !== 'ok' ? ` (${d.level === 'warn' ? 'WARN: below 5 GB' : 'REFUSING new jobs: below 3 GB'})` : ''}`);
  console.log(formatStatus(lock));
  return 0;
}
