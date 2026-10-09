// 74_pilot_crush.jsx — Pilot A · CRUSH (id 2) "The Press" · Destroy · inside role · workshop kit (spec §3.3).
// A hydraulic press on a night workshop line. Each thought rolls in on a conveyor as a jelly blob with a furious
// character inside. Tap the blob: the steel jaw slams. Each slam squeezes red-hot heat out of it (goo and steam
// squirt into the heat tray) while the blob cools from angry red toward its calm hue. Four slams and it pops back
// round and smiling and rides the wall lift up to the gallery, where it watches (and winces, cheers, leans in).
// After the last thought the embers fuse on the anvil for ONE BIG SLAM -> a glowing amber cube that cracks open
// into a small warm core, which the session's character catches and holds like a hand-warmer ("Warm Core").
// Rules: no imports; every top-level name is EosPilot*/eosPilot*/EOS_PILOT_*; never edits 00_arcade or src/eos.
// Per tap: ZERO React commits (count, plate, pips and data-eos-n are attribute writes; jaw, blob, shake and goo are
// WAAPI). One synchronous commit per WORD (the lock), plus two timer commits for the round hand-over.

const EOS_PILOT_CRUSH_PRESS = [
    { tone: [1800, 60, { type: "triangle", gain: 0.012, glide: 900 }] }, // piston hiss (at 0)
    { tone: [140, 50, { type: "sine", gain: 0.04 }] }, // clunk (+ the automatic body + click layers, CR-15)
]
const EOS_PILOT_CRUSH_IMPACT = [
    { tone: [70, 160, { type: "sine", gain: 0.09, glide: 48, at: 0.03 }], impact: true, noBody: true }, // thud
    { tone: [180, 90, { type: "triangle", gain: 0.05, glide: 140, at: 0.03 }], impact: true }, // body
    { tone: [3000, 8, { type: "square", gain: 0.02, at: 0.03 }], impact: true }, // click
    { tone: [620, 40, { type: "square", gain: 0.02, at: 0.03 }], impact: true }, // clank
]
const EOS_PILOT_CRUSH_HEAVY = [
    { tone: [55, 220, { type: "sine", gain: 0.12, at: 0.03 }], impact: true, noBody: true },
    { tone: [160, 140, { type: "triangle", gain: 0.06, at: 0.03 }], impact: true },
    { tone: [2500, 10, { type: "square", gain: 0.025, at: 0.03 }], impact: true },
    { tone: [980, 300, { type: "sine", gain: 0.02, at: 0.03 }], impact: true },
    { haptic: [18, 40, 18] },
]
// s4 splat: the goo layer + the ONE arcade "pop" per word (G4: the step reward, then onProgress right after)
const EOS_PILOT_CRUSH_GOO = [{ tone: [300, 180, { type: "sine", gain: 0.05, glide: 120, at: 0.03 }], impact: true }, { arcade: "pop" }]

const EOS_PILOT_CRUSH = {
    id: 2,
    verb: "CRUSHED",
    marker: { g: "taps", n: 4, label: "CRUSH ×4" },
    bigMarker: { g: "tap", label: "ONE BIG SLAM" },
    reacts: ["brace", "pfff", "grin", "phew", "curious"],
    slams: 4,
    heavy: [180, 320], // a tap 180-320 ms after the previous counted tap is a HEAVY hit (a bonus, never a gate)
    comp: [0.22, 0.42, 0.6], // compression for slams 1-3 (the 4th is the pancake)
    faces: ["brace", "pfff", "brace"], // the face follows the slam index (never the same face twice in a row)
    wobbles: ["left", "right", "twist"], // the wobble variant changes too (eosPilotPick) -> face+motion never repeats
    popBackMs: 350,
    transMs: 700,
    setupMs: 950,
    autoSlamMs: 8000,
    heroSeed: 1,
    // layout fractions of the S5 play box (px minimums in eosPilotCrushGeom)
    lay: {
        phone: { cx: 0.5, blob: 130, blobMaxH: 0.25, anvil: 0.73, jaw: 0.44, beam: 0.26, gallery: 0.14, fan: 44, fanF: 46, peek: 0.5, lift: 0.5, hero: 0.78 },
        desk: { cx: 0.56, blob: 170, blobMaxH: 0.3, anvil: 0.74, jaw: 0.44, beam: 0.24, gallery: 0.3, fan: 50, fanF: 58, peek: 0.6, lift: 0.55, hero: 0.8 },
    },
    // S4 cue table (spec §3.3 s1-s12). Input-driven layers fire inside the pointer handler.
    cues: {
        slam: EOS_PILOT_CRUSH_PRESS.concat(EOS_PILOT_CRUSH_IMPACT),
        slamHeavy: EOS_PILOT_CRUSH_PRESS.concat(EOS_PILOT_CRUSH_HEAVY),
        splat: EOS_PILOT_CRUSH_PRESS.concat(EOS_PILOT_CRUSH_IMPACT, EOS_PILOT_CRUSH_GOO),
        splatHeavy: EOS_PILOT_CRUSH_PRESS.concat(EOS_PILOT_CRUSH_HEAVY, EOS_PILOT_CRUSH_GOO),
        tick: [{ tone: [2800, 6, { type: "sine", gain: 0.008 }] }],
        popback: [{ tone: [220, 160, { type: "sine", gain: 0.04, glide: 660 }] }, { tone: [880, 300, { type: "sine", gain: 0.02, at: 0.06 }] }, { tone: [1320, 300, { type: "sine", gain: 0.014, at: 0.06 }] }],
        roll: [
            { tone: [200, 20, { type: "square", gain: 0.014 }] },
            { tone: [200, 20, { type: "square", gain: 0.014, at: 0.09 }] },
            { tone: [200, 20, { type: "square", gain: 0.014, at: 0.18 }] },
            { tone: [2000, 8, { type: "square", gain: 0.008 }] },
        ],
        clank: [{ tone: [400, 40, { type: "square", gain: 0.02 }] }],
        early: [{ tone: [1800, 40, { type: "triangle", gain: 0.008, glide: 1200 }] }],
        charge: [{ tone: [110, 600, { type: "sawtooth", gain: 0.02, glide: 220 }], noBody: true }, { tone: [180, 600, { type: "triangle", gain: 0.03 }] }],
        mega: [
            { tone: [55, 400, { type: "sine", gain: 0.12, at: 0.03 }], impact: true, noBody: true },
            { tone: [180, 200, { type: "triangle", gain: 0.07, at: 0.03 }], impact: true },
            { tone: [3000, 10, { type: "square", gain: 0.025, at: 0.03 }], impact: true },
            { tone: [900, 60, { type: "sine", gain: 0.03, at: 0.03 }], impact: true },
            { haptic: [18, 40, 18] },
        ],
        crackle: [{ tone: [2400, 30, { type: "square", gain: 0.012 }] }],
        warm: [
            { tone: [262, 1200, { type: "sine", gain: 0.015 }] },
            { tone: [330, 1200, { type: "sine", gain: 0.015 }] },
            { tone: [392, 1200, { type: "sine", gain: 0.015 }] },
            { tone: [1500, 700, { type: "triangle", gain: 0.004, glide: 700 }] }, // the soft steam hiss
        ],
        finaleTap: [{ tone: [1568, 50, { type: "sine", gain: 0.012 }] }],
    },
}

// Words (§3.0): rounds = chunks, N <= 6 (G4); any tail is joined on the last tag.
function eosPilotCrushWords(entries) {
    const r = eosPilotWords(entries, 6)
    let words = r && r.words && r.words.length ? r.words.slice() : []
    if (!words.length) words = ["this feeling"]
    if (words.length > 6) words = words.slice(0, 5).concat([words.slice(5).join(" ")])
    return { words, N: words.length }
}
// The cast: the word's detected emotion picks its character; words with no detected emotion rotate through the
// cast (never the hero's character, never the previous blob's) so the gallery reads as a crowd, not clones. The
// LAST blob is always the session character, the hero. Starting face follows global progress (loud -> calm).
function eosPilotCrushCast(words, sessionEmo) {
    const heroChar = EOS_EMO[sessionEmo] ? EOS_EMO[sessionEmo].char : "still"
    const N = words.length
    const out = []
    let prev = null
    words.forEach((w, i) => {
        const p0 = Math.round((i / N) * 100 + Math.min(16, 50 / N))
        if (i === N - 1) {
            out.push({ char: eosPilotCharOk(heroChar), emotion: sessionEmo, p0, hero: true })
            return
        }
        let e = null
        try {
            const d = typeof eosDetectEmotion === "function" ? eosDetectEmotion(w) : null
            const id = typeof d === "string" ? d : d && d.id
            if (id && EOS_EMO[id]) e = id
        } catch (x) {}
        let ch = e ? EOS_EMO[e].char : null
        if (!ch) {
            const list = EOS_PILOT_CHARS
            for (let k = 0; k < list.length; k++) {
                const c = list[(i * 3 + 1 + k) % list.length]
                if (c !== heroChar && c !== prev) {
                    ch = c
                    break
                }
            }
        }
        ch = eosPilotCharOk(ch)
        prev = ch
        out.push({ char: ch, emotion: e && EOS_EMO[e].char === ch ? e : null, p0, hero: false })
    })
    return out
}

