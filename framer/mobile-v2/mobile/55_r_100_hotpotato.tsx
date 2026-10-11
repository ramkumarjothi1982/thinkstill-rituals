/* ================================================================== */
/* 100 · HOT POTATO — embers cooling into a blue night                 */
/* ================================================================== */
// Desktop rules kept: all 6 thoughts visible at once as hot, steaming potatoes; drag any potato ≥ 48 px in any
// direction to cool it — it snaps back to its place, instantly turns from hot red to cool blue, loses its steam
// and gets a happy face; any order; ALL COOLED, then the finish; bonus 380. Fixed: hot is really red/orange and
// cooled is really blue (no arena gradient override); picture on top, words BELOW it inside the potato, words
// ≥ 15 px; only successful flings count (a short drag springs back with no progress and no reward); no faces
// re-roll on a failed drag; the counter that clipped at 390 is gone (the strip carries progress).

const HP_SHAPES = ["52% 48% 55% 45% / 58% 54% 46% 42%", "46% 54% 44% 56% / 52% 60% 40% 48%", "56% 44% 50% 50% / 46% 56% 44% 54%", "48% 52% 58% 42% / 60% 48% 52% 40%", "54% 46% 46% 54% / 50% 58% 42% 50%", "50% 50% 44% 56% / 56% 46% 54% 44%"]

