import fs from "node:fs";

const rituals = JSON.parse(fs.readFileSync(new URL("./rituals.json", import.meta.url), "utf8"));
const manifest = JSON.parse(fs.readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));

const expectedBubbles = new Set(["GLITCH", "DROP", "STILL", "PATCH", "LOOPIE", "RUSH", "SYNC"]);
const ids = new Set();
const titles = new Set();
const errors = [];

for (const [index, ritual] of rituals.entries()) {
  const label = ritual.id ?? `row-${index + 1}`;

  if (!/^T-\d{3}$/.test(ritual.id ?? "")) errors.push(`${label}: invalid id`);
  if (ids.has(ritual.id)) errors.push(`${label}: duplicate id`);
  if (titles.has(ritual.title)) errors.push(`${label}: duplicate title`);
  if (!expectedBubbles.has(ritual.bubble)) errors.push(`${label}: invalid bubble`);
  if (!ritual.play?.trim()) errors.push(`${label}: missing play text`);
  if (!ritual.safety?.trim()) errors.push(`${label}: missing safety`);
  if (!ritual.routing?.userFacingThinkingError) errors.push(`${label}: missing thinking error`);
  if (!ritual.routing?.preciseSubpattern) errors.push(`${label}: missing precise subpattern`);

  ids.add(ritual.id);
  titles.add(ritual.title);
}

if (rituals.length !== manifest.ritualCount) {
  errors.push(`manifest count ${manifest.ritualCount} does not match ${rituals.length}`);
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS: ${rituals.length} rituals, ${ids.size} unique IDs, ${titles.size} unique titles.`);
