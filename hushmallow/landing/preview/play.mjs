// Plays the page like a visitor and asserts each step. Writes shots/play-*.png.
//   node play.mjs
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
const types = { ".html": "text/html", ".js": "text/javascript", ".webp": "image/webp" }
const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname)
    if (u.startsWith("/signup") || u.startsWith("/login")) { res.writeHead(200, { "content-type": "text/html" }); return res.end("<p>app auth page</p>") }
    const f = path.join(dist, u === "/" ? "index.html" : u)
    if (!f.startsWith(dist) || !existsSync(f)) { res.writeHead(404); return res.end() }
    res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" })
    res.end(readFileSync(f))
}).listen(0)
const base = `http://127.0.0.1:${server.address().port}/`
const browser = await pw.chromium.launch()
let failures = 0
const ok = (cond, msg) => { console.log(`${cond ? "  ok " : "FAIL "} ${msg}`); if (!cond) failures++ }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function open(w, h, opts = {}) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800, reducedMotion: opts.reduced ? "reduce" : "no-preference" })
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.goto(base + "index.html" + (opts.query || ""), { waitUntil: "networkidle" })
    await page.evaluate(() => document.fonts.ready)
    await wait(1400)
    return { page, errors }
}
async function hold(page, locator, ms) {
    const box = await locator.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await wait(ms)
    await page.mouse.up()
}
async function touchHold(page, locator, ms) {
    // pointer events from a touch: dispatch through CDP so pointerType is "touch"
    const box = await locator.boundingBox()
    const x = box.x + box.width / 2, y = box.y + box.height / 2
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })
    await wait(ms)
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
    console.log(`\n=== ${w}x${h}`)
    const mobile = w < 800
    const press = mobile ? touchHold : hold
    const { page, errors } = await open(w, h)

    // hero squeeze
    const center = page.locator(".hm-center .hm-squish")
    ok((await center.getAttribute("aria-label")).includes("Pipzi"), "hero starts with Pipzi in the middle")
    // a happy squint while squeezed (eyelid layer drawn over the eyes)
    {
        const box = await center.boundingBox()
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2
        if (mobile) {
            const cdp = await page.context().newCDPSession(page)
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] })
            await wait(400)
            const clip = await page.locator(".hm-center .hm-lids").evaluate((el) => getComputedStyle(el).clipPath)
            ok(/inset\(0px 0px 3[5-9]/.test(clip), `Pipzi closes her eyes while squeezed (${clip})`)
            await wait(300)
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
        } else {
            await page.mouse.move(cx, cy); await page.mouse.down(); await wait(400)
            const clip = await page.locator(".hm-center .hm-lids").evaluate((el) => getComputedStyle(el).clipPath)
            ok(/inset\(0px 0px 3[5-9]/.test(clip), `Pipzi closes her eyes while squeezed (${clip})`)
            await wait(300); await page.mouse.up()
        }
    }
    await wait(500)
    ok((await page.locator(".hm-hero .hm-caption").innerText()).includes("Hey. Long day?"), "first squeeze says 'Hey. Long day?'")
    await page.screenshot({ path: path.join(out, `play-${w}-hero-squeeze.png`) })
    await page.locator(".hm-slot-0").click()
    await wait(700)
    ok((await center.getAttribute("aria-label")).includes("Noomi"), "tapping a side Mallow swaps it to the middle")
    const cta = page.locator(".hm-hero .hm-btn-primary")
    ok(await cta.isVisible(), "hero CTA visible above the fold")
    const ctaBox = await cta.boundingBox()
    ok(ctaBox.y + ctaBox.height < h, `hero CTA inside first screen (bottom ${Math.round(ctaBox.y + ctaBox.height)} < ${h})`)

    // anchor nav
    await page.locator(".hm-hero .hm-btn-ghost").click()
    await wait(1400)
    const howTop = await page.locator("#how").evaluate((el) => el.getBoundingClientRect().top)
    ok(Math.abs(howTop) < 120, `"See how hushmallow works" scrolls to How it works (top ${Math.round(howTop)})`)
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(500)
    await page.locator(".hm-hero .hm-btn-primary").click()
    await wait(1500)
    const tryTop = await page.locator("#try").evaluate((el) => el.getBoundingClientRect().top)
    ok(Math.abs(tryTop) < 120, `"Meet your Mallow" scrolls to the live preview (top ${Math.round(tryTop)})`)
    ok(await page.evaluate(() => document.activeElement?.classList.contains("hm-chip")), "…and lands on the first feeling")

    // FeelSense: rule-based, asks before assuming
    const sense = async (text) => { await page.locator("#hm-sense-input").fill(text); await page.locator(".hm-sense button[type=submit]").click(); await wait(700) }
    await sense("purple elephants")
    ok((await page.locator(".hm-pick-q").innerText()).includes("couldn't quite tell"), "FeelSense admits when it can't tell")
    await page.locator(".hm-pick-reset").click(); await wait(300)
    await sense("I'm not happy at all today")
    ok((await page.locator(".hm-say-bubble").innerText()).includes("feeling a bit low. Did I get that right?"), "'not happy' reads as low, phrased as a question")
    await page.locator(".hm-ctl .hm-btn-ghost", { hasText: "Not quite" }).click(); await wait(500)
    ok((await page.locator(".hm-pick-q").innerText()).includes("Thanks for putting me right"), "'Not quite' lets the visitor correct it")
    await page.locator(".hm-pick-reset").click(); await wait(300)
    await sense("honestly I want to die")
    ok(await page.locator(".hm-care-view").isVisible(), "crisis words show real-person support instead of a game")
    ok((await page.locator(".hm-care-view a").getAttribute("href")) === "https://findahelpline.com", "…with a helpline link")
    await page.locator(".hm-care-view .hm-btn-ghost").click(); await wait(400)
    await sense("work is too much and my inbox is a nightmare")
    ok((await page.locator(".hm-say-who").innerText()).includes("ZUZU") || (await page.locator(".hm-say-who").innerText()).includes("Zuzu"), "overwhelm goes to Zuzu")
    await page.locator(".hm-ctl .hm-btn-primary", { hasText: "Yes, that's it" }).click(); await wait(800)
    ok((await page.locator(".hm-cloud-text").innerText()).startsWith("work is too much"), "their own words go into the thought cloud")
    await page.locator(".hm-play-bar .hm-textbtn").first().click(); await wait(600)

    // the little moment
    await page.locator(".hm-chip", { hasText: "Anxious" }).click()
    await wait(900)
    ok((await page.locator(".hm-say-bubble").innerText()).includes("buzzing"), "Loomi greets for 'Anxious'")
    await page.locator(".hm-name-btn").click()
    await page.locator("#hm-name-input").fill("the big meeting")
    await page.locator(".hm-name-form button").click()
    await wait(300)
    ok((await page.locator(".hm-cloud-text").innerText()) === "the big meeting", "own words appear in the thought cloud")
    await page.locator(".hm-lab").scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(out, `play-${w}-demo-start.png`) })
    const sats0 = await page.locator(".hm-sat").count()

    const mallow = page.locator(".hm-squish-lab")
    // too short
    await press(page, mallow, 300)
    await wait(500)
    ok((await page.locator(".hm-ctl-note").innerText()).includes("A little longer"), "a quick tap asks for a longer, slower hold")
    for (let b = 1; b <= 3; b++) {
        if (b === 2) {
            // keyboard breath on the hold button
            await page.locator(".hm-hold").focus()
            await page.keyboard.down(" ")
            await wait(1500)
            await page.keyboard.up(" ")
        } else {
            await press(page, mallow, 1600)
        }
        await wait(3000)
        const on = await page.locator(".hm-dots span.is-on").count()
        ok(on === b, `breath ${b} counted (${on} dots)`)
        if (b === 1) await page.screenshot({ path: path.join(out, `play-${w}-demo-breath1.png`) })
    }
    const sats3 = await page.locator(".hm-sat").count()
    ok(sats3 < sats0, `what-if bubbles cleared as breaths add up (${sats0} → ${sats3})`)
    ok(await page.locator(".hm-ctl .hm-btn-primary", { hasText: "Let it float off" }).isVisible(), "choice offered after three breaths")
    await page.screenshot({ path: path.join(out, `play-${w}-demo-choice.png`) })
    await page.locator(".hm-ctl .hm-btn-primary", { hasText: "Let it float off" }).click()
    await wait(600)
    ok((await page.locator(".hm-say-bubble").innerText()).includes("the big meeting"), "drift line uses the visitor's own words")
    await wait(2600)
    await page.locator(".hm-chip", { hasText: "Still a lot" }).click()
    await wait(900)
    ok(await page.locator(".hm-care").isVisible(), "'Still a lot' shows the gentle support note")
    ok(await page.locator(".hm-done-title").isVisible(), "conversion moment appears after the demo")
    await page.locator(".hm-done").scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(out, `play-${w}-demo-done.png`) })

    // sign-up sheet, not configured
    await page.locator(".hm-done .hm-btn-primary").click()
    await wait(700)
    ok(await page.locator(".hm-sheet[role=dialog]").isVisible(), "account button opens the sign-up sheet")
    ok((await page.locator(".hm-sheet .hm-auth-sub").innerText()).includes("Loomi will be waiting"), "sheet remembers the Mallow from the demo")
    await page.screenshot({ path: path.join(out, `play-${w}-sheet.png`) })
    await page.locator(".hm-sheet .hm-auth-btn", { hasText: "Google" }).click()
    await wait(300)
    ok((await page.locator(".hm-sheet .hm-auth-msg").innerText()).includes("Setup needed"), "unconfigured sign-up shows a visible setup message (no silent failure)")
    await page.keyboard.press("Escape")
    await wait(600)
    ok((await page.locator(".hm-sheet").count()) === 0, "Escape closes the sheet")

    // try another feeling, auto mode, good feeling
    await page.locator(".hm-done .hm-btn-ghost").click()
    await wait(700)
    await page.locator(".hm-chip", { hasText: "Pretty good" }).click()
    await wait(800)
    await page.locator(".hm-play-bar .hm-textbtn", { hasText: "Do it for me" }).click()
    await wait(23000)
    ok(await page.locator(".hm-ctl .hm-btn-primary", { hasText: "Send it out" }).isVisible(), "'Do it for me' breathes three times on its own")
    await page.screenshot({ path: path.join(out, `play-${w}-demo-good.png`) })

    // pop thoughts
    const thoughts = page.locator(".hm-thought")
    await thoughts.nth(0).scrollIntoViewIfNeeded()
    for (let i = 0; i < 3; i++) await thoughts.nth(i).click()
    await wait(600)
    ok((await page.locator(".hm-thoughts-status").innerText()).startsWith("3 popped"), "popping thoughts updates the count")

    // meet
    await page.locator(".hm-round-r").scrollIntoViewIfNeeded()
    await page.locator(".hm-round-r").click()
    await wait(700)
    ok((await page.locator(".hm-meet-name").innerText()) === "Blubi", "next arrow moves Noomi → Blubi")
    await page.locator(".hm-tray-btn", { hasText: "Glitzi" }).click()
    await wait(700)
    ok((await page.locator(".hm-meet-name").innerText()) === "Glitzi", "tray picks Glitzi")
    await page.locator(".hm-meet-stage").scrollIntoViewIfNeeded()
    await press(page, page.locator(".hm-meet-fig .hm-squish"), 500)
    await wait(200)
    await page.screenshot({ path: path.join(out, `play-${w}-meet-glitzi.png`) })

    ok(errors.length === 0, `no page errors ${errors.join(" | ")}`)
    await page.close()

    // configured: buttons hand off to the app with context
    const cfg = await open(w, h, { query: `?signup=${encodeURIComponent(base + "signup")}&login=${encodeURIComponent(base + "login")}&terms=https://example.com/terms&privacy=https://example.com/privacy` })
    await cfg.page.locator(".hm-chip", { hasText: "Frustrated" }).click()
    await cfg.page.locator(".hm-nav .hm-btn-primary").click()
    await wait(600)
    await Promise.all([cfg.page.waitForURL(/\/signup/), cfg.page.locator(".hm-sheet .hm-auth-btn", { hasText: "Apple" }).click()])
    const u = new URL(cfg.page.url())
    ok(u.searchParams.get("method") === "apple" && u.searchParams.get("mode") === "signup" && u.searchParams.get("source") === "landing" && u.searchParams.get("feeling") === "frustrated" && u.searchParams.get("mallow") === "glitzi", `Apple hands off to sign-up URL (${u.search})`)
    await cfg.page.goBack()
    await wait(1200)
    await Promise.all([cfg.page.waitForURL(/\/login/), mobile ? cfg.page.locator(".hm-finale .hm-btn-outline-light").click() : cfg.page.locator(".hm-nav-login").click()])
    ok(cfg.page.url().includes("/login"), "Log in goes straight to the log-in URL")
    ok(cfg.errors.length === 0, `no page errors (configured) ${cfg.errors.join(" | ")}`)
    await cfg.page.close()
}

