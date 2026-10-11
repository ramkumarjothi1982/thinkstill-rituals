/* ================================================================== */
/* 6 · ZAP — a storm lab at night                                      */
/* ================================================================== */
// Desktop rules kept (F4 rebuild): 6 bubbles (one per word chunk), tool first (tap the zapper, or tap a bubble
// to pick it up and fire at it), every tap counts (busy → queue of up to 3, extra taps dropped), 2 hits per
// bubble, target = tapped bubble if it still needs hits, else a started one first, else the nearest open one;
// a jagged bolt from the live prong tip to the bubble's rim, with recoil, impact and shake; faces
// negative → shocked → softer → happy; progress = hits / 12; finish → bonus 340. Mobile: the zapper stands
// in the middle of a ring of bubbles as a turret and swings to aim; RUSH's lines speak through the hint; the second hit zaps the buzzing
// words out of the bubble as electric letters, leaving a calm face. Fixed: nothing under the strip, all faces
// preloaded, no counters or chips.

const ZAP_SHOCK: Record<string, number> = { glitch: 63, drop: 44, still: 41, patch: 70, loopie: 58, rush: 63, sync: 48 }
const ZAP_SHOCK_ALT: Record<string, number> = { glitch: 56, drop: 80, still: 63, patch: 73, loopie: 54, rush: 52, sync: 44 }
const ZAP_SOFT: Record<string, number> = { glitch: 10, drop: 52, still: 61, patch: 75, loopie: 63, rush: 20, sync: 70 }
const ZAP_MOOD: Record<string, Mood> = { rush: "tremble", glitch: "nervous", drop: "droop", loopie: "tilt", patch: "droop", sync: "nervous", still: "float" }
const ZAP_CHARGE_LINES = ["Charging… now!", "Full power!", "Hit it!"]

