// hm reject — record the owner's rejection of a spec with reason codes
// (acting, timing, copy, world, face, sameness, brand, other). Reason codes
// flag cells for re-tuning; they never down-weight combinations by themselves
// (OWNER-DECISIONS D6).

export const summary = 'Record a rejection with reason codes in the ledger (acting|timing|copy|world|face|sameness|brand|other)';
export const usage = 'hm reject <id|spec.json|dir> --reason acting[,timing...] [--note TEXT] [--by NAME] [--at ISO] [--capabilities FILE] [--ledger DIR]';

export async function run(args) {
  const { decide } = await import('../../planner/decide.mjs');
  return decide('reject', args, usage);
}
