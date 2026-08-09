import fs from "node:fs"

const rituals = JSON.parse(fs.readFileSync("rituals.json", "utf8"))
const sample = rituals[0]

console.log({
    id: sample.id,
    bubble: sample.bubble,
    title: sample.display.title,
    goal: sample.display.goal,
    steps: sample.display.steps.length,
    win: sample.display.win,
    formulaFlow: sample.display.formulaFlow,
    internalHookRendered: false,
    internalGameMoveRendered: false,
})