// Geometry from the S5 play box (arena px). Every position is a fraction of the box with px minimums.
function eosPilotCrushGeom(b, N) {
    const phone = b.phone
    const L = phone ? EOS_PILOT_CRUSH.lay.phone : EOS_PILOT_CRUSH.lay.desk
    const P = b.play
    const W = b.w
    const top = P.top
    const bot = P.bottom
    const H = Math.max(240, bot - top)
    const y = (f) => top + H * f
    const px = Math.round(Math.min(L.blob * eosClamp(b.u, 0.85, 1.35), H * L.blobMaxH))
    const cx = Math.round(W * L.cx)
    const anvilTop = Math.round(y(L.anvil))
    const blobCy = anvilTop - px / 2
    const gap = Math.max(16, Math.round(px * 0.2))
    const jawB = Math.round(Math.min(y(L.jaw), anvilTop - px - gap))
    const jawH = Math.round(Math.max(24, px * 0.24))
    const jawW = Math.round(Math.min(phone ? W * 0.58 : W * 0.3, px * 1.9))
    const highB = Math.round(jawB - Math.max(30, H * 0.1))
    const beamH = Math.round(Math.max(20, H * 0.055))
    const beamB = Math.round(Math.max(top + beamH + 4, Math.min(y(L.beam), highB - jawH - 10)))
    const colW = Math.round(phone ? Math.max(14, W * 0.05) : Math.max(18, px * 0.14))
    const frameW = phone ? W - 16 : Math.round(Math.max(jawW + 2 * colW + 64, px * 2.5))
    const frameL = Math.round(cx - frameW / 2)
    const mouthW = phone ? Math.round(W * 0.84) : Math.round(frameW - 2 * colW - 12)
    const anvilW = Math.round(phone ? W * 0.56 : Math.max(px * 1.4, 200))
    const anvilB = Math.round(Math.min(bot - 4, anvilTop + Math.max(72, H * (phone ? 0.17 : 0.2))))
    const tagTop = Math.round(anvilTop + Math.max(8, H * 0.02))
    const tagW = Math.round(Math.min(phone ? 300 : 340, anvilW + 28, W - 24))
    const trayW = Math.round(phone ? Math.max(58, (W - anvilW) / 2 - 18) : 124)
    const trayH = Math.round(Math.max(28, H * 0.075))
    const trayX = Math.round(cx - anvilW / 2 - 8 - trayW)
    const trayY = Math.round(anvilTop + Math.max(12, H * 0.03))
    const embers = [0, 1, 2, 3, 4, 5].map((j) => ({ x: Math.round(trayX + trayW * (0.16 + 0.136 * j)), y: Math.round(trayY + trayH * 0.42) }))
    const plateW = 64
    const plateH = 62
    const plateX = phone ? Math.round(W - 10 - plateW) : Math.round(frameL + frameW - colW / 2 - plateW / 2)
    const plateY = Math.round(Math.max(beamB + 2, (beamB + (jawB - jawH)) / 2 - plateH / 2))
    // the queue on the left conveyor (phone: one peek at the edge; desktop: two waiting blobs)
    const peekD = Math.round(px * L.peek)
    const peeks = phone
        ? [{ x: Math.round(-0.08 * W + peekD / 2), y: anvilTop - peekD / 2 }]
        : [0, 1].map((q) => ({ x: Math.round(cx - anvilW / 2 - 40 - peekD / 2 - q * (peekD + 24)), y: anvilTop - peekD / 2 }))
    // the wall lift (right) and the gallery
    const liftS = L.lift
    const fan = L.fan
    const M = Math.max(0, N - 1)
    const slots = []
    const shelves = []
    let liftX
    if (phone) {
        liftX = Math.round(W - 8 - (px * liftS) / 2)
        const sy = Math.round(Math.max(top + fan / 2 + 4, y(L.gallery)))
        const pitch = 56
        const mid = (liftX - 34 + 16) / 2
        for (let j = 0; j < M; j++) slots.push({ x: Math.round(Math.min(mid, W / 2) + (j - (M - 1) / 2) * pitch), y: sy })
        shelves.push({ x0: (slots.length ? slots[0].x : liftX - 60) - fan / 2 - 12, x1: liftX + 16, y: sy + fan / 2 + 1 })
    } else {
        const c2 = Math.round(W - 14 - fan / 2)
        const cols = [c2 - 2 * (fan + 14), c2 - (fan + 14), c2]
        liftX = Math.round(cols[0] - fan / 2 - 34)
        const rows = [Math.round(y(0.5)), Math.round(y(0.26))]
        const order = [
            [0, 2],
            [0, 1],
            [0, 0],
            [1, 2],
            [1, 1],
        ]
        for (let j = 0; j < M; j++) slots.push({ x: cols[order[j][1]], y: rows[order[j][0]] })
        rows.forEach((ry) => shelves.push({ x0: cols[0] - fan / 2 - 40, x1: cols[2] + fan / 2 + 8, y: ry + fan / 2 + 1 }))
    }
    const liftY = Math.round(anvilTop - (px * liftS) / 2)
    const railTop = Math.round((slots.length ? Math.min(...slots.map((s) => s.y)) : liftY) - fan / 2 - 16)
    // the hero's watch spot (finale) and the audience row it gathers
    const hs = L.hero
    const hx = phone ? Math.round(Math.min(W * 0.8, W - 12 - (px * hs) / 2)) : Math.round(cx + mouthW / 2 + (px * hs) / 2 - 6)
    const hy = Math.round(anvilTop - (px * hs) / 2)
    const fanF = L.fanF
    const floor = []
    if (phone) {
        const fy = Math.round(Math.min(bot - fanF / 2 - 6, anvilB + fanF / 2 + 4))
        const x0 = 12 + fanF / 2
        const x1 = hx - (px * hs) / 2 - 6 - fanF / 2
        for (let j = 0; j < M; j++) floor.push({ x: Math.round(M === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * j) / (M - 1)), y: fy })
    } else for (let j = 0; j < M; j++) floor.push({ x: Math.round(cx - anvilW / 2 - 26 - fanF / 2 - j * (fanF + 10)), y: anvilTop - fanF / 2 })
    const massD = Math.round(px * 0.62)
    const cubeS = Math.round(px * 0.42)
    const vents = [
        { x: frameL + colW / 2, y: beamB - beamH },
        { x: frameL + frameW - colW / 2, y: beamB - beamH },
        { x: trayX + trayW / 2, y: trayY - 6 },
    ]
    return {
        phone,
        W,
        H,
        top,
        bot,
        px,
        cx,
        anvilTop,
        anvilB,
        anvilW,
        blobCy,
        jawB,
        jawH,
        jawW,
        highB,
        beamB,
        beamH,
        colW,
        frameL,
        frameW,
        mouthW,
        tagTop,
        tagW,
        trayX,
        trayY,
        trayW,
        trayH,
        embers,
        plateX,
        plateY,
        plateW,
        plateH,
        peekD,
        peeks,
        liftX,
        liftY,
        liftS,
        railTop,
        slots,
        shelves,
        fan,
        hs,
        hx,
        hy,
        fanF,
        floor,
        massD,
        cubeS,
        massTop: anvilTop - Math.round(massD * 0.74),
        vents,
        touch: anvilTop - px - jawB,
        pressTo: (c) => Math.round(anvilTop - px * (1 - 0.78 * c) - jawB),
    }
}

// Impact sync (S4): an impact row's impactT = the jaw animation's start frame + 30 ms (the impact keyframe).
function eosPilotCrushImpact(rows, a, inputT) {
    if (!rows || !a) return
    let st = null
    try {
        st = a.startTime != null ? a.startTime : document.timeline.currentTime
    } catch (e) {}
    if (st == null) return
    const it = Math.max(st, performance.now()) + 30 - inputT
    rows.forEach((r) => {
        if (r && r.impact) r.impactT = it
    })
}

function EosPilotCrushEngine(p) {
    const live = React.useRef(p)
    live.current = p
    const wordsKey = (p.entries || []).join("\u0001")
    const wordPx = eosClamp(Number(p.bubbleTextPx) || 16, 15, 17)
    return <EosPilotCrushInner live={live} gameId={2} wordsKey={wordsKey} reduced={!!p.reduced} userImgKey={eosPilotImgKey(p)} wordPx={wordPx} />
}

