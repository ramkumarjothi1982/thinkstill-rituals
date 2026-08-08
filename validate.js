
const fs = require("fs");
const bubbles = ["glitch","drop","loopie","patch","rush","still","sync"];
let all = [], errors = [];

function getSection(text, heading, nextHeadings=[]) {
  const marker = heading + "\n";
  const start = String(text || "").indexOf(marker);
  if (start < 0) return "";
  const rest = String(text || "").slice(start + marker.length);
  let end = rest.length;
  for (const h of nextHeadings) {
    const p = rest.indexOf("\n\n" + h + "\n");
    if (p >= 0 && p < end) end = p;
  }
  return rest.slice(0, end).trim();
}
function duplicateCount(values) {
  const m = new Map();
  for (const v0 of values) {
    const v = String(v0 || "").trim();
    if (!v) continue;
    m.set(v, (m.get(v) || 0) + 1);
  }
  return [...m.values()].filter(n => n > 1).length;
}

for (const b of bubbles) {
  const d = JSON.parse(fs.readFileSync(`${b}.json`, "utf8"));
  if (d.version !== "21.2") errors.push(`${b}: wrong version ${d.version}`);
  if (!Array.isArray(d.rituals)) errors.push(`${b}: rituals missing`);
  if (d.count !== d.rituals.length) errors.push(`${b}: count mismatch`);
  all = all.concat(d.rituals || []);
}

if (all.length !== 400) errors.push(`expected 400 rituals, got ${all.length}`);
if (new Set(all.map(r => r.id)).size !== 400) errors.push("ritual IDs not unique");
if (new Set(all.map(r => r.r)).size !== 400) errors.push("ritual numbers not unique");

for (const field of ["title","unique_game_move","potency_1","potency_2","potency_3","win_reward","formula_flow","safety"]) {
  const d = duplicateCount(all.map(r => r[field]));
  if (d) errors.push(`${field}: duplicate groups=${d}`);
}

const hooks = all.map(r => getSection(r.goal_why_game_move, "HOOK", ["MISSION","GAME MOVE"]));
const missions = all.map(r => getSection(r.goal_why_game_move, "MISSION", ["GAME MOVE"]));
const gameMoves = all.map(r => getSection(r.goal_why_game_move, "GAME MOVE", []));
if (new Set(hooks).size !== 400) errors.push(`hooks unique=${new Set(hooks).size}`);
if (new Set(missions).size !== 400) errors.push(`missions unique=${new Set(missions).size}`);
if (new Set(gameMoves).size !== 400) errors.push(`game moves unique=${new Set(gameMoves).size}`);
if (new Set(all.map(r => r.play_the_loop)).size !== 400) errors.push("How to Play blocks not unique");

let pairs = [];
for (const r of all) {
  const bullets = (String(r.potency_stack || "").match(/^• /gm) || []).length;
  if (bullets !== 3) errors.push(`${r.id}: expected 3 POWER-UP bullets, got ${bullets}`);
  if (!Array.isArray(r.potency_pairs) || r.potency_pairs.length !== 3) {
    errors.push(`${r.id}: potency_pairs missing`);
  } else {
    for (const p of r.potency_pairs) pairs.push([...p].sort().join(" + "));
  }
}
if (pairs.length !== 1200) errors.push(`potency pair count=${pairs.length}`);
if (new Set(pairs).size !== 1200) errors.push(`unique potency pairs=${new Set(pairs).size}`);

const expected = {glitch:58, drop:57, loopie:57, patch:57, rush:57, still:57, sync:57};
for (const b of bubbles) {
  const d = JSON.parse(fs.readFileSync(`${b}.json`, "utf8"));
  if (d.rituals.length !== expected[b]) errors.push(`${b}: expected ${expected[b]}, got ${d.rituals.length}`);
}

const manifest = JSON.parse(fs.readFileSync("manifest.json","utf8"));
if (manifest.version !== "21.2") errors.push(`manifest version=${manifest.version}`);
if (manifest.row_count !== 400) errors.push(`manifest row_count=${manifest.row_count}`);

if (errors.length) {
  console.error("VALIDATION FAILED");
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
}

console.log("VALIDATION PASSED — ThinkStill v21.2");
console.log("400 rituals");
console.log("400/400 titles, hooks, missions, game moves and How-to-Play blocks unique");
console.log("400/400 POWER-UP 1 unique");
console.log("400/400 POWER-UP 2 unique");
console.log("400/400 POWER-UP 3 unique");
console.log("400/400 core mechanisms unique");
console.log("1200/1200 technique-family pairs unique");
console.log("Bubble counts: GLITCH 58; all others 57");
