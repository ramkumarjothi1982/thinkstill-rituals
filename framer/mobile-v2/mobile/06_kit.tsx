/* ================================================================== */
/* Ritual kit — gestures, character orbs, thought materials            */
/* ================================================================== */

/* ---------- gestures ---------- */

interface DragInfo {
    x: number // local to `relativeTo` (or the element)
    y: number
    dx: number // from start
    dy: number
    vx: number // px/s (recent)
    vy: number
    ms: number // since start
    startX: number
    startY: number
    clientX: number
    clientY: number
    pointerId: number
    target: HTMLElement
}

interface DragOpts {
    onStart?: (i: DragInfo) => void | false
    onMove?: (i: DragInfo) => void
    onEnd?: (i: DragInfo, cancelled: boolean) => void
    onTap?: (i: DragInfo) => void
    relativeTo?: React.RefObject<HTMLElement>
    tapSlop?: number
    tapMs?: number
    disabled?: boolean
}

/**
 * Pointer-capture drag with velocity. Spread the returned props on the element the finger grabs.
 * Works for mouse, pen and touch; the element should have touch-action:none (the stage does).
 */
function useDrag(opts: DragOpts) {
    const o = useLatest(opts)
    const st = React.useRef<{ id: number; sx: number; sy: number; t0: number; samples: { x: number; y: number; t: number }[]; el: HTMLElement; moved: boolean } | null>(null)
    const info = (e: React.PointerEvent | PointerEvent, s: NonNullable<typeof st.current>): DragInfo => {
        const rel = o.current.relativeTo && o.current.relativeTo.current ? o.current.relativeTo.current : s.el
        const p = localPoint(e, rel)
        const now = performance.now()
        const sm = s.samples
        let vx = 0
        let vy = 0
        if (sm.length >= 2) {
            const a = sm[0]
            const b = sm[sm.length - 1]
            const dt = Math.max(1, b.t - a.t) / 1000
            vx = (b.x - a.x) / dt
            vy = (b.y - a.y) / dt
        }
        return { x: p.x, y: p.y, dx: e.clientX - s.sx, dy: e.clientY - s.sy, vx, vy, ms: now - s.t0, startX: s.sx, startY: s.sy, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, target: s.el }
    }
    const end = (e: React.PointerEvent, cancelled: boolean) => {
        const s = st.current
        if (!s || s.id !== e.pointerId) return
        const i = info(e, s)
        st.current = null
        try {
            s.el.releasePointerCapture(e.pointerId)
        } catch (err) {}
        const slop = o.current.tapSlop ?? 10
        if (!cancelled && !s.moved && i.ms < (o.current.tapMs ?? 450) && Math.hypot(i.dx, i.dy) < slop && o.current.onTap) o.current.onTap(i)
        o.current.onEnd && o.current.onEnd(i, cancelled)
    }
    return {
        onPointerDown: (e: React.PointerEvent) => {
            if (o.current.disabled || st.current) return
            if (e.pointerType === "mouse" && e.button !== 0) return
            const el = e.currentTarget as HTMLElement
            const s = { id: e.pointerId, sx: e.clientX, sy: e.clientY, t0: performance.now(), samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }], el, moved: false }
            st.current = s
            const r = o.current.onStart ? o.current.onStart(info(e, s)) : undefined
            if (r === false) {
                st.current = null
                return
            }
            try {
                el.setPointerCapture(e.pointerId)
            } catch (err) {}
            e.stopPropagation()
        },
        onPointerMove: (e: React.PointerEvent) => {
            const s = st.current
            if (!s || s.id !== e.pointerId) return
            const now = performance.now()
            s.samples.push({ x: e.clientX, y: e.clientY, t: now })
            while (s.samples.length > 2 && now - s.samples[0].t > 90) s.samples.shift()
            if (!s.moved && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > (o.current.tapSlop ?? 10)) s.moved = true
            o.current.onMove && o.current.onMove(info(e, s))
        },
        onPointerUp: (e: React.PointerEvent) => end(e, false),
        onPointerCancel: (e: React.PointerEvent) => end(e, true),
        onLostPointerCapture: (e: React.PointerEvent) => {
            if (st.current && st.current.id === e.pointerId) end(e, false)
        },
    }
}

