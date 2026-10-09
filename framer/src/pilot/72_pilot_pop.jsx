// ===================================================================================
// Pilot A · 72_pilot_pop.jsx — POP (id 1) "Balloon Morning" (docs/pilot/PILOT_A_SPEC.md §3.1).
// Destroy · holder role · sky kit. The session's character stands on a small sunlit cloud-top, yanked
// every way by a jittery bunch of tethered soap bubbles (one per word). Each pop snaps a pull: the hero
// lurches, plants its feet wider and steadies. Finale "Calm Bubble": the droplets stream into its hands
// and merge into one calm bubble around it; the sun catches the film and refracts into a rainbow.
// Built on the shared systems (70_pilot_core, 71_pilot_fx): S0 shell pattern, S1 actor, S2 finale,
// S3 sky stage, S4 named cues + sync log, S5 tap gesture / near-hit / play box, S6 chrome hooks.
// No import/export, no regex lookbehind, every top-level name prefixed EosPilot/eosPilot/EOS_PILOT.
// ===================================================================================

const EOS_PILOT_POP = {
    id: 1,
    verb: "POPPED",
    marker: { g: "tap", label: "POP IT!" },
    reacts: ["brace", "wow", "phew", "giggle"],
    // the win face POP's celebration calls for: a closed-eye (or happiest) smile per character, picked on the
    // EOS_WIN_FACES contact strip (spec S1 step 3: "preferring a closed-eye smile where the celebration calls for one")
    winFace: { sync: 63, rush: 35, glitch: 49, loopie: 61, drop: 28, patch: 43, still: 62 },
    // layout fractions of the S5 play box (px minimums applied in eosPilotPopGeom)
    lay: {
        phone: { heroX: 0.5, heroY: 0.84, rows: [0.61, 0.43], imgRows: [0.56, 0.36], x0: 0.2, x1: 0.8, hero: 112, d0: 84, d1: 100, outer: 92, calm: 176, swayPx: 10 },
        desk: { heroX: 0.6, heroY: 0.8, rows: [0.58, 0.4], imgRows: [0.55, 0.36], x0: 0.42, x1: 0.78, hero: 140, d0: 108, d1: 128, outer: 128, calm: 240, swayPx: 13 },
    },
    // fill order, bottom first: [row (0 lower, 1 upper), f (0..1 across the row span)]
    fill: {
        1: [[0, 0.5]],
        2: [[0, 0.25], [0, 0.75]],
        3: [[0, 0], [0, 0.5], [0, 1]],
        4: [[0, 0], [0, 0.5], [0, 1], [1, 0.5]],
        5: [[0, 0], [0, 0.5], [0, 1], [1, 0.25], [1, 0.75]],
        6: [[0, 0], [0, 0.5], [0, 1], [1, 0], [1, 0.5], [1, 1]],
    },
    chainMs: 900,
    rebalanceMs: 400,
    swapMs: 600,
    // acting pool for a plain pop (CR-4b): {face, motion} pairs, never the same pair twice in a row
    acts: [
        { face: "brace", motion: "spot" },
        { face: "wow", motion: "shake" },
        { face: "wow", motion: "glance" },
    ],
    // S4 cue table (spec §3.1 s1-s10). Input-driven layers fire inside the pointer handler.
    cues: {
        pop: [{ arcade: "pop", impact: true }, { tone: (o) => [eosNote(o.chain || 0, 523), 120, { type: "sine", gain: 0.035, at: 0.03 }], impact: true }],
        miss: [{ tone: [220, 90, { type: "triangle", gain: 0.03, glide: 180 }], haptic: 8 }],
        early: [{ tone: [880, 40, { type: "sine", gain: 0.012 }] }],
        exhale: [{ tone: [520, 380, { type: "sine", gain: 0.02, glide: 390 }] }],
        step: [{ tone: [660, 140, { type: "sine", gain: 0.025 }] }],
        step2: [{ tone: [880, 140, { type: "sine", gain: 0.025 }] }],
        giggle: [{ tone: [988, 40, { type: "sine", gain: 0.02 }] }],
        laugh: [{ tone: [988, 40, { type: "sine", gain: 0.02 }] }],
        chirpB: [{ tone: [1175, 40, { type: "sine", gain: 0.02 }] }],
        chirpA: [{ tone: [988, 40, { type: "sine", gain: 0.02 }] }],
        chirpC: [{ tone: [1319, 40, { type: "sine", gain: 0.02 }] }],
        catch: [{ tone: [784, 160, { type: "sine", gain: 0.022, glide: 988 }] }],
        shimmer: [{ tone: [660, 350, { type: "sine", gain: 0.03, glide: 1320 }] }],
        plink1: [{ tone: [1046, 160, { type: "sine", gain: 0.025 }] }],
        plink2: [{ tone: [1318, 160, { type: "sine", gain: 0.025 }] }],
        plink3: [{ tone: [1568, 200, { type: "sine", gain: 0.025 }] }],
        glow: [{ tone: [523, 1200, { type: "sine", gain: 0.015 }] }, { tone: [659, 1200, { type: "sine", gain: 0.015 }] }, { tone: [784, 1200, { type: "sine", gain: 0.015 }] }],
        finaleTap: [{ tone: [1568, 60, { type: "sine", gain: 0.012 }] }],
    },
}

// Slots for a wave of n words, in reading order (upper row first, left to right).
function eosPilotPopSlots(n) {
    const t = EOS_PILOT_POP.fill[Math.max(1, Math.min(6, n))] || EOS_PILOT_POP.fill[1]
    return t.map(([row, f]) => ({ row, f })).sort((a, b) => b.row - a.row || a.f - b.f)
}
// Re-balance: upper bubbles drift down into empty lower slots (nearest in x). Returns null when nothing moves.
function eosPilotPopRebalance(layout, alive, n) {
    const lowF = (EOS_PILOT_POP.fill[Math.max(1, Math.min(6, n))] || []).filter((s) => s[0] === 0).map((s) => s[1])
    const out = layout.map((s) => ({ ...s }))
    let changed = false
    for (const f of lowF) {
        if (out.some((s, j) => alive(j) && s.row === 0 && Math.abs(s.f - f) < 0.01)) continue
        let best = -1
        out.forEach((s, j) => {
            if (!alive(j) || s.row !== 1) return
            if (best < 0 || Math.abs(s.f - f) < Math.abs(out[best].f - f)) best = j
        })
        if (best >= 0) {
            out[best] = { row: 0, f }
            changed = true
        }
    }
    return changed ? out : null
}
// All geometry in arena px, from the S5 play box. Pure: called in render, read by handlers via a ref.
function eosPilotPopGeom(b, words, layout, imgMode, raised, seed) {
    const L = b.phone ? EOS_PILOT_POP.lay.phone : EOS_PILOT_POP.lay.desk
    const top = b.play.top
    // desktop: the LIVE GUIDE only covers the bottom-left, so the hero's column may use the full height
    const bottom = b.phone ? b.play.bottom : Math.max(b.play.bottom, b.h - 16)
    const H = Math.max(200, bottom - top)
    const left = b.play.left
    const W = b.play.right - b.play.left
    const u = eosClamp(b.u, 0.85, 1.35)
    const px = Math.round(L.hero * u)
    const K = px / 112
    const hx = left + W * L.heroX
    const hy = Math.min(top + H * L.heroY, bottom - px * 0.62)
    const heroTop = hy - px / 2
    const hand = (side) => ({ x: hx + side * (px * 0.5 + (raised ? 4 * K : 0)), y: hy - px * 0.02 - (raised ? 26 * K : 0) })
    const dk = b.phone ? eosClamp(b.u, 0.92, 1.08) : eosClamp(b.u, 0.9, 1.1)
    const rowsF = imgMode ? L.imgRows : L.rows
    const labelH = imgMode ? 40 : 0
    const bubbles = words.map((w, i) => {
        const s = layout[i] || { row: 0, f: 0.5 }
        const len = String(w || "").length
        const t = eosClamp((len - 3) / 9, 0, 1)
        let d = (L.d0 + (L.d1 - L.d0) * t) * dk
        if (s.f <= 0.01 || s.f >= 0.99) d = Math.min(d, L.outer * dk)
        d = Math.round(d)
        const x = left + W * (L.x0 + (L.x1 - L.x0) * s.f)
        const jit = (eosPilotRand(seed + i * 7) - 0.5) * 0.024 * H
        const dLow = L.d1 * dk
        const yLow = Math.min(top + H * rowsF[0], heroTop - 20 - dLow / 2 - labelH)
        // the upper row clears the lower row (no overlapping films), whatever the jitter
        let y = s.row === 0 ? yLow + Math.max(0, jit) : Math.min(top + H * rowsF[1], yLow - dLow / 2 - d / 2 - 14 - labelH) + Math.min(0, jit)
        y = Math.max(top + d / 2 + 8, y)
        const side = x < hx - 2 ? -1 : x > hx + 2 ? 1 : i % 2 ? 1 : -1
        const hp = hand(side)
        const dx = x - hp.x
        const dy = y + d * 0.47 - hp.y
        const len2 = Math.max(6, Math.hypot(dx, dy))
        const theta = (((Math.atan2(-dx, dy) * 180) / Math.PI) + 360) % 360
        const dist = Math.hypot(x - hp.x, y - hp.y) || 1
        const sw = Math.min(6, (L.swayPx / dist) * 57.3)
        return { i, word: w, x, y, d, row: s.row, f: s.f, hx: hp.x, hy: hp.y, theta, len: len2, sw, side }
    })
    const cy = hy + px * 0.08
    const calmCap = (b.phone ? b.play.bottom + 6 : bottom) - cy
    const calmD = Math.round(Math.max(px * 1.25, Math.min(L.calm * eosClamp(b.u, 0.85, 1.15), 2 * calmCap - 4, 2 * (cy - top) - 4, W - 12)))
    const cloudW = Math.round(Math.min(W * 0.86, px * 2.3))
    const cloudH = Math.round(px * 0.46)
    const G = Math.round(Math.max(calmD, cloudW) + 40)
    // the sun (sky kit: left 4%, top 2%, width 26% of the stage, aspect 1)
    const sun = { x: b.w * 0.17, y: b.h * 0.02 + b.w * 0.13 }
    return { px, K, hx, hy, cy, calmD, cloudW, cloudH, G, gx: hx - G / 2, gy: cy - G / 2, bubbles, sun, top, bottom, phone: b.phone, w: b.w, h: b.h }
}

