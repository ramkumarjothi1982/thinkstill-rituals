import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { runRoutingSmoke } from "./routing-smoke.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = [here, path.join(here, "public", "data"), path.join(path.resolve(here, ".."), "public", "data")]
  .find((p) => fs.existsSync(path.join(p, "thinkstill-manifest.json")));
if (!dataDir) throw new Error("Could not find thinkstill-manifest.json.");

const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
const hash = (name) => crypto.createHash("sha256").update(fs.readFileSync(path.join(dataDir, name))).digest("hex");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const clean = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
const norm = (s) => clean(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const lastLine = (s) => String(s ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).at(-1) ?? "";
const strictUnits = (s) => (String(s ?? "").match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g) ?? []);
const tokens = (s) => (String(s ?? "").toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)*/g) ?? []);
const grams = (s, n) => { const t=tokens(s); const out=[]; for(let i=0;i<=t.length-n;i++) out.push(t.slice(i,i+n).join(" ")); return out; };

function levenshtein(a,b){
  if(a===b) return 0;
  if(!a.length) return b.length;
  if(!b.length) return a.length;
  let prev=Array.from({length:b.length+1},(_,i)=>i), cur=new Array(b.length+1);
  for(let i=1;i<=a.length;i++){
    cur[0]=i;
    for(let j=1;j<=b.length;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost);
    }
    [prev,cur]=[cur,prev];
  }
  return prev[b.length];
}
function similarity(a,b){
  a=norm(a); b=norm(b);
  const max=Math.max(a.length,b.length);
  if(!max) return 1;
  if(Math.min(a.length,b.length)/max < 0.70) return 0;
  return 1 - levenshtein(a,b)/max;
}
function assertNoNearDuplicates(rows,key,threshold=0.85){
  for(let i=0;i<rows.length;i++){
    for(let j=i+1;j<rows.length;j++){
      const score=similarity(rows[i][key],rows[j][key]);
      assert(score < threshold, `${key} near-duplicate ${rows[i].id}/${rows[j].id}: ${score.toFixed(3)}`);
    }
  }
}
function hasSplitGoalEcho(r){
  const lines=String(r.mindBend??"").split(/\r?\n/).map((x)=>x.trim()).filter(Boolean);
  const goal=String(r.hook??"").trim();
  if(lines.at(-1)!==goal) return false;
  for(let n=1;n<=Math.min(5,lines.length-1);n++){
    if(lines.slice(-(n+1),-1).join(" ")===goal) return true;
  }
  return false;
}

const manifest = read("thinkstill-manifest.json");
const ritualsPayload = read("thinkstill-rituals.v19.5.json");
const routingPayload = read("thinkstill-routing.v19.5.json");
const safetyPayload = read("thinkstill-safety.v19.5.json");
const firstPayload = read("thinkstill-first-session.v19.5.json");
const rituals = ritualsPayload.rituals;
const routing = routingPayload.routing;

assert(manifest.version === "19.5.0", "Manifest version must be 19.5.0");
for (const p of [ritualsPayload, routingPayload, safetyPayload, firstPayload]) assert(p.version === "19.5.0", "All payload versions must be 19.5.0");
assert(rituals.length === 750, `Expected 750 rituals, got ${rituals.length}`);
assert(routing.length === 750, `Expected 750 routing rows, got ${routing.length}`);
assert(safetyPayload.supportFirst.length === 25, "Expected 25 SUPPORT FIRST rows");
assert(firstPayload.rituals.length === 50, "Expected 50 First Session rows");
assert(new Set(rituals.map((r) => r.id)).size === 750, "Duplicate ritual IDs found");
assert(new Set(rituals.map((r) => r.fingerprint)).size === 750, "Duplicate fingerprints found");
assert(new Set(rituals.map((r) => r.displayName.toLowerCase())).size === 750, "Duplicate display names found");

const firstRanks = firstPayload.rituals.map((r) => r.rank).sort((a,b)=>a-b);
assert(firstRanks.every((rank,i)=>rank===i+1), "First Session ranks must be exactly 1–50");
const rank9 = firstPayload.rituals.find((r)=>r.rank===9);
assert(rank9?.id === "TS-002" && rank9?.cognitiveLoad === "LOW", "First-session rank 9 must remain low-load TS-002");

const support = rituals.filter((r) => r.safetyClass === "SUPPORT FIRST");
const normal = rituals.filter((r) => r.safetyClass !== "SUPPORT FIRST");
assert(support.length === 25 && normal.length === 725, "Expected 725 normal + 25 SUPPORT FIRST");
assert(support.every((r) => r.supportFirst === true), "SUPPORT FIRST rows must have supportFirst=true");
assert(normal.every((r) => r.supportFirst === false), "Normal rows must have supportFirst=false");
assert(support.every((r) => r.supportFirstBypass === true && r.renderMode === "SUPPORT FIRST"), "SUPPORT FIRST bypass/render mismatch");
assert(support.every((r) => Array.isArray(r.supportTrigger) && r.supportTrigger.length > 0 && r.supportCategory), "SUPPORT FIRST metadata incomplete");
assert(support.every((r) => !r.firstSessionPick), "SUPPORT FIRST must not appear in First Session");

