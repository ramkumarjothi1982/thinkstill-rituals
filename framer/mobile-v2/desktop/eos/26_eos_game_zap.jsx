// ===================================================================================
// EOS · 26 · GAME 6 ZAP — founder F4 (2026-10-09): "I want the zapper to look like a real zapper and an angry
// bubble to help the zap, and then the negative bubble changes to a positive reaction."
//
//   1. TOOL FIRST — a real handheld zapper rests in its charging cradle (machined metal prongs with copper tips,
//      ceramic collar, gunmetal head with a copper coil behind glass, 5 charge LEDs, red trigger, ribbed rubber
//      grip). Tap it: it lifts out of the cradle, the coil hums and glows (button.zapperTool.selected).
//   2. RUSH (the angry bubble) is wired to the zapper: RUSH slams the plunger box that powers it, yells while it
//      charges and cheers every hit (angry E29 → yelling E80 → cheering E70 → laughing E44 at the end).
//   3. Tap a bubble (or the zapper: it fires at the next bubble): the zapper swings to aim, the coil charges, a
//      jagged bolt (re-drawn every 50 ms, with forks) runs from the prong tips to THAT bubble, impact flash +
//      sparks, the bubble jolts, the zapper recoils. 2 zaps per bubble: hit 1 → SHOCKED face, hit 2 → SOFTER →
//      HAPPY (relieved, gold ring, floats). Faces are the shared F8 pictures (data-tsf-src → 16_eos_bubble_face):
//      the character the resolver picked for the user's feeling, user text BELOW the picture inside the bubble;
//      uploads keep the user's own pictures (the ring/glow carries the reaction).
//   4. ZAP's own finish: every bubble smiling and bouncing, RUSH laughs, the zapper powers down gold; then the
//      approved burst (wrappedDone) exactly as before.
// Sound (useSfx kinds): hum (charge), spark + clack (bolt + recoil), chime (relieved), win (finish).
// Public names: EosZapperEngine, EOS_ZAP_CSS. Everything else is EOS_ZAP_* / eosZap*.
// ===================================================================================

const EOS_ZAP_HITS = 2
const EOS_ZAP_FACE = {
    shocked: { glitch: 63, drop: 44, still: 41, patch: 70, loopie: 58, rush: 63, sync: 48 },
    softer: { glitch: 10, drop: 52, still: 61, patch: 75, loopie: 63, rush: 20, sync: 70 },
    happy: { glitch: 7, drop: 6, still: 70, patch: 20, loopie: 20, rush: 44, sync: 63 },
}
const EOS_ZAP_SHOCK_ALT = { glitch: [56], drop: [80], still: [63], patch: [73], loopie: [54], rush: [52], sync: [44] }
const EOS_ZAP_RUSH = { angry: 29, yell: 80, cheer: 70, laugh: 44 }
const EOS_ZAP_POS = {
    3: [[27, 22], [73, 22], [50, 47]],
    4: [[27, 19], [73, 19], [27, 47], [73, 47]],
    5: [[50, 14], [21, 30], [79, 30], [33, 52], [67, 52]],
    6: [[19, 15], [50, 12], [81, 15], [19, 43], [50, 40], [81, 43]],
}
const EOS_ZAP_CHARGE_LINES = ["CHARGING… NOW!", "FULL POWER!", "HIT IT!"]
// translation only: a rotated / scaled bubble would make the shared face re-fit its words smaller mid-jolt
const EOS_ZAP_SHAKE = { x: [0, -7, 6, -4, 3, 0], y: [0, 4, -3, 2, -1, 0], rotate: 0 }
const EOS_ZAP_BOB = { x: 0, y: [-3, 3, -3], rotate: 0 }
const EOS_ZAP_FLOAT = { x: 0, y: [-8, -14, -8], rotate: 0 }
const EOS_ZAP_STILL = { x: 0, y: 0, rotate: 0 }
const EOS_ZAP_JOY = { x: [0, -3, 3, 0, 0], y: [0, -18, 0, -8, 0], rotate: 0 }
let eosZapLive = null

function eosZapFaces({ game, entries, uploads, n, seed }) {
    let base = []
    try {
        base = tsBubbleFaceSources({ game, entries, uploads, progress: 0, count: n, seed })
    } catch {
        base = Array.from({ length: n }, (_, i) => {
            const b = ALL_BUBBLES[i % ALL_BUBBLES.length]
            return emotionSrc(b, (RELEASE_PHASE_EMOTIONS.negative[b] || [1])[0])
        })
    }
    return base.map((src) => {
        const m = String(src || "").match(/\/([a-z]+)_E(\d+)\.webp/)
        if (!m) return { neg: src, shocked: src, softer: src, happy: src, upload: true }
        const b = m[1]
        const pick = (k) => (EOS_ZAP_FACE[k][b] ? emotionSrc(b, EOS_ZAP_FACE[k][b]) : src)
        // the shocked face must differ from the starting face (PATCH E70 / SYNC E48 can be both)
        const shocked = [EOS_ZAP_FACE.shocked[b], ...(EOS_ZAP_SHOCK_ALT[b] || [])].filter(Boolean).map((e) => emotionSrc(b, e)).find((s) => s !== src) || src
        return { neg: src, shocked, softer: pick("softer"), happy: pick("happy"), upload: false, char: b }
    })
}

