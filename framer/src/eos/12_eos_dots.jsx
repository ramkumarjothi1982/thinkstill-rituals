// ===================================================================================
// EOS · 12 DOTS — the Still Point and the Thought Dust (docs/EOS_SPEC.md §5.1-§5.5, §0.4 pacer rendering,
// §2.1 home screen, §9.2 cosmetic dust styles). Task `dots`. Public: EosThoughtFlow, EOS_DOTS_CSS.
//
// Story: every background dot is a loose thought. ALL of them (the flow lanes, the Pixar motes, every game's
// cinema dust, 109's star tiles; the big bokeh drifts a quarter of the way) travel into ONE measured centre —
// the Still Point — which breathes with the shared pacer (core EOS_PACER: 4 s in / 6 s out, or whoever owns the
// breath). Their speed mirrors how loud the feeling is and slows as the game's progress rises; at the finish the
// dust GATHERS and the core BLOOMS; in the reveal it bursts outward once and drifts home slowly.
//
// Mount (integration I1-E2): the FIRST child of section.releaseStage:
//     <EosThoughtFlow stage={stage} reduced={!!reduced} />
// API: eosApi("dots").pulse?.("in"|"out") · breath(phase, ms) · phase() · beat(bpm) · setLevel(n|null) · gather()
//      · state() (dev/test read-out: stage, level, rate, mode, calm, dust, pacer, centre, audio …)
//
// Performance: the lanes animate only `scale` / `rotate` / `opacity` (compositor); the 14 Pixar motes and ≤14
// cinema dots animate `left/top` on tiny absolutely positioned nodes (spec §5.3). No React re-render is needed for
// any per-frame or per-progress change: a 4 Hz controller pass, run inside requestAnimationFrame so its reads share
// the frame's own style/layout work, writes CSS variables / attributes / playbackRate only when they change.
// Every timer, frame request, observer, listener and audio node is released on unmount.
// ===================================================================================

const EOS_DOTS_HUES = [195, 265, 42, 320] //       default palette (cyan, violet, gold, pink)
const EOS_DOTS_STYLES = ["default", "fireflies", "aurora", "snow", "gold"] // §9.2 cosmetic styles (eos_prefs_v1.dust)
const EOS_DOTS_CX = 50 //                           nominal Still Point (% of the stage) — the measured one wins
const EOS_DOTS_CY = 52
const EOS_DOTS_CALM_HUE = 190 //                    the hue every feeling slides toward as progress rises
const EOS_DOTS_LIVE = { ctl: null } //              the mounted controller (one stage at a time)
const EOS_DOTS_BED_MAX = 0.024 //                   audio bed peak gain (spec: ≤ .03)

// Lane specs: an even angular spread with jitter, on a ring 40-56 % from the centre, seeded (stable per index).
function eosDotsLaneSpecs(n) {
    const out = []
    const PHI = 0.6180339887
    for (let i = 0; i < n; i++) {
        const a = (i / n + (eosNoise(i, 1) - 0.5) * (0.8 / n)) * Math.PI * 2
        const r = 0.4 + eosNoise(i, 2) * 0.16
        const d = 14 + eosNoise(i, 4) * 8 // 14-22 s
        out.push({
            a,
            x: EOS_DOTS_CX + Math.cos(a) * r * 100,
            y: EOS_DOTS_CY + Math.sin(a) * r * 92,
            s: 2 + eosNoise(i, 3) * 4, //                         2-6 px
            d,
            dl: -(((i * PHI) % 1) * d + eosNoise(i, 5) * 0.6), //  spread phases so the field is always full
            sw: (i % 2 ? 1 : -1) * (25 + eosNoise(i, 6) * 15), // ±25-40° spiral, alternating
            k: i % 4,
            ks: 0.3 + eosNoise(i, 8) * 0.62, //                     static scale for the calm field
            bk: 1.7 + eosNoise(i, 9) * 2.3, //                      fireflies blink / jitter period (s)
        })
    }
    return out
}

// Brown noise, low-passed, with a crossfaded loop seam (no click). Cached per sample rate.
const EOS_DOTS_NOISE = { rate: 0, buf: null }
function eosDotsNoiseBuffer(ctx) {
    if (EOS_DOTS_NOISE.buf && EOS_DOTS_NOISE.rate === ctx.sampleRate) return EOS_DOTS_NOISE.buf
    const sr = ctx.sampleRate
    const N = Math.round(sr * 8)
    const F = Math.round(sr * 0.5)
    const x = new Float32Array(N + F)
    let last = 0
    let lp = 0
    const a = 1 - Math.exp((-2 * Math.PI * 320) / sr) // one-pole low-pass ≈ 320 Hz
    let peak = 0
    for (let i = 0; i < N + F; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
        lp += a * (last - lp)
        x[i] = lp
        if (Math.abs(lp) > peak) peak = Math.abs(lp)
    }
    const buf = ctx.createBuffer(1, N, sr)
    const y = buf.getChannelData(0)
    const k = peak ? 0.9 / peak : 1
    for (let i = 0; i < N; i++) {
        const v = i < F ? x[i] * (i / F) + x[N + i] * (1 - i / F) : x[i]
        y[i] = v * k
    }
    EOS_DOTS_NOISE.rate = sr
    EOS_DOTS_NOISE.buf = buf
    return buf
}

