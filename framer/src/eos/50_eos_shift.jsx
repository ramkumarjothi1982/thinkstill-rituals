// ============================================================================ 50_eos_shift.jsx
// Task `shift` (docs/EOS_SPEC.md §2.4, §6.6, §0.3 EosRecordShift retro, §0.4 EOS_BREATH + pacer, §10.2).
// Public: EosShiftMeter, EosStillMoment, EOS_SHIFT_CSS (+ eosExpose("shift", {…})).
// Mounted by integration I2-E9 inside .releaseCompleteCard, just before .releaseShiftCheck:
//   <EosShiftMeter game sfx rainSfx reduced onAgain onPlay onNext onDoneForNow addScore />
// The reveal becomes a short story: an optional Still Moment (blow the memory orb home / a hand on the
// heart / spark it on the beat) → ONE empty "after" dial that turns the character down by hand → the payoff
// ("ANGER 8 → 3 · COOL", stamp "5 LIGHTER ✦", "RUSH handed back the controls ✦", STILL takes the centre)
// → the memory orb flies into the ◉ shelf chip → at most three buttons.
// Other modules are reached only through eosApi(...)?.(): arrows (EosHandHint), router (EosSecondAct),
// rewards (grantForShift, EosShareButton), safety (soft, open), dots (setLevel, pulse), flip (line).
// Release 1: rewards / safety / flip may be missing → built-in fallbacks; nothing throws, no empty UI.
// Never stores user text: only numbers, ids and the emotion id go through EosRecordShift.

const EOS_SHIFT_HIGH_EMOS = new Set(["panic", "anger", "fear", "overwhelm"])
const EOS_SHIFT_SENSITIVE = new Set(["shame", "lonely", "sad", "fear"]) // share = a quiet "make a card" link
const EOS_SHIFT_NO_HEART = new Set([114, 115]) // these games already were the soothing moment
const EOS_SHIFT_NO_SPARK = new Set([117])
const EOS_SHIFT_VETERAN = 5 // rated loops in eos_sessions_v1 → a one-tap chip instead of an auto-start
const EOS_SHIFT_SETTLE_MS = 900 // payoff starts this long after the last dial change
const EOS_SHIFT_SETTLE_RETRO_MS = 1600 // …longer while the "you came in at about N · change" chip is offered
const EOS_SHIFT_TICK_MS = 60 // count-down speed of the payoff number
const EOS_SHIFT_AUTO_MS = 6500 // heart / spark finish by themselves
const EOS_SHIFT_SPARK_BPM = 90
const EOS_SHIFT_SIGH_IDLE_MS = 4000 // nobody touches the sigh orb → it plays the blow by itself once
const EOS_SHIFT_COOL_IDLE_MS = 2500 // cool always auto-starts (spec): round 1 begins after a short look
// Shift-local face overrides for the "calm" end of the loud → calm crossfade (core's anger.calm 44 is a wide-open
// shout/laugh that reads as RUSH yelling harder while the dial turns down; 59 = eyes closed, headphones, relieved).
const EOS_SHIFT_CALM_FACE = { anger: 59 }
function eosShiftEmo(emotion) {
    const e = EOS_EMO[emotion] || EOS_GUIDE_CHAR
    const c = EOS_SHIFT_CALM_FACE[emotion]
    return c != null && e.calm !== c ? { ...e, calm: c } : e
}
// Rated loops this app session ("After 3 rated loops"): skips (after = null) never count.
const EOS_SHIFT_RATED = { session: 0, n: 0 }
function eosShiftRatedThisSession() {
    const st = EOS_STORE.get()
    const since = Number(st.sessionStart) || 0
    let fromRows = 0
    try {
        fromRows = eosSessions().filter((r) => r && r.after != null && (Number(r.t) || 0) >= since).length
    } catch {}
    return Math.max(fromRows, EOS_SHIFT_RATED.session === since ? EOS_SHIFT_RATED.n : 0)
}
const EOS_SHIFT_PAID = new Set() // launchAt keys that already paid "+25 ⚡ for showing up"
const EOS_SHIFT_DEV = { log: [], paid: [], last: null }
function eosShiftLog(type, data) {
    if (!eosIsDev()) return
    EOS_SHIFT_DEV.log.push({ t: Date.now(), type, ...(data || {}) })
    if (EOS_SHIFT_DEV.log.length > 200) EOS_SHIFT_DEV.log.shift()
}

const EOS_SHIFT_COPY = {
    title: {
        sigh: "blow the memory orb home",
        cool: "cool it down: two big blows",
        heart: "Thumb on the orb — and if you like, your other hand on your own chest.",
        spark: "tap the orb on its pulse",
    },
    chip: { sigh: "one big sigh? ›", cool: "one big sigh? ›", heart: "a quiet moment? ›", spark: "spark it? ›" },
}
// Built-in personal line under the headline (the owner's ritual library — flipdata — arrives in release 2).
const EOS_SHIFT_LINES = {
    panic: "Your body found its own brake.",
    anger: "You let it out — then you cooled it down.",
    anxiety: "You came back to right here.",
    overthinking: "The loop got quieter.",
    overwhelm: "One thing at a time — you made space.",
    sad: "You were gentle with a heavy moment.",
    lonely: "You showed up for you — that counts.",
    shame: "You talked to yourself like a friend.",
    fear: "You looked closer — and it got smaller.",
    jealous: "Your own glow is back in view.",
    numb: "A little colour came back.",
    good: "You banked it — it's yours.",
    auto: "You made a little space.",
}

// ---------------------------------------------------------------- pure helpers
function eosShiftGame(id) {
    try {
        const n = Number(id) || 0
        return (typeof GAMES !== "undefined" && Array.isArray(GAMES) && GAMES.find((g) => Number(g && g.id) === n)) || null
    } catch {
        return null
    }
}
function eosShiftRatedCount() {
    return eosSessions().filter((r) => r && r.after != null).length
}
// Local week (Monday start) days with at least one finished game — "☀ 4 days this week" (no denominator).
function eosShiftWeekDays(d = new Date()) {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    const from = eosToday(start)
    return eosDays().filter((k) => typeof k === "string" && k >= from).length
}
// Which Still Moment (if any) follows this game? → null | {variant: "sigh"|"cool"|"heart"|"spark", auto}
function eosShiftMomentPlan({ emotion = null, gameId = 0, band = "mid", veteran = false } = {}) {
    const id = Number(gameId) || 0
    if (!id || EOS_SLOW_IDS.has(id)) return null
    const e = EOS_EMO[emotion]
    const kind = (e && e.moment) || "sigh"
    if (kind === "heart" && EOS_SHIFT_NO_HEART.has(id)) return null
    if (kind === "spark" && EOS_SHIFT_NO_SPARK.has(id)) return null
    // anger after a smash game ALWAYS gets the cool-down, veterans included
    if (emotion === "anger" && EOS_DISCHARGE_IDS.has(id)) return { variant: "cool", auto: true }
    const g = eosShiftGame(id)
    const destroy = EOS_DISCHARGE_IDS.has(id) || /destroy/i.test(String((g && g.family) || ""))
    const high = band === "high" && EOS_SHIFT_HIGH_EMOS.has(emotion)
    if (!destroy && !high) return null
    return { variant: kind, auto: !veteran }
}
// Everything the meter needs, read once per launch from the store (never during a later render).
function eosShiftContext(game) {
    const st = EOS_STORE.get()
    const emotion = EOS_EMO[st.emotion] ? st.emotion : EOS_EMO[st.detected] ? st.detected : null
    const e = eosShiftEmo(emotion)
    const gameId = Number(st.gameId) || Number(game && game.id) || 0
    const before = st.before == null ? null : eosClamp(Math.round(Number(st.before)), 0, 10)
    const guess = before != null ? before : eosClamp(Math.round(Number(st.intensityGuess != null ? st.intensityGuess : e.dial != null ? e.dial : 6)), 0, 10)
    const band = st.express ? "high" : eosBand(guess)
    const veteran = eosShiftRatedCount() >= EOS_SHIFT_VETERAN
    const plan = eosShiftMomentPlan({ emotion, gameId, band, veteran })
    const coolPath = emotion === "anger" && EOS_DISCHARGE_IDS.has(gameId)
    const replays = (Array.isArray(st.path) ? st.path : []).filter((x) => Number(x) === gameId).length
    return {
        emotion,
        e,
        char: e.char || "still",
        charName: EOS_CHAR_NAMES[e.char] || "STILL",
        gameId,
        before,
        guess,
        band,
        veteran,
        plan,
        coolPath,
        coolReplay: coolPath && replays >= 2, // one replay of the smash game per feeling, then "↻ cool it down"
        better: e.better || "down",
        launchAt: Number(st.launchAt) || 0,
    }
}
// F3: is the owner-only game menu on? (pick module absent → the old behaviour)
function eosShiftPickerOn() {
    try {
        const f = eosApi("pick").menuOn
        return typeof f === "function" ? !!f() : true
    } catch {
        return true
    }
}
// The follow-up game (ONE MORE ▶). Only ids registered right now are ever returned.
// F3: without the owner menu it is ThinkStill's next pick from the no-repeat rotation (never named).
function eosShiftNext(ctx, delta) {
    if (!eosShiftPickerOn()) {
        try {
            const g = eosApi("pick").EosPickPeek?.("", null, ctx.gameId)
            const v = g ? eosShiftGame(g.id) : null
            if (v && Number(v.id) !== ctx.gameId) return v
        } catch {}
        return null
    }
    if (ctx.coolPath) {
        const v = eosShiftGame(112)
        if (v) return v
    }
    try {
        const g = eosApi("router").EosSecondAct?.(ctx.emotion, ctx.gameId, delta)
        const v = g ? eosShiftGame(g.id) : null
        if (v && Number(v.id) !== ctx.gameId) return v
    } catch {}
    return null
}
// Face of the character as the dial moves: 0 = loud … 1 = calm (crossfaded, never a third random face).
function eosShiftCalmness(n, ref, better) {
    if (n == null) return 0
    const B = ref == null ? 6 : ref
    if (better === "up") return eosClamp((n - B) / Math.max(1, 10 - B), 0, 1)
    return eosClamp((B - n) / Math.max(1, B - 1), 0, 1)
}
function eosShiftRewardsLine(grant, ctx) {
    const parts = []
    let gl = null
    try {
        gl = grant && typeof grant.line === "string" && grant.line.trim() ? grant.line.trim() : null
    } catch {}
    if (gl) parts.push(gl)
    else {
        if (grant && grant.orb) parts.push("+1 memory orb")
        const b = grant && grant.bond
        if (b && Number(b.level) > 0) parts.push(`${EOS_CHAR_NAMES[b.char] || ctx.charName} bond ${Number(b.level)}`)
        const wk = grant && typeof grant.week === "number" ? grant.week : grant && grant.week && typeof grant.week.days === "number" ? grant.week.days : eosShiftWeekDays()
        if (wk > 0) parts.push(`☀ ${wk} ${wk === 1 ? "day" : "days"} this week`)
    }
    if (!parts.join(" ").includes("⚡")) parts.push("+25 ⚡ for showing up")
    return parts.join(" · ")
}

// ---------------------------------------------------------------- sound signature (F7)
// The ThinkStill 3-note shift sting (G4 → C5 → E5, triangle, 90 ms each = a rising major arpeggio).
function eosShiftSting() {
    ;[392, 523.25, 659.25].forEach((f, i) => eosTone(f, 140, { type: "triangle", gain: 0.06, at: i * 0.09 }))
}
// …then a per-emotion finish chord: anger minor → major, panic a slow descending fifth that resolves up,
// sad a rising sixth, everything else a major triad in the emotion's own key.
function eosShiftChord(emotion) {
    const at = 0.34
    const tri = (notes, t, ms = 520, g = 0.035) => notes.forEach((f) => eosTone(f, ms, { type: "sine", gain: g, at: t }))
    if (emotion === "anger") {
        tri([220, 261.63, 329.63], at, 300)
        tri([220, 277.18, 329.63, 440], at + 0.3, 700)
    } else if (emotion === "panic") {
        eosTone(659.25, 380, { type: "sine", gain: 0.04, at })
        eosTone(440, 420, { type: "sine", gain: 0.04, at: at + 0.32 })
        eosTone(554.37, 760, { type: "sine", gain: 0.04, at: at + 0.68 })
    } else if (emotion === "sad" || emotion === "lonely") {
        eosTone(261.63, 420, { type: "sine", gain: 0.04, at })
        eosTone(440, 820, { type: "sine", gain: 0.04, at: at + 0.3 })
    } else {
        const hue = eosHue(emotion)
        const base = 261.63 * Math.pow(2, (Math.round(hue / 30) % 12) / 12)
        tri([base, base * 1.26, base * 1.498], at, 760)
    }
}

