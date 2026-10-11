// ===================================================================================
// EOS · 24 · GAME 114 SKY LANTERNS — the sad / lonely hero (comfort, warmth, one small reach-out).
// Spec: docs/EOS_SPEC.md §8.0 (engine contract) + §8.4 (this game) + §10.2 (safety copy).
//
// A dusk hill. DROP sits on the crest; three paper lanterns stand in the grass, each carrying one of your words
// on a little hanging tag. Over the hill: the sky holds every lantern you have ever lit here (eos_sessions_v1
// rows for 114 — never fake strangers).
//   press & hold a lantern 1.2 s  → the glow fills up from your fingers (warm hum, a slowing heartbeat 60 → 52 bpm
//                                    whose visual twin pulses on DROP and in the lantern)
//   lit → flick / drag it up, or simply let go → it sways up into the sky, its word softens into a star
//   (keyboard: Space / Enter holds, ↑ or letting go releases). Early lifts keep their warmth (no fail state).
// The three stars land on a heart. DROP looks up (E80/E70 → E57 → E59 → E28 → E31 → E09) and is handed a 4th,
// golden lantern: "Send a little warmth?" — `Text someone "thinking of you"` or `Keep it for me` (equal size,
// both finish). The golden lantern rises into the heart's cleft, the constellation draws itself, every lantern in
// the sky glows and DROP hugs a heart (E08). Safety mode (any strong flag): "Text someone you trust" with
// "Hey, can you talk? I'm having a hard time." and neutral words on the lanterns (core eosWords).
// Finale composition (round 1): the wrapper's finish card is centred on the stage and its step card sits at the tap,
// so the heart swells in the sky ABOVE the middle band with DROP inside it, and the closing line + toast glide BELOW it.
// Public names: EOS_GAME_114, EosSkyLanternsEngine, EOS_LANTERNS_CSS. Everything else is EOS_LAN_* / EosLan* / eosLan*.
// ===================================================================================

const EOS_GAME_114 = {
    id: 114,
    name: "SKY LANTERNS",
    family: "Release",
    engine: "E04",
    prompt: "What feels heavy or lonely right now?",
    object: "Three paper lanterns, each holding your words, beside DROP on a dusk hill",
    action: "Hold a lantern to warm it, then flick it up into the sky",
    mechanism: "Warmth, common humanity and one small reach-out",
    hook: "Warm it in your hands. Let it rise.",
    surprise: "Your lanterns join every lantern you've ever lit here, and DROP hugs a heart.",
    mindBend: "Missing someone means you loved something.",
    score: "Lanterns lit",
    replay: "A new dusk",
    sound: "Warm hum, paper rustle, star twinkles",
    notes: "EOS sadness/loneliness hero · ~25 s · optional send-warmth share",
}

// ---------------------------------------------------------------- timings & tuning
const EOS_LAN = {
    holdMs: 1200, //      hold to light (spec)
    easyMs: 700, //       after 2 early lifts or 9 s without a light: a gentler hold
    warmCueMs: 200, //    hold this long before the "warming" line + DROP's hopeful face (quick taps never strobe them)
    cueMinMs: 600, //     a hint line ("Almost — hold a little longer") stays at least this long
    lineDelay: 900, //    the true line under a rising lantern waits for the wrapper's step card to float away…
    lineMinMs: 2600, //   …then stays at least this long (the next lantern's hint waits its turn)
    chimeMs: 5000, //     a flick that finished lighting mid-warm gets its scored chime on the next pointer event (never rAF)
    riseMs: 2200, //      sway up into the sky
    riseCalmMs: 1500, //  reduced motion: fade upward, no sway
    flickPx: 90, //       drag up this far (CSS px ÷ stage scale) while lit = launch now
    graceMs: 550, //      after a launch the next lantern's arrow waits (let the moment land)
    coolPerMs: 0.00012, // an early lift keeps its warmth and cools slowly (≈ 8 s from full)
    autoRiseMs: 6000, //  lit and still held this long → it rises by itself (assist; tone only, no scored sfx)
    nudgeMs: 9000, //     nothing lit for this long → easy hold + a gentle hint
    gatherMs: 400, //     3rd star lands → the sky gathers
    askMs: 800, //       gather → the golden lantern asks
    flyMs: 1300, //       choice → the golden lantern reaches the heart
    finCueMs: 1000, //    choice → the closing line / toast appear (after the wrapper's step card has floated away)
    pulseMs: 2400, //     choice → the drawn heart beats twice (lub-dub) and sends its light out
    fullMs: 2900, //      choice → 100 % (the peak plays before the wrapper's finish card arrives)
    settleMs: 2850, //    choice → the closing line + toast glide from the middle band (free while the step card sits at
    //                    the tap) to below the finish card (which arrives centred at onDone, after the step card is gone)
    doneDelay: 450, //    100 % → onDone
    maxSky: 120, //       past lanterns drawn (visual cap)
}
const EOS_LAN_CONTRIB = { idle: 0, warm: 3, lit: 10, rise: 18, star: 25 } // per lantern; 3 × 25 = 75, then 82 / 90 / 100
const EOS_LAN_LABEL = { hold: "HOLD TO LIGHT IT", rise: "LET IT RISE ↑", sky: "WATCH THE SKY", choose: "YOUR CHOICE", sent: "WARMTH SENT", kept: "KEPT CLOSE", sending: "WARMTH ON ITS WAY", ready: "READY TO SEND", saved: "SAVED FOR LATER" }
const EOS_LAN_SHARE = { normal: "Thinking of you 💛", safe: "Hey, can you talk? I'm having a hard time." }
const EOS_LAN_TOAST = { copied: "Copied — paste it to someone", manual: "Send them: " }
// DROP's journey (local bubble-expressions verified): teary / slumped → hopeful hands → looking up → soft smiles →
// wink with a heart → hugging a heart.
const EOS_LAN_FACE = { sad: 80, lonely: 70, warm: 57, up: 59, one: 28, two: 31, ask: 9, hug: 8 }

// Three dusks per variationSeed (cool = the heavy sky, warm = the sky your lanterns make) + local-time tints.
const EOS_LAN_SKIES = [
    { cool: ["#121634", "#2b2f5e", "#5a5f8f", "#8a7aa0"], warm: ["#1d1a40", "#5b3f72", "#e0856f", "#ffcf9a"], far: ["#353f6e", "#7a5578"], near: ["#1a2140", "#3b2846"], moon: 0.82 },
    { cool: ["#14122e", "#322a5c", "#5f4f86", "#9a7f9f"], warm: ["#221a44", "#6a4380", "#f08f7a", "#ffd9a8"], far: ["#3b3a6c", "#80527c"], near: ["#1d1a3a", "#402645"], moon: 0.16 },
    { cool: ["#0d1a2e", "#1f3a5a", "#3f6382", "#7d93a6"], warm: ["#152443", "#47507e", "#e69a74", "#ffd6a0"], far: ["#2c4d6c", "#6a5878"], near: ["#132438", "#352a42"], moon: 0.78 },
]
const EOS_LAN_TINT = {
    night: "linear-gradient(180deg, rgba(4,6,26,.5), rgba(4,6,26,0) 72%)",
    dawn: "linear-gradient(0deg, rgba(255,150,175,.26), rgba(255,150,175,0) 58%)",
    day: "linear-gradient(0deg, rgba(255,205,125,.24), rgba(255,205,125,0) 62%)",
    dusk: "none",
}
// Hill shapes per variant: far ridge control points (fractions of W, offsets from the crest in px).
const EOS_LAN_RIDGES = [
    [-14, -46, 6, -24, -36, -6],
    [-30, -18, -2, -40, -20, -12],
    [-6, -38, -18, -10, -44, -20],
]
// Heart constellation: param t → star slots (left lobe, right lobe, tip; the golden lantern takes the cleft).
const EOS_LAN_SLOT_T = [-1.25, 1.25, Math.PI]
const EOS_LAN_CLEFT_T = 0
const EOS_LAN_MOTES = Array.from({ length: 8 }, (_, i) => ({ x: 8 + ((i * 37) % 86), y: 44 + ((i * 23) % 40), d: 5 + (i % 4) * 1.3, k: i }))
// Finale embers: 12 sparks shower from the four stars of the heart (3 each: left lobe, right lobe, tip, golden cleft).
const EOS_LAN_EMBERS = Array.from({ length: 12 }, (_, i) => ({ src: i % 4, dx: ((i * 37) % 23) - 11, fall: 46 + ((i * 29) % 40), d: 0.15 + Math.floor(i / 4) * 0.42 + (i % 4) * 0.07, s: 0.7 + (i % 3) * 0.25 }))
const EOS_LAN_TWINKLE = Array.from({ length: 8 }, (_, i) => ({ x: 4 + ((i * 41) % 92), y: 6 + ((i * 29) % 44), d: (i % 5) * 0.7 }))

