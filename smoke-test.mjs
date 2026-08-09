import fs from "node:fs"
const rituals = JSON.parse(fs.readFileSync("rituals.json", "utf8"))
const r = rituals[0]
console.log("TITLE:", r.title)
console.log("GOAL:", r.goal)
console.log("STEPS:", r.steps)
console.log("WIN:", r.win)
console.log("FLOW:", r.formulaFlow)
console.log("SAFETY:", r.safety)
console.log("\nFULL RITUAL:\n", r.ritualText)