// ---------------------------------------------------------------- the memory orb's flight (E5)
// Imperative (one DOM node, Web Animations) because .releaseCompleteCard clips its children: the orb is
// appended to .releaseStage above the reveal overlay and the world chips, then removed. Returns cancel().
function eosShiftFlyOrb({ from, face, tier = "silver", hue = 190, reduced = false, sfx }) {
    try {
        if (!from || typeof document === "undefined") return () => {}
        const stage = from.closest(".releaseStage") || from.closest(".tsArcade") || document.body
        const chip = stage.querySelector('[data-eos-chip="orbs"]') || document.querySelector('[data-eos-chip="orbs"]')
        const a = eosRelRect(from, stage)
        if (!a) return () => {}
        const b = chip ? eosRelRect(chip, stage) : null
        const zOf = (el) => {
            const z = el ? Number(getComputedStyle(el).zIndex) : NaN
            return Number.isFinite(z) ? z : 0
        }
        const overlay = from.closest(".releaseCompleteOverlay")
        const z = Math.max(zOf(overlay), zOf(chip && chip.closest(".eosWorldChips")), zOf(chip), 170) + 2
        const el = document.createElement("div")
        el.className = "eosShiftFly"
        el.setAttribute("aria-hidden", "true")
        el.style.cssText = `left:${a.cx}px;top:${a.cy}px;z-index:${z};--eos-h:${hue}`
        const ball = document.createElement("span")
        ball.className = `eosShiftFlyBall is-${tier === "gold" ? "gold" : "silver"}`
        const img = document.createElement("img")
        img.alt = ""
        img.draggable = false
        img.src = face
        img.onerror = () => {
            img.style.display = "none"
        }
        ball.appendChild(img)
        el.appendChild(ball)
        stage.appendChild(el)
        const anims = []
        let gone = false
        const cleanup = () => {
            if (gone) return
            gone = true
            anims.forEach((x) => {
                try {
                    x.cancel()
                } catch {}
            })
            try {
                el.remove()
            } catch {}
        }
        const land = () => {
            try {
                sfx?.("plink")
            } catch {}
            eosHaptic("notch")
            if (chip) {
                try {
                    // the chip bump outlives the orb (cleanup cancels only the orb's own animations)
                    chip.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 460, easing: "cubic-bezier(.3,1.6,.4,1)" })
                    chip.dispatchEvent(new CustomEvent("eos:orb-landed", { bubbles: true, detail: { tier } }))
                } catch {}
                const plus = document.createElement("div")
                plus.className = "eosShiftPlus"
                plus.setAttribute("aria-hidden", "true")
                plus.textContent = "+1"
                plus.style.cssText = `left:${b.cx}px;top:${b.y + b.h + 4}px;z-index:${z}`
                stage.appendChild(plus)
                const pa = plus.animate(
                    reduced
                        ? [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }]
                        : [{ opacity: 0, transform: "translate(-50%,6px) scale(.6)" }, { opacity: 1, transform: "translate(-50%,0) scale(1.15)", offset: 0.25 }, { opacity: 1, transform: "translate(-50%,-10px) scale(1)", offset: 0.7 }, { opacity: 0, transform: "translate(-50%,-22px) scale(1)" }],
                    { duration: 1300, easing: "ease-out", fill: "forwards" }
                )
                pa.onfinish = () => {
                    try {
                        plus.remove()
                    } catch {}
                }
            }
        }
        if (reduced || !b) {
            // reduced / no chip: a quiet cross-fade (the orb glows where it was, the chip says +1)
            const fa = el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 1100, easing: "ease-in-out", fill: "forwards" })
            anims.push(fa)
            fa.onfinish = () => {
                land()
                cleanup()
            }
            return cleanup
        }
        // a quadratic arc that lifts above both points, then drops into the chip
        const dx = b.cx - a.cx
        const dy = b.cy - a.cy
        const cx = dx * 0.35
        const cy = Math.min(0, dy) - Math.max(70, Math.abs(dx) * 0.25)
        const frames = []
        const N = 16
        for (let i = 0; i <= N; i++) {
            const t = i / N
            const x = 2 * (1 - t) * t * cx + t * t * dx
            const y = 2 * (1 - t) * t * cy + t * t * dy
            const s = 1 + 0.25 * Math.sin(Math.PI * Math.min(1, t * 1.6)) - 0.55 * t
            frames.push({ transform: `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(3)})`, offset: t })
        }
        const fly = el.animate(frames, { duration: 980, easing: "cubic-bezier(.45,.05,.4,1)", fill: "forwards" })
        anims.push(fly)
        fly.onfinish = () => {
            land()
            const end = `translate(-50%,-50%) translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`
            const sq = el.animate(
                [{ transform: `${end} scale(.45)`, opacity: 1 }, { transform: `${end} scale(.62,.34)`, opacity: 1 }, { transform: `${end} scale(.3)`, opacity: 0 }],
                { duration: 300, easing: "ease-out", fill: "forwards" }
            )
            anims.push(sq)
            sq.onfinish = cleanup
        }
        return cleanup
    } catch {
        return () => {}
    }
}

// ---------------------------------------------------------------- shared bits
// The character bubble used by the moment and the meter: two stacked faces (loud → calm crossfade),
// the core orb look (.eosOrbBall), circular, no text inside, no black mask.
// A face image that fails (network flake) is retried once with a cache-buster after 800 ms; only then the bubble
// falls back to a calm face glyph on a disc in the CHARACTER's own hue (never a letter on the emotion's colour).
function eosShiftCharHue(char) {
    const c = String(char || "still")
    if (c === "still") return EOS_GUIDE_CHAR.hue
    for (const k in EOS_EMO) if (EOS_EMO[k] && EOS_EMO[k].char === c) return EOS_EMO[k].hue
    return EOS_GUIDE_CHAR.hue
}
function EosShiftFace({ char, loud, calmFace, calmness = 0, grey = false, className = "", ballRef }) {
    const [att, setAtt] = React.useState(0) // 0 first load · 1 retry (cache-buster) · 2 fallback
    const tRef = React.useRef(0)
    React.useEffect(() => () => clearTimeout(tRef.current), [])
    const onErr = () => {
        if (att === 0) {
            if (!tRef.current) tRef.current = setTimeout(() => setAtt(1), 800)
        } else setAtt(2)
    }
    const q = att === 1 ? "?eosr=1" : ""
    const broken = att === 2
    return (
        <span className={`eosOrbBall eosShiftBall ${grey ? "isGrey" : ""} ${broken ? "isFallback" : ""} ${className}`} ref={ballRef} style={broken ? { "--eos-h": eosShiftCharHue(char) } : undefined}>
            {!broken ? (
                <>
                    <img key={`l${att}`} className="eosOrbFace eosShiftFaceLoud" src={eosFace(char, loud) + q} alt="" draggable={false} onError={onErr} style={{ opacity: 1 - calmness * 0.92 }} />
                    <img key={`c${att}`} className="eosOrbFace eosShiftFaceCalm" src={eosFace(char, calmFace) + q} alt="" draggable={false} onError={onErr} style={{ opacity: calmness }} />
                </>
            ) : (
                <svg className="eosShiftFallFace" viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M28 46q9-9 18 0M54 46q9-9 18 0M34 62q16 13 32 0" />
                </svg>
            )}
            <i className="eosOrbGloss" />
        </span>
    )
}
function eosShiftTextFocused() {
    try {
        const a = document.activeElement
        return !!(a && a.matches && a.matches("input, textarea, select, [contenteditable], [contenteditable] *"))
    } catch {
        return false
    }
}

