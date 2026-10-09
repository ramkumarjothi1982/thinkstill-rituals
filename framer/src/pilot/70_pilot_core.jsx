// ===================================================================================
// Pilot A · 70_pilot_core.jsx — switch, registry, words, markers and the S6 chrome hooks.
// Spec: docs/pilot/PILOT_A_SPEC.md §2 (S6) and §4. Concatenated after the release modules by
// dev/pilot_build.py; shares file scope with 00_arcade.jsx and src/eos/*.jsx (read-only use).
// Rules: no import/export, no regex lookbehind, every top-level name is EosPilot/eosPilot/EOS_PILOT.
// This is the ONLY file that defines EosPilotEngineFor (the router hook calls it on every render).
// ===================================================================================

const EOS_PILOT_VERSION = "0.3.0"
const EOS_PILOT_IDS = [1, 2, 109]
const EOS_PILOT_FINAL_PCT = 96 // the last input reports this; exactly 100 arrives only at the S2 hand-off
const EOS_PILOT_HANDOFF_MS = 1300 // last input -> hand-off (reduced: EOS_PILOT_HANDOFF_REDUCED_MS)
const EOS_PILOT_HANDOFF_REDUCED_MS = 800
// S2' (addendum): per-game hand-off for games that run the settle sequencer (cfg.settle); reduced motion 900 for all
const EOS_PILOT_HANDOFF = { 1: 2150, 109: 2350, 2: 2250 }
const EOS_PILOT_HANDOFF_SETTLE_REDUCED_MS = 900
const EOS_PILOT_HINTS = { 1: "Tap a bubble to pop it", 2: "Tap the blob: 4 slams each", 109: "Hold an orb, breathe in… then let go" }
const EOS_PILOT_VERBS = { 1: "POPPED", 2: "CRUSHED", 109: "CLEANSED" }

// ---------------------------------------------------------------- the switch (memoised per page load)
// ?pilot=off|on wins, then localStorage eos_pilot ("off"); default ON. Memoised so the element type
// returned to the routers never flips mid-session.
const EOS_PILOT_FLAGS = { on: null, demo: null }
function eosPilotOn() {
    if (EOS_PILOT_FLAGS.on != null) return EOS_PILOT_FLAGS.on
    let on = true
    try {
        const q = typeof location !== "undefined" ? String(location.search || "") : ""
        const m = /[?&]pilot=(on|off|1|0)(&|$)/.exec(q)
        if (m) on = m[1] === "on" || m[1] === "1"
        else if (typeof localStorage !== "undefined" && localStorage.getItem("eos_pilot") === "off") on = false
    } catch (e) {}
    EOS_PILOT_FLAGS.on = on
    return on
}
// Dev demo of the shared systems: ?pilotdemo=1 (and the pilot switch on) swaps ids 1 / 109 / 2 for the
// systems demo (sky / pool / workshop kits). Never on otherwise.
function eosPilotDemoOn() {
    if (EOS_PILOT_FLAGS.demo != null) return EOS_PILOT_FLAGS.demo
    let on = false
    try {
        const q = typeof location !== "undefined" ? String(location.search || "") : ""
        on = /[?&]pilotdemo=1(&|$)/.test(q)
    } catch (e) {}
    EOS_PILOT_FLAGS.demo = on && eosPilotOn()
    return EOS_PILOT_FLAGS.demo
}

// ---------------------------------------------------------------- registry
const EOS_PILOT_ENGINES = {}
const EOS_PILOT_META = {}
const EOS_PILOT_DEMO = { Engine: null }
function eosPilotRegister(id, Engine, meta) {
    const k = Number(id)
    if (!k || typeof Engine !== "function") return
    EOS_PILOT_ENGINES[k] = Engine
    EOS_PILOT_META[k] = { ...(meta || {}) }
}
function eosPilotRegisterDemo(Engine) {
    if (typeof Engine === "function") EOS_PILOT_DEMO.Engine = Engine
}
// Pure lookup, no side effects: runs on every router render.
function EosPilotEngineFor(game) {
    const id = game ? Number(game.id) : 0
    if (!id || EOS_PILOT_IDS.indexOf(id) < 0 || !eosPilotOn()) return null
    if (EOS_PILOT_DEMO.Engine && eosPilotDemoOn()) return EOS_PILOT_DEMO.Engine
    return EOS_PILOT_ENGINES[id] || null
}

// ---------------------------------------------------------------- hint copy (S6.6, G14) — top level, once
try {
    if (typeof window !== "undefined" && eosPilotOn() && typeof SHORT_HINT === "object" && SHORT_HINT) Object.assign(SHORT_HINT, EOS_PILOT_HINTS)
} catch (e) {}

