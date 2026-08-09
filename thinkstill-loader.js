/**
 * ThinkStill v30 final ritual loader.
 * - 400 rituals
 * - automatic Bubble routing
 * - global no-repeat pool
 * - no user-facing Power-Up or How-to-Play wrapper
 */
export const THINKSTILL_RAW_BASE =
  "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main";

const SEEN_KEY = "thinkstill_seen_ritual_ids_v30";

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ThinkStill load failed (${res.status}): ${url}`);
  return res.json();
}

export async function loadManifest() {
  return fetchJSON(`${THINKSTILL_RAW_BASE}/manifest.json`);
}

export function getBubbleParts(manifest, bubble) {
  const key = String(bubble || "").toUpperCase();

  if (Array.isArray(manifest?.files)) {
    const hits = manifest.files.filter(
      x => String(x?.bubble || x?.name || "").toUpperCase() === key
    );
    if (hits.length) return hits;
  }

  if (Array.isArray(manifest?.parts)) {
    const hits = manifest.parts.filter(
      x => String(x?.bubble || x?.name || "").toUpperCase() === key
    );
    if (hits.length) return hits;
  }

  if (Array.isArray(manifest?.bubbles)) {
    const entry = manifest.bubbles.find(
      x => String(x?.bubble || x?.name || "").toUpperCase() === key
    );
    if (entry?.parts?.length) return entry.parts;
    if (entry?.file || entry?.filename) return [entry];
  }

  const keyed = manifest?.by_bubble?.[key];
  if (keyed?.parts?.length) return keyed.parts;
  if (keyed?.file || keyed?.filename) return [keyed];

  return [];
}

export async function loadBubble(bubble) {
  const manifest = await loadManifest();
  const parts = getBubbleParts(manifest, bubble);
  if (!parts.length) throw new Error(`No parts listed for bubble ${bubble}.`);

  const rituals = [];
  for (const part of parts) {
    const filename = part.filename || part.file || part.path;
    const url = part.url || `${THINKSTILL_RAW_BASE}/${filename}`;
    const data = await fetchJSON(url);
    if (Array.isArray(data)) rituals.push(...data);
    else if (Array.isArray(data?.rituals)) rituals.push(...data.rituals);
    else if (Array.isArray(data?.items)) rituals.push(...data.items);
  }
  return rituals;
}

export async function loadAllRituals() {
  const data = await fetchJSON(`${THINKSTILL_RAW_BASE}/rituals.json`);
  return Array.isArray(data) ? data : (data?.rituals || []);
}

export function getSeenRitualIds() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}

export function markRitualSeen(id) {
  const seen = new Set(getSeenRitualIds());
  seen.add(String(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export function resetSeenRituals() {
  localStorage.removeItem(SEEN_KEY);
}

export function eligibleUnseen(rituals) {
  const seen = new Set(getSeenRitualIds());
  if (seen.size >= 400) {
    resetSeenRituals();
    return rituals.slice();
  }
  return rituals.filter(r => !seen.has(String(r.id)));
}
