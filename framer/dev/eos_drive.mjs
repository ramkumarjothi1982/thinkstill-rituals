// EOS test driver — reusable Playwright helpers for every ThinkStill Emotional OS task (docs/EOS_SPEC.md §12.3).
// Built on dev/drive.mjs. Chromium lives at /opt/pw-browsers/chromium (never run `playwright install`).
//
// BUILD FIRST (pick one), then point `dir` at it:
//   python3 build.py                                                       → framer/dev            (full build)
//   python3 build.py --dev-dir /tmp/eos_<task> --modules 00_eos_core.jsx,…  → isolated, NO integration edits
//   python3 dev/eos_integrate.py --dev-dir /tmp/eos_<task> --modules …     → scratch build WITH every
//        integration edit + auto-stubs (the acceptance surface for module / game tasks)
//
// USE FROM A SCRIPT (write throwaway scripts under /tmp; run them with cwd = framer/dev so imports resolve):
//   import * as eos from "/home/user/thinkstill-rituals/framer/dev/eos_drive.mjs"
//   const { browser, page, errors } = await eos.launchEos({ width: 1280, height: 860, dir: "/tmp/eos_x" })
//   await eos.startGameById(page, 2, "my boss yelled at me")          // any id in GAMES, 111+ once registered
//   const r = await eos.finishGame(page, 2)                            // → {done, ms, progressLog, stages, …}
//   console.log(await eos.smallText(page, 12), errors)
//   await browser.close()
//
// API (all async unless noted; `page` = a Playwright Page):
//   launchEos({width, height, dir, reducedMotion, timezoneId, storage, query, waitMs, contextOptions, lite})
//       → {browser, context, page, errors, warnings, noise, close()}  errors = page errors + console errors;
//         warnings = React dev-build "Warning: …" messages + core "[eos]" registration warnings (review them:
//         "Cannot update a component while rendering" from an EOS module = a store write during render);
//         noise = network / agent-proxy chatter (ignored). Installs the in-page recorder (progress, stage,
//         pointer logs) and window.__eosArrowMiss = [] before any page script runs. `storage` = {key: value}
//         pre-seeds localStorage once (e.g. {eos_learned_v1: {"2": 5}} for veteran arrows). Headless Chromium
//         rasterises this UI in software at ~3-4 fps at 1280×860 (~9 at 390×844), and every pointer event waits
//         for a frame; lite:true hides the decoration-only layers (EOS_LITE_CSS: ambient glows, Pixar bokeh +
//         rig incl. .tsPxDust) for ~2× speed in GAMEPLAY sweeps — never for visual, dots or readability checks.
//   listGames(page, {withIds})        de-duplicated menu names (EosMenuGroup repeats some); withIds → [{id, name}]
//   gameIdByName(page, name) / gameNameById(page, id)
//   startGameById(page, id, text, {waitMs, skipCheckin})   → {ok, id, name, stage}  (falls back to the name)
//   startGameByName(page, name, text, opts)                → same; robust replacement for drive.startGame
//   resetToInput(page)                                     clicks × (clearForNext) → input stage
//   currentGameId(page)                                    id of the running game (store, else guide header)
//   openCheckin(page)                                      → {ok, via: "visible"|"chip"|"store"|null}
//   runCheckin(page, {emotion, intensity | dial, words, express, go, pickMyself, waitPlayMs})
//       emotion: an EOS_EMOTIONS id ("panic", "anger", … "good") or "auto"/null (NOT SURE).
//       → {ok, emotion, dial, step, stage, gameId, store}
//   finishGame(page, [id], {timeoutMs = 120000, stuckMs = 45000, perStage, assertArrows, alt: "pointer"|"keyboard", log})
//       Plays the running game to the reveal with the real gestures: EOS_GESTURES (the arrows module's table,
//       else the copy in docs/EOS_SPEC.md §3.11) for ids ≤ 110, the engines' data-eos-* markers for 111+
//       (no marker = automatic phase → it waits; 8 s without one is noted as a contract breach), and the §3.4
//       fallback list. Implements all 17 gestures (a hold whose marker turns into a drag while pressed — 111's
//       sip — is followed). Before each new stage it waits for the arrow (window.__eos.arrows.state(): 2.2 s
//       for the first stage, 1.5 s after) and records visibility + label; assertArrows: "auto" (check when the
//       arrows module is in the build) | true (a missing API is a miss) | false. alt:"keyboard" plays marker
//       games with Space/Enter/arrow keys (the §8.0 single-pointer / keyboard alternative).
//       → {id, name, done, ms, reason, finalProgress, progressLog:[{t, v}], stages:[{key, g, label, arrow…}],
//          actions, arrowsChecked, arrowMisses:[…], labelMismatches:[…], occluded, completeEarly, notes:[…]}
//   readProgress(page)                → 0-100 | null   (.engineProgressTrack[aria-valuenow])
//   progressLog(page, {reset, since}) → [{t, v}] every aria-valuenow change since launch / reset (ms = page clock)
//   stageLog(page) / pointerLog(page) → [{t, stage}] / [{t, x, y, type}]
//   smallText(page, minPx = 12, {includeHidden, scope})   → offenders [{text, px, sel, zone, n, src}]
//       DOM sweep (rendered px = computed font-size × ancestor scale; SVG text = bbox height) merged with
//       window.__eos.readability.scan() when that module is present.
//   textSizes(page, opts)             → [{key, text, px, sel, zone}] (every visible text element)
//   noShrink(page, baselineDir, setup, {minDelta}) → {shrunk:[…], compared, onlyHere, onlyBase}
//       Opens baselineDir at the same viewport, runs `await setup(basePage)` (bring it to the same state as
//       `page`), and lists text rendered smaller here than in the baseline.
//   arrowState(page)                  → {visible, g, label, stage, targetSelector, x, y, inViewport,
//                                         targetInViewport, count, source: "api"|"dom"|"none"}
//   lintCopy(page, {scope: "eos"|"all"}) → violations [{rule, term, text, where}] vs core EOS_COPY_RULES
//       (EOS_DISCLAIMER, .eosSafetyCard and the user's own .eosWord words are exempt)
//   flashCheck(page, ms = 2000, {selector, threshold, area}) → {ok, reliable, maxFlashesPerSecond, transitions,
//       flashes, frames, fps}  CDP screencast of the arena; a transition = ≥ `area` (10 %) of the region changing
//       relative luminance by ≥ `threshold` (0.1); a flash = two opposing transitions; ok = ≤ 3 flashes in any
//       1 s. reliable = ≥ 8 captured fps — use a 390×844 page (headless renders ~3 fps at 1280×860).
//   dotsNearCentre(page, {waitMs})    → {centre, n, closerFrac, nearEndN, nearEndFrac, byKind, animNames}
//   pixelVisible(page, x, y, {size, ring, hideSelector, threshold}) → {visible, delta, rgb, bg}
//   loadCoreNode({modules, globals})  → core (+ modules) evaluated in node with arcade stubs: pure
//       functions (eosDetectEmotion, EosSafetyScan, routes…) for unit tests and generators (flipdata).
//   specGestures()  (sync)            → EOS_GESTURES parsed from docs/EOS_SPEC.md §3.11
//   arcadeCss() / arcadeCssRules(re)  (sync) → the arcade's base CSS (decoded CSS_GZIP_B64 blob — NOT greppable in
//       the source) / the rules matching re (blob + the plain *_CSS strings): find the rule an override must beat.
//
// CHECK-IN DOM CONTRACT these helpers rely on (checkin module, §6.2): root `.eosCheckIn[data-step="1"|"2"]`;
// orbs = core EosCharacterOrb buttons (they carry data-eos-emotion="<id>", NOT SURE = "auto"); dial =
// `.eosCheckIn .eosDialTrack[role=slider]` (keyboard digits); CTA `[data-eos-cta]` or a button reading
// "…SHIFT IT…"; "more feelings" `[data-eos-more]` or /more feelings/; good day `[data-eos-good]` or /good day/;
// "pick a game myself" `[data-eos-pick]` or /pick a game/; "← back" `[data-eos-back]` or /back/; long-press
// (≥ 550 ms) on an orb = express; chip `.eosCheckInChip`. (Validated against a mock of this contract.)
//
// CLI (cwd = framer/dev):
//   node eos_drive.mjs smoke  [--dir D] [--id 1 | --name POP] [--text "…"] [--size 1280x860] [--shot out.png]
//   node eos_drive.mjs finish --id 2 [--dir D] [--size 390x844] [--keyboard]
//   node eos_drive.mjs sweep  [--ids 1-110,111] [--workers 2] [--dir D] [--size WxH] [--out file.json] [--render]
//        (finishGame for every id, lite mode unless --render; ~2 workers per 4 cores — more starves the raster)
//   node eos_drive.mjs small  --name POP [--min 12] [--dir D] [--size WxH]
//   node eos_drive.mjs lint   [--dir D]           (copy lint of the input stage EOS surfaces)
//   node eos_drive.mjs css    [--grep "binWordBubble"]   (the arcade's real CSS: gz blob + *_CSS strings)
import { chromium } from "playwright-core"
import fs from "fs"
import os from "os"
import path from "path"
import zlib from "zlib"
import { fileURLToPath, pathToFileURL } from "url"
import { createRequire } from "module"
import { launch as driveLaunch, startGame as driveStartGame, listGames as driveListGames } from "./drive.mjs"

export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.dirname(HERE) // framer/
export { driveLaunch, driveStartGame, driveListGames }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const NOISE = /agent-proxy|connect_rejected|Failed to load resource|net::ERR_|ERR_TUNNEL|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|favicon/i

