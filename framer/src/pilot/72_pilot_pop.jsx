// ===================================================================================
// Pilot A · 72_pilot_pop.jsx — POP (id 1) "Balloon Morning", v2: *your thoughts pulling you apart*
// (docs/pilot/PILOT_A_ADDENDUM.md §POP on top of PILOT_A_SPEC.md §3.1; the Emotional Shift Standard).
// The session's character stands on a small cloud, fists full of strings. Each string holds a thought bubble
// with YOUR words and a worried picture (F8), and the bubbles tug it in every direction, in your emotion's weather.
//   Mirror    0-2 s : the sky is already your weather; the bubbles inflate out of its fists; it acts your feeling.
//   Release         : press-stretch-burst film; the freed picture rises out smiling; the calm spreads by contact;
//                     breath pops, chains, one surprise per run (sneeze / dodger / bird peck, rare golden film).
//   Transform       : every pop moves the world (S9) and lightens the hero (pull, stance, breath, face).
//   Payoff          : "Calm Bubble" — time-freeze, gather into a pearl, the sheepish blow, lift + rainbow, pose;
//                     all settled by 2000 ms, onDone at 2150 so the approved burst plays over a still painting.
// Built on 70_pilot_core + 71_pilot_fx: S1 actor, S2' settle finale, S3 sky stage + S7 mirror + S9 shift,
// S4 cues + sync log, S5 box/near-hit, S8 breath clock, S10 F8 faces, S11 replay variation.
// No import/export, no regex lookbehind, every top-level name prefixed EosPilot/eosPilot/EOS_PILOT.
// ===================================================================================

const EOS_PILOT_POP = {
    id: 1,
    verb: "POPPED",
    marker: { g: "tap", label: "POP IT!" },
    reacts: ["brace", "wow", "phew", "giggle", "pfff", "grin", "curious"],
    winFace: { sync: 63, rush: 35, glitch: 49, loopie: 61, drop: 28, patch: 43, still: 62 },
    // S1 sky kit: SYNC's own calm face (E90) is a sleeping moon, which reads as night in a daytime sky
    skyFaces: { sync: { calm: 61 } },
    lay: {
        phone: { heroX: 0.5, heroY: 0.86, hero: 96, d: 100, bunchW: 262, calm: 196, swayPx: 10 },
        desk: { heroX: 0.6, heroY: 0.82, hero: 120, d: 116, bunchW: 470, calm: 260, swayPx: 13 },
    },
    // bunch layouts, bottom first: [fx -.5..+.5 across the bunch, fy 0 (lowest) .. 1 (highest)]
    layouts: {
        fan: [[-0.5, 0.06], [0, 0], [0.5, 0.06], [-0.26, 0.56], [0.26, 0.56], [0, 1]],
        crown: [[-0.3, 0], [0.3, 0], [-0.52, 0.5], [0.52, 0.5], [0, 0.56], [0, 1]],
        ladder: [[-0.42, 0], [0.18, 0.08], [-0.16, 0.5], [0.44, 0.56], [-0.4, 1], [0.2, 1]],
    },
    stop: ["i", "me", "my", "and", "at", "to", "feel", "feeling", "am", "is", "so", "a", "an", "the", "im", "i'm", "it", "of", "in", "on", "just", "really", "very", "was", "with", "for", "that", "this", "be", "been", "about", "like", "but", "or"],
    handoffMs: 2150, // S2' (EOS_PILOT_HANDOFF[1]); reduced motion 900
    pressMs: 220,
    chainMs: 600,
    surprises: ["sneeze", "dodger", "bird"],
    // the acting pool for a plain pop: {face, motion}, never the same pair twice in a row
    acts: [
        { face: "brace", motion: "spot" },
        { face: "wow", motion: "shake" },
        { face: "wow", motion: "glance" },
        { face: "giggle", motion: "bounce" },
        { face: "phew", motion: "sigh" },
        { face: "grin", motion: "hop" },
        { face: "curious", motion: "tilt" },
        { face: "pfff", motion: "blow" },
    ],
    // S4 cue table. Input-driven layers fire inside the pointer handler; beds and the climax use timed cues.
    cues: {
        stretch: [{ tone: [300, 220, { type: "triangle", gain: 0.016, glide: 420 }] }, { tone: [620, 150, { type: "sine", gain: 0.01, glide: 980, at: 0.06 }] }],
        pop: [{ arcade: "pop", impact: true }, { tone: (o) => eosPilotPopTone(o), impact: true }, { tone: (o) => (o.heavy ? [70, 160, { type: "sine", gain: 0.06 }] : null), impact: true }],
        // the last pop: no p.sfx (a step burst would land on the climax: addendum finding 2)
        popLast: [{ tone: (o) => eosPilotPopTone(o), impact: true }, { tone: (o) => (o.heavy ? [70, 160, { type: "sine", gain: 0.06 }] : null), impact: true }],
        inflate: [{ tone: (o) => [eosNote(o.n || 0, 330), 90, { type: "sine", gain: 0.016, glide: eosNote((o.n || 0) + 1, 330) }] }],
        miss: [{ tone: [220, 90, { type: "triangle", gain: 0.03, glide: 180 }], haptic: 8 }],
        early: [{ tone: [880, 40, { type: "sine", gain: 0.012 }] }],
        exhale: [{ tone: [520, 380, { type: "sine", gain: 0.016, glide: 390 }] }],
        step: [{ tone: [660, 140, { type: "sine", gain: 0.025 }] }, { tone: [880, 140, { type: "sine", gain: 0.025, at: 0.08 }] }],
        hum: [{ tone: [523, 180, { type: "sine", gain: 0.016 }] }, { tone: [587, 180, { type: "sine", gain: 0.016, at: 0.2 }] }, { tone: [659, 260, { type: "sine", gain: 0.016, at: 0.4 }] }],
        giggle: [{ tone: [988, 40, { type: "sine", gain: 0.02 }] }, { tone: [1175, 40, { type: "sine", gain: 0.02, at: 0.06 }] }],
        laugh: [{ tone: [988, 40, { type: "sine", gain: 0.02 }] }, { tone: [1175, 40, { type: "sine", gain: 0.02, at: 0.06 }] }, { tone: [988, 40, { type: "sine", gain: 0.02, at: 0.12 }] }, { tone: [1319, 40, { type: "sine", gain: 0.02, at: 0.18 }] }],
        chime: [{ tone: (o) => [eosNote(o.n || 0, 659), 260, { type: "sine", gain: 0.03 }] }, { tone: (o) => [eosNote((o.n || 0) + 2, 659), 260, { type: "sine", gain: 0.016, at: 0.06 }] }],
        plink: [{ tone: (o) => [eosNote((o.n || 0) + 5, 523), 110, { type: "sine", gain: 0.02 }] }],
        blink: [{ tone: [1568, 50, { type: "sine", gain: 0.008 }] }],
        dodge: [{ tone: [480, 160, { type: "triangle", gain: 0.022, glide: 960 }] }],
        sneeze: [{ noise: [1800, 600, 280, { gain: 0.035, q: 0.8, attack: 20 }] }, { tone: [660, 120, { type: "triangle", gain: 0.012, glide: 330 }] }],
        peck: [{ tone: [2400, 25, { type: "square", gain: 0.008 }] }, { tone: [2400, 25, { type: "square", gain: 0.008, at: 0.1 }] }],
        gold: [{ swell: [784, 900, { gain: 0.02, attack: 120, glide: 1175 }] }],
        // the beds (addendum S7): heartbeat, rumble, rain + pad, shimmer
        heart: [{ tone: (o) => [58, 110, { type: "sine", gain: 0.05 * (o.g || 1) }], noBody: true }, { tone: (o) => [104, 90, { type: "triangle", gain: 0.016 * (o.g || 1), at: 0.16 }] }],
        beatPair: [{ swell: (o) => [220, 4200, { gain: 0.006 * (o.g || 1), attack: 900 }] }, { swell: (o) => [o.calm ? 220.5 : 223, 4200, { gain: 0.006 * (o.g || 1), attack: 900 }] }],
        rumble: [{ swell: (o) => [55, 2200, { type: "triangle", gain: 0.03 * (o.g || 1), attack: 900, rate: 0.5, depth: 0.6 }] }, { swell: (o) => [110, 2200, { type: "triangle", gain: 0.01 * (o.g || 1), attack: 900 }] }],
        rain: [{ noise: (o) => [1200, 1200, 2300, { gain: 0.012 * (o.g || 1), q: 0.9, attack: 500 }] }],
        pad: [{ swell: (o) => [220, 4300, { gain: 0.007 * (o.g || 1), attack: 1200 }] }, { swell: (o) => [o.major ? 277.18 : 261.63, 4300, { gain: 0.006 * (o.g || 1), attack: 1200 }] }],
        shimmerBed: [{ swell: (o) => [2400, 2200, { gain: 0.004 * (o.g || 1), attack: 300, rate: 7, depth: 0.9 }] }],
        // the climax (all ended by settleAt = 2000)
        freeze: [{ swell: [440, 260, { gain: 0.03, attack: 240, glide: 1320 }] }, { swell: [880, 250, { gain: 0.012, attack: 230, glide: 1760 }] }],
        pump: [{ noise: [500, 700, 90, { gain: 0.02, q: 1, attack: 10 }] }],
        fizzle: [{ noise: [700, 300, 140, { gain: 0.014, q: 1.2, attack: 10 }] }],
        fwoomp: [{ noise: [400, 1200, 450, { gain: 0.05, q: 0.7, attack: 60 }] }, { swell: [180, 400, { gain: 0.02, attack: 40, glide: 90 }] }],
        glass: [{ tone: [1568, 560, { type: "sine", gain: 0.03 }] }, { tone: [2093, 560, { type: "sine", gain: 0.018, at: 0.03 }] }, { tone: [2637, 480, { type: "sine", gain: 0.01, at: 0.06 }] }],
        rise: [{ swell: [392, 760, { gain: 0.016, attack: 300, glide: 523 }] }, { swell: [523, 760, { gain: 0.012, attack: 300, glide: 659 }] }],
        hold: [{ swell: [523, 380, { gain: 0.014, attack: 40 }] }, { swell: [659, 380, { gain: 0.012, attack: 40 }] }, { swell: [784, 380, { gain: 0.01, attack: 40 }] }],
        finaleTap: [{ tone: [1568, 60, { type: "sine", gain: 0.012 }] }],
    },
}

// The pop tone by the Mirror family (addendum §POP "Pop feel").
function eosPilotPopTone(o) {
    const c = (o && o.chain) || 0
    const m = o && o.m
    if (m === "anger") return [eosNote(c, 330), 140, { type: "triangle", gain: 0.04 }]
    if (m === "sad") return [eosNote(c, 392), 220, { type: "sine", gain: 0.03 }]
    if (m === "anxious") return [eosNote(c + 3, 659), 60, { type: "triangle", gain: 0.03 }]
    return [eosNote(c + 5, 523), 110, { type: "sine", gain: 0.035 }]
}

// >= 5 bubbles: chunks; fewer than 5 -> single words (stop tokens out); still fewer -> picture-only "feeling
// bubbles" labelled with the detected emotion noun. -> {words, feel: [indexes of feeling bubbles]}
function eosPilotPopWords(entries, emotion) {
    const r = eosPilotWords(entries, 6)
    const stopOnly = (c) => !String(c || "").split(/\s+/).some((t) => {
        const k = t.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
        return k && EOS_PILOT_POP.stop.indexOf(k) < 0
    })
    let words = (r.words || []).filter((c) => !stopOnly(c)).slice(0, 6)
    if (words.length < 5) {
        const toks = []
        const seen = {}
        for (const w of words)
            for (const t of String(w).split(/\s+/)) {
                const clean = t.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "")
                const k = clean.toLowerCase()
                if (!k || seen[k] || EOS_PILOT_POP.stop.indexOf(k) >= 0) continue
                seen[k] = 1
                toks.push(clean)
            }
        if (toks.length >= words.length) words = toks.slice(0, 6)
    }
    const noun = (EOS_EMO[emotion] && EOS_EMO[emotion].noun) || "this feeling"
    const feel = []
    while (words.length < 5) {
        feel.push(words.length)
        words.push(noun)
    }
    return { words, feel }
}

// The string from the hero's fist to a bubble (tether rotation + length), in arena px.
function eosPilotPopTether(g) {
    const ax = g.x
    const ay = g.y + g.d * 0.47
    const dx = ax - g.hx
    const dy = ay - g.hy
    g.len = Math.max(6, Math.hypot(dx, dy))
    g.theta = (((Math.atan2(-dx, dy) * 180) / Math.PI) + 360) % 360
    return g
}

// All geometry in arena px from the S5 play box. Pure: called in render, read by handlers via a ref.
function eosPilotPopGeom(b, n, layName, seed, mirror) {
    const C = EOS_PILOT_POP
    const L = b.phone ? C.lay.phone : C.lay.desk
    const top = b.play.top
    // desktop: the live guide only covers the bottom-left, so the hero's column may use the full height
    const bottom = b.phone ? b.play.bottom : Math.max(b.play.bottom, b.h - 16)
    const H = Math.max(260, bottom - top)
    const left = b.play.left
    const right = b.play.right
    const W = right - left
    const px = Math.round(L.hero * eosClamp(b.u, 0.85, 1.35))
    const K = px / 112
    const hx = left + W * L.heroX
    const hy = Math.min(top + H * L.heroY, bottom - px * 0.72)
    const D = Math.round(L.d * (b.phone ? eosClamp(b.u, 1, 1.1) : eosClamp(b.u, 0.97, 1.12)))
    const handY = hy - 26 * K - px * 0.02
    const sag = mirror && mirror.motion === "sag" ? Math.round(Math.min(16, H * 0.03)) : 0
    const bandBot = hy - px * 0.5 - 20 - D / 2
    const bandTop = top + D / 2 + 6
    const span = Math.max(D * 0.9, bandBot - bandTop)
    const bw = Math.max(D * 1.2, Math.min(W - D - 8, L.bunchW * eosClamp(b.u, 0.9, 1.2)))
    const cx = eosClamp(hx, left + D / 2 + 4 + bw / 2, right - D / 2 - 4 - bw / 2)
    const pts = (C.layouts[layName] || C.layouts.fan).slice(0, n)
    const bs = pts.map(([fx, fy], i) => ({
        i,
        x: cx + fx * bw + (eosPilotRand(seed + i * 11) - 0.5) * D * 0.14,
        y: bandBot - fy * Math.min(span, D * 2.3) + (eosPilotRand(seed + i * 17) - 0.5) * D * 0.1 + sag,
    }))
    const xmin = left + D / 2 + 3
    const xmax = right - D / 2 - 3
    const ymin = top + D / 2 + 4
    const ymax = bandBot + sag + D * 0.08
    // relax: no overlapping films, everything inside the play box
    for (let it = 0; it < 80; it++) {
        let moved = false
        for (let a = 0; a < bs.length; a++)
            for (let c = a + 1; c < bs.length; c++) {
                const A = bs[a]
                const B = bs[c]
                const dx = B.x - A.x
                const dy = B.y - A.y
                const d = Math.hypot(dx, dy) || 0.01
                const need = D + 8
                if (d < need) {
                    const push = (need - d) / 2 + 0.2
                    A.x -= (dx / d) * push
                    A.y -= (dy / d) * push
                    B.x += (dx / d) * push
                    B.y += (dy / d) * push
                    moved = true
                }
            }
        bs.forEach((o) => {
            o.x = eosClamp(o.x, xmin, xmax)
            o.y = eosClamp(o.y, ymin, ymax)
        })
        if (!moved) break
    }
    const bubbles = bs.map((o) => {
        const side = o.x < hx - 2 ? -1 : o.x > hx + 2 ? 1 : o.i % 2 ? 1 : -1
        const g = { i: o.i, x: o.x, y: o.y, d: D, hx: hx + side * (px * 0.5 + 4 * K), hy: handY, side }
        eosPilotPopTether(g)
        g.sw = Math.min(5, (L.swayPx / Math.max(1, Math.hypot(o.x - g.hx, o.y - g.hy))) * 57.3)
        return g
    })
    const cy = hy + px * 0.08
    const calmD = Math.round(Math.min(L.calm, W - 12, 2 * (cy - top) - 8))
    const cloudW = Math.round(Math.min(W * 0.8, px * 2.4))
    const cloudH = Math.round(px * 0.46)
    const G = Math.round(Math.max(calmD, cloudW) + 60)
    const sun = { x: b.w * 0.17, y: b.h * 0.02 + b.w * 0.13 }
    const archD = Math.round(Math.min(b.w * (b.phone ? 1.12 : 0.62), 780))
    return { px, K, D, hx, hy, cy, calmD, cloudW, cloudH, G, gx: hx - G / 2, gy: cy - G / 2, bubbles, sun, archD, top, bottom, phone: b.phone, w: b.w, h: b.h, u: b.u }
}

