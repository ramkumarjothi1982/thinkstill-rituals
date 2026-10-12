// Which rituals and tricks this person has finished, by id only (no words).
// Stored on this device; powers the ✓ marks and counts in the Library.
const KEY = 'played';

export function playedSet(store) { return new Set(store.get(KEY, [])); }

export function markPlayed(store, id) {
  const s = playedSet(store);
  if (s.has(id)) return;
  s.add(id);
  store.set(KEY, [...s]);
}

export function clearPlayed(store) { store.set(KEY, []); }
