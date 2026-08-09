
const fs = require("fs");
const bubbles = ["glitch","drop","loopie","patch","rush","still","sync"];
const expected = {glitch:58, drop:57, loopie:57, patch:57, rush:57, still:57, sync:57};
let all = [], errors = [];

for (const b of bubbles) {
  const fn = `${b}.json`;
  if (!fs.existsSync(fn)) { errors.push(`missing ${fn}`); continue; }
  const d = JSON.parse(fs.readFileSync(fn, "utf8"));
  if (d.version !== "36.0") errors.push(`${fn}: version ${d.version}`);
  if (!Array.isArray(d.rituals)) errors.push(`${fn}: rituals missing`);
  if (d.count !== expected[b]) errors.push(`${fn}: expected ${expected[b]}, got ${d.count}`);
  all = all.concat(d.rituals || []);
}

function unique(field) {
  return new Set(all.map(r => String(r[field] ?? "").trim())).size;
}

if (all.length !== 400) errors.push(`total rituals ${all.length}`);
if (unique("id") !== 400) errors.push(`IDs unique ${unique("id")}`);
if (unique("r") !== 400) errors.push(`ritual numbers unique ${unique("r")}`);
if (unique("title") !== 400) errors.push(`titles unique ${unique("title")}`);
if (unique("unique_game_move") !== 400) errors.push(`internal game moves unique ${unique("unique_game_move")}`);
if (unique("play_the_loop") !== 400) errors.push(`numbered rituals unique ${unique("play_the_loop")}`);
if (unique("win_reward") !== 400) errors.push(`Win unique ${unique("win_reward")}`);
if (unique("formula_flow") !== 400) errors.push(`Formula Flow unique ${unique("formula_flow")}`);
if (unique("safety") !== 400) errors.push(`Safety unique ${unique("safety")}`);

const triggers = new Set(all.map(r => String(r.thinking_error || "").trim()));
const patterns = new Set(all.map(r => String(r.precise_subpattern || "").trim()));
if (triggers.size !== 22) errors.push(`triggers ${triggers.size}, expected 22`);
if (patterns.size !== 63) errors.push(`patterns ${patterns.size}, expected 63`);

for (const r of all) {
  if (!String(r.goal_why_game_move || "").startsWith("MISSION\n"))
    errors.push(`${r.id}: goal section malformed`);

  if (/HOOK\n|GAME MOVE\n/i.test(String(r.goal_why_game_move || "")))
    errors.push(`${r.id}: internal Hook/Game Move leaked into rendered goal`);

  if (r.potency_stack || r.potency_1 || r.potency_2 || r.potency_3)
    errors.push(`${r.id}: separate Power-Up field present in v36`);

  if (!r.consumer_rules || r.consumer_rules.render_separate_power_up !== false)
    errors.push(`${r.id}: consumer rules missing`);

  const numbered = (String(r.play_the_loop || "").match(/^\d+\./gm) || []).length;
  if (numbered < 2) errors.push(`${r.id}: fewer than 2 numbered ritual steps (${numbered})`);

  if (!String(r.play_the_loop || "").includes("⚡ FINISH"))
    errors.push(`${r.id}: finish line missing`);
}

const manifest = JSON.parse(fs.readFileSync("manifest.json","utf8"));
if (manifest.version !== "36.0") errors.push(`manifest version ${manifest.version}`);
if (manifest.row_count !== 400) errors.push(`manifest row_count ${manifest.row_count}`);

const ui = fs.readFileSync("ThinkStillUnifiedChat.tsx","utf8");
if (!ui.includes("v36 FINAL CLEAN CONSUMER RENDERER"))
  errors.push("renderer is not v36 final");
if (!ui.includes("ritual.formulaFlow"))
  errors.push("renderer does not render Formula Flow");
if (!ui.includes("ritual.safety"))
  errors.push("renderer does not render Safety");

if (errors.length) {
  console.error("VALIDATION FAILED");
  errors.slice(0,100).forEach(e => console.error(" - " + e));
  process.exit(1);
}

console.log("VALIDATION PASSED — ThinkStill v36");
console.log("400 rituals");
console.log("22 triggers / 63 precise patterns");
console.log("400/400 titles unique");
console.log("400/400 internal Game Moves unique");
console.log("400/400 numbered rituals unique");
console.log("400/400 Win lines unique");
console.log("400/400 Formula Flows unique");
console.log("400/400 Safety blocks unique");
console.log("Consumer render: Title → Goal → Ritual → Win → Formula Flow → Safety");
console.log("Hook/Game Move internal only");
console.log("Potency integrated in steps; no separate Power-Up");
