// F3 probe — "ThinkStill picks the next best release, no repeats until the group is finished, no game picker".
// Usage (cwd framer/dev, after python3 build.py):
//   node f3_probe.mjs unit [dir]                      rotation unit test (every emotion + general + safety flags)
//   node f3_probe.mjs go <width> <height> [dir] [emotion=panic] [level=8]
//        → check-in GO starts the rotation pick, finale, Next, finale, reload + RELEASE IT continues the rotation
//   node f3_probe.mjs ui <width> <height> [dir] [shotPrefix] [gameText]
//        → picker audit at input / play / reveal, RELEASE IT start, finale, Next = rotation pick, Again, New thought,
//          owner menu (?menu=1) audit; screenshots <shotPrefix>_<step>.png when shotPrefix is given
// Prints one JSON object. Exit code 1 when a check fails.
import * as eos from "./eos_drive.mjs"
import fs from "fs"

const [mode = "unit", ...rest] = process.argv.slice(2)
const fail = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Everything a user could use to choose / browse games (visible only).
async function pickerAudit(page) {
    return page.evaluate(() => {
        const vis = (el) => {
            const r = el.getBoundingClientRect()
            const cs = getComputedStyle(el)
            return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05
        }
        const q = (sel) => Array.from(document.querySelectorAll(sel)).filter(vis)
        const names = new Set((window.__eos?.core?.GAMES || []).map((g) => String(g.name).toUpperCase()))
        const buttons = q("button, [role=button], a")
        const named = buttons
            .map((b) => (b.innerText || "").replace(/\s+/g, " ").trim().toUpperCase())
            .filter((t) => t && (/^TRY\b/.test(t) || [...names].some((n) => n.length > 2 && (t === n || t.includes(" " + n) || t.endsWith(n)))))
        return {
            menuButton: q("button.releaseChoiceButton:not(.eosPickGo)").length,
            menu: q(".releaseChoiceMenu, .releaseChoiceItem").length,
            pickMyself: q("[data-eos-pick]").length,
            prevNext: q(".releaseCompletePrev").length,
            sideNext: q(".releaseCompleteNext").length,
            namedButtons: named,
            goButton: q("button.eosPickGo").length,
        }
    })
}
function pickerClean(a, where) {
    const bad = []
    if (a.menuButton) bad.push("menu button")
    if (a.menu) bad.push("menu list")
    if (a.pickMyself) bad.push("pick myself")
    if (a.prevNext) bad.push("PREVIOUS")
    if (a.namedButtons.length) bad.push("named: " + a.namedButtons.join(" | "))
    if (bad.length) fail.push(`${where}: ${bad.join(", ")}`)
    return !bad.length
}
async function stepTo(page, want = "done", ms = 20000) {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) {
        const st = await page.evaluate(() => document.querySelector(".eosShiftMeter")?.getAttribute("data-step") || null)
        if (st === want || st == null) return st
        for (const sel of [".eosSmSkip", ".eosShiftSkip"]) {
            const l = page.locator(sel).first()
            if ((await l.count()) && (await l.isVisible().catch(() => false))) await l.click().catch(() => {})
        }
        await sleep(600)
    }
    return page.evaluate(() => document.querySelector(".eosShiftMeter")?.getAttribute("data-step") || null)
}
const stageOf = (page) => page.evaluate(() => (document.querySelector(".tsArcade")?.className.match(/stage-(\w+)/) || [])[1] || null)

