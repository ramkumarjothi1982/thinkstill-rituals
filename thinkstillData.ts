export type CognitiveLoad = "LOW" | "MEDIUM" | "HIGH";
export type RenderMode = "RITUAL" | "SUPPORT FIRST";
export type SubstanceRouteTier =
  | "NONE"
  | "TIER 1 · URGE"
  | "TIER 2 · HABIT"
  | "TIER 3 · DELIBERATION"
  | "SAFETY";

export interface ThinkStillRitual {
  id: string;
  bubble: string;
  bestFor: string;
  canonicalTechnique: string;
  displayName: string;
  playTime: string;
  /** Legacy data key; v19.5 UI meaning is GOAL. */
  hook: string;
  rule: string;
  play: string;
  twist: string;
  reveal: string;
  mindBend: string;
  safety: string;
  supportFirst: boolean;
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
  substanceRouteTier: SubstanceRouteTier;
  severeSubstanceSafetyEscalation: string;
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
  substanceRouteTier: SubstanceRouteTier;
  severeSubstanceSafetyEscalation: string;
}

export interface ThinkStillBundle {
  version: string;
  rituals: ThinkStillRitual[];
  routing: ThinkStillRoutingRow[];
}

const MANIFEST_URL = "/data/thinkstill-manifest.json";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`ThinkStill fetch failed (${response.status}) for ${url}`);
  }

  return response.json() as Promise<T>;
}

export async function loadThinkStillData(): Promise<ThinkStillBundle> {
  const manifest = await fetchJson<any>(MANIFEST_URL);

  if (manifest?.version !== "19.5.0") {
    throw new Error(`Unexpected ThinkStill manifest version: ${manifest?.version ?? "missing"}`);
  }
  if (manifest?.rowCount !== 750) {
    throw new Error(`ThinkStill manifest expected 750 rituals, got ${manifest?.rowCount ?? "missing"}`);
  }

  const [ritualPayload, routingPayload] = await Promise.all([
    fetchJson<any>(manifest.data.rituals.url),
    fetchJson<any>(manifest.data.routing.url),
  ]);

  const rituals = ritualPayload?.rituals as ThinkStillRitual[] | undefined;
  const routing = routingPayload?.routing as ThinkStillRoutingRow[] | undefined;

  if (!Array.isArray(rituals) || rituals.length !== 750) {
    throw new Error(`ThinkStill ritual data invalid: expected 750 rows, got ${rituals?.length ?? "missing"}`);
  }
  if (!Array.isArray(routing) || routing.length !== 750) {
    throw new Error(`ThinkStill routing data invalid: expected 750 rows, got ${routing?.length ?? "missing"}`);
  }

  return { version: manifest.version, rituals, routing };
}

export function injectUserThought(text: string, userThought: string): string {
  return text.replaceAll("[USER THOUGHT]", userThought.trim());
}
