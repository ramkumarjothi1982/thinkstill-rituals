// ===================================================================================
// EOS · 25 · GAMES 3 CRACK + 4 STOMP — founder F5 (2026-10-09) "when the user clicks to activate the tool, the tool
// should appear like a spanner and the user should be able to crack the bubbles" + gap rows P13.26-a/b ("the
// stomping boot should look like a boot when the user activates it … all tools should feel real").
//
//   TOOL FIRST — the tool rests in its dock at the bottom (button.crackToolDock / button.stompToolDock, `.selected`
//   once in hand: the arrows table and 60_eos_fixes keep working). Tap it: it lifts out of the dock, hovers in
//   hand (bobbing) and follows the mouse on desktop; on a phone it travels to whichever bubble is tapped.
//   CRACK — a forged combination spanner (open-end jaw, I-beam handle with a groove, 12-point box end; chrome
//   gradients + drop shadow). Tap a bubble: wind-up, swing, CLANK at the upper-right rim (flash, sparks, chips),
//   the spanner recoils, the bubble jolts (translation only — the shared face keeps its fit), fracture lines grow
//   per hit (hit 1 two lines, hit 2 branches across the picture, hit 3 a web): the shell SHATTERS into glass shards
//   and the character inside floats up FREE with a happy face (negative → shocked → softer → happy).
//   STOMP — a leather work boot (laces, brass eyelets, bow, toe cap, welt stitching, lugged rubber sole, heel).
//   Tap a bubble: the boot lifts (anticipation), slams down, the bubble squashes with a THUD, dust puffs and a floor
//   shockwave, the stage shakes; dents + cracks per stomp, the third stomp FLATTENS it and the relieved face puffs
//   up from under the boot.
//   Both keep the original mechanics (3 hits per bubble, progress = hits / (n × 3), onDone(320) after the last one)
//   and the approved burst (wrappedDone in the arcade is untouched). Faces come from the shared F8 resolver
//   (data-tsf-src → 16_eos_bubble_face; uploads keep the user's own pictures), user text below the picture inside.
// Sound (useSfx kinds): clack + plink (spanner clank), pop + clack (boot thud), win (shatter / flatten), chime (freed).
// Public names: EosCrackEngine, EosStompEngine, EOS_TOOLS_CSS. Everything else is EOS_TOOLS_* / eosTools*.
// ===================================================================================

// Launch 30 (2026-10-10): this tool work is UNFINISHED (founder F5 open) and neither CRACK nor STOMP is a launch game,
// so the arcade keeps their classic engines (00_arcade.jsx engine switch). Set true once the founder signs the tools off.
const EOS_TOOLS_LIVE = false
const EOS_TOOLS_HITS = 3
const EOS_TOOLS_FACE = {
    shocked: { glitch: 63, drop: 44, still: 41, patch: 70, loopie: 58, rush: 63, sync: 48 },
    softer: { glitch: 10, drop: 52, still: 61, patch: 75, loopie: 63, rush: 20, sync: 70 },
    happy: { glitch: 7, drop: 6, still: 70, patch: 20, loopie: 20, rush: 44, sync: 63 },
}
const EOS_TOOLS_SHOCK_ALT = { glitch: [56], drop: [80], still: [63], patch: [73], loopie: [54], rush: [52], sync: [44] }
// bubble centres (% of the arena): the upper 60 % — the tool dock lives at the bottom
const EOS_TOOLS_POS = {
    3: [[27, 26], [73, 26], [50, 52]],
    4: [[27, 22], [73, 22], [27, 52], [73, 52]],
    5: [[50, 17], [21, 35], [79, 35], [33, 59], [67, 59]],
    6: [[19, 22], [50, 19], [81, 22], [19, 52], [50, 49], [81, 52]],
}
// translation only: a rotated / scaled bubble would make the shared face re-fit its words smaller mid-jolt
const EOS_TOOLS_BOB = { x: 0, y: [-3, 3, -3] }
const EOS_TOOLS_STILL = { x: 0, y: 0 }
const EOS_TOOLS_JOLT_X = { x: [0, -7, 6, -3, 0], y: [0, 3, -2, 1, 0] }
const EOS_TOOLS_JOLT_Y = { x: [0, 1, -1, 0, 0], y: [0, 9, -3, 4, 0] }
let eosToolsLive = null

function eosToolsFaces({ game, entries, uploads, n, seed }) {
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
        const pick = (k) => (EOS_TOOLS_FACE[k][b] ? emotionSrc(b, EOS_TOOLS_FACE[k][b]) : src)
        const shocked = [EOS_TOOLS_FACE.shocked[b], ...(EOS_TOOLS_SHOCK_ALT[b] || [])].filter(Boolean).map((e) => emotionSrc(b, e)).find((s) => s !== src) || src
        return { neg: src, shocked, softer: pick("softer"), happy: pick("happy"), upload: false, char: b }
    })
}

// an element's point (fx, fy fractions of its box) in the arena's own CSS px (works under a scaled stage)
function eosToolsPt(arena, el, fx = 0.5, fy = 0.5) {
    if (!arena || !el) return null
    const ar = arena.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const sx = ar.width / (arena.offsetWidth || ar.width || 1) || 1
    const sy = ar.height / (arena.offsetHeight || ar.height || 1) || 1
    return { x: (r.left + r.width * fx - ar.left) / sx, y: (r.top + r.height * fy - ar.top) / sy, w: r.width / sx, h: r.height / sy }
}

