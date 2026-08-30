import type {
  CognitiveLoad,
  ThinkStillRitual,
  ThinkStillRoutingRow,
} from "./thinkstillData";

export interface RouteOptions {
  usedIds?: Iterable<string>;
  safetyOverride?: boolean;
  acuteDistress?: boolean;
}

export interface RouteResult {
  ritual: ThinkStillRitual;
  routing: ThinkStillRoutingRow;
  score: number;
  reason: string[];
}

const loadWeight: Record<CognitiveLoad, number> = {
  LOW: 30,
  MEDIUM: 12,
  HIGH: 0,
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const containsPhrase = (haystack: string, phrase: string) =>
  haystack.includes(normalize(phrase));

function scoreAliasMatch(input: string, aliases: string[]): number {
  let score = 0;
  for (const alias of aliases) {
    const a = normalize(alias);
    if (!a) continue;
    if (input === a) score = Math.max(score, 120);
    else if (containsPhrase(input, a)) score = Math.max(score, 95);
    else {
      const aliasTokens = a.split(" ");
      const matched = aliasTokens.filter((t) => t.length > 2 && input.includes(t)).length;
      if (matched) score = Math.max(score, Math.min(70, matched * 18));
    }
  }
  return score;
}

function deliberationLanguage(input: string): boolean {
  return [
    "should i",
    "whether to",
    "decide",
    "decision",
    "choice",
    "quit",
    "treatment",
    "what should i do",
  ].some((x) => input.includes(x));
}

function severeSubstanceLanguage(input: string): boolean {
  return [
    "overdose",
    "severe withdrawal",
    "alcohol withdrawal",
    "benzodiazepine withdrawal",
    "seizure",
    "unconscious",
    "can't stay awake",
    "cannot stay awake",
    "unsafe intoxication",
  ].some((x) => input.includes(x));
}

export function selectThinkStillRitual(
  challenge: string,
  rituals: ThinkStillRitual[],
  routing: ThinkStillRoutingRow[],
  options: RouteOptions = {},
): RouteResult {
  const input = normalize(challenge);
  const used = new Set(options.usedIds ?? []);
  const ritualById = new Map(rituals.map((r) => [r.id, r]));

  // Safety must be decided by the application safety layer when available.
  // The trigger matching below is an additional routing signal, not a substitute
  // for a real safety classifier or emergency handling.
  const supportRows = routing.filter((r) => r.supportFirstBypass);
  const triggeredSupport = supportRows
    .map((row) => ({
      row,
      score: scoreAliasMatch(input, row.supportTrigger),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (options.safetyOverride || severeSubstanceLanguage(input)) {
    const row = triggeredSupport[0]?.row
      ?? supportRows.find((r) => r.supportCategory === "EMERGENCY NOW")
      ?? supportRows[0];
    const ritual = ritualById.get(row.id);
    if (!ritual) throw new Error(`Missing SUPPORT FIRST ritual ${row.id}`);
    return { ritual, routing: row, score: 1000, reason: ["SUPPORT FIRST override"] };
  }

  if (triggeredSupport[0]?.score >= 95) {
    const row = triggeredSupport[0].row;
    const ritual = ritualById.get(row.id);
    if (!ritual) throw new Error(`Missing SUPPORT FIRST ritual ${row.id}`);
    return { ritual, routing: row, score: 900 + triggeredSupport[0].score, reason: ["specific safety trigger"] };
  }

  const candidates: RouteResult[] = [];

  for (const row of routing) {
    if (row.supportFirstBypass || used.has(row.id)) continue;
    const ritual = ritualById.get(row.id);
    if (!ritual) continue;

    let score = scoreAliasMatch(input, row.intentAliases);
    const reason: string[] = [];

    if (score > 0) reason.push("intent alias");

    if (row.substanceRouteTier === "TIER 1 · URGE" && score > 0) {
      score += 80;
      reason.push("urge priority");
    } else if (row.substanceRouteTier === "TIER 2 · HABIT" && score > 0) {
      score += 45;
      reason.push("habit priority");
    } else if (row.substanceRouteTier === "TIER 3 · DELIBERATION") {
      if (deliberationLanguage(input) && score > 0) {
        score += 20;
        reason.push("deliberation match");
      } else {
        score -= 100;
      }
    }

    if (options.acuteDistress || row.acuteDistressFit === "HIGH") {
      score += loadWeight[row.cognitiveLoad];
      if (row.cognitiveLoad === "LOW") reason.push("low cognitive load");
    }

    if (row.firstSessionPick) score += 2;

    if (score > 0) {
      candidates.push({ ritual, routing: row, score, reason });
    }
  }

  candidates.sort((a, b) =>
    b.score - a.score
    || (a.routing.rank ?? 999) - (b.routing.rank ?? 999)
    || a.ritual.id.localeCompare(b.ritual.id)
  );

  if (candidates.length) return candidates[0];

  // Safe deterministic fallback: prefer unused, LOW-load, general rituals.
  const fallbackRow = routing.find(
    (r) => !r.supportFirstBypass && !used.has(r.id) && r.cognitiveLoad === "LOW",
  ) ?? routing.find((r) => !r.supportFirstBypass && !used.has(r.id))
    ?? routing.find((r) => !r.supportFirstBypass);

  if (!fallbackRow) throw new Error("No ThinkStill ritual available");
  const fallback = ritualById.get(fallbackRow.id);
  if (!fallback) throw new Error(`Missing fallback ritual ${fallbackRow.id}`);

  return { ritual: fallback, routing: fallbackRow, score: 0, reason: ["fallback"] };
}
