// ===================================================================================
// Pilot A · 79_pilot_demo.jsx — dev demo of the shared systems (S1-S6). ONLY active with ?pilotdemo=1
// (and the pilot switch on): ids 1 / 109 / 2 then play this demo with the sky / pool / workshop kit and the
// tap / hold / 4-slam gesture. It is NOT a pilot game; the real engines (72-74) register per id and win
// whenever the demo flag is off. Everything follows the engine contract (§4), so the demo also
// exercises the wrapper hooks: markers + arrows, toast dock, guide dock, hand-off, afterglow.
// ===================================================================================

const EOS_PILOT_DEMO_KITS = {
    1: { kit: "sky", role: "holder", gesture: "tap", verb: "POPPED", pool: "droplets", marker: { g: "tap", label: "POP IT!" },
        acts: [{ face: "wow", motion: "lurch" }, { face: "giggle", motion: "hop" }, { face: "brace", motion: "lurch" }, { face: "phew", motion: "press" }] },
    109: { kit: "pool", role: "breath", gesture: "hold", verb: "CLEANSED", pool: "ink", marker: { g: "hold", ms: 3000, mvar: "--hold-pct", label: "BREATHE IN… LET GO" },
        acts: [{ face: "phew", motion: "exhale" }] },
    2: { kit: "workshop", role: "inside", gesture: "taps", verb: "CRUSHED", pool: "heat", marker: { g: "taps", n: 4, label: "CRUSH ×4" },
        acts: [{ face: "brace", motion: "press" }, { face: "pfff", motion: "hop" }, { face: "curious", motion: "press" }, { face: "grin", motion: "hop" }] },
}
const EOS_PILOT_DEMO_REACTS = { sky: ["brace", "wow", "phew", "giggle", "curious"], pool: ["phew", "curious"], workshop: ["brace", "pfff", "grin", "phew", "curious"] }
// Cue sets (S4). Id 2 is non-explicit (G4): its only arcade layer is the one "pop" per word.
const EOS_PILOT_DEMO_CUES = {
    tap: [{ arcade: "pop", impact: true }, { tone: (o) => [eosNote((o.k || 0) + 3, 392), 140, { type: "sine", gain: 0.035, at: 0.02 }], impact: true }],
    holdStart: [{ arcade: "soft" }, { tone: [262, 1200, { type: "sine", gain: 0.022, glide: 392 }] }],
    holdDone: [{ arcade: "pop" }, { tone: [523, 900, { type: "sine", gain: 0.03, glide: 262 }] }],
    holdCancel: [{ tone: [330, 160, { type: "triangle", gain: 0.02, glide: 262 }] }],
    slam: [{ tone: (o) => [96 + 14 * (o.n || 0), 150, { type: "triangle", gain: 0.07, at: 0.01 }], impact: true, haptic: 12 }],
    word: [{ arcade: "pop" }],
    miss: [{ tone: [220, 90, { type: "triangle", gain: 0.03, glide: 180 }], haptic: 8 }],
    early: [{ tone: [880, 40, { type: "sine", gain: 0.012 }] }],
    climax: [{ tone: [392, 300, { type: "triangle", gain: 0.04, glide: 523 }] }],
    peak: [{ tone: [784, 700, { type: "sine", gain: 0.03 }] }, { tone: [1175, 800, { type: "sine", gain: 0.018, at: 0.09 }] }],
}

function EosPilotDemoEngine(p) {
    const live = React.useRef(p)
    live.current = p
    const wordsKey = (p.entries || []).join("\u0001")
    const id = Number(p.game && p.game.id) || 1
    return <EosPilotDemoInner live={live} gameId={id} wordsKey={wordsKey} reduced={!!p.reduced} userImgKey={eosPilotImgKey(p)} />
}

