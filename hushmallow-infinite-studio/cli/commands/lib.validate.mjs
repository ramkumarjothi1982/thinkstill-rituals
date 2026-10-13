// hm lib validate — the story library validator (templates/validate-library.mjs).
// WP-06 extends this command with the library/ pack, preset and schema checks.

export const summary = 'Validate templates/story-library.json (copy limits, references, medical/therapy lint)';
export const usage = 'hm lib validate [--quiet]';

export async function run(args, ctx) {
  const { runNode } = await import('../lib/run.mjs');
  return runNode(ctx.paths.studioPath('templates', 'validate-library.mjs'), args.filter((a) => a === '--quiet'));
}
