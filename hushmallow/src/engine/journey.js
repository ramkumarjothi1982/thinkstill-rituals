// The person's journey, on this device only: one entry per finished ritual — what it was, which Mallow, the feeling families they came in
// with (never their words), how long, and how it felt afterwards if they
// answered the optional check-in. Powers the Your journey screen.
const KEY = 'journey';
const MAX = 500;

export function journeyEntries(store) { return store.get(KEY, []); }

export function logFinish(store, entry) {
  const xs = journeyEntries(store);
  xs.push({ at: Date.now(), felt: null, ...entry });
  store.set(KEY, xs.slice(-MAX));
}

/** Attach the check-in answer ('lighter' | 'same' | 'heavier') to the latest entry for this id. */
export function setFelt(store, id, felt) {
  const xs = journeyEntries(store);
  for (let i = xs.length - 1; i >= 0; i--) if (xs[i].id === id) { xs[i].felt = felt; break; }
  store.set(KEY, xs);
}

/** Plain numbers for the dashboard. `now` is injectable for tests. */
export function summarise(entries, now = Date.now()) {
  const DAY = 86400000;
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const today = startOfDay(now);
  const week = entries.filter((e) => e.at >= today - 6 * DAY);
  const felt = { lighter: 0, same: 0, heavier: 0 };
  for (const e of entries) if (e.felt && felt[e.felt] != null) felt[e.felt]++;
  const count = (key) => { const m = new Map(); for (const e of entries) for (const k of [].concat(e[key] || [])) m.set(k, (m.get(k) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const helped = new Map();
  for (const e of entries) if (e.felt === 'lighter') helped.set(e.id, { id: e.id, name: e.name, mallow: e.mallow, n: (helped.get(e.id)?.n || 0) + 1 });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d0 = today - (6 - i) * DAY;
    return { day: d0, n: entries.filter((e) => e.at >= d0 && e.at < d0 + DAY).length };
  });
  return {
    total: entries.length,
    week: week.length,
    minutes: Math.round(entries.reduce((s, e) => s + (e.seconds || 0), 0) / 60),
    felt, checkIns: felt.lighter + felt.same + felt.heavier,
    families: count('families'),
    mallows: count('mallow'),
    helped: [...helped.values()].sort((a, b) => b.n - a.n).slice(0, 3),
    days,
    recent: entries.slice(-10).reverse(),
  };
}
