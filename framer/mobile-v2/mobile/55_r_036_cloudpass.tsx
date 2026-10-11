/* ================================================================== */
/* 36 · CLOUD PASS — a dawn sky that only clears for a slow push       */
/* ================================================================== */
// Desktop rules kept: one cloud per word (6 rounds); push it RIGHT; it passes only for a push that is long
// enough (≥ ~1/3 of the stage) AND slow enough (≥ 450 ms); a fast or short attempt makes the cloud puff larger
// (+24 meter → +4.8 % scale, cap +20 %) and gently says "slower" — never a penalty; progress k/6; bonus 250.
// Fixed: speed is now measured DURING the push (recent velocity + average), so a frantic swipe puffs the cloud
// the moment it gets too fast, and the cloud visibly swells as you speed up (the tempo meter is the cloud
// itself); every cloud drifts in fresh from the left; the sky clears and the sun rises with each pass
// ("sky clear %"); the last cloud parts on a sunrise with a rainbow.

const CLOUD_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="36"] .clSky{position:absolute;inset:0;background:
  radial-gradient(80% 40% at 78% 100%, rgba(255,170,120,.45), transparent 70%),
  linear-gradient(180deg,#141a3c 0%,#2b2a5e 34%,#5b3f78 62%,#a3607a 82%,#e08a74 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="36"] .clSky{background:
  radial-gradient(80% 40% at 78% 100%, rgba(255,214,170,.8), transparent 70%),
  linear-gradient(180deg,#8fa8e0 0%,#b6b9e8 36%,#e3c3dc 66%,#ffd2b8 86%,#ffe2c4 100%)}
.tsm .tsmRitualLayer[data-rid="36"] .clStars{position:absolute;inset:0 0 40% 0;pointer-events:none;transition:opacity 1.4s ease;
  background-image:radial-gradient(1.2px 1.2px at 12% 14%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 31% 6%,#fff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 54% 18%,#ffe9c9 50%,transparent 51%),radial-gradient(1px 1px at 72% 9%,#fff 50%,transparent 51%),radial-gradient(1.3px 1.3px at 88% 24%,#cfe3ff 50%,transparent 51%),radial-gradient(1px 1px at 20% 38%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 64% 34%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 92% 50%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 6% 56%,#ffe9c9 50%,transparent 51%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="36"] .clStars{display:none}
.tsm .tsmRitualLayer[data-rid="36"] .clDawn{position:absolute;inset:0;transition:opacity 1.4s ease;background:
  radial-gradient(70% 45% at 76% 96%, rgba(255,236,190,.95) 0%, rgba(255,196,130,.5) 30%, transparent 64%),
  linear-gradient(180deg,#3f78c8 0%,#6aa6e2 40%,#a8d2f2 72%,#ffe0b8 100%)}
.tsm .tsmRitualLayer[data-rid="36"] .clSun{position:absolute;border-radius:50%;transition:transform 1.4s cubic-bezier(.3,.8,.3,1);
  background:radial-gradient(circle, #fff7e0 0%, #ffe2a0 38%, rgba(255,190,110,.55) 56%, transparent 70%)}
.tsm .tsmRitualLayer[data-rid="36"] .clHills{position:absolute;left:-10%;right:-10%;bottom:0;pointer-events:none;
  background:radial-gradient(60% 100% at 25% 100%, #1d1838 60%, transparent 61%),radial-gradient(55% 90% at 80% 100%, #251d40 60%, transparent 61%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="36"] .clHills{background:radial-gradient(60% 100% at 25% 100%, #8a7fb3 60%, transparent 61%),radial-gradient(55% 90% at 80% 100%, #9b8fbe 60%, transparent 61%)}
.tsm .tsmRitualLayer[data-rid="36"] .clHaze{position:absolute;inset:0;pointer-events:none;transition:opacity 1.4s ease;background:linear-gradient(180deg, rgba(40,40,70,.55), rgba(60,50,80,.25) 60%, transparent)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="36"] .clHaze{background:linear-gradient(180deg, rgba(120,120,150,.45), rgba(140,130,160,.2) 60%, transparent)}
.tsm .tsmRitualLayer[data-rid="36"] .clBow{position:absolute;border-radius:50%;pointer-events:none;opacity:0;transform:scale(.9);transition:opacity 1.6s ease .2s, transform 1.6s ease .2s;
  background:radial-gradient(closest-side, transparent 78%, rgba(255,80,80,.55) 80%, rgba(255,170,60,.55) 83%, rgba(255,240,90,.5) 86%, rgba(90,220,120,.45) 89%, rgba(80,160,255,.45) 92%, rgba(150,100,255,.4) 95%, transparent 98%)}
.tsm .tsmRitualLayer[data-rid="36"] .clBow.on{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="36"] .clWind{position:absolute;height:2px;border-radius:2px;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:clWind var(--wd,5s) linear infinite;animation-delay:var(--wl,0s)}
@keyframes clWind{0%{transform:translateX(-30vw);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateX(70vw);opacity:0}}
.tsm .tsmRitualLayer[data-rid="36"] .clCloud{position:absolute;width:var(--cw);height:var(--ch);margin:calc(var(--ch)*-.5) 0 0 calc(var(--cw)*-.5);touch-action:none;cursor:grab;will-change:transform}
.tsm .tsmRitualLayer[data-rid="36"] .clIn{position:absolute;inset:0;animation:clIn 1.3s cubic-bezier(.2,.8,.3,1) both}
@keyframes clIn{0%{opacity:0;transform:translate3d(-70vw,0,0)}35%{opacity:1}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="36"] .clPuff{position:absolute;inset:0;transform-origin:50% 60%;transition:transform .45s cubic-bezier(.3,1.7,.5,1)}
.tsm .tsmRitualLayer[data-rid="36"] .clBody{position:absolute;inset:0;transition:transform .12s ease}
.tsm .tsmRitualLayer[data-rid="36"] .clBody i{position:absolute;border-radius:50%;
  background:radial-gradient(circle at 42% 32%, #ffffff 0%, #e4ecff 42%, #aebde8 100%);box-shadow:inset 0 -10px 18px rgba(80,90,160,.28), 0 0 0 1.5px rgba(120,230,255,.55), 0 0 22px rgba(90,210,255,.45)}
.tsm .tsmRitualLayer[data-rid="36"] .clBody i:nth-child(1){left:4%;top:36%;width:38%;height:50%}
.tsm .tsmRitualLayer[data-rid="36"] .clBody i:nth-child(2){left:22%;top:4%;width:54%;height:68%}
.tsm .tsmRitualLayer[data-rid="36"] .clBody i:nth-child(3){left:56%;top:24%;width:40%;height:56%}
.tsm .tsmRitualLayer[data-rid="36"] .clBody i:nth-child(4){left:12%;top:46%;width:76%;height:46%;border-radius:60px}
.tsm .tsmRitualLayer[data-rid="36"] .clCloud.calm .clBody i{background:radial-gradient(circle at 42% 32%, #ffffff 0%, #fff4e6 45%, #f2d6c4 100%);box-shadow:inset 0 -10px 18px rgba(200,140,110,.25), 0 0 0 1.5px rgba(255,220,170,.6), 0 0 22px rgba(255,200,140,.45)}
.tsm .tsmRitualLayer[data-rid="36"] .clFace{position:absolute;left:50%;top:9%;width:var(--fd);height:var(--fd);margin-left:calc(var(--fd)*-.5);border-radius:50%;overflow:hidden;
  box-shadow:0 0 0 2px rgba(255,255,255,.9), 0 4px 12px rgba(40,40,90,.3);background:#fff}
.tsm .tsmRitualLayer[data-rid="36"] .clFace img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="36"] .clFace img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="36"] .clFace img.pos{opacity:0}
.tsm .tsmRitualLayer[data-rid="36"] .clCloud.calm .clFace img.pos{animation:clFaceIn .6s cubic-bezier(.3,1.6,.45,1) both}
.tsm .tsmRitualLayer[data-rid="36"] .clCloud.calm .clFace img.neg{opacity:0;transition:opacity .2s ease}
@keyframes clFaceIn{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1.14)}}
.tsm .tsmRitualLayer[data-rid="36"] .clWords{position:absolute;left:13%;right:13%;top:calc(9% + var(--fd) + 6px);text-align:center;font-size:var(--fs);line-height:1.15;font-weight:500;color:#252a58;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.tsm .tsmRitualLayer[data-rid="36"] .clCue{position:absolute;top:50%;width:14px;height:14px;margin-top:-7px;border-right:3px solid rgba(255,255,255,.75);border-top:3px solid rgba(255,255,255,.75);transform:rotate(45deg);animation:clCue 2.2s ease-in-out infinite;pointer-events:none}
@keyframes clCue{0%{opacity:0;translate:-8px 0}40%{opacity:1}100%{opacity:0;translate:18px 0}}
.tsm .tsmRitualLayer[data-rid="36"] .clCaption{position:absolute;left:0;right:0;text-align:center;font-size:26px;font-weight:700;letter-spacing:.02em;color:#fff;text-shadow:0 2px 16px rgba(60,90,160,.5);opacity:0;transform:translateY(8px);transition:opacity 1s ease .6s, transform 1s ease .6s;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="36"] .clCaption.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="36"] .clWind,.tsm .tsmRitualLayer[data-rid="36"] .clCue,.tsm .tsmRitualLayer[data-rid="36"] .clIn{animation:none}}
`

function RitualCloudPass({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [cleared, setCleared] = React.useState(0)
    const [meter, setMeter] = React.useState(0)
    const [passing, setPassing] = React.useState(false)
    const [dragging, setDragging] = React.useState(false)
    const [fin, setFin] = React.useState(false)
    const timers = useTimers()
    const cloudRef = React.useRef<HTMLDivElement>(null)
    const bodyRef = React.useRef<HTMLDivElement>(null)
    const busyRef = React.useRef(false)
    const deadRef = React.useRef(false) // this push already puffed: ignore the rest of it
    const emaRef = React.useRef(0)
    const samples = React.useRef<{ t: number; x: number }[]>([])
    const meterRef = useLatest(meter)
    const idxRef = useLatest(idx)

    // ---- layout: the cloud on the left third, the open sky (and the sun) to the right ----
    const cw = Math.round(clamp(w * 0.56, 190, 236))
    const ch = Math.round(cw * 0.74)
    const fd = Math.round(cw * 0.3)
    const fs = cw >= 220 ? 15.5 : 14.5
    const home = { x: Math.max(cw / 2 + 12, w * 0.36), y: Math.round(clamp(h * 0.4, ch / 2 + 40, h - 140)) }
    const T = Math.round(clamp(w * 0.36, 120, 170)) // distance to pass
    const FAST = 480 // px/s — recent speed that puffs the cloud
    const AVG_MAX = 320 // px/s — average speed allowed over the push
    const MIN_MS = 450
    const sunD = Math.round(w * 0.42)

    const place = (x: number, anim?: string) => {
        const el = cloudRef.current
        if (!el) return
        el.style.transition = anim || ""
        el.style.transform = `translate3d(${x}px,0,0) rotate(${clamp(x * 0.02, 0, 3)}deg)`
    }
    const swell = (k: number) => {
        const b = bodyRef.current
        if (b) b.style.transform = `scale(${1 + 0.07 * k},${1 + 0.05 * k})`
    }

    const puff = (why: "fast" | "short") => {
        deadRef.current = true
        const m = Math.min(100, meterRef.current + 24)
        setMeter(m)
        place(0, "transform .7s cubic-bezier(.3,1.4,.5,1)")
        swell(0)
        ctx.sfx("soft")
        ctx.haptic([6, 30, 6])
        // it puffs: soft wisps burst from its rim
        for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2
            ctx.fx.add({ x: home.x + Math.cos(a) * cw * 0.46, y: home.y + Math.sin(a) * ch * 0.42, vx: Math.cos(a) * 50, vy: Math.sin(a) * 40, drag: 0.94, max: 0.8, size: 22, grow: 18, shape: "smoke", color: ctx.theme === "bright" ? "rgba(255,255,255,.5)" : "rgba(220,230,255,.22)" })
        }
        ctx.hint(why === "fast" ? "Slower… one gentle push" : "Further — slow and steady")
    }

    const pass = () => {
        busyRef.current = true
        deadRef.current = true
        setDragging(false)
        setPassing(true)
        swell(0)
        ctx.sfx("chime")
        ctx.haptic(14)
        const i = idxRef.current
        // it catches the wind: a relieved beat (the face turns), then it glides off to the right and its words
        // peel away on the breeze
        place(T, "transform .5s cubic-bezier(.3,1.5,.5,1)")
        timers.after(700, () => {
            place(w - home.x + cw * 0.7, "transform 1.5s cubic-bezier(.5,0,.6,1)")
            ctx.sfx("soft")
            for (let k = 0; k < 10; k++) ctx.fx.add({ x: home.x + T - cw * 0.55, y: home.y + (Math.random() - 0.5) * ch * 0.8, vx: 300 + Math.random() * 160, vy: 0, max: 0.9, size: 2, shape: "streak", color: "rgba(255,255,255,.7)" })
        })
        const letters = Array.from(ctx.words[i] || "").filter((c) => c !== " ")
        letters.slice(0, 18).forEach((c, k) =>
            timers.after(820 + k * 45, () =>
                ctx.fx.add({ x: home.x + T + (k - letters.length / 2) * 8 + k * 6, y: home.y + ch * 0.2 + (Math.random() - 0.5) * 10, vx: 110 + Math.random() * 90, vy: -16 - Math.random() * 34, ay: -12, drag: 0.995, max: 1.7, size: 15, rot: 0, vr: (Math.random() - 0.5) * 2, shape: "text", text: c, color: ctx.theme === "bright" ? "rgba(40,50,110,1)" : "rgba(255,255,255,1)" })
            )
        )
        const n = i + 1
        ctx.progress(n / N)
        timers.after(500, () => setCleared(n))
        if (n >= N) {
            timers.after(1100, finale)
            return
        }
        ctx.hint(n === N - 1 ? "Last cloud — one slow push" : `${N - n} more clouds · slow and steady`)
        timers.after(2300, () => {
            setPassing(false)
            setMeter(0)
            place(0)
            setIdx(n)
            busyRef.current = false
        })
    }

    const drag = useDrag({
        onStart: () => {
            if (busyRef.current || fin) return false
            deadRef.current = false
            emaRef.current = 0
            samples.current = [{ t: performance.now(), x: 0 }]
            setDragging(true)
            ctx.sfx("tap")
            ctx.haptic(6)
        },
        onMove: (di) => {
            if (deadRef.current || busyRef.current) return
            // speed of the push over the last ~240 ms (robust to bunched / jittery touch events)
            const now = performance.now()
            const sm = samples.current
            sm.push({ t: now, x: di.dx })
            while (sm.length > 2 && now - sm[1].t > 240) sm.shift()
            const span = now - sm[0].t
            const v = span > 0 ? Math.abs(di.dx - sm[0].x) / (span / 1000) : 0
            emaRef.current = span >= 90 ? v : Math.min(v, emaRef.current || 0)
            const x = di.dx < 0 ? di.dx * 0.15 : di.dx
            place(x)
            // the cloud is its own tempo meter: it swells as you speed up
            swell(clamp01((emaRef.current - 160) / (FAST - 160)))
            if (span >= 90 && emaRef.current > FAST && di.dx > 12) {
                puff("fast")
                return
            }
            if (di.dx > 20 && Math.random() < 0.25) ctx.fx.add({ x: home.x - cw * 0.45 + x, y: home.y + (Math.random() - 0.5) * ch * 0.6, vx: 140, vy: 0, max: 0.6, size: 1.6, shape: "streak", color: "rgba(255,255,255,.55)" })
            if (di.dx >= T) {
                const avg = di.dx / Math.max(1, di.ms / 1000)
                if (di.ms >= MIN_MS && avg <= AVG_MAX) pass()
                else puff("fast")
            }
        },
        onEnd: (di) => {
            setDragging(false)
            if (deadRef.current || busyRef.current) return
            if (di.dx > 14) puff("short")
            else {
                place(0, "transform .5s cubic-bezier(.3,1.4,.5,1)")
                swell(0)
                ctx.hint("Push it slowly to the right")
            }
        },
    })

    const finale = () => {
        ctx.hint("")
        setFin(true)
        ctx.sfx("soft")
        timers.after(300, () => {
            ctx.sfx("chime")
            ctx.haptic([12, 50, 12])
            const sx = w * 0.76
            const sy = h - h * 0.16
            ctx.fx.burst(sx, sy, { count: 1, shape: "ring", size: [sunD * 0.3, sunD * 0.3], grow: w, life: [1.6, 1.6], speed: [0, 0], colors: ["rgba(255,236,190,.7)"], add: true })
            ctx.fx.burst(sx, sy, { count: 26, shape: "glow", size: [3, 8], speed: [40, 200], angle: [-Math.PI, 0], life: [1, 1.8], drag: 0.95, colors: ["rgba(255,240,200,1)", "rgba(255,210,150,1)"] })
        })
        timers.after(2400, () => {
            ctx.sfx("win")
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Push the cloud slowly to the right")
    }, [])

    const word = ctx.words[idx]
    const clearK = cleared / N
    // both faces stay mounted (the touched element must never be replaced mid-drag); the positive one pops in
    const src = ctx.pic(idx, false)
    const srcPos = ctx.pic(idx, true)
    return (
        <>
            <div className="clSky" />
            <i className="clStars" style={{ opacity: fin ? 0 : 1 - clearK }} />
            <div className="clDawn" style={{ opacity: fin ? 1 : clearK * 0.55 }} />
            <i className="clSun" style={{ left: w * 0.76 - sunD / 2, top: h - sunD * 0.36, width: sunD, height: sunD, transform: `translate3d(0,${-(fin ? 1 : clearK) * h * 0.16}px,0)` }} />
            <i className={cx("clBow", fin && "on")} style={{ left: w * 0.5 - h * 0.55, top: h * 0.94 - h * 0.55, width: h * 1.1, height: h * 1.1 }} />
            <div className="clHills" style={{ height: h * 0.14 }} />
            <div className="clHaze" style={{ opacity: fin ? 0 : 1 - clearK * 0.85 }} />
            {[0.18, 0.3, 0.62, 0.78].map((y, k) => (
                <i key={`w${k}`} className="clWind" style={{ left: 0, top: h * y, width: w * 0.35, ["--wd" as any]: `${5 + k * 1.3}s`, ["--wl" as any]: `${-k * 1.7}s`, opacity: fin ? 0 : undefined }} />
            ))}
            {!fin ? (
                <div
                    key={idx}
                    ref={cloudRef}
                    className={cx("clCloud", passing && "calm")}
                    style={{ left: home.x, top: home.y, ["--cw" as any]: `${cw}px`, ["--ch" as any]: `${ch}px`, ["--fd" as any]: `${fd}px`, ["--fs" as any]: `${fs}px` }}
                    {...drag}
                    role="button"
                    aria-label={`Push slowly to the right: ${word || "your picture"}`}
                >
                    <div className="clIn">
                        <div className="clPuff" style={{ transform: `scale(${1 + meter / 500})` }}>
                            <div ref={bodyRef} className="clBody">
                                <i />
                                <i />
                                <i />
                                <i />
                            </div>
                            {src ? (
                                <span className="clFace">
                                    <img className={cx("neg", ctx.uploaded && "up")} src={src} alt="" draggable={false} />
                                    {srcPos ? <img className={cx("pos", ctx.uploaded && "up")} src={srcPos} alt="" draggable={false} /> : null}
                                </span>
                            ) : null}
                            {word ? <span className="clWords">{word}</span> : null}
                        </div>
                        {!dragging && !passing ? <i className="clCue" style={{ left: cw + 10 }} aria-hidden="true" /> : null}
                    </div>
                </div>
            ) : null}
            <div className={cx("clCaption", fin && "on")} style={{ top: h * 0.3 }}>
                Easy does it.
            </div>
        </>
    )
}

tsmRitual({ id: 36, hint: "Push the cloud slowly to the right", css: CLOUD_CSS, Comp: RitualCloudPass })