async function unit(dir) {
    const L = await eos.launchEos({ width: 390, height: 844, dir, lite: true })
    const { page } = L
    const P = () => page.evaluate(() => !!(window.__eos && window.__eos.pick))
    if (!(await P())) {
        fail.push("window.__eos.pick missing")
        return { fail }
    }
    const emotions = await page.evaluate(() => window.__eos.core.EOS_EMOTIONS.map((e) => e.id))
    const cases = [...emotions.map((e) => ({ name: e, opts: { emotion: e } })), { name: "general(no feeling)", opts: { emotion: null, before: 5 } }, { name: "anger+selfharm flag", opts: { emotion: "anger", textFlag: "selfharm" } }, { name: "sad+soft flag", opts: { emotion: "sad", textFlag: "soft" } }]
    const out = []
    for (const c of cases) {
        await page.evaluate(() => window.__eos.pick.reset())
        const grp = await page.evaluate((o) => window.__eos.pick.group("", o), c.opts)
        const n = grp.ids.length
        const N = n + 3
        const seq = []
        let reloadAt = Math.floor(N / 2)
        for (let i = 0; i < N; i++) {
            if (i === reloadAt) {
                await page.reload()
                await page.waitForTimeout(900)
            }
            const id = await page.evaluate(
                ([o, last]) => {
                    const g = window.__eos.pick.EosPickNext("", [], last, o)
                    if (g) window.__eos.pick.EosPickNote(g)
                    return g ? g.id : null
                },
                [c.opts, seq.length ? seq[seq.length - 1] : null]
            )
            seq.push(id)
        }
        const first = seq.slice(0, n)
        const okCover = new Set(first).size === n && first.every((id) => grp.ids.includes(id))
        const backToBack = seq.some((id, i) => i && id === seq[i - 1] && n > 1)
        const second = seq.slice(n, 2 * n) // the next cycle (a 2-game group runs into its third cycle)
        const okSecond = new Set(second).size === second.length
        const gentleOk = c.opts.textFlag === "selfharm" ? grp.ids.every((id) => window_gentle.includes(id)) : true
        const row = { case: c.name, key: grp.key, groupSize: n, sessions: N, seq, coversGroupBeforeRepeat: okCover, backToBack, secondCycleNoRepeat: okSecond, gentleOk, reloadedAfter: reloadAt }
        if (!n) fail.push(`${c.name}: empty group`)
        if (!okCover) fail.push(`${c.name}: repeat before the group was finished`)
        if (backToBack) fail.push(`${c.name}: back-to-back repeat`)
        if (!okSecond) fail.push(`${c.name}: repeat inside the second cycle`)
        if (!gentleOk) fail.push(`${c.name}: non-gentle game under a strong flag`)
        out.push(row)
    }
    // cross-feeling: the last few launches are avoided when the feeling changes (group not exhausted)
    await page.evaluate(() => window.__eos.pick.reset())
    const cross = await page.evaluate(() => {
        const P = window.__eos.pick
        const a = []
        for (let i = 0; i < 3; i++) {
            const g = P.EosPickNext("", [], a[a.length - 1] || null, { emotion: "panic" })
            P.EosPickNote(g)
            a.push(g.id)
        }
        const anx = P.group("", { emotion: "anxiety" }).ids
        const overlap = a.filter((id) => anx.includes(id))
        const b = P.EosPickNext("", [], a[a.length - 1], { emotion: "anxiety" })
        return { panic: a, anxietyGroup: anx, overlap, anxietyPick: b && b.id }
    })
    if (cross.overlap.includes(cross.anxietyPick)) fail.push(`cross-feeling: served recent ${cross.anxietyPick} again`)
    // persistence: nothing but ids and numbers in storage
    const stored = await page.evaluate(() => localStorage.getItem("eos_rotation_v1"))
    if (/[a-z]{4,}/i.test(String(stored).replace(/"(v|seq|at|cyc|last)"|"[a-z]+(:[a-z]+)?"(?=:\d)/g, ""))) fail.push("rotation storage holds more than ids / numbers")
    await L.close()
    return { cases: out, cross, stored: JSON.parse(stored || "null") }
}
const window_gentle = [113, 111, 109, 110, 102, 95, 114, 115, 106, 40, 120, 119]

