// hm remux — re-score an existing picture with new audio-only slots (WP-04).

export const summary = 'Re-score an existing render with new audio-only slots (contour, tick tempo, pan seed); the video is copied';
export const usage = `hm remux <job dir> [options]

  --contour <c>         rise-1 | rise-2 | arch-1 | arch-2
  --tick-tempo <x>      0.9 .. 1.1
  --pan-seed <n>        seeds the score's random stream (sparkle and cricket placement, whoosh noise)
  --sound <json>        the same slots as JSON
  --fixes a,b|none|all  documented fixes (default all)
  --direction <file>    --spec <file>   (default: found from the job)
  --in-place            replace score.wav and final.mp4 (default: write score.remux.wav and final.remux.mp4)`;

export async function run(args, ctx) {
  const { remux, parseArgs, parseFixes } = await import('../../audio/score-cli.mjs');
  let parsed;
  try { parsed = parseArgs(args, ['contour', 'tick-tempo', 'pan-seed', 'sound', 'fixes', 'direction', 'spec'], ['in-place']); } catch (e) { console.error(`hm remux: ${e.message}\n\n${usage}`); return 2; }
  const { opts, pos } = parsed;
  if (pos.length !== 1) { console.error(usage); return 2; }
  const sound = opts.sound ? JSON.parse(opts.sound) : {};
  if (opts.contour) sound.contour = opts.contour;
  if (opts['tick-tempo']) sound.tickTempo = Number(opts['tick-tempo']);
  if (opts['pan-seed']) sound.panSeed = Number(opts['pan-seed']);
  try {
    const r = await ctx.heavy.withHeavyLock({ mode: 'shared', label: 'hm remux' }, () => remux(pos[0], {
      sound, fixes: parseFixes(opts.fixes), direction: opts.direction, spec: opts.spec, inPlace: !!opts['in-place'], log: (l) => console.log(`[remux] ${l}`),
    }));
    console.log(`[remux] ${r.report.sound.contour}, tick tempo ${r.report.sound.tickTempo}, pan seed ${r.report.sound.panSeed}: ${r.master.I} LUFS, ${r.master.TP} dBTP`);
    console.log(`[remux] wrote ${r.wav} and ${r.mp4} in ${(r.ms / 1000).toFixed(1)} s`);
    return 0;
  } catch (e) {
    console.error(`hm remux: ${e.message}`);
    return 1;
  }
}
