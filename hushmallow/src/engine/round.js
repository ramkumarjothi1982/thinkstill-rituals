// One "round" per plan: nothing the app offers is repeated until every ritual
// in the plan has been started once. Then a fresh round begins. Things the
// person picks themselves (Saved, the Library, Another Angle's door) always
// open, and still count as done for the round.
const key = (tier) => `round-${tier}`;

export function createRound(store, tier) {
  const load = () => store.get(key(tier), { n: 1, seen: [] });
  return {
    tier,
    seen: () => new Set(load().seen),
    number: () => load().n,
    count: () => load().seen.length,
    mark(id) {
      const s = load();
      if (s.seen.includes(id)) return;
      s.seen.push(id);
      store.set(key(tier), s);
    },
    restart() { store.set(key(tier), { n: load().n + 1, seen: [] }); },
  };
}
