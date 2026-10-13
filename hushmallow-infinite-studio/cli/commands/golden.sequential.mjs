// hm golden sequential — full in-order reference render of v2 (tools/golden/sequential-v2.mjs).

export const summary = 'Render v2 frames 0..449 in order: per-frame hashes + re-encode vs the approved master (≈ 25 min, exclusive)';
export const usage = 'hm golden sequential [--frames N]';

export async function run(args, ctx) {
  const { runNode } = await import('../lib/run.mjs');
  return runNode(ctx.paths.studioPath('tools', 'golden', 'sequential-v2.mjs'), args);
}
