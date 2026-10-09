// BUBBLE FIT probe — PICTURES + TEXT (founder 2026-10-10: "check if any pics need zoom corrections inside the bubble ... do the
// same for text in the bubble as well. ultimately both pic and text must be fitting inside the bubbles and easier to read").
// Usage (cwd = framer/dev):
//   node pic_probe.mjs --size 390x844 --ids 1-114 [--uploads 0|1|3|6] [--phases start,mid,late] [--dir /tmp/build]
//                      [--out report.json] [--crops dir]   (crops: one PNG per flagged picture, tile them with contact_sheet.py)
// For every emotional bubble / object picture, at each phase of play, it maps the picture's real content through the
// rendered box (object-fit / background-size / object-position / CSS transforms) and the clipping chain (circle
// border-radius, clip-path circle, overflow) and flags:
//   cut       part of the character (its opaque silhouette, dev/pic_silhouettes.json) or of an uploaded photo (its
//             corners/edges) is clipped away  -> zoomed in too far / off-centre ("zoom correction needed")
//   small     the picture's own circle is < 48 px across (F8 minimum on a phone)
//   shrunk    the content fills < 60% of its circle (character) / photo diagonal < 80% of the circle -> zoomed out
//   distorted the drawn picture's aspect ratio differs > 4% from the image's (stretched / squashed at rest, seen in
//             two samples 350 ms apart so transient squash-and-stretch is not flagged)
//   offcentre the content's centre is > 12% of the radius away from the circle's centre
//   tinyInBubble the picture's circle is < 45% of its bubble (hard to see; F8 layout = picture in ~top 60%)
// TEXT (the user's words in each bubble/object): outside (a glyph line leaves the bubble's circle/shape), truncated (ellipsis or
//   clipped by an ancestor), small (< 15 px rendered), wordSplit (a word broken across lines), lines (> 3), overPic (> 15% of
//   the text over the picture), lowContrast (< 3.5:1 against the pixels behind it, measured from a screenshot).
// Uploads use fixtures of every shape (landscape 4:3, portrait 3:4, tall 9:16, square, panorama 2:1, wide 16:9) with
// a magenta frame so crops are also obvious by eye in the crop sheets.
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import * as eos from "./eos_drive.mjs"
import { routeExpressions, parseIds } from "./f8_probe.mjs"

const SIL = JSON.parse(fs.readFileSync(path.join(eos.HERE, "pic_silhouettes.json"), "utf8"))

const SHAPES = [[160, 120, "land"], [120, 160, "port"], [90, 160, "tall"], [140, 140, "square"], [200, 100, "pano"], [192, 108, "wide"]]
function png(w, h, rgb) {
    const raw = Buffer.alloc((w * 3 + 1) * h)
    const bw = Math.max(4, Math.round(Math.min(w, h) * 0.08))
    for (let y = 0; y < h; y++) {
        raw[y * (w * 3 + 1)] = 0
        for (let x = 0; x < w; x++) {
            const o = y * (w * 3 + 1) + 1 + x * 3
            const frame = x < bw || y < bw || x >= w - bw || y >= h - bw
            const dot = Math.hypot(x - w / 2, y - h / 2) < Math.min(w, h) * 0.18
            const c = frame ? [255, 0, 255] : dot ? [255, 255, 255] : rgb
            raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]
        }
    }
    const crcT = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1 } return ~c >>> 0 }
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
        const td = Buffer.concat([Buffer.from(type), data])
        const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(td) >>> 0 : crcT(td))
        return Buffer.concat([len, td, crc])
    }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])
}
const COLS = [[60, 120, 230], [60, 180, 90], [230, 160, 40], [40, 190, 200], [200, 70, 70], [130, 90, 220]]
export async function setShapeUploads(page, n) {
    await page.evaluate(() => window.__f8ClearUploads && window.__f8ClearUploads())
    if (!n) return
    const files = Array.from({ length: n }, (_, i) => { const [w, h, k] = SHAPES[i % SHAPES.length]; return { name: `pic_${k}_${i}.png`, mimeType: "image/png", buffer: png(w, h, COLS[i % COLS.length]) } })
    await page.locator("input.releaseHiddenFile").setInputFiles(files)
    await page.waitForTimeout(600)
}

