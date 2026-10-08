// ===================================================================================
// EOS · 21 · GAME 111 BIG SIGH — the panic hero (also overwhelm / fear / high anxiety; the express-orb target).
// Spec: docs/EOS_SPEC.md §8.0 (engine contract) + §8.1 (this game) + §0.4 (EOS_BREATH, eosBreathOwn, EOS_HAPTIC).
//
// Finger down = air in, finger up = air out:
//   press & hold the breath orb  → inhale 1 fills 0 → 72 % in 2.0 s (notch 1, 8 ms tick)
//   still pressing, slide up ≥ 24 px (or tap with a 2nd finger / ↑ key) → the sip 72 → 100 % in 0.6 s (notch 2);
//     no slide within 1.0 s → the top-up plays by itself while the finger is still down (no fail)
//   let go → the long LINEAR exhale (4.5 → 5.5 → 6 → 6 s, EOS_BREATH.gameOut) blows two storm clouds out to sea.
// 3 sighs (4 when the check-in feeling is 8+). The sky goes storm-violet → dawn gold, SYNC (E44 → E48 → happy →
// E90 asleep on the moon). The game OWNS the shared breath pacer (eosBreathOwn) the whole time it is mounted.
// Never: a heartbeat, lightning, a fail state, a non-soft sfx from an ambient timer.
// Public names: EOS_GAME_111, EosBigSighEngine, EOS_SIGH_CSS. Everything else is EOS_SIGH_* / EosSigh* / eosSigh*.
// ===================================================================================

const EOS_GAME_111 = {
    id: 111,
    name: "BIG SIGH",
    family: "Release",
    engine: "E04",
    prompt: "Where is the storm in you right now?",
    object: "Your words ride six storm clouds over SYNC's tiny island",
    action: "Hold the breath orb, slide up for one more sip, then let go and ride the long exhale",
    mechanism: "Physiological sigh: double inhale, long exhale",
    hook: "Two sips in. One long sigh out.",
    surprise: "Every sigh blows two clouds out to sea until the sun comes up and SYNC falls asleep on the moon.",
    mindBend: "Your exhale is the off-switch. Long out wins.",
    score: "Sighs completed",
    replay: "A new storm rolls in",
    sound: "Rising hum, soft wind and rain",
    notes: "EOS panic hero · 3 sighs (4 when the feeling is 8+) · 25-35 s",
}

// ---------------------------------------------------------------- timings (EOS_BREATH is the source of truth)
const EOS_SIGH_TOP = 0.72 //                       inhale 1 fills to here (notch 1)
const EOS_SIGH_IN_MS = (EOS_BREATH.gameIn || 2) * 1000 // 0 → 72 %
const EOS_SIGH_SIP_MS = (EOS_BREATH.gameSip || 0.6) * 1000 // 72 → 100 %
const EOS_SIGH_AUTO_SIP_MS = 1000 //               no slide → automatic top-up (finger still down)
const EOS_SIGH_FULL_MS = 2500 //                   holding at 100 % → the exhale starts by itself
const EOS_SIGH_PUFF_MS = 450 //                    early lift: the little puff drains back
const EOS_SIGH_SLIDE_PX = 24 //                    sip slide threshold (CSS px ÷ stage scale)
const EOS_SIGH_DONE_DELAY = 450 //                 onDone after 100 %
const EOS_SIGH_TIP_MS = 7000 //                    the once-per-device "dizzy or tingly?" line

// ---------------------------------------------------------------- scene data
// Cloud slots: side = drift direction (out to sea); x/row at a wide arena, px/prow at a narrow one (< 560 px).
// Rows are measured (eosSighLayout): row A along the top of the safe box, row B below it.
const EOS_SIGH_SLOTS = [
    { side: -1, x: 18, row: "A", px: 18, prow: "A", s: 1 },
    { side: -1, x: 39, row: "A", px: 18, prow: "B", s: 0.95 },
    { side: 1, x: 61, row: "A", px: 82, prow: "A", s: 0.97 },
    { side: 1, x: 82, row: "A", px: 82, prow: "B", s: 1 },
    { side: -1, x: 9.5, row: "B", px: 50, prow: "A", s: 0.9 },
    { side: 1, x: 90.5, row: "B", px: 50, prow: "B", s: 0.92 },
]
// Per variant: the cloud pairs in leaving order (one drifts left, one right). Words fill them in this order.
const EOS_SIGH_PAIRS = [
    [[0, 3], [4, 5], [1, 2]],
    [[1, 2], [4, 3], [0, 5]],
    [[4, 5], [1, 3], [0, 2]],
]
// Per variant: island x, sun x, moon x (% of the safe box width).
const EOS_SIGH_LAYOUT = [
    { isle: 50, sun: 32, moon: 93 },
    { isle: 46, sun: 66, moon: 7 },
    { isle: 54, sun: 35, moon: 93 },
]
// Storm palettes (seeded) → dawn palettes (local time of day): the colour script, loud → calm.
const EOS_SIGH_STORMS = [
    { sky: ["#120c33", "#3b1e6e", "#6a2c91"], sea: ["#2a1a5e", "#0b0922"], glow: "196,120,255", cloud: ["#9a8bd0", "#4f4189"] },
    { sky: ["#0e1134", "#26205e", "#4a3a9a"], sea: ["#22225c", "#090a22"], glow: "150,140,255", cloud: ["#8f9ad3", "#454b8c"] },
    { sky: ["#190b2c", "#4a1c5e", "#7a3a8a"], sea: ["#2e1650", "#0d071e"], glow: "230,130,225", cloud: ["#ab89cc", "#5c3b83"] },
]
const EOS_SIGH_DAWNS = {
    dawn: { sky: ["#6f8fe0", "#ffb38a", "#ffd98a"], sea: ["#f3a882", "#2c4c8f"], sun: ["#fff6c8", "#ffc45a"] },
    day: { sky: ["#4fa8ff", "#a8dcff", "#ffe6a3"], sea: ["#8fd2ff", "#1f5fa8"], sun: ["#fffbe0", "#ffd35a"] },
    dusk: { sky: ["#5a4aa8", "#ff8fa3", "#ffc07a"], sea: ["#e98aa0", "#3a2f7a"], sun: ["#fff0c0", "#ff9a4a"] },
    night: { sky: ["#1d2a6b", "#4b4fa8", "#ffcf7a"], sea: ["#5a5fae", "#121a4a"], sun: ["#fff0c0", "#ffb84a"] },
}
// SYNC's faces: storm → first sigh → happy (seeded) → asleep on the moon (the arcade's own cast, no new art).
const EOS_SIGH_FACE = { start: 44, first: 48, happy: [61, 63, 70, 80], asleep: 90 }
// Thought-dust motes that rush into the orb on every inhale (pre-mounted pool).
const EOS_SIGH_MOTES = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.4
    const r = 150 + (i % 3) * 46
    return { mx: Math.round(Math.cos(a) * r), my: Math.round(Math.sin(a) * r * 0.7 - 40), md: (i % 5) * 0.14 }
})
const EOS_SIGH_SPARKS = Array.from({ length: 12 }, (_, i) => ({ a: i * 30 + (i % 2) * 9, r: 96 + (i % 3) * 22 }))
// Cue copy (§2 rules: no clinical words, no "just breathe" / "relax" / "calm down"). [main, sub]
const EOS_SIGH_CUES = {
    start: ["Hold the orb · breathe in through your nose", ""],
    again: ["Again · hold and breathe in", ""],
    in: ["in through the nose…", ""],
    ready: ["…one more sip ↑", "slide up while you hold"],
    sip: ["one more sip…", ""],
    full: ["now let go · slowly out", ""],
    out: ["slowly out through the mouth…", "like through a straw"],
    out1: ["slowly out through the mouth…", "like through a straw · as long as feels ok"],
    puff: ["bigger breath in, then let go", ""],
    easy: ["Breathe however feels easy — the slow out is what matters.", ""],
    done: ["the storm has passed", "SYNC is fast asleep"],
}
const EOS_SIGH_TIP = "Dizzy or tingly? Breathe normally for a moment."
const EOS_SIGH_LABEL = { hold: "HOLD · BREATHE IN", sip: "SIP ONCE MORE", out: "LET IT OUT SLOWLY", done: "STORM PASSED" }
const EOS_SIGH_ARIA = "Breath orb. Press and hold to breathe in, slide up for one more sip, then let go to breathe out slowly."

