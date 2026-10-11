// ===================================================================================
// EOS · 22 · GAME 112 COOL THE VOLCANO — the anger hero (docs/EOS_SPEC.md §8.0, §8.2, §0.4 pacer, §6.5)
// Act A ERUPT  (0 → 30):  6 crater taps. Each tap launches word-rocks that arc up into their own HANG SLOT (a grid
//                         over the sky band, clear of the arrow's chevron/label above the crater), hang readable and
//                         shatter. The JUICE scales with EOS_STORE.before (≤6 → 1 rock, 7-8 → 2 + deeper boom, 9-10 →
//                         3 + climbing pitch); the LENGTH never does. Shake only on alternate taps < 300 ms apart.
// Bridge (2.8 s):         the 6th tap's rocks shatter, then "Now watch it cool…" (mid-sky), then the cloud.
// Act B COOL   (30 → 95): the active ingredient. A rain cloud; drag it slowly ↔ over the lava, or press and hold
//                         (single pointer), or arrow keys + Space. The game OWNS the shared breath pacer
//                         (eosBreathOwn in 4 s / out 6 s): the cloud gathers on "in", pours on "out"; moving slowly
//                         during "out" cools ×2; pointer speed > 350 CSS px/s (÷ eosStageScale) → mist + "slower… 🐢"
//                         at half rate (never zero). RUSH breathes with the pacer (co-regulation), steams, gets
//                         dripped on. A linear floor SCHEDULE (100 → 0 between act-B start and 37 s after mount,
//                         ≥ 8 s) guarantees heat 0 even for an idle player: idle onDone ≈ 41-42 s after mount.
// Act C BLOOM  (96 → 100): 3.4 s choreography — the last steam column rises into a teal→gold aurora, 20 flowers race
//                         down the cooled rivers, the crater becomes a petal spring, RUSH hops onto the summit and
//                         belly-laughs (E44) with a gold burst, the cloud spins and drifts off. Then onProgress(100)
//                         (the hero line fades so the shared flip words get the top band) and onDone once.
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
    notes: "EOS anger hero · erupt ≤ 8 s, cool ~14-22 s · idle ≤ 45 s",
}

