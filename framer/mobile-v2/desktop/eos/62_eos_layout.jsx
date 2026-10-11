// ===================================================================================
// EOS · 62 LAYOUT — founder feedback F2 (docs/founder/FEEDBACK_LOG.md): "there are so many containers
// overlapping and the button gets hidden in some games". ONE shared layout for every game and size, no
// per-game patches. Nothing is removed: the guide, its glyph, the HUD, the feedback copy and every control stay.
//
//   1. DOCK   the LIVE GUIDE is docked as ONE compact line in its own band at the bottom of the stage
//             (.cinematicContentShell). The game's stage root (> .arena, or the child the guard marks
//             [data-eos-stage]) is shortened by that band, so the guide RESERVES its space instead of floating
//             over the arena (before: a 100-120 px panel covered VACUUM's SUCK button, CONTROL PANEL's
//             RELEASE IT, CRUSH's tool …). MIND BEND / the header row fold away (MIND BEND already hid itself
//             after the first move); the step glyph + label + instruction stay on the line.
//   2. FOLD   long instructional paragraphs inside the arena (the 13 px grey ".literalStatus > span" copy of the
//             literal games: "The word stays full-size … rubbish-bag intake") fold away — the one-line guide
//             carries the instruction (CONTROL PANEL's helper line too). Any other own-text paragraph (>= 60 chars, never the user's words) that
//             lands on a control or a user word is hidden while it overlaps.
//   3. FEEDBACK  the step feedback copy (was centred on the tap point = on the control just tapped) goes to the
//             bottom-right of the stage above the band, or the nearest free corner; never over a control/word.
//      Guide-arrow LABEL pills that land on a control or a user word fold too (the hand keeps pointing).
//      The emotion COMPANION orb slides to a free spot when its corner lands on a control / user word.
//   4. WATCHDOG  every 400 ms (and on resize) it measures the real rects: if the docked line still touches a
//             control (a game that places a control outside its stage), the guide shrinks to its glyph chip
//             in a free bottom corner, then steps aside (hidden) — and comes back when the space is free.
// Wired by I3-E8 (dev/eos_integrate.py): <EosLayoutGuard game={selected} entries={renderedEntries} hostRef={gameHostRef} />
// Test: dev/f2_probe.mjs (elementFromPoint + painting-order probe on all games, start / mid / late).
// ===================================================================================

const EOS_LAYOUT_NOT_STAGE =
    ".globalPlayGuide,.cinematicStageFX,.characterEmotionUniverse,.globalFeedbackCopyLayer,[class*=RewardSurge],[class*=rewardSurge],[class*=Burst],[class*=burst],.eosArrowsRoot"
const EOS_LAYOUT_CONTROLS = "button,[role=button],[data-eos-tap],[data-eos-drag],[data-eos-hold],[data-eos-target]"

