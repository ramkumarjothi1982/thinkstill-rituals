// F8 probe: default emotional bubble pictures (docs/founder/FEEDBACK_LOG.md F8).
// Usage (cwd = framer/dev):
//   node f8_probe.mjs --size 390x844 --ids 1-114 [--uploads 0..6] [--out /path.json] [--shots dir] [--finish 1,2]
// For every game: start it, wait, then audit every emotional bubble / object in the stage:
//   noPic (empty bubble), notCircle, cropped (cover on a non-square image), textOverPic (user text not below
//   the picture), textOutside (user text leaves the bubble), darkMask (dark opaque box behind picture/text),
//   phase (expression bank at start: negative expected), dist (upload six-image distribution).
// Expression images are served from the local bubble-expressions/ folder (the GitHub raw URLs are offline here).
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import * as eos from "./eos_drive.mjs"

const REPO = path.resolve(eos.ROOT, "..")
const EXPR_DIR = path.join(REPO, "bubble-expressions")

export async function routeExpressions(context) {
    await context.route(/bubble-expressions\/[a-z]+_E\d+\.webp/i, async (route) => {
        const m = route.request().url().match(/bubble-expressions\/([a-z]+_E\d+\.webp)/i)
        const f = m && path.join(EXPR_DIR, m[1])
        if (f && fs.existsSync(f)) return route.fulfill({ status: 200, contentType: "image/webp", body: fs.readFileSync(f) })
        return route.fulfill({ status: 404, body: "" })
    })
}

// Non-square test images (so "cover" cropping is detectable) with a distinct colour each.
export function testPng(i, w = 160, h = 100) {
    const cols = [[230, 60, 60], [60, 180, 80], [60, 90, 230], [230, 200, 40], [200, 60, 220], [40, 210, 210]]
    const [r, g, b] = cols[i % cols.length]
    const raw = Buffer.alloc((w * 3 + 1) * h)
    for (let y = 0; y < h; y++) {
        raw[y * (w * 3 + 1)] = 0
        for (let x = 0; x < w; x++) {
            const o = y * (w * 3 + 1) + 1 + x * 3
            const edge = x < 10 || x >= w - 10 // dark side bands: cropped by "cover"
            raw[o] = edge ? 20 : r
            raw[o + 1] = edge ? 20 : g
            raw[o + 2] = edge ? 20 : b
        }
    }
    const chunk = (type, data) => {
        const len = Buffer.alloc(4)
        len.writeUInt32BE(data.length)
        const td = Buffer.concat([Buffer.from(type), data])
        const crc = Buffer.alloc(4)
        crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(td) >>> 0 : crc32(td))
        return Buffer.concat([len, td, crc])
    }
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(w, 0)
    ihdr.writeUInt32BE(h, 4)
    ihdr[8] = 8
    ihdr[9] = 2
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])
}
function crc32(buf) {
    let c = ~0
    for (const b of buf) {
        c ^= b
        for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
    }
    return ~c >>> 0
}

export async function setUploads(page, n) {
    // remove existing uploads first (the popup's remove buttons) then add n images through the real file input
    await page.evaluate(() => window.__f8ClearUploads && window.__f8ClearUploads())
    if (!n) return
    const files = Array.from({ length: n }, (_, i) => ({ name: `f8_${i}.png`, mimeType: "image/png", buffer: testPng(i) }))
    await page.locator("input.releaseHiddenFile").setInputFiles(files)
    await page.waitForTimeout(500)
}

