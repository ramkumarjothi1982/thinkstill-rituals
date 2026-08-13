import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root = new URL("./", import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL("manifest.json", root), "utf8"));
const component = await fs.readFile(new URL("ThinkStillUnifiedChat.tsx", root), "utf8");
const copyPasteComponent = await fs.readFile(new URL("ThinkStillUnifiedChat_COPY_PASTE.txt", root), "utf8");
const sourceProof = await fs.readFile(new URL("SOURCE_MASTER_SHA256.txt", root), "utf8");
const ids = new Set();
const all = [];

function parseLikeFramer(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed = { title: lines.shift() || "", goal: "", steps: [], win: "", tips: [], mindBend: "", flow: "", safety: [] };
  let section = "";
  for (const original of lines) {
    const line = original.trim();
    if (line === "PLAY TIME") { section = "time"; continue; }
    if (line === "GOAL") { section = "goal"; continue; }
    if (line === "WIN") { section = "win"; continue; }
    if (line === "TIPS") { section = "tips"; continue; }
    if (line === "MIND BEND") { section = "mind"; continue; }
    if (line === "FORMULA FLOW") { section = "flow"; continue; }
    if (line === "SAFETY" || line === "PAUSE") { section = "safety"; parsed.safety.push(line); continue; }
    const step = line.match(/^\d+\.\s+(.{1,52}?)\s+[—–-]\s+(.+)$/);
    if (step) { parsed.steps.push({ action: step[1], detail: step[2] }); section = "steps"; continue; }
    if (section === "time") { section = ""; continue; }
    if (section === "goal") { parsed.goal ||= line; continue; }
    if (section === "win") { parsed.win = parsed.win ? `${parsed.win} ${line}` : line; continue; }
    if (section === "tips") { parsed.tips.push(line.replace(/^•\s*/, "")); continue; }
    if (section === "mind") { parsed.mindBend = parsed.mindBend ? `${parsed.mindBend} ${line}` : line; continue; }
    if (section === "flow") { parsed.flow = parsed.flow ? `${parsed.flow} ${line}` : line; continue; }
    if (section === "safety") { parsed.safety.push(line); }
  }
  return parsed;
}

assert.equal(manifest.schema, "thinkstill-manifest-v40.6");
assert.equal(manifest.version, "v40.6");
assert.equal(manifest.row_count, 750, "manifest row_count must be 750");
assert.equal(manifest.bubbles.length, 7, "manifest must list seven bubbles");
assert.equal(
  manifest.base_url,
  "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/",
  "manifest must load ritual parts from the GitHub repository root"
);
assert.match(manifest.source_sha256, /^[a-f0-9]{64}$/);
assert.ok(sourceProof.includes(manifest.source_sha256), "source checksum proof must match the manifest");

