// hm approve — record the owner's approval of a reviewed spec in the ledger
// (decisions + fingerprints). The spec must pass G-SPEC today and, if it
// belongs to a planned batch, be exactly what hm plan wrote; the decision
// names it by its whole-spec hash, so hm export refuses any later edit
// (planner/decide.mjs). Approval does not promote tuning cells: that needs a
// clean G-DIR and the owner-ticked extremes sheet (OWNER-DECISIONS D2).

export const summary = "Record the owner's approval of a G-SPEC-clean spec, by its exact spec hash, in the ledger";
export const usage = 'hm approve <id|spec.json|dir> [--by NAME] [--note TEXT] [--at ISO] [--capabilities FILE] [--ledger DIR]';

export async function run(args) {
  const { decide } = await import('../../planner/decide.mjs');
  return decide('approve', args, usage);
}
