/* ================================================================== */
/* 75 · INK BLEED — a wet drop over a watercolour page                 */
/* ================================================================== */
// Desktop rules kept: one phrase per word chunk (6), sequential; drag ONE droplet through the phrase; the
// phrase loosens live, in proportion to the drag; a long-enough pass frees it; 6 = done; onDone(250).
// Spec intent added: the letters bleed, stretch and separate exactly along the droplet's path (per letter,
// where the drop touches), ink blooms behind it, a wet wash sound on release, the phrase's character picture
// is painted on the page and calms once its phrase has bled out.
// Fixed: the phone stall — the drop returns to its inkwell after every phrase AND after a near-miss, and the
// pass is measured by the letters it touched (not by px off-screen); no reward for a failed pass; full words.

const IB_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="75"] .ibDesk{position:absolute;inset:0;background:
  radial-gradient(80% 50% at 50% 30%, rgba(90,110,200,.25) 0%, transparent 70%),
  linear-gradient(180deg,#0d1024 0%,#141838 60%,#0c0f22 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="75"] .ibDesk{background:radial-gradient(80% 50% at 50% 30%, rgba(255,255,255,.7) 0%, transparent 70%),linear-gradient(180deg,#e9e1d4 0%,#ddd2c1 60%,#cfc2ae 100%)}
.tsm .tsmRitualLayer[data-rid="75"] .ibPaper{position:absolute;border-radius:18px;overflow:hidden;
  background:
    radial-gradient(40% 26% at 18% 20%, hsla(var(--h1),90%,60%,.14) 0%, transparent 70%),
    radial-gradient(46% 30% at 86% 74%, hsla(var(--h2),90%,60%,.12) 0%, transparent 70%),
    radial-gradient(30% 20% at 70% 12%, hsla(var(--h3),90%,65%,.10) 0%, transparent 70%),
    repeating-linear-gradient(0deg, rgba(255,255,255,.012) 0px, rgba(255,255,255,.012) 1px, transparent 1px, transparent 4px),
    linear-gradient(180deg,#1b1f45 0%,#191c3d 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), inset 0 0 60px rgba(0,0,0,.35), 0 20px 50px rgba(0,0,0,.45)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="75"] .ibPaper{background:
    radial-gradient(40% 26% at 18% 20%, hsla(var(--h1),80%,70%,.22) 0%, transparent 70%),
    radial-gradient(46% 30% at 86% 74%, hsla(var(--h2),80%,70%,.2) 0%, transparent 70%),
    radial-gradient(30% 20% at 70% 12%, hsla(var(--h3),80%,72%,.16) 0%, transparent 70%),
    repeating-linear-gradient(0deg, rgba(120,90,50,.025) 0px, rgba(120,90,50,.025) 1px, transparent 1px, transparent 4px),
    linear-gradient(180deg,#fffaf0 0%,#f8f0e0 100%);
  box-shadow:inset 0 0 0 1px rgba(120,90,50,.12), inset 0 0 50px rgba(160,120,70,.12), 0 18px 40px rgba(90,60,30,.22)}
.tsm .tsmRitualLayer[data-rid="75"] .ibWash{position:absolute;inset:0;opacity:0;transition:opacity 1.4s ease;pointer-events:none;
  background:radial-gradient(50% 30% at 30% 30%, hsla(var(--h1),90%,62%,.35), transparent 70%),radial-gradient(50% 30% at 72% 58%, hsla(var(--h2),90%,62%,.32), transparent 70%),radial-gradient(50% 30% at 40% 82%, hsla(var(--h3),90%,64%,.3), transparent 70%)}
.tsm .tsmRitualLayer[data-rid="75"] .ibRoot.fin .ibWash{opacity:1}
.tsm .tsmRitualLayer[data-rid="75"] .ibPic{position:absolute;width:var(--pd);height:var(--pd);margin-left:calc(var(--pd)*-.5);border-radius:50%;
  box-shadow:0 0 0 3px hsla(var(--h),90%,70%,.55), 0 0 0 9px hsla(var(--h),90%,60%,.12), 0 10px 26px rgba(0,0,0,.35);transition:transform .6s cubic-bezier(.3,1.5,.5,1)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="75"] .ibPic{box-shadow:0 0 0 3px hsla(var(--h),70%,55%,.5), 0 0 0 9px hsla(var(--h),80%,60%,.14), 0 10px 22px rgba(90,60,30,.2)}
.tsm .tsmRitualLayer[data-rid="75"] .ibPic span{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:hsla(var(--h),50%,30%,1)}
.tsm .tsmRitualLayer[data-rid="75"] .ibPic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="75"] .ibPic img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="75"] .ibRoot.fin .ibPic{transform:scale(1.12)}
.tsm .tsmRitualLayer[data-rid="75"] .ibPhrase{position:absolute;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;text-align:center;
  font-weight:700;letter-spacing:.01em;line-height:1.25;color:hsl(var(--h),100%,78%);text-shadow:0 0 14px hsla(var(--h),100%,65%,.55)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="75"] .ibPhrase{color:hsl(var(--h),70%,28%);text-shadow:0 1px 0 rgba(255,255,255,.6)}
.tsm .tsmRitualLayer[data-rid="75"] .ibW{display:inline-block;white-space:nowrap;margin:0 .14em;animation:ibWrite .55s ease both}
@keyframes ibWrite{from{opacity:0}to{opacity:1}}
.tsm .tsmRitualLayer[data-rid="75"] .ibL{display:inline-block;transform-origin:50% 0%;will-change:transform}
.tsm .tsmRitualLayer[data-rid="75"] .ibPhrase.melt .ibL{transition:transform 1s cubic-bezier(.4,0,.6,1), opacity 1s ease}
.tsm .tsmRitualLayer[data-rid="75"] .ibWell{position:absolute;width:84px;height:40px;margin:-6px 0 0 -42px;border-radius:50%;pointer-events:none;
  background:radial-gradient(60% 60% at 50% 40%, rgba(0,0,0,.65) 0%, rgba(10,14,40,.6) 60%, transparent 72%),radial-gradient(closest-side, hsla(var(--h),80%,55%,.35), transparent)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="75"] .ibWell{background:radial-gradient(60% 60% at 50% 40%, rgba(30,30,60,.45) 0%, rgba(30,30,60,.2) 60%, transparent 72%),radial-gradient(closest-side, hsla(var(--h),80%,55%,.25), transparent)}
.tsm .tsmRitualLayer[data-rid="75"] .ibDrop{position:absolute;width:80px;height:80px;margin:-40px 0 0 -40px;touch-action:none;cursor:grab;will-change:transform}
.tsm .tsmRitualLayer[data-rid="75"] .ibDrop i{position:absolute;left:13px;top:11px;width:54px;height:54px;border-radius:50% 0 50% 50%;transform:rotate(-45deg);
  background:radial-gradient(circle at 36% 62%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 18%),radial-gradient(circle at 55% 45%, hsl(var(--h),100%,64%) 0%, hsl(var(--h),95%,42%) 60%, hsl(var(--h),90%,24%) 100%);
  box-shadow:0 0 22px hsla(var(--h),100%,60%,.6), inset -4px 4px 10px rgba(255,255,255,.25), inset 4px -6px 12px rgba(0,0,40,.4);transition:transform .14s ease}
.tsm .tsmRitualLayer[data-rid="75"] .ibDrop.grab i{transform:rotate(-45deg) scale(1.08)}
.tsm .tsmRitualLayer[data-rid="75"] .ibDrop.idle i{animation:ibDrip 2.2s ease-in-out infinite}
@keyframes ibDrip{0%,100%{transform:rotate(-45deg) scale(1)}50%{transform:rotate(-45deg) scale(1.06,.95)}}
.tsm .tsmRitualLayer[data-rid="75"] .ibDrop.hide{opacity:0;pointer-events:none;transition:opacity .4s}
.tsm .tsmRitualLayer[data-rid="75"] .ibCap{position:absolute;left:0;right:0;text-align:center;font-size:28px;font-weight:600;color:#fff1dc;opacity:0;transform:translateY(10px);transition:opacity 1s ease .8s, transform 1.2s ease .8s;pointer-events:none;text-shadow:0 2px 16px rgba(0,0,0,.4)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="75"] .ibCap{color:#4a3622;text-shadow:0 1px 10px rgba(255,255,255,.9)}
.tsm .tsmRitualLayer[data-rid="75"] .ibRoot.fin .ibCap{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="75"] .ibDrop.idle i,.tsm .tsmRitualLayer[data-rid="75"] .ibW{animation:none}}
`

function RitualInkBleed({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [freed, setFreed] = React.useState(false)
    const [melt, setMelt] = React.useState(false)
    const [grab, setGrab] = React.useState(false)
    const [fin, setFin] = React.useState(false)
    const timers = useTimers()
    const rootRef = React.useRef<HTMLDivElement>(null)
    const dropRef = React.useRef<HTMLDivElement>(null)
    const letterRefs = React.useRef<(HTMLSpanElement | null)[]>([])
    const centers = React.useRef<{ x: number; y: number }[]>([])
    const bleed = React.useRef<number[]>([])
    const dripped = React.useRef<boolean[]>([])
    const busy = React.useRef(false)
    const off = React.useRef({ x: 0, y: 0 })
    const touchedPic = React.useRef(false)
    const raf = React.useRef(0)
    React.useEffect(() => () => cancelAnimationFrame(raf.current), [])

    // ---------- layout ----------
    const px0 = 16
    const pw = w - 32
    const pTop = 8
    const pBot = h - 84 - 8
    const ph = pBot - pTop
    const pd = Math.round(clamp(Math.min(w * 0.36, ph * 0.22), 92, 150))
    const picY = pTop + 26
    const phTop = picY + pd + 22
    const phH = Math.round(ph * 0.36)
    const phW = pw - 40
    const homeX = px0 + 58
    const homeY = Math.min(pBot - 58, phTop + phH + (pBot - phTop - phH) / 2)
    const word = ctx.words[idx] || ""
    const fs = fitThoughtPx(word, phW - 20, phH, 46, 20, 1.3)
    const hue = ctx.hue(idx)
    const ink = ctx.theme === "bright" ? `hsla(${hue},85%,55%,.24)` : `hsla(${hue},100%,62%,.34)`
    const words = word.split(/\s+/).filter(Boolean)
    const perLetter = word.replace(/\s+/g, "").length <= 48
    const units: string[][] = words.map((wd) => (perLetter ? Array.from(wd) : [wd]))
    const nUnits = units.reduce((a, u) => a + u.length, 0)

    // measure every letter once the phrase is written
    React.useLayoutEffect(() => {
        const root = rootRef.current
        if (!root) return
        const rb = root.getBoundingClientRect()
        centers.current = letterRefs.current.slice(0, nUnits).map((el) => {
            if (!el) return { x: -999, y: -999 }
            const r = el.getBoundingClientRect()
            return { x: r.left - rb.left + r.width / 2, y: r.top - rb.top + r.height / 2 }
        })
        bleed.current = Array(nUnits).fill(0)
        dripped.current = Array(nUnits).fill(false)
        touchedPic.current = false
    }, [idx, w, h])

    const placeDrop = (x: number, y: number, sx = 1, sy = 1) => {
        off.current = { x, y }
        if (dropRef.current) dropRef.current.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${sx.toFixed(3)},${sy.toFixed(3)})`
    }

    const applyLetter = (k: number, dropX: number) => {
        const el = letterRefs.current[k]
        if (!el) return
        const b = bleed.current[k]
        const c = centers.current[k]
        const side = c.x >= dropX ? 1 : -1
        const seed = Math.sin(k * 12.9898 + idx) * 43758.5453
        const rnd = seed - Math.floor(seed) - 0.5
        // letters bleed down, stretch and drift apart where the drop passed
        el.style.transform = `translate3d(${(side * 5 * b + rnd * 6 * b).toFixed(1)}px,${(b * b * fs * 0.45).toFixed(1)}px,0) rotate(${(rnd * 22 * b).toFixed(1)}deg) scale(${(1 + 0.18 * b).toFixed(3)},${(1 + 0.75 * b).toFixed(3)})`
        el.style.opacity = String(1 - 0.42 * b)
    }

    const coverage = () => {
        if (!nUnits) return touchedPic.current ? 1 : 0
        return bleed.current.filter((b) => b >= 0.5).length / nUnits
    }

    const goHome = (spring: boolean, then?: () => void) => {
        const { x: x0, y: y0 } = off.current
        const t0 = performance.now()
        const dur = ctx.reduced ? 220 : spring ? 620 : 420
        cancelAnimationFrame(raf.current)
        const step = () => {
            const q = clamp01((performance.now() - t0) / dur)
            const k = 1 - (spring && !ctx.reduced ? easeOutElastic(q) : easeOutCubic(q))
            placeDrop(x0 * k, y0 * k)
            if (q < 1) raf.current = requestAnimationFrame(step)
            else {
                placeDrop(0, 0)
                then && then()
            }
        }
        raf.current = requestAnimationFrame(step)
    }

    const success = () => {
        busy.current = true
        setGrab(false)
        setFreed(true)
        setMelt(true)
        ctx.rain(0.9)
        ctx.hint("The ink lets go")
        timers.after(120, () => ctx.sfx("chime"))
        ctx.haptic([10, 30, 16])
        // every letter lets go: it bleeds all the way and washes out
        letterRefs.current.slice(0, nUnits).forEach((el, k) => {
            if (!el) return
            const c = centers.current[k]
            const seed = Math.sin(k * 78.233 + idx) * 12345.678
            const rnd = seed - Math.floor(seed) - 0.5
            el.style.transition = ctx.reduced ? "opacity .6s ease" : "transform 1s cubic-bezier(.4,0,.6,1), opacity 1s ease"
            el.style.transform = `translate3d(${(rnd * 26).toFixed(1)}px,${(fs * 1.4).toFixed(1)}px,0) rotate(${(rnd * 50).toFixed(1)}deg) scale(1.3,2.4)`
            el.style.opacity = "0"
            if (k % 2 === 0) ctx.fx.add({ x: c.x, y: c.y, vy: 20, size: fs * 0.7, grow: fs * 0.9, max: 1.4, shape: "smoke", color: ink, alpha: 0.9, add: ctx.theme !== "bright" })
        })
        ctx.progress((idx + 1) / N)
        goHome(false)
        if (idx + 1 === N) {
            timers.after(1100, finale)
            return
        }
        timers.after(1300, () => {
            setIdx((i) => i + 1)
            setFreed(false)
            setMelt(false)
            busy.current = false
            ctx.hint(idx + 1 === N - 1 ? "Last phrase — let it bleed" : "Drag the drop through the words")
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
            const x = clamp(d.dx, px0 + 26 - homeX, px0 + pw - 26 - homeX)
            const y = clamp(d.dy, pTop + 26 - homeY, pBot - 20 - homeY)
            const sp = Math.min(1, Math.hypot(d.vx, d.vy) / 2400)
            placeDrop(x, y, 1 - 0.1 * sp, 1 + 0.16 * sp)
            const ax = homeX + x
            const ay = homeY + y
            // a wet trail of ink follows the drop
            if (Math.random() < 0.7) ctx.fx.add({ x: ax + (Math.random() - 0.5) * 8, y: ay + 6, size: 10, grow: 26, max: 1.1, shape: "smoke", color: ink, alpha: 0.85, add: ctx.theme !== "bright" })
            const R = Math.max(30, fs * 1.05)
            for (let k = 0; k < nUnits; k++) {
                const c = centers.current[k]
                const dd = dist(ax, ay, c.x, c.y)
                if (dd >= R) continue
                const nb = Math.min(1, bleed.current[k] + (1 - dd / R) * 0.34)
                if (nb === bleed.current[k]) continue
                bleed.current[k] = nb
                applyLetter(k, ax)
                if (nb >= 0.5 && !dripped.current[k]) {
                    dripped.current[k] = true
                    ctx.fx.add({ x: c.x, y: c.y + fs * 0.3, vy: 40 + Math.random() * 40, ay: 260, max: 0.9, size: 3.2, shape: "drop", color: ctx.theme === "bright" ? `hsla(${hue},70%,32%,.9)` : `hsla(${hue},100%,70%,.95)`, add: false })
                    if (k % 3 === 0) ctx.sfx("soft")
                }
            }
            if (!nUnits && dist(ax, ay, w / 2, picY + pd / 2) < pd / 2) touchedPic.current = true
            if (coverage() >= 0.95) success()
        },
        onEnd: () => {
            if (busy.current) return
            setGrab(false)
            if (coverage() >= 0.7) return success()
            // a near-miss: the drop slides home to its inkwell (no stall, no reward); the bled letters stay bled
            if (Math.hypot(off.current.x, off.current.y) > 6) {
                ctx.sfx("soft")
                ctx.haptic(6)
                const c = coverage()
                ctx.hint(c > 0.3 ? "Keep going — through every word" : "Drag the drop through the words")
            }
            goHome(true)
        },
    })

    const finale = () => {
        ctx.hint("")
        setFin(true)
        ctx.rain(1.4)
        ctx.haptic(18)
        // the whole page becomes watercolour: one bloom per phrase colour
        for (let k = 0; k < 6; k++)
            timers.after(k * 140, () => {
                const x = px0 + pw * (0.2 + ((k * 0.37) % 0.6))
                const y = pTop + ph * (0.2 + ((k * 0.29) % 0.62))
                const c = ctx.theme === "bright" ? `hsla(${ctx.hue(k)},80%,60%,.28)` : `hsla(${ctx.hue(k)},100%,62%,.3)`
                ctx.fx.add({ x, y, size: 20, grow: 120, max: 1.8, shape: "smoke", color: c, add: ctx.theme !== "bright" })
                ctx.sfx("plink")
            })
        timers.after(1000, () => {
            ctx.sfx("chime")
            ctx.fx.burst(w / 2, picY + pd / 2, { count: 22, shape: "glow", size: [3, 8], speed: [40, 160], life: [0.8, 1.4], drag: 0.95, colors: [`hsla(${hue},100%,80%,1)`, "rgba(255,240,215,1)"] })
        })
        timers.after(2350, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Drag the drop through the words")
    }, [])

    const src = ctx.pic(idx, freed || fin)
    letterRefs.current = []
    let li = 0
    return (
        <div ref={rootRef} className={cx("ibRoot", fin && "fin")} style={{ position: "absolute", inset: 0 }}>
            <div className="ibDesk" />
            <div className="ibPaper" style={{ left: px0, top: pTop, width: pw, height: ph, ["--h1" as any]: ctx.hue(0), ["--h2" as any]: ctx.hue(2), ["--h3" as any]: ctx.hue(4) }}>
                <div className="ibWash" />
            </div>
            <div className="ibPic" style={{ left: w / 2, top: picY, ["--pd" as any]: `${pd}px`, ["--h" as any]: hue }}>
                <span>{src ? <img className={ctx.uploaded ? "up" : undefined} src={src} alt="" draggable={false} /> : null}</span>
            </div>
            {!fin ? (
                <div key={`p${idx}`} className={cx("ibPhrase", melt && "melt")} style={{ left: px0 + 20, top: phTop, width: phW, height: phH, fontSize: fs, ["--h" as any]: hue }} aria-label={word || "your picture"}>
                    {units.map((u, wi) => (
                        <span key={wi} className="ibW" style={{ animationDelay: `${wi * 0.12}s` }}>
                            {u.map((ch, k) => {
                                const at = li++
                                return (
                                    <span key={k} className="ibL" ref={(el) => (letterRefs.current[at] = el)}>
                                        {ch}
                                    </span>
                                )
                            })}
                        </span>
                    ))}
                </div>
            ) : null}
            <i className="ibWell" style={{ left: homeX, top: homeY + 22, ["--h" as any]: hue, opacity: fin ? 0 : 1, transition: "opacity .6s" }} />
            <div
                ref={dropRef}
                className={cx("ibDrop", grab ? "grab" : "idle", fin && "hide")}
                style={{ left: homeX, top: homeY, ["--h" as any]: hue }}
                {...bind}
                role="button"
                tabIndex={0}
                aria-label={`Ink drop: drag it through "${word || "your picture"}"`}
                onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !busy.current) {
                        e.preventDefault()
                        success()
                    }
                }}
            >
                <i />
            </div>
            <div className="ibCap" style={{ top: phTop + phH * 0.3 }} aria-live="polite">
                {fin ? "Soft now." : ""}
            </div>
        </div>
    )
}

tsmRitual({ id: 75, hint: "Drag the drop through the words", css: IB_CSS, Comp: RitualInkBleed })