// The imperative half of the flow: one per mounted EosThoughtFlow. Owns every timer / observer / listener.
function eosDotsController(root, opts = {}) {
    const S = {
        alive: true,
        stage: "input",
        calm: false,
        levelOv: null, //   live dial value (setLevel) …
        levelPhase: null, // … valid while the store phase and the stage are unchanged
        levelStage: null,
        pulseK: 1,
        pulseT: 0,
        gathered: false,
        gatherBoostUntil: 0,
        burstUntil: 0,
        burstT: 0,
        flowInT: 0,
        progress: 0,
        rate: 1,
        dust: "default",
        pacer: "",
        phase: "",
        centre: null,
        vars: new Map(),
        narrow: null,
        aspect: 0,
        calmHosts: [],
        measureTs: [],
        rateKey: "",
        rateSeen: null,
        ticks: 0,
        needSync: 3, //      re-assert the breath clock for the next N ticks (animations re-created)
        perf: { frameN: 0, frameMs: 0, frameMax: 0 },
        raf: 0,
        gatherSrc: "",
        gatherT: 0,
        pendingBurst: false,
        pendingGather: false,
        bed: { on: false, armed: false, ctx: null, src: null, gain: null, stopT: 0, gainNow: 0 },
    }
    const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now())
    const canAnim = typeof Element !== "undefined" && typeof Element.prototype.getAnimations === "function"
    const raf = typeof requestAnimationFrame === "function" ? (f) => requestAnimationFrame(f) : (f) => setTimeout(f, 16)
    const caf = typeof cancelAnimationFrame === "function" ? (id) => cancelAnimationFrame(id) : (id) => clearTimeout(id)
    const stageEl = () => (root && (root.closest(".releaseStage") || root.parentElement)) || null
    const pxRoot = () => (root && root.closest(".tsPixarRoot")) || null
    const arcadeEl = () => (root && root.closest(".tsArcade")) || null
    const core = () => root.querySelector(".eosCore")
    const body = () => root.querySelector(".eosCoreBody")
    const lanes = () => Array.from(root.querySelectorAll(":scope > .eosLane"))
    const anims = (el) => {
        try {
            return el && el.getAnimations ? el.getAnimations() : []
        } catch {
            return []
        }
    }
    const setVar = (el, k, v) => {
        if (!el) return
        const key = el === root ? k : null
        if (key && S.vars.get(key) === v) return
        try {
            el.style.setProperty(k, v)
        } catch {}
        if (key) S.vars.set(key, v)
    }

    // ---------------------------------------------------------------- level → rate (C2)
    const level = () => {
        const st = EOS_STORE.get()
        if (S.levelOv != null) {
            if (S.levelPhase === st.phase && S.levelStage === S.stage) return S.levelOv
            S.levelOv = null
        }
        if (S.stage === "reveal" && st.after != null) return Number(st.after)
        const v = st.before != null ? st.before : st.intensityGuess != null ? st.intensityGuess : 5
        return eosClamp(Number(v), 0, 10)
    }
    const spark = () => root.getAttribute("data-eos-mode") === "spark"
    const rate = () => {
        const L = level()
        let pTerm = S.progress / 100
        if (S.stage === "reveal") pTerm = S.levelOv != null ? 0.4 : 1
        let r = 0.7 + 0.09 * L * (1 - pTerm)
        if (spark()) r *= 1.8 //                    numb / good: lanes ≈ 8-12 s (up-regulation)
        if (S.dust === "snow") r *= 0.8 //          snow falls slower (cosmetic)
        if (S.stage === "reveal") r *= 0.6 //       reveal: ≈ 30 s lanes, still converging
        return r
    }
    const setRate = (a, r) => {
        try {
            if (Math.abs((Number(a.playbackRate) || 0) - r) < 0.004) return
            if (r < 0) {
                // reversing (pulse "out") an infinite CSS animation that was created a moment ago would run it past
                // time 0 and FINISH it (the dot would freeze). Jump whole iterations ahead first: same frame on screen.
                const D = Number(a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0) || 0
                const ct = Number(a.currentTime) || 0
                if (D > 0 && ct < 3 * D) a.currentTime = ct + 4 * D
            }
            if (a.updatePlaybackRate && Math.sign(a.playbackRate) === Math.sign(r)) a.updatePlaybackRate(r)
            else a.playbackRate = r
        } catch {}
    }
    const dustEls = () => {
        const out = []
        const px = pxRoot()
        if (px) px.querySelectorAll(".tsPxRig .tsPxDust").forEach((e) => out.push(e))
        const st = stageEl()
        if (st) st.querySelectorAll(".cinemaDust i").forEach((e) => out.push(e))
        return out
    }
    // Rates are pushed only when the target changes or an element is new (getAnimations() flushes style, so
    // calling it on ~60 nodes every tick would cost main-thread time for nothing). force = animations were
    // re-created (gather / burst / stage / calm / lanes re-rendered).
    const applyRates = (force) => {
        if (!S.alive || !canAnim) return
        const t = now()
        const base = rate()
        S.rate = +base.toFixed(3)
        if (S.calm) return
        const r = base * S.pulseK
        const rd = r * (t < S.gatherBoostUntil ? 2.6 : 1)
        const lanesOn = t >= S.burstUntil && !S.gathered
        const key = `${r.toFixed(3)}|${rd.toFixed(3)}|${lanesOn ? 1 : 0}`
        if (force || key !== S.rateKey || !S.rateSeen) {
            S.rateKey = key
            S.rateSeen = new WeakSet()
        }
        const seen = S.rateSeen
        const todo = [] // read every animation first, then write (one style flush, not one per node)
        if (lanesOn)
            for (const lane of lanes()) {
                if (seen.has(lane)) continue
                seen.add(lane)
                for (const a of anims(lane)) if (a.animationName === "eosDotsLane") todo.push([a, r])
            }
        for (const el of dustEls()) {
            if (seen.has(el)) continue
            seen.add(el)
            for (const a of anims(el)) if (a.animationName === "eosDotsX" || a.animationName === "eosDotsY" || a.animationName === "eosDotsFade") todo.push([a, rd])
        }
        for (const [a, v] of todo) setRate(a, v)
    }

    // ---------------------------------------------------------------- one measured centre (C1)
    const pctIn = (box, cx, cy) => {
        // box = {left, top, w, h} in viewport px (padding box)
        if (!box || box.w < 1 || box.h < 1) return null
        return [((cx - box.left) / box.w) * 100, ((cy - box.top) / box.h) * 100]
    }
    const padBox = (el) => {
        const r = el.getBoundingClientRect()
        const k = el.offsetWidth ? r.width / el.offsetWidth || 1 : 1
        return { left: r.left + (el.clientLeft || 0) * k, top: r.top + (el.clientTop || 0) * k, w: (el.clientWidth || el.offsetWidth) * k, h: (el.clientHeight || el.offsetHeight) * k }
    }
    const borderBox = (el) => {
        const r = el.getBoundingClientRect()
        return { left: r.left, top: r.top, w: r.width, h: r.height }
    }
    const measure = () => {
        if (!S.alive || !root.isConnected) return
        const c = core()
        if (!c) return
        // ---- reads
        const cr = c.getBoundingClientRect()
        if (cr.width < 1) return
        const cx = cr.left + cr.width / 2
        const cy = cr.top + cr.height / 2
        S.centre = { x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10 }
        const writes = []
        const rootBox = padBox(root)
        writes.push([root, pctIn(rootBox, cx, cy)])
        const px = pxRoot()
        const rig = px ? px.querySelector(".tsPxRig") : null
        let rigPct = null
        if (rig) {
            rigPct = pctIn(padBox(rig), cx, cy)
            writes.push([rig, rigPct])
        }
        const st = stageEl()
        if (st) {
            st.querySelectorAll(".cinemaDust").forEach((dust) => {
                let cb = null
                for (const i of dust.children) {
                    if (i.offsetParent) {
                        cb = i.offsetParent
                        break
                    }
                }
                writes.push([dust, pctIn(padBox(cb || dust), cx, cy)])
            })
            st.querySelectorAll(".cleanseSpace").forEach((sp) => writes.push([sp, pctIn(borderBox(sp), cx, cy)]))
        }
        // lane tails point away from the centre (needs the stage's px aspect)
        const aspect = rootBox.h ? +(rootBox.w / rootBox.h).toFixed(3) : 0
        const narrow = rootBox.w > 0 && rootBox.w < 600
        // ---- writes
        for (const [el, p] of writes) {
            if (!p) continue
            setVarAny(el, "--eos-cx", `${p[0].toFixed(2)}%`)
            setVarAny(el, "--eos-cy", `${p[1].toFixed(2)}%`)
        }
        if (aspect && aspect !== S.aspect) {
            S.aspect = aspect
            const ox = EOS_DOTS_CX
            const oy = EOS_DOTS_CY
            lanes().forEach((lane) => {
                const x = parseFloat(lane.style.getPropertyValue("--x"))
                const y = parseFloat(lane.style.getPropertyValue("--y"))
                if (!Number.isFinite(x) || !Number.isFinite(y)) return
                const ang = (Math.atan2((y - oy) * rootBox.h, (x - ox) * rootBox.w) * 180) / Math.PI
                lane.style.setProperty("--ta", `${ang.toFixed(1)}deg`)
            })
        }
        if (narrow !== S.narrow) {
            S.narrow = narrow
            try {
                opts.onNarrow?.(narrow)
            } catch {}
        }
        // bokeh: a quarter of the way home, gliding over 60 s (C3). Not in calm visuals.
        if (rig && rigPct) {
            rig.querySelectorAll(".tsPxBokeh").forEach((b) => {
                if (S.calm) {
                    if (b.style.getPropertyValue("--eos-bl")) {
                        b.style.removeProperty("--eos-bl")
                        b.style.removeProperty("--eos-bt")
                    }
                    return
                }
                const l = parseFloat(b.style.left)
                const t = parseFloat(b.style.top)
                if (!Number.isFinite(l) || !Number.isFinite(t)) return
                setVarAny(b, "--eos-bl", `${(l + (rigPct[0] - l) * 0.25).toFixed(2)}%`)
                setVarAny(b, "--eos-bt", `${(t + (rigPct[1] - t) * 0.25).toFixed(2)}%`)
            })
        }
    }
    const setVarAny = (el, k, v) => {
        if (el === root) return setVar(root, k, v)
        try {
            if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v)
        } catch {}
    }
    const measureSoon = () => {
        S.measureTs.forEach(clearTimeout)
        S.measureTs = [40, 260, 700, 1500].map((ms) => setTimeout(() => schedule({ measure: true, force: true }), ms))
    }

    // ---------------------------------------------------------------- the pacer, rendered (B4)
    const resyncBreath = () => {
        const b = body()
        if (!b) return
        if (!canAnim) {
            // no Web Animations: the spec's negative-delay sync against the shared performance.now() clock
            const cyc = (EOS_BREATH.coreIn + EOS_BREATH.coreOut) * 1000
            b.style.animationDelay = `${-(now() % cyc)}ms`
            return
        }
        for (const a of anims(b)) {
            if (a.animationName !== "eosDotsBreathe" && a.animationName !== "eosDotsBeat") continue
            // startTime 0 on the document timeline ⇒ iteration progress = (t mod duration) = the pacer clock
            try {
                if (a.startTime !== 0 && a.playbackRate === 1) a.startTime = 0
            } catch {}
        }
    }
    const pacerRender = () => {
        if (!S.alive) return
        const c = core()
        const b = body()
        if (!c || !b) return
        const ph = eosBreathPhase()
        const mode = ph.bpm ? "beat" : ph.owned ? "own" : "auto"
        const phase = mode === "beat" ? "beat" : ph.phase
        if (mode !== S.pacer) {
            const prev = S.pacer
            if (mode === "own" && prev && !S.calm && !S.gathered) {
                // hand over from the CSS breath to the owner's phase without a jump: freeze the live scale first
                let cs = null
                try {
                    cs = getComputedStyle(b)
                } catch {}
                const sc = cs && cs.scale && cs.scale !== "none" ? cs.scale : "1"
                const op = cs ? cs.opacity : "1"
                b.style.transition = "none"
                b.style.scale = sc
                b.style.opacity = op
                c.setAttribute("data-pacer", mode)
                c.setAttribute("data-phase", phase)
                void getComputedStyle(b).scale // commit the frozen value (style only, no layout)
                b.style.transition = ""
                b.style.scale = ""
                b.style.opacity = ""
            } else {
                c.setAttribute("data-pacer", mode)
                c.setAttribute("data-phase", phase)
            }
            S.pacer = mode
            S.phase = phase
            if (mode === "beat") c.style.setProperty("--eos-beat-ms", `${Math.round(ph.ms)}ms`)
            if (mode !== "own") {
                resyncBreath()
                S.needSync = 3
            }
        }
        if (phase !== S.phase || mode === "own") {
            if (mode === "own") c.style.setProperty("--eos-breath-ms", `${Math.max(120, Math.round(ph.ms || 0))}ms`)
            if (phase !== S.phase) c.setAttribute("data-phase", phase)
            S.phase = phase
        }
        if (mode === "beat") setVarAny(c, "--eos-beat-ms", `${Math.round(ph.ms)}ms`)
    }

    // ---------------------------------------------------------------- gather / bloom / burst
    const gather = (src = "auto") => {
        if (!S.alive || S.gathered) return
        S.gathered = true
        S.gatherSrc = src
        clearTimeout(S.gatherT)
        // an API gather (a game's big moment) is one-shot: the dust re-flows unless the game has just finished
        if (src === "api") S.gatherT = setTimeout(() => S.gathered && S.gatherSrc === "api" && ungather(true), 1700)
        if (!S.calm && canAnim) {
            // freeze each lane where it is, then rush it home from there (no snap back to the rim)
            const ls = lanes()
            const vals = ls.map((l) => {
                try {
                    const cs = getComputedStyle(l)
                    const sc = cs.scale && cs.scale !== "none" ? cs.scale.split(" ")[0] : "1"
                    const ro = cs.rotate && cs.rotate !== "none" ? cs.rotate.split(" ").pop() : "0deg"
                    return [sc, /deg|rad|turn/.test(ro) ? ro : `${parseFloat(ro) || 0}deg`, cs.opacity]
                } catch {
                    return ["1", "0deg", "1"]
                }
            })
            ls.forEach((l, i) => {
                l.style.setProperty("--g0s", vals[i][0])
                l.style.setProperty("--g0r", vals[i][1])
                l.style.setProperty("--g0o", String(Math.max(0.35, Number(vals[i][2]) || 0)))
            })
            S.gatherBoostUntil = now() + 900
            setTimeout(() => schedule(), 920)
        }
        // calm visuals: no rush, no bloom — the core only brightens softly (opacity cross-fade)
        root.classList.add(S.calm ? "eosGatherCalm" : "eosGather")
        applyRates()
    }
    const ungather = (fade) => {
        if (!S.gathered) return
        S.gathered = false
        S.gatherSrc = ""
        clearTimeout(S.gatherT)
        root.classList.remove("eosGather", "eosGatherCalm")
        S.needSync = 3
        schedule({ force: true })
        if (fade && !S.calm) {
            root.classList.add("eosFlowIn")
            clearTimeout(S.flowInT)
            S.flowInT = setTimeout(() => root.classList.remove("eosFlowIn"), 1400)
        }
    }
    const burst = () => {
        if (!S.alive || S.calm) return
        root.classList.add("eosBurst")
        clearTimeout(S.burstT)
        S.burstT = setTimeout(() => root.classList.remove("eosBurst"), 1100)
        if (!canAnim) return
        const T = 900
        S.burstUntil = now() + T + 40
        lanes().forEach((lane, i) => {
            const a = anims(lane).find((x) => x.animationName === "eosDotsLane")
            if (!a || !a.effect || !a.effect.getTiming) return
            try {
                const tm = a.effect.getTiming()
                const D = Number(tm.duration) || 18000
                const delay = Number(tm.delay) || 0
                const p0 = 0.985
                const p1 = 0.16 + eosNoise(i, 11) * 0.52
                a.currentTime = (4 + p0) * D + delay
                a.playbackRate = -((p0 - p1) * D) / T
            } catch {}
        })
        setTimeout(() => {
            S.burstUntil = 0
            schedule({ force: true })
        }, T + 60)
    }

    // ---------------------------------------------------------------- pulse (games: inhale / big success)
    const pulse = (kind) => {
        if (!S.alive || S.calm) return
        const out = kind === "out"
        root.classList.remove("eosPulseIn", "eosPulseOut")
        raf(() => S.alive && root.classList.add(out ? "eosPulseOut" : "eosPulseIn")) // re-add next frame = restart, no reflow
        S.pulseK = out ? -1 : 3
        schedule()
        clearTimeout(S.pulseT)
        S.pulseT = setTimeout(() => {
            S.pulseK = 1
            root.classList.remove("eosPulseIn", "eosPulseOut")
            schedule()
        }, 1200)
    }

    // ---------------------------------------------------------------- audio bed (F8, P2)
    const bedWant = () => {
        const st = EOS_STORE.get()
        const hidden = typeof document !== "undefined" && document.hidden
        // §5.2: during the check-in (the EOS home screen, not the classic "just let me play" composer) and play;
        // silent in the reveal, while the arcade's music plays, with sound off, or in a background tab
        const where = S.stage === "play" || (S.stage === "input" && st.phase === "checkin" && st.checkinEnabled !== false)
        return S.alive && S.bed.armed && !hidden && where && !!st.sound && !st.music
    }
    const bedStart = () => {
        const B = S.bed
        clearTimeout(B.stopT)
        if (B.on) return
        const ctx = eosAudio()
        if (!ctx) return
        try {
            const src = ctx.createBufferSource()
            src.buffer = eosDotsNoiseBuffer(ctx)
            src.loop = true
            const g = ctx.createGain()
            g.gain.setValueAtTime(0.0001, ctx.currentTime)
            src.connect(g)
            g.connect(ctx.destination)
            src.start()
            Object.assign(B, { on: true, ctx, src, gain: g, gainNow: 0 })
        } catch {}
    }
    const bedStop = (fadeMs = 900) => {
        const B = S.bed
        if (!B.on) return
        const { ctx, src, gain } = B
        B.on = false
        B.gainNow = 0
        try {
            gain.gain.cancelScheduledValues(ctx.currentTime)
            gain.gain.setTargetAtTime(0.0001, ctx.currentTime, Math.max(0.02, fadeMs / 4000))
        } catch {}
        clearTimeout(B.stopT)
        const kill = () => {
            try {
                src.stop()
            } catch {}
            try {
                src.disconnect()
                gain.disconnect()
            } catch {}
        }
        if (fadeMs <= 0) kill()
        else B.stopT = setTimeout(kill, fadeMs + 60)
    }
    const bedUpdate = () => {
        if (!bedWant()) return bedStop()
        bedStart()
        const B = S.bed
        if (!B.on) return
        const ph = eosBreathPhase()
        const p = eosClamp(ph.p, 0, 1)
        const shape = ph.phase === "in" ? 0.5 - 0.5 * Math.cos(Math.PI * p) : ph.phase === "hold" ? 1 : ph.phase === "out" ? 1 - p : ph.phase === "beat" ? 0.55 : 0.5
        const target = Math.min(EOS_DOTS_BED_MAX, 0.006 + 0.018 * shape)
        B.gainNow = +target.toFixed(4)
        try {
            B.gain.gain.setTargetAtTime(target, B.ctx.currentTime, 0.12)
        } catch {}
    }
    const arm = () => {
        S.bed.armed = true
        unarm()
        bedUpdate()
    }
    const unarm = () => {
        if (typeof window === "undefined") return
        window.removeEventListener("pointerdown", arm, true)
        window.removeEventListener("keydown", arm, true)
        window.removeEventListener("touchstart", arm, true)
    }
    if (typeof window !== "undefined") {
        window.addEventListener("pointerdown", arm, true)
        window.addEventListener("keydown", arm, true)
        window.addEventListener("touchstart", arm, { capture: true, passive: true })
    }
    const onVis = () => bedUpdate()
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis)

    // ---------------------------------------------------------------- the 4 Hz loop
    const tick = (force) => {
        if (!S.alive || !root.isConnected) return
        const st = EOS_STORE.get()
        const sEl = stageEl()
        let p = 0
        if (S.stage === "play") {
            const v = sEl ? eosProgressOf(sEl) : null
            p = v == null ? 0 : eosClamp(v, 0, 100)
            const done = !!(sEl && sEl.querySelector(".globalPlayGuide.isComplete"))
            if (done && !S.gathered) gather("auto")
            else if (done && S.gatherSrc === "api") S.gatherSrc = "auto" // the finish arrived during a one-shot
            else if (!done && S.gathered && S.gatherSrc === "auto" && p < 100) ungather(true) // a new round began
        } else if (S.stage === "reveal") p = 100
        S.progress = p
        setVar(root, "--eos-p", (p / 100).toFixed(3))
        const emo = st.emotion || st.detected
        const h0 = (EOS_EMO[emo] || EOS_GUIDE_CHAR).hue
        setVar(root, "--eos-h", String(Math.round(h0 + (EOS_DOTS_CALM_HUE - h0) * (p / 100))))
        const L = level()
        const jitter = !S.calm && L >= 7 && S.stage !== "reveal" && !S.gathered && S.progress < 50
        if (root.classList.contains("eosJitter") !== jitter) root.classList.toggle("eosJitter", jitter)
        let dust = "default"
        try {
            const d = eosPrefs().dust
            if (EOS_DOTS_STYLES.includes(d)) dust = d
        } catch {}
        if (dust !== S.dust || root.getAttribute("data-eos-dust") !== dust) {
            S.dust = dust
            root.setAttribute("data-eos-dust", dust)
        }
        S.ticks++
        applyRates(force || S.ticks % 16 === 0) // every 4 s: safety net for animations re-created behind our back
        pacerRender()
        if (S.pacer !== "own" && (S.needSync > 0 || S.ticks % 8 === 0)) {
            resyncBreath()
            if (S.needSync > 0) S.needSync--
        }
        bedUpdate()
    }

    // ---------------------------------------------------------------- frame-scheduled work
    // Everything that reads layout or animations runs inside requestAnimationFrame, so it shares the frame's own
    // style + layout pass instead of forcing an extra flush from a timer task (no long tasks from the dots).
    const want = { measure: false, force: false }
    const frame = () => {
        S.raf = 0
        if (!S.alive || !root.isConnected) return
        const t0 = now()
        const m = want.measure
        const f = want.force
        want.measure = want.force = false
        if (m) measure()
        if (S.pendingBurst) {
            S.pendingBurst = false
            burst()
        }
        if (S.pendingGather) {
            S.pendingGather = false
            gather("api")
        }
        tick(f)
        const dt = now() - t0
        const P = S.perf
        P.frameN++
        P.frameMs += dt
        if (dt > P.frameMax) P.frameMax = dt
    }
    const schedule = (o) => {
        if (o && o.measure) want.measure = true
        if (o && o.force) want.force = true
        if (!S.raf && S.alive) S.raf = raf(frame)
    }

    // ---------------------------------------------------------------- calm visuals (A7)
    const setCalm = (calm) => {
        S.calm = !!calm
        const hosts = [arcadeEl(), pxRoot()].filter(Boolean)
        S.calmHosts.forEach((h) => {
            if (!hosts.includes(h)) h.removeAttribute("data-eos-calm")
        })
        hosts.forEach((h) => (S.calm ? h.setAttribute("data-eos-calm", "1") : h.removeAttribute("data-eos-calm")))
        S.calmHosts = hosts
        if (S.calm) {
            S.pulseK = 1
            root.classList.remove("eosJitter", "eosPulseIn", "eosPulseOut", "eosFlowIn", "eosBurst")
        }
        if (S.gathered) {
            root.classList.remove("eosGather", "eosGatherCalm")
            root.classList.add(S.calm ? "eosGatherCalm" : "eosGather")
        }
        S.needSync = 3
        schedule({ measure: true, force: true })
    }

    // ---------------------------------------------------------------- stage
    const setStage = (stage) => {
        const prev = S.stage
        S.stage = String(stage || "input")
        S.levelOv = null
        if (S.stage !== "play" && S.gathered) ungather(S.stage !== "reveal")
        if (S.stage === "reveal" && prev !== "reveal") S.pendingBurst = true
        if (S.stage === "play" && prev !== "play") S.progress = 0
        S.needSync = 3
        measureSoon()
        schedule({ measure: true, force: true })
    }

    // ---------------------------------------------------------------- wiring
    const intTick = setInterval(() => schedule(), 250) //                 4 Hz: progress, rate, pacer, audio
    const intMeasure = setInterval(() => schedule({ measure: true }), 1000) // 1 Hz: the measured centre
    let ro = null
    try {
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(() => measureSoon())
            const st = stageEl()
            if (st) ro.observe(st)
        }
    } catch {}
    const onResize = () => measureSoon()
    if (typeof window !== "undefined") window.addEventListener("resize", onResize)
    const unsubPacer = EOS_PACER.subscribe(() => pacerRender())
    pacerRender()
    schedule({ measure: true, force: true })

    const destroy = () => {
        S.alive = false
        if (S.raf) caf(S.raf)
        clearTimeout(S.gatherT)
        clearInterval(intTick)
        clearInterval(intMeasure)
        S.measureTs.forEach(clearTimeout)
        clearTimeout(S.pulseT)
        clearTimeout(S.burstT)
        clearTimeout(S.flowInT)
        try {
            ro && ro.disconnect()
        } catch {}
        if (typeof window !== "undefined") window.removeEventListener("resize", onResize)
        if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis)
        unarm()
        try {
            unsubPacer()
        } catch {}
        bedStop(0)
        clearTimeout(S.bed.stopT)
        S.calmHosts.forEach((h) => h.removeAttribute("data-eos-calm"))
        // restore the retargeted dust to its own defaults (the vars are harmless, but leave nothing behind)
        const px = pxRoot()
        if (px)
            px.querySelectorAll(".tsPxBokeh").forEach((b) => {
                b.style.removeProperty("--eos-bl")
                b.style.removeProperty("--eos-bt")
            })
    }

    const state = () => {
        const c = core()
        return {
            stage: S.stage,
            level: level(),
            levelOverride: S.levelOv,
            rate: +rate().toFixed(3),
            pulse: S.pulseK,
            progress: S.progress,
            mode: root.getAttribute("data-eos-mode") || "breathe",
            calm: S.calm,
            dust: S.dust,
            straight: root.getAttribute("data-eos-straight") === "1",
            lanes: lanes().length,
            gathered: S.gathered,
            pacer: c ? c.getAttribute("data-pacer") : null,
            phase: c ? c.getAttribute("data-phase") : null,
            centre: S.centre,
            perf: { frames: S.perf.frameN, avgMs: S.perf.frameN ? +(S.perf.frameMs / S.perf.frameN).toFixed(2) : 0, maxMs: +S.perf.frameMax.toFixed(2) },
            audio: { armed: S.bed.armed, playing: S.bed.on, gain: S.bed.on ? S.bed.gainNow : 0, ctx: S.bed.ctx ? S.bed.ctx.state : null },
        }
    }

    return {
        setStage,
        setCalm,
        gather() {
            if (S.alive && !S.gathered) {
                S.pendingGather = true
                schedule()
            }
        },
        pulse,
        state,
        destroy,
        refresh() {
            S.aspect = 0
            S.needSync = 3
            schedule({ measure: true, force: true })
        },
        setLevel(n) {
            const st = EOS_STORE.get()
            if (n == null || n === "" || !Number.isFinite(Number(n))) S.levelOv = null
            else {
                S.levelOv = eosClamp(Number(n), 0, 10)
                S.levelPhase = st.phase
                S.levelStage = S.stage
            }
            schedule() // coalesced: a dial dragged at pointer rate costs one pass per frame
            return +rate().toFixed(3)
        },
    }
}