// ---------------------------------------------------------------- helpers
let eosLanLive = null // dev/test handle: window.__eos.lanterns.state()
function eosLanNow() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()
}
function eosLanHeart(t) {
    const s = Math.sin(t)
    return { x: 16 * s * s * s, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) }
}
function eosLanPx(v, fb) {
    const n = parseFloat(String(v || "").trim())
    return Number.isFinite(n) ? n : fb
}
// Measured layout inside the safe box (bottom → top): lantern row (body + string + tag) → cue line → DROP on the
// crest → the sky (count label, heart constellation). Plus the two finale poses (the constellation group and DROP
// glide there with one transform each):
//   ask — the heart, DROP inside it holding the golden lantern, the question under it, then a clear band for the
//         guide's chevron + "YOUR CHOICE" label, then the two cards at the bottom;
//   fin — the heart swells in the sky ABOVE the wrapper's finish card (centred on the stage); the closing line and
//         the toast sit BELOW that card, where the choice cards were.
// Short arenas (phone landscape) switch to a compact layout that always stays inside the arena.
function eosLanLayout(W, H, safeTop, safeBottom, pill) {
    const narrow = W < 560
    const boxT = Math.round(Math.min(safeTop, Math.max(8, H * 0.22)))
    const boxB = Math.round(Math.min(H - 8, Math.max(boxT + 140, H - safeBottom)))
    const boxH = boxB - boxT
    const compact = boxH < 300
    const lh = Math.round(compact ? eosClamp(boxH * 0.34, 44, 70) : eosClamp(boxH * (narrow ? 0.19 : 0.24), 70, 132))
    const lw = Math.round(lh * 0.76)
    const tagH = compact ? 30 : narrow ? 50 : 56 // one line (compact) or two lines of words at most
    const unitH = lh + 10 + tagH
    const spread = Math.round(narrow ? eosClamp((W - 24) / 3, 104, 136) : eosClamp(W * 0.15, compact ? 120 : 150, 210))
    const tw = Math.round(Math.max(lw + 16, spread - 8))
    const unitW = tw
    const rowTop = Math.round(boxB - unitH - 2)
    const cueH = compact ? 30 : narrow ? 46 : 40
    const cueY = Math.round(Math.max(boxT, rowTop - cueH - 6))
    // phone: DROP sits on the crest above the lanterns; desktop / compact: DROP sits on the hill beside them
    const side = W >= 820 || (compact && W >= 560)
    const dropS = Math.round(compact ? eosClamp(boxH * 0.3, 48, 80) : eosClamp(boxH * (narrow ? 0.2 : 0.25), 76, 132))
    const optGap = narrow ? 12 : 22
    const optW = Math.round(narrow ? (W - 32 - optGap) / 2 : eosClamp(W * 0.2, 220, 260))
    const dropX = Math.round(side ? Math.max(dropS / 2 + 16, Math.min(W / 2 - spread * 1.75, W / 2 - optW - optGap / 2 - dropS * 0.62 - 26)) : W / 2)
    const dropY = Math.round(side ? rowTop + lh - dropS * 0.95 : Math.max(boxT, cueY - dropS - 6))
    const crest = Math.round(dropY + dropS * 0.86)
    const skyT = boxT + 28
    const skyB = side ? cueY - 6 : dropY - 8
    const skyH = Math.max(compact ? 48 : 90, skyB - skyT)
    const hw = Math.min(W * (narrow ? 0.62 : 0.36), (skyH / 28.8) * 32 * 0.92, 380)
    const k = hw / 32
    const hcx = W / 2
    const hcy = skyT + skyH / 2
    const pt = (t) => {
        const p = eosLanHeart(t)
        return { x: Math.round(hcx + p.x * k), y: Math.round(hcy + (p.y - 2.6) * k) }
    }
    const homes = [0, 1, 2].map((i) => ({ x: Math.round(W / 2 + (i - 1) * spread), y: rowTop }))
    let path = ""
    for (let i = 0; i <= 72; i++) {
        const p = pt((i / 72) * Math.PI * 2)
        path += `${i ? "L" : "M"}${p.x},${p.y}`
    }
    const optH = Math.round(compact ? Math.min(112, boxH - 8) : narrow ? 116 : 124)
    const optY = Math.round(boxB - optH - 2)
    // ---- finale poses (heart units: the curve spans 28.95 k tall, 32 k wide; its "centre" sits 14.55 k below the lobes)
    const zt = boxT + (pill ? 30 : 6)
    const qH = narrow ? 38 : 40
    const band = compact ? 0 : narrow ? 92 : 96
    const qY = Math.round(Math.max(zt, optY - band - qH))
    const fitHeart = (top, bot) => {
        const hh = Math.max(48, bot - top)
        const fk = Math.min(hh / 29.4, (W - 56) / 34, 12)
        return { k: fk, cx: W / 2, cy: top + 14.55 * fk + (hh - 28.95 * fk) / 2 }
    }
    const askH = fitHeart(zt, qY - 4)
    const cardC = H / 2 // the wrapper's finish card (measured: centred on the stage, ~101 px tall on phone)
    const cardHalf = narrow ? 54 : 60
    const bandTop = Math.round(cardC - cardHalf)
    const bandBot = Math.round(cardC + cardHalf)
    let finH = fitHeart(zt, Math.max(zt + 60, bandTop - 6))
    if (finH.k < askH.k) finH = askH
    const lineH = compact ? 30 : narrow ? 44 : 36
    const lineY = Math.round(Math.max(qY, Math.min(bandBot + 6, boxB - lineH - 46)))
    const toastY = Math.round(Math.min(lineY + lineH + 2, boxB - 46))
    // before the finish card arrives the line (and toast) sit in the middle band, right under the heart's tip
    const lineRise = Math.round(Math.min(0, bandTop + 4 - lineY))
    const dropC = { x: dropX, y: dropY + dropS / 2 }
    const pose = (h) => {
        const size = Math.min(15 * h.k, dropS * 1.15)
        const cy = h.cy + 1.5 * h.k
        return { x: Math.round(h.cx - dropC.x), y: Math.round(cy - dropC.y), s: +(size / dropS).toFixed(3), size, cx: h.cx, cy }
    }
    const askD = pose(askH)
    const finD = pose(finH)
    const cpose = (h) => ({ x: Math.round(h.cx - hcx), y: Math.round(h.cy - hcy), s: +(h.k / k).toFixed(3) })
    const askC = cpose(askH)
    const finC = cpose(finH)
    const gw = Math.round(askD.size * 0.46)
    const gold = { w: gw, h: Math.round(gw * 1.28), x: Math.round(askD.cx + askD.size * 0.36), y: Math.round(askD.cy + askD.size * 0.14) }
    const finCleft = { x: Math.round(finH.cx), y: Math.round(finH.cy - 7.6 * finH.k) }
    return {
        narrow, side, compact, W: Math.round(W), H: Math.round(H), boxT, boxB, lh, lw, unitH, unitW, rowTop, cueY, cueH, dropS, dropX, dropY, crest, homes, path,
        slots: EOS_LAN_SLOT_T.map(pt), cleft: pt(EOS_LAN_CLEFT_T), heartK: k, hcx, hcy,
        opt: { w: optW, h: optH, gap: optGap, y: optY },
        qY, qH, lineY, lineH, toastY, lineRise, bandTop, bandBot, askH, finH, finCleft,
        tagAvail: tw - (narrow ? 19 : 25),
        gold: { ...gold, fx: finCleft.x - gold.x, fy: finCleft.y - gold.y },
        vars: {
            "--lw": `${lw}px`, "--lh": `${lh}px`, "--uw": `${unitW}px`, "--uh": `${unitH}px`, "--tw": `${tw}px`,
            "--crest": `${crest}px`, "--drop": `${dropS}px`, "--hcx": `${Math.round(hcx)}px`, "--hcy": `${Math.round(hcy)}px`,
            "--cax": `${askC.x}px`, "--cay": `${askC.y}px`, "--cas": askC.s, "--cfx": `${finC.x}px`, "--cfy": `${finC.y}px`, "--cfs": finC.s,
            "--dax": `${askD.x}px`, "--day": `${askD.y}px`, "--das": askD.s, "--dfx": `${finD.x}px`, "--dfy": `${finD.y}px`, "--dfs": finD.s,
        },
    }
}
// The user's words on the lanterns: whole short phrases rebuilt from their sentence (entries are consecutive token
// groups), split at punctuation / joining words, long clauses split where a new subject starts or before a natural
// boundary, each phrase MEASURED to fit its tag (2 lines; 1 in compact), scored by content + feeling words (later
// clauses win ties), the best 3 kept in the user's order. Safety (strong flag) → the core's neutral words only.
const EOS_LAN_STOP = new Set(
    ("a an and the of to in on at for with so but or nor i im i'm ive i've id i'd ill i'll me my mine myself is it its it's this that these those " +
        "was were be been being am are just very really too feel feels felt feeling like get got gets have has had do does did not no don't dont " +
        "didn't didnt can can't cant could would should will won't wont isn't isnt wasn't wasnt aren't arent you your yours he him his she her hers " +
        "they them their theirs we us our all back out up off anymore about from what when where since because cause then there here than as by " +
        "into onto over still even ever also some any much more most one ones kind sort last week weeks today yesterday tonight tomorrow night " +
        "morning day days month year years ago now right time lot lots thing things").split(/\s+/)
)
const EOS_LAN_CONJ = new Set("and but since because cause cuz coz cos then when while though although yet after until till".split(" "))
const EOS_LAN_LEAD = new Set("and but or so then like just um uh well also really honestly basically literally".split(" "))
const EOS_LAN_SUBJ = new Set("i i'm im i've ive i'd id i'll he she they we nobody everyone everybody".split(" "))
const EOS_LAN_BREAK = new Set("last this next at in on for to with from about before every all feels feel felt is was are were seems still".split(" "))
const EOS_LAN_AFFECT = /\b(alone|lonel\w*|empty|miss\w*|lost|lose|losing|gone|left|leave|leaving|nobody|noone|cry\w*|cried|tears?|hurt\w*|heavy|sad\w*|tired|ignored|forgot\w*|invisible|unseen|broke\w*|died|dead|death|passed|grief|griev\w*|without|never|ache\w*|aching|pain\w*|abandon\w*|reject\w*|unloved|unwanted|exclud\w*|myself|homesick|divorce\w*|breakup|dumped|funeral)\b/gi
function eosLanNorm(t) {
    return String(t).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']/g, "")
}
// fit(phrase) → does it wrap into ≤ maxLines inside maxW px with this font? (canvas measure; a char estimate without DOM)
let eosLanCanvas = null
function eosLanFitter(font, maxW, maxLines) {
    let ctx = null
    try {
        if (typeof document !== "undefined") {
            eosLanCanvas = eosLanCanvas || document.createElement("canvas")
            ctx = eosLanCanvas.getContext("2d")
            if (ctx) ctx.font = font
        }
    } catch {
        ctx = null
    }
    const px = parseFloat((String(font).match(/(\d+(?:\.\d+)?)px/) || [])[1]) || 15
    const width = (t) => (ctx ? ctx.measureText(t).width : t.length * px * 0.56) + t.length * px * 0.01 // + letter-spacing
    const room = Math.max(40, maxW - 2)
    const space = width(" ")
    return (phrase) => {
        let lines = 1
        let cur = 0
        for (const w of String(phrase).split(/\s+/).filter(Boolean)) {
            const ww = width(w)
            if (ww > room) return false // a word wider than the tag would break mid-word
            if (!cur) cur = ww
            else if (cur + space + ww <= room) cur += space + ww
            else {
                lines++
                cur = ww
            }
        }
        return lines <= maxLines
    }
}
function eosLanWords(entries, fit) {
    const ok = typeof fit === "function" ? fit : (p) => String(p).length <= 20
    const base = eosWords(entries, 6) // core rule: a strong safety flag → neutral words only
    if (base.length && base.every((w) => EOS_NEUTRAL_WORDS.includes(w))) return base.slice(0, 3)
    const raw = (entries || []).map((e) => String(e == null ? "" : e).trim()).filter((e) => e && !/^uploaded image$/i.test(e))
    let toks = raw.join(" ").split(/\s+/).filter(Boolean).slice(0, 80)
    for (let p = 1; p < toks.length; p++) {
        // short thoughts arrive cycled ("sad sad sad"): keep one period
        if (toks.every((t, i) => eosLanNorm(t) === eosLanNorm(toks[i % p]))) {
            toks = toks.slice(0, p)
            break
        }
    }
    const clauses = []
    let cur = []
    const flush = () => {
        while (cur.length && EOS_LAN_LEAD.has(eosLanNorm(cur[0]))) cur.shift()
        if (cur.length) clauses.push(cur)
        cur = []
    }
    for (const t of toks) {
        const end = /[.,;:!?…]+["”’)]*$/.test(t)
        const clean = t.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "")
        if (!clean) {
            if (end) flush()
            continue
        }
        if (EOS_LAN_CONJ.has(eosLanNorm(clean))) {
            flush()
            continue
        }
        cur.push(clean)
        if (end) flush()
    }
    flush()
    const meaning = (c) =>
        c.some((t) => {
            const n = eosLanNorm(t)
            return n.length >= 3 && !EOS_LAN_STOP.has(n)
        })
    const out = []
    const split = (c, depth) => {
        if (!c.length) return
        if (ok(c.join(" ")) || depth > 12) return void out.push(c)
        // a new subject starts a new phrase ("nobody texted me back | they all left")
        for (let j = c.length - 1; j >= 1; j--) {
            if (EOS_LAN_SUBJ.has(eosLanNorm(c[j]))) {
                split(c.slice(0, j), depth + 1)
                split(c.slice(j), depth + 1)
                return
            }
        }
        // else a head that fits: at a natural boundary ("i lost my dog | last week"), else where both halves fit and
        // still mean something ("everyone has someone | except me"), else the longest head
        let fitJ = 0
        let brkJ = 0
        let bothJ = 0
        for (let j = 1; j < c.length; j++) {
            if (!ok(c.slice(0, j).join(" "))) break
            fitJ = j
            if (EOS_LAN_BREAK.has(eosLanNorm(c[j]))) brkJ = j
            if (j >= 2 && meaning(c.slice(j)) && ok(c.slice(j).join(" "))) bothJ = j
        }
        const j = brkJ || bothJ || fitJ || 1
        out.push(c.slice(0, j))
        split(c.slice(j), depth + 1)
    }
    clauses.forEach((c) => split(c, 0))
    const mk = (c, idx) => {
        const text = c.join(" ")
        const content = c.filter((t) => {
            const n = eosLanNorm(t)
            return n.length >= 3 && !EOS_LAN_STOP.has(n)
        }).length
        const affect = (text.match(EOS_LAN_AFFECT) || []).length
        return { toks: c, text, idx, ok: ok(text), keep: content > 0 || affect > 0, score: content * 2 + affect * 3 + Math.min(c.length, 4) * 0.25 + idx * 0.15 }
    }
    const seen = new Set()
    const cands = out
        .map(mk)
        .filter((c) => {
            const key = c.text.toLowerCase()
            if (!c.keep || !c.ok || seen.has(key)) return false
            seen.add(key)
            return true
        })
    // fewer than three phrases: split the longest where a new subject starts (or at a natural boundary) when both
    // halves still carry meaning — "nobody texted me back | they all left" — before falling back to seed words
    for (let pass = 0; pass < 2 && cands.length < 3; pass++) {
        let best = null
        cands.forEach((c, ci) => {
            if (c.toks.length < 4) return
            for (let j = 1; j < c.toks.length; j++) {
                const n = eosLanNorm(c.toks[j])
                const pri = EOS_LAN_SUBJ.has(n) ? 2 : EOS_LAN_BREAK.has(n) ? 1 : 0
                if (!pri) continue
                const A = c.toks.slice(0, j)
                const B = c.toks.slice(j)
                if (!meaning(A) || !meaning(B)) continue
                const sc = pri * 100 + c.toks.length * 2 - Math.abs(A.length - B.length)
                if (!best || sc > best.sc) best = { sc, ci, A, B }
            }
        })
        if (!best) break
        const c = cands[best.ci]
        cands.splice(best.ci, 1, mk(best.A, c.idx), mk(best.B, c.idx + 0.5))
    }
    const list = cands
        .sort((x, y) => y.score - x.score || y.idx - x.idx)
        .slice(0, 3)
        .sort((x, y) => x.idx - y.idx)
        .map((c) => c.text)
    // pad with the feeling's own seeds — never one that repeats a word already on a lantern
    const used = new Set(list.join(" ").split(/\s+/).map(eosLanNorm).filter((n) => n.length >= 3 && !EOS_LAN_STOP.has(n)))
    const emo = EOS_EMO[eosCurrentEmotion()] || EOS_EMO.sad
    for (const sd of emo.seeds) {
        if (list.length >= 3) break
        if (list.includes(sd) || !ok(sd) || sd.split(/\s+/).map(eosLanNorm).some((w) => used.has(w))) continue
        list.push(sd)
    }
    for (const sd of emo.seeds.concat(EOS_NEUTRAL_WORDS)) {
        if (list.length >= 3) break
        if (!list.includes(sd)) list.push(sd)
    }
    return list.slice(0, 3)
}
// Copy the text, then say so (navigator.share fallback). Never throws.
function eosLanCopy(text, done) {
    const legacy = () => {
        let ok = false
        try {
            const ta = document.createElement("textarea")
            ta.value = text
            ta.setAttribute("readonly", "")
            ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0"
            document.body.appendChild(ta)
            ta.select()
            ok = !!document.execCommand && document.execCommand("copy")
            document.body.removeChild(ta)
        } catch {}
        done(ok)
    }
    try {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => done(true), legacy)
            return
        }
    } catch {}
    legacy()
}