// ======================================================================================= in-page library
// Serialised into the page (addInitScript + lazy evaluate). Must not reference anything outside itself.
function eosDrivePageLib() {
    if (window.__eosDrive && window.__eosDrive.lib) return
    const D = (window.__eosDrive = window.__eosDrive || { progress: [], stage: [], pointer: [] })
    if (!Array.isArray(window.__eosArrowMiss)) window.__eosArrowMiss = []
    const now = () => Math.round(performance.now())
    const q = (s, r = document) => {
        try {
            return r.querySelector(s)
        } catch {
            return null
        }
    }
    const qa = (s, r = document) => {
        try {
            return Array.from(r.querySelectorAll(s))
        } catch {
            return []
        }
    }
    const DEAD = /\b(dead|gone|popped|cut|loose|released|pulled|done|isDone|isGone|melted|binned|cooled|exploredDoor)\b/
    const EXCLUDE = ".globalPlayGuide, .engineProgressHud, .tsShiftRewardHud, .eosArrowLayer"
    const cls = (el) => (el && el.getAttribute && el.getAttribute("class")) || ""
    const host = () => q(".releaseGameHost") || q(".eosPreview")
    const arena = () => {
        const h = host()
        return (h && (q(".cinematicContentShell > .arena", h) || q(".arena", h))) || null
    }
    const track = () => {
        const h = host()
        return (h && q(".engineProgressTrack", h)) || q(".engineProgressTrack")
    }
    const progress = () => {
        const t = track()
        const v = t ? Number(t.getAttribute("aria-valuenow")) : NaN
        return Number.isFinite(v) ? v : null
    }
    const stageName = () => {
        const a = q(".tsArcade")
        const m = a && cls(a).match(/\bstage-(\w+)/)
        return m ? m[1] : null
    }
    // ---- recorder (progress / stage / pointer)
    let lastP = null
    let lastS = null
    const rec = () => {
        const p = progress()
        if (p !== lastP) {
            D.progress.push({ t: now(), v: p })
            if (D.progress.length > 4000) D.progress.splice(0, 1000)
            lastP = p
        }
        const s = stageName()
        if (s !== lastS) {
            D.stage.push({ t: now(), stage: s })
            lastS = s
        }
    }
    const startRec = () => {
        try {
            new MutationObserver((muts) => {
                for (const m of muts) {
                    const c = cls(m.target)
                    if (c.indexOf("engineProgressTrack") >= 0 || c.indexOf("tsArcade") >= 0) {
                        rec()
                        break
                    }
                }
            }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["aria-valuenow", "class"] })
        } catch {}
        setInterval(rec, 100)
        rec()
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startRec)
    else startRec()
    for (const type of ["pointerdown", "pointerup"])
        window.addEventListener(type, (e) => {
            D.pointer.push({ t: now(), type, x: Math.round(e.clientX), y: Math.round(e.clientY) })
            if (D.pointer.length > 2000) D.pointer.splice(0, 500)
        }, true)

    // ---- element helpers
    const visibleChain = (el) => {
        let n = el
        for (let i = 0; i < 4 && n && n.nodeType === 1; i++, n = n.parentElement) {
            const cs = getComputedStyle(n)
            if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false
        }
        return true
    }
    const stageRect = () => {
        const s = q(".releaseStage") || document.documentElement
        return s.getBoundingClientRect()
    }
    const usable = (el) => {
        if (!el || !el.getBoundingClientRect) return false
        const r = el.getBoundingClientRect()
        if (r.width < 12 || r.height < 12) return false
        const S = stageRect()
        if (r.right < S.left || r.left > S.right || r.bottom < S.top || r.top > S.bottom) return false
        if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false
        if (!visibleChain(el)) return false
        if (el.disabled || el.getAttribute("aria-disabled") === "true") return false
        if (el.closest(EXCLUDE)) return false
        if (DEAD.test(cls(el))) return false
        return true
    }
    const inEl = (el, x, y) => {
        const h = document.elementFromPoint(x, y)
        return !!h && (h === el || el.contains(h))
    }
    const describe = (el, i, ox, oy) => {
        const r = el.getBoundingClientRect()
        let x = r.left + r.width * (0.5 + (Number(ox) || 0))
        let y = r.top + r.height * (0.5 + (Number(oy) || 0))
        let occluded = false
        if (!inEl(el, x, y)) {
            const pts = [[0.5, 0.3], [0.5, 0.7], [0.3, 0.5], [0.7, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]
            const hit = pts.find(([fx, fy]) => inEl(el, r.left + r.width * fx, r.top + r.height * fy))
            if (hit) {
                x = r.left + r.width * hit[0]
                y = r.top + r.height * hit[1]
            } else occluded = true
        }
        // clamp into the viewport (some props hang off-screen)
        x = Math.max(2, Math.min(innerWidth - 2, x))
        y = Math.max(2, Math.min(innerHeight - 2, y))
        return { i, x: Math.round(x), y: Math.round(y), l: r.left, t: r.top, w: r.width, h: r.height, occluded, cls: cls(el).slice(0, 80), tag: el.tagName.toLowerCase(), text: (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60) }
    }
    let pickSeq = 0
    const tag = (el) => {
        const k = String(++pickSeq)
        try {
            el.setAttribute("data-eos-drive-pick", k)
        } catch {}
        return k
    }
    const near = (els, lx, ly) => {
        if (lx == null) {
            const S = stageRect()
            lx = S.left + S.width / 2
            ly = S.top + S.height / 2
        }
        let best = els[0]
        let bd = Infinity
        for (const e of els) {
            const r = e.getBoundingClientRect()
            const d = Math.hypot(r.left + r.width / 2 - lx, r.top + r.height / 2 - ly)
            if (d < bd) {
                bd = d
                best = e
            }
        }
        return best
    }
    const markerSpec = (el) => {
        const d = el.dataset || {}
        const num = (v) => (v == null || v === "" ? undefined : Number(v))
        return {
            g: d.eosG || "tap", dir: d.eosDir, d: num(d.eosD), n: num(d.eosN), ms: num(d.eosMs), to: d.eosTo, bpm: num(d.eosBpm), L: d.eosLabel,
            win: d.eosWin ? d.eosWin.split(",").map(Number) : undefined, meter: d.eosMeter, mvar: d.eosMvar, armed: d.eosArmed,
            maxSpeed: num(d.eosMaxSpeed), own: d.eosOwn === "1", ox: num(d.eosOx), oy: num(d.eosOy),
        }
    }
    const FALLBACK = [".arena button:not(:disabled)", "button.uniqControl:not(:disabled)", '.arena [style*="touch-action: none"]', ".uniqWord", "[class*=ToolDock]", ".tsThoughtLabelHost", "[class*=ToolButton]", "[class*=ActivateBtn]", "button.wordBubble"]
    // Mirrors the arrows overlay's target resolution (docs/EOS_SPEC.md §3.4).
    const resolve = (stages, st) => {
        const A = arena()
        if (!A) return { ok: false, why: "no arena" }
        qa("[data-eos-drive-pick]").forEach((e) => e.removeAttribute("data-eos-drive-pick"))
        const lx = st && st.lastX
        const ly = st && st.lastY
        // 1. explicit markers (new games)
        const marks = qa('[data-eos-target="1"]', A).filter(usable)
        if (marks.length) {
            const first = markerSpec(marks[0])
            const list = first.g === "choose" ? marks.filter((m) => (m.dataset.eosG || "") === "choose").slice(0, 6) : [marks[0]]
            const targets = list.map((el, i) => ({ ...describe(el, i, first.ox, first.oy), pick: tag(el) }))
            let to = null
            if (first.to) {
                const z = q(first.to, A) || q(first.to)
                if (z) to = describe(z, 0)
            }
            const meterEl = first.meter ? q(first.meter, A) : null
            // stage identity = gesture + element + option count (a live count in the label is the same stage)
            const ident = cls(marks[0]).split(/\s+/).filter((k) => k && !/^(is[A-Z]\w*|active|on|hot|live)$/.test(k)).slice(0, 3).join(".")
            return { ok: true, kind: "marker", key: `m:${first.g}:${ident}:${list.length}`, spec: first, g: first.g, targets, to, hasMeter: !!meterEl, label: first.L || null }
        }
        // new games (111+) mark every live target; no marker = an automatic phase (exhale, transition) → wait
        if (st && st.markersOnly && !st.allowFallback) return { ok: false, why: "no marker (automatic phase)" }
        // 2. per-game stages
        const once = (st && st.once) || []
        const touched = (st && st.touched) || []
        for (let i = 0; i < (stages || []).length; i++) {
            const s = stages[i]
            if (s.when && !q(s.when, A)) continue
            if (s.once && once.includes(i)) continue
            if (s.until === "touch" && touched.includes(i)) continue
            if (s.g === "wait") return { ok: true, kind: "stage", i, key: `s:${i}`, spec: s, g: "wait", targets: [], label: s.L || null }
            let els = qa(s.t, A).filter(usable)
            if (s.g === "tool" && s.armed) els = els.filter((e) => !e.matches(s.armed))
            if (s.g === "type") els = els.filter((e) => !String(e.value || "").trim())
            if (!els.length) continue
            let chosen
            if (s.g === "choose") chosen = els.slice(0, 6)
            else if (s.pick === "near") chosen = [near(els, lx, ly)]
            else chosen = [els[0]]
            const targets = chosen.map((el, k) => ({ ...describe(el, k, s.ox, s.oy), pick: tag(el), ord: els.indexOf(el) }))
            let to = null
            if (s.to) {
                const z = q(s.to, A)
                if (z) to = describe(z, 0)
            }
            let label = s.L || null
            if (label === "@text") label = targets[0].text.replace(/^THOUGHT MOVE\s*·\s*/i, "").toUpperCase().slice(0, 22)
            return { ok: true, kind: "stage", i, key: `s:${i}`, spec: s, g: s.g, targets, to, label }
        }
        // 3. fallback (no table entry / stale selector): tap
        for (const sel of FALLBACK) {
            const els = qa(sel, A).filter(usable)
            if (els.length) {
                const el = near(els, lx, ly)
                return { ok: true, kind: "fallback", key: `f:${sel}`, spec: { g: "tap", t: sel }, g: "tap", targets: [{ ...describe(el, 0), pick: tag(el) }], label: null }
            }
        }
        return { ok: false, why: "no usable target" }
    }
    const meterValue = (sel, mvar) => {
        const A = arena() || document
        const el = sel ? q(sel, A) : q(`[style*="${mvar}"]`, A)
        if (!el) return null
        const raw = (el.style.getPropertyValue(mvar) || getComputedStyle(el).getPropertyValue(mvar) || "").trim()
        if (!raw) return null
        let n = parseFloat(raw)
        if (!Number.isFinite(n)) return null
        if (!/%/.test(raw) && n <= 1 && /\./.test(raw)) n *= 100
        return n
    }
    // the marker under a point (to follow a hold that turns into a drag while pressed, e.g. 111's sip)
    const markerAt = (x, y) => {
        const h = document.elementFromPoint(x, y)
        const m = h && h.closest && h.closest('[data-eos-target="1"]')
        if (m) return markerSpec(m)
        const A = arena()
        const any = A && qa('[data-eos-target="1"]', A).filter(usable)[0]
        return any ? { ...markerSpec(any), elsewhere: true } : null
    }
    const guideName = () => {
        const b = q(".globalPlayGuide .guideHeaderRow b")
        return b ? b.textContent.replace(/\s*·\s*LIVE GUIDE\s*$/i, "").trim() : null
    }
    const state = () => {
        const s = stageName()
        const g = q(".globalPlayGuide")
        let store = null
        try {
            const st = window.__eos && window.__eos.core && window.__eos.core.EOS_STORE.get()
            if (st) store = { phase: st.phase, emotion: st.emotion, before: st.before, after: st.after, express: st.express, gameId: st.gameId, detected: st.detected, safety: st.safety, act: st.act }
        } catch {}
        return {
            stage: s,
            progress: progress(),
            complete: !!(g && g.classList.contains("isComplete")),
            mega: !!q(".tsRewardSurge.mega"),
            reveal: s === "reveal" || !!q(".releaseCompleteOverlay"),
            previewDone: !!(window.__eosPreview && window.__eosPreview.done != null),
            name: guideName(),
            store,
        }
    }
    // ---- text sweep (smallText / noShrink)
    const zoneOf = (el) => {
        const Z = [[".releaseConsoleHeader", "header"], [".releaseChoiceMenu", "menu"], [".globalPlayGuide", "guide"], [".engineProgressHud, .tsShiftRewardHud", "hud"], [".releaseComposer", "composer"], [".releaseCompleteOverlay, .releaseCompleteCard", "reveal"], [".eosSafetyCard, .eosSupportPill", "safety"], [".eosOrbShelf, .eosWorldChips", "shelf"], [".eosCheckIn, .eosCheckInChip", "checkin"], [".eosShiftMeter, .eosStillMoment", "meter"], [".arena", "arena"], [".releaseStage", "stage"]]
        for (const [s, z] of Z) if (el.closest(s)) return z
        return "other"
    }
    const cssPath = (el) => {
        const parts = []
        let n = el
        for (let i = 0; i < 3 && n && n.nodeType === 1 && n !== document.body; i++, n = n.parentElement) {
            const c = cls(n).split(/\s+/).filter((k) => k && !/^(isHit|guideHit|active|on|cur|isBob)$/.test(k)).slice(0, 3)
            parts.unshift(n.tagName.toLowerCase() + c.map((k) => "." + k).join(""))
        }
        return parts.join(" > ")
    }
    const effOpacity = (el) => {
        let o = 1
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
            o *= Number(getComputedStyle(n).opacity)
            if (o < 0.2) return o
        }
        return o
    }
    const textSweep = (opts = {}) => {
        const out = []
        const seen = new Set()
        const scope = opts.scope ? q(opts.scope) || document.body : document.body
        const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
        const skip = opts.includeHidden ? "script,style,noscript,title" : 'script,style,noscript,title,[aria-hidden="true"],.eosSrOnly,.tsRewardSurge,[hidden],.eosPreviewFlags'
        while (w.nextNode()) {
            const tn = w.currentNode
            const txt = (tn.nodeValue || "").replace(/\s+/g, " ").trim()
            if (!txt || !/[\p{L}\p{N}]/u.test(txt)) continue
            const el = tn.parentElement
            if (!el || seen.has(el)) continue
            seen.add(el)
            if (el.closest(skip)) continue
            const r = el.getBoundingClientRect()
            if (r.width < 1 || r.height < 1) continue
            if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue
            const cs = getComputedStyle(el)
            if (cs.visibility === "hidden" || cs.display === "none") continue
            if (!opts.includeHidden && effOpacity(el) < 0.2) continue
            let px
            let kind = "html"
            if (el instanceof SVGElement) {
                px = r.height
                kind = "svg"
            } else {
                const fs = parseFloat(cs.fontSize) || 0
                const k = el.offsetWidth > 0 && el.offsetHeight > 0 ? Math.min(r.width / el.offsetWidth, r.height / el.offsetHeight) : 1
                px = fs * (Number.isFinite(k) && k > 0 ? k : 1)
            }
            out.push({ text: txt.slice(0, 60), px: Math.round(px * 10) / 10, sel: cssPath(el), zone: zoneOf(el), kind })
        }
        return out
    }
    // ---- copy lint (EOS surfaces)
    const eosOwner = (el) => {
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (/(^|\s)eos[A-Z]/.test(cls(n))) return n
        return null
    }
    const copyTexts = (scope) => {
        const out = []
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        const seen = new Set()
        while (w.nextNode()) {
            const el = w.currentNode.parentElement
            if (!el || seen.has(el)) continue
            seen.add(el)
            const txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim()
            if (!txt || el.closest("script,style,noscript,title")) continue
            if (scope !== "all" && !eosOwner(el)) continue
            if (el.closest(".eosWord, .eosSafetyCard, .eosPreviewFlags, .releaseThoughtInput")) continue
            const r = el.getBoundingClientRect()
            const sr = el.closest(".eosSrOnly")
            if (!sr && (r.width < 1 || r.height < 1 || effOpacity(el) < 0.05)) continue
            out.push({ text: txt.slice(0, 200), where: cssPath(el) })
        }
        for (const el of qa("[aria-label]")) {
            if (scope !== "all" && !eosOwner(el)) continue
            if (el.closest(".eosSafetyCard")) continue
            out.push({ text: el.getAttribute("aria-label"), where: cssPath(el) + "[aria-label]" })
        }
        return out
    }
    // ---- dots
    const dotsSample = () => {
        const core = q(".eosCore")
        let centre
        let noCore = false
        if (core) {
            const r = core.getBoundingClientRect()
            centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        } else {
            const r = stageRect()
            centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            noCore = true
        }
        const kinds = [[".tsPxDust", "pixar"], [".cinemaDust i", "cinema"], [".eosLane [data-eos-dot]", "lane"]]
        const dots = []
        for (const [sel, kind] of kinds) {
            qa(sel).forEach((el, i) => {
                const r = el.getBoundingClientRect()
                if (r.width <= 0 && r.height <= 0) return
                const op = effOpacity(el)
                if (op < 0.05) return
                const host = kind === "lane" ? el.closest(".eosLane") || el : el
                let prog = null
                try {
                    const an = host.getAnimations ? host.getAnimations() : []
                    const a = an[0]
                    if (a && a.effect) prog = a.effect.getComputedTiming().progress
                } catch {}
                dots.push({ kind, i, x: r.left + r.width / 2, y: r.top + r.height / 2, prog })
            })
        }
        const names = {}
        for (const [sel, kind] of kinds.slice(0, 2)) {
            const el = q(sel)
            if (el) names[kind] = getComputedStyle(el).animationName
        }
        return { centre, noCore, dots, names }
    }
    D.lib = { q, qa, arena, host, progress, stageName, state, usable, describe, resolve, meterValue, markerAt, textSweep, copyTexts, dotsSample, guideName }
}

