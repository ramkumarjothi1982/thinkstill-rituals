// hm render — render a direction through the engine and the segmented farm
// (render/farm.mjs): dry run → 90-frame lossless segments in parallel workers →
// one CRF 16 master pass (+ the preview) and verification → score → mux, with
// provenance and resume.

export const summary = 'Render a direction to MP4: segmented, resumable render farm (engine/, render/farm.mjs)';
export const usage = `hm render <direction | job-dir> [<direction | job-dir> …] [options]
hm render --list

  Several targets form a batch: one set of workers renders them in order, with
  a fresh page for every video. Per-job options apply to each target.

  --profile <name>       quality profile: final (default; the production master) | exact (bit-identical to the goldens)
                         | draft (0.5 scale, 1 sub-frame, cut-down quality, DRAFT mark); stills: hm proof
                         (engine/render/profiles.js); the profile sets the defaults of --scale, --encoder, --mark, --preview
  --features <list>      feature overrides of the profile, e.g. -worldFast,+fgAccum (bisecting; part of the job key)
  --out <dir>            job directory, one target only (default runs/adhoc/<direction>-<key12>; same inputs → same dir)
  --workers <n>          parallel render workers (default 1; each takes one shared heavy-lock slot)
  --resume               continue an unfinished job (kept segments are not rendered again)
  --retry-failed         with --resume: give failed segments another 3 attempts
  --frames <a:b>         render only frames a..b-1 (no score)
  --scale <s>            render scale (default 1; the design space stays 1080x1920)
  --width <w> --height <h>  design size (default 1080x1920)
  --seed <n>             virtual-clock seed (default 20261013)
  --encoder <name>       segment encoder: lossless (default: the intermediate of the master pass) | qp15 | draft
                         (segment-invariant, joined with concat -c copy, no master pass)
  --master <name>        the master pass's encoder over the lossless segments: crf16 (default; the approved render's arguments)
  --audio-edit <mode>    how the AAC priming is delivered: priming (default: the standard 1024-sample edit, seamless
                         loops) | trim (no edit list at all, sound at t = 0 in every player, but every loop clicks;
                         docs/wp/FU-5.md)
  --segment-frames <n>   frames per segment (default 90)
  --preroll <k>          frames of face history replayed before a segment that starts in a fresh page (default 1)
  --mark <text>          burn a corner mark, e.g. DRAFT or INTERNAL
  --no-audio             skip the score (final.mp4 is video only)
  --preview              also write preview.mp4 (x264 CRF 20, at most 15 MB; the final profile always does)
  --keep-segments        keep seg/*.mp4 after the join
  --frame-timeout <s>    watchdog per frame (default 60)
  --tee-single-pass      (1 worker) also encode one single pass and report its PSNR against the joined segments`;

const VALUE_OPTS = ['out', 'workers', 'frames', 'scale', 'width', 'height', 'seed', 'encoder', 'master', 'segment-frames', 'preroll', 'mark', 'frame-timeout', 'profile', 'features', 'audio-edit'];
const FLAG_OPTS = ['resume', 'retry-failed', 'no-audio', 'preview', 'keep-segments', 'tee-single-pass', 'list', 'force'];

export function parseArgs(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2);
    if (FLAG_OPTS.includes(k)) o[k] = true;
    else if (VALUE_OPTS.includes(k)) {
      if (i + 1 >= args.length) throw new Error(`--${k} needs a value`);
      o[k] = args[++i];
    } else throw new Error(`unknown option --${k}`);
  }
  return o;
}

const num = (v, name, { int = false } = {}) => {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || (int && !Number.isInteger(n))) throw new Error(`--${name} must be a positive ${int ? 'integer' : 'number'}, got ${v}`);
  return n;
};

export async function run(args, ctx) {
  let o;
  try { o = parseArgs(args); } catch (e) { console.error(`hm render: ${e.message}\n\n${usage}`); return 2; }
  const fs = await import('node:fs');
  const path = await import('node:path');
  const farm = await import('../../render/farm.mjs');
  if (o.list) {
    const { pathToFileURL } = await import('node:url');
    const { DIRECTIONS } = await import(pathToFileURL(path.join(ctx.paths.STUDIO, 'engine', 'directions.js')).href);
    for (const [id, e] of Object.entries(DIRECTIONS)) if (!e.dev) console.log(`${id.padEnd(28)} ${e.src}`);
    return 0;
  }
  if (!o._.length) { console.error(usage); return 2; }
  if (o.out && o._.length > 1) { console.error('hm render: --out takes one target'); return 2; }
  let jobs, common;
  try {
    const perJob = {
      out: o.out, frames: farm.parseRange(o.frames), scale: num(o.scale, 'scale'),
      width: num(o.width, 'width', { int: true }), height: num(o.height, 'height', { int: true }),
      seed: num(o.seed, 'seed', { int: true }), encoder: o.encoder, master: o.master, segmentFrames: num(o['segment-frames'], 'segment-frames', { int: true }),
      preroll: o.preroll === undefined ? undefined : Number(o.preroll), mark: o.mark,
      profile: o.profile, features: o.features,
    };
    if (perJob.preroll !== undefined && !(Number.isInteger(perJob.preroll) && perJob.preroll >= 0)) throw new Error('--preroll must be an integer ≥ 0');
    const { AUDIO_EDIT_MODES, AUDIO_EDIT_DEFAULT } = await import('../../render/mux.mjs');
    const audioEdit = o['audio-edit'] ?? AUDIO_EDIT_DEFAULT;
    if (!AUDIO_EDIT_MODES.includes(audioEdit)) throw new Error(`--audio-edit must be one of ${AUDIO_EDIT_MODES.join(', ')}, got ${audioEdit}`);
    let resume = !!o.resume;
    jobs = o._.map((target) => {
      const asDir = path.resolve(target);
      if (fs.existsSync(path.join(asDir, 'job.json'))) {
        // a job directory: continue it with the parameters it was created with
        resume = true;
        return { ...farm.readJob(asDir).params, out: asDir };
      }
      return { ...perJob, direction: target };
    });
    common = {
      resume, workers: num(o.workers, 'workers', { int: true }) || 1,
      retryFailed: !!o['retry-failed'], audio: !o['no-audio'], preview: o.preview ? true : undefined, keepSegments: !!o['keep-segments'],
      frameTimeoutMs: (num(o['frame-timeout'], 'frame-timeout') || 60) * 1000, teeSinglePass: !!o['tee-single-pass'], force: !!o.force, audioEdit,
      log: (m) => console.log(m.startsWith('[') ? m : `[farm] ${m}`),
    };
  } catch (e) { console.error(`hm render: ${e.message}`); return 2; }
  try {
    for (const r of await farm.renderMany(jobs, common)) console.log(`job: ${r.jobDir}`);
    return 0;
  } catch (e) {
    console.error(`hm render: ${e.message}`);
    return 1;
  }
}