function EosSkyLanternsEngine({ game, entries = [], onProgress, onDone, sfx, rainSfx, reduced, imageSources, hasUserImages, variationSeed }) {
    const store = useEosStore()
    const red = eosCalm(reduced)
    const strong = eosSafetyStrong(store.safety)
    const rootRef = React.useRef(null)
    const lanRefs = [React.useRef(null), React.useRef(null), React.useRef(null)]
    const flyRefs = [React.useRef(null), React.useRef(null), React.useRef(null)]
    const poolRefs = [React.useRef(null), React.useRef(null), React.useRef(null)]
    const dropRef = React.useRef(null)
    const optRefs = [React.useRef(null), React.useRef(null)]
    const cbRef = React.useRef({})
    cbRef.current = { onProgress, onDone, sfx, rainSfx, red }

    // ---- per-mount constants (a replay remounts the engine → a new dusk)
    const setup = React.useMemo(() => {
        const st = EOS_STORE.get()
        const seed = Math.abs(Math.round(Number(variationSeed) || 1))
        const v = seed % 3
        const emo = st.emotion || st.detected || "sad"
        let past = 0
        try {
            past = eosSessions().filter((r) => r && Number(r.gameId) === 114).length
        } catch {}
        const grade = eosGrade(emo === "lonely" || emo === "sad" ? emo : "sad")
        return {
            v,
            sky: EOS_LAN_SKIES[v],
            ridge: EOS_LAN_RIDGES[v],
            day: eosDayPart(),
            start: emo === "lonely" ? EOS_LAN_FACE.lonely : EOS_LAN_FACE.sad,
            past,
            horizon: grade.calm[1],
            tilt: [[-4, 2, 5], [3, -3, -5], [-2, 4, -3]][v],
            seed,
        }
    }, [])
    const thumbs = hasUserImages ? (imageSources || []).filter(Boolean).slice(0, 3) : []
    const tonight = setup.day === "dusk" || setup.day === "night" ? "tonight" : "today"
    const lines = strong
        ? ["You don't have to carry this alone.", `Lots of people are looking up at the same sky ${tonight}.`, "Reaching out is a brave, strong thing."]
        : ["Missing someone means you loved something.", `Lots of people are looking up at the same sky ${tonight}.`, "Everyone carries something heavy sometimes."]

    // ---- UI state (a few changes per lantern; per-frame values live in refs + CSS variables)
    const [ui, setUi] = React.useState({
        st: ["idle", "idle", "idle"],
        held: -1,
        grace: false,
        cue: "start",
        stars: [false, false, false],
        risen: 0,
        stage: "play", // play · gather · ask · fly · done
        choice: null, //  "send" | "keep"
        toast: "",
        burst: null,
        easy: false,
        warm: 0,
        warming: false, // held ≥ 200 ms: the "warming" line + DROP's hopeful face (taps never strobe them)
        cv: "a", //       restarts the cue's fade-in without remounting it
        pulse: false, //  the drawn heart beats twice
        settle: false, // the closing line glides below the wrapper's finish card
        outcome: null, // send: "sent" · "ready" (copied) · "saved" (share sheet closed) · null (still open)
    })
    const patch = (p) => setUi((u) => ({ ...u, ...(typeof p === "function" ? p(u) : p) }))
    const [geo, setGeo] = React.useState(null)

    // ---- the lantern machine (refs only; one rAF loop that runs only while something moves)
    const S = React.useRef(null)
    if (!S.current)
        S.current = {
            alive: false,
            L: [0, 1, 2].map(() => ({ st: "idle", heat: 0, dx: 0, dy: 0, t0: 0, from: null, to: null, slot: -1, contrib: 0, tag: 1, op: 1 })),
            held: -1,
            kbd: false, //    the last input was a key (focus follows the game for keyboard players)
            rawDy: 0,
            ptr: null, //     pointerId | "key"
            x0: 0,
            y0: 0,
            risen: 0,
            stars: 0,
            stage: "play",
            prog: -1,
            plog: [],
            sfxLog: [],
            beats: 0,
            stopBeat: null,
            early: 0,
            easy: false,
            lastAct: eosLanNow(),
            graceUntil: 0,
            raf: 0,
            last: 0,
            doneSent: false,
            timers: [],
            autoRise: 0,
            ab: { sq: 0, beat: 0, pop: 0, ack: 0, cue: 0 },
            k: 1, //          stage scale, read once per press (never per pointermove)
            touched: false,
            pressAt: 0,
            warmCue: false,
            cue: "start",
            cueLock: 0,
            cuePending: null,
            cueTimer: 0,
            lineAt: 0,
            pendingChime: 0,
            chooseAt: 0,
            outcome: null,
            lastAck: 0,
            geo: null,
            choice: null,
            toast: "",
            face: setup.start,
            faces: [setup.start],
        }

    // the user's words, fitted to the measured tag (frozen once the first lantern is touched)
    const [fitFont, setFitFont] = React.useState("")
    const [fontsTick, setFontsTick] = React.useState(0)
    const wordsRef = React.useRef(null)
    const words = React.useMemo(() => {
        const w = wordsRef.current
        if (w && S.current.touched && w.strong === strong) return w.list
        const fit = geo ? eosLanFitter(fitFont || `900 ${geo.narrow ? 15 : 17}px "Baloo 2", Nunito, sans-serif`, geo.tagAvail, geo.compact ? 1 : 2) : null
        const list = eosLanWords(entries, fit)
        wordsRef.current = { list, strong }
        return list
    }, [(entries || []).join("|"), strong, fitFont, fontsTick, geo ? `${geo.tagAvail}|${geo.compact}` : ""])

    const later = (fn, ms) => {
        const id = setTimeout(() => {
            if (S.current.alive) fn()
        }, ms)
        S.current.timers.push(id)
        return id
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
        toggle(key) {
            const s = S.current
            s.ab[key] = (s.ab[key] + 1) % 2
            return s.ab[key] ? "a" : "b"
        },
        squash(i) {
            const el = lanRefs[i] && lanRefs[i].current
            if (el) el.setAttribute("data-sq", fx.toggle("sq"))
        },
        ack(i) {
            const s = S.current
            const t = eosLanNow()
            if (t - s.lastAck < 240) return
            s.lastAck = t
            fx.sfx("soft")
            eosTone(523, 90, { type: "sine", gain: 0.02 })
            eosHaptic("touch")
            if (i != null && i >= 0) fx.squash(i)
        },
        // Lantern i's transform + warmth (written straight to the DOM; never waits for React)
        paint(i) {
            const L = S.current.L[i]
            const el = flyRefs[i].current
            if (!el) return
            el.style.setProperty("--heat", L.heat.toFixed(3))
            el.style.setProperty("--tag", L.tag.toFixed(3))
            el.style.opacity = L.op >= 1 ? "" : L.op.toFixed(3)
            const sc = L.sc == null ? 1 : L.sc
            el.style.transform = L.dx || L.dy || sc !== 1 || L.rot ? `translate3d(${L.dx.toFixed(1)}px,${L.dy.toFixed(1)}px,0) rotate(${(L.rot || 0).toFixed(2)}deg) scale(${sc.toFixed(3)})` : ""
            const pool = poolRefs[i].current
            if (pool) pool.style.setProperty("--heat", (L.st === "rise" || L.st === "star" ? Math.max(0, L.heat * (1 - (L.p || 0) * 1.6)) : L.heat).toFixed(3))
        },
    }
    const progNow = () => S.current.L.reduce((a, L) => a + L.contrib, 0)
    const bump = (i, st, label) => {
        const L = S.current.L[i]
        L.contrib = Math.max(L.contrib, EOS_LAN_CONTRIB[st] || 0)
        fx.report(progNow(), label)
    }
    const nextLabel = () => (S.current.risen < 3 ? EOS_LAN_LABEL.hold : EOS_LAN_LABEL.sky)
    const setSt = (i, st, extra) => {
        S.current.L[i].st = st
        patch((u) => {
            const next = u.st.slice()
            next[i] = st
            const ex = typeof extra === "function" ? extra(u) : extra
            return { st: next, ...(ex || {}) }
        })
    }

    // ---- the one line: a tiny scheduler (one span, never remounted; hints hold ≥ 600 ms, true lines ≥ 2.6 s,
    // a request during a hold waits its turn; stage lines force their way in)
    const armCue = (ms) => {
        const s = S.current
        if (s.cueTimer) return
        s.cueTimer = later(() => {
            const st = S.current
            st.cueTimer = 0
            const p = st.cuePending
            st.cuePending = null
            if (p) setCue(p)
        }, Math.max(20, ms + 10))
    }
    const setCue = (name, o = {}) => {
        const s = S.current
        if (!s.alive) return
        const t = eosLanNow()
        if (!o.force && t < s.cueLock) {
            s.cuePending = name
            armCue(s.cueLock - t)
            return
        }
        if (o.clear) s.cuePending = null
        s.cueLock = o.hold ? t + o.hold : 0
        if (s.cuePending && s.cueLock) armCue(o.hold)
        if (/^line/.test(name)) s.lineAt = t
        if (s.cue === name) return
        s.cue = name
        patch({ cue: name, cv: fx.toggle("cue") })
    }
    // a lantern that finished lighting after it was already flicked up: its scored chime plays on the next pointer event
    const flushChime = () => {
        const s = S.current
        if (!s.pendingChime) return
        const fresh = eosLanNow() - s.pendingChime < EOS_LAN.chimeMs
        s.pendingChime = 0
        if (fresh) fx.sfx("chime")
    }

    // ---- the one rAF loop: warming / cooling glow and the rise along the sway path
    const step = () => {
        const s = S.current
        s.raf = 0
        if (!s.alive) return
        const t = eosLanNow()
        const dt = Math.min(250, Math.max(0, t - (s.last || t))) // wall clock: slow frames never slow the hold
        s.last = t
        const holdMs = s.easy ? EOS_LAN.easyMs : EOS_LAN.holdMs
        let any = false
        s.L.forEach((L, i) => {
            if (L.st === "warm" || (L.st === "idle" && L.heat > 0)) {
                if (s.held === i) {
                    L.heat = Math.min(1, L.heat + dt / holdMs)
                    any = true
                    if (!s.warmCue && t - s.pressAt >= EOS_LAN.warmCueMs) {
                        s.warmCue = true
                        patch({ warming: true })
                        setCue("warm")
                    }
                } else {
                    L.heat = Math.max(0, L.heat - dt * EOS_LAN.coolPerMs)
                    if (L.heat > 0) any = true
                }
                fx.paint(i)
                if (s.held === i && L.heat >= 1) lit(i)
            } else if (L.st === "rise") {
                const calm = cbRef.current.red
                const dur = calm ? EOS_LAN.riseCalmMs : EOS_LAN.riseMs
                const p = eosClamp((t - L.t0) / dur, 0, 1)
                L.p = p
                if (calm) {
                    // reduced: fade upward, no sway (a short drift, then the star fades in at its slot)
                    L.dx = L.from.x
                    L.dy = L.from.y - 46 * p
                    L.rot = 0
                    L.sc = 1
                    L.op = 1 - p
                    L.tag = 1 - p
                } else {
                    const e = 0.5 - 0.5 * Math.cos(Math.PI * p)
                    const sway = Math.sin(p * Math.PI * 3) * 16 * (1 - p)
                    L.dx = L.from.x + (L.to.x - L.from.x) * e + sway
                    L.dy = L.from.y + (L.to.y - L.from.y) * e
                    L.rot = Math.cos(p * Math.PI * 3) * 7 * (1 - p)
                    L.sc = 1 - 0.72 * e
                    L.tag = 1 - eosClamp((p - 0.4) / 0.35, 0, 1)
                    L.op = p > 0.86 ? 1 - (p - 0.86) / 0.14 : 1
                }
                fx.paint(i)
                any = true
                if (p >= 1) arrive(i)
            }
        })
        if (any) kick()
    }
    const kick = () => {
        const s = S.current
        if (s.raf || !s.alive) return
        s.last = s.last && eosLanNow() - s.last < 100 ? s.last : eosLanNow()
        s.raf = requestAnimationFrame(step)
    }

    // ---- the slowing heartbeat (haptic + its visual twin on DROP and the held lantern)
    const beatStart = () => {
        const s = S.current
        if (s.stopBeat) return
        const from = 60 - s.risen * 2.7
        s.stopBeat = eosHeartbeat(from, Math.max(52, from - 2.7), 2600, () => {
            const r = rootRef.current
            if (!r || !S.current.alive) return
            S.current.beats++
            r.setAttribute("data-beat", fx.toggle("beat"))
            eosTone(82, 120, { type: "sine", gain: 0.035 })
        })
    }
    const beatStop = () => {
        const s = S.current
        try {
            s.stopBeat?.()
        } catch {}
        s.stopBeat = null
    }

    // ---- transitions
    const activeIdx = () => {
        const L = S.current.L
        for (let i = 0; i < 3; i++) if (L[i].st === "idle" || L[i].st === "warm") return i
        return -1
    }
    const press = (i, src) => {
        const s = S.current
        if (!s.alive || s.stage !== "play" || i < 0) return
        const L = s.L[i]
        if (L.st === "rise" || L.st === "star") return fx.ack(i)
        if (s.held !== -1 && s.held !== i) return fx.ack(i)
        if (s.held === i) return
        s.held = i
        s.ptr = src
        s.rawDy = 0
        s.lastAct = eosLanNow()
        s.touched = true
        s.pressAt = eosLanNow()
        s.warmCue = false
        L.st = "warm"
        setSt(i, "warm", { held: i })
        fx.sfx("soft")
        eosTone(196, s.easy ? EOS_LAN.easyMs : EOS_LAN.holdMs, { type: "sine", gain: 0.04, glide: 294 })
        eosTone(2200, 70, { type: "triangle", gain: 0.008, glide: 1500 }) // paper rustle
        eosHaptic("touch")
        fx.squash(i)
        beatStart()
        try {
            eosApi("dots").pulse?.("in")
        } catch {}
        bump(i, "warm", EOS_LAN_LABEL.hold)
        kick()
    }
    const lit = (i) => {
        const s = S.current
        const L = s.L[i]
        if (L.st !== "warm") return
        L.st = "lit"
        L.heat = 1
        fx.paint(i)
        setSt(i, "lit")
        setCue("lit")
        eosHaptic("notch")
        eosTone(eosNote(4 + s.risen * 2, 392), 260, { type: "triangle", gain: 0.045 })
        eosTone(eosNote(7 + s.risen * 2, 392), 320, { type: "sine", gain: 0.025, at: 0.08 })
        bump(i, "lit", EOS_LAN_LABEL.rise)
        clearTimeout(s.autoRise)
        s.autoRise = later(() => {
            if (S.current.L[i].st === "lit") rise(i, false)
        }, EOS_LAN.autoRiseMs)
        if (s.rawDy <= -EOS_LAN.flickPx) {
            // already pulled up while warming (this runs inside rAF): launch now, the scored chime waits for the
            // next pointer event — never a non-soft sfx from rAF (§8.0)
            s.pendingChime = eosLanNow()
            rise(i, false)
        }
    }
    const release = (i) => {
        const s = S.current
        if (s.held !== i) return
        s.held = -1
        s.ptr = null
        const L = s.L[i]
        if (L.st === "lit") return rise(i, true)
        beatStop()
        if (L.st === "warm") {
            L.st = "idle"
            L.dx = 0
            L.dy = 0
            fx.paint(i)
            s.early++
            const easy = s.early >= 2 || s.easy
            s.easy = easy
            s.warmCue = false
            setSt(i, "idle", { held: -1, easy, warming: false })
            setCue(easy ? "easy" : "early", { hold: EOS_LAN.cueMinMs })
            eosTone(262, 140, { type: "sine", gain: 0.025, glide: 220 })
            kick()
        } else patch({ held: -1, warming: false })
    }
    const rise = (i, user) => {
        const s = S.current
        const L = s.L[i]
        if (L.st !== "lit" || !s.geo) return
        const g = s.geo
        clearTimeout(s.autoRise)
        beatStop()
        if (s.held === i) {
            s.held = -1
            s.ptr = null
        }
        const order = s.risen++
        L.slot = order
        L.st = "rise"
        L.t0 = eosLanNow()
        L.p = 0
        L.from = { x: L.dx, y: L.dy }
        const home = g.homes[i]
        const slot = g.slots[order]
        L.to = { x: slot.x - home.x, y: slot.y - (home.y + g.lh / 2) }
        s.graceUntil = eosLanNow() + EOS_LAN.graceMs
        s.lastAct = eosLanNow()
        const bx = ((home.x + L.dx) / g.W) * 100
        const by = ((home.y + g.lh * 0.4 + L.dy) / g.H) * 100
        s.warmCue = false
        setSt(i, "rise", { held: -1, warming: false, grace: true, risen: s.risen, warm: Math.min(0.75, s.risen * 0.25), burst: { k: order + 1, x: bx, y: by, big: false } })
        // the true line waits for the wrapper's step card (anchored at the flick) to float away, then holds 2.6 s
        setCue("rising", { force: true, clear: true, hold: EOS_LAN.lineDelay })
        later(() => setCue(`line${order}`, { force: true, hold: EOS_LAN.lineMinMs }), EOS_LAN.lineDelay)
        if (user) fx.sfx("chime")
        eosHaptic("hit")
        ;[0, 2, 4].forEach((n, k) => eosTone(eosNote(n + 5 + order, 392), 240, { type: "triangle", gain: 0.04, at: k * 0.09 }))
        try {
            eosApi("dots").pulse?.("out")
        } catch {}
        bump(i, "rise", nextLabel())
        later(() => patch({ grace: false }), EOS_LAN.graceMs)
        // keyboard players keep their place: focus moves to the next lantern
        try {
            if (typeof document !== "undefined" && (document.activeElement === lanRefs[i].current || (s.kbd && document.activeElement === document.body))) {
                const n = activeIdx()
                if (n >= 0) later(() => lanRefs[n].current?.focus?.({ preventScroll: true }), 30)
            }
        } catch {}
        kick()
    }
    const arrive = (i) => {
        const s = S.current
        const L = s.L[i]
        if (L.st !== "rise") return
        L.st = "star"
        L.op = 0
        L.tag = 0
        fx.paint(i)
        s.stars++
        const slot = L.slot
        setSt(i, "star", (u) => {
            const stars = u.stars.slice()
            stars[slot] = true
            return { stars }
        })
        eosTone(eosNote(10 + slot, 392), 420, { type: "sine", gain: 0.028 })
        eosTone(eosNote(12 + slot, 392), 300, { type: "sine", gain: 0.016, at: 0.12 })
        bump(i, "star", nextLabel())
        if (s.stars >= 3) later(gather, Math.max(EOS_LAN.gatherMs, (s.lineAt || 0) + 2400 - eosLanNow()))
    }
    const gather = () => {
        const s = S.current
        if (s.stage !== "play") return
        s.stage = "gather"
        patch({ stage: "gather", warm: 1 })
        setCue("gather", { force: true, clear: true })
        eosTone(eosNote(5, 262), 900, { type: "sine", gain: 0.03, glide: eosNote(7, 262) })
        later(ask, EOS_LAN.askMs)
    }
    const ask = () => {
        const s = S.current
        if (s.stage !== "gather") return
        s.stage = "ask"
        patch({ stage: "ask" })
        setCue("ask", { force: true, clear: true })
        fx.report(82, EOS_LAN_LABEL.choose)
        try {
            const a = typeof document !== "undefined" ? document.activeElement : null
            const inside = a && rootRef.current && rootRef.current.contains(a)
            if (inside || (s.kbd && (!a || a === document.body))) later(() => optRefs[0].current?.focus?.({ preventScroll: true }), 60)
        } catch {}
    }
    // the toast waits until the wrapper's step card (anchored at the tap on the card) has floated away
    const showToast = (msg) => {
        const s = S.current
        if (!s.alive) return
        const apply = () => {
            S.current.toast = msg
            patch({ toast: msg })
        }
        const wait = s.chooseAt + EOS_LAN.finCueMs + 100 - eosLanNow()
        if (wait > 0) later(apply, wait)
        else apply()
    }
    // honest copy: nothing says "sent" until the share sheet says so
    const settle = (outcome) => {
        const s = S.current
        if (!s.alive || s.outcome) return
        s.outcome = outcome
        patch({ outcome })
        if (eosLanNow() - s.chooseAt >= EOS_LAN.finCueMs) setCue(outcome, { force: true })
    }
    const share = () => {
        const text = strong ? EOS_LAN_SHARE.safe : EOS_LAN_SHARE.normal
        const copy = () =>
            eosLanCopy(text, (ok) => {
                showToast(ok ? EOS_LAN_TOAST.copied : `${EOS_LAN_TOAST.manual}“${text}”`)
                settle("ready")
            })
        try {
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                const p = navigator.share({ text })
                if (p && typeof p.then === "function")
                    p.then(
                        () => settle("sent"),
                        (err) => {
                            if (err && err.name === "AbortError") settle("saved")
                            else copy()
                        }
                    )
                return
            }
        } catch {}
        copy()
    }
    const choose = (kind) => {
        const s = S.current
        if (!s.alive || s.stage !== "ask") return
        s.stage = "fly"
        s.choice = kind
        s.chooseAt = eosLanNow()
        const g = s.geo
        const bx = g ? (g.gold.x / g.W) * 100 : 50
        const by = g ? (g.gold.y / g.H) * 100 : 50
        patch({ stage: "fly", choice: kind, burst: { k: 9, x: bx, y: by, big: true } })
        setCue("blank", { force: true, clear: true, hold: EOS_LAN.finCueMs })
        fx.sfx("win")
        eosHaptic("finish")
        ;[0, 2, 4, 5, 7].forEach((n, k) => eosTone(eosNote(n + 5, 392), 320, { type: "triangle", gain: 0.04, at: k * 0.11 }))
        fx.report(90, kind === "send" ? EOS_LAN_LABEL.sending : EOS_LAN_LABEL.kept)
        if (kind === "send") share()
        // the closing line arrives below the wrapper's (centred) finish card, after the step card has floated away
        later(() => setCue(S.current.outcome || (kind === "send" ? "sending" : "kept"), { force: true }), EOS_LAN.finCueMs)
        later(() => {
            S.current.stage = "done"
            patch({ stage: "done" })
            eosTone(eosNote(10, 392), 900, { type: "sine", gain: 0.03 })
        }, EOS_LAN.flyMs)
        // the drawn heart beats twice (lub-dub) and sends its light out — the peak, before the finish card
        later(() => {
            patch({ pulse: true })
            eosTone(82, 130, { type: "sine", gain: 0.05 })
            eosTone(70, 150, { type: "sine", gain: 0.04, at: 0.32 })
            eosTone(eosNote(12, 392), 900, { type: "sine", gain: 0.022, at: 0.1 })
            eosTone(eosNote(16, 392), 900, { type: "sine", gain: 0.014, at: 0.42 })
            eosHaptic("notch")
        }, EOS_LAN.pulseMs)
        later(() => patch({ settle: true }), EOS_LAN.settleMs)
        later(() => {
            const o = S.current.outcome
            const lab = kind !== "send" ? EOS_LAN_LABEL.kept : o === "sent" ? EOS_LAN_LABEL.sent : o === "ready" ? EOS_LAN_LABEL.ready : o === "saved" ? EOS_LAN_LABEL.saved : EOS_LAN_LABEL.sending
            fx.report(100, lab)
            later(() => {
                const st = S.current
                if (st.doneSent) return
                st.doneSent = true
                const bonus = Math.round(eosClamp(330 - st.early * 10 + (st.beats > 6 ? 10 : 0), 270, 350))
                try {
                    cbRef.current.onDone?.(bonus)
                } catch {}
            }, EOS_LAN.doneDelay)
        }, EOS_LAN.fullMs)
    }

    // ---- pointer: the root owns every pointer (lanterns, or the sky as a pad for the next lantern)
    const onPointerDown = (e) => {
        const s = S.current
        if (s.stage !== "play") return
        if (e.target && e.target.closest && e.target.closest(".eosLanOpt")) return
        if (e.button != null && e.button > 0) return
        s.kbd = false
        const hit = e.target && e.target.closest ? e.target.closest("[data-lan]") : null
        const i = hit ? Number(hit.getAttribute("data-lan")) : activeIdx()
        if (s.held !== -1) return fx.ack(i)
        if (i < 0) return fx.ack(null)
        const L = s.L[i]
        if (L.st === "rise" || L.st === "star") return fx.ack(i)
        try {
            e.currentTarget.setPointerCapture(e.pointerId)
        } catch {}
        s.x0 = e.clientX
        s.y0 = e.clientY
        s.k = eosStageScale(rootRef.current) || 1
        L.dx = 0
        L.dy = 0
        press(i, e.pointerId)
    }
    const onPointerMove = (e) => {
        const s = S.current
        if (s.pendingChime) flushChime()
        if (s.held < 0 || s.ptr !== e.pointerId) return
        const i = s.held
        const L = s.L[i]
        const k = s.k || 1
        const dx = (e.clientX - s.x0) / k
        const dy = (e.clientY - s.y0) / k
        if (L.st === "lit") {
            L.dx = dx * 0.35
            L.dy = Math.min(0, dy) * 0.9
            fx.paint(i)
            if (-dy >= EOS_LAN.flickPx) rise(i, true)
        } else if (L.st === "warm") {
            // a little tug upward while it warms (it wants to fly)
            s.rawDy = dy
            L.dx = 0
            L.dy = Math.max(-14, Math.min(0, dy * 0.12))
            fx.paint(i)
        }
    }
    const onPointerEnd = (e) => {
        const s = S.current
        if (s.pendingChime) flushChime()
        if (s.held < 0 || s.ptr !== e.pointerId) return
        release(s.held)
    }
    // keyboard: Space / Enter hold the focused (or next) lantern, ↑ or letting go releases it. preventDefault only
    // when the key acts, so Space / ↑ still scroll a longer Framer page whenever there is nothing to hold or raise.
    const keyDown = (i, e) => {
        const k = e.key
        const s = S.current
        if (s.stage !== "play" || i < 0) return
        if (k === " " || k === "Spacebar" || k === "Enter") {
            if (s.held === -1) {
                const L = s.L[i]
                if (!L) return
                e.preventDefault()
                s.kbd = true
                if (e.repeat) return
                if (L.st === "rise" || L.st === "star") return fx.ack(i)
                L.dx = 0
                L.dy = 0
                press(i, "key")
            } else if (s.ptr === "key") e.preventDefault() // the key is being held: no page scroll while it lights
        } else if (k === "ArrowUp") {
            if (s.held === i && s.L[i].st === "lit") {
                e.preventDefault()
                rise(i, true)
            }
        }
    }
    const keyUp = (i, e) => {
        const k = e.key
        if ((k === " " || k === "Spacebar" || k === "Enter") && S.current.ptr === "key") {
            e.preventDefault()
            release(i)
        }
    }

    // ---- mount / unmount
    React.useEffect(() => {
        const s = S.current
        s.alive = true
        fx.report(0, EOS_LAN_LABEL.hold)
        // a window listener for keyboard players whose focus is on the page (not in the composer)
        const isFree = () => {
            try {
                const a = document.activeElement
                return !a || a === document.body || a === document.documentElement || a === rootRef.current
            } catch {
                return false
            }
        }
        const kd = (e) => {
            if (!isFree()) return
            const i = S.current.held >= 0 ? S.current.held : activeIdx()
            if (i < 0) return
            if (e.key === " " || e.key === "ArrowUp") keyDown(i, e)
        }
        const ku = (e) => {
            if (!isFree()) return
            if (S.current.held >= 0 && e.key === " ") keyUp(S.current.held, e)
        }
        window.addEventListener("keydown", kd)
        window.addEventListener("keyup", ku)
        // assist: nothing lit for a while → a gentler hold + a hint (≤ 45 s even with clumsy play)
        const nudge = setInterval(() => {
            const st = S.current
            if (!st.alive || st.stage !== "play" || st.easy || st.held >= 0) return
            if (eosLanNow() - st.lastAct > EOS_LAN.nudgeMs) {
                st.easy = true
                st.lastAct = eosLanNow()
                patch({ easy: true })
                setCue("easy", { hold: EOS_LAN.cueMinMs })
            }
        }, 1000)
        eosLanLive = () => {
            const st = S.current
            return {
                stage: st.stage,
                lanterns: st.L.map((L) => ({ st: L.st, heat: +L.heat.toFixed(2), slot: L.slot })),
                held: st.held,
                risen: st.risen,
                stars: st.stars,
                prog: st.prog,
                plog: st.plog.slice(),
                sfx: st.sfxLog.slice(),
                beats: st.beats,
                early: st.early,
                easy: st.easy,
                choice: st.choice,
                toast: st.toast,
                face: st.face,
                faces: st.faces.slice(),
                past: setup.past,
                done: st.doneSent,
            }
        }
        return () => {
            const st = S.current
            st.alive = false
            if (st.raf) cancelAnimationFrame(st.raf)
            st.raf = 0
            st.timers.forEach((id) => clearTimeout(id))
            st.timers = []
            clearTimeout(st.autoRise)
            clearInterval(nudge)
            try {
                st.stopBeat?.()
            } catch {}
            st.stopBeat = null
            window.removeEventListener("keydown", kd)
            window.removeEventListener("keyup", ku)
            eosLanLive = null
        }
    }, [])

    // ---- measured layout (before paint) + resize
    eosLayoutEffect(() => {
        const el = rootRef.current
        if (!el) return
        const measure = () => {
            const cs = getComputedStyle(el)
            const g = eosLanLayout(el.offsetWidth || 390, el.offsetHeight || 700, eosLanPx(cs.getPropertyValue("--eos-safe-top"), 48), eosLanPx(cs.getPropertyValue("--eos-safe-bottom"), 200), setup.past > 0)
            const prev = S.current.geo
            if (prev && prev.W === g.W && prev.H === g.H) return
            S.current.geo = g
            // a resize mid-rise re-aims the lantern at its (moved) star slot
            S.current.L.forEach((L, i) => {
                if (L.st === "rise" && L.slot >= 0) L.to = { x: g.slots[L.slot].x - g.homes[i].x, y: g.slots[L.slot].y - (g.homes[i].y + g.lh / 2) }
            })
            setGeo(g)
        }
        measure()
        let ro = null
        try {
            ro = new ResizeObserver(measure)
            ro.observe(el)
        } catch {}
        return () => {
            try {
                ro?.disconnect()
            } catch {}
        }
    }, [])

    // ---- the tag font, measured once the tags exist (the phrase fitter measures with it), and again when web fonts land
    eosLayoutEffect(() => {
        const w = geo && rootRef.current ? rootRef.current.querySelector(".eosLanTag .eosWord") : null
        if (!w) return
        const cs = getComputedStyle(w)
        const f = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        if (f !== fitFont) setFitFont(f)
    }, [geo, fitFont])
    React.useEffect(() => {
        try {
            document.fonts?.ready?.then(() => {
                if (S.current.alive && !S.current.touched) setFontsTick((n) => n + 1)
            })
        } catch {}
    }, [])

    // ---- DROP's face follows the story (a squash pop on every change)
    const face =
        ui.stage === "fly" || ui.stage === "done"
            ? EOS_LAN_FACE.hug
            : ui.stage === "ask" || ui.stage === "gather"
              ? EOS_LAN_FACE.ask
              : ui.st.includes("rise") || (ui.held >= 0 && ui.st[ui.held] === "lit")
                ? EOS_LAN_FACE.up
                : ui.warming
                  ? EOS_LAN_FACE.warm
                  : ui.risen >= 2
                    ? EOS_LAN_FACE.two
                    : ui.risen >= 1
                      ? EOS_LAN_FACE.one
                      : setup.start
    React.useEffect(() => {
        const s = S.current
        if (s.face === face) return
        s.face = face
        s.faces.push(face)
        const d = dropRef.current
        if (d) d.setAttribute("data-pop", fx.toggle("pop"))
    }, [face])

    // ---- render
    const g = geo
    const sky = setup.sky
    const fin = ui.stage !== "play"
    const after = ui.stage === "fly" || ui.stage === "done"
    const act = eosLanActiveFromUi(ui)
    const cueText = {
        start: "Hold a lantern to warm it",
        warm: "Warming up… keep holding",
        lit: "It's glowing — let it rise ↑",
        early: "Almost — hold a little longer",
        easy: "Hold gently — it lights faster now",
        line0: lines[0],
        line1: lines[1],
        line2: lines[2],
        gather: setup.past > 0 ? "Your lanterns joined every lantern you've lit here." : "Your lanterns found each other.",
        ask: strong ? "Reach out to someone?" : "Send a little warmth?",
        rising: "",
        blank: "",
        sending: "A little warmth, on its way 💛",
        sent: "Sent with love. 💛",
        ready: "Warmth, ready to send 💛",
        saved: "Saved for later — send it anytime. 💛",
        kept: "Kept close. This glow is yours.",
    }[ui.cue]
    const optA = strong ? "Text someone you trust" : "Text someone “thinking of you”"
    const optASub = strong ? `“${EOS_LAN_SHARE.safe}”` : "a little note, from you"
    const optB = "Keep it for me"
    const optBSub = "a warm glow, just for you"
    const pastN = Math.min(EOS_LAN.maxSky, setup.past)
    const lean = ui.held >= 0 ? (ui.held - 1) * 7 : 0

    return (
        <div
            ref={rootRef}
            className="arena eosArena eosG114 fs-mask"
            {...EOS_PRIVATE_ATTRS}
            data-stage={ui.stage}
            data-calm={red ? "1" : "0"}
            data-variant={setup.v}
            data-day={setup.day}
            data-safety={strong ? "1" : "0"}
            data-narrow={g && g.narrow ? "1" : "0"}
            data-compact={g && g.compact ? "1" : "0"}
            data-pulse={ui.pulse ? "1" : "0"}
            data-settle={ui.settle ? "1" : "0"}
            style={{ ...(g ? g.vars : {}), "--warm": fin ? 1 : ui.warm }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* ---------- back layer: the sky (heavy → warm), stars, moon, your past lanterns */}
            <div className="eosLanSky" aria-hidden="true">
                <i className="eosLanLayer eosLanSkyCool" style={{ background: `linear-gradient(180deg, ${sky.cool[0]} 0%, ${sky.cool[1]} 42%, ${sky.cool[2]} 76%, ${sky.cool[3]} 100%)` }} />
                <i className="eosLanLayer eosLanSkyWarm" style={{ background: `linear-gradient(180deg, ${sky.warm[0]} 0%, ${sky.warm[1]} 36%, ${sky.warm[2]} 72%, ${setup.horizon} 100%)` }} />
                <i className="eosLanLayer eosLanTint" style={{ background: EOS_LAN_TINT[setup.day] || "none" }} />
                <i className="eosLanLayer eosLanStarfield" />
                {/* the finale's amber dawn: one layer, opacity only */}
                <i className="eosLanLayer eosLanDawn" style={{ background: g ? `radial-gradient(85% 52% at 50% ${g.crest}px, rgba(255,198,128,.95), rgba(255,160,118,.5) 46%, rgba(255,140,120,0) 80%)` : "none" }} />
                {EOS_LAN_TWINKLE.map((t, k) => (
                    <i key={k} className="eosLanTwinkle" style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: `${t.d}s` }} />
                ))}
                <i className="eosLanMoon" style={{ left: `${sky.moon * 100}%`, top: g ? `${Math.max(14, g.boxT - 34)}px` : "12%" }} />
                {g && pastN > 0 ? (
                    <div className="eosLanPast" style={{ height: `${g.crest}px` }}>
                        {Array.from({ length: pastN }, (_, k) => (
                            <i
                                key={k}
                                className={`eosLanPastDot ${k % 30 === 0 ? "tw" : ""}`}
                                style={{ left: `${(3 + eosNoise(k, 11) * 94).toFixed(2)}%`, top: `${(6 + eosNoise(k, 23) * 80).toFixed(2)}%`, "--d": `${((k % 17) * 0.06).toFixed(2)}s`, "--o": (0.5 + eosNoise(k, 5) * 0.45).toFixed(2) }}
                            />
                        ))}
                    </div>
                ) : null}
                {/* every past lantern glows at the finale: ONE haze layer + the container's opacity (never per dot) */}
                {g && pastN > 0 ? <i className="eosLanLayer eosLanPastHaze" /> : null}
            </div>
            {g && setup.past > 0 ? (
                <div className="eosLanCount" style={{ top: `${g.boxT + 2}px` }}>
                    <i className="eosLanCountIcon" aria-hidden="true" />
                    {`${setup.past} lantern${setup.past === 1 ? "" : "s"} lit here`}
                </div>
            ) : null}

            {g ? (
                <>
                    <i className="eosLanHorizon" aria-hidden="true" style={{ top: `${g.crest - g.H * 0.23}px` }} />
                    {/* the heart constellation: risen lanterns become its stars; the golden lantern takes the cleft. One group,
                        one transform: it glides to the ask pose, then swells into the sky above the wrapper's finish card. */}
                    <div className="eosLanConst" aria-hidden="true">
                        <i className="eosLanRays" style={{ left: `${g.hcx}px`, top: `${g.hcy}px`, width: `${Math.round(g.heartK * 56)}px`, height: `${Math.round(g.heartK * 56)}px` }} />
                        <svg className="eosLanHeart" width={g.W} height={g.H} viewBox={`0 0 ${g.W} ${g.H}`}>
                            <path className="eosLanHeartDots" d={g.path} pathLength="1" />
                            <path className="eosLanHeartGlow" d={g.path} pathLength="1" />
                            <path className="eosLanHeartLine" d={g.path} pathLength="1" />
                            <path className="eosLanHeartPulse a" d={g.path} />
                            <path className="eosLanHeartPulse b" d={g.path} />
                        </svg>
                        {g.slots.map((p, k) => (
                            <i key={k} className="eosLanStar" data-on={ui.stars[k] ? "1" : "0"} style={{ left: `${p.x}px`, top: `${p.y}px` }} />
                        ))}
                        <i className="eosLanStar gold" data-on={ui.stage === "done" ? "1" : "0"} style={{ left: `${g.cleft.x}px`, top: `${g.cleft.y}px` }} />
                        <div className="eosLanEmbers">
                            {EOS_LAN_EMBERS.map((e, k) => {
                                const src = e.src < 3 ? g.slots[e.src] : g.cleft
                                return <i key={k} style={{ left: `${src.x + e.dx}px`, top: `${src.y}px`, animationDelay: `${e.d}s`, "--s": e.s, "--fall": `${e.fall}px`, "--dx": `${Math.round(e.dx * 0.8)}px` }} />
                            })}
                        </div>
                    </div>

                    {/* ---------- middle layer: the hills and DROP on the crest (key light from the lanterns, cool moon rim) */}
                    <svg className="eosLanHills" aria-hidden="true" width={g.W} height={g.H} viewBox={`0 0 ${g.W} ${g.H}`} preserveAspectRatio="none">
                        {(() => {
                            const W = g.W
                            const c = g.crest
                            const r = setup.ridge
                            const far = `M0,${g.H} L0,${c + r[0]} C${W * 0.16},${c + r[1]} ${W * 0.32},${c + r[2]} ${W * 0.5},${c + r[3]} S${W * 0.84},${c + r[4]} ${W},${c + r[5]} L${W},${g.H} Z`
                            const cx = g.dropX
                            const near = `M0,${g.H} L0,${c + 64} Q${cx * 0.52},${c + 8} ${cx},${c} Q${cx + (W - cx) * 0.48},${c + 8} ${W},${c + (g.side ? 90 : 56)} L${W},${g.H} Z`
                            return (
                                <>
                                    <path d={far} fill={sky.far[0]} />
                                    <path d={far} fill={sky.far[1]} className="eosLanWarmFill" />
                                    <path d={near} fill={sky.near[0]} />
                                    <path d={near} fill={sky.near[1]} className="eosLanWarmFill" />
                                    <path d={near} className="eosLanCrestRim" />
                                </>
                            )
                        })()}
                    </svg>
                    <div className="eosLanHillGlow" aria-hidden="true" style={{ top: `${g.crest}px` }} />
                    {EOS_LAN_MOTES.map((m) => (
                        <i key={m.k} className="eosLanMote" aria-hidden="true" style={{ left: `${m.x}%`, top: `${Math.round(g.crest + ((g.H - g.crest) * (m.y - 40)) / 60)}px`, animationDuration: `${m.d}s`, animationDelay: `${-m.k * 0.7}s` }} />
                    ))}
                    <div
                        ref={dropRef}
                        className="eosLanDrop"
                        aria-hidden="true"
                        style={{ left: `${g.dropX - g.dropS / 2}px`, top: `${g.dropY}px`, width: `${g.dropS}px`, height: `${g.dropS}px`, "--lean": `${g.side ? lean * 0.5 + (ui.held >= 0 ? 6 : 0) : lean}deg` }}
                    >
                        <div className="eosLanDropLean">
                            <i className="eosLanKey" />
                            <EosCharacterOrb char="drop" mood={face} size={g.dropS} bob={!red} reduced={red} />
                            <i className="eosLanRim" />
                            <i className="eosLanBeat" />
                            <i className="eosLanHug" />
                        </div>
                    </div>

                    {/* the golden 4th lantern: handed to DROP, then up into the heart */}
                    <div
                        className="eosLanGold"
                        aria-hidden="true"
                        style={{
                            left: `${g.gold.x - g.gold.w / 2}px`,
                            top: `${g.gold.y - g.gold.h / 2}px`,
                            width: `${g.gold.w}px`,
                            height: `${g.gold.h}px`,
                            "--fx": `${g.gold.fx}px`,
                            "--fy": `${g.gold.fy}px`,
                        }}
                    >
                        <span className="eosLanBody">
                            <i className="eosLanHalo" />
                            <i className="eosLanPaper" />
                            <i className="eosLanLit" />
                            <i className="eosLanRibs" />
                            <i className="eosLanFlame" />
                            <i className="eosLanCap" />
                            <i className="eosLanBase" />
                        </span>
                    </div>

                    {/* ---------- front layer: the three lanterns (+ their pools of light on the grass) */}
                    {g.homes.map((h, i) => (
                        <i key={`p${i}`} ref={poolRefs[i]} className="eosLanPool" aria-hidden="true" style={{ left: `${h.x}px`, top: `${h.y + g.lh}px` }} />
                    ))}
                    {g.homes.map((h, i) => {
                        const st = ui.st[i]
                        const held = ui.held === i
                        const marked = ui.stage === "play" && (held || (ui.held === -1 && !ui.grace && i === act))
                        const holdMs = ui.easy ? EOS_LAN.easyMs : EOS_LAN.holdMs
                        const oy = +((g.lh * 0.46 - g.unitH / 2) / g.unitH).toFixed(3) // the guide points at the paper, never the word
                        const target = !marked
                            ? {}
                            : held && st === "lit"
                              ? eosTarget({ g: "drag", dir: "u", d: 140, label: EOS_LAN_LABEL.rise, oy })
                              : eosTarget({ g: "hold", ms: holdMs, label: EOS_LAN_LABEL.hold, oy })
                        const gone = st === "rise" || st === "star"
                        return (
                            <button
                                key={i}
                                ref={lanRefs[i]}
                                type="button"
                                className="eosLanLantern"
                                data-lan={i}
                                data-st={st}
                                data-held={held ? "1" : "0"}
                                tabIndex={gone || fin ? -1 : 0}
                                disabled={st === "star" || fin}
                                aria-label={`Paper lantern ${i + 1} of 3. Press and hold to light it, then let go or press the up arrow to let it rise.`}
                                style={{ left: `${h.x - g.unitW / 2}px`, top: `${h.y}px`, "--tilt": `${setup.tilt[i]}deg`, "--bob": `${(3.4 + i * 0.45).toFixed(2)}s` }}
                                onKeyDown={(e) => keyDown(i, e)}
                                onKeyUp={(e) => keyUp(i, e)}
                                {...target}
                            >
                                <span ref={flyRefs[i]} className="eosLanFly">
                                    <span className="eosLanBody">
                                        <i className="eosLanHalo" />
                                        <i className="eosLanPaper" />
                                        <i className="eosLanLit" />
                                        <i className="eosLanRibs" />
                                        {thumbs[i] ? <img className="eosLanThumb" src={thumbs[i]} alt="" draggable={false} /> : null}
                                        <i className="eosLanFlame" />
                                        <i className="eosLanCap" />
                                        <i className="eosLanBase" />
                                    </span>
                                    <i className="eosLanString" aria-hidden="true" />
                                    <span className="eosLanTag">
                                        <EosWord text={words[i]} />
                                    </span>
                                </span>
                            </button>
                        )
                    })}

                    {/* one line at a time: the instruction, then the true line under the rising lantern */}
                    <div
                        className="eosLanCue"
                        aria-live="polite"
                        data-cv={ui.cv}
                        style={after ? { top: `${g.lineY}px`, height: `${g.lineH}px`, "--rise": `${g.lineRise}px` } : fin ? { top: `${g.qY}px`, height: `${g.qH}px` } : { top: `${g.cueY}px`, height: `${g.cueH}px` }}
                        data-kind={/^line/.test(ui.cue) ? "line" : ui.cue}
                    >
                        <span>{cueText}</span>
                    </div>

                    {/* the finale: two equal choices, both finish the game */}
                    <div className="eosLanAsk" data-on={ui.stage === "ask" ? "1" : "0"} style={{ top: `${g.opt.y}px`, height: `${g.opt.h}px`, gap: `${g.opt.gap}px` }}>
                        {[
                            { kind: "send", main: optA, sub: optASub, ico: "💌" },
                            { kind: "keep", main: optB, sub: optBSub, ico: "🏮" },
                        ].map((o, k) => (
                            <button
                                key={o.kind}
                                ref={optRefs[k]}
                                type="button"
                                className={`eosLanOpt ${o.kind}`}
                                data-chosen={ui.choice === o.kind ? "1" : "0"}
                                disabled={ui.stage !== "ask"}
                                tabIndex={ui.stage === "ask" ? 0 : -1}
                                aria-label={o.kind === "send" ? `${o.main}. Opens your share options with the message: ${strong ? EOS_LAN_SHARE.safe : EOS_LAN_SHARE.normal}` : `${o.main}. Keeps the golden lantern for you.`}
                                style={{ width: `${g.opt.w}px`, height: `${g.opt.h}px` }}
                                onClick={() => choose(o.kind)}
                                {...(ui.stage === "ask" ? eosTarget({ g: "choose", label: EOS_LAN_LABEL.choose, ox: 0.36, oy: -0.34 }) /* the demo hand taps the card's top corner, never its copy */ : {})}
                            >
                                <span className="eosLanOptIco" aria-hidden="true">{o.ico}</span>
                                <span className="eosLanOptMain">{o.main}</span>
                                <span className="eosLanOptSub">{o.sub}</span>
                            </button>
                        ))}
                    </div>
                    <div className="eosLanToast" aria-live="polite" data-on={ui.toast ? "1" : "0"} style={{ top: `${g.toastY}px`, "--rise": `${g.lineRise}px` }}>
                        {ui.toast || ""}
                    </div>

                    {ui.burst ? (
                        red ? (
                            <i key={`sb${ui.burst.k}`} className="eosLanSoftBurst" aria-hidden="true" style={{ left: `${ui.burst.x}%`, top: `${ui.burst.y}%` }} />
                        ) : (
                            // this game's own light burst: a released lantern (ring + 6 sparks) or the golden choice (ring + 9
                            // sparks + bloom). 7-11 nodes — the arcade PremiumBurst is 25-35 and broke the 60-node budget.
                            <span key={`sp${ui.burst.k}`} className={`eosLanSpark ${ui.burst.big ? "big" : ""}`} aria-hidden="true" style={{ left: `${ui.burst.x}%`, top: `${ui.burst.y}%` }}>
                                {(ui.burst.big ? [0, 40, 80, 120, 160, 200, 240, 280, 320] : [0, 60, 120, 180, 240, 300]).map((a) => (
                                    <i key={a} style={{ "--a": `${a + ui.burst.k * 17}deg` }} />
                                ))}
                                {ui.burst.big ? <b /> : null}
                            </span>
                        )
                    ) : null}
                </>
            ) : null}
        </div>
    )
}
// The arrow's lantern (render-time mirror of activeIdx, from React state).
function eosLanActiveFromUi(ui) {
    for (let i = 0; i < 3; i++) if (ui.st[i] === "idle" || ui.st[i] === "warm") return i
    return -1
}

