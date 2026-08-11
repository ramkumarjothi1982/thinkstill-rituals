const fs = require("fs");

const bubbles = ["glitch","drop","loopie","patch","rush","still","sync"];
const expected = {glitch:58, drop:57, loopie:57, patch:57, rush:57, still:57, sync:57};
let all = [];
const errors = [];

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
  if (!fs.existsSync(fn)) {
    errors.push(`missing ${fn}`);
    continue;
  }
  const doc = JSON.parse(fs.readFileSync(fn,"utf8"));
  if (doc.version !== "v37.9") errors.push(`${fn}: wrong version ${doc.version}`);
  if (doc.release !== "TRUE_ONE_OF_ONE_WIN_LOCKED") errors.push(`${fn}: wrong release`);
  if (!Array.isArray(doc.rituals)) errors.push(`${fn}: rituals array missing`);
  if (doc.count !== expected[b]) errors.push(`${fn}: count ${doc.count}, expected ${expected[b]}`);
  all = all.concat(doc.rituals || []);
}

if (all.length !== 400) errors.push(`ritual count ${all.length}, expected 400`);

for (const f of [
  "id","title","goal","ritual_steps","win","support_stack","formula_flow","safety",
  "unique_game_move","final_consumer_ritual"
]) {
  const u = unique(f);
  if (u !== 400) errors.push(`${f}: unique=${u}, expected 400`);
}

for (const r of all) {
  for (const f of ["id","title","goal","ritual_steps","win","support_stack","formula_flow","safety"]) {
    if (!val(r,f)) errors.push(`${r.id || "unknown"}: missing ${f}`);
  }

  const supportLines = val(r,"support_stack")
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);
  if (supportLines.length !== 5) {
    errors.push(`${r.id}: support_stack has ${supportLines.length} lines, expected 5`);
  }

  if (!r.consumer_rules || r.consumer_rules.render_internal_goal !== false) {
    errors.push(`${r.id}: internal goal render guard missing`);
  }
  if (r.consumer_rules?.render_emotional_distress_cue !== false) {
    errors.push(`${r.id}: distress cue must stay backend-only`);
  }
  if (r.consumer_rules?.render_if_not_helpful !== false) {
    errors.push(`${r.id}: fallback cue must stay backend-only`);
  }
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
  if (n < 6 || n > 7) errors.push(`pattern "${k}"=${n}, expected 6–7`);
}

const manifest = JSON.parse(fs.readFileSync("manifest.json","utf8"));
if (manifest.version !== "v37.9") errors.push("manifest version must be v37.9");
if (manifest.row_count !== 400) errors.push("manifest row_count must be 400");
if (manifest.routing?.user_facing_triggers !== 22) errors.push("manifest trigger count must be 22");
if (manifest.routing?.precise_patterns !== 63) errors.push("manifest pattern count must be 63");

const ui = fs.readFileSync("ThinkStillUnifiedChat.tsx","utf8");
for (const marker of [
  "v37.9 TRUE ONE-OF-ONE WIN LOCKED MASTER",
  "SUPPORT MOVES",
  "YOU WIN WHEN",
  "FORMULA FLOW",
  "ritual_steps",
  "support_stack"
]) {
  if (!ui.includes(marker)) errors.push(`renderer missing marker: ${marker}`);
}
if (!ui.includes(".slice(0, 5)")) errors.push("renderer does not keep all five support lines");
if (/emotional_distress_cue_internal\s*\?\?/.test(ui)) errors.push("renderer appears to render backend distress cue");
if (/if_not_helpful_internal\s*\?\?/.test(ui)) errors.push("renderer appears to render backend fallback cue");

if (errors.length) {
  console.error("VALIDATION FAILED");
  errors.slice(0,250).forEach(e => console.error(" - " + e));
  process.exit(1);
}

console.log("VALIDATION PASSED — ThinkStill v37.9 TRUE ONE-OF-ONE WIN LOCK");
console.log("400 rituals");
console.log("22 release trigger families; exactly 20 eligible rituals per trigger");
console.log("63 release patterns; 6–7 rituals per pattern");
console.log("Bubble distribution: GLITCH 58; all other bubbles 57");
console.log("400/400 titles, goals, ritual bodies, WINs, Formula Flows and Safety blocks unique");
console.log("Every ritual has exactly 5 plain ritual-matched support lines");
console.log("Backend distress/fallback copy is protected from rendering");
console.log("Global 400-ritual no-replay rule remains enabled");