const EosPilotDemoInner = React.memo(function EosPilotDemoInner({ live, gameId, wordsKey, reduced, userImgKey }) {
    const cfg = EOS_PILOT_DEMO_KITS[gameId] || EOS_PILOT_DEMO_KITS[1]
    const arenaRef = React.useRef(null)
    const stageRef = React.useRef(null)
    const heroRef = React.useRef(null)
    const hitsRef = React.useRef([])
    const actorsRef = React.useRef([])
    const goneRef = React.useRef({})
    const slamsRef = React.useRef({})
    const pickRef = React.useRef({ current: -1 })
    const missRef = React.useRef(0)
    const rt = useEosPilotRuntime()
    const shell = useEosPilotShell(arenaRef, gameId)
    const box = useEosPilotBox(arenaRef)
    const [done, setDone] = React.useState(0)
    const [phase, setPhase] = React.useState("play")
    const words = React.useMemo(() => {
        const w = eosPilotWords(wordsKey ? wordsKey.split("\u0001") : [], 6).words
        const list = w.length ? w : ["this feeling"]
        return list.length > 4 ? list.slice(0, 3).concat([list.slice(3).join(" ")]) : list
    }, [wordsKey])
    const N = words.length
    const userImgs = React.useMemo(() => (userImgKey ? userImgKey.split("\u0001") : []), []) // snapshot at mount
    const emotion = React.useMemo(() => (typeof eosCurrentEmotion === "function" && eosCurrentEmotion()) || "auto", [])
    const heroChar = EOS_EMO[emotion] ? EOS_EMO[emotion].char : "still"
    const chars = React.useMemo(() => {
        const used = { [heroChar]: 1 }
        return words.map((w, i) => {
            const c = eosPilotCharFor(w, i + 1, used)
            used[c] = 1
            return c
        })
    }, [words, heroChar])
    const snd = useEosPilotSound({ gameId, live, cues: EOS_PILOT_DEMO_CUES, timers: rt.timers })
    const pctOf = (k) => (k >= N ? EOS_PILOT_FINAL_PCT : Math.round((k / N) * 100))
    const report = (v) => {
        try {
            live.current.onProgress(v, `${v}% ${cfg.verb}`)
        } catch (e) {}
    }
    React.useEffect(() => {
        report(0)
        return () => {
            try {
                eosBreathOwn(null)
            } catch (e) {}
        }
    }, [])
    const centreOf = (el) => {
        const a = arenaRef.current
        if (!el || !a) return { x: 0, y: 0 }
        const r = el.getBoundingClientRect()
        const A = a.getBoundingClientRect()
        return { x: r.left - A.left + r.width / 2, y: r.top - A.top + r.height / 2 }
    }
    const hero = () => heroRef.current
    const stage = () => stageRef.current

    // ---- S2 finale: each beat does DOM/WAAPI work only
    const fin = useEosPilotFinale({
        arenaRef,
        live,
        gameId,
        bonus: N,
        label: `100% ${cfg.verb}`,
        kit: cfg.kit,
        heroFace: () => eosPilotFaceSrc(heroChar, 3, emotion, gameId),
        anims: rt.anims,
        timers: rt.timers,
        handoffMs: EOS_PILOT_HANDOFF_MS,
        beats: [
            {
                id: "climax",
                at: 0,
                run: (c) => {
                    const h = hero()
                    const s = stage()
                    if (!h || !s) return
                    const at = h.anchor("centre")
                    h.react(cfg.kit === "pool" ? "phew" : "wow", 420)
                    if (!c.skipped) h.emit(cfg.kit === "pool" ? "exhale" : "hop", { px: 20, ms: cfg.kit === "pool" ? 1200 : 360 })
                    s.burst(cfg.pool, { x: at.x, y: at.y, n: 8, dist: 110, ms: 900, gravity: cfg.kit === "sky" ? 40 : 0, anims: rt.anims })
                    snd.later("climax", 0, c.t0, { beat: "climax" })
                },
            },
            {
                id: "transform",
                at: 350,
                run: (c) => {
                    const h = hero()
                    const s = stage()
                    if (!h || !s) return
                    s.grade(1, c.skipped ? 0 : c.reduced ? 500 : 950)
                    if (cfg.kit === "sky") {
                        h.setTug(0)
                        h.setStance(1)
                        h.pose("plant")
                    } else if (cfg.kit === "pool") s.particles("mirror", true)
                    else {
                        h.setHeat(0)
                        h.setUnder(0.5)
                    }
                },
            },
            {
                id: "peak",
                at: 1300,
                run: (c) => {
                    const h = hero()
                    const s = stage()
                    if (!h || !s) return
                    const at = h.anchor("hands")
                    const box0 = arenaRef.current ? arenaRef.current.getBoundingClientRect() : { width: 390, height: 600 }
                    if (cfg.kit === "sky") {
                        s.particles("rainbow", true)
                        s.burst("droplets", { x: at.x, y: at.y - 30, n: 12, dist: Math.min(box0.width, 520) * 0.42, ms: 1300, gravity: 60, hue: 200, anims: rt.anims })
                    } else if (cfg.kit === "pool") {
                        s.particles("moonpath", true)
                        s.burst("ripples", { x: at.x, y: at.y + 40, n: 3, dist: 6, s0: 0.4, s1: 3.2, ms: 1700, stagger: 220, anims: rt.anims })
                    } else {
                        h.setUnder(1)
                        s.burst("sparks", { x: at.x, y: at.y, n: 12, dist: 150, spread: 140, angle: -90, ms: 1000, gravity: 90, spin: 180, anims: rt.anims })
                    }
                    if (!c.skipped) s.camera({ y: -10, scale: 1.035, ms: 1100 })
                    snd.later("peak", 0, c.t0, { beat: "peak" })
                },
            },
            {
                id: "afterglow",
                at: 1300,
                run: (c) => {
                    const h = hero()
                    if (!h) return
                    h.pose(cfg.kit === "sky" ? "wave" : cfg.kit === "pool" ? "rest" : "cup")
                    h.celebrate(
                        cfg.kit === "sky"
                            ? [{ at: 120, part: "body", keyframes: [{ transform: "none" }, { transform: "rotate(-8deg) translateY(-6px)", offset: 0.3 }, { transform: "rotate(6deg) translateY(-4px)", offset: 0.65 }, { transform: "none" }], opts: { duration: 900, easing: "ease-in-out" } }]
                            : cfg.kit === "pool"
                              ? [{ at: 0, part: "body", keyframes: [{ transform: "none" }, { transform: "scale(1.04,.97)", offset: 0.5 }, { transform: "none" }], opts: { duration: 2200, easing: "ease-in-out" } }]
                              : [{ at: 80, part: "body", keyframes: [{ transform: "none" }, { transform: "scale(1.08,.92)", offset: 0.25 }, { transform: "scale(.96,1.06) translateY(-8px)", offset: 0.6 }, { transform: "none" }], opts: { duration: 700, easing: "cubic-bezier(.3,.7,.3,1.1)" } }]
                    )
                },
            },
            {
                id: "tableau",
                at: 2600,
                run: () => {
                    const s = stage()
                    const h = hero()
                    if (s) s.camera({ y: -4, scale: 1.015, ms: 900 })
                    if (h && h.el()) h.el().setAttribute("data-label", "1")
                },
            },
        ],
        onFinaleTap: (ev) => {
            const a = arenaRef.current
            const s = stage()
            if (!a || !s) return
            const A = a.getBoundingClientRect()
            s.burst(cfg.pool, { x: ev.clientX - A.left, y: ev.clientY - A.top, n: 4, dist: 40, ms: 600, anims: rt.anims })
            snd.cue("early", ev, { action: "finale-tap" })
        },
        onHandoff: () => {
            const h = hero()
            if (h) h.setStep(3)
        },
    })

    // ---- one completed word: sound, progress, the hero's acting, the supporting cast, the finale start
    const complete = (i, e) => {
        if (goneRef.current[i]) return
        goneRef.current[i] = true
        const k = Object.keys(goneRef.current).length
        const el = hitsRef.current[i]
        const c = centreOf(el)
        const s = stage()
        const h = hero()
        if (cfg.gesture === "taps") snd.cue("word", e) // CRUSH rule (G4): one p.sfx per word, then onProgress
        const v = pctOf(k)
        report(v)
        if (s) s.burst(cfg.pool, { x: c.x, y: c.y, n: cfg.kit === "sky" ? 10 : 6, dist: cfg.kit === "pool" ? 36 : 64, ms: 760, gravity: cfg.kit === "sky" ? 50 : cfg.kit === "workshop" ? 70 : 0, anims: rt.anims })
        if (s && cfg.kit === "pool") s.burst("ripples", { x: c.x, y: c.y + 30, n: 2, dist: 4, s0: 0.4, s1: 2.4, ms: 1300, stagger: 200, anims: rt.anims })
        if (h) {
            const act = eosPilotPick(cfg.acts, pickRef.current)
            const hc = h.anchor("centre")
            h.react(act.face, 340)
            if (cfg.kit === "pool") h.emit("exhale", { ms: 2400, amp: 0.35, puff: false })
            else h.emit(act.motion, { dir: [c.x - hc.x, c.y - hc.y], s: 0.6, px: 14 })
            h.look(el)
            rt.timers.later(() => hero() && hero().look(null), 520)
            if (cfg.kit === "sky") {
                h.setTug(Math.max(0, 1 - k / N))
                h.setStance(k / N)
            }
            if (cfg.kit === "workshop") h.setHeat(Math.max(0, 1 - k / N))
        }
        // supporting cast: every other live object reacts
        actorsRef.current.forEach((a, j) => {
            if (!a || j === i || goneRef.current[j]) return
            a.look(el)
            rt.timers.later(() => a.emit("hop", { px: 8, ms: 240 }), 60 + 50 * j)
            rt.timers.later(() => a.look(null), 700)
        })
        setDone(k)
        if (k >= N) {
            setPhase("finale")
            fin.start(e)
        }
    }
    const g = useEosPilotGesture({
        kind: cfg.gesture === "hold" ? "hold" : "tap",
        holdMs: 850,
        fillMs: 3000,
        fillVar: "--hold-pct",
        anims: rt.anims,
        onDown: (e, info) => {
            shell.playInput()
            snd.warm()
            const i = Number(info.key)
            if (fin.phase.current !== "play" || goneRef.current[i]) return snd.cue("early", e, { action: "early" })
            const a = actorsRef.current[i]
            const el = hitsRef.current[i]
            if (cfg.gesture === "tap") {
                const anim = a ? a.emit("press", { dir: [0, 1] }) : null
                snd.cue("tap", e, { k: Object.keys(goneRef.current).length, anim, impactOffset: 80 })
                complete(i, e)
            } else if (cfg.gesture === "taps") {
                const n = (slamsRef.current[i] = (slamsRef.current[i] || 0) + 1)
                const anim = a ? a.emit("squeeze", { c: 0.3 + 0.14 * n, variant: ["left", "right", "twist"][n % 3], heavy: n === 4 }) : null
                if (a) a.setHeat(1 - n / 4)
                if (el && n < 4) el.setAttribute("data-eos-n", String(4 - n))
                const h = hero()
                if (h) {
                    h.emit("squeeze", { c: 0.12, variant: ["left", "right", "twist"][(n + 1) % 3] })
                    if (n === 2) h.react("brace", 260)
                }
                const c = centreOf(el)
                const s = stage()
                if (s) s.burst("sparks", { x: c.x, y: c.y - 20, n: 4, dist: 46, spread: 120, angle: -90, ms: 520, gravity: 40, anims: rt.anims })
                snd.cue("slam", e, { n, anim, impactOffset: 0 })
                if (n >= 4) {
                    if (a) rt.timers.later(() => a.emit("popBack"), 90)
                    complete(i, e)
                }
            } else {
                if (a) {
                    a.prepare("phew")
                    a.emit("inhale", { ms: 3000, amp: 1 })
                }
                const h = hero()
                if (h) h.emit("inhale", { ms: 3000, amp: 0.3 })
                try {
                    eosBreathOwn("in", 3000)
                } catch (x) {}
                snd.cue("holdStart", e)
            }
        },
        onHoldDone: (e, info) => {
            const i = Number(info.key)
            const a = actorsRef.current[i]
            try {
                eosBreathOwn("out", 2400)
            } catch (x) {}
            if (a) {
                a.emit("exhale", { ms: 2400 })
                a.react("phew", 420)
            }
            snd.cue("holdDone", e)
            complete(i, e)
        },
        onHoldCancel: (e, info) => {
            const a = actorsRef.current[Number(info.key)]
            try {
                eosBreathOwn(null)
            } catch (x) {}
            if (a) a.emit("exhale", { ms: 700, puff: false })
            const h = hero()
            if (h) {
                h.emit("exhale", { ms: 700, puff: false })
                h.react("curious", 300)
            }
            snd.cue("holdCancel", e, { action: "almost" })
        },
    })
    const near = useEosPilotNearHit(arenaRef, () => hitsRef.current.filter((el, i) => el && !goneRef.current[i]), 28)
    const onArenaDown = (e) => {
        snd.warm()
        if (fin.phase.current === "finale") return fin.tap(e)
        if (fin.phase.current !== "play") return
        const t = e.target
        if (t && t.closest && t.closest(".eosPilotHit")) return
        shell.playInput()
        const hit = near(e)
        if (hit) return g.route(e, hit.el)
        // a miss: never silent, never a fail
        const h = hero()
        snd.cue("miss", e, { action: "miss" })
        if (h) {
            const a = arenaRef.current.getBoundingClientRect()
            const hc = h.anchor("centre")
            missRef.current++
            h.emit("miss", { dir: [e.clientX - a.left - hc.x, 0], variant: missRef.current % 2 ? "tilt" : "shake" })
            h.react("curious", 300)
        }
    }

    // ---- layout: fractions of the S5 play box (thumb zone low on the phone)
    const b = box || { w: 390, h: 600, u: 1, phone: true, play: { top: 60, bottom: 560, left: 8, right: 382 } }
    const H = b.play.bottom - b.play.top
    const twoRows = b.phone && N >= 4
    const perRow = twoRows ? 2 : N
    const heroY = b.play.top + H * (b.phone ? 0.36 : 0.38)
    const rowY = (r) => b.play.top + H * (twoRows ? (r ? 0.86 : 0.62) : b.phone ? 0.74 : 0.72)
    const span = Math.min(b.w - 32, b.phone ? b.w : 760)
    const slotX = (j, cnt) => b.w / 2 - span / 2 + (span * (j + 0.5)) / cnt
    const labelMax = Math.max(84, Math.min(180, span / perRow - 12))
    const live0 = phase === "play" ? words.findIndex((_, i) => !goneRef.current[i]) : -1
    const progress = phase === "play" ? pctOf(done) : 100
    return (
        <div
            ref={arenaRef}
            className="arena eosPilotArena eosPilotDemo"
            data-eos-pilot-kit={cfg.kit}
            data-eos-pilot-reduced={reduced ? "1" : undefined}
            onPointerDown={onArenaDown}
            style={{ "--eos-pilot-word-px": "16px" }}
        >
            <EosPilotStage ref={stageRef} kit={cfg.kit} calm={Math.min(0.9, done / N)} planeClassName={phase === "play" ? "" : "isLocked"}>
                <EosPilotActor
                    ref={heroRef}
                    role={cfg.role}
                    emotion={emotion}
                    size={112}
                    u={b.u}
                    progress={progress}
                    reacts={EOS_PILOT_DEMO_REACTS[cfg.kit]}
                    label={EOS_CHAR_NAMES[heroChar]}
                    showLabel={done === 0}
                    seed={gameId}
                    className="eosPilotDemoHero"
                    style={{ left: `${b.w / 2}px`, top: `${heroY}px` }}
                />
                {words.map((w, i) => {
                    const row = twoRows ? Math.floor(i / 2) : 0
                    const cnt = twoRows ? (row ? N - 2 : 2) : N
                    const j = twoRows ? i % 2 : i
                    const gone = !!goneRef.current[i]
                    const isLive = i === live0
                    const spec = cfg.gesture === "taps" ? { ...cfg.marker, n: 4 - (slamsRef.current[i] || 0) } : cfg.marker
                    const size = Math.round(76 * eosClamp(b.u, 0.85, 1.35))
                    return (
                        <button
                            key={`hit-${i}`}
                            ref={(n) => (hitsRef.current[i] = n)}
                            className={`eosPilotHit eosPilotDemoHit${gone ? " isGone" : ""}`}
                            disabled={phase !== "play" || gone}
                            aria-label={`${cfg.marker.label} ${w}`}
                            style={{ left: `${slotX(j, cnt)}px`, top: `${rowY(row)}px`, width: `${size}px`, height: `${size}px`, "--label-max": `${labelMax}px` }}
                            {...g.bind(i)}
                            {...eosPilotMarker(spec, isLive)}
                        >
                            <EosPilotActor
                                ref={(n) => (actorsRef.current[i] = n)}
                                role={cfg.kit === "workshop" ? "inside" : "breath"}
                                char={chars[i]}
                                image={userImgs.length ? userImgs[i % userImgs.length] : null}
                                size={76}
                                u={b.u}
                                progress={gone ? 100 : 0}
                                reacts={cfg.kit === "pool" ? ["phew"] : []}
                                eager={i === 0}
                                word={w}
                                seed={i + 11}
                                ballChildren={cfg.gesture === "hold" ? <i className="eosPilotFill" /> : null}
                                style={{ left: "50%", top: "50%" }}
                            />
                        </button>
                    )
                })}
            </EosPilotStage>
            {phase === "play" ? (
                <div className="eosPilotDemoTag" aria-hidden="true">
                    systems demo · {cfg.kit}
                </div>
            ) : null}
        </div>
    )
})
eosPilotRegisterDemo(EosPilotDemoEngine)