// ---------------------------------------------------------------- the component
function EosThoughtFlow({ stage = "input", reduced = false }) {
    const eos = useEosStore()
    const calm = eosCalm(reduced)
    const rootRef = React.useRef(null)
    const ctlRef = React.useRef(null)
    const [narrow, setNarrow] = React.useState(() => {
        try {
            return typeof window !== "undefined" && window.innerWidth < 600
        } catch {
            return false
        }
    })
    const emo = eos.emotion || eos.detected || null
    const E = EOS_EMO[emo]
    const spark = !!(E && E.moment === "spark")
    const lvl0 = eos.before != null ? eos.before : eos.intensityGuess != null ? eos.intensityGuess : 5
    // panic / fear in the high band: straight-in drift (spirals add vection)
    const straight = !!(E && (emo === "panic" || emo === "fear") && (eos.express || eosBand(Number(lvl0)) === "high"))
    const n = calm ? 10 : narrow ? 18 : 30
    const lanes = React.useMemo(
        () =>
            eosDotsLaneSpecs(n).map((p, i) => (
                <i
                    key={i}
                    className="eosLane"
                    data-k={p.k}
                    style={{
                        "--x": `${p.x.toFixed(2)}%`,
                        "--y": `${p.y.toFixed(2)}%`,
                        "--s": `${p.s.toFixed(2)}px`,
                        "--d": `${p.d.toFixed(2)}s`,
                        "--dl": `${p.dl.toFixed(2)}s`,
                        "--sw": `${p.sw.toFixed(1)}deg`,
                        "--h": EOS_DOTS_HUES[p.k],
                        "--ks": p.ks.toFixed(3),
                        "--bk": `${p.bk.toFixed(2)}s`,
                    }}
                >
                    <b data-eos-dot="" />
                </i>
            )),
        [n]
    )
    React.useEffect(() => {
        const el = rootRef.current
        if (!el) return undefined
        const ctl = eosDotsController(el, { onNarrow: (v) => setNarrow((prev) => (prev === v ? prev : v)) })
        ctlRef.current = ctl
        EOS_DOTS_LIVE.ctl = ctl
        return () => {
            ctl.destroy()
            if (EOS_DOTS_LIVE.ctl === ctl) EOS_DOTS_LIVE.ctl = null
            ctlRef.current = null
        }
    }, [])
    React.useEffect(() => {
        ctlRef.current?.setStage(stage)
    }, [stage])
    React.useEffect(() => {
        ctlRef.current?.setCalm(calm)
    }, [calm])
    React.useEffect(() => {
        ctlRef.current?.refresh()
    }, [n, spark, straight])
    return (
        <div
            ref={rootRef}
            className="eosThoughtFlow"
            data-stage={stage}
            data-eos-mode={spark ? "spark" : "breathe"}
            data-eos-calm={calm ? "1" : undefined}
            data-eos-straight={straight ? "1" : undefined}
            aria-hidden="true"
        >
            <i className="eosCore">
                <i className="eosCoreHalo" />
                <i className="eosCoreRays" />
                <i className="eosCoreBody">
                    <i className="eosCoreGlow" />
                    <i className="eosCoreFlash" />
                    <i className="eosCoreSpark" />
                </i>
                <i className="eosCoreRing" />
                <i className="eosCoreWave" />
            </i>
            {lanes}
        </div>
    )
}

