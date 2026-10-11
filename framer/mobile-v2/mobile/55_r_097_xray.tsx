/* ================================================================== */
/* 97 · X-RAY — a containment lab with a scanner rail                  */
/* ================================================================== */
// Desktop rules kept (E09, explicit progress): all 6 words sit hidden in the chamber from the start; a
// horizontal scanner drag past 60 % of the rail counts one pass (a shorter drag snaps back with no credit);
// 3 passes raise visibility stepwise (.07 → .46 → .76 → 1); after pass 3 everything stays fully visible and
// waits — never auto-destroys; one explicit press burns every bubble away with a stagger; progress 1/3, 2/3,
// then capped at 94 % until the burn; bonus 420. Fixed: the button reads exactly KILL / BURN ALL (founder C17)
// and the hint names the BURN ALL step (P13.5-c); a failed pass leaves no progress behind; no clipped
// counter; the beam really x-rays the bubble it passes over; faces turn calm as each bubble burns.

const XR_VIS = [0.07, 0.46, 0.76, 1]

const XRAY_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="97"] .xrBg{position:absolute;inset:0;background:
  radial-gradient(70% 45% at 50% 38%, rgba(40,140,200,.22) 0%, transparent 70%),
  linear-gradient(180deg,#050c1c 0%,#0a1630 50%,#07101f 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="97"] .xrBg{background:
  radial-gradient(70% 45% at 50% 38%, rgba(255,255,255,.9) 0%, transparent 70%),
  linear-gradient(180deg,#dcecf6 0%,#cfe3f2 50%,#c2d8ea 100%)}
.tsm .tsmRitualLayer[data-rid="97"] .xrClean{position:absolute;width:var(--cd);height:var(--cd);margin:calc(var(--cd)*-.5) 0 0 calc(var(--cd)*-.5);border-radius:50%;transform:scale(.02);opacity:0;
  transition:transform 1s cubic-bezier(.3,.7,.2,1), opacity .2s ease;
  background:radial-gradient(closest-side, #ffffff 0%, #e6f8ff 22%, #b4e4f7 48%, #86cdeb 72%, #6dbde3 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="97"] .xrClean{background:radial-gradient(closest-side, #ffffff 0%, #f2fbff 30%, #d4effa 60%, #b9e2f4 100%)}
.tsm .tsmRitualLayer[data-rid="97"] .xrRoot.isClean .xrClean{transform:none;opacity:1}
.tsm .tsmRitualLayer[data-rid="97"] .xrCap{position:absolute;left:0;right:0;text-align:center;font-size:24px;font-weight:700;letter-spacing:.02em;color:#083a58;opacity:0;transform:translateY(10px);transition:opacity .6s ease .3s, transform .6s ease .3s;pointer-events:none;text-shadow:0 1px 0 rgba(255,255,255,.8)}
.tsm .tsmRitualLayer[data-rid="97"] .xrRoot.isClean .xrCap{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="97"] .xrChamber{position:absolute;border-radius:28px;overflow:hidden;
  background:repeating-linear-gradient(0deg, rgba(90,200,255,.08) 0 1px, transparent 1px 28px),repeating-linear-gradient(90deg, rgba(90,200,255,.08) 0 1px, transparent 1px 28px),radial-gradient(80% 60% at 50% 50%, rgba(30,90,140,.35), rgba(5,15,35,.6));
  box-shadow:inset 0 0 0 1.5px rgba(110,220,255,.45), inset 0 0 40px rgba(60,180,255,.15), 0 0 30px rgba(40,160,255,.12)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="97"] .xrChamber{background:repeating-linear-gradient(0deg, rgba(30,110,170,.10) 0 1px, transparent 1px 28px),repeating-linear-gradient(90deg, rgba(30,110,170,.10) 0 1px, transparent 1px 28px),radial-gradient(80% 60% at 50% 50%, rgba(255,255,255,.7), rgba(180,214,236,.6));
  box-shadow:inset 0 0 0 1.5px rgba(40,130,200,.45), inset 0 0 30px rgba(60,150,220,.15)}
.tsm .tsmRitualLayer[data-rid="97"] .xrRoot.isClean .xrChamber{opacity:0;transition:opacity 1s ease}
.tsm .tsmRitualLayer[data-rid="97"] .xrBeam{position:absolute;width:56px;margin-left:-28px;opacity:0;transition:opacity .2s ease;pointer-events:none;will-change:transform;
  background:linear-gradient(90deg,transparent,rgba(120,230,255,.18) 30%,rgba(210,250,255,.75) 50%,rgba(120,230,255,.18) 70%,transparent)}
.tsm .tsmRitualLayer[data-rid="97"] .xrBeam.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="97"] .xrOrb{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);transition:opacity .28s ease}
.tsm .tsmRitualLayer[data-rid="97"] .xrOrb .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="97"] .xrOrbIn{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="97"] .xrOrb.burn .xrOrbIn{animation:xrBurn .86s cubic-bezier(.2,.85,.2,1) forwards}
@keyframes xrBurn{0%{transform:none;opacity:1}30%{transform:translateY(-10px) scale(1.14) rotate(var(--r1));opacity:1}100%{transform:translateY(118px) scale(.18) rotate(var(--r2));opacity:0}}
.tsm .tsmRitualLayer[data-rid="97"] .xrSkel{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);border-radius:50%;pointer-events:none;transition:opacity .4s ease;
  border:1.5px dashed rgba(120,225,255,.55);box-shadow:inset 0 0 22px rgba(90,200,255,.18)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="97"] .xrSkel{border-color:rgba(30,110,170,.5)}
.tsm .tsmRitualLayer[data-rid="97"] .xrSkel i{position:absolute;left:50%;top:50%;width:30%;height:30%;margin:-15% 0 0 -15%;border-radius:50%;border:1.5px solid rgba(120,225,255,.35)}
.tsm .tsmRitualLayer[data-rid="97"] .xrRail{position:absolute;height:72px;border-radius:36px;transition:opacity .35s ease;
  background:linear-gradient(90deg,rgba(80,200,255,.10),rgba(80,200,255,.24)),linear-gradient(180deg,rgba(10,30,60,.9),rgba(6,18,40,.9));box-shadow:inset 0 0 0 1.5px rgba(110,220,255,.4), inset 0 4px 12px rgba(0,0,0,.4)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="97"] .xrRail{background:linear-gradient(90deg,rgba(40,140,210,.10),rgba(40,140,210,.24)),linear-gradient(180deg,#eef6fb,#dcebf5);box-shadow:inset 0 0 0 1.5px rgba(40,130,200,.45), inset 0 3px 8px rgba(40,90,140,.15)}
.tsm .tsmRitualLayer[data-rid="97"] .xrRail .xrGoal{position:absolute;top:10px;bottom:10px;border-radius:26px;border:1.5px dashed rgba(120,230,255,.45)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="97"] .xrRail .xrGoal{border-color:rgba(40,130,200,.45)}
.tsm .tsmRitualLayer[data-rid="97"] .xrRail .xrArrow{position:absolute;top:50%;width:12px;height:12px;margin-top:-6px;border-right:3px solid rgba(140,230,255,.9);border-top:3px solid rgba(140,230,255,.9);transform:rotate(45deg);animation:xrArrow 1.4s ease-in-out infinite;animation-delay:var(--ad)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="97"] .xrRail .xrArrow{border-color:rgba(30,120,190,.9)}
@keyframes xrArrow{0%,100%{opacity:.15}45%{opacity:.95}}
.tsm .tsmRitualLayer[data-rid="97"] .xrHandle{position:absolute;top:-2px;width:76px;height:76px;border-radius:50%;cursor:grab;touch-action:none;will-change:transform;
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;letter-spacing:.08em;color:#032036;
  background:radial-gradient(circle at 38% 30%, #ffffff 0%, #bff3ff 30%, #4fd0ff 70%, #1b8fd0 100%);box-shadow:0 0 0 3px rgba(190,245,255,.5), 0 0 24px rgba(80,210,255,.55), 0 8px 18px rgba(0,0,0,.4)}
.tsm .tsmRitualLayer[data-rid="97"] .xrBurnBtn{position:absolute;height:68px;border-radius:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:none;
  font-size:19px;font-weight:800;letter-spacing:.1em;color:#fff;text-shadow:0 1px 2px rgba(80,0,0,.5);
  background:linear-gradient(180deg,#ff8a3d 0%,#ff4d2e 55%,#d7261f 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.35), inset 0 -5px 0 rgba(120,10,10,.5), 0 10px 26px rgba(255,70,30,.45);
  animation:xrBtnIn .5s cubic-bezier(.3,1.6,.5,1) both;transition:transform .12s cubic-bezier(.3,1.6,.5,1)}
.tsm .tsmRitualLayer[data-rid="97"] .xrBurnBtn.press{transform:translateY(3px) scale(.96)}
.tsm .tsmRitualLayer[data-rid="97"] .xrBurnBtn.gone{animation:none;opacity:0;pointer-events:none;transition:opacity .35s ease}
.tsm .tsmRitualLayer[data-rid="97"] .xrBurnBtn i{position:absolute;inset:-8px;border-radius:42px;background:radial-gradient(closest-side, rgba(255,120,60,.45), transparent);animation:tsmPulse 1.4s ease-in-out infinite;pointer-events:none}
@keyframes xrBtnIn{0%{opacity:0;transform:translateY(20px) scale(.8)}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="97"] .xrArrow,.tsm .tsmRitualLayer[data-rid="97"] .xrBurnBtn i{animation:none}}
`

function RitualXray({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [step, setStep] = React.useState(0)
    const [phase, setPhase] = React.useState<"scan" | "revealed" | "burn" | "clean">("scan")
    const [calm, setCalm] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [burning, setBurning] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [press, setPress] = React.useState(false)
    const st = React.useRef({ step: 0, phase: "scan" as string, dx: 0 })
    const orbRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const beamRef = React.useRef<HTMLDivElement>(null)
    const handleRef = React.useRef<HTMLDivElement>(null)
    const timers = useTimers()

    // layout: the chamber holds all six bubbles (2 × 3); the scanner rail lives in the thumb zone below it
    const U = h - 84
    const railH = 72
    const railY = U - 8 - railH
    const chX = 16
    const chY = 8
    const chW = w - 32
    const chH = railY - 22 - chY
    const grid = React.useMemo(() => tsmGrid(N, { w: chW - 16, h: chH - 24 }, 2, 128, 20, 0.22), [chW, chH])
    const d = grid.d
    const pos = grid.pos.map((p) => ({ x: chX + 8 + p.x, y: chY + 12 + p.y }))
    const railX = 24
    const railW = w - 48
    const HD = 76
    const travel = railW - HD
    const NEED = travel * 0.6

    const applyVis = (beamX: number | null) => {
        const v = XR_VIS[Math.min(3, st.current.step)]
        orbRefs.current.forEach((el, i) => {
            if (!el) return
            const near = beamX != null && Math.abs(pos[i].x - beamX) < d * 0.62
            el.style.opacity = String(near ? Math.max(v, 0.96) : v)
        })
    }
    React.useEffect(() => applyVis(null), [step, d])

    const setHandle = (x: number, trans?: string) => {
        const el = handleRef.current
        if (el) {
            el.style.transition = trans || ""
            el.style.transform = `translate3d(${x}px,0,0)`
        }
        const bx = chX + 10 + (x / travel) * (chW - 20)
        if (beamRef.current) {
            beamRef.current.style.transition = trans || ""
            beamRef.current.style.transform = `translate3d(${bx}px,0,0)`
        }
        return bx
    }

    const bind = useDrag({
        onStart: () => {
            if (st.current.phase !== "scan") return false
            ctx.sfx("hum")
            ctx.haptic(8)
            if (beamRef.current) beamRef.current.classList.add("on")
        },
        onMove: (m) => {
            const raw = Math.max(0, m.dx)
            const x = raw <= travel ? raw : travel + (raw - travel) * 0.15
            const prev = st.current.dx
            st.current.dx = x
            const bx = setHandle(Math.min(x, travel + 14))
            applyVis(bx)
            if (prev < NEED && x >= NEED) ctx.haptic(10)
        },
        onEnd: () => {
            const x = st.current.dx
            st.current.dx = 0
            setHandle(0, "transform .5s cubic-bezier(.3,1.4,.5,1)")
            if (beamRef.current) beamRef.current.classList.remove("on")
            if (st.current.phase === "scan" && x >= NEED) pass()
            else {
                applyVis(null)
                if (x > 8) {
                    ctx.sfx("soft")
                    ctx.hint("Drag the scanner further →")
                }
            }
        },
    })

    const pass = () => {
        const s = st.current
        const n = Math.min(3, s.step + 1)
        s.step = n
        setStep(n)
        applyVis(null)
        ctx.sfx(n >= 3 ? "chime" : "tap")
        ctx.haptic(n >= 3 ? 24 : 10)
        // a scan line sweeps the chamber and every bubble shows a little more
        pos.forEach((p, i) => timers.after(i * 40, () => ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [d * 0.45, d * 0.45], grow: d * 0.5, life: [0.45, 0.45], speed: [0, 0], colors: ["rgba(140,235,255,.8)"], add: true })))
        ctx.progress(n >= 3 ? 0.94 : n / 3)
        if (n >= 3) {
            s.phase = "revealed"
            setPhase("revealed")
            ctx.hint("Revealed · press KILL / BURN ALL")
        } else ctx.hint(n === 1 ? "Scan 2 of 3 · drag again →" : "Last scan · drag it again →")
    }

    const burnAll = () => {
        const s = st.current
        if (s.phase !== "revealed") return
        s.phase = "burn"
        setPhase("burn")
        ctx.hint("")
        ctx.sfx("spark")
        ctx.haptic(28)
        pos.forEach((p, i) => {
            const t0 = i * 90
            timers.after(t0, () => {
                // flare: the face lets go, then the bubble burns down and its letters go up as embers
                setCalm((c) => c.map((v, j) => (j === i ? true : v)))
                ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [d * 0.5, d * 0.5], grow: d * 0.9, life: [0.45, 0.45], speed: [0, 0], colors: ["rgba(255,170,90,.95)"], add: true })
            })
            timers.after(t0 + 300, () => {
                setBurning((b) => b.map((v, j) => (j === i ? true : v)))
                ctx.sfx(i % 2 ? "pop" : "spark")
                ctx.fx.burst(p.x, p.y, { count: 22, shape: "spark", size: [2, 4], speed: [80, 260], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.5, 1], gravity: -60, colors: ["rgba(255,200,90,1)", "rgba(255,120,50,1)", "rgba(255,240,200,1)"] })
                ctx.fx.burst(p.x, p.y + d * 0.2, { count: 6, shape: "smoke", size: [18, 34], speed: [20, 60], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [1, 1.5], gravity: -40, colors: [ctx.theme === "bright" ? "rgba(120,110,110,.16)" : "rgba(160,150,150,.16)"], add: false })
                const letters = Array.from((ctx.words[i] || "").replace(/\s+/g, "")).slice(0, 16)
                if (letters.length) ctx.fx.burst(p.x, p.y + d * 0.22, { count: letters.length, shape: "text", text: letters, size: [12, 16], speed: [40, 110], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [0.8, 1.2], gravity: -120, drag: 0.97, spin: 3, colors: ["rgba(255,190,110,1)", "rgba(255,140,70,1)"], add: false })
            })
        })
        timers.after(5 * 90 + 300 + 700, () => {
            s.phase = "clean"
            setPhase("clean")
            timers.after(380, () => ctx.fx.clear())
            ctx.sfx("chime")
            ctx.haptic([20, 60, 20])
            for (let k = 0; k < 16; k++) timers.after(400 + k * 45, () => ctx.fx.add({ x: w * (0.15 + Math.random() * 0.7), y: U * (0.2 + Math.random() * 0.5), vy: -20, size: 3 + Math.random() * 3, max: 1.3, shape: "glow", color: "rgba(255,200,120,1)" }))
        })
        timers.after(2450, () => {
            ctx.sfx("win")
            ctx.complete(420)
        })
    }

    React.useEffect(() => {
        ctx.hint("Scan 3 times, then KILL / BURN ALL")
    }, [])

    const vis = XR_VIS[Math.min(3, step)]
    return (
        <div className={cx("xrRoot", phase === "clean" && "isClean")} style={{ position: "absolute", inset: 0 }}>
            <div className="xrBg" />
            <div className="xrChamber" style={{ left: chX, top: chY, width: chW, height: chH }} />
            {pos.map((p, i) => (
                <i key={`s${i}`} className="xrSkel" style={{ left: p.x, top: p.y, ["--d" as any]: `${d}px`, opacity: phase === "scan" ? 1 - vis * 0.8 : 0 }}>
                    <i />
                </i>
            ))}
            {pos.map((p, i) => (
                <div key={i} ref={(el) => (orbRefs.current[i] = el)} className={cx("xrOrb", burning[i] && "burn")} style={{ left: p.x, top: p.y, ["--d" as any]: `${d}px`, ["--r1" as any]: `${i % 2 ? 5 : -5}deg`, ["--r2" as any]: `${i % 2 ? 22 : -22}deg` }} aria-label={`Hidden thought: ${ctx.words[i] || "your picture"}`} role="img">
                    <div className="xrOrbIn">
                        <Orb src={ctx.pic(i, calm[i])} text={ctx.words[i]} d={d} hue={ctx.hue(i)} hue2={28} mood={calm[i] ? "happy" : "nervous"} aura={calm[i] ? 1 : 0} uploaded={ctx.uploaded} />
                    </div>
                </div>
            ))}
            <div ref={beamRef} className="xrBeam" style={{ left: 0, top: chY, height: chH }} />
            {phase === "scan" ? (
                <div className="xrRail" style={{ left: railX, top: railY, width: railW }}>
                    <i className="xrGoal" style={{ left: 8 + NEED, right: 8 }} />
                    {[0, 1, 2].map((k) => (
                        <i key={k} className="xrArrow" style={{ left: HD + 22 + k * 22, ["--ad" as any]: `${k * 0.18}s` }} />
                    ))}
                    <div ref={handleRef} className="xrHandle" style={{ left: -2 }} {...bind} role="slider" aria-label="X-ray scanner: drag right" aria-valuemin={0} aria-valuemax={3} aria-valuenow={step}>
                        X-RAY
                    </div>
                </div>
            ) : null}
            {phase !== "scan" && phase !== "clean" ? (
                <div
                    className={cx("xrBurnBtn", press && "press", phase !== "revealed" && "gone")}
                    style={{ left: railX, top: railY + 2, width: railW }}
                    onPointerDown={(e) => {
                        e.preventDefault()
                        if (st.current.phase !== "revealed") return
                        setPress(true)
                        ctx.sfx("tap")
                        timers.after(110, () => {
                            setPress(false)
                            burnAll()
                        })
                    }}
                    role="button"
                    aria-label="KILL / BURN ALL"
                >
                    <i />
                    KILL / BURN ALL
                </div>
            ) : null}
            <div className="xrClean" style={{ left: w / 2, top: chY + chH * 0.45, ["--cd" as any]: `${Math.ceil(Math.hypot(w, h) * 2.1)}px` }} />
            <div className="xrCap" style={{ top: chY + chH * 0.8 }} aria-live="polite">
                {phase === "clean" ? "Seen through. Gone." : ""}
            </div>
        </div>
    )
}

tsmRitual({ id: 97, hint: "Scan 3 times, then KILL / BURN ALL", css: XRAY_CSS, Comp: RitualXray })
