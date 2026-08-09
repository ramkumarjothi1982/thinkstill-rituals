const fs = require("fs");

const bubbles = ["glitch","drop","loopie","patch","rush","still","sync"];
const expected = {glitch:58, drop:57, loopie:57, patch:57, rush:57, still:57, sync:57};
let all = [];
let errors = [];

const value = (r, f) => String(r?.[f] ?? "").trim();
const unique = (f) => new Set(all.map(r => value(r, f))).size;
const countBy = (field) => {
  const m = new Map();
  for (const r of all) {
    const k = value(r, field);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
};

for (const b of bubbles) {
  const fn = `${b}.json`;
  if (!fs.existsSync(fn)) {
    errors.push(`missing ${fn}`);
    continue;
  }
  const d = JSON.parse(fs.readFileSync(fn, "utf8"));
  if (d.version !== "FINAL") errors.push(`${fn}: version=${d.version}`);
  if (!Array.isArray(d.rituals)) errors.push(`${fn}: rituals array missing`);
  if (d.count !== expected[b]) errors.push(`${fn}: count ${d.count}, expected ${expected[b]}`);
  all = all.concat(d.rituals || []);
}

if (all.length !== 400) errors.push(`ritual count=${all.length}`);
for (const field of [
  "id","r","title","unique_game_move","play_the_loop","win_reward","formula_flow",
  "emotional_distress_cue","if_not_helpful","breathwork_support","mindfulness_support",
  "positive_psychology_support","spirituality_support","affirmation_support","support_stack"
]) {
  if (unique(field) !== 400) errors.push(`${field}: unique=${unique(field)}, expected 400`);
}

const primary = countBy("release_routing_trigger");
if (primary.size !== 22) errors.push(`release triggers=${primary.size}, expected 22`);
for (const [k,n] of primary) {
  if (n < 18 || n > 19) errors.push(`primary trigger "${k}"=${n}, expected 18–19`);
}

const eligible = new Map(primary);
for (const r of all) {
  const s = value(r, "secondary_routing_trigger");
  if (s) eligible.set(s, (eligible.get(s) || 0) + 1);
}
for (const [k,n] of eligible) {
  if (n !== 20) errors.push(`eligible trigger "${k}"=${n}, expected 20`);
}

const patterns = countBy("release_routing_pattern");
if (patterns.size !== 63) errors.push(`release patterns=${patterns.size}, expected 63`);
for (const [k,n] of patterns) {
  if (n < 6 || n > 7) errors.push(`release pattern "${k}"=${n}, expected 6–7`);
}

for (const r of all) {
  if (!value(r,"goal_why_game_move").startsWith("MISSION\n")) {
    errors.push(`${r.id}: consumer goal must begin MISSION`);
  }
  if (!value(r,"play_the_loop").includes("⚡ FINISH")) {
    errors.push(`${r.id}: FINISH line missing`);
  }
  if (!value(r,"safety").includes("This is a self-help exercise")) {
    errors.push(`${r.id}: standard safety disclaimer missing`);
  }
  if (!r.consumer_rules || r.consumer_rules.render_internal_goal !== false) {
    errors.push(`${r.id}: internal-goal render guard missing`);
  }
  for (const f of [
    "emotional_distress_cue","if_not_helpful","breathwork_support","mindfulness_support",
    "positive_psychology_support","spirituality_support","affirmation_support"
  ]) {
    if (!value(r,f)) errors.push(`${r.id}: missing ${f}`);
  }
}

const t316 = all.find(r => r.id === "T-316");
if (!t316) {
  errors.push("T-316 missing");
} else if (/when\s+WHEN DOES THIS INFORMATION EXPIRE/i.test(value(t316,"emotional_distress_cue"))) {
  errors.push("T-316 connector/title collision returned");
}

const manifest = JSON.parse(fs.readFileSync("manifest.json","utf8"));
if (manifest.version !== "FINAL") errors.push(`manifest version=${manifest.version}`);
if (manifest.row_count !== 400) errors.push(`manifest row_count=${manifest.row_count}`);
if (manifest.routing?.user_facing_triggers !== 22) errors.push("manifest trigger count must be 22");
if (manifest.routing?.precise_patterns !== 63) errors.push("manifest pattern count must be 63");

const ui = fs.readFileSync("ThinkStillUnifiedChat.tsx","utf8");
for (const required of [
  "FINAL PRODUCT-READY MASTER",
  "emotional_distress_cue",
  "breathwork_support",
  "mindfulness_support",
  "positive_psychology_support",
  "spirituality_support",
  "affirmation_support",
  "TRY ANOTHER RITUAL",
  "SUPPORT STACK",
  "If this ritual doesn’t help",
  "Emotional distress ritual"
]) {
  if (!ui.includes(required)) errors.push(`renderer missing marker: ${required}`);
}

if (/\bGuided reset\b/.test(ui) || /\bMind Reset\b/.test(ui)) {
  errors.push("old Mind Reset / Guided reset consumer wording remains in renderer");
}

if (errors.length) {
  console.error("VALIDATION FAILED");
  errors.slice(0, 150).forEach(e => console.error(" - " + e));
  process.exit(1);
}

console.log("VALIDATION PASSED — ThinkStill 400 FINAL PRODUCT-READY");
console.log("400 rituals");
console.log("22 release trigger families; exactly 20 eligible rituals per trigger");
console.log("63 release patterns; 6–7 rituals per pattern");
console.log("Bubble distribution: 58 / 57 / 57 / 57 / 57 / 57 / 57");
console.log("400/400 titles, mechanisms, ritual bodies, Wins and Formula Flows unique");
console.log("400/400 distress cues and ask-another cues unique");
console.log("400/400 lines unique in each of the five support categories");
console.log("400/400 complete five-support stacks unique");
console.log("Internal Hook / Goal / Game Move protected from rendering");
console.log("T-316 connector/title collision fixed");
