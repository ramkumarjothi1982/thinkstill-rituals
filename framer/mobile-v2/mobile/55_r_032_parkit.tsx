/* ================================================================== */
/* 32 · PARK IT — a rooftop car park at night, three bays              */
/* ================================================================== */
// Desktop rules kept: one word per round (6 rounds); each is parked in exactly one of three bays with the exact
// copy LATER TODAY / TOMORROW / NOT NOW; every bay is right (no wrong answer); parking advances, progress k/6,
// bonus 250. Fixed / added (spec intent): a real DRAG into the bay (tap a bay = accessible fallback), the chosen
// bay is no longer thrown away — the parked word stays visible in its bay — the gate closes with a clunk and a
// ticket stamps on each park, the next vehicle drives in fresh from the lane, the face turns positive as it
// parks, and the finale closes every gate under a glowing "See you later".

const PARK_BAYS = ["LATER TODAY", "TOMORROW", "NOT NOW"]
const PARK_HUES = [38, 200, 280]
/** Chip text size: the longest word must fit on one line of the chip. */
function parkChipPx(text: string, tw: number): number {
    const longest = Math.max(1, ...text.split(/\s+/).map((x) => x.length))
    return clamp(Math.floor((tw / (longest * 0.63)) * 10) / 10, 8.5, 12.5)
}

const PARK_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="32"] .pkGround{position:absolute;inset:0;background:
  radial-gradient(70% 30% at 50% 0%, rgba(120,140,255,.22), transparent 70%),
  radial-gradient(90% 40% at 50% 100%, rgba(255,190,120,.10), transparent 70%),
  radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.05) 50%, transparent 51%) 0 0/7px 7px,
  linear-gradient(180deg,#151a2e 0%,#1b2036 45%,#20243a 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="32"] .pkGround{background:
  radial-gradient(70% 30% at 50% 0%, rgba(255,255,255,.7), transparent 70%),
  radial-gradient(1px 1px at 20% 30%, rgba(60,60,80,.08) 50%, transparent 51%) 0 0/7px 7px,
  linear-gradient(180deg,#d9dce6 0%,#cfd3de 50%,#c3c8d5 100%)}
.tsm .tsmRitualLayer[data-rid="32"] .pkLane{position:absolute;pointer-events:none;
  background:repeating-linear-gradient(180deg, rgba(255,220,120,.55) 0 22px, transparent 22px 44px);border-radius:3px}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="32"] .pkLane{background:repeating-linear-gradient(180deg, rgba(220,160,20,.8) 0 22px, transparent 22px 44px)}
.tsm .tsmRitualLayer[data-rid="32"] .pkChev{position:absolute;width:26px;height:26px;margin-left:-13px;border-left:4px solid rgba(255,255,255,.18);border-top:4px solid rgba(255,255,255,.18);transform:rotate(45deg);pointer-events:none}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="32"] .pkChev{border-color:rgba(60,60,90,.18)}
.tsm .tsmRitualLayer[data-rid="32"] .pkBay{position:absolute;border-radius:6px 6px 0 0;cursor:pointer;
  background:linear-gradient(180deg, hsla(var(--bh),90%,60%,.10) 0%, transparent 40%), linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,0));
  box-shadow:inset 3px 0 0 rgba(240,240,255,.55), inset -3px 0 0 rgba(240,240,255,.55), inset 0 3px 0 rgba(240,240,255,.55);transition:background .2s ease}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="32"] .pkBay{background:linear-gradient(180deg, hsla(var(--bh),90%,55%,.14) 0%, transparent 40%);box-shadow:inset 3px 0 0 rgba(255,255,255,.95), inset -3px 0 0 rgba(255,255,255,.95), inset 0 3px 0 rgba(255,255,255,.95)}