/** Press-and-hold with a progress callback (touch friendly; no context menu). */
function useHold(opts: { ms: number; onStart?: () => void; onProgress?: (p: number) => void; onComplete?: () => void; onRelease?: (p: number) => void; disabled?: boolean }) {
    const o = useLatest(opts)
    const raf = React.useRef(0)
    const t0 = React.useRef(0)
    const done = React.useRef(false)
    const active = React.useRef(false)
    const stop = () => {
        cancelAnimationFrame(raf.current)
        active.current = false
    }
    React.useEffect(() => () => cancelAnimationFrame(raf.current), [])
    const tick = () => {
        if (!active.current) return
        const p = clamp01((performance.now() - t0.current) / o.current.ms)
        o.current.onProgress && o.current.onProgress(p)
        if (p >= 1 && !done.current) {
            done.current = true
            active.current = false
            o.current.onComplete && o.current.onComplete()
            return
        }
        raf.current = requestAnimationFrame(tick)
    }
    const drag = useDrag({
        disabled: opts.disabled,
        onStart: () => {
            if (o.current.disabled) return false
            done.current = false
            active.current = true
            t0.current = performance.now()
            o.current.onStart && o.current.onStart()
            raf.current = requestAnimationFrame(tick)
        },
        onEnd: () => {
            const was = active.current
            stop()
            if (was && !done.current) o.current.onRelease && o.current.onRelease(clamp01((performance.now() - t0.current) / o.current.ms))
        },
    })
    return { ...drag, onContextMenu: (e: React.MouseEvent) => e.preventDefault() }
}

/* ---------- character orbs ---------- */

type Mood = "nervous" | "tremble" | "droop" | "tilt" | "bounce" | "float" | "happy" | "none"

const MOOD_ANIM: Record<Mood, string> = {
    nervous: "tsmNervous .62s ease-in-out infinite",
    tremble: "tsmTremble 1.6s linear infinite",
    droop: "tsmDroop 4.2s ease-in-out infinite",
    tilt: "tsmTilt 3.4s ease-in-out infinite",
    bounce: "tsmBounce 1.5s cubic-bezier(.3,.7,.3,1) infinite",
    float: "tsmFloat 4.6s ease-in-out infinite",
    happy: "tsmHappy 2.4s ease-in-out infinite",
    none: "none",
}