const EOS_PILOT_DEMO_CSS = `
${EOS_A} .eosPilotDemo .eosPilotDemoHit{translate:-50% -50%;transition:opacity .38s ease .08s,scale .38s cubic-bezier(.2,.8,.3,1.3) .02s}
${EOS_A} .eosPilotDemo .eosPilotDemoHit.isGone{opacity:0;scale:1.25;pointer-events:none}
${EOS_A} .eosPilotDemo .eosPilotDemoHit .eosPilotActorLabel{max-width:var(--label-max,170px)}
${EOS_A} .eosPilotDemo .eosPilotDemoHit[data-press="1"] .eosPilotActorBall{box-shadow:0 0 0 3px rgba(255,255,255,.65),0 0 24px hsla(var(--a-hue),95%,75%,.6)}
${EOS_A} .eosPilotDemo .eosPilotDemoTag{position:absolute;right:10px;top:8px;z-index:6;font-size:13px;font-weight:800;letter-spacing:.06em;color:rgba(255,255,255,.8);
  text-shadow:0 1px 3px rgba(0,0,0,.5);pointer-events:none;text-transform:uppercase}
${EOS_A} .eosPilotDemo[data-eos-pilot-kit="sky"] .eosPilotDemoHit .eosPilotActorLabel{color:#1f1b44;text-shadow:0 1px 0 rgba(255,255,255,.6),0 0 10px rgba(255,255,255,.55)}
`
eosCss("pilot-demo", EOS_PILOT_DEMO_CSS)
