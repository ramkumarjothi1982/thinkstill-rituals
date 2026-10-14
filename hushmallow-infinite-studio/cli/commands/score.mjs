// hm score — render the score of a job or cue log (audio/score.mjs, WP-04).

export const summary = 'Render score.wav from a cue log: move recipes, the Mallow\'s kit and bed, circular (--compat v2-score: v2)';
export const usage = `hm score <job dir | cues.json> [out.wav] [options]

  out.wav               default: score.wav beside the cue log
  --compat v2-score     reproduce v2's plan exactly (byte-identical approved soundtrack)
  --fixes a,b|none|all  documented fixes to apply (default all: r10, r11, swirl, r7)
  --direction <file>    the composed direction (default: found from the job or cue log)
  --spec <file>         the variant spec (its audio-only sound slots)
  --sound <json>        sound slot overrides: {"contour":"rise-1","tickTempo":1.05,"panSeed":7}
  --plan <file>         also write the plan and report (JSON)
  --check <file>        also measure G-AUDIO (loudness, true peak, seam, contour, hum) into a JSON report`;

export async function run(args, ctx) {
  const path = await import('node:path');
  const fs = await import('node:fs');
  const { cli } = await import('../../audio/score-cli.mjs');
  const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  if (!pos.length) { console.error(usage); return 2; }
  if (pos.length === 1) {
    const dir = fs.existsSync(pos[0]) && fs.statSync(pos[0]).isDirectory() ? pos[0] : path.dirname(pos[0]);
    args = [...args.slice(0, args.indexOf(pos[0]) + 1), path.join(dir, 'score.wav'), ...args.slice(args.indexOf(pos[0]) + 1)];
  }
  return ctx.heavy.withHeavyLock({ mode: 'shared', label: 'hm score' }, () => cli(args));
}
