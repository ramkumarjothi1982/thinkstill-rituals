// Ship smoke: the real build (dev/index.html = the .txt's code) at phone + desktop: ThinkStill picks a game from typed
// words and it plays to the reveal; then key games by id play to the reveal. Prints one line per check + page errors.
import * as eos from "./eos_drive.mjs"
import { routeExpressions } from "./f8_probe.mjs"
const IDS = (process.argv[3] || "1,2,3,6,41,47,100,109,110,111").split(",").map(Number)
const [w, h] = (process.argv[2] || "390x844").split("x").map(Number)
const L = await eos.launchEos({ width: w, height: h, lite: true })
await routeExpressions(L.context)
await L.page.reload(); await L.page.waitForTimeout(1500)
const res = []
for (const id of IDS) {
  const t0 = Date.now()
  const s = await eos.startGameById(L.page, id, "deadline panic, angry at my boss, cannot sleep", { waitMs: 1500 }).catch((e) => ({ ok: false, why: String(e).slice(0, 80) }))
  if (!s.ok) { res.push(`${id} START-FAIL ${s.why || s.stage}`); await eos.resetToInput(L.page); continue }
  const f = await eos.finishGame(L.page, id, { timeoutMs: 120000, assertArrows: false }).catch((e) => ({ done: false, reason: String(e).slice(0, 80) }))
  res.push(`${id} ${s.name}: ${f.done ? "REVEAL" : "NOT DONE " + (f.reason || "")} ${Math.round((Date.now() - t0) / 1000)}s`)
  await eos.resetToInput(L.page)
}
console.log(`${w}x${h}`); res.forEach((r) => console.log("  " + r))
console.log("  page errors:", L.errors.length, L.errors.slice(0, 5).map((e) => String(e).slice(0, 120)).join(" | "))
await L.close()
