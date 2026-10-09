// ===================================================================================
// Pilot A · 73_pilot_cleanse.jsx — CLEANSE (id 109) "Moon Pool" (Release · breath role · pool kit).
// Spec: docs/pilot/PILOT_A_SPEC.md §3.2 (storyboard, per-orb beat, finale "Clearest Night", layout, cues),
// built on the shared systems in 70_pilot_core.jsx / 71_pilot_fx.jsx (S0-S6). Concatenated after the release
// modules by dev/pilot_build.py. Rules: no import/export, no regex lookbehind, top-level names EosPilot/eosPilot/EOS_PILOT.
//
// The game: six characters sit in clouded glass orbs on a still night pool. Hold an orb: it breathes in with you
// and clear water rises inside it. Let go: it breathes the murk out (ink that disperses in the water), the glass
// clears, it settles on a lily pad, and one lotus petal glows. The protagonist waits front-centre for last; when
// it clears, the pool turns to a mirror, a moon path lays itself to the lotus, the protagonist glides up, the
// lotus opens, STILL wakes inside it and the two touch foreheads in the lotus's gold light under the clearest night.
// ===================================================================================

const EOS_PILOT_CLEANSE = {
    id: 109,
    verb: "CLEANSED",
    kit: "pool",
    holdMs: 850, // acceptance threshold (silent): a release after it counts as a clear
    fillMs: 3000, // the full breath (~3 s inhale)
    exhaleMs: 2400, // the exhale you watch (>= 2.4 s, ~11 breaths a minute)
    readyMs: 700, // the marker goes live
    nameMs: 1700, // the protagonist's name shows in its caption slot until here (CR-18), then the action caption
    melody: [392, 440, 494, 587, 659, 784], // G major pentatonic rising to the tonic G5 (CR-16)
    marker: { g: "hold", ms: 3000, mvar: "--hold-pct", label: "BREATHE IN… LET GO" },
    // slot -> [x, y] as fractions of the S5 play box. F = front row, B = back row; FC is the protagonist's seat.
    slots: {
        phone: { F0: [0.18, 0.79], FC: [0.5, 0.79], F2: [0.82, 0.79], B0: [0.18, 0.33], BC: [0.5, 0.33], B2: [0.82, 0.33] },
        desk: { F0: [0.46, 0.8], FC: [0.64, 0.8], F2: [0.82, 0.8], B0: [0.46, 0.33], BC: [0.64, 0.33], B2: [0.82, 0.33] },
    },
    lotus: { phone: [0.5, 0.6, 122], desk: [0.64, 0.6, 160] },
    size: { phone: { back: 68, front: 88, hero: 96, still: 58 }, desk: { back: 80, front: 100, hero: 108, still: 76 } },
    fill: { 1: ["FC"], 2: ["FC", "BC"], 3: ["F0", "FC", "F2"], 4: ["F0", "FC", "F2", "BC"], 5: ["F0", "FC", "F2", "B0", "B2"], 6: ["F0", "FC", "F2", "B0", "BC", "B2"] },
    order: ["F0", "F2", "B0", "BC", "B2", "FC"], // suggested order: front sides -> back row -> the protagonist last
    // 8 petals: closed (bud) and open angles; DOM order = depth (outer petals behind, inner in front of STILL)
    petals: [
        { a0: -16, a: -80, o: 0 },
        { a0: 16, a: 80, o: 1 },
        { a0: -11, a: -58, o: 2 },
        { a0: 11, a: 58, o: 3 },
        { a0: -7, a: -36, o: 4 },
        { a0: 7, a: 36, o: 5 },
        { a0: -3, a: -13, o: 6, front: true },
        { a0: 3, a: 13, o: 7, front: true },
    ],
    litOrder: [6, 7, 4, 5, 2, 3, 0, 1], // petals glow from the heart outward
    murkStep: [1, 0.6, 0.42], // murk inside the uncleared orbs by global face step (34% halves it)
    // acting pool for the settle after an exhale (never the same twice in a row, CR-4b / F10)
    settle: [
        { id: "nod", face: "phew" },
        { id: "lotus", face: "phew" },
        { id: "camera", face: "phew" },
        { id: "sway", face: "phew" },
    ],
}
// S4 cue table (§3.2 "Sound cue table"). Input-driven layers fire inside the pointer handler; timed cues via snd.later.
const EOS_PILOT_CLEANSE_CUES = {
    hold: [{ tone: [330, 400, { type: "sine", gain: 0.02, glide: 392 }] }, { arcade: "soft" }], // s1 (explicit game: no toast)
    ready: [{ tone: [784, 220, { type: "sine", gain: 0.03 }], haptic: EOS_HAPTIC.notch }], // s2 (hold start + 3000)
    exhale: [{ tone: [587, 1200, { type: "sine", gain: 0.02, glide: 392 }], haptic: EOS_HAPTIC.exhale }, { arcade: "pop" }], // s3
    clear: [{ tone: (o) => [o.f || 784, 260, { type: "sine", gain: 0.03 }] }], // s4 (release + 600)
    clearDeep: [{ tone: (o) => [o.f || 1175, 300, { type: "sine", gain: 0.02 }] }], // s4 deep clear: the fifth above at +720
    almost: [{ tone: [392, 120, { type: "triangle", gain: 0.02, glide: 330 }] }], // s5
    ripple: [{ tone: [196, 900, { type: "sine", gain: 0.04 }] }, { tone: [294, 900, { type: "sine", gain: 0.04 }] }], // s6
    lotus: [{ tone: (o) => [o.f || 392, 520, { type: "sine", gain: 0.026 }] }], // s7 arpeggio, one row per note
    night: [{ tone: [196, 1400, { type: "sine", gain: 0.012 }] }, { tone: [294, 1400, { type: "sine", gain: 0.012 }] }, { tone: [392, 1400, { type: "sine", gain: 0.012 }] }], // s8
    tap: [{ tone: [523, 80, { type: "sine", gain: 0.01 }] }], // s9 finale tap
    early: [{ tone: [880, 40, { type: "sine", gain: 0.012 }] }],
    miss: [{ tone: [262, 130, { type: "triangle", gain: 0.016, glide: 247 }] }],
    wait: [{ tone: [440, 90, { type: "sine", gain: 0.014, glide: 392 }] }],
}
// The ball's inner layers (fixed nodes): the murk (ink swirl in ::before) and the clear-water fill (S5 hold visual).
const EOS_PILOT_CLEANSE_BALL = (
    <>
        <i className="cMurk" aria-hidden="true" />
        <i className="eosPilotFill" aria-hidden="true" />
    </>
)

function EosPilotCleanseEngine(p) {
    const live = React.useRef(p)
    live.current = p
    const wordsKey = (p.entries || []).map((e) => (typeof e === "string" ? e : displayText(e, 40))).join("\u0001")
    return <EosPilotCleanseInner live={live} wordsKey={wordsKey} reduced={!!p.reduced} userImgKey={eosPilotImgKey(p)} />
}

