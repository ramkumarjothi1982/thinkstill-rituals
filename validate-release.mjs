import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const manifest = read("thinkstill-manifest.json");
const modes = read("thinkstill-modes.json");

let rituals = [];
for (const bubble of manifest.bubbles) {
  for (const part of bubble.parts) {
    const data = read(part.filename);
    if (!Array.isArray(data.rituals)) throw new Error(`${part.filename}: rituals[] missing`);
    if (data.rituals.length !== part.rows) throw new Error(`${part.filename}: row count mismatch`);
    rituals.push(...data.rituals);
  }
}
const ids = rituals.map(r => r.id);
const unique = new Set(ids);
if (rituals.length !== 1000) throw new Error(`Expected 1000 rituals, got ${rituals.length}`);
if (unique.size !== 1000) throw new Error(`Expected 1000 unique IDs, got ${unique.size}`);
if (!Array.isArray(modes.modes) || modes.modes.length !== 3000) throw new Error(`Expected 3000 modes`);
for (const id of unique) {
  const n = modes.modes.filter(m => m.id === id).length;
  if (n !== 3) throw new Error(`${id}: expected 3 modes, got ${n}`);
}
const expected = {GLITCH:150,DROP:150,STILL:150,PATCH:150,LOOPIE:150,RUSH:150,SYNC:100};
for (const [bubble,count] of Object.entries(expected)) {
  const n = rituals.filter(r => r.bubble === bubble).length;
  if (n !== count) throw new Error(`${bubble}: expected ${count}, got ${n}`);
}
console.log("PASS — 1000 rituals, 3000 mode records, all bubble counts and IDs valid.");
