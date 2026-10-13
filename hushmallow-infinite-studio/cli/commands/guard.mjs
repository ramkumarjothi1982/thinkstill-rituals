// hm guard — the safety rails in one readable report (the same checks as
// tests/guard/*): frozen v2 hashes, live-app tree hash, and no uncommitted
// changes in the repository outside the studio root.

export const summary = 'Check the safety rails: frozen v2 hashes, app tree hash, no writes outside the studio';
export const usage = 'hm guard [--json]';

export async function run(args) {
  const { checkFrozen, checkAppTree, repoChangesOutsideStudio } = await import('../../render/lib/frozen.mjs');
  const frozen = checkFrozen();
  const app = checkAppTree();
  const outside = repoChangesOutsideStudio();
  const ok = frozen.ok && app.ok && !outside.length;
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ok, frozen, app, outside }, null, 2));
  } else {
    const line = (pass, label, detail) => console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? `: ${detail}` : ''}`);
    line(frozen.ok, `frozen v2 (tree ${frozen.treeHash.slice(0, 12)})`, frozen.ok ? '' : frozen.summary);
    line(app.ok, `live app untouched (tree ${app.treeHash.slice(0, 12)})`, app.ok ? '' : app.summary);
    line(!outside.length, 'no changes outside the studio root', outside.slice(0, 8).join(', '));
  }
  return ok ? 0 : 1;
}
