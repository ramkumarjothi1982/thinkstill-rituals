// F4 ZAP probe: real play (mouse clicks) to the finale + per-hit face / bolt / overlap evidence, then the auto-player.
//   node f4_zap_probe.mjs --size 390x844 --dir /tmp/v1_zap --out x.json --shots dir [--uploads 0|2] [--auto 1]
import { launch } from "./drive.mjs"
import { startGameById, finishGame, readProgress, resetToInput } from "./eos_drive.mjs"
import fs from "node:fs"
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), []))
const [W, H] = String(args.size || "390x844").split("x").map(Number)
const shots = args.shots || "/tmp"
const tag = `${W}${args.reduced ? "_rm" : ""}`
fs.mkdirSync(shots, { recursive: true })
const { browser, page, errors } = await launch({ dir: args.dir || "/tmp/v1_zap", width: W, height: H, reducedMotion: !!args.reduced })
const out = { size: `${W}x${H}`, hits: [], overlaps: [], bolts: [], errors: [], progress: [] }
const snap = async (name) => { const f = `${shots}/${tag}_${name}.png`; await page.screenshot({ path: f }); return f }
const faces = () => page.evaluate(() => Array.from(document.querySelectorAll(".eosZapBubble")).map((b) => {
    const im = b.querySelector("ts-face img"); const t = b.querySelector("ts-face-text"); const r = b.getBoundingClientRect(); const pr = b.querySelector("ts-face-pic")?.getBoundingClientRect()
    const tr = t && !t.hidden ? t.getBoundingClientRect() : null
    return { src: (im?.getAttribute("src") || "").replace(/^.*\//, ""), cls: b.querySelector("ts-face")?.className, text: t?.textContent || "", fs: t ? parseFloat(getComputedStyle(t).fontSize) : 0, hits: Number(b.dataset.zapHits), relieved: b.classList.contains("relieved"), r: [r.left, r.top, r.width, r.height].map(Math.round), pic: pr ? [pr.left, pr.top, pr.width, pr.height].map(Math.round) : null, textBox: tr ? [tr.left, tr.top, tr.width, tr.height].map(Math.round) : null }
}))
try {
    const st = await startGameById(page, 6, args.text || "my boss yelled at me in front of everyone")
    out.start = st
    await page.waitForTimeout(1600)
    out.facesStart = await faces()
    out.arrowStart = await page.evaluate(() => { const g = document.querySelector(".eosGuide, .eosGuideArrows, [class*='eosGuide']"); return g ? (g.innerText || "").slice(0, 60) : null })
    await snap("01_start")
    // overlap: bubbles vs zapper / RUSH / counter / speech
    out.overlaps = await page.evaluate(() => {
        const R = (e) => e.getBoundingClientRect(); const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
        const bs = Array.from(document.querySelectorAll(".eosZapBubble")).map(R)
        const others = [".eosZapDock", ".eosZapRushPic", ".eosZapSay", ".eosZapCount", ".eosZapPlunger"].map((s) => [s, document.querySelector(s)]).filter((x) => x[1])
        const res = []
        bs.forEach((b, i) => { others.forEach(([s, e]) => { const a = ov(b, R(e)); if (a > 4) res.push({ bubble: i, with: s, px2: Math.round(a) }) }); bs.forEach((c, j) => { if (j > i) { const a = ov(b, c); if (a > 4) res.push({ bubble: i, with: "bubble" + j, px2: Math.round(a) }) } }) })
        const ar = R(document.querySelector(".eosZapArena")); const offs = []
        ;[".eosZapBubble", ".eosZapDock", ".eosZapRushPic", ".eosZapCount"].forEach((s) => document.querySelectorAll(s).forEach((e) => { const r = R(e); if (r.left < ar.left - 1 || r.right > ar.right + 1 || r.top < ar.top - 1 || r.bottom > ar.bottom + 1) offs.push(s) }))
        return { res, offArena: offs, arena: [ar.left, ar.top, ar.width, ar.height].map(Math.round) }
    })
    // 1 · grab the zapper (tool first)
    await page.locator("button.zapperTool").click()
    await page.waitForTimeout(450)
    out.arrowAfterGrab = await page.evaluate(() => { const g = document.querySelector(".eosGuide, .eosGuideArrows, [class*='eosGuide']"); return g ? (g.innerText || "").slice(0, 60) : null })
    await snap("02_grabbed")
    const n = await page.locator(".eosZapBubble").count()
    out.n = n
    for (let i = 0; i < n; i++) {
        for (let h = 1; h <= 2; h++) {
            const before = (await faces())[i]
            await page.locator(".eosZapBubble").nth(i).click({ force: true })
            await page.waitForTimeout(215)
            const bolt = await page.evaluate((i) => {
                const p = document.querySelector(".eosZapBoltCore"); if (!p) return null
                const a = document.querySelector(".eosZapArena"); const ar = a.getBoundingClientRect(); const sx = ar.width / a.offsetWidth
                const pts = p.getAttribute("d").replace(/^M/, "").split(" L").map((s) => s.split(" ").map(Number))
                const s0 = pts[0], s1 = pts[pts.length - 1]
                const tip = document.querySelector(".eosZapTip").getBoundingClientRect(); const b = document.querySelectorAll(".eosZapBubble")[i].getBoundingClientRect()
                const tx = tip.left + tip.width / 2, ty = tip.top + tip.height / 2
                const ex = ar.left + s1[0] * sx, ey = ar.top + s1[1] * sx
                const bc = [b.left + b.width / 2, b.top + b.height / 2]
                return { startToTip: Math.round(Math.hypot(ar.left + s0[0] * sx - tx, ar.top + s0[1] * sx - ty)), endInsideBubble: Math.hypot(ex - bc[0], ey - bc[1]) <= b.width / 2, endFromCentre: Math.round(Math.hypot(ex - bc[0], ey - bc[1])), r: Math.round(b.width / 2), impact: !!document.querySelector(".eosZapImpact"), recoil: !!document.querySelector(".eosZapKick.k0,.eosZapKick.k1"), rush: document.querySelector(".eosZapRush").className.replace(/eosZapRush|tsNoBubbleFace/g, "").trim() }
            }, i)
            if (i === 0 && h === 1) await snap("03_zap_bolt")
            if (i === 1 && h === 2) await snap("05_zap_bolt2")
            await page.waitForTimeout(140)
            const mid = (await faces())[i]
            await page.waitForTimeout(h === 2 ? 900 : 380)
            const after = (await faces())[i]
            if (i === 0 && h === 1) await snap("04_shocked")
            if (i === 0 && h === 2) await snap("06_relieved")
            out.hits.push({ i, h, before: before.src, mid: mid.src, after: after.src, cls: after.cls, bolt })
            out.bolts.push(bolt)
            out.progress.push(await readProgress(page))
        }
    }
    await page.waitForTimeout(700)
    await snap("07_finale")
    out.facesEnd = await faces()
    out.zapState = await page.evaluate(() => window.__eos?.zap?.state?.() || null)
    await page.waitForTimeout(1900)
    await snap("08_after_finish")
    await page.waitForTimeout(2600)
    await snap("09_reveal")
    out.revealSeen = await page.evaluate(() => !!document.querySelector(".releaseCompleteOverlay, .tsRewardSurge, .rewardSurge, [class*='RewardSurge'], [class*='reveal']"))
    if (args.auto) {
        await resetToInput(page)
        await page.waitForTimeout(600)
        await startGameById(page, 6, "nobody listens to me")
        await page.waitForTimeout(1200)
        const r = await finishGame(page, 6, { assertArrows: true })
        out.auto = { done: r.done, reason: r.reason, ms: r.ms, actions: r.actions, arrowMisses: r.arrowMisses, stages: (r.stages || []).map((s) => s.label || s.L || s.key || s).slice(0, 6) }
    }
} catch (e) {
    out.fatal = String(e && e.stack || e)
}
out.errors = errors.filter((e) => !/agent-proxy|connect_rejected|ERR_TUNNEL|net::/.test(e)).slice(0, 10)
fs.writeFileSync(args.out || `/tmp/zap_${W}.json`, JSON.stringify(out, null, 1))
await browser.close()
console.log(JSON.stringify({ size: out.size, n: out.n, fatal: out.fatal, errors: out.errors.length, overlaps: out.overlaps, auto: out.auto, revealSeen: out.revealSeen }))
