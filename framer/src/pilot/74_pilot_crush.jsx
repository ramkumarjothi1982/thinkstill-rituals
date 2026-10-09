// 74_pilot_crush.jsx — Pilot A v2 · CRUSH (id 2) "The Press": squeeze the heat out (PILOT_A_ADDENDUM.md §CRUSH).
// A hydraulic press in a night workshop, lit in the player's own weather (S7 Mirror). Each thought tumbles out of the
// hatch as a red-hot jelly blob with the player's F8 picture (negative) and own words INSIDE it. Slam it: the jaw
// drops, hit-stop, the blob fights back (resistance), heat squirts into the tray and the jelly cools a quarter per slam.
// Four slams and it pancakes, its picture flips to the positive relief variant, it pops back round and rides the wall
// lift to the gallery (picture only: the word was squeezed out). Tempo follows the emotion (anger: fast pounding;
// panic / anxious: slow, exhale-paced slams). Surprises: the bouncer, the gauge pop, the workshop cat (rare swat).
// Transform: beacon spinning -> off, sodium lamp -> tungsten, windows smog -> stars, leaks -> relief puffs (S9).
// Payoff: ONE charged slam (hold, let go) -> "Warm Core": hit-stop, sparks, the amber cube cracks like an egg, the warm
// core floats to the hero (the last blob), a fumbled catch, cradled; at settleAt the scene is a still painting, then
// onDone hands the frame to the approved RewardSurgeBurst (S2' settle, handoff 2250).
// Per tap: ZERO React commits (counts, pips, heat and markers' n are attribute writes; jaw, blob, goo, shake are WAAPI).
// Rules: no imports; top-level names EosPilot*/eosPilot*/EOS_PILOT_*; never edits 00_arcade or src/eos.

const EOS_PILOT_CRUSH_HISS = [{ tone: [1800, 60, { type: "triangle", gain: 0.012, glide: 900 }] }]
const EOS_PILOT_CRUSH_HIT = [
    { tone: [70, 160, { type: "sine", gain: 0.09, glide: 48, at: 0.03 }], impact: true, noBody: true },
    { tone: [180, 90, { type: "triangle", gain: 0.05, glide: 140, at: 0.03 }], impact: true },
    { tone: [3000, 8, { type: "square", gain: 0.02, at: 0.03 }], impact: true },
    { tone: [620, 40, { type: "square", gain: 0.02, at: 0.03 }], impact: true },
]
const EOS_PILOT_CRUSH_HEAVY = [
    { tone: [55, 220, { type: "sine", gain: 0.12, at: 0.03 }], impact: true, noBody: true },
    { tone: [160, 140, { type: "triangle", gain: 0.06, at: 0.03 }], impact: true },
    { tone: [2500, 10, { type: "square", gain: 0.025, at: 0.03 }], impact: true },
    { tone: [980, 300, { type: "sine", gain: 0.02, at: 0.03 }], impact: true },
    { haptic: [18, 40, 18] },
]
const EOS_PILOT_CRUSH_SPLAT = [
    { tone: [300, 180, { type: "sine", gain: 0.05, glide: 120, at: 0.03 }], impact: true },
    { noise: [900, 300, 220, { gain: 0.05, at: 0.03 }] },
]
const eosPilotCrushG = (o, base) => base * (o && o.g != null ? o.g : 1)

const EOS_PILOT_CRUSH = {
    id: 2,
    verb: "CRUSHED",
    handoffMs: 2250,
    marker: { g: "taps", n: 4, label: "CRUSH ×4" },
    bigMarker: { g: "holdRelease", ms: 900, meter: ".eosPilotCrushGauge", mvar: "--charge", win: [60, 100], label: "HOLD… SLAM!" },
    slams: 4,
    comp: [0.22, 0.42, 0.6],
    pancake: 0.76,
    popBackMs: 350,
    tumbleMs: 400,
    rideMs: 900,
    setupMs: 950,
    chargeMs: 900,
    fullHoldMs: 600,
    autoMs: 8000,
    // heavy window (ms after the previous counted slam), jaw recoil and the bed period, per Mirror family
    tempo: {
        anger: { win: [180, 320], recoil: 210, bed: 2000 },
        panic: { win: [600, 900], recoil: 470, bed: 1400 },
        sad: { win: [400, 700], recoil: 340, bed: 2600 },
        anxious: { win: [600, 900], recoil: 470, bed: 1500 },
    },
    // the jelly's loud colour per family [hue, sat%] (cools toward each blob's calm hue)
    hot: { anger: [8, 92], panic: [346, 74], sad: [212, 24], anxious: [284, 60] },
    cues: {
        slam: EOS_PILOT_CRUSH_HISS.concat(EOS_PILOT_CRUSH_HIT),
        slamHeavy: EOS_PILOT_CRUSH_HISS.concat(EOS_PILOT_CRUSH_HEAVY),
        splat: EOS_PILOT_CRUSH_HISS.concat(EOS_PILOT_CRUSH_HIT, EOS_PILOT_CRUSH_SPLAT),
        splatHeavy: EOS_PILOT_CRUSH_HISS.concat(EOS_PILOT_CRUSH_HEAVY, EOS_PILOT_CRUSH_SPLAT),
        resist: [{ tone: [240, 150, { type: "sine", gain: 0.03, glide: 430, at: 0.1 }] }],
        word: [{ arcade: "pop" }],
        tick: [{ tone: [2800, 6, { type: "sine", gain: 0.008 }] }],
        twitch: [{ tone: [1600, 40, { type: "triangle", gain: 0.006, glide: 1100 }] }],
        clank: [{ tone: [400, 40, { type: "square", gain: 0.02 }] }, { tone: [760, 30, { type: "square", gain: 0.01, at: 0.04 }] }],
        popback: [{ tone: [220, 160, { type: "sine", gain: 0.04, glide: 660 }] }, { tone: [880, 260, { type: "sine", gain: 0.02, at: 0.06 }] }, { tone: [1320, 260, { type: "sine", gain: 0.014, at: 0.06 }] }],
        bell: [{ tone: [1568, 300, { type: "sine", gain: 0.014 }] }, { tone: [2093, 260, { type: "sine", gain: 0.008, at: 0.05 }] }],
        tumble: [
            { tone: [200, 20, { type: "square", gain: 0.014 }] },
            { tone: [170, 20, { type: "square", gain: 0.014, at: 0.09 }] },
            { tone: [140, 30, { type: "sine", gain: 0.03, at: 0.3 }], noBody: true },
        ],
        rattle: [{ tone: [320, 18, { type: "square", gain: 0.01 }] }, { tone: [280, 18, { type: "square", gain: 0.01, at: 0.05 }] }],
        boing: [{ tone: [180, 260, { type: "sine", gain: 0.05, glide: 520 }] }, { tone: [520, 200, { type: "triangle", gain: 0.02, glide: 260, at: 0.18 }] }],
        bonk: [{ tone: [150, 60, { type: "triangle", gain: 0.04 }] }, { tone: [2200, 8, { type: "square", gain: 0.01 }] }],
        dizzy: [{ tone: [1760, 70, { type: "sine", gain: 0.01 }] }, { tone: [1480, 70, { type: "sine", gain: 0.01, at: 0.09 }] }, { tone: [1760, 70, { type: "sine", gain: 0.01, at: 0.18 }] }],
        gaugePop: [{ noise: [2600, 700, 420, { gain: 0.05 }] }, { tone: [1200, 60, { type: "square", gain: 0.015 }] }],
        cheer: [{ tone: [660, 90, { type: "sine", gain: 0.02 }] }, { tone: [880, 90, { type: "sine", gain: 0.02, at: 0.08 }] }, { tone: [990, 140, { type: "sine", gain: 0.018, at: 0.16 }] }],
        meow: [{ tone: [700, 240, { type: "triangle", gain: 0.014, glide: 520 }] }],
        swat: [{ tone: [900, 50, { type: "square", gain: 0.012 }] }, { noise: [1500, 800, 160, { gain: 0.03 }] }],
        rumble: [{ noise: [120, 220, 700, { gain: 0.04, q: 0.7, attack: 300 }] }],
        charge: [{ tone: [110, 900, { type: "sawtooth", gain: 0.016, glide: 330 }], noBody: true }, { tone: [220, 900, { type: "triangle", gain: 0.02, glide: 660 }] }],
        notch: [{ tone: [300, 30, { type: "square", gain: 0.012 }] }],
        // T0: the jaw falls (whoosh + hiss) and lands at +60 (55 Hz boom with body and click, two-pulse haptic)
        mega: [
            { noise: [600, 3000, 90, { gain: 0.05 }] },
            { tone: [1800, 60, { type: "triangle", gain: 0.015, glide: 600 }] },
            { tone: [55, 420, { type: "sine", gain: 0.12, at: 0.06 }], impact: true, noBody: true },
            { tone: [160, 220, { type: "triangle", gain: 0.07, at: 0.06 }], impact: true },
            { tone: [3000, 10, { type: "square", gain: 0.025, at: 0.06 }], impact: true },
            { haptic: [22, 50, 22] },
        ],
        sparks: [{ noise: [3200, 5200, 260, { gain: 0.03, q: 2 }] }, { tone: [2600, 12, { type: "square", gain: 0.01, at: 0.08 }] }],
        sigh: [{ noise: [1400, 280, 620, { gain: 0.035, attack: 120 }] }],
        crackle: [{ tone: [2400, 30, { type: "square", gain: 0.012 }] }, { tone: [1900, 20, { type: "square", gain: 0.008, at: 0.03 }] }],
        swell: [{ swell: [262, 560, { gain: 0.02, attack: 180 }] }, { swell: [392, 560, { gain: 0.014, attack: 220 }] }],
        bip: [{ tone: [1320, 45, { type: "sine", gain: 0.016 }] }],
        hum: [{ swell: [196, 360, { gain: 0.016, attack: 120 }] }],
        purr: [{ swell: [120, 270, { gain: 0.02, attack: 60, rate: 26, depth: 0.8 }] }],
        finaleTap: [{ tone: [1568, 50, { type: "sine", gain: 0.012 }] }],
        // the Mirror beds (S4 tones, logged; the gain eases with progress)
        bed_anger: [
            { noise: (o) => [160, 260, 1300, { gain: eosPilotCrushG(o, 0.03), q: 0.7, attack: 500 }] },
            { tone: (o) => [520, 30, { type: "square", gain: eosPilotCrushG(o, 0.012), at: 0.55 }] },
            { tone: (o) => [470, 30, { type: "square", gain: eosPilotCrushG(o, 0.01), at: 1.1 }] },
        ],
        bed_panic: [
            { tone: (o) => [660, 240, { type: "sine", gain: eosPilotCrushG(o, 0.012) }] },
            { tone: (o) => [550, 240, { type: "sine", gain: eosPilotCrushG(o, 0.012), at: 0.3 }] },
            { noise: (o) => [3000, 2600, 420, { gain: eosPilotCrushG(o, 0.012), at: 0.66 }] },
        ],
        bed_sad: [{ tone: (o) => [1480, 90, { type: "sine", gain: eosPilotCrushG(o, 0.018) }] }, { swell: (o) => [62, 1500, { gain: eosPilotCrushG(o, 0.018), attack: 500 }] }],
        bed_anxious: [
            { tone: (o) => [118, 700, { type: "square", gain: eosPilotCrushG(o, 0.005) }], noBody: true },
            { tone: (o) => [2600, 8, { type: "square", gain: eosPilotCrushG(o, 0.01) }] },
            { tone: (o) => [2600, 8, { type: "square", gain: eosPilotCrushG(o, 0.01), at: 0.45 }] },
        ],
    },
}

// Rounds = the player's chunks (N <= 6; a tail is joined on the last blob).
function eosPilotCrushWords(entries) {
    const r = eosPilotWords(entries, 6)
    let words = r && r.words && r.words.length ? r.words.slice() : []
    if (!words.length) words = ["this feeling"]
    if (words.length > 6) words = words.slice(0, 5).concat([words.slice(5).join(" ")])
    return words
}
// Each blob's calm hue: the character in its relief picture (warm reds map to mint), else a calm palette.
function eosPilotCrushCalmHue(src, i) {
    const m = String(src || "").match(/(sync|rush|glitch|loopie|drop|patch|still)_E\d+/)
    const pal = [168, 196, 142, 262, 32, 330]
    if (m && EOS_PILOT_CHAR_HUE[m[1]] != null) {
        const h = EOS_PILOT_CHAR_HUE[m[1]]
        return h > 335 || h < 20 ? 152 : h
    }
    return pal[i % pal.length]
}
// Impact sync (S4): an impact row's impactT = the animation's start frame + the impact offset.
function eosPilotCrushImpact(rows, a, inputT, off) {
    if (!rows || !a) return
    let s = null
    try {
        s = a.startTime != null ? a.startTime : document.timeline.currentTime
    } catch (e) {}
    if (s == null) return
    const it = Math.max(s, performance.now()) + (off == null ? 30 : off) - inputT
    rows.forEach((r) => {
        if (r && r.impact) r.impactT = it
    })
}

// Geometry from the S5 play box (arena px). Blob D 150 at 390 (180 at 1280); everything else follows it.
function eosPilotCrushGeom(b, N) {
    const phone = b.phone
    const W = b.w
    const P = b.play
    const top = P.top
    const bot = P.bottom
    const H = Math.max(260, bot - top)
    const y = (f) => top + H * f
    const D = Math.round(phone ? eosClamp(Math.min(150 * eosClamp(b.u, 0.85, 1.15), H * 0.34, W * 0.42), 104, 165) : eosClamp(Math.min(180 * eosClamp(b.u, 0.9, 1.2), H * 0.37), 120, 210))
    const cx = Math.round(W * 0.5)
    const anvilTop = Math.round(y(phone ? 0.79 : 0.8))
    const anvilH = Math.round(phone ? eosClamp(H * 0.075, 28, 40) : eosClamp(H * 0.09, 36, 56))
    const anvilB = anvilTop + anvilH
    const anvilW = Math.round(phone ? Math.min(W * 0.5, D * 1.28) : D * 1.45)
    const gap = Math.max(14, Math.round(D * 0.11))
    const jawB = anvilTop - D - gap
    const jawH = Math.round(Math.max(26, D * 0.21))
    const rodMin = Math.round(eosClamp(H * 0.075, 26, 44))
    const beamB = jawB - jawH - rodMin
    const beamH = Math.round(eosClamp(H * 0.048, 16, 26))
    const beamT = beamB - beamH
    const rise = Math.max(16, rodMin - 6)
    const colW = phone ? 14 : 22
    const frameW = phone ? W - 12 : Math.round(Math.max(D * 2.6, 460))
    const frameL = Math.round(cx - frameW / 2)
    const frameR = frameL + frameW
    const jawW = Math.round(Math.min(frameW - 2 * colW - 18, D * 1.5))
    const mouthW = Math.round(phone ? Math.min(W * 0.84, D * 2.05) : D * 2.3)
    const mouthT = beamB + 4
    const mouthB = anvilB
    // the hatch (left) + the belt
    const hatchW = Math.round(phone ? eosClamp(cx - anvilW / 2 - frameL - colW - 10, 48, 72) : 112)
    const hatchH = Math.round(D * (phone ? 0.6 : 0.68))
    const hatchX = Math.round(phone ? frameL + colW + 4 : frameL - 46 - hatchW)
    const hatchCx = hatchX + hatchW / 2
    // the heat tray (right of the anvil)
    const trayX = Math.round(cx + anvilW / 2 + (phone ? 6 : 16))
    const trayW = Math.round(phone ? Math.max(44, frameR - colW - 6 - trayX) : 120)
    const trayH = Math.round(phone ? 22 : 28)
    const trayY = anvilTop + 6
    const embers = [0, 1, 2, 3, 4, 5].map((j) => ({ x: Math.round(trayX + trayW * (0.13 + 0.148 * j)), y: Math.round(trayY + trayH * 0.45) }))
    // the gauge (right column) and the beacon (right end of the beam)
    const gD = Math.round(phone ? 46 : 62)
    const gx = Math.round(phone ? frameR - colW - gD / 2 + 4 : frameR - colW / 2)
    const gy = Math.round(phone ? jawB - jawH - 2 : jawB - jawH / 2)
    const beacon = { x: Math.round(frameR - colW - (phone ? 18 : 30)), y: beamT }
    // the gallery (cast members, picture only)
    const fanD = Math.round(phone ? 52 : 62)
    const M = Math.max(0, N - 1)
    const slots = []
    const shelves = []
    let liftX
    if (phone) {
        const sy = Math.round(Math.max(top + fanD + 6, y(0.17)))
        liftX = Math.round(W - 10 - fanD / 2)
        for (let j = 0; j < M; j++) slots.push({ x: Math.round(W - 14 - fanD / 2 - (j + 1) * (fanD + 6)), y: sy })
        shelves.push({ x0: slots.length ? slots[slots.length - 1].x - fanD / 2 - 8 : W - 80, x1: W - 4, y: sy })
    } else {
        liftX = Math.round(W - 26)
        const rows = [Math.round(y(0.64)), Math.round(y(0.38))]
        const cols = [0, 1, 2].map((c) => Math.round(W - 52 - fanD / 2 - c * (fanD + 18)))
        for (let j = 0; j < M; j++) slots.push({ x: cols[j % 3], y: rows[Math.floor(j / 3) % 2] })
        rows.forEach((ry, ri) => {
            if (M > ri * 3) shelves.push({ x0: cols[2] - fanD / 2 - 14, x1: W - 6, y: ry })
        })
    }
    // the hero's watch spot (left, on the belt) and the gallery's floor row (finale)
    const Dh = Math.round(D * 0.62)
    const hx = Math.round(phone ? Math.max(8 + Dh / 2, cx - anvilW / 2 - Dh / 2 + 10) : cx - anvilW / 2 - Dh / 2 - 22)
    const fanF = Math.round(phone ? 44 : 56)
    const floor = []
    if (phone) {
        const fb = Math.round(Math.min(bot - 2, anvilB + fanF + 6))
        for (let j = 0; j < M; j++) floor.push({ x: Math.round(W - 14 - fanF / 2 - j * (fanF + 8)), y: fb })
    } else for (let j = 0; j < M; j++) floor.push({ x: Math.round(cx + anvilW / 2 + 26 + fanF / 2 + j * (fanF + 12)), y: anvilTop })
    // the cat's perch (beam left | beam right | the hatch roof)
    const cat = { w: phone ? 48 : 58, h: phone ? 32 : 38 }
    const perches = {
        beamL: { x: Math.round(frameL + colW + (phone ? 30 : 60)), y: beamT },
        beamR: { x: Math.round(frameR - colW - (phone ? 70 : 110)), y: beamT },
        hatch: { x: Math.round(hatchCx), y: anvilTop - hatchH - 4 },
    }
    const massW = Math.round(D * 0.66)
    const massH = Math.round(D * 0.4)
    const cubeS = Math.round(D * 0.44)
    const coreD = Math.round(D * 0.3)
    // the windows on the back wall, the lamp
    const winT = Math.round(Math.max(4, top - (phone ? 40 : 30)))
    const winB = Math.round(Math.max(winT + 50, (phone ? Math.min(beamT, y(0.17) - fanD - 4) : beamT) - 10))
    const panes = phone ? 3 : 4
    const winL = Math.round(W * (phone ? 0.05 : 0.12))
    const winR = Math.round(W * (phone ? 0.95 : 0.88))
    const lampY = Math.round(Math.max(0, winT - 6))
    const vents = [
        { x: frameL + colW / 2, y: beamT - 4 },
        { x: frameR - colW / 2, y: beamT - 4 },
        { x: trayX + trayW / 2, y: trayY - 6 },
    ]
    return {
        phone, W, H, top, bot, D, cx, anvilTop, anvilH, anvilB, anvilW, gap, jawB, jawH, rodMin, beamB, beamH, beamT, rise, colW, frameW, frameL, frameR,
        jawW, mouthW, mouthT, mouthB, hatchW, hatchH, hatchX, hatchCx, trayX, trayW, trayH, trayY, embers, gD, gx, gy, beacon, fanD, slots, shelves, liftX,
        Dh, hx, fanF, floor, cat, perches, massW, massH, cubeS, coreD, winT, winB, panes, winL, winR, lampY, vents,
        blobCy: anvilTop - D / 2,
    }
}