// remember my Mallow: opt-in, survives a reload, forgettable
{
    console.log("\n=== remember me 1440")
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    await page.goto(base + "index.html", { waitUntil: "networkidle" }); await wait(1200)
    ok((await page.evaluate(() => localStorage.getItem("hushmallow.mallow"))) === null, "nothing is remembered by default")
    await page.locator(".hm-tray-btn", { hasText: "Loomi" }).click(); await wait(400)
    const sw = page.locator(".hm-switch")
    await sw.scrollIntoViewIfNeeded(); await sw.click(); await wait(300)
    ok((await sw.getAttribute("aria-checked")) === "true" && (await page.evaluate(() => localStorage.getItem("hushmallow.mallow"))) === "loomi", "switching on saves only the Mallow's name")
    await page.reload({ waitUntil: "networkidle" }); await wait(2600)
    ok((await page.locator(".hm-center .hm-squish").getAttribute("aria-label")).includes("Loomi"), "a returning visitor's Mallow takes the middle")
    ok((await page.locator(".hm-hero .hm-caption").innerText()).includes("you're back"), "…and says hello")
    ok((await page.locator(".hm-finale-title").innerText()) === "Loomi is waiting.", "the final invitation uses their Mallow's name")
    await page.screenshot({ path: path.join(out, "play-1440-welcome-back.png") })
    await page.locator(".hm-forget").click(); await wait(300)
    ok((await page.evaluate(() => localStorage.getItem("hushmallow.mallow"))) === null, "'Forget me' clears it")
    ok(errors.length === 0, `no page errors ${errors.join(" | ")}`)
    await ctx.close()
}

// reduced motion: still fully playable
{
    console.log("\n=== reduced motion 390")
    const { page, errors } = await open(390, 844, { reduced: true })
    await page.locator(".hm-chip", { hasText: "A little overwhelmed" }).click()
    await wait(500)
    for (let b = 0; b < 3; b++) { await touchHold(page, page.locator(".hm-squish-lab"), 1300); await wait(1200) }
    ok(await page.locator(".hm-ctl .hm-btn-primary", { hasText: "Let it drift" }).isVisible(), "reduced motion: demo completes")
    await page.locator(".hm-ctl .hm-btn-ghost", { hasText: "Keep it close" }).click()
    await wait(1300)
    await page.locator(".hm-chip", { hasText: "A bit lighter" }).click()
    await wait(600)
    ok(await page.locator(".hm-done-title").isVisible(), "reduced motion: reaches the invitation")
    ok(errors.length === 0, `no page errors ${errors.join(" | ")}`)
    await page.close()
}
await browser.close()
server.close()
console.log(failures ? `\n${failures} FAILED` : "\nall checks passed")
process.exit(failures ? 1 : 0)