const HOTPOTATO_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="100"] .hpRoom{position:absolute;inset:0;background:
  radial-gradient(90% 40% at 50% 104%, rgba(255,120,40,.55) 0%, rgba(200,50,20,.22) 45%, transparent 75%),
  radial-gradient(60% 30% at 80% 0%, rgba(255,140,80,.18), transparent 70%),
  linear-gradient(180deg,#1c0d10 0%,#2a1014 50%,#3a1510 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="100"] .hpRoom{background:
  radial-gradient(90% 40% at 50% 104%, rgba(255,150,80,.6) 0%, rgba(255,120,70,.2) 45%, transparent 75%),
  linear-gradient(180deg,#fff1e4 0%,#ffe0cc 55%,#ffcfb0 100%)}
.tsm .tsmRitualLayer[data-rid="100"] .hpCoolSky{position:absolute;inset:0;pointer-events:none;transition:opacity 1.1s ease;
  background:radial-gradient(90% 40% at 50% 104%, rgba(80,190,255,.45) 0%, rgba(40,110,220,.18) 45%, transparent 75%),radial-gradient(70% 30% at 20% 0%, rgba(160,220,255,.22), transparent 70%),linear-gradient(180deg,#070f24 0%,#0b1d3c 55%,#0e2a52 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="100"] .hpCoolSky{background:radial-gradient(90% 40% at 50% 104%, rgba(120,200,255,.55) 0%, rgba(120,180,255,.2) 45%, transparent 75%),linear-gradient(180deg,#eef7ff 0%,#dcecff 55%,#c8e2fb 100%)}
.tsm .tsmRitualLayer[data-rid="100"] .hpSlot{position:absolute;width:var(--pw);height:var(--ph);margin:calc(var(--ph)*-.5) 0 0 calc(var(--pw)*-.5);touch-action:none;cursor:grab;
  animation:hpJig var(--jd,1.6s) ease-in-out infinite;animation-delay:var(--jo,0s)}
@keyframes hpJig{0%,100%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(0,-3px,0) rotate(var(--jr,1.2deg))}}
.tsm .tsmRitualLayer[data-rid="100"] .hpSlot.cool{cursor:default;animation:hpFloat 4s ease-in-out infinite;animation-delay:var(--jo,0s)}
@keyframes hpFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-5px,0)}}
.tsm .tsmRitualLayer[data-rid="100"] .hpSlot.joy{animation:hpJoy .8s cubic-bezier(.3,.7,.3,1) 2;animation-delay:var(--jy,0s)}
@keyframes hpJoy{0%,100%{transform:translate3d(0,0,0)}35%{transform:translate3d(0,-16px,0) scale(1.04)}60%{transform:translate3d(0,0,0) scale(1.04,.96)}}
.tsm .tsmRitualLayer[data-rid="100"] .hpPot{position:absolute;inset:0;will-change:transform}
.tsm .tsmRitualLayer[data-rid="100"] .hpBody,.tsm .tsmRitualLayer[data-rid="100"] .hpCold{position:absolute;inset:0;border-radius:var(--br)}
.tsm .tsmRitualLayer[data-rid="100"] .hpBody{transition:opacity .35s ease;
  background:radial-gradient(9% 7% at 24% 70%, rgba(110,10,0,.45), transparent 100%),radial-gradient(7% 6% at 80% 34%, rgba(110,10,0,.4), transparent 100%),radial-gradient(6% 5% at 72% 80%, rgba(110,10,0,.4), transparent 100%),
    radial-gradient(120% 110% at 38% 26%, #fff0bd 0%, #ffb15a 9%, #ff5a35 22%, #e31d16 55%, #8a0606 86%, #600000 100%);
  box-shadow:0 0 28px rgba(255,70,30,.55), 0 12px 24px rgba(60,0,0,.45), inset 0 -10px 18px rgba(80,0,0,.45), inset 0 6px 12px rgba(255,220,160,.35)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="100"] .hpBody{box-shadow:0 0 24px rgba(255,80,40,.45), 0 12px 22px rgba(140,30,10,.3), inset 0 -10px 18px rgba(80,0,0,.4), inset 0 6px 12px rgba(255,220,160,.35)}
.tsm .tsmRitualLayer[data-rid="100"] .hpCold{opacity:0;transition:opacity .35s ease;
  background:radial-gradient(9% 7% at 24% 70%, rgba(0,30,90,.35), transparent 100%),radial-gradient(7% 6% at 80% 34%, rgba(0,30,90,.3), transparent 100%),
    radial-gradient(120% 110% at 38% 26%, #e8fdff 0%, #9be9ff 10%, #55d8ff 24%, #176ee3 58%, #0a2f90 86%, #071e69 100%);
  box-shadow:0 0 26px rgba(80,200,255,.55), 0 12px 24px rgba(0,20,60,.45), inset 0 -10px 18px rgba(0,20,80,.45), inset 0 6px 12px rgba(230,250,255,.4)}
.tsm .tsmRitualLayer[data-rid="100"] .hpSlot.cool .hpCold{opacity:1}
.tsm .tsmRitualLayer[data-rid="100"] .hpSlot.cool .hpBody{opacity:0}
.tsm .tsmRitualLayer[data-rid="100"] .hpSteam{position:absolute;top:-16%;width:16%;height:34%;border-radius:50%;pointer-events:none;opacity:0;
  background:radial-gradient(closest-side, rgba(255,255,255,.55), rgba(255,255,255,0));animation:hpSteam 1.9s ease-out infinite}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="100"] .hpSteam{background:radial-gradient(closest-side, rgba(255,170,140,.55), rgba(255,170,140,0))}
.tsm .tsmRitualLayer[data-rid="100"] .hpSteam:nth-of-type(1){left:28%}
.tsm .tsmRitualLayer[data-rid="100"] .hpSteam:nth-of-type(2){left:58%;animation-delay:-.9s}
@keyframes hpSteam{0%{transform:translate3d(0,24px,0) scale(.6);opacity:0}30%{opacity:.85}100%{transform:translate3d(6px,-22px,0) scale(1.4);opacity:0}}
.tsm .tsmRitualLayer[data-rid="100"] .hpSlot.cool .hpSteam{display:none}
.tsm .tsmRitualLayer[data-rid="100"] .hpPic{position:absolute;left:50%;border-radius:50%;overflow:hidden;transform:translateX(-50%);background:rgba(255,255,255,.9);
  box-shadow:0 0 0 2.5px rgba(255,236,200,.9), 0 4px 10px rgba(60,0,0,.35);transition:box-shadow .35s ease}
.tsm .tsmRitualLayer[data-rid="100"] .hpSlot.cool .hpPic{box-shadow:0 0 0 2.5px rgba(220,248,255,.95), 0 4px 10px rgba(0,30,80,.35)}
.tsm .tsmRitualLayer[data-rid="100"] .hpPic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="100"] .hpPic img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="100"] .hpPic img.fresh{animation:hpFace .5s cubic-bezier(.3,1.6,.45,1) both}
@keyframes hpFace{0%{transform:scale(.6) rotate(8deg);opacity:0}100%{transform:scale(1.14);opacity:1}}
.tsm .tsmRitualLayer[data-rid="100"] .hpWords{position:absolute;left:11%;right:11%;text-align:center;color:#fff;font-weight:600;line-height:1.15;letter-spacing:-.005em;
  text-shadow:0 1px 2px rgba(90,0,0,.85), 0 0 8px rgba(120,0,0,.5);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;word-break:break-word}
