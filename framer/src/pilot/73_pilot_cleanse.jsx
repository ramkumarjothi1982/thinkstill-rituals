// ===================================================================================
// Pilot A · 73_pilot_cleanse.jsx — CLEANSE (id 109) "Moon Pool" v2: *your fog becomes stars*.
// Binding: docs/pilot/PILOT_A_ADDENDUM.md §CLEANSE (+ §Shared S2' S5' S7-S11) over PILOT_A_SPEC.md §3.2.
// Built on the shared systems in 70_pilot_core.jsx / 71_pilot_fx.jsx. Concatenated after the release modules by
// dev/pilot_build.py. Rules: no import/export, no regex lookbehind, top-level names EosPilot/eosPilot/EOS_PILOT.
//
// The game: your thoughts float in a moonlit pool as fogged glass orbs, each with a worried picture and your words
// inside (F8). Hold one and breathe in with it: clear water rises inside and squeezes the murk to the top. Let go and
// breathe out: the murk pours into the pool and rises into the sky as stars — this thought's own constellation,
// mirrored in the water. The pool calms with every breath. Your own orb (the hero, front-centre) goes last: its
// let-go is the climax "Clearest Night" — the stars stream onto the lotus, it blooms, you glide up the moon path and
// meet STILL, and the pool doubles everything in a perfect mirror — then the approved burst plays, untouched.
//
// Beats: Mirror (0-2 s: the pool already in the session emotion's weather, your orbs surface with your words and
// pictures, the hero acts the feeling) -> Release (hold/breathe-in, let-go/breathe-out, escalation + koi/frog/
// shooting-star surprises) -> Transform (every breath: murk down, stars up, ripples still, sound calmer, faces
// positive) -> Payoff (own climax T0..2200, settle, hand-off at 2350 -> wrapper's mega burst -> reveal).
// ===================================================================================