async function ensureLib(page) {
    const has = await page.evaluate(() => !!(window.__eosDrive && window.__eosDrive.lib)).catch(() => false)
    if (!has) await page.evaluate(eosDrivePageLib)
}

// ======================================================================================= launch / menu
// Decoration-only layers (pointer-events none, no game state): hidden by launchEos({lite:true}).
export const EOS_LITE_CSS = ".ambient,.tsPxBokeh,.tsPxRig,.infinityField{display:none!important}"
export async function launchEos({ width = 1280, height = 860, dir = HERE, reducedMotion, timezoneId, storage, query = "", waitMs = 1200, contextOptions = {}, lite = false } = {}) {
    const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
    const context = await browser.newContext({
        viewport: { width, height },
        ...(reducedMotion ? { reducedMotion: reducedMotion === true ? "reduce" : reducedMotion } : {}),
        ...(timezoneId ? { timezoneId } : {}),
        ...contextOptions,
    })
    if (storage && typeof storage === "object") {
        await context.addInitScript((seed) => {
            try {
                if (sessionStorage.getItem("__eosDriveSeeded")) return
                for (const k in seed) localStorage.setItem(k, typeof seed[k] === "string" ? seed[k] : JSON.stringify(seed[k]))
                sessionStorage.setItem("__eosDriveSeeded", "1")
            } catch {}
        }, storage)
    }
    await context.addInitScript(eosDrivePageLib)
    if (lite)
        await context.addInitScript((css) => {
            const add = () => {
                const st = document.createElement("style")
                st.setAttribute("data-eos-drive", "lite")
                st.textContent = css
                ;(document.head || document.documentElement).appendChild(st)
            }
            if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add)
            else add()
        }, EOS_LITE_CSS)
    const page = await context.newPage()
    const errors = []
    const noise = []
    const warnings = []
    page.on("pageerror", (e) => errors.push(String(e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e)))
    page.on("console", (m) => {
        const t = m.text()
        if (m.type() === "warning" && /^\[eos\]/.test(t)) return warnings.push(t)
        if (m.type() !== "error") return
        if (NOISE.test(t)) noise.push(t)
        else if (/^Warning: /.test(t)) warnings.push(t) // React dev-build warnings (the arcade has some of its own)
        else errors.push(t)
    })
    await page.goto(pathToFileURL(path.join(dir, "index.html")).href + (query ? (query.startsWith("?") ? query : "?" + query) : ""))
    await page.waitForTimeout(waitMs)
    return { browser, context, page, errors, warnings, noise, close: () => browser.close() }
}

async function menuOpen(page) {
    return page.evaluate(() => !!document.querySelector(".releaseChoiceMenu"))
}
export async function openMenu(page) {
    if (!(await menuOpen(page))) {
        await page.locator("button.releaseChoiceButton").click()
        await page.waitForTimeout(350)
    }
}
export async function closeMenu(page) {
    if (await menuOpen(page)) {
        await page.locator("button.releaseChoiceButton").click()
        await page.waitForTimeout(250)
    }
}
export async function listGames(page, { withIds = false } = {}) {
    await openMenu(page)
    const names = await page.$$eval("button.releaseChoiceItem", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()))
    await closeMenu(page)
    const uniq = []
    for (const n of names) if (n && !/LET THINKSTILL/i.test(n) && !uniq.includes(n)) uniq.push(n)
    if (!withIds) return uniq
    const games = await allGames(page)
    return uniq.map((name) => ({ id: (games.find((g) => g.name === name) || {}).id ?? null, name }))
}
// [{id, name, engine, family}] from window.__eos.core.GAMES, else parsed from src/00_arcade.jsx (+ none of 111+).
let ARCADE_GAMES = null
function arcadeGames() {
    if (ARCADE_GAMES) return ARCADE_GAMES
    const s = fs.readFileSync(path.join(ROOT, "src", "00_arcade.jsx"), "utf8")
    ARCADE_GAMES = [...s.matchAll(/\n {8}id: (\d+),\n {8}name: "([^"]+)",\n {8}family: "([^"]+)",\n {8}engine: "([^"]+)"/g)].map((m) => ({ id: +m[1], name: m[2], family: m[3], engine: m[4] }))
    return ARCADE_GAMES
}
export async function allGames(page) {
    const live = await page.evaluate(() => {
        try {
            return window.__eos.core.GAMES.map((g) => ({ id: g.id, name: g.name, engine: g.engine, family: g.family }))
        } catch {
            return null
        }
    })
    return live && live.length ? live : arcadeGames()
}
export async function gameNameById(page, id) {
    const g = (await allGames(page)).find((x) => x.id === Number(id))
    return g ? g.name : null
}
export async function gameIdByName(page, name) {
    const g = (await allGames(page)).find((x) => x.name === name)
    return g ? g.id : null
}
export async function startGameByName(page, name, text = "my boss yelled at me", { waitMs = 2200 } = {}) {
    const inp = page.locator("input.releaseThoughtInput")
    if (text != null && (await inp.count())) await inp.fill(text)
    await openMenu(page)
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const item = page.locator("button.releaseChoiceItem", { hasText: new RegExp("^\\s*" + esc + "\\s*$") }).first()
    if (!(await item.count())) {
        await closeMenu(page)
        return { ok: false, name, stage: await page.evaluate(() => (document.querySelector(".tsArcade")?.className.match(/stage-(\w+)/) || [])[1] || null), why: "not in menu" }
    }
    await item.scrollIntoViewIfNeeded().catch(() => {})
    await item.click()
    await page.waitForTimeout(waitMs)
    await ensureLib(page)
    const s = await page.evaluate(() => window.__eosDrive.lib.state())
    return { ok: s.stage === "play", name, stage: s.stage, guide: s.name }
}
export async function startGameById(page, id, text = "my boss yelled at me", opts = {}) {
    await ensureLib(page)
    if (opts.skipCheckin) {
        const skip = page.locator(".eosCheckIn button", { hasText: /just let me play/i }).first()
        if (await skip.count()) await skip.click().catch(() => {})
    }
    const name = await gameNameById(page, id)
    if (!name) return { ok: false, id: Number(id), name: null, why: "unknown id (module not in this build?)" }
    const r = await startGameByName(page, name, text, opts)
    return { ...r, id: Number(id) }
}
export async function resetToInput(page) {
    const b = page.locator("button.releaseClose")
    if (await b.count()) await b.click().catch(() => {})
    await page.waitForTimeout(500)
}
export async function currentGameId(page) {
    await ensureLib(page)
    const s = await page.evaluate(() => window.__eosDrive.lib.state())
    if (s.store && s.store.gameId && s.store.phase === "play") return s.store.gameId
    const pv = await page.evaluate(() => (window.__eosPreview ? window.__eosPreview.id : null))
    if (pv) return pv
    if (s.name) return gameIdByName(page, s.name)
    return null
}