const ZAP_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="6"] .zpSky{position:absolute;inset:0;background:
  radial-gradient(70% 34% at 50% 100%, rgba(80,220,255,.22) 0%, transparent 70%),
  radial-gradient(90% 40% at 20% 0%, rgba(120,90,220,.35) 0%, transparent 60%),
  linear-gradient(180deg,#070a1c 0%,#101a3a 42%,#132a4a 70%,#0a1426 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="6"] .zpSky{background:
  radial-gradient(70% 34% at 50% 100%, rgba(80,200,255,.35) 0%, transparent 70%),
  radial-gradient(90% 40% at 20% 0%, rgba(190,170,255,.55) 0%, transparent 60%),
  linear-gradient(180deg,#c9d3f2 0%,#d9e4f7 45%,#cfe4f2 72%,#b7cde6 100%)}
.tsm .tsmRitualLayer[data-rid="6"] .zpClouds{position:absolute;left:-10%;right:-10%;top:-4%;height:34%;opacity:.55;pointer-events:none;
  background:radial-gradient(30% 60% at 18% 40%, rgba(120,130,190,.5), transparent 70%),radial-gradient(34% 70% at 58% 30%, rgba(100,110,170,.45), transparent 70%),radial-gradient(28% 60% at 88% 46%, rgba(120,120,180,.45), transparent 70%);
  animation:zpFlicker 7s linear infinite}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="6"] .zpClouds{background:radial-gradient(30% 60% at 18% 40%, rgba(255,255,255,.7), transparent 70%),radial-gradient(34% 70% at 58% 30%, rgba(240,240,255,.7), transparent 70%),radial-gradient(28% 60% at 88% 46%, rgba(255,255,255,.65), transparent 70%)}
@keyframes zpFlicker{0%,61%,66%,100%{opacity:.5}62%{opacity:1}63%{opacity:.6}64.5%{opacity:.95}}
.tsm .tsmRitualLayer[data-rid="6"] .zpFloor{position:absolute;left:0;right:0;bottom:0;height:30%;pointer-events:none;opacity:.5;
  background:repeating-linear-gradient(90deg, rgba(90,200,255,.14) 0 1px, transparent 1px 44px),repeating-linear-gradient(180deg, rgba(90,200,255,.12) 0 1px, transparent 1px 30px);
  -webkit-mask-image:linear-gradient(180deg,transparent,#000 70%);mask-image:linear-gradient(180deg,transparent,#000 70%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="6"] .zpFloor{background:repeating-linear-gradient(90deg, rgba(40,90,160,.16) 0 1px, transparent 1px 44px),repeating-linear-gradient(180deg, rgba(40,90,160,.14) 0 1px, transparent 1px 30px)}
.tsm .tsmRitualLayer[data-rid="6"] .zpFlash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(80% 60% at 50% 50%, rgba(190,240,255,.35), rgba(140,200,255,.08) 70%)}
.tsm .tsmRitualLayer[data-rid="6"] .zpSlot{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);touch-action:none;cursor:pointer;animation:zpBob var(--bob,2.6s) ease-in-out infinite;animation-delay:var(--bd,0s)}
@keyframes zpBob{0%,100%{transform:translate3d(0,-3px,0)}50%{transform:translate3d(0,3px,0)}}
.tsm .tsmRitualLayer[data-rid="6"] .zpSlot.rel{animation:zpFloat 3.2s ease-in-out infinite}
@keyframes zpFloat{0%,100%{transform:translate3d(0,-2px,0)}50%{transform:translate3d(0,-8px,0)}}
.tsm .tsmRitualLayer[data-rid="6"] .zpSlot.joy{animation:zpJoy .9s cubic-bezier(.3,.7,.3,1) 2;animation-delay:var(--jd,0s)}
@keyframes zpJoy{0%,100%{transform:translate3d(0,0,0)}30%{transform:translate3d(0,-18px,0) scale(1.04)}55%{transform:translate3d(0,0,0) scale(1.03,.97)}75%{transform:translate3d(0,-8px,0)}}
.tsm .tsmRitualLayer[data-rid="6"] .zpShake{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="6"] .zpSlot .tsmOrb{left:0;top:0;transition:transform .12s cubic-bezier(.3,1.5,.5,1)}
.tsm .tsmRitualLayer[data-rid="6"] .zpSlot.press .tsmOrb{transform:scale(1.07,.9)}
.tsm .tsmRitualLayer[data-rid="6"] .zpHalo{position:absolute;inset:-7%;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .3s ease;border:2px dashed rgba(110,235,255,.95);animation:tsmSpin 1.2s linear infinite}
.tsm .tsmRitualLayer[data-rid="6"] .zpSlot.h1 .zpHalo{opacity:1}
.tsm .tsmRitualLayer[data-rid="6"] .zpGold{position:absolute;inset:-12%;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .6s ease;
  background:radial-gradient(circle, transparent 52%, rgba(255,214,120,.55) 62%, rgba(255,200,90,.18) 72%, transparent 76%)}
.tsm .tsmRitualLayer[data-rid="6"] .zpSlot.rel .zpGold{opacity:1;animation:tsmPulse 1.6s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="6"] .zpCradle{position:absolute;width:var(--cw);height:var(--cw);margin:calc(var(--cw)*-.5) 0 0 calc(var(--cw)*-.5);border-radius:50%;pointer-events:none;transition:opacity .4s ease, transform .4s ease;
  background:radial-gradient(circle at 50% 50%, rgba(90,230,255,.22) 0 30%, transparent 31%),repeating-conic-gradient(from 0deg, rgba(255,255,255,.06) 0 6deg, transparent 6deg 30deg),radial-gradient(circle at 40% 32%, #6f819e 0%, #36425a 55%, #1a2132 100%);
  box-shadow:inset 0 0 0 2px rgba(150,220,255,.35), inset 0 -6px 14px rgba(0,0,0,.45), 0 0 34px rgba(80,210,255,.25), 0 10px 24px rgba(0,0,0,.45)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="6"] .zpCradle{box-shadow:inset 0 0 0 2px rgba(60,140,210,.45), inset 0 -6px 14px rgba(0,0,0,.3), 0 0 30px rgba(60,160,255,.3), 0 10px 22px rgba(40,60,110,.3)}
.tsm .tsmRitualLayer[data-rid="6"] .zpCradle.up{opacity:.75;transform:scale(.94)}
.tsm .tsmRitualLayer[data-rid="6"] .zpTool{position:absolute;width:var(--zw);height:var(--zh);transform-origin:50% 52%;transition:transform .12s ease-out;touch-action:none;cursor:pointer}
.tsm .tsmRitualLayer[data-rid="6"] .zpKick{position:absolute;inset:0;transform-origin:50% 52%}
.tsm .tsmRitualLayer[data-rid="6"] .zpKick svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tsm .tsmRitualLayer[data-rid="6"] .zpWake{position:absolute;left:-30%;right:-30%;top:-8%;height:60%;border-radius:50%;pointer-events:none;opacity:0;
  background:radial-gradient(closest-side, rgba(90,230,255,.55), rgba(90,230,255,.12) 60%, transparent)}
.tsm .tsmRitualLayer[data-rid="6"] .zpTool.dock .zpWake{animation:zpWake 1.6s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="6"] .zpTool.gold .zpWake{opacity:1;background:radial-gradient(closest-side, rgba(255,214,120,.7), rgba(255,200,90,.16) 60%, transparent)}
@keyframes zpWake{0%,100%{opacity:.25;transform:scale(.9)}50%{opacity:.9;transform:scale(1.08)}}
.tsm .tsmRitualLayer[data-rid="6"] .zpArc{animation:zpArc .18s steps(2) infinite}
@keyframes zpArc{0%{opacity:.35}100%{opacity:1}}
.tsm .tsmRitualLayer[data-rid="6"] .zpBolt{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;opacity:0}
.tsm .tsmRitualLayer[data-rid="6"] .zpBolt path{fill:none;stroke-linecap:round;stroke-linejoin:round}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="6"] .zpSlot,.tsm .tsmRitualLayer[data-rid="6"] .zpClouds,.tsm .tsmRitualLayer[data-rid="6"] .zpHalo{animation:none}}
`

function zapBoltPath(x1: number, y1: number, x2: number, y2: number, calm: boolean): string {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.max(1, Math.hypot(dx, dy))
    const segs = clamp(Math.round(len / 26), 6, 14)
    const nx = -dy / len
    const ny = dx / len
    const amp = Math.min(22, 8 + 0.05 * len) * (calm ? 0.6 : 1)
    const pts: { x: number; y: number }[] = []
    for (let k = 0; k <= segs; k++) {
        const t = k / segs
        const off = k === 0 || k === segs ? 0 : (Math.random() - 0.5) * 2 * amp * Math.sin(Math.PI * t)
        pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off })
    }
    let d = "M" + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")
    const base = Math.atan2(dy, dx)
    ;[0.35, 0.68].forEach((f, j) => {
        const k = Math.round(segs * f)
        const p = pts[k]
        const a = base + (j ? -0.6 : 0.6)
        const fl = len * (0.12 + Math.random() * 0.1)
        let fx = p.x
        let fy = p.y
        d += ` M${fx.toFixed(1)} ${fy.toFixed(1)}`
        for (let s = 1; s <= 3; s++) {
            fx = p.x + Math.cos(a) * (fl * s) / 3 + (Math.random() - 0.5) * 8
            fy = p.y + Math.sin(a) * (fl * s) / 3 + (Math.random() - 0.5) * 8
            d += ` L${fx.toFixed(1)} ${fy.toFixed(1)}`
        }
    })
    return d
}

function ZapperArt({ charge, gold }: { charge: number; gold: boolean }) {
    const leds = gold ? 5 : Math.max(0, Math.round(charge * 5))
    const coil = gold ? 0.9 : 0.12 + charge * 0.88
    return (
        <svg viewBox="0 0 60 120" aria-hidden="true">
            <defs>
                <linearGradient id="zpMetal" x1="0" x2="1">
                    <stop offset="0" stopColor="#2a3346" />
                    <stop offset=".45" stopColor="#8a9ab4" />
                    <stop offset="1" stopColor="#1c2232" />
                </linearGradient>
                <linearGradient id="zpGrip" x1="0" x2="1">
                    <stop offset="0" stopColor="#1a1f2b" />
                    <stop offset=".5" stopColor="#3b4458" />
                    <stop offset="1" stopColor="#141820" />
                </linearGradient>
                <radialGradient id="zpCoil">
                    <stop offset="0" stopColor={gold ? "#fff2c4" : "#eaffff"} />
                    <stop offset=".55" stopColor={gold ? "#ffbf4a" : "#38d8ff"} />
                    <stop offset="1" stopColor={gold ? "#a8620e" : "#0b4f8c"} />
                </radialGradient>
            </defs>
            <path className="zpArc" d="M21 4 L26 9 L30 3 L34 9 L39 4" stroke={gold ? "#ffe39a" : "#b8f6ff"} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <rect x="19" y="5" width="4" height="22" rx="1.5" fill="url(#zpMetal)" />
            <rect x="37" y="5" width="4" height="22" rx="1.5" fill="url(#zpMetal)" />
            <circle cx="21" cy="4.5" r="3" fill="#e08a4a" stroke="#ffd2a8" strokeWidth=".6" />
            <circle cx="39" cy="4.5" r="3" fill="#e08a4a" stroke="#ffd2a8" strokeWidth=".6" />
            <rect x="15" y="24" width="30" height="7" rx="3" fill="#eef1f6" stroke="#9aa6b8" strokeWidth=".6" />
            <rect x="10" y="30" width="40" height="36" rx="9" fill="url(#zpMetal)" stroke="#0e1320" strokeWidth=".8" />
            <rect x="17" y="35" width="26" height="22" rx="6" fill="url(#zpCoil)" opacity={coil} />
            <path d="M18 38h24M18 41h24M18 44h24M18 47h24M18 50h24M18 53h24M18 56h24" stroke={gold ? "rgba(140,80,10,.75)" : "rgba(10,60,110,.75)"} strokeWidth="1.1" />
            <rect x="17" y="35" width="26" height="22" rx="6" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".8" />
            {[0, 1, 2, 3, 4].map((k) => (
                <circle key={k} cx={18 + k * 6} cy="61.5" r="1.9" fill={k < leds ? (gold ? "#ffd66b" : "#62f2ff") : "#1b2433"} stroke="rgba(255,255,255,.35)" strokeWidth=".4" />
            ))}
            <rect x="22" y="66" width="16" height="10" rx="2" fill="#2b3346" />
            <path d="M31 67.5 l-3 4 h2.4 l-1.6 3.6 l4.2-5 h-2.4 l1.4-2.6z" fill="#ffd34a" />
            <path d="M21 80 q-6 2 -5 9 q4 1 6 -3z" fill="#e8353a" stroke="#8c1418" strokeWidth=".6" />
            <path d="M14 78 q-4 10 6 14" fill="none" stroke="#5a6478" strokeWidth="1.4" />
            <rect x="21" y="75" width="18" height="36" rx="6" fill="url(#zpGrip)" stroke="#0b0f18" strokeWidth=".8" />
            <path d="M23 82h14M23 87h14M23 92h14M23 97h14M23 102h14" stroke="rgba(255,255,255,.12)" strokeWidth="1.2" />
            <ellipse cx="30" cy="112.5" rx="11" ry="4" fill="#4b5670" stroke="#0b0f18" strokeWidth=".8" />
        </svg>
    )
}

function RitualZap({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const HITS = 2
    const timers = useTimers()
    const [hits, setHits] = React.useState<number[]>(() => Array(N).fill(0))
    const [face, setFace] = React.useState<(string | null)[]>(() => Array.from({ length: N }, (_, i) => ctx.pic(i, false)))
    const [words, setWords] = React.useState<boolean[]>(() => Array(N).fill(true))
    const [phase, setPhase] = React.useState<"dock" | "ready" | "done">("dock")
    const [charge, setCharge] = React.useState(0)
    const [press, setPress] = React.useState(-1)
    const hitsRef = React.useRef<number[]>(Array(N).fill(0))
    const phaseRef = React.useRef<"dock" | "ready" | "done">("dock")
    const busy = React.useRef(false)
    const queue = React.useRef<(number | null)[]>([])
    const shots = React.useRef(0)
    const toolRef = React.useRef<HTMLDivElement>(null)
    const kickRef = React.useRef<HTMLDivElement>(null)
    const flashRef = React.useRef<HTMLElement>(null)
    const svgRef = React.useRef<SVGSVGElement>(null)
    const glowRef = React.useRef<SVGPathElement>(null)
    const coreRef = React.useRef<SVGPathElement>(null)
    const shakeRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const degRef = React.useRef(0)
    const calm = ctx.reduced

    // per-bubble faces: negative → shocked (≠ start) → softer → happy
    const faces = React.useMemo(
        () =>
            Array.from({ length: N }, (_, i) => {
                if (ctx.uploaded) return { neg: ctx.pic(i, false), shock: ctx.pic(i, false), soft: ctx.pic(i, false), happy: ctx.pic(i, false) }
                const c = ctx.char(i)
                const neg = ctx.pic(i, false)
                let shock = tsmFaceUrl(c, ZAP_SHOCK[c] ?? 44)
                if (shock === neg) shock = tsmFaceUrl(c, ZAP_SHOCK_ALT[c] ?? 44)
                return { neg, shock, soft: tsmFaceUrl(c, ZAP_SOFT[c] ?? 70), happy: ctx.pic(i, true) }
            }),
        []
    )
    React.useEffect(() => {
        faces.forEach((f) => [f.shock, f.soft, f.happy].forEach((s) => preloadImage(s)))
        ctx.hint("Tap the zapper, then zap each bubble")
    }, [])

    // layout: the zapper is a turret in the middle of a ring of bubbles, so every bolt is a clear radial shot
    // (no bolt ever crosses another bubble); the ring is stretched vertically to use the portrait screen
    const PILL = 88
    const availH = h - PILL
    const d = Math.round(clamp(w * 0.3, 96, 132))
    const Rx = Math.max(90, (w / 2 - d / 2 - 10) / 0.866)
    const Ry = Math.max(Rx * 0.9, Math.min((availH - d - 32) / 2, Rx * 1.45))
    const px = w / 2
    const py = Math.round(18 + d / 2 + Ry)
    const ZH = Math.round(clamp(Math.hypot(Rx * 0.866, Ry * 0.5) * 0.95, 104, 150))
    const ZW = Math.round(ZH * 0.5)
    const zTop = py - ZH * 0.52
    const L = ZH * 0.48
    const RING = [
        [0, -1],
        [0.866, -0.5],
        [0.866, 0.5],
        [0, 1],
        [-0.866, 0.5],
        [-0.866, -0.5],
    ]
    const pos = RING.map(([a, b]) => ({ x: px + a * Rx, y: py + b * Ry }))
    const posRef = useLatest(pos)
    const geo = useLatest({ px, py, L, d })

    const tip = (deg: number) => {
        const r = (deg * Math.PI) / 180
        const G = geo.current
        return { x: G.px + Math.sin(r) * G.L, y: G.py - Math.cos(r) * G.L }
    }
    const aimAt = (i: number) => {
        const p = posRef.current[i]
        const G = geo.current
        let deg = (Math.atan2(p.x - G.px, G.py - p.y) * 180) / Math.PI
        // swing the short way round
        while (deg - degRef.current > 180) deg -= 360
        while (deg - degRef.current < -180) deg += 360
        degRef.current = deg
        if (toolRef.current) toolRef.current.style.transform = `rotate(${deg.toFixed(1)}deg)`
        return deg
    }
    const setPhaseBoth = (p: "dock" | "ready" | "done") => {
        phaseRef.current = p
        setPhase(p)
    }

    const pickup = () => {
        if (phaseRef.current !== "dock") return
        setPhaseBoth("ready")
        setCharge(0.6)
        timers.after(520, () => setCharge((c) => (c > 0.5 && !busy.current ? 0.3 : c)))
        ctx.sfx("hum")
        ctx.haptic(12)
        ctx.hint("Aim at a bubble — I'll power it!")
    }

    const nextTarget = (wanted: number | null) => {
        const H = hitsRef.current
        const P = posRef.current
        const ref = wanted != null ? P[wanted] : { x: geo.current.px, y: 0 }
        const near = (arr: number[]) => arr.sort((a, b) => dist(P[a].x, P[a].y, ref.x, ref.y) - dist(P[b].x, P[b].y, ref.x, ref.y))[0]
        const started = H.map((v, j) => (v > 0 && v < HITS ? j : -1)).filter((j) => j >= 0)
        if (started.length) return near(started)
        const open = H.map((v, j) => (v < HITS ? j : -1)).filter((j) => j >= 0)
        return open.length ? near(open) : -1
    }

    const drawBolt = (x2: number, y2: number, gold = false) => {
        const t = tip(degRef.current)
        const dd = zapBoltPath(t.x, t.y, x2, y2, calm)
        if (glowRef.current) {
            glowRef.current.setAttribute("d", dd)
            glowRef.current.setAttribute("stroke", gold ? "rgba(255,200,90,.55)" : "rgba(90,220,255,.55)")
        }
        if (coreRef.current) {
            coreRef.current.setAttribute("d", dd)
            coreRef.current.setAttribute("stroke", gold ? "#fff4d0" : "#f2feff")
        }
    }
    const showBolt = (on: boolean) => {
        if (svgRef.current) svgRef.current.style.opacity = on ? "1" : "0"
    }

    const fire = (wanted: number | null) => {
        if (phaseRef.current === "done") return
        if (busy.current) {
            if (queue.current.length < 3) queue.current.push(wanted)
            return
        }
        const i = wanted != null && hitsRef.current[wanted] < HITS ? wanted : nextTarget(wanted)
        if (i < 0) return
        busy.current = true
        aimAt(i)
        setCharge(0.45)
        ctx.hint(ZAP_CHARGE_LINES[shots.current % 3])
        shots.current += 1
        ctx.sfx("hum")
        const T = calm ? 60 : 170
        timers.after(T, () => strike(i))
        timers.after(T + (calm ? 340 : 480), () => {
            showBolt(false)
            setCharge(0.3)
            busy.current = false
            const total = hitsRef.current.reduce((a, b) => a + b, 0)
            if (total >= N * HITS) return finish()
            if (queue.current.length) fire(queue.current.shift() as number | null)
        })
    }

    const strike = (i: number) => {
        const p = posRef.current[i]
        const G = geo.current
        const t = tip(degRef.current)
        const len = Math.max(1, dist(t.x, t.y, p.x, p.y))
        const sx = p.x - ((p.x - t.x) / len) * G.d * 0.5 * 0.62
        const sy = p.y - ((p.y - t.y) / len) * G.d * 0.5 * 0.62
        const H = hitsRef.current.slice()
        H[i] = Math.min(HITS, H[i] + 1)
        hitsRef.current = H
        setHits(H)
        setCharge(1)
        const n = H[i]
        // the bolt lives for the shot, re-drawn every 50 ms
        drawBolt(sx, sy)
        showBolt(true)
        if (!calm) {
            let k = 0
            const id = timers.every(50, () => {
                k += 1
                drawBolt(sx, sy)
                if (k >= 8) timers.clear(id)
            })
        }
        // recoil, muzzle flash, arena flash, impact, shake
        const kick = kickRef.current
        if (kick && kick.animate && !calm) kick.animate([{ transform: "none" }, { transform: `translateY(9%) rotate(${shots.current % 2 ? 3 : -3}deg)` }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.8,.3,1)" })
        const fl = flashRef.current
        if (fl && fl.animate) fl.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 360, easing: "ease-out" })
        ctx.fx.burst(t.x, t.y, { count: 8, shape: "glow", size: [4, 9], speed: [20, 90], life: [0.25, 0.4], colors: ["rgba(200,250,255,1)", "rgba(120,220,255,1)"] })
        ctx.fx.burst(sx, sy, { count: 1, shape: "ring", size: [10, 10], grow: G.d * 1.4, life: [0.42, 0.42], speed: [0, 0], colors: ["rgba(150,240,255,.95)"], add: true })
        ctx.fx.burst(sx, sy, { count: 16, shape: "spark", size: [2, 3.5], speed: [180, 420], life: [0.3, 0.55], drag: 0.92, colors: ["rgba(255,255,255,1)", "rgba(120,235,255,1)", "rgba(255,240,170,1)"] })
        ctx.fx.burst(sx, sy, { count: 6, shape: "glow", size: [8, 16], speed: [10, 60], life: [0.3, 0.5], colors: ["rgba(180,245,255,1)"] })
        ctx.fx.add({ x: sx, y: sy - 8, vy: -40, max: 0.5, size: 20, rot: (shots.current % 2 ? 1 : -1) * 0.2, shape: "text", text: "ZAP!", color: ctx.theme === "bright" ? "rgba(20,70,140,1)" : "rgba(220,252,255,1)", add: false })
        const sh = shakeRefs.current[i]
        if (sh && sh.animate && !calm)
            sh.animate(
                [{ transform: "translate(0,0)" }, { transform: "translate(-7px,4px)" }, { transform: "translate(6px,-3px)" }, { transform: "translate(-4px,2px)" }, { transform: "translate(3px,-1px)" }, { transform: "translate(0,0)" }],
                { duration: 380, easing: "linear" }
            )
        ctx.sfx("spark")
        ctx.sfx("clack")
        ctx.haptic(n === 2 ? 26 : 16)
        const total = H.reduce((a, b) => a + b, 0)
        ctx.progress(total / (N * HITS))
        if (n === 1) {
            setFace((f) => f.map((v, j) => (j === i ? faces[i].shock : v)))
            timers.after(calm ? 340 : 480, () => phaseRef.current !== "done" && ctx.hint("Yes!! Zap it again!"))
        } else {
            // the second hit zaps the buzzing words right out of the bubble
            setFace((f) => f.map((v, j) => (j === i ? faces[i].soft : v)))
            const letters = Array.from(ctx.words[i] || "").filter((c) => c.trim())
            if (letters.length) {
                setWords((ws) => ws.map((v, j) => (j === i ? false : v)))
                ctx.fx.burst(p.x, p.y + G.d * 0.27, { count: Math.min(20, letters.length), shape: "text", text: letters, size: [13, 18], speed: [90, 230], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.8, 1.2], gravity: 260, drag: 0.96, spin: 6, colors: ["rgba(170,245,255,1)", "rgba(255,255,255,1)"], add: false })
            }
            timers.after(calm ? 380 : 700, () => {
                setFace((f) => f.map((v, j) => (j === i ? faces[i].happy : v)))
                ctx.sfx("chime")
            })
            const left = H.filter((v) => v < HITS).length
            timers.after(calm ? 340 : 480, () => phaseRef.current !== "done" && left && ctx.hint(left === 1 ? "Look — it's smiling! One left" : `Look — it's smiling! ${left} left`))
        }
    }

    const finish = () => {
        if (phaseRef.current === "done") return
        ctx.hint("")
        timers.after(320, () => {
            setPhaseBoth("done")
            setCharge(0.15)
            setFace(faces.map((f) => f.happy))
            ctx.sfx("chime")
            ctx.haptic(34)
            // a gold chain of lightning hops through every smiling bubble
            const P = posRef.current
            const order = P.map((_, j) => j)
            let from = tip(degRef.current)
            order.forEach((j, k) => {
                timers.after(k * 130, () => {
                    const q = P[j]
                    const dd = zapBoltPath(from.x, from.y, q.x, q.y, calm)
                    glowRef.current && glowRef.current.setAttribute("d", dd)
                    glowRef.current && glowRef.current.setAttribute("stroke", "rgba(255,200,90,.6)")
                    coreRef.current && coreRef.current.setAttribute("d", dd)
                    coreRef.current && coreRef.current.setAttribute("stroke", "#fff4d0")
                    showBolt(true)
                    ctx.fx.burst(q.x, q.y, { count: 12, shape: "glow", size: [4, 10], speed: [40, 180], life: [0.6, 1], drag: 0.94, colors: ["rgba(255,222,150,1)", "rgba(255,255,255,1)"] })
                    if (k % 2 === 0) ctx.sfx("spark")
                    ctx.haptic(8)
                    from = q
                })
            })
            timers.after(N * 130 + 120, () => {
                showBolt(false)
                const cxm = P.reduce((a, q) => a + q.x, 0) / N
                const cym = P.reduce((a, q) => a + q.y, 0) / N
                ctx.fx.burst(cxm, cym, { count: 1, shape: "ring", size: [20, 20], grow: w * 1.3, life: [1, 1], speed: [0, 0], colors: ["rgba(255,220,150,.8)"], add: true })
                ctx.fx.burst(cxm, cym, { count: 34, shape: "glow", size: [4, 10], speed: [80, 300], life: [0.9, 1.4], drag: 0.95, colors: ["rgba(255,226,170,1)", "rgba(190,240,255,1)", "rgba(255,255,255,1)"] })
                ctx.sfx("bell")
            })
        })
        timers.after(calm ? 1500 : 2100, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(340)
        })
    }

    const onBubble = (i: number) => {
        if (phaseRef.current === "done") return
        setPress(i)
        timers.after(110, () => setPress((p) => (p === i ? -1 : p)))
        ctx.haptic(6)
        if (phaseRef.current === "dock") {
            pickup()
            aimAt(i)
            timers.after(260, () => fire(i))
        } else fire(i)
    }
    const onTool = () => {
        if (phaseRef.current === "done") return
        if (phaseRef.current === "dock") pickup()
        else fire(null)
    }

    const gold = phase === "done"
    return (
        <>
            <div className="zpSky" />
            <div className="zpClouds" />
            <div className="zpFloor" />
            <i className="zpFlash" ref={flashRef as any} />
            {pos.map((p, i) => (
                <div
                    key={i}
                    className={cx("zpSlot", press === i && "press", hits[i] === 1 && "h1", hits[i] >= HITS && !gold && "rel", gold && "joy")}
                    style={{ left: p.x, top: p.y, ["--d" as any]: `${d}px`, ["--bob" as any]: `${2.4 + i * 0.13}s`, ["--bd" as any]: `${-i * 0.4}s`, ["--jd" as any]: `${i * 0.08}s` }}
                    onPointerDown={(e) => {
                        e.preventDefault()
                        onBubble(i)
                    }}
                    role="button"
                    aria-label={`Zap the thought: ${ctx.words[i] || "your picture"}`}
                >
                    <div className="zpShake" ref={(el) => (shakeRefs.current[i] = el)}>
                        <i className="zpGold" />
                        <i className="zpHalo" />
                        <Orb
                            src={face[i]}
                            text={words[i] ? ctx.words[i] : ""}
                            d={d}
                            hue={hits[i] === 1 ? 190 : ctx.hue(i)}
                            hue2={hits[i] >= HITS ? 44 : 190}
                            mood={gold ? "bounce" : hits[i] >= HITS ? "happy" : hits[i] === 1 ? "tremble" : ZAP_MOOD[ctx.char(i)] || "nervous"}
                            aura={hits[i] >= HITS ? 0.75 : hits[i] === 1 ? 0.45 : 0}
                            uploaded={ctx.uploaded}
                        />
                    </div>
                </div>
            ))}
            <i className={cx("zpCradle", phase !== "dock" && "up")} style={{ left: px, top: py, ["--cw" as any]: `${Math.round(ZH * 0.86)}px` }} />
            <div
                ref={toolRef}
                className={cx("zpTool", phase === "dock" && "dock", gold && "gold")}
                style={{ left: px - ZW / 2, top: zTop, ["--zw" as any]: `${ZW}px`, ["--zh" as any]: `${ZH}px` }}
                onPointerDown={(e) => {
                    e.preventDefault()
                    onTool()
                }}
                role="button"
                aria-label={phase === "dock" ? "Pick up the zapper" : "Fire the zapper"}
            >
                <i className="zpWake" />
                <div className="zpKick" ref={kickRef}>
                    <ZapperArt charge={charge} gold={gold} />
                </div>
            </div>
            <svg ref={svgRef} className="zpBolt" width={w} height={h} aria-hidden="true">
                <path ref={glowRef} strokeWidth="9" stroke="rgba(90,220,255,.55)" />
                <path ref={coreRef} strokeWidth="2.6" stroke="#f2feff" />
            </svg>
        </>
    )
}

tsmRitual({ id: 6, hint: "Tap the zapper, then zap each bubble", css: ZAP_CSS, Comp: RitualZap })