// In-page measurement. sil = {file: [[u,v]...]} (only the files present on the page are passed in).
export const PIC_PROBE = (sil) => {
    const root = document.querySelector(".releaseGameHost")
    if (!root) return { error: "no game host" }
    const HOST = ".allCircularBubble,.wordBubble,.stompWordBubble,.laserTargetBubble,.catchTarget,.choiceObject,.cleanseStone,.chargeOrb,.multiEgg,.zapMultiBubble,.cutLoopWord,.unhookWordBubble,.binWordBubble,.doorThoughtBubble,.echoHoldBubble,.tinySoundBubble,.tugThoughtBubble,.xrayThoughtBubble,.magicTrapBubble,.echoSourceHold,.shelfThoughtBubble,.juggleBall,.coinReleaseBubble,.sinkWordBubble,.uniqWord,.vacuumCircleBubble,.eraseWordBubble,.keepDropCenterBubble,.priorityBubbleTray button,.spaceTile,.ownershipCard,.keepDropCard,.tradeToken,.controlThoughtToken,.scaleDownThought,.stamped,.dramaThoughtBox,.shelfCard,.exactWordsWithImage,.tsFaceObject,.tsBubbleFaceHost,.tsStandardBubble,.tsThoughtLabelHost,.rainCloudUnit,.thoughtPotato,.weirdWordBubble,ts-face"
    const vis = (el) => {
        if (!el || !el.isConnected) return false
        const r = el.getBoundingClientRect()
        if (r.width < 8 || r.height < 8) return false
        if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false
        for (let n = el; n && n !== document.body; n = n.parentElement) {
            const cs = getComputedStyle(n)
            if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.06) return false
        }
        return true
    }
    const pics = new Set()
    root.querySelectorAll("img").forEach((im) => { if (vis(im) && /bubble-expressions|_E\d+\.webp|^data:image|^blob:/.test(im.currentSrc || im.src || "") && im.closest(HOST)) pics.add(im) })
    root.querySelectorAll(HOST).forEach((h) => h.querySelectorAll("*").forEach((n) => {
        if (n.tagName === "IMG") return
        const bi = getComputedStyle(n).backgroundImage
        if (/url\(/.test(bi) && /(bubble-expressions|_E\d+\.webp|data:image|blob:)/.test(bi) && vis(n)) pics.add(n)
    }))
    const pct = (s, size) => (/%$/.test(s) ? (parseFloat(s) / 100) * size : parseFloat(s) || 0)
    const out = []
    pics.forEach((el) => {
        const R = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        const isImg = el.tagName === "IMG"
        let src = isImg ? el.currentSrc || el.src : (cs.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] || ""
        let nw = 0, nh = 0
        if (isImg) { nw = el.naturalWidth; nh = el.naturalHeight } else {
            const probe = new Image(); probe.src = src; nw = probe.naturalWidth; nh = probe.naturalHeight
        }
        if (!nw || !nh) return
        // CSS px -> screen px factor from transforms (getBoundingClientRect includes them)
        const kx = el.offsetWidth ? R.width / el.offsetWidth : 1
        const ky = el.offsetHeight ? R.height / el.offsetHeight : 1
        let dw, dh, posX = "50%", posY = "50%"
        const fit = isImg ? cs.objectFit : cs.backgroundSize
        if (isImg) {
            const [px, py] = (cs.objectPosition || "50% 50%").split(" "); posX = px || "50%"; posY = py || "50%"
            if (fit === "contain" || (fit === "scale-down" && (nw * kx > R.width || nh * ky > R.height))) { const s = Math.min(R.width / nw, R.height / nh); dw = nw * s; dh = nh * s }
            else if (fit === "cover") { const s = Math.max(R.width / nw, R.height / nh); dw = nw * s; dh = nh * s }
            else if (fit === "none" || fit === "scale-down") { dw = nw * kx; dh = nh * ky }
            else { dw = R.width; dh = R.height } // fill
        } else {
            const [px, py] = (cs.backgroundPosition || "50% 50%").split(" "); posX = px || "50%"; posY = py || "50%"
            if (fit === "contain") { const s = Math.min(R.width / nw, R.height / nh); dw = nw * s; dh = nh * s }
            else if (fit === "cover") { const s = Math.max(R.width / nw, R.height / nh); dw = nw * s; dh = nh * s }
            else if (fit === "auto" || fit === "auto auto") { dw = nw * kx; dh = nh * ky }
            else {
                const [a, b] = fit.split(" ")
                dw = a === "auto" ? null : pct(a, el.offsetWidth) * kx
                dh = !b || b === "auto" ? null : pct(b, el.offsetHeight) * ky
                if (dw == null && dh == null) { dw = nw * kx; dh = nh * ky } else if (dw == null) dw = dh * nw / nh; else if (dh == null) dh = dw * nh / nw
            }
        }
        const offX = /%$/.test(posX) ? (R.width - dw) * parseFloat(posX) / 100 : (parseFloat(posX) || 0) * kx
        const offY = /%$/.test(posY) ? (R.height - dh) * parseFloat(posY) / 100 : (parseFloat(posY) || 0) * ky
        const D = { x: R.left + offX, y: R.top + offY, w: dw, h: dh }
        // clipping chain: the element itself (border-radius on an IMG clips its content) + ancestors up to the stage
        const clips = []
        for (let n = el; n && n !== root.parentElement; n = n.parentElement) {
            const c = getComputedStyle(n)
            const r = n.getBoundingClientRect()
            const rad = /%/.test(c.borderTopLeftRadius) ? parseFloat(c.borderTopLeftRadius) / 100 * r.width : parseFloat(c.borderTopLeftRadius) || 0
            const clipsContent = n === el || c.overflow !== "visible" || c.clipPath !== "none"
            if (!clipsContent) continue
            const m = /circle\(([\d.]+)%/.exec(c.clipPath)
            if (m) { const rr = parseFloat(m[1]) / 100 * Math.hypot(r.width, r.height) / Math.SQRT2; clips.push({ kind: "circle", cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: Math.min(rr, Math.min(r.width, r.height) / 2 + 0.5) }) }
            else if (rad >= Math.min(r.width, r.height) * 0.45 && Math.abs(r.width - r.height) <= Math.max(3, r.width * 0.05)) clips.push({ kind: "circle", cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2 })
            else if (n !== el && c.overflow !== "visible") clips.push({ kind: "rect", x: r.left, y: r.top, w: r.width, h: r.height })
            if (clips.length >= 4) break
        }
        const circle = clips.find((c) => c.kind === "circle") || null
        const file = (String(src).match(/([a-z]+_E\d+\.webp)/i) || [])[1] || null
        const upload = /^data:image|^blob:/.test(src)
        let pts = file && sil[file] ? sil[file] : null
        if (!pts) pts = [[0.01, 0.01], [0.5, 0.01], [0.99, 0.01], [0.99, 0.5], [0.99, 0.99], [0.5, 0.99], [0.01, 0.99], [0.01, 0.5]]
        const P = pts.map(([u, v]) => [D.x + u * D.w, D.y + v * D.h])
        let cut = 0, worst = 0
        P.forEach(([x, y]) => {
            let out1 = 0
            clips.forEach((c) => {
                if (c.kind === "circle") { const d = Math.hypot(x - c.cx, y - c.cy) - c.r; if (d > out1) out1 = d }
                else { const d = Math.max(c.x - x, x - (c.x + c.w), c.y - y, y - (c.y + c.h)); if (d > out1) out1 = d }
            })
            if (out1 > 1.5) { cut++; worst = Math.max(worst, out1) }
        })
        const rec = { cls: String(el.className || el.tagName).split(/\s+/).slice(0, 2).join("."), host: String((el.closest(HOST) || el).className || "").split(/\s+/).slice(0, 2).join("."), src: upload ? "upload" : file || String(src).slice(-24), fit, nw, nh, box: [Math.round(R.left), Math.round(R.top), Math.round(R.width), Math.round(R.height)], flags: [] }
        if (cut) rec.flags.push(`cut:${Math.round((cut / P.length) * 100)}%/${Math.round(worst)}px`)
        const circ = circle || { cx: R.left + R.width / 2, cy: R.top + R.height / 2, r: Math.min(R.width, R.height) / 2 }
        rec.circle = Math.round(circ.r * 2)
        if (circ.r * 2 < 48) rec.flags.push(`small:${Math.round(circ.r * 2)}px`)
        const reach = Math.max(...P.map(([x, y]) => Math.hypot(x - circ.cx, y - circ.cy)))
        const fill = reach / circ.r
        rec.fill = Math.round(fill * 100) / 100
        if (upload ? fill < 0.8 : fill < 0.6) rec.flags.push(`shrunk:${Math.round(fill * 100)}%`)
        const ar = (dw / dh) / (nw / nh)
        rec.aspect = Math.round(ar * 100) / 100
        if (Math.abs(ar - 1) > 0.04) rec.flags.push(`distorted:${rec.aspect}`)
        const ccx = P.reduce((s, p) => s + p[0], 0) / P.length, ccy = P.reduce((s, p) => s + p[1], 0) / P.length
        const off = Math.hypot(ccx - circ.cx, ccy - circ.cy) / circ.r
        if (off > 0.12) rec.flags.push(`offcentre:${Math.round(off * 100)}%`)
        // picture too small for its bubble: F8 layout = picture in about the top 60% of the bubble
        const hostEl = el.closest(HOST)
        if (hostEl) {
            const hr = hostEl.getBoundingClientRect()
            const ratio = (circ.r * 2) / Math.min(hr.width, hr.height)
            rec.ratio = Math.round(ratio * 100) / 100
            if (hostEl !== el && ratio < 0.45 && Math.min(hr.width, hr.height) >= 60) rec.flags.push(`tinyInBubble:${Math.round(ratio * 100)}%`)
        }
        out.push(rec)
    })
    return { pics: out }
}

// TEXT inside emotional bubbles / objects: fits inside the bubble's shape, not truncated, >= 15 px, no word split
// across lines, <= 3 lines, not over the picture. Contrast is measured in node from a screenshot (see measure()).
export const TEXT_PROBE = () => {
    const root = document.querySelector(".releaseGameHost")
    if (!root) return { error: "no game host" }
    const HOST = ".allCircularBubble,.wordBubble,.stompWordBubble,.laserTargetBubble,.catchTarget,.choiceObject,.cleanseStone,.chargeOrb,.multiEgg,.zapMultiBubble,.cutLoopWord,.unhookWordBubble,.binWordBubble,.doorThoughtBubble,.echoHoldBubble,.tinySoundBubble,.tugThoughtBubble,.xrayThoughtBubble,.magicTrapBubble,.echoSourceHold,.shelfThoughtBubble,.juggleBall,.coinReleaseBubble,.sinkWordBubble,.uniqWord,.vacuumCircleBubble,.eraseWordBubble,.keepDropCenterBubble,.priorityBubbleTray button,.spaceTile,.ownershipCard,.keepDropCard,.tradeToken,.controlThoughtToken,.scaleDownThought,.stamped,.dramaThoughtBox,.shelfCard,.exactWordsWithImage,.tsFaceObject,.tsBubbleFaceHost,.tsStandardBubble,.tsThoughtLabelHost,.rainCloudUnit,.thoughtPotato,.weirdWordBubble"
    const SKIP = /^(?:\d+\s*\/\s*\d+|\d+%|[x×]\d+|choose|locked|silenced|released|pull|drop|keep|fact|story|unsure|tap|hold|press|done|ready|pop it!?|go|ok|\W*)$/i
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
    const hosts = Array.from(root.querySelectorAll(HOST)).filter(vis).filter((h, i, a) => !a.some((o) => o !== h && o.contains(h)))
    const out = []
    hosts.forEach((h) => {
        if (h.closest(".u107")) return
        // the shape the text must stay inside: the host, or its first circular ancestor/descendant wrapper
        const hr = h.getBoundingClientRect()
        if (hr.width < 30 || hr.height < 24) return
        const hcs = getComputedStyle(h)
        const rad = /%/.test(hcs.borderTopLeftRadius) ? parseFloat(hcs.borderTopLeftRadius) / 100 * hr.width : parseFloat(hcs.borderTopLeftRadius) || 0
        // round hosts (border-radius >= 45%) are circles, or ellipses when not square (e.g. an 84x92 bubble)
        const isRound = rad >= Math.min(hr.width, hr.height) * 0.45
        const shape = isRound ? { kind: Math.abs(hr.width - hr.height) <= Math.max(4, hr.width * 0.06) ? "circle" : "ellipse", cx: hr.left + hr.width / 2, cy: hr.top + hr.height / 2, r: Math.min(hr.width, hr.height) / 2, rx: hr.width / 2, ry: hr.height / 2 } : { kind: "rect", x: hr.left, y: hr.top, w: hr.width, h: hr.height, rad }
        const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.textContent.trim().length >= 2 && !SKIP.test(t.textContent.trim()) && vis(t.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) })
        const nodes = []
        for (let t = walker.nextNode(); t; t = walker.nextNode()) nodes.push(t)
        if (!nodes.length) return
        const pic = Array.from(h.querySelectorAll("img")).filter((im) => vis(im) && im.getBoundingClientRect().width >= 12).sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0]
        const pr = pic ? pic.getBoundingClientRect() : null
        const rec = { host: String(h.className || "").split(/\s+/).slice(0, 2).join("."), text: nodes.map((t) => t.textContent.trim()).join(" ").slice(0, 40), shape: shape.kind, box: [Math.round(hr.left), Math.round(hr.top), Math.round(hr.width), Math.round(hr.height)], flags: [] }
        let outside = 0, worst = 0, minPx = 99, tops = new Set(), split = 0, overPic = 0, lineArea = 0
        const lb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }
        nodes.forEach((t) => {
            const el = t.parentElement
            const cs = getComputedStyle(el)
            const k = el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1
            minPx = Math.min(minPx, parseFloat(cs.fontSize) * (k || 1))
            rec.color = cs.color
            const range = document.createRange()
            range.selectNodeContents(t)
            Array.from(range.getClientRects()).forEach((r) => {
                if (r.width < 2 || r.height < 2) return
                tops.add(Math.round(r.top / 4))
                lb.x0 = Math.min(lb.x0, r.left); lb.y0 = Math.min(lb.y0, r.top); lb.x1 = Math.max(lb.x1, r.right); lb.y1 = Math.max(lb.y1, r.bottom)
                lineArea += r.width * r.height
                // inset the glyph box a little (line boxes include side bearing / half-leading)
                const ix = Math.min(2, r.width * 0.04), iy = r.height * 0.18
                const pts = [[r.left + ix, r.top + iy], [r.right - ix, r.top + iy], [r.left + ix, r.bottom - iy], [r.right - ix, r.bottom - iy]]
                pts.forEach(([x, y]) => {
                    let d = 0
                    if (shape.kind === "circle") d = Math.hypot(x - shape.cx, y - shape.cy) - shape.r
                    else if (shape.kind === "ellipse") { const q = Math.hypot((x - shape.cx) / shape.rx, (y - shape.cy) / shape.ry); d = (q - 1) * Math.min(shape.rx, shape.ry) }
                    else d = Math.max(shape.x - x, x - (shape.x + shape.w), shape.y - y, y - (shape.y + shape.h))
                    if (d > 1.5) { outside++; worst = Math.max(worst, d) }
                })
                if (pr) {
                    const ox = Math.max(0, Math.min(r.right, pr.right) - Math.max(r.left, pr.left)), oy = Math.max(0, Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top))
                    overPic += ox * oy
                }
            })
            // a word broken across two lines (letters of one word on different lines)
            const s = t.textContent
            let prevTop = null
            for (let i = 0; i < s.length; i++) {
                if (/\s/.test(s[i])) { prevTop = null; continue }
                range.setStart(t, i); range.setEnd(t, i + 1)
                const rr = range.getClientRects()[0]
                if (!rr) continue
                if (prevTop != null && Math.abs(rr.top - prevTop) > rr.height * 0.5) split++
                prevTop = rr.top
            }
            // truncated by an ancestor that clips (up to the host)
            for (let n = el; n && (n === h || h.contains(n)); n = n.parentElement) {
                const c = getComputedStyle(n)
                if (c.textOverflow === "ellipsis" && n.scrollWidth > n.clientWidth + 1) { rec.flags.push("truncated:ellipsis"); break }
                if (c.overflow !== "visible" && (n.scrollWidth > n.clientWidth + 2 || n.scrollHeight > n.clientHeight + 2) && n !== h) { rec.flags.push("truncated:clip"); break }
                if (n === h) break
            }
        })
        rec.px = Math.round(minPx * 10) / 10
        rec.lines = tops.size
        rec.textBox = lb.x1 > lb.x0 ? [Math.round(lb.x0), Math.round(lb.y0), Math.round(lb.x1 - lb.x0), Math.round(lb.y1 - lb.y0)] : null
        if (outside) rec.flags.push(`outside:${Math.round(worst)}px`)
        if (minPx < 15) rec.flags.push(`small:${rec.px}px`)
        if (split) rec.flags.push(`wordSplit:${split}`)
        if (tops.size > 3) rec.flags.push(`lines:${tops.size}`)
        if (lineArea && overPic / lineArea > 0.15) rec.flags.push(`overPic:${Math.round((overPic / lineArea) * 100)}%`)
        out.push(rec)
    })
    return { texts: out }
}