.tsm .tsmRitualLayer[data-rid="32"] .pkBay.hot{background:linear-gradient(180deg, hsla(var(--bh),95%,62%,.34) 0%, hsla(var(--bh),95%,62%,.12) 100%)}
.tsm .tsmRitualLayer[data-rid="32"] .pkSign{position:absolute;left:8px;right:8px;top:10px;height:48px;border-radius:12px;display:grid;place-items:center;text-align:center;
  font-size:13px;line-height:1.12;font-weight:700;letter-spacing:.08em;color:hsl(var(--bh),100%,86%);
  background:linear-gradient(180deg, hsla(var(--bh),60%,22%,.95), hsla(var(--bh),60%,14%,.95));box-shadow:inset 0 0 0 1.5px hsla(var(--bh),100%,70%,.75), 0 0 18px hsla(var(--bh),100%,60%,.35);text-shadow:0 0 10px hsla(var(--bh),100%,65%,.8)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="32"] .pkSign{color:hsl(var(--bh),70%,26%);background:linear-gradient(180deg,#fff,hsl(var(--bh),70%,94%));box-shadow:inset 0 0 0 1.5px hsla(var(--bh),70%,45%,.6), 0 4px 12px rgba(40,40,80,.12);text-shadow:none}
.tsm .tsmRitualLayer[data-rid="32"] .pkSign.stamp{animation:pkStamp .55s cubic-bezier(.3,1.6,.5,1)}
@keyframes pkStamp{0%{transform:scale(1)}30%{transform:scale(1.1,.9)}100%{transform:scale(1)}}
.tsm .tsmRitualLayer[data-rid="32"] .pkPost{position:absolute;width:12px;height:22px;border-radius:4px;background:linear-gradient(180deg,#f2f2f7,#a6a9b8);box-shadow:0 2px 6px rgba(0,0,0,.4);pointer-events:none}
.tsm .tsmRitualLayer[data-rid="32"] .pkArm{position:absolute;height:9px;border-radius:5px;transform-origin:4px 50%;pointer-events:none;
  background:repeating-linear-gradient(90deg,#f04848 0 14px,#fff 14px 28px);box-shadow:0 2px 6px rgba(0,0,0,.35);transition:transform .45s cubic-bezier(.4,1.5,.5,1)}
.tsm .tsmRitualLayer[data-rid="32"] .pkChip{position:absolute;display:flex;align-items:center;gap:5px;padding:0 6px 0 3px;border-radius:20px;pointer-events:none;
  background:linear-gradient(180deg, hsla(var(--bh),70%,30%,.96), hsla(var(--bh),70%,20%,.96));box-shadow:inset 0 0 0 1px hsla(var(--bh),100%,75%,.55), 0 4px 10px rgba(0,0,0,.35);
  animation:pkChipIn .45s cubic-bezier(.3,1.5,.5,1) both}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="32"] .pkChip{background:linear-gradient(180deg,#fff,hsl(var(--bh),80%,95%));box-shadow:inset 0 0 0 1px hsla(var(--bh),70%,45%,.5), 0 4px 10px rgba(40,40,80,.15)}
@keyframes pkChipIn{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="32"] .pkChip .pkFace{flex:none;width:var(--cf);height:var(--cf);border-radius:50%;overflow:hidden;background:#fff;box-shadow:0 0 0 1.5px rgba(255,255,255,.8)}
.tsm .tsmRitualLayer[data-rid="32"] .pkChip .pkFace img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="32"] .pkChip .pkFace img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="32"] .pkChip span{flex:1;min-width:0;font-weight:500;letter-spacing:-.01em;line-height:1.08;color:#fff;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;word-break:break-word}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="32"] .pkChip span{color:#1e2140}
.tsm .tsmRitualLayer[data-rid="32"] .pkCar{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);touch-action:none;cursor:grab;will-change:transform}
.tsm .tsmRitualLayer[data-rid="32"] .pkCar .pkDrive{position:absolute;inset:0;animation:pkDriveIn .7s cubic-bezier(.2,1.1,.4,1) both}
@keyframes pkDriveIn{0%{opacity:0;transform:translate3d(0,120px,0) scale(.9)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="32"] .pkCar .tsmOrb{left:0;top:0;transition:transform .14s cubic-bezier(.3,1.5,.5,1)}
.tsm .tsmRitualLayer[data-rid="32"] .pkCar.press .tsmOrb{transform:scale(1.06,.93)}
.tsm .tsmRitualLayer[data-rid="32"] .pkCar.parking{pointer-events:none;transition:transform .5s cubic-bezier(.45,0,.3,1), opacity .25s ease .4s}
.tsm .tsmRitualLayer[data-rid="32"] .pkHead{position:absolute;left:50%;bottom:-6px;width:70%;height:40px;margin-left:-35%;pointer-events:none;border-radius:50%;
  background:radial-gradient(closest-side, rgba(255,236,170,.32), transparent);transform:translateY(-100%) scaleY(1.6)}
.tsm .tsmRitualLayer[data-rid="32"] .pkCaption{position:absolute;left:0;right:0;text-align:center;font-size:24px;font-weight:700;letter-spacing:.06em;color:#ffe9b0;text-shadow:0 0 18px rgba(255,200,90,.7);opacity:0;transform:translateY(8px);transition:opacity 1s ease, transform 1s ease;pointer-events:none}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="32"] .pkCaption{color:#6b4a00;text-shadow:0 0 14px rgba(255,210,120,.9)}
.tsm .tsmRitualLayer[data-rid="32"] .pkCaption.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="32"] .pkCar .pkDrive,.tsm .tsmRitualLayer[data-rid="32"] .pkChip{animation:none}}
`

function RitualParkIt({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [parked, setParked] = React.useState<{ i: number; b: number }[]>([])
    const [happy, setHappy] = React.useState(false)
    const [press, setPress] = React.useState(false)
    const [parking, setParking] = React.useState(false)
    const [gates, setGates] = React.useState<boolean[]>([false, false, false]) // closed?
    const [stamp, setStamp] = React.useState<number[]>([0, 0, 0])
    const [fin, setFin] = React.useState(false)
    const timers = useTimers()
    const carRef = React.useRef<HTMLDivElement>(null)
    const bayRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const busyRef = React.useRef(false)
    const hotRef = React.useRef(-1)
    const parkedRef = useLatest(parked)
    const idxRef = useLatest(idx)

    // ---- layout: three bays across the top, the lane + vehicle in the thumb zone ----
    const M = 8
    const gap = 7
    const bayW = Math.floor((w - 2 * M - 2 * gap) / 3)
    const bayTop = 10
    const bayH = Math.round(clamp(h * 0.45, 220, 340))
    const bayBottom = bayTop + bayH
    const bayX = (b: number) => M + b * (bayW + gap)
    const laneTop = bayBottom + 8
    const laneBottom = h - 76
    const d = Math.round(clamp(Math.min(w * 0.34, laneBottom - laneTop - 34), 100, 138))
    const home = { x: w / 2, y: laneTop + (laneBottom - laneTop) / 2 + 4 }
    const SIGN_B = 10 + 48 + 10
    const GATE_Y = bayH - 22
    const chipH = 38
    const chipFace = bayW < 118 ? 24 : 28
    const slotY = (b: number, k: number, count: number) => {
        const avail = GATE_Y - 12 - SIGN_B - chipH
        const step = count > 1 ? Math.min(chipH + 6, avail / (count - 1)) : 0
        return bayTop + SIGN_B + k * step
    }

    const setHot = (b: number) => {
        if (hotRef.current === b) return
        if (hotRef.current >= 0) bayRefs.current[hotRef.current]?.classList.remove("hot")
        if (b >= 0) {
            bayRefs.current[b]?.classList.add("hot")
            ctx.haptic(6)
            ctx.sfx("plink")
        }
        hotRef.current = b
    }
    const bayAt = (x: number, y: number) => {
        if (y > bayBottom + 24) return -1
        for (let b = 0; b < 3; b++) if (x >= bayX(b) - gap / 2 && x <= bayX(b) + bayW + gap / 2) return b
        return -1
    }

    const drag = useDrag({
        onStart: () => {
            if (busyRef.current || fin) return false
            setPress(true)
            ctx.sfx("tap")
            ctx.haptic(8)
            const el = carRef.current
            if (el) el.style.transition = ""
        },
        onMove: (di) => {
            const el = carRef.current
            if (!el) return
            // a little weight: it trails the finger a touch and leans into the turn
            const lean = clamp(di.vx * 0.012, -10, 10)
            el.style.transform = `translate3d(${di.dx}px,${di.dy}px,0) rotate(${lean}deg)`
            setHot(bayAt(home.x + di.dx, home.y + di.dy))
        },
        onEnd: (di) => {
            setPress(false)
            const b = bayAt(home.x + di.dx, home.y + di.dy)
            setHot(-1)
            if (b >= 0 && Math.hypot(di.dx, di.dy) > 30) park(b, di.dx, di.dy)
            else {
                const el = carRef.current
                if (el) {
                    el.style.transition = "transform .55s cubic-bezier(.3,1.5,.5,1)"
                    el.style.transform = ""
                }
                if (Math.hypot(di.dx, di.dy) > 30) {
                    ctx.sfx("soft")
                    ctx.hint("Drop it inside one of the bays")
                } else ctx.hint("Drag it up into a bay")
            }
        },
    })

    const park = (b: number, fromDx = 0, fromDy = 0) => {
        if (busyRef.current) return
        busyRef.current = true
        const i = idxRef.current
        const count = parkedRef.current.filter((p) => p.b === b).length
        const tx = bayX(b) + bayW / 2
        const ty = slotY(b, count, count + 1) + chipH / 2
        const el = carRef.current
        setHappy(true)
        setParking(true)
        ctx.sfx("tap")
        ctx.haptic(12)
        if (el) {
            el.style.transition = ""
            el.style.transform = `translate3d(${fromDx}px,${fromDy}px,0)`
            void el.offsetWidth
            el.style.transition = "transform .5s cubic-bezier(.45,0,.3,1), opacity .25s ease .4s"
            el.style.transform = `translate3d(${tx - home.x}px,${ty - home.y}px,0) scale(${(chipH + 4) / d})`
        }
        timers.after(480, () => {
            setParked((p) => [...p, { i, b }])
            setGates((g) => g.map((v, k) => (k === b ? true : v)))
            setStamp((s) => s.map((v, k) => (k === b ? v + 1 : v)))
            ctx.sfx("clack")
            timers.after(140, () => ctx.sfx("bell"))
            ctx.haptic([10, 40, 16])
            // the ticket prints: a paper stub flicks out of the gate post, sparks on the stamp
            const gx = bayX(b) + 6
            const gy = bayTop + GATE_Y
            ctx.fx.burst(gx, gy, { count: 3, shape: "paper", size: [7, 10], speed: [90, 160], angle: [-Math.PI * 0.75, -Math.PI * 0.35], life: [0.9, 1.2], gravity: 260, spin: 6, colors: ["rgba(255,250,235,1)", "rgba(255,226,150,1)"] })
            ctx.fx.burst(tx, bayTop + 34, { count: 12, shape: "spark", size: [2, 3], speed: [60, 180], life: [0.4, 0.7], drag: 0.92, colors: [`hsla(${PARK_HUES[b]},100%,75%,1)`, "rgba(255,255,255,1)"], add: true })
            const n = parkedRef.current.length + 1
            ctx.progress(n / N)
            if (n >= N) {
                timers.after(500, finale)
                return
            }
            ctx.hint(n === N - 1 ? "Last one — park it" : `Parked · ${N - n} more to park`)
            timers.after(700, () => setGates((g) => g.map((v, k) => (k === b ? false : v))))
            timers.after(820, () => {
                const c = carRef.current
                if (c) {
                    c.style.transition = ""
                    c.style.transform = ""
                }
                setParking(false)
                setHappy(false)
                setIdx((x) => x + 1)
                busyRef.current = false
            })
        })
    }

    const finale = () => {
        ctx.hint("")
        setFin(true)
        setGates([true, true, true])
        ;[0, 1, 2].forEach((b) =>
            timers.after(b * 260, () => {
                ctx.sfx("clack")
                ctx.haptic(10)
                setStamp((s) => s.map((v, k) => (k === b ? v + 1 : v)))
                ctx.fx.burst(bayX(b) + bayW / 2, bayTop + 34, { count: 16, shape: "glow", size: [3, 7], speed: [30, 120], life: [0.8, 1.3], drag: 0.94, colors: [`hsla(${PARK_HUES[b]},100%,75%,1)`, "rgba(255,255,255,1)"] })
            })
        )
        timers.after(900, () => {
            ctx.sfx("chime")
            for (let k = 0; k < 18; k++) timers.after(k * 60, () => ctx.fx.add({ x: w * (0.08 + Math.random() * 0.84), y: laneTop + Math.random() * (laneBottom - laneTop) * 0.8, vx: 0, vy: -14, max: 1.4, size: 1.5 + Math.random() * 2.5, shape: "glow", color: "rgba(255,240,200,1)" }))
        })
        timers.after(2300, () => {
            ctx.sfx("win")
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Drag the thought into a bay")
    }, [])

    const word = ctx.words[Math.min(idx, N - 1)]
    const perBay = [0, 1, 2].map((b) => parked.filter((p) => p.b === b))
    return (
        <>
            <div className="pkGround" />
            <i className="pkLane" style={{ left: w / 2 - 2, width: 4, top: laneTop + 4, height: Math.max(0, laneBottom - laneTop - 8), opacity: fin ? 0 : 0.6 }} />
            <i className="pkChev" style={{ left: w * 0.2, top: home.y - 6, opacity: fin ? 0 : 1 }} />
            <i className="pkChev" style={{ left: w * 0.8, top: home.y - 6, opacity: fin ? 0 : 1 }} />
            {[0, 1, 2].map((b) => (
                <div
                    key={b}
                    ref={(el) => (bayRefs.current[b] = el)}
                    className="pkBay"
                    style={{ left: bayX(b), top: bayTop, width: bayW, height: bayH, ["--bh" as any]: PARK_HUES[b] }}
                    onClick={() => {
                        if (!busyRef.current && !fin) park(b)
                    }}
                    role="button"
                    aria-label={`Park in ${PARK_BAYS[b]}: ${word || "your picture"}`}
                >
                    <div key={stamp[b]} className={cx("pkSign", stamp[b] > 0 && "stamp")}>
                        {b === 0 ? (
                            <span>
                                LATER
                                <br />
                                TODAY
                            </span>
                        ) : (
                            PARK_BAYS[b]
                        )}
                    </div>
                </div>
            ))}
            {perBay.map((list, b) =>
                list.map((p, k) => (
                    <div key={`c${p.i}`} className="pkChip" style={{ left: bayX(b) + 9, top: slotY(b, k, list.length), width: bayW - 14, height: chipH, ["--bh" as any]: PARK_HUES[b], zIndex: 2 + k }}>
                        <span className="pkFace" style={{ ["--cf" as any]: `${chipFace}px` }}>{ctx.pic(p.i, true) ? <img className={ctx.uploaded ? "up" : undefined} src={ctx.pic(p.i, true) || ""} alt="" draggable={false} /> : null}</span>
                        <span style={{ fontSize: parkChipPx(ctx.words[p.i] || "", bayW - 14 - 14 - chipFace) }}>{ctx.words[p.i] || "·"}</span>
                    </div>
                ))
            )}
            {[0, 1, 2].map((b) => (
                <React.Fragment key={`g${b}`}>
                    <i className="pkArm" style={{ left: bayX(b) + 2, top: bayTop + GATE_Y - 4, width: bayW - 6, transform: gates[b] ? "rotate(0deg)" : "rotate(-88deg)", zIndex: 9 }} />
                    <i className="pkPost" style={{ left: bayX(b) - 4, top: bayTop + GATE_Y - 10, zIndex: 10 }} />
                </React.Fragment>
            ))}
            {!fin ? (
                <div
                    key={idx}
                    ref={carRef}
                    className={cx("pkCar", press && "press", parking && "parking")}
                    style={{ left: home.x, top: home.y, ["--d" as any]: `${d}px`, zIndex: 20 }}
                    {...drag}
                    role="button"
                    aria-label={`Drag to a bay: ${word || "your picture"}`}
                >
                    <div className="pkDrive">
                        <i className="pkHead" />
                        <Orb src={ctx.pic(idx, happy)} text={word} d={d} hue={ctx.hue(idx)} hue2={PARK_HUES[0]} mood={happy ? "happy" : MOOD_FOR_CHAR[ctx.char(idx)] || "nervous"} aura={happy ? 0.8 : 0} uploaded={ctx.uploaded} />
                    </div>
                </div>
            ) : null}
            <div className={cx("pkCaption", fin && "on")} style={{ top: home.y - 16 }}>
                See you later.
            </div>
        </>
    )
}

tsmRitual({ id: 32, hint: "Drag the thought into a bay", css: PARK_CSS, Comp: RitualParkIt })