const EOS_VOLCANO = {
    taps: 6, //            act A length (never scaled by intensity)
    pool: 8, //            pre-mounted word rocks, one per hang slot (phone 6 slots, desktop 8): words never stack
    puffs: 6, //           pre-mounted steam puffs
    rate: 4.5, //          heat %/s at the slow rate (hold, or a slow drag during "in"); ×2 slow drag on "out"
    //                     → a slow drag ≈ 14 s (1.5 exhales), press-and-hold ≈ 22 s
    maxSpeed: 350, //      CSS px/s (÷ eosStageScale) — faster = mist at half rate
    keySpeed: 170, //      keyboard glide px/s (always "slow")
    deadline: 37, //       s since mount: the idle floor schedule reaches heat 0 by then (idle onDone ≈ 41-42 s)
    minCoolS: 8, //        …but act B always gets at least this long (a very slow act A pushes the end out)
    inMs: EOS_BREATH.coreIn * 1000, // 4000
    outMs: EOS_BREATH.coreOut * 1000, // 6000
    rockMs: 1600, //       one rock's flight: rise (0-55 %) → hang → shatter (82-100 %)
    clearMs: 1250, //      after the 6th tap the last rocks fade out (they are already shattering)…
    bridgeMs: 2800, //     …"Now watch it cool…" shows from ~1.45 s, the cloud arrives at 2.8 s
    bloomMs: 3400, //      act C choreography before onProgress(100)
    landMs: 2150, //       RUSH lands on the summit (hop starts at 1.2 s, lasts 0.95 s)
    doneMs: 450,
    fastTapMs: 300,
    comboMs: 700,
    burstGapMs: 400, //    PremiumBurst remounts ≤ 2.5 Hz (DOM-churn + animated-node budget)
    bigGapMs: 450, //      a big burst only for taps ≥ 450 ms apart (animated-node budget)
    progressGapMs: 250, // onProgress ≤ 4 Hz in act B
    dripMs: 900, //        a raindrop on RUSH's head at most this often
    faces: { loud: 29, simmer: [52, 58, 52], soft: [34, 20, 70], laugh: 44 },
}
// Hot skies (variationSeed % 3) — the anger "loud" grade, smoky.
const EOS_VOLCANO_HOT = [
    "linear-gradient(180deg,#2a0b1f 0%,#6e1430 30%,#c4243a 56%,#ff7a1a 76%,#ffc061 100%)",
    "linear-gradient(180deg,#1d0b2e 0%,#561846 32%,#b8263f 58%,#ff6a2a 78%,#ffb35a 100%)",
    "linear-gradient(180deg,#14061a 0%,#480e22 32%,#a91f2e 58%,#ff8a3a 80%,#ffcf7a 100%)",
]
// Calm skies by local time (eosDayPart) — the anger "calm" grade (teal #2ec4b6 / #4fd1e8) lit for the hour.
const EOS_VOLCANO_COOL = {
    dawn: "linear-gradient(180deg,#2aa9b8 0%,#4fd1e8 42%,#a8ecdf 74%,#ffd9b8 100%)",
    day: "linear-gradient(180deg,#2f9fe0 0%,#4fd1e8 46%,#9ff0e2 82%,#d9fff4 100%)",
    dusk: "linear-gradient(180deg,#1d4f7a 0%,#237f96 38%,#2ec4b6 70%,#ffb38a 100%)",
    night: "linear-gradient(180deg,#071a2c 0%,#0f3b52 44%,#176e78 78%,#2ec4b6 100%)",
}
// Bloom hues for the flowers that race down the cooled rivers in act C.
const EOS_VOLCANO_HUES = [330, 45, 190, 12, 280, 50, 345, 170, 300, 28]

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
        [-1, 0.66, 0.0, 1],
        [1, 0.6, 1.3, 0.92],
        [-1, 0.24, 2.1, 0.66],
        [1, 0.3, 3.4, 0.78],
    ]
    if (variant === 2) spec.reverse()
    const riverAt = ([side, f, ph, len], a) => {
        const v = 0.118 + a * 0.84 * len
        const half = eosVolcanoHalf(v)
        const u = 0.5 + side * (0.016 + 0.045 * f + half * f * Math.pow(a, 0.8) + 0.022 * Math.sin(a * 8 + ph + variant) * a)
        return { u, v }
    }
    const rivers = spec.map((r) => {
        const seg = []
        const n = 18
        for (let k = 0; k <= n; k++) {
            const { u, v } = riverAt(r, k / n)
            seg.push(`${(u * 1000).toFixed(1)},${(v * 620).toFixed(1)}`)
        }
        return "M" + seg.join(" L")
    })
    // act C: 4 blooms per river (16), ordered summit → foot (d = stagger index), nudged onto alternate banks
    const blooms = []
    for (let k = 0; k < 4; k++) {
        spec.forEach((r, ri) => {
            const p = riverAt(r, 0.24 + k * 0.2)
            if (p.v > 0.84) return
            blooms.push({ u: p.u + (k % 2 ? 0.022 : -0.022) * r[0], v: p.v, d: blooms.length, hue: EOS_VOLCANO_HUES[(k * 4 + ri) % EOS_VOLCANO_HUES.length], z: (k + ri) % 3 })
        })
    }
    // soft strata bands across the face (depth + texture)
    const strata = [0.3, 0.48, 0.66, 0.84].map((v, i) => {
        const half = eosVolcanoHalf(v) * 0.92
        const y = v * 620
        const x0 = (0.5 - half) * 1000
        const x1 = (0.5 + half) * 1000
        const sag = 14 + i * 6
        return `M${x0.toFixed(1)},${y.toFixed(1)} Q500,${(y + sag).toFixed(1)} ${x1.toFixed(1)},${(y - 4).toFixed(1)}`
    })
    return { ridge, body, rivers, shoulder, strata, blooms }
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
    const craterW = Math.max(phone ? 104 : 120, mw * 0.2)
    const craterH = Math.max(76, mh * 0.18)
    const craterY = cy + craterH * 0.18
    // the next word waits just UNDER the crater: the arrow puts its chevron + label above the crater, its ×N badge
    // on the top-right corner and its glove below-right of the aim point (aimed at the crater's upper part, oy -0.25)
    const loadY = craterY + craterH / 2 + 6
    const rushScale = 1.18
    const G = {
        W, H, phone, U0, U1, uh, mw, mh, mx, my, cx, cy, cw, ch, cloudY,
        xMin: cx - span, xMax: cx + span,
        rushSize, rushX, rushY, rushScale,
        summitY: cy - rushSize * rushScale * 0.42, // RUSH's centre once it stands on the summit (act C)
        craterW, craterH, craterY, loadY,
        pipsY: loadY + (phone ? 52 : 56),
        launchY: cy - 10,
        boomX: Math.min(W - 60, cx + craterW / 2 + (phone ? 62 : 80)), // beside the crater, clear of the ×N badge + glove
        boomY: cy + 2,
        heroMidY: U0 + (cy - U0) * 0.42, // the bridge line (the sky band is empty by then)
        heroTopY: U0 + (phone ? 12 : 10), // breath guide + finale line (the step pill is elsewhere in acts B / C)
        auroraY: U0 + (cy - U0) * 0.28,
        auroraH: Math.max(90, (cy - U0) * 0.55),
        shoulder: variant === 1 ? -1 : variant === 2 ? 1 : 0,
    }
    const sl = eosVolcanoSlots(G)
    G.slots = sl.slots
    G.rockMax = sl.rockMax
    return G
}
// Hang slots for the word-rocks: a grid over the sky band (phone 3 × 2, desktop 4 + outer columns lower), each slot
// clear of the mountain, the crater and the arrow's chevron + label column above the crater. One rock per slot at a
// time, so words that hang together never overlap. Falls back gracefully on very short screens.
function eosVolcanoSlots(G) {
    const { W, phone, U0, cx, mx, mw, my, mh, craterY, craterH, craterW, shoulder, boomX, boomY } = G
    const surf = (x) => my + mh * eosVolcanoSurf((x - mx) / mw, shoulder)
    const cols = phone || W < 900 ? 3 : 4
    const margin = phone ? 8 : 24
    const azW = phone ? 140 : 200 // the arrow's label (≈ 139 / 161 px) + chevron column above the crater
    // phone: rock half-width small enough that 3 fit across AND the outer ones fit beside the arrow column
    const half = phone ? Math.max(40, Math.min((W - margin * 2) / 6, (cx - azW / 2 - margin) / 2)) : Math.min(250, (W - margin * 2) / cols) / 2 - 6
    const colW = phone ? 0 : Math.min(250, (W - margin * 2) / cols)
    const colX = (c) => (phone ? (c === 0 ? margin + half : c === cols - 1 ? W - margin - half : cx) : cx - (colW * cols) / 2 + colW * (c + 0.5))
    const rockH = phone ? 60 : 64
    const rowH = rockH + (phone ? 12 : 10)
    const top = U0 + 8
    const craterTop = craterY - craterH / 2
    const azTop = craterTop - (phone ? 98 : 112)
    const want = phone ? 6 : 8
    const boom = { l: boomX - 64, r: boomX + 64, t: boomY - 56, b: boomY + 22 }
    const build = (useAz) => {
        const out = []
        for (let r = 0; r < 6 && out.length < want; r++) {
            const y = top + rockH / 2 + r * rowH
            for (let c = 0; c < cols && out.length < want; c++) {
                const x = colX(c)
                const l = x - half
                const rr = x + half
                let lim = surf(eosClamp(cx, l, rr)) - 14
                if (rr > cx - craterW * 0.6 && l < cx + craterW * 0.6) lim = Math.min(lim, craterTop - 16)
                if (useAz && rr > cx - azW / 2 && l < cx + azW / 2) lim = Math.min(lim, azTop - 6)
                const hitBoom = rr > boom.l && l < boom.r && y + rockH / 2 > boom.t && y - rockH / 2 < boom.b
                if (y + rockH / 2 <= lim && !hitBoom) out.push({ x: Math.round(x), y: Math.round(y) })
            }
        }
        return out
    }
    let slots = build(true)
    if (slots.length < 4) {
        const b = build(false)
        if (b.length > slots.length) slots = b
    }
    if (slots.length < 3) slots = [-1, 0, 1].map((d) => ({ x: Math.round(cx + d * half * 2.2), y: Math.round(Math.max(U0 + 40, craterTop - 70)) }))
    // max rock width incl. the 1.08 hang squash (desktop also × the 1.2 intensity tier)
    return { slots: slots.slice(0, EOS_VOLCANO.pool), rockMax: Math.max(76, Math.floor((half * 2) / (phone ? 1.08 : 1.2 * 1.08))) }
}
// Rocks should carry the heavy words: drop chunks made only of filler ("I am", "so", "my") when enough
// real words remain (order kept; eosWords already handled safety + padding). Never returns an empty list.
const EOS_VOLCANO_FILLER = /^(?:i|i'm|im|am|a|an|the|so|my|me|to|and|of|in|on|at|is|it|its|it's|be|was|were|just|really|very|that|this|for|with|but|or|you|he|she|they|we|our|your|his|her|their|been|being|have|has|had|do|did|feel|feeling|like)$/i
function eosVolcanoWords(list) {
    const all = (Array.isArray(list) ? list : []).filter(Boolean)
    const real = all.filter((w) => String(w).split(/\s+/).some((t) => t && !EOS_VOLCANO_FILLER.test(t.replace(/[^\w']/g, ""))))
    const pick = real.length >= 3 ? real : real.concat(all.filter((w) => !real.includes(w)))
    const out = pick.slice(0, 6)
    return out.length ? out : (EOS_EMO.anger.seeds || ["boiling over"]).slice(0, 3)
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
const EOS_VOLCANO_DEV = { cur: null, last: null } // last = the most recent instance (kept after unmount for tests)
eosExpose("volcano", {
    rocksPerTap: eosVolcanoRocksPerTap,
    coolNow: () => {
        const s = EOS_VOLCANO_DEV.cur
        if (s && s.act === "b") s.coolEnd = eosVolcanoNow()
        return !!s
    },
    state: () => {
        const s = EOS_VOLCANO_DEV.cur || EOS_VOLCANO_DEV.last
        if (!s) return null
        return {
            mounted: s.mounted, act: s.act, taps: s.taps, rocks: s.rocks, rocksPerTap: s.rocksPerTap, shakes: s.shakes, heat: Math.round(s.heat * 10) / 10,
            mode: s.mode, phase: s.phase, speed: Math.round(s.speed), chimes: s.chimes, nonSoft: s.nonSoft, sfx: s.sfxLog.slice(-60),
            slowerShown: s.slowerShown, holding: s.holding, cloudX: Math.round(s.cloudX), owned: s.owned, done: s.doneCalled,
            msAtA: s.msAtA, msAtC: s.msAtC, rates: { slow: EOS_VOLCANO.rate, mist: EOS_VOLCANO.rate / 2 },
            slots: s.L && s.L.slots ? s.L.slots.length : 0, skipped: s.skipped, coolEndMs: s.coolEnd ? Math.round(s.coolEnd - s.t0) : null,
            guide: s.guide, landed: s.landed, keyHold: s.keyHold, keyDir: s.keyDir, rainOn: s.rainOn, bridgeTaps: s.bridgeTaps, msDone: s.msDone,
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
    const dripRef = React.useRef(null)
    const rockRefs = React.useRef([])
    const puffRefs = React.useRef([])
    const boomRefs = React.useRef([])
    const timers = React.useRef(new Set())
    const P = React.useRef({})
    P.current = { onProgress, onDone, sfx, rainSfx, red }
    const uid = String(React.useId ? React.useId() : "v").replace(/[^a-zA-Z0-9]/g, "")
    const entryKey = Array.isArray(entries) ? entries.join("|") : String(entries || "")
    const words = React.useMemo(() => eosVolcanoWords(eosWords(entries, 8)), [entryKey])
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
            mounted: true, t0: eosVolcanoNow(), act: "a", taps: 0, rocks: 0, rocksPerTap: 0, lastTap: -1e9, fastRun: 0,
            combo: 0, shakes: 0, shakeAB: 0, pulseAB: 0, sqAB: 0, boomAB: 0, puffSlot: 0, lastPuffAt: 0, lastBurstAt: -1e9,
            heat: 100, hShown: 1, hAt: 0, lastP: -1, lastReportAt: 0, cloudX: 0, holding: false, dragging: false, drag: null,
            speed: 0, lastMoveAt: -1e9, keyDir: 0, keyLastDir: 1, keyGlideUntil: 0, keyHold: false, keyRainUntil: 0, lastEngagedAt: -1e9,
            phase: "in", phaseT0: 0, owned: false, mode: "off", chimes: 0, slowCool: 0, raf: 0, lastT: 0, doneCalled: false,
            nonSoft: 0, sfxLog: [], slowerShown: 0, lastSlowerTone: 0, lastKeyErupt: 0, msAtA: null, msAtC: null, msDone: null, L: null, scale: 1,
            // hang slots (slot i ↔ pooled rock i): busy-until time, last use, the word index each rock carries
            slotBusy: Array(V.pool).fill(0), slotUsed: Array(V.pool).fill(0), rockWord: Array.from({ length: V.pool }, (_, i) => i), skipped: 0,
            busyUntil: 0, coolT0: 0, coolEnd: 0, coolHeat0: 100, cycle: 0, guide: "", lastDripAt: 0, landed: false, rainOn: false, bridgeTaps: 0,
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
        EOS_VOLCANO_DEV.last = s
        report(0, "TAP THE CRATER")
        return () => {
            s.mounted = false
            if (s.raf) cancelAnimationFrame(s.raf)
            s.raf = 0
            timers.current.forEach((id) => clearTimeout(id))
            timers.current.clear()
            stopRain()
            if (s.owned) eosBreathOwn(null)
            s.owned = false
            if (EOS_VOLCANO_DEV.cur === s) EOS_VOLCANO_DEV.cur = null
        }
    }, [])

    // a key held while focus leaves (alt-tab, click elsewhere) must not stay "held"
    React.useEffect(() => {
        if (typeof window === "undefined") return
        window.addEventListener("blur", releaseKeys)
        return () => window.removeEventListener("blur", releaseKeys)
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
            if (!(s.L && s.L.W === next.W && s.L.H === next.H)) s.slotBusy.fill(0)
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
    // The wrapper's step pill pops at the last pointer (= on the crater / under the cloud) and its finish card at the
    // centre (= the summit). Re-anchor both for 112 only: CSS reads these props through :has(>.eosG112).
    eosLayoutEffect(() => {
        const host = rootRef.current && rootRef.current.parentElement
        const G = S.current.L
        if (!host || !G) return
        const side = variant === 1 ? -1 : 1
        const early = act === "a" || act === "ab"
        const px = early && G.phone ? eosClamp(G.cx - side * G.mw * 0.27, 70, G.W - 70) : G.cx
        host.style.setProperty("--eosVolcPillX", `${Math.round(px)}px`)
        host.style.setProperty("--eosVolcPillY", `${Math.round(G.pipsY + (G.phone ? 36 : 60))}px`)
        host.style.setProperty("--eosVolcFinY", `${Math.round(G.pipsY + (G.phone ? 20 : 70))}px`)
    }, [act, L, variant])
    React.useEffect(() => {
        const host = rootRef.current && rootRef.current.parentElement
        return () => {
            if (host) ["--eosVolcPillX", "--eosVolcPillY", "--eosVolcFinY"].forEach((k) => host.style.removeProperty(k))
        }
    }, [])

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
        // rocks: arc up from the crater into a free hang slot, hang (readable), shatter
        launchRocks(k, t, G, s.taps >= V.taps)
        // shake: only on alternate taps that come < 300 ms apart; never in reduced / calm
        if (!calm && s.fastRun > 0 && s.fastRun % 2 === 1) {
            s.shakes += 1
            toggleAB(sceneRef.current, "data-shake", "shakeAB")
        }
        toggleAB(glowRef.current, "data-pulse", "pulseAB")
        toggleAB(rushSqRef.current, "data-sq", "sqAB")
        // per-element toggle: a combo level that repeats must still replay its floater
        const boom = boomRefs.current[Math.min(V.taps, s.combo) - 1]
        if (boom) boom.setAttribute("data-pop", boom.getAttribute("data-pop") === "a" ? "b" : "a")
        // one scored step per eruption + haptic + boom (deeper with intensity; 9-10 climbs per tap)
        fire("clack")
        eosHaptic("hit")
        const f0 = k === 3 ? 66 * Math.pow(2, (s.taps * 2) / 12) : k === 2 ? 74 : 98
        eosTone(f0, k === 1 ? 260 : 380, { type: "triangle", gain: k === 1 ? 0.07 : 0.1, glide: f0 * 0.5 })
        eosTone(f0 * 2, 160, { type: "sine", gain: 0.035, glide: f0 })
        if (k === 3) eosTone(eosNote(s.taps + 4, 392), 140, { type: "triangle", gain: 0.03, at: 0.05 })
        // reduced motion / calm: the crater glow pulse is the visual answer (no particle burst)
        if (!calm && t - s.lastBurstAt >= V.burstGapMs) {
            const flying = s.slotBusy.filter((b) => b > t).length
            const big = k >= 2 && dt >= V.bigGapMs && flying <= 3
            s.lastBurstAt = t
            setBurst({ k: s.taps, x: (G.cx / G.W) * 100, y: (G.cy / G.H) * 100, big })
        }
        setTaps(s.taps)
        report(s.taps * 5, s.taps < V.taps ? "TAP THE CRATER" : "COOL IT SLOWLY")
        if (s.taps >= V.taps) {
            s.msAtA = Math.round(t - s.t0)
            s.act = "ab"
            setAct("ab")
            later(() => setAttr(rootRef.current, "data-clear", "1"), V.clearMs)
            later(startCool, V.bridgeMs)
        }
    }
    // One rock per free slot (least recently used first). A slot is free once its last rock has shattered, so
    // rocks that hang at the same time never share a slot. When every slot is busy the extra rocks are skipped
    // (the tap still gets boom, burst, glow, shake, sound); the 6th tap always launches one, re-using the slot
    // whose rock is youngest (still rising, not yet readable).
    function launchRocks(k, t, G, last) {
        const s = S.current
        const slots = G.slots || []
        const n = Math.min(slots.length, V.pool)
        if (!n) return
        const tier = G.phone ? 1 : k === 3 ? 1.2 : k === 2 ? 1.1 : 1
        const taken = []
        for (let j = 0; j < k; j++) {
            let best = -1
            for (let i = 0; i < n; i++) {
                if (taken.includes(i) || s.slotBusy[i] > t) continue
                if (best < 0 || s.slotUsed[i] < s.slotUsed[best]) best = i
            }
            if (best < 0) {
                if (!(last && j === 0)) {
                    s.skipped += 1
                    continue
                }
                for (let i = 0; i < n; i++) if (best < 0 || s.slotBusy[i] > s.slotBusy[best]) best = i
            }
            taken.push(best)
            const el = rockRefs.current[best]
            if (!el) continue
            const sl = slots[best]
            s.rockWord[best] = s.rocks % Math.max(1, words.length)
            s.rocks += 1
            s.slotBusy[best] = t + V.rockMs
            s.slotUsed[best] = t + j
            el.style.setProperty("--rx", `${Math.round(sl.x - G.cx)}px`)
            el.style.setProperty("--ry", `${Math.round(sl.y - G.launchY)}px`)
            el.style.setProperty("--rot", `${Math.round((eosNoise(s.rocks, 11) - 0.5) * 12)}deg`)
            el.style.setProperty("--s", String(tier))
            el.setAttribute("data-shard", k === 1 ? "1" : "0") // pseudo shards only on single-rock taps (node budget)
            el.setAttribute("data-fly", el.getAttribute("data-fly") === "a" ? "b" : "a")
        }
        // embers + plume pause while rocks fly (animated-node budget)
        s.busyUntil = Math.max(s.busyUntil, t + V.rockMs)
        setAttr(rootRef.current, "data-busy", "1")
        later(() => {
            if (eosVolcanoNow() >= S.current.busyUntil - 30) setAttr(rootRef.current, "data-busy", "0")
        }, V.rockMs + 40)
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
    const stopRain = () => {
        const s = S.current
        if (!s.rainOn) return
        s.rainOn = false
        try {
            P.current.rainSfx?.(0.05) // useRainSfx stops the active source before it starts the next one
        } catch {}
    }
    const setPhase = (phase, t) => {
        const s = S.current
        s.phase = phase
        s.phaseT0 = t
        s.cycle += 1
        const ms = phase === "in" ? V.inMs : V.outMs
        eosBreathOwn(phase, ms)
        s.owned = true
        setAttr(cloudRef.current, "data-breath", phase)
        setAttr(rootRef.current, "data-breath", phase)
        // the first full breath is spoken big in the hero slot; after that the small chip on the cloud carries it
        s.guide = s.cycle === 1 ? "in" : s.cycle === 2 ? "out" : ""
        setAttr(rootRef.current, "data-guide", s.guide)
        if (s.mode !== "mist") setAttr(cloudRef.current, "data-cue", phase)
        const recent = t - s.lastEngagedAt < 2500 || s.holding || s.keyHold
        if (phase === "out") {
            // the rain buffer is synthesised synchronously — never inside the rAF
            if (recent)
                later(() => {
                    if (S.current.act !== "b") return
                    S.current.rainOn = true
                    try {
                        P.current.rainSfx?.(V.outMs / 1000 + 0.2)
                    } catch {}
                }, 0)
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
        const dt = Math.min(1, Math.max(0, (t - s.lastT) / 1000)) // ≤ 1 s: a backgrounded tab never jumps
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
        // floor SCHEDULE: heat may never sit above a straight line from act-B start to coolEnd, which reaches 0
        const span = Math.max(1, s.coolEnd - s.coolT0)
        const floorHeat = s.coolHeat0 * eosClamp((s.coolEnd - t) / span, 0, 1)
        const before = s.heat
        let next = Math.min(s.heat - rate * dt, floorHeat)
        if (next < 0.05) next = 0
        s.heat = Math.max(0, Math.min(before, next))
        if (mode === "rain") s.slowCool += before - s.heat
        // RUSH co-regulates: a raindrop on its head when the cloud rains over it
        const G = s.L
        if (G && engaged && Math.abs(s.cloudX - G.rushX) < G.cw * 0.42 && t - s.lastDripAt > V.dripMs) {
            s.lastDripAt = t
            toggleAB(dripRef.current, "data-drip", "dripAB")
        }
        const h = s.heat / 100
        if ((Math.abs(h - s.hShown) >= 0.01 && t - s.hAt >= 90) || (h === 0 && s.hShown !== 0)) {
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
        s.coolT0 = t
        s.coolHeat0 = s.heat
        s.coolEnd = Math.max(s.t0 + V.deadline * 1000, t + V.minCoolS * 1000)
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
        s.drag = null
        releaseKeys()
        stopRain()
        eosBreathOwn(null)
        s.owned = false
        s.guide = ""
        const root = rootRef.current
        root?.style.setProperty("--h", "0")
        setAttr(root, "data-rain", "off")
        setAttr(root, "data-guide", "")
        setAttr(root, "data-eos-volc-heat", 0)
        setAttr(cloudRef.current, "data-cue", "off")
        // the cloud spins and drifts off toward the far side
        if (G) cloudRef.current?.style.setProperty("--byeX", `${s.cloudX < G.cx ? -190 : 190}px`)
        while (s.chimes < 5) {
            s.chimes += 1
            fire("chime")
        }
        setAct("c")
        setFace(V.faces.soft[variant])
        report(96, "WATCH IT BLOOM")
        fire("win")
        eosHaptic("finish")
        eosTone(eosNote(5, 392), 700, { type: "sine", gain: 0.05 })
        eosTone(eosNote(7, 392), 700, { type: "sine", gain: 0.04, at: 0.09 })
        eosTone(eosNote(9, 392), 900, { type: "sine", gain: 0.04, at: 0.18 })
        // beat 1: the last steam column leaves the crater (CSS). The one big gold burst is saved for RUSH's landing.
        // beats 2-3 (aurora, river blooms, petal spring) run in CSS on data-act="c"; beat 4: RUSH lands on the summit
        later(() => {
            const s2 = S.current
            s2.landed = true
            setFace(V.faces.laugh)
            setAttr(rootRef.current, "data-land", "1")
            eosHaptic("hit")
            eosTone(eosNote(9, 392), 240, { type: "triangle", gain: 0.045 })
            eosTone(eosNote(12, 392), 420, { type: "sine", gain: 0.035, at: 0.08 })
            eosTone(eosNote(14, 392), 520, { type: "sine", gain: 0.025, at: 0.2 })
            const G2 = s2.L
            if (G2) {
                const calm = P.current.red
                const x = calm ? G2.rushX : G2.cx
                const y = calm ? G2.rushY : G2.summitY
                setBurst({ k: 99, x: (x / G2.W) * 100, y: (y / G2.H) * 100, big: !calm })
            }
        }, P.current.red ? 1000 : V.landMs)
        // peak passed: hand the top band to the shared flip words, then finish
        later(() => {
            setAttr(rootRef.current, "data-hero", "off")
            report(100, "ENJOY THE CALM")
        }, V.bloomMs)
        later(() => {
            if (s.doneCalled) return
            s.doneCalled = true
            s.msDone = Math.round(eosVolcanoNow() - s.t0)
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
        if (s.act === "ab") {
            // the eruption is over, but an angry thumb keeps going: answer it (no progress, no scored sfx)
            s.bridgeTaps += 1
            fire("soft")
            eosTone(92 + (s.bridgeTaps % 4) * 8, 200, { type: "triangle", gain: 0.05, glide: 60 })
            eosHaptic("touch")
            toggleAB(glowRef.current, "data-pulse", "pulseAB")
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
    function releaseKeys() {
        const s = S.current
        s.keyHold = false
        s.keyDir = 0
        s.keyRainUntil = 0
        s.keyGlideUntil = 0
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
    const nextIdx = S.current.rocks % Math.max(1, words.length)
    const cueLive =
        act === "a"
            ? "Volcano. Tap the crater six times to erupt."
            : act === "ab"
              ? "Now watch it cool."
              : act === "b"
                ? "Rain cloud. Drag it slowly over the lava, or press and hold it. Breathe in as it gathers, out as it rains."
                : "Cooled to zero. The volcano is a garden and RUSH is laughing on top."
    const flow = act === "a" ? Math.max(0.08, taps / V.taps) : 1
    const rootStyle = G ? { "--cw": `${G.cw}px`, "--ch": `${G.ch}px`, "--rockMax": `${G.rockMax}px` } : {}
    const nSlots = G ? Math.min(V.pool, G.slots.length) : 0
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
                        <div className="eosVolcAurora" style={{ top: G.auroraY, height: G.auroraH }} aria-hidden="true">
                            <i />
                            <i />
                        </div>
                        <svg className="eosVolcRidge" viewBox="0 0 1000 200" preserveAspectRatio="none" style={{ top: G.cy - G.mh * 0.08, height: G.H - G.cy + G.mh * 0.08 }} aria-hidden="true">
                            <path className="eosVolcRidgeFar" d="M0,120 C120,60 220,100 320,70 C420,40 520,96 640,64 C760,34 880,90 1000,58 L1000,200 L0,200 Z" />
                            <path className="eosVolcRidgeNear" d="M0,160 C140,110 260,150 380,122 C520,92 640,150 780,118 C880,96 950,128 1000,110 L1000,200 L0,200 Z" />
                        </svg>
                        <div className="eosVolcPlume" style={{ left: G.cx, top: G.cy }} aria-hidden="true">
                            <i />
                            <i />
                            <i />
                        </div>
                        <div className="eosVolcSteamCol" style={{ left: G.cx, top: G.cy, height: Math.max(80, G.cy - G.auroraY - G.auroraH * 0.3) }} aria-hidden="true" />
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
                        <svg className="eosVolcMtn" viewBox="0 0 1000 620" preserveAspectRatio="none" style={{ left: G.mx, top: G.my, width: G.mw, height: G.mh, "--eosVolcFlow": flow }} aria-hidden="true">
                            <defs>
                                <linearGradient id={`eosVolcRock${uid}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor="#3b1a2a" />
                                    <stop offset="0.5" stopColor="#1e0a18" />
                                    <stop offset="1" stopColor="#0c040b" />
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
                                <linearGradient id={`eosVolcMeadow${uid}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor="#9ff0b8" />
                                    <stop offset="0.35" stopColor="#4fcf86" />
                                    <stop offset="1" stopColor="#1d6b52" />
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
                            <path className="eosVolcMeadow" d={paths.body} fill={`url(#eosVolcMeadow${uid})`} />
                            {paths.strata.map((d, i) => (
                                <path key={`s${i}`} className="eosVolcStrata" d={d} />
                            ))}
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
                            <ellipse className="eosVolcSpring" cx="500" cy="74" rx="70" ry="15" />
                        </svg>
                        <div ref={glowRef} className="eosVolcGlow" data-pulse="" style={{ left: G.cx, top: G.cy, width: G.craterW * 1.6, height: G.craterW * 1.1 }} aria-hidden="true" />
                        <div className="eosVolcLoadWrap" style={{ left: G.cx, top: G.loadY }} aria-hidden="true">
                            {words.map((w, i) => (
                                <div key={i} className="eosVolcLoad" data-on={act === "a" && left > 0 && i === nextIdx ? "1" : "0"}>
                                    <EosWord text={w} />
                                </div>
                            ))}
                        </div>
                        <div className="eosVolcPips" style={{ left: G.cx, top: G.pipsY }} aria-hidden="true">
                            {Array.from({ length: V.taps }, (_, i) => (
                                <i key={i} className={i < taps ? "on" : ""} />
                            ))}
                        </div>
                        <div className="eosVolcGarden" aria-hidden="true" style={{ left: G.mx, top: G.my, width: G.mw, height: G.mh }}>
                            {paths.blooms.map((f) => (
                                <i
                                    key={f.d}
                                    className="eosVolcFlower"
                                    style={{ left: `${f.u * 100}%`, top: `${f.v * 100}%`, "--d": f.d, "--fh": f.hue, "--fs": `${G.phone ? 44 + f.z * 6 : 54 + f.z * 7}px` }}
                                >
                                    <b />
                                </i>
                            ))}
                        </div>
                        <div className="eosVolcFountain" style={{ left: G.cx, top: G.cy }} aria-hidden="true">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <i key={i} style={{ "--i": i, "--fx": `${Math.round((i / 5 - 0.5) * (G.phone ? 120 : 170))}px`, "--ph": EOS_VOLCANO_HUES[(i * 3) % EOS_VOLCANO_HUES.length] }} />
                            ))}
                        </div>
                        <div className="eosVolcPuffs" aria-hidden="true">
                            {Array.from({ length: V.puffs }, (_, i) => (
                                <i key={i} ref={(el) => (puffRefs.current[i] = el)} className="eosVolcPuff" data-puff="" />
                            ))}
                        </div>
                        <div className="eosVolcRush" style={{ left: G.rushX, top: G.rushY, "--rs": `${G.rushSize}px` }} aria-hidden="true">
                            <div className="eosVolcRushHop" style={{ "--hx": `${Math.round(G.cx - G.rushX)}px`, "--hy": `${Math.round(G.summitY - G.rushY)}px`, "--rsc": G.rushScale }}>
                                <i className="eosVolcRushKey" />
                                <i className="eosVolcRushRim" />
                                <div className="eosVolcRushSteam">
                                    <i />
                                    <i />
                                </div>
                                <i ref={dripRef} className="eosVolcDrip" data-drip="" />
                                <div className="eosVolcRushBreath">
                                    <div ref={rushSqRef} className="eosVolcRushSq" data-sq="">
                                        <EosCharacterOrb char="rush" mood={face} size={G.rushSize} bob={!red} reduced={red} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="eosVolcRocks" aria-hidden="true">
                            {Array.from({ length: V.pool }, (_, i) => {
                                const wi = S.current.rockWord[i] % Math.max(1, words.length)
                                return (
                                    <div key={i} ref={(el) => (rockRefs.current[i] = el)} className="eosVolcRock" data-fly="" data-shard="0" data-slot={i < nSlots ? "1" : "0"} style={{ left: G.cx, top: G.launchY }}>
                                        <div className="eosVolcRockY">
                                            <div className="eosVolcRockBody">
                                                {thumbs.length ? <img className="eosVolcRockImg" src={thumbs[wi % thumbs.length]} alt="" draggable={false} /> : null}
                                                <EosWord text={words[wi]} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="eosVolcFx" aria-hidden="true">
                            {burst && typeof PremiumBurst === "function" ? <PremiumBurst key={burst.k} x={burst.x} y={burst.y} tone="gold" big={!!burst.big} /> : null}
                        </div>
                        <button
                            ref={craterRef}
                            type="button"
                            className="eosVolcCrater"
                            style={{ left: G.cx, top: G.craterY, width: G.craterW, height: G.craterH }}
                            aria-label={act === "a" ? `Volcano crater. Tap to erupt — ${left} to go.` : "Volcano crater"}
                            tabIndex={act === "a" ? 0 : -1}
                            onKeyDown={onCraterKey}
                            onClick={onCraterClick}
                            {...(act === "a" && left > 0 ? eosTarget({ g: "taps", n: left, oy: -0.25, label: `ERUPT IT! ×${left}` }) : {})}
                        >
                            <span className="eosVolcCraterRing" />
                        </button>
                        <div className="eosVolcBooms" style={{ left: G.boomX, top: G.boomY }} aria-hidden="true">
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
                            data-on={act === "b" || act === "c" ? "1" : "0"}
                            data-breath="in"
                            data-cue="in"
                            data-sq=""
                            style={{ top: G.cloudY - G.ch / 2, width: G.cw, height: G.ch }}
                            tabIndex={act === "b" ? 0 : -1}
                            aria-hidden={act === "b" ? undefined : "true"}
                            aria-label="Rain cloud. Drag it slowly left and right over the lava, or press and hold to rain. Arrow keys move it, Space rains."
                            onKeyDown={onCloudKeyDown}
                            onKeyUp={onCloudKeyUp}
                            onBlur={releaseKeys}
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
                            {act === "b" ? (
                                <>
                                    <span className="eosVolcCue in">in…</span>
                                    <span className="eosVolcCue out">out…</span>
                                    <span className="eosVolcCue slow">slower… 🐢</span>
                                </>
                            ) : null}
                        </button>
                        {/* hero copy is mounted only in its act: hidden text would still steer the arrow's label placement */}
                        <div className="eosVolcHero mid" style={{ top: G.heroMidY }} aria-hidden="true">
                            {act === "ab" ? <span className="h1">Now watch it cool…</span> : null}
                        </div>
                        <div className="eosVolcHero top" style={{ top: G.heroTopY }} aria-hidden="true">
                            {act === "b" ? (
                                <>
                                    <span className="gi">Breathe in…</span>
                                    <span className="go">…and out</span>
                                </>
                            ) : null}
                            {act === "c" ? <span className="h2">Cooled to zero</span> : null}
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
${EOS_VOLCANO_P}{--h:1;background:#14061a;cursor:default}
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
${EOS_VOLCANO_P} .eosVolcRidgeFar{fill:#4a1230;opacity:.85}
${EOS_VOLCANO_P} .eosVolcRidgeNear{fill:#1c0716}
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
${EOS_VOLCANO_P}[data-busy="1"] :is(.eosVolcEmbers i,.eosVolcPlume i){animation-play-state:paused}
${EOS_VOLCANO_P}[data-act="c"] :is(.eosVolcEmbers,.eosVolcPlume){display:none}
${EOS_VOLCANO_P} .eosVolcRain{position:absolute;left:0;z-index:3;height:200px;opacity:0;transition:opacity .45s ease;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 14%,#000 100%);mask-image:linear-gradient(180deg,transparent 0,#000 14%,#000 100%)}
${EOS_VOLCANO_P}[data-rain="drizzle"] .eosVolcRain{opacity:.42}
${EOS_VOLCANO_P}[data-rain="rain"] .eosVolcRain{opacity:1}
${EOS_VOLCANO_P}[data-rain="mist"] .eosVolcRain{opacity:.55}
${EOS_VOLCANO_P} .eosVolcRainBreath{position:absolute;inset:0;opacity:.55;transition:opacity 4s ease-in-out}
${EOS_VOLCANO_P}[data-breath="out"] .eosVolcRainBreath{opacity:1;transition:opacity .8s ease-out}
${EOS_VOLCANO_P} .eosVolcRainA,${EOS_VOLCANO_P} .eosVolcRainB{position:absolute;inset:0;background-image:repeating-linear-gradient(100deg,rgba(190,240,255,0) 0 14px,rgba(190,240,255,.85) 14px 16px,rgba(190,240,255,0) 16px 30px);background-size:30px 46px}
${EOS_VOLCANO_P}[data-act="b"] :is(.eosVolcRainA,.eosVolcRainB){animation:eosVolcanoRain .42s linear infinite}
${EOS_VOLCANO_P} .eosVolcRainB{background-image:repeating-linear-gradient(100deg,rgba(150,225,255,0) 0 20px,rgba(150,225,255,.55) 20px 21.5px,rgba(150,225,255,0) 21.5px 41px);background-size:41px 70px;opacity:.8}
${EOS_VOLCANO_P}[data-act="b"] .eosVolcRainB{animation-duration:.6s}
${EOS_VOLCANO_P}[data-rain="mist"] :is(.eosVolcRainA,.eosVolcRainB){opacity:.15}
${EOS_VOLCANO_P} .eosVolcMist{position:absolute;left:-30%;right:-30%;top:0;height:70%;border-radius:50%;background:radial-gradient(closest-side,rgba(230,248,255,.55),rgba(230,248,255,0));opacity:0;transition:opacity .4s ease}
${EOS_VOLCANO_P}[data-rain="mist"] .eosVolcMist{opacity:1}
${EOS_VOLCANO_P} .eosVolcMtn{position:absolute;z-index:4;overflow:visible;transition:--eosVolcFlow .7s cubic-bezier(.2,.8,.2,1)}
${EOS_VOLCANO_P} .eosVolcHeatGlow{opacity:var(--h)}
${EOS_VOLCANO_P} .eosVolcCoolLight{opacity:calc(1 - var(--h))}
${EOS_VOLCANO_P} .eosVolcRimHot{fill:none;stroke:#ff9a3d;stroke-width:5;stroke-linejoin:round;opacity:calc(var(--h) * .85)}
${EOS_VOLCANO_P} .eosVolcRimCool{fill:none;stroke:#8ff3ea;stroke-width:4;stroke-linejoin:round;opacity:calc((1 - var(--h)) * .8)}
${EOS_VOLCANO_P} .eosVolcFlow{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1;stroke-dashoffset:calc(1 - var(--eosVolcFlow,.08))}
${EOS_VOLCANO_P} .eosVolcObsidian{stroke:#38343f;stroke-width:21}
${EOS_VOLCANO_P} .eosVolcLavaGlow{stroke:rgba(255,96,30,.34);stroke-width:42;opacity:var(--h)}
${EOS_VOLCANO_P} .eosVolcLavaHot{stroke-width:17;opacity:clamp(0,calc(var(--h) * 1.6),1)}
${EOS_VOLCANO_P} .eosVolcLavaCore{stroke:#ffe08a;stroke-width:5;opacity:clamp(0,calc((var(--h) - .45) * 2.2),1)}
${EOS_VOLCANO_P} .eosVolcStrata{fill:none;stroke:rgba(255,190,150,.07);stroke-width:5;stroke-linecap:round}
${EOS_VOLCANO_P} .eosVolcCrack{fill:none;stroke:#8ff3ea;stroke-width:3;stroke-linecap:round;stroke-dasharray:.006 .045 .012 .03;opacity:calc((1 - var(--h)) * .5);transition:opacity .8s ease,stroke .8s ease,stroke-width .8s ease}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcCrack{opacity:1;stroke:#ffe58a;stroke-width:7;stroke-dasharray:0 .06;filter:drop-shadow(0 0 5px #ffb23e)}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcObsidian{stroke:#1f6b4c;transition:stroke 1s ease}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcStrata{stroke:rgba(255,255,255,.12)}
${EOS_VOLCANO_P} .eosVolcPoolCool{fill:#2c2833}
${EOS_VOLCANO_P} .eosVolcPoolHot{opacity:var(--h)}
${EOS_VOLCANO_P} .eosVolcSpring{fill:#7ff0e0;opacity:0;filter:drop-shadow(0 0 10px #ffe58a);transition:opacity 1s ease .9s}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcSpring{opacity:.95}
${EOS_VOLCANO_P} .eosVolcGlow{position:absolute;z-index:5;translate:-50% -50%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,214,120,.95),rgba(255,110,40,.55) 45%,rgba(215,38,61,0));opacity:calc(var(--h) * .9)}
${EOS_VOLCANO_P} .eosVolcGlow[data-pulse="a"]{animation:eosVolcanoGlowA .5s ease-out}
${EOS_VOLCANO_P} .eosVolcGlow[data-pulse="b"]{animation:eosVolcanoGlowB .5s ease-out}
${EOS_VOLCANO_P} .eosVolcLoadWrap{position:absolute;z-index:6;width:0;height:0}
${EOS_VOLCANO_P} .eosVolcLoad{position:absolute;left:0;top:0;translate:-50% 0;opacity:0;scale:.6;transform-origin:50% 0;transition:opacity .18s ease,scale .25s cubic-bezier(.3,1.6,.4,1);width:max-content;max-width:min(170px,calc(var(--rockMax,170px) + 50px));box-sizing:border-box;padding:7px 14px 8px;border-radius:46% 54% 44% 56%/58% 46% 54% 42%;text-align:center;background:radial-gradient(circle at 30% 25%,#6b3a3a,#2a1422 70%);box-shadow:inset 0 -5px 10px rgba(255,120,40,.55),0 0 18px rgba(255,120,40,.6)}
${EOS_VOLCANO_P} .eosVolcLoad[data-on="1"]{opacity:1;scale:1;animation:eosVolcanoLoad 1.4s ease-in-out infinite}
${EOS_VOLCANO_P} .eosVolcPips{position:absolute;z-index:6;display:flex;gap:7px;translate:-50% -50%}
${EOS_VOLCANO_P} .eosVolcPips i{width:13px;height:13px;border-radius:50%;background:rgba(30,10,24,.85);box-shadow:inset 0 0 0 2px rgba(255,150,80,.55);transition:background .2s ease,box-shadow .2s ease,scale .25s cubic-bezier(.3,1.6,.4,1)}
${EOS_VOLCANO_P} .eosVolcPips i.on{background:radial-gradient(circle at 40% 35%,#fff3b0,#ff9a2e 55%,#d7263d);box-shadow:0 0 10px #ff8a2e;scale:1.15}
${EOS_VOLCANO_P}[data-act="b"] .eosVolcPips,${EOS_VOLCANO_P}[data-act="c"] .eosVolcPips{opacity:0;transition:opacity .6s ease}
${EOS_VOLCANO_P} .eosVolcGarden{position:absolute;z-index:7}
${EOS_VOLCANO_P} .eosVolcFlower{position:absolute;width:var(--fs);height:var(--fs);translate:-50% -100%;transform-origin:50% 100%;scale:0;opacity:0}
${EOS_VOLCANO_P} .eosVolcFlower::before{content:"";position:absolute;left:50%;bottom:0;width:4px;height:40%;margin-left:-2px;border-radius:3px;background:linear-gradient(#5fd38d,#2a8f5a)}
${EOS_VOLCANO_P} .eosVolcFlower b{position:absolute;left:50%;top:0;width:74%;height:74%;translate:-50% 0;border-radius:50%;background:radial-gradient(circle,#fff6c2 0 22%,#ffcf4a 23% 30%,transparent 31%),radial-gradient(circle at 50% 12%,hsl(var(--fh),95%,72%) 0 22%,transparent 23%),radial-gradient(circle at 88% 40%,hsl(var(--fh),95%,68%) 0 22%,transparent 23%),radial-gradient(circle at 74% 86%,hsl(var(--fh),92%,64%) 0 22%,transparent 23%),radial-gradient(circle at 26% 86%,hsl(var(--fh),92%,64%) 0 22%,transparent 23%),radial-gradient(circle at 12% 40%,hsl(var(--fh),95%,68%) 0 22%,transparent 23%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcFlower{animation:eosVolcanoBloom .62s cubic-bezier(.3,1.5,.4,1) both;animation-delay:calc(.5s + var(--d) * 60ms)}
${EOS_VOLCANO_P} .eosVolcMeadow{opacity:0;transition:opacity 1.2s ease}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcMeadow{opacity:.92}
${EOS_VOLCANO_P} .eosVolcPuffs{position:absolute;inset:0;z-index:8}
${EOS_VOLCANO_P} .eosVolcPuff{position:absolute;width:46px;height:40px;margin:-20px 0 0 -23px;border-radius:50%;background:radial-gradient(circle at 45% 40%,rgba(255,255,255,.85),rgba(230,240,250,.45) 50%,rgba(230,240,250,0) 72%);opacity:0}
${EOS_VOLCANO_P} .eosVolcPuff[data-puff="a"]{animation:eosVolcanoPuffA 1.5s ease-out both}
${EOS_VOLCANO_P} .eosVolcPuff[data-puff="b"]{animation:eosVolcanoPuffB 1.5s ease-out both}
${EOS_VOLCANO_P} .eosVolcRush{position:absolute;z-index:9;width:var(--rs);height:var(--rs);translate:-50% -50%}
${EOS_VOLCANO_P}[data-land="1"] .eosVolcRush{animation:eosVolcanoLaugh .5s ease-in-out infinite alternate}
${EOS_VOLCANO_P} .eosVolcRushHop{position:absolute;inset:0;transform-origin:50% 100%}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcRushHop{animation:eosVolcanoHop .95s cubic-bezier(.45,0,.35,1) 1.2s both}
${EOS_VOLCANO_P} .eosVolcRushBreath{position:relative;transform-origin:50% 100%;transition:scale 1s ease}
${EOS_VOLCANO_P}[data-act="b"][data-breath="in"] .eosVolcRushBreath{scale:1.1 1.13;transition:scale 4s ease-in-out}
${EOS_VOLCANO_P}[data-act="b"][data-breath="out"] .eosVolcRushBreath{scale:1.05 .92;transition:scale 6s ease-in-out}
${EOS_VOLCANO_P} .eosVolcRushSteam{position:absolute;left:50%;top:0;width:0;height:0;opacity:0;transition:opacity .8s ease}
${EOS_VOLCANO_P}[data-act="b"] .eosVolcRushSteam{opacity:calc(.25 + (1 - var(--h)) * .65)}
${EOS_VOLCANO_P} .eosVolcRushSteam i{position:absolute;left:-11px;top:-30px;width:22px;height:30px;border-radius:50%;background:radial-gradient(circle at 50% 60%,rgba(255,255,255,.9),rgba(230,245,255,.4) 55%,rgba(230,245,255,0) 72%);opacity:0}
${EOS_VOLCANO_P} .eosVolcRushSteam i:nth-child(2){left:2px;top:-26px;width:18px;height:24px}
${EOS_VOLCANO_P}[data-act="b"] .eosVolcRushSteam i{animation:eosVolcanoWisp 2s ease-out infinite}
${EOS_VOLCANO_P}[data-act="b"] .eosVolcRushSteam i:nth-child(2){animation-delay:-1s}
${EOS_VOLCANO_P} .eosVolcDrip{position:absolute;left:56%;top:-14%;width:10px;height:13px;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;background:linear-gradient(#f2fdff,#7fd8f0);box-shadow:0 0 6px rgba(127,216,240,.8);opacity:0;z-index:2}
${EOS_VOLCANO_P} .eosVolcDrip[data-drip="a"]{animation:eosVolcanoDripA .75s ease-in both}
${EOS_VOLCANO_P} .eosVolcDrip[data-drip="b"]{animation:eosVolcanoDripB .75s ease-in both}
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
${EOS_VOLCANO_P} .eosVolcRockBody{position:absolute;left:0;top:0;translate:-50% -50%;display:flex;align-items:center;justify-content:center;gap:6px;width:max-content;max-width:var(--rockMax,190px);min-width:64px;padding:9px 16px 10px;text-align:center;opacity:0;box-sizing:border-box;border-radius:46% 54% 44% 56%/58% 46% 54% 42%;background:radial-gradient(circle at 70% 78%,rgba(255,120,40,.6),rgba(255,120,40,0) 40%),radial-gradient(circle at 30% 24%,#7a4646,#3a1d2a 62%,#1f0d18);box-shadow:inset 0 -6px 12px rgba(255,110,40,.55),inset 0 4px 8px rgba(255,220,180,.18),0 0 22px rgba(255,110,40,.55),0 8px 16px rgba(0,0,0,.4)}
${EOS_VOLCANO_P} .eosVolcRockBody::before,${EOS_VOLCANO_P} .eosVolcRockBody::after{content:"";position:absolute;left:50%;top:50%;width:16px;height:13px;margin:-6px 0 0 -8px;border-radius:3px 7px 2px 6px;background:#4a2630;box-shadow:inset 0 -3px 4px rgba(255,140,50,.8),0 0 8px rgba(255,120,40,.7);opacity:0;--sx:-54px;--sy:-30px}
${EOS_VOLCANO_P} .eosVolcRockBody::after{--sx:58px;--sy:26px;width:12px;height:11px}
${EOS_VOLCANO_P}[data-phone="1"] .eosVolcRockBody{padding:8px 11px 9px;gap:4px}
${EOS_VOLCANO_P}[data-clear="1"] .eosVolcRocks{opacity:0;transition:opacity .2s ease}
${EOS_VOLCANO_P} .eosVolcRock:is([data-slot="0"],[data-fly=""]){display:none}
${EOS_VOLCANO_P} .eosVolcRockImg{width:30px;height:30px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,200,140,.8)}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="a"]{animation:eosVolcanoFlyA 1.6s linear both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="b"]{animation:eosVolcanoFlyB 1.6s linear both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="a"] .eosVolcRockBody{animation:eosVolcanoBodyA 1.6s ease both}
${EOS_VOLCANO_P} .eosVolcRock[data-fly="b"] .eosVolcRockBody{animation:eosVolcanoBodyB 1.6s ease both}
${EOS_VOLCANO_P} .eosVolcRock[data-shard="1"][data-fly="a"] .eosVolcRockBody::before,${EOS_VOLCANO_P} .eosVolcRock[data-shard="1"][data-fly="a"] .eosVolcRockBody::after{animation:eosVolcanoShardA 1.6s ease-out both}
${EOS_VOLCANO_P} .eosVolcRock[data-shard="1"][data-fly="b"] .eosVolcRockBody::before,${EOS_VOLCANO_P} .eosVolcRock[data-shard="1"][data-fly="b"] .eosVolcRockBody::after{animation:eosVolcanoShardB 1.6s ease-out both}
${EOS_VOLCANO_P} .eosVolcFx{position:absolute;inset:0;z-index:11}
${EOS_VOLCANO_P} .eosVolcCrater{position:absolute;z-index:12;translate:-50% -50%;border-radius:50%!important;touch-action:none}
${EOS_VOLCANO_P} .eosVolcCraterRing{position:absolute;inset:4px;border-radius:50%;border:3px solid rgba(255,214,120,.0);box-shadow:0 0 0 0 rgba(255,180,80,0)}
${EOS_VOLCANO_P}[data-act="a"] .eosVolcCraterRing{border-color:rgba(255,220,140,.55);animation:eosVolcanoRing 1.6s ease-in-out infinite}
${EOS_VOLCANO_P} .eosVolcBooms{position:absolute;z-index:14;width:0;height:0}
${EOS_VOLCANO_P} .eosVolcBoom{position:absolute;left:0;top:0;translate:-50% -50%;white-space:nowrap;font:900 28px/1 var(--eos-font);letter-spacing:.02em;color:#fff3b0;text-shadow:0 3px 0 #8a2300,0 0 16px rgba(255,120,30,.85);opacity:0}
${EOS_VOLCANO_P}[data-phone="1"] .eosVolcBoom{font-size:22px}
${EOS_VOLCANO_P} .eosVolcBoom[data-pop="a"]{animation:eosVolcanoBoomA .75s ease-out both}
${EOS_VOLCANO_P} .eosVolcBoom[data-pop="b"]{animation:eosVolcanoBoomB .75s ease-out both}
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
${EOS_VOLCANO_P} .eosVolcHero{position:absolute;z-index:14;left:50%;width:0;height:0}
${EOS_VOLCANO_P} .eosVolcHero span{position:absolute;left:0;top:0;translate:-50% 0;white-space:nowrap;font:900 var(--eos-fs-hero)/1.05 var(--eos-font);color:#fff;text-shadow:0 3px 0 rgba(20,10,40,.55),0 0 22px rgba(79,209,232,.55);opacity:0;transition:opacity .45s ease}
${EOS_VOLCANO_P}[data-phone="1"] .eosVolcHero span{font-size:30px}
${EOS_VOLCANO_P} .eosVolcHero .h1{animation:eosVolcanoHeroIn .4s ease 1.45s both}
${EOS_VOLCANO_P}[data-guide="in"] .eosVolcHero .gi,${EOS_VOLCANO_P}[data-guide="out"] .eosVolcHero .go{opacity:1;transition:opacity .9s ease}
${EOS_VOLCANO_P}[data-guide="in"] .eosVolcCloud .eosVolcCue:not(.slow),${EOS_VOLCANO_P}[data-guide="out"] .eosVolcCloud .eosVolcCue:not(.slow){opacity:0!important}
${EOS_VOLCANO_P} .eosVolcHero .h2{background:linear-gradient(180deg,#fff7c8,#ffd04a 55%,#ff9a2e);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 3px 0 rgba(90,30,0,.45)) drop-shadow(0 0 14px rgba(255,190,80,.45))}
${EOS_VOLCANO_P} .eosVolcHero .h2{animation:eosVolcanoHeroIn .5s ease .3s both}
${EOS_VOLCANO_P}[data-hero="off"] .eosVolcHero .h2{animation:eosVolcanoHeroOut .4s ease both}
/* act C finale: steam column → aurora, petal spring, cloud spin + drift */
${EOS_VOLCANO_P} .eosVolcAurora{position:absolute;left:-8%;right:-8%;z-index:2;opacity:0;pointer-events:none}
${EOS_VOLCANO_P} .eosVolcAurora i{position:absolute;left:0;right:0;border-radius:50%;filter:blur(7px);transform-origin:50% 100%;opacity:0}
${EOS_VOLCANO_P} .eosVolcAurora i:nth-child(1){top:6%;height:48%;background:linear-gradient(90deg,transparent 3%,rgba(79,209,232,.8) 22%,rgba(159,240,184,.85) 42%,rgba(255,214,90,.85) 62%,rgba(255,154,213,.7) 80%,transparent 97%)}
${EOS_VOLCANO_P} .eosVolcAurora i:nth-child(2){top:46%;height:34%;background:linear-gradient(90deg,transparent 6%,rgba(255,229,138,.75) 30%,rgba(127,240,224,.75) 62%,transparent 94%)}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcAurora{opacity:1;transition:opacity .6s ease .45s}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcAurora i{animation:eosVolcanoAurora 1.5s cubic-bezier(.2,.8,.2,1) .5s both,eosVolcanoWave 3s ease-in-out 2s infinite alternate}
${EOS_VOLCANO_P} .eosVolcSteamCol{position:absolute;z-index:3;width:96px;translate:-50% -100%;transform-origin:50% 100%;border-radius:48% 48% 40% 40%/30% 30% 70% 70%;background:linear-gradient(0deg,rgba(255,255,255,.85),rgba(226,246,255,.55) 45%,rgba(226,246,255,0));filter:blur(5px);opacity:0;pointer-events:none}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcSteamCol{animation:eosVolcanoSteam 1.5s ease-out both}
${EOS_VOLCANO_P} .eosVolcFountain{position:absolute;z-index:8;width:0;height:0;pointer-events:none}
${EOS_VOLCANO_P} .eosVolcFountain i{position:absolute;left:-7px;top:-7px;width:14px;height:12px;border-radius:60% 40% 60% 40%;background:radial-gradient(circle at 35% 35%,#fffbe0,hsl(var(--ph),92%,70%) 60%);box-shadow:0 0 8px hsla(var(--ph),95%,70%,.8);opacity:0}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcFountain i{animation:eosVolcanoPetal 1.5s cubic-bezier(.2,.7,.4,1) infinite;animation-delay:calc(1s + var(--i) * .25s)}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcCloud{pointer-events:none}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcCloud .eosVolcCloudIn{animation:eosVolcanoCloudBye 2.4s cubic-bezier(.4,0,.2,1) .15s both}
${EOS_VOLCANO_P}[data-act="c"] .eosVolcCloud .eosVolcEye{scale:1 .3}
/* the wrapper's reward pills: never on the crater (act A) or the cloud (act B); the finish card below the summit */
${EOS_A} :has(>.eosG112)>.globalStepFeedbackCopy{--fx-x:var(--eosVolcPillX,50%)!important;--fx-y:var(--eosVolcPillY,70%)!important}
${EOS_A} :has(>.eosG112)>.globalFinishFeedbackCopy{top:var(--eosVolcFinY,66%)!important}
${EOS_VOLCANO_P} .eosWord{font-size:var(--eos-fs-word)!important;max-width:none!important;white-space:normal!important;overflow-wrap:break-word!important}
/* reduced motion / calm visuals: no shake, no travel (rocks fade in place), rain is an opacity pulse */
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcScene[data-shake]{animation:none!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRock[data-fly]{animation:none!important;translate:var(--rx,0) var(--ry,0)}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRock[data-fly="a"] .eosVolcRockBody{animation:eosVolcanoFadeA 1.6s ease both!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRock[data-fly="b"] .eosVolcRockBody{animation:eosVolcanoFadeB 1.6s ease both!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRockBody::before,${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRockBody::after{animation:none!important;opacity:0}
${EOS_VOLCANO_P}[data-calm="1"] :is(.eosVolcRainA,.eosVolcRainB){animation:none!important}
${EOS_VOLCANO_P}[data-calm="1"] :is(.eosVolcPlume i,.eosVolcLoad,.eosVolcCraterRing,.eosVolcRush,.eosVolcRushSq,.eosVolcCloudIn){animation:none!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcEmbers{display:none}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcCloudBody{scale:1!important;transition:filter .6s ease}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcCloud[data-breath="out"] .eosVolcCloudBody{filter:brightness(1.12)}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcPuff[data-puff]{animation:eosVolcanoFadeA 1.5s ease both!important}
${EOS_VOLCANO_P}[data-calm="1"][data-act="c"] .eosVolcFlower{animation:eosVolcanoFadeIn .8s ease both!important;animation-delay:calc(.4s + var(--d) * 40ms)!important;scale:1}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcMtn{transition:none}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcHero :is(.h1,.h2){translate:-50% 0}
${EOS_VOLCANO_P}[data-calm="1"] :is(.eosVolcRushSteam i,.eosVolcFountain i,.eosVolcDrip){animation:none!important}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcFountain{display:none}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRushSteam i{opacity:.6}
${EOS_VOLCANO_P}[data-calm="1"] .eosVolcRushBreath{scale:1!important;transition:filter .8s ease}
${EOS_VOLCANO_P}[data-calm="1"][data-act="b"][data-breath="out"] .eosVolcRushBreath{filter:brightness(1.1)}
${EOS_VOLCANO_P}[data-calm="1"][data-act="c"] .eosVolcRushHop{animation:eosVolcanoHopCalm 1s linear .9s both!important}
${EOS_VOLCANO_P}[data-calm="1"][data-land="1"] .eosVolcRush{animation:none!important}
${EOS_VOLCANO_P}[data-calm="1"][data-act="c"] .eosVolcAurora i{animation:none!important;opacity:1}
${EOS_VOLCANO_P}[data-calm="1"][data-act="c"] .eosVolcSteamCol{animation:eosVolcanoFadeA 1.5s ease both!important}
${EOS_VOLCANO_P}[data-calm="1"][data-act="c"] .eosVolcCloud .eosVolcCloudIn{animation:eosVolcanoFadeOut 1.2s ease .2s both!important}
@media (prefers-reduced-motion:reduce){${EOS_VOLCANO_P} .eosVolcScene[data-shake]{animation:none!important}${EOS_VOLCANO_P} .eosVolcEmbers{display:none}}
@property --eosVolcFlow{syntax:"<number>";inherits:true;initial-value:.08}
@keyframes eosVolcanoShakeA{0%,100%{translate:0 0}20%{translate:-6px 2px}40%{translate:6px -2px}60%{translate:-4px 1px}80%{translate:3px 0}}
@keyframes eosVolcanoShakeB{0%,100%{translate:0 0}20%{translate:6px -2px}40%{translate:-6px 2px}60%{translate:4px -1px}80%{translate:-3px 0}}
/* one layer per rock: the arc is sampled (x eases slower than y), then a slow float while it hangs */
@keyframes eosVolcanoFlyA{0%{translate:0 0}12%{translate:calc(var(--rx) * .39) calc(var(--ry) * .52)}25%{translate:calc(var(--rx) * .7) calc(var(--ry) * .84)}40%{translate:calc(var(--rx) * .93) calc(var(--ry) * .98)}55%{translate:var(--rx) var(--ry);animation-timing-function:ease-in-out}100%{translate:calc(var(--rx) * 1.03) calc(var(--ry) - 12px)}}
@keyframes eosVolcanoFlyB{0%{translate:0 0}12%{translate:calc(var(--rx) * .39) calc(var(--ry) * .52)}25%{translate:calc(var(--rx) * .7) calc(var(--ry) * .84)}40%{translate:calc(var(--rx) * .93) calc(var(--ry) * .98)}55%{translate:var(--rx) var(--ry);animation-timing-function:ease-in-out}100%{translate:calc(var(--rx) * 1.03) calc(var(--ry) - 12px)}}
@keyframes eosVolcanoBodyA{0%{opacity:0;scale:.3;rotate:0deg}8%{opacity:1}55%{scale:var(--s);rotate:var(--rot)}62%{scale:calc(var(--s) * 1.08) calc(var(--s) * .92)}70%{scale:var(--s)}82%{opacity:1;scale:var(--s);rotate:var(--rot)}100%{opacity:0;scale:calc(var(--s) * 1.12);rotate:var(--rot)}}
@keyframes eosVolcanoBodyB{0%{opacity:0;scale:.3;rotate:0deg}8%{opacity:1}55%{scale:var(--s);rotate:var(--rot)}62%{scale:calc(var(--s) * 1.08) calc(var(--s) * .92)}70%{scale:var(--s)}82%{opacity:1;scale:var(--s);rotate:var(--rot)}100%{opacity:0;scale:calc(var(--s) * 1.12);rotate:var(--rot)}}
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
@keyframes eosVolcanoLoad{0%,100%{translate:-50% 0}50%{translate:-50% -6px}}
@keyframes eosVolcanoRing{0%,100%{scale:.92;opacity:.55}50%{scale:1.06;opacity:1}}
@keyframes eosVolcanoCloudIn{from{opacity:0;translate:-140px -30px;scale:.7}to{opacity:1;translate:0 0;scale:1}}
@keyframes eosVolcanoBloom{0%{opacity:0;scale:.2 .2;translate:-50% -170%}45%{opacity:1;scale:.9 1.15;translate:-50% -100%}62%{scale:1.22 .8}80%{scale:.94 1.08}100%{opacity:1;scale:1 1;translate:-50% -100%}}
@keyframes eosVolcanoHop{0%{translate:0 0;scale:1 1}16%{translate:0 0;scale:1.2 .78}30%{translate:calc(var(--hx) * .2) calc(var(--hy) * .2 - 46px);scale:.84 1.22}58%{translate:calc(var(--hx) * .72) calc(min(var(--hy),0px) - 70px);scale:.96 1.06}80%{translate:var(--hx) var(--hy);scale:1.26 .76}90%{translate:var(--hx) var(--hy);scale:calc(var(--rsc) * .95) calc(var(--rsc) * 1.07)}100%{translate:var(--hx) var(--hy);scale:var(--rsc)}}
@keyframes eosVolcanoHopCalm{0%{opacity:1;translate:0 0}40%{opacity:0;translate:0 0}41%{opacity:0;translate:var(--hx) var(--hy);scale:var(--rsc)}100%{opacity:1;translate:var(--hx) var(--hy);scale:var(--rsc)}}
@keyframes eosVolcanoWisp{0%{opacity:0;translate:0 0;scale:.6}25%{opacity:.9}100%{opacity:0;translate:6px -34px;scale:1.5}}
@keyframes eosVolcanoDripA{0%{opacity:0;translate:0 -26px}20%{opacity:1}78%{opacity:1;translate:0 14px;scale:1}100%{opacity:0;translate:0 18px;scale:1.7 .4}}
@keyframes eosVolcanoDripB{0%{opacity:0;translate:0 -26px}20%{opacity:1}78%{opacity:1;translate:0 14px;scale:1}100%{opacity:0;translate:0 18px;scale:1.7 .4}}
@keyframes eosVolcanoAurora{from{opacity:0;scale:.04 .5;translate:0 34px}40%{opacity:1}to{opacity:1;scale:1 1;translate:0 0}}
@keyframes eosVolcanoWave{from{translate:0 0;scale:1 1}to{translate:0 -8px;scale:1.03 1.16}}
@keyframes eosVolcanoSteam{0%{opacity:0;scale:.5 0}22%{opacity:.95}55%{opacity:.85;scale:1 1}100%{opacity:0;scale:1.7 1.15}}
@keyframes eosVolcanoPetal{0%{opacity:0;translate:0 0;scale:.4}14%{opacity:1}50%{translate:calc(var(--fx) * .55) -96px;scale:1.1;rotate:120deg}100%{opacity:0;translate:var(--fx) -14px;scale:.8;rotate:300deg}}
@keyframes eosVolcanoCloudBye{0%{opacity:1;translate:0 0;rotate:0deg;scale:1}12%{scale:1.16 .86}32%{opacity:1;translate:0 -6px;rotate:360deg;scale:1.06}100%{opacity:0;translate:var(--byeX,190px) -40px;rotate:372deg;scale:.55}}
@keyframes eosVolcanoFadeOut{from{opacity:1}to{opacity:0}}
@keyframes eosVolcanoHeroIn{from{opacity:0;translate:-50% 8px}to{opacity:1;translate:-50% 0}}
@keyframes eosVolcanoHeroOut{from{opacity:1}to{opacity:0}}
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
