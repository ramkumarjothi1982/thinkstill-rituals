// ===================================================================================
// EOS · 60 FIXES — existing-game fixes (docs/EOS_SPEC.md §11, §0.2 eosTextSafety / EOS_NEUTRAL_WORDS,
// §3.10 66/80 copy). Task id: `fixes`. Nothing is removed: every fix is data, CSS or a read-only guard,
// wired by the integration steps (I1 / I2 / I3, dev/eos_integrate.py).
//
//   EOS_HINT_FIX        corrected LIVE GUIDE lines (merged into SHORT_HINT at module top level)
//   eosGateProgress     monotonic progress gate for both wrappers (I1-E7 / E8)
//   EOS_LIVE_SELECTORS  the "which one is next" element of every hidden-order game (§11.3)
//   EosEntries          short input → 6 unique readable chunks; crisis words → EOS_NEUTRAL_WORDS (I2-E12)
//   EosLegacyGuards     hold-release guard, "almost!" lines, drum voices, BIN drop guard (I1-E3)
//   EOS_FIXES_ALMOST    the "almost!" copy per game (never "wrong")
//   EOS_FIXES_CSS       live highlight, tool pulse, occlusion / clip / phone-fit fixes
// ===================================================================================

// ---------------------------------------------------------------- §11.1 wrong guide texts
const EOS_HINT_FIX = {
    3: "Grab the hammer, then tap each egg 3×", 4: "Grab the boot, then stomp each bubble 3×", 5: "Tap to swing",
    6: "Tap the zapper 3×", 8: "Pull the rock down, then let go", 9: "Grab the laser, then tap each bubble 3×",
    11: "Hold, then let go when the needle is in the green", 12: "Tap the paddle 3×", 14: "Tap the glowing corner",
    16: "Light the torch, then tap each ice cube 3×", 17: "Tap the glowing weak spot", 19: "Grab the eraser, then rub each word",
    20: "Tap the glowing shape", 21: "Drag each word into the bin", 28: "Open the drawer, then drag the card down",
    30: "Tap zoom-out 4×", 31: "Drag the card down and to the right", 33: "Snip the glowing string",
    36: "Drag the cloud slowly to the right", 37: "Tap the glowing floor", 38: "Open, drop the card in, close",
    40: "Fold both wings, then swipe the plane right", 41: "Tap a string to snap its bubble free", 42: "Drag the glowing knot",
    43: "Grab the scissors, then tap each word 3×", 48: "Peel the sticker up and to the right", 51: "Tap the glowing view",
    53: "Tap 4× to make it silly", 54: "Tap the dial 4×", 55: "Tap each glowing switch", 56: "Tap a verdict",
    57: "Tap rotate 3×", 58: "Tap the focus knob 4×", 60: "Tap the glowing corner", 61: "Tap each word 3× to freeze it",
    63: "Tap the glowing portal", 66: "Hands off — breathe with the glow", 67: "Tap left, then right — 8 times",
    69: "Tap slowly — one tap per pulse", 74: "Pop the glowing bubble", 76: "Tap rewind 4×",
    80: "Don't touch — breathe with the glow", 84: "Swipe left for mine, right for not mine", 85: "Pick one move you can make",
    90: "Tap the coin to flip it", 92: "Tap how big it feels", 96: "Grab the scratcher, then scratch the card",
    99: "Hold each bubble until it goes quiet", 101: "Pull left, then let go — 6 times", 109: "Hold… then let go slowly",
}
// shortHint() prefers SHORT_HINT and both wrappers build the LIVE GUIDE line from it → fixes every panel at once.
try {
    if (typeof SHORT_HINT === "object" && SHORT_HINT) Object.assign(SHORT_HINT, EOS_HINT_FIX)
} catch {}

// ---------------------------------------------------------------- §11.2 progress never goes backwards
// wrappedSfx adds a provisional step on every sfx call for the non-explicit games, then the engine's own
// report() sets a lower absolute value (CRUSH 15 → 30 → 45 → 17). The gate keeps the bar monotonic and keeps
// the sfx creep ≤ 12 ahead of what the engine itself reported (an engine that never reports, e.g.
// 50 UNFINISHED SENTENCE, may creep to 90) — the wrapper can never show 100 before onDone.
// Wired by I1-E7 / E8: reportProgress(value, label, eosFromSfx) → eosGateProgress(progressRef, value, eosFromSfx).
// The scratch stub in dev/eos_integrate.py is this exact algorithm (acceptance 9).
const EOS_PROGRESS_OWN = new WeakMap() // progressRef → highest value the ENGINE itself reported (0 once it reported at all)
function eosGateProgress(ref, value, fromSfx) {
    const v = pct(value)
    const cur = Number(ref && ref.current) || 0
    if (!fromSfx && v <= 0 && cur <= 0) {
        // fresh mount / reset: the engine reports
        EOS_PROGRESS_OWN.set(ref, 0)
        return 0
    }
    if (fromSfx) {
        const own = EOS_PROGRESS_OWN.get(ref)
        return Math.max(cur, Math.min(v, own == null ? 90 : own + 12, 96))
    }
    EOS_PROGRESS_OWN.set(ref, Math.max(EOS_PROGRESS_OWN.get(ref) || 0, v))
    return Math.max(cur, v) // monotonic
}