// ---------------------------------------------------------------- CSS
const EOS_DOTS_FIELD = `${EOS_A} .eosThoughtFlow`
const EOS_DOTS_CSS = `
@keyframes eosDotsX{84%,100%{left:var(--eos-cx,50%)}}
@keyframes eosDotsY{84%,100%{top:var(--eos-cy,50%)}}
@keyframes eosDotsFade{0%{opacity:0;scale:.6}12%{opacity:.85;scale:1}74%{opacity:.9;scale:1}86%{opacity:.55;scale:.45}93%{opacity:0;scale:.12}100%{opacity:0;scale:.1}}
@keyframes eosDotsTileIn{0%{scale:1.5;opacity:0}20%{opacity:.45}100%{scale:.6;opacity:0}}
@keyframes eosDotsLane{0%{scale:1;rotate:0deg;opacity:0;animation-timing-function:cubic-bezier(.33,0,.8,.45)}9%{opacity:1}84%{scale:.028;rotate:calc(var(--sw,30deg) * .96);opacity:1;animation-timing-function:linear}100%{scale:0;rotate:var(--sw,30deg);opacity:0}}
@keyframes eosDotsGather{0%{scale:var(--g0s,1);rotate:var(--g0r,0deg);opacity:var(--g0o,1)}62%{opacity:1}100%{scale:0;rotate:var(--sw,30deg);opacity:0}}
@keyframes eosDotsBreathe{0%{scale:.86;opacity:.8;animation-timing-function:cubic-bezier(.37,0,.32,1)}40%{scale:1.1;opacity:1;animation-timing-function:linear}100%{scale:.86;opacity:.8}}
@keyframes eosDotsBeat{0%{scale:.95;opacity:.86;animation-timing-function:cubic-bezier(.2,.9,.3,1)}13%{scale:1.1;opacity:1;animation-timing-function:cubic-bezier(.5,0,.5,1)}32%{scale:.98;opacity:.9;animation-timing-function:cubic-bezier(.2,.9,.3,1)}44%{scale:1.04;opacity:.96;animation-timing-function:ease-in-out}100%{scale:.95;opacity:.86}}
@keyframes eosDotsAbsorb{0%{scale:.6;opacity:.5}100%{scale:1.1;opacity:0}}
@keyframes eosDotsBloom{0%{scale:1}30%{scale:.2}69%{scale:1.25}100%{scale:1}}
@keyframes eosDotsFlash{0%{opacity:0}30%{opacity:.2}66%{opacity:1}100%{opacity:.4}}
@keyframes eosDotsBurst{0%{scale:.3;opacity:.95}100%{scale:2.5;opacity:0}}
@keyframes eosDotsPulse{0%{opacity:0}25%{opacity:.75}100%{opacity:0}}
@keyframes eosDotsSpin{0%{rotate:0deg}100%{rotate:360deg}}
@keyframes eosDotsHue{0%{filter:hue-rotate(-38deg)}100%{filter:hue-rotate(38deg)}}
@keyframes eosDotsAppear{0%{opacity:0}100%{opacity:var(--eos-dot-o,.85)}}
@keyframes eosDotsJitter{0%{translate:-2px 1px}50%{translate:1.5px -2px}100%{translate:2px 1.5px}}
@keyframes eosDotsBlink{0%,100%{opacity:calc(var(--eos-dot-o,.85) * .2)}28%,72%{opacity:var(--eos-dot-o,.85)}}
@keyframes eosDotsAurora{0%{opacity:0}100%{opacity:1}}
@keyframes eosDotsGlint{0%,62%,100%{opacity:0;scale:.4}78%{opacity:1;scale:1}}

/* ---------------- the field (first child of .releaseStage; z 0 inside the stage's stacking context) */
${EOS_DOTS_FIELD}{position:absolute;inset:0;z-index:0;display:block;pointer-events:none;overflow:hidden;contain:strict;--eos-cx:50%;--eos-cy:52%;--eos-p:0;--eos-h:190;--eos-dot-o:.85;--eos-core-size:min(36vmin,280px)}
${EOS_DOTS_FIELD} i,${EOS_DOTS_FIELD} b{display:block;pointer-events:none;font-style:normal}
/* home screen: keep the idle glows, drop only the opaque base layer; the flow paints the base under the dust */
${EOS_A} .releaseStage > .releaseIdleStage{background-image:radial-gradient(circle at 24% 34%,rgba(0,229,255,.086),transparent 30%),radial-gradient(circle at 78% 32%,rgba(138,92,255,.075),transparent 31%),radial-gradient(circle at 72% 76%,rgba(192,0,255,.05),transparent 32%),radial-gradient(circle at 30% 78%,rgba(255,241,138,.035),transparent 27%),radial-gradient(circle at 50% 52%,rgba(7,14,28,0) 0 9%,rgba(7,14,28,.42) 24%,rgba(7,5,16,.3) 40%,transparent 64%)!important}
${EOS_DOTS_FIELD}[data-stage="input"]{background:linear-gradient(rgba(3,6,14,.996),rgb(1,1,5))}
/* the idle abyss sits exactly on the Still Point: it now FRAMES the light instead of swallowing it — the black
   centre of the well opens (the dark ring stays as a vignette) and the void sphere keeps only its crescent rim light */
${EOS_A} .releaseStage > .releaseIdleStage .ts-abyss-field::before{background:radial-gradient(circle at 50% 52%,rgba(0,0,0,0) 0 10%,rgba(2,2,9,.3) 18%,rgba(4,3,10,.58) 28%,rgba(31,17,77,.16) 41%,transparent 61%),radial-gradient(circle at 50% 52%,transparent 36%,rgba(0,229,255,.036) 49%,rgba(138,92,255,.030) 58%,rgba(192,0,255,.022) 67%,rgba(255,241,138,.012) 74%,transparent 82%),radial-gradient(circle at 50% 52%,transparent 48%,rgba(0,0,0,.42) 76%,rgba(0,0,0,.95) 100%)!important}
${EOS_A} .releaseStage > .releaseIdleStage .ts-abyss-core{background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.1) 0 4%,transparent 8%)!important;border-color:rgba(150,238,255,.3)!important;box-shadow:9px 0 0 -7px rgba(0,229,255,.96),15px 0 14px -8px rgba(0,229,255,.82),21px 0 34px -9px rgba(138,92,255,.48),-13px 5px 30px -13px rgba(192,0,255,.34),0 12px 34px -17px rgba(255,241,138,.2),0 0 100px rgba(138,92,255,.07)!important}
${EOS_A} .releaseStage > .releaseIdleStage .ts-abyss-core::after{display:none!important}
/* reveal: the arcade's overlay was 82 % black + a 15 px backdrop blur, which hid the field entirely (no burst, no
   halo). Lighter and barely blurred, the Still Point glows around the card and the dust visibly drifts home. */
${EOS_A} .releaseStage > .releaseCompleteOverlay{background:radial-gradient(circle at 50% 42%,rgba(0,218,255,.1),transparent 25%),radial-gradient(circle at 50% 42%,rgba(154,59,255,.06),transparent 43%),rgba(0,3,8,.52)!important;-webkit-backdrop-filter:blur(2px) saturate(1.1)!important;backdrop-filter:blur(2px) saturate(1.1)!important}
${EOS_DOTS_FIELD}[data-stage="play"]{--eos-dot-o:.45}
${EOS_DOTS_FIELD}[data-stage="reveal"]{--eos-dot-o:.7}

/* ---------------- lanes: scale 1 → 0 around the measured centre = a straight line home; + rotate = a spiral */
${EOS_DOTS_FIELD} .eosLane{position:absolute;inset:0;transform-origin:var(--eos-cx,50%) var(--eos-cy,52%);animation:eosDotsLane var(--d,18s) linear var(--dl,0s) infinite;opacity:0}
${EOS_DOTS_FIELD}[data-eos-straight="1"] .eosLane{--sw:0deg!important}
${EOS_DOTS_FIELD} .eosLane>[data-eos-dot]{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);margin:calc(var(--s) * -.5) 0 0 calc(var(--s) * -.5);border-radius:50%;opacity:var(--eos-dot-o,.85);
background:radial-gradient(circle,#fff 0 30%,hsla(var(--h),100%,80%,.95) 52%,hsla(var(--h),100%,70%,0) 100%);
box-shadow:0 0 calc(var(--s) * 1.4 + 2px) hsla(var(--h),100%,72%,.75),0 0 calc(var(--s) * 4 + 5px) hsla(var(--h),100%,62%,.28)}
${EOS_DOTS_FIELD} .eosLane>[data-eos-dot]::after{content:"";position:absolute;left:50%;top:50%;width:calc(var(--s) * 4.5 + 7px);height:max(1px,calc(var(--s) * .55));transform-origin:0 50%;translate:0 -50%;rotate:var(--ta,0deg);border-radius:999px;background:linear-gradient(90deg,hsla(var(--h),100%,84%,.5),hsla(var(--h),100%,70%,0));pointer-events:none}
${EOS_DOTS_FIELD}.eosJitter .eosLane>[data-eos-dot]{animation:eosDotsJitter calc(var(--bk,2s) * .3) ease-in-out infinite alternate}
${EOS_DOTS_FIELD}.eosFlowIn .eosLane>[data-eos-dot]{animation:eosDotsAppear 1.2s ease-out both}
/* finish: every lane rushes home from where it is (JS freezes --g0s/--g0r/--g0o), the core anticipates then blooms */
${EOS_DOTS_FIELD}.eosGather .eosLane{animation:eosDotsGather .9s cubic-bezier(.5,0,.9,.4) forwards!important}

/* ---------------- the Still Point */
${EOS_DOTS_FIELD} .eosCore{position:absolute;left:50%;top:52%;width:var(--eos-core-size);height:var(--eos-core-size);translate:-50% -50%;scale:1;opacity:1;transition:scale .7s cubic-bezier(.3,1.25,.45,1),opacity .6s ease}
${EOS_DOTS_FIELD}[data-stage="play"] .eosCore{scale:calc(.8 + .5 * var(--eos-p,0));opacity:.62}
${EOS_DOTS_FIELD}[data-stage="reveal"] .eosCore{scale:1.06;opacity:.92}
${EOS_DOTS_FIELD}.eosGather .eosCore{opacity:1}
${EOS_DOTS_FIELD} .eosCore>i,${EOS_DOTS_FIELD} .eosCoreBody>i{position:absolute;border-radius:50%}
${EOS_DOTS_FIELD} .eosCoreHalo{inset:-55%;background:radial-gradient(closest-side,hsla(var(--eos-h),100%,74%,.26),hsla(var(--eos-h),100%,64%,.1) 44%,hsla(var(--eos-h),100%,55%,.03) 70%,hsla(var(--eos-h),100%,55%,0) 100%)}
${EOS_DOTS_FIELD} .eosCoreRays{inset:-18%;background:repeating-conic-gradient(from 8deg,hsla(var(--eos-h),100%,86%,0) 0deg 9deg,hsla(var(--eos-h),100%,88%,.13) 13deg,hsla(var(--eos-h),100%,86%,0) 17deg 31deg,rgba(255,244,214,.09) 35deg,hsla(var(--eos-h),100%,86%,0) 39deg 52deg);-webkit-mask-image:radial-gradient(closest-side,transparent 9%,#000 24%,rgba(0,0,0,.5) 55%,transparent 92%);mask-image:radial-gradient(closest-side,transparent 9%,#000 24%,rgba(0,0,0,.5) 55%,transparent 92%);animation:eosDotsSpin 90s linear infinite}
${EOS_DOTS_FIELD} .eosCoreBody{inset:0;animation:eosDotsBreathe 10s linear infinite}
${EOS_DOTS_FIELD} .eosCoreGlow{inset:0;background:radial-gradient(closest-side,#fffdf4 0 4%,rgba(255,250,232,.94) 7%,hsla(var(--eos-h),100%,85%,.74) 14%,hsla(var(--eos-h),100%,71%,.42) 28%,hsla(var(--eos-h),96%,61%,.18) 50%,hsla(var(--eos-h),92%,53%,.05) 74%,hsla(var(--eos-h),90%,50%,0) 100%)}
${EOS_DOTS_FIELD} .eosCoreSpark{left:50%;top:50%;width:9%;height:9%;translate:-50% -50%;background:radial-gradient(closest-side,#fff,rgba(255,255,255,.6) 45%,rgba(255,255,255,0));box-shadow:0 0 18px 6px rgba(255,250,235,.55),0 0 46px 14px hsla(var(--eos-h),100%,76%,.35)}
${EOS_DOTS_FIELD} .eosCoreRing{inset:31%;border:1.5px solid hsla(var(--eos-h),100%,88%,.62);box-shadow:0 0 14px hsla(var(--eos-h),100%,72%,.45),inset 0 0 12px hsla(var(--eos-h),100%,72%,.3);opacity:0;animation:eosDotsAbsorb 2.8s cubic-bezier(.2,.7,.3,1) infinite}
${EOS_DOTS_FIELD} .eosCoreFlash{inset:-4%;background:radial-gradient(closest-side,#fff 0 12%,rgba(255,250,232,.85) 26%,hsla(var(--eos-h),100%,80%,.42) 50%,hsla(var(--eos-h),100%,72%,.12) 74%,hsla(var(--eos-h),100%,70%,0) 100%);opacity:0}
${EOS_DOTS_FIELD} .eosCoreWave{inset:18%;border:2px solid hsla(var(--eos-h),100%,90%,.9);box-shadow:0 0 22px hsla(var(--eos-h),100%,74%,.6);opacity:0}
/* one pacer (B4): autonomous = the CSS breath synced to the shared clock; owned = transitions over the phase ms */
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"] .eosCoreBody{animation:none;transition:scale var(--eos-breath-ms,4000ms) cubic-bezier(.3,.55,.4,1),opacity var(--eos-breath-ms,4000ms) ease}
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"][data-phase="in"] .eosCoreBody{scale:1.12;opacity:1}
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"][data-phase="hold"] .eosCoreBody{scale:1.17;opacity:1}
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"][data-phase="out"] .eosCoreBody{scale:.84;opacity:.82;transition-timing-function:linear}
${EOS_DOTS_FIELD} .eosCore[data-pacer="beat"] .eosCoreBody,${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosCore[data-pacer="auto"] .eosCoreBody{animation:eosDotsBeat var(--eos-beat-ms,833ms) linear infinite}
${EOS_DOTS_FIELD}.eosGather .eosCore .eosCoreBody{animation:eosDotsBloom 1.3s cubic-bezier(.3,.9,.4,1) forwards;transition:none}
${EOS_DOTS_FIELD}.eosGather .eosCoreFlash{animation:eosDotsFlash 1.3s ease-out forwards}
${EOS_DOTS_FIELD}.eosGather .eosCoreWave{animation:eosDotsBurst .9s cubic-bezier(.15,.7,.3,1) .82s 1 both}
${EOS_DOTS_FIELD}.eosBurst .eosCoreWave{animation:eosDotsBurst .9s cubic-bezier(.15,.7,.3,1) 1 both}
${EOS_DOTS_FIELD}.eosPulseIn .eosCoreFlash{animation:eosDotsPulse 1.2s ease-out 1}
${EOS_DOTS_FIELD}.eosPulseIn .eosCoreRing{animation-duration:.9s}
${EOS_DOTS_FIELD}.eosPulseOut .eosCoreWave{animation:eosDotsBurst 1.2s cubic-bezier(.2,.6,.3,1) 1 both}
/* spark states (numb, good): warm, vivid, alive — the core pulses at 72 bpm instead of breathing */
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosCoreHalo{animation:eosDotsHue 6s ease-in-out infinite alternate}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosLane[data-k="0"]{--h:330!important}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosLane[data-k="1"]{--h:42!important}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosLane[data-k="2"]{--h:16!important}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosLane[data-k="3"]{--h:175!important}

/* ---------------- cosmetic dust styles (§9.2; never change the pacer or the mirror rules) */
${EOS_DOTS_FIELD}[data-eos-dust="fireflies"] .eosLane>[data-eos-dot]{--fh:calc(50 + var(--h) * .07);background:radial-gradient(circle,#fffde6 0 28%,hsla(var(--fh),100%,64%,.95) 54%,hsla(var(--fh),100%,55%,0) 100%);box-shadow:0 0 calc(var(--s) * 2.4 + 4px) hsla(var(--fh),100%,58%,.8),0 0 calc(var(--s) * 6 + 8px) hsla(var(--fh),100%,50%,.25);animation:eosDotsBlink var(--bk,2.4s) ease-in-out var(--dl,0s) infinite}
${EOS_DOTS_FIELD}[data-eos-dust="fireflies"].eosJitter .eosLane>[data-eos-dot]{animation:eosDotsBlink var(--bk,2.4s) ease-in-out var(--dl,0s) infinite,eosDotsJitter calc(var(--bk,2s) * .3) ease-in-out infinite alternate}
${EOS_DOTS_FIELD}[data-eos-dust="fireflies"] .eosLane>[data-eos-dot]::after{display:none}
${EOS_DOTS_FIELD}[data-eos-dust="aurora"] .eosLane>[data-eos-dot]{--ah:calc(120 + var(--h) * .3);--aw:calc(var(--s) * 3.4 + 5px);--ahh:calc(var(--s) * .8 + 1px);width:var(--aw);height:var(--ahh);margin:calc(var(--ahh) * -.5) 0 0 calc(var(--aw) * -.5);rotate:calc(var(--ta,0deg) + 90deg);border-radius:999px;background:linear-gradient(90deg,hsla(var(--ah),95%,70%,0),hsla(var(--ah),95%,74%,.95),hsla(var(--ah),95%,70%,0));box-shadow:0 0 12px hsla(var(--ah),95%,62%,.45)}
${EOS_DOTS_FIELD}[data-eos-dust="aurora"] .eosLane>[data-eos-dot]::after{left:0;top:0;width:100%;height:100%;translate:none;rotate:none;background:linear-gradient(90deg,hsla(calc(var(--ah) + 80),95%,72%,0),hsla(calc(var(--ah) + 80),95%,76%,.95),hsla(calc(var(--ah) + 80),95%,72%,0));animation:eosDotsAurora calc(var(--bk,2.4s) * 2.6) ease-in-out var(--dl,0s) infinite alternate}
${EOS_DOTS_FIELD}[data-eos-dust="snow"] .eosLane>[data-eos-dot]{--s2:calc(var(--s) * 1.25 + .5px);width:var(--s2);height:var(--s2);margin:calc(var(--s2) * -.5) 0 0 calc(var(--s2) * -.5);background:radial-gradient(circle,#fff 0 40%,rgba(236,246,255,.85) 62%,rgba(220,238,255,0) 100%);box-shadow:0 0 calc(var(--s) * 1.6 + 3px) rgba(226,242,255,.7)}
${EOS_DOTS_FIELD}[data-eos-dust="snow"] .eosLane>[data-eos-dot]::after{display:none}
${EOS_DOTS_FIELD}[data-eos-dust="gold"] .eosLane>[data-eos-dot]{background:radial-gradient(circle,#fffbe6 0 26%,#ffd04a 52%,rgba(255,154,46,0) 100%);box-shadow:0 0 calc(var(--s) * 1.6 + 3px) rgba(255,200,80,.85),0 0 calc(var(--s) * 4 + 6px) rgba(255,150,40,.3)}
${EOS_DOTS_FIELD}[data-eos-dust="gold"] .eosLane>[data-eos-dot]::after{left:50%;top:50%;width:calc(var(--s) * 4 + 6px);height:calc(var(--s) * 4 + 6px);translate:-50% -50%;rotate:none;transform-origin:50% 50%;background:linear-gradient(90deg,rgba(255,240,190,0) 0 42%,rgba(255,246,210,.95) 50%,rgba(255,240,190,0) 58% 100%),linear-gradient(0deg,rgba(255,240,190,0) 0 42%,rgba(255,246,210,.95) 50%,rgba(255,240,190,0) 58% 100%);opacity:0}
${EOS_DOTS_FIELD}[data-eos-dust="gold"] .eosLane:nth-child(3n) >[data-eos-dot]::after{animation:eosDotsGlint calc(var(--bk,2.4s) * 1.2) ease-in-out infinite}

/* ---------------- every other dust layer joins the same centre */
/* Pixar motes: left/top animate FROM the inline spawn values to the measured centre; two easings = curved, odd/even swap = both spin directions */
${EOS_PX} .tsPxDust{animation:eosDotsX var(--d,11s) cubic-bezier(.55,.05,.7,.35) var(--dl,0s) infinite,eosDotsY var(--d,11s) cubic-bezier(.2,.6,.35,1) var(--dl,0s) infinite,eosDotsFade var(--d,11s) linear var(--dl,0s) infinite!important}
${EOS_PX} .tsPxDust:nth-of-type(odd){animation-timing-function:cubic-bezier(.2,.6,.35,1),cubic-bezier(.55,.05,.7,.35),linear!important}
/* bokeh: Pixar's own tsPxBokeh keyframes animate translate, so the base position glides a quarter of the way home over 60 s */
${EOS_PX} .tsPxBokeh[style*="--eos-bl"]{left:var(--eos-bl)!important;top:var(--eos-bt)!important;transition:left 60s linear,top 60s linear}
/* per-game cinema dust: calmer, longer cycles (inline --d is the dot index) into the same centre */
${EOS_A}.stage-play .cinemaDust i{animation-name:eosDotsX,eosDotsY,eosDotsFade!important;animation-duration:calc(9s + var(--d,0) * .5s)!important;animation-delay:calc(var(--d,0) * -1.37s)!important;animation-timing-function:cubic-bezier(.55,.05,.7,.35),cubic-bezier(.2,.6,.35,1),linear!important;animation-iteration-count:infinite!important;animation-direction:normal!important;animation-fill-mode:none!important;transform:none!important}
${EOS_A}.stage-play .cinemaDust i:nth-child(4n+1){animation-timing-function:cubic-bezier(.2,.6,.35,1),cubic-bezier(.55,.05,.7,.35),linear!important}
/* 109 CLEANSE star tiles zoom toward the centre */
${EOS_A}.stage-play .cleanseSpace{transform-origin:var(--eos-cx,50%) var(--eos-cy,50%);animation:eosDotsTileIn 14s linear infinite!important}
/* retire the invisible legacy field (its hue variables were never defined) */
${EOS_A} .infinityField{display:none!important}

/* ---------------- reduced motion (the OS setting) */
@media (prefers-reduced-motion:reduce){
  ${EOS_PX} .tsPxDust{animation:none!important;opacity:0!important}
  ${EOS_A} :is(.cinemaDust i,.cleanseSpace){animation:none!important}
  ${EOS_A} .cinemaDust i{opacity:.2!important}
  ${EOS_PX} .tsPxBokeh[style*="--eos-bl"]{transition:none!important}
  ${EOS_DOTS_FIELD} .eosLane,${EOS_DOTS_FIELD}.eosGather .eosLane{animation:none!important;opacity:.25;scale:var(--ks,.6);rotate:calc(var(--sw,30deg) * (1 - var(--ks,.6)))}
  ${EOS_DOTS_FIELD} .eosLane>[data-eos-dot]{animation:none!important}
  ${EOS_DOTS_FIELD} .eosCore,${EOS_DOTS_FIELD} .eosCore *{animation:none!important;transition:opacity .8s ease!important}
  ${EOS_DOTS_FIELD} .eosCore .eosCoreBody,${EOS_DOTS_FIELD} .eosCore{scale:1!important}
  ${EOS_DOTS_FIELD} .eosCore{transition:none!important}
}
/* in-app calm visuals: the same quiet field without the OS setting */
${EOS_PX}[data-eos-calm="1"] .tsPxDust{animation:none!important;opacity:0!important}
${EOS_PX}[data-eos-calm="1"] .tsPxBokeh{transition:none!important}
${EOS_A}[data-eos-calm="1"] :is(.cinemaDust i,.cleanseSpace,.eosLane){animation:none!important}
${EOS_A}[data-eos-calm="1"] .cinemaDust i{opacity:.2!important}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosLane,${EOS_DOTS_FIELD}[data-eos-calm="1"].eosGather .eosLane{animation:none!important;opacity:.25;scale:var(--ks,.6);rotate:calc(var(--sw,30deg) * (1 - var(--ks,.6)))}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosLane>[data-eos-dot]{animation:none!important}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore,${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore *{animation:none!important;transition:opacity .8s ease!important}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore .eosCoreBody{scale:1!important}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore{scale:1!important;transition:none!important}
${EOS_DOTS_FIELD}.eosGatherCalm .eosCoreFlash{opacity:.55}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore[data-pacer="own"][data-phase="out"] .eosCoreBody{opacity:.78}
`
eosCss("dots", EOS_DOTS_CSS)

// ---------------------------------------------------------------- public API (optional-chained by callers)
eosExpose("dots", {
    pulse: (kind = "in") => EOS_DOTS_LIVE.ctl?.pulse(kind),
    breath: (phase, ms) => eosBreathOwn(phase, ms),
    phase: () => eosBreathPhase(),
    beat: (bpm) => eosPacerBeat(bpm),
    setLevel: (n) => EOS_DOTS_LIVE.ctl?.setLevel(n),
    gather: () => EOS_DOTS_LIVE.ctl?.gather(),
    state: () => (EOS_DOTS_LIVE.ctl ? EOS_DOTS_LIVE.ctl.state() : null),
})