// ======================================================================================= check-in
async function firstVisible(page, selectors) {
    for (const s of selectors) {
        const loc = typeof s === "string" ? page.locator(s) : s
        const n = await loc.count().catch(() => 0)
        for (let i = 0; i < n; i++) {
            const l = loc.nth(i)
            if (await l.isVisible().catch(() => false)) return l
        }
    }
    return null
}
export async function openCheckin(page, { waitMs = 1500 } = {}) {
    await ensureLib(page)
    const vis = async () => !!(await firstVisible(page, [".eosCheckIn"]))
    if (await vis()) return { ok: true, via: "visible" }
    const chip = await firstVisible(page, [".eosCheckInChip"])
    let via = null
    if (chip) {
        await chip.click().catch(() => {})
        via = "chip"
    } else {
        const ok = await page.evaluate(() => {
            try {
                window.__eos.core.EosOpenCheckin()
                return true
            } catch {
                return false
            }
        })
        via = ok ? "store" : null
    }
    const t0 = Date.now()
    while (Date.now() - t0 < waitMs) {
        if (await vis()) return { ok: true, via }
        await sleep(100)
    }
    return { ok: false, via }
}
async function checkinStep(page) {
    return page.evaluate(() => document.querySelector(".eosCheckIn")?.getAttribute("data-step") || null)
}
export async function runCheckin(page, { emotion = null, intensity, dial, words, express = false, go = true, pickMyself = false, waitPlayMs = 4000 } = {}) {
    const open = await openCheckin(page)
    if (!open.ok) return { ok: false, why: "check-in not available (checkin module / I2 missing?)" }
    const id = emotion == null || emotion === "auto" || emotion === "notsure" ? "auto" : String(emotion)
    const root = page.locator(".eosCheckIn")
    // words first (typed before picking, like a user; the check-in never overwrites typed text)
    if (words != null) {
        const inp = page.locator("input.releaseThoughtInput")
        if (await inp.count()) await inp.fill(String(words))
        await sleep(150)
    }
    // already on step 2 (an earlier call) → "← back" to the ring first
    if ((await checkinStep(page)) === "2") {
        const back = await firstVisible(page, [root.locator("[data-eos-back]"), root.locator("button, a", { hasText: /^\s*←?\s*back\b/i })])
        if (back) {
            await back.click()
            await sleep(400)
        }
    }
    let orb = await firstVisible(page, [root.locator(`[data-eos-emotion="${id}"]`)])
    if (!orb && id === "good") {
        const chip = await firstVisible(page, [root.locator("[data-eos-good]"), root.locator("button", { hasText: /good day/i })])
        if (chip) {
            await chip.click()
            return finishCheckin(page, { id, waitPlayMs, launched: true })
        }
    }
    if (!orb) {
        const more = await firstVisible(page, [root.locator("[data-eos-more]"), root.locator("button", { hasText: /more feelings/i })])
        if (more) {
            await more.click()
            await sleep(450)
            orb = await firstVisible(page, [root.locator(`[data-eos-emotion="${id}"]`)])
        }
    }
    if (!orb) return { ok: false, why: `no orb for "${id}"` }
    const box = await orb.boundingBox()
    if (express && id !== "panic" && box) {
        // long-press = express launch for any feeling (550 ms)
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await sleep(700)
        await page.mouse.up()
        return finishCheckin(page, { id, waitPlayMs, launched: true })
    }
    await orb.click()
    // PANIC is an express orb by design (§6.2): one tap launches, there is no step 2
    if (id === "panic") return finishCheckin(page, { id, waitPlayMs, launched: true })
    // step 2
    const t0 = Date.now()
    while (Date.now() - t0 < 2000 && (await checkinStep(page)) !== "2") await sleep(100)
    if ((await checkinStep(page)) !== "2") {
        // PANIC (express by design) or an unexpected flow: maybe it already launched
        const st = await page.evaluate(() => window.__eosDrive.lib.state())
        if (st.stage === "play") return { ok: true, emotion: id, step: null, stage: "play", gameId: st.store && st.store.gameId, store: st.store, launched: true }
        return { ok: false, why: "step 2 did not appear" }
    }
    const want = intensity ?? dial
    let dialValue = null
    const track = await firstVisible(page, [root.locator(".eosDialTrack[role=slider]")])
    if (track && want != null) {
        const n = Math.max(0, Math.min(10, Math.round(Number(want))))
        await track.focus()
        if (n === 10) {
            await page.keyboard.press("1")
            await page.keyboard.press("0")
        } else await page.keyboard.press(String(n))
        await sleep(120)
    }
    if (track) dialValue = Number(await track.getAttribute("aria-valuenow")) || null
    if (pickMyself) {
        const pick = await firstVisible(page, [root.locator("[data-eos-pick]"), root.locator("button, a", { hasText: /pick a game/i })])
        if (!pick) return { ok: false, why: "no 'pick a game myself' link" }
        await pick.click()
        await sleep(400)
        return { ok: true, emotion: id, dial: dialValue, step: "menu", menu: await menuOpen(page), store: (await page.evaluate(() => window.__eosDrive.lib.state())).store }
    }
    if (!go) return { ok: true, emotion: id, dial: dialValue, step: "2", store: (await page.evaluate(() => window.__eosDrive.lib.state())).store }
    const cta = await firstVisible(page, [root.locator("[data-eos-cta]"), root.locator("button", { hasText: /shift it/i })])
    if (!cta) return { ok: false, why: "no CTA" }
    await cta.click()
    const r = await finishCheckin(page, { id, waitPlayMs, launched: true })
    return { ...r, dial: dialValue }
}
async function finishCheckin(page, { id, waitPlayMs }) {
    const t0 = Date.now()
    let st = null
    while (Date.now() - t0 < waitPlayMs) {
        st = await page.evaluate(() => window.__eosDrive.lib.state())
        if (st.stage === "play") break
        await sleep(100)
    }
    await sleep(300)
    st = await page.evaluate(() => window.__eosDrive.lib.state())
    return { ok: st.stage === "play", emotion: id, stage: st.stage, gameId: (st.store && st.store.gameId) || null, guide: st.name, store: st.store, ms: Date.now() - t0 }
}

// ======================================================================================= progress / logs
export async function readProgress(page) {
    await ensureLib(page)
    return page.evaluate(() => window.__eosDrive.lib.progress())
}
export async function progressLog(page, { reset = false, since = 0 } = {}) {
    await ensureLib(page)
    return page.evaluate(
        ([reset, since]) => {
            const D = window.__eosDrive
            const out = D.progress.filter((e) => e.t >= since)
            if (reset) D.progress.length = 0
            return out
        },
        [reset, since]
    )
}
export async function stageLog(page) {
    await ensureLib(page)
    return page.evaluate(() => window.__eosDrive.stage.slice())
}
export async function pointerLog(page, { reset = false } = {}) {
    await ensureLib(page)
    return page.evaluate((reset) => {
        const out = window.__eosDrive.pointer.slice()
        if (reset) window.__eosDrive.pointer.length = 0
        return out
    }, reset)
}
async function pageNow(page) {
    return page.evaluate(() => Math.round(performance.now()))
}

