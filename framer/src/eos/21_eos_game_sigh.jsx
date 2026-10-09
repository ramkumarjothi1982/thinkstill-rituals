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
const EOS_SIGH_FULL_MS = 900 //                    still holding at 100 % → the exhale starts by itself (no breath-hold at the top)
const EOS_SIGH_PUFF_MS = 450 //                    early lift: the little puff drains back
const EOS_SIGH_SLIDE_PX = 24 //                    sip slide threshold (CSS px ÷ stage scale)
const EOS_SIGH_DONE_DELAY = 450 //                 onDone after 100 %
const EOS_SIGH_TIP_MS = 7000 //                    the once-per-device "dizzy or tingly?" line
// The finale is a first-class state that plays BEFORE progress reaches 100 (the wrapper's reward card comes after it):
// 0 ms orb blooms into a sun, the sun breaks the horizon · 200 ms SYNC lifts off the island and floats along an arc
// to the moon (which glides into the open sky and grows) · 1750 ms SYNC lands and yawns · 2150 ms curls up asleep ·
// 2600 ms progress 100 + sfx("win") · +450 ms onDone.
const EOS_SIGH_FIN = { land: 1750, sleep: 2150, end: 2600 }
const EOS_SIGH_FIN_PROG = 96 //                    progress held here while the finale plays

// ---------------------------------------------------------------- scene data
// Cloud slots: side = drift direction (out to sea). sx = x in the SIDE layout (one row of six, arena ≥ 720 px);
// px/prow = x and row in the STACK layout (3 + 3, arena < 720 px). In the stack layout slot 5 is SYNC's own storm
// cloud: it hangs right behind SYNC's head, carries no word and leaves with its pair.
const EOS_SIGH_SLOTS = [
    { side: -1, sx: 24, px: 17, prow: "A", s: 1 },
    { side: -1, sx: 40, px: 17, prow: "B", s: 0.95 },
    { side: 1, sx: 60, px: 83, prow: "A", s: 0.97 },
    { side: 1, sx: 76, px: 83, prow: "B", s: 1 },
    { side: -1, sx: 8, px: 50, prow: "A", s: 0.9 },
    { side: 1, sx: 92, px: 50, prow: "B", s: 0.92 },
]
const EOS_SIGH_PLAIN = 5 //                        the word-less cloud behind SYNC in the stack layout
// Per variant: the cloud pairs in leaving order (one drifts left, one right). Words fill them in this order.
const EOS_SIGH_PAIRS = [
    [[0, 3], [4, 5], [1, 2]],
    [[1, 2], [4, 3], [0, 5]],
    [[4, 5], [1, 3], [0, 2]],
]
// Per variant: which side SYNC's island takes in the side layout (-1 left, 1 right; the moon goes opposite), and the
// sun / moon x (% of the arena width) in the stack layout (the island is centred there).
const EOS_SIGH_LAYOUT = [
    { side: -1, sun: 32, moon: 93 },
    { side: 1, sun: 66, moon: 7 },
    { side: -1, sun: 35, moon: 93 },
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
    // night still ends warm: a moonlit gold horizon over most of the lower sky and a bright sea glint
    night: { sky: ["#2d3f92", "#b884bd", "#ffc874"], sea: ["#eaa77c", "#26336f"], sun: ["#fff3cc", "#ffbe55"] },
}
// SYNC's faces: storm → first sigh → happy (seeded) → asleep on the moon (the arcade's own cast, no new art).
const EOS_SIGH_FACE = { start: 44, first: 48, happy: [61, 63, 70, 80], asleep: 90 }
// Thought-dust motes that rush into the orb on every inhale (pre-mounted pool).
const EOS_SIGH_MOTES = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.4
    const r = 150 + (i % 3) * 46
    return { mx: Math.round(Math.cos(a) * r), my: Math.round(Math.sin(a) * r * 0.7 - 40), md: (i % 5) * 0.14 }
})
// Wind gusts that carry the exhale out to sea (pre-mounted; transform-only, so the exhale never repaints the sky).
const EOS_SIGH_GUSTS = [
    { r: -148, d: 0.42, dl: 0, w: 1 },
    { r: -166, d: 0.5, dl: 0.36, w: 0.62 },
    { r: -131, d: 0.34, dl: 0.7, w: 0.78 },
    { r: -32, d: 0.42, dl: 0.14, w: 1 },
    { r: -14, d: 0.5, dl: 0.5, w: 0.62 },
    { r: -49, d: 0.34, dl: 0.84, w: 0.78 },
]
// SYNC's own breath wisps (out of the mouth toward the leaving clouds): angle, delay (fraction of a third of D).
const EOS_SIGH_WISPS = [
    { r: -152, dl: 0 },
    { r: -28, dl: 0.18 },
    { r: -118, dl: 0.4 },
    { r: -62, dl: 0.58 },
]
const EOS_SIGH_SPARKS = Array.from({ length: 12 }, (_, i) => ({ a: i * 30 + (i % 2) * 9, r: 96 + (i % 3) * 22 }))
// Cue copy (§2 rules: no clinical words, no "just breathe" / "relax" / "calm down"). [main, sub]. Every main line keeps
// the verb, and every line fits ONE line at 390 px (the layout reserves exactly main + one sub/tip line).
const EOS_SIGH_CUES = {
    start: ["Hold the orb · breathe in", "in through your nose"],
    again: ["Again · hold and breathe in", "in through your nose"],
    in: ["in through the nose…", ""],
    ready: ["…one more sip ↑", "slide up while you hold"],
    sip: ["one more sip…", ""],
    full: ["now let go · slowly out", ""],
    out: ["slowly out through the mouth…", "like through a straw"],
    out1: ["slowly out through the mouth…", "like through a straw · no rush"],
    puff: ["Hold the orb a little longer", "bigger breath in, then let go"],
    easy: ["Tap the orb · we breathe together", "the slow out is what matters"],
    done: ["the storm has passed", "SYNC floats up to the moon…"],
    sleep: ["the storm has passed", "SYNC is fast asleep"],
}
const EOS_SIGH_TIP = "Dizzy or tingly? Breathe as usual."
const EOS_SIGH_LABEL = { hold: "HOLD · BREATHE IN", sip: "SIP ONCE MORE", out: "LET IT OUT SLOWLY", done: "STORM PASSED" }
const EOS_SIGH_ARIA = "Breath orb. Press and hold to breathe in, slide up for one more sip, then let go to breathe out slowly."
// Chunks made only of these (or of ≤ 2 characters) are filler, not "your words" ("at", "and I").
const EOS_SIGH_STOP = new Set(
    "a an the and or but so at in on of to for with by from as is am are was were be been being i me my mine myself it its it's im i'm i've ive id i'd this that these those just very really too about up out into over if then than when not no do does did have has had will would could should can".split(" ")
)

