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
//       Each progress change glides there in .6 s (a per-frame JS tween in OKLCH, not a CSS transition, so a starved
//       main thread can never leave the stage stuck on the loud colours; no @property needed).
//       Reduced motion / calm visuals: the script moves in three steps (33 / 66 / 95 %) with .9 s cross-fades only —
//       95, not 100, so the calm pair is on screen before the finish in every mode. The finish itself always lands
//       on the calm pair.
//   (b) FLIP BLOOM. The moment `.globalPlayGuide.isComplete` or `.tsRewardSurge.mega` first appears, the
//       feeling's three `flip` words (core data: panic safe · slow · right here, sad lighter · warm · held …)
//       bloom out of the Still Point (the measured `.eosCore` centre, else the stage centre), 200 ms apart, and
//       float up 60 px as they fade (1.5 s each): the whole bloom ends by 1.9 s, inside the shortest finish hold
//       (2.05 s), so it never depends on how an engine times onDone. Negative words went in; positive words come out.
//       The words are pre-rendered (hidden) and painted by the finish observer itself, so they start in the frame
//       that shows the finish. Placement: the GAME'S OWN FINALE is a hard obstacle (CREATIVE_STANDARDS 2 + 4) —
//       [data-eos-avoid] (contract: engines tag their character bubble and finale headline), [data-eos-char], the
//       known 111-114 hero roots, and in every game each visible picture ≥ 20 px and text of ≥ 2 letters at ≥ 14 px;
//       the arcade chrome (finish card — predicted, it is centred —, LIVE GUIDE, HUD, companion) is soft.
//       The search widens in tiers until a clean place is found (crown near the Still Point → anywhere on the stage
//       → tight / stacked crown → smaller words, never below 20 px). The crown never travels sideways: a word that
//       something new lands on during its life fades away instead (yield).
//       Reduced / calm: they fade in place (no transforms at all, not even for centring).
//   The grade and air layers carve the chrome out (a feathered SVG mask over the HUD, the shift-sparks HUD and the
//   LIVE GUIDE), so the small score / sparks text keeps its full contrast.
//
// Mount (integration I1-E3, inside the play fragment, both wrappers, every game):
//   <EosMoodGrade game={selected} hostRef={gameHostRef} reduced={!!reduced} />
// It renders three absolutely positioned siblings inside `.releaseStage` (all aria-hidden, pointer-events none):
//   div.eosMoodGrade (z 54, the soft-light grade) · div.eosMoodAir (z 54, screen) · div.eosMoodFlip (z 54, words).
// They are siblings — not children — because a z-indexed root is an isolated blending group: a soft-light child
// would blend with nothing, and the words must not be blended or faded with the grade.
// Reads progress through core's shared useEosProgress poll; the finish watch is a 100 ms query on the game host
// that stops at the bloom. No store writes, no user text, every timer cleaned up. The flip words name a feeling's
// opposite, so their root carries EOS_PRIVATE_ATTRS + fs-mask (session-replay tools skip it).
// The finish always lands on the calm pair (data-eos-done="1"), even if a game completes below 95 % on its bar.
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
        gripAt: Math.round((46 + 36 * k) * 10) / 10, // inner radius (%) of the edge pressure: the grip loosens as you play
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
// Layouts: "crown" (left word low, centre word high, right word low — read left → right as they bloom),
// "tight" (the same crown pulled in until the side words only clear each other) and "stack" (three lines, read top →
// bottom). → [dx, dy] offset of word i from the anchor. dx = [left, right] spread; for "stack", lift = the line pitch.
const EOS_MOOD_SLOTS = [
    [-1, 0.28],
    [0, 1],
    [1, 0.28],
]
// The float: each word rises 44 px as it fades. Only the first 30 px count for placement (the rest is crossed at
// under half opacity), so the crown fits the narrow bands a busy phone finale leaves.
const EOS_MOOD_RISE = 44
const EOS_MOOD_RISE_BOX = 30
function eosMoodSlotOff(i, dx, lift, layout) {
    if (layout === "stack") return [0, (i - 1) * (Number(lift) || 0)]
    const s = EOS_MOOD_SLOTS[i] || [0, 0]
    const d = Array.isArray(dx) ? (s[0] < 0 ? dx[0] : dx[1]) : Number(dx) || 0
    return [s[0] * d, -s[1] * lift]
}
// SOFT obstacles (stage-relative), the arcade chrome: the finish card (it sits where the last tap was), the LIVE GUIDE
// panel, the HUD, the companion. HARD obstacles are the game's own finale (eosMoodContent): the words supplement a
// game's finale and never cover it (CREATIVE_STANDARDS 2 + 4).
const EOS_MOOD_AVOID = ".globalFinishFeedbackCopy, .globalPlayGuide, .engineProgressHud, .tsShiftRewardHud, .eosCompanion"
// Weights per px² of overlap (dist: per px of anchor travel from the Still Point). Hard content weighs 12× the chrome;
// the finish card (its "SHIFTED ✓" is the finish message) weighs 2.5× the rest of the chrome.
const EOS_MOOD_COST = { dist: 22, out: 6, soft: 4, card: 10, hard: 48 }
let eosMoodCanvas = null
function eosMoodTextWidth(text, px) {
    try {
        if (typeof document !== "undefined") {
            eosMoodCanvas = eosMoodCanvas || document.createElement("canvas")
            const ctx = eosMoodCanvas.getContext("2d")
            if (ctx) {
                // the words render in Baloo 2 900 (.eosMoodWordTx): measure at the same weight
                ctx.font = `900 ${px}px "Baloo 2", Nunito, system-ui, sans-serif`
                const w = ctx.measureText(String(text)).width
                if (w > 0) return w * 1.03
            }
        }
    } catch {}
    return String(text).length * px * 0.58
}
function eosMoodOverlap(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
    return w > 0 && h > 0 ? w * h : 0
}
// The crown's measurements for one font size + layout: {fs, widths, dx:[left, right], lift, layout}.
function eosMoodGeom(W, phone, words, fs, layout) {
    const widths = words.map((w) => eosMoodTextWidth(w, fs) + 12)
    const gap = phone ? 6 : 16
    if (layout === "stack") return { fs, widths, dx: [0, 0], lift: Math.round(fs * 1.24), layout }
    if (layout === "tight") {
        // the side words sit one line below the centre word, so they only have to clear EACH OTHER
        const d = Math.max(((widths[0] || 0) + (widths[2] || 0)) / 4 + gap / 2, fs * 0.8)
        return { fs, widths, dx: [d, d], lift: fs * 1.6, layout }
    }
    // the centre word sits at least one line above the side words (lift × .72 ≥ 1.15 em), so the words never touch,
    // whatever their length; each side also spreads out to clear its neighbour (two-word flips: "right here").
    const base = phone ? eosClamp(W * 0.27, 78, 118) : eosClamp(W * 0.17, 120, 210)
    const lift = Math.max(phone ? 54 : 66, fs * 1.6)
    const cap = Math.max(base, W * 0.42)
    const spread = (a, b) => eosClamp((a + b) / 2 + gap, base, cap)
    const dx = [spread(widths[0] || 0, widths[1] || 0), spread(widths[1] || 0, widths[2] || 0)]
    // …but the whole crown must fit the stage: squeeze the spread (never below the side words' own clearance)
    const sides = ((widths[0] || 0) + (widths[2] || 0)) / 2
    const room = Math.max(sides + gap, W - 16 - sides)
    if (dx[0] + dx[1] > room) {
        const k = room / (dx[0] + dx[1])
        dx[0] *= k
        dx[1] *= k
    }
    return { fs, widths, dx, lift, layout: "crown" }
}
// Word boxes of geometry g anchored at (x, y), each including the counted part of its rise.
function eosMoodBoxes(g, x, y) {
    return g.widths.map((w, i) => {
        const o = eosMoodSlotOff(i, g.dx, g.lift, g.layout)
        const cx = x + o[0]
        const cy = y + o[1]
        const h = g.fs * 1.2
        return { x: cx - w / 2, y: cy - h / 2 - EOS_MOOD_RISE_BOX, w, h: h + EOS_MOOD_RISE_BOX, cx, cy }
    })
}
// Overlap of a set of word boxes: {out (px² outside the stage), soft, hard}.
function eosMoodHits(boxes, obstacles, inside) {
    let out = 0
    let soft = 0
    let hard = 0
    for (const b of boxes) {
        out += b.w * b.h - eosMoodOverlap(b, inside)
        for (const o of obstacles) {
            const v = eosMoodOverlap(b, o)
            if (v) o.hard ? (hard += v) : (soft += o.card ? (v * EOS_MOOD_COST.card) / EOS_MOOD_COST.soft : v)
        }
    }
    return { out, soft, hard }
}
// → {x, y, dx, lift, fs, layout, boxes, score, clean, tier, hard, soft, out}. Finds the anchor nearest the Still Point
// (x0, y0) whose word boxes (including their rise) stay inside the stage and off every obstacle, searching in tiers and
// stopping at the first tier with a CLEAN place (no overlap at all):
//   0 the crown within ±240 px of the Still Point · 1 the crown anywhere on the stage (the clearest band above or below
//   the game's character) · 2 a tight crown, then a stacked one · 3 smaller words (×.84, ×.7, never below 20 px).
// When nothing is clean, the least-covering place wins (hard content weighs 12× the chrome).
function eosMoodPlace({ W, H, x0, y0, phone, words, obstacles = [] }) {
    const fs0 = phone ? eosClamp(W * 0.07, 22, 30) : eosClamp(W * 0.044, 22, 42)
    const m = 8
    const inside = { x: m, y: m, w: Math.max(1, W - 2 * m), h: Math.max(1, H - 2 * m) }
    const C = EOS_MOOD_COST
    const near = { xs: [0, -0.14, 0.14, -0.26, 0.26, -0.36, 0.36].map((f) => f * W), ys: [0, -60, 60, -120, 120, -180, 180, -240, 240] }
    const wide = (fs) => {
        const ys = []
        for (let y = m + EOS_MOOD_RISE_BOX + fs * 1.4; y <= H - m - fs * 0.6; y += 24) ys.push(y - y0)
        return { xs: [0, -0.12, 0.12, -0.24, 0.24, -0.34, 0.34, -0.42, 0.42].map((f) => f * W), ys }
    }
    const fsList = [fs0]
    for (const k of [0.84, 0.7]) {
        const f = Math.max(20, Math.round(fs0 * k))
        if (f < fsList[fsList.length - 1] - 1) fsList.push(f)
    }
    const tiers = [[{ fs: fs0, layout: "crown", grid: near }], [{ fs: fs0, layout: "crown", grid: wide(fs0) }], [{ fs: fs0, layout: "tight", grid: wide(fs0) }, { fs: fs0, layout: "stack", grid: wide(fs0) }], []]
    for (const f of fsList.slice(1)) for (const layout of ["crown", "tight", "stack"]) tiers[3].push({ fs: f, layout, grid: wide(f) })
    const LAYOUT_COST = { crown: 0, tight: 600, stack: 1400 }
    let best = null
    let found = null
    // Exact pruning (the result is identical to scoring every candidate in full; it only skips work that cannot win):
    //   · each anchor row only tests the obstacles that cross its vertical band (the word boxes never move vertically
    //     when the crown slides sideways), so a busy finale costs rows × (a slice of the obstacles), not the whole list;
    //   · a candidate stops scoring as soon as it can neither be clean nor beat the best score so far (and, once a
    //     clean place exists, as soon as it cannot beat that one). Scores only grow as overlap is added.
    const evalAt = (g, x0c, y, tier, obs) => {
        // slide the crown sideways into the stage when it pokes out and fits (a long right word, an edge anchor)
        let x = x0c
        let boxes = eosMoodBoxes(g, x, y)
        const lo = Math.min(...boxes.map((q) => q.x))
        const hi = Math.max(...boxes.map((q) => q.x + q.w))
        const shift = lo < m ? Math.min(m - lo, Math.max(0, W - m - hi)) : hi > W - m ? -Math.min(hi - (W - m), Math.max(0, lo - m)) : 0
        if (shift) {
            x += shift
            boxes = eosMoodBoxes(g, x, y)
        }
        const base = (Math.abs(x - x0) + Math.abs(y - y0)) * C.dist + LAYOUT_COST[g.layout] + (fs0 - g.fs) * 140
        // (a 1e-3 margin: the outside term can carry -1e-13 of float noise, so a pruned candidate is a sure loser)
        const cap = (found ? found.score : Infinity) + 1e-3
        if (base >= cap) return null
        let out = 0
        let soft = 0
        let hard = 0
        let score = base
        const dead = () => (out >= 1 || soft >= 1 || hard >= 1) && (score >= cap || (best && score >= best.score + 1e-3))
        for (const b of boxes) {
            const o1 = b.w * b.h - eosMoodOverlap(b, inside)
            out += o1
            score += o1 * C.out
            if (dead()) return null
            for (const o of obs) {
                const v = eosMoodOverlap(b, o)
                if (!v) continue
                if (o.hard) {
                    hard += v
                    score += v * C.hard
                } else {
                    const s = o.card ? (v * C.card) / C.soft : v
                    soft += s
                    score += s * C.soft
                }
                if (dead()) return null
            }
        }
        // the reported score in the full formula's own order (bit-identical ties with an unpruned search)
        score = (Math.abs(x - x0) + Math.abs(y - y0)) * C.dist + out * C.out + soft * C.soft + hard * C.hard + LAYOUT_COST[g.layout] + (fs0 - g.fs) * 140
        return { x, y, dx: g.dx, lift: g.lift, fs: g.fs, layout: g.layout, widths: g.widths, boxes, score, clean: out < 1 && soft < 1 && hard < 1, tier, out, soft, hard }
    }
    for (let t = 0; t < tiers.length && !found; t++) {
        for (const v of tiers[t]) {
            const g = eosMoodGeom(W, phone, words, v.fs, v.layout)
            const ext = eosMoodBoxes(g, 0, 0)
            const top = Math.min(...ext.map((q) => q.y))
            const bot = Math.max(...ext.map((q) => q.y + q.h))
            for (const oy of v.grid.ys) {
                const y = y0 + oy
                const obs = obstacles.filter((o) => o.y < y + bot && o.y + o.h > y + top)
                for (const ox of v.grid.xs) {
                    const c = evalAt(g, x0 + ox, y, t, obs)
                    if (!c) continue
                    if (!best || c.score < best.score) best = c
                    if (c.clean && (!found || c.score < found.score)) found = c
                }
            }
        }
    }
    return found || best
}
// The game's own finale + characters as HARD obstacles (root px), read from the game host:
//   · pinned roots, counted even while they are still fading in: [data-eos-avoid] (the contract: engines tag their
//     character bubble and finale headline), [data-eos-finale], [data-eos-char] (EosCharacterOrb) and the known
//     roots of 111-114 until they carry the tag;
//   · every visible picture ≥ 20 px (<img> icons and bubbles, circular background-image bubbles);
//   · every visible text of ≥ 2 letters at ≥ 14 px (the user's words, the finale headline, in-world labels);
//   · every standing pictograph ≥ 18 px (emoji anchors and characters; see eosMoodGlyphOk).
// Skips the arcade chrome (soft obstacles), anything larger than 45 % of the stage (a backdrop, a container) and
// sub-word glyphs ("+10", emoji particles in transit). Capped (80 pictures, 40 pictographs, 220 text lines) so a busy
// finale stays cheap.
const EOS_MOOD_CHROME = ".globalPlayGuide, .engineProgressHud, .tsShiftRewardHud, .globalFeedbackCopyLayer, .eosCompanion, .eosMoodFlip"
const EOS_MOOD_PIN = "[data-eos-avoid], [data-eos-finale], [data-eos-char], .eosOrbFace, .eosVolcHero, .eosVolcCloudFace, .eosGroundHero, .eosGroundFace, .eosGroundFin, .eosGroundSlot[data-burn=\"1\"] .eosGroundFound, .eosSighOrbWrap, .eosSighMoonFace, .eosSighSyncFace"
function eosMoodShown(el, opacity) {
    try {
        if (typeof el.checkVisibility === "function") return el.checkVisibility({ opacityProperty: opacity, checkOpacity: opacity, visibilityProperty: true, checkVisibilityCSS: true })
        const cs = getComputedStyle(el)
        return cs.display !== "none" && cs.visibility !== "hidden" && (!opacity || Number(cs.opacity) > 0.02)
    } catch {
        return true
    }
}
// Standing pictographs (an emoji anchor, a game's emoji character) are hard content too; emoji PARTICLES are not: a
// glyph in a particle container, or one still in transit (a running finite animation on it or on its 3 nearest
// ancestors: a flying spark, a burst), is skipped. Ambient idle loops (an infinite bob or twinkle) still count.
const EOS_MOOD_PICTO = /\p{Extended_Pictographic}/u
const EOS_MOOD_PARTICLE = /particle|confetti|spark|burst|ember|floater|trail/i
function eosMoodGlyphOk(node, chrome) {
    const el = node && node.parentElement
    if (!el || chrome(el) || !eosMoodShown(el, true)) return false
    let e = el
    for (let i = 0; i < 4 && e; i++, e = e.parentElement) {
        const cls = typeof e.className === "string" ? e.className : (e.getAttribute && e.getAttribute("class")) || ""
        if (EOS_MOOD_PARTICLE.test(cls)) return false
        if (typeof e.getAnimations === "function") {
            for (const a of e.getAnimations()) {
                if (a.playState !== "running") continue
                let end = Infinity
                try {
                    end = a.effect ? a.effect.getComputedTiming().endTime : Infinity
                } catch {}
                if (end !== Infinity) return false
            }
        }
    }
    return true
}
// Samples a pinned root's position over the next EOS_MOOD_LIFE ms of its finite CSS animations / transitions (on the
// root and its ancestors inside the scope): each one is seeked ahead, the root measured (measure()), and every seek
// restored, all in the same task, so nothing is ever painted, no animation event fires and the game never sees it.
// Ambient loops (infinite) are left alone. → 1 when the root is moving, else 0.
const EOS_MOOD_PATH_STEPS = [0.25, 0.5, 0.75, 1]
function eosMoodPinPath(el, scope, measure) {
    const anims = []
    for (let e = el; e && anims.length < 8; e = e.parentElement) {
        if (typeof e.getAnimations !== "function") break
        for (const a of e.getAnimations()) {
            if (a.playState !== "running" || !a.effect || Number(a.playbackRate) !== 1) continue
            let end = Infinity
            try {
                end = a.effect.getComputedTiming().endTime
            } catch {}
            const cur = Number(a.currentTime)
            if (end === Infinity || !isFinite(cur) || cur >= end) continue
            anims.push({ a, cur, left: end - cur })
        }
        if (e === scope) break
    }
    if (!anims.length) return 0
    const span = Math.min(EOS_MOOD_LIFE, Math.max(...anims.map((q) => q.left)))
    try {
        for (const f of EOS_MOOD_PATH_STEPS) {
            for (const q of anims) q.a.currentTime = q.cur + Math.min(q.left, span * f)
            measure()
        }
    } catch {
    } finally {
        for (const q of anims) {
            try {
                q.a.currentTime = q.cur
            } catch {}
        }
    }
    return 1
}
function eosMoodContent(scope, root, W, H, paths = false) {
    const out = []
    if (!scope || !root || typeof document === "undefined" || !scope.querySelectorAll) return out
    let R = null
    let k = 1
    try {
        R = root.getBoundingClientRect()
        k = eosStageScale(root) || 1
    } catch {
        return out
    }
    const maxA = W * H * 0.45
    const add = (r, pad, kind) => {
        if (!r || r.width < 2 || r.height < 2) return
        const x = (r.left - R.left) / k - pad
        const y = (r.top - R.top) / k - pad
        const w = r.width / k + 2 * pad
        const h = r.height / k + 2 * pad
        if (w * h > maxA || x + w < 0 || y + h < 0 || x > W || y > H) return
        out.push({ x, y, w, h, hard: true, kind })
    }
    const chrome = (el) => !!(el && el.closest && el.closest(EOS_MOOD_CHROME))
    try {
        // a root still in its entrance scale (113's found anchors pop in from .3) is reserved at its full size
        const pinAt = (el, kind) => {
            const r = el.getBoundingClientRect()
            const w = Math.max(r.width, (el.offsetWidth || 0) * k)
            const h = Math.max(r.height, (el.offsetHeight || 0) * k)
            add({ left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2, width: w, height: h }, 6, kind)
        }
        // (only at placement: the follow loop checks what really lands on a word, not where things may go)
        let moving = paths ? 0 : 12
        scope.querySelectorAll(EOS_MOOD_PIN).forEach((el) => {
            if (chrome(el) || !eosMoodShown(el, false)) return
            pinAt(el, "pin")
            // …and where it is GOING during the bloom: a character still in a finite move (112's Rush hops from the
            // crater to the summit 1.2 s into its finale) is reserved along its way (EOS_MOOD_PATH_STEPS)
            if (moving < 12) moving += eosMoodPinPath(el, scope, () => pinAt(el, "path"))
        })
        let n = 0
        scope.querySelectorAll('img, [style*="background-image"]').forEach((el) => {
            if (n >= 80 || chrome(el)) return
            const r = el.getBoundingClientRect()
            if (r.width / k < 20 || r.height / k < 20) return
            if (el.tagName !== "IMG") {
                const cs = getComputedStyle(el)
                if (!/url\(/.test(cs.backgroundImage || "")) return
                if ((parseFloat(cs.borderTopLeftRadius) || 0) < (Math.min(r.width, r.height) / k) * 0.3) return
            }
            if (!eosMoodShown(el, true)) return
            n++
            add(r, 6, "img")
        })
        const tw = document.createTreeWalker(scope, typeof NodeFilter !== "undefined" ? NodeFilter.SHOW_TEXT : 4)
        const rg = document.createRange()
        const okOf = new Map()
        let lines = 0
        let glyphs = 0
        for (let node = tw.nextNode(); node && lines < 220; node = tw.nextNode()) {
            const s = node.nodeValue
            if (!s || !/\S/.test(s)) continue
            const letters = s.match(/\p{L}/gu)
            if (!letters || letters.length < 2) {
                // a standing pictograph (113's found-thing anchors, a game's emoji character) counts as a picture
                if (glyphs < 40 && EOS_MOOD_PICTO.test(s) && s.trim().length <= 8 && eosMoodGlyphOk(node, chrome)) {
                    rg.selectNodeContents(node)
                    const r = rg.getBoundingClientRect()
                    if (r.width / k >= 18 && r.height / k >= 18) {
                        glyphs++
                        add(r, 4, "img")
                    }
                }
                continue
            }
            const el = node.parentElement
            if (!el) continue
            let ok = okOf.get(el)
            if (ok === undefined) {
                ok = false
                try {
                    ok = !chrome(el) && parseFloat(getComputedStyle(el).fontSize) >= 14 && eosMoodShown(el, true)
                } catch {}
                okOf.set(el, ok)
            }
            if (!ok) continue
            rg.selectNodeContents(node)
            for (const r of Array.from(rg.getClientRects())) {
                add(r, 4, "text")
                lines++
            }
        }
    } catch {}
    return out
}

// ---------------------------------------------------------------- live state for tests (dev handle)
const EOS_MOOD_LIVE = { emo: null, p: null, t: 0, shown: 0, step: 0, calm: false, late: false, done: false, bloomAt: 0, bloomPerf: 0, painted: false, words: [], bloomFrom: null, place: null, carve: 0 }

// ---------------------------------------------------------------- component
// The arcade's finish card size (px, layout) per wrapper, at phone (viewport ≤ 700) and desktop: width = min(w, shell − inset).
const EOS_MOOD_CARD = {
    centre: { phone: { w: 320, inset: 36, h: 108 }, desk: { w: 440, inset: 80, h: 124 } },
    press: { phone: { w: 300, inset: 72, h: 120 }, desk: { w: 430, inset: 112, h: 132 } },
}
const EOS_MOOD_DONE_SEL = ".globalPlayGuide.isComplete, .tsRewardSurge.mega"
// The whole bloom fits inside 2.0 s, the shortest finish hold (GameEngineLegacy: finishHoldMs ≥ 2050 ms after
// isComplete when an engine calls onDone without reporting 100 first): third word starts at 400 ms + 1.5 s life.
const EOS_MOOD_STAGGER = 200
// isComplete with no burst at all for this long (a stuck engine): bloom in place, as before
const EOS_MOOD_NO_BURST_MS = 4500
const EOS_MOOD_LIFE_MS = 1500
const EOS_MOOD_LIFE = EOS_MOOD_LIFE_MS + EOS_MOOD_STAGGER * 2

// GAP R1/R2: the flip bloom after the approved burst. The burst ends in the same tick as the reveal begins, so the
// play layer is gone by then: a clone of its pre-rendered words (same classes, same CSS, same 1.9 s life) blooms on
// .releaseStage above the reveal, out of the reveal's Still Point (the memory orb), placed clear of the reveal's
// pictures and text by the same crown search, with the same sparkle chime — all only after the burst unmounted.
// Skipped when the person has already left the reveal. Returns cancel().
const EOS_MOOD_AFTER = { cancel: null }
function eosMoodAfterBloom(flip, stage) {
    try {
        if (EOS_MOOD_AFTER.cancel) EOS_MOOD_AFTER.cancel()
    } catch {}
    let alive = true
    let node = null
    const timers = []
    const go = () => {
        try {
            if (!alive || !stage || !stage.isConnected || !flip) return
            const arc = stage.closest(".tsArcade")
            if (arc && !arc.classList.contains("stage-reveal")) return
            node = flip.cloneNode(true)
            node.classList.remove("isBloom", "isPhone")
            node.classList.add("eosMoodAfter")
            node.querySelectorAll(".isYield").forEach((el) => el.classList.remove("isYield"))
            let z = 0
            stage.querySelectorAll(":scope > .releaseCompleteOverlay, .eosWorldChips").forEach((el) => {
                const v = Number(getComputedStyle(el).zIndex)
                if (v > z) z = v
            })
            node.style.zIndex = String((z || 160) + 1)
            stage.appendChild(node)
            const W = node.clientWidth
            const H = node.clientHeight
            if (!(W > 40 && H > 40)) return
            let x = W / 2
            let y = H * 0.4
            let from = "stage"
            const orb = stage.querySelector(".eosSmOrb")
            const r = orb ? eosRelRect(orb, node) : null
            if (r && r.w > 2 && r.h > 2 && r.cx > 0 && r.cx < W && r.cy > 0 && r.cy < H) {
                x = r.cx
                y = r.cy
                from = "orb"
            }
            const phone = W < 560
            const words = Array.from(node.querySelectorAll(".eosMoodWordTx")).map((el) => el.textContent || "")
            const scope = stage.querySelector(":scope > .releaseCompleteOverlay") || stage
            const obstacles = eosMoodContent(scope, node, W, H)
            const place = eosMoodPlace({ W, H, x0: x, y0: y, phone, words, obstacles })
            const start = words.map((_, i) => {
                const o = eosMoodSlotOff(i, place.dx, place.lift, place.layout)
                return [Math.round(x - (place.x + o[0])), Math.round(y - (place.y + o[1]))]
            })
            const b = { x: place.x, y: place.y, dx: place.dx, lift: place.lift, fs: place.fs, layout: place.layout, start, phone, words, at: Date.now(), from, yielded: words.map(() => false) }
            if (!eosMoodPaint(node, b)) return
            EOS_MOOD_LIVE.after = { at: Date.now(), perf: typeof performance !== "undefined" ? performance.now() : 0, words: words.slice(), from, x: Math.round(place.x), y: Math.round(place.y), clean: !!place.clean }
            words.forEach((_, i) => {
                timers.push(
                    setTimeout(() => {
                        if (!alive) return
                        eosTone(eosNote(8 + i * 2, 392), 520, { type: "sine", gain: 0.028 })
                        eosTone(eosNote(13 + i * 2, 392), 380, { type: "triangle", gain: 0.012, at: 0.03 })
                    }, i * EOS_MOOD_STAGGER)
                )
            })
            timers.push(setTimeout(cancel, EOS_MOOD_LIFE + 400))
        } catch {}
    }
    const off = eosAfterBurst(go, 160)
    const cancel = () => {
        alive = false
        off()
        timers.forEach(clearTimeout)
        try {
            if (node) node.remove()
        } catch {}
        node = null
        if (EOS_MOOD_AFTER.cancel === cancel) EOS_MOOD_AFTER.cancel = null
    }
    EOS_MOOD_AFTER.cancel = cancel
    return cancel
}

// Writes the colour script at one script position straight onto the two layers (custom properties only; React
// never renders these keys, so the two never fight). Driven per frame by the component's tween.
function eosMoodWrite(grade, air, col) {
    try {
        if (grade) {
            const g = grade.style
            g.setProperty("--eos-mood-a", eosMoodRgba(col.a, col.alpha))
            g.setProperty("--eos-mood-b", eosMoodRgba(col.b, col.alpha))
            g.setProperty("--eos-p", String(Math.round(col.t * 1000) / 1000))
            if (col.sat != null) g.setProperty("--eos-mood-sat", String(col.sat))
            else g.removeProperty("--eos-mood-sat")
        }
        if (air) {
            const a = air.style
            a.setProperty("--eos-mood-edge", eosMoodRgba(col.b, col.grip))
            a.setProperty("--eos-mood-grip", `${col.gripAt}%`)
            a.setProperty("--eos-mood-heat", eosMoodRgba(col.a, col.heat))
            a.setProperty("--eos-mood-hshape", col.heatShape)
            a.setProperty("--eos-mood-glow", eosMoodRgba(col.a, col.light))
            a.setProperty("--eos-mood-lshape", col.lightShape)
        }
    } catch {}
}
const eosMoodUseLayout = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

// ---- chrome carve-out: the grade and the air layer sit above the game host (z 54 vs 2), so without a mask their
// screen-blended edge grip lifts the dark HUD / LIVE GUIDE pills and costs the small "SHIFT SPARKS" / "TOKENS" text
// about a third of its contrast. A feathered SVG mask (rounded holes, 6 px blur) keeps the chrome un-graded.
const EOS_MOOD_CARVE = ".engineProgressHud, .tsShiftRewardHud, .globalPlayGuide, .releaseScoreBar"
function eosMoodCarveUrl(W, H, rects) {
    if (!rects.length || !W || !H) return ""
    const holes = rects
        .map((r) => {
            const pad = 8
            const w = Math.round(r.w + pad * 2)
            const h = Math.round(r.h + pad * 2)
            return `<rect x="${Math.round(r.x - pad)}" y="${Math.round(r.y - pad)}" width="${w}" height="${h}" rx="${Math.round(Math.min(h / 2, 22))}"/>`
        })
        .join("")
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
        `<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>` +
        `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><g fill="#000" filter="url(#b)">${holes}</g></mask></defs>` +
        `<rect width="${W}" height="${H}" fill="#000" mask="url(#m)"/></svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
function eosMoodSetMask(el, url) {
    if (!el) return
    try {
        const st = el.style
        const keys = ["mask-image", "-webkit-mask-image"]
        if (url) {
            keys.forEach((k) => st.setProperty(k, url))
            ;["mask-size", "-webkit-mask-size"].forEach((k) => st.setProperty(k, "100% 100%"))
            ;["mask-repeat", "-webkit-mask-repeat"].forEach((k) => st.setProperty(k, "no-repeat"))
        } else ["mask-image", "-webkit-mask-image", "mask-size", "-webkit-mask-size", "mask-repeat", "-webkit-mask-repeat"].forEach((k) => st.removeProperty(k))
    } catch {}
}

// The per-bloom style of word i: its place in the crown, its size and where it is born (the Still Point), as an offset.
function eosMoodWordStyle(b, i) {
    const o = (b.start && b.start[i]) || [0, 0]
    const at = eosMoodSlotOff(i, b.dx, b.lift, b.layout)
    return {
        left: `${Math.round(b.x + at[0])}px`,
        top: `${Math.round(b.y + at[1])}px`,
        "--eos-mood-dx": `${o[0]}px`,
        "--eos-mood-dy": `${o[1]}px`,
        "--eos-mood-fs": `${Math.round(b.fs || 26)}px`,
    }
}
// The words are pre-rendered (hidden) from mount, so the bloom can start in the SAME frame that paints
// `isComplete`: the finish observer writes exactly the values React renders next (React then re-writes the same
// values — no flicker, no remount). Skipped when the rendered words differ from the bloom's (an emotion change in
// the same tick): React's render then starts the bloom one task later. → true when painted.
function eosMoodPaint(root, b) {
    try {
        const els = root ? Array.from(root.children).filter((el) => el.classList && el.classList.contains("eosMoodWord")) : []
        if (els.length !== b.words.length) return false
        for (let i = 0; i < els.length; i++) {
            const tx = els[i].querySelector(".eosMoodWordTx")
            if (!tx || tx.textContent !== b.words[i]) return false
        }
        els.forEach((el, i) => {
            const st = eosMoodWordStyle(b, i)
            for (const k in st) el.style.setProperty(k, st[k])
        })
        root.setAttribute("data-eos-from", b.from)
        root.setAttribute("data-eos-layout", b.layout)
        if (b.phone) root.classList.add("isPhone")
        root.classList.add("isBloom")
        return true
    } catch {
        return false
    }
}

function EosMoodGrade({ game, hostRef, reduced = false }) {
    useEosStore() // re-render on emotion / calm-visuals changes
    const calm = eosCalm(reduced)
    const emo = eosCurrentEmotion()
    const p = useEosProgress(hostRef, 4)
    const late = React.useMemo(() => eosLateNight(), [])
    const flipRef = React.useRef(null)
    const gradeRef = React.useRef(null)
    const airRef = React.useRef(null)
    const tween = React.useRef({ shown: null, key: "", raf: 0 })
    const [bloom, setBloom] = React.useState(null)
    const gameIdRef = React.useRef(0)
    gameIdRef.current = Number(game && game.id) || 0
    const gameRef = React.useRef(null)
    gameRef.current = game || null

    // The finish always lands on the calm pair, even when a game completes below 95 % on its bar.
    const done = !!bloom
    const t = done ? 1 : eosMoodT(p == null ? 0 : p, calm)
    const pal = eosMoodPalette(emo, { late })
    const step = done ? EOS_MOOD_STEPS.length : eosMoodStepOf(p == null ? 0 : p)
    // numb's backdrop saturate filter only exists while it does something (dropped at full colour: cheaper finish)
    const grey = !!(EOS_EMO[emo] && EOS_EMO[emo].greyLoud)

    // ---- the colour script tween. Every progress change glides the script position from where it is shown to the
    // new target in OKLCH (.6 s linear; calm / reduced: a .9 s ease-in-out cross-fade between the three steps).
    // JS, not a CSS transition: a CSS transition restarts on every change and only advances on rendered frames, so on
    // a starved main thread (a heavy finish on a low-end phone) it can stall on the loud colours; this tween
    // lands on the target on the very next frame once its time is up, and it interpolates perceptually all the way.
    eosMoodUseLayout(() => {
        const S = tween.current
        const key = `${emo || "auto"}|${late ? 1 : 0}`
        const paint = (v) => {
            S.shown = v
            EOS_MOOD_LIVE.shown = v
            eosMoodWrite(gradeRef.current, airRef.current, eosMoodColours(emo, v, { late }))
        }
        // any glide in flight belongs to the previous target / palette
        if (S.raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(S.raf)
        S.raf = 0
        if (S.shown == null) {
            S.key = key
            paint(t) // first paint: exactly the target, before the browser paints
            return
        }
        if (S.key !== key) {
            S.key = key
            paint(S.shown) // a new feeling mid-game: same script position, its own palette
        }
        if (Math.abs(t - S.shown) < 1e-4) {
            if (S.shown !== t) paint(t)
            return
        }
        if (typeof requestAnimationFrame !== "function" || typeof performance === "undefined") {
            paint(t)
            return
        }
        const from = S.shown
        const to = t
        const dur = calm ? 900 : 600
        const t0 = performance.now()
        const tick = () => {
            // GAP R1: the burst owns the screen — the layers are hidden by the burst gate and this loop pauses
            // (no rAF while it is mounted); it lands on its target right after the burst
            if (eosBurstOn()) {
                S.raf = 0
                S.wait = setTimeout(() => {
                    S.wait = 0
                    S.raf = requestAnimationFrame(tick)
                }, 120)
                return
            }
            const k = eosClamp((performance.now() - t0) / dur, 0, 1)
            paint(from + (to - from) * (calm ? k * k * (3 - 2 * k) : k))
            S.raf = k < 1 ? requestAnimationFrame(tick) : 0
        }
        if (S.wait) clearTimeout(S.wait)
        S.wait = 0
        S.raf = requestAnimationFrame(tick)
    }, [t, emo, late, calm])
    React.useEffect(
        () => () => {
            const S = tween.current
            if (S.raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(S.raf)
            S.raf = 0
            if (S.wait) clearTimeout(S.wait)
            S.wait = 0
        },
        []
    )

    // ---- chrome carve-out (see EOS_MOOD_CARVE): re-measured twice a second and on resize; the mask is rewritten only
    // when a chrome rect really moved (6 px grid).
    React.useEffect(() => {
        let alive = true
        let sig = ""
        const run = () => {
            if (!alive) return
            const g = gradeRef.current
            if (!g) return
            try {
                const stage = g.closest ? g.closest(".releaseStage") : null
                const W = g.offsetWidth
                const H = g.offsetHeight
                const rects = []
                if (stage && W && H)
                    stage.querySelectorAll(EOS_MOOD_CARVE).forEach((el) => {
                        const q = eosRelRect(el, g)
                        if (!q || q.w < 4 || q.h < 4 || q.x > W || q.y > H || q.x + q.w < 0 || q.y + q.h < 0) return
                        if (!eosMoodShown(el, true)) return
                        rects.push(q)
                    })
                const next = `${W}x${H}|` + rects.map((r) => [r.x, r.y, r.w, r.h].map((v) => Math.round(v / 6)).join(",")).join("|")
                if (next === sig) return
                sig = next
                const url = eosMoodCarveUrl(W, H, rects)
                eosMoodSetMask(g, url)
                eosMoodSetMask(airRef.current, url)
                EOS_MOOD_LIVE.carve = url ? rects.length : 0
            } catch {}
        }
        run()
        const iv = setInterval(run, 500)
        if (typeof window !== "undefined") window.addEventListener("resize", run)
        return () => {
            alive = false
            clearInterval(iv)
            if (typeof window !== "undefined") window.removeEventListener("resize", run)
        }
    }, [])

    // ---- finish watch: the first `.globalPlayGuide.isComplete` / `.tsRewardSurge.mega` → bloom once per mount.
    // Placement uses the chrome (soft), the game's own finale + characters (hard) and the arcade's finish card, which
    // can arrive up to ~1 s AFTER isComplete: its place (centred in the game window) is reserved before it shows. The crown never travels sideways: when something new lands on a word
    // during its life (a finale headline sliding in, a card the prediction missed), that word yields (fades in .26 s).
    React.useEffect(() => {
        let alive = true
        let timer = 0
        let geo = null
        let guess = null
        let firedAt = 0
        const tones = []
        const scopeOf = (host) => host || null
        const measure = () => {
            const root = flipRef.current
            const host = hostRef && hostRef.current
            if (!root) return null
            const stage = (root.closest && root.closest(".releaseStage")) || (host && host.closest && host.closest(".releaseStage")) || null
            const W = root.offsetWidth || (stage && stage.offsetWidth) || 0
            const H = root.offsetHeight || (stage && stage.offsetHeight) || 0
            if (!W || !H) return null
            // Chrome obstacles in root px. An element still in its entrance scale is measured at its layout size.
            const obstacles = []
            let card = null
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
                        const o = { x: q.cx - w / 2, y: q.cy - h / 2, w, h }
                        if (el.classList && el.classList.contains("globalFinishFeedbackCopy")) {
                            o.card = true
                            card = o
                        }
                        obstacles.push(o)
                    })
            } catch {}
            return { root, stage, host, W, H, obstacles, card }
        }
        // The arcade's finish card can land up to ~1 s after isComplete, so its place is reserved BEFORE it shows
        // (a miss is caught by the yield check). Measured, both sizes:
        //   · GameEngine (ids 100+): the final !important rule (GLOBAL_FINAL_MESSAGE_GUARANTEE_CSS) centres it in
        //     `.cinematicContentShell` (390 → 320 × 101), whatever the last press was;
        //   · GameEngineLegacy (ids 1-99): it is centred on the last press (default 74 % / 14 %) and clamped into the
        //     shell (fitFeedbackInsideGameWindow: 42 px sides, 58 px top, 28 px bottom; 390 → 288 × 114). The press is
        //     tracked the same way the arcade does (down / up / a move with a button held).
        let press = null
        const host0 = hostRef && hostRef.current
        const onPress = (e) => {
            if (e.type === "pointermove" && !e.buttons) return
            const t = e.target
            if (t && t.closest && t.closest(".cinematicContentShell")) press = { x: e.clientX, y: e.clientY }
        }
        if (host0 && host0.addEventListener) ["pointerdown", "pointerup", "pointermove"].forEach((k) => host0.addEventListener(k, onPress, true))
        // The card's place, MEASURED: a hidden copy of the card (same classes, same parent, same two-line body, the
        // arcade's own clamp applied) is laid out for one read and removed in the same task, so every CSS rule that will
        // place the real card applies to it too: the arcade's wrapper rules and any per-game override (112 lifts its
        // card under the summit with `:has(>.eosG112)>.globalFinishFeedbackCopy{top:var(--eosVolcFinY)}`). The fixed
        // per-wrapper model below stays as the fallback.
        const probeCard = (root, shell) => {
            if (typeof document === "undefined" || !shell || !shell.appendChild) return null
            const R = shell.getBoundingClientRect()
            if (!R.width || !R.height) return null
            const fx = press ? eosClamp(((press.x - R.left) / R.width) * 100, 0, 100) : 74
            const fy = press ? eosClamp(((press.y - R.top) / R.height) * 100, 0, 100) : 14
            const legacy = gameIdRef.current < 100
            const fam = String((gameRef.current && gameRef.current.family) || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
            const d = document.createElement("div")
            d.className = `globalFeedbackCopyLayer globalFinishFeedbackCopy feedbackFlavor${(((gameIdRef.current || 0) % 6) + 6) % 6 + 1}${fam ? ` feedbackFamily-${fam}` : ""}`
            d.setAttribute("aria-hidden", "true")
            d.setAttribute("data-eos-mood-probe", "")
            const st = d.style
            st.setProperty("--fx-x", `${fx}%`)
            st.setProperty("--fx-y", `${fy}%`)
            ;[["visibility", "hidden"], ["animation", "none"], ["transition", "none"], ["pointer-events", "none"]].forEach(([k, v]) => st.setProperty(k, v, "important"))
            const lines = legacy
                ? [["small", "RELEASED · SHIFT COMPLETE"], ["b", "LESS GRIP. MORE STILL."], ["span", "✦ ✦ ✦"], ["em", "SHIFT MADE · KEEP YOUR STILL"]]
                : [["b", "SHIFTED ✓"], ["span", "LIGHTER ✓"], ["strong", "◆ +1 · ✦ +10", "tsFinishRewardPayout"]]
            lines.forEach(([tag, text, cls]) => {
                const e = document.createElement(tag)
                if (cls) e.className = cls
                e.textContent = text
                d.appendChild(e)
            })
            let out = null
            shell.appendChild(d)
            try {
                // the arcade's own clamp for the finish card (fitFeedbackInsideGameWindow, kind "finish")
                const w0 = Math.min(d.offsetWidth || 0, R.width)
                const h0 = Math.min(d.offsetHeight || 0, R.height)
                if (w0 && h0) {
                    const rawL = (fx / 100) * R.width - w0 / 2
                    const rawT = (fy / 100) * R.height - h0 / 2
                    st.setProperty("--fb-shift-x", `${eosClamp(rawL, 42, Math.max(42, R.width - 42 - w0)) - rawL}px`)
                    st.setProperty("--fb-shift-y", `${eosClamp(rawT, 58, Math.max(58, R.height - 28 - h0)) - rawT}px`)
                    const q = eosRelRect(d, root)
                    const w = Math.max(q ? q.w : 0, d.offsetWidth || 0)
                    const h = Math.max(q ? q.h : 0, d.offsetHeight || 0)
                    if (q && w > 4 && h > 4) out = { x: q.cx - w / 2 - 10, y: q.cy - h / 2 - 10, w: w + 20, h: h + 20, predicted: true, card: true, probe: true }
                }
            } catch {}
            try {
                d.remove()
            } catch {}
            return out
        }
        const predictCard = (root) => {
            const host = hostRef && hostRef.current
            const shell = host && host.querySelector(".cinematicContentShell")
            try {
                const pr = probeCard(root, shell)
                if (pr) return pr
            } catch {}
            const sr = shell ? eosRelRect(shell, root) : null
            if (!sr || !sr.w || !sr.h) return null
            const vw = typeof window !== "undefined" ? window.innerWidth : 1280
            const C = EOS_MOOD_CARD[gameIdRef.current >= 100 ? "centre" : "press"][vw <= 700 ? "phone" : "desk"]
            const w = Math.max(160, Math.min(C.w, sr.w - C.inset))
            const h = C.h
            let cx = sr.cx
            let cy = sr.cy
            if (gameIdRef.current < 100) {
                const R = shell.getBoundingClientRect()
                const fx = press && R.width ? eosClamp((press.x - R.left) / R.width, 0, 1) : 0.74
                const fy = press && R.height ? eosClamp((press.y - R.top) / R.height, 0, 1) : 0.14
                cx = sr.x + eosClamp(fx * sr.w - w / 2, 42, Math.max(42, sr.w - 42 - w)) + w / 2
                cy = sr.y + eosClamp(fy * sr.h - h / 2, 58, Math.max(58, sr.h - 28 - h)) + h / 2
            }
            return { x: cx - w / 2 - 10, y: cy - h / 2 - 10, w: w + 20, h: h + 20, predicted: true, card: true }
        }
        const fire = () => {
            const m = measure()
            if (!m) return false
            const { root, stage, W, H } = m
            const content = eosMoodContent(scopeOf(m.host), root, W, H, true)
            const real = m.obstacles.concat(content)
            const obstacles = real.slice()
            let predicted = false
            if (!m.card) {
                try {
                    guess = predictCard(root)
                } catch {}
                if (guess) {
                    obstacles.push(guess)
                    predicted = true
                }
            }
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
            const words = eosMoodFlipWords(eosCurrentEmotion())
            const place = eosMoodPlace({ W, H, x0: x, y0: y, phone, words, obstacles })
            const at = Date.now()
            firedAt = at
            // per-word baseline: what each word already overlaps (unavoidable) — only NEW cover makes a word yield
            const base = place.boxes.map((bx) => real.reduce((acc, o) => acc + eosMoodOverlap(bx, o), 0))
            geo = { boxes: place.boxes, base, areas: place.boxes.map((bx) => bx.w * (bx.h - EOS_MOOD_RISE_BOX)), yielded: words.map(() => false) }
            EOS_MOOD_LIVE.bloomAt = at
            EOS_MOOD_LIVE.bloomPerf = typeof performance !== "undefined" ? performance.now() : 0
            EOS_MOOD_LIVE.words = words.slice()
            EOS_MOOD_LIVE.bloomFrom = from
            const rr = (o) => (o ? { x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.w), h: Math.round(o.h) } : null)
            EOS_MOOD_LIVE.place = {
                x: Math.round(place.x),
                y: Math.round(place.y),
                core: [Math.round(x), Math.round(y)],
                obstacles: obstacles.length,
                hard: content.length,
                path: content.filter((o) => o.kind === "path").length,
                predicted,
                guess: predicted ? rr(guess) : null,
                card: rr(m.card),
                score: Math.round(place.score),
                clean: !!place.clean,
                tier: place.tier,
                layout: place.layout,
                fs: Math.round(place.fs * 10) / 10,
                cover: { hard: Math.round(place.hard), soft: Math.round(place.soft), out: Math.round(place.out) },
                moves: 0,
                yields: 0,
            }
            // start offsets: every word is born in the Still Point
            const start = words.map((_, i) => {
                const o = eosMoodSlotOff(i, place.dx, place.lift, place.layout)
                return [Math.round(x - (place.x + o[0])), Math.round(y - (place.y + o[1]))]
            })
            const b = { x: place.x, y: place.y, dx: place.dx, lift: place.lift, fs: place.fs, layout: place.layout, start, phone, words, at, from, yielded: geo.yielded.slice() }
            EOS_MOOD_LIVE.painted = eosMoodPaint(root, b)
            setBloom(b)
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
        // after the bloom: anything that lands on a word later (the real card, a finale headline) makes it yield
        const follow = () => {
            if (!alive || !geo) return
            if (Date.now() - firedAt > EOS_MOOD_LIFE) return
            const m = measure()
            if (m) {
                if (m.card && EOS_MOOD_LIVE.place && !EOS_MOOD_LIVE.place.card) {
                    const c = m.card
                    EOS_MOOD_LIVE.place.card = { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.w), h: Math.round(c.h) }
                }
                const obs = m.obstacles.concat(eosMoodContent(scopeOf(m.host), m.root, m.W, m.H))
                let changed = false
                geo.boxes.forEach((bx, i) => {
                    if (geo.yielded[i]) return
                    let cur = 0
                    for (const o of obs) cur += eosMoodOverlap(bx, o)
                    if (cur > geo.base[i] + 0.15 * geo.areas[i]) {
                        geo.yielded[i] = true
                        changed = true
                    }
                })
                if (changed) {
                    const y = geo.yielded.slice()
                    try {
                        Array.from(m.root.children)
                            .filter((el) => el.classList && el.classList.contains("eosMoodWord"))
                            .forEach((el, i) => y[i] && el.classList.add("isYield"))
                    } catch {}
                    if (EOS_MOOD_LIVE.place) EOS_MOOD_LIVE.place.yields = y.filter(Boolean).length
                    setBloom((b) => (b ? { ...b, yielded: y } : b))
                }
            }
            timer = setTimeout(follow, 120)
        }
        // Finish detection: a class observer on the guide panel (no subtree: cheap) fires the same tick the guide
        // turns `isComplete`; the 100 ms poll covers `.tsRewardSurge.mega` and a re-mounted guide.
        let mo = null
        let watched = null
        let fired = false
        let doneAt = 0
        let sawBurst = false
        let pend = null
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
            if (done) {
                // GAP R1/R2: the flip bloom and its sparkle chime start only AFTER the approved burst has unmounted.
                // isComplete usually lands 0.7-1.2 s before the burst: wait for it. When the burst ends the stage
                // turns to the reveal and this layer unmounts, so the cleanup hands the bloom to eosMoodAfterBloom.
                const nowMs = Date.now()
                if (!doneAt) doneAt = nowMs
                if (!pend && flipRef.current) pend = { flip: flipRef.current, stage: flipRef.current.closest(".releaseStage") }
                if (eosBurstOn()) sawBurst = true
                else if ((sawBurst || nowMs - doneAt > EOS_MOOD_NO_BURST_MS) && fire()) pend = null
                else {
                    timer = setTimeout(check, 100)
                    return
                }
                if (eosBurstOn() || pend) {
                    timer = setTimeout(check, 100)
                    return
                }
                fired = true
                if (mo) mo.disconnect()
                mo = null
                timer = setTimeout(follow, 120)
                return
            }
            timer = setTimeout(check, 100)
        }
        check()
        return () => {
            alive = false
            clearTimeout(timer)
            if (mo) mo.disconnect()
            if (!fired && doneAt && pend && pend.flip && pend.stage) eosMoodAfterBloom(pend.flip, pend.stage)
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
        EOS_MOOD_LIVE.done = done
    })
    React.useEffect(
        () => () => {
            EOS_MOOD_LIVE.bloomAt = 0
            EOS_MOOD_LIVE.bloomPerf = 0
            EOS_MOOD_LIVE.painted = false
            EOS_MOOD_LIVE.words = []
            EOS_MOOD_LIVE.bloomFrom = null
            EOS_MOOD_LIVE.place = null
            EOS_MOOD_LIVE.done = false
        },
        []
    )

    const common = { "aria-hidden": "true", "data-eos-emotion": emo || "auto", "data-eos-calm": calm ? "1" : "0" }
    const glowA = eosMoodRgba(eosMoodHexRgb(pal.calm[0]) || [255, 220, 140], 0.9)
    const glowB = eosMoodRgba(eosMoodHexRgb(pal.calm[1]) || [255, 190, 110], 0.65)
    // Pre-rendered and hidden until the bloom; each word is born in the Still Point and blooms out to its crown place.
    const words = bloom ? bloom.words : eosMoodFlipWords(emo)
    const yielded = (bloom && bloom.yielded) || []
    return (
        <>
            <div ref={gradeRef} className="eosMoodGrade" {...common} data-eos-step={step} data-eos-done={done ? "1" : "0"} data-eos-late={late ? "1" : "0"} data-eos-grey={grey && t < 1 ? "1" : "0"} />
            <div ref={airRef} className="eosMoodAir" {...common} />
            <div ref={flipRef} className={`eosMoodFlip fs-mask${bloom ? " isBloom" : ""}${bloom && bloom.phone ? " isPhone" : ""}`} {...common} {...EOS_PRIVATE_ATTRS} data-eos-from={bloom ? bloom.from : ""} data-eos-layout={bloom ? bloom.layout : ""}>
                {words.map((w, i) => (
                    <span
                        key={i}
                        className={`eosMoodWord${yielded[i] ? " isYield" : ""}`}
                        data-eos-flip={i}
                        style={{ "--eos-mood-i": String(i), "--eos-mood-glow-a": glowA, "--eos-mood-glow-b": glowB, ...(bloom ? eosMoodWordStyle(bloom, i) : null) }}
                    >
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
                ))}
            </div>
        </>
    )
}

// ---------------------------------------------------------------- CSS
// The layers' colours are custom properties written per frame by the component's tween (eosMoodWrite): no CSS
// transition, no @property — the same smooth OKLCH glide in every browser. The fallbacks are fully transparent.
const EOS_MOOD_CSS = `
${EOS_A} .eosMoodGrade,${EOS_A} .eosMoodAir,${EOS_A} .eosMoodFlip{position:absolute;inset:0;z-index:${EOS_Z.mood};pointer-events:none!important;margin:0;padding:0;border:0;border-radius:inherit}
${EOS_A} .eosMoodGrade{mix-blend-mode:soft-light;background:linear-gradient(158deg,var(--eos-mood-a,rgba(0,0,0,0)) 0%,var(--eos-mood-b,rgba(0,0,0,0)) 100%)}
${EOS_A} .eosMoodGrade[data-eos-grey="1"]{-webkit-backdrop-filter:saturate(var(--eos-mood-sat,1));backdrop-filter:saturate(var(--eos-mood-sat,1))}
${EOS_A} .eosMoodAir{mix-blend-mode:screen;background:radial-gradient(var(--eos-mood-lshape,ellipse 62% 58% at 50% 52%),var(--eos-mood-glow,rgba(0,0,0,0)) 0%,rgba(0,0,0,0) 100%),
radial-gradient(var(--eos-mood-hshape,ellipse 100% 60% at 50% 112%),var(--eos-mood-heat,rgba(0,0,0,0)) 0%,rgba(0,0,0,0) 100%),
radial-gradient(ellipse 76% 70% at 50% 52%,rgba(0,0,0,0) var(--eos-mood-grip,46%),var(--eos-mood-edge,rgba(0,0,0,0)) 100%)}
${EOS_A} .eosMoodFlip{overflow:hidden;container-type:size}
${EOS_A} .eosMoodFlip:not(.isBloom){visibility:hidden}
${EOS_A} .eosMoodWord{position:absolute;display:flex;width:0;height:0;align-items:center;justify-content:center;white-space:nowrap;line-height:1;opacity:1;transition:opacity .26s ease-out}
/* something new landed on this word (the game's finale headline, the finish card): it steps aside by fading, never by travelling */
${EOS_A} .eosMoodWord.isYield{opacity:0}
${EOS_A} .eosMoodWordIn{position:relative;display:block;flex:none;opacity:0;translate:var(--eos-mood-dx,0px) var(--eos-mood-dy,0px);scale:.4}
${EOS_A} .eosMoodFlip.isBloom .eosMoodWordIn{animation:eosMoodRise ${EOS_MOOD_LIFE_MS}ms linear calc(var(--eos-mood-i) * ${EOS_MOOD_STAGGER}ms) 1 both}
/* a soft dusk cloud behind each word: keeps the cream letters readable on the Still Point's white bloom and the finish rays */
${EOS_A} .eosMoodWordIn::before{content:"";position:absolute;inset:-42% -20%;z-index:-1;border-radius:50%;background:radial-gradient(closest-side,rgba(14,8,30,.74),rgba(14,8,30,.44) 52%,rgba(14,8,30,0))}
/* solid cream + a warm-brown hairline and bevel + the calm glow (not a background-clip:text gradient: iOS Safari drops
   clip-text inside animated layers). The hairline keeps the words legible on white blooms; the glow on dark scenes. */
${EOS_A} .eosMoodWordTx{display:block;font:900 26px/1.06 var(--eos-font,"Baloo 2","Nunito",system-ui,sans-serif)!important;font-size:var(--eos-mood-fs,clamp(22px,4.4cqi,42px))!important;letter-spacing:.015em!important;
color:#fff2cf!important;-webkit-text-fill-color:#fff2cf!important;background:none!important;
text-shadow:none!important;-webkit-text-stroke:0!important;text-transform:none!important;opacity:1!important;
filter:drop-shadow(0 0 1.2px rgba(66,26,0,.95)) drop-shadow(0 2px 0 rgba(128,58,0,.75)) drop-shadow(0 0 9px var(--eos-mood-glow-a)) drop-shadow(0 0 22px var(--eos-mood-glow-b))}
${EOS_A} .eosMoodSparks{position:absolute;left:50%;top:50%;width:0;height:0;z-index:-1}
${EOS_A} .eosMoodSparks>i{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:#fff7d6;box-shadow:0 0 8px 2px var(--eos-mood-glow-a);opacity:0}
${EOS_A} .eosMoodFlip.isBloom .eosMoodSparks>i{animation:eosMoodSpark .85s cubic-bezier(.15,.7,.3,1) calc(var(--eos-mood-i) * ${EOS_MOOD_STAGGER}ms + .16s) 1 both}
${EOS_A} .eosMoodSparks>i:nth-child(1){--eos-mood-sx:-74px;--eos-mood-sy:-26px}
${EOS_A} .eosMoodSparks>i:nth-child(2){--eos-mood-sx:70px;--eos-mood-sy:-30px}
${EOS_A} .eosMoodSparks>i:nth-child(3){--eos-mood-sx:-52px;--eos-mood-sy:30px}
${EOS_A} .eosMoodSparks>i:nth-child(4){--eos-mood-sx:58px;--eos-mood-sy:26px}
${EOS_A} .eosMoodFlip.isPhone .eosMoodWordTx{font-size:var(--eos-mood-fs,clamp(22px,7cqi,30px))!important}
@media (max-width:560px){${EOS_A} .eosMoodWordTx{font-size:var(--eos-mood-fs,clamp(22px,7cqi,30px))!important}}
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
${EOS_A} .eosMoodFlip[data-eos-calm="1"] .eosMoodWordIn{translate:none;scale:none}
${EOS_A} .eosMoodFlip.isBloom[data-eos-calm="1"] .eosMoodWordIn{animation:eosMoodFade ${EOS_MOOD_LIFE_MS}ms ease-in-out calc(var(--eos-mood-i) * ${EOS_MOOD_STAGGER}ms) 1 both}
@media (prefers-reduced-motion:reduce){
  ${EOS_A} .eosMoodWordIn{translate:none!important;scale:none!important}
  ${EOS_A} .eosMoodFlip.isBloom .eosMoodWordIn{animation:eosMoodFade ${EOS_MOOD_LIFE_MS}ms ease-in-out calc(var(--eos-mood-i) * ${EOS_MOOD_STAGGER}ms) 1 both!important}
  ${EOS_A} .eosMoodSparks{display:none!important}
  ${EOS_A} .eosMoodWord{transition:opacity .26s linear!important}
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
    place: eosMoodPlace,
    content: eosMoodContent,
    carveUrl: eosMoodCarveUrl,
    mix: eosMoodMix,
    warm: eosMoodWarm,
})
