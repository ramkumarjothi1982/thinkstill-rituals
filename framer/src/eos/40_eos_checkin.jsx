// ===================================================================================
// EOS · 40 CHECK-IN — "Who's at the controls?" (docs/EOS_SPEC.md §2.1, §2.2, §2.5, §6.2, §6.3, §6.5)
// Task `checkin`. Exports: EosCheckIn, EosCheckInChip, EosCompanion, EOS_CHECKIN_CSS.
//   * EosCheckIn — the emotion-first ring on the input stage: 8 character orbs around the Still Point,
//     STILL in the centre as NOT SURE, PANIC = one-tap express, long-press any orb = express, "more feelings",
//     "☀ good day? bank it", dial step with the feeling's own question, LET'S SHIFT IT ▶ orb-dive launch,
//     footer (just let me play · Need to talk to someone? · about ThinkStill · ◐ calm visuals), cold open,
//     live "sounds like ANGER?" hint from the composer, deep link ?eos=anger&t=41.
//   * EosCheckInChip — "How are you feeling?" pill (skip phase) that reopens the check-in.
//   * EosCompanion — the feeling's character riding along during play; its face walks loud → soft → calm
//     with the progress bar (anger in a discharge game: loud → spent, "nice hit — now let it cool").
// Calls other modules only through eosApi(...)?.(): arrows (EosHandHint), router (EosRoutePreview),
// dots (setLevel), safety (open). Every one of them may be missing (isolated builds) → built-in fallbacks.
// Never stores user text: only emotion ids, numbers and booleans reach the store / prefs.
// ===================================================================================

const EOS_CHECKIN_RING = EOS_EMOTIONS.filter((e) => e.primary).map((e) => e.id)
const EOS_CHECKIN_MORE = ["fear", "jealous", "numb"]
const EOS_CHECKIN_LONG_MS = 550 //   long-press = express launch
const EOS_CHECKIN_DIVE_MS = 600 //   orb-dive radial wipe
const EOS_CHECKIN_LAUNCH_MS = 520 // the launch fires inside the wipe
const EOS_CHECKIN_GOOD_GAME = 117 // COLOUR RUSH (release 2) — falls back to the router when not registered
// Ring angles (deg, 0 = right, clockwise): two above, two on each side, two below — never one orb on top.
const EOS_CHECKIN_ANGLES = [-110, -70, -30, 30, 70, 110, 150, 210]
// Chord root per feeling (Hz) — a soft open-fifth chord "in the emotion's key".
const EOS_CHECKIN_ROOT = { panic: 293.66, anger: 220, anxiety: 246.94, overthinking: 261.63, overwhelm: 196, sad: 174.61, lonely: 164.81, shame: 207.65, fear: 233.08, jealous: 277.18, numb: 185, good: 329.63, auto: 261.63 }
// The companion's own voice (every 3rd progress step) — §6.5.
const EOS_CHECKIN_VOICE = { rush: "phew… cooling", sync: "slower… nice", glitch: "static clearing…", loopie: "loop… broken!", drop: "let it rain", patch: "you're doing okay", still: "look at you go" }
const EOS_CHECKIN_SPENT_LINE = "nice hit — now let it cool"
const EOS_CHECKIN_COLD_LINE = "Hi, I'm Still. Your feelings are a crew. Tap whoever's loudest."

function eosCheckinEmo(id) {
    return EOS_EMO[id] || EOS_GUIDE_CHAR
}
// Faces for a character: loud (the feeling), soft (a quieter negative face), spent (a low-energy negative
// face for anger after a smash), calm (the feeling's target face; numb → the awake face 61).
function eosCheckinFaces(emotionId) {
    const e = eosCheckinEmo(emotionId)
    const char = e.char || "still"
    let neg = []
    try {
        const win = new Set(eosFacePool(char, "win"))
        neg = eosFacePool(char, "negative").filter((f) => f !== e.loud && !win.has(f))
    } catch {}
    const soft = neg.length ? neg[0] : e.loud
    const spent = neg.length > 1 ? neg[1] : soft
    return { char, loud: e.loud, soft, spent, calm: e.calm }
}
// "nervous · what-ifs" → two no-wrap chunks, so a narrow phone cell breaks at the dot, never inside "what-ifs"
function eosCheckinSub(txt) {
    const parts = String(txt || "").split(" · ")
    const out = []
    parts.forEach((part, i) => {
        if (i) out.push(" ")
        out.push(
            <span key={i} className="eosCkSubPart">
                {part}
                {i < parts.length - 1 ? " ·" : ""}
            </span>
        )
    })
    return out
}
function eosCheckinChord(id) {
    const f = EOS_CHECKIN_ROOT[id] || 261.63
    eosTone(f, 460, { type: "triangle", gain: 0.04 })
    eosTone(f * 1.5, 460, { type: "sine", gain: 0.03, at: 0.05 })
    eosTone(f * 2.25, 620, { type: "sine", gain: 0.022, at: 0.1 })
}
function eosCheckinSupportLines(raw) {
    return String(raw || EOS_PROP_DEFAULTS.crisisLines)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8)
}
// F3: is the owner-only game menu on? (pick module absent → the old behaviour, menu on)
function eosCheckinPickerOn() {
    try {
        const f = eosApi("pick").menuOn
        return typeof f === "function" ? !!f() : true
    } catch {
        return true
    }
}
// The CTA sub-line: the router's preview when present (and the game is really registered), else a calm default.
// F3: users never see a game named as a choice — while the menu is hidden ThinkStill just says it picks.
function eosCheckinPreview(emotion, n) {
    if (!eosCheckinPickerOn()) return "ThinkStill picks your best release"
    try {
        const p = eosApi("router").EosRoutePreview?.(emotion, n)
        const id = p && Number(p.id)
        const g = id ? GAMES.find((x) => x.id === id) : null
        if (g) {
            const name = String(p.name || g.name || "").toUpperCase()
            return p.best ? `your best · ${name}` : `≈${Math.round(Number(p.seconds) || (EOS_GAME_META[id] && EOS_GAME_META[id].seconds) || 30)} s · ${name}`
        }
    } catch {}
    return "≈30 s · Still picks your game"
}

function eosCheckinMenuOpen() {
    try {
        return !!document.querySelector(".releaseChoiceMenu")
    } catch {
        return false
    }
}

// ---------------------------------------------------------------- deep link (?eos=anger&t=41), read once per page
let eosCheckinDeepDone = false
function eosCheckinReadDeepLink() {
    if (eosCheckinDeepDone) return null
    eosCheckinDeepDone = true
    try {
        if (typeof location === "undefined" || !location.search) return null
        const sp = new URLSearchParams(location.search)
        if (!sp.has("eos") && !sp.has("t")) return null
        const emo = String(sp.get("eos") || "").toLowerCase()
        const ts = String(sp.get("t") || "")
        const t = /^[0-9]{1,3}$/.test(ts) ? Number(ts) : NaN
        const ok = EOS_EMO[emo] && t >= 1 && t <= 600 ? { emo, t } : null
        sp.delete("eos")
        sp.delete("t")
        const q = sp.toString()
        try {
            history.replaceState(history.state, "", `${location.pathname}${q ? `?${q}` : ""}${location.hash || ""}`)
        } catch {}
        return ok
    } catch {
        return null
    }
}

// ---------------------------------------------------------------- geometry
function useEosCheckinSize(ref) {
    const [size, setSize] = React.useState({ w: 0, h: 0 })
    eosLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const read = () => {
            const w = el.offsetWidth || 0
            const h = el.offsetHeight || 0
            setSize((s) => (Math.abs(s.w - w) < 1 && Math.abs(s.h - h) < 1 ? s : { w, h }))
        }
        read()
        let ro = null
        try {
            ro = new ResizeObserver(read)
            ro.observe(el)
        } catch {
            window.addEventListener("resize", read)
        }
        return () => {
            if (ro) ro.disconnect()
            else window.removeEventListener("resize", read)
        }
    }, [ref])
    return size
}
// Positions (ball centres, root px) for every slot of step 1, and the step-2 rails.
// Desktop: the 8 orbs on an ellipse (rx 34 %, ry ≤ 30 % of the stage) sized to fit between the measured header
// and bottom bar; "more feelings" slot SCARED / JEALOUS / NUMB into the ring's three gaps (left, bottom, right).
// Phone: a 3 × 3 grid (NOT SURE in the middle cell) + a compact 4th row (68 px balls, name + label only) for
// "more feelings"; with "more" open the primary sub-lines fold away so grid, chips and footer fit without scrolling.
// laneY = the centre of the first-timer label lane (TAP HOW YOU FEEL) under the ring / grid.
// bigSize = the chosen orb's base size on step 2 (180 desktop, 140 phone); it scales up to 1.25× on the dial.
function eosCheckinBigSize(h, phone) {
    return phone ? 140 : Math.round(eosClamp(h * 0.24, 120, 180))
}
function eosCheckinLayout({ w, h, phone, more, labH, labRows, lane = 0, headH, footH, step, sel, spot }) {
    const pos = {}
    const ids = EOS_CHECKIN_RING.concat(["auto"], EOS_CHECKIN_MORE)
    if (!w || !h) {
        ids.forEach((id) => (pos[id] = { x: 0, y: 0, size: 88, show: false }))
        return { pos, canvasH: h, chipsY: 0, laneY: 0, phone, ring: null }
    }
    let canvasH = h
    let chipsY = 0
    let laneY = 0
    let ring = null
    const lab = labH
    if (!phone) {
        const top = headH
        const bottom = h - footH - lane // lane = room for the first-timer "TAP HOW YOU FEEL" label under the ring
        const avail = Math.max(200, bottom - top)
        const S = Math.round(eosClamp(avail / 2.88 - lab, 64, 96))
        const C = Math.round(S * 1.15)
        const M = Math.min(76, S)
        let ry = Math.min(h * 0.3, (avail - S - lab) / 1.88)
        ry = Math.max(60, ry)
        const rx = Math.min(w * 0.34, w / 2 - 96)
        const cy = (top + bottom) / 2 - lab / 2
        EOS_CHECKIN_RING.forEach((id, i) => {
            const a = (EOS_CHECKIN_ANGLES[i] * Math.PI) / 180
            pos[id] = { x: w / 2 + rx * Math.cos(a), y: cy + ry * Math.sin(a), size: S, show: true }
        })
        pos.auto = { x: w / 2, y: cy, size: C, show: true }
        const side = Math.min(rx + 72, w / 2 - 78)
        pos.fear = { x: w / 2 - side, y: cy - 6, size: M, show: !!more }
        pos.jealous = { x: w / 2, y: cy + Math.max(ry, C / 2 + lab + 12 + M / 2), size: M, show: !!more }
        pos.numb = { x: w / 2 + side, y: cy - 6, size: M, show: !!more }
        chipsY = bottom
        laneY = bottom + lane / 2
        ring = { cx: w / 2, cy, rx, ry }
    } else {
        const S = 84
        const C = 92
        const M = 68
        const cellW = Math.min(132, (w - 16) / 3)
        const top = headH
        const grid = [
            ["panic", "anger", "anxiety"],
            ["overthinking", "auto", "overwhelm"],
            ["sad", "lonely", "shame"],
        ]
        // each row is as tall as ITS tallest label (PANIC's two-line sub only grows the first row);
        // the middle row also makes room for the bigger NOT SURE ball
        let y = top
        grid.forEach((row, r) => {
            const lr = labRows && labRows[r] ? labRows[r] : lab
            const extra = r === 1 ? (C - S) / 2 : 0
            row.forEach((id, c) => {
                pos[id] = { x: w / 2 + (c - 1) * cellW, y: y + extra + S / 2 + 2, size: id === "auto" ? C : S, show: true }
            })
            y += S + 2 * extra + lr + 5
        })
        const moreTop = y
        EOS_CHECKIN_MORE.forEach((id, j) => {
            pos[id] = { x: w / 2 + (j - 1) * cellW, y: moreTop + M / 2 + 2, size: M, show: !!more }
        })
        const moreLab = labRows && labRows[3] ? labRows[3] : Math.min(lab, 30)
        chipsY = moreTop + (more ? M + moreLab + 8 : 0) + lane
        laneY = chipsY - lane / 2
        canvasH = Math.max(h, chipsY + footH - 12) // footH = the bottom block + 12 → the canvas ends exactly at the footer
    }
    if (step === 2) {
        // the chosen orb flies to the measured spot; the crew steps to the sidelines (desktop) or out (phone)
        const others = EOS_CHECKIN_RING.filter((id) => id !== sel)
        ids.forEach((id) => {
            const p = pos[id]
            if (!p) return
            if (id === sel) {
                pos[id] = { x: spot ? spot.x : w / 2, y: spot ? spot.y : h * 0.3, size: eosCheckinBigSize(h, phone), show: true, big: true }
                return
            }
            if (!phone && others.includes(id)) {
                const per = Math.ceil(others.length / 2)
                const k = others.indexOf(id)
                const left = k < per
                const col = left ? k : k - per
                const gap = Math.min(132, (h - 120) / Math.max(1, per))
                const y0 = h / 2 - ((per - 1) * gap) / 2 - 18
                const rail = Math.min(104, w * 0.09)
                pos[id] = { x: left ? rail : w - rail, y: y0 + col * gap, size: 60, show: true, rail: true }
                return
            }
            const cx = w / 2
            const cyy = h / 2
            pos[id] = { ...p, x: cx + (p.x - cx) * 1.6, y: cyy + (p.y - cyy) * 1.4, show: false, gone: true }
        })
    }
    return { pos, canvasH, chipsY, laneY, phone, ring }
}

