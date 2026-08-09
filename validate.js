const fs = require("fs");

const bubbles = ["glitch","drop","loopie","patch","rush","still","sync"];
const expected = {glitch:58, drop:57, loopie:57, patch:57, rush:57, still:57, sync:57};
let all = [];
let errors = [];

const val = (r,f) => String(r?.[f] ?? "").trim();
const unique = f => new Set(all.map(r => val(r,f))).size;
const counts = f => {
  const m = new Map();
  for (const r of all) {
    const k = val(r,f);
    m.set(k,(m.get(k)||0)+1);
  }
  return m;
};

for (const b of bubbles) {
  const fn = `${b}.json`;
  if (!fs.existsSync(fn)) { errors.push(`missing ${fn}`); continue; }
  const d = JSON.parse(fs.readFileSync(fn,"utf8"));
  if (d.version !== "TRUE_ONE_OF_ONE_LOCKED") errors.push(`${fn}: wrong version`);
  if (!Array.isArray(d.rituals)) errors.push(`${fn}: rituals array missing`);
  if (d.count !== expected[b]) errors.push(`${fn}: count ${d.count}, expected ${expected[b]}`);
  all = all.concat(d.rituals || []);
}

if (all.length !== 400) errors.push(`ritual count=${all.length}`);

for (const f of [
  "id","title","unique_game_move","friend_ritual","win_reward","formula_flow",
  "emotional_distress_cue","if_not_helpful",
  "breath_support_friend","mindfulness_support_friend","positive_psychology_friend",
  "contemplative_support_friend","friend_echo_affirmation","optional_friend_support_stack"
]) {
  if (unique(f) !== 400) errors.push(`${f}: unique=${unique(f)}, expected 400`);
}

const primary = counts("release_routing_trigger");
if (primary.size !== 22) errors.push(`release triggers=${primary.size}, expected 22`);
for (const [k,n] of primary) {
  if (n < 18 || n > 19) errors.push(`primary trigger "${k}"=${n}, expected 18–19`);
}

const eligible = new Map(primary);
for (const r of all) {
  const s = val(r,"secondary_routing_trigger");
  if (s) eligible.set(s,(eligible.get(s)||0)+1);
}
for (const [k,n] of eligible) {
  if (n !== 20) errors.push(`eligible trigger "${k}"=${n}, expected 20`);
}

const patterns = counts("release_routing_pattern");
if (patterns.size !== 63) errors.push(`release patterns=${patterns.size}, expected 63`);
for (const [k,n] of patterns) {
  if (n < 6 || n > 7) errors.push(`release pattern "${k}"=${n}, expected 6–7`);
}

for (const r of all) {
  for (const f of [
    "emotional_distress_cue","friend_ritual","win_reward","if_not_helpful",
    "breath_support_friend","mindfulness_support_friend","positive_psychology_friend",
    "contemplative_support_friend","friend_echo_affirmation","formula_flow","safety"
  ]) {
    if (!val(r,f)) errors.push(`${r.id}: missing ${f}`);
  }

  if (!r.consumer_rules || r.consumer_rules.render_internal_goal !== false) {
    errors.push(`${r.id}: internal goal render guard missing`);
  }
  if (r.consumer_rules?.render_goal_separately !== false) {
    errors.push(`${r.id}: separate Goal must stay disabled`);
  }
  if (!val(r,"friend_ritual").startsWith("THINKSTILL")) {
    errors.push(`${r.id}: Friend Ritual should begin THINKSTILL`);
  }
}

const manifest = JSON.parse(fs.readFileSync("manifest.json","utf8"));
if (manifest.version !== "TRUE_ONE_OF_ONE_LOCKED") errors.push("manifest version wrong");
if (manifest.row_count !== 400) errors.push("manifest row_count wrong");
if (manifest.routing?.user_facing_triggers !== 22) errors.push("manifest trigger count wrong");
if (manifest.routing?.precise_patterns !== 63) errors.push("manifest pattern count wrong");
if (manifest.consumer_display?.goal_rule?.includes("Do not render a separate Goal") !== true) {
  errors.push("manifest separate-goal render rule missing");
}

const ui = fs.readFileSync("ThinkStillUnifiedChat.tsx","utf8");
for (const marker of [
  "TRUE ONE-OF-ONE PRODUCT-READY LOCKED",
  "friend_ritual",
  "breath_support_friend",
  "mindfulness_support_friend",
  "positive_psychology_friend",
  "contemplative_support_friend",
  "friend_echo_affirmation",
  "FRIEND SUPPORT",
  "TRY ANOTHER RITUAL",
  "If this ritual doesn’t help",
  "Emotional distress ritual"
]) {
  if (!ui.includes(marker)) errors.push(`renderer missing marker: ${marker}`);
}

if (errors.length) {
  console.error("VALIDATION FAILED");
  errors.slice(0,200).forEach(e => console.error(" - " + e));
  process.exit(1);
}

console.log("VALIDATION PASSED — ThinkStill TRUE ONE-OF-ONE LOCKED");
console.log("400 rituals");
console.log("22 release triggers; exactly 20 eligible rituals per trigger");
console.log("63 release patterns; 6–7 rituals per pattern");
console.log("Bubble distribution: 58 / 57 / 57 / 57 / 57 / 57 / 57");
console.log("400/400 titles, game moves, Friend Rituals, WINs and Formula Flows unique");
console.log("400/400 distress cues and ask-another cues unique");
console.log("400/400 unique lines in all five Friend Support fields");
console.log("400/400 complete Friend Support stacks unique");
console.log("Internal Hook / Goal / Game Move protected from rendering");
console.log("Separate Goal rendering disabled");
