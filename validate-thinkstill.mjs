import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dataDir = fs.existsSync(path.join(here, "thinkstill-manifest.json")) ? here : path.join(root, "public", "data");

const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
const hash = (name) => crypto.createHash("sha256").update(fs.readFileSync(path.join(dataDir, name))).digest("hex");
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const manifest = read("thinkstill-manifest.json");
const ritualsPayload = read("thinkstill-rituals.v18.3.json");
const routingPayload = read("thinkstill-routing.v18.3.json");
const safetyPayload = read("thinkstill-safety.v18.3.json");
const firstPayload = read("thinkstill-first-session.v18.3.json");

const rituals = ritualsPayload.rituals;
const routing = routingPayload.routing;

assert(manifest.version === "18.3.0", "Manifest version must be 18.3.0");
assert(rituals.length === 750, `Expected 750 rituals, got ${rituals.length}`);
assert(routing.length === 750, `Expected 750 routing rows, got ${routing.length}`);
assert(safetyPayload.supportFirst.length === 25, "Expected 25 SUPPORT FIRST rows");
assert(firstPayload.rituals.length === 50, "Expected 50 First Session rows");

assert(new Set(rituals.map((r) => r.id)).size === 750, "Duplicate ritual IDs found");
assert(new Set(rituals.map((r) => r.fingerprint)).size === 750, "Duplicate fingerprints found");
assert(new Set(rituals.map((r) => r.displayName)).size === 750, "Duplicate display names found");

const firstRanks = firstPayload.rituals.map((r) => r.rank).sort((a, b) => a - b);
assert(firstRanks.every((rank, i) => rank === i + 1), "First Session ranks must be exactly 1–50");

const support = rituals.filter((r) => r.safetyClass === "SUPPORT FIRST");
assert(support.every((r) => r.supportFirstBypass === true), "Every SUPPORT FIRST row must bypass the ritual shell");
assert(support.every((r) => r.renderMode === "SUPPORT FIRST"), "Every SUPPORT FIRST row must use SUPPORT FIRST render mode");
assert(support.every((r) => r.supportTrigger.length > 0), "Every SUPPORT FIRST row must have support triggers");
assert(support.every((r) => r.supportCategory), "Every SUPPORT FIRST row must have a support category");
assert(support.every((r) => !r.firstSessionPick), "SUPPORT FIRST must not appear in First Session");

const tier3 = routing.filter((r) => r.substanceRouteTier === "TIER 3 · DELIBERATION");
const genericCraving = ["craving","urge","drugs","addiction","substance use","relapse urge","compulsion"];
assert(
  tier3.every((r) => genericCraving.every((x) => !r.intentAliases.map((a) => a.toLowerCase()).includes(x))),
  "Tier 3 routes must not contain generic acute craving aliases"
);

for (const [key, meta] of Object.entries(manifest.data)) {
  const file = path.basename(meta.versionedUrl);
  assert(hash(file) === meta.sha256, `Hash mismatch for ${key}`);
}

console.log("✓ ThinkStill v18.3 validation passed");
console.log(`  rituals: ${rituals.length}`);
console.log(`  support-first: ${support.length}`);
console.log(`  first-session: ${firstPayload.rituals.length}`);
console.log(`  unique fingerprints: ${new Set(rituals.map((r) => r.fingerprint)).size}`);
