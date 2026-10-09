// ===================================================================================
// EOS · 12 DOTS — the Still Point and the Thought Dust (docs/EOS_SPEC.md §5.1-§5.5, §0.4 pacer rendering,
// §2.1 home screen, §9.2 cosmetic dust styles). Task `dots`. Public: EosThoughtFlow, EOS_DOTS_CSS.
//
// Story: every background dot is a loose thought. ALL of them (the flow lanes, the Pixar motes, every game's
// cinema dust, 109's star tiles; the big bokeh drifts a quarter of the way) travel into ONE measured centre —
// the Still Point — which breathes with the shared pacer (core EOS_PACER: 4 s in / 6 s out, or whoever owns the
// breath). Their speed mirrors how loud the feeling is and slows as the game's progress rises; at the finish the
// dust GATHERS and the core BLOOMS; in the reveal it bursts outward once, drifts home slowly and glows as a calm
// aura behind the result. The light's colour follows the feeling's colour script: its own hue → the hue of its
// CALM grade (anger red → teal, panic → dawn gold, sad → peach; numb starts grey and regains colour).
//
// Mount (integration I1-E2): the FIRST child of section.releaseStage:
//     <EosThoughtFlow stage={stage} reduced={!!reduced} />
// API: eosApi("dots").pulse?.("in"|"out") · breath(phase, ms) · phase() · beat(bpm) · setLevel(n|null) · gather()
//      · state() (dev/test read-out: stage, level, rate, mode, calm, dust, pacer, centre, audio, perf …)
//
// Performance: the lanes animate only `scale` / `rotate` / `opacity` (compositor); the 14 Pixar motes and ≤14
// cinema dots animate `left/top` on tiny absolutely positioned nodes (spec §5.3). No React re-render is needed for
// any per-frame or per-progress change: a 4 Hz controller pass runs right AFTER a painted frame (rAF → message
// task), when style and layout are normally clean; it writes CSS variables / attributes / playbackRate only when
// they change. Nothing on the per-tick path forces a style recalc: the dots' Animation objects are cached (read in
// batches when `animationstart` reports new ones), rates are plain property writes, the finish rushes each lane
// home on its own running animation (nothing is re-created), and the pacer is rendered from an analytic model of
// the core's scale (never read back), so a game's eosBreathOwn() call costs no style flush and hand-overs never
// jump. Only the centre measure (1 Hz, and at idle moments after a stage change / resize) reads layout.
// state().perf reports the controller's own cost (avg ≈ 0.5-2 ms per pass in headless).
// Every timer, frame request, message port, observer, listener and audio node is released on unmount.
//
// Animated-node budget (≤ 60 steady-state targets at 1280 in play): 28 lanes (18 on phone, 10 calm) + the dust layers
// (14 Pixar motes + ≤ 14 cinema dots) + 2-3 core layers. Every per-dot effect is folded into the LANE's own animation
// list (intensity wobble = a 2nd animation on the lane; fireflies blink / aurora shimmer / gold glints = lane keyframe
// variants), so no dot ever runs an animation of its own. Lanes are 0×0 boxes placed on their spawn point whose
// transform-origin is the measured centre in px (cqw/cqh, px-var fallback): each lane's compositor layer is dot-sized
// instead of a full-stage layer (WebKit/iOS memory).
// Deliberate deviation from §0.5 (useEosProgress): progress is polled inside this controller's own 4 Hz after-paint
// pass (eosProgressOf on the stage) instead of the shared hook — the pass is needed anyway for the pacer, the rates
// and the audio bed, and keeping it here avoids a React re-render of the field on every progress change.
// Focal anchor: a game may mark its centrepiece with [data-eos-focus] (legacy: 39 .blackHole, 109 .lotusCore); during
// play the Still Point glides there and every dust layer converges on it instead of the stage centre.
// ===================================================================================

const EOS_DOTS_HUES = [195, 265, 42, 320] //       default palette (cyan, violet, gold, pink)
const EOS_DOTS_STYLES = ["default", "fireflies", "aurora", "snow", "gold"] // §9.2 cosmetic styles (eos_prefs_v1.dust)
const EOS_DOTS_CX = 50 //                           nominal Still Point (% of the stage) — the measured one wins
const EOS_DOTS_CY = 52
const EOS_DOTS_CALM_HUE = 190 //                    fallback calm hue (STILL's cyan)
const EOS_DOTS_LIVE = { ctls: new Set() } //       every mounted controller (several component instances can coexist)
const EOS_DOTS_FOCUS_SEL = "[data-eos-focus], .blackHole, .lotusCore" // play-time focal anchors (opt-in + legacy 39 / 109)
// the API fans out to every live controller; the value returned (and state()) is the most recently mounted one's
function eosDotsEach(f) {
    let out
    EOS_DOTS_LIVE.ctls.forEach((c) => {
        try {
            out = f(c)
        } catch {}
    })
    return out
}
const EOS_DOTS_BED_MAX = 0.024 //                   audio bed peak gain (spec: ≤ .03)

const EOS_DOTS_CYCLE = (EOS_BREATH.coreIn + EOS_BREATH.coreOut) * 1000 // the shared 10 s autonomous breath
const EOS_DOTS_OWN_SCALE = { in: 1.12, hold: 1.17, out: 0.84 } //  owned phase targets (mirrors the CSS below)

// cubic-bezier(x1, y1, x2, y2) at x ∈ [0, 1] (Newton with a bisection fallback) — models the CSS curves exactly.
function eosDotsBezier(x1, y1, x2, y2, x) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const fx = (u) => ((ax * u + bx) * u + cx) * u
    let u = x
    for (let i = 0; i < 6; i++) {
        const d = (3 * ax * u + 2 * bx) * u + cx
        if (Math.abs(d) < 1e-6) break
        const nu = u - (fx(u) - x) / d
        if (nu < 0 || nu > 1) break
        u = nu
    }
    if (Math.abs(fx(u) - x) > 1e-4) {
        let lo = 0
        let hi = 1
        u = x
        for (let i = 0; i < 24; i++) {
            if (fx(u) < x) lo = u
            else hi = u
            u = (lo + hi) / 2
        }
    }
    return ((ay * u + by) * u + cy) * u
}
// The autonomous CSS breath (keyframes eosDotsBreathe, locked to the shared clock) at time t → [scale, opacity].
function eosDotsBreathAt(t) {
    const k = ((t % EOS_DOTS_CYCLE) + EOS_DOTS_CYCLE) % EOS_DOTS_CYCLE
    const inMs = EOS_BREATH.coreIn * 1000
    if (k < inMs) {
        const e = eosDotsBezier(0.37, 0, 0.32, 1, k / inMs)
        return [0.86 + 0.24 * e, 0.8 + 0.2 * e]
    }
    const p = (k - inMs) / (EOS_DOTS_CYCLE - inMs)
    return [1.1 - 0.24 * p, 1 - 0.2 * p]
}