// ---------------------------------------------------------------- shared game state (words, faces, hits, queue, finish)
function useEosToolGame({ game, entries = [], onDone, sfx, reduced, onProgress, hasUserImages, imageSources, variationSeed, label, preMs, postMs, breakMs, impact }) {
    const key = (entries || []).join("|")
    const src = React.useMemo(() => (entries.length ? entries : ["THIS"]).map((s) => String(s || "").trim()).filter(Boolean), [key])
    const n = Math.max(3, Math.min(6, src.length || 1))
    const words = React.useMemo(() => distributeAcrossVisibleSlots(src.length ? src : ["THIS"], "THIS", n), [key, n])
    const uploads = hasUserImages ? (imageSources || []).filter(Boolean) : []
    const upKey = uploads.join("|")
    const faces = React.useMemo(() => eosToolsFaces({ game, entries: src, uploads, n, seed: Number(variationSeed || 0) }), [game && game.id, key, upKey, n, variationSeed])
    const total = n * EOS_TOOLS_HITS
    const pos = EOS_TOOLS_POS[n] || EOS_TOOLS_POS[6]
    const [phase, setPhase] = React.useState("dock") // dock → ready → done
    const [hits, setHits] = React.useState(() => Array(n).fill(0))
    const [gone, setGone] = React.useState(() => Array(n).fill(false))
    const [freed, setFreed] = React.useState([])
    const [strike, setStrike] = React.useState(null) // {i, k, stage: "wind"|"impact", x, y, d}
    const [toolPos, setToolPos] = React.useState({ x: 50, y: 76 })
    const [following, setFollowing] = React.useState(false)
    const arenaRef = React.useRef(null)
    const dockRef = React.useRef(null)
    const bubbleRefs = React.useRef([])
    const S = React.useRef(null)
    if (!S.current) S.current = { phase: "dock", busy: false, queue: [], hits: Array(n).fill(0), done: false, timers: [], sfxLog: [], strikes: 0, t0: Date.now(), plog: [], tool: { x: 50, y: 76 } }
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
        onProgress?.(0, `0% ${label}`)
        try {
            if (typeof tsFacePreload === "function") tsFacePreload(faces.flatMap((f) => [f.neg, f.shocked, f.softer, f.happy]))
        } catch {}
        eosToolsLive = { S: S.current, n, total, game: game && game.id }
        return () => {
            S.current.timers.forEach(clearTimeout)
            S.current.timers = []
            if (eosToolsLive && eosToolsLive.S === S.current) eosToolsLive = null
        }
    }, [])
    const placeTool = (p) => {
        S.current.tool = p
        setToolPos(p)
    }
    const nearest = (from) => {
        const H = S.current.hits
        const open = H.map((h, i) => (h < EOS_TOOLS_HITS ? i : -1)).filter((i) => i >= 0)
        if (!open.length) return null
        const started = open.find((i) => H[i] > 0)
        if (started != null) return started
        const f = from || S.current.tool
        return open.sort((a, b) => Math.hypot(pos[a][0] - f.x, pos[a][1] - f.y) - Math.hypot(pos[b][0] - f.x, pos[b][1] - f.y))[0]
    }
    const finish = () => {
        const s = S.current
        s.done = true
        s.phase = "done"
        later(() => {
            setPhase("done")
            play("win")
            vibrate(34)
        }, 380)
        later(() => onDone && onDone(320), reduced ? 1300 : 1750)
    }
    const doStrike = (wanted) => {
        const s = S.current
        if (s.done || s.phase !== "ready") return
        if (s.busy) {
            if (s.queue.length < 3) s.queue.push(wanted)
            return
        }
        const i = wanted != null && s.hits[wanted] < EOS_TOOLS_HITS ? wanted : nearest(wanted != null && pos[wanted] ? { x: pos[wanted][0], y: pos[wanted][1] } : null)
        if (i == null) return
        const a = arenaRef.current
        const el = bubbleRefs.current[i]
        if (!a || !el) return
        s.busy = true
        s.strikes += 1
        const k = s.strikes
        const c = eosToolsPt(a, el, 0.5, 0.5)
        const d = Math.min(c.w, c.h)
        const W = a.offsetWidth || 1
        const H = a.offsetHeight || 1
        const pt = impact(c, d) // arena px where the tool lands
        setFollowing(false)
        placeTool({ x: (pt.x / W) * 100, y: (pt.y / H) * 100 })
        setStrike({ i, k, stage: "wind", x: pt.x, y: pt.y, cx: c.x, cy: c.y, d })
        later(() => {
            s.hits[i] += 1
            const h = s.hits[i]
            setHits(s.hits.slice())
            setStrike({ i, k, stage: "impact", x: pt.x, y: pt.y, cx: c.x, cy: c.y, d })
            const doneHits = s.hits.reduce((x, y) => x + y, 0)
            const p = Math.round((doneHits / total) * 100)
            s.plog.push([Date.now() - s.t0, p])
            onProgress?.(p, doneHits >= total ? `ALL ${label} · FREE` : `${p}% ${label}`)
            if (h >= EOS_TOOLS_HITS) {
                play("win")
                vibrate(30)
                later(() => {
                    setFreed((f) => [...f, { i, k, x: c.x, y: c.y, d }])
                    play("chime")
                }, reduced ? 120 : 260)
                later(() => setGone((g) => g.map((v, j) => (j === i ? true : v))), breakMs)
                later(() => setFreed((f) => f.filter((x) => x.k !== k)), breakMs + 1700)
            } else vibrate(16)
            later(() => {
                setStrike(null)
                s.busy = false
                if (doneHits >= total) finish()
                else if (s.queue.length) doStrike(s.queue.shift())
            }, postMs)
        }, preMs)
    }
    const onTool = () => {
        const s = S.current
        if (s.phase === "dock") {
            s.phase = "ready"
            setPhase("ready")
            play("clack")
            vibrate(12)
            return
        }
        doStrike(null) // tapping the dock with the tool in hand strikes the nearest bubble
    }
    const onBubble = (i) => {
        if (S.current.phase === "dock") {
            onTool() // the first tap anywhere picks the tool up (and the bubble tap is not lost)
            later(() => doStrike(i), 260)
            return
        }
        doStrike(i)
    }
    const onMove = (e) => {
        const s = S.current
        if (s.phase !== "ready" || s.busy || e.pointerType === "touch") return
        const a = arenaRef.current
        if (!a) return
        const r = a.getBoundingClientRect()
        const x = clamp(((e.clientX - r.left) / r.width) * 100, 2, 98)
        const y = clamp(((e.clientY - r.top) / r.height) * 100, 2, 98)
        if (!following) setFollowing(true)
        placeTool({ x, y })
    }
    const completed = hits.filter((h) => h >= EOS_TOOLS_HITS).length
    return { n, words, faces, pos, phase, hits, gone, freed, strike, toolPos, following, arenaRef, dockRef, bubbleRefs, onTool, onBubble, onMove, completed, play, S }
}

function EosToolsImpactFx({ x, y, word, tone = "clank" }) {
    return (
        <div className={"eosToolsImpact " + tone} style={{ left: x + "px", top: y + "px" }} aria-hidden="true">
            <i className="core" />
            {Array.from({ length: 7 }, (_, k) => (
                <i key={k} className="ray" style={{ ["--a"]: k * 51 + 12 + "deg" }} />
            ))}
            {Array.from({ length: 6 }, (_, k) => (
                <i key={"s" + k} className="spark" style={{ ["--a"]: k * 60 - 100 + "deg", ["--l"]: 26 + (k % 3) * 12 + "px" }} />
            ))}
            <b>{word}</b>
        </div>
    )
}

function EosToolsShards({ d, kind }) {
    const n = kind === "flat" ? 8 : 11
    return (
        <div className="eosToolsShards" aria-hidden="true">
            {Array.from({ length: n }, (_, k) => {
                const a = ((k * 360) / n + (k % 2) * 17 - 90) * (Math.PI / 180)
                const dist = d * (0.55 + (k % 3) * 0.22)
                return (
                    <motion.i
                        key={k}
                        className={"eosShard s" + (k % 4) + (kind === "flat" ? " chip" : "")}
                        initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                        animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist + d * 0.45, rotate: (k % 2 ? 1 : -1) * (90 + k * 35), opacity: 0, scale: 0.45 }}
                        transition={{ duration: 0.82, delay: k * 0.012, ease: [0.18, 0.7, 0.3, 1] }}
                    />
                )
            })}
        </div>
    )
}