// the dock band and everything that leans on it. EOS_L carries 4 IDs of weight (one more than the core's EOS_A)
// so the per-game guide rules (TINY SOUNDTRACK, u102/u103/u107 …, readability's EOS_A panel rules) cannot pull
// the panel back over the arena
const EOS_L = ".tsArcade.stage-play:not(#eosL1):not(#eosL2):not(#eosL3):not(#eosL4)"
const EOS_LAYOUT_CSS = `
${EOS_L}[data-eos-dock] .cinematicContentShell{--eos-dock-h:48px;}
@media (max-width:760px){${EOS_L}[data-eos-dock] .cinematicContentShell{--eos-dock-h:44px;}}
${EOS_L}[data-eos-dock]:not([data-eos-dock="off"]) .cinematicContentShell>:is(.arena,[data-eos-stage]){height:calc(100% - var(--eos-dock-h))!important;max-height:calc(100% - var(--eos-dock-h))!important;min-height:0!important;}
${EOS_L}[data-eos-dock] .cinematicContentShell>.globalPlayGuide{position:absolute!important;top:auto!important;right:auto!important;bottom:5px!important;left:50%!important;translate:none!important;transform:translateX(-50%)!important;width:min(720px,calc(100% - 16px))!important;max-width:none!important;min-width:0!important;height:calc(var(--eos-dock-h) - 9px)!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0 12px 0 6px!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:8px!important;overflow:hidden!important;border-radius:14px!important;z-index:60!important;box-sizing:border-box!important;}
${EOS_L}[data-eos-dock] .cinematicContentShell>.globalPlayGuide :is(.guideHeaderRow,.globalMindBend){display:none!important;}
${EOS_L}[data-eos-dock] .cinematicContentShell>.globalPlayGuide .guideStepCard{position:relative!important;inset:auto!important;flex:1 1 auto!important;min-width:0!important;width:auto!important;height:100%!important;min-height:0!important;margin:0!important;padding:0 0 0 36px!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:8px!important;background:none!important;border:0!important;box-shadow:none!important;transform:none!important;}
${EOS_L}[data-eos-dock] .cinematicContentShell>.globalPlayGuide .guideActionArrow{position:absolute!important;left:0!important;top:50%!important;transform:translateY(-50%)!important;width:28px!important;height:28px!important;margin:0!important;}
${EOS_L}[data-eos-dock] .cinematicContentShell>.globalPlayGuide .guideStepCard>small{flex:0 0 auto!important;margin:0!important;white-space:nowrap!important;}
${EOS_L}[data-eos-dock] .cinematicContentShell>.globalPlayGuide .guideStepCard>span{flex:1 1 0!important;min-width:0!important;width:auto!important;max-width:none!important;margin:0!important;font-size:13px!important;line-height:1.15!important;white-space:normal!important;overflow:hidden!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;text-overflow:ellipsis!important;}
@media (max-width:420px){${EOS_L}[data-eos-dock] .cinematicContentShell>.globalPlayGuide .guideStepCard>small{display:none!important;}}
/* watchdog fallbacks: a glyph chip in a free bottom corner, then aside (the band stays reserved) */
${EOS_L}[data-eos-dock="chip"] .cinematicContentShell>.globalPlayGuide{width:40px!important;padding:0!important;left:var(--eos-chip-x,8px)!important;transform:none!important;justify-content:center!important;}
${EOS_L}[data-eos-dock="chip"] .cinematicContentShell>.globalPlayGuide .guideStepCard{padding:0!important;justify-content:center!important;}
${EOS_L}[data-eos-dock="chip"] .cinematicContentShell>.globalPlayGuide .guideStepCard>:is(small,span){display:none!important;}
${EOS_L}[data-eos-dock="chip"] .cinematicContentShell>.globalPlayGuide .guideActionArrow{left:50%!important;transform:translate(-50%,-50%)!important;}
${EOS_L}[data-eos-dock="aside"] .cinematicContentShell>.globalPlayGuide{visibility:hidden!important;}
/* FEEDBACK: the step feedback copy is a light bottom-right note above the band (was centred on the tap point, i.e.
   on the control just tapped); the watchdog moves it to a free corner, or hides it, when that spot holds a control */
${EOS_L}[data-eos-dock] .cinematicContentShell>.globalFeedbackCopyLayer{left:auto!important;top:auto!important;right:10px!important;bottom:calc(var(--eos-dock-h) + 8px)!important;translate:none!important;width:auto!important;min-width:0!important;max-width:min(260px,62%)!important;}
${EOS_L}[data-eos-dock] .cinematicContentShell>.globalFeedbackCopyLayer[data-eos-fb]{right:auto!important;bottom:auto!important;left:var(--eos-fb-x)!important;top:var(--eos-fb-y)!important;}
/* FOLD: the long instruction paragraphs the probe finds in the stage (dev/f2_probe.mjs "para"): the literal games'
   13 px grey explanation (CRACK, STOMP, ZAP, LASER, SHRED, BURN, BIN, FLUSH, VACUUM …) and CONTROL PANEL's
   "TAP ONE OPTION TO DECIDE …" helper — the one-line guide carries the instruction */
${EOS_L}[data-eos-dock] .releaseGameHost :is(.literalStatus>span,.controlPanelHelper){display:none!important;}
${EOS_L}[data-eos-dock] [data-eos-fold]{visibility:hidden!important;}
`
// the NEXT element of a hidden-order game (60 fixes' EOS_LIVE_SELECTORS) paints above its siblings, so a stack of
// overlapping controls (FLOAT AWAY's three scissors at 390: the first one's centre hit the second) always takes
// the tap on the one the guide arrow points at
const EOS_LAYOUT_LIVE_CSS =
    typeof EOS_LIVE_SELECTORS !== "undefined" && Array.isArray(EOS_LIVE_SELECTORS) && EOS_LIVE_SELECTORS.length
        ? `${EOS_L}[data-eos-dock] .releaseGameHost :is(${EOS_LIVE_SELECTORS.join(",")}){z-index:30!important;}`
        : ""