// In-page audit. Returns {hosts:[…], violations:{…}, orphanText:n}
export const PROBE = () => {
    const NEG = { glitch: [11, 15, 56, 63, 70], drop: [44, 58, 70, 80], still: [41, 63], patch: [70, 73, 80], loopie: [29, 34, 54, 58], rush: [29, 52, 58, 63, 80], sync: [44, 48] }
    const POS = { glitch: [7, 10], drop: [3, 6, 8, 9, 52], still: [15, 34, 61, 70, 90], patch: [11, 20, 32, 52, 58, 63, 72, 75], loopie: [15, 20, 32, 41, 63, 70], rush: [11, 20, 34, 44, 70], sync: [11, 20, 34, 61, 63, 70, 80, 90] }
    const root = document.querySelector(".releaseGameHost")
    if (!root) return { error: "no game host" }
    const vis = (el) => {
        if (!el || !el.isConnected) return false
        const r = el.getBoundingClientRect()
        if (r.width < 4 || r.height < 4) return false
        if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false
        for (let n = el; n && n !== document.body; n = n.parentElement) {
            const cs = getComputedStyle(n)
            if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.06) return false
        }
        return true
    }
    // same host list for the before and after builds (the shared face module's list + the 100+ engine's hosts)
    const HOST = ".allCircularBubble,.wordBubble,.stompWordBubble,.laserTargetBubble,.catchTarget,.choiceObject,.cleanseStone,.chargeOrb,.multiEgg,.zapMultiBubble,.cutLoopWord,.unhookWordBubble,.binWordBubble,.doorThoughtBubble,.echoHoldBubble,.tinySoundBubble,.tugThoughtBubble,.xrayThoughtBubble,.magicTrapBubble,.echoSourceHold,.shelfThoughtBubble,.juggleBall,.coinReleaseBubble,.sinkWordBubble,.uniqWord,.vacuumCircleBubble,.eraseWordBubble,.keepDropCenterBubble,.priorityBubbleTray button,.spaceTile,.ownershipCard,.keepDropCard,.tradeToken,.controlThoughtToken,.scaleDownThought,.stamped,.dramaThoughtBox,.shelfCard,.exactWordsWithImage,.tsFaceObject,.tsBubbleFaceHost,.tsStandardBubble,.tsThoughtLabelHost,.rainCloudUnit,.thoughtPotato,.weirdWordBubble"
    const texts = Array.from(root.querySelectorAll(".tsBubbleTextContainer,.tsExternalThoughtLabel,.tsExactUserText,.tsBubbleFaceText")).filter(vis)
    const hosts = new Set()
    let orphanText = 0
    const orphans = []
    texts.forEach((t) => {
        const h = t.closest(HOST)
        if (h && root.contains(h)) hosts.add(h)
        else {
            // user words on an object that shows no picture at all = an empty emotional object
            let n = t.parentElement, pic = false
            for (let k = 0; k < 4 && n && n !== root; k++, n = n.parentElement) if (Array.from(n.querySelectorAll("img")).some((im) => vis(im) && im.getBoundingClientRect().width >= 12)) { pic = true; break }
            if (pic) return
            orphanText++
            if (orphans.length < 4) orphans.push((t.className || "").toString().slice(0, 60) + ":" + (t.textContent || "").slice(0, 20))
        }
    })
    Array.from(root.querySelectorAll(HOST)).forEach((h) => {
        // nested hosts: keep the outermost host that is itself an emotional object
        if (vis(h)) hosts.add(h)
    })
    // drop hosts nested inside another host
    const list = Array.from(hosts).filter((h) => !Array.from(hosts).some((o) => o !== h && o.contains(h)))
    const lum = (c) => {
        const m = String(c).match(/rgba?\(([^)]+)\)/)
        if (!m) return null
        const [r, g, b, a = 1] = m[1].split(",").map((x) => parseFloat(x))
        return { l: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, a }
    }
    const out = []
    const v = { noPic: 0, notCircle: 0, cropped: 0, textOverPic: 0, textOutside: 0, darkMask: 0, phasePositiveAtStart: 0 }
    list.forEach((h) => {
        if (h.closest(".u107")) return
        const hr = h.getBoundingClientRect()
        if (hr.width < 18 || hr.height < 18) return
        const pics = Array.from(h.querySelectorAll("img")).filter((im) => vis(im) && im.getBoundingClientRect().width >= 12)
        const bgPics = Array.from(h.querySelectorAll("*")).filter((n) => {
            if (n.tagName === "IMG") return false
            const bi = getComputedStyle(n).backgroundImage
            return /url\(/.test(bi) && /(bubble-expressions|data:image)/.test(bi) && vis(n)
        })
        const pic = pics.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0] || bgPics[0] || null
        const rec = { cls: String(h.className || "").split(/\s+/).slice(0, 3).join("."), w: Math.round(hr.width), h: Math.round(hr.height), problems: [] }
        if (!pic) {
            rec.problems.push("noPic")
            v.noPic++
        } else {
            const pr = pic.getBoundingClientRect()
            rec.src = (pic.currentSrc || pic.src || getComputedStyle(pic).backgroundImage || "").slice(-28)
            const pcs = getComputedStyle(pic)
            let circle = false
            for (let n = pic; n && (n === h || h.contains(n)); n = n.parentElement) {
                const cs = getComputedStyle(n)
                const rr = n.getBoundingClientRect()
                const br = parseFloat(cs.borderTopLeftRadius) || 0
                const brPct = /%/.test(cs.borderTopLeftRadius) ? parseFloat(cs.borderTopLeftRadius) / 100 * rr.width : br
                const clips = n === pic || cs.overflow !== "visible" || /circle|ellipse/.test(cs.clipPath)
                if (clips && (brPct >= rr.width * 0.45 || /circle/.test(cs.clipPath)) && Math.abs(rr.width - rr.height) <= Math.max(3, rr.width * 0.04)) {
                    circle = true
                    break
                }
                if (n === h) break
            }
            if (!circle) {
                rec.problems.push("notCircle")
                v.notCircle++
            }
            if (pic.tagName === "IMG" && pic.naturalWidth && pic.naturalHeight && Math.abs(pic.naturalWidth / pic.naturalHeight - pr.width / pr.height) > 0.08 && pcs.objectFit === "cover") {
                rec.problems.push("cropped")
                v.cropped++
            }
            const m = String(pic.currentSrc || pic.src || "").match(/(glitch|drop|still|patch|loopie|rush|sync)_E(\d+)\.webp/)
            if (m) {
                const mood = Number(m[2])
                rec.phase = (POS[m[1]] || []).includes(mood) ? "pos" : (NEG[m[1]] || []).includes(mood) ? "neg" : "other"
            } else rec.phase = /data:image/.test(pic.src || "") ? "upload" : "none"
            const ts = Array.from(h.querySelectorAll(".tsBubbleTextContainer,.tsExternalThoughtLabel,.tsBubbleFaceText,.tsExactUserText")).filter(vis)
            const t = ts[0]
            if (t) {
                const tr = t.getBoundingClientRect()
                rec.text = (t.textContent || "").slice(0, 24)
                if (tr.top < pr.top + pr.height * 0.8 && tr.bottom > pr.top + 4 && tr.left < pr.right && tr.right > pr.left) {
                    rec.problems.push("textOverPic")
                    v.textOverPic++
                }
                const tol = 4
                if (tr.left < hr.left - tol || tr.right > hr.right + tol || tr.top < hr.top - tol || tr.bottom > hr.bottom + tol) {
                    rec.problems.push("textOutside")
                    v.textOutside++
                }
                // dark boxes behind the text / picture (between them and the host, host excluded)
                const dark = [t, pic].some((leaf) => {
                    for (let n = leaf; n && n !== h; n = n.parentElement) {
                        const L = lum(getComputedStyle(n).backgroundColor)
                        if (L && L.a >= 0.55 && L.l < 0.14) return true
                    }
                    return false
                })
                if (dark) {
                    rec.problems.push("darkMask")
                    v.darkMask++
                }
            }
        }
        out.push(rec)
    })
    v.phasePositiveAtStart = out.filter((r) => r.phase === "pos").length
    v.emptyObject = orphanText
    return { hosts: out, violations: v, orphanText, orphans, count: out.length }
}

