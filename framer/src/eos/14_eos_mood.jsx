// ===================================================================================
// EOS · 14 MOOD — the colour script and the flip bloom (docs/EOS_SPEC.md §5.6, §0.2 grade/flip, §11.9).
// Task `mood`. Public: EosMoodGrade, EOS_MOOD_CSS (+ eosExpose("mood", {…read-only helpers})).
//
// Every game — all 110 existing and every new one — moves visibly from negative to positive without touching
// a single engine:
//   (a) COLOUR SCRIPT. A full-stage grade above the game (z 54, pointer-events none, soft-light) whose two-stop
//       gradient slides from the feeling's LOUD pair to its CALM pair as the game's own progress bar rises
//       (anger red-orange → teal, panic storm-violet → dawn gold, sad slate → peach, numb grey → full colour …).
//       The colours are mixed in OKLCH (perceptual, no muddy grey midpoint) along the hue path that avoids the
//       sickly yellow-green band (the same rule the Still Point uses, so the light lands where the grade lands).
//       A second, screen-blended "air" layer makes the script readable on the arcade's dark scenes: the loud
//       colour presses in from the edges (the grip) and lets go as you play, while the calm colour opens from
//       the Still Point. Numb also gets backdrop-filter: saturate(.6 → 1): the game itself goes grey → colour.
//       Late at night (23:00-05:00 local) the calm pair is warmed 10° toward amber (R8).
//       Reduced motion / calm visuals: the script moves in three steps (33 / 66 / 95 %) with cross-fades only.
//   (b) FLIP BLOOM. The moment `.globalPlayGuide.isComplete` or `.tsRewardSurge.mega` first appears, the
//       feeling's three `flip` words (core data: panic safe · slow · right here, sad lighter · warm · held …)
//       bloom out of the Still Point (the measured `.eosCore` centre, else the stage centre), 250 ms apart, and
//       float up 60 px as they fade (1.8 s). Negative words went in; positive words come out.
//       Reduced / calm: they fade in place (no transforms).
//
// Mount (integration I1-E3, inside the play fragment, both wrappers, every game):
//   <EosMoodGrade game={selected} hostRef={gameHostRef} reduced={!!reduced} />
// It renders three absolutely positioned siblings inside `.releaseStage` (all aria-hidden, pointer-events none):
//   div.eosMoodGrade (z 54, the soft-light grade) · div.eosMoodAir (z 54, screen) · div.eosMoodFlip (z 54, words).
// They are siblings — not children — because a z-indexed root is an isolated blending group: a soft-light child
// would blend with nothing, and the words must not be blended or faded with the grade.
// Reads progress through core's shared useEosProgress poll; the finish watch is a 100 ms query on the game host
// that stops at the bloom. No store writes, no user text, every timer cleaned up.
// ===================================================================================

