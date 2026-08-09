import fs from "node:fs"

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"))
const rituals = JSON.parse(fs.readFileSync(manifest.files.all, "utf8"))

const errors = []
const fail = msg => errors.push(msg)

if (rituals.length !== 400) fail(`Expected 400 rituals; got ${rituals.length}`)

const unique = (label, getter) => {
    const seen = new Map()
    for (const r of rituals) {
        const value = getter(r)
        if (seen.has(value)) fail(`${label} duplicate: ${r.id}/${seen.get(value)}`)
        else seen.set(value, r.id)
    }
}

unique("ID", r => r.id)
unique("Title", r => r.title)
unique("Goal + Steps", r => r["Goal + Steps"])
unique("Win", r => r.win)
unique("Formula Flow", r => r.formulaFlow)

for (const r of rituals) {
    if (!r.goal?.trim()) fail(`${r.id}: missing goal`)
    if (!Array.isArray(r.steps) || !r.steps.length) fail(`${r.id}: missing steps`)
    if (!r.win?.trim()) fail(`${r.id}: missing win`)
    if (!r.formulaFlow?.trim()) fail(`${r.id}: missing formula flow`)
    if (!r.safety?.trim()) fail(`${r.id}: missing safety`)
    if (!r.ritualText?.includes("GOAL")) fail(`${r.id}: ritualText missing GOAL`)
    if (!r.ritualText?.includes("WIN")) fail(`${r.id}: ritualText missing WIN`)
    if (!r.ritualText?.includes("FORMULA FLOW")) fail(`${r.id}: ritualText missing FORMULA FLOW`)
    if (!r["Goal + Steps"]?.includes("1.")) fail(`${r.id}: legacy Goal + Steps missing`)
}

if (errors.length) {
    console.error(errors.join("\n"))
    process.exit(1)
}

console.log("✅ ThinkStill v36.1 FULL-RITUAL compatibility validation passed")
console.log(`✅ ${rituals.length} rituals`)
console.log("✅ Every ritual has Goal + Steps + Win + Formula Flow + Safety")
console.log("✅ Top-level legacy aliases present for existing chatbot code")