// jagged lightning from (x1,y1) to (x2,y2): a main channel (amplitude peaks mid-way) + two forks
function eosZapBolt(x1, y1, x2, y2, seed) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    let r = (Math.abs(seed | 0) * 7919 + 104729) % 233280
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280
    const segs = Math.max(6, Math.min(14, Math.round(len / 26)))
    const amp = Math.min(22, 8 + len * 0.05)
    const pts = [[x1, y1]]
    for (let k = 1; k < segs; k++) {
        const t = k / segs
        const o = (rnd() - 0.5) * 2 * amp * Math.sin(Math.PI * t)
        pts.push([x1 + dx * t + nx * o, y1 + dy * t + ny * o])
    }
    pts.push([x2, y2])
    const f = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1)
    const main = "M" + pts.map(f).join(" L")
    let forks = ""
    ;[Math.floor(segs * 0.35), Math.floor(segs * 0.68)].forEach((k, j) => {
        const p = pts[k]
        if (!p) return
        const a = Math.atan2(dy, dx) + (j ? -0.6 : 0.6) * (rnd() > 0.5 ? 1 : -1)
        const fl = len * (0.12 + rnd() * 0.1)
        let q = p
        forks += " M" + f(p)
        for (let s = 1; s <= 3; s++) {
            const t = (fl * s) / 3
            q = [p[0] + Math.cos(a) * t + (rnd() - 0.5) * 9, p[1] + Math.sin(a) * t + (rnd() - 0.5) * 9]
            forks += " L" + f(q)
        }
    })
    return { main, forks }
}

