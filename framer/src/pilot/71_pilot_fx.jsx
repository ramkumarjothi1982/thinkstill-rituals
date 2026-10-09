// ===================================================================================
// Pilot A · 71_pilot_fx.jsx — the shared systems S0-S5 (docs/pilot/PILOT_A_SPEC.md §2).
//   S0 eosPilotAnim / eosPilotAnimSkip / eosPilotTimers / useEosPilotRuntime / eosPilotImgKey
//   S1 EosPilotActor (rig + acting layer), eosPilotFaceStep, eosPilotFaceSrc, eosPilotPick, eosPilotDecode
//   S2 useEosPilotFinale (finale sequencer, hand-off, skip)
//   S3 EosPilotStage (sky | pool | workshop kits, light rig, pooled particles, camera, grade)
//   S4 useEosPilotSound (named cues = layer sets, sync log)
//   S5 useEosPilotGesture (tap | hold), useEosPilotNearHit, useEosPilotBox
// Pure systems: no game ids inside. WAAPI only (no framer-motion), transforms and opacity only.
// No import/export, no regex lookbehind, every top-level name prefixed EosPilot/eosPilot/EOS_PILOT.
// ===================================================================================

// ================================================================= S0 · runtime helpers
function eosPilotWarn(e) {
    try {
        if (eosIsDev()) console.warn("[eos] pilot", e)
    } catch (x) {}
}
function eosPilotRand(seed) {
    if (seed == null) return Math.random()
    const x = Math.sin(Number(seed) * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
}
// The user-image snapshot key (S0): joined srcs, only when the user uploaded images.
function eosPilotImgKey(p) {
    if (!p || !p.hasUserImages) return ""
    const list = Array.isArray(p.imageSources) && p.imageSources.length ? p.imageSources : [p.imageSrc]
    return list.filter(Boolean).map(String).join("\u0001")
}
// Event time with the S4 sanity rule (old WebKit epoch stamps / synthetic events -> performance.now()).
function eosPilotEvT(e) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const ts = e && typeof e.timeStamp === "number" ? e.timeStamp : NaN
    if (!Number.isFinite(ts) || ts <= 0 || Math.abs(ts - now) > 5000) return { t: now, fallback: true }
    return { t: ts, fallback: false }
}
// Reduced motion, read per event (G16): OS setting, framer's `reduced`, the in-app calm toggle.
function eosPilotIsReduced(el, live) {
    try {
        if (live && live.current && live.current.reduced) return true
        if (el && el.closest && el.closest('[data-eos-calm="1"],[data-eos-pilot-reduced="1"]')) return true
        return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
    } catch (e) {
        return false
    }
}
// WAAPI with bookkeeping: registered in `anims`, removed on finish/cancel. Default fill "none" — commit the
// end state (attribute / CSS var) BEFORE calling so nothing jumps and nothing piles up in getAnimations().
function eosPilotAnim(anims, el, keyframes, opts) {
    if (!el || typeof el.animate !== "function") return null
    let a = null
    try {
        a = el.animate(keyframes, { fill: "none", ...(opts || {}) })
    } catch (e) {
        eosPilotWarn(e)
        return null
    }
    if (anims) {
        anims.add(a)
        const off = () => anims.delete(a)
        a.addEventListener("finish", off)
        a.addEventListener("cancel", off)
    }
    return a
}
// Skip: finish() finite, cancel() infinite animations (each guarded).
function eosPilotAnimSkip(set) {
    for (const a of Array.from(set || [])) {
        try {
            const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null
            if (t && t.endTime === Infinity) a.cancel()
            else a.finish()
        } catch (e) {
            try {
                a.cancel()
            } catch (x) {}
        }
    }
}
function eosPilotAnimCancel(set) {
    for (const a of Array.from(set || [])) {
        try {
            a.cancel()
        } catch (e) {}
    }
    if (set && set.clear) set.clear()
}
// Cancellable timers (cleared on unmount only — the G10 bug class never returns).
function eosPilotTimers() {
    const ids = new Set()
    return {
        later(fn, ms) {
            const id = setTimeout(() => {
                ids.delete(id)
                try {
                    fn()
                } catch (e) {
                    eosPilotWarn(e)
                }
            }, Math.max(0, Number(ms) || 0))
            ids.add(id)
            return id
        },
        clear(id) {
            clearTimeout(id)
            ids.delete(id)
        },
        clearAll() {
            ids.forEach((id) => clearTimeout(id))
            ids.clear()
        },
        size: () => ids.size,
    }
}
// One per engine: {anims, timers, cleanups}. Everything is cancelled on unmount.
function useEosPilotRuntime() {
    const r = React.useRef(null)
    if (!r.current) r.current = { anims: new Set(), timers: eosPilotTimers(), raf: 0, cleanups: [] }
    React.useEffect(() => {
        const x = r.current
        return () => {
            x.timers.clearAll()
            eosPilotAnimCancel(x.anims)
            if (x.raf) cancelAnimationFrame(x.raf)
            x.raf = 0
            x.cleanups.splice(0).forEach((f) => {
                try {
                    f()
                } catch (e) {}
            })
        }
    }, [])
    return r.current
}

// ================================================================= S1 · faces
const EOS_PILOT_CHAR_HUE = { sync: 200, rush: 356, glitch: 262, loopie: 292, drop: 214, patch: 24, still: 190 }
const EOS_PILOT_CHAR_LOUD = { sync: 44, rush: 29, glitch: 15, loopie: 58, drop: 58, patch: 73, still: 41 }
const EOS_PILOT_CHAR_CALM = { sync: 90, rush: 44, glitch: 10, loopie: 70, drop: 3, patch: 72, still: 15 }
// Picked by the systems builder on one contact strip per character (E01-E64; docs/pilot/status/A_systems.progress.md).
const EOS_PILOT_SOFT_FACE = { sync: 3, rush: 2, glitch: 55, loopie: 3, drop: 37, patch: 19, still: 2 }
const EOS_PILOT_REACT_FACE = {
    sync: { brace: 41, wow: 17, phew: 10, giggle: 5, pfff: 36, grin: 19, curious: 58 },
    rush: { brace: 52, wow: 13, phew: 50, giggle: 8, pfff: 46, grin: 60, curious: 41 },
    glitch: { brace: 13, wow: 34, phew: 38, giggle: 27, pfff: 44, grin: 31, curious: 62 },
    loopie: { brace: 56, wow: 60, phew: 2, giggle: 17, pfff: 52, grin: 64, curious: 59 },
    drop: { brace: 19, wow: 23, phew: 18, giggle: 7, pfff: 30, grin: 15, curious: 44 },
    patch: { brace: 22, wow: 12, phew: 13, giggle: 20, pfff: 26, grin: 4, curious: 40 },
    still: { brace: 22, wow: 46, phew: 21, giggle: 16, pfff: 55, grin: 13, curious: 45 },
}
const EOS_PILOT_STEP_KEYS = ["loud", "soft", "calm", "win"]
const EOS_PILOT_REACT_KEYS = ["brace", "wow", "phew", "giggle", "pfff", "grin", "curious"]
const EOS_PILOT_FACE_KEYS = EOS_PILOT_STEP_KEYS.concat(EOS_PILOT_REACT_KEYS)
// progress 0..100 -> 0 loud (0-33) · 1 soft (34-66) · 2 calm (67-99). Step 3 (win) only from the hand-off.
function eosPilotFaceStep(p) {
    const v = Number(p) || 0
    return v < 34 ? 0 : v < 67 ? 1 : 2
}
function eosPilotCharOk(c) {
    return EOS_PILOT_CHAR_HUE[c] != null ? c : "still"
}
function eosPilotFaceId(char, key, emotion, seed) {
    const c = eosPilotCharOk(char)
    const e = emotion && EOS_EMO[emotion]
    const own = e && e.char === c
    if (key === "loud" || key === 0) return own ? e.loud : EOS_PILOT_CHAR_LOUD[c]
    if (key === "soft" || key === 1) return EOS_PILOT_SOFT_FACE[c]
    if (key === "calm" || key === 2) return own ? e.calm : EOS_PILOT_CHAR_CALM[c]
    if (key === "win" || key === 3) {
        const w = (EOS_WIN_FACES && EOS_WIN_FACES[c]) || [15]
        return w[Math.abs(Math.floor(Number(seed) || 0)) % w.length]
    }
    return (EOS_PILOT_REACT_FACE[c] || {})[key] || null
}
function eosPilotFaceSrc(char, step, emotion, seed) {
    const id = eosPilotFaceId(char, step, emotion, seed)
    return id ? eosFace(eosPilotCharOk(char), id) : null
}
// Acting pool (CR-4b): a variant other than the last one. lastRef = {current}.
function eosPilotPick(pool, lastRef, seed) {
    const n = pool ? pool.length : 0
    if (!n) return null
    if (n === 1) return pool[0]
    const last = lastRef && Number.isInteger(lastRef.current) ? lastRef.current : -1
    let i = Math.floor(eosPilotRand(seed) * n) % n
    if (i === last) i = (i + 1 + Math.floor(eosPilotRand(seed == null ? null : seed + 7) * (n - 1))) % n
    if (i === last) i = (i + 1) % n
    if (lastRef) lastRef.current = i
    return pool[i]
}
// Decode policy (E14): src set exactly once; decode() with a timeout; never an empty sphere (the hue
// gradient + initial shows until a face is ready). <= 20 decoded faces at once on phone (optional faces
// are dropped first).
const EOS_PILOT_DECODED = { n: 0, cap: 20 }
function eosPilotDecode(img, src, opts) {
    const o = opts || {}
    if (!img || !src) return Promise.resolve(false)
    if (img.getAttribute("data-ready") === "1") return Promise.resolve(true)
    if (img.__eosPilotP) return img.__eosPilotP
    let phone = false
    try {
        phone = window.innerWidth < 700
    } catch (e) {}
    if (o.optional && phone && EOS_PILOT_DECODED.n >= EOS_PILOT_DECODED.cap) return Promise.resolve(false)
    EOS_PILOT_DECODED.n++
    img.__eosPilotCounted = true
    const mark = () => {
        img.setAttribute("data-ready", "1")
        if (typeof o.onReady === "function") o.onReady(img)
        return true
    }
    if (!img.getAttribute("src")) img.setAttribute("src", src)
    img.__eosPilotP = new Promise((res) => {
        let done = false
        const fin = (ok) => {
            if (done) return
            done = true
            res(ok ? mark() : false)
        }
        const t = setTimeout(() => {
            if (img.complete && img.naturalWidth > 0) return fin(true)
            img.addEventListener("load", () => mark(), { once: true })
            fin(false)
        }, Number(o.timeout) || 1200)
        const ok = () => {
            clearTimeout(t)
            fin(true)
        }
        const bad = () => {
            clearTimeout(t)
            if (img.complete && img.naturalWidth > 0) fin(true)
            else fin(false)
        }
        try {
            if (typeof img.decode === "function") img.decode().then(ok, bad)
            else if (img.complete && img.naturalWidth > 0) ok()
            else {
                img.addEventListener("load", ok, { once: true })
                img.addEventListener("error", bad, { once: true })
            }
        } catch (e) {
            bad()
        }
    })
    return img.__eosPilotP
}
function eosPilotDecodeRelease(img) {
    if (img && img.__eosPilotCounted) {
        img.__eosPilotCounted = false
        EOS_PILOT_DECODED.n = Math.max(0, EOS_PILOT_DECODED.n - 1)
    }
}
function eosPilotPrefetch(src) {
    try {
        const i = new Image()
        i.decoding = "async"
        i.src = src
    } catch (e) {}
}