eosCss("layout", EOS_LAYOUT_CSS + EOS_LAYOUT_LIVE_CSS)

function eosLayoutRect(el) {
    const b = el.getBoundingClientRect()
    return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }
}
function eosLayoutHit(a, b, pad = 0) {
    return a.l < b.r - pad && a.r > b.l + pad && a.t < b.b - pad && a.b > b.t + pad
}
function eosLayoutShown(el) {
    if (!el || !el.isConnected) return false
    for (let e = el, o = 1; e && e.nodeType === 1 && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e)
        if (cs.display === "none" || cs.visibility === "hidden") return false
        o *= Number(cs.opacity)
        if (o < 0.2) return false
    }
    return true
}

// the visible controls + the user's words of the stage (rects in viewport px)
function eosLayoutObstacles(shell, stage, words) {
    const out = []
    const seen = new Set()
    const add = (el, kind) => {
        if (seen.has(el)) return
        seen.add(el)
        if (el.closest(".globalPlayGuide,.globalFeedbackCopyLayer,.eosArrowsRoot")) return
        const r = eosLayoutRect(el)
        if (r.w < 10 || r.h < 10 || !eosLayoutShown(el)) return
        out.push({ el, kind, r })
    }
    shell.querySelectorAll(EOS_LAYOUT_CONTROLS).forEach((el) => {
        if (!el.disabled && getComputedStyle(el).pointerEvents !== "none") add(el, "control")
    })
    if (stage) {
        stage.querySelectorAll("*").forEach((el) => {
            const c = getComputedStyle(el).cursor
            if (!/pointer|grab/.test(c)) return
            const p = el.parentElement
            if (p && /pointer|grab/.test(getComputedStyle(p).cursor)) return
            add(el, "control")
        })
        if (words && words.size) {
            stage.querySelectorAll("span,b,strong,em,div,p,small,label").forEach((el) => {
                if (el.children.length) return
                const v = String(el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase()
                if (v && words.has(v)) add(el, "word")
            })
        }
    }
    return out
}

function EosLayoutGuard({ game, entries, hostRef }) {
    const id = Number(game && game.id) || 0
    const wordKey = Array.isArray(entries) ? entries.join("|") : ""
    const findRoot = React.useCallback(() => {
        const host = hostRef && hostRef.current
        return (host && host.closest && host.closest(".tsArcade")) || (typeof document !== "undefined" ? document.querySelector(".tsArcade") : null)
    }, [hostRef])

    // dock before the first paint of the game (layout effect) so a game that measures its arena on mount sees
    // the final size
    React.useLayoutEffect(() => {
        const root = findRoot()
        if (!root) return
        root.setAttribute("data-eos-dock", "line")
        return () => root.removeAttribute("data-eos-dock")
    }, [findRoot, id])

    React.useEffect(() => {
        if (typeof window === "undefined") return
        let alive = true
        const words = new Set(
            String(wordKey)
                .split("|")
                .map((w) => w.replace(/\s+/g, " ").trim().toLowerCase())
                .filter(Boolean)
        )
        let mode = "line"
        let calmTicks = 0
        const setMode = (root, m) => {
            if (mode === m) return
            mode = m
            root.setAttribute("data-eos-dock", m)
        }
        const tick = () => {
            if (!alive) return
            const root = findRoot()
            const host = hostRef && hostRef.current
            const shell = host && host.querySelector(".cinematicContentShell")
            if (!root || !shell) return
            const guide = shell.querySelector(":scope > .globalPlayGuide")
            // ---- stage root: the largest child of the shell that is not chrome / FX
            let stage = shell.querySelector(":scope > .arena")
            if (!stage) {
                let best = null
                let area = 0
                for (const c of shell.children) {
                    if (c.matches(EOS_LAYOUT_NOT_STAGE)) continue
                    const r = c.getBoundingClientRect()
                    if (r.width * r.height > area) {
                        area = r.width * r.height
                        best = c
                    }
                }
                stage = best
            }
            for (const c of shell.querySelectorAll(":scope > [data-eos-stage]")) if (c !== stage) c.removeAttribute("data-eos-stage")
            if (stage && !stage.classList.contains("arena") && !stage.hasAttribute("data-eos-stage")) stage.setAttribute("data-eos-stage", "1")
            // ---- no guide on screen (a game / phase that hides it): give the band back to the stage
            if (!guide || getComputedStyle(guide).display === "none") {
                setMode(root, "off")
                return
            }
            if (mode === "off") setMode(root, "line")
            const obstacles = eosLayoutObstacles(shell, stage, words)
            const sr = eosLayoutRect(shell)
            const dockH = parseFloat(getComputedStyle(shell).getPropertyValue("--eos-dock-h")) || 44
            // where the full line would sit (whatever mode is live now)
            const lineW = Math.min(720, sr.w - 16)
            const line = { l: sr.l + (sr.w - lineW) / 2, r: sr.l + (sr.w + lineW) / 2, b: sr.b - 5, t: sr.b - dockH + 4 }
            const clash = (rect) => obstacles.some((o) => eosLayoutHit(rect, o.r, 2))
            if (!clash(line)) {
                // hysteresis: two calm checks before a fallback returns to the line
                if (mode === "line" || ++calmTicks >= 2) {
                    calmTicks = 0
                    setMode(root, "line")
                }
            } else {
                calmTicks = 0
                const chipL = { l: sr.l + 8, r: sr.l + 48, t: line.t, b: line.b }
                const chipR = { l: sr.r - 48, r: sr.r - 8, t: line.t, b: line.b }
                if (!clash(chipL)) {
                    shell.style.setProperty("--eos-chip-x", "8px")
                    setMode(root, "chip")
                } else if (!clash(chipR)) {
                    shell.style.setProperty("--eos-chip-x", `${Math.round(sr.w - 48)}px`)
                    setMode(root, "chip")
                } else setMode(root, "aside")
            }
            // ---- FOLD: own-text paragraphs (>= 60 chars, never the user's words) that land on a control / word
            if (stage) {
                for (const el of stage.querySelectorAll("[data-eos-fold]")) {
                    el.removeAttribute("data-eos-fold")
                }
                for (const el of stage.querySelectorAll("p,small,span,div,em")) {
                    if (el.closest("button")) continue
                    const own = Array.from(el.childNodes)
                        .filter((c) => c.nodeType === 3)
                        .map((c) => c.textContent)
                        .join(" ")
                        .replace(/\s+/g, " ")
                        .trim()
                    if (own.length < 60) continue
                    const low = own.toLowerCase()
                    if (Array.from(words).some((w) => w.length > 2 && low.includes(w))) continue
                    const r = eosLayoutRect(el)
                    if (r.h <= 0) continue
                    if (obstacles.some((o) => !el.contains(o.el) && !o.el.contains(el) && eosLayoutHit(r, o.r, 2))) el.setAttribute("data-eos-fold", "1")
                }
            }
            // ---- guide-arrow labels (the hand stays): a label pill that lands on a control or a user word folds
            // away (VACUUM: "SUCK IT UP" sat on the "had enough" bubble, repeating the SUCK button)
            for (const el of document.querySelectorAll(".eosArrowsRoot [data-eos-arrows=label]")) {
                const r = eosLayoutRect(el)
                const over = r.w > 0 && obstacles.some((o) => eosLayoutHit(r, o.r, 2))
                if (over) el.setAttribute("data-eos-fold", "1")
                else el.removeAttribute("data-eos-fold")
            }
            // ---- COMPANION (the emotion orb): it keeps its corner unless that corner lands on a control or a
            // user word (BIN / UNHOOK bubbles at 390); then it slides (translate, its own top/right stay) to the
            // first free spot of the stage, and back when its corner is free again
            const comp = host.querySelector(".eosCompanion") || (root && root.querySelector(".eosCompanion"))
            if (comp && comp.isConnected && getComputedStyle(comp).display !== "none") { // (not eosLayoutShown: a folded orb must be re-checked)
                const cur = comp.__eosShift || [0, 0]
                const cr = eosLayoutRect(comp)
                const base = { l: cr.l - cur[0], r: cr.r - cur[0], t: cr.t - cur[1], b: cr.b - cur[1] }
                const at = ([dx, dy]) => ({ l: base.l + dx, r: base.r + dx, t: base.t + dy, b: base.b + dy })
                const inStage = (q) => q.l >= sr.l + 2 && q.r <= sr.r - 2 && q.t >= sr.t + 40 && q.b <= sr.b - dockH - 2
                const free = (sh) => inStage(at(sh)) && !clash(at(sh))
                if (!free(cur) || (cur[0] || cur[1])) {
                    const H = sr.h - dockH
                    const left = sr.l + 10 - base.l
                    const cand = [[0, 0], cur, [left, 0], [0, H * 0.3], [left, H * 0.3], [0, H * 0.5], [left, H * 0.5], [0, -H * 0.3], [left, -H * 0.3], [0, -H * 0.55], [left, -H * 0.55]]
                    const pick = cand.find(free)
                    const next = pick ? pick.map((v) => Math.round(v)) : cur
                    if (next[0] !== cur[0] || next[1] !== cur[1]) {
                        comp.__eosShift = next
                        if (next[0] || next[1]) comp.style.setProperty("translate", `${next[0]}px ${next[1]}px`, "important")
                        else comp.style.removeProperty("translate")
                    }
                    if (!pick && !free(cur)) comp.setAttribute("data-eos-fold", "1")
                    else comp.removeAttribute("data-eos-fold")
                } else comp.removeAttribute("data-eos-fold")
            }
            // ---- FEEDBACK: bottom-right above the band (CSS); if that spot holds a control / user word, the first
            // free corner (top-left of the layer in shell px, layout size = offsetWidth/Height, not the entry scale)
            for (const fb of shell.querySelectorAll(":scope > .globalFeedbackCopyLayer")) {
                const w = fb.offsetWidth
                const h = fb.offsetHeight
                if (w < 4 || h < 4) continue
                const top = sr.t + 44 // under the progress HUD
                const bottom = sr.b - dockH - 8
                const spots = [
                    [sr.r - 10 - w, bottom - h],
                    [sr.r - 10 - w, top],
                    [sr.l + 10, bottom - h],
                    [sr.l + 10, top],
                    [sr.r - 10 - w, (top + bottom - h) / 2],
                    [sr.l + 10, (top + bottom - h) / 2],
                ]
                const free = ([x, y]) => !clash({ l: x, r: x + w, t: y, b: y + h })
                const pick = spots.find(free)
                if (!pick) {
                    fb.setAttribute("data-eos-fold", "1") // no free spot: the burst + sound carry the beat
                    continue
                }
                fb.removeAttribute("data-eos-fold")
                if (pick === spots[0]) fb.removeAttribute("data-eos-fb")
                else {
                    fb.style.setProperty("--eos-fb-x", `${Math.round(pick[0] - sr.l)}px`)
                    fb.style.setProperty("--eos-fb-y", `${Math.round(pick[1] - sr.t)}px`)
                    fb.setAttribute("data-eos-fb", "1")
                }
            }
        }
        const iv = setInterval(tick, 400)
        const t0 = setTimeout(tick, 60)
        const mo = new MutationObserver(() => {
            // a new feedback layer / stage root: place it before it is noticed
            if (alive) requestAnimationFrame(tick)
        })
        const host = hostRef && hostRef.current
        const shell = host && host.querySelector(".cinematicContentShell")
        if (shell) mo.observe(shell, { childList: true })
        window.addEventListener("resize", tick)
        return () => {
            alive = false
            clearInterval(iv)
            clearTimeout(t0)
            mo.disconnect()
            window.removeEventListener("resize", tick)
            const root = findRoot()
            if (root && root.getAttribute("data-eos-dock") !== null) root.setAttribute("data-eos-dock", "line")
        }
    }, [findRoot, hostRef, id, wordKey])
    return null
}

eosExpose("layout", { EosLayoutGuard, eosLayoutObstacles })
