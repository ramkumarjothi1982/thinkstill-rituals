/* ================================================================== */
/* 41 · UNHOOK — one forged hook over a night harbour                  */
/* ================================================================== */
// Desktop rules kept: ONE big hook, exactly 3 strings, 3 bubbles (entries → 3 groups by the user's base
// sequence), any order, one string = one snap, progress 1/3 · 2/3 · 1, hook swings away from the snapped side
// (harder on the last), the freed bubble floats up and out, onDone(280) ≈ 1.3 s after the last snap.
// Mobile: you SWIPE ACROSS a string to snap it (a tap on a bubble only plucks its string). The string cracks
// where your finger crossed it — the top half whips back to the hook, the tail swings under the bubble — the
// hook recoils, the freed bubble turns happy, rises and lets its words drift off as letters.
// Fixed: full words (no 3-word cut), faces flip per freed bubble (not by global progress), no counter pill.

const UH_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="41"] .uhSky{position:absolute;inset:0;background:
  radial-gradient(60% 34% at 50% 6%, rgba(255,214,160,.22) 0%, transparent 70%),
  radial-gradient(90% 40% at 50% 100%, rgba(40,140,170,.32) 0%, transparent 70%),
  linear-gradient(180deg,#0a1226 0%,#11233f 38%,#14344f 70%,#0c2236 82%,#081627 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="41"] .uhSky{background:
  radial-gradient(60% 34% at 50% 6%, rgba(255,236,200,.9) 0%, transparent 70%),
  radial-gradient(90% 40% at 50% 100%, rgba(120,200,220,.5) 0%, transparent 70%),
  linear-gradient(180deg,#dfe8f7 0%,#cfe0f2 40%,#b9d7ea 72%,#a6cbe0 84%,#93bdd6 100%)}
.tsm .tsmRitualLayer[data-rid="41"] .uhWarm{position:absolute;inset:0;opacity:0;transition:opacity 1.6s ease;pointer-events:none;
  background:radial-gradient(70% 40% at 50% 46%, rgba(255,206,150,.42) 0%, rgba(255,170,120,.14) 45%, transparent 75%),linear-gradient(180deg,transparent 60%,rgba(255,180,120,.2) 100%)}
.tsm .tsmRitualLayer[data-rid="41"] .uhRoot.free .uhWarm{opacity:1}
.tsm .tsmRitualLayer[data-rid="41"] .uhBeam{position:absolute;left:-4%;right:-4%;top:-6px;height:16px;border-radius:0 0 8px 8px;pointer-events:none;
  background:linear-gradient(180deg,#3a2a20 0%,#5b4232 55%,#2a1c14 100%);box-shadow:0 6px 14px rgba(0,0,0,.35)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="41"] .uhBeam{background:linear-gradient(180deg,#8a6a52 0%,#a8856a 55%,#6e5240 100%);box-shadow:0 6px 14px rgba(60,40,30,.2)}
.tsm .tsmRitualLayer[data-rid="41"] .uhWater{position:absolute;left:0;right:0;bottom:0;height:16%;pointer-events:none;
  background:linear-gradient(180deg,rgba(120,200,230,.10),rgba(6,20,36,0) 80%)}
.tsm .tsmRitualLayer[data-rid="41"] .uhWater i{position:absolute;height:1.5px;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(200,235,255,.35),transparent);animation:uhLap 7s ease-in-out infinite}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="41"] .uhWater i{background:linear-gradient(90deg,transparent,rgba(255,255,255,.8),transparent)}
.tsm .tsmRitualLayer[data-rid="41"] .uhWater i:nth-child(1){left:12%;width:36%;top:22%}
.tsm .tsmRitualLayer[data-rid="41"] .uhWater i:nth-child(2){left:54%;width:30%;top:48%;animation-delay:-3s}
.tsm .tsmRitualLayer[data-rid="41"] .uhWater i:nth-child(3){left:28%;width:46%;top:74%;animation-delay:-5s}
@keyframes uhLap{0%,100%{transform:translateX(-6%) scaleX(.85)}50%{transform:translateX(6%) scaleX(1.05)}}
.tsm .tsmRitualLayer[data-rid="41"] .uhCap{position:absolute;left:0;right:0;top:44%;text-align:center;font-size:28px;font-weight:600;letter-spacing:.02em;color:#ffe7c4;opacity:0;transform:translateY(12px);transition:opacity 1s ease .7s, transform 1.2s ease .7s;pointer-events:none;text-shadow:0 2px 18px rgba(255,190,120,.45)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="41"] .uhCap{color:#5a3a1c;text-shadow:0 2px 14px rgba(255,255,255,.8)}
.tsm .tsmRitualLayer[data-rid="41"] .uhRoot.free .uhCap{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="41"] .uhSvg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="41"] .uhBub{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);will-change:transform}
.tsm .tsmRitualLayer[data-rid="41"] .uhBub .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="41"] .uhBub.gone{visibility:hidden}
/* long groups: a smaller portrait gives the full words four lines inside the bubble */
.tsm .tsmRitualLayer[data-rid="41"] .uhBub.long .orbPortrait{width:calc(var(--d)*.42);height:calc(var(--d)*.42);top:calc(var(--d)*.09)}
.tsm .tsmRitualLayer[data-rid="41"] .uhBub.long .orbText{top:calc(var(--d)*.54);left:12%;right:12%;max-height:calc(var(--d)*.36);-webkit-line-clamp:4;line-height:1.12}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="41"] .uhWater i{animation:none}}
`

/** Desktop `unhookThreeBubbles`: undo the 6-way padding of short text, then 3 contiguous groups. */
function uhThree(words: string[]): string[] {
    const w = words.map((s) => s || "")
    let base = w
    for (let p = 1; p < w.length; p++) {
        let ok = true
        for (let k = p; k < w.length; k++) if (w[k] !== w[k - p]) ok = false
        if (ok) {
            base = w.slice(0, p)
            break
        }
    }
    if (base.length <= 3) return [0, 1, 2].map((g) => base[g % base.length] || "")
    const n = base.length
    return [0, 1, 2].map((g) =>
        base
            .slice(Math.round((g * n) / 3), Math.round(((g + 1) * n) / 3))
            .filter(Boolean)
            .join(" ")
    )
}

/** Segment intersection → parameter along the first segment (the string), or -1. */
function uhCross(ax: number, ay: number, bx: number, by: number, cx0: number, cy0: number, dx0: number, dy0: number): number {
    const rx = bx - ax
    const ry = by - ay
    const sx = dx0 - cx0
    const sy = dy0 - cy0
    const den = rx * sy - ry * sx
    if (Math.abs(den) < 1e-6) return -1
    const t = ((cx0 - ax) * sy - (cy0 - ay) * sx) / den
    const u = ((cx0 - ax) * ry - (cy0 - ay) * rx) / den
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1
}

// hook art in view units (viewBox 0 0 100 130); the chain hangs from (50,0)
const UH_TIES = [
    { x: 13.7, y: 114.3 },
    { x: 30, y: 121 },
    { x: 46.3, y: 114.3 },
]

function RitualUnhook({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 3
    const texts = React.useMemo(() => uhThree(ctx.words), [])
    const [freed, setFreed] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [gone, setGone] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [free, setFree] = React.useState(false)
    const timers = useTimers()
    const rootRef = React.useRef<HTMLDivElement>(null)
    const hookRef = React.useRef<SVGGElement>(null)
    const upRefs = React.useRef<(SVGPathElement | null)[]>([])
    const loRefs = React.useRef<(SVGPathElement | null)[]>([])
    const ringRefs = React.useRef<(SVGCircleElement | null)[]>([])
    const bubRefs = React.useRef<(HTMLDivElement | null)[]>([])

    // ---------- layout ----------
    const s = clamp(Math.min(w * 0.42, h * 0.24), 112, 176) / 100
    const px = w / 2 + 20 * s // pivot: the bend sits at the centre of the screen
    const py = 6
    const tieY = py + 121 * s
    const d = Math.round(clamp(Math.min(w * 0.31, h * 0.19), 96, 134))
    const yMax = h - 84 - d / 2 - 8
    const midY = Math.min(yMax, tieY + 0.62 * (h - tieY))
    const sideY = midY - 0.6 * d
    const spread = Math.min(w * 0.3, d * 1.1)
    const pos = [
        { x: w / 2 - spread, y: sideY },
        { x: w / 2, y: midY },
        { x: w / 2 + spread, y: sideY },
    ]

    // ---------- live physics (refs only; one rAF loop mutates the few nodes) ----------
    const sim = React.useRef({
        a: 0, // hook angle (deg)
        v: 0,
        lift: 0, // finale hoist (px)
        liftT: -1,
        snapT: [-1, -1, -1] as number[],
        snapU: [0.5, 0.5, 0.5] as number[],
        pluckT: [-1, -1, -1] as number[],
        burst: [false, false, false] as boolean[],
        t: 0,
        cur: [] as { tx: number; ty: number; rx: number; ry: number }[],
    }).current
    const freedRef = useLatest(freed)

    const tiePoint = (i: number) => {
        const r = (sim.a * Math.PI) / 180
        const vx = (UH_TIES[i].x - 50) * s
        const vy = UH_TIES[i].y * s
        return { x: px + vx * Math.cos(r) - vy * Math.sin(r), y: py - sim.lift + vx * Math.sin(r) + vy * Math.cos(r) }
    }

    useFrame((dt, t) => {
        sim.t = t
        const ms = t * 1000
        // hook: damped spring + a slow idle sway
        const k = 34
        const c = 3.4
        sim.v += (-k * sim.a - c * sim.v) * dt
        sim.a += sim.v * dt
        if (sim.liftT >= 0) {
            const q = clamp01((ms - sim.liftT) / 900)
            sim.lift = (tieY + 130) * q * q * (2.7 * q - 1.7) // a small dip, then hoisted away
        }
        const sway = ctx.reduced ? 0 : 1.4 * Math.sin(t * 0.92)
        const ang = sim.a + sway
        if (hookRef.current) hookRef.current.setAttribute("transform", `translate(0 ${(-sim.lift).toFixed(1)}) rotate(${ang.toFixed(2)} ${px.toFixed(1)} ${py})`)
        const r = (ang * Math.PI) / 180
        sim.cur = []
        for (let i = 0; i < N; i++) {
            const vx = (UH_TIES[i].x - 50) * s
            const vy = UH_TIES[i].y * s
            const tx = px + vx * Math.cos(r) - vy * Math.sin(r)
            const ty = py - sim.lift + vx * Math.sin(r) + vy * Math.cos(r)
            const p = pos[i]
            // bubble: gentle bob, pluck squash, or the free float
            let bx = 0
            let by = ctx.reduced ? 0 : Math.sin(t * (2.6 - i * 0.3) + i) * 4
            let sc = 1
            let sy = 1
            let op = 1
            const st = sim.snapT[i]
            const pt = sim.pluckT[i]
            if (pt >= 0 && st < 0) {
                const e = (ms - pt) / 1000
                if (e < 0.6) {
                    const wob = Math.exp(-e * 7) * Math.sin(e * 34)
                    sc = 1 + wob * 0.06
                    sy = 1 - wob * 0.08
                    by += wob * 6
                }
            }
            if (st >= 0) {
                const dur = ctx.reduced ? 700 : 1500
                const q = clamp01((ms - st) / dur)
                const sm = q * q * (3 - 2 * q)
                // side bubbles rise to the top corners; the middle one rises into the open space under the hook
                const rise = ctx.reduced ? 40 * sm : (i === 1 ? p.y - tieY - d * 0.75 : p.y - d * 0.35) * sm
                by -= rise
                bx = ctx.reduced ? 0 : (i === 0 ? -1 : 1) * 16 * Math.sin(Math.PI * q)
                sc = ctx.reduced ? 1 : 1 + 0.08 * sm
                op = ctx.reduced ? 1 - q : q > 0.62 ? Math.max(0, 1 - (q - 0.62) / 0.2) : 1
                if (!sim.burst[i] && q >= 0.6) {
                    sim.burst[i] = true
                    releaseLetters(i, p.x + bx, p.y + by)
                }
            }
            const el = bubRefs.current[i]
            if (el) {
                el.style.transform = `translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0) scale(${sc.toFixed(3)},${(sc * sy).toFixed(3)})`
                el.style.opacity = String(op)
            }
            const rx = p.x + bx
            const ry = p.y + by - (d / 2) * sc * sy - 3
            const ring = ringRefs.current[i]
            if (ring) {
                ring.setAttribute("cx", rx.toFixed(1))
                ring.setAttribute("cy", ry.toFixed(1))
                ring.style.opacity = String(op)
            }
            sim.cur[i] = { tx, ty, rx, ry }
            const up = upRefs.current[i]
            const lo = loRefs.current[i]
            if (st < 0) {
                // intact: a slightly sagging string; a pluck makes it shiver
                let wob = 0
                if (pt >= 0) {
                    const e = (ms - pt) / 1000
                    wob = e < 0.8 ? Math.exp(-e * 6) * Math.sin(e * 46) * 9 : 0
                }
                const mx = (tx + rx) / 2 + wob + (ctx.reduced ? 0 : Math.sin(t * 1.3 + i) * 1.5)
                const my = (ty + ry) / 2 + 6
                if (up) up.setAttribute("d", `M${tx.toFixed(1)} ${ty.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${rx.toFixed(1)} ${ry.toFixed(1)}`)
                if (lo) lo.setAttribute("d", "")
            } else {
                // snapped where the finger crossed: the top half whips back to the hook, the tail swings below the bubble
                const e = ms - st
                const u = sim.snapU[i]
                const L = Math.hypot(rx - tx, ry - ty) || 1
                const k1 = easeOutCubic(clamp01(e / 520))
                const upLen = Math.max(9, L * u * (1 - 0.82 * k1))
                const ux = (rx - tx) / L
                const uy = (ry - ty) / L
                const dirx = ux * (1 - k1)
                const diry = uy * (1 - k1) + k1
                const dn = Math.hypot(dirx, diry) || 1
                const lat = ctx.reduced ? 0 : 18 * Math.exp(-e / 190) * Math.sin(e / 36)
                const ex = tx + (dirx / dn) * upLen + (-diry / dn) * lat
                const ey = ty + (diry / dn) * upLen + (dirx / dn) * lat
                const cxp = (tx + ex) / 2 + (-diry / dn) * lat * 0.8
                const cyp = (ty + ey) / 2 + (dirx / dn) * lat * 0.8
                if (up) up.setAttribute("d", `M${tx.toFixed(1)} ${ty.toFixed(1)} Q${cxp.toFixed(1)} ${cyp.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`)
                const tail = Math.min(L * (1 - u), d * 0.8) * (1 - 0.25 * clamp01(e / 700))
                const tw = ctx.reduced ? 0 : 7 * Math.exp(-e / 260) * Math.sin(e / 44) + (i === 0 ? 6 : -6) * Math.sin(Math.min(1, e / 700) * Math.PI)
                if (lo) {
                    lo.setAttribute("d", `M${rx.toFixed(1)} ${ry.toFixed(1)} Q${(rx + tw).toFixed(1)} ${(ry + tail * 0.5).toFixed(1)} ${(rx + tw * 1.8).toFixed(1)} ${(ry + tail).toFixed(1)}`)
                    lo.style.opacity = String(op)
                }
            }
        }
    })

    const releaseLetters = (i: number, x: number, y: number) => {
        const letters = Array.from((texts[i] || "").replace(/\s+/g, "")).slice(0, 22)
        const hue = ctx.hue(i)
        ctx.fx.burst(x, y, { count: 1, shape: "ring", size: [d * 0.4, d * 0.4], grow: d * 1.4, life: [0.6, 0.6], speed: [0, 0], colors: [`hsla(${hue},100%,85%,.8)`], add: true })
        ctx.fx.burst(x, y, { count: 12, shape: "glow", size: [4, 9], speed: [30, 120], life: [0.8, 1.4], drag: 0.95, gravity: -40, colors: ["rgba(255,236,200,1)", `hsla(${hue},100%,80%,1)`] })
        if (letters.length)
            ctx.fx.burst(x, y + d * 0.15, { count: letters.length, shape: "text", text: letters, size: [13, 17], speed: [30, 90], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [1.3, 1.9], gravity: -50, drag: 0.98, spin: 2, colors: [ctx.theme === "bright" ? "rgba(30,40,80,1)" : "rgba(255,250,240,1)"], add: false })
        ctx.sfx("soft")
        timers.after(320, () => setGone((g) => g.map((v, j) => (j === i ? true : v))))
    }

    const snap = (i: number, u: number, fx0: number, fy0: number) => {
        if (sim.snapT[i] >= 0 || doneRef.current) return
        sim.snapT[i] = sim.t * 1000
        sim.snapU[i] = clamp(u, 0.15, 0.85)
        const n = sim.snapT.filter((v) => v >= 0).length
        const last = n === N
        // hook recoils away from the snapped side
        const dir = i === 0 ? -1 : i === 2 ? 1 : sim.snapT[2] < 0 ? -1 : 1
        sim.v += dir * (ctx.reduced ? 30 : 150) * (last ? 1.6 : 1)
        ctx.sfx("clack")
        timers.after(40, () => ctx.sfx("string"))
        ctx.haptic(last ? [14, 30, 22] : [10, 24, 8])
        // whip-crack at the break point
        ctx.fx.burst(fx0, fy0, { count: 1, shape: "ring", size: [6, 6], grow: 120, life: [0.32, 0.32], speed: [0, 0], colors: ["rgba(255,244,220,.95)"], add: true })
        ctx.fx.burst(fx0, fy0, { count: 10, shape: "spark", size: [1.5, 2.6], speed: [180, 420], life: [0.22, 0.38], drag: 0.9, colors: ["rgba(255,236,190,1)", "rgba(255,255,255,1)"] })
        ctx.fx.burst(fx0, fy0, { count: 6, shape: "shard", size: [2, 4], speed: [80, 200], life: [0.3, 0.5], gravity: 400, colors: ["rgba(230,210,170,1)"], add: false })
        setFreed((f) => f.map((v, j) => (j === i ? true : v)))
        ctx.progress(n / N)
        if (last) finale()
        else ctx.hint(n === N - 1 ? "Last string — swipe across it" : "Swipe across another string")
    }

    // ---------- the swipe ----------
    const doneRef = React.useRef(false)
    const prev = React.useRef<{ x: number; y: number } | null>(null)
    const bind = useDrag({
        relativeTo: rootRef,
        tapSlop: 8,
        onStart: (e) => {
            if (doneRef.current) return false
            prev.current = { x: e.x, y: e.y }
            ctx.haptic(6)
            ctx.fx.add({ x: e.x, y: e.y, size: 10, grow: 30, max: 0.35, shape: "ring", color: "rgba(255,240,215,.7)" })
        },
        onMove: (e) => {
            const p0 = prev.current
            if (!p0) return
            ctx.fx.add({ x: e.x, y: e.y, size: 5, max: 0.35, shape: "glow", color: "rgba(255,236,200,1)", alpha: 0.7 })
            for (let i = 0; i < N; i++) {
                if (sim.snapT[i] >= 0 || !sim.cur[i]) continue
                const c = sim.cur[i]
                let u = uhCross(c.tx, c.ty, c.rx, c.ry, p0.x, p0.y, e.x, e.y)
                if (u < 0) {
                    // a fingertip is wide: brushing right over the string with a sideways stroke counts too
                    const sx = c.rx - c.tx
                    const sy = c.ry - c.ty
                    const L2 = sx * sx + sy * sy || 1
                    const q = clamp01(((e.x - c.tx) * sx + (e.y - c.ty) * sy) / L2)
                    const side = Math.abs((e.x - p0.x) * sy - (e.y - p0.y) * sx) / Math.sqrt(L2)
                    if (dist(e.x, e.y, c.tx + sx * q, c.ty + sy * q) < 9 && side > 3) u = q
                }
                if (u >= 0.12) {
                    snap(i, u, c.tx + (c.rx - c.tx) * u, c.ty + (c.ry - c.ty) * u)
                    break
                }
            }
            prev.current = { x: e.x, y: e.y }
        },
        onTap: (e) => {
            // a tap on a bubble only plucks its string: the cue is to swipe across it
            for (let i = 0; i < N; i++) {
                if (sim.snapT[i] >= 0) continue
                const c = sim.cur[i]
                if (c && dist(e.x, e.y, c.rx, c.ry + d / 2) < d * 0.6) {
                    sim.pluckT[i] = sim.t * 1000
                    ctx.sfx("string")
                    ctx.haptic(8)
                    ctx.hint("Swipe across its string to snap it")
                    return
                }
            }
            ctx.sfx("tap")
        },
        onEnd: () => {
            prev.current = null
        },
    })

    const finale = () => {
        doneRef.current = true
        ctx.hint("")
        // the empty hook is hoisted away; warm light opens the harbour
        timers.after(ctx.reduced ? 400 : 750, () => {
            sim.liftT = sim.t * 1000
            setFree(true)
            ctx.sfx("clack")
            ctx.haptic(18)
        })
        timers.after(ctx.reduced ? 700 : 1300, () => {
            ctx.sfx("chime")
            for (let k = 0; k < 3; k++) timers.after(k * 260, () => ctx.fx.add({ x: w / 2, y: h * 0.92, size: 16, grow: w * 0.6, max: 1.3, shape: "ring", color: "rgba(255,220,170,.35)" }))
            for (let k = 0; k < 14; k++)
                timers.after(k * 60, () => ctx.fx.add({ x: w * (0.15 + Math.random() * 0.7), y: h * (0.55 + Math.random() * 0.3), vy: -60 - Math.random() * 60, size: 3 + Math.random() * 4, max: 1.4, shape: "glow", color: "rgba(255,226,180,1)" }))
        })
        timers.after(ctx.reduced ? 1500 : 2350, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(280)
        })
    }

    React.useEffect(() => {
        ctx.hint("Swipe across a string to snap it")
    }, [])

    const strCol = ctx.theme === "bright" ? "rgba(90,70,50,.9)" : "rgba(244,230,204,.92)"
    return (
        <div ref={rootRef} className={cx("uhRoot", free && "free")} style={{ position: "absolute", inset: 0 }} {...bind}>
            <div className="uhSky" />
            <div className="uhWarm" />
            <div className="uhWater">
                <i />
                <i />
                <i />
            </div>
            <div className="uhCap" aria-live="polite">{free ? "Unhooked." : ""}</div>
            <svg className="uhSvg" width={w} height={h} aria-hidden="true">
                <defs>
                    <linearGradient id="uhSteel" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#5c6577" />
                        <stop offset=".35" stopColor="#e9eef7" />
                        <stop offset=".6" stopColor="#9aa4b6" />
                        <stop offset="1" stopColor="#3d4454" />
                    </linearGradient>
                </defs>
                <g ref={hookRef}>
                    <g transform={`translate(${px - 50 * s} ${py}) scale(${s})`}>
                        <line x1="50" y1="-12" x2="50" y2="14" stroke="#7d8698" strokeWidth="3" />
                        <ellipse cx="50" cy="12" rx="4.2" ry="7.5" fill="none" stroke="url(#uhSteel)" strokeWidth="2.6" />
                        <circle cx="50" cy="26" r="7" fill="none" stroke="url(#uhSteel)" strokeWidth="4" />
                        <path d="M50 33 L50 98 A20 20 0 0 1 10 98 L10 82 L18 92" fill="none" stroke="#1a2030" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity=".45" transform="translate(1.5 2)" />
                        <path d="M50 33 L50 98 A20 20 0 0 1 10 98 L10 82 L18 92" fill="none" stroke="url(#uhSteel)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M48 40 L48 96" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" strokeLinecap="round" />
                        {UH_TIES.map((t, i) => (
                            <circle key={i} cx={t.x} cy={t.y - 3.5} r="3.2" fill="#c9a46a" stroke="#7a5a32" strokeWidth=".8" />
                        ))}
                    </g>
                </g>
                {[0, 1, 2].map((i) => (
                    <g key={i}>
                        <path ref={(el) => (upRefs.current[i] = el)} fill="none" stroke={strCol} strokeWidth="2.2" strokeLinecap="round" />
                        <path ref={(el) => (loRefs.current[i] = el)} fill="none" stroke={strCol} strokeWidth="2.2" strokeLinecap="round" />
                        <circle ref={(el) => (ringRefs.current[i] = el)} r="4.6" fill="none" stroke="#d9b277" strokeWidth="2.4" />
                    </g>
                ))}
            </svg>
            {pos.map((p, i) => (
                <div
                    key={i}
                    ref={(el) => (bubRefs.current[i] = el)}
                    className={cx("uhBub", gone[i] && "gone", (texts[i] || "").length > 17 && "long")}
                    style={{ left: p.x, top: p.y, ["--d" as any]: `${d}px` }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Snap the string holding: ${texts[i] || "your picture"}`}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            const c = sim.cur[i]
                            if (c) snap(i, 0.45, c.tx + (c.rx - c.tx) * 0.45, c.ty + (c.ry - c.ty) * 0.45)
                        }
                    }}
                >
                    <Orb
                        src={ctx.pic(i, freed[i])}
                        text={texts[i]}
                        d={d}
                        hue={ctx.hue(i)}
                        hue2={44}
                        mood={freed[i] ? "happy" : "nervous"}
                        aura={freed[i] ? 0.9 : 0}
                        uploaded={ctx.uploaded}
                        textPx={(texts[i] || "").length > 17 ? fitThoughtPx(texts[i] || "", d * 0.72, d * 0.3, 14, 10, 1.12) : orbTextPx(texts[i] || "", d)}
                    />
                </div>
            ))}
        </div>
    )
}

tsmRitual({ id: 41, hint: "Swipe across a string to snap it", css: UH_CSS, Comp: RitualUnhook })