// ================================================================= S1 · EosPilotActor
// <EosPilotActor ref role="holder|inside|breath" emotion char image size u progress reacts label word
//   showLabel sub avoid className style seed eager ballChildren /> — placement: left/top = ball centre.
// Imperative handle: emit(type, o) · react(key, ms) · look(target) · pose(name) · setTug(t) · setStance(w)
// · setCompression(c) · setHeat(h) · setUnder(v) · celebrate(steps) · anchor(name) · el() · part(name)
// · setStep(n) · prepare(key) · flash().
const EosPilotActor = React.memo(
    React.forwardRef(function EosPilotActor(props, ref) {
        const {
            role = "breath",
            emotion,
            char,
            image = null,
            size = 112,
            u = 1,
            progress = 0,
            reacts,
            label,
            word,
            showLabel = true,
            sub,
            avoid = true,
            className = "",
            style,
            seed = 0,
            eager = true,
            ballChildren = null,
        } = props
        const emo = emotion || (typeof eosCurrentEmotion === "function" && eosCurrentEmotion()) || "auto"
        const ch = eosPilotCharOk(char || (EOS_EMO[emo] ? EOS_EMO[emo].char : "still"))
        const hue = EOS_PILOT_CHAR_HUE[ch]
        const px = Math.round((Number(size) || 112) * eosClamp(u, 0.85, 1.35))
        const reactList = image ? [] : (reacts || []).filter((k) => EOS_PILOT_REACT_KEYS.indexOf(k) >= 0)
        const reactKey = reactList.join(",")
        const keys = React.useMemo(() => (image ? ["user"] : EOS_PILOT_STEP_KEYS.concat(reactKey ? reactKey.split(",") : [])), [image, reactKey])
        const srcs = React.useMemo(() => {
            const m = {}
            if (image) m.user = String(image)
            else for (const k of keys) m[k] = eosPilotFaceSrc(ch, k, emo, seed)
            return m
        }, [keys, ch, emo, seed, image])
        const rt = React.useRef(null)
        if (!rt.current) {
            const P = {}
            const mk = (k) => (n) => {
                P[k] = n
            }
            rt.current = {
                P,
                r: { root: mk("root"), idle: mk("idle"), body: mk("body"), ball: mk("ball"), face: mk("face"), hl: mk("handL"), hr: mk("handR"), fl: mk("footL"), fr: mk("footR"), puff: mk("puff"), flash: mk("flash"), label: mk("label") },
                cur: {},
                anims: new Set(),
                timers: eosPilotTimers(),
                forced: null,
                look: [0, 0, 1],
                comp: 0,
                tug: 0,
                stance: 0,
                inhale: null,
                props: null,
            }
        }
        const R = rt.current
        R.props = { px, srcs, progress, image }
        const imgOf = (k) => (R.P.face ? R.P.face.querySelector(`img[data-k="${k}"]`) : null)
        const ready = (k) => {
            const i = imgOf(k)
            return !!(i && i.getAttribute("data-ready") === "1")
        }
        const decodeKey = (k, optional) => {
            const s = R.props.srcs[k]
            const i = imgOf(k)
            return i && s ? eosPilotDecode(i, s, { optional, onReady: () => applyStep() }) : Promise.resolve(false)
        }
        // The visible step advances only once its face is decoded (never an empty sphere).
        const applyStep = () => {
            const root = R.P.root
            if (!root) return
            const want = R.forced != null ? R.forced : eosPilotFaceStep(R.props.progress)
            const key = R.props.image ? null : EOS_PILOT_STEP_KEYS[want]
            const cur = Number(root.getAttribute("data-step") || 0)
            if (want === cur) return
            if (!key || ready(key) || !imgOf(EOS_PILOT_STEP_KEYS[cur]) || !ready(EOS_PILOT_STEP_KEYS[cur])) root.setAttribute("data-step", String(want))
            else decodeKey(key)
        }
        const reducedNow = () => eosPilotIsReduced(R.P.root)
        const play = (part, kf, opts, slot) => {
            const el = R.P[part]
            if (!el) return null
            const s = slot || part
            const prev = R.cur[s]
            if (prev) {
                try {
                    prev.cancel()
                } catch (e) {}
            }
            const a = eosPilotAnim(R.anims, el, kf, opts)
            R.cur[s] = a
            return a
        }
        const flash = () => play("flash", [{ opacity: 0 }, { opacity: 0.5, offset: 0.3 }, { opacity: 0 }], { duration: 120, easing: "ease-out" })
        const k = () => R.props.px / 112

        // decode policy: current + next step at mount / on progress; win from 67; reactions of an eager actor.
        React.useLayoutEffect(() => {
            applyStep()
        })
        React.useEffect(() => {
            const want = R.forced != null ? R.forced : eosPilotFaceStep(progress)
            if (image) {
                decodeKey("user")
                return
            }
            decodeKey(EOS_PILOT_STEP_KEYS[want])
            if (want < 2) decodeKey(EOS_PILOT_STEP_KEYS[want + 1])
            if ((Number(progress) || 0) >= 67 || want >= 2) decodeKey("win")
        }, [progress, image, srcs])
        React.useEffect(() => {
            if (image) return undefined
            let idle = 0
            if (eager) for (const key of reactList) decodeKey(key, true)
            const pre = () => {
                for (const key of keys) {
                    const i = imgOf(key)
                    if (i && !i.getAttribute("src") && R.props.srcs[key]) eosPilotPrefetch(R.props.srcs[key])
                }
            }
            try {
                idle = typeof requestIdleCallback === "function" ? requestIdleCallback(pre, { timeout: 2500 }) : setTimeout(pre, 1500)
            } catch (e) {}
            return () => {
                try {
                    if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle)
                    else clearTimeout(idle)
                } catch (e) {}
            }
        }, [srcs, eager])
        React.useEffect(
            () => () => {
                R.timers.clearAll()
                eosPilotAnimCancel(R.anims)
                if (R.P.face) R.P.face.querySelectorAll("img").forEach(eosPilotDecodeRelease)
            },
            []
        )

        React.useImperativeHandle(
            ref,
            () => {
                const api = {
                    el: () => R.P.root,
                    part: (name) => R.P[name] || null,
                    flash,
                    prepare: (key) => decodeKey(key),
                    setStep(n) {
                        R.forced = n == null ? null : eosClamp(n, 0, 3)
                        if (R.forced === 3) decodeKey("win").then(() => applyStep())
                        applyStep()
                    },
                    react(key, ms = 320) {
                        const root = R.P.root
                        if (!root) return
                        if (reducedNow()) flash()
                        if (!ready(key)) return
                        root.setAttribute("data-react", key)
                        if (R.reactT) R.timers.clear(R.reactT)
                        R.reactT = R.timers.later(() => {
                            R.reactT = 0
                            if (R.P.root) R.P.root.removeAttribute("data-react")
                        }, eosClamp(ms, 150, 450))
                    },
                    emit(type, o = {}) {
                        if (reducedNow()) {
                            if (type !== "inhale") flash()
                            return null
                        }
                        const dir = o.dir || [0, 0]
                        const sx = Math.sign(dir[0] || 0)
                        if (type === "press") {
                            play("face", [{ transform: "none" }, { transform: "scale(1.04)", offset: 0.35 }, { transform: "none" }], { duration: 230 })
                            return play("body", [{ transform: "none" }, { transform: `rotate(${4 * sx}deg) scale(1.08,0.92)`, offset: 0.35, easing: "cubic-bezier(.2,.8,.2,1)" }, { transform: "none" }], { duration: 230, easing: "cubic-bezier(.3,.6,.3,1)" })
                        }
                        if (type === "lurch") {
                            const A = (6 + 6 * eosClamp(o.s == null ? 0.5 : o.s, 0, 1)) * (sx >= 0 ? -1 : 1)
                            const ms = (o.ms || 300) + 120
                            play("footL", [{ transform: "none" }, { transform: `translateY(${-3 * k()}px)`, offset: 0.72 }, { transform: "none" }], { duration: ms })
                            play("footR", [{ transform: "none" }, { transform: `translateY(${-3 * k()}px)`, offset: 0.76 }, { transform: "none" }], { duration: ms })
                            return play(
                                "body",
                                [
                                    { transform: "rotate(0deg)" },
                                    { transform: `rotate(${A}deg) scale(1.03,.97)`, offset: 0.26, easing: "cubic-bezier(.3,.7,.4,1)" },
                                    { transform: `rotate(${-A * 0.45}deg)`, offset: 0.56, easing: "ease-in-out" },
                                    { transform: `rotate(${A * 0.16}deg)`, offset: 0.8 },
                                    { transform: "rotate(0deg)" },
                                ],
                                { duration: ms }
                            )
                        }
                        if (type === "squeeze") {
                            const c = eosClamp(o.c == null ? 0.6 : o.c, 0, 1)
                            const ms = o.ms || (o.heavy ? 560 : 420)
                            const w = o.variant === "left" ? "skewX(-7deg)" : o.variant === "right" ? "skewX(7deg)" : "rotate(5deg)"
                            return play(
                                "body",
                                [
                                    { transform: "none" },
                                    { transform: `scale(${1 + 0.5 * c},${1 - 0.78 * c})`, offset: Math.min(0.3, 60 / ms), easing: "cubic-bezier(.2,.9,.3,1)" },
                                    { transform: `scale(${1 + 0.42 * c},${1 - 0.66 * c}) ${w}`, offset: Math.min(0.5, 170 / ms), easing: "ease-in-out" },
                                    { transform: `scale(${1 - 0.06 * c},${1 + 0.1 * c})`, offset: 0.74, easing: "ease-out" },
                                    { transform: "none" },
                                ],
                                { duration: ms }
                            )
                        }
                        if (type === "hit") {
                            const s = eosClamp(o.s == null ? 0.5 : o.s, 0, 1)
                            if (s > 0.7) play("idle", [{ translate: "0 0" }, { translate: `${-4 * k()}px 0` }, { translate: `${4 * k()}px 0` }, { translate: `${-2 * k()}px 0` }, { translate: "0 0" }], { duration: 260 }, "shake")
                            return play("body", [{ transform: "none" }, { transform: `scale(${1 + 0.15 * s},${1 - 0.15 * s})`, offset: 0.15 }, { transform: `scale(${1 - 0.06 * s},${1 + 0.06 * s})`, offset: 0.45 }, { transform: "none" }], { duration: 420, easing: "ease-out" })
                        }
                        if (type === "miss") {
                            if (o.variant === "tilt") {
                                const a = 8 * (sx || 1)
                                return play("body", [{ transform: "none" }, { transform: `rotate(${a}deg)`, offset: 0.25, easing: "cubic-bezier(.2,.8,.3,1)" }, { transform: `rotate(${a}deg)`, offset: 0.7 }, { transform: "none" }], { duration: 800, easing: "ease-in-out" })
                            }
                            return play("body", [{ transform: "none" }, { transform: "rotate(-6deg)", offset: 0.08 }, { transform: "rotate(6deg)", offset: 0.17 }, { transform: "rotate(-4deg)", offset: 0.25 }, { transform: "rotate(2deg)", offset: 0.5 }, { transform: "none" }], { duration: 800, easing: "ease-out" })
                        }
                        if (type === "inhale") {
                            const ms = o.ms || 3000
                            const amp = o.amp == null ? 1 : o.amp
                            const a = play("body", [{ transform: "none" }, { transform: `scale(${1 - 0.04 * amp},${1 + 0.08 * amp})` }], { duration: ms, easing: "cubic-bezier(.35,.1,.35,1)", fill: "forwards" })
                            R.inhale = { a, ms, amp }
                            return a
                        }
                        if (type === "exhale") {
                            const ms = o.ms || 2400
                            const inh = R.inhale
                            let f = 0
                            let amp = o.amp == null ? 1 : o.amp
                            if (inh && inh.a) {
                                try {
                                    f = eosClamp((inh.a.currentTime || 0) / inh.ms, 0, 1)
                                } catch (e) {}
                                amp = inh.amp
                            }
                            R.inhale = null
                            if (o.puff !== false)
                                play("puff", [{ opacity: 0, transform: "translate(-50%,0) scale(.6)" }, { opacity: 0.85, transform: "translate(-50%,-10px) scale(.9)", offset: 0.2 }, { opacity: 0, transform: `translate(-50%,${-56 * k()}px) scale(1.7)` }], { duration: Math.min(ms, 1700), easing: "cubic-bezier(.2,.7,.3,1)" })
                            return play(
                                "body",
                                [
                                    { transform: `scale(${1 - 0.04 * amp * f},${1 + 0.08 * amp * f})` },
                                    { transform: `scale(${1 + 0.05 * amp},${1 - 0.08 * amp})`, offset: 0.32, easing: "ease-in-out" },
                                    { transform: `scale(${1 - 0.02 * amp},${1 + 0.04 * amp})`, offset: 0.62, easing: "ease-in-out" },
                                    { transform: "none" },
                                ],
                                { duration: ms, easing: "cubic-bezier(.3,.1,.3,1)" }
                            )
                        }
                        if (type === "hop") {
                            const h = (o.px || 12) * k()
                            return play(
                                "body",
                                [
                                    { transform: "none" },
                                    { transform: "translateY(0) scale(1.07,.93)", offset: 0.14, easing: "cubic-bezier(.2,.7,.3,1)" },
                                    { transform: `translateY(${-h}px) scale(.95,1.06)`, offset: 0.5, easing: "cubic-bezier(.5,0,.8,.4)" },
                                    { transform: "translateY(0) scale(1.06,.94)", offset: 0.84, easing: "ease-out" },
                                    { transform: "none" },
                                ],
                                { duration: o.ms || 260 }
                            )
                        }
                        if (type === "popBack") {
                            return play("body", [{ transform: "scale(1.5,.22)" }, { transform: "scale(.9,1.15)", offset: 0.5, easing: "cubic-bezier(.2,.9,.3,1)" }, { transform: "scale(1.03,.98)", offset: 0.78 }, { transform: "none" }], { duration: o.ms || 420, easing: "cubic-bezier(.2,.9,.3,1.2)" })
                        }
                        return null
                    },
                    look(target) {
                        if (reducedNow() || !R.P.face) return
                        let x = 0
                        let y = 0
                        let s = 1
                        if (target === "camera") s = 1.03
                        else if (target && target.getBoundingClientRect && R.P.ball) {
                            const a = R.P.ball.getBoundingClientRect()
                            const b = target.getBoundingClientRect()
                            const dx = b.left + b.width / 2 - (a.left + a.width / 2)
                            const dy = b.top + b.height / 2 - (a.top + a.height / 2)
                            const len = Math.hypot(dx, dy) || 1
                            x = (6 * k() * dx) / len
                            y = (6 * k() * dy) / len
                        }
                        const from = R.look
                        R.look = [x, y, s]
                        play("face", [{ translate: `${from[0]}px ${from[1]}px`, scale: String(from[2] || 1) }, { translate: `${x}px ${y}px`, scale: String(s) }], { duration: 160, easing: "ease", fill: "forwards" }, "look")
                    },
                    pose(name) {
                        if (reducedNow()) return
                        const K = k()
                        const P = {
                            raise: [[-4, -26], [4, -26]],
                            press: [[10, 6], [-10, 6]],
                            cup: [[24, 30], [-24, 30]],
                            wave: [[0, 0], [4, -26]],
                            rest: [[0, 0], [0, 0]],
                        }
                        const F = { sitCross: [[8, -4, 20], [-8, -4, -20]], plant: [[-6, 0, 0], [6, 0, 0]], tuck: [[4, -8, 0], [-4, -8, 0]], rest: [[0, 0, 0], [0, 0, 0]] }
                        const opt = { duration: 300, easing: "cubic-bezier(.3,.7,.3,1.15)", fill: "forwards" }
                        if (P[name]) {
                            const [l, r] = P[name]
                            play("handL", [{ transform: `translate(${l[0] * K}px,${l[1] * K}px)` }], opt)
                            if (name === "wave")
                                play("handR", [{ transform: `translate(${4 * K}px,${-26 * K}px) rotate(0deg)` }, { transform: `translate(${4 * K}px,${-26 * K}px) rotate(22deg)` }, { transform: `translate(${4 * K}px,${-26 * K}px) rotate(-14deg)` }, { transform: `translate(${4 * K}px,${-26 * K}px) rotate(18deg)` }, { transform: `translate(${4 * K}px,${-26 * K}px) rotate(0deg)` }], { duration: 900, easing: "ease-in-out", fill: "forwards" })
                            else play("handR", [{ transform: `translate(${r[0] * K}px,${r[1] * K}px)` }], opt)
                        }
                        if (F[name]) {
                            const [l, r] = F[name]
                            play("footL", [{ transform: `translate(${l[0] * K}px,${l[1] * K}px) rotate(${l[2]}deg)` }], opt)
                            play("footR", [{ transform: `translate(${r[0] * K}px,${r[1] * K}px) rotate(${r[2]}deg)` }], opt)
                        }
                    },
                    setTug(t) {
                        R.tug = eosClamp(t, 0, 1)
                        const root = R.P.root
                        if (!root) return
                        root.style.setProperty("--tug-amp", `${(6 * R.tug * (1 - 0.6 * R.stance)).toFixed(2)}deg`)
                        root.style.setProperty("--tug-period", `${(3.2 - 1.6 * R.tug).toFixed(2)}s`)
                    },
                    setStance(w) {
                        R.stance = eosClamp(w, 0, 1)
                        if (R.P.root) R.P.root.style.setProperty("--stance", `${((6 + 10 * R.stance) * k()).toFixed(1)}px`)
                        api.setTug(R.tug)
                    },
                    setCompression(c) {
                        const v = eosClamp(c, 0, 1)
                        const body = R.P.body
                        if (!body) return
                        const val = (x) => `${(1 + 0.5 * x).toFixed(3)} ${(1 - 0.78 * x).toFixed(3)}`
                        if (reducedNow()) {
                            body.style.scale = val(Math.round(v * 3) / 3)
                            R.comp = v
                            return
                        }
                        body.style.scale = val(v)
                        play("body", [{ scale: val(R.comp) }, { scale: val(v) }], { duration: 60, easing: "cubic-bezier(.2,.9,.3,1)" }, "comp")
                        R.comp = v
                    },
                    setHeat(h) {
                        if (R.P.root) R.P.root.style.setProperty("--heat", eosClamp(h, 0, 1).toFixed(3))
                    },
                    setUnder(v) {
                        if (R.P.root) R.P.root.style.setProperty("--under", eosClamp(v, 0, 1).toFixed(3))
                    },
                    // The game's OWN choreography: [{at, part, keyframes, opts, slot}] (no shared jump-spin, CR-1).
                    celebrate(steps) {
                        const red = reducedNow()
                        ;(steps || []).forEach((s, i) => {
                            if (!s || !s.part || !s.keyframes) return
                            if (red && !s.reducedOk) return
                            R.timers.later(() => play(s.part, s.keyframes, s.opts || { duration: 600 }, s.slot || `cel${i}`), s.at || 0)
                        })
                    },
                    // {x, y} in arena px: hands | centre | top | feet | lap
                    anchor(name) {
                        const ball = R.P.ball
                        const arena = ball && ball.closest ? ball.closest(".eosPilotArena") : null
                        if (!ball || !arena) return { x: 0, y: 0 }
                        const a = ball.getBoundingClientRect()
                        const A = arena.getBoundingClientRect()
                        const cx = a.left - A.left + a.width / 2
                        const top = a.top - A.top
                        const f = { hands: 0.62, centre: 0.5, top: 0, feet: 1.06, lap: 0.8 }[name]
                        return { x: cx, y: top + a.height * (f == null ? 0.5 : f) }
                    },
                }
                return api
            },
            []
        )

        const nameLabel = label && !word
        const vars = { "--a-size": `${px}px`, "--a-hue": hue, "--a-delay": `${(-eosPilotRand(seed + 3) * 2.4).toFixed(2)}s`, ...(style || {}) }
        return (
            <div
                ref={R.r.root}
                className={`eosPilotActor ${className}`}
                data-role={role}
                data-char={ch}
                data-step="0"
                data-user={image ? "1" : undefined}
                data-label={showLabel ? "1" : "0"}
                data-eos-avoid={avoid ? "1" : undefined}
                data-eos-char={avoid ? ch : undefined}
                style={vars}
            >
                <div className="eosPilotActorPos">
                    <div className="eosPilotActorIdle" ref={R.r.idle}>
                        <div className="eosPilotActorBody" ref={R.r.body}>
                            <i className="quirk" aria-hidden="true" />
                            {role !== "breath" ? (
                                <>
                                    <i className="hand l" ref={R.r.hl} />
                                    <i className="hand r" ref={R.r.hr} />
                                </>
                            ) : null}
                            {role === "holder" ? (
                                <>
                                    <i className="foot l" ref={R.r.fl} />
                                    <i className="foot r" ref={R.r.fr} />
                                </>
                            ) : null}
                            <div className="eosPilotActorBall" ref={R.r.ball}>
                                <i className="eosPilotActorHue" data-i={EOS_CHAR_NAMES[ch] ? EOS_CHAR_NAMES[ch][0] : "S"} />
                                {ballChildren}
                                <div className="eosPilotActorFace" ref={R.r.face}>
                                    {keys.map((key) => (
                                        <img key={key} data-k={key} alt="" draggable={false} decoding="async" />
                                    ))}
                                </div>
                                <i className="rimHot" />
                                <i className="under" />
                                <i className="gloss" />
                                <i className="flash" ref={R.r.flash} />
                            </div>
                            <i className="puff" ref={R.r.puff} />
                        </div>
                    </div>
                    {word || label || sub ? (
                        <div className="eosPilotActorLabel" ref={R.r.label} {...(word ? EOS_PRIVATE_ATTRS : {})}>
                            {word ? <EosWord text={word} className="eosPilotWord" /> : nameLabel ? <span className="eosPilotActorName">{label}</span> : null}
                            {sub ? <span className="eosPilotActorSub">{sub}</span> : null}
                        </div>
                    ) : null}
                </div>
            </div>
        )
    })
)

