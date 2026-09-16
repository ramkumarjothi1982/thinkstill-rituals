export type ThinkStillMode = "Jolly" | "Cheeky" | "Unfiltered";
export type CognitiveLoad = "LOW" | "MEDIUM" | "HIGH";
export type RenderMode = "RITUAL" | "SUPPORT FIRST";

export interface ThinkStillModeCopy {
  mode: ThinkStillMode;
  openingLine: string;
  ritualCard: string;
  mindBend: string;
  safety: string;
  supportFirst: boolean;
  modePolicy: string;
  gentleCard: string;
  optionalCheckIn: string;
  returnPrompt: string;
  contentFingerprint: string;
}

export interface ThinkStillRitual {
  id: string;
  bubble: string;
  bestFor: string;
  canonicalTechnique: string;
  displayName: string;
  playTime: string;
  hook: string;
  rule: string;
  play: string;
  twist: string;
  reveal: string;
  mindBend: string;
  safety: string;
  supportFirst: boolean;
  supportFirstMessage: string | null;
  safetyClass: string;
  resetDNA: string;
  firstSessionPick: boolean;
  firstSessionRank: number | null;
  fullRitual: string;
  thoughtEngineeringMechanism: string;
  fingerprint: string;
  cognitiveLoad: CognitiveLoad;
  intentAliases: string[];
  supportFirstBypass: boolean;
  renderMode: RenderMode;
  supportTrigger: string[];
  supportCategory: string | null;
  substanceRouteTier: string;
  severeSubstanceSafetyEscalation: string;
  defaultMode: ThinkStillMode;
  modes: Record<"jolly" | "cheeky" | "unfiltered", ThinkStillModeCopy>;
}

export interface ThinkStillRoutingRow {
  id: string;
  displayName: string;
  bestFor: string;
  resetDNA: string;
  outcome: string;
  acuteDistressFit: string;
  guardrail: string;
  firstSessionPick: boolean;
  rank: number | null;
  canonicalTechnique: string;
  cognitiveLoad: CognitiveLoad;
  intentAliases: string[];
  supportFirstBypass: boolean;
  substanceCravingIntent: boolean;
  supportTrigger: string[];
  supportCategory: string | null;
  substanceRouteTier: string;
  severeSubstanceSafetyEscalation: string;
}

export interface ThinkStillBundle {
  version: string;
  rituals: ThinkStillRitual[];
  routing: ThinkStillRoutingRow[];
}

export const DEFAULT_MODE: ThinkStillMode = "Cheeky";
export const INTENSITY_STORAGE_KEY = "thinkstill.intensity";
export const LEGACY_VIBE_STORAGE_KEY = "thinkstill.vibe";

const normMode = (value?: string | null): ThinkStillMode | null => {
  const v = (value || "").toLowerCase();
  if (v === "jolly") return "Jolly";
  if (v === "cheeky") return "Cheeky";
  if (v === "unfiltered") return "Unfiltered";
  return null;
};

export function resolveIntensity(value?: string | null): ThinkStillMode {
  return normMode(value) ?? DEFAULT_MODE;
}

export function readSavedIntensity(): ThinkStillMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  const current = normMode(window.localStorage.getItem(INTENSITY_STORAGE_KEY));
  if (current) return current;
  const legacy = normMode(window.localStorage.getItem(LEGACY_VIBE_STORAGE_KEY));
  if (legacy) {
    window.localStorage.setItem(INTENSITY_STORAGE_KEY, legacy.toLowerCase());
    return legacy;
  }
  return DEFAULT_MODE;
}

export function saveIntensity(mode: ThinkStillMode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(INTENSITY_STORAGE_KEY, mode.toLowerCase());
  }
}

export function getModeCopy(ritual: ThinkStillRitual, requested?: ThinkStillMode | string | null): ThinkStillModeCopy {
  if (ritual.supportFirstBypass || ritual.safetyClass === "SUPPORT FIRST") {
    return ritual.modes.cheeky; // all 3 support-first rows intentionally carry the same original support copy
  }
  const mode = resolveIntensity(requested);
  return ritual.modes[mode.toLowerCase() as "jolly" | "cheeky" | "unfiltered"] ?? ritual.modes.cheeky;
}

const MANIFEST_URL = "/data/thinkstill-manifest.json";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`ThinkStill fetch failed (${response.status}): ${url}`);
  return response.json() as Promise<T>;
}

export async function loadThinkStill(): Promise<ThinkStillBundle> {
  const manifest = await fetchJson<any>(MANIFEST_URL);
  const [ritualPayload, routingPayload] = await Promise.all([
    fetchJson<any>(manifest.data.rituals.url),
    fetchJson<any>(manifest.data.routing.url),
  ]);
  return { version: manifest.version, rituals: ritualPayload.rituals, routing: routingPayload.routing };
}