function EosPilotCrushEngine(p) {
    const live = React.useRef(p)
    live.current = p
    const wordsKey = (p.entries || []).join("\u0001")
    return <EosPilotCrushInner live={live} wordsKey={wordsKey} reduced={!!p.reduced} userImgKey={eosPilotImgKey(p)} />
}

const EosPilotCrushInner = React.memo(function EosPilotCrushInner({ live, wordsKey, reduced, userImgKey }) {
    const C = EOS_PILOT_CRUSH
    const gameId = 2
    const arenaRef = React.useRef(null)
    const stageRef = React.useRef(null)
    const mouthRef = React.useRef(null)
    const jawRef = React.useRef(null)
    const edgeRef = React.useRef(null)
    const contactRef = React.useRef(null)
    const gaugeRef = React.useRef(null)
    const pipsRef = React.useRef(null)
    const trayRef = React.useRef(null)
    const hatchRef = React.useRef(null)
    const carRef = React.useRef(null)
    const catRef = React.useRef(null)
    const dimRef = React.useRef(null)
    const finRef = React.useRef(null)
    const coreRef = React.useRef(null)
    const raysRef = React.useRef(null)
    const flashRef = React.useRef(null)
    const fansRef = React.useRef(null)
    const lampRef = React.useRef(null)
    const beltRef = React.useRef(null)
    const blobEls = React.useRef({}).current
    const blobFns = React.useRef({}).current
    const blobRef = (i) =>
        blobFns[i] ||
        (blobFns[i] = (el) => {
            if (el) blobEls[i] = el
            else delete blobEls[i]
        })
    const geomRef = React.useRef(null)
    const phaseRef = React.useRef("intro")
    const rRef = React.useRef(0)
    const st = React.useRef({
        n: 0, k: 0, lastT: 0, heavyHits: 0, heavyRun: 0, slams: 0, misses: 0, twitches: 0, busy: false, landedT: 0, jawY: 0, jawA: null, sqA: {}, poseT: 0,
        shakeA: null, tickT: 0, autoT: 0, bedT: 0, quiver: null, bigJawA: null, gooRR: 0, goo: null, charge: null, raf: 0, bounced: false, gaugePopped: false,
        catHits: 0, catAwake: false, catT: 0, swatted: false, blobLoop: null, loops: false, introDone: false, log: [], reported: 0, bigPct: 0, auto: false, t0Mount: 0, perf: [],
    }).current
    const rt = useEosPilotRuntime()
    const shell = useEosPilotShell(arenaRef, gameId)
    const box = useEosPilotBox(arenaRef)

    const emotion = React.useMemo(() => (typeof eosCurrentEmotion === "function" && eosCurrentEmotion()) || "auto", [])
    const mirror = React.useMemo(() => eosPilotMirror(emotion), [])
    const MK = mirror.key
    const tempo = C.tempo[MK] || C.tempo.sad
    const run = React.useMemo(() => eosPilotRunSeed(gameId, wordsKey ? wordsKey.split("\u0001") : []), [])
    const seed = run.seed
    const words = React.useMemo(() => eosPilotCrushWords(wordsKey ? wordsKey.split("\u0001") : []), [wordsKey])
    const N = words.length
    const plan = React.useMemo(() => {
        // S11: the bouncer's round (never round 1 or the hero's), the cat's perch and its rare swat, the crack pattern, the catch pose
        let force = ""
        try {
            force = (eosIsDev() && localStorage.getItem("eos_pilot_force_2")) || "" // dev builds only: "swat"
        } catch (e) {}
        const bounceR = N >= 3 ? 1 + (Math.floor(eosPilotRand(seed + 11) * (N - 2)) % (N - 2)) : -1
        const swat = N >= 2 && (force === "swat" || eosPilotRand(seed + 23) < 1 / 6) ? 1 + (Math.floor(eosPilotRand(seed + 29) * (N - 1)) % (N - 1)) : -1
        const perch = swat > 0 ? "hatch" : eosPilotPickRun(gameId, "perch", ["beamL", "beamR"], seed + 31)
        const crack = Math.floor(eosPilotRand(seed + 37) * 3) % 3
        const pose = eosPilotPickRun(gameId, "catch", ["fumble", "onehand", "header"], seed + 41)
        return { bounceR, swat, perch, crack, pose }
    }, [])

    const [S, setS] = React.useState({ r: 0, phase: "intro", leaving: -1, landed: 0, released: 0, flight: false })
    const go = (patch) => {
        if (patch.phase) phaseRef.current = patch.phase
        if (patch.r != null) rRef.current = patch.r
        setS((s) => ({ ...s, ...patch }))
    }
    const pctOf = (k) => (k >= N ? EOS_PILOT_FINAL_PCT : Math.round((k / N) * 100))
    const breath = useEosPilotBreath(mirror, pctOf(S.released))
    const snd = useEosPilotSound({ gameId, live, cues: C.cues, timers: rt.timers })
    // F8: pictures from the shared resolver, re-read when the uploads change (removal restores the defaults).
    // Incoming blobs show their slot's NEGATIVE picture (progress 0); a squeezed blob flips to its relief variant.
    const FP = React.useMemo(() => eosPilotFacePics(live.current, 0, 6, seed), [userImgKey])
    const slotOf = (i) => i % 6
    const picOf = (i, released) => (released ? FP.relief[slotOf(i)] : FP.pics[slotOf(i)]) || FP.pics[slotOf(i)] || null
    const calmHue = (i) => eosPilotCrushCalmHue(FP.relief[slotOf(i)], i)
    const hot = C.hot[MK] || C.hot.sad
    const heat0 = (i) => Math.max(0.6, 1 - 0.42 * (i / Math.max(1, N)))
    const report = (v) => {
        st.reported = Math.max(st.reported || 0, v)
        try {
            live.current.onProgress(v, `${v}% ${C.verb}`)
        } catch (e) {}
    }
    // the last word's value: 96 unless that crosses one of the wrapper's step-reward buckets (a step burst would
    // land on the charged slam's climax: addendum finding 2 / A5); then the highest value inside the current bucket
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
    React.useEffect(() => {
        ;[].concat(FP.pics, FP.relief).forEach((src) => {
            if (src && !/^data:/.test(src)) eosPilotPrefetch(src)
        })
    }, [userImgKey])

    const red = () => eosPilotIsReduced(arenaRef.current, live)
    const anim = (el, kf, o) => eosPilotAnim(rt.anims, el, kf, o)
    const stage = () => stageRef.current
    const part = (i, sel) => (blobEls[i] ? blobEls[i].querySelector(sel) : null)
    const fin_ = (sel) => (finRef.current ? finRef.current.querySelector(sel) : null)
    const fanActs = () => (fansRef.current ? Array.from(fansRef.current.querySelectorAll(".crFanAct")) : [])
    const fanMoves = () => (fansRef.current ? Array.from(fansRef.current.querySelectorAll(".crFanMove")) : [])
    const xyOf = (e) => {
        const a = arenaRef.current
        if (!a || !e || e.clientX == null) return null
        const A = a.getBoundingClientRect()
        return { x: e.clientX - A.left, y: e.clientY - A.top }
    }
    const cancel = (a) => {
        if (!a) return
        try {
            a.cancel()
        } catch (x) {}
    }
    const matY = (el, fallback) => {
        try {
            const tf = getComputedStyle(el).transform
            if (!tf || tf === "none") return 0
            return new DOMMatrixReadOnly(tf).m42
        } catch (e) {
            return fallback || 0
        }
    }
    const setPose = (i, pose) => {
        const el = blobEls[i]
        if (el) el.setAttribute("data-pose", pose)
    }
    const sparks = (x, y, n, o) => {
        const s = stage()
        if (s) s.burst("sparks", { x, y, n, angle: -90, spread: 150, dist: 70, gravity: 50, ms: 560, spin: 140, s0: 0.9, s1: 0.4, ...(o || {}) })
    }
    const steam = (x, y, o) => {
        const s = stage()
        if (s) s.burst("steam", { x, y, n: 1, angle: -90, spread: 40, dist: 40, ms: 900, s0: 0.45, s1: 1.3, ...(o || {}) })
    }
    const shake = (px, ms, delay, A) => {
        const s = stage()
        const plane = s && s.layer("plane")
        if (!plane) return
        cancel(st.shakeA)
        const kf = [{ translate: "0 0" }, { translate: `${px}px ${(-px * 0.4).toFixed(1)}px`, offset: 0.25 }, { translate: `${(-px * 0.8).toFixed(1)}px ${(px * 0.3).toFixed(1)}px`, offset: 0.55 }, { translate: `${(px * 0.35).toFixed(1)}px 0px`, offset: 0.8 }, { translate: "0 0" }]
        st.shakeA = A ? A(plane, kf, { duration: ms, delay: delay || 0, easing: "ease-out" }) : anim(plane, kf, { duration: ms, delay: delay || 0, easing: "ease-out" })
    }

    // ---------------------------------------------------------------- the gallery (cast members) act by motion only
    const gallery = (kind, A) => {
        if (red()) return
        const mk = A || anim
        fanActs().forEach((el, j) => {
            if (el.__a && el.__a.playState === "running") {
                if (kind === "wince") return
                cancel(el.__a)
            }
            let kf = null
            let o = null
            if (kind === "wince") {
                if (j > 2) return
                kf = [{ transform: "none" }, { transform: "scale(1.08,.86)", offset: 0.35 }, { transform: "none" }]
                o = { duration: 150, delay: 30 + 18 * j }
            } else if (kind === "cheer") {
                kf = [{ transform: "none" }, { transform: "translateY(-13px) scale(.95,1.07)", offset: 0.4, easing: "cubic-bezier(.5,0,.6,1)" }, { transform: "none" }]
                o = { duration: 380, delay: 80 + 40 * j, easing: "cubic-bezier(.2,.7,.3,1)" }
            } else if (kind === "flinch") {
                kf = [{ transform: "none" }, { transform: "scale(1.16,.78)", offset: 0.3 }, { transform: "none" }]
                o = { duration: 200, delay: 60 + 16 * j }
            } else if (kind === "look") {
                kf = [{ transform: "none" }, { transform: "rotate(-9deg) translateX(-3px)", offset: 0.35 }, { transform: "rotate(7deg) translateX(2px)", offset: 0.7 }, { transform: "none" }]
                o = { duration: 760, delay: 40 * j }
            } else if (kind === "leanBack") {
                kf = [{ transform: "none" }, { transform: "rotate(5deg) translateY(2px) scale(.97)", offset: 0.5 }, { transform: "none" }]
                o = { duration: 900 }
            }
            if (kf) el.__a = mk(el, kf, { easing: "ease-out", ...o })
        })
    }

    // ---------------------------------------------------------------- the cat (a supporting character)
    const catSet = (s) => {
        if (catRef.current) catRef.current.setAttribute("data-cat", s)
    }
    const catHeavy = () => {
        const cat = catRef.current
        if (!cat || st.catAwake || red()) return
        st.catHits++
        const ear = cat.querySelector(".crCatEar.r")
        if (st.catHits === 1 && ear) {
            anim(ear, [{ transform: "none" }, { transform: "rotate(22deg)", offset: 0.25 }, { transform: "rotate(-8deg)", offset: 0.5 }, { transform: "rotate(16deg)", offset: 0.75 }, { transform: "none" }], { duration: 420, easing: "ease-out" })
            return
        }
        // the head comes up and it glares at the player, then it settles back down
        st.catAwake = true
        catSet("glare")
        snd.cue("meow", null, { action: "cat" })
        st.catT = rt.timers.later(() => {
            if (phaseRef.current === "finale") return
            catSet("sleep")
            st.catAwake = false
            st.catHits = 0
        }, 2400)
    }

    // ---------------------------------------------------------------- the gauge and the anvil pips
    const needle = (a, kick) => {
        const g = gaugeRef.current
        const el = g && g.querySelector(".crNeedleBase")
        if (!el) return
        el.style.rotate = `${a.toFixed(1)}deg`
        if (kick && !red()) anim(el.firstElementChild, [{ transform: "none" }, { transform: "rotate(14deg)", offset: 0.4 }, { transform: "rotate(-5deg)", offset: 0.75 }, { transform: "none" }], { duration: 300, easing: "ease-out" })
    }
    const pressure = () => {
        const p = (st.k + st.n / 4) / Math.max(1, N)
        return 105 - p * 150 + (st.n ? 22 : 0)
    }
    const gaugeSet = (pct) => {
        const g = gaugeRef.current
        if (!g) return
        g.style.setProperty("--charge", pct.toFixed(0))
        needle(-120 + 2.4 * pct, false)
    }
    const gaugePop = () => {
        const g = gaugeRef.current
        const G = geomRef.current
        if (!g || !G || st.gaugePopped) return
        st.gaugePopped = true
        g.setAttribute("data-popped", "1")
        snd.cue("gaugePop", null, { action: "gauge-pop" })
        rt.timers.later(() => snd.cue("cheer", null, { action: "cheer" }), 160)
        if (red()) return
        const glass = g.querySelector(".crGlass")
        const nb = g.querySelector(".crNeedle")
        if (nb) anim(nb, [{ transform: "none" }, { transform: "rotate(720deg)" }], { duration: 620, easing: "cubic-bezier(.2,.7,.3,1)" })
        if (glass) {
            glass.style.opacity = "0"
            anim(glass, [{ transform: "none", opacity: 1 }, { transform: "translate(16px,-46px) rotate(150deg)", opacity: 1, offset: 0.6 }, { transform: "translate(24px,-20px) rotate(220deg)", opacity: 0 }], { duration: 760, easing: "cubic-bezier(.2,.7,.4,1)" })
        }
        steam(G.gx, G.gy - 8, { n: 2, dist: 30, ms: 800 })
        gallery("cheer")
    }

    // ---------------------------------------------------------------- one slam (every counted tap)
    const jawSlam = (G, c, n, heavy, last) => {
        const J = jawRef.current
        if (!J) return null
        let y0 = st.jawY
        if (st.jawA && st.jawA.playState === "running") {
            y0 = matY(J, st.jawY)
            cancel(st.jawA)
        }
        const hs = heavy ? 70 : 40
        const press = G.gap + G.D * c
        const rec = tempo.recoil
        // [ms, y, easing of the segment that starts here]
        const pts = [
            [0, y0, "ease-out"],
            [10, y0 - 4, "cubic-bezier(.55,0,1,1)"],
            [30, press, "linear"],
        ]
        if (last) pts.push([30 + hs, press, "linear"], [350, press, "cubic-bezier(.45,0,.2,1)"], [350 + 300, 0, "linear"])
        else if (n <= 2) pts.push([30 + hs, press, "cubic-bezier(.3,.7,.4,1)"], [30 + hs + 70, press - 10, "cubic-bezier(.4,0,.2,1)"], [30 + hs + 130, press - 6, "cubic-bezier(.45,0,.25,1)"], [30 + hs + 130 + rec, 0, "linear"])
        else pts.push([30 + hs, press, "cubic-bezier(.45,0,.25,1)"], [30 + hs + rec + 90, 0, "linear"])
        const end = pts[pts.length - 1][0]
        J.style.transform = "translateY(0px)"
        st.jawY = 0
        st.jawA = anim(
            J,
            pts.map((p) => ({ transform: `translateY(${p[1].toFixed(1)}px)`, offset: p[0] / end, easing: p[2] })),
            { duration: end, easing: "linear" }
        )
        return st.jawA
    }
    const blobSlam = (r, G, c, n, heavy, last) => {
        const sq = part(r, ".crSquash")
        if (!sq) return
        let from = "scale(1,1)"
        const prev = st.sqA[r]
        if (prev && prev.playState === "running") {
            try {
                const tf = getComputedStyle(sq).transform
                if (tf && tf !== "none") from = tf
            } catch (x) {}
            cancel(prev)
        }
        const hs = heavy ? 70 : 40
        const sy = 1 - c
        const sx = 1 + 0.55 * c
        const Sc = (x, y) => `scale(${x.toFixed(3)},${y.toFixed(3)})`
        const rec = tempo.recoil
        const D = G.D
        let pts
        if (last) {
            sq.style.transform = Sc(1.42, 0.24)
            pts = [[0, from], [10, Sc(1.04, 0.96)], [30, Sc(1.42, 0.24)], [350, Sc(1.42, 0.24)]]
        } else if (n <= 2) {
            // resistance: it pushes the jaw back up 10 px with a jelly rebound (it fights)
            const back = sy + 10 / D
            pts = [[0, from], [10, Sc(1.04, 0.96)], [30, Sc(sx, sy)], [30 + hs, Sc(sx, sy)], [30 + hs + 70, Sc(sx * 0.97, back)], [30 + hs + 130, Sc(sx * 0.985, back - 4 / D)], [30 + hs + 130 + rec * 0.65, Sc(0.95, 1.06)], [30 + hs + 130 + rec, Sc(1, 1)]]
        } else {
            // slam 3: it gives in
            pts = [[0, from], [10, Sc(1.04, 0.96)], [30, Sc(sx, sy)], [30 + hs, Sc(sx, sy)], [30 + hs + rec * 0.7, Sc(sx * 0.9, sy + 0.24)], [30 + hs + rec + 30, Sc(0.97, 1.04)], [30 + hs + rec + 90, Sc(1, 1)]]
        }
        const end = pts[pts.length - 1][0]
        st.sqA[r] = anim(
            sq,
            pts.map((p) => ({ transform: p[1], offset: p[0] / end, easing: "ease-out" })),
            { duration: end, easing: "linear" }
        )
    }
    // red-hot goo squirts out of the jelly; most lands in the heat tray (right). The 4th slam is a 10-drop ring.
    const squirt = (G, c, n, last) => {
        const s = stage()
        const fx = s && s.layer("fx")
        if (!fx) return
        if (!st.goo) st.goo = Array.from(fx.querySelectorAll('[data-pool="heat"] > i'))
        const nodes = st.goo
        if (!nodes.length) return
        const halfW = (G.D * (1 + 0.55 * c)) / 2
        const y0 = G.anvilTop - G.D * (1 - c) * 0.45
        for (let i = 0; i < n; i++) {
            const el = nodes[st.gooRR++ % nodes.length]
            const r1 = eosPilotRand(seed + st.slams * 31 + i * 7)
            let x0
            let x1
            let y1
            let op = 0.95
            if (last) {
                const a = (i / n) * 2 * Math.PI
                x0 = G.cx + Math.cos(a) * halfW * 0.6
                x1 = G.cx + Math.cos(a) * (halfW + 26 + 46 * r1)
                y1 = G.anvilTop - 4 + Math.min(0, Math.sin(a)) * 46
                op = i % 3 === 0 ? 0.85 : 0
            } else if (i % 3 !== 2) {
                x0 = G.cx + halfW - 6
                x1 = G.trayX + G.trayW * (0.15 + 0.7 * r1)
                y1 = G.trayY + G.trayH * 0.4
            } else {
                x0 = G.cx - halfW + 6
                x1 = x0 - 24 - 40 * r1
                y1 = G.anvilTop + 2
                op = 0
            }
            const peak = Math.min(y0, y1) - (20 + 44 * r1)
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
    const edgeGlow = () => {
        const e = edgeRef.current
        if (!e) return
        const a = tempo.win[0]
        const b = tempo.win[1]
        const D = b + 40
        anim(e, [{ opacity: 0 }, { opacity: 0, offset: (a - 10) / D }, { opacity: 1, offset: (a + 10) / D }, { opacity: 1, offset: (b - 5) / D }, { opacity: 0 }], { duration: D, easing: "linear" })
    }
    const slam = (e) => {
        const G = geomRef.current
        if (!G) return
        if (st.busy) return twitch(e)
        const r = rRef.current
        const host = blobEls[r]
        const t = eosPilotEvT(e).t
        const p0 = performance.now()
        const n = Math.min(C.slams, st.n + 1)
        st.n = n
        st.slams++
        const inter = st.lastT ? t - st.lastT : Infinity
        const heavy = n > 1 && inter >= tempo.win[0] && inter <= tempo.win[1]
        st.lastT = t
        if (heavy) {
            st.heavyHits++
            st.heavyRun++
        } else if (n > 1) st.heavyRun = 0
        const last = n >= C.slams
        const c = last ? C.pancake : C.comp[n - 1]
        // count synchronously: attribute writes only (zero React commits per slam)
        if (pipsRef.current) pipsRef.current.setAttribute("data-n", String(n))
        if (mouthRef.current) mouthRef.current.setAttribute("data-eos-n", String(C.slams - n))
        if (host) host.style.setProperty("--heat", (heat0(r) * (1 - n / C.slams)).toFixed(2))
        if (st.tickT) {
            rt.timers.clear(st.tickT)
            st.tickT = 0
        }
        const R = red()
        const rows = snd.cue(last ? (heavy ? "splatHeavy" : "splat") : heavy ? "slamHeavy" : "slam", e, { action: heavy ? "heavy" : "slam" })
        if (!R) {
            const jawA = jawSlam(G, c, n, heavy, last)
            eosPilotCrushImpact(rows, jawA, t, 30)
            setPose(r, "brace")
            if (st.poseT) rt.timers.clear(st.poseT)
            st.poseT = last ? 0 : rt.timers.later(() => setPose(r, MK === "sad" ? "sag" : "rest"), 30 + (heavy ? 70 : 40) + 160)
            blobSlam(r, G, c, n, heavy, last)
            squirt(G, c, last ? 10 : heavy ? 7 : 4, last)
            shake(heavy ? 6 : 3, 120, 30)
            gallery("wince")
            if (!last && n <= 2) snd.cue("resist", null, { action: "resist", inputT: t })
            if (heavy) {
                gallery("cheer")
                catHeavy()
                steam(G.cx + (st.slams % 2 ? -1 : 1) * G.D * 0.42, G.anvilTop - G.D * 0.35, { ms: 760 })
            }
            if (!last) edgeGlow()
        } else {
            const pl = pipsRef.current
            if (pl) anim(pl, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 160 })
        }
        needle(pressure(), true)
        st.log.push({ r, n, heavy, inter: Number.isFinite(inter) ? Math.round(inter) : null })
        if (st.log.length > 80) st.log.shift()
        // surprises
        if (!last && n === 2 && r === plan.bounceR && !st.bounced) bouncer(r, G)
        if (heavy && st.heavyRun >= 3 && !st.gaugePopped) gaugePop()
        st.perf.push(Math.round(performance.now() - p0))
        if (st.perf.length > 40) st.perf.shift()
        if (last) return wordDone(t, e)
        st.tickT = snd.later("tick", tempo.win[0], t, { beat: "tick" }) // the heavy window opens (a tap cancels it)
        return undefined
    }
    // taps that do not count (round hand-over, the bouncer's flight): a twitch and a soft hiss
    const twitch = (e) => {
        st.twitches++
        snd.cue("twitch", e, { action: "twitch" })
        const J = jawRef.current
        if (J && !red()) anim(J, [{ translate: "0 0" }, { translate: "0 -3px", offset: 0.4 }, { translate: "0 0" }], { duration: 150, easing: "ease-out" })
        const host = blobEls[rRef.current]
        const act = host && host.querySelector(".crAct")
        if (act && !red() && phaseRef.current !== "setup") anim(act, [{ transform: "none" }, { transform: "scale(.94,1.05) translateY(2px)", offset: 0.35 }, { transform: "none" }], { duration: 220, easing: "ease-out" })
    }
    const miss = (e) => {
        st.misses++
        snd.cue("clank", e, { action: "miss" })
        const host = blobEls[rRef.current]
        const act = host && host.querySelector(".crAct")
        const p = xyOf(e)
        const G = geomRef.current
        if (!act || red() || !G || !p) return
        const dir = p.x < G.cx ? -1 : 1
        anim(act, [{ transform: "none" }, { transform: `rotate(${(dir * 9).toFixed(0)}deg) translateX(${dir * 3}px)`, offset: 0.35 }, { transform: `rotate(${(-dir * 3).toFixed(0)}deg)`, offset: 0.7 }, { transform: "none" }], { duration: 480, easing: "ease-in-out" })
    }

    // ---------------------------------------------------------------- the bouncer: squirts out, ricochets, lands dizzy
    const bouncer = (r, G) => {
        st.bounced = true
        const host = blobEls[r]
        if (!host || red()) return
        st.busy = true
        go({ flight: true })
        const wallX = G.phone ? G.frameL + G.colW + G.D * 0.32 : G.hatchX + G.hatchW + G.D * 0.3
        const dx = wallX - G.cx
        const up = -G.D * 0.55
        const k = G.D
        const T = 760
        anim(
            host,
            [
                { transform: "none", easing: "cubic-bezier(.2,.7,.4,1)" },
                { transform: `translate(${(dx * 0.55).toFixed(1)}px,${(up * 1.1).toFixed(1)}px) rotate(-160deg) scale(.82,1.08)`, offset: 0.2, easing: "cubic-bezier(.5,0,.8,.6)" },
                { transform: `translate(${dx.toFixed(1)}px,${(up * 0.6).toFixed(1)}px) rotate(-250deg) scale(.66,1.04)`, offset: 0.32, easing: "cubic-bezier(.2,.7,.3,1)" },
                { transform: `translate(${(dx * 0.55).toFixed(1)}px,${(-k * 0.95).toFixed(1)}px) rotate(-330deg) scale(.9)`, offset: 0.6, easing: "cubic-bezier(.6,0,.9,.6)" },
                { transform: "translate(0px,0px) rotate(-360deg) scale(1.16,.84)", offset: 0.86, easing: "cubic-bezier(.2,.8,.3,1.3)" },
                { transform: "rotate(-360deg)" },
            ],
            { duration: T, delay: 90, easing: "linear" }
        )
        snd.later("boing", 90, performance.now(), { beat: "bouncer" })
        snd.later("bonk", 90 + T * 0.32, performance.now(), { beat: "bouncer" })
        snd.later("boing", 90 + T * 0.86, performance.now(), { beat: "bouncer" })
        gallery("look")
        rt.timers.later(() => {
            host.setAttribute("data-dizzy", "1")
            snd.cue("dizzy", null, { action: "dizzy" })
            const pic = host.querySelector("ts-face-pic")
            if (pic) anim(pic, [{ transform: "none" }, { transform: "rotate(-12deg)", offset: 0.25 }, { transform: "rotate(10deg)", offset: 0.55 }, { transform: "rotate(-5deg)", offset: 0.8 }, { transform: "none" }], { duration: 900, easing: "ease-in-out" })
            st.busy = false
            st.lastT = 0
            go({ flight: false })
        }, 90 + T)
        rt.timers.later(() => host.removeAttribute("data-dizzy"), 90 + T + 1500)
    }

    // ---------------------------------------------------------------- a word is done: splat -> pop-back -> lift
    const ember = (j) => {
        const tray = trayRef.current
        const el = tray && tray.querySelectorAll(".crEmber")[j % 6]
        const G = geomRef.current
        if (!el || !G) return
        el.setAttribute("data-on", "1")
        tray.style.setProperty("--k", Math.min(1, (j + 1) / Math.max(3, N)).toFixed(2))
        if (red()) return
        const e = G.embers[j % 6]
        const dx = G.cx + G.D * 0.4 - e.x
        const dy = G.anvilTop - G.D * 0.12 - e.y
        anim(
            el,
            [
                { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(1.7)`, opacity: 0.4, easing: "cubic-bezier(.2,.6,.4,1)" },
                { transform: `translate(${(dx * 0.45).toFixed(1)}px,${(Math.min(dy, 0) - 30).toFixed(1)}px) scale(1.25)`, opacity: 1, offset: 0.42, easing: "cubic-bezier(.6,0,.8,.5)" },
                { transform: "none", opacity: 1 },
            ],
            { duration: 520, delay: 90, easing: "linear", fill: "backwards" }
        )
    }
    const wordDone = (t, e) => {
        const r = rRef.current
        const k = r + 1
        st.k = k
        st.n = 0
        st.lastT = 0
        const lastWord = k >= N
        go({ phase: lastWord ? "setup" : "trans", released: k }) // the one synchronous commit for this word: the lock + the relief picture
        ember(r)
        const s = stage()
        if (s) s.shift(pctOf(k), 700)
        if (!lastWord) {
            snd.cue("word", e, { action: "word" }) // the ONE arcade cue per word, then onProgress
            report(pctOf(k))
        } else report(lastPct()) // the last word: no p.sfx (no step burst can land on the climax)
        snd.later("popback", C.popBackMs, t, { beat: "popback" })
        rt.timers.later(() => popBack(r), C.popBackMs)
    }
    const popBack = (r) => {
        const G = geomRef.current
        const host = blobEls[r]
        const sq = host && host.querySelector(".crSquash")
        cancel(st.sqA[r])
        if (sq) {
            sq.style.transform = ""
            if (!red()) anim(sq, [{ transform: "scale(1.42,.24)" }, { transform: "scale(.88,1.16)", offset: 0.45 }, { transform: "scale(1.05,.96)", offset: 0.75 }, { transform: "none" }], { duration: 360, easing: "cubic-bezier(.2,.8,.3,1.2)" })
        }
        setPose(r, "wave")
        if (pipsRef.current) pipsRef.current.setAttribute("data-n", "0")
        needle(pressure(), false)
        if (!G) return
        if (r + 1 >= N) return finaleSetup(r)
        go({ r: r + 1, leaving: r, phase: "trans" })
        return undefined
    }
    // the blob rolls right, rides the wall lift up and slides into its gallery slot (picture only: the word fades)
    const rideOut = (r, G) => {
        const host = blobEls[r]
        const s = G.slots[r]
        if (!host || !s) return
        const sc = G.fanD / G.D
        const c0y = G.blobCy
        const lift = { x: G.liftX - G.cx, y: G.anvilTop - G.fanD / 2 - c0y }
        const up = { x: G.liftX - G.cx, y: s.y - G.fanD / 2 - c0y }
        const end = { x: s.x - G.cx, y: s.y - G.fanD / 2 - c0y }
        const T = (p, k, rot) => `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${k.toFixed(3)})${rot != null ? ` rotate(${rot}deg)` : ""}`
        host.style.transform = T(end, sc)
        const txt = host.querySelector("ts-face-text")
        if (txt) txt.style.opacity = "0"
        const R = red()
        if (!R) {
            anim(
                host,
                [
                    { transform: T({ x: 0, y: 0 }, 1, 0), easing: "cubic-bezier(.4,0,.3,1)" },
                    { transform: T(lift, sc, 220), offset: 0.36, easing: "cubic-bezier(.45,0,.3,1)" },
                    { transform: T(up, sc, 360), offset: 0.74, easing: "cubic-bezier(.3,.6,.35,1.2)" },
                    { transform: T(end, sc, 360) },
                ],
                { duration: C.rideMs, delay: 60, easing: "linear", fill: "backwards" }
            )
            if (txt) anim(txt, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 120, fill: "backwards" })
            const car = carRef.current
            if (car) {
                const d = Math.round(s.y - G.anvilTop)
                anim(car, [{ transform: "translateY(0px)" }, { transform: "translateY(0px)", offset: 0.3 }, { transform: `translateY(${d}px)`, offset: 0.62, easing: "cubic-bezier(.3,.6,.35,1.1)" }, { transform: `translateY(${d}px)`, offset: 0.72 }, { transform: "translateY(0px)" }], { duration: C.rideMs + 500, delay: 60, easing: "ease-in-out" })
            }
            snd.later("bell", 60 + C.rideMs, performance.now(), { beat: "land" })
        }
        rt.timers.later(() => go({ landed: r + 1, leaving: -1 }), R ? 200 : C.rideMs + 80)
    }
    // the next blob tumbles out of the hatch onto the belt, rolls under the press and squashes to a stop
    const tumble = (i, G, delay, fast) => {
        const host = blobEls[i]
        if (!host) return
        const hatch = hatchRef.current
        if (hatch) hatch.setAttribute("data-q", String(Math.max(0, N - 1 - i)))
        snd.later("tumble", delay, performance.now(), { beat: "tumble" })
        st.landedT = 0
        rt.timers.later(() => {
            st.landedT = performance.now()
        }, delay + C.tumbleMs * 0.8)
        if (red()) {
            anim(host, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay, fill: "backwards" })
            return
        }
        const sx = G.hatchCx - G.cx
        const sy = G.anvilTop - G.hatchH * 0.5 - G.blobCy
        const s0 = (G.hatchH * 0.8) / G.D
        const d = fast ? 300 : C.tumbleMs
        anim(
            host,
            [
                { transform: `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) scale(${s0.toFixed(3)}) rotate(${fast ? -300 : -110}deg)`, opacity: 0, easing: "cubic-bezier(.3,.6,.4,1)" },
                { transform: `translate(${(sx * 0.72).toFixed(1)}px,${(sy * 0.25).toFixed(1)}px) scale(${((s0 + 1) / 2).toFixed(3)}) rotate(-70deg)`, opacity: 1, offset: 0.3, easing: "cubic-bezier(.4,0,.6,1)" },
                { transform: `translate(${(sx * 0.1).toFixed(1)}px,0px) scale(1) rotate(-8deg)`, opacity: 1, offset: 0.8, easing: "cubic-bezier(.2,.7,.3,1)" },
                { transform: "translate(0px,0px) scale(1) rotate(0deg)", opacity: 1 },
            ],
            { duration: d, delay, easing: "linear", fill: "backwards" }
        )
        const sq = host.querySelector(".crSquash")
        if (sq) anim(sq, [{ transform: "none" }, { transform: "scale(1.16,.84)", offset: 0.3 }, { transform: "scale(.95,1.06)", offset: 0.65 }, { transform: "none" }], { duration: 300, delay: delay + d * 0.82, easing: "ease-out" })
        const door = hatch && hatch.querySelector(".crDoor")
        if (door) anim(door, [{ transform: "none" }, { transform: "scaleY(.12)", offset: 0.25 }, { transform: "scaleY(.12)", offset: 0.6 }, { transform: "none" }], { duration: d + 160, delay: Math.max(0, delay - 60), easing: "ease-in-out" })
        const belt = beltRef.current
        if (belt) anim(belt, [{ transform: "translateX(0px)" }, { transform: "translateX(48px)" }], { duration: d, delay, easing: "cubic-bezier(.3,.1,.3,1)" })
    }
    const swat = (G, delay) => {
        const cat = catRef.current
        const paw = cat && cat.querySelector(".crCatPaw")
        st.swatted = true
        catSet("glare")
        snd.later("swat", Math.max(0, delay - 40), performance.now(), { beat: "swat" })
        if (paw && !red()) anim(paw, [{ transform: "none" }, { transform: "rotate(-70deg) translateY(4px)", offset: 0.35 }, { transform: "rotate(10deg)", offset: 0.6 }, { transform: "none" }], { duration: 360, delay: Math.max(0, delay - 120), easing: "ease-out" })
        rt.timers.later(() => {
            if (phaseRef.current !== "finale") catSet("sleep")
        }, delay + 1400)
    }

    // ---------------------------------------------------------------- Mirror (0 -> 2000 ms, shared clock)
    const take = (G) => {
        const host = blobEls[0]
        if (!host) return
        const act = host.querySelector(".crAct")
        const pic = host.querySelector("ts-face-pic")
        if (red() || !act) {
            if (MK === "sad") setPose(0, "sag")
            return
        }
        const D0 = 820
        if (MK === "anger") {
            setPose(0, "fists")
            anim(act, [{ transform: "none" }, { transform: "translateY(-12px) scale(.96,1.05)", offset: 0.18 }, { transform: "scale(1.1,.9)", offset: 0.3 }, { transform: "none", offset: 0.46 }, { transform: "translateY(-10px) scale(.97,1.04)", offset: 0.62 }, { transform: "scale(1.09,.91)", offset: 0.74 }, { transform: "none" }], { duration: 640, delay: D0, easing: "ease-in-out" })
            ;[D0 + 190, D0 + 470].forEach((ms) => rt.timers.later(() => snd.cue("bonk", null, { action: "stomp" }), ms))
            ;[0, 260].forEach((ms) => rt.timers.later(() => steam(G.cx + (ms ? 1 : -1) * G.D * 0.22, G.anvilTop - G.D * 0.92, { ms: 900 }), D0 + ms))
        } else if (MK === "panic") {
            setPose(0, "brace")
            anim(act, [{ transform: "none" }, { transform: "translateY(-7px)", offset: 0.16 }, { transform: "none", offset: 0.32 }, { transform: "translateY(-6px)", offset: 0.48 }, { transform: "none", offset: 0.64 }, { transform: "translateY(-5px)", offset: 0.8 }, { transform: "none" }], { duration: 560, delay: D0, easing: "ease-in-out" })
            if (pic) anim(pic, [{ transform: "none" }, { transform: "translateX(-6px)", offset: 0.2 }, { transform: "translateX(6px)", offset: 0.45 }, { transform: "translateX(-5px)", offset: 0.7 }, { transform: "none" }], { duration: 480, delay: D0 + 40, easing: "steps(1,end)" })
        } else if (MK === "sad") {
            setPose(0, "sag")
            anim(act, [{ transform: "none" }, { transform: "scale(1.05,.9)", offset: 0.6 }, { transform: "scale(1.04,.92)" }], { duration: 700, delay: D0, easing: "ease-in-out", fill: "forwards" })
            act.style.transform = "scale(1.04,.92)"
        } else {
            setPose(0, "peek")
            anim(act, [{ transform: "none" }, { transform: "rotate(-6deg)", offset: 0.2 }, { transform: "rotate(5deg)", offset: 0.45 }, { transform: "rotate(-4deg)", offset: 0.7 }, { transform: "none" }], { duration: 600, delay: D0, easing: "ease-in-out" })
        }
        // it glares at the jaw, then at the camera, and gives one small nod ("I know")
        if (pic)
            anim(pic, [{ transform: "none" }, { transform: "translateY(-7px) scale(.97)", offset: 0.25 }, { transform: "translateY(-7px) scale(.97)", offset: 0.55 }, { transform: "none", offset: 0.75 }, { transform: "translateY(3px) scale(.95)", offset: 0.87 }, { transform: "none" }], {
                duration: 460,
                delay: 1000 - 0,
                easing: "ease-in-out",
            })
        rt.timers.later(() => {
            if (phaseRef.current === "play" && st.n === 0) setPose(0, MK === "sad" ? "sag" : "rest")
        }, 1600)
    }
    const intro = (G) => {
        tumble(0, G, 300, false)
        // the hatch rattles once for each blob still to come
        const hatch = hatchRef.current
        const door = hatch && hatch.querySelector(".crDoor")
        for (let j = 0; j < N - 1; j++) {
            const at = 950 + j * 130
            snd.later("rattle", at, performance.now(), { beat: "rattle" })
            if (door && !red()) anim(door, [{ transform: "none" }, { transform: "translateX(2px) rotate(1.5deg)", offset: 0.3 }, { transform: "translateX(-2px) rotate(-1.5deg)", offset: 0.65 }, { transform: "none" }], { duration: 110, delay: at, easing: "linear" })
        }
        take(G)
        rt.timers.later(() => {
            if (phaseRef.current === "intro") go({ phase: "play" })
        }, 1400)
    }

    // ---------------------------------------------------------------- the beds and the world's idle life (S4/S7/S8)
    const bedTick = () => {
        st.bedT = 0
        const ph = phaseRef.current
        if (ph === "finale" || EOS_PILOT_SOUND.hold) return
        const p = pctOf(st.k) / 100
        const g = Math.max(0.12, 1 - p * 0.9)
        snd.cue(`bed_${MK}`, null, { action: "bed", g })
        const G = geomRef.current
        if (G && !red() && p < 0.67) {
            if (MK === "anger") steam(G.vents[(st.k + st.slams) % 2].x, G.vents[0].y, { ms: 1000, s1: 1.6 })
            if (MK === "anxious") sparks(G.winL + 26, G.winB + 22, 2, { dist: 26, ms: 420, gravity: 30 })
        }
        st.bedT = rt.timers.later(bedTick, tempo.bed)
    }
    const startLoops = () => {
        if (st.loops) return
        st.loops = true
        const s = stage()
        breath.root(s && s.el())
        if (fansRef.current) breath.loop(fansRef.current, [{ transform: "none", easing: "ease-in-out" }, { transform: "translateY(-2px)", offset: 0.45, easing: "ease-in-out" }, { transform: "none" }])
        const glow = lampRef.current && lampRef.current.querySelector(".crBulbGlow")
        if (glow) breath.loop(glow, [{ opacity: 0.72, easing: "ease-in-out" }, { opacity: 1, offset: 0.45, easing: "ease-in-out" }, { opacity: 0.72 }])
        const cat = catRef.current && catRef.current.querySelector(".crCatBody")
        if (cat) breath.loop(cat, [{ transform: "none", easing: "ease-in-out" }, { transform: "scale(1.03,1.08)", offset: 0.45, easing: "ease-in-out" }, { transform: "none" }], { offset: 0.2 })
    }
    const blobBreath = (i) => {
        if (st.blobLoop) breath.stop(st.blobLoop)
        st.blobLoop = null
        const b = blobEls[i] && blobEls[i].querySelector(".crBreath")
        if (b && !red()) st.blobLoop = breath.loop(b, [{ transform: "none", easing: "ease-in-out" }, { transform: "translateY(-1.5px) scale(1.018,1.03)", offset: 0.45, easing: "ease-in-out" }, { transform: "none" }])
    }

    // ---------------------------------------------------------------- the big slam: set-up, charge, release
    const finaleSetup = (r) => {
        const G = geomRef.current
        if (!G) return
        const R = red()
        go({ phase: "setup" })
        if (st.bedT) rt.timers.clear(st.bedT)
        st.bedT = 0
        snd.cue("rumble", null, { action: "setup" })
        // the hero (the last blob, the session's own feeling) hops off to its watch spot
        const host = blobEls[r]
        if (host) {
            const sc = G.Dh / G.D
            const dx = G.hx - G.cx
            const dy = G.anvilTop - G.Dh / 2 - G.blobCy
            const end = `translate(${dx}px,${dy.toFixed(1)}px) scale(${sc.toFixed(3)})`
            host.style.transform = end
            host.setAttribute("data-hero", "1")
            const txt = host.querySelector("ts-face-text")
            if (txt) txt.style.opacity = "0"
            if (!R) {
                anim(host, [{ transform: "translate(0px,0px) scale(1)", easing: "cubic-bezier(.2,.7,.4,1)" }, { transform: `translate(${(dx * 0.5).toFixed(1)}px,${(Math.min(0, dy) - G.D * 0.5).toFixed(1)}px) scale(${((1 + sc) / 2).toFixed(3)})`, offset: 0.45, easing: "cubic-bezier(.6,0,.85,.5)" }, { transform: end }], { duration: 480, delay: 140, easing: "linear", fill: "backwards" })
                if (txt) anim(txt, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: 120, fill: "backwards" })
            }
            rt.timers.later(() => setPose(r, "rest"), 640)
        }
        // the embers roll out of the tray onto the anvil and fuse into one red-hot mass
        const tray = trayRef.current
        const lit = tray ? Array.from(tray.querySelectorAll('.crEmber[data-on="1"]')) : []
        lit.forEach((el, j) => {
            const e = G.embers[j % 6]
            const dx = G.cx - e.x
            const dy = G.anvilTop - G.massH * 0.5 - e.y
            const end = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(.5)`
            el.style.transform = end
            el.style.opacity = "0"
            if (!R) anim(el, [{ transform: "none", opacity: 1 }, { transform: `translate(${(dx * 0.5).toFixed(1)}px,${(Math.min(0, dy) - 30).toFixed(1)}px) scale(1.15)`, opacity: 1, offset: 0.5 }, { transform: end, opacity: 0.3 }], { duration: 400, delay: 60 + 55 * j, easing: "cubic-bezier(.4,.1,.5,1)", fill: "backwards" })
        })
        if (tray) tray.style.setProperty("--k", "0")
        const mass = fin_(".crMass")
        if (mass) {
            mass.style.opacity = "1"
            if (!R) anim(mass, [{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "scale(1.14)", offset: 0.7 }, { opacity: 1, transform: "none" }], { duration: 360, delay: 380, easing: "cubic-bezier(.2,.8,.3,1.2)", fill: "backwards" })
        }
        // the gallery hops down to watch
        fanMoves().forEach((el, j) => {
            const s = G.slots[j]
            const f = G.floor[j]
            if (!s || !f) return
            const k = G.fanF / G.fanD
            const dx = f.x - s.x
            const dy = f.y - s.y + (G.fanD - G.fanF) / 2
            const end = `translate(${dx}px,${dy.toFixed(1)}px) scale(${k.toFixed(3)})`
            el.style.transform = end
            if (!R) anim(el, [{ transform: "none", easing: "cubic-bezier(.2,.7,.4,1)" }, { transform: `translate(${(dx * 0.3).toFixed(1)}px,-30px) scale(${((1 + k) / 2).toFixed(3)})`, offset: 0.3, easing: "cubic-bezier(.55,0,.9,.6)" }, { transform: end }], { duration: 560, delay: 120 + 50 * j, easing: "linear", fill: "backwards" })
        })
        // the lights dim; the jaw rises extra high and quivers
        const dim = dimRef.current
        if (dim) {
            dim.style.opacity = "0.42"
            if (!R) anim(dim, [{ opacity: 0 }, { opacity: 0.42 }], { duration: 500, easing: "ease-in-out" })
        }
        const J = jawRef.current
        if (J) {
            cancel(st.jawA)
            const hi = -Math.round(G.rise * 0.7)
            J.style.transform = `translateY(${hi}px)`
            st.jawY = hi
            if (!R) {
                st.jawA = anim(J, [{ transform: "translateY(0px)" }, { transform: `translateY(${hi - 5}px)`, offset: 0.78 }, { transform: `translateY(${hi}px)` }], { duration: 520, delay: 100, easing: "cubic-bezier(.4,0,.25,1)", fill: "backwards" })
                st.quiver = anim(J, [{ translate: "0 0" }, { translate: "0 -1.5px" }], { duration: 70, delay: 640, iterations: Infinity, direction: "alternate", easing: "ease-in-out" })
            }
        }
        gaugeSet(0)
        rt.timers.later(() => {
            go({ phase: "big" })
            st.autoT = rt.timers.later(() => {
                if (phaseRef.current === "big" && !st.charge) chargeRelease({ timeStamp: performance.now(), type: "auto" }, true)
            }, C.autoMs)
        }, C.setupMs - C.popBackMs)
    }
    const stopCharge = () => {
        if (st.raf) cancelAnimationFrame(st.raf)
        st.raf = 0
    }
    const jawNotch = (n) => {
        const G = geomRef.current
        const J = jawRef.current
        if (!G || !J) return
        const from = st.jawY
        const to = -Math.round(G.rise * (0.7 + 0.1 * n))
        st.jawY = to
        J.style.transform = `translateY(${to}px)`
        if (!red()) anim(J, [{ transform: `translateY(${from}px)` }, { transform: `translateY(${to - 2}px)`, offset: 0.7 }, { transform: `translateY(${to}px)` }], { duration: 110, easing: "ease-out" })
    }
    const chargeTick = () => {
        st.raf = 0
        const ch = st.charge
        if (!ch || phaseRef.current !== "big") return
        const now = performance.now()
        const el = now - ch.p0
        const pct = Math.min(100, (el / C.chargeMs) * 100)
        ch.pct = pct
        gaugeSet(pct)
        const notch = Math.min(3, Math.floor(el / 300))
        if (notch > ch.notch) {
            ch.notch = notch
            jawNotch(notch)
            snd.cue("notch", null, { action: "notch" })
        }
        if (pct >= 100 && !ch.fullT) ch.fullT = now
        if (ch.fullT && now - ch.fullT >= C.fullHoldMs) return chargeRelease({ timeStamp: now, type: "auto-full" }, true)
        st.raf = requestAnimationFrame(chargeTick)
        return undefined
    }
    const chargeStart = (e) => {
        if (phaseRef.current !== "big" || st.charge) return
        if (st.autoT) rt.timers.clear(st.autoT)
        st.autoT = 0
        st.charge = { p0: performance.now(), pct: 0, notch: 0, fullT: 0 }
        snd.cue("charge", e, { action: "charge" })
        const G = geomRef.current
        const hero = blobEls[N - 1]
        if (hero) {
            setPose(N - 1, "peek")
            const act = hero.querySelector(".crAct")
            if (act && !red()) anim(act, [{ transform: "none" }, { transform: "scale(.94,1.04) translateX(-4px)" }], { duration: 300, easing: "ease-out", fill: "forwards" })
        }
        gallery("leanBack")
        if (G && !red()) sparks(G.cx, G.anvilTop - G.massH, 2, { dist: 30, ms: 380 })
        st.raf = requestAnimationFrame(chargeTick)
    }
    const chargeRelease = (e, auto) => {
        if (phaseRef.current !== "big") return
        const ch = st.charge
        let pct = ch ? ch.pct : 60
        if (ch && performance.now() - ch.p0 < 150) pct = 40 // a quick tap: a 40% slam (still the full climax)
        bigSlam(e, Math.max(40, pct), auto)
    }
    const bigSlam = (ev, pct, auto) => {
        if (phaseRef.current !== "big") return
        phaseRef.current = "finale"
        if (st.autoT) rt.timers.clear(st.autoT)
        st.autoT = 0
        stopCharge()
        st.charge = null
        st.bigPct = Math.round(pct)
        st.auto = !!auto
        const t = eosPilotEvT(ev).t
        const m = mouthRef.current
        if (m) {
            m.setAttribute("aria-disabled", "true")
            m.removeAttribute("data-eos-target")
        }
        const rows = snd.cue("mega", ev, { action: auto ? "auto" : "bigslam" })
        fin.start(ev) // T0: the climax beat runs synchronously in this handler
        eosPilotCrushImpact(rows, st.bigJawA, t, 60)
        st.log.push({ big: st.bigPct, auto: !!auto })
        go({ phase: "finale" })
    }

    // ---------------------------------------------------------------- Payoff: "Warm Core" (S2' settle finale)
    const heroSlot = slotOf(N - 1)
    const fin = useEosPilotFinale({
        arenaRef,
        live,
        gameId,
        settle: true,
        bonus: 250 + st.heavyHits * 6 + Math.round((st.bigPct || 60) / 10),
        label: `100% ${C.verb}`,
        kit: "workshop",
        heroFace: () => FP.relief[heroSlot] || null,
        anims: rt.anims,
        timers: rt.timers,
        handoffMs: C.handoffMs,
        onSettle: () => {
            stopCharge()
            cancel(st.quiver)
            st.quiver = null
        },
        onFinaleTap: (ev) => {
            const p = xyOf(ev)
            if (p && !red()) sparks(p.x, p.y, 3, { dist: 40, ms: 420 })
            snd.cue("finaleTap", ev, { action: "finale-tap" })
        },
        beats: [
            {
                // 0-450: the jaw falls from its high hold, impact at +60, a 110 ms hit-stop with the contact line
                // white-hot, the mass is crushed into a glowing amber cube; 8 px shake, sparks fountain, the gallery
                // flinches then cheers in a hop wave, the cat bolts upright
                id: "climax",
                at: 0,
                dur: 450,
                reducedAt: 0,
                run: (c) => {
                    const G = geomRef.current
                    stopCharge()
                    cancel(st.quiver)
                    st.quiver = null
                    if (st.bedT) rt.timers.clear(st.bedT)
                    if (!G) return
                    const J = jawRef.current
                    const mass = fin_(".crMass")
                    const cube = fin_(".crCube")
                    if (mass) mass.style.opacity = "0"
                    if (cube) cube.style.opacity = "1"
                    if (c.reduced) {
                        if (mass) c.anim(mass, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })
                        if (cube) c.anim(cube, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
                        return
                    }
                    const k = eosClamp((st.bigPct || 60) / 100, 0.4, 1)
                    const hitY = G.anvilTop - G.cubeS - G.jawB
                    const y0 = J ? matY(J, st.jawY) : st.jawY
                    if (J) {
                        cancel(st.jawA)
                        J.style.transform = `translateY(${hitY}px)`
                        st.jawY = hitY
                        st.bigJawA = c.anim(
                            J,
                            [
                                { transform: `translateY(${y0.toFixed(1)}px)`, offset: 0, easing: "cubic-bezier(.7,0,1,.6)" },
                                { transform: `translateY(${hitY}px)`, offset: 60 / 450, easing: "linear" },
                                { transform: `translateY(${hitY}px)`, offset: 170 / 450, easing: "cubic-bezier(.2,.8,.3,1)" },
                                { transform: `translateY(${hitY - 7}px)`, offset: 240 / 450, easing: "cubic-bezier(.5,0,.5,1)" },
                                { transform: `translateY(${hitY}px)` },
                            ],
                            { duration: 450, easing: "linear" }
                        )
                    }
                    if (mass) c.anim(mass, [{ opacity: 1, transform: "none" }, { opacity: 1, transform: "none", offset: 0.85 }, { opacity: 0, transform: "scale(1.3,.3)" }], { duration: 70, easing: "ease-in" })
                    if (cube) c.anim(cube, [{ opacity: 0, transform: "scale(1.5,.35)" }, { opacity: 1, transform: "scale(1.5,.35)", offset: 0.02 }, { opacity: 1, transform: "scale(1.5,.35)", offset: 110 / 390 }, { opacity: 1, transform: "scale(.9,1.12)", offset: 0.6 }, { opacity: 1, transform: "none" }], { duration: 390, delay: 60, easing: "cubic-bezier(.2,.8,.3,1.2)", fill: "backwards" })
                    const ct = contactRef.current
                    if (ct) c.anim(ct, [{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 1, offset: 0.65 }, { opacity: 0 }], { duration: 200, delay: 60, fill: "backwards" })
                    const fl = flashRef.current
                    if (fl) c.anim(fl, [{ opacity: 0 }, { opacity: 0.55 + 0.25 * k, offset: 0.12 }, { opacity: 0 }], { duration: 380, delay: 60, easing: "ease-out", fill: "backwards" })
                    shake(Math.round(5 + 3 * k), 160, 170, c.anim)
                    const dim = dimRef.current
                    if (dim) {
                        dim.style.opacity = "0.3"
                        c.anim(dim, [{ opacity: 0.42 }, { opacity: 0.75, offset: 0.15 }, { opacity: 0.1, offset: 0.4 }, { opacity: 0.5, offset: 0.62 }, { opacity: 0.3 }], { duration: 320, delay: 60, easing: "steps(4,end)", fill: "backwards" })
                    }
                    c.later(() => sparks(G.cx, G.anvilTop - G.cubeS, 12, { spread: 170, dist: Math.round(90 + 60 * k), gravity: 90, ms: 520, spin: 180 }), 170)
                    gallery("flinch", c.anim)
                    c.later(() => gallery("cheer", c.anim), 260)
                    const cat = catRef.current
                    if (cat) {
                        catSet("up")
                        c.anim(cat, [{ transform: "none" }, { transform: "translateY(-14px) scale(.92,1.1)", offset: 0.35 }, { transform: "none" }], { duration: 260, delay: 170, easing: "cubic-bezier(.2,.7,.3,1)" })
                    }
                    const hero = blobEls[N - 1]
                    const act = hero && hero.querySelector(".crAct")
                    if (act) {
                        act.style.transform = ""
                        c.anim(act, [{ transform: "scale(.94,1.04) translateX(-4px)" }, { transform: "scale(1.12,.86)", offset: 0.25 }, { transform: "none" }], { duration: 300, delay: 60, easing: "ease-out", fill: "backwards" })
                    }
                    snd.later("sparks", 170, c.t0, { beat: "climax" })
                },
            },
            {
                // 450-1100: the jaw lifts with a long hydraulic sigh; the glowing cube trembles; three cracks light up
                // at 600, 800 and 1000 with light leaking out
                id: "cube",
                at: 450,
                dur: 650,
                reducedAt: 100,
                run: (c) => {
                    const G = geomRef.current
                    const cube = fin_(".crCube")
                    const cracks = cube ? Array.from(cube.querySelectorAll(".crCrack")) : []
                    cracks.forEach((el) => (el.style.opacity = "1"))
                    const glow = cube && cube.querySelector(".crCubeGlow")
                    if (glow) glow.style.opacity = "1"
                    if (c.reduced || !G) return
                    const J = jawRef.current
                    if (J) {
                        const from = st.jawY
                        J.style.transform = "translateY(0px)"
                        st.jawY = 0
                        c.anim(J, [{ transform: `translateY(${from}px)` }, { transform: `translateY(${from - 6}px)`, offset: 0.1 }, { transform: "translateY(0px)" }], { duration: 640, easing: "cubic-bezier(.35,0,.2,1)" })
                    }
                    const body = cube && cube.querySelector(".crCubeBody")
                    if (body) c.anim(body, [{ transform: "none" }, { transform: "rotate(-2deg)", offset: 0.2 }, { transform: "rotate(2deg) translateX(1px)", offset: 0.4 }, { transform: "rotate(-2.5deg)", offset: 0.62 }, { transform: "rotate(2.5deg) translateY(-1px)", offset: 0.82 }, { transform: "none" }], { duration: 640, easing: "linear" })
                    cracks.forEach((el, j) => c.anim(el, [{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "none" }], { duration: 120, delay: 150 + 200 * j, easing: "ease-out", fill: "backwards" }))
                    if (glow) c.anim(glow, [{ opacity: 0.35 }, { opacity: 1 }], { duration: 640, easing: "ease-in" })
                    snd.later("sigh", 450, c.t0, { beat: "cube" })
                    ;[600, 800, 1000].forEach((ms) => snd.later("crackle", ms, c.t0, { beat: "cube" }))
                },
            },
            {
                // 1100-1400: the cube splits like an egg; the warm core floats inside; warm rays flood the shop
                id: "split",
                at: 1100,
                dur: 300,
                reducedAt: 300,
                run: (c) => {
                    const G = geomRef.current
                    if (!G) return
                    const cube = fin_(".crCube")
                    const L = cube && cube.querySelector(".crShell.l")
                    const Rr = cube && cube.querySelector(".crShell.r")
                    const inner = cube ? Array.from(cube.querySelectorAll(".crCrack,.crCubeGlow")) : []
                    const core = coreRef.current
                    const rays = raysRef.current
                    const dim = dimRef.current
                    const lift = -Math.round(G.D * 0.2)
                    const endL = `translate(${-Math.round(G.cubeS * 0.42)}px,4px) rotate(-38deg)`
                    const endR = `translate(${Math.round(G.cubeS * 0.42)}px,4px) rotate(38deg)`
                    if (L) L.style.transform = endL
                    if (Rr) Rr.style.transform = endR
                    inner.forEach((el) => (el.style.opacity = "0"))
                    if (core) {
                        core.style.opacity = "1"
                        core.style.transform = `translate(0px,${lift}px)`
                    }
                    if (rays) {
                        rays.style.opacity = "0.9"
                        rays.style.transform = "scale(1.4)"
                    }
                    if (dim) dim.style.opacity = "0"
                    const s = stage()
                    if (s) s.shift(100, c.reduced ? 300 : 420)
                    snd.later("swell", 1100, c.t0, { beat: "split" })
                    if (c.reduced) {
                        if (core) c.anim(core, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 })
                        if (rays) c.anim(rays, [{ opacity: 0 }, { opacity: 0.9 }], { duration: 250 })
                        return
                    }
                    if (L) c.anim(L, [{ transform: "none" }, { transform: endL }], { duration: 300, easing: "cubic-bezier(.3,1.4,.5,1)" })
                    if (Rr) c.anim(Rr, [{ transform: "none" }, { transform: endR }], { duration: 300, easing: "cubic-bezier(.3,1.4,.5,1)" })
                    inner.forEach((el) => c.anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 140 }))
                    if (core) c.anim(core, [{ opacity: 0, transform: "translate(0px,6px) scale(.3)" }, { opacity: 1, transform: `translate(0px,${lift}px) scale(1.12)`, offset: 0.7 }, { opacity: 1, transform: `translate(0px,${lift}px)` }], { duration: 300, easing: "cubic-bezier(.2,.8,.3,1.2)" })
                    if (rays) c.anim(rays, [{ opacity: 0, transform: "scale(0)" }, { opacity: 0.9, transform: "scale(1.4)" }], { duration: 300, easing: "cubic-bezier(.2,.7,.3,1)" })
                    if (dim) c.anim(dim, [{ opacity: 0.3 }, { opacity: 0 }], { duration: 280 })
                },
            },
            {
                // 1400-1800: the core drifts to the hero in an arc; the hero lunges and catches it (fumble | one-hand |
                // header-bounce), then cradles it like a hand-warmer
                id: "catch",
                at: 1400,
                dur: 400,
                reducedAt: 600,
                run: (c) => {
                    const G = geomRef.current
                    const core = coreRef.current
                    const hero = blobEls[N - 1]
                    if (!G || !core) return
                    const lift = -Math.round(G.D * 0.2)
                    const hx = G.hx + Math.round(G.Dh * 0.36) - G.cx
                    const ty = -Math.round(G.coreD * 0.05)
                    const head = Math.round(G.coreD / 2 - G.Dh - 2)
                    const end = `translate(${hx}px,${ty}px)`
                    core.style.transform = end
                    setPose(N - 1, "cradle")
                    if (c.reduced) {
                        c.anim(core, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 })
                        return
                    }
                    const P = (x, y, s) => `translate(${Math.round(x)}px,${Math.round(y)}px)${s ? ` scale(${s})` : ""}`
                    const pose = plan.pose
                    const arc = [
                        { transform: P(0, lift), offset: 0, easing: "cubic-bezier(.3,.6,.5,1)" },
                        { transform: P(hx * 0.5, lift - G.D * 0.32), offset: 0.3, easing: "cubic-bezier(.5,0,.7,.6)" },
                    ]
                    let kf
                    if (pose === "header")
                        kf = arc.concat([
                            { transform: P(G.hx - G.cx, head, "1.1,.9"), offset: 0.58, easing: "cubic-bezier(.2,.7,.3,1)" },
                            { transform: P(G.hx - G.cx + 10, head - 24), offset: 0.74, easing: "cubic-bezier(.6,0,.8,.5)" },
                            { transform: end },
                        ])
                    else if (pose === "onehand") kf = arc.concat([{ transform: P(hx + 10, ty - 6), offset: 0.62, easing: "cubic-bezier(.3,.7,.4,1)" }, { transform: P(hx + 6, ty - 14), offset: 0.8, easing: "ease-in-out" }, { transform: end }])
                    else kf = arc.concat([{ transform: P(hx, ty), offset: 0.6, easing: "cubic-bezier(.2,.7,.3,1)" }, { transform: P(hx + 3, ty - 26), offset: 0.72, easing: "cubic-bezier(.6,0,.8,.5)" }, { transform: P(hx - 2, ty), offset: 0.82, easing: "cubic-bezier(.2,.7,.3,1)" }, { transform: P(hx + 2, ty - 13), offset: 0.91, easing: "cubic-bezier(.6,0,.8,.5)" }, { transform: end }])
                    c.anim(core, kf, { duration: 400, easing: "linear" })
                    const act = hero && hero.querySelector(".crAct")
                    if (act) c.anim(act, [{ transform: "none" }, { transform: "none", offset: 0.35 }, { transform: "translateX(12px) rotate(8deg) scale(1.04,.96)", offset: 0.6 }, { transform: "translateX(2px) rotate(-3deg)", offset: 0.82 }, { transform: "none" }], { duration: 400, easing: "ease-in-out" })
                    const bips = pose === "fumble" ? [1640, 1730] : pose === "header" ? [1632, 1700] : [1650]
                    bips.forEach((ms) => snd.later("bip", ms, c.t0, { beat: "catch" }))
                    snd.later("hum", 1700, c.t0, { beat: "catch" })
                },
            },
            {
                // 1800-2080: the core lights every face from below; the gallery leans in; the cat curls up beside the
                // hero and purrs; three relief puffs. Settle at 2100 (a still painting), hand-off at 2250.
                id: "glow",
                at: 1800,
                dur: 280,
                reducedAt: 700,
                run: (c) => {
                    const G = geomRef.current
                    const a = arenaRef.current
                    if (a) a.setAttribute("data-core", "1")
                    if (!G) return
                    const acts = fanActs()
                    acts.forEach((el, j) => {
                        const f = G.floor[j]
                        const dir = f && G.hx < f.x ? -1 : 1
                        const to = `rotate(${6 * dir}deg)`
                        cancel(el.__a)
                        el.style.transform = to
                        if (!c.reduced) c.anim(el, [{ transform: "none" }, { transform: to }], { duration: 260, delay: 20 * j, easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards" })
                    })
                    const cat = catRef.current
                    if (cat) {
                        const pr = G.perches[plan.perch] || G.perches.beamL
                        const tx = Math.round((G.phone ? G.hx - G.Dh * 0.12 : G.hx - G.Dh / 2 - G.cat.w * 0.35) - pr.x)
                        const ty = Math.round(G.anvilTop + (G.phone ? G.cat.h * 0.55 : 2) - pr.y)
                        const end = `translate(${tx}px,${ty}px) scale(.9)`
                        cat.style.transform = end
                        catSet("curl")
                        if (!c.reduced) c.anim(cat, [{ transform: "none", easing: "cubic-bezier(.2,.7,.4,1)" }, { transform: `translate(${Math.round(tx * 0.5)}px,${Math.round(Math.min(0, ty) - 40)}px) scale(.95)`, offset: 0.45, easing: "cubic-bezier(.6,0,.85,.5)" }, { transform: end }], { duration: 270, easing: "linear" })
                    }
                    if (!c.reduced) G.vents.forEach((v, j) => c.later(() => steam(v.x, v.y, { ms: 190, dist: 26, s1: 1.4 }), 30 * j))
                    snd.later("purr", 1800, c.t0, { beat: "glow" })
                },
            },
        ],
    })

    // ---------------------------------------------------------------- input routing
    const near = useEosPilotNearHit(arenaRef, () => [mouthRef.current], 28)
    const onMouthDown = (e, el) => {
        if (e.button != null && e.button > 0) return
        snd.warm()
        shell.playInput()
        const ph = phaseRef.current
        if (ph === "finale") return fin.tap(e)
        if (e.cancelable) e.preventDefault()
        try {
            if (el && e.pointerId != null && el.setPointerCapture) el.setPointerCapture(e.pointerId)
        } catch (x) {}
        if (ph === "big") return chargeStart(e)
        if (ph === "play" || (ph === "intro" && st.landedT)) return slam(e)
        return twitch(e)
    }
    const onUp = (e) => {
        if (phaseRef.current === "big" && st.charge) chargeRelease(e, false)
    }
    const onArenaDown = (e) => {
        const t = e.target
        if (t && t.closest && t.closest(".crMouth")) return // the mouth's own handler already ran
        snd.warm()
        if (fin.phase.current === "finale") return fin.tap(e)
        if (fin.phase.current !== "play") return
        shell.playInput()
        const hit = near(e)
        if (hit) return onMouthDown(e, arenaRef.current)
        const ph = phaseRef.current
        if (ph === "play" || ph === "intro") miss(e)
        return undefined
    }
    const onKeyDown = (e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        if (e.repeat) return
        onMouthDown({ type: "keydown", timeStamp: e.timeStamp, button: 0, preventDefault: () => {}, cancelable: false }, null)
    }
    const onKeyUp = (e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        onUp({ type: "keyup", timeStamp: e.timeStamp })
    }

    // ---------------------------------------------------------------- effects: intro, rounds, gallery, debug
    React.useLayoutEffect(() => {
        const G = geomRef.current
        if (!G || st.introDone) return
        st.introDone = true
        st.t0Mount = performance.now()
        startLoops()
        blobBreath(0)
        needle(pressure(), false)
        intro(G)
        st.bedT = rt.timers.later(bedTick, 600)
    }, [box ? 1 : 0])
    React.useLayoutEffect(() => {
        const G = geomRef.current
        if (!G || S.leaving < 0) return
        const fast = S.r === plan.swat && !st.swatted
        if (fast) swat(G, 140)
        tumble(S.r, G, fast ? 140 : 60, fast)
        rideOut(S.leaving, G)
        rt.timers.later(() => {
            blobBreath(S.r)
            if (phaseRef.current === "trans") go({ phase: "play" })
            if (pipsRef.current) pipsRef.current.setAttribute("data-n", "0")
            if (mouthRef.current) mouthRef.current.setAttribute("data-eos-n", String(C.slams))
        }, (fast ? 140 + 300 : 60 + C.tumbleMs) + 20)
    }, [S.r])
    React.useLayoutEffect(() => {
        if (S.landed <= 0 || red()) return
        const acts = fanActs()
        const nb = acts[S.landed - 2]
        if (nb) anim(nb, [{ transform: "none" }, { transform: "rotate(-9deg)", offset: 0.3 }, { transform: "rotate(4deg)", offset: 0.65 }, { transform: "none" }], { duration: 380, easing: "ease-out" })
        const me = acts[S.landed - 1]
        if (me) anim(me, [{ transform: "scale(1.1,.88)" }, { transform: "scale(.96,1.05)", offset: 0.5 }, { transform: "none" }], { duration: 300, easing: "ease-out" })
    }, [S.landed])
    React.useEffect(() => {
        try {
            eosExpose("pilotCrush", {
                state: () => ({
                    t0: fin.t0(),
                    r: rRef.current, k: st.k, n: st.n, N, phase: phaseRef.current, fin: fin.phase.current, mirror: MK, emotion, tempo, heavyHits: st.heavyHits, slams: st.slams,
                    misses: st.misses, twitches: st.twitches, bounced: st.bounced, gaugePopped: st.gaugePopped, swatted: st.swatted, catHits: st.catHits, plan, bigPct: st.bigPct, auto: st.auto,
                    words, perf: st.perf.slice(), log: st.log.slice(-30), charge: st.charge ? Math.round(st.charge.pct) : null,
                    rects: (() => {
                        const R = (el) => {
                            if (!el) return null
                            const r = el.getBoundingClientRect()
                            return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), getComputedStyle(el).opacity]
                        }
                        return { core: R(coreRef.current), hero: R(blobEls[N - 1]), cube: R(fin_(".crCube")), cat: R(catRef.current), jaw: R(jawRef.current) }
                    })(),
                }),
            })
        } catch (e) {}
        return () => stopCharge()
    }, [])

    // ---------------------------------------------------------------- render
    const G = box ? eosPilotCrushGeom(box, N) : null
    geomRef.current = G
    const ph = S.phase
    const marker = ph === "play" && !S.flight ? C.marker : ph === "big" ? C.bigMarker : null
    const pct = ph === "finale" ? EOS_PILOT_FINAL_PCT : pctOf(S.released)
    const mot = Math.max(0, 1 - pct / 70).toFixed(3)
    const cs = pct >= 100 ? 3 : pct >= 67 ? 2 : pct >= 34 ? 1 : 0
    const blobs = []
    if (S.leaving >= 0 && S.leaving < N) blobs.push(S.leaving)
    if (S.r < N && blobs.indexOf(S.r) < 0) blobs.push(S.r)
    if (S.released >= N && blobs.indexOf(N - 1) < 0) blobs.push(N - 1)
    const fans = []
    for (let j = 0; j < Math.min(S.landed, N - 1); j++) fans.push(j)
    const perch = G ? G.perches[plan.perch] || G.perches.beamL : null
    const crackSets = [
        [[18, 30, -24, 44], [50, 58, 32, 52], [70, 22, -60, 36]],
        [[28, 64, 18, 48], [56, 26, -40, 50], [38, 40, 74, 34]],
        [[60, 60, -18, 46], [22, 26, 44, 40], [46, 46, -76, 52]],
    ][plan.crack]
    const hotH = hot[0]
    const hotS = mirror.variant === "lite" ? Math.round(hot[1] * 0.7) : hot[1]
    const blobEl = (i) => {
        const released = i < S.released
        const D = G.D
        const word = words[i]
        const src = picOf(i, released)
        return (
            <div
                key={`b${i}`}
                ref={blobRef(i)}
                className="crBlob tsFaceObject tsNoBubbleFace"
                {...eosPilotFaceHost(slotOf(i))}
                data-pose={MK === "sad" ? "sag" : "rest"}
                style={{ left: `${G.cx - D / 2}px`, top: `${G.anvilTop - D}px`, width: `${D}px`, height: `${D}px`, "--h0": hotH, "--s0": `${hotS}%`, "--h1": calmHue(i), "--heat": released ? 0 : heat0(i).toFixed(2) }}
            >
                <div className="crMot">
                    <div className="crAct">
                        <div className="crBreath">
                            <div className="crSquash">
                                <i className="crHalo" />
                                <i className="crFoot l" />
                                <i className="crFoot r" />
                                <i className="crJelly">
                                    <i className="crJellyCalm" />
                                    <i className="crJellyHot" />
                                    <i className="crGloss" />
                                </i>
                                <i className="crArm l" />
                                <i className="crArm r" />
                                <i className="crWisp a" />
                                <i className="crWisp b" />
                                {MK === "panic" ? <i className="crSweat a" /> : null}
                                {MK === "panic" ? <i className="crSweat b" /> : null}
                                <i className="crDizzy">
                                    <i />
                                    <i />
                                    <i />
                                </i>
                                <EosPilotFace src={src} word={word} D={D} pos={released} upload={FP.upload} />
                                <i className="crUnder" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div
            ref={arenaRef}
            className="arena eosPilotArena eosPilotCrush"
            data-eos-pilot-kit="workshop"
            data-eos-pilot-reduced={reduced ? "1" : undefined}
            data-mirror={MK}
            data-cs={cs}
            data-phase={ph}
            onPointerDown={onArenaDown}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{ "--mot": mot }}
        >
            {G ? (
                <EosPilotStage ref={stageRef} kit="workshop" mirror={mirror} calm={0} hide={["windows", "pipes", "gauge", "beacon", "lamp", "cone", "coneCalm", "press", "anvil", "shelf", "tray", "conveyor"]} planeClassName="crPlane">
                    <div className="crWall" aria-hidden="true">
                        {Array.from({ length: G.panes }).map((_, j) => {
                            const w = (G.winR - G.winL - (G.panes - 1) * 10) / G.panes
                            return (
                                <i key={`w${j}`} className="crWin" style={{ left: `${(G.winL + j * (w + 10)).toFixed(1)}px`, top: `${G.winT}px`, width: `${w.toFixed(1)}px`, height: `${G.winB - G.winT}px` }}>
                                    <i className="crWinNight" />
                                    {[0, 1, 2, 3, 4].map((q) => (
                                        <i key={q} className="crStar" style={{ left: `${(12 + ((q * 37 + j * 23) % 76)).toFixed(0)}%`, top: `${(14 + ((q * 29 + j * 41) % 62)).toFixed(0)}%`, "--th": q < 1 && j === 0 ? 0.28 : q < 1 && j === 1 ? 0.32 : 0.55 + q * 0.05 }} />
                                    ))}
                                    {j === G.panes - 1 ? <i className="crMoon" /> : null}
                                    <i className="crSmog" />
                                    <i className="crMull" />
                                </i>
                            )
                        })}
                        <i className="crPipe" style={{ top: `${G.winB + 6}px` }}>
                            <i className="crLeak" style={{ left: "22%" }} />
                            <i className="crLeak b" style={{ left: "71%" }} />
                        </i>
                        {MK === "anger" ? <i className="crFurnace" /> : null}
                        {MK === "panic" ? <i className="crAlarm" /> : null}
                        {MK === "sad" ? (
                            <>
                                <i className="crDrip" style={{ left: `${G.winL + 30}px`, top: `${G.winB + 16}px`, "--fall": `${Math.round(G.anvilTop - G.winB - 30)}px` }} />
                                <i className="crBucket" style={{ left: `${G.winL + 18}px`, top: `${G.anvilTop - 22}px` }} />
                            </>
                        ) : null}
                        {MK === "anxious" ? (
                            <>
                                <i className="crWire" style={{ left: `${G.winL + 26}px`, top: `${G.winB + 14}px` }} />
                                <i className="crVent" style={{ left: `${G.phone ? G.W - 52 : G.winR - 70}px`, top: `${G.winB + (G.phone ? 22 : 30)}px` }}>
                                    <i />
                                </i>
                            </>
                        ) : null}
                        <i className="crFloor" style={{ top: `${G.anvilTop + 4}px` }} />
                        <i className="crVig" />
                        <div className="crLamp" ref={lampRef} style={{ left: `${G.cx}px`, top: `${G.lampY}px`, "--cone": `${Math.round(G.anvilTop - G.lampY)}px`, "--coneW": `${Math.round(G.phone ? G.W * 0.95 : G.frameW * 1.1)}px` }}>
                            <i className="crCone sod" />
                            <i className="crCone tung" />
                            <i className="crCord" />
                            <i className="crShade" />
                            <i className="crBulbGlow" />
                            <i className="crFlick" />
                        </div>
                    </div>
                    <i className="crDim" ref={dimRef} aria-hidden="true" />
                    <i className="crRays" ref={raysRef} aria-hidden="true" style={{ left: `${G.cx}px`, top: `${G.anvilTop - G.cubeS}px`, "--rs": `${Math.round(Math.min(Math.max(G.W, G.H) * 0.95, 960))}px` }} />
                    <div className="crRig" aria-hidden="true">
                        <i className="crCol" style={{ left: `${G.frameL}px`, top: `${G.beamT}px`, width: `${G.colW}px`, height: `${G.anvilB - G.beamT}px` }} />
                        <i className="crCol r" style={{ left: `${G.frameR - G.colW}px`, top: `${G.beamT}px`, width: `${G.colW}px`, height: `${G.anvilB - G.beamT}px` }} />
                        <i className="crRail" style={{ left: `${G.liftX - 3}px`, top: `${(G.slots.length ? Math.min(...G.slots.map((s) => s.y)) : G.anvilTop) - G.fanD - 6}px`, height: `${G.anvilTop - (G.slots.length ? Math.min(...G.slots.map((s) => s.y)) : G.anvilTop) + G.fanD + 6}px` }} />
                        <i className="crCar" ref={carRef} style={{ left: `${G.liftX - G.fanD / 2 - 4}px`, top: `${G.anvilTop - 4}px`, width: `${G.fanD + 8}px` }} />
                        {G.shelves.map((s, i) => (
                            <i key={`s${i}`} className="crShelf" style={{ left: `${s.x0}px`, top: `${s.y}px`, width: `${s.x1 - s.x0}px` }} />
                        ))}
                        <i className="crBeltBed" style={{ left: "0px", top: `${G.anvilTop}px`, width: `${Math.max(0, G.cx - G.anvilW / 2)}px` }}>
                            <i ref={beltRef} className="crBelt" />
                        </i>
                        <div className="crHatch" ref={hatchRef} data-q={String(Math.max(0, N - 1))} style={{ left: `${G.hatchX}px`, top: `${G.anvilTop - G.hatchH}px`, width: `${G.hatchW}px`, height: `${G.hatchH}px` }}>
                            <i className="crDoor" />
                            <i className="crQ">
                                {Array.from({ length: Math.max(0, N - 1) }).map((_, j) => (
                                    <i key={j} />
                                ))}
                            </i>
                        </div>
                        <i className="crAnvil" style={{ left: `${G.cx - G.anvilW / 2}px`, top: `${G.anvilTop}px`, width: `${G.anvilW}px`, height: `${G.anvilH}px` }}>
                            <i className="crPips" ref={pipsRef} data-n="0">
                                <i />
                                <i />
                                <i />
                                <i />
                            </i>
                        </i>
                        <div className="crTray" ref={trayRef} style={{ left: `${G.trayX}px`, top: `${G.trayY}px`, width: `${G.trayW}px`, height: `${G.trayH}px` }}>
                            {[0, 1, 2, 3, 4, 5].map((j) => (
                                <i key={j} className="crEmber" style={{ left: `${G.embers[j].x - G.trayX}px`, top: `${G.embers[j].y - G.trayY}px` }} />
                            ))}
                        </div>
                    </div>
                    <div className="crFans" ref={fansRef}>
                        {fans.map((j) => {
                            const s = G.slots[j]
                            return (
                                <div key={`f${j}`} className="crFan tsNoBubbleFace" data-eos-pilot-cast="1" data-j={j} style={{ left: `${s.x - G.fanD / 2}px`, top: `${s.y - G.fanD}px`, width: `${G.fanD}px`, height: `${G.fanD}px`, "--h1": calmHue(j) }}>
                                    <div className="crFanMove">
                                        <div className="crFanAct">
                                            <i className="crJelly">
                                                <i className="crJellyCalm" />
                                                <i className="crGloss" />
                                            </i>
                                            <EosPilotFace src={picOf(j, true)} word={null} D={G.fanD} pos={true} upload={FP.upload} />
                                            <i className="crUnder" />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="crBlobs">{blobs.map(blobEl)}</div>
                    <div className="crFin" ref={finRef} aria-hidden="true">
                        <i className="crMass" style={{ left: `${G.cx - G.massW / 2}px`, top: `${G.anvilTop - G.massH}px`, width: `${G.massW}px`, height: `${G.massH}px` }} />
                        <i className="crCube" style={{ left: `${G.cx - G.cubeS / 2}px`, top: `${G.anvilTop - G.cubeS}px`, width: `${G.cubeS}px`, height: `${G.cubeS}px` }}>
                            <i className="crCubeBody">
                                <i className="crShell l" />
                                <i className="crShell r" />
                                <i className="crCubeGlow" />
                                {crackSets.map((cr, j) => (
                                    <i key={j} className="crCrack" style={{ left: `${cr[0]}%`, top: `${cr[1]}%`, rotate: `${cr[2]}deg`, width: `${cr[3]}%` }} />
                                ))}
                            </i>
                        </i>
                    </div>
                    <div className="crTop" aria-hidden="true">
                        <div className="crJaw" ref={jawRef} style={{ left: `${G.cx - G.jawW / 2}px`, top: `${G.jawB - G.jawH}px`, width: `${G.jawW}px`, height: `${G.jawH}px`, "--rod": `${G.rodMin + G.D + 40}px` }}>
                            <i className="crRod" />
                            <i className="crJawFace" />
                            <i className="crJawEdge" ref={edgeRef} />
                            <i className="crContact" ref={contactRef} />
                        </div>
                        <i className="crBeam" style={{ left: `${G.frameL - 4}px`, top: `${G.beamT}px`, width: `${G.frameW + 8}px`, height: `${G.beamH}px` }} />
                        <i className="crBeacon" style={{ left: `${G.beacon.x}px`, top: `${G.beacon.y}px`, "--bw": `${Math.round(Math.min(Math.max(G.W, G.H) * 0.9, 900))}px` }}>
                            <i className="crBeaconBeam" />
                            <i className="crBeaconLit" />
                        </i>
                        <div className="eosPilotCrushGauge crGauge" ref={gaugeRef} style={{ left: `${G.gx - G.gD / 2}px`, top: `${G.gy - G.gD / 2}px`, width: `${G.gD}px`, height: `${G.gD}px`, "--charge": "0", "--gn": (G.gD / 46).toFixed(2) }}>
                            <i className="crGaugeRing" />
                            <i className="crGaugeFace" />
                            <i className="crNeedleBase" style={{ rotate: "60deg" }}>
                                <i className="crNeedle" />
                            </i>
                            <i className="crGlass" />
                        </div>
                        {perch ? (
                            <div className="crCat" ref={catRef} data-cat="sleep" style={{ left: `${perch.x - G.cat.w / 2}px`, top: `${perch.y - G.cat.h}px`, width: `${G.cat.w}px`, height: `${G.cat.h}px` }}>
                                <i className="crCatTail" />
                                <i className="crCatBody" />
                                <i className="crCatHead">
                                    <i className="crCatEar l" />
                                    <i className="crCatEar r" />
                                    <i className="crCatEye l" />
                                    <i className="crCatEye r" />
                                    <i className="crCatNose" />
                                </i>
                                <i className="crCatPaw" />
                                <i className="crUnder" />
                            </div>
                        ) : null}
                    </div>
                    <i className="crCore" ref={coreRef} aria-hidden="true" style={{ left: `${G.cx - G.coreD / 2}px`, top: `${G.anvilTop - G.coreD}px`, width: `${G.coreD}px`, height: `${G.coreD}px` }}>
                        <i className="crCoreGlow" />
                    </i>
                    <i className="crFlash" ref={flashRef} aria-hidden="true" />
                    <button
                        ref={mouthRef}
                        type="button"
                        className="crMouth"
                        data-pk="mouth"
                        aria-label={ph === "big" ? "Hold, then let go: one big slam" : "Slam the blob"}
                        style={{ left: `${G.cx - G.mouthW / 2}px`, top: `${G.mouthT}px`, width: `${G.mouthW}px`, height: `${G.mouthB - G.mouthT}px` }}
                        onPointerDown={(e) => onMouthDown(e, e.currentTarget)}
                        onPointerUp={onUp}
                        onPointerCancel={onUp}
                        onLostPointerCapture={onUp}
                        onKeyDown={onKeyDown}
                        onKeyUp={onKeyUp}
                        onContextMenu={(e) => e.preventDefault()}
                        aria-disabled={marker ? undefined : "true"}
                        {...eosPilotMarker(marker, !!marker)}
                    />
                </EosPilotStage>
            ) : null}
        </div>
    )
})
eosPilotRegister(2, EosPilotCrushEngine, { name: "The Press", kit: "workshop", role: "inside" })

const EOS_PILOT_CRUSH_AR = `${EOS_A} .eosPilotCrush`
const EOS_PILOT_CRUSH_Q = [1, 2, 3, 4, 5].map((q) => `${EOS_PILOT_CRUSH_AR} .crHatch[data-q="${q}"] .crQ > i:nth-child(-n+${q})`).join(",")
const EOS_PILOT_CRUSH_PIPS = [1, 2, 3, 4].map((q) => `${EOS_PILOT_CRUSH_AR} .crPips[data-n="${q}"] > i:nth-child(-n+${q})`).join(",")
const EOS_PILOT_CRUSH_CSS = `
${EOS_PILOT_CRUSH_AR}{touch-action:none;user-select:none;-webkit-user-select:none;--mot:1}
${EOS_PILOT_CRUSH_AR} .crPlane i{position:absolute;display:block;font-style:normal;pointer-events:none}
${EOS_PILOT_CRUSH_AR} :is(.crWall,.crRig,.crFans,.crBlobs,.crFin,.crTop){position:absolute;inset:0;pointer-events:none}
${EOS_PILOT_CRUSH_AR} .crWall{z-index:1}
${EOS_PILOT_CRUSH_AR} .crDim{inset:0;z-index:2;opacity:0;background:radial-gradient(70% 55% at 50% 72%,rgba(10,4,10,.3),rgba(4,2,8,.92))}
${EOS_PILOT_CRUSH_AR} .crRays{z-index:2;width:var(--rs);height:var(--rs);margin:calc(var(--rs) / -2) 0 0 calc(var(--rs) / -2);border-radius:50%;opacity:0;transform:scale(0);
  background:repeating-conic-gradient(from 4deg,rgba(255,214,140,.34) 0 6deg,rgba(255,214,140,0) 6deg 20deg);-webkit-mask:radial-gradient(closest-side,#000 8%,rgba(0,0,0,.5) 40%,transparent 72%);mask:radial-gradient(closest-side,#000 8%,rgba(0,0,0,.5) 40%,transparent 72%)}
${EOS_PILOT_CRUSH_AR} .crRig{z-index:3}
${EOS_PILOT_CRUSH_AR} .crFans{z-index:4}
${EOS_PILOT_CRUSH_AR} .crBlobs{z-index:5}
${EOS_PILOT_CRUSH_AR} .crFin{z-index:5}
${EOS_PILOT_CRUSH_AR} .crTop{z-index:6}
${EOS_PILOT_CRUSH_AR} .crCore{z-index:8}
${EOS_PILOT_CRUSH_AR} .crFlash{inset:0;z-index:9;opacity:0;background:radial-gradient(circle at 50% 74%,#fff,rgba(255,240,200,.6) 26%,rgba(255,220,160,0) 64%)}
${EOS_PILOT_CRUSH_AR} .crMouth{position:absolute!important;z-index:10;display:block;appearance:none;-webkit-appearance:none;background:transparent!important;background-image:none!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0!important;min-width:0!important;min-height:0!important;color:transparent!important;font-size:0!important;transform:none!important;animation:none!important;filter:none!important;opacity:1!important;border-radius:22px;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;outline:none}
${EOS_PILOT_CRUSH_AR} .crMouth::before,${EOS_PILOT_CRUSH_AR} .crMouth::after{content:none!important;display:none!important}
${EOS_PILOT_CRUSH_AR} .crMouth:focus-visible{box-shadow:0 0 0 3px rgba(255,214,140,.7)}

/* ---- the back wall: windows (smog -> stars), pipes, lamp (sodium -> tungsten), the Mirror props */
${EOS_PILOT_CRUSH_AR} .crFloor{left:0;right:0;bottom:0;background:linear-gradient(180deg,rgba(14,8,10,.55),rgba(10,6,8,.82) 40%,rgba(6,4,6,.9))}
${EOS_PILOT_CRUSH_AR} .crVig{inset:0;background:radial-gradient(120% 90% at 50% 46%,transparent 52%,rgba(8,4,8,.62)),linear-gradient(180deg,rgba(10,6,10,.35),transparent 28%)}
${EOS_PILOT_CRUSH_AR} .crWin{border-radius:6px;overflow:hidden;box-shadow:inset 0 0 0 3px #2b2226,0 2px 0 rgba(0,0,0,.35);background:#0e1426}
${EOS_PILOT_CRUSH_AR} .crWinNight{inset:0;background:linear-gradient(180deg,#0b1630,#1d2b4e 70%,#2c3a5c)}
${EOS_PILOT_CRUSH_AR} .crStar{width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 6px 1px rgba(255,255,255,.85);opacity:clamp(0,(var(--calm,0) - var(--th)) * 7,1);transition:opacity var(--calm-ms,600ms) ease}
${EOS_PILOT_CRUSH_AR} .crMoon{right:16%;top:18%;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 36% 36%,#fffbe8,#f3e2a8 60%,#cdb878);box-shadow:0 0 14px rgba(255,240,190,.7);opacity:clamp(0,var(--calm,0) * 2.4 - 1.3,1);transition:opacity var(--calm-ms,600ms) ease}
${EOS_PILOT_CRUSH_AR} .crSmog{inset:0;background:linear-gradient(180deg,rgba(120,52,30,.86),rgba(214,112,48,.9) 70%,rgba(240,150,70,.92));opacity:clamp(0,1 - var(--calm,0) * 1.65,1);transition:opacity var(--calm-ms,600ms) ease}
${EOS_PILOT_CRUSH_AR}[data-mirror="sad"] .crSmog{background:linear-gradient(180deg,rgba(70,86,110,.9),rgba(110,126,150,.92))}
${EOS_PILOT_CRUSH_AR}[data-mirror="panic"] .crSmog{background:linear-gradient(180deg,rgba(90,70,140,.88),rgba(150,120,200,.9))}
${EOS_PILOT_CRUSH_AR}[data-mirror="anxious"] .crSmog{background:linear-gradient(180deg,rgba(96,52,120,.88),rgba(170,100,180,.9))}
${EOS_PILOT_CRUSH_AR} .crMull{inset:0;background:linear-gradient(90deg,transparent calc(50% - 2px),#2b2226 calc(50% - 2px) calc(50% + 2px),transparent calc(50% + 2px)),linear-gradient(180deg,transparent calc(50% - 2px),#2b2226 calc(50% - 2px) calc(50% + 2px),transparent calc(50% + 2px))}
${EOS_PILOT_CRUSH_AR} .crPipe{left:0;right:0;height:10px;background:linear-gradient(180deg,#7a6664,#4c3c3c 50%,#2e2224);box-shadow:0 2px 3px rgba(0,0,0,.3)}
${EOS_PILOT_CRUSH_AR} .crLeak{top:-14px;width:26px;height:22px;margin-left:-13px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.55),rgba(255,255,255,0));opacity:clamp(0,1 - var(--calm,0) * 1.5,1);animation:crLeak 1.6s ease-out infinite}
${EOS_PILOT_CRUSH_AR} .crLeak.b{animation-delay:-.8s;animation-duration:2.1s}
${EOS_PILOT_CRUSH_AR}[data-cs="2"] .crLeak,${EOS_PILOT_CRUSH_AR}[data-cs="3"] .crLeak{animation:none;opacity:0}
${EOS_PILOT_CRUSH_AR} .crFurnace{left:-12%;bottom:0;width:62%;height:58%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,110,40,.6),rgba(255,80,30,0));opacity:clamp(0,1 - var(--calm,0) * 1.4,.9);transition:opacity var(--calm-ms,600ms) ease;animation:crPulse 2.2s ease-in-out infinite alternate}
${EOS_PILOT_CRUSH_AR} .crAlarm{inset:0;background:#ff2840;opacity:0;animation:crAlarm 1.3s steps(2,end) infinite}
${EOS_PILOT_CRUSH_AR}[data-cs="2"] .crAlarm,${EOS_PILOT_CRUSH_AR}[data-cs="3"] .crAlarm{display:none}
${EOS_PILOT_CRUSH_AR} .crDrip{width:6px;height:9px;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;background:linear-gradient(180deg,#d6ecff,#7fb2e6);opacity:clamp(0,1 - var(--calm,0) * 1.5,.9);animation:crDrip 1.9s cubic-bezier(.5,0,.9,.5) infinite}
${EOS_PILOT_CRUSH_AR} .crBucket{width:30px;height:22px;border-radius:2px 2px 8px 8px;background:linear-gradient(180deg,#5d6a78,#3a434e);box-shadow:inset 0 3px 0 rgba(255,255,255,.12)}
${EOS_PILOT_CRUSH_AR} .crWire{width:2px;height:46px;transform-origin:50% 0;background:linear-gradient(180deg,#333,#555);rotate:14deg;animation:crSwing 2.6s ease-in-out infinite alternate}
${EOS_PILOT_CRUSH_AR} .crWire::after{content:"";position:absolute;left:-3px;bottom:-4px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,#fff,#bfe6ff 40%,rgba(120,200,255,0) 70%);opacity:clamp(0,1 - var(--calm,0) * 1.5,1);animation:crZap 3s steps(1,end) infinite}
${EOS_PILOT_CRUSH_AR} .crVent{width:34px;height:34px;border-radius:50%;background:radial-gradient(circle,#3a3236 0 30%,#5a5054 32% 64%,#2a2226 66%)}
${EOS_PILOT_CRUSH_AR} .crVent > i{inset:4px;border-radius:50%;background:conic-gradient(#8a8086 0 40deg,transparent 40deg 120deg,#8a8086 120deg 160deg,transparent 160deg 240deg,#8a8086 240deg 280deg,transparent 280deg);animation:crSpin .5s steps(6,end) infinite}
${EOS_PILOT_CRUSH_AR}[data-cs="2"] .crVent > i,${EOS_PILOT_CRUSH_AR}[data-cs="3"] .crVent > i{animation-duration:2.4s;animation-timing-function:linear}
${EOS_PILOT_CRUSH_AR} .crLamp{position:absolute;width:0;height:0}
${EOS_PILOT_CRUSH_AR} .crCord{left:-1px;top:-40px;width:2px;height:46px;background:#1d1517}
${EOS_PILOT_CRUSH_AR} .crShade{left:-24px;top:4px;width:48px;height:18px;border-radius:24px 24px 6px 6px/18px 18px 6px 6px;background:linear-gradient(180deg,#6a5c5c,#2e2626);box-shadow:0 2px 3px rgba(0,0,0,.4)}
${EOS_PILOT_CRUSH_AR} .crBulbGlow{left:-30px;top:8px;width:60px;height:34px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,226,170,.95),rgba(255,190,110,.35) 55%,rgba(255,170,80,0))}
${EOS_PILOT_CRUSH_AR} .crCone{left:calc(var(--coneW) / -2);top:18px;width:var(--coneW);height:var(--cone);clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);transition:opacity var(--calm-ms,600ms) ease}
${EOS_PILOT_CRUSH_AR} .crCone.sod{background:linear-gradient(180deg,rgba(255,164,56,.44),rgba(255,160,56,.07) 86%,transparent);opacity:calc(1 - var(--calm,0))}
${EOS_PILOT_CRUSH_AR} .crCone.tung{background:linear-gradient(180deg,rgba(255,222,166,.52),rgba(255,214,150,.1) 86%,transparent);opacity:var(--calm,0)}
${EOS_PILOT_CRUSH_AR}[data-mirror="sad"] .crCone.sod{background:linear-gradient(180deg,rgba(190,206,236,.3),rgba(190,206,236,.05) 86%,transparent)}
${EOS_PILOT_CRUSH_AR}[data-mirror="panic"] .crCone.sod{background:linear-gradient(180deg,rgba(220,236,255,.4),rgba(220,236,255,.06) 86%,transparent)}
${EOS_PILOT_CRUSH_AR} .crFlick{left:calc(var(--coneW) / -2);top:0;width:var(--coneW);height:var(--cone);background:#000;opacity:0}
${EOS_PILOT_CRUSH_AR}:is([data-mirror="panic"],[data-mirror="sad"]):is([data-cs="0"],[data-cs="1"]) .crFlick{animation:crFlick 1.4s steps(1,end) infinite}

/* ---- the press, the hatch, the belt, the tray, the lift, the gallery shelf */
${EOS_PILOT_CRUSH_AR} .crCol{border-radius:3px;background:linear-gradient(90deg,#3d3f47,#6e727c 40%,#4a4d55 70%,#2e3036);box-shadow:0 0 0 1px rgba(0,0,0,.35)}
${EOS_PILOT_CRUSH_AR} .crBeam{border-radius:4px;background:linear-gradient(180deg,#8c909b,#5f636d 50%,#3e4148);box-shadow:0 4px 8px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.25)}
${EOS_PILOT_CRUSH_AR} .crBeam::after{content:"";position:absolute;inset:30% 8px;background:radial-gradient(circle,#2c2e33 0 2px,transparent 2.5px) 0 0/22px 100% repeat-x}
${EOS_PILOT_CRUSH_AR} .crJaw{position:absolute;will-change:transform}
${EOS_PILOT_CRUSH_AR} .crRod{left:40%;width:20%;bottom:100%;height:var(--rod);background:linear-gradient(90deg,#6a6e78,#e6e9ef 35%,#9ca0aa 60%,#5a5e68);border-radius:3px 3px 0 0}
${EOS_PILOT_CRUSH_AR} .crJawFace{inset:0;border-radius:7px 7px 4px 4px;background:linear-gradient(180deg,#b3b8c2,#767b86 45%,#4a4e57);box-shadow:0 8px 14px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.4)}
${EOS_PILOT_CRUSH_AR} .crJawFace::after{content:"";position:absolute;left:6px;right:6px;bottom:4px;height:30%;border-radius:3px;background:repeating-linear-gradient(135deg,#f0be2c 0 9px,#2a2726 9px 18px);opacity:.92}
${EOS_PILOT_CRUSH_AR} .crJawEdge{left:4px;right:4px;bottom:-3px;height:7px;border-radius:4px;opacity:0;background:linear-gradient(180deg,#ffd27a,#ff9a3c);box-shadow:0 0 14px 4px rgba(255,170,70,.7)}
${EOS_PILOT_CRUSH_AR} .crContact{left:-6px;right:-6px;bottom:-4px;height:6px;border-radius:4px;opacity:0;background:#fffbe8;box-shadow:0 0 18px 8px rgba(255,236,190,.95),0 0 46px 14px rgba(255,170,80,.6)}
${EOS_PILOT_CRUSH_AR} .crAnvil{border-radius:7px 7px 3px 3px;background:linear-gradient(180deg,#666a74,#3d4048 30%,#26282e);box-shadow:inset 0 2px 0 rgba(255,255,255,.28),0 8px 14px rgba(0,0,0,.45)}
${EOS_PILOT_CRUSH_AR} .crPips{left:50%;bottom:22%;translate:-50% 0;display:flex;gap:8px}
${EOS_PILOT_CRUSH_AR} .crPips > i{position:relative;width:10px;height:10px;border-radius:50%;background:#1b1c20;box-shadow:inset 0 1px 2px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.12);transition:background .12s,box-shadow .12s}
${EOS_PILOT_CRUSH_PIPS}{background:radial-gradient(circle at 40% 35%,#fff3c0,#ffb347 55%,#e8702a);box-shadow:0 0 10px 2px rgba(255,170,70,.75)}
${EOS_PILOT_CRUSH_AR} .crBeltBed{height:12px;overflow:hidden;background:#231d20;box-shadow:inset 0 2px 3px rgba(0,0,0,.5)}
${EOS_PILOT_CRUSH_AR} .crBelt{left:-48px;top:2px;right:0;height:7px;background:repeating-linear-gradient(90deg,#55494c 0 12px,#2b2528 12px 24px)}
${EOS_PILOT_CRUSH_AR}[data-mirror="panic"]:is([data-cs="0"],[data-cs="1"]) .crBelt{animation:crStutter 1.2s steps(3,end) infinite}
${EOS_PILOT_CRUSH_AR} .crHatch{position:absolute;border-radius:10px 10px 2px 2px;background:#140e10;box-shadow:inset 0 0 0 4px #4a3f42,inset 0 10px 16px rgba(0,0,0,.7),0 4px 8px rgba(0,0,0,.35)}
${EOS_PILOT_CRUSH_AR} .crDoor{left:5px;right:5px;top:5px;bottom:2px;transform-origin:50% 0;border-radius:6px 6px 2px 2px;background:radial-gradient(circle,#2b2c31 0 2px,transparent 2.5px) 6px 6px/14px 14px,linear-gradient(180deg,#7a7d87,#4c4f58);box-shadow:inset 0 -3px 0 rgba(0,0,0,.3)}
${EOS_PILOT_CRUSH_AR} .crQ{left:50%;top:-13px;translate:-50% 0;display:flex;gap:5px}
${EOS_PILOT_CRUSH_AR} .crQ > i{position:relative;width:7px;height:7px;border-radius:50%;background:#2a2124;box-shadow:inset 0 1px 1px rgba(0,0,0,.6)}
${EOS_PILOT_CRUSH_Q}{background:radial-gradient(circle at 40% 35%,#fff0c8,#ff8a3c 60%);box-shadow:0 0 7px rgba(255,140,60,.9)}
${EOS_PILOT_CRUSH_AR} .crTray{position:absolute;border-radius:2px 2px 9px 9px;background:linear-gradient(180deg,#5a4a48,#2f2626);box-shadow:inset 0 4px 10px rgba(255,90,40,calc(.15 + var(--k,0) * .55)),0 3px 6px rgba(0,0,0,.4)}
${EOS_PILOT_CRUSH_AR} .crEmber{width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;background:#3b2a26;transition:background .3s,box-shadow .3s}
${EOS_PILOT_CRUSH_AR} .crEmber[data-on="1"]{background:radial-gradient(circle at 40% 35%,#fff3c0,#ff9a3c 45%,#e8402a);box-shadow:0 0 10px 2px rgba(255,120,40,.8)}
${EOS_PILOT_CRUSH_AR} .crRail{width:6px;border-radius:3px;background:linear-gradient(90deg,#3a3c42,#7a7e88,#3a3c42)}
${EOS_PILOT_CRUSH_AR} .crCar{height:6px;border-radius:3px;background:linear-gradient(180deg,#9aa0aa,#55595f);box-shadow:0 2px 3px rgba(0,0,0,.4)}
${EOS_PILOT_CRUSH_AR} .crShelf{height:7px;border-radius:2px;background:linear-gradient(180deg,#8a6e5a,#56402f);box-shadow:0 4px 7px rgba(0,0,0,.35)}

/* ---- the gauge (the charge meter: --charge 0..100), the beacon */
${EOS_PILOT_CRUSH_AR} .crGauge{position:absolute;border-radius:50%;background:#3a2e2c;box-shadow:0 0 0 3px #2a2224,0 4px 8px rgba(0,0,0,.45)}
${EOS_PILOT_CRUSH_AR} .crGaugeRing{inset:-6px;border-radius:50%;background:conic-gradient(from -120deg,#ffcf6a 0 calc(var(--charge,0) * 2.4deg),rgba(255,255,255,.08) 0 240deg,transparent 0);-webkit-mask:radial-gradient(closest-side,transparent 80%,#000 82%);mask:radial-gradient(closest-side,transparent 80%,#000 82%)}
${EOS_PILOT_CRUSH_AR}[data-phase="big"] .crGaugeRing{filter:drop-shadow(0 0 6px rgba(255,200,90,.9))}
${EOS_PILOT_CRUSH_AR} .crGaugeFace{inset:3px;border-radius:50%;background:conic-gradient(from 60deg,#e2483a 0 60deg,transparent 0),radial-gradient(circle,#f4ecdc 0 58%,#c9bba8 70%);-webkit-mask:radial-gradient(circle,#000 0 99%);mask:radial-gradient(circle,#000 0 99%)}
${EOS_PILOT_CRUSH_AR} .crGaugeFace::after{content:"";position:absolute;inset:16%;border-radius:50%;background:radial-gradient(circle,#f4ecdc 0 70%,#e7dcc8)}
${EOS_PILOT_CRUSH_AR} .crNeedleBase{left:50%;top:50%;width:0;height:0;transition:rotate .25s cubic-bezier(.2,.8,.3,1.2)}
${EOS_PILOT_CRUSH_AR} .crNeedle{left:-1.5px;bottom:0;width:3px;height:calc(var(--gn,1) * 18px);border-radius:2px;background:#b5241b;transform-origin:50% 100%}
${EOS_PILOT_CRUSH_AR} .crNeedle::after{content:"";position:absolute;left:-3px;bottom:-4px;width:9px;height:9px;border-radius:50%;background:#2a2224}
${EOS_PILOT_CRUSH_AR}[data-mirror="anger"]:is([data-cs="0"],[data-cs="1"]) .crNeedle{animation:crRattle .11s linear infinite alternate}
${EOS_PILOT_CRUSH_AR}[data-mirror="anxious"]:is([data-cs="0"],[data-cs="1"]) .crNeedle{animation:crTwitch 1.7s steps(1,end) infinite}
${EOS_PILOT_CRUSH_AR} .crGlass{inset:2px;border-radius:50%;background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.6),rgba(255,255,255,.08) 38%,rgba(255,255,255,0) 60%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.22)}
${EOS_PILOT_CRUSH_AR} .crGauge[data-popped="1"] .crGlass{opacity:0}
${EOS_PILOT_CRUSH_AR} .crBeacon{width:24px;height:15px;margin:-15px 0 0 -12px;border-radius:12px 12px 3px 3px;background:radial-gradient(circle at 50% 70%,#6a6266,#3a3236)}
${EOS_PILOT_CRUSH_AR} .crBeaconLit{inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 70%,#ffd0c8,#f0301e 55%,#951208);box-shadow:0 0 14px 3px rgba(255,50,30,.7);opacity:clamp(0,1 - var(--calm,0) * 1.5,1);transition:opacity var(--calm-ms,600ms) ease}
${EOS_PILOT_CRUSH_AR} .crBeaconBeam{left:50%;top:70%;width:var(--bw);height:var(--bw);margin:calc(var(--bw) / -2) 0 0 calc(var(--bw) / -2);border-radius:50%;opacity:clamp(0,1 - var(--calm,0) * 1.5,1);transition:opacity var(--calm-ms,600ms) ease;
  background:conic-gradient(from 0deg,transparent 0deg,rgba(255,60,40,.2) 14deg,transparent 34deg,transparent 180deg,rgba(255,60,40,.2) 194deg,transparent 214deg);-webkit-mask:radial-gradient(closest-side,#000,transparent);mask:radial-gradient(closest-side,#000,transparent);animation:crSpin var(--bspin,1.2s) linear infinite}
${EOS_PILOT_CRUSH_AR}[data-mirror="panic"] .crBeaconBeam{--bspin:.6s}
${EOS_PILOT_CRUSH_AR}[data-mirror="sad"] .crBeaconBeam{--bspin:2.4s}
${EOS_PILOT_CRUSH_AR}[data-mirror="anxious"] .crBeaconBeam{--bspin:1.5s}
${EOS_PILOT_CRUSH_AR}[data-cs="2"] .crBeaconBeam,${EOS_PILOT_CRUSH_AR}[data-cs="3"] .crBeaconBeam{animation:none;opacity:0}

/* ---- the blob: red-hot jelly around the F8 picture + the player's own words (inside) */
${EOS_PILOT_CRUSH_AR} .crBlob{position:absolute;transform-origin:50% 50%;will-change:transform}
${EOS_PILOT_CRUSH_AR} :is(.crMot,.crAct,.crBreath,.crSquash){position:absolute;inset:0}
${EOS_PILOT_CRUSH_AR} :is(.crAct,.crBreath,.crSquash){transform-origin:50% 100%}
${EOS_PILOT_CRUSH_AR} .crHalo{inset:-12%;border-radius:50%;opacity:calc(var(--heat,0) * .9);transition:opacity .25s ease;background:radial-gradient(closest-side,hsl(var(--h0) 100% 58% / .55),hsl(var(--h0) 100% 50% / 0))}
${EOS_PILOT_CRUSH_AR} .crJelly{inset:0;border-radius:50% 50% 47% 47%/55% 55% 45% 45%;overflow:hidden;box-shadow:inset 0 -12px 20px rgba(0,0,0,.28),inset 0 6px 12px rgba(255,255,255,.18),0 10px 18px rgba(0,0,0,.38)}
${EOS_PILOT_CRUSH_AR} .crJellyCalm{inset:0;background:radial-gradient(circle at 36% 28%,hsl(var(--h1) 90% 90%) 0 7%,hsl(var(--h1) 62% 68%) 30%,hsl(var(--h1) 54% 48%) 76%,hsl(var(--h1) 58% 34%))}
${EOS_PILOT_CRUSH_AR} .crJellyHot{inset:0;opacity:var(--heat,0);transition:opacity .25s ease;background:radial-gradient(circle at 36% 28%,hsl(var(--h0) 100% 90%) 0 7%,hsl(var(--h0) var(--s0) 62%) 30%,hsl(var(--h0) var(--s0) 46%) 76%,hsl(var(--h0) var(--s0) 30%))}
${EOS_PILOT_CRUSH_AR} .crGloss{left:15%;top:8%;width:36%;height:20%;border-radius:50%;rotate:-22deg;background:radial-gradient(closest-side,rgba(255,255,255,.7),rgba(255,255,255,0))}
${EOS_PILOT_CRUSH_AR} :is(.crArm,.crFoot){border-radius:50%;background:hsl(var(--h1) 56% 52%);box-shadow:inset 0 -3px 5px rgba(0,0,0,.25)}
${EOS_PILOT_CRUSH_AR} :is(.crArm,.crFoot)::after{content:"";position:absolute;inset:0;border-radius:inherit;background:hsl(var(--h0) var(--s0) 50%);opacity:var(--heat,0);transition:opacity .25s ease}
${EOS_PILOT_CRUSH_AR} .crArm{top:50%;width:21%;height:14%;transition:transform .14s cubic-bezier(.3,.7,.3,1.25)}
${EOS_PILOT_CRUSH_AR} .crArm.l{left:-10%;transform-origin:92% 50%;transform:rotate(-26deg)}
${EOS_PILOT_CRUSH_AR} .crArm.r{right:-10%;transform-origin:8% 50%;transform:rotate(26deg)}
${EOS_PILOT_CRUSH_AR} .crFoot{bottom:-4%;width:23%;height:12%}
${EOS_PILOT_CRUSH_AR} .crFoot.l{left:20%}
${EOS_PILOT_CRUSH_AR} .crFoot.r{right:20%}
${EOS_PILOT_CRUSH_AR} [data-pose="brace"] .crArm.l{transform:translate(42%,-290%) rotate(78deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="brace"] .crArm.r{transform:translate(-42%,-290%) rotate(-78deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="fists"] .crArm.l{transform:translate(20%,-150%) rotate(58deg) scale(1.12)}
${EOS_PILOT_CRUSH_AR} [data-pose="fists"] .crArm.r{transform:translate(-20%,-150%) rotate(-58deg) scale(1.12)}
${EOS_PILOT_CRUSH_AR} [data-pose="sag"] .crArm.l{transform:translate(18%,70%) rotate(-62deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="sag"] .crArm.r{transform:translate(-18%,70%) rotate(62deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="peek"] .crArm.l{transform:translate(48%,-170%) rotate(84deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="peek"] .crArm.r{transform:translate(-48%,-170%) rotate(-84deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="cradle"] .crArm.l{transform:translate(70%,95%) rotate(-12deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="cradle"] .crArm.r{transform:translate(-70%,95%) rotate(12deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="wave"] .crArm.r{transform:translate(-30%,-200%) rotate(-70deg)}
${EOS_PILOT_CRUSH_AR} [data-pose="wave"] .crArm.l{transform:rotate(-26deg)}
${EOS_PILOT_CRUSH_AR} .crWisp{top:-14%;width:22%;height:26%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.55),rgba(255,255,255,0));opacity:0;animation:crWisp 1.7s ease-out infinite}
${EOS_PILOT_CRUSH_AR} .crWisp.a{left:28%}
${EOS_PILOT_CRUSH_AR} .crWisp.b{left:54%;animation-delay:-.85s}
${EOS_PILOT_CRUSH_AR} .crSweat{top:30%;width:7%;height:10%;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;background:linear-gradient(180deg,#e6f6ff,#8cc8f0);opacity:0;animation:crSweat 1.3s ease-in infinite}
${EOS_PILOT_CRUSH_AR} .crSweat.a{left:6%}
${EOS_PILOT_CRUSH_AR} .crSweat.b{right:8%;animation-delay:-.6s}
${EOS_PILOT_CRUSH_AR} .crDizzy{left:50%;top:-8%;width:56%;height:18%;margin-left:-28%;opacity:0;transition:opacity .2s}
${EOS_PILOT_CRUSH_AR} .crDizzy > i{width:10px;height:10px;margin:-5px;background:#ffe27a;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)}
${EOS_PILOT_CRUSH_AR} .crDizzy > i:nth-child(1){left:0;top:50%}
${EOS_PILOT_CRUSH_AR} .crDizzy > i:nth-child(2){left:100%;top:50%}
${EOS_PILOT_CRUSH_AR} .crDizzy > i:nth-child(3){left:50%;top:0}
${EOS_PILOT_CRUSH_AR} .crBlob[data-dizzy="1"] .crDizzy{opacity:1;animation:crSpin 1s linear infinite}
${EOS_PILOT_CRUSH_AR} .crUnder{inset:0;border-radius:50%;opacity:0;transition:opacity .26s ease;background:radial-gradient(70% 55% at 50% 100%,rgba(255,214,140,.7),rgba(255,180,90,0) 70%);z-index:7}
${EOS_PILOT_CRUSH_AR}[data-core="1"] .crUnder{opacity:.6}
${EOS_PILOT_CRUSH_AR} .crBlob ts-face-text{transition:opacity .2s}
${EOS_PILOT_CRUSH_AR}[data-mirror="panic"] .crBlob:not([data-hero]) .crMot{animation:crTremble .111s linear infinite alternate}
${EOS_PILOT_CRUSH_AR}[data-mirror="anger"] .crBlob:not([data-hero]) .crMot{animation:crShove 1.6s ease-out infinite}
${EOS_PILOT_CRUSH_AR}[data-mirror="sad"] .crBlob:not([data-hero]) .crMot{animation:crSag 3.8s ease-in-out infinite alternate}
${EOS_PILOT_CRUSH_AR}[data-mirror="anxious"] .crBlob:not([data-hero]) .crMot{animation:crDrift 2.6s ease-in-out infinite}

/* ---- the gallery (cast members: positive picture only) */
${EOS_PILOT_CRUSH_AR} .crFan{position:absolute}
${EOS_PILOT_CRUSH_AR} :is(.crFanMove,.crFanAct){position:absolute;inset:0;transform-origin:50% 100%}

/* ---- the finale: the red-hot mass, the amber cube (an egg), the warm core */
${EOS_PILOT_CRUSH_AR} .crMass{opacity:0;border-radius:46% 54% 40% 60%/62% 52% 48% 38%;background:radial-gradient(circle at 40% 34%,#fff2c2,#ffab4a 28%,#e8452a 62%,#8e1d14);box-shadow:0 0 22px 6px rgba(255,90,40,.6)}
${EOS_PILOT_CRUSH_AR} .crCube{opacity:0;transform-origin:50% 100%}
${EOS_PILOT_CRUSH_AR} .crCubeBody{inset:0}
${EOS_PILOT_CRUSH_AR} .crShell{top:0;bottom:0;width:50%;background:linear-gradient(160deg,#ffe2a0,#f2a43a 45%,#b8641c);box-shadow:inset 0 0 0 2px rgba(255,240,200,.5)}
${EOS_PILOT_CRUSH_AR} .crShell.l{left:0;border-radius:10px 2px 2px 10px;transform-origin:0 100%}
${EOS_PILOT_CRUSH_AR} .crShell.r{right:0;border-radius:2px 10px 10px 2px;transform-origin:100% 100%;background:linear-gradient(200deg,#ffe8b0,#e89834 45%,#a8581a)}
${EOS_PILOT_CRUSH_AR} .crCubeGlow{inset:-30%;border-radius:50%;opacity:.35;background:radial-gradient(closest-side,rgba(255,226,150,.9),rgba(255,170,60,0))}
${EOS_PILOT_CRUSH_AR} .crCrack{height:3px;margin-top:-1.5px;opacity:0;transform-origin:0 50%;border-radius:2px;background:#fffbe8;box-shadow:0 0 8px 3px rgba(255,236,170,.95),0 0 26px 8px rgba(255,200,100,.55)}
${EOS_PILOT_CRUSH_AR} .crCore{opacity:0}
${EOS_PILOT_CRUSH_AR} .crCore::before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 38% 34%,#fffdf0,#ffe08a 34%,#ffb347 70%,#f08a2a);box-shadow:0 0 18px 6px rgba(255,200,100,.8),0 0 48px 18px rgba(255,170,70,.45)}
${EOS_PILOT_CRUSH_AR} .crCoreGlow{inset:-60%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,224,150,.55),rgba(255,190,90,0))}
${EOS_PILOT_CRUSH_AR}[data-phase="finale"] .crCoreGlow{animation:crBeat 1.1s ease-in-out infinite}

/* ---- the workshop cat */
${EOS_PILOT_CRUSH_AR} .crCat{position:absolute;transform-origin:50% 100%}
${EOS_PILOT_CRUSH_AR} .crCatTail{right:-4%;bottom:6%;width:40%;height:20%;border-radius:8px;background:#c47a34;transform-origin:0 50%;rotate:-26deg;transition:rotate .25s}
${EOS_PILOT_CRUSH_AR} .crCatBody{left:16%;bottom:0;width:70%;height:54%;border-radius:50% 50% 42% 42%/70% 70% 30% 30%;transform-origin:50% 100%;background:repeating-linear-gradient(90deg,transparent 0 6px,rgba(150,74,20,.3) 6px 9px),linear-gradient(180deg,#eda85c,#c3772f);box-shadow:inset 0 -3px 4px rgba(0,0,0,.2)}
${EOS_PILOT_CRUSH_AR} .crCatHead{left:0;bottom:4%;width:42%;height:52%;border-radius:50% 50% 46% 46%;background:radial-gradient(circle at 50% 70%,#f6c99a 0 30%,transparent 32%),#e9a356;transition:transform .2s cubic-bezier(.3,.7,.3,1.3)}
${EOS_PILOT_CRUSH_AR} .crCatEar{top:-26%;width:36%;height:42%;background:#d98d45;clip-path:polygon(50% 0,100% 100%,0 100%);transition:transform .2s}
${EOS_PILOT_CRUSH_AR} .crCatEar.l{left:2%;rotate:-14deg}
${EOS_PILOT_CRUSH_AR} .crCatEar.r{right:2%;rotate:14deg;transform-origin:50% 100%}
${EOS_PILOT_CRUSH_AR} .crCatEye{top:44%;width:22%;height:9%;border-radius:2px;background:#3a2412;transition:height .15s}
${EOS_PILOT_CRUSH_AR} .crCatEye.l{left:16%}
${EOS_PILOT_CRUSH_AR} .crCatEye.r{right:16%}
${EOS_PILOT_CRUSH_AR} .crCatNose{left:44%;top:62%;width:12%;height:9%;border-radius:50%;background:#b0485a}
${EOS_PILOT_CRUSH_AR} .crCatPaw{left:4%;bottom:-2%;width:20%;height:16%;border-radius:50%;background:#f0b878;transform-origin:80% 50%}
${EOS_PILOT_CRUSH_AR} .crCat .crUnder{inset:-10%;border-radius:40%}
${EOS_PILOT_CRUSH_AR} .crCat:is([data-cat="glare"],[data-cat="up"]) .crCatEye{height:26%;top:36%;border-radius:50%;background:radial-gradient(ellipse at 50% 50%,#141010 0 26%,#ffd84a 30%)}
${EOS_PILOT_CRUSH_AR} .crCat[data-cat="glare"] .crCatHead{transform:translateY(-34%) rotate(10deg)}
${EOS_PILOT_CRUSH_AR} .crCat[data-cat="up"] .crCatHead{transform:translateY(-52%)}
${EOS_PILOT_CRUSH_AR} .crCat[data-cat="up"] .crCatBody{transform:scaleY(1.3)}
${EOS_PILOT_CRUSH_AR} .crCat[data-cat="up"] .crCatTail{rotate:-70deg}
${EOS_PILOT_CRUSH_AR} .crCat[data-cat="curl"] .crCatHead{transform:translate(22%,4%) rotate(-12deg)}
${EOS_PILOT_CRUSH_AR} .crCat[data-cat="curl"] .crCatTail{rotate:-160deg}

@keyframes crSpin{to{transform:rotate(360deg)}}
@keyframes crLeak{0%{transform:translateY(4px) scale(.4);opacity:0}30%{opacity:.8}100%{transform:translateY(-16px) scale(1.4);opacity:0}}
@keyframes crPulse{from{transform:scale(1)}to{transform:scale(1.08)}}
@keyframes crAlarm{0%{opacity:0}50%{opacity:.04}}
@keyframes crDrip{0%{transform:translateY(0) scale(.6);opacity:0}12%{opacity:.9;transform:translateY(0) scale(1)}80%{transform:translateY(var(--fall,120px));opacity:.9}81%,100%{transform:translateY(var(--fall,120px)) scale(1.6,.3);opacity:0}}
@keyframes crSwing{from{rotate:8deg}to{rotate:20deg}}
@keyframes crZap{0%,62%,70%,92%,100%{transform:scale(.5)}64%,94%{transform:scale(1.5)}}
@keyframes crFlick{0%{opacity:0}38%{opacity:.04}44%{opacity:0}72%{opacity:.03}76%{opacity:0}}
@keyframes crStutter{0%{transform:translateX(0)}100%{transform:translateX(24px)}}
@keyframes crRattle{from{transform:rotate(calc(-3deg * var(--mot,1)))}to{transform:rotate(calc(3deg * var(--mot,1)))}}
@keyframes crTwitch{0%{transform:none}30%{transform:rotate(-14deg)}34%{transform:none}70%{transform:rotate(9deg)}74%{transform:none}}
@keyframes crWisp{0%{transform:translateY(10px) scale(.5);opacity:0}25%{opacity:calc(var(--heat,0) * .8)}100%{transform:translateY(-26px) scale(1.4);opacity:0}}
@keyframes crSweat{0%{transform:translateY(0) scale(.6);opacity:0}20%{opacity:calc(var(--heat,0) * .9)}100%{transform:translateY(36px) scale(1);opacity:0}}
@keyframes crTremble{from{transform:translateX(calc(-1.5px * var(--mot,1)))}to{transform:translateX(calc(1.5px * var(--mot,1)))}}
@keyframes crShove{0%,100%{transform:none}6%{transform:translateX(calc(5px * var(--mot,1))) rotate(calc(3deg * var(--mot,1))) scale(calc(1 + .012 * var(--mot,1)),calc(1 - .012 * var(--mot,1)))}14%{transform:none}}
@keyframes crSag{from{transform:none}to{transform:translateY(calc(3px * var(--mot,1))) scale(1,calc(1 - .018 * var(--mot,1)))}}
@keyframes crDrift{0%,100%{transform:none}25%{transform:translate(calc(3px * var(--mot,1)),calc(-2px * var(--mot,1)))}50%{transform:none}75%{transform:translate(calc(-3px * var(--mot,1)),calc(-2px * var(--mot,1)))}}
@keyframes crBeat{0%,100%{transform:scale(1);opacity:.8}18%{transform:scale(1.14);opacity:1}36%{transform:scale(1.02)}52%{transform:scale(1.1)}}
@media (prefers-reduced-motion:reduce){
${EOS_PILOT_CRUSH_AR} :is(.crMot,.crWisp,.crSweat,.crDizzy,.crLeak,.crBeaconBeam,.crBelt,.crNeedle,.crVent > i,.crDrip,.crWire,.crFlick,.crAlarm,.crFurnace,.crCoreGlow){animation:none!important}
}
${EOS_PILOT_CRUSH_AR}[data-eos-pilot-reduced="1"] :is(.crMot,.crWisp,.crSweat,.crDizzy,.crLeak,.crBeaconBeam,.crBelt,.crNeedle,.crVent > i,.crDrip,.crWire,.crFlick,.crAlarm,.crFurnace,.crCoreGlow){animation:none!important}
`
eosCss("pilot-crush", EOS_PILOT_CRUSH_CSS)
