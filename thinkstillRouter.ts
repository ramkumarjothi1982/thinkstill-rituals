import type {
  CognitiveLoad,
  ThinkStillRitual,
  ThinkStillRoutingRow,
} from "./thinkstillData";

export interface RouteOptions {
  usedIds?: Iterable<string>;
  /** Explicit decision from the app safety layer. */
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
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (value: string) => normalize(value).split(" ").filter(Boolean);

/** Whole-token phrase matching. Prevents false matches such as surgery -> urge. */
const containsWholePhrase = (haystack: string, phrase: string) => {
  const h = ` ${normalize(haystack)} `;
  const p = normalize(phrase);
  return !!p && h.includes(` ${p} `);
};

function scoreAliasMatch(input: string, aliases: string[]): number {
  const inputTokens = new Set(words(input));
  let score = 0;

  for (const alias of aliases ?? []) {
    const a = normalize(alias);
    if (!a) continue;
    if (input === a) {
      score = Math.max(score, 120);
      continue;
    }
    if (containsWholePhrase(input, a)) {
      score = Math.max(score, 95);
      continue;
    }

    const aliasTokens = words(a).filter((t) => t.length > 2);
    if (!aliasTokens.length) continue;
    const matched = aliasTokens.filter((t) => inputTokens.has(t)).length;
    const coverage = matched / aliasTokens.length;
    if (matched >= 1 && coverage >= 0.5) {
      score = Math.max(score, Math.min(72, matched * 18 + Math.round(coverage * 18)));
    }
  }
  return score;
}

function matchesAny(input: string, phrases: string[]) {
  return phrases.some((p) => containsWholePhrase(input, p));
}

function deliberationLanguage(input: string): boolean {
  return matchesAny(input, [
    "should i", "whether to", "decide", "decision", "choice", "quit",
    "treatment", "what should i do", "thinking about stopping", "thinking about changing",
  ]);
}

function substanceLanguage(input: string): boolean {
  return matchesAny(input, [
    "urge", "urges", "craving", "crave", "drug", "drugs", "addiction",
    "substance use", "relapse", "compulsion", "smoke", "smoking", "nicotine",
    "vape", "vaping", "alcohol", "cocaine", "cannabis", "weed", "gamble",
    "gambling", "betting", "doomscroll", "doomscrolling", "compulsive shopping",
    "porn urge",
  ]);
}

function severeSubstanceLanguage(input: string): boolean {
  return matchesAny(input, [
    "overdose", "overdosed", "severe withdrawal", "alcohol withdrawal",
    "benzodiazepine withdrawal", "seizure", "unconscious", "can't stay awake",
    "cannot stay awake", "unsafe intoxication",
  ]);
}

function explicitHighRiskLanguage(input: string): boolean {
  return matchesAny(input, [
    "kill myself", "hurt myself", "harm myself", "end my life", "want to die",
    "suicidal", "suicide attempt", "self harm", "kill someone", "hurt someone",
    "harm someone", "can't stay safe", "cannot stay safe", "danger to others",
    "medical emergency", "overdose", "overdosed", "seizure", "chest pain",
    "can't tell what's real", "cannot tell what is real", "hearing voices",
  ]) || severeSubstanceLanguage(input);
}

type SemanticIntent =
  | "ANGER"
  | "SOCIAL"
  | "URGE"
  | "MONEY"
  | "SLEEP"
  | "FAMILY"
  | "PERFORMANCE"
  | "PANIC"
  | "LOOP"
  | "NONE";

function semanticIntent(input: string): SemanticIntent {
  if (matchesAny(input, ["panic", "panicking", "panic attack", "can't breathe", "cannot breathe", "racing heart", "heart pounding", "body alarm"])) return "PANIC";
  if (matchesAny(input, ["angry", "anger", "furious", "rage", "mad", "pissed off", "irritated", "fuming", "seeing red"])) return "ANGER";
  if (substanceLanguage(input)) return "URGE";
  if (matchesAny(input, ["lonely", "loneliness", "rejected", "rejection", "left out", "ghosted", "ignored", "judged", "jealous", "jealousy", "comparison"])) return "SOCIAL";
  if (matchesAny(input, ["family pressure", "parent pressure", "parents pressure", "family conflict", "argument with family"])) return "FAMILY";
  if (matchesAny(input, ["debt", "debts", "rent", "mortgage", "bills", "money stress", "money worry", "financial stress", "financial worry"])) return "MONEY";
  if (matchesAny(input, ["can't switch off", "cannot switch off", "mind won't stop at night", "busy mind at night", "can't sleep", "cannot sleep", "awake at night", "bedtime", "insomnia"])) return "SLEEP";
  if (matchesAny(input, ["boss stress", "stress at work", "work stress", "job stress", "meeting stress", "meeting", "interview", "job interview", "exam", "presentation", "public speaking"])) return "PERFORMANCE";
  if (matchesAny(input, ["overthinking", "overthink", "keep thinking", "can't stop thinking", "mind keeps going", "thought loop", "spiralling thoughts", "spiraling thoughts", "rumination"])) return "LOOP";
  return "NONE";
}

function familyBoost(intent: SemanticIntent, bestFor: string): number {
  const b = normalize(bestFor);
  if (intent === "ANGER" && b.includes("emotion play")) return 180;
  if (intent === "SOCIAL" && (b.includes("social pressure") || b.includes("social interpretation"))) return 180;
  if (intent === "URGE" && (b.includes("urges") || b.includes("habit loops"))) return 220;
  if (intent === "MONEY" && (b.includes("uncertainty") || b.includes("decision pressure") || b.includes("worry"))) return 170;
  if (intent === "SLEEP" && (b.includes("winding down") || b.includes("sleep & quiet") || b.includes("sleep"))) return 210;
  if (intent === "FAMILY" && (b.includes("communication") || b.includes("social pressure"))) return 170;
  if (intent === "PERFORMANCE" && b.includes("performance pressure")) return 180;
  if (intent === "PANIC" && b.includes("panic/body alarm")) return 230;
  if (intent === "LOOP" && (b.includes("rumination") || b.includes("overthinking") || b.includes("mental quiet"))) return 180;
  return 0;
}

function chooseSupportRow(
  input: string,
  routing: ThinkStillRoutingRow[],
): ThinkStillRoutingRow | undefined {
  const supportRows = routing.filter((r) => r.supportFirstBypass);
  const triggered = supportRows
    .map((row) => ({ row, score: scoreAliasMatch(input, row.supportTrigger ?? []) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.row.id.localeCompare(b.row.id));

  return triggered[0]?.row
    ?? supportRows.find((r) => r.supportCategory === "EMERGENCY NOW")
    ?? supportRows[0];
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

  // SUPPORT FIRST is reserved for an explicit safety-layer decision or clear high-risk language.
  // Generic distress words such as panic or overwhelmed do not bypass the normal ritual library.
  if (options.safetyOverride || explicitHighRiskLanguage(input)) {
    const row = chooseSupportRow(input, routing);
    if (!row) throw new Error("No SUPPORT FIRST ritual available");
    const ritual = ritualById.get(row.id);
    if (!ritual) throw new Error(`Missing SUPPORT FIRST ritual ${row.id}`);
    return { ritual, routing: row, score: 1000, reason: ["SUPPORT FIRST override"] };
  }

  const semantic = semanticIntent(input);
  const hasSubstanceLanguage = substanceLanguage(input);
  const candidates: RouteResult[] = [];

  for (const row of routing) {
    if (row.supportFirstBypass || used.has(row.id)) continue;
    const ritual = ritualById.get(row.id);
    if (!ritual) continue;

    let score = scoreAliasMatch(input, row.intentAliases ?? []);
    const reason: string[] = [];
    if (score > 0) reason.push("intent alias");

    const semanticBoost = familyBoost(semantic, row.bestFor);
    if (semanticBoost) {
      score += semanticBoost;
      reason.push(`semantic ${semantic.toLowerCase()}`);
    }

    // Substance tiers apply only when the user's input itself contains substance/urge language.
    if (hasSubstanceLanguage) {
      if (row.substanceRouteTier === "TIER 1 · URGE") {
        score += 90;
        reason.push("substance urge priority");
      } else if (row.substanceRouteTier === "TIER 2 · HABIT") {
        score += 50;
        reason.push("substance habit priority");
      } else if (row.substanceRouteTier === "TIER 3 · DELIBERATION") {
        if (deliberationLanguage(input)) {
          score += 25;
          reason.push("substance deliberation match");
        } else {
          score -= 120;
        }
      }
    } else if (row.substanceRouteTier !== "NONE") {
      // Prevent substance-only tier metadata from hijacking ordinary inputs such as overthinking.
      score -= 60;
    }

    if (options.acuteDistress || semantic === "PANIC") {
      score += loadWeight[row.cognitiveLoad];
      if (row.cognitiveLoad === "LOW") reason.push("low cognitive load");
    }

    if (row.firstSessionPick) score += 2;

    if (score > 0) candidates.push({ ritual, routing: row, score, reason });
  }

  candidates.sort((a, b) =>
    b.score - a.score
    || (a.routing.rank ?? 999) - (b.routing.rank ?? 999)
    || a.ritual.id.localeCompare(b.ritual.id)
  );

  if (candidates.length) return candidates[0];

  // Deterministic fallback: unused LOW-load normal ritual.
  const fallbackRow = routing.find(
    (r) => !r.supportFirstBypass && !used.has(r.id) && r.cognitiveLoad === "LOW",
  ) ?? routing.find((r) => !r.supportFirstBypass && !used.has(r.id))
    ?? routing.find((r) => !r.supportFirstBypass);

  if (!fallbackRow) throw new Error("No ThinkStill ritual available");
  const fallback = ritualById.get(fallbackRow.id);
  if (!fallback) throw new Error(`Missing fallback ritual ${fallbackRow.id}`);

  return { ritual: fallback, routing: fallbackRow, score: 0, reason: ["fallback"] };
}