// ---------------------------------------------------------------- EosCheckIn
function EosCheckIn({ raw = "", setRaw, onLaunch, onPlay, toggleMic, listening = false, openMenu, sfx, reduced = false }) {
    const st = useEosStore()
    const red = eosCalm(reduced)
    const rootRef = React.useRef(null)
    const spotRef = React.useRef(null)
    const dialRef = React.useRef(null)
    const ctaRef = React.useRef(null)
    const ctaTapRef = React.useRef(null)
    const size = useEosCheckinSize(rootRef)
    const phone = size.w > 0 && size.w <= 560
    const [step, setStep] = React.useState(1)
    const [sel, setSel] = React.useState(null)
    const [n, setN] = React.useState(6)
    const [more, setMore] = React.useState(false)
    const [labH, setLabH] = React.useState(44)
    const [labRows, setLabRows] = React.useState(null)
    const [bands, setBands] = React.useState({ head: 104, foot: 106 })
    const headRef = React.useRef(null)
    const bottomRef = React.useRef(null)
    const [spot, setSpot] = React.useState(null)
    const [dive, setDive] = React.useState(null)
    const [pending, setPending] = React.useState(null)
    const [pressing, setPressing] = React.useState(null)
    const [touched, setTouched] = React.useState(false)
    const [halo, setHalo] = React.useState(0)
    const [hintId, setHintId] = React.useState(null)
    const [cold, setCold] = React.useState(false)
    const [banner, setBanner] = React.useState(null)
    const [pop, setPop] = React.useState(null) // "about" | "support" | null
    const [meet, setMeet] = React.useState(false)
    const [named, setNamed] = React.useState(false)
    const [micNote, setMicNote] = React.useState(false)
    const [idleCta, setIdleCta] = React.useState(false)
    const [dialHint, setDialHint] = React.useState(false)
    const [focusIdx, setFocusIdx] = React.useState(0)
    const [first] = React.useState(() => {
        const l = eosGet(EOS_KEYS.learned, {})
        return !l || typeof l !== "object" || Object.keys(l).length === 0
    })
    const starterRef = React.useRef(null)
    const pressRef = React.useRef({ t: 0, fired: false, id: null })
    const launchedRef = React.useRef(false)
    const menuCommitRef = React.useRef(false) // "pick a game myself" committed; reverted if the menu closes without a launch
    const focusRef = React.useRef(null) //      keyboard focus to restore after a step change: "dial" | an orb id
    const timers = React.useRef(new Set())
    const live = React.useRef({})
    live.current = { raw: String(raw || ""), setRaw, onLaunch, onPlay, toggleMic, openMenu, sfx }

    const later = React.useCallback((fn, ms) => {
        const t = setTimeout(() => {
            timers.current.delete(t)
            fn()
        }, ms)
        timers.current.add(t)
        return t
    }, [])
    React.useEffect(
        () => () => {
            timers.current.forEach(clearTimeout)
            timers.current.clear()
            clearTimeout(pressRef.current.t)
            // unmounted by a launch (ours, or a game picked from the menu after "pick a game myself") → keep the level
            if (!launchedRef.current && !menuCommitRef.current) eosApi("dots").setLevel?.(null)
        },
        []
    )

    const HandHint = eosApi("arrows").EosHandHint
    // first-timers get the "pick one" hint (halos hop across every ball, the hand rests on NOT SURE): its
    // "TAP HOW YOU FEEL" label sits in a lane of its own under the ring / grid, never over a feeling or the title
    // The lane folds only after the first CLICK lands (never on pointerdown: the chips would jump out from under the finger).
    const hintOn = first && step === 1 && !touched && !dive
    const [clicked, setClicked] = React.useState(false)
    const lane = first && step === 1 && !clicked && !dive ? 44 : 0
    const layout = eosCheckinLayout({ w: size.w, h: size.h, phone, more, labH, labRows, lane, headH: bands.head, footH: bands.foot, step, sel, spot })
    const layoutSig = EOS_CHECKIN_RING.map((id) => {
        const q = layout.pos[id]
        return q ? `${Math.round(q.x)},${Math.round(q.y)}` : ""
    }).join(";")
    const slots = EOS_CHECKIN_RING.concat(["auto"], EOS_CHECKIN_MORE)
    if (sel && !slots.includes(sel)) slots.push(sel)
    const focusable = EOS_CHECKIN_RING.concat(["auto"], more ? EOS_CHECKIN_MORE : [])
    // step 2: the spot (an empty flex item in the panel) holds the chosen orb at its full 1.25× (dial 10) with its gold
    // ring (4 px) and its 6 px bob (×1.25) ≥ 12 px under the question, and its name tag clear of the dial track below
    const spotGeo = (() => {
        const big = eosCheckinBigSize(size.h, phone)
        const gap = phone ? 8 : 10
        const above = Math.ceil(big * 0.625 + 4 + 8 + 12 - gap)
        const below = Math.ceil((big * 0.5 + 6) * 1.25 + 6 - gap)
        return { above, h: above + below }
    })()

    // measure the real label height under the balls (sub-lines may wrap on a phone) → rows never overlap
    eosLayoutEffect(() => {
        const root = rootRef.current
        if (!root || step !== 1) return
        let m = 0
        const per = {}
        root.querySelectorAll(".eosCkSlot[data-eos-ring='1']").forEach((slot) => {
            const el = slot.querySelector(".eosOrb")
            const ball = el && el.querySelector(".eosOrbBall")
            if (!ball) return
            const lh = el.offsetHeight - ball.offsetHeight
            per[slot.getAttribute("data-eos-slot")] = lh
            m = Math.max(m, lh)
        })
        if (m > 0 && Math.abs(m - labH) > 1) setLabH(Math.min(80, Math.max(30, Math.ceil(m))))
        const rowOf = (ids) => Math.min(80, Math.max(26, Math.ceil(Math.max(0, ...ids.map((k) => per[k] || 0)))))
        if (per.panic != null) {
            const rows = [rowOf(["panic", "anger", "anxiety"]), rowOf(["overthinking", "auto", "overwhelm"]), rowOf(["sad", "lonely", "shame"]), more && per.fear != null ? rowOf(EOS_CHECKIN_MORE) : 0]
            if (!labRows || rows.some((v, i) => Math.abs(v - labRows[i]) > 1)) setLabRows(rows)
        }
        const hd = headRef.current
        const ft = bottomRef.current
        const head = hd ? Math.ceil(hd.offsetTop + hd.offsetHeight + (phone ? 6 : 18)) : bands.head
        const foot = ft ? Math.ceil(ft.offsetHeight + 12) : bands.foot
        if (Math.abs(head - bands.head) > 1 || Math.abs(foot - bands.foot) > 1) setBands({ head, foot })
    })
    // Baloo 2 may arrive after the first measure: re-render once fonts settle so rows use the real label heights
    const [, setFontTick] = React.useState(0)
    React.useEffect(() => {
        let alive = true
        const bump = () => alive && setFontTick((k) => k + 1)
        try {
            document.fonts?.ready?.then(bump)
            document.fonts?.addEventListener?.("loadingdone", bump)
        } catch {}
        return () => {
            alive = false
            try {
                document.fonts?.removeEventListener?.("loadingdone", bump)
            } catch {}
        }
    }, [])
    // where the chosen orb lands on step 2 (the spacer in the panel)
    eosLayoutEffect(() => {
        if (step !== 2) return
        const root = rootRef.current
        const el = spotRef.current
        if (!root || !el) return
        const r = eosRelRect(el, root.querySelector(".eosCkCanvas") || root)
        if (!r) return
        const next = { x: Math.round(r.cx), y: Math.round(r.y + spotGeo.above) }
        setSpot((s) => (s && Math.abs(s.x - next.x) < 1 && Math.abs(s.y - next.y) < 1 ? s : next))
    })

    // ---- once on mount: deep link, cold open
    React.useEffect(() => {
        const dl = eosCheckinReadDeepLink()
        if (dl) {
            setBanner(dl)
            enterStep2(dl.emo, { quiet: true, banner: true })
            return
        }
        if (!eosPrefs().coldOpen) {
            eosSetPref("coldOpen", true)
            // the 3 s run is timed from when STILL actually appears (a busy first load can delay the show timer)
            later(() => {
                setCold(true)
                later(() => setCold(false), 3000)
            }, red ? 0 : 450)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ---- first-timer halo hops across ALL orbs (never one) — fallback when the arrows module is absent
    const haloOn = first && !touched && step === 1 && !HandHint && !dive
    React.useEffect(() => {
        if (!haloOn || red) return
        const t = setInterval(() => setHalo((k) => k + 1), 620)
        return () => clearInterval(t)
    }, [haloOn, red])

    // ---- step 2 hints: SLIDE IT on the dial (first time), LET'S GO on the CTA after 3 s without input
    React.useEffect(() => {
        if (step !== 2 || dive) {
            setIdleCta(false)
            return
        }
        setIdleCta(false)
        const root = rootRef.current
        // never while the arcade's game menu is open over the check-in ("pick a game myself")
        const tick = () => (eosCheckinMenuOpen() ? (t = setTimeout(tick, 1000)) : setIdleCta(true))
        let t = setTimeout(tick, 3000)
        const poke = () => {
            setIdleCta(false)
            setDialHint(false)
            clearTimeout(t)
            t = setTimeout(tick, 3000)
        }
        root?.addEventListener("pointerdown", poke, true)
        root?.addEventListener("keydown", poke, true)
        return () => {
            clearTimeout(t)
            root?.removeEventListener("pointerdown", poke, true)
            root?.removeEventListener("keydown", poke, true)
        }
    }, [step, sel, !!dive])

    // ---- "pick a game myself": the commit stands only if a game really starts from the menu. A launch unmounts the
    // check-in in the same commit that closes the menu, so "menu gone and still mounted" = abandoned → revert it.
    const revertMenuCommit = () => {
        if (!menuCommitRef.current) return
        menuCommitRef.current = false
        EosCommitCheckin({ emotion: null, before: null })
    }
    const [menuWatch, setMenuWatch] = React.useState(0)
    React.useEffect(() => {
        if (!menuWatch) return
        let seen = false
        let gone = 0
        const t = setInterval(() => {
            if (eosCheckinMenuOpen()) {
                seen = true
                gone = 0
                return
            }
            gone += 1
            if ((seen && gone >= 2) || (!seen && gone >= 8)) {
                clearInterval(t)
                revertMenuCommit()
            }
        }, 200)
        return () => clearInterval(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [menuWatch])

    // ---- keyboard focus follows the step: into the dial on step 2, back to the same orb on step 1
    eosLayoutEffect(() => {
        const want = focusRef.current
        const root = rootRef.current
        if (!want || !root) return
        if (want === "dial" && step === 2) {
            const el = root.querySelector(".eosCkDialWrap [role=slider]")
            if (!el) return
            focusRef.current = null
            const a = document.activeElement
            if (!a || a === document.body || root.contains(a)) {
                try {
                    el.focus({ preventScroll: true })
                } catch {}
            }
        } else if (want !== "dial" && step === 1) {
            const i = focusable.indexOf(want)
            const el = i >= 0 ? root.querySelector(`[data-eos-ck-idx="${i}"]`) : null
            if (!el) return
            focusRef.current = null
            setFocusIdx(i)
            try {
                el.focus({ preventScroll: true })
            } catch {}
        }
    })

    // ---- live text hint: typing in the composer while the ring is up → "sounds like ANGER?"
    React.useEffect(() => {
        if (step !== 1) {
            setHintId(null)
            return
        }
        const text = String(raw || "")
        if (!text.trim() || text === starterRef.current) {
            setHintId(null)
            return
        }
        const t = setTimeout(() => {
            try {
                if (eosSafetyStrong(EosSafetyScan(text))) return setHintId(null)
                const d = eosDetectEmotion(text)
                const id = d && d.id && d.id !== "good" ? d.id : null
                setHintId(id)
                if (id && EOS_CHECKIN_MORE.includes(id)) setMore(true)
            } catch {
                setHintId(null)
            }
        }, 300)
        return () => clearTimeout(t)
    }, [raw, step])

    // ---- launch handshake (stale-closure safe): fire once the committed text is in `raw`
    const fire = React.useCallback((p) => {
        const L = live.current
        launchedRef.current = true
        try {
            // F3: without the owner menu every launch goes through ThinkStill's no-repeat rotation
            if (p.kind === "game" && eosCheckinPickerOn()) {
                const g = GAMES.find((x) => x.id === p.id)
                if (g && typeof L.onPlay === "function") return L.onPlay(g)
            }
            L.onLaunch?.()
        } catch {}
    }, [])
    React.useEffect(() => {
        if (!pending || !String(raw || "").trim()) return
        const p = pending
        setPending(null)
        fire(p)
    }, [pending, raw, fire])
    const launch = (p) => {
        if (live.current.raw.trim()) fire(p)
        else setPending(p)
    }
    const ensureText = (id) => {
        const L = live.current
        if (!L.raw.trim()) {
            const s = eosCheckinEmo(id).starter
            starterRef.current = s
            L.setRaw?.(s)
        }
    }
    const centreOf = (id) => {
        const p = layout.pos[id]
        const root = rootRef.current
        return p ? { x: p.x, y: p.y - (root ? root.scrollTop : 0) } : { x: size.w / 2, y: size.h / 2 }
    }
    const startDive = (id, at, kind) => {
        const e = eosCheckinEmo(id)
        launchedRef.current = true
        setDive({ x: Math.round(at.x), y: Math.round(at.y), hue: e.hue, id, top: rootRef.current ? rootRef.current.scrollTop : 0 })
        eosHaptic("touch")
        later(() => launch(kind), red ? 0 : EOS_CHECKIN_LAUNCH_MS)
        later(() => setDive(null), 2200) // failsafe: never leave the wipe up if the arcade refused the launch
    }
    const express = (id) => {
        if (dive) return
        setTouched(true)
        menuCommitRef.current = false
        EosCommitCheckin({ emotion: id === "auto" ? null : id, before: null, express: true })
        ensureText(id)
        eosCheckinChord(id)
        startDive(id, centreOf(id), { kind: "route" })
    }
    function enterStep2(id, opts = {}) {
        const e = eosCheckinEmo(id)
        const L = live.current
        const prevStarter = starterRef.current
        const cur = L.raw
        const typed = cur.trim() && cur !== prevStarter ? cur : ""
        if (id !== "auto") {
            if (!cur.trim() || (prevStarter && cur === prevStarter)) {
                starterRef.current = e.starter
                L.setRaw?.(e.starter)
            }
        } else if (prevStarter && cur === prevStarter) {
            starterRef.current = null
            L.setRaw?.("")
        }
        let n0 = e.dial || 6
        try {
            if (typed) n0 = Math.max(n0, eosGuessIntensity(typed))
        } catch {}
        n0 = eosClamp(Math.round(n0), 1, 10)
        const prefs = eosPrefs()
        // a phone deep link already shows the friend banner: keep the once-only lines for the next visit, so the
        // whole step (banner → question → orb → dial → CTA → footer) still fits one screen
        const tight = !!opts.banner && (rootRef.current ? rootRef.current.offsetWidth : 999) <= 560
        if (id !== "auto" && !tight) {
            setMeet(!prefs.metOnce)
            if (!prefs.metOnce) eosSetPref("metOnce", true)
        } else setMeet(false)
        setNamed(!prefs.namedOnce && !tight)
        if (!prefs.namedOnce && !tight) eosSetPref("namedOnce", true)
        setDialHint(!prefs.namedOnce || first)
        setSel(id)
        setN(n0)
        setStep(2)
        setSpot(null)
        setTouched(true)
        setCold(false)
        setHintId(null)
        setPop(null)
        eosApi("dots").setLevel?.(n0)
        if (!opts.quiet) focusRef.current = "dial"
        if (!opts.quiet) {
            eosCheckinChord(id)
            eosHaptic("touch")
        }
    }
    const pick = (id) => {
        if (dive) return
        if (pressRef.current.fired) {
            pressRef.current.fired = false
            return
        }
        if (step === 2 && id === sel) return
        if (id === "panic") return express("panic")
        enterStep2(id)
    }
    const back = () => {
        const L = live.current
        revertMenuCommit()
        if (starterRef.current && L.raw === starterRef.current) {
            starterRef.current = null
            L.setRaw?.("")
        }
        if (sel) focusRef.current = sel
        setStep(1)
        setSel(null)
        setBanner(null)
        setSpot(null)
        eosApi("dots").setLevel?.(null)
    }
    const go = () => {
        if (dive || !sel) return
        menuCommitRef.current = false
        EosCommitCheckin({ emotion: sel === "auto" ? null : sel, before: n })
        ensureText(sel)
        const r = spotRef.current && rootRef.current ? eosRelRect(spotRef.current, rootRef.current) : null
        startDive(sel, r ? { x: r.cx, y: r.cy } : centreOf(sel), { kind: "route" })
    }
    const pickMyself = () => {
        if (dive) return
        EosCommitCheckin({ emotion: sel === "auto" ? null : sel, before: sel ? n : null })
        ensureText(sel || "auto")
        menuCommitRef.current = true
        setMenuWatch((k) => k + 1)
        setIdleCta(false)
        try {
            live.current.openMenu?.()
        } catch {}
    }
    const skip = () => {
        revertMenuCommit()
        EosSkipCheckin()
    }
    const goodDay = (ev) => {
        if (dive) return
        setTouched(true)
        menuCommitRef.current = false
        EosCommitCheckin({ emotion: "good", before: null, express: true })
        ensureText("good")
        eosCheckinChord("good")
        let at = { x: size.w / 2, y: size.h - 60 }
        try {
            const r = eosRelRect(ev.currentTarget, rootRef.current)
            if (r) at = { x: r.cx, y: r.cy }
        } catch {}
        startDive("good", at, { kind: "game", id: EOS_CHECKIN_GOOD_GAME })
    }
    // long-press (550 ms) on ANY orb = express for that feeling
    const pressStart = (id) => (e) => {
        if (dive || (e.button != null && e.button !== 0)) return
        setTouched(true)
        setCold(false)
        clearTimeout(pressRef.current.t)
        pressRef.current = { fired: false, id, t: 0 }
        setPressing(id)
        pressRef.current.t = setTimeout(() => {
            pressRef.current.fired = true
            setPressing(null)
            eosHaptic("notch")
            express(id)
        }, EOS_CHECKIN_LONG_MS)
    }
    const pressEnd = () => {
        clearTimeout(pressRef.current.t)
        setPressing(null)
    }
    const onRingKey = (e) => {
        const k = e.key
        if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(k)) return
        const N = focusable.length
        let i = focusIdx
        if (k === "ArrowRight" || k === "ArrowDown") i = (i + 1) % N
        else if (k === "ArrowLeft" || k === "ArrowUp") i = (i - 1 + N) % N
        else if (k === "Home") i = 0
        else i = N - 1
        e.preventDefault()
        setFocusIdx(i)
        try {
            rootRef.current?.querySelector(`[data-eos-ck-idx="${i}"]`)?.focus()
        } catch {}
    }
    const onRootKey = (e) => {
        if (e.key === "Escape") {
            try {
                if (document.querySelector(".releaseChoiceMenu")) return // Escape closes the arcade's menu first
            } catch {}
            if (pop) setPop(null)
            else if (step === 2) back()
        }
    }
    const onSlider = (v) => {
        setN(v)
        setDialHint(false)
        eosApi("dots").setLevel?.(v)
    }
    const toggleSeed = (s) => {
        const L = live.current
        let base = L.raw
        if (starterRef.current && base === starterRef.current) base = ""
        const has = base.toLowerCase().includes(s.toLowerCase())
        let next = has ? base.replace(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").replace(/\s{2,}/g, " ").trim() : `${base.trim()} ${s}`.trim()
        starterRef.current = null
        L.setRaw?.(next.slice(0, 2000))
    }
    const mic = () => {
        if (!eosPrefs().micNoted) {
            eosSetPref("micNoted", true)
            setMicNote(true)
        }
        try {
            live.current.toggleMic?.()
        } catch {}
    }
    const focusComposer = () => {
        try {
            const el = document.querySelector("input.releaseThoughtInput")
            el?.focus()
            if (el && live.current.raw === starterRef.current) el.select?.()
        } catch {}
    }
    const support = () => {
        const open = eosApi("safety").open
        if (typeof open === "function") {
            try {
                open("info")
                setPop(null)
                return
            } catch {}
        }
        setPop((p) => (p === "support" ? null : "support"))
    }
    const calmOn = !!st.calmVisuals

    // ---- render helpers
    const selE = sel ? eosCheckinEmo(sel) : null
    const charName = selE ? EOS_CHAR_NAMES[selE.char] || "it" : ""
    const question = sel ? eosDialQuestion(sel === "auto" ? null : sel, "before") : ""
    const faces = sel ? eosCheckinFaces(sel === "auto" ? null : sel) : null
    const stepFace = faces ? (selE.better === "up" ? (n >= 7 ? faces.calm : faces.loud) : n >= 7 ? faces.loud : n >= 4 ? faces.soft : faces.calm) : null
    const spring = red ? { duration: 0.18 } : { type: "spring", stiffness: 420, damping: 18 }
    const softSpring = red ? { duration: 0.18 } : { type: "spring", stiffness: 260, damping: 24 }
    const ctaSub = sel ? eosCheckinPreview(sel === "auto" ? null : sel, n) : ""
    const seeds = selE ? (selE.seeds || []).slice(0, 3) : []
    const rawLower = String(raw || "").toLowerCase()

    const orbSlot = (id, i) => {
        const p = layout.pos[id] || { x: 0, y: 0, size: 88, show: false }
        const e = eosCheckinEmo(id)
        const isSel = step === 2 && id === sel
        const isRing = EOS_CHECKIN_RING.includes(id) || id === "auto"
        const isMore = EOS_CHECKIN_MORE.includes(id)
        const visible = p.show && size.w > 0
        const fi = focusable.indexOf(id)
        const label = id === "auto" ? EOS_GUIDE_CHAR.label : e.label
        // phone + "more feelings": names and labels only (PANIC keeps "tap = start now") so everything fits one screen
        const compact = phone && more
        const sub =
            isMore && phone ? undefined : id === "panic" && compact ? (
                <span className="eosCkSubPart">tap = start now</span>
            ) : compact ? undefined : id === "panic" ? (
                <>
                    {eosCheckinSub(e.sub)}
                    <br />
                    <span className="eosCkSubPart">tap = start now</span>
                </>
            ) : id === "auto" ? (
                eosCheckinSub(EOS_GUIDE_CHAR.sub)
            ) : (
                eosCheckinSub(e.sub)
            )
        const scale = isSel ? 0.85 + n * 0.04 : 1
        const shake = isSel && n >= 7 && !red
        const dim = step === 2 && !isSel
        const hop = haloOn && !red && fi >= 0 && fi === halo % focusable.length
        const nm = EOS_CHAR_NAMES[e.char] || "STILL"
        return (
            <motion.div
                key={id}
                className={`eosCkSlot ${isSel ? "isSel" : ""} ${p.rail ? "isRail" : ""} ${hop ? "isHop" : ""} ${haloOn ? "isHaloOn" : ""} ${pressing === id ? "isPressing" : ""} ${hintId === id ? "isHint" : ""}`}
                data-eos-ring={step === 1 && (isRing || (isMore && more)) ? "1" : undefined}
                data-eos-slot={id}
                initial={red ? { opacity: 0, x: p.x, y: p.y } : { opacity: 0, scale: 0.3, x: p.x, y: p.y }}
                animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.5, x: p.x, y: p.y }}
                transition={red ? { duration: 0.18 } : { ...softSpring, delay: step === 1 && !touched ? (isMore ? (i - 9) * 0.05 : i * 0.04) : 0, opacity: { duration: 0.22 } }}
                style={{ pointerEvents: visible && !(phone && dim) ? "auto" : "none", zIndex: isSel ? 6 : id === hintId ? 5 : 2, "--eos-orb": `${p.size}px` }}
                aria-hidden={visible ? undefined : "true"}
            >
                <div className={`eosCkScale ${shake ? "isShake" : ""}`} style={{ transform: `scale(${scale})`, transition: red ? "none" : "transform .35s cubic-bezier(.3,1.6,.4,1)" }}>
                    <EosCharacterOrb
                        emotion={id}
                        size={p.size}
                        mood={isSel && stepFace != null ? stepFace : undefined}
                        label={isSel ? undefined : label}
                        sub={isSel || p.rail ? undefined : sub}
                        showName
                        selected={isSel}
                        dim={dim}
                        reduced={red}
                        onClick={() => pick(id)}
                        ariaLabel={`${id === "auto" ? "Not sure" : e.label.charAt(0) + e.label.slice(1).toLowerCase()} — ${id === "auto" ? EOS_GUIDE_CHAR.sub : e.sub} (${nm})${id === "panic" ? " — tap to start now" : ""}`}
                        tabIndex={visible && fi >= 0 && step === 1 ? (fi === focusIdx ? 0 : -1) : -1}
                        data-eos-ck-idx={fi >= 0 ? fi : undefined}
                        onPointerDown={step === 2 && id === sel ? undefined : pressStart(id)}
                        onPointerUp={pressEnd}
                        onPointerCancel={pressEnd}
                        onPointerLeave={pressEnd}
                        onContextMenu={(ev) => ev.preventDefault()}
                        onFocus={() => fi >= 0 && setFocusIdx(fi)}
                        className={id === "auto" ? "eosCkNotSure" : ""}
                    >
                        <i className="eosCkPress" aria-hidden="true" />
                    </EosCharacterOrb>
                </div>
                {hintId === id && step === 1 ? (
                    <button type="button" className="eosCkBubble isHint" onClick={() => pick(id)}>
                        sounds like {String(e.noun || e.label).toUpperCase()}?
                    </button>
                ) : null}
            </motion.div>
        )
    }

    const HH = HandHint
    const ringEls = () => {
        const root = rootRef.current
        return root ? Array.from(root.querySelectorAll(".eosCkSlot[data-eos-ring='1'] button.eosOrb .eosOrbBall")) : []
    }
    const [hintEls, setHintEls] = React.useState(null)
    React.useEffect(() => {
        if (!HH || step !== 1 || !first || touched) return setHintEls(null)
        const t = setTimeout(() => {
            const els = ringEls()
            const rest = rootRef.current?.querySelector(".eosCkSlot[data-eos-slot='auto'] button.eosOrb .eosOrbBall") || null
            if (els.length) setHintEls({ els, rest })
        }, red ? 300 : 1100) // after the staggered pop-in has settled, so the halos are measured on the final ring
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!HH, step, first, touched, more, size.w, size.h, layoutSig])

    const supportLines = eosCheckinSupportLines(st.crisisLines)
    const banEmo = banner ? eosCheckinEmo(banner.emo) : null

    return (
        <div
            ref={rootRef}
            className={`eosCheckIn fs-mask ${phone ? "isPhone" : "isWide"} ${more ? "isMore" : ""}`}
            data-step={String(step)}
            data-eos-layout={phone ? "grid" : "ring"}
            data-eos-calm={red ? "1" : "0"}
            data-eos-emotion={sel || undefined}
            role="region"
            aria-label="How are you feeling?"
            {...EOS_PRIVATE_ATTRS}
            onPointerDownCapture={(e) => {
                setCold(false)
                if (!e.target.closest?.(".eosCkPop, [data-eos-pop]")) setPop(null)
                if (e.target.closest?.("button, [role=slider]")) setTouched(true)
            }}
            onClickCapture={() => clicked || setClicked(true)}
            onKeyDown={onRootKey}
            style={{ "--eos-h": selE ? selE.hue : 190 }}
        >
            <div className="eosCkCanvas" style={phone && step === 2 ? undefined : { height: layout.canvasH ? `${layout.canvasH}px` : "100%" }}>
                <div className="eosCkGlow" aria-hidden="true" />
                {!phone && step === 1 && layout.ring ? (
                    <div className="eosCkTrack" aria-hidden="true" style={{ left: `${layout.ring.cx}px`, top: `${layout.ring.cy}px`, width: `${layout.ring.rx * 2}px`, height: `${layout.ring.ry * 2}px` }} />
                ) : null}

                {step === 1 ? (
                    <header className={`eosCkHead ${cold ? "isCold" : ""}`} ref={headRef}>
                        <h2 className="eosCkTitle">Who's at the controls?</h2>
                        <p className="eosCkSub">Tap the feeling that's loudest right now.</p>
                        {/* the once-per-device cold open: STILL speaks from the head band (never over an orb's label) */}
                        {cold ? (
                            <div className="eosCkHeadCold" role="status">
                                <EosCharacterOrb emotion="auto" size={phone ? 40 : 52} bob={false} reduced={red} />
                                <span>{EOS_CHECKIN_COLD_LINE}</span>
                            </div>
                        ) : null}
                    </header>
                ) : null}

                <div className="eosCkRing" role="group" aria-label="Feelings" onKeyDown={step === 1 ? onRingKey : undefined}>
                    {size.w > 0 ? slots.map((id, i) => orbSlot(id, i)) : null}
                </div>
                {hintOn && !pop && (HH ? !!hintEls : size.w > 0) ? (
                    <div className="eosCkPill isLane" aria-hidden="true" style={{ top: `${Math.round(layout.laneY)}px` }}>
                        TAP HOW YOU FEEL
                    </div>
                ) : null}

                {step === 2 && sel ? (
                    <div className="eosCkPanel" key={`p-${sel}`}>
                        {banner && banEmo ? (
                            <div className="eosCkBanner" role="status">
                                A friend shifted {String(banEmo.noun || banEmo.label).toUpperCase()} in {banner.t} s. Your turn?
                            </div>
                        ) : null}
                        <h2 className="eosCkQ" id="eosCkDial-label">
                            {meet && sel !== "auto" ? (
                                <span className="eosCkMeet">
                                    Meet {charName}, your {selE.noun}.{" "}
                                </span>
                            ) : null}
                            {question}
                        </h2>
                        <div className="eosCkSpot" ref={spotRef} aria-hidden="true" style={{ height: `${spotGeo.h}px` }} />
                        <div className="eosCkDialWrap" ref={dialRef}>
                            <EosIntensityDial value={n} onChange={onSlider} emotion={sel === "auto" ? null : sel} min={1} max={10} label="" id="eosCkDial" reduced={red} />
                            {dialHint && !idleCta && !dive && !pop ? (
                                <>
                                    {/* the label sits beside the orb, above the track's right end — never on the name tag */}
                                    <div className="eosCkPill isSlide" aria-hidden="true">
                                        SLIDE IT
                                    </div>
                                    {!HH ? (
                                        <div className="eosCkCue isDial" aria-hidden="true">
                                            <span className="eosCkCueHand">☝</span>
                                        </div>
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                        {named ? <p className="eosCkNamed">Naming it is the first move.</p> : null}
                        <div className="eosCkWords">
                            <button type="button" className="eosCkWordsQ" onClick={focusComposer} aria-label="What's it about? Type it in the box below (optional)">
                                What's it about? (optional) <span className="eosCkChevron" aria-hidden="true">⌄</span>
                            </button>
                            <div className="eosCkSeedRow">
                                {seeds.map((s) => {
                                    const on = rawLower.includes(s.toLowerCase()) && raw !== starterRef.current
                                    return (
                                        <button type="button" key={s} className={`eosCkSeed ${on ? "isOn" : ""}`} aria-pressed={on} onClick={() => toggleSeed(s)}>
                                            {s}
                                        </button>
                                    )
                                })}
                                <button type="button" className={`eosCkSeed isMic ${listening ? "isOn" : ""}`} aria-pressed={!!listening} onClick={mic} aria-label={listening ? "Stop voice typing" : "Say it (voice typing)"}>
                                    <span aria-hidden="true">🎙</span>
                                    <span className={`eosCkMicWord ${listening ? "isOn" : ""}`}>{listening ? " listening…" : " say it"}</span>
                                </button>
                            </div>
                            {micNote ? <p className="eosCkNote">Voice typing uses your browser's speech service.</p> : null}
                        </div>
                        <div className="eosCkCtaWrap">
                            <button type="button" ref={ctaRef} className={`eosCkCta ${idleCta && !dive ? "isNudge" : ""}`} data-eos-cta="1" onClick={go}>
                                <span className="eosCkCtaMain">LET'S SHIFT IT ▶</span>
                                <span className="eosCkCtaSub">{ctaSub}</span>
                                {/* tap point for the idle hand: the CTA's right end, so the routed game's name stays readable */}
                                <span className="eosCkCtaTap" ref={ctaTapRef} aria-hidden="true" />
                            </button>
                            {!HH && idleCta && !dive && !pop ? (
                                <div className="eosCkCue isCta" aria-hidden="true">
                                    <span className="eosCkCueTap">☝</span>
                                </div>
                            ) : null}
                        </div>
                        <div className="eosCkLinks">
                            <button type="button" className="eosCkLink" data-eos-back="1" onClick={back}>
                                ← back
                            </button>
                            {eosCheckinPickerOn() ? (
                                <button type="button" className="eosCkLink" data-eos-pick="1" onClick={pickMyself}>
                                    pick a game myself
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <div className="eosCkBottom" ref={bottomRef} style={phone && step === 1 ? { top: `${layout.chipsY}px`, bottom: "auto" } : undefined}>
                    {step === 1 ? (
                        <div className="eosCkChips">
                            <button type="button" className={`eosCkChip ${more ? "isOn" : ""}`} data-eos-more="1" aria-expanded={more} onClick={() => setMore((m) => !m)}>
                                {more ? "fewer feelings ▴" : "more feelings ▾"}
                            </button>
                            <button type="button" className="eosCkChip isGood" data-eos-good="1" onClick={goodDay} aria-label="Good day? Bank it — play a joy game">
                                <span aria-hidden="true">☀</span> good day? bank it
                            </button>
                        </div>
                    ) : null}
                    {pop ? (
                        <div className="eosCkPop" role="dialog" aria-label={pop === "about" ? "About ThinkStill" : "Support lines"}>
                            <button type="button" className="eosCkPopX" aria-label="Close" onClick={() => setPop(null)}>
                                ✕
                            </button>
                            {pop === "about" ? (
                                <p className="eosCkPopText">{EOS_DISCLAIMER}</p>
                            ) : (
                                <div className="eosCkPopText">
                                    <b>You deserve someone to talk to.</b>
                                    <ul className="eosCkLines">
                                        {supportLines.map((l) => (
                                            <li key={l}>{l}</li>
                                        ))}
                                    </ul>
                                    <small>{st.emergencyText || EOS_PROP_DEFAULTS.emergencyText}</small>
                                </div>
                            )}
                        </div>
                    ) : null}
                    <nav className="eosCkFoot" aria-label="Check-in options">
                        <button type="button" className="eosCkLink" data-eos-skip="1" onClick={skip}>
                            just let me play →
                        </button>
                        <button type="button" className="eosCkLink isSupport" data-eos-support="1" data-eos-pop="1" onClick={support}>
                            Need to talk to someone?
                        </button>
                        <button type="button" className="eosCkLink" data-eos-about="1" data-eos-pop="1" aria-expanded={pop === "about"} onClick={() => setPop((p) => (p === "about" ? null : "about"))}>
                            about ThinkStill
                        </button>
                        <button type="button" className={`eosCkLink ${calmOn ? "isOn" : ""}`} data-eos-calmtoggle="1" aria-pressed={calmOn} onClick={() => eosSetPref("calmVisuals", !calmOn)}>
                            <i className="eosCkHalf" aria-hidden="true" />
                            calm visuals · {calmOn ? "on" : "off"}
                        </button>
                    </nav>
                </div>
            </div>


            {/* arrows-module hints. Their labels are ours (the pills above), placed where they cover nothing; the wrapper
                hides the arrows chevron where it would point at ONE feeling (choose) or sit on the seed chips (cta) */}
            {HH && hintOn && !pop && hintEls ? (
                <div className="eosCkHint" data-eos-hint="choose" aria-hidden="true">
                    <HH key={layoutSig} target={hintEls.els} rest={hintEls.rest} root={rootRef.current} g="choose" label="" reduced={red} />
                </div>
            ) : null}
            {HH && step === 2 && !dive && !pop && dialHint && !idleCta && dialRef.current ? (
                <div className="eosCkHint" data-eos-hint="slide" aria-hidden="true">
                    <HH target={dialRef.current.querySelector(".eosDialTrack") || dialRef.current} root={rootRef.current} g="drag" dir="lr" d={120} label="" reduced={red} />
                </div>
            ) : null}
            {HH && step === 2 && !dive && !pop && idleCta && ctaTapRef.current ? (
                <div className="eosCkHint" data-eos-hint="cta" aria-hidden="true">
                    <HH target={ctaTapRef.current} root={rootRef.current} g="tap" label="" reduced={red} showAfterMs={0} />
                </div>
            ) : null}

            {dive ? (
                <motion.div
                    className="eosCkDive"
                    aria-hidden="true"
                    style={{ "--eos-h": dive.hue, "--eos-x": `${dive.x}px`, "--eos-y": `${dive.y}px`, top: `${dive.top || 0}px`, height: size.h ? `${size.h}px` : "100%", bottom: "auto" }}
                    initial={red ? { opacity: 0 } : { clipPath: `circle(0px at ${dive.x}px ${dive.y}px)`, opacity: 1 }}
                    animate={red ? { opacity: 1 } : { clipPath: `circle(150% at ${dive.x}px ${dive.y}px)`, opacity: 1 }}
                    transition={red ? { duration: 0.15 } : { duration: EOS_CHECKIN_DIVE_MS / 1000, ease: [0.7, 0, 0.25, 1] }}
                />
            ) : null}
        </div>
    )
}

// ---------------------------------------------------------------- EosCheckInChip (skip phase)
function EosCheckInChip({ reduced = false }) {
    useEosStore()
    const red = eosCalm(reduced)
    return (
        <button type="button" className="eosCheckInChip" data-eos-calm={red ? "1" : "0"} onClick={() => EosOpenCheckin()} aria-label="How are you feeling? Open the check-in">
            <EosCharacterOrb emotion="auto" size={32} bob={false} reduced={red} />
            <span className="eosCkChipText">How are you feeling?</span>
        </button>
    )
}

// ---------------------------------------------------------------- EosCompanion (play)
function EosCompanion({ game, hostRef, reduced = false }) {
    const st = useEosStore()
    const red = eosCalm(reduced)
    const selfRef = React.useRef(null)
    const bodyRef = React.useRef(null)
    const p = useEosProgress(hostRef || selfRef, 4)
    const emo = st.emotion || st.detected || null
    const e = EOS_EMO[emo] || null
    const char = e ? e.char : "still"
    const gid = Number(game && game.id) || 0
    const sceneChar = EOS_GAME_META[gid] && EOS_GAME_META[gid].char
    const hidden = !!sceneChar && sceneChar === char
    const smash = emo === "anger" && EOS_DISCHARGE_IDS.has(gid)
    const faces = eosCheckinFaces(emo)
    const [geo, setGeo] = React.useState({ phone: false, top: null })
    const [done, setDone] = React.useState(false)
    const [bubble, setBubble] = React.useState(null)
    const [shown, setShown] = React.useState({ cur: null, prev: null })
    const lastP = React.useRef(null)
    const ups = React.useRef(0)
    const bubbleT = React.useRef(0)

    // layout + finish poll (2 Hz): phone → 8 px under the measured progress HUD; finish = 100 % or the guide's isComplete
    React.useEffect(() => {
        if (hidden) return
        let alive = true
        const read = () => {
            if (!alive) return
            const host = (hostRef && hostRef.current) || selfRef.current
            const stage = host && host.closest ? host.closest(".releaseStage") : null
            if (!stage) return
            const phone = (stage.offsetWidth || 0) <= 560
            let top = null
            if (phone) {
                // absolute `top` lives in the containing block's SCROLLED content coordinates (the stage may be
                // scrolled by code), while eosRelRect is the visual offset → add the container's scrollTop
                const hud = stage.querySelector(".engineProgressHud")
                const self = selfRef.current
                const op = (self && self.offsetParent) || stage
                const r = hud ? eosRelRect(hud, op) : null
                if (r && r.h > 0) top = Math.round(r.y + (op.scrollTop || 0) - (op.clientTop || 0) + r.h + 8)
            }
            setGeo((g) => (g.phone === phone && g.top === top ? g : { phone, top }))
            if (stage.querySelector(".globalPlayGuide.isComplete")) setDone(true)
        }
        read()
        const t = setInterval(read, 500)
        return () => {
            alive = false
            clearInterval(t)
        }
    }, [hostRef, hidden])

    React.useEffect(() => {
        if (p != null && p >= 100) setDone(true)
        const prev = lastP.current
        lastP.current = p
        if (p == null || prev == null || p <= prev || hidden) return
        ups.current += 1
        // Pixar squash & stretch on every hit — Web Animations on the body, so the face <img> never remounts (no blink)
        if (!red) {
            try {
                bodyRef.current?.animate(
                    [{ transform: "scale(1,1)" }, { transform: "scale(1.16,.84)" }, { transform: "scale(.9,1.1)" }, { transform: "scale(1.04,.97)" }, { transform: "scale(1,1)" }],
                    { duration: 520, easing: "cubic-bezier(.3,1.4,.4,1)" }
                )
            } catch {}
        }
        if (ups.current % 3 === 0 && p < 100) {
            const line = char === "rush" && smash ? "HAH!" : EOS_CHECKIN_VOICE[char] || EOS_CHECKIN_VOICE.still
            setBubble(line)
            clearTimeout(bubbleT.current)
            bubbleT.current = setTimeout(() => setBubble(null), 1600)
            eosTone(eosNote(3 + (ups.current % 4), 330), 70, { type: "triangle", gain: 0.02 })
            eosTone(eosNote(5 + (ups.current % 3), 330), 70, { type: "triangle", gain: 0.018, at: 0.09 })
        }
    }, [p, hidden, red, char, smash])
    React.useEffect(() => () => clearTimeout(bubbleT.current), [])

    const pv = p == null ? 0 : p
    let mood = "loud"
    if (done) mood = smash ? "spent" : "calm"
    else if (pv >= 67) mood = smash ? "spent" : "calm"
    else if (pv >= 34) mood = smash ? "spent" : "soft"
    const face = faces[mood]
    // 300 ms cross-fade between faces
    React.useEffect(() => {
        setShown((s) => (s.cur === face ? s : { cur: face, prev: s.cur }))
        const t = setTimeout(() => setShown((s) => (s.prev == null ? s : { cur: s.cur, prev: null })), 340)
        return () => clearTimeout(t)
    }, [face])

    if (hidden || !game) return <span ref={selfRef} style={{ display: "none" }} aria-hidden="true" />
    const size = geo.phone ? 56 : 72
    const style = geo.phone ? { top: geo.top != null ? `${geo.top}px` : "112px", right: "10px" } : { right: "14px", bottom: "14px" }
    const finishLine = done ? (smash ? EOS_CHECKIN_SPENT_LINE : null) : null
    const say = finishLine || bubble
    const e2 = e || EOS_GUIDE_CHAR
    return (
        <div
            ref={selfRef}
            className={`eosCompanion fs-mask ${geo.phone ? "isPhone" : "isWide"} ${done ? "isDone" : ""} ${smash ? "isSmash" : ""}`}
            data-eos-char={char}
            data-eos-mood={mood}
            data-eos-face={face}
            data-eos-calm={red ? "1" : "0"}
            aria-hidden="true"
            {...EOS_PRIVATE_ATTRS}
            style={{ ...style, "--eos-h": e2.hue, "--eos-orb": `${size}px` }}
        >
            <div ref={bodyRef} className={`eosCompBody ${!red && done && !smash ? "isBounce" : ""}`}>
                <span className={`eosOrbBall ${e2.greyLoud && mood === "loud" ? "isGrey" : ""}`}>
                    {shown.prev != null ? <img className="eosOrbFace eosCompPrev" src={eosFace(char, shown.prev)} alt="" draggable={false} /> : null}
                    <img key={`f${shown.cur}`} className="eosOrbFace eosCompCur" src={eosFace(char, shown.cur == null ? face : shown.cur)} alt="" draggable={false} />
                    <i className="eosOrbGloss" />
                </span>
                {done && !smash ? <b className="eosCompStar">✦</b> : null}
            </div>
            {say ? (
                <div key={say} className={`eosCompBubble ${finishLine ? "isFinish" : ""}`}>
                    {say}
                </div>
            ) : null}
        </div>
    )
}

// ---------------------------------------------------------------- CSS
const EOS_CHECKIN_CSS = `
${EOS_A} .releaseStage:has(.eosCheckIn) .releaseIdleStory{display:none!important}
${EOS_A}:has(.releaseChoiceMenu) :is(.eosCheckInChip,.eosWorldChips){display:none!important}
${EOS_A}:has(.releaseChoiceMenu) .eosCheckIn{opacity:.14;transition:opacity .2s ease}
@media (max-width:560px){${EOS_A} .releaseStage:has(.eosCheckIn[data-step="2"]) .eosWorldChips{display:none!important}}
${EOS_A} .eosCheckIn{position:absolute;inset:0;z-index:30;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;font-family:var(--eos-font);color:#fff;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
background:radial-gradient(ellipse 46% 42% at 50% 50%,rgba(10,14,40,0) 0,rgba(10,12,36,.18) 55%,rgba(4,5,18,.62) 100%)}
${EOS_A} .eosCheckIn::-webkit-scrollbar{display:none}
${EOS_A} .eosCheckIn.isWide{overflow:hidden}
${EOS_A} .eosCkCanvas{position:relative;width:100%;min-height:100%}
${EOS_A} .eosCkGlow{position:absolute;left:50%;top:50%;width:min(56vw,520px);aspect-ratio:1;translate:-50% -50%;border-radius:50%;pointer-events:none;
background:radial-gradient(circle,hsla(var(--eos-h),100%,72%,.16) 0,hsla(var(--eos-h),100%,60%,.06) 38%,transparent 66%);animation:eosCheckinBreath 10s ease-in-out infinite}
${EOS_A} .eosCheckIn[data-step="2"] .eosCkGlow{top:36%;background:radial-gradient(circle,hsla(var(--eos-h),100%,66%,.26) 0,hsla(var(--eos-h),100%,55%,.08) 40%,transparent 68%)}
${EOS_A} .eosCkTrack{position:absolute;translate:-50% -50%;border-radius:50%;pointer-events:none;border:1.5px dashed rgba(255,229,138,.16);
box-shadow:0 0 0 1px rgba(125,227,255,.05),inset 0 0 60px rgba(125,227,255,.05);animation:eosCheckinPop .7s cubic-bezier(.3,1.4,.4,1) both}
${EOS_A} .eosCkTrack::after{content:"";position:absolute;inset:-2px;border-radius:50%;padding:2px;background:conic-gradient(from 0deg,transparent 0 70%,rgba(255,229,138,.55) 82%,transparent 90%);
-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:eosCheckinSpin 14s linear infinite}
${EOS_A} .eosCkHead{position:absolute;left:0;right:0;top:14px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 16px;text-align:center;pointer-events:none;animation:eosCheckinRise .5s cubic-bezier(.2,.8,.2,1) both}
${EOS_A} .eosCkTitle{margin:0;font:900 clamp(30px,3.4vw,44px)/1.02 var(--eos-font);letter-spacing:.01em;background:linear-gradient(180deg,#fffbe6 0,#ffe58a 45%,#ffb23e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(90,40,0,.55)) drop-shadow(0 0 22px rgba(255,190,80,.25))}
${EOS_A} .eosCkHead.isCold > :is(.eosCkTitle,.eosCkSub){visibility:hidden}
${EOS_A} .eosCkHeadCold{position:absolute;left:12px;right:12px;top:-2px;bottom:-2px;display:flex;align-items:center;gap:8px;padding:4px 14px 4px 5px;border-radius:22px;text-align:left;
font:800 14px/1.2 var(--eos-font);color:#1b1235;background:linear-gradient(180deg,#fffdf2,#ffe9b0);box-shadow:0 5px 0 rgba(90,50,0,.35),0 12px 26px rgba(0,0,0,.4);animation:eosCheckinHeadIn .35s cubic-bezier(.2,.8,.2,1) both}
${EOS_A} .eosCkHeadCold .eosOrb{flex:0 0 auto;gap:0}
${EOS_A} .eosCheckIn.isWide .eosCkHeadCold{left:50%;right:auto;width:min(640px,calc(100% - 32px));translate:-50% 0;justify-content:center;font-size:17px;border-radius:999px;padding-right:22px}
${EOS_A} .eosCkSub{margin:0;font:700 15px/1.25 var(--eos-font);color:rgba(232,240,255,.9);text-shadow:0 2px 8px rgba(0,0,0,.6)}
${EOS_A} .eosCkRing{position:absolute;inset:0;pointer-events:none}
${EOS_A} .eosCkSlot{position:absolute;left:0;top:0;width:0;height:0;will-change:transform}
${EOS_A} .eosCkScale{position:absolute;left:0;top:0;translate:-50% calc(var(--eos-orb,96px) * -0.5);transform-origin:50% calc(var(--eos-orb,96px) * .5)}
${EOS_A} .eosCkSlot .eosOrb{touch-action:manipulation;-webkit-touch-callout:none}
${EOS_A} .eosCkSlot .eosOrbLabel{font-size:15px}
${EOS_A} .eosCkSlot .eosOrbSub{white-space:nowrap;text-align:center;font-size:12.5px;line-height:1.18;color:rgba(232,240,255,.9)}
${EOS_A} .eosCkSlot .eosOrbName{position:absolute;left:50%;top:calc(var(--eos-orb) - 13px);translate:-50% 0;font-size:12.5px;box-shadow:0 2px 0 rgba(0,0,0,.4),0 0 0 1.5px hsla(var(--eos-h),100%,70%,.55);z-index:2;pointer-events:none}
${EOS_A} .eosCkSlot .eosOrbLabel{margin-top:8px}
${EOS_A} .eosCkSubPart{white-space:nowrap}
${EOS_A} .eosCkSlot.isSel .eosOrbName{font-size:13px;top:calc(var(--eos-orb) - 15px)}
${EOS_A} .eosCkSlot .eosOrbBall{transition:width .45s cubic-bezier(.3,1.5,.4,1),height .45s cubic-bezier(.3,1.5,.4,1),opacity .25s ease,filter .25s ease,box-shadow .25s ease}
${EOS_A} .eosCkNotSure .eosOrbBall{box-shadow:inset 0 -8px 18px rgba(20,8,48,.45),inset 0 5px 12px rgba(255,240,215,.25),0 10px 0 rgba(8,6,30,.45),0 0 0 3px rgba(125,227,255,.35),0 0 56px rgba(125,227,255,.55)}
${EOS_A} .eosCkSlot.isHop .eosOrbBall{box-shadow:inset 0 -8px 18px rgba(20,8,48,.45),0 0 0 4px var(--eos-gold-1),0 0 0 9px rgba(255,210,90,.28),0 0 48px rgba(255,200,80,.85);scale:1.07;transition:scale .22s cubic-bezier(.3,1.6,.4,1),box-shadow .22s ease}
${EOS_A} .eosCkSlot.isSel .eosOrbBall{box-shadow:inset 0 -10px 22px rgba(20,8,48,.45),inset 0 6px 14px rgba(255,240,215,.3),0 12px 0 rgba(8,6,30,.45),0 0 0 4px var(--eos-gold-1),0 0 90px hsla(var(--eos-h),100%,62%,.9)}
${EOS_A} .eosCkSlot.isRail .eosOrb .eosOrbLabel{font-size:13px;margin-top:6px}
${EOS_A} .eosCkPress{position:absolute;left:50%;top:0;width:var(--eos-orb);height:var(--eos-orb);translate:-50% 0;border-radius:50%;pointer-events:none;scale:0;opacity:0;
background:radial-gradient(circle,rgba(255,240,170,.0) 0 40%,rgba(255,226,120,.55) 62%,rgba(255,200,80,.0) 72%);z-index:1}
${EOS_A} .eosCkSlot.isPressing .eosCkPress{animation:eosCheckinPress ${EOS_CHECKIN_LONG_MS}ms linear forwards}
${EOS_A} .eosCkScale.isShake{animation:eosCheckinShake .16s linear infinite}
${EOS_A} .eosCkSlot.isHint .eosOrbBall{animation:eosCheckinHint 1.1s ease-in-out infinite}
${EOS_A} .eosCkBubble{position:absolute;left:0;bottom:calc(var(--eos-orb,96px) * .5 + 14px);translate:-50% 0;z-index:8;max-width:240px;width:max-content;padding:9px 14px;border-radius:16px;border:0;
font:800 14px/1.25 var(--eos-font)!important;color:#1b1235!important;background:linear-gradient(180deg,#fffdf2,#ffe9b0)!important;box-shadow:0 6px 0 rgba(90,50,0,.35),0 14px 30px rgba(0,0,0,.4)!important;opacity:1!important;text-align:center;animation:eosCheckinBubble .4s cubic-bezier(.3,1.6,.4,1) both}
${EOS_A} .eosCkBubble::after{content:"";position:absolute;left:50%;bottom:-8px;width:16px;height:16px;translate:-50% 0;rotate:45deg;background:#ffe9b0;border-radius:3px}
${EOS_A} button.eosCkBubble{cursor:pointer;pointer-events:auto;min-height:44px}
${EOS_A} .eosCkSlot[data-eos-slot="auto"] .eosCkBubble{bottom:calc(var(--eos-orb,110px) * .5 + 18px)}
${EOS_A} .eosCkBottom{position:absolute;left:0;right:0;bottom:4px;display:flex;flex-direction:column;align-items:center;gap:4px;z-index:7}
${EOS_A} .eosCkChips{position:relative;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;padding:0 12px;animation:eosCheckinRise .5s .25s cubic-bezier(.2,.8,.2,1) both}
${EOS_A} .eosCkChip{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid rgba(255,255,255,.22);background:rgba(14,16,48,.72);color:#eaf2ff;font:800 14px/1 var(--eos-font);letter-spacing:.02em;cursor:pointer;box-shadow:0 4px 0 rgba(4,4,20,.55),0 10px 22px rgba(0,0,0,.3);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
${EOS_A} .eosCkChip:hover,${EOS_A} .eosCkChip:focus-visible{border-color:rgba(255,229,138,.7);outline:none}
${EOS_A} .eosCkChip.isOn{border-color:rgba(125,227,255,.6)}
${EOS_A} .eosCkChip.isGood{color:#2a1600;border-color:rgba(255,240,180,.9);background:linear-gradient(180deg,#fff3c4,#ffd36b 55%,#ffb23e);box-shadow:0 4px 0 #b86a12,0 10px 24px rgba(255,180,60,.35)}
${EOS_A} .eosCkChip.isGood span{font-size:16px}
${EOS_A} .eosCkFoot{position:relative;display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:0 8px;padding:0 10px}
${EOS_A} .eosCkLink{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 8px;border:0;background:none;color:rgba(222,234,255,.88);font:700 13px/1 var(--eos-font);letter-spacing:.02em;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(255,255,255,.25);text-underline-offset:4px;text-shadow:0 1px 6px rgba(0,0,0,.7)}
${EOS_A} .eosCkLink:hover,${EOS_A} .eosCkLink:focus-visible{color:#fff;text-decoration-color:var(--eos-gold-1);outline:none}
${EOS_A} .eosCkLink.isSupport{color:#ffe9b0}
${EOS_A} .eosCkLink.isOn{color:#7de3ff}
${EOS_A} .eosCkHalf{display:inline-block;flex:0 0 auto;width:11px;height:11px;margin-right:6px;border-radius:50%;border:1.5px solid currentColor;background:linear-gradient(90deg,currentColor 0 50%,transparent 50%)}
${EOS_A} .eosCkPanel{position:absolute;left:50%;top:0;bottom:62px;width:min(560px,calc(100% - 300px));translate:-50% 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px 0;animation:eosCheckinFade .35s ease both}
${EOS_A} .eosCkBanner{padding:8px 14px;border-radius:999px;background:linear-gradient(90deg,rgba(255,229,138,.18),rgba(125,227,255,.16));border:1px solid rgba(255,229,138,.5);font:800 14px/1.2 var(--eos-font);color:#fff3c4;text-align:center}
${EOS_A} .eosCkQ{margin:0;font:900 clamp(24px,2.6vw,34px)/1.1 var(--eos-font);text-align:center;color:#fff;text-shadow:0 3px 0 rgba(10,6,40,.6),0 0 24px hsla(var(--eos-h),100%,60%,.45)}
${EOS_A} .eosCkMeet{display:block;font-size:.62em;letter-spacing:.03em;color:hsl(var(--eos-h),100%,84%);margin-bottom:2px}
${EOS_A} .eosCkSpot{flex:0 0 auto;width:10px}
${EOS_A} .eosCkDialWrap{position:relative;width:100%;display:flex;justify-content:center}
${EOS_A} .eosCkDialWrap .eosDial{width:min(100%,520px);flex-direction:column-reverse;gap:4px}
/* the track sits right under the orb's name tag (the spot reserves the 1.25× orb); the big number + word read below it */
${EOS_A} .eosCkDialWrap{margin-top:2px}
${EOS_A} .eosCkDialWrap .eosDialReadout{min-height:40px}
${EOS_A} .eosCkNamed{margin:-2px 0 0;font:italic 700 14px/1.2 var(--eos-font);color:rgba(255,233,176,.95)}
${EOS_A} .eosCkWords{display:flex;flex-direction:column;align-items:center;gap:2px}
${EOS_A} .eosCkWordsQ{display:inline-flex;align-items:center;gap:6px;min-height:44px!important;padding:0 8px;border:0;background:none;cursor:pointer;font:800 13px/1 var(--eos-font);letter-spacing:.04em;color:rgba(222,234,255,.88)}
${EOS_A} .eosCkWordsQ .eosCkChevron{color:var(--eos-gold-1);font-size:22px;text-shadow:0 0 10px rgba(255,200,80,.8)}
${EOS_A} .eosCheckIn.isPhone .eosCkMicWord:not(.isOn){display:none}
${EOS_A} .eosCheckIn.isPhone .eosCkSeed{padding:0 11px;font-size:13.5px}
${EOS_A} .eosCkSeedRow{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
${EOS_A} .eosCkSeed{min-height:44px;padding:0 13px;border-radius:999px;border:1.5px solid hsla(var(--eos-h),90%,70%,.45);background:hsla(var(--eos-h),60%,22%,.55);color:#f2f6ff;font:800 14px/1 var(--eos-font);cursor:pointer}
${EOS_A} .eosCkSeed.isOn{background:hsla(var(--eos-h),95%,62%,.9);color:var(--eos-ink);border-color:#fff}
${EOS_A} .eosCkSeed.isMic.isOn{background:#ff6f91;color:#fff;animation:eosCheckinHint 1.2s ease-in-out infinite}
${EOS_A} .eosCkChevron{display:inline-block;font-size:18px;line-height:0;translate:0 -3px;animation:eosCheckinNudge 1.4s ease-in-out infinite}
${EOS_A} .eosCkNote{margin:0;font:700 12px/1.2 var(--eos-font);color:rgba(222,234,255,.8)}
${EOS_A} .eosCkCtaWrap{position:relative;display:flex;justify-content:center;margin-top:4px}
${EOS_A} .eosCkCta{position:relative;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:58px;min-width:240px;padding:8px 28px 9px;border:0;border-radius:999px;cursor:pointer;color:#2a1600;
background:linear-gradient(180deg,#fff7cf 0,#ffe58a 30%,#ffb23e 78%,#ff8a2e 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.8),inset 0 -4px 0 rgba(170,80,0,.35),0 6px 0 #a85a0c,0 16px 30px rgba(255,160,40,.35);transition:translate .12s ease,box-shadow .12s ease}
${EOS_A} .eosCkCta:active{translate:0 4px;box-shadow:inset 0 2px 0 rgba(255,255,255,.8),inset 0 -3px 0 rgba(170,80,0,.35),0 2px 0 #a85a0c,0 8px 18px rgba(255,160,40,.3)}
${EOS_A} .eosCkCta:focus-visible{outline:3px solid #fff;outline-offset:3px}
${EOS_A} .eosCkCtaMain{font:900 18px/1 var(--eos-font);letter-spacing:.06em}
${EOS_A} .eosCkCtaSub{font:800 13px/1 var(--eos-font);letter-spacing:.03em;color:rgba(60,28,0,.85)}
${EOS_A} .eosCkLinks{display:flex;gap:14px;justify-content:center}
${EOS_A} .eosCkCue{position:absolute;pointer-events:none;display:flex;align-items:center;gap:6px;font:900 14px/1 var(--eos-font);letter-spacing:.08em;color:#2a1600;z-index:4}
${EOS_A} .eosCkCtaTap{position:absolute;right:4px;top:30%;width:16px;height:16px;margin-top:-8px;pointer-events:none}
/* guidance labels — the same gold-rimmed pill as the arrows module's labels, placed where they cover nothing */
${EOS_A} .eosCkPill{position:absolute;z-index:9;pointer-events:none;white-space:nowrap;font:900 15px/1.12 var(--eos-font);text-transform:uppercase;letter-spacing:.06em;color:#fff;background:rgba(16,14,48,.92);border:2px solid #FFD36B;border-radius:999px;padding:8px 14px;
box-shadow:0 4px 0 rgba(8,6,30,.7),0 10px 26px rgba(0,0,0,.38),0 0 18px rgba(255,200,90,.28);animation:eosCheckinBubble .3s .6s cubic-bezier(.3,1.6,.4,1) both}
${EOS_A} .eosCheckIn.isPhone .eosCkPill{font-size:14px;padding:6px 11px}
${EOS_A} .eosCkPill.isLane{left:50%;translate:-50% -50%}
${EOS_A} .eosCkPill.isSlide{right:max(4px,calc((100% - 520px) / 2 + 4px));bottom:calc(100% + 8px);animation-delay:.2s}
${EOS_A} .eosCkHint{position:absolute;inset:0;pointer-events:none;z-index:9}
${EOS_A} .eosCkHint[data-eos-hint="choose"] :is(.eosHalo,.eosHaloBase){border-radius:50%!important}
${EOS_A} .eosCkHint:is([data-eos-hint="choose"],[data-eos-hint="cta"]) .eosChevPos{display:none!important}
${EOS_A} .eosCkCue.isDial{left:50%;top:6px;translate:-50% 0}
${EOS_A} .eosCkCueHand{font-size:30px;line-height:1;filter:drop-shadow(0 3px 4px rgba(0,0,0,.5));animation:eosCheckinSlide 1.6s ease-in-out infinite}
${EOS_A} .eosCkCue.isCta{left:calc(100% - 25px);top:calc(30% - 10px);animation:eosCheckinBubble .35s cubic-bezier(.3,1.6,.4,1) both}
${EOS_A} .eosCkCueTap{font-size:30px;line-height:1;rotate:-24deg;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55));animation:eosCheckinTap 1.1s ease-in-out infinite}
${EOS_A} .eosCkCta.isNudge{animation:eosCheckinRing 1.1s ease-out infinite}
${EOS_A} .eosCkPop{position:absolute;left:50%;bottom:calc(100% + 6px);translate:-50% 0;z-index:12;width:min(420px,calc(100% - 32px));padding:16px 48px 16px 18px;border-radius:20px;background:rgba(12,14,44,.96);border:1.5px solid rgba(255,229,138,.45);box-shadow:0 18px 40px rgba(0,0,0,.55);animation:eosCheckinBubble .3s cubic-bezier(.3,1.5,.4,1) both}
${EOS_A} .eosCkPopText{margin:0;font:700 15px/1.4 var(--eos-font);color:#f2f6ff}
${EOS_A} .eosCkPopText b{display:block;margin-bottom:6px;color:#ffe9b0}
${EOS_A} .eosCkPopText small{display:block;margin-top:8px;font:700 13px/1.3 var(--eos-font);color:rgba(222,234,255,.85)}
${EOS_A} .eosCkLines{margin:0;padding:0 0 0 18px;font:700 14px/1.5 var(--eos-font)}
${EOS_A} .eosCkPopX{position:absolute;right:4px;top:4px;width:44px;height:44px;border:0;border-radius:50%;background:none;color:#fff;font:900 16px/1 var(--eos-font);cursor:pointer}
${EOS_A} .eosCkDive{position:absolute;inset:0;z-index:20;pointer-events:none;background:radial-gradient(circle at var(--eos-x) var(--eos-y),hsla(var(--eos-h),100%,86%,.98) 0,hsla(var(--eos-h),95%,62%,.96) 22%,hsla(var(--eos-h),80%,26%,.97) 70%,hsla(var(--eos-h),70%,12%,.98) 100%)}
${EOS_A} .eosCheckIn.isPhone .eosCkHead{top:10px;gap:2px}
${EOS_A} .eosCheckIn.isPhone .eosCkTitle{font-size:29px}
${EOS_A} .eosCheckIn.isPhone .eosCkSub{font-size:14px}
${EOS_A} .eosCheckIn.isPhone .eosCkSlot .eosOrb{gap:4px}
${EOS_A} .eosCheckIn.isPhone .eosCkSlot .eosOrbLabel{margin-top:6px}
${EOS_A} .eosCheckIn.isPhone .eosCkSlot .eosOrbSub{white-space:normal;max-width:132px;font-size:12.5px;letter-spacing:0;line-height:1.12}
${EOS_A} .eosCheckIn.isPhone .eosCkSlot[data-eos-slot="overthinking"] .eosOrbLabel{font-size:13px;letter-spacing:.02em}
${EOS_A} .eosCheckIn.isPhone .eosCkPanel{width:calc(100% - 24px);gap:8px}
${EOS_A} .eosCheckIn.isPhone .eosCkQ{font-size:24px}
${EOS_A} .eosCheckIn.isPhone .eosCkBanner{padding:6px 12px;font-size:13.5px}
${EOS_A} .eosCheckIn.isPhone[data-step="2"] .eosCkPanel:has(.eosCkBanner){padding-top:2px}
${EOS_A} .eosCheckIn.isPhone .eosCkFoot{gap:0 4px}
${EOS_A} .eosCheckIn.isPhone[data-step="1"] .eosCkBottom{gap:0}
${EOS_A} .eosCheckIn.isPhone[data-step="2"] .eosCkPanel{position:relative;left:auto;top:auto;bottom:auto;translate:none;margin:0 auto;min-height:0;padding:6px 0 4px}
${EOS_A} .eosCheckIn.isPhone[data-step="2"] .eosCkBottom{position:relative;bottom:auto;margin:2px 0 4px}
${EOS_A} .eosCheckInChip{position:absolute;left:12px;top:12px;z-index:32;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:4px 16px 4px 6px;border-radius:999px;cursor:pointer;
border:1.5px solid rgba(125,227,255,.45);background:rgba(10,12,40,.82);color:#f2f6ff;font:800 13px/1 var(--eos-font);box-shadow:0 4px 0 rgba(4,4,20,.6),0 0 24px rgba(125,227,255,.25);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:eosCheckinBubble .45s cubic-bezier(.3,1.5,.4,1) both}
${EOS_A} .eosCheckInChip:hover,${EOS_A} .eosCheckInChip:focus-visible{border-color:var(--eos-gold-1);outline:none}
${EOS_A} .eosCheckInChip .eosOrb{pointer-events:none;gap:0}
${EOS_A} .eosCheckInChip .eosOrbBall{box-shadow:inset 0 -3px 6px rgba(20,8,48,.45),0 0 12px rgba(125,227,255,.6)}
${EOS_A} .eosCkChipText{font:800 13px/1 var(--eos-font);letter-spacing:.02em;white-space:nowrap}
${EOS_A} .eosCompanion{position:absolute;z-index:55;pointer-events:none;display:flex;align-items:center;flex-direction:row-reverse;gap:8px;font-family:var(--eos-font);animation:eosCheckinBubble .5s cubic-bezier(.3,1.5,.4,1) both}
${EOS_A} .eosCompBody{position:relative;flex:0 0 auto}
${EOS_A} .eosCompBody.isBounce{animation:eosCheckinBounce .9s cubic-bezier(.3,1.6,.4,1)}
${EOS_A} .eosCompanion .eosOrbBall{width:var(--eos-orb);height:var(--eos-orb)}
${EOS_A} .eosCompanion .eosOrbBall.isGrey .eosOrbFace{filter:grayscale(1) brightness(.85)}
${EOS_A} .eosCompCur{animation:eosCheckinFade .3s ease both}
${EOS_A} .eosCompStar{position:absolute;right:-6px;top:-10px;font:900 22px/1 var(--eos-font);color:var(--eos-gold-1);text-shadow:0 0 12px rgba(255,200,80,.95);animation:eosCheckinBubble .4s cubic-bezier(.3,1.6,.4,1) both}
${EOS_A} .eosCompBubble{max-width:200px;padding:8px 12px;border-radius:14px;background:linear-gradient(180deg,#fffdf2,#ffe9b0);color:#1b1235;font:800 14px/1.2 var(--eos-font);box-shadow:0 4px 0 rgba(90,50,0,.35),0 10px 22px rgba(0,0,0,.4);animation:eosCheckinBubble .35s cubic-bezier(.3,1.6,.4,1) both;white-space:normal}
${EOS_A} .eosCompBubble.isFinish{background:linear-gradient(180deg,#e9fffb,#9ff0e6);color:#062a2a}
@keyframes eosCheckinBreath{0%,100%{scale:.92;opacity:.75}40%{scale:1.06;opacity:1}}
@keyframes eosCheckinSpin{to{rotate:360deg}}
@keyframes eosCheckinHeadIn{0%{scale:.94;opacity:0}100%{scale:1;opacity:1}}
@keyframes eosCheckinPop{0%{scale:.6;opacity:0}100%{scale:1;opacity:1}}
@keyframes eosCheckinRise{0%{translate:0 14px;opacity:0}100%{translate:0 0;opacity:1}}
@keyframes eosCheckinFade{0%{opacity:0}100%{opacity:1}}
@keyframes eosCheckinBubble{0%{scale:.5;opacity:0}70%{scale:1.06;opacity:1}100%{scale:1;opacity:1}}
@keyframes eosCheckinPress{0%{scale:.2;opacity:.2}100%{scale:1.18;opacity:1}}
@keyframes eosCheckinShake{0%,100%{translate:-50% calc(var(--eos-orb,96px) * -0.5)}25%{translate:calc(-50% - 2px) calc(var(--eos-orb,96px) * -0.5 + 1px)}75%{translate:calc(-50% + 2px) calc(var(--eos-orb,96px) * -0.5 - 1px)}}
@keyframes eosCheckinHint{0%,100%{scale:1}50%{scale:1.09}}
@keyframes eosCheckinNudge{0%,100%{translate:0 -3px}50%{translate:0 3px}}
@keyframes eosCheckinTap{0%,100%{translate:0 0}45%{translate:-7px -9px}60%{translate:-5px -6px}}
@keyframes eosCheckinRing{0%{box-shadow:inset 0 2px 0 rgba(255,255,255,.8),inset 0 -4px 0 rgba(170,80,0,.35),0 6px 0 #a85a0c,0 0 0 0 rgba(255,229,138,.85)}100%{box-shadow:inset 0 2px 0 rgba(255,255,255,.8),inset 0 -4px 0 rgba(170,80,0,.35),0 6px 0 #a85a0c,0 0 0 18px rgba(255,229,138,0)}}
@keyframes eosCheckinSlide{0%,100%{translate:-70px 0}50%{translate:70px 0}}
@keyframes eosCheckinBounce{0%{translate:0 0}30%{translate:0 -18px;scale:1.08 .94}55%{translate:0 0;scale:.94 1.06}75%{translate:0 -6px}100%{translate:0 0;scale:1}}
${EOS_A} :is(.eosCheckIn,.eosCheckInChip,.eosCompanion)[data-eos-calm="1"] :is(.eosCkGlow,.eosCkTrack,.eosCkTrack::after,.eosCkHead,.eosCkChips,.eosCkPanel,.eosCkBubble,.eosCkCue,.eosCkCueHand,.eosCkCueTap,.eosCkCta,.eosCkPill,.eosCkHeadCold,.eosCkChevron,.eosCkScale,.eosOrbBall,.eosCompBody,.eosCompBubble,.eosCompStar,.eosCkPop,.eosCkSeed){animation:none!important}
${EOS_A} :is(.eosCheckInChip,.eosCompanion)[data-eos-calm="1"]{animation:eosCheckinFade .2s ease both}
${EOS_A} .eosCheckIn[data-eos-calm="1"] .eosCkTrack::after{display:none}
${EOS_A} .eosCompanion[data-eos-calm="1"] .eosCompCur{animation:eosCheckinFade .3s ease both!important}
@media (prefers-reduced-motion:reduce){${EOS_A} :is(.eosCheckIn,.eosCheckInChip,.eosCompanion) *{animation-duration:.01ms!important;animation-iteration-count:1!important}${EOS_A} .eosCompanion .eosCompCur{animation:eosCheckinFade .3s ease both!important}}
`
eosCss("checkin", EOS_CHECKIN_CSS)

eosExpose("checkin", {
    EosCheckIn,
    EosCheckInChip,
    EosCompanion,
    EOS_CHECKIN_RING,
    EOS_CHECKIN_MORE,
    EOS_CHECKIN_GOOD_GAME,
    faces: eosCheckinFaces,
    faceSrc: eosFace,
    preview: eosCheckinPreview,
})