// Dev/test handle: window.__eos.sigh.state() (window.__eos exists only in dev, core gate).
let eosSighLive = null
function eosSighNow() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()
}
// Measured layout (the arena is rarely the viewport: Framer frames, the arcade HUD and guide). Two compositions:
//  STACK (arena < 720 px, phone first): clouds 3 + 3 on top → SYNC's island centred on the horizon → the cue →
//    a clear 44 px lane (the arrows label lands here, never on SYNC) → the orb at the bottom of the safe box.
//  SIDE (arena ≥ 720 px): one row of six clouds; SYNC's island stands to one side on the horizon; the cue, the
//    lane and the orb share the centre column, so a short laptop arena (1280×720) still gets a big SYNC.
// The cue box is reserved at its real maximum (main line + one sub/tip line; every cue is single-line per row).
// SYNC's reserve includes its breath growth (×1.12) and the anticipation hop. Returns px CSS variables.
function eosSighLayout(W, H, safeTop, safeBottom, v) {
    const boxH = Math.max(240, H - safeTop - safeBottom)
    const narrow = W < 560
    const side = W >= 720
    const lane = 44
    const cueH = narrow ? 50 : 56
    const LV = EOS_SIGH_LAYOUT[v] || EOS_SIGH_LAYOUT[0]
    let cw, cbh, rowA, rowB, os, sy, hz, islx, sunx, moonx
    if (side) {
        cw = Math.round(Math.min(196, W * 0.148))
        cbh = W >= 1000 ? 56 : 48
        rowA = Math.round(cw * 0.2)
        rowB = rowA
        const cB = rowA + cbh + 12 // a 2-line word grows the body
        os = Math.round(eosClamp(boxH * 0.34, 96, 170))
        while (os > 84 && boxH - 6 - os - lane - cueH < cB + 8) os -= 4
        const syncTop = cB + 12
        sy = Math.round(eosClamp(Math.min(W * 0.072, (boxH - 16 - syncTop) / 1.38), 56, 104))
        hz = Math.round(syncTop + 1.26 * sy + 2)
        const off = Math.min(W / 2 - sy - 10, Math.max(180 + 18 + sy, W * 0.25)) // clear of the centre column
        islx = Math.round(W / 2 + LV.side * off)
        sunx = Math.round(W / 2)
        moonx = Math.round(W / 2 - LV.side * W * 0.36)
    } else {
        cw = Math.round(narrow ? eosClamp((W - 12) / 3, 92, 118) : eosClamp((W - 24) / 3, 120, 180))
        cbh = narrow ? 36 : 44
        const bodyMax = cbh + 10
        rowA = Math.round(cw * 0.2)
        rowB = rowA + bodyMax + 4
        const syncTop = rowA + bodyMax + 10 // only row A's centre cloud is above SYNC (row B's centre is SYNC's own, behind it)
        const fitSy = (o) => (boxH - 6 - o - lane - cueH - 4 - syncTop) / 1.38
        os = Math.round(Math.min(eosClamp(boxH * 0.26, 88, narrow ? 110 : 140), W * 0.3))
        while (fitSy(os) < 70 && os > 88) os -= 4
        sy = Math.round(eosClamp(fitSy(os), 44, narrow ? 84 : 100))
        hz = Math.round(boxH - 6 - os - lane - cueH - 4 - 0.12 * sy)
        islx = Math.round(W / 2)
        sunx = Math.round((W * LV.sun) / 100)
        moonx = Math.round((W * LV.moon) / 100)
    }
    const mn = narrow ? 50 : 66
    // phone: the orb sits right of centre (thumb side) so the arrows label finds a clean slot on its LEFT instead of
    // stacking above the orb onto the cue / SYNC; the pips keep their place on the orb's right
    const orbx = narrow ? Math.round(Math.min(W - 46 - os / 2, Math.max(W / 2, os / 2 + 180))) : Math.round(W / 2)
    return {
        narrow,
        side,
        W: Math.round(W),
        H: Math.round(H),
        safeTop,
        rowA,
        sy,
        vars: { "--aw": `${Math.round(W)}px`, "--os": `${os}px`, "--cw": `${cw}px`, "--cbh": `${cbh}px`, "--rowA": `${rowA}px`, "--rowB": `${rowB}px`, "--hzpx": `${hz}px`, "--sy": `${sy}px`, "--mn": `${mn}px`, "--sun": `${narrow ? 104 : 150}px`, "--lane": `${lane}px`, "--islx": `${islx}px`, "--sunx": `${sunx}px`, "--moonx": `${moonx}px`, "--orbx": `${orbx}px` },
    }
}
// Cloud captions: the user's own meaningful chunks (filler-only chunks such as "at" / "and I" are dropped; when fewer
// than 3 remain the feeling's seeds pad them; eosWords already swaps in neutral words under a strong safety flag).
function eosSighWords(entries) {
    const raw = eosWords(entries, 8).filter((w) => w && !/uploaded image/i.test(w))
    const meaningful = raw.filter((w) => {
        const s = String(w)
        if (s.replace(/\s+/g, "").length <= 2) return false
        const toks = s.toLowerCase().replace(/[.,!?;:"“”()…]/g, " ").split(/\s+/).filter(Boolean)
        return toks.some((t) => !EOS_SIGH_STOP.has(t))
    })
    const list = meaningful.length ? meaningful : raw
    if (list.length < 3) {
        const emo = EOS_EMO[eosCurrentEmotion()] || EOS_EMO.panic
        for (const sd of emo.seeds || []) {
            if (list.length >= 3) break
            if (!list.some((x) => String(x).toLowerCase() === String(sd).toLowerCase())) list.push(sd)
        }
    }
    return list.slice(0, 6)
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
    const syncRef = React.useRef(null)
    const geoRef = React.useRef(null)
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
            storm: EOS_SIGH_STORMS[(seed + Math.floor(seed / 3)) % 3],
            day: eosDayPart(),
            happy: EOS_SIGH_FACE.happy[seed % EOS_SIGH_FACE.happy.length],
        }
    }, [])
    const words = React.useMemo(() => eosSighWords(entries), [(entries || []).join("|")])
    const thumbs = hasUserImages ? (imageSources || []).filter(Boolean).slice(0, 6) : []

    // ---- UI state (few changes per breath; per-frame values live in refs + the --f CSS variable)
    const [ui, setUi] = React.useState({
        phase: "idle", // idle · in · ready · sip · full · out · puff · finale · done
        done: 0, //       completed sighs
        clr: 0, //        how clear the sky is (0 storm → 1 dawn)
        gone: [], //      cloud slots that left
        cue: "start",
        n1: false,
        n2: false,
        face: EOS_SIGH_FACE.start,
        pop: "", //       face-change squash toggle
        slump: "", //     SYNC's relieved slump at the end of every sigh (a/b restarts the CSS animation)
        bloom: "", //     sigh-complete burst toggle (a/b restarts the CSS animation without remounting)
        big: false,
        puff: "",
        wind: "",
        fin: "", //       finale beat: fly · yawn · sleep
        D: 4500,
        tip: false,
        easy: false,
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
            pendingOut: false, // let go (or guided): exhale as soon as the breath is full
            earlySip: false, //  ↑ / 2nd finger during inhale 1 → the sip plays at 72 %
            early: 0, //       consecutive early lifts
            puffs: 0, //       total early lifts (bonus)
            easy: false, //    after 2 early lifts: guided sighs (any touch starts a whole sigh)
            owned: false, //   this engine currently holds the shared breath pacer
            D: 4500,
            prog: -1,
            count: null,
            doneSent: false,
            lastAck: 0,
            ab: { bloom: 0, puff: 0, wind: 0, pop: 0, sq: 0, ack: 0, slump: 0 },
            timers: [],
            sfxLog: [], //     kinds only (dev handle; never words)
            plog: [], //       every onProgress value
            tipUntil: 0,
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
        // the shared breath pacer (tracked, so unmount releases it only while this engine still holds it)
        own(phase, ms) {
            S.current.owned = phase != null
            eosBreathOwn(phase, ms)
        },
        toggle(key) {
            const s = S.current
            s.ab[key] = (s.ab[key] + 1) % 2
            return s.ab[key] ? "a" : "b"
        },
        count(n) {
            S.current.count = n
            const w = orbRef.current
            if (w) w.style.setProperty("--n", String(n))
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
        later(ms, fn) {
            const s = S.current
            s.timers.push(
                setTimeout(() => {
                    if (s.alive) fn()
                }, ms)
            )
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
        s.earlySip = false
        go("in", { cue: "in", n1: false, n2: false })
        const left = Math.max(300, ((EOS_SIGH_TOP - s.f0) / EOS_SIGH_TOP) * EOS_SIGH_IN_MS)
        fx.count(Math.ceil(left / 1000))
        fx.own("in", left)
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
        fx.own("hold", EOS_SIGH_AUTO_SIP_MS)
        eosHaptic("notch")
        eosTone(eosNote(5, 262), 110, { type: "triangle", gain: 0.04 })
        fx.report(base() + 6, EOS_SIGH_LABEL.sip)
        // guided sigh (let go early in easy mode) or an early ↑ / 2nd finger → the sip plays now
        if (s.pendingOut || s.earlySip) return sip()
        // slid up early (during inhale 1) → that slide counts now
        const k = eosStageScale(rootRef.current) || 1
        if (s.pointer != null && s.pointer !== "key" && (s.lowY - s.lastY) / k >= EOS_SIGH_SLIDE_PX) sip()
    }
    const sip = () => {
        const s = S.current
        if (s.phase !== "ready" && s.phase !== "in") return
        s.f0 = s.f
        s.earlySip = false
        go("sip", { cue: "sip", n1: true })
        fx.own("in", EOS_SIGH_SIP_MS)
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
            fx.own("hold", EOS_SIGH_FULL_MS)
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
        const wind = fx.toggle("wind") // side effects stay OUTSIDE the state updater
        setUi((u) => ({
            ...u,
            phase: "out",
            cue: c === 0 ? "out1" : "out",
            D,
            clr: Math.min(1, (c + 1) / setup.n),
            gone: u.gone.concat(leaving.filter((x) => !u.gone.includes(x))),
            wind,
            n1: true,
            n2: true,
        }))
        s.phase = "out"
        s.t0 = eosSighNow()
        fx.count(Math.ceil(D / 1000))
        fx.own("out", D)
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
        go("puff", { cue: s.easy ? "easy" : "puff", puff: fx.toggle("puff"), n1: false, easy: s.easy })
        fx.own("hold", 0)
        eosTone(220, 180, { type: "sine", gain: 0.03, glide: 180 })
        eosHaptic("touch")
    }
    // where SYNC flies at the finale: the moon glides into the open sky (where the clouds were) and grows; SYNC lands
    // in its hollow. Measured once, as px CSS variables, so the flight is two transform transitions (an arc).
    const finGeo = () => {
        const root = rootRef.current
        const g = geoRef.current
        if (!root || !g) return
        try {
            const k = eosStageScale(root) || 1
            const R = root.getBoundingClientRect()
            const a = root.querySelector(".eosSighSync").getBoundingClientRect()
            const m = root.querySelector(".eosSighMoon").getBoundingClientRect()
            const W = R.width / k
            const mn = m.width / k
            const mc = { x: (m.left + m.width / 2 - R.left) / k, y: (m.top + m.height / 2 - R.top) / k }
            const sc = { x: (a.left + a.width / 2 - R.left) / k, y: (a.top + a.height / 2 - R.top) / k }
            const right = mc.x > W / 2
            const mS = g.narrow ? 1.9 : 1.7
            const size = mn * mS
            const T = { x: W * (right ? (g.side ? 0.8 : 0.79) : g.side ? 0.2 : 0.21), y: g.safeTop + Math.max(4, g.rowA - (g.side ? 0 : 18)) + size / 2 } // clear of the palm crown
            const hol = { x: T.x - 0.11 * size, y: T.y + 0.1 * size }
            const vars = { "--mtx": `${Math.round(T.x - mc.x)}px`, "--mty": `${Math.round(T.y - mc.y)}px`, "--mS": mS.toFixed(2), "--stx": `${Math.round(hol.x - sc.x)}px`, "--sty": `${Math.round(hol.y - sc.y)}px`, "--sS": ((0.64 * size) / Math.max(1, a.width / k)).toFixed(3) }
            for (const key in vars) root.style.setProperty(key, vars[key])
        } catch {}
    }
    const sighDone = () => {
        const s = S.current
        s.cycle += 1
        s.early = 0
        const c = s.cycle
        const last = c >= setup.n
        const face = c === 1 ? EOS_SIGH_FACE.first : c === setup.n - 1 || last ? setup.happy : null
        // one scored step per completed sigh (the consequence of the player's own release — never ambient)
        fx.sfx("chime")
        eosHaptic("hit")
        eosTone(eosNote(4 + c * 2, 262), 420, { type: "triangle", gain: 0.04 })
        const p = { done: c, bloom: fx.toggle("bloom"), slump: fx.toggle("slump"), big: false, n1: false, n2: false }
        if (face != null) {
            p.face = face
            p.pop = fx.toggle("pop")
        }
        s.count = null
        if (!last) {
            go("idle", { ...p, cue: "again" })
            fx.own("hold", 0)
            fx.report((c * 100) / setup.n, EOS_SIGH_LABEL.hold)
            return
        }
        // ---- the finale (first-class state, BEFORE 100): sunrise, the orb blooms into a sun, SYNC floats to the moon
        finGeo()
        go("finale", { ...p, cue: "done", big: true, fin: "fly", clr: 1 })
        fx.own("hold", 0)
        fx.report(EOS_SIGH_FIN_PROG, EOS_SIGH_LABEL.done)
        ;[5, 7, 9, 10].forEach((n, i) => eosTone(eosNote(n, 262), 520, { type: "triangle", gain: 0.035, at: i * 0.13 }))
        fx.later(EOS_SIGH_FIN.land, () => {
            patch({ fin: "yawn" })
            eosTone(eosNote(2, 262), 600, { type: "sine", gain: 0.025, glide: eosNote(0, 262) })
        })
        fx.later(EOS_SIGH_FIN.sleep, () => {
            patch({ fin: "sleep", face: EOS_SIGH_FACE.asleep, pop: fx.toggle("pop"), cue: "sleep" })
            eosTone(eosNote(12, 262), 700, { type: "sine", gain: 0.02 })
        })
        const bonus = Math.max(260, Math.min(360, 280 + (setup.n - 3) * 20 + (s.puffs === 0 ? 30 : 0)))
        fx.later(EOS_SIGH_FIN.end, () => {
            go("done")
            fx.report(100, EOS_SIGH_LABEL.done)
            fx.own(null)
            fx.sfx("win")
            eosHaptic("finish")
            fx.later(EOS_SIGH_DONE_DELAY, () => {
                if (s.doneSent) return
                s.doneSent = true
                try {
                    cbRef.current.onDone?.(bonus)
                } catch {}
            })
        })
    }
    const release = () => {
        const s = S.current
        const ph = s.phase
        s.pointer = null
        if (ph === "in") {
            // easy mode ("the slow out is what matters"): any touch is a whole guided sigh — the orb keeps filling,
            // the top-up plays, then the exhale. A tapper's 3rd tap already makes real progress.
            if (s.easy) {
                s.pendingOut = true
                return
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
        else if (s.phase === "in") {
            // a little early: remembered, acknowledged, and played at 72 % (keyboard parity with the early slide)
            s.earlySip = true
            fx.ack()
        } else fx.ack()
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
        const w = orbRef.current
        if (s.phase !== "in" && s.phase !== "out") count = null
        if (count !== s.count) {
            // the 1 Hz count is a CSS counter (style only): no text mutation for the wrappers' DOM audit
            s.count = count
            if (w && count != null) w.style.setProperty("--n", String(count))
        }
        if (Math.abs(s.painted - s.f) > 0.002) {
            s.painted = s.f
            const fv = s.f.toFixed(4)
            if (w) w.style.setProperty("--f", fv)
            // SYNC breathes WITH the player: fills up on the inhale, shrinks linearly on the exhale
            const sy = syncRef.current
            if (sy) sy.style.setProperty("--f", fv)
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
                const L = eosSighLayout(r.width / k, r.height / k, st, sb, setup.v)
                for (const key in L.vars) root.style.setProperty(key, L.vars[key])
                geoRef.current = L
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
        if (s.phase === "idle") fx.own("hold", 0)
        let raf = 0
        const tick = () => {
            raf = requestAnimationFrame(tick)
            step()
        }
        raf = requestAnimationFrame(tick)
        try {
            if (!eosPrefs().sighTip) {
                eosSetPref("sighTip", true) // a flag only (never words)
                s.tipUntil = Date.now() + EOS_SIGH_TIP_MS
                patch({ tip: true })
            }
        } catch {}
        if (s.tipUntil > Date.now()) s.timers.push(setTimeout(() => s.alive && patch({ tip: false }), s.tipUntil - Date.now()))
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
            // release the pacer only if this engine still holds it (the finale already released it at 100 %, and
            // another owner — e.g. the Still Moment — may hold it by now)
            if (s.owned) {
                s.owned = false
                eosBreathOwn(null)
            }
            if (eosSighLive && eosSighLive.S === s) eosSighLive = null
        }
    }, [])

    // ---- pointer: the whole arena is the breath pad (the orb is the target; a press anywhere also works)
    const onDown = (e) => {
        const s = S.current
        if (e.pointerType === "mouse" && e.button !== 0) return
        if (s.pointer != null && s.pointer !== e.pointerId) {
            // a 2nd finger while holding = the sip (remembered when a little early)
            if (s.phase === "ready" || s.phase === "in") requestSip()
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
    const { storm } = setup
    const dawn = EOS_SIGH_DAWNS[setup.day] || EOS_SIGH_DAWNS.dawn
    const sideLayout = !!(geo && geo.side)
    const plain = sideLayout ? -1 : EOS_SIGH_PLAIN
    // slot → caption / thumbnail (filled in leaving order, so the first words leave first; never on SYNC's own cloud)
    const slotWord = {}
    const slotThumb = {}
    setup.order
        .filter((slot) => slot !== plain)
        .forEach((slot, i) => {
            if (words[i]) slotWord[slot] = words[i]
            if (thumbs[i]) slotThumb[slot] = thumbs[i]
        })
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
    }
    const ph = ui.phase
    const marker =
        ph === "idle" || ph === "in" || ph === "puff"
            ? eosTarget({ g: "hold", ms: EOS_SIGH_IN_MS, label: EOS_SIGH_LABEL.hold })
            : ph === "ready"
              ? eosTarget({ g: "drag", dir: "u", d: 30, ox: 0.32, label: "SIP MORE ↑" }) // the demo runs beside the in-orb "SIP ↑"
              : {}
    const cueKey = ui.cue === "start" && ui.done > 0 ? "again" : (ui.cue === "start" || ui.cue === "again") && ui.easy ? "easy" : ui.cue
    const cue0 = EOS_SIGH_CUES[cueKey] || EOS_SIGH_CUES.start
    // the once-per-device safety line takes the sub-line slot (reserved by the layout → never over SYNC or the words)
    const cue = ui.tip && (ui.cue === "start" || ui.cue === "in") ? [cue0[0], EOS_SIGH_TIP] : cue0
    const pips = Array.from({ length: setup.n }, (_, i) => i)
    const finale = ph === "finale" || ph === "done"
    return (
        <div
            ref={rootRef}
            className="arena eosArena eosG111 fs-mask"
            {...EOS_PRIVATE_ATTRS}
            data-phase={ph}
            data-fin={ui.fin}
            data-calm={red ? "1" : "0"}
            data-day={setup.day}
            data-narrow={geo && geo.narrow ? "1" : "0"}
            data-side={sideLayout ? "1" : "0"}
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
            {/* layer 3 · SYNC's island + the storm clouds carrying the words */}
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
                    {/* SYNC is in the breath with you: fills up (--f), hops at the notch, bounces on the sip, blows the
                        clouds out to sea, coughs on an early lift, slumps with relief after each sigh, then floats to the moon */}
                    <div className="eosSighSync" ref={syncRef} data-pop={ui.pop}>
                        <div className="eosSighSyncLift">
                            <div className="eosSighSyncHop" data-sl={ui.slump}>
                                <div className="eosSighSyncBody">
                                    <i className="eosSighSyncGlow" />
                                    <img className="eosSighSyncFace" src={eosFace("sync", ui.face)} alt="" draggable={false} />
                                </div>
                                <span className="eosSighSyncBlow">
                                    {EOS_SIGH_WISPS.map((wp, i) => (
                                        <i key={i} style={{ "--wr": `${wp.r}deg`, "--wd": wp.dl }} />
                                    ))}
                                </span>
                                <span className="eosSighZz" />
                            </div>
                        </div>
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
                                className={`eosSighCloud ${w || th ? "hasWord" : ""} ${i === plain ? "isPlain" : ""}`}
                                data-gone={gone ? "1" : "0"}
                                style={{
                                    "--x": sideLayout ? `${sl.sx}%` : `${sl.px}%`,
                                    "--y": sideLayout || sl.prow === "A" ? "var(--rowA)" : "var(--rowB)",
                                    "--s": i === plain ? 1.08 : sl.s,
                                    "--gx": `${sl.side * 46}vw`,
                                    "--bob": `${(6 + (i % 3) * 1.3).toFixed(1)}s`,
                                    "--bd": `${(-i * 0.9).toFixed(1)}s`,
                                }}
                            >
                                <i className="eosSighRain" aria-hidden="true">
                                    <i />
                                </i>
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
            </div>
            {/* foreground · the breath orb (centre-low, above the safe-bottom line) */}
            <div className="eosSighOrbWrap" ref={orbRef} data-n1={ui.n1 ? "1" : "0"} data-n2={ui.n2 ? "1" : "0"}>
                <div className="eosSighCue" aria-live="polite">
                    <b>{cue[0]}</b>
                    {cue[1] ? <small className={cue[1] === EOS_SIGH_TIP ? "isTip" : ""}>{cue[1]}</small> : null}
                    <span className="eosSrOnly">{`Sigh ${Math.min(ui.done + (finale ? 0 : 1), setup.n)} of ${setup.n}.`}</span>
                </div>
                <div className="eosSighPips" aria-hidden="true">
                    {pips.map((i) => (
                        <i key={i} className={i < ui.done ? "on" : ""} />
                    ))}
                </div>
                <div className="eosSighGusts" data-w={ui.wind} aria-hidden="true">
                    {EOS_SIGH_GUSTS.map((g, i) => (
                        <i key={i} style={{ "--gr": `${g.r}deg`, "--gd": `calc(var(--aw) * ${g.d})`, "--gl": `${g.dl}`, "--gw": g.w }} />
                    ))}
                </div>
                <div className="eosSighMotes" aria-hidden="true">
                    {EOS_SIGH_MOTES.map((m, i) => (
                        <i key={i} className="eosSighMote" style={{ "--mx": `${m.mx}px`, "--my": `${m.my}px`, "--md": `${m.md}s` }} />
                    ))}
                </div>
                <button type="button" className="eosSighOrb" aria-label={EOS_SIGH_ARIA} {...marker}>
                    <span className="eosSighOrbSquash">
                        <span className="eosSighOrbGrow">
                            <span className="eosSighOrbRays" />
                            <span className="eosSighOrbHalo" />
                            <span className="eosSighOrbBall">
                                <span className="eosSighOrbFill">
                                    <i className="eosSighOrbGold" />
                                    <i className="eosSighOrbWave" />
                                </span>
                                <span className="eosSighOrbSunny" />
                                <span className="eosSighOrbGloss" />
                                <span className="eosSighOrbCount" aria-hidden="true">
                                    <small />
                                    <b />
                                </span>
                            </span>
                            <svg className="eosSighRing" viewBox="0 0 100 100" aria-hidden="true">
                                <circle className="eosSighRingTrack" cx="50" cy="50" r="46" />
                                <circle className="eosSighRingArc glow" cx="50" cy="50" r="46" pathLength="100" transform="rotate(-90 50 50)" />
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
${EOS_SIGH_R}{--lane:44px;--islx:50%;--sunx:32%;--moonx:93%;--stx:0px;--sty:0px;--sS:1;--mtx:0px;--mty:0px;--mS:1;--sk:.12;--hzpx:200px;--os:160px;--cw:190px;--cbh:60px;--rowA:38px;--rowB:124px;--mn:66px;--sy:90px;--sun:150px;--k:.16;--og:190,150,255;--f:0;background:var(--st1);color:#fff;font-family:var(--eos-font);cursor:default;isolation:isolate;filter:none!important}
${EOS_SIGH_R}[data-calm="1"]{--k:.04;--sk:.035}
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
${EOS_SIGH_R} .eosSighSun::before{content:"";position:absolute;inset:-70%;border-radius:50%;background:repeating-conic-gradient(from 8deg,rgba(255,226,150,.42) 0 4deg,rgba(255,226,150,0) 4deg 13deg);-webkit-mask-image:radial-gradient(closest-side,transparent 38%,#000 44%,transparent 96%);mask-image:radial-gradient(closest-side,transparent 38%,#000 44%,transparent 96%);opacity:0;transition:opacity 1.2s ease .3s}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighSun{opacity:1;transform:translateY(-64%) scale(1.12);transition:transform 2.2s cubic-bezier(.25,.8,.3,1),opacity 1s}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighSun::before{opacity:1;animation:eosSighSpin 40s linear infinite}
${EOS_SIGH_R}[data-calm="1"]:is([data-phase="finale"],[data-phase="done"]) .eosSighSun{transform:translateY(-28%)}
${EOS_SIGH_R}[data-calm="1"] .eosSighSun::before{animation:none!important}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighGlint{opacity:1;filter:brightness(1.25)}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]):not([data-calm="1"]) .eosSighStars{animation:eosSighTwinkle 1.3s ease-in-out infinite alternate}
${EOS_SIGH_R} .eosSighMoon{position:absolute;left:var(--moonx);top:0;z-index:1;width:var(--mn);height:var(--mn);margin-left:calc(var(--mn) / -2);opacity:calc(.5 + var(--clr) * .5);transition:opacity var(--D)}
${EOS_SIGH_R} .eosSighMoonFace{position:absolute;inset:0;display:block;border-radius:50%;box-shadow:inset calc(var(--mn) * -.26) calc(var(--mn) * .08) 0 0 #ffe7a8;filter:drop-shadow(0 0 12px rgba(255,231,168,.6))}
${EOS_SIGH_R} .eosSighMoonSync{position:absolute;left:4%;bottom:6%;width:78%;height:78%;object-fit:contain;opacity:0;transform:translateY(14px) scale(.7);transition:opacity 1.1s ease .7s,transform 1.4s cubic-bezier(.3,1.4,.5,1) .7s;filter:drop-shadow(-2px -2px 0 rgba(255,226,170,.6)) drop-shadow(2px 0 0 rgba(150,215,255,.7)) drop-shadow(0 4px 6px rgba(0,0,0,.35));pointer-events:none}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighMoonSync{opacity:1;transform:none}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"])[data-calm="1"] .eosSighMoonSync{transition:opacity 1.1s ease .5s}
${EOS_SIGH_R}[data-calm="0"] .eosSighMoonSync{display:none}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]):not([data-calm="1"]) .eosSighMoon{opacity:1;transform:translate(var(--mtx),var(--mty)) scale(var(--mS));transition:transform 1.5s cubic-bezier(.45,0,.25,1),opacity .8s}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighMoonFace{filter:drop-shadow(0 0 18px rgba(255,231,168,.85))}
${EOS_SIGH_R}[data-calm="1"] .eosSighMoonSync{transform:none}
${EOS_SIGH_R} .eosSighSea{position:absolute;left:0;right:0;bottom:0;top:calc(var(--eos-safe-top) + var(--hzpx));z-index:2;overflow:hidden;pointer-events:none;background:linear-gradient(180deg,var(--ss1),var(--ss2) 70%)}
${EOS_SIGH_R} .eosSighSea::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:rgba(255,236,210,calc(.16 + var(--clr) * .3));z-index:3}
${EOS_SIGH_R} .eosSighSea>i{position:absolute;inset:0;display:block}
${EOS_SIGH_R} .eosSighSeaDawn{background:linear-gradient(180deg,var(--ds1),var(--ds2) 72%);opacity:var(--clr);transition:opacity var(--D) ease-in-out}
${EOS_SIGH_R} .eosSighWaves{left:-60px!important;background:repeating-linear-gradient(180deg,rgba(255,255,255,0) 0 13px,rgba(255,255,255,.06) 13px 15px),repeating-linear-gradient(90deg,rgba(255,255,255,0) 0 38px,rgba(255,255,255,.035) 38px 60px);animation:eosSighWaves 14s linear infinite}
${EOS_SIGH_R} .eosSighGlint{left:var(--sunx)!important;right:auto!important;width:130px;margin-left:-65px;height:80%;background:repeating-linear-gradient(180deg,rgba(255,214,140,.6) 0 3px,rgba(255,214,140,0) 3px 12px);-webkit-mask-image:linear-gradient(180deg,#000,transparent);mask-image:linear-gradient(180deg,#000,transparent);opacity:calc(var(--clr) * .85);transition:opacity var(--D)}
${EOS_SIGH_R} .eosSighIsle{position:absolute;left:var(--islx);top:calc(var(--hzpx) - var(--sy) * 1.18);width:calc(var(--sy) * 2);height:calc(var(--sy) * 1.3);transform:translateX(-50%);pointer-events:none}
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
${EOS_SIGH_R} .eosSighSync{position:absolute;left:38%;bottom:20%;width:var(--sy);height:var(--sy);margin-left:calc(var(--sy) / -2);z-index:2;--f:0}
${EOS_SIGH_R} .eosSighSyncLift,${EOS_SIGH_R} .eosSighSyncHop,${EOS_SIGH_R} .eosSighSyncBody{position:absolute;inset:0;display:block}
${EOS_SIGH_R} .eosSighSyncHop{transform-origin:50% 100%}
${EOS_SIGH_R} .eosSighSyncBody{transform-origin:50% 100%;scale:calc(1 + var(--f) * var(--sk)) calc(1 + var(--f) * var(--sk) * .8);will-change:scale}
${EOS_SIGH_R} .eosSighSyncGlow{position:absolute;inset:-30%;display:block;border-radius:50%;background:radial-gradient(closest-side,rgba(255,226,170,calc(.12 + var(--clr) * .3 + var(--f) * .16)),rgba(255,226,170,0))}
${EOS_SIGH_R} .eosSighSyncFace{position:relative;width:100%;height:100%;object-fit:contain;filter:drop-shadow(-3px -3px 0 rgba(255,214,160,.55)) drop-shadow(3px -1px 0 rgba(140,215,255,.8)) drop-shadow(0 8px 8px rgba(0,0,0,.4));animation:eosSighSyncBob 3.6s ease-in-out infinite;pointer-events:none}
${EOS_SIGH_R} .eosSighSync[data-pop="a"] .eosSighSyncFace{animation:eosSighPopA .6s cubic-bezier(.3,1.5,.5,1) .18s,eosSighSyncBob 3.6s ease-in-out .8s infinite}
${EOS_SIGH_R} .eosSighSync[data-pop="b"] .eosSighSyncFace{animation:eosSighPopB .6s cubic-bezier(.3,1.5,.5,1) .18s,eosSighSyncBob 3.6s ease-in-out .8s infinite}
${EOS_SIGH_R} .eosSighSyncHop[data-sl="a"]{animation:eosSighSlumpA .8s cubic-bezier(.3,1.2,.5,1)}
${EOS_SIGH_R} .eosSighSyncHop[data-sl="b"]{animation:eosSighSlumpB .8s cubic-bezier(.3,1.2,.5,1)}
${EOS_SIGH_R}[data-phase="ready"] .eosSighSyncHop{animation:eosSighHop .55s cubic-bezier(.3,1.5,.5,1)}
${EOS_SIGH_R}[data-phase="sip"] .eosSighSyncHop{animation:eosSighSipBounce .6s cubic-bezier(.3,1.4,.5,1)}
${EOS_SIGH_R}[data-phase="puff"] .eosSighSyncHop{animation:eosSighCough .45s ease-out}
${EOS_SIGH_R}[data-phase="out"] .eosSighSyncHop{animation:eosSighBlowLean var(--D) ease-in-out}
${EOS_SIGH_R}[data-fin="fly"] .eosSighSyncHop{animation:eosSighFloat 1.7s ease-in-out .2s}
${EOS_SIGH_R}[data-fin="yawn"] .eosSighSyncHop{animation:eosSighYawn .5s ease-in-out}
${EOS_SIGH_R}[data-fin="sleep"] .eosSighSyncHop{rotate:-9deg;scale:1.04 .94;transition:rotate .7s ease,scale .7s ease}
${EOS_SIGH_R} .eosSighSyncBlow{position:absolute;left:50%;top:64%;width:0;height:0;pointer-events:none}
${EOS_SIGH_R} .eosSighSyncBlow>i{position:absolute;left:0;top:-2px;width:calc(var(--sy) * .95);height:4px;display:block;border-radius:999px;transform-origin:0 50%;background:linear-gradient(90deg,rgba(255,255,255,.95),rgba(225,240,255,.5) 55%,rgba(225,240,255,0));opacity:0;transform:rotate(var(--wr)) translateX(6px) scaleX(.2)}
${EOS_SIGH_R}[data-phase="out"] .eosSighSyncBlow>i{animation:eosSighWisp calc(var(--D) / 3) ease-out calc(var(--D) / 3 * var(--wd)) 3}
${EOS_SIGH_R} .eosSighSyncBlow::after{content:"";position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,rgba(240,236,255,.95),rgba(240,236,255,0) 70%);opacity:0}
${EOS_SIGH_R}[data-phase="out"] .eosSighSyncBlow::after{animation:eosSighMouth .9s ease-in-out infinite alternate}
${EOS_SIGH_R}[data-phase="puff"] .eosSighSyncBlow::after{animation:eosSighCoughPuff .6s ease-out}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighSync{translate:var(--stx) 0;transition:translate 1.55s cubic-bezier(.45,.05,.4,1) .2s}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighSyncLift{translate:0 var(--sty);scale:var(--sS);transition:translate 1.55s cubic-bezier(.15,.8,.35,1) .2s,scale 1.55s ease-in-out .2s}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighSyncFace{animation:none}
${EOS_SIGH_R} .eosSighZz{position:absolute;right:-6%;top:-14%;width:30%;height:40%;pointer-events:none}
${EOS_SIGH_R} .eosSighZz::before,${EOS_SIGH_R} .eosSighZz::after{content:"z";position:absolute;left:0;bottom:0;font:900 22px/1 var(--eos-font);color:#fff4c8;text-shadow:0 0 8px rgba(255,214,120,.9);opacity:0}
${EOS_SIGH_R} .eosSighZz::after{content:"Z";font-size:28px}
${EOS_SIGH_R}[data-fin="sleep"] .eosSighZz::before{animation:eosSighZ 2.2s ease-out .1s infinite}
${EOS_SIGH_R}[data-fin="sleep"] .eosSighZz::after{animation:eosSighZ 2.2s ease-out 1.1s infinite}
${EOS_SIGH_R}[data-calm="1"] .eosSighSyncHop{animation:none!important;rotate:none!important;scale:none!important}
${EOS_SIGH_R}[data-calm="1"] .eosSighSyncBlow>i{animation-name:eosSighGustCalm!important;transform:rotate(var(--wr)) translateX(10px) scaleX(.8)}
${EOS_SIGH_R}[data-calm="1"] .eosSighSyncBlow::after{animation:none!important}
${EOS_SIGH_R}[data-calm="1"] .eosSighZz{display:none}
${EOS_SIGH_R}[data-calm="1"]:is([data-phase="finale"],[data-phase="done"]) .eosSighSync{translate:none;opacity:0;transition:opacity 1s ease .45s}
${EOS_SIGH_R}[data-calm="1"]:is([data-phase="finale"],[data-phase="done"]) .eosSighSyncLift{translate:none;scale:none}
${EOS_SIGH_R} .eosSighClouds{position:absolute;inset:0}
${EOS_SIGH_R} .eosSighCloud{position:absolute;left:var(--x);top:var(--y);width:calc(var(--cw) * var(--s));transform:translate(-50%,0);transition:transform .6s ease}
${EOS_SIGH_R} .eosSighCloud.isPlain{z-index:-1}
${EOS_SIGH_R} .eosSighCloud.isPlain .eosSighCloudBody{min-height:calc(var(--cbh) + 10px)}
${EOS_SIGH_R} .eosSighCloud[data-gone="1"]{transform:translate(calc(-50% + var(--gx)),-24px) scale(.74);transition:transform var(--D) cubic-bezier(.35,.05,.45,1)}
${EOS_SIGH_R}[data-calm="1"] .eosSighCloud[data-gone="1"]{transform:translate(-50%,0)}
${EOS_SIGH_R} .eosSighCloudFloat{position:relative;animation:eosSighCloudIn .5s ease-out backwards,eosSighBob var(--bob) ease-in-out var(--bd) infinite;transition:opacity .4s}
${EOS_SIGH_R} .eosSighCloud[data-gone="1"] .eosSighCloudFloat{opacity:0;transition:opacity calc(var(--D) * .7) ease-in calc(var(--D) * .3)}
${EOS_SIGH_R} .eosSighPuffs{position:absolute;inset:0;display:block;pointer-events:none}
${EOS_SIGH_R} .eosSighPuffs>i{position:absolute;display:block;border-radius:50%;background:radial-gradient(circle at 50% 30%,var(--sc1),var(--sc2) 80%)}
${EOS_SIGH_R} .eosSighPuffs>i:nth-child(1){left:9%;top:calc(var(--cw) * -.12);width:38%;aspect-ratio:1}
${EOS_SIGH_R} .eosSighPuffs>i:nth-child(2){left:33%;top:calc(var(--cw) * -.2);width:44%;aspect-ratio:1}
${EOS_SIGH_R} .eosSighPuffs>i:nth-child(3){left:61%;top:calc(var(--cw) * -.09);width:30%;aspect-ratio:1}
${EOS_SIGH_R} .eosSighCloudBody{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:var(--cbh);padding:7px 10px;border-radius:999px;text-align:center;background:radial-gradient(130% 150% at 50% 0%,var(--sc1),var(--sc2) 72%);box-shadow:inset 0 -7px 12px rgba(12,6,44,.38),inset 0 4px 8px rgba(255,255,255,.2),0 12px 22px rgba(0,0,0,.28)}
${EOS_SIGH_R} .eosSighWord{max-width:100%;line-height:1.08!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
${EOS_SIGH_R} .eosSighThumb{width:40px;height:40px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,255,255,.7)}
${EOS_SIGH_R} .eosSighRain{position:absolute;left:14%;right:14%;top:62%;height:150%;display:block;overflow:hidden;opacity:0;pointer-events:none;-webkit-mask-image:linear-gradient(180deg,#000 20%,transparent);mask-image:linear-gradient(180deg,#000 20%,transparent)}
${EOS_SIGH_R} .eosSighRain>i{position:absolute;left:0;right:0;top:-40px;bottom:0;display:block;background:repeating-linear-gradient(104deg,rgba(205,220,255,0) 0 8px,rgba(205,220,255,.55) 8px 9.5px)}
${EOS_SIGH_R} .eosSighCloud[data-gone="1"] .eosSighRain{animation:eosSighRainLife var(--D) linear forwards}
${EOS_SIGH_R} .eosSighCloud[data-gone="1"] .eosSighRain>i{animation:eosSighRainFall .7s linear infinite}
${EOS_SIGH_R}[data-calm="1"] .eosSighCloud[data-gone="1"] .eosSighRain>i{animation:none}
${EOS_SIGH_R} .eosSighGusts{position:absolute;left:50%;top:40%;width:0;height:0;z-index:6;pointer-events:none}
${EOS_SIGH_R} .eosSighGusts>i{position:absolute;left:0;top:-3px;width:calc(130px * var(--gw));height:5px;display:block;border-radius:999px;transform-origin:0 50%;background:linear-gradient(90deg,rgba(235,244,255,0),rgba(240,247,255,.85) 60%,rgba(255,255,255,0));opacity:0;transform:rotate(var(--gr)) translateX(30px) scaleX(.3)}
${EOS_SIGH_R} .eosSighGusts>i::after{content:"";position:absolute;left:22%;top:9px;width:58%;height:3px;border-radius:999px;background:linear-gradient(90deg,rgba(255,236,210,0),rgba(255,236,210,.6),rgba(255,236,210,0))}
${EOS_SIGH_R}[data-phase="out"] .eosSighGusts[data-w="a"]>i{animation:eosSighGustA calc(var(--D) * .42) cubic-bezier(.25,.6,.35,1) calc(var(--D) * .1 * var(--gl)) 2}
${EOS_SIGH_R}[data-phase="out"] .eosSighGusts[data-w="b"]>i{animation:eosSighGustB calc(var(--D) * .42) cubic-bezier(.25,.6,.35,1) calc(var(--D) * .1 * var(--gl)) 2}
${EOS_SIGH_R}[data-calm="1"][data-phase="out"] .eosSighGusts>i{animation-name:eosSighGustCalm;animation-iteration-count:1;animation-duration:var(--D);transform:rotate(var(--gr)) translateX(calc(var(--gd) * .5)) scaleX(1)}
${EOS_SIGH_R} .eosSighOrbWrap{position:absolute;left:var(--orbx,50%);bottom:calc(var(--eos-safe-bottom) + 6px);width:var(--os);height:var(--os);margin-left:calc(var(--os) / -2);z-index:7;animation:eosSighIntro .5s cubic-bezier(.3,1.4,.5,1) both}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbWrap{animation:eosSighFadeIn .4s ease both}
${EOS_SIGH_R} .eosSighOrb{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:50%!important;display:block!important;touch-action:none;cursor:pointer!important;outline-offset:8px!important}
${EOS_SIGH_R} .eosSighOrb,${EOS_SIGH_R} .eosSighOrb:hover,${EOS_SIGH_R} .eosSighOrb:active,${EOS_SIGH_R} .eosSighOrb:focus-visible{transform:none!important}
${EOS_SIGH_R}:is([data-phase="out"],[data-phase="finale"],[data-phase="done"]) .eosSighOrb{cursor:default!important}
${EOS_SIGH_R} .eosSighOrbSquash,${EOS_SIGH_R} .eosSighOrbGrow{position:absolute;inset:0;display:block;border-radius:50%;pointer-events:none}
${EOS_SIGH_R} .eosSighOrbGrow{transform:scale(calc(1 + var(--f) * var(--k)));transform-origin:50% 100%;will-change:transform}
${EOS_SIGH_R} .eosSighOrbWrap[data-sq="a"] .eosSighOrbSquash{animation:eosSighSquashA .46s cubic-bezier(.3,1.3,.5,1)}
${EOS_SIGH_R} .eosSighOrbWrap[data-sq="b"] .eosSighOrbSquash{animation:eosSighSquashB .46s cubic-bezier(.3,1.3,.5,1)}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbWrap[data-sq="a"] .eosSighOrbSquash{animation:eosSighSquashCalmA .4s ease}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbWrap[data-sq="b"] .eosSighOrbSquash{animation:eosSighSquashCalmB .4s ease}
${EOS_SIGH_R} .eosSighOrbHalo{position:absolute;inset:-30%;display:block;border-radius:50%;background:radial-gradient(closest-side,rgba(var(--og),.55),rgba(var(--og),.18) 60%,rgba(var(--og),0));opacity:calc(.4 + var(--f) * .6);will-change:opacity}
${EOS_SIGH_R} .eosSighOrbWrap[data-ack="a"] .eosSighOrbHalo{animation:eosSighAckA .5s ease-out}
${EOS_SIGH_R} .eosSighOrbWrap[data-ack="b"] .eosSighOrbHalo{animation:eosSighAckB .5s ease-out}
${EOS_SIGH_R} .eosSighOrbBall{position:absolute;inset:0;display:block;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 64%,rgba(70,48,150,.6),rgba(14,10,46,.9) 74%);box-shadow:inset 0 -12px 24px rgba(8,4,36,.6),inset 0 6px 16px rgba(255,255,255,.2),0 12px 0 rgba(6,4,24,.32),0 22px 40px rgba(0,0,0,.45),0 0 0 3px rgba(255,255,255,.24),0 0 22px rgba(var(--og),.5)}
${EOS_SIGH_R} .eosSighOrbBall::before{content:"";position:absolute;left:26%;top:30%;width:48%;height:48%;border-radius:50%;background:radial-gradient(closest-side,rgba(200,170,255,.55),rgba(200,170,255,0));opacity:calc(1 - var(--f));will-change:opacity}
${EOS_SIGH_R} .eosSighOrbFill{position:absolute;left:0;right:0;bottom:0;height:100%;display:block;transform:translateY(calc((1 - var(--f)) * 100% + 2px));background:linear-gradient(180deg,#d6b8ff,#8a5cf0 55%,#4b2aa6)}
${EOS_SIGH_R} .eosSighOrbGold{position:absolute;inset:0;display:block;background:linear-gradient(180deg,#fff2b8,#ffc45a 55%,#ff9a4a);opacity:var(--clr);transition:opacity 2.4s ease}
${EOS_SIGH_R} .eosSighOrbWave{position:absolute;left:-20px;right:-20px;top:-9px;height:18px;display:block;background:radial-gradient(circle at 10px 0,rgba(255,255,255,0) 9px,rgba(255,255,255,.42) 10px) repeat-x;background-size:20px 18px;animation:eosSighWave 1.8s linear infinite;will-change:transform}
${EOS_SIGH_R}[data-calm="1"] :is(.eosSighOrbWave,.eosSighWaves,.eosSighStorm>b){animation:none!important}
${EOS_SIGH_R}[data-calm="1"] .eosSighCloudFloat{animation:eosSighFadeIn .5s ease backwards}
${EOS_SIGH_R}[data-calm="1"] .eosSighSyncFace{animation:none!important}
${EOS_SIGH_R} .eosSighOrbSunny{position:absolute;inset:0;display:block;border-radius:50%;background:radial-gradient(circle at 50% 42%,#fff6c8,#ffc45a 58%,#ff9a4a);opacity:0;transition:opacity 1.2s ease}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighOrbSunny{opacity:1}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]){--og:255,196,96}
${EOS_SIGH_R} .eosSighOrbRays{position:absolute;inset:-48%;display:block;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,226,150,.5) 0 5deg,rgba(255,226,150,0) 5deg 15deg);-webkit-mask-image:radial-gradient(closest-side,transparent 40%,#000 46%,transparent 98%);mask-image:radial-gradient(closest-side,transparent 40%,#000 46%,transparent 98%);opacity:0;transform:scale(.7);transition:opacity 1s ease,transform 1.6s cubic-bezier(.3,1.3,.5,1)}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighOrbRays{opacity:1;transform:scale(1);animation:eosSighSpin 24s linear infinite}
${EOS_SIGH_R}:is([data-phase="finale"],[data-phase="done"]) .eosSighOrbHalo{animation:eosSighOrbBloom 2.2s cubic-bezier(.3,1.2,.5,1) both}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbRays{animation:none!important;transform:none;transition:opacity 1s ease}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbHalo{animation:none!important}
${EOS_SIGH_R} .eosSighOrbGloss{position:absolute;left:17%;top:9%;width:36%;height:20%;display:block;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.9),rgba(255,255,255,0));z-index:3}
${EOS_SIGH_R} .eosSighOrbCount{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#fff;text-shadow:0 2px 8px rgba(20,6,60,.75);pointer-events:none}
${EOS_SIGH_R} .eosSighOrbCount small{font:800 15px/1 var(--eos-font);letter-spacing:.14em;text-transform:uppercase}
${EOS_SIGH_R} .eosSighOrbCount b{font:900 calc(var(--os) * .26)/1 var(--eos-font);font-variant-numeric:tabular-nums}
${EOS_SIGH_R}:is([data-phase="in"],[data-phase="out"]) .eosSighOrbCount b::after{counter-reset:eosSighN var(--n,2);content:counter(eosSighN)}
${EOS_SIGH_R}:is([data-phase="ready"],[data-phase="sip"]) .eosSighOrbCount b::after{content:"↑"}
${EOS_SIGH_R}[data-phase="in"] .eosSighOrbCount small::after{content:"in"}
${EOS_SIGH_R}[data-phase="out"] .eosSighOrbCount small::after{content:"out"}
${EOS_SIGH_R}:is([data-phase="ready"],[data-phase="sip"]) .eosSighOrbCount small::after{content:"sip"}
${EOS_SIGH_R}[data-phase="full"] .eosSighOrbCount small::after{content:"let go"}
${EOS_SIGH_R}[data-phase="ready"] .eosSighOrbCount b{animation:eosSighUp .9s ease-in-out infinite}
${EOS_SIGH_R}[data-calm="1"] .eosSighOrbCount b{animation:none!important;font-size:calc(var(--os) * .3)}
${EOS_SIGH_R} .eosSighRing{position:absolute;left:-9%;top:-9%;width:118%;height:118%;overflow:visible;pointer-events:none}
${EOS_SIGH_R} .eosSighRingTrack{fill:none;stroke:rgba(255,255,255,.18);stroke-width:3}
${EOS_SIGH_R} .eosSighRingArc{fill:none;stroke:#ffe08a;stroke-width:4.5;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:calc(100 - var(--f) * 100)}
${EOS_SIGH_R} .eosSighRingArc.glow{stroke:rgba(255,214,120,.28);stroke-width:10}
${EOS_SIGH_R} .eosSighNotch{fill:rgba(255,255,255,.4);stroke:rgba(20,10,60,.5);stroke-width:1;transition:fill .2s}
${EOS_SIGH_R} .eosSighOrbWrap[data-n1="1"] .eosSighNotch.n1,${EOS_SIGH_R} .eosSighOrbWrap[data-n2="1"] .eosSighNotch.n2{fill:#fff1a8;filter:drop-shadow(0 0 5px #ffc45a)}
${EOS_SIGH_R}[data-phase="ready"] .eosSighNotch.n1{animation:eosSighNotchPulse .7s ease-in-out infinite alternate}
${EOS_SIGH_R}[data-calm="1"] .eosSighNotch{animation:none!important}
${EOS_SIGH_R} .eosSighCue{position:absolute;left:calc(50% + var(--aw) / 2 - var(--orbx));bottom:calc(100% + var(--lane));transform:translateX(-50%);width:max-content;max-width:calc(var(--aw) - 16px);white-space:nowrap;text-align:center;pointer-events:none}
${EOS_SIGH_R} .eosSighCue b{display:block;font:800 20px/1.15 var(--eos-font);color:#fff;text-shadow:0 2px 10px rgba(10,4,40,.85),0 0 2px rgba(10,4,40,.9)}
${EOS_SIGH_R} .eosSighCue small{display:block;margin-top:4px;font:700 15px/1.2 var(--eos-font);color:rgba(240,236,255,.92);text-shadow:0 2px 8px rgba(10,4,40,.85)}
${EOS_SIGH_R} .eosSighCue small.isTip{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:999px;background:rgba(10,8,40,.62);color:#ffe9b8}
${EOS_SIGH_R}[data-narrow="1"] .eosSighCue b{font-size:17px}
${EOS_SIGH_R}[data-narrow="1"] .eosSighCue small{font-size:15px}
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
@keyframes eosSighHop{0%{transform:none}35%{transform:translateY(-12px) scale(.96,1.05)}70%{transform:translateY(0) scale(1.06,.94)}100%{transform:none}}
@keyframes eosSighSipBounce{0%{transform:none}30%{transform:scale(1.1,.88)}60%{transform:translateY(-6px) scale(.95,1.07)}100%{transform:none}}
@keyframes eosSighCough{0%{transform:none}20%{transform:translateX(-3px) scale(1.04,.94)}45%{transform:translateX(3px) rotate(3deg)}70%{transform:translateX(-2px)}100%{transform:none}}
@keyframes eosSighBlowLean{0%{transform:none}15%{transform:translateY(-3px) scale(1.03,.97)}85%{transform:translateY(2px) scale(.98,1.01)}100%{transform:none}}
@keyframes eosSighSlumpA{0%{transform:none}30%{transform:translateY(5px) scale(1.09,.86)}65%{transform:translateY(-2px) scale(.98,1.03)}100%{transform:none}}
@keyframes eosSighSlumpB{0%{transform:none}30%{transform:translateY(5px) scale(1.09,.86)}65%{transform:translateY(-2px) scale(.98,1.03)}100%{transform:none}}
@keyframes eosSighFloat{0%{transform:none}25%{transform:rotate(-8deg)}55%{transform:rotate(7deg)}80%{transform:rotate(-4deg)}100%{transform:none}}
@keyframes eosSighYawn{0%{transform:none}45%{transform:scale(.94,1.12)}100%{transform:scale(1.04,.95)}}
@keyframes eosSighWisp{0%{opacity:0;transform:rotate(var(--wr)) translateX(6px) scaleX(.2)}22%{opacity:.95}100%{opacity:0;transform:rotate(var(--wr)) translateX(calc(var(--sy) * .55)) scaleX(1)}}
@keyframes eosSighMouth{0%{opacity:.35;transform:scale(.7)}100%{opacity:.9;transform:scale(1.1)}}
@keyframes eosSighCoughPuff{0%{opacity:.95;transform:translate(0,0) scale(.6)}100%{opacity:0;transform:translate(14px,-22px) scale(1.6)}}
@keyframes eosSighZ{0%{opacity:0;transform:translate(0,0) scale(.6)}20%{opacity:1}100%{opacity:0;transform:translate(14px,-34px) scale(1.15)}}
@keyframes eosSighSpin{to{rotate:360deg}}
@keyframes eosSighTwinkle{0%{opacity:.55}100%{opacity:1}}
@keyframes eosSighOrbBloom{0%{scale:1;opacity:.8}45%{scale:1.45;opacity:1}100%{scale:1.25;opacity:.95}}
@keyframes eosSighStormGlow{0%{opacity:.62}100%{opacity:1}}
@keyframes eosSighWaves{to{transform:translateX(60px)}}
@keyframes eosSighBob{0%,100%{translate:0 0}50%{translate:0 -6px}}
@keyframes eosSighSyncBob{0%,100%{translate:0 0;scale:1 1}50%{translate:0 -4px;scale:.98 1.02}}
@keyframes eosSighCloudIn{0%{opacity:0;scale:.9}100%{opacity:1;scale:1}}
@keyframes eosSighRainLife{0%{opacity:0}18%{opacity:.85}70%{opacity:.55}100%{opacity:0}}
@keyframes eosSighRainFall{to{transform:translateY(40px)}}
@keyframes eosSighGustA{0%{opacity:0;transform:rotate(var(--gr)) translateX(30px) scaleX(.3)}18%{opacity:.95}70%{opacity:.7}100%{opacity:0;transform:rotate(var(--gr)) translateX(var(--gd)) scaleX(1.15)}}
@keyframes eosSighGustB{0%{opacity:0;transform:rotate(var(--gr)) translateX(30px) scaleX(.3)}18%{opacity:.95}70%{opacity:.7}100%{opacity:0;transform:rotate(var(--gr)) translateX(var(--gd)) scaleX(1.15)}}
@keyframes eosSighGustCalm{0%{opacity:0}25%{opacity:.55}75%{opacity:.4}100%{opacity:0}}
@keyframes eosSighIntro{0%{opacity:0;scale:.7}100%{opacity:1;scale:1}}
@keyframes eosSighFadeIn{0%{opacity:0}100%{opacity:1}}
@keyframes eosSighFadeOut{0%{opacity:.8}100%{opacity:0}}
@keyframes eosSighSquashA{0%{scale:1 1}28%{scale:1.1 .88}56%{scale:.95 1.06}78%{scale:1.02 .98}100%{scale:1 1}}
@keyframes eosSighSquashB{0%{scale:1 1}28%{scale:1.1 .88}56%{scale:.95 1.06}78%{scale:1.02 .98}100%{scale:1 1}}
@keyframes eosSighSquashCalmA{0%{scale:1 1}40%{scale:1.03 .97}100%{scale:1 1}}
@keyframes eosSighSquashCalmB{0%{scale:1 1}40%{scale:1.03 .97}100%{scale:1 1}}
@keyframes eosSighAckA{0%{filter:brightness(1.5)}100%{filter:none}}
@keyframes eosSighAckB{0%{filter:brightness(1.5)}100%{filter:none}}
@keyframes eosSighWave{from{transform:translateX(-20px)}to{transform:translateX(0)}}
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
        return { phase: s.phase, t: Math.round(eosSighNow() - s.t0), f: +s.f.toFixed(3), cycle: s.cycle, n: L.setup.n, early: s.early, easy: s.easy, prog: s.prog, D: s.D, pointer: s.pointer == null ? null : String(s.pointer), sfx: s.sfxLog.slice(), plog: s.plog.slice(), done: s.doneSent }
    },
    EOS_GAME_111,
})