function EosToolsFreed({ f, src, word }) {
    return (
        <div className="eosToolsFreed tsNoBubbleFace" style={{ left: f.x + "px", top: f.y + "px", ["--d"]: f.d + "px" }} aria-hidden="true">
            <i className="halo" />
            <img src={src} alt="" draggable={false} />
            <b>{word}</b>
        </div>
    )
}

function EosToolsStatus({ title, line, done, n, badge }) {
    return (
        <>
            <div className="eosToolsStatus" aria-live="polite">
                <b>{title}</b>
                <span>{line}</span>
            </div>
            <div className="eosToolsCount">
                <b>
                    {done} / {n}
                </b>
                <span>{badge}</span>
            </div>
        </>
    )
}

// ---------------------------------------------------------------- the tools
function EosSpannerSvg() {
    return (
        <svg className="eosSpannerSvg" viewBox="0 0 60 160" aria-hidden="true">
            <defs>
                <linearGradient id="eosTlSteelH" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#4c5663" />
                    <stop offset=".3" stopColor="#f2f6fa" />
                    <stop offset=".52" stopColor="#b4bfcb" />
                    <stop offset=".78" stopColor="#7a8593" />
                    <stop offset="1" stopColor="#3b434e" />
                </linearGradient>
                <radialGradient id="eosTlHead" cx=".38" cy=".32" r=".78">
                    <stop offset="0" stopColor="#fafcfe" />
                    <stop offset=".45" stopColor="#c3cdd8" />
                    <stop offset=".8" stopColor="#6f7a88" />
                    <stop offset="1" stopColor="#3a424d" />
                </radialGradient>
                <mask id="eosTlJaw">
                    <rect width="60" height="160" fill="#fff" />
                    <rect x="21" y="-8" width="18" height="30" rx="3" fill="#000" transform="rotate(-18 30 10)" />
                </mask>
                <mask id="eosTlBox">
                    <rect width="60" height="160" fill="#fff" />
                    <polygon points="30,131 38,135.5 38,144.5 30,149 22,144.5 22,135.5" fill="#000" />
                </mask>
            </defs>
            <g mask="url(#eosTlJaw)">
                <path d="M11 24 C11 10 20 2 30 2 C40 2 49 10 49 24 L42 40 L18 40 Z" fill="url(#eosTlHead)" stroke="#2c333c" strokeWidth="1.2" strokeLinejoin="round" />
            </g>
            <path d="M24 5 L21 20" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M37 4 L39 19" stroke="rgba(255,255,255,.5)" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M18 40 L42 40 L37 128 L23 128 Z" fill="url(#eosTlSteelH)" stroke="#2c333c" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M27 48 L33 48 L31.5 120 L28.5 120 Z" fill="rgba(0,0,0,.22)" />
            <path d="M22.5 46 L21 118" stroke="rgba(255,255,255,.5)" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M26 60 h8 M26 66 h8 M26 72 h8" stroke="rgba(0,0,0,.28)" strokeWidth="1" />
            <g mask="url(#eosTlBox)">
                <circle cx="30" cy="140" r="17" fill="url(#eosTlHead)" stroke="#2c333c" strokeWidth="1.2" />
            </g>
            <circle cx="30" cy="140" r="9.5" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1" />
            <ellipse cx="24" cy="130" rx="4" ry="2.4" fill="rgba(255,255,255,.55)" transform="rotate(-35 24 130)" />
        </svg>
    )
}

function EosBootSvg() {
    return (
        <svg className="eosBootSvg" viewBox="0 0 160 150" aria-hidden="true">
            <defs>
                <linearGradient id="eosTlLeather" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#b8702f" />
                    <stop offset=".45" stopColor="#8a4a1b" />
                    <stop offset="1" stopColor="#4e2609" />
                </linearGradient>
                <linearGradient id="eosTlLeatherSide" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#5a2c0c" />
                    <stop offset=".5" stopColor="#a65f26" />
                    <stop offset="1" stopColor="#6e3712" />
                </linearGradient>
                <linearGradient id="eosTlSole" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#4a4a52" />
                    <stop offset=".5" stopColor="#1f2026" />
                    <stop offset="1" stopColor="#0b0b0f" />
                </linearGradient>
                <linearGradient id="eosTlToe" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#c47d3b" />
                    <stop offset=".6" stopColor="#7d3f14" />
                    <stop offset="1" stopColor="#4a2308" />
                </linearGradient>
            </defs>
            <path d="M8 112 L8 128 Q8 138 18 138 L140 138 Q156 138 156 124 L156 118 Q156 108 142 108 L20 108 Z" fill="url(#eosTlSole)" stroke="#07070a" strokeWidth="1.5" />
            {[14, 32, 50, 68, 86, 104, 122, 140].map((x) => (
                <rect key={x} x={x} y="138" width="12" height="7" rx="2" fill="#15161b" stroke="#000" strokeWidth=".8" />
            ))}
            <path d="M12 113 H150" stroke="#e8c27a" strokeWidth="1.6" strokeDasharray="4 3" opacity=".85" />
            <path d="M22 108 L22 30 Q22 18 34 16 L78 12 Q88 12 90 24 L92 60 Q100 74 126 84 Q150 92 150 108 Z" fill="url(#eosTlLeather)" stroke="#3a1b06" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M22 108 L22 56 Q40 66 50 108 Z" fill="rgba(0,0,0,.22)" />
            <path d="M98 108 Q96 80 118 78 Q150 86 150 108 Z" fill="url(#eosTlToe)" stroke="#3a1b06" strokeWidth="1.4" />
            <path d="M100 100 Q104 84 120 82" stroke="#e8c27a" strokeWidth="1.3" strokeDasharray="3 3" opacity=".8" fill="none" />
            <ellipse cx="128" cy="90" rx="9" ry="4" fill="rgba(255,255,255,.28)" transform="rotate(18 128 90)" />
            <path d="M22 30 Q22 18 34 16 L78 12 Q88 12 90 24 L90 32 Q60 24 24 36 Z" fill="#3f1e08" opacity=".95" />
            <path d="M58 24 L84 22 L92 62 L66 70 Z" fill="url(#eosTlLeatherSide)" stroke="#3a1b06" strokeWidth="1.2" />
            {[
                [62, 32],
                [64, 42],
                [66, 52],
                [68, 62],
                [82, 30],
                [84, 40],
                [86, 50],
                [88, 60],
            ].map(([x, y], k) => (
                <circle key={k} cx={x} cy={y} r="3.2" fill="#d9a441" stroke="#5c3d0c" strokeWidth="1" />
            ))}
            <path d="M62 32 L84 40 M82 30 L64 42 M64 42 L86 50 M84 40 L66 52 M66 52 L88 60 M86 50 L68 62" stroke="rgba(0,0,0,.3)" strokeWidth="3.4" strokeLinecap="round" fill="none" transform="translate(0,1.4)" />
            <path d="M62 32 L84 40 M82 30 L64 42 M64 42 L86 50 M84 40 L66 52 M66 52 L88 60 M86 50 L68 62" stroke="#f3e6c6" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M72 22 C60 12 54 24 70 26 M72 22 C84 10 92 22 74 26" stroke="#f3e6c6" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M72 26 L64 40 M72 26 L80 38" stroke="#f3e6c6" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M30 40 Q40 26 76 24" stroke="rgba(255,255,255,.22)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
    )
}