// ======================================================================================= gestures
let SPEC_GESTURES = null
export function specGestures() {
    if (SPEC_GESTURES) return SPEC_GESTURES
    const md = fs.readFileSync(path.join(ROOT, "docs", "EOS_SPEC.md"), "utf8")
    const m = md.match(/```js\n(const EOS_GESTURES = \{[\s\S]*?\n\})\n```/)
    if (!m) throw new Error("EOS_GESTURES block not found in docs/EOS_SPEC.md §3.11")
    SPEC_GESTURES = new Function(m[1] + "\nreturn EOS_GESTURES")()
    return SPEC_GESTURES
}
async function gestureStages(page, id) {
    const live = await page.evaluate((id) => {
        try {
            const a = window.__eos && window.__eos.arrows
            if (!a) return null
            if (typeof a.EosGestureFor === "function") {
                const g = window.__eos.core.GAMES.find((x) => x.id === id)
                const r = g && a.EosGestureFor(g)
                if (r && Array.isArray(r.stages)) return JSON.parse(JSON.stringify(r.stages))
            }
            if (a.EOS_GESTURES && a.EOS_GESTURES[id]) return JSON.parse(JSON.stringify(a.EOS_GESTURES[id]))
        } catch {}
        return null
    }, Number(id))
    if (live) return { stages: live, source: "arrows" }
    const spec = specGestures()[Number(id)]
    return { stages: spec || [], source: spec ? "spec" : "none" }
}
const DIRS = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1], ur: [0.7071, -0.7071], ul: [-0.7071, -0.7071], dr: [0.7071, 0.7071], dl: [-0.7071, 0.7071] }
const ARROW_OF = { r: "→", l: "←", u: "↑", d: "↓", ur: "↗", ul: "↖", dr: "↘", dl: "↙", lr: "↔", ud: "↕", out: "⤢", in: "⤡" }
// default arrow labels per gesture (docs/EOS_SPEC.md §3.3)
export function defaultLabel(spec) {
    const g = spec.g
    const map = { tap: "TAP IT", taps: `TAP ×${spec.n || 3}`, hold: "HOLD", holdRelease: "HOLD… LET GO ON GREEN", drag: `DRAG ${ARROW_OF[spec.dir] || "→"}`, dragTo: "DROP IT IN", slow: "DRAG… SLOWLY", swipe: `SWIPE ${ARROW_OF[spec.dir] || "→"}`, sling: "PULL BACK · LET GO", scrub: "RUB IT OUT", timing: "TAP… SLOWLY", alt: "LEFT · RIGHT", choose: "PICK ONE", seq: "TAP THE GLOWING ONE", tool: "GRAB THE TOOL", wait: "HANDS OFF", type: "TYPE A FEW WORDS" }
    return map[g] || "TAP IT"
}
async function arenaCentre(page) {
    return page.evaluate(() => {
        const A = window.__eosDrive.lib.arena() || document.querySelector(".releaseStage") || document.body
        const r = A.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
}
function dirVector(dir, from, centre, attempt) {
    let d = dir || "r"
    if (d === "lr") d = attempt % 2 ? "l" : "r"
    if (d === "ud") d = attempt % 2 ? "d" : "u"
    if (d === "out" || d === "in") {
        let vx = from.x - centre.x
        let vy = from.y - centre.y
        const L = Math.hypot(vx, vy)
        if (L < 4) {
            vx = 1
            vy = 0
        } else {
            vx /= L
            vy /= L
        }
        return d === "out" ? [vx, vy] : [-vx, -vy]
    }
    return DIRS[d] || DIRS.r
}
async function clickAt(page, x, y, holdMs = 40) {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await sleep(holdMs)
    await page.mouse.up()
}
async function path2(page, x0, y0, x1, y1, ms, steps) {
    const n = Math.max(1, steps)
    for (let i = 1; i <= n; i++) {
        await page.mouse.move(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)
        if (ms) await sleep(ms / n)
    }
}
async function resolveNow(page, stages, st) {
    return page.evaluate(([stages, st]) => window.__eosDrive.lib.resolve(stages, st), [stages, st])
}
async function keyFocus(page, pick) {
    try {
        await page.focus(`[data-eos-drive-pick="${pick}"]`, { timeout: 500 })
        return true
    } catch {
        return false
    }
}
// Perform ONE action unit of a resolved stage. Returns a short description (for logs).
async function perform(page, r, st, ctx) {
    const s = r.spec || {}
    const g = r.g
    const attempt = ctx.attempt || 0
    const T = r.targets && r.targets[0]
    const kb = ctx.alt === "keyboard"
    if (T) {
        st.lastX = T.x
        st.lastY = T.y
    }
    if (g === "wait") {
        await sleep(600)
        return "wait"
    }
    if (!T) {
        await sleep(250)
        return "none"
    }
    if (kb && r.kind === "marker") return performKeyboard(page, r, st, ctx)
    if (g === "tap" || g === "seq" || g === "tool") {
        await clickAt(page, T.x, T.y)
        return `${g}@${T.x},${T.y}`
    }
    if (g === "choose") {
        const k = (ctx.chooseIdx || 0) % r.targets.length
        const C = r.targets[k]
        await clickAt(page, C.x, C.y)
        st.lastX = C.x
        st.lastY = C.y
        return `choose#${k}@${C.x},${C.y}`
    }
    if (g === "taps") {
        const n = Math.max(1, Math.min(s.n || 3, 4))
        let cur = T
        for (let i = 0; i < n; i++) {
            await clickAt(page, cur.x, cur.y, 30)
            await sleep(110)
            const nx = await resolveNow(page, ctx.stages, st)
            if (!nx.ok || nx.key !== r.key || !nx.targets[0]) break
            cur = nx.targets[0]
        }
        return `taps×${n}`
    }
    if (g === "alt") {
        // 67 TAP OUT: tap .eosNext when present (I3), else alternate the pads ourselves
        const pads = await page.evaluate(() => {
            const A = window.__eosDrive.lib.arena()
            const all = A ? Array.from(A.querySelectorAll(".tapOutPads button, [data-eos-target='1']")) : []
            return all.map((el) => {
                const r = el.getBoundingClientRect()
                return { x: r.left + r.width / 2, y: r.top + r.height / 2, next: el.classList.contains("eosNext") }
            })
        })
        let P = pads.find((p) => p.next)
        if (!P && pads.length >= 2) P = pads[(st.altCount || 0) % 2]
        P = P || T
        await clickAt(page, P.x, P.y)
        st.altCount = (st.altCount || 0) + 1
        await sleep(160)
        return "alt"
    }
    if (g === "timing") {
        if (s.lit) {
            const t0 = Date.now()
            while (Date.now() - t0 < 4000) {
                const lit = await page.evaluate((sel) => !!(window.__eosDrive.lib.arena() || document).querySelector(sel), s.lit)
                if (lit) break
                await sleep(40)
            }
            const nx = await resolveNow(page, ctx.stages, st)
            const P = (nx.ok && nx.targets[0]) || T
            await clickAt(page, P.x, P.y)
            return "timing:lit"
        }
        const beat = s.bpm ? 60000 / s.bpm : 1300
        const since = Date.now() - (st.lastTimingAt || 0)
        if (since < beat) await sleep(beat - since + 30)
        await clickAt(page, T.x, T.y)
        st.lastTimingAt = Date.now()
        return `timing:${s.bpm || "?"}bpm`
    }
    if (g === "type") {
        const ok = await keyFocus(page, T.pick)
        if (ok) {
            await page.keyboard.type("it will pass", { delay: 15 })
            await page.keyboard.press("Tab").catch(() => {})
        }
        return "type"
    }
    if (g === "hold" || g === "holdRelease") return performHold(page, r, st, ctx)
    if (g === "scrub") {
        await page.mouse.move(T.x, T.y)
        await page.mouse.down()
        const w = Math.max(40, Math.min(T.w, 600))
        const h = Math.max(20, Math.min(T.h, 400))
        // every pointer event costs a frame in headless software raster (~150-300 ms at 1280), so scrub with few,
        // long strokes: a big area gets 5 rows edge to edge, a word bubble a short zig-zag through its centre
        const big = T.w > 200 || T.h > 160
        const rows = big ? 5 : 2
        for (let row = 0; row < rows; row++) {
            const y = big ? T.t + (h * (row + 0.5)) / rows : T.y + (row % 2 ? 8 : -8)
            const xa = big ? T.l + 8 : T.x - Math.min(40, w / 2)
            const xb = big ? T.l + w - 8 : T.x + Math.min(40, w / 2)
            await path2(page, row % 2 ? xb : xa, y, row % 2 ? xa : xb, y, 60, big ? 6 : 3)
        }
        await page.mouse.up()
        return "scrub"
    }
    if (g === "dragTo") {
        const Z = r.to
        if (!Z) {
            await clickAt(page, T.x, T.y)
            return "dragTo:no-zone"
        }
        await page.mouse.move(T.x, T.y)
        await page.mouse.down()
        await sleep(60)
        const mx = (T.x + Z.x) / 2
        const my = Math.min(T.y, Z.y) - 30
        await path2(page, T.x, T.y, mx, my, 120, 4)
        await path2(page, mx, my, Z.x, Z.y, 160, 5)
        await sleep(90)
        await page.mouse.up()
        return "dragTo"
    }
    if (g === "drag" || g === "slow" || g === "swipe" || g === "sling") {
        const centre = await arenaCentre(page)
        const [vx, vy] = dirVector(s.dir, T, centre, attempt)
        const base = Number(s.d) || 120
        const mult = Math.min(2.6, 1 + 0.35 * attempt)
        const D = Math.max(base * 1.35, base + 40) * mult
        const x1 = T.x + vx * D
        const y1 = T.y + vy * D
        await page.mouse.move(T.x, T.y)
        await page.mouse.down()
        await sleep(g === "swipe" ? 20 : 60)
        if (g === "swipe") await path2(page, T.x, T.y, x1, y1, 60, 4)
        else if (g === "slow") {
            const maxSpeed = Number(s.maxSpeed) || 260
            const ms = Math.max(Number(s.ms) || 1800, (D / (0.7 * maxSpeed)) * 1000)
            await path2(page, T.x, T.y, x1, y1, ms, 16)
        } else if (g === "sling") {
            await path2(page, T.x, T.y, x1, y1, 360, 8)
            await sleep(160)
        } else await path2(page, T.x, T.y, x1, y1, 200, 7)
        await sleep(g === "swipe" ? 0 : 60)
        await page.mouse.up()
        return `${g}:${s.dir || "r"}:${Math.round(D)}`
    }
    await clickAt(page, T.x, T.y)
    return `tap?(${g})`
}
async function performHold(page, r, st, ctx) {
    const s = r.spec || {}
    const T = r.targets[0]
    const attempt = ctx.attempt || 0
    const ms = (Number(s.ms) || 1200) + 300 * attempt
    const win = Array.isArray(s.win) ? s.win : null
    const mvar = s.mvar || null
    await page.mouse.move(T.x, T.y)
    await page.mouse.down()
    const t0 = Date.now()
    let x = T.x
    let y = T.y
    let moved = false
    let why = "timer"
    const maxMs = r.g === "holdRelease" ? ms * 3 + 1500 : ms + (r.kind === "marker" ? 2600 : 350)
    while (Date.now() - t0 < maxMs) {
        await sleep(r.g === "holdRelease" ? 12 : 70)
        const el = Date.now() - t0
        if (r.g === "holdRelease" && mvar) {
            const v = await page.evaluate(([sel, mvar]) => window.__eosDrive.lib.meterValue(sel, mvar), [s.meter || null, mvar])
            if (v != null && win) {
                // aim inside BOTH the spec window and the narrower pre-I3 window of 11 (62-88), away from the edges
                const lo = Math.max(win[0], 62) + 3
                const hi = Math.min(win[1], 88) - 4
                if (v >= lo && v <= hi) {
                    why = `meter ${v}`
                    break
                }
            }
            continue
        }
        if (r.kind === "marker") {
            const m = await page.evaluate(([x, y]) => window.__eosDrive.lib.markerAt(x, y), [x, y])
            if (m && !moved && !m.elsewhere && ["drag", "slow", "swipe", "sling"].includes(m.g)) {
                const centre = await arenaCentre(page)
                const [vx, vy] = dirVector(m.dir || "u", { x, y }, centre, 0)
                const D = Math.max((Number(m.d) || 30) * 1.5, 36)
                await path2(page, x, y, x + vx * D, y + vy * D, 260, 10)
                x += vx * D
                y += vy * D
                moved = true
                await sleep(260)
                why = "sip"
                break
            }
            if (el >= ms && (!m || m.elsewhere || m.g !== "hold")) {
                why = m ? `marker ${m.g}` : "marker gone"
                break
            }
            if (el >= ms + 2400) break
            continue
        }
        if (el >= ms) break
    }
    await page.mouse.up()
    return `${r.g}:${Date.now() - t0}ms(${why})`
}
async function performKeyboard(page, r, st, ctx) {
    const s = r.spec || {}
    const T = r.targets[0]
    const g = r.g
    if (g === "choose") {
        const k = (ctx.chooseIdx || 0) % r.targets.length
        await keyFocus(page, r.targets[k].pick)
        await page.keyboard.press("Enter")
        return "kb:choose"
    }
    await keyFocus(page, T.pick)
    if (g === "hold" || g === "holdRelease") {
        await page.keyboard.down("Space")
        const t0 = Date.now()
        const ms = Number(s.ms) || 1200
        while (Date.now() - t0 < ms + 2600) {
            await sleep(80)
            const m = await page.evaluate(([x, y]) => window.__eosDrive.lib.markerAt(x, y), [T.x, T.y])
            if (m && !m.elsewhere && ["drag", "slow", "swipe", "sling"].includes(m.g)) {
                const key = { u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight" }[m.dir] || "ArrowUp"
                await page.keyboard.press(key)
                await sleep(300)
                break
            }
            if (Date.now() - t0 >= ms && (!m || m.elsewhere || m.g !== "hold")) break
        }
        await page.keyboard.up("Space")
        return "kb:hold"
    }
    if (["drag", "slow", "swipe", "sling", "dragTo"].includes(g)) {
        const key = { u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight", ur: "ArrowUp", ul: "ArrowUp", dr: "ArrowDown", dl: "ArrowDown" }[s.dir] || "ArrowRight"
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press(key)
            await sleep(g === "slow" ? 220 : 60)
        }
        await page.keyboard.press("Enter").catch(() => {})
        return `kb:${g}`
    }
    const n = g === "taps" ? Math.max(1, Math.min(s.n || 3, 4)) : 1
    for (let i = 0; i < n; i++) {
        await page.keyboard.press("Enter")
        await sleep(g === "timing" ? (s.bpm ? 60000 / s.bpm : 1300) : 120)
    }
    return `kb:${g}`
}
async function arrowCheck(page, expected, waitMs) {
    const t0 = Date.now()
    let last = null
    while (Date.now() - t0 < waitMs) {
        last = await page.evaluate(() => {
            try {
                return window.__eos && window.__eos.arrows && window.__eos.arrows.state ? window.__eos.arrows.state() : undefined
            } catch (e) {
                return { error: String(e) }
            }
        })
        if (last === undefined) return { checked: false }
        if (last && last.visible && (!expected || norm(last.label) === norm(expected))) break
        await sleep(100)
    }
    const visible = !!(last && last.visible)
    return { checked: true, visible, label: last ? last.label || null : null, expected, labelOk: !!(visible && (!expected || norm(last.label) === norm(expected))), waitedMs: Date.now() - t0 }
}
const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, " ").trim()

export async function finishGame(page, idOrOpts, maybeOpts) {
    let id = typeof idOrOpts === "number" || typeof idOrOpts === "string" ? Number(idOrOpts) : null
    const opts = { ...(idOrOpts && typeof idOrOpts === "object" ? idOrOpts : {}), ...(maybeOpts || {}) }
    const { timeoutMs = 120000, stuckMs = 45000, perStage = true, assertArrows = "auto", alt = "pointer", settleMs = 220, finishWaitMs = 5500, log = false } = opts
    await ensureLib(page)
    if (!id) id = await currentGameId(page)
    const name = id ? await gameNameById(page, id) : null
    const { stages, source } = id && id < 111 ? await gestureStages(page, id) : { stages: [], source: "markers" }
    const t0 = Date.now()
    const pt0 = await pageNow(page)
    // ids ≥ 111 (and the preview) are marker games: no table, no fallback while they are in an automatic phase
    const markersOnly = !id || id >= 111
    const st = { once: [], touched: [], lastX: null, lastY: null, altCount: 0, markersOnly, allowFallback: false }
    let noMarkerSince = 0
    let noStageSince = 0
    let lastMoveAt = Date.now()
    const fails = {}
    const chooseIdx = {}
    const out = { id, name, source, done: false, ms: 0, reason: "", finalProgress: null, progressLog: [], stages: [], actions: 0, arrowsChecked: false, arrowMisses: [], labelMismatches: [], occluded: 0, notes: [] }
    let lastKey = null
    let completeAt = 0
    let lastProgress = await readProgress(page)
    let idleMs = 0
    let stuckTotal = 0
    const ctxBase = { alt, stages }
    while (Date.now() - t0 < timeoutMs) {
        const s = await page.evaluate(() => window.__eosDrive.lib.state())
        if (s.reveal || s.previewDone) {
            out.done = true
            out.reason = s.reveal ? "reveal" : "preview done"
            break
        }
        if (s.stage && s.stage !== "play") {
            out.reason = `left play (stage ${s.stage})`
            break
        }
        if (s.complete || (s.progress != null && s.progress >= 100)) {
            // the wrapper holds the finish ~3 s (legacy) / ~4 s (new) before the reveal. A bar can also read
            // 100 before the ENGINE is done (sfx-driven creep without the I1-E7 gate) → after the grace period
            // keep playing until the reveal.
            if (!completeAt) completeAt = Date.now()
            if (Date.now() - completeAt < finishWaitMs) {
                await sleep(200)
                continue
            }
            if (!out.completeEarly) out.completeEarly = true
        } else completeAt = 0
        const r = await resolveNow(page, stages, st)
        if (!r.ok) {
            if (markersOnly) {
                if (!noMarkerSince) noMarkerSince = Date.now()
                // contract: a new game marks its live target whenever the player must act; after 8 s with no
                // marker and no progress, note it and let the §3.4 fallback poke the arena
                if (Date.now() - noMarkerSince > 8000 && !st.allowFallback) {
                    st.allowFallback = true
                    out.notes.push(`no data-eos-target marker for 8 s at progress ${s.progress}`)
                }
            }
            await sleep(250)
            idleMs += 250
            continue
        }
        if (r.kind === "marker") {
            noMarkerSince = 0
            st.allowFallback = false
        }
        // a game WITH a table whose stages match nothing is usually mid-transition (a word flying off, the next
        // card animating in): wait up to 2.5 s before poking the generic fallback targets
        if (r.kind === "fallback" && stages.length) {
            if (!noStageSince) noStageSince = Date.now()
            if (Date.now() - noStageSince < 2500) {
                await sleep(200)
                idleMs += 200
                continue
            }
        } else noStageSince = 0
        if (r.key !== lastKey) {
            const expected = r.kind === "fallback" ? null : r.label || defaultLabel(r.spec || { g: r.g })
            const entry = { key: r.key, kind: r.kind, index: r.i ?? null, g: r.g, selector: (r.spec && r.spec.t) || null, label: expected, at: Date.now() - t0, target: r.targets[0] ? { x: r.targets[0].x, y: r.targets[0].y, cls: r.targets[0].cls, occluded: r.targets[0].occluded } : null }
            if (r.targets[0] && r.targets[0].occluded) out.occluded++
            if (perStage && assertArrows !== false && r.kind !== "fallback") {
                const a = await arrowCheck(page, expected, out.stages.length ? 1500 : 2200)
                entry.arrow = a.checked ? a : "n/a"
                if (a.checked) {
                    out.arrowsChecked = true
                    if (!a.visible) out.arrowMisses.push(`${r.key} (${expected || r.g})`)
                    else if (!a.labelOk) out.labelMismatches.push(`${r.key}: expected "${expected}", arrow "${a.label}"`)
                } else if (assertArrows === true) out.arrowMisses.push(`${r.key}: no arrows API in this build`)
            }
            out.stages.push(entry)
            lastKey = r.key
            if (log) console.log(`[finishGame ${id}] stage ${r.key} ${r.g} ${expected || ""}`)
        }
        const attempt = fails[r.key] || 0
        if (r.g === "choose" && attempt > 0) chooseIdx[r.key] = (chooseIdx[r.key] || 0) + 1
        const what = await perform(page, r, st, { ...ctxBase, attempt, chooseIdx: chooseIdx[r.key] || 0 })
        out.actions++
        if (r.spec && r.spec.until === "touch" && r.i != null && !st.touched.includes(r.i)) st.touched.push(r.i)
        if (r.spec && r.spec.once && r.i != null && !st.once.includes(r.i)) st.once.push(r.i)
        await sleep(settleMs)
        const p = await readProgress(page)
        if (log) console.log(`  ${what} → ${p}`)
        // success = the bar moved (either way: without the I1-E7 gate an engine report can drop below the
        // sfx-driven creep, e.g. CRUSH 45 → 17 on a real success) or the game left the stage / finished
        const moved = p !== lastProgress
        if (moved) {
            noMarkerSince = 0
            fails[r.key] = 0
            if (p != null && lastProgress != null && p > lastProgress) st.touched = []
            stuckTotal = 0
        } else if (r.g !== "wait") {
            fails[r.key] = attempt + 1
            stuckTotal++
        }
        lastProgress = p ?? lastProgress
        // escape hatch: a stage that never moves → poke the fallback targets once in a while
        if (fails[r.key] && fails[r.key] % 9 === 0 && r.kind !== "fallback") {
            const f = await page.evaluate(() => window.__eosDrive.lib.resolve([], {}))
            if (f.ok && f.targets[0]) await clickAt(page, f.targets[0].x, f.targets[0].y)
        }
        if (moved) lastMoveAt = Date.now()
        if (stuckTotal > 60 || Date.now() - lastMoveAt > stuckMs) {
            out.reason = `stuck (no bar movement for ${stuckTotal} actions / ${Math.round((Date.now() - lastMoveAt) / 1000)} s)`
            break
        }
    }
    if (!out.reason) out.reason = "timeout"
    out.ms = Date.now() - t0
    out.finalProgress = await readProgress(page)
    const plog = await progressLog(page)
    const firstIdx = plog.findIndex((e) => e.t >= pt0)
    const startAt = firstIdx > 0 ? firstIdx - 1 : firstIdx < 0 ? Math.max(0, plog.length - 1) : 0
    out.progressLog = plog.slice(startAt).map((e) => ({ t: Math.max(0, e.t - pt0), v: e.v }))
    out.idleMs = idleMs
    return out
}

// ======================================================================================= readability
export async function textSizes(page, opts = {}) {
    await ensureLib(page)
    const rows = await page.evaluate((o) => window.__eosDrive.lib.textSweep(o), opts)
    const count = {}
    return rows.map((r) => {
        const k = `${r.sel}|${r.text}`
        count[k] = (count[k] || 0) + 1
        return { key: count[k] > 1 ? `${k}#${count[k]}` : k, ...r }
    })
}
export async function smallText(page, minPx = 12, opts = {}) {
    const rows = await textSizes(page, opts)
    const groups = new Map()
    for (const r of rows) {
        if (r.px >= minPx - 0.05) continue
        const k = `${r.sel}|${r.px}`
        const g = groups.get(k)
        if (g) g.n++
        else groups.set(k, { text: r.text, px: r.px, sel: r.sel, zone: r.zone, kind: r.kind, n: 1, src: "dom" })
    }
    const out = Array.from(groups.values())
    const scan = await page.evaluate(() => {
        try {
            const s = window.__eos && window.__eos.readability && window.__eos.readability.scan
            return typeof s === "function" ? JSON.parse(JSON.stringify(s() || [])) : null
        } catch (e) {
            return [{ text: "readability.scan() threw: " + e, px: 0, sel: "", zone: "error" }]
        }
    })
    if (Array.isArray(scan))
        for (const o of scan) {
            const px = Number(o.px ?? o.renderedPx ?? o.size)
            if (Number.isFinite(px) && px >= minPx - 0.05) continue
            out.push({ text: String(o.text || "").slice(0, 60), px: Number.isFinite(px) ? px : null, sel: o.sel || o.selector || "", zone: o.zone || "", n: o.n || 1, src: "readability.scan" })
        }
    return out.sort((a, b) => (a.px ?? 0) - (b.px ?? 0))
}
export async function noShrink(page, baselineDir, setup, { minDelta = 0.5, ...sweep } = {}) {
    const vp = page.viewportSize() || { width: 1280, height: 860 }
    const cur = await textSizes(page, sweep)
    const base = await launchEos({ width: vp.width, height: vp.height, dir: baselineDir })
    try {
        if (typeof setup === "function") await setup(base.page)
        const ref = await textSizes(base.page, sweep)
        const map = new Map(ref.map((r) => [r.key, r]))
        const shrunk = []
        let compared = 0
        let onlyHere = 0
        for (const r of cur) {
            const b = map.get(r.key)
            if (!b) {
                onlyHere++
                continue
            }
            compared++
            if (r.px < b.px - minDelta) shrunk.push({ text: r.text, sel: r.sel, zone: r.zone, px: r.px, basePx: b.px })
            map.delete(r.key)
        }
        return { shrunk, compared, onlyHere, onlyBase: map.size, baseErrors: base.errors.slice(0, 5) }
    } finally {
        await base.browser.close()
    }
}

// ======================================================================================= arrows
export async function arrowState(page) {
    await ensureLib(page)
    return page.evaluate(() => {
        const inVp = (r) => !!r && r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight
        const A = window.__eosDrive.lib.arena()
        const findTarget = (sel) => {
            if (!sel) return null
            try {
                return (A && A.querySelector(sel)) || document.querySelector(sel)
            } catch {
                return null
            }
        }
        let api
        try {
            api = window.__eos && window.__eos.arrows && window.__eos.arrows.state ? window.__eos.arrows.state() : null
        } catch (e) {
            api = { error: String(e) }
        }
        if (api) {
            const t = findTarget(api.targetSelector)
            const r = t && t.getBoundingClientRect()
            return { visible: !!api.visible, g: api.g || null, label: api.label || null, stage: api.stage ?? null, targetSelector: api.targetSelector || null, x: api.x ?? null, y: api.y ?? null, inViewport: api.inViewport ?? null, targetInViewport: t ? inVp(r) : api.inViewport ?? false, count: api.count ?? null, source: "api", error: api.error }
        }
        const hand = document.querySelector(".eosArrowLayer .eosHand, .eosArrowLayer .eosChevron")
        if (hand) {
            const r = hand.getBoundingClientRect()
            const cs = getComputedStyle(hand)
            const vis = cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0.05 && inVp(r)
            const lab = document.querySelector(".eosArrowLayer .eosLabel")
            const tgt = A && A.querySelector('[data-eos-target="1"]')
            const tr = tgt && tgt.getBoundingClientRect()
            return { visible: vis, g: null, label: lab ? lab.textContent.trim() : null, stage: null, targetSelector: tgt ? '[data-eos-target="1"]' : null, x: r.left + r.width / 2, y: r.top + r.height / 2, inViewport: inVp(r), targetInViewport: tgt ? inVp(tr) : null, count: null, source: "dom" }
        }
        return { visible: false, g: null, label: null, stage: null, targetSelector: null, x: null, y: null, inViewport: false, targetInViewport: false, count: null, source: "none" }
    })
}

// ======================================================================================= copy lint
export async function lintCopy(page, { scope = "eos" } = {}) {
    await ensureLib(page)
    const [texts, rules, disclaimer] = await page.evaluate((scope) => {
        const core = window.__eos && window.__eos.core
        return [window.__eosDrive.lib.copyTexts(scope), core ? core.EOS_COPY_RULES : null, core ? core.EOS_DISCLAIMER : null]
    }, scope)
    const R = rules || coreCopyRulesFromSource()
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]")
    const tests = []
    for (const [rule, list] of [["word", R.bannedWords], ["phrase", R.bannedPhrases], ["claim", R.bannedClaims]])
        for (const term of list || []) tests.push({ rule, term, re: new RegExp(`(^|[^\\p{L}\\p{N}])${esc(term)}(?=$|[^\\p{L}\\p{N}])`, "iu") })
    const out = []
    const seen = new Set()
    for (const t of texts) {
        let text = t.text
        if (disclaimer && text.includes(disclaimer)) text = text.split(disclaimer).join(" ")
        for (const x of tests)
            if (x.re.test(text)) {
                const k = `${x.term}|${t.text}`
                if (seen.has(k)) continue
                seen.add(k)
                out.push({ rule: x.rule, term: x.term, text: t.text, where: t.where })
            }
    }
    return out
}
function coreCopyRulesFromSource() {
    const s = fs.readFileSync(path.join(ROOT, "src", "eos", "00_eos_core.jsx"), "utf8")
    const m = s.match(/const EOS_COPY_RULES = (\{[\s\S]*?\n\})/)
    return new Function("return " + m[1])()
}

// ======================================================================================= pixels
export function decodePNG(buf) {
    let pos = 8
    let width = 0
    let height = 0
    let depth = 8
    let ctype = 6
    let interlace = 0
    let palette = null
    let trns = null
    const idat = []
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos)
        const type = buf.toString("ascii", pos + 4, pos + 8)
        const data = buf.subarray(pos + 8, pos + 8 + len)
        if (type === "IHDR") {
            width = data.readUInt32BE(0)
            height = data.readUInt32BE(4)
            depth = data[8]
            ctype = data[9]
            interlace = data[12]
        } else if (type === "PLTE") palette = data
        else if (type === "tRNS") trns = data
        else if (type === "IDAT") idat.push(data)
        else if (type === "IEND") break
        pos += 12 + len
    }
    if (depth !== 8 || interlace) throw new Error(`decodePNG: unsupported PNG (depth ${depth}, interlace ${interlace})`)
    const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype]
    const raw = zlib.inflateSync(Buffer.concat(idat))
    const stride = width * bpp
    const out = new Uint8Array(width * height * 4)
    let prev = new Uint8Array(stride)
    for (let y = 0; y < height; y++) {
        const f = raw[y * (stride + 1)]
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
        const cur = new Uint8Array(stride)
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? cur[i - bpp] : 0
            const b = prev[i]
            const c = i >= bpp ? prev[i - bpp] : 0
            let v = line[i]
            if (f === 1) v += a
            else if (f === 2) v += b
            else if (f === 3) v += (a + b) >> 1
            else if (f === 4) {
                const p = a + b - c
                const pa = Math.abs(p - a)
                const pb = Math.abs(p - b)
                const pc = Math.abs(p - c)
                v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
            }
            cur[i] = v & 255
        }
        for (let x = 0; x < width; x++) {
            const o = (y * width + x) * 4
            const k = x * bpp
            if (ctype === 6) {
                out[o] = cur[k]
                out[o + 1] = cur[k + 1]
                out[o + 2] = cur[k + 2]
                out[o + 3] = cur[k + 3]
            } else if (ctype === 2) {
                out[o] = cur[k]
                out[o + 1] = cur[k + 1]
                out[o + 2] = cur[k + 2]
                out[o + 3] = 255
            } else if (ctype === 0 || ctype === 4) {
                out[o] = out[o + 1] = out[o + 2] = cur[k]
                out[o + 3] = ctype === 4 ? cur[k + 1] : 255
            } else if (ctype === 3) {
                const pi = cur[k]
                out[o] = palette[pi * 3]
                out[o + 1] = palette[pi * 3 + 1]
                out[o + 2] = palette[pi * 3 + 2]
                out[o + 3] = trns && pi < trns.length ? trns[pi] : 255
            }
        }
        prev = cur
    }
    return { width, height, data: out }
}
function meanRGB(img) {
    let r = 0
    let g = 0
    let b = 0
    const n = img.width * img.height
    for (let i = 0; i < n; i++) {
        r += img.data[i * 4]
        g += img.data[i * 4 + 1]
        b += img.data[i * 4 + 2]
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}
async function clipRGB(page, x, y, size) {
    const vp = page.viewportSize()
    const cx = Math.max(0, Math.min(vp.width - size, Math.round(x - size / 2)))
    const cy = Math.max(0, Math.min(vp.height - size, Math.round(y - size / 2)))
    const buf = await page.screenshot({ clip: { x: cx, y: cy, width: size, height: size }, type: "png" })
    return meanRGB(decodePNG(buf))
}
export async function pixelVisible(page, x, y, { size = 4, ring = 14, hideSelector = null, threshold = 12 } = {}) {
    const rgb = await clipRGB(page, x, y, size)
    let bg
    if (hideSelector) {
        const h = await page.addStyleTag({ content: `${hideSelector}{visibility:hidden!important}` })
        await page.waitForTimeout(40)
        bg = await clipRGB(page, x, y, size)
        await h.evaluate((el) => el.remove())
    } else {
        const around = []
        for (const [dx, dy] of [[ring, 0], [-ring, 0], [0, ring], [0, -ring]]) around.push(await clipRGB(page, x + dx, y + dy, size))
        bg = [0, 1, 2].map((c) => around.map((a) => a[c]).sort((a, b) => a - b)[1])
    }
    const delta = Math.max(...[0, 1, 2].map((c) => Math.abs(rgb[c] - bg[c])))
    return { visible: delta >= threshold, delta, rgb, bg }
}
const lin = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
export async function flashCheck(page, ms = 2000, { selector = ".releaseGameHost .cinematicContentShell > .arena, .releaseStage, .eosPreview", threshold = 0.1, area = 0.1, grid = 64 } = {}) {
    const rect = await page.evaluate((sel) => {
        for (const s of sel.split(",")) {
            const el = document.querySelector(s.trim())
            if (el) {
                const r = el.getBoundingClientRect()
                if (r.width > 10 && r.height > 10) return { x: r.left, y: r.top, w: r.width, h: r.height }
            }
        }
        return { x: 0, y: 0, w: innerWidth, h: innerHeight }
    }, selector)
    const vp = page.viewportSize()
    const cdp = await page.context().newCDPSession(page)
    const frames = []
    cdp.on("Page.screencastFrame", async (f) => {
        frames.push({ t: f.metadata.timestamp * 1000, data: f.data, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight })
        try {
            await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId })
        } catch {}
    })
    await cdp.send("Page.startScreencast", { format: "png", maxWidth: Math.min(vp.width, 480), maxHeight: Math.min(vp.height, 480), everyNthFrame: 1 })
    await page.waitForTimeout(ms)
    await cdp.send("Page.stopScreencast").catch(() => {})
    await cdp.detach().catch(() => {})
    const lum = []
    for (const f of frames) {
        let img
        try {
            img = decodePNG(Buffer.from(f.data, "base64"))
        } catch {
            continue
        }
        const kx = img.width / vp.width
        const ky = img.height / vp.height
        const x0 = Math.floor(rect.x * kx)
        const y0 = Math.floor(rect.y * ky)
        const w = Math.max(1, Math.floor(rect.w * kx))
        const h = Math.max(1, Math.floor(rect.h * ky))
        const gx = Math.min(grid, w)
        const gy = Math.max(1, Math.min(grid, Math.round((gx * h) / w)))
        const L = new Float32Array(gx * gy)
        for (let j = 0; j < gy; j++)
            for (let i = 0; i < gx; i++) {
                const px = Math.min(img.width - 1, x0 + Math.floor(((i + 0.5) * w) / gx))
                const py = Math.min(img.height - 1, y0 + Math.floor(((j + 0.5) * h) / gy))
                const o = (py * img.width + px) * 4
                L[j * gx + i] = 0.2126 * lin(img.data[o]) + 0.7152 * lin(img.data[o + 1]) + 0.0722 * lin(img.data[o + 2])
            }
        lum.push({ t: f.t, L })
    }
    const transitions = []
    for (let k = 1; k < lum.length; k++) {
        const a = lum[k - 1].L
        const b = lum[k].L
        let up = 0
        let down = 0
        for (let i = 0; i < a.length; i++) {
            const d = b[i] - a[i]
            if (d >= threshold) up++
            else if (d <= -threshold) down++
        }
        const n = a.length
        if (up / n >= area) transitions.push({ t: lum[k].t, dir: 1, frac: +(up / n).toFixed(3) })
        if (down / n >= area) transitions.push({ t: lum[k].t, dir: -1, frac: +(down / n).toFixed(3) })
    }
    // a flash = a pair of opposing transitions; count flashes in every 1 s window
    const flashes = []
    for (let k = 1; k < transitions.length; k++) if (transitions[k].dir !== transitions[k - 1].dir) flashes.push(transitions[k].t)
    let maxPerSec = 0
    for (let i = 0; i < flashes.length; i++) {
        let n = 0
        for (let j = i; j < flashes.length && flashes[j] - flashes[i] < 1000; j++) n++
        maxPerSec = Math.max(maxPerSec, n)
    }
    const span = lum.length > 1 ? lum[lum.length - 1].t - lum[0].t : 0
    const fps = span ? +((lum.length - 1) / (span / 1000)).toFixed(1) : 0
    // < 8 captured frames/s cannot resolve 3 flashes/s (headless software raster: ~3 fps at 1280×860,
    // ~9 at 390×844) → run flash checks on a 390×844 page; `reliable` says whether this sample can be trusted
    return { ok: maxPerSec <= 3, reliable: fps >= 8, maxFlashesPerSecond: maxPerSec, transitions: transitions.length, flashes: flashes.length, frames: lum.length, fps, region: rect }
}

