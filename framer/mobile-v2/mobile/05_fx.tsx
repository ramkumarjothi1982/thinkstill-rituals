/* ================================================================== */
/* FX — one pooled particle canvas per world                           */
/* ================================================================== */
// Every ritual owns a single <FxCanvas>. Particles are pooled, drawn with pre-rendered glow
// sprites (additive) or simple shapes, DPR is capped at 2 and the loop sleeps when idle.

type FxShape = "glow" | "dot" | "streak" | "shard" | "petal" | "ring" | "drop" | "smoke" | "flake" | "spark" | "paper" | "text"

interface FxParticle {
    x: number
    y: number
    vx: number
    vy: number
    ax: number
    ay: number
    drag: number
    life: number
    max: number
    size: number
    grow: number
    rot: number
    vr: number
    color: string
    color2?: string
    shape: FxShape
    alpha: number
    add: boolean
    w?: number
    h?: number
    text?: string
    swirl?: { cx: number; cy: number; k: number; pull: number }
}

interface FxBurstOpts {
    count?: number
    speed?: [number, number]
    angle?: [number, number]
    life?: [number, number]
    size?: [number, number]
    gravity?: number
    drag?: number
    colors?: string[]
    shape?: FxShape
    add?: boolean
    grow?: number
    spread?: number
    spin?: number
    alpha?: number
    vx?: number
    vy?: number
    text?: string[]
    w?: [number, number]
    h?: [number, number]
    swirl?: { cx: number; cy: number; k: number; pull: number }
}

interface FxApi {
    burst: (x: number, y: number, o?: FxBurstOpts) => void
    add: (p: Partial<FxParticle> & { x: number; y: number }) => void
    clear: () => void
    count: () => number
    size: () => { w: number; h: number }
}

const FX_NOOP: FxApi = { burst: () => {}, add: () => {}, clear: () => {}, count: () => 0, size: () => ({ w: 0, h: 0 }) }

const spriteCache: Record<string, HTMLCanvasElement> = {}
function glowSprite(color: string): HTMLCanvasElement | null {
    if (!hasWindow) return null
    const key = color
    if (spriteCache[key]) return spriteCache[key]
    const c = document.createElement("canvas")
    c.width = c.height = 64
    const g = c.getContext("2d")
    if (!g) return null
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grd.addColorStop(0, "rgba(255,255,255,1)")
    grd.addColorStop(0.18, color)
    grd.addColorStop(0.5, color.replace(/rgba?\(([^)]+)\)/, (m, inner) => {
        const parts = inner.split(",").map((s: string) => s.trim())
        return `rgba(${parts[0]},${parts[1]},${parts[2]},0.28)`
    }))
    grd.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = grd
    g.fillRect(0, 0, 64, 64)
    spriteCache[key] = c
    return c
}

function rr(r: [number, number] | undefined, d: number) {
    return r ? r[0] + Math.random() * (r[1] - r[0]) : d
}

