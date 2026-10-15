// hm remux — re-score an existing picture with new audio-only slots (WP-04).
//
// FU-5: the result is a file QA can verify. A remux of a farm render is stamped
// "<the render's farm stamp> remux <key12>", and a remux record (hm-remux/1) is
// written next to it: the picture it kept (file, sha256 and the sha256 of its
// H.264 stream), the sound slots, the fixes, the audio edit mode, the score and
// the output's sha256, under the key the stamp names. In place, provenance.json
// is updated to describe the new final.mp4 (the replaced file is recorded); out
// of place, provenance.remux.json describes final.remux.mp4 and qa-remux.json is
// a ready hm qa target for it. G-FINAL:delivery accepts such a stamp when the
// record matches and the file's picture is the farm's picture, bit for bit.

export const summary = 'Re-score an existing render with new audio-only slots (contour, tick tempo, pan seed); the video is copied';
export const usage = `hm remux <job dir> [options]

  --contour <c>         rise-1 | rise-2 | arch-1 | arch-2
  --tick-tempo <x>      0.9 .. 1.1
  --pan-seed <n>        seeds the score's random stream (sparkle and cricket placement, whoosh noise)
  --sound <json>        the same slots as JSON
  --fixes a,b|none|all  documented fixes (default all)
  --direction <file>    --spec <file>   (default: found from the job)
  --audio-edit <mode>   priming (default: the standard AAC priming edit) | trim (no edit list; render/mux.mjs)
  --in-place            replace score.wav, final.mp4 and provenance.json (default: write score.remux.wav,
                        final.remux.mp4, provenance.remux.json and the QA target qa-remux.json)`;

export async function run(args, ctx) {
  const { remux, parseArgs, parseFixes } = await import('../../audio/score-cli.mjs');
  let parsed;
  try { parsed = parseArgs(args, ['contour', 'tick-tempo', 'pan-seed', 'sound', 'fixes', 'direction', 'spec', 'audio-edit'], ['in-place']); } catch (e) { console.error(`hm remux: ${e.message}\n\n${usage}`); return 2; }
  const { opts, pos } = parsed;
  if (pos.length !== 1) { console.error(usage); return 2; }
  const { AUDIO_EDIT_MODES, AUDIO_EDIT_DEFAULT } = await import('../../render/mux.mjs');
  const audioEdit = opts['audio-edit'] ?? AUDIO_EDIT_DEFAULT;
  if (!AUDIO_EDIT_MODES.includes(audioEdit)) { console.error(`hm remux: --audio-edit must be one of ${AUDIO_EDIT_MODES.join(', ')}`); return 2; }
  const sound = opts.sound ? JSON.parse(opts.sound) : {};
  if (opts.contour) sound.contour = opts.contour;
  if (opts['tick-tempo']) sound.tickTempo = Number(opts['tick-tempo']);
  if (opts['pan-seed']) sound.panSeed = Number(opts['pan-seed']);
  const inPlace = !!opts['in-place'];
  try {
    const r = await ctx.heavy.withHeavyLock({ mode: 'shared', label: 'hm remux' }, async () => {
      const { remuxProvenance } = await import('../../render/remux.mjs');
      const rp = remuxProvenance(pos[0], { audioEdit, inPlace });
      const out = await remux(pos[0], {
        sound, fixes: parseFixes(opts.fixes), direction: opts.direction, spec: opts.spec, inPlace, audioEdit, stamp: rp.stamp,
        log: (l) => console.log(`[remux] ${l}`),
      });
      return { ...out, record: await rp.write(out) };
    });
    console.log(`[remux] ${r.report.sound.contour}, tick tempo ${r.report.sound.tickTempo}, pan seed ${r.report.sound.panSeed}: ${r.master.I} LUFS, ${r.master.TP} dBTP`);
    console.log(`[remux] wrote ${r.wav} and ${r.mp4} in ${(r.ms / 1000).toFixed(1)} s`);
    if (r.record) console.log(`[remux] stamp "${r.stamp}"; provenance ${r.record.provenance}${r.record.target ? `; QA target ${r.record.target}` : ''}`);
    else console.log(`[remux] the source is not a farm render with provenance.json: the stamp "${r.stamp}" cannot be verified by QA`);
    return 0;
  } catch (e) {
    console.error(`hm remux: ${e.message}`);
    return 1;
  }
}
