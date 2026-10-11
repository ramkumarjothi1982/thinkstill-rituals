/* ================================================================== */
/* 79 · MISS ON PURPOSE — a night fair with one bullseye               */
/* ================================================================== */
// Desktop rules kept (E06): 4 pads, one highlighted target; tapping any OTHER pad is a brave miss (success) and
// the target hops to the next pad (0 → 1 → 2 → 3 → 0); 5 misses in a row clear the current word; tapping the
// target resets the streak and the target stays put; words play one at a time, 6 rounds, then finish with
// bonus 250; no penalty score ever. Fixed: a hit is no longer rewarded — it gives a friendly "Too perfect!"
// nudge with no progress; the streak is visible (five lanterns under the bubble light up); the target is a
// distinct bullseye (not just a label); progress moves only on real misses; each word gets its own face,
// which turns happy when its streak completes ("perfectly imperfect").

const MS_HUES = [168, 32, 280, 200]

const MISS_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="79"] .msSky{position:absolute;inset:0;background:
  radial-gradient(90% 46% at 50% 100%, rgba(255,150,110,.30) 0%, transparent 70%),
  radial-gradient(70% 40% at 15% 8%, rgba(110,90,220,.35) 0%, transparent 70%),
  linear-gradient(180deg,#120c2c 0%,#1d1747 34%,#2a2058 60%,#3a2350 82%,#4a2a46 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="79"] .msSky{background:
  radial-gradient(90% 46% at 50% 100%, rgba(255,196,150,.65) 0%, transparent 70%),
  radial-gradient(70% 40% at 15% 8%, rgba(255,255,255,.7) 0%, transparent 70%),
  linear-gradient(180deg,#bcd3ff 0%,#d8d8ff 38%,#f4dcf0 70%,#ffd8c4 100%)}
.tsm .tsmRitualLayer[data-rid="79"] .msWire{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="79"] .msWire path{fill:none;stroke:rgba(255,220,170,.3);stroke-width:1.4}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="79"] .msWire path{stroke:rgba(120,80,60,.3)}
.tsm .tsmRitualLayer[data-rid="79"] .msRoot.isFin .msBulb{transform:scale(1.7)}
.tsm .tsmRitualLayer[data-rid="79"] .msBulb{position:absolute;width:9px;height:9px;margin:-4px 0 0 -4px;border-radius:50%;background:radial-gradient(circle,#fff6d8 0 30%,#ffc46e 60%,rgba(255,170,80,0) 100%);box-shadow:0 0 12px 3px rgba(255,190,100,.45);transition:transform .4s cubic-bezier(.3,1.8,.5,1);animation:msTwinkle 3.2s ease-in-out infinite}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="79"] .msBulb{box-shadow:0 0 10px 2px rgba(255,170,90,.6)}
@keyframes msTwinkle{0%,100%{opacity:1}50%{opacity:.55}}
.tsm .tsmRitualLayer[data-rid="79"] .msFloor{position:absolute;left:-10%;right:-10%;bottom:-6%;height:52%;border-radius:50% 50% 0 0/36% 36% 0 0;
  background:radial-gradient(60% 50% at 50% 30%, rgba(255,200,160,.16), transparent 70%),linear-gradient(180deg,rgba(60,36,86,.0),rgba(40,22,60,.55))}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="79"] .msFloor{background:radial-gradient(60% 50% at 50% 30%, rgba(255,255,255,.55), transparent 70%),linear-gradient(180deg,rgba(255,220,200,0),rgba(240,190,170,.45))}
.tsm .tsmRitualLayer[data-rid="79"] .msOrbSlot{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5)}
.tsm .tsmRitualLayer[data-rid="79"] .msOrbIn{position:absolute;inset:0;animation:msOrbIn .55s cubic-bezier(.3,1.5,.5,1) both}
.tsm .tsmRitualLayer[data-rid="79"] .msOrbIn.out{animation:msOrbOut .55s cubic-bezier(.5,0,.7,.4) forwards}
@keyframes msOrbIn{0%{opacity:0;transform:translateY(-18px) scale(.6)}100%{opacity:1;transform:none}}
@keyframes msOrbOut{0%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-46px) scale(.7) rotate(-10deg)}}
.tsm .tsmRitualLayer[data-rid="79"] .msWob{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="79"] .msOrbSlot .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="79"] .msBead{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;
  background:radial-gradient(circle at 40% 35%, rgba(255,255,255,.35), rgba(255,255,255,.08) 60%);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28);transition:transform .35s cubic-bezier(.3,1.8,.5,1)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="79"] .msBead{background:radial-gradient(circle at 40% 35%, rgba(255,255,255,.9), rgba(140,120,200,.25) 70%);box-shadow:inset 0 0 0 1.5px rgba(110,90,170,.35)}
