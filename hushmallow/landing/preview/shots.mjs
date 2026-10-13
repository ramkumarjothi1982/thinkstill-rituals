// Screenshots + checks of dist/ at the six target viewports.
//   node shots.mjs [full|hero|play] — writes shots/*.png and prints problems.
import http from "node:http"
import { readFileSync, existsSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
let pw
try { pw = require("playwright") } catch { pw = require("/opt/node22/lib/node_modules/playwright") }
const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, "dist")
const out = path.join(here, "shots")
mkdirSync(out, { recursive: true })
const types = { ".html": "text/html", ".js": "text/javascript", ".webp": "image/webp", ".css": "text/css" }
const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname)
    const f = path.join(dist, u === "/" ? "index.html" : u)
    if (!f.startsWith(dist) || !existsSync(f)) { res.writeHead(404); return res.end() }
    res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" })
    res.end(readFileSync(f))
}).listen(0)
const base = `http://127.0.0.1:${server.address().port}/`
export const VIEWPORTS = [[1440, 900], [1280, 800], [768, 1024], [390, 844], [375, 812], [320, 700]]
const mode = process.argv[2] || "full"
const browser = await pw.chromium.launch()
let problems = 0
for (const [w, h] of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 800, isMobile: w < 800 })
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.goto(base + "index.html", { waitUntil: "networkidle" })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1600)
    if (mode === "full") {
        // reveal-on-scroll content: walk down the page once, then back to the top
        const H = await page.evaluate(() => document.documentElement.scrollHeight)
        for (let y = 0; y < H; y += Math.round(h * 0.6)) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120) }
        await page.waitForTimeout(900)
    }
    const ov = await page.evaluate(() => {
        const W = document.documentElement.clientWidth
        const bad = []
        for (const el of document.querySelectorAll(".hm *")) {
            const r = el.getBoundingClientRect()
            if (r.width && (r.right > W + 1 || r.left < -1)) {
                // ignore things clipped by an overflow:hidden ancestor
                let p = el.parentElement, clipped = false
                while (p) { const s = getComputedStyle(p); if (s.overflow === "hidden" || s.overflowX === "hidden" || s.overflowX === "clip") { const pr = p.getBoundingClientRect(); if (pr.right <= W + 1 && pr.left >= -1) { clipped = true; break } } p = p.parentElement }
                if (!clipped) bad.push(`${el.className || el.tagName} ${Math.round(r.left)}..${Math.round(r.right)}`)
            }
        }
        return { scrollW: document.documentElement.scrollWidth, W, bad: bad.slice(0, 8) }
    })
    if (ov.scrollW > ov.W || ov.bad.length) { problems++; console.log(`[${w}] horizontal overflow`, ov) }
    if (errors.length) { problems++; console.log(`[${w}] errors`, errors) }
    if (mode === "full") await page.screenshot({ path: path.join(out, `full-${w}.png`), fullPage: true })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(out, `fold-${w}.png`) })
    await page.close()
}
await browser.close()
server.close()
console.log(problems ? `${problems} problem(s)` : "no overflow, no errors")
