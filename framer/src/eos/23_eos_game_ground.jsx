// ===================================================================================
// EOS · 23 · GAME 113 GROUND CONTROL — the anxiety hero (also panic mid, fear high, overthinking act 2;
// first in the gentle list). Spec: docs/EOS_SPEC.md §8.0 (engine contract) + §8.3 (this game).
//
// GLITCH's rocket hovers in a fog made of the player's worry words, over a little planet with five beacons:
//   3 SPOT beacons (the real room, not an on-screen search): tap when you have found it → the lamp fills over
//     1.2 s ("keep looking…"; a tap within 1.5 s of the previous one fills over 2.4 s — nudges real looking,
//     never refuses). Every spot beacon has a "↻ another" swap; the pool interleaves the senses (see, touch,
//     hear, smell/taste, body contact) so blind, low-vision and deaf players can always land.
//   2 BODY beacons are holds (3 s each, live hold ring; letting go PAUSES, never resets).
// Each lit beacon plays a rising pentatonic note (one scored step), sweeps its searchlight beam across the fog
// and burns off one worry word (a glowing icon of what you found takes its place); the rocket steps down.
// Finale (its own, first-class state): touchdown + dust puff + soft thump, the static clears, the fog's blur
// melts 8 → 0, GLITCH (E15 worried → E7 curious → happy → E10 confident) hops out onto the nose, the five
// beacons swing their beams up into a salute and the found things join into a gold constellation.
// Never: a fail state, a reset, a flash, a non-soft sfx from a timer / rAF, user text outside <EosWord>.
// Public names: EOS_GAME_113, EosGroundControlEngine, EOS_GROUND_CSS. Everything else is EOS_GROUND_* /
// EosGround* / eosGround*.
// ===================================================================================

const EOS_GAME_113 = {
    id: 113,
    name: "GROUND CONTROL",
    family: "Balance",
    engine: "E04",
    prompt: "What's the what-if?",
    object: "GLITCH's rocket hovers in a fog made of your worry words",
    action: "Spot three real things around you and hold two body beacons to land the rocket",
    mechanism: "5-sense grounding (attention to the here and now)",
    hook: "Your room is real. The what-ifs aren't here yet.",
    surprise: "Each beacon's beam burns off one worry word; on the fifth the rocket touches down and the static clears.",
    mindBend: "Right here is the only place anything is actually happening.",
    score: "Beacons lit",
    replay: "New missions",
    sound: "Rising beacon notes, soft landing thump",
    notes: "EOS anxiety hero · 3 spot beacons + 2 body beacons, any order · ~30 s",
}

// ---------------------------------------------------------------- timings
const EOS_GROUND_FILL_MS = 1200 //        a spot beacon fills after the "found it" tap
const EOS_GROUND_SLOW_FILL_MS = 2400 //   … when the tap came within EOS_GROUND_QUICK_MS of the previous one
const EOS_GROUND_QUICK_MS = 1500
const EOS_GROUND_HOLD_MS = 3000 //        a body beacon: accumulated hold (release pauses, never resets)
const EOS_GROUND_ASSIST_AT = 26000 //     after this the beacons are kind (≤ 45 s even with clumsy play)
const EOS_GROUND_ASSIST_FILL = 900
const EOS_GROUND_ASSIST_HOLD = 1800
const EOS_GROUND_LAND_MS = 1300 //        5th beacon lit → touchdown (the last beam burns, the rocket lands)
const EOS_GROUND_FINALE_MS = 1900 //      touchdown → 100 % (the finale plays BEFORE the wrapper's reveal takes the stage)
const EOS_GROUND_DONE_DELAY = 450 //      onDone after 100
const EOS_GROUND_STEP = 18 //             progress per lit beacon (touchdown = 100); partials stay < 18

// ---------------------------------------------------------------- missions (≤ 4 words, a big icon each)
// t = [before, KEY, after]. The spot pool interleaves the senses, so one "↻ another" from any mission lands on a
// different sense, and non-visual / non-auditory options (touch, smell/taste, body contact) are always ≤ 2 swaps away.
// found = the glowing icon the beam reveals where the burnt worry word was.
const EOS_GROUND_SPOTS = [
    { sense: "see", icon: "👀", t: ["something", "BLUE", ""], found: "💎" },
    { sense: "touch", icon: "✋", t: ["touch a", "SOFT", "thing"], found: "🧸" },
    { sense: "hear", icon: "👂", t: ["", "farthest", "sound"], found: "🔔" },
    { sense: "smell", icon: "👃", t: ["one", "smell", "or taste"], found: "🌿" },
    { sense: "see", icon: "👀", t: ["something", "ROUND", ""], found: "🟡" },
    { sense: "contact", icon: "🪑", t: ["the", "CHAIR", "under you"], found: "🪑" },
    { sense: "touch", icon: "✋", t: ["touch a", "COOL", "thing"], found: "❄️" },
    { sense: "hear", icon: "👂", t: ["the", "quietest", "sound"], found: "🎐" },
    { sense: "see", icon: "👀", t: ["something", "SHINY", ""], found: "✨" },
    { sense: "contact", icon: "👣", t: ["the", "FLOOR", "under you"], found: "👣" },
    { sense: "touch", icon: "✋", t: ["touch a", "SMOOTH", "thing"], found: "🪨" },
    { sense: "smell", icon: "👅", t: ["", "TASTE", "in your mouth"], found: "🍋" },
    { sense: "see", icon: "👀", t: ["something", "RED", ""], found: "❤️" },
    { sense: "contact", icon: "🍃", t: ["", "AIR", "on your skin"], found: "🍃" },
]
// Per variant: the starting spot missions (see · touch · hear/smell), in spot-beacon order.
const EOS_GROUND_SPOT_START = [
    [0, 1, 2],
    [4, 6, 3],
    [8, 10, 7],
]
// Body beacons: [feet] + [one release]. label = the arrow / LIVE GUIDE label (≤ 18 chars).
const EOS_GROUND_FEET = { sense: "body", icon: "🦶", t: ["feet", "DOWN", ""], found: "👣", label: "HOLD · FEET DOWN", cue: "press your feet into the floor…" }
const EOS_GROUND_RELEASE = [
    { sense: "body", icon: "🫁", t: ["drop your", "SHOULDERS", ""], found: "🌬️", label: "HOLD · SHOULDERS", cue: "let your shoulders drop…" },
    { sense: "body", icon: "😌", t: ["soften your", "JAW", ""], found: "🙂", label: "HOLD · SOFT JAW", cue: "let your jaw go soft…" },
    { sense: "body", icon: "🤲", t: ["loosen your", "HANDS", ""], found: "🖐️", label: "HOLD · LOOSE HANDS", cue: "let your hands go loose…" },
]
// Beacon slots: 0 front-centre (nearest the thumb → the first, always a spot = gesture "tap"), 1 front-left,
// 2 front-right, 3 back-left, 4 back-right. Per variant: which kind sits where (3 spot + 2 body).
const EOS_GROUND_KINDS = [
    ["spot", "body", "spot", "spot", "body"],
    ["spot", "spot", "body", "body", "spot"],
    ["spot", "body", "spot", "body", "spot"],
]
// Loud palettes (seeded; the anxiety violet of the colour script) → calm palettes (local time of day).
const EOS_GROUND_LOUD = [
    { sky: ["#120a30", "#33207a", "#5b3fa6"], hill: ["#2a1d66", "#0e0928"], fog: "176,150,255", glow: "150,110,255" },
    { sky: ["#0b0f2e", "#232a74", "#4b48a8"], hill: ["#1d2470", "#080c26"], fog: "150,160,255", glow: "110,130,255" },
    { sky: ["#180a2c", "#44206e", "#7a42ac"], hill: ["#36206c", "#110824"], fog: "206,150,245", glow: "190,110,240" },
]
const EOS_GROUND_CALM = {
    dawn: { sky: ["#7fb2ff", "#ffc7a6", "#ffe6bd"], hill: ["#7cc3a0", "#2f6f78"], aur: "255,214,150" },
    day: { sky: ["#4fb0ff", "#9fdcff", "#dff5ff"], hill: ["#73cc92", "#2e7f6c"], aur: "190,240,255" },
    dusk: { sky: ["#6b5bd0", "#ff9fbc", "#ffd59c"], hill: ["#66a39a", "#2c4f6b"], aur: "255,190,220" },
    night: { sky: ["#1c3678", "#3f72c4", "#7fd3ff"], hill: ["#2f7a80", "#123048"], aur: "127,255,214" },
}
const EOS_GROUND_ACCENT = [["#ff7d8f", "#b8405a"], ["#ffb547", "#b8701c"], ["#4fd6c4", "#1f8a80"]]
// GLITCH's faces (the arcade's own cast): worried → curious → happy (seeded) → confident at touchdown.
const EOS_GROUND_FACE = { start: 15, curious: 7, happy: [57, 60, 61], land: 10 }
const EOS_GROUND_LABEL = { spot: "FOUND IT? TAP", looking: "KEEP LOOKING", holding: "KEEP HOLDING", land: "WATCH IT LAND", done: "TOUCHDOWN" }
// Cue copy (§2 rules: no clinical words, no "relax" / "calm down" / "just breathe"). [main, sub]
const EOS_GROUND_CUES = {
    start: ["Spot each thing in your room", "then tap its beacon"],
    fill: ["keep looking…", ""],
    found0: ["Found it · the fog is thinning", ""],
    found1: ["That's real · right here", ""],
    found2: ["Yes — really there", ""],
    paused: ["paused · hold again to finish", ""],
    body: ["Steady · that's the ground", ""],
    last: ["One beacon left · nearly down", ""],
    land: ["Coming in to land…", ""],
    done: ["Touchdown · you're right here", "Your room is real. The what-ifs aren't here yet."],
}
// Pre-mounted particle pools (no mount/unmount per effect: the wrappers audit every childList mutation).
const EOS_GROUND_SPARKS = Array.from({ length: 8 }, (_, i) => ({ a: i * 45 + (i % 2) * 12, r: 36 + (i % 3) * 10 }))
const EOS_GROUND_EMBERS = Array.from({ length: 6 }, (_, i) => ({ x: (i - 2.5) * 16, y: -(26 + (i % 3) * 14), d: (i % 3) * 0.08 }))
const EOS_GROUND_DUST = Array.from({ length: 10 }, (_, i) => ({ x: (i < 5 ? -1 : 1) * (40 + (i % 5) * 22), y: -((i % 5) * 7 + 4), s: 0.8 + (i % 3) * 0.3, d: (i % 5) * 0.04 }))
const EOS_GROUND_PAD_LIGHTS = Array.from({ length: 6 }, (_, k) => {
    const a = ((k * 60 + 30) * Math.PI) / 180
    return { cx: +Math.cos(a).toFixed(3), cy: +Math.sin(a).toFixed(3) }
})
const EOS_GROUND_PUFFS = [
    { x: 8, y: 22, w: 46, h: 30, d: 11 },
    { x: 34, y: 58, w: 52, h: 36, d: 14 },
    { x: 66, y: 18, w: 50, h: 32, d: 12 },
    { x: 92, y: 60, w: 46, h: 34, d: 13 },
    { x: 50, y: 88, w: 70, h: 30, d: 15 },
    { x: 20, y: 86, w: 44, h: 28, d: 10 },
    { x: 80, y: 90, w: 44, h: 28, d: 12 },
]

