import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [here, path.join(here, "..", "public", "data"), path.join(here, "..")];
const dataDir = candidates.find((p) => fs.existsSync(path.join(p, "thinkstill-manifest.json")));
if (!dataDir) throw new Error("Could not locate thinkstill-manifest.json");
const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
const hash = (name) => crypto.createHash("sha256").update(fs.readFileSync(path.join(dataDir, name))).digest("hex");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const manifest = read("thinkstill-manifest.json");
const ritualsPayload = read("thinkstill-rituals.v20.3.json");
const modesPayload = read("thinkstill-modes.v20.3.json");
const routingPayload = read("thinkstill-routing.v20.3.json");
const safetyPayload = read("thinkstill-safety.v20.3.json");
const firstPayload = read("thinkstill-first-session.v20.3.json");

assert(manifest.version === "20.3.0", "Manifest version must be 20.3.0");
assert(ritualsPayload.rituals.length === 750, "Expected 750 rituals");
assert(modesPayload.modes.length === 2250, "Expected 2250 mode rows");
assert(routingPayload.routing.length === 750, "Expected 750 routing rows");
assert(safetyPayload.supportFirst.length === 25, "Expected 25 SUPPORT FIRST rows");
assert(firstPayload.rituals.length === 50, "Expected 50 First Session rows");

const ids = ritualsPayload.rituals.map((r) => r.id);
assert(new Set(ids).size === 750, "Duplicate ritual IDs found");
assert(new Set(ritualsPayload.rituals.map((r) => r.fingerprint)).size === 750, "Duplicate engine fingerprints found");
const modeKeys = modesPayload.modes.map((m) => `${m.id}|${m.mode}`);
assert(new Set(modeKeys).size === 2250, "Duplicate or missing ID+Mode keys");
for (const id of ids) {
  for (const mode of ["Jolly","Cheeky","Unfiltered"]) assert(modeKeys.includes(`${id}|${mode}`), `Missing ${id} ${mode}`);
}
const support = ritualsPayload.rituals.filter((r) => r.safetyClass === "SUPPORT FIRST");
assert(support.length === 25, "Ritual payload must contain 25 SUPPORT FIRST rows");
assert(support.every((r) => r.supportFirstBypass === true), "Every SUPPORT FIRST row must bypass intensity");
const ranks = firstPayload.rituals.map((r) => r.rank).sort((a,b)=>a-b);
assert(ranks.every((n,i)=>n===i+1), "First Session ranks must be exactly 1–50");

for (const [key, item] of Object.entries(manifest.data)) {
  const filename = path.basename(item.versionedUrl);
  assert(hash(filename) === item.sha256, `Hash mismatch: ${key}`);
}
console.log("ThinkStill v20.3 validation PASS: 750 rituals, 2250 modes, 25 support-first, 50 first-session.");
