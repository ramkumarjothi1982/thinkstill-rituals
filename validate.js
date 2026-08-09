
const fs = require("fs");

const bubbles = ["glitch","drop","loopie","patch","rush","still","sync"];
const expected = {glitch:58, drop:57, loopie:57, patch:57, rush:57, still:57, sync:57};
let all = [];
let errors = [];

for (const b of bubbles) {
  const fn = `${b}.json`;
  if (!fs.existsSync(fn)) {
    errors.push(`missing ${fn}`);
    continue;
  }
  const d = JSON.parse(fs.readFileSync(fn, "utf8"));
  if (d.version !== "37.2") errors.push(`${fn}: version=${d.version}`);
  if (!Array.isArray(d.rituals)) errors.push(`${fn}: rituals array missing`);
  if (d.count !== expected[b]) errors.push(`${fn}: count ${d.count}, expected ${expected[b]}`);
  all = all.concat(d.rituals || []);
}

const value = (r, f) => String(r[f] ?? "").trim();
const unique = f => new Set(all.map(r => value(r, f))).size;

if (all.length !== 400) errors.push(`ritual count=${all.length}`);
if (unique("id") !== 400) errors.push(`unique IDs=${unique("id")}`);
if (unique("r") !== 400) errors.push(`unique ritual numbers=${unique("r")}`);
if (unique("title") !== 400) errors.push(`unique titles=${unique("title")}`);
if (unique("unique_game_move") !== 400) errors.push(`unique internal mechanisms=${unique("unique_game_move")}`);
if (unique("play_the_loop") !== 400) errors.push(`unique ritual bodies=${unique("play_the_loop")}`);
if (unique("win_reward") !== 400) errors.push(`unique Win blocks=${unique("win_reward")}`);
if (unique("formula_flow") !== 400) errors.push(`unique Formula Flows=${unique("formula_flow")}`);
if (unique("safety") !== 400) errors.push(`unique Safety blocks=${unique("safety")}`);

const triggers = new Set(all.map(r => value(r, "thinking_error")));
const patterns = new Set(all.map(r => value(r, "precise_subpattern")));
if (triggers.size !== 22) errors.push(`trigger families=${triggers.size}, expected 22`);
if (patterns.size !== 63) errors.push(`precise patterns=${patterns.size}, expected 63`);

let consumer = "";

for (const r of all) {
  if (!value(r, "goal_why_game_move").startsWith("MISSION\n")) {
    errors.push(`${r.id}: malformed goal section`);
  }

  if (/HOOK\n|GAME MOVE\n/i.test(value(r, "goal_why_game_move"))) {
    errors.push(`${r.id}: internal Hook/Game Move leaked into user goal`);
  }

  if (r.potency_stack || r.potency_1 || r.potency_2 || r.potency_3) {
    errors.push(`${r.id}: legacy separate Power-Up field found`);
  }

  if (!r.consumer_rules || r.consumer_rules.render_separate_power_up !== false) {
    errors.push(`${r.id}: v37.2 consumer rules missing`);
  }

  const body = value(r, "play_the_loop");
  const numbered = (body.match(/^\d+\./gm) || []).length;
  if (numbered < 2) errors.push(`${r.id}: too few numbered steps (${numbered})`);
  if (!body.includes("⚡ FINISH")) errors.push(`${r.id}: FINISH line missing`);

  consumer += "\n" + body;
}

// User specifically requested these phrases/tags be absent from the consumer ritual.
if (/\bPreview After\b/i.test(consumer)) {
  errors.push("consumer ritual copy still contains 'Preview After'");
}
if (/\bnext action\b/i.test(consumer)) {
  errors.push("consumer ritual copy still contains generic 'next action'");
}

const oldTags = [
  "soften shoulders","press feet","feel support","move slowly","loosen hands",
  "widen gaze","hear sound","breathe naturally","notice detail","pick action",
  "name sensation","allow opposite","split duty","name feeling","find evidence",
  "challenge answer","estimate odds","add counterfact","camera check",
  "split forecast","plain wording","name event","next action"
];
for (const tag of oldTags) {
  const re = new RegExp("—\\s*" + tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
  if (re.test(consumer)) errors.push(`old shorthand power tag remains: ${tag}`);
}

const manifest = JSON.parse(fs.readFileSync("manifest.json","utf8"));
if (manifest.version !== "37.2") errors.push(`manifest version=${manifest.version}`);
if (manifest.row_count !== 400) errors.push(`manifest row_count=${manifest.row_count}`);

const ui = fs.readFileSync("ThinkStillUnifiedChat.tsx","utf8");
if (!ui.includes("v37.2 EASY INTEGRATED ZERO-REPEAT FINAL")) {
  errors.push("renderer is not marked v37.2 final");
}
if (!ui.includes("ritual.formulaFlow")) {
  errors.push("renderer does not render Formula Flow");
}
if (!ui.includes("ritual.safety")) {
  errors.push("renderer does not render Safety");
}

if (errors.length) {
  console.error("VALIDATION FAILED");
  errors.slice(0, 100).forEach(e => console.error(" - " + e));
  process.exit(1);
}

console.log("VALIDATION PASSED — ThinkStill v37.2");
console.log("400 rituals");
console.log("22 trigger families / 63 precise patterns");
console.log("400/400 titles unique");
console.log("400/400 core mechanisms unique");
console.log("400/400 ritual bodies unique");
console.log("400/400 Win blocks unique");
console.log("400/400 Formula Flows unique");
console.log("400/400 Safety blocks unique");
console.log("0 Preview After phrases");
console.log("0 generic next action phrases");
console.log("0 old shorthand power tags");
console.log("Power moves integrated inside ritual steps; no separate Power-Up");