const EOS_PILOT_CLEANSE = {
    id: 109,
    verb: "CLEANSED",
    kit: "pool",
    holdMs: 850, // a let-go after this counts as a breath (silent threshold)
    inhale: [2600, 150, 3400], // start, + per clear, max (ms)
    exhale: [2400, 120, 3200],
    deepMs: 3000, // a held breath past 3 s is a "deep clear"
    surfaceAt: 300,
    stagger: 90,
    markerAt: 1400,
    melody: [784, 659, 587, 494, 440, 392, 330, 294, 262, 247], // falling G pentatonic, one note per clear
    chimes: [1046, 1175, 1318, 1568, 1760, 2093],
    hide: ["moon", "moonRefl", "stars", "starsMirror", "moonPath", "pads"],
    // scene geometry: x as a fraction of the scene band [x0, x0 + xw] of the arena width, y of the S5 play box
    lay: {
        phone: { x0: 0, xw: 1, hz: 0.3, lotus: [0.5, 0.355, 0.28], moon: [0.12, 0.1, 0.12], frog: [0.08, 0.405], sky: [0.27, 0.97] },
        desk: { x0: 0.09, xw: 0.78, hz: 0.3, lotus: [0.5, 0.37, 0.12], moon: [0.08, 0.11, 0.05], frog: [0.2, 0.42], sky: [0.18, 0.96] },
    },
    slots: {
        phone: {
            arc: { B0: [0.17, 0.585], B1: [0.5, 0.56], B2: [0.83, 0.585], F0: [0.165, 0.795], F1: [0.835, 0.795], H: [0.5, 0.85] },
            rows: { B0: [0.17, 0.57], B1: [0.5, 0.57], B2: [0.83, 0.57], F0: [0.165, 0.8], F1: [0.835, 0.8], H: [0.5, 0.85] },
            scatter: { B0: [0.18, 0.6], B1: [0.49, 0.555], B2: [0.82, 0.575], F0: [0.16, 0.805], F1: [0.84, 0.785], H: [0.5, 0.855] },
        },
        desk: {
            arc: { B0: [0.17, 0.6], B1: [0.5, 0.565], B2: [0.83, 0.6], F0: [0.3, 0.83], F1: [0.7, 0.83], H: [0.5, 0.86] },
            rows: { B0: [0.17, 0.59], B1: [0.5, 0.59], B2: [0.83, 0.59], F0: [0.3, 0.84], F1: [0.7, 0.84], H: [0.5, 0.86] },
            scatter: { B0: [0.19, 0.62], B1: [0.48, 0.56], B2: [0.82, 0.59], F0: [0.29, 0.845], F1: [0.72, 0.82], H: [0.5, 0.865] },
        },
    },
    fill: { 1: ["B1"], 2: ["B0", "B2"], 3: ["B0", "B1", "B2"], 4: ["B0", "B2", "F0", "F1"], 5: ["B0", "B1", "B2", "F0", "F1"] },
    // five constellation shapes (points in a unit box, edges by index): kite, crown, dipper, swan, W
    shapes: [
        { p: [[0.5, 0.05], [0.18, 0.45], [0.5, 0.62], [0.82, 0.4], [0.56, 0.98]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4]] },
        { p: [[0.04, 0.78], [0.24, 0.3], [0.5, 0.08], [0.76, 0.3], [0.96, 0.78]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
        { p: [[0.02, 0.18], [0.3, 0.3], [0.52, 0.45], [0.56, 0.9], [0.96, 0.92], [0.92, 0.5]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]] },
        { p: [[0.5, 0.02], [0.5, 0.46], [0.48, 0.98], [0.06, 0.36], [0.94, 0.52]], e: [[0, 1], [1, 2], [3, 1], [1, 4]] },
        { p: [[0.02, 0.22], [0.26, 0.82], [0.5, 0.36], [0.74, 0.86], [0.98, 0.18]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    ],
    // 8 petals: closed and open angles; DOM order = depth (outer petals behind, inner in front of STILL)
    petals: [
        { a0: -16, a: -80, o: 0 },
        { a0: 16, a: 80, o: 1 },
        { a0: -11, a: -58, o: 2 },
        { a0: 11, a: 58, o: 3 },
        { a0: -7, a: -36, o: 4 },
        { a0: 7, a: 36, o: 5 },
        { a0: -3, a: -13, o: 6, front: true },
        { a0: 3, a: 13, o: 7, front: true },
    ],
    litOrder: [6, 7, 4, 5, 2, 3, 0, 1],
    koi: { gold: ["#ffe9a8", "#ffb43c", "#e0801c", "rgba(255,190,90,.55)"], redwhite: ["#ffffff", "#ff5a3c", "#ffe8e0", "rgba(255,140,120,.5)"], blue: ["#d8f1ff", "#5fb2ff", "#2f6fd0", "rgba(120,190,255,.55)"] },
    // per-mirror hero take inside its glass (S7 / Mirror beat) and its softened poses along the Transform
    pose: {
        panic: ["translateY(-5%) scale(1.13)", "translateY(-2%) scale(1.06)"],
        anger: ["scale(1.04)", "none"],
        sad: ["translateY(15%) rotate(-12deg) scale(.88)", "translateY(7%) rotate(-5deg) scale(.95)"],
        anxious: ["none", "none"],
    },
    calmPose: "translateY(-3%) scale(1.05)", // 67 %: the palm pressed to the glass, looking out at the stars
}
// S4 cue tables. Input layers fire inside the pointer handler; timed cues via snd.later (cut at the settle).
const EOS_PILOT_CLEANSE_CUES = {
    hold: [{ noise: [600, 1500, 560, { gain: 0.03, q: 0.9, attack: 140 }] }, { tone: (o) => [392, o.ms || 2600, { type: "sine", gain: 0.018, glide: 587 }] }, { arcade: "soft" }],
    ready: [{ tone: [784, 240, { type: "sine", gain: 0.03 }], haptic: EOS_HAPTIC.notch }],
    exhale: [{ tone: (o) => [587, o.ms || 2400, { type: "sine", gain: 0.02, glide: 392 }], haptic: EOS_HAPTIC.exhale }, { noise: [1400, 480, 900, { gain: 0.026, q: 0.8, attack: 60 }] }, { arcade: "pop" }],
    note: [{ tone: (o) => [o.f || 784, 560, { type: "sine", gain: 0.03 }] }],
    twinkle: [{ tone: (o) => [o.f || 1568, 170, { type: "sine", gain: 0.014 }] }, { tone: (o) => [(o.f || 1568) * 1.5, 130, { type: "sine", gain: 0.01, at: 0.09 }] }],
    sigh: [{ noise: [900, 380, 420, { gain: 0.03, q: 0.7, attack: 40 }] }, { tone: [392, 300, { type: "triangle", gain: 0.014, glide: 330 }] }],
    wave: [{ tone: [523, 110, { type: "sine", gain: 0.016, glide: 587 }] }],
    miss: [{ noise: [2200, 700, 170, { gain: 0.03, q: 2, attack: 5 }] }, { tone: [330, 120, { type: "sine", gain: 0.012, glide: 294 }] }],
    turn: [{ tone: [440, 320, { type: "sine", gain: 0.016, glide: 523 }] }],
    koi: [{ tone: [587, 260, { type: "sine", gain: 0.014 }] }, { tone: [740, 260, { type: "sine", gain: 0.014, at: 0.12 }] }, { tone: [880, 340, { type: "sine", gain: 0.014, at: 0.24 }] }],
    leap: [{ noise: [2600, 600, 520, { gain: 0.04, q: 0.9, attack: 8 }] }, { tone: [988, 220, { type: "sine", gain: 0.016, glide: 1318 }] }],
    plop: [{ tone: [330, 150, { type: "sine", gain: 0.03, glide: 165 }] }, { noise: [1800, 500, 200, { gain: 0.025, q: 1.2, attack: 5 }] }],
    shoot: [{ tone: [2093, 760, { type: "sine", gain: 0.012, glide: 1046 }] }, { noise: [5000, 2000, 700, { gain: 0.012, q: 3, attack: 20 }] }],
    thunder: [{ swell: [62, 900, { gain: 0.05, attack: 60 }] }],
    // the S7 sound bed, one phrase per breath, calming with p: heartbeat + beating pair / rumble / rain + pad / shimmer
    bedHeart: [{ tone: (o) => [98, 120, { type: "sine", gain: 0.05 * (o.g || 1) }] }, { tone: (o) => [92, 120, { type: "sine", gain: 0.04 * (o.g || 1), at: 0.18 }] }],
    bedBeat: [{ swell: (o) => [220, o.ms || 2200, { gain: 0.008, attack: 400 }] }, { swell: (o) => [220 + (o.d == null ? 3 : o.d), o.ms || 2200, { gain: 0.008, attack: 400 }] }],
    bedRumble: [{ swell: (o) => [55, o.ms || 2400, { gain: 0.05 * (o.g || 1), attack: 500, rate: 0.5, depth: 0.6 }] }],
    bedRain: [{ noise: (o) => [1200, 1100, o.ms || 2600, { gain: 0.02 * (o.g || 1), q: 0.7, attack: 500 }] }],
    bedPad: [{ swell: (o) => [220, o.ms || 2600, { gain: 0.01, attack: 600 }] }, { swell: (o) => [o.major ? 277.2 : 261.6, o.ms || 2600, { gain: 0.009, attack: 600 }] }, { swell: (o) => [330, o.ms || 2600, { gain: 0.008, attack: 600 }] }],
    bedShimmer: [{ swell: (o) => [2400, o.ms || 2000, { gain: 0.006 * (o.g || 1), attack: 300, rate: 7, depth: 0.7 }] }],
    // the climax "Clearest Night" (every pad reaches 0 by T0 + 2200, before the wrapper's win x 3)
    cExhale: [{ tone: [523, 1300, { type: "sine", gain: 0.024, glide: 262 }] }, { noise: [1600, 400, 1100, { gain: 0.03, q: 0.7, attack: 80 }] }],
    cChime: [{ tone: (o) => [o.f || 1046, 300, { type: "sine", gain: 0.02 }] }],
    cChord: [{ tone: [392, 900, { type: "sine", gain: 0.02 }] }, { tone: [494, 900, { type: "sine", gain: 0.018 }] }, { tone: [587, 900, { type: "sine", gain: 0.016 }] }],
    cBell: [{ tone: [1568, 600, { type: "sine", gain: 0.022 }] }, { tone: [784, 600, { type: "triangle", gain: 0.012 }] }],
    cPad: [{ swell: [196, 760, { gain: 0.016, attack: 260 }] }, { swell: [294, 760, { gain: 0.014, attack: 260 }] }],
    tap: [{ tone: [659, 90, { type: "sine", gain: 0.012 }] }],
}
// dev only: ?mpfx=rare,frog,koi forces the discoveries for a test run (never set in production links)
function eosPilotCleanseFx() {
    try {
        return String(new URLSearchParams(location.search).get("mpfx") || "")
    } catch (e) {
        return ""
    }
}

function EosPilotCleanseEngine(p) {
    const live = React.useRef(p)
    live.current = p
    const wordsKey = (p.entries || []).map((e) => (typeof e === "string" ? e : displayText(e, 40))).join("\u0001")
    return <EosPilotCleanseInner live={live} wordsKey={wordsKey} reduced={!!p.reduced} userImgKey={eosPilotImgKey(p)} />
}

const EosPilotCleanseInner = React.memo(function EosPilotCleanseInner({ live, wordsKey, reduced, userImgKey }) {
    const C = EOS_PILOT_CLEANSE
    const gameId = C.id
    const arenaRef = React.useRef(null)
    const stageRef = React.useRef(null)
    const lotusRef = React.useRef(null)
    const lglowRef = React.useRef(null)
    const haloRef = React.useRef(null)
    const stillRef = React.useRef(null)
    const stillWrapRef = React.useRef(null)
    const sweepRef = React.useRef(null)
    const pathRef = React.useRef(null)
    const koiRef = React.useRef(null)
    const koiJRef = React.useRef(null)
    const frogRef = React.useRef(null)
    const shootRef = React.useRef(null)
    const thunderRef = React.useRef(null)
    const conRef = React.useRef({}) // word gi -> {sky, refl}
    const orbRef = React.useRef({}) // key -> button
    const picRef = React.useRef({}) // key -> ts-face-pic
    const S = React.useRef(null)
    if (!S.current) S.current = { k: 0, gone: {}, hold: null, holdT: 0, exh: null, phase: "intro", markerOn: false, koi: 0, koiAt: null, koiAng: null, koiA: null, frog: "pad", shot: false, deep: 0, miss: 0, wave: 0, risen: -1, loops: [], heroTurn: false, t0: 0 }
    const st = S.current
    const rt = useEosPilotRuntime()
    const shell = useEosPilotShell(arenaRef, gameId)
    const box = useEosPilotBox(arenaRef)
    const [, bump] = React.useReducer((x) => x + 1, 0)
    const [clear, setClear] = React.useState(() => ({}))
    const [wave, setWave] = React.useState(0)
    st.wave = wave

    // ---- words: word orbs (waves of <= 5) + the hero orb (the emotion the user named, else their first chunk)
    const W = React.useMemo(() => {
        const list = wordsKey ? wordsKey.split("\u0001") : []
        let r = { waves: [], words: [] }
        try {
            r = eosPilotWords(list, 5)
        } catch (e) {}
        let words = [].concat(...(r.waves || [])).filter(Boolean)
        if (!words.length) words = (r.words || []).filter(Boolean)
        let e = null
        try {
            e = typeof eosCurrentEmotion === "function" ? eosCurrentEmotion() : null
        } catch (x) {}
        const mirror = eosPilotMirror(e)
        const emo = mirror.emotion
        const emoWord = emo && emo !== "auto" && /^[a-z]+$/.test(emo) ? emo : null
        let heroWord = null
        const stem = emoWord ? emoWord.slice(0, 4) : null
        const hi = stem ? words.findIndex((w) => String(w).toLowerCase().indexOf(stem) >= 0) : -1
        if (hi >= 0) heroWord = words.splice(hi, 1)[0]
        else if (words.length >= 2) heroWord = words.shift()
        else heroWord = emoWord || (words.length ? words.shift() : "this feeling")
        words = words.slice(0, 10)
        const waves = []
        const nW = Math.max(1, Math.ceil(words.length / 5))
        const per = Math.max(1, Math.ceil(words.length / nW))
        for (let i = 0; i < words.length; i += per) waves.push(words.slice(i, i + per).map((w, j) => ({ key: String(i + j), gi: i + j, j, word: w })))
        const maxWave = waves.reduce((m, w) => Math.max(m, w.length), 0)
        const wordEmo = words.map((w) => {
            try {
                const d = eosDetectEmotion(w)
                return (d && EOS_PILOT_MIRROR_OF[d.id]) || null
            } catch (x) {
                return null
            }
        })
        return { words, waves, heroWord, mirror, emo, N: words.length + 1, maxWave, wordEmo }
    }, [wordsKey])
    const N = W.N
    const mirror = W.mirror
    const heroSlot = W.maxWave
    // ---- S11 replay variation: arrangement, koi colour, STILL's greeting, the moon phase, the frog, the rare star
    const R = React.useMemo(() => {
        const { seed, run } = eosPilotRunSeed(gameId, W.words.concat([W.heroWord]))
        const pick = (k, pool, s) => eosPilotPickRun(gameId, k, pool, seed + s)
        const fx = eosPilotCleanseFx()
        return {
            seed,
            run,
            layout: pick("layout", ["arc", "rows", "scatter"], 1),
            koi: pick("koi", ["gold", "redwhite", "blue"], 2),
            greet: pick("greet", ["forehead", "boop", "spin"], 3),
            moon: pick("moon", ["full", "gibbous", "crescent"], 4),
            frog: fx.indexOf("frog") >= 0 || eosPilotRand(seed + 5) < 0.5,
            rare: fx.indexOf("rare") >= 0 || eosPilotRand(seed + 9) < 0.2,
            shapes: W.words.map((_, i) => Math.floor(eosPilotRand(seed + 20 + i * 3) * 5)),
        }
    }, [W])
    // ---- F8: pictures from the shared resolver, read whenever the uploads change (removal restores the defaults)
    const F = React.useMemo(() => eosPilotFacePics(live.current, 0, 6, R.seed), [userImgKey, R])
    React.useEffect(() => {
        // the positive variants are swapped in at each release: fetch + decode them now (references kept so they
        // stay in the memory cache) so the swap never shows an empty ring
        st.pre = (F.relief || []).filter(Boolean).map((src) => {
            try {
                const i = new Image()
                i.decoding = "async"
                i.src = src
                if (typeof i.decode === "function") i.decode().catch(() => {})
                return i
            } catch (e) {
                return null
            }
        })
    }, [F])
    const kNow = Object.keys(clear).length
    const pctOf = (kk) => (kk >= N ? EOS_PILOT_FINAL_PCT : Math.round((kk / N) * 100))
    const pct = pctOf(kNow)
    const breath = useEosPilotBreath(mirror, pct)
    const snd = useEosPilotSound({ gameId, live, cues: EOS_PILOT_CLEANSE_CUES, timers: rt.timers })
    const isRed = () => eosPilotIsReduced(arenaRef.current, live)
    const report = (v) => {
        try {
            live.current.onProgress(v, `${v}% ${C.verb}`)
        } catch (e) {}
    }
    const inhaleOf = (kk) => Math.min(C.inhale[2], C.inhale[0] + C.inhale[1] * kk)
    const exhaleOf = (kk) => Math.min(C.exhale[2], C.exhale[0] + C.exhale[1] * kk)
    const stage = () => stageRef.current
    const rel = (el) => {
        const a = arenaRef.current
        if (!el || !a) return { x: 0, y: 0, w: 0, h: 0 }
        const r = el.getBoundingClientRect()
        const A = a.getBoundingClientRect()
        return { x: r.left - A.left + r.width / 2, y: r.top - A.top + r.height / 2, w: r.width, h: r.height }
    }
    const breathOwn = (ph, ms) => {
        try {
            eosBreathOwn(ph, ms)
        } catch (e) {}
    }
    const curWave = () => W.waves[Math.min(st.wave, W.waves.length - 1)] || []
    const wordsLeft = () => W.words.length - Object.keys(st.gone).filter((k) => k !== "H").length
    const nextKey = () => {
        for (const o of curWave()) if (!st.gone[o.key]) return o.key
        return wordsLeft() <= 0 && !st.gone.H ? "H" : null
    }
    const sub = (key, sel) => {
        const b = orbRef.current[key]
        return b ? b.querySelector(sel) : null
    }
    // from the CURRENT (computed) value to `to`, cancelling the element's previous move: never a jump
    const move = (el, to, opts, mid) => {
        if (!el) return null
        const tgt = typeof to === "string" ? { transform: to } : to
        const from = {}
        try {
            const cs = getComputedStyle(el)
            for (const k in tgt) from[k] = cs[k]
        } catch (e) {}
        const prev = el.__mpA
        el.__mpA = null
        if (prev) {
            try {
                prev.cancel()
            } catch (e) {}
        }
        const a = eosPilotAnim(rt.anims, el, [from].concat(mid || [], [tgt]), { fill: "forwards", ...(opts || {}) })
        el.__mpA = a
        return a
    }
    const add = (el, kf, opts) => eosPilotAnim(rt.anims, el, kf, { composite: "add", ...(opts || {}) })
    const ripple = (x, y, s1, ms) => {
        const s = stage()
        if (s) s.burst("ripples", { x, y, n: 1, dist: 2, s0: 0.4, s1: s1 || 2.4, ms: ms || 1000, anims: rt.anims })
    }
    const lookAt = (key, target, deg) => {
        const p = picRef.current[key]
        if (!p) return
        if (!target) return move(p, key === "H" && st.heroPose ? st.heroPose : "none", { duration: 600, easing: "ease-out" })
        const a = rel(orbRef.current[key])
        const dx = target.x - a.x
        const dy = target.y - a.y
        const d = Math.hypot(dx, dy) || 1
        const base = key === "H" && st.heroPose ? `${st.heroPose} ` : ""
        move(p, `${base}translate(${((dx / d) * 5).toFixed(1)}%,${((dy / d) * 5).toFixed(1)}%) rotate(${(((dx / d) * (deg || 8)) | 0)}deg)`, { duration: 520, easing: "cubic-bezier(.3,.7,.3,1)" })
    }

    // ---- layout: the S5 play box (phone first; the desktop scene sits in the arena's right band)
    const lay = React.useMemo(() => {
        if (!box) return null
        const ph = !!box.phone
        const T = box.play.top
        const H = Math.max(240, box.play.bottom - box.play.top)
        const w = box.w
        const G = ph ? C.lay.phone : C.lay.desk
        const X = (f) => w * (G.x0 + f * G.xw)
        const Y = (f) => T + H * f
        const band = w * G.xw
        const D = ph ? Math.round(eosClamp(w * 0.3, 96, 112)) : Math.round(eosClamp(Math.min(band * 0.13, H * 0.245), 112, 140))
        const DH = Math.round(D * 1.1)
        const SL = (ph ? C.slots.phone : C.slots.desk)[R.layout] || C.slots.phone.arc
        const pos = {}
        for (const s in SL) pos[s] = { x: X(SL[s][0]), y: Y(SL[s][1]) }
        const Ls = Math.round(eosClamp(band * G.lotus[2], ph ? 84 : 104, ph ? 106 : 150))
        return {
            ph,
            T,
            H,
            w,
            h: box.h,
            D,
            DH,
            pos,
            X,
            Y,
            hz: Y(G.hz),
            lotus: { x: X(G.lotus[0]), y: Y(G.lotus[1]), s: Ls },
            moon: { x: X(G.moon[0]), y: Y(G.moon[1]), s: Math.round(eosClamp(band * G.moon[2], 36, 64)) },
            frog: { x: X(G.frog[0]), y: Y(G.frog[1]) },
            sky: [X(G.sky[0]), X(G.sky[1])],
            still: Math.round(Ls * 0.6),
        }
    }, [box, R])
    const mirY = (y) => (lay ? lay.hz + (lay.hz - y) * 0.82 : y)
    // ---- the sky: one constellation per word (4-6 stars), and its twin in the water
    const cons = React.useMemo(() => {
        if (!lay) return []
        const n = W.words.length
        const rows = n > 5 ? 2 : 1
        const per = Math.max(1, Math.ceil(n / rows))
        const [xL, xR] = lay.sky
        const yT = lay.T + 6
        const yB = lay.hz - 8
        const bh = Math.max(40, yB - yT)
        const cw = Math.min(lay.ph ? 70 : 130, ((xR - xL) / per) * 0.8)
        const ch = Math.min(bh * (rows > 1 ? 0.36 : 0.5), cw * 0.78)
        return W.words.map((_, i) => {
            const r = rows > 1 ? Math.floor(i / per) : 0
            const c = rows > 1 ? i % per : i
            const cx = xL + ((c + 0.5) * (xR - xL)) / per
            const cy = yT + bh * (rows > 1 ? (r ? 0.74 : 0.3) : c % 2 ? 0.6 : 0.38)
            const sh = C.shapes[R.shapes[i] % C.shapes.length]
            const pts = sh.p.map(([x, y]) => [cx + (x - 0.5) * cw, cy + (y - 0.5) * ch])
            return { i, cx, cy, pts, mir: pts.map(([x, y]) => [x, mirY(y)]), e: sh.e }
        })
    }, [lay, W, R])

    // ---- the S7 sound bed: one phrase per breath, calmer with p
    const bed = (p, T, at) => {
        const g = 1 - p / 100
        const m = mirror.key
        if (m === "panic") {
            const iv = 60000 / (108 - (42 * p) / 100)
            for (let i = 0; i < 2; i++) snd.later("bedHeart", at + i * iv, T, { g: 0.55 + 0.45 * g, beat: "bed" })
            snd.later("bedBeat", at, T, { d: 0.5 + 2.5 * g, ms: 2200, beat: "bed" })
        } else if (m === "anger") {
            if (g > 0.12) snd.later("bedRumble", at, T, { g, ms: 2400, beat: "bed" })
        } else if (m === "sad") {
            snd.later("bedRain", at, T, { g: 0.3 + 0.7 * g, ms: 2600, beat: "bed" })
            snd.later("bedPad", at + 200, T, { major: p >= 67, ms: 2600, beat: "bed" })
        } else if (p < 67) snd.later("bedShimmer", at, T, { g, ms: 2000, beat: "bed" })
    }

    // ---- the koi (34 %): swims a path, circles the next orb to clear, leaps on a deep clear
    const koiPath = (pts, ms) => {
        const k = koiRef.current
        if (!k || pts.length < 2) return
        const ang = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
        const seg = []
        let total = 0
        for (let i = 1; i < pts.length; i++) {
            const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) || 1
            seg.push(d)
            total += d
        }
        let acc = 0
        let prev = st.koiAng == null ? ang(pts[0], pts[1]) : st.koiAng
        const kf = pts.map((p, i) => {
            let a = i < pts.length - 1 ? ang(p, pts[i + 1]) : ang(pts[i - 1], p)
            while (a - prev > 180) a -= 360
            while (a - prev < -180) a += 360
            prev = a
            if (i) acc += seg[i - 1]
            return { transform: `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${a.toFixed(1)}deg)`, offset: i ? Math.min(1, acc / total) : 0 }
        })
        kf[kf.length - 1].offset = 1
        if (st.koiA) {
            try {
                st.koiA.cancel()
            } catch (e) {}
        }
        st.koiA = eosPilotAnim(rt.anims, k, kf, { duration: ms, easing: "ease-in-out", fill: "forwards" })
        st.koiAt = pts[pts.length - 1]
        st.koiAng = prev
    }
    const koiCircle = (key, ms) => {
        const b = orbRef.current[key]
        if (!b || !st.koi) return
        const c = rel(b)
        const cx = c.x
        const cy = c.y + c.h * 0.5
        const rx = c.w * 0.62
        const ry = c.w * 0.2
        const from = st.koiAt || { x: -30, y: cy }
        const start = from.x < cx ? Math.PI : 0
        const pts = [from]
        for (let i = 0; i <= 5; i++) {
            const a = start + (from.x < cx ? 1 : -1) * ((Math.PI * 2 * i) / 5) * 0.9
            pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
        }
        koiPath(pts, ms || 2600)
    }
    const koiLeap = () => {
        const j = koiJRef.current
        if (!j || !st.koi || isRed()) return
        add(j, [{ transform: "none" }, { transform: "scale(1.7) rotate(28deg)", offset: 0.45 }, { transform: "scale(1.15) rotate(-6deg)", offset: 0.8 }, { transform: "none" }], { duration: 760, easing: "cubic-bezier(.3,.6,.3,1)" })
        rt.timers.later(() => {
            const p = st.koiAt
            if (!p) return
            ripple(p.x, p.y, 3, 1100)
            const s = stage()
            if (s) s.burst("ripples", { x: p.x, y: p.y, n: 2, dist: 18, s0: 0.3, s1: 1.4, ms: 800, stagger: 120, anims: rt.anims })
        }, 560)
        snd.cue("leap", null, { action: "koi-leap" })
    }
    const koiArrive = () => {
        if (st.koi || !lay) return
        st.koi = 1
        const k = koiRef.current
        if (!k) return
        k.setAttribute("data-on", "1")
        const y = lay.Y(0.7)
        st.koiAt = { x: -36, y }
        st.koiAng = 0
        const nk = nextKey()
        if (isRed()) {
            const b = orbRef.current[nk]
            const c = b ? rel(b) : { x: lay.w / 2, y, h: 0 }
            koiPath([{ x: c.x - 10, y: c.y + c.h * 0.5 }, { x: c.x + 10, y: c.y + c.h * 0.5 }], 10)
            return
        }
        koiPath([{ x: -36, y }, { x: lay.w * 0.3, y: y + 14 }, { x: lay.w * 0.55, y: y - 10 }], 1500)
        rt.timers.later(() => nk && koiCircle(nk, 2600), 1500)
        snd.cue("koi", null, { action: "koi" })
    }
    // ---- the frog cameo (50 %): startled into the water, later watching from the lotus leaf
    const frogPlop = () => {
        const f = frogRef.current
        if (!f || st.frog !== "pad") return
        st.frog = "water"
        const red = isRed()
        move(f, { transform: red ? "none" : "translate(30px,10px) scale(.55)", opacity: "0" }, { duration: red ? 300 : 560, easing: "cubic-bezier(.3,.1,.5,1)" }, red ? null : [{ transform: "translate(14px,-22px) scale(1.12)", opacity: "1", offset: 0.45 }])
        if (lay) rt.timers.later(() => ripple(lay.frog.x + 30, lay.frog.y + 10, 2.6, 1000), red ? 0 : 460)
        snd.cue("plop", null, { action: "frog" })
    }
    const frogToLeaf = () => {
        const f = frogRef.current
        if (!f || st.frog !== "water" || !lay) return
        st.frog = "leaf"
        const dx = lay.lotus.x + lay.lotus.s * 0.46 - lay.frog.x
        const dy = lay.lotus.y + lay.lotus.s * 0.3 - lay.frog.y
        const to = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(.9)`
        f.setAttribute("data-leaf", "1")
        move(f, { transform: to, opacity: "1" }, { duration: 700, easing: "ease-out" }, [{ transform: to, opacity: "0", offset: 0.01 }])
    }
    // ---- the rare shooting star (1 in 5, on a deep clear): crosses the sky, lands in the lotus (a gold petal)
    const shootStar = () => {
        const s = shootRef.current
        if (!s || st.shot || !lay) return
        st.shot = true
        const x0 = lay.w * (lay.ph ? 0.96 : 0.92)
        const y0 = lay.T + 6
        const x1 = lay.lotus.x
        const y1 = lay.lotus.y - lay.lotus.s * 0.2
        const a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI
        eosPilotAnim(rt.anims, s, [{ transform: `translate(${x0}px,${y0}px) rotate(${a}deg)`, opacity: 0 }, { transform: `translate(${x0 + (x1 - x0) * 0.2}px,${y0 + (y1 - y0) * 0.2}px) rotate(${a}deg)`, opacity: 1, offset: 0.15 }, { transform: `translate(${x1}px,${y1}px) rotate(${a}deg) scaleX(.3)`, opacity: 0 }], { duration: 1000, easing: "cubic-bezier(.4,0,.6,1)" })
        const hp = picRef.current.H
        if (hp && !isRed()) add(hp, [{ transform: "none" }, { transform: "translateY(-7%) scale(1.1) rotate(-6deg)", offset: 0.3 }, { transform: "none" }], { duration: 1100, easing: "ease-in-out" })
        rt.timers.later(() => {
            const L = lotusRef.current
            if (L) L.setAttribute("data-star", "1")
        }, 1000)
        snd.cue("shoot", null, { action: "shooting-star" })
    }
    // ---- the hero's acting (pictures act inside their glass; the S7 Mirror take, then calmer poses)
    const heroPose = (p, ms) => {
        const pz = C.pose[mirror.key] || C.pose.anxious
        const pose = p >= 67 ? C.calmPose : p >= 34 ? pz[1] : pz[0]
        if (st.heroPose === pose) return
        st.heroPose = pose
        const el = picRef.current.H
        if (el && !isRed()) move(el, pose, { duration: ms || 900, easing: "cubic-bezier(.3,.7,.3,1)" })
        const hb = orbRef.current.H
        if (hb && p >= 67) hb.setAttribute("data-palm", "1")
    }
    const heroTake = () => {
        const el = picRef.current.H
        const hb = orbRef.current.H
        if (!el || !hb || isRed()) return
        heroPose(0, 700)
        const m = mirror.key
        if (m === "panic") {
            const fog = hb.querySelector(".mpFog")
            if (fog) st.loops.push(breath.loop(fog, [{ opacity: 0.08 }, { opacity: 0.6, offset: 0.45 }, { opacity: 0.08 }], { easing: "ease-in-out" }))
        } else if (m === "anger") {
            const lift = hb.querySelector(".mpLift")
            ;[100, 400].forEach((d) =>
                rt.timers.later(() => {
                    add(el, [{ transform: "none" }, { transform: "scale(1.2) translateY(-4%)", offset: 0.3 }, { transform: "none" }], { duration: 260, easing: "ease-out" })
                    if (lift) add(lift, [{ transform: "none" }, { transform: "translateX(3px)", offset: 0.25 }, { transform: "translateX(-3px)", offset: 0.6 }, { transform: "none" }], { duration: 240 })
                    ripple(rel(hb).x, rel(hb).y + rel(hb).h * 0.5, 2, 800)
                }, d)
            )
            const puff = hb.querySelector(".mpPuff")
            if (puff) rt.timers.later(() => eosPilotAnim(rt.anims, puff, [{ opacity: 0, transform: "translateY(0) scale(.6)" }, { opacity: 0.75, transform: "translateY(-30%) scale(1)", offset: 0.3 }, { opacity: 0, transform: "translateY(-90%) scale(1.5)" }], { duration: 1000, easing: "ease-out" }), 560)
        } else if (m === "anxious") {
            add(el, [{ transform: "none" }, { transform: "translateX(7%) scaleX(.15)", offset: 0.25 }, { transform: "scaleX(-1)", offset: 0.5 }, { transform: "translateX(-7%) scaleX(.15)", offset: 0.75 }, { transform: "none" }], { duration: 800, iterations: 1, easing: "linear" })
        }
    }

    // ---- S2' finale "Clearest Night" (T0 = the hero orb's let-go; every beat ends by settleAt = 2200)
    const fin = useEosPilotFinale({
        arenaRef,
        live,
        gameId,
        settle: true,
        bonus: 340 + N * 25,
        label: `100% ${C.verb}`,
        kit: C.kit,
        heroFace: () => F.relief[heroSlot] || F.pics[heroSlot] || null,
        anims: rt.anims,
        timers: rt.timers,
        beats: [
            {
                // 0-300 LAST BREATH: the hero's murk pours out as silver light, one ring sweeps the pool edge to edge,
                // the water goes glass-still and every star snaps into its mirror twin. The hero's picture turns positive.
                id: "climax",
                at: 0,
                dur: 900,
                run: (c) => {
                    const A = arenaRef.current
                    if (!A) return
                    A.setAttribute("data-mp-fin", "1")
                    const hb = orbRef.current.H
                    const hc = rel(hb)
                    const murk = hb && hb.querySelector(".mpMurk")
                    if (murk) {
                        murk.setAttribute("data-silver", "1")
                        if (!c.reduced && !c.skipped) c.anim(murk, [{ transform: "translateY(-22%) scale(.95,.6)", opacity: 1 }, { transform: "translateY(-130%) scale(1.35,.35)", opacity: 0 }], { duration: 760, easing: "cubic-bezier(.2,.6,.3,1)", fill: "forwards" })
                    }
                    const lift = hb && hb.querySelector(".mpLift")
                    if (lift && !c.reduced) move(lift, "none", { duration: 380, easing: "cubic-bezier(.3,.7,.3,1.2)" })
                    const sw = sweepRef.current
                    if (sw && !c.reduced && !c.skipped) {
                        sw.removeAttribute("data-gold")
                        sw.style.left = `${hc.x.toFixed(1)}px`
                        sw.style.top = `${(hc.y + hc.h * 0.42).toFixed(1)}px`
                        c.anim(sw, [{ transform: "translate(-50%,-50%) scale(.12)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(3.4)", opacity: 0 }], { duration: 880, easing: "cubic-bezier(.2,.6,.3,1)" })
                    }
                    requestAnimationFrame(() => {
                        setClear((p) => ({ ...p, H: 1 }))
                        const s = stage()
                        if (s) s.shift(100, c.reduced ? 0 : 560)
                    })
                    breathOwn(null)
                    snd.later("cExhale", 0, c.t0, { beat: "climax" })
                },
            },
            {
                // 300-800 STAR RIVER: every constellation lifts from the sky AND from the water and streams in two
                // mirrored spirals onto the lotus; the moon path draws itself from the moon's reflection to the lotus.
                id: "river",
                at: 300,
                dur: 760,
                reducedAt: 300,
                run: (c) => {
                    const A = arenaRef.current
                    const L = lotusRef.current
                    if (!A || !L || !lay) return
                    const lc = rel(L)
                    cons.forEach((cn, i) => {
                        const g = conRef.current[cn.i]
                        if (!g) return
                        ;[
                            ["sky", 1, cn.cy],
                            ["refl", -1, mirY(cn.cy)],
                        ].forEach(([kk, sgn, cy]) => {
                            const el = g[kk]
                            if (!el || el.getAttribute("data-lit") !== "1") return
                            const dx = lc.x - cn.cx
                            const dy = lc.y - cy
                            el.style.opacity = "0" // end state committed first (S2)
                            if (c.reduced || c.skipped) {
                                if (!c.skipped) c.anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 260 })
                                return
                            }
                            c.anim(
                                el,
                                [
                                    { transform: "none", opacity: 1 },
                                    { transform: `translate(${(dx * 0.45 + sgn * dy * 0.3).toFixed(1)}px,${(dy * 0.5 - sgn * dx * 0.14).toFixed(1)}px) rotate(${sgn * 40}deg) scale(.7)`, opacity: 1, offset: 0.55 },
                                    { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${sgn * 90}deg) scale(.1)`, opacity: 0 },
                                ],
                                { duration: 560, delay: i * 30, easing: "cubic-bezier(.45,0,.3,1)" }
                            )
                        })
                    })
                    A.setAttribute("data-mp-field", "1")
                    L.setAttribute("data-stars", "1")
                    // the moon path: from the moon's reflection to the lotus
                    const pe = pathRef.current
                    if (pe) {
                        const mx = lay.moon.x
                        const my = mirY(lay.moon.y) - lay.moon.s * 0.2
                        const ex = lc.x
                        const ey = lc.y + lay.lotus.s * 0.22
                        const len = Math.hypot(ex - mx, ey - my)
                        const ang = (Math.atan2(-(ex - mx), ey - my) * 180) / Math.PI
                        pe.style.left = `${mx.toFixed(1)}px`
                        pe.style.top = `${my.toFixed(1)}px`
                        pe.style.height = `${len.toFixed(1)}px`
                        const end = `rotate(${ang.toFixed(2)}deg) scaleY(1)`
                        pe.style.transform = end
                        A.setAttribute("data-mp-path", "1")
                        if (!c.reduced && !c.skipped) c.anim(pe, [{ transform: `rotate(${ang.toFixed(2)}deg) scaleY(0)` }, { transform: end }], { duration: 520, easing: "cubic-bezier(.3,.6,.2,1)" })
                    }
                    C.chimes.forEach((f, i) => snd.later("cChime", 300 + i * 90, c.t0, { f, beat: "river" }))
                },
            },
            {
                // 800-1350 BLOOM: the lotus opens petal by petal (8 petals, 70 ms stagger), each catching a star
                id: "bloom",
                at: 800,
                dur: 1060,
                reducedAt: 600,
                run: (c) => {
                    const L = lotusRef.current
                    if (!L) return
                    L.querySelectorAll(".mpPetal").forEach((pe) => pe.setAttribute("data-on", "1"))
                    L.setAttribute("data-open", "1")
                    snd.later("cChord", 850, c.t0, { beat: "bloom" })
                },
            },
            {
                // 1300: the lotus heart flares gold and becomes the key light; the rims relight warm and low
                id: "flare",
                at: 1300,
                dur: 420,
                reducedAt: 600,
                run: () => {
                    const A = arenaRef.current
                    if (A) A.setAttribute("data-mp-gold", "1")
                },
            },
            {
                // 1350-1800 MEETING: the hero's glass dissolves into light, it glides up the moon path; STILL wakes and rises
                id: "meeting",
                at: 1350,
                dur: 460,
                reducedAt: 600,
                run: (c) => {
                    const hb = orbRef.current.H
                    const L = lotusRef.current
                    if (!hb || !L || !lay) return
                    hb.setAttribute("data-free", "1")
                    const lift = hb.querySelector(".mpLift")
                    const hc = rel(hb)
                    const lc = rel(L)
                    const to = `translate(${(lc.x - hc.x).toFixed(1)}px,${(lc.y + lc.h * 0.2 - hc.y).toFixed(1)}px) scale(.8)`
                    if (lift) {
                        if (lift.__mpA) {
                            try {
                                lift.__mpA.cancel()
                            } catch (e) {}
                            lift.__mpA = null
                        }
                        lift.style.transform = to
                        if (c.reduced) c.anim(lift, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 })
                        else if (!c.skipped) c.anim(lift, [{ transform: "none" }, { transform: `translate(${((lc.x - hc.x) * 0.5).toFixed(1)}px,${((lc.y - hc.y) * 0.5).toFixed(1)}px) scale(.9)`, offset: 0.5 }, { transform: to }], { duration: 440, easing: "cubic-bezier(.45,0,.25,1)" })
                    }
                    const sa = stillRef.current
                    const sw = stillWrapRef.current
                    if (sa) {
                        sa.setStep(3)
                        sa.setUnder(0.7)
                    }
                    if (sw) {
                        sw.setAttribute("data-awake", "1")
                        const up = `translateY(${(-lay.lotus.s * 0.3).toFixed(1)}px) scale(1.06)`
                        sw.style.transform = up
                        if (!c.reduced && !c.skipped) c.anim(sw, [{ transform: "none" }, { transform: `translateY(${(-lay.lotus.s * 0.36).toFixed(1)}px) scale(1.1)`, offset: 0.7 }, { transform: up }], { duration: 440, easing: "cubic-bezier(.3,.7,.3,1)" })
                    }
                    snd.later("cBell", 1350, c.t0, { beat: "meeting" })
                    snd.later("cPad", 1400, c.t0, { beat: "pad" })
                },
            },
            {
                // 1700: the greeting (forehead touch / nose boop / a slow spin together) and one gold ring on the water
                id: "touch",
                at: 1700,
                dur: 480,
                reducedAt: 650,
                run: (c) => {
                    const sa = stillRef.current
                    const hp = picRef.current.H
                    if (!c.reduced && !c.skipped) {
                        const g = R.greet
                        if (sa) {
                            const kf = g === "spin" ? [{ transform: "none" }, { transform: "rotate(-14deg)", offset: 0.5 }, { transform: "rotate(10deg) translateY(3px)" }] : g === "boop" ? [{ transform: "none" }, { transform: "translateY(7px) rotate(4deg)", offset: 0.5 }, { transform: "translateY(3px) rotate(8deg)" }] : [{ transform: "none" }, { transform: "translateY(4px) rotate(10deg)" }]
                            sa.celebrate([{ at: 0, part: "body", slot: "lean", keyframes: kf, opts: { duration: 360, easing: "cubic-bezier(.3,.7,.3,1.1)", fill: "forwards" } }])
                        }
                        if (hp) c.anim(hp, [{ transform: "none" }, { transform: g === "spin" ? "rotate(-12deg) translateY(-3%)" : "rotate(-9deg) translateY(-6%)" }], { duration: 360, easing: "cubic-bezier(.3,.7,.3,1.1)", fill: "forwards" })
                        const sw = sweepRef.current
                        const L = lotusRef.current
                        if (sw && L) {
                            const lc = rel(L)
                            sw.setAttribute("data-gold", "1")
                            sw.style.left = `${lc.x.toFixed(1)}px`
                            sw.style.top = `${(lc.y + lay.lotus.s * 0.3).toFixed(1)}px`
                            c.anim(sw, [{ transform: "translate(-50%,-50%) scale(.15)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(2.6)", opacity: 0 }], { duration: 470, easing: "cubic-bezier(.15,.7,.3,1)" })
                        }
                    }
                },
            },
            {
                // 1800-2200 THE MIRROR SHOT: the play plane eases 6 % down so the reflection is centred; every cleared orb
                // turns toward the pair (positive faces). The pad falls to 0 by 2200; then the settle freezes the painting.
                id: "mirror",
                at: 1800,
                dur: 380,
                reducedAt: 700,
                run: (c) => {
                    const L = lotusRef.current
                    if (!L) return
                    const lc = rel(L)
                    if (!c.reduced && !c.skipped) {
                        for (const o of curWave()) {
                            const p = picRef.current[o.key]
                            if (!p) continue
                            const oc = rel(orbRef.current[o.key])
                            const sgn = Math.sign(lc.x - oc.x) || 1
                            c.anim(p, [{ transform: "none" }, { transform: `translateX(${sgn * 5}%) rotate(${sgn * 9}deg)` }], { duration: 360, easing: "ease-out", fill: "forwards" })
                        }
                        const s = stage()
                        if (s && lay) s.camera({ y: lay.H * 0.06, scale: 1.02, ms: 370 })
                    }
                },
            },
        ],
        // T0 ... T0+800: a tap plays one ripple ring where you touched (never a skip)
        onFinaleTap: (ev) => {
            const A = arenaRef.current
            if (!A) return
            const r = A.getBoundingClientRect()
            ripple(ev.clientX - r.left, ev.clientY - r.top, 2.6, 1000)
            snd.cue("tap", ev, { action: "finale-tap" })
        },
    })

    // ---- one breath out (a word orb): sink, the murk pours out, its stars climb into the sky, the world calms
    const release = (key, e, deep, heldMs) => {
        if (st.gone[key]) return
        st.gone[key] = 1
        st.k += 1
        const kk = st.k
        const T = eosPilotEvT(e).t
        const red = isRed()
        const L = lotusRef.current
        if (L) L.removeAttribute("data-hold")
        if (kk >= N || key === "H") {
            // T0: the climax runs in this handler; no p.sfx between here and the hand-off (S2')
            st.phase = "finale"
            st.markerOn = false
            st.exh = null
            // the wrapper mounts a step burst whenever a report crosses one of its reward buckets; the last report
            // stays inside the current bucket so nothing paints over the climax (A5). 100 arrives at the hand-off.
            const prev = pctOf(kk - 1)
            let fv = EOS_PILOT_FINAL_PCT
            try {
                const n = ((live.current && live.current.entries) || []).length || 1
                const rs = Math.max(12, Math.min(34, 100 / Math.max(3, Math.min(7, n))))
                fv = Math.max(prev, Math.min(EOS_PILOT_FINAL_PCT, Math.ceil((Math.floor(prev / rs) + 1) * rs) - 1))
            } catch (x) {}
            if (fv > prev) report(fv)
            fin.start(e)
            bump()
            return
        }
        const exMs = exhaleOf(kk - 1)
        const b = orbRef.current[key]
        const c = rel(b)
        const lc = rel(L)
        const lift = b && b.querySelector(".mpLift")
        const murk = b && b.querySelector(".mpMurk")
        const pic = picRef.current[key]
        // the orb sinks back with a squash and drifts a little toward the lotus
        const dx = (lc.x - c.x) * 0.06
        const dy = (lc.y - c.y) * 0.05
        const rest = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`
        if (lift) {
            if (red) move(lift, rest, { duration: 300 })
            else move(lift, rest, { duration: exMs, easing: "cubic-bezier(.3,.6,.3,1)" }, [{ transform: "translateY(5px) scale(1.06,.92)", offset: 0.14 }, { transform: "translateY(-2px) scale(.98,1.03)", offset: 0.28 }])
        }
        // the murk pours out of the top as an ink plume that unfurls in the water...
        if (murk) move(murk, { transform: red ? "none" : "translateY(-110%) scale(1.3,.35)", opacity: "0" }, { duration: red ? 400 : 1100, easing: "cubic-bezier(.3,.1,.3,1)" })
        const s = stage()
        if (s && !red) s.burst("ink", { x: c.x, y: c.y - c.h * 0.54, n: 4, angle: -90, spread: 110, dist: c.h * 0.5, gravity: -c.h * 0.25, s0: 0.45, s1: 1.6, ms: 1300, anims: rt.anims, seed: kk * 7, easing: "cubic-bezier(.2,.6,.3,1)" })
        // ...and each ink curl lifts out of the water as points of light that settle as this thought's constellation
        const g = conRef.current[Number(key)]
        if (g && g.sky) {
            g.sky.setAttribute("data-lit", "1")
            const stars = g.sky.querySelectorAll(".mpSt")
            stars.forEach((sEl, j) => {
                const sx = parseFloat(sEl.style.left) || 0
                const sy = parseFloat(sEl.style.top) || 0
                const ox = c.x + (j - 2) * 7 - sx
                const oy = c.y - c.h * 0.45 - sy
                if (red) eosPilotAnim(rt.anims, sEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 300 + j * 80, fill: "backwards" })
                else
                    eosPilotAnim(
                        rt.anims,
                        sEl,
                        [
                            { transform: `translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) scale(.4)`, opacity: 0 },
                            { transform: `translate(${(ox * 0.55 + (j % 2 ? 16 : -16)).toFixed(1)}px,${(oy * 0.5).toFixed(1)}px) scale(1.5)`, opacity: 1, offset: 0.4 },
                            { transform: "none", opacity: 1 },
                        ],
                        { duration: 1300, delay: 450 + j * 110, easing: "cubic-bezier(.3,.5,.25,1)", fill: "backwards" }
                    )
            })
            const lines = red ? 900 : 450 + stars.length * 110 + 1100
            rt.timers.later(() => {
                g.sky.setAttribute("data-lines", "1")
                if (g.refl) g.refl.setAttribute("data-lit", "1")
            }, lines)
        }
        // the picture turns positive (F8 relief) and the word sharpens; it looks back down, relieved
        if (pic) move(pic, "none", { duration: 700, easing: "cubic-bezier(.3,.7,.3,1)" })
        setClear((p) => ({ ...p, [key]: 1 }))
        // everyone breathes out with it; cleared orbs and the hero follow the stars
        for (const o of curWave()) {
            if (o.key === key) continue
            if (st.gone[o.key]) lookAt(o.key, { x: c.x, y: lay ? lay.T : 0 }, 6)
            else move(sub(o.key, ".mpLift"), "none", { duration: Math.min(exMs, 1600), easing: "ease-in-out" })
        }
        if (!st.gone.H) move(sub("H", ".mpLift"), "none", { duration: Math.min(exMs, 1600), easing: "ease-in-out" })
        lookAt("H", { x: c.x, y: lay ? lay.T : 0 }, 6)
        rt.timers.later(() => {
            for (const o of curWave()) if (st.gone[o.key] && o.key !== key) lookAt(o.key, null)
            if (!st.gone.H) lookAt("H", null)
        }, 1700)
        const sa = stillRef.current
        if (sa) sa.emit("exhale", { ms: exMs, amp: 0.4, puff: false })
        // the world steps: one lotus petal loosens and glows, the murk drops by 1/N (S9: every release)
        const v = pctOf(kk)
        if (L) {
            const lit = Math.min(6, Math.max(1, Math.round((kk * 6) / Math.max(1, N - 1))))
            const ps = L.querySelectorAll(".mpPetal")
            C.litOrder.slice(0, lit).forEach((pi) => ps[pi] && ps[pi].setAttribute("data-on", "1"))
        }
        if (s) s.shift(v, red ? 0 : 900)
        heroPose(v)
        breathOwn("out", exMs)
        // sound: the out-breath (+ the wrapper's step pop), THEN progress; the falling melody note, the star twinkle
        snd.cue("exhale", e, { action: "release", ms: exMs })
        report(v)
        snd.later("note", 520, T, { f: C.melody[(kk - 1) % C.melody.length], beat: "note" })
        snd.later("twinkle", 1500, T, { f: 1568 + 120 * (kk % 4), beat: "twinkle" })
        bed(v, T, 1000)
        // surprises: the koi at 34 %, the frog (first breath), back on the lotus leaf at 67 %, deep-clear leaps
        if (v >= 34 && !st.koi) rt.timers.later(koiArrive, 700)
        else if (st.koi) rt.timers.later(() => !st.hold && st.phase === "play" && nextKey() && koiCircle(nextKey(), 2400), 900)
        if (R.frog && st.frog === "pad" && kk === 1) rt.timers.later(frogPlop, 450)
        if (R.frog && st.frog === "water" && v >= 67) rt.timers.later(frogToLeaf, 900)
        if (deep) {
            st.deep++
            if (st.koi) rt.timers.later(koiLeap, 600)
            if (R.rare && !st.shot) rt.timers.later(shootStar, 1000)
        }
        // hands off for the exhale: the "wait" marker sits on the exhaling orb
        st.exh = key
        bump()
        rt.timers.later(() => {
            st.exh = null
            breathOwn(null)
            const wv = curWave()
            const waveDone = wv.every((o) => st.gone[o.key])
            if (waveDone && st.wave < W.waves.length - 1) {
                // the cleared wave sinks; the next wave surfaces (a no-input hand-over <= 700 ms: no marker)
                st.phase = "intro"
                for (const o of wv) {
                    const bb = orbRef.current[o.key]
                    if (bb) move(bb, { opacity: "0", transform: "translateY(16px) scale(.9)" }, { duration: 420, delay: 50 * o.j, easing: "ease-in" })
                }
                rt.timers.later(() => {
                    for (const o of wv) {
                        delete orbRef.current[o.key]
                        delete picRef.current[o.key]
                    }
                    setWave(st.wave + 1)
                }, 600)
            } else if (nextKey() === "H") heroTurn()
            bump()
        }, exMs)
    }
    // the hero's turn: it looks up at the sky the others made, its glass glows, the marker moves to it
    const heroTurn = () => {
        if (st.heroTurn) return
        st.heroTurn = true
        const hb = orbRef.current.H
        if (hb) hb.setAttribute("data-turn", "1")
        const hp = picRef.current.H
        if (hp && !isRed()) add(hp, [{ transform: "none" }, { transform: "translateY(-8%) scale(1.06)", offset: 0.4 }, { transform: "none" }], { duration: 900, easing: "ease-in-out" })
        if (st.koi) koiCircle("H", 2400)
        snd.cue("turn", null, { action: "hero-turn" })
    }

    // ---- S5 hold gesture on the orb itself (the water level is the gesture's fill = --hold-pct)
    const g = useEosPilotGesture({
        kind: "hold",
        holdMs: C.holdMs,
        fillMs: inhaleOf(st.k),
        fillVar: "--hold-pct",
        anims: rt.anims,
        fillEl: (el) => (isRed() ? null : el.querySelector(".eosPilotFill")),
        onDown: (e, info) => {
            shell.playInput()
            snd.warm()
            const key = info.key
            if (fin.phase.current !== "play" || st.phase !== "play" || st.exh != null || st.gone[key] || st.hold || (key === "H" && nextKey() !== "H")) {
                g.cancel()
                return
            }
            st.hold = key
            st.holdT = eosPilotEvT(e).t
            const inMs = inhaleOf(st.k)
            const b = orbRef.current[key]
            const red = isRed()
            const lift = b && b.querySelector(".mpLift")
            const murk = b && b.querySelector(".mpMurk")
            // in this handler: the glass flexes (.97 -> 1) and lifts 14 px out of the pool while you breathe in
            if (lift && !red) move(lift, "translateY(-14px)", { duration: inMs, easing: "linear" }, [{ transform: "scale(.96,.97)", offset: 0.001 }, { transform: "translateY(-2px) scale(1.015)", offset: Math.min(0.3, 380 / inMs) }])
            // the murk is squeezed into a cloud at the top as clear water rises
            if (murk) move(murk, red ? { opacity: "0.45" } : { transform: "translateY(-30%) scale(.9,.52)" }, { duration: inMs, easing: "cubic-bezier(.3,.1,.4,1)" })
            if (red) {
                const fl = b && b.querySelector(".eosPilotFill")
                if (fl) move(fl, { opacity: "1", transform: "none" }, { duration: inMs, easing: "linear" }, [{ opacity: "0", transform: "none", offset: 0.001 }])
            }
            // the picture inside looks up
            const pic = picRef.current[key]
            if (pic && !red) move(pic, `${key === "H" && st.heroPose ? `${st.heroPose} ` : ""}translateY(-6%)`, { duration: 420, easing: "cubic-bezier(.3,.7,.3,1.2)" })
            const c = rel(b)
            ripple(c.x, c.y + c.h * 0.46, 2.2, 1100)
            // sympathetic breathing: every uncleared orb breathes in with you; cleared orbs watch; STILL glows
            for (const o of curWave().concat([{ key: "H" }])) {
                if (o.key === key) continue
                if (st.gone[o.key]) lookAt(o.key, c, 7)
                else if (!red) move(sub(o.key, ".mpLift"), "scale(1.03)", { duration: inMs, easing: "ease-in-out" })
            }
            if (key !== "H" && !st.gone.H) lookAt("H", c, 6)
            const sa = stillRef.current
            if (sa) sa.emit("inhale", { ms: inMs, amp: 0.4 })
            const L = lotusRef.current
            if (L) L.setAttribute("data-hold", "1")
            if (st.koi && st.koiFor !== key) {
                st.koiFor = key
                koiCircle(key, 2200)
            }
            breathOwn("in", inMs)
            snd.cue("hold", e, { action: "hold", ms: inMs })
            bump()
        },
        onHoldFull: (info) => {
            if (st.hold !== info.key) return
            const pic = picRef.current[info.key]
            if (pic && !isRed()) add(pic, [{ transform: "none" }, { transform: "scale(1.05,1.03)" }], { duration: 300, fill: "forwards", easing: "ease-out" })
            // the hero's full in-breath: its face lets itself turn positive before the let-go (decoded before T0, so
            // the climax never waits on a picture swap); an earlier let-go swaps it inside the climax instead
            if (info.key === "H") setClear((p) => ({ ...p, H: 1 }))
            snd.later("ready", inhaleOf(st.k), st.holdT, { beat: "ready" })
        },
        onHoldDone: (e, info) => {
            const key = info.key
            if (st.hold !== key) return
            st.hold = null
            release(key, e, !!info.full || info.ms >= C.deepMs, info.ms)
        },
        onHoldCancel: (e, info) => {
            const key = info.key
            if (st.hold !== key) return
            st.hold = null
            // an early let-go: the water drains, the picture sighs; never a fail
            const red = isRed()
            const b = orbRef.current[key]
            move(b && b.querySelector(".mpLift"), "none", { duration: 520, easing: "cubic-bezier(.3,.7,.3,1.2)" })
            move(b && b.querySelector(".mpMurk"), red ? { opacity: "1" } : "none", { duration: 620, easing: "ease-out" })
            if (red) move(b && b.querySelector(".eosPilotFill"), { opacity: "0" }, { duration: 300 })
            const pic = picRef.current[key]
            if (pic && !red) move(pic, key === "H" && st.heroPose ? st.heroPose : "none", { duration: 700, easing: "ease-out" }, [{ transform: "translateY(7%) scale(.97)", offset: 0.35 }])
            for (const o of curWave().concat([{ key: "H" }])) {
                if (o.key === key) continue
                if (st.gone[o.key]) lookAt(o.key, null)
                else move(sub(o.key, ".mpLift"), "none", { duration: 500, easing: "ease-out" })
            }
            if (key !== "H") lookAt("H", null)
            const L = lotusRef.current
            if (L) L.removeAttribute("data-hold")
            breathOwn(null)
            snd.cue("sigh", e, { action: "almost" })
            bump()
        },
    })
    const liveTargets = () => Object.keys(orbRef.current).map((k) => orbRef.current[k]).filter((b) => b && b.isConnected && !b.disabled)
    const near = useEosPilotNearHit(arenaRef, liveTargets, 26)
    // the arena: finale taps, near-hit routing, the hero's "after the others", touches on the water
    const onArenaDown = (e) => {
        snd.warm()
        if (fin.phase.current === "finale") return fin.tap(e)
        if (fin.phase.current !== "play") return
        const t = e.target
        if (t && t.closest && t.closest(".mpOrb:not(:disabled)")) return
        shell.playInput()
        const hit = st.hold || st.phase !== "play" || st.exh != null ? null : near(e)
        if (hit) return g.route(e, hit.el)
        const A = arenaRef.current
        if (!A) return
        const R0 = A.getBoundingClientRect()
        const x = e.clientX - R0.left
        const y = e.clientY - R0.top
        const hb = orbRef.current.H
        const nk = nextKey()
        if (hb && !st.gone.H && nk && nk !== "H") {
            const r = hb.getBoundingClientRect()
            if (e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6) {
                // a tap on the waiting hero: it waves you toward the next orb, which bobs to say "me first"
                const tb = orbRef.current[nk]
                const tc = rel(tb)
                lookAt("H", tc, 12)
                const hp = picRef.current.H
                if (hp && !isRed()) add(hp, [{ transform: "none" }, { transform: "translateY(-6%)", offset: 0.3 }, { transform: "none", offset: 0.6 }, { transform: "translateY(-4%)", offset: 0.8 }, { transform: "none" }], { duration: 700 })
                if (tb && !isRed()) add(tb.querySelector(".mpBreath"), [{ transform: "none" }, { transform: "translateY(-9px) scale(1.04)", offset: 0.4 }, { transform: "none" }], { duration: 560, delay: 220, easing: "ease-in-out" })
                rt.timers.later(() => !st.gone.H && lookAt("H", null), 1300)
                snd.cue("wave", e, { action: "hero-wait" })
                return
            }
        }
        // a touch on the open water: a ripple where you touched; the nearest orb looks; the koi comes to see
        ripple(x, y, 2.4, 1000)
        let best = null
        for (const o of curWave()) {
            const b = orbRef.current[o.key]
            if (!b) continue
            const c = rel(b)
            const d = Math.hypot(c.x - x, c.y - y)
            if (!best || d < best.d) best = { key: o.key, d }
        }
        if (best) {
            lookAt(best.key, { x, y }, 9)
            rt.timers.later(() => lookAt(best.key, null), 1100)
        }
        if (st.koi && !st.hold && y > (lay ? lay.hz : 0)) koiPath([st.koiAt || { x, y }, { x: x - 8, y: y + 6 }, { x, y }], 1100)
        st.miss++
        snd.cue("miss", e, { action: "miss" })
    }

    // ---- the Mirror (0-2 s, from the first measured layout) and every later wave's surfacing
    React.useLayoutEffect(() => {
        if (!lay || st.risen === wave) return
        st.risen = wave
        const red = isRed()
        const first = wave === 0
        const base = first ? C.surfaceAt : 80
        const list = curWave().concat(first ? [{ key: "H", j: curWave().length }] : [])
        list.forEach((o, n) => {
            const b = orbRef.current[o.key]
            const lift = b && b.querySelector(".mpLift")
            if (!lift) return
            const d = base + C.stagger * n
            eosPilotAnim(rt.anims, lift, red ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(38%) scale(.86)" }, { opacity: 1, transform: "translateY(-6%) scale(1.03)", offset: 0.6 }, { opacity: 1, transform: "none" }], { duration: 560, delay: d, easing: "cubic-bezier(.25,.7,.3,1)", fill: "backwards" })
            rt.timers.later(() => {
                const c = rel(b)
                ripple(c.x, c.y + c.h * 0.46, 2.4, 1100)
            }, d + 260)
        })
        const T = performance.now()
        st.t0 = T
        if (first) {
            // the hero's eyes follow each orb as it arrives, and it reacts to that word's own feeling
            let flinched = false
            let drooped = false
            curWave().forEach((o, n) => {
                const at = base + C.stagger * n + 120
                rt.timers.later(() => {
                    if (st.hold || st.gone.H) return
                    const hp = picRef.current.H
                    if (!hp || isRed()) return
                    const we = W.wordEmo[o.gi]
                    if (we === "anger" && !flinched) {
                        flinched = true
                        add(hp, [{ transform: "none" }, { transform: "scale(.88) translateY(4%)", offset: 0.3 }, { transform: "none" }], { duration: 420, easing: "ease-out" })
                    } else if (we === "sad" && !drooped) {
                        drooped = true
                        add(hp, [{ transform: "none" }, { transform: "translateY(8%) rotate(-6deg)", offset: 0.4 }, { transform: "none" }], { duration: 700, easing: "ease-in-out" })
                    }
                    const b = orbRef.current[o.key]
                    if (b) {
                        const c = rel(b)
                        const hc = rel(orbRef.current.H)
                        const dx = c.x - hc.x
                        add(hp, [{ transform: "none" }, { transform: `translateX(${Math.sign(dx) * 5}%) rotate(${Math.sign(dx) * 7}deg)`, offset: 0.4 }, { transform: "none" }], { duration: 520, easing: "ease-in-out" })
                    }
                }, at)
            })
            rt.timers.later(heroTake, 600)
            // ~1300: it looks into the camera and gives one small nod: "I know"
            rt.timers.later(() => {
                const hp = picRef.current.H
                if (hp && !isRed() && !st.hold) add(hp, [{ transform: "none" }, { transform: "translateY(6%) scale(.98)", offset: 0.45 }, { transform: "none" }], { duration: 460, easing: "ease-in-out" })
            }, 1300)
            if (mirror.key === "anger")
                rt.timers.later(() => {
                    const th = thunderRef.current
                    if (th && !isRed()) eosPilotAnim(rt.anims, th, [{ opacity: 0 }, { opacity: 0.42, offset: 0.3 }, { opacity: 0.3, offset: 0.6 }, { opacity: 0 }], { duration: 140 })
                    snd.later("thunder", 0, T, { beat: "mirror" })
                }, 720)
            if (R.frog && (mirror.key === "anger" || mirror.key === "anxious")) rt.timers.later(frogPlop, 1150)
            bed(0, T, 0)
        }
        rt.timers.later(() => {
            if (st.phase === "intro") {
                st.phase = "play"
                bump()
            }
        }, first ? C.surfaceAt : 520)
        if (first)
            rt.timers.later(() => {
                st.markerOn = true
                if (nextKey() === "H") heroTurn()
                bump()
            }, C.markerAt)
        else st.markerOn = true
    }, [lay, wave])
    // the world breathes (S8): every uncleared orb, the lotus glow and the moon halo lock to one clock
    React.useEffect(() => {
        if (!lay || isRed()) return
        const made = []
        const loop = (el, kf, off) => {
            const a = el ? breath.loop(el, kf, { easing: "ease-in-out", offset: off || 0 }) : null
            if (a) made.push(a)
        }
        for (const o of curWave().concat([{ key: "H" }])) loop(sub(o.key, ".mpBreath"), [{ transform: "scale(1)" }, { transform: "scale(1.024)", offset: 0.45 }, { transform: "scale(1)" }])
        if (wave === 0) {
            loop(lglowRef.current, [{ opacity: 0.35 }, { opacity: 0.8, offset: 0.45 }, { opacity: 0.35 }])
            loop(haloRef.current, [{ opacity: 0.55 }, { opacity: 0.95, offset: 0.45 }, { opacity: 0.55 }])
        }
        return () => made.forEach((a) => breath.stop(a))
    }, [lay, wave])
    React.useEffect(() => {
        report(0)
        const A = arenaRef.current
        if (A && stageRef.current) breath.root(stageRef.current.el())
        try {
            eosExpose("pilotCleanse", {
                state: () => ({ k: st.k, N, phase: st.phase, exh: st.exh, hold: st.hold, next: nextKey(), koi: !!st.koi, frog: st.frog, shot: st.shot, deep: st.deep, wave: st.wave, layout: R.layout, greet: R.greet, moon: R.moon, rare: R.rare, mirror: mirror.key, words: W.words.slice(), hero: W.heroWord, inhale: inhaleOf(st.k), exhale: exhaleOf(st.k), breathMs: breath.period() }),
            })
        } catch (e) {}
        return () => breathOwn(null)
    }, [])

    // ---- render
    const finale = st.phase === "finale"
    let mk = null
    if (!finale && st.markerOn && st.phase === "play") {
        if (st.exh != null) mk = { key: st.exh, spec: { g: "wait", label: "BREATHE OUT…" }, idle: true }
        else {
            const key = st.hold || nextKey()
            if (key) mk = { key, spec: { g: "hold", ms: inhaleOf(st.k), mvar: "--hold-pct", label: key === "H" ? "YOU NOW · BREATHE IN" : "HOLD · BREATHE IN" } }
        }
    }
    const inputOn = st.phase === "play" && st.exh == null && !finale
    const wv = W.waves[Math.min(wave, W.waves.length - 1)] || []
    const arenaVars = { "--mh": mirror.hue }
    if (lay) {
        arenaVars["--mp-hz-px"] = `${lay.hz.toFixed(1)}px`
        arenaVars["--mx"] = `${lay.moon.x.toFixed(1)}px`
        arenaVars["--my"] = `${lay.moon.y.toFixed(1)}px`
        arenaVars["--myr"] = `${mirY(lay.moon.y).toFixed(1)}px`
        arenaVars["--ms"] = `${lay.moon.s}px`
        arenaVars["--lx"] = `${lay.lotus.x.toFixed(1)}px`
        arenaVars["--ly"] = `${lay.lotus.y.toFixed(1)}px`
        arenaVars["--sv"] = `${lay.still}px`
    }
    const renderOrb = (o, isHero) => {
        const place = isHero ? "H" : C.fill[Math.min(5, wv.length)][o.j]
        const P = lay.pos[place]
        const D = isHero ? lay.DH : lay.D
        const key = isHero ? "H" : o.key
        const slot = isHero ? heroSlot : o.j
        const gone = !!clear[key]
        const isMk = mk && mk.key === key
        const dis = !inputOn || gone || st.gone[key] || (isHero && nextKey() !== "H")
        const src = gone ? F.relief[slot] || F.pics[slot] : F.pics[slot]
        const word = isHero ? W.heroWord : o.word
        return (
            <button
                key={isHero ? "H" : `${wave}:${key}`}
                ref={(n) => {
                    if (n) orbRef.current[key] = n
                }}
                className={`eosPilotHit mpOrb tsFaceObject tsNoBubbleFace${gone ? " isClear" : ""}${isHero ? " isHero" : ""}`}
                {...eosPilotFaceHost(slot)}
                disabled={dis}
                aria-label={word}
                style={{ left: `${Math.round(P.x - D / 2)}px`, top: `${Math.round(P.y - D / 2)}px`, "--D": `${D}px`, "--i": isHero ? 5 : o.j, "--tilt": (isHero ? 1 : o.j % 2 ? -1 : 1) * 7 }}
                {...g.bind(key)}
                {...(isMk ? eosPilotMarker(mk.spec, true) : {})}
                {...(isMk && mk.idle ? { "data-eos-idle": "10000" } : {})}
            >
                <i className="mpRefl" aria-hidden="true" />
                <span className="mpLift">
                    <span className="mpBob">
                        <span className="mpBreath">
                            <i className="mpGlass" aria-hidden="true" />
                            <i className="mpMurk" aria-hidden="true" />
                            <i className="mpWin" aria-hidden="true">
                                <i className="eosPilotFill" />
                            </i>
                            {isHero ? <i className="mpFog" aria-hidden="true" /> : null}
                            {isHero ? <i className="mpPuff" aria-hidden="true" /> : null}
                            <EosPilotFace
                                src={src}
                                word={word}
                                D={D}
                                pos={gone}
                                upload={F.upload}
                                picRef={(n) => {
                                    if (n) picRef.current[key] = n
                                }}
                            />
                            <i className="mpGloss" aria-hidden="true" />
                            <i className="mpRim" aria-hidden="true" />
                        </span>
                    </span>
                </span>
            </button>
        )
    }
    const renderCon = (cn, refl) => {
        const P = refl ? cn.mir : cn.pts
        const cy = refl ? mirY(cn.cy) : cn.cy
        return (
            <div
                key={(refl ? "r" : "s") + cn.i}
                className={`mpCon${refl ? " isRefl" : ""}`}
                aria-hidden="true"
                ref={(n) => {
                    if (!n) return
                    const g0 = conRef.current[cn.i] || (conRef.current[cn.i] = {})
                    g0[refl ? "refl" : "sky"] = n
                }}
                style={{ transformOrigin: `${cn.cx.toFixed(1)}px ${cy.toFixed(1)}px` }}
            >
                <svg className="mpLn" width={lay.w} height={Math.max(lay.h, lay.T + lay.H)}>
                    {cn.e.map(([a, b], j) => (
                        <line key={j} x1={P[a][0].toFixed(1)} y1={P[a][1].toFixed(1)} x2={P[b][0].toFixed(1)} y2={P[b][1].toFixed(1)} />
                    ))}
                </svg>
                {P.map(([x, y], j) => (
                    <i key={j} className="mpSt" style={{ left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px`, "--j": j }} />
                ))}
            </div>
        )
    }
    const petal = (pp, i) => <i key={`p${i}`} className="mpPetal" data-b={pp.front ? undefined : "1"} style={{ "--a0": `${pp.a0}deg`, "--a": `${pp.a}deg`, "--o": pp.o }} />
    const m = mirror.key
    const koiC = C.koi[R.koi] || C.koi.gold
    const wx = []
    if (m === "panic") wx.push(<i key="chop" className="mpChop" />)
    if (m === "anger") {
        wx.push(<i key="glow" className="mpGlowR" />)
        for (let i = 0; i < 3; i++) wx.push(<i key={`st${i}`} className="mpSteam" style={{ "--i": i, left: `${12 + i * 30}%` }} />)
    }
    if (m === "sad") {
        wx.push(<i key="fog" className="mpFogW" />)
        for (let i = 0; i < 4; i++) wx.push(<i key={`r${i}`} className="mpRain" style={{ "--i": i, left: `${[14, 72, 40, 88][i]}%`, top: `${[22, 36, 58, 76][i]}%` }} />)
    }
    if (m === "anxious") for (let i = 0; i < 6; i++) wx.push(<i key={`m${i}`} className="mpMote" style={{ "--i": i, left: `${8 + i * 15}%`, top: `${[18, 44, 28, 66, 38, 80][i]}%` }} />)
    return (
        <div
            ref={arenaRef}
            className="arena eosPilotArena eosPilotCleanse"
            data-eos-pilot-kit={C.kit}
            data-eos-pilot-reduced={reduced ? "1" : undefined}
            data-mp-m={m}
            data-mp-desk={lay && !lay.ph ? "1" : undefined}
            data-mp-phase={finale ? "finale" : st.exh != null ? "exhale" : st.phase}
            onPointerDown={onArenaDown}
            style={arenaVars}
        >
            <EosPilotStage ref={stageRef} kit={C.kit} mirror={mirror} hide={C.hide} calm={0} planeClassName={finale ? "isLocked" : ""}>
                {lay ? (
                    <>
                        <i className="mpL mpField" aria-hidden="true" />
                        <i className="mpL mpHalo" ref={haloRef} aria-hidden="true" />
                        <i className="mpL mpMoon" data-ph={R.moon} aria-hidden="true" />
                        <i className="mpL mpVeil" aria-hidden="true" />
                        <i className="mpL mpStar" style={{ left: `${(lay.w * 0.36).toFixed(0)}px`, top: `${(lay.T + (lay.hz - lay.T) * 0.2).toFixed(0)}px` }} aria-hidden="true" />
                        <i className="mpL mpStar" style={{ left: `${(lay.w * (lay.ph ? 0.62 : 0.66)).toFixed(0)}px`, top: `${(lay.T + (lay.hz - lay.T) * 0.12).toFixed(0)}px`, "--j": 1 }} aria-hidden="true" />
                        <i className="mpL mpStar" style={{ left: `${(lay.w * (lay.ph ? 0.8 : 0.86)).toFixed(0)}px`, top: `${(lay.T + (lay.hz - lay.T) * 0.72).toFixed(0)}px`, "--j": 2 }} aria-hidden="true" />
                        <i className="mpL mpThunder" ref={thunderRef} aria-hidden="true" />
                        <div className="mpL mpWater" aria-hidden="true">
                            <i className="mpWMurk" />
                            <i className="mpFieldR" />
                            <i className="mpMoonR" />
                            <i className="mpGoldKey" />
                            <div className="mpWx">{wx}</div>
                        </div>
                        {cons.map((cn) => renderCon(cn, true))}
                        {cons.map((cn) => renderCon(cn, false))}
                        <i className="mpL mpPath" ref={pathRef} aria-hidden="true" />
                        {R.frog ? <i className="mpL mpFrogPad" style={{ left: `${lay.frog.x.toFixed(1)}px`, top: `${lay.frog.y.toFixed(1)}px` }} aria-hidden="true" /> : null}
                        {R.frog ? <i className="mpL mpFrog" ref={frogRef} style={{ left: `${lay.frog.x.toFixed(1)}px`, top: `${lay.frog.y.toFixed(1)}px` }} aria-hidden="true" /> : null}
                        <div ref={lotusRef} className="mpLotus" data-eos-avoid="1" data-eos-char="still" style={{ left: `${lay.lotus.x.toFixed(1)}px`, top: `${lay.lotus.y.toFixed(1)}px`, "--L": `${lay.lotus.s}px` }}>
                            <i className="mpLGlow" ref={lglowRef} aria-hidden="true" />
                            <div ref={stillWrapRef} className="mpStill">
                                <EosPilotActor ref={stillRef} role="breath" char="still" emotion="auto" size={lay.still} u={1} progress={80} reacts={[]} seed={7} style={{ left: 0, top: 0 }} />
                            </div>
                            {C.petals.map(petal)}
                        </div>
                        <i className="mpL mpKoi" ref={koiRef} style={{ "--k1": koiC[0], "--k2": koiC[1], "--k3": koiC[2], "--kg": koiC[3] }} aria-hidden="true">
                            <i className="mpKoiJ" ref={koiJRef}>
                                <i className="mpKoiB" />
                            </i>
                        </i>
                        {wv.map((o) => renderOrb(o, false))}
                        {renderOrb(null, true)}
                        <i className="mpL mpSweep" ref={sweepRef} aria-hidden="true" data-eos-avoid="1" />
                        <i className="mpL mpShoot" ref={shootRef} aria-hidden="true" />
                    </>
                ) : null}
            </EosPilotStage>
        </div>
    )
})
eosPilotRegister(109, EosPilotCleanseEngine, { name: "Moon Pool", kit: "pool" })