// ---------------------------------------------------------------- words (§3.0, CR-7)
const EOS_PILOT_STOP_TOKENS = ["i", "me", "my", "and", "at", "to", "feel", "am", "is", "so"]
function eosPilotIsStopChunk(chunk) {
    const toks = String(chunk || "")
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z']/g, "").replace(/'m$/, ""))
        .filter(Boolean)
    if (!toks.length) return true
    for (const t of toks) if (EOS_PILOT_STOP_TOKENS.indexOf(t) < 0) return false
    return true
}
// Balanced waves of <= max: 8 -> 4 + 4, 12 -> 6 + 6, 7 -> 4 + 3.
function eosPilotSplitWaves(list, max) {
    const n = list.length
    if (!n) return []
    const k = Math.max(1, Math.ceil(n / Math.max(1, max)))
    const out = []
    let i = 0
    for (let w = 0; w < k; w++) {
        const size = Math.ceil((n - i) / (k - w))
        out.push(list.slice(i, i + size))
        i += size
    }
    return out
}
// -> {waves: string[][], words: string[], imageOnly}. Unique, readable chunks (no padding beyond what the
// core does for an empty input), stop-only chunks merged into a neighbour so every token still shows.
function eosPilotWords(entries, max = 6) {
    const list = Array.isArray(entries) ? entries : []
    let imageOnly = false
    try {
        imageOnly = typeof isImageOnlyEntries === "function" ? !!isImageOnlyEntries(list) : false
    } catch (e) {}
    let chunks = []
    try {
        const strong =
            typeof eosSafetyStrong === "function" &&
            (eosSafetyStrong(EOS_STORE.get().safety) || (typeof EosSafetyScan === "function" && eosSafetyStrong(EosSafetyScan(list))))
        if (strong) chunks = eosWords(list, Math.max(1, max))
        else {
            const seen = {}
            for (const e of list) {
                const t = typeof displayText === "function" ? displayText(e, 22) : String(e || "").slice(0, 22)
                const k = String(t || "").toLowerCase()
                if (t && !seen[k] && !/uploaded image/i.test(t)) {
                    seen[k] = 1
                    chunks.push(String(t))
                }
            }
            if (!chunks.length) chunks = eosWords(list, Math.min(3, Math.max(1, max)))
        }
    } catch (e) {
        chunks = list.map((x) => String(x || "")).filter(Boolean)
    }
    const merged = []
    for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i]
        if (chunks.length > 1 && eosPilotIsStopChunk(c)) {
            if (i + 1 < chunks.length) {
                chunks[i + 1] = c + " " + chunks[i + 1]
                continue
            }
            if (merged.length) {
                merged[merged.length - 1] = merged[merged.length - 1] + " " + c
                continue
            }
        }
        merged.push(c)
    }
    return { waves: eosPilotSplitWaves(merged, max), words: merged, imageOnly }
}

// A character for an object: the word's detected emotion if that character is free, else the next free one.
const EOS_PILOT_CHARS = ["sync", "rush", "glitch", "loopie", "drop", "patch", "still"]
function eosPilotCharFor(word, i, used) {
    const taken = used || {}
    try {
        const d = typeof eosDetectEmotion === "function" ? eosDetectEmotion(word) : null
        const c = d && EOS_EMO[d.id] ? EOS_EMO[d.id].char : null
        if (c && !taken[c]) return c
    } catch (e) {}
    const n = EOS_PILOT_CHARS.length
    const start = Math.abs(Number(i) || 0) % n
    for (let k = 0; k < n; k++) {
        const c = EOS_PILOT_CHARS[(start + k) % n]
        if (!taken[c]) return c
    }
    return EOS_PILOT_CHARS[start]
}

// ---------------------------------------------------------------- markers (S6.5, G7)
// Exactly one live marker at a time. Keys g, label, ms, mvar, n (never "L": eosTarget drops it).
function eosPilotMarker(spec, live) {
    if (!live || !spec) return {}
    const s = { ...spec }
    if (s.L != null && s.label == null) s.label = s.L
    delete s.L
    return eosTarget(s)
}