// ================================================================= S2 · useEosPilotFinale
// const fin = useEosPilotFinale({arenaRef, live, bonus, label, kit, heroFace, anims, timers, handoffMs,
//   beats:[{id, at, run(ctx)}], onFinaleTap(ev, ctx), onHandoff(ctx)})
// fin.start(ev) · fin.tap(ev) · fin.handoff() · fin.phase.current ("play" | "finale" | "done") · fin.t0()
const EOS_PILOT_REDUCED_AT = { climax: 0, transform: 200, peak: 800, afterglow: 800, tableau: 1600 }
function useEosPilotFinale(cfg) {
    const cfgRef = React.useRef(cfg)
    cfgRef.current = cfg
    const phase = React.useRef("play")
    const api = React.useRef(null)
    if (!api.current) {
        const st = { t0: 0, lastTap: 0, done: false, hand: EOS_PILOT_HANDOFF_MS, reduced: false, beatAnims: new Set(), ran: {} }
        const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())
        const ctxOf = (extra) => {
            const c = cfgRef.current
            const arena = c.arenaRef && c.arenaRef.current
            return {
                t0: st.t0,
                reduced: st.reduced,
                arena,
                skipped: false,
                anim: (el, kf, opts) => {
                    const a = eosPilotAnim(c.anims, el, kf, opts)
                    if (a) {
                        st.beatAnims.add(a)
                        const off = () => st.beatAnims.delete(a)
                        a.addEventListener("finish", off)
                        a.addEventListener("cancel", off)
                    }
                    return a
                },
                later: (fn, ms) => (c.timers ? c.timers.later(fn, ms) : setTimeout(fn, ms)),
                ...(extra || {}),
            }
        }
        const runBeat = (b, extra) => {
            if (!b || st.ran[b.id]) return
            st.ran[b.id] = true
            const c = cfgRef.current
            const arena = c.arenaRef && c.arenaRef.current
            try {
                if (arena) arena.setAttribute("data-eos-pilot-beat", b.id)
            } catch (e) {}
            try {
                if (typeof b.run === "function") b.run(ctxOf(extra))
            } catch (e) {
                eosPilotWarn(e)
            }
        }
        const at = (b) => (st.reduced ? (b.reducedAt != null ? b.reducedAt : EOS_PILOT_REDUCED_AT[b.id] != null ? EOS_PILOT_REDUCED_AT[b.id] : Math.min(b.at || 0, 1600)) : b.at || 0)
        const handoff = () => {
            if (st.done) return
            st.done = true // the lock is set inside the call that fires onDone
            phase.current = "done"
            const c = cfgRef.current
            const live = c.live && c.live.current
            try {
                if (live && typeof live.onDone === "function") live.onDone(c.bonus == null ? 0 : c.bonus)
            } catch (e) {
                eosPilotWarn(e)
            }
            try {
                if (live && typeof live.onProgress === "function") live.onProgress(100, c.label)
            } catch (e) {
                eosPilotWarn(e)
            }
            const arena = c.arenaRef && c.arenaRef.current
            try {
                if (typeof c.onHandoff === "function") c.onHandoff(ctxOf())
            } catch (e) {
                eosPilotWarn(e)
            }
            try {
                if (c.kit) eosPilotAfterglow(c.kit, typeof c.heroFace === "function" ? c.heroFace() : c.heroFace, arena)
                const sh = eosPilotShell(arena)
                if (sh && sh.getAttribute("data-eos-pilot-guide") !== "off") eosPilotShellAttrs(arena, { guide: "bend" })
            } catch (e) {
                eosPilotWarn(e)
            }
        }
        api.current = {
            phase,
            t0: () => st.t0,
            start(ev) {
                if (phase.current !== "play") return false
                phase.current = "finale"
                const c = cfgRef.current
                const arena = c.arenaRef && c.arenaRef.current
                st.t0 = eosPilotEvT(ev).t
                st.lastTap = st.t0
                st.reduced = eosPilotIsReduced(arena, c.live)
                st.hand = st.reduced ? EOS_PILOT_HANDOFF_REDUCED_MS : c.handoffMs || EOS_PILOT_HANDOFF_MS
                const later = (fn, ms) => (c.timers ? c.timers.later(fn, ms) : setTimeout(fn, ms))
                const el = now() - st.t0
                for (const b of c.beats || []) {
                    const d = at(b) - el
                    if (d <= 0) runBeat(b)
                    else later(() => runBeat(b), d)
                }
                later(handoff, st.hand - el)
                later(handoff, st.hand + 800 - el) // watchdog (idempotent)
                return true
            },
            // the arena's pointerdown while phase === "finale" (no skip button: G7)
            tap(ev) {
                if (phase.current !== "finale") return
                const c = cfgRef.current
                const t = eosPilotEvT(ev).t
                const since = t - st.t0
                const gap = t - st.lastTap
                st.lastTap = t
                if (since < 800) {
                    eosPilotSoundRow({ t, action: "finale-tap", cue: "finale-tap", via: "none", inputT: t, game: c.gameId || null })
                    try {
                        if (typeof c.onFinaleTap === "function") c.onFinaleTap(ev, ctxOf())
                    } catch (e) {
                        eosPilotWarn(e)
                    }
                    return
                }
                if (gap < 400) return
                // skip: commit every pre-hand-off end state, then hand off now
                for (const b of c.beats || []) if (at(b) <= st.hand) runBeat(b, { skipped: true })
                eosPilotAnimSkip(st.beatAnims)
                eosPilotSoundRow({ t, action: "finale-skip", cue: "finale-skip", via: "none", inputT: t, game: c.gameId || null })
                handoff()
            },
            handoff,
        }
    }
    return api.current
}