function EosZapperSvg({ charge = 0, leds = 0, done = false }) {
    return (
        <svg className="eosZapSvg" viewBox="0 0 100 200" aria-hidden="true">
            <defs>
                <linearGradient id="eosZapMetal" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#7d8896" />
                    <stop offset=".34" stopColor="#f6f9fc" />
                    <stop offset=".56" stopColor="#b8c2ce" />
                    <stop offset="1" stopColor="#5f6a78" />
                </linearGradient>
                <linearGradient id="eosZapGun" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#353d4a" />
                    <stop offset=".28" stopColor="#77839a" />
                    <stop offset=".6" stopColor="#465061" />
                    <stop offset="1" stopColor="#232933" />
                </linearGradient>
                <linearGradient id="eosZapGrip" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#1c2027" />
                    <stop offset=".4" stopColor="#424a57" />
                    <stop offset="1" stopColor="#1f242b" />
                </linearGradient>
                <linearGradient id="eosZapCopper" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#7a3d12" />
                    <stop offset=".45" stopColor="#f6b06a" />
                    <stop offset="1" stopColor="#9c521d" />
                </linearGradient>
                <radialGradient id="eosZapGlow" cx=".5" cy=".5" r=".6">
                    <stop offset="0" stopColor="#e9fdff" stopOpacity="1" />
                    <stop offset=".45" stopColor="#5fe8ff" stopOpacity=".85" />
                    <stop offset="1" stopColor="#00b7ff" stopOpacity="0" />
                </radialGradient>
            </defs>
            {/* prongs: machined steel rods with copper electrode tips */}
            <rect x="32.5" y="9" width="8" height="36" rx="3.5" fill="url(#eosZapMetal)" stroke="#4b5563" strokeWidth=".8" />
            <rect x="59.5" y="9" width="8" height="36" rx="3.5" fill="url(#eosZapMetal)" stroke="#4b5563" strokeWidth=".8" />
            <circle cx="36.5" cy="9.5" r="5" fill="url(#eosZapCopper)" stroke="#5a2a0b" strokeWidth=".8" />
            <circle cx="63.5" cy="9.5" r="5" fill="url(#eosZapCopper)" stroke="#5a2a0b" strokeWidth=".8" />
            <circle cx="35" cy="8" r="1.4" fill="#fff6e0" opacity=".9" />
            <circle cx="62" cy="8" r="1.4" fill="#fff6e0" opacity=".9" />
            {/* crackling arc between the electrodes (lives while charged) */}
            <path className="eosZapIdleArc a" d="M38 9 L43 4 L47 11 L52 3 L56 10 L62 8" />
            <path className="eosZapIdleArc b" d="M38 10 L44 13 L49 6 L54 12 L58 5 L62 10" />
            {/* ceramic insulator collar */}
            <rect x="25" y="41" width="50" height="12" rx="4" fill="#e9edf2" stroke="#9aa5b2" strokeWidth="1" />
            <rect x="25" y="45" width="50" height="2" fill="#c2cad4" />
            {/* gunmetal head with the coil window */}
            <rect x="19" y="51" width="62" height="56" rx="12" fill="url(#eosZapGun)" stroke="#161b22" strokeWidth="1.4" />
            <rect x="30" y="58" width="40" height="38" rx="7" fill="#123a55" stroke="#0b2233" strokeWidth="1" />
            {Array.from({ length: 7 }, (_, k) => (
                <rect key={k} x="32" y={60.5 + k * 5} width="36" height="3.4" rx="1.7" fill="url(#eosZapCopper)" />
            ))}
            <rect x="48" y="59" width="4" height="36" fill="#d58a45" opacity=".55" />
            <rect className="eosZapCoilGlow" x="30" y="58" width="40" height="38" rx="7" fill="url(#eosZapGlow)" style={{ opacity: Math.max(0, Math.min(1, charge)) }} />
            <path d="M33 61 L43 61 L35.5 93 L33 93 Z" fill="#ffffff" opacity=".24" />
            {[[24, 56], [76, 56], [24, 102], [76, 102]].map(([x, y], k) => (
                <g key={k}>
                    <circle cx={x} cy={y} r="2.2" fill="#c3ccd6" stroke="#4b5563" strokeWidth=".6" />
                    <path d={`M${x - 1.3} ${y} L${x + 1.3} ${y}`} stroke="#4b5563" strokeWidth=".7" />
                </g>
            ))}
            {/* charge meter: 5 LEDs */}
            {Array.from({ length: 5 }, (_, k) => (
                <rect key={k} className={"eosZapLed" + (k < leds ? (done ? " gold" : " on") : "")} x={32.5 + k * 7.4} y="98.5" width="5.4" height="4.6" rx="1.3" />
            ))}
            {/* neck with the warning bolt */}
            <rect x="29" y="105" width="42" height="18" rx="5" fill="url(#eosZapGun)" stroke="#161b22" strokeWidth="1.2" />
            <path d="M48.5 108 L54 108 L50.5 113.4 L54.5 113.4 L46.5 121 L48.6 115.6 L45.2 115.6 Z" fill="#ffd21f" stroke="#7a5a00" strokeWidth=".5" />
            {/* trigger guard + red trigger */}
            <path d="M69 119 Q86 122 84 147 L77 147 Q78 131 68 128 Z" fill="url(#eosZapGun)" stroke="#161b22" strokeWidth="1.1" />
            <path className="eosZapTrigger" d="M67.5 126 Q76.5 129 75.5 141 L71 141 Q71 132 66.5 130 Z" fill="#d7192f" stroke="#7a0c18" strokeWidth=".7" />
            {/* ribbed rubber grip + steel pommel */}
            <rect x="31" y="119" width="38" height="72" rx="11" fill="url(#eosZapGrip)" stroke="#11151a" strokeWidth="1.2" />
            {Array.from({ length: 6 }, (_, k) => (
                <rect key={k} x="34" y={128 + k * 10} width="32" height="3.2" rx="1.6" fill="#ffffff" opacity=".09" />
            ))}
            <rect x="28" y="185" width="44" height="11" rx="5.5" fill="url(#eosZapMetal)" stroke="#4b5563" strokeWidth=".8" />
            <path d="M23 58 L23 100" stroke="#ffffff" strokeOpacity=".38" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M34 124 L34 182" stroke="#ffffff" strokeOpacity=".12" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function EosZapperEngine({ game, entries = [], onDone, sfx, reduced, onProgress, hasUserImages, imageSources, variationSeed }) {
    const key = (entries || []).join("|")
    const src = React.useMemo(() => (entries.length ? entries : ["THIS"]).map((s) => String(s || "").trim()).filter(Boolean), [key])
    const n = Math.max(3, Math.min(6, src.length || 1))
    const words = React.useMemo(() => distributeAcrossVisibleSlots(src.length ? src : ["THIS"], "THIS", n), [key, n])
    const uploads = hasUserImages ? (imageSources || []).filter(Boolean) : []
    const upKey = uploads.join("|")
    const faces = React.useMemo(() => eosZapFaces({ game, entries: src, uploads, n, seed: Number(variationSeed || 0) }), [game && game.id, key, upKey, n, variationSeed])
    const total = n * EOS_ZAP_HITS
    const pos = EOS_ZAP_POS[n] || EOS_ZAP_POS[6]
    const [phase, setPhase] = React.useState("dock") // dock → ready → done
    const [hits, setHits] = React.useState(() => Array(n).fill(0))
    const [relief, setRelief] = React.useState(() => Array(n).fill(0)) // 0 · 1 softer · 2 happy
    const [aim, setAim] = React.useState(0)
    const [shot, setShot] = React.useState(null)
    const [kick, setKick] = React.useState(0)
    const [jit, setJit] = React.useState(0)
    const [charge, setCharge] = React.useState(0)
    const [rush, setRush] = React.useState({ face: "angry", line: "GRAB IT! LET'S ZAP!", k: 0 })
    const [geo, setGeo] = React.useState(null)
    const arenaRef = React.useRef(null)
    const dockRef = React.useRef(null)
    const tipRef = React.useRef(null)
    const plugRef = React.useRef(null)
    const bubbleRefs = React.useRef([])
    const S = React.useRef(null)
    if (!S.current) S.current = { phase: "dock", busy: false, queue: [], hits: Array(n).fill(0), done: false, timers: [], sfxLog: [], shots: 0, t0: Date.now(), plog: [] }
    const later = (fn, ms) => {
        const t = setTimeout(fn, ms)
        S.current.timers.push(t)
    }
    const play = (k) => {
        S.current.sfxLog.push([Date.now() - S.current.t0, k])
        try {
            sfx && sfx(k)
        } catch {}
    }
    React.useEffect(() => {
        onProgress?.(0, "0% ZAPPED")
        try {
            if (typeof tsFacePreload === "function") {
                tsFacePreload(faces.flatMap((f) => [f.neg, f.shocked, f.softer, f.happy]))
                tsFacePreload(Object.values(EOS_ZAP_RUSH).map((m) => emotionSrc("rush", m)))
            }
        } catch {}
        eosZapLive = { S: S.current, n, total }
        return () => {
            S.current.timers.forEach(clearTimeout)
            S.current.timers = []
            if (eosZapLive && eosZapLive.S === S.current) eosZapLive = null
        }
    }, [])
    // arena geometry: overlay size + the power cable from RUSH's plunger box to the zapper's grip
    React.useLayoutEffect(() => {
        const a = arenaRef.current
        if (!a) return
        const measure = () => {
            const W = a.offsetWidth
            const H = a.offsetHeight
            const p = eosZapPt(a, plugRef.current, 0.92, 0.55)
            const d = eosZapPt(a, dockRef.current, 0.5, 0.97)
            setGeo((g) => (g && g.W === W && g.H === H && g.p && p && Math.abs(g.p.x - p.x) < 1 && Math.abs(g.d.x - d.x) < 1 ? g : { W, H, p, d }))
        }
        measure()
        let ro = null
        try {
            ro = new ResizeObserver(measure)
            ro.observe(a)
        } catch {}
        window.addEventListener("resize", measure)
        return () => {
            ro && ro.disconnect()
            window.removeEventListener("resize", measure)
        }
    }, [])
    // the bolt is re-drawn every 50 ms while it is live (crackle); reduced motion keeps one still bolt
    React.useEffect(() => {
        if (!shot || reduced) return
        const t = setInterval(() => setJit((j) => j + 1), 50)
        return () => clearInterval(t)
    }, [shot && shot.k, reduced])

    const nextTarget = (from) => {
        const H = S.current.hits
        const open = H.map((h, i) => (h < EOS_ZAP_HITS ? i : -1)).filter((i) => i >= 0)
        if (!open.length) return null
        // a bubble already in progress first (finish what you started), then the nearest one
        const started = open.find((i) => H[i] > 0)
        if (started != null) return started
        if (from == null || !pos[from]) return open[0]
        return open.sort((a, b) => Math.hypot(pos[a][0] - pos[from][0], pos[a][1] - pos[from][1]) - Math.hypot(pos[b][0] - pos[from][0], pos[b][1] - pos[from][1]))[0]
    }
    const finish = () => {
        const s = S.current
        s.done = true
        s.phase = "done"
        later(() => {
            setPhase("done")
            setAim(0)
            setCharge(0.15)
            setRush((r) => ({ face: "laugh", line: "WE DID IT! ALL SMILING!", k: r.k + 1 }))
            play("win")
            vibrate(34)
        }, 520)
        later(() => onDone && onDone(340), reduced ? 1500 : 2100)
    }
    const fire = (wanted) => {
        const s = S.current
        if (s.done || s.phase !== "ready") return
        if (s.busy) {
            if (s.queue.length < 3) s.queue.push(wanted)
            return
        }
        const i = wanted != null && s.hits[wanted] < EOS_ZAP_HITS ? wanted : nextTarget(wanted)
        if (i == null) return
        const el = bubbleRefs.current[i]
        const a = arenaRef.current
        if (!el || !a) return
        s.busy = true
        const piv = eosZapPt(a, dockRef.current, 0.5, 0.94)
        const c = eosZapPt(a, el, 0.5, 0.5)
        const deg = piv && c ? Math.max(-72, Math.min(72, (Math.atan2(c.x - piv.x, piv.y - c.y) * 180) / Math.PI)) : 0
        setAim(deg)
        setCharge(0.45)
        setRush((r) => ({ face: "yell", line: EOS_ZAP_CHARGE_LINES[s.shots % EOS_ZAP_CHARGE_LINES.length], k: r.k + 1 }))
        play("hum")
        later(() => {
            s.hits[i] += 1
            const h = s.hits[i]
            s.shots += 1
            setHits(s.hits.slice())
            setCharge(1)
            setShot({ k: s.shots, i })
            setKick((k) => k + 1)
            play("spark")
            play("clack")
            vibrate(h >= EOS_ZAP_HITS ? 26 : 16)
            const doneHits = s.hits.reduce((x, y) => x + y, 0)
            const p = Math.round((doneHits / total) * 100)
            s.plog.push([Date.now() - s.t0, p])
            onProgress?.(p, doneHits >= total ? "ALL ZAPPED · SMILING" : `${p}% ZAPPED`)
            if (h >= EOS_ZAP_HITS) {
                setRelief((r) => r.map((v, j) => (j === i ? 1 : v)))
                later(() => {
                    setRelief((r) => r.map((v, j) => (j === i ? 2 : v)))
                    play("chime")
                }, reduced ? 380 : 700)
            }
            later(() => {
                setShot(null)
                setCharge(0.3)
                setRush((r) => ({ face: "cheer", line: h >= EOS_ZAP_HITS ? "LOOK — IT'S SMILING!" : "YES!! ZAP IT AGAIN!", k: r.k + 1 }))
                s.busy = false
                if (doneHits >= total) finish()
                else if (s.queue.length) fire(s.queue.shift())
            }, reduced ? 340 : 480)
        }, reduced ? 60 : 170)
    }
    const onTool = () => {
        const s = S.current
        if (s.phase === "dock") {
            s.phase = "ready"
            setPhase("ready")
            setCharge(0.6)
            setRush((r) => ({ face: "yell", line: "AIM AT A BUBBLE! I'LL POWER IT!", k: r.k + 1 }))
            play("hum")
            vibrate(12)
            later(() => setCharge(0.3), 520)
            return
        }
        fire(null) // tapping the zapper itself fires at the next bubble
    }
    const onBubble = (i) => {
        if (S.current.phase === "dock") {
            onTool() // the first tap anywhere picks the zapper up (and the bubble tap is not lost)
            later(() => fire(i), 260)
            return
        }
        fire(i)
    }

    // bolt geometry (arena px): prong tips → the strike point on the bubble's rim facing the zapper
    let bolt = null
    if (shot && arenaRef.current && tipRef.current && bubbleRefs.current[shot.i]) {
        const a = arenaRef.current
        // the prong tips where the zapper is AIMED (pivot + rotated length): exact even while the swing / recoil
        // animation is still running or the main thread is busy (a live measure could lag a frame behind)
        const piv = eosZapPt(a, dockRef.current, 0.5, 0.94)
        const len = (dockRef.current.offsetHeight || 0) * 0.895
        const rad = (aim * Math.PI) / 180
        // the live tip is used whenever it is near the aimed one (it then also follows the recoil); while the swing
        // is still catching up on a busy main thread the bolt starts at the live tip too, so it never floats free
        const aimed = piv && len ? { x: piv.x + Math.sin(rad) * len, y: piv.y - Math.cos(rad) * len } : null
        const live = eosZapPt(a, tipRef.current, 0.5, 0.5)
        const t = live || aimed
        const el = bubbleRefs.current[shot.i]
        const c = eosZapPt(a, el, 0.5, 0.5)
        if (t && c) {
            const r = (el.offsetWidth || 90) / 2
            const L = Math.hypot(c.x - t.x, c.y - t.y) || 1
            const e = { x: c.x - ((c.x - t.x) / L) * r * 0.62, y: c.y - ((c.y - t.y) / L) * r * 0.62 }
            bolt = { ...eosZapBolt(t.x, t.y, e.x, e.y, shot.k * 31 + jit), t, e }
        }
    }
    const smiling = relief.filter((v) => v === 2).length
    const leds = phase === "dock" ? 0 : phase === "done" ? 5 : Math.max(1, Math.round(charge * 5))
    const cable = geo && geo.p && geo.d ? `M${geo.p.x.toFixed(1)} ${geo.p.y.toFixed(1)} C${(geo.p.x + 46).toFixed(1)} ${(geo.p.y + 34).toFixed(1)} ${(geo.d.x - 50).toFixed(1)} ${(geo.d.y + 26).toFixed(1)} ${geo.d.x.toFixed(1)} ${geo.d.y.toFixed(1)}` : ""

    return (
        <div ref={arenaRef} className={"arena premiumArena eosZapArena zapPhase-" + phase + (reduced ? " reduced" : "")} data-eos-zap={phase}>
            <style>{EOS_ZAP_CSS}</style>
            <div className="eosZapFloor" />
            <svg className="eosZapFx" width={geo ? geo.W : 1} height={geo ? geo.H : 1} viewBox={`0 0 ${geo ? geo.W : 1} ${geo ? geo.H : 1}`} aria-hidden="true">
                {cable ? (
                    <g>
                        <path className="eosZapCable" d={cable} />
                        <path className={"eosZapCableLive" + (rush.face === "yell" || shot ? " on" : "")} d={cable} />
                    </g>
                ) : null}
                {bolt ? (
                    <g className="eosZapBoltG" key={"b" + shot.k}>
                        <path className="eosZapBoltGlow" d={bolt.main} />
                        <path className="eosZapBoltFork" d={bolt.forks} />
                        <path className="eosZapBoltCore" d={bolt.main} />
                        <circle className="eosZapMuzzle" cx={bolt.t.x} cy={bolt.t.y} r="9" />
                    </g>
                ) : null}
            </svg>
            {shot ? <div className="eosZapFlash" key={"f" + shot.k} /> : null}
            {bolt ? (
                <div className="eosZapImpact" key={"i" + shot.k} style={{ left: bolt.e.x + "px", top: bolt.e.y + "px" }} aria-hidden="true">
                    <i className="core" />
                    {Array.from({ length: 8 }, (_, k) => (
                        <i key={k} className="ray" style={{ ["--a"]: k * 45 + (shot.k % 2) * 22 + "deg" }} />
                    ))}
                    <b>ZAP!</b>
                </div>
            ) : null}

            {words.map((w, i) => {
                const h = hits[i] || 0
                const f = faces[i] || faces[0] || {}
                const picture = h === 0 ? f.neg : h === 1 ? f.shocked : relief[i] === 2 || phase === "done" ? f.happy : f.softer
                const zapping = shot && shot.i === i
                const animate = zapping ? EOS_ZAP_SHAKE : phase === "done" ? EOS_ZAP_JOY : reduced ? EOS_ZAP_STILL : relief[i] === 2 ? EOS_ZAP_FLOAT : EOS_ZAP_BOB
                const transition = zapping
                    ? { duration: 0.38 }
                    : phase === "done"
                      ? { duration: 0.9, delay: i * 0.08, repeat: reduced ? 0 : 1, repeatDelay: 0.3 }
                      : { duration: 2.4 + i * 0.13, repeat: Infinity, ease: "easeInOut" }
                return (
                    <motion.button
                        type="button"
                        key={i}
                        ref={(el) => (bubbleRefs.current[i] = el)}
                        className={
                            "tsFaceObject eosZapBubble h" + Math.min(h, EOS_ZAP_HITS) + (h >= EOS_ZAP_HITS ? " zapSpent" : "") + (relief[i] === 2 || phase === "done" ? " relieved" : "") + (zapping ? " zapping" : "") + (f.upload ? " upload" : "")
                        }
                        data-tsf-src={picture || undefined}
                        data-zap-hits={h}
                        style={{ left: pos[i][0] + "%", top: pos[i][1] + "%" }}
                        initial={false}
                        animate={animate}
                        transition={transition}
                        onClick={() => onBubble(i)}
                        aria-label={"Zap the thought: " + w}
                    >
                        <span className="tsExactUserText eosZapWord">{w}</span>
                        <i className="eosZapPip p1" />
                        <i className="eosZapPip p2" />
                    </motion.button>
                )
            })}

            <div className={"eosZapRush tsNoBubbleFace " + rush.face} aria-hidden="true">
                <div className="eosZapSay" key={"s" + rush.k}>
                    {rush.line}
                </div>
                <div className="eosZapRushPic" key={"r" + rush.k}>
                    <img src={emotionSrc("rush", EOS_ZAP_RUSH[rush.face] || 29)} alt="" draggable={false} />
                </div>
                <div className="eosZapPlunger" ref={plugRef}>
                    <i className="handle" />
                    <i className="rod" />
                    <i className="box">
                        <i className="bolt" />
                    </i>
                </div>
            </div>

            <button ref={dockRef} type="button" className={"zapperTool eosZapDock" + (phase !== "dock" ? " selected" : "") + (phase === "done" ? " done" : "")} onClick={onTool} aria-label={phase === "dock" ? "Pick up the zapper" : "Fire the zapper"}>
                <i className="eosZapCradle" />
                <div className="eosZapAim" style={{ transform: phase === "dock" ? "translateY(9%) rotate(-9deg) scale(.94)" : `rotate(${aim.toFixed(1)}deg)` }}>
                    <div className={"eosZapKick" + (kick && !reduced ? " k" + (kick % 2) : "") + (charge > 0.5 ? " hot" : "")}>
                        <EosZapperSvg charge={phase === "dock" ? 0.12 : charge} leds={leds} done={phase === "done"} />
                        <i className="eosZapTip" ref={tipRef} />
                    </div>
                </div>
            </button>

            <div className="eosZapCount" aria-live="polite">
                <b>
                    {smiling} / {n}
                </b>
                <span>SMILING</span>
            </div>
        </div>
    )
}

// an element's point (fx, fy fractions of its box) in the arena's own CSS px (works under a scaled stage)
function eosZapPt(arena, el, fx = 0.5, fy = 0.5) {
    if (!arena || !el) return null
    const ar = arena.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const sx = ar.width / (arena.offsetWidth || ar.width || 1) || 1
    const sy = ar.height / (arena.offsetHeight || ar.height || 1) || 1
    return { x: (r.left + r.width * fx - ar.left) / sx, y: (r.top + r.height * fy - ar.top) / sy }
}

const EOS_ZAP_CSS = String.raw`
.eosZapArena{--zd:min(27%,150px);--zw:min(25cqw,104px);--rw:min(27%,124px);container-type:inline-size;position:relative;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.eosZapArena .eosZapFloor{position:absolute;left:0;right:0;bottom:0;height:30%;background:radial-gradient(ellipse at 50% 100%,rgba(120,220,255,.16),rgba(120,220,255,0) 70%);pointer-events:none}
.eosZapArena .eosZapFx{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:6}
.eosZapArena .eosZapCable{fill:none;stroke:#2a2f37;stroke-width:5;stroke-linecap:round}
.eosZapArena .eosZapCableLive{fill:none;stroke:#7ff3ff;stroke-width:2.4;stroke-linecap:round;stroke-dasharray:6 12;opacity:.25;filter:drop-shadow(0 0 3px #39e6ff)}
.eosZapArena .eosZapCableLive.on{opacity:1;animation:eosZapFlow .35s linear infinite}
@keyframes eosZapFlow{to{stroke-dashoffset:-36}}
.eosZapArena .eosZapBoltGlow{fill:none;stroke:#46e3ff;stroke-width:11;stroke-linejoin:round;stroke-linecap:round;opacity:.42;filter:blur(3px)}
.eosZapArena .eosZapBoltFork{fill:none;stroke:#b8f6ff;stroke-width:2;stroke-linejoin:round;opacity:.85;filter:drop-shadow(0 0 4px #3de0ff)}
.eosZapArena .eosZapBoltCore{fill:none;stroke:#ffffff;stroke-width:3.4;stroke-linejoin:round;stroke-linecap:round;filter:drop-shadow(0 0 5px #8ff2ff) drop-shadow(0 0 12px #2bd5ff)}
.eosZapArena .eosZapMuzzle{fill:#eaffff;opacity:.9;filter:drop-shadow(0 0 10px #4fe6ff);animation:eosZapMuzzle .43s ease-out both}
@keyframes eosZapMuzzle{0%{opacity:1}100%{opacity:0}}
.eosZapArena .eosZapFlash{position:absolute;inset:0;pointer-events:none;z-index:5;background:radial-gradient(circle at 50% 55%,rgba(220,250,255,.30),rgba(160,235,255,.10) 45%,rgba(160,235,255,0) 75%);animation:eosZapFlash .36s ease-out both}
@keyframes eosZapFlash{0%{opacity:1}100%{opacity:0}}
.eosZapArena .eosZapImpact{position:absolute;width:0;height:0;z-index:8;pointer-events:none}
.eosZapArena .eosZapImpact .core{position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle,#ffffff 0,#bff8ff 30%,rgba(80,225,255,.55) 55%,rgba(80,225,255,0) 72%);animation:eosZapCore .42s ease-out both}
@keyframes eosZapCore{0%{transform:scale(.3);opacity:1}55%{transform:scale(1.25);opacity:1}100%{transform:scale(1.6);opacity:0}}
.eosZapArena .eosZapImpact .ray{position:absolute;left:-1.5px;top:-1.5px;width:3px;height:24px;border-radius:3px;background:linear-gradient(#ffffff,#7ff0ff 60%,rgba(127,240,255,0));transform-origin:50% 0;transform:rotate(var(--a)) translateY(8px);animation:eosZapRay .42s ease-out both}
@keyframes eosZapRay{0%{opacity:1;transform:rotate(var(--a)) translateY(4px) scaleY(.4)}100%{opacity:0;transform:rotate(var(--a)) translateY(26px) scaleY(1.1)}}
.eosZapArena .eosZapImpact b{position:absolute;left:14px;top:-44px;font:1000 17px/1 Inter,system-ui,sans-serif;letter-spacing:.04em;color:#fff7c2;-webkit-text-stroke:1px #0a6f95;text-shadow:0 0 8px #34dcff,0 2px 0 #0a6f95;transform:rotate(-8deg);animation:eosZapWord .5s cubic-bezier(.2,1.4,.4,1) both;white-space:nowrap}
@keyframes eosZapWord{0%{opacity:0;transform:rotate(-8deg) scale(.4)}35%{opacity:1;transform:rotate(-8deg) scale(1.15)}100%{opacity:0;transform:rotate(-8deg) translateY(-10px) scale(1)}}
.eosZapArena .eosZapBubble{position:absolute;width:var(--zd);height:auto;aspect-ratio:1/1;margin:calc(var(--zd) / -2) 0 0 calc(var(--zd) / -2);padding:0;border-radius:50%;border:2px solid rgba(165,236,255,.8);background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.40),rgba(160,228,255,.16) 32%,rgba(120,170,255,.12) 64%,rgba(180,130,255,.16) 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.10),inset 0 -10px 22px rgba(130,205,255,.18),0 0 18px rgba(0,210,255,.26);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:visible;z-index:3;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:border-color .3s,box-shadow .3s}
.eosZapArena .eosZapBubble .eosZapWord{display:block;max-width:86%;font:900 15px/1.1 Inter,system-ui,sans-serif;color:#fff;text-align:center;overflow-wrap:normal;word-break:normal}
.eosZapArena .eosZapBubble.h1{border-color:rgba(120,240,255,1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 0 16px rgba(60,225,255,.7),0 0 34px rgba(60,225,255,.32)}
.eosZapArena .eosZapBubble.h1::before{content:"";position:absolute;inset:-8px;border-radius:50%;border:2px dashed rgba(150,245,255,.9);filter:drop-shadow(0 0 5px #45e6ff);animation:eosZapSpin 1.2s linear infinite;pointer-events:none}
@keyframes eosZapSpin{to{transform:rotate(360deg)}}
.eosZapArena .eosZapBubble.zapping{border-color:#ffffff;box-shadow:0 0 22px rgba(190,250,255,.95),0 0 46px rgba(70,225,255,.6)}
.eosZapArena .eosZapBubble.relieved{border-color:rgba(255,232,140,.98);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),0 0 20px rgba(255,214,110,.5),0 0 42px rgba(110,255,200,.24)}
.eosZapArena .eosZapBubble.relieved::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(255,236,160,.75);animation:eosZapHalo 1.6s ease-in-out infinite;pointer-events:none}
@keyframes eosZapHalo{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.06);opacity:.35}}
.eosZapArena .eosZapPip{position:absolute;top:-5px;width:10px;height:10px;border-radius:50%;border:1.5px solid rgba(190,240,255,.85);background:rgba(255,255,255,.12);z-index:4;pointer-events:none}
.eosZapArena .eosZapPip.p1{left:calc(50% - 13px)}
.eosZapArena .eosZapPip.p2{left:calc(50% + 3px)}
.eosZapArena .eosZapBubble.h1 .eosZapPip.p1,.eosZapArena .eosZapBubble.h2 .eosZapPip{background:#7ff3ff;box-shadow:0 0 6px #3de0ff}
.eosZapArena .eosZapBubble.relieved .eosZapPip{background:#ffe27a;border-color:#fff3c4;box-shadow:0 0 6px #ffcf4a}
.eosZapArena .eosZapDock{position:absolute;left:50%;bottom:2.5%;width:var(--zw);height:auto;aspect-ratio:1/2;margin:0 0 0 calc(var(--zw) / -2);padding:0;border:0;background:transparent;cursor:pointer;z-index:7;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
${EOS_A} .eosZapArena button.zapperTool.eosZapDock,${EOS_A} .eosZapArena button.zapperTool.eosZapDock:hover,${EOS_A} .eosZapArena button.zapperTool.eosZapDock:focus,${EOS_A} .eosZapArena button.zapperTool.eosZapDock.selected{background:none!important;background-image:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;min-width:0!important;min-height:0!important;width:var(--zw)!important;height:calc(var(--zw) * 2)!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;outline:none!important;filter:none!important;transform:none!important}
${EOS_A} .eosZapArena button.zapperTool.eosZapDock::before,${EOS_A} .eosZapArena button.zapperTool.eosZapDock::after{display:none!important}
.eosZapArena .eosZapCradle{position:absolute;left:-14%;right:-14%;bottom:-2%;height:17%;border-radius:10px 10px 14px 14px;background:linear-gradient(180deg,#a7b2bf,#5d6876 55%,#3a424d);box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 6px 14px rgba(0,0,0,.35);transition:opacity .4s,transform .4s}
.eosZapArena .eosZapCradle::after{content:"";position:absolute;left:22%;right:22%;top:-14%;height:34%;border-radius:6px;background:linear-gradient(180deg,#2c333d,#4b5563)}
.eosZapArena .eosZapDock.selected .eosZapCradle{opacity:.55;transform:translateY(6%)}
.eosZapArena .eosZapAim{position:absolute;inset:0;transform-origin:50% 94%;transition:transform .1s cubic-bezier(.2,.9,.3,1.1)}
.eosZapArena.reduced .eosZapAim{transition:none}
.eosZapArena .eosZapDock:not(.selected) .eosZapAim{filter:drop-shadow(0 0 10px rgba(120,235,255,.35));animation:eosZapWake 1.6s ease-in-out infinite}
@keyframes eosZapWake{0%,100%{filter:drop-shadow(0 0 6px rgba(120,235,255,.25))}50%{filter:drop-shadow(0 0 16px rgba(120,235,255,.7))}}
.eosZapArena .eosZapKick{position:absolute;inset:0;transform-origin:50% 94%}
.eosZapArena .eosZapKick.k0{animation:eosZapKickA .3s cubic-bezier(.2,.8,.3,1)}
.eosZapArena .eosZapKick.k1{animation:eosZapKickB .3s cubic-bezier(.2,.8,.3,1)}
@keyframes eosZapKickA{0%{transform:translateY(0)}18%{transform:translateY(9%) rotate(-3deg)}100%{transform:translateY(0)}}
@keyframes eosZapKickB{0%{transform:translateY(0)}18%{transform:translateY(9%) rotate(3deg)}100%{transform:translateY(0)}}
.eosZapArena .eosZapSvg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 8px 10px rgba(0,0,0,.45))}
.eosZapArena .eosZapKick.hot .eosZapSvg{filter:drop-shadow(0 8px 10px rgba(0,0,0,.45)) drop-shadow(0 0 12px rgba(80,230,255,.75))}
.eosZapArena .eosZapIdleArc{fill:none;stroke:#bff8ff;stroke-width:1.6;stroke-linejoin:round;opacity:0;filter:drop-shadow(0 0 3px #39e3ff)}
.eosZapArena .eosZapDock.selected .eosZapIdleArc.a{animation:eosZapCrackle .23s steps(2) infinite}
.eosZapArena .eosZapDock.selected .eosZapIdleArc.b{animation:eosZapCrackle .29s steps(2) infinite reverse}
@keyframes eosZapCrackle{0%{opacity:.95}50%{opacity:.1}100%{opacity:.8}}
.eosZapArena .eosZapLed{fill:#3a4452;stroke:#11161c;stroke-width:.5}
.eosZapArena .eosZapLed.on{fill:#7ff6ff;filter:drop-shadow(0 0 2px #2fe0ff)}
.eosZapArena .eosZapLed.gold{fill:#ffe066;filter:drop-shadow(0 0 2px #ffc21f)}
.eosZapArena .eosZapTrigger{transition:transform .12s;transform-origin:68px 128px}
.eosZapArena .eosZapKick.hot .eosZapTrigger{transform:translateX(-2px)}
.eosZapArena .eosZapTip{position:absolute;left:50%;top:4.5%;width:2px;height:2px;margin:-1px 0 0 -1px;pointer-events:none}
.eosZapArena .eosZapRush{position:absolute;left:2.5%;bottom:2.5%;width:var(--rw);z-index:9;pointer-events:none;display:flex;flex-direction:column;align-items:center}
.eosZapArena .eosZapRushPic{position:relative;width:84%;aspect-ratio:1/1;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.5),rgba(255,170,170,.18) 60%,rgba(255,120,120,.10));border:2px solid rgba(255,170,160,.85);box-shadow:0 0 14px rgba(255,90,90,.35);overflow:hidden;animation:eosZapRushIn .35s cubic-bezier(.2,1.4,.4,1) both}
.eosZapArena .eosZapRushPic img{position:absolute;inset:4%;width:92%;height:92%;object-fit:contain;border-radius:50%}
.eosZapArena .eosZapRush.yell .eosZapRushPic{animation:eosZapRushPush .35s cubic-bezier(.2,1.2,.4,1) both}
.eosZapArena .eosZapRush.cheer .eosZapRushPic{animation:eosZapRushHop .55s cubic-bezier(.2,1.3,.4,1) both;border-color:rgba(255,226,140,.95);box-shadow:0 0 16px rgba(255,214,110,.5)}
.eosZapArena .eosZapRush.laugh .eosZapRushPic{animation:eosZapRushHop .6s cubic-bezier(.2,1.3,.4,1) 3 both;border-color:rgba(255,226,140,.95);box-shadow:0 0 20px rgba(255,214,110,.6)}
@keyframes eosZapRushIn{0%{transform:scale(.9)}100%{transform:scale(1)}}
@keyframes eosZapRushPush{0%{transform:translateY(0)}40%{transform:translateY(12%) scale(1.04,.94)}100%{transform:translateY(6%)}}
@keyframes eosZapRushHop{0%{transform:translateY(6%)}40%{transform:translateY(-16%) rotate(-5deg)}100%{transform:translateY(0)}}
.eosZapArena .eosZapSay{position:absolute;left:0;bottom:calc(100% + 6px);width:max-content;max-width:120px;padding:6px 10px;border-radius:12px;background:#fff3ef;color:#a30f24;font:900 13px/1.15 Inter,system-ui,sans-serif;letter-spacing:.02em;box-shadow:0 4px 12px rgba(0,0,0,.25);animation:eosZapSay .32s cubic-bezier(.2,1.4,.4,1) both}
.eosZapArena .eosZapSay::after{content:"";position:absolute;left:22px;bottom:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fff3ef}
@keyframes eosZapSay{0%{opacity:0;transform:translateY(6px) scale(.9)}100%{opacity:1;transform:none}}
.eosZapArena .eosZapPlunger{position:relative;width:70%;height:calc(var(--rw) * .34);margin-top:-6%}
.eosZapArena .eosZapPlunger .handle{position:absolute;left:12%;right:12%;top:0;height:16%;border-radius:6px;background:linear-gradient(180deg,#e8edf2,#8d99a7);box-shadow:0 1px 0 #4b5563;transition:transform .15s}
.eosZapArena .eosZapPlunger .rod{position:absolute;left:46%;width:8%;top:14%;height:30%;background:linear-gradient(90deg,#9aa5b2,#eef2f6,#7d8896);transition:transform .15s}
.eosZapArena .eosZapPlunger .box{position:absolute;left:0;right:0;bottom:0;height:58%;border-radius:6px;background:linear-gradient(180deg,#d9462f,#a42816 70%,#7a1c0e);box-shadow:inset 0 2px 0 rgba(255,255,255,.35),0 4px 10px rgba(0,0,0,.35)}
.eosZapArena .eosZapPlunger .bolt{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;background:#ffd21f;clip-path:polygon(55% 0,15% 58%,45% 58%,35% 100%,85% 40%,55% 40%,70% 0)}
.eosZapArena .eosZapRush.yell .eosZapPlunger .handle{transform:translateY(120%)}
.eosZapArena .eosZapRush.yell .eosZapPlunger .rod{transform:scaleY(.4);transform-origin:50% 100%}
.eosZapArena .eosZapCount{position:absolute;right:3%;bottom:4%;z-index:7;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 10px;border-radius:14px;border:1px solid rgba(255,226,140,.55);background:rgba(255,236,170,.12);color:#fff3c4;pointer-events:none}
.eosZapArena .eosZapCount b{font:1000 18px/1 Inter,system-ui,sans-serif}
.eosZapArena .eosZapCount span{font:900 11px/1 Inter,system-ui,sans-serif;letter-spacing:.08em}
.eosZapArena.zapPhase-done .eosZapAim{filter:drop-shadow(0 0 14px rgba(255,214,110,.75))}
@media (min-width:701px){.eosZapArena{--zd:min(22%,150px);--zw:min(13cqw,112px);--rw:min(17%,140px)}.eosZapArena .eosZapImpact b{font-size:20px}.eosZapArena .eosZapSay{font-size:15px;max-width:240px}}
@media (prefers-reduced-motion:reduce){.eosZapArena *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`

eosExpose("zap", {
    // dev/test only (window.__eos exists only when eosIsDev()); never exposes words
    state: () => {
        const L = eosZapLive
        if (!L) return null
        const s = L.S
        return { phase: s.phase, hits: s.hits.slice(), shots: s.shots, done: s.done, busy: s.busy, n: L.n, total: L.total, sfx: s.sfxLog.slice(), plog: s.plog.slice() }
    },
})
