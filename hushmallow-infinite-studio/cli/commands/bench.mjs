// hm bench — render-time benchmark under a quality profile (tools/bench.mjs).

export const summary = 'Benchmark a direction under a profile: ms/frame, film minutes, per-pass split (exclusive lock, median of 3)';
export const usage = `hm bench [direction] [options]

  Renders a sample of frames under the EXCLUSIVE heavy lock (it waits for running
  jobs and blocks new ones), three runs by default, and reports the median:
  ms per frame (render + binary readback, as a worker), the predicted 15 s film,
  and a fenced per-pass split. Written to WORK/bench/<label>.json.

  direction            registry id (default my-brain-at-2am-v2)
  --profile <name>     exact | final (default final), engine/render/profiles.js
  --features <list>    feature overrides, e.g. -worldFast
  --runs <n>           runs (default 3; the median is reported)
  --sample <spec>      windows[:NxL] (default 6x8 consecutive frames) | all | a:b | every:N
  --scale <s>          render scale (default: the profile's)
  --label <text>       result name (default <direction>-<profile>[-<features>])
  --out <file>         result JSON (default WORK/bench/<label>.json)
  --no-passes          skip the per-pass split (timing pass only)
  --chromium-args "…"  extra Chromium flags on top of the engine's (P8 experiments; recorded in the result)`;

export async function run(args) {
  const { bench, formatBench, parseBenchArgs } = await import('../../tools/bench.mjs');
  let o;
  try { o = parseBenchArgs(args); } catch (e) { console.error(`hm bench: ${e.message}\n\n${usage}`); return 2; }
  try {
    const r = await bench(o);
    console.log(formatBench(r));
    console.log(`written: ${r.file}`);
    return 0;
  } catch (e) {
    console.error(`hm bench: ${e.message}`);
    return 1;
  }
}