const ORB_CSS = String.raw`
.tsm .orb{position:absolute;width:var(--d);height:var(--d);will-change:transform}
.tsm .orb .orbShadow{position:absolute;left:12%;right:12%;bottom:-9%;height:16%;border-radius:50%;
  background:radial-gradient(closest-side, rgba(0,0,0,.42), transparent);opacity:var(--shadowA,.8);pointer-events:none}
.tsm[data-theme=bright] .orb .orbShadow{background:radial-gradient(closest-side, rgba(60,40,120,.26), transparent)}
.tsm .orb .orbPerf{position:absolute;inset:0;transform-origin:50% 85%}
.tsm .orb .orbBody{position:absolute;inset:0;border-radius:50%;overflow:hidden;
  background:
    radial-gradient(120% 90% at 50% 112%, hsla(var(--h),70%,var(--lowL,16%),var(--lowA,.62)) 0%, transparent 62%),
    radial-gradient(circle at 50% 42%, hsla(var(--h),90%,62%,.10) 0%, hsla(var(--h),80%,40%,.26) 62%, hsla(var(--h),95%,72%,.55) 100%);
  box-shadow:inset 0 0 0 1.25px var(--orbRim), inset 0 calc(var(--d)*-.06) calc(var(--d)*.12) hsla(var(--h),95%,70%,.35), 0 calc(var(--d)*.07) calc(var(--d)*.22) hsla(var(--h),90%,35%,var(--glowA,.32));
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:box-shadow .6s ease}
.tsm[data-theme=bright] .orb .orbBody{--lowL:98%;--lowA:.80;box-shadow:inset 0 0 0 1.5px var(--orbRim), inset 0 calc(var(--d)*-.06) calc(var(--d)*.12) hsla(var(--h),95%,70%,.30), 0 calc(var(--d)*.07) calc(var(--d)*.2) hsla(var(--h),70%,40%,.22)}
.tsm .orb.lifted .orbBody{box-shadow:inset 0 0 0 1.5px var(--orbRim), inset 0 calc(var(--d)*-.06) calc(var(--d)*.12) hsla(var(--h),95%,70%,.45), 0 calc(var(--d)*.14) calc(var(--d)*.32) hsla(var(--h),90%,35%,.45)}
.tsm .orb .orbAura{position:absolute;inset:-22%;border-radius:50%;pointer-events:none;opacity:var(--aura,0);transition:opacity .8s ease;
  background:radial-gradient(circle, hsla(var(--h2,var(--h)),100%,72%,.55) 0%, hsla(var(--h2,var(--h)),100%,65%,.18) 45%, transparent 68%)}
.tsm .orb .orbPortrait{position:absolute;left:50%;border-radius:50%;overflow:hidden;transform:translateX(-50%);
  box-shadow:0 2px 10px rgba(0,0,0,.18), 0 0 0 1px rgba(255,255,255,.18)}
.tsm .orb .orbPortrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transform:scale(var(--imgZ,1.14));transform-origin:50% 48%}
.tsm .orb .orbPortrait img.up{object-position:50% 35%}
.tsm .orb .orbPortrait img.prev{animation:orbOut .42s ease forwards}
.tsm .orb .orbPortrait img.next{animation:orbIn .62s cubic-bezier(.3,1.6,.45,1) both}
.tsm .orb .orbFlash{position:absolute;inset:0;border-radius:50%;pointer-events:none;opacity:0;
  background:radial-gradient(circle, rgba(255,255,255,.9) 0%, rgba(255,240,210,.35) 35%, transparent 65%)}
.tsm .orb .orbFlash.go{animation:orbFlash .7s ease-out}
.tsm .orb .orbRingFx{position:absolute;inset:-4%;border-radius:50%;border:2px solid hsla(var(--h2,var(--h)),100%,80%,.9);opacity:0;pointer-events:none}
.tsm .orb .orbRingFx.go{animation:tsmRing .8s cubic-bezier(.2,.8,.2,1)}
.tsm .orb .orbText{position:absolute;left:13%;right:13%;text-align:center;color:var(--orbText);text-shadow:var(--orbTextShadow);
  font-weight:500;line-height:1.14;letter-spacing:-.005em;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;hyphens:auto}
.tsm .orb .orbSpec{position:absolute;left:14%;top:7%;width:46%;height:30%;border-radius:50%;pointer-events:none;
  background:radial-gradient(ellipse at 40% 40%, rgba(255,255,255,.62), rgba(255,255,255,.08) 55%, transparent 70%);transform:rotate(-24deg);mix-blend-mode:screen}
.tsm .orb .orbGlint{position:absolute;right:17%;top:17%;width:7%;height:7%;border-radius:50%;background:rgba(255,255,255,.9);filter:blur(.4px);pointer-events:none}
.tsm .orb .orbRim{position:absolute;inset:0;border-radius:50%;pointer-events:none;
  background:conic-gradient(from 200deg, transparent 0deg, hsla(var(--h2,var(--h)),100%,82%,.55) 50deg, transparent 110deg, transparent 250deg, rgba(255,255,255,.35) 300deg, transparent 340deg);
  -webkit-mask-image:radial-gradient(circle, transparent 64%, #000 70%);mask-image:radial-gradient(circle, transparent 64%, #000 70%)}
@keyframes orbOut{to{opacity:0;transform:scale(.7) rotate(-8deg)}}
@keyframes orbIn{0%{opacity:0;transform:scale(.55) rotate(6deg)}60%{opacity:1}100%{opacity:1;transform:scale(var(--imgZ,1.14))}}
@keyframes orbFlash{0%{opacity:0}18%{opacity:1}100%{opacity:0}}
`

const CHAR_HUE: Record<string, number> = { rush: 355, glitch: 268, drop: 212, loopie: 292, patch: 24, sync: 194, still: 205 }

interface OrbProps {
    src: string | null
    text?: string
    d: number
    hue?: number
    hue2?: number // glow hue after transformation
    mood?: Mood
    aura?: number // 0..1
    uploaded?: boolean
    textPx?: number
    lifted?: boolean
    className?: string
    style?: React.CSSProperties
    children?: React.ReactNode
    innerRef?: React.Ref<HTMLDivElement>
    shadow?: number
    onPointerDown?: (e: React.PointerEvent) => void
    bind?: Record<string, any>
    label?: string
}

/** Text size for a bubble: readable, never bold, shrinks gently with length. */
function orbTextPx(text: string, d: number, base?: number): number {
    const L = text.length
    const b = base || clamp(d * 0.105, 11.5, 16)
    const k = L <= 8 ? 1 : L <= 14 ? 0.94 : L <= 22 ? 0.86 : L <= 32 ? 0.78 : 0.72
    return Math.max(10.5, Math.round(b * k * 10) / 10)
}