.tsm .tsmRitualLayer[data-rid="79"] .msBead b{position:absolute;inset:-5px;border-radius:50%;opacity:0;transition:opacity .25s ease;
  background:radial-gradient(circle, #fffbe8 0 26%, #ffd27a 46%, rgba(255,170,80,.45) 62%, transparent 72%)}
.tsm .tsmRitualLayer[data-rid="79"] .msBead.on{transform:scale(1.25)}
.tsm .tsmRitualLayer[data-rid="79"] .msBead.on b{opacity:1}
.tsm .tsmRitualLayer[data-rid="79"] .msPad{position:absolute;width:var(--p);height:var(--p);margin:calc(var(--p)*-.5) 0 0 calc(var(--p)*-.5);cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent}
.tsm .tsmRitualLayer[data-rid="79"] .msPadBob{position:absolute;inset:0;animation:msBob var(--bob,4s) ease-in-out infinite;animation-delay:var(--bd,0s)}
@keyframes msBob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-5px) rotate(var(--rot,2deg))}}
.tsm .tsmRitualLayer[data-rid="79"] .msPadIn{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="79"] .msShadow{position:absolute;left:14%;right:14%;bottom:-10%;height:16%;border-radius:50%;background:radial-gradient(closest-side, rgba(0,0,0,.38), transparent)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="79"] .msShadow{background:radial-gradient(closest-side, rgba(90,50,80,.22), transparent)}
.tsm .tsmRitualLayer[data-rid="79"] .msBlob{position:absolute;inset:4%;border-radius:var(--br);transition:opacity .35s ease, transform .45s cubic-bezier(.3,1.6,.5,1);
  background:radial-gradient(70% 60% at 34% 28%, rgba(255,255,255,.75) 0%, rgba(255,255,255,.12) 32%, transparent 52%),
  radial-gradient(90% 90% at 60% 75%, hsla(var(--h),80%,42%,.95) 0%, hsla(var(--h),75%,58%,1) 55%, hsla(var(--h),90%,74%,1) 100%);
  box-shadow:inset 0 -8px 16px hsla(var(--h),70%,28%,.45), inset 0 0 0 1.5px rgba(255,255,255,.35)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="79"] .msBlob{background:radial-gradient(70% 60% at 34% 28%, rgba(255,255,255,.9) 0%, rgba(255,255,255,.2) 32%, transparent 52%),
  radial-gradient(90% 90% at 60% 75%, hsla(var(--h),70%,60%,1) 0%, hsla(var(--h),80%,72%,1) 55%, hsla(var(--h),90%,86%,1) 100%)}