// ---------------------------------------------------------------- shell attributes (S6.1)
// Set on .cinematicContentShell (arena.parentElement), outside React, so wrapper re-renders keep them.
// eosPilotShellAttrs(arena, {pilot, guide, toastTop}) · eosPilotShellAttrs(arena, null) removes all.
function eosPilotShell(arena) {
    const sh = arena && arena.parentElement
    return sh && sh.classList && sh.classList.contains("cinematicContentShell") ? sh : null
}
function eosPilotShellAttrs(arena, attrs) {
    const sh = eosPilotShell(arena)
    if (!sh) return null
    try {
        if (!attrs) {
            sh.removeAttribute("data-eos-pilot")
            sh.removeAttribute("data-eos-pilot-guide")
            sh.style.removeProperty("--eos-pilot-toast-top")
            return sh
        }
        if (attrs.pilot != null) sh.setAttribute("data-eos-pilot", String(attrs.pilot))
        if (attrs.guide != null) sh.setAttribute("data-eos-pilot-guide", String(attrs.guide))
        if (attrs.toastTop != null) sh.style.setProperty("--eos-pilot-toast-top", `${Math.round(attrs.toastTop)}px`)
    } catch (e) {}
    return sh
}
function eosPilotIsPhone(el) {
    try {
        const w = el && el.getBoundingClientRect ? el.getBoundingClientRect().width : typeof window !== "undefined" ? window.innerWidth : 1280
        return w < 700
    } catch (e) {
        return false
    }
}
// The engine's chrome hook: shell attributes for its lifetime + the phone guide dock (S6.4).
// Returns {guide(mode), playInput()}: the engine calls playInput() on every play pointerdown (closes "open").
function useEosPilotShell(arenaRef, gameId) {
    const api = React.useRef(null)
    if (!api.current) {
        const st = { mode: "off", timer: 0, arena: null }
        api.current = {
            st,
            guide(mode) {
                const a = st.arena
                if (!a) return
                if (st.timer) clearTimeout(st.timer)
                st.timer = 0
                st.mode = mode
                eosPilotShellAttrs(a, { guide: mode })
                if (mode === "open")
                    st.timer = setTimeout(() => {
                        st.timer = 0
                        if (st.mode === "open") api.current.guide("dock")
                    }, 4000)
            },
            playInput() {
                if (st.mode === "open") api.current.guide("dock")
            },
            mode: () => st.mode,
        }
    }
    React.useLayoutEffect(() => {
        const a = arenaRef.current
        if (!a) return undefined
        const st = api.current.st
        st.arena = a
        eosPilotAfterglowClear() // every pilot mount clears stale afterglow values
        const phone = eosPilotIsPhone(a)
        st.mode = phone ? "dock" : "off"
        eosPilotShellAttrs(a, { pilot: gameId, guide: st.mode })
        const sh = eosPilotShell(a)
        const onDown = (e) => {
            const g = e.target && e.target.closest ? e.target.closest(".globalPlayGuide") : null
            if (!g) return
            if (st.mode === "dock") api.current.guide("open")
            else if (st.mode === "open") api.current.guide("dock")
        }
        if (sh) sh.addEventListener("pointerdown", onDown, true)
        return () => {
            if (sh) sh.removeEventListener("pointerdown", onDown, true)
            if (st.timer) clearTimeout(st.timer)
            st.timer = 0
            eosPilotShellAttrs(a, null)
            if (!EOS_PILOT_AFTERGLOW.handed) eosPilotAfterglowClear()
            EOS_PILOT_AFTERGLOW.handed = false
            st.arena = null
        }
    }, [arenaRef, gameId])
    return api.current
}

// ---------------------------------------------------------------- afterglow on the reveal (S6.9, CR-2b)
const EOS_PILOT_AFTERGLOW = { root: null, mo: null, handed: false }
function eosPilotAfterglowClear() {
    const g = EOS_PILOT_AFTERGLOW
    try {
        if (g.mo) g.mo.disconnect()
    } catch (e) {}
    g.mo = null
    const roots = []
    if (g.root) roots.push(g.root)
    try {
        if (typeof document !== "undefined") document.querySelectorAll("[data-eos-pilot-afterglow]").forEach((r) => roots.indexOf(r) < 0 && roots.push(r))
    } catch (e) {}
    for (const r of roots) {
        try {
            r.removeAttribute("data-eos-pilot-afterglow")
            r.style.removeProperty("--eos-pilot-afterglow-face")
        } catch (e) {}
    }
    g.root = null
}
// Called by S2 at the hand-off: tints the coming reveal with the kit's calm light + the hero's win face.
function eosPilotAfterglow(kit, faceSrc, arena) {
    eosPilotAfterglowClear()
    const g = EOS_PILOT_AFTERGLOW
    let root = null
    try {
        root = (arena && arena.closest && arena.closest(".tsArcade")) || (typeof document !== "undefined" ? document.querySelector(".tsArcade") : null)
    } catch (e) {}
    if (!root || !kit) return
    g.root = root
    g.handed = true
    root.setAttribute("data-eos-pilot-afterglow", String(kit))
    if (faceSrc) root.style.setProperty("--eos-pilot-afterglow-face", `url("${String(faceSrc).replace(/"/g, "%22")}")`)
    let seenReveal = false
    try {
        g.mo = new MutationObserver(() => {
            const c = root.className || ""
            if (/(^|\s)stage-reveal(\s|$)/.test(c)) seenReveal = true
            else if (seenReveal || !/(^|\s)stage-play(\s|$)/.test(c)) eosPilotAfterglowClear()
        })
        g.mo.observe(root, { attributes: true, attributeFilter: ["class"] })
    } catch (e) {}
}