// ======================================================================================= dots
export async function dotsNearCentre(page, { waitMs = 2000, nearPx = 24, endProgress = 0.85 } = {}) {
    await ensureLib(page)
    const a = await page.evaluate(() => window.__eosDrive.lib.dotsSample())
    await page.waitForTimeout(waitMs)
    const b = await page.evaluate(() => window.__eosDrive.lib.dotsSample())
    const c = b.centre
    const dist = (p) => Math.hypot(p.x - c.x, p.y - c.y)
    const byKind = {}
    let n = 0
    let closer = 0
    for (const p2 of b.dots) {
        const p1 = a.dots.find((d) => d.kind === p2.kind && d.i === p2.i)
        if (!p1) continue
        n++
        const k = (byKind[p2.kind] = byKind[p2.kind] || { n: 0, closer: 0, nearEndN: 0, nearEndIn: 0 })
        k.n++
        const d1 = Math.hypot(p1.x - a.centre.x, p1.y - a.centre.y)
        if (dist(p2) < d1) {
            closer++
            k.closer++
        }
    }
    let nearEndN = 0
    let nearEndIn = 0
    for (const p of b.dots) {
        if (p.prog == null || p.prog < endProgress) continue
        nearEndN++
        const k = (byKind[p.kind] = byKind[p.kind] || { n: 0, closer: 0, nearEndN: 0, nearEndIn: 0 })
        k.nearEndN++
        if (dist(p) <= nearPx) {
            nearEndIn++
            k.nearEndIn++
        }
    }
    return { centre: c, noCore: b.noCore, n, closerFrac: n ? +(closer / n).toFixed(3) : null, nearEndN, nearEndFrac: nearEndN ? +(nearEndIn / nearEndN).toFixed(3) : null, byKind, animNames: b.names, dots: b.dots.length }
}

