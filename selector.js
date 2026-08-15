import { rituals, routing } from "./index.js";

const ritualById = new Map(rituals.map(r => [r.id, r]));

function normalise(value) {
  return String(value ?? "").trim().toLowerCase();
}

function containsKeyword(route, query) {
  const q = normalise(query);
  if (!q) return false;
  return route.routingKeywords.some(k => normalise(k).includes(q) || q.includes(normalise(k)));
}

/**
 * Reference selector using the locked workbook metadata.
 * Production apps can replace scoring while keeping the data contract unchanged.
 */
export function selectRitual({
  precisePattern,
  specialist,
  world,
  query,
  usedIds = [],
  excludedFamilyIds = [],
  maxSafetyTier = 3
} = {}) {
  const used = new Set(usedIds);
  const excludedFamilies = new Set(excludedFamilyIds);
  let candidates = routing.filter(route =>
    route.safetyTier <= maxSafetyTier &&
    !used.has(route.id) &&
    !excludedFamilies.has(route.mechanismFamilyId)
  );

  const score = route => {
    let s = 0;
    if (precisePattern && normalise(route.precisePattern) === normalise(precisePattern)) s += 1000;
    if (specialist && normalise(route.specialist) === normalise(specialist)) s += 300;
    if (world && normalise(route.world) === normalise(world)) s += 100;
    if (query && containsKeyword(route, query)) s += 60;
    s += Math.max(0, 20 - Number(route.firstLinePriority || 20));
    return s;
  };

  candidates = candidates
    .map(route => ({ route, score: score(route) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.route.ritualNumber - b.route.ritualNumber);

  if (!candidates.length) return null;
  const route = candidates[0].route;
  return { consumer: ritualById.get(route.id), routing: route };
}
