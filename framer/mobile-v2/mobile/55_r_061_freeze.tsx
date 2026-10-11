/* ================================================================== */
/* 61 · FREEZE — racing thoughts under an aurora                       */
/* ================================================================== */
// Desktop rules kept: 6 word objects; tap the word itself; exactly 3 taps per word, each adds a visible layer of
// real ice (1/3, 2/3, solid); any order; a frozen word takes no more taps; progress = fills / 18; finish ≈ 0.9 s
// after the last freeze, bonus 340. Spec intent added: on full freeze the block cracks and SHATTERS — the ice
// and the user's letters burst into shards. Fixed: the frozen word is really gone (no copied label left
// behind), faces calm per frozen word (not by global progress), no tiny counters, full words.

const FZ_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="61"] .fzSky{position:absolute;inset:0;background:
  radial-gradient(90% 30% at 30% 12%, rgba(80,255,190,.20) 0%, transparent 70%),
  radial-gradient(70% 26% at 78% 20%, rgba(120,140,255,.22) 0%, transparent 70%),
  linear-gradient(180deg,#050c1e 0%,#0a1a34 40%,#0f2b45 72%,#1b4a62 86%,#2c6a80 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="61"] .fzSky{background:
  radial-gradient(90% 30% at 30% 12%, rgba(160,255,220,.55) 0%, transparent 70%),
  radial-gradient(70% 26% at 78% 20%, rgba(200,210,255,.6) 0%, transparent 70%),
  linear-gradient(180deg,#cfe4f6 0%,#dcecf8 40%,#e8f4fb 72%,#d2ebf5 86%,#b9dcec 100%)}
.tsm .tsmRitualLayer[data-rid="61"] .fzAurora{position:absolute;left:-20%;right:-20%;top:0;height:46%;pointer-events:none;opacity:.55;animation:fzAur 9s ease-in-out infinite;
  background:linear-gradient(170deg,transparent 30%,rgba(90,255,190,.20) 44%,transparent 56%),linear-gradient(190deg,transparent 40%,rgba(140,120,255,.18) 52%,transparent 64%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="61"] .fzAurora{opacity:.8}
@keyframes fzAur{0%,100%{transform:translateX(-4%) skewX(-4deg);opacity:.4}50%{transform:translateX(4%) skewX(4deg);opacity:.75}}
.tsm .tsmRitualLayer[data-rid="61"] .fzGround{position:absolute;left:0;right:0;bottom:0;height:12%;pointer-events:none;
  background:radial-gradient(70% 100% at 50% 100%, rgba(200,240,255,.35) 0%, transparent 70%),linear-gradient(180deg,transparent,rgba(190,230,255,.12))}
.tsm .tsmRitualLayer[data-rid="61"] .fzThaw{position:absolute;inset:0;opacity:0;transition:opacity 1.6s ease;pointer-events:none;
  background:radial-gradient(80% 50% at 50% 90%, rgba(255,206,150,.6) 0%, rgba(255,170,130,.22) 45%, transparent 78%),linear-gradient(180deg,rgba(120,170,220,.1),rgba(255,190,150,.22))}
.tsm .tsmRitualLayer[data-rid="61"] .fzRoot.thaw .fzThaw{opacity:1}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);touch-action:none;cursor:pointer;
  animation:fzBob var(--bob,4.6s) ease-in-out infinite;animation-delay:var(--bd,0s)}
@keyframes fzBob{0%,100%{transform:translate3d(0,-3px,0)}50%{transform:translate3d(0,4px,0)}}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot.f3{animation:none}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot .fzIn{position:absolute;inset:0;transition:transform .14s cubic-bezier(.3,1.6,.5,1)}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot.press .fzIn{transform:scale(1.06,.9)}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="61"] .fzIce{position:absolute;inset:0;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="61"] .fzIce i{position:absolute;opacity:0;transform:scale(.6);transition:opacity .28s ease, transform .4s cubic-bezier(.3,1.5,.5,1)}
.tsm .tsmRitualLayer[data-rid="61"] .fzIce i.on{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="61"] .fzIce .l1{inset:-3%;border-radius:50%;
  background:radial-gradient(circle, transparent 58%, rgba(210,245,255,.55) 70%, rgba(255,255,255,.9) 76%, rgba(190,235,255,.3) 80%, transparent 82%),
  conic-gradient(from 0deg, rgba(255,255,255,.0), rgba(255,255,255,.5) 20deg, rgba(255,255,255,0) 40deg, rgba(255,255,255,.4) 110deg, rgba(255,255,255,0) 140deg, rgba(255,255,255,.5) 230deg, rgba(255,255,255,0) 260deg, rgba(255,255,255,.45) 320deg, rgba(255,255,255,0) 350deg);
  -webkit-mask-image:radial-gradient(circle, transparent 60%, #000 66%, #000 79%, transparent 82%);mask-image:radial-gradient(circle, transparent 60%, #000 66%, #000 79%, transparent 82%)}
.tsm .tsmRitualLayer[data-rid="61"] .fzIce .l2{left:-2%;right:-2%;bottom:-2%;top:44%;border-radius:0 0 50% 50% / 0 0 100% 100%;transform-origin:50% 100%;
  clip-path:polygon(0 18%,9% 4%,19% 16%,30% 0,42% 14%,53% 2%,64% 15%,75% 0,86% 12%,100% 3%,100% 100%,0 100%);
  background:linear-gradient(180deg,rgba(235,252,255,.82) 0%,rgba(170,225,250,.72) 40%,rgba(120,190,235,.78) 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.9)}
.tsm .tsmRitualLayer[data-rid="61"] .fzIce .l3{inset:-9%;border-radius:24%;transform-origin:50% 100%;
  background:
    linear-gradient(135deg, rgba(255,255,255,.75) 0%, rgba(255,255,255,0) 22%),
    linear-gradient(315deg, rgba(90,160,220,.5) 0%, rgba(90,160,220,0) 30%),
    linear-gradient(60deg, transparent 46%, rgba(255,255,255,.35) 48%, transparent 51%),
    linear-gradient(180deg, rgba(220,248,255,.80), rgba(150,210,245,.78));
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.85), inset 0 -10px 20px rgba(80,150,210,.45), 0 10px 28px rgba(60,150,220,.35)}
.tsm .tsmRitualLayer[data-rid="61"] .fzIce svg{position:absolute;inset:-9%;width:118%;height:118%;opacity:0;transition:opacity .12s}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot.crack .fzIce svg{opacity:1}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot.crack .fzIn{animation:fzJolt .3s linear}
@keyframes fzJolt{0%,100%{transform:none}25%{transform:translate(-3px,1px)}50%{transform:translate(3px,-1px)}75%{transform:translate(-2px,0)}}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot.gone{animation:none;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="61"] .fzSlot.gone .fzIn{transform:scale(1.15);opacity:0;transition:transform .12s ease-out, opacity .12s ease-out}
.tsm .tsmRitualLayer[data-rid="61"] .fzCap{position:absolute;left:0;right:0;top:40%;text-align:center;font-size:30px;font-weight:600;letter-spacing:.04em;color:#e8f8ff;opacity:0;transform:translateY(10px);transition:opacity 1s ease .5s, transform 1.2s ease .5s;pointer-events:none;text-shadow:0 2px 16px rgba(120,200,255,.55)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="61"] .fzCap{color:#24506e;text-shadow:0 2px 12px rgba(255,255,255,.8)}
.tsm .tsmRitualLayer[data-rid="61"] .fzRoot.thaw .fzCap{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="61"] .fzSlot,.tsm .tsmRitualLayer[data-rid="61"] .fzAurora{animation:none}}
`

function RitualFreeze({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [fills, setFills] = React.useState<number[]>(() => Array(N).fill(0))
    const [crack, setCrack] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [gone, setGone] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [press, setPress] = React.useState(-1)
    const [thaw, setThaw] = React.useState(false)
    const fillsRef = React.useRef<number[]>(Array(N).fill(0)) // source of truth: rapid taps never drop a fill
    const doneRef = React.useRef(false)
    const timers = useTimers()

    const TOP = 10
    const area = { w, h: Math.max(240, h - 84 - TOP) }
    const grid = React.useMemo(() => tsmGrid(N, area, 2, 136, 22, 0.28), [area.w, area.h])
    const d = grid.d
    const pos = grid.pos.map((p, i) => ({ x: p.x + (i % 2 ? -w * 0.025 : w * 0.025), y: p.y + TOP }))

    const tap = (i: number) => {
        const f0 = fillsRef.current[i]
        if (f0 >= 3 || doneRef.current) return
        const f = f0 + 1
        fillsRef.current = fillsRef.current.map((v, j) => (j === i ? f : v))
        setFills(fillsRef.current.slice())
        const total = fillsRef.current.reduce((a, b) => a + b, 0)
        ctx.progress(total / (N * 3))
        const p = pos[i]
        // frost bursts out of the tap; each layer grows from the bottom up
        ctx.fx.burst(p.x, p.y + d * (0.35 - f * 0.2), { count: 10 + f * 4, shape: "flake", size: [3, 6], speed: [40, 150], life: [0.5, 0.9], drag: 0.93, spin: 5, colors: ["rgba(230,250,255,1)", "rgba(170,225,255,1)"], add: false })
        ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [d * 0.42, d * 0.42], grow: d * 0.5, life: [0.35, 0.35], speed: [0, 0], colors: ["rgba(200,240,255,.8)"] })
        if (f < 3) {
            ctx.sfx("plink")
            ctx.haptic(7)
            if (total === 1) ctx.hint("Again — thicker ice")
            else if (f === 2) ctx.hint("Once more to freeze it solid")
            return
        }
        // solid: the word is locked still (its face calms), the block cracks, then shatters
        ctx.sfx("chime")
        ctx.haptic(18)
        timers.after(380, () => {
            setCrack((c) => c.map((v, j) => (j === i ? true : v)))
            ctx.sfx("clack")
            ctx.haptic(10)
        })
        timers.after(720, () => shatter(i))
    }

    const shatter = (i: number) => {
        const p = pos[i]
        setGone((g) => g.map((v, j) => (j === i ? true : v)))
        ctx.sfx("pop")
        timers.after(30, () => ctx.sfx("spark"))
        ctx.haptic([14, 20, 26])
        const r = d * 0.5
        ctx.fx.burst(p.x, p.y, { count: 30, shape: "shard", size: [5, 12], speed: [160, 460], life: [0.7, 1.2], gravity: 900, drag: 0.98, spin: 10, spread: r, colors: ["rgba(225,248,255,.95)", "rgba(170,222,250,.9)", "rgba(255,255,255,1)"], add: false })
        ctx.fx.burst(p.x, p.y, { count: 14, shape: "spark", size: [1.4, 2.4], speed: [220, 520], life: [0.25, 0.45], drag: 0.9, colors: ["rgba(255,255,255,1)", "rgba(190,240,255,1)"] })
        ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [r, r], grow: d * 2, life: [0.45, 0.45], speed: [0, 0], colors: ["rgba(220,250,255,.9)"] })
        const letters = Array.from(ctx.words[i] || "").filter((c) => c !== " ").slice(0, 20)
        if (letters.length)
            ctx.fx.burst(p.x, p.y + d * 0.2, { count: letters.length, shape: "text", text: letters, size: [14, 19], speed: [120, 300], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.9, 1.3], gravity: 900, drag: 0.98, spin: 9, colors: [ctx.theme === "bright" ? "rgba(30,80,120,1)" : "rgba(220,246,255,1)"], add: false })
        const frozen = fillsRef.current.filter((v) => v >= 3).length
        if (frozen < N) ctx.hint(frozen === N - 1 ? "Last word — freeze it solid" : "Tap the next word 3×")
    }

    const finale = () => {
        if (doneRef.current) return
        doneRef.current = true
        ctx.hint("")
        timers.after(300, () => {
            setThaw(true)
            ctx.sfx("chime")
            ctx.haptic([10, 40, 10])
            for (let k = 0; k < 26; k++)
                timers.after(k * 45, () => ctx.fx.add({ x: Math.random() * w, y: -10, vx: (Math.random() - 0.5) * 30, vy: 150 + Math.random() * 90, size: 3 + Math.random() * 4, max: 2.6, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 2, shape: "flake", color: "rgba(235,250,255,.95)", add: false }))
        })
        timers.after(1200, () => {
            for (let k = 0; k < 10; k++) timers.after(k * 60, () => ctx.fx.add({ x: w * (0.15 + Math.random() * 0.7), y: h * (0.6 + Math.random() * 0.25), vy: -50, size: 3 + Math.random() * 4, max: 1.2, shape: "glow", color: "rgba(255,214,170,1)" }))
        })
        timers.after(2350, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(340)
        })
    }

    // the last shatter can land on any word: finish when every block is gone
    const goneCount = gone.filter(Boolean).length
    React.useEffect(() => {
        if (goneCount === N) finale()
    }, [goneCount])

    React.useEffect(() => {
        ctx.hint("Tap a word 3× to freeze it")
    }, [])

    return (
        <div className={cx("fzRoot", thaw && "thaw")} style={{ position: "absolute", inset: 0 }}>
            <div className="fzSky" />
            <div className="fzAurora" />
            <div className="fzGround" />
            <div className="fzThaw" />
            {pos.map((p, i) => {
                const f = fills[i]
                return (
                    <div
                        key={i}
                        className={cx("fzSlot", press === i && "press", f >= 3 && "f3", crack[i] && "crack", gone[i] && "gone")}
                        style={{ left: p.x, top: p.y, ["--d" as any]: `${d}px`, ["--bob" as any]: `${4.2 + (i % 3) * 0.6}s`, ["--bd" as any]: `${-i * 0.7}s` }}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            if (fillsRef.current[i] >= 3) return
                            setPress(i)
                            tap(i)
                            timers.after(110, () => setPress((v) => (v === i ? -1 : v)))
                        }}
                        role="button"
                        aria-label={`Freeze: ${ctx.words[i] || "your picture"} (${f} of 3)`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                tap(i)
                            }
                        }}
                    >
                        <div className="fzIn">
                            <Orb src={ctx.pic(i, f >= 3)} text={ctx.words[i]} d={d} hue={ctx.hue(i)} hue2={196} mood={f >= 3 ? "none" : f === 2 ? "tremble" : "nervous"} aura={f >= 3 ? 0.6 : 0} uploaded={ctx.uploaded} />
                            <div className="fzIce">
                                <i className={cx("l1", f >= 1 && "on")} />
                                <i className={cx("l2", f >= 2 && "on")} />
                                <i className={cx("l3", f >= 3 && "on")} />
                                <svg viewBox="0 0 100 100" aria-hidden="true">
                                    <path d="M50 50 L22 14 M50 50 L86 22 M50 50 L90 64 M50 50 L60 92 M50 50 L14 70 M50 50 L8 40 M34 30 L26 38 M70 36 L78 44 M54 74 L66 78" stroke="rgba(255,255,255,.95)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )
            })}
            <div className="fzCap" aria-live="polite">
                {thaw ? "Still." : ""}
            </div>
        </div>
    )
}

tsmRitual({ id: 61, hint: "Tap a word 3× to freeze it", css: FZ_CSS, Comp: RitualFreeze })