function lum8(r, g, b) {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
// contrast of the text colour against the pixels around it (median of the pixels that are not text-coloured)
async function textContrast(page, t, W, H) {
    if (!t.textBox || !t.color) return null
    const [x, y, w, h] = t.textBox
    const clip = { x: Math.max(0, x - 2), y: Math.max(0, y - 2), width: Math.min(W - Math.max(0, x - 2), w + 4), height: Math.min(H - Math.max(0, y - 2), h + 4) }
    if (clip.width < 4 || clip.height < 4) return null
    const buf = await page.screenshot({ clip }).catch(() => null)
    if (!buf) return null
    const img = eos.decodePNG(buf)
    const m = String(t.color).match(/rgba?\(([^)]+)\)/)
    if (!m || !img) return null
    const [tr, tg, tb] = m[1].split(",").map((v) => parseFloat(v))
    const Lt = lum8(tr, tg, tb)
    const bg = []
    const ch = img.channels || 4
    for (let i = 0; i < img.width * img.height; i += 2) {
        const o = i * ch
        const r = img.data[o], g = img.data[o + 1], b = img.data[o + 2]
        if (Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb) > 90) bg.push(lum8(r, g, b))
    }
    if (bg.length < 20) return null
    bg.sort((a, b) => a - b)
    const Lb = bg[Math.floor(bg.length / 2)]
    return Math.round(((Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05)) * 10) / 10
}