function preloadImage(src: string | null | undefined): Promise<void> {
    return new Promise((res) => {
        if (!src || !hasWindow) return res()
        const im = new Image()
        let done = false
        const fin = () => {
            if (!done) {
                done = true
                res()
            }
        }
        im.onload = fin
        im.onerror = fin
        im.src = src
        setTimeout(fin, 700)
    })
}

/**
 * A ThinkStill emotional bubble character: glass sphere, portrait on top, the user's words below
 * inside the same bubble. Expression swaps play a little "pop" (old face out, new face springs in).
 */
const Orb = React.memo(function Orb(p: OrbProps) {
    const [faces, setFaces] = React.useState<{ cur: string | null; prev: string | null; n: number }>({ cur: p.src, prev: null, n: 0 })
    React.useEffect(() => {
        if (p.src === faces.cur) return
        let alive = true
        preloadImage(p.src).then(() => {
            if (!alive) return
            setFaces((f) => ({ cur: p.src, prev: f.cur, n: f.n + 1 }))
        })
        return () => {
            alive = false
        }
    }, [p.src])
    const hasText = !!(p.text && p.text.trim())
    const d = p.d
    const portrait = hasText ? d * 0.6 : d * 0.82
    const top = hasText ? d * 0.085 : d * 0.09
    const textTop = top + portrait + d * 0.035
    const px = hasText ? p.textPx || orbTextPx(p.text || "", d) : 0
    const lines = d >= 120 ? 3 : 2
    const hue = p.hue ?? 210
    const imgZ = p.uploaded ? 1 : 1.14
    return (
        <div
            ref={p.innerRef}
            className={cx("orb", p.lifted && "lifted", p.className)}
            style={{ ["--d" as any]: `${d}px`, ["--h" as any]: hue, ["--h2" as any]: p.hue2 ?? hue, ["--aura" as any]: p.aura ?? 0, ["--shadowA" as any]: p.shadow ?? 0.8, ...p.style }}
            onPointerDown={p.onPointerDown}
            {...(p.bind || {})}
            role={p.label ? "img" : undefined}
            aria-label={p.label}
        >
            <i className="orbShadow" />
            <div className="orbPerf" style={{ animation: MOOD_ANIM[p.mood || "none"] }}>
                <i className="orbAura" />
                <div className="orbBody">
                    <div className="orbPortrait" style={{ width: portrait, height: portrait, top, ["--imgZ" as any]: imgZ }}>
                        {faces.prev && faces.n > 0 ? <img key={`p${faces.n}`} className={cx("prev", p.uploaded && "up")} src={faces.prev} alt="" draggable={false} /> : null}
                        {faces.cur ? <img key={`c${faces.n}`} className={cx(faces.n > 0 && "next", p.uploaded && "up")} src={faces.cur} alt="" draggable={false} /> : null}
                    </div>
                    {hasText ? (
                        <div className="orbText" style={{ top: textTop, fontSize: px, WebkitLineClamp: lines as any, maxHeight: px * 1.14 * lines + 1 }}>
                            {p.text}
                        </div>
                    ) : null}
                    <i className="orbRim" />
                    <i className="orbSpec" />
                    <i className="orbGlint" />
                    <i key={`f${faces.n}`} className={cx("orbFlash", faces.n > 0 && "go")} />
                </div>
                <i key={`r${faces.n}`} className={cx("orbRingFx", faces.n > 0 && "go")} />
                {p.children}
            </div>
        </div>
    )
})

/* ---------- thought materials ---------- */

/** Fit a thought onto a surface: returns font size for the given box. */
function fitThoughtPx(text: string, w: number, h: number, max = 26, min = 13, lh = 1.22): number {
    const L = Math.max(1, text.length)
    for (let s = max; s >= min; s -= 0.5) {
        const perLine = Math.max(1, Math.floor(w / (s * 0.52)))
        const linesNeeded = Math.ceil(L / perLine)
        if (linesNeeded * s * lh <= h) return s
    }
    return min
}

/** Quote-trim a thought for display on an object. */
function thoughtLine(text: string, max = 120): string {
    const t = (text || "").replace(/\s+/g, " ").trim()
    if (t.length <= max) return t
    const cut = t.slice(0, max)
    const sp = cut.lastIndexOf(" ")
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut) + "…"
}