// Dev/test handle: window.__eos.sigh.state() (window.__eos exists only in dev, core gate).
let eosSighLive = null
function eosSighNow() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()
}
// Measured layout (the arena is rarely the viewport: Framer frames, the arcade HUD and guide). Everything is
// stacked inside the safe box: clouds (rows A/B) on top → SYNC's island on the horizon → the cue → the orb at the
// bottom. Returns CSS variables (px) for the root and the wind ribbon geometry.
function eosSighLayout(W, H, safeTop, safeBottom) {
    const boxH = Math.max(240, H - safeTop - safeBottom)
    const narrow = W < 560
    const cw = Math.round(narrow ? eosClamp((W - 18) / 3, 92, 118) : eosClamp(W / 6.4, 150, 196))
    const cbh = narrow ? 42 : 60
    const puffH = Math.round(cw * 0.2)
    const rowA = puffH
    const rowB = narrow ? rowA + cbh + puffH + 2 : rowA + cbh + 24
    const centreBottom = narrow ? rowB + cbh : rowA + cbh // lowest cloud above SYNC
    const k = 0.16
    const cueH = narrow ? 40 : 46
    const fit = (o) => {
        const hz = boxH - o - o * k - 10 - cueH - 2
        return { hz, sy: (hz - centreBottom - 6) / 1.14 }
    }
    let os = Math.round(Math.min(eosClamp(boxH * (narrow ? 0.31 : 0.36), 100, 184), W * (narrow ? 0.38 : 0.3)))
    let L = fit(os)
    while (L.sy < (narrow ? 56 : 70) && os > 100) {
        os -= 4
        L = fit(os)
    }
    const sy = Math.round(eosClamp(L.sy, 40, narrow ? 76 : 96))
    const hz = Math.round(L.hz)
    // wind ribbons: from the orb up to where the clouds sail away (arena px)
    const ox = W / 2
    const oy = safeTop + boxH - os * 0.62
    const ty = safeTop + rowB + cbh * 0.5
    const ty2 = safeTop + hz * 0.82
    const wind = [
        `M${ox} ${oy} C ${ox - W * 0.06} ${oy - (oy - ty) * 0.35}, ${ox - W * 0.22} ${ty + (oy - ty) * 0.15}, ${W * 0.03} ${ty}`,
        `M${ox} ${oy} C ${ox + W * 0.06} ${oy - (oy - ty) * 0.35}, ${ox + W * 0.22} ${ty + (oy - ty) * 0.15}, ${W * 0.97} ${ty}`,
        `M${ox} ${oy + 8} C ${ox - W * 0.12} ${oy - (oy - ty2) * 0.2}, ${ox - W * 0.3} ${ty2}, ${-W * 0.02} ${ty2 - 20}`,
        `M${ox} ${oy + 8} C ${ox + W * 0.12} ${oy - (oy - ty2) * 0.2}, ${ox + W * 0.3} ${ty2}, ${W * 1.02} ${ty2 - 20}`,
    ].map((d) => d.replace(/(\d+\.\d)\d+/g, "$1"))
    return {
        narrow,
        W: Math.round(W),
        H: Math.round(H),
        wind,
        vars: { "--os": `${os}px`, "--cw": `${cw}px`, "--cbh": `${cbh}px`, "--rowA": `${rowA}px`, "--rowB": `${rowB}px`, "--hzpx": `${hz}px`, "--sy": `${sy}px`, "--mn": `${narrow ? 50 : 66}px`, "--sun": `${narrow ? 104 : 150}px` },
    }
}
// Cloud captions: the user's words (eosWords pads with the feeling's seeds; neutral words under a strong flag).
function eosSighWords(entries) {
    const list = eosWords(entries, 6).filter((w) => w && !/uploaded image/i.test(w))
    if (list.length) return list
    const emo = EOS_EMO[eosCurrentEmotion()] || EOS_EMO.panic
    return emo.seeds.slice(0, 3)
}
// Which clouds leave on each sigh: n sighs over 6 clouds (3 → 2·2·2, 4 → 2·2·1·1).
function eosSighGroups(pairs, n) {
    if (n <= 3) return pairs.map((p) => p.slice())
    return [pairs[0].slice(), pairs[1].slice(), [pairs[2][0]], [pairs[2][1]]]
}

