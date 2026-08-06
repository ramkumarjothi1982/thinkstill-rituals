import rituals from "./rituals.json" with { type: "json" };
import manifest from "./manifest.json" with { type: "json" };

export { rituals, manifest };

export function getRitualById(id) {
  return rituals.find((ritual) => ritual.id === id) ?? null;
}

export function getRitualsByBubble(bubble) {
  const target = String(bubble).trim().toUpperCase();
  return rituals.filter((ritual) => ritual.bubble === target);
}

export function getRitualsByThinkingError(error) {
  const target = String(error).trim().toLowerCase();
  return rituals.filter(
    (ritual) =>
      ritual.routing.userFacingThinkingError.toLowerCase() === target
  );
}

export function getRitualsBySubpattern(subpattern) {
  const target = String(subpattern).trim().toLowerCase();
  return rituals.filter(
    (ritual) => ritual.routing.preciseSubpattern.toLowerCase() === target
  );
}

export function chooseWeightedRitual(candidates, random = Math.random) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const weights = candidates.map((ritual) => {
    const value = Number(ritual.routing?.routingWeight);
    return Number.isFinite(value) && value > 0 ? value : 1;
  });

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = random() * total;

  for (let index = 0; index < candidates.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return candidates[index];
  }

  return candidates[candidates.length - 1];
}

export function chooseBestUnplayed(candidates, playedIds = [], random = Math.random) {
  const played = new Set(playedIds);
  const unplayed = candidates.filter((ritual) => !played.has(ritual.id));
  return chooseWeightedRitual(unplayed.length ? unplayed : candidates, random);
}