// ---------------------------------------------------------------- dev handle
eosExpose("pilot", {
    on: () => eosPilotOn(),
    demo: () => eosPilotDemoOn(),
    ids: EOS_PILOT_IDS.slice(),
    state: () => ({ version: EOS_PILOT_VERSION, on: eosPilotOn(), demo: eosPilotDemoOn(), engines: Object.keys(EOS_PILOT_ENGINES).map(Number) }),
})

// ---------------------------------------------------------------- CSS: arena base + S6 chrome hooks
const EOS_PILOT_SHELL = `${EOS_A}.stage-play .cinematicContentShell`
const EOS_PILOT_CORE_CSS = `
${EOS_A} .eosPilotArena{position:relative;width:100%;height:100%;min-height:100%;overflow:hidden;isolation:isolate;contain:layout paint;
  box-shadow:none!important;background:#0c1022;border-radius:inherit;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;
  font-family:inherit;color:#fff}
${EOS_A} .eosPilotArena *{box-sizing:border-box}
/* S2' over-burst suppression: nothing paints over the approved mega burst while the pilot hands off */
${EOS_A}[data-eos-pilot-burst] .eosMoodFlip{visibility:hidden!important}

/* S6.2 toast dock: both toasts under the HUD band, centred (G6). */
${EOS_PILOT_SHELL}[data-eos-pilot] .globalStepFeedbackCopy,
${EOS_PILOT_SHELL}[data-eos-pilot] .globalFinishFeedbackCopy{
  --fx-x:50%!important;--fx-y:var(--eos-pilot-toast-top,72px)!important;
  top:var(--eos-pilot-toast-top,72px)!important;left:50%!important;right:auto!important;bottom:auto!important;translate:-50% 0!important}
/* CLEANSE quiet variant (CR-11): kept, just quieter */
${EOS_PILOT_SHELL}[data-eos-pilot="109"] .globalStepFeedbackCopy{background:none!important;box-shadow:none!important;border:0!important;
  font-size:13px!important;opacity:.8!important;text-shadow:0 1px 6px rgba(0,0,30,.6)!important}

/* S6.4 guide dock (phone only; desktop stays "off"). The guide element and its classes are untouched. */
${EOS_PILOT_SHELL}[data-eos-pilot-guide="dock"] > .globalPlayGuide{
  height:44px!important;min-height:44px!important;max-height:44px!important;overflow:hidden!important;padding:0 40px 0 12px!important;
  display:flex!important;align-items:center!important;pointer-events:auto!important;cursor:pointer;top:auto!important}
${EOS_PILOT_SHELL}[data-eos-pilot-guide="dock"] > .globalPlayGuide > :is(.guideHeaderRow,.globalMindBend,.guideAmbient,.guideSweep),
${EOS_PILOT_SHELL}[data-eos-pilot-guide="bend"] > .globalPlayGuide > :is(.guideHeaderRow,.guideStepCard,.guideAmbient,.guideSweep){display:none!important}
${EOS_PILOT_SHELL}[data-eos-pilot-guide="dock"] > .globalPlayGuide .guideStepCard{
  margin:0!important;min-height:0!important;max-height:40px!important;flex:1 1 auto!important;min-width:0!important;
  white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;padding-top:0!important;padding-bottom:0!important;
  display:flex!important;align-items:center!important;background:none!important;border:0!important;box-shadow:none!important}
${EOS_PILOT_SHELL}[data-eos-pilot-guide="dock"] > .globalPlayGuide .guideStepCard *{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
${EOS_PILOT_SHELL}[data-eos-pilot-guide="dock"] > .globalPlayGuide::after{content:"";position:absolute;right:16px;top:50%;width:9px;height:9px;
  border-left:2px solid rgba(255,255,255,.8);border-top:2px solid rgba(255,255,255,.8);transform:translateY(-25%) rotate(45deg);pointer-events:none}
${EOS_PILOT_SHELL}[data-eos-pilot-guide="bend"] > .globalPlayGuide{
  height:auto!important;min-height:44px!important;max-height:64px!important;overflow:hidden!important;padding:6px 12px!important;top:auto!important;
  display:flex!important;align-items:center!important}
${EOS_PILOT_SHELL}[data-eos-pilot-guide="bend"] > .globalPlayGuide > .globalMindBend{margin:0!important;max-height:52px!important;overflow:hidden!important;
  display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical}

/* S6.7 word rule (G15): beats the audit's .tsExactUserText restyle. */
${EOS_A} .eosPilotArena .eosWord.eosPilotWord:is(*,.tsExactUserText){
  font-size:var(--eos-pilot-word-px,16px)!important;font-weight:800!important;line-height:1.12!important;
  color:var(--eos-pilot-ink,#fff)!important;opacity:1!important;letter-spacing:0!important;text-transform:none!important}

/* S6.8 arcade button resets (G17) + a light focus ring that follows the object (never a plate). */
${EOS_A} .eosPilotArena .eosPilotHit:is(*,:hover,:focus,:active,:disabled){background:none!important;border:0!important;
  box-shadow:none!important;padding:0!important;min-width:0!important;min-height:0!important;font:inherit!important;color:inherit!important;
  outline:none;transform:none;filter:none!important;opacity:1}
${EOS_A} .eosPilotArena .eosPilotHit:focus-visible::after{content:"";position:absolute;inset:-6px;border-radius:50%;
  box-shadow:0 0 0 2px rgba(255,255,255,.92),0 0 14px 2px rgba(180,230,255,.6);pointer-events:none}

/* S6.9 afterglow on the reveal (behind the pilot switch; owner sign-off). Never changes the overlay's DOM. */
${EOS_A}.stage-reveal[data-eos-pilot-afterglow] .releaseCompleteOverlay{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
${EOS_A}.stage-reveal[data-eos-pilot-afterglow="sky"] .releaseCompleteOverlay{
  background:radial-gradient(60% 40% at 22% 12%,rgba(255,244,218,.55),transparent 70%),linear-gradient(180deg,rgba(79,168,236,.96),rgba(154,212,246,.94) 58%,rgba(230,245,255,.92))!important}
${EOS_A}.stage-reveal[data-eos-pilot-afterglow="pool"] .releaseCompleteOverlay{
  background:radial-gradient(1.5px 1.5px at 18% 14%,#fff 60%,transparent),radial-gradient(1.2px 1.2px at 72% 9%,#fff 60%,transparent),
  radial-gradient(1.5px 1.5px at 86% 26%,#dfe8ff 60%,transparent),radial-gradient(1px 1px at 40% 22%,#fff 60%,transparent),
  radial-gradient(40% 28% at 80% 12%,rgba(207,227,255,.28),transparent 70%),linear-gradient(180deg,rgba(7,13,42,.97),rgba(24,38,94,.95))!important}
${EOS_A}.stage-reveal[data-eos-pilot-afterglow="workshop"] .releaseCompleteOverlay{
  background:radial-gradient(55% 40% at 50% 66%,rgba(255,196,106,.42),transparent 72%),linear-gradient(180deg,rgba(74,64,56,.97),rgba(106,82,66,.95))!important}
${EOS_A}.stage-reveal[data-eos-pilot-afterglow] .releaseCompleteCard::before{content:""!important;display:block!important;position:relative!important;inset:auto!important;
  flex:0 0 auto!important;align-self:center!important;width:96px!important;height:96px!important;min-height:0!important;margin:0 auto 12px!important;border-radius:50%!important;
  transform:none!important;translate:none!important;opacity:1!important;animation:none!important;pointer-events:none;mix-blend-mode:normal!important;filter:none!important;
  background:var(--eos-pilot-afterglow-face,none) center/cover no-repeat,radial-gradient(circle at 40% 32%,rgba(255,255,255,.9),rgba(200,225,255,.5))!important;
  box-shadow:0 0 0 2px rgba(255,255,255,.7),0 6px 22px rgba(255,220,160,.35)!important}
@media (max-width:700px){${EOS_A}.stage-reveal[data-eos-pilot-afterglow] .releaseCompleteCard::before{width:72px!important;height:72px!important;margin-bottom:8px!important}}
`
eosCss("pilot-core", EOS_PILOT_CORE_CSS)
