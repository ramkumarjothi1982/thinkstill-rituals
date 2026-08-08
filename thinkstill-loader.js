/**
 * ThinkStill v23 ritual loader
 * Flat GitHub package — no build step required.
 */
const THINKSTILL_RAW_BASE =
  "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main";

export async function loadManifest() {
  const res = await fetch(`${THINKSTILL_RAW_BASE}/manifest.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ThinkStill manifest load failed: ${res.status}`);
  return res.json();
}

export async function loadRituals() {
  const res = await fetch(`${THINKSTILL_RAW_BASE}/rituals.normalized.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ThinkStill rituals load failed: ${res.status}`);
  const data = await res.json();
  return data.rituals || [];
}

export async function loadBubble(bubble) {
  const file = String(bubble || "").trim().toLowerCase();
  const allowed = new Set(["glitch","drop","still","patch","loopie","rush","sync"]);
  if (!allowed.has(file)) throw new Error("Unknown ThinkStill bubble");
  const res = await fetch(`${THINKSTILL_RAW_BASE}/${file}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ThinkStill bubble load failed: ${res.status}`);
  const data = await res.json();
  return data.rituals || [];
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

export function chooseUnusedRitual(rituals) {
  const seen = new Set(getSeenRitualIds());
  let eligible = rituals.filter(r => !seen.has(r.id));

  // Global-pool reset should ideally be coordinated by the app after all 400
  // IDs have been seen. This fallback protects simple clients.
  if (!eligible.length && seen.size >= 400) {
    resetSeenRituals();
    eligible = rituals.slice();
  }
  if (!eligible.length) return null;

  const ritual = eligible[Math.floor(Math.random() * eligible.length)];
  markRitualSeen(ritual.id);
  return ritual;
}