// ======================================================================================= node: core unit loader
// Evaluates src/eos/00_eos_core.jsx (+ modules) in node with stubs for the arcade globals it touches.
// globals: extra/override stub source, e.g. { GAMES: "[{id:1,name:'POP'}]" }.
export async function loadCoreNode({ modules = [], globals = {} } = {}) {
    const esbuild = createRequire(import.meta.url)("esbuild")
    const files = ["00_eos_core.jsx", ...modules.filter((m) => m !== "00_eos_core.jsx")].map((m) => path.join(ROOT, "src", "eos", m))
    const src = files.map((f) => fs.readFileSync(f, "utf8")).join("\n\n")
    const names = new Set()
    for (const m of src.matchAll(/^(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1])
    const STUBS = {
        RELEASE_PHASE_EMOTIONS: "{ positive: { sync: [15, 51], rush: [33], glitch: [48], loopie: [35], drop: [8], patch: [37], still: [51] }, negative: { sync: [44, 48], rush: [29], glitch: [15], loopie: [58], drop: [58], patch: [73], still: [41] } }",
        emotionSrc: "(c, m) => `https://example.invalid/${c}/${m}.png`",
        noveltyNoise: "(a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x) }",
        vibrate: "() => {}",
        displayText: "(e, n = 22) => String(e && e.text != null ? e.text : e || '').slice(0, n)",
        GAMES: "[]",
        SHORT_ACTION: "{}",
        SHORT_HINT: "{}",
        RELEASE_MIND_BEND: "{}",
        cleanEntries: "(t) => String(t || '').split(/\\s+/).filter(Boolean)",
        tokeniseWords: "(t) => String(t || '').toLowerCase().match(/[\\p{L}\\p{N}']+/gu) || []",
        pct: "(v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))",
        RELEASE_INPUT_EMOTION_PROFILES: "[]",
        RELEASE_DEFAULT_EMOTION_PROFILE: "{ id: 'general' }",
        SCORE_KEY: "'thinkstill:score'",
        motion: "new Proxy({}, { get: () => 'div' })",
        AnimatePresence: "({ children }) => children",
        PremiumBurst: "() => null",
        ...globals,
    }
    const stubSrc = Object.entries(STUBS)
        .filter(([k]) => !names.has(k))
        .map(([k, v]) => `var ${k} = ${v};`)
        .join("\n")
    const entry = `import * as React from "react";\n${stubSrc}\n${src}\nexport { ${[...names].join(", ")} };\n`
    const outfile = path.join(os.tmpdir(), `eos_core_node_${process.pid}_${Date.now()}.mjs`)
    await esbuild.build({ stdin: { contents: entry, loader: "jsx", resolveDir: HERE, sourcefile: "eos_core_node.jsx" }, bundle: true, format: "esm", platform: "node", jsx: "transform", outfile, logLevel: "error", define: { "process.env.NODE_ENV": '"production"' } })
    try {
        return await import(pathToFileURL(outfile).href)
    } finally {
        fs.rmSync(outfile, { force: true })
    }
}

// ======================================================================================= node: the arcade's CSS
// The arcade's base CSS is NOT greppable in src/00_arcade.jsx: it ships as the gzipped base64 blob CSS_GZIP_B64
// (only the global *_CSS strings at the top of the file are plain text). arcadeCss() returns the decoded blob,
// arcadeCssRules(re) the rules whose selector or body matches `re` — use them to find the !important rule an
// EOS override must beat (e.g. 21 BIN's `.freeAngleBinArena .binBubbleSlot .binWordBubble{transform:none!important}`).
let ARCADE_CSS = null
export function arcadeCss() {
    if (ARCADE_CSS != null) return ARCADE_CSS
    const src = fs.readFileSync(path.join(ROOT, "src", "00_arcade.jsx"), "utf8")
    const m = src.match(/const CSS_GZIP_B64 = \[([\s\S]*?)\]\.join\(""\)/)
    if (!m) throw new Error("CSS_GZIP_B64 not found in src/00_arcade.jsx")
    const b64 = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]).join("")
    ARCADE_CSS = zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf8")
    return ARCADE_CSS
}
export function arcadeCssRules(re) {
    const R = re instanceof RegExp ? re : new RegExp(String(re).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    const css = arcadeCss() + "\n" + (fs.readFileSync(path.join(ROOT, "src", "00_arcade.jsx"), "utf8").match(/^const \w+_CSS = String\.raw`[^`]*`/gm) || []).join("\n")
    const out = []
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (R.test(m[1]) || R.test(m[2])) out.push(`${m[1].trim()}{${m[2].trim()}}`)
    return out
}

// ======================================================================================= CLI
function parseArgs(argv) {
    const a = { _: [] }
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i]
        if (k.startsWith("--")) {
            const key = k.slice(2)
            const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true
            a[key] = v
        } else a._.push(k)
    }
    return a
}
function parseIds(s) {
    const out = []
    for (const part of String(s).split(",")) {
        const m = part.match(/^(\d+)-(\d+)$/)
        if (m) for (let i = +m[1]; i <= +m[2]; i++) out.push(i)
        else if (/^\d+$/.test(part)) out.push(+part)
    }
    return out
}
function sizeOf(a) {
    const [w, h] = String(a.size || (a.phone ? "390x844" : "1280x860")).split("x").map(Number)
    return { width: w || 1280, height: h || 860 }
}
async function runOne(id, a) {
    const { width, height } = sizeOf(a)
    const L = await launchEos({ width, height, dir: a.dir || HERE, reducedMotion: a.reduced ? "reduce" : undefined, lite: !a.render })
    try {
        const s = await startGameById(L.page, id, a.text || "my boss yelled at me and I feel stuck")
        if (!s.ok) return { id, ok: false, start: s, errors: L.errors.slice(0, 5) }
        const r = await finishGame(L.page, id, { alt: a.keyboard ? "keyboard" : "pointer", timeoutMs: Number(a.timeout) || 120000 })
        const log = r.progressLog.map((e) => e.v)
        let back = 0
        for (let i = 1; i < log.length; i++) if (log[i] != null && log[i - 1] != null && log[i] < log[i - 1]) back++
        if (a.shots) await L.page.screenshot({ path: path.join(a.shots, `finish_${id}.png`) }).catch(() => {})
        return { id, name: r.name, ok: r.done, reason: r.reason, ms: r.ms, actions: r.actions, final: r.finalProgress, backwards: back, stages: r.stages.map((x) => `${x.g}${x.label ? ":" + x.label : ""}`), source: r.source, occluded: r.occluded, completeEarly: !!r.completeEarly, errors: L.errors.slice(0, 5), warnings: [...new Set(L.warnings.map((w) => w.slice(0, 120)))].slice(0, 3) }
    } catch (e) {
        return { id, ok: false, reason: "exception: " + String(e).slice(0, 300), errors: L.errors.slice(0, 5) }
    } finally {
        await L.browser.close()
    }
}
async function cli() {
    const a = parseArgs(process.argv.slice(2))
    const cmd = a._[0] || "smoke"
    const dir = a.dir || HERE
    if (cmd === "smoke" || cmd === "finish") {
        const { width, height } = sizeOf(a)
        const L = await launchEos({ width, height, dir, reducedMotion: a.reduced ? "reduce" : undefined })
        let id = a.id ? Number(a.id) : null
        if (!id) id = await gameIdByName(L.page, a.name || "POP")
        const s = await startGameById(L.page, id, a.text || "my boss yelled at me")
        const before = await readProgress(L.page)
        const arrow = await arrowState(L.page)
        const small = await smallText(L.page, 12)
        const r = s.ok ? await finishGame(L.page, id, { alt: a.keyboard ? "keyboard" : "pointer", log: !!a.verbose }) : null
        if (a.shot) await L.page.screenshot({ path: a.shot })
        console.log(JSON.stringify({ start: s, progressAtStart: before, arrow, smallTextAtStart: small.length, finish: r && { ...r, progressLog: r.progressLog.map((e) => e.v).join(",") }, errors: L.errors, warnings: L.warnings.slice(0, 5), noise: L.noise.length }, null, 1))
        await L.browser.close()
        return
    }
    if (cmd === "sweep") {
        const ids = parseIds(a.ids || "1-110")
        const workers = Math.max(1, Number(a.workers) || 2)
        const results = []
        let next = 0
        const t0 = Date.now()
        await Promise.all(
            Array.from({ length: workers }, async () => {
                while (next < ids.length) {
                    const id = ids[next++]
                    const r = await runOne(id, { ...a, dir })
                    results.push(r)
                    console.error(`${r.ok ? "OK  " : "FAIL"} ${String(id).padStart(3)} ${String(r.name || "").padEnd(22)} ${String(r.ms || "").padStart(6)}ms ${r.reason || ""}${r.errors && r.errors.length ? " ERR " + r.errors[0].slice(0, 80) : ""}`)
                }
            })
        )
        results.sort((x, y) => x.id - y.id)
        const summary = { total: results.length, done: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).map((r) => `${r.id} ${r.name || ""}: ${r.reason}`), withErrors: results.filter((r) => r.errors && r.errors.length).map((r) => r.id), backwards: results.filter((r) => r.backwards).map((r) => r.id), minutes: +((Date.now() - t0) / 60000).toFixed(1) }
        if (a.out) fs.writeFileSync(a.out, JSON.stringify({ summary, results }, null, 1))
        console.log(JSON.stringify(summary, null, 1))
        return
    }
    if (cmd === "small") {
        const { width, height } = sizeOf(a)
        const L = await launchEos({ width, height, dir })
        if (a.name || a.id) {
            const id = a.id ? Number(a.id) : await gameIdByName(L.page, a.name)
            await startGameById(L.page, id, a.text || "my boss yelled at me")
        }
        console.log(JSON.stringify(await smallText(L.page, Number(a.min) || 12), null, 1))
        await L.browser.close()
        return
    }
    if (cmd === "css") {
        const rules = a.grep ? arcadeCssRules(new RegExp(a.grep)) : [arcadeCss()]
        console.log(rules.join("\n"))
        return
    }
    if (cmd === "lint") {
        const L = await launchEos({ ...sizeOf(a), dir })
        console.log(JSON.stringify(await lintCopy(L.page, { scope: a.all ? "all" : "eos" }), null, 1))
        await L.browser.close()
        return
    }
    console.error("usage: node eos_drive.mjs smoke|finish|sweep|small|lint [--dir D] [--id N|--name NAME] …")
    process.exit(2)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    cli().catch((e) => {
        console.error(e)
        process.exit(1)
    })
}
