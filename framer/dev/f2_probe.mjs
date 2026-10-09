// F2 probe: overlapping containers hide controls (docs/founder/FEEDBACK_LOG.md F2).
// Usage (cwd = framer/dev):
//   node f2_probe.mjs --size 390x844 --ids 1-114 [--dir build] [--play] [--out file.json] [--shots dir --shotIds 23,105,85]
// For every game: start it and audit at "start"; with --play it also plays the game with eos.finishGame and audits
// again at "mid" (progress >= 30) and "late" (progress >= 75, before the finale). Every audit checks, for every
// interactive element (buttons, [role=button], data-eos-* markers, cursor:pointer/grab game objects) and every
// user word in the stage:
//   hit    elementFromPoint at the centre is not the element (something else would take the tap)
//   chrome a console container (LIVE GUIDE, HUD, feedback copy, composer, companion, shift meter) paints over it
//          (pointer-events forced on for the containers inside one synchronous task, so painting order decides)
//   text   a long instructional paragraph (>= 60 chars) of the game paints over it
//   off    the control's centre lies outside the viewport (not reachable)
//   para   a long instructional paragraph (>= 60 chars of its own text) is shown in the stage at all
import fs from "node:fs"
import path from "node:path"
import * as eos from "./eos_drive.mjs"

export const CHROME_SEL = [
    ".globalPlayGuide", ".engineProgressHud", ".globalFeedbackCopyLayer", ".releaseComposer", ".eosCompanion",
    ".eosShiftMeter", ".eosCheckInChip", ".eosF2Guide",
].join(",")
export const WORDS = ["my boss", "yelled at me", "hot face", "clenched jaw", "tight fists", "had enough", "my boss yelled at me"]

// runs in the page: returns {controls, words, issues:[{kind, what, by}]}
export function auditInPage({ chromeSel, words }) {
    const host = document.querySelector(".releaseGameHost")
    if (!host) return { err: "nohost", issues: [] }
    const shell = host.querySelector(".cinematicContentShell") || host
    const vw = innerWidth, vh = innerHeight
    const opacityOk = (el) => {
        let o = 1
        for (let e = el; e && e !== document.body; e = e.parentElement) {
            const c = getComputedStyle(e)
            if (c.display === "none" || c.visibility === "hidden") return false
            o *= +c.opacity
            if (o < 0.2) return false
        }
        return true
    }
    const box = (el) => el.getBoundingClientRect()
    const name = (el) => (el ? `${el.tagName.toLowerCase()}.${String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className).trim().split(/\s+/).slice(0, 3).join(".")}` : "null")
    const label = (el) => `${name(el)}${(el.innerText || el.textContent || "").trim() ? ` "${(el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24)}"` : ""}`
    // ---- controls
    const ctrls = new Set()
    shell.querySelectorAll("button,[role=button],[data-eos-tap],[data-eos-drag],[data-eos-hold],[data-eos-target]").forEach((e) => ctrls.add(e))
    shell.querySelectorAll(".arena *, [class*=Arena] *").forEach((e) => {
        const c = getComputedStyle(e).cursor
        if (!/pointer|grab/.test(c)) return
        const p = e.parentElement
        if (p && /pointer|grab/.test(getComputedStyle(p).cursor)) return
        ctrls.add(e)
    })
    const list = []
    for (const e of ctrls) {
        if (e.closest(chromeSel) || e.closest(".eosArrowsRoot")) continue
        if (getComputedStyle(e).pointerEvents === "none") continue
        if (e.disabled) continue
        const b = box(e)
        if (b.width < 12 || b.height < 12 || !opacityOk(e)) continue
        if ([...ctrls].some((o) => o !== e && o.contains(e) && getComputedStyle(o).pointerEvents !== "none")) continue // inner part of a control
        list.push(e)
    }
    // ---- user words (leaf text nodes in the stage)
    const norm = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase()
    const wset = new Set(words)
    const wordEls = Array.from(shell.querySelectorAll("span,b,strong,em,div,p,small,label")).filter((n) => !n.children.length && wset.has(norm(n.textContent)) && !n.closest(chromeSel) && opacityOk(n) && box(n).width >= 8)
    // ---- long paragraphs of the game
    const paras = Array.from(shell.querySelectorAll("p,small,span,div,em")).filter((n) => {
        if (n.closest(chromeSel) || n.closest("button")) return false
        // own text (direct text nodes) of >= 60 chars: a paragraph, not a container of short labels / bubbles
        const own = norm(Array.from(n.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent).join(" "))
        if (own.length < 60 || wset.has(own.toLowerCase())) return false
        return opacityOk(n) && box(n).height > 0
    })
    const issues = []
    const pts = (b) => [[0.5, 0.5], [0.25, 0.3], [0.75, 0.3], [0.25, 0.7], [0.75, 0.7]].map(([fx, fy]) => [b.left + b.width * fx, b.top + b.height * fy])
    const inView = (x, y) => x >= 0 && y >= 0 && x < vw && y < vh
    // pass 1: real hit test at the centre
    for (const e of list) {
        const b = box(e)
        const [x, y] = [b.left + b.width / 2, b.top + b.height / 2]
        if (!inView(x, y)) {
            issues.push({ kind: "off", what: label(e), by: `${Math.round(x)},${Math.round(y)}` })
            continue
        }
        const t = document.elementFromPoint(x, y)
        if (!t || !(t === e || e.contains(t) || t.contains(e))) {
            if (t && (t.closest(".eosArrowsRoot") || t.closest("ts-face"))) continue
            issues.push({ kind: "hit", what: label(e), by: label(t || document.body) })
        }
    }
    // pass 2: painting order with pointer-events forced on for containers + paragraphs (one synchronous task)
    paras.forEach((p) => p.setAttribute("data-f2txt", "1"))
    const st = document.createElement("style")
    st.textContent = `:is(${chromeSel}), :is(${chromeSel}) *, [data-f2txt], [data-f2txt] * { pointer-events: auto !important; }`
    document.head.appendChild(st)
    try {
        const check = (e, kindWhat) => {
            const b = box(e)
            let chrome = null, text = null, nC = 0, nT = 0
            for (const [x, y] of pts(b)) {
                if (!inView(x, y)) continue
                const t = document.elementFromPoint(x, y)
                if (!t || e.contains(t) || t === e) continue
                const c = t.closest(chromeSel)
                if (c && !c.contains(e)) {
                    nC++
                    chrome = c
                    continue
                }
                const p = t.closest("[data-f2txt]")
                if (p && !p.contains(e) && !e.contains(p)) {
                    nT++
                    text = p
                }
            }
            if (nC >= 2) issues.push({ kind: "chrome", what: kindWhat + label(e), by: name(chrome) })
            if (nT >= 2) issues.push({ kind: "text", what: kindWhat + label(e), by: label(text) })
        }
        list.forEach((e) => check(e, ""))
        wordEls.forEach((e) => check(e, "word "))
    } finally {
        st.remove()
        paras.forEach((p) => p.removeAttribute("data-f2txt"))
    }
    paras.forEach((p) => issues.push({ kind: "para", what: label(p), by: `${Math.round(parseFloat(getComputedStyle(p).fontSize))}px` }))
    return { controls: list.length, words: wordEls.length, paras: paras.length, issues }
}