// ============================================================================ EosStillMoment
// Diegetic, skippable from 0 s (tap anywhere / "skip ›" / Escape). Timings from EOS_BREATH; it OWNS the
// shared pacer while it runs (eosBreathOwn / eosPacerBeat) so the Still Point and every other rhythm follow.
//   sigh  — hold to fill (1.6 s) → slide up / second finger / auto after 1 s for one more sip (0.5 s) →
//           let go: a long LINEAR blow (4.4 s) that sends the orb toward the ◉ shelf.
//   cool  — the same, twice (anger after a smash game).
//   heart — thumb on the orb 3 s (heartbeat 60 → 52 bpm, release pauses, never resets) → optional 5 s "stay".
//   spark — tap the orb 3× on a visible 90 bpm pulse.
// heart / spark finish by themselves at 6.5 s; the sigh plays its blow by itself after 8 s untouched.
// onDone(reason) — "done" | "skip" | "auto".
function EosStillMoment({ emotion = null, gameId = 0, band = "mid", variant = "sigh", onDone, reduced = false, rainSfx }) {
    useEosStore()
    const calm = eosCalm(reduced)
    const e = eosShiftEmo(emotion)
    const v = ["sigh", "cool", "heart", "spark"].includes(variant) ? variant : "sigh"
    const kind = v === "cool" ? "sigh" : v
    const rounds = v === "cool" ? 2 : 1
    const char = e.char || "still"
    const rootRef = React.useRef(null)
    const orbRef = React.useRef(null)
    const thumpRef = React.useRef(null)
    const [rootEl, setRootEl] = React.useState(null)
    const [orbEl, setOrbEl] = React.useState(null)
    const [hintAt, setHintAt] = React.useState(null) // the hand rests on the orb's lower-right rim, never on the face
    const setRoot = React.useCallback((el) => {
        rootRef.current = el
        setRootEl(el)
    }, [])
    const setOrb = React.useCallback((el) => {
        orbRef.current = el
        setOrbEl(el)
    }, [])
    const [ph, setPh] = React.useState("ready")
    const [round, setRound] = React.useState(1)
    const [taps, setTaps] = React.useState(0)
    const [beats, setBeats] = React.useState(0)
    const [fill, setFill] = React.useState({ v: 0, ms: 0, ease: "linear" })
    const [count, setCount] = React.useState("")
    const [auto, setAuto] = React.useState(false)
    const doneRef = React.useRef(onDone)
    doneRef.current = onDone
    const rainRef = React.useRef(rainSfx)
    rainRef.current = rainSfx
    const S = React.useRef(null)
    if (!S.current) S.current = { alive: true, timers: new Set(), phase: "ready", down: null, touched: false, finished: false, held: 0, holdAt: 0, inAt: 0, round: 1, auto: false, stopBeat: null, ignoreClickUntil: 0, t0: 0, phaseAt: 0, phaseMs: 0, taps: 0 }

    const later = React.useCallback((fn, ms) => {
        const s = S.current
        const t = setTimeout(() => {
            s.timers.delete(t)
            if (s.alive && !s.finished) fn()
        }, Math.max(0, ms))
        s.timers.add(t)
        return t
    }, [])
    const clearTimers = () => {
        S.current.timers.forEach((t) => clearTimeout(t))
        S.current.timers.clear()
    }
    const go = (p, ms = 0) => {
        S.current.phase = p
        S.current.phaseAt = performance.now()
        S.current.phaseMs = ms
        setPh(p)
    }
    const stopBeat = () => {
        try {
            S.current.stopBeat?.()
        } catch {}
        S.current.stopBeat = null
    }
    const finish = React.useCallback((reason) => {
        const s = S.current
        if (s.finished) return
        s.finished = true
        s.timers.forEach((t) => clearTimeout(t))
        s.timers.clear()
        try {
            s.stopBeat?.()
        } catch {}
        eosBreathOwn(null)
        if (kind === "spark") eosPacerBeat(0)
        eosShiftLog("moment-end", { variant: v, reason, ms: Math.round(performance.now() - s.t0) })
        try {
            doneRef.current?.(reason)
        } catch {}
    }, [kind, v])

    // ---- sigh / cool
    const startOut = () => {
        const s = S.current
        clearTimers()
        go("out", EOS_BREATH.sighOut * 1000)
        eosBreathOwn("out", EOS_BREATH.sighOut * 1000)
        setFill({ v: 0, ms: EOS_BREATH.sighOut * 1000, ease: "linear" })
        try {
            rainRef.current?.(4)
        } catch {}
        eosHaptic("exhale")
        eosTone(eosNote(7, 262), EOS_BREATH.sighOut * 1000, { type: "sine", gain: 0.022, glide: eosNote(0, 131) })
        later(() => {
            if (s.round < rounds) {
                s.round += 1
                setRound(s.round)
                eosBreathOwn(null)
                setFill({ v: 0, ms: 300, ease: "ease-out" })
                eosTone(eosNote(5), 180, { type: "triangle", gain: 0.04 })
                go("ready")
                if (s.auto) later(() => startIn(), 900)
                else
                    later(() => {
                        if (s.phase === "ready" && !s.down) startIn(true)
                    }, EOS_SHIFT_SIGH_IDLE_MS / 2)
                return
            }
            eosBreathOwn(null)
            go("landed")
            eosTone(eosNote(9), 260, { type: "triangle", gain: 0.05 })
            eosTone(eosNote(11), 420, { type: "sine", gain: 0.04, at: 0.12 })
            later(() => finish("done"), calm ? 500 : 900)
        }, EOS_BREATH.sighOut * 1000)
    }
    const startSip = () => {
        const s = S.current
        if (s.phase !== "full") return
        clearTimers()
        go("sip", EOS_BREATH.sip * 1000)
        eosBreathOwn("in", EOS_BREATH.sip * 1000)
        setFill({ v: 1, ms: EOS_BREATH.sip * 1000, ease: "cubic-bezier(.3,.7,.4,1)" })
        eosHaptic(8)
        eosTone(eosNote(8, 262), 260, { type: "triangle", gain: 0.04, glide: eosNote(9, 262) })
        later(() => {
            if (s.phase !== "sip") return
            if (s.down && !s.auto) {
                // still holding after the sip: a short beat at the top, then the blow starts anyway
                go("top")
                eosBreathOwn("hold", 1200)
                later(() => {
                    if (s.phase === "top") startOut()
                }, 1200)
            } else startOut()
        }, EOS_BREATH.sip * 1000)
    }
    function startIn(autoplay) {
        const s = S.current
        if (s.phase !== "ready" || s.finished) return
        clearTimers()
        if (autoplay) {
            s.auto = true
            setAuto(true)
        }
        s.inAt = performance.now()
        go("in", EOS_BREATH.sighIn * 1000)
        eosBreathOwn("in", EOS_BREATH.sighIn * 1000)
        setFill({ v: 0.8, ms: EOS_BREATH.sighIn * 1000, ease: "cubic-bezier(.3,.7,.4,1)" })
        eosHaptic(8)
        eosTone(eosNote(2, 262), EOS_BREATH.sighIn * 1000, { type: "sine", gain: 0.026, glide: eosNote(7, 262) })
        later(() => {
            if (s.phase !== "in") return
            go("full")
            try {
                eosApi("dots").pulse?.("in")
            } catch {}
            // the top-up plays by itself after 1 s while the finger is still down (or in autoplay)
            later(() => {
                if (s.phase === "full" && (s.down || s.auto)) startSip()
            }, s.auto ? 150 : 1000)
        }, EOS_BREATH.sighIn * 1000)
    }
    const sighRelease = () => {
        const s = S.current
        s.down = null
        if (s.auto) return
        if (s.phase === "in") {
            if (performance.now() - s.inAt >= 900) startOut()
            else {
                clearTimers()
                eosBreathOwn(null)
                setFill({ v: 0, ms: 600, ease: "ease-out" })
                go("ready")
            }
        } else if (s.phase === "full" || s.phase === "top") startOut()
        // "sip": the timer above starts the blow as soon as the sip completes
    }

    // ---- heart
    const heartDown = () => {
        const s = S.current
        if (s.phase !== "ready" && s.phase !== "paused") return
        clearTimers()
        s.holdAt = performance.now()
        const left = Math.max(0, 3000 - s.held)
        go("hold", left)
        eosBreathOwn("hold", left)
        setFill({ v: 1, ms: left, ease: "linear" })
        const from = 60 - 8 * (s.held / 3000)
        stopBeat()
        s.stopBeat = eosHeartbeat(from, 52, left, () => {
            setBeats((b) => b + 1)
            try {
                thumpRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.07)" }, { transform: "scale(.99)" }, { transform: "scale(1)" }], { duration: 340, easing: "ease-out" })
            } catch {}
        })
        later(() => {
            if (s.phase !== "hold") return
            s.held = 3000
            stopBeat()
            go("stay", 5000)
            eosTone(eosNote(4, 262), 600, { type: "sine", gain: 0.04 })
            eosTone(eosNote(7, 262), 900, { type: "sine", gain: 0.03, at: 0.2 })
            eosBreathOwn("in", 2000)
            later(() => eosBreathOwn("out", 3000), 2000)
            later(() => finish("done"), 5000)
        }, left)
    }
    const heartUp = () => {
        const s = S.current
        s.down = null
        if (s.phase !== "hold") return
        clearTimers()
        s.held = Math.min(3000, s.held + (performance.now() - s.holdAt))
        stopBeat()
        eosBreathOwn(null)
        setFill({ v: s.held / 3000, ms: 120, ease: "linear" })
        go("paused")
        later(() => finish("auto"), 3000)
    }

    // ---- spark
    const sparkTap = () => {
        const s = S.current
        if (s.phase !== "ready") return
        const period = 60000 / EOS_SHIFT_SPARK_BPM
        const k = ((performance.now() - s.t0) % period) / period
        const onBeat = Math.min(k, 1 - k) * period <= 160
        s.taps += 1
        setTaps(s.taps)
        setFill({ v: s.taps / 3, ms: 220, ease: "cubic-bezier(.3,1.6,.4,1)" })
        eosTone(eosNote(3 + s.taps * 2, 392), 220, { type: "triangle", gain: onBeat ? 0.06 : 0.04 })
        eosHaptic(onBeat ? "hit" : 8)
        try {
            thumpRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.14,.9)" }, { transform: "scale(.94,1.08)" }, { transform: "scale(1)" }], { duration: 300, easing: "ease-out" })
        } catch {}
        if (s.taps >= 3) {
            clearTimers()
            go("lit")
            eosPacerBeat(0)
            eosTone(eosNote(12, 392), 380, { type: "sine", gain: 0.05, at: 0.1 })
            later(() => finish("done"), calm ? 500 : 950)
        }
    }

    // ---- lifecycle: start clocks, auto finish, pacer ownership, cleanup
    React.useEffect(() => {
        const s = S.current
        s.alive = true
        s.t0 = performance.now()
        eosShiftLog("moment-start", { variant: v, emotion, gameId, band })
        // keyboard users land on the orb (Space = hold); never steal focus from a text field
        const ft = setTimeout(() => {
            if (orbRef.current && !eosShiftTextFocused()) {
                try {
                    orbRef.current.focus({ preventScroll: true })
                } catch {}
            }
        }, 80)
        s.timers.add(ft)
        if (kind === "spark") {
            eosPacerBeat(EOS_SHIFT_SPARK_BPM)
            later(() => finish("auto"), EOS_SHIFT_AUTO_MS)
        } else if (kind === "heart") later(() => finish("auto"), EOS_SHIFT_AUTO_MS)
        else
            later(() => {
                if (s.phase === "ready" && !s.touched) startIn(true)
            }, v === "cool" ? EOS_SHIFT_COOL_IDLE_MS : EOS_SHIFT_SIGH_IDLE_MS)
        return () => {
            s.alive = false
            s.timers.forEach((t) => clearTimeout(t))
            s.timers.clear()
            try {
                s.stopBeat?.()
            } catch {}
            if (!s.finished) {
                eosBreathOwn(null)
                if (kind === "spark") eosPacerBeat(0)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ---- tap anywhere (outside the orb) skips; a second finger while holding = the sip; Escape skips
    React.useEffect(() => {
        const root = rootRef.current
        if (!root) return
        const scope = root.closest(".releaseCompleteOverlay") || root.closest(".releaseStage") || root.parentElement || root
        const onDownCap = (ev) => {
            const s = S.current
            if (s.finished) return
            if (s.down && ev.pointerId !== s.down.id) {
                s.ignoreClickUntil = performance.now() + 700
                if (s.phase === "full") startSip()
            }
        }
        const onClickCap = (ev) => {
            const s = S.current
            if (s.finished) return
            const t = ev.target
            if (!t || !t.closest) return
            if (orbRef.current && orbRef.current.contains(t)) return
            if (t.closest(".eosSmSkip")) return
            if (s.down || performance.now() < s.ignoreClickUntil) return
            // real controls outside the moment (↻ AGAIN, chips, header) keep working
            if (!root.contains(t) && t.closest("button, a, input, textarea, select, [role=slider], [role=button], [data-eos-chip]")) return
            ev.preventDefault()
            ev.stopPropagation()
            finish("skip")
        }
        const onKey = (ev) => {
            if (ev.key === "Escape" && !S.current.finished && !eosShiftTextFocused()) {
                ev.preventDefault()
                finish("skip")
            }
        }
        scope.addEventListener("pointerdown", onDownCap, true)
        scope.addEventListener("click", onClickCap, true)
        document.addEventListener("keydown", onKey)
        return () => {
            scope.removeEventListener("pointerdown", onDownCap, true)
            scope.removeEventListener("click", onClickCap, true)
            document.removeEventListener("keydown", onKey)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finish])

    // ---- calm visuals: a numeric countdown ("in 2… out 4…") instead of big motion
    React.useEffect(() => {
        if (!calm) {
            setCount("")
            return
        }
        const tick = () => {
            const s = S.current
            const left = s.phaseMs ? Math.max(0, s.phaseMs - (performance.now() - s.phaseAt)) : 0
            const n = Math.max(1, Math.ceil(left / 1000))
            const p = s.phase
            setCount(p === "in" || p === "sip" ? `in ${n}…` : p === "out" ? `out ${n}…` : p === "hold" ? `${n}…` : "")
        }
        tick()
        const t = setInterval(tick, 250)
        return () => clearInterval(t)
    }, [calm, ph])

    // ---- orb input
    const onOrbDown = (ev) => {
        const s = S.current
        if (s.finished) return
        s.touched = true
        if (kind === "spark") return sparkTap()
        if (s.down) {
            if (ev.pointerId !== s.down.id && s.phase === "full") startSip()
            return
        }
        s.down = { id: ev.pointerId, y: ev.clientY, yFull: null }
        try {
            ev.currentTarget.setPointerCapture(ev.pointerId)
        } catch {}
        if (kind === "heart") return heartDown()
        if (s.phase === "ready") startIn(false)
    }
    const onOrbMove = (ev) => {
        const s = S.current
        if (!s.down || ev.pointerId !== s.down.id || kind !== "sigh") return
        if (s.phase !== "full") {
            s.down.y = ev.clientY
            return
        }
        if (s.down.yFull == null) s.down.yFull = s.down.y
        const k = eosStageScale(rootRef.current) || 1
        if ((s.down.yFull - ev.clientY) / k >= 24) startSip()
    }
    const onOrbUp = (ev) => {
        const s = S.current
        if (!s.down || (ev && ev.pointerId != null && ev.pointerId !== s.down.id && s.down.id !== "kb")) return
        if (kind === "heart") return heartUp()
        if (kind === "sigh") sighRelease()
    }
    const onOrbKeyDown = (ev) => {
        const s = S.current
        if (ev.key === " " || ev.key === "Enter") {
            ev.preventDefault()
            if (ev.repeat || s.finished) return
            s.touched = true
            if (kind === "spark") return sparkTap()
            if (s.down) return
            s.down = { id: "kb", y: 0, yFull: null }
            if (kind === "heart") return heartDown()
            if (s.phase === "ready") startIn(false)
        } else if (ev.key === "ArrowUp" && kind === "sigh") {
            ev.preventDefault()
            startSip()
        }
    }
    const onOrbKeyUp = (ev) => {
        if ((ev.key === " " || ev.key === "Enter") && S.current.down && S.current.down.id === "kb") {
            ev.preventDefault()
            if (kind === "heart") heartUp()
            else if (kind === "sigh") sighRelease()
        }
    }

    // ---- look
    const sighCalmness = kind === "sigh" ? (ph === "landed" ? 1 : ph === "out" ? round / rounds : (round - 1) / rounds) : 0
    const calmness = kind === "sigh" ? sighCalmness : kind === "heart" ? (ph === "stay" ? 1 : ph === "hold" ? 0.85 : fill.v * 0.85) : ph === "lit" ? 1 : taps / 3
    const faceMs = kind === "sigh" && ph === "out" ? EOS_BREATH.sighOut * 1000 : kind === "heart" && ph === "hold" ? Math.max(200, fill.ms) : 500
    const grade = e.grade || EOS_GUIDE_CHAR.grade
    const sz = 128
    const R = 76
    const C = 2 * Math.PI * R
    let scale = 1
    let tx = 0
    let ty = 0
    if (kind === "sigh") {
        if (ph === "in") scale = calm ? 1.03 : 1.16
        else if (ph === "full") scale = calm ? 1.03 : 1.17
        else if (ph === "sip" || ph === "top") scale = calm ? 1.04 : 1.23
        else if (ph === "out") {
            scale = calm ? 1 : 0.9
            if (!calm) {
                tx = 30
                ty = -26
            }
        }
    } else if (kind === "heart" && (ph === "hold" || ph === "stay")) scale = calm ? 1.02 : 1.06
    else if (kind === "spark" && ph === "lit") scale = calm ? 1.03 : 1.12
    const orbMs = kind === "sigh" ? (ph === "out" ? EOS_BREATH.sighOut * 1000 : ph === "in" ? EOS_BREATH.sighIn * 1000 : ph === "sip" ? EOS_BREATH.sip * 1000 : 600) : 400
    const orbEase = ph === "out" ? "linear" : ph === "landed" ? "cubic-bezier(.3,1.6,.4,1)" : "cubic-bezier(.3,.7,.4,1)"

    let caption = ""
    let hint = null
    if (kind === "sigh") {
        caption =
            ph === "ready"
                ? round > 1
                    ? "one more big blow"
                    : "hold the orb to fill it"
                : ph === "in"
                  ? "fill it…"
                  : ph === "full" || ph === "sip"
                    ? "one more sip ↑"
                    : ph === "top"
                      ? "now let go…"
                      : ph === "out"
                        ? "looooong blow →"
                        : "home ✦"
        if (auto && (ph === "in" || ph === "full" || ph === "sip")) caption = "follow the orb… " + caption
        if (ph === "ready") hint = { g: "hold", ms: EOS_BREATH.sighIn * 1000, label: "HOLD TO FILL IT" }
        else if (ph === "full" && !auto) hint = { g: "drag", dir: "u", d: 30, label: "SIP MORE ↑" }
    } else if (kind === "heart") {
        caption = ph === "ready" ? "hold your thumb on the orb" : ph === "hold" ? "feel it slow down…" : ph === "paused" ? "it waits for you" : "stay here…"
        if (ph === "ready" || ph === "paused") hint = { g: "hold", ms: 3000, label: "HOLD · HAND ON HEART" }
    } else {
        caption = ph === "lit" ? "it's awake ✦" : taps ? `${3 - taps} more on the beat` : "tap with the pulse"
        if (ph === "ready") hint = { g: "taps", n: Math.max(1, 3 - taps), label: "TAP ×3 ON THE BEAT" }
    }
    const title = EOS_SHIFT_COPY.title[v]
    const HandHint = eosApi("arrows").EosHandHint
    const orbLabel = kind === "sigh" ? "Memory orb: hold to fill it, then let go" : kind === "heart" ? "Memory orb: hold your thumb on it" : "Memory orb: tap it three times on the beat"
    const trail = []
    if (kind === "sigh" && ph === "out" && !calm) for (let i = 0; i < 12; i++) trail.push(i)
    const sparks = []
    if (kind === "spark" && taps > 0 && !calm) for (let i = 0; i < 8; i++) sparks.push(i)

    return (
        <div
            ref={setRoot}
            className={`eosStillMoment is-${v}${calm ? " isCalm" : ""}`}
            data-variant={v}
            data-phase={ph}
            data-round={round}
            role="group"
            aria-label={title}
            style={{ "--eos-h": e.hue, "--eos-l1": grade.loud[0], "--eos-l2": grade.loud[1], "--eos-c1": grade.calm[0], "--eos-c2": grade.calm[1] }}
        >
            <div className="eosSmHead">
                <b className="eosSmTitle">{title}</b>
                {rounds > 1 ? (
                    <span className="eosSmPips" aria-label={`blow ${round} of ${rounds}`}>
                        {[1, 2].map((i) => (
                            <i key={i} className={i < round || (i === round && ph === "landed") ? "on" : i === round ? "cur" : ""} />
                        ))}
                    </span>
                ) : null}
            </div>
            <div className="eosSmStage">
                <i className="eosSmGlow eosSmGlowLoud" aria-hidden="true" />
                <i className="eosSmGlow eosSmGlowCalm" aria-hidden="true" style={{ opacity: calmness, transitionDuration: `${faceMs}ms` }} />
                {kind === "spark" && ph === "ready" && !calm ? <i className="eosSmBeat" aria-hidden="true" style={{ animationDuration: `${60000 / EOS_SHIFT_SPARK_BPM}ms` }} /> : null}
                {kind === "spark" && ph === "ready" && calm ? <i className="eosSmBeat isCalm" aria-hidden="true" style={{ animationDuration: `${60000 / EOS_SHIFT_SPARK_BPM}ms` }} /> : null}
                {kind === "heart" && !calm ? <i key={beats} className="eosSmRipple" aria-hidden="true" /> : null}
                <div className="eosSmMover" style={{ transform: `translate(${tx}px,${ty}px) scale(${scale})`, transitionDuration: `${orbMs}ms`, transitionTimingFunction: orbEase }}>
                    <svg className="eosSmRing" viewBox="0 0 180 180" aria-hidden="true">
                        <circle cx="90" cy="90" r={R} className="eosSmRingBg" />
                        <circle
                            cx="90"
                            cy="90"
                            r={R}
                            className="eosSmRingFill"
                            style={{ strokeDasharray: `${C.toFixed(1)}`, strokeDashoffset: `${(C * (1 - fill.v)).toFixed(1)}`, transitionDuration: `${fill.ms}ms`, transitionTimingFunction: fill.ease }}
                        />
                    </svg>
                    <button
                        type="button"
                        ref={setOrb}
                        className="eosSmOrb"
                        aria-label={orbLabel}
                        onPointerDown={onOrbDown}
                        onPointerMove={onOrbMove}
                        onPointerUp={onOrbUp}
                        onPointerCancel={onOrbUp}
                        onLostPointerCapture={onOrbUp}
                        onKeyDown={onOrbKeyDown}
                        onKeyUp={onOrbKeyUp}
                        onContextMenu={(ev) => ev.preventDefault()}
                        style={{ "--eos-orb": `${sz}px` }}
                        {...(hint ? eosTarget(hint) : {})}
                    >
                        <i className="eosSmHintAt" ref={setHintAt} aria-hidden="true" />
                        <span className="eosSmThump" ref={thumpRef}>
                            <EosShiftFace char={char} loud={e.loud} calmFace={e.calm} calmness={calmness} grey={!!e.greyLoud && calmness < 0.5} className="eosSmFaceWrap" />
                        </span>
                    </button>
                    {trail.map((i) => (
                        <i key={i} className="eosSmTrail" aria-hidden="true" style={{ "--i": i, "--a": `${-62 + eosNoise(i, 5) * 50}deg` }} />
                    ))}
                    {sparks.map((i) => (
                        <i key={`${taps}-${i}`} className="eosSmSpark" aria-hidden="true" style={{ "--a": `${i * 45 + taps * 15}deg` }} />
                    ))}
                </div>
            </div>
            <div className="eosSmCaption" aria-live="polite">
                <span>{caption}</span>
                {count ? <b className="eosSmCount">{count}</b> : null}
            </div>
            <button type="button" className="eosSmSkip" onClick={() => finish("skip")}>
                {kind === "heart" && ph === "stay" ? "continue ›" : "skip ›"}
            </button>
            {HandHint && hint && rootEl && orbEl ? (
                <HandHint key={`${ph}-${round}`} target={orbEl} rest={hintAt || undefined} root={rootEl} g={hint.g} label={hint.label} ms={hint.ms} n={hint.n} dir={hint.dir} d={hint.d} reduced={calm} showAfterMs={ph === "full" ? 0 : 600} idleMs={3000} />
            ) : null}
        </div>
    )
}

// ============================================================================ EosShiftMeter
function EosShiftMeter({ game, sfx, rainSfx, reduced = false, onAgain, onPlay, onNext, onDoneForNow, addScore }) {
    const eos = useEosStore()
    const calm = eosCalm(reduced)
    const launchKey = `${eos.launchAt || 0}:${Number(game && game.id) || 0}`
    // read once per launch (the store keeps changing as we record; the story must not)
    const ctx = React.useMemo(() => eosShiftContext(game), [launchKey]) // eslint-disable-line react-hooks/exhaustive-deps
    const [step, setStep] = React.useState(() => (ctx.plan && ctx.plan.auto ? "moment" : "rate"))
    const [momentOn, setMomentOn] = React.useState(() => !!(ctx.plan && ctx.plan.auto))
    const [after, setAfter] = React.useState(null)
    const [retroBefore, setRetroBefore] = React.useState(null)
    const [retroOpen, setRetroOpen] = React.useState(false)
    const [pay, setPay] = React.useState(null) // {shift, grant, before, after, skipped}
    const [payPh, setPayPh] = React.useState("count") // count | resolved
    const [disp, setDisp] = React.useState(null)
    const [helpOpen, setHelpOpen] = React.useState(false)
    const [rootEl, setRootEl] = React.useState(null)
    const [dialEl, setDialEl] = React.useState(null)
    const [goodEl, setGoodEl] = React.useState(null)
    const rootRef = React.useRef(null)
    const dialRef = React.useRef(null)
    const setRoot = React.useCallback((el) => {
        rootRef.current = el
        setRootEl(el)
    }, [])
    const setDial = React.useCallback((el) => {
        dialRef.current = el
        setDialEl(el)
    }, [])
    const stageRef = React.useRef(null)
    const stillRef = React.useRef(null)
    const charRef = React.useRef(null)
    const R = React.useRef({ committed: false, settle: 0, timers: new Set(), dialDown: false, retroOpen: false, flyCancel: null })
    const live = React.useRef({})
    live.current = { after, retroBefore, sfx, addScore, onPlay, onNext, onAgain, onDoneForNow }

    const later = (fn, ms) => {
        const t = setTimeout(() => {
            R.current.timers.delete(t)
            fn()
        }, ms)
        R.current.timers.add(t)
        return t
    }

    // ---- "+25 ⚡ for showing up": once per launch, when the meter mounts (the reveal was reached)
    React.useEffect(() => {
        if (!eos.checkinEnabled) return
        const key = ctx.launchAt || launchKey
        if (EOS_SHIFT_PAID.has(key)) return
        EOS_SHIFT_PAID.add(key)
        if (EOS_SHIFT_PAID.size > 64) EOS_SHIFT_PAID.delete(EOS_SHIFT_PAID.values().next().value)
        try {
            live.current.addScore?.(25)
        } catch {}
        if (eosIsDev()) EOS_SHIFT_DEV.paid.push(key)
        eosShiftLog("paid", { key })
    }, [launchKey, eos.checkinEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

    // ---- cleanup: timers, the orb flight, the dust level
    React.useEffect(() => {
        const r = R.current
        return () => {
            r.timers.forEach((t) => clearTimeout(t))
            r.timers.clear()
            clearTimeout(r.settle)
            try {
                r.flyCancel?.()
            } catch {}
            try {
                eosApi("dots").setLevel?.(null)
            } catch {}
        }
    }, [])

    // ---- dev handle
    React.useEffect(() => {
        if (!eosIsDev()) return
        EOS_SHIFT_DEV.last = { step, variant: ctx.plan ? ctx.plan.variant : null, auto: !!(ctx.plan && ctx.plan.auto), emotion: ctx.emotion, gameId: ctx.gameId, before: ctx.before, guess: ctx.guess, band: ctx.band, after, shift: pay ? pay.shift : null, payPh }
    })

    const refBefore = ctx.before != null ? ctx.before : retroBefore != null ? retroBefore : ctx.guess

    // ---- record + payoff
    const commit = React.useCallback(
        (val) => {
            const r = R.current
            if (r.committed) return
            r.committed = true
            clearTimeout(r.settle)
            if (val != null) {
                const ss = Number(EOS_STORE.get().sessionStart) || 0
                if (EOS_SHIFT_RATED.session !== ss) Object.assign(EOS_SHIFT_RATED, { session: ss, n: 0 })
                EOS_SHIFT_RATED.n += 1
            }
            const opts = {}
            if (ctx.before == null && val != null) {
                opts.before = live.current.retroBefore != null ? live.current.retroBefore : ctx.guess
                opts.retro = true
            }
            let shift = null
            try {
                shift = EosRecordShift(val, opts)
            } catch {}
            try {
                eosApi("safety").soft?.(shift)
            } catch {}
            let grant = null
            try {
                grant = eosApi("rewards").grantForShift?.(shift) || null
            } catch {}
            const before = shift && shift.before != null ? shift.before : opts.before != null ? opts.before : ctx.before
            eosShiftLog("recorded", { after: val, before, retro: shift ? shift.retro : null })
            setPay({ shift, grant, before, after: val, skipped: val == null })
            setDisp(val == null || before == null ? val : before)
            setPayPh("count")
            setStep("payoff")
        },
        [ctx]
    )

    // count before → after (60 ms/step, soft ticks) → resolve (sting + chime + haptic) → orb flight → done
    React.useEffect(() => {
        if (step !== "payoff" || !pay) return
        const r = R.current
        const timers = []
        const T = (fn, ms) => timers.push(setTimeout(fn, ms))
        const safety = !!EOS_STORE.get().safety
        const resolve = () => {
            setPayPh("resolved")
            if (!pay.skipped) {
                eosShiftSting()
                try {
                    live.current.sfx?.("chime")
                } catch {}
                eosHaptic("finish")
                const d = pay.shift && pay.shift.delta
                if (d != null && d > 0 && !safety) eosShiftChord(ctx.emotion)
            } else eosTone(eosNote(5), 240, { type: "triangle", gain: 0.04 })
            T(() => {
                const from = stillRef.current && stillRef.current.offsetParent ? stillRef.current : charRef.current
                if (from) {
                    const tier = (pay.grant && pay.grant.orb && pay.grant.orb.tier) || "silver"
                    const faceId = pay.grant && pay.grant.orb && pay.grant.orb.face != null ? pay.grant.orb.face : ctx.e.calm
                    const fc = (pay.grant && pay.grant.orb && pay.grant.orb.char) || ctx.char
                    r.flyCancel = eosShiftFlyOrb({ from, face: eosFace(fc, faceId), tier, hue: ctx.e.hue, reduced: calm, sfx: live.current.sfx })
                }
            }, calm ? 200 : 520)
            T(() => setStep("done"), calm ? 450 : 760)
        }
        if (pay.skipped || pay.before == null || pay.after == null || pay.before === pay.after) {
            T(resolve, pay.skipped ? 120 : 260)
        } else {
            const dir = pay.after < pay.before ? -1 : 1
            const n = Math.abs(pay.after - pay.before)
            for (let i = 1; i <= n; i++)
                T(() => {
                    const val = pay.before + dir * i
                    setDisp(val)
                    eosTone(eosNote(Math.max(0, val) + 2, 262), 50, { type: "triangle", gain: 0.022 })
                }, i * EOS_SHIFT_TICK_MS + 140)
            T(resolve, n * EOS_SHIFT_TICK_MS + 260)
        }
        return () => timers.forEach((t) => clearTimeout(t))
    }, [step, pay]) // eslint-disable-line react-hooks/exhaustive-deps

    // ---- the dial turns the feeling down by hand (character + dust follow live)
    // The auto-commit waits while a finger is on a dial or the retro before-dial is open (✓ SET or "done" commits).
    const armSettle = () => {
        const r = R.current
        clearTimeout(r.settle)
        const arm = () => {
            r.settle = setTimeout(
                () => {
                    if (R.current.dialDown || R.current.retroOpen) return arm()
                    if (live.current.after != null) commit(live.current.after)
                },
                ctx.before == null ? EOS_SHIFT_SETTLE_RETRO_MS : EOS_SHIFT_SETTLE_MS
            )
        }
        arm()
    }
    const pauseSettle = () => clearTimeout(R.current.settle)
    const onDial = (n) => {
        setAfter(n)
        try {
            eosApi("dots").setLevel?.(n)
        } catch {}
        armSettle()
    }
    const toggleRetro = () => {
        const open = !R.current.retroOpen
        R.current.retroOpen = open
        setRetroOpen(open)
        if (open) pauseSettle()
        else if (live.current.after != null) armSettle() // "done": the payoff follows the usual settle
    }
    // focus moves to the dial once the rate step is up (never steals focus from a text field)
    React.useEffect(() => {
        if (step !== "rate") return
        const t = setTimeout(() => {
            const tr = dialRef.current && dialRef.current.querySelector(".eosDialTrack")
            if (tr && !eosShiftTextFocused()) {
                try {
                    tr.focus({ preventScroll: true })
                } catch {}
            }
        }, 60)
        return () => clearTimeout(t)
    }, [step])

    const e = ctx.e
    const emoId = ctx.emotion
    const safety = eos.safety
    const strong = eosSafetyStrong(safety)
    const better = ctx.better
    const shift = pay && pay.shift
    const delta = shift && shift.delta != null ? shift.delta : pay && pay.before != null && pay.after != null ? (better === "up" ? pay.after - pay.before : pay.before - pay.after) : null
    const resolved = step === "done" || (step === "payoff" && payPh === "resolved")
    const won = resolved && !pay?.skipped && delta != null && delta > 0
    const handBack = resolved && (won || pay?.skipped || !!safety)
    const HandHint = eosApi("arrows").EosHandHint
    const Share = eosApi("rewards").EosShareButton
    const sensitive = EOS_SHIFT_SENSITIVE.has(emoId)
    const rated = step === "done" ? eosShiftRatedThisSession() : 0
    const many = rated >= 3 || Date.now() - (eos.sessionStart || Date.now()) >= 10 * 60 * 1000
    const next = React.useMemo(() => (step === "done" ? eosShiftNext(ctx, delta) : null), [step, delta, ctx, eos.safety])
    const coolLabel = ctx.coolPath && next && Number(next.id) === 112

    // character on the meter: scale .85 + .04n, face loud → calm as n falls (rises for GOOD)
    const n = step === "rate" ? (after != null ? after : refBefore) : pay && pay.after != null ? pay.after : refBefore
    const calmness = step === "rate" ? eosShiftCalmness(after, refBefore, better) : resolved ? (won || safety ? 1 : 0.35) : eosShiftCalmness(pay && pay.after, refBefore, better)
    const isStillChar = ctx.char === "still"
    const charScale = handBack && !calm && !isStillChar ? 0.74 : 0.85 + 0.04 * (n == null ? 6 : n)
    const noun = emoId ? String(e.noun || e.label || "").toUpperCase() : "FEELING"
    const spark = emoId ? e.spark : "LIGHTER"
    const headText = (() => {
        if (!pay) return ""
        if (safety || pay.skipped) return "You showed up for yourself."
        if (pay.before == null) return `${noun} · ${pay.after}`
        return null // rendered with the live number
    })()
    const stampWord = better === "up" ? "BRIGHTER" : "LIGHTER"
    const tierWord = delta == null ? "" : delta >= 3 ? "big shift" : delta >= 1 ? (better === "up" ? "a little brighter" : "a little lighter") : "still here with you"
    const subLine = !pay
        ? ""
        : safety
          ? pay.before != null && pay.after != null
              ? `${noun} ${pay.before} → ${pay.after}`
              : ""
          : pay.skipped
            ? `${ctx.charName} is resting — you can come back any time.`
            : won
              ? isStillChar
                  ? `${ctx.charName} is glowing ✦`
                  : `${ctx.charName} handed back the controls ✦`
              : `${ctx.charName} is still here — that's okay. Some feelings need a different door.`
    let personal = ""
    if (won && !safety) {
        try {
            const fl = eos.flipKey && !strong ? eosApi("flip").line?.(eos.flipKey, emoId) : null
            personal = typeof fl === "string" && fl.trim() ? fl.trim() : EOS_SHIFT_LINES[emoId || "auto"] || ""
        } catch {
            personal = EOS_SHIFT_LINES[emoId || "auto"] || ""
        }
    }
    const openHelp = () => {
        try {
            const f = eosApi("safety").open
            if (typeof f === "function") {
                f("info")
                return
            }
        } catch {}
        setHelpOpen((x) => !x)
    }
    const picker = eosShiftPickerOn()
    const playNext = () => {
        try {
            if (!picker) return void live.current.onNext?.() // F3: the arcade serves the rotation's next pick
            if (next) live.current.onPlay?.(next)
            else live.current.onNext?.()
        } catch {}
    }
    const coolReplay = picker && ctx.coolReplay && !!eosShiftGame(112)
    const showRate = step === "rate"
    const showStage = step !== "moment"
    const chipVariant = ctx.plan && !ctx.plan.auto && !momentOn ? ctx.plan.variant : null
    if (!eos.checkinEnabled) return null // after every hook (the Framer control may flip at runtime)

    return (
        <div
            ref={setRoot}
            className={`eosShiftMeter fs-mask${calm ? " isCalm" : ""}${handBack ? " isHandBack" : ""}${won ? " isWon" : ""}${isStillChar ? " isSolo" : ""}`}
            data-step={step}
            data-eos-moment={ctx.plan ? ctx.plan.variant : "none"}
            data-eos-retro={ctx.before == null ? "1" : "0"}
            data-eos-cool-replay={coolReplay ? "1" : "0"}
            data-eos-safety={safety ? "1" : "0"}
            style={{ "--eos-h": e.hue, "--eos-l1": e.grade.loud[0], "--eos-l2": e.grade.loud[1], "--eos-c1": e.grade.calm[0], "--eos-c2": e.grade.calm[1] }}
            {...EOS_PRIVATE_ATTRS}
        >
            {step === "moment" && ctx.plan ? (
                <EosStillMoment
                    emotion={emoId}
                    gameId={ctx.gameId}
                    band={ctx.band}
                    variant={ctx.plan.variant}
                    reduced={reduced}
                    rainSfx={rainSfx}
                    onDone={() => {
                        setMomentOn(true)
                        setStep("rate")
                    }}
                />
            ) : null}

            {showStage ? (
                <div className="eosShiftStage" ref={stageRef} aria-hidden="true">
                    <i className="eosShiftHalo" style={{ opacity: 0.35 + 0.65 * calmness }} />
                    <div className="eosShiftChar" ref={charRef} style={{ "--s": charScale.toFixed(3) }}>
                        <div className="eosShiftCharIn">
                            <EosShiftFace
                                char={ctx.char}
                                loud={e.loud}
                                calmFace={won && isStillChar ? 59 : e.calm}
                                calmness={calmness}
                                grey={!!e.greyLoud && calmness < 0.5}
                            />
                        </div>
                        <small className="eosShiftTag">{ctx.charName}</small>
                    </div>
                    {!isStillChar ? (
                        <div className="eosShiftStill" ref={stillRef}>
                            <div className="eosShiftCharIn">
                                <EosShiftFace char="still" loud={EOS_GUIDE_CHAR.calm} calmFace={EOS_GUIDE_CHAR.calm} calmness={0} />
                            </div>
                            <small className="eosShiftTag isStill">STILL · at the controls</small>
                        </div>
                    ) : null}
                    {won && !safety && !calm ? (
                        <div className="eosShiftConfetti">
                            {Array.from({ length: 16 }, (_, i) => (
                                <i key={i} style={{ "--a": `${(i * 360) / 16 + eosNoise(i, 9) * 14}deg`, "--r": `${70 + eosNoise(i, 4) * 70}px`, "--d": `${eosNoise(i, 2) * 0.12}s`, "--c": i % 3 === 0 ? "var(--eos-gold-1)" : i % 3 === 1 ? "var(--eos-c1)" : "#fff" }} />
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {showRate ? (
                <div className="eosShiftRate">
                    {chipVariant ? (
                        <button
                            type="button"
                            className="eosShiftMomentChip"
                            onClick={() => {
                                pauseSettle() // a dial value set just before keeps; ✓ SET still works after the moment
                                setMomentOn(true)
                                setStep("moment")
                            }}
                        >
                            {EOS_SHIFT_COPY.chip[chipVariant]}
                        </button>
                    ) : null}
                    {ctx.before == null ? (
                        <div
                            className="eosShiftRetro"
                            onPointerDown={pauseSettle}
                            onPointerUp={() => {
                                if (!R.current.retroOpen && live.current.after != null) armSettle()
                            }}
                        >
                            <span>
                                you came in at about <b>{retroBefore != null ? retroBefore : ctx.guess}</b>
                            </span>
                            <span aria-hidden="true">·</span>
                            <button type="button" className="eosShiftLink" aria-expanded={retroOpen} onClick={toggleRetro}>
                                {retroOpen ? "done" : "change"}
                            </button>
                        </div>
                    ) : null}
                    {ctx.before == null && retroOpen ? (
                        <div className="eosShiftRetroDial" onPointerDown={pauseSettle}>
                            <EosIntensityDial
                                value={retroBefore != null ? retroBefore : ctx.guess}
                                onChange={(x) => {
                                    pauseSettle()
                                    setRetroBefore(x)
                                }}
                                emotion={emoId || "auto"}
                                min={0}
                                max={10}
                                label="When you came in, it was about…"
                                reduced={calm}
                                id="eosShiftBefore"
                            />
                        </div>
                    ) : null}
                    <div
                        className="eosShiftDialWrap"
                        ref={setDial}
                        onPointerDown={() => {
                            R.current.dialDown = true
                        }}
                        onPointerUp={() => {
                            R.current.dialDown = false
                        }}
                        onPointerCancel={() => {
                            R.current.dialDown = false
                        }}
                        onLostPointerCapture={() => {
                            R.current.dialDown = false
                        }}
                    >
                        <EosIntensityDial value={after} onChange={onDial} emotion={emoId || "auto"} min={0} max={10} ghost={refBefore} label={eosDialQuestion(emoId || "auto", "after")} reduced={calm} id="eosShiftDial" />
                    </div>
                    <div className="eosShiftRateRow">
                        <button type="button" className="eosShiftSet" disabled={after == null} aria-disabled={after == null} onClick={() => after != null && commit(after)}>
                            ✓ SET
                        </button>
                        <button type="button" className="eosShiftLink eosShiftSkip" onClick={() => commit(null)}>
                            skip
                        </button>
                    </div>
                </div>
            ) : null}

            {pay && (step === "payoff" || step === "done") ? (
                <div className="eosShiftPay">
                    <div className="eosShiftHead" aria-live="polite" aria-atomic="true">
                        {headText != null ? (
                            <b className="eosShiftHeadline">{headText}</b>
                        ) : (
                            <b className="eosShiftHeadline">
                                {noun} {pay.before} → <span className="eosShiftNum">{disp}</span>
                                {resolved && delta != null && delta > 0 ? ` · ${spark}` : ""}
                            </b>
                        )}
                    </div>
                    {resolved && !safety && !pay.skipped ? (
                        won ? (
                            <div className="eosShiftStamp" role="img" aria-label={`${delta} ${stampWord}, ${tierWord}`}>
                                <b>
                                    {delta} {stampWord} ✦
                                </b>
                                <small>{tierWord}</small>
                            </div>
                        ) : (
                            <div className="eosShiftStill2">{tierWord}</div>
                        )
                    ) : null}
                    {resolved && subLine ? <p className="eosShiftSub">{subLine}</p> : null}
                    {resolved && personal ? <p className="eosShiftLine">{personal}</p> : null}
                </div>
            ) : null}

            {step === "done" ? (
                <div className="eosShiftDone">
                    <p className="eosShiftRewards">{eosShiftRewardsLine(pay && pay.grant, ctx)}</p>
                    {many ? <p className="eosShiftMany">{rated >= 3 ? `You've shifted ${rated} times — nice. Take the calm with you?` : "You've given yourself real time — nice. Take the calm with you?"}</p> : null}
                    <div className={`eosShiftActions${many ? " isMany" : ""} n${safety || (Share && !sensitive && shift) ? 3 : 2}`}>
                        <button type="button" className="eosShiftBtn isGood" ref={setGoodEl} onClick={() => live.current.onDoneForNow?.()}>
                            <span>I'M GOOD ✓</span>
                        </button>
                        <button type="button" className={`eosShiftBtn isMore${many ? " isSecondary" : ""}`} onClick={playNext} data-eos-next={next ? next.id : ""}>
                            <span>{coolLabel ? "COOL IT DOWN ▶" : "ONE MORE ▶"}</span>
                            {next && picker ? <small>{next.name}</small> : null}
                        </button>
                        {safety ? (
                            <button type="button" className="eosShiftBtn isTalk" onClick={openHelp}>
                                <span>💛 Talk to someone</span>
                            </button>
                        ) : Share && !sensitive && shift ? (
                            <span className="eosShiftShare">
                                <Share shift={shift} />
                            </span>
                        ) : null}
                    </div>
                    <div className="eosShiftLinks">
                        {coolReplay ? (
                            <button
                                type="button"
                                className="eosShiftLink"
                                onClick={() => {
                                    const g = eosShiftGame(112)
                                    if (g) live.current.onPlay?.(g)
                                }}
                            >
                                ↻ cool it down
                            </button>
                        ) : null}
                        {!safety && Share && sensitive && shift ? (
                            <span className="eosShiftShareLink">
                                <Share shift={shift} variant="link" label="make a card" />
                            </span>
                        ) : null}
                        {!safety ? (
                            <button type="button" className="eosShiftLink" onClick={openHelp}>
                                Need to talk to someone?
                            </button>
                        ) : null}
                    </div>
                    {helpOpen ? <EosShiftHelp onClose={() => setHelpOpen(false)} /> : null}
                </div>
            ) : null}

            {HandHint && rootEl && step === "rate" && after == null && dialEl ? (
                <HandHint target={() => dialEl.querySelector(".eosDialTrack") || dialEl} root={rootEl} g="drag" dir="lr" d={120} label="SLIDE TO RIGHT NOW" reduced={calm} />
            ) : null}
            {HandHint && rootEl && step === "done" && goodEl ? <HandHint target={goodEl} root={rootEl} g="tap" label="ALL DONE?" reduced={calm} showAfterMs={6000} once /> : null}
        </div>
    )
}

// Fallback support lines when the safety module is not in the build (its card normally opens instead).
function EosShiftHelp({ onClose }) {
    const st = EOS_STORE.get()
    const lines = String(st.crisisLines || EOS_PROP_DEFAULTS.crisisLines)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    const url = String(st.crisisUrl || EOS_PROP_DEFAULTS.crisisUrl)
    const em = String(st.emergencyText || EOS_PROP_DEFAULTS.emergencyText)
    return (
        <div className="eosShiftHelp" role="group" aria-label="Someone to talk to">
            <b>You don't have to carry it alone.</b>
            <ul>
                {lines.map((l) => (
                    <li key={l}>{l}</li>
                ))}
            </ul>
            {/^https?:\/\//.test(url) ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    {url.replace(/^https?:\/\//, "")}
                </a>
            ) : null}
            <small>{em}</small>
            <button type="button" className="eosShiftLink" onClick={onClose}>
                close
            </button>
        </div>
    )
}

// ---------------------------------------------------------------- CSS (eosCss key = "shift")
const EOS_SHIFT_M = `${EOS_A} .eosShiftMeter`
const EOS_SHIFT_SM = `${EOS_A} .eosStillMoment`
const EOS_SHIFT_CSS = `
/* declutter (E6): the old yes/no question goes while the meter is present; the old reveal copy,
   PREVIOUS / NEXT and the floating faces step back until the payoff is done (they return after). */
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter) .releaseShiftCheck>:is(strong,.releaseShiftChoices){display:none!important}
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter) .releaseShiftCheck{padding:6px!important;background:none!important;border-color:transparent!important;box-shadow:none!important}
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter:not([data-step="done"]))>:is(small,.releasePersistentFinalMessage){display:none!important}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter:not([data-step="done"]))>.releaseCompleteSideNav{visibility:hidden!important;pointer-events:none!important}
${EOS_A}.stage-reveal:has(.eosShiftMeter:not([data-step="done"])) .arcadeCharacterAtmosphere{opacity:.3!important;transition:opacity .5s ease}
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter[data-eos-cool-replay="1"]) .releaseReplaySame{display:none!important}
${EOS_A}.stage-reveal .releaseCompleteOverlay:has(.eosShiftMeter){overflow-y:auto!important;overscroll-behavior:contain}
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter){overflow:hidden!important}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter){width:min(840px,100%)!important}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter)>.releaseCompleteCard{margin-inline:auto!important}
@media (min-width:561px){
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter){display:grid!important;grid-template-columns:84px minmax(0,1fr) 84px!important;gap:14px!important;align-items:center!important;margin-inline:auto!important}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter)>.releaseCompleteCard{grid-row:1!important;grid-column:2!important;max-width:100%!important}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter)>.releaseCompleteSideNav{grid-row:1!important;justify-self:center}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter)>.releaseCompleteSideNav:first-child{grid-column:1!important}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter)>.releaseCompleteSideNav:last-child{grid-column:3!important}
}
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter)>strong{font-size:clamp(17px,2vw,24px)!important}
@media (max-width:560px){
${EOS_A}.stage-reveal .releaseCompleteOverlay:has(.eosShiftMeter){padding:10px 8px!important;grid-template-columns:minmax(0,1fr)!important}
${EOS_A}.stage-reveal:has(.eosWorldChips) .releaseCompleteOverlay:has(.eosShiftMeter){padding-top:60px!important;scroll-padding-top:60px;-webkit-mask-image:linear-gradient(to bottom,transparent 0,transparent 52px,#000 60px);mask-image:linear-gradient(to bottom,transparent 0,transparent 52px,#000 60px)}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter){display:grid!important;width:100%!important;max-width:none!important;grid-template-columns:1fr 1fr!important;gap:8px!important;align-self:start}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter)>.releaseCompleteCard{grid-column:1/-1!important;grid-row:1!important;width:100%!important;max-width:none!important;padding:16px 12px!important}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter)>.releaseCompleteSideNav{grid-row:2!important;width:100%!important;height:44px!important;font-size:12px!important}
${EOS_A}.stage-reveal .releaseCompleteShell:has(.eosShiftMeter:not([data-step="done"]))>.releaseCompleteSideNav{display:none!important}
/* the old reveal copy comes back BELOW the meter on phone, so the payoff never jumps down when it returns */
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter)>:is(small,.releasePersistentFinalMessage){order:2}
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter)>.releaseShiftCheck{order:3}
${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter[data-step="done"])>:is(small,.releasePersistentFinalMessage){animation:eosShiftFade .5s ease .2s both}
}

${EOS_SHIFT_M}{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;font-family:var(--eos-font);color:#fff;text-align:center;isolation:isolate}
${EOS_SHIFT_M} :is(p,b,small,span){font-family:var(--eos-font)}
${EOS_SHIFT_M} p{margin:0!important;max-width:520px}
${EOS_SHIFT_M} button{font-family:var(--eos-font)!important;-webkit-tap-highlight-color:transparent}
${EOS_SHIFT_M} button:focus-visible{outline:3px solid var(--eos-gold-1)!important;outline-offset:3px}
${EOS_SHIFT_M} .eosShiftLink{min-height:44px;padding:0 10px!important;border:0!important;background:none!important;box-shadow:none!important;color:rgba(225,238,255,.88)!important;font:800 13px/1.1 var(--eos-font)!important;letter-spacing:.03em!important;text-decoration:underline;text-decoration-color:rgba(255,255,255,.35);text-underline-offset:4px;cursor:pointer;text-transform:none!important;width:auto!important;height:auto!important}
${EOS_SHIFT_M} .eosShiftLink:hover{color:#fff!important;text-decoration-color:var(--eos-gold-1)}

/* character stage: the feeling in the middle, turned down by the dial; at the payoff it steps aside and STILL takes the controls */
${EOS_SHIFT_M} .eosShiftStage{position:relative;width:100%;height:150px;flex:none;pointer-events:none}
${EOS_SHIFT_M} .eosShiftHalo{position:absolute;left:50%;top:46%;width:230px;height:150px;translate:-50% -50%;border-radius:50%;background:radial-gradient(closest-side,var(--eos-c1),transparent);filter:blur(8px);opacity:.4;transition:opacity .6s ease}
${EOS_SHIFT_M} .eosShiftChar,${EOS_SHIFT_M} .eosShiftStill{position:absolute;left:50%;top:0;display:flex;flex-direction:column;align-items:center;gap:6px;translate:-50% 0;transition:transform .7s cubic-bezier(.3,1.25,.4,1),opacity .5s ease,translate .7s cubic-bezier(.3,1.25,.4,1)}
${EOS_SHIFT_M} .eosShiftCharIn{--eos-orb:104px;transform:scale(var(--s,1));transform-origin:50% 60%;transition:transform .35s cubic-bezier(.3,1.5,.4,1)}
${EOS_SHIFT_M} .eosShiftChar{transform:translateX(0)}
${EOS_SHIFT_M} .eosShiftChar .eosShiftCharIn{transform:scale(var(--s,1))}
${EOS_SHIFT_M} .eosShiftStill{opacity:0;transform:translateY(16px) scale(.6)}
${EOS_SHIFT_M} .eosShiftStill .eosShiftCharIn{--eos-orb:104px}
${EOS_SHIFT_M} .eosShiftBall{position:relative}
${EOS_SHIFT_M} .eosShiftBall .eosOrbFace{transition:opacity .45s ease}
${EOS_SHIFT_M} .eosShiftBall.isGrey .eosShiftFaceLoud{filter:grayscale(1) brightness(.85)}
${EOS_A} .eosShiftBall .eosShiftFallFace{position:absolute;inset:16%;width:68%;height:68%;fill:none;stroke:#fff;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
${EOS_SHIFT_M} .eosShiftTag{font:900 13px/1 var(--eos-font)!important;letter-spacing:.08em;color:hsl(var(--eos-h),100%,86%);padding:4px 8px;border-radius:999px;background:rgba(8,10,34,.72);white-space:nowrap;transition:opacity .4s ease}
${EOS_SHIFT_M} .eosShiftTag.isStill{color:var(--eos-gold-1)}
/* .isSolo = the feeling's character IS STILL (GOOD / NOT SURE): it stays centred, glowing and labelled (no hand-back) */
${EOS_SHIFT_M}.isHandBack:not(.isSolo) .eosShiftChar{transform:translateX(-118px)}
${EOS_SHIFT_M}.isHandBack:not(.isSolo) .eosShiftChar .eosShiftCharIn{transform:scale(.7)}
${EOS_SHIFT_M}.isHandBack .eosShiftStill{opacity:1;transform:translateY(0) scale(1)}
${EOS_SHIFT_M}.isHandBack:not(.isSolo) .eosShiftChar .eosShiftTag{opacity:0}
${EOS_SHIFT_M}.isHandBack:not(.isWon):not(.isSolo) .eosShiftChar{transform:translateX(-96px)}
${EOS_SHIFT_M}.isHandBack.isWon .eosShiftStill .eosOrbBall{box-shadow:inset 0 -8px 18px rgba(20,8,48,.45),0 0 0 3px var(--eos-gold-1),0 0 50px rgba(255,214,110,.75)}
${EOS_SHIFT_M}.isSolo.isWon .eosShiftChar .eosOrbBall{box-shadow:inset 0 -8px 18px rgba(20,8,48,.45),0 0 0 3px var(--eos-gold-1),0 0 50px rgba(255,214,110,.75)}
${EOS_SHIFT_M} .eosShiftConfetti{position:absolute;left:50%;top:52px;width:0;height:0}
${EOS_SHIFT_M} .eosShiftConfetti i{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:2px;background:var(--c);opacity:0;animation:eosShiftConfetti 1.1s cubic-bezier(.2,.8,.3,1) var(--d) 1 both}
@keyframes eosShiftConfetti{0%{opacity:0;transform:rotate(var(--a)) translateY(0) scale(.4)}15%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(calc(-1 * var(--r))) rotate(220deg) scale(1)}}

/* rate */
${EOS_SHIFT_M} .eosShiftRate{width:100%;display:flex;flex-direction:column;align-items:center;gap:8px}
${EOS_SHIFT_M} .eosShiftDialWrap{width:min(100%,520px);display:flex;justify-content:center}
${EOS_SHIFT_M} .eosShiftDialWrap .eosDial{width:100%}
${EOS_SHIFT_M} .eosDialTrack .eosDialSeg span{font-size:13.5px!important}
${EOS_SHIFT_M} .eosShiftRetro{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;padding:0 12px;border-radius:999px;background:rgba(255,229,138,.1);border:1px solid rgba(255,229,138,.3);font:700 13px/1.2 var(--eos-font);color:#fff3cf}
${EOS_SHIFT_M} .eosShiftRetro b{font:900 var(--eos-fs-num)/1 var(--eos-font);color:var(--eos-gold-1)}
${EOS_SHIFT_M} .eosShiftRetroDial{width:min(100%,420px)}
${EOS_SHIFT_M} .eosShiftRetroDial .eosDialReadout{min-height:32px}
${EOS_SHIFT_M} .eosShiftRateRow{display:flex;align-items:center;justify-content:center;gap:14px}
${EOS_SHIFT_M} .eosShiftSet{min-height:48px;min-width:140px;padding:0 22px!important;border-radius:999px!important;border:0!important;background:linear-gradient(180deg,var(--eos-gold-1),var(--eos-gold-2) 60%,var(--eos-gold-3))!important;color:#2a1600!important;font:900 var(--eos-fs-md)/1 var(--eos-font)!important;letter-spacing:.06em!important;box-shadow:0 5px 0 #a8541a,0 10px 24px rgba(255,160,60,.35)!important;cursor:pointer;transition:transform .12s ease,opacity .2s ease,filter .2s ease!important;text-shadow:none!important}
${EOS_SHIFT_M} .eosShiftSet:active{transform:translateY(3px)}
${EOS_SHIFT_M} .eosShiftSet:disabled{opacity:.42;filter:saturate(.3);cursor:default;box-shadow:0 5px 0 rgba(90,60,30,.6)!important}
${EOS_SHIFT_M} .eosShiftMomentChip{min-height:44px;padding:0 18px!important;border-radius:999px!important;border:1px solid rgba(255,229,138,.5)!important;background:rgba(255,229,138,.12)!important;color:#fff3cf!important;font:900 var(--eos-fs-md)/1 var(--eos-font)!important;letter-spacing:.03em!important;cursor:pointer;box-shadow:0 0 18px rgba(255,214,110,.18)!important}

/* payoff */
${EOS_SHIFT_M} .eosShiftPay{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%}
${EOS_SHIFT_M} .eosShiftHeadline{display:block;font:900 clamp(24px,3.2vw,38px)/1.05 var(--eos-font)!important;letter-spacing:.02em;color:#fff;text-shadow:0 3px 0 rgba(20,8,48,.55),0 0 26px hsla(var(--eos-h),100%,70%,.35);font-variant-numeric:tabular-nums}
${EOS_SHIFT_M} .eosShiftNum{display:inline-block;min-width:.6em;color:var(--eos-gold-1)}
${EOS_SHIFT_M} .eosShiftStamp{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 18px 7px;border-radius:14px;border:3px solid var(--eos-gold-1);background:linear-gradient(180deg,rgba(255,229,138,.18),rgba(255,138,46,.12));transform:rotate(-4deg);box-shadow:0 0 0 2px rgba(42,22,0,.4),0 0 30px rgba(255,190,80,.35);animation:eosShiftStamp .5s cubic-bezier(.2,1.6,.4,1) both}
${EOS_SHIFT_M} .eosShiftStamp b{font:900 clamp(22px,2.6vw,30px)/1 var(--eos-font)!important;letter-spacing:.06em;background:linear-gradient(180deg,#fff7c8,#ffd04a 55%,#ff9a2e);-webkit-background-clip:text;background-clip:text;color:transparent!important}
${EOS_SHIFT_M} .eosShiftStamp small{font:800 13px/1 var(--eos-font)!important;letter-spacing:.12em;text-transform:uppercase;color:#ffe9b0}
${EOS_SHIFT_M} .eosShiftStill2{font:800 var(--eos-fs-md)/1.2 var(--eos-font);color:rgba(230,240,255,.9);letter-spacing:.04em}
@keyframes eosShiftStamp{0%{opacity:0;transform:rotate(-14deg) scale(2.1)}60%{opacity:1;transform:rotate(-3deg) scale(.92)}100%{opacity:1;transform:rotate(-4deg) scale(1)}}
${EOS_SHIFT_M} .eosShiftSub{font:800 var(--eos-fs-md)/1.3 var(--eos-font)!important;color:#fff;animation:eosShiftRise .5s ease .12s both}
${EOS_SHIFT_M} .eosShiftLine{font:700 14px/1.3 var(--eos-font)!important;font-style:italic;color:rgba(225,238,255,.85);animation:eosShiftRise .5s ease .3s both}
@keyframes eosShiftRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* done: rewards line, at most 3 buttons, quiet links */
${EOS_SHIFT_M} .eosShiftDone{width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;animation:eosShiftRise .45s ease both}
${EOS_SHIFT_M} .eosShiftRewards{font:800 13px/1.35 var(--eos-font)!important;letter-spacing:.03em;color:#ffe9b0}
${EOS_SHIFT_M} .eosShiftMany{font:800 var(--eos-fs-md)/1.3 var(--eos-font)!important;color:#fff}
${EOS_SHIFT_M} .eosShiftActions{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;width:min(100%,600px)}
${EOS_SHIFT_M} .eosShiftBtn{position:relative;min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px 14px!important;border-radius:16px!important;cursor:pointer;font:900 var(--eos-fs-md)/1 var(--eos-font)!important;letter-spacing:.06em!important;text-shadow:none!important;transition:transform .12s ease,filter .2s ease!important;width:100%!important;height:auto!important}
${EOS_SHIFT_M} .eosShiftBtn:active{transform:translateY(3px)}
${EOS_SHIFT_M} .eosShiftBtn:hover{filter:brightness(1.08)}
${EOS_SHIFT_M} .eosShiftBtn small{font:800 13px/1.1 var(--eos-font)!important;letter-spacing:.05em;opacity:.9;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${EOS_SHIFT_M} .eosShiftBtn.isGood{border:0!important;background:linear-gradient(180deg,var(--eos-gold-1),var(--eos-gold-2) 60%,var(--eos-gold-3))!important;color:#2a1600!important;box-shadow:0 5px 0 #a8541a,0 12px 28px rgba(255,160,60,.35)!important}
${EOS_SHIFT_M} .eosShiftBtn.isMore{border:2px solid hsla(var(--eos-h),100%,75%,.55)!important;background:linear-gradient(180deg,hsla(var(--eos-h),80%,45%,.55),hsla(var(--eos-h),80%,25%,.55))!important;color:#fff!important;box-shadow:0 5px 0 rgba(6,6,30,.6)!important}
${EOS_SHIFT_M} .eosShiftBtn.isMore small{white-space:normal;text-overflow:clip;overflow:visible;line-height:1.15!important;overflow-wrap:anywhere}
${EOS_SHIFT_M} .eosShiftBtn.isMore.isSecondary{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.25)!important;box-shadow:none!important;min-height:48px}
${EOS_SHIFT_M} .eosShiftBtn.isTalk{border:2px solid rgba(255,214,110,.7)!important;background:rgba(255,214,110,.14)!important;color:#fff3cf!important;box-shadow:0 5px 0 rgba(60,40,0,.5)!important;letter-spacing:.02em!important}
${EOS_SHIFT_M} .eosShiftShare{display:flex}
${EOS_SHIFT_M} .eosShiftShare>*{width:100%;min-height:54px}
${EOS_SHIFT_M} .eosShiftLinks{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2px 10px}
${EOS_SHIFT_M} .eosShiftShareLink :is(button,a){min-height:44px;padding:0 10px!important;border:0!important;background:none!important;box-shadow:none!important;color:rgba(225,238,255,.88)!important;font:800 13px/1.1 var(--eos-font)!important;text-decoration:underline;text-underline-offset:4px;width:auto!important}
${EOS_SHIFT_M} .eosShiftHelp{width:min(100%,460px);display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 14px;border-radius:16px;background:rgba(255,214,110,.1);border:1px solid rgba(255,214,110,.35);text-align:center}
${EOS_SHIFT_M} .eosShiftHelp b{font:900 var(--eos-fs-md)/1.2 var(--eos-font)}
${EOS_SHIFT_M} .eosShiftHelp ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;font:700 13px/1.3 var(--eos-font);color:#fff3cf}
${EOS_SHIFT_M} .eosShiftHelp a{color:var(--eos-gold-1);font:800 13px/1.2 var(--eos-font);min-height:44px;display:inline-flex;align-items:center}
${EOS_SHIFT_M} .eosShiftHelp small{font:700 13px/1.3 var(--eos-font)!important;letter-spacing:.02em!important;color:rgba(230,240,255,.85)}

/* ---- the Still Moment */
${EOS_SHIFT_SM}{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;gap:6px;user-select:none;-webkit-user-select:none}
${EOS_SHIFT_SM} .eosSmHead{display:flex;align-items:center;justify-content:center;gap:10px;min-height:28px;padding:0 6px}
${EOS_SHIFT_SM} .eosSmTitle{font:900 var(--eos-fs-md)/1.2 var(--eos-font)!important;letter-spacing:.04em;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6);max-width:460px}
${EOS_SHIFT_SM}.is-sigh .eosSmTitle,${EOS_SHIFT_SM}.is-cool .eosSmTitle,${EOS_SHIFT_SM}.is-spark .eosSmTitle{text-transform:uppercase;letter-spacing:.08em}
${EOS_SHIFT_SM} .eosSmPips{display:inline-flex;gap:6px}
${EOS_SHIFT_SM} .eosSmPips i{width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,.6);transition:background .3s ease}
${EOS_SHIFT_SM} .eosSmPips i.cur{border-color:var(--eos-c1);box-shadow:0 0 10px var(--eos-c1)}
${EOS_SHIFT_SM} .eosSmPips i.on{background:var(--eos-c1);border-color:var(--eos-c1)}
${EOS_SHIFT_SM} .eosSmStage{position:relative;width:100%;height:236px;display:grid;place-items:center;overflow:visible}
${EOS_SHIFT_SM} .eosSmGlow{position:absolute;left:50%;top:50%;width:min(92%,420px);height:220px;translate:-50% -50%;border-radius:50%;filter:blur(18px);pointer-events:none;transition:opacity .5s linear}
${EOS_SHIFT_SM} .eosSmGlowLoud{background:radial-gradient(closest-side,var(--eos-l2),var(--eos-l1) 55%,transparent);opacity:.55}
${EOS_SHIFT_SM} .eosSmGlowCalm{background:radial-gradient(closest-side,var(--eos-c2),var(--eos-c1) 55%,transparent)}
${EOS_SHIFT_SM} .eosSmMover{position:relative;width:180px;height:180px;display:grid;place-items:center;transition-property:transform;will-change:transform}
${EOS_SHIFT_SM} .eosSmRing{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);pointer-events:none;overflow:visible}
${EOS_SHIFT_SM} .eosSmRingBg{fill:none;stroke:rgba(255,255,255,.14);stroke-width:7}
${EOS_SHIFT_SM} .eosSmRingFill{fill:none;stroke:var(--eos-gold-1);stroke-width:7;stroke-linecap:round;transition-property:stroke-dashoffset;filter:drop-shadow(0 0 6px rgba(255,214,110,.8))}
${EOS_SHIFT_SM}.is-cool .eosSmRingFill{stroke:var(--eos-c1);filter:drop-shadow(0 0 6px var(--eos-c1))}
${EOS_SHIFT_SM}.is-heart .eosSmRingFill{stroke:#ffb59a;filter:drop-shadow(0 0 8px rgba(255,170,140,.9))}
${EOS_SHIFT_SM} .eosSmOrb{position:relative;display:grid;place-items:center;width:var(--eos-orb);height:var(--eos-orb);min-width:44px;min-height:44px;padding:0!important;margin:0;border:0!important;border-radius:50%!important;background:none!important;box-shadow:none!important;cursor:pointer;touch-action:none;-webkit-touch-callout:none}
${EOS_SHIFT_SM} .eosSmHintAt{position:absolute;left:72%;top:72%;width:30px;height:30px;translate:-50% -50%;pointer-events:none;z-index:-1}
${EOS_SHIFT_SM} .eosSmOrb:focus-visible{outline:3px solid var(--eos-gold-1)!important;outline-offset:6px}
${EOS_SHIFT_SM} .eosSmThump{display:block;border-radius:50%}
${EOS_SHIFT_SM} .eosSmFaceWrap{--eos-orb:inherit;width:var(--eos-orb);height:var(--eos-orb)}
${EOS_SHIFT_SM} .eosSmFaceWrap .eosOrbFace{transition:opacity var(--eos-sm-fade,.5s) linear}
${EOS_SHIFT_SM}[data-phase="out"] .eosSmFaceWrap .eosOrbFace{--eos-sm-fade:4.4s}
${EOS_SHIFT_SM} .eosShiftBall.isGrey .eosShiftFaceLoud{filter:grayscale(1) brightness(.85)}
${EOS_SHIFT_SM}[data-phase="sip"] .eosSmFaceWrap,${EOS_SHIFT_SM}[data-phase="top"] .eosSmFaceWrap{box-shadow:inset 0 -8px 18px rgba(20,8,48,.45),0 0 0 3px var(--eos-gold-1),0 0 46px rgba(255,214,110,.7)}
${EOS_SHIFT_SM} .eosSmTrail{position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:radial-gradient(circle,#fff,var(--eos-c1) 60%,transparent);opacity:0;pointer-events:none;animation:eosShiftTrail 1.5s linear calc(var(--i) * .27s) 2 both}
@keyframes eosShiftTrail{0%{opacity:0;transform:rotate(var(--a)) translateX(40px) scale(.6)}20%{opacity:.95}100%{opacity:0;transform:rotate(var(--a)) translateX(170px) scale(1.3)}}
${EOS_SHIFT_SM} .eosSmRipple{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px;border-radius:50%;border:3px solid rgba(255,190,160,.75);opacity:0;pointer-events:none;animation:eosShiftRipple .95s ease-out 1 both}
@keyframes eosShiftRipple{0%{opacity:.85;transform:scale(.85)}100%{opacity:0;transform:scale(1.55)}}
${EOS_SHIFT_SM} .eosSmBeat{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px;border-radius:50%;border:3px solid var(--eos-c1);pointer-events:none;animation:eosShiftBeat .667s ease-out infinite}
${EOS_SHIFT_SM} .eosSmBeat.isCalm{animation-name:eosShiftBeatCalm}
@keyframes eosShiftBeat{0%{opacity:.9;transform:scale(.86)}100%{opacity:0;transform:scale(1.5)}}
@keyframes eosShiftBeatCalm{0%,100%{opacity:.25}20%{opacity:.9}}
${EOS_SHIFT_SM} .eosSmSpark{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px;border-radius:50%;background:radial-gradient(circle,#fff,var(--eos-gold-1) 55%,transparent);pointer-events:none;animation:eosShiftSpark .7s ease-out 1 both}
@keyframes eosShiftSpark{0%{opacity:1;transform:rotate(var(--a)) translateX(50px) scale(.6)}100%{opacity:0;transform:rotate(var(--a)) translateX(118px) scale(1.2)}}
${EOS_SHIFT_SM} .eosSmCaption{display:flex;align-items:baseline;justify-content:center;gap:10px;min-height:26px;font:900 var(--eos-fs-md)/1.2 var(--eos-font);letter-spacing:.04em;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.55)}
${EOS_SHIFT_SM} .eosSmCount{font:900 var(--eos-fs-num)/1 var(--eos-font);color:var(--eos-gold-1);font-variant-numeric:tabular-nums}
${EOS_SHIFT_SM} .eosSmSkip{min-height:44px;padding:0 14px!important;border:0!important;background:none!important;box-shadow:none!important;color:rgba(225,238,255,.85)!important;font:800 13px/1 var(--eos-font)!important;letter-spacing:.06em!important;cursor:pointer;width:auto!important;height:auto!important;text-shadow:none!important}
${EOS_SHIFT_SM} .eosSmSkip:hover{color:#fff!important}
${EOS_SHIFT_SM}.isCalm .eosSmMover{transition-property:transform,opacity}
${EOS_SHIFT_SM}.isCalm .eosSmRingFill{transition-property:stroke-dashoffset}

/* the flying memory orb + the chip's "+1" (appended to .releaseStage, removed after landing) */
${EOS_A} .eosShiftFly{position:absolute;width:0;height:0;pointer-events:none;transform:translate(-50%,-50%)}
${EOS_A} .eosShiftFlyBall{position:absolute;left:-28px;top:-28px;width:56px;height:56px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.6),rgba(255,255,255,0) 28%),radial-gradient(circle at 50% 62%,hsla(var(--eos-h),95%,62%,.95),hsla(var(--eos-h),90%,30%,1) 70%);box-shadow:0 0 0 3px #d9e3f0,0 0 26px rgba(255,255,255,.6),0 10px 18px rgba(0,0,0,.4)}
${EOS_A} .eosShiftFlyBall.is-gold{box-shadow:0 0 0 3px var(--eos-gold-1),0 0 30px rgba(255,214,110,.9),0 10px 18px rgba(0,0,0,.4)}
${EOS_A} .eosShiftFlyBall img{position:absolute;inset:8%;width:84%;height:84%;object-fit:contain}
${EOS_A} .eosShiftPlus{position:absolute;transform:translate(-50%,0);padding:4px 9px;border-radius:999px;background:linear-gradient(180deg,var(--eos-gold-1),var(--eos-gold-2));color:#2a1600;font:900 15px/1 var(--eos-font,"Baloo 2",sans-serif);pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.35)}

@media (max-width:560px){
${EOS_SHIFT_M}{gap:8px}
${EOS_SHIFT_M} .eosShiftStage{height:132px}
${EOS_SHIFT_M} .eosShiftCharIn,${EOS_SHIFT_M} .eosShiftStill .eosShiftCharIn{--eos-orb:88px}
${EOS_SHIFT_M}.isHandBack:not(.isSolo) .eosShiftChar{transform:translateX(-84px)}
${EOS_SHIFT_M}.isHandBack:not(.isWon):not(.isSolo) .eosShiftChar{transform:translateX(-74px)}
${EOS_SHIFT_M} .eosShiftActions{grid-template-columns:1fr 1fr;gap:8px}
${EOS_SHIFT_M} .eosShiftActions>.isGood,${EOS_SHIFT_M} .eosShiftActions.n2>*{grid-column:1/-1}
${EOS_SHIFT_M} .eosShiftActions.isMany>.isGood{grid-column:1/-1}
${EOS_SHIFT_M} .eosShiftBtn{min-height:50px;padding:6px 8px!important}
${EOS_SHIFT_M} .eosShiftHeadline{font-size:clamp(22px,7vw,30px)!important}
${EOS_SHIFT_SM} .eosSmStage{height:212px}
${EOS_SHIFT_SM} .eosSmMover{width:164px;height:164px}
${EOS_SHIFT_SM} .eosSmOrb{--eos-orb:112px!important}
}
@media (prefers-reduced-motion:reduce){
${EOS_SHIFT_M} :is(.eosShiftChar,.eosShiftStill,.eosShiftCharIn){transition:opacity .4s ease!important}
${EOS_SHIFT_M}.isHandBack:not(.isSolo) .eosShiftChar{transform:none;opacity:0}
${EOS_SHIFT_M} :is(.eosShiftStamp,.eosShiftSub,.eosShiftLine,.eosShiftDone){animation:eosShiftFade .4s ease both!important}
${EOS_SHIFT_SM} .eosSmMover{transition-property:opacity!important}
}
${EOS_SHIFT_M}.isCalm :is(.eosShiftChar,.eosShiftStill,.eosShiftCharIn){transition:opacity .4s ease!important}
${EOS_SHIFT_M}.isCalm.isHandBack:not(.isSolo) .eosShiftChar{transform:none;opacity:0}
${EOS_SHIFT_M}.isCalm .eosShiftStill{transform:none}
${EOS_SHIFT_M}.isCalm :is(.eosShiftStamp,.eosShiftSub,.eosShiftLine,.eosShiftDone){animation:eosShiftFade .4s ease both!important}
${EOS_SHIFT_M}.isCalm .eosShiftStamp{transform:rotate(-4deg)}
@keyframes eosShiftFade{from{opacity:0}to{opacity:1}}
`
eosCss("shift", EOS_SHIFT_CSS)

eosExpose("shift", {
    EosShiftMeter,
    EosStillMoment,
    EOS_SHIFT_CSS,
    plan: eosShiftMomentPlan,
    context: eosShiftContext,
    next: eosShiftNext,
    weekDays: eosShiftWeekDays,
    rewardsLine: eosShiftRewardsLine,
    flyOrb: eosShiftFlyOrb,
    dev: EOS_SHIFT_DEV,
})