function EosBigSighEngine({ game, entries = [], onProgress, onDone, sfx, rainSfx, reduced, imageSources, hasUserImages, variationSeed }) {
    useEosStore()
    const red = eosCalm(reduced)
    const rootRef = React.useRef(null)
    const orbRef = React.useRef(null)
    const cbRef = React.useRef({})
    cbRef.current = { onProgress, onDone, sfx, rainSfx }

    // ---- per-mount constants (a replay remounts the engine → a new storm)
    const setup = React.useMemo(() => {
        const st = EOS_STORE.get()
        const n = Number(st.before) >= 8 ? 4 : 3
        const seed = Math.abs(Math.round(Number(variationSeed) || 1))
        const v = seed % 3
        const pairs = EOS_SIGH_PAIRS[v]
        const order = pairs.flat()
        return {
            n,
            v,
            order,
            groups: eosSighGroups(pairs, n),
            layout: EOS_SIGH_LAYOUT[v],
            storm: EOS_SIGH_STORMS[(seed + Math.floor(seed / 3)) % 3],
            day: eosDayPart(),
            happy: EOS_SIGH_FACE.happy[seed % EOS_SIGH_FACE.happy.length],
        }
    }, [])
    const words = React.useMemo(() => eosSighWords(entries), [(entries || []).join("|")])
    const thumbs = hasUserImages ? (imageSources || []).filter(Boolean).slice(0, 6) : []
    // slot → caption / thumbnail (filled in leaving order, so the first words leave first)
    const slotWord = {}
    const slotThumb = {}
    setup.order.forEach((slot, i) => {
        if (words[i]) slotWord[slot] = words[i]
        if (thumbs[i]) slotThumb[slot] = thumbs[i]
    })

    // ---- UI state (few changes per breath; per-frame values live in refs + the --f CSS variable)
    const [ui, setUi] = React.useState({
        phase: "idle", // idle · in · ready · sip · full · out · puff · done
        done: 0, //       completed sighs
        clr: 0, //        how clear the sky is (0 storm → 1 dawn)
        gone: [], //      cloud slots that left
        cue: "start",
        count: null,
        n1: false,
        n2: false,
        face: EOS_SIGH_FACE.start,
        pop: "", //       face-change squash toggle
        bloom: "", //     sigh-complete burst toggle (a/b restarts the CSS animation without remounting)
        big: false,
        puff: "",
        wind: "",
        D: 4500,
        tip: false,
    })
    const patch = (p) => setUi((u) => ({ ...u, ...p }))
    const [geo, setGeo] = React.useState(null) // measured layout (eosSighLayout)

    // ---- the breath machine (refs only; one rAF loop)
    const S = React.useRef(null)
    if (!S.current)
        S.current = {
            alive: false,
            phase: "idle",
            t0: eosSighNow(),
            f: 0,
            f0: 0,
            painted: -1,
            cycle: 0,
            pointer: null, //   pointerId | "key" | null
            lowY: 0,
            lastY: 0,
            pendingOut: false,
            early: 0, //       consecutive early lifts
            puffs: 0, //       total early lifts (bonus)
            easy: false, //    after 2 early lifts: any hold ≥ 450 ms counts
            D: 4500,
            prog: -1,
            count: null,
            doneSent: false,
            lastAck: 0,
            ab: { bloom: 0, puff: 0, wind: 0, pop: 0, sq: 0, ack: 0 },
            timers: [],
        }

    const fx = {
        sfx(kind) {
            try {
                cbRef.current.sfx?.(kind)
            } catch {}
        },
        report(v, label) {
            const s = S.current
            if (!s.alive || s.doneSent) return
            const n = Math.max(0, Math.min(100, Math.round(v)))
            if (n <= s.prog) return
            s.prog = n
            try {
                cbRef.current.onProgress?.(n, label)
            } catch {}
        },
        toggle(key) {
            const s = S.current
            s.ab[key] = (s.ab[key] + 1) % 2
            return s.ab[key] ? "a" : "b"
        },
        // instant (same-frame) squash on the orb — a DOM attribute, so it never waits for React
        squash() {
            const w = orbRef.current
            if (w) w.setAttribute("data-sq", fx.toggle("sq"))
        },
        ack() {
            const s = S.current
            const t = eosSighNow()
            if (t - s.lastAck < 260) return
            s.lastAck = t
            fx.sfx("soft")
            eosTone(330, 90, { type: "sine", gain: 0.02 })
            eosHaptic("touch")
            const w = orbRef.current
            if (w) w.setAttribute("data-ack", fx.toggle("ack"))
        },
    }
    const base = () => Math.round((S.current.cycle * 100) / setup.n)
    const go = (phase, extra) => {
        const s = S.current
        s.phase = phase
        s.t0 = eosSighNow()
        patch({ phase, ...(extra || {}) })
    }

    // ---- transitions
    const press = () => {
        const s = S.current
        if (!s.alive) return
        if (s.phase !== "idle" && s.phase !== "puff") return fx.ack()
        s.f0 = s.phase === "puff" ? s.f : 0
        s.pendingOut = false
        go("in", { cue: "in", n1: false, n2: false })
        const left = Math.max(300, ((EOS_SIGH_TOP - s.f0) / EOS_SIGH_TOP) * EOS_SIGH_IN_MS)
        eosBreathOwn("in", left)
        fx.sfx("soft")
        eosTone(174, Math.min(2000, left), { type: "sine", gain: 0.035, glide: 262 })
        eosHaptic("touch")
        fx.squash()
        try {
            eosApi("dots").pulse?.("in")
        } catch {}
        fx.report(base() + 3, EOS_SIGH_LABEL.hold)
    }
    const toReady = () => {
        const s = S.current
        go("ready", { cue: "ready", n1: true })
        eosBreathOwn("hold", EOS_SIGH_AUTO_SIP_MS)
        eosHaptic("notch")
        eosTone(eosNote(5, 262), 110, { type: "triangle", gain: 0.04 })
        fx.report(base() + 6, EOS_SIGH_LABEL.sip)
        // slid up early (during inhale 1) → that slide counts now
        const k = eosStageScale(rootRef.current) || 1
        if (s.pointer != null && s.pointer !== "key" && (s.lowY - s.lastY) / k >= EOS_SIGH_SLIDE_PX) sip()
    }
    const sip = () => {
        const s = S.current
        if (s.phase !== "ready" && s.phase !== "in") return
        s.f0 = s.f
        go("sip", { cue: "sip", n1: true })
        eosBreathOwn("in", EOS_SIGH_SIP_MS)
        eosHaptic("notch")
        eosTone(eosNote(7, 262), 260, { type: "sine", gain: 0.05, glide: eosNote(9, 262) })
        fx.squash()
        fx.report(base() + 8, EOS_SIGH_LABEL.out)
    }
    const sipEnd = () => {
        const s = S.current
        patch({ n2: true })
        eosHaptic("notch")
        eosTone(eosNote(9, 262), 120, { type: "triangle", gain: 0.035 })
        if (s.pointer != null && !s.pendingOut) {
            go("full", { cue: "full" })
            eosBreathOwn("hold", EOS_SIGH_FULL_MS)
        } else startOut()
    }
    const startOut = () => {
        const s = S.current
        const c = s.cycle
        const outs = EOS_BREATH.gameOut || [4.5, 5.5, 6, 6]
        const D = Math.round((outs[Math.min(c, outs.length - 1)] || 6) * 1000)
        s.D = D
        s.f0 = s.f
        s.pendingOut = false
        s.pointer = null // input is ignored during the exhale
        const leaving = setup.groups[c] || []
        setUi((u) => ({
            ...u,
            phase: "out",
            cue: c === 0 ? "out1" : "out",
            D,
            clr: Math.min(1, (c + 1) / setup.n),
            gone: u.gone.concat(leaving.filter((x) => !u.gone.includes(x))),
            wind: fx.toggle("wind"),
            n1: true,
            n2: true,
        }))
        s.phase = "out"
        s.t0 = eosSighNow()
        eosBreathOwn("out", D)
        eosHaptic("exhale")
        try {
            eosApi("dots").pulse?.("out")
        } catch {}
        try {
            cbRef.current.rainSfx?.(D / 1000)
        } catch {}
        eosTone(262, Math.min(D, 3200), { type: "sine", gain: 0.02, glide: 131 })
        fx.report(base() + 10, EOS_SIGH_LABEL.out)
    }
    const puff = () => {
        const s = S.current
        s.early += 1
        s.puffs += 1
        if (s.early >= 2) s.easy = true
        s.f0 = s.f
        go("puff", { cue: s.early >= 2 ? "easy" : "puff", puff: fx.toggle("puff"), n1: false })
        eosBreathOwn("hold", 0)
        eosTone(220, 180, { type: "sine", gain: 0.03, glide: 180 })
        eosHaptic("touch")
    }
    const sighDone = () => {
        const s = S.current
        s.cycle += 1
        s.early = 0
        const c = s.cycle
        const last = c >= setup.n
        const face = last ? setup.happy : c === 1 ? EOS_SIGH_FACE.first : c === setup.n - 1 ? setup.happy : null
        // one scored step per completed sigh (the consequence of the player's own release — never ambient)
        fx.sfx("chime")
        eosHaptic("hit")
        eosTone(eosNote(4 + c * 2, 262), 420, { type: "triangle", gain: 0.04 })
        const p = { done: c, bloom: fx.toggle("bloom"), big: false, count: null, n1: false, n2: false }
        if (face != null) {
            p.face = face
            p.pop = fx.toggle("pop")
        }
        s.count = null
        if (!last) {
            go("idle", { ...p, cue: "again" })
            eosBreathOwn("hold", 0)
            fx.report((c * 100) / setup.n, EOS_SIGH_LABEL.hold)
            return
        }
        // finale: sunrise, SYNC floats up and falls asleep on the moon
        go("done", { ...p, cue: "done", big: true })
        fx.report(100, EOS_SIGH_LABEL.done)
        eosBreathOwn(null)
        fx.sfx("win")
        eosHaptic("finish")
        ;[5, 7, 9, 10].forEach((n, i) => eosTone(eosNote(n, 262), 520, { type: "triangle", gain: 0.035, at: i * 0.13 }))
        const bonus = Math.max(260, Math.min(360, 280 + (setup.n - 3) * 20 + (s.puffs === 0 ? 30 : 0)))
        s.timers.push(
            setTimeout(() => {
                if (!s.alive || s.doneSent) return
                s.doneSent = true
                try {
                    cbRef.current.onDone?.(bonus)
                } catch {}
            }, EOS_SIGH_DONE_DELAY)
        )
    }
    const release = () => {
        const s = S.current
        const ph = s.phase
        s.pointer = null
        if (ph === "in") {
            if (s.easy && eosSighNow() - s.t0 >= 450) {
                // "the slow out is what matters": a kind top-up, then the exhale
                s.pendingOut = true
                return sip()
            }
            return puff()
        }
        if (ph === "ready") return startOut() // let go at 72 % → the exhale still counts
        if (ph === "sip") {
            s.pendingOut = true
            return
        }
        if (ph === "full") return startOut()
    }
    const requestSip = () => {
        const s = S.current
        if (s.phase === "ready") sip()
        else if (s.phase !== "in") fx.ack()
    }

    // ---- per-frame step (rAF): fill level, phase timers, the 1 Hz count
    const step = () => {
        const s = S.current
        if (!s.alive) return
        const t = eosSighNow() - s.t0
        let count = null
        if (s.phase === "in") {
            const f = Math.min(EOS_SIGH_TOP, s.f0 + (t / EOS_SIGH_IN_MS) * EOS_SIGH_TOP)
            count = Math.max(1, Math.ceil(((EOS_SIGH_TOP - f) / EOS_SIGH_TOP) * (EOS_SIGH_IN_MS / 1000)))
            s.f = f
            if (f >= EOS_SIGH_TOP - 1e-4) {
                s.f = EOS_SIGH_TOP
                toReady()
            }
        } else if (s.phase === "ready") {
            s.f = EOS_SIGH_TOP
            if (t >= EOS_SIGH_AUTO_SIP_MS) sip()
        } else if (s.phase === "sip") {
            const k = Math.min(1, t / EOS_SIGH_SIP_MS)
            s.f = s.f0 + (1 - s.f0) * k
            if (k >= 1) {
                s.f = 1
                sipEnd()
            }
        } else if (s.phase === "full") {
            s.f = 1
            if (t >= EOS_SIGH_FULL_MS) startOut()
        } else if (s.phase === "out") {
            const k = Math.min(1, t / Math.max(1, s.D))
            s.f = s.f0 * (1 - k) // LINEAR drain ("like through a straw")
            count = Math.max(1, Math.ceil((s.D - t) / 1000))
            if (k >= 1) {
                s.f = 0
                sighDone()
            }
        } else if (s.phase === "puff") {
            const k = Math.min(1, t / EOS_SIGH_PUFF_MS)
            s.f = s.f0 * (1 - k)
            if (k >= 1) {
                s.f = 0
                go("idle")
            }
        }
        if (s.phase !== "in" && s.phase !== "out") count = null
        if (count !== s.count) {
            s.count = count
            patch({ count })
        }
        const w = orbRef.current
        if (w && Math.abs(s.painted - s.f) > 0.002) {
            s.painted = s.f
            w.style.setProperty("--f", s.f.toFixed(4))
        }
    }

    // ---- measured layout (before paint; re-measured on resize)
    eosLayoutEffect(() => {
        const root = rootRef.current
        if (!root) return
        const measure = () => {
            try {
                const k = eosStageScale(root) || 1
                const r = root.getBoundingClientRect()
                const cs = getComputedStyle(root)
                const st = parseFloat(cs.getPropertyValue("--eos-safe-top")) || 48
                const sb = parseFloat(cs.getPropertyValue("--eos-safe-bottom")) || 200
                const L = eosSighLayout(r.width / k, r.height / k, st, sb)
                for (const key in L.vars) root.style.setProperty(key, L.vars[key])
                setGeo((g) => (g && g.W === L.W && g.H === L.H ? g : L))
            } catch {}
        }
        measure()
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
        if (ro) ro.observe(root)
        return () => {
            if (ro) ro.disconnect()
        }
    }, [])

    // ---- mount: progress 0, pacer, rAF, keyboard, the once-per-device tip
    React.useEffect(() => {
        const s = S.current
        s.alive = true
        s.t0 = eosSighNow()
        eosSighLive = { S: s, setup }
        if (s.prog < 0) {
            s.prog = 0
            try {
                cbRef.current.onProgress?.(0, EOS_SIGH_LABEL.hold)
            } catch {}
        }
        if (s.phase === "idle") eosBreathOwn("hold", 0)
        let raf = 0
        const tick = () => {
            raf = requestAnimationFrame(tick)
            step()
        }
        raf = requestAnimationFrame(tick)
        try {
            if (!eosPrefs().sighTip) {
                eosSetPref("sighTip", true)
                patch({ tip: true })
                s.timers.push(setTimeout(() => s.alive && patch({ tip: false }), EOS_SIGH_TIP_MS))
            }
        } catch {}
        const isKey = (e) => e.key === " " || e.key === "Spacebar" || e.key === "Enter"
        const mine = () => {
            const root = rootRef.current
            if (!root || !root.isConnected) return false
            const a = typeof document !== "undefined" ? document.activeElement : null
            return !a || a === document.body || root.contains(a)
        }
        const kd = (e) => {
            if (!mine()) return
            if (isKey(e)) {
                e.preventDefault()
                if (e.repeat) return
                if (s.pointer == null && (s.phase === "idle" || s.phase === "puff")) {
                    s.pointer = "key"
                    press()
                } else if (s.pointer != null && s.phase === "ready") requestSip()
                else if (s.pointer == null) fx.ack()
            } else if (e.key === "ArrowUp" && s.pointer != null) {
                e.preventDefault()
                requestSip()
            }
        }
        const ku = (e) => {
            if (isKey(e) && s.pointer === "key") {
                e.preventDefault()
                release()
            }
        }
        window.addEventListener("keydown", kd)
        window.addEventListener("keyup", ku)
        return () => {
            s.alive = false
            cancelAnimationFrame(raf)
            s.timers.forEach(clearTimeout)
            s.timers = []
            window.removeEventListener("keydown", kd)
            window.removeEventListener("keyup", ku)
            eosBreathOwn(null)
            if (eosSighLive && eosSighLive.S === s) eosSighLive = null
        }
    }, [])

    // ---- pointer: the whole arena is the breath pad (the orb is the target; a press anywhere also works)
    const onDown = (e) => {
        const s = S.current
        if (e.pointerType === "mouse" && e.button !== 0) return
        if (s.pointer != null && s.pointer !== e.pointerId) {
            // a 2nd finger while holding = the sip
            if (s.phase === "ready") requestSip()
            return
        }
        if (s.phase === "idle" || s.phase === "puff") {
            s.pointer = e.pointerId
            s.lowY = e.clientY
            s.lastY = e.clientY
            try {
                e.currentTarget.setPointerCapture(e.pointerId)
            } catch {}
            press()
        } else fx.ack()
    }
    const onMove = (e) => {
        const s = S.current
        if (s.pointer !== e.pointerId) return
        s.lastY = e.clientY
        if (s.phase === "in") s.lowY = Math.max(s.lowY, e.clientY)
        if (s.phase === "ready") {
            const k = eosStageScale(rootRef.current) || 1
            if ((s.lowY - e.clientY) / k >= EOS_SIGH_SLIDE_PX) requestSip()
            else s.lowY = Math.max(s.lowY, e.clientY)
        }
    }
    const onUp = (e) => {
        const s = S.current
        if (s.pointer == null || s.pointer !== e.pointerId) return
        release()
    }

    // ---- render
    const { layout, storm } = setup
    const dawn = EOS_SIGH_DAWNS[setup.day] || EOS_SIGH_DAWNS.dawn
    const rootStyle = {
        "--clr": ui.clr,
        "--D": `${ui.D}ms`,
        "--st1": storm.sky[0],
        "--st2": storm.sky[1],
        "--st3": storm.sky[2],
        "--ss1": storm.sea[0],
        "--ss2": storm.sea[1],
        "--sg": storm.glow,
        "--sc1": storm.cloud[0],
        "--sc2": storm.cloud[1],
        "--dw1": dawn.sky[0],
        "--dw2": dawn.sky[1],
        "--dw3": dawn.sky[2],
        "--ds1": dawn.sea[0],
        "--ds2": dawn.sea[1],
        "--su1": dawn.sun[0],
        "--su2": dawn.sun[1],
        "--islx": `${layout.isle}%`,
        "--sunx": `${layout.sun}%`,
        "--moonx": `${layout.moon}%`,
    }
    const ph = ui.phase
    const marker =
        ph === "idle" || ph === "in" || ph === "puff"
            ? eosTarget({ g: "hold", ms: EOS_SIGH_IN_MS, label: EOS_SIGH_LABEL.hold })
            : ph === "ready"
              ? eosTarget({ g: "drag", dir: "u", d: 30, label: "SIP MORE ↑" })
              : {}
    const cue = EOS_SIGH_CUES[ui.cue === "start" && ui.done > 0 ? "again" : ui.cue] || EOS_SIGH_CUES.start
    const countWord = ph === "in" ? "in" : ph === "out" ? "out" : ph === "ready" || ph === "sip" ? "sip" : ph === "full" ? "let go" : ""
    const countBig = ph === "in" || ph === "out" ? (ui.count == null ? "" : String(ui.count)) : ph === "ready" || ph === "sip" ? "↑" : ""
    const pips = Array.from({ length: setup.n }, (_, i) => i)
    return (
        <div
            ref={rootRef}
            className="arena eosArena eosG111 fs-mask"
            {...EOS_PRIVATE_ATTRS}
            data-phase={ph}
            data-calm={red ? "1" : "0"}
            data-day={setup.day}
            data-narrow={geo && geo.narrow ? "1" : "0"}
            data-v={setup.v}
            style={rootStyle}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
        >
            {/* layer 1 · sky (storm → dawn), stars, the soft storm glow (≤ 0.25 Hz, low contrast, no lightning) */}
            <div className="eosSighSky" aria-hidden="true">
                <i className="eosSighSkyStorm" />
                <i className="eosSighSkyDawn" />
                <i className="eosSighStars" />
                <i className="eosSighStorm">
                    <b />
                </i>
            </div>
            <div className="eosSighSafe eosSighBack" aria-hidden="true">
                <i className="eosSighSun" />
                <div className="eosSighMoon">
                    <i className="eosSighMoonFace" />
                    <img className="eosSighMoonSync" src={eosFace("sync", EOS_SIGH_FACE.asleep)} alt="" draggable={false} />
                </div>
            </div>
            {/* layer 2 · the sea with the sunrise glint */}
            <div className="eosSighSea" aria-hidden="true">
                <i className="eosSighSeaDawn" />
                <i className="eosSighWaves" />
                <i className="eosSighGlint" />
            </div>
            {/* layer 3 · SYNC's island + the six storm clouds carrying the words */}
            <div className="eosSighSafe eosSighFront">
                <div className="eosSighIsle" aria-hidden="true">
                    <i className="eosSighIsleLand">
                        <b className="eosSighPalm">
                            <i />
                            <i />
                            <i />
                            <i />
                        </b>
                    </i>
                    <div className="eosSighSync" data-pop={ui.pop}>
                        <i className="eosSighSyncGlow" />
                        <img className="eosSighSyncFace" src={eosFace("sync", ui.face)} alt="" draggable={false} />
                    </div>
                </div>
                <div className="eosSighClouds">
                    {EOS_SIGH_SLOTS.map((sl, i) => {
                        const gone = ui.gone.includes(i)
                        const w = slotWord[i]
                        const th = slotThumb[i]
                        return (
                            <div
                                key={i}
                                className={`eosSighCloud ${w || th ? "hasWord" : ""}`}
                                data-gone={gone ? "1" : "0"}
                                style={{
                                    "--x": `${sl.x}%`,
                                    "--y": `var(--row${sl.row})`,
                                    "--px": `${sl.px}%`,
                                    "--py": `var(--row${sl.prow})`,
                                    "--s": sl.s,
                                    "--gx": `${sl.side * 46}vw`,
                                    "--bob": `${(6 + (i % 3) * 1.3).toFixed(1)}s`,
                                    "--bd": `${(-i * 0.9).toFixed(1)}s`,
                                }}
                            >
                                <i className="eosSighRain" aria-hidden="true" />
                                <div className="eosSighCloudFloat">
                                    <span className="eosSighPuffs" aria-hidden="true">
                                        <i />
                                        <i />
                                        <i />
                                    </span>
                                    <div className="eosSighCloudBody">
                                        {th ? <img className="eosSighThumb" src={th} alt="" draggable={false} /> : null}
                                        {w ? <EosWord text={w} className="eosSighWord" /> : null}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className={`eosSighTip ${ui.tip ? "isOn" : ""}`} aria-hidden={ui.tip ? undefined : "true"}>
                    {EOS_SIGH_TIP}
                </div>
            </div>
            {/* the wind ribbon that carries the exhale out to sea */}
            {geo ? (
                <svg className="eosSighWind" data-w={ui.wind} viewBox={`0 0 ${geo.W} ${geo.H}`} preserveAspectRatio="none" aria-hidden="true">
                    {geo.wind.map((d, i) => (
                        <path key={i} className={i > 1 ? "w2" : ""} pathLength="100" d={d} />
                    ))}
                </svg>
            ) : null}
            {/* foreground · the breath orb (centre-low, above the safe-bottom line) */}
            <div className="eosSighOrbWrap" ref={orbRef} data-n1={ui.n1 ? "1" : "0"} data-n2={ui.n2 ? "1" : "0"}>
                <div className="eosSighCue" aria-live="polite">
                    <b>{cue[0]}</b>
                    {cue[1] ? <small>{cue[1]}</small> : null}
                    <span className="eosSrOnly">{`Sigh ${Math.min(ui.done + (ph === "done" ? 0 : 1), setup.n)} of ${setup.n}.`}</span>
                </div>
                <div className="eosSighPips" aria-hidden="true">
                    {pips.map((i) => (
                        <i key={i} className={i < ui.done ? "on" : ""} />
                    ))}
                </div>
                <div className="eosSighMotes" aria-hidden="true">
                    {EOS_SIGH_MOTES.map((m, i) => (
                        <i key={i} className="eosSighMote" style={{ "--mx": `${m.mx}px`, "--my": `${m.my}px`, "--md": `${m.md}s` }} />
                    ))}
                </div>
                <button type="button" className="eosSighOrb" aria-label={EOS_SIGH_ARIA} {...marker}>
                    <span className="eosSighOrbSquash">
                        <span className="eosSighOrbScale">
                            <span className="eosSighOrbHalo" />
                            <span className="eosSighOrbBall">
                                <span className="eosSighOrbFill">
                                    <i className="eosSighOrbGold" />
                                    <i className="eosSighOrbWave" />
                                </span>
                                <span className="eosSighOrbSunny" />
                                <span className="eosSighOrbGloss" />
                                <span className="eosSighOrbCount" aria-hidden="true">
                                    {countWord ? <small>{countWord}</small> : null}
                                    {countBig ? <b>{countBig}</b> : null}
                                </span>
                            </span>
                            <svg className="eosSighRing" viewBox="0 0 100 100" aria-hidden="true">
                                <circle className="eosSighRingTrack" cx="50" cy="50" r="46" />
                                <circle className="eosSighRingArc" cx="50" cy="50" r="46" pathLength="100" transform="rotate(-90 50 50)" />
                                <circle className="eosSighNotch n1" cx="4.81" cy="58.62" r="3.6" />
                                <circle className="eosSighNotch n2" cx="50" cy="4" r="3.6" />
                            </svg>
                        </span>
                    </span>
                </button>
                <div className="eosSighPuffFx" data-p={ui.puff} aria-hidden="true" />
                <div className="eosSighBloom" data-b={ui.bloom} data-big={ui.big ? "1" : "0"} aria-hidden="true">
                    <b />
                    {EOS_SIGH_SPARKS.map((sp, i) => (
                        <i key={i} style={{ "--a": `${sp.a}deg`, "--r": `${sp.r}px` }} />
                    ))}
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- CSS (every rule under ${EOS_A} .eosG111)
const EOS_SIGH_R = `${EOS_A} .eosG111`
const EOS_SIGH_CSS = `
${EOS_SIGH_R}{--hzpx:200px;--os:160px;--cw:190px;--cbh:60px;--rowA:38px;--rowB:124px;--mn:66px;--sy:90px;--sun:150px;--k:.16;--og:190,150,255;--f:0;background:var(--st1);color:#fff;font-family:var(--eos-font);cursor:default;isolation:isolate}
${EOS_SIGH_R}[data-calm="1"]{--k:.04}
${EOS_SIGH_R} .eosSighSky,${EOS_SIGH_R} .eosSighSky>i{position:absolute;inset:0;pointer-events:none;display:block}
${EOS_SIGH_R} .eosSighSkyStorm{background:linear-gradient(180deg,var(--st1) 0%,var(--st2) 30%,var(--st3) 50%)}
${EOS_SIGH_R} .eosSighSkyDawn{background:linear-gradient(180deg,var(--dw1) 0%,var(--dw2) 30%,var(--dw3) 50%);opacity:var(--clr);transition:opacity var(--D) ease-in-out}
${EOS_SIGH_R} .eosSighStars{bottom:45%!important;opacity:calc(.22 + var(--clr) * .6);transition:opacity var(--D);background-image:radial-gradient(1.6px 1.6px at 8% 22%,#fff 50%,transparent 52%),radial-gradient(1.4px 1.4px at 19% 9%,#fff 50%,transparent 52%),radial-gradient(2px 2px at 31% 30%,#fff 50%,transparent 52%),radial-gradient(1.4px 1.4px at 44% 12%,#fff 50%,transparent 52%),radial-gradient(1.8px 1.8px at 57% 26%,#fff 50%,transparent 52%),radial-gradient(1.4px 1.4px at 66% 7%,#fff 50%,transparent 52%),radial-gradient(2px 2px at 78% 24%,#fff 50%,transparent 52%),radial-gradient(1.5px 1.5px at 91% 14%,#fff 50%,transparent 52%),radial-gradient(1.3px 1.3px at 13% 40%,#fff 50%,transparent 52%),radial-gradient(1.6px 1.6px at 51% 44%,#fff 50%,transparent 52%),radial-gradient(1.3px 1.3px at 86% 42%,#fff 50%,transparent 52%),radial-gradient(1.5px 1.5px at 37% 52%,#fff 50%,transparent 52%)}
${EOS_SIGH_R} .eosSighStorm{opacity:calc(1 - var(--clr));transition:opacity var(--D) ease-in-out}
${EOS_SIGH_R} .eosSighStorm>b{position:absolute;left:-10%;right:-10%;top:0;height:62%;display:block;background:radial-gradient(55% 60% at 50% 32%,rgba(var(--sg),.34),rgba(var(--sg),0) 72%);animation:eosSighStormGlow 4.6s ease-in-out infinite alternate}
${EOS_SIGH_R} .eosSighSafe{position:absolute;left:0;right:0;top:var(--eos-safe-top);bottom:var(--eos-safe-bottom);pointer-events:none}
${EOS_SIGH_R} .eosSighBack{z-index:1}
${EOS_SIGH_R} .eosSighFront{z-index:3}
${EOS_SIGH_R} .eosSighSun{position:absolute;left:var(--sunx);top:var(--hzpx);width:var(--sun);height:var(--sun);margin:calc(var(--sun) / -2) 0 0 calc(var(--sun) / -2);border-radius:50%;background:radial-gradient(circle at 50% 42%,var(--su1),var(--su2) 72%);box-shadow:0 0 50px 16px rgba(255,196,96,.42),0 0 150px 60px rgba(255,170,90,.24);opacity:calc(.25 + var(--clr) * .75);transform:translateY(calc((1 - var(--clr)) * 70% - 28%));transition:transform var(--D) ease-in-out,opacity var(--D) ease-in-out}
${EOS_SIGH_R}[data-calm="1"] .eosSighSun{transform:translateY(-28%);opacity:var(--clr)}
${EOS_SIGH_R} .eosSighMoon{position:absolute;left:var(--moonx);top:0;width:var(--mn);height:var(--mn);margin-left:calc(var(--mn) / -2);opacity:calc(.5 + var(--clr) * .5);transition:opacity var(--D)}
${EOS_SIGH_R} .eosSighMoonFace{position:absolute;inset:0;display:block;border-radius:50%;box-shadow:inset calc(var(--mn) * -.26) calc(var(--mn) * .08) 0 0 #ffe7a8;filter:drop-shadow(0 0 12px rgba(255,231,168,.6))}
${EOS_SIGH_R} .eosSighMoonSync{position:absolute;left:4%;bottom:6%;width:78%;height:78%;object-fit:contain;opacity:0;transform:translateY(14px) scale(.7);transition:opacity 1.1s ease .7s,transform 1.4s cubic-bezier(.3,1.4,.5,1) .7s;filter:drop-shadow(-2px -2px 0 rgba(255,226,170,.6)) drop-shadow(2px 0 0 rgba(150,215,255,.7)) drop-shadow(0 4px 6px rgba(0,0,0,.35));pointer-events:none}
${EOS_SIGH_R}[data-phase="done"] .eosSighMoonSync{opacity:1;transform:none}
${EOS_SIGH_R}[data-phase="done"][data-calm="1"] .eosSighMoonSync{transition:opacity 1.1s ease .5s}
${EOS_SIGH_R}[data-calm="1"] .eosSighMoonSync{transform:none}
${EOS_SIGH_R} .eosSighSea{position:absolute;left:0;right:0;bottom:0;top:calc(var(--eos-safe-top) + var(--hzpx));z-index:2;overflow:hidden;pointer-events:none;background:linear-gradient(180deg,var(--ss1),var(--ss2) 70%)}
${EOS_SIGH_R} .eosSighSea::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:rgba(255,236,210,calc(.16 + var(--clr) * .3));z-index:3}
${EOS_SIGH_R} .eosSighSea>i{position:absolute;inset:0;display:block}
${EOS_SIGH_R} .eosSighSeaDawn{background:linear-gradient(180deg,var(--ds1),var(--ds2) 72%);opacity:var(--clr);transition:opacity var(--D) ease-in-out}
${EOS_SIGH_R} .eosSighWaves{left:-60px!important;background:repeating-linear-gradient(180deg,rgba(255,255,255,0) 0 13px,rgba(255,255,255,.06) 13px 15px),repeating-linear-gradient(90deg,rgba(255,255,255,0) 0 38px,rgba(255,255,255,.035) 38px 60px);animation:eosSighWaves 14s linear infinite}
${EOS_SIGH_R} .eosSighGlint{left:var(--sunx)!important;right:auto!important;width:130px;margin-left:-65px;height:80%;background:repeating-linear-gradient(180deg,rgba(255,214,140,.6) 0 3px,rgba(255,214,140,0) 3px 12px);-webkit-mask-image:linear-gradient(180deg,#000,transparent);mask-image:linear-gradient(180deg,#000,transparent);opacity:calc(var(--clr) * .85);transition:opacity var(--D)}
${EOS_SIGH_R} .eosSighIsle{position:absolute;left:var(--islx);top:calc(var(--hzpx) - var(--sy) * 1.18);width:calc(var(--sy) * 2);height:calc(var(--sy) * 1.3);transform:translateX(-50%);pointer-events:none}
${EOS_SIGH_R}[data-narrow="1"] .eosSighIsle{left:50%}
${EOS_SIGH_R}[data-narrow="1"] .eosSighSun{left:calc(100% - var(--sunx))}
${EOS_SIGH_R} .eosSighIsleLand{position:absolute;inset:0;display:block;filter:brightness(calc(.62 + var(--clr) * .38)) saturate(calc(.7 + var(--clr) * .3));transition:filter var(--D)}
${EOS_SIGH_R} .eosSighIsleLand::before{content:"";position:absolute;left:6%;right:6%;bottom:0;height:30%;border-radius:50% 50% 46% 46%/86% 86% 14% 14%;background:radial-gradient(120% 100% at 38% 18%,#f6d9a6,#cf9f63 58%,#8d6542);box-shadow:inset 0 -5px 8px rgba(80,40,10,.35),0 6px 14px rgba(0,0,0,.3)}
${EOS_SIGH_R} .eosSighIsleLand::after{content:"";position:absolute;left:-4%;right:-4%;bottom:-6%;height:16%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.28),rgba(255,255,255,0));z-index:-1}
${EOS_SIGH_R} .eosSighPalm{position:absolute;right:9%;bottom:22%;width:20%;height:66%;display:block}
${EOS_SIGH_R} .eosSighPalm::before{content:"";position:absolute;left:44%;bottom:0;width:16%;height:96%;border-radius:40% 40% 30% 30%;background:linear-gradient(90deg,#6b4628,#a8744a);transform:rotate(9deg);transform-origin:50% 100%}
${EOS_SIGH_R} .eosSighPalm>i{position:absolute;left:58%;top:2%;width:96%;height:26%;border-radius:100% 0 100% 0;background:linear-gradient(160deg,#4fc08d,#1f7a58);transform-origin:0 50%;display:block}
${EOS_SIGH_R} .eosSighPalm>i:nth-child(1){transform:rotate(-22deg)}
${EOS_SIGH_R} .eosSighPalm>i:nth-child(2){transform:rotate(28deg)}
${EOS_SIGH_R} .eosSighPalm>i:nth-child(3){transform:scaleX(-1) rotate(-18deg)}
${EOS_SIGH_R} .eosSighPalm>i:nth-child(4){transform:scaleX(-1) rotate(34deg)}
${EOS_SIGH_R} .eosSighSync{position:absolute;left:38%;bottom:20%;width:var(--sy);height:var(--sy);margin-left:calc(var(--sy) / -2);transition:transform 1.5s cubic-bezier(.4,0,.2,1),opacity 1s ease .45s}
${EOS_SIGH_R} .eosSighSyncGlow{position:absolute;inset:-30%;display:block;border-radius:50%;background:radial-gradient(closest-side,rgba(255,226,170,calc(.12 + var(--clr) * .3)),rgba(255,226,170,0));transition:background var(--D)}
${EOS_SIGH_R} .eosSighSyncFace{position:relative;width:100%;height:100%;object-fit:contain;filter:drop-shadow(-3px -3px 0 rgba(255,214,160,.55)) drop-shadow(3px -1px 0 rgba(140,215,255,.8)) drop-shadow(0 8px 8px rgba(0,0,0,.4));animation:eosSighSyncBob 3.6s ease-in-out infinite;pointer-events:none}
${EOS_SIGH_R} .eosSighSync[data-pop="a"] .eosSighSyncFace{animation:eosSighPopA .6s cubic-bezier(.3,1.5,.5,1),eosSighSyncBob 3.6s ease-in-out .6s infinite}
${EOS_SIGH_R} .eosSighSync[data-pop="b"] .eosSighSyncFace{animation:eosSighPopB .6s cubic-bezier(.3,1.5,.5,1),eosSighSyncBob 3.6s ease-in-out .6s infinite}
${EOS_SIGH_R}[data-phase="done"] .eosSighSync{transform:translateY(-90px) scale(.55);opacity:0}
${EOS_SIGH_R}[data-calm="1"][data-phase="done"] .eosSighSync{transform:none}
${EOS_SIGH_R} .eosSighClouds{position:absolute;inset:0}
${EOS_SIGH_R} .eosSighCloud{position:absolute;left:var(--x);top:var(--y);width:calc(var(--cw) * var(--s));transform:translate(-50%,0);transition:transform .6s ease}
${EOS_SIGH_R}[data-narrow="1"] .eosSighCloud{left:var(--px);top:var(--py)}
${EOS_SIGH_R} .eosSighCloud[data-gone="1"]{transform:translate(calc(-50% + var(--gx)),-24px) scale(.74);transition:transform var(--D) cubic-bezier(.35,.05,.45,1)}
${EOS_SIGH_R}[data-calm="1"] .eosSighCloud[data-gone="1"]{transform:translate(-50%,0)}
${EOS_SIGH_R} .eosSighCloudFloat{position:relative;animation:eosSighCloudIn .5s ease-out both,eosSighBob var(--bob) ease-in-out var(--bd) infinite;transition:opacity .4s}
${EOS_SIGH_R} .eosSighCloud[data-gone="1"] .eosSighCloudFloat{opacity:0;transition:opacity calc(var(--D) * .7) ease-in calc(var(--D) * .3)}
${EOS_SIGH_R} .eosSighPuffs{position:absolute;inset:0;display:block;pointer-events:none}
${EOS_SIGH_R} .eosSighPuffs>i{position:absolute;display:block;border-radius:50%;background:radial-gradient(circle at 50% 30%,var(--sc1),var(--sc2) 80%)}
${EOS_SIGH_R} .eosSighPuffs>i:nth-child(1){left:9%;top:calc(var(--cw) * -.12);width:38%;aspect-ratio:1}
${EOS_SIGH_R} .eosSighPuffs>i:nth-child(2){left:33%;top:calc(var(--cw) * -.2);width:44%;aspect-ratio:1}
${EOS_SIGH_R} .eosSighPuffs>i:nth-child(3){left:61%;top:calc(var(--cw) * -.09);width:30%;aspect-ratio:1}
${EOS_SIGH_R} .eosSighCloudBody{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:var(--cbh);padding:7px 12px;border-radius:999px;text-align:center;background:radial-gradient(130% 150% at 50% 0%,var(--sc1),var(--sc2) 72%);box-shadow:inset 0 -7px 12px rgba(12,6,44,.38),inset 0 4px 8px rgba(255,255,255,.2),0 12px 22px rgba(0,0,0,.28)}
${EOS_SIGH_R} .eosSighCloudFloat{filter:brightness(calc(1 + var(--clr) * .28));transition:filter var(--D)}
${EOS_SIGH_R} .eosSighWord{max-width:100%;line-height:1.08!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
${EOS_SIGH_R} .eosSighThumb{width:40px;height:40px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,255,255,.7)}
${EOS_SIGH_R} .eosSighRain{position:absolute;left:14%;right:14%;top:62%;height:150%;display:block;opacity:0;pointer-events:none;background:repeating-linear-gradient(104deg,rgba(205,220,255,0) 0 8px,rgba(205,220,255,.55) 8px 9.5px);background-size:100% 40px;-webkit-mask-image:linear-gradient(180deg,#000 20%,transparent);mask-image:linear-gradient(180deg,#000 20%,transparent)}
${EOS_SIGH_R} .eosSighCloud[data-gone="1"] .eosSighRain{animation:eosSighRainLife var(--D) linear forwards,eosSighRainFall .6s linear infinite}
${EOS_SIGH_R}[data-calm="1"] .eosSighCloud[data-gone="1"] .eosSighRain{animation:eosSighRainLife var(--D) linear forwards}
${EOS_SIGH_R} .eosSighTip{position:absolute;left:50%;top:-4px;transform:translateX(-50%);z-index:9;width:max-content;max-width:min(92%,460px);padding:8px 14px;border-radius:999px;background:var(--eos-glass);box-shadow:0 6px 18px rgba(0,0,0,.35);font:700 15px/1.25 var(--eos-font);color:#fff;text-align:center;opacity:0;transition:opacity .5s ease}
${EOS_SIGH_R} .eosSighTip.isOn{opacity:1}
${EOS_SIGH_R} .eosSighWind{position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;opacity:0;overflow:visible}
${EOS_SIGH_R} .eosSighWind path{fill:none;stroke:rgba(235,244,255,.62);stroke-width:4px;stroke-linecap:round;stroke-dasharray:22 140;stroke-dashoffset:30}
${EOS_SIGH_R} .eosSighWind path.w2{stroke:rgba(255,226,180,.42);stroke-width:2.5px;stroke-dasharray:14 140}
${EOS_SIGH_R}[data-phase="out"] .eosSighWind[data-w="a"]{animation:eosSighWindShowA var(--D) ease-in-out forwards}
${EOS_SIGH_R}[data-phase="out"] .eosSighWind[data-w="b"]{animation:eosSighWindShowB var(--D) ease-in-out forwards}
${EOS_SIGH_R}[data-phase="out"] .eosSighWind[data-w="a"] path{animation:eosSighWindA calc(var(--D) * .5) ease-in-out 2}
${EOS_SIGH_R}[data-phase="out"] .eosSighWind[data-w="b"] path{animation:eosSighWindB calc(var(--D) * .5) ease-in-out 2}
${EOS_SIGH_R}[data-phase="out"] .eosSighWind path.w2{animation-delay:.5s}
${EOS_SIGH_R}[data-calm="1"] .eosSighWind path{animation:none!important;stroke-dasharray:none;opacity:.35}
${EOS_SIGH_R} .eosSighOrbWrap{position:absolute;left:50%;bottom:calc(var(--eos-safe-bottom) + 6px);width:var(--os);height:var(--os);margin-left:calc(var(--os) / -2);z-index:7;animation:eosSighIntro .5s cubic-bezier(.3,1.4,.5,1) both}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbWrap{animation:eosSighFadeIn .4s ease both}
${EOS_SIGH_R} .eosSighOrb{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:50%!important;display:block!important;touch-action:none;cursor:pointer!important;outline-offset:8px!important}
${EOS_SIGH_R}[data-phase="out"] .eosSighOrb,${EOS_SIGH_R}[data-phase="done"] .eosSighOrb{cursor:default!important}
${EOS_SIGH_R} .eosSighOrbSquash,${EOS_SIGH_R} .eosSighOrbScale{position:absolute;inset:0;display:block;border-radius:50%;pointer-events:none}
${EOS_SIGH_R} .eosSighOrbScale{transform:scale(calc(1 + var(--f) * var(--k)));transform-origin:50% 100%}
${EOS_SIGH_R} .eosSighOrbWrap[data-sq="a"] .eosSighOrbSquash{animation:eosSighSquashA .46s cubic-bezier(.3,1.3,.5,1)}
${EOS_SIGH_R} .eosSighOrbWrap[data-sq="b"] .eosSighOrbSquash{animation:eosSighSquashB .46s cubic-bezier(.3,1.3,.5,1)}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbWrap[data-sq="a"] .eosSighOrbSquash{animation:eosSighSquashCalmA .4s ease}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbWrap[data-sq="b"] .eosSighOrbSquash{animation:eosSighSquashCalmB .4s ease}
${EOS_SIGH_R} .eosSighOrbHalo{position:absolute;inset:-30%;display:block;border-radius:50%;background:radial-gradient(closest-side,rgba(var(--og),.55),rgba(var(--og),.18) 60%,rgba(var(--og),0));opacity:calc(.4 + var(--f) * .6)}
${EOS_SIGH_R} .eosSighOrbWrap[data-ack="a"] .eosSighOrbHalo{animation:eosSighAckA .5s ease-out}
${EOS_SIGH_R} .eosSighOrbWrap[data-ack="b"] .eosSighOrbHalo{animation:eosSighAckB .5s ease-out}
${EOS_SIGH_R} .eosSighOrbBall{position:absolute;inset:0;display:block;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 64%,rgba(70,48,150,.6),rgba(14,10,46,.9) 74%);box-shadow:inset 0 -12px 24px rgba(8,4,36,.6),inset 0 6px 16px rgba(255,255,255,.2),0 12px 0 rgba(6,4,24,.32),0 22px 40px rgba(0,0,0,.45),0 0 0 3px rgba(255,255,255,.24),0 0 calc(18px + var(--f) * 40px) rgba(var(--og),.55)}
${EOS_SIGH_R} .eosSighOrbBall::before{content:"";position:absolute;left:26%;top:30%;width:48%;height:48%;border-radius:50%;background:radial-gradient(closest-side,rgba(200,170,255,.55),rgba(200,170,255,0));opacity:calc(1 - var(--f))}
${EOS_SIGH_R} .eosSighOrbFill{position:absolute;left:0;right:0;bottom:0;height:100%;display:block;transform:translateY(calc((1 - var(--f)) * 100% + 2px));background:linear-gradient(180deg,#d6b8ff,#8a5cf0 55%,#4b2aa6)}
${EOS_SIGH_R} .eosSighOrbGold{position:absolute;inset:0;display:block;background:linear-gradient(180deg,#fff2b8,#ffc45a 55%,#ff9a4a);opacity:var(--clr);transition:opacity 2.4s ease}
${EOS_SIGH_R} .eosSighOrbWave{position:absolute;left:-20px;right:-20px;top:-9px;height:18px;display:block;background:radial-gradient(circle at 10px 0,rgba(255,255,255,0) 9px,rgba(255,255,255,.42) 10px) repeat-x;background-size:20px 18px;animation:eosSighWave 1.8s linear infinite}
${EOS_SIGH_R}[data-calm="1"] :is(.eosSighOrbWave,.eosSighWaves,.eosSighStorm>b){animation:none!important}
${EOS_SIGH_R}[data-calm="1"] .eosSighCloudFloat{animation:eosSighFadeIn .5s ease both}
${EOS_SIGH_R}[data-calm="1"] .eosSighSyncFace{animation:none!important}
${EOS_SIGH_R} .eosSighOrbSunny{position:absolute;inset:0;display:block;border-radius:50%;background:radial-gradient(circle at 50% 42%,#fff6c8,#ffc45a 58%,#ff9a4a);opacity:0;transition:opacity 1.2s ease}
${EOS_SIGH_R}[data-phase="done"] .eosSighOrbSunny{opacity:1}
${EOS_SIGH_R}[data-phase="done"]{--og:255,196,96}
${EOS_SIGH_R} .eosSighOrbGloss{position:absolute;left:17%;top:9%;width:36%;height:20%;display:block;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.9),rgba(255,255,255,0));z-index:3}
${EOS_SIGH_R} .eosSighOrbCount{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#fff;text-shadow:0 2px 8px rgba(20,6,60,.75);pointer-events:none}
${EOS_SIGH_R} .eosSighOrbCount small{font:800 15px/1 var(--eos-font);letter-spacing:.14em;text-transform:uppercase}
${EOS_SIGH_R} .eosSighOrbCount b{font:900 calc(var(--os) * .26)/1 var(--eos-font);font-variant-numeric:tabular-nums}
${EOS_SIGH_R}[data-phase="ready"] .eosSighOrbCount b{animation:eosSighUp .9s ease-in-out infinite}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbCount b{animation:none!important;font-size:calc(var(--os) * .3)}
${EOS_SIGH_R} .eosSighRing{position:absolute;left:-9%;top:-9%;width:118%;height:118%;overflow:visible;pointer-events:none}
${EOS_SIGH_R} .eosSighRingTrack{fill:none;stroke:rgba(255,255,255,.18);stroke-width:3}
${EOS_SIGH_R} .eosSighRingArc{fill:none;stroke:#ffe08a;stroke-width:4.5;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:calc(100 - var(--f) * 100);filter:drop-shadow(0 0 4px rgba(255,214,120,.8))}
${EOS_SIGH_R} .eosSighNotch{fill:rgba(255,255,255,.4);stroke:rgba(20,10,60,.5);stroke-width:1;transition:fill .2s}
${EOS_SIGH_R} .eosSighOrbWrap[data-n1="1"] .eosSighNotch.n1,${EOS_SIGH_R} .eosSighOrbWrap[data-n2="1"] .eosSighNotch.n2{fill:#fff1a8;filter:drop-shadow(0 0 5px #ffc45a)}
${EOS_SIGH_R}[data-phase="ready"] .eosSighNotch.n1{animation:eosSighNotchPulse .7s ease-in-out infinite alternate}
${EOS_SIGH_R}[data-calm="1"] .eosSighNotch{animation:none!important}
${EOS_SIGH_R} .eosSighCue{position:absolute;left:50%;bottom:calc(100% + var(--os) * var(--k) + 16px);transform:translateX(-50%);width:max-content;max-width:520px;text-align:center;pointer-events:none}
${EOS_SIGH_R} .eosSighCue b{display:block;font:800 20px/1.15 var(--eos-font);color:#fff;text-shadow:0 2px 10px rgba(10,4,40,.85),0 0 2px rgba(10,4,40,.9)}
${EOS_SIGH_R} .eosSighCue small{display:block;margin-top:4px;font:700 15px/1.2 var(--eos-font);color:rgba(240,236,255,.92);text-shadow:0 2px 8px rgba(10,4,40,.85)}
@media (max-width:560px){${EOS_SIGH_R} .eosSighCue{max-width:330px}${EOS_SIGH_R} .eosSighCue b{font-size:17px}${EOS_SIGH_R} .eosSighCue small{font-size:14px}${EOS_SIGH_R} .eosSighTip{font-size:14px}${EOS_SIGH_R} .eosSighOrbCount small{font-size:14px}}
${EOS_SIGH_R} .eosSighPips{position:absolute;left:calc(100% + 22px);top:50%;transform:translateY(-50%);display:flex;flex-direction:column-reverse;gap:9px;pointer-events:none}
${EOS_SIGH_R} .eosSighPips>i{display:block;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 2px rgba(255,255,255,.45);transition:background .4s ease,box-shadow .4s ease}
${EOS_SIGH_R} .eosSighPips>i.on{background:radial-gradient(circle at 40% 35%,#fff6c8,#ffc45a 60%,#ff9a4a);box-shadow:0 0 12px rgba(255,196,96,.85)}
${EOS_SIGH_R} .eosSighMotes{position:absolute;left:50%;top:50%;width:0;height:0;z-index:6;pointer-events:none}
${EOS_SIGH_R} .eosSighMote{position:absolute;left:-5px;top:-5px;width:10px;height:10px;display:block;border-radius:50%;background:radial-gradient(circle,#fff,rgba(200,225,255,.6) 40%,rgba(200,225,255,0) 70%);opacity:0;transform:translate(var(--mx),var(--my))}
${EOS_SIGH_R}:is([data-phase="in"],[data-phase="ready"],[data-phase="sip"]) .eosSighMote{animation:eosSighMote 1.8s cubic-bezier(.5,0,.75,.4) var(--md) both}
${EOS_SIGH_R}[data-calm="1"] .eosSighMote{display:none}
${EOS_SIGH_R} .eosSighPuffFx{position:absolute;left:50%;top:2%;width:44%;height:26%;margin-left:-22%;border-radius:50%;background:radial-gradient(closest-side,rgba(235,232,255,.75),rgba(235,232,255,0));opacity:0;pointer-events:none;z-index:8}
${EOS_SIGH_R} .eosSighPuffFx[data-p="a"]{animation:eosSighPuffA .8s ease-out}
${EOS_SIGH_R} .eosSighPuffFx[data-p="b"]{animation:eosSighPuffB .8s ease-out}
${EOS_SIGH_R}[data-calm="1"] .eosSighPuffFx[data-p]{animation-name:eosSighFadeOut}
${EOS_SIGH_R} .eosSighBloom{position:absolute;left:50%;top:50%;width:0;height:0;z-index:8;pointer-events:none}
${EOS_SIGH_R} .eosSighBloom>b{position:absolute;left:calc(var(--os) * -.55);top:calc(var(--os) * -.55);width:calc(var(--os) * 1.1);height:calc(var(--os) * 1.1);display:block;border-radius:50%;border:4px solid rgba(255,220,130,.85);box-shadow:0 0 18px rgba(255,200,110,.6);opacity:0}
${EOS_SIGH_R} .eosSighBloom>i{position:absolute;left:-4px;top:-4px;width:8px;height:8px;display:block;border-radius:50%;background:#fff1b0;box-shadow:0 0 8px #ffc45a;opacity:0}
${EOS_SIGH_R} .eosSighBloom[data-b="a"]>b{animation:eosSighRingA 1s ease-out}
${EOS_SIGH_R} .eosSighBloom[data-b="b"]>b{animation:eosSighRingB 1s ease-out}
${EOS_SIGH_R} .eosSighBloom[data-b="a"]>i{animation:eosSighSparkA 1.1s cubic-bezier(.2,.7,.3,1)}
${EOS_SIGH_R} .eosSighBloom[data-b="b"]>i{animation:eosSighSparkB 1.1s cubic-bezier(.2,.7,.3,1)}
${EOS_SIGH_R} .eosSighBloom[data-big="1"]>i{animation-duration:1.6s}
${EOS_SIGH_R}[data-calm="1"] .eosSighBloom>i{display:none}
${EOS_SIGH_R}[data-calm="1"] .eosSighBloom[data-b]>b{animation-name:eosSighFadeOut}
@keyframes eosSighStormGlow{0%{opacity:.62}100%{opacity:1}}
@keyframes eosSighWaves{to{transform:translateX(60px)}}
@keyframes eosSighBob{0%,100%{translate:0 0}50%{translate:0 -6px}}
@keyframes eosSighSyncBob{0%,100%{translate:0 0;scale:1 1}50%{translate:0 -4px;scale:.98 1.02}}
@keyframes eosSighCloudIn{0%{opacity:0;scale:.9}100%{opacity:1;scale:1}}
@keyframes eosSighRainLife{0%{opacity:0}18%{opacity:.85}70%{opacity:.55}100%{opacity:0}}
@keyframes eosSighRainFall{to{background-position:0 40px}}
@keyframes eosSighWindShowA{0%{opacity:0}15%{opacity:1}80%{opacity:.8}100%{opacity:0}}
@keyframes eosSighWindShowB{0%{opacity:0}15%{opacity:1}80%{opacity:.8}100%{opacity:0}}
@keyframes eosSighWindA{0%{stroke-dashoffset:30}100%{stroke-dashoffset:-110}}
@keyframes eosSighWindB{0%{stroke-dashoffset:30}100%{stroke-dashoffset:-110}}
@keyframes eosSighIntro{0%{opacity:0;scale:.7}100%{opacity:1;scale:1}}
@keyframes eosSighFadeIn{0%{opacity:0}100%{opacity:1}}
@keyframes eosSighFadeOut{0%{opacity:.8}100%{opacity:0}}
@keyframes eosSighSquashA{0%{scale:1 1}28%{scale:1.1 .88}56%{scale:.95 1.06}78%{scale:1.02 .98}100%{scale:1 1}}
@keyframes eosSighSquashB{0%{scale:1 1}28%{scale:1.1 .88}56%{scale:.95 1.06}78%{scale:1.02 .98}100%{scale:1 1}}
@keyframes eosSighSquashCalmA{0%{scale:1 1}40%{scale:1.03 .97}100%{scale:1 1}}
@keyframes eosSighSquashCalmB{0%{scale:1 1}40%{scale:1.03 .97}100%{scale:1 1}}
@keyframes eosSighAckA{0%{filter:brightness(1.5)}100%{filter:none}}
@keyframes eosSighAckB{0%{filter:brightness(1.5)}100%{filter:none}}
@keyframes eosSighWave{to{background-position:20px 0}}
@keyframes eosSighUp{0%,100%{translate:0 3px}50%{translate:0 -6px}}
@keyframes eosSighNotchPulse{0%{opacity:.55}100%{opacity:1}}
@keyframes eosSighMote{0%{opacity:0;transform:translate(var(--mx),var(--my)) scale(1)}18%{opacity:.95}85%{opacity:.85}100%{opacity:0;transform:translate(0,0) scale(.3)}}
@keyframes eosSighPuffA{0%{opacity:.9;transform:translateY(0) scale(.6)}100%{opacity:0;transform:translateY(-46px) scale(1.5)}}
@keyframes eosSighPuffB{0%{opacity:.9;transform:translateY(0) scale(.6)}100%{opacity:0;transform:translateY(-46px) scale(1.5)}}
@keyframes eosSighPopA{0%{scale:1 1}25%{scale:1.14 .86}55%{scale:.94 1.08}100%{scale:1 1}}
@keyframes eosSighPopB{0%{scale:1 1}25%{scale:1.14 .86}55%{scale:.94 1.08}100%{scale:1 1}}
@keyframes eosSighRingA{0%{opacity:.95;transform:scale(.55)}100%{opacity:0;transform:scale(1.9)}}
@keyframes eosSighRingB{0%{opacity:.95;transform:scale(.55)}100%{opacity:0;transform:scale(1.9)}}
@keyframes eosSighSparkA{0%{opacity:0;transform:rotate(var(--a)) translateY(-20px) scale(.6)}15%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(calc(var(--r) * -1)) scale(.25)}}
@keyframes eosSighSparkB{0%{opacity:0;transform:rotate(var(--a)) translateY(-20px) scale(.6)}15%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(calc(var(--r) * -1)) scale(.25)}}
`

eosRegisterGame(EOS_GAME_111, EosBigSighEngine, {
    hint: "Hold the orb, slide up for one more sip, then let go",
    mindBend: EOS_GAME_111.mindBend,
    css: EOS_SIGH_CSS,
    gesture: "hold",
    char: "sync",
    seconds: 30,
})
eosExpose("sigh", {
    // dev/test only (window.__eos exists only when eosIsDev()); never exposes words
    state: () => {
        const L = eosSighLive
        if (!L) return null
        const s = L.S
        return { phase: s.phase, f: +s.f.toFixed(3), cycle: s.cycle, n: L.setup.n, early: s.early, easy: s.easy, prog: s.prog, D: s.D, pointer: s.pointer == null ? null : String(s.pointer) }
    },
    EOS_GAME_111,
})