export async function audit(page) {
    return page.evaluate(auditInPage, { chromeSel: CHROME_SEL, words: WORDS })
}

function parseIds(s) {
    const out = []
    for (const part of String(s).split(",")) {
        const m = part.match(/^(\d+)-(\d+)$/)
        if (m) for (let i = +m[1]; i <= +m[2]; i++) out.push(i)
        else if (part.trim()) out.push(+part)
    }
    return out
}

async function main() {
    const args = process.argv.slice(2)
    const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
    const [w, h] = opt("--size", "390x844").split("x").map(Number)
    const ids = parseIds(opt("--ids", "1-114"))
    const dir = opt("--dir", eos.HERE)
    const play = args.includes("--play")
    const out = opt("--out", null)
    const shots = opt("--shots", null)
    const shotIds = new Set(parseIds(opt("--shotIds", "")))
    const tag = opt("--tag", "")
    const results = []
    let session = null
    const fresh = async () => {
        if (session) await session.browser.close().catch(() => {})
        session = await eos.launchEos({ width: w, height: h, dir, lite: !shots })
    }
    await fresh()
    for (const id of ids) {
        const rec = { id, size: `${w}x${h}`, phases: {} }
        try {
            if (results.length && results.length % 12 === 0) await fresh()
            const { page } = session
            const st = await eos.startGameById(page, id, "my boss yelled at me", { skipCheckin: true })
            rec.name = st.name
            await page.waitForTimeout(1500)
            rec.phases.start = await audit(page)
            const snap = async (ph) => {
                if (shots && shotIds.has(id)) await page.screenshot({ path: path.join(shots, `f2_${tag}${id}_${w}_${ph}.png`) })
            }
            await snap("start")
            if (play) {
                let fin = null
                const run = eos.finishGame(page, id, { timeoutMs: 120000, stuckMs: 30000, assertArrows: false }).then((r) => (fin = r)).catch((e) => (fin = { done: false, reason: String(e).slice(0, 120) }))
                const t0 = Date.now()
                while (!fin && Date.now() - t0 < 130000) {
                    await page.waitForTimeout(350)
                    const v = await eos.readProgress(page).catch(() => null)
                    if (v == null) continue
                    if (!rec.phases.mid && v >= 30 && v < 100) {
                        rec.phases.mid = await audit(page).catch((e) => ({ err: String(e), issues: [] }))
                        await snap("mid")
                    }
                    if (!rec.phases.late && v >= 75 && v < 100) {
                        rec.phases.late = await audit(page).catch((e) => ({ err: String(e), issues: [] }))
                        await snap("late")
                    }
                }
                await run
                rec.done = !!(fin && fin.done)
                rec.reason = fin && fin.reason
                if (shots && shotIds.has(id)) {
                    await page.waitForTimeout(1500)
                    await snap("end")
                }
            }
        } catch (e) {
            rec.err = String(e).slice(0, 200)
            await fresh().catch(() => {})
        }
        const n = Object.values(rec.phases).reduce((a, p) => a + ((p && p.issues) || []).length, 0)
        rec.count = n
        results.push(rec)
        console.log(`${id} ${rec.name || ""} issues=${n}${play ? ` done=${rec.done}` : ""} ${Object.entries(rec.phases).map(([k, p]) => `${k}:${((p && p.issues) || []).map((i) => i.kind).join("/")}`).join(" ")}`)
        if (out) fs.writeFileSync(out, JSON.stringify(results, null, 1))
    }
    await session.browser.close().catch(() => {})
    const games = results.filter((r) => r.count > 0).length
    const total = results.reduce((a, r) => a + r.count, 0)
    console.log(`SUMMARY ${w}x${h}: games with issues ${games}/${results.length}, issues ${total}${play ? `, finished ${results.filter((r) => r.done).length}` : ""}`)
}
if (process.argv[1] && process.argv[1].endsWith("f2_probe.mjs")) main()