const EosPilotCleanseInner = React.memo(function EosPilotCleanseInner({ live, wordsKey, reduced, userImgKey }) {
    const C = EOS_PILOT_CLEANSE
    const gameId = C.id
    const arenaRef = React.useRef(null)
    const stageRef = React.useRef(null)
    const lotusRef = React.useRef(null)
    const stillRef = React.useRef(null)
    const stillWrapRef = React.useRef(null)
    const countRef = React.useRef(null)
    const sweepRef = React.useRef(null)
    const pathRef = React.useRef(null)
    const hitsRef = React.useRef({})
    const actorsRef = React.useRef({})
    const goneRef = React.useRef({})
    const S = React.useRef(null)
    if (!S.current) S.current = { k: 0, hold: null, holdT: 0, murk: {}, fillA: {}, capT: {}, pick: { current: -1 }, miss: 0, risen: -1, wave: 0, phase: "intro", breathT: 0 }
    const st = S.current
    const rt = useEosPilotRuntime()
    const shell = useEosPilotShell(arenaRef, gameId)
    const box = useEosPilotBox(arenaRef)
    const [k, setK] = React.useState(0)
    const [wave, setWave] = React.useState(0)
    const [phase, setPhaseState] = React.useState("intro") // intro | play | between | finale
    const setPhase = (v) => {
        st.phase = v
        setPhaseState(v)
    }
    st.wave = wave

    // ---- words, waves, captions, cast (memoised on the joined words, S0)
    const W = React.useMemo(() => {
        const r = eosPilotWords(wordsKey ? wordsKey.split("\u0001") : [], 6)
        const waves = r.waves.length ? r.waves : [["this feeling"]]
        return { waves, N: waves.reduce((s, w) => s + w.length, 0) }
    }, [wordsKey])
    const actions = React.useMemo(() => {
        try {
            const pr = releaseEmotionProfile((live.current && live.current.entries) || [])
            return (pr && pr.actions) || []
        } catch (e) {
            return []
        }
    }, [wordsKey])
    const capFor = (gi) => `hold to ${String(actions.length ? actions[gi % actions.length] : "calm").toLowerCase()}`
    const hero = React.useMemo(() => {
        let e = null
        try {
            e = typeof eosCurrentEmotion === "function" ? eosCurrentEmotion() : null
        } catch (x) {}
        if (!e || !EOS_EMO[e] || !EOS_EMO[e].char || EOS_EMO[e].char === "still") e = EOS_AROUSAL_ORDER.find((id) => EOS_EMO[id] && EOS_EMO[id].char && EOS_EMO[id].char !== "still") || "panic"
        const ch = eosPilotCharOk(EOS_EMO[e] ? EOS_EMO[e].char : "sync")
        return { emotion: e, char: ch, name: (EOS_CHAR_NAMES && EOS_CHAR_NAMES[ch]) || "SYNC" }
    }, [])
    const plan = React.useMemo(() => {
        let gi = 0
        return W.waves.map((ws, wi) => {
            const n = Math.max(1, Math.min(6, ws.length))
            const last = wi === W.waves.length - 1
            const slots = C.order.filter((s) => C.fill[n].indexOf(s) >= 0)
            const used = { still: 1 }
            if (last) used[hero.char] = 1
            const orbs = slots.map((slot, j) => {
                const isHero = last && slot === "FC"
                let ch = hero.char
                if (!isHero) {
                    ch = eosPilotCharFor(ws[j], gi + j + 1, used)
                    used[ch] = 1
                }
                return { slot, word: ws[j], gi: gi + j, isHero, char: ch, j }
            })
            gi += n
            return { orbs, last, n }
        })
    }, [W, hero])
    const userImgs = React.useMemo(() => (userImgKey ? userImgKey.split("\u0001") : []), []) // snapshot at mount (S0)
    const snd = useEosPilotSound({ gameId, live, cues: EOS_PILOT_CLEANSE_CUES, timers: rt.timers })
    const N = W.N
    const pctOf = (kk) => (kk >= N ? EOS_PILOT_FINAL_PCT : Math.round((kk / N) * 100))
    const pct = pctOf(k)
    const report = (v) => {
        try {
            live.current.onProgress(v, `${v}% ${C.verb}`)
        } catch (e) {}
    }
    const isRed = () => eosPilotIsReduced(arenaRef.current, live)
    const W0 = plan[Math.min(wave, plan.length - 1)]
    const keyOf = (slot, w) => `${w == null ? st.wave : w}:${slot}`
    const orbOf = (slot) => (plan[st.wave] ? plan[st.wave].orbs.find((o) => o.slot === slot) : null)
    const stage = () => stageRef.current
    const centreOf = (el) => {
        const a = arenaRef.current
        if (!el || !a) return { x: 0, y: 0, r: 0 }
        const r = el.getBoundingClientRect()
        const A = a.getBoundingClientRect()
        return { x: r.left - A.left + r.width / 2, y: r.top - A.top + r.height / 2, r: r.width / 2 }
    }
    const ballOf = (slot) => {
        const el = hitsRef.current[slot]
        return el ? el.querySelector(".eosPilotActorBall") : null
    }
    // caption = an attribute shown by ::after (no text mutation per hit, G15)
    const setCap = (slot, text, kind) => {
        const el = hitsRef.current[slot]
        const sp = el ? el.querySelector(".eosPilotActorSub") : null
        if (!sp) return
        sp.setAttribute("data-cap", text)
        if (kind) sp.setAttribute("data-kind", kind)
        else sp.removeAttribute("data-kind")
    }
    const restCap = (slot) => {
        const o = orbOf(slot)
        if (o) setCap(slot, capFor(o.gi))
    }
    const flashCap = (slot, text, ms) => {
        setCap(slot, text, "coach")
        if (st.capT[slot]) rt.timers.clear(st.capT[slot])
        st.capT[slot] = rt.timers.later(() => {
            st.capT[slot] = 0
            if (st.hold !== slot) restCap(slot)
        }, ms)
    }
    const moonEl = () => {
        const s = stage()
        const l1 = s ? s.layer("l1") : null
        return l1 ? l1.querySelector(".moon") : null
    }
    const breathOwn = (ph, ms) => {
        try {
            eosBreathOwn(ph, ms)
        } catch (e) {}
    }
    const updateCount = (kk) => {
        const el = countRef.current
        if (el) el.setAttribute("data-n", `${Math.min(kk, N)} / ${N} CLEAR`)
    }
    const lightPetals = (kk, all) => {
        const L = lotusRef.current
        if (!L) return
        const lit = all ? 8 : Math.round((6 * kk) / N)
        const ps = L.querySelectorAll(".cPetal")
        C.litOrder.forEach((pi, n) => {
            const el = ps[pi]
            if (el && n < lit && el.getAttribute("data-on") !== "1") el.setAttribute("data-on", "1")
        })
    }

    React.useEffect(() => {
        report(0)
        return () => {
            breathOwn(null)
        }
    }, [])

    // ---- S2 finale "Clearest Night" (beats do DOM/WAAPI work only; T0 = the protagonist's release)
    const fin = useEosPilotFinale({
        arenaRef,
        live,
        gameId,
        bonus: 340 + N * 25,
        label: `100% ${C.verb}`,
        kit: C.kit,
        heroFace: () => eosPilotFaceSrc(hero.char, 3, hero.emotion, plan[plan.length - 1].orbs.find((o) => o.isHero).gi + 11),
        anims: rt.anims,
        timers: rt.timers,
        handoffMs: EOS_PILOT_HANDOFF_MS,
        beats: [
            {
                // 0-700 climax: the last ink dissolves, one ripple sweeps the whole pool, the water turns mirror-still
                id: "climax",
                at: 0,
                run: (c) => {
                    const A = arenaRef.current
                    const s = stage()
                    if (!A || !s) return
                    A.setAttribute("data-c-fin", "mirror")
                    s.particles("mirror", true)
                    const hc = centreOf(ballOf("FC"))
                    const sw = sweepRef.current
                    if (sw && !c.reduced && !c.skipped) {
                        sw.style.left = `${hc.x.toFixed(1)}px`
                        sw.style.top = `${(hc.y + hc.r * 0.7).toFixed(1)}px`
                        c.anim(sw, [{ transform: "scale(.2)", opacity: 1 }, { transform: "scale(3)", opacity: 0 }], { duration: 700, easing: "cubic-bezier(.2,.6,.3,1)" })
                    }
                    snd.later("ripple", 0, c.t0, { beat: "climax" })
                    // s7 arpeggio, timed from T0 (cancellable), finishing before the wrapper's win stings
                    ;[392, 494, 587, 740, 880].forEach((f, i) => snd.later("lotus", 850 + 100 * i, c.t0, { f, beat: "lotus" }))
                    snd.later("night", 1700, c.t0, { beat: "night" })
                },
            },
            {
                // 200-1000: the protagonist glides on its pad to the lotus; a silver moon path lays itself across the water
                id: "glide",
                at: 200,
                reducedAt: 100,
                run: (c) => {
                    const A = arenaRef.current
                    const L = lotusRef.current
                    const h = hitsRef.current.FC
                    if (!A || !L || !h) return
                    const ball = ballOf("FC")
                    const hc = centreOf(ball)
                    const lc = centreOf(L)
                    const sv = stillWrapRef.current ? centreOf(stillWrapRef.current) : { x: lc.x, y: lc.y }
                    const sr = (Number(A.style.getPropertyValue("--sv").replace("px", "")) || 62) / 2
                    // seat the protagonist right under STILL's risen position so the two can touch foreheads
                    const ty = sv.y - 18 + sr + hc.r - 4
                    const dx = lc.x - hc.x
                    const dy = ty - hc.y
                    const to = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`
                    h.style.transform = to
                    h.setAttribute("data-c-seat", "1")
                    if (c.reduced || c.skipped) {
                        if (!c.skipped) c.anim(h, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: "ease-out" })
                    } else c.anim(h, [{ transform: "none" }, { transform: to }], { duration: 800, easing: "cubic-bezier(.45,0,.25,1)" })
                    // moon path: from the moon's reflection to the lotus
                    const pe = pathRef.current
                    const mr = A.querySelector(".eosPilotStage .moonRefl")
                    if (pe && mr) {
                        const m = centreOf(mr)
                        const my = m.y - (mr.getBoundingClientRect().height || 0) * 0.3
                        const ex = lc.x
                        const ey = lc.y + (L.getBoundingClientRect().height || 0) * 0.2
                        const len = Math.hypot(ex - m.x, ey - my)
                        const ang = (Math.atan2(-(ex - m.x), ey - my) * 180) / Math.PI
                        pe.style.left = `${m.x.toFixed(1)}px`
                        pe.style.top = `${my.toFixed(1)}px`
                        pe.style.height = `${len.toFixed(1)}px`
                        const end = `rotate(${ang.toFixed(2)}deg) scaleY(1)`
                        pe.style.transform = end
                        A.setAttribute("data-c-path", "1")
                        if (!c.reduced && !c.skipped) c.anim(pe, [{ transform: `rotate(${ang.toFixed(2)}deg) scaleY(0)` }, { transform: end }], { duration: 700, easing: "cubic-bezier(.3,.6,.2,1)" })
                    }
                    // the cleared orbs turn on their pads to watch the lotus
                    for (const o of (plan[st.wave] || { orbs: [] }).orbs) {
                        const a = actorsRef.current[o.slot]
                        if (a && !o.isHero) a.look(L)
                    }
                    const ha = actorsRef.current.FC
                    if (ha) ha.look(L)
                },
            },
            {
                // 500-1300 transformation: the remaining petals open (staggered, the last completes at 1300)
                id: "transform",
                at: 500,
                run: () => {
                    const L = lotusRef.current
                    if (!L) return
                    lightPetals(N, true)
                    L.setAttribute("data-open", "1")
                },
            },
            {
                // 1300 PEAK (lands with the wrapper's win x 3): the lotus's gold becomes the key light, STILL wakes,
                // and STILL and the protagonist touch foreheads
                id: "peak",
                at: 1300,
                run: (c) => {
                    const A = arenaRef.current
                    if (!A) return
                    A.setAttribute("data-c-gold", "1")
                    const sw = sweepRef.current
                    const L = lotusRef.current
                    if (sw && L && !c.reduced && !c.skipped) {
                        const lc = centreOf(L)
                        sw.setAttribute("data-gold", "1")
                        sw.style.left = `${lc.x.toFixed(1)}px`
                        sw.style.top = `${(lc.y + lc.r * 0.4).toFixed(1)}px`
                        c.anim(sw, [{ transform: "scale(.15)", opacity: 1 }, { transform: "scale(2.2)", opacity: 0 }], { duration: 1100, easing: "cubic-bezier(.15,.7,.3,1)" })
                    }
                    const sa = stillRef.current
                    const swr = stillWrapRef.current
                    if (sa) {
                        sa.setStep(3)
                        sa.setUnder(0.7)
                    }
                    if (swr) {
                        swr.setAttribute("data-awake", "1")
                        swr.style.transform = "translateY(-18px)"
                        if (!c.reduced && !c.skipped) c.anim(swr, [{ transform: "none" }, { transform: "translateY(-22px)", offset: 0.7 }, { transform: "translateY(-18px)" }], { duration: 520, easing: "cubic-bezier(.3,.7,.3,1)" })
                    }
                    const ha = actorsRef.current.FC
                    if (ha) ha.setUnder(0.6)
                    const lean = (a, deg, dy) =>
                        a &&
                        a.celebrate([{ at: 0, part: "body", slot: "lean", keyframes: [{ transform: "none" }, { transform: `translateY(${dy}px) rotate(${deg}deg)` }], opts: { duration: 420, easing: "cubic-bezier(.3,.7,.3,1.1)", fill: "forwards" } }])
                    lean(sa, 8, 3)
                    lean(ha, -8, -3)
                },
            },
            {
                // 1300-2600 afterglow, CLEANSE's own celebration: the two sway together once, the gold spreads across the
                // mirror, the cleared orbs glint, fireflies lift off the reeds; the grade completes as a supporting move
                id: "afterglow",
                at: 1300,
                run: (c) => {
                    const s = stage()
                    if (s) {
                        s.grade(1, c.reduced ? 500 : 1200)
                        s.particles("fireflies", true)
                    }
                    const sa = stillRef.current
                    const ha = actorsRef.current.FC
                    const sway = (a, deg, dy, at) =>
                        a &&
                        a.celebrate([
                            {
                                at,
                                part: "body",
                                slot: "lean",
                                keyframes: [
                                    { transform: `translateY(${dy}px) rotate(${deg}deg)` },
                                    { transform: `translateY(${dy}px) rotate(${deg + 5}deg)`, offset: 0.3 },
                                    { transform: `translateY(${dy}px) rotate(${deg - 3}deg)`, offset: 0.7 },
                                    { transform: `translateY(${dy}px) rotate(${deg}deg)` },
                                ],
                                opts: { duration: 2000, easing: "ease-in-out", fill: "forwards" },
                            },
                        ])
                    sway(sa, 8, 3, 440)
                    sway(ha, -8, -3, 440)
                    let n = 0
                    for (const o of (plan[st.wave] || { orbs: [] }).orbs) {
                        if (o.isHero) continue
                        const a = actorsRef.current[o.slot]
                        const el = hitsRef.current[o.slot]
                        const d = 200 + 120 * n++
                        rt.timers.later(() => {
                            if (el) el.setAttribute("data-glow", "1")
                            if (a) a.flash()
                        }, d)
                    }
                },
            },
            {
                // 2600 tableau: the mirror pool under the clearest night; the protagonist's name returns
                id: "tableau",
                at: 2600,
                run: (c) => {
                    setCap("FC", hero.name, "name")
                    const s = stage()
                    if (s && !c.reduced) s.camera({ y: -5, scale: 1.015, ms: 1400 })
                },
            },
        ],
        // T0 ... T0+800: a tap plays one ripple ring from the tap point (s9), never a skip
        onFinaleTap: (ev) => {
            const A = arenaRef.current
            const s = stage()
            if (!A || !s) return
            const R = A.getBoundingClientRect()
            s.burst("ripples", { x: ev.clientX - R.left, y: ev.clientY - R.top, n: 1, dist: 2, s0: 0.5, s1: 2.6, ms: 1100, anims: rt.anims })
            snd.cue("tap", ev, { action: "finale-tap" })
        },
        onHandoff: () => {
            const ha = actorsRef.current.FC
            if (ha) ha.setStep(3)
        },
    })

    // ---- one clear: the orb's exhale, the world's step, sound, progress, then the next beat of the game
    const release = (slot, e, deep, heldMs) => {
        const key = keyOf(slot)
        if (goneRef.current[key]) return
        goneRef.current[key] = { deep }
        st.k += 1
        const kk = st.k
        const o = orbOf(slot)
        const el = hitsRef.current[slot]
        const a = actorsRef.current[slot]
        const red = isRed()
        const T = eosPilotEvT(e).t
        if (el && deep) el.setAttribute("data-deep", "1")
        // the murk leaves: inline end state first, then the fade (never a jump)
        const m = el ? el.querySelector(".cMurk") : null
        const prev = st.murk[slot]
        st.murk[slot] = null
        const base = C.murkStep[eosPilotFaceStep(pctOf(kk - 1))]
        const cur = base * (1 - 0.45 * eosClamp((heldMs || 0) / C.fillMs, 0, 1))
        if (prev) {
            try {
                prev.cancel()
            } catch (x) {}
        }
        if (m) {
            m.style.opacity = "0"
            eosPilotAnim(rt.anims, m, [{ opacity: cur }, { opacity: 0 }], { duration: red ? 400 : 1700, easing: "cubic-bezier(.3,.1,.3,1)" })
        }
        const fa = st.fillA[slot]
        st.fillA[slot] = null
        if (fa) {
            try {
                fa.cancel()
            } catch (x) {}
        }
        // the character breathes out: squash -> settle, the phew face, then a varied settle (acting pool)
        if (a) {
            a.emit("exhale", { ms: C.exhaleMs })
            a.react("phew", 450)
            const v = eosPilotPick(C.settle, st.pick, kk)
            const L = lotusRef.current
            rt.timers.later(() => {
                const x = actorsRef.current[slot]
                if (!x) return
                if (v.id === "camera") {
                    x.look("camera")
                    rt.timers.later(() => actorsRef.current[slot] && actorsRef.current[slot].look(L), 900)
                } else x.look(L)
                if (v.id === "nod") x.emit("hop", { px: 5, ms: 420 })
                if (v.id === "sway") x.celebrate([{ at: 0, part: "body", keyframes: [{ transform: "none" }, { transform: "rotate(-4deg)", offset: 0.35 }, { transform: "rotate(3deg)", offset: 0.7 }, { transform: "none" }], opts: { duration: 1100, easing: "ease-in-out" } }])
            }, v.id === "lotus" ? 520 : C.exhaleMs)
        }
        // ink disperses into the water (sideways, so it never covers the word under the orb)
        const s = stage()
        const ball = ballOf(slot)
        if (s && ball && !red) {
            const c = centreOf(ball)
            const ink = { dist: c.r * 1.05, gravity: c.r * 0.25, s0: 0.55, s1: 1.9, ms: C.exhaleMs, easing: "cubic-bezier(.2,.6,.3,1)", anims: rt.anims }
            s.burst("ink", { ...ink, x: c.x + c.r * 0.5, y: c.y + c.r * 0.35, n: deep ? 3 : 2, angle: 14, spread: 36, seed: kk * 7 })
            s.burst("ink", { ...ink, x: c.x - c.r * 0.5, y: c.y + c.r * 0.35, n: deep ? 2 : 1, angle: 166, spread: 36, seed: kk * 7 + 3 })
        }
        // the others breathe out with it
        for (const x of (plan[st.wave] || { orbs: [] }).orbs) {
            if (x.slot === slot || goneRef.current[keyOf(x.slot)]) continue
            const oa = actorsRef.current[x.slot]
            if (oa) oa.emit("exhale", { ms: C.exhaleMs, amp: 0.3, puff: false })
        }
        breathOwn("out", C.exhaleMs)
        if (st.breathT) rt.timers.clear(st.breathT)
        st.breathT = rt.timers.later(() => {
            st.breathT = 0
            if (!st.hold) breathOwn(null)
        }, C.exhaleMs)
        if (st.capT[slot]) rt.timers.clear(st.capT[slot])
        restCap(slot)
        // sound: arcade pop (step reward) + the out tone, THEN progress (spec order); the melody note at +600
        snd.cue("exhale", e, { action: "release" })
        const v = pctOf(kk)
        report(v)
        const n = (plan[st.wave] || { n: 1 }).n
        const m1 = Object.keys(goneRef.current).filter((x) => x.indexOf(`${st.wave}:`) === 0).length
        const f = C.melody[eosClamp(6 - n + m1 - 1, 0, 5)]
        snd.later("clear", 600, T, { f, beat: "clear" })
        if (deep) snd.later("clearDeep", 720, T, { f: f * 1.5, beat: "clear-deep" })
        // the world steps: pool murk, ripples, moon reflection (calm), one more lotus petal, the counter
        const A = arenaRef.current
        if (A) A.style.setProperty("--c-k", (kk / N).toFixed(3))
        lightPetals(kk, false)
        updateCount(kk)
        const L = lotusRef.current
        if (L) L.removeAttribute("data-hold")
        setK(kk)
        if (kk >= N) {
            setPhase("finale")
            fin.start(e)
        } else if (m1 >= n) {
            // wave boundary: the cleared wave settles, then sinks; the next wave rises from the pool
            setPhase("between")
            const w = st.wave
            rt.timers.later(() => {
                for (const x of plan[w].orbs) {
                    const b = hitsRef.current[x.slot]
                    if (!b) continue
                    b.style.opacity = "0"
                    eosPilotAnim(rt.anims, b, isRed() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(14px) scale(.92)" }], { duration: 520, delay: 60 * x.j, easing: "ease-in" })
                }
            }, 1100)
            rt.timers.later(() => {
                hitsRef.current = {}
                actorsRef.current = {}
                setWave(w + 1)
                setPhase("intro")
            }, 1800)
        }
    }

    // ---- S5 hold gesture on the orb block itself
    const g = useEosPilotGesture({
        kind: "hold",
        holdMs: C.holdMs,
        fillMs: C.fillMs,
        fillVar: "--hold-pct",
        anims: rt.anims,
        fillEl: (el) => (isRed() ? null : el.querySelector(".eosPilotFill")),
        onDown: (e, info) => {
            shell.playInput()
            snd.warm()
            const slot = info.key
            if (fin.phase.current !== "play" || st.phase !== "play" || goneRef.current[keyOf(slot)] || st.hold) {
                snd.cue("early", e, { action: "early" })
                return
            }
            st.hold = slot
            st.holdT = eosPilotEvT(e).t
            const el = hitsRef.current[slot]
            const a = actorsRef.current[slot]
            const red = isRed()
            if (st.capT[slot]) rt.timers.clear(st.capT[slot])
            setCap(slot, "breathe in…", "coach")
            // the character: looks up at the moon, eyes widen, and inhales with you (stretches up)
            if (a) {
                a.prepare("phew")
                a.look(moonEl() || "camera")
                a.emit("inhale", { ms: C.fillMs, amp: 1 })
            }
            // inside the glass: the murk thins as clear water rises (the fill is the S5 WAAPI)
            const m = el ? el.querySelector(".cMurk") : null
            const base = C.murkStep[eosPilotFaceStep(pctOf(st.k))]
            if (m) st.murk[slot] = eosPilotAnim(rt.anims, m, [{ opacity: base }, { opacity: base * 0.55 }], { duration: C.fillMs, easing: "linear", fill: "forwards" })
            if (red && el) {
                const fl = el.querySelector(".eosPilotFill")
                if (fl) st.fillA[slot] = eosPilotAnim(rt.anims, fl, [{ transform: "none", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: C.fillMs, easing: "linear", fill: "forwards" })
            }
            // sympathetic breathing (CR-5): uncleared orbs inhale gently, cleared ones lean in to watch, STILL glows
            for (const x of (plan[st.wave] || { orbs: [] }).orbs) {
                if (x.slot === slot) continue
                const oa = actorsRef.current[x.slot]
                if (!oa) continue
                if (goneRef.current[keyOf(x.slot)]) oa.look(el)
                else oa.emit("inhale", { ms: C.fillMs, amp: 0.3 })
            }
            const L = lotusRef.current
            if (L) L.setAttribute("data-hold", "1")
            if (st.breathT) rt.timers.clear(st.breathT)
            st.breathT = 0
            breathOwn("in", C.fillMs)
            snd.cue("hold", e, { action: "hold" })
        },
        onHoldFull: (info) => {
            if (st.hold !== info.key) return
            setCap(info.key, "let go…", "coach")
            snd.later("ready", C.fillMs, st.holdT, { beat: "ready" })
        },
        onHoldDone: (e, info) => {
            const slot = info.key
            if (st.hold !== slot) return
            st.hold = null
            release(slot, e, !!info.full, info.ms)
        },
        onHoldCancel: (e, info) => {
            const slot = info.key
            if (st.hold !== slot) return
            st.hold = null
            const a = actorsRef.current[slot]
            // "almost": the water drains back, a small sigh, the coaching line — never a fail
            const mA = st.murk[slot]
            st.murk[slot] = null
            if (mA) {
                try {
                    mA.updatePlaybackRate(-2.5)
                    mA.play()
                } catch (x) {}
            }
            const fa = st.fillA[slot]
            st.fillA[slot] = null
            if (fa) {
                try {
                    fa.cancel()
                } catch (x) {}
            }
            if (a) {
                a.emit("exhale", { ms: 300, amp: 0.5, puff: false })
                a.look(null)
            }
            for (const x of (plan[st.wave] || { orbs: [] }).orbs) {
                if (x.slot === slot) continue
                const oa = actorsRef.current[x.slot]
                if (oa && !goneRef.current[keyOf(x.slot)]) oa.emit("exhale", { ms: 300, amp: 0.3, puff: false })
            }
            const L = lotusRef.current
            if (L) L.removeAttribute("data-hold")
            breathOwn(null)
            flashCap(slot, "a little longer…", 900)
            snd.cue("almost", e, { action: "almost" })
        },
    })
    const liveTargets = () => {
        const p = plan[st.wave]
        if (!p) return []
        return p.orbs.map((o) => hitsRef.current[o.slot]).filter((b) => b && !b.disabled)
    }
    const near = useEosPilotNearHit(arenaRef, liveTargets, 28)
    // the arena: finale taps, early taps, near-hit routing, the protagonist's "after the others", in-world misses
    const onArenaDown = (e) => {
        snd.warm()
        if (fin.phase.current === "finale") return fin.tap(e)
        if (fin.phase.current !== "play") return
        const t = e.target
        if (t && t.closest && t.closest(".eosPilotHit:not(:disabled)")) return
        shell.playInput()
        if (st.phase !== "play") return snd.cue("early", e, { action: "early" })
        const hit = st.hold ? null : near(e)
        if (hit) return g.route(e, hit.el)
        const A = arenaRef.current
        const R = A.getBoundingClientRect()
        const hb = hitsRef.current.FC
        const ho = orbOf("FC")
        // a tap on the waiting protagonist: it tilts toward the orb it is waiting for, never a fail
        if (hb && ho && ho.isHero && hb.disabled && !goneRef.current[keyOf("FC")]) {
            const r = hb.getBoundingClientRect()
            if (e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8) {
                const ha = actorsRef.current.FC
                const tgt = liveTargets()[0]
                if (ha) {
                    st.miss++
                    const tc = tgt ? centreOf(tgt) : { x: 0 }
                    const hc = centreOf(hb)
                    ha.emit("miss", { dir: [tc.x - hc.x, 0], variant: "tilt" })
                    if (tgt) ha.look(tgt)
                    rt.timers.later(() => actorsRef.current.FC && actorsRef.current.FC.look(null), 1100)
                }
                flashCap("FC", "after the others…", 1100)
                snd.cue("wait", e, { action: "wait" })
                return
            }
        }
        // a miss on the open water: a ripple where you touched, and the nearest orb looks at it
        const s = stage()
        if (s) s.burst("ripples", { x: e.clientX - R.left, y: e.clientY - R.top, n: 1, dist: 2, s0: 0.4, s1: 2.2, ms: 1000, anims: rt.anims })
        const tgt = liveTargets()[0]
        if (tgt) {
            const slot = tgt.getAttribute("data-pk")
            const ta = actorsRef.current[slot]
            if (ta) {
                st.miss++
                ta.emit("miss", { dir: [e.clientX - (tgt.getBoundingClientRect().left + tgt.getBoundingClientRect().width / 2), 0], variant: st.miss % 2 ? "tilt" : "shake" })
            }
        }
        snd.cue("miss", e, { action: "miss" })
    }

    // ---- layout: fractions of the S5 play box (front row in the thumb zone)
    const lay = React.useMemo(() => {
        if (!box) return null
        const ph = box.phone
        const T = box.play.top
        const H = box.play.bottom - box.play.top
        const u = ph ? eosClamp(box.w / 390, 0.85, 1) : 1
        const SZ0 = ph ? C.size.phone : C.size.desk
        const SZ = { back: Math.round(SZ0.back * u), front: Math.round(SZ0.front * u), hero: Math.round(SZ0.hero * u), still: Math.round(SZ0.still * u) }
        const SL = ph ? C.slots.phone : C.slots.desk
        const Lf = ph ? C.lotus.phone : C.lotus.desk
        const pos = {}
        for (const s in SL) pos[s] = { x: box.w * SL[s][0], y: T + H * SL[s][1] }
        const hz = T + H * 0.24
        const moonW = box.w * 0.15
        return { ph, u, T, H, SZ, pos, hz, moonY: Math.max(4, T + H * 0.09 - moonW / 2), lotus: { x: box.w * Lf[0], y: T + H * Lf[1], s: Math.round(Lf[2] * u) }, labW: ph ? 108 : 132 }
    }, [box])

    // ---- intro / wave rise: the orbs rise out of the water (staggered 80), the marker goes live at 700
    React.useLayoutEffect(() => {
        if (!lay || st.risen === wave) return
        st.risen = wave
        const p = plan[wave]
        if (!p) return
        const red = isRed()
        for (const o of p.orbs) {
            const b = hitsRef.current[o.slot]
            if (!b) continue
            setCap(o.slot, o.isHero ? hero.name : capFor(o.gi), o.isHero ? "name" : null)
            eosPilotAnim(rt.anims, b, red ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 360, delay: 200 + 80 * o.j, easing: "cubic-bezier(.25,.7,.3,1)", fill: "backwards" })
        }
        updateCount(st.k)
        rt.timers.later(() => {
            if (st.phase === "intro") setPhase("play")
        }, C.readyMs)
        const ho = p.orbs.find((o) => o.isHero)
        if (ho)
            rt.timers.later(() => {
                if (!goneRef.current[keyOf("FC", wave)] && st.hold !== "FC") setCap("FC", capFor(ho.gi))
            }, C.nameMs)
    }, [lay, wave])

    const b = box
    const live0 = phase === "play" && W0 ? (W0.orbs.find((o) => !goneRef.current[keyOf(o.slot, wave)]) || {}).slot : null
    const othersLeft = W0 ? W0.orbs.filter((o) => !o.isHero && !goneRef.current[keyOf(o.slot, wave)]).length : 0
    const arenaVars = { "--eos-pilot-word-px": lay && !lay.ph ? "16px" : "15px" }
    if (lay) {
        arenaVars["--c-hz"] = `${lay.hz.toFixed(1)}px`
        arenaVars["--c-moon-y"] = `${lay.moonY.toFixed(1)}px`
        arenaVars["--lx"] = `${lay.lotus.x.toFixed(1)}px`
        arenaVars["--lyw"] = `${(lay.lotus.y - lay.hz).toFixed(1)}px`
        arenaVars["--sv"] = `${lay.SZ.still}px`
        arenaVars["--sw"] = `${Math.round(Math.min(b.w, 900) * 0.5)}px`
        arenaVars["--c-count-top"] = `${Math.max(6, lay.T + 2).toFixed(0)}px`
    }
    const renderOrb = (o) => {
        const P = lay.pos[o.slot]
        const ball = o.isHero ? lay.SZ.hero : o.slot[0] === "B" ? lay.SZ.back : lay.SZ.front
        const bw = Math.max(ball + 16, lay.labW)
        const bh = ball + 6 + (lay.ph ? 54 : 58)
        const key = keyOf(o.slot, wave)
        const gone = !!goneRef.current[key]
        const isLive = o.slot === live0
        const heroWait = o.isHero && !gone && othersLeft > 0
        const dis = phase !== "play" || gone || heroWait
        const turn = Math.sign(lay.lotus.x - P.x) * 5
        return (
            <button
                key={key}
                ref={(n) => {
                    if (n) hitsRef.current[o.slot] = n
                }}
                className={`eosPilotHit cOrb${gone ? " isGone" : ""}${o.isHero ? " isHero" : ""}`}
                data-row={o.slot[0]}
                disabled={dis}
                aria-label={`${o.word}: ${capFor(o.gi)}`}
                style={{ left: `${Math.round(P.x - bw / 2)}px`, top: `${Math.round(P.y - ball / 2)}px`, width: `${bw}px`, height: `${bh}px`, "--ball": `${ball}px`, "--turn": `${turn}deg`, "--lab": `${lay.labW}px` }}
                {...g.bind(o.slot)}
                {...eosPilotMarker(C.marker, isLive)}
            >
                <i className="cPad" aria-hidden="true" />
                <EosPilotActor
                    ref={(n) => {
                        if (n) actorsRef.current[o.slot] = n
                    }}
                    role="breath"
                    char={o.char}
                    emotion={o.isHero ? hero.emotion : undefined}
                    image={userImgs.length ? userImgs[o.gi % userImgs.length] : null}
                    size={ball}
                    u={1}
                    progress={gone ? 80 : pct}
                    reacts={["phew"]}
                    word={o.word}
                    sub=" "
                    seed={o.gi + 11}
                    eager={o.j === 0}
                    ballChildren={EOS_PILOT_CLEANSE_BALL}
                    style={{ left: "50%", top: `${ball / 2}px` }}
                />
            </button>
        )
    }
    const back = W0 && lay ? W0.orbs.filter((o) => o.slot[0] === "B") : []
    const front = W0 && lay ? W0.orbs.filter((o) => o.slot[0] === "F") : []
    const petal = (pp, i) => <i key={`p${i}`} className="cPetal" data-b={pp.front ? undefined : "1"} style={{ "--a0": `${pp.a0}deg`, "--a": `${pp.a}deg`, "--o": pp.o }} />
    return (
        <div
            ref={arenaRef}
            className="arena eosPilotArena eosPilotCleanse"
            data-eos-pilot-kit={C.kit}
            data-eos-pilot-reduced={reduced ? "1" : undefined}
            data-c-desk={lay && !lay.ph ? "1" : undefined}
            data-c-step={eosPilotFaceStep(pct)}
            onPointerDown={onArenaDown}
            style={arenaVars}
        >
            <EosPilotStage ref={stageRef} kit={C.kit} calm={Math.min(1, k / N)} planeClassName={phase === "play" ? "" : "isLocked"}>
                <i className="cLayer cMirror" aria-hidden="true" />
                <i className="cLayer cRip" aria-hidden="true" />
                <i className="cLayer cGold" aria-hidden="true" />
                <i className="cLayer cPath" ref={pathRef} aria-hidden="true" />
                <i className="cLayer cSweep" ref={sweepRef} aria-hidden="true" data-eos-avoid="1" />
                {back.map(renderOrb)}
                {lay ? (
                    <div ref={lotusRef} className="cLotus" data-eos-avoid="1" data-eos-char="still" style={{ left: `${lay.lotus.x.toFixed(1)}px`, top: `${lay.lotus.y.toFixed(1)}px`, "--L": `${lay.lotus.s}px` }}>
                        <div ref={stillWrapRef} className="cStill">
                            <EosPilotActor ref={stillRef} role="breath" char="still" emotion="auto" size={lay.SZ.still} u={1} progress={80} reacts={[]} seed={7} style={{ left: 0, top: 0 }} />
                        </div>
                        {C.petals.map(petal)}
                    </div>
                ) : null}
                {front.map(renderOrb)}
            </EosPilotStage>
            <i ref={countRef} className="cCount" aria-hidden="true" data-n={`${Math.min(k, N)} / ${N} CLEAR`} />
        </div>
    )
})
eosPilotRegister(109, EosPilotCleanseEngine, { name: "Moon Pool", kit: "pool" })

// ---------------------------------------------------------------- CSS (every rule under the CLEANSE arena)
const EOS_PILOT_CL = `${EOS_A} .eosPilotArena.eosPilotCleanse`
const eosPilotCleanseCalmCss = (P) => `
${P} .cMurk::before,${P} .cRip::before,${P} .cRip::after,${P} .cOrb[data-hold] .cPad::after,${P} [data-pool="fireflies"] > i{animation:none!important}
${P} .cPetal,${P} .cOrb .eosPilotActor,${P} .cPad::before{transition-property:opacity!important}`
const EOS_PILOT_CLEANSE_CSS = `
${EOS_PILOT_CL}{--c-k:0;background:#16173A}
${EOS_PILOT_CL} .eosPilotStage{--eos-pilot-horizon:var(--c-hz,24%)}
${EOS_PILOT_CL} .eosPilotStage .moon{top:var(--c-moon-y,4%)}
${EOS_PILOT_CL} .eosPilotStage .moon{left:54%}
${EOS_PILOT_CL} .eosPilotStage .moonRefl{left:56%}
${EOS_PILOT_CL}[data-c-desk="1"] .eosPilotStage .moon{left:76.5%}
${EOS_PILOT_CL}[data-c-desk="1"] .eosPilotStage .moonRefl{left:78.5%}
${EOS_PILOT_CL}[data-c-desk="1"] .eosPilotStage .reeds{width:12%}

/* plane layers: the reflection plate (finale), the ripple texture + water murk, the gold key, the moon path, the sweep ring */
${EOS_PILOT_CL} .cLayer{position:absolute;display:block;font-style:normal;pointer-events:none}
${EOS_PILOT_CL} .cMirror{left:0;right:0;top:var(--c-hz,24%);bottom:0;opacity:0;transition:opacity 1.1s ease;
  background:radial-gradient(9% 6% at 61.5% 5%,rgba(244,248,255,.85),rgba(207,227,255,.32) 52%,rgba(207,227,255,0) 74%),
  radial-gradient(14% 30% at 61.5% 22%,rgba(207,227,255,.14),rgba(207,227,255,0) 70%),
  linear-gradient(180deg,rgba(24,38,94,.96) 0%,rgba(16,27,74,.9) 34%,rgba(8,14,44,.94) 100%);
  -webkit-mask:linear-gradient(90deg,transparent,#000 13%,#000 87%,transparent);mask:linear-gradient(90deg,transparent,#000 13%,#000 87%,transparent)}
${EOS_PILOT_CL}[data-c-desk="1"] .cMirror{background:radial-gradient(7% 6% at 84% 5%,rgba(244,248,255,.85),rgba(207,227,255,.32) 52%,rgba(207,227,255,0) 74%),
  linear-gradient(180deg,rgba(24,38,94,.96) 0%,rgba(16,27,74,.9) 34%,rgba(8,14,44,.94) 100%)}
${EOS_PILOT_CL}[data-c-fin] .cMirror{opacity:.9}
${EOS_PILOT_CL} .cRip{left:0;right:0;top:var(--c-hz,24%);bottom:0;opacity:calc(1 - var(--c-k) * .62);transition:opacity 1s ease;
  background:radial-gradient(80% 46% at 50% 58%,rgba(92,66,150,.46),rgba(92,66,150,0) 72%),radial-gradient(60% 30% at 20% 90%,rgba(80,58,130,.35),rgba(80,58,130,0) 70%)}
${EOS_PILOT_CL} .cRip::before,${EOS_PILOT_CL} .cRip::after{content:"";position:absolute;border-radius:50%;
  box-shadow:inset 0 0 0 1px rgba(190,205,255,.13),0 0 0 9px rgba(0,0,0,0),0 0 0 10px rgba(190,205,255,.07);animation:eosPilotCleanseShimmer 7s ease-in-out infinite alternate}
${EOS_PILOT_CL} .cRip::before{left:var(--lx,50%);top:calc(var(--lyw,40%) + 4%);width:min(64%,560px);height:11%;translate:-50% -50%}
${EOS_PILOT_CL} .cRip::after{left:var(--lx,50%);top:calc(var(--lyw,40%) + 5%);width:min(94%,820px);height:17%;translate:-50% -50%;animation-duration:9s;animation-delay:-3s}
${EOS_PILOT_CL}[data-c-fin] .cRip{opacity:0;transition-duration:.7s}
${EOS_PILOT_CL} .cGold{left:0;right:0;top:var(--c-hz,24%);bottom:0;opacity:0;transition:opacity .45s ease-out;
  background:radial-gradient(34% 12% at var(--lx,50%) var(--lyw,40%),rgba(255,211,122,.62),rgba(255,211,122,0) 72%),
  radial-gradient(9% 34% at var(--lx,50%) calc(var(--lyw,40%) + 22%),rgba(255,211,122,.32),rgba(255,211,122,0) 72%),
  radial-gradient(60% 30% at var(--lx,50%) var(--lyw,40%),rgba(255,190,110,.18),rgba(255,190,110,0) 75%)}
${EOS_PILOT_CL}[data-c-gold="1"] .cGold{opacity:1}
${EOS_PILOT_CL} .cPath{left:0;top:0;width:44px;height:10px;margin-left:-22px;transform-origin:50% 0;opacity:0;transition:opacity .5s ease;
  background:repeating-linear-gradient(180deg,rgba(236,243,255,.7) 0 2px,rgba(236,243,255,0) 2px 8px);
  clip-path:polygon(42% 0,58% 0,100% 100%,0 100%);-webkit-mask:linear-gradient(180deg,rgba(0,0,0,.5),#000 40%,#000 80%,transparent);mask:linear-gradient(180deg,rgba(0,0,0,.5),#000 40%,#000 80%,transparent)}
${EOS_PILOT_CL}[data-c-path="1"] .cPath{opacity:.85}
${EOS_PILOT_CL} .cSweep{left:-999px;top:0;width:var(--sw,200px);height:calc(var(--sw,200px) * .3);translate:-50% -50%;border-radius:50%;opacity:0;
  box-shadow:inset 0 0 0 2px rgba(222,234,255,.8),0 0 18px rgba(200,220,255,.35)}
${EOS_PILOT_CL} .cSweep[data-gold="1"]{box-shadow:inset 0 0 0 2.5px rgba(255,224,160,.9),0 0 28px rgba(255,211,122,.6)}

/* key light moves to the lotus at the peak: glosses and rims relight warm and low */
${EOS_PILOT_CL}[data-c-gold="1"] .eosPilotStage[data-kit="pool"]{--eos-pilot-gloss-x:50%;--eos-pilot-gloss-y:84%;--eos-pilot-rim:rgba(255,214,140,.95)}

/* the orb block: one hit = ball + word + caption (no pill floating apart from its sphere) */
${EOS_PILOT_CL} .cOrb{position:absolute;overflow:visible;--hold-pct:0%}
${EOS_PILOT_CL} .cOrb:disabled{pointer-events:none}
${EOS_PILOT_CL} .cOrb .eosPilotActor{transition:transform .7s cubic-bezier(.3,.7,.3,1) .1s}
${EOS_PILOT_CL} .cOrb.isGone .eosPilotActor{transform:translateY(calc(var(--ball) * .05)) rotate(var(--turn,0deg))}
${EOS_PILOT_CL} .cOrb .eosPilotActorLabel{max-width:var(--lab,108px);gap:1px}
${EOS_PILOT_CL} .cOrb .eosPilotActorSub{font-size:13px;font-weight:700;letter-spacing:.02em;color:#e3eaff;opacity:.5;white-space:nowrap;transition:opacity .35s ease;line-height:1.2}
${EOS_PILOT_CL} .cOrb .eosPilotActorSub::after{content:attr(data-cap)}
${EOS_PILOT_CL} .cOrb:is([data-eos-target="1"],[data-press="1"]) .eosPilotActorSub,${EOS_PILOT_CL} .cOrb .eosPilotActorSub[data-kind]{opacity:1}
${EOS_PILOT_CL} .cOrb .eosPilotActorSub[data-kind="name"]{font-weight:900;letter-spacing:.12em;color:#fff}
${EOS_PILOT_CL} .cOrb .eosPilotActorSub[data-kind="coach"]{color:#fff;font-weight:800}
${EOS_PILOT_CL} .cOrb.isGone .eosPilotActorSub:not([data-kind]){opacity:.3}
${EOS_PILOT_CL} .cOrb[data-c-seat] .eosPilotActorSub:not([data-kind="name"]){opacity:0}
${EOS_PILOT_CL} .cOrb[data-row="B"]:not(.isGone) .eosPilotActorIdle{opacity:.9}
/* glass: a light rim, a cool rim light from the left (S3), the moon's specular from the upper right (gloss) */
${EOS_PILOT_CL} .cOrb .eosPilotActorBall{box-shadow:0 0 calc(var(--a-size) * .22) hsla(var(--a-hue),70%,70%,.22),0 calc(var(--a-size) * .06) calc(var(--a-size) * .16) rgba(4,4,20,.35)}
${EOS_PILOT_CL} .cOrb.isGone .eosPilotActorBall{box-shadow:0 0 calc(var(--a-size) * .26) hsla(var(--a-hue),90%,76%,.42),0 0 0 1.5px rgba(235,245,255,.55)}
${EOS_PILOT_CL} .cOrb[data-glow="1"] .eosPilotActorBall{box-shadow:0 0 calc(var(--a-size) * .34) rgba(255,220,150,.5),0 0 0 1.5px rgba(255,236,200,.7)}
${EOS_PILOT_CL} .cOrb[data-press="1"] .eosPilotActorBall{box-shadow:0 0 0 2px rgba(226,238,255,.9),0 0 calc(var(--a-size) * .3) rgba(175,200,255,.6)}
${EOS_PILOT_CL} .cOrb[data-hold="ready"] .eosPilotActorBall{box-shadow:0 0 0 2px rgba(255,238,206,.9),0 0 calc(var(--a-size) * .32) rgba(255,222,165,.5)}
${EOS_PILOT_CL} .cOrb[data-hold="full"] .eosPilotActorBall{box-shadow:0 0 0 3px rgba(255,211,122,.95),0 0 calc(var(--a-size) * .42) rgba(255,211,122,.62)}
/* murk: dark-violet ink that only ever sits INSIDE the circular ball (never a box behind it) */
${EOS_PILOT_CL} .cMurk{position:absolute;inset:0;border-radius:50%;z-index:3;pointer-events:none;font-style:normal;
  background:radial-gradient(circle at 50% 90%,rgba(42,30,80,.8),rgba(58,44,94,.52) 38%,rgba(70,54,118,.24) 64%,rgba(110,96,170,.1) 86%)}
${EOS_PILOT_CL} .cMurk::before{content:"";position:absolute;inset:-12%;border-radius:50%;
  background:conic-gradient(from 20deg,rgba(34,24,66,.5),rgba(34,24,66,0) 20%,rgba(46,34,86,.42) 42%,rgba(34,24,66,0) 64%,rgba(40,28,74,.46) 84%,rgba(34,24,66,.5));
  -webkit-mask:radial-gradient(closest-side,#000 55%,transparent);mask:radial-gradient(closest-side,#000 55%,transparent);animation:eosPilotCleanseSwirl 9s linear infinite}
${EOS_PILOT_CL}[data-c-step="1"] .cOrb:not(.isGone) .cMurk{opacity:.6}
${EOS_PILOT_CL}[data-c-step="2"] .cOrb:not(.isGone) .cMurk{opacity:.42}
${EOS_PILOT_CL} .cOrb.isGone .cMurk::before{animation:none}
/* the clear water that rises inside while you breathe in */
${EOS_PILOT_CL} .eosPilotFill{background:linear-gradient(180deg,rgba(233,251,255,.46),rgba(159,227,255,.34) 26%,rgba(159,227,255,.28));
  box-shadow:inset 0 2px 0 rgba(255,255,255,.9),inset 0 7px 9px -5px rgba(255,255,255,.55)}
/* lily pad (::before, scales in under a cleared orb; a deep clear adds a small flower) + hold ripples (::after) */
${EOS_PILOT_CL} .cPad{position:absolute;left:50%;top:calc(var(--ball) * .86);width:calc(var(--ball) * 1.42);height:calc(var(--ball) * .42);translate:-50% -50%;pointer-events:none;font-style:normal}
${EOS_PILOT_CL} .cPad::before{content:"";position:absolute;inset:0;border-radius:50%;scale:0;transition:scale .42s cubic-bezier(.3,.7,.3,1.35) .12s;
  background:radial-gradient(closest-side at 46% 44%,#6fbf8a,#4f9a6c 55%,#2F6B4F 92%,rgba(47,107,79,0) 100%);
  -webkit-mask:conic-gradient(from 72deg at 50% 50%,transparent 0 26deg,#000 26deg);mask:conic-gradient(from 72deg at 50% 50%,transparent 0 26deg,#000 26deg)}
${EOS_PILOT_CL} .cOrb[data-deep="1"] .cPad::before{background:
  radial-gradient(4.5% 13% at 86% 42%,#fff2f8 30%,#f6a9cf 70%,rgba(246,169,207,0) 74%),radial-gradient(6% 10% at 89% 46%,#ffd9ea 40%,#ee8fbf 72%,rgba(238,143,191,0) 76%),
  radial-gradient(6% 10% at 83% 46%,#ffd9ea 40%,#ee8fbf 72%,rgba(238,143,191,0) 76%),radial-gradient(closest-side at 46% 44%,#6fbf8a,#4f9a6c 55%,#2F6B4F 92%,rgba(47,107,79,0) 100%)}
${EOS_PILOT_CL} .cOrb.isGone .cPad::before{scale:1}
${EOS_PILOT_CL} .cPad::after{content:"";position:absolute;inset:0;border-radius:50%;opacity:0;
  box-shadow:inset 0 0 0 1.5px rgba(205,222,255,.75),0 0 0 8px rgba(205,222,255,0),0 0 0 9.5px rgba(205,222,255,.3)}
${EOS_PILOT_CL} .cOrb[data-hold] .cPad::after{animation:eosPilotCleanseRing 1.2s ease-out infinite}

/* the lotus: 8 petals, a gold heart (::before), a leaf on the water (::after); STILL sleeps inside the bud */
${EOS_PILOT_CL} .cLotus{position:absolute;width:var(--L);height:var(--L);translate:-50% -50%;pointer-events:none;isolation:isolate}
${EOS_PILOT_CL} .cLotus::after{content:"";position:absolute;left:50%;top:72%;width:118%;height:26%;translate:-50% -50%;border-radius:50%;z-index:-1;
  background:radial-gradient(closest-side at 50% 45%,#3d7d5c,#2F6B4F 60%,#1d4636 88%,rgba(29,70,54,0) 100%);box-shadow:0 6px 14px rgba(0,0,10,.35)}
${EOS_PILOT_CL} .cLotus::before{content:"";position:absolute;left:50%;top:66%;width:64%;height:40%;translate:-50% -50%;border-radius:50%;z-index:2;opacity:.28;transition:opacity .6s ease;
  background:radial-gradient(closest-side,rgba(255,240,190,.95),rgba(255,211,122,.55) 45%,rgba(255,211,122,0))}
${EOS_PILOT_CL} .cLotus[data-hold="1"]::before{opacity:.5}
${EOS_PILOT_CL} .cLotus[data-open="1"]::before{opacity:1;transition-duration:.8s}
${EOS_PILOT_CL}[data-c-gold="1"] .cLotus::before{width:96%;height:62%;transition:opacity .4s ease,width .4s ease,height .4s ease}
${EOS_PILOT_CL} .cPetal{position:absolute;left:50%;bottom:27%;width:36%;height:62%;margin-left:-18%;transform-origin:50% 100%;font-style:normal;opacity:.94;
  transform:rotate(var(--a0)) scale(.8,.92);transition:transform .56s cubic-bezier(.3,.7,.25,1.06) calc(var(--o) * 34ms),opacity .4s ease}
${EOS_PILOT_CL} .cPetal[data-on="1"]{transform:rotate(calc(var(--a0) * 1.9)) scale(.84,.95)}
${EOS_PILOT_CL} .cLotus[data-open="1"] .cPetal{transform:rotate(var(--a)) scale(1);opacity:1}
${EOS_PILOT_CL} .cPetal::before,${EOS_PILOT_CL} .cPetal::after{content:"";position:absolute;inset:0;
  clip-path:polygon(50% 0,62% 6%,76% 18%,88% 35%,96% 54%,94% 73%,83% 89%,64% 99%,36% 99%,17% 89%,6% 73%,4% 54%,12% 35%,24% 18%,38% 6%)}
${EOS_PILOT_CL} .cPetal::before{background:radial-gradient(60% 40% at 50% 92%,rgba(120,50,130,.45),rgba(120,50,130,0) 100%),
  linear-gradient(180deg,#fff4fa 0%,#f9cfe4 26%,#ee9cc8 58%,#c06aae 86%,#94509f 100%)}
${EOS_PILOT_CL} .cPetal[data-b="1"]::before{background:radial-gradient(60% 40% at 50% 92%,rgba(90,40,110,.5),rgba(90,40,110,0) 100%),
  linear-gradient(180deg,#f6dcec 0%,#e9a9cf 30%,#cf78b4 62%,#9a4f9c 90%,#74407e 100%)}
${EOS_PILOT_CL} .cPetal::after{opacity:0;transition:opacity .6s ease;background:linear-gradient(180deg,#fffbe6 0%,#ffe6ad 40%,rgba(255,196,110,.4) 100%)}
${EOS_PILOT_CL} .cPetal[data-on="1"]::after{opacity:.62}
${EOS_PILOT_CL} .cLotus[data-open="1"] .cPetal::after{opacity:.5}
${EOS_PILOT_CL}[data-c-gold="1"] .cLotus .cPetal::after{opacity:.78}
${EOS_PILOT_CL} .cStill{position:absolute;left:50%;top:calc(64% - var(--sv,58px) * .4);width:0;height:0;opacity:.55;transition:opacity .45s ease;z-index:0}
${EOS_PILOT_CL} .cStill[data-awake="1"]{opacity:1;z-index:3}

/* far lily pads (depth) on the kit's pad prop, with a moonlit upper rim */
${EOS_PILOT_CL} [data-kit="pool"] .pads{top:var(--c-hz,24%);bottom:0;height:auto;background:
  radial-gradient(6% 1.5% at 24% 9%,#3b6f5c 60%,transparent 74%),radial-gradient(6% 1.5% at 24% 9.6%,#21463b 70%,transparent 76%),
  radial-gradient(4.5% 1.1% at 33% 7%,#22463b 70%,transparent 76%),
  radial-gradient(7% 1.8% at 80% 15%,#3b6f5c 60%,transparent 74%),radial-gradient(7% 1.8% at 80% 15.7%,#24503f 70%,transparent 76%),
  radial-gradient(9% 2.3% at 9% 36%,#3f7a62 60%,transparent 74%),radial-gradient(9% 2.3% at 9% 37%,#285a47 70%,transparent 76%),
  radial-gradient(8% 2% at 92% 42%,#3f7a62 60%,transparent 74%),radial-gradient(8% 2% at 92% 43%,#285a47 70%,transparent 76%),
  radial-gradient(12% 3% at 6% 88%,#2d6450 70%,transparent 76%),radial-gradient(12% 3% at 95% 94%,#2d6450 70%,transparent 76%)}
${EOS_PILOT_CL} .cPad{background:radial-gradient(closest-side,rgba(170,190,255,.2),rgba(170,190,255,.05) 66%,rgba(205,220,255,.26) 84%,rgba(205,220,255,0) 100%)}
${EOS_PILOT_CL} .cOrb.isGone .cPad{background:none}

/* fireflies: only in the afterglow, lifting off the reeds */
${EOS_PILOT_CL} [data-kit="pool"] [data-pool="fireflies"] > i{animation:none;opacity:0;left:calc(5% + var(--i) * 3.5%);top:calc(64% + var(--i) * 3%)}
${EOS_PILOT_CL} [data-kit="pool"] [data-pool="fireflies"] > i:nth-child(n+4){left:calc(70% + var(--i) * 3.5%);top:calc(50% + var(--i) * 3%)}
${EOS_PILOT_CL} .eosPilotStage[data-fx-fireflies="1"] [data-pool="fireflies"] > i{animation:eosPilotCleanseFirefly calc(2.6s + var(--i) * .3s) cubic-bezier(.3,.6,.4,1) calc(var(--i) * 110ms) both}
${EOS_PILOT_CL} [data-kit="pool"] [data-pool="ink"] > i{width:56px;height:36px;margin:-18px 0 0 -28px;background:radial-gradient(closest-side,rgba(48,34,88,.92),rgba(78,58,134,.55) 55%,rgba(120,100,190,0))}

/* the k / N CLEAR pill, top-left in the HUD band */
${EOS_PILOT_CL} .cCount{position:absolute;left:12px;top:var(--c-count-top,8px);z-index:6;pointer-events:none;font-style:normal;font-size:13px;font-weight:800;letter-spacing:.08em;
  color:#eef3ff;padding:4px 10px;border-radius:999px;background:rgba(14,18,52,.5);box-shadow:inset 0 0 0 1px rgba(200,215,255,.3);line-height:1.2}
${EOS_PILOT_CL} .cCount::after{content:attr(data-n)}

@keyframes eosPilotCleanseSwirl{to{transform:rotate(360deg)}}
@keyframes eosPilotCleanseShimmer{from{transform:scale(.86)}to{transform:scale(1.14)}}
@keyframes eosPilotCleanseRing{0%{opacity:.95;transform:scale(.5)}100%{opacity:0;transform:scale(1.7)}}
@keyframes eosPilotCleanseFirefly{0%{opacity:0;transform:translate(0,0)}30%{opacity:1}100%{opacity:.75;transform:translate(calc((var(--i) - 2.5) * 7px),-96px)}}

/* reduced motion (OS, framer prop, in-app calm toggle): idle loops stop, transforms snap, opacity carries the story */
@media (prefers-reduced-motion: reduce){${eosPilotCleanseCalmCss(EOS_PILOT_CL)}}
${eosPilotCleanseCalmCss(`${EOS_A}[data-eos-calm="1"] .eosPilotArena.eosPilotCleanse`)}
${eosPilotCleanseCalmCss(`${EOS_PILOT_CL}[data-eos-pilot-reduced="1"]`)}
`
eosCss("pilot-cleanse", EOS_PILOT_CLEANSE_CSS)