// ---------------------------------------------------------------- §11.3 hidden-order games: the live element
// Written once, interpolated into the highlight rule, the reduced-motion / calm rule (and read by tests).
const EOS_LIVE_SELECTORS = [
    "button.paperCorner:not(:disabled)", //                                           14 CRUMPLE
    ".bossBlob > button.weakSpot:first-of-type:not(.dead)", //                         17 BOSS BATTLE
    ".bossBlob > button.weakSpot.dead + button.weakSpot:not(.dead)",
    ".glitchPanel button.live", //                                                    20 GLITCH OUT
    ".balloonRig > button.balloonWeight:first-of-type:not(.cut)", //                   33 FLOAT AWAY
    ".balloonRig > button.balloonWeight.cut + button.balloonWeight:not(.cut)",
    ".floorStack button:not(:disabled)", //                                           37 ELEVATOR DOWN
    ".tangleBoard > .knot:first-of-type:not(.loose)", //                               42 UNTANGLE
    ".tangleBoard > .knot.loose + .knot:not(.loose)",
    ".orbitButtons button.live", //                                                   51 MIRROR FLIP
    ".productionStrip button:not(:disabled)", //                                      55 HEADLINE
    "button.cropHandle:not(:disabled)", //                                            60 CROP TOOL
    ".portalRing button.hot", //                                                      63 PATTERN POP
    ".tapOutPads button.eosNext", //                                                  67 TAP OUT (I3-E1/E2)
    ".defuseZone.active button", //                                                   71 DEFUSE
    ".bubbleWrapSheet > button:first-of-type:not(.popped)", //                         74 BUBBLE WRAP
    ".bubbleWrapSheet > button.popped + button:not(.popped)",
]
const EOS_FIXES_LIVE = EOS_LIVE_SELECTORS.join(",")
const EOS_FIXES_DIM = [
    "button.paperCorner:disabled",
    ".floorStack button:disabled",
    ".productionStrip button:disabled",
    "button.cropHandle:disabled",
    ".glitchPanel button:not(.live)",
    ".orbitButtons button:not(.live)",
    ".bubbleWrapSheet > button:not(.popped)",
].join(",")
// §11.4 tool-first games (3, 4, 9, 16, 19, 43, 96): the un-armed dock pulses until the tool is in hand.
const EOS_FIXES_TOOLS = ".crackToolDock,.stompToolDock,.laserToolDock,.meltToolButton,.eraseActivateBtn,.cutLoopScissorPicker,.scratchToolButton"
const EOS_FIXES_TOOL_IDLE = `:is(${EOS_FIXES_TOOLS}):not(.selected):not(.active):not(.toolArmed)`
// calm = OS reduced motion OR the in-app calm-visuals toggle (dots sets data-eos-calm, the guards set their own)
const EOS_FIXES_CALM = `${EOS_A}:is([data-eos-calm="1"],[data-eos-fixes-calm="1"])`

// ---------------------------------------------------------------- §11.5 entries: no "I / am / I", no crisis words
const EOS_FIXES_STOP = new Set(
    "i im i'm am is are was a an the to of and so my me it its at in on for with just really very about that this be been feel feeling".split(" ")
)
function eosFixesStopword(tok) {
    return EOS_FIXES_STOP.has(String(tok || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[!?]+$/, ""))
}
// Pure, deterministic, safe during render (reads only the in-memory prefs cache and the store).
// → null (original cleanEntries behaviour) | string[6]
function EosEntries(raw) {
    const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw)
    // S1 safety first, regardless of `enrich`: records only the flag TYPE (never text) for EosMarkLaunch.
    const flag = eosTextSafety(text)
    const tokens = tokeniseWords(text)
    if (!tokens.length) return null // empty composer: keep [] (image-only uploads take their own path)
    if (eosSafetyStrong(flag) || eosSafetyStrong(EOS_STORE.get().safety)) return EOS_NEUTRAL_WORDS.slice()
    if (eosPrefs().enrich === false || tokens.length >= 6) return null
    // leading stopwords attach to the next content word; trailing ones to the previous phrase
    const phrases = []
    let lead = []
    for (const tok of tokens) {
        if (eosFixesStopword(tok)) lead.push(tok)
        else {
            phrases.push(lead.concat([tok]).join(" "))
            lead = []
        }
    }
    if (lead.length && phrases.length) phrases[phrases.length - 1] += " " + lead.join(" ")
    // only stopwords ("i am", "i i i") → the whole input is one phrase, never "i" / "am" bubbles
    const chunks = phrases.length ? phrases : [lead.join(" ")]
    const out = []
    const seen = new Set()
    const add = (s) => {
        const t = String(s || "").trim()
        const k = t.toLowerCase()
        if (!t || seen.has(k) || out.length >= 6) return
        seen.add(k)
        out.push(t)
    }
    chunks.forEach(add)
    const st = EOS_STORE.get()
    let emoId = st.emotion
    if (!EOS_EMO[emoId]) {
        const det = eosDetectEmotion(text)
        emoId = det ? det.id : null
    }
    const emo = EOS_EMO[emoId] || EOS_GUIDE_CHAR
    emo.seeds.forEach(add)
    EOS_GUIDE_CHAR.seeds.forEach(add)
    return out.length ? out : null
}