async function ui(width, height, dir, shot, text) {
    const res = { width, height, steps: [] }
    const snap = async (page, name) => {
        if (shot) await page.screenshot({ path: `${shot}_${name}.png` })
    }
    const L = await eos.launchEos({ width, height, dir })
    const { page } = L
    await page.evaluate(() => window.__eos.pick.reset())
    // 1. input stage with the check-in (emotion + dial)
    await eos.openCheckin(page)
    await page.waitForTimeout(800)
    // pick a feeling so the CTA step shows (where "pick a game myself" and the routed game's name used to be)
    const orb = page.locator(".eosCheckIn [data-eos-emotion='anger'], .eosCheckIn button:has-text('ANGER')").first()
    if (await orb.count()) {
        await orb.click().catch(() => {})
        await page.waitForTimeout(900)
    }
    res.checkin = await pickerAudit(page)
    res.checkin.cta = await page.evaluate(() => (document.querySelector(".eosCkCta")?.innerText || "").replace(/\s+/g, " ").trim())
    pickerClean(res.checkin, "check-in")
    const gnames = await page.evaluate(() => window.__eos.core.GAMES.map((g) => String(g.name).toUpperCase()))
    if (gnames.some((n) => n.length > 2 && res.checkin.cta.toUpperCase().includes(n))) fail.push(`check-in CTA names a game: ${res.checkin.cta}`)
    await snap(page, "1_checkin")
    // 2. composer without the check-in: one RELEASE IT button, no menu
    const skip = page.locator(".eosCheckIn button", { hasText: /just let me play/i }).first()
    if (await skip.count()) await skip.click().catch(() => {})
    await page.waitForTimeout(600)
    await page.locator("input.releaseThoughtInput").fill(text)
    await page.waitForTimeout(400)
    res.input = await pickerAudit(page)
    pickerClean(res.input, "input")
    if (res.input.goButton !== 1) fail.push(`input: ${res.input.goButton} RELEASE IT buttons`)
    const expect1 = await page.evaluate((t) => window.__eos.pick.explain(t, []), text)
    await snap(page, "2_input")
    await page.locator("button.eosPickGo").click()
    await page.waitForTimeout(2400)
    const g1 = await eos.currentGameId(page)
    res.first = { expected: expect1.pick, group: expect1.key, started: g1, stage: await stageOf(page) }
    if (g1 !== expect1.pick) fail.push(`first game ${g1} != rotation pick ${expect1.pick}`)
    res.play = await pickerAudit(page)
    res.play.composerButton = await page.evaluate(() => (document.querySelector("button.eosPickGo")?.innerText || "").replace(/\s+/g, " ").trim())
    if (!/^✦?\s*NEXT/.test(res.play.composerButton)) fail.push(`play: composer button reads "${res.play.composerButton}"`)
    pickerClean(res.play, "play")
    await snap(page, "3_play")
    // 3. play to the finale
    const f = await eos.finishGame(page, g1, { timeoutMs: 170000 })
    res.finish1 = { id: g1, name: f.name, done: f.done, reason: f.reason, ms: f.ms }
    if (!f.done) fail.push(`game ${g1} did not reach its finale (${f.reason})`)
    await page.waitForTimeout(3500)
    await snap(page, "4_finale")
    const st = await stepTo(page, "done")
    await page.waitForTimeout(600)
    res.reveal = await pickerAudit(page)
    res.reveal.step = st
    pickerClean(res.reveal, "reveal")
    await snap(page, "5_reveal")
    // 4. Next = ThinkStill's rotation pick (never the same game)
    const expect2 = await page.evaluate(([t, ex]) => window.__eos.pick.explain(t, [], ex), [text, g1])
    const more = page.locator(".eosShiftBtn.isMore").first()
    const side = page.locator(".releaseCompleteNext").first()
    if ((await more.count()) && (await more.isVisible())) await more.click()
    else if ((await side.count()) && (await side.isVisible())) await side.click()
    else fail.push("reveal: no Next button")
    await page.waitForTimeout(2600)
    const g2 = await eos.currentGameId(page)
    res.next = { expected: expect2.pick, started: g2, differs: g2 !== g1 }
    if (g2 !== expect2.pick) fail.push(`Next served ${g2}, rotation says ${expect2.pick}`)
    if (g2 === g1) fail.push("Next repeated the same game")
    await snap(page, "6_next")
    // 5. finish the second game too, then Again (same game) and New thought (input)
    const f2 = await eos.finishGame(page, g2, { timeoutMs: 170000 })
    res.finish2 = { id: g2, name: f2.name, done: f2.done, reason: f2.reason, ms: f2.ms }
    if (!f2.done) fail.push(`game ${g2} did not reach its finale (${f2.reason})`)
    await page.waitForTimeout(3000)
    await stepTo(page, "done")
    const again = page.locator("button.releaseReplaySame").first()
    if ((await again.count()) && (await again.isVisible())) {
        await again.click()
        await page.waitForTimeout(2000)
        res.again = { id: await eos.currentGameId(page), stage: await stageOf(page) }
        if (res.again.id !== g2 || res.again.stage !== "play") fail.push(`Again did not replay ${g2}`)
    } else fail.push("reveal: no Again button")
    await eos.resetToInput(page)
    res.newThought = { stage: await stageOf(page) }
    const rot = await page.evaluate(() => window.__eos.pick.state())
    res.rotation = rot
    await L.close()
    // 6. owner / test hook: ?menu=1 brings the hidden menu back
    const M = await eos.launchEos({ width, height, dir, query: "menu=1" })
    const sk = M.page.locator(".eosCheckIn button", { hasText: /just let me play/i }).first()
    if (await sk.count()) await sk.click().catch(() => {})
    await M.page.waitForTimeout(500)
    await eos.openMenu(M.page)
    await M.page.waitForTimeout(400)
    const ma = await pickerAudit(M.page)
    res.ownerMenu = { menuButton: ma.menuButton, items: ma.menu }
    if (!ma.menuButton || !ma.menu) fail.push("owner menu (?menu=1) did not come back")
    await snap(M.page, "7_ownermenu")
    await M.close()
    res.errors = L.errors.slice(0, 5)
    if (L.errors.length) fail.push(`${L.errors.length} page errors`)
    return res
}