// ---------------------------------------------------------------- colour maths (pure)
// "#d7263d" → [215, 38, 61] (null when not a 6-digit hex colour).
function eosMoodHexRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim())
    if (!m) return null
    const n = parseInt(m[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function eosMoodRgbHex(rgb) {
    return "#" + rgb.map((v) => Math.round(eosClamp(v, 0, 255)).toString(16).padStart(2, "0")).join("")
}
// sRGB ↔ OKLab ↔ OKLCH (Björn Ottosson's matrices). L 0-1, C ≈ 0-0.37, h degrees.
function eosMoodToLin(c) {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
function eosMoodFromLin(v) {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055
    return c * 255
}
function eosMoodOklch(rgb) {
    const r = eosMoodToLin(rgb[0])
    const g = eosMoodToLin(rgb[1])
    const b = eosMoodToLin(rgb[2])
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    const C = Math.sqrt(A * A + B * B)
    const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
    return [L, C, h]
}
function eosMoodLabRgb(L, A, B) {
    const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3)
    const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3)
    const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3)
    return [
        eosMoodFromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        eosMoodFromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        eosMoodFromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ]
}
// OKLCH → sRGB 0-255, gamut-mapped by lowering chroma (keeps lightness and hue, like CSS Color 4).
function eosMoodRgbOf(L, C, h) {
    const rad = (h * Math.PI) / 180
    const inGamut = (rgb) => rgb.every((v) => v >= -0.5 && v <= 255.5)
    let rgb = eosMoodLabRgb(L, C * Math.cos(rad), C * Math.sin(rad))
    if (!inGamut(rgb)) {
        let lo = 0
        let hi = C
        for (let k = 0; k < 14; k++) {
            const mid = (lo + hi) / 2
            const t = eosMoodLabRgb(L, mid * Math.cos(rad), mid * Math.sin(rad))
            if (inGamut(t)) {
                lo = mid
                rgb = t
            } else hi = mid
        }
        if (!inGamut(rgb)) rgb = eosMoodLabRgb(L, lo * Math.cos(rad), lo * Math.sin(rad))
    }
    return rgb.map((v) => Math.round(eosClamp(v, 0, 255)))
}
// The yellow-green band in OKLCH hue degrees (olive / bile / "sick" — never a calm colour on a dark stage).
const EOS_MOOD_SICK = [96, 150]
function eosMoodSickSteps(h0, d) {
    let n = 0
    for (let k = 1; k < 16; k++) {
        const h = (((h0 + (d * k) / 16) % 360) + 360) % 360
        if (h > EOS_MOOD_SICK[0] && h < EOS_MOOD_SICK[1]) n++
    }
    return n
}
// Hue delta from h0 to h1: the short way unless the long way avoids more of the yellow-green band.
// A colour that STARTS in the band (jealous olive) leaves it by the short way.
function eosMoodHueDelta(h0, h1) {
    const short = ((((h1 - h0) % 360) + 540) % 360) - 180
    const long = short > 0 ? short - 360 : short + 360
    if (h0 > EOS_MOOD_SICK[0] && h0 < EOS_MOOD_SICK[1]) return short
    return eosMoodSickSteps(h0, long) < eosMoodSickSteps(h0, short) ? long : short
}
// Mix two hex colours at t (0 = a, 1 = b) in OKLCH → [r, g, b]. An almost-grey end (numb's flat grey) has no
// meaningful hue, so it borrows the other end's hue (CSS Color 4 "powerless hue") and only chroma rises.
function eosMoodMix(hexA, hexB, t) {
    const a = eosMoodHexRgb(hexA) || [128, 128, 128]
    const b = eosMoodHexRgb(hexB) || a
    const k = eosClamp(t, 0, 1)
    if (k <= 0) return a.slice()
    if (k >= 1) return b.slice()
    const A = eosMoodOklch(a)
    const B = eosMoodOklch(b)
    const GREY = 0.035
    let h0 = A[2]
    let h1 = B[2]
    if (A[1] < GREY && B[1] >= GREY) h0 = h1
    else if (B[1] < GREY && A[1] >= GREY) h1 = h0
    const d = eosMoodHueDelta(h0, h1)
    return eosMoodRgbOf(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, (((h0 + d * k) % 360) + 360) % 360)
}
// Late night (R8): warm a colour up to 10° of HSL hue toward amber (40°), keeping saturation and lightness.
const EOS_MOOD_AMBER = 40
function eosMoodWarm(hex) {
    const rgb = eosMoodHexRgb(hex)
    if (!rgb) return hex
    const [r, g, b] = rgb.map((v) => v / 255)
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    const l = (mx + mn) / 2
    const d = mx - mn
    if (!d) return eosMoodRgbHex(rgb)
    const s = d / (1 - Math.abs(2 * l - 1))
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = (h * 60 + 360) % 360
    const toward = ((((EOS_MOOD_AMBER - h) % 360) + 540) % 360) - 180
    h = (h + Math.sign(toward) * Math.min(10, Math.abs(toward)) + 360) % 360
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    const seg = Math.floor(h / 60) % 6
    const tri = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg]
    return eosMoodRgbHex(tri.map((v) => (v + m) * 255))
}