// ---------------------------------------------------------------- §11.7 guards
// "almost!" feedback — never "wrong". 39 BLACK HOLE shares the hold rule of 13 / 65 (same U hold button).
const EOS_FIXES_ALMOST = {
    11: "almost! let go on green",
    13: "keep holding…",
    39: "keep holding…",
    65: "keep holding…",
    36: "slower… 🐢",
    64: "wait for red…",
    69: "wait for the pulse…",
    70: "every other beat ♪",
    66: "almost — hands off for a moment",
    80: "almost — hands off for a moment",
}
// I1-E15: a miss the guard detected (same rule as the game's own miss branch) keeps its sound but must not
// also show the wrapper's step reward / add a creep step. One-shot, consumed by the very next sfx of that game.
const EOS_FIXES_MISS = { id: 0, t: 0 }
function eosFixesMarkMiss(id) {
    EOS_FIXES_MISS.id = id
    EOS_FIXES_MISS.t = Date.now()
}
function eosSfxMiss(game, kind) {
    const m = EOS_FIXES_MISS
    if (!m.id) return false
    const hit = m.id === Number(game && game.id) && Date.now() - m.t <= 400
    m.id = 0
    return hit && (kind === "soft" || kind === "tap")
}
// Legacy `U` hold buttons (onPointerUp only): meter readers from the committed DOM (= the handler's closure)
const EOS_FIXES_NUM = (s, re) => {
    const m = String(s || "").match(re)
    return m ? Number(m[1]) : NaN
}
const EOS_FIXES_HOLD = {
    11: { sel: ".pressureCapsule", read: (el) => Number(el.style.getPropertyValue("--p")), ok: (m) => m >= 55 && m <= 92 },
    13: { sel: ".foamWord", read: (el) => (1 - EOS_FIXES_NUM(el.style.transform, /scaleY\(([-\d.]+)\)/)) * 130, ok: (m) => m >= 82 - 0.5, ms: 1300 },
    39: { sel: ".spaghettify", read: (el) => EOS_FIXES_NUM(el.style.transform, /translateX\(([-\d.]+)px\)/) / 0.9, ok: (m) => m >= 85 - 0.5, ms: 1250 },
    65: { sel: ".pauseRing", read: (el) => Number(el.style.getPropertyValue("--p")), ok: (m) => m >= 95 - 0.5, ms: 2400 },
}
// 66 BUFFERING · 80 DON'T TAP: a touch restarts the round (3 s / 5 s)
const EOS_FIXES_ROUND_MS = { 66: 3000, 80: 5000 }
// 68 DRUM IT: the kit's own buttons are KICK · SNARE · TOM · CLAP → four distinct synth voices (P2)
const EOS_FIXES_DRUM = ["kick", "snare", "tom", "clap"]
function eosFixesDrum(voice) {
    switch (voice) {
        case "kick": // pitch-dropped sine thump + a click
            eosTone(150, 260, { type: "sine", glide: 42, gain: 0.18 })
            eosTone(900, 18, { type: "square", gain: 0.02 })
            break
        case "snare": // body + bright rattle
            eosTone(230, 130, { type: "triangle", glide: 140, gain: 0.09 })
            eosTone(3100, 110, { type: "square", glide: 1700, gain: 0.022 })
            eosTone(4700, 70, { type: "sawtooth", gain: 0.012, at: 0.004 })
            break
        case "tom": // round mid tom
            eosTone(196, 300, { type: "sine", glide: 98, gain: 0.15 })
            eosTone(392, 90, { type: "triangle", glide: 200, gain: 0.03 })
            break
        default: // clap: three quick claps + a short tail
            ;[0, 0.012, 0.026].forEach((at) => eosTone(1250, 26, { type: "sawtooth", glide: 700, gain: 0.05, at }))
            eosTone(1050, 120, { type: "triangle", glide: 600, gain: 0.03, at: 0.034 })
    }
}
const EOS_FIXES_DRUM_LOG = [] // dev/test only: voice names (never user text)
const EOS_FIXES_GUARD_IDS = new Set([11, 13, 21, 36, 39, 64, 65, 66, 68, 69, 70, 80])
// 21 BIN: the dragged bubble is frozen by `transform:none!important` → mirror framer-motion's inline
// transform into --eos-bin-t (CSS below), and bin it when the finger lets go over the mouth (I3-E4 margins).
const EOS_FIXES_BIN_MARGIN = { l: 70, r: 70, t: 80, b: 90 }

function eosFixesReducedMotion() {
    try {
        return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    } catch {
        return false
    }
}

