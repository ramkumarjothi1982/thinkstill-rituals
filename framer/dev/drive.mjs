// Test driver for the ThinkStill arcade harness.
// Usage from another script:
//   import { launch, startGame, listGames } from "./drive.mjs"
//   const { browser, page, errors } = await launch({ width: 1280, height: 860, dir: "/tmp/eos_x" /* isolated build dir, default framer/dev */ })
//   await startGame(page, "POP", "my boss yelled at me")   (menu hidden → dev hook window.__eos.pick.start)
// CLI: node drive.mjs "POP" [out.png] [width] [height]
import { chromium } from "playwright-core"
import path from "path"
import { fileURLToPath } from "url"
const here = path.dirname(fileURLToPath(import.meta.url))
export async function launch({ width = 1280, height = 860, dir = here, reducedMotion } = {}) {
    const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
    const page = await browser.newPage({ viewport: { width, height }, ...(reducedMotion ? { reducedMotion: "reduce" } : {}) })
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    await page.goto("file://" + path.join(dir, "index.html"))
    await page.waitForTimeout(1200)
    return { browser, page, errors }
}
// F3: the game menu is hidden for users (Framer property "Show game menu" / ?menu=1 in dev brings it back).
// Without it these helpers use the dev hook window.__eos.pick.start(id) and window.__eos.core.GAMES.
const MENU_BTN = "button.releaseChoiceButton:not(.eosPickGo)"
async function hasMenu(page) {
    return page.evaluate((sel) => !!document.querySelector(sel), MENU_BTN)
}
export async function listGames(page) {
    if (!(await hasMenu(page))) return page.evaluate(() => window.__eos.core.GAMES.map((g) => g.name))
    await page.locator("button.releaseChoiceButton").click()
    await page.waitForTimeout(400)
    const names = await page.$$eval("button.releaseChoiceItem", (els) => els.map((e) => e.innerText.trim()))
    await page.locator("button.releaseChoiceButton").click()
    return names.filter((n) => !/LET THINKSTILL/.test(n))
}
export async function startGame(page, name, text = "my boss yelled at me") {
    const inp = page.locator("input.releaseThoughtInput")
    if (await inp.count()) await inp.fill(text)
    if (!(await hasMenu(page))) {
        await page.evaluate((n) => {
            const g = window.__eos.core.GAMES.find((x) => x.name === n)
            return g ? window.__eos.pick.start(g.id) : false
        }, name)
        await page.waitForTimeout(2200)
        return
    }
    await page.locator("button.releaseChoiceButton").click()
    await page.waitForTimeout(400)
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    await page.locator("button.releaseChoiceItem", { hasText: new RegExp("^\\s*" + esc + "\\s*$") }).first().click()
    await page.waitForTimeout(2200)
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [name = "POP", out = path.join(here, "shots", "game.png"), w = 1280, h = 860] = process.argv.slice(2)
    const { browser, page, errors } = await launch({ width: +w, height: +h })
    await startGame(page, name)
    await page.screenshot({ path: out })
    console.log("saved", out, "errors:", errors.slice(0, 5))
    await browser.close()
}
