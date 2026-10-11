/* ================================================================== */
/* Utilities                                                           */
/* ================================================================== */

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const clamp01 = (v: number) => clamp(v, 0, 1)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : clamp01((v - a) / (b - a)))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutBack = (t: number, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)
const easeOutElastic = (t: number) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1)
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay)

/** Deterministic noise in [0,1) for a seed + salt (stable layouts across re-renders). */
function noise(seed: number, salt = 0): number {
    const x = Math.sin(seed * 12.9898 + salt * 78.233 + 0.5) * 43758.5453
    return x - Math.floor(x)
}
function mulberry(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
function shuffled<T>(arr: T[], rnd: () => number = Math.random): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        const t = a[i]
        a[i] = a[j]
        a[j] = t
    }
    return a
}

const hasWindow = typeof window !== "undefined"

function lsGet(key: string): string | null {
    try {
        return hasWindow ? window.localStorage.getItem(key) : null
    } catch (e) {
        return null
    }
}
function lsSet(key: string, value: string) {
    try {
        if (hasWindow) window.localStorage.setItem(key, value)
    } catch (e) {}
}
function lsJson<T>(key: string, fallback: T): T {
    const raw = lsGet(key)
    if (raw == null) return fallback
    try {
        const v = JSON.parse(raw)
        return v == null ? fallback : (v as T)
    } catch (e) {
        return fallback
    }
}
function lsNum(key: string, fallback: number): number {
    const raw = lsGet(key)
    if (raw == null) return fallback
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
}
function lsSetJson(key: string, value: unknown) {
    try {
        lsSet(key, JSON.stringify(value))
    } catch (e) {}
}

/** Always-current ref to a value (for callbacks inside rAF loops / listeners). */
function useLatest<T>(value: T) {
    const r = React.useRef(value)
    r.current = value
    return r
}

/** Timers that are cleared automatically on unmount. */
function useTimers() {
    const ids = React.useRef<Set<any>>(new Set())
    React.useEffect(() => {
        const set = ids.current
        return () => {
            set.forEach((id) => {
                clearTimeout(id)
                clearInterval(id)
            })
            set.clear()
        }
    }, [])
    return React.useMemo(
        () => ({
            after(ms: number, fn: () => void) {
                const id = setTimeout(() => {
                    ids.current.delete(id)
                    fn()
                }, ms)
                ids.current.add(id)
                return id
            },
            every(ms: number, fn: () => void) {
                const id = setInterval(fn, ms)
                ids.current.add(id)
                return id
            },
            clear(id: any) {
                clearTimeout(id)
                clearInterval(id)
                ids.current.delete(id)
            },
            clearAll() {
                ids.current.forEach((id) => {
                    clearTimeout(id)
                    clearInterval(id)
                })
                ids.current.clear()
            },
        }),
        []
    )
}

/** requestAnimationFrame loop with dt (seconds, capped) — runs while `active`. */
function useFrame(cb: (dt: number, t: number) => void, active = true) {
    const cbRef = useLatest(cb)
    React.useEffect(() => {
        if (!active || !hasWindow) return
        let raf = 0
        let last = performance.now()
        const start = last
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            try {
                cbRef.current(dt, (now - start) / 1000)
            } catch (e) {
                // a frame error must never freeze the app
                if (typeof console !== "undefined") console.warn("[ThinkStill] frame", e)
            }
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf)
    }, [active])
}

/** Element size via ResizeObserver. */
function useSize<T extends HTMLElement>(): [React.RefObject<T>, { w: number; h: number }] {
    const ref = React.useRef<T>(null)
    const [size, setSize] = React.useState({ w: 0, h: 0 })
    React.useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const read = () => {
            const r = el.getBoundingClientRect()
            setSize((s) => (Math.abs(s.w - r.width) < 0.5 && Math.abs(s.h - r.height) < 0.5 ? s : { w: r.width, h: r.height }))
        }
        read()
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", read)
            return () => window.removeEventListener("resize", read)
        }
        const ro = new ResizeObserver(read)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return [ref, size]
}

function usePrefersReducedMotion(): boolean {
    const [r, setR] = React.useState(() => (hasWindow && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false))
    React.useEffect(() => {
        if (!hasWindow || !window.matchMedia) return
        const m = window.matchMedia("(prefers-reduced-motion: reduce)")
        const on = () => setR(m.matches)
        if (m.addEventListener) m.addEventListener("change", on)
        return () => {
            if (m.removeEventListener) m.removeEventListener("change", on)
        }
    }, [])
    return r
}

function usePrefersDark(): boolean {
    const [d, setD] = React.useState(() => (hasWindow && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : true))
    React.useEffect(() => {
        if (!hasWindow || !window.matchMedia) return
        const m = window.matchMedia("(prefers-color-scheme: dark)")
        const on = () => setD(m.matches)
        if (m.addEventListener) m.addEventListener("change", on)
        return () => {
            if (m.removeEventListener) m.removeEventListener("change", on)
        }
    }, [])
    return d
}

/** Local point of a pointer event inside an element. */
function localPoint(e: { clientX: number; clientY: number }, el: Element | null) {
    if (!el) return { x: e.clientX, y: e.clientY }
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
}

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ")
