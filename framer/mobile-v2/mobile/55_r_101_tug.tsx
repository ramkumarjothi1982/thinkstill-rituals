/* ================================================================== */
/* 101 · TUG OF WAR — a rope across a meadow at golden hour            */
/* ================================================================== */
// Desktop rules kept (E05, explicit progress): 6 thought parts, one at a time, tied to the middle of the rope;
// pull LEFT to build tension (a short pull springs back with no credit; ready at ≈ 37 % of a full pull, the
// desktop's 34 / 100); an explicit let-go per part; progress n/6 per release; the rope collapses out of the
// contest at the end; bonus 440. Changed per audit §101.8-9: letting go of the taut rope IS the release (no
// separate RELEASE button) — lift your thumb while the rope sings. Fixed: the bubble keeps one constant size
// and its own face every round (negative while contested, happy once released); tension resets atomically per
// part; no counter to clip; the six parts are the user's 6 chunks (no repeated words); progress moves only on a
// real release, never during the pull.

const TUG_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="101"] .twSky{position:absolute;inset:0;background:
  radial-gradient(60% 34% at 78% 20%, rgba(255,226,160,.85) 0%, rgba(255,170,100,.35) 40%, transparent 70%),
  linear-gradient(180deg,#3a2a6a 0%,#7a4a8a 26%,#d9776a 52%,#f2a65e 66%,#f6c27a 72%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="101"] .twSky{background:
  radial-gradient(60% 34% at 78% 20%, rgba(255,250,220,1) 0%, rgba(255,214,150,.5) 40%, transparent 70%),
  linear-gradient(180deg,#a9c4f2 0%,#d6c6ee 30%,#f7c9b4 56%,#ffd7a0 72%)}
.tsm .tsmRitualLayer[data-rid="101"] .twSun{position:absolute;width:var(--s);height:var(--s);margin:calc(var(--s)*-.5) 0 0 calc(var(--s)*-.5);border-radius:50%;transition:transform 1.6s cubic-bezier(.3,1,.4,1);
  background:radial-gradient(circle, #fff6dc 0%, #ffe0a0 45%, rgba(255,200,120,.0) 70%)}
.tsm .tsmRitualLayer[data-rid="101"] .twRoot.isFin .twSun{transform:scale(1.6)}
.tsm .tsmRitualLayer[data-rid="101"] .twHills{position:absolute;left:-10%;right:-10%;pointer-events:none;
  background:radial-gradient(60% 100% at 20% 100%, #6b5a7a 60%, transparent 61%),radial-gradient(55% 100% at 78% 100%, #7d6080 60%, transparent 61%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="101"] .twHills{background:radial-gradient(60% 100% at 20% 100%, #c7a9bf 60%, transparent 61%),radial-gradient(55% 100% at 78% 100%, #d6b2bf 60%, transparent 61%)}
.tsm .tsmRitualLayer[data-rid="101"] .twGrass{position:absolute;left:0;right:0;bottom:0;pointer-events:none;
  background:radial-gradient(120% 40% at 50% 0%, rgba(255,214,120,.45), transparent 60%),linear-gradient(180deg,#5f8a3e 0%,#4a7433 30%,#34572a 70%,#273f22 100%);border-radius:50% 50% 0 0/26px 26px 0 0}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="101"] .twGrass{background:radial-gradient(120% 40% at 50% 0%, rgba(255,240,170,.7), transparent 60%),linear-gradient(180deg,#9cc96a 0%,#86b85a 35%,#6fa04c 75%,#5f8f42 100%)}
.tsm .tsmRitualLayer[data-rid="101"] .twChalk{position:absolute;width:4px;margin-left:-2px;border-radius:2px;pointer-events:none;
  background:repeating-linear-gradient(180deg, rgba(255,255,255,.75) 0 12px, transparent 12px 20px)}
.tsm .tsmRitualLayer[data-rid="101"] .twFoe{position:absolute;top:0;bottom:0;right:0;width:22%;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(40,20,60,.35) 60%,rgba(30,12,48,.6))}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="101"] .twFoe{background:linear-gradient(90deg,transparent,rgba(110,70,120,.18) 60%,rgba(90,50,110,.32))}
.tsm .tsmRitualLayer[data-rid="101"] .twRoot.isFin .twFoe{opacity:0;transition:opacity 1s ease}
.tsm .tsmRitualLayer[data-rid="101"] .twRope{position:absolute;left:0;height:16px;margin-top:-8px;border-radius:8px;transform-origin:0 50%;pointer-events:none;will-change:transform;
  background:repeating-linear-gradient(-62deg, #e9c48a 0 5px, #b98a4f 5px 10px, #d6aa6c 10px 14px);box-shadow:0 0 0 1px rgba(90,50,20,.45), 0 7px 8px rgba(20,30,10,.35), inset 0 -3px 0 rgba(90,50,20,.35)}
.tsm .tsmRitualLayer[data-rid="101"] .twRope i{position:absolute;inset:-6px -2px;border-radius:12px;opacity:0;background:linear-gradient(180deg,transparent,rgba(255,240,190,.85) 50%,transparent)}
.tsm .tsmRitualLayer[data-rid="101"] .twRopeWrap{position:absolute;inset:0;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="101"] .twRoot.isTaut .twRopeWrap{animation:twSing .09s linear infinite}
@keyframes twSing{0%{transform:translateY(-1.6px)}50%{transform:translateY(1.6px)}100%{transform:translateY(-1.6px)}}
.tsm .tsmRitualLayer[data-rid="101"] .twGrip{position:absolute;width:76px;height:96px;margin:-48px 0 0 -38px;touch-action:none;cursor:grab;will-change:transform}
.tsm .tsmRitualLayer[data-rid="101"] .twGrip b{position:absolute;inset:0;border-radius:38px;
  background:radial-gradient(70% 40% at 40% 22%, rgba(255,255,255,.45), transparent 60%),repeating-linear-gradient(-28deg, #f0cf94 0 7px, #c19353 7px 14px, #dcb070 14px 19px);
  box-shadow:inset 0 0 0 2px rgba(120,70,30,.35), 0 10px 18px rgba(40,20,10,.35)}
.tsm .tsmRitualLayer[data-rid="101"] .twGrip em{position:absolute;inset:-10px;border-radius:48px;border:2px solid rgba(255,240,200,.75);animation:tsmRing 1.8s ease-out infinite;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="101"] .twRoot.isHeld .twGrip em{animation:none;opacity:0}
.tsm .tsmRitualLayer[data-rid="101"] .twChev{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-left:3px solid rgba(255,246,220,.95);border-bottom:3px solid rgba(255,246,220,.95);border-radius:0 0 0 3px;transform:rotate(45deg);animation:twChev 1.5s ease-in-out infinite;animation-delay:var(--cd)}
@keyframes twChev{0%,100%{opacity:.12}45%{opacity:.95}}
.tsm .tsmRitualLayer[data-rid="101"] .twRoot.isHeld .twChev{opacity:0;animation:none}
.tsm .tsmRitualLayer[data-rid="101"] .twOrb{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);pointer-events:none;will-change:transform}
.tsm .tsmRitualLayer[data-rid="101"] .twOrbIn{position:absolute;inset:0;animation:twIn .5s cubic-bezier(.3,1.6,.5,1) both}
@keyframes twIn{0%{opacity:0;transform:translateY(-30px) scale(.7)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="101"] .twOrbIn.free{animation:twFree 1s cubic-bezier(.3,.6,.4,1) .35s forwards}
@keyframes twFree{0%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-90px) scale(.86)}}
.tsm .tsmRitualLayer[data-rid="101"] .twOrb .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="101"] .twKnot{position:absolute;left:50%;bottom:-6px;width:26px;height:20px;margin-left:-13px;border-radius:10px;background:repeating-linear-gradient(-62deg, #e9c48a 0 5px, #b98a4f 5px 10px);box-shadow:0 3px 6px rgba(40,20,10,.3)}
.tsm .tsmRitualLayer[data-rid="101"] .twPal{position:absolute;width:var(--pd);margin-left:calc(var(--pd)*-.5);text-align:center;animation:twPal .6s cubic-bezier(.3,1.7,.5,1) both;animation-delay:var(--pdl)}
@keyframes twPal{0%{opacity:0;transform:translateY(24px) scale(.5)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="101"] .twPal span{position:relative;display:block;width:var(--pd);height:var(--pd);border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 40%, hsla(var(--h),80%,75%,.5), hsla(var(--h),80%,45%,.6));box-shadow:0 0 0 2px rgba(255,240,210,.9), 0 6px 14px rgba(60,30,10,.35)}
.tsm .tsmRitualLayer[data-rid="101"] .twPal img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="101"] .twPal img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="101"] .twCap{position:absolute;left:0;right:0;text-align:center;font-size:23px;font-weight:600;color:#fff6e4;text-shadow:0 2px 14px rgba(80,30,40,.55);opacity:0;transform:translateY(8px);transition:opacity .9s ease, transform .9s ease;pointer-events:none}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="101"] .twCap{color:#24360f;text-shadow:0 1px 0 rgba(255,255,255,.5)}
.tsm .tsmRitualLayer[data-rid="101"] .twCap.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="101"] .twRoot.isTaut .twRopeWrap,.tsm .tsmRitualLayer[data-rid="101"] .twGrip em,.tsm .tsmRitualLayer[data-rid="101"] .twChev{animation:none}}
`

function RitualTug({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [round, setRound] = React.useState(0)
    const [freed, setFreed] = React.useState(false)
    const [held, setHeld] = React.useState(false)
    const [taut, setTaut] = React.useState(false)
    const [ropeOn, setRopeOn] = React.useState(true)
    const [fin, setFin] = React.useState(false)
    const [cap, setCap] = React.useState(false)
    const st = React.useRef({ round: 0, busy: false, ready: false, k: 0, buzz: 0 })
    const gripRef = React.useRef<HTMLDivElement>(null)
    const orbRef = React.useRef<HTMLDivElement>(null)
    const leftRef = React.useRef<HTMLDivElement>(null)
    const rightRef = React.useRef<HTMLDivElement>(null)
    const glowL = React.useRef<HTMLElement>(null)
    const glowR = React.useRef<HTMLElement>(null)
    const timers = useTimers()

    // layout: sky + sun on top, the rope across the middle of the meadow, the bubble tied to the rope
    const U = h - 84
    const ropeY = Math.round(U * 0.58)
    const d = Math.round(clamp(Math.min(w * 0.38, U * 0.26), 120, 150))
    const gripX = Math.round(w * 0.27)
    const orbX = Math.round(w * 0.66)
    const FULL = 150
    const READY = 56
    const gripMax = gripX - 44
    const orbY = ropeY - Math.round(d / 2) + 6

    const pose = (raw: number, trans?: string) => {
        // the rope resists: the grip moves less than the finger, the bubble less than the grip
        const k = clamp01(raw / FULL)
        const g = -Math.min(gripMax, raw * 0.62)
        const o = g * 0.42
        const jit = !trans && !ctx.reduced && raw > READY ? (Math.random() - 0.5) * 3 * k : 0
        const t = trans || ""
        if (gripRef.current) {
            gripRef.current.style.transition = t
            gripRef.current.style.transform = `translate3d(${g}px,${jit}px,0) rotate(${-8 * k}deg) scale(${1 + 0.06 * k},${1 - 0.06 * k})`
        }
        if (orbRef.current) {
            orbRef.current.style.transition = t
            orbRef.current.style.transform = `translate3d(${o}px,${jit * 0.6}px,0) rotate(${-4 * k}deg)`
        }
        const lx = gripX + g
        const len = Math.max(1, orbX + o - lx)
        if (leftRef.current) {
            leftRef.current.style.transition = t
            leftRef.current.style.transform = `translate3d(${lx}px,0,0) scaleX(${len / 100})`
        }
        if (rightRef.current) {
            rightRef.current.style.transition = t
            rightRef.current.style.transform = `translate3d(${orbX + o}px,0,0)`
        }
        if (glowL.current) glowL.current.style.opacity = String(k * k)
        if (glowR.current) glowR.current.style.opacity = String(k * k)
    }

    const resetRope = () => {
        if (leftRef.current) leftRef.current.style.opacity = ""
        if (rightRef.current) rightRef.current.style.opacity = ""
        pose(0)
    }

    const bind = useDrag({
        onStart: () => {
            const s = st.current
            if (s.busy) return false
            s.ready = false
            s.k = 0
            setHeld(true)
            ctx.sfx("tap")
            ctx.haptic(8)
        },
        onMove: (m) => {
            const s = st.current
            if (s.busy) return
            const raw = Math.max(0, -m.dx)
            s.k = raw
            pose(raw)
            const ready = raw >= READY
            if (ready !== s.ready) {
                s.ready = ready
                setTaut(ready)
                if (ready) {
                    ctx.sfx("string")
                    ctx.haptic(16)
                    ctx.hint("Feel it… now let go")
                } else ctx.hint("Pull left until the rope sings")
            }
            const now = performance.now()
            if (raw > FULL * 0.7 && now - s.buzz > 90) {
                s.buzz = now
                ctx.haptic(4)
            }
        },
        onEnd: () => {
            const s = st.current
            setHeld(false)
            setTaut(false)
            if (s.busy) return
            if (s.ready) letGo()
            else {
                // not taut yet: the rope pulls you back, no credit
                pose(0, "transform .5s cubic-bezier(.3,1.6,.5,1)")
                if (s.k > 10) {
                    ctx.sfx("soft")
                    ctx.hint("Pull further · feel the tension")
                }
            }
            s.ready = false
            s.k = 0
        },
    })

    const letGo = () => {
        const s = st.current
        s.busy = true
        const n = s.round + 1
        const g = -Math.min(gripMax, s.k * 0.62)
        // the contest collapses: the far rope whips away, your end drops to the grass, the bubble floats free
        if (rightRef.current) {
            rightRef.current.style.transition = "transform .5s cubic-bezier(.2,.7,.3,1), opacity .5s ease"
            rightRef.current.style.transform = `translate3d(${w + 40}px,10px,0)`
            rightRef.current.style.opacity = "0"
        }
        if (leftRef.current) {
            leftRef.current.style.transition = "transform .6s cubic-bezier(.5,0,.8,.6), opacity .6s ease .2s"
            leftRef.current.style.transform = `translate3d(${gripX + g}px,46px,0) scaleX(${(orbX - gripX - g) / 100}) rotate(4deg)`
            leftRef.current.style.opacity = "0"
        }
        if (gripRef.current) {
            gripRef.current.style.transition = "transform .55s cubic-bezier(.5,0,.8,.6)"
            gripRef.current.style.transform = `translate3d(${g - 10}px,52px,0) rotate(-70deg)`
        }
        if (orbRef.current) {
            orbRef.current.style.transition = "transform .7s cubic-bezier(.3,1.5,.5,1)"
            orbRef.current.style.transform = "translate3d(0,-12px,0)"
        }
        setFreed(true)
        ctx.hint(n >= N ? "All six released" : "Released")
        ctx.sfx("string")
        timers.after(90, () => ctx.sfx("pop"))
        ctx.haptic(n >= N ? 30 : 16)
        ctx.fx.burst(orbX, orbY, { count: 1, shape: "ring", size: [d * 0.5, d * 0.5], grow: d * 1.3, life: [0.55, 0.55], speed: [0, 0], colors: ["rgba(255,236,180,.9)"], add: true })
        ctx.fx.burst(orbX, orbY, { count: 16, shape: "glow", size: [4, 8], speed: [80, 220], life: [0.6, 1], drag: 0.95, colors: ["rgba(255,230,170,1)", "rgba(255,255,240,1)"] })
        const letters = Array.from((ctx.words[s.round] || "").replace(/\s+/g, "")).slice(0, 18)
        if (letters.length)
            timers.after(260, () =>
                ctx.fx.burst(orbX, orbY + d * 0.22, { count: letters.length, shape: "text", text: letters, size: [14, 18], speed: [120, 210], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.7, 0.95], gravity: 60, drag: 0.97, spin: 4, colors: [ctx.theme === "bright" ? "rgba(80,40,30,1)" : "rgba(255,246,228,1)"], add: false })
            )
        ctx.progress(n / N)
        timers.after(320, () => setRopeOn(false))
        timers.after(1500, () => {
            if (n >= N) return finale()
            s.round = n
            setRound(n)
            setFreed(false)
            setRopeOn(true)
            // fresh rope, tension zeroed in one go before the next part can be pulled
            timers.after(30, () => {
                resetRope()
                s.busy = false
            })
            ctx.hint(n === N - 1 ? "Last one · pull, then let go" : `Thought ${n + 1} of 6 · pull left`)
        })
    }

    const finale = () => {
        setFin(true)
        ctx.hint("")
        ctx.sfx("chime")
        ctx.haptic([20, 60, 20])
        // no winner: the six freed thoughts sit together on the grass in the low sun
        for (let k = 0; k < 6; k++) timers.after(120 + k * 120, () => ctx.sfx("plink"))
        timers.after(900, () => {
            for (let k = 0; k < 14; k++) timers.after(k * 60, () => ctx.fx.add({ x: w * (0.1 + Math.random() * 0.8), y: ropeY + 30 + Math.random() * 60, vy: -18 - Math.random() * 20, vx: (Math.random() - 0.5) * 10, size: 2.5 + Math.random() * 2.5, max: 1.6, shape: "glow", color: "rgba(255,226,140,1)" }))
            setCap(true)
        })
        timers.after(2450, () => {
            ctx.sfx("win")
            ctx.complete(440)
        })
    }

    React.useEffect(() => {
        ctx.hint("Pull left, feel it, then let go")
        pose(0)
    }, [])

    const word = ctx.words[round]
    const pd = Math.floor(Math.min(58, (w - 40) / 6 - 6))
    const palY = ropeY + 18
    const sunS = Math.round(w * 0.36)
    return (
        <div className={cx("twRoot", held && "isHeld", taut && "isTaut", fin && "isFin")} style={{ position: "absolute", inset: 0 }}>
            <div className="twSky" />
            <i className="twSun" style={{ left: w * 0.78, top: U * 0.16, ["--s" as any]: `${sunS}px` }} />
            <div className="twHills" style={{ top: ropeY - 150, height: 84 }} />
            <div className="twGrass" style={{ top: ropeY - 70 }} />
            <div className="twFoe" />
            {!fin ? <i className="twChalk" style={{ left: w * 0.47, top: ropeY + 22, height: Math.max(40, U - ropeY - 46) }} /> : null}
            {!fin && ropeOn ? (
                <div key={`r${round}`} className="twRopeWrap">
                    <div ref={leftRef} className="twRope" style={{ top: ropeY, width: 100, transform: `translate3d(${gripX}px,0,0) scaleX(${(orbX - gripX) / 100})` }}>
                        <i ref={glowL} />
                    </div>
                    <div ref={rightRef} className="twRope" style={{ top: ropeY, width: w, transform: `translate3d(${orbX}px,0,0)` }}>
                        <i ref={glowR} />
                    </div>
                </div>
            ) : null}
            {!fin ? (
                <div ref={orbRef} key={`o${round}`} className="twOrb" style={{ left: orbX, top: orbY, ["--d" as any]: `${d}px` }}>
                    <div className={cx("twOrbIn", freed && "free")}>
                        <Orb src={ctx.pic(round, freed)} text={word} d={d} hue={ctx.hue(round)} hue2={40} mood={freed ? "happy" : taut ? "tremble" : "nervous"} aura={freed ? 0.9 : 0} uploaded={ctx.uploaded} label={word || "your picture"}>
                            {!freed ? <i className="twKnot" /> : null}
                        </Orb>
                    </div>
                </div>
            ) : null}
            {!fin
                ? [0, 1].map((k) => <i key={`c${k}`} className="twChev" style={{ left: gripX - 52 - k * 14, top: ropeY, ["--cd" as any]: `${-k * 0.2}s` }} />)
                : null}
            {!fin ? (
                <div key={`g${round}`} ref={gripRef} className="twGrip" style={{ left: gripX, top: ropeY }} {...bind} role="slider" aria-label={`Rope: pull left, then let go — ${word || "your picture"}`} aria-valuemin={0} aria-valuemax={6} aria-valuenow={round}>
                    <b />
                    <em />
                </div>
            ) : null}
            {fin
                ? Array.from({ length: N }, (_, k) => {
                      const src = ctx.pic(k, true)
                      return (
                          <div key={`p${k}`} className="twPal" style={{ left: w / 2 + (k - 2.5) * (pd + 8), top: palY + (k % 2) * 8, ["--pd" as any]: `${pd}px`, ["--h" as any]: ctx.hue(k), ["--pdl" as any]: `${0.1 + k * 0.12}s` }}>
                              <span>{src ? <img className={ctx.uploaded ? "up" : undefined} src={src} alt="" draggable={false} /> : null}</span>
                          </div>
                      )
                  })
                : null}
            <div className={cx("twCap", cap && "on")} style={{ top: palY + pd + 34 }} aria-live="polite">
                No winner needed
            </div>
        </div>
    )
}

tsmRitual({ id: 101, hint: "Pull left, feel it, then let go", css: TUG_CSS, Comp: RitualTug })