const EosPilotCrushInner = React.memo(function EosPilotCrushInner({ live, gameId, wordsKey, reduced, userImgKey, wordPx }) {
    const C = EOS_PILOT_CRUSH
    const arenaRef = React.useRef(null)
    const stageRef = React.useRef(null)
    const mouthRef = React.useRef(null)
    const jawRef = React.useRef(null)
    const edgeRef = React.useRef(null)
    const plateRef = React.useRef(null)
    const tagRef = React.useRef(null)
    const trayRef = React.useRef(null)
    const carRef = React.useRef(null)
    const fansRef = React.useRef(null)
    const dimRef = React.useRef(null)
    const massRef = React.useRef(null)
    const cubeRef = React.useRef(null)
    const finRef = React.useRef(null)
    const geomRef = React.useRef(null)
    const phaseRef = React.useRef("intro")
    const rRef = React.useRef(0)
    const actors = React.useRef({}).current
    const refFns = React.useRef({}).current
    const actorRef = (i) =>
        refFns[i] ||
        (refFns[i] = (h) => {
            if (h) actors[i] = h
            else delete actors[i]
        })
    const st = React.useRef({ n: 0, k: 0, lastT: 0, heavyHits: 0, slams: 0, jawA: null, bodyA: null, edgeA: null, shakeA: null, tickT: 0, autoT: 0, wob: { current: -1 }, miss: 0, introDone: false, quiver: null, bigJawA: null, gooRR: 0, goo: null, fanS: 0, needle: -60, log: [] }).current
    const rt = useEosPilotRuntime()
    const shell = useEosPilotShell(arenaRef, gameId)
    const box = useEosPilotBox(arenaRef)

    const W = React.useMemo(() => eosPilotCrushWords(wordsKey ? wordsKey.split("\u0001") : []), [wordsKey])
    const N = W.N
    const userImgs = React.useMemo(() => (userImgKey ? userImgKey.split("\u0001").filter(Boolean) : []), []) // snapshot at mount
    const emotion = React.useMemo(() => (typeof eosCurrentEmotion === "function" && eosCurrentEmotion()) || "auto", [])
    const cast = React.useMemo(() => eosPilotCrushCast(W.words, emotion), [W, emotion])
    const hero = cast[N - 1]
    const imgOf = (i) => (userImgs.length ? userImgs[i % userImgs.length] : null)
    const faceOf = (i, step) => imgOf(i) || eosPilotFaceSrc(cast[i].char, step, cast[i].emotion || emotion, i === N - 1 ? C.heroSeed : i)

    const [S, setS] = React.useState({ r: 0, phase: "intro", leaving: -1, landed: 0, k: 0 })
    const go = (patch) => {
        if (patch.phase) phaseRef.current = patch.phase
        if (patch.r != null) rRef.current = patch.r
        setS((s) => ({ ...s, ...patch }))
    }
    const snd = useEosPilotSound({ gameId, live, cues: C.cues, timers: rt.timers })
    const pctOf = (k) => (k >= N ? EOS_PILOT_FINAL_PCT : Math.round((k / N) * 100))
    const report = (v) => {
        try {
            live.current.onProgress(v, `${v}% ${C.verb}`)
        } catch (e) {}
    }
    React.useEffect(() => {
        report(0)
    }, [])
    const red = () => eosPilotIsReduced(arenaRef.current, live)
    const anim = (el, kf, o) => eosPilotAnim(rt.anims, el, kf, o)
    const stage = () => stageRef.current
    const posOf = (A) => {
        const el = A && A.el && A.el()
        return el ? el.firstElementChild : null
    }
    const arenaXY = (e) => {
        const a = arenaRef.current
        if (!a || !e || e.clientX == null) return null
        const A = a.getBoundingClientRect()
        return { x: e.clientX - A.left, y: e.clientY - A.top }
    }
    const fanEls = () => (fansRef.current ? Array.from(fansRef.current.querySelectorAll(":scope > .crFan")) : [])
    const sparks = (x, y, n, o) => {
        const s = stage()
        if (s) s.burst("sparks", { x, y, n, angle: -90, spread: 150, dist: 70, gravity: 50, ms: 620, spin: 140, s0: 0.9, s1: 0.4, ...(o || {}) })
    }

    // ---------------------------------------------------------------- the press: jaw, blob, world
    const jawSlam = (G, c, cycle, last) => {
        const J = jawRef.current
        if (!J) return null
        let from = "translateY(-4px)" // anticipation: the jaw twitches up 4 px
        if (st.jawA && st.jawA.playState === "running") {
            try {
                from = getComputedStyle(J).transform || from
            } catch (x) {}
            try {
                st.jawA.cancel()
            } catch (x) {}
        }
        const touch = G.touch
        const press = G.pressTo(c)
        const D = last ? 650 : Math.max(100, cycle)
        const kf = [
            { transform: from, easing: "cubic-bezier(.55,0,1,1)" }, // 0-30 the jaw drops (ease-in)
            { transform: `translateY(${touch}px)`, offset: 30 / D, easing: "cubic-bezier(.1,.6,.3,1)" }, // 30 impact
            { transform: `translateY(${press}px)`, offset: 60 / D, easing: last ? "linear" : "cubic-bezier(.2,.75,.25,1)" },
        ]
        if (last) kf.push({ transform: `translateY(${press}px)`, offset: 350 / D, easing: "cubic-bezier(.45,0,.2,1)" }) // SPLAT: hold down
        kf.push({ transform: "translateY(0px)" }) // hydraulic recoil
        st.jawA = anim(J, kf, { duration: D, easing: "linear" })
        return st.jawA
    }
    const blobSqueeze = (A, c, cycle, last, variant) => {
        const body = A.part("body")
        if (!body) return
        let from = "none"
        if (st.bodyA && st.bodyA.playState === "running") {
            try {
                from = getComputedStyle(body).transform || "none"
            } catch (x) {}
            try {
                st.bodyA.cancel()
            } catch (x) {}
        }
        const sx = 1 + 0.5 * c
        const sy = 1 - 0.78 * c
        if (last) {
            st.bodyA = anim(
                body,
                [
                    { transform: from },
                    { transform: from === "none" ? "scale(1.02,.99)" : from, offset: 30 / 350, easing: "cubic-bezier(.15,.9,.3,1)" },
                    { transform: `scale(${sx},${sy})`, offset: 70 / 350 },
                    { transform: `scale(${sx},${sy})` },
                ],
                { duration: 350, fill: "forwards" }
            )
            return
        }
        const w = variant === "left" ? "skewX(-7deg)" : variant === "right" ? "skewX(7deg)" : "rotate(5deg)"
        const Db = Math.max(320, cycle + 220)
        st.bodyA = anim(
            body,
            [
                { transform: from },
                { transform: from === "none" ? "scale(1.02,.99)" : from, offset: 30 / Db, easing: "cubic-bezier(.15,.9,.3,1)" },
                { transform: `scale(${sx},${sy})`, offset: 60 / Db, easing: "ease-out" },
                { transform: `scale(${(1 + 0.4 * c).toFixed(3)},${(1 - 0.62 * c).toFixed(3)}) ${w}`, offset: Math.min(0.55, (60 + cycle * 0.6) / Db), easing: "cubic-bezier(.3,.7,.3,1.3)" },
                { transform: `scale(${(1 - 0.06 * c).toFixed(3)},${(1 + 0.1 * c).toFixed(3)})`, offset: 0.82, easing: "ease-in-out" },
                { transform: "none" },
            ],
            { duration: Db }
        )
    }
    // red-hot goo squirts from the jelly rim; most of it lands in the heat tray (left)
    const squirt = (G, c, n, last) => {
        const s = stage()
        const fx = s && s.layer("fx")
        if (!fx) return
        if (!st.goo) st.goo = Array.from(fx.querySelectorAll('[data-pool="heat"] > i'))
        const nodes = st.goo
        if (!nodes.length) return
        const halfW = (G.px * (1 + 0.5 * c)) / 2
        const y0 = G.anvilTop - G.px * (1 - 0.78 * c) * 0.42
        for (let i = 0; i < n; i++) {
            const el = nodes[st.gooRR++ % nodes.length]
            const r1 = eosPilotRand(st.slams * 31 + i * 7)
            let x0
            let x1
            let y1
            let op = 0.95
            if (last && i % 2 === 1) {
                // the splat ring: goo flies out all around and fades
                const a = ((i / n) * 2 * Math.PI) - Math.PI / 2
                x0 = G.cx + Math.cos(a) * halfW * 0.7
                x1 = G.cx + Math.cos(a) * (halfW + 40 + 40 * r1)
                y1 = G.anvilTop - 6 + Math.min(0, Math.sin(a)) * 30
                op = 0
            } else if (i % 4 !== 3) {
                x0 = G.cx - halfW + 6
                x1 = G.trayX + G.trayW * (0.2 + 0.6 * r1)
                y1 = G.trayY + G.trayH * 0.35
            } else {
                x0 = G.cx + halfW - 6
                x1 = x0 + 30 + 50 * r1
                y1 = G.anvilTop + 2
                op = 0
            }
            const peak = Math.min(y0, y1) - (22 + 46 * r1)
            anim(
                el,
                [
                    { transform: `translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px) scale(.55)`, opacity: 1, easing: "cubic-bezier(.2,.6,.4,1)" },
                    { transform: `translate(${((x0 + x1) / 2).toFixed(1)}px,${peak.toFixed(1)}px) scale(1.1)`, opacity: 1, offset: 0.42, easing: "cubic-bezier(.6,0,.85,.5)" },
                    { transform: `translate(${x1.toFixed(1)}px,${y1.toFixed(1)}px) scale(.75)`, opacity: op },
                ],
                { duration: 420 + 160 * r1, delay: 30, easing: "linear", fill: "backwards" }
            )
        }
    }
    const shake = (px, ms) => {
        const s = stage()
        const plane = s && s.layer("plane")
        if (!plane) return
        if (st.shakeA) {
            try {
                st.shakeA.cancel()
            } catch (x) {}
        }
        st.shakeA = anim(
            plane,
            [{ translate: "0 0" }, { translate: `${px}px ${(-px * 0.4).toFixed(1)}px`, offset: 0.25 }, { translate: `${(-px * 0.8).toFixed(1)}px ${(px * 0.3).toFixed(1)}px`, offset: 0.55 }, { translate: `${(px * 0.35).toFixed(1)}px 0px`, offset: 0.8 }, { translate: "0 0" }],
            { duration: ms, delay: 30, easing: "ease-out" }
        )
    }
    // the gallery acts by motion only (CR-5): wince on every slam, a cheer hop on a heavy hit, a bump on landing
    const audience = (kind) => {
        if (red()) return
        const k = 1 / Math.max(0.2, st.fanS || 0.33)
        fanEls().forEach((f, j) => {
            const el = f.firstElementChild
            if (!el) return
            if (el.__crA && el.__crA.playState === "running") {
                if (kind === "wince") return // one gallery motion at a time per fan (animation budget)
                try {
                    el.__crA.cancel()
                } catch (x) {}
            }
            el.__crA = null
            if (kind === "wince") el.__crA = anim(el, [{ scale: "1 1" }, { scale: "1.1 .84", offset: 0.35 }, { scale: "1 1" }], { duration: 110, delay: 30 + 20 * j, easing: "ease-out" })
            if (kind === "cheer") el.__crA = anim(el, [{ translate: "0 0" }, { translate: `0 ${(-13 * k).toFixed(1)}px`, offset: 0.4, easing: "cubic-bezier(.2,.7,.3,1)" }, { translate: "0 0" }], { duration: 360, delay: 90 + 30 * j, easing: "cubic-bezier(.5,0,.6,1)" })
            if (kind === "flinch") el.__crA = anim(el, [{ scale: "1 1" }, { scale: "1.16 .78", offset: 0.3 }, { scale: "1 1" }], { duration: 200, delay: 30 + 20 * j, easing: "ease-out" })
        })
        if (kind === "cheer") {
            const G = geomRef.current
            const s = G && G.slots.length ? G.slots[Math.floor((Math.min(S.landed, G.slots.length) - 1) / 2)] : null
            if (s && S.landed > 0) sparks(s.x, s.y - G.fan * 0.6, 4, { dist: 40, ms: 520 })
        }
    }
    const flashPlate = (big) => {
        const g = plateRef.current && plateRef.current.querySelector(".crPlateGlow")
        if (g) anim(g, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: big ? 260 : 100, easing: "ease-out" })
    }
    const needle = (n) => {
        const el = plateRef.current && plateRef.current.querySelector(".crNeedle")
        if (!el) return
        const to = -60 + 30 * n
        const from = st.needle
        st.needle = to
        el.style.rotate = `${to}deg`
        if (st.needleA) {
            try {
                st.needleA.cancel()
            } catch (x) {}
        }
        if (!red()) st.needleA = anim(el, [{ rotate: `${from}deg` }, { rotate: `${to + 9}deg`, offset: 0.55 }, { rotate: `${to}deg` }], { duration: 280, easing: "cubic-bezier(.2,.8,.3,1)" })
    }
    // the jaw's edge lights amber for the heavy window (+180..+320 after a counted tap)
    const jawWindow = () => {
        const e = edgeRef.current
        if (!e) return
        if (st.edgeA) {
            try {
                st.edgeA.cancel()
            } catch (x) {}
        }
        st.edgeA = anim(e, [{ opacity: 0 }, { opacity: 0, offset: 170 / 340 }, { opacity: 1, offset: 190 / 340 }, { opacity: 1, offset: 315 / 340 }, { opacity: 0 }], { duration: 340, easing: "linear" })
    }
    const ember = (j) => {
        const tray = trayRef.current
        const el = tray && tray.querySelectorAll(".crEmber")[j]
        const G = geomRef.current
        if (!el || !G) return
        el.setAttribute("data-on", "1")
        tray.style.setProperty("--k", String(Math.min(1, (j + 1) / 6).toFixed(2)))
        if (red()) return
        const e = G.embers[j]
        const dx = G.cx - G.px * 0.4 - e.x
        const dy = G.anvilTop - G.px * 0.12 - e.y
        anim(
            el,
            [
                { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(1.7)`, opacity: 0.4, easing: "cubic-bezier(.2,.6,.4,1)" },
                { transform: `translate(${(dx * 0.45).toFixed(1)}px,${(Math.min(dy, 0) - 34).toFixed(1)}px) scale(1.25)`, opacity: 1, offset: 0.42, easing: "cubic-bezier(.6,0,.8,.5)" },
                { transform: "none", opacity: 1 },
            ],
            { duration: 540, delay: 90, easing: "linear", fill: "backwards" }
        )
    }

    // ---------------------------------------------------------------- one slam (every tap on a live blob counts)
    const slam = (e) => {
        const G = geomRef.current
        if (!G) return
        const A = actors[rRef.current]
        const t = eosPilotEvT(e).t
        const n = Math.min(C.slams, st.n + 1)
        st.n = n
        st.slams++
        const inter = st.lastT ? t - st.lastT : Infinity
        const heavy = n > 1 && inter >= C.heavy[0] && inter <= C.heavy[1]
        st.lastT = t
        if (heavy) st.heavyHits++
        const cycle = eosClamp(0.8 * inter, 90, 268)
        const last = n >= C.slams
        const c = last ? 1 : C.comp[n - 1]
        // count synchronously: attribute writes only (zero React commits per slam)
        if (plateRef.current) plateRef.current.setAttribute("data-n", `${n}/4`)
        if (tagRef.current) tagRef.current.setAttribute("data-n", String(n))
        if (mouthRef.current) mouthRef.current.setAttribute("data-eos-n", String(C.slams - n))
        if (st.tickT) {
            rt.timers.clear(st.tickT)
            st.tickT = 0
        }
        const R = red()
        // sound first (input latency); the impact layers land on the jaw's impact frame (+30 ms)
        const rows = snd.cue(last ? (heavy ? "splatHeavy" : "splat") : heavy ? "slamHeavy" : "slam", e, { action: heavy ? "heavy" : "slam", impactT: performance.now() + 30 - t })
        const jawA = R ? null : jawSlam(G, c, cycle, last)
        eosPilotCrushImpact(rows, jawA, t)
        if (A) {
            const variant = eosPilotPick(C.wobbles, st.wob, st.slams * 7 + rRef.current * 3)
            if (R) A.setCompression(c)
            else {
                if (n === 1) A.pose("raise") // braces, hands up against the jaw
                blobSqueeze(A, c, cycle, last, variant)
            }
            A.react(last ? "grin" : C.faces[n - 1], last ? 450 : Math.min(420, cycle + 220))
            A.setHeat(n / C.slams) // cools: angry red -> its calm hue
            st.log.push({ n, face: last ? "grin" : C.faces[n - 1], motion: last ? "pancake" : variant, heavy })
            if (st.log.length > 60) st.log.shift()
        }
        if (R) flashPlate(false)
        else {
            squirt(G, c, last ? 10 : heavy ? 8 : 4, last)
            shake(heavy ? 6 : 3, 120)
            audience("wince")
            if (heavy) {
                audience("cheer")
                flashPlate(true)
            }
            if (!last) jawWindow()
            if (heavy || last) {
                const s = stage()
                if (s) s.burst("steam", { x: G.cx + (st.slams % 2 ? -1 : 1) * G.px * 0.45, y: G.anvilTop - G.px * 0.3, n: 1, angle: -90, spread: 50, dist: 36, ms: 900, s0: 0.45, s1: 1.25 })
            }
        }
        needle(n)
        if (last) return wordDone(t)
        st.tickT = snd.later("tick", C.heavy[0], t, { beat: "tick" }) // the window tick (a tap cancels it)
        return undefined
    }

    // ---------------------------------------------------------------- a word is done: splat -> pop-back -> lift
    const wordDone = (t) => {
        const r = rRef.current
        const k = r + 1
        st.k = k
        st.n = 0
        st.lastT = 0
        go({ phase: k >= N ? "setup" : "trans", k }) // the one synchronous commit for this word: the lock
        ember(k - 1)
        report(pctOf(k)) // after the cue's arcade "pop" (G4)
        snd.later("popback", C.popBackMs, t, { beat: "popback" })
        rt.timers.later(() => popBack(r), C.popBackMs)
    }
    const popBack = (r) => {
        const A = actors[r]
        const R = red()
        if (st.bodyA) {
            try {
                st.bodyA.cancel()
            } catch (x) {}
            st.bodyA = null
        }
        if (A) {
            if (R) A.setCompression(0)
            else {
                A.emit("popBack", { ms: 440 })
                A.pose("rest")
            }
            A.react("phew", 400)
            A.setStep(2) // then calm
        }
        if (plateRef.current) plateRef.current.setAttribute("data-n", "0/4")
        needle(0)
        if (r + 1 >= N) return finaleSetup()
        snd.later("roll", 0, performance.now(), { beat: "roll" })
        go({ r: r + 1, leaving: r, phase: "trans" })
        rt.timers.later(() => go({ leaving: -1, landed: r + 1, phase: "play" }), C.transMs - C.popBackMs)
        return undefined
    }
    const belt = () => {
        const a = arenaRef.current
        if (!a || red()) return
        a.querySelectorAll(".crBelt > i").forEach((el) => anim(el, [{ transform: "translateX(0)" }, { transform: "translateX(-56px)" }], { duration: 380, easing: "cubic-bezier(.3,.1,.3,1)" }))
    }
    const rollIn = (i, G, first) => {
        const A = actors[i]
        const pos = posOf(A)
        if (!pos) return
        if (red()) {
            anim(A.el(), [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" })
            return
        }
        const p = G.peeks[0]
        const from = first ? { x: -G.cx - G.px, y: 0, s: 1 } : { x: p.x - G.cx, y: p.y - G.blobCy, s: G.peekD / G.px }
        const d = first ? 520 : 360
        const delay = first ? 200 : 0
        anim(
            pos,
            [
                { transform: `translate(${from.x}px,${from.y}px) scale(${from.s.toFixed(3)}) rotate(-7deg)` },
                { transform: `translate(${(from.x * 0.08).toFixed(1)}px,0px) scale(.98) rotate(-2deg)`, offset: 0.78 },
                { transform: "none" },
            ],
            { duration: d, delay, easing: "cubic-bezier(.25,.8,.35,1)", fill: "backwards" }
        )
        const body = A.part("body")
        if (body) anim(body, [{ transform: "none" }, { transform: "scale(1.13,.86)", offset: 0.35 }, { transform: "scale(.96,1.05)", offset: 0.7 }, { transform: "none" }], { duration: 300, delay: delay + d * 0.86, easing: "ease-out" }) // squash on stop
    }
    const rollOut = (i, G) => {
        const A = actors[i]
        const pos = posOf(A)
        if (!pos) return
        if (red()) {
            anim(A.el(), [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" })
            return
        }
        const dx = G.liftX - G.cx
        const dy = G.liftY - G.blobCy
        const end = `translate(${dx}px,${dy}px) scale(${G.liftS})`
        pos.style.transform = end
        anim(pos, [{ transform: "none" }, { transform: `translate(${(dx * 0.55).toFixed(1)}px,${(dy * 0.4 - 6).toFixed(1)}px) scale(${((1 + G.liftS) / 2).toFixed(3)}) rotate(7deg)`, offset: 0.5 }, { transform: end }], { duration: 340, easing: "cubic-bezier(.4,.1,.4,1)" })
    }
    const ride = (j) => {
        const G = geomRef.current
        const el = fansRef.current && fansRef.current.querySelector(`:scope > .crFan[data-j="${j}"]`)
        if (!G || !el || !G.slots[j]) return
        const s = G.slots[j]
        const s0 = G.fan / G.px
        st.fanS = s0
        if (red()) {
            anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" })
            return
        }
        const dx = G.liftX - s.x
        const dyB = G.liftY - s.y
        anim(
            el,
            [
                { transform: `translate(${dx}px,${dyB}px) scale(${G.liftS})`, easing: "cubic-bezier(.45,0,.3,1)" },
                { transform: `translate(${dx}px,0px) scale(${Math.max(s0, G.liftS * 0.72).toFixed(3)})`, offset: 0.6, easing: "cubic-bezier(.3,.6,.35,1.25)" },
                { transform: `scale(${s0.toFixed(4)})` },
            ],
            { duration: 460, easing: "linear" }
        )
        const car = carRef.current
        if (car) anim(car, [{ transform: "translateY(0px)" }, { transform: `translateY(${(s.y + G.fan / 2 - (G.liftY + (G.px * G.liftS) / 2)).toFixed(1)}px)`, offset: 0.6 }, { transform: "translateY(0px)" }], { duration: 900, easing: "ease-in-out" })
        rt.timers.later(() => {
            const nb = fanEls()[j - 1]
            const b = nb && nb.firstElementChild
            if (b && !red()) anim(b, [{ rotate: "0deg" }, { rotate: "-9deg", offset: 0.3 }, { rotate: "4deg", offset: 0.65 }, { rotate: "0deg" }], { duration: 380, easing: "ease-out" }) // bump
        }, 430)
    }

    // ---------------------------------------------------------------- intro + round hand-over (layout effects)
    React.useLayoutEffect(() => {
        const G = geomRef.current
        if (!G || st.introDone) return
        st.introDone = true
        const R = red()
        const dim = dimRef.current
        if (dim && !R) anim(dim, [{ opacity: 0.85 }, { opacity: 0.15, offset: 0.25 }, { opacity: 0.6, offset: 0.4 }, { opacity: 0.05, offset: 0.7 }, { opacity: 0 }], { duration: 420, easing: "steps(5,end)" }) // the lamp flickers on
        rollIn(0, G, true)
        snd.later("roll", 200, performance.now(), { beat: "roll" })
        rt.timers.later(() => go({ phase: "play" }), C.transMs)
    }, [box ? 1 : 0])
    React.useLayoutEffect(() => {
        const G = geomRef.current
        if (!G || S.leaving < 0) return
        rollIn(S.r, G, false)
        rollOut(S.leaving, G)
        belt()
    }, [S.r])
    React.useLayoutEffect(() => {
        if (S.landed > 0) ride(S.landed - 1)
    }, [S.landed])

    // ---------------------------------------------------------------- misses and early taps
    const early = (e) => {
        snd.cue("early", e, { action: "early" })
        const J = jawRef.current
        if (J && !red()) anim(J, [{ translate: "0 0" }, { translate: "0 -3px", offset: 0.4 }, { translate: "0 0" }], { duration: 140, easing: "ease-out" })
        const G = geomRef.current
        if (G && (phaseRef.current === "setup" || phaseRef.current === "setup2")) sparks(G.cx, G.anvilTop - G.massD * 0.5, 2, { dist: 40 })
    }
    const miss = (e) => {
        const G = geomRef.current
        const A = actors[rRef.current]
        snd.cue("clank", e, { action: "miss" })
        st.miss++
        const p = arenaXY(e)
        if (!G || !A || !p) return
        const ox = phaseRef.current === "big" ? G.hx : G.cx
        A.emit("miss", { dir: [p.x - ox, 0], variant: "tilt" })
        A.react("curious", 450)
    }

    // ---------------------------------------------------------------- finale "Warm Core"
    const finaleSetup = () => {
        const G = geomRef.current
        if (!G) return
        const R = red()
        go({ phase: "setup2" }) // the hero's name shows; the last tag drops away
        const A = actors[N - 1]
        if (A) {
            A.prepare("win")
            const pos = posOf(A)
            if (pos) {
                const dx = G.hx - G.cx
                const dy = G.hy - G.blobCy
                const end = `translate(${dx}px,${dy}px) scale(${G.hs})`
                pos.style.transform = end
                if (!R)
                    anim(
                        pos,
                        [
                            { transform: "none", easing: "cubic-bezier(.2,.7,.4,1)" },
                            { transform: `translate(${(dx * 0.5).toFixed(1)}px,${(Math.min(0, dy) - G.px * 0.5).toFixed(1)}px) scale(${((1 + G.hs) / 2).toFixed(3)}) rotate(8deg)`, offset: 0.45, easing: "cubic-bezier(.6,0,.85,.5)" },
                            { transform: end },
                        ],
                        { duration: 480, delay: 140, easing: "linear", fill: "backwards" }
                    )
            }
            rt.timers.later(() => {
                const h = actors[N - 1]
                if (h) h.look(mouthRef.current)
            }, 700)
        }
        // the heat tray's embers roll out onto the anvil and fuse into one red-hot mass
        const tray = trayRef.current
        const lit = tray ? Array.from(tray.querySelectorAll('.crEmber[data-on="1"]')) : []
        lit.forEach((el, j) => {
            const e = G.embers[j]
            const dx = G.cx - e.x
            const dy = G.anvilTop - G.massD * 0.36 - e.y
            const end = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(.5)`
            el.style.transform = end
            el.style.opacity = "0"
            if (!R) anim(el, [{ transform: "none", opacity: 1 }, { transform: `translate(${(dx * 0.5).toFixed(1)}px,${(Math.min(0, dy) - 30).toFixed(1)}px) scale(1.15)`, opacity: 1, offset: 0.5 }, { transform: end, opacity: 0.3 }], { duration: 400, delay: 60 + 55 * j, easing: "cubic-bezier(.4,.1,.5,1)", fill: "backwards" })
        })
        if (tray) tray.style.setProperty("--k", "0")
        const mass = massRef.current
        if (mass) {
            mass.setAttribute("data-on", "1")
            if (!R) anim(mass, [{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "scale(1.14)", offset: 0.7 }, { opacity: 1, transform: "none" }], { duration: 360, delay: 380, easing: "cubic-bezier(.2,.8,.3,1.2)", fill: "backwards" })
        }
        // the gallery hops down to watch (hop arcs, staggered 50)
        const s1 = G.fanF / G.px
        fanEls().forEach((el, j) => {
            const s = G.slots[j]
            const f = G.floor[j]
            if (!s || !f) return
            const s0 = G.fan / G.px
            const end = `translate(${f.x - s.x}px,${f.y - s.y}px) scale(${s1.toFixed(4)})`
            el.style.transform = end
            if (!R)
                anim(
                    el,
                    [
                        { transform: `scale(${s0.toFixed(4)})`, easing: "cubic-bezier(.2,.7,.4,1)" },
                        { transform: `translate(${((f.x - s.x) * 0.3).toFixed(1)}px,-34px) scale(${((s0 + s1) / 2).toFixed(4)})`, offset: 0.3, easing: "cubic-bezier(.55,0,.9,.6)" },
                        { transform: end },
                    ],
                    { duration: 520, delay: 120 + 50 * j, easing: "linear", fill: "backwards" }
                )
        })
        st.fanS = s1
        // the lights dim; the jaw rises extra high and quivers (the anticipation hold)
        const dim = dimRef.current
        if (dim) {
            dim.style.opacity = "0.34"
            if (!R) anim(dim, [{ opacity: 0 }, { opacity: 0.34 }], { duration: 500, easing: "ease-in-out" })
        }
        const J = jawRef.current
        if (J) {
            const d = G.highB - G.jawB
            if (st.jawA) {
                try {
                    st.jawA.cancel()
                } catch (x) {}
            }
            J.style.transform = `translateY(${d}px)`
            if (!R) {
                st.jawA = anim(J, [{ transform: "translateY(0px)" }, { transform: `translateY(${d - 7}px)`, offset: 0.78 }, { transform: `translateY(${d}px)` }], { duration: 520, delay: 100, easing: "cubic-bezier(.4,0,.25,1)", fill: "backwards" })
                st.quiver = anim(J, [{ translate: "0 0" }, { translate: "0 -1.5px" }], { duration: 70, delay: 640, iterations: Infinity, direction: "alternate", easing: "ease-in-out" })
            }
        }
        snd.later("charge", 0, performance.now(), { beat: "charge" })
        rt.timers.later(() => {
            go({ phase: "big" })
            st.autoT = rt.timers.later(() => bigSlam(null, true), C.autoSlamMs) // never stalls
        }, C.setupMs - C.popBackMs)
    }
    const bigSlam = (e, auto) => {
        if (phaseRef.current !== "big") return
        if (st.autoT) {
            rt.timers.clear(st.autoT)
            st.autoT = 0
        }
        const ev = e || { timeStamp: performance.now(), type: "auto" }
        st.auto = !!auto
        const t = eosPilotEvT(ev).t
        const rows = snd.cue("mega", ev, { action: auto ? "auto" : "bigslam", impactT: performance.now() + 30 - t })
        go({ phase: "finale" })
        fin.start(ev) // T0; the climax beat runs synchronously (it creates the jaw animation)
        eosPilotCrushImpact(rows, st.bigJawA, t)
    }
    const heroHands = () => {
        const A = actors[N - 1]
        const ball = A && A.part("ball")
        const a = arenaRef.current
        const G = geomRef.current
        if (!ball || !a) return G ? { x: G.hx, y: G.hy + G.px * G.hs * 0.18 } : { x: 0, y: 0 }
        const b = ball.getBoundingClientRect()
        const A0 = a.getBoundingClientRect()
        return { x: b.left - A0.left + b.width / 2, y: b.top - A0.top + b.height * 0.7 }
    }
    const fin = useEosPilotFinale({
        arenaRef,
        live,
        gameId,
        bonus: 250 + st.heavyHits * 5,
        label: `100% ${C.verb}`,
        kit: "workshop",
        heroFace: () => faceOf(N - 1, 3),
        anims: rt.anims,
        timers: rt.timers,
        handoffMs: EOS_PILOT_HANDOFF_MS,
        onHandoff: () => {
            const A = actors[N - 1]
            if (A) A.setStep(3) // win face, eyes half-closed over the warm core
        },
        onFinaleTap: (ev) => {
            const p = arenaXY(ev)
            if (p) sparks(p.x, p.y, 3, { dist: 44, ms: 480 })
            snd.cue("finaleTap", ev, { action: "finale-tap" })
        },
        beats: [
            {
                // 0-300 climax: the player's big slam. Impact at +30: shake, 12 sparks, a lamp flicker; the mass
                // is crushed into a small amber cube. The audience flinches, then cheers.
                id: "climax",
                at: 0,
                run: (c) => {
                    const G = geomRef.current
                    const J = jawRef.current
                    const mass = massRef.current
                    const cube = cubeRef.current
                    if (st.quiver) {
                        try {
                            st.quiver.cancel()
                        } catch (x) {}
                        st.quiver = null
                    }
                    if (!G) return
                    if (mass) mass.style.opacity = "0"
                    if (cube) cube.setAttribute("data-on", "1")
                    if (c.reduced) {
                        if (mass) c.anim(mass, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })
                        if (cube) c.anim(cube, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
                        return
                    }
                    const hi = G.highB - G.jawB
                    const hit = G.massTop - G.jawB + Math.round(G.massD * 0.3)
                    if (J) {
                        if (st.jawA) {
                            try {
                                st.jawA.cancel()
                            } catch (x) {}
                        }
                        J.style.transform = `translateY(${hit}px)`
                        st.bigJawA = c.anim(J, [{ transform: `translateY(${hi - 10}px)`, easing: "cubic-bezier(.6,0,1,1)" }, { transform: `translateY(${hit + 4}px)`, offset: 30 / 300, easing: "cubic-bezier(.2,.8,.3,1)" }, { transform: `translateY(${hit}px)` }], { duration: 300, easing: "linear" })
                    }
                    if (mass) c.anim(mass, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(1.35,.35)" }], { duration: 90, delay: 30, fill: "backwards" })
                    if (cube) c.anim(cube, [{ opacity: 0, transform: "scale(1.5,.4)" }, { opacity: 1, transform: "scale(1.5,.4)", offset: 0.06 }, { transform: "scale(.9,1.1)", offset: 0.55 }, { opacity: 1, transform: "none" }], { duration: 420, delay: 30, easing: "cubic-bezier(.2,.8,.3,1.2)", fill: "backwards" })
                    shake(8, 160)
                    sparks(G.cx, G.anvilTop - G.cubeS * 0.6, 12, { spread: 220, dist: 120, gravity: 70, ms: 760 })
                    const dim = dimRef.current
                    if (dim) {
                        dim.style.opacity = "0.26"
                        c.anim(dim, [{ opacity: 0.34 }, { opacity: 0.7, offset: 0.15 }, { opacity: 0.08, offset: 0.4 }, { opacity: 0.5, offset: 0.62 }, { opacity: 0.26 }], { duration: 320, delay: 30, easing: "steps(4,end)" })
                    }
                    const fl = finRef.current && finRef.current.querySelector(".crFlash")
                    if (fl) c.anim(fl, [{ opacity: 0 }, { opacity: 0.75, offset: 0.12 }, { opacity: 0 }], { duration: 420, delay: 30, easing: "ease-out", fill: "backwards" })
                    audience("flinch")
                    c.later(() => audience("cheer"), 250)
                    const A = actors[N - 1]
                    if (A) A.react("brace", 300)
                },
            },
            {
                // 300-1100 transformation: the jaw lifts; the cube trembles; 3 cracks light in turn (500/800/1100)
                // with light leaking through; the hero raises its cupped hands.
                id: "transform",
                at: 300,
                run: (c) => {
                    const G = geomRef.current
                    const J = jawRef.current
                    const cube = cubeRef.current
                    if (!G) return
                    const cracks = cube ? Array.from(cube.querySelectorAll(".crCrack")) : []
                    const glow = cube && cube.querySelector(".crCubeGlow")
                    if (J && !c.reduced) {
                        const hit = G.massTop - G.jawB + Math.round(G.massD * 0.3)
                        const up = G.highB - G.jawB - 14
                        J.style.transform = `translateY(${up}px)`
                        c.anim(J, [{ transform: `translateY(${hit}px)` }, { transform: `translateY(${up}px)` }], { duration: 640, easing: "cubic-bezier(.3,.1,.2,1)" })
                    }
                    if (cube && !c.reduced) c.anim(cube, [{ rotate: "0deg" }, { rotate: "-2.5deg" }, { rotate: "2.5deg" }, { rotate: "-1.5deg" }, { rotate: "0deg" }], { duration: 250, iterations: 4, easing: "ease-in-out" })
                    const at = c.reduced ? [0, 120, 240] : [200, 500, 800]
                    cracks.forEach((el, i) => {
                        el.style.opacity = "1"
                        c.anim(el, [{ opacity: 0, transform: "scale(.5)" }, { opacity: 1, transform: "none" }], { duration: c.reduced ? 200 : 130, delay: at[i], easing: "ease-out", fill: "backwards" })
                    })
                    if (glow) {
                        glow.style.opacity = "1"
                        c.anim(glow, [{ opacity: 0.15 }, { opacity: 0.15, offset: at[0] / 1000 }, { opacity: 0.45, offset: at[0] / 1000 + 0.02 }, { opacity: 0.45, offset: at[1] / 1000 }, { opacity: 0.75, offset: at[1] / 1000 + 0.02 }, { opacity: 0.75, offset: at[2] / 1000 }, { opacity: 1, offset: at[2] / 1000 + 0.02 }, { opacity: 1 }], { duration: 1000, easing: "linear" })
                    }
                    const A = actors[N - 1]
                    if (A) {
                        A.pose("cup")
                        A.look(cube)
                        A.react("curious", 420)
                    }
                    if (!c.skipped) [500, 800, 1100].forEach((ms, i) => snd.later("crackle", ms, c.t0, { beat: `crackle${i + 1}` }))
                },
            },
            {
                // 1300 PEAK (with the wrapper's win x 3): the cube bursts; warm light rays flood the shop; the small
                // warm core rises and floats down into the hero's cupped hands (1300-1900).
                id: "peak",
                at: 1300,
                run: (c) => {
                    const G = geomRef.current
                    const cube = cubeRef.current
                    const F = finRef.current
                    if (!G || !F) return
                    const rays = F.querySelector(".crRays")
                    const core = F.querySelector(".crCore")
                    const glow = F.querySelector(".crGlow")
                    const fl = F.querySelector(".crFlash")
                    const h = heroHands()
                    const cx = G.cx
                    const cy = G.anvilTop - G.cubeS / 2
                    if (cube) {
                        cube.style.opacity = "0"
                        c.anim(cube, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(1.7)" }], { duration: c.reduced ? 300 : 240, easing: "ease-out" })
                    }
                    if (rays) {
                        rays.style.opacity = "1"
                        rays.style.transform = "scale(1.6)"
                        if (!c.reduced) {
                            c.anim(rays, [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1.6)" }], { duration: 700, easing: "cubic-bezier(.12,.8,.3,1)" })
                            anim(rays.firstElementChild, [{ rotate: "0deg" }, { rotate: "360deg" }], { duration: 48000, iterations: Infinity, easing: "linear" })
                        } else c.anim(rays, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 })
                    }
                    if (core) {
                        const end = `translate(${h.x.toFixed(1)}px,${h.y.toFixed(1)}px)`
                        core.style.transform = end
                        core.style.opacity = "1"
                        if (!c.reduced)
                            c.anim(
                                core,
                                [
                                    { transform: `translate(${cx}px,${cy}px) scale(.3)`, opacity: 0, easing: "cubic-bezier(.2,.7,.4,1)" },
                                    { transform: `translate(${cx}px,${(cy - G.px * 0.6).toFixed(1)}px) scale(1.25)`, opacity: 1, offset: 0.35, easing: "cubic-bezier(.45,0,.4,1)" },
                                    { transform: `translate(${h.x.toFixed(1)}px,${(h.y - 18).toFixed(1)}px) scale(1.05)`, offset: 0.82, easing: "cubic-bezier(.3,.6,.4,1)" },
                                    { transform: end },
                                ],
                                { duration: 620, easing: "linear" }
                            )
                        else c.anim(core, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
                    }
                    if (glow) {
                        glow.style.transform = `translate(${h.x.toFixed(1)}px,${h.y.toFixed(1)}px)`
                        glow.style.opacity = "1"
                        c.anim(glow, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: c.reduced ? 0 : 400, easing: "ease-out", fill: "backwards" })
                    }
                    if (fl && !c.reduced) c.anim(fl, [{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0 }], { duration: 560, easing: "ease-out" })
                },
            },
            {
                // 1300-2600 afterglow, CRUSH's own celebration: the hero cradles the core like a hand-warmer; the core
                // paints a warm under-light on every face; the audience leans in; 3 steam vents give relief puffs.
                id: "afterglow",
                at: 1300,
                run: (c) => {
                    const G = geomRef.current
                    if (!G) return
                    const A = actors[N - 1]
                    if (A) {
                        A.setUnder(0.6)
                        c.later(() => A.look("camera"), 500)
                    }
                    if (fansRef.current) fansRef.current.style.setProperty("--under", "0.6")
                    fanEls().forEach((el, j) => {
                        const b = el.firstElementChild
                        const f = G.floor[j]
                        if (!b || !f) return
                        const dir = G.hx >= f.x ? 1 : -1
                        b.style.rotate = `${6 * dir}deg`
                        if (!c.reduced) c.anim(b, [{ rotate: "0deg" }, { rotate: `${6 * dir}deg` }], { duration: 520, delay: 200 + 80 * j, easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards" })
                    })
                    if (!c.reduced)
                        [200, 520, 840].forEach((ms, i) =>
                            c.later(() => {
                                const s = stage()
                                const v = G.vents[i]
                                if (s && v) s.burst("steam", { x: v.x, y: v.y, n: 1, angle: -90, spread: 24, dist: 46, ms: 1500, s0: 0.5, s1: 1.7 })
                            }, ms)
                        )
                    const s = stage()
                    if (s) s.grade(1, c.reduced ? 500 : 1200)
                    const dim = dimRef.current
                    if (dim) {
                        dim.style.opacity = "0"
                        c.anim(dim, [{ opacity: 0.26 }, { opacity: 0 }], { duration: c.reduced ? 400 : 900, delay: c.reduced ? 0 : 200, easing: "ease-out", fill: "backwards" })
                    }
                    if (!c.skipped) snd.later("warm", 1700, c.t0, { beat: "warm" })
                },
            },
            {
                id: "tableau",
                at: 2600,
                run: () => {},
            },
        ],
    })

    // ---------------------------------------------------------------- input routing
    const gest = useEosPilotGesture({
        kind: "tap",
        anims: rt.anims,
        onDown: (e) => {
            shell.playInput()
            snd.warm()
            const ph = phaseRef.current
            if (ph === "play") return slam(e)
            if (ph === "big") return bigSlam(e, false)
            return early(e)
        },
    })
    const near = useEosPilotNearHit(arenaRef, () => [mouthRef.current], 28)
    const onArenaDown = (e) => {
        snd.warm()
        const t = e.target
        if (t && t.closest && t.closest(".eosPilotHit")) return // the hit's own handler already ran
        if (fin.phase.current === "finale") return fin.tap(e)
        if (fin.phase.current !== "play") return
        shell.playInput()
        const ph = phaseRef.current
        if (ph !== "play" && ph !== "big") return early(e)
        const hit = near(e)
        if (hit) return gest.route(e, hit.el)
        miss(e)
    }
    React.useEffect(() => {
        try {
            eosExpose("pilotCrush", {
                state: () => ({ t0: fin.t0(), origin: performance.timeOrigin, r: rRef.current, k: st.k, n: st.n, N, phase: phaseRef.current, fin: fin.phase.current, heavyHits: st.heavyHits, slams: st.slams, acts: st.log.slice() }),
            })
        } catch (e) {}
    }, [])

    // ---------------------------------------------------------------- render
    const G = box ? eosPilotCrushGeom(box, N) : null
    geomRef.current = G
    const ph = S.phase
    const isLive = ph === "play" || ph === "big"
    const marker = ph === "play" ? C.marker : ph === "big" ? C.bigMarker : null
    const finale = ph === "setup2" || ph === "big" || ph === "finale"
    const rounds = [S.leaving, S.r].filter((i, j, a) => i >= 0 && i < N && a.indexOf(i) === j)
    const peekIdx = G ? (G.phone ? [S.r + 1] : [S.r + 1, S.r + 2]).filter((i) => i < N) : []
    const fans = []
    for (let j = 0; j < Math.min(S.landed, N - 1); j++) fans.push(j)
    const cool = eosPilotFaceStep(pctOf(S.k))
    return (
        <div
            ref={arenaRef}
            className="arena eosPilotArena eosPilotCrush"
            data-eos-pilot-kit="workshop"
            data-eos-pilot-reduced={reduced ? "1" : undefined}
            data-cool={cool}
            onPointerDown={onArenaDown}
            style={{ "--eos-pilot-word-px": `${wordPx}px` }}
        >
            {G ? (
                <EosPilotStage ref={stageRef} kit="workshop" calm={Math.min(1, S.k / N)} hide={G.phone ? ["press", "anvil", "shelf", "tray", "conveyor", "gauge"] : ["press", "anvil", "shelf", "tray", "conveyor"]} planeClassName={isLive ? "crPlane" : "crPlane isLocked"}>
                    <div className="crBack" aria-hidden="true">
                        <i className="crRail" style={{ left: `${G.liftX - 4}px`, top: `${G.railTop}px`, height: `${G.anvilTop - G.railTop}px` }} />
                        <i className="crCar" ref={carRef} style={{ left: `${G.liftX - 26}px`, top: `${G.liftY + (G.px * G.liftS) / 2 - 3}px` }} />
                        {G.shelves.map((s, i) => (
                            <i key={`s${i}`} className="crShelf" style={{ left: `${s.x0}px`, top: `${s.y}px`, width: `${s.x1 - s.x0}px` }} />
                        ))}
                        <i className="crCol" style={{ left: `${G.frameL}px`, top: `${G.beamB - G.beamH}px`, width: `${G.colW}px`, height: `${G.anvilB - G.beamB + G.beamH}px` }} />
                        <i className="crCol r" style={{ left: `${G.frameL + G.frameW - G.colW}px`, top: `${G.beamB - G.beamH}px`, width: `${G.colW}px`, height: `${G.anvilB - G.beamB + G.beamH}px` }} />
                        <i className="crBelt" style={{ left: "0px", top: `${G.anvilTop - 4}px`, width: `${Math.max(0, G.cx - G.anvilW / 2)}px` }}>
                            <i />
                        </i>
                        <i className="crBelt" style={{ left: `${G.cx + G.anvilW / 2}px`, top: `${G.anvilTop - 4}px`, width: `${Math.max(0, G.W - G.cx - G.anvilW / 2)}px` }}>
                            <i />
                        </i>
                        <i className="crAnvil" style={{ left: `${G.cx - G.anvilW / 2}px`, top: `${G.anvilTop}px`, width: `${G.anvilW}px`, height: `${G.anvilB - G.anvilTop}px` }} />
                        <div className="crTray" ref={trayRef} style={{ left: `${G.trayX}px`, top: `${G.trayY}px`, width: `${G.trayW}px`, height: `${G.trayH}px` }}>
                            {[0, 1, 2, 3, 4, 5].map((j) => (
                                <i key={j} className="crEmber" style={{ left: `${G.embers[j].x - G.trayX}px`, top: `${G.embers[j].y - G.trayY}px` }} />
                            ))}
                        </div>
                    </div>
                    <i className="crDim" ref={dimRef} aria-hidden="true" />
                    <div className="crBlobs">
                        {peekIdx.map((i, q) => {
                            const p = G.peeks[q]
                            const img = imgOf(i)
                            return (
                                <i key={`p${i}`} className="crPeek" data-user={img ? "1" : undefined} style={{ width: `${G.peekD}px`, height: `${G.peekD}px`, transform: `translate(${(p.x - G.peekD / 2).toFixed(1)}px,${(p.y - G.peekD / 2).toFixed(1)}px)`, "--a-hue": EOS_PILOT_CHAR_HUE[cast[i].char] }}>
                                    <img src={faceOf(i, eosPilotFaceStep(cast[i].p0))} alt="" draggable={false} decoding="async" />
                                </i>
                            )
                        })}
                        {rounds.map((i) => (
                            <EosPilotActor
                                key={`b${i}`}
                                ref={actorRef(i)}
                                role="inside"
                                char={cast[i].char}
                                emotion={cast[i].emotion || undefined}
                                image={imgOf(i)}
                                size={G.px}
                                u={1}
                                progress={cast[i].p0}
                                reacts={C.reacts}
                                label={i === N - 1 && finale ? EOS_CHAR_NAMES[cast[i].char] : undefined}
                                showLabel={true}
                                seed={i === N - 1 ? C.heroSeed : i}
                                className="crBlob"
                                style={{ left: `${G.cx}px`, top: `${G.blobCy}px` }}
                            />
                        ))}
                        {S.r === 0 && (ph === "intro" || ph === "play") ? <i className="crName" data-n={EOS_CHAR_NAMES[cast[0].char]} style={{ left: `${G.cx}px`, top: `${G.anvilTop - G.px - 13}px` }} /> : null}
                    </div>
                    <div className="crFans" ref={fansRef}>
                        {fans.map((j) => {
                            const s = G.slots[j]
                            const img = imgOf(j)
                            return (
                                <div key={`f${j}`} className="crFan" data-j={j} data-user={img ? "1" : undefined} style={{ left: `${s.x - G.px / 2}px`, top: `${s.y - G.px / 2}px`, width: `${G.px}px`, height: `${G.px}px`, transform: `scale(${(G.fan / G.px).toFixed(4)})`, "--a-hue": EOS_PILOT_CHAR_HUE[cast[j].char] }}>
                                    <i className="crFanBody">
                                        <img src={faceOf(j, 2)} alt="" draggable={false} decoding="async" />
                                    </i>
                                </div>
                            )
                        })}
                    </div>
                    <div className="crFront" aria-hidden="true">
                        <div className="crPiston" style={{ left: `${G.cx - G.jawW / 2 - 8}px`, top: `${G.beamB}px`, width: `${G.jawW + 16}px`, height: `${G.anvilTop - G.beamB + 6}px` }}>
                            <div className="crJaw" ref={jawRef} style={{ left: "8px", top: `${G.jawB - G.jawH - G.beamB}px`, width: `${G.jawW}px`, height: `${G.jawH}px` }}>
                                <i className="crRod" />
                                <i className="crJawEdge" ref={edgeRef} />
                            </div>
                        </div>
                        <i className="crBeam" style={{ left: `${G.frameL - 6}px`, top: `${G.beamB - G.beamH}px`, width: `${G.frameW + 12}px`, height: `${G.beamH}px` }} />
                        <div className="crPlate" ref={plateRef} data-n="0/4" style={{ left: `${G.plateX}px`, top: `${G.plateY}px`, width: `${G.plateW}px`, height: `${G.plateH}px` }}>
                            <i className="crDial">
                                <i className="crNeedle" />
                            </i>
                            <i className="crPlateGlow" />
                        </div>
                        <i className="crLeak" style={{ left: `${G.frameL + G.colW + 4}px`, top: `${G.beamB - G.beamH - 6}px` }} />
                        <i className="crLeak b" style={{ left: `${G.frameL + G.frameW - G.colW - 30}px`, top: `${G.beamB - G.beamH - 6}px` }} />
                    </div>
                    {S.r < N ? (
                        <div key={`t${S.r}`} ref={tagRef} className={`crTag${finale ? " isGone" : ""}`} data-n="0" style={{ left: `${G.cx}px`, top: `${G.tagTop}px`, maxWidth: `${G.tagW}px` }} {...EOS_PRIVATE_ATTRS}>
                            <EosWord text={W.words[S.r]} className="eosPilotWord" />
                            <span className="crPips" aria-hidden="true">
                                <i />
                                <i />
                                <i />
                                <i />
                            </span>
                        </div>
                    ) : null}
                    <button
                        ref={mouthRef}
                        className="eosPilotHit crMouth"
                        disabled={!isLive}
                        aria-label={ph === "big" ? "One big slam" : "Slam the blob"}
                        style={{ left: `${G.cx - G.mouthW / 2}px`, top: `${G.jawB}px`, width: `${G.mouthW}px`, height: `${G.anvilTop - G.jawB}px` }}
                        {...gest.bind("mouth")}
                        {...eosPilotMarker(marker, !!marker)}
                    >
                        <i className="crMass" ref={massRef} data-eos-avoid="1" data-eos-char={hero.char} style={{ width: `${G.massD}px`, height: `${Math.round(G.massD * 0.74)}px` }} />
                        <i className="crCube" ref={cubeRef} data-eos-avoid="1" data-eos-char={hero.char} style={{ width: `${G.cubeS}px`, height: `${G.cubeS}px` }}>
                            <i className="crCubeGlow" />
                            <i className="crCrack a" />
                            <i className="crCrack b" />
                            <i className="crCrack c" />
                        </i>
                    </button>
                    <div className="crFinale" ref={finRef} aria-hidden="true">
                        <i className="crRays" style={{ left: `${G.cx}px`, top: `${G.anvilTop - G.cubeS / 2}px`, "--rs": `${Math.round(Math.max(G.W, G.H) * 0.9)}px` }}>
                            <i />
                        </i>
                        <i className="crGlow" style={{ "--gs": `${Math.round(G.px * 1.5)}px` }} />
                        <i className="crCore" data-eos-avoid="1" data-eos-char={hero.char} style={{ "--cs": `${Math.round(G.px * 0.3)}px` }} />
                        <i className="crFlash" />
                    </div>
                </EosPilotStage>
            ) : null}
            {G ? <div className="crCount" data-n={`${Math.min(S.r + 1, N)} / ${N}`} aria-label={`Round ${Math.min(S.r + 1, N)} of ${N}`} style={{ top: `${Math.round(G.top)}px` }} /> : null}
        </div>
    )
})
eosPilotRegister(2, EosPilotCrushEngine, { name: "The Press", kit: "workshop", role: "inside" })

const EOS_PILOT_CRUSH_AR = `${EOS_A} .eosPilotCrush`
const EOS_PILOT_CRUSH_CSS = `
${EOS_PILOT_CRUSH_AR} :is(.crBack,.crBack *,.crDim,.crBlobs,.crBlobs *,.crFans,.crFans *,.crFront,.crFront *,.crTag,.crTag *,.crFinale,.crFinale *,.crMouth *,.crCount){pointer-events:none}
${EOS_PILOT_CRUSH_AR} :is(.crBack,.crBlobs,.crFans,.crFront,.crFinale){position:absolute;inset:0}
${EOS_PILOT_CRUSH_AR} .crBack{z-index:1}
${EOS_PILOT_CRUSH_AR} .crDim{position:absolute;inset:0;z-index:2;opacity:0;background:radial-gradient(70% 55% at 50% 60%,rgba(10,4,8,.55),rgba(6,2,6,.92));display:block}
${EOS_PILOT_CRUSH_AR} .crBlobs{z-index:3}
${EOS_PILOT_CRUSH_AR} .crFans{z-index:3;--under:0}
${EOS_PILOT_CRUSH_AR} .crFront{z-index:4}
${EOS_PILOT_CRUSH_AR} .crTag{z-index:4}
${EOS_PILOT_CRUSH_AR} .crMouth{z-index:5}
${EOS_PILOT_CRUSH_AR} .crFinale{z-index:6}
${EOS_PILOT_CRUSH_AR} :is(.crBack,.crFront,.crFinale,.crTray,.crMouth) i{position:absolute;display:block;font-style:normal}

/* ---- brushed steel press frame: hairline brushing + a static light band from the lamp; rivets as radial dots */
${EOS_PILOT_CRUSH_AR} .crCol{border-radius:4px;
  background:radial-gradient(circle at 50% 10px,#d9dde4 0 2px,transparent 2.6px) 0 0/100% 34px,
    repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px),
    linear-gradient(90deg,#4c5059,#9aa0aa 38%,#c6cbd3 46%,#7d828c 60%,#454850);
  box-shadow:inset -2px 0 0 rgba(0,0,0,.25),inset 1px 0 0 rgba(255,255,255,.25),0 6px 16px rgba(0,0,0,.35)}
${EOS_PILOT_CRUSH_AR} .crBeam{z-index:2;border-radius:6px;
  background:radial-gradient(circle at 12px 50%,#e3e6ec 0 2.2px,transparent 2.8px) 0 0/40px 100%,
    repeating-linear-gradient(90deg,rgba(255,255,255,.045) 0 1px,transparent 1px 3px),
    linear-gradient(180deg,#c3c8d0 0%,#9ba1ab 22%,#6f747e 62%,#4a4d55 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 8px 18px rgba(0,0,0,.45)}
${EOS_PILOT_CRUSH_AR} .crPiston{position:absolute;overflow:hidden;z-index:1}
${EOS_PILOT_CRUSH_AR} .crJaw{position:absolute;border-radius:5px 5px 9px 9px;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px),
    linear-gradient(180deg,#d4d8df 0%,#a3a9b3 30%,#767b85 72%,#565a62 100%);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.6),inset 0 -3px 0 rgba(0,0,0,.28),0 10px 22px rgba(0,0,0,.45)}
${EOS_PILOT_CRUSH_AR} .crJaw::before{content:"";position:absolute;left:6%;right:6%;top:30%;height:16%;border-radius:4px;background:linear-gradient(90deg,transparent,rgba(255,236,200,.55) 45%,rgba(255,236,200,.25) 60%,transparent)}
${EOS_PILOT_CRUSH_AR} .crRod{left:50%;bottom:100%;width:18%;height:640px;translate:-50% 0;
  background:linear-gradient(90deg,#5e636c,#e8ebf0 30%,#fff 38%,#9aa0aa 58%,#4c5058)}
${EOS_PILOT_CRUSH_AR} .crJawEdge{left:2px;right:2px;bottom:-2px;height:5px;border-radius:3px;opacity:0;background:#ffb347;box-shadow:0 0 10px 2px rgba(255,170,60,.85),0 0 22px rgba(255,140,40,.5)}
${EOS_PILOT_CRUSH_AR} .crAnvil{border-radius:8px 8px 3px 3px;
  background:linear-gradient(180deg,transparent calc(100% - 13px),#e9b21b calc(100% - 13px)) 0 0/100% 100% no-repeat,
    repeating-linear-gradient(-45deg,#1d1b1c 0 9px,#f0bd1e 9px 18px) 0 100%/100% 13px no-repeat,
    radial-gradient(60% 40% at 50% 0%,rgba(255,200,130,.35),transparent 70%),
    repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 1px,transparent 1px 3px),
    linear-gradient(180deg,#b9bec7 0,#8c919b 7%,#62666f 40%,#43464d 100%);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.45),0 10px 24px rgba(0,0,0,.45)}
${EOS_PILOT_CRUSH_AR} .crBelt{height:14px;overflow:hidden;border-radius:7px;
  background:linear-gradient(180deg,#3d3436,#1d1719);box-shadow:inset 0 2px 0 rgba(255,255,255,.12),0 4px 8px rgba(0,0,0,.4)}
${EOS_PILOT_CRUSH_AR} .crBelt > i{left:0;top:3px;height:8px;width:calc(100% + 60px);background:repeating-linear-gradient(90deg,#5a4e4f 0 6px,transparent 6px 14px)}
${EOS_PILOT_CRUSH_AR} .crRail{width:8px;border-radius:4px;background:linear-gradient(90deg,#3e3a3c,#77727a 50%,#3a3638);box-shadow:0 0 0 1px rgba(0,0,0,.25)}
${EOS_PILOT_CRUSH_AR} .crRail::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(180deg,transparent 0 14px,rgba(0,0,0,.35) 14px 16px)}
${EOS_PILOT_CRUSH_AR} .crCar{width:52px;height:6px;border-radius:3px;background:linear-gradient(180deg,#c9ced6,#6e737c);box-shadow:0 3px 6px rgba(0,0,0,.4)}
${EOS_PILOT_CRUSH_AR} .crShelf{height:8px;border-radius:3px;background:linear-gradient(180deg,#b6bbc4,#6c717a 55%,#3f4249);box-shadow:0 6px 10px rgba(0,0,0,.35)}
${EOS_PILOT_CRUSH_AR} .crShelf::after{content:"";position:absolute;left:8px;right:8px;top:8px;height:10px;background:linear-gradient(90deg,#4a4d55 0 3px,transparent 3px calc(100% - 3px),#4a4d55 calc(100% - 3px))}

/* ---- heat tray + embers (the discharge collects as k embers) */
${EOS_PILOT_CRUSH_AR} .crTray{position:absolute;border-radius:3px 3px 12px 12px;--k:0;
  background:linear-gradient(180deg,#6b6064,#3c3436);box-shadow:inset 0 5px 10px rgba(0,0,0,.55),inset 0 -6px 14px rgba(255,90,40,calc(var(--k) * .9)),0 0 calc(var(--k) * 26px) rgba(255,110,50,calc(var(--k) * .6))}
${EOS_PILOT_CRUSH_AR} .crEmber{width:13px;height:11px;margin:-5px 0 0 -6px;border-radius:50% 50% 45% 45%;opacity:0;
  background:radial-gradient(circle at 42% 38%,#fff2c4,#ffab48 40%,#e8402a 75%);box-shadow:0 0 8px 2px rgba(255,120,40,.75)}
${EOS_PILOT_CRUSH_AR} .crEmber[data-on="1"]{opacity:1}

/* ---- gauge plate: CRUSH n/4 (text as an attribute: no characterData mutation per tap) */
${EOS_PILOT_CRUSH_AR} .crPlate{position:absolute;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:5px;box-sizing:border-box;
  background:radial-gradient(circle at 6px 6px,#eef0f3 0 1.6px,transparent 2.2px),radial-gradient(circle at calc(100% - 6px) 6px,#eef0f3 0 1.6px,transparent 2.2px),
    repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 3px),linear-gradient(180deg,#d5d9df,#a2a8b1);
  box-shadow:inset 0 1px 0 #fff,0 4px 12px rgba(0,0,0,.4);color:#22262c}
${EOS_PILOT_CRUSH_AR} .crPlate::after{content:"CRUSH\\A" attr(data-n);white-space:pre;text-align:center;font-size:13px;line-height:15px;font-weight:900;letter-spacing:.06em;position:relative;z-index:1}
${EOS_PILOT_CRUSH_AR} .crDial{left:50%;top:5px;width:24px;height:24px;translate:-50% 0;border-radius:50%;
  background:conic-gradient(from 210deg,#3c9a5a 0 50deg,#e2b23a 50deg 90deg,#d9473a 90deg 120deg,transparent 120deg),radial-gradient(circle,#f6f1e6 0 58%,#4a4d55 60% 100%);box-shadow:inset 0 0 0 2px #4a4d55}
${EOS_PILOT_CRUSH_AR} .crDial::after{content:"";position:absolute;inset:4px;border-radius:50%;background:#f6f1e6}
${EOS_PILOT_CRUSH_AR} .crNeedle{left:50%;top:50%;width:2px;height:10px;margin:-10px 0 0 -1px;z-index:1;background:#c0392b;border-radius:1px;transform-origin:50% 100%;rotate:-60deg}
${EOS_PILOT_CRUSH_AR} .crPlateGlow{inset:-4px;border-radius:10px;opacity:0;box-shadow:0 0 0 2px rgba(255,190,90,.95),0 0 18px rgba(255,170,60,.8)}
${EOS_PILOT_CRUSH_AR} .crLeak{width:30px;height:24px;opacity:0;background:radial-gradient(closest-side,rgba(255,255,255,.55),rgba(255,255,255,0));animation:eosPilotCrushLeak 3.4s ease-out infinite}
${EOS_PILOT_CRUSH_AR} .crLeak.b{animation-delay:-1.7s}
${EOS_PILOT_CRUSH_AR}:is([data-cool="2"],[data-cool="3"]) .crLeak{animation:none;opacity:0}

/* ---- blobs: a circular character inside a translucent jelly rim (angry red -> calm hue), gloss + lamp highlight */
${EOS_PILOT_CRUSH_AR} .crBlob .eosPilotActorBody::before,${EOS_PILOT_CRUSH_AR} .crBlob .eosPilotActorBody::after{content:"";position:absolute;inset:-9%;border-radius:50%;z-index:0;pointer-events:none;transition:opacity .25s ease}
${EOS_PILOT_CRUSH_AR} .crBlob .eosPilotActorBody::before{opacity:calc(1 - var(--heat));
  background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.75) 0 5%,transparent 13%),radial-gradient(circle at 50% 52%,rgba(255,74,58,0) 56%,rgba(255,74,58,.45) 68%,rgba(255,120,90,.62) 92%,rgba(255,74,58,0) 100%);
  box-shadow:0 0 calc(var(--a-size) * .22) rgba(255,74,58,.5)}
${EOS_PILOT_CRUSH_AR} .crBlob .eosPilotActorBody::after{opacity:var(--heat);
  background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.75) 0 5%,transparent 13%),radial-gradient(circle at 50% 52%,hsla(var(--a-hue),90%,70%,0) 56%,hsla(var(--a-hue),90%,72%,.35) 68%,hsla(var(--a-hue),95%,82%,.55) 92%,hsla(var(--a-hue),90%,70%,0) 100%);
  box-shadow:0 0 calc(var(--a-size) * .2) hsla(var(--a-hue),90%,70%,.45)}
${EOS_PILOT_CRUSH_AR} .crBlob .eosPilotActorBall > .rimHot{opacity:calc((1 - var(--heat)) * .85)}
${EOS_PILOT_CRUSH_AR} .crBlob .hand{z-index:2}
${EOS_PILOT_CRUSH_AR} .crBlob .eosPilotActorLabel{top:calc(100% + 8px)}
${EOS_PILOT_CRUSH_AR} .crName{position:absolute;display:block;font-style:normal;translate:-50% -50%;opacity:0;padding:2px 9px;border-radius:999px;color:#fff;
  font-size:13px;line-height:16px;font-weight:900;letter-spacing:.1em;text-shadow:0 1px 3px rgba(0,0,0,.6);animation:eosPilotCrushName 2.6s ease .35s both}
${EOS_PILOT_CRUSH_AR} .crName::after{content:attr(data-n)}
${EOS_PILOT_CRUSH_AR} .crPeek{position:absolute;left:0;top:0;display:block;font-style:normal;border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 36%,hsl(var(--a-hue) 92% 80%),hsl(var(--a-hue) 70% 56%));
  box-shadow:0 0 0 3px rgba(255,90,70,.45),0 0 14px rgba(255,74,58,.45);transition:transform .36s cubic-bezier(.25,.8,.35,1);animation:eosPilotCrushPeek .45s cubic-bezier(.25,.8,.35,1) both}
${EOS_PILOT_CRUSH_AR} .crPeek img,${EOS_PILOT_CRUSH_AR} .crFanBody img{position:absolute;left:-4%;top:-4%;width:108%;height:108%;max-width:none;object-fit:cover;border-radius:50%;-webkit-user-drag:none;user-select:none}
${EOS_PILOT_CRUSH_AR} .crPeek::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.7),transparent 26%)}
${EOS_PILOT_CRUSH_AR} .crFan{position:absolute;transform-origin:50% 50%}
${EOS_PILOT_CRUSH_AR} .crFanBody{position:absolute;inset:0;display:block;font-style:normal;border-radius:50%;overflow:hidden;transform-origin:50% 100%;
  background:radial-gradient(circle at 50% 36%,hsl(var(--a-hue) 92% 80%),hsl(var(--a-hue) 70% 56%));
  box-shadow:0 0 0 7px hsla(var(--a-hue),90%,76%,.42),0 0 26px hsla(var(--a-hue),90%,72%,.4)}
${EOS_PILOT_CRUSH_AR} .crFanBody::after{content:"";position:absolute;inset:0;border-radius:50%;opacity:var(--under);transition:opacity .5s ease;
  background:radial-gradient(ellipse 80% 55% at 50% 100%,rgba(255,200,110,.9),rgba(255,170,80,.35) 50%,transparent 75%),radial-gradient(circle at 34% 24%,rgba(255,255,255,.55),transparent 24%)}
${EOS_PILOT_CRUSH_AR} .crFanBody::before{content:"";position:absolute;inset:0;z-index:1;border-radius:50%;background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.6),transparent 26%)}

/* ---- the stamped word tag on the anvil face: steel #C9CED6, dark ink, 4 pips that light per slam */
${EOS_PILOT_CRUSH_AR} .crTag{position:absolute;translate:-50% 0;box-sizing:border-box;width:max-content;min-width:120px;padding:7px 14px 8px;border-radius:7px;text-align:center;
  --eos-pilot-ink:#22262C;
  background:radial-gradient(circle at 7px 7px,#f5f6f8 0 1.6px,transparent 2.2px),radial-gradient(circle at calc(100% - 7px) 7px,#f5f6f8 0 1.6px,transparent 2.2px),
    repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 1px,transparent 1px 3px),linear-gradient(180deg,#dfe2e7,#C9CED6 45%,#aab0ba);
  box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(0,0,0,.18),0 6px 14px rgba(0,0,0,.45);
  transition:opacity .35s ease,translate .45s cubic-bezier(.5,0,.8,.4);animation:eosPilotCrushTag .55s cubic-bezier(.3,1.5,.5,1) .25s both}
${EOS_PILOT_CRUSH_AR} .crTag .eosWord.eosPilotWord:is(*,.tsExactUserText){display:block;max-width:100%;overflow-wrap:anywhere;text-shadow:0 1px 0 rgba(255,255,255,.55)!important;letter-spacing:.01em}
${EOS_PILOT_CRUSH_AR} .crPips{display:flex;justify-content:center;gap:7px;margin-top:5px}
${EOS_PILOT_CRUSH_AR} .crPips i{position:relative;display:block;width:8px;height:8px;border-radius:50%;font-style:normal;background:#7d838c;box-shadow:inset 0 1px 2px rgba(0,0,0,.5);transition:background .12s ease,box-shadow .12s ease}
${EOS_PILOT_CRUSH_AR} .crTag[data-n="1"] .crPips i:nth-child(-n+1),${EOS_PILOT_CRUSH_AR} .crTag[data-n="2"] .crPips i:nth-child(-n+2),
${EOS_PILOT_CRUSH_AR} .crTag[data-n="3"] .crPips i:nth-child(-n+3),${EOS_PILOT_CRUSH_AR} .crTag[data-n="4"] .crPips i{background:#ff7a3c;box-shadow:0 0 6px rgba(255,120,50,.9)}
${EOS_PILOT_CRUSH_AR} .crTag.isGone{opacity:0;translate:-50% 30px;animation:eosPilotCrushTagOut .4s cubic-bezier(.5,0,.8,.4) both}

/* ---- the press mouth (the hit) + the finale mass and cube inside it */
${EOS_PILOT_CRUSH_AR} .crMouth{border-radius:18px}
${EOS_PILOT_CRUSH_AR} .crMouth:focus-visible{outline:2px solid rgba(255,236,200,.85);outline-offset:-4px}
${EOS_PILOT_CRUSH_AR} .crMass{left:50%;bottom:-2px;translate:-50% 0;border-radius:46% 54% 40% 40%/58% 58% 42% 42%;opacity:0;transform-origin:50% 100%;
  background:radial-gradient(circle at 40% 30%,#fff3c8 0 8%,#ffb054 26%,#ff5a2e 55%,#b8261c 85%);box-shadow:0 0 26px 8px rgba(255,90,40,.6),0 0 60px rgba(255,120,50,.45)}
${EOS_PILOT_CRUSH_AR} .crMass[data-on="1"]{opacity:1;animation:eosPilotCrushMass 1.1s ease-in-out infinite alternate}
${EOS_PILOT_CRUSH_AR} .crCube{left:50%;bottom:0;translate:-50% 0;opacity:0;border-radius:6px;transform-origin:50% 100%;
  background:linear-gradient(135deg,#ffe2a0,#ffb44a 45%,#e07a1e);box-shadow:inset 0 2px 0 rgba(255,255,255,.7),inset -4px -6px 0 rgba(150,60,10,.35),0 0 28px 6px rgba(255,170,60,.55)}
${EOS_PILOT_CRUSH_AR} .crCube[data-on="1"]{opacity:1}
${EOS_PILOT_CRUSH_AR} .crCubeGlow{inset:-30%;border-radius:50%;opacity:0;background:radial-gradient(closest-side,rgba(255,236,170,.95),rgba(255,190,90,.45) 55%,transparent)}
${EOS_PILOT_CRUSH_AR} .crCrack{opacity:0;background:linear-gradient(var(--ca),transparent 46%,#fffbe8 47%,#fff 50%,#fffbe8 53%,transparent 54%);filter:drop-shadow(0 0 3px #fff3c0)}
${EOS_PILOT_CRUSH_AR} .crCrack.a{inset:6% 30% 40% 8%;--ca:62deg}
${EOS_PILOT_CRUSH_AR} .crCrack.b{inset:34% 6% 20% 40%;--ca:-50deg}
${EOS_PILOT_CRUSH_AR} .crCrack.c{inset:50% 34% 4% 14%;--ca:100deg}

/* ---- finale light: rays (static conic, scaled 0 -> 1.6, turning slowly), the warm core, its glow, the flash */
${EOS_PILOT_CRUSH_AR} .crRays{width:var(--rs);height:var(--rs);margin:calc(var(--rs) * -.5) 0 0 calc(var(--rs) * -.5);opacity:0;transform:scale(0)}
${EOS_PILOT_CRUSH_AR} .crRays > i{inset:0;border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,214,140,.55),rgba(255,196,106,.18) 45%,transparent 72%),
    repeating-conic-gradient(from 0deg,rgba(255,206,120,.34) 0 7deg,rgba(255,206,120,0) 7deg 22deg);
  -webkit-mask:radial-gradient(closest-side,#000 30%,transparent 98%);mask:radial-gradient(closest-side,#000 30%,transparent 98%)}
${EOS_PILOT_CRUSH_AR} .crCore{left:0;top:0;width:var(--cs);height:var(--cs);margin:calc(var(--cs) * -.5) 0 0 calc(var(--cs) * -.5);border-radius:50%;opacity:0;z-index:2;
  background:radial-gradient(circle at 40% 34%,#fffdf0 0 14%,#ffe6a6 34%,#FFC46A 62%,#f09a3a 100%);box-shadow:0 0 18px 6px rgba(255,196,106,.85),0 0 46px 14px rgba(255,170,80,.45)}
${EOS_PILOT_CRUSH_AR} .crGlow{left:0;top:0;width:var(--gs);height:var(--gs);margin:calc(var(--gs) * -.5) 0 0 calc(var(--gs) * -.5);border-radius:50%;opacity:0;
  background:radial-gradient(closest-side,rgba(255,206,130,.55),rgba(255,180,90,.2) 55%,transparent)}
${EOS_PILOT_CRUSH_AR} .crFlash{inset:0;opacity:0;background:radial-gradient(60% 45% at 50% 62%,rgba(255,236,190,.95),rgba(255,190,110,.35) 55%,transparent 80%)}

/* ---- round pill (top-left in the HUD band) */
${EOS_PILOT_CRUSH_AR} .crCount{position:absolute;left:10px;z-index:7;padding:5px 10px;border-radius:999px;
  background:linear-gradient(180deg,#d9dde3,#aab0b9);box-shadow:inset 0 1px 0 #fff,0 3px 10px rgba(0,0,0,.35);color:#22262c;font-size:13px;line-height:16px;font-weight:900;letter-spacing:.06em;white-space:nowrap}
${EOS_PILOT_CRUSH_AR} .crCount::after{content:attr(data-n)}

@keyframes eosPilotCrushLeak{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:.75}70%{opacity:0;transform:translate(6px,-26px) scale(1.5)}100%{opacity:0}}
@keyframes eosPilotCrushName{0%{opacity:0;transform:translateY(6px)}14%{opacity:1;transform:none}78%{opacity:1}100%{opacity:0}}
@keyframes eosPilotCrushPeek{from{opacity:0;translate:-40px 0}to{opacity:1;translate:0 0}}
@keyframes eosPilotCrushTag{from{opacity:0;translate:-50% -26px}60%{opacity:1}to{opacity:1;translate:-50% 0}}
@keyframes eosPilotCrushTagOut{from{opacity:1;translate:-50% 0}to{opacity:0;translate:-50% 30px}}
@keyframes eosPilotCrushMass{from{scale:1}to{scale:1.04 .97}}
@media (prefers-reduced-motion: reduce){${EOS_PILOT_CRUSH_AR} :is(.crPeek,.crTag){transition:opacity .3s ease}}
${EOS_A}[data-eos-calm="1"] .eosPilotCrush :is(.crPeek,.crTag),${EOS_PILOT_CRUSH_AR}[data-eos-pilot-reduced="1"] :is(.crPeek,.crTag){transition:opacity .3s ease}
`
eosCss("pilot-crush", EOS_PILOT_CRUSH_CSS)
