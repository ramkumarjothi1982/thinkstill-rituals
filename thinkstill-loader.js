/**
 * ThinkStill v23.1 FINAL chatbot-compatible loader.
 * Supports legacy manifest files/parts structures and bare-array bubble JSON.
 */
const THINKSTILL_RAW_BASE =
  "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main";

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ThinkStill load failed (${res.status}): ${url}`);
  return res.json();
}

export async function loadManifest() {
  return fetchJSON(`${THINKSTILL_RAW_BASE}/manifest.json`);
}

export function getBubbleParts(manifest, bubble) {
  const B = String(bubble || "").toUpperCase();

  // Legacy: manifest.files array.
  if (Array.isArray(manifest?.files)) {
    const hits = manifest.files.filter(
      x => String(x?.bubble || x?.name || "").toUpperCase() === B
    );
    if (hits.length) return hits;
  }

  // Alternate legacy: manifest.parts array.
  if (Array.isArray(manifest?.parts)) {
    const hits = manifest.parts.filter(
      x => String(x?.bubble || x?.name || "").toUpperCase() === B
    );
    if (hits.length) return hits;
  }

  // Newer: manifest.bubbles[].parts.
  if (Array.isArray(manifest?.bubbles)) {
    const entry = manifest.bubbles.find(
      x => String(x?.bubble || x?.name || "").toUpperCase() === B
    );
    if (entry) {
      if (Array.isArray(entry.parts) && entry.parts.length) return entry.parts;
      if (entry.file || entry.filename) return [entry];
    }
  }

  // Keyed fallback.
  const keyed = manifest?.by_bubble?.[B];
  if (keyed) {
    if (Array.isArray(keyed.parts) && keyed.parts.length) return keyed.parts;
    if (keyed.file || keyed.filename) return [keyed];
  }

  return [];
}

function filenameFromPart(part) {
  return part?.filename || part?.file || part?.path;
}

export async function loadBubble(bubble) {
  const manifest = await loadManifest();
  const parts = getBubbleParts(manifest, bubble);
  if (!parts.length) throw new Error(`No parts listed for bubble ${bubble}.`);

  const all = [];
  for (const part of parts) {
    const filename = filenameFromPart(part);
    if (!filename) continue;
    const url = part.url || `${THINKSTILL_RAW_BASE}/${filename}`;
    const data = await fetchJSON(url);

    // Accept both bare arrays and wrappers.
    if (Array.isArray(data)) all.push(...data);
    else if (Array.isArray(data?.rituals)) all.push(...data.rituals);
    else if (Array.isArray(data?.items)) all.push(...data.items);
  }
  return all;
}

export function getSeenRitualIds() {
  try {
    return JSON.parse(localStorage.getItem("thinkstill_seen_ritual_ids_v23") || "[]");
  } catch {
    return [];
  }
}

export function markRitualSeen(id) {
  const seen = new Set(getSeenRitualIds());
  seen.add(id);
  localStorage.setItem("thinkstill_seen_ritual_ids_v23", JSON.stringify([...seen]));
}

export function resetSeenRituals() {
  localStorage.removeItem("thinkstill_seen_ritual_ids_v23");
}
