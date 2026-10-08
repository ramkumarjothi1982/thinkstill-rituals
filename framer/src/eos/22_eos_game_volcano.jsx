// ===================================================================================
// EOS · 22 · GAME 112 COOL THE VOLCANO — the anger hero (docs/EOS_SPEC.md §8.0, §8.2, §0.4 pacer, §6.5)
// Act A ERUPT  (0 → 30):  6 crater taps. Each tap launches word-rocks that arc up and shatter. The JUICE scales
//                         with EOS_STORE.before (≤6 → 1 rock, 7-8 → 2 bigger + deeper boom, 9-10 → 3 biggest +
//                         climbing pitch); the LENGTH never does. Shake only on alternate taps < 300 ms apart.
// Act B COOL   (30 → 95): the active ingredient. A rain cloud; drag it slowly ↔ over the lava, or press and hold
//                         (single pointer), or arrow keys + Space. The game OWNS the shared breath pacer
//                         (eosBreathOwn in 4 s / out 6 s): the cloud gathers on "in", pours on "out"; moving slowly
//                         during "out" cools ×2; pointer speed > 350 CSS px/s (÷ eosStageScale) → mist + "slower… 🐢"
//                         at half rate (never zero). A deadline floor guarantees heat 0 by ~41 s.
// Act C BLOOM  (95 → 100): 2 s auto — cracks glow, 8 flowers spring up, RUSH belly-laughs (E44), onDone once.
// Rules kept: no imports/exports; Eos/EOS_/eos names (EosVolcano / EOS_VOLCANO / eosVolcano); no lookbehind;
// pre-mounted pools (attribute / style restarts only, no per-rock mount churn); one rAF; every timer cleaned;
// reduced motion + eosCalm: no shake, no travel (rocks fade), rain is an opacity pulse.
// Dev/test handle (dev builds only, via eosExpose): eosApi("volcano").state() → live counters.
// ===================================================================================

const EOS_GAME_112 = {
    id: 112,
    name: "COOL THE VOLCANO",
    family: "Destroy",
    engine: "E04",
    prompt: "What's boiling over?",
    object: "Your words are lava rocks inside RUSH's volcano",
    action: "Tap the crater to erupt, then hold or drag the rain cloud slowly over the lava to cool it",
    mechanism: "Short discharge, then slow breath-paced cool-down",
    hook: "Let it blow. Then let it cool.",
    surprise: "The cooled lava cracks open into a garden and RUSH belly-laughs.",
    mindBend: "Fire needs a minute. Cooling is the strong move.",
    score: "Heat cooled to zero",
    replay: "A fresh eruption",
    sound: "Booms, then rain and a calm chime",
    notes: "EOS anger hero · erupt ≤ 8 s, cool ~20 s · ≤ 45 s",
}

const EOS_VOLCANO = {
    taps: 6, //            act A length (never scaled by intensity)
    pool: 12, //           pre-mounted word rocks (3 per tap × 4 taps in flight)
    puffs: 6, //           pre-mounted steam puffs
    rate: 6, //            heat %/s at the slow rate (hold, or a slow drag during "in"); ×2 slow drag on "out"
    maxSpeed: 350, //      CSS px/s (÷ eosStageScale) — faster = mist at half rate
    keySpeed: 170, //      keyboard glide px/s (always "slow")
    deadline: 41, //       s since mount: the floor rate reaches heat 0 by then (finish ≤ ~44 s)
    inMs: EOS_BREATH.coreIn * 1000, // 4000
    outMs: EOS_BREATH.coreOut * 1000, // 6000
    bridgeMs: 1300, //     "Now watch it cool…" before the cloud arrives
    bloomMs: 2000,
    doneMs: 450,
    fastTapMs: 300,
    comboMs: 700,
    burstGapMs: 250, //    PremiumBurst remounts ≤ 4 Hz (DOM-churn rule)
    progressGapMs: 250, // onProgress ≤ 4 Hz in act B
    faces: { loud: 29, simmer: [52, 58, 52], soft: [34, 20, 70], laugh: 44 },
}
// Hot skies (variationSeed % 3) — the anger "loud" grade, smoky.
const EOS_VOLCANO_HOT = [
    "linear-gradient(180deg,#2a0b1f 0%,#6e1430 38%,#c4243a 72%,#ff7a1a 100%)",
    "linear-gradient(180deg,#1d0b2e 0%,#561846 40%,#b8263f 74%,#ff6a2a 100%)",
    "linear-gradient(180deg,#14061a 0%,#480e22 40%,#a91f2e 74%,#ff8a3a 100%)",
]
// Calm skies by local time (eosDayPart) — the anger "calm" grade (teal #2ec4b6 / #4fd1e8) lit for the hour.
const EOS_VOLCANO_COOL = {
    dawn: "linear-gradient(180deg,#2aa9b8 0%,#4fd1e8 42%,#a8ecdf 74%,#ffd9b8 100%)",
    day: "linear-gradient(180deg,#2f9fe0 0%,#4fd1e8 46%,#9ff0e2 82%,#d9fff4 100%)",
    dusk: "linear-gradient(180deg,#1d4f7a 0%,#237f96 38%,#2ec4b6 70%,#ffb38a 100%)",
    night: "linear-gradient(180deg,#071a2c 0%,#0f3b52 44%,#176e78 78%,#2ec4b6 100%)",
}
// Flowers on the cooled rock (mountain-box fractions u, v; hue; size px at desktop).
const EOS_VOLCANO_FLOWERS = [
    { u: 0.4, v: 0.36, hue: 330, s: 38 },
    { u: 0.6, v: 0.34, hue: 45, s: 34 },
    { u: 0.3, v: 0.6, hue: 190, s: 42 },
    { u: 0.69, v: 0.58, hue: 12, s: 40 },
    { u: 0.48, v: 0.52, hue: 280, s: 36 },
    { u: 0.56, v: 0.74, hue: 50, s: 44 },
    { u: 0.22, v: 0.84, hue: 345, s: 40 },
    { u: 0.79, v: 0.82, hue: 170, s: 42 },
]

// ---- geometry: the cone silhouette in mountain-box fractions (0..1 → 0..1 from the box top)
function eosVolcanoSurf(u, shoulder = 0) {
    const d = Math.abs(u - 0.5)
    if (d <= 0.07) return 0.115
    const t = Math.min(1, (d - 0.07) / 0.43)
    const side = u < 0.5 ? -1 : 1
    return 0.115 + 0.885 * (1 - Math.pow(1 - t, 1.7)) - (side === shoulder ? 0.035 * Math.sin(Math.PI * t) : 0)
}
// Half-width (fraction of the box) of the cone at depth v.
function eosVolcanoHalf(v) {
    if (v <= 0.115) return 0.07
    const t = 1 - Math.pow(Math.max(0, 1 - (v - 0.115) / 0.885), 1 / 1.7)
    return 0.07 + 0.43 * t
}
// SVG paths in a 1000 × 620 viewBox (the mountain box keeps that aspect exactly).
function eosVolcanoPaths(variant) {
    const shoulder = variant === 1 ? -1 : variant === 2 ? 1 : 0
    const pts = []
    for (let i = 0; i <= 50; i++) {
        const u = i / 50
        pts.push(`${(u * 1000).toFixed(1)},${(eosVolcanoSurf(u, shoulder) * 620).toFixed(1)}`)
    }
    const ridge = "M" + pts.join(" L")
    const body = `M0,620 L${pts.join(" L")} L1000,620 Z`
    // lava rivers down the front face, inside the silhouette, spreading from the lip
    const spec = [
        [-1, 0.62, 0.0],
        [1, 0.58, 1.3],
        [-1, 0.2, 2.1],
        [1, 0.27, 3.4],
    ]
    if (variant === 2) spec.reverse()
    const rivers = spec.map(([side, f, ph], i) => {
        const seg = []
        const n = 18
        for (let k = 0; k <= n; k++) {
            const a = k / n
            const v = 0.118 + a * 0.84
            const half = eosVolcanoHalf(v)
            const u = 0.5 + side * (half * f * Math.pow(a, 0.75) + 0.02 * Math.sin(a * 8 + ph + variant)) * (k === 0 ? 0.3 : 1)
            seg.push(`${(u * 1000).toFixed(1)},${(v * 620).toFixed(1)}`)
        }
        return "M" + seg.join(" L")
    })
    return { ridge, body, rivers, shoulder }
}
// Layout in arena CSS px (unscaled). Everything interactive / wordy stays inside [U0, U1].
function eosVolcanoLayout(W, H, sT, sB, variant) {
    const phone = W <= 560
    const U0 = sT
    const U1 = Math.max(U0 + 220, H - sB)
    const uh = U1 - U0
    const mw = Math.min(W * (phone ? 1.12 : 0.94), 820, uh * 1.45)
    const mh = mw * 0.62
    const mBottom = U1 + mh * 0.12
    const my = mBottom - mh
    const mx = (W - mw) / 2
    const cx = W / 2
    const cy = my + mh * 0.115
    const cw = phone ? 150 : 210
    const ch = phone ? 92 : 122
    const cloudY = Math.max(U0 + 46 + ch / 2, U0 + (cy - U0) * 0.46)
    const span = Math.max(40, Math.min(mw * 0.36, W / 2 - cw / 2 - 10))
    const rushSize = phone ? 64 : 88
    const side = variant === 1 ? -1 : 1
    const rushX = eosClamp(cx + side * mw * (phone ? 0.27 : 0.3), rushSize / 2 + 6, W - rushSize / 2 - 6)
    const rushY = Math.min(U1 - rushSize / 2 - 6, cy + mh * 0.46)
    return {
        W, H, phone, U0, U1, uh, mw, mh, mx, my, cx, cy, cw, ch, cloudY,
        xMin: cx - span, xMax: cx + span,
        peakY: Math.max(U0 + 44, cy - uh * 0.52),
        rushSize, rushX, rushY,
        craterW: Math.max(phone ? 104 : 120, mw * 0.2),
        craterH: Math.max(76, mh * 0.18),
    }
}
function eosVolcanoNow() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()
}
// Rocks per tap from the check-in intensity (the juice scales, never the length).
function eosVolcanoRocksPerTap(before) {
    const b = Number(before)
    if (before == null || before === "" || !Number.isFinite(b)) return 2 // anger's default dial is 8
    return b >= 9 ? 3 : b >= 7 ? 2 : 1
}
function eosVolcanoIntensity() {
    const st = EOS_STORE.get()
    return st.before != null ? st.before : st.intensityGuess
}