// fracture web (bubble-local 0-100): g1 after hit 1, g2 after hit 2, g3 the full web before the shatter
function EosCrackLines() {
    return (
        <svg className="eosCrackLines" viewBox="0 0 100 100" aria-hidden="true">
            <g className="g1">
                <path d="M78 24 L64 36 L58 48" />
                <path d="M78 24 L70 42 L66 54" />
            </g>
            <g className="g2">
                <path d="M64 36 L48 40 L34 36 L22 42" />
                <path d="M58 48 L50 62 L40 70" />
                <path d="M66 54 L74 66 L72 80" />
            </g>
            <g className="g3">
                <path d="M48 40 L36 24 L28 12" />
                <path d="M50 62 L58 76 L54 92" />
                <path d="M34 36 L24 54 L12 60" />
                <path d="M74 66 L88 70 L94 60" />
                <path d="M40 70 L28 80 L18 90" />
            </g>
        </svg>
    )
}

// ---------------------------------------------------------------- 3 CRACK
function EosCrackEngine(props) {
    const { reduced } = props
    const G = useEosToolGame({
        ...props,
        label: "CRACKED",
        preMs: reduced ? 90 : 230,
        postMs: reduced ? 220 : 300,
        breakMs: reduced ? 500 : 860,
        // the jaw lands on the upper-right rim of the bubble
        impact: (c, d) => ({ x: c.x + d * 0.36, y: c.y - d * 0.36 }),
    })
    const { n, words, faces, pos, phase, hits, gone, freed, strike, toolPos, following, arenaRef, dockRef, bubbleRefs, onTool, onBubble, onMove, completed } = G
    const title = phase === "dock" ? "GRAB THE SPANNER" : phase === "done" ? "EVERY SHELL SHATTERED" : `${completed} / ${n} SHATTERED · 3 HITS EACH`
    const line = phase === "dock" ? "Tap the spanner to pick it up." : phase === "done" ? "They are all free." : "Hit a bubble with the spanner. The third hit shatters the shell."
    return (
        <div ref={arenaRef} className={"arena premiumArena eosToolsArena eosCrackArena phase-" + phase + (reduced ? " reduced" : "") + (following ? " following" : "")} data-eos-tool={phase} onPointerMove={onMove}>
            <style>{EOS_TOOLS_CSS}</style>
            <div className={"eosToolsStage" + (strike && strike.stage === "impact" && !reduced ? " shake k" + (strike.k % 2) : "")}>
                <div className="eosToolsFloor" />
                {words.map((w, i) => {
                    if (gone[i]) return null
                    const h = hits[i] || 0
                    const f = faces[i] || faces[0] || {}
                    const picture = h === 0 ? f.neg : h === 1 ? f.shocked : h === 2 ? f.softer : f.happy
                    const struck = strike && strike.i === i && strike.stage === "impact"
                    const spent = h >= EOS_TOOLS_HITS
                    return (
                        <motion.button
                            type="button"
                            key={i}
                            ref={(el) => (bubbleRefs.current[i] = el)}
                            className={"tsFaceObject crackBubbleSlot eosToolsBubble eosCrackBubble h" + Math.min(h, EOS_TOOLS_HITS) + (spent ? " spent shattered" : "") + (struck ? " struck" : "") + (f.upload ? " upload" : "")}
                            data-tsf-src={picture || undefined}
                            data-tool-hits={h}
                            style={{ left: pos[i][0] + "%", top: pos[i][1] + "%" }}
                            initial={false}
                            animate={struck && !spent ? EOS_TOOLS_JOLT_X : reduced || spent ? EOS_TOOLS_STILL : EOS_TOOLS_BOB}
                            transition={struck ? { duration: 0.34 } : { duration: 2.6 + i * 0.14, repeat: Infinity, ease: "easeInOut" }}
                            onClick={() => onBubble(i)}
                            aria-label={"Crack the shell around: " + w}
                        >
                            <i className="eosToolsShell" />
                            <span className="tsExactUserText eosToolsWord">{w}</span>
                            <EosCrackLines />
                            {struck && !spent ? (
                                <span className="eosToolsChips" aria-hidden="true">
                                    {Array.from({ length: 4 }, (_, k) => (
                                        <i key={k} style={{ ["--a"]: -20 - k * 38 + "deg", ["--l"]: 22 + k * 7 + "px" }} />
                                    ))}
                                </span>
                            ) : null}
                            {spent ? <EosToolsShards d={strike && strike.i === i ? strike.d : 100} kind="glass" /> : null}
                        </motion.button>
                    )
                })}
                {freed.map((f) => (
                    <EosToolsFreed key={f.k} f={f} src={(faces[f.i] || faces[0] || {}).happy} word="FREE!" />
                ))}
                {strike && strike.stage === "impact" ? <EosToolsImpactFx key={strike.k} x={strike.x} y={strike.y} word={hits[strike.i] >= EOS_TOOLS_HITS ? "SHATTER!" : "CLANK!"} tone="clank" /> : null}
                {phase !== "dock" ? (
                    <div className={"eosToolFloat eosSpannerFloat" + (strike ? " strike" : "")} key={strike ? "s" + strike.k : "rest"} style={{ left: toolPos.x + "%", top: toolPos.y + "%" }} aria-hidden="true">
                        <div className="eosToolSwing">
                            <EosSpannerSvg />
                        </div>
                    </div>
                ) : null}
            </div>
            <button ref={dockRef} type="button" className={"crackToolDock eosToolsDock eosSpannerDock" + (phase !== "dock" ? " selected" : "")} onClick={onTool} aria-label={phase === "dock" ? "Pick up the spanner" : "Hit the nearest bubble with the spanner"}>
                <i className="eosToolsTray" />
                <div className="eosToolsDockArt">
                    <EosSpannerSvg />
                </div>
                <span className="eosToolsDockLabel">{phase === "dock" ? "SPANNER" : "IN HAND"}</span>
            </button>
            <EosToolsStatus title={title} line={line} done={completed} n={n} badge="FREED" />
        </div>
    )
}