// ================================================================= S3 · EosPilotStage
// Kits: the light rig values (key light, gloss, rim) are CSS vars on the stage root per data-kit.
const EOS_PILOT_KITS = {
    sky: {
        l1: ["sun", "sunHaze", "cloudFar a", "cloudFar b", "cloudFar c"],
        l2: ["cloudNear a", "cloudNear b", "bird a", "bird b"],
        l4: ["bokeh a", "bokeh b"],
        pools: { motes: 6, droplets: 16, rainbow: 1 },
    },
    pool: {
        l1: ["moon", "moonRefl", "stars", "starsMirror", "trees"],
        l2: ["moonPath", "reeds l", "reeds r", "pads", "mist a", "mist b"],
        l4: ["mistFront", "bokeh a"],
        pools: { ink: 5, fireflies: 6, ripples: 3 },
    },
    workshop: {
        l1: ["windows", "pipes", "gauge a", "gauge b", "beacon"],
        l2: ["lamp", "cone", "coneCalm", "press", "anvil", "shelf", "tray", "conveyor"],
        l4: ["haze", "bokeh a"],
        pools: { dust: 6, heat: 10, sparks: 12, steam: 3 },
    },
}
function EosPilotParticles({ name, n }) {
    const list = []
    for (let i = 0; i < n; i++) list.push(<i key={i} style={{ "--i": i }} />)
    return (
        <div className="eosPilotPool" data-pool={name} aria-hidden="true">
            {list}
        </div>
    )
}
// <EosPilotStage ref kit reduced calm={0..1} hide={["press"]}>{play plane}</EosPilotStage>
// handle: grade(to, ms) · camera({y, scale, ms}) · particles(name, on) · burst(pool, o) · el() · layer(name)
const EosPilotStage = React.memo(
    React.forwardRef(function EosPilotStage(props, ref) {
        const { kit = "sky", calm = 0, hide, className = "", children, planeClassName = "" } = props
        const K = EOS_PILOT_KITS[kit] || EOS_PILOT_KITS.sky
        const rt = React.useRef(null)
        if (!rt.current) {
            const L = {}
            const mk = (k) => (n) => {
                L[k] = n
            }
            rt.current = { L, r: { root: mk("root"), l0: mk("l0"), l0c: mk("l0c"), l1: mk("l1"), l2: mk("l2"), plane: mk("plane"), fx: mk("fx"), l4: mk("l4") }, anims: new Set(), cam: [], graded: false, rr: {}, pools: null, gradeT: 0 }
        }
        const R = rt.current
        const hidden = (c) => !!(hide && hide.indexOf(String(c).split(" ")[0]) >= 0)
        React.useLayoutEffect(() => {
            if (!R.graded && R.L.root) R.L.root.style.setProperty("--calm", eosClamp(calm, 0, 1).toFixed(3))
        }, [calm])
        React.useEffect(
            () => () => {
                eosPilotAnimCancel(R.anims)
                if (R.gradeT) clearTimeout(R.gradeT)
            },
            []
        )
        const pool = (name) => {
            if (!R.pools) R.pools = {}
            if (!R.pools[name] && R.L.fx) R.pools[name] = Array.from(R.L.fx.querySelectorAll(`[data-pool="${name}"] > i`))
            return R.pools[name] || []
        }
        React.useImperativeHandle(
            ref,
            () => ({
                el: () => R.L.root,
                layer: (n) => R.L[n] || null,
                // supporting move only (S2 grade rule): the calm layer -> `to` (<= 1), props follow by CSS transition
                grade(to, ms = 1200) {
                    const root = R.L.root
                    if (!root) return
                    R.graded = true
                    const l0c = R.L.l0c
                    root.style.setProperty("--calm-ms", `${Math.max(0, ms | 0)}ms`)
                    if (l0c) l0c.style.willChange = "opacity"
                    root.style.setProperty("--calm-k", "1")
                    root.style.setProperty("--calm", eosClamp(to, 0, 1).toFixed(3))
                    if (R.gradeT) clearTimeout(R.gradeT)
                    R.gradeT = setTimeout(() => {
                        R.gradeT = 0
                        if (l0c) l0c.style.willChange = ""
                    }, ms + 80)
                },
                camera(o) {
                    const c = o || {}
                    const root = R.L.root
                    R.cam.forEach((a) => {
                        try {
                            a.cancel()
                        } catch (e) {}
                    })
                    R.cam = []
                    if (!root || eosPilotIsReduced(root)) return
                    const y = Number(c.y) || 0
                    const s = c.scale == null ? 1 : Number(c.scale)
                    const ms = c.ms || 900
                    const depth = { l0: 0.1, l0c: 0.1, l1: 0.3, l2: 0.6, plane: 1, fx: 1, l4: 1.3 }
                    for (const k in depth) {
                        const f = depth[k]
                        const el = R.L[k]
                        if (!el) continue
                        const prev = R.camNow ? R.camNow[k] : "none"
                        const to = y || s !== 1 ? `translateY(${(y * f).toFixed(1)}px) scale(${(1 + (s - 1) * f).toFixed(4)})` : "none"
                        const a = eosPilotAnim(R.anims, el, [{ transform: prev || "none" }, { transform: to }], { duration: ms, easing: c.easing || "cubic-bezier(.4,0,.2,1)", fill: "forwards" })
                        if (a) R.cam.push(a)
                        R.camNow = R.camNow || {}
                        R.camNow[k] = to
                    }
                },
                particles(name, on = true) {
                    if (R.L.root) R.L.root.setAttribute(`data-fx-${name}`, on ? "1" : "0")
                },
                // reuses pooled nodes round-robin, never mounts new ones. x/y in stage px.
                burst(poolName, o) {
                    const c = o || {}
                    const nodes = pool(poolName)
                    if (!nodes.length) return []
                    const red = eosPilotIsReduced(R.L.root)
                    const n = Math.min(nodes.length, Math.max(1, red ? Math.ceil((c.n || 8) / 3) : c.n || 8))
                    const ms = c.ms || 760
                    const dist = c.dist || 70
                    const spread = c.spread == null ? 360 : c.spread
                    const base = c.angle == null ? -90 : c.angle
                    const g = c.gravity || 0
                    const out = []
                    R.rr[poolName] = R.rr[poolName] || 0
                    for (let i = 0; i < n; i++) {
                        const el = nodes[R.rr[poolName]++ % nodes.length]
                        const seed = (c.seed || 0) + i * 13 + R.rr[poolName]
                        const ang = ((spread >= 360 ? eosPilotRand(seed) * 360 : base + (eosPilotRand(seed) - 0.5) * spread) * Math.PI) / 180
                        const d = dist * (0.45 + 0.55 * eosPilotRand(seed + 1))
                        const dx = Math.cos(ang) * d
                        const dy = Math.sin(ang) * d
                        const s0 = c.s0 == null ? 0.6 + 0.6 * eosPilotRand(seed + 2) : c.s0
                        const s1 = c.s1 == null ? 0.2 : c.s1
                        if (c.hue != null) el.style.setProperty("--p-hue", String(c.hue))
                        const x = Number(c.x) || 0
                        const y = Number(c.y) || 0
                        const kf = red
                            ? [
                                  { transform: `translate(${(x + dx * 0.3).toFixed(1)}px,${(y + dy * 0.3).toFixed(1)}px) scale(${s0.toFixed(2)})`, opacity: 0 },
                                  { transform: `translate(${(x + dx * 0.3).toFixed(1)}px,${(y + dy * 0.3).toFixed(1)}px) scale(${s0.toFixed(2)})`, opacity: 0.9, offset: 0.3 },
                                  { transform: `translate(${(x + dx * 0.3).toFixed(1)}px,${(y + dy * 0.3).toFixed(1)}px) scale(${s0.toFixed(2)})`, opacity: 0 },
                              ]
                            : [
                                  { transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s0.toFixed(2)}) rotate(0deg)`, opacity: 1 },
                                  { transform: `translate(${(x + dx * 0.7).toFixed(1)}px,${(y + dy * 0.7 + g * 0.25).toFixed(1)}px) scale(${((s0 + s1) / 2).toFixed(2)}) rotate(${(c.spin || 0) * 0.6}deg)`, opacity: 0.95, offset: 0.45 },
                                  { transform: `translate(${(x + dx).toFixed(1)}px,${(y + dy + g).toFixed(1)}px) scale(${s1.toFixed(2)}) rotate(${c.spin || 0}deg)`, opacity: 0 },
                              ]
                        const a = eosPilotAnim(c.anims || R.anims, el, kf, { duration: ms * (0.8 + 0.4 * eosPilotRand(seed + 3)), delay: (c.stagger || 0) * i, easing: c.easing || "cubic-bezier(.15,.7,.3,1)" })
                        if (a) out.push(a)
                    }
                    return out
                },
            }),
            []
        )
        const prop = (c, i) => (hidden(c) ? null : <i key={c + i} className={`eosPilotProp ${c}`} aria-hidden="true" />)
        return (
            <div ref={R.r.root} className={`eosPilotStage ${className}`} data-kit={kit}>
                <div ref={R.r.l0} className="eosPilotL0" aria-hidden="true" />
                <div ref={R.r.l0c} className="eosPilotL0c" aria-hidden="true" />
                <div ref={R.r.l1} className="eosPilotL1" aria-hidden="true">
                    {K.l1.map(prop)}
                </div>
                <div ref={R.r.l2} className="eosPilotL2" aria-hidden="true">
                    {K.l2.map(prop)}
                </div>
                <div ref={R.r.plane} className={`eosPilotPlane ${planeClassName}`}>
                    {children}
                </div>
                <div ref={R.r.fx} className="eosPilotFx" aria-hidden="true">
                    {Object.keys(K.pools).map((name) => (
                        <EosPilotParticles key={name} name={name} n={K.pools[name]} />
                    ))}
                </div>
                <div ref={R.r.l4} className="eosPilotL4" aria-hidden="true">
                    {K.l4.map(prop)}
                </div>
            </div>
        )
    })
)

// ================================================================= S4 · useEosPilotSound
const EOS_PILOT_SOUND_LOG = []
const EOS_PILOT_SOUND = { ev: 0 }
function eosPilotSoundRow(row) {
    EOS_PILOT_SOUND_LOG.push(row)
    if (EOS_PILOT_SOUND_LOG.length > 400) EOS_PILOT_SOUND_LOG.splice(0, EOS_PILOT_SOUND_LOG.length - 400)
    return row
}
eosExpose("pilot", {
    soundLog: () => EOS_PILOT_SOUND_LOG.slice(),
    clearSoundLog: () => {
        EOS_PILOT_SOUND_LOG.length = 0
    },
    decoded: () => EOS_PILOT_DECODED.n,
})
// Timing fields for one eosTone layer scheduled `at` s after now (spec §2 S4 log).
function eosPilotToneTiming(ctx, at, inputT) {
    const now = performance.now()
    const out = { t: now + at * 1000, dt: now + at * 1000 - inputT, ctxState: ctx ? ctx.state : "none", lat: 0, audT: null, dtAudible: null, audible: ctx ? (ctx.state === "running" ? "yes" : "no") : "no" }
    if (!ctx) return out
    const lat = (ctx.baseLatency || 0) + (ctx.outputLatency || 0)
    out.lat = lat
    out.audT = ctx.currentTime + at
    let perf = null
    try {
        if (typeof ctx.getOutputTimestamp === "function") {
            const ts = ctx.getOutputTimestamp()
            if (ts && ts.contextTime > 0 && ts.performanceTime > 0) perf = ts.performanceTime + (out.audT - ts.contextTime) * 1000 + lat * 1000
        }
    } catch (e) {}
    out.dtAudible = perf != null ? perf - inputT : now - inputT + at * 1000 + lat * 1000
    return out
}
// const snd = useEosPilotSound({gameId, live, cues, timers})
// snd.cue(name, e, o) · snd.later(name, ms, T0, o) · snd.warm()
// A cue is a SET OF LAYERS: {arcade: kind} | {tone: [f, ms, opts] | (o) => [...]} | {haptic} (+ impact: true).
function useEosPilotSound(cfg) {
    const cfgRef = React.useRef(cfg)
    cfgRef.current = cfg
    const api = React.useRef(null)
    if (!api.current) {
        const fire = (name, e, o, timed) => {
            const c = cfgRef.current
            const layers = (c.cues && c.cues[name]) || []
            const evId = ++EOS_PILOT_SOUND.ev
            const opt = o || {}
            const tt = timed ? { t: opt.inputT, fallback: false } : eosPilotEvT(e)
            const inputT = tt.t
            const action = opt.action || (timed ? `timed:${opt.beat || name}` : e && e.type ? e.type : "call")
            const rows = []
            const base = { evId, action, cue: name, inputT, tsFallback: tt.fallback, queued: !!timed, game: c.gameId == null ? null : c.gameId }
            const impactT = () => {
                if (opt.impactT != null) return opt.impactT
                const a = opt.anim
                if (!a) return null
                try {
                    const st = a.startTime != null ? a.startTime : document.timeline.currentTime
                    return st + (opt.impactOffset || 0) - inputT
                } catch (x) {
                    return null
                }
            }
            const tone = (L, i, args, extra) => {
                const [f, ms, to] = args
                const at = Math.max(0, Number((to || {}).at) || 0)
                const ctx = eosAudio()
                if (ctx) eosTone(f, ms, to || {})
                const tm = eosPilotToneTiming(ctx, at, inputT)
                rows.push(eosPilotSoundRow({ ...base, layer: extra || i, via: "tone", at, ...tm, impact: !!L.impact, impactT: L.impact ? impactT() : null, muted: !ctx }))
            }
            const order = layers.map((L, i) => [L, i]).sort((a, b) => (a[0].arcade ? 1 : 0) - (b[0].arcade ? 1 : 0))
            order.forEach(([L, i]) => {
                try {
                    if (L.arcade) {
                        const live = c.live && c.live.current
                        let muted = false
                        try {
                            muted = !EOS_STORE.get().sound
                        } catch (x) {}
                        if (live && typeof live.sfx === "function") live.sfx(L.arcade)
                        const now = performance.now()
                        rows.push(eosPilotSoundRow({ ...base, layer: i, via: "arcade", kind: L.arcade, t: now, dt: now - inputT, at: 0, ctxState: "unknown", lat: null, audT: null, dtAudible: null, audible: "unknown", impact: !!L.impact, impactT: L.impact ? impactT() : null, muted }))
                    }
                    if (L.tone) {
                        const args = typeof L.tone === "function" ? L.tone(opt) : L.tone
                        if (args && args.length) {
                            tone(L, i, args)
                            // phone speakers (CR-15): a fundamental < 150 Hz also gets a body layer and a click transient
                            if (args[0] < 150 && !L.noBody) {
                                const to = args[2] || {}
                                const at = Number(to.at) || 0
                                tone(L, i, [eosClamp(args[0] * 2, 140, 220), Math.min(args[1], 220), { type: "triangle", gain: Math.min(0.05, (to.gain || 0.05) * 0.8), at }], `${i}:body`)
                                tone(L, i, [2600, 10, { type: "square", gain: 0.012, at }], `${i}:click`)
                            }
                        }
                    }
                    if (L.haptic) eosHaptic(L.haptic)
                } catch (x) {
                    eosPilotWarn(x)
                }
            })
            return rows
        }
        api.current = {
            cue: (name, e, o) => fire(name, e, o, false),
            // timed cue from the timer ref (cancelled on skip and unmount): fires at T0 + ms
            later(name, ms, T0, o) {
                const c = cfgRef.current
                const t0 = Number(T0) || performance.now()
                const d = Math.max(0, t0 + ms - performance.now())
                const run = () => fire(name, null, { ...(o || {}), inputT: t0 }, true)
                if (d <= 0) {
                    run()
                    return 0
                }
                return c.timers ? c.timers.later(run, d) : setTimeout(run, d)
            },
            // the arena's first pointerdown: create + resume the context inside a user gesture (iOS)
            warm() {
                try {
                    eosAudio()
                } catch (e) {}
            },
        }
    }
    return api.current
}

// ================================================================= S5 · gestures
// const g = useEosPilotGesture({kind:"tap"|"hold", holdMs, fillMs, fillVar, fillEl(el), onDown, onHoldReady,
//   onHoldFull, onHoldDone, onHoldCancel, timers})
// <button type="button" className="eosPilotHit" {...g.bind(key)} />   · g.route(e, el) (near-hit) · g.cancel()
function useEosPilotGesture(opts) {
    const oRef = React.useRef(opts)
    oRef.current = opts
    const api = React.useRef(null)
    if (!api.current) {
        const st = { hold: null }
        const info = (el, e, extra) => ({ key: el ? el.getAttribute("data-pk") : null, el, pointerId: e && e.pointerId, t: eosPilotEvT(e).t, ...(extra || {}) })
        const clearHoldTimers = (h) => {
            if (!h) return
            clearTimeout(h.tReady)
            clearTimeout(h.tFull)
            clearInterval(h.iv)
        }
        const setPct = (el, v) => {
            const o = oRef.current
            try {
                el.style.setProperty(o.fillVar || "--hold-pct", v)
            } catch (e) {}
        }
        const startHold = (el, e, kb) => {
            const o = oRef.current
            const holdMs = o.holdMs || 850
            const fillMs = o.fillMs || 3000
            const fill = typeof o.fillEl === "function" ? o.fillEl(el) : el.querySelector(".eosPilotFill")
            let anim = null
            if (fill) {
                try {
                    if (fill.__eosPilotFill) fill.__eosPilotFill.cancel()
                } catch (x) {}
                anim = eosPilotAnim(o.anims, fill, [{ transform: "translateY(100%)" }, { transform: "translateY(0%)" }], { duration: fillMs, easing: "cubic-bezier(.33,.1,.3,1)", fill: "forwards" })
                fill.__eosPilotFill = anim
            }
            const t0 = performance.now()
            const h = { el, pointerId: e && e.pointerId, kb: !!kb, t0, ready: false, full: false, anim, fillMs, holdMs }
            st.hold = h
            setPct(el, "0%")
            h.iv = setInterval(() => {
                if (h.full) return
                let ct = performance.now() - t0
                try {
                    if (anim && anim.currentTime != null) ct = anim.currentTime
                } catch (x) {}
                setPct(el, `${Math.min(99, Math.floor((ct / fillMs) * 100))}%`)
            }, 50)
            h.tReady = setTimeout(() => {
                h.ready = true
                el.setAttribute("data-hold", "ready")
                const cb = oRef.current.onHoldReady
                if (cb) cb(info(el, e, { ms: holdMs }))
            }, holdMs)
            h.tFull = setTimeout(() => {
                h.full = true
                clearInterval(h.iv)
                setPct(el, "100%")
                el.setAttribute("data-hold", "full")
                const cb = oRef.current.onHoldFull
                if (cb) cb(info(el, e, { ms: fillMs }))
            }, fillMs)
            el.setAttribute("data-hold", "on")
        }
        const endHold = (e, cancelled) => {
            const h = st.hold
            if (!h) return
            st.hold = null
            clearHoldTimers(h)
            const el = h.el
            el.removeAttribute("data-press")
            el.removeAttribute("data-hold")
            try {
                if (!h.kb && h.pointerId != null && el.hasPointerCapture && el.hasPointerCapture(h.pointerId)) el.releasePointerCapture(h.pointerId)
            } catch (x) {}
            const ms = performance.now() - h.t0
            const o = oRef.current
            const drain = (rate) => {
                if (!h.anim) return
                try {
                    h.anim.updatePlaybackRate(rate)
                    h.anim.play()
                } catch (x) {}
            }
            if (!cancelled && ms >= h.holdMs) {
                drain(-1.4)
                if (o.onHoldDone) o.onHoldDone(e, info(el, e, { ms, full: ms >= h.fillMs }))
            } else {
                drain(-2)
                setPct(el, "0%")
                if (o.onHoldCancel) o.onHoldCancel(e, info(el, e, { ms }))
            }
        }
        const down = (e, el) => {
            const o = oRef.current
            if (!el || el.disabled) return
            if (st.hold) return // one hold at a time; secondary pointers are ignored
            if (el.getAttribute("data-press") && el.__eosPilotPid != null && el.__eosPilotPid !== e.pointerId) return
            if (e.cancelable) e.preventDefault()
            el.__eosPilotPid = e.pointerId
            el.setAttribute("data-press", "1")
            if (o.kind === "hold") {
                try {
                    if (e.pointerId != null) el.setPointerCapture(e.pointerId)
                } catch (x) {}
                startHold(el, e, false)
                if (o.onDown) o.onDown(e, info(el, e))
                return
            }
            if (o.onDown) o.onDown(e, info(el, e))
            clearTimeout(el.__eosPilotPressT)
            el.__eosPilotPressT = setTimeout(() => el.removeAttribute("data-press"), 420)
        }
        const handlers = {
            onPointerDown: (e) => down(e, e.currentTarget),
            onPointerUp: (e) => {
                if (st.hold && st.hold.el === e.currentTarget && !st.hold.kb) endHold(e, false)
                else e.currentTarget.removeAttribute("data-press")
            },
            onPointerCancel: (e) => {
                if (st.hold && st.hold.el === e.currentTarget) endHold(e, true)
            },
            onLostPointerCapture: (e) => {
                if (st.hold && st.hold.el === e.currentTarget && !st.hold.kb) endHold(e, false)
            },
            onContextMenu: (e) => e.preventDefault(),
            onKeyDown: (e) => {
                const o = oRef.current
                const el = e.currentTarget
                if (e.key === "Escape") {
                    if (st.hold && st.hold.el === el) endHold(e, true)
                    return
                }
                if (e.key !== "Enter" && e.key !== " ") return
                e.preventDefault()
                if (e.repeat || el.disabled) return
                if (o.kind === "hold") {
                    if (st.hold) return
                    el.setAttribute("data-press", "1")
                    startHold(el, e, true)
                    if (o.onDown) o.onDown(e, info(el, e))
                } else if (o.onDown) o.onDown(e, info(el, e))
            },
            onKeyUp: (e) => {
                if ((e.key === "Enter" || e.key === " ") && st.hold && st.hold.el === e.currentTarget && st.hold.kb) endHold(e, false)
            },
            onBlur: (e) => {
                if (st.hold && st.hold.el === e.currentTarget && st.hold.kb) endHold(e, true)
            },
        }
        api.current = {
            bind: (key) => ({ ...handlers, "data-pk": key == null ? undefined : String(key), type: "button" }),
            route: (e, el) => down(e, el),
            cancel: () => endHold(null, true),
            holding: () => (st.hold ? st.hold.el : null),
        }
    }
    React.useEffect(() => () => api.current && api.current.cancel(), [])
    return api.current
}
// Forgiveness: a pointerdown on empty stage within `radius` px of a live target's edge -> that target.
// Reads rects only (no writes) so there is no forced layout. Returns (e) => {el, d} | null.
function useEosPilotNearHit(arenaRef, getLiveTargets, radius = 28) {
    const fRef = React.useRef(getLiveTargets)
    fRef.current = getLiveTargets
    return React.useCallback(
        (e) => {
            const list = (fRef.current && fRef.current()) || []
            let best = null
            for (const el of list) {
                if (!el || el.disabled || !el.getBoundingClientRect) continue
                const r = el.getBoundingClientRect()
                const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
                const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
                const d = Math.hypot(dx, dy)
                if (d <= radius && (!best || d < best.d)) best = { el, d }
            }
            return best
        },
        [radius]
    )
}
// The play box: {w, h, u, phone, play:{top, bottom, left, right}} in arena px. Also writes the toast top.
function eosPilotMeasureBox(arena) {
    const A = arena.getBoundingClientRect()
    const w = A.width
    const h = A.height
    const phone = w < 700
    const u = phone ? Math.min(w / 360, h / 480) : Math.min(w / 1180, h / 620)
    const wrap = arena.closest(".engineProgressWrap") || arena.closest(".releaseStage") || document
    const hud = wrap.querySelector ? wrap.querySelector(".engineProgressHud") : null
    const sh = eosPilotShell(arena)
    let top = 8
    let toastTop = 72
    if (hud) {
        const H = hud.getBoundingClientRect()
        if (H.height > 0) {
            top = Math.max(8, H.bottom - A.top + 8)
            const S = sh ? sh.getBoundingClientRect() : A
            toastTop = Math.max(8, H.bottom - S.top + 8)
        }
    }
    let bottom = h - 8
    const guide = sh ? sh.querySelector(":scope > .globalPlayGuide") : null
    if (guide) {
        const G = guide.getBoundingClientRect()
        if (G.height > 0) bottom = phone ? Math.min(h - 8, G.bottom - A.top - 44 - 8) : Math.min(h - 8, h - Math.min(G.height, 220) - 8)
    }
    if (bottom - top < h * 0.45) bottom = Math.min(h - 8, top + h * 0.45)
    return { w, h, u, phone, play: { top, bottom, left: 8, right: w - 8 }, toastTop }
}
function useEosPilotBox(arenaRef) {
    const [box, setBox] = React.useState(null)
    React.useLayoutEffect(() => {
        const arena = arenaRef.current
        if (!arena) return undefined
        let raf = 0
        let lastVV = null
        let guideMax = 0
        const measure = () => {
            raf = 0
            const b = eosPilotMeasureBox(arena)
            if (!b.phone) {
                // desktop: the guide's maximum height, measured once per arena size
                const key = `${Math.round(b.w)}x${Math.round(b.h)}`
                if (measure.key !== key) {
                    measure.key = key
                    guideMax = b.h - 8 - b.play.bottom
                } else b.play.bottom = Math.min(b.play.bottom, b.h - 8 - guideMax)
            }
            eosPilotShellAttrs(arena, { toastTop: b.toastTop })
            setBox((prev) => (prev && Math.abs(prev.w - b.w) < 1 && Math.abs(prev.h - b.h) < 1 && Math.abs(prev.play.top - b.play.top) < 1 && Math.abs(prev.play.bottom - b.play.bottom) < 1 ? prev : b))
        }
        const kick = () => {
            if (!raf) raf = requestAnimationFrame(measure)
        }
        measure()
        const t = setTimeout(kick, 400) // after the wrapper's guide and HUD settle
        let ro = null
        try {
            ro = new ResizeObserver(kick)
            ro.observe(arena)
        } catch (e) {}
        const vv = typeof window !== "undefined" ? window.visualViewport : null
        const onVV = () => {
            const cur = vv ? [vv.width, vv.height] : null
            if (lastVV && cur && Math.abs(cur[0] - lastVV[0]) < 1 && Math.abs(cur[1] - lastVV[1]) < 80) return
            lastVV = cur
            kick()
        }
        if (vv) {
            lastVV = [vv.width, vv.height]
            vv.addEventListener("resize", onVV)
        }
        return () => {
            clearTimeout(t)
            if (raf) cancelAnimationFrame(raf)
            if (ro) ro.disconnect()
            if (vv) vv.removeEventListener("resize", onVV)
        }
    }, [arenaRef])
    return box
}

// ================================================================= CSS (S1 rig, S3 kits, S5 hits)
const EOS_PILOT_AR = `${EOS_A} .eosPilotArena`
const EOS_PILOT_FACE_CSS = EOS_PILOT_STEP_KEYS.map((k, i) => `${EOS_PILOT_AR} .eosPilotActor[data-step="${i}"]:not([data-react]) .eosPilotActorFace img[data-k="${k}"][data-ready="1"]`).join(",\n") +
    `,\n${EOS_PILOT_AR} .eosPilotActor[data-user="1"] .eosPilotActorFace img[data-k="user"][data-ready="1"]{opacity:1;z-index:1;transition:opacity .24s ease}\n` +
    EOS_PILOT_REACT_KEYS.map((k) => `${EOS_PILOT_AR} .eosPilotActor[data-react="${k}"] .eosPilotActorFace img[data-k="${k}"][data-ready="1"]`).join(",\n") +
    `{opacity:1;z-index:2;transition:opacity 90ms ease}\n`
const EOS_PILOT_FX_CSS = `
/* No @property --hold-pct: a registration is global, and inherits:false broke the ORIGINAL CLEANSE meter (?pilot=off). The pilot writes the var on the bound hit only. */
${EOS_PILOT_AR}{--eos-pilot-word-px:16px}
${EOS_PILOT_AR} :is(.eosPilotPool,.eosPilotProp,.eosPilotL0,.eosPilotL0c,.eosPilotL1,.eosPilotL2,.eosPilotL4,.eosPilotFx,.quirk,.hand,.foot,.puff,.gloss,.under,.rimHot,.flash,.eosPilotActorHue){pointer-events:none}

/* ---------------- S1 actor rig */
${EOS_PILOT_AR} .eosPilotActor{position:absolute;left:50%;top:50%;width:var(--a-size);height:var(--a-size);translate:-50% -50%;
  --tug-amp:0deg;--tug-period:3.2s;--stance:8px;--heat:0;--under:0}
${EOS_PILOT_AR} .eosPilotActorPos,${EOS_PILOT_AR} .eosPilotActorIdle,${EOS_PILOT_AR} .eosPilotActorBody{position:absolute;inset:0}
${EOS_PILOT_AR} .eosPilotActorIdle{transform-origin:50% 100%;animation:eosPilotBreathe 2.4s ease-in-out var(--a-delay,0s) infinite alternate}
${EOS_PILOT_AR} .eosPilotActor[data-role="holder"] .eosPilotActorIdle{animation:eosPilotBreathe 2.4s ease-in-out var(--a-delay,0s) infinite alternate,eosPilotSway var(--tug-period) ease-in-out var(--a-delay,0s) infinite alternate}
${EOS_PILOT_AR} .eosPilotActorBody{transform-origin:50% 100%}
${EOS_PILOT_AR} .eosPilotActorBall{position:absolute;inset:0;border-radius:50%;overflow:hidden;z-index:1;isolation:isolate;
  background:radial-gradient(circle at 50% 36%,hsl(var(--a-hue) 92% 80%),hsl(var(--a-hue) 74% 60%) 60%,hsl(var(--a-hue) 66% 50%));
  box-shadow:0 0 calc(var(--a-size)*.2) hsla(var(--a-hue),90%,72%,.38)}
${EOS_PILOT_AR} .eosPilotActorBall::after{content:"";position:absolute;inset:0;border-radius:50%;pointer-events:none;z-index:6;
  box-shadow:inset calc(var(--eos-pilot-rim-dir,1)*var(--a-size)*-.05) 0 calc(var(--a-size)*.07) calc(var(--a-size)*-.02) var(--eos-pilot-rim,rgba(170,220,255,.8)),inset 0 0 0 1.5px rgba(255,255,255,.4)}
${EOS_PILOT_AR} .eosPilotActorHue{position:absolute;inset:0;display:grid;place-items:center;font-style:normal;z-index:0}
${EOS_PILOT_AR} .eosPilotActorHue::after{content:attr(data-i);font-weight:900;font-size:calc(var(--a-size)*.36);color:rgba(255,255,255,.9);text-shadow:0 2px 8px hsla(var(--a-hue),80%,30%,.5)}
${EOS_PILOT_AR} .eosPilotActorFace{position:absolute;inset:0;z-index:2}
${EOS_PILOT_AR} .eosPilotActorFace img{position:absolute;left:-4%;top:-4%;width:108%;height:108%;max-width:none;object-fit:cover;border-radius:50%;opacity:0;z-index:0;
  transition:opacity 0s linear .26s;-webkit-user-drag:none;user-select:none;pointer-events:none}
${EOS_PILOT_AR} .eosPilotActor[data-react] .eosPilotActorFace img{transition:opacity 0s linear .12s}
${EOS_PILOT_FACE_CSS}
${EOS_PILOT_AR} .eosPilotActorBall > i{position:absolute;inset:0;border-radius:50%;font-style:normal}
${EOS_PILOT_AR} .eosPilotActorBall > .gloss{z-index:4;background:radial-gradient(circle at var(--eos-pilot-gloss-x,32%) var(--eos-pilot-gloss-y,22%),rgba(255,255,255,.72),rgba(255,255,255,.2) 15%,transparent 34%)}
${EOS_PILOT_AR} .eosPilotActorBall > .under{z-index:3;opacity:var(--under);transition:opacity .35s ease;background:radial-gradient(ellipse 80% 55% at 50% 100%,rgba(255,200,110,.9),rgba(255,170,80,.35) 50%,transparent 75%)}
${EOS_PILOT_AR} .eosPilotActorBall > .rimHot{z-index:3;opacity:var(--heat);transition:opacity .12s linear;box-shadow:inset 0 0 calc(var(--a-size)*.14) calc(var(--a-size)*.02) rgba(255,70,40,.85)}
${EOS_PILOT_AR} .eosPilotActorBall > .flash{z-index:5;opacity:0;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.95),rgba(255,255,255,.35) 70%)}
${EOS_PILOT_AR} .eosPilotActor[data-user="1"] .eosPilotActorBall{box-shadow:0 0 0 3px var(--halo,rgba(255,140,100,.8)),0 0 calc(var(--a-size)*.22) var(--halo,rgba(255,140,100,.5))}
${EOS_PILOT_AR} .eosPilotActor[data-user="1"][data-step="1"]{--halo:rgba(255,205,150,.75)}
${EOS_PILOT_AR} .eosPilotActor[data-user="1"]:is([data-step="2"],[data-step="3"]){--halo:rgba(150,220,255,.75)}
${EOS_PILOT_AR} .eosPilotActor .hand{position:absolute;z-index:2;width:calc(var(--a-size)*.16);height:calc(var(--a-size)*.16);border-radius:50%;top:52%;font-style:normal;
  background:radial-gradient(circle at 36% 30%,hsl(var(--a-hue) 95% 86%),hsl(var(--a-hue) 74% 62%) 72%);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6),0 1px 3px hsla(var(--a-hue),60%,30%,.25);
  transition:translate .5s cubic-bezier(.3,.7,.3,1)}
${EOS_PILOT_AR} .eosPilotActor .hand.l{left:calc(var(--a-size)*-.08)}
${EOS_PILOT_AR} .eosPilotActor .hand.r{right:calc(var(--a-size)*-.08)}
${EOS_PILOT_AR} .eosPilotActor[data-role="holder"] .hand{top:40%}
${EOS_PILOT_AR} .eosPilotActor[data-role="inside"] .hand{top:34%}
${EOS_PILOT_AR} .eosPilotActor .foot{position:absolute;z-index:0;bottom:calc(var(--a-size)*-.055);width:calc(var(--a-size)*.143);height:calc(var(--a-size)*.09);border-radius:50%;font-style:normal;
  left:calc(50% - var(--stance) - var(--a-size)*.143);background:radial-gradient(ellipse at 40% 30%,hsl(var(--a-hue) 90% 80%),hsl(var(--a-hue) 70% 54%) 75%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5);transition:left .3s ease}
${EOS_PILOT_AR} .eosPilotActor .foot.r{left:calc(50% + var(--stance))}
${EOS_PILOT_AR} .eosPilotActor .puff{position:absolute;left:50%;top:-6%;width:calc(var(--a-size)*.34);height:calc(var(--a-size)*.22);border-radius:50%;opacity:0;font-style:normal;z-index:3;
  background:radial-gradient(ellipse,rgba(255,255,255,.85),rgba(255,255,255,0) 70%)}
${EOS_PILOT_AR} .eosPilotActorLabel{position:absolute;left:50%;top:calc(100% + 6px);translate:-50% 0;width:max-content;max-width:calc(var(--a-size)*1.8 + 40px);
  display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;white-space:normal;overflow-wrap:anywhere;pointer-events:none;
  color:var(--eos-pilot-ink,#fff);text-shadow:0 1px 2px rgba(0,0,0,.45),0 0 10px rgba(0,0,30,.35);transition:opacity .4s ease}
${EOS_PILOT_AR} .eosPilotActor[data-label="0"] .eosPilotActorName{opacity:0}
${EOS_PILOT_AR} .eosPilotActorName{font-size:13px;font-weight:900;letter-spacing:.08em;transition:opacity .4s ease}
${EOS_PILOT_AR} .eosPilotActorSub{font-size:13px;font-weight:700;opacity:.9;letter-spacing:.02em}
/* idle quirks (<= 3 nodes, CSS only, fading out by step 2) */
${EOS_PILOT_AR} .eosPilotActor .quirk{position:absolute;inset:0;font-style:normal;transition:opacity .8s ease;z-index:3}
${EOS_PILOT_AR} .eosPilotActor:is([data-step="2"],[data-step="3"]) .quirk{opacity:0}
${EOS_PILOT_AR} .eosPilotActor .quirk::before,${EOS_PILOT_AR} .eosPilotActor .quirk::after{content:"";position:absolute}
${EOS_PILOT_AR} .eosPilotActor[data-char="rush"] .quirk::before,${EOS_PILOT_AR} .eosPilotActor[data-char="rush"] .quirk::after{width:22%;height:16%;top:-10%;left:22%;border-radius:50%;
  background:radial-gradient(ellipse,rgba(255,255,255,.9),rgba(255,255,255,0) 70%);animation:eosPilotSteam 2.2s ease-out infinite}
${EOS_PILOT_AR} .eosPilotActor[data-char="rush"] .quirk::after{left:58%;animation-delay:1.1s}
${EOS_PILOT_AR} .eosPilotActor[data-char="sync"] .quirk{z-index:0}
${EOS_PILOT_AR} .eosPilotActor[data-char="sync"] .quirk::before{inset:-7%;border-radius:50%;box-shadow:0 0 0 2px hsla(var(--a-hue),95%,80%,.55),0 0 18px hsla(var(--a-hue),95%,70%,.45);
  animation:eosPilotBeat .55s ease-out infinite}
${EOS_PILOT_AR} .eosPilotActor[data-char="sync"][data-step="1"] .quirk::before{animation-duration:.75s}
${EOS_PILOT_AR} .eosPilotActor[data-char="glitch"]:is([data-step="0"],[data-step="1"]) .eosPilotActorFace{animation:eosPilotJitter .5s steps(2) infinite}
${EOS_PILOT_AR} .eosPilotActor[data-char="loopie"] .quirk::before{width:26%;height:26%;left:37%;top:-24%;border-radius:50%;border:2px solid rgba(255,220,255,.85);
  border-left-color:transparent;border-bottom-color:transparent;animation:eosPilotSpin 3.6s linear infinite}
${EOS_PILOT_AR} .eosPilotActor[data-char="drop"] .quirk::before{width:7%;height:10%;left:30%;top:46%;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
  background:radial-gradient(circle at 40% 35%,#fff,#9fd2ff 70%);animation:eosPilotTear 3.4s ease-in infinite}
${EOS_PILOT_AR} .eosPilotActor[data-char="still"] .quirk{z-index:0}
${EOS_PILOT_AR} .eosPilotActor[data-char="still"] .quirk::before{inset:-12%;border-radius:50%;background:radial-gradient(circle,hsla(190,100%,85%,.45),transparent 70%);animation:eosPilotGlow 3.2s ease-in-out infinite alternate}
${EOS_PILOT_AR} .eosPilotActor[data-char="patch"][data-role="breath"] .quirk::before,${EOS_PILOT_AR} .eosPilotActor[data-char="patch"][data-role="breath"] .quirk::after{width:30%;height:24%;top:44%;left:16%;border-radius:50%;
  background:radial-gradient(circle at 40% 30%,hsl(24 95% 80%),hsl(24 80% 60%));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6)}
${EOS_PILOT_AR} .eosPilotActor[data-char="patch"][data-role="breath"] .quirk::after{left:54%}
${EOS_PILOT_AR} .eosPilotActor[data-char="patch"][data-step="0"] .hand.l{translate:calc(var(--a-size)*.3) calc(var(--a-size)*-.06)}
${EOS_PILOT_AR} .eosPilotActor[data-char="patch"][data-step="0"] .hand.r{translate:calc(var(--a-size)*-.3) calc(var(--a-size)*-.06)}
${EOS_PILOT_AR} .eosPilotActor[data-char="patch"][data-step="1"] .hand.l{translate:calc(var(--a-size)*.16) calc(var(--a-size)*.1)}
${EOS_PILOT_AR} .eosPilotActor[data-char="patch"][data-step="1"] .hand.r{translate:calc(var(--a-size)*-.16) calc(var(--a-size)*.1)}

/* ---------------- S5 hits */
${EOS_PILOT_AR} .eosPilotHit{position:absolute;display:block;appearance:none;-webkit-appearance:none;cursor:pointer;touch-action:none;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none}
${EOS_PILOT_AR} .eosPilotHit::before{content:"";position:absolute;left:50%;top:50%;width:max(100%,64px);height:max(100%,64px);translate:-50% -50%;border-radius:50%}
${EOS_PILOT_AR} .eosPilotHit:disabled{cursor:default}
${EOS_PILOT_AR} .eosPilotPlane.isLocked{pointer-events:none}
${EOS_PILOT_AR} .isGone :is(.eosPilotActorIdle,.eosPilotActorFace,.quirk),${EOS_PILOT_AR} .isGone .quirk::before,${EOS_PILOT_AR} .isGone .quirk::after{animation:none!important}
${EOS_PILOT_AR} .eosPilotFill{position:absolute;inset:0;z-index:3;transform:translateY(100%);pointer-events:none;
  background:linear-gradient(180deg,rgba(210,235,255,.55),rgba(150,200,255,.35) 40%,rgba(120,170,255,.45));box-shadow:inset 0 2px 0 rgba(255,255,255,.7)}

/* ---------------- S3 stage + light rig */
${EOS_PILOT_AR} .eosPilotStage{position:absolute;inset:0;overflow:hidden;--calm:0;--calm-k:.7;--calm-ms:900ms;--eos-pilot-horizon:24%}
${EOS_PILOT_AR} .eosPilotStage > div{position:absolute;inset:0}
${EOS_PILOT_AR} .eosPilotStage > .eosPilotPlane{z-index:2}
${EOS_PILOT_AR} .eosPilotStage > .eosPilotFx{z-index:3}
${EOS_PILOT_AR} .eosPilotStage > .eosPilotL4{z-index:4}
${EOS_PILOT_AR} .eosPilotL0c{opacity:calc(var(--calm) * var(--calm-k));transition:opacity var(--calm-ms) ease}
${EOS_PILOT_AR} .eosPilotProp{position:absolute;display:block;font-style:normal}
${EOS_PILOT_AR} .eosPilotPool{position:absolute;inset:0}
${EOS_PILOT_AR} .eosPilotPool > i{position:absolute;left:0;top:0;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;opacity:0;font-style:normal;
  background:radial-gradient(circle at 35% 30%,#fff,hsl(var(--p-hue,200) 90% 70%) 70%)}

/* kit: sky (POP) — key: the sun, upper-left; rim: cool sky, right */
${EOS_PILOT_AR} .eosPilotStage[data-kit="sky"]{--eos-pilot-key-x:16%;--eos-pilot-key-y:12%;--eos-pilot-gloss-x:31%;--eos-pilot-gloss-y:22%;--eos-pilot-rim:rgba(159,216,255,.9);--eos-pilot-rim-dir:1;--eos-pilot-ink:#24204a}
${EOS_PILOT_AR} [data-kit="sky"] > .eosPilotL0{background:
  radial-gradient(42% 30% at 16% 12%,rgba(255,244,218,.6),rgba(255,244,218,0) 70%),
  radial-gradient(34% 7% at 28% 64%,rgba(255,255,255,.38),transparent 70%),radial-gradient(28% 6% at 80% 56%,rgba(255,255,255,.32),transparent 70%),
  radial-gradient(130% 95% at 50% 40%,transparent 58%,rgba(50,36,90,.38)),
  linear-gradient(180deg,#6F6A9E 0%,#A49AC4 55%,#D9C8DC 100%)}
${EOS_PILOT_AR} [data-kit="sky"] > .eosPilotL0c{background:radial-gradient(46% 32% at 16% 12%,rgba(255,250,232,.85),rgba(255,250,232,0) 70%),
  radial-gradient(130% 95% at 50% 40%,transparent 62%,rgba(30,90,160,.25)),linear-gradient(180deg,#4FA8EC 0%,#9AD4F6 55%,#E6F5FF 100%)}
${EOS_PILOT_AR} [data-kit="sky"] .sun{left:4%;top:2%;width:26%;aspect-ratio:1;border-radius:50%;
  background:radial-gradient(circle,#FFFDF4 0 22%,#FFF4DA 27%,rgba(255,244,218,.55) 36%,rgba(255,244,218,0) 68%)}
${EOS_PILOT_AR} [data-kit="sky"] .sunHaze{left:-4%;top:-4%;width:46%;aspect-ratio:1.2;border-radius:50%;opacity:calc(.85 - var(--calm) * .85);transition:opacity var(--calm-ms) ease;
  background:radial-gradient(closest-side,rgba(170,160,205,.85),rgba(170,160,205,.5) 55%,rgba(170,160,205,0))}
${EOS_PILOT_AR} [data-kit="sky"] :is(.cloudFar,.cloudNear){border-radius:50%;
  background:radial-gradient(38% 46% at 30% 60%,#fff 60%,transparent 62%),radial-gradient(34% 50% at 56% 44%,#fff 60%,transparent 62%),radial-gradient(30% 40% at 78% 64%,#fff 60%,transparent 62%),
  radial-gradient(60% 30% at 52% 78%,#fff 60%,transparent 62%)}
${EOS_PILOT_AR} [data-kit="sky"] .cloudFar{background:radial-gradient(38% 46% at 30% 60%,#fff 30%,rgba(255,255,255,0) 64%),radial-gradient(34% 50% at 56% 44%,#fff 30%,rgba(255,255,255,0) 64%),radial-gradient(30% 40% at 78% 64%,#fff 30%,rgba(255,255,255,0) 64%);width:30%;aspect-ratio:2.2;opacity:.5;animation:eosPilotDrift 34s ease-in-out infinite alternate}
${EOS_PILOT_AR} [data-kit="sky"] .cloudFar.a{left:46%;top:9%}
${EOS_PILOT_AR} [data-kit="sky"] .cloudFar.b{left:72%;top:22%;width:24%;animation-duration:40s;animation-delay:-12s}
${EOS_PILOT_AR} [data-kit="sky"] .cloudFar.c{left:8%;top:33%;width:22%;animation-duration:28s;animation-delay:-6s}
${EOS_PILOT_AR} [data-kit="sky"] .cloudNear{width:58%;aspect-ratio:2.4;opacity:.92;animation:eosPilotDrift 22s ease-in-out infinite alternate}
${EOS_PILOT_AR} [data-kit="sky"] .cloudNear.a{left:-18%;bottom:-6%}
${EOS_PILOT_AR} [data-kit="sky"] .cloudNear.b{right:-20%;bottom:4%;width:50%;animation-delay:-9s}
${EOS_PILOT_AR} [data-kit="sky"] .bird{width:22px;height:10px;opacity:clamp(0,(var(--calm) - .62) * 5,.75);transition:opacity 1.2s ease}
${EOS_PILOT_AR} [data-kit="sky"] .bird.a{animation:eosPilotGlide 18s ease-in-out infinite alternate}
${EOS_PILOT_AR} [data-kit="sky"] .bird::before,${EOS_PILOT_AR} [data-kit="sky"] .bird::after{content:"";position:absolute;top:0;width:12px;height:8px;border-top:2px solid #3d4a73;border-radius:60% 60% 0 0}
${EOS_PILOT_AR} [data-kit="sky"] .bird::before{left:0;transform:rotate(12deg)}
${EOS_PILOT_AR} [data-kit="sky"] .bird::after{left:10px;transform:rotate(-12deg)}
${EOS_PILOT_AR} [data-kit="sky"] .bird.a{left:58%;top:15%}
${EOS_PILOT_AR} [data-kit="sky"] .bird.b{left:66%;top:19%;scale:.7}
${EOS_PILOT_AR} [data-kit="sky"] .bokeh{width:34%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.18),transparent 65%)}
${EOS_PILOT_AR} [data-kit="sky"] .bokeh.a{left:-12%;top:46%}
${EOS_PILOT_AR} [data-kit="sky"] .bokeh.b{right:-14%;top:12%}
${EOS_PILOT_AR} [data-kit="sky"] [data-pool="motes"]{animation:eosPilotMote 11s ease-in-out infinite alternate}
${EOS_PILOT_AR} [data-kit="sky"] [data-pool="motes"] > i{width:5px;height:5px;margin:0;opacity:calc(.35 + (var(--i) * 17 % 5) * .08);background:radial-gradient(circle,#fff,rgba(255,255,255,0) 70%);
  left:calc(8% + var(--i) * 15%);top:calc(20% + (var(--i) * 37 % 60) * 1%)}
${EOS_PILOT_AR} [data-kit="sky"] [data-pool="droplets"] > i{width:9px;height:9px;margin:-4.5px 0 0 -4.5px;background:radial-gradient(circle at 35% 30%,#fff,rgba(190,225,255,.9) 45%,hsla(var(--p-hue,205),90%,72%,.85))}
${EOS_PILOT_AR} [data-kit="sky"] [data-pool="rainbow"] > i{left:50%;top:58%;width:140%;aspect-ratio:2;margin:0;translate:-50% -50%;border-radius:50% 50% 0 0;opacity:0;transition:opacity 1.1s ease;
  background:radial-gradient(closest-side at 50% 100%,transparent 70%,rgba(255,120,140,.35) 74%,rgba(255,210,120,.35) 79%,rgba(150,240,170,.32) 84%,rgba(130,200,255,.32) 89%,rgba(190,150,255,.3) 94%,transparent 98%)}
${EOS_PILOT_AR} .eosPilotStage[data-kit="sky"][data-fx-rainbow="1"] [data-pool="rainbow"] > i{opacity:1}

/* kit: pool (CLEANSE) — key: the moon, upper-right; rim: silver-blue, left */
${EOS_PILOT_AR} .eosPilotStage[data-kit="pool"]{--eos-pilot-key-x:82%;--eos-pilot-key-y:9%;--eos-pilot-gloss-x:68%;--eos-pilot-gloss-y:22%;--eos-pilot-rim:rgba(175,200,255,.9);--eos-pilot-rim-dir:-1;--eos-pilot-ink:#fff}
${EOS_PILOT_AR} [data-kit="pool"] > .eosPilotL0{background:
  radial-gradient(30% 18% at 82% 9%,rgba(207,227,255,.32),transparent 70%),
  radial-gradient(80% 9% at 50% var(--eos-pilot-horizon),rgba(160,150,210,.5),transparent 72%),
  radial-gradient(120% 70% at 50% 75%,rgba(120,110,190,.18),transparent 70%),
  radial-gradient(130% 95% at 50% 45%,transparent 60%,rgba(5,5,20,.55)),
  linear-gradient(180deg,#1A1838 0%,#2E2A55 calc(var(--eos-pilot-horizon) - .3%),#24244f var(--eos-pilot-horizon),#1a1b44 calc(var(--eos-pilot-horizon) + 10%),#16173A 60%,#121330 100%)}
${EOS_PILOT_AR} [data-kit="pool"] > .eosPilotL0c{background:
  radial-gradient(1.5px 1.5px at 12% 7%,#fff 70%,transparent),radial-gradient(1.2px 1.2px at 34% 13%,#fff 70%,transparent),radial-gradient(1.5px 1.5px at 56% 5%,#eaf0ff 70%,transparent),
  radial-gradient(1px 1px at 64% 17%,#fff 70%,transparent),radial-gradient(1.4px 1.4px at 24% 18%,#dfe8ff 70%,transparent),radial-gradient(1px 1px at 92% 19%,#fff 70%,transparent),
  radial-gradient(26% 16% at 82% 9%,rgba(207,227,255,.4),transparent 70%),
  radial-gradient(130% 95% at 50% 45%,transparent 62%,rgba(0,0,12,.5)),
  linear-gradient(180deg,#070D2A 0%,#18265E calc(var(--eos-pilot-horizon) - .3%),#0f1a48 var(--eos-pilot-horizon),#0B1236 45%,#080d2a 100%)}
${EOS_PILOT_AR} [data-kit="pool"] .moon{left:74%;top:4%;width:15%;aspect-ratio:1;border-radius:50%;
  background:radial-gradient(circle at 42% 40%,#FFFFFF,#F2F6FF 45%,#CFE3FF 70%,rgba(207,227,255,0) 72%);box-shadow:0 0 40px 10px rgba(207,227,255,.25)}
${EOS_PILOT_AR} [data-kit="pool"] .moonRefl{left:76%;top:calc(var(--eos-pilot-horizon) + 2%);width:11%;height:22%;border-radius:50%;opacity:calc(.35 + var(--calm) * .5);transition:opacity var(--calm-ms) ease;
  background:repeating-linear-gradient(180deg,rgba(220,235,255,.65) 0 3px,transparent 3px 8px);-webkit-mask:radial-gradient(closest-side,#000,transparent);mask:radial-gradient(closest-side,#000,transparent)}
${EOS_PILOT_AR} [data-kit="pool"] .stars{inset:0 0 auto 0;height:var(--eos-pilot-horizon);opacity:calc(.35 + var(--calm) * .65);transition:opacity var(--calm-ms) ease;
  background:radial-gradient(1.6px 1.6px at 18% 30%,#fff 70%,transparent),radial-gradient(1.6px 1.6px at 41% 52%,#fff 70%,transparent),radial-gradient(2px 2px at 60% 24%,#fff 70%,transparent),
  radial-gradient(1.4px 1.4px at 8% 62%,#fff 70%,transparent),radial-gradient(1.8px 1.8px at 88% 70%,#fff 70%,transparent),radial-gradient(1.4px 1.4px at 30% 80%,#fff 70%,transparent);
  animation:eosPilotTwinkle 5s ease-in-out infinite alternate}
${EOS_PILOT_AR} [data-kit="pool"] .starsMirror{left:0;right:0;top:var(--eos-pilot-horizon);height:var(--eos-pilot-horizon);opacity:0;transition:opacity 1.2s ease;scale:1 -1;
  background:radial-gradient(1.6px 1.6px at 18% 30%,#dfe8ff 70%,transparent),radial-gradient(1.6px 1.6px at 41% 52%,#dfe8ff 70%,transparent),radial-gradient(2px 2px at 60% 24%,#dfe8ff 70%,transparent),
  radial-gradient(1.4px 1.4px at 8% 62%,#dfe8ff 70%,transparent),radial-gradient(1.8px 1.8px at 88% 70%,#dfe8ff 70%,transparent),radial-gradient(1.4px 1.4px at 30% 80%,#dfe8ff 70%,transparent)}
${EOS_PILOT_AR} .eosPilotStage[data-kit="pool"][data-fx-mirror="1"] .starsMirror{opacity:.7}
${EOS_PILOT_AR} [data-kit="pool"] .trees{left:0;right:0;top:calc(var(--eos-pilot-horizon) - 5%);height:5.4%;
  background:radial-gradient(circle at 50% 100%,#0b0c22 62%,transparent 64%) 0 100%/34px 100% repeat-x,radial-gradient(circle at 50% 100%,#0d0f28 58%,transparent 60%) 17px 100%/46px 80% repeat-x}
${EOS_PILOT_AR} [data-kit="pool"] .moonPath{left:70%;width:22%;top:var(--eos-pilot-horizon);bottom:0;opacity:0;transition:opacity 1.3s ease;
  background:repeating-linear-gradient(180deg,rgba(230,240,255,.55) 0 2px,transparent 2px 9px);-webkit-mask:linear-gradient(90deg,transparent,#000 35%,#000 65%,transparent);mask:linear-gradient(90deg,transparent,#000 35%,#000 65%,transparent)}
${EOS_PILOT_AR} .eosPilotStage[data-kit="pool"][data-fx-moonpath="1"] .moonPath{opacity:.75}
${EOS_PILOT_AR} [data-kit="pool"] .reeds{bottom:0;width:22%;height:46%;
  background:linear-gradient(#0b1428,#0b1428) 18% 100%/2px 78% no-repeat,linear-gradient(#0d1830,#0d1830) 38% 100%/2px 92% no-repeat,linear-gradient(#0b1428,#0b1428) 58% 100%/2px 70% no-repeat,
  linear-gradient(#0e1a34,#0e1a34) 78% 100%/2px 84% no-repeat,radial-gradient(3px 9px at 38% 9%,#1b1f3a 90%,transparent) no-repeat,radial-gradient(3px 9px at 78% 17%,#1b1f3a 90%,transparent) no-repeat}
${EOS_PILOT_AR} [data-kit="pool"] .reeds.l{left:-2%}
${EOS_PILOT_AR} [data-kit="pool"] .reeds.r{right:-4%;scale:-1 1}
${EOS_PILOT_AR} [data-kit="pool"] .pads{left:0;right:0;bottom:0;height:70%;
  background:radial-gradient(9% 2.6% at 14% 58%,#1d4a46 70%,transparent 74%),radial-gradient(7% 2% at 84% 44%,#1b4440 70%,transparent 74%),radial-gradient(11% 3% at 70% 88%,#205049 70%,transparent 74%)}
${EOS_PILOT_AR} [data-kit="pool"] .mist{left:-20%;width:140%;height:12%;border-radius:50%;opacity:calc(.6 - var(--calm) * .5);transition:opacity var(--calm-ms) ease;
  background:radial-gradient(closest-side,rgba(170,160,220,.4),transparent);animation:eosPilotDrift 30s ease-in-out infinite alternate}
${EOS_PILOT_AR} [data-kit="pool"] .mist.a{top:calc(var(--eos-pilot-horizon) - 4%)}
${EOS_PILOT_AR} [data-kit="pool"] .mist.b{top:50%;animation-duration:38s;animation-delay:-14s}
${EOS_PILOT_AR} [data-kit="pool"] .mistFront{left:-10%;right:-10%;bottom:-4%;height:18%;border-radius:50%;opacity:calc(.5 - var(--calm) * .4);background:radial-gradient(closest-side,rgba(180,170,230,.35),transparent)}
${EOS_PILOT_AR} [data-kit="pool"] .bokeh{width:30%;aspect-ratio:1;right:-10%;top:30%;border-radius:50%;background:radial-gradient(circle,rgba(200,215,255,.12),transparent 65%)}
${EOS_PILOT_AR} [data-kit="pool"] [data-pool="fireflies"] > i{width:6px;height:6px;margin:0;opacity:.0;background:radial-gradient(circle,#fff6c8,rgba(255,220,120,0) 70%);
  left:calc(10% + var(--i) * 15%);top:calc(30% + (var(--i) * 37 % 40) * 1%);animation:eosPilotFirefly calc(6s + var(--i) * 1.3s) ease-in-out calc(var(--i) * -1.7s) infinite alternate}
${EOS_PILOT_AR} [data-kit="pool"] [data-pool="ink"] > i{width:46px;height:30px;margin:-15px 0 0 -23px;background:radial-gradient(closest-side,rgba(40,30,70,.75),rgba(40,30,70,0))}
${EOS_PILOT_AR} [data-kit="pool"] [data-pool="ripples"] > i{width:60px;height:18px;margin:-9px 0 0 -30px;background:none;box-shadow:inset 0 0 0 1.5px rgba(200,220,255,.7)}

/* kit: workshop (CRUSH) — key: overhead lamp onto the anvil; rim: cool window light, upper-left */
${EOS_PILOT_AR} .eosPilotStage[data-kit="workshop"]{--eos-pilot-key-x:50%;--eos-pilot-key-y:8%;--eos-pilot-gloss-x:44%;--eos-pilot-gloss-y:16%;--eos-pilot-rim:rgba(127,166,217,.85);--eos-pilot-rim-dir:-1;--eos-pilot-ink:#fff}
${EOS_PILOT_AR} [data-kit="workshop"] > .eosPilotL0{background:
  radial-gradient(36% 24% at 50% 8%,rgba(255,176,96,.38),transparent 70%),
  linear-gradient(180deg,transparent 76%,rgba(0,0,0,.28) 76.4%,rgba(0,0,0,.12) 100%),
  repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px),
  linear-gradient(90deg,rgba(0,0,0,.18) 0 .4%,transparent .4% 24.6%,rgba(0,0,0,.18) 24.6% 25%,transparent 25% 49.6%,rgba(0,0,0,.18) 49.6% 50%,transparent 50% 74.6%,rgba(0,0,0,.18) 74.6% 75%,transparent 75%),
  radial-gradient(130% 95% at 50% 45%,transparent 58%,rgba(10,0,5,.5)),
  linear-gradient(180deg,#3A2A2E 0%,#5A3A3A 76%,#2a1e20 100%)}
${EOS_PILOT_AR} [data-kit="workshop"] > .eosPilotL0c{background:
  radial-gradient(40% 28% at 50% 8%,rgba(255,208,138,.5),transparent 70%),
  radial-gradient(60% 30% at 50% 70%,rgba(255,196,106,.22),transparent 70%),
  linear-gradient(180deg,transparent 76%,rgba(0,0,0,.22) 76.4%,rgba(0,0,0,.1) 100%),
  repeating-linear-gradient(90deg,rgba(255,240,220,.04) 0 1px,transparent 1px 3px),
  linear-gradient(180deg,#4A4038 0%,#6A5242 76%,#3a2e26 100%)}
${EOS_PILOT_AR} [data-kit="workshop"] .windows{left:6%;right:6%;top:9%;height:30%;
  background:radial-gradient(1.4px 1.4px at 14% 22%,#fff 70%,transparent),radial-gradient(1.2px 1.2px at 52% 30%,#fff 70%,transparent),radial-gradient(1.4px 1.4px at 86% 18%,#fff 70%,transparent),
  linear-gradient(#1E2A4C,#1B2440) 4% 0/18% 100% no-repeat,linear-gradient(#1E2A4C,#1B2440) 41% 0/18% 100% no-repeat,linear-gradient(#1E2A4C,#1B2440) 78% 0/18% 100% no-repeat;
  opacity:.95}
${EOS_PILOT_AR} [data-kit="workshop"] .windows::after{content:"";position:absolute;inset:0;
  background:linear-gradient(90deg,transparent 12.6%,rgba(40,30,30,.9) 12.6% 13.4%,transparent 13.4% 49.6%,rgba(40,30,30,.9) 49.6% 50.4%,transparent 50.4% 86.6%,rgba(40,30,30,.9) 86.6% 87.4%,transparent 87.4%),
  linear-gradient(180deg,transparent 49%,rgba(40,30,30,.9) 49% 51%,transparent 51%)}
${EOS_PILOT_AR} [data-kit="workshop"] .pipes{left:0;right:0;top:3%;height:4%;background:linear-gradient(180deg,#6b5a5a,#4a3a3c 45%,#2e2224);box-shadow:0 2px 0 rgba(0,0,0,.25)}
${EOS_PILOT_AR} [data-kit="workshop"] .pipes::after{content:"";position:absolute;inset:-20% 0;background:linear-gradient(90deg,transparent 18%,#7d6a68 18% 20%,transparent 20% 64%,#7d6a68 64% 66%,transparent 66%)}
${EOS_PILOT_AR} [data-kit="workshop"] .gauge{width:9%;aspect-ratio:1;top:44%;border-radius:50%;background:radial-gradient(circle,#efe6d8 0 58%,#8a7a70 60% 70%,#4a3a38 72%)}
${EOS_PILOT_AR} [data-kit="workshop"] .gauge::after{content:"";position:absolute;left:50%;top:50%;width:2px;height:36%;background:#c0392b;transform-origin:50% 100%;translate:-50% -100%;
  rotate:calc(70deg - var(--calm) * 110deg);transition:rotate var(--calm-ms) ease}
${EOS_PILOT_AR} [data-kit="workshop"] .gauge.a{left:5%}
${EOS_PILOT_AR} [data-kit="workshop"] .gauge.b{right:5%;width:7%}
${EOS_PILOT_AR} [data-kit="workshop"] .beacon{right:9%;top:9%;width:7%;aspect-ratio:1;border-radius:50%;opacity:calc(1 - var(--calm));transition:opacity var(--calm-ms) ease;
  background:conic-gradient(from 0deg,rgba(255,60,40,.95),rgba(255,60,40,.1) 30%,rgba(255,60,40,.95) 50%,rgba(255,60,40,.1) 80%,rgba(255,60,40,.95));animation:eosPilotSpin 1.6s linear infinite}
${EOS_PILOT_AR} [data-kit="workshop"] .lamp{left:50%;top:0;width:15%;height:9%;translate:-50% 0;border-radius:0 0 50% 50%/0 0 100% 100%;
  background:linear-gradient(180deg,#2b2224,#4a3c3a 70%,#ffcf8a 71%,#ffb060)}
${EOS_PILOT_AR} [data-kit="workshop"] :is(.cone,.coneCalm){left:50%;top:8%;width:78%;height:72%;translate:-50% 0;clip-path:polygon(43% 0,57% 0,100% 100%,0 100%)}
${EOS_PILOT_AR} [data-kit="workshop"] .cone{background:linear-gradient(180deg,rgba(255,176,96,.42),rgba(255,176,96,.08) 80%,transparent);opacity:calc(1 - var(--calm));transition:opacity var(--calm-ms) ease}
${EOS_PILOT_AR} [data-kit="workshop"] .coneCalm{background:linear-gradient(180deg,rgba(255,208,138,.5),rgba(255,208,138,.1) 80%,transparent);opacity:var(--calm);transition:opacity var(--calm-ms) ease}
${EOS_PILOT_AR} [data-kit="workshop"] .press{left:22%;right:22%;top:12%;height:66%;
  background:linear-gradient(90deg,#5b5f68,#8a8f99 40%,#4a4d55) 0 0/7% 100% no-repeat,linear-gradient(90deg,#5b5f68,#8a8f99 40%,#4a4d55) 100% 0/7% 100% no-repeat,
  linear-gradient(180deg,#9aa0aa,#6b707a 60%,#4a4d55) 0 0/100% 9% no-repeat}
${EOS_PILOT_AR} [data-kit="workshop"] .anvil{left:50%;top:76%;width:46%;height:7%;translate:-50% 0;border-radius:6px 6px 2px 2px;
  background:linear-gradient(180deg,#a7acb6,#6b707a 45%,#3e4148);box-shadow:inset 0 2px 0 rgba(255,255,255,.35)}
${EOS_PILOT_AR} [data-kit="workshop"] .shelf{right:3%;top:40%;width:22%;height:1.4%;background:linear-gradient(180deg,#8a6e5a,#5a4436);box-shadow:0 3px 6px rgba(0,0,0,.3)}
${EOS_PILOT_AR} [data-kit="workshop"] .tray{left:3%;top:72%;width:18%;height:4%;border-radius:0 0 8px 8px;background:linear-gradient(180deg,#5a4a48,#3a2e2e);box-shadow:inset 0 3px 8px rgba(255,90,40,calc(.6 - var(--calm) * .4))}
${EOS_PILOT_AR} [data-kit="workshop"] .conveyor{left:0;right:0;bottom:0;height:9%;overflow:hidden;background:linear-gradient(180deg,#2c2426,#1c1618)}
${EOS_PILOT_AR} [data-kit="workshop"] .conveyor::after{content:"";position:absolute;left:0;top:20%;width:200%;height:24%;background:repeating-linear-gradient(90deg,#4a3e3e 0 14px,#2c2426 14px 28px);animation:eosPilotBelt 6s linear infinite}
${EOS_PILOT_AR} [data-kit="workshop"] .haze{left:20%;right:20%;top:20%;height:50%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,190,120,.08),transparent)}
${EOS_PILOT_AR} [data-kit="workshop"] .bokeh{width:24%;aspect-ratio:1;left:-8%;top:20%;border-radius:50%;background:radial-gradient(circle,rgba(127,166,217,.12),transparent 65%)}
${EOS_PILOT_AR} [data-kit="workshop"] [data-pool="dust"]{animation:eosPilotMote 9s ease-in-out infinite alternate}
${EOS_PILOT_AR} [data-kit="workshop"] [data-pool="dust"] > i{width:3px;height:3px;margin:0;opacity:.6;background:#ffe0b0;left:calc(38% + var(--i) * 4.5%);top:calc(22% + (var(--i) * 29 % 50) * 1%)}
${EOS_PILOT_AR} [data-kit="workshop"] [data-pool="heat"] > i{width:11px;height:13px;margin:-6px 0 0 -5px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(circle at 40% 35%,#fff3c0,#ff9a3c 45%,#e8402a)}
${EOS_PILOT_AR} [data-kit="workshop"] [data-pool="sparks"] > i{width:4px;height:12px;margin:-6px 0 0 -2px;border-radius:2px;background:linear-gradient(180deg,#fff,#ffd27a 50%,rgba(255,140,40,0))}
${EOS_PILOT_AR} [data-kit="workshop"] [data-pool="steam"] > i{width:54px;height:40px;margin:-20px 0 0 -27px;background:radial-gradient(closest-side,rgba(255,255,255,.55),rgba(255,255,255,0))}

/* ---------------- keyframes (transform / opacity / individual transform props only) */
@keyframes eosPilotBreathe{from{scale:1 1}to{scale:1 1.03}}
@keyframes eosPilotSway{from{rotate:calc(var(--tug-amp) * -1)}to{rotate:var(--tug-amp)}}
@keyframes eosPilotSteam{0%{opacity:0;transform:translateY(0) scale(.6)}30%{opacity:.85}100%{opacity:0;transform:translateY(-120%) scale(1.5)}}
@keyframes eosPilotBeat{0%{scale:1;opacity:.9}100%{scale:1.16;opacity:0}}
@keyframes eosPilotJitter{0%{translate:0 0}50%{translate:1.5px -1px}100%{translate:-1px 1px}}
@keyframes eosPilotSpin{to{rotate:360deg}}
@keyframes eosPilotTear{0%,40%{opacity:0;transform:translateY(0)}50%{opacity:.95}100%{opacity:0;transform:translateY(160%)}}
@keyframes eosPilotGlow{from{opacity:.4}to{opacity:.9}}
@keyframes eosPilotDrift{from{transform:translateX(-4%)}to{transform:translateX(4%)}}
@keyframes eosPilotGlide{from{transform:translate(0,0)}to{transform:translate(-40px,6px)}}
@keyframes eosPilotMote{from{transform:translate(0,0)}to{transform:translate(14px,-22px)}}
@keyframes eosPilotFirefly{0%{opacity:0;transform:translate(0,0)}40%{opacity:.95}100%{opacity:.15;transform:translate(18px,-26px)}}
@keyframes eosPilotTwinkle{from{opacity:calc(.3 + var(--calm) * .6)}to{opacity:calc(.45 + var(--calm) * .55)}}
@keyframes eosPilotBelt{to{transform:translateX(-28px)}}

/* ---------------- reduced motion: every CSS idle loop in the arena stops (OS, framer, in-app calm) */
@media (prefers-reduced-motion: reduce){${EOS_PILOT_AR} *,${EOS_PILOT_AR} *::before,${EOS_PILOT_AR} *::after{animation:none!important}}
${EOS_A}[data-eos-calm="1"] .eosPilotArena *,${EOS_A}[data-eos-calm="1"] .eosPilotArena *::before,${EOS_A}[data-eos-calm="1"] .eosPilotArena *::after,
${EOS_A} .eosPilotArena[data-eos-pilot-reduced="1"] *,${EOS_A} .eosPilotArena[data-eos-pilot-reduced="1"] *::before,${EOS_A} .eosPilotArena[data-eos-pilot-reduced="1"] *::after{animation:none!important}
`
eosCss("pilot-fx", EOS_PILOT_FX_CSS)