// ---------------------------------------------------------------- CSS
const EOS_LAN_R = `${EOS_A} .eosG114`
const EOS_LANTERNS_CSS = `
${EOS_LAN_R}{background:#121634;filter:none!important;color:#fff;--warm:0;--heat:0;cursor:default}
${EOS_LAN_R} :is(.eosLanSky,.eosLanSky>i,.eosLanPast,.eosLanHeart,.eosLanHills,.eosLanHillGlow,.eosLanEmbers){position:absolute;pointer-events:none}
${EOS_LAN_R} .eosLanSky{inset:0;overflow:hidden;contain:strict}
${EOS_LAN_R} .eosLanSky>.eosLanLayer{inset:0}
${EOS_LAN_R} .eosLanSkyWarm{opacity:var(--warm);transition:opacity 1.6s ease}
${EOS_LAN_R} .eosLanStarfield{background:
  radial-gradient(1.4px 1.4px at 12% 18%,#fff 60%,transparent 62%),radial-gradient(1.2px 1.2px at 27% 9%,#fff 60%,transparent 62%),
  radial-gradient(1.6px 1.6px at 41% 26%,#fff6dc 60%,transparent 62%),radial-gradient(1.1px 1.1px at 58% 12%,#fff 60%,transparent 62%),
  radial-gradient(1.5px 1.5px at 73% 31%,#fff 60%,transparent 62%),radial-gradient(1.2px 1.2px at 88% 15%,#e6efff 60%,transparent 62%),
  radial-gradient(1px 1px at 6% 40%,#fff 60%,transparent 62%),radial-gradient(1.3px 1.3px at 95% 44%,#fff 60%,transparent 62%);
  background-size:320px 260px;opacity:calc(.85 - var(--warm)*.45);transition:opacity 1.6s ease}
${EOS_LAN_R}[data-day="night"] .eosLanStarfield{opacity:calc(1 - var(--warm)*.4)}
${EOS_LAN_R} .eosLanTwinkle{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 6px 1px rgba(255,255,255,.8);animation:eosLanTwinkle 3.2s ease-in-out infinite}
${EOS_LAN_R} .eosLanMoon{position:absolute;width:44px;height:44px;margin-left:-22px;border-radius:50%;box-shadow:11px 7px 0 0 #fff0cf;filter:drop-shadow(0 0 14px rgba(255,236,190,.55));transform:rotate(-18deg);opacity:.95}
/* past lanterns: static dots (≤ 8 flicker); the finale brightens the whole sky as ONE layer (container opacity + one haze) */
${EOS_LAN_R} .eosLanPast{left:0;right:0;top:0;opacity:.64;transition:opacity 1.2s ease;will-change:opacity}
${EOS_LAN_R} .eosLanPastDot{position:absolute;width:7px;height:9px;margin:-4px 0 0 -3px;border-radius:44% 44% 30% 30%;background:radial-gradient(ellipse at 50% 70%,#fff3cf,#ffb25a 55%,#e0662f);box-shadow:0 0 7px 2px rgba(255,170,80,.55);opacity:var(--o)}
${EOS_LAN_R} .eosLanPastDot.tw{animation:eosLanFlicker 2.6s ease-in-out infinite;animation-delay:var(--d)}
${EOS_LAN_R}:not([data-stage="play"]) .eosLanPast{opacity:1}
${EOS_LAN_R} .eosLanPastHaze{opacity:0;background:radial-gradient(95% 62% at 50% 34%,rgba(255,196,120,.34),rgba(255,170,100,.13) 55%,rgba(255,160,100,0) 82%);transition:opacity 1.4s ease}
${EOS_LAN_R}:not([data-stage="play"]) .eosLanPastHaze{opacity:1}
${EOS_LAN_R} .eosLanDawn{opacity:0;transition:opacity 2.2s ease}
${EOS_LAN_R}[data-stage="fly"] .eosLanDawn{opacity:.5}
${EOS_LAN_R}[data-stage="done"] .eosLanDawn{opacity:1}
${EOS_LAN_R} .eosLanCount{position:absolute;left:50%;transform:translateX(-50%);z-index:8;display:inline-flex;align-items:center;gap:8px;padding:4px 14px 4px 10px;border-radius:999px;background:rgba(14,12,38,.62);border:1px solid rgba(255,214,150,.45);font:800 15px/1.25 var(--eos-font);letter-spacing:.02em;color:#ffe7bf;text-shadow:0 1px 4px rgba(0,0,0,.6);white-space:nowrap;pointer-events:none}
${EOS_LAN_R} .eosLanCountIcon{width:10px;height:13px;border-radius:44% 44% 30% 30%;background:radial-gradient(ellipse at 50% 70%,#fff3cf,#ffb25a 55%,#e0662f);box-shadow:0 0 8px 2px rgba(255,170,80,.6)}
${EOS_LAN_R} .eosLanConst{position:absolute;inset:0;z-index:2;pointer-events:none;transform-origin:var(--hcx) var(--hcy);transition:transform 1s cubic-bezier(.3,1.1,.4,1)}
${EOS_LAN_R}:is([data-stage="gather"],[data-stage="ask"]) .eosLanConst{transform:translate3d(var(--cax),var(--cay),0) scale(var(--cas))}
${EOS_LAN_R}:is([data-stage="fly"],[data-stage="done"]) .eosLanConst{transform:translate3d(var(--cfx),var(--cfy),0) scale(var(--cfs));transition:transform 1.4s cubic-bezier(.3,1.1,.4,1)}
${EOS_LAN_R} .eosLanRays{position:absolute;translate:-50% -50%;border-radius:50%;pointer-events:none;opacity:0;background:repeating-conic-gradient(from 0deg,rgba(255,220,150,0) 0deg 9deg,rgba(255,214,140,.4) 12deg 15deg,rgba(255,220,150,0) 18deg 30deg);-webkit-mask:radial-gradient(closest-side,#000 16%,rgba(0,0,0,.55) 48%,transparent 100%);mask:radial-gradient(closest-side,#000 16%,rgba(0,0,0,.55) 48%,transparent 100%);transition:opacity 1.2s ease}
${EOS_LAN_R}[data-stage="done"] .eosLanRays{opacity:.95;animation:eosLanSpin 48s linear infinite}
${EOS_LAN_R} .eosLanHeart{left:0;top:0;z-index:2;overflow:visible}
${EOS_LAN_R} .eosLanHeart path{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1}
${EOS_LAN_R} .eosLanHeartLine{stroke:#fff3d6;stroke-width:2.2;opacity:.95}
${EOS_LAN_R} .eosLanHeartGlow{stroke:rgba(255,190,110,.28);stroke-width:12}
${EOS_LAN_R} .eosLanHeart path.eosLanHeartDots{stroke:#ffe9c4;stroke-width:2.4;stroke-dasharray:.004 .021;stroke-dashoffset:0;opacity:0;transition:opacity 1s ease}
${EOS_LAN_R}:not([data-stage="play"]) .eosLanHeart path.eosLanHeartDots{opacity:.55}
${EOS_LAN_R}[data-stage="done"] .eosLanHeart path.eosLanHeartDots{opacity:.2}
${EOS_LAN_R}[data-stage="done"] .eosLanHeart path:not(.eosLanHeartDots){stroke-dashoffset:0;transition:stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)}
${EOS_LAN_R}[data-stage="done"] .eosLanHeartGlow{animation:eosLanHeartGlow 2.4s ease-in-out .9s infinite}
${EOS_LAN_R} .eosLanHeart path.eosLanHeartPulse{stroke:#ffd69a;stroke-width:3;stroke-dasharray:none;stroke-dashoffset:0;opacity:0;transform-box:fill-box;transform-origin:center}
${EOS_LAN_R}[data-pulse="1"] .eosLanHeart path.eosLanHeartPulse.a{animation:eosLanPulse 1.1s ease-out both}
${EOS_LAN_R}[data-pulse="1"] .eosLanHeart path.eosLanHeartPulse.b{animation:eosLanPulse 1.1s ease-out .34s both}
${EOS_LAN_R} .eosLanStar{position:absolute;z-index:3;width:30px;height:30px;margin:-15px 0 0 -15px;pointer-events:none;opacity:0;transform:scale(.2);transition:opacity .5s ease,transform .6s cubic-bezier(.3,1.6,.4,1)}
${EOS_LAN_R} .eosLanStar::before{content:"";position:absolute;inset:0;background:conic-gradient(from 45deg,transparent 0 10%,#fff 12%,transparent 14% 35%,#fff 37%,transparent 39% 60%,#fff 62%,transparent 64% 85%,#fff 87%,transparent 89%);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}
${EOS_LAN_R} .eosLanStar::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#fffbe9;box-shadow:0 0 10px 4px rgba(255,226,160,.9),0 0 26px 8px rgba(255,170,90,.45)}
${EOS_LAN_R} .eosLanStar[data-on="1"]{opacity:1;transform:scale(1);animation:eosLanStarTw 2.8s ease-in-out .6s infinite}
${EOS_LAN_R} .eosLanStar.gold{width:40px;height:40px;margin:-20px 0 0 -20px}
${EOS_LAN_R} .eosLanStar.gold::after{width:14px;height:14px;margin:-7px 0 0 -7px;background:#fff6c8;box-shadow:0 0 16px 6px rgba(255,214,120,.95),0 0 40px 14px rgba(255,170,70,.55)}
${EOS_LAN_R} .eosLanHills{left:0;top:0;z-index:4;width:100%;height:100%}
${EOS_LAN_R} .eosLanWarmFill{opacity:var(--warm);transition:opacity 1.6s ease}
${EOS_LAN_R} .eosLanCrestRim{fill:none;stroke:rgba(190,205,255,calc(.32 + var(--warm)*.3));stroke-width:2;transition:stroke 1.6s ease}
${EOS_LAN_R} .eosLanHorizon{position:absolute;left:-10%;right:-10%;height:46%;border-radius:50%;pointer-events:none;z-index:1;background:radial-gradient(50% 50% at 50% 50%,rgba(255,168,140,.46),rgba(255,140,120,0) 70%);opacity:calc(.35 + var(--warm)*.65);transition:opacity 1.6s ease}
${EOS_LAN_R} .eosLanHillGlow{left:0;right:0;height:120px;margin-top:-60px;z-index:4;background:radial-gradient(60% 50% at 50% 50%,rgba(255,190,120,.34),transparent 70%);opacity:calc(.25 + var(--warm)*.75);transition:opacity 1.6s ease}
${EOS_LAN_R} .eosLanMote{position:absolute;z-index:5;will-change:transform;width:4px;height:4px;border-radius:50%;background:#ffe9a8;box-shadow:0 0 8px 2px rgba(255,214,120,.75);pointer-events:none;animation:eosLanMote 6s ease-in-out infinite alternate;opacity:.75}
/* DROP on the crest: key light from the lanterns (warm, below-front), rim from the moon (cool, upper edge) */
${EOS_LAN_R} .eosLanDrop{position:absolute;z-index:6;pointer-events:none;transition:transform 1s cubic-bezier(.3,1.15,.4,1)}
${EOS_LAN_R}:is([data-stage="gather"],[data-stage="ask"]) .eosLanDrop{transform:translate3d(var(--dax),var(--day),0) scale(var(--das))}
${EOS_LAN_R}:is([data-stage="fly"],[data-stage="done"]) .eosLanDrop{transform:translate3d(var(--dfx),var(--dfy),0) scale(var(--dfs));transition:transform 1.4s cubic-bezier(.3,1.1,.4,1)}
${EOS_LAN_R} .eosLanDropLean{position:absolute;inset:0;transform:rotate(var(--lean,0deg));transform-origin:50% 92%;transition:transform .45s cubic-bezier(.3,1.4,.5,1)}
${EOS_LAN_R} .eosLanDrop .eosOrb{position:absolute;left:0;top:0}
${EOS_LAN_R} .eosLanDrop[data-pop="a"] .eosOrb{animation:eosLanPopA .55s cubic-bezier(.3,1.6,.4,1)}
${EOS_LAN_R} .eosLanDrop[data-pop="b"] .eosOrb{animation:eosLanPopB .55s cubic-bezier(.3,1.6,.4,1)}
${EOS_LAN_R} .eosLanKey{position:absolute;left:-30%;right:-30%;top:-10%;bottom:-40%;border-radius:50%;background:radial-gradient(50% 50% at 50% 78%,rgba(255,180,90,calc(.22 + var(--warm)*.3)),transparent 70%);pointer-events:none}
${EOS_LAN_R} .eosLanRim{position:absolute;inset:0;border-radius:50%;box-shadow:inset -3px 4px 0 -1px rgba(185,215,255,.55),inset 0 -6px 14px rgba(255,170,90,calc(.15 + var(--warm)*.35));pointer-events:none;z-index:2}
${EOS_LAN_R} .eosLanBeat{position:absolute;left:50%;top:62%;width:40%;height:40%;margin:-20% 0 0 -20%;border-radius:50%;border:2px solid rgba(255,150,170,.0);pointer-events:none;z-index:3}
${EOS_LAN_R}[data-beat="a"] .eosLanBeat{animation:eosLanBeatA .75s ease-out}
${EOS_LAN_R}[data-beat="b"] .eosLanBeat{animation:eosLanBeatB .75s ease-out}
${EOS_LAN_R}[data-beat="a"] .eosLanLantern[data-held="1"] .eosLanHalo{animation:eosLanThrobA .75s ease-out}
${EOS_LAN_R}[data-beat="b"] .eosLanLantern[data-held="1"] .eosLanHalo{animation:eosLanThrobB .75s ease-out}
${EOS_LAN_R} .eosLanHug{position:absolute;left:84%;top:-2%;width:26%;height:26%;margin-left:-13%;opacity:0;transform:scale(.3) rotate(-45deg);z-index:4;pointer-events:none;background:linear-gradient(135deg,#ff8fb8,#ff4f86);border-radius:3px;box-shadow:0 0 18px rgba(255,110,160,.8)}
${EOS_LAN_R} .eosLanHug::before,${EOS_LAN_R} .eosLanHug::after{content:"";position:absolute;width:100%;height:100%;border-radius:50%;background:inherit}
${EOS_LAN_R} .eosLanHug::before{left:-50%;top:0}
${EOS_LAN_R} .eosLanHug::after{left:0;top:-50%}
${EOS_LAN_R}:is([data-stage="fly"],[data-stage="done"]) .eosLanHug{animation:eosLanHug 2.2s cubic-bezier(.3,1.5,.4,1) 1.1s both}
/* lanterns: paper body + ribs + flame; the glow fills up from the fingers (--heat) */
${EOS_LAN_R} .eosLanLantern{position:absolute;z-index:7;display:block;width:var(--uw);height:var(--uh);padding:0;touch-action:none;-webkit-touch-callout:none;cursor:pointer;transform:none!important;filter:none!important}
${EOS_LAN_R} .eosLanFly{position:absolute;inset:0;display:block;will-change:transform;transform-origin:50% calc(var(--lh) / 2)}
${EOS_LAN_R} .eosLanLantern[data-st="idle"]:hover .eosLanPaper{filter:brightness(1.12)}
${EOS_LAN_R} .eosLanLantern:focus-visible .eosLanTag{outline:3px solid var(--eos-gold-1,#ffd36b);outline-offset:2px}
${EOS_LAN_R} .eosLanLantern:disabled{cursor:default}
${EOS_LAN_R} .eosLanLantern[data-st="star"]{visibility:hidden}
${EOS_LAN_R} :is(.eosLanLantern,.eosLanGold) .eosLanBody{position:absolute;left:50%;top:0;width:var(--lw);height:var(--lh);margin-left:calc(var(--lw) / -2);transform:rotate(var(--tilt,0deg))}
${EOS_LAN_R} .eosLanGold .eosLanBody{--lw:100%;--lh:100%;left:0;margin-left:0;width:100%;height:100%;--heat:1}
${EOS_LAN_R} .eosLanLantern:is([data-st="idle"],[data-st="warm"]) .eosLanBody{animation:eosLanHover var(--bob,3.6s) ease-in-out infinite}
${EOS_LAN_R} .eosLanLantern[data-st="lit"] .eosLanBody{animation:eosLanTug .9s ease-in-out infinite}
${EOS_LAN_R} .eosLanLantern[data-sq="a"] .eosLanPaper,${EOS_LAN_R} .eosLanLantern[data-sq="a"] .eosLanLit{animation:eosLanSqA .32s cubic-bezier(.3,1.6,.4,1)}
${EOS_LAN_R} .eosLanLantern[data-sq="b"] .eosLanPaper,${EOS_LAN_R} .eosLanLantern[data-sq="b"] .eosLanLit{animation:eosLanSqB .32s cubic-bezier(.3,1.6,.4,1)}
${EOS_LAN_R} :is(.eosLanPaper,.eosLanLit,.eosLanRibs){position:absolute;inset:7% 0 6% 0;border-radius:40% 40% 24% 24% / 30% 30% 16% 16%;transform-origin:50% 100%}
${EOS_LAN_R} .eosLanPaper{background:linear-gradient(90deg,rgba(0,0,0,.28),rgba(0,0,0,0) 32%,rgba(255,255,255,.08) 50%,rgba(0,0,0,0) 68%,rgba(0,0,0,.3)),linear-gradient(180deg,#a59bb8,#7c7395 70%,#6a6283);box-shadow:inset 0 -6px 12px rgba(30,20,50,.35),0 8px 18px rgba(0,0,0,.35)}
${EOS_LAN_R} .eosLanLit{background:radial-gradient(70% 62% at 50% 76%,#fffbe6 0%,#ffe08a 24%,#ffab48 56%,#e5622b 92%);opacity:calc(.25 + var(--heat)*.75);-webkit-mask-image:linear-gradient(0deg,#000 calc(var(--heat) * 100%),transparent calc(var(--heat) * 100% + 18%));mask-image:linear-gradient(0deg,#000 calc(var(--heat) * 100%),transparent calc(var(--heat) * 100% + 18%))}
${EOS_LAN_R} .eosLanLantern:is([data-st="lit"],[data-st="rise"]) .eosLanLit,${EOS_LAN_R} .eosLanGold .eosLanLit{-webkit-mask-image:none;mask-image:none;opacity:1}
${EOS_LAN_R} .eosLanRibs{background:repeating-linear-gradient(90deg,transparent 0 17%,rgba(120,60,30,.28) 17% 19%),linear-gradient(180deg,rgba(255,255,255,.18),transparent 22%)}
${EOS_LAN_R} .eosLanFlame{position:absolute;left:50%;bottom:9%;width:24%;height:20%;margin-left:-12%;border-radius:50% 50% 45% 45% / 62% 62% 38% 38%;background:radial-gradient(50% 60% at 50% 70%,#fff 0%,#fff2a8 35%,#ffb347 70%,rgba(255,120,40,0) 100%);opacity:calc(.18 + var(--heat)*.82);transform-origin:50% 100%;animation:eosLanFlame 1.1s ease-in-out infinite alternate}
${EOS_LAN_R} .eosLanCap{position:absolute;left:22%;right:22%;top:3%;height:7%;border-radius:6px 6px 3px 3px;background:linear-gradient(180deg,#7a5238,#4a2f22);box-shadow:0 2px 3px rgba(0,0,0,.35)}
${EOS_LAN_R} .eosLanBase{position:absolute;left:24%;right:24%;bottom:3%;height:6%;border-radius:3px 3px 8px 8px;background:linear-gradient(180deg,#8a5a3a,#5a3624)}
${EOS_LAN_R} .eosLanHalo{position:absolute;inset:-48% -62%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,196,110,.62),rgba(255,150,70,.22) 52%,rgba(255,140,60,0) 100%);opacity:var(--heat);pointer-events:none}
${EOS_LAN_R} .eosLanThumb{position:absolute;left:50%;top:30%;width:46%;aspect-ratio:1;margin-left:-23%;border-radius:50%;object-fit:cover;border:2px solid rgba(255,236,200,.85);opacity:.92;pointer-events:none}
${EOS_LAN_R} .eosLanString{position:absolute;left:50%;top:var(--lh);width:2px;height:12px;margin-left:-1px;background:linear-gradient(180deg,rgba(255,230,190,.8),rgba(255,230,190,.35))}
${EOS_LAN_R} .eosLanTag{position:absolute;left:0;right:0;margin:0 auto;top:calc(var(--lh) + 10px);max-width:var(--tw);width:fit-content;box-sizing:border-box;padding:4px 11px 5px;border-radius:12px;background:rgba(16,12,38,.8);border:1.5px solid rgba(255,214,150,calc(.28 + var(--heat)*.62));box-shadow:0 6px 14px rgba(0,0,0,.35),0 0 calc(var(--heat) * 16px) rgba(255,180,90,.55);text-align:center;opacity:var(--tag,1);pointer-events:none}
${EOS_LAN_R}[data-narrow="1"] .eosLanTag{padding:4px 8px 5px}
${EOS_LAN_R}[data-compact="1"] .eosLanTag .eosWord{max-height:1.15em!important}
${EOS_LAN_R} .eosLanTag .eosWord{display:block;max-width:none!important;width:auto!important;max-height:2.32em;overflow:hidden;line-height:1.1!important;overflow-wrap:break-word!important;word-break:normal!important}
${EOS_LAN_R} .eosLanPool{position:absolute;z-index:6;width:calc(var(--lw) * 2.2);height:28px;margin:-14px 0 0 calc(var(--lw) * -1.1);border-radius:50%;background:radial-gradient(closest-side,rgba(255,190,110,.55),rgba(255,150,70,0));opacity:var(--heat,0);pointer-events:none}
/* the golden lantern */
${EOS_LAN_R} .eosLanGold{position:absolute;z-index:7;pointer-events:none;opacity:0;transform:translate3d(0,-180px,0) scale(.6);transition:transform 1.2s cubic-bezier(.3,1.2,.4,1),opacity .8s ease}
${EOS_LAN_R} .eosLanGold .eosLanLit{background:radial-gradient(70% 62% at 50% 72%,#fffef0 0%,#fff0a8 28%,#ffcf4a 62%,#f09a22 95%)}
${EOS_LAN_R} .eosLanGold .eosLanHalo{opacity:1;background:radial-gradient(closest-side,rgba(255,226,130,.75),rgba(255,190,80,.25) 55%,rgba(255,170,60,0))}
${EOS_LAN_R}:is([data-stage="gather"],[data-stage="ask"]) .eosLanGold{opacity:1;transform:translate3d(0,0,0) scale(1)}
${EOS_LAN_R}:is([data-stage="fly"],[data-stage="done"]) .eosLanGold{opacity:1;transform:translate3d(var(--fx),var(--fy),0) scale(.5);transition:transform 1.5s cubic-bezier(.45,0,.3,1),opacity .6s ease}
${EOS_LAN_R}[data-stage="done"] .eosLanGold{opacity:0;transition:transform 1.5s cubic-bezier(.45,0,.3,1),opacity .5s ease .1s}
${EOS_LAN_R}[data-stage="ask"] .eosLanGold .eosLanBody{animation:eosLanHover 2.8s ease-in-out infinite}
/* one line at a time */
${EOS_LAN_R} .eosLanCue{position:absolute;left:12px;right:12px;z-index:8;display:flex;align-items:center;justify-content:center;text-align:center;pointer-events:none}
${EOS_LAN_R} .eosLanCue span{max-width:640px;font:800 clamp(16px,1.6vw,20px)/1.18 var(--eos-font);color:#fff4e2;letter-spacing:.01em;text-shadow:0 2px 10px rgba(0,0,0,.65),0 0 18px rgba(30,20,60,.6)}
${EOS_LAN_R} .eosLanCue[data-cv="a"] span{animation:eosLanCueInA .5s ease both}
${EOS_LAN_R} .eosLanCue[data-cv="b"] span{animation:eosLanCueInB .5s ease both}
${EOS_LAN_R}:is([data-stage="fly"],[data-stage="done"]) .eosLanCue{transition:translate .6s cubic-bezier(.3,1.1,.4,1)}
${EOS_LAN_R}:is([data-stage="fly"],[data-stage="done"]):not([data-settle="1"]) :is(.eosLanCue,.eosLanToast){translate:0 var(--rise,0px)}
${EOS_LAN_R} .eosLanToast{transition:opacity .35s ease,transform .45s cubic-bezier(.3,1.4,.4,1),translate .6s cubic-bezier(.3,1.1,.4,1)!important}
${EOS_LAN_R} .eosLanCue[data-kind="line"] span{font-weight:700;font-style:italic;color:#ffe6c4}
${EOS_LAN_R} .eosLanAsk{position:absolute;left:0;right:0;z-index:9;display:flex;justify-content:center;align-items:stretch;pointer-events:none;opacity:0;visibility:hidden;transform:translateY(-14px);transition:opacity .5s ease,transform .6s cubic-bezier(.3,1.3,.4,1),visibility 0s linear .6s}
${EOS_LAN_R} .eosLanAsk[data-on="1"]{opacity:1;visibility:visible;transform:none;pointer-events:auto;transition:opacity .5s ease,transform .6s cubic-bezier(.3,1.3,.4,1),visibility 0s}
${EOS_LAN_R}:is([data-stage="fly"],[data-stage="done"]) .eosLanAsk{opacity:0;transform:translateY(-8px);transition:opacity .45s ease,transform .45s ease,visibility 0s linear .5s}
${EOS_LAN_R} .eosLanAsk .eosLanOpt{position:relative;flex:0 0 auto;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:10px 12px!important;border-radius:22px!important;background:linear-gradient(180deg,rgba(74,52,92,.92),rgba(44,30,66,.92))!important;border:2px solid rgba(255,214,150,.8)!important;box-shadow:0 10px 26px rgba(0,0,0,.4),0 0 26px rgba(255,170,80,.28),inset 0 1px 0 rgba(255,255,255,.25)!important;color:#fff!important;text-align:center;cursor:pointer;transform:none!important;filter:none!important}
${EOS_LAN_R} .eosLanAsk .eosLanOpt:hover{border-color:#ffe3a8!important;box-shadow:0 10px 26px rgba(0,0,0,.4),0 0 34px rgba(255,190,90,.5),inset 0 1px 0 rgba(255,255,255,.3)!important}
${EOS_LAN_R} .eosLanAsk .eosLanOpt:active{transform:scale(1.05,.92)!important}
${EOS_LAN_R} .eosLanAsk .eosLanOpt:focus-visible{outline:3px solid var(--eos-gold-1,#ffd36b)!important;outline-offset:3px}
${EOS_LAN_R} .eosLanOptIco{font-size:22px;line-height:1}
${EOS_LAN_R} .eosLanOptMain{font:900 16px/1.12 var(--eos-font);color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5)}
${EOS_LAN_R} .eosLanOptSub{font:700 14px/1.15 var(--eos-font);color:#ffe2bd}
${EOS_LAN_R} .eosLanToast{position:absolute;left:50%;z-index:10;max-width:calc(100% - 32px);transform:translate(-50%,8px);padding:10px 18px;border-radius:16px;background:rgba(18,14,42,.88);border:1.5px solid rgba(255,214,150,.75);font:800 15px/1.25 var(--eos-font);color:#fff3dc;text-align:center;opacity:0;pointer-events:none;transition:opacity .35s ease,transform .45s cubic-bezier(.3,1.4,.4,1)}
${EOS_LAN_R} .eosLanToast[data-on="1"]{opacity:1;transform:translate(-50%,0)}
${EOS_LAN_R} .eosLanEmbers{inset:0}
${EOS_LAN_R} .eosLanEmbers i{position:absolute;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff1c2;box-shadow:0 0 8px 2px rgba(255,200,110,.75);opacity:0}
${EOS_LAN_R}[data-stage="done"] .eosLanEmbers i{animation:eosLanEmber 2.2s ease-in 2 both}
${EOS_LAN_R} .eosLanSpark{position:absolute;z-index:8;width:0;height:0;pointer-events:none}
${EOS_LAN_R} .eosLanSpark::before{content:"";position:absolute;left:-46px;top:-46px;width:92px;height:92px;border-radius:50%;border:3px solid rgba(255,214,140,.9);box-shadow:0 0 18px rgba(255,180,90,.7),inset 0 0 14px rgba(255,200,120,.5);animation:eosLanRing .7s ease-out both}
${EOS_LAN_R} .eosLanSpark i{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:#fff3c4;box-shadow:0 0 10px 3px rgba(255,190,90,.8);animation:eosLanSparkFly .8s cubic-bezier(.2,.8,.3,1) both}
${EOS_LAN_R} .eosLanSpark.big::before{left:-80px;top:-80px;width:160px;height:160px;border-width:4px}
${EOS_LAN_R} .eosLanSpark.big i{width:10px;height:10px;left:-5px;top:-5px;animation:eosLanSparkBig 1.1s cubic-bezier(.2,.8,.3,1) both}
${EOS_LAN_R} .eosLanSpark b{position:absolute;left:-110px;top:-110px;width:220px;height:220px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,236,170,.85),rgba(255,196,110,.3) 55%,rgba(255,170,80,0));animation:eosLanSoft 1.3s ease both}
${EOS_LAN_R} .eosLanSoftBurst{position:absolute;z-index:8;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,rgba(255,226,150,.7),rgba(255,190,100,.25) 55%,rgba(255,170,80,0));animation:eosLanSoft 1.2s ease both}
/* reduced motion / calm visuals: cross-fades only, same timings */
${EOS_LAN_R}[data-calm="1"] :is(.eosLanTwinkle,.eosLanPastDot.tw,.eosLanMote,.eosLanFlame,.eosLanStar[data-on="1"],.eosLanHeartGlow){animation:none!important}
${EOS_LAN_R}[data-calm="1"] .eosLanLantern .eosLanBody,${EOS_LAN_R}[data-calm="1"] .eosLanGold .eosLanBody{animation:none!important}
${EOS_LAN_R}[data-calm="1"] .eosLanMote{display:none}
${EOS_LAN_R}[data-calm="1"] .eosLanDropLean{transform:none;transition:none}
${EOS_LAN_R}[data-calm="1"] .eosLanDrop .eosOrb{animation:none!important}
${EOS_LAN_R}[data-calm="1"] .eosLanLantern :is(.eosLanPaper,.eosLanLit){animation:none!important}
${EOS_LAN_R}[data-calm="1"][data-beat="a"] .eosLanBeat{animation:eosLanBeatCalmA .75s ease-out}
${EOS_LAN_R}[data-calm="1"][data-beat="b"] .eosLanBeat{animation:eosLanBeatCalmB .75s ease-out}
${EOS_LAN_R}[data-calm="1"] .eosLanLantern[data-held="1"] .eosLanHalo{animation:none!important}
${EOS_LAN_R}[data-calm="1"] .eosLanGold{transform:none!important;transition:opacity 1s ease!important}
${EOS_LAN_R}[data-calm="1"]:is([data-stage="fly"]) .eosLanGold{opacity:.4}
${EOS_LAN_R}[data-calm="1"][data-stage="done"] .eosLanHug{animation:eosLanFadeIn 1s ease both;transform:scale(1) rotate(-45deg)}
${EOS_LAN_R}[data-calm="1"] .eosLanStar{transform:none;transition:opacity 1s ease}
${EOS_LAN_R}[data-calm="1"] .eosLanEmbers{display:none}
/* the finale owns the sky: the dusk twinkles + hill fireflies rest (the embers and rays take over) */
${EOS_LAN_R}:is([data-stage="fly"],[data-stage="done"]) :is(.eosLanTwinkle,.eosLanMote){animation:none!important;opacity:0!important}
${EOS_LAN_R}[data-calm="1"] .eosLanRays{animation:none!important}
${EOS_LAN_R}[data-calm="1"] :is(.eosLanConst,.eosLanDrop){transition:none!important}
${EOS_LAN_R}[data-calm="1"]:is([data-stage="gather"],[data-stage="fly"]) :is(.eosLanConst,.eosLanDrop){animation:eosLanFadeIn .9s ease both}
${EOS_LAN_R}[data-calm="1"][data-pulse="1"] .eosLanHeart path.eosLanHeartPulse{animation-name:eosLanPulseCalm!important}
${EOS_LAN_R}[data-calm="1"] .eosLanCue[data-cv="a"] span{animation:eosLanFadeIn .5s ease both}
${EOS_LAN_R}[data-calm="1"] .eosLanCue[data-cv="b"] span{animation:eosLanFadeIn2 .5s ease both}
@keyframes eosLanTwinkle{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes eosLanFlicker{0%,100%{opacity:var(--o)}50%{opacity:1}}
@keyframes eosLanMote{0%{transform:translate(0,0)}50%{transform:translate(14px,-18px)}100%{transform:translate(-10px,-34px)}}
@keyframes eosLanHover{0%,100%{transform:rotate(var(--tilt,0deg)) translateY(0)}50%{transform:rotate(calc(var(--tilt,0deg) * -.4)) translateY(-4px)}}
@keyframes eosLanTug{0%,100%{transform:rotate(0deg) translateY(-3px)}50%{transform:rotate(0deg) translateY(-11px)}}
@keyframes eosLanFlame{0%{transform:scale(1,1)}100%{transform:scale(.88,1.14)}}
@keyframes eosLanSqA{0%{transform:scale(1.12,.86)}100%{transform:scale(1,1)}}
@keyframes eosLanSqB{0%{transform:scale(1.12,.86)}100%{transform:scale(1,1)}}
@keyframes eosLanPopA{0%{transform:scale(1.14,.86)}55%{transform:scale(.94,1.08)}100%{transform:scale(1,1)}}
@keyframes eosLanPopB{0%{transform:scale(1.14,.86)}55%{transform:scale(.94,1.08)}100%{transform:scale(1,1)}}
@keyframes eosLanBeatA{0%{opacity:.95;transform:scale(.6);border-color:rgba(255,150,175,.95);box-shadow:0 0 14px rgba(255,130,170,.7)}100%{opacity:0;transform:scale(1.9);border-color:rgba(255,150,175,0)}}
@keyframes eosLanBeatB{0%{opacity:.95;transform:scale(.6);border-color:rgba(255,150,175,.95);box-shadow:0 0 14px rgba(255,130,170,.7)}100%{opacity:0;transform:scale(1.9);border-color:rgba(255,150,175,0)}}
@keyframes eosLanBeatCalmA{0%{opacity:.9;border-color:rgba(255,150,175,.9)}100%{opacity:0;border-color:rgba(255,150,175,0)}}
@keyframes eosLanBeatCalmB{0%{opacity:.9;border-color:rgba(255,150,175,.9)}100%{opacity:0;border-color:rgba(255,150,175,0)}}
@keyframes eosLanThrobA{0%{transform:scale(1.14);filter:brightness(1.25)}100%{transform:scale(1);filter:none}}
@keyframes eosLanThrobB{0%{transform:scale(1.14);filter:brightness(1.25)}100%{transform:scale(1);filter:none}}
@keyframes eosLanStarTw{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.18) rotate(12deg)}}
@keyframes eosLanHeartGlow{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes eosLanHug{0%{opacity:0;transform:translateY(10px) scale(.3) rotate(-45deg)}30%{opacity:1;transform:translateY(-6px) scale(1.15) rotate(-45deg)}55%{transform:translateY(0) scale(.95) rotate(-45deg)}100%{opacity:1;transform:translateY(-2px) scale(1) rotate(-45deg)}}
@keyframes eosLanEmber{0%{opacity:0;transform:translate(0,0) scale(var(--s,1))}12%{opacity:1}100%{opacity:0;transform:translate(var(--dx,0px),var(--fall,60px)) scale(calc(var(--s,1) * .4))}}
@keyframes eosLanCueInA{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
@keyframes eosLanCueInB{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
@keyframes eosLanFadeIn{0%{opacity:0}100%{opacity:1}}
@keyframes eosLanFadeIn2{0%{opacity:0}100%{opacity:1}}
@keyframes eosLanRing{0%{opacity:.95;transform:scale(.3)}100%{opacity:0;transform:scale(1.25)}}
@keyframes eosLanSparkFly{0%{opacity:1;transform:rotate(var(--a)) translateX(4px) scale(1)}100%{opacity:0;transform:rotate(var(--a)) translateX(56px) scale(.35)}}
@keyframes eosLanSparkBig{0%{opacity:1;transform:rotate(var(--a)) translateX(6px) scale(1.1)}100%{opacity:0;transform:rotate(var(--a)) translateX(104px) scale(.3)}}
@keyframes eosLanSoft{0%{opacity:0}35%{opacity:1}100%{opacity:0}}
@keyframes eosLanSpin{to{transform:rotate(360deg)}}
@keyframes eosLanPulse{0%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(1.42)}}
@keyframes eosLanPulseCalm{0%{opacity:.85}100%{opacity:0}}
`

eosRegisterGame(EOS_GAME_114, EosSkyLanternsEngine, {
    hint: "Hold a lantern to light it, then flick it up",
    mindBend: EOS_GAME_114.mindBend,
    css: EOS_LANTERNS_CSS,
    gesture: "hold",
    char: "drop",
    seconds: 25,
})
eosExpose("lanterns", {
    state: () => (eosLanLive ? eosLanLive() : null),
    EOS_GAME_114,
    layout: eosLanLayout,
    words: eosLanWords,
    fitter: eosLanFitter,
})
