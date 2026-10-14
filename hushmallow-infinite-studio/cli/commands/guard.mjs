// hm guard — the safety rails in one readable report (the same checks as
// tests/guard/*): frozen v2 hashes (ignored files included), live-app tree
// hash, no uncommitted changes in the repository outside the studio root, and
// the machine-wide write audit (nothing written or deleted outside the studio
// and WORK, and no non-routine git config change, since the committed baseline).
//
// `hm guard --arm --reason "<what was reviewed>"` moves the write-audit
// baseline to now (qa/guard/outside-writes.json; commit it) and records the
// directory listing it compares deletions against (WORK/guard/). Like
// re-freezing, do it only after reviewing what the audit reported.

export const summary = 'Check the safety rails: frozen v2, app tree, nothing written or deleted outside the studio (git + machine-wide audit)';
export const usage = 'hm guard [--json]   |   hm guard --arm --reason "<what was reviewed>" [--by <who>]';

export async function run(args) {
  const { checkFrozen, checkAppTree, repoChangesOutsideStudio } = await import('../../render/lib/frozen.mjs');
  const { auditOutsideWrites, describeAudit, armBaseline, BASELINE_FILE } = await import('../../render/lib/write-audit.mjs');
  const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };

  if (args.includes('--arm')) {
    const b = armBaseline({ reason: opt('reason'), by: opt('by') });
    console.log(`write audit armed at ${b.since}: listing of ${b.listing.dirs} directories / ${b.listing.entries} entries in WORK/guard/${b.listing.file}; `
      + `git config keys: ${Object.values(b.gitConfig).reduce((n, v) => n + v.length, 0)}. Commit ${BASELINE_FILE}.`);
    return 0;
  }

  const frozen = checkFrozen();
  const app = checkAppTree();
  const outside = repoChangesOutsideStudio();
  const audit = auditOutsideWrites();
  const ok = frozen.ok && app.ok && !outside.length && audit.ok;
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ok, frozen, app, outside, audit }, null, 2));
    return ok ? 0 : 1;
  }
  const line = (pass, label, detail) => console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? `: ${detail}` : ''}`);
  const local = frozen.notMaterialised.length ? `, ${frozen.notMaterialised.length} local-only files not in this worktree` : '';
  line(frozen.ok, `frozen v2 (tree ${frozen.treeHash.slice(0, 12)}, local ${frozen.localTreeHash.slice(0, 12)}${local})`, frozen.ok ? '' : frozen.summary);
  line(app.ok, `live app untouched (tree ${app.treeHash.slice(0, 12)})`, app.ok ? '' : app.summary);
  line(!outside.length, 'no changes in the repository outside the studio root', outside.slice(0, 8).join(', '));
  const npm = audit.attributed.length ? `; ${audit.attributed.length} npm compile-cache entries verified as npm's own modules` : '';
  line(audit.ok, `nothing written or deleted on this machine outside the studio and WORK, git config unchanged, since ${audit.since} (${audit.roots.join(' ')}; ${Math.round(audit.ms)} ms${npm})`);
  if (!audit.ok) console.log(describeAudit(audit));
  return ok ? 0 : 1;
}
