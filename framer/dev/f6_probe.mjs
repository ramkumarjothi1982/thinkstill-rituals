// F6 probe: guide arrows on every game, every stage (docs/founder/FEEDBACK_LOG.md F6).
// Usage (cwd = framer/dev):
//   node f6_probe.mjs --size 390x844 --ids 1-114 [--dir /tmp/build] [--out file.jsonl] [--veteran] [--lite]
//                     [--timeout 120000]
// For every game (fresh page each): start it, then
//   START  the arrow must be visible within 3 s, its hand painted on screen, aimed at the driver's first target;
//   STAGES finishGame plays to the reveal with the real gestures; at every new stage (table, marker AND the
//          generic-fallback stages the table does not cover) the arrow must be visible within 1.5-3.2 s, carry
//          the stage's label and point at the element the driver then acts on (<= 18 px); success of the action
//          (the bar moves) is finishGame's own test.
// --veteran pre-seeds eos_learned_v1 with 5 completions for every id (a returning player, like the founder).
// One JSON line per game → --out (default stdout).
import fs from "node:fs"
import * as eos from "./eos_drive.mjs"

const argv = process.argv.slice(2)
const arg = (k, d) => {
    const i = argv.indexOf(k)
    return i >= 0 ? argv[i + 1] : d
}
const flag = (k) => argv.includes(k)
const [W, H] = arg("--size", "390x844").split("x").map(Number)
const ids = []
for (const part of arg("--ids", "1-114").split(",")) {
    const [a, b] = part.split("-").map(Number)
    for (let i = a; i <= (b || a); i++) ids.push(i)
}
const dir = arg("--dir", eos.HERE || undefined)
const out = arg("--out", null)
const timeoutMs = Number(arg("--timeout", 120000))
const veteran = flag("--veteran")
const storage = veteran ? { eos_learned_v1: Object.fromEntries(Array.from({ length: 114 }, (_, i) => [String(i + 1), 5])) } : undefined
const emit = (o) => {
    const line = JSON.stringify(o)
    if (out) fs.appendFileSync(out, line + "\n")
    else console.log(line)
}

// is the hand / chevron / label really painted on screen (not covered, not transparent)? Screenshot its box with
// and without the arrows layer and count the pixels that change (> 24 in any channel).
async function paintCheck(page) {
    const box = await page.evaluate(() => {
        const els = [...document.querySelectorAll(".eosCue.isOn .eosHand, .eosCue.isOn .eosChevron, .eosCue.isOn .eosPalm, .eosCue.isOn .eosLabel")]
        const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 2 && r.height > 2)
        if (!rs.length) return null
        const hand = els.find((e) => /eosHand|eosChevron|eosPalm/.test(e.getAttribute("class") || ""))
        const r = (hand || els[0]).getBoundingClientRect()
        const x = Math.max(0, r.left), y = Math.max(0, r.top)
        const w = Math.min(innerWidth, r.right) - x, h = Math.min(innerHeight, r.bottom) - y
        return w > 2 && h > 2 ? { x, y, width: w, height: h, what: hand ? "hand" : "label" } : null
    })
    if (!box) return { painted: false, why: "no cue element on" }
    const { what, ...clip } = box
    const a = eos.decodePNG(await page.screenshot({ clip }))
    const h = await page.addStyleTag({ content: `.eosArrowsRoot,.eosArrowLayer{visibility:hidden!important}` })
    await page.waitForTimeout(60)
    const b = eos.decodePNG(await page.screenshot({ clip }))
    await h.evaluate((el) => el.remove())
    let diff = 0
    const n = Math.min(a.data.length, b.data.length)
    const ch = a.channels || 4
    for (let i = 0; i < n; i += ch) if (Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])) > 24) diff++
    const frac = diff / Math.max(1, n / ch)
    return { painted: frac >= 0.08, frac: Math.round(frac * 100) / 100, what }
}

for (const id of ids) {
    const t0 = Date.now()
    let L
    const rec = { id, size: `${W}x${H}`, veteran }
    try {
        L = await eos.launchEos({ width: W, height: H, dir, lite: flag("--lite"), storage })
        const s = await eos.startGameById(L.page, id, "my boss yelled at me and I feel useless")
        rec.name = s.name
        if (!s.ok) throw new Error("start failed")
        // START: visible within 3 s
        let st = null
        const ts = Date.now()
        while (Date.now() - ts < 3000) {
            st = await eos.arrowState(L.page)
            if (st.visible) break
            await new Promise((r) => setTimeout(r, 120))
        }
        rec.start = { visible: !!(st && st.visible), label: st && st.label, g: st && st.g, ms: Date.now() - ts, inViewport: st && st.inViewport, targetInViewport: st && st.targetInViewport }
        rec.start.paint = await paintCheck(L.page)
        // a veteran's first cue may auto-hide: is it still up 3.5 s later?
        await new Promise((r) => setTimeout(r, 3500))
        const st2 = await eos.arrowState(L.page)
        rec.start.stillAfter35 = !!st2.visible
        rec.start.paintAfter35 = await paintCheck(L.page)
        if (flag("--startOnly")) throw Object.assign(new Error("startOnly"), { quiet: true })
        const r = await eos.finishGame(L.page, id, { assertArrows: true, arrowsOnFallback: true, timeoutMs, stuckMs: 30000 })
        rec.done = r.done
        rec.reason = r.reason
        rec.final = r.finalProgress
        rec.stages = r.stages.map((e) => ({ key: e.key, kind: e.kind, g: e.g, label: e.label, arrow: e.arrow && e.arrow.checked ? { v: e.arrow.visible, l: e.arrow.label, aim: e.arrow.aimPx, w: e.arrow.waitedMs } : e.arrow }))
        rec.arrowMisses = r.arrowMisses
        rec.labelMismatches = r.labelMismatches
        rec.aimMisses = r.aimMisses || []
        rec.notes = r.notes
        rec.errors = L.errors.slice(0, 5)
    } catch (e) {
        if (!(e && e.quiet)) rec.fail = String(e && e.message ? e.message : e).slice(0, 300)
    } finally {
        rec.ms = Date.now() - t0
        try {
            if (L) await L.browser.close()
        } catch {}
    }
    emit(rec)
}