// "#ffcf7a" → hue in degrees (null when not a hex colour).
function eosDotsHexHue(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim())
    if (!m) return null
    const n = parseInt(m[1], 16)
    const r = ((n >> 16) & 255) / 255
    const g = ((n >> 8) & 255) / 255
    const b = (n & 255) / 255
    const mx = Math.max(r, g, b)
    const d = mx - Math.min(r, g, b)
    if (!d) return 0
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    return Math.round((h * 60 + 360) % 360)
}
// The Still Point's colour script (§0.2 grade): from the feeling's own hue to the hue of its CALM grade (anger red →
// teal, panic → dawn gold, sad → peach, numb → candy pink …), so the light lands where EosMoodGrade lands. Of the two
// ways round the colour wheel it takes the one that avoids the sickly yellow-green band (panic's sunrise and anger's
// cool-down both go the long way, through violet). Cached per emotion. → {h0, d}: hue = h0 + d × progress.
const EOS_DOTS_HUE_PATHS = {}
function eosDotsHuePath(emo) {
    const key = emo || "auto"
    if (EOS_DOTS_HUE_PATHS[key]) return EOS_DOTS_HUE_PATHS[key]
    const e = EOS_EMO[emo] || EOS_GUIDE_CHAR
    const h0 = Number(e.hue) || EOS_DOTS_CALM_HUE
    const h1 = eosDotsHexHue(e.grade && e.grade.calm && e.grade.calm[0])
    const to = h1 == null ? EOS_DOTS_CALM_HUE : h1
    const short = ((((to - h0) % 360) + 540) % 360) - 180
    const long = short > 0 ? short - 360 : short + 360
    const green = (d) => {
        let n = 0
        for (let k = 1; k < 12; k++) {
            const h = (((h0 + (d * k) / 12) % 360) + 360) % 360
            if (h > 68 && h < 152) n++
        }
        return n
    }
    const fromGreen = h0 > 68 && h0 < 152 // jealous starts green: leaving it the short way (→ gold) is right
    return (EOS_DOTS_HUE_PATHS[key] = { h0, d: !fromGreen && green(long) < green(short) ? long : short })
}

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
    const N = Math.round(sr * 6) //  6 s loop: brown noise this low-passed never sounds repetitive
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
        kickK: 1, //        setLevel micro-feedback: a short surge (louder) / settle (quieter) …
        kickT: 0, //        … that relaxes back to the mirrored rate
        twinkT: 0,
        gatherAt: 0,
        gatherLatch: false, // an auto gather released because the reveal never came: wait for a new finish edge
        gathered: false,
        gatherBoostUntil: 0,
        burstUntil: 0,
        burstT: 0,
        burstBy: 0,
        burstRead: false,
        burstEndT: 0,
        idleT: 0,
        idleIds: [],
        ready: false, // the first idle pass after mount has measured
        boostT: 0,
        flowInT: 0,
        progress: 0,
        rate: 1,
        dust: "default",
        pacer: "",
        phase: "",
        phaseP: 0,
        sip: false,
        handT: 0,
        centre: null,
        vars: new Map(),
        narrow: null,
        aspect: 0,
        laneKey: "",
        focus: false,
        calmHosts: [],
        measureTs: [],
        ticks: 0,
        needSync: 3, //      re-assert the breath clock for the next N ticks (animations re-created)
        perf: { frameN: 0, frameMs: 0, frameMax: 0, maxAt: "" },
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
    // After-paint task: a message posted from requestAnimationFrame is handled once that frame has been painted, when
    // style and layout are clean — so getBoundingClientRect / getAnimations / getComputedStyle there force NO extra
    // style recalc (measured: the 1 Hz measure used to force a 10-14 ms recalc inside rAF on this arcade's DOM).
    const chan = typeof MessageChannel === "function" ? new MessageChannel() : null
    let posted = null
    if (chan)
        chan.port1.onmessage = () => {
            const f = posted
            posted = null
            if (f) f()
        }
    const afterPaint = (f) => {
        if (!chan) return setTimeout(f, 0)
        posted = f
        try {
            chan.port2.postMessage(0)
        } catch {
            posted = null
            setTimeout(f, 0)
        }
    }
    const stageEl = () => (root && (root.closest(".releaseStage") || root.parentElement)) || null
    const pxRoot = () => (root && root.closest(".tsPixarRoot")) || null
    const arcadeEl = () => (root && root.closest(".tsArcade")) || null
    const core = () => root.querySelector(".eosCore")
    const body = () => root.querySelector(".eosCoreBody")
    const handEl = () => root.querySelector(".eosCoreHand")
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
        // numb / good (§5.2 R6): up-regulation, not a calming field — lanes stay lively (≈ 8-12 s at level 5) and
        // do NOT slow with progress (the colour coming back is the shift); a louder dial still churns a little more
        let r = spark() ? 1.5 + 0.06 * L : 0.7 + 0.09 * L * (1 - pTerm)
        if (S.dust === "snow") r *= 0.8 //          snow falls slower (cosmetic)
        if (S.stage === "reveal") r *= 0.86 //      reveal: ≈ 30 s lanes (0.7 × .86 → 18 s / .6), still converging
        return r
    }
    // x = a cache entry {a, D (iteration ms), dl (delay ms), lane, req}. updatePlaybackRate() is asynchronous (the
    // getter keeps the old rate until the next frame commits it) and asking again before that re-arms the pending
    // task — on a slow device it would never settle — so each rate is requested exactly once (x.req).
    const setRate = (x, r) => {
        const a = x.a
        try {
            if (x.req != null && Math.abs(x.req - r) < 0.004) return
            const flip = Math.sign(Number(a.playbackRate) || 1) !== Math.sign(r)
            if ((r < 0 || flip) && !x.started) return // reversing needs a started animation (see entryOf)
            x.req = r
            if (Math.abs((Number(a.playbackRate) || 0) - r) < 0.004) return
            if (r < 0) {
                // reversing (pulse "out") an infinite CSS animation that was created a moment ago would run it past
                // time 0 and FINISH it (the dot would freeze). Jump whole iterations ahead first: same frame on screen.
                const D = x.D
                const ct = Number(a.currentTime) || 0
                if (D > 0 && ct < 3 * D) a.currentTime = ct + 4 * D
            }
            if (a.updatePlaybackRate && !flip) a.updatePlaybackRate(r)
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
    // ---- the animation cache (no forced style recalc on the rate path)
    // Measured on this arcade's DOM: getAnimations(), getComputedStyle(), effect.getTiming() and playState each force
    // a FULL style recalc when anything is dirty (20-50 ms in headless), while playbackRate / updatePlaybackRate /
    // currentTime / startTime / getComputedTiming() never do. So every dot's Animation objects are read ONCE — when
    // the browser reports them (`animationstart` bubbles up to the Pixar root right after the frame that created
    // them), at mount, or by the slow safety-net scan — and every later rate change (progress, dial, pulse, gather
    // boost) is a plain property write on the cached objects. A cached CSS animation that the cascade cancelled
    // (gather, calm visuals, a game unmounting) reads currentTime null → dropped; its replacement fires a new
    // animationstart.
    const DOT_ANIM = /^eosDots(Lane(?:Ff|Au|Gd)?|X|Y|Fade)$/ // (the lane's 2nd animation, eosDotsJitter*, is never rated)
    const BODY_ANIM = /^eosDots(Breathe|Beat)$/
    const AN = { map: new Map(), empty: new WeakSet(), dirty: new Set(), body: null, bodyDirty: true, host: null }
    const entryOf = (a) => {
        const n = String(a.animationName || "")
        if (!DOT_ANIM.test(n)) return null
        let D = 0
        let dl = 0
        try {
            const tm = a.effect.getTiming() // style is clean right after getAnimations(): free
            D = Number(tm.duration) || 0
            dl = Number(tm.delay) || 0
        } catch {}
        // started: the animation has left its pending state. Writing currentTime / a direct playbackRate to a
        // play-pending composited animation can leave it pending for good (measured: frozen lanes in the reveal), so
        // those writes wait for `ready`; updatePlaybackRate() is safe either way.
        const x = { a, lane: n.startsWith("eosDotsLane"), D, dl, req: null, started: false }
        try {
            a.ready.then(
                () => {
                    x.started = true
                },
                () => {}
            )
        } catch {}
        return x
    }
    const store = (el, list) => {
        if (list.length) {
            AN.map.set(el, list)
            AN.empty.delete(el)
        } else {
            AN.map.delete(el)
            AN.empty.add(el)
        }
    }
    const collectOne = (el) => store(el, anims(el).map(entryOf).filter(Boolean))
    // Element.getAnimations() walks every animation in the document (~0.4 ms each on this arcade), so dots are read in
    // batches: ONE getAnimations({subtree:true}) per container (the flow root, the Pixar rig, each game's .cinemaDust),
    // split by effect target. A container that reports nothing (no subtree support) falls back to per-element reads.
    const collect = (els) => {
        const groups = new Map()
        for (const el of els) {
            const g = el.classList.contains("eosLane") ? root : el.parentElement || el
            if (!groups.has(g)) groups.set(g, [])
            groups.get(g).push(el)
        }
        for (const [g, list] of groups) {
            let all = null
            try {
                all = g === list[0] ? null : g.getAnimations({ subtree: true })
            } catch {
                all = null
            }
            if (!all || !all.length) {
                list.forEach(collectOne)
                continue
            }
            const by = new Map(list.map((el) => [el, []]))
            for (const a of all) {
                const tg = a.effect && a.effect.target
                const arr = tg && by.get(tg)
                if (!arr) continue
                const x = entryOf(a)
                if (x) arr.push(x)
            }
            for (const [el, arr] of by) store(el, arr)
        }
    }
    const collectBody = () => {
        const b = body()
        AN.body = null
        if (!b) return
        for (const a of anims(b))
            if (BODY_ANIM.test(String(a.animationName || ""))) {
                let dl = 0
                try {
                    dl = Number(a.effect.getTiming().delay) || 0
                } catch {}
                AN.body = { a, dl }
                break
            }
    }
    const live = (x) => {
        try {
            return x.a.currentTime != null
        } catch {
            return false
        }
    }
    // mode "full" = re-read every dot (mount, lanes re-rendered, calm toggled); "safety" (every 4 s) = re-read every dot
    // without a live animation (a couple of batched reads — the net under the events); otherwise only elements that are
    // new or reported by animationstart, and a cancelled entry is parked (no read) until its replacement reports in.
    const scan = (mode) => {
        const full = mode === "full"
        const safety = mode === "safety"
        const els = lanes().concat(dustEls())
        if (full) {
            AN.map.clear()
            AN.empty = new WeakSet()
            AN.bodyDirty = true
        }
        const keep = new Set(els)
        for (const el of AN.map.keys()) if (!keep.has(el) || !el.isConnected) AN.map.delete(el)
        const todo = []
        for (const el of els) {
            const c = AN.map.get(el)
            if (full || AN.dirty.has(el) || (!c && (safety || !AN.empty.has(el))) || (safety && c && !c.some(live))) todo.push(el)
            else if (c && !c.some(live)) {
                AN.map.delete(el)
                AN.empty.add(el)
            }
        }
        if (todo.length) collect(todo)
        AN.dirty.clear()
        if (safety && S.pacer !== "own" && !S.gathered && (!AN.body || !live(AN.body))) AN.bodyDirty = true
        if (AN.bodyDirty) {
            AN.bodyDirty = false
            collectBody()
        }
    }
    const onAnimStart = (e) => {
        const n = String(e.animationName || "")
        if (DOT_ANIM.test(n)) AN.dirty.add(e.target)
        else if (BODY_ANIM.test(n) && e.target === body()) {
            AN.bodyDirty = true
            S.needSync = 3
        } else return
        schedule()
    }
    // Rates follow the target every tick from the cache (property reads/writes only). force = full re-read.
    const applyRates = (force) => {
        if (!S.alive || !canAnim) return
        const t = now()
        const base = rate()
        S.rate = +base.toFixed(3)
        if (S.calm) return // calm visuals / reduced motion: no dot animation runs, nothing to cache
        if (force) scan("full")
        else if (S.ticks % 16 === 0) scan("safety") // every 4 s
        else if (AN.dirty.size || AN.bodyDirty) scan("")
        const r = base * S.pulseK * S.kickK
        const rd = r * (t < S.gatherBoostUntil ? 2.6 : 1)
        const lanesOn = t >= S.burstUntil && !S.gathered
        for (const list of AN.map.values())
            for (const x of list) {
                if (x.lane && !lanesOn) continue
                if (!live(x)) continue
                setRate(x, x.lane ? r : rd)
            }
    }
    const laneAnims = () => {
        const out = []
        for (const list of AN.map.values()) for (const x of list) if (x.lane && live(x)) out.push(x)
        return out
    }

    // ---------------------------------------------------------------- one measured centre (C1)
    // Measured WITHOUT forcing layout: the core, the flow root, the Pixar rig, each game's cinema-dust box and 109's
    // star tiles are (re-)observed by an IntersectionObserver, whose first entry for a target carries its
    // boundingClientRect as computed by the browser's own rendering update (layout already clean). The answer arrives
    // a frame later and only style writes follow. (No IntersectionObserver: the same maths on getBoundingClientRect.)
    const pctIn = (r, cx, cy) => (!r || r.width < 1 || r.height < 1 ? null : [((cx - r.left) / r.width) * 100, ((cy - r.top) / r.height) * 100])
    const measureTargets = () => {
        const c = core()
        if (!c) return null
        const px = pxRoot()
        const rig = px ? px.querySelector(".tsPxRig") : null
        const st = stageEl()
        const dusts = st ? Array.from(st.querySelectorAll(".cinemaDust")) : []
        const spaces = st ? Array.from(st.querySelectorAll(".cleanseSpace")) : []
        // a game's centrepiece (play only): [data-eos-focus] (opt-in), or a legacy one (39 .blackHole, 109 .lotusCore)
        let focus = null
        if (st && S.stage === "play")
            try {
                focus = st.querySelector(EOS_DOTS_FOCUS_SEL)
            } catch {
                focus = null
            }
        // a .cinemaDust is static: its dots are placed in its parent's box (.cinematicStageFX, verified in every game)
        const boxOf = (d) => d.parentElement || d
        return { c, rig, dusts, spaces, boxOf, focus, all: [root, rig, focus, ...dusts.map(boxOf), ...spaces].filter(Boolean) }
    }
    // rect(el) → {left, top, width, height} in viewport px
    const applyMeasure = (T, rect) => {
        if (!S.alive || !root.isConnected) return
        const rb = rect(root)
        if (!rb || rb.width < 1 || rb.height < 1) return
        // the Still Point: the core's own CSS spot (50 % / 52 % of the field) — or, during play, the centre of the
        // game's focal anchor when it is a real on-stage element (the core glides there; every layer follows)
        let cx = rb.left + (rb.width * EOS_DOTS_CX) / 100
        let cy = rb.top + (rb.height * EOS_DOTS_CY) / 100
        let focused = false
        const fr = T.focus && S.stage === "play" ? rect(T.focus) : null
        if (fr && fr.width >= 24 && fr.height >= 24) {
            const fx = fr.left + fr.width / 2
            const fy = fr.top + fr.height / 2
            if (fx > rb.left + 8 && fx < rb.left + rb.width - 8 && fy > rb.top + 8 && fy < rb.top + rb.height - 8) {
                cx = fx
                cy = fy
                focused = true
            }
        }
        S.centre = { x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10 }
        const own = pctIn(rb, cx, cy)
        if (focused !== S.focus) {
            S.focus = focused
            if (focused) root.setAttribute("data-eos-focus-on", "1")
            else root.removeAttribute("data-eos-focus-on")
        }
        setVar(root, "--eos-fx", focused ? `${own[0].toFixed(2)}%` : "")
        setVar(root, "--eos-fy", focused ? `${own[1].toFixed(2)}%` : "")
        // the lanes' px origin: fractions of the field + its px size (fallback for browsers without cqw / cqh)
        setVar(root, "--eos-cxf", (own[0] / 100).toFixed(4))
        setVar(root, "--eos-cyf", (own[1] / 100).toFixed(4))
        setVar(root, "--eos-wpx", `${Math.round(rb.width)}px`)
        setVar(root, "--eos-hpx", `${Math.round(rb.height)}px`)
        const writes = [[root, own]]
        let rigPct = null
        if (T.rig) {
            rigPct = pctIn(rect(T.rig), cx, cy)
            writes.push([T.rig, rigPct])
        }
        T.dusts.forEach((d) => writes.push([d, pctIn(rect(T.boxOf(d)), cx, cy)]))
        T.spaces.forEach((sp) => writes.push([sp, pctIn(rect(sp), cx, cy)]))
        for (const [el, p] of writes) {
            if (!p) continue
            setVarAny(el, "--eos-cx", `${p[0].toFixed(2)}%`)
            setVarAny(el, "--eos-cy", `${p[1].toFixed(2)}%`)
        }
        // lane tails point away from the centre (needs the stage's px aspect and the centre in use)
        const aspect = +(rb.width / rb.height).toFixed(3)
        const key = `${aspect}|${own[0].toFixed(1)}|${own[1].toFixed(1)}`
        if (key !== S.laneKey || !S.aspect) {
            S.laneKey = key
            S.aspect = aspect
            lanes().forEach((lane) => {
                const x = parseFloat(lane.style.getPropertyValue("--x"))
                const y = parseFloat(lane.style.getPropertyValue("--y"))
                if (!Number.isFinite(x) || !Number.isFinite(y)) return
                const ang = (Math.atan2((y - own[1]) * rb.height, (x - own[0]) * rb.width) * 180) / Math.PI
                lane.style.setProperty("--ta", `${ang.toFixed(1)}deg`)
            })
        }
        // bokeh: a quarter of the way home, gliding over 60 s (C3). Not in calm visuals.
        if (T.rig && rigPct) {
            T.rig.querySelectorAll(".tsPxBokeh").forEach((b) => {
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
    let io = null
    let ioBatch = null
    try {
        if (typeof IntersectionObserver === "function")
            io = new IntersectionObserver((entries) => {
                const B = ioBatch
                if (!B || !S.alive) return
                for (const e of entries) if (B.need.has(e.target)) B.rects.set(e.target, e.boundingClientRect)
                for (const el of B.need) if (!B.rects.has(el)) return
                ioBatch = null
                for (const el of B.need) io.unobserve(el)
                applyMeasure(B.T, (el) => B.rects.get(el))
            })
    } catch {
        io = null
    }
    const measure = () => {
        if (!S.alive || !root.isConnected) return
        const T = measureTargets()
        if (!T) return
        if (!io) return applyMeasure(T, (el) => el.getBoundingClientRect())
        if (ioBatch) for (const el of ioBatch.need) io.unobserve(el)
        ioBatch = { T, need: new Set(T.all), rects: new Map() }
        for (const el of ioBatch.need) {
            try {
                io.unobserve(el)
                io.observe(el) // → one entry with the element's rect at the next rendering update
            } catch {}
        }
    }
    const setVarAny = (el, k, v) => {
        if (el === root) return setVar(root, k, v)
        try {
            if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v)
        } catch {}
    }
    // after a stage change / resize the layout is still settling (a game mounting lays out for a few frames): measure
    // again at the next idle moments so the centre reflects where things land
    const idle = (f) => {
        if (typeof requestIdleCallback !== "function") return f()
        const id = requestIdleCallback(
            () => {
                S.idleIds = S.idleIds.filter((x) => x !== id)
                f()
            },
            { timeout: 500 }
        )
        S.idleIds.push(id)
    }
    const measureSoon = () => {
        if (!S.ready) return // (the ResizeObserver's initial call at mount: the first idle pass measures)
        S.measureTs.forEach(clearTimeout)
        S.measureTs = [0, 700, 1600].map((ms) => setTimeout(() => idle(measure), ms))
    }

    // ---------------------------------------------------------------- the pacer, rendered (B4)
    // The core body's scale is MODELLED, never read back: the autonomous CSS breath is locked to the shared clock and
    // owned phases are CSS transitions this controller starts. Both hand-overs use the model so the light never jumps
    // and no style is flushed inside a game's eosBreathOwn() call.
    const seg = { from: 1, to: 1, t0: 0, ms: 0, out: false } // the owned transition in flight
    const bodyScaleNow = (t) => {
        if (S.pacer === "own") {
            const k = seg.ms ? eosClamp((t - seg.t0) / seg.ms, 0, 1) : 1
            return seg.from + (seg.to - seg.from) * (seg.out ? k : eosDotsBezier(0.3, 0.55, 0.4, 1, k))
        }
        if (S.pacer === "auto" && !spark()) return eosDotsBreathAt(t)[0]
        return 1
    }
    const resyncBreath = () => {
        const b = body()
        if (!b) return
        if (!canAnim) {
            // no Web Animations: the spec's negative-delay sync against the shared performance.now() clock
            b.style.animationDelay = `${-(now() % EOS_DOTS_CYCLE)}ms`
            return
        }
        const x = AN.body // cached (no style flush); re-read only when its animationstart reports a new one
        if (!x || !live(x)) return
        // start time = −delay on the document timeline ⇒ active time = performance.now() ⇒ iteration progress =
        // (t mod duration) = the pacer clock (the breath's 10 s cycle, or the beat's 60000/bpm ms). The delay is the
        // one this controller wrote inline (read back from the style attribute: no flush).
        try {
            const d = parseFloat(b.style.animationDelay)
            const want = -(Number.isFinite(d) ? d : x.dl)
            const a = x.a
            if (a.playbackRate === 1 && (a.startTime == null || Math.abs(a.startTime - want) > 0.5)) a.startTime = want
        } catch {}
    }
    const pacerRender = () => {
        if (!S.alive) return
        const c = core()
        const b = body()
        if (!c || !b) return
        const t = now()
        const ph = eosBreathPhase()
        const mode = ph.bpm ? "beat" : ph.owned ? "own" : "auto"
        const phase = mode === "beat" ? "beat" : ph.phase
        const prev = S.pacer
        // the same phase owned again (111's "one more sip": in → in) restarts the owner's clock
        const renew = mode === "own" && prev === "own" && phase === S.phase && ph.p + 0.02 < S.phaseP
        S.phaseP = ph.p
        if (mode === prev && mode !== "own") {
            // the free-running CSS cycle needs no restart: the clock's in ↔ out flips only re-label the core (touching
            // animation-delay here would shift the running breath until the next re-sync)
            if (phase !== S.phase) {
                S.phase = phase
                c.setAttribute("data-phase", phase)
            }
            if (mode === "beat") {
                const ms = `${Math.round(ph.ms)}ms`
                if (c.style.getPropertyValue("--eos-beat-ms") !== ms) {
                    // a new tempo: restart the beat on the shared beat clock
                    c.style.setProperty("--eos-beat-ms", ms)
                    b.style.animationDelay = `${-(t % Math.max(1, ph.ms))}ms`
                    S.needSync = 3
                    schedule()
                }
            }
            return
        }
        if (mode === prev && phase === S.phase && !renew) return
        const from = bodyScaleNow(t) // the model's value BEFORE this change
        const smooth = !S.calm && !S.gathered && prev !== ""
        S.pacer = mode
        S.phase = phase
        if (mode === "own") {
            S.sip = phase === "in" && (renew || (S.sip && prev === "own")) // a top-up swells a little further
            const ms = Math.max(120, Math.round(ph.ms || 0))
            const to = S.sip ? 1.19 : EOS_DOTS_OWN_SCALE[phase] || 1
            Object.assign(seg, { from, to, t0: t + 33, ms, out: phase === "out" })
            if (prev !== "own" && smooth) {
                // freeze the CSS breath where the model says it is; two frames later the owned transition starts there
                b.style.transition = "none"
                b.style.scale = from.toFixed(4)
                b.style.opacity = (prev === "auto" && !spark() ? eosDotsBreathAt(t)[1] : 0.95).toFixed(3)
                raf(() =>
                    raf(() => {
                        if (!S.alive || S.pacer !== "own") return
                        b.style.transition = ""
                        b.style.scale = ""
                        b.style.opacity = ""
                    })
                )
            }
            c.style.setProperty("--eos-breath-ms", `${ms}ms`)
            if (S.sip) c.setAttribute("data-sip", "1")
            else c.removeAttribute("data-sip")
            c.setAttribute("data-pacer", "own")
            c.setAttribute("data-phase", phase)
            return
        }
        // auto / beat: the CSS cycle resumes locked to the shared clock (negative delay now, exact start time next tick)
        S.sip = false
        c.removeAttribute("data-sip")
        b.style.transition = ""
        b.style.scale = ""
        b.style.opacity = ""
        b.style.animationDelay = `${-(t % (mode === "beat" ? Math.max(1, ph.ms) : EOS_DOTS_CYCLE))}ms`
        // a released game beat (117) must not leave its tempo behind: the spark states' own pulse is 72 bpm
        c.style.setProperty("--eos-beat-ms", `${Math.round(mode === "beat" ? ph.ms : 60000 / (EOS_BREATH.beatBpm || 72))}ms`)
        c.setAttribute("data-pacer", mode)
        c.setAttribute("data-phase", phase)
        S.needSync = 3
        schedule()
        const hand = handEl()
        if (prev === "own" && smooth && hand) {
            // hand the light back without a pop: the inner layer carries (owned ÷ clock) and relaxes to 1
            const to = mode === "auto" && !spark() ? eosDotsBreathAt(t)[0] : 1
            const ratio = from / Math.max(0.2, to)
            if (Math.abs(ratio - 1) > 0.01) {
                clearTimeout(S.handT)
                hand.style.transition = "none"
                hand.style.scale = ratio.toFixed(4)
                raf(() =>
                    raf(() => {
                        if (!S.alive) return
                        hand.style.transition = "scale .9s cubic-bezier(.45,0,.2,1)"
                        hand.style.scale = "1"
                        S.handT = setTimeout(() => {
                            hand.style.transition = ""
                            hand.style.scale = ""
                        }, 1000)
                    })
                )
            }
        }
    }

    // ---------------------------------------------------------------- gather / bloom / burst
    // The rush home drives the lanes' OWN running animations (no animation is swapped or re-created, so nothing
    // snaps and nothing goes back to pending): each lane gets the playback rate that brings it from where it is to
    // the light in exactly GATHER_MS — every dot arrives together, accelerating along its own spiral (the
    // lane keyframes ease in) — then it sinks into the light at a crawl until the field re-flows.
    const GATHER_MS = 900
    const GATHER_AT = 0.9 // iteration progress just past the centre (scale ≈ .02, fading into the light)
    const gather = (src = "auto") => {
        if (!S.alive || S.gathered) return
        S.gathered = true
        S.gatherSrc = src
        S.gatherAt = now()
        clearTimeout(S.gatherT)
        // an API gather (a game's big moment) is one-shot: the dust re-flows unless the game has just finished
        if (src === "api") S.gatherT = setTimeout(() => S.gathered && S.gatherSrc === "api" && ungather(true), 1700)
        if (!S.calm && canAnim) {
            const rush = laneAnims().filter((x) => x.started)
            for (const x of rush) {
                let p = 0
                try {
                    p = Number(x.a.effect.getComputedTiming().progress) || 0 // no style flush
                } catch {}
                const rest = Math.max(0, GATHER_AT - p)
                try {
                    x.a.playbackRate = x.req = Math.max(0.02, (rest * (x.D || 18000)) / GATHER_MS)
                } catch {}
            }
            S.gatherBoostUntil = now() + GATHER_MS
            clearTimeout(S.boostT)
            S.boostT = setTimeout(() => {
                if (S.gathered)
                    for (const x of rush) {
                        try {
                            if (x.a.playbackRate > 0) x.a.playbackRate = x.req = 0.02
                        } catch {}
                    }
                schedule()
            }, GATHER_MS + 20)
        }
        // calm visuals: no rush, no bloom — the core only brightens softly (opacity cross-fade)
        root.classList.add(S.calm ? "eosGatherCalm" : "eosGather")
        applyRates()
    }
    const ungather = (fade) => {
        if (!S.gathered) return
        S.gathered = false
        S.gatherSrc = ""
        S.gatherBoostUntil = 0
        clearTimeout(S.gatherT)
        clearTimeout(S.boostT)
        root.classList.remove("eosGather", "eosGatherCalm")
        S.needSync = 3 // the bloom replaced the breath animation: lock the new one to the clock
        if (fade && !S.calm && canAnim) {
            // every dot sat in the light: spread them back along their runs and let them fade in there
            laneAnims().forEach((x, i) => {
                if (!x.started) return
                try {
                    x.a.currentTime = (6 + ((i * 0.6180339887 + 0.13) % 1) * 0.8) * (x.D || 18000) + x.dl
                } catch {}
            })
            root.classList.add("eosFlowIn")
            clearTimeout(S.flowInT)
            S.flowInT = setTimeout(() => root.classList.remove("eosFlowIn"), 1400)
        }
        // (the reveal follows with the burst instead, which flings them out of the light)
        schedule() // the next pass hands every lane its forward rate back
    }
    const burst = () => {
        if (!S.alive || S.calm) return
        root.classList.add("eosBurst")
        clearTimeout(S.burstT)
        S.burstT = setTimeout(() => root.classList.remove("eosBurst"), 1100)
        if (!canAnim) return
        const T = 900
        S.burstUntil = now() + T + 40
        // every lane jumps to the end of its run (at the centre) and plays BACKWARDS to a random point on its way in:
        // the dust is flung out of the Still Point once, then turns round and keeps coming home
        const flung = laneAnims().filter((x) => x.started)
        flung.forEach((x, i) => {
            try {
                const D = x.D || 18000
                const p0 = 0.985
                const p1 = 0.16 + eosNoise(i, 11) * 0.52
                x.a.currentTime = (4 + p0) * D + x.dl
                x.a.playbackRate = x.req = -((p0 - p1) * D) / T
            } catch {}
        })
        clearTimeout(S.burstEndT)
        S.burstEndT = setTimeout(() => {
            S.burstUntil = 0
            // turn them round right on time (a slow frame must not let them overshoot), then the tick takes over
            const r = rate() * S.pulseK
            flung.forEach((x) => {
                try {
                    if (x.a.playbackRate < 0) x.a.playbackRate = x.req = r
                } catch {}
            })
            schedule()
        }, T + 60)
    }

    // ---------------------------------------------------------------- pulse (games: inhale / big success)
    const pulse = (kind) => {
        if (!S.alive || S.calm) return
        const out = kind === "out"
        root.classList.remove("eosPulseIn", "eosPulseOut")
        raf(() => S.alive && root.classList.add(out ? "eosPulseOut" : "eosPulseIn")) // re-add next frame = restart, no reflow
        S.pulseK = out ? -1 : 3
        if (!out) {
            // speed up right away on the cached animations (no style read); the next tick re-asserts every rate
            const r3 = rate() * 3
            for (const x of laneAnims()) if (x.a.playbackRate > 0) setRate(x, r3)
        }
        schedule()
        clearTimeout(S.pulseT)
        S.pulseT = setTimeout(() => {
            S.pulseK = 1
            root.classList.remove("eosPulseIn", "eosPulseOut")
            schedule()
        }, 1200)
    }

    // ---------------------------------------------------------------- dial micro-feedback (setLevel)
    // The mirrored rate alone moves a dot ≈ 15 px/s even at 9, too little to answer a dial tap. Each step therefore
    // gets an instant, short answer that settles back to the mirrored rate: a surge scaled by the step when the feeling
    // gets louder, a brief hush when it gets quieter, and a twinkle of the Still Point's ring either way.
    const KICK_MS = 420
    const kick = (dl) => {
        if (!S.alive || S.calm || !dl) return
        S.kickK = dl > 0 ? 1 + Math.min(2.4, 0.6 * dl) : Math.max(0.35, 1 + 0.16 * dl)
        if (canAnim && S.kickK > 1) {
            // answer in this frame on the cached animations (no style read); the next pass re-asserts every rate
            const r = rate() * S.pulseK * S.kickK
            for (const x of laneAnims()) if (x.a.playbackRate > 0 && t0ok()) setRate(x, r)
        }
        root.classList.remove("eosTwinkle")
        raf(() => S.alive && root.classList.add("eosTwinkle")) // re-add next frame = restart, no reflow
        clearTimeout(S.twinkT)
        S.twinkT = setTimeout(() => root.classList.remove("eosTwinkle"), 700)
        clearTimeout(S.kickT)
        S.kickT = setTimeout(() => {
            S.kickK = 1
            // settle right on time (a slow frame must not stretch the surge); the next pass re-asserts every rate
            if (canAnim && S.alive && !S.calm && t0ok()) {
                const r = rate() * S.pulseK
                for (const x of laneAnims()) if (x.a.playbackRate > 0) setRate(x, r)
            }
            schedule()
        }, KICK_MS)
        schedule()
    }
    const t0ok = () => now() >= S.burstUntil && !S.gathered

    // ---------------------------------------------------------------- audio bed (F8, P2)
    const bedWant = () => {
        const st = EOS_STORE.get()
        const hidden = typeof document !== "undefined" && document.hidden
        // §5.2: during the check-in (the EOS home screen, not the classic "just let me play" composer) and play;
        // silent in the reveal, while the arcade's music plays, with sound off, or in a background tab
        const where = S.stage === "play" || (S.stage === "input" && st.phase === "checkin" && st.checkinEnabled !== false)
        return S.alive && S.bed.armed && !hidden && where && !!st.sound && !st.music && !eosBurstOn()
    }
    const bedStart = () => {
        const B = S.bed
        if (B.on) return
        if (B.src && B.gain) {
            // still fading out: take the same voice back up (one source at a time — never orphan a playing node)
            clearTimeout(B.stopT)
            B.on = true
            return
        }
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
        if (!B.src || !B.gain) return
        if (!B.on && fadeMs > 0) return // already fading out
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
            if (B.src === src) {
                B.src = null
                B.gain = null
            }
        }
        if (fadeMs <= 0) kill()
        else B.stopT = setTimeout(kill, fadeMs + 60)
    }
    const bedUpdate = () => {
        if (!bedWant()) return bedStop()
        bedStart()
        const B = S.bed
        if (!B.on) return
        // a context created before the first activating gesture stays suspended: keep asking (only a gesture can
        // actually resume it — see arm(); elsewhere this is a harmless no-op)
        if (B.ctx && B.ctx.state === "suspended")
            try {
                B.ctx.resume().catch(() => {})
            } catch {}
        const ph = eosBreathPhase()
        const p = eosClamp(ph.p, 0, 1)
        const shape = ph.phase === "in" ? 0.5 - 0.5 * Math.cos(Math.PI * p) : ph.phase === "hold" ? 1 : ph.phase === "out" ? 1 - p : ph.phase === "beat" ? 0.55 : 0.5
        const target = Math.min(EOS_DOTS_BED_MAX, 0.006 + 0.018 * shape)
        B.gainNow = +target.toFixed(4)
        try {
            B.gain.gain.setTargetAtTime(target, B.ctx.currentTime, 0.12)
        } catch {}
    }
    // Unlock: on touch devices only pointerup / touchend / click (and keydown) are user-activation events — pointerdown
    // and touchstart are not — so the bed listens to all of them and stays armed until the shared context RUNS.
    const ARM_EVENTS = ["pointerdown", "pointerup", "touchstart", "touchend", "click", "keydown"]
    const arm = () => {
        if (!S.alive) return
        S.bed.armed = true
        let ctx = null
        try {
            ctx = eosAudio() // creates / resumes the shared context inside the gesture (null while sound is off)
        } catch {}
        if (ctx && ctx.state === "running") unarm()
        else if (ctx)
            try {
                ctx.resume()
                    .then(() => S.alive && ctx.state === "running" && unarm())
                    .catch(() => {})
            } catch {}
        bedUpdate()
    }
    const unarm = () => {
        if (typeof window === "undefined") return
        ARM_EVENTS.forEach((ev) => window.removeEventListener(ev, arm, true))
    }
    if (typeof window !== "undefined") ARM_EVENTS.forEach((ev) => window.addEventListener(ev, arm, { capture: true, passive: true }))
    const onVis = () => bedUpdate()
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis)
    // sound / music / phase toggles answer at once (the 4 Hz pass keeps following the breath)
    const unsubStore = EOS_STORE.subscribe(() => {
        paintVars()
        bedUpdate()
    })

    // ---------------------------------------------------------------- the 4 Hz loop
    // progress + feeling → the light's variables (style writes only: also called straight from store changes, so the
    // core takes the feeling's colour in the same frame as the check-in tap)
    const paintVars = () => {
        if (!S.alive) return
        const st = EOS_STORE.get()
        const p = S.progress
        setVar(root, "--eos-p", (p / 100).toFixed(3))
        const emo = st.emotion || st.detected
        const hp = eosDotsHuePath(emo)
        setVar(root, "--eos-h", String(Math.round((((hp.h0 + hp.d * (p / 100)) % 360) + 360) % 360)))
        // numb (greyLoud): the light starts flat grey and the colour comes back as the game moves (R6)
        setVar(root, "--eos-sat", EOS_EMO[emo] && EOS_EMO[emo].greyLoud ? `${Math.round(16 + 84 * (p / 100))}%` : "100%")
    }
    const tick = (force) => {
        if (!S.alive || !root.isConnected) return
        // GAP R1: while the approved burst is mounted the whole flow is hidden by the burst gate — skip the work
        // (the bed ducks through bedWants) and pick up again on the first tick after it
        if (eosBurstOn()) {
            bedUpdate()
            return
        }
        const st = EOS_STORE.get()
        const sEl = stageEl()
        let p = 0
        if (S.stage === "play") {
            const v = sEl ? eosProgressOf(sEl) : null
            p = v == null ? 0 : eosClamp(v, 0, 100)
            const done = !!(sEl && sEl.querySelector(".globalPlayGuide.isComplete"))
            if (!done) S.gatherLatch = false // (a new finish edge may gather again)
            if (done && !S.gathered && !S.gatherLatch) gather("auto")
            else if (done && S.gatherSrc === "api") {
                S.gatherSrc = "auto" // the finish arrived during a one-shot
                S.gatherAt = now()
            } else if (!done && S.gathered && S.gatherSrc === "auto" && p < 100) ungather(true) // a new round began
            else if (S.gathered && S.gatherSrc === "auto" && now() - S.gatherAt > 6000) {
                // finished but the reveal never came (a game hanging on its finish): never leave a frozen field —
                // the dust re-flows at the calm finishing rate; the next finish edge gathers it again
                S.gatherLatch = true
                ungather(true)
            }
        } else if (S.stage === "reveal") p = 100
        S.progress = p
        paintVars()
        const L = level()
        const jitter = !S.calm && L >= 7 && S.stage !== "reveal" && !S.gathered && S.progress < 50
        if (root.classList.contains("eosJitter") !== jitter) root.classList.toggle("eosJitter", jitter)
        const hi = jitter && L >= 9 // 9-10: a bigger wobble (±3.5 px instead of ±2)
        if (root.classList.contains("eosJitterHi") !== hi) root.classList.toggle("eosJitterHi", hi)
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
        applyRates(force) // (+ its own 4 s safety-net scan for dots that never reported in)
        pacerRender()
        if (S.pacer !== "own" && (S.needSync > 0 || S.ticks % 8 === 0)) {
            // a hand-back re-creates the breath animation: read it in the first pass after that frame (style is clean
            // here) instead of waiting a frame more for its animationstart, so the light locks to the clock at once
            if (S.needSync > 0 && !S.calm && !S.gathered && !(AN.body && live(AN.body))) collectBody()
            resyncBreath()
            if (S.needSync > 0) S.needSync--
        }
        bedUpdate()
    }

    // ---------------------------------------------------------------- frame-scheduled work
    // Everything that reads layout or animations runs right after a painted frame (rAF → after-paint task), when the
    // frame's own style + layout pass has just run: the reads are free and the writes land in the next frame's pass.
    const want = { measure: false, force: false }
    const frame = () => {
        S.raf = 0
        if (!S.alive || !root.isConnected) return
        if (eosBurstOn()) {
            // GAP R1: no frame work under the burst; the pending measure / force flags wait for it
            setTimeout(() => schedule(), 150)
            return
        }
        const t0 = now()
        const m = want.measure
        const f = want.force
        want.measure = want.force = false
        if (m) measure()
        const t1 = now()
        if (S.pendingBurst) {
            // the reveal re-creates the lane animations (gather → flow): read them once now (one batched read in the
            // after-paint slot of the frame that created them; later ones report in through animationstart) and
            // burst as soon as they have started — so the burst fires with the reveal, not frames later
            if (!S.burstRead && !laneAnims().length) {
                S.burstRead = true
                collect(lanes())
            }
            if (laneAnims().some((x) => x.started) || S.calm || t1 > S.burstBy) {
                S.pendingBurst = false
                burst()
            } else schedule()
        }
        if (S.pendingGather) {
            S.pendingGather = false
            gather("api")
        }
        tick(f)
        const t2 = now()
        const dt = t2 - t0
        const P = S.perf
        P.frameN++
        P.frameMs += dt
        if (dt > P.frameMax) {
            P.frameMax = dt
            P.maxAt = `${S.stage}:${t1 - t0 >= t2 - t1 ? "measure" : f ? "tick+force" : "tick"}`
        }
    }
    const schedule = (o) => {
        if (o && o.measure) want.measure = true
        if (o && o.force) want.force = true
        if (!S.raf && S.alive) S.raf = raf(() => afterPaint(frame))
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
            S.kickK = 1
            root.classList.remove("eosJitter", "eosJitterHi", "eosPulseIn", "eosPulseOut", "eosFlowIn", "eosBurst", "eosTwinkle")
        }
        if (S.gathered) {
            root.classList.remove("eosGather", "eosGatherCalm")
            root.classList.add(S.calm ? "eosGatherCalm" : "eosGather")
        }
        S.needSync = 3
        // re-created dot animations report in through animationstart; the bokeh vars follow at the next measure
        measureSoon()
        schedule()
    }

    // ---------------------------------------------------------------- stage
    const setStage = (stage) => {
        const prev = S.stage
        S.stage = String(stage || "input")
        S.levelOv = null
        if (S.stage !== "play" && S.gathered) ungather(S.stage !== "reveal")
        if (S.stage === "reveal" && prev !== "reveal") {
            S.pendingBurst = true
            S.burstRead = false
            S.burstBy = now() + 1500
        }
        if (S.stage === "play" && prev !== "play") S.progress = 0
        if (S.stage !== "play") S.gatherLatch = false
        S.needSync = 3
        if (!S.ready) return schedule() // mount: the first idle pass measures and reads everything
        measureSoon() // (new cinema dust reports in through animationstart; no full re-read needed)
        schedule()
    }

    // ---------------------------------------------------------------- wiring
    const intTick = setInterval(() => schedule(), 250) //                 4 Hz: progress, rate, pacer, audio
    const intMeasure = setInterval(() => S.ready && measure(), 1000) // 1 Hz: the measured centre (no layout read)
    let ro = null
    try {
        if (typeof ResizeObserver !== "undefined") {
            // the flow root's content box (layout px, free in the observer) → the phone lane count (18 below 600 px)
            ro = new ResizeObserver((entries) => {
                for (const e of entries) {
                    if (e.target !== root) continue
                    const w = e.contentRect ? e.contentRect.width : 0
                    const narrow = w > 0 && w < 600
                    if (narrow !== S.narrow) {
                        S.narrow = narrow
                        try {
                            opts.onNarrow?.(narrow)
                        } catch {}
                    }
                }
                measureSoon()
            })
            const st = stageEl()
            if (st) ro.observe(st)
            ro.observe(root)
        }
    } catch {}
    const onResize = () => measureSoon()
    if (typeof window !== "undefined") window.addEventListener("resize", onResize)
    const unsubPacer = EOS_PACER.subscribe(() => pacerRender())
    // every dot animation the browser creates reports in here (lanes, Pixar motes, each new game's cinema dust)
    AN.host = pxRoot() || arcadeEl() || stageEl()
    try {
        AN.host && AN.host.addEventListener("animationstart", onAnimStart, true)
    } catch {}
    pacerRender()
    // the first measure + full read wait for the first idle moment after mount (the page is still laying itself
    // out then; until it lands every layer already aims at the nominal centre through the CSS defaults)
    const ric = typeof requestIdleCallback === "function" ? requestIdleCallback : null
    const first = () => {
        S.idleT = 0
        S.ready = true
        schedule({ measure: true, force: true })
    }
    S.idleT = ric ? ric(first, { timeout: 900 }) : setTimeout(first, 300)

    const destroy = () => {
        S.alive = false
        if (S.raf) caf(S.raf)
        posted = null
        if (chan)
            try {
                chan.port1.onmessage = null
                chan.port1.close()
                chan.port2.close()
            } catch {}
        clearTimeout(S.gatherT)
        if (S.idleT) {
            try {
                ric ? cancelIdleCallback(S.idleT) : clearTimeout(S.idleT)
            } catch {}
        }
        try {
            S.idleIds.forEach((id) => cancelIdleCallback(id))
        } catch {}
        S.idleIds = []
        try {
            AN.host && AN.host.removeEventListener("animationstart", onAnimStart, true)
        } catch {}
        AN.map.clear()
        AN.dirty.clear()
        AN.body = null
        clearInterval(intTick)
        clearInterval(intMeasure)
        S.measureTs.forEach(clearTimeout)
        clearTimeout(S.pulseT)
        clearTimeout(S.kickT)
        clearTimeout(S.twinkT)
        clearTimeout(S.burstT)
        clearTimeout(S.burstEndT)
        clearTimeout(S.boostT)
        clearTimeout(S.flowInT)
        clearTimeout(S.handT)
        try {
            ro && ro.disconnect()
            io && io.disconnect()
        } catch {}
        ioBatch = null
        if (typeof window !== "undefined") window.removeEventListener("resize", onResize)
        if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis)
        unarm()
        try {
            unsubPacer()
            unsubStore()
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
            kick: S.kickK,
            focus: S.focus,
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
            perf: { frames: S.perf.frameN, avgMs: S.perf.frameN ? +(S.perf.frameMs / S.perf.frameN).toFixed(2) : 0, maxMs: +S.perf.frameMax.toFixed(2), maxAt: S.perf.maxAt },
            audio: { armed: S.bed.armed, playing: S.bed.on, gain: S.bed.on ? S.bed.gainNow : 0, ctx: S.bed.ctx ? S.bed.ctx.state : null },
            cache: { elements: AN.map.size, lanes: laneAnims().length, body: !!(AN.body && live(AN.body)) },
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
            S.aspect = 0 // lanes re-rendered / straightened: re-aim their tails at the next measure
            S.laneKey = ""
            S.needSync = 3
            measureSoon()
            schedule()
        },
        setLevel(n) {
            const st = EOS_STORE.get()
            const before = S.alive ? level() : 0
            if (n == null || n === "" || !Number.isFinite(Number(n))) S.levelOv = null
            else {
                S.levelOv = eosClamp(Number(n), 0, 10)
                S.levelPhase = st.phase
                S.levelStage = S.stage
            }
            if (S.alive && S.levelOv != null) kick(S.levelOv - before)
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
    const n = calm ? 10 : narrow ? 18 : 28 // (28 on desktop keeps the steady-state animated-node budget ≤ 60)
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
                        "--xf": (p.x / 100).toFixed(4),
                        "--yf": (p.y / 100).toFixed(4),
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
        EOS_DOTS_LIVE.ctls.add(ctl)
        return () => {
            ctl.destroy()
            EOS_DOTS_LIVE.ctls.delete(ctl) // only this instance's entry: any other mounted field keeps answering
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
            data-eos-narrow={narrow ? "1" : undefined}
            aria-hidden="true"
        >
            <i className="eosCore">
                <i className="eosCoreHalo" />
                <i className="eosCoreRays" />
                <i className="eosCoreBody">
                    <i className="eosCoreHand">
                        <i className="eosCoreGlow" />
                        <i className="eosCoreFlash" />
                        <i className="eosCoreSpark" />
                    </i>
                </i>
                <i className="eosCoreRing" />
                <i className="eosCoreWave" />
            </i>
            {lanes}
        </div>
    )
}

// ---------------------------------------------------------------- CSS
// The lane run (scale 1 → 0 + rotate around the measured centre) and its cosmetic variants. Per-dot effects live IN the
// lane's own keyframes (opacity / filter stops that touch neither scale nor rotate), so a dust style never adds an
// animated node: fireflies blink (opacity), aurora shimmer (hue-rotate), gold glints (brightness flashes).
function eosDotsLaneKeyframes(name, stops) {
    const at = new Map([
        [0, ["scale:1", "rotate:0deg", "opacity:0", "animation-timing-function:cubic-bezier(.33,0,.8,.45)"]],
        [9, ["opacity:1"]],
        [84, ["scale:.028", "rotate:calc(var(--sw,30deg) * .96)", "opacity:1", "animation-timing-function:linear"]],
        [100, ["scale:0", "rotate:var(--sw,30deg)", "opacity:0"]],
    ])
    for (const [o, decl] of stops || []) at.set(o, (at.get(o) || []).concat(decl))
    const body = Array.from(at.keys())
        .sort((a, b) => a - b)
        .map((o) => `${o}%{${at.get(o).join(";")}}`)
        .join("")
    return `@keyframes ${name}{${body}}`
}
const EOS_DOTS_LANE_KF = [
    eosDotsLaneKeyframes("eosDotsLane"),
    // fireflies: a slow blink (≈ 1.7-2.6 s at the base rate) between 9 % and 84 % of the run
    eosDotsLaneKeyframes(
        "eosDotsLaneFf",
        [15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81].map((o, i) => [o, [`opacity:${i % 2 ? 1 : 0.3}`, "animation-timing-function:ease-in-out"]])
    ),
    // aurora: the streak's hue drifts ±64° (≈ 3-4 s per swing)
    eosDotsLaneKeyframes(
        "eosDotsLaneAu",
        [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((o, i) => [o, [`filter:hue-rotate(${i % 2 ? 64 : 0}deg)`]])
    ),
    // gold (every 3rd lane): two short glints per run
    eosDotsLaneKeyframes(
        "eosDotsLaneGd",
        [
            [0, 1],
            [28, 1],
            [32, 2.4],
            [37, 1],
            [60, 1],
            [64, 2.4],
            [69, 1],
            [100, 1],
        ].map(([o, b]) => [o, [`filter:brightness(${b})`]])
    ),
].join("\n")
const EOS_DOTS_FIELD = `${EOS_A} .eosThoughtFlow`
const EOS_DOTS_CSS = `
@keyframes eosDotsX{84%,100%{left:var(--eos-cx,50%)}}
@keyframes eosDotsY{84%,100%{top:var(--eos-cy,50%)}}
@keyframes eosDotsFade{0%{opacity:0;scale:.6}12%{opacity:.85;scale:1}74%{opacity:.9;scale:1}86%{opacity:.55;scale:.45}93%{opacity:0;scale:.12}100%{opacity:0;scale:.1}}
@keyframes eosDotsTileIn{0%{scale:1.5;opacity:0}20%{opacity:.45}100%{scale:.6;opacity:0}}
${EOS_DOTS_LANE_KF}
@keyframes eosDotsBreathe{0%{scale:.86;opacity:.8;animation-timing-function:cubic-bezier(.37,0,.32,1)}40%{scale:1.1;opacity:1;animation-timing-function:linear}100%{scale:.86;opacity:.8}}
@keyframes eosDotsBeat{0%{scale:.95;opacity:.86;animation-timing-function:cubic-bezier(.2,.9,.3,1)}13%{scale:1.1;opacity:1;animation-timing-function:cubic-bezier(.5,0,.5,1)}32%{scale:.98;opacity:.9;animation-timing-function:cubic-bezier(.2,.9,.3,1)}44%{scale:1.04;opacity:.96;animation-timing-function:ease-in-out}100%{scale:.95;opacity:.86}}
@keyframes eosDotsAbsorb{0%{scale:.6;opacity:.5}100%{scale:1.1;opacity:0}}
@keyframes eosDotsBloom{0%{scale:1}30%{scale:.2}69%{scale:1.25}100%{scale:1}}
@keyframes eosDotsFlash{0%{opacity:0}30%{opacity:.2}66%{opacity:1}100%{opacity:.4}}
@keyframes eosDotsBurst{0%{scale:.3;opacity:.95}100%{scale:2.5;opacity:0}}
@keyframes eosDotsBurstWide{0%{scale:.3;opacity:1}55%{opacity:.8}100%{scale:3.4;opacity:0}}
@keyframes eosDotsBurstWideN{0%{scale:.3;opacity:1}55%{opacity:.8}100%{scale:4.3;opacity:0}}
@keyframes eosDotsTwinkle{0%{scale:.78;opacity:1}100%{scale:1.4;opacity:0}}
@keyframes eosDotsPulse{0%{opacity:0}25%{opacity:.75}100%{opacity:0}}
@keyframes eosDotsSpin{0%{rotate:0deg}100%{rotate:360deg}}
@keyframes eosDotsHue{0%{filter:hue-rotate(-38deg)}100%{filter:hue-rotate(38deg)}}
@keyframes eosDotsAppear{0%{opacity:0}100%{opacity:var(--eos-dot-o,.85)}}
@keyframes eosDotsJitter{0%{translate:-2px 1px}50%{translate:1.5px -2px}100%{translate:2px 1.5px}}
@keyframes eosDotsJitterHi{0%{translate:-3.5px 2px}50%{translate:3px -3.5px}100%{translate:3.5px 3px}}

/* ---------------- the field (first child of .releaseStage; z 0 inside the stage's stacking context) */
${EOS_DOTS_FIELD}{position:absolute;inset:0;z-index:0;display:block;pointer-events:none;overflow:hidden;contain:strict;--eos-cx:50%;--eos-cy:52%;--eos-p:0;--eos-h:190;--eos-sat:100%;--eos-dot-o:.85;--eos-core-size:min(36vmin,280px)}
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
   halo). Lighter and barely blurred — with a soft clear well around the Still Point so its light reads as an aura
   around the card, not as a brown wash under 52 % black — the dust visibly drifts home. */
${EOS_A} .releaseStage > .releaseCompleteOverlay{background:radial-gradient(circle at 50% 42%,rgba(0,218,255,.1),transparent 25%),radial-gradient(circle at 50% 42%,rgba(154,59,255,.06),transparent 43%),radial-gradient(circle farthest-corner at 50% 52%,rgba(0,3,8,.08) 0 15%,rgba(0,3,8,.3) 29%,rgba(0,3,8,.52) 48%)!important;-webkit-backdrop-filter:blur(2px) saturate(1.1)!important;backdrop-filter:blur(2px) saturate(1.1)!important}
${EOS_DOTS_FIELD}[data-stage="play"]{--eos-dot-o:.45}
${EOS_DOTS_FIELD}[data-stage="reveal"]{--eos-dot-o:.7}

/* ---------------- lanes: scale 1 → 0 around the measured centre = a straight line home; + rotate = a spiral */
/* a lane is a 0×0 box on its spawn point; its origin is the measured centre in px, so its compositor layer is
   dot-sized (not a full-stage layer). cqw/cqh = the field's own size; the px vars are the fallback. */
${EOS_DOTS_FIELD} .eosLane{position:absolute;left:var(--x);top:var(--y);width:0;height:0;transform-origin:calc((var(--eos-cxf,.5) - var(--xf,.5)) * var(--eos-wpx,100vw)) calc((var(--eos-cyf,.52) - var(--yf,.52)) * var(--eos-hpx,100vh));animation:var(--eos-lane-kf,eosDotsLane) var(--d,18s) linear var(--dl,0s) infinite;opacity:0}
@supports (width:1cqw){
  ${EOS_DOTS_FIELD}{container-type:size}
  ${EOS_DOTS_FIELD} .eosLane{transform-origin:calc((var(--eos-cxf,.5) - var(--xf,.5)) * 100cqw) calc((var(--eos-cyf,.52) - var(--yf,.52)) * 100cqh)}
}
/* intensity wobble (level ≥ 7, first half of play): a 2nd animation on the SAME lane node (screen-space translate) */
${EOS_DOTS_FIELD}.eosJitter .eosLane{animation:var(--eos-lane-kf,eosDotsLane) var(--d,18s) linear var(--dl,0s) infinite,eosDotsJitter calc(var(--bk,2s) * .3) ease-in-out infinite alternate}
${EOS_DOTS_FIELD}.eosJitter.eosJitterHi .eosLane{animation:var(--eos-lane-kf,eosDotsLane) var(--d,18s) linear var(--dl,0s) infinite,eosDotsJitterHi calc(var(--bk,2s) * .27) ease-in-out infinite alternate}
${EOS_DOTS_FIELD}[data-eos-straight="1"] .eosLane{--sw:0deg!important}
${EOS_DOTS_FIELD} .eosLane>[data-eos-dot]{position:absolute;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s) * -.5) 0 0 calc(var(--s) * -.5);border-radius:50%;opacity:var(--eos-dot-o,.85);transition:scale .32s cubic-bezier(.2,.8,.3,1),opacity .32s ease;
background:radial-gradient(circle,#fff 0 30%,hsla(var(--h),100%,80%,.95) 52%,hsla(var(--h),100%,70%,0) 100%);
box-shadow:0 0 calc(var(--s) * 1.4 + 2px) hsla(var(--h),100%,72%,.75),0 0 calc(var(--s) * 4 + 5px) hsla(var(--h),100%,62%,.28)}
${EOS_DOTS_FIELD} .eosLane>[data-eos-dot]::after{content:"";position:absolute;left:50%;top:50%;width:calc(var(--s) * 4.5 + 7px);height:max(1px,calc(var(--s) * .55));transform-origin:0 50%;translate:0 -50%;rotate:var(--ta,0deg);border-radius:999px;background:linear-gradient(90deg,hsla(var(--h),100%,84%,.5),hsla(var(--h),100%,70%,0));pointer-events:none}
${EOS_DOTS_FIELD}.eosFlowIn .eosLane>[data-eos-dot]{animation:eosDotsAppear 1.2s ease-out both}
/* reveal burst: the flung dust reads OUTSIDE the result card — every dot at full opacity, twice the size, with a trail
   pointing back at the light it came from (the tail flips from "behind an inward dot" to "behind an outward dot") */
${EOS_DOTS_FIELD}.eosBurst{--eos-dot-o:1}
${EOS_DOTS_FIELD}.eosBurst .eosLane>[data-eos-dot]{scale:2}
${EOS_DOTS_FIELD}.eosBurst .eosLane>[data-eos-dot]::after{rotate:calc(var(--ta,0deg) + 180deg);width:calc(var(--s) * 5 + 10px);background:linear-gradient(90deg,hsla(var(--h),100%,90%,.9),hsla(var(--h),100%,72%,0))}
/* finish (.eosGather): JS rushes every lane home on its own animation (see gather()); the core anticipates, then blooms */

/* ---------------- the Still Point */
${EOS_DOTS_FIELD} .eosCore{position:absolute;left:var(--eos-fx,50%);top:var(--eos-fy,52%);width:var(--eos-core-size);height:var(--eos-core-size);translate:-50% -50%;scale:1;opacity:1;transition:scale .7s cubic-bezier(.3,1.25,.45,1),opacity .6s ease,left .7s cubic-bezier(.4,0,.2,1),top .7s cubic-bezier(.4,0,.2,1)}
/* the light sits behind a game's own centrepiece (black hole, lotus …): no stray white spark under it, a softer glow */
${EOS_DOTS_FIELD}[data-eos-focus-on="1"] .eosCoreSpark{opacity:0}
${EOS_DOTS_FIELD}[data-eos-focus-on="1"] .eosCoreGlow{opacity:.72}
${EOS_DOTS_FIELD}[data-stage="play"] .eosCore{scale:calc(.8 + .5 * var(--eos-p,0));opacity:.74}
${EOS_DOTS_FIELD}[data-stage="reveal"] .eosCore{scale:1.4;opacity:1}
/* reveal: the calm light glows around the result card like an aura */
${EOS_DOTS_FIELD}[data-stage="reveal"] .eosCoreHalo{inset:-62%;background:radial-gradient(closest-side,hsla(var(--eos-h),var(--eos-sat,100%),70%,.95),hsla(var(--eos-h),var(--eos-sat,100%),64%,.74) 24%,hsla(var(--eos-h),var(--eos-sat,100%),59%,.36) 48%,hsla(var(--eos-h),var(--eos-sat,100%),56%,.11) 72%,hsla(var(--eos-h),var(--eos-sat,100%),55%,0) 100%)}
/* phone: the card covers the centre, so the light is an annulus that FRAMES the card instead of sitting under it */
${EOS_DOTS_FIELD}[data-eos-narrow="1"][data-stage="reveal"] .eosCoreHalo{inset:-135%;background:radial-gradient(closest-side,hsla(var(--eos-h),var(--eos-sat,100%),66%,0) 0 24%,hsla(var(--eos-h),var(--eos-sat,100%),66%,.42) 36%,hsla(var(--eos-h),var(--eos-sat,100%),63%,.74) 48%,hsla(var(--eos-h),var(--eos-sat,100%),60%,.4) 64%,hsla(var(--eos-h),var(--eos-sat,100%),57%,.12) 80%,hsla(var(--eos-h),var(--eos-sat,100%),55%,0) 94%)}
${EOS_DOTS_FIELD}.eosGather .eosCore{opacity:1}
${EOS_DOTS_FIELD} .eosCore>i,${EOS_DOTS_FIELD} .eosCoreBody>i,${EOS_DOTS_FIELD} .eosCoreHand>i{position:absolute;border-radius:50%}
${EOS_DOTS_FIELD} .eosCoreHand{inset:0}
${EOS_DOTS_FIELD} .eosCoreHalo{inset:-55%;background:radial-gradient(closest-side,hsla(var(--eos-h),var(--eos-sat,100%),74%,.26),hsla(var(--eos-h),var(--eos-sat,100%),64%,.1) 44%,hsla(var(--eos-h),var(--eos-sat,100%),55%,.03) 70%,hsla(var(--eos-h),var(--eos-sat,100%),55%,0) 100%)}
${EOS_DOTS_FIELD} .eosCoreRays{inset:-18%;background:repeating-conic-gradient(from 8deg,hsla(var(--eos-h),var(--eos-sat,100%),86%,0) 0deg 9deg,hsla(var(--eos-h),var(--eos-sat,100%),88%,.13) 13deg,hsla(var(--eos-h),var(--eos-sat,100%),86%,0) 17deg 31deg,rgba(255,244,214,.09) 35deg,hsla(var(--eos-h),var(--eos-sat,100%),86%,0) 39deg 52deg);-webkit-mask-image:radial-gradient(closest-side,transparent 9%,#000 24%,rgba(0,0,0,.5) 55%,transparent 92%);mask-image:radial-gradient(closest-side,transparent 9%,#000 24%,rgba(0,0,0,.5) 55%,transparent 92%);animation:eosDotsSpin 90s linear infinite}
${EOS_DOTS_FIELD} .eosCoreBody{inset:0;animation:eosDotsBreathe 10s linear infinite}
${EOS_DOTS_FIELD} .eosCoreGlow{inset:0;transition:opacity .6s ease;background:radial-gradient(closest-side,#fffdf4 0 4%,rgba(255,250,232,.94) 7%,hsla(var(--eos-h),var(--eos-sat,100%),85%,.74) 14%,hsla(var(--eos-h),var(--eos-sat,100%),71%,.42) 28%,hsla(var(--eos-h),calc(var(--eos-sat,100%) * .96),61%,.18) 50%,hsla(var(--eos-h),calc(var(--eos-sat,100%) * .92),53%,.05) 74%,hsla(var(--eos-h),calc(var(--eos-sat,100%) * .90),50%,0) 100%)}
${EOS_DOTS_FIELD} .eosCoreSpark{left:50%;top:50%;width:9%;height:9%;translate:-50% -50%;transition:opacity .6s ease;background:radial-gradient(closest-side,#fff,rgba(255,255,255,.6) 45%,rgba(255,255,255,0));box-shadow:0 0 18px 6px rgba(255,250,235,.55),0 0 46px 14px hsla(var(--eos-h),var(--eos-sat,100%),76%,.35)}
${EOS_DOTS_FIELD} .eosCoreRing{inset:31%;border:1.5px solid hsla(var(--eos-h),var(--eos-sat,100%),88%,.62);box-shadow:0 0 14px hsla(var(--eos-h),var(--eos-sat,100%),72%,.45),inset 0 0 12px hsla(var(--eos-h),var(--eos-sat,100%),72%,.3);opacity:0;animation:eosDotsAbsorb 2.8s cubic-bezier(.2,.7,.3,1) infinite}
${EOS_DOTS_FIELD} .eosCoreFlash{inset:-4%;background:radial-gradient(closest-side,#fff 0 12%,rgba(255,250,232,.85) 26%,hsla(var(--eos-h),var(--eos-sat,100%),80%,.42) 50%,hsla(var(--eos-h),var(--eos-sat,100%),72%,.12) 74%,hsla(var(--eos-h),var(--eos-sat,100%),70%,0) 100%);opacity:0}
${EOS_DOTS_FIELD} .eosCoreWave{inset:18%;border:2px solid hsla(var(--eos-h),var(--eos-sat,100%),90%,.9);box-shadow:0 0 22px hsla(var(--eos-h),var(--eos-sat,100%),74%,.6);opacity:0}
/* one pacer (B4): autonomous = the CSS breath synced to the shared clock; owned = transitions over the phase ms */
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"] .eosCoreBody{animation:none;transition:scale var(--eos-breath-ms,4000ms) cubic-bezier(.3,.55,.4,1),opacity var(--eos-breath-ms,4000ms) ease}
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"][data-phase="in"] .eosCoreBody{scale:1.12;opacity:1}
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"][data-phase="hold"] .eosCoreBody,${EOS_DOTS_FIELD} .eosCore[data-pacer="own"][data-sip="1"] .eosCoreBody{scale:1.17;opacity:1}
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"][data-sip="1"] .eosCoreBody{scale:1.19}
${EOS_DOTS_FIELD} .eosCore[data-pacer="own"][data-phase="out"] .eosCoreBody{scale:.84;opacity:.82;transition-timing-function:linear}
${EOS_DOTS_FIELD} .eosCore[data-pacer="beat"] .eosCoreBody{animation:eosDotsBeat var(--eos-beat-ms,833ms) linear infinite}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosCore:is([data-pacer="auto"],[data-pacer="beat"]) .eosCoreBody{animation:eosDotsBeat var(--eos-beat-ms,833ms) linear infinite,eosDotsHue 5s ease-in-out infinite alternate}
${EOS_DOTS_FIELD}.eosGather .eosCore .eosCoreBody{animation:eosDotsBloom 1.3s cubic-bezier(.3,.9,.4,1) forwards!important;transition:none}
${EOS_DOTS_FIELD}.eosGather .eosCoreFlash{animation:eosDotsFlash 1.3s ease-out forwards}
${EOS_DOTS_FIELD}.eosGather .eosCoreWave{animation:eosDotsBurst .9s cubic-bezier(.15,.7,.3,1) .82s 1 both}
/* the bloom keeps the CALM colour legible over a game's own cyan glows: saturated mid-lightness stops + a corona */
${EOS_DOTS_FIELD}.eosGather .eosCoreFlash{background:radial-gradient(closest-side,#fff 0 6%,hsla(var(--eos-h),var(--eos-sat,100%),80%,.92) 14%,hsla(var(--eos-h),var(--eos-sat,100%),64%,.82) 30%,hsla(var(--eos-h),var(--eos-sat,100%),60%,.46) 54%,hsla(var(--eos-h),var(--eos-sat,100%),58%,.13) 78%,hsla(var(--eos-h),var(--eos-sat,100%),56%,0) 100%)}
${EOS_DOTS_FIELD}.eosGather .eosCoreHalo{background:radial-gradient(closest-side,hsla(var(--eos-h),var(--eos-sat,100%),64%,.64),hsla(var(--eos-h),var(--eos-sat,100%),60%,.38) 40%,hsla(var(--eos-h),var(--eos-sat,100%),56%,.13) 70%,hsla(var(--eos-h),var(--eos-sat,100%),55%,0) 100%)}
${EOS_DOTS_FIELD}.eosGather .eosCoreWave{border-width:3px;border-color:hsla(var(--eos-h),var(--eos-sat,100%),66%,.95);box-shadow:0 0 26px hsla(var(--eos-h),var(--eos-sat,100%),60%,.78),inset 0 0 18px hsla(var(--eos-h),var(--eos-sat,100%),60%,.42)}
/* reveal shockwave: wide enough to clear the result card's edges (≈ 3.4× desktop, 4.3× phone) */
${EOS_DOTS_FIELD}.eosBurst .eosCoreWave{border-width:3px;border-color:hsla(var(--eos-h),var(--eos-sat,100%),70%,.95);box-shadow:0 0 30px hsla(var(--eos-h),var(--eos-sat,100%),62%,.8),inset 0 0 20px hsla(var(--eos-h),var(--eos-sat,100%),62%,.4);animation:eosDotsBurstWide 1.05s cubic-bezier(.15,.7,.3,1) 1 both}
${EOS_DOTS_FIELD}[data-eos-narrow="1"].eosBurst .eosCoreWave{animation-name:eosDotsBurstWideN}
/* dial step (setLevel): the ring twinkles while the dust surges / hushes for ≈ .4 s */
${EOS_DOTS_FIELD}.eosTwinkle .eosCoreRing{animation:eosDotsTwinkle .6s cubic-bezier(.2,.7,.3,1) 1 both}
${EOS_DOTS_FIELD}.eosPulseIn .eosCoreFlash{animation:eosDotsPulse 1.2s ease-out 1}
${EOS_DOTS_FIELD}.eosPulseIn .eosCoreRing{animation-duration:.9s}
${EOS_DOTS_FIELD}.eosPulseOut .eosCoreWave{animation:eosDotsBurst 1.2s cubic-bezier(.2,.6,.3,1) 1 both}
/* spark states (numb, good): warm, vivid, alive — the core pulses at 72 bpm instead of breathing */
/* (spark hue shimmer rides on nodes that already animate: the body's 2nd animation + the rays' spin) */
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosCoreRays{animation:eosDotsSpin 40s linear infinite,eosDotsHue 5s ease-in-out infinite alternate}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosLane[data-k="0"]{--h:330!important}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosLane[data-k="1"]{--h:42!important}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosLane[data-k="2"]{--h:16!important}
${EOS_DOTS_FIELD}[data-eos-mode="spark"] .eosLane[data-k="3"]{--h:175!important}

/* ---------------- cosmetic dust styles (§9.2; never change the pacer or the mirror rules) */
${EOS_DOTS_FIELD}[data-eos-dust="fireflies"]{--eos-lane-kf:eosDotsLaneFf}
${EOS_DOTS_FIELD}[data-eos-dust="fireflies"] .eosLane>[data-eos-dot]{--fh:calc(50 + var(--h) * .07);background:radial-gradient(circle,#fffde6 0 28%,hsla(var(--fh),100%,64%,.95) 54%,hsla(var(--fh),100%,55%,0) 100%);box-shadow:0 0 calc(var(--s) * 2.4 + 4px) hsla(var(--fh),100%,58%,.8),0 0 calc(var(--s) * 6 + 8px) hsla(var(--fh),100%,50%,.25)}
${EOS_DOTS_FIELD}[data-eos-dust="fireflies"] .eosLane>[data-eos-dot]::after{display:none}
${EOS_DOTS_FIELD}[data-eos-dust="aurora"]{--eos-lane-kf:eosDotsLaneAu}
${EOS_DOTS_FIELD}[data-eos-dust="aurora"] .eosLane>[data-eos-dot]{--ah:calc(120 + var(--h) * .3);--aw:calc(var(--s) * 3.4 + 5px);--ahh:calc(var(--s) * .8 + 1px);width:var(--aw);height:var(--ahh);margin:calc(var(--ahh) * -.5) 0 0 calc(var(--aw) * -.5);rotate:calc(var(--ta,0deg) + 90deg);border-radius:999px;background:linear-gradient(90deg,hsla(var(--ah),95%,70%,0),hsla(var(--ah),95%,74%,.95),hsla(var(--ah),95%,70%,0));box-shadow:0 0 12px hsla(var(--ah),95%,62%,.45)}
${EOS_DOTS_FIELD}[data-eos-dust="aurora"] .eosLane>[data-eos-dot]::after{left:0;top:0;width:100%;height:100%;translate:none;rotate:none;background:linear-gradient(90deg,hsla(calc(var(--ah) + 80),95%,72%,0),hsla(calc(var(--ah) + 80),95%,76%,.95),hsla(calc(var(--ah) + 80),95%,72%,0));opacity:.45}
${EOS_DOTS_FIELD}[data-eos-dust="snow"] .eosLane>[data-eos-dot]{--s2:calc(var(--s) * 1.25 + .5px);width:var(--s2);height:var(--s2);margin:calc(var(--s2) * -.5) 0 0 calc(var(--s2) * -.5);background:radial-gradient(circle,#fff 0 40%,rgba(236,246,255,.85) 62%,rgba(220,238,255,0) 100%);box-shadow:0 0 calc(var(--s) * 1.6 + 3px) rgba(226,242,255,.7)}
${EOS_DOTS_FIELD}[data-eos-dust="snow"] .eosLane>[data-eos-dot]::after{display:none}
${EOS_DOTS_FIELD}[data-eos-dust="gold"] .eosLane>[data-eos-dot]{background:radial-gradient(circle,#fffbe6 0 26%,#ffd04a 52%,rgba(255,154,46,0) 100%);box-shadow:0 0 calc(var(--s) * 1.6 + 3px) rgba(255,200,80,.85),0 0 calc(var(--s) * 4 + 6px) rgba(255,150,40,.3)}
${EOS_DOTS_FIELD}[data-eos-dust="gold"] .eosLane>[data-eos-dot]::after{left:50%;top:50%;width:calc(var(--s) * 4 + 6px);height:calc(var(--s) * 4 + 6px);translate:-50% -50%;rotate:none;transform-origin:50% 50%;background:linear-gradient(90deg,rgba(255,240,190,0) 0 42%,rgba(255,246,210,.95) 50%,rgba(255,240,190,0) 58% 100%),linear-gradient(0deg,rgba(255,240,190,0) 0 42%,rgba(255,246,210,.95) 50%,rgba(255,240,190,0) 58% 100%);opacity:0}
${EOS_DOTS_FIELD}[data-eos-dust="gold"] .eosLane:nth-child(3n){--eos-lane-kf:eosDotsLaneGd}
${EOS_DOTS_FIELD}[data-eos-dust="gold"] .eosLane:nth-child(3n) >[data-eos-dot]::after{opacity:.5;scale:.8}

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
  ${EOS_DOTS_FIELD} .eosLane{animation:none!important;opacity:.25;scale:var(--ks,.6);rotate:calc(var(--sw,30deg) * (1 - var(--ks,.6)))}
  ${EOS_DOTS_FIELD} .eosLane>[data-eos-dot]{animation:none!important}
  ${EOS_DOTS_FIELD} .eosCore,${EOS_DOTS_FIELD} .eosCore *{animation:none!important;transition:opacity .8s ease!important}
  ${EOS_DOTS_FIELD} .eosCore .eosCoreBody,${EOS_DOTS_FIELD} .eosCore{scale:1!important}
  ${EOS_DOTS_FIELD} .eosCore{transition:none!important}
  ${EOS_DOTS_FIELD} :is(.eosCoreSpark,.eosCoreGlow){transition:none!important}
  ${EOS_DOTS_FIELD} .eosLane>[data-eos-dot]{transition:none!important}
}
/* in-app calm visuals: the same quiet field without the OS setting */
${EOS_PX}[data-eos-calm="1"] .tsPxDust{animation:none!important;opacity:0!important}
${EOS_PX}[data-eos-calm="1"] .tsPxBokeh{transition:none!important}
${EOS_A}[data-eos-calm="1"] :is(.cinemaDust i,.cleanseSpace,.eosLane){animation:none!important}
${EOS_A}[data-eos-calm="1"] .cinemaDust i{opacity:.2!important}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosLane{animation:none!important;opacity:.25;scale:var(--ks,.6);rotate:calc(var(--sw,30deg) * (1 - var(--ks,.6)))}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosLane>[data-eos-dot]{animation:none!important}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore,${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore *{animation:none!important;transition:opacity .8s ease!important}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore .eosCoreBody{scale:1!important}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore{scale:1!important;transition:none!important}
/* (a focal anchor's dim is instant in calm visuals: no cross-fade at all) */
${EOS_DOTS_FIELD}[data-eos-calm="1"] :is(.eosCoreSpark,.eosCoreGlow){transition:none!important}
${EOS_DOTS_FIELD}.eosGatherCalm .eosCoreFlash{opacity:.55}
${EOS_DOTS_FIELD}[data-eos-calm="1"] .eosCore[data-pacer="own"][data-phase="out"] .eosCoreBody{opacity:.78}
`
eosCss("dots", EOS_DOTS_CSS)

// ---------------------------------------------------------------- public API (optional-chained by callers)
eosExpose("dots", {
    pulse: (kind = "in") => eosDotsEach((c) => c.pulse(kind)),
    breath: (phase, ms) => eosBreathOwn(phase, ms),
    phase: () => eosBreathPhase(),
    beat: (bpm) => eosPacerBeat(bpm),
    setLevel: (n) => eosDotsEach((c) => c.setLevel(n)),
    gather: () => eosDotsEach((c) => c.gather()),
    state: () => {
        let last = null
        EOS_DOTS_LIVE.ctls.forEach((c) => (last = c))
        return last ? last.state() : null
    },
})