// ---------------------------------------------------------------- 4 STOMP
function EosStompEngine(props) {
    const { reduced } = props
    const G = useEosToolGame({
        ...props,
        label: "STOMPED",
        preMs: reduced ? 110 : 300,
        postMs: reduced ? 240 : 320,
        breakMs: reduced ? 460 : 720,
        // the sole lands on the bubble (pressing its top), so the boot stays inside the arena on the top row too
        impact: (c, d) => ({ x: c.x, y: c.y + d * 0.05 }),
    })
    const { n, words, faces, pos, phase, hits, gone, freed, strike, toolPos, following, arenaRef, dockRef, bubbleRefs, onTool, onBubble, onMove, completed } = G
    const title = phase === "dock" ? "PUT ON THE BOOT" : phase === "done" ? "EVERYTHING FLATTENED" : `${completed} / ${n} FLATTENED · 3 STOMPS EACH`
    const line = phase === "dock" ? "Tap the boot to step in." : phase === "done" ? "Nothing left to step on your day." : "Stomp a bubble with the boot. The third stomp flattens it."
    return (
        <div ref={arenaRef} className={"arena premiumArena eosToolsArena eosStompArena phase-" + phase + (reduced ? " reduced" : "") + (following ? " following" : "")} data-eos-tool={phase} onPointerMove={onMove}>
            <style>{EOS_TOOLS_CSS}</style>
            <div className={"eosToolsStage" + (strike && strike.stage === "impact" && !reduced ? " shake k" + (strike.k % 2) : "")}>
                <div className="eosToolsFloor" />
                {words.map((w, i) => {
                    if (gone[i]) return null
                    const h = hits[i] || 0
                    const f = faces[i] || faces[0] || {}
                    const picture = h === 0 ? f.neg : h === 1 ? f.shocked : h === 2 ? f.softer : f.happy
                    const struck = strike && strike.i === i && strike.stage === "impact"
                    const spent = h >= EOS_TOOLS_HITS
                    return (
                        <motion.button
                            type="button"
                            key={i}
                            ref={(el) => (bubbleRefs.current[i] = el)}
                            className={"tsFaceObject stompBubbleSlot eosToolsBubble eosStompBubble h" + Math.min(h, EOS_TOOLS_HITS) + (spent ? " spent flat" : "") + (struck ? " struck" : "") + (f.upload ? " upload" : "")}
                            data-tsf-src={picture || undefined}
                            data-tool-hits={h}
                            style={{ left: pos[i][0] + "%", top: pos[i][1] + "%" }}
                            initial={false}
                            animate={struck && !spent ? EOS_TOOLS_JOLT_Y : reduced || spent ? EOS_TOOLS_STILL : EOS_TOOLS_BOB}
                            transition={struck ? { duration: 0.36 } : { duration: 2.5 + i * 0.13, repeat: Infinity, ease: "easeInOut" }}
                            onClick={() => onBubble(i)}
                            aria-label={"Stomp the thought: " + w}
                        >
                            <i className="eosToolsShell" />
                            <i className="eosStompDent" />
                            <span className="tsExactUserText eosToolsWord">{w}</span>
                            <EosCrackLines />
                            {spent ? <EosToolsShards d={strike && strike.i === i ? strike.d : 100} kind="flat" /> : null}
                        </motion.button>
                    )
                })}
                {freed.map((f) => (
                    <EosToolsFreed key={f.k} f={f} src={(faces[f.i] || faces[0] || {}).happy} word="PHEW!" />
                ))}
                {strike && strike.stage === "impact" ? (
                    <>
                        <div className="eosToolsDust" key={"d" + strike.k} style={{ left: strike.cx + "px", top: strike.cy - strike.d * 0.1 + "px", ["--d"]: strike.d + "px" }} aria-hidden="true">
                            <i className="wave" />
                            {Array.from({ length: 6 }, (_, k) => (
                                <i key={k} className="puff" style={{ ["--a"]: k < 3 ? -150 + k * 25 + "deg" : -30 + (k - 3) * 25 + "deg", ["--l"]: 0.5 * strike.d + (k % 3) * 9 + "px" }} />
                            ))}
                        </div>
                        <EosToolsImpactFx key={strike.k} x={strike.x} y={strike.y} word={hits[strike.i] >= EOS_TOOLS_HITS ? "FLAT!" : "THUD!"} tone="thud" />
                    </>
                ) : null}
                {phase !== "dock" ? (
                    <div className={"eosToolFloat eosBootFloat" + (strike ? " strike" : "")} key={strike ? "s" + strike.k : "rest"} style={{ left: toolPos.x + "%", top: toolPos.y + "%" }} aria-hidden="true">
                        <i className="eosBootShadow" />
                        <div className="eosToolSwing">
                            <EosBootSvg />
                        </div>
                    </div>
                ) : null}
            </div>
            <button ref={dockRef} type="button" className={"stompToolDock eosToolsDock eosBootDock" + (phase !== "dock" ? " selected" : "")} onClick={onTool} aria-label={phase === "dock" ? "Put on the boot" : "Stomp the nearest bubble"}>
                <i className="eosToolsTray" />
                <div className="eosToolsDockArt">
                    <EosBootSvg />
                </div>
                <span className="eosToolsDockLabel">{phase === "dock" ? "BOOT" : "ON FOOT"}</span>
            </button>
            <EosToolsStatus title={title} line={line} done={completed} n={n} badge="FLAT" />
        </div>
    )
}