export function parseIds(s) {
    const ids = []
    String(s).split(",").forEach((part) => {
        const m = part.match(/^(\d+)-(\d+)$/)
        if (m) for (let i = +m[1]; i <= +m[2]; i++) ids.push(i)
        else if (part) ids.push(+part)
    })
    return ids
}

async function main() {
    const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith("--") ? [...a, [x.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "1"]] : a), []))
    const [w, h] = String(args.size || "390x844").split("x").map(Number)
    const ids = parseIds(args.ids || "1-114")
    const uploads = Number(args.uploads || 0)
    const text = args.text || "deadline panic, angry at boss, cannot sleep"
    const { browser, context, page, errors } = await eos.launchEos({ width: w, height: h, lite: !args.shots, ...(args.dir ? { dir: args.dir } : {}) })
    await routeExpressions(context)
    await page.reload()
    await page.waitForTimeout(1200)
    if (uploads) await setUploads(page, uploads)
    const report = {}
    for (const id of ids) {
        const r = await eos.startGameById(page, id, text, { waitMs: 1800 }).catch((e) => ({ ok: false, why: String(e) }))
        if (!r.ok) {
            report[id] = { error: r.why || r.stage }
            await eos.resetToInput(page)
            continue
        }
        await page.waitForTimeout(600)
        const p = await page.evaluate(PROBE)
        p.name = r.name
        if (args.shots) await page.screenshot({ path: path.join(args.shots, `g${id}_${w}.png`) })
        if (args.finish && parseIds(args.finish).includes(id)) {
            const f = await eos.finishGame(page, id, { timeoutMs: 120000 }).catch((e) => ({ done: false, reason: String(e) }))
            p.finish = { done: f.done, reason: f.reason }
        }
        report[id] = p
        const pr = Object.entries(p.violations || {}).filter(([, n]) => n).map(([k, n]) => `${k}=${n}`).join(" ")
        console.log(`${id} ${r.name}: hosts=${p.count} orphan=${p.orphanText} ${pr}`)
        await eos.resetToInput(page)
    }
    report.__errors = errors.slice(0, 20)
    if (args.out) fs.writeFileSync(args.out, JSON.stringify(report, null, 1))
    const tot = {}
    for (const [id, r] of Object.entries(report)) if (r && r.violations) for (const [k, n] of Object.entries(r.violations)) tot[k] = (tot[k] || 0) + n
    console.log("TOTAL", JSON.stringify(tot), "games with noPic:", Object.entries(report).filter(([, r]) => r && r.violations && r.violations.noPic).map(([id]) => id).join(","))
    await browser.close()
}
if (process.argv[1] && process.argv[1].endsWith("f8_probe.mjs")) main()