// ---------------------------------------------------------------- the script (pure)
// The palette for an emotion id (null / unknown = STILL's): {loud:[hex,hex], calm:[hex,hex], late}.
function eosMoodPalette(emo, opts = {}) {
    const g = eosGrade(emo) || EOS_GUIDE_CHAR.grade
    const late = opts.late == null ? eosLateNight() : !!opts.late
    const calm = late ? g.calm.map(eosMoodWarm) : g.calm.slice()
    return { loud: g.loud.slice(), calm, late }
}
// Reduced motion / calm visuals: three steps (33 / 66 / 95 %), each a cross-fade. → 0 | 1/3 | 2/3 | 1
const EOS_MOOD_STEPS = [33, 66, 95]
function eosMoodStepOf(p) {
    const v = Number(p) || 0
    return EOS_MOOD_STEPS.filter((s) => v >= s).length
}
// Progress 0-100 → script position t 0-1. Smooth: the first hits still MIRROR the feeling (validation), the
// middle of the game carries most of the change and the calm pair is fully there from 95 %.
function eosMoodT(p, calm) {
    if (calm) return eosMoodStepOf(p) / EOS_MOOD_STEPS.length
    const x = eosClamp((Number(p) || 0) / 95, 0, 1)
    return x * x * (3 - 2 * x)
}
// Alpha ramps loud → calm: wash = the soft-light grade (spec .22 → .08); grip = the edge pressure (screen);
// heat = a directional loud glow (anger's heat rising, sad's weight from above …); light = the calm light.
const EOS_MOOD_ALPHA = { wash: [0.22, 0.08], grip: [0.3, 0.05], heat: [0.3, 0], light: [0, 0.3] }
// Where the light comes from — the story of each feeling told with light (Pixar colour-script logic):
//   grip  = how hard the edges press in at the start (0-1) · heat = a loud glow shape (null = none)
//   light = the calm light's shape: dawn rising from the horizon (panic), cool light from above (anger),
//           a warm window (sad), a lantern-low glow (lonely), open space (overwhelm), the Still Point (default).
const EOS_MOOD_LIGHT = {
    auto: { grip: 1, heat: null, light: "ellipse 62% 58% at 50% 52%" },
    panic: { grip: 1.15, heat: null, light: "ellipse 120% 74% at 50% 112%" },
    anger: { grip: 0.8, heat: "ellipse 110% 62% at 50% 114%", light: "ellipse 110% 72% at 50% -14%" },
    anxiety: { grip: 1.1, heat: null, light: "ellipse 115% 72% at 50% -12%" },
    overthinking: { grip: 1, heat: null, light: "ellipse 62% 58% at 50% 52%" },
    overwhelm: { grip: 0.85, heat: "ellipse 120% 56% at 50% -12%", light: "ellipse 84% 74% at 50% 52%" },
    sad: { grip: 0.7, heat: "ellipse 120% 58% at 50% -14%", light: "ellipse 86% 80% at 16% -6%" },
    lonely: { grip: 1.15, heat: null, light: "ellipse 70% 58% at 50% 74%" },
    shame: { grip: 1, heat: null, light: "ellipse 66% 60% at 50% 52%" },
    fear: { grip: 1.15, heat: null, light: "ellipse 64% 60% at 50% 52%" },
    jealous: { grip: 0.9, heat: null, light: "ellipse 64% 60% at 50% 52%" },
    numb: { grip: 0.35, heat: null, light: "ellipse 70% 64% at 50% 52%" },
    good: { grip: 0.3, heat: null, light: "ellipse 80% 70% at 50% 52%" },
}
function eosMoodLerp(pair, t) {
    return pair[0] + (pair[1] - pair[0]) * t
}
function eosMoodRgba(rgb, a) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.round(eosClamp(a, 0, 1) * 1000) / 1000})`
}
// Everything the layers need at script position t (pure; also exposed for tests).
function eosMoodColours(emo, t, opts = {}) {
    const pal = eosMoodPalette(emo, opts)
    const k = eosClamp(t, 0, 1)
    const a = eosMoodMix(pal.loud[0], pal.calm[0], k)
    const b = eosMoodMix(pal.loud[1], pal.calm[1], k)
    const e = EOS_EMO[emo]
    const grey = !!(e && e.greyLoud)
    const L = EOS_MOOD_LIGHT[e ? emo : "auto"] || EOS_MOOD_LIGHT.auto
    return {
        t: k,
        a,
        b,
        alpha: eosMoodLerp(EOS_MOOD_ALPHA.wash, k),
        grip: eosMoodLerp(EOS_MOOD_ALPHA.grip, k) * L.grip,
        gripAt: Math.round(46 + 36 * k), // inner radius (%) of the edge pressure: the grip loosens as you play
        heat: L.heat ? eosMoodLerp(EOS_MOOD_ALPHA.heat, k) : 0,
        heatShape: L.heat || "ellipse 100% 60% at 50% 112%",
        light: eosMoodLerp(EOS_MOOD_ALPHA.light, k),
        lightShape: L.light,
        sat: grey ? Math.round((0.6 + 0.4 * k) * 1000) / 1000 : null,
        late: pal.late,
        palette: pal,
    }
}
// The three flip words for an emotion (STILL's when unknown). Never empty.
function eosMoodFlipWords(emo) {
    const e = EOS_EMO[emo] || EOS_GUIDE_CHAR
    const w = Array.isArray(e.flip) ? e.flip.filter((x) => typeof x === "string" && x.trim()) : []
    return (w.length ? w : EOS_GUIDE_CHAR.flip).slice(0, 3)
}

// ---------------------------------------------------------------- flip crown layout (pure geometry)
// The crown: left word low, centre word high, right word low — read left → right as they bloom.
const EOS_MOOD_SLOTS = [
    [-1, 0.28],
    [0, 1],
    [1, 0.28],
]
const EOS_MOOD_RISE = 60
// Things the words must not land on (stage-relative): the arcade's finish card (it sits where the last tap
// was), the LIVE GUIDE panel, the HUD, the companion.
const EOS_MOOD_AVOID = ".globalFinishFeedbackCopy, .globalPlayGuide, .engineProgressHud, .tsShiftRewardHud, .eosCompanion"
let eosMoodCanvas = null
function eosMoodTextWidth(text, px) {
    try {
        if (typeof document !== "undefined") {
            eosMoodCanvas = eosMoodCanvas || document.createElement("canvas")
            const ctx = eosMoodCanvas.getContext("2d")
            if (ctx) {
                ctx.font = `800 ${px}px "Baloo 2", Nunito, system-ui, sans-serif`
                const w = ctx.measureText(String(text)).width
                if (w > 0) return w * 1.03
            }
        }
    } catch {}
    return String(text).length * px * 0.56
}
// Obstacle-set signature on an 8 px grid (re-place only when something really moved / appeared).
function eosMoodSig(list) {
    return list.map((o) => `${Math.round(o.x / 8)},${Math.round(o.y / 8)},${Math.round(o.w / 8)},${Math.round(o.h / 8)}`).join("|")
}
function eosMoodOverlap(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
    return w > 0 && h > 0 ? w * h : 0
}
// → {x, y, dx, lift, fs, boxes, score} — the anchor nearest the Still Point (x0, y0) whose word boxes
// (including their 60 px rise) stay inside the stage and off every obstacle.
function eosMoodPlace({ W, H, x0, y0, phone, words, obstacles = [] }) {
    const fs = phone ? eosClamp(W * 0.07, 22, 30) : eosClamp(W * 0.044, 22, 42)
    const dx = phone ? eosClamp(W * 0.27, 78, 118) : eosClamp(W * 0.17, 120, 210)
    const lift = phone ? 54 : 66
    const widths = words.map((w) => eosMoodTextWidth(w, fs) + 12)
    const boxesAt = (x, y) =>
        words.map((_, i) => {
            const s = EOS_MOOD_SLOTS[i] || [0, 0]
            const cx = x + s[0] * dx
            const cy = y - s[1] * lift
            const h = fs * 1.2
            return { x: cx - widths[i] / 2, y: cy - h / 2 - EOS_MOOD_RISE, w: widths[i], h: h + EOS_MOOD_RISE, cx, cy }
        })
    const m = 8
    const inside = { x: m, y: m, w: Math.max(1, W - 2 * m), h: Math.max(1, H - 2 * m) }
    let best = null
    const xs = [0, -0.14, 0.14, -0.26, 0.26, -0.36, 0.36].map((f) => f * W)
    const ys = [0, -60, 60, -120, 120, -180, 180, -240, 240]
    for (const oy of ys)
        for (const ox of xs) {
            const x = x0 + ox
            const y = y0 + oy
            const boxes = boxesAt(x, y)
            let score = (Math.abs(ox) + Math.abs(oy)) * 22
            for (const b of boxes) {
                score += (b.w * b.h - eosMoodOverlap(b, inside)) * 6
                for (const o of obstacles) score += eosMoodOverlap(b, o) * 4
            }
            if (!best || score < best.score) best = { x, y, dx, lift, fs, boxes, score }
        }
    return best
}

// ---------------------------------------------------------------- live state for tests (dev handle)
const EOS_MOOD_LIVE = { emo: null, p: null, t: 0, step: 0, calm: false, late: false, bloomAt: 0, bloomPerf: 0, words: [], bloomFrom: null, place: null }

// ---------------------------------------------------------------- component
const EOS_MOOD_DONE_SEL = ".globalPlayGuide.isComplete, .tsRewardSurge.mega"
const EOS_MOOD_STAGGER = 250

function EosMoodGrade({ game, hostRef, reduced = false }) {
    const st = useEosStore()
    const calm = eosCalm(reduced)
    const emo = st.emotion || st.detected || null
    const p = useEosProgress(hostRef, 4)
    const late = React.useMemo(() => eosLateNight(), [])
    const flipRef = React.useRef(null)
    const [bloom, setBloom] = React.useState(null)

    const t = eosMoodT(p == null ? 0 : p, calm)
    const col = eosMoodColours(emo, t, { late })
    const step = eosMoodStepOf(p == null ? 0 : p)

    // ---- finish watch: the first `.globalPlayGuide.isComplete` / `.tsRewardSurge.mega` → bloom once per mount.
    // The arcade's finish card (`.globalFinishFeedbackCopy`, placed where the last tap was) can arrive up to a few
    // seconds AFTER isComplete (POP ≈ 0.9 s, HOT POTATO ≈ 2.5 s): for the life of the words the crown keeps
    // re-checking its obstacles and glides out of the way (0.5 s) instead of landing on the card.
    React.useEffect(() => {
        let alive = true
        let timer = 0
        let sig = ""
        let geo = null
        let guess = null
        const tones = []
        const measure = () => {
            const root = flipRef.current
            const host = hostRef && hostRef.current
            if (!root) return null
            const stage = (root.closest && root.closest(".releaseStage")) || (host && host.closest && host.closest(".releaseStage")) || null
            const W = root.offsetWidth || (stage && stage.offsetWidth) || 0
            const H = root.offsetHeight || (stage && stage.offsetHeight) || 0
            if (!W || !H) return null
            // Obstacles in root px. An element still in its entrance scale is measured at its layout size.
            const obstacles = []
            try {
                const scope = stage || host
                if (scope)
                    scope.querySelectorAll(EOS_MOOD_AVOID).forEach((el) => {
                        const q = eosRelRect(el, root)
                        if (!q || q.w < 4 || q.h < 4) return
                        const cs = getComputedStyle(el)
                        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return
                        const w = Math.max(q.w, el.offsetWidth || 0) + 20
                        const h = Math.max(q.h, el.offsetHeight || 0) + 20
                        obstacles.push({ x: q.cx - w / 2, y: q.cy - h / 2, w, h })
                    })
            } catch {}
            return { root, stage, W, H, obstacles }
        }
        // The arcade centres its finish card on the last press inside `.cinematicContentShell` (default 74 % / 14 %),
        // clamped into the window (fitFeedbackInsideGameWindow). Track that press so the crown can leave room for the
        // card BEFORE it arrives; the follow-up check corrects any miss.
        let press = null
        const host0 = hostRef && hostRef.current
        const onPress = (e) => {
            if (e.type === "pointermove" && !e.buttons) return
            const t = e.target
            if (t && t.closest && t.closest(".cinematicContentShell")) press = { x: e.clientX, y: e.clientY }
        }
        if (host0 && host0.addEventListener) ["pointerdown", "pointerup", "pointermove"].forEach((k) => host0.addEventListener(k, onPress, true))
        const predictCard = (root, W) => {
            const host = hostRef && hostRef.current
            const shell = host && host.querySelector(".cinematicContentShell")
            if (!shell || !root) return null
            const R = shell.getBoundingClientRect()
            const k = eosStageScale(shell) || 1
            const sr = eosRelRect(shell, root)
            if (!R.width || !R.height || !sr) return null
            const sw = R.width / k
            const sh = R.height / k
            const fx = press ? eosClamp((press.x - R.left) / R.width, 0, 1) : 0.74
            const fy = press ? eosClamp((press.y - R.top) / R.height, 0, 1) : 0.14
            const narrow = W <= 700
            const w = Math.min(narrow ? 300 : 450, sw - (narrow ? 72 : 112))
            const h = narrow ? 128 : 150
            const left = eosClamp(fx * sw - w / 2, 42, Math.max(42, sw - 42 - w))
            const top = eosClamp(fy * sh - h / 2, 58, Math.max(58, sh - 28 - h))
            return { x: sr.x + left - 10, y: sr.y + top - 10, w: w + 20, h: h + 20, predicted: true }
        }
        const fire = () => {
            const m = measure()
            if (!m) return false
            const { root, stage, W, H } = m
            const obstacles = m.obstacles.slice()
            let predicted = false
            try {
                if (!(stage || root).querySelector(".globalFinishFeedbackCopy")) {
                    guess = predictCard(root, W)
                    if (guess) {
                        obstacles.push(guess)
                        predicted = true
                    }
                }
            } catch {}
            let x = W / 2
            let y = H * 0.5
            let from = "stage"
            const core = stage && stage.querySelector(".eosThoughtFlow .eosCore")
            const r = core ? eosRelRect(core, root) : null
            if (r && r.w > 2 && r.h > 2 && r.cx > 0 && r.cx < W && r.cy > 0 && r.cy < H) {
                x = r.cx
                y = r.cy
                from = "core"
            }
            const phone = W < 560
            const st0 = EOS_STORE.get()
            const words = eosMoodFlipWords(st0.emotion || st0.detected || null)
            const place = eosMoodPlace({ W, H, x0: x, y0: y, phone, words, obstacles })
            const at = Date.now()
            geo = { W, H, x0: x, y0: y, phone, words, x: place.x, y: place.y }
            sig = eosMoodSig(obstacles)
            EOS_MOOD_LIVE.bloomAt = at
            EOS_MOOD_LIVE.bloomPerf = typeof performance !== "undefined" ? performance.now() : 0
            EOS_MOOD_LIVE.words = words.slice()
            EOS_MOOD_LIVE.bloomFrom = from
            EOS_MOOD_LIVE.place = { x: Math.round(place.x), y: Math.round(place.y), core: [Math.round(x), Math.round(y)], obstacles: obstacles.length, predicted, score: Math.round(place.score), moves: 0 }
            // start offsets: every word is born in the Still Point (fixed for the word's life, even if the crown moves)
            const start = words.map((_, i) => {
                const s = EOS_MOOD_SLOTS[i] || [0, 0]
                return [Math.round(x - (place.x + s[0] * place.dx)), Math.round(y - (place.y - s[1] * place.lift))]
            })
            setBloom({ x: place.x, y: place.y, dx: place.dx, lift: place.lift, start, phone, words, at, from })
            // a soft rising sparkle under each word (gated by the arcade's sound toggle inside eosTone)
            words.forEach((_, i) => {
                tones.push(
                    setTimeout(() => {
                        if (!alive) return
                        eosTone(eosNote(8 + i * 2, 392), 520, { type: "sine", gain: 0.028 })
                        eosTone(eosNote(13 + i * 2, 392), 380, { type: "triangle", gain: 0.012, at: 0.03 })
                    }, i * EOS_MOOD_STAGGER)
                )
            })
            return true
        }
        // after the bloom: make room for anything that lands later (the finish card)
        const LIFE = 1800 + EOS_MOOD_STAGGER * 2
        const follow = () => {
            if (!alive || !geo) return
            if (Date.now() - EOS_MOOD_LIVE.bloomAt > LIFE) return
            const m = measure()
            if (m) {
                // until the real card shows up, keep its predicted place reserved
                let real = false
                try {
                    real = !!(m.stage || m.root).querySelector(".globalFinishFeedbackCopy")
                } catch {}
                const obstacles = !real && guess ? m.obstacles.concat([guess]) : m.obstacles
                const next = eosMoodSig(obstacles)
                if (next !== sig) {
                    sig = next
                    const place = eosMoodPlace({ W: m.W, H: m.H, x0: geo.x0, y0: geo.y0, phone: geo.phone, words: geo.words, obstacles })
                    if (Math.abs(place.x - geo.x) > 4 || Math.abs(place.y - geo.y) > 4) {
                        geo.x = place.x
                        geo.y = place.y
                        if (EOS_MOOD_LIVE.place) {
                            EOS_MOOD_LIVE.place.x = Math.round(place.x)
                            EOS_MOOD_LIVE.place.y = Math.round(place.y)
                            EOS_MOOD_LIVE.place.moves += 1
                            EOS_MOOD_LIVE.place.obstacles = obstacles.length
                        }
                        setBloom((b) => (b ? { ...b, x: place.x, y: place.y } : b))
                    }
                }
            }
            timer = setTimeout(follow, 100)
        }
        // Finish detection: a class observer on the guide panel (no subtree: cheap) fires the same tick the guide
        // turns `isComplete`; the 100 ms poll covers `.tsRewardSurge.mega` and a re-mounted guide.
        let mo = null
        let watched = null
        let fired = false
        const check = () => {
            if (!alive || fired) return
            clearTimeout(timer)
            const host = hostRef && hostRef.current
            let done = false
            try {
                done = !!(host && host.querySelector && host.querySelector(EOS_MOOD_DONE_SEL))
                const guide = host && host.querySelector && host.querySelector(".globalPlayGuide")
                if (guide !== watched && typeof MutationObserver !== "undefined") {
                    if (mo) mo.disconnect()
                    mo = null
                    watched = guide
                    if (guide) {
                        mo = new MutationObserver(check)
                        mo.observe(guide, { attributes: true, attributeFilter: ["class"] })
                    }
                }
            } catch {}
            if (done && fire()) {
                fired = true
                if (mo) mo.disconnect()
                mo = null
                timer = setTimeout(follow, 100)
                return
            }
            timer = setTimeout(check, 100)
        }
        check()
        return () => {
            alive = false
            clearTimeout(timer)
            if (mo) mo.disconnect()
            tones.forEach(clearTimeout)
            if (host0 && host0.removeEventListener) ["pointerdown", "pointerup", "pointermove"].forEach((k) => host0.removeEventListener(k, onPress, true))
        }
    }, [hostRef])

    // dev / test mirror (no store writes; plain object)
    React.useEffect(() => {
        EOS_MOOD_LIVE.emo = emo
        EOS_MOOD_LIVE.p = p
        EOS_MOOD_LIVE.t = t
        EOS_MOOD_LIVE.step = step
        EOS_MOOD_LIVE.calm = calm
        EOS_MOOD_LIVE.late = late
    })
    React.useEffect(
        () => () => {
            EOS_MOOD_LIVE.bloomAt = 0
            EOS_MOOD_LIVE.bloomPerf = 0
            EOS_MOOD_LIVE.words = []
            EOS_MOOD_LIVE.bloomFrom = null
            EOS_MOOD_LIVE.place = null
        },
        []
    )

    const vars = {
        "--eos-mood-a": eosMoodRgba(col.a, col.alpha),
        "--eos-mood-b": eosMoodRgba(col.b, col.alpha),
        "--eos-p": String(Math.round(t * 1000) / 1000),
    }
    if (col.sat != null) vars["--eos-mood-sat"] = String(col.sat)
    const air = {
        "--eos-mood-edge": eosMoodRgba(col.b, col.grip),
        "--eos-mood-grip": `${col.gripAt}%`,
        "--eos-mood-heat": eosMoodRgba(col.a, col.heat),
        "--eos-mood-hshape": col.heatShape,
        "--eos-mood-glow": eosMoodRgba(col.a, col.light),
        "--eos-mood-lshape": col.lightShape,
    }
    const common = { "aria-hidden": "true", "data-eos-emotion": emo || "auto", "data-eos-calm": calm ? "1" : "0" }
    const glowA = eosMoodRgba(eosMoodHexRgb(col.palette.calm[0]) || [255, 220, 140], 0.9)
    const glowB = eosMoodRgba(eosMoodHexRgb(col.palette.calm[1]) || [255, 190, 110], 0.65)
    return (
        <>
            <div className="eosMoodGrade" {...common} data-eos-step={step} data-eos-late={late ? "1" : "0"} data-eos-grey={col.sat != null ? "1" : "0"} style={vars} />
            <div className="eosMoodAir" {...common} style={air} />
            <div ref={flipRef} className={`eosMoodFlip${bloom ? " isBloom" : ""}${bloom && bloom.phone ? " isPhone" : ""}`} {...common} data-eos-from={bloom ? bloom.from : ""}>
                {bloom
                    ? bloom.words.map((w, i) => {
                          const slot = EOS_MOOD_SLOTS[i] || [0, 0]
                          const wx = Math.round(bloom.x + slot[0] * bloom.dx)
                          const wy = Math.round(bloom.y - slot[1] * bloom.lift)
                          const style = {
                              left: `${wx}px`,
                              top: `${wy}px`,
                              "--eos-mood-i": String(i),
                              // each word is born in the Still Point and blooms out to its place in the crown
                              "--eos-mood-dx": `${(bloom.start[i] || [0, 0])[0]}px`,
                              "--eos-mood-dy": `${(bloom.start[i] || [0, 0])[1]}px`,
                              "--eos-mood-glow-a": glowA,
                              "--eos-mood-glow-b": glowB,
                          }
                          return (
                              <span key={`${bloom.at}-${i}`} className="eosMoodWord" style={style} data-eos-flip={i}>
                                  <span className="eosMoodWordIn">
                                      <span className="eosMoodWordTx">{w}</span>
                                      {calm ? null : (
                                          <i className="eosMoodSparks">
                                              <i />
                                              <i />
                                              <i />
                                              <i />
                                          </i>
                                      )}
                                  </span>
                              </span>
                          )
                      })
                    : null}
            </div>
        </>
    )
}

// ---------------------------------------------------------------- CSS
// Registered custom properties let the gradient colours (and numb's saturation) cross-fade smoothly between the
// 4 Hz progress updates — a plain `transition: background` cannot interpolate gradients. Browsers without
// @property simply step (still correct). Inherits:false keeps them local to the layer.
const EOS_MOOD_CSS = `
@property --eos-mood-a{syntax:"<color>";inherits:false;initial-value:rgba(0,0,0,0)}
@property --eos-mood-b{syntax:"<color>";inherits:false;initial-value:rgba(0,0,0,0)}
@property --eos-mood-edge{syntax:"<color>";inherits:false;initial-value:rgba(0,0,0,0)}
@property --eos-mood-glow{syntax:"<color>";inherits:false;initial-value:rgba(0,0,0,0)}
@property --eos-mood-heat{syntax:"<color>";inherits:false;initial-value:rgba(0,0,0,0)}
@property --eos-mood-grip{syntax:"<percentage>";inherits:false;initial-value:46%}
@property --eos-mood-sat{syntax:"<number>";inherits:false;initial-value:1}
${EOS_A} .eosMoodGrade,${EOS_A} .eosMoodAir,${EOS_A} .eosMoodFlip{position:absolute;inset:0;z-index:${EOS_Z.mood};pointer-events:none!important;margin:0;padding:0;border:0;border-radius:inherit}
${EOS_A} .eosMoodGrade{mix-blend-mode:soft-light;background:linear-gradient(158deg,var(--eos-mood-a) 0%,var(--eos-mood-b) 100%);
transition:--eos-mood-a .6s linear,--eos-mood-b .6s linear,--eos-mood-sat .6s linear,background .6s linear}
${EOS_A} .eosMoodGrade[data-eos-grey="1"]{-webkit-backdrop-filter:saturate(var(--eos-mood-sat));backdrop-filter:saturate(var(--eos-mood-sat))}
${EOS_A} .eosMoodAir{mix-blend-mode:screen;background:radial-gradient(var(--eos-mood-lshape,ellipse 62% 58% at 50% 52%),var(--eos-mood-glow) 0%,rgba(0,0,0,0) 100%),
radial-gradient(var(--eos-mood-hshape,ellipse 100% 60% at 50% 112%),var(--eos-mood-heat) 0%,rgba(0,0,0,0) 100%),
radial-gradient(ellipse 76% 70% at 50% 52%,rgba(0,0,0,0) var(--eos-mood-grip),var(--eos-mood-edge) 100%);
transition:--eos-mood-edge .6s linear,--eos-mood-glow .6s linear,--eos-mood-heat .6s linear,--eos-mood-grip .9s cubic-bezier(.3,.6,.3,1)}
${EOS_A} .eosMoodFlip{overflow:hidden;container-type:size}
${EOS_A} .eosMoodWord{position:absolute;display:block;translate:-50% -50%;white-space:nowrap;line-height:1;transition:left .5s cubic-bezier(.3,.7,.3,1),top .5s cubic-bezier(.3,.7,.3,1)}
${EOS_A} .eosMoodFlip[data-eos-calm="1"] .eosMoodWord{transition:none}
${EOS_A} .eosMoodWordIn{position:relative;display:block;opacity:0;translate:var(--eos-mood-dx) var(--eos-mood-dy);scale:.4;
animation:eosMoodRise 1.8s linear calc(var(--eos-mood-i) * ${EOS_MOOD_STAGGER}ms) 1 both}
${EOS_A} .eosMoodWordIn::before{content:"";position:absolute;inset:-34% -16%;z-index:-1;border-radius:50%;background:radial-gradient(closest-side,rgba(10,8,34,.6),rgba(10,8,34,.28) 55%,rgba(10,8,34,0))}
${EOS_A} .eosMoodWordTx{display:block;font:900 26px/1.06 var(--eos-font,"Baloo 2","Nunito",system-ui,sans-serif)!important;font-size:clamp(22px,4.4cqi,42px)!important;letter-spacing:.015em!important;
color:#fff6dc!important;background:linear-gradient(180deg,#ffffff 22%,#fff1c4 52%,#ffd77a 86%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
text-shadow:none!important;-webkit-text-stroke:0!important;text-transform:none!important;opacity:1!important;
filter:drop-shadow(0 2px 0 rgba(96,46,0,.55)) drop-shadow(0 0 10px var(--eos-mood-glow-a)) drop-shadow(0 0 26px var(--eos-mood-glow-b))}
${EOS_A} .eosMoodSparks{position:absolute;left:50%;top:50%;width:0;height:0}
${EOS_A} .eosMoodSparks>i{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:#fff7d6;box-shadow:0 0 8px 2px var(--eos-mood-glow-a);opacity:0;
animation:eosMoodSpark .9s cubic-bezier(.15,.7,.3,1) calc(var(--eos-mood-i) * ${EOS_MOOD_STAGGER}ms + .18s) 1 both}
${EOS_A} .eosMoodSparks>i:nth-child(1){--eos-mood-sx:-74px;--eos-mood-sy:-26px}
${EOS_A} .eosMoodSparks>i:nth-child(2){--eos-mood-sx:70px;--eos-mood-sy:-30px}
${EOS_A} .eosMoodSparks>i:nth-child(3){--eos-mood-sx:-52px;--eos-mood-sy:30px}
${EOS_A} .eosMoodSparks>i:nth-child(4){--eos-mood-sx:58px;--eos-mood-sy:26px}
${EOS_A} .eosMoodFlip.isPhone .eosMoodWordTx{font-size:clamp(22px,7cqi,30px)!important}
@media (max-width:560px){${EOS_A} .eosMoodWordTx{font-size:clamp(22px,7cqi,30px)!important}}
@keyframes eosMoodRise{
0%{opacity:0;scale:.3;animation-timing-function:cubic-bezier(.15,.8,.3,1)}
15%{opacity:1;translate:0 0;scale:1.16;animation-timing-function:cubic-bezier(.35,0,.35,1)}
25%{scale:.94;animation-timing-function:ease-in-out}
35%{scale:1.03;animation-timing-function:ease-in-out}
45%{scale:1;animation-timing-function:ease-out}
72%{opacity:1;animation-timing-function:cubic-bezier(.4,0,.7,.4)}
100%{opacity:0;translate:0 -${EOS_MOOD_RISE}px;scale:1}}
@keyframes eosMoodFade{0%{opacity:0;animation-timing-function:ease-out}16%{opacity:1}74%{opacity:1;animation-timing-function:ease-in}100%{opacity:0}}
@keyframes eosMoodSpark{0%{opacity:0;translate:0 0;scale:.4}22%{opacity:1;scale:1.2}100%{opacity:0;translate:var(--eos-mood-sx) var(--eos-mood-sy);scale:.3}}
${EOS_A} .eosMoodGrade[data-eos-calm="1"]{transition:--eos-mood-a .9s ease-in-out,--eos-mood-b .9s ease-in-out,--eos-mood-sat .9s ease-in-out,background .9s ease-in-out}
${EOS_A} .eosMoodAir[data-eos-calm="1"]{transition:--eos-mood-edge .9s ease-in-out,--eos-mood-glow .9s ease-in-out,--eos-mood-heat .9s ease-in-out,--eos-mood-grip .9s ease-in-out}
${EOS_A} .eosMoodFlip[data-eos-calm="1"] .eosMoodWordIn{translate:none;scale:none;animation:eosMoodFade 2.2s ease-in-out calc(var(--eos-mood-i) * ${EOS_MOOD_STAGGER}ms) 1 both}
@media (prefers-reduced-motion:reduce){
  ${EOS_A} .eosMoodWordIn{translate:none!important;scale:none!important;animation:eosMoodFade 2.2s ease-in-out calc(var(--eos-mood-i) * ${EOS_MOOD_STAGGER}ms) 1 both!important}
  ${EOS_A} .eosMoodSparks{display:none!important}
  ${EOS_A} .eosMoodWord{transition:none!important}
  ${EOS_A} .eosMoodGrade{transition:--eos-mood-a .9s ease-in-out,--eos-mood-b .9s ease-in-out,--eos-mood-sat .9s ease-in-out,background .9s ease-in-out}
  ${EOS_A} .eosMoodAir{transition:--eos-mood-edge .9s ease-in-out,--eos-mood-glow .9s ease-in-out,--eos-mood-heat .9s ease-in-out,--eos-mood-grip .9s ease-in-out}
}
`
eosCss("mood", EOS_MOOD_CSS)

// ---------------------------------------------------------------- module API (read-only helpers; dev handle)
eosExpose("mood", {
    state: () => ({ ...EOS_MOOD_LIVE, words: EOS_MOOD_LIVE.words.slice() }),
    palette: eosMoodPalette,
    colours: eosMoodColours,
    t: eosMoodT,
    step: eosMoodStepOf,
    flipWords: eosMoodFlipWords,
    mix: eosMoodMix,
    warm: eosMoodWarm,
})
