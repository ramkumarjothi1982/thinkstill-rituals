import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root = new URL("./", import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL("manifest.json", root), "utf8"));
const component = await fs.readFile(new URL("ThinkStillUnifiedChat.tsx", root), "utf8");
const copyPasteComponent = await fs.readFile(new URL("ThinkStillUnifiedChat_COPY_PASTE.txt", root), "utf8");
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

assert.equal(manifest.row_count, 750, "manifest row_count must be 750");
assert.equal(manifest.bubbles.length, 7, "manifest must list seven bubbles");

for (const bubble of manifest.bubbles) {
  assert.ok(bubble.parts?.length, `${bubble.bubble} has no part file`);
  for (const part of bubble.parts) {
    const file = new URL(part.filename, root);
    const stat = await fs.stat(file);
    assert.ok(stat.size < 25_000_000, `${part.filename} exceeds 25 MB`);
    const payload = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(payload.bubble, bubble.bubble, `${part.filename} bubble mismatch`);
    assert.equal(payload.rituals.length, part.rows, `${part.filename} row mismatch`);
    for (const ritual of payload.rituals) {
      assert.ok(!ids.has(ritual.id), `duplicate ID ${ritual.id}`);
      ids.add(ritual.id);
      all.push(ritual);
      for (const field of ["name", "goal", "steps", "win", "tips", "mindBend", "formulaFlow", "safety", "ritualText"]) {
        assert.ok(String(ritual[field] || "").trim(), `${ritual.id} missing ${field}`);
      }
      assert.equal((ritual.tips.match(/^•/gm) || []).length, 5, `${ritual.id} must show five tips`);
      assert.equal((ritual.ritualText.match(/^SAFETY$/gm) || []).length, 1, `${ritual.id} must contain one SAFETY marker`);
      const order = ["PLAY TIME", "GOAL", "WIN", "TIPS", "MIND BEND", "FORMULA FLOW", "SAFETY"].map((label) => ritual.ritualText.indexOf(`\n\n${label}\n\n`));
      assert.ok(order.every((index) => index >= 0), `${ritual.id} missing a visible section`);
      assert.deepEqual(order, [...order].sort((a, b) => a - b), `${ritual.id} section order is broken`);
      const rendered = parseLikeFramer(ritual.ritualText);
      assert.ok(rendered.title && rendered.title !== "Ritual Unlocked", `${ritual.id} title would be empty`);
      assert.ok(rendered.goal, `${ritual.id} goal would be empty`);
      assert.ok(rendered.steps.length >= 2, `${ritual.id} steps would not parse`);
      assert.ok(rendered.win, `${ritual.id} WIN would be empty`);
      assert.equal(rendered.tips.length, 5, `${ritual.id} five tips would not display`);
      assert.ok(rendered.mindBend, `${ritual.id} Mind Bend would be empty`);
      assert.ok(rendered.flow, `${ritual.id} Formula Flow would be empty`);
      assert.ok(rendered.safety.some((line) => line === "PAUSE"), `${ritual.id} PAUSE would be empty`);
    }
  }
}

assert.equal(all.length, 750, "part files must contain 750 rituals");
assert.equal(ids.size, 750, "all ritual IDs must be unique");

const panicMatches = all.filter((ritual) => /panic|body alarm|grounding/i.test([
  ritual.thinking_error,
  ritual.precise_subpattern,
  ritual.primary_trigger,
  ritual.keywords?.join(" "),
].join(" ")));
assert.ok(panicMatches.length > 0, "panic must match at least one complete ritual");
assert.ok(panicMatches.every((ritual) => ritual.steps && ritual.win && ritual.safety), "panic pool contains an incomplete ritual");

assert.match(component, /const DEFAULT_MANIFEST_URL\s*=\s*\n\s*"https:\/\/raw\.githubusercontent\.com\/rankumarjothi1982\/thinkstill-rituals\/main\/manifest\.json"/);
assert.match(component, /const ROUTER_VERSION = "v4053_750"/);
assert.doesNotMatch(component, /setCurrentText\(fallbackText\)/);
assert.match(component, /setViewMode\("prompt"\)/);
assert.equal(copyPasteComponent, component, "copy/paste text must match the TSX component");

console.log(`PASS — ${all.length} complete rituals, ${manifest.bubbles.length} bubbles, panic pool ${panicMatches.length}, no empty-card fallback.`);