function EosPilotPopEngine(p) {
    const live = React.useRef(p)
    live.current = p
    const wordsKey = (p.entries || []).join("\u0001")
    const wordPx = eosClamp(Number(p.bubbleTextPx) || 16, 15, 17)
    return <EosPilotPopInner live={live} gameId={1} wordsKey={wordsKey} reduced={!!p.reduced} userImgKey={eosPilotImgKey(p)} wordPx={wordPx} />
}

const EosPilotPopInner = React.memo(function EosPilotPopInner({ live, gameId, wordsKey, reduced, userImgKey, wordPx }) {
    const C = EOS_PILOT_POP
    const arenaRef = React.useRef(null)
    const stageRef = React.useRef(null)
    const heroRef = React.useRef(null)
    const calmRef = React.useRef(null)
    const groupRef = React.useRef(null)
    const fxRef = React.useRef(null)
    const hitsRef = React.useRef([])
    const goneRef = React.useRef({})
    const geomRef = React.useRef(null)
    const waveRef = React.useRef({ wave: 0, off: 0, words: [] })
    const phaseRef = React.useRef("play")
    const pickRef = React.useRef({ current: -1 })
    const st = React.useRef({ k: 0, chain: 0, chainMax: 0, lastPopT: -1e9, lastX: null, rbT: 0, miss: 0, hang: [], hangRR: 0, ringRR: 0, shardRR: 0, last: null, intro: -1, chainAlt: 0 }).current
    const rt = useEosPilotRuntime()
    const shell = useEosPilotShell(arenaRef, gameId)
    const box = useEosPilotBox(arenaRef)

    const W = React.useMemo(() => {
        const r = eosPilotWords(wordsKey ? wordsKey.split("\u0001") : [], 6)
        const words = r.words.length ? r.words : ["this feeling"]
        const waves = r.waves.length ? r.waves : [words]
        return { words, waves, N: words.length }
    }, [wordsKey])
    const N = W.N
    const userImgs = React.useMemo(() => (userImgKey ? userImgKey.split("\u0001") : []), []) // snapshot at mount
    const imgMode = userImgs.length > 0
    const emotion = React.useMemo(() => (typeof eosCurrentEmotion === "function" && eosCurrentEmotion()) || "auto", [])
    const heroChar = EOS_EMO[emotion] ? EOS_EMO[emotion].char : "still"
    const seed = React.useMemo(() => Math.floor(Math.random() * 1000), [])
    const heroSeed = React.useMemo(() => {
        const list = (typeof EOS_WIN_FACES !== "undefined" && EOS_WIN_FACES[heroChar]) || []
        const j = list.indexOf(C.winFace[heroChar])
        return j >= 0 ? j : seed
    }, [heroChar])
    const raised = React.useMemo(() => !eosPilotIsReduced(null, live), [])

    const [k, setK] = React.useState(0)
    const [wave, setWave] = React.useState(0)
    const [phase, setPhase] = React.useState("play")
    const [layout, setLayout] = React.useState(() => eosPilotPopSlots((W.waves[0] || []).length))
    const waveWords = W.waves[wave] || []
    const off = W.waves.slice(0, wave).reduce((a, w) => a + w.length, 0)
    waveRef.current = { wave, off, words: waveWords }

    const snd = useEosPilotSound({ gameId, live, cues: C.cues, timers: rt.timers })
    const pctOf = (n) => (n >= N ? EOS_PILOT_FINAL_PCT : Math.round((n / N) * 100))
    const report = (v) => {
        try {
            live.current.onProgress(v, `${v}% ${C.verb}`)
        } catch (e) {}
    }
    React.useEffect(() => {
        report(0)
    }, [])
    const hero = () => heroRef.current
    const stage = () => stageRef.current
    const anim = (el, kf, o) => eosPilotAnim(rt.anims, el, kf, o)
    const red = () => eosPilotIsReduced(arenaRef.current, live)
    const fxNodes = (cls) => (fxRef.current ? Array.from(fxRef.current.querySelectorAll(`:scope > .${cls}`)) : [])

    // ---------------------------------------------------------------- finale "Calm Bubble" (S2)
    const fin = useEosPilotFinale({
        arenaRef,
        live,
        gameId,
        bonus: 260 + st.chainMax * 18,
        label: `100% ${C.verb}`,
        kit: "sky",
        heroFace: () => eosPilotFaceSrc(heroChar, 3, emotion, heroSeed),
        anims: rt.anims,
        timers: rt.timers,
        handoffMs: EOS_PILOT_HANDOFF_MS,
        beats: [
            {
                // 0-350 climax: the last bubble tears in slow motion; its droplets and every hanging droplet freeze; light flares
                id: "climax",
                at: 0,
                run: (c) => {
                    const G = geomRef.current
                    const h = hero()
                    if (!G) return
                    const flare = groupRef.current && groupRef.current.querySelector(".popFlare")
                    if (c.reduced) {
                        st.hang.forEach((n) => n && n.el.removeAttribute("data-on"))
                        return
                    }
                    if (flare) c.anim(flare, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1.08)", offset: 0.45 }, { opacity: 0.55, transform: "scale(1)" }], { duration: 700, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" })
                    if (h) {
                        h.look("camera")
                        h.react("wow", 320)
                    }
                    const last = st.last
                    const drops = stage() && stage().layer("fx") ? Array.from(stage().layer("fx").querySelectorAll('[data-pool="droplets"] > i')).slice(0, 8) : []
                    st.fdrops = []
                    if (last)
                        drops.forEach((el, j) => {
                            const a = (j / drops.length) * Math.PI * 2 + 0.4
                            const r = last.d * (0.55 + 0.22 * eosPilotRand(seed + j))
                            const x = last.x + Math.cos(a) * r
                            const y = last.y + Math.sin(a) * r * 0.85
                            el.style.setProperty("--p-hue", String(190 + j * 18))
                            el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(.95)`
                            el.style.opacity = "1"
                            c.anim(el, [{ transform: `translate(${last.x.toFixed(1)}px,${last.y.toFixed(1)}px) scale(.3)`, opacity: 0 }, { transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(.95)`, opacity: 1 }], { duration: 340, easing: "cubic-bezier(.1,.8,.2,1)" })
                            st.fdrops.push({ el, x, y })
                        })
                    // the hanging droplets stop bobbing (freeze) and catch the light
                    st.hang.forEach((n) => {
                        if (!n) return
                        n.el.setAttribute("data-freeze", "1")
                        c.anim(n.el, [{ opacity: 0.95 }, { opacity: 1, offset: 0.3 }, { opacity: 0.95 }], { duration: 340 })
                    })
                    snd.later("shimmer", 0, c.t0, { beat: "climax" })
                },
            },
            {
                // 350-1250 transformation: hands up, droplets stream into the hands and merge into the calm bubble
                id: "transform",
                at: 350,
                run: (c) => {
                    const G = geomRef.current
                    const h = hero()
                    const calm = calmRef.current
                    if (!G || !calm) return
                    calm.setAttribute("data-on", "1")
                    if (c.reduced) {
                        c.anim(calm, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 })
                        return
                    }
                    if (h) {
                        h.look(null)
                        h.pose("raise")
                        c.later(() => hero() && hero().react("phew", 420), 520)
                        c.later(() => hero() && hero().pose("press"), 750)
                    }
                    const hands = h ? h.anchor("hands") : { x: G.hx, y: G.hy }
                    const pts = (st.fdrops || []).concat(st.hang.filter(Boolean).map((n) => ({ el: n.el, x: n.x, y: n.y, hang: true })))
                    pts.forEach((pt, j) => {
                        const side = pt.x < hands.x ? -1 : 1
                        const ex = hands.x + side * G.px * 0.42
                        const ey = hands.y - G.px * 0.1
                        const mx = (pt.x + ex) / 2 + side * 26
                        const my = Math.min(pt.y, ey) - 28 - (j % 3) * 10
                        if (pt.hang) {
                            pt.el.removeAttribute("data-on")
                            pt.el.removeAttribute("data-freeze")
                        } else pt.el.style.opacity = "0"
                        pt.el.style.transform = `translate(${ex.toFixed(1)}px,${ey.toFixed(1)}px) scale(.2)`
                        c.anim(
                            pt.el,
                            [
                                { transform: `translate(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px) scale(1)`, opacity: 1 },
                                { transform: `translate(${mx.toFixed(1)}px,${my.toFixed(1)}px) scale(.85)`, opacity: 1, offset: 0.5, easing: "cubic-bezier(.4,0,.6,1)" },
                                { transform: `translate(${ex.toFixed(1)}px,${ey.toFixed(1)}px) scale(.2)`, opacity: 0.2 },
                            ],
                            { duration: 520, delay: 30 * j, easing: "cubic-bezier(.3,0,.6,1)", fill: "backwards" }
                        )
                    })
                    // the calm bubble grows around the hero and its cloud-top (lands by T0 + 1250)
                    c.anim(calm, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(.5)", opacity: 0.9, offset: 0.35 }, { transform: "scale(1.06)", opacity: 1, offset: 0.78 }, { transform: "scale(1)", opacity: 1 }], { duration: 700, delay: 200, easing: "cubic-bezier(.3,.7,.4,1)", fill: "backwards" })
                    const rim = calm.querySelector(".rim")
                    if (rim) c.anim(rim, [{ transform: "rotate(0deg)" }, { transform: "rotate(160deg)" }], { duration: 900, delay: 200, easing: "ease-out" })
                    snd.later("plink1", 350, c.t0, { beat: "merge" })
                    snd.later("plink2", 470, c.t0, { beat: "merge" })
                    snd.later("plink3", 590, c.t0, { beat: "merge" })
                },
            },
            {
                // 1300 PEAK: the bubble catches the sun — a beam from the sun, a flash on the film, the rim spins up,
                // a rainbow caustic sweeps through the bubble and a rainbow fans out of it; the face turns win (hand-off).
                id: "peak",
                at: 1300,
                run: (c) => {
                    const G = geomRef.current
                    const s = stage()
                    const calm = calmRef.current
                    if (!G || !calm) return
                    calm.setAttribute("data-on", "1")
                    if (s) s.particles("rainbow", true)
                    const arch = fxNodes("popArch")[0]
                    const beam = fxNodes("popBeam")[0]
                    if (arch) arch.setAttribute("data-on", "1")
                    if (beam) beam.setAttribute("data-on", "1")
                    if (c.reduced) {
                        if (arch) c.anim(arch, [{ opacity: 0 }, { opacity: 0.9 }], { duration: 500 })
                        return
                    }
                    const flash = calm.querySelector(".flash")
                    const caus = calm.querySelector(".caustic")
                    const rim = calm.querySelector(".rim")
                    if (flash) c.anim(flash, [{ opacity: 0 }, { opacity: 0.95, offset: 0.18 }, { opacity: 0 }], { duration: 560, easing: "ease-out" })
                    if (caus) c.anim(caus, [{ transform: "translateX(-75%) rotate(14deg)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: "translateX(40%) rotate(14deg)", opacity: 0.85, offset: 0.8 }, { transform: "translateX(55%) rotate(14deg)", opacity: 0 }], { duration: 620, easing: "cubic-bezier(.4,0,.3,1)" })
                    if (rim) c.anim(rim, [{ transform: "rotate(0deg)" }, { transform: "rotate(540deg)" }], { duration: 1100, easing: "cubic-bezier(.2,.7,.3,1)" })
                    if (beam) c.anim(beam, [{ transform: "rotate(var(--ba)) scaleX(0)", opacity: 0 }, { transform: "rotate(var(--ba)) scaleX(1)", opacity: 1, offset: 0.35 }, { transform: "rotate(var(--ba)) scaleX(1)", opacity: 0.7 }], { duration: 900, easing: "cubic-bezier(.2,.8,.3,1)" })
                    if (arch) c.anim(arch, [{ transform: "translateY(18%) scale(.55)", opacity: 0 }, { transform: "translateY(-2%) scale(1.04)", opacity: 1, offset: 0.45 }, { transform: "none", opacity: 1 }], { duration: 900, easing: "cubic-bezier(.2,.8,.3,1)" })
                    const sun = s && s.layer("l1") ? s.layer("l1").querySelector(".sun") : null
                    if (sun) anim(sun, [{ transform: "scale(1)" }, { transform: "scale(1.3)", offset: 0.3 }, { transform: "scale(1)" }], { duration: 1200, easing: "ease-out" })
                    if (s) s.burst("droplets", { x: G.hx, y: G.cy - G.calmD * 0.42, n: 8, dist: G.calmD * 0.5, spread: 160, angle: -90, ms: 900, gravity: 30, hue: 50, anims: rt.anims })
                },
            },
            {
                // 1300-2600 afterglow, POP's own celebration: the hero sits cross-legged inside its bubble and bobs on the cloud
                id: "afterglow",
                at: 1300,
                run: (c) => {
                    const G = geomRef.current
                    const s = stage()
                    const h = hero()
                    if (s) s.grade(1, c.reduced ? 500 : 1200)
                    snd.later("glow", 1700, c.t0, { beat: "afterglow" })
                    if (c.reduced || !G) return
                    if (h) {
                        c.later(() => {
                            const hh = hero()
                            if (!hh) return
                            hh.pose("sitCross")
                            hh.pose("cup")
                            hh.celebrate([{ at: 0, part: "body", slot: "sit", keyframes: [{ transform: "none" }, { transform: `translateY(${(G.px * 0.05).toFixed(1)}px) scale(1.05,.9)` }], opts: { duration: 520, easing: "cubic-bezier(.3,.7,.3,1.2)", fill: "forwards" } }])
                        }, 260)
                    }
                    const grp = groupRef.current
                    if (grp) c.later(() => anim(grp, [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }], { duration: 1300, iterations: Infinity, direction: "alternate", easing: "ease-in-out" }), 500)
                    const glints = fxNodes("popGlint")
                    glints.forEach((el, j) => {
                        const x0 = G.hx - G.cloudW * (0.45 - j * 0.12)
                        const y0 = G.hy + G.px * (0.45 + 0.08 * j)
                        c.anim(el, [{ transform: `translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px) scale(.4)`, opacity: 0 }, { transform: `translate(${(x0 + G.cloudW * 0.25).toFixed(1)}px,${(y0 - 8).toFixed(1)}px) scale(1)`, opacity: 1, offset: 0.4 }, { transform: `translate(${(x0 + G.cloudW * 0.55).toFixed(1)}px,${(y0 - 4).toFixed(1)}px) scale(.5)`, opacity: 0 }], { duration: 1500, delay: 200 + 280 * j, fill: "backwards", iterations: 1 })
                    })
                },
            },
            {
                // 2600 tableau: resting in its own bubble on the sunlit cloud; the name label comes back
                id: "tableau",
                at: 2600,
                run: () => {
                    const h = hero()
                    if (h && h.el()) h.el().setAttribute("data-label", "1")
                },
            },
        ],
        onFinaleTap: (ev) => {
            const calm = calmRef.current
            const g = calm && calm.querySelector(".glint")
            if (g && !red()) anim(g, [{ transform: "translateX(-60%) rotate(20deg)", opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: "translateX(60%) rotate(20deg)", opacity: 0 }], { duration: 420, easing: "ease-out" })
            snd.cue("finaleTap", ev, { action: "finale-tap" })
        },
        onHandoff: () => {
            const h = hero()
            if (h) h.setStep(3)
        },
    })

    // ---------------------------------------------------------------- intro + wave arrival
    React.useLayoutEffect(() => {
        if (!box || st.intro === wave) return
        st.intro = wave
        const first = wave === 0
        const R = red()
        const G = geomRef.current
        hitsRef.current.forEach((el, i) => {
            if (!el || !G || !G.bubbles[i]) return
            const g = G.bubbles[i]
            const body = el.querySelector(".pbBody")
            const word = el.querySelector(".pbWord")
            const teth = el.querySelector(".pbTether")
            const tf = (s) => `rotate(${g.theta.toFixed(1)}deg) scaleY(${s})`
            if (R) {
                anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: first ? 150 + 70 * i : 0, fill: "backwards" })
                return
            }
            const d0 = first ? 150 + 70 * i : 0
            if (!first) anim(el, [{ transform: `translateX(${Math.round(G.w * 0.75)}px)` }, { transform: "none" }], { duration: C.swapMs, delay: 30 * i, easing: "cubic-bezier(.2,.8,.3,1.04)", fill: "backwards" })
            else anim(body, [{ transform: "scale(0)" }, { transform: "scale(1.06)", offset: 0.7 }, { transform: "scale(1)" }], { duration: 380, delay: d0, easing: "cubic-bezier(.3,.7,.4,1)", fill: "backwards" })
            if (first) anim(word, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: d0 + 200, fill: "backwards" })
            anim(teth, [{ transform: tf(0) }, { transform: tf((g.len / 100).toFixed(3)) }], { duration: 260, delay: first ? d0 + 220 : C.swapMs - 120 + 30 * i, easing: "ease-out", fill: "backwards" })
        })
        if (!first) return
        const s = stage()
        if (s && s.el()) anim(s.el(), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" })
        const cloud = groupRef.current && groupRef.current.querySelector(".popCloud")
        const h = hero()
        if (R) return
        if (cloud) anim(cloud, [{ transform: "translateY(14px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.2,.8,.3,1.1)", fill: "backwards" })
        if (h && h.part("idle")) anim(h.part("idle"), [{ transform: "translateY(26px)", opacity: 0 }, { transform: "translateY(-6px)", opacity: 1, offset: 0.6 }, { transform: "none", opacity: 1 }], { duration: 480, delay: 300, easing: "cubic-bezier(.3,.7,.4,1)", fill: "backwards" })
        rt.timers.later(() => {
            const hh = hero()
            if (!hh) return
            hh.pose("raise")
            hh.setTug(1)
            hh.setStance(0)
        }, 300)
        rt.timers.later(() => {
            const hh = hero()
            if (hh && hh.el() && phaseRef.current === "play") hh.el().setAttribute("data-label", "0")
        }, 1100)
    }, [wave, !!box])

    // ---------------------------------------------------------------- a pop
    const centreHit = (g) => ({ x: g.x, y: g.y })
    const rebalance = () => {
        st.rbT = 0
        if (phaseRef.current !== "play") return
        const wr = waveRef.current
        setLayout((prev) => eosPilotPopRebalance(prev, (j) => !goneRef.current[wr.off + j], wr.words.length) || prev)
    }
    const pop = (i, e) => {
        const tIn = performance.now()
        try {
            requestAnimationFrame(() => {
                st.perf = (st.perf || []).concat([[Math.round(performance.now() - tIn), st.handlerMs || 0]]).slice(-12)
            })
        } catch (x) {}
        popInner(i, e)
        st.handlerMs = Math.round(performance.now() - tIn)
    }
    const popInner = (i, e) => {
        const G = geomRef.current
        const wr = waveRef.current
        const g = G && G.bubbles[i]
        const gi = wr.off + i
        if (!g || goneRef.current[gi]) return
        goneRef.current[gi] = true
        const R = red()
        const el = hitsRef.current[i]
        const k1 = ++st.k
        const isLast = k1 >= N
        const waveLeft = wr.words.filter((_, j) => !goneRef.current[wr.off + j]).length
        const t = eosPilotEvT(e).t
        st.chain = t - st.lastPopT < C.chainMs ? st.chain + 1 : 1
        st.lastPopT = t
        st.chainMax = Math.max(st.chainMax, st.chain)
        const hasPt = e && typeof e.clientX === "number" && (e.clientX || e.clientY)
        const A = arenaRef.current ? arenaRef.current.getBoundingClientRect() : { left: 0, top: 0 }
        const tp = hasPt ? { x: e.clientX - A.left, y: e.clientY - A.top } : centreHit(g)
        st.lastX = tp.x
        const vOld = pctOf(k1 - 1)
        const v = pctOf(k1)
        const crossing = !isLast && eosPilotFaceStep(v) !== eosPilotFaceStep(vOld)
        const slow = isLast && !R ? 2.6 : 1

        // -- the bubble: dimple toward the touch, then the film tears (s1 lands on the tear frame)
        const body = el && el.querySelector(".pbBody")
        const word = el && el.querySelector(".pbWord")
        const teth = el && el.querySelector(".pbTether")
        let bodyAnim = null
        if (R) {
            bodyAnim = anim(body, [{ opacity: 1 }, { opacity: 0 }], { duration: 120 })
            anim(word, [{ opacity: 1 }, { opacity: 0 }], { duration: 120 })
        } else {
            const a = (Math.atan2(tp.y - g.y, tp.x - g.x) * 180) / Math.PI
            const D = 180 * slow
            bodyAnim = anim(
                body,
                [
                    { transform: "none", opacity: 1 },
                    { transform: `rotate(${a.toFixed(0)}deg) scale(.94,1.06) rotate(${(-a).toFixed(0)}deg)`, opacity: 1, offset: 0.22, easing: "cubic-bezier(.2,.8,.3,1)" },
                    { transform: "scale(1.18)", opacity: 0 },
                ],
                { duration: D, easing: "cubic-bezier(.3,.6,.4,1)" }
            )
            anim(word, [{ transform: "none", opacity: 1 }, { transform: "translateY(-10px) scale(1.06)", opacity: 0.9, offset: 0.35 }, { transform: "translateY(-30px) scale(1.1)", opacity: 0 }], { duration: 420 * slow, easing: "ease-out" })
            const tf = (s, r) => `rotate(${(g.theta + r).toFixed(1)}deg) scaleY(${s})`
            const s0 = (g.len / 100).toFixed(3)
            anim(teth, [{ transform: tf(s0, 0), opacity: 1 }, { transform: tf((g.len / 280).toFixed(3), g.side * 14), opacity: 1, offset: 0.45 }, { transform: tf(0, -g.side * 6), opacity: 0 }], { duration: 260 * slow, easing: "cubic-bezier(.2,.8,.3,1)" })
        }
        snd.cue("pop", e, { chain: st.chain - 1, anim: bodyAnim, impactOffset: 40 * slow })

        // -- the world: droplets, shockwave ring, glyph shards, one droplet stays hanging (finale material)
        const s = stage()
        if (!isLast) {
            if (s) s.burst("droplets", { x: g.x, y: g.y, n: R ? 3 : 10, dist: g.d * 0.95, ms: 470, gravity: 54, hue: 196 + (k1 % 4) * 28, anims: rt.anims })
            if (!R) {
                const ring = fxNodes("popRing")[st.ringRR++ % 2]
                if (ring) {
                    ring.style.setProperty("--rd", `${g.d}px`)
                    anim(ring, [{ transform: `translate(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px) scale(.6)`, opacity: 0.9 }, { transform: `translate(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px) scale(1.6)`, opacity: 0 }], { duration: 300, delay: 40, easing: "cubic-bezier(.1,.7,.3,1)", fill: "backwards" })
                }
                const chars = String(g.word || "").replace(/\s+/g, "").slice(0, 4).split("")
                const shards = fxNodes("popShard")
                chars.forEach((ch, j) => {
                    const sh = shards[st.shardRR++ % shards.length]
                    if (!sh) return
                    sh.setAttribute("data-c", ch)
                    const x0 = g.x + (j - (chars.length - 1) / 2) * 10
                    const dx = (j - (chars.length - 1) / 2) * 16 + (eosPilotRand(seed + k1 * 5 + j) - 0.5) * 14
                    anim(sh, [{ transform: `translate(${x0.toFixed(1)}px,${g.y.toFixed(1)}px) rotate(0deg) scale(1)`, opacity: 0.95 }, { transform: `translate(${(x0 + dx).toFixed(1)}px,${(g.y - 46 - j * 6).toFixed(1)}px) rotate(${(dx * 1.4).toFixed(0)}deg) scale(.7)`, opacity: 0 }], { duration: 600, delay: 40, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" })
                })
            }
            const hangs = fxNodes("popHang")
            const hn = hangs[st.hangRR++ % Math.max(1, hangs.length)]
            if (hn) {
                const hx = g.x + (eosPilotRand(seed + k1) - 0.5) * g.d * 0.4
                const hy = g.y + g.d * 0.18
                hn.style.transform = `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px)`
                hn.setAttribute("data-on", "1")
                if (!R) anim(hn, [{ transform: `translate(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px) scale(.3)`, opacity: 0 }, { transform: `translate(${hx.toFixed(1)}px,${(hy - 14).toFixed(1)}px) scale(1.1)`, opacity: 1, offset: 0.5 }, { transform: `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px) scale(1)`, opacity: 0.95 }], { duration: 520, delay: 40, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" })
                st.hang = st.hang.filter((x) => x && x.el !== hn).concat([{ el: hn, x: hx, y: hy }])
            }
        }
        st.last = { x: g.x, y: g.y, d: g.d }

        // -- the supporting cast: the two nearest bubbles swing on their tethers (pushed by the burst)
        if (!R && !isLast) {
            G.bubbles
                .filter((o) => o.i !== i && !goneRef.current[wr.off + o.i])
                .map((o) => ({ o, dd: Math.hypot(o.x - g.x, o.y - g.y) }))
                .sort((a, b) => a.dd - b.dd)
                .slice(0, 2)
                .forEach(({ o }, j) => {
                    const sw = hitsRef.current[o.i] && hitsRef.current[o.i].querySelector(".pbSwing")
                    const dir = o.x >= g.x ? 1 : -1
                    const amp = 6 - j * 2
                    anim(sw, [{ rotate: "0deg" }, { rotate: `${dir * amp}deg`, offset: 0.25 }, { rotate: `${-dir * amp * 0.45}deg`, offset: 0.55 }, { rotate: `${dir * amp * 0.15}deg`, offset: 0.8 }, { rotate: "0deg" }], { duration: 640, delay: 30 + 40 * j, easing: "ease-out" })
                })
        }

        // -- the hero: lurch away from the popped side, then the acting-pool reaction
        const h = hero()
        if (h && !isLast) {
            const dmin = geomRef.current.phone ? C.lay.phone.d0 : C.lay.desk.d0
            const dmax = geomRef.current.phone ? C.lay.phone.d1 : C.lay.desk.d1
            const sz = eosClamp(0.4 + (0.4 * (g.d - dmin)) / Math.max(1, dmax - dmin), 0.4, 0.8)
            h.emit("lurch", { dir: [g.x - G.hx, g.y - G.hy], s: sz })
            let act
            if (crossing) act = { face: "phew", motion: "phew" }
            else if (st.chain >= 5) act = { face: "giggle", motion: "laugh" }
            else if (st.chain >= 3) act = { face: "giggle", motion: (st.chainAlt++ % 2) ? "bounceTilt" : "bounce" }
            else act = eosPilotPick(C.acts, pickRef.current, seed + k1)
            const later = rt.timers.later
            if (act.motion === "phew") {
                h.react("phew", 450)
                h.look("camera")
                later(() => hero() && hero().look(null), 520)
            } else if (act.motion === "laugh") {
                h.react("giggle", 450)
                h.look("camera")
                h.celebrate([
                    { at: 120, part: "idle", slot: "hopI", keyframes: [{ transform: "none" }, { transform: "translateY(-11px) rotate(-3deg)", offset: 0.45 }, { transform: "none" }], opts: { duration: 380, easing: "cubic-bezier(.3,.7,.4,1)" } },
                    { at: 120, part: "footL", slot: "hopF", keyframes: [{ translate: "0 0" }, { translate: "0 -8px", offset: 0.4 }, { translate: "0 0" }], opts: { duration: 420, easing: "ease-out" } },
                ])
                snd.cue("laugh", e)
                snd.later("chirpB", 60, t)
                snd.later("chirpA", 120, t)
                snd.later("chirpC", 180, t)
                later(() => hero() && hero().look(null), 600)
            } else if (act.motion === "bounce" || act.motion === "bounceTilt") {
                h.react("giggle", 300)
                const tilt = act.motion === "bounceTilt" ? 4 : 0
                h.celebrate([{ at: 60, part: "idle", slot: "bounce", keyframes: [{ transform: "none" }, { transform: `translateY(-5px) rotate(${tilt}deg)`, offset: 0.3 }, { transform: "translateY(0)", offset: 0.55 }, { transform: `translateY(-3px) rotate(${-tilt}deg)`, offset: 0.78 }, { transform: "none" }], opts: { duration: 340, easing: "ease-out" } }])
                snd.cue("giggle", e)
                snd.later("chirpB", 60, t)
            } else if (act.motion === "spot") {
                h.react("brace", 400)
                h.look(el)
                later(() => hero() && hero().look(null), 520)
            } else if (act.motion === "shake") {
                h.react("wow", 300)
                h.look(el)
                h.celebrate([{ at: 330, part: "idle", slot: "shake", keyframes: [{ transform: "none" }, { transform: "rotate(4deg)", offset: 0.25 }, { transform: "rotate(-4deg)", offset: 0.5 }, { transform: "rotate(3deg)", offset: 0.75 }, { transform: "none" }], opts: { duration: 260, easing: "ease-in-out" } }])
                later(() => hero() && hero().look(null), 380)
            } else {
                h.react("wow", 260)
                h.look(el)
                later(() => hero() && hero().look("camera"), 300)
                later(() => hero() && hero().look(null), 640)
                h.celebrate([{ at: 300, part: "idle", slot: "glance", keyframes: [{ transform: "none" }, { transform: "translateY(-4px)", offset: 0.4 }, { transform: "none" }], opts: { duration: 300, easing: "ease-out" } }])
            }
            // 300-420: the feet re-plant wider, the pull eases; 420: a small exhale (sigh puff)
            later(() => {
                const hh = hero()
                if (!hh) return
                hh.setStance(k1 / N)
                hh.setTug(Math.max(0, (N - k1) / N))
            }, 300)
            later(() => hero() && phaseRef.current !== "finale" && hero().emit("exhale", { ms: 520, amp: 0.3 }), 430)
            snd.later("exhale", 420, t, { beat: "exhale" })
            if (crossing) {
                snd.later("step", 920, t, { beat: "step" })
                snd.later("step2", 1000, t, { beat: "step" })
            }
            // chain >= 3: a sparkle runs along the remaining tethers
            if (st.chain >= 3 && !R)
                G.bubbles.forEach((o, j) => {
                    if (goneRef.current[wr.off + o.i]) return
                    const gl = hitsRef.current[o.i] && hitsRef.current[o.i].querySelector(".pbTether > i")
                    anim(gl, [{ opacity: 0, transform: "translateY(0)" }, { opacity: 1, offset: 0.3 }, { opacity: 0, transform: "translateY(70px)" }], { duration: 480, delay: 60 * j, fill: "backwards" })
                })
            // one bubble left in the whole game: the anticipation gag ("you do it")
            if (N - k1 === 1)
                later(() => {
                    const hh = hero()
                    if (!hh || phaseRef.current !== "play") return
                    hh.look("camera")
                    hh.react("wow", 400)
                    later(() => hero() && hero().look(null), 420)
                }, 700)
        }

        // -- progress: explicit (G3), monotonic; the last pop reports 96 and 100 only arrives at the hand-off
        report(v)
        setK(k1)
        if (st.rbT) rt.timers.clear(st.rbT)
        st.rbT = 0
        if (isLast) {
            phaseRef.current = "finale"
            setPhase("finale")
            st.chainMax = Math.max(st.chainMax, st.chain)
            fin.start(e)
            try {
                if (arenaRef.current) arenaRef.current.setAttribute("data-pop-t0", String(Math.round(performance.timeOrigin + fin.t0())))
            } catch (x) {}
            return
        }
        if (waveLeft === 0) {
            // wave boundary: a no-live window; the next bunch drifts in from the right and the hero catches it
            phaseRef.current = "swap"
            setPhase("swap")
            rt.timers.later(() => {
                const nw = wr.wave + 1
                setLayout(eosPilotPopSlots((W.waves[nw] || []).length))
                setWave(nw)
            }, 380)
            rt.timers.later(() => {
                const hh = hero()
                if (hh) {
                    hh.pose("raise")
                    hh.react("wow", 300)
                    hh.setTug(Math.max(0.3, (N - k1) / N))
                }
                snd.later("catch", 0, performance.now(), { beat: "catch" })
            }, 380 + C.swapMs - 120)
            rt.timers.later(() => {
                phaseRef.current = "play"
                setPhase("play")
            }, 380 + C.swapMs)
            return
        }
        st.rbT = rt.timers.later(rebalance, C.rebalanceMs)
    }

    const gest = useEosPilotGesture({
        kind: "tap",
        anims: rt.anims,
        onDown: (e, info) => {
            shell.playInput()
            snd.warm()
            const i = Number(info.key)
            if (phaseRef.current !== "play" || goneRef.current[waveRef.current.off + i]) return snd.cue("early", e, { action: "early" })
            pop(i, e)
        },
    })
    React.useEffect(() => {
        try {
            eosExpose("pilotPop", { state: () => ({ k: st.k, N, wave: waveRef.current.wave, phase: phaseRef.current, chainMax: st.chainMax, hang: st.hang.length, perf: st.perf || [] }) })
        } catch (e) {}
    }, [])
    const near = useEosPilotNearHit(arenaRef, () => hitsRef.current.filter((el, i) => el && !goneRef.current[waveRef.current.off + i]), 28)
    const onArenaDown = (e) => {
        snd.warm()
        const t = e.target
        // the hit's own handler already ran for this event (it bubbles here): never handle it twice
        if (t && t.closest && t.closest(".eosPilotHit")) return
        if (fin.phase.current === "finale") return fin.tap(e)
        if (fin.phase.current !== "play") return
        shell.playInput()
        if (phaseRef.current !== "play") return snd.cue("early", e, { action: "early" })
        const hit = near(e)
        if (hit) return gest.route(e, hit.el)
        // a miss: never silent, never a fail. The hero shakes it off; the nearest lower bubble wobbles toward it.
        const G = geomRef.current
        const h = hero()
        snd.cue("miss", e, { action: "miss" })
        if (!G) return
        const A = arenaRef.current.getBoundingClientRect()
        const x = e.clientX - A.left
        st.miss++
        if (h) {
            h.emit("miss", { dir: [x - G.hx, 0], variant: st.miss % 2 ? "shake" : "tilt" })
            if (st.miss % 3 === 0) h.react("brace", 260)
        }
        const wr = waveRef.current
        let best = null
        G.bubbles.forEach((o) => {
            if (goneRef.current[wr.off + o.i]) return
            const sc = (o.row === 0 ? 0 : 1e4) + Math.abs(o.x - x)
            if (!best || sc < best.sc) best = { o, sc }
        })
        if (best && !red()) {
            const sw = hitsRef.current[best.o.i] && hitsRef.current[best.o.i].querySelector(".pbSwing")
            const dir = best.o.x > G.hx ? -1 : 1
            anim(sw, [{ rotate: "0deg" }, { rotate: `${dir * 5}deg`, offset: 0.35 }, { rotate: `${-dir * 2}deg`, offset: 0.7 }, { rotate: "0deg" }], { duration: 420, easing: "ease-out" })
        }
    }

    // ---------------------------------------------------------------- render
    const b = box
    const G = b ? eosPilotPopGeom(b, waveWords, layout, imgMode, raised, seed + wave * 31) : null
    geomRef.current = G
    if (G && st.lastX == null) st.lastX = G.hx
    let liveIdx = -1
    if (G && phase === "play") {
        let best = null
        G.bubbles.forEach((g) => {
            if (goneRef.current[off + g.i]) return
            const sc = (g.row === 0 ? 0 : 1e4) + Math.abs(g.x - st.lastX)
            if (!best || sc < best.sc) best = { i: g.i, sc }
        })
        liveIdx = best ? best.i : -1
    }
    const remaining = N - k
    const tugk = (0.45 + 0.55 * (remaining / Math.max(1, N))).toFixed(3)
    const heroProgress = phase === "finale" ? EOS_PILOT_FINAL_PCT : pctOf(k)
    hitsRef.current.length = waveWords.length
    return (
        <div
            ref={arenaRef}
            className="arena eosPilotArena eosPilotPop"
            data-eos-pilot-kit="sky"
            data-eos-pilot-reduced={reduced ? "1" : undefined}
            onPointerDown={onArenaDown}
            style={{ "--eos-pilot-word-px": `${wordPx}px` }}
        >
            {G ? (
                <EosPilotStage ref={stageRef} kit="sky" calm={Math.min(1, k / Math.max(1, N))} planeClassName={phase === "play" ? "popPlane" : "popPlane isLocked"}>
                    <div className="popWorld" style={{ "--tugk": tugk }}>
                        <i className="popRays" aria-hidden="true" style={{ left: `${G.sun.x.toFixed(0)}px`, top: `${G.sun.y.toFixed(0)}px` }} />
                        {G.bubbles.map((g) => {
                            const gone = !!goneRef.current[off + g.i]
                            const isLive = g.i === liveIdx
                            const ox = g.hx - (g.x - g.d / 2)
                            const oy = g.hy - (g.y - g.d / 2)
                            const r1 = eosPilotRand(seed + g.i * 3 + wave)
                            const img = imgMode ? userImgs[(off + g.i) % userImgs.length] : null
                            return (
                                <button
                                    key={`w${wave}-${g.i}`}
                                    ref={(n) => (hitsRef.current[g.i] = n)}
                                    className={`eosPilotHit popBub${gone ? " isGone" : ""}`}
                                    disabled={phase !== "play" || gone}
                                    data-live={isLive ? "1" : undefined}
                                    data-img={img ? "1" : undefined}
                                    aria-label={`Pop: ${g.word}`}
                                    style={{
                                        width: `${g.d}px`,
                                        height: `${g.d}px`,
                                        translate: `${(g.x - g.d / 2).toFixed(1)}px ${(g.y - g.d / 2).toFixed(1)}px`,
                                        "--ox": `${ox.toFixed(1)}px`,
                                        "--oy": `${oy.toFixed(1)}px`,
                                        "--sw": `${g.sw.toFixed(2)}deg`,
                                        "--sp": `${(2 + r1 * 1.4).toFixed(2)}s`,
                                        "--sd": `${(-r1 * 3).toFixed(2)}s`,
                                        "--tl": (g.len / 100).toFixed(3),
                                        "--tr": `${g.theta.toFixed(1)}deg`,
                                        "--rh": Math.round(r1 * 360),
                                    }}
                                    {...gest.bind(g.i)}
                                    {...eosPilotMarker(C.marker, isLive)}
                                >
                                    <span className="pbSway">
                                        <span className="pbSwing">
                                            <i className="pbTether">
                                                <i />
                                            </i>
                                            <span className="pbBody">
                                                {img ? <img className="pbImg" src={img} alt="" draggable={false} /> : null}
                                                <i className="pbRim" />
                                            </span>
                                            <span className="pbWord" {...EOS_PRIVATE_ATTRS}>
                                                <EosWord text={g.word} className="eosPilotWord" />
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    <div className="popGroup" ref={groupRef} style={{ left: `${G.gx.toFixed(1)}px`, top: `${G.gy.toFixed(1)}px`, width: `${G.G}px`, height: `${G.G}px` }}>
                        <i className="popFlare" style={{ "--fs": `${Math.round(G.px * 2.6)}px`, left: "50%", top: `${(G.G / 2 - G.px * 0.08).toFixed(1)}px` }} />
                        <i className="popCloud" style={{ width: `${G.cloudW}px`, height: `${G.cloudH}px`, left: `${((G.G - G.cloudW) / 2).toFixed(1)}px`, top: `${(G.G / 2 - G.px * 0.08 + G.px * 0.4).toFixed(1)}px` }} />
                        <EosPilotActor
                            ref={heroRef}
                            role="holder"
                            emotion={emotion}
                            size={G.phone ? C.lay.phone.hero : C.lay.desk.hero}
                            u={b.u}
                            progress={heroProgress}
                            reacts={C.reacts}
                            label={EOS_CHAR_NAMES[heroChar]}
                            showLabel={true}
                            seed={heroSeed}
                            className="popHero"
                            style={{ left: "50%", top: `${(G.G / 2 - G.px * 0.08).toFixed(1)}px` }}
                        />
                        <div className="popCalm" ref={calmRef} aria-hidden="true" data-eos-avoid="1" data-eos-char={heroChar} style={{ width: `${G.calmD}px`, height: `${G.calmD}px`, left: `${((G.G - G.calmD) / 2).toFixed(1)}px`, top: `${((G.G - G.calmD) / 2).toFixed(1)}px` }}>
                            <i className="film" />
                            <i className="rim" />
                            <i className="caustic" />
                            <i className="glint" />
                            <i className="flash" />
                        </div>
                    </div>
                    <div className="popFx" ref={fxRef} aria-hidden="true" {...EOS_PRIVATE_ATTRS}>
                        <i
                            className="popBeam"
                            style={{
                                left: `${G.sun.x.toFixed(1)}px`,
                                top: `${G.sun.y.toFixed(1)}px`,
                                width: `${Math.max(40, Math.hypot(G.hx - G.sun.x, G.cy - G.sun.y) - G.calmD * 0.42).toFixed(0)}px`,
                                "--ba": `${((Math.atan2(G.cy - G.sun.y, G.hx - G.sun.x) * 180) / Math.PI).toFixed(1)}deg`,
                            }}
                        />
                        <i className="popArch" style={{ "--ps": `${Math.round(Math.min(G.calmD * 1.9, G.w - 16))}px`, left: `${G.hx.toFixed(1)}px`, top: `${G.cy.toFixed(1)}px` }} />
                        <i className="popRing" />
                        <i className="popRing" />
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                            <i key={`s${j}`} className="popShard" />
                        ))}
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                            <i key={`h${j}`} className="popHang" style={{ "--hd": `${(-j * 0.37).toFixed(2)}s` }} />
                        ))}
                        <i className="popGlint" style={{ "--gh": 330 }} />
                        <i className="popGlint" style={{ "--gh": 45 }} />
                        <i className="popGlint" style={{ "--gh": 190 }} />
                    </div>
                </EosPilotStage>
            ) : null}
            {G ? <div className="popCount" data-n={`${C.verb} ${k} / ${N}`} aria-label={`${C.verb} ${k} of ${N}`} style={{ top: `${Math.round(G.top)}px` }} /> : null}
        </div>
    )
})
eosPilotRegister(1, EosPilotPopEngine, { name: "Balloon Morning", kit: "sky", role: "holder" })

