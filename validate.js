const fs = require('fs');
const path = require('path');
const root = __dirname;
const rituals = JSON.parse(fs.readFileSync(path.join(root,'rituals.json'),'utf8'));
const routing = JSON.parse(fs.readFileSync(path.join(root,'routing.json'),'utf8'));
const fail = [];
const ids = new Set(), titles = new Set(), bends = new Set(), tips = new Set();
for (const r of rituals) {
  if (!r.id || ids.has(r.id)) fail.push(`duplicate/missing id ${r.id}`); ids.add(r.id);
  if (!r.title || titles.has(r.title)) fail.push(`duplicate/missing title ${r.title}`); titles.add(r.title);
  if (!r.goal || !r.win || !r.formulaFlow || !r.safety) fail.push(`${r.id}: missing required display field`);
  if (!Array.isArray(r.steps) || r.steps.length < 2) fail.push(`${r.id}: fewer than 2 steps`);
  if (!Array.isArray(r.tips) || r.tips.length !== 5) fail.push(`${r.id}: tips != 5`);
  for (const t of r.tips || []) { if (tips.has(t)) fail.push(`${r.id}: repeated exact tip: ${t}`); tips.add(t); }
  if (!r.mindBend || bends.has(r.mindBend)) fail.push(`${r.id}: duplicate/missing Mind Bend`); bends.add(r.mindBend);
  if (/^\s*SAFETY\s*$/im.test(r.safety || '')) fail.push(`${r.id}: safety field contains duplicate SAFETY heading`);
}
if (rituals.length !== 750) fail.push(`ritual count ${rituals.length} != 750`);
if (routing.globalPoolSize !== 750) fail.push(`routing pool ${routing.globalPoolSize} != 750`);
const worlds = [...new Set(rituals.map(r=>r.world))];
const report = {
  version:'40.0', rituals:rituals.length, uniqueIds:ids.size, uniqueTitles:titles.size,
  uniqueTips:tips.size, uniqueMindBends:bends.size, worlds, specialists:new Set(rituals.map(r=>r.specialist)).size,
  tier3:rituals.filter(r=>r.safetyTier===3).length, failures:fail
};
console.log(JSON.stringify(report,null,2));
if (fail.length) process.exit(1);