function EosPilotPopEngine(p) {
    const live = React.useRef(p)
    live.current = p
    const wordsKey = (p.entries || []).join("\u0001")
    return <EosPilotPopInner live={live} wordsKey={wordsKey} reduced={!!p.reduced} userImgKey={eosPilotImgKey(p)} />
}

const EosPilotPopInner = React.memo(function EosPilotPopInner({ live, wordsKey, reduced, userImgKey }) {
    const C = EOS_PILOT_POP
    const gameId = 1
    const arenaRef = React.useRef(null)
    const stageRef = React.useRef(null)
    const heroRef = React.useRef(null)
    const liftRef = React.useRef(null)
    const leanRef = React.useRef(null)
    const breathRef = React.useRef(null)
    const calmRef = React.useRef(null)
    const pearlRef = React.useRef(null)
    const cloudRef = React.useRef(null)
    const worldRef = React.useRef(null)
    const wxRef = React.useRef(null)
    const fxRef = React.useRef(null)
    const hitsRef = React.useRef([])
    const goneRef = React.useRef({})
    const geomRef = React.useRef(null)
    const fpRef = React.useRef(null)
    const phaseRef = React.useRef("play")
    const pickRef = React.useRef({ current: -1 })
    const st = React.useRef({ k: 0, chain: 0, chainMax: 0, lastPopT: -1e9, lastX: null, miss: 0, hang: [], hangRR: 0, ringRR: 0, shardRR: 0, freeRR: 0, shaftRR: 0, last: null, press: null, introDone: false, dodged: false, surpriseDone: false, breathPops: 0, gold: false, slumped: false, perf: [], events: [], lastInput: 0, bedN: 0, sway: [], glow: [], loops: false }).current
    const rt = useEosPilotRuntime()
    const shell = useEosPilotShell(arenaRef, gameId)
    const box = useEosPilotBox(arenaRef)

    const emotion = React.useMemo(() => (typeof eosCurrentEmotion === "function" && eosCurrentEmotion()) || "auto", [])
    const mirror = React.useMemo(() => eosPilotMirror(emotion), [])
    const heroChar = EOS_EMO[emotion] ? EOS_EMO[emotion].char : "still"
    const run = React.useMemo(() => eosPilotRunSeed(gameId, wordsKey ? wordsKey.split("\u0001") : []), [])
    const seed = run.seed
    const W = React.useMemo(() => eosPilotPopWords(wordsKey ? wordsKey.split("\u0001") : [], emotion), [wordsKey])
    const N = W.words.length
    const plan = React.useMemo(() => {
        const lay = ["fan", "crown", "ladder"][seed % 3]
        const surprise = eosPilotPickRun(gameId, "surprise", C.surprises, seed + 5)
        const golden = eosPilotRand(seed + 77) < 1 / 6 ? Math.floor(eosPilotRand(seed + 78) * N) % N : -1
        const pose = ["wave", "thumbs", "float"][Math.floor(eosPilotRand(seed + 91) * 3) % 3]
        const birds = eosPilotRand(seed + 93) < 0.8
        return { lay, surprise, golden, pose, birds }
    }, [])
    const heroSeed = React.useMemo(() => {
        const list = (typeof EOS_WIN_FACES !== "undefined" && EOS_WIN_FACES[heroChar]) || []
        const j = list.indexOf(C.winFace[heroChar])
        return j >= 0 ? j : seed
    }, [heroChar])
    const faceIds = C.skyFaces[heroChar] || null

    const [k, setK] = React.useState(0)
    const [faceP, setFaceP] = React.useState(0)
    const [phase, setPhase] = React.useState("play")
    const [ready, setReady] = React.useState(false)
    const [dodge, setDodge] = React.useState(null)

    const pctOf = (n) => (n >= N ? EOS_PILOT_FINAL_PCT : Math.round((n / N) * 100))
    const breath = useEosPilotBreath(mirror, pctOf(k))
    const snd = useEosPilotSound({ gameId, live, cues: C.cues, timers: rt.timers })
    // F8: pictures from the shared resolver, read on every change (uploads added/removed mid-run restore defaults)
    const FP = React.useMemo(() => eosPilotFacePics(live.current, faceP, 6, seed), [faceP, userImgKey])
    fpRef.current = FP
    const report = (v) => {
        st.reported = Math.max(st.reported || 0, v)
        try {
            live.current.onProgress(v, `${v}% ${C.verb}`)
        } catch (e) {}
    }
    // the last pop's value: 96, unless that crosses one of the wrapper's step-reward buckets (that would mount a
    // step burst over the climax: addendum finding 2 / A5); then the highest value inside the current bucket
    const lastPct = () => {
        const prev = st.reported || 0
        const n = ((live.current && live.current.entries) || []).length || 1
        const rs = Math.max(12, Math.min(34, 100 / Math.max(3, Math.min(7, n))))
        if (Math.floor(EOS_PILOT_FINAL_PCT / rs) <= Math.floor(prev / rs)) return EOS_PILOT_FINAL_PCT
        return Math.max(prev, Math.min(EOS_PILOT_FINAL_PCT, Math.ceil((Math.floor(prev / rs) + 1) * rs - 1)))
    }
    React.useEffect(() => {
        report(0)
    }, [])
    // decode every picture this run can show (negative, positive, relief) so swaps never flash empty
    React.useEffect(() => {
        const all = eosPilotFacePics(live.current, 100, 6, seed)
        ;[].concat(FP.pics, FP.relief, all.pics).forEach((src) => {
            if (src && !/^data:/.test(src)) eosPilotPrefetch(src)
        })
    }, [userImgKey])
    const hero = () => heroRef.current
    const stage = () => stageRef.current
    const anim = (el, kf, o) => eosPilotAnim(rt.anims, el, kf, o)
    const red = () => eosPilotIsReduced(arenaRef.current, live)
    const fxNodes = (cls) => (fxRef.current ? Array.from(fxRef.current.querySelectorAll(`:scope > .${cls}`)) : [])
    const wxNodes = (cls) => (wxRef.current ? Array.from(wxRef.current.querySelectorAll(`:scope > .${cls}`)) : [])
    const hitEl = (i) => hitsRef.current[i] || null
    const part = (i, sel) => (hitsRef.current[i] ? hitsRef.current[i].querySelector(sel) : null)
    const alive = () => {
        const G = geomRef.current
        return G ? G.bubbles.filter((g) => !goneRef.current[g.i]) : []
    }
    const tf = (g, s, r) => `rotate(${(g.theta + (r || 0)).toFixed(1)}deg) scaleY(${((g.len / 100) * (s == null ? 1 : s)).toFixed(3)})`

    // ---------------------------------------------------------------- Payoff: "Calm Bubble" (S2' settle finale)
    const fin = useEosPilotFinale({
        arenaRef,
        live,
        gameId,
        settle: true,
        bonus: 260 + st.chainMax * 18 + st.breathPops * 10,
        label: `100% ${C.verb}`,
        kit: "sky",
        heroFace: () => eosPilotFaceSrc(heroChar, 3, emotion, heroSeed),
        anims: rt.anims,
        timers: rt.timers,
        handoffMs: C.handoffMs || EOS_PILOT_HANDOFF[1],
        beats: [
            {
                // 0-250 time-freeze: the last bubble tears in slow motion; its droplets and every droplet left hanging
                // since earlier pops freeze and glint in one wave, left to right
                id: "climax",
                at: 0,
                dur: 250,
                reducedAt: 0,
                run: (c) => {
                    const G = geomRef.current
                    const h = hero()
                    setFaceP(100)
                    if (!G) return
                    if (c.reduced) {
                        st.hang.forEach((n) => n && c.anim(n.el, [{ opacity: 0.95 }, { opacity: 0 }], { duration: 300, fill: "forwards" }))
                        return
                    }
                    const veil = fxNodes("popVeil")[0]
                    if (veil) c.anim(veil, [{ opacity: 0 }, { opacity: 0.2, offset: 0.3 }, { opacity: 0 }], { duration: 460, fill: "forwards" })
                    const last = st.last || { x: G.hx, y: G.hy - 120, d: G.D }
                    const drops = stage() && stage().layer("fx") ? Array.from(stage().layer("fx").querySelectorAll('[data-pool="droplets"] > i')).slice(0, 9) : []
                    st.fdrops = []
                    drops.forEach((el, j) => {
                        const a = (j / drops.length) * Math.PI * 2 + 0.3
                        const r = last.d * (0.56 + 0.24 * eosPilotRand(seed + j))
                        const x = last.x + Math.cos(a) * r
                        const y = last.y + Math.sin(a) * r * 0.86
                        el.style.setProperty("--p-hue", String(190 + j * 18))
                        el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(.95)`
                        el.style.opacity = "1"
                        c.anim(el, [{ transform: `translate(${last.x.toFixed(1)}px,${last.y.toFixed(1)}px) scale(.3)`, opacity: 0 }, { transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(.95)`, opacity: 1 }], { duration: 240, easing: "cubic-bezier(.1,.8,.2,1)" })
                        st.fdrops.push({ el, x, y })
                    })
                    const pts = st.fdrops.concat(st.hang.filter(Boolean))
                    const xs = pts.map((p) => p.x)
                    const x0 = Math.min.apply(null, xs.concat([G.w]))
                    const x1 = Math.max.apply(null, xs.concat([0]))
                    pts.forEach((pt) => {
                        if (pt.el.classList.contains("popHang")) pt.el.setAttribute("data-freeze", "1")
                        const dl = 40 + ((pt.x - x0) / Math.max(1, x1 - x0)) * 170
                        const base = pt.el.style.transform || `translate(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px)`
                        c.anim(pt.el, [{ transform: base }, { transform: `${base} scale(1.7)`, offset: 0.4 }, { transform: base }], { duration: 200, delay: dl, easing: "ease-out" })
                    })
                    if (h) {
                        h.look(hitEl(last.i))
                        h.react("wow", 450)
                    }
                    snd.later("freeze", 0, c.t0, { beat: "climax" })
                },
            },
            {
                // 250-700 gather: the droplets stream on curved paths into the cupped hands and form a glowing pearl
                id: "gather",
                at: 250,
                dur: 450,
                reducedAt: 300,
                run: (c) => {
                    const G = geomRef.current
                    const pearl = pearlRef.current
                    const h = hero()
                    if (!G || !pearl) return
                    pearl.style.opacity = "1"
                    if (c.reduced) {
                        c.anim(pearl, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" })
                        return
                    }
                    if (h) {
                        h.look(null)
                        h.pose("cup")
                        c.later(() => hero() && hero().react("grin", 450), 220)
                    }
                    const hx = G.hx
                    const hy = G.hy + G.px * 0.2
                    const pts = (st.fdrops || []).concat(st.hang.filter(Boolean))
                    const stagger = Math.min(20, 150 / Math.max(1, pts.length))
                    pts.forEach((pt, j) => {
                        const side = pt.x < hx ? -1 : 1
                        const mx = (pt.x + hx) / 2 + side * 34
                        const my = Math.min(pt.y, hy) - 26 - (j % 3) * 10
                        if (pt.el.classList.contains("popHang")) {
                            pt.el.removeAttribute("data-on")
                            pt.el.removeAttribute("data-freeze")
                        }
                        pt.el.style.transform = `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px) scale(.2)`
                        pt.el.style.opacity = "0"
                        c.anim(
                            pt.el,
                            [
                                { transform: `translate(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px) scale(1)`, opacity: 1 },
                                { transform: `translate(${mx.toFixed(1)}px,${my.toFixed(1)}px) scale(.85)`, opacity: 1, offset: 0.5, easing: "cubic-bezier(.4,0,.6,1)" },
                                { transform: `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px) scale(.2)`, opacity: 0.4 },
                            ],
                            { duration: 300, delay: stagger * j, easing: "cubic-bezier(.3,0,.6,1)", fill: "backwards" }
                        )
                    })
                    c.anim(pearl, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(.45)", opacity: 1, offset: 0.4 }, { transform: "scale(1.18)", offset: 0.85 }, { transform: "scale(1)", opacity: 1 }], { duration: 440, easing: "ease-out", fill: "both" })
                    for (let j = 0; j < 6; j++) snd.later("plink", 250 + 64 * j, c.t0, { n: j, beat: "gather" })
                },
            },
            {
                // 700-1300 the blow (the shareable gag): three puffed-cheek pumps, the 2nd nearly fizzles with a
                // sheepish glance, then it blows: an iridescent film inflates from its hands around it and its cloud
                id: "blow",
                at: 700,
                dur: 600,
                reducedAt: 600,
                run: (c) => {
                    const G = geomRef.current
                    const calm = calmRef.current
                    const pearl = pearlRef.current
                    const h = hero()
                    if (!G || !calm) return
                    calm.setAttribute("data-on", "1")
                    if (c.reduced) {
                        c.anim(calm, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" })
                        if (pearl) c.anim(pearl, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" })
                        return
                    }
                    if (h) {
                        h.react("pfff", 200)
                        h.celebrate([
                            { at: 0, part: "body", slot: "pump", keyframes: [{ transform: "none" }, { transform: "scale(1.09,.92)", offset: 0.5 }, { transform: "none" }], opts: { duration: 110, easing: "ease-in-out" } },
                            { at: 120, part: "body", slot: "pump", keyframes: [{ transform: "none" }, { transform: "scale(1.04,.96) rotate(-5deg)", offset: 0.35 }, { transform: "rotate(4deg)", offset: 0.7 }, { transform: "none" }], opts: { duration: 150, easing: "ease-in-out" } },
                            { at: 270, part: "body", slot: "pump", keyframes: [{ transform: "none" }, { transform: "scale(1.11,.9)", offset: 0.5 }, { transform: "none" }], opts: { duration: 110, easing: "ease-in-out" } },
                            { at: 300, part: "body", slot: "blowB", keyframes: [{ transform: "none" }, { transform: "scale(.93,1.09) translateY(-2px)", offset: 0.3 }, { transform: "none" }], opts: { duration: 320, easing: "ease-out" } },
                        ])
                        c.later(() => {
                            const hh = hero()
                            if (!hh) return
                            hh.react("pfff", 260)
                            hh.look("camera")
                        }, 125)
                        c.later(() => {
                            const hh = hero()
                            if (!hh) return
                            hh.look(null)
                            hh.react("pfff", 200)
                        }, 265)
                        c.later(() => {
                            const hh = hero()
                            if (!hh) return
                            hh.emit("exhale", { ms: 420, amp: 0.25 })
                            hh.react("grin", 450)
                        }, 300)
                    }
                    snd.later("pump", 700, c.t0, { beat: "blow" })
                    snd.later("fizzle", 820, c.t0, { beat: "blow" })
                    snd.later("pump", 970, c.t0, { beat: "blow" })
                    snd.later("fwoomp", 1000, c.t0, { beat: "blow" })
                    if (pearl) c.anim(pearl, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.25)", opacity: 1, offset: 0.4 }, { transform: "scale(3)", opacity: 0 }], { duration: 260, delay: 290, fill: "forwards" })
                    // inflate from the hands (transform-origin = the pearl), ease-out-back, lands by T0 + 1300
                    c.anim(calm, [{ transform: "scale(.1)", opacity: 0 }, { transform: "scale(.1)", opacity: 0.9, offset: 0.02 }, { transform: "scale(1.07)", opacity: 1, offset: 0.72 }, { transform: "scale(.98)", offset: 0.88 }, { transform: "none", opacity: 1 }], { duration: 300, delay: 300, easing: "cubic-bezier(.3,1.25,.5,1)", fill: "both" })
                    const rim = calm.querySelector(".rim")
                    if (rim) c.anim(rim, [{ transform: "rotate(0deg)" }, { transform: "rotate(220deg)" }], { duration: 950, delay: 300, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" })
                },
            },
            {
                // 1150-1550 lift and refract: the bubble bobs up off the cloud, the sunbeam strikes it, the rim flashes
                // once, and a 7-band rainbow unfurls across the sky from it; the morning clears
                id: "lift",
                at: 1150,
                dur: 400,
                reducedAt: 600,
                run: (c) => {
                    const G = geomRef.current
                    const s = stage()
                    const calm = calmRef.current
                    if (!G || !calm) return
                    if (s) s.shift(100, c.reduced ? 300 : 500)
                    const arch = wxNodes("popArch")[0]
                    const beam = fxNodes("popBeam")[0]
                    if (arch) arch.style.opacity = "1"
                    if (c.reduced) {
                        if (arch) c.anim(arch, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" })
                        return
                    }
                    const lift = liftRef.current
                    if (lift) c.anim(lift, [{ transform: "none" }, { transform: "translateY(-24px)", easing: "cubic-bezier(.2,.8,.3,1)" }], { duration: 400, fill: "forwards" })
                    if (beam) {
                        beam.style.opacity = "0.75"
                        c.anim(beam, [{ transform: "rotate(var(--ba)) scaleX(0)", opacity: 0 }, { transform: "rotate(var(--ba)) scaleX(1)", opacity: 1, offset: 0.5 }, { transform: "rotate(var(--ba)) scaleX(1)", opacity: 0.75 }], { duration: 420, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" })
                    }
                    const flash = calm.querySelector(".flash")
                    const caus = calm.querySelector(".caustic")
                    if (flash) c.anim(flash, [{ opacity: 0 }, { opacity: 0.85, offset: 0.25 }, { opacity: 0 }], { duration: 380, delay: 140, easing: "ease-out", fill: "forwards" })
                    if (caus) c.anim(caus, [{ transform: "translateX(-75%) rotate(14deg)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: "translateX(40%) rotate(14deg)", opacity: 0.85, offset: 0.8 }, { transform: "translateX(55%) rotate(14deg)", opacity: 0 }], { duration: 560, delay: 120, easing: "cubic-bezier(.4,0,.3,1)", fill: "forwards" })
                    if (arch) c.anim(arch, [{ transform: "scaleX(0)", opacity: 0.3 }, { transform: "scaleX(1)", opacity: 1 }], { duration: 400, delay: 60, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" })
                    const sun = s && s.layer("l1") ? s.layer("l1").querySelector(".sun") : null
                    if (sun) c.anim(sun, [{ transform: "scale(1)" }, { transform: "scale(1.28)", offset: 0.4 }, { transform: "scale(1.1)" }], { duration: 640, easing: "ease-out", fill: "forwards" })
                    snd.later("glass", 1150, c.t0, { beat: "lift" })
                    snd.later("rise", 1180, c.t0, { beat: "lift" })
                },
            },
            {
                // 1550-1950 pose: palms to the film, beaming at the camera (win face); wave / thumbs-up / lies back
                // floating by seed; two birds loop once around the bubble. Everything is still by 2000 (settle).
                id: "pose",
                at: 1550,
                dur: 400,
                reducedAt: 600,
                run: (c) => {
                    const G = geomRef.current
                    const h = hero()
                    if (h) h.setStep(3)
                    if (!G || c.reduced) return
                    const K = G.K
                    const reach = Math.max(6, G.calmD / 2 - G.px * 0.5 - 14 * K)
                    if (h) {
                        h.look("camera")
                        const steps = [
                            { at: 0, part: "handL", slot: "palmL", keyframes: [{ transform: `translate(${24 * K}px,${30 * K}px)` }, { transform: `translate(${-reach}px,${-8 * K}px)` }], opts: { duration: 180, easing: "cubic-bezier(.3,.7,.3,1.2)", fill: "forwards" } },
                            { at: 0, part: "handR", slot: "palmR", keyframes: [{ transform: `translate(${-24 * K}px,${30 * K}px)` }, { transform: `translate(${reach}px,${-8 * K}px)` }], opts: { duration: 180, easing: "cubic-bezier(.3,.7,.3,1.2)", fill: "forwards" } },
                        ]
                        if (plan.pose === "wave")
                            steps.push({ at: 190, part: "handR", slot: "palmR", keyframes: [{ transform: `translate(${reach}px,${-8 * K}px) rotate(0deg)` }, { transform: `translate(${6 * K}px,${-30 * K}px) rotate(20deg)`, offset: 0.3 }, { transform: `translate(${6 * K}px,${-30 * K}px) rotate(-16deg)`, offset: 0.6 }, { transform: `translate(${6 * K}px,${-30 * K}px) rotate(10deg)` }], opts: { duration: 200, easing: "ease-in-out", fill: "forwards" } })
                        else if (plan.pose === "thumbs")
                            steps.push({ at: 190, part: "handR", slot: "palmR", keyframes: [{ transform: `translate(${reach}px,${-8 * K}px) scale(1)` }, { transform: `translate(${10 * K}px,${-24 * K}px) scale(1.25) rotate(-18deg)` }], opts: { duration: 190, easing: "cubic-bezier(.3,.7,.3,1.4)", fill: "forwards" } })
                        else
                            steps.push(
                                { at: 190, part: "body", slot: "float", keyframes: [{ transform: "none" }, { transform: `rotate(-16deg) translateY(${-4 * K}px)` }], opts: { duration: 200, easing: "cubic-bezier(.3,.7,.3,1.1)", fill: "forwards" } },
                                { at: 190, part: "footL", slot: "floatF", keyframes: [{ transform: "none" }, { transform: `translate(${6 * K}px,${-8 * K}px) rotate(20deg)` }], opts: { duration: 200, fill: "forwards" } }
                            )
                        h.celebrate(steps)
                    }
                    const lift = liftRef.current
                    if (lift) c.anim(lift, [{ transform: "translateY(-24px)" }, { transform: "translateY(-19px)", offset: 0.5 }, { transform: "translateY(-24px)" }], { duration: 400, easing: "ease-in-out", fill: "forwards" })
                    if (plan.birds) {
                        const cx = G.hx
                        const cy = G.cy - 24
                        const R = G.calmD * 0.62
                        fxNodes("popLoopBird").forEach((el, j) => {
                            const a0 = j ? -20 : 200
                            const kf = []
                            for (let q = 0; q <= 8; q++) {
                                const a = ((a0 + q * 45 * (j ? -1 : 1)) * Math.PI) / 180
                                const r = R * (1 + 0.08 * Math.sin(q))
                                kf.push({ transform: `translate(${(cx + Math.cos(a) * r).toFixed(1)}px,${(cy + Math.sin(a) * r * 0.8).toFixed(1)}px) scaleX(${j ? -1 : 1})`, opacity: q === 0 || q === 8 ? 0 : 1 })
                            }
                            c.anim(el, kf, { duration: 380, delay: j * 30, easing: "linear", fill: "forwards" })
                        })
                    }
                    snd.later("hold", 1550, c.t0, { beat: "pose" })
                },
            },
        ],
        onFinaleTap: (ev) => {
            const calm = calmRef.current
            const g = calm && calm.querySelector(".glint")
            if (g && !red()) anim(g, [{ transform: "translateX(-60%) rotate(20deg)", opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: "translateX(60%) rotate(20deg)", opacity: 0 }], { duration: 420, easing: "ease-out" })
            snd.cue("finaleTap", ev, { action: "finale-tap" })
        },
    })

    // ---------------------------------------------------------------- Mirror (0 -> 2000 ms): weather, inflate, the take
    React.useLayoutEffect(() => {
        if (!box || st.introDone || !geomRef.current) return
        st.introDone = true
        const G = geomRef.current
        const R = red()
        const t0 = performance.now()
        st.introT = t0
        const h = hero()
        if (h) {
            h.pose("raise")
            h.setTug(1)
            h.setStance(0)
        }
        const later = rt.timers.later
        G.bubbles.forEach((g, n) => {
            const el = hitEl(g.i)
            if (!el) return
            const body = el.querySelector(".pbBody")
            const teth = el.querySelector(".pbTether")
            const d0 = 300 + 90 * n
            if (R) {
                anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: d0, fill: "backwards" })
                return
            }
            const dx = g.hx - g.x
            const dy = g.hy - g.y
            anim(body, [{ transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(.08)`, opacity: 0.5 }, { transform: `translate(${(dx * 0.08).toFixed(1)}px,${(dy * 0.08).toFixed(1)}px) scale(1.1)`, opacity: 1, offset: 0.6 }, { transform: "scale(.95,1.05)", offset: 0.82 }, { transform: "none", opacity: 1 }], { duration: 480, delay: d0, easing: "cubic-bezier(.25,.8,.35,1)", fill: "backwards" })
            anim(teth, [{ transform: tf(g, 0) }, { transform: tf(g, 1) }], { duration: 280, delay: d0, easing: "ease-out", fill: "backwards" })
            later(() => {
                const hh = hero()
                if (!hh || phaseRef.current !== "play") return
                hh.look(hitEl(g.i))
                hh.emit("lurch", { dir: [g.x - G.hx, g.y - G.hy], s: 0.15, ms: 220 })
            }, d0 + 60)
            snd.later("inflate", d0, t0, { n, beat: "inflate" })
        })
        if (R) {
            later(() => {
            st.ready = true
            setReady(true)
        }, 1400)
            return
        }
        // 600-1400: the hero's take, one per emotion family; at 1300 it looks into the camera and nods ("I know")
        const takes = {
            panic: () => {
                later(() => hero() && hero().pose("press"), 900)
                ;[900, 1040, 1160].forEach((t, j) => later(() => hero() && hero().look(hitEl(G.bubbles[(j * 2) % G.bubbles.length].i)), t))
                later(() => hero() && hero().react("brace", 300), 950)
                later(() => hero() && hero().celebrate([{ at: 0, part: "idle", slot: "pant", keyframes: [{ transform: "none" }, { transform: "scale(1.02,.98)", offset: 0.25 }, { transform: "none", offset: 0.5 }, { transform: "scale(1.02,.98)", offset: 0.75 }, { transform: "none" }], opts: { duration: 420, easing: "ease-in-out" } }]), 900)
            },
            anger: () => {
                const stomp = (part) => (hh) => hh.celebrate([{ at: 0, part, slot: `stomp${part}`, keyframes: [{ transform: "none" }, { transform: `translateY(${-9 * G.K}px)`, offset: 0.45 }, { transform: "none" }], opts: { duration: 220, easing: "cubic-bezier(.5,0,.8,.4)" } }])
                later(() => {
                    const hh = hero()
                    if (!hh) return
                    stomp("footL")(hh)
                    hh.emit("hit", { s: 0.6 })
                    hh.react("brace", 300)
                }, 900)
                later(() => hero() && hero().emit("exhale", { ms: 600, amp: 0.15 }), 1000)
                later(() => {
                    const hh = hero()
                    if (!hh) return
                    stomp("footR")(hh)
                    hh.emit("hit", { s: 0.6 })
                }, 1100)
                later(() => {
                    const hh = hero()
                    if (hh) hh.emit("lurch", { dir: [0, 1], s: 0.9 })
                    yank(1)
                }, 1220)
            },
            sad: () => {
                later(() => {
                    const hh = hero()
                    if (!hh) return
                    st.slumped = true
                    hh.celebrate([{ at: 0, part: "body", slot: "slump", keyframes: [{ transform: "none" }, { transform: `translateY(${4 * G.K}px) scale(1.03,.94) rotate(-3deg)` }], opts: { duration: 600, easing: "ease-in-out", fill: "forwards" } }])
                    hh.look(cloudRef.current)
                }, 760)
                const tear = fxNodes("popTear")[0]
                if (tear) {
                    const x = G.hx - G.px * 0.17
                    const y0 = G.hy - G.px * 0.02
                    const y1 = G.hy + G.px * 0.5
                    anim(tear, [{ transform: `translate(${x.toFixed(1)}px,${y0.toFixed(1)}px) scale(.5)`, opacity: 0 }, { transform: `translate(${x.toFixed(1)}px,${(y0 + 4).toFixed(1)}px) scale(1)`, opacity: 1, offset: 0.25 }, { transform: `translate(${(x - 3).toFixed(1)}px,${y1.toFixed(1)}px) scale(1,1.2)`, opacity: 1, offset: 0.92, easing: "cubic-bezier(.6,0,.9,.5)" }, { transform: `translate(${(x - 3).toFixed(1)}px,${y1.toFixed(1)}px) scale(1.8,.3)`, opacity: 0 }], { duration: 520, delay: 900, fill: "backwards" })
                    snd.later("plink", 1360, t0, { n: 0, beat: "tear" })
                }
            },
            anxious: () => {
                later(() => {
                    const hh = hero()
                    if (!hh) return
                    const K = G.K
                    hh.celebrate([
                        { at: 0, part: "handL", slot: "nailL", keyframes: [{ transform: "none" }, { transform: `translate(${30 * K}px,${-6 * K}px)`, offset: 0.3 }, { transform: `translate(${30 * K}px,${-9 * K}px)`, offset: 0.45 }, { transform: `translate(${30 * K}px,${-6 * K}px)`, offset: 0.6 }, { transform: `translate(${30 * K}px,${-9 * K}px)`, offset: 0.75 }, { transform: "none" }], opts: { duration: 620, easing: "ease-in-out" } },
                    ])
                    hh.react("curious", 300)
                }, 780)
                later(() => hero() && hero().look(hitEl(G.bubbles[0].i)), 920)
                later(() => hero() && hero().look(hitEl(G.bubbles[G.bubbles.length - 1].i)), 1060)
                later(() => {
                    const hh = hero()
                    twang(G.bubbles[(seed % G.bubbles.length) | 0].i)
                    if (hh) {
                        hh.emit("hit", { s: 0.45 })
                        hh.react("brace", 260)
                    }
                }, 1180)
            },
        }
        ;(takes[mirror.key] || takes.sad)()
        later(() => {
            const hh = hero()
            if (!hh || phaseRef.current !== "play") return
            hh.look("camera")
            hh.celebrate([{ at: 0, part: "idle", slot: "nod", keyframes: [{ transform: "none" }, { transform: `translateY(${3 * G.K}px) rotate(1deg)`, offset: 0.4 }, { transform: "none" }], opts: { duration: 320, easing: "ease-in-out" } }])
        }, 1300)
        later(() => hero() && phaseRef.current === "play" && !st.press && hero().look(null), 1700)
        later(() => {
            st.ready = true
            setReady(true)
        }, 1400)
    }, [!!box])

    // the strings yank toward the hero (anger take) / one string twangs (anxious take)
    const yank = (s) => {
        const G = geomRef.current
        if (!G || red()) return
        G.bubbles.forEach((g, j) => {
            if (goneRef.current[g.i]) return
            const sw = part(g.i, ".pbSwing")
            const dir = g.x >= G.hx ? -1 : 1
            anim(sw, [{ transform: "none" }, { transform: `rotate(${dir * 5 * s}deg)`, offset: 0.25 }, { transform: `rotate(${-dir * 2 * s}deg)`, offset: 0.6 }, { transform: "none" }], { duration: 520, delay: 20 * j, easing: "ease-out" })
        })
    }
    const twang = (i) => {
        if (red()) return
        const teth = part(i, ".pbTether")
        const G = geomRef.current
        const g = G && G.bubbles[i]
        if (!teth || !g) return
        anim(teth, [{ transform: tf(g, 1, 0) }, { transform: tf(g, 1.02, 2.5) }, { transform: tf(g, 1, -2) }, { transform: tf(g, 1.01, 1.2) }, { transform: tf(g, 1, 0) }], { duration: 300, easing: "linear" })
        snd.later("blink", 0, performance.now(), { beat: "twang" })
    }

    // ---------------------------------------------------------------- S8 breath loops: the world breathes with the hero
    React.useLayoutEffect(() => {
        const G = geomRef.current
        if (!G || red()) return
        breath.root(stage() && stage().el())
        if (!st.loops) {
            st.loops = true
            const amp = mirror.key === "panic" ? 0.022 : mirror.key === "sad" ? 0.045 : 0.034
            breath.loop(breathRef.current, [{ transform: "none", easing: "ease-in-out" }, { transform: `scale(${(1 - amp * 0.45).toFixed(3)},${(1 + amp).toFixed(3)})`, offset: 0.45, easing: "ease-in-out" }, { transform: "none" }])
            breath.loop(cloudRef.current, [{ transform: "none", easing: "ease-in-out" }, { transform: "translateY(2px)", offset: 0.45, easing: "ease-in-out" }, { transform: "none" }], { offset: 0.1 })
            G.bubbles.forEach((g) => {
                st.glow[g.i] = breath.loop(part(g.i, ".pbGlow"), [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1, offset: 0.62 }, { opacity: 0, offset: 0.9 }, { opacity: 0 }])
            })
        }
        // sways: phase-locked to the breath, amplitude follows the remaining pull (re-made per pop, phase kept)
        st.sway.forEach((a) => breath.stop(a))
        st.sway = []
        const tug = 0.45 + 0.55 * ((N - k) / Math.max(1, N))
        G.bubbles.forEach((g, j) => {
            if (goneRef.current[g.i]) return
            const a = (g.sw * tug).toFixed(2)
            st.sway.push(breath.loop(part(g.i, ".pbSway"), [{ transform: `rotate(${-a}deg)`, easing: "ease-in-out" }, { transform: `rotate(${a}deg)`, offset: 0.5, easing: "ease-in-out" }, { transform: `rotate(${-a}deg)` }], { offset: (j * 0.13) % 1 }))
        })
    }, [!!box, k])

    // ---------------------------------------------------------------- the beds (S7 sound) + idle takes while loud
    React.useEffect(() => {
        if (!box) return undefined
        const tick = () => {
            if (fin.phase.current !== "play") return
            const p = pctOf(st.k)
            const g = p >= 34 ? 0.5 : 1 // -6 dB from 34
            const t = performance.now()
            let next = 2000
            const bed = mirror.bed
            if (bed === "heart") {
                const bpm = 108 - 42 * (p / 100)
                next = 60000 / bpm
                snd.later("heart", 0, t, { g, beat: "bed" })
                if (st.bedN++ % Math.max(1, Math.round(4000 / next)) === 0) snd.later("beatPair", 0, t, { g, calm: p >= 67, beat: "bed" })
            } else if (bed === "rumble") {
                if (p < 67) snd.later("rumble", 0, t, { g, beat: "bed" })
            } else if (bed === "rain") {
                if (p < 67) snd.later("rain", 0, t, { g: g * (1 - p / 100), beat: "bed" })
                if (st.bedN++ % 2 === 0) snd.later("pad", 0, t, { g, major: p >= 67, beat: "bed" })
            } else if (p < 67) snd.later("shimmerBed", 0, t, { g: Math.max(0, 1 - p / 67), beat: "bed" })
            // an idle take while the feeling is loud (characters are never still props)
            if (p < 67 && st.ready && !st.press && t - st.lastInput > 1800 && st.bedN % 2 === 0) idleTake()
            st.bedT = rt.timers.later(tick, next)
        }
        st.bedT = rt.timers.later(tick, 600)
        return undefined
    }, [!!box])
    const idleTake = () => {
        const h = hero()
        const G = geomRef.current
        if (!h || !G || red()) return
        st.idleN = (st.idleN || 0) + 1
        const al = alive()
        if (!al.length) return
        const pick = al[st.idleN % al.length]
        if (mirror.key === "anger") h.emit("exhale", { ms: 600, amp: 0.12 })
        else if (mirror.key === "sad") h.emit("exhale", { ms: 900, amp: 0.2, puff: false })
        else if (mirror.key === "anxious") twang(pick.i)
        h.look(hitEl(pick.i))
        rt.timers.later(() => hero() && !st.press && hero().look(null), 520)
    }

    // ---------------------------------------------------------------- Release: press -> stretch -> burst
    const touchPoint = (e, g) => {
        const A = arenaRef.current ? arenaRef.current.getBoundingClientRect() : { left: 0, top: 0 }
        const ok = e && typeof e.clientX === "number" && (e.clientX || e.clientY)
        return ok ? { x: e.clientX - A.left, y: e.clientY - A.top } : { x: g.x, y: g.y + g.d * 0.25 }
    }
    const neighbours = (g, n) =>
        alive()
            .filter((o) => o.i !== g.i)
            .map((o) => ({ o, dd: Math.hypot(o.x - g.x, o.y - g.y) }))
            .sort((a, b) => a.dd - b.dd)
            .slice(0, n)
    const press = (i, e) => {
        const tIn = performance.now()
        const G = geomRef.current
        const g = G && G.bubbles[i]
        if (!g || goneRef.current[i] || fin.phase.current !== "play") return
        if (st.press) release(null, true)
        if (fin.phase.current !== "play" || goneRef.current[i]) return
        st.lastInput = tIn
        // the dodger (surprise): the next-to-last bubble dodges the first tap
        if (plan.surprise === "dodger" && !st.dodged && N - st.k === 2) {
            dodgeIt(i, e)
            return
        }
        const R = red()
        const el = hitEl(i)
        const tp = touchPoint(e, g)
        const a = (Math.atan2(tp.y - g.y, tp.x - g.x) * 180) / Math.PI
        const pr = { i, id: e && e.pointerId, t: eosPilotEvT(e).t, a, anims: [] }
        st.press = pr
        const keep = (x) => x && pr.anims.push(x)
        if (!R && el) {
            const rot = (s) => `rotate(${a.toFixed(0)}deg) ${s} rotate(${(-a).toFixed(0)}deg)`
            // the film dimples toward the finger (40 ms), then bulges toward it up to 1.12; the iridescence spins up
            keep(anim(el.querySelector(".pbBody"), [{ transform: "none" }, { transform: rot("scale(.93,1.07)"), offset: 0.18, easing: "cubic-bezier(.2,.8,.3,1)" }, { transform: rot("scale(1.12,1.04)") }], { duration: C.pressMs, easing: "cubic-bezier(.3,.5,.4,1)", fill: "forwards" }))
            keep(anim(el.querySelector("ts-face-pic"), [{ transform: "none" }, { transform: "scale(.92)", offset: 0.18 }, { transform: "scale(.86,.95)" }], { duration: C.pressMs, fill: "forwards" }))
            keep(anim(el.querySelector(".pbSpin"), [{ opacity: 0, transform: "rotate(0deg)" }, { opacity: 0.95, transform: "rotate(150deg)" }], { duration: C.pressMs, fill: "forwards" }))
            keep(anim(el.querySelector(".pbTether"), [{ transform: tf(g, 1) }, { transform: tf(g, 1.035) }], { duration: 60, fill: "forwards" }))
            neighbours(g, 2).forEach(({ o }) => {
                const dir = o.x >= g.x ? 1 : -1
                keep(anim(part(o.i, ".pbSwing"), [{ transform: "none" }, { transform: `rotate(${dir * 3}deg)` }], { duration: 200, easing: "ease-out", fill: "forwards" }))
            })
            // the hero lurches 3 px toward it, then braces and leans away
            const dir = g.x >= G.hx ? 1 : -1
            keep(anim(leanRef.current, [{ transform: "none" }, { transform: `translateX(${dir * 3}px)`, offset: 0.25 }, { transform: `translateX(${-dir * 4}px) rotate(${-dir * 3}deg)` }], { duration: C.pressMs, easing: "ease-out", fill: "forwards" }))
        }
        const h = hero()
        if (h) {
            h.look(el)
            rt.timers.later(() => st.press === pr && hero() && hero().react("brace", 300), 60)
        }
        snd.cue("stretch", e, { action: "press" })
        pr.timer = rt.timers.later(() => release(null, true), C.pressMs)
        try {
            if (!st.perf.length) requestAnimationFrame(() => st.perf.push({ kind: "press", raf: Math.round(performance.now() - tIn), handler: pr.handlerMs }))
        } catch (x) {}
        pr.handlerMs = Math.round(performance.now() - tIn)
    }
    const release = (e, auto) => {
        const pr = st.press
        if (!pr) return
        st.press = null
        if (pr.timer) rt.timers.clear(pr.timer)
        const ev = e || { timeStamp: performance.now(), type: auto ? "auto" : "pointerup" }
        popBubble(pr.i, ev, { press: pr })
    }

    // the dodger: slides away with a cheeky face; the hero grabs its string and holds it out ("go on")
    const dodgeIt = (i, e) => {
        st.dodged = true
        const G = geomRef.current
        const g = G.bubbles[i]
        const tp = touchPoint(e, g)
        let dx = (tp.x <= g.x ? 1 : -1) * g.d * 0.55
        if (g.x + dx > G.w - g.d / 2 - 6 || g.x + dx < g.d / 2 + 6) dx = -dx
        setDodge({ i, dx, dy: -12, cheeky: true })
        st.events.push({ action: "dodge", t: Math.round(performance.now()) })
        snd.cue("dodge", e, { action: "dodge" })
        const h = hero()
        if (h) {
            h.look(hitEl(i))
            h.react("wow", 400)
        }
        rt.timers.later(() => {
            const hh = hero()
            const GG = geomRef.current
            if (!GG || phaseRef.current !== "play" || goneRef.current[i]) return
            const ox = (GG.hx - g.x) * 0.38
            setDodge({ i, dx: ox, dy: 18, cheeky: false, offered: true })
            if (hh) {
                hh.react("grin", 420)
                hh.look("camera")
                hh.emit("lurch", { dir: [g.x - GG.hx, 0], s: 0.5 })
            }
            rt.timers.later(() => hero() && hero().look(null), 700)
        }, 650)
    }

    const popBubble = (i, e, o = {}) => {
        const tIn = performance.now()
        const G = geomRef.current
        const g = G && G.bubbles[i]
        if (!g || goneRef.current[i] || fin.phase.current !== "play") return
        goneRef.current[i] = true
        const pr = o.press
        if (pr) pr.anims.forEach((x) => x && x.cancel())
        if (st.press && st.press.i === i) {
            rt.timers.clear(st.press.timer)
            st.press.anims.forEach((x) => x && x.cancel())
            st.press = null
        }
        const R = red()
        const el = hitEl(i)
        const k1 = ++st.k
        const isLast = k1 >= N
        const t = eosPilotEvT(e).t
        st.chain = t - st.lastPopT < C.chainMs ? st.chain + 1 : 1
        st.lastPopT = t
        st.chainMax = Math.max(st.chainMax, st.chain)
        st.lastX = g.x
        st.lastInput = tIn
        const v = pctOf(k1)
        const vOld = pctOf(k1 - 1)
        const crossing = !isLast && eosPilotFaceStep(v) !== eosPilotFaceStep(vOld)
        const slow = isLast && !R ? 2.5 : 1
        const exh = !isLast && !o.auto && !R && breath.exhale()
        const gold = plan.golden === i
        const a = pr ? pr.a : -90
        const s = stage()

        // -- the film: a tear seam opens from the touch point (30 ms), then it bursts (2.5x slower on the last)
        let bodyAnim = null
        if (el) {
            const body = el.querySelector(".pbBody")
            const teth = el.querySelector(".pbTether")
            if (R) bodyAnim = anim(body, [{ opacity: 1 }, { opacity: 0 }], { duration: 120 })
            else {
                const from = pr ? `rotate(${a.toFixed(0)}deg) scale(1.12,1.04) rotate(${(-a).toFixed(0)}deg)` : "none"
                anim(el.querySelector(".pbSeam"), [{ transform: `rotate(${a.toFixed(0)}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${a.toFixed(0)}deg) scaleX(1)`, opacity: 1, offset: 0.5 }, { transform: `rotate(${a.toFixed(0)}deg) scaleX(1.1)`, opacity: 0 }], { duration: 70 * slow, easing: "ease-out" })
                bodyAnim = anim(body, [{ transform: from, opacity: 1 }, { transform: `rotate(${a.toFixed(0)}deg) scale(1.18,1.1) rotate(${(-a).toFixed(0)}deg)`, opacity: 1, offset: 0.3 }, { transform: "scale(1.32)", opacity: 0 }], { duration: 150 * slow, delay: 30 * slow, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" })
                anim(teth, [{ transform: tf(g, 1, 0), opacity: 1 }, { transform: tf(g, 0.36, g.side * 14), opacity: 1, offset: 0.45 }, { transform: tf(g, 0, -g.side * 6), opacity: 0 }], { duration: 260 * slow, easing: "cubic-bezier(.2,.8,.3,1)" })
            }
        }
        snd.cue(isLast ? "popLast" : "pop", e, { chain: st.chain - 1, m: mirror.key, heavy: mirror.key === "anger", anim: bodyAnim, impactOffset: 30 * slow, action: o.auto || undefined })

        // -- the freed feeling: its positive picture rises out smiling and waves goodbye; the word breaks into shards
        if (!R) {
            freeFace(i, g)
            shards(g)
        }
        // -- the world: droplets (sparkles on a breath pop), shock ring, one droplet stays hanging for the climax
        if (!isLast && s) {
            const sp = mirror.key === "anger" ? 1.3 : 1
            s.burst("droplets", { x: g.x, y: g.y, n: R ? 3 : 10, dist: g.d * 0.95 * sp, ms: 480, gravity: 54, hue: exh || gold ? 46 : 196 + (k1 % 4) * 28, anims: rt.anims })
            if (exh) s.burst("motes", { x: g.x, y: g.y, n: 6, dist: g.d * 0.9, ms: 760, hue: 48, anims: rt.anims })
            if (!R) {
                const ring = fxNodes("popRing")[st.ringRR++ % 2]
                if (ring) {
                    ring.style.setProperty("--rd", `${g.d}px`)
                    const sc = mirror.key === "anger" ? 2.1 : 1.6
                    anim(ring, [{ transform: `translate(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px) scale(.6)`, opacity: 0.9 }, { transform: `translate(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px) scale(${sc})`, opacity: 0 }], { duration: 300, delay: 40, easing: "cubic-bezier(.1,.7,.3,1)", fill: "backwards" })
                }
            }
            const hangs = fxNodes("popHang")
            const hn = hangs[st.hangRR++ % Math.max(1, hangs.length)]
            if (hn) {
                const hx = g.x + (eosPilotRand(seed + k1) - 0.5) * g.d * 0.4
                const hy = g.y + g.d * 0.18
                hn.style.transform = `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px)`
                hn.setAttribute("data-on", "1")
                if (!R) anim(hn, [{ transform: `translate(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px) scale(.3)`, opacity: 0 }, { transform: `translate(${hx.toFixed(1)}px,${(hy - 14).toFixed(1)}px) scale(1.1)`, opacity: 1, offset: 0.5 }, { transform: `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px) scale(1)`, opacity: 0.95 }], { duration: 520, delay: 40, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" })
                st.hang = st.hang.filter((x) => x && x.el !== hn).concat([{ el: hn, x: hx, y: hy }])
            }
            weatherPop(k1, g)
        }
        st.last = { i, x: g.x, y: g.y, d: g.d }

        // -- the supporting cast: neighbours swing on their strings; +120 the droplets reach them: a blink, and
        //    the calm spreads by contact (faces past their share flip positive on the S10 re-render)
        if (!R && !isLast) {
            neighbours(g, 2).forEach(({ o: n }, j) => {
                const dir = n.x >= g.x ? 1 : -1
                const amp = 7 - j * 2
                anim(part(n.i, ".pbSwing"), [{ transform: "none" }, { transform: `rotate(${dir * amp}deg)`, offset: 0.25 }, { transform: `rotate(${-dir * amp * 0.45}deg)`, offset: 0.55 }, { transform: `rotate(${dir * amp * 0.15}deg)`, offset: 0.8 }, { transform: "none" }], { duration: 640, delay: 30 + 40 * j, easing: "ease-out" })
                anim(part(n.i, "ts-face-pic"), [{ transform: "none" }, { transform: "scale(1.08,.9)", offset: 0.3 }, { transform: "none" }], { duration: 220, delay: 120 + 30 * j, easing: "ease-out" })
            })
            snd.later("blink", 120, t, { beat: "contact" })
        }
        if (!isLast) rt.timers.later(() => setFaceP(v), 120)

        // -- the hero: lurches away from the popped side (scaled to the bubble), then a reaction from the pool
        const h = hero()
        if (h && !isLast) {
            if (st.slumped) {
                st.slumped = false
                h.celebrate([{ at: 0, part: "body", slot: "slump", keyframes: [{ transform: `translateY(${4 * G.K}px) scale(1.03,.94) rotate(-3deg)` }, { transform: "none" }], opts: { duration: 500, easing: "ease-out", fill: "forwards" } }])
            }
            h.emit("lurch", { dir: [g.x - G.hx, g.y - G.hy], s: eosClamp(0.4 + (g.d - 90) / 100, 0.4, 0.8) })
            actOn(h, el, e, k1, crossing, exh, gold)
            const later = rt.timers.later
            later(() => {
                const hh = hero()
                if (!hh) return
                hh.setStance(k1 / N)
                hh.setTug(Math.max(0, (N - k1) / N))
            }, 300)
            if (!exh) later(() => hero() && phaseRef.current === "play" && hero().emit("exhale", { ms: 520, amp: 0.3 }), 430)
            if (crossing) {
                snd.later("step", 920, t, { beat: "step" })
                if (v >= 67) snd.later("hum", 1400, t, { beat: "hum" })
            }
            if (st.chain >= 3 && !R)
                alive().forEach((o, j) => {
                    anim(part(o.i, ".pbTether > i"), [{ opacity: 0, transform: "translateY(0)" }, { opacity: 1, offset: 0.3 }, { opacity: 0, transform: "translateY(70px)" }], { duration: 480, delay: 60 * j, fill: "backwards" })
                })
        }
        // -- the golden film (rare discovery): an early sun shaft warms the hero's cheeks for the rest of the run
        if (gold && !isLast) goldenPop()

        // -- progress: explicit, monotonic; the last pop reports 96 (no p.sfx) and 100 only arrives at the hand-off
        report(isLast ? lastPct() : v)
        setK(k1)
        if (s) s.shift(v)
        st.perf.push({ kind: o.auto || "pop", handler: Math.round(performance.now() - tIn) })
        if (st.perf.length > 14) st.perf.splice(1, 1)
        if (isLast) {
            phaseRef.current = "finale"
            setPhase("finale")
            if (st.bedT) rt.timers.clear(st.bedT)
            fin.start(e)
            return
        }
        // -- the surprise, at about half way (one per run by seed, never the same as last run)
        if (!st.surpriseDone && k1 >= Math.ceil(N / 2) && N - k1 >= 2 && !o.auto) {
            if (plan.surprise === "sneeze") {
                st.surpriseDone = true
                rt.timers.later(sneeze, 260)
            } else if (plan.surprise === "bird") {
                st.surpriseDone = true
                rt.timers.later(birdPeck, 300)
            }
        }
    }

    const actOn = (h, el, e, k1, crossing, exh, gold) => {
        const later = rt.timers.later
        const t = eosPilotEvT(e).t
        if (exh) {
            // breath pop: the hero blows a visible puff ring; the next chime up the ladder
            st.breathPops++
            h.react("phew", 400)
            h.emit("exhale", { ms: 520, amp: 0.35 })
            const ring = fxNodes("popPuffRing")[0]
            const G = geomRef.current
            if (ring && G && !red()) anim(ring, [{ transform: `translate(${G.hx.toFixed(1)}px,${(G.hy - G.px * 0.1).toFixed(1)}px) scale(.3)`, opacity: 0.9 }, { transform: `translate(${G.hx.toFixed(1)}px,${(G.hy - G.px * 0.9).toFixed(1)}px) scale(1.6)`, opacity: 0 }], { duration: 760, easing: "cubic-bezier(.2,.7,.3,1)" })
            snd.later("chime", 40, t, { n: st.breathPops - 1, beat: "breath-pop" })
            return
        }
        let act
        if (crossing) act = { face: "phew", motion: "phew" }
        else if (st.chain >= 5) act = { face: "giggle", motion: "laugh" }
        else if (st.chain >= 3) act = { face: "giggle", motion: "bounce" }
        else act = eosPilotPick(C.acts, pickRef.current, seed + k1 * 3)
        h.react(act.face, act.motion === "laugh" || act.motion === "phew" ? 450 : 360)
        const G = geomRef.current
        const K = G ? G.K : 1
        const m = act.motion
        if (m === "phew") {
            h.look("camera")
            later(() => hero() && hero().look(null), 560)
        } else if (m === "laugh") {
            h.look("camera")
            h.celebrate([
                { at: 120, part: "idle", slot: "hopI", keyframes: [{ transform: "none" }, { transform: "translateY(-11px) rotate(-3deg)", offset: 0.45 }, { transform: "none" }], opts: { duration: 380, easing: "cubic-bezier(.3,.7,.4,1)" } },
                { at: 120, part: "footL", slot: "hopF", keyframes: [{ translate: "0 0" }, { translate: "0 -8px", offset: 0.4 }, { translate: "0 0" }], opts: { duration: 420, easing: "ease-out" } },
            ])
            snd.later("laugh", 60, t, { beat: "laugh" })
            later(() => hero() && hero().look(null), 600)
        } else if (m === "bounce") {
            h.celebrate([{ at: 60, part: "idle", slot: "bounce", keyframes: [{ transform: "none" }, { transform: "translateY(-5px) rotate(3deg)", offset: 0.3 }, { transform: "translateY(0)", offset: 0.55 }, { transform: "translateY(-3px) rotate(-3deg)", offset: 0.78 }, { transform: "none" }], opts: { duration: 340, easing: "ease-out" } }])
            snd.later("giggle", 60, t, { beat: "giggle" })
        } else if (m === "spot") {
            h.look(el)
            later(() => hero() && hero().look(null), 520)
        } else if (m === "shake") {
            h.celebrate([{ at: 300, part: "idle", slot: "shake", keyframes: [{ transform: "none" }, { transform: "rotate(4deg)", offset: 0.25 }, { transform: "rotate(-4deg)", offset: 0.5 }, { transform: "rotate(3deg)", offset: 0.75 }, { transform: "none" }], opts: { duration: 260, easing: "ease-in-out" } }])
        } else if (m === "glance") {
            h.look(el)
            later(() => hero() && hero().look("camera"), 300)
            later(() => hero() && hero().look(null), 640)
        } else if (m === "sigh") {
            h.emit("exhale", { ms: 700, amp: 0.4 })
        } else if (m === "hop") {
            later(() => hero() && hero().emit("hop", { px: 12, ms: 300 }), 280)
        } else if (m === "tilt") {
            h.celebrate([{ at: 200, part: "idle", slot: "tilt", keyframes: [{ transform: "none" }, { transform: "rotate(9deg)", offset: 0.3 }, { transform: "rotate(9deg)", offset: 0.7 }, { transform: "none" }], opts: { duration: 620, easing: "ease-in-out" } }])
        } else if (m === "blow") {
            // it blows at the rest of the bunch: they sway away
            later(() => {
                const hh = hero()
                if (hh) hh.emit("exhale", { ms: 420, amp: 0.2 })
                const GG = geomRef.current
                if (GG && !red())
                    alive().forEach((o, j) => {
                        const dir = o.x >= GG.hx ? 1 : -1
                        anim(part(o.i, ".pbSwing"), [{ transform: "none" }, { transform: `rotate(${dir * 4}deg)`, offset: 0.4 }, { transform: "none" }], { duration: 520, delay: 30 * j, easing: "ease-out" })
                    })
            }, 300)
        }
        if (st.chain >= 2) snd.later("plink", 30, t, { n: st.chain, beat: "chain" })
        void K
    }

    // the freed picture (its positive relief variant, or the user's own picture) floats up 46 px and fades (700 ms)
    const freeFace = (i, g) => {
        const nodes = fxNodes("popFreed")
        const node = nodes[st.freeRR++ % Math.max(1, nodes.length)]
        const F = fpRef.current
        if (!node || !F) return
        const img = node.querySelector("img")
        const src = F.upload ? F.pics[i % F.pics.length] : F.relief[i % F.relief.length]
        if (img && src && img.getAttribute("src") !== src) img.setAttribute("src", src)
        const P = Math.round(g.d * 0.54)
        node.style.setProperty("--fd", `${P}px`)
        const x = g.x
        const y = g.y - g.d * 0.12
        anim(node, [{ transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(.92) rotate(0deg)`, opacity: 1 }, { transform: `translate(${x.toFixed(1)}px,${(y - 18).toFixed(1)}px) scale(1.12) rotate(-8deg)`, opacity: 1, offset: 0.3 }, { transform: `translate(${x.toFixed(1)}px,${(y - 34).toFixed(1)}px) scale(1.08) rotate(8deg)`, opacity: 0.9, offset: 0.6 }, { transform: `translate(${x.toFixed(1)}px,${(y - 46).toFixed(1)}px) scale(1) rotate(0deg)`, opacity: 0 }], { duration: 700, delay: 30, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" })
    }
    const shards = (g) => {
        const w = String(W.words[g.i] || "").replace(/\s+/g, "")
        if (!w) return
        const n = w.length <= 3 ? w.length : w.length <= 8 ? 3 : 4
        const per = Math.ceil(w.length / n)
        const parts = []
        for (let j = 0; j < w.length && parts.length < 4; j += per) parts.push(w.slice(j, j + per))
        const nodes = fxNodes("popShard")
        const y0 = g.y + g.d * 0.27
        parts.forEach((ch, j) => {
            const sh = nodes[st.shardRR++ % nodes.length]
            if (!sh) return
            sh.setAttribute("data-c", ch)
            const x0 = g.x + (j - (parts.length - 1) / 2) * 16
            const dx = (j - (parts.length - 1) / 2) * 18 + (eosPilotRand(seed + st.shardRR * 5) - 0.5) * 14
            anim(sh, [{ transform: `translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px) rotate(0deg) scale(1)`, opacity: 0.95 }, { transform: `translate(${(x0 + dx).toFixed(1)}px,${(y0 - 50 - j * 6).toFixed(1)}px) rotate(${(dx * 1.4).toFixed(0)}deg) scale(.7)`, opacity: 0 }], { duration: 640, delay: 40, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" })
        })
    }
    // the weather answers each pop: sad = a hole in the fog + a sun shaft lands on the hero; anxious = one mote
    // goes quiet; anger = the smog shudders; panic = one racing streak slows
    const weatherPop = (k1, g) => {
        const G = geomRef.current
        if (!G || red()) return
        const key = mirror.key
        if (key === "sad") {
            const hole = wxNodes("wxHole")[0]
            if (hole) anim(hole, [{ transform: `translate(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px) scale(.4)`, opacity: 0.9 }, { transform: `translate(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px) scale(1.6)`, opacity: 0 }], { duration: 900, easing: "ease-out" })
            const sh = wxNodes("wxShaft")[st.shaftRR++ % 3]
            if (sh) {
                sh.style.opacity = "0.42"
                anim(sh, [{ opacity: 0, transform: "scaleY(.2)" }, { opacity: 0.8, transform: "scaleY(1)", offset: 0.35 }, { opacity: 0.42, transform: "scaleY(1)" }], { duration: 900, easing: "ease-out" })
            }
        } else if (key === "anxious") {
            const mote = wxNodes("wxMote")[k1 - 1]
            if (mote) {
                mote.style.opacity = "0"
                anim(mote, [{ opacity: 1, scale: "1" }, { opacity: 0, scale: ".2" }], { duration: 320, easing: "ease-in" })
            }
        } else if (key === "anger") {
            const w = worldRef.current
            if (w) anim(w, [{ transform: "none" }, { transform: "translate(3px,1px)", offset: 0.2 }, { transform: "translate(-2px,-1px)", offset: 0.5 }, { transform: "none" }], { duration: 180, easing: "linear" })
        }
    }
    const goldenPop = () => {
        st.gold = true
        const lift = liftRef.current
        if (lift) lift.setAttribute("data-blush", "1")
        const beam = fxNodes("popBeam")[0]
        if (beam && !red()) anim(beam, [{ transform: "rotate(var(--ba)) scaleX(0)", opacity: 0 }, { transform: "rotate(var(--ba)) scaleX(1)", opacity: 0.85, offset: 0.4 }, { transform: "rotate(var(--ba)) scaleX(1)", opacity: 0 }], { duration: 1200, easing: "ease-out" })
        snd.later("gold", 80, performance.now(), { beat: "golden" })
        const h = hero()
        if (h) {
            h.react("grin", 450)
            h.look("camera")
            rt.timers.later(() => hero() && hero().look(null), 700)
        }
        st.events.push({ action: "golden", t: Math.round(performance.now()) })
    }

    // the sneeze chain: a stray droplet lands on its nose, it sneezes, and the nearest bubble pops by itself
    const sneeze = () => {
        const G = geomRef.current
        if (!G || fin.phase.current !== "play") return
        const from = st.last || { x: G.hx, y: G.hy - 140 }
        const nose = { x: G.hx, y: G.hy + G.px * 0.04 }
        const drop = fxNodes("popSneeze")[0]
        const R = red()
        if (drop && !R) anim(drop, [{ transform: `translate(${from.x.toFixed(1)}px,${from.y.toFixed(1)}px) scale(.6)`, opacity: 1 }, { transform: `translate(${((from.x + nose.x) / 2).toFixed(1)}px,${(Math.min(from.y, nose.y) - 60).toFixed(1)}px) scale(1)`, opacity: 1, offset: 0.5 }, { transform: `translate(${nose.x.toFixed(1)}px,${nose.y.toFixed(1)}px) scale(.9)`, opacity: 1 }], { duration: 420, easing: "cubic-bezier(.3,.6,.5,1)" })
        const later = rt.timers.later
        later(() => {
            const h = hero()
            if (!h) return
            h.look("camera")
            h.react("curious", 260)
            h.celebrate([{ at: 0, part: "body", slot: "tickle", keyframes: [{ transform: "none" }, { transform: "scale(.95,1.08) translateY(-3px)" }], opts: { duration: 220, easing: "ease-in", fill: "forwards" } }])
        }, 430)
        later(() => {
            const h = hero()
            if (!h || fin.phase.current !== "play") return
            h.react("pfff", 300)
            h.celebrate([{ at: 0, part: "body", slot: "tickle", keyframes: [{ transform: "scale(.95,1.08) translateY(-3px)" }, { transform: "scale(1.14,.86)", offset: 0.3 }, { transform: "none" }], opts: { duration: 360, easing: "cubic-bezier(.2,.9,.3,1)", fill: "forwards" } }])
            h.emit("exhale", { ms: 520, amp: 0.2 })
            snd.cue("sneeze", null, { action: "sneeze" })
            st.events.push({ action: "sneeze", t: Math.round(performance.now()) })
            const GG = geomRef.current
            const al = alive().filter((o) => !st.press || st.press.i !== o.i)
            if (!GG || al.length < 2) return
            const near = al.map((o) => ({ o, d: Math.hypot(o.x - GG.hx, o.y - GG.hy) })).sort((a, b) => a.d - b.d)[0].o
            popBubble(near.i, { timeStamp: performance.now(), type: "sneeze" }, { auto: "sneeze" })
        }, 700)
        later(() => {
            const h = hero()
            if (!h || fin.phase.current !== "play") return
            h.react("giggle", 420)
            h.look("camera")
        }, 1080)
        later(() => hero() && fin.phase.current === "play" && hero().look(null), 1600)
    }
    // the bird peck: a bird lands on a string, pecks twice; the bubble pops and the hero laughs
    const birdPeck = () => {
        const G = geomRef.current
        if (!G || fin.phase.current !== "play") return
        const al = alive()
        if (al.length < 2) return
        const tgt = al.slice().sort((a, b) => a.y - b.y)[0]
        const bird = fxNodes("popBird")[0]
        const mx = (tgt.x + tgt.hx) / 2
        const my = (tgt.y + tgt.d * 0.47 + tgt.hy) / 2 - 8
        const R = red()
        st.events.push({ action: "bird", t: Math.round(performance.now()) })
        if (bird && !R) {
            bird.style.opacity = "1"
            const sx = G.w + 30
            anim(bird, [{ transform: `translate(${sx}px,${(G.top + 20).toFixed(1)}px)` }, { transform: `translate(${((sx + mx) / 2).toFixed(1)}px,${(my - 70).toFixed(1)}px)`, offset: 0.5 }, { transform: `translate(${mx.toFixed(1)}px,${my.toFixed(1)}px)` }], { duration: 900, easing: "cubic-bezier(.3,.6,.4,1)", fill: "both" })
            anim(bird, [{ rotate: "0deg" }, { rotate: "24deg", offset: 0.5 }, { rotate: "0deg" }], { duration: 160, delay: 1000, iterations: 2, composite: "add" })
        }
        hero() && hero().look(bird)
        const later = rt.timers.later
        later(() => snd.cue("peck", null, { action: "bird-peck" }), 1000)
        later(() => {
            if (fin.phase.current !== "play" || goneRef.current[tgt.i] || alive().length < 2) return
            popBubble(tgt.i, { timeStamp: performance.now(), type: "bird" }, { auto: "bird" })
            const h = hero()
            if (h) {
                h.react("giggle", 450)
                h.emit("hop", { px: 10, ms: 300 })
            }
            snd.later("laugh", 80, performance.now(), { beat: "bird-laugh" })
        }, 1360)
        later(() => {
            if (!bird || R) return
            anim(bird, [{ transform: `translate(${mx.toFixed(1)}px,${my.toFixed(1)}px)` }, { transform: `translate(${(mx + 120).toFixed(1)}px,${(G.top - 40).toFixed(1)}px)` }], { duration: 800, easing: "cubic-bezier(.5,0,.8,.6)", fill: "forwards" })
        }, 1460)
        later(() => {
            if (bird) bird.style.opacity = "0"
        }, 2300)
    }

    // ---------------------------------------------------------------- input
    React.useEffect(() => {
        try {
            eosExpose("pilotPop", {
                state: () => ({ k: st.k, N, words: W.words.slice(), feel: W.feel.slice(), phase: phaseRef.current, mirror: mirror.key, variant: mirror.variant, plan: { ...plan }, chainMax: st.chainMax, breathPops: st.breathPops, hang: st.hang.length, events: st.events.slice(), perf: st.perf.slice(), pics: (fpRef.current || {}).pics, relief: (fpRef.current || {}).relief, breath: Math.round(breath.period()) }),
            })
        } catch (e) {}
    }, [])
    const near = useEosPilotNearHit(arenaRef, () => alive().map((g) => hitEl(g.i)), 28)
    const onArenaDown = (e) => {
        snd.warm()
        if (fin.phase.current === "finale") return fin.tap(e)
        if (fin.phase.current !== "play") return
        shell.playInput()
        const t = e.target
        let el = t && t.closest ? t.closest(".popBub") : null
        if (el && el.disabled) el = null
        if (!el) {
            const hit = near(e)
            el = hit ? hit.el : null
        }
        if (el) {
            const i = Number(el.getAttribute("data-pk"))
            if (!goneRef.current[i]) {
                try {
                    if (arenaRef.current && e.pointerId != null) arenaRef.current.setPointerCapture(e.pointerId)
                } catch (x) {}
                press(i, e)
                return
            }
        }
        if (!ready) return snd.cue("early", e, { action: "early" })
        miss(e)
    }
    const onArenaUp = (e) => {
        if (st.press && (st.press.id == null || e.pointerId == null || st.press.id === e.pointerId)) release(e, false)
    }
    // a miss: never silent, never a fail. The hero shakes its head; the nearest lower bubble wobbles toward it.
    const miss = (e) => {
        const G = geomRef.current
        const h = hero()
        snd.cue("miss", e, { action: "miss" })
        if (!G) return
        const A = arenaRef.current.getBoundingClientRect()
        const x = e.clientX - A.left
        st.miss++
        if (h) {
            h.emit("miss", { dir: [x - G.hx, 0], variant: st.miss % 2 ? "shake" : "tilt" })
            if (st.miss % 3 === 0) h.react("brace", 260)
        }
        let best = null
        alive().forEach((o) => {
            const sc = -o.y * 10 + Math.abs(o.x - x)
            if (!best || sc < best.sc) best = { o, sc }
        })
        if (best && !red()) {
            const dir = best.o.x > G.hx ? -1 : 1
            anim(part(best.o.i, ".pbSwing"), [{ transform: "none" }, { transform: `rotate(${dir * 5}deg)`, offset: 0.35 }, { transform: `rotate(${-dir * 2}deg)`, offset: 0.7 }, { transform: "none" }], { duration: 420, easing: "ease-out" })
        }
    }

    // ---------------------------------------------------------------- render
    const b = box
    let G = b ? eosPilotPopGeom(b, N, plan.lay, seed, mirror) : null
    if (G && dodge && G.bubbles[dodge.i]) {
        const g = { ...G.bubbles[dodge.i] }
        g.x = eosClamp(g.x + dodge.dx, g.d / 2 + 4, G.w - g.d / 2 - 4)
        g.y = g.y + dodge.dy
        eosPilotPopTether(g)
        G = { ...G, bubbles: G.bubbles.map((o) => (o.i === dodge.i ? g : o)) }
    }
    geomRef.current = G
    if (G && st.lastX == null) st.lastX = G.hx
    // one live marker while input is expected: the lowest live bubble nearest the last tap (the offered dodger first)
    let liveIdx = -1
    if (G && phase === "play" && ready) {
        if (dodge && dodge.offered && !goneRef.current[dodge.i]) liveIdx = dodge.i
        else {
            let best = null
            G.bubbles.forEach((g) => {
                if (goneRef.current[g.i]) return
                const sc = -g.y * 4 + Math.abs(g.x - st.lastX)
                if (!best || sc < best.sc) best = { i: g.i, sc }
            })
            liveIdx = best ? best.i : -1
        }
    }
    const pct = phase === "finale" ? EOS_PILOT_FINAL_PCT : pctOf(k)
    const mot = Math.max(0, 1 - pct / 70).toFixed(3)
    hitsRef.current.length = N
    return (
        <div
            ref={arenaRef}
            className="arena eosPilotArena eosPilotPop"
            data-eos-pilot-kit="sky"
            data-eos-pilot-reduced={reduced ? "1" : undefined}
            data-mirror={mirror.key}
            data-mot={mirror.motion}
            onPointerDown={onArenaDown}
            onPointerUp={onArenaUp}
            onPointerCancel={onArenaUp}
            style={{ "--mot": mot }}
        >
            {G ? (
                <EosPilotStage ref={stageRef} kit="sky" mirror={mirror} calm={0} planeClassName={phase === "play" ? "popPlane" : "popPlane isLocked"}>
                    <div className="popWx" ref={wxRef} aria-hidden="true">
                        <i className="popRays" style={{ left: `${G.sun.x.toFixed(0)}px`, top: `${G.sun.y.toFixed(0)}px` }} />
                        <i className="popArch" style={{ "--ps": `${G.archD}px`, left: `${G.hx.toFixed(1)}px`, top: `${(G.cy - 24).toFixed(1)}px` }} />
                        {mirror.key === "anger" ? (
                            <>
                                <i className="wxSmog" />
                                <i className="wxAmber" />
                                <i className="wxRedSun" />
                                <i className="wxHeat" />
                            </>
                        ) : null}
                        {mirror.key === "sad" ? (
                            <>
                                <i className="wxFog a" />
                                <i className="wxFog b" />
                                {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                                    <i key={`r${j}`} className="wxRain" style={{ "--rx": 6 + j * 12 + Math.round(eosPilotRand(seed + j) * 8), "--rd": `${(0.8 + eosPilotRand(seed + j * 3) * 0.5).toFixed(2)}s`, "--rdl": `${(-eosPilotRand(seed + j * 5)).toFixed(2)}s` }} />
                                ))}
                                {[0, 1, 2].map((j) => (
                                    <i key={`s${j}`} className="wxShaft" style={{ left: `${(G.hx - 70 + (j - 1) * 46).toFixed(0)}px`, height: `${Math.round(G.hy + 30)}px`, rotate: `${(j - 1) * 7}deg` }} />
                                ))}
                                <i className="wxHole" />
                            </>
                        ) : null}
                        {mirror.key === "anxious" ? (
                            <>
                                <i className="wxFlicker" />
                                {[0, 1, 2, 3, 4, 5].map((j) => (
                                    <i key={`m${j}`} className="wxMote" style={{ left: `${Math.round((0.12 + 0.15 * j) * G.w)}px`, top: `${Math.round(G.top + (0.08 + 0.27 * eosPilotRand(seed + j * 7)) * (G.h - G.top))}px`, "--md": `${(0.9 + eosPilotRand(seed + j) * 0.8).toFixed(2)}s`, "--mdl": `${(-eosPilotRand(seed + j * 2) * 2).toFixed(2)}s`, "--mx": `${Math.round((eosPilotRand(seed + j * 3) - 0.5) * 60)}px`, "--my": `${Math.round((eosPilotRand(seed + j * 4) - 0.5) * 40)}px` }} />
                                ))}
                            </>
                        ) : null}
                        {mirror.key === "panic" ? (
                            <>
                                {[0, 1, 2, 3].map((j) => (
                                    <i key={`k${j}`} className="wxStreak" style={{ top: `${Math.round(G.top + (0.04 + 0.13 * j) * (G.h - G.top))}px`, "--rs": `${(2.2 + j * 0.5).toFixed(1)}s`, "--rsd": `${(-j * 0.9).toFixed(1)}s` }} />
                                ))}
                            </>
                        ) : null}
                    </div>
                    <div className="popWorld" ref={worldRef}>
                        {G.bubbles.map((g) => {
                            const gone = !!goneRef.current[g.i]
                            const isLive = g.i === liveIdx
                            const ox = g.hx - (g.x - g.d / 2)
                            const oy = g.hy - (g.y - g.d / 2)
                            const r1 = eosPilotRand(seed + g.i * 3)
                            const word = W.words[g.i]
                            const slot = g.i % 6
                            const cheeky = dodge && dodge.i === g.i && dodge.cheeky
                            const src = cheeky && !FP.upload ? FP.relief[slot] : FP.pics[slot]
                            const pos = cheeky || FP.pos(slot)
                            return (
                                <button
                                    key={`b${g.i}`}
                                    type="button"
                                    ref={(n) => (hitsRef.current[g.i] = n)}
                                    className={`eosPilotHit popBub tsFaceObject tsNoBubbleFace${gone ? " isGone" : ""}`}
                                    {...eosPilotFaceHost(slot)}
                                    data-pk={g.i}
                                    disabled={phase !== "play" || gone}
                                    data-live={isLive ? "1" : undefined}
                                    data-gold={plan.golden === g.i ? "1" : undefined}
                                    data-feel={W.feel.indexOf(g.i) >= 0 ? "1" : undefined}
                                    aria-label={`Pop: ${word}`}
                                    onClick={(e) => {
                                        if (e.detail === 0 && !goneRef.current[g.i]) {
                                            press(g.i, e)
                                            release(e, false)
                                        }
                                    }}
                                    style={{
                                        width: `${g.d}px`,
                                        height: `${g.d}px`,
                                        translate: `${(g.x - g.d / 2).toFixed(1)}px ${(g.y - g.d / 2).toFixed(1)}px`,
                                        "--ox": `${ox.toFixed(1)}px`,
                                        "--oy": `${oy.toFixed(1)}px`,
                                        "--tl": (g.len / 100).toFixed(3),
                                        "--tr": `${g.theta.toFixed(1)}deg`,
                                        "--rh": Math.round(r1 * 360),
                                        "--shx": g.x >= G.hx ? 1 : -1,
                                        "--shd": `${(-r1 * 1.6).toFixed(2)}s`,
                                    }}
                                    {...eosPilotMarker(C.marker, isLive)}
                                >
                                    <span className="pbSway">
                                        <span className="pbSwing">
                                            <i className="pbTether">
                                                <i />
                                            </i>
                                            <span className="pbMot">
                                                <span className="pbBody">
                                                    <i className="pbRim" />
                                                    <i className="pbSpin" />
                                                    <i className="pbGlow" />
                                                    <i className="pbSeam" />
                                                    <EosPilotFace src={src} word={word} D={g.d} pos={pos} upload={FP.upload} />
                                                </span>
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    <div className="popGroup" style={{ left: `${G.gx.toFixed(1)}px`, top: `${G.gy.toFixed(1)}px`, width: `${G.G}px`, height: `${G.G}px` }}>
                        <i className="popCloud" ref={cloudRef} style={{ width: `${G.cloudW}px`, height: `${G.cloudH}px`, left: `${((G.G - G.cloudW) / 2).toFixed(1)}px`, top: `${(G.G / 2 - G.px * 0.08 + G.px * 0.4).toFixed(1)}px` }} />
                        <div className="popLift" ref={liftRef} data-blush={st.gold ? "1" : undefined}>
                            <div className="popLean" ref={leanRef} style={{ transformOrigin: `50% ${(G.G / 2 - G.px * 0.08 + G.px * 0.55).toFixed(1)}px` }}>
                                <div className="popBreath" ref={breathRef} style={{ transformOrigin: `50% ${(G.G / 2 - G.px * 0.08 + G.px * 0.55).toFixed(1)}px` }}>
                                    <EosPilotActor
                                        ref={heroRef}
                                        role="holder"
                                        emotion={emotion}
                                        size={G.phone ? C.lay.phone.hero : C.lay.desk.hero}
                                        u={b.u}
                                        progress={pct}
                                        reacts={C.reacts}
                                        label={EOS_CHAR_NAMES[heroChar]}
                                        showLabel={false}
                                        seed={heroSeed}
                                        faceIds={faceIds}
                                        className="popHero"
                                        style={{ left: "50%", top: `${(G.G / 2 - G.px * 0.08).toFixed(1)}px` }}
                                    />
                                    <i className="popBlush" style={{ "--bs": `${Math.round(G.px * 0.2)}px`, left: "50%", top: `${(G.G / 2 - G.px * 0.08 + G.px * 0.12).toFixed(1)}px`, "--bx": `${Math.round(G.px * 0.26)}px` }} />
                                </div>
                            </div>
                            <i className="popPearl" ref={pearlRef} style={{ "--pd": `${Math.round(26 * G.K)}px`, "--ph": mirror.pearl, left: "50%", top: `${(G.G / 2 - G.px * 0.08 + G.px * 0.2).toFixed(1)}px` }} />
                            <div
                                className="popCalm"
                                ref={calmRef}
                                aria-hidden="true"
                                data-eos-avoid="1"
                                data-eos-char={heroChar}
                                style={{
                                    width: `${G.calmD}px`,
                                    height: `${G.calmD}px`,
                                    left: `${((G.G - G.calmD) / 2).toFixed(1)}px`,
                                    top: `${((G.G - G.calmD) / 2).toFixed(1)}px`,
                                    transformOrigin: `50% ${(G.calmD / 2 - G.px * 0.08 + G.px * 0.2 - G.px * 0.08).toFixed(1)}px`,
                                }}
                            >
                                <i className="film" />
                                <i className="rim" />
                                <i className="caustic" />
                                <i className="glint" />
                                <i className="flash" />
                            </div>
                        </div>
                    </div>
                    <div className="popFx" ref={fxRef} aria-hidden="true" {...EOS_PRIVATE_ATTRS}>
                        <i
                            className="popBeam"
                            style={{
                                left: `${G.sun.x.toFixed(1)}px`,
                                top: `${G.sun.y.toFixed(1)}px`,
                                width: `${Math.max(40, Math.hypot(G.hx - G.sun.x, G.cy - 24 - G.sun.y) - G.calmD * 0.42).toFixed(0)}px`,
                                "--ba": `${((Math.atan2(G.cy - 24 - G.sun.y, G.hx - G.sun.x) * 180) / Math.PI).toFixed(1)}deg`,
                            }}
                        />
                        <i className="popVeil" />
                        <i className="popRing" />
                        <i className="popRing" />
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                            <i key={`s${j}`} className="popShard" />
                        ))}
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                            <i key={`h${j}`} className="popHang" style={{ "--hd": `${(-j * 0.37).toFixed(2)}s` }} />
                        ))}
                        {[0, 1, 2].map((j) => (
                            <i key={`f${j}`} className="popFreed">
                                <img alt="" draggable={false} decoding="async" />
                            </i>
                        ))}
                        <i className="popPuffRing" />
                        <i className="popSneeze" />
                        <i className="popTear" />
                        <i className="popBird">
                            <b />
                        </i>
                        <i className="popLoopBird" />
                        <i className="popLoopBird" />
                    </div>
                </EosPilotStage>
            ) : null}
        </div>
    )
})
eosPilotRegister(1, EosPilotPopEngine, { name: "Balloon Morning", kit: "sky", role: "holder" })

const EOS_PILOT_POP_AR = `${EOS_A} .eosPilotPop`
const EOS_PILOT_POP_CSS = `
${EOS_PILOT_POP_AR} .popWx{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
${EOS_PILOT_POP_AR} .popWx > i{position:absolute;display:block;font-style:normal;pointer-events:none}
${EOS_PILOT_POP_AR} .popWorld{position:absolute;inset:0;z-index:1}
${EOS_PILOT_POP_AR} .popGroup{position:absolute;z-index:2;pointer-events:none}
${EOS_PILOT_POP_AR} .popFx{position:absolute;inset:0;z-index:3;pointer-events:none}
${EOS_PILOT_POP_AR} .popFx > i{position:absolute;left:0;top:0;display:block;font-style:normal;opacity:0;pointer-events:none}

/* ---- S7 Mirror: the kit props in the emotion's weather (the tint layer is .eosPilotL0m, S9 fades it with --calm) */
${EOS_PILOT_POP_AR} .eosPilotStage[data-mirror] :is(.cloudFar,.cloudNear){opacity:calc(.3 + var(--calm) * .62);transition:opacity var(--calm-ms) ease}
${EOS_PILOT_POP_AR} .eosPilotStage[data-mirror="panic"] .cloudFar{animation-duration:17s}
${EOS_PILOT_POP_AR} .eosPilotStage[data-mirror="sad"] .sun{opacity:clamp(0,var(--calm) * 1.8 - .3,1);transition:opacity var(--calm-ms) ease}
${EOS_PILOT_POP_AR} .eosPilotStage[data-mirror="anger"] .sun{opacity:clamp(0,var(--calm) * 1.6 - .1,1);transition:opacity var(--calm-ms) ease}
${EOS_PILOT_POP_AR} .eosPilotStage[data-mirror="anxious"] .sun{opacity:clamp(.25,.25 + var(--calm),1);transition:opacity var(--calm-ms) ease}
${EOS_PILOT_POP_AR} .wxSmog{inset:0;background:linear-gradient(180deg,rgba(70,20,24,0) 0%,rgba(120,40,30,.32) 45%,rgba(190,80,40,.55) 100%);opacity:clamp(0,1 - var(--calm) * 1.8,1);transition:opacity .6s ease}
${EOS_PILOT_POP_AR} .wxAmber{inset:0;background:radial-gradient(90% 60% at 60% 80%,rgba(255,170,60,.5),rgba(255,170,60,0) 70%);opacity:clamp(0,min(var(--calm) * 3.2,(.85 - var(--calm)) * 3),.9);transition:opacity .6s ease}
${EOS_PILOT_POP_AR} .wxRedSun{width:38%;aspect-ratio:1;left:56%;top:44%;border-radius:50%;background:radial-gradient(circle,rgba(255,96,56,.95) 0 17%,rgba(255,80,40,.5) 30%,rgba(255,60,30,0) 62%);opacity:clamp(0,1 - var(--calm) * 1.6,1);transition:opacity .6s ease;animation:eosPilotPopSmoulder 2.2s ease-in-out infinite alternate}
${EOS_PILOT_POP_AR} .wxHeat{left:-10%;right:-10%;top:60%;height:9%;background:repeating-linear-gradient(90deg,rgba(255,200,150,.07) 0 10px,rgba(255,200,150,0) 10px 26px);-webkit-mask:linear-gradient(180deg,transparent,#000 40%,#000 60%,transparent);mask:linear-gradient(180deg,transparent,#000 40%,#000 60%,transparent);opacity:clamp(0,1 - var(--calm) * 2,.7);animation:eosPilotPopHeat 1.4s ease-in-out infinite alternate}
${EOS_PILOT_POP_AR} .wxFog{left:-25%;right:-25%;height:44%;border-radius:50%;background:radial-gradient(closest-side,rgba(206,212,224,.88),rgba(206,212,224,.5) 55%,rgba(206,212,224,0));opacity:clamp(0,.92 - var(--calm) * 1.3,.92);transition:opacity .6s ease;animation:eosPilotDrift 26s ease-in-out infinite alternate}
${EOS_PILOT_POP_AR} .wxFog.a{top:14%}
${EOS_PILOT_POP_AR} .wxFog.b{top:46%;height:38%;animation-delay:-9s}
${EOS_PILOT_POP_AR} .wxRain{width:1.5px;height:46px;top:-12%;left:calc(var(--rx) * 1%);rotate:12deg;background:linear-gradient(180deg,rgba(220,230,245,0),rgba(220,230,245,.75));opacity:clamp(0,.85 - var(--calm) * 1.4,.85);animation:eosPilotPopRain var(--rd,.9s) linear var(--rdl,0s) infinite}
${EOS_PILOT_POP_AR} .wxShaft{top:-6%;width:90px;transform-origin:50% 0;opacity:0;background:linear-gradient(180deg,rgba(255,246,214,.8),rgba(255,240,200,.28) 70%,rgba(255,240,200,0));
  -webkit-mask:linear-gradient(90deg,transparent,#000 35%,#000 65%,transparent);mask:linear-gradient(90deg,transparent,#000 35%,#000 65%,transparent)}
${EOS_PILOT_POP_AR} .wxHole{left:0;top:0;width:180px;height:180px;margin:-90px 0 0 -90px;border-radius:50%;opacity:0;background:radial-gradient(closest-side,rgba(255,252,236,.7),rgba(255,250,230,0))}
${EOS_PILOT_POP_AR} .wxMote{width:7px;height:7px;margin:-3.5px;border-radius:50%;transition:opacity .3s ease;background:radial-gradient(circle,#fff,rgba(236,206,255,.95) 40%,rgba(200,150,255,0) 75%);box-shadow:0 0 8px rgba(220,180,255,.9);
  animation:eosPilotPopDart var(--md,1.2s) steps(3,end) var(--mdl,0s) infinite alternate}
${EOS_PILOT_POP_AR} .wxFlicker{inset:0;background:#fff;opacity:0;animation:eosPilotPopFlicker 1.3s steps(1,end) infinite}
${EOS_PILOT_POP_AR} .wxStreak{left:0;width:46%;height:16px;border-radius:50%;background:radial-gradient(closest-side,rgba(232,238,255,.6),rgba(232,238,255,0));opacity:clamp(0,1 - var(--calm) * 1.5,.9);animation:eosPilotPopRace var(--rs,3s) linear var(--rsd,0s) infinite}
/* sun rays (from 60%) and the climax rainbow, both behind the hero */
${EOS_PILOT_POP_AR} .popRays{width:150vmax;height:150vmax;max-width:1500px;max-height:1500px;translate:-50% -50%;border-radius:50%;
  background:repeating-conic-gradient(from 100deg at 50% 50%,rgba(255,250,228,.22) 0deg 5deg,rgba(255,250,228,0) 5deg 15deg);
  -webkit-mask:radial-gradient(closest-side,#000 8%,rgba(0,0,0,.5) 40%,transparent 72%);mask:radial-gradient(closest-side,#000 8%,rgba(0,0,0,.5) 40%,transparent 72%);
  opacity:clamp(0,(var(--calm) - .6) * 2.4,.85);transition:opacity 1.2s ease}
${EOS_PILOT_POP_AR} .popArch{width:var(--ps);height:var(--ps);margin:calc(var(--ps) / -2) 0 0 calc(var(--ps) / -2);border-radius:50%;opacity:0;transform-origin:50% 50%;
  background:radial-gradient(closest-side,transparent 72%,rgba(255,92,120,.78) 74%,rgba(255,156,72,.78) 77.5%,rgba(255,228,100,.78) 81%,rgba(120,222,130,.75) 84.5%,rgba(96,176,255,.75) 88%,rgba(110,110,230,.72) 91.5%,rgba(176,112,240,.7) 95%,transparent 98%);
  -webkit-mask:linear-gradient(180deg,#000 44%,rgba(0,0,0,.4) 50%,transparent 53%);mask:linear-gradient(180deg,#000 44%,rgba(0,0,0,.4) 50%,transparent 53%)}

/* ---- the bubbles: tethered soap film, iridescent rim, F8 picture + the user's words INSIDE the film */
${EOS_PILOT_POP_AR} .popBub{left:0;top:0;transition:translate .42s cubic-bezier(.34,1.45,.5,1)}
${EOS_PILOT_POP_AR} .popBub.isGone{pointer-events:none}
${EOS_PILOT_POP_AR} .pbSway,${EOS_PILOT_POP_AR} .pbSwing{position:absolute;inset:0;transform-origin:var(--ox) var(--oy);pointer-events:none}
${EOS_PILOT_POP_AR} .pbMot{position:absolute;inset:0;pointer-events:none}
${EOS_PILOT_POP_AR}[data-mot="tremble"] .popBub:not(.isGone) .pbMot{animation:eosPilotPopTremble .111s steps(2,end) infinite}
${EOS_PILOT_POP_AR}[data-mot="shove"] .popBub:not(.isGone) .pbMot{animation:eosPilotPopShove 1.6s ease-out var(--shd,0s) infinite}
${EOS_PILOT_POP_AR}[data-mot="sag"] .popBub:not(.isGone) .pbMot{animation:eosPilotPopSag 3.8s ease-in-out infinite alternate}
${EOS_PILOT_POP_AR}[data-mot="sag"] .popBub:not(.isGone) .pbMot::after{content:"";position:absolute;left:50%;top:96%;width:6px;height:8px;margin-left:-3px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
  background:radial-gradient(circle at 40% 35%,#fff,rgba(190,215,240,.9) 70%);opacity:0;animation:eosPilotPopDrip 3.2s ease-in var(--shd,0s) infinite}
${EOS_PILOT_POP_AR}[data-mot="drift"] .popBub:not(.isGone) .pbMot{animation:eosPilotPopDrift 2.4s linear var(--shd,0s) infinite}
/* the tether's anchor moves by translate with the SAME transition as the bubble (the string stays on the fist) */
${EOS_PILOT_POP_AR} .pbTether{position:absolute;left:0;top:0;translate:var(--ox) var(--oy);width:1.6px;height:100px;margin-left:-.8px;transform-origin:50% 0;
  transform:rotate(var(--tr)) scaleY(var(--tl));transition:transform .42s cubic-bezier(.34,1.45,.5,1),translate .42s cubic-bezier(.34,1.45,.5,1);overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.72) 60%,rgba(255,255,255,.58))}
${EOS_PILOT_POP_AR} .pbTether > i{position:absolute;left:-1px;right:-1px;top:0;height:30%;opacity:0;font-style:normal;background:linear-gradient(180deg,transparent,#fff 45%,#fffbe0 55%,transparent)}
${EOS_PILOT_POP_AR} .pbBody{position:absolute;inset:0;border-radius:50%;isolation:isolate;
  background:
    radial-gradient(circle at 31% 25%,rgba(255,255,255,.98) 0 3.5%,rgba(255,255,255,.55) 6%,rgba(255,255,255,0) 13%),
    radial-gradient(ellipse 22% 9% at 70% 82%,rgba(255,255,255,.5),rgba(255,255,255,0)),
    radial-gradient(circle at 50% 50%,rgba(255,255,255,.06) 56%,rgba(214,236,255,.22) 74%,rgba(255,255,255,.5) 96%),
    rgba(255,255,255,.07);
  box-shadow:inset -5px -1px 9px -3px rgba(159,216,255,.95),inset 3px 3px 10px -4px rgba(255,244,218,.8),0 6px 18px -6px rgba(30,20,80,.25)}
${EOS_PILOT_POP_AR} .pbBody > i{position:absolute;inset:0;border-radius:50%;font-style:normal;pointer-events:none}
${EOS_PILOT_POP_AR} .pbRim{opacity:.8;z-index:1;background:conic-gradient(from calc(var(--rh,0) * 1deg),#9EF0FF,#FFB8E6,#FFF2A8,#B8FFD9,#9EF0FF,#FFB8E6,#FFF2A8,#9EF0FF);
  -webkit-mask:radial-gradient(closest-side,transparent 84%,rgba(0,0,0,.55) 91%,#000 97%,transparent 100%);mask:radial-gradient(closest-side,transparent 84%,rgba(0,0,0,.55) 91%,#000 97%,transparent 100%);
  animation:eosPilotPopRim 8s linear infinite}
${EOS_PILOT_POP_AR} .pbSpin{opacity:0;z-index:1;background:conic-gradient(from 0deg,rgba(255,255,255,0),rgba(255,255,255,.95) 12%,rgba(255,200,240,.6) 20%,rgba(255,255,255,0) 32%,rgba(255,255,255,0) 50%,rgba(200,250,255,.9) 62%,rgba(255,255,255,0) 74%);
  -webkit-mask:radial-gradient(closest-side,transparent 82%,#000 92%,transparent 100%);mask:radial-gradient(closest-side,transparent 82%,#000 92%,transparent 100%)}
/* breath-synced rim glow: the film glows softly once per breath, on the exhale (a pop then is a breath pop) */
${EOS_PILOT_POP_AR} .pbGlow{opacity:0;z-index:1;box-shadow:inset 0 0 0 2px rgba(255,248,214,.9),inset 0 0 14px 2px rgba(255,236,170,.55),0 0 16px 3px rgba(255,240,190,.55)}
${EOS_PILOT_POP_AR} .pbSeam{left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;width:52%;height:2.5px;margin-top:-1.25px;border-radius:2px!important;transform-origin:0 50%;opacity:0;z-index:7;
  background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.95) 60%,#fff)}
${EOS_PILOT_POP_AR} .popBub.isGone :is(.pbBody,.pbTether){opacity:0}
${EOS_PILOT_POP_AR} .popBub.isGone .pbRim{animation:none}
${EOS_PILOT_POP_AR} .popBub[data-gold="1"] .pbRim{opacity:1;background:conic-gradient(from calc(var(--rh,0) * 1deg),#FFE27A,#FFC94D,#FFF6C2,#FFB938,#FFE9A0,#FFE27A)}
${EOS_PILOT_POP_AR} .popBub[data-gold="1"] .pbBody{box-shadow:inset -5px -1px 9px -3px rgba(255,214,120,.95),inset 3px 3px 12px -3px rgba(255,236,170,.95),0 0 22px 2px rgba(255,214,110,.55)}
${EOS_PILOT_POP_AR} .popBub:focus-visible::after{inset:-8px}
/* F8 text: the shared face (15 px / 900 cap), a deeper shadow so it holds on light sky and dark weather alike */
${EOS_PILOT_POP_AR} .popBub ts-face-text.tsBubbleFaceText{text-shadow:0 1px 2px rgba(12,14,44,.95),0 0 6px rgba(12,14,44,.6),0 0 12px rgba(40,90,190,.4)}
${EOS_PILOT_POP_AR} .popBub ts-face{z-index:2}

/* ---- the hero's world: cloud-top, lift, breath, blush, pearl, calm bubble */
${EOS_PILOT_POP_AR} .popCloud{position:absolute;display:block;font-style:normal;pointer-events:none;
  background:
    radial-gradient(26% 56% at 30% 52%,#fff 0 55%,rgba(255,255,255,0) 72%),
    radial-gradient(30% 70% at 52% 38%,#fff 0 55%,rgba(255,255,255,0) 72%),
    radial-gradient(24% 52% at 74% 54%,#fff 0 55%,rgba(255,255,255,0) 72%),
    radial-gradient(48% 42% at 50% 74%,#f1f4ff 0 60%,rgba(241,244,255,0) 74%)}
${EOS_PILOT_POP_AR} .popCloud::after{content:"";position:absolute;left:12%;right:12%;bottom:-6%;height:30%;border-radius:50%;background:radial-gradient(closest-side,rgba(60,50,120,.25),rgba(60,50,120,0))}
${EOS_PILOT_POP_AR} .popLift,${EOS_PILOT_POP_AR} .popLean,${EOS_PILOT_POP_AR} .popBreath{position:absolute;inset:0;pointer-events:none}
${EOS_PILOT_POP_AR} .popHero{z-index:1}
${EOS_PILOT_POP_AR} .popHero .eosPilotActorIdle{animation:eosPilotSway var(--tug-period) ease-in-out var(--a-delay,0s) infinite alternate}
${EOS_PILOT_POP_AR} .popBlush{position:absolute;z-index:3;width:var(--bs);height:calc(var(--bs) * .55);margin:0 0 0 calc(var(--bs) / -2);opacity:0;font-style:normal;transition:opacity .8s ease;
  background:radial-gradient(closest-side,rgba(255,120,150,.75),rgba(255,120,150,0));translate:calc(var(--bx) * -1) 0;
  box-shadow:calc(var(--bx) * 2) 0 0 0 rgba(0,0,0,0)}
${EOS_PILOT_POP_AR} .popBlush::after{content:"";position:absolute;inset:0;border-radius:50%;translate:calc(var(--bx) * 2) 0;background:inherit}
${EOS_PILOT_POP_AR} .popLift[data-blush="1"] .popBlush{opacity:.7}
${EOS_PILOT_POP_AR} .popPearl{position:absolute;z-index:3;width:var(--pd);height:var(--pd);margin:calc(var(--pd) / -2) 0 0 calc(var(--pd) / -2);border-radius:50%;opacity:0;font-style:normal;
  background:radial-gradient(circle at 36% 30%,#fff 0 12%,hsla(var(--ph,200),95%,85%,.95) 34%,hsla(var(--ph,200),90%,66%,.85) 72%,hsla(var(--ph,200),90%,60%,.4));
  box-shadow:0 0 14px 4px hsla(var(--ph,200),100%,80%,.85),0 0 34px 8px rgba(255,250,230,.55)}
${EOS_PILOT_POP_AR} .popCalm{position:absolute;z-index:2;border-radius:50%;overflow:hidden;opacity:0;isolation:isolate;
  box-shadow:0 0 0 1.5px rgba(255,255,255,.75),0 0 26px 4px rgba(200,236,255,.55),0 0 60px 10px rgba(255,244,214,.35)}
${EOS_PILOT_POP_AR} .popCalm[data-on="1"]{opacity:1}
${EOS_PILOT_POP_AR} .popCalm > i{position:absolute;inset:0;border-radius:50%;font-style:normal}
${EOS_PILOT_POP_AR} .popCalm > .film{background:
    radial-gradient(circle at 30% 22%,rgba(255,255,255,.95) 0 3%,rgba(255,255,255,.5) 6%,rgba(255,255,255,0) 14%),
    radial-gradient(ellipse 24% 8% at 66% 84%,rgba(255,255,255,.5),rgba(255,255,255,0)),
    radial-gradient(circle at 50% 50%,rgba(230,244,255,.08) 50%,rgba(200,232,255,.3) 78%,rgba(255,255,255,.7) 97%),
    linear-gradient(160deg,rgba(255,214,240,.16),rgba(190,240,255,.16) 50%,rgba(255,244,200,.14));
  box-shadow:inset -8px -2px 16px -6px rgba(159,216,255,.95),inset 6px 6px 18px -8px rgba(255,244,218,.95)}
${EOS_PILOT_POP_AR} .popCalm > .rim{background:conic-gradient(#7FE8FF,#FF9FDB,#FFE98A,#9DFFC8,#7FE8FF,#FF9FDB,#FFE98A,#7FE8FF);opacity:1;
  -webkit-mask:radial-gradient(closest-side,transparent 76%,rgba(0,0,0,.45) 86%,#000 95%,rgba(0,0,0,.8) 100%);mask:radial-gradient(closest-side,transparent 76%,rgba(0,0,0,.45) 86%,#000 95%,rgba(0,0,0,.8) 100%)}
${EOS_PILOT_POP_AR} .popCalm > .caustic{inset:-30% -60%;border-radius:0;opacity:0;
  background:linear-gradient(90deg,transparent 34%,rgba(255,120,150,.5) 40%,rgba(255,210,120,.55) 45%,rgba(250,250,150,.5) 49%,rgba(140,240,170,.5) 53%,rgba(120,200,255,.55) 57%,rgba(180,140,255,.5) 62%,transparent 68%)}
${EOS_PILOT_POP_AR} .popCalm > .glint{inset:-20% -40%;border-radius:0;opacity:0;background:linear-gradient(90deg,transparent 44%,rgba(255,255,255,.85) 50%,transparent 56%)}
${EOS_PILOT_POP_AR} .popCalm > .flash{opacity:0;background:radial-gradient(circle at 40% 36%,rgba(255,255,250,.95),rgba(255,246,214,.6) 55%,rgba(255,236,190,.15))}

/* ---- pooled fx (POP owns these; the kit's droplets/motes pools are shared) */
${EOS_PILOT_POP_AR} .popVeil{left:0!important;top:0!important;right:0;bottom:0;width:100%;height:100%;background:radial-gradient(120% 90% at 50% 45%,rgba(230,246,255,.9),rgba(200,230,255,.5))}
${EOS_PILOT_POP_AR} .popRing{width:var(--rd,90px);height:var(--rd,90px);margin:calc(var(--rd,90px) / -2) 0 0 calc(var(--rd,90px) / -2);border-radius:50%;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.85),0 0 14px rgba(200,240,255,.55),inset 0 0 12px rgba(255,200,240,.35)}
${EOS_PILOT_POP_AR} .popShard{width:44px;height:22px;margin:-11px 0 0 -22px;text-align:center;font-size:15px;line-height:22px;font-weight:900;color:#fff;
  text-shadow:0 1px 2px rgba(12,14,44,.95),0 0 8px rgba(40,90,190,.5)}
${EOS_PILOT_POP_AR} .popShard::after{content:attr(data-c)}
${EOS_PILOT_POP_AR} .popHang{width:10px;height:12px;margin:-6px 0 0 -5px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;transition:opacity .3s ease;
  background:radial-gradient(circle at 38% 30%,#fff,rgba(200,236,255,.95) 40%,rgba(150,205,255,.85) 75%);box-shadow:0 0 6px 1px rgba(255,255,255,.75)}
${EOS_PILOT_POP_AR} .popFx > .popHang[data-on="1"]{opacity:.95;animation:eosPilotPopHang 2.4s ease-in-out var(--hd,0s) infinite alternate}
${EOS_PILOT_POP_AR} .popFx > .popHang[data-freeze="1"]{animation-play-state:paused;box-shadow:0 0 10px 3px rgba(255,250,220,.95)}
${EOS_PILOT_POP_AR} .popFreed{width:var(--fd,54px);height:var(--fd,54px);margin:calc(var(--fd,54px) / -2) 0 0 calc(var(--fd,54px) / -2);border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.34),rgba(190,238,255,.14) 62%,rgba(255,255,255,.05));box-shadow:0 0 0 1.5px rgba(160,255,220,.8),0 0 16px rgba(85,255,218,.5)}
${EOS_PILOT_POP_AR} .popFreed > img{position:absolute;inset:4%;width:92%;height:92%;object-fit:contain;pointer-events:none}
${EOS_PILOT_POP_AR} .popPuffRing{width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;box-shadow:inset 0 0 0 3px rgba(255,255,255,.85),0 0 10px rgba(255,255,255,.6)}
${EOS_PILOT_POP_AR} .popSneeze,${EOS_PILOT_POP_AR} .popTear{width:9px;height:12px;margin:-6px 0 0 -4.5px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
  background:radial-gradient(circle at 38% 30%,#fff,rgba(190,225,255,.95) 45%,rgba(140,195,255,.9))}
${EOS_PILOT_POP_AR} .popBird{width:30px;height:16px;margin:-8px 0 0 -15px}
${EOS_PILOT_POP_AR} .popBird > b{position:absolute;inset:0;display:block}
${EOS_PILOT_POP_AR} .popBird > b::before{content:"";position:absolute;left:6px;top:5px;width:18px;height:11px;border-radius:50% 60% 45% 50%;background:radial-gradient(circle at 40% 35%,#6f7fb0,#3d4a73)}
${EOS_PILOT_POP_AR} .popBird > b::after{content:"";position:absolute;left:2px;top:0;width:15px;height:9px;border-top:2.5px solid #3d4a73;border-radius:60% 60% 0 0;transform-origin:100% 100%;animation:eosPilotPopFlap .22s ease-in-out infinite alternate}
${EOS_PILOT_POP_AR} .popLoopBird{width:22px;height:10px;margin:-5px 0 0 -11px}
${EOS_PILOT_POP_AR} .popLoopBird::before,${EOS_PILOT_POP_AR} .popLoopBird::after{content:"";position:absolute;top:0;width:12px;height:8px;border-top:2px solid #3d4a73;border-radius:60% 60% 0 0}
${EOS_PILOT_POP_AR} .popLoopBird::before{left:0;transform:rotate(12deg)}
${EOS_PILOT_POP_AR} .popLoopBird::after{left:10px;transform:rotate(-12deg)}
${EOS_PILOT_POP_AR} .popBeam{height:30px;margin-top:-15px;transform-origin:0 50%;transform:rotate(var(--ba));
  background:linear-gradient(90deg,rgba(255,246,214,0),rgba(255,244,210,.55) 40%,rgba(255,255,248,.95));
  -webkit-mask:linear-gradient(180deg,transparent,#000 40%,#000 60%,transparent);mask:linear-gradient(180deg,transparent,#000 40%,#000 60%,transparent)}

@keyframes eosPilotPopRim{to{rotate:360deg}}
@keyframes eosPilotPopHang{from{translate:0 -3px}to{translate:0 3px}}
@keyframes eosPilotPopTremble{0%{translate:calc(var(--mot,1) * 1.5px) 0}50%{translate:calc(var(--mot,1) * -1.5px) calc(var(--mot,1) * .8px)}}
@keyframes eosPilotPopShove{0%,26%,100%{translate:0 0;scale:1}6%{translate:calc(var(--mot,1) * var(--shx,1) * 7px) 0;scale:calc(1 + var(--mot,1) * .05)}14%{translate:calc(var(--mot,1) * var(--shx,1) * -2px) 0;scale:1}}
@keyframes eosPilotPopSag{from{translate:0 0}to{translate:0 calc(var(--mot,1) * 4px)}}
@keyframes eosPilotPopDrip{0%,55%{opacity:0;translate:0 0}62%{opacity:calc(var(--mot,1) * .9);translate:0 0}100%{opacity:0;translate:0 60px}}
@keyframes eosPilotPopDrift{0%{translate:0 0}25%{translate:calc(var(--mot,1) * 3px) calc(var(--mot,1) * -1.5px)}50%{translate:0 0}75%{translate:calc(var(--mot,1) * -3px) calc(var(--mot,1) * 1.5px)}100%{translate:0 0}}
@keyframes eosPilotPopSmoulder{from{scale:1;opacity:clamp(0,1 - var(--calm) * 1.6,1)}to{scale:1.06}}
@keyframes eosPilotPopHeat{from{translate:-8px 0}to{translate:8px 1px}}
@keyframes eosPilotPopRain{from{translate:0 0}to{translate:-24px 128vh}}
@keyframes eosPilotPopDart{0%{translate:0 0}33%{translate:var(--mx,20px) calc(var(--my,10px) * -1)}66%{translate:calc(var(--mx,20px) * -.6) var(--my,10px)}100%{translate:calc(var(--mx,20px) * .4) calc(var(--my,10px) * .5)}}
@keyframes eosPilotPopFlicker{0%{opacity:0}30%{opacity:calc(.04 * var(--mot,1))}42%{opacity:0}70%{opacity:calc(.025 * var(--mot,1))}80%{opacity:0}}
@keyframes eosPilotPopRace{from{translate:-110% 0}to{translate:330% 0}}
@keyframes eosPilotPopFlap{from{rotate:-18deg}to{rotate:24deg}}
@media (prefers-reduced-motion: reduce){${EOS_PILOT_POP_AR} .popBub{transition:none}${EOS_PILOT_POP_AR} .pbTether{transition:none}}
${EOS_A}[data-eos-calm="1"] .eosPilotPop :is(.popBub,.pbTether),${EOS_PILOT_POP_AR}[data-eos-pilot-reduced="1"] :is(.popBub,.pbTether){transition:none}
`
eosCss("pilot-pop", EOS_PILOT_POP_CSS)