.tsm .tsmRitualLayer[data-rid="79"] .msBlob i{position:absolute;width:12%;height:12%;border-radius:50%;background:rgba(255,255,255,.55)}
.tsm .tsmRitualLayer[data-rid="79"] .msBlob i:nth-child(1){left:62%;top:30%}
.tsm .tsmRitualLayer[data-rid="79"] .msBlob i:nth-child(2){left:28%;top:62%;width:8%;height:8%;opacity:.7}
.tsm .tsmRitualLayer[data-rid="79"] .msEye{position:absolute;inset:0;border-radius:50%;opacity:0;transform:scale(.7);transition:opacity .3s ease, transform .45s cubic-bezier(.3,1.7,.5,1);
  background:radial-gradient(circle at 36% 30%, rgba(255,255,255,.55) 0%, transparent 30%),
  radial-gradient(circle, #ff3d6e 0 14%, #fff4ea 14.5% 28%, #ff3d6e 28.5% 42%, #fff4ea 42.5% 56%, #ff3d6e 56.5% 70%, #ffd36a 71% 76%, #b8781c 78% 80%, transparent 81%);
  box-shadow:0 0 0 0 transparent}
.tsm .tsmRitualLayer[data-rid="79"] .msEye b{position:absolute;inset:-12%;border-radius:50%;background:radial-gradient(circle, rgba(255,90,120,.0) 52%, rgba(255,120,140,.35) 62%, transparent 74%);animation:tsmPulse 1.8s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="79"] .msPad.target .msEye{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="79"] .msPad.target .msBlob{opacity:0;transform:scale(.6)}
.tsm .tsmRitualLayer[data-rid="79"] .msCap{position:absolute;left:0;right:0;text-align:center;font-size:22px;font-weight:600;letter-spacing:.02em;color:#fff3dc;opacity:0;transform:translateY(10px);transition:opacity .8s ease, transform .8s ease;pointer-events:none;text-shadow:0 2px 12px rgba(40,10,60,.6)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="79"] .msCap{color:#4a2360;text-shadow:0 1px 0 rgba(255,255,255,.7)}
.tsm .tsmRitualLayer[data-rid="79"] .msCap.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="79"] .msPadBob,.tsm .tsmRitualLayer[data-rid="79"] .msBulb,.tsm .tsmRitualLayer[data-rid="79"] .msEye b{animation:none}}
`

function msAnim(el: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) {
    try {
        if (el && (el as any).animate) (el as HTMLElement).animate(kf, o)
    } catch (e) {}
}

function RitualMiss({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const NEED = 5
    const [idx, setIdx] = React.useState(0)
    const [beat, setBeat] = React.useState(0)
    const [step, setStep] = React.useState(0)
    const [solved, setSolved] = React.useState(false)
    const [leaving, setLeaving] = React.useState(false)
    const [phase, setPhase] = React.useState<"play" | "cheer" | "finale">("play")
    const [caption, setCaption] = React.useState(false)
    const [melted, setMelted] = React.useState(false)
    const st = React.useRef({ idx: 0, beat: 0, step: 0, phase: "play" as string })
    const padIn = React.useRef<(HTMLDivElement | null)[]>([])
    const wobRef = React.useRef<HTMLDivElement>(null)
    const timers = useTimers()

    // layout: the word bubble on top, five lanterns under it, four big pads in a 2×2 below — nothing overlaps
    const usable = h - 84
    const d = Math.round(clamp(Math.min(w * 0.42, usable * 0.26), 112, 164))
    const orbX = w / 2
    const orbY = 16 + d / 2
    const beadY = orbY + d / 2 + 22
    const top = beadY + 24
    const availH = Math.max(220, usable - top)
    const gap = 24
    const P = Math.round(Math.min(150, (w - 3 * gap) / 2, (availH - gap * 1.5) / 2))
    const padPos = [0, 1, 2, 3].map((i) => ({ x: w / 2 + (i % 2 ? 1 : -1) * (P / 2 + gap * 0.6), y: top + availH / 2 + (i < 2 ? -1 : 1) * (P / 2 + gap * 0.6) }))
    const beadPos = Array.from({ length: NEED }, (_, k) => {
        const t = (k - (NEED - 1) / 2) / ((NEED - 1) / 2)
        return { x: orbX + t * d * 0.42, y: beadY - (1 - t * t) * 6 }
    })
    const bulbs = React.useMemo(() => Array.from({ length: 9 }, (_, k) => k), [])
    const blobRadius = ["58% 42% 55% 45% / 47% 60% 40% 53%", "44% 56% 40% 60% / 58% 42% 58% 42%", "52% 48% 62% 38% / 40% 56% 44% 60%", "40% 60% 48% 52% / 55% 45% 60% 40%"]

    const ink = ctx.theme === "bright" ? "rgba(90,40,110,1)" : "rgba(255,246,226,1)"
    const confetti = ["#ff7aa2", "#ffd36a", "#7fe0c4", "#9fb6ff", "#ffffff", "#c99bff"]

    const tap = (i: number) => {
        const s = st.current
        if (s.phase !== "play") return
        const el = padIn.current[i]
        const p = padPos[i]
        if (i === s.beat) {
            // too perfect: a friendly nudge — no reward, no progress; the streak starts again
            msAnim(el, [{ transform: "scale(1)" }, { transform: "scale(1.12,.86)" }, { transform: "scale(.94,1.08) rotate(-4deg)" }, { transform: "rotate(3deg)" }, { transform: "none" }], { duration: 520, easing: "ease-out" })
            ctx.sfx("tap")
            ctx.haptic([8, 40, 8])
            ctx.fx.add({ x: p.x, y: p.y - P * 0.58, vy: -80, drag: 0.97, max: 1.3, size: 19, shape: "text", text: "Too perfect!", color: ink, add: false })
            ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [P * 0.4, P * 0.4], grow: P * 0.7, life: [0.45, 0.45], speed: [0, 0], colors: ["rgba(255,120,150,.8)"] })
            if (s.step > 0) {
                s.step = 0
                setStep(0)
                msAnim(wobRef.current, [{ transform: "none" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: 360 })
            }
            ctx.hint("Too perfect! Miss it on purpose")
            return
        }
        // a brave miss — celebrated
        msAnim(el, [{ transform: "scale(1.1,.86)" }, { transform: "scale(.94,1.1)" }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.3,1.6,.5,1)" })
        ctx.sfx("pop")
        ctx.haptic(14)
        ctx.fx.burst(p.x, p.y, { count: 18, shape: "paper", size: [5, 9], speed: [160, 380], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.8, 1.3], gravity: 520, drag: 0.97, spin: 8, colors: confetti, add: false })
        ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [P * 0.3, P * 0.3], grow: P * 0.9, life: [0.5, 0.5], speed: [0, 0], colors: [`hsla(${MS_HUES[i]},100%,80%,.85)`], add: true })
        const nstep = s.step + 1
        const b = beadPos[nstep - 1]
        const ang = Math.atan2(b.y - p.y, b.x - p.x)
        const sp = dist(p.x, p.y, b.x, b.y) / 0.36
        ctx.fx.burst(p.x, p.y, { count: 4, shape: "glow", size: [5, 8], speed: [sp * 0.95, sp], angle: [ang - 0.03, ang + 0.03], life: [0.36, 0.38], drag: 1, colors: ["rgba(255,236,190,1)"] })
        s.step = nstep
        s.beat = (s.beat + 1) % 4
        setBeat(s.beat)
        timers.after(300, () => setStep(nstep))
        msAnim(wobRef.current, [{ transform: "none" }, { transform: `rotate(${nstep % 2 ? -7 : 7}deg) scale(1.05)` }, { transform: "none" }], { duration: 480, easing: "cubic-bezier(.3,1.5,.5,1)" })
        ctx.progress((s.idx + nstep / NEED) / N)
        if (nstep >= NEED) wordDone()
        else ctx.hint(NEED - nstep === 1 ? "Brave! One more miss" : `Brave miss! ${NEED - nstep} more to go`)
    }

    const wordDone = () => {
        const s = st.current
        s.phase = "cheer"
        setPhase("cheer")
        ctx.hint("Perfectly imperfect!")
        timers.after(320, () => {
            setSolved(true)
            ctx.sfx("chime")
            ctx.haptic([12, 40, 18])
            ctx.fx.burst(orbX, orbY, { count: 40, shape: "paper", size: [5, 10], speed: [180, 460], life: [1, 1.6], gravity: 480, drag: 0.97, spin: 9, colors: confetti, add: false })
            ctx.fx.burst(orbX, orbY, { count: 1, shape: "ring", size: [d * 0.5, d * 0.5], grow: d * 1.4, life: [0.6, 0.6], speed: [0, 0], colors: ["rgba(255,226,170,.9)"], add: true })
        })
        timers.after(1000, () => {
            // the word breaks into happy letters that tumble away with the bubble
            const letters = Array.from((ctx.words[s.idx] || "").replace(/\s+/g, "")).slice(0, 18)
            if (letters.length) ctx.fx.burst(orbX, orbY + d * 0.22, { count: letters.length, shape: "text", text: letters, size: [14, 18], speed: [90, 220], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [1.1, 1.5], gravity: 420, drag: 0.98, spin: 6, colors: [ink], add: false })
            setLeaving(true)
        })
        timers.after(1550, () => {
            if (s.idx + 1 >= N) return finale()
            s.idx += 1
            s.beat = 0
            s.step = 0
            s.phase = "play"
            setIdx(s.idx)
            setBeat(0)
            setStep(0)
            setSolved(false)
            setLeaving(false)
            setPhase("play")
            ctx.hint("Miss the bullseye on purpose")
        })
    }

    const finale = () => {
        const s = st.current
        s.phase = "finale"
        setPhase("finale")
        ctx.hint("")
        // the bullseye melts into one more wobbly blob: nothing left to get perfectly right
        const t = padPos[st.current.beat]
        timers.after(250, () => {
            setMelted(true)
            ctx.sfx("spark")
            ctx.fx.burst(t.x, t.y, { count: 1, shape: "ring", size: [P * 0.4, P * 0.4], grow: P * 1.6, life: [0.7, 0.7], speed: [0, 0], colors: ["rgba(255,140,170,.9)"], add: true })
        })
        padIn.current.forEach((el, i) =>
            timers.after(520 + i * 120, () => {
                msAnim(el, [{ transform: "none" }, { transform: "translateY(-30px) scale(1.06,.94) rotate(-6deg)" }, { transform: "translateY(0) scale(1.12,.86)" }, { transform: "none" }], { duration: 640, easing: "ease-out" })
                ctx.sfx("plink")
                const p = padPos[i]
                ctx.fx.burst(p.x, p.y - P * 0.3, { count: 30, shape: "paper", size: [5, 10], speed: [420, 780], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [1.3, 1.9], gravity: 560, drag: 0.98, spin: 9, colors: confetti, add: false })
            })
        )
        timers.after(700, () => {
            ctx.haptic([20, 60, 20])
            ctx.sfx("chime")
        })
        timers.after(1250, () => setCaption(true))
        timers.after(2400, () => {
            ctx.sfx("win")
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Tap any pad except the bullseye")
    }, [])

    const word = ctx.words[idx]
    return (
        <div className={cx("msRoot", phase === "finale" && "isFin")} style={{ position: "absolute", inset: 0 }}>
            <div className="msSky" />
            <svg className="msWire" width={w} height={60} aria-hidden="true">
                <path d={`M ${-0.02 * w} -6 Q ${w / 2} 74 ${1.02 * w} -6`} />
            </svg>
            {bulbs.map((k) => {
                const t = k / (bulbs.length - 1)
                return <i key={k} className="msBulb" style={{ left: `${-2 + t * 104}%`, top: 34 - 4 * (t - 0.5) * (t - 0.5) * 40, animationDelay: `${-k * 0.45}s` }} />
            })}
            <div className="msFloor" />
            <div className="msOrbSlot" style={{ left: orbX, top: orbY, ["--d" as any]: `${d}px` }}>
                <div key={idx} className={cx("msOrbIn", leaving && "out")}>
                    <div ref={wobRef} className="msWob">
                        <Orb src={ctx.pic(idx, solved)} text={word} d={d} hue={ctx.hue(idx)} hue2={44} mood={solved ? "happy" : "nervous"} aura={solved ? 0.9 : step / NEED * 0.4} uploaded={ctx.uploaded} label={word || "your picture"} />
                    </div>
                </div>
            </div>
            <div className={cx("msCap", caption && "on")} style={{ top: orbY - 14 }} aria-live="polite">
                Perfectly imperfect
            </div>
            {beadPos.map((b, k) => (
                <i key={k} className={cx("msBead", (k < step || phase === "finale") && "on")} style={{ left: b.x, top: b.y, opacity: phase === "finale" ? 0 : 1 }}>
                    <b />
                </i>
            ))}
            {padPos.map((p, i) => {
                const isT = i === beat && !melted
                return (
                    <div
                        key={i}
                        className={cx("msPad", isT && "target")}
                        style={{ left: p.x, top: p.y, ["--p" as any]: `${P}px`, ["--h" as any]: MS_HUES[i], ["--br" as any]: blobRadius[i], ["--bob" as any]: `${3.6 + i * 0.5}s`, ["--bd" as any]: `${-i * 0.9}s`, ["--rot" as any]: `${i % 2 ? -2 : 2}deg` }}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            tap(i)
                        }}
                        role="button"
                        aria-label={isT ? "Bullseye — don't hit it" : "Miss on purpose here"}
                    >
                        <div className="msPadBob">
                            <i className="msShadow" />
                            <div className="msPadIn" ref={(el) => (padIn.current[i] = el)}>
                                <div className="msBlob">
                                    <i />
                                    <i />
                                </div>
                                <div className="msEye">
                                    <b />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

tsmRitual({ id: 79, hint: "Tap any pad except the bullseye", css: MISS_CSS, Comp: RitualMiss })