const EOS_TOOLS_CSS = String.raw`
.eosToolsArena{--td:min(27%,150px);--sw:min(15cqw,60px);--bw:min(27cqw,100px);--dw:min(26cqw,104px);container-type:inline-size;position:relative;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.eosToolsArena.phase-ready.following,.eosToolsArena.phase-ready.following *{cursor:none!important}
.eosToolsArena .eosToolsStage{position:absolute;inset:0}
.eosToolsArena .eosToolsStage.shake.k0{animation:eosToolsShakeA .32s cubic-bezier(.2,.8,.3,1)}
.eosToolsArena .eosToolsStage.shake.k1{animation:eosToolsShakeB .32s cubic-bezier(.2,.8,.3,1)}
@keyframes eosToolsShakeA{0%{transform:translate(0,0)}25%{transform:translate(-3px,3px)}55%{transform:translate(2px,-2px)}100%{transform:translate(0,0)}}
@keyframes eosToolsShakeB{0%{transform:translate(0,0)}25%{transform:translate(3px,2px)}55%{transform:translate(-2px,-2px)}100%{transform:translate(0,0)}}
.eosToolsArena .eosToolsFloor{position:absolute;left:0;right:0;bottom:0;height:34%;background:radial-gradient(ellipse at 50% 100%,rgba(120,220,255,.14),rgba(120,220,255,0) 70%);pointer-events:none}
.eosStompArena .eosToolsFloor{background:radial-gradient(ellipse at 50% 100%,rgba(255,200,120,.10),rgba(120,220,255,0) 70%),repeating-linear-gradient(0deg,rgba(79,231,255,.05) 0 1px,transparent 1px 30px)}
/* bubbles: glass shell behind the shared F8 face (picture on top, the user's words below inside) */
.eosToolsArena .eosToolsBubble{pointer-events:auto;position:absolute;width:var(--td);height:auto;aspect-ratio:1/1;margin:calc(var(--td) / -2) 0 0 calc(var(--td) / -2);padding:0;border:0;border-radius:50%;background:transparent;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:visible;z-index:3;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.eosToolsArena .eosToolsShell{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(165,236,255,.8);background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.40),rgba(160,228,255,.16) 32%,rgba(120,170,255,.12) 64%,rgba(180,130,255,.16) 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.10),inset 0 -10px 22px rgba(130,205,255,.18),0 0 18px rgba(0,210,255,.26);z-index:1;pointer-events:none;transition:border-color .3s,box-shadow .3s}
.eosToolsArena .eosToolsBubble.h1 .eosToolsShell{border-color:rgba(200,245,255,.95);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 0 16px rgba(60,225,255,.6)}
.eosToolsArena .eosToolsBubble.h2 .eosToolsShell{border-color:#ffffff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2),0 0 20px rgba(120,240,255,.75),0 0 40px rgba(60,225,255,.3)}
.eosToolsArena .eosToolsBubble .eosToolsWord{display:block;max-width:86%;font:900 15px/1.1 Inter,system-ui,sans-serif;color:#fff;text-align:center;overflow-wrap:normal;word-break:normal;position:relative;z-index:2}
.eosToolsArena .eosToolsBubble.struck .eosToolsShell{animation:eosToolsSquashX .34s cubic-bezier(.2,.8,.3,1)}
.eosStompArena .eosToolsBubble.struck .eosToolsShell{animation:eosToolsSquashY .36s cubic-bezier(.2,.8,.3,1)}
@keyframes eosToolsSquashX{0%{transform:scale(1,1)}30%{transform:scale(.9,1.08) translateX(-4%)}65%{transform:scale(1.05,.96)}100%{transform:scale(1,1)}}
@keyframes eosToolsSquashY{0%{transform:scale(1,1)}30%{transform:scale(1.16,.78) translateY(10%)}65%{transform:scale(.96,1.05)}100%{transform:scale(1,1)}}
/* fracture lines: dark edge + bright glass edge, each group grows (dash) when its hit lands; over the picture (ts-face is z 6) */
.eosToolsArena .eosCrackLines{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;overflow:hidden;pointer-events:none;z-index:7}
.eosToolsArena .eosCrackLines path{fill:none;stroke:#eafdff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:120;stroke-dashoffset:120;opacity:0;filter:drop-shadow(1px 1px 0 rgba(0,20,40,.75)) drop-shadow(0 0 3px rgba(120,240,255,.9))}
.eosToolsArena .eosToolsBubble.h1 .eosCrackLines .g1 path,.eosToolsArena .eosToolsBubble.h2 .eosCrackLines :is(.g1,.g2) path,.eosToolsArena .eosToolsBubble.h3 .eosCrackLines path{opacity:1;animation:eosToolsCrackGrow .42s cubic-bezier(.2,.7,.2,1) forwards}
.eosToolsArena .eosToolsBubble.h2 .eosCrackLines .g1 path,.eosToolsArena .eosToolsBubble.h3 .eosCrackLines :is(.g1,.g2) path{animation:none;stroke-dashoffset:0}
@keyframes eosToolsCrackGrow{to{stroke-dashoffset:0}}
.eosStompArena .eosStompDent{position:absolute;left:14%;right:14%;top:-2%;height:36%;border-radius:50%;pointer-events:none;z-index:7;opacity:0;background:radial-gradient(ellipse at 50% 0%,rgba(10,20,40,.55),rgba(10,20,40,.2) 50%,rgba(10,20,40,0) 72%);transition:opacity .25s}
.eosStompArena .eosToolsBubble.h1 .eosStompDent{opacity:.6}
.eosStompArena .eosToolsBubble.h2 .eosStompDent{opacity:1;height:46%}
/* shatter / flatten: the face fades out, the shell goes, shards fly, the freed character rises */
.eosToolsArena .eosToolsBubble.spent{pointer-events:none!important;z-index:4}
.eosToolsArena .eosToolsBubble.spent ts-face{opacity:0!important;transition:opacity .16s ease}
.eosToolsArena .eosToolsBubble.spent .eosToolsWord{opacity:0}
.eosToolsArena .eosToolsBubble.shattered .eosToolsShell,.eosToolsArena .eosToolsBubble.shattered .eosCrackLines{animation:eosToolsShellGone .3s ease-out forwards}
@keyframes eosToolsShellGone{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.12)}}
.eosToolsArena .eosToolsBubble.flat .eosToolsShell{animation:eosToolsShellFlat .5s cubic-bezier(.2,.8,.3,1) forwards;transform-origin:50% 100%}
.eosToolsArena .eosToolsBubble.flat .eosCrackLines,.eosToolsArena .eosToolsBubble.flat .eosStompDent{opacity:0!important;transition:opacity .2s}
@keyframes eosToolsShellFlat{0%{transform:scale(1,1);opacity:1;filter:brightness(1)}40%{transform:scale(1.3,.35);opacity:1;filter:brightness(1.8)}100%{transform:scale(1.7,.05);opacity:0;filter:brightness(.6) blur(2px)}}
.eosToolsArena .eosToolsShards{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:9}
.eosToolsArena .eosShard{position:absolute;left:-9px;top:-9px;width:18px;height:18px;background:linear-gradient(145deg,rgba(255,255,255,.85),rgba(160,228,255,.55) 45%,rgba(120,170,255,.35));border:1px solid rgba(220,250,255,.9);box-shadow:0 0 8px rgba(120,236,255,.7);clip-path:polygon(50% 0,100% 40%,78% 100%,10% 85%,0 35%)}
.eosToolsArena .eosShard.s1{width:14px;height:22px;clip-path:polygon(0 0,100% 20%,70% 100%,20% 80%)}
.eosToolsArena .eosShard.s2{width:22px;height:12px;clip-path:polygon(0 50%,30% 0,100% 30%,80% 100%)}
.eosToolsArena .eosShard.s3{width:12px;height:12px;clip-path:polygon(50% 0,100% 100%,0 100%)}
.eosToolsArena .eosShard.chip{background:linear-gradient(145deg,rgba(200,215,230,.8),rgba(100,120,150,.6));border-color:rgba(230,240,255,.6);box-shadow:0 2px 4px rgba(0,0,0,.4)}
.eosToolsArena .eosToolsChips{position:absolute;left:78%;top:22%;width:0;height:0;pointer-events:none;z-index:9}
.eosToolsArena .eosToolsChips i{position:absolute;left:-4px;top:-4px;width:8px;height:8px;background:linear-gradient(145deg,#ffffff,rgba(160,228,255,.7));clip-path:polygon(50% 0,100% 60%,30% 100%,0 40%);animation:eosToolsChip .5s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes eosToolsChip{0%{transform:rotate(var(--a)) translateX(0) scale(1);opacity:1}100%{transform:rotate(var(--a)) translateX(var(--l)) translateY(12px) scale(.4);opacity:0}}
.eosToolsArena .eosToolsFreed{position:absolute;width:calc(var(--d) * .78);height:auto;aspect-ratio:1/1;margin:calc(var(--d) * -.39) 0 0 calc(var(--d) * -.39);pointer-events:none;z-index:12;animation:eosToolsRise 1.7s cubic-bezier(.2,.6,.3,1) forwards}
.eosToolsArena .eosToolsFreed .halo{position:absolute;inset:-14%;border-radius:50%;background:radial-gradient(circle,rgba(255,250,215,.9),rgba(255,226,140,.35) 48%,rgba(255,226,140,0) 72%);animation:eosToolsHalo 1.7s ease-out forwards}
.eosToolsArena .eosToolsFreed img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:50%;filter:drop-shadow(0 0 8px rgba(255,236,160,.8))}
.eosToolsArena .eosToolsFreed b{position:absolute;left:50%;top:-14px;transform:translateX(-50%) rotate(-6deg);font:1000 15px/1 Inter,system-ui,sans-serif;letter-spacing:.04em;color:#fff7c2;-webkit-text-stroke:.8px #7a4d00;text-shadow:0 0 8px rgba(255,214,110,.9);white-space:nowrap}
@keyframes eosToolsRise{0%{transform:translateY(0) scale(.6);opacity:0}18%{transform:translateY(-6px) scale(1.08);opacity:1}100%{transform:translateY(-78px) scale(1);opacity:0}}
@keyframes eosToolsHalo{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.9);opacity:0}}
/* impact: flash core, rays, sparks, the word */
.eosToolsArena .eosToolsImpact{position:absolute;width:0;height:0;z-index:11;pointer-events:none}
.eosToolsArena .eosToolsImpact .core{position:absolute;left:-24px;top:-24px;width:48px;height:48px;border-radius:50%;background:radial-gradient(circle,#ffffff 0,#dff8ff 30%,rgba(120,225,255,.55) 55%,rgba(120,225,255,0) 72%);animation:eosToolsCore .4s ease-out both}
.eosToolsArena .eosToolsImpact.thud .core{background:radial-gradient(circle,#fff6e0 0,#ffd9a0 30%,rgba(255,180,90,.5) 55%,rgba(255,180,90,0) 72%)}
@keyframes eosToolsCore{0%{transform:scale(.3);opacity:1}55%{transform:scale(1.2);opacity:1}100%{transform:scale(1.6);opacity:0}}
.eosToolsArena .eosToolsImpact .ray{position:absolute;left:-1.5px;top:-1.5px;width:3px;height:22px;border-radius:3px;background:linear-gradient(#ffffff,#9ff3ff 60%,rgba(127,240,255,0));transform-origin:50% 0;transform:rotate(var(--a)) translateY(6px);animation:eosToolsRay .4s ease-out both}
@keyframes eosToolsRay{0%{opacity:1;transform:rotate(var(--a)) translateY(4px) scaleY(.4)}100%{opacity:0;transform:rotate(var(--a)) translateY(24px) scaleY(1.1)}}
.eosToolsArena .eosToolsImpact .spark{position:absolute;left:-2px;top:-2px;width:4px;height:4px;border-radius:50%;background:#fff3c4;box-shadow:0 0 6px #ffd05a;animation:eosToolsSpark .55s cubic-bezier(.2,.7,.3,1) both}
@keyframes eosToolsSpark{0%{transform:rotate(var(--a)) translateX(2px);opacity:1}100%{transform:rotate(var(--a)) translateX(var(--l)) translateY(14px);opacity:0}}
.eosToolsArena .eosToolsImpact b{position:absolute;left:10px;top:-46px;font:1000 17px/1 Inter,system-ui,sans-serif;letter-spacing:.04em;color:#fff7c2;-webkit-text-stroke:1px #6b3f00;text-shadow:0 0 8px #ffcf4a,0 2px 0 #6b3f00;transform:rotate(-8deg);animation:eosToolsWordPop .55s cubic-bezier(.2,1.4,.4,1) both;white-space:nowrap}
.eosToolsArena .eosToolsImpact.clank b{-webkit-text-stroke:1px #0a6f95;text-shadow:0 0 8px #34dcff,0 2px 0 #0a6f95}
@keyframes eosToolsWordPop{0%{opacity:0;transform:rotate(-8deg) scale(.4)}35%{opacity:1;transform:rotate(-8deg) scale(1.15)}100%{opacity:0;transform:rotate(-8deg) translateY(-12px) scale(1)}}
/* dust + floor shockwave under a stomp */
.eosToolsArena .eosToolsDust{position:absolute;width:0;height:0;z-index:10;pointer-events:none}
.eosToolsArena .eosToolsDust .wave{position:absolute;left:calc(var(--d) * -.7);top:calc(var(--d) * .3);width:calc(var(--d) * 1.4);height:calc(var(--d) * .36);border-radius:50%;border:3px solid rgba(255,230,190,.85);box-shadow:0 0 14px rgba(255,200,120,.5);animation:eosToolsWave .5s ease-out both}
@keyframes eosToolsWave{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.6);opacity:0}}
.eosToolsArena .eosToolsDust .puff{position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,rgba(235,225,210,.95),rgba(200,190,175,.5) 60%,rgba(200,190,175,0));animation:eosToolsPuff .62s ease-out both}
@keyframes eosToolsPuff{0%{transform:rotate(var(--a)) translateX(4px) scale(.4);opacity:.95}100%{transform:rotate(var(--a)) translateX(var(--l)) scale(2.4);opacity:0}}
/* the tool in hand: follows the mouse on desktop; travels to the tapped bubble; wind-up → impact → recoil */
.eosToolsArena .eosToolFloat{position:absolute;pointer-events:none;z-index:14;transition:left .19s cubic-bezier(.2,.8,.3,1),top .19s cubic-bezier(.2,.8,.3,1)}
.eosToolsArena.following .eosToolFloat{transition:none}
.eosToolsArena .eosToolSwing{position:absolute;inset:0}
.eosToolsArena .eosSpannerFloat{width:var(--sw);height:calc(var(--sw) * 2.667);margin:calc(var(--sw) * -.2) 0 0 calc(var(--sw) * -.5)}
.eosToolsArena .eosSpannerFloat .eosToolSwing{transform-origin:50% 7.5%;transform:rotate(-28deg);animation:eosSpannerIdle 2.2s ease-in-out infinite}
.eosToolsArena .eosSpannerFloat.strike .eosToolSwing{animation:eosSpannerStrike .46s cubic-bezier(.2,.75,.25,1) both}
@keyframes eosSpannerIdle{0%,100%{transform:rotate(-28deg)}50%{transform:rotate(-22deg) translateY(-3px)}}
@keyframes eosSpannerStrike{0%{transform:translate(30px,-44px) rotate(-82deg)}50%{transform:translate(0,0) rotate(-2deg)}62%{transform:translate(6px,-8px) rotate(-18deg)}80%{transform:translate(2px,-3px) rotate(-25deg)}100%{transform:translate(0,0) rotate(-28deg)}}
.eosToolsArena .eosSpannerSvg,.eosToolsArena .eosBootSvg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 8px 10px rgba(0,0,0,.5))}
.eosToolsArena .eosBootFloat{width:var(--bw);height:calc(var(--bw) * .9375);margin:calc(var(--bw) * -.9375) 0 0 calc(var(--bw) * -.5)}
.eosToolsArena .eosBootFloat .eosToolSwing{transform-origin:50% 100%;transform:translateY(-12px) rotate(-6deg);animation:eosBootIdle 2s ease-in-out infinite}
.eosToolsArena .eosBootFloat.strike .eosToolSwing{animation:eosBootStomp .5s cubic-bezier(.3,.7,.2,1) both}
@keyframes eosBootIdle{0%,100%{transform:translateY(-12px) rotate(-6deg)}50%{transform:translateY(-18px) rotate(-8deg)}}
@keyframes eosBootStomp{0%{transform:translateY(-12px) rotate(-6deg)}34%{transform:translateY(-50px) rotate(-18deg)}48%{transform:translateY(-46px) rotate(-16deg)}60%{transform:translateY(0) rotate(0deg) scale(1.04,.96)}70%{transform:translateY(-7px) rotate(-3deg)}100%{transform:translateY(-12px) rotate(-6deg)}}
.eosToolsArena .eosBootShadow{position:absolute;left:12%;right:12%;bottom:-4%;height:12%;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.55),rgba(0,0,0,0) 70%);animation:eosBootShadowIdle 2s ease-in-out infinite}
.eosToolsArena .eosBootFloat.strike .eosBootShadow{animation:eosBootShadowStomp .5s cubic-bezier(.3,.7,.2,1) both}
@keyframes eosBootShadowIdle{0%,100%{transform:scale(.85);opacity:.7}50%{transform:scale(.75);opacity:.5}}
@keyframes eosBootShadowStomp{0%{transform:scale(.85);opacity:.7}40%{transform:scale(.5);opacity:.3}60%{transform:scale(1.15);opacity:1}100%{transform:scale(.85);opacity:.7}}
/* the dock: a steel tray with the tool resting on it; empty (tray + label) once the tool is in hand */
.eosToolsArena .eosToolsDock{position:absolute;left:50%;bottom:2%;width:var(--dw);height:calc(var(--dw) * .88);margin:0 0 0 calc(var(--dw) / -2);padding:0;border:0;background:transparent;cursor:pointer;z-index:15;-webkit-tap-highlight-color:transparent;touch-action:manipulation;display:block}
${EOS_A} .arena.eosToolsArena>button.eosToolsDock,${EOS_A} .arena.eosToolsArena>button.eosToolsDock:hover,${EOS_A} .arena.eosToolsArena>button.eosToolsDock:focus,${EOS_A} .arena.eosToolsArena>button.eosToolsDock.selected,${EOS_A} .arena.eosToolsArena>button.eosToolsDock:not(.selected):not(.active):not(.toolArmed){background:none!important;background-image:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;min-width:0!important;min-height:0!important;width:var(--dw)!important;height:calc(var(--dw) * .88)!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;outline:none!important;filter:none!important;transform:none!important;animation:none!important;left:50%!important;right:auto!important;top:auto!important;bottom:2%!important;cursor:pointer!important;display:block!important}
${EOS_A} .arena.eosToolsArena>button.eosToolsDock::before,${EOS_A} .arena.eosToolsArena>button.eosToolsDock::after{display:none!important}
.eosToolsArena .eosToolsTray{position:absolute;left:0;right:0;top:auto;bottom:0;height:22%;border:0;border-radius:8px 8px 12px 12px;background:linear-gradient(180deg,#aab4c1,#5f6977 55%,#394149);box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 6px 14px rgba(0,0,0,.4);transition:opacity .4s}
.eosToolsArena .eosToolsTray::after{content:"";position:absolute;left:18%;right:18%;top:-16%;height:34%;border-radius:6px;background:linear-gradient(180deg,#2c333d,#4b5563)}
.eosToolsArena .eosToolsDock.selected .eosToolsTray{opacity:.55}
.eosToolsArena .eosToolsDockArt{position:absolute;left:8%;right:8%;top:0;bottom:16%;transition:opacity .25s,transform .25s}
.eosSpannerDock .eosToolsDockArt{left:28%;right:28%;top:-4%;bottom:14%;transform:rotate(-32deg)}
.eosToolsArena .eosToolsDock:not(.selected) .eosToolsDockArt{animation:eosToolsWake 1.6s ease-in-out infinite}
@keyframes eosToolsWake{0%,100%{filter:drop-shadow(0 0 6px rgba(255,214,110,.35))}50%{filter:drop-shadow(0 0 16px rgba(255,214,110,.85))}}
.eosToolsArena .eosToolsDock.selected .eosToolsDockArt{opacity:0;transform:translateY(-30%) scale(.8)}
.eosToolsArena .eosToolsDockLabel{position:absolute;left:0;right:0;bottom:3%;font:900 13px/1 Inter,system-ui,sans-serif;letter-spacing:.1em;color:#e9f4ff;text-align:center;text-shadow:0 1px 0 rgba(0,0,0,.6);pointer-events:none}
.eosToolsArena .eosToolsDock.selected .eosToolsDockLabel{color:#ffe9a8}
/* status + count */
.eosToolsArena .eosToolsStatus{position:absolute;left:4%;right:4%;top:64%;text-align:center;pointer-events:none;z-index:8;display:flex;flex-direction:column;gap:4px}
.eosToolsArena .eosToolsStatus b{font:1000 14px/1.15 Inter,system-ui,sans-serif;letter-spacing:.06em;color:#dffbff;text-shadow:0 0 10px rgba(79,231,255,.35),0 1px 0 rgba(0,0,0,.6)}
.eosToolsArena .eosToolsStatus span{font:700 13px/1.25 Inter,system-ui,sans-serif;color:#c9d6e2;text-shadow:0 1px 0 rgba(0,0,0,.6)}
.eosToolsArena .eosToolsCount{position:absolute;right:3%;bottom:4%;z-index:8;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 10px;border-radius:14px;border:1px solid rgba(255,226,140,.55);background:rgba(255,236,170,.12);color:#fff3c4;pointer-events:none}
.eosToolsArena .eosToolsCount b{font:1000 18px/1 Inter,system-ui,sans-serif}
.eosToolsArena .eosToolsCount span{font:900 11px/1 Inter,system-ui,sans-serif;letter-spacing:.08em}
.eosToolsArena.phase-done .eosToolsDockArt{opacity:1;transform:translateY(0) scale(1);filter:drop-shadow(0 0 14px rgba(255,214,110,.75))}
.eosToolsArena.phase-done .eosToolFloat{opacity:0;transition:opacity .5s}
@media (min-width:701px){.eosToolsArena{--td:min(22%,150px);--sw:min(6.5cqw,74px);--bw:min(12cqw,150px);--dw:min(12cqw,130px)}.eosToolsArena .eosToolsImpact b{font-size:20px}.eosToolsArena .eosToolsStatus{top:68%}.eosToolsArena .eosToolsStatus b{font-size:16px}.eosToolsArena .eosToolsStatus span{font-size:14px}}
@media (prefers-reduced-motion:reduce){.eosToolsArena *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`

eosExpose("tools", {
    // dev/test only (window.__eos exists only when eosIsDev()); never exposes words
    state: () => {
        const L = eosToolsLive
        if (!L) return null
        const s = L.S
        return { game: L.game, phase: s.phase, hits: s.hits.slice(), strikes: s.strikes, done: s.done, busy: s.busy, n: L.n, total: L.total, sfx: s.sfxLog.slice(), plog: s.plog.slice() }
    },
})
