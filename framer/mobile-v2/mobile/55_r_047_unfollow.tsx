/* ================================================================== */
/* 47 · UNFOLLOW — the feed on the wall, one plug at a time            */
/* ================================================================== */
// Desktop rules kept: one feed card per word chunk (6), shown one at a time; one rightward pull of the plug
// unplugs that card; progress (i+1)/6; onDone(250) after the last. Spec intent added: a real glowing cable from
// the card to a wall socket, and duplicate copies of the card that keep scrolling past until you unplug —
// then the conveyor stops dead. Fixed: the plug is never hidden under the card; a near-miss springs the plug
// back into the socket (no stall, no reward, no progress for a failed pull); full words, picture + words on
// the card, the face turns relieved when its feed is cut.

const UF_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="47"] .ufRoom{position:absolute;inset:0;background:
  radial-gradient(70% 38% at 50% 22%, rgba(120,110,255,.30) 0%, rgba(80,70,200,.08) 50%, transparent 72%),
  linear-gradient(180deg,#120f2a 0%,#1b1840 46%,#221c46 74%,#17132f 75%,#0f0c22 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="47"] .ufRoom{background:
  radial-gradient(70% 38% at 50% 22%, rgba(255,255,255,.75) 0%, rgba(220,215,255,.3) 50%, transparent 72%),
  linear-gradient(180deg,#e7e3fb 0%,#ddd7f6 46%,#d4cdf0 74%,#c3b9e6 75%,#b3a8db 100%)}
.tsm .tsmRitualLayer[data-rid="47"] .ufQuiet{position:absolute;inset:0;opacity:0;transition:opacity 1.4s ease;pointer-events:none;
  background:radial-gradient(60% 36% at 50% 30%, rgba(255,226,180,.26) 0%, transparent 70%),linear-gradient(180deg,rgba(10,8,24,.55),rgba(10,8,24,.2))}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="47"] .ufQuiet{background:radial-gradient(60% 36% at 50% 30%, rgba(255,236,200,.8) 0%, transparent 70%)}
.tsm .tsmRitualLayer[data-rid="47"] .ufRoot.off .ufQuiet{opacity:1}
.tsm .tsmRitualLayer[data-rid="47"] .ufWin{position:absolute;left:0;right:0;top:0;overflow:hidden;transform-origin:50% 50%;
  -webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 9%,#000 91%,transparent 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 9%,#000 91%,transparent 100%)}
.tsm .tsmRitualLayer[data-rid="47"] .ufRoot.off .ufWin{animation:ufCrt .6s cubic-bezier(.6,0,.4,1) forwards}
@keyframes ufCrt{0%{transform:scale(1,1);opacity:1}55%{transform:scale(1,.012);opacity:1}100%{transform:scale(0,.012);opacity:0}}
.tsm .tsmRitualLayer[data-rid="47"] .ufStrip{position:absolute;left:0;right:0;top:0;animation:ufScroll 1.7s linear infinite;will-change:transform}
.tsm .tsmRitualLayer[data-rid="47"] .ufStrip.stop{animation-play-state:paused;opacity:0;transition:opacity .6s ease .15s}
@keyframes ufScroll{from{transform:translateY(0)}to{transform:translateY(calc(var(--sp)*-1))}}
.tsm .tsmRitualLayer[data-rid="47"] .ufCard{position:absolute;width:var(--cw);height:var(--chh);margin-left:calc(var(--cw)*-.5);border-radius:26px;overflow:hidden;
  background:radial-gradient(120% 70% at 50% 0%, hsla(var(--h),90%,70%,.30), transparent 70%),linear-gradient(180deg,hsl(var(--h),40%,24%),hsl(var(--h),45%,14%));
  box-shadow:inset 0 0 0 1px hsla(var(--h),90%,80%,.32), 0 18px 40px rgba(0,0,0,.4)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="47"] .ufCard{background:radial-gradient(120% 70% at 50% 0%, hsla(var(--h),90%,80%,.55), transparent 70%),linear-gradient(180deg,#ffffff,#f3f0fb);
  box-shadow:inset 0 0 0 1px hsla(var(--h),60%,60%,.35), 0 16px 34px rgba(60,40,120,.18)}
.tsm .tsmRitualLayer[data-rid="47"] .ufCard.ghost{opacity:.5;transform:scale(.92)}
.tsm .tsmRitualLayer[data-rid="47"] .ufCard.main{transition:transform .45s cubic-bezier(.4,0,.2,1), opacity .45s ease}
.tsm .tsmRitualLayer[data-rid="47"] .ufCard.main.out{transform:translateY(-34px) scale(.94);opacity:0}
.tsm .tsmRitualLayer[data-rid="47"] .ufCard.main.in{animation:ufIn .5s cubic-bezier(.3,1.4,.5,1)}
@keyframes ufIn{from{transform:translateY(40px) scale(.94);opacity:0}to{transform:none;opacity:1}}
.tsm .tsmRitualLayer[data-rid="47"] .ufPic{position:absolute;left:50%;top:var(--pt);width:var(--pd);height:var(--pd);margin-left:calc(var(--pd)*-.5);border-radius:50%;overflow:hidden;
  box-shadow:0 0 0 2px hsla(var(--h),90%,80%,.55), 0 6px 16px rgba(0,0,0,.3);background:hsla(var(--h),60%,30%,1)}
.tsm .tsmRitualLayer[data-rid="47"] .ufPic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14);transition:opacity .35s}
.tsm .tsmRitualLayer[data-rid="47"] .ufPic img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="47"] .ufTxt{position:absolute;left:18px;right:18px;top:var(--tt);bottom:14px;display:flex;align-items:center;justify-content:center;text-align:center;
  font-weight:600;line-height:1.18;color:#f6f3ff;letter-spacing:-.01em;word-break:break-word;transition:opacity .3s}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="47"] .ufTxt{color:#1d1940}
.tsm .tsmRitualLayer[data-rid="47"] .ufCard.cut .ufTxt{opacity:0}
.tsm .tsmRitualLayer[data-rid="47"] .ufLive{position:absolute;right:14px;top:14px;width:9px;height:9px;border-radius:50%;background:#ff5d8a;box-shadow:0 0 10px #ff5d8a;animation:tsmPulse 1s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="47"] .ufCard.cut .ufLive{opacity:0;animation:none}
.tsm .tsmRitualLayer[data-rid="47"] .ufSvg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="47"] .ufCable{transition:opacity .5s ease}
.tsm .tsmRitualLayer[data-rid="47"] .ufGlow{animation:ufHum 1.1s ease-in-out infinite}
@keyframes ufHum{0%,100%{opacity:.35}50%{opacity:.85}}
.tsm .tsmRitualLayer[data-rid="47"] .ufSocket{position:absolute;width:86px;height:96px;margin:-48px 0 0 -43px;border-radius:22px;
  background:linear-gradient(160deg,#f2f0fa 0%,#cfcbe0 60%,#aaa5c2 100%);box-shadow:inset 0 -4px 8px rgba(60,50,100,.25), 0 10px 22px rgba(0,0,0,.35)}
.tsm .tsmRitualLayer[data-rid="47"] .ufSocket i{position:absolute;left:28px;width:30px;height:9px;border-radius:5px;background:#2a2540;box-shadow:inset 0 2px 3px rgba(0,0,0,.6)}
.tsm .tsmRitualLayer[data-rid="47"] .ufSocket i:nth-child(1){top:32px}
.tsm .tsmRitualLayer[data-rid="47"] .ufSocket i:nth-child(2){top:55px}
.tsm .tsmRitualLayer[data-rid="47"] .ufPlug{position:absolute;width:var(--pw);height:68px;margin:-34px 0 0 0;touch-action:none;cursor:grab;will-change:transform}
.tsm .tsmRitualLayer[data-rid="47"] .ufPlug .ufBody{position:absolute;left:22px;right:0;top:0;bottom:0;border-radius:18px 26px 26px 18px;
  background:linear-gradient(180deg,#7cf2ff 0%,#38c6e8 48%,#1a8fb8 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.6), inset 0 -6px 10px rgba(0,60,100,.35), 0 10px 22px rgba(0,30,60,.4);transition:transform .12s ease}
.tsm .tsmRitualLayer[data-rid="47"] .ufPlug .ufBody b{position:absolute;right:16px;top:50%;width:26px;height:4px;margin-top:-12px;border-radius:2px;background:rgba(0,60,90,.35);box-shadow:0 10px 0 rgba(0,60,90,.35),0 20px 0 rgba(0,60,90,.35)}
.tsm .tsmRitualLayer[data-rid="47"] .ufPlug .ufPin{position:absolute;left:0;width:28px;height:9px;border-radius:3px;background:linear-gradient(180deg,#fff6d8,#d8b35a 60%,#a07a2a)}
.tsm .tsmRitualLayer[data-rid="47"] .ufPlug .ufPin:nth-of-type(1){top:16px}
.tsm .tsmRitualLayer[data-rid="47"] .ufPlug .ufPin:nth-of-type(2){top:39px}
.tsm .tsmRitualLayer[data-rid="47"] .ufPlug.grab .ufBody{transform:scale(1.04,.94)}
.tsm .tsmRitualLayer[data-rid="47"] .ufPlug.away{pointer-events:none}
.tsm .tsmRitualLayer[data-rid="47"] .ufArrow{position:absolute;width:44px;height:12px;margin:-6px 0 0 0;pointer-events:none;opacity:.7;animation:ufNudge 1.5s ease-in-out infinite;
  background:linear-gradient(90deg,transparent,rgba(160,240,255,.9));-webkit-mask-image:linear-gradient(90deg,transparent,#000);clip-path:polygon(0 40%,70% 40%,70% 0,100% 50%,70% 100%,70% 60%,0 60%)}
@keyframes ufNudge{0%,100%{transform:translateX(0);opacity:.25}50%{transform:translateX(12px);opacity:.85}}
.tsm .tsmRitualLayer[data-rid="47"] .ufCap{position:absolute;left:0;right:0;top:30%;text-align:center;font-size:26px;font-weight:600;color:#ffe9c8;opacity:0;transform:translateY(10px);transition:opacity 1s ease .8s, transform 1.2s ease .8s;pointer-events:none}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="47"] .ufCap{color:#3b2f6e}
.tsm .tsmRitualLayer[data-rid="47"] .ufRoot.off .ufCap{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="47"] .ufStrip,.tsm .tsmRitualLayer[data-rid="47"] .ufArrow,.tsm .tsmRitualLayer[data-rid="47"] .ufGlow{animation:none}}
`

function UfCard(p: { ctx: RitualCtx; i: number; happy: boolean; cls: string; x: number; y: number; cw: number; chh: number; pd: number; fs: number; label?: boolean }) {
    const { ctx, i } = p
    const word = ctx.words[i] || ""
    const src = ctx.pic(i, p.happy)
    const pt = word ? 16 : (p.chh - p.pd * 1.5) / 2
    const pd = word ? p.pd : p.pd * 1.5
    return (
        <div
            className={cx("ufCard", p.cls)}
            style={{ left: p.x, top: p.y, ["--cw" as any]: `${p.cw}px`, ["--chh" as any]: `${p.chh}px`, ["--h" as any]: ctx.hue(i), ["--pd" as any]: `${pd}px`, ["--pt" as any]: `${pt}px`, ["--tt" as any]: `${pt + pd + 8}px` }}
            aria-label={p.label ? `Feed card: ${word || "your picture"}` : undefined}
            aria-hidden={p.label ? undefined : true}
        >
            <span className="ufPic">{src ? <img className={ctx.uploaded ? "up" : undefined} src={src} alt="" draggable={false} /> : null}</span>
            {word ? (
                <span className="ufTxt" style={{ fontSize: p.fs }}>
                    {word}
                </span>
            ) : null}
            <i className="ufLive" />
        </div>
    )
}

function RitualUnfollow({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [cut, setCut] = React.useState(false) // the current card's plug is out
    const [out, setOut] = React.useState(false)
    const [grab, setGrab] = React.useState(false)
    const [off, setOff] = React.useState(false)
    const timers = useTimers()
    const plugRef = React.useRef<HTMLDivElement>(null)
    const cableRef = React.useRef<SVGPathElement>(null)
    const glowRef = React.useRef<SVGPathElement>(null)
    const busy = React.useRef(false)
    const offRef = React.useRef({ x: 0, y: 0 })
    const raf = React.useRef(0)
    React.useEffect(() => () => cancelAnimationFrame(raf.current), [])

    // ---------- layout ----------
    const cw = Math.min(w - 56, 320)
    const chh = Math.round(clamp(h * 0.3, 186, 236))
    const cardY = Math.round(clamp(h * 0.09, 52, 78))
    const winH = cardY * 2 + chh
    const sp = chh + 22
    const pd = Math.round(clamp(chh * 0.4, 74, 96))
    const word = ctx.words[idx] || ""
    const fs = fitThoughtPx(word, cw - 36, chh - 16 - pd - 8 - 18, 24, 14, 1.18)
    const sy = Math.round(Math.min(h - 84 - 70, winH + (h - 84 - winH) * 0.62))
    const sx = Math.round(Math.max(54, w * 0.17))
    const pw = 112
    const plugX0 = sx + 43 - 24 // pins sit inside the socket
    const T = Math.round(clamp(w * 0.34, 112, 150))
    const cardBottom = cardY + chh

    const cablePath = (ox: number, oy: number, slack = 0) => {
        const ax = plugX0 + pw + ox
        const ay = sy + oy
        const bx = w / 2
        const by = cardBottom - 6
        return `M${ax.toFixed(1)} ${ay.toFixed(1)} C${(ax + 70).toFixed(1)} ${(ay + 10 + slack).toFixed(1)} ${bx.toFixed(1)} ${(by + 110 + slack).toFixed(1)} ${bx} ${by}`
    }
    const place = (ox: number, oy: number) => {
        offRef.current = { x: ox, y: oy }
        if (plugRef.current) plugRef.current.style.transform = `translate3d(${ox.toFixed(1)}px,${oy.toFixed(1)}px,0) rotate(${(oy * 0.25).toFixed(2)}deg)`
        const d = cablePath(ox, oy)
        cableRef.current && cableRef.current.setAttribute("d", d)
        glowRef.current && glowRef.current.setAttribute("d", d)
    }
    // keep the cable attached after any re-layout
    React.useLayoutEffect(() => {
        if (!cut) place(offRef.current.x, offRef.current.y)
    })

    const springBack = () => {
        const { x: x0, y: y0 } = offRef.current
        const t0 = performance.now()
        const dur = ctx.reduced ? 200 : 520
        cancelAnimationFrame(raf.current)
        const step = () => {
            const q = clamp01((performance.now() - t0) / dur)
            const k = 1 - (ctx.reduced ? easeOutCubic(q) : easeOutElastic(q))
            place(x0 * k, y0 * k)
            if (q < 1) raf.current = requestAnimationFrame(step)
            else {
                place(0, 0)
                ctx.sfx("clack")
                ctx.haptic(10)
            }
        }
        raf.current = requestAnimationFrame(step)
    }

    const unplug = () => {
        busy.current = true
        setGrab(false)
        setCut(true)
        const n = idx + 1
        const last = n === N
        ctx.sfx("spark")
        timers.after(30, () => ctx.sfx("clack"))
        ctx.haptic([12, 30, 10])
        // sparks out of the socket; the plug flies free with the pull's momentum and drops
        const s0x = sx + 30
        ctx.fx.burst(s0x, sy, { count: 16, shape: "spark", size: [1.5, 2.6], speed: [160, 380], angle: [-1.2, 1.2], life: [0.25, 0.45], drag: 0.9, colors: ["rgba(160,240,255,1)", "rgba(255,255,255,1)", "rgba(255,230,160,1)"] })
        ctx.fx.burst(s0x, sy, { count: 1, shape: "ring", size: [8, 8], grow: 140, life: [0.35, 0.35], speed: [0, 0], colors: ["rgba(150,235,255,.9)"] })
        const el = plugRef.current
        if (el) {
            const { x, y } = offRef.current
            el.style.transition = "transform .7s cubic-bezier(.3,.1,.6,1), opacity .5s ease .25s"
            el.style.transform = `translate3d(${x + 40}px,${y + 70}px,0) rotate(24deg)`
            el.style.opacity = "0"
        }
        cableRef.current && cableRef.current.setAttribute("d", cablePath(offRef.current.x + 40, offRef.current.y + 70, 70))
        ctx.progress(n / N)
        // the card's words lose their signal and fall out
        timers.after(380, () => {
            const letters = Array.from(word).filter((c) => c !== " ").slice(0, 26)
            const ty = cardY + 16 + pd + 8 + (chh - 16 - pd - 8) / 2 - 8
            letters.forEach((c, k) =>
                ctx.fx.add({ x: w / 2 - letters.length * 4.5 + k * 9 + (Math.random() - 0.5) * 6, y: ty + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 40, vy: -40 + Math.random() * 40, ay: 600, drag: 0.99, max: 1.1, size: fs * 0.8, rot: 0, vr: (Math.random() - 0.5) * 4, shape: "text", text: c, color: ctx.theme === "bright" ? "rgba(40,30,90,1)" : "rgba(240,236,255,1)", add: false })
            )
            ctx.sfx("soft")
        })
        timers.after(720, () => setOut(true))
        if (last) {
            timers.after(1000, finale)
            return
        }
        timers.after(1080, () => {
            // next card plugs itself back in
            setIdx(n)
            setCut(false)
            setOut(false)
            const pel = plugRef.current
            if (pel) {
                pel.style.transition = "none"
                pel.style.opacity = "1"
            }
            place(T + 40, 0)
            busy.current = false // grabbable at once: a grab mid-slide simply takes over
            raf.current = requestAnimationFrame(() => {
                const t0 = performance.now()
                const step = () => {
                    const q = clamp01((performance.now() - t0) / 380)
                    place((T + 40) * (1 - easeOutCubic(q)), 0)
                    if (q < 1) raf.current = requestAnimationFrame(step)
                    else {
                        if (pel) pel.style.transition = ""
                        ctx.sfx("hum")
                        ctx.haptic(8)
                    }
                }
                raf.current = requestAnimationFrame(step)
            })
            ctx.hint(n === N - 1 ? "Last one — pull the plug" : "Pull the plug out to the right")
        })
    }

    const bind = useDrag({
        onStart: () => {
            if (busy.current) return false
            cancelAnimationFrame(raf.current)
            setGrab(true)
            ctx.sfx("tap")
            ctx.haptic(8)
        },
        onMove: (d) => {
            if (busy.current) return
            const raw = Math.max(0, d.dx)
            // the pins grip the socket for the first few px, then slide; past the socket the plug pops free
            const ox = raw < 18 ? raw * 0.4 : 7.2 + (raw - 18) * 0.95
            const oy = clamp(d.dy * 0.2, -14, 14) * clamp01(ox / 30)
            place(Math.min(ox, T + 30), oy)
            if (ox >= T) unplug()
        },
        onEnd: () => {
            if (busy.current) return
            setGrab(false)
            // a near-miss: the plug springs back home — no reward, no progress
            if (offRef.current.x > 4) {
                ctx.sfx("soft")
                springBack()
                if (offRef.current.x > T * 0.4) ctx.hint("Almost — pull it all the way out")
            }
        },
    })

    const finale = () => {
        ctx.hint("")
        ctx.sfx("hum")
        timers.after(250, () => {
            setOff(true)
            ctx.sfx("soft")
            ctx.haptic(20)
            ctx.fx.burst(w / 2, cardY + chh / 2, { count: 1, shape: "streak", size: [3, 3], speed: [0, 0], life: [0.4, 0.4], colors: ["rgba(255,255,255,1)"] })
            timers.after(330, () => ctx.fx.burst(w / 2, winH / 2, { count: 18, shape: "glow", size: [3, 7], speed: [40, 180], life: [0.6, 1.1], drag: 0.94, colors: ["rgba(220,230,255,1)", "rgba(255,236,200,1)"] }))
        })
        timers.after(1100, () => {
            ctx.sfx("chime")
            for (let k = 0; k < 10; k++) timers.after(k * 90, () => ctx.fx.add({ x: w * (0.12 + Math.random() * 0.76), y: h * (0.2 + Math.random() * 0.5), size: 2 + Math.random() * 3, max: 1.4, shape: "glow", color: "rgba(255,236,200,1)", alpha: 0.8 }))
        })
        timers.after(2300, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Pull the plug out to the right")
        ctx.sfx("hum")
    }, [])

    const ghostYs = [-sp, sp, 2 * sp]
    return (
        <div className={cx("ufRoot", off && "off")} style={{ position: "absolute", inset: 0 }}>
            <div className="ufRoom" />
            <div className="ufQuiet" />
            <div className="ufWin" style={{ height: winH }}>
                <div className={cx("ufStrip", cut && "stop")} style={{ ["--sp" as any]: `${sp}px` }}>
                    {ghostYs.map((gy, k) => (
                        <UfCard key={k} ctx={ctx} i={idx} happy={false} cls="ghost" x={w / 2} y={cardY + gy} cw={cw} chh={chh} pd={pd} fs={fs} />
                    ))}
                </div>
                <UfCard key={`m${idx}`} ctx={ctx} i={idx} happy={cut} cls={cx("main", idx > 0 && !out && "in", out && "out", cut && "cut")} x={w / 2} y={cardY} cw={cw} chh={chh} pd={pd} fs={fs} label />
            </div>
            <svg className="ufSvg" width={w} height={h} aria-hidden="true" style={{ opacity: off ? 0 : 1 }}>
                <path ref={glowRef} className="ufGlow" fill="none" stroke="rgba(110,230,255,.55)" strokeWidth="9" strokeLinecap="round" style={{ opacity: cut ? 0 : undefined }} />
                <path ref={cableRef} className="ufCable" fill="none" stroke={cut ? "rgba(120,130,160,.8)" : "#7ae8ff"} strokeWidth="4" strokeLinecap="round" style={{ opacity: out ? 0 : 1 }} />
            </svg>
            <div className="ufSocket" style={{ left: sx, top: sy, opacity: off ? 0 : 1, transition: "opacity 1.2s ease" }} aria-hidden="true">
                <i />
                <i />
            </div>
            {!cut ? <i className="ufArrow" style={{ left: plugX0 + pw * 0.45, top: sy + 52 }} /> : null}
            <div
                ref={plugRef}
                className={cx("ufPlug", grab && "grab", cut && "away")}
                style={{ left: plugX0, top: sy, ["--pw" as any]: `${pw}px` }}
                {...bind}
                role="button"
                aria-label={`Unplug the feed: ${word || "your picture"}`}
                tabIndex={0}
                onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !busy.current) {
                        e.preventDefault()
                        place(T, 0)
                        unplug()
                    }
                }}
            >
                <i className="ufPin" />
                <i className="ufPin" />
                <span className="ufBody">
                    <b />
                </span>
            </div>
            <div className="ufCap" aria-live="polite">
                {off ? "Feed off. Quiet now." : ""}
            </div>
        </div>
    )
}

tsmRitual({ id: 47, hint: "Pull the plug out to the right", css: UF_CSS, Comp: RitualUnfollow })