const FxCanvas = React.forwardRef<FxApi, { className?: string; style?: React.CSSProperties; maxParticles?: number; reduced?: boolean }>(function FxCanvas(
    { className, style, maxParticles = 700, reduced = false },
    ref
) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const parts = React.useRef<FxParticle[]>([])
    const sizeRef = React.useRef({ w: 0, h: 0, dpr: 1 })
    const rafRef = React.useRef(0)
    const runningRef = React.useRef(false)
    const lastRef = React.useRef(0)
    const reducedRef = useLatest(reduced)

    const draw = React.useCallback((now: number) => {
        const cv = canvasRef.current
        if (!cv) {
            runningRef.current = false
            return
        }
        const g = cv.getContext("2d")
        if (!g) {
            runningRef.current = false
            return
        }
        const dt = Math.min(0.05, (now - (lastRef.current || now)) / 1000) || 0.016
        lastRef.current = now
        const { w, h, dpr } = sizeRef.current
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.clearRect(0, 0, w, h)
        const arr = parts.current
        let n = 0
        for (let i = 0; i < arr.length; i++) {
            const p = arr[i]
            p.life += dt
            if (p.life >= p.max) continue
            if (p.swirl) {
                const dx = p.x - p.swirl.cx
                const dy = p.y - p.swirl.cy
                const d = Math.max(8, Math.hypot(dx, dy))
                p.vx += (-dy / d) * p.swirl.k * dt * 60 - (dx / d) * p.swirl.pull * dt * 60
                p.vy += (dx / d) * p.swirl.k * dt * 60 - (dy / d) * p.swirl.pull * dt * 60
            }
            p.vx += p.ax * dt
            p.vy += p.ay * dt
            const dr = Math.pow(p.drag, dt * 60)
            p.vx *= dr
            p.vy *= dr
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.rot += p.vr * dt
            p.size = Math.max(0, p.size + p.grow * dt)
            arr[n++] = p
            const k = p.life / p.max
            const a = p.alpha * (k < 0.12 ? k / 0.12 : 1 - Math.pow((k - 0.12) / 0.88, 1.6))
            if (a <= 0.003 || p.size <= 0.05) continue
            g.globalAlpha = Math.min(1, a)
            g.globalCompositeOperation = p.add ? "lighter" : "source-over"
            const s = p.size
            switch (p.shape) {
                case "glow": {
                    const sp = glowSprite(p.color)
                    if (sp) g.drawImage(sp, p.x - s, p.y - s, s * 2, s * 2)
                    break
                }
                case "dot":
                    g.fillStyle = p.color
                    g.beginPath()
                    g.arc(p.x, p.y, s, 0, Math.PI * 2)
                    g.fill()
                    break
                case "spark":
                case "streak": {
                    const sp = Math.hypot(p.vx, p.vy) || 1
                    const len = Math.min(60, s * 2 + sp * (p.shape === "spark" ? 0.035 : 0.06))
                    g.strokeStyle = p.color
                    g.lineWidth = Math.max(0.6, s * 0.5)
                    g.lineCap = "round"
                    g.beginPath()
                    g.moveTo(p.x, p.y)
                    g.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len)
                    g.stroke()
                    break
                }
                case "shard": {
                    g.save()
                    g.translate(p.x, p.y)
                    g.rotate(p.rot)
                    g.fillStyle = p.color
                    g.beginPath()
                    g.moveTo(0, -s)
                    g.lineTo(s * 0.7, s * 0.4)
                    g.lineTo(-s * 0.5, s * 0.8)
                    g.closePath()
                    g.fill()
                    if (p.color2) {
                        g.strokeStyle = p.color2
                        g.lineWidth = 0.8
                        g.stroke()
                    }
                    g.restore()
                    break
                }
                case "petal": {
                    g.save()
                    g.translate(p.x, p.y)
                    g.rotate(p.rot)
                    g.fillStyle = p.color
                    g.beginPath()
                    g.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2)
                    g.fill()
                    g.restore()
                    break
                }
                case "ring":
                    g.strokeStyle = p.color
                    g.lineWidth = Math.max(0.8, 3 * (1 - k))
                    g.beginPath()
                    g.arc(p.x, p.y, s, 0, Math.PI * 2)
                    g.stroke()
                    break
                case "drop": {
                    const sp = Math.hypot(p.vx, p.vy) || 1
                    g.save()
                    g.translate(p.x, p.y)
                    g.rotate(Math.atan2(p.vy, p.vx) - Math.PI / 2)
                    g.fillStyle = p.color
                    g.beginPath()
                    const st = Math.min(3.2, 1 + sp / 500)
                    g.ellipse(0, 0, s * 0.5, s * st * 0.6, 0, 0, Math.PI * 2)
                    g.fill()
                    g.restore()
                    break
                }
                case "smoke": {
                    const grd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, s)
                    grd.addColorStop(0, p.color)
                    grd.addColorStop(1, "rgba(0,0,0,0)")
                    g.fillStyle = grd
                    g.beginPath()
                    g.arc(p.x, p.y, s, 0, Math.PI * 2)
                    g.fill()
                    break
                }
                case "flake": {
                    g.save()
                    g.translate(p.x, p.y)
                    g.rotate(p.rot)
                    g.strokeStyle = p.color
                    g.lineWidth = Math.max(0.7, s * 0.18)
                    g.beginPath()
                    for (let q = 0; q < 3; q++) {
                        const an = (q * Math.PI) / 3
                        g.moveTo(Math.cos(an) * s, Math.sin(an) * s)
                        g.lineTo(-Math.cos(an) * s, -Math.sin(an) * s)
                    }
                    g.stroke()
                    g.restore()
                    break
                }
                case "paper": {
                    g.save()
                    g.translate(p.x, p.y)
                    g.rotate(p.rot)
                    g.scale(1, Math.cos(p.rot * 1.7))
                    g.fillStyle = p.color
                    const pw = p.w || s
                    const ph = p.h || s * 2.4
                    g.fillRect(-pw / 2, -ph / 2, pw, ph)
                    if (p.color2) {
                        g.fillStyle = p.color2
                        g.fillRect(-pw / 2, -ph / 6, pw, ph / 10)
                    }
                    g.restore()
                    break
                }
                case "text": {
                    g.save()
                    g.translate(p.x, p.y)
                    g.rotate(p.rot)
                    g.fillStyle = p.color
                    g.font = `500 ${Math.round(s)}px ${FONT}`
                    g.textAlign = "center"
                    g.textBaseline = "middle"
                    g.fillText(p.text || "", 0, 0)
                    g.restore()
                    break
                }
            }
        }
        arr.length = n
        g.globalAlpha = 1
        g.globalCompositeOperation = "source-over"
        if (n > 0) rafRef.current = requestAnimationFrame(draw)
        else {
            runningRef.current = false
            g.clearRect(0, 0, w, h)
        }
    }, [])

    const wake = React.useCallback(() => {
        if (runningRef.current || !hasWindow) return
        runningRef.current = true
        lastRef.current = performance.now()
        rafRef.current = requestAnimationFrame(draw)
    }, [draw])

    React.useLayoutEffect(() => {
        const cv = canvasRef.current
        if (!cv) return
        const fit = () => {
            const r = cv.getBoundingClientRect()
            const dpr = Math.min(2, (hasWindow && window.devicePixelRatio) || 1)
            sizeRef.current = { w: r.width, h: r.height, dpr }
            cv.width = Math.max(1, Math.round(r.width * dpr))
            cv.height = Math.max(1, Math.round(r.height * dpr))
        }
        fit()
        let ro: ResizeObserver | null = null
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(fit)
            ro.observe(cv)
        }
        return () => {
            ro && ro.disconnect()
            cancelAnimationFrame(rafRef.current)
            runningRef.current = false
        }
    }, [])

    const api = React.useMemo<FxApi>(
        () => ({
            burst(x, y, o = {}) {
                const scale = reducedRef.current ? 0.35 : 1
                const count = Math.max(1, Math.round((o.count ?? 24) * scale))
                const arr = parts.current
                for (let i = 0; i < count; i++) {
                    if (arr.length >= maxParticles) arr.shift()
                    const a0 = o.angle ? o.angle[0] : 0
                    const a1 = o.angle ? o.angle[1] : Math.PI * 2
                    const ang = a0 + Math.random() * (a1 - a0)
                    const sp = rr(o.speed, 200) * (reducedRef.current ? 0.6 : 1)
                    const colors = o.colors || ["rgba(255,220,170,1)"]
                    const spread = o.spread || 0
                    arr.push({
                        x: x + (Math.random() - 0.5) * spread,
                        y: y + (Math.random() - 0.5) * spread,
                        vx: Math.cos(ang) * sp + (o.vx || 0),
                        vy: Math.sin(ang) * sp + (o.vy || 0),
                        ax: 0,
                        ay: o.gravity ?? 0,
                        drag: o.drag ?? 0.97,
                        life: 0,
                        max: rr(o.life, 0.9),
                        size: rr(o.size, 4),
                        grow: o.grow ?? 0,
                        rot: Math.random() * Math.PI * 2,
                        vr: (Math.random() - 0.5) * (o.spin ?? 6),
                        color: colors[i % colors.length],
                        shape: o.shape || "glow",
                        alpha: o.alpha ?? 1,
                        add: o.add ?? true,
                        w: o.w ? rr(o.w, 6) : undefined,
                        h: o.h ? rr(o.h, 14) : undefined,
                        text: o.text ? o.text[i % o.text.length] : undefined,
                        swirl: o.swirl,
                    })
                }
                wake()
            },
            add(p) {
                const arr = parts.current
                if (arr.length >= maxParticles) arr.shift()
                arr.push({
                    vx: 0,
                    vy: 0,
                    ax: 0,
                    ay: 0,
                    drag: 1,
                    life: 0,
                    max: 1,
                    size: 4,
                    grow: 0,
                    rot: 0,
                    vr: 0,
                    color: "rgba(255,255,255,1)",
                    shape: "glow",
                    alpha: 1,
                    add: true,
                    ...p,
                } as FxParticle)
                wake()
            },
            clear() {
                parts.current.length = 0
            },
            count() {
                return parts.current.length
            },
            size() {
                return { w: sizeRef.current.w, h: sizeRef.current.h }
            },
        }),
        [wake, maxParticles]
    )
    React.useImperativeHandle(ref, () => api, [api])

    return <canvas ref={canvasRef} className={className} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", ...style }} aria-hidden="true" />
})

/** Convenience: a ref + safe accessor for an FxCanvas. */
function useFx() {
    const ref = React.useRef<FxApi>(null)
    const api = React.useMemo<FxApi>(
        () => ({
            burst: (x, y, o) => ref.current && ref.current.burst(x, y, o),
            add: (p) => ref.current && ref.current.add(p),
            clear: () => ref.current && ref.current.clear(),
            count: () => (ref.current ? ref.current.count() : 0),
            size: () => (ref.current ? ref.current.size() : { w: 0, h: 0 }),
        }),
        []
    )
    return { ref, fx: api }
}