// Dev/test handle: the live instance (dev builds only — eosExpose publishes window.__eos only in dev).
const EOS_VOLCANO_DEV = { cur: null }
eosExpose("volcano", {
    rocksPerTap: eosVolcanoRocksPerTap,
    state: () => {
        const s = EOS_VOLCANO_DEV.cur
        if (!s) return null
        return {
            act: s.act, taps: s.taps, rocks: s.rocks, rocksPerTap: s.rocksPerTap, shakes: s.shakes, heat: Math.round(s.heat * 10) / 10,
            mode: s.mode, phase: s.phase, speed: Math.round(s.speed), chimes: s.chimes, nonSoft: s.nonSoft, sfx: s.sfxLog.slice(-60),
            slowerShown: s.slowerShown, holding: s.holding, cloudX: Math.round(s.cloudX), owned: s.owned, done: s.doneCalled,
            msAtA: s.msAtA, msAtC: s.msAtC, rates: { slow: EOS_VOLCANO.rate, mist: EOS_VOLCANO.rate / 2 },
        }
    },
})

function EosVolcanoEngine({ game, entries, onProgress, onDone, sfx, rainSfx, reduced, imageSources, hasUserImages, variationSeed }) {
    useEosStore()
    const red = eosCalm(reduced)
    const V = EOS_VOLCANO
    const rootRef = React.useRef(null)
    const sceneRef = React.useRef(null)
    const craterRef = React.useRef(null)
    const glowRef = React.useRef(null)
    const cloudRef = React.useRef(null)
    const rainRef = React.useRef(null)
    const rushSqRef = React.useRef(null)
    const rockRefs = React.useRef([])
    const puffRefs = React.useRef([])
    const boomRefs = React.useRef([])
    const timers = React.useRef(new Set())
    const P = React.useRef({})
    P.current = { onProgress, onDone, sfx, rainSfx, red }
    const uid = String(React.useId ? React.useId() : "v").replace(/[^a-zA-Z0-9]/g, "")
    const entryKey = Array.isArray(entries) ? entries.join("|") : String(entries || "")
    const words = React.useMemo(() => {
        const w = eosWords(entries, 6)
        return w.length ? w : (EOS_EMO.anger.seeds || ["boiling over"]).slice(0, 3)
    }, [entryKey])
    const seed = Math.abs(Number(variationSeed) || 1)
    const variant = seed % 3
    const dayPart = React.useMemo(() => eosDayPart(), [])
    const paths = React.useMemo(() => eosVolcanoPaths(variant), [variant])
    const thumbs = hasUserImages && Array.isArray(imageSources) ? imageSources.filter(Boolean).slice(0, 6) : []
    const [L, setL] = React.useState(null)
    const [act, setAct] = React.useState("a") // a · ab (bridge) · b · c
    const [taps, setTaps] = React.useState(0)
    const [face, setFace] = React.useState(V.faces.loud)
    const [burst, setBurst] = React.useState(null) // {k, x, y, big}
    const S = React.useRef(null)
    if (!S.current)
        S.current = {
            mounted: true, t0: eosVolcanoNow(), act: "a", taps: 0, rocks: 0, rocksPerTap: 0, rockSlot: 0, lastTap: -1e9, fastRun: 0,
            combo: 0, shakes: 0, shakeAB: 0, pulseAB: 0, sqAB: 0, boomAB: 0, puffSlot: 0, lastPuffAt: 0, lastBurstAt: -1e9,
            heat: 100, hShown: 1, hAt: 0, lastP: -1, lastReportAt: 0, cloudX: 0, holding: false, dragging: false, drag: null,
            speed: 0, lastMoveAt: -1e9, keyDir: 0, keyLastDir: 1, keyGlideUntil: 0, keyHold: false, keyRainUntil: 0, lastEngagedAt: -1e9,
            phase: "in", phaseT0: 0, owned: false, mode: "off", chimes: 0, slowCool: 0, raf: 0, lastT: 0, doneCalled: false,
            nonSoft: 0, sfxLog: [], slowerShown: 0, lastSlowerTone: 0, lastKeyErupt: 0, msAtA: null, msAtC: null, L: null, scale: 1,
        }
    const later = (fn, ms) => {
        const id = setTimeout(() => {
            timers.current.delete(id)
            if (S.current.mounted) fn()
        }, ms)
        timers.current.add(id)
    }
    const fire = (kind) => {
        const s = S.current
        if (!s.mounted) return
        if (kind !== "soft") s.nonSoft++
        s.sfxLog.push({ kind, t: Math.round(eosVolcanoNow() - s.t0) })
        if (s.sfxLog.length > 80) s.sfxLog.shift()
        try {
            P.current.sfx?.(kind)
        } catch {}
    }
    const report = (v, label) => {
        const s = S.current
        if (!s.mounted || s.doneCalled) return
        const n = Math.round(eosClamp(v, 0, 100))
        if (n <= s.lastP) return
        s.lastP = n
        try {
            P.current.onProgress?.(n, label)
        } catch {}
    }
    const setAttr = (el, k, v) => {
        if (el && el.getAttribute(k) !== String(v)) el.setAttribute(k, String(v))
    }
    const toggleAB = (el, attr, key) => {
        if (!el) return
        const s = S.current
        s[key] = s[key] ? 0 : 1
        el.setAttribute(attr, s[key] ? "a" : "b")
    }

    // ---------------------------------------------------------------- mount / unmount
    React.useEffect(() => {
        const s = S.current
        s.mounted = true
        EOS_VOLCANO_DEV.cur = s
        report(0, "TAP THE CRATER")
        return () => {
            s.mounted = false
            if (s.raf) cancelAnimationFrame(s.raf)
            s.raf = 0
            timers.current.forEach((id) => clearTimeout(id))
            timers.current.clear()
            if (s.owned) eosBreathOwn(null)
            s.owned = false
            if (EOS_VOLCANO_DEV.cur === s) EOS_VOLCANO_DEV.cur = null
        }
    }, [])

    // ---------------------------------------------------------------- layout (ResizeObserver, unscaled px)
    React.useEffect(() => {
        const el = rootRef.current
        if (!el) return
        const measure = () => {
            const W = el.offsetWidth || 1
            const H = el.offsetHeight || 1
            const cs = typeof getComputedStyle === "function" ? getComputedStyle(el) : null
            const phone = W <= 560
            const sT = (cs && parseFloat(cs.getPropertyValue("--eos-safe-top"))) || (phone ? 104 : 48)
            const sB = (cs && parseFloat(cs.getPropertyValue("--eos-safe-bottom"))) || (phone ? 164 : 200)
            const next = eosVolcanoLayout(W, H, sT, sB, variant)
            const s = S.current
            s.L = next
            if (!s.cloudX) s.cloudX = next.xMin + (next.xMax - next.xMin) * 0.22
            s.cloudX = eosClamp(s.cloudX, next.xMin, next.xMax)
            setL((prev) => (prev && prev.W === next.W && prev.H === next.H && prev.U0 === next.U0 && prev.U1 === next.U1 ? prev : next))
        }
        measure()
        let ro = null
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(measure)
            ro.observe(el)
        } else if (typeof window !== "undefined") window.addEventListener("resize", measure)
        return () => {
            if (ro) ro.disconnect()
            else if (typeof window !== "undefined") window.removeEventListener("resize", measure)
        }
    }, [variant])
    // keep the cloud + rain where they belong after a re-layout / act change
    eosLayoutEffect(() => {
        applyCloud()
    })

    // ---------------------------------------------------------------- act A · erupt
    const erupt = () => {
        const s = S.current
        const G = s.L
        if (!s.mounted || s.act !== "a" || s.taps >= V.taps || !G) return
        const t = eosVolcanoNow()
        const dt = t - s.lastTap
        s.lastTap = t
        s.fastRun = dt < V.fastTapMs ? s.fastRun + 1 : 0
        s.combo = dt < V.comboMs ? s.combo + 1 : 1
        s.taps += 1
        if (s.taps === 1) s.firstTapAt = t
        const k = eosVolcanoRocksPerTap(eosVolcanoIntensity())
        s.rocksPerTap = k
        const calm = P.current.red
        // rocks: arc up from the crater, hang (readable), shatter
        const tier = k === 3 ? 1.28 : k === 2 ? 1.14 : 1
        const spread = Math.min(G.W * 0.34, 360)
        const base = s.taps % 2 ? -1 : 1
        for (let j = 0; j < k; j++) {
            const slot = s.rockSlot % V.pool
            s.rockSlot += 1
            s.rocks += 1
            const el = rockRefs.current[slot]
            if (!el) continue
            const fan = k === 1 ? base * (0.45 + eosNoise(s.taps, 3) * 0.45) : (j / (k - 1) - 0.5) * 2 * (0.8 + eosNoise(s.taps + j, 5) * 0.2)
            const tx = eosClamp(G.cx + fan * spread, 96, G.W - 96)
            const ty = eosClamp(G.peakY + eosNoise(s.taps * 3 + j, 9) * G.uh * 0.16 + (k === 3 && j === 1 ? -14 : 0), G.U0 + 40, G.cy - 70)
            el.style.setProperty("--rx", `${Math.round(tx - G.cx)}px`)
            el.style.setProperty("--ry", `${Math.round(ty - G.cy)}px`)
            el.style.setProperty("--rot", `${Math.round((eosNoise(s.rocks, 11) - 0.5) * 36)}deg`)
            el.style.setProperty("--s", String(tier))
            el.setAttribute("data-fly", el.getAttribute("data-fly") === "a" ? "b" : "a")
        }
        // shake: only on alternate taps that come < 300 ms apart; never in reduced / calm
        if (!calm && s.fastRun > 0 && s.fastRun % 2 === 1) {
            s.shakes += 1
            toggleAB(sceneRef.current, "data-shake", "shakeAB")
        }
        toggleAB(glowRef.current, "data-pulse", "pulseAB")
        toggleAB(rushSqRef.current, "data-sq", "sqAB")
        const boom = boomRefs.current[Math.min(V.taps, s.combo) - 1]
        if (boom) toggleAB(boom, "data-pop", "boomAB")
        // one scored step per eruption + haptic + boom (deeper with intensity; 9-10 climbs per tap)
        fire("clack")
        eosHaptic("hit")
        const f0 = k === 3 ? 66 * Math.pow(2, (s.taps * 2) / 12) : k === 2 ? 74 : 98
        eosTone(f0, k === 1 ? 260 : 380, { type: "triangle", gain: k === 1 ? 0.07 : 0.1, glide: f0 * 0.5 })
        eosTone(f0 * 2, 160, { type: "sine", gain: 0.035, glide: f0 })
        if (k === 3) eosTone(eosNote(s.taps + 4, 392), 140, { type: "triangle", gain: 0.03, at: 0.05 })
        if (t - s.lastBurstAt >= V.burstGapMs) {
            s.lastBurstAt = t
            setBurst({ k: s.taps, x: (G.cx / G.W) * 100, y: (G.cy / G.H) * 100, big: k >= 2 })
        }
        setTaps(s.taps)
        report(s.taps * 5, s.taps < V.taps ? "TAP THE CRATER" : "COOL IT SLOWLY")
        if (s.taps >= V.taps) {
            s.msAtA = Math.round(t - s.t0)
            s.act = "ab"
            setAct("ab")
            later(startCool, V.bridgeMs)
        }
    }

    // ---------------------------------------------------------------- act B · cool (one rAF)
    const surfY = (x) => {
        const G = S.current.L
        if (!G) return 0
        return G.my + G.mh * eosVolcanoSurf((x - G.mx) / G.mw, paths.shoulder)
    }
    function applyCloud() {
        const s = S.current
        const G = s.L
        if (!G) return
        const x = eosClamp(s.cloudX, G.xMin, G.xMax)
        s.cloudX = x
        if (cloudRef.current) cloudRef.current.style.translate = `${Math.round(x - G.cw / 2)}px 0px`
        const r = rainRef.current
        if (r) {
            const top = G.cloudY + G.ch * 0.2
            r.style.translate = `${Math.round(x - G.cw * 0.4)}px 0px`
            r.style.height = `${Math.max(40, Math.round(surfY(x) - top + 28))}px`
        }
    }
    const moveCloud = (dx) => {
        const s = S.current
        if (!s.L || !dx) return
        s.cloudX = eosClamp(s.cloudX + dx, s.L.xMin, s.L.xMax)
        applyCloud()
    }
    const setPhase = (phase, t) => {
        const s = S.current
        s.phase = phase
        s.phaseT0 = t
        const ms = phase === "in" ? V.inMs : V.outMs
        eosBreathOwn(phase, ms)
        s.owned = true
        setAttr(cloudRef.current, "data-breath", phase)
        setAttr(rootRef.current, "data-breath", phase)
        if (s.mode !== "mist") setAttr(cloudRef.current, "data-cue", phase)
        const recent = t - s.lastEngagedAt < 2500 || s.holding || s.keyHold
        if (phase === "out") {
            if (recent) {
                try {
                    P.current.rainSfx?.(V.outMs / 1000 + 0.2)
                } catch {}
            }
        } else eosTone(262, 900, { type: "sine", gain: 0.02, glide: 330 })
    }
    const setMode = (mode, t) => {
        const s = S.current
        if (s.mode === mode) return
        s.mode = mode
        setAttr(rootRef.current, "data-rain", mode)
        setAttr(cloudRef.current, "data-cue", mode === "mist" ? "slow" : s.phase)
        if (mode === "mist") {
            s.slowerShown += 1
            if (t - s.lastSlowerTone > 1200) {
                s.lastSlowerTone = t
                eosTone(220, 260, { type: "sine", gain: 0.03, glide: 165 })
            }
        }
    }
    const spawnPuff = (x, burstN = 1) => {
        const s = S.current
        for (let i = 0; i < burstN; i++) {
            const el = puffRefs.current[s.puffSlot % V.puffs]
            s.puffSlot += 1
            if (!el) continue
            const px = x + (eosNoise(s.puffSlot, 13) - 0.5) * 56
            el.style.left = `${Math.round(px)}px`
            el.style.top = `${Math.round(surfY(px) - 10)}px`
            el.setAttribute("data-puff", el.getAttribute("data-puff") === "a" ? "b" : "a")
        }
    }
    const faceForChimes = (n) => (n >= 3 ? V.faces.soft[variant] : n >= 1 ? V.faces.simmer[variant] : V.faces.loud)
    const tick = () => {
        const s = S.current
        s.raf = 0
        if (!s.mounted || s.act !== "b") return
        const t = eosVolcanoNow()
        const dt = Math.min(0.4, Math.max(0, (t - s.lastT) / 1000))
        s.lastT = t
        if (t - s.phaseT0 >= (s.phase === "in" ? V.inMs : V.outMs)) setPhase(s.phase === "in" ? "out" : "in", t)
        // keyboard glide (always slow)
        if (s.keyDir || t < s.keyGlideUntil) {
            moveCloud((s.keyDir || s.keyLastDir) * V.keySpeed * dt)
            s.lastMoveAt = t
            s.speed = V.keySpeed
        }
        if (t - s.lastMoveAt > 150) s.speed *= Math.exp(-dt * 6)
        const moving = t - s.lastMoveAt < 400
        const engaged = s.holding || s.keyHold || t < s.keyRainUntil
        if (engaged) s.lastEngagedAt = t
        const mode = !engaged ? "drizzle" : s.speed > V.maxSpeed ? "mist" : "rain"
        setMode(mode, t)
        const rate = mode === "rain" ? V.rate * (moving && s.phase === "out" ? 2 : 1) : mode === "mist" ? V.rate / 2 : 0
        const floor = s.heat / Math.max(2, V.deadline - (t - s.t0) / 1000)
        const before = s.heat
        s.heat = Math.max(0, s.heat - Math.max(rate, floor) * dt)
        if (mode === "rain") s.slowCool += before - s.heat
        const h = s.heat / 100
        if (Math.abs(h - s.hShown) >= 0.006 && t - s.hAt >= 60) {
            s.hShown = h
            s.hAt = t
            rootRef.current?.style.setProperty("--h", h.toFixed(3))
        }
        // a scored chime at each 20 % of heat removed
        const step = Math.min(5, Math.floor((100 - s.heat + 1e-6) / 20))
        while (s.chimes < step) {
            s.chimes += 1
            fire("chime")
            eosHaptic("hit")
            eosTone(eosNote(s.chimes + 4, 392), 520, { type: "sine", gain: 0.05 })
            eosTone(eosNote(s.chimes + 9, 392), 420, { type: "sine", gain: 0.022, at: 0.06 })
            spawnPuff(s.cloudX, 3)
            toggleAB(rushSqRef.current, "data-sq", "sqAB")
            const nf = faceForChimes(s.chimes)
            if (s.chimes < 5) setFace(nf)
        }
        if (h > 0.04 && t - s.lastPuffAt > (mode === "rain" ? 420 : 820)) {
            s.lastPuffAt = t
            spawnPuff(s.cloudX, 1)
        }
        if (t - s.lastReportAt >= V.progressGapMs) {
            const n = Math.floor(30 + 65 * (1 - h))
            if (n > s.lastP && s.heat > 0) {
                s.lastReportAt = t
                report(Math.min(95, n), "COOL IT SLOWLY")
                setAttr(rootRef.current, "data-eos-volc-heat", Math.round(s.heat))
            }
        }
        if (s.heat <= 0) {
            bloom()
            return
        }
        s.raf = requestAnimationFrame(tick)
    }
    function startCool() {
        const s = S.current
        if (!s.mounted || s.act !== "ab") return
        const t = eosVolcanoNow()
        s.act = "b"
        setAct("b")
        s.lastT = t
        s.lastPuffAt = t
        setPhase("in", t)
        setMode("drizzle", t)
        applyCloud()
        try {
            if (typeof document !== "undefined" && document.activeElement === craterRef.current) later(() => cloudRef.current?.focus({ preventScroll: true }), 60)
        } catch {}
        if (!s.raf) s.raf = requestAnimationFrame(tick)
    }
    function bloom() {
        const s = S.current
        if (!s.mounted || s.act === "c") return
        const G = s.L
        s.act = "c"
        s.msAtC = Math.round(eosVolcanoNow() - s.t0)
        if (s.raf) cancelAnimationFrame(s.raf)
        s.raf = 0
        s.heat = 0
        s.holding = false
        s.keyDir = 0
        s.keyHold = false
        eosBreathOwn(null)
        s.owned = false
        rootRef.current?.style.setProperty("--h", "0")
        setAttr(rootRef.current, "data-rain", "off")
        setAttr(rootRef.current, "data-eos-volc-heat", 0)
        while (s.chimes < 5) {
            s.chimes += 1
            fire("chime")
        }
        setAct("c")
        setFace(V.faces.laugh)
        report(96, "WATCH IT BLOOM")
        fire("win")
        eosHaptic("finish")
        eosTone(eosNote(5, 392), 700, { type: "sine", gain: 0.05 })
        eosTone(eosNote(7, 392), 700, { type: "sine", gain: 0.04, at: 0.09 })
        eosTone(eosNote(9, 392), 900, { type: "sine", gain: 0.04, at: 0.18 })
        if (G) setBurst({ k: 99, x: (G.rushX / G.W) * 100, y: (G.rushY / G.H) * 100, big: true })
        later(() => report(100, "ENJOY THE CALM"), V.bloomMs)
        later(() => {
            if (s.doneCalled) return
            s.doneCalled = true
            const bonus = 260 + Math.round(100 * eosClamp(s.slowCool / 100, 0, 1))
            try {
                P.current.onDone?.(bonus)
            } catch {}
        }, V.bloomMs + V.doneMs)
    }

    // ---------------------------------------------------------------- input
    const touchAnswer = () => {
        fire("soft")
        eosTone(523, 90, { type: "triangle", gain: 0.03 })
        eosHaptic("touch")
        const c = cloudRef.current
        if (c) toggleAB(c, "data-sq", "cloudSq")
    }
    const onPointerDown = (e) => {
        const s = S.current
        if (e.pointerType === "mouse" && e.button !== 0) return
        if (s.act === "a") {
            erupt()
            return
        }
        if (s.act === "b") {
            const root = rootRef.current
            s.scale = eosStageScale(root) || 1
            s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: eosVolcanoNow() }
            s.holding = true
            s.dragging = true
            s.speed = 0
            s.lastEngagedAt = eosVolcanoNow()
            try {
                root.setPointerCapture(e.pointerId)
            } catch {}
            touchAnswer()
            return
        }
        if (s.act === "c") eosTone(eosNote(7 + (s.sqAB ? 2 : 0), 392), 160, { type: "sine", gain: 0.03 })
    }
    const onPointerMove = (e) => {
        const s = S.current
        const d = s.drag
        if (s.act !== "b" || !d || d.id !== e.pointerId) return
        const t = eosVolcanoNow()
        const k = s.scale || 1
        const dx = (e.clientX - d.x) / k
        const dy = (e.clientY - d.y) / k
        const dtMs = Math.max(8, t - d.t)
        const dist = Math.hypot(dx, dy)
        d.x = e.clientX
        d.y = e.clientY
        d.t = t
        if (dist < 0.5) return
        const inst = (dist / dtMs) * 1000
        const a = 1 - Math.exp(-dtMs / 80)
        s.speed = s.speed + (inst - s.speed) * a
        s.lastMoveAt = t
        moveCloud(dx)
    }
    const endDrag = (e) => {
        const s = S.current
        if (!s.drag || (e && e.pointerId != null && s.drag.id !== e.pointerId)) return
        s.drag = null
        s.holding = false
        s.dragging = false
    }
    const onCraterKey = (e) => {
        if (e.key !== " " && e.key !== "Enter") return
        e.preventDefault()
        if (e.repeat) return
        S.current.lastKeyErupt = eosVolcanoNow()
        erupt()
    }
    const onCraterClick = (e) => {
        // pointer taps are handled on pointerdown (instant); this is for assistive tech (click with detail 0)
        const s = S.current
        if (e.detail !== 0 || eosVolcanoNow() - s.lastKeyErupt < 400) return
        erupt()
    }
    const onCloudKeyDown = (e) => {
        const s = S.current
        if (s.act !== "b") return
        const t = eosVolcanoNow()
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault()
            const dir = e.key === "ArrowLeft" ? -1 : 1
            s.keyLastDir = dir
            s.keyRainUntil = t + 600
            if (!e.repeat) {
                s.keyDir = dir
                s.keyGlideUntil = t + 160
                touchAnswer()
            }
            return
        }
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            s.keyRainUntil = t + 700
            if (!e.repeat) {
                s.keyHold = true
                touchAnswer()
            }
        }
    }
    const onCloudKeyUp = (e) => {
        const s = S.current
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault()
            s.keyDir = 0
        }
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            s.keyHold = false
        }
    }

    // ---------------------------------------------------------------- render
    const G = L
    const left = Math.max(0, V.taps - taps)
    const nextIdx = ((taps * Math.max(1, S.current.rocksPerTap || eosVolcanoRocksPerTap(eosVolcanoIntensity()))) % V.pool) % words.length
    const cueLive =
        act === "a" ? "Volcano. Tap the crater six times to erupt." : act === "ab" ? "Now watch it cool." : act === "b" ? "Rain cloud. Drag it slowly over the lava, or press and hold it. Breathe in as it gathers, out as it rains." : "Cooled to zero. Flowers are growing."
    const rootStyle = G ? { "--flow": act === "a" ? Math.max(0.08, taps / V.taps) : 1, "--cw": `${G.cw}px`, "--ch": `${G.ch}px` } : { "--flow": 0.08 }
    return (
        <div
            ref={rootRef}
            className="arena eosArena eosG112"
            {...EOS_PRIVATE_ATTRS}
            data-act={act}
            data-variant={variant}
            data-daypart={dayPart}
            data-calm={red ? "1" : "0"}
            data-phone={G && G.phone ? "1" : "0"}
            data-rain="off"
            data-eos-volc-taps={taps}
            style={rootStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
        >
            <div ref={sceneRef} className="eosVolcScene" data-shake="">
                <div className="eosVolcSky eosVolcSkyHot" style={{ background: EOS_VOLCANO_HOT[variant] }} />
                <div className="eosVolcSky eosVolcSkyCool" style={{ background: EOS_VOLCANO_COOL[dayPart] || EOS_VOLCANO_COOL.day }} />
                {dayPart === "night" ? (
                    <div className="eosVolcStars">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <i key={i} style={{ left: `${8 + eosNoise(i, 21) * 84}%`, top: `${6 + eosNoise(i, 22) * 30}%` }} />
                        ))}
                    </div>
                ) : null}
                {G ? (
                    <>
                        <svg className="eosVolcRidge" viewBox="0 0 1000 200" preserveAspectRatio="none" style={{ top: G.cy - G.mh * 0.08, height: G.H - G.cy + G.mh * 0.08 }} aria-hidden="true">
                            <path className="eosVolcRidgeFar" d="M0,120 C120,60 220,100 320,70 C420,40 520,96 640,64 C760,34 880,90 1000,58 L1000,200 L0,200 Z" />
                            <path className="eosVolcRidgeNear" d="M0,160 C140,110 260,150 380,122 C520,92 640,150 780,118 C880,96 950,128 1000,110 L1000,200 L0,200 Z" />
                        </svg>
                        <div className="eosVolcPlume" style={{ left: G.cx, top: G.cy }} aria-hidden="true">
                            <i />
                            <i />
                            <i />
                        </div>
                        <div className="eosVolcEmbers" style={{ left: G.cx, top: G.cy }} aria-hidden="true">
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                                <i key={i} style={{ "--i": i, "--ex": `${Math.round((eosNoise(i, 31) - 0.5) * 120)}px` }} />
                            ))}
                        </div>
                        <div ref={rainRef} className="eosVolcRain" style={{ top: G.cloudY + G.ch * 0.2, width: G.cw * 0.8 }} aria-hidden="true">
                            <div className="eosVolcRainBreath">
                                <i className="eosVolcRainA" />
                                <i className="eosVolcRainB" />
                                <i className="eosVolcMist" />
                            </div>
                        </div>
                        <svg className="eosVolcMtn" viewBox="0 0 1000 620" preserveAspectRatio="none" style={{ left: G.mx, top: G.my, width: G.mw, height: G.mh }} aria-hidden="true">
                            <defs>
                                <linearGradient id={`eosVolcRock${uid}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor="#4a2a3c" />
                                    <stop offset="0.55" stopColor="#2a1626" />
                                    <stop offset="1" stopColor="#170b16" />
                                </linearGradient>
                                <radialGradient id={`eosVolcWarm${uid}`} cx="0.5" cy="0.08" r="0.75">
                                    <stop offset="0" stopColor="#ff8a2e" stopOpacity="0.75" />
                                    <stop offset="0.45" stopColor="#d7263d" stopOpacity="0.32" />
                                    <stop offset="1" stopColor="#d7263d" stopOpacity="0" />
                                </radialGradient>
                                <linearGradient id={`eosVolcCoolL${uid}`} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0" stopColor="#7fe8e0" stopOpacity="0.42" />
                                    <stop offset="0.5" stopColor="#2ec4b6" stopOpacity="0.14" />
                                    <stop offset="1" stopColor="#0b2a3a" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id={`eosVolcShade${uid}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0.5" stopColor="#000" stopOpacity="0" />
                                    <stop offset="1" stopColor="#05020a" stopOpacity="0.42" />
                                </linearGradient>
                                <linearGradient id={`eosVolcLava${uid}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor="#ffb13b" />
                                    <stop offset="0.5" stopColor="#ff5a1f" />
                                    <stop offset="1" stopColor="#d7263d" />
                                </linearGradient>
                            </defs>
                            <path d={paths.body} fill={`url(#eosVolcRock${uid})`} />
                            <path className="eosVolcCoolLight" d={paths.body} fill={`url(#eosVolcCoolL${uid})`} />
                            <path className="eosVolcHeatGlow" d={paths.body} fill={`url(#eosVolcWarm${uid})`} />
                            <path d={paths.body} fill={`url(#eosVolcShade${uid})`} />
                            <path className="eosVolcRimHot" d={paths.ridge} />
                            <path className="eosVolcRimCool" d={paths.ridge} />
                            {paths.rivers.map((d, i) => (
                                <g key={i}>
                                    <path className="eosVolcFlow eosVolcObsidian" d={d} pathLength="1" />
                                    <path className="eosVolcFlow eosVolcLavaGlow" d={d} pathLength="1" />
                                    <path className="eosVolcFlow eosVolcLavaHot" d={d} pathLength="1" stroke={`url(#eosVolcLava${uid})`} />
                                    <path className="eosVolcFlow eosVolcLavaCore" d={d} pathLength="1" />
                                    <path className="eosVolcCrack" d={d} pathLength="1" />
                                </g>
                            ))}
                            <ellipse className="eosVolcPoolCool" cx="500" cy="74" rx="66" ry="13" />
                            <ellipse className="eosVolcPoolHot" cx="500" cy="74" rx="66" ry="13" fill={`url(#eosVolcLava${uid})`} />
                        </svg>
                        <div ref={glowRef} className="eosVolcGlow" data-pulse="" style={{ left: G.cx, top: G.cy, width: G.craterW * 1.6, height: G.craterW * 1.1 }} aria-hidden="true" />
                        <div className="eosVolcLoadWrap" style={{ left: G.cx, top: G.cy - 16 }} aria-hidden="true">
                            {words.map((w, i) => (
                                <div key={i} className="eosVolcLoad" data-on={act === "a" && left > 0 && i === nextIdx ? "1" : "0"}>
                                    <EosWord text={w} />
                                </div>
                            ))}
                        </div>
                        <div className="eosVolcPips" style={{ left: G.cx, top: G.cy + G.mh * 0.15 }} aria-hidden="true">
                            {Array.from({ length: V.taps }, (_, i) => (
                                <i key={i} className={i < taps ? "on" : ""} />
                            ))}
                        </div>
                        <div className="eosVolcGarden" aria-hidden="true" style={{ left: G.mx, top: G.my, width: G.mw, height: G.mh }}>
                            {EOS_VOLCANO_FLOWERS.map((f, i) => (
                                <i key={i} className="eosVolcFlower" style={{ left: `${f.u * 100}%`, top: `${f.v * 100}%`, "--i": i, "--fh": f.hue, "--fs": `${Math.round(f.s * (G.phone ? 0.78 : 1))}px` }}>
                                    <b />
                                </i>
                            ))}
                            {[0.34, 0.47, 0.62, 0.74].map((u, i) => (
                                <i key={`t${i}`} className="eosVolcTuft" style={{ left: `${u * 100}%`, top: `${(eosVolcanoSurf(u, paths.shoulder) + 0.06 + i * 0.07) * 100}%`, "--i": i }} />
                            ))}
                        </div>
                        <div className="eosVolcPuffs" aria-hidden="true">
                            {Array.from({ length: V.puffs }, (_, i) => (
                                <i key={i} ref={(el) => (puffRefs.current[i] = el)} className="eosVolcPuff" data-puff="" />
                            ))}
                        </div>
                        <div className="eosVolcRush" data-laugh={act === "c" ? "1" : "0"} style={{ left: G.rushX, top: G.rushY, "--rs": `${G.rushSize}px` }} aria-hidden="true">
                            <i className="eosVolcRushKey" />
                            <i className="eosVolcRushRim" />
                            <div ref={rushSqRef} className="eosVolcRushSq" data-sq="">
                                <EosCharacterOrb char="rush" mood={face} size={G.rushSize} bob={!red} reduced={red} />
                            </div>
                        </div>
                        <div className="eosVolcRocks" aria-hidden="true">
                            {Array.from({ length: V.pool }, (_, i) => (
                                <div key={i} ref={(el) => (rockRefs.current[i] = el)} className="eosVolcRock" data-fly="" style={{ left: G.cx, top: G.cy - 10 }}>
                                    <div className="eosVolcRockY">
                                        <div className="eosVolcRockBody">
                                            {thumbs.length ? <img className="eosVolcRockImg" src={thumbs[i % thumbs.length]} alt="" draggable={false} /> : null}
                                            <EosWord text={words[i % words.length]} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="eosVolcFx" aria-hidden="true">
                            {burst && typeof PremiumBurst === "function" ? <PremiumBurst key={burst.k} x={burst.x} y={burst.y} tone="gold" big={!!burst.big} /> : null}
                        </div>
                        <button
                            ref={craterRef}
                            type="button"
                            className="eosVolcCrater"
                            style={{ left: G.cx, top: G.cy + G.craterH * 0.18, width: G.craterW, height: G.craterH }}
                            aria-label={act === "a" ? `Volcano crater. Tap to erupt — ${left} to go.` : "Volcano crater"}
                            tabIndex={act === "a" ? 0 : -1}
                            onKeyDown={onCraterKey}
                            onClick={onCraterClick}
                            {...(act === "a" && left > 0 ? eosTarget({ g: "taps", n: left, label: `ERUPT IT! ×${left}` }) : {})}
                        >
                            <span className="eosVolcCraterRing" />
                        </button>
                        <div className="eosVolcBooms" style={{ left: Math.min(G.W - 90, G.cx + Math.min(150, G.W * 0.24)), top: Math.max(G.U0 + 30, G.cy - 78) }} aria-hidden="true">
                            {["BOOM!", "BOOM ×2!", "BOOM ×3!", "BOOM ×4!", "BOOM ×5!", "BOOM ×6!"].map((txt, i) => (
                                <b key={i} ref={(el) => (boomRefs.current[i] = el)} className="eosVolcBoom" data-pop="">
                                    {txt}
                                </b>
                            ))}
                        </div>
                        <button
                            ref={cloudRef}
                            type="button"
                            className="eosVolcCloud"
                            data-on={act === "b" ? "1" : "0"}
                            data-breath="in"
                            data-cue="in"
                            data-sq=""
                            style={{ top: G.cloudY - G.ch / 2, width: G.cw, height: G.ch }}
                            tabIndex={act === "b" ? 0 : -1}
                            aria-hidden={act === "b" ? undefined : "true"}
                            aria-label="Rain cloud. Drag it slowly left and right over the lava, or press and hold to rain. Arrow keys move it, Space rains."
                            onKeyDown={onCloudKeyDown}
                            onKeyUp={onCloudKeyUp}
                            {...(act === "b" ? eosTarget({ g: "slow", dir: "lr", d: 160, maxSpeed: V.maxSpeed, label: "RAIN… SLOWLY ↔" }) : {})}
                        >
                            <span className="eosVolcCloudIn">
                                <span className="eosVolcCloudBody">
                                    <i className="eosVolcCloudPuff p1" />
                                    <i className="eosVolcCloudPuff p2" />
                                    <i className="eosVolcCloudPuff p3" />
                                    <i className="eosVolcCloudPuff p4" />
                                    <span className="eosVolcCloudFace">
                                        <i className="eosVolcEye" />
                                        <i className="eosVolcEye" />
                                        <i className="eosVolcSmile" />
                                    </span>
                                </span>
                            </span>
                            <span className="eosVolcCue in">in…</span>
                            <span className="eosVolcCue out">out…</span>
                            <span className="eosVolcCue slow">slower… 🐢</span>
                        </button>
                        <div className="eosVolcHero" style={{ top: G.U0 + G.uh * 0.06 }} aria-hidden="true">
                            <span className="h1">Now watch it cool…</span>
                            <span className="h2">Cooled to zero</span>
                        </div>
                    </>
                ) : null}
            </div>
            <div className="eosSrOnly" aria-live="polite">
                {cueLive}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- CSS (every rule under ${EOS_A} .eosG112)
const EOS_VOLCANO_P = `${EOS_A} .eosG112`
const EOS_VOLCANO_CSS = `
${EOS_VOLCANO_P}{--h:1;--flow:.08;background:#14061a;cursor:default}
${EOS_VOLCANO_P} .eosVolcScene{position:absolute;inset:0;overflow:hidden}
${EOS_VOLCANO_P} .eosVolcScene[data-shake="a"]{animation:eosVolcanoShakeA .18s linear}
${EOS_VOLCANO_P} .eosVolcScene[data-shake="b"]{animation:eosVolcanoShakeB .18s linear}
${EOS_VOLCANO_P} .eosVolcScene *{pointer-events:none}
${EOS_VOLCANO_P} .eosVolcScene :is(.eosVolcCrater,.eosVolcCloud){pointer-events:auto}
${EOS_VOLCANO_P} .eosVolcSky{position:absolute;inset:0}
${EOS_VOLCANO_P} .eosVolcSkyCool{opacity:calc(1 - var(--h));transition:opacity .3s linear}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcSkyCool{opacity:1;transition:opacity 1s ease}
${EOS_VOLCANO_P} .eosVolcStars{position:absolute;inset:0;opacity:calc(1 - var(--h))}
${EOS_VOLCANO_P} .eosVolcStars i{position:absolute;width:3px;height:3px;border-radius:50%;background:#e8fbff;box-shadow:0 0 6px #bff3ff}
${EOS_VOLCANO_P} .eosVolcRidge{position:absolute;left:0;width:100%;overflow:visible}
${EOS_VOLCANO_P} .eosVolcRidgeFar{fill:#3a1030;opacity:.75}
${EOS_VOLCANO_P} .eosVolcRidgeNear{fill:#24091f}
${EOS_VOLCANO_P}[data-daypart="day"] .eosVolcRidge,${EOS_VOLCANO_P}[data-daypart="dawn"] .eosVolcRidge{filter:none}
${EOS_VOLCANO_P} .eosVolcRidge path{transition:fill 1s ease}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcRidgeFar{fill:#1f6f78}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcRidgeNear{fill:#164f5a}
${EOS_VOLCANO_P} .eosVolcPlume{position:absolute;width:0;height:0;opacity:calc(var(--h) * .9)}
${EOS_VOLCANO_P} .eosVolcPlume i{position:absolute;left:-90px;top:-210px;width:180px;height:150px;border-radius:50%;background:radial-gradient(circle at 45% 40%,rgba(120,40,60,.75),rgba(60,14,34,.5) 55%,rgba(40,8,24,0) 72%);animation:eosVolcanoPlume 7s ease-in-out infinite alternate}
${EOS_VOLCANO_P} .eosVolcPlume i:nth-child(2){left:-150px;top:-280px;width:200px;height:160px;animation-delay:-2.3s;opacity:.8}
${EOS_VOLCANO_P} .eosVolcPlume i:nth-child(3){left:-30px;top:-300px;width:220px;height:170px;animation-delay:-4.1s;opacity:.7}
${EOS_VOLCANO_P}[data-phone="1"] .eosVolcPlume i{scale:.7}
${EOS_VOLCANO_P} .eosVolcEmbers{position:absolute;width:0;height:0;opacity:var(--h)}
${EOS_VOLCANO_P} .eosVolcEmbers i{position:absolute;left:-3px;top:-6px;width:6px;height:6px;border-radius:50%;background:#ffd36b;box-shadow:0 0 10px #ff8a2e,0 0 4px #fff3b0;opacity:0;animation:eosVolcanoEmber 2.8s ease-out infinite;animation-delay:calc(var(--i) * -.4s)}
${EOS_VOLCANO_P} .eosVolcRain{position:absolute;left:0;z-index:3;height:200px;opacity:0;transition:opacity .45s ease;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 14%,#000 100%);mask-image:linear-gradient(180deg,transparent 0,#000 14%,#000 100%)}
${EOS_VOLCANO_P}[data-rain="drizzle"] .eosVolcRain{opacity:.42}
${EOS_VOLCANO_P}[data-rain="rain"] .eosVolcRain{opacity:1}
${EOS_VOLCANO_P}[data-rain="mist"] .eosVolcRain{opacity:.55}
${EOS_VOLCANO_P} .eosVolcRainBreath{position:absolute;inset:0;opacity:.55;transition:opacity 4s ease-in-out}
${EOS_VOLCANO_P}[data-breath="out"] .eosVolcRainBreath{opacity:1;transition:opacity .8s ease-out}
${EOS_VOLCANO_P} .eosVolcRainA,${EOS_VOLCANO_P} .eosVolcRainB{position:absolute;inset:0;background-image:repeating-linear-gradient(100deg,rgba(190,240,255,0) 0 14px,rgba(190,240,255,.85) 14px 16px,rgba(190,240,255,0) 16px 30px);background-size:30px 46px;animation:eosVolcanoRain .42s linear infinite}
${EOS_VOLCANO_P} .eosVolcRainB{background-image:repeating-linear-gradient(100deg,rgba(150,225,255,0) 0 20px,rgba(150,225,255,.55) 20px 21.5px,rgba(150,225,255,0) 21.5px 41px);background-size:41px 70px;animation-duration:.6s;opacity:.8}
${EOS_VOLCANO_P}[data-rain="mist"] :is(.eosVolcRainA,.eosVolcRainB){opacity:.15}
${EOS_VOLCANO_P} .eosVolcMist{position:absolute;left:-30%;right:-30%;top:0;height:70%;border-radius:50%;background:radial-gradient(closest-side,rgba(230,248,255,.55),rgba(230,248,255,0));opacity:0;transition:opacity .4s ease}
${EOS_VOLCANO_P}[data-rain="mist"] .eosVolcMist{opacity:1}
${EOS_VOLCANO_P} .eosVolcMtn{position:absolute;z-index:4;overflow:visible;filter:drop-shadow(0 -2px 14px rgba(0,0,0,.35))}
${EOS_VOLCANO_P} .eosVolcHeatGlow{opacity:var(--h)}
${EOS_VOLCANO_P} .eosVolcCoolLight{opacity:calc(1 - var(--h))}
${EOS_VOLCANO_P} .eosVolcRimHot{fill:none;stroke:#ff9a3d;stroke-width:5;stroke-linejoin:round;opacity:calc(var(--h) * .85)}
${EOS_VOLCANO_P} .eosVolcRimCool{fill:none;stroke:#8ff3ea;stroke-width:4;stroke-linejoin:round;opacity:calc((1 - var(--h)) * .8)}
${EOS_VOLCANO_P} .eosVolcFlow{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1;stroke-dashoffset:calc(1 - var(--flow));transition:stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)}
${EOS_VOLCANO_P} .eosVolcObsidian{stroke:#38343f;stroke-width:26}
${EOS_VOLCANO_P} .eosVolcLavaGlow{stroke:rgba(255,96,30,.38);stroke-width:52;opacity:var(--h)}
${EOS_VOLCANO_P} .eosVolcLavaHot{stroke-width:22;opacity:clamp(0,calc(var(--h) * 1.6),1)}
${EOS_VOLCANO_P} .eosVolcLavaCore{stroke:#ffe08a;stroke-width:7;opacity:clamp(0,calc((var(--h) - .45) * 2.2),1)}
${EOS_VOLCANO_P} .eosVolcCrack{fill:none;stroke:#7ff0e0;stroke-width:4;stroke-linecap:round;stroke-dasharray:.018 .03;opacity:calc((1 - var(--h)) * .45);transition:opacity .8s ease,stroke .8s ease}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcCrack{opacity:1;stroke:#ffe58a;filter:drop-shadow(0 0 4px #ffb23e)}
${EOS_VOLCANO_P} .eosVolcPoolCool{fill:#2c2833}
${EOS_VOLCANO_P} .eosVolcPoolHot{opacity:var(--h)}
${EOS_VOLCANO_P} .eosVolcGlow{position:absolute;z-index:5;translate:-50% -50%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,214,120,.95),rgba(255,110,40,.55) 45%,rgba(215,38,61,0));opacity:calc(var(--h) * .9)}
${EOS_VOLCANO_P} .eosVolcGlow[data-pulse="a"]{animation:eosVolcanoGlowA .5s ease-out}
${EOS_VOLCANO_P} .eosVolcGlow[data-pulse="b"]{animation:eosVolcanoGlowB .5s ease-out}
${EOS_VOLCANO_P} .eosVolcLoadWrap{position:absolute;z-index:6;width:0;height:0}
${EOS_VOLCANO_P} .eosVolcLoad{position:absolute;left:0;top:0;translate:-50% -60%;opacity:0;scale:.6;transition:opacity .18s ease,scale .25s cubic-bezier(.3,1.6,.4,1);width:max-content;max-width:180px;padding:7px 14px 8px;border-radius:46% 54% 44% 56%/58% 46% 54% 42%;text-align:center;background:radial-gradient(circle at 30% 25%,#6b3a3a,#2a1422 70%);box-shadow:inset 0 -5px 10px rgba(255,120,40,.55),0 0 18px rgba(255,120,40,.6)}
${EOS_VOLCANO_P} .eosVolcLoad[data-on="1"]{opacity:1;scale:1;animation:eosVolcanoLoad 1.4s ease-in-out infinite}
${EOS_VOLCANO_P} .eosVolcPips{position:absolute;z-index:6;display:flex;gap:7px;translate:-50% -50%}
${EOS_VOLCANO_P} .eosVolcPips i{width:13px;height:13px;border-radius:50%;background:rgba(30,10,24,.85);box-shadow:inset 0 0 0 2px rgba(255,150,80,.55);transition:background .2s ease,box-shadow .2s ease,scale .25s cubic-bezier(.3,1.6,.4,1)}
${EOS_VOLCANO_P} .eosVolcPips i.on{background:radial-gradient(circle at 40% 35%,#fff3b0,#ff9a2e 55%,#d7263d);box-shadow:0 0 10px #ff8a2e;scale:1.15}
${EOS_VOLCANO_P}[data-act="b"] .eosVolcPips,${EOS_VOLCANO_P}[data-act="c"] .eosVolcPips{opacity:0;transition:opacity .6s ease}
${EOS_VOLCANO_P} .eosVolcGarden{position:absolute;z-index:7}
${EOS_VOLCANO_P} .eosVolcFlower{position:absolute;width:var(--fs);height:var(--fs);translate:-50% -100%;transform-origin:50% 100%;scale:0;opacity:0}
${EOS_VOLCANO_P} .eosVolcFlower::before{content:"";position:absolute;left:50%;bottom:0;width:4px;height:52%;margin-left:-2px;border-radius:3px;background:linear-gradient(#5fd38d,#2a8f5a)}
${EOS_VOLCANO_P} .eosVolcFlower b{position:absolute;left:50%;top:0;width:62%;height:62%;translate:-50% 0;border-radius:50%;background:radial-gradient(circle,#fff6c2 0 22%,#ffcf4a 23% 30%,transparent 31%),radial-gradient(circle at 50% 12%,hsl(var(--fh),95%,72%) 0 22%,transparent 23%),radial-gradient(circle at 88% 40%,hsl(var(--fh),95%,68%) 0 22%,transparent 23%),radial-gradient(circle at 74% 86%,hsl(var(--fh),92%,64%) 0 22%,transparent 23%),radial-gradient(circle at 26% 86%,hsl(var(--fh),92%,64%) 0 22%,transparent 23%),radial-gradient(circle at 12% 40%,hsl(var(--fh),95%,68%) 0 22%,transparent 23%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcFlower{animation:eosVolcanoBloom .7s cubic-bezier(.3,1.6,.4,1) both;animation-delay:calc(var(--i) * 110ms)}
${EOS_VOLCANO_P} .eosVolcTuft{position:absolute;width:26px;height:12px;translate:-50% -100%;border-radius:50% 50% 0 0;background:radial-gradient(circle at 25% 100%,#4fcf7f 0 40%,transparent 41%),radial-gradient(circle at 75% 100%,#3fb86c 0 40%,transparent 41%),radial-gradient(circle at 50% 100%,#6fe39a 0 46%,transparent 47%);opacity:0;scale:0;transform-origin:50% 100%}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcTuft{animation:eosVolcanoBloom .6s cubic-bezier(.3,1.6,.4,1) both;animation-delay:calc(250ms + var(--i) * 120ms)}
${EOS_VOLCANO_P} .eosVolcPuffs{position:absolute;inset:0;z-index:8}
${EOS_VOLCANO_P} .eosVolcPuff{position:absolute;width:46px;height:40px;margin:-20px 0 0 -23px;border-radius:50%;background:radial-gradient(circle at 45% 40%,rgba(255,255,255,.85),rgba(230,240,250,.45) 50%,rgba(230,240,250,0) 72%);opacity:0}
${EOS_VOLCANO_P} .eosVolcPuff[data-puff="a"]{animation:eosVolcanoPuffA 1.5s ease-out both}
${EOS_VOLCANO_P} .eosVolcPuff[data-puff="b"]{animation:eosVolcanoPuffB 1.5s ease-out both}
${EOS_VOLCANO_P} .eosVolcRush{position:absolute;z-index:9;width:var(--rs);height:var(--rs);translate:-50% -50%}
${EOS_VOLCANO_P} .eosVolcRush[data-laugh="1"]{animation:eosVolcanoLaugh .5s ease-in-out infinite alternate}
${EOS_VOLCANO_P} .eosVolcRushKey,${EOS_VOLCANO_P} .eosVolcRushRim{position:absolute;inset:-22%;border-radius:50%}
${EOS_VOLCANO_P} .eosVolcRushKey{background:radial-gradient(circle at 30% 78%,rgba(255,130,40,.9),rgba(255,80,40,0) 58%);opacity:var(--h)}
${EOS_VOLCANO_P} .eosVolcRushRim{background:radial-gradient(circle at 76% 24%,rgba(127,240,224,.85),rgba(127,240,224,0) 56%);opacity:calc(.4 + (1 - var(--h)) * .6)}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcRushKey{opacity:1;background:radial-gradient(circle at 28% 76%,rgba(255,229,138,.95),rgba(255,178,62,0) 60%)}
${EOS_VOLCANO_P} .eosVolcRushSq{position:relative;transform-origin:50% 90%}
${EOS_VOLCANO_P} .eosVolcRushSq[data-sq="a"]{animation:eosVolcanoSquashA .6s ease-out}
${EOS_VOLCANO_P} .eosVolcRushSq[data-sq="b"]{animation:eosVolcanoSquashB .6s ease-out}
${EOS_VOLCANO_P} .eosVolcRocks{position:absolute;inset:0;z-index:10}
${EOS_VOLCANO_P} .eosVolcRock{position:absolute;width:0;height:0}
${EOS_VOLCANO_P} .eosVolcRockY{position:absolute;left:0;top:0}
${EOS_VOLCANO_P} .eosVolcRockBody{position:absolute;left:0;top:0;translate:-50% -50%;display:flex;align-items:center;justify-content:center;gap:6px;width:max-content;max-width:190px;min-width:70px;padding:9px 16px 10px;text-align:center;opacity:0;border-radius:46% 54% 44% 56%/58% 46% 54% 42%;background:radial-gradient(circle at 70% 78%,rgba(255,120,40,.6),rgba(255,120,40,0) 40%),radial-gradient(circle at 30% 24%,#7a4646,#3a1d2a 62%,#1f0d18);box-shadow:inset 0 -6px 12px rgba(255,110,40,.55),inset 0 4px 8px rgba(255,220,180,.18),0 0 22px rgba(255,110,40,.55),0 8px 16px rgba(0,0,0,.4)}
${EOS_VOLCANO_P} .eosVolcRockBody::before,${EOS_VOLCANO_P} .eosVolcRockBody::after{content:"";position:absolute;left:50%;top:50%;width:16px;height:13px;margin:-6px 0 0 -8px;border-radius:3px 7px 2px 6px;background:#4a2630;box-shadow:inset 0 -3px 4px rgba(255,140,50,.8),0 0 8px rgba(255,120,40,.7);opacity:0;--sx:-54px;--sy:-30px}
${EOS_VOLCANO_P} .eosVolcRockBody::after{--sx:58px;--sy:26px;width:12px;height:11px}
${EOS_VOLCANO_P} .eosVolcRockImg{width:30px;height:30px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,200,140,.8)}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="a"]{animation:eosVolcanoXa 1.6s linear both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="b"]{animation:eosVolcanoXb 1.6s linear both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="a"] .eosVolcRockY{animation:eosVolcanoYa 1.6s both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="b"] .eosVolcRockY{animation:eosVolcanoYb 1.6s both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="a"] .eosVolcRockBody{animation:eosVolcanoBodyA 1.6s ease both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="b"] .eosVolcRockBody{animation:eosVolcanoBodyB 1.6s ease both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="a"] .eosVolcRockBody::before,${EOS_VOLCANO_P} .eosVolcRock[data-fly="a"] .eosVolcRockBody::after{animation:eosVolcanoShardA 1.6s ease-out both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="b"] .eosVolcRockBody::before,${EOS_VOLCANO_P} .eosVolcRock[data-fly="b"] .eosVolcRockBody::after{animation:eosVolcanoShardB 1.6s ease-out both}
${EOS_VOLCANO_P} .eosVolcFx{position:absolute;inset:0;z-index:11}
${EOS_VOLCANO_P} .eosVolcCrater{position:absolute;z-index:12;translate:-50% -50%;border-radius:50%!important;touch-action:none}
${EOS_VOLCANO_P} .eosVolcCraterRing{position:absolute;inset:4px;border-radius:50%;border:3px solid rgba(255,214,120,.0);box-shadow:0 0 0 0 rgba(255,180,80,0)}
${EOS_VOLCANO_P}[data-act="a"] .eosVolcCraterRing{border-color:rgba(255,220,140,.55);animation:eosVolcanoRing 1.6s ease-in-out infinite}
${EOS_VOLCANO_P} .eosVolcBooms{position:absolute;z-index:14;width:0;height:0}
${EOS_VOLCANO_P} .eosVolcBoom{position:absolute;left:0;top:0;translate:-50% -50%;white-space:nowrap;font:900 28px/1 var(--eos-font);letter-spacing:.02em;color:#fff3b0;text-shadow:0 3px 0 #8a2300,0 0 16px rgba(255,120,30,.85);opacity:0}
${EOS_VOLCANO_P}[data-phone="1"] .eosVolcBoom{font-size:22px}
${EOS_VOLCANO_P} .eosVolcBoom[data-pop="a"]{animation:eosVolcanoBoomA .9s ease-out both}
${EOS_VOLCANO_P} .eosVolcBoom[data-pop="b"]{animation:eosVolcanoBoomB .9s ease-out both}
${EOS_VOLCANO_P} .eosVolcCloud{position:absolute;left:0;z-index:13;opacity:0;visibility:hidden;touch-action:none;cursor:grab;transition:opacity .6s ease,visibility 0s .6s}
${EOS_VOLCANO_P} .eosVolcCloud[data-on="1"]{opacity:1;visibility:visible;transition:opacity .6s ease}
${EOS_VOLCANO_P} .eosVolcCloud:active{cursor:grabbing}
${EOS_VOLCANO_P} .eosVolcCloudIn{position:absolute;inset:0;display:block}
${EOS_VOLCANO_P} .eosVolcCloud[data-on="1"] .eosVolcCloudIn{animation:eosVolcanoCloudIn .9s cubic-bezier(.2,.9,.3,1.1) both}
${EOS_VOLCANO_P} .eosVolcCloudBody{position:absolute;inset:0;display:block;transform-origin:50% 60%;scale:1;transition:scale .5s ease}
${EOS_VOLCANO_P} .eosVolcCloud[data-breath="in"] .eosVolcCloudBody{scale:1.13;transition:scale 4s ease-in-out}
${EOS_VOLCANO_P} .eosVolcCloud[data-breath="out"] .eosVolcCloudBody{scale:.95;transition:scale 6s linear}
${EOS_VOLCANO_P} .eosVolcCloud[data-sq="a"] .eosVolcCloudIn{animation:eosVolcanoSquashA .5s ease-out}
${EOS_VOLCANO_P} .eosVolcCloud[data-sq="b"] .eosVolcCloudIn{animation:eosVolcanoSquashB .5s ease-out}
${EOS_VOLCANO_P} .eosVolcCloudPuff{position:absolute;border-radius:50%;background:radial-gradient(circle at 38% 30%,#ffffff,#eef7ff 40%,#c4d8ee 78%,#9fb8d8);box-shadow:inset -6px -8px 14px rgba(70,100,150,.32),0 0 18px rgba(143,243,234,.35)}
${EOS_VOLCANO_P} .eosVolcCloudPuff.p1{left:4%;top:38%;width:40%;height:52%}
${EOS_VOLCANO_P} .eosVolcCloudPuff.p2{left:22%;top:8%;width:46%;height:66%}
${EOS_VOLCANO_P} .eosVolcCloudPuff.p3{left:50%;top:20%;width:44%;height:60%}
${EOS_VOLCANO_P} .eosVolcCloudPuff.p4{left:14%;top:46%;width:74%;height:46%;border-radius:999px}
${EOS_VOLCANO_P} .eosVolcCloudFace{position:absolute;left:32%;top:46%;width:36%;height:30%}
${EOS_VOLCANO_P} .eosVolcEye{position:absolute;top:8%;width:12%;height:34%;border-radius:50%;background:#26304d;transition:scale .5s ease}
${EOS_VOLCANO_P} .eosVolcEye:first-child{left:18%}
${EOS_VOLCANO_P} .eosVolcEye:nth-child(2){right:18%}
${EOS_VOLCANO_P} .eosVolcCloud[data-breath="out"] .eosVolcEye{scale:1 .3}
${EOS_VOLCANO_P} .eosVolcSmile{position:absolute;left:34%;top:46%;width:32%;height:30%;border-radius:0 0 999px 999px;border:3px solid #26304d;border-top:0}
${EOS_VOLCANO_P} .eosVolcCloudFace::before,${EOS_VOLCANO_P} .eosVolcCloudFace::after{content:"";position:absolute;top:44%;width:16%;height:22%;border-radius:50%;background:rgba(255,140,170,.55)}
${EOS_VOLCANO_P} .eosVolcCloudFace::before{left:-4%}
${EOS_VOLCANO_P} .eosVolcCloudFace::after{right:-4%}
${EOS_VOLCANO_P} .eosVolcCue{position:absolute;left:50%;bottom:calc(100% + 4px);translate:-50% 0;white-space:nowrap;font:900 18px/1 var(--eos-font);letter-spacing:.03em;color:#fff;padding:6px 14px 7px;border-radius:999px;background:rgba(8,34,48,.66);box-shadow:0 0 0 2px rgba(143,243,234,.45);opacity:0;transition:opacity .35s ease}
${EOS_VOLCANO_P}[data-phone="1"] .eosVolcCue{font-size:16px}
${EOS_VOLCANO_P} .eosVolcCloud[data-cue="in"] .eosVolcCue.in,${EOS_VOLCANO_P} .eosVolcCloud[data-cue="out"] .eosVolcCue.out{opacity:1}
${EOS_VOLCANO_P} .eosVolcCloud[data-cue="slow"] .eosVolcCue.slow{opacity:1;background:rgba(60,24,10,.78);box-shadow:0 0 0 2px rgba(255,214,120,.7)}
${EOS_VOLCANO_P} .eosVolcHero{position:absolute;z-index:14;left:50%;translate:-50% 0;width:max-content;max-width:92%;text-align:center}
${EOS_VOLCANO_P} .eosVolcHero span{display:block;font:900 var(--eos-fs-hero)/1.05 var(--eos-font);color:#fff;text-shadow:0 3px 0 rgba(20,10,40,.55),0 0 22px rgba(79,209,232,.55);opacity:0;height:0;transition:opacity .45s ease}
${EOS_VOLCANO_P}[data-act="ab"] .eosVolcHero .h1{opacity:1;height:auto}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcHero .h2{opacity:1;height:auto;background:linear-gradient(180deg,#fff7c8,#ffd04a 55%,#ff9a2e);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 3px 0 rgba(90,30,0,.45))}
${EOS_VOLCANO_P} .eosWord{font-size:var(--eos-fs-word)!important}
/* reduced motion / calm visuals: no shake, no travel (rocks fade in place), rain is an opacity pulse */
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcScene[data-shake]{animation:none!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRock[data-fly]{animation:none!important;translate:var(--rx,0) 0}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRock[data-fly] .eosVolcRockY{animation:none!important;translate:0 var(--ry,0)}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRock[data-fly="a"] .eosVolcRockBody{animation:eosVolcanoFadeA 1.6s ease both!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRock[data-fly="b"] .eosVolcRockBody{animation:eosVolcanoFadeB 1.6s ease both!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRockBody::before,${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRockBody::after{animation:none!important;opacity:0}
${EOS_VOLCANO_P}[data-calm="1"] :is(.eosVolcRainA,.eosVolcRainB){animation:none!important}
${EOS_VOLCANO_P}[data-calm="1"] :is(.eosVolcPlume i,.eosVolcLoad,.eosVolcCraterRing,.eosVolcRush,.eosVolcRushSq,.eosVolcCloudIn){animation:none!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcEmbers{display:none}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcCloudBody{scale:1!important;transition:filter .6s ease}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcCloud[data-breath="out"] .eosVolcCloudBody{filter:brightness(1.12)}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcPuff[data-puff]{animation:eosVolcanoFadeA 1.5s ease both!important}
${EOS_VOLCANO_P}[data-calm="1"][data-act="c"] :is(.eosVolcFlower,.eosVolcTuft){animation:eosVolcanoFadeIn .8s ease both!important;scale:1}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcFlow{transition:none}
@media (prefers-reduced-motion:reduce){${EOS_VOLCANO_P} .eosVolcScene[data-shake]{animation:none!important}${EOS_VOLCANO_P} .eosVolcEmbers{display:none}}
@keyframes eosVolcanoShakeA{0%,100%{translate:0 0}20%{translate:-6px 2px}40%{translate:6px -2px}60%{translate:-4px 1px}80%{translate:3px 0}}
@keyframes eosVolcanoShakeB{0%,100%{translate:0 0}20%{translate:6px -2px}40%{translate:-6px 2px}60%{translate:4px -1px}80%{translate:-3px 0}}
@keyframes eosVolcanoXa{0%{translate:0 0}55%{translate:var(--rx) 0}100%{translate:calc(var(--rx) * 1.08) 0}}
@keyframes eosVolcanoXb{0%{translate:0 0}55%{translate:var(--rx) 0}100%{translate:calc(var(--rx) * 1.08) 0}}
@keyframes eosVolcanoYa{0%{translate:0 0;animation-timing-function:cubic-bezier(.12,.72,.32,1)}55%{translate:0 var(--ry);animation-timing-function:ease-in-out}100%{translate:0 calc(var(--ry) - 12px)}}
@keyframes eosVolcanoYb{0%{translate:0 0;animation-timing-function:cubic-bezier(.12,.72,.32,1)}55%{translate:0 var(--ry);animation-timing-function:ease-in-out}100%{translate:0 calc(var(--ry) - 12px)}}
@keyframes eosVolcanoBodyA{0%{opacity:0;scale:.3;rotate:0deg}8%{opacity:1}55%{scale:var(--s);rotate:var(--rot)}62%{scale:calc(var(--s) * 1.08) calc(var(--s) * .92)}70%{scale:var(--s)}82%{opacity:1;scale:var(--s);rotate:var(--rot)}100%{opacity:0;scale:calc(var(--s) * 1.45);rotate:var(--rot)}}
@keyframes eosVolcanoBodyB{0%{opacity:0;scale:.3;rotate:0deg}8%{opacity:1}55%{scale:var(--s);rotate:var(--rot)}62%{scale:calc(var(--s) * 1.08) calc(var(--s) * .92)}70%{scale:var(--s)}82%{opacity:1;scale:var(--s);rotate:var(--rot)}100%{opacity:0;scale:calc(var(--s) * 1.45);rotate:var(--rot)}}
@keyframes eosVolcanoShardA{0%,80%{opacity:0;translate:0 0}84%{opacity:1}100%{opacity:0;translate:var(--sx) var(--sy);rotate:200deg}}
@keyframes eosVolcanoShardB{0%,80%{opacity:0;translate:0 0}84%{opacity:1}100%{opacity:0;translate:var(--sx) var(--sy);rotate:200deg}}
@keyframes eosVolcanoFadeA{0%{opacity:0}18%{opacity:1}78%{opacity:1}100%{opacity:0}}
@keyframes eosVolcanoFadeB{0%{opacity:0}18%{opacity:1}78%{opacity:1}100%{opacity:0}}
@keyframes eosVolcanoFadeIn{from{opacity:0}to{opacity:1}}
@keyframes eosVolcanoGlowA{0%{scale:1}30%{scale:1.4;filter:brightness(1.35)}100%{scale:1}}
@keyframes eosVolcanoGlowB{0%{scale:1}30%{scale:1.4;filter:brightness(1.35)}100%{scale:1}}
@keyframes eosVolcanoSquashA{0%{scale:1 1}14%{scale:1.16 .82}34%{scale:.9 1.12}54%{scale:1.05 .96}100%{scale:1 1}}
@keyframes eosVolcanoSquashB{0%{scale:1 1}14%{scale:1.16 .82}34%{scale:.9 1.12}54%{scale:1.05 .96}100%{scale:1 1}}
@keyframes eosVolcanoBoomA{0%{opacity:0;scale:.5;translate:-50% -50%}18%{opacity:1;scale:1.18}40%{scale:1}100%{opacity:0;translate:-50% -140%}}
@keyframes eosVolcanoBoomB{0%{opacity:0;scale:.5;translate:-50% -50%}18%{opacity:1;scale:1.18}40%{scale:1}100%{opacity:0;translate:-50% -140%}}
@keyframes eosVolcanoPuffA{0%{opacity:0;scale:.4;translate:0 0}20%{opacity:.95}100%{opacity:0;scale:1.9;translate:0 -64px}}
@keyframes eosVolcanoPuffB{0%{opacity:0;scale:.4;translate:0 0}20%{opacity:.95}100%{opacity:0;scale:1.9;translate:0 -64px}}
@keyframes eosVolcanoEmber{0%{opacity:0;translate:0 0}12%{opacity:1}100%{opacity:0;translate:var(--ex) -170px}}
@keyframes eosVolcanoPlume{from{translate:-10px 0;scale:.95}to{translate:12px -16px;scale:1.06}}
@keyframes eosVolcanoRain{from{background-position:0 0}to{background-position:-8px 46px}}
@keyframes eosVolcanoLoad{0%,100%{translate:-50% -60%}50%{translate:-50% -72%}}
@keyframes eosVolcanoRing{0%,100%{scale:.92;opacity:.55}50%{scale:1.06;opacity:1}}
@keyframes eosVolcanoCloudIn{from{opacity:0;translate:-140px -30px;scale:.7}to{opacity:1;translate:0 0;scale:1}}
@keyframes eosVolcanoBloom{0%{opacity:0;scale:0 0}55%{opacity:1;scale:1.18 .86}75%{scale:.94 1.08}100%{opacity:1;scale:1 1}}
@keyframes eosVolcanoLaugh{from{translate:-50% -50%;rotate:-5deg}to{translate:-50% -60%;rotate:5deg}}
`

eosRegisterGame(EOS_GAME_112, EosVolcanoEngine, {
    hint: "Tap to erupt, then cool it slowly",
    mindBend: "Fire needs a minute. Cooling is the strong move.",
    css: EOS_VOLCANO_CSS,
    gesture: "taps",
    char: "rush",
    seconds: 30,
})