.tsm .tsmRitualLayer[data-rid="100"] .hpSlot.cool .hpWords{text-shadow:0 1px 2px rgba(0,30,90,.85), 0 0 8px rgba(0,40,120,.5)}
.tsm .tsmRitualLayer[data-rid="100"] .hpCaption{position:absolute;left:0;right:0;bottom:calc(22px + env(safe-area-inset-bottom,0px));text-align:center;pointer-events:none;opacity:0;transform:translateY(10px);transition:opacity .8s ease, transform .8s ease;
  font-size:21px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#d9f4ff;text-shadow:0 0 18px rgba(90,200,255,.7)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="100"] .hpCaption{color:#1a5fae;text-shadow:0 0 14px rgba(255,255,255,.9)}
.tsm .tsmRitualLayer[data-rid="100"] .hpCaption.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="100"] .hpSlot,.tsm .tsmRitualLayer[data-rid="100"] .hpSteam{animation:none}}
`

function RitualHotPotato({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const MIN = 48
    const timers = useTimers()
    const [cooled, setCooled] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [phase, setPhase] = React.useState<"play" | "final">("play")
    const [caption, setCaption] = React.useState(false)
    const coolRef = React.useRef<boolean[]>(Array(N).fill(false))
    const potRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const calm = ctx.reduced

    // layout: 2 × 3 potatoes, generous gaps and drag room, all above the hint pill
    const PILL = 88
    const area = { w, h: Math.max(300, h - PILL - 12) }
    const g = tsmGrid(N, area, 2, 140, 22, 0.2)
    const d = Math.min(g.d, Math.floor((w / 4 - 10) / 0.55))
    const PW = Math.round(d * 1.1)
    const PH = Math.round(d * 0.98)
    const pos = g.pos.map((p, i) => ({ x: p.x + (i % 2 ? -w * 0.015 : w * 0.015), y: p.y + 10 }))
    const posRef = useLatest(pos)
    const pic = Math.round(PH * 0.46)
    const picTop = Math.round(PH * 0.1)
    const fpx = Math.max(15, Math.min(16.5, Math.round(PW * 0.105 * 10) / 10))

    React.useEffect(() => {
        ctx.hint("Drag each hot potato away")
        for (let i = 0; i < N; i++) preloadImage(ctx.pic(i, true))
    }, [])

    const setT = (i: number, x: number, y: number, rot: number, s: number, tr: string) => {
        const el = potRefs.current[i]
        if (!el) return
        el.style.transition = tr
        el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${s})`
    }

    const opts = (i: number): DragOpts => ({
        onStart: () => {
            if (coolRef.current[i] || phase !== "play") return false
            setT(i, 0, 0, 0, 1.05, "transform .08s ease-out")
            ctx.sfx("hum")
            ctx.haptic(8)
        },
        onMove: (dd) => {
            const m = Math.hypot(dd.dx, dd.dy) || 1
            const k = m <= 70 ? 1 : (70 + (m - 70) * 0.4) / m
            const x = dd.dx * k
            const y = dd.dy * k
            setT(i, x, y, x * 0.06, 1.06, "none")
            if (!calm && Math.random() < 0.22) {
                const p = posRef.current[i]
                ctx.fx.add({ x: p.x + x + (Math.random() - 0.5) * PW * 0.5, y: p.y + y - PH * 0.42, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 40, max: 0.9, size: 8, grow: 18, shape: "smoke", color: ctx.theme === "bright" ? "rgba(255,160,120,.35)" : "rgba(255,255,255,.22)", add: false })
            }
        },
        onEnd: (dd) => {
            const m = Math.hypot(dd.dx, dd.dy)
            if (m >= MIN && !coolRef.current[i]) cool(i, dd)
            else {
                setT(i, 0, 0, 0, 1, calm ? "transform .2s ease-out" : "transform .5s cubic-bezier(.3,1.7,.45,1)")
                if (m > 8) {
                    ctx.sfx("soft")
                    ctx.haptic(5)
                    ctx.hint("Fling it further away")
                }
            }
        },
    })
    // six fixed hooks, called unconditionally (the potato count never changes)
    const binds = [useDrag(opts(0)), useDrag(opts(1)), useDrag(opts(2)), useDrag(opts(3)), useDrag(opts(4)), useDrag(opts(5))]

    const cool = (i: number, dd: DragInfo) => {
        const m = Math.hypot(dd.dx, dd.dy) || 1
        const k = m <= 70 ? 1 : (70 + (m - 70) * 0.4) / m
        const x = dd.dx * k
        const y = dd.dy * k
        const ux = dd.dx / m
        const uy = dd.dy / m
        // the fling carries it a little further, then it springs home — already cold
        setT(i, x + ux * 30, y + uy * 30, x * 0.08, 1.02, "transform .12s ease-out")
        timers.after(calm ? 60 : 130, () => setT(i, 0, 0, 0, 1, calm ? "transform .25s ease-out" : "transform .6s cubic-bezier(.3,1.6,.45,1)"))
        const next = coolRef.current.map((v, j) => (j === i ? true : v))
        coolRef.current = next
        setCooled(next)
        const n = next.filter(Boolean).length
        const p = posRef.current[i]
        const fx = p.x + x + ux * 30
        const fy = p.y + y + uy * 30
        ctx.sfx("pop")
        timers.after(140, () => ctx.sfx("chime"))
        ctx.haptic(12)
        ctx.progress(n / N)
        // the heat leaves as a puff of steam that turns to frost
        ctx.fx.burst(fx, fy, { count: calm ? 4 : 10, shape: "smoke", size: [10, 18], grow: 30, speed: [30, 110], life: [0.6, 1], drag: 0.95, colors: ["rgba(200,235,255,.35)"], add: false })
        ctx.fx.burst(fx, fy, { count: calm ? 6 : 16, shape: "flake", size: [3, 6], speed: [80, 220], life: [0.7, 1.2], drag: 0.95, gravity: 60, spin: 4, colors: ["rgba(220,248,255,1)", "rgba(150,220,255,1)"], add: false })
        ctx.fx.burst(fx, fy, { count: 1, shape: "ring", size: [PW * 0.3, PW * 0.3], grow: PW * 1.1, life: [0.55, 0.55], speed: [0, 0], colors: ["rgba(140,220,255,.85)"], add: true })
        if (n >= N) return finale()
        const left = N - n
        ctx.hint(left === 1 ? "One still hot — fling it away" : `${left} still hot · drag them away`)
    }

    const finale = () => {
        setPhase("final")
        ctx.hint("")
        timers.after(380, () => {
            ctx.sfx("chime")
            ctx.haptic([14, 40, 20])
            // every potato hops; a frost wave rings out from each, snow drifts down over the cooled night
            posRef.current.forEach((p, i) =>
                timers.after(i * 110, () => {
                    ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [PW * 0.35, PW * 0.35], grow: PW * 1.4, life: [0.8, 0.8], speed: [0, 0], colors: ["rgba(170,230,255,.8)"], add: true })
                    ctx.fx.burst(p.x, p.y, { count: calm ? 3 : 8, shape: "glow", size: [3, 7], speed: [30, 120], life: [0.6, 1], colors: ["rgba(200,240,255,1)", "rgba(255,255,255,1)"] })
                    if (i % 2 === 0) ctx.sfx("plink")
                })
            )
            for (let k = 0; k < (calm ? 10 : 34); k++)
                timers.after(k * 30, () => ctx.fx.add({ x: Math.random() * w, y: -10, vx: (Math.random() - 0.5) * 30, vy: 90 + Math.random() * 90, max: 2.2, size: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 2, shape: "flake", color: "rgba(225,247,255,.95)", add: false }))
        })
        timers.after(1250, () => setCaption(true))
        timers.after(calm ? 1700 : 2400, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(380)
        })
    }

    const n = cooled.filter(Boolean).length
    return (
        <>
            <div className="hpRoom" />
            <div className="hpCoolSky" style={{ opacity: phase === "final" ? 1 : n / N }} />
            {pos.map((p, i) => {
                const word = ctx.words[i] || ""
                const src = ctx.pic(i, cooled[i])
                const hasWords = !!word.trim()
                const pz = hasWords ? pic : Math.round(PH * 0.66)
                const pt = hasWords ? picTop : Math.round(PH * 0.17)
                return (
                    <div
                        key={i}
                        className={cx("hpSlot", cooled[i] && "cool", phase === "final" && "joy")}
                        style={{ left: p.x, top: p.y, ["--pw" as any]: `${PW}px`, ["--ph" as any]: `${PH}px`, ["--br" as any]: HP_SHAPES[i], ["--jd" as any]: `${1.5 + i * 0.08}s`, ["--jo" as any]: `${-i * 0.37}s`, ["--jr" as any]: `${i % 2 ? -1.2 : 1.2}deg`, ["--jy" as any]: `${i * 0.08}s` }}
                        {...binds[i]}
                        role="button"
                        aria-label={cooled[i] ? `Cooled: ${word || "your picture"}` : `Hot potato — drag it away: ${word || "your picture"}`}
                    >
                        <div className="hpPot" ref={(el) => (potRefs.current[i] = el)}>
                            <i className="hpSteam" />
                            <i className="hpSteam" />
                            <i className="hpBody" />
                            <i className="hpCold" />
                            {src ? (
                                <span className="hpPic" style={{ width: pz, height: pz, top: pt }}>
                                    <img key={src} className={cx(ctx.uploaded && "up", cooled[i] && "fresh")} src={src} alt="" draggable={false} />
                                </span>
                            ) : null}
                            {hasWords ? (
                                <span className="hpWords" style={{ top: pt + pz + 6, fontSize: fpx, maxHeight: fpx * 1.15 * 2 + 1 }}>
                                    {word}
                                </span>
                            ) : null}
                        </div>
                    </div>
                )
            })}
            <div className={cx("hpCaption", caption && "on")} aria-live="polite">
                All cooled
            </div>
        </>
    )
}

tsmRitual({ id: 100, hint: "Drag each hot potato away", css: HOTPOTATO_CSS, Comp: RitualHotPotato })
