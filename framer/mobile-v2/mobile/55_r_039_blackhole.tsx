/* ================================================================== */
/* 39 · BLACK HOLE — hold the singularity, gravity wins                */
/* ================================================================== */
// Desktop rules kept: one word per round (6 rounds); press and HOLD to build gravity (+2.2 every 30 ms ≈ 73 /s);
// releasing at ≥ 85 sends the word in; an early release keeps half the charge ("keep holding…"); the word
// visibly stretches with the meter (spaghetti: ×~2.8 long, ×~0.3 thin) and is then swallowed; progress k/6;
// bonus 250. Fixed / added: you hold the hole itself (pointer capture, cancel/leave = release), reaching 100
// swallows without needing a release, the thought now carries its character (picture on top, words below) and
// that character is what stretches and falls in, the face relaxes once gravity has it, the missing vanish is
// there (letters spiral into the horizon), and the finale is a quasar flash settling into a calm golden galaxy.

const BH_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="39"] .bhSpace{position:absolute;inset:0;background:
  radial-gradient(60% 40% at 22% 24%, rgba(110,60,200,.28), transparent 70%),
  radial-gradient(50% 36% at 84% 70%, rgba(40,140,200,.20), transparent 70%),
  radial-gradient(90% 60% at 50% 62%, rgba(255,170,90,.08), transparent 60%),
  linear-gradient(180deg,#05040e 0%,#0b0a1e 50%,#070614 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="39"] .bhSpace{background:
  radial-gradient(60% 40% at 22% 24%, rgba(150,110,240,.45), transparent 70%),
  radial-gradient(50% 36% at 84% 70%, rgba(90,180,240,.35), transparent 70%),
  linear-gradient(180deg,#24204a 0%,#2f2a5c 50%,#231f48 100%)}
.tsm .tsmRitualLayer[data-rid="39"] .bhStars{position:absolute;inset:0;pointer-events:none;opacity:.85;
  background-image:radial-gradient(1.2px 1.2px at 8% 12%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 26% 30%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 44% 8%,#ffe7c4 50%,transparent 51%),radial-gradient(1px 1px at 63% 22%,#fff 50%,transparent 51%),radial-gradient(1.3px 1.3px at 86% 14%,#cfe0ff 50%,transparent 51%),radial-gradient(1px 1px at 92% 40%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 12% 52%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 34% 70%,#cfe0ff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 74% 86%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 6% 90%,#ffe7c4 50%,transparent 51%),radial-gradient(1px 1px at 54% 94%,#fff 50%,transparent 51%),radial-gradient(1.1px 1.1px at 96% 70%,#fff 50%,transparent 51%);
  animation:tsmPulse 7s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="39"] .bhGalaxy{position:absolute;border-radius:50%;pointer-events:none;opacity:0;transition:opacity 1.6s ease;
  background:conic-gradient(from 0deg, rgba(255,214,140,.0), rgba(255,214,140,.7) 40deg, rgba(255,190,110,.08) 110deg, rgba(255,226,160,.65) 190deg, rgba(255,190,110,.08) 270deg, rgba(255,214,140,.6) 330deg, rgba(255,214,140,0) 360deg);
  -webkit-mask-image:radial-gradient(circle, transparent 18%, #000 30%, rgba(0,0,0,.5) 55%, transparent 70%);mask-image:radial-gradient(circle, transparent 18%, #000 30%, rgba(0,0,0,.5) 55%, transparent 70%);animation:tsmSpin 26s linear infinite}
.tsm .tsmRitualLayer[data-rid="39"] .bhGalaxy.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="39"] .bhDisk{position:absolute;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="39"] .bhDisk i{position:absolute;inset:0;border-radius:50%;will-change:transform;
  background:conic-gradient(from 0deg, rgba(255,150,80,.0), rgba(255,170,90,.75) 50deg, rgba(255,230,180,.9) 80deg, rgba(200,120,255,.4) 160deg, rgba(255,150,80,.05) 220deg, rgba(120,200,255,.55) 290deg, rgba(255,150,80,0) 360deg);
  -webkit-mask-image:radial-gradient(circle, transparent 46%, #000 52%, #000 64%, transparent 72%);mask-image:radial-gradient(circle, transparent 46%, #000 52%, #000 64%, transparent 72%)}
.tsm .tsmRitualLayer[data-rid="39"] .bhHole{position:absolute;will-change:transform;transition:transform .5s cubic-bezier(.3,1.4,.5,1)}
.tsm .tsmRitualLayer[data-rid="39"] .bhLens{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle, transparent 42%, rgba(190,150,255,.35) 50%, transparent 66%)}
.tsm .tsmRitualLayer[data-rid="39"] .bhHit{position:absolute;border-radius:50%;touch-action:none;cursor:pointer;-webkit-touch-callout:none}
.tsm .tsmRitualLayer[data-rid="39"] .bhCue{position:absolute;inset:6%;border-radius:50%;border:2px solid rgba(255,226,190,.5);animation:bhCue 2.4s ease-out infinite;pointer-events:none}
@keyframes bhCue{0%{transform:scale(.8);opacity:0}30%{opacity:1}100%{transform:scale(1.18);opacity:0}}
.tsm .tsmRitualLayer[data-rid="39"] .bhOrb{position:absolute;left:0;top:0;width:var(--d);height:var(--d);will-change:transform;transform-origin:50% 0%;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="39"] .bhOrbIn{position:absolute;inset:0;animation:bhIn .8s cubic-bezier(.25,1.2,.5,1) both}
@keyframes bhIn{0%{opacity:0;transform:scale(.4)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="39"] .bhOrb .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="39"] .bhCaption{position:absolute;left:0;right:0;text-align:center;font-size:22px;font-weight:600;letter-spacing:.02em;color:#ffe6b8;text-shadow:0 0 18px rgba(255,190,100,.55);opacity:0;transform:translateY(8px);transition:opacity 1s ease .4s, transform 1s ease .4s;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="39"] .bhCaption.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="39"] .bhStars,.tsm .tsmRitualLayer[data-rid="39"] .bhCue,.tsm .tsmRitualLayer[data-rid="39"] .bhGalaxy{animation:none}}
`

function RitualBlackHole({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [happy, setHappy] = React.useState(false)
    const [gone, setGone] = React.useState(false)
    const [holding, setHolding] = React.useState(false)
    const [fin, setFin] = React.useState(false)
    const [flare, setFlare] = React.useState(0)
    const timers = useTimers()
    const orbRef = React.useRef<HTMLDivElement>(null)
    const diskRef = React.useRef<HTMLElement>(null)
    const holeRef = React.useRef<HTMLDivElement>(null)
    const meterRef = React.useRef(0) // 0..100
    const shownRef = React.useRef(0)
    const holdRef = React.useRef(false)
    const busyRef = React.useRef(false)
    const swallowRef = React.useRef(-1) // swallow tween 0..1 (−1 = idle)
    const spinRef = React.useRef(0)
    const tickRef = React.useRef(0)
    const flipRef = React.useRef(false)
    const lastRef = React.useRef(0)
    // gravity: +2.2 every 30 ms of holding, measured on the wall clock (a slow phone must not need a longer hold)
    const charge = () => {
        const now = performance.now()
        meterRef.current = Math.min(100, meterRef.current + ((now - lastRef.current) / 30) * 2.2)
        lastRef.current = now
    }
    const idxRef = useLatest(idx)

    // ---- layout: the word orbits high, the singularity sits in the thumb zone ----
    const holeD = Math.round(clamp(Math.min(w * 0.42, h * 0.26), 130, 176))
    const hx = w / 2
    const hy = Math.round(clamp(h * 0.6, holeD * 0.5 + 200, h - 96 - holeD * 0.5))
    const d = Math.round(clamp(Math.min(w * 0.34, h * 0.2), 104, 136))
    const R = Math.max(d * 0.5 + holeD * 0.5 + 34, Math.min(hy - d * 0.5 - 16, h * 0.4))
    const TH = 85

    const orbPose = (t: number) => {
        const m = shownRef.current / 100
        const swing = ctx.reduced ? 0 : Math.sin(t * 0.55) * 0.3 * (1 - m)
        const sw = swallowRef.current
        const r = R * (1 - 0.3 * m) * (sw >= 0 ? 1 - sw : 1)
        const cx0 = hx + Math.sin(swing) * r
        const cy0 = hy - Math.cos(swing) * r
        const sy = sw >= 0 ? (1 + 1.8 * m) * (1 - sw) + 0.01 : 1 + 1.8 * m
        const sx = sw >= 0 ? Math.max(0.02, (1 - 0.7 * m) * (1 - sw)) : 1 - 0.7 * m
        // the orb hangs from its top edge and stretches down into the hole (spaghetti)
        const jit = !ctx.reduced && holdRef.current ? (Math.random() - 0.5) * 2 * m : 0
        return `translate3d(${cx0 - d / 2 + jit}px,${cy0 - d / 2}px,0) rotate(${-swing * 0.45}rad) scale(${sx},${sy})`
    }

    useFrame((dt, t) => {
        // gravity builds while held (no decay while released, like the desktop)
        if (holdRef.current && !busyRef.current) {
            charge()
            tickRef.current += dt
            if (tickRef.current > 0.16) {
                tickRef.current = 0
                ctx.haptic(meterRef.current >= TH ? 8 : 4)
            }
            if (meterRef.current >= TH && !flipRef.current) {
                flipRef.current = true
                setHappy(true)
                ctx.sfx("plink")
                ctx.hint("Let go — let it fall in")
            }
            if (meterRef.current >= 100) swallow()
            // dust is pulled in from all around
            if (!ctx.reduced && Math.random() < 0.5) {
                const a = Math.random() * Math.PI * 2
                const rr = holeD * (0.9 + Math.random() * 0.5)
                ctx.fx.add({ x: hx + Math.cos(a) * rr, y: hy + Math.sin(a) * rr * 0.6, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 40, max: 0.9, size: 1.5 + Math.random() * 2, shape: "glow", color: "rgba(255,210,160,1)", drag: 0.97, swirl: { cx: hx, cy: hy, k: 2.5, pull: 7 } })
            }
        }
        shownRef.current += (meterRef.current - shownRef.current) * Math.min(1, dt * 14)
        if (swallowRef.current >= 0 && swallowRef.current < 1) swallowRef.current = Math.min(1, swallowRef.current + dt / 0.42)
        const o = orbRef.current
        if (o) o.style.transform = orbPose(t)
        const m = shownRef.current / 100
        spinRef.current += dt * (0.5 + 4.5 * m + (fin ? 0.4 : 0))
        const dk = diskRef.current
        if (dk) dk.style.transform = `rotate(${spinRef.current}rad)`
        const hl = holeRef.current
        if (hl) hl.style.transform = `scale(${1 + 0.12 * m})`
    })

    const swallow = () => {
        if (busyRef.current) return
        busyRef.current = true
        holdRef.current = false
        setHolding(false)
        setHappy(true)
        swallowRef.current = 0
        ctx.sfx("hum")
        ctx.haptic([18, 40, 26])
        const i = idxRef.current
        // the words spiral over the event horizon, letter by letter
        const letters = Array.from(ctx.words[i] || "").filter((c) => c !== " ")
        const oy = hy - R * 0.7
        letters.slice(0, 20).forEach((c, k) => {
            const a = -Math.PI / 2 + (k - letters.length / 2) * 0.12
            ctx.fx.add({ x: hx + Math.cos(a) * R * 0.62, y: oy + (k % 3) * 8, vx: (k - letters.length / 2) * 10, vy: 40, max: 1.1, size: 15, rot: 0, vr: 4, shape: "text", text: c, color: "rgba(255,236,210,1)", drag: 0.965, swirl: { cx: hx, cy: hy, k: 3.5, pull: 9 } })
        })
        timers.after(420, () => {
            setGone(true)
            setFlare((f) => f + 1)
            ctx.sfx("spark")
            ctx.fx.burst(hx, hy, { count: 1, shape: "ring", size: [holeD * 0.4, holeD * 0.4], grow: holeD * 2.2, life: [0.8, 0.8], speed: [0, 0], colors: ["rgba(255,226,180,.85)"], add: true })
            ctx.fx.burst(hx, hy, { count: 14, shape: "spark", size: [2, 3], speed: [120, 260], life: [0.4, 0.7], drag: 0.9, colors: ["rgba(255,240,210,1)", "rgba(200,160,255,1)"], add: true })
            const n = i + 1
            ctx.progress(n / N)
            meterRef.current = 0
            if (n >= N) {
                timers.after(500, finale)
                return
            }
            ctx.hint(n === N - 1 ? "Last one — hold the black hole" : `Gone far away · ${N - n} more`)
            timers.after(700, () => {
                swallowRef.current = -1
                shownRef.current = 0
                setGone(false)
                setHappy(false)
                flipRef.current = false
                setIdx(n)
                busyRef.current = false
            })
        })
    }

    const hold = useDrag({
        tapSlop: 9999,
        onStart: () => {
            if (busyRef.current || fin) return false
            holdRef.current = true
            lastRef.current = performance.now()
            tickRef.current = 0
            setHolding(true)
            ctx.sfx("hum")
            ctx.haptic(10)
            if (meterRef.current < TH) ctx.hint("Hold… gravity is building")
        },
        onEnd: () => {
            if (!holdRef.current) return
            charge()
            holdRef.current = false
            setHolding(false)
            if (busyRef.current) return
            if (meterRef.current >= TH) swallow()
            else {
                meterRef.current = meterRef.current * 0.5
                ctx.sfx("soft")
                ctx.haptic(6)
                ctx.hint("Keep holding…")
            }
        },
    })

    const finale = () => {
        ctx.hint("")
        setFin(true)
        // a quasar flash: two jets of light, then the hole settles into a calm golden galaxy
        ctx.sfx("spark")
        ctx.haptic([20, 60, 20])
        for (let k = 0; k < 2; k++) {
            const dir = k ? 1 : -1
            for (let j = 0; j < 18; j++)
                timers.after(j * 22, () => ctx.fx.add({ x: hx + (Math.random() - 0.5) * 6, y: hy, vx: (Math.random() - 0.5) * 30, vy: dir * (700 + Math.random() * 300), max: 0.7, size: 3, shape: "streak", color: "rgba(220,210,255,1)", add: true }))
        }
        ctx.fx.burst(hx, hy, { count: 1, shape: "ring", size: [holeD * 0.4, holeD * 0.4], grow: w * 1.4, life: [1.2, 1.2], speed: [0, 0], colors: ["rgba(255,240,220,.9)"], add: true })
        timers.after(500, () => {
            setFlare((f) => f + 1)
            ctx.sfx("chime")
            for (let k = 0; k < 40; k++) {
                const a = (k / 40) * Math.PI * 4
                const rr = holeD * 0.6 + k * 4
                ctx.fx.add({ x: hx + Math.cos(a) * rr, y: hy + Math.sin(a) * rr * 0.5, vx: 0, vy: 0, max: 1.8, size: 2 + Math.random() * 3, shape: "glow", color: k % 2 ? "rgba(255,214,140,1)" : "rgba(255,240,210,1)", swirl: { cx: hx, cy: hy, k: 0.9, pull: 0 } })
            }
        })
        timers.after(2400, () => {
            ctx.sfx("win")
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Hold the black hole")
    }, [])

    const word = ctx.words[idx]
    const diskW = holeD * 2.1
    const diskH = holeD * 0.62
    return (
        <>
            <div className="bhSpace" />
            <div className="bhStars" />
            <i className={cx("bhGalaxy", fin && "on")} style={{ left: hx - holeD * 1.7, top: hy - holeD * 1.7, width: holeD * 3.4, height: holeD * 3.4 }} />
            <i className="bhLens" style={{ left: hx - holeD, top: hy - holeD, width: holeD * 2, height: holeD * 2 }} />
            {/* the word's orbit sits behind the hole: the stretched end vanishes over the horizon */}
            {!gone && !fin ? (
                <div key={idx} ref={orbRef} className="bhOrb" style={{ ["--d" as any]: `${d}px`, transform: `translate3d(${hx - d / 2}px,${hy - R - d / 2}px,0)` }}>
                    <div className="bhOrbIn">
                        <Orb src={ctx.pic(idx, happy)} text={word} d={d} hue={ctx.hue(idx)} hue2={40} mood={happy ? "happy" : holding ? "tremble" : MOOD_FOR_CHAR[ctx.char(idx)] || "nervous"} aura={happy ? 0.7 : 0} uploaded={ctx.uploaded} label={word || "your picture"} />
                    </div>
                </div>
            ) : null}
            <div className="bhDisk" style={{ left: hx - diskW / 2, top: hy - diskH / 2, width: diskW, height: diskH }} aria-hidden="true">
                <div style={{ position: "absolute", left: 0, top: (diskH - diskW) / 2, width: diskW, height: diskW, transform: `scaleY(${diskH / diskW})` }}>
                    <i ref={diskRef} />
                </div>
            </div>
            <div ref={holeRef} className="bhHole" style={{ left: hx - holeD / 2, top: hy - holeD / 2, width: holeD, height: holeD }}>
                <Eclipse size={holeD} breathSeconds={6} flareKey={flare} motes={!ctx.reduced} still={ctx.reduced} />
            </div>
            <div className="bhHit" style={{ left: hx - holeD * 0.65, top: hy - holeD * 0.65, width: holeD * 1.3, height: holeD * 1.3 }} {...hold} onContextMenu={(e) => e.preventDefault()} role="button" aria-label={`Hold to pull in: ${word || "your picture"}`}>
                {!holding && !fin ? <i className="bhCue" aria-hidden="true" /> : null}
            </div>
            <div className={cx("bhCaption", fin && "on")} style={{ top: Math.min(h - 110, hy + holeD * 0.78) }}>
                Tiny, from here.
            </div>
        </>
    )
}

tsmRitual({ id: 39, hint: "Hold the black hole", css: BH_CSS, Comp: RitualBlackHole })