for (const bubble of manifest.bubbles) {
  assert.ok(bubble.parts?.length, `${bubble.bubble} has no part file`);
  let bubbleRows = 0;
  for (const part of bubble.parts) {
    const file = new URL(part.filename, root);
    const stat = await fs.stat(file);
    assert.ok(stat.size < 25_000_000, `${part.filename} exceeds 25 MB`);
    const payload = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(payload.schema, "thinkstill-framer-ritual-part-v40.6");
    assert.equal(payload.version, "v40.6");
    assert.equal(payload.bubble, bubble.bubble, `${part.filename} bubble mismatch`);
    assert.equal(payload.row_count, payload.rituals.length, `${part.filename} payload count mismatch`);
    assert.equal(payload.rituals.length, part.rows, `${part.filename} manifest count mismatch`);
    bubbleRows += payload.rituals.length;
    for (const ritual of payload.rituals) {
      assert.ok(!ids.has(ritual.id), `duplicate ID ${ritual.id}`);
      ids.add(ritual.id);
      all.push(ritual);
      for (const field of ["name", "goal", "steps", "win", "tips", "mindBend", "formulaFlow", "safety", "ritualText"]) {
        assert.ok(String(ritual[field] || "").trim(), `${ritual.id} missing ${field}`);
      }
      assert.equal((ritual.tips.match(/^•/gm) || []).length, 5, `${ritual.id} must show five tips`);
      assert.equal((ritual.ritualText.match(/^WIN$/gm) || []).length, 1, `${ritual.id} must contain one WIN marker`);
      assert.equal((ritual.ritualText.match(/^SAFETY$/gm) || []).length, 1, `${ritual.id} must contain one SAFETY marker`);
      const order = ["PLAY TIME", "GOAL", "WIN", "TIPS", "MIND BEND", "FORMULA FLOW", "SAFETY"].map((label) => ritual.ritualText.indexOf(`\n\n${label}\n\n`));
      assert.ok(order.every((index) => index >= 0), `${ritual.id} missing a visible section`);
      assert.deepEqual(order, [...order].sort((a, b) => a - b), `${ritual.id} section order is broken`);
      const rendered = parseLikeFramer(ritual.ritualText);
      assert.ok(rendered.title && rendered.title !== "Ritual Unlocked", `${ritual.id} title would be empty`);
      assert.ok(rendered.goal, `${ritual.id} goal would be empty`);
      assert.ok(rendered.steps.length >= 2, `${ritual.id} steps would not parse`);
      assert.ok(rendered.steps.every((step) => step.action && step.detail), `${ritual.id} has an empty step`);
      assert.ok(rendered.win, `${ritual.id} WIN would be empty`);
      assert.equal(rendered.tips.length, 5, `${ritual.id} five tips would not display`);
      assert.ok(rendered.mindBend, `${ritual.id} Mind Bend would be empty`);
      assert.ok(rendered.flow, `${ritual.id} Formula Flow would be empty`);
      assert.ok(rendered.safety.some((line) => line === "PAUSE"), `${ritual.id} PAUSE would be empty`);
    }
  }
  assert.equal(bubbleRows, bubble.count, `${bubble.bubble} total does not match manifest count`);
}

assert.equal(all.length, 750, "part files must contain 750 rituals");
assert.equal(ids.size, 750, "all ritual IDs must be unique");
for (const field of ["name", "goal", "steps", "win", "tips", "mindBend", "formulaFlow", "ritualText"]) {
  assert.equal(new Set(all.map((ritual) => ritual[field])).size, 750, `${field} blocks must be unique across all 750 rituals`);
}

const pulse = all.find((ritual) => ritual.id === "TS-698");
assert.ok(pulse, "TS-698 must be present");
assert.equal(pulse.name, "THE PULSE GETS ONE VOTE");
assert.equal((pulse.steps.match(/^\d+\.\s+/gm) || []).length, 5, "TS-698 must have five simple actions");
assert.doesNotMatch(pulse.steps, /steady pulse/i, "TS-698 must not repeat the old steady-pulse wording");

const panicMatches = all.filter((ritual) => /panic|body alarm|grounding/i.test([
  ritual.thinking_error,
  ritual.precise_subpattern,
  ritual.primary_trigger,
  ritual.keywords?.join(" "),
].join(" ")));
assert.ok(panicMatches.length > 0, "panic must match at least one complete ritual");
assert.ok(panicMatches.every((ritual) => ritual.steps && ritual.win && ritual.safety), "panic pool contains an incomplete ritual");

assert.match(component, /ThinkStill — Unified Chat \(v40\.6 · 750 COMPLETE RITUALS/);
assert.match(component, /const DEFAULT_MANIFEST_URL\s*=\s*\n\s*"https:\/\/raw\.githubusercontent\.com\/ramkumarjothi1982\/thinkstill-rituals\/main\/manifest\.json"/);
assert.match(component, /const ROUTER_VERSION = "v406_750"/);
assert.match(component, /A relative base_url belongs to the manifest's GitHub folder/);
assert.doesNotMatch(component, /v40\.5\.3|v4053_750/);
assert.doesNotMatch(component, /setCurrentText\(fallbackText\)/);
assert.match(component, /setViewMode\("prompt"\)/);
assert.equal(copyPasteComponent, component, "copy/paste text must match the TSX component");

console.log(`PASS — ${all.length} complete v40.6 rituals, ${manifest.bubbles.length} bubbles, panic pool ${panicMatches.length}, corrected GitHub loader, no empty-card fallback.`);