let eosGroundLive = null // dev/test handle (window.__eos.ground.state(); never words)
function eosGroundNow() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()
}
function eosGroundMissionText(m) {
    return [m.t[0], m.t[1], m.t[2]].filter(Boolean).join(" ")
}
// The worry words in the fog: the user's words (eosWords; neutral words under a strong safety flag), padded to 5
// with the feeling's seed phrases (sensations / situations only, §2) so every beacon burns off a word.
function eosGroundWords(entries) {
    const list = eosWords(entries, 5).filter((w) => w && !/uploaded image/i.test(w))
    if (list.length >= 5) return list.slice(0, 5)
    const strong = eosSafetyStrong(EOS_STORE.get().safety) || eosSafetyStrong(EosSafetyScan(entries))
    const emo = EOS_EMO[eosCurrentEmotion()]
    const pool = strong ? EOS_NEUTRAL_WORDS : (emo && emo.id !== "good" ? emo.seeds : []).concat(EOS_EMO.anxiety.seeds)
    const seen = new Set(list.map((w) => String(w).toLowerCase()))
    for (const s of pool) {
        if (list.length >= 5) break
        if (!seen.has(s.toLowerCase())) {
            seen.add(s.toLowerCase())
            list.push(s)
        }
    }
    return list.slice(0, 5)
}
// Measured layout (box = the safe area: below the HUD, above the LIVE GUIDE). Cue on top → the fog band with the
// worry words left / right of the rocket's column → the horizon, the landing pad → the beacons on the ground
// (front row nearest the thumb). Everything in box px.
function eosGroundLayout(W, H, safeTop, safeBottom, mirror) {
    const Hb = Math.max(260, H - safeTop - safeBottom)
    const narrow = W < 560
    const L = Math.round(narrow ? eosClamp(Hb * 0.15, 54, 62) : eosClamp(Hb * 0.18, 64, 86))
    const labH = narrow ? 40 : 44
    const block = L + 6 + labH
    const cue = narrow ? 46 : 52
    const mw = Math.round(narrow ? Math.min(120, (W - 6) / 3) : Math.min(180, W * 0.16))
    const fxs = narrow ? [0.5, 0.17, 0.83] : [0.5, 0.18, 0.82]
    const bxs = narrow ? [0.27, 0.73] : [0.34, 0.66]
    const yF = Math.round(Hb - block + L / 2 - 2)
    let minDx = Infinity
    for (const b of bxs) for (const f of fxs) minDx = Math.min(minDx, Math.abs(b - f) * W)
    // back row: staggered when the labels cannot collide sideways, else a full row above the front row
    const yB = Math.round(minDx >= mw + 12 ? yF - L * 0.98 : yF - block - 6)
    const hz = Math.round(yB - L / 2 - (narrow ? 12 : 16))
    const padY = Math.round(hz + (narrow ? 12 : 16))
    const top = cue + 4
    const RH = Math.round(eosClamp((padY - top) * (narrow ? 0.74 : 0.72), 60, 176))
    const RW = Math.round(RH * 0.74)
    const y0 = Math.round(top + RH * 0.43)
    const y5 = Math.round(padY - RH / 2 + 4)
    const mx = (f) => Math.round((mirror ? 1 - f : f) * W)
    const beacons = [
        { x: mx(fxs[0]), y: yF },
        { x: mx(fxs[1]), y: yF },
        { x: mx(fxs[2]), y: yF },
        { x: mx(bxs[0]), y: yB },
        { x: mx(bxs[1]), y: yB },
    ]
    const wl = narrow ? 0.21 : 0.28
    const wTop = top + 2
    const wBot = hz - 4
    const words = Array.from({ length: 5 }, (_, i) => ({ x: (i % 2 === 0) !== !!mirror ? Math.round(W * wl) : Math.round(W * (1 - wl)), y: Math.round(wTop + ((i + 0.5) * (wBot - wTop)) / 5) }))
    const half = Math.min(W * wl - 6, W / 2 - RW / 2 - 10 - W * wl)
    const wordMax = Math.round(eosClamp(half * 2, 96, narrow ? 150 : 320))
    const hs = Math.round(RH * 0.6)
    const hy = Math.round(y5 - RH / 2 - hs * 0.4)
    return {
        narrow,
        W: Math.round(W),
        H: Math.round(H),
        Hb: Math.round(Hb),
        st: safeTop,
        L,
        RH,
        RW,
        y0,
        y5,
        hz,
        padY,
        beacons,
        words,
        wordMax,
        vars: {
            "--aw": `${Math.round(W)}px`,
            "--lamp": `${L}px`,
            "--mw": `${mw}px`,
            "--cue": `${cue}px`,
            "--hz": `${hz}px`,
            "--padx": `${Math.round(W / 2)}px`,
            "--pady": `${padY}px`,
            "--rh": `${RH}px`,
            "--rw": `${RW}px`,
            "--hy": `${hy}px`,
            "--hs": `${hs}px`,
            "--mfs": narrow ? "14.6px" : "16px",
            "--cfs": narrow ? "17px" : "20px",
        },
    }
}