// Mounted by I1-E3 in the play fragment for EVERY game: <EosLegacyGuards game={selected} hostRef={gameHostRef} />
function EosLegacyGuards({ game, hostRef }) {
    const id = Number(game && game.id) || 0
    useEosStore() // re-render on the calm-visuals toggle
    const calm = eosCalm(eosFixesReducedMotion())
    const layerRef = React.useRef(null)
    const [line, setLine] = React.useState(null) //  {key, text, x, y, out}
    const [ring, setRing] = React.useState(null) //  {key, x, y}
    const active = EOS_FIXES_GUARD_IDS.has(id)

    // calm visuals → the live / tool pulses stop (CSS hook on .tsArcade; dots sets data-eos-calm too)
    React.useEffect(() => {
        const host = hostRef && hostRef.current
        const root = (host && host.closest && host.closest(".tsArcade")) || (typeof document !== "undefined" ? document.querySelector(".tsArcade") : null)
        if (!root) return
        if (calm) root.setAttribute("data-eos-fixes-calm", "1")
        else root.removeAttribute("data-eos-fixes-calm")
        return () => root.removeAttribute("data-eos-fixes-calm")
    }, [calm, hostRef, id])

    React.useEffect(() => {
        if (!active || typeof window === "undefined") return
        let alive = true
        const timers = new Set()
        const later = (fn, ms) => {
            const t = setTimeout(() => {
                timers.delete(t)
                if (alive) fn()
            }, ms)
            timers.add(t)
            return t
        }
        const synthetic = new WeakSet()
        const S = { hold: null, drag: null, bin: null, lastTap: 0, lastRestart: 0, restarts: 0, lineAt: 0, lineKey: 0 }
        const host = () => (hostRef && hostRef.current) || document.querySelector(".releaseStage")
        const arena = () => {
            const h = host()
            return h ? (h.matches && h.matches(".arena") ? h : h.querySelector(".arena")) : null
        }
        const within = (t) => {
            const h = host()
            return !!(h && t && h.contains && h.contains(t))
        }
        const ctlOf = (t) => (t && t.closest ? t.closest("button.uniqControl") : null)
        const ctl = () => {
            const a = arena()
            return a ? a.querySelector("button.uniqControl") : null
        }
        // layer-relative coordinates (Framer may scale the canvas)
        const local = (x, y) => {
            const L = layerRef.current
            if (!L) return null
            const r = L.getBoundingClientRect()
            const k = eosStageScale(L)
            return { x: (x - r.left) / k, y: (y - r.top) / k, w: r.width / k, h: r.height / k }
        }
        const say = (text, cx, cy) => {
            const now = Date.now()
            if (!text || now - S.lineAt < 2000) return // at most one line per 2 s
            const p = local(cx, cy)
            if (!p) return
            S.lineAt = now
            const key = ++S.lineKey
            const half = Math.min(150, p.w / 2)
            const x = eosClamp(p.x, half, Math.max(half, p.w - half))
            const y = eosClamp(p.y - 58, 64, Math.max(64, p.h - 24))
            setLine({ key, text, x, y, out: false })
            later(() => setLine((l) => (l && l.key === key ? { ...l, out: true } : l)), 2100)
            later(() => setLine((l) => (l && l.key === key ? null : l)), 2700)
        }
        const centre = (el) => {
            const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null
            return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null
        }
        const meterOf = (rule) => {
            const a = arena()
            const el = a && a.querySelector(rule.sel)
            if (!el) return NaN
            try {
                return rule.read(el)
            } catch {
                return NaN
            }
        }
        const progress = () => {
            const h = host()
            return eosProgressOf((h && h.closest && h.closest(".releaseStage")) || h)
        }

        const onDown = (e) => {
            if (synthetic.has(e) || !within(e.target)) return
            const t = e.target
            if (EOS_FIXES_HOLD[id] && ctlOf(t)) S.hold = { pointerId: e.pointerId, pointerType: e.pointerType, t: Date.now(), x: e.clientX, y: e.clientY }
            if (id === 36 && t.closest && t.closest(".neonCloud")) S.drag = { x: e.clientX, y: e.clientY, t: Date.now() }
            if (id === 68 && t.closest) {
                const b = t.closest(".drumKit button")
                if (b && b.parentElement) {
                    const n = Array.prototype.indexOf.call(b.parentElement.children, b)
                    const voice = EOS_FIXES_DRUM[((n % 4) + 4) % 4]
                    eosFixesDrum(voice)
                    if (eosIsDev()) EOS_FIXES_DRUM_LOG.push(voice)
                    if (EOS_FIXES_DRUM_LOG.length > 64) EOS_FIXES_DRUM_LOG.shift()
                }
            }
            if (id === 21 && t.closest) {
                const b = t.closest(".binWordBubble")
                if (b && !b.disabled) {
                    S.bin = { el: b, pointerId: e.pointerId }
                    engaged.add(b)
                }
                binWake(0) // mirror while the finger is down (a press on BIN IT ALL wakes it too)
            }
        }
        const onUp = (e) => {
            if (synthetic.has(e)) return
            // ---- hold-release guard (11 / 13 / 39 / 65)
            if (S.hold && (e.pointerId === S.hold.pointerId || e.pointerId == null)) {
                const h = S.hold
                S.hold = null
                const rule = EOS_FIXES_HOLD[id]
                const m = meterOf(rule)
                const held = Date.now() - h.t
                const ok = Number.isFinite(m) ? rule.ok(m) : rule.ms ? held >= rule.ms : true
                // the game's onPointerUp (it runs after this capture listener) takes its miss branch → no reward pill
                if (!ok && Number.isFinite(m)) eosFixesMarkMiss(id)
                const onCtl = e.type === "pointerup" && ctlOf(e.target)
                if (!onCtl) {
                    // slid off (mouse) or cancelled (touch): the button never hears its onPointerUp → keep
                    // charging forever. Re-dispatch on the CURRENT control (U remounts every render).
                    const x = e.clientX,
                        y = e.clientY,
                        pointerId = e.pointerId,
                        pointerType = e.pointerType || h.pointerType || "mouse"
                    later(() => {
                        const c = ctl()
                        if (!c) return
                        try {
                            const ev = new PointerEvent("pointerup", { bubbles: true, cancelable: true, composed: true, pointerId, pointerType, clientX: x, clientY: y, isPrimary: true })
                            synthetic.add(ev)
                            c.dispatchEvent(ev)
                        } catch {}
                    }, 0)
                }
                if (!ok) {
                    const p0 = progress()
                    const at = { x: e.clientX || h.x, y: e.clientY || h.y }
                    later(() => {
                        const p1 = progress()
                        // a hold that DID complete moves the engine past the creep → say nothing
                        if (p0 != null && p1 != null && p1 - p0 > 13) return
                        say(EOS_FIXES_ALMOST[id], at.x, at.y)
                    }, 260)
                }
            }
            // ---- 36 CLOUD PASS: > 120 px in ≤ 450 ms is too fast
            if (id === 36 && S.drag) {
                const d = S.drag
                S.drag = null
                const L = layerRef.current
                const k = L ? eosStageScale(L) : 1
                const dx = (e.clientX - d.x) / (k || 1)
                const dt = Date.now() - d.t
                if (dx > 110 && dt <= 450) say(EOS_FIXES_ALMOST[36], e.clientX, e.clientY)
            }
            // ---- 21 BIN: dropped over the mouth but not binned → bin it (the game's own double-click path)
            if (id === 21 && (mo || within(e.target))) binWake(1600) // drop / snap / 0.58 s flight (+ BIN IT ALL stagger), then idle
            if (id === 21 && S.bin && (e.pointerId === S.bin.pointerId || e.pointerId == null)) {
                binWake(1600)
                const b = S.bin.el
                S.bin = null
                const a = arena()
                const mouth = a && a.querySelector(".binMouthTarget")
                if (mouth && b) {
                    const m = mouth.getBoundingClientRect()
                    const k = eosStageScale(mouth) || 1
                    const M = EOS_FIXES_BIN_MARGIN
                    const inMouth = e.clientX >= m.left - M.l * k && e.clientX <= m.right + M.r * k && e.clientY >= m.top - M.t * k && e.clientY <= m.bottom + M.b * k
                    if (inMouth)
                        later(() => {
                            if (!b.isConnected || b.disabled || b.classList.contains("binned")) return
                            try {
                                const ev = new MouseEvent("dblclick", { bubbles: true, cancelable: true, composed: true, detail: 2 })
                                synthetic.add(ev)
                                b.dispatchEvent(ev)
                            } catch {}
                        }, 180)
                }
            }
        }
        const onClick = (e) => {
            if (id === 21 && within(e.target)) binWake(1600) // BIN IT ALL / double-click
            if (synthetic.has(e) || !within(e.target) || !ctlOf(e.target)) return
            const now = Date.now()
            const x = e.clientX,
                y = e.clientY
            const a = arena()
            if (id === 64) {
                const lamp = a && a.querySelector(".trafficLamp")
                if (lamp && !lamp.classList.contains("p0")) {
                    eosFixesMarkMiss(id)
                    say(EOS_FIXES_ALMOST[64], x, y)
                }
            } else if (id === 69) {
                const early = now - S.lastTap <= 650
                S.lastTap = now
                if (early) {
                    eosFixesMarkMiss(id)
                    say(EOS_FIXES_ALMOST[69], x, y)
                    // a ring flash on the next pulse a tap would count on
                    const tgt = a && a.querySelector(".pulseTarget")
                    later(() => {
                        const c = centre(tgt)
                        const p = c && local(c.x, c.y)
                        if (p) setRing({ key: now, x: p.x, y: p.y })
                        later(() => setRing((r) => (r && r.key === now ? null : r)), 900)
                    }, 700)
                }
            } else if (id === 70) {
                const b = a && a.querySelector(".metronomeRig b")
                const n = EOS_FIXES_NUM(b && b.textContent, /(\d+)/)
                if (Number.isFinite(n) && n % 2 === 1) {
                    eosFixesMarkMiss(id)
                    say(EOS_FIXES_ALMOST[70], x, y)
                }
            } else if (EOS_FIXES_ROUND_MS[id]) {
                eosFixesMarkMiss(id) // every press of DON'T PRESS / DO NOT TAP restarts the round
                S.restarts = now - S.lastRestart < EOS_FIXES_ROUND_MS[id] + 600 ? S.restarts + 1 : 1
                S.lastRestart = now
                if (S.restarts >= 2) {
                    S.restarts = 0
                    say(EOS_FIXES_ALMOST[id], x, y)
                }
            }
        }
        // 21 BIN: mirror framer-motion's inline transform (cancelled by the arcade's transform:none!important).
        // Only while it matters: from a press in the arena until the drop / "gone" flight settles, and only for the
        // bubble in hand + binned bubbles (the idle y-bob stays hidden, as in the base game). I3-E7 aims the flight
        // from the home slot, so the binned word lands in the mouth.
        let mo = null
        let binIdle = null
        const engaged = new WeakSet()
        const binSync = (el) => {
            if (!el || !el.style) return
            const tf = el.style.transform || "none"
            if (el.style.getPropertyValue("--eos-bin-t") !== tf) el.style.setProperty("--eos-bin-t", tf)
        }
        const binWanted = (el) => !!(el && el.classList && el.classList.contains("binWordBubble") && (engaged.has(el) || el.classList.contains("binned")))
        const binSyncAll = () => {
            const h = host()
            if (h) h.querySelectorAll(".binWordBubble").forEach((el) => binWanted(el) && binSync(el))
        }
        const binWake = (settleMs) => {
            if (id !== 21 || typeof MutationObserver === "undefined") return
            if (binIdle) {
                clearTimeout(binIdle)
                timers.delete(binIdle)
                binIdle = null
            }
            if (!mo) {
                const h = host()
                if (!h) return
                mo = new MutationObserver((list) => {
                    for (const r of list) if (binWanted(r.target)) binSync(r.target)
                })
                try {
                    mo.observe(h, { subtree: true, attributes: true, attributeFilter: ["style", "class"] })
                } catch {
                    mo = null
                    return
                }
            }
            binSyncAll()
            if (settleMs)
                binIdle = later(() => {
                    binIdle = null
                    binSyncAll()
                    if (mo) mo.disconnect()
                    mo = null
                }, settleMs)
        }
        window.addEventListener("pointerdown", onDown, true)
        window.addEventListener("pointerup", onUp, true)
        window.addEventListener("pointercancel", onUp, true)
        window.addEventListener("click", onClick, true)
        if (id === 21) window.addEventListener("dblclick", onClick, true)
        return () => {
            alive = false
            timers.forEach((t) => clearTimeout(t))
            timers.clear()
            if (mo) mo.disconnect()
            window.removeEventListener("pointerdown", onDown, true)
            window.removeEventListener("pointerup", onUp, true)
            window.removeEventListener("pointercancel", onUp, true)
            window.removeEventListener("click", onClick, true)
            window.removeEventListener("dblclick", onClick, true)
        }
    }, [id, active, hostRef])

    if (!active) return null
    return (
        <div ref={layerRef} className="eosGuardLayer" aria-live="polite" data-eos-guard={id}>
            {ring ? <i key={`r${ring.key}`} className={`eosGuardRing${calm ? " isCalm" : ""}`} style={{ left: ring.x, top: ring.y }} aria-hidden="true" /> : null}
            {line ? (
                <div key={line.key} className={`eosGuardLine${line.out ? " isOut" : ""}${calm ? " isCalm" : ""}`} style={{ left: line.x, top: line.y }}>
                    {line.text}
                </div>
            ) : null}
        </div>
    )
}