async function measure(page, W, H) {
    const files = await page.evaluate(() => Array.from(new Set(Array.from(document.querySelectorAll(".releaseGameHost img, .releaseGameHost *")).map((n) => (n.tagName === "IMG" ? n.currentSrc || n.src : getComputedStyle(n).backgroundImage) || "").map((s) => (String(s).match(/([a-z]+_E\d+\.webp)/i) || [])[1]).filter(Boolean))))
    const sil = Object.fromEntries(files.map((f) => [f, SIL[f]]).filter(([, v]) => v))
    const a = await page.evaluate(PIC_PROBE, sil)
    const ta = await page.evaluate(TEXT_PROBE)
    await page.waitForTimeout(350)
    const b = await page.evaluate(PIC_PROBE, sil)
    const tb = await page.evaluate(TEXT_PROBE)
    if (a.error || b.error) return a.error ? a : b
    // a flag counts only if it is present in both samples (transient squash / pop animations are ignored)
    const near = (x, p) => Math.abs(x.box[0] - p.box[0]) < 24 && Math.abs(x.box[1] - p.box[1]) < 24
    const pics = a.pics.map((p) => {
        const q = b.pics.find((x) => x.src === p.src && near(x, p))
        const kinds = (q ? q.flags : []).map((f) => f.split(":")[0])
        return { ...p, flags: p.flags.filter((f) => kinds.includes(f.split(":")[0])) }
    })
    const texts = []
    for (const t of ta.texts || []) {
        const q = (tb.texts || []).find((x) => x.text === t.text && near(x, t))
        const kinds = (q ? q.flags : []).map((f) => f.split(":")[0])
        const rec = { ...t, flags: t.flags.filter((f) => kinds.includes(f.split(":")[0])) }
        const c = await textContrast(page, t, W, H)
        rec.contrast = c
        if (c != null && c < 3.5) rec.flags.push(`lowContrast:${c}`)
        texts.push(rec)
    }
    return { pics, n: pics.length, flagged: pics.filter((p) => p.flags.length).length, texts, nt: texts.length, tflagged: texts.filter((t) => t.flags.length).length }
}