const userFields = ["hook","rule","play","twist","reveal","mindBend","safety"];
for (const r of rituals) {
  for (const key of userFields) {
    assert(clean(r[key]).length > 0, `${r.id} missing ${key}`);
    for (const line of String(r[key]).split(/\r?\n/).map((x)=>x.trim()).filter(Boolean)) {
      assert(strictUnits(line).length <= 12, `${r.id} ${key} exceeds strict 12-token line cap: ${line}`);
    }
    assert(!String(r[key]).includes("/"), `${r.id} ${key} still contains slash shorthand`);
    assert(!/\b(write|draw|sketch)\b/i.test(String(r[key])), `${r.id} ${key} still requires writing/drawing`);
  }
}
assert(normal.every((r) => lastLine(r.mindBend) === String(r.hook).trim()), "Every normal Mind Bend must close on its exact GOAL");
assert(normal.every((r) => !hasSplitGoalEcho(r)), "Split/repeated GOAL echo remains inside a Mind Bend");
for (const r of normal) {
  const lines=String(r.mindBend??"").split(/\r?\n/).map((x)=>x.trim()).filter(Boolean);
  assert(lines.length >= 2, `${r.id} Mind Bend must contain insight + GOAL`);
  assert(/[.!?][\"'”’]?$/.test(lines.at(-2)), `${r.id} Mind Bend insight needs final punctuation before GOAL`);
}
assert(normal.every((r) => strictUnits(r.hook).length <= 10), "Every normal GOAL must be 10 tokens or fewer");

for (const key of ["hook","rule","play","twist","reveal","mindBend"]) {
  assert(new Set(normal.map((r) => clean(r[key]).toLowerCase())).size === 725, `${key} must remain exact-unique`);
}
for (const n of [4,5,6]) {
  const owners = new Map();
  for (const r of normal) {
    for (const field of ["hook","rule","play","twist","reveal","mindBend"]) {
      for (const g of new Set(grams(r[field],n))) {
        if(!owners.has(g)) owners.set(g,new Set());
        owners.get(g).add(r.id);
      }
    }
  }
  const frequent=[...owners.entries()].filter(([,set])=>set.size>=5);
  assert(frequent.length===0, `${n}-word template phrase appears in 5+ rituals: ${frequent[0]?.[0] ?? "unknown"}`);
}
for (const key of ["hook","rule","twist"]) assertNoNearDuplicates(normal,key,0.85);

const badSurface = [
  "an not finished","a improving yourself","the cause just.","inside coherent","as the what you give up",
  "a about yourself","an meaning","idean","do not by itself mean","explain right how","right one",
  "right how","causeity","on purpose attending","before on purpose counting","without on purpose causing",
  "an on purpose","factsal","greater thought stuck focus","body body feeling","view view","ca check",
  "prepositive","meaning meaning","checking checking","like a flashback imagery","sensoryly",
  "shape-basedly","hard-to-stoply","staffing making","either or or","end bad idea button",
  "where apparent understanding","one right away sensed","spacely","unplannedly",
  "purely meaning","timely layered","personally standout","detectably different",
  "use swap specifically","act robustly","low-contrast fixation","effortfully captured",
  "acoustic-style memory",
  "create across two areas connection","approve ahead imperfection","immediate around you cue",
  "around you motor setup","an around you group","evidence against data",
  "right what", "what is yours to handle", "what must happen first", "before if it is liked",
  "about yourself learning", "across two areas structure", "noticing your noticing",
  "create across two areas", "one what must happen first", "a what is yours to handle"
];
const advanced = [
  "activation",
  "ambiguous",
  "amplification",
  "assumption",
  "asymmetric",
  "attribute",
  "atypicality",
  "authoritative",
  "bidirectional",
  "binary",
  "calibrated",
  "co-occurrence",
  "comprehension",
  "configuration",
  "connectivity",
  "contradiction",
  "contradictory",
  "correlation",
  "counterfactual",
  "dependencies",
  "desirability",
  "deterministic",
  "displacement",
  "distinctiveness",
  "distribution",
  "enumeration",
  "equilibrium",
  "experiential",
  "geometrically",
  "gradient",
  "grammatically",
  "hierarchical",
  "implication",
  "inference",
  "inferred",
  "intelligibility",
  "interpersonal",
  "interpretation",
  "jurisdiction",
  "maximizing",
  "metaphorically",
  "obtainability",
  "opacity",
  "percept",
  "perceptible",
  "perception",
  "percepts",
  "perpendicular",
  "portability",
  "probability",
  "pronunciation",
  "proportion",
  "prototype",
  "provisional",
  "recognisability",
  "recombination",
  "recoverability",
  "reference-class",
  "residue",
  "salience",
  "satisficing",
  "sentencehood",
  "serial",
  "solvability",
  "specialisation",
  "symmetry",
  "transitive",
  "validly",
  "visualisation",
  "compensatory",
  "plausibility",
  "declarative",
  "monitorable",
  "abstraction",
  "grammatical",
  "eligibility",
  "precommitted",
  "memorability",
  "interpretive",
  "conventional",
  "behavioural",
  "behavioral",
  "convergence",
  "ideation",
  "inversion",
  "stakeholder",
  "protocol",
  "nonverbal",
  "multimodal",
  "cognition",
  "aperture",
  "base-rate",
  "counter-position",
  "calibrate",
  "second-order",
  "model uniqueness",
  "self-location"
];
const allSurface = rituals.map((r)=>[r.displayName,...userFields.map((f)=>String(r[f]))].join("\n")).join("\n").toLowerCase();
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const bad of badSurface) assert(!allSurface.includes(bad.toLowerCase()), `Malformed surface phrase remains: ${bad}`);
assert(!/\brather tha\b/i.test(allSurface), "Malformed surface phrase remains: rather tha");
for (const term of advanced) assert(!(new RegExp(`\\b${escapeRe(term)}[a-z-]*\\b`,"i")).test(allSurface), `Advanced customer-facing term remains: ${term}`);
for (const r of rituals) {
  const longWord = (r.displayName.match(/[A-Za-z]+/g) ?? []).find((w)=>w.length>=11);
  assert(!longWord, `${r.id} visible title still uses an unnecessarily long word: ${longWord}`);
}

for (const [key, meta] of Object.entries(manifest.data)) {
  const file = path.basename(meta.versionedUrl);
  assert(hash(file) === meta.sha256, `Hash mismatch for ${key}`);
  const stable = file.replace(/\.v19\.4(?=\.json$)/, "");
  assert(fs.readFileSync(path.join(dataDir, stable)).equals(fs.readFileSync(path.join(dataDir, file))), `${key} stable/versioned files differ`);
}

const framerName = "ThinkStillUnifiedChat_v38.51.0_FINAL_RELEASE_14ROW_LANGUAGE_PATCH.txt";
const framerPath = path.join(here, framerName);
assert(fs.existsSync(framerPath), `Missing ${framerName}`);
const framer = fs.readFileSync(framerPath, "utf8");
const match = framer.match(/const EMBEDDED_RITUALS_GZIP_B64 = \[([\s\S]*?)\]\s*\.join\(""\)/);
assert(match, "Could not locate Framer embedded ritual payload");
const b64 = [...match[1].matchAll(/"([A-Za-z0-9+/=]+)"/g)].map((m)=>m[1]).join("");
const embedded = JSON.parse(zlib.gunzipSync(Buffer.from(b64,"base64")).toString("utf8"));
assert(embedded.rituals.length===750, "Framer embedded fallback must contain 750 rituals");
const byId = new Map(rituals.map((r)=>[r.id,r]));
for (const e of embedded.rituals) {
  const r=byId.get(e.id); assert(r, `Unknown embedded ritual ${e.id}`);
  assert(e.name===r.displayName, `${e.id} embedded title drift`);
  assert(e.goal===r.hook && e.rule===r.rule && e.play===r.play && e.twist===r.twist && e.win===r.reveal, `${e.id} embedded ritual surface drift`);
  assert(e.mindBend===r.mindBend && e.safety===r.safety, `${e.id} embedded ending/safety drift`);
  assert(Boolean(e.first_session_pick)===Boolean(r.firstSessionPick) && e.first_session_rank===r.firstSessionRank, `${e.id} embedded first-session drift`);
  assert(Boolean(e.support_first)===Boolean(r.supportFirst), `${e.id} embedded supportFirst drift`);
}

const smokeCount = runRoutingSmoke();
assert(smokeCount >= 14, "Routing smoke corpus did not run");

console.log("✓ ThinkStill v19.5 FINAL RELEASE 14-ROW LANGUAGE PATCH validation passed");
console.log(`  rituals: ${rituals.length} (725 normal + 25 SUPPORT FIRST)`);
console.log("  normal core fields: 725/725 exact-unique");
console.log("  split/repeated Mind Bend closures: 0");
console.log("  GOAL/RULE/TWIST near-duplicates at ≥0.85: 0");
console.log("  repeated 4–6 word blocks in 5+ rituals: 0");
console.log("  strict punctuation-token line cap: 12");
console.log("  slash shorthand in customer ritual fields: 0");
console.log("  write/draw/sketch requirements: 0");
console.log("  expanded v19.5 customer-language + corruption-pattern gate: 0 hits");
console.log("  Mind Bend insight punctuation defects: 0");
console.log("  embedded/external surface parity: 750/750");
console.log(`  routing regression cases: ${smokeCount}`);
