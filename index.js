import rituals from "./rituals.json" with { type: "json" };
import routing from "./routing.json" with { type: "json" };
import routingIndex from "./routing-index.json" with { type: "json" };

const routingById = new Map(routing.map(item => [item.id, item]));
const ritualById = new Map(rituals.map(item => [item.id, item]));

export { rituals, routing, routingIndex };

export function getRitual(id) {
  return ritualById.get(id) ?? null;
}

export function getRouting(id) {
  return routingById.get(id) ?? null;
}

export function getFullRitual(id) {
  const consumer = getRitual(id);
  const route = getRouting(id);
  return consumer && route ? { consumer, routing: route } : null;
}