// ---------------------------------------------------------------- CSS (every rule under the CLEANSE arena)
const EOS_PILOT_CL = `${EOS_A} .eosPilotArena.eosPilotCleanse`
const eosPilotCleanseCalmCss = (P) => `
${P} .mpBob,${P} .mpMurk::before,${P} .mpMurk::after,${P} .mpVeil,${P} .mpChop,${P} .mpSteam,${P} .mpRain,${P} .mpMote,${P} .mpKoiB,${P} .mpStar,${P} .mpOrb.isHero[data-turn] .mpRim{animation:none!important}
${P} .mpPetal,${P} .mpBob{transition-property:opacity!important}`
const EOS_PILOT_CLEANSE_CSS = `
${EOS_PILOT_CL}{background:#0a0d28;--mh:250}
${EOS_PILOT_CL} .eosPilotStage{--eos-pilot-horizon:var(--mp-hz-px,30%)}
${EOS_PILOT_CL} .mpL{position:absolute;display:block;pointer-events:none;font-style:normal}
${EOS_PILOT_CL} i{font-style:normal}

/* sky: the moon (phase per run) and its breathing halo, the veil of cloud, three lonely stars, the clear-night field */
${EOS_PILOT_CL} .mpHalo{left:var(--mx);top:var(--my);width:calc(var(--ms) * 3.2);height:calc(var(--ms) * 3.2);translate:-50% -50%;border-radius:50%;
  background:radial-gradient(closest-side,rgba(235,240,255,.34),rgba(200,215,255,.12) 45%,rgba(200,215,255,0));opacity:.7}
${EOS_PILOT_CL} .mpMoon{left:var(--mx);top:var(--my);width:var(--ms);height:var(--ms);translate:-50% -50%;border-radius:50%;
  background:radial-gradient(circle at 38% 34%,#fffdf3,#f2eed9 46%,#d8d2bc 74%,#c7c0aa);opacity:calc(.55 + var(--calm,0) * .45);transition:opacity var(--calm-ms,600ms) ease}
${EOS_PILOT_CL} .mpMoon[data-ph="gibbous"]{-webkit-mask:radial-gradient(circle at 132% 50%,transparent 44%,#000 46%);mask:radial-gradient(circle at 132% 50%,transparent 44%,#000 46%)}
${EOS_PILOT_CL} .mpMoon[data-ph="crescent"]{-webkit-mask:radial-gradient(circle at 76% 36%,transparent 43%,#000 45.5%);mask:radial-gradient(circle at 76% 36%,transparent 43%,#000 45.5%)}
${EOS_PILOT_CL}[data-mp-m="sad"] .mpMoon,${EOS_PILOT_CL}[data-mp-m="sad"] .mpHalo{opacity:calc(.1 + var(--calm,0) * .9)}
${EOS_PILOT_CL} .mpVeil{left:var(--mx);top:var(--my);width:calc(var(--ms) * 3);height:calc(var(--ms) * 1.25);translate:-50% -45%;border-radius:50%;
  background:radial-gradient(48% 50% at 36% 52%,rgba(150,150,192,.9),rgba(116,116,164,.55) 58%,rgba(116,116,164,0) 74%),radial-gradient(40% 46% at 70% 58%,rgba(140,140,186,.85),rgba(140,140,186,0) 72%);
  opacity:calc(.82 - var(--calm,0) * 1.15);transition:opacity var(--calm-ms,600ms) ease;animation:eosPilotMpVeil 16s ease-in-out infinite alternate}
${EOS_PILOT_CL}[data-mp-m="panic"] .mpVeil{animation-duration:3.8s}
${EOS_PILOT_CL}[data-mp-m="sad"] .mpVeil{opacity:calc(1 - var(--calm,0) * 1.2);width:calc(var(--ms) * 4.2)}
${EOS_PILOT_CL}[data-mp-m="anger"] .mpVeil{background:radial-gradient(48% 50% at 36% 52%,rgba(150,92,92,.85),rgba(120,70,80,.5) 58%,rgba(120,70,80,0) 74%),radial-gradient(40% 46% at 70% 58%,rgba(140,86,90,.8),rgba(140,86,90,0) 72%)}
${EOS_PILOT_CL} .mpStar{width:5px;height:5px;translate:-50% -50%;border-radius:50%;background:#f4f6ff;box-shadow:0 0 6px 1px rgba(200,215,255,.7);animation:eosPilotMpTw 3.4s ease-in-out calc(var(--j,0) * -1.1s) infinite}
${EOS_PILOT_CL} .mpField,${EOS_PILOT_CL} .mpFieldR{left:0;right:0;opacity:0;transition:opacity .7s ease;
  background:radial-gradient(1.2px 1.2px at 8% 30%,#fff,transparent),radial-gradient(1px 1px at 17% 64%,#dfe8ff,transparent),radial-gradient(1.4px 1.4px at 29% 18%,#fff,transparent),radial-gradient(1px 1px at 41% 52%,#e8eeff,transparent),
  radial-gradient(1.2px 1.2px at 52% 22%,#fff,transparent),radial-gradient(1px 1px at 58% 76%,#dfe8ff,transparent),radial-gradient(1.5px 1.5px at 67% 40%,#fff,transparent),radial-gradient(1px 1px at 74% 12%,#e8eeff,transparent),
  radial-gradient(1.2px 1.2px at 83% 58%,#fff,transparent),radial-gradient(1px 1px at 92% 28%,#dfe8ff,transparent),radial-gradient(1.3px 1.3px at 35% 84%,#fff,transparent),radial-gradient(1px 1px at 88% 86%,#fff,transparent)}
${EOS_PILOT_CL} .mpField{top:0;height:var(--mp-hz-px)}
${EOS_PILOT_CL} .mpFieldR{position:absolute;top:0;height:55%;transform:scaleY(-1)}
${EOS_PILOT_CL}[data-mp-field="1"] .mpField{opacity:1}
${EOS_PILOT_CL}[data-mp-field="1"] .mpFieldR{opacity:.6}
${EOS_PILOT_CL} .mpThunder{left:0;right:0;top:0;height:var(--mp-hz-px);opacity:0;background:radial-gradient(70% 55% at 70% 100%,rgba(255,170,140,.7),rgba(255,120,90,0) 72%)}

/* constellations: your words' stars, joined by lines once they settle, and their twins in the water */
${EOS_PILOT_CL} .mpCon{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .5s ease;z-index:1}
${EOS_PILOT_CL} .mpCon[data-lit="1"]{opacity:1}
${EOS_PILOT_CL} .mpCon.isRefl[data-lit="1"]{opacity:.34;transition-duration:1s}
${EOS_PILOT_CL}[data-mp-fin="1"] .mpCon.isRefl[data-lit="1"]{opacity:.92;transition-duration:.22s}
${EOS_PILOT_CL} .mpLn{position:absolute;left:0;top:0;overflow:visible;opacity:0;transition:opacity .9s ease}
${EOS_PILOT_CL} .mpCon[data-lines="1"] .mpLn{opacity:1}
${EOS_PILOT_CL} .mpLn line{stroke:rgba(214,226,255,.6);stroke-width:1.3;stroke-linecap:round}
${EOS_PILOT_CL} .mpSt{position:absolute;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;
  background:radial-gradient(circle,#fff 0 32%,rgba(225,235,255,.9) 46%,rgba(170,195,255,0) 72%);box-shadow:0 0 9px 2px rgba(190,212,255,.6)}
${EOS_PILOT_CL}[data-mp-desk="1"] .mpSt{width:9px;height:9px;margin:-4.5px 0 0 -4.5px}
${EOS_PILOT_CL} .mpCon.isRefl .mpSt{box-shadow:0 0 5px 1px rgba(190,212,255,.4)}

/* the pool: translucent night water over the stage's emotion tint; the murk of the mood drops with every breath */
${EOS_PILOT_CL} .mpWater{left:0;right:0;bottom:0;top:var(--mp-hz-px);overflow:hidden;
  background:linear-gradient(180deg,rgba(54,70,140,.42),rgba(16,22,62,.62) 38%,rgba(8,12,38,.8))}
${EOS_PILOT_CL} .mpWater::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,rgba(210,225,255,0),rgba(210,225,255,.5) 30%,rgba(210,225,255,.5) 70%,rgba(210,225,255,0))}
${EOS_PILOT_CL} .mpWater > i,${EOS_PILOT_CL} .mpWx{position:absolute;display:block;pointer-events:none}
${EOS_PILOT_CL} .mpWMurk{inset:0;opacity:calc(.85 * (1 - var(--calm,0)));transition:opacity var(--calm-ms,600ms) ease;
  background:radial-gradient(75% 55% at 50% 62%,hsla(var(--mh),34%,32%,.72),hsla(var(--mh),30%,24%,.42) 62%,hsla(var(--mh),30%,24%,0) 88%),linear-gradient(180deg,hsla(var(--mh),30%,30%,.32),hsla(var(--mh),34%,18%,.5))}
${EOS_PILOT_CL} .mpMoonR{left:var(--mx);top:calc(var(--myr) - var(--mp-hz-px));width:calc(var(--ms) * .8);height:calc(var(--ms) * 1.7);translate:-50% -50%;border-radius:50%;
  background:radial-gradient(closest-side,rgba(245,246,255,.75),rgba(210,222,255,.28) 55%,rgba(210,222,255,0));opacity:calc(.25 + var(--calm,0) * .6);transition:opacity var(--calm-ms,600ms) ease}
${EOS_PILOT_CL}[data-mp-m="sad"] .mpMoonR{opacity:calc(.05 + var(--calm,0) * .8)}
${EOS_PILOT_CL} .mpGoldKey{left:calc(var(--lx) - 50%);width:100%;top:calc(var(--ly) - var(--mp-hz-px) - 20%);height:70%;opacity:0;transition:opacity .45s ease;
  background:radial-gradient(42% 30% at 50% 36%,rgba(255,214,140,.5),rgba(255,190,110,.18) 55%,rgba(255,190,110,0) 80%)}
${EOS_PILOT_CL}[data-mp-gold="1"] .mpGoldKey{opacity:1}
${EOS_PILOT_CL} .mpWx{inset:0;opacity:calc(1 - var(--calm,0) * 1.3);transition:opacity var(--calm-ms,600ms) ease}
${EOS_PILOT_CL}[data-mp-fin="1"] .mpWx{opacity:0;transition-duration:.25s}
${EOS_PILOT_CL} .mpChop{position:absolute;left:-40px;right:-40px;top:0;bottom:0;opacity:.6;animation:eosPilotMpChop 1.5s ease-in-out infinite alternate;
  background:repeating-linear-gradient(174deg,rgba(200,215,255,0) 0 13px,rgba(200,215,255,.13) 13px 15px),repeating-linear-gradient(6deg,rgba(200,215,255,0) 0 19px,rgba(200,215,255,.1) 19px 21px)}
${EOS_PILOT_CL} .mpGlowR{position:absolute;left:0;right:0;bottom:0;height:70%;background:radial-gradient(62% 72% at 50% 100%,rgba(255,86,46,.42),rgba(255,86,46,0) 70%)}
${EOS_PILOT_CL} .mpSteam{position:absolute;bottom:18%;width:34%;height:26%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,226,214,.2),rgba(255,226,214,0));animation:eosPilotMpSteam 4.4s ease-out calc(var(--i) * -1.45s) infinite}
${EOS_PILOT_CL} .mpFogW{position:absolute;left:-10%;right:-10%;top:-4%;height:46%;background:linear-gradient(180deg,rgba(172,182,206,.55),rgba(150,160,190,.26) 60%,rgba(150,160,190,0))}
${EOS_PILOT_CL} .mpRain{position:absolute;width:46px;height:13px;margin:-6px 0 0 -23px;border-radius:50%;box-shadow:inset 0 0 0 1.3px rgba(206,218,240,.6);animation:eosPilotMpRain 2.3s ease-out calc(var(--i) * -.6s) infinite}
${EOS_PILOT_CL} .mpMote{position:absolute;width:4px;height:4px;border-radius:50%;background:#efe6ff;box-shadow:0 0 5px rgba(220,200,255,.85);animation:eosPilotMpDart 2.7s steps(5,end) calc(var(--i) * -.45s) infinite}

/* the murk leaving an orb: light, mood-tinted wisps that rise away from the picture (never a dark mask over it) */
${EOS_PILOT_CL} [data-kit="pool"] [data-pool="ink"] > i{width:40px;height:26px;margin:-13px 0 0 -20px;background:radial-gradient(closest-side,hsla(var(--mh),32%,66%,.5),hsla(var(--mh),30%,58%,.2) 60%,hsla(var(--mh),30%,58%,0))}
/* the moon path (drawn at the climax), the sweep rings, the shooting star */
${EOS_PILOT_CL} .mpPath{left:0;top:0;width:30px;height:10px;margin-left:-15px;transform-origin:50% 0;opacity:0;z-index:1;transition:opacity .4s ease;border-radius:15px;
  background:radial-gradient(40% 4px at 50% 50%,rgba(255,255,255,.9),rgba(255,255,255,0)) 0 0/100% 22px repeat-y,linear-gradient(90deg,rgba(236,243,255,0),rgba(236,243,255,.42) 35%,rgba(255,250,235,.6) 50%,rgba(236,243,255,.42) 65%,rgba(236,243,255,0));
  -webkit-mask:linear-gradient(180deg,rgba(0,0,0,.25),#000 30%,#000 82%,rgba(0,0,0,.4));mask:linear-gradient(180deg,rgba(0,0,0,.25),#000 30%,#000 82%,rgba(0,0,0,.4))}
${EOS_PILOT_CL}[data-mp-path="1"] .mpPath{opacity:.9}
${EOS_PILOT_CL} .mpSweep{left:-9999px;top:0;width:min(92vw,880px);height:calc(min(92vw,880px) * .3);border-radius:50%;opacity:0;z-index:6;
  box-shadow:inset 0 0 0 2px rgba(226,237,255,.85),0 0 20px rgba(200,220,255,.4)}
${EOS_PILOT_CL} .mpSweep[data-gold="1"]{box-shadow:inset 0 0 0 2.5px rgba(255,224,155,.95),0 0 28px rgba(255,205,120,.6)}
${EOS_PILOT_CL} .mpShoot{left:0;top:0;width:96px;height:2px;margin:-1px 0 0 -96px;transform-origin:100% 50%;opacity:0;z-index:6;border-radius:2px;
  background:linear-gradient(90deg,rgba(255,255,255,0),#fff);box-shadow:0 0 8px rgba(255,255,255,.9)}

/* the lotus: 8 petals, a gold heart (::before), its leaf (::after); STILL sleeps inside the bud */
${EOS_PILOT_CL} .mpLotus{position:absolute;width:var(--L);height:var(--L);translate:-50% -50%;pointer-events:none;isolation:isolate;z-index:2;transition:scale .6s cubic-bezier(.3,.7,.3,1.1)}
${EOS_PILOT_CL} .mpLotus[data-open="1"]{scale:1.3}
${EOS_PILOT_CL} .mpLotus::after{content:"";position:absolute;left:50%;top:72%;width:122%;height:26%;translate:-50% -50%;border-radius:50%;z-index:-1;
  background:radial-gradient(closest-side at 50% 45%,#3d7d5c,#2F6B4F 60%,#1d4636 88%,rgba(29,70,54,0) 100%);box-shadow:0 6px 14px rgba(0,0,10,.35)}
${EOS_PILOT_CL} .mpLotus::before{content:"";position:absolute;left:50%;top:66%;width:64%;height:40%;translate:-50% -50%;border-radius:50%;z-index:2;opacity:.3;transition:opacity .5s ease,width .4s ease,height .4s ease;
  background:radial-gradient(closest-side,rgba(255,240,190,.95),rgba(255,211,122,.55) 45%,rgba(255,211,122,0))}
${EOS_PILOT_CL} .mpLotus[data-hold="1"]::before{opacity:.55}
${EOS_PILOT_CL} .mpLotus[data-stars="1"]::before{opacity:.85}
${EOS_PILOT_CL}[data-mp-gold="1"] .mpLotus::before{opacity:1;width:110%;height:70%}
${EOS_PILOT_CL} .mpLGlow{position:absolute;left:50%;top:60%;width:180%;height:120%;translate:-50% -50%;border-radius:50%;z-index:-2;opacity:.5;
  background:radial-gradient(closest-side,rgba(255,226,170,.28),rgba(255,226,170,0))}
${EOS_PILOT_CL} .mpPetal{position:absolute;left:50%;bottom:27%;width:36%;height:62%;margin-left:-18%;transform-origin:50% 100%;opacity:.92;
  transform:rotate(var(--a0)) scale(.8,.92);transition:transform .5s cubic-bezier(.3,.7,.25,1.06) calc(var(--o) * 70ms)}
${EOS_PILOT_CL} .mpPetal[data-on="1"]{transform:rotate(calc(var(--a0) * 1.9)) scale(.84,.95)}
${EOS_PILOT_CL} .mpLotus[data-open="1"] .mpPetal{transform:rotate(var(--a)) scale(1)}
${EOS_PILOT_CL} .mpPetal::before,${EOS_PILOT_CL} .mpPetal::after{content:"";position:absolute;inset:0;
  clip-path:polygon(50% 0,62% 6%,76% 18%,88% 35%,96% 54%,94% 73%,83% 89%,64% 99%,36% 99%,17% 89%,6% 73%,4% 54%,12% 35%,24% 18%,38% 6%)}
${EOS_PILOT_CL} .mpPetal::before{background:radial-gradient(60% 40% at 50% 92%,rgba(120,50,130,.45),rgba(120,50,130,0) 100%),linear-gradient(180deg,#fff4fa 0%,#f9cfe4 26%,#ee9cc8 58%,#c06aae 86%,#94509f 100%)}
${EOS_PILOT_CL} .mpPetal[data-b="1"]::before{background:radial-gradient(60% 40% at 50% 92%,rgba(90,40,110,.5),rgba(90,40,110,0) 100%),linear-gradient(180deg,#f6dcec 0%,#e9a9cf 30%,#cf78b4 62%,#9a4f9c 90%,#74407e 100%)}
${EOS_PILOT_CL} .mpPetal::after{opacity:0;transition:opacity .5s ease;background:linear-gradient(180deg,#fffbe6 0%,#ffe6ad 40%,rgba(255,196,110,.4) 100%)}
${EOS_PILOT_CL} .mpPetal[data-on="1"]::after{opacity:.6}
${EOS_PILOT_CL}[data-mp-gold="1"] .mpPetal::after{opacity:.8}
${EOS_PILOT_CL} .mpLotus[data-star="1"] .mpPetal:nth-of-type(8)::after{opacity:.95;background:linear-gradient(180deg,#fff6d0,#ffd36a 55%,#f0a83a)}
${EOS_PILOT_CL} .mpStill{position:absolute;left:50%;top:calc(64% - var(--sv,54px) * .4);width:0;height:0;opacity:.6;transition:opacity .4s ease;z-index:0}
${EOS_PILOT_CL} .mpStill[data-awake="1"]{opacity:1;z-index:3}

/* the koi (seen from above), the frog and its pad */
${EOS_PILOT_CL} .mpKoi{left:0;top:0;width:0;height:0;z-index:2;opacity:0;transition:opacity .8s ease}
${EOS_PILOT_CL} .mpKoi[data-on="1"]{opacity:.95}
${EOS_PILOT_CL} .mpKoiJ{position:absolute;left:0;top:0;display:block}
${EOS_PILOT_CL} .mpKoiB{position:absolute;left:-22px;top:-9px;width:44px;height:18px;display:block;transform-origin:70% 50%;animation:eosPilotMpWag 1.3s ease-in-out infinite}
${EOS_PILOT_CL} .mpKoiB::before{content:"";position:absolute;left:10px;top:0;width:34px;height:18px;border-radius:58% 42% 42% 58% / 50%;
  background:radial-gradient(circle at 74% 42%,var(--k1) 0 22%,var(--k2) 46%,var(--k3) 92%);box-shadow:0 0 16px var(--kg),0 0 4px var(--kg)}
${EOS_PILOT_CL} .mpKoiB::after{content:"";position:absolute;left:0;top:2px;width:14px;height:14px;background:var(--k2);opacity:.9;clip-path:polygon(0 0,100% 50%,0 100%,34% 50%)}
${EOS_PILOT_CL} .mpFrogPad{width:46px;height:15px;translate:-50% 0;margin-top:2px;border-radius:50%;z-index:1;
  background:radial-gradient(closest-side at 46% 44%,#5fa77a,#3f8660 60%,#285a47 92%,rgba(40,90,71,0) 100%);-webkit-mask:conic-gradient(from 80deg at 50% 50%,transparent 0 24deg,#000 24deg);mask:conic-gradient(from 80deg at 50% 50%,transparent 0 24deg,#000 24deg)}
${EOS_PILOT_CL} .mpFrog{width:26px;height:19px;margin:-15px 0 0 -13px;z-index:2;border-radius:50% 50% 44% 44%;
  background:radial-gradient(circle at 30% 18%,#fff 0 3px,#1c2a1c 3.4px 4.6px,transparent 5px),radial-gradient(circle at 70% 18%,#fff 0 3px,#1c2a1c 3.4px 4.6px,transparent 5px),radial-gradient(circle at 50% 70%,#a8e08c,#5aa64e 70%,#3f7f3a);
  box-shadow:0 2px 4px rgba(0,0,0,.35)}

/* the orb: one hit = a glass circle with the murk, the rising water, the F8 picture + your words, gloss and rim */
${EOS_PILOT_CL} .mpOrb{position:absolute;width:var(--D);height:var(--D);padding:0;margin:0;border:0;border-radius:50%;background:none;color:inherit;font:inherit;
  touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;--hold-pct:0%;cursor:pointer;overflow:visible;-webkit-user-select:none;user-select:none}
${EOS_PILOT_CL} .mpOrb:disabled{pointer-events:none;cursor:default}
${EOS_PILOT_CL} .mpOrb.isHero{z-index:4}
${EOS_PILOT_CL} .mpOrb :is(.mpLift,.mpBob,.mpBreath){position:absolute;inset:0;border-radius:50%;display:block}
${EOS_PILOT_CL} .mpOrb i{position:absolute;display:block;pointer-events:none}
${EOS_PILOT_CL} .mpGlass{inset:0;border-radius:50%;
  background:radial-gradient(circle at 50% 44%,rgba(150,175,255,.06),rgba(36,48,108,.34) 60%,rgba(165,192,255,.26) 90%,rgba(225,236,255,.5));
  box-shadow:inset 0 0 0 1px rgba(222,236,255,.32),inset 0 -8px 16px rgba(140,170,255,.16),0 8px 20px rgba(0,0,22,.38),0 0 24px hsla(var(--mh),70%,70%,.18)}
${EOS_PILOT_CL} .mpMurk{inset:6%;border-radius:50%;
  background:radial-gradient(64% 58% at 50% 40%,hsla(var(--mh),26%,36%,.7),hsla(var(--mh),24%,30%,.5) 56%,hsla(var(--mh),22%,28%,0) 80%)}
${EOS_PILOT_CL} .mpMurk::before{content:"";position:absolute;inset:-6%;border-radius:50%;
  background:conic-gradient(from 30deg,hsla(var(--mh),26%,40%,.42),hsla(var(--mh),26%,40%,0) 22%,hsla(var(--mh),26%,34%,.38) 45%,hsla(var(--mh),26%,34%,0) 66%,hsla(var(--mh),24%,38%,.4) 86%,hsla(var(--mh),26%,40%,.42));
  -webkit-mask:radial-gradient(closest-side,#000 48%,transparent);mask:radial-gradient(closest-side,#000 48%,transparent);animation:eosPilotMpSwirl 8s linear infinite}
${EOS_PILOT_CL} .mpOrb[data-hold="full"] .mpMurk::before{animation-duration:1.4s}
${EOS_PILOT_CL}[data-mp-m="anger"] .mpOrb:not(.isClear) .mpMurk::after{content:"";position:absolute;left:28%;right:28%;bottom:6%;height:64%;
  background:radial-gradient(circle at 30% 80%,rgba(255,206,180,.55) 0 2px,rgba(255,206,180,0) 3px),radial-gradient(circle at 70% 58%,rgba(255,206,180,.5) 0 1.7px,rgba(255,206,180,0) 2.7px),radial-gradient(circle at 46% 28%,rgba(255,206,180,.45) 0 1.5px,rgba(255,206,180,0) 2.5px);
  animation:eosPilotMpBoil 1.15s linear infinite}
${EOS_PILOT_CL} .mpMurk[data-silver="1"]{background:radial-gradient(64% 58% at 50% 40%,rgba(240,244,255,.95),rgba(205,220,255,.55) 56%,rgba(205,220,255,0) 80%)}
${EOS_PILOT_CL} .mpOrb.isClear .mpMurk{visibility:hidden}
${EOS_PILOT_CL} .mpWin{inset:4%;border-radius:50%;overflow:hidden}
${EOS_PILOT_CL} .mpWin .eosPilotFill{position:absolute;inset:0;display:block;transform:translateY(100%);border-radius:0;
  background:linear-gradient(180deg,rgba(228,250,255,.6) 0,rgba(175,232,255,.34) 5%,rgba(150,220,255,.26));box-shadow:inset 0 2px 0 rgba(255,255,255,.9)}
${EOS_PILOT_CL}[data-eos-pilot-reduced="1"] .mpWin .eosPilotFill{transform:none;opacity:0}
${EOS_PILOT_CL} .mpGloss{left:13%;top:8%;width:36%;height:22%;border-radius:50%;rotate:-28deg;z-index:7;background:radial-gradient(closest-side,rgba(255,255,255,.3),rgba(255,255,255,0))}
${EOS_PILOT_CL} .mpRim{inset:0;border-radius:50%;z-index:7;box-shadow:inset 0 0 0 1.5px rgba(225,238,255,.5);transition:box-shadow .3s ease}
${EOS_PILOT_CL} .mpOrb[data-press="1"] .mpRim,${EOS_PILOT_CL} .mpOrb[data-hold] .mpRim{box-shadow:inset 0 0 0 2px rgba(232,243,255,.9),0 0 20px rgba(170,200,255,.55)}
${EOS_PILOT_CL} .mpOrb[data-hold="full"] .mpRim{box-shadow:inset 0 0 0 3px rgba(255,214,130,.95),0 0 28px rgba(255,205,120,.7)}
${EOS_PILOT_CL} .mpOrb.isClear .mpGlass{background:radial-gradient(circle at 50% 44%,rgba(190,240,255,.14),rgba(70,130,196,.24) 62%,rgba(196,240,255,.46) 92%,rgba(235,252,255,.6));
  box-shadow:inset 0 0 0 1.5px rgba(212,250,255,.7),0 0 28px rgba(130,220,255,.42),0 8px 20px rgba(0,0,22,.3)}
${EOS_PILOT_CL} .mpRefl{left:8%;right:8%;top:94%;height:30%;border-radius:50%;z-index:-1;background:radial-gradient(closest-side,rgba(170,195,255,.24),rgba(170,195,255,0))}
${EOS_PILOT_CL} .mpOrb.isClear .mpRefl{background:radial-gradient(closest-side,rgba(150,230,255,.36),rgba(150,230,255,0))}
${EOS_PILOT_CL} .mpOrb ts-face{z-index:6}
${EOS_PILOT_CL} .mpOrb:not(.isClear) ts-face-text.tsBubbleFaceText{color:#e2e6fb}
${EOS_PILOT_CL} .mpOrb.isClear ts-face-text.tsBubbleFaceText{color:#fff;text-shadow:0 1px 2px rgba(0,20,50,.9),0 0 10px rgba(140,230,255,.65)}
/* the hero: its own glass fogs with each fast breath (panic), steam (anger), its turn glows, its palm warms the glass */
${EOS_PILOT_CL} .mpFog{inset:10%;border-radius:50%;z-index:7;opacity:0;background:radial-gradient(60% 46% at 50% 40%,rgba(235,240,255,.55),rgba(235,240,255,0))}
${EOS_PILOT_CL} .mpPuff{left:20%;right:20%;top:-14%;height:34%;border-radius:50%;z-index:8;opacity:0;background:radial-gradient(closest-side,rgba(255,236,226,.7),rgba(255,236,226,0))}
${EOS_PILOT_CL} .mpOrb.isHero[data-turn="1"]:not(.isClear) .mpRim{animation:eosPilotMpTurn 1.8s ease-in-out infinite}
${EOS_PILOT_CL} .mpOrb.isHero[data-palm="1"] .mpGlass{box-shadow:inset 0 0 0 1px rgba(222,236,255,.32),inset 0 -10px 22px rgba(255,214,160,.22),0 8px 20px rgba(0,0,22,.38),0 0 30px rgba(255,214,160,.26)}
${EOS_PILOT_CL} .mpOrb[data-free="1"] :is(.mpGlass,.mpMurk,.mpWin,.mpGloss,.mpRim,.mpFog,.mpRefl){opacity:0;transition:opacity .35s ease}
${EOS_PILOT_CL} .mpOrb[data-free="1"] ts-face-pic{box-shadow:0 0 0 2px rgba(255,236,190,.9),0 0 22px rgba(255,214,140,.7)}

/* the mirror's weather on the uncleared orbs (amplitude falls with --calm): tremble / shove / sag / restless drift */
${EOS_PILOT_CL} .mpBob{--amp:calc(1 - var(--calm,0) * 1.2)}
${EOS_PILOT_CL}[data-mp-m="panic"] .mpOrb:not(.isClear) .mpBob{animation:eosPilotMpTremble .11s linear calc(var(--i) * -.03s) infinite alternate}
${EOS_PILOT_CL}[data-mp-m="anger"] .mpOrb:not(.isClear) .mpBob{animation:eosPilotMpShove 1.6s cubic-bezier(.3,.7,.3,1) calc(var(--i) * -.37s) infinite}
${EOS_PILOT_CL}[data-mp-m="sad"] .mpBob{transform:translateY(calc(var(--amp) * 11%)) rotate(calc(var(--amp) * var(--tilt) * 1deg));transition:transform .9s ease}
${EOS_PILOT_CL}[data-mp-m="sad"] .mpOrb.isClear .mpBob{transform:none}
${EOS_PILOT_CL}[data-mp-m="anxious"] .mpOrb:not(.isClear) .mpBob{animation:eosPilotMpDrift 2.4s ease-in-out calc(var(--i) * -.5s) infinite}
${EOS_PILOT_CL}[data-mp-fin="1"] .mpBob{animation:none!important}

@keyframes eosPilotMpVeil{from{transform:translateX(-14%)}to{transform:translateX(16%)}}
@keyframes eosPilotMpTw{0%,100%{opacity:.95;scale:1}50%{opacity:.45;scale:.8}}
@keyframes eosPilotMpChop{from{transform:translateX(0)}to{transform:translateX(14px)}}
@keyframes eosPilotMpSteam{0%{transform:translateY(20%) scale(.7);opacity:0}30%{opacity:1}100%{transform:translateY(-120%) scale(1.3);opacity:0}}
@keyframes eosPilotMpRain{0%{transform:scale(.1);opacity:.95}100%{transform:scale(1.45);opacity:0}}
@keyframes eosPilotMpDart{0%{transform:translate(0,0)}20%{transform:translate(9px,-4px)}40%{transform:translate(-6px,3px)}60%{transform:translate(12px,6px)}80%{transform:translate(-3px,-7px)}100%{transform:translate(0,0)}}
@keyframes eosPilotMpSwirl{to{transform:rotate(360deg)}}
@keyframes eosPilotMpBoil{from{transform:translateY(22%);opacity:1}to{transform:translateY(-34%);opacity:.15}}
@keyframes eosPilotMpWag{0%,100%{transform:rotate(-5deg) scaleX(1)}50%{transform:rotate(5deg) scaleX(.94)}}
@keyframes eosPilotMpTurn{0%,100%{box-shadow:inset 0 0 0 1.5px rgba(225,238,255,.55),0 0 10px rgba(200,225,255,.3)}50%{box-shadow:inset 0 0 0 2.5px rgba(240,246,255,.95),0 0 26px rgba(200,225,255,.65)}}
@keyframes eosPilotMpTremble{from{transform:translate(calc(var(--amp) * -1.5px),calc(var(--amp) * .5px))}to{transform:translate(calc(var(--amp) * 1.5px),calc(var(--amp) * -.5px))}}
@keyframes eosPilotMpShove{0%,70%,100%{transform:none}77%{transform:translateX(calc(var(--amp) * 4px)) scale(calc(1 + var(--amp) * .04),calc(1 - var(--amp) * .04))}88%{transform:translateX(calc(var(--amp) * -1.5px))}}
@keyframes eosPilotMpDrift{0%,100%{transform:none}25%{transform:translate(calc(var(--amp) * 3px),calc(var(--amp) * -1.5px))}50%{transform:none}75%{transform:translate(calc(var(--amp) * -3px),calc(var(--amp) * 1.5px))}}

/* reduced motion (OS, framer prop, in-app calm toggle): idle loops stop, transforms snap, colour and faces carry the story */
@media (prefers-reduced-motion: reduce){${eosPilotCleanseCalmCss(EOS_PILOT_CL)}}
${eosPilotCleanseCalmCss(`${EOS_A}[data-eos-calm="1"] .eosPilotArena.eosPilotCleanse`)}
${eosPilotCleanseCalmCss(`${EOS_PILOT_CL}[data-eos-pilot-reduced="1"]`)}
`
eosCss("pilot-cleanse", EOS_PILOT_CLEANSE_CSS)
