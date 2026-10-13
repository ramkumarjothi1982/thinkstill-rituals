// hm golden capture — (re)capture the v2 goldens (tools/golden/capture-v2.mjs).

export const summary = 'Capture the v2 goldens: state, mesh hashes, cues, curves, plan, 16 lossless frames (exclusive lock)';
export const usage = 'hm golden capture [--skip-pixels] [--out-dir <dir>] [--frames-dir <dir>]';

export async function run(args, ctx) {
  const { runNode } = await import('../lib/run.mjs');
  return runNode(ctx.paths.studioPath('tools', 'golden', 'capture-v2.mjs'), args);
}
