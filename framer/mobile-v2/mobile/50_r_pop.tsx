/* ================================================================== */
/* 1 · POP — twilight lagoon                                           */
/* ================================================================== */
// Desktop rules kept: 6 bubbles (one per word chunk), one tap = one instant pop in any order, no fail state,
// progress = popped / 6, faces move negative → positive as the release grows, finish when every bubble is
// gone, bonus 260 + 18 per pop. Mobile: a staggered 2×3 layout that never clips or overlaps; the user's words
// burst into letters that float away; each pop relaxes the nearest remaining character; the last pop sends a
// chain of light into the Eclipse moon (the founder's "spectacular chain reaction").

const MOOD_FOR_CHAR: Record<string, Mood> = { rush: "tremble", glitch: "nervous", drop: "droop", loopie: "tilt", patch: "droop", sync: "nervous", still: "float" }

const POP_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="1"] .popSky{position:absolute;inset:0;background:
  radial-gradient(120% 60% at 50% 78%, rgba(255,170,120,.30) 0%, transparent 55%),
  linear-gradient(180deg,#0d0b2a 0%,#24164f 38%,#4a2466 62%,#7a3c6b 74%,#1a2a52 75%,#0b1834 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="1"] .popSky{background:
  radial-gradient(120% 60% at 50% 78%, rgba(255,214,170,.65) 0%, transparent 55%),
  linear-gradient(180deg,#cfd7ff 0%,#e9d9ff 40%,#ffd9c8 70%,#ffc9a8 74.6%,#9fc4ef 75%,#7aa6dc 100%)}
.tsm .tsmRitualLayer[data-rid="1"] .popStars{position:absolute;inset:0 0 30% 0;opacity:.7;
  background-image:radial-gradient(1.2px 1.2px at 12% 18%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 33% 9%,#fff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 58% 22%,#ffe9c9 50%,transparent 51%),radial-gradient(1px 1px at 77% 12%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 88% 30%,#cfe3ff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 22% 40%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 46% 46%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 68% 52%,#ffe9c9 50%,transparent 51%);animation:tsmPulse 6s ease-in-out infinite}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="1"] .popStars{opacity:0}
.tsm .tsmRitualLayer[data-rid="1"] .popMoon{position:absolute;right:9%;top:6%}
.tsm .tsmRitualLayer[data-rid="1"] .popWater{position:absolute;left:0;right:0;bottom:0;height:25%;overflow:hidden;
  background:linear-gradient(180deg,rgba(120,160,255,.10),rgba(10,20,50,.0) 70%)}
.tsm .tsmRitualLayer[data-rid="1"] .popWater i{position:absolute;left:var(--l,10%);width:var(--w,40%);height:1.5px;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(255,220,190,.32),transparent);filter:blur(.6px);animation:popShimmer 7s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="1"] .popWater i:nth-child(1){top:12%;--l:30%;--w:40%;animation-duration:6s}
.tsm .tsmRitualLayer[data-rid="1"] .popWater i:nth-child(2){top:34%;--l:8%;--w:34%;opacity:.7;animation-duration:8s;animation-delay:-2s}
.tsm .tsmRitualLayer[data-rid="1"] .popWater i:nth-child(3){top:58%;--l:52%;--w:38%;opacity:.5;animation-duration:9s;animation-delay:-4s}
.tsm .tsmRitualLayer[data-rid="1"] .popWater i:nth-child(4){top:80%;--l:20%;--w:56%;opacity:.35;animation-duration:11s;animation-delay:-1s}
@keyframes popShimmer{0%,100%{transform:translateX(-8%) scaleX(.8)}50%{transform:translateX(8%) scaleX(1.05)}}
.tsm .tsmRitualLayer[data-rid="1"] .popSlot{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);animation:popBob var(--bob,5s) ease-in-out infinite;animation-delay:var(--bd,0s)}
@keyframes popBob{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(var(--bx,3px),-9px,0)}}
.tsm .tsmRitualLayer[data-rid="1"] .popSlot .tsmOrb{left:0;top:0;cursor:pointer;touch-action:none;transition:transform .12s cubic-bezier(.3,1.5,.5,1)}
.tsm .tsmRitualLayer[data-rid="1"] .popSlot.press .tsmOrb{transform:scale(1.07,.9)}
.tsm .tsmRitualLayer[data-rid="1"] .popSlot.burst{animation:none;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="1"] .popSlot.burst .tsmOrb{animation:popBurst .26s cubic-bezier(.3,.6,.4,1) forwards}
@keyframes popBurst{0%{transform:scale(1.07,.9);opacity:1}35%{transform:scale(1.22);opacity:1;filter:brightness(1.6)}100%{transform:scale(1.42);opacity:0;filter:brightness(2.4) blur(4px)}}
.tsm .tsmRitualLayer[data-rid="1"] .popSlot.gone{display:none}
.tsm .tsmRitualLayer[data-rid="1"] .popReflect{position:absolute;width:var(--d);height:calc(var(--d)*.32);margin-left:calc(var(--d)*-.5);border-radius:50%;
  background:radial-gradient(closest-side, hsla(var(--h),90%,70%,.22), transparent);filter:blur(2px);pointer-events:none;transition:opacity .3s}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="1"] .popSlot,.tsm .tsmRitualLayer[data-rid="1"] .popStars,.tsm .tsmRitualLayer[data-rid="1"] .popWater i{animation:none}}
