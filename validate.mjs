import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"))
const manifest = read("manifest.json")
const rituals = read(manifest.files.all)

const fail = (msg) => {
    console.error(`❌ ${msg}`)
    process.exitCode = 1
}

const unique = (label, getter) => {
    const seen = new Map()
    for (const r of rituals) {
        const value = getter(r)
        if (seen.has(value)) {
            fail(`${label} duplicate: ${r.id} matches ${seen.get(value)}`)
        } else {
            seen.set(value, r.id)
        }
    }
}

if (rituals.length !== 400) fail(`Expected 400 rituals, got ${rituals.length}`)
if (manifest.row_count !== rituals.length) {
    fail(`Manifest row_count ${manifest.row_count} != ${rituals.length}`)
}

unique("ID", (r) => r.id)
unique("Title", (r) => r.title)
unique("Hook", (r) => r.internal.hook)
unique("Goal", (r) => r.display.goal)
unique("Game Move", (r) => r.internal.gameMove)
unique("Goal + Steps", (r) => r.source.goalAndStepsRaw)
unique("Win / Reward", (r) => r.display.win)
unique("Formula Flow", (r) => r.display.formulaFlow)
unique("Safety block", (r) => r.source.safetyRaw)

for (const r of rituals) {
    if (!r.display.steps.length) fail(`${r.id}: no parsed numbered steps`)
    if (!r.display.win) fail(`${r.id}: missing win`)
    if (!r.display.formulaFlow) fail(`${r.id}: missing Formula Flow`)
    if (!r.display.safety.pause) fail(`${r.id}: missing pause guidance`)
    if (!r.display.safety.disclaimer) fail(`${r.id}: missing disclaimer`)
}

const bubbleCounts = {}
for (const r of rituals) {
    bubbleCounts[r.bubble] = (bubbleCounts[r.bubble] || 0) + 1
}

for (const [bubble, file] of Object.entries(manifest.files.bubbles)) {
    const list = read(file)
    const expected = bubbleCounts[bubble] || 0
    if (list.length !== expected) {
        fail(`${bubble}: ${list.length} rows in file, expected ${expected}`)
    }
    if (list.some((r) => r.bubble !== bubble)) {
        fail(`${bubble}: bubble file contains a different bubble`)
    }
}

if (!process.exitCode) {
    console.log("✅ ThinkStill v36 validation passed")
    console.log(`✅ ${rituals.length} rituals`)
    console.log(`✅ ${Object.keys(bubbleCounts).length} bubbles`)
    console.log(`✅ ${new Set(rituals.map(r => r.trigger)).size} triggers`)
    console.log(`✅ ${new Set(rituals.map(r => r.pattern)).size} patterns`)
}