const EOS_PILOT_POP_AR = `${EOS_A} .eosPilotPop`
const EOS_PILOT_POP_CSS = `
${EOS_PILOT_POP_AR} .popWorld{position:absolute;inset:0;z-index:1}
${EOS_PILOT_POP_AR} .popGroup{position:absolute;z-index:2;pointer-events:none}
${EOS_PILOT_POP_AR} .popFx{position:absolute;inset:0;z-index:3;pointer-events:none}
${EOS_PILOT_POP_AR} .popFx > i{position:absolute;left:0;top:0;display:block;font-style:normal;opacity:0;pointer-events:none}

/* sun rays (from 67%): static conic fan from the sun, opacity follows --calm */
${EOS_PILOT_POP_AR} .popRays{position:absolute;width:150vmax;height:150vmax;max-width:1500px;max-height:1500px;translate:-50% -50%;border-radius:50%;pointer-events:none;
  background:repeating-conic-gradient(from 100deg at 50% 50%,rgba(255,250,228,.22) 0deg 5deg,rgba(255,250,228,0) 5deg 15deg);
  -webkit-mask:radial-gradient(closest-side,#000 8%,rgba(0,0,0,.5) 40%,transparent 72%);mask:radial-gradient(closest-side,#000 8%,rgba(0,0,0,.5) 40%,transparent 72%);
  opacity:clamp(0,(var(--calm) - .6) * 2.4,.85);transition:opacity 1.2s ease}

/* ---- the bubbles: tethered soap film (faceless), iridescent rim, specular from the sun (upper-left), cool rim right */
${EOS_PILOT_POP_AR} .popBub{left:0;top:0;transition:translate .6s cubic-bezier(.34,1.3,.5,1)}
${EOS_PILOT_POP_AR} .popBub.isGone{pointer-events:none}
${EOS_PILOT_POP_AR} .pbSway,${EOS_PILOT_POP_AR} .pbSwing{position:absolute;inset:0;transform-origin:var(--ox) var(--oy);pointer-events:none}
${EOS_PILOT_POP_AR} .pbSway{--swk:1;animation:eosPilotPopSway var(--sp,2.6s) ease-in-out var(--sd,0s) infinite alternate}
${EOS_PILOT_POP_AR} .popBub[data-live="1"] .pbSway{--swk:1.45}
${EOS_PILOT_POP_AR} .popBub.isGone .pbSway{animation-play-state:paused}
/* the tether's anchor moves by translate with the SAME transition as the bubble, so during a re-balance glide
   (bubble P(t) + anchor o(t)) the string's end stays exactly on the hand */
${EOS_PILOT_POP_AR} .pbTether{position:absolute;left:0;top:0;translate:var(--ox) var(--oy);width:1.6px;height:100px;margin-left:-.8px;transform-origin:50% 0;
  transform:rotate(var(--tr)) scaleY(var(--tl));transition:transform .6s cubic-bezier(.34,1.3,.5,1),translate .6s cubic-bezier(.34,1.3,.5,1);overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.7) 60%,rgba(255,255,255,.55))}
${EOS_PILOT_POP_AR} .pbTether > i{position:absolute;left:-1px;right:-1px;top:0;height:30%;opacity:0;font-style:normal;background:linear-gradient(180deg,transparent,#fff 45%,#fffbe0 55%,transparent)}
${EOS_PILOT_POP_AR} .pbBody{position:absolute;inset:0;border-radius:50%;overflow:hidden;isolation:isolate;
  background:
    radial-gradient(circle at 31% 25%,rgba(255,255,255,.98) 0 3.5%,rgba(255,255,255,.55) 6%,rgba(255,255,255,0) 13%),
    radial-gradient(ellipse 22% 9% at 70% 80%,rgba(255,255,255,.55),rgba(255,255,255,0)),
    radial-gradient(circle at 50% 50%,rgba(255,255,255,.05) 56%,rgba(214,236,255,.2) 74%,rgba(255,255,255,.5) 96%),
    rgba(255,255,255,.06);
  box-shadow:inset calc(var(--eos-pilot-rim-dir,1) * -5px) -1px 9px -3px rgba(159,216,255,.95),inset 3px 3px 10px -4px rgba(255,244,218,.8),0 6px 18px -6px rgba(60,40,130,.18)}
${EOS_PILOT_POP_AR} .pbRim{position:absolute;inset:0;border-radius:50%;font-style:normal;opacity:.78;z-index:1;
  background:conic-gradient(from calc(var(--rh,0) * 1deg),#9EF0FF,#FFB8E6,#FFF2A8,#B8FFD9,#9EF0FF,#FFB8E6,#FFF2A8,#9EF0FF);
  -webkit-mask:radial-gradient(closest-side,transparent 82%,rgba(0,0,0,.55) 90%,#000 97%,transparent 100%);mask:radial-gradient(closest-side,transparent 82%,rgba(0,0,0,.55) 90%,#000 97%,transparent 100%);
  animation:eosPilotPopRim 8s linear infinite}
${EOS_PILOT_POP_AR} .popBub.isGone .pbRim{animation:none}
${EOS_PILOT_POP_AR} .pbImg{position:absolute;inset:6%;width:88%;height:88%;border-radius:50%;object-fit:cover;opacity:.92;pointer-events:none;-webkit-user-drag:none}
${EOS_PILOT_POP_AR} .pbWord{position:absolute;left:50%;top:50%;translate:-50% -50%;width:calc(100% - 14px);z-index:2;text-align:center;pointer-events:none;line-height:1.12}
${EOS_PILOT_POP_AR} .popBub[data-img="1"] .pbWord{top:calc(100% + 6px);translate:-50% 0;width:max-content;max-width:150px}
${EOS_PILOT_POP_AR} .pbWord .eosWord.eosPilotWord:is(*,.tsExactUserText){--eos-pilot-ink:#1E2A4A;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  text-shadow:0 0 1px #fff,0 0 2px #fff,0 0 6px rgba(255,255,255,.75)!important;overflow-wrap:anywhere}
${EOS_PILOT_POP_AR} .popBub.isGone :is(.pbBody,.pbWord,.pbTether){opacity:0}
${EOS_PILOT_POP_AR} .popBub:focus-visible::after{inset:-8px}

/* ---- the hero's world: cloud-top, flare, calm bubble */
${EOS_PILOT_POP_AR} .popCloud{position:absolute;display:block;font-style:normal;pointer-events:none;
  background:
    radial-gradient(26% 56% at 30% 52%,#fff 0 55%,rgba(255,255,255,0) 72%),
    radial-gradient(30% 70% at 52% 38%,#fff 0 55%,rgba(255,255,255,0) 72%),
    radial-gradient(24% 52% at 74% 54%,#fff 0 55%,rgba(255,255,255,0) 72%),
    radial-gradient(48% 42% at 50% 74%,#f1f4ff 0 60%,rgba(241,244,255,0) 74%)}
${EOS_PILOT_POP_AR} .popCloud::before{content:"";position:absolute;inset:0;border-radius:50%;
  background:radial-gradient(40% 30% at 34% 20%,rgba(255,240,205,.85),rgba(255,240,205,0) 70%)}
${EOS_PILOT_POP_AR} .popCloud::after{content:"";position:absolute;left:12%;right:12%;bottom:-6%;height:30%;border-radius:50%;
  background:radial-gradient(closest-side,rgba(120,110,190,.22),rgba(120,110,190,0))}
${EOS_PILOT_POP_AR} .popFlare{position:absolute;width:var(--fs);height:var(--fs);margin:calc(var(--fs) / -2) 0 0 calc(var(--fs) / -2);border-radius:50%;opacity:0;font-style:normal;
  background:radial-gradient(circle,rgba(255,252,236,.95),rgba(255,244,214,.55) 30%,rgba(255,244,214,0) 68%)}
${EOS_PILOT_POP_AR} .popHero{z-index:1}
${EOS_PILOT_POP_AR} .popHero .eosPilotActorName{color:#24204a;text-shadow:0 0 6px rgba(255,255,255,.9)}
${EOS_PILOT_POP_AR} .popCalm{position:absolute;z-index:2;border-radius:50%;overflow:hidden;opacity:0;isolation:isolate;
  box-shadow:0 0 0 1.5px rgba(255,255,255,.75),0 0 26px 4px rgba(200,236,255,.55),0 0 60px 10px rgba(255,244,214,.35)}
${EOS_PILOT_POP_AR} .popCalm[data-on="1"]{opacity:1}
${EOS_PILOT_POP_AR} .popCalm > i{position:absolute;inset:0;border-radius:50%;font-style:normal}
${EOS_PILOT_POP_AR} .popCalm > .film{background:
    radial-gradient(circle at 30% 22%,rgba(255,255,255,.95) 0 3%,rgba(255,255,255,.5) 6%,rgba(255,255,255,0) 14%),
    radial-gradient(ellipse 24% 8% at 66% 84%,rgba(255,255,255,.5),rgba(255,255,255,0)),
    radial-gradient(circle at 50% 50%,rgba(230,244,255,.1) 50%,rgba(200,232,255,.3) 78%,rgba(255,255,255,.7) 97%),
    linear-gradient(160deg,rgba(255,214,240,.16),rgba(190,240,255,.16) 50%,rgba(255,244,200,.14));
  box-shadow:inset -8px -2px 16px -6px rgba(159,216,255,.95),inset 6px 6px 18px -8px rgba(255,244,218,.95)}
${EOS_PILOT_POP_AR} .popCalm > .rim{background:conic-gradient(#7FE8FF,#FF9FDB,#FFE98A,#9DFFC8,#7FE8FF,#FF9FDB,#FFE98A,#7FE8FF);opacity:1;
  -webkit-mask:radial-gradient(closest-side,transparent 74%,rgba(0,0,0,.45) 85%,#000 95%,rgba(0,0,0,.8) 100%);mask:radial-gradient(closest-side,transparent 74%,rgba(0,0,0,.45) 85%,#000 95%,rgba(0,0,0,.8) 100%)}
${EOS_PILOT_POP_AR} .popCalm[data-on="1"] > .rim{animation:eosPilotPopRim 8s linear infinite}
${EOS_PILOT_POP_AR} .popCalm > .caustic{inset:-30% -60%;border-radius:0;opacity:0;
  background:linear-gradient(90deg,transparent 34%,rgba(255,120,150,.5) 40%,rgba(255,210,120,.55) 45%,rgba(250,250,150,.5) 49%,rgba(140,240,170,.5) 53%,rgba(120,200,255,.55) 57%,rgba(180,140,255,.5) 62%,transparent 68%)}
${EOS_PILOT_POP_AR} .popCalm > .glint{inset:-20% -40%;border-radius:0;opacity:0;background:linear-gradient(90deg,transparent 44%,rgba(255,255,255,.85) 50%,transparent 56%)}
${EOS_PILOT_POP_AR} .popCalm > .flash{opacity:0;background:radial-gradient(circle at 40% 36%,rgba(255,255,250,.98),rgba(255,246,214,.7) 55%,rgba(255,236,190,.2))}

/* ---- pooled pop fx (POP owns these; the kit's droplets pool is shared) */
${EOS_PILOT_POP_AR} .popRing{width:var(--rd,90px);height:var(--rd,90px);margin:calc(var(--rd,90px) / -2) 0 0 calc(var(--rd,90px) / -2);border-radius:50%;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.85),0 0 14px rgba(200,240,255,.55),inset 0 0 12px rgba(255,200,240,.35)}
${EOS_PILOT_POP_AR} .popShard{width:20px;height:22px;margin:-11px 0 0 -10px;text-align:center;font-size:16px;line-height:22px;font-weight:900;color:#2b2a66;
  text-shadow:0 0 2px #fff,0 0 6px rgba(255,255,255,.9)}
${EOS_PILOT_POP_AR} .popShard::after{content:attr(data-c)}
${EOS_PILOT_POP_AR} .popHang{width:10px;height:12px;margin:-6px 0 0 -5px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;transition:opacity .3s ease;
  background:radial-gradient(circle at 38% 30%,#fff,rgba(200,236,255,.95) 40%,rgba(150,205,255,.85) 75%);box-shadow:0 0 6px 1px rgba(255,255,255,.75)}
${EOS_PILOT_POP_AR} .popFx > .popHang[data-on="1"]{opacity:.95;animation:eosPilotPopHang 2.4s ease-in-out var(--hd,0s) infinite alternate}
${EOS_PILOT_POP_AR} .popFx > .popHang[data-freeze="1"]{animation-play-state:paused;box-shadow:0 0 10px 3px rgba(255,250,220,.95)}
${EOS_PILOT_POP_AR} .popGlint{width:18px;height:18px;margin:-9px 0 0 -9px;
  background:radial-gradient(circle,#fff 0 14%,rgba(255,255,255,0) 26%),
    linear-gradient(90deg,transparent 44%,hsla(var(--gh,40),100%,88%,.95) 50%,transparent 56%),linear-gradient(0deg,transparent 44%,hsla(var(--gh,40),100%,88%,.95) 50%,transparent 56%)}
${EOS_PILOT_POP_AR} .popBeam{height:30px;margin-top:-15px;transform-origin:0 50%;transform:rotate(var(--ba));
  background:linear-gradient(90deg,rgba(255,246,214,0),rgba(255,244,210,.55) 40%,rgba(255,255,248,.95));
  -webkit-mask:linear-gradient(180deg,transparent,#000 40%,#000 60%,transparent);mask:linear-gradient(180deg,transparent,#000 40%,#000 60%,transparent)}
${EOS_PILOT_POP_AR} .popFx > .popBeam[data-on="1"]{opacity:.7;transition:opacity .6s ease}
/* the sunlight refracted by the calm bubble: a small rainbow arching over the hero's bubble (upper half only) */
${EOS_PILOT_POP_AR} .popArch{width:var(--ps);height:var(--ps);margin:calc(var(--ps) / -2) 0 0 calc(var(--ps) / -2);border-radius:50%;transform-origin:50% 50%;
  background:radial-gradient(closest-side,transparent 70%,rgba(255,96,128,.75) 73%,rgba(255,160,80,.75) 77%,rgba(255,232,110,.75) 81%,rgba(120,226,140,.72) 85%,rgba(100,180,255,.72) 89%,rgba(160,120,255,.7) 93%,transparent 97%);
  -webkit-mask:linear-gradient(180deg,#000 40%,rgba(0,0,0,.5) 50%,transparent 58%);mask:linear-gradient(180deg,#000 40%,rgba(0,0,0,.5) 50%,transparent 58%)}
${EOS_PILOT_POP_AR} .popFx > .popArch[data-on="1"]{opacity:1}

/* ---- the counter pill (text as an attribute: no characterData mutation per hit) */
${EOS_PILOT_POP_AR} .popCount{position:absolute;left:10px;z-index:6;padding:5px 9px;border-radius:999px;pointer-events:none;
  background:rgba(255,255,255,.62);box-shadow:0 2px 10px rgba(40,30,90,.16),inset 0 0 0 1px rgba(255,255,255,.8);
  color:#24204a;font-size:13px;line-height:16px;font-weight:900;letter-spacing:.04em;white-space:nowrap}
${EOS_PILOT_POP_AR} .popCount::after{content:attr(data-n)}

@keyframes eosPilotPopSway{from{rotate:calc(var(--sw) * var(--tugk,1) * var(--swk,1) * -1)}to{rotate:calc(var(--sw) * var(--tugk,1) * var(--swk,1))}}
@keyframes eosPilotPopRim{to{rotate:360deg}}
@keyframes eosPilotPopHang{from{translate:0 -3px}to{translate:0 3px}}
@media (prefers-reduced-motion: reduce){${EOS_PILOT_POP_AR} .popBub{transition:none}${EOS_PILOT_POP_AR} .pbTether{transition:none}}
${EOS_A}[data-eos-calm="1"] .eosPilotPop :is(.popBub,.pbTether),${EOS_PILOT_POP_AR}[data-eos-pilot-reduced="1"] :is(.popBub,.pbTether){transition:none}
`
eosCss("pilot-pop", EOS_PILOT_POP_CSS)
