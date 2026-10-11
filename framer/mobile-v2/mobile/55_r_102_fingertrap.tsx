/* ================================================================== */
/* 102 · FINGER TRAP — a hypnotic neon weave, one big trap at a time   */
/* ================================================================== */
// Desktop rules kept: 5 traps (entries 1-4, then 5+6 merged), any trap is worked by pressing either end
// (the side is decided by the press point) and sliding INWARD toward the centre; a continuous inward slide
// to 98 % frees it on the spot (no lift needed); lifting early keeps 68 % of the looseness; outward motion
// never adds looseness (≤ 24 px of credit lost); progress = freed / total on each release only; bonus 420.
// Mobile: one large trap at a time (the founder-endorsed phone layout), the slide length scales with the
// trap width, pulling OUTWARD visibly and audibly TIGHTENS the weave (the hook's promise, missing on desktop),
// a freed character turns happy and floats up to a row of freed friends, the finale weaves them into a
// glowing bracelet. Fixed: no reward for merely touching, faces now turn positive on release.

const FT_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="102"] .ftSky{position:absolute;inset:0;background:
  radial-gradient(70% 42% at 50% 48%, rgba(120,70,255,.34) 0%, rgba(60,20,140,.12) 45%, transparent 70%),
  radial-gradient(90% 40% at 50% 104%, rgba(255,90,170,.28), transparent 70%),
  linear-gradient(180deg,#0c0a26 0%,#170f3d 45%,#22104a 72%,#120a2c 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="102"] .ftSky{background:
  radial-gradient(70% 42% at 50% 48%, rgba(255,255,255,.85) 0%, rgba(220,205,255,.4) 45%, transparent 70%),
  radial-gradient(90% 40% at 50% 104%, rgba(255,170,210,.55), transparent 70%),
  linear-gradient(180deg,#e9e4ff 0%,#ddd3ff 45%,#f2d6f0 78%,#e8dcff 100%)}
.tsm .tsmRitualLayer[data-rid="102"] .ftHypno{position:absolute;left:50%;top:var(--cy);width:var(--hs);height:var(--hs);margin:calc(var(--hs)*-.5) 0 0 calc(var(--hs)*-.5);border-radius:50%;pointer-events:none;
  background:repeating-radial-gradient(circle, rgba(170,140,255,.16) 0 2px, transparent 2px 26px);opacity:.9;animation:ftBreath 6s ease-in-out infinite}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="102"] .ftHypno{background:repeating-radial-gradient(circle, rgba(120,90,220,.14) 0 2px, transparent 2px 26px)}
@keyframes ftBreath{0%,100%{transform:scale(.94)}50%{transform:scale(1.06)}}
.tsm .tsmRitualLayer[data-rid="102"] .ftFloor{position:absolute;left:0;right:0;bottom:0;height:30%;pointer-events:none;
  background:linear-gradient(180deg,transparent,rgba(255,80,170,.08) 60%,rgba(255,120,190,.14)),repeating-linear-gradient(90deg, rgba(190,150,255,.10) 0 1px, transparent 1px 44px)}
.tsm .tsmRitualLayer[data-rid="102"] .ftTrap{position:absolute;width:var(--tw);height:var(--th);margin:calc(var(--th)*-.5) 0 0 calc(var(--tw)*-.5);touch-action:none;cursor:grab;animation:ftEnter .6s cubic-bezier(.2,1.3,.4,1) both}
@keyframes ftEnter{0%{transform:translate3d(60%,0,0) scale(.7);opacity:0}100%{transform:none;opacity:1}}
.tsm .tsmRitualLayer[data-rid="102"] .ftSleeve{position:absolute;top:50%;width:var(--sl);height:var(--sh);margin-top:calc(var(--sh)*-.5);will-change:transform;
  background:
    linear-gradient(180deg, rgba(255,255,255,.42) 0%, rgba(255,255,255,.06) 32%, rgba(0,0,0,0) 55%, rgba(0,0,0,.42) 100%),
    repeating-linear-gradient(55deg, hsla(var(--h),95%,74%,.95) 0 4px, hsla(var(--h),90%,56%,.95) 7px, transparent 8px 15px),
    repeating-linear-gradient(-55deg, hsla(var(--h2),85%,60%,1) 0 4px, hsla(var(--h2),80%,40%,1) 7px, hsla(var(--h2),70%,18%,1) 8px 15px)}
.tsm .tsmRitualLayer[data-rid="102"] .ftSleeve.l{left:0;transform-origin:100% 50%;clip-path:polygon(0 26%,100% 0,100% 100%,0 74%);border-radius:10px 0 0 10px}
.tsm .tsmRitualLayer[data-rid="102"] .ftSleeve.r{right:0;transform-origin:0% 50%;clip-path:polygon(0 0,100% 26%,100% 74%,0 100%);border-radius:0 10px 10px 0}
.tsm .tsmRitualLayer[data-rid="102"] .ftSleeve::after{content:"";position:absolute;inset:0;opacity:var(--t,0);background:linear-gradient(180deg,rgba(255,120,140,.5),rgba(255,30,70,.75))}
.tsm .tsmRitualLayer[data-rid="102"] .ftGlow{position:absolute;left:4%;right:4%;top:50%;height:var(--sh);margin-top:calc(var(--sh)*-.5);border-radius:50%;pointer-events:none;
  background:radial-gradient(closest-side, hsla(var(--h),100%,65%,.45), transparent);transform:scale(1.15,1.5)}
.tsm .tsmRitualLayer[data-rid="102"] .ftCap{position:absolute;top:50%;width:var(--cd);height:var(--cd);margin-top:calc(var(--cd)*-.5);border-radius:50%;pointer-events:none;will-change:transform;
  background:radial-gradient(circle at 38% 30%, rgba(255,255,255,.95) 0%, hsla(var(--h),90%,80%,.9) 30%, hsla(var(--h),80%,48%,.95) 75%, hsla(var(--h),80%,30%,1) 100%);
  box-shadow:0 8px 22px rgba(10,0,40,.45), inset 0 -6px 12px rgba(40,0,80,.35);display:grid;place-items:center}
.tsm .tsmRitualLayer[data-rid="102"] .ftCap.l{left:0}
.tsm .tsmRitualLayer[data-rid="102"] .ftCap.r{right:0}
.tsm .tsmRitualLayer[data-rid="102"] .ftCap b{font-size:30px;font-weight:600;line-height:1;color:rgba(255,255,255,.95);text-shadow:0 1px 3px rgba(40,0,80,.6);animation:ftNudgeR 1.3s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="102"] .ftCap.r b{animation-name:ftNudgeL}
@keyframes ftNudgeR{0%,100%{transform:translateX(-3px)}50%{transform:translateX(5px)}}
@keyframes ftNudgeL{0%,100%{transform:translateX(3px)}50%{transform:translateX(-5px)}}
.tsm .tsmRitualLayer[data-rid="102"] .ftTrap.hold .ftCap b{animation:none}
.tsm .tsmRitualLayer[data-rid="102"] .ftOrb{position:absolute;left:50%;top:50%;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);will-change:transform}
.tsm .tsmRitualLayer[data-rid="102"] .ftOrb .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="102"] .ftTrap.free .ftSleeve,.tsm .tsmRitualLayer[data-rid="102"] .ftTrap.free .ftCap,.tsm .tsmRitualLayer[data-rid="102"] .ftTrap.free .ftGlow{transition:transform .55s cubic-bezier(.2,.8,.2,1), opacity .5s ease;opacity:0}
.tsm .tsmRitualLayer[data-rid="102"] .ftFriend{position:absolute;left:0;top:0;width:var(--fd);height:var(--fd);margin:calc(var(--fd)*-.5) 0 0 calc(var(--fd)*-.5);transition:transform .9s cubic-bezier(.3,1.2,.4,1);pointer-events:none}
.tsm .tsmRitualLayer[data-rid="102"] .ftFriend b{position:absolute;inset:0;border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 40%, hsla(var(--h),90%,75%,.35), hsla(var(--h),80%,40%,.55));box-shadow:inset 0 0 0 2px rgba(255,255,255,.7), 0 0 18px hsla(var(--h),100%,70%,.55), 0 6px 14px rgba(10,0,40,.35)}
.tsm .tsmRitualLayer[data-rid="102"] .ftFriend img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.12)}
.tsm .tsmRitualLayer[data-rid="102"] .ftFriend.on b{animation:tsmHappy 2.4s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="102"] .ftBracelet{position:absolute;left:50%;top:var(--cy);width:var(--bd);height:var(--bd);margin:calc(var(--bd)*-.5) 0 0 calc(var(--bd)*-.5);border-radius:50%;pointer-events:none;opacity:0;transform:scale(.6);
  transition:opacity .6s ease, transform .9s cubic-bezier(.3,1.4,.4,1);
  background:repeating-conic-gradient(from 0deg, rgba(255,140,220,.95) 0 6deg, rgba(140,120,255,.95) 6deg 12deg, rgba(110,230,255,.95) 12deg 18deg);
  -webkit-mask-image:radial-gradient(closest-side circle, transparent 84%, #000 87%, #000 97%, transparent 100%);mask-image:radial-gradient(closest-side circle, transparent 84%, #000 87%, #000 97%, transparent 100%)}
.tsm .tsmRitualLayer[data-rid="102"] .ftBracelet.on{opacity:1;transform:scale(1);animation:ftSpin 6s linear infinite}
@keyframes ftSpin{to{transform:rotate(360deg)}}
.tsm .tsmRitualLayer[data-rid="102"] .ftHypno.rdc,.tsm .tsmRitualLayer[data-rid="102"] .ftBracelet.rdc{animation:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="102"] .ftHypno,.tsm .tsmRitualLayer[data-rid="102"] .ftCap b,.tsm .tsmRitualLayer[data-rid="102"] .ftBracelet.on{animation:none}}
`

const FT_MOOD: Record<string, Mood> = { rush: "tremble", glitch: "nervous", drop: "droop", loopie: "tilt", patch: "droop", sync: "nervous", still: "float" }

function ftTrapWords(words: string[]): string[] {
    const w = words.slice(0, 6)
    const tail = w[5] && w[5] !== w[4] ? `${w[4]} ${w[5]}`.trim() : w[4]
    return [w[0], w[1], w[2], w[3], tail || ""]
}

function RitualFingerTrap({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const traps = React.useMemo(() => ftTrapWords(ctx.words), [])
    const N = traps.length
    const [idx, setIdx] = React.useState(0)
    const [freeNow, setFreeNow] = React.useState(false)
    const [parked, setParked] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [hold, setHold] = React.useState(false)
    const [finale, setFinale] = React.useState(false)
    const timers = useTimers()
    const idxRef = useLatest(idx)
    const val = React.useRef(0)
    const drag = React.useRef<{ side: 1 | -1; start: number; warned: boolean; tick: number } | null>(null)
    const busy = React.useRef(false)
    const doneRef = React.useRef(0)
    const els = React.useRef<{ sl: HTMLElement | null; sr: HTMLElement | null; cl: HTMLElement | null; cr: HTMLElement | null; orb: HTMLElement | null; trap: HTMLElement | null }>({ sl: null, sr: null, cl: null, cr: null, orb: null, trap: null })

    // layout: a band at the top for the freed friends, one big trap in the middle, the hint pill below
    const TOPROW = 54
    const cy = TOPROW + 24 + (h - 84 - TOPROW - 24) * 0.48
    const tw = Math.min(w - 32, 420)
    const d = Math.round(clamp(Math.min(w * 0.44, (h - 200) * 0.42), 128, 178))
    const th = Math.round(Math.max(d, 120))
    const sl = Math.round(tw / 2 - d * 0.36)
    const sh = Math.round(d * 0.64)
    const cd = 72
    const FULL = clamp(tw * 0.3, 90, 124) // inward travel (px) that frees a trap from zero
    const fd = Math.round(clamp(w * 0.13, 46, 58))
    const friendAt = (i: number) => (finale ? { x: w / 2 + Math.cos(-Math.PI / 2 + (i * Math.PI * 2) / N) * Math.min(w * 0.3, 130), y: cy + Math.sin(-Math.PI / 2 + (i * Math.PI * 2) / N) * Math.min(w * 0.3, 130) } : { x: (w * (i + 0.5)) / N, y: TOPROW * 0.5 + 8 })

    const apply = (v: number, side: 1 | -1 | 0, tight: number, anim: boolean) => {
        const e = els.current
        const k = clamp01(v / 100)
        const kL = side === 1 ? k : k * 0.7
        const kR = side === -1 ? k : k * 0.7
        const tL = side === 1 ? tight : tight * 0.5
        const tR = side === -1 ? tight : tight * 0.5
        const tr = anim ? "transform .5s cubic-bezier(.3,1.5,.5,1), opacity .3s" : "none"
        const sleeve = (el: HTMLElement | null, kk: number, tt: number) => {
            if (!el) return
            el.style.transition = tr
            // pushing in shortens and widens the weave; pulling out stretches and squeezes it
            el.style.transform = `scale(${1 - 0.3 * kk + 0.1 * tt},${1 + 0.42 * kk - 0.36 * tt})`
        }
        sleeve(e.sl, kL, tL)
        sleeve(e.sr, kR, tR)
        if (e.cl) {
            e.cl.style.transition = tr
            e.cl.style.transform = `translate3d(${sl * 0.3 * kL - sl * 0.1 * tL}px,0,0) scale(${1 - 0.08 * tL})`
        }
        if (e.cr) {
            e.cr.style.transition = tr
            e.cr.style.transform = `translate3d(${-sl * 0.3 * kR + sl * 0.1 * tR}px,0,0) scale(${1 - 0.08 * tR})`
        }
        if (e.orb) {
            e.orb.style.transition = tr
            e.orb.style.transform = `scale(${1 + 0.05 * k - 0.1 * tight},${1 + 0.05 * k + 0.05 * tight})`
        }
        if (e.trap) e.trap.style.setProperty("--t", String(clamp01(tight)))
    }

    const release = () => {
        const i = idxRef.current
        busy.current = true
        drag.current = null
        setHold(false)
        setFreeNow(true)
        doneRef.current += 1
        const n = doneRef.current
        ctx.progress(n / N)
        ctx.sfx(n === N ? "chime" : "pop")
        ctx.sfx("spark")
        ctx.haptic(n === N ? 30 : 14)
        const x = w / 2
        const y = cy
        const hue = ctx.hue(i)
        // the weave springs open and the thought flashes free: rings, spirals of colour, letters squeezed out of both ends
        const e = els.current
        ;[e.sl, e.sr, e.cl, e.cr].forEach((el) => el && (el.style.transition = "transform .55s cubic-bezier(.2,.8,.2,1), opacity .5s ease"))
        if (e.sl) e.sl.style.transform = "translate3d(-70px,0,0) scale(.6,1.9)"
        if (e.sr) e.sr.style.transform = "translate3d(70px,0,0) scale(.6,1.9)"
        if (e.cl) e.cl.style.transform = "translate3d(-90px,0,0) scale(.6)"
        if (e.cr) e.cr.style.transform = "translate3d(90px,0,0) scale(.6)"
        if (e.orb) {
            e.orb.style.transition = "transform .45s cubic-bezier(.3,1.8,.4,1)"
            e.orb.style.transform = "scale(1.12)"
        }
        ctx.fx.burst(x, y, { count: 1, shape: "ring", size: [d * 0.5, d * 0.5], grow: d * 2, life: [0.7, 0.7], speed: [0, 0], colors: [`hsla(${hue},100%,80%,.9)`], add: true })
        ctx.fx.burst(x, y, { count: 1, shape: "ring", size: [d * 0.4, d * 0.4], grow: d * 1.3, life: [0.9, 0.9], speed: [0, 0], colors: ["rgba(255,170,230,.8)"], add: true })
        ctx.fx.burst(x, y, { count: 26, shape: "spark", size: [2, 3.5], speed: [200, 460], life: [0.5, 0.9], drag: 0.93, colors: ["rgba(255,150,230,1)", "rgba(150,140,255,1)", "rgba(120,235,255,1)"] })
        const letters = Array.from(traps[i] || "").filter((c) => c !== " ").slice(0, 20)
        letters.forEach((c, k) => {
            const dir = k % 2 ? 1 : -1
            ctx.fx.add({ x: x + dir * d * 0.35, y: y + d * 0.18, vx: dir * (160 + Math.random() * 160), vy: -60 - Math.random() * 140, ay: 180, drag: 0.975, max: 1.3 + Math.random() * 0.4, size: 16, rot: 0, vr: dir * (2 + Math.random() * 3), shape: "text", text: c, color: ctx.theme === "bright" ? "rgba(70,30,140,1)" : "rgba(255,240,255,1)", add: false })
        })
        ctx.hint(n === N ? "" : "Free!")
        // the freed character floats up to join the others
        timers.after(720, () => {
            const to = friendAt(i)
            if (e.orb) {
                e.orb.style.transition = "transform .6s cubic-bezier(.5,0,.3,1)"
                e.orb.style.transform = `translate3d(${to.x - x}px,${to.y - y}px,0) scale(${fd / d})`
            }
        })
        timers.after(1340, () => {
            setParked((p) => p.map((v, j) => (j === i ? true : v)))
            ctx.sfx("plink")
            ctx.fx.burst(friendAt(i).x, friendAt(i).y, { count: 10, shape: "glow", size: [3, 7], speed: [30, 110], life: [0.5, 0.9], colors: [`hsla(${hue},100%,80%,1)`] })
            if (n === N) {
                runFinale()
                return
            }
            val.current = 0
            setFreeNow(false)
            setIdx(i + 1)
            busy.current = false
            ctx.hint(n === N - 1 ? "Last trap · push an end inward" : "Next trap · push an end inward")
        })
    }

    const runFinale = () => {
        ctx.hint("")
        setIdx(N) // the empty stage: only the freed friends remain
        timers.after(120, () => {
            setFinale(true)
            ctx.sfx("hum")
        })
        timers.after(1050, () => {
            ctx.sfx("chime")
            ctx.haptic([20, 60, 20])
            for (let k = 0; k < 3; k++) timers.after(k * 180, () => ctx.fx.burst(w / 2, cy, { count: 1, shape: "ring", size: [30, 30], grow: w * 0.9, life: [1.1, 1.1], speed: [0, 0], colors: ["rgba(255,180,240,.7)"], add: true }))
            ctx.fx.burst(w / 2, cy, { count: 36, shape: "petal", size: [5, 9], speed: [90, 300], life: [1.1, 1.7], gravity: 60, drag: 0.96, spin: 4, colors: ["rgba(255,150,220,1)", "rgba(170,150,255,1)", "rgba(130,230,255,1)", "rgba(255,240,200,1)"], add: false })
        })
        timers.after(2400, () => {
            ctx.sfx("win")
            ctx.complete(420)
        })
    }

    const bind = useDrag({
        onStart: (i) => {
            if (busy.current || idxRef.current >= N) return false
            const side: 1 | -1 = i.x < tw / 2 ? 1 : -1
            drag.current = { side, start: val.current, warned: false, tick: Math.floor(val.current / 25) }
            setHold(true)
            ctx.sfx("tap")
            ctx.haptic(6)
            apply(val.current, side, 0, false)
        },
        onMove: (i) => {
            const s = drag.current
            if (!s || busy.current) return
            const delta = s.side === 1 ? i.dx : -i.dx
            const tight = delta < 0 ? clamp01(-delta / 80) : 0
            const v = clamp(s.start + (Math.max(-24, delta) * 98) / FULL, 0, 100)
            val.current = v
            apply(v, s.side, tight, false)
            if (tight > 0.4 && !s.warned) {
                // the trap bites back: it tightens when you fight it
                s.warned = true
                ctx.sfx("clack")
                ctx.haptic([10, 40, 10])
                ctx.hint("Pulling tightens it · push inward")
            }
            const tick = Math.floor(v / 25)
            if (tick > s.tick) {
                s.tick = tick
                ctx.sfx("soft")
                ctx.haptic(5)
            }
            if (v >= 98) release()
        },
        onEnd: () => {
            if (!drag.current || busy.current) return
            const s = drag.current
            drag.current = null
            setHold(false)
            val.current = val.current * 0.68
            apply(val.current, 0, 0, true)
            ctx.sfx("soft")
            if (!s.warned) ctx.hint("Keep pushing · it remembers")
        },
    })

    React.useEffect(() => {
        ctx.hint("Push an end inward to loosen it")
    }, [])

    const i = idx
    const live = i < N
    return (
        <>
            <div className="ftSky" />
            <i className={cx("ftHypno", ctx.reduced && "rdc")} style={{ ["--cy" as any]: `${cy}px`, ["--hs" as any]: `${Math.max(w, h) * 1.1}px` }} />
            <div className="ftFloor" />
            <i className={cx("ftBracelet", finale && "on", ctx.reduced && "rdc")} style={{ ["--cy" as any]: `${cy}px`, ["--bd" as any]: `${Math.min(w * 0.6, 260) + 16}px` }} />
            {traps.map((t, k) =>
                parked[k] ? (
                    <div key={`f${k}`} className={cx("ftFriend", finale && "on")} style={{ ["--fd" as any]: `${fd}px`, ["--h" as any]: ctx.hue(k), transform: `translate3d(${friendAt(k).x}px,${friendAt(k).y}px,0)` }}>
                        <b>{ctx.pic(k, true) ? <img src={ctx.pic(k, true) as string} alt="" draggable={false} /> : null}</b>
                    </div>
                ) : null
            )}
            {live ? (
                <div
                    key={`t${i}`}
                    className={cx("ftTrap", hold && "hold", freeNow && "free")}
                    style={{ left: w / 2, top: cy, ["--tw" as any]: `${tw}px`, ["--th" as any]: `${th}px`, ["--sl" as any]: `${sl}px`, ["--sh" as any]: `${sh}px`, ["--cd" as any]: `${cd}px`, ["--d" as any]: `${d}px`, ["--h" as any]: ctx.hue(i), ["--h2" as any]: (ctx.hue(i) + 28) % 360 }}
                    {...bind}
                    ref={(el) => (els.current.trap = el)}
                    role="button"
                    aria-label={`Loosen: ${traps[i] || "your picture"}. Press either end and push inward.`}
                >
                    <i className="ftGlow" />
                    <i className="ftSleeve l" ref={(el) => (els.current.sl = el)} />
                    <i className="ftSleeve r" ref={(el) => (els.current.sr = el)} />
                    <div className="ftOrb" ref={(el) => (els.current.orb = el)}>
                        <Orb src={ctx.pic(i, freeNow)} text={traps[i]} d={d} hue={ctx.hue(i)} hue2={300} mood={freeNow ? "happy" : FT_MOOD[ctx.char(i)] || "nervous"} aura={freeNow ? 1 : 0} uploaded={ctx.uploaded} />
                    </div>
                    <span className="ftCap l" ref={(el) => (els.current.cl = el)} aria-hidden="true">
                        <b>›</b>
                    </span>
                    <span className="ftCap r" ref={(el) => (els.current.cr = el)} aria-hidden="true">
                        <b>‹</b>
                    </span>
                </div>
            ) : null}
        </>
    )
}

tsmRitual({ id: 102, hint: "Push an end inward to loosen it", css: FT_CSS, Comp: RitualFingerTrap })