function EosGroundControlEngine({ game, entries = [], onProgress, onDone, sfx, rainSfx, reduced, imageSources, hasUserImages, variationSeed }) {
    useEosStore()
    const red = eosCalm(reduced)
    const rootRef = React.useRef(null)
    const pingRef = React.useRef(null)
    const beaconRefs = React.useRef([])
    const cbRef = React.useRef({})
    cbRef.current = { onProgress, onDone, sfx, rainSfx }

    // ---- per-mount constants (a replay remounts the engine → new missions, layout, palette)
    const setup = React.useMemo(() => {
        const seed = Math.abs(Math.round(Number(variationSeed) || 1))
        const v = seed % 3
        const kinds = EOS_GROUND_KINDS[v]
        const spots = EOS_GROUND_SPOT_START[(v + Math.floor(seed / 3)) % 3]
        const mi = []
        let si = 0
        let bi = 0
        const body = []
        kinds.forEach((k, i) => {
            if (k === "spot") mi[i] = spots[si++]
            else {
                mi[i] = -1
                body[i] = bi++ === 0 ? EOS_GROUND_FEET : EOS_GROUND_RELEASE[(seed + Math.floor(seed / 5)) % EOS_GROUND_RELEASE.length]
            }
        })
        return {
            v,
            kinds,
            mi,
            body,
            mirror: Math.floor(seed / 3) % 2 === 1,
            loud: EOS_GROUND_LOUD[(seed + Math.floor(seed / 7)) % 3],
            day: eosDayPart(),
            accent: EOS_GROUND_ACCENT[(seed + 1) % 3],
            happy: EOS_GROUND_FACE.happy[seed % EOS_GROUND_FACE.happy.length],
        }
    }, [])
    const words = React.useMemo(() => eosGroundWords(entries), [(entries || []).join("|")])
    const thumbs = hasUserImages ? (imageSources || []).filter(Boolean).slice(0, 5) : []

    // ---- UI state (changes only on taps, holds starting/pausing and beacons lighting — a few per second at most)
    const [ui, setUi] = React.useState(() => ({
        phase: "play", // play · landing · done
        st: setup.kinds.map(() => "idle"), // per beacon: idle · fill · hold · paused · lit
        mi: setup.mi.slice(),
        lit: 0,
        found: ["", "", "", "", ""], // slot → the icon revealed where the word burned
        beam: [null, null, null, null, null], // beacon → {a, l} (its sweep onto the word it burns)
        burst: ["", "", "", "", ""],
        sw: ["", "", "", "", ""],
        target: 0,
        face: EOS_GROUND_FACE.start,
        pop: "",
        nod: "",
        tilt: 0,
        lean: 0,
        cue: "start",
        holdI: -1,
    }))
    const [geo, setGeo] = React.useState(null)
    const geoRef = React.useRef(null)
    geoRef.current = geo

    // ---- the beacon machine (refs; one rAF loop)
    const S = React.useRef(null)
    if (!S.current)
        S.current = {
            alive: false,
            phase: "play",
            mount: eosGroundNow(),
            assist: false,
            lit: 0,
            order: [],
            lastTap: 0,
            thumb: null,
            target: 0,
            prog: -1,
            lastPartial: -1,
            doneSent: false,
            swaps: 0,
            quick: 0,
            pauses: 0,
            holdV: 0,
            lastAck: 0,
            ab: { pop: 0, nod: 0, ping: 0 },
            bab: [0, 0, 0, 0, 0],
            sab: [0, 0, 0, 0, 0],
            qab: [0, 0, 0, 0, 0],
            b: setup.kinds.map((kind, i) => ({ kind, mi: setup.mi[i], state: "idle", f: 0, painted: -1, t0: 0, fillMs: 0, acc: 0, hs: 0, pointer: null, auto: false, lastAct: 0 })),
            fills: [], //      [{i, ms, quick}] (dev handle)
            timers: [],
            sfxLog: [],
            plog: [],
        }

    const mission = (i) => {
        const b = S.current.b[i]
        return b.kind === "spot" ? EOS_GROUND_SPOTS[b.mi] || EOS_GROUND_SPOTS[0] : setup.body[i] || EOS_GROUND_FEET
    }
    const labelFor = (i) => (i < 0 ? EOS_GROUND_LABEL.looking : S.current.b[i].kind === "spot" ? EOS_GROUND_LABEL.spot : mission(i).label)
    const toggle = (arr, i) => {
        arr[i] = (arr[i] + 1) % 2
        return arr[i] ? "a" : "b"
    }
    const fx = {
        sfx(kind) {
            S.current.sfxLog.push(String(kind))
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
            s.plog.push(n)
            try {
                cbRef.current.onProgress?.(n, label)
            } catch {}
        },
        // instant (same-frame) squash on a beacon lamp — a DOM attribute, so it never waits for React
        squash(i) {
            const el = beaconRefs.current[i]
            if (el) el.setAttribute("data-sq", toggle(S.current.qab, i))
        },
        touch(i, pitch = 0) {
            fx.sfx("soft")
            eosTone(eosNote(3 + pitch, 330), 110, { type: "sine", gain: 0.03 })
            eosHaptic("touch")
            fx.squash(i)
        },
        ack(i) {
            const s = S.current
            const t = eosGroundNow()
            if (t - s.lastAck < 220) return
            s.lastAck = t
            fx.sfx("soft")
            eosTone(294, 80, { type: "sine", gain: 0.02 })
            eosHaptic("touch")
            if (i != null && i >= 0) fx.squash(i)
        },
    }
    // partial progress (< 18) for beacons being filled / held — strictly increasing reports only (fx.report)
    const partial = () => {
        let p = 0
        for (const b of S.current.b) {
            if (b.state === "fill") p += 4 + Math.floor(b.f * 2) * 3
            else if (b.state === "hold" || b.state === "paused") p += Math.floor((b.f * EOS_GROUND_HOLD_MS) / 750) * 3 + (b.state === "hold" ? 1 : 0)
        }
        return Math.min(16, p)
    }
    const labelNow = () => {
        const s = S.current
        if (s.phase === "landing") return EOS_GROUND_LABEL.land
        if (s.phase === "done") return EOS_GROUND_LABEL.done
        if (s.b.some((b) => b.state === "hold")) return EOS_GROUND_LABEL.holding
        return labelFor(s.target)
    }
    // The arrow: the beacon being held keeps it; else the next unlit beacon nearest the thumb (the last touch, or
    // the bottom-centre thumb zone before any touch). Filling beacons need no arrow (they finish by themselves).
    const pickTarget = () => {
        const s = S.current
        if (s.phase !== "play") return -1
        const h = s.b.findIndex((b) => b.state === "hold")
        if (h >= 0) return h
        const g = geoRef.current
        let best = -1
        let bd = Infinity
        for (let i = 0; i < s.b.length; i++) {
            const st = s.b[i].state
            if (st !== "idle" && st !== "paused") continue
            if (!g) return i
            const th = s.thumb || { x: g.W / 2, y: g.H }
            const p = g.beacons[i]
            const d = Math.hypot(p.x - th.x, p.y + g.st - th.y)
            if (d < bd - 0.5) {
                bd = d
                best = i
            }
        }
        return best
    }
    const leanTo = (i) => {
        const g = geoRef.current
        if (!g || i < 0) return 0
        return Math.round(eosClamp(((g.beacons[i].x - g.W / 2) / g.W) * 18, -7, 7) * 10) / 10
    }
    const sync = (extra) => {
        const s = S.current
        s.target = pickTarget()
        setUi((u) => ({ ...u, st: s.b.map((b) => b.state), mi: s.b.map((b) => b.mi), target: s.target, lit: s.lit, ...(extra || {}) }))
    }

    // ---- transitions
    const tapSpot = (i) => {
        const s = S.current
        const b = s.b[i]
        if (!s.alive || s.phase !== "play" || b.state !== "idle") return fx.ack(i)
        const now = eosGroundNow()
        const quick = s.lastTap > 0 && now - s.lastTap < EOS_GROUND_QUICK_MS
        s.lastTap = now
        if (quick) s.quick += 1
        b.state = "fill"
        b.t0 = now
        b.f = 0
        b.fillMs = s.assist ? EOS_GROUND_ASSIST_FILL : quick ? EOS_GROUND_SLOW_FILL_MS : EOS_GROUND_FILL_MS
        s.fills.push({ i, ms: b.fillMs, quick })
        fx.touch(i, s.lit)
        eosTone(eosNote(4 + s.lit, 262), Math.min(1200, b.fillMs), { type: "sine", gain: 0.022, glide: eosNote(6 + s.lit, 262) })
        sync({ cue: "fill", lean: leanTo(i) })
        fx.report(EOS_GROUND_STEP * s.lit + partial(), labelNow())
    }
    const startHold = (i) => {
        const s = S.current
        const b = s.b[i]
        if (!s.alive || s.phase !== "play" || (b.state !== "idle" && b.state !== "paused")) return fx.ack(i)
        b.state = "hold"
        b.hs = eosGroundNow()
        fx.touch(i, s.lit)
        eosTone(eosNote(2, 196), 900, { type: "sine", gain: 0.03, glide: eosNote(4, 196) })
        sync({ cue: "hold", holdI: i, lean: leanTo(i) })
        fx.report(EOS_GROUND_STEP * s.lit + partial(), EOS_GROUND_LABEL.holding)
    }
    const pauseHold = (i) => {
        const s = S.current
        const b = s.b[i]
        if (b.state !== "hold" || b.auto) return
        b.acc = Math.min(EOS_GROUND_HOLD_MS, b.acc + (eosGroundNow() - b.hs))
        b.state = "paused"
        s.pauses += 1
        eosTone(220, 160, { type: "sine", gain: 0.022, glide: 196 })
        sync({ cue: "paused", lean: 0 })
    }
    const light = (i) => {
        const s = S.current
        const b = s.b[i]
        if (b.state === "lit") return
        b.state = "lit"
        b.f = 1
        b.pointer = null
        b.auto = false
        const k = s.lit
        s.lit += 1
        s.order.push(i)
        const n = s.lit
        const m = mission(i)
        const g = geoRef.current
        let beam = { a: -90, l: 120 }
        if (g) {
            const from = g.beacons[i]
            const to = g.words[k]
            const dx = to.x - from.x
            const dy = to.y - from.y
            beam = { a: Math.round((Math.atan2(dy, dx) * 180) / Math.PI), l: Math.round(Math.hypot(dx, dy) + 12) }
        }
        // exactly ONE scored step per lit beacon (the consequence of the player's own find / hold)
        fx.sfx(`tskey:clean:${Math.min(5, k)}`)
        eosHaptic("hit")
        eosTone(eosNote(5 + k * 2, 262), 520, { type: "triangle", gain: 0.045 })
        eosTone(eosNote(7 + k * 2, 262), 420, { type: "sine", gain: 0.025, at: 0.42 })
        try {
            eosApi("dots").pulse?.("out")
        } catch {}
        const face = n === 2 ? EOS_GROUND_FACE.curious : n === 4 ? setup.happy : null
        const last = n >= 5
        if (last) {
            s.phase = "landing"
            s.timers.push(setTimeout(touchdown, EOS_GROUND_LAND_MS))
        }
        const cue = last ? "land" : n === 4 ? "last" : b.kind === "body" ? "body" : `found${k % 3}`
        s.target = pickTarget()
        setUi((u) => {
            const beams = u.beam.slice()
            beams[i] = beam
            const found = u.found.slice()
            found[k] = m.found
            const burst = u.burst.slice()
            burst[i] = toggle(s.bab, i)
            return {
                ...u,
                st: s.b.map((x) => x.state),
                lit: n,
                target: s.target,
                beam: beams,
                found,
                burst,
                cue,
                holdI: -1,
                lean: 0,
                tilt: leanTo(i),
                nod: toggle(s.ab, "nod"),
                phase: last ? "landing" : u.phase,
                ...(face != null ? { face, pop: toggle(s.ab, "pop") } : {}),
            }
        })
        s.lastPartial = -1
        fx.report(EOS_GROUND_STEP * n + (last ? 0 : partial()), labelNow())
    }
    const touchdown = () => {
        const s = S.current
        if (!s.alive || s.phase === "done") return
        s.phase = "done"
        s.target = -1
        setUi((u) => ({ ...u, phase: "done", face: EOS_GROUND_FACE.land, pop: toggle(s.ab, "pop"), cue: "done", target: -1, lean: 0 }))
        fx.report(96, EOS_GROUND_LABEL.done)
        fx.sfx("win")
        eosHaptic("finish")
        eosTone(84, 420, { type: "sine", gain: 0.09, glide: 44 }) // the soft landing thump
        ;[5, 7, 9, 10, 12].forEach((nn, k) => eosTone(eosNote(nn, 262), 520, { type: "triangle", gain: 0.032, at: 0.3 + k * 0.12 }))
        const bonus = Math.round(eosClamp(296 + (s.quick === 0 ? 24 : 0) + (s.pauses === 0 ? 20 : 0) + Math.min(20, s.swaps * 10), 260, 360))
        s.timers.push(
            setTimeout(() => {
                if (!s.alive) return
                fx.report(100, EOS_GROUND_LABEL.done)
                s.timers.push(
                    setTimeout(() => {
                        if (!s.alive || s.doneSent) return
                        s.doneSent = true
                        try {
                            cbRef.current.onDone?.(bonus)
                        } catch {}
                    }, EOS_GROUND_DONE_DELAY)
                )
            }, EOS_GROUND_FINALE_MS)
        )
    }
    const swap = (i) => {
        const s = S.current
        const b = s.b[i]
        if (!s.alive || b.kind !== "spot" || b.state !== "idle" || s.phase !== "play") return fx.ack(i)
        const used = new Set(s.b.filter((x, j) => j !== i && x.kind === "spot").map((x) => x.mi))
        const N = EOS_GROUND_SPOTS.length
        let j = b.mi
        for (let c = 0; c < N; c++) {
            j = (j + 1) % N
            if (!used.has(j)) break
        }
        b.mi = j
        s.swaps += 1
        fx.sfx("soft")
        eosTone(eosNote(6, 330), 90, { type: "triangle", gain: 0.03 })
        eosTone(eosNote(8, 330), 90, { type: "triangle", gain: 0.025, at: 0.07 })
        eosHaptic("touch")
        fx.squash(i)
        setUi((u) => {
            const sw = u.sw.slice()
            sw[i] = toggle(s.sab, i)
            return { ...u, mi: s.b.map((x) => x.mi), sw }
        })
    }
    // a press on a beacon (pointer, key or assistive click) → tap / start or resume the hold
    const activate = (i, how) => {
        const s = S.current
        const b = s.b[i]
        if (!b) return
        if (b.kind === "spot") return tapSpot(i)
        if (b.state === "idle" || b.state === "paused") {
            b.pointer = how
            b.auto = how === "auto" // an assistive-tech click cannot hold: the ring fills by itself
            return startHold(i)
        }
        fx.ack(i)
    }

    // ---- per-frame step (rAF): fills, holds, the live rings (CSS --f), the rocket settling under a hold
    const step = () => {
        const s = S.current
        if (!s.alive) return
        const now = eosGroundNow()
        if (!s.assist && now - s.mount > EOS_GROUND_ASSIST_AT) s.assist = true
        let holding = 0
        for (let i = 0; i < s.b.length; i++) {
            const b = s.b[i]
            if (b.state === "fill") {
                b.f = Math.min(1, (now - b.t0) / Math.max(1, b.fillMs))
                if (b.f >= 1) light(i)
            } else if (b.state === "hold" || b.state === "paused") {
                const need = s.assist ? EOS_GROUND_ASSIST_HOLD : EOS_GROUND_HOLD_MS
                const acc = b.acc + (b.state === "hold" ? now - b.hs : 0)
                b.f = Math.min(1, acc / need)
                if (b.state === "hold") {
                    holding = 1
                    if (b.f >= 1) light(i)
                }
            }
            const el = beaconRefs.current[i]
            if (el && Math.abs(b.painted - b.f) > 0.004) {
                b.painted = b.f
                el.style.setProperty("--f", b.f.toFixed(3))
            }
        }
        const hv = s.holdV + (holding - s.holdV) * 0.08
        if (Math.abs(hv - s.holdV) > 0.002) {
            s.holdV = hv
            const r = rootRef.current
            if (r) r.style.setProperty("--hold", hv.toFixed(3))
        }
        if (s.phase === "play") {
            const p = partial()
            if (p !== s.lastPartial) {
                s.lastPartial = p
                fx.report(EOS_GROUND_STEP * s.lit + p, labelNow())
            }
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
                const L = eosGroundLayout(r.width / k, r.height / k, st, sb, setup.mirror)
                for (const key in L.vars) root.style.setProperty(key, L.vars[key])
                setGeo((g) => (g && g.W === L.W && g.H === L.H && g.st === L.st ? g : L))
            } catch {}
        }
        measure()
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
        if (ro) ro.observe(root)
        return () => {
            if (ro) ro.disconnect()
        }
    }, [])
    // the arrow re-aims once the real beacon positions are known
    React.useEffect(() => {
        if (geo && S.current.phase === "play") sync()
    }, [geo])

    // ---- mount: progress 0, rAF, keyboard
    React.useEffect(() => {
        const s = S.current
        s.alive = true
        s.mount = eosGroundNow()
        eosGroundLive = { S: s, setup }
        if (s.prog < 0) {
            s.prog = 0
            s.plog.push(0)
            try {
                cbRef.current.onProgress?.(0, labelFor(pickTarget()))
            } catch {}
        }
        let raf = 0
        const tick = () => {
            raf = requestAnimationFrame(tick)
            step()
        }
        raf = requestAnimationFrame(tick)
        const isKey = (e) => e.key === " " || e.key === "Spacebar" || e.key === "Enter"
        // focus on the page / the arena (not on a beacon): Space/Enter plays the beacon the arrow points at
        const free = () => {
            const root = rootRef.current
            if (!root || !root.isConnected || typeof document === "undefined") return false
            const a = document.activeElement
            return !a || a === document.body || a === root
        }
        const kd = (e) => {
            if (!isKey(e) || !free()) return
            e.preventDefault()
            if (e.repeat) return
            const i = s.target
            if (i >= 0) activate(i, "key")
            else fx.ack(-1)
        }
        const ku = (e) => {
            if (!isKey(e)) return
            s.b.forEach((b, i) => {
                if (b.pointer === "key") {
                    b.pointer = null
                    pauseHold(i)
                }
            })
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
            if (eosGroundLive && eosGroundLive.S === s) eosGroundLive = null
        }
    }, [])

    // ---- input
    const toArena = (e) => {
        const root = rootRef.current
        if (!root) return null
        const R = root.getBoundingClientRect()
        const k = eosStageScale(root) || 1
        return { x: (e.clientX - R.left) / k, y: (e.clientY - R.top) / k }
    }
    const onRootDownCapture = (e) => {
        const p = toArena(e)
        if (p) S.current.thumb = p
    }
    // a touch on the empty scene: a soft sonar ping where the finger landed (every touch is answered)
    const onRootDown = (e) => {
        const s = S.current
        const p = toArena(e)
        const el = pingRef.current
        if (el && p) {
            el.style.left = `${Math.round(p.x)}px`
            el.style.top = `${Math.round(p.y)}px`
            s.ab.ping = (s.ab.ping + 1) % 2
            el.setAttribute("data-p", s.ab.ping ? "a" : "b")
        }
        fx.ack(-1)
        // the arrow follows the thumb: re-aim at the unlit beacon nearest this touch
        if (s.phase === "play" && pickTarget() !== s.target) sync()
    }
    const bDown = (i) => (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return
        e.stopPropagation()
        const b = S.current.b[i]
        b.lastAct = Date.now()
        if (b.kind === "body" && (b.state === "idle" || b.state === "paused")) {
            try {
                e.currentTarget.setPointerCapture(e.pointerId)
            } catch {}
        }
        activate(i, e.pointerId)
    }
    const bUp = (i) => (e) => {
        const b = S.current.b[i]
        b.lastAct = Date.now()
        if (b.kind !== "body" || b.pointer == null || b.pointer !== e.pointerId) return
        b.pointer = null
        pauseHold(i)
    }
    const isKeyEv = (e) => e.key === " " || e.key === "Spacebar" || e.key === "Enter"
    const bKeyDown = (i) => (e) => {
        if (!isKeyEv(e)) return
        e.preventDefault()
        e.stopPropagation()
        const b = S.current.b[i]
        b.lastAct = Date.now()
        if (e.repeat) return
        activate(i, "key")
    }
    const bKeyUp = (i) => (e) => {
        if (!isKeyEv(e)) return
        e.preventDefault()
        e.stopPropagation()
        const b = S.current.b[i]
        b.lastAct = Date.now()
        if (b.pointer === "key") {
            b.pointer = null
            pauseHold(i)
        }
    }
    // assistive tech activates with a bare click (no pointerdown / keydown before it)
    const bClick = (i) => () => {
        const b = S.current.b[i]
        if (Date.now() - b.lastAct < 900) return
        b.lastAct = Date.now()
        activate(i, "auto")
    }
    const swDown = (i) => (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return
        e.stopPropagation()
        S.current.b[i].lastAct = Date.now()
        swap(i)
    }
    const swKey = (i) => (e) => {
        if (!isKeyEv(e)) return
        e.preventDefault()
        e.stopPropagation()
        S.current.b[i].lastAct = Date.now()
        if (!e.repeat) swap(i)
    }
    const swClick = (i) => () => {
        const b = S.current.b[i]
        if (Date.now() - b.lastAct < 900) return
        b.lastAct = Date.now()
        swap(i)
    }

    // ---- render
    const { loud, accent } = setup
    const calm = EOS_GROUND_CALM[setup.day] || EOS_GROUND_CALM.day
    const ph = ui.phase
    const clr = ph === "play" ? ui.lit / 5 : 1
    const frac = ph === "play" ? ui.lit / 5.6 : 1
    const ry = geo ? Math.round(geo.y0 + (geo.y5 - geo.y0) * frac) : 0
    const rootStyle = {
        "--clr": clr.toFixed(2),
        "--l1": loud.sky[0],
        "--l2": loud.sky[1],
        "--l3": loud.sky[2],
        "--lh1": loud.hill[0],
        "--lh2": loud.hill[1],
        "--fog": loud.fog,
        "--glow": loud.glow,
        "--c1": calm.sky[0],
        "--c2": calm.sky[1],
        "--c3": calm.sky[2],
        "--ch1": calm.hill[0],
        "--ch2": calm.hill[1],
        "--aur": calm.aur,
        "--acc": accent[0],
        "--acc2": accent[1],
        "--lean": `${ui.lean}deg`,
        "--tilt": `${ui.tilt}deg`,
    }
    const cueKey = ui.cue === "hold" ? null : ui.cue
    const cue = cueKey ? EOS_GROUND_CUES[cueKey] || EOS_GROUND_CUES.start : [ui.holdI >= 0 ? (setup.body[ui.holdI] || EOS_GROUND_FEET).cue : "keep holding…", "keep holding · 3 seconds"]
    const mapPts = geo ? geo.words.map((w) => `${w.x},${w.y}`).join(" ") : ""
    return (
        <div
            ref={rootRef}
            className="arena eosArena eosG113 fs-mask"
            {...EOS_PRIVATE_ATTRS}
            data-phase={ph}
            data-calm={red ? "1" : "0"}
            data-day={setup.day}
            data-narrow={geo && geo.narrow ? "1" : "0"}
            data-v={setup.v}
            data-lit={ui.lit}
            style={rootStyle}
            onPointerDownCapture={onRootDownCapture}
            onPointerDown={onRootDown}
        >
            {/* layer 1 · sky: anxious violet → the calm sky of this time of day; stars, GLITCH's ringed planet */}
            <div className="eosGroundSky" aria-hidden="true">
                <i className="eosGroundSkyLoud" />
                <i className="eosGroundSkyCalm" />
                <i className="eosGroundAurora" />
                <i className="eosGroundStars" />
                <i className="eosGroundPlanet">
                    <b />
                </i>
            </div>
            {/* layer 2 · the ground: the little planet's hill, the landing pad, the touchdown dust */}
            <div className="eosGroundBox eosGroundBack" aria-hidden="true">
                <i className="eosGroundHill" />
                <div className="eosGroundPad">
                    {EOS_GROUND_PAD_LIGHTS.map((l, k) => (
                        <i key={k} style={{ "--cx": l.cx, "--cy": l.cy }} />
                    ))}
                </div>
                <div className="eosGroundDust">
                    {EOS_GROUND_DUST.map((d, k) => (
                        <i key={k} style={{ "--dx": `${d.x}px`, "--dy": `${d.y}px`, "--ds": d.s, "--dd": `${d.d}s` }} />
                    ))}
                </div>
            </div>
            {/* GLITCH's static over the world (fades with every beacon, gone at touchdown) */}
            <div className="eosGroundStatic" aria-hidden="true">
                <b />
                <b />
                <b />
            </div>
            <div className="eosGroundBox eosGroundMid">
                {/* the fog: a soft blur veil (8 px → 0) + drifting puffs */}
                <div className="eosGroundFog" aria-hidden="true">
                    <i className="eosGroundVeil" />
                    {EOS_GROUND_PUFFS.map((p, k) => (
                        <i key={k} className="eosGroundPuff" style={{ "--px": `${p.x}%`, "--py": `${p.y}%`, "--pw": `${p.w}%`, "--ph": `${p.h}%`, "--pd": `${p.d}s`, "--pk": k % 2 ? -1 : 1 }} />
                    ))}
                </div>
                {/* searchlight beams (one per beacon, pre-mounted) */}
                <div className="eosGroundBeams" aria-hidden="true">
                    {setup.kinds.map((_, i) => {
                        const p = geo ? geo.beacons[i] : { x: 0, y: 0 }
                        const bm = ui.beam[i] || { a: -90, l: 100 }
                        const fa = geo ? Math.round(-90 + ((p.x - geo.W / 2) / geo.W) * 56) : -90
                        return (
                            <i
                                key={i}
                                className="eosGroundBeam"
                                data-on={ui.st[i] === "lit" ? "1" : "0"}
                                style={{ "--lx": `${p.x}px`, "--ly": `${p.y}px`, "--ba": `${bm.a}deg`, "--bl": `${bm.l}px`, "--fa": `${fa}deg`, "--fl": `${geo ? Math.round(p.y + 30) : 200}px`, "--fd": `${(i * 0.09).toFixed(2)}s` }}
                            />
                        )
                    })}
                </div>
                {/* the finale's constellation: the five things you found, joined in gold */}
                {geo ? (
                    <svg className="eosGroundMap" width={geo.W} height={geo.Hb} viewBox={`0 0 ${geo.W} ${geo.Hb}`} aria-hidden="true">
                        <polyline points={mapPts} pathLength="100" />
                    </svg>
                ) : null}
                {/* the worry words in the fog — one burns off per beacon, a glowing found-icon takes its place */}
                <div className="eosGroundWords">
                    {geo
                        ? words.map((w, k) => {
                              const p = geo.words[k]
                              const th = thumbs[k]
                              return (
                                  <div key={k} className="eosGroundSlot" data-burn={ui.lit > k ? "1" : "0"} style={{ "--wx": `${p.x}px`, "--wy": `${p.y}px`, "--wm": `${geo.wordMax}px`, "--fd": `${(k * 0.12).toFixed(2)}s` }}>
                                      <i className="eosGroundSlotFog" aria-hidden="true" />
                                      <span className="eosGroundWordWrap">
                                          {th ? <img className="eosGroundThumb" src={th} alt="" draggable={false} /> : null}
                                          <EosWord text={w} className="eosGroundWord" />
                                      </span>
                                      <span className="eosGroundEmbers" aria-hidden="true">
                                          {EOS_GROUND_EMBERS.map((em, j) => (
                                              <i key={j} style={{ "--ex": `${em.x}px`, "--ey": `${em.y}px`, "--ed": `${em.d}s` }} />
                                          ))}
                                      </span>
                                      <span className="eosGroundFound" aria-hidden="true">
                                          <i />
                                          <b>{ui.found[k]}</b>
                                      </span>
                                  </div>
                              )
                          })
                        : null}
                </div>
                {/* layer 3 · GLITCH's rocket (key light top-left, cool rim right), one step down per beacon */}
                <div className="eosGroundRocket" data-pop={ui.pop} style={{ "--ry": `${ry}px`, "--rs": (0.82 + 0.18 * frac).toFixed(3) }} aria-hidden="true">
                    <div className="eosGroundCraft">
                        <div className="eosGroundNod" data-nod={ui.nod}>
                            <i className="eosGroundFlame">
                                <b />
                            </i>
                            <i className="eosGroundLeg l" />
                            <i className="eosGroundLeg r" />
                            <i className="eosGroundFin l" />
                            <i className="eosGroundFin r" />
                            <span className="eosGroundHull">
                                <i className="eosGroundBand" />
                                <i className="eosGroundAntenna" />
                                <span className="eosGroundDome">
                                    <img className="eosGroundFace" src={eosFace("glitch", ui.face)} alt="" draggable={false} />
                                    <i className="eosGroundDomeGloss" />
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
                {/* finale: GLITCH hops out onto the nose */}
                <div className="eosGroundHero" aria-hidden="true">
                    <i className="eosGroundHeroGlow" />
                    <img src={eosFace("glitch", EOS_GROUND_FACE.land)} alt="" draggable={false} />
                </div>
                <div className="eosGroundFogFront" aria-hidden="true">
                    <i />
                    <i />
                </div>
                {/* the five beacons on the ground */}
                <div className="eosGroundBeacons">
                    {setup.kinds.map((kind, i) => {
                        const p = geo ? geo.beacons[i] : { x: -999, y: -999 }
                        const m = kind === "spot" ? EOS_GROUND_SPOTS[ui.mi[i]] || EOS_GROUND_SPOTS[0] : setup.body[i] || EOS_GROUND_FEET
                        const st = ui.st[i]
                        const text = eosGroundMissionText(m)
                        const mk =
                            ui.target === i && ph === "play"
                                ? eosTarget(kind === "spot" ? { g: "tap", label: EOS_GROUND_LABEL.spot } : { g: "hold", ms: EOS_GROUND_HOLD_MS, label: m.label })
                                : {}
                        const aria =
                            st === "lit"
                                ? `${text} — beacon lit.`
                                : kind === "spot"
                                  ? `Beacon: ${text}. Find it around you, then tap.`
                                  : `Beacon: ${text}. Press and hold for 3 seconds while you do it.`
                        return (
                            <div key={i} ref={(el) => (beaconRefs.current[i] = el)} className="eosGroundBeacon" data-k={kind} data-st={st} data-sense={m.sense} data-side={geo && p.x > geo.W * 0.6 ? "l" : "r"} style={{ "--bx": `${p.x}px`, "--by": `${p.y}px` }}>
                                <button
                                    type="button"
                                    className="eosGroundLampBtn"
                                    aria-label={aria}
                                    {...mk}
                                    onPointerDown={bDown(i)}
                                    onPointerUp={bUp(i)}
                                    onPointerCancel={bUp(i)}
                                    onLostPointerCapture={bUp(i)}
                                    onKeyDown={bKeyDown(i)}
                                    onKeyUp={bKeyUp(i)}
                                    onClick={bClick(i)}
                                >
                                    <span className="eosGroundLamp">
                                        <i className="eosGroundShadow" />
                                        <span className="eosGroundSquash">
                                            <i className="eosGroundHalo" />
                                            <span className="eosGroundGlass">
                                                <span className="eosGroundIcon">{m.icon}</span>
                                            </span>
                                            <svg className="eosGroundRing" viewBox="0 0 100 100" aria-hidden="true">
                                                <circle className="eosGroundRingTrack" cx="50" cy="50" r="45" />
                                                <circle className="eosGroundRingArc" cx="50" cy="50" r="45" pathLength="100" transform="rotate(-90 50 50)" />
                                            </svg>
                                            <i className="eosGroundBurst" data-b={ui.burst[i]}>
                                                {EOS_GROUND_SPARKS.map((sp, j) => (
                                                    <b key={j} style={{ "--a": `${sp.a}deg`, "--r": `${sp.r}px` }} />
                                                ))}
                                            </i>
                                        </span>
                                    </span>
                                    <span className="eosGroundMission" data-sw={ui.sw[i]}>
                                        {m.t[0] ? `${m.t[0]} ` : ""}
                                        <b>{m.t[1]}</b>
                                        {m.t[2] ? ` ${m.t[2]}` : ""}
                                    </span>
                                </button>
                                {kind === "spot" ? (
                                    <button
                                        type="button"
                                        className="eosGroundSwap"
                                        aria-label={`Another mission instead of: ${text}`}
                                        tabIndex={st === "idle" ? 0 : -1}
                                        onPointerDown={swDown(i)}
                                        onKeyDown={swKey(i)}
                                        onClick={swClick(i)}
                                    >
                                        <span>
                                            <b aria-hidden="true">↻</b>
                                            {geo && !geo.narrow ? <em>another</em> : null}
                                        </span>
                                    </button>
                                ) : (
                                    <span className="eosGroundHoldTag" aria-hidden="true">
                                        <span>HOLD</span>
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
                <div className="eosGroundCue" aria-live="polite">
                    <b>{cue[0]}</b>
                    {cue[1] ? <small>{cue[1]}</small> : null}
                    <span className="eosSrOnly">{`${ui.lit} of 5 beacons lit.`}</span>
                </div>
            </div>
            <i className="eosGroundPing" ref={pingRef} aria-hidden="true" />
        </div>
    )
}

// ---------------------------------------------------------------- CSS (every rule under ${EOS_A} .eosG113)
const EOS_GROUND_R = `${EOS_A} .eosG113`
const EOS_GROUND_CSS = `
${EOS_GROUND_R}{--clr:0;--hold:0;--lamp:70px;--mw:170px;--cue:52px;--hz:240px;--padx:50%;--pady:256px;--rh:120px;--rw:82px;--hy:120px;--hs:72px;--mfs:16px;--cfs:20px;--fog:176,150,255;background:var(--l1);color:#fff;font-family:var(--eos-font);cursor:default;isolation:isolate;filter:none!important}
${EOS_GROUND_R} .eosGroundSky,${EOS_GROUND_R} .eosGroundSky>i{position:absolute;inset:0;display:block;pointer-events:none}
${EOS_GROUND_R} .eosGroundSkyLoud{background:radial-gradient(90% 55% at 50% 8%,rgba(var(--glow),.32),rgba(var(--glow),0) 70%),linear-gradient(180deg,var(--l1) 0%,var(--l2) 48%,var(--l3) 82%)}
${EOS_GROUND_R} .eosGroundSkyCalm{background:linear-gradient(180deg,var(--c1) 0%,var(--c2) 52%,var(--c3) 84%);opacity:var(--clr);transition:opacity 1.4s ease}
${EOS_GROUND_R} .eosGroundAurora{background:radial-gradient(60% 22% at 30% 18%,rgba(var(--aur),.55),rgba(var(--aur),0) 70%),radial-gradient(50% 18% at 72% 12%,rgba(var(--aur),.4),rgba(var(--aur),0) 70%);opacity:calc(var(--clr) * .8);transition:opacity 1.6s ease}
${EOS_GROUND_R} .eosGroundStars{bottom:40%!important;opacity:calc(.85 - var(--clr) * .55);transition:opacity 1.4s;background-image:radial-gradient(1.6px 1.6px at 7% 18%,#fff 50%,transparent 52%),radial-gradient(1.3px 1.3px at 17% 44%,#fff 50%,transparent 52%),radial-gradient(2px 2px at 29% 12%,#fff 50%,transparent 52%),radial-gradient(1.3px 1.3px at 41% 30%,#fff 50%,transparent 52%),radial-gradient(1.7px 1.7px at 57% 9%,#fff 50%,transparent 52%),radial-gradient(1.3px 1.3px at 66% 38%,#fff 50%,transparent 52%),radial-gradient(2px 2px at 78% 20%,#fff 50%,transparent 52%),radial-gradient(1.4px 1.4px at 89% 46%,#fff 50%,transparent 52%),radial-gradient(1.6px 1.6px at 95% 8%,#fff 50%,transparent 52%),radial-gradient(1.2px 1.2px at 49% 52%,#fff 50%,transparent 52%)}
${EOS_GROUND_R} .eosGroundPlanet{inset:auto!important;left:5%!important;top:calc(var(--eos-safe-top) * .5 - 22px)!important;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#ffd9f4,#c58bff 42%,#5a3aa6 78%);box-shadow:inset -6px -4px 10px rgba(30,10,70,.5),0 0 24px rgba(200,150,255,.45);opacity:calc(.9 - var(--clr) * .2)}
${EOS_GROUND_R} .eosGroundPlanet>b{position:absolute;left:-14px;right:-14px;top:17px;height:10px;border-radius:50%;border:2.5px solid rgba(255,220,250,.7);transform:rotate(-16deg);display:block}
${EOS_GROUND_R} .eosGroundBox{position:absolute;left:0;right:0;top:var(--eos-safe-top);bottom:var(--eos-safe-bottom);pointer-events:none}
${EOS_GROUND_R} .eosGroundBack{z-index:1}
${EOS_GROUND_R} .eosGroundMid{z-index:3}
${EOS_GROUND_R} .eosGroundHill{position:absolute;left:-30%;right:-30%;top:var(--hz);bottom:calc(var(--eos-safe-bottom) * -1 - 40px);display:block;border-radius:50% 50% 0 0/90px 90px 0 0;background:radial-gradient(9% 5% at 22% 9%,rgba(255,255,255,.1),rgba(255,255,255,0) 70%),radial-gradient(7% 4% at 71% 6%,rgba(255,255,255,.09),rgba(255,255,255,0) 70%),radial-gradient(12% 6% at 46% 22%,rgba(0,0,0,.18),rgba(0,0,0,0) 70%),radial-gradient(10% 5% at 84% 26%,rgba(0,0,0,.16),rgba(0,0,0,0) 70%),linear-gradient(180deg,var(--lh1),var(--lh2) 62%);box-shadow:inset 0 3px 0 rgba(225,210,255,.5),inset 0 22px 36px rgba(190,160,255,.22),0 -12px 46px rgba(var(--glow),.35);overflow:hidden}
${EOS_GROUND_R} .eosGroundHill::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,var(--ch1),var(--ch2) 70%);opacity:var(--clr);transition:opacity 1.4s ease}
${EOS_GROUND_R} .eosGroundPad{position:absolute;left:var(--padx);top:var(--pady);width:calc(var(--rw) * 2.1);height:calc(var(--rw) * .5);margin:calc(var(--rw) * -.25) 0 0 calc(var(--rw) * -1.05);border-radius:50%;background:radial-gradient(closest-side,rgba(255,236,190,.28),rgba(255,236,190,.08) 70%,transparent),radial-gradient(closest-side,rgba(20,10,50,.5),transparent);box-shadow:inset 0 0 0 3px rgba(255,214,120,calc(.35 + var(--clr) * .5)),0 0 calc(10px + var(--clr) * 24px) rgba(255,200,100,calc(.15 + var(--clr) * .45));transition:box-shadow 1s}
${EOS_GROUND_R} .eosGroundPad>i{position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px;border-radius:50%;display:block;background:#ffe39a;box-shadow:0 0 8px 2px rgba(255,210,110,.8);transform:translate(calc(var(--rw) * .98 * var(--cx)),calc(var(--rw) * .22 * var(--cy)));opacity:calc(.45 + var(--clr) * .55);transition:opacity 1s}
${EOS_GROUND_R} .eosGroundDust{position:absolute;left:var(--padx);top:var(--pady);width:0;height:0}
${EOS_GROUND_R} .eosGroundDust>i{position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 40% 40%,rgba(255,244,226,.95),rgba(230,210,200,.55) 55%,rgba(230,210,200,0) 72%);opacity:0;display:block}
${EOS_GROUND_R}[data-phase="done"] .eosGroundDust>i{animation:eosGroundDust 1.3s cubic-bezier(.2,.8,.3,1) var(--dd) forwards}
${EOS_GROUND_R}[data-phase="done"][data-calm="1"] .eosGroundDust>i{animation:eosGroundDustCalm 1.3s ease var(--dd) forwards}
${EOS_GROUND_R} .eosGroundStatic{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:calc((1 - var(--clr)) * .55);transition:opacity 1.2s ease;background:repeating-linear-gradient(180deg,rgba(225,205,255,.07) 0 2px,rgba(0,0,0,0) 2px 5px)}
${EOS_GROUND_R}[data-phase="done"] .eosGroundStatic,${EOS_GROUND_R}[data-phase="landing"] .eosGroundStatic{opacity:0}
${EOS_GROUND_R} .eosGroundStatic>b{position:absolute;left:0;right:0;height:14px;top:20%;display:block;background:linear-gradient(90deg,rgba(190,160,255,0),rgba(190,160,255,.16) 30%,rgba(140,220,255,.14) 70%,rgba(190,160,255,0));animation:eosGroundBar 9s linear infinite}
${EOS_GROUND_R} .eosGroundStatic>b:nth-child(2){top:55%;height:8px;animation-duration:13s;animation-delay:-5s}
${EOS_GROUND_R} .eosGroundStatic>b:nth-child(3){top:80%;height:10px;animation-duration:11s;animation-delay:-8s}
${EOS_GROUND_R}[data-calm="1"] .eosGroundStatic>b{animation:none}
${EOS_GROUND_R} .eosGroundFog{position:absolute;left:0;right:0;top:calc(var(--cue) - 8px);height:calc(var(--hz) - var(--cue) + 34px)}
${EOS_GROUND_R} .eosGroundVeil{position:absolute;inset:0;display:block;-webkit-backdrop-filter:blur(calc((1 - var(--clr)) * 8px));backdrop-filter:blur(calc((1 - var(--clr)) * 8px));background:linear-gradient(180deg,rgba(var(--fog),0),rgba(var(--fog),.2) 22%,rgba(var(--fog),.24) 78%,rgba(var(--fog),0));opacity:calc(1 - var(--clr) * .7);transition:opacity 1.2s ease,backdrop-filter 1.2s ease,-webkit-backdrop-filter 1.2s ease;-webkit-mask-image:linear-gradient(180deg,transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(180deg,transparent,#000 14%,#000 86%,transparent)}
${EOS_GROUND_R}[data-phase="done"] .eosGroundVeil{-webkit-backdrop-filter:blur(0px);backdrop-filter:blur(0px);opacity:0;transition-duration:1.6s}
${EOS_GROUND_R} .eosGroundPuff{position:absolute;left:var(--px);top:var(--py);width:var(--pw);height:var(--ph);transform:translate(-50%,-50%);border-radius:50%;display:block;background:radial-gradient(closest-side,rgba(var(--fog),.5),rgba(var(--fog),.2) 58%,rgba(var(--fog),0));opacity:calc(1 - var(--clr) * .8);transition:opacity 1.4s ease;animation:eosGroundDrift var(--pd) ease-in-out infinite alternate}
${EOS_GROUND_R}[data-phase="done"] .eosGroundPuff{opacity:0}
${EOS_GROUND_R}[data-calm="1"] .eosGroundPuff{animation:none}
${EOS_GROUND_R} .eosGroundFogFront{position:absolute;left:0;right:0;top:0;bottom:0;z-index:5;pointer-events:none}
${EOS_GROUND_R} .eosGroundFogFront>i{position:absolute;left:calc(var(--padx) - var(--rw) * 1.4);top:calc(var(--cue) + var(--rh) * .55);width:calc(var(--rw) * 1.5);height:calc(var(--rh) * .34);border-radius:50%;display:block;background:radial-gradient(closest-side,rgba(var(--fog),.4),rgba(var(--fog),0));opacity:calc((1 - var(--clr)) * .9);transition:opacity 1.2s;animation:eosGroundDrift 10s ease-in-out infinite alternate}
${EOS_GROUND_R} .eosGroundFogFront>i:nth-child(2){left:calc(var(--padx) + var(--rw) * .1);top:calc(var(--cue) + var(--rh) * .95);animation-duration:12s;--pk:-1}
${EOS_GROUND_R}[data-calm="1"] .eosGroundFogFront>i{animation:none}
${EOS_GROUND_R}[data-phase="done"] .eosGroundFogFront>i,${EOS_GROUND_R}[data-phase="landing"] .eosGroundFogFront>i{opacity:0}
${EOS_GROUND_R} .eosGroundBeams{position:absolute;inset:0;z-index:2}
${EOS_GROUND_R} .eosGroundBeam{position:absolute;left:var(--lx);top:var(--ly);width:var(--bl);height:54px;margin-top:-27px;display:block;transform-origin:0 50%;transform:rotate(var(--ba));opacity:0;background:linear-gradient(90deg,rgba(255,236,170,.95),rgba(255,214,120,.5) 60%,rgba(255,214,120,.08));clip-path:polygon(0 44%,100% 0,100% 100%,0 56%);filter:blur(1px)}
${EOS_GROUND_R} .eosGroundBeam[data-on="1"]{animation:eosGroundSweep 1.5s cubic-bezier(.3,.7,.3,1) forwards}
${EOS_GROUND_R}[data-calm="1"] .eosGroundBeam[data-on="1"]{animation:eosGroundSweepCalm 1.5s ease forwards}
${EOS_GROUND_R}[data-phase="done"] .eosGroundBeam[data-on="1"]{animation:eosGroundSalute 1.3s cubic-bezier(.3,1.2,.4,1) var(--fd) forwards}
${EOS_GROUND_R}[data-phase="done"][data-calm="1"] .eosGroundBeam[data-on="1"]{animation:eosGroundSaluteCalm 1.6s ease var(--fd) forwards}
${EOS_GROUND_R} .eosGroundMap{position:absolute;left:0;top:0;z-index:2;overflow:visible}
${EOS_GROUND_R} .eosGroundMap polyline{fill:none;stroke:rgba(255,226,140,.85);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;stroke-dashoffset:100;filter:drop-shadow(0 0 5px rgba(255,210,110,.9));opacity:0}
${EOS_GROUND_R}[data-phase="done"] .eosGroundMap polyline{opacity:1;stroke-dashoffset:0;transition:stroke-dashoffset 1.3s ease .35s,opacity .3s ease .35s}
${EOS_GROUND_R}[data-phase="done"][data-calm="1"] .eosGroundMap polyline{stroke-dashoffset:0;transition:opacity 1s ease .6s}
${EOS_GROUND_R} .eosGroundWords{position:absolute;inset:0;z-index:3}
${EOS_GROUND_R} .eosGroundSlot{position:absolute;left:var(--wx);top:var(--wy);width:max-content;max-width:var(--wm);transform:translate(-50%,-50%);text-align:center;display:flex;flex-direction:column;align-items:center}
${EOS_GROUND_R} .eosGroundSlotFog{position:absolute;left:50%;top:50%;width:calc(100% + 56px);height:calc(100% + 34px);transform:translate(-50%,-50%);border-radius:50%;display:block;background:radial-gradient(closest-side,rgba(28,14,70,.62),rgba(60,36,130,.34) 55%,rgba(var(--fog),0));transition:opacity 1s ease .5s}
${EOS_GROUND_R} .eosGroundSlot[data-burn="1"] .eosGroundSlotFog{opacity:0}
${EOS_GROUND_R} .eosGroundWordWrap{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;max-width:100%}
${EOS_GROUND_R} .eosGroundWordWrap .eosWord,${EOS_GROUND_R} .eosGroundWordWrap .tsExactUserText{max-width:100%!important;width:auto!important;text-align:center!important;transition:color .35s ease .45s,text-shadow .35s ease .45s}
${EOS_GROUND_R} .eosGroundSlot[data-burn="1"] .eosGroundWordWrap .eosWord{color:#ffe7a0!important;text-shadow:0 0 10px rgba(255,190,80,.95),0 0 22px rgba(255,150,60,.7)!important}
${EOS_GROUND_R} .eosGroundSlot[data-burn="1"] .eosGroundWordWrap{animation:eosGroundBurn 1s ease-in .55s forwards}
${EOS_GROUND_R}[data-calm="1"] .eosGroundSlot[data-burn="1"] .eosGroundWordWrap{animation:eosGroundBurnCalm 1s ease .55s forwards}
${EOS_GROUND_R} .eosGroundThumb{width:40px;height:40px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,255,255,.6),0 4px 10px rgba(0,0,0,.4)}
${EOS_GROUND_R} .eosGroundEmbers{position:absolute;left:50%;top:50%;width:0;height:0}
${EOS_GROUND_R} .eosGroundEmbers>i{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;display:block;background:#ffd36b;box-shadow:0 0 8px 2px rgba(255,170,60,.85);opacity:0}
${EOS_GROUND_R} .eosGroundSlot[data-burn="1"] .eosGroundEmbers>i{animation:eosGroundEmber 1.2s ease-out calc(.7s + var(--ed)) forwards}
${EOS_GROUND_R}[data-calm="1"] .eosGroundSlot[data-burn="1"] .eosGroundEmbers>i{animation:none}
${EOS_GROUND_R} .eosGroundFound{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;display:grid;place-items:center;opacity:0;transform:scale(.3)}
${EOS_GROUND_R} .eosGroundFound>i{position:absolute;inset:-6px;border-radius:50%;display:block;background:radial-gradient(closest-side,rgba(255,236,160,.85),rgba(255,200,90,.35) 55%,rgba(255,200,90,0))}
${EOS_GROUND_R} .eosGroundFound>b{position:relative;font:400 26px/1 var(--eos-font);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
${EOS_GROUND_R} .eosGroundSlot[data-burn="1"] .eosGroundFound{animation:eosGroundFoundIn .8s cubic-bezier(.3,1.6,.5,1) 1.3s forwards}
${EOS_GROUND_R}[data-calm="1"] .eosGroundSlot[data-burn="1"] .eosGroundFound{animation:eosGroundFadeIn .8s ease 1.3s forwards;transform:none}
${EOS_GROUND_R}[data-phase="done"] .eosGroundSlot .eosGroundFound>i{animation:eosGroundTwinkle 1.4s ease-in-out calc(.5s + var(--fd)) infinite alternate}
${EOS_GROUND_R}[data-phase="done"][data-calm="1"] .eosGroundSlot .eosGroundFound>i{animation:none}
${EOS_GROUND_R} .eosGroundRocket{position:absolute;left:var(--padx);top:0;width:var(--rw);height:var(--rh);margin-left:calc(var(--rw) / -2);z-index:4;transform:translateY(calc(var(--ry) - var(--rh) / 2)) scale(var(--rs));transform-origin:50% 100%;transition:transform 1.1s cubic-bezier(.34,1.3,.5,1) .4s}
${EOS_GROUND_R}[data-phase="landing"] .eosGroundRocket{transition:transform 1s cubic-bezier(.45,.05,.55,1) .25s}
${EOS_GROUND_R}[data-calm="1"] .eosGroundRocket{transition:transform .01s linear .45s}
${EOS_GROUND_R} .eosGroundCraft{position:absolute;inset:0;rotate:var(--lean);translate:0 calc(var(--hold) * 7px);transition:rotate .6s cubic-bezier(.3,1.4,.5,1);animation:eosGroundBob 3.4s ease-in-out infinite}
${EOS_GROUND_R}[data-calm="1"] .eosGroundCraft,${EOS_GROUND_R}[data-phase="done"] .eosGroundCraft{animation:none}
${EOS_GROUND_R} .eosGroundNod{position:absolute;inset:0}
${EOS_GROUND_R} .eosGroundNod[data-nod="a"]{animation:eosGroundNodA .9s cubic-bezier(.3,1.4,.5,1)}
${EOS_GROUND_R} .eosGroundNod[data-nod="b"]{animation:eosGroundNodB .9s cubic-bezier(.3,1.4,.5,1)}
${EOS_GROUND_R}[data-calm="1"] .eosGroundNod{animation:none!important}
${EOS_GROUND_R}[data-phase="done"] .eosGroundNod{animation:eosGroundLand .8s cubic-bezier(.3,1.5,.5,1)!important}
${EOS_GROUND_R}[data-phase="done"][data-calm="1"] .eosGroundNod{animation:none!important}
${EOS_GROUND_R} .eosGroundHull{position:absolute;left:0;top:0;width:100%;height:84%;border-radius:50% 50% 44% 44%/64% 64% 36% 36%;background:radial-gradient(circle at 30% 22%,#ffffff 0,#f4efff 26%,#d3c9f5 58%,#9a8ed6 86%,#7a6fb8 100%);box-shadow:inset calc(var(--rw) * -.09) 0 calc(var(--rw) * .12) rgba(110,220,255,.6),inset calc(var(--rw) * .06) calc(var(--rw) * .08) calc(var(--rw) * .12) rgba(255,240,215,.75),0 calc(var(--rw) * .1) calc(var(--rw) * .28) rgba(0,0,0,.38);display:block}
${EOS_GROUND_R} .eosGroundBand{position:absolute;left:0;right:0;top:66%;height:12%;display:block;background:linear-gradient(180deg,var(--acc),var(--acc2));clip-path:ellipse(50% 120% at 50% 0%);opacity:.95}
${EOS_GROUND_R} .eosGroundAntenna{position:absolute;left:50%;top:-14%;width:3px;height:16%;margin-left:-1.5px;display:block;background:#cfc6f2;border-radius:2px}
${EOS_GROUND_R} .eosGroundAntenna::after{content:"";position:absolute;left:50%;top:-6px;width:9px;height:9px;margin-left:-4.5px;border-radius:50%;background:var(--acc);box-shadow:0 0 10px 2px var(--acc);animation:eosGroundBlink 2.4s ease-in-out infinite alternate}
${EOS_GROUND_R}[data-calm="1"] .eosGroundAntenna::after{animation:none}
${EOS_GROUND_R} .eosGroundDome{position:absolute;left:9%;right:9%;top:15%;aspect-ratio:1;border-radius:50%;overflow:hidden;display:block;background:radial-gradient(circle at 50% 38%,#d8f1ff 0,#9fc8ff 34%,#6a78d8 70%,#4a4aa6 100%);box-shadow:0 0 0 calc(var(--rw) * .05) #e8e1ff,0 0 0 calc(var(--rw) * .075) #8f84c9,inset 0 calc(var(--rw) * -.04) calc(var(--rw) * .1) rgba(0,0,0,.5)}
${EOS_GROUND_R} .eosGroundFace{position:absolute;left:4%;top:6%;width:92%;height:92%;object-fit:contain;transform-origin:50% 80%;filter:drop-shadow(calc((1 - var(--clr)) * 2px) 0 0 rgba(255,70,150,.6)) drop-shadow(calc((1 - var(--clr)) * -2px) 0 0 rgba(70,210,255,.6)) drop-shadow(-1px -2px 0 rgba(255,232,190,.5));transition:opacity .5s ease .4s}
${EOS_GROUND_R} .eosGroundRocket[data-pop="a"] .eosGroundFace{animation:eosGroundPopA .6s cubic-bezier(.3,1.5,.5,1)}
${EOS_GROUND_R} .eosGroundRocket[data-pop="b"] .eosGroundFace{animation:eosGroundPopB .6s cubic-bezier(.3,1.5,.5,1)}
${EOS_GROUND_R}[data-calm="1"] .eosGroundFace{animation:none!important}
${EOS_GROUND_R}[data-phase="done"] .eosGroundFace{opacity:0}
${EOS_GROUND_R} .eosGroundDomeGloss{position:absolute;left:14%;top:8%;width:42%;height:26%;border-radius:50%;display:block;background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0));transform:rotate(-18deg)}
${EOS_GROUND_R} .eosGroundFin{position:absolute;bottom:10%;width:30%;height:34%;display:block;background:linear-gradient(180deg,var(--acc),var(--acc2));border-radius:70% 10% 30% 20%}
${EOS_GROUND_R} .eosGroundFin.l{left:-16%;transform:skewY(18deg)}
${EOS_GROUND_R} .eosGroundFin.r{right:-16%;border-radius:10% 70% 20% 30%;transform:skewY(-18deg)}
${EOS_GROUND_R} .eosGroundLeg{position:absolute;bottom:2%;width:5%;height:20%;display:block;background:#b8aee6;border-radius:3px;transform-origin:50% 0;transform:scaleY(0);transition:transform .5s cubic-bezier(.3,1.5,.5,1) .5s}
${EOS_GROUND_R} .eosGroundLeg.l{left:16%;rotate:16deg}
${EOS_GROUND_R} .eosGroundLeg.r{right:16%;rotate:-16deg}
${EOS_GROUND_R}[data-phase="landing"] .eosGroundLeg,${EOS_GROUND_R}[data-phase="done"] .eosGroundLeg{transform:scaleY(1)}
${EOS_GROUND_R} .eosGroundFlame{position:absolute;left:50%;top:80%;width:34%;height:42%;margin-left:-17%;display:block;transform-origin:50% 0;animation:eosGroundFlicker .32s ease-in-out infinite alternate;transition:opacity .6s ease .9s}
${EOS_GROUND_R} .eosGroundFlame,${EOS_GROUND_R} .eosGroundFlame>b{border-radius:50% 50% 50% 50%/40% 40% 60% 60%}
${EOS_GROUND_R} .eosGroundFlame{background:radial-gradient(ellipse at 50% 25%,#fff6d0 0,#ffc65a 35%,#ff7a3a 65%,rgba(255,90,60,0) 78%)}
${EOS_GROUND_R} .eosGroundFlame>b{position:absolute;left:22%;right:22%;top:0;height:60%;display:block;background:radial-gradient(ellipse at 50% 20%,#ffffff,rgba(255,240,200,0) 75%)}
${EOS_GROUND_R}[data-calm="1"] .eosGroundFlame{animation:none}
${EOS_GROUND_R}[data-phase="done"] .eosGroundFlame{opacity:0}
${EOS_GROUND_R} .eosGroundHero{position:absolute;left:var(--padx);top:var(--hy);width:var(--hs);height:var(--hs);margin:calc(var(--hs) / -2) 0 0 calc(var(--hs) / -2);z-index:4;opacity:0;transform:translateY(calc(var(--hs) * .5)) scale(.3);pointer-events:none}
${EOS_GROUND_R} .eosGroundHero>img{position:relative;width:100%;height:100%;object-fit:contain;filter:drop-shadow(-3px -3px 0 rgba(255,228,180,.55)) drop-shadow(3px 0 0 rgba(130,220,255,.75)) drop-shadow(0 6px 8px rgba(0,0,0,.35))}
${EOS_GROUND_R} .eosGroundHeroGlow{position:absolute;inset:-35%;border-radius:50%;display:block;background:radial-gradient(closest-side,rgba(255,230,150,.75),rgba(255,200,100,.25) 55%,rgba(255,200,100,0))}
${EOS_GROUND_R}[data-phase="done"] .eosGroundHero{animation:eosGroundHop 1.1s cubic-bezier(.3,1.4,.5,1) .2s forwards,eosGroundHappy 1.6s ease-in-out 1.3s infinite alternate}
${EOS_GROUND_R}[data-phase="done"][data-calm="1"] .eosGroundHero{animation:eosGroundFadeIn .8s ease .2s forwards;transform:none}
${EOS_GROUND_R} .eosGroundBeacons{position:absolute;inset:0;z-index:6}
${EOS_GROUND_R} .eosGroundBeacon{position:absolute;left:var(--bx);top:var(--by);width:var(--mw);margin:calc(var(--lamp) / -2) 0 0 calc(var(--mw) / -2);pointer-events:none;--f:0}
${EOS_GROUND_R} .eosGroundLampBtn{pointer-events:none;border-radius:20px;display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;min-height:72px;touch-action:none;position:relative}
${EOS_GROUND_R} .eosGroundLamp{position:relative;width:var(--lamp);height:var(--lamp);display:block;flex:none}
${EOS_GROUND_R} .eosGroundLamp,${EOS_GROUND_R} .eosGroundMission{pointer-events:auto}
${EOS_GROUND_R} .eosGroundLamp::before{content:"";position:absolute;inset:-8px;border-radius:50%}
${EOS_GROUND_R} .eosGroundShadow{position:absolute;left:8%;right:8%;bottom:-9%;height:22%;border-radius:50%;display:block;background:radial-gradient(closest-side,rgba(0,0,0,.45),rgba(0,0,0,0))}
${EOS_GROUND_R} .eosGroundSquash{position:absolute;inset:0;display:block;transform-origin:50% 90%}
${EOS_GROUND_R} .eosGroundBeacon[data-sq="a"] .eosGroundSquash{animation:eosGroundSquashA .42s cubic-bezier(.3,1.5,.5,1)}
${EOS_GROUND_R} .eosGroundBeacon[data-sq="b"] .eosGroundSquash{animation:eosGroundSquashB .42s cubic-bezier(.3,1.5,.5,1)}
${EOS_GROUND_R}[data-calm="1"] .eosGroundBeacon[data-sq="a"] .eosGroundSquash{animation:eosGroundSquashCalmA .3s ease}
${EOS_GROUND_R}[data-calm="1"] .eosGroundBeacon[data-sq="b"] .eosGroundSquash{animation:eosGroundSquashCalmB .3s ease}
${EOS_GROUND_R} .eosGroundHalo{position:absolute;inset:-30%;border-radius:50%;display:block;background:radial-gradient(closest-side,rgba(255,214,110,.75),rgba(255,180,80,.28) 55%,rgba(255,180,80,0));opacity:calc(var(--f) * .55);transition:opacity .25s}
${EOS_GROUND_R} .eosGroundBeacon[data-st="lit"] .eosGroundHalo{opacity:1;animation:eosGroundGlow 2.6s ease-in-out infinite alternate}
${EOS_GROUND_R}[data-calm="1"] .eosGroundBeacon[data-st="lit"] .eosGroundHalo{animation:none}
${EOS_GROUND_R} .eosGroundGlass{position:absolute;inset:0;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.6),rgba(190,170,255,.32) 30%,rgba(52,34,120,.95) 72%,rgba(30,18,80,1) 100%);box-shadow:inset 0 -7px 12px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.4),inset -4px 0 8px rgba(120,220,255,.35),0 6px 14px rgba(0,0,0,.45),0 0 0 2px rgba(200,180,255,.5);transition:background .5s ease,box-shadow .5s ease}
${EOS_GROUND_R} .eosGroundBeacon[data-k="body"] .eosGroundGlass{background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.6),rgba(150,230,255,.3) 30%,rgba(28,70,120,.95) 72%,rgba(16,40,80,1) 100%);box-shadow:inset 0 -7px 12px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.4),0 6px 14px rgba(0,0,0,.45),0 0 0 2px rgba(150,230,255,.55)}
${EOS_GROUND_R} .eosGroundGlass::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(closest-side,rgba(255,226,140,.95),rgba(255,190,90,.5) 60%,rgba(255,190,90,0));opacity:var(--f);transform:scale(calc(.35 + var(--f) * .7))}
${EOS_GROUND_R} .eosGroundBeacon[data-st="lit"] .eosGroundGlass{background:radial-gradient(circle at 34% 26%,#fffdf0,#ffe08a 36%,#ffb347 74%,#f08a3a 100%);box-shadow:inset 0 -7px 12px rgba(160,70,0,.35),inset 0 2px 0 rgba(255,255,255,.7),0 6px 14px rgba(0,0,0,.35),0 0 0 2px rgba(255,236,170,.9),0 0 22px 6px rgba(255,196,90,.55)}
${EOS_GROUND_R} .eosGroundBeacon[data-st="lit"] .eosGroundGlass::after{opacity:0}
${EOS_GROUND_R} .eosGroundIcon{position:relative;z-index:1;font:400 calc(var(--lamp) * .44)/1 var(--eos-font);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
${EOS_GROUND_R} .eosGroundRing{position:absolute;left:-12%;top:-12%;width:124%;height:124%;overflow:visible;pointer-events:none}
${EOS_GROUND_R} .eosGroundRingTrack{fill:none;stroke:rgba(255,255,255,.2);stroke-width:4.5}
${EOS_GROUND_R} .eosGroundBeacon[data-k="body"] .eosGroundRingTrack{stroke:rgba(170,235,255,.55);stroke-dasharray:4 5}
${EOS_GROUND_R} .eosGroundRingArc{fill:none;stroke:#ffd76a;stroke-width:6;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:calc(100 - var(--f) * 100);filter:drop-shadow(0 0 4px rgba(255,200,90,.9))}
${EOS_GROUND_R} .eosGroundBeacon[data-st="idle"] .eosGroundRingArc{opacity:0}
${EOS_GROUND_R} .eosGroundBeacon[data-st="paused"] .eosGroundRingArc{stroke:#a9e8ff;animation:eosGroundPaused 1.6s ease-in-out infinite alternate}
${EOS_GROUND_R}[data-calm="1"] .eosGroundBeacon[data-st="paused"] .eosGroundRingArc{animation:none}
${EOS_GROUND_R} .eosGroundBurst{position:absolute;left:50%;top:50%;width:0;height:0;display:block}
${EOS_GROUND_R} .eosGroundBurst>b{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;display:block;background:#fff1b8;box-shadow:0 0 8px 2px rgba(255,200,90,.9);opacity:0}
${EOS_GROUND_R} .eosGroundBurst[data-b="a"]>b{animation:eosGroundSparkA .8s ease-out forwards}
${EOS_GROUND_R} .eosGroundBurst[data-b="b"]>b{animation:eosGroundSparkB .8s ease-out forwards}
${EOS_GROUND_R}[data-calm="1"] .eosGroundBurst>b{animation:none!important}
${EOS_GROUND_R} .eosGroundMission{display:block;max-width:100%;padding:3px 6px 4px;border-radius:14px;background:rgba(18,10,48,.62);box-shadow:0 2px 8px rgba(0,0,0,.25);font:800 var(--mfs)/1.12 var(--eos-font);color:#fff;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.8);letter-spacing:0;overflow-wrap:break-word}
${EOS_GROUND_R} .eosGroundMission>b{color:#ffd76a;font-weight:900;letter-spacing:.02em}
${EOS_GROUND_R} .eosGroundBeacon[data-st="lit"] .eosGroundMission{background:rgba(120,70,10,.55);color:#fff6dc}
${EOS_GROUND_R} .eosGroundMission[data-sw="a"]{animation:eosGroundSwapA .45s ease}
${EOS_GROUND_R} .eosGroundMission[data-sw="b"]{animation:eosGroundSwapB .45s ease}
${EOS_GROUND_R} .eosGroundSwap,${EOS_GROUND_R} .eosGroundHoldTag{position:absolute;left:calc(50% + var(--lamp) * .3);top:calc(var(--lamp) * .5 - 34px);min-width:42px;height:42px;pointer-events:auto;display:flex;align-items:center;justify-content:flex-start;touch-action:none}
${EOS_GROUND_R} .eosGroundSwap>span{display:flex;align-items:center;gap:4px;height:30px;min-width:30px;padding:0 8px;border-radius:16px;background:linear-gradient(180deg,rgba(80,60,170,.95),rgba(40,26,110,.95));box-shadow:0 0 0 1.5px rgba(210,195,255,.7),0 3px 8px rgba(0,0,0,.4);color:#fff;font:800 14.6px/1 var(--eos-font);white-space:nowrap}
${EOS_GROUND_R} .eosGroundSwap>span>b{font-size:17px;line-height:1;color:#ffd76a}
${EOS_GROUND_R} .eosGroundSwap>span>em{font-style:normal}
${EOS_GROUND_R} .eosGroundBeacon[data-side="l"] .eosGroundSwap,${EOS_GROUND_R} .eosGroundBeacon[data-side="l"] .eosGroundHoldTag{left:auto;right:calc(50% + var(--lamp) * .3);justify-content:flex-end}
${EOS_GROUND_R} .eosGroundHoldTag{pointer-events:none;min-width:0}
${EOS_GROUND_R} .eosGroundHoldTag>span{display:flex;align-items:center;height:24px;padding:0 7px;border-radius:12px;background:linear-gradient(180deg,rgba(40,120,170,.95),rgba(16,60,110,.95));box-shadow:0 0 0 1.5px rgba(170,235,255,.75),0 3px 8px rgba(0,0,0,.4);color:#fff;font:800 14.6px/1 var(--eos-font);letter-spacing:.04em}
${EOS_GROUND_R} .eosGroundBeacon[data-st="lit"] .eosGroundHoldTag{opacity:0;visibility:hidden}
${EOS_GROUND_R}[data-narrow="1"] .eosGroundSwap>span{padding:0;justify-content:center;width:30px}
${EOS_GROUND_R} .eosGroundBeacon:not([data-st="idle"]) .eosGroundSwap{visibility:hidden;opacity:0;pointer-events:none}
${EOS_GROUND_R} .eosGroundCue{position:absolute;left:50%;top:0;width:min(94%,620px);transform:translateX(-50%);text-align:center;z-index:7;pointer-events:none}
${EOS_GROUND_R} .eosGroundCue>b{display:block;font:800 var(--cfs)/1.15 var(--eos-font);color:#fff;text-shadow:0 2px 10px rgba(10,0,40,.85),0 0 2px rgba(0,0,0,.6)}
${EOS_GROUND_R} .eosGroundCue>small{display:block;margin-top:2px;font:700 14.6px/1.2 var(--eos-font);color:rgba(255,255,255,.92);text-shadow:0 1px 6px rgba(10,0,40,.9)}
${EOS_GROUND_R} .eosGroundPing{position:absolute;left:0;top:0;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;z-index:8;display:block;pointer-events:none;border:2px solid rgba(255,224,150,.8);opacity:0}
${EOS_GROUND_R} .eosGroundPing[data-p="a"]{animation:eosGroundPingA .6s ease-out}
${EOS_GROUND_R} .eosGroundPing[data-p="b"]{animation:eosGroundPingB .6s ease-out}
${EOS_GROUND_R}[data-calm="1"] .eosGroundPing[data-p]{animation-name:eosGroundPingCalm}
@keyframes eosGroundBar{0%{transform:translateY(-120px);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(220px);opacity:0}}
@keyframes eosGroundDrift{from{translate:calc(var(--pk,1) * -14px) 0}to{translate:calc(var(--pk,1) * 14px) 0}}
@keyframes eosGroundBob{0%,100%{translate:0 calc(var(--hold) * 7px - 3px)}50%{translate:0 calc(var(--hold) * 7px + 4px)}}
@keyframes eosGroundNodA{0%{rotate:0deg}30%{rotate:var(--tilt);scale:1.05 .94}65%{rotate:calc(var(--tilt) * -.35);scale:.97 1.04}100%{rotate:0deg;scale:1 1}}
@keyframes eosGroundNodB{0%{rotate:0deg}30%{rotate:var(--tilt);scale:1.05 .94}65%{rotate:calc(var(--tilt) * -.35);scale:.97 1.04}100%{rotate:0deg;scale:1 1}}
@keyframes eosGroundLand{0%{scale:1 1}25%{scale:1.16 .82;transform-origin:50% 100%}55%{scale:.94 1.08}80%{scale:1.03 .97}100%{scale:1 1}}
@keyframes eosGroundFlicker{from{transform:scaleY(.86) scaleX(1.04)}to{transform:scaleY(1.12) scaleX(.94)}}
@keyframes eosGroundBlink{from{opacity:.55}to{opacity:1}}
@keyframes eosGroundPopA{0%{scale:1 1}30%{scale:1.18 .84}60%{scale:.93 1.09}100%{scale:1 1}}
@keyframes eosGroundPopB{0%{scale:1 1}30%{scale:1.18 .84}60%{scale:.93 1.09}100%{scale:1 1}}
@keyframes eosGroundSquashA{0%{scale:1 1}30%{scale:1.14 .86}62%{scale:.95 1.07}100%{scale:1 1}}
@keyframes eosGroundSquashB{0%{scale:1 1}30%{scale:1.14 .86}62%{scale:.95 1.07}100%{scale:1 1}}
@keyframes eosGroundSquashCalmA{0%{scale:1 1}40%{scale:1.03 .97}100%{scale:1 1}}
@keyframes eosGroundSquashCalmB{0%{scale:1 1}40%{scale:1.03 .97}100%{scale:1 1}}
@keyframes eosGroundSweep{0%{opacity:0;transform:rotate(calc(var(--ba) - 34deg))}18%{opacity:.95}58%{opacity:.95;transform:rotate(calc(var(--ba) + 4deg))}72%{opacity:.9;transform:rotate(var(--ba))}100%{opacity:0;transform:rotate(var(--ba))}}
@keyframes eosGroundSweepCalm{0%{opacity:0;transform:rotate(var(--ba))}25%{opacity:.85}70%{opacity:.85}100%{opacity:0;transform:rotate(var(--ba))}}
@keyframes eosGroundSalute{0%{opacity:0;transform:rotate(calc(var(--fa) + 30deg));width:var(--fl)}40%{opacity:.7}100%{opacity:.5;transform:rotate(var(--fa));width:var(--fl)}}
@keyframes eosGroundSaluteCalm{0%{opacity:0;transform:rotate(var(--fa));width:var(--fl)}100%{opacity:.45;transform:rotate(var(--fa));width:var(--fl)}}
@keyframes eosGroundBurn{0%{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}35%{opacity:1;transform:translateY(-4px) scale(1.08);filter:blur(0)}100%{opacity:0;transform:translateY(-22px) scale(1.15);filter:blur(5px)}}
@keyframes eosGroundBurnCalm{0%{opacity:1}100%{opacity:0}}
@keyframes eosGroundEmber{0%{opacity:0;transform:translate(0,0) scale(1)}15%{opacity:1}100%{opacity:0;transform:translate(var(--ex),var(--ey)) scale(.3)}}
@keyframes eosGroundFoundIn{0%{opacity:0;transform:scale(.3)}100%{opacity:1;transform:scale(1)}}
@keyframes eosGroundFadeIn{0%{opacity:0}100%{opacity:1}}
@keyframes eosGroundTwinkle{from{opacity:.6;transform:scale(.92)}to{opacity:1;transform:scale(1.12)}}
@keyframes eosGroundDust{0%{opacity:0;transform:translate(0,0) scale(.4)}15%{opacity:.95}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(var(--ds))}}
@keyframes eosGroundDustCalm{0%{opacity:0}30%{opacity:.6}100%{opacity:0}}
@keyframes eosGroundHop{0%{opacity:0;transform:translateY(calc(var(--hs) * .5)) scale(.3)}30%{opacity:1;transform:translateY(calc(var(--hs) * -.45)) scale(.95,1.1)}55%{transform:translateY(calc(var(--hs) * .06)) scale(1.14,.86)}75%{transform:translateY(calc(var(--hs) * -.08)) scale(.96,1.05)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes eosGroundHappy{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-5px) rotate(3deg)}}
@keyframes eosGroundGlow{from{transform:scale(.94)}to{transform:scale(1.06)}}
@keyframes eosGroundPaused{from{opacity:.55}to{opacity:1}}
@keyframes eosGroundSparkA{0%{opacity:0;transform:rotate(var(--a)) translateY(-10px) scale(.6)}15%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(calc(var(--r) * -1)) scale(.25)}}
@keyframes eosGroundSparkB{0%{opacity:0;transform:rotate(var(--a)) translateY(-10px) scale(.6)}15%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(calc(var(--r) * -1)) scale(.25)}}
@keyframes eosGroundSwapA{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
@keyframes eosGroundSwapB{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
@keyframes eosGroundPingA{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.5)}}
@keyframes eosGroundPingB{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.5)}}
@keyframes eosGroundPingCalm{0%{opacity:.7}100%{opacity:0}}
`

eosRegisterGame(EOS_GAME_113, EosGroundControlEngine, {
    hint: "Spot it, tap it — then hold the body beacons",
    mindBend: EOS_GAME_113.mindBend,
    css: EOS_GROUND_CSS,
    gesture: "tap",
    char: "glitch",
    seconds: 30,
})
eosExpose("ground", {
    // dev/test only (window.__eos exists only when eosIsDev()); never exposes words
    state: () => {
        const L = eosGroundLive
        if (!L) return null
        const s = L.S
        return {
            phase: s.phase,
            lit: s.lit,
            order: s.order.slice(),
            target: s.target,
            assist: s.assist,
            beacons: s.b.map((b, i) => {
                const m = b.kind === "spot" ? EOS_GROUND_SPOTS[b.mi] : L.setup.body[i]
                return { kind: b.kind, sense: m ? m.sense : null, mission: m ? eosGroundMissionText(m) : "", words: m ? eosGroundMissionText(m).split(/\s+/).filter((w) => /\w/.test(w)).length : 0, icon: m ? m.icon : "", state: b.state, f: +b.f.toFixed(3), acc: Math.round(b.acc), fillMs: b.fillMs }
            }),
            fills: s.fills.slice(),
            swaps: s.swaps,
            pauses: s.pauses,
            prog: s.prog,
            plog: s.plog.slice(),
            sfx: s.sfxLog.slice(),
            done: s.doneSent,
        }
    },
    pool: () => EOS_GROUND_SPOTS.map((m) => ({ sense: m.sense, icon: m.icon, mission: eosGroundMissionText(m) })),
    EOS_GAME_113,
})