async function main() {
    const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith("--") ? [...a, [x.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "1"]] : a), []))
    const [w, h] = String(args.size || "390x844").split("x").map(Number)
    const ids = parseIds(args.ids || "1-114")
    const uploads = Number(args.uploads || 0)
    const phases = String(args.phases || "start,mid,late").split(",")
    const text = args.text || "deadline panic, angry at boss, cannot sleep, rent is late, everyone is watching me"
    const crops = args.crops || null
    if (crops) fs.mkdirSync(crops, { recursive: true })
    const { browser, context, page, errors } = await eos.launchEos({ width: w, height: h, lite: true, ...(args.dir ? { dir: args.dir } : {}) })
    await routeExpressions(context)
    await page.reload()
    await page.waitForTimeout(1200)
    if (uploads) await setShapeUploads(page, uploads)
    const report = {}
    const tot = { pics: 0, flagged: 0, texts: 0, tflagged: 0 }
    for (const id of ids) {
        const r = await eos.startGameById(page, id, text, { waitMs: 1800 }).catch((e) => ({ ok: false, why: String(e) }))
        if (!r.ok) { report[id] = { error: r.why || r.stage }; await eos.resetToInput(page); continue }
        const g = { name: r.name, phases: {} }
        for (const ph of phases) {
            if (ph === "mid" || ph === "late") {
                const f = await eos.finishGame(page, id, { timeoutMs: ph === "mid" ? 6000 : 9000, stuckMs: 9000, assertArrows: false, finishWaitMs: 0 }).catch((e) => ({ done: false, reason: String(e) }))
                if (f.done) { g.phases[ph] = { skipped: "game finished" }; break }
            } else await page.waitForTimeout(700)
            const m = await measure(page, w, h)
            g.phases[ph] = m
            if (m.pics) {
                tot.pics += m.n; tot.flagged += m.flagged; tot.texts += m.nt || 0; tot.tflagged += m.tflagged || 0
                for (const p of m.pics) for (const f of p.flags) tot["pic." + f.split(":")[0]] = (tot["pic." + f.split(":")[0]] || 0) + 1
                for (const t of m.texts || []) for (const f of t.flags) tot["text." + f.split(":")[0]] = (tot["text." + f.split(":")[0]] || 0) + 1
                if (crops) {
                    let k = 0
                    const flaggedBoxes = [...m.pics.filter((p) => p.flags.length), ...(m.texts || []).filter((t) => t.flags.length)].slice(0, 4)
                    for (const p of flaggedBoxes) {
                        const pad = 18, [x, y, bw, bh] = p.box
                        const clip = { x: Math.max(0, x - pad), y: Math.max(0, y - pad), width: Math.min(w - Math.max(0, x - pad), bw + pad * 2), height: Math.min(h - Math.max(0, y - pad), bh + pad * 2 + 30) }
                        if (clip.width > 8 && clip.height > 8) await page.screenshot({ path: path.join(crops, `g${id}_${w}_${ph}_${k++}.png`), clip }).catch(() => {})
                    }
                }
            }
        }
        report[id] = g
        const line = Object.entries(g.phases).map(([ph, m]) => `${ph}: pics ${m.flagged ?? "-"}/${m.n ?? "-"}${m.pics ? " " + [...new Set(m.pics.flatMap((p) => p.flags.map((f) => f.split(":")[0])))].join(",") : ""} | text ${m.tflagged ?? "-"}/${m.nt ?? "-"}${m.texts ? " " + [...new Set(m.texts.flatMap((t) => t.flags.map((f) => f.split(":")[0])))].join(",") : ""}`).join("  ")
        console.log(`${id} ${r.name}: ${line}`)
        await eos.resetToInput(page)
    }
    report.__total = tot
    report.__errors = errors.slice(0, 20)
    if (args.out) fs.writeFileSync(args.out, JSON.stringify(report, null, 1))
    console.log("TOTAL", JSON.stringify(tot))
    console.log("games with flags:", Object.entries(report).filter(([k, g]) => !k.startsWith("__") && g.phases && Object.values(g.phases).some((m) => m.flagged || m.tflagged)).map(([id]) => id).join(","))
    await browser.close()
}
if (process.argv[1] && process.argv[1].endsWith("pic_probe.mjs")) main()
