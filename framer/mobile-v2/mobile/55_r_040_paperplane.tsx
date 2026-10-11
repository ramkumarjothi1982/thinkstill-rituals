/* ================================================================== */
/* 40 · PAPER PLANE — fold the note, flick it into the sunset           */
/* ================================================================== */
// Desktop rules kept: one sheet per word (6 rounds); two distinct folds in order (LEFT wing, then RIGHT wing)
// before launch; then a flick launches it; launching is required to advance; progress k/6; bonus 250; the
// plane always leaves the screen and never comes "back at you". Fixed / added: the folds are real (each wing
// corner visibly folds over its crease in 3D, then the sheet narrows into a dart), you fold by tapping the
// wing corners themselves, folds give feedback but no progress/reward, the flight is a real path with
// momentum that the wind bends into a curve before it leaves the screen, the sheet is re-made for every word
// (no more plane stuck off-screen), nothing crops the face or the words, the face turns positive at launch.
// Launch direction: any flick away from you (up, left or right) flies; a flick DOWN (back at you) springs back.

const PLANE_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="40"] .ppSky{position:absolute;inset:0;background:
  radial-gradient(60% 30% at 50% 80%, rgba(255,180,110,.65), transparent 70%),
  linear-gradient(180deg,#1d2252 0%,#43357a 30%,#a3527e 58%,#f08a6c 76%,#ffc48a 80.5%,#2a3a6e 81%,#1a2550 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="40"] .ppSky{background:
  radial-gradient(60% 30% at 50% 80%, rgba(255,226,170,.9), transparent 70%),
  linear-gradient(180deg,#7fa6e6 0%,#b4b4ec 30%,#f0b6c4 58%,#ffc8a0 76%,#ffe0b0 80.5%,#7fa3d6 81%,#5d84c0 100%)}
.tsm .tsmRitualLayer[data-rid="40"] .ppGold{position:absolute;inset:0;opacity:0;transition:opacity 1.8s ease;pointer-events:none;
  background:radial-gradient(70% 45% at 50% 80%, rgba(255,226,150,.85), transparent 72%),linear-gradient(180deg, rgba(255,190,120,.0) 0%, rgba(255,200,120,.45) 60%, rgba(255,220,150,.2) 100%)}
.tsm .tsmRitualLayer[data-rid="40"] .ppGold.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="40"] .ppSun{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle, #fff3d6 0%, #ffd38c 40%, rgba(255,160,90,.5) 58%, transparent 72%)}
.tsm .tsmRitualLayer[data-rid="40"] .ppSea{position:absolute;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden}
.tsm .tsmRitualLayer[data-rid="40"] .ppSea i{position:absolute;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(255,214,170,.6),transparent);animation:ppGlint 6s ease-in-out infinite}
@keyframes ppGlint{0%,100%{transform:translateX(-10px) scaleX(.7);opacity:.4}50%{transform:translateX(10px) scaleX(1.1);opacity:1}}
.tsm .tsmRitualLayer[data-rid="40"] .ppSheet{position:absolute;left:0;top:0;width:var(--pw);height:var(--ph);touch-action:none;will-change:transform;cursor:pointer}
.tsm .tsmRitualLayer[data-rid="40"] .ppIn{position:absolute;inset:0;animation:ppIn .7s cubic-bezier(.25,1.2,.5,1) both}
@keyframes ppIn{0%{opacity:0;transform:translate3d(0,60px,0) rotate(-6deg) scale(.9)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="40"] .ppShadow{position:absolute;left:10%;right:10%;bottom:-16px;height:22px;border-radius:50%;background:radial-gradient(closest-side, rgba(10,10,40,.45), transparent);transition:transform .5s ease, opacity .5s ease;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="40"] .ppForm{position:absolute;inset:0;perspective:700px;transition:transform .55s cubic-bezier(.3,1.4,.5,1)}
.tsm .tsmRitualLayer[data-rid="40"] .ppForm.press{transform:scale(1.04,.96)}
.tsm .tsmRitualLayer[data-rid="40"] .ppForm.dart{transform:translateY(-10px) scale(1.02)}
.tsm .tsmRitualLayer[data-rid="40"] .ppForm.dart.press{transform:translateY(-6px) scale(1.05,.95)}
.tsm .tsmRitualLayer[data-rid="40"] .ppBase,.tsm .tsmRitualLayer[data-rid="40"] .ppFlap{position:absolute;inset:0;
  background:linear-gradient(160deg,#fffdf6 0%,#f7eedd 60%,#efe1c8 100%)}
.tsm .tsmRitualLayer[data-rid="40"] .ppBase::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(180deg, transparent 0 21px, rgba(120,140,200,.16) 21px 22px)}
.tsm .tsmRitualLayer[data-rid="40"] .ppFlap{transition:transform .5s cubic-bezier(.5,0,.3,1.15);will-change:transform;cursor:pointer}
.tsm .tsmRitualLayer[data-rid="40"] .ppFlap b{position:absolute;inset:0;background:linear-gradient(135deg, rgba(150,120,90,.0), rgba(150,120,90,.3));opacity:0;transition:opacity .2s ease .22s}
.tsm .tsmRitualLayer[data-rid="40"] .ppFlap.folded b{opacity:1}
.tsm .tsmRitualLayer[data-rid="40"] .ppFlap.nudge{animation:ppNudge .45s ease}
@keyframes ppNudge{0%,100%{transform:none}30%{transform:rotate3d(var(--ax),var(--ay),0,28deg)}60%{transform:rotate3d(var(--ax),var(--ay),0,10deg)}}
.tsm .tsmRitualLayer[data-rid="40"] .ppCorner{position:absolute;width:12px;height:12px;border-radius:50%;background:rgba(240,120,90,.85);box-shadow:0 0 0 4px rgba(240,120,90,.25);animation:ppPing 1.6s ease-out infinite;pointer-events:none}
@keyframes ppPing{0%{transform:scale(.7);opacity:1}100%{transform:scale(1.6);opacity:0}}
.tsm .tsmRitualLayer[data-rid="40"] .ppCrease{position:absolute;left:50%;width:2px;margin-left:-1px;background:linear-gradient(180deg, rgba(120,100,80,.5), rgba(120,100,80,.0));opacity:0;transition:opacity .4s ease .3s;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="40"] .ppForm.dart .ppCrease{opacity:1}
.tsm .tsmRitualLayer[data-rid="40"] .ppFace{position:absolute;left:50%;width:var(--fd);height:var(--fd);margin-left:calc(var(--fd)*-.5);border-radius:50%;overflow:hidden;background:#fff;box-shadow:0 0 0 2px #fff, 0 3px 10px rgba(80,60,40,.25)}
.tsm .tsmRitualLayer[data-rid="40"] .ppFace img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="40"] .ppFace img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="40"] .ppFace img.pos{animation:ppFaceIn .5s cubic-bezier(.3,1.6,.45,1) both}
@keyframes ppFaceIn{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1.14)}}
.tsm .tsmRitualLayer[data-rid="40"] .ppWords{position:absolute;left:10%;right:10%;text-align:center;font-weight:500;line-height:1.15;color:#2c2546;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.tsm .tsmRitualLayer[data-rid="40"] .ppCaption{position:absolute;left:0;right:0;text-align:center;font-size:24px;font-weight:700;letter-spacing:.02em;color:#fff6e4;text-shadow:0 2px 18px rgba(200,90,40,.6);opacity:0;transform:translateY(8px);transition:opacity 1s ease .6s, transform 1s ease .6s;pointer-events:none}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="40"] .ppCaption{color:#fff;text-shadow:0 2px 16px rgba(180,80,40,.7)}
.tsm .tsmRitualLayer[data-rid="40"] .ppCaption.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="40"] .ppSea i,.tsm .tsmRitualLayer[data-rid="40"] .ppCorner,.tsm .tsmRitualLayer[data-rid="40"] .ppIn{animation:none}}
`

function RitualPaperPlane({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [step, setStep] = React.useState(0) // 0 flat · 1 left folded · 2 both folded (dart)
    const [nudge, setNudge] = React.useState(0)
    const [press, setPress] = React.useState(false)
    const [flying, setFlying] = React.useState(false)
    const [fin, setFin] = React.useState(false)
    const timers = useTimers()
    const sheetRef = React.useRef<HTMLDivElement>(null)
    const busyRef = React.useRef(false)
    const stepRef = useLatest(step)
    const idxRef = useLatest(idx)
    const flight = React.useRef<{ x: number; y: number; vx: number; vy: number; ax: number; ay: number; t: number; s: number } | null>(null)

    // ---- layout: one sheet in the middle of the sky, above the sea ----
    const W = Math.round(clamp(w * 0.56, 190, 236))
    const H = Math.round(W * 1.16)
    const L = W / 2 // fold leg: both corners fold to the centre line
    const home = { x: w / 2, y: Math.round(clamp(h * 0.47, H / 2 + 26, h - 96 - H / 2)) }
    const fd = Math.round(W * 0.3)
    const faceTop = L + 6
    const wordTop = faceTop + fd + 8
    const wordPx = clamp(Math.round(fitThoughtPx(ctx.words[idx] || "", W * 0.8, H - wordTop - 10, 17, 12.5, 1.15) * 2) / 2, 12.5, 17)
    const horizon = h * 0.805
    const T = Math.max(110, h * 0.17)

    const rest = (anim = false) => {
        const el = sheetRef.current
        if (!el) return
        el.style.transition = anim ? "transform .55s cubic-bezier(.3,1.45,.5,1)" : ""
        el.style.transform = `translate3d(${home.x - W / 2}px,${home.y - H / 2}px,0)`
    }
    React.useLayoutEffect(() => rest(), [idx, w, h])

    const fold = (side: 0 | 1) => {
        if (busyRef.current || fin) return
        const s = stepRef.current
        if (s >= 2) return
        if (side !== s) {
            // the order matters: left wing first
            setNudge((n) => n + 1)
            ctx.sfx("soft")
            ctx.haptic(6)
            ctx.hint("Fold the left wing first")
            return
        }
        setStep(s + 1)
        ctx.sfx(s === 0 ? "tap" : "clack")
        ctx.haptic(12)
        const cx0 = home.x - W / 2 + (side ? W - L / 2 : L / 2)
        ctx.fx.burst(cx0, home.y - H / 2 + L / 2, { count: 8, shape: "spark", size: [1.5, 2.5], speed: [40, 120], life: [0.3, 0.55], drag: 0.9, colors: ["rgba(255,250,235,1)", "rgba(255,210,150,1)"], add: true })
        if (s === 0) ctx.hint("Now fold the right wing")
        else timers.after(350, () => ctx.hint("Flick it up and away"))
    }

    const drag = useDrag({
        onStart: () => {
            if (busyRef.current || fin) return false
            setPress(true)
            if (stepRef.current >= 2) {
                ctx.sfx("tap")
                ctx.haptic(6)
            }
        },
        onMove: (di) => {
            if (stepRef.current < 2) return
            const el = sheetRef.current
            if (!el) return
            el.style.transition = ""
            const tilt = clamp(di.vx * 0.01 + di.dx * 0.04, -24, 24)
            el.style.transform = `translate3d(${home.x - W / 2 + di.dx}px,${home.y - H / 2 + di.dy}px,0) rotate(${tilt}deg) scale(1.03)`
        },
        onEnd: (di, cancelled) => {
            setPress(false)
            if (stepRef.current < 2) return
            const dist = Math.hypot(di.dx, di.dy)
            const sp = Math.hypot(di.vx, di.vy)
            const lx = di.dx + di.vx * 0.12
            const ly = di.dy + di.vy * 0.12
            const towardYou = ly > Math.abs(lx) * 0.8 && ly > 20
            if (!cancelled && (dist > T || (sp > 650 && dist > 30)) && !towardYou) launch(di.dx, di.dy, lx, ly, sp)
            else {
                rest(true)
                if (dist > 14) {
                    ctx.sfx("soft")
                    ctx.hint(towardYou ? "Away from you — flick it up" : "A bigger flick — let it fly")
                }
            }
        },
        onTap: (di) => {
            if (stepRef.current >= 2) {
                ctx.hint("Flick it up and away")
                return
            }
            // tap a wing corner to fold it (a tap on the middle folds the next wing)
            const lx = di.x
            const ly = di.y
            const inLeft = lx + ly < L * 1.05
            const inRight = W - lx + ly < L * 1.05
            fold(inRight && !inLeft ? 1 : inLeft ? 0 : (stepRef.current as 0 | 1))
        },
    })

    const launch = (dx: number, dy: number, lx: number, ly: number, sp: number) => {
        busyRef.current = true
        setFlying(true)
        ctx.sfx("string")
        ctx.haptic(14)
        const n0 = Math.hypot(lx, ly) || 1
        const speed = clamp(sp * 0.6, 520, 880)
        const vx = (lx / n0) * speed
        const vy = (ly / n0) * speed
        // the wind always bends the path sideways — and lifts it, so it never comes back down at you
        const straightUp = Math.abs(vx) < 260
        const ax = straightUp ? (idxRef.current % 2 ? -1 : 1) * 440 : 0
        const ay = straightUp ? -120 : -460
        flight.current = { x: home.x + dx, y: home.y + dy, vx, vy, ax, ay, t: 0, s: 1.03 }
        const i = idxRef.current
        ctx.progress((i + 1) / N)
    }

    useFrame((dt) => {
        const f = flight.current
        const el = sheetRef.current
        if (!f || !el) return
        f.t += dt
        f.vx += f.ax * dt
        f.vy += f.ay * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.s = Math.max(0.28, 1.03 - f.t * 0.75)
        const ang = (Math.atan2(f.vy, f.vx) * 180) / Math.PI + 90
        el.style.transition = ""
        el.style.transform = `translate3d(${f.x - W / 2}px,${f.y - H / 2}px,0) rotate(${ang}deg) scale(${f.s})`
        // a paper contrail
        if (!ctx.reduced && Math.random() < 0.7) ctx.fx.add({ x: f.x - (f.vx / 1000) * H * 0.4 * f.s, y: f.y - (f.vy / 1000) * H * 0.4 * f.s, vx: 0, vy: 0, max: 0.7, size: 2 + 3 * f.s, shape: "glow", color: "rgba(255,240,215,1)" })
        const out = f.x < -W || f.x > w + W || f.y < -H || f.y > h + H || f.t > 2.2
        if (out) {
            flight.current = null
            landed()
        }
    })

    const landed = () => {
        const n = idxRef.current + 1
        ctx.fx.burst(clamp(w / 2, 20, w - 20), horizon - 4, { count: 1, shape: "ring", size: [4, 4], grow: 60, life: [0.9, 0.9], speed: [0, 0], colors: ["rgba(255,236,190,.8)"], add: true })
        ctx.fx.burst(w / 2, horizon - 6, { count: 8, shape: "glow", size: [3, 6], speed: [10, 50], life: [0.6, 1.1], colors: ["rgba(255,240,200,1)"] })
        ctx.sfx("chime")
        if (n >= N) {
            finale()
            return
        }
        ctx.hint(n === N - 1 ? "Last one — fold it, then fly it" : `${N - n} more · fold the left wing`)
        timers.after(380, () => {
            setFlying(false)
            setStep(0)
            setIdx(n)
            busyRef.current = false
        })
    }

    const finale = () => {
        ctx.hint("")
        setFin(true)
        ctx.haptic([14, 60, 14])
        timers.after(300, () => {
            ctx.sfx("soft")
            ctx.fx.burst(w / 2, horizon - 8, { count: 1, shape: "ring", size: [10, 10], grow: w * 1.1, life: [1.5, 1.5], speed: [0, 0], colors: ["rgba(255,226,170,.7)"], add: true })
            for (let k = 0; k < 22; k++) timers.after(k * 50, () => ctx.fx.add({ x: w * (0.1 + Math.random() * 0.8), y: horizon - Math.random() * h * 0.5, vx: (Math.random() - 0.5) * 20, vy: -10, max: 1.4, size: 2 + Math.random() * 3, shape: "glow", color: k % 2 ? "rgba(255,226,160,1)" : "rgba(255,250,235,1)" }))
        })
        timers.after(2400, () => {
            ctx.sfx("win")
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Tap the left wing corner to fold")
    }, [])

    const word = ctx.words[idx]
    const src = ctx.pic(idx, flying)
    const sunD = Math.round(w * 0.36)
    return (
        <>
            <div className="ppSky" />
            <i className="ppSun" style={{ left: w / 2 - sunD / 2, top: horizon - sunD * 0.5, width: sunD, height: sunD }} />
            <div className="ppSea" style={{ top: horizon + 2 }}>
                <i style={{ left: "18%", top: "18%", width: "30%" }} />
                <i style={{ left: "52%", top: "36%", width: "26%", animationDelay: "-2s" }} />
                <i style={{ left: "30%", top: "62%", width: "40%", animationDelay: "-4s" }} />
            </div>
            <div className={cx("ppGold", fin && "on")} />
            {!fin ? (
                <div
                    key={idx}
                    ref={sheetRef}
                    className="ppSheet"
                    style={{ ["--pw" as any]: `${W}px`, ["--ph" as any]: `${H}px`, ["--fd" as any]: `${fd}px`, transform: `translate3d(${home.x - W / 2}px,${home.y - H / 2}px,0)` }}
                    {...drag}
                    role="button"
                    aria-label={step < 2 ? `Fold the ${step === 0 ? "left" : "right"} wing: ${word || "your picture"}` : `Flick away: ${word || "your picture"}`}
                >
                    <div className="ppIn">
                        <i className="ppShadow" style={{ opacity: step >= 2 ? 0.6 : 1, transform: step >= 2 ? "translateY(18px) scale(.8)" : undefined }} />
                        <div className={cx("ppForm", step >= 2 && "dart", press && "press")}>
                            <div className="ppBase" style={{ clipPath: `polygon(${L}px 0, ${W}px ${L}px, ${W}px ${H}px, 0 ${H}px, 0 ${L}px)` }}>
                                {src ? (
                                    <span className="ppFace" style={{ top: faceTop }}>
                                        <img key={flying ? "p" : "n"} className={cx(ctx.uploaded && "up", flying && "pos")} src={src} alt="" draggable={false} />
                                    </span>
                                ) : null}
                                {word ? (
                                    <span className="ppWords" style={{ top: wordTop, fontSize: wordPx }}>
                                        {word}
                                    </span>
                                ) : null}
                            </div>
                            <i className="ppCrease" style={{ top: 0, height: H * 0.9 }} />
                            <div
                                key={`l${nudge}`}
                                className={cx("ppFlap", step >= 1 && "folded", nudge > 0 && step === 0 && "nudge")}
                                style={{ clipPath: `polygon(0 0, ${L}px 0, 0 ${L}px)`, transformOrigin: `${L / 2}px ${L / 2}px`, transform: step >= 1 ? "rotate3d(1,-1,0,180deg)" : "rotate3d(1,-1,0,0deg)", ["--ax" as any]: 1, ["--ay" as any]: -1 }}
                            >
                                <b />
                            </div>
                            <div
                                className={cx("ppFlap", step >= 2 && "folded")}
                                style={{ clipPath: `polygon(${W - L}px 0, ${W}px 0, ${W}px ${L}px)`, transformOrigin: `${W - L / 2}px ${L / 2}px`, transform: step >= 2 ? "rotate3d(1,1,0,180deg)" : "rotate3d(1,1,0,0deg)" }}
                            >
                                <b />
                            </div>
                        </div>
                        {step < 2 && !flying ? <i className="ppCorner" style={step === 0 ? { left: 12, top: 12 } : { left: W - 24, top: 12 }} aria-hidden="true" /> : null}
                    </div>
                </div>
            ) : null}
            <div className={cx("ppCaption", fin && "on")} style={{ top: h * 0.36 }}>
                Let it fly.
            </div>
        </>
    )
}

tsmRitual({ id: 40, hint: "Tap the left wing corner to fold", css: PLANE_CSS, Comp: RitualPaperPlane })