// ---------------------------------------------------------------- CSS (§11.3, §11.4, §11.6, §0.5 sweep fixes, guards)
const EOS_FIXES_CSS = `
/* §11.3 the live element of every hidden-order game: gold ring + pulse; the rest dim */
${EOS_A} .arena :is(${EOS_FIXES_LIVE}){box-shadow:0 0 0 3px var(--eos-gold-1),0 0 22px rgba(255,190,80,.75)!important;animation:eosFixesLivePulse 1.2s ease-in-out infinite!important;opacity:1!important;filter:none!important}
${EOS_A} .arena :is(${EOS_FIXES_DIM}){opacity:.72!important;filter:saturate(.75)!important}
@keyframes eosFixesLivePulse{0%,100%{scale:1}50%{scale:1.08}}
/* §11.4 tool-first games: the un-armed tool dock pulses gold until it is in hand */
${EOS_A} .arena ${EOS_FIXES_TOOL_IDLE}{animation:eosFixesArmPulse 1.4s ease-in-out infinite!important;box-shadow:0 0 0 3px var(--eos-gold-1),0 0 26px rgba(255,200,90,.7)!important}
@keyframes eosFixesArmPulse{0%,100%{scale:1;filter:brightness(1)}50%{scale:1.06;filter:brightness(1.25)}}
@media (prefers-reduced-motion:reduce){
${EOS_A} .arena :is(${EOS_FIXES_LIVE}){animation:none!important}
${EOS_A} .arena ${EOS_FIXES_TOOL_IDLE}{animation:none!important}
}
${EOS_FIXES_CALM} .arena :is(${EOS_FIXES_LIVE}){animation:none!important}
${EOS_FIXES_CALM} .arena ${EOS_FIXES_TOOL_IDLE}{animation:none!important}
/* phone: the un-armed dock sat under the LIVE GUIDE panel (the arena's bottom ~132 px) → lift it into the free band
   above the guide until the tool is in hand (then it returns to its own spot and the words are free again).
   3 / 4 / 16 have room for the caption above it; 9 / 43 keep their caption and the dock moves where no word sits. */
@media (max-width:560px){
${EOS_A} .arena > ${EOS_FIXES_TOOL_IDLE}{top:auto!important;bottom:150px!important;z-index:160!important}
${EOS_A} .arena:is(.literalCrackArena,.literalStompArena,.literalMeltArena):has(> ${EOS_FIXES_TOOL_IDLE}) > .literalStatus{top:auto!important;bottom:256px!important}
${EOS_A} .arena.laserSliceArena > ${EOS_FIXES_TOOL_IDLE}{left:14px!important;right:auto!important;translate:50% 0!important}
${EOS_A} .arena.cutLoopLiteralArena > ${EOS_FIXES_TOOL_IDLE}{bottom:144px!important}
}

/* §11.6 occlusion / collapse */
${EOS_A} .arena .orbitArc{pointer-events:none!important}
${EOS_A} .arena:is(:has(.weakSpot),:has(.spotLamp),:has(.knot),:has(.plug)) .uniqWord{pointer-events:none!important}
${EOS_A} .arena .stickerWord{min-width:140px!important;min-height:64px!important;display:grid!important;place-items:center!important}
/* 107 GO WEIRD: the prop dock must fit inside the clipped game box (measured at 1280×860 and 390×844) */
${EOS_A} .arena.u107 .gwGame{gap:7px!important;padding-top:10px!important;padding-bottom:8px!important}
${EOS_A} .arena.u107 .gwGrid{gap:10px!important}
${EOS_A} .arena.u107 .gwDock{margin-top:0!important}
${EOS_A} .arena.u107 .gwProp{height:50px!important}
${EOS_A} .arena.u107 .gwGame{overflow:clip!important;overflow-clip-margin:72px!important}
/* measured: the 189 px cards pushed the dock under the LIVE GUIDE (1280) and out of the box (390) → compact cards */
/* the label pill (bottom 10, 42-46 px) must sit BELOW the character, never over its face (Creative Standard 4) */
${EOS_A} .arena.u107 :is(.gwGame,.gwGrid){--gw-card-h:156px!important}
${EOS_A} .arena.u107 .gwCard:is(.weirdWordBubble)>:is(.weirdBubblePhoto,img,.tsAutoEmotionPic,.uniqWordMaterialImage){top:14px!important;width:80px!important;height:80px!important;min-width:80px!important;min-height:80px!important;max-width:80px!important;max-height:80px!important}
${EOS_A} .arena.u107 .gwCard.weirdWordBubble::before{top:10px!important;width:88px!important;height:88px!important}
@media (max-width:560px){
${EOS_A} .arena.u107 .gwGame{width:100%!important;max-width:100%!important;margin:0!important;padding:10px 8px 8px!important;gap:8px!important}
${EOS_A} .arena.u107 :is(.gwGame,.gwGrid){--gw-card-h:136px!important}
${EOS_A} .arena.u107 .gwGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
${EOS_A} .arena.u107 .gwCard:is(.weirdWordBubble)>:is(.weirdBubblePhoto,img,.tsAutoEmotionPic,.uniqWordMaterialImage){top:12px!important;width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important;max-width:56px!important;max-height:56px!important}
${EOS_A} .arena.u107 .gwCard.weirdWordBubble::before{top:9px!important;width:62px!important;height:62px!important}
/* two-line user words below the orb, never clipped */
${EOS_A} .arena.u107 .gwCard>.gwThought{max-height:none!important;overflow:visible!important;bottom:7px!important;width:94%!important;max-width:94%!important;padding:4px 5px!important}
/* 5 props as 3 + 2 (labels stay readable at the 12 px phone floor) */
${EOS_A} .arena.u107 .gwDock{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:6px!important}
${EOS_A} .arena.u107 .gwDock>.gwProp{grid-column:span 2!important}
${EOS_A} .arena.u107 .gwDock>.gwProp:nth-child(4){grid-column:2/4!important}
${EOS_A} .arena.u107 .gwDock>.gwProp:nth-child(5){grid-column:4/6!important}
/* icon above the word: the label gets the full width, so MOUSTACHE stays one unbroken word */
${EOS_A} .arena.u107 .gwProp{height:46px!important;padding:3px 3px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important}
${EOS_A} .arena.u107 .gwProp>b{width:18px!important;height:16px!important;flex:0 0 16px!important;font-size:13px!important;background:none!important}
${EOS_A} .arena.u107 .gwProp>em{display:none!important}
${EOS_A} .arena.u107 .gwProp>span{max-width:100%!important;font-size:12px!important;line-height:1.1!important;letter-spacing:0!important;text-overflow:clip!important;white-space:nowrap!important;overflow-wrap:normal!important;word-break:keep-all!important}
}
/* 11 PRESSURE POP: the release window (55-92, I3-E3) drawn ON the needle's track — striped, not colour alone;
   it brightens while the needle is inside it. Angles follow the needle: rotate(var(--p)*2.2deg - 110deg). */
${EOS_A} .arena .pressureCapsule::before{content:""!important;position:absolute!important;inset:3px!important;border-radius:82px!important;padding:13px!important;box-sizing:border-box!important;pointer-events:none!important;z-index:0!important;
background:repeating-conic-gradient(from 11deg,rgba(255,255,255,.62) 0deg 2.6deg,rgba(61,255,168,.92) 2.6deg 7deg)!important;
-webkit-mask:conic-gradient(from 0deg,transparent 0deg 11deg,#000 11deg 92.4deg,transparent 92.4deg),linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
-webkit-mask-composite:source-in,xor!important;
mask:conic-gradient(from 0deg,transparent 0deg 11deg,#000 11deg 92.4deg,transparent 92.4deg),linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
mask-composite:intersect,exclude!important;
opacity:clamp(.5,min(calc((var(--p,0) - 54.5) * 100),calc((92.5 - var(--p,0)) * 100)),1)!important;
filter:drop-shadow(0 0 6px rgba(61,255,168,.65))!important}

/* §0.5 foundation sweep fixes */
/* 14 CRUMPLE: the clip-path clipped the corner buttons (they sit 12 px outside the paper) → a skew crumple */
${EOS_A} .arena .paperCrumple:is(.s1,.s2){clip-path:none!important}
${EOS_A} .arena .paperCrumple.s1{transform:skewX(-4deg) rotate(-1.5deg)!important;border-radius:22px 6px 26px 8px!important}
${EOS_A} .arena .paperCrumple.s2{transform:skewX(5deg) rotate(2deg) scale(.93)!important;border-radius:34px 12px 38px 16px!important}
/* 21 BIN: transform:none!important froze the drag → show framer-motion's transform (mirrored by EosLegacyGuards) */
${EOS_A} .freeAngleBinArena .binBubbleSlot .binWordBubble{transform:var(--eos-bin-t,none)!important}
/* 51 MIRROR FLIP: the (decorative) stage overlapped the ABOVE button */
${EOS_A} .arena .mirrorStage{pointer-events:none!important}
/* 77 SLOW MOTION: the brake parked below its clipped film gate became unhittable */
${EOS_A} .arena.u77 .filmGate{overflow:visible!important}
@media (max-width:560px){
/* 45 MAGNETS: a pulled orb (translateX ≤ 220) must stay on a phone screen */
${EOS_A} .arena.u45 .attentionOrb{right:auto!important;left:8%!important}
/* 71 DEFUSE: three stacked zones overflowed the device (STEP 3 clipped) → compact rows: label + button | visual */
${EOS_A} .arena.literalDefuseArena .defuseV2Zones{gap:8px!important}
${EOS_A} .arena.literalDefuseArena .defuseZone{min-height:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) 76px!important;grid-template-rows:auto auto auto!important;column-gap:10px!important;row-gap:3px!important;align-items:center!important;text-align:left!important;padding:8px 12px!important}
${EOS_A} .arena.literalDefuseArena .defuseZone>small{grid-column:1!important;grid-row:1!important}
${EOS_A} .arena.literalDefuseArena .defuseZone>strong{grid-column:1!important;grid-row:2!important}
${EOS_A} .arena.literalDefuseArena .defuseZone>div{grid-column:2!important;grid-row:1/4!important;justify-self:center!important;max-width:76px!important}
${EOS_A} .arena.literalDefuseArena .defuseZone>button{grid-column:1!important;grid-row:3!important;margin-top:2px!important;min-height:36px!important}
/* 103 SINKING PLATFORM: one 1284 px column pushed LOWER IT below the screen → a compact 3 × 2 machine */
${EOS_A} .arena.u103{padding-top:8px!important}
${EOS_A} .arena.u103 .spMachine{margin:0 auto!important;padding:10px 10px 12px!important;width:min(900px,96%)!important}
${EOS_A} .arena.u103 .spTop{margin-bottom:6px!important;overflow:visible!important}
/* the engine's dark .literalProgress column sat right over the ACTIVE bay → a small pill in the top corner */
${EOS_A} .arena.u103>.literalProgress{top:8px!important;right:12px!important;left:auto!important;bottom:auto!important;width:auto!important;height:auto!important;min-height:0!important;max-height:28px!important}
/* queue words were cut through the middle (6 × 47 px chips) → 3 per row, whole words */
${EOS_A} .arena.u103 .spQueue{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;height:auto!important;max-height:none!important;overflow:visible!important}
${EOS_A} .arena.u103 .spQueueItem{height:auto!important;min-height:24px!important;max-height:none!important;overflow:visible!important;min-width:0!important}
${EOS_A} .arena.u103 .spQueueItem>.tsExactUserText{white-space:normal!important;overflow:visible!important;overflow-wrap:normal!important;word-break:keep-all!important}
${EOS_A} .arena.u103 .spGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}
${EOS_A} .arena.u103 .spBay{min-height:0!important;padding:6px 5px 6px!important;border-radius:16px!important}
${EOS_A} .arena.u103 .spOrb{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important}
${EOS_A} .arena.u103 .spThought{min-height:30px!important;max-height:none!important;overflow:visible!important;margin-top:5px!important;padding:3px 5px!important}
${EOS_A} .arena.u103 .spPlatform{width:86%!important;margin-top:5px!important}
${EOS_A} .arena.u103 .spStatus{margin-top:5px!important}
${EOS_A} .arena.u103 .spControls{margin-top:6px!important}
}

/* §11.7 "almost!" lines (EosLegacyGuards) */
${EOS_A} .eosGuardLayer{position:absolute;inset:0;pointer-events:none;z-index:58;overflow:hidden}
${EOS_A} .eosGuardLine{position:absolute;transform:translate(-50%,-100%);padding:9px 18px 8px;border-radius:999px;white-space:nowrap;
background:linear-gradient(180deg,rgba(40,30,96,.95),rgba(14,12,46,.95));border:1.5px solid rgba(255,229,138,.9);
box-shadow:0 0 0 4px rgba(255,190,80,.14),0 12px 28px rgba(0,0,0,.45),0 0 26px rgba(255,200,90,.38);
color:#FFF4D6;font:800 16px/1.15 var(--eos-font);letter-spacing:.01em;text-shadow:0 1px 3px rgba(0,0,0,.6);
animation:eosFixesAlmostIn .9s cubic-bezier(.2,.9,.25,1.15) both;transition:opacity .55s ease,translate .55s ease}
${EOS_A} .eosGuardLine.isOut{opacity:0;translate:0 -10px}
${EOS_A} .eosGuardLine.isCalm{animation:eosFixesAlmostFade .9s ease both}
${EOS_A} .eosGuardRing{position:absolute;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;border:4px solid var(--eos-gold-1);
box-shadow:0 0 24px rgba(255,200,90,.7),inset 0 0 18px rgba(255,200,90,.45);animation:eosFixesRing .9s ease-out both}
${EOS_A} .eosGuardRing.isCalm{animation:eosFixesAlmostFade .9s ease both}
@keyframes eosFixesAlmostIn{0%{opacity:0;scale:.82}55%{opacity:1;scale:1.05}100%{opacity:1;scale:1}}
@keyframes eosFixesAlmostFade{0%{opacity:0}100%{opacity:1}}
@keyframes eosFixesRing{0%{opacity:0;scale:.6}35%{opacity:1;scale:1}100%{opacity:0;scale:1.35}}
@media (max-width:560px){${EOS_A} .eosGuardLine{font-size:15px;padding:8px 14px 7px}}
@media (prefers-reduced-motion:reduce){${EOS_A} :is(.eosGuardLine,.eosGuardRing){animation:eosFixesAlmostFade .9s ease both!important;transition:opacity .55s ease!important}}
`
eosCss("fixes", EOS_FIXES_CSS)

eosExpose("fixes", { EOS_HINT_FIX, EOS_FIXES_ALMOST, EOS_LIVE_SELECTORS, eosGateProgress, EosEntries, drumLog: EOS_FIXES_DRUM_LOG })
