// F6 re-show timing probe: after the player acts, does the guide arrow come back on its own when they stop?
// Usage (cwd = framer/dev): node f6_reshow.mjs --size 390x844 --ids 1,2,3 [--dir /tmp/build] [--veteran]
// Per game: start, wait for the arrow, do ONE real step on the arrow's target (tap = click its centre; anything
// else = press there and drag 90 px along the hand's direction), then stop touching and poll the arrow every 80 ms:
//   hiddenMs   when the cue went away after the touch (it must hide while the player acts)
//   reshowMs   when it came back after the last pointerup (spec: ~2.2 s after a step that moved the bar, ~4 s else)
//   moved      whether the step moved the progress bar
// One JSON line per game on stdout.
import * as eos from "./eos_drive.mjs"

const argv = process.argv.slice(2)
const arg = (k, d) => {
    const i = argv.indexOf(k)
    return i >= 0 ? argv[i + 1] : d
}
const [W, H] = arg("--size", "390x844").split("x").map(Number)
const ids = arg("--ids", "1").split(",").map(Number)
const dir = arg("--dir", eos.HERE)
const storage = argv.includes("--veteran") ? { eos_learned_v1: Object.fromEntries(Array.from({ length: 114 }, (_, i) => [String(i + 1), 5])) } : undefined

for (const id of ids) {
    const rec = { id, size: `${W}x${H}` }
    let L
    try {
        L = await eos.launchEos({ width: W, height: H, dir, storage })
        const s = await eos.startGameById(L.page, id, "my boss yelled at me and I feel useless")
        rec.name = s.name
        let st = null
        for (let i = 0; i < 40; i++) {
            st = await eos.arrowState(L.page)
            if (st.visible) break
            await L.page.waitForTimeout(100)
        }
        rec.g = st.g
        rec.label = st.label
        if (!st.visible) throw new Error("no arrow at start")
        const box = await L.page.evaluate((sel) => {
            const A = window.__eosDrive.lib.arena()
            const t = sel && ((A && A.querySelector(sel)) || document.querySelector(sel))
            if (!t) return null
            const r = t.getBoundingClientRect()
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }, st.targetSelector)
        const at = box || { x: st.x, y: st.y }
        const p0 = await eos.readProgress(L.page)
        await L.page.mouse.move(at.x, at.y)
        await L.page.mouse.down()
        if (st.g && st.g !== "tap" && st.g !== "seq") {
            for (let k = 1; k <= 9; k++) {
                await L.page.mouse.move(at.x + (st.g === "swipe" || st.g === "drag" ? 0 : k * 2), at.y - k * 10)
                await L.page.waitForTimeout(40)
            }
            if (/hold|press|slow|charge/.test(st.g)) await L.page.waitForTimeout(900)
        } else await L.page.waitForTimeout(60)
        const tDown = Date.now()
        const vDown = (await eos.arrowState(L.page)).visible
        await L.page.mouse.up()
        const tUp = Date.now()
        let hiddenMs = vDown ? null : 0
        let reshowMs = null
        while (Date.now() - tUp < 9000) {
            const a = await eos.arrowState(L.page)
            if (!a.visible && hiddenMs == null) hiddenMs = Date.now() - tDown
            if (a.visible && (hiddenMs != null || !vDown)) {
                reshowMs = Date.now() - tUp
                rec.reshowLabel = a.label
                break
            }
            await L.page.waitForTimeout(80)
        }
        const p1 = await eos.readProgress(L.page)
        rec.moved = p0 != null && p1 != null ? Math.round((p1 - p0) * 100) / 100 : null
        rec.hiddenWhileTouching = !vDown
        rec.hiddenMs = hiddenMs
        rec.reshowMs = reshowMs
    } catch (e) {
        rec.fail = String(e && e.message ? e.message : e).slice(0, 200)
    } finally {
        try {
            if (L) await L.browser.close()
        } catch {}
    }
    console.log(JSON.stringify(rec))
}