`

function RitualPop({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [alive, setAlive] = React.useState<boolean[]>(() => Array(N).fill(true))
    const [burst, setBurst] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [happy, setHappy] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [press, setPress] = React.useState<number>(-1)
    const [flare, setFlare] = React.useState(0)
    const popsRef = React.useRef(0)
    const aliveRef = useLatest(alive)
    const timers = useTimers()

    // layout: 2 columns × 3 rows, staggered, inside the play area (never under the hint pill)
    // the sky keeps a band at the top for the Eclipse moon; bubbles live below it, above the hint pill
    const TOP = 58
    const area = { w, h: Math.max(240, h - 84 - TOP) }
    const grid = React.useMemo(() => tsmGrid(N, { w: area.w, h: area.h }, 2, 134, 22, 0.3), [area.w, area.h])
    const d = grid.d
    const pos = grid.pos.map((p, i) => ({ x: p.x + (i % 2 ? -w * 0.03 : w * 0.03), y: p.y + TOP }))
    const moonX = w * 0.5
    const moonY = 30

    const pop = (i: number) => {
        if (!aliveRef.current[i] || burst[i]) return
        const p = pos[i]
        const hue = ctx.hue(i)
        setPress(-1)
        setBurst((b) => b.map((v, j) => (j === i ? true : v)))
        ctx.sfx("pop")
        ctx.haptic(16)
        // the bubble bursts: a shock ring, droplets, sparks — and the user's words break into letters that drift away
        ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [d * 0.48, d * 0.48], grow: d * 1.6, life: [0.5, 0.5], speed: [0, 0], colors: [`hsla(${hue},100%,82%,.9)`], add: true })
        ctx.fx.burst(p.x, p.y, { count: 22, shape: "drop", size: [3, 6], speed: [180, 420], life: [0.55, 0.9], gravity: 520, drag: 0.985, colors: [`rgba(255,255,255,.95)`, `hsla(${hue},95%,75%,.95)`], add: false })
        ctx.fx.burst(p.x, p.y, { count: 14, shape: "glow", size: [5, 11], speed: [60, 200], life: [0.6, 1.1], drag: 0.94, colors: [`rgba(255,236,200,1)`, `rgba(180,220,255,1)`] })
        const letters = Array.from((ctx.words[i] || "").replace(/\s+/g, " ").trim()).filter((c) => c !== " ")
        if (letters.length) ctx.fx.burst(p.x, p.y + d * 0.2, { count: Math.min(18, letters.length), shape: "text", text: letters, size: [13, 17], speed: [40, 120], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [1.1, 1.6], gravity: -60, drag: 0.97, spin: 3, colors: [ctx.theme === "bright" ? "rgba(40,30,80,1)" : "rgba(255,255,255,1)"], add: false })
        timers.after(260, () => {
            popsRef.current += 1
            const next = aliveRef.current.map((v, j) => (j === i ? false : v))
            setAlive(next)
            const popped = next.filter((v) => !v).length
            ctx.progress(popped / N)
            // relief spreads: the nearest bubble still waiting relaxes
            const waiting = next.map((v, j) => (v ? j : -1)).filter((j) => j >= 0)
            if (waiting.length) {
                setHappy((hp) => {
                    const cand = waiting.filter((j) => !hp[j])
                    if (!cand.length) return hp
                    cand.sort((a, b) => dist(pos[a].x, pos[a].y, p.x, p.y) - dist(pos[b].x, pos[b].y, p.x, p.y))
                    return hp.map((v, j) => (j === cand[0] ? true : v))
                })
                ctx.hint(waiting.length === 1 ? "One left — pop it" : `${waiting.length} left · tap to pop`)
            } else finale()
        })
    }

    const finale = () => {
        ctx.hint("")
        // a chain of light: every popped word flies to the Eclipse moon, which flares; ripples cross the water
        timers.after(220, () => {
            pos.forEach((p, i) => {
                timers.after(i * 90, () => {
                    const ang = Math.atan2(moonY - p.y, moonX - p.x)
                    const sp = dist(p.x, p.y, moonX, moonY) / 0.62
                    ctx.fx.burst(p.x, p.y, { count: 7, shape: "glow", size: [5, 9], speed: [sp * 0.9, sp], angle: [ang - 0.05, ang + 0.05], life: [0.62, 0.7], drag: 1, colors: [`hsla(${ctx.hue(i)},100%,80%,1)`, "rgba(255,240,215,1)"] })
                    ctx.fx.burst(p.x, p.y, { count: 1, shape: "streak", size: [2.4, 2.4], speed: [sp, sp], angle: [ang, ang], life: [0.62, 0.62], drag: 1, colors: ["rgba(255,250,240,1)"] })
                })
            })
            ctx.sfx("spark")
        })
        timers.after(220 + 6 * 90 + 600, () => {
            setFlare((f) => f + 1)
            ctx.sfx("chime")
            ctx.haptic([20, 60, 20])
            ctx.fx.burst(moonX, moonY, { count: 30, shape: "glow", size: [4, 10], speed: [60, 260], life: [0.9, 1.6], drag: 0.95, colors: ["rgba(255,226,180,1)", "rgba(255,255,255,1)", "rgba(190,220,255,1)"] })
            for (let k = 0; k < 4; k++)
                timers.after(k * 240, () => ctx.fx.burst(w * 0.5, h * 0.86, { count: 1, shape: "ring", size: [20, 20], grow: w * 0.9, life: [1.4, 1.4], speed: [0, 0], colors: ["rgba(255,230,200,.7)"], add: true }))
        })
        timers.after(220 + 6 * 90 + 600 + 1500, () => {
            ctx.sfx("win")
            ctx.complete(260 + popsRef.current * 18)
        })
    }

    React.useEffect(() => {
        ctx.hint("Tap a bubble to pop it")
    }, [])

    return (
        <>
            <div className="popSky" />
            <div className="popStars" />
            <div className="popMoon" style={{ left: moonX - 30, top: moonY - 30, right: "auto" }}>
                <Eclipse size={60} breathSeconds={7} flareKey={flare} motes={false} />
            </div>
            <div className="popWater">
                <i />
                <i />
                <i />
                <i />
            </div>
            {pos.map((p, i) =>
                alive[i] ? (
                    <i key={`r${i}`} className="popReflect" style={{ left: p.x, top: Math.min(h - 40, p.y + d * 0.62), ["--d" as any]: `${d}px`, ["--h" as any]: ctx.hue(i), opacity: burst[i] ? 0 : 1 }} />
                ) : null
            )}
            {pos.map((p, i) => (
                <div
                    key={i}
                    className={cx("popSlot", press === i && "press", burst[i] && "burst", !alive[i] && "gone")}
                    style={{ left: p.x, top: p.y, ["--d" as any]: `${d}px`, ["--bob" as any]: `${4.2 + (i % 3) * 0.7}s`, ["--bd" as any]: `${-i * 0.6}s`, ["--bx" as any]: `${i % 2 ? -3 : 3}px` }}
                    onPointerDown={(e) => {
                        e.preventDefault()
                        setPress(i)
                        timers.after(70, () => pop(i))
                    }}
                    role="button"
                    aria-label={`Pop: ${ctx.words[i] || "your picture"}`}
                >
                    <Orb src={ctx.pic(i, happy[i])} text={ctx.words[i]} d={d} hue={ctx.hue(i)} hue2={46} mood={happy[i] ? "happy" : MOOD_FOR_CHAR[ctx.char(i)] || "nervous"} aura={happy[i] ? 0.8 : 0} uploaded={ctx.uploaded} />
                </div>
            ))}
        </>
    )
}

tsmRitual({ id: 1, hint: "Tap a bubble to pop it", css: POP_CSS, Comp: RitualPop })
