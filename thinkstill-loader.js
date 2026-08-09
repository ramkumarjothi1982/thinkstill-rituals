// ThinkStill data loader — browser / Framer friendly
const DEFAULT_MANIFEST_URL = "./manifest.json";

export async function loadThinkStill(manifestUrl = DEFAULT_MANIFEST_URL) {
  const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
  if (!manifestResponse.ok) throw new Error(`Manifest failed: ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  const base = new URL(".", manifestResponse.url);
  const dataResponse = await fetch(new URL(manifest.canonical_file, base), { cache: "no-store" });
  if (!dataResponse.ok) throw new Error(`Ritual data failed: ${dataResponse.status}`);
  return { manifest, rituals: await dataResponse.json() };
}

export async function loadBubble(bubble, manifestUrl = DEFAULT_MANIFEST_URL) {
  const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
  if (!manifestResponse.ok) throw new Error(`Manifest failed: ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  const key = String(bubble).toUpperCase();
  const file = manifest.bubble_files[key];
  if (!file) throw new Error(`Unknown bubble: ${bubble}`);
  const response = await fetch(new URL(file, new URL(".", manifestResponse.url)), { cache: "no-store" });
  if (!response.ok) throw new Error(`Bubble data failed: ${response.status}`);
  return response.json();
}

export function getRitualById(rituals, id) {
  return rituals.find((r) => r.id === id) ?? null;
}

export function getUserFacingRitual(record) {
  if (!record) return null;
  const {
    hook_internal, goal_internal, game_move_internal,
    release_routing_trigger, secondary_routing_trigger, release_routing_pattern,
    ...visible
  } = record;
  return visible;
}