// Check-in path: feeling + dial → LET'S SHIFT IT → rotation pick; finale; Next ×2; reload; Next keeps rotating.
async function go(width, height, dir, emotion, level) {
    const res = { width, height, emotion, level, games: [] }
    let ctxText = ""
    let ctxOpts = { emotion, before: level } // after the reload the typed words decide (no check-in)
    let L = await eos.launchEos({ width, height, dir })
    await L.page.evaluate(() => window.__eos.pick.reset())
    const exp = await L.page.evaluate(([e, b]) => window.__eos.pick.explain("", [], null, { emotion: e, before: b }), [emotion, level])
    res.group = exp.group
    const ck = await eos.runCheckin(L.page, { emotion, intensity: level, go: true })
    let id = await eos.currentGameId(L.page)
    res.games.push({ id, expected: exp.pick, via: "check-in GO" })
    if (id !== exp.pick) fail.push(`check-in GO started ${id}, rotation says ${exp.pick}`)
    for (let k = 0; k < 3; k++) {
        const f = await eos.finishGame(L.page, id, { timeoutMs: 170000 })
        res.games[res.games.length - 1].done = f.done
        if (!f.done) {
            fail.push(`game ${id} did not reach its finale (${f.reason})`)
            break
        }
        await L.page.waitForTimeout(3000)
        await stepTo(L.page, "done")
        if (k === 1) {
            // persistence: reload mid-session, the rotation must continue (no repeat of the games already served)
            await L.page.reload() // same browser profile → localStorage survives, like a returning user
            await L.page.waitForTimeout(1500)
            await L.page.locator("input.releaseThoughtInput").fill("my heart is racing and I can't breathe").catch(() => {})
            const sk = L.page.locator(".eosCheckIn button", { hasText: /just let me play/i }).first()
            if (await sk.count()) await sk.click().catch(() => {})
            const e2 = await L.page.evaluate(() => window.__eos.pick.explain("my heart is racing and I can't breathe", []))
            await L.page.locator("button.eosPickGo").click()
            await L.page.waitForTimeout(2400)
            id = await eos.currentGameId(L.page)
            res.games.push({ id, expected: e2.pick, via: "reload + RELEASE IT", key: e2.key })
            ctxText = "my heart is racing and I can't breathe"
            ctxOpts = {}
            if (id !== e2.pick) fail.push(`after reload started ${id}, rotation says ${e2.pick}`)
            continue
        }
        const e = await L.page.evaluate(([ex, t, o]) => window.__eos.pick.explain(t, [], ex, o), [id, ctxText, ctxOpts])
        const more = L.page.locator(".eosShiftBtn.isMore").first()
        if ((await more.count()) && (await more.isVisible())) await more.click()
        else fail.push("reveal: no Next button")
        await L.page.waitForTimeout(2600)
        id = await eos.currentGameId(L.page)
        res.games.push({ id, expected: e.pick, via: "Next" })
        if (id !== e.pick) fail.push(`Next started ${id}, rotation says ${e.pick}`)
    }
    const ids = res.games.map((g) => g.id)
    if (new Set(ids).size !== ids.length) fail.push(`repeat inside the group: ${ids.join(",")}`)
    res.errors = L.errors.slice(0, 5)
    if (L.errors.length) fail.push(`${L.errors.length} page errors`)
    await L.close()
    return res
}

let result
if (mode === "unit") result = await unit(rest[0] || eos.HERE)
else if (mode === "go") {
    const [w = 390, h = 844, dir = eos.HERE, emotion = "panic", level = 8] = rest
    result = await go(+w, +h, dir, emotion, +level)
}
else {
    const [w = 390, h = 844, dir = eos.HERE, shot = "", text = "my boss yelled at me and I am so angry"] = rest
    result = await ui(+w, +h, dir, shot, text)
}
result.fail = fail
console.log(JSON.stringify(result))
process.exit(fail.length ? 1 : 0)
