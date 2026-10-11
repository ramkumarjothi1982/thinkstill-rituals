/* ================================================================== */
/* 87 · KEEP / DROP — a lantern shelf above a misty valley             */
/* ================================================================== */
// Desktop rules kept (E12): one word at a time in the centre; a vertical drag past 112 px up = KEEP, down =
// DROP; a shorter drag springs back with no credit; 6 decisions, progress n/6, then finish with bonus 250.
// Fixed / added (audit §8-9): keep and drop now look and sound different — a kept bubble flies up and settles
// into the glowing keep tray (smaller, happy, words intact); a dropped bubble falls away into the mist and its
// letters scatter down; short drags give no reward; faces turn happy at each choice, so the ritual ends on happy
// faces; the GAMES surprise is in — the kept words assemble into a smaller phrase at the end.

const KD_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="87"] .kdSky{position:absolute;inset:0;background:
  radial-gradient(80% 30% at 50% 0%, rgba(255,196,120,.30) 0%, transparent 70%),
  linear-gradient(180deg,#151133 0%,#1e2152 30%,#24335e 56%,#2b4766 74%,#3a5e74 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="87"] .kdSky{background:
  radial-gradient(80% 30% at 50% 0%, rgba(255,226,170,.75) 0%, transparent 70%),
  linear-gradient(180deg,#ffe9cf 0%,#f3e2f4 30%,#d9e3fb 58%,#c4dcef 78%,#b9d6e6 100%)}
.tsm .tsmRitualLayer[data-rid="87"] .kdStars{position:absolute;left:0;right:0;top:0;height:55%;opacity:.65;
  background-image:radial-gradient(1.2px 1.2px at 9% 34%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 27% 52%,#fff 50%,transparent 51%),radial-gradient(1.3px 1.3px at 71% 40%,#ffe9c9 50%,transparent 51%),radial-gradient(1px 1px at 88% 60%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 50% 66%,#cfe3ff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 93% 30%,#fff 50%,transparent 51%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="87"] .kdStars{opacity:0}
.tsm .tsmRitualLayer[data-rid="87"] .kdTray{position:absolute;border-radius:26px;
  background:linear-gradient(180deg,rgba(255,236,200,.10),rgba(255,214,150,.16) 70%,rgba(255,200,120,.28)),radial-gradient(90% 120% at 50% 120%, rgba(255,190,110,.35), transparent 70%);
  box-shadow:inset 0 0 0 1.5px rgba(255,220,170,.35), inset 0 -4px 0 rgba(255,206,140,.45), 0 14px 30px rgba(10,10,40,.35)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="87"] .kdTray{background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,236,206,.7) 70%,rgba(255,214,160,.8));
  box-shadow:inset 0 0 0 1.5px rgba(214,160,90,.45), inset 0 -4px 0 rgba(226,170,100,.55), 0 12px 26px rgba(120,90,60,.18)}
.tsm .tsmRitualLayer[data-rid="87"] .kdTrayGlow{position:absolute;inset:-30% -6% -40%;border-radius:50%;opacity:0;pointer-events:none;
  background:radial-gradient(closest-side, rgba(255,214,140,.55), rgba(255,190,110,.18) 55%, transparent)}
.tsm .tsmRitualLayer[data-rid="87"] .kdRoot.isFin .kdTrayGlow{opacity:1;transition:opacity .8s ease}
.tsm .tsmRitualLayer[data-rid="87"] .kdDimple{position:absolute;width:var(--md);height:var(--md);margin:calc(var(--md)*-.5) 0 0 calc(var(--md)*-.5);border-radius:50%;
  box-shadow:inset 0 2px 6px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,230,190,.18)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="87"] .kdDimple{box-shadow:inset 0 2px 6px rgba(150,100,50,.18), inset 0 0 0 1px rgba(200,150,90,.25)}
.tsm .tsmRitualLayer[data-rid="87"] .kdKept{position:absolute;width:var(--sw);margin-left:calc(var(--sw)*-.5);text-align:center;animation:kdSettle .6s cubic-bezier(.3,1.7,.5,1) backwards;transition:transform 1s cubic-bezier(.3,1.25,.4,1)}
@keyframes kdSettle{0%{transform:translateY(-14px) scale(1.25);opacity:.4}100%{transform:none;opacity:1}}
.tsm .tsmRitualLayer[data-rid="87"] .kdKept span{position:relative;display:block;width:var(--md);height:var(--md);margin:0 auto;border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 40%, hsla(var(--h),80%,70%,.35), hsla(var(--h),80%,45%,.55));box-shadow:0 0 0 2px rgba(255,226,170,.85), 0 0 16px rgba(255,200,120,.55)}
.tsm .tsmRitualLayer[data-rid="87"] .kdKept span img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="87"] .kdKept span img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="87"] .kdKept em{display:block;margin-top:5px;font-style:normal;font-size:11.5px;font-weight:600;line-height:1.1;color:#fff1d6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="87"] .kdKept em{color:#6b3f12}
.tsm .tsmRitualLayer[data-rid="87"] .kdKept em{transition:opacity .4s ease}
.tsm .tsmRitualLayer[data-rid="87"] .kdRoot.isFin .kdKept em{opacity:0}
.tsm .tsmRitualLayer[data-rid="87"] .kdFog{position:absolute;left:-10%;right:-10%;bottom:0;height:30%;pointer-events:none;
  background:radial-gradient(60% 70% at 30% 100%, rgba(170,200,230,.30), transparent 70%),radial-gradient(60% 70% at 75% 100%, rgba(150,190,225,.26), transparent 70%),linear-gradient(180deg,rgba(120,160,200,0),rgba(110,150,190,.35))}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="87"] .kdFog{background:radial-gradient(60% 70% at 30% 100%, rgba(255,255,255,.8), transparent 70%),radial-gradient(60% 70% at 75% 100%, rgba(240,248,255,.75), transparent 70%),linear-gradient(180deg,rgba(255,255,255,0),rgba(236,244,252,.7))}
.tsm .tsmRitualLayer[data-rid="87"] .kdFogGlow{position:absolute;left:0;right:0;bottom:0;height:36%;opacity:0;pointer-events:none;background:radial-gradient(70% 70% at 50% 100%, rgba(150,200,255,.45), transparent 70%)}
.tsm .tsmRitualLayer[data-rid="87"] .kdChev{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-left:3px solid var(--c);border-top:3px solid var(--c);border-radius:3px 0 0 0;opacity:.2;animation:kdChev 1.8s ease-in-out infinite;animation-delay:var(--cd)}
@keyframes kdChev{0%,100%{opacity:.15}40%{opacity:.85}}
.tsm .tsmRitualLayer[data-rid="87"] .kdSlot{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5)}
.tsm .tsmRitualLayer[data-rid="87"] .kdPop{position:absolute;inset:0;animation:kdPopIn .5s cubic-bezier(.3,1.6,.5,1) both}
@keyframes kdPopIn{0%{opacity:0;transform:scale(.55)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="87"] .kdDrag{position:absolute;inset:0;touch-action:none;cursor:grab;will-change:transform}
.tsm .tsmRitualLayer[data-rid="87"] .kdBob{position:absolute;inset:0;animation:kdBob 4.6s ease-in-out infinite}
@keyframes kdBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.tsm .tsmRitualLayer[data-rid="87"] .kdDrag.held .kdBob{animation:none}
.tsm .tsmRitualLayer[data-rid="87"] .kdSlot .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="87"] .kdCap{position:absolute;left:24px;right:24px;text-align:center;opacity:0;transform:translateY(10px);transition:opacity .9s ease, transform .9s ease;pointer-events:none;color:#fff3dc;text-shadow:0 2px 14px rgba(10,10,40,.6)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="87"] .kdCap{color:#4b2d10;text-shadow:0 1px 0 rgba(255,255,255,.8)}
.tsm .tsmRitualLayer[data-rid="87"] .kdCap.on{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="87"] .kdCap small{display:block;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.75;margin-bottom:8px}
.tsm .tsmRitualLayer[data-rid="87"] .kdCap b{display:block;font-size:22px;font-weight:600;line-height:1.25}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="87"] .kdBob,.tsm .tsmRitualLayer[data-rid="87"] .kdChev{animation:none}}
`

function RitualKeepDrop({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [kept, setKept] = React.useState<number[]>([])
    const [chosen, setChosen] = React.useState(false)
    const [held, setHeld] = React.useState(false)
    const [fin, setFin] = React.useState(false)
    const [cap, setCap] = React.useState(false)
    const st = React.useRef({ idx: 0, busy: false, armed: 0, kept: [] as number[], dropped: 0, dy: 0 })
    const dragRef = React.useRef<HTMLDivElement>(null)
    const trayGlow = React.useRef<HTMLDivElement>(null)
    const fogGlow = React.useRef<HTMLDivElement>(null)
    const timers = useTimers()

    // layout: keep tray on top, the bubble in the middle with travel room both ways, mist at the bottom
    const usable = h - 84
    const sw = Math.floor(Math.min(62, (w - 40) / 6))
    const md = Math.min(48, sw - 8)
    const trayTop = 12
    const trayH = md + 40
    const trayW = sw * 6 + 16
    const trayX = (w - trayW) / 2
    const slotX = (k: number) => trayX + 8 + sw * (k + 0.5)
    const slotY = trayTop + 12 + md / 2
    const d = Math.round(clamp(Math.min(w * 0.42, usable * 0.27), 120, 160))
    const orbX = w / 2
    const orbY = Math.round(trayTop + trayH + (usable - trayTop - trayH) * 0.46)
    const rowScale = (n: number) => Math.min(1.5, (w - 32) / Math.max(1, n * sw))
    const rowX = (k: number, n: number) => w / 2 + (k - (n - 1) / 2) * sw * rowScale(n)
    const rowY = orbY - 70
    const T = Math.min(112, Math.max(80, (orbY - trayTop - trayH) * 0.62))
    const MAXD = T * 1.35

    const setPose = (dy: number, dx: number, trans?: string) => {
        const el = dragRef.current
        if (!el) return
        const k = clamp01(Math.abs(dy) / T)
        el.style.transition = trans || ""
        el.style.transform = `translate3d(${dx}px,${dy}px,0) scale(${1 - 0.05 * k},${1 + 0.08 * k})`
        if (trayGlow.current) trayGlow.current.style.opacity = String(dy < 0 ? k : 0)
        if (fogGlow.current) fogGlow.current.style.opacity = String(dy > 0 ? k : 0)
    }

    const bind = useDrag({
        onStart: () => {
            if (st.current.busy) return false
            st.current.armed = 0
            setHeld(true)
            ctx.sfx("tap")
            ctx.haptic(8)
        },
        onMove: (m) => {
            const a = Math.abs(m.dy)
            const r = a <= T ? a : T + (a - T) * 0.3
            const dy = Math.sign(m.dy) * Math.min(MAXD, r)
            st.current.dy = dy
            setPose(dy, clamp(m.dx * 0.12, -16, 16))
            const arm = a > T ? Math.sign(m.dy) : 0
            if (arm !== st.current.armed) {
                st.current.armed = arm
                if (arm) {
                    ctx.haptic(10)
                    ctx.sfx(arm < 0 ? "plink" : "soft")
                }
            }
        },
        onEnd: (m) => {
            setHeld(false)
            const flick = Math.abs(m.dy) > T * 0.6 && Math.abs(m.vy) > 900 && Math.sign(m.vy) === Math.sign(m.dy)
            if (!st.current.busy && (Math.abs(m.dy) > T || flick)) {
                if (m.dy < 0) keep()
                else drop()
            } else {
                // not far enough: spring back, no credit
                setPose(0, 0, "transform .55s cubic-bezier(.3,1.6,.5,1)")
                if (Math.abs(m.dy) > 12) ctx.sfx("soft")
            }
        },
    })

    const decided = () => {
        const s = st.current
        const n = s.idx + 1
        ctx.progress(n / N)
        timers.after(760, () => {
            if (n >= N) return finale()
            s.idx = n
            s.busy = false
            setIdx(n)
            setChosen(false)
            if (trayGlow.current) trayGlow.current.style.opacity = "0"
            if (fogGlow.current) fogGlow.current.style.opacity = "0"
            ctx.hint(N - n === 1 ? "Last one · up to keep, down to drop" : "Drag up to keep · down to drop")
        })
    }

    const keep = () => {
        const s = st.current
        s.busy = true
        setChosen(true)
        const k = s.kept.length
        const tx = slotX(k) - orbX
        const ty = slotY - orbY
        // KEEP: lifts up into the tray, shrinks to a little lantern and settles there — words intact
        setPose(ty, tx, "transform .62s cubic-bezier(.25,.9,.3,1)")
        const el = dragRef.current
        if (el) el.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${md / d})`
        ctx.sfx("bell")
        ctx.haptic([10, 30, 14])
        ctx.fx.burst(orbX, orbY, { count: 14, shape: "glow", size: [4, 8], speed: [60, 160], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [0.7, 1.1], gravity: -120, colors: ["rgba(255,226,160,1)", "rgba(255,250,230,1)"] })
        timers.after(600, () => {
            s.kept = [...s.kept, s.idx]
            setKept(s.kept)
            if (el) {
                el.style.transition = ""
                el.style.opacity = "0"
            }
            ctx.sfx("chime")
            ctx.fx.burst(slotX(k), slotY, { count: 1, shape: "ring", size: [md * 0.5, md * 0.5], grow: md * 1.6, life: [0.55, 0.55], speed: [0, 0], colors: ["rgba(255,214,140,.95)"], add: true })
            ctx.fx.burst(slotX(k), slotY, { count: 10, shape: "spark", size: [2, 4], speed: [80, 180], life: [0.4, 0.7], colors: ["rgba(255,236,190,1)"] })
            ctx.hint("Kept")
        })
        decided()
    }

    const drop = () => {
        const s = st.current
        s.busy = true
        s.dropped += 1
        setChosen(true)
        const y0 = orbY + s.dy
        const fall = usable - orbY + d * 0.4
        const rot = s.dropped % 2 ? 24 : -24
        // DROP: it lets go and falls away into the mist, its letters scattering down with it
        const el = dragRef.current
        if (el) {
            el.style.transition = "transform .8s cubic-bezier(.55,0,.9,.45), opacity .8s ease-in"
            el.style.transform = `translate3d(${rot}px,${fall}px,0) rotate(${rot}deg) scale(.72)`
            el.style.opacity = "0"
        }
        ctx.sfx("soft")
        ctx.haptic(14)
        const letters = Array.from((ctx.words[s.idx] || "").replace(/\s+/g, "")).slice(0, 18)
        if (letters.length) ctx.fx.burst(orbX, y0 + d * 0.3, { count: letters.length, shape: "text", text: letters, size: [14, 18], speed: [40, 140], angle: [Math.PI * 0.15, Math.PI * 0.85], life: [0.9, 1.2], gravity: 640, drag: 0.98, spin: 5, colors: [ctx.theme === "bright" ? "rgba(40,60,100,1)" : "rgba(225,236,255,1)"], add: false })
        timers.after(640, () => {
            const y = usable - 18
            ctx.sfx("plink")
            ctx.fx.burst(orbX + rot, y, { count: 1, shape: "ring", size: [16, 16], grow: 140, life: [0.8, 0.8], speed: [0, 0], colors: ["rgba(190,220,255,.7)"], add: true })
            ctx.fx.burst(orbX + rot, y, { count: 8, shape: "smoke", size: [20, 36], speed: [20, 60], angle: [-Math.PI, 0], life: [1, 1.5], colors: ["rgba(200,220,240,.35)"], add: false })
            ctx.hint("Dropped")
        })
        decided()
    }

    const finale = () => {
        ctx.hint("")
        setFin(true)
        const ks = st.current.kept
        if (!ks.length) ctx.fx.burst(orbX, orbY, { count: 30, shape: "glow", size: [3, 7], speed: [40, 200], life: [1, 1.8], drag: 0.95, colors: ["rgba(200,230,255,1)", "rgba(255,255,255,1)"] })
        // the kept lanterns glow one by one; the mist settles; the kept words become one smaller phrase
        ks.forEach((_, k) =>
            timers.after(160 + k * 140, () => {
                ctx.sfx("plink")
                ctx.fx.burst(rowX(k, ks.length), rowY, { count: 12, shape: "glow", size: [3, 7], speed: [40, 140], life: [0.8, 1.3], gravity: 60, colors: ["rgba(255,230,170,1)", "rgba(255,255,240,1)"] })
            })
        )
        timers.after(300 + ks.length * 140, () => {
            ctx.sfx("chime")
            ctx.haptic([20, 60, 20])
            for (let k = 0; k < 18; k++) timers.after(k * 50, () => ctx.fx.add({ x: w * (0.1 + Math.random() * 0.8), y: usable - Math.random() * 60, vy: -40 - Math.random() * 40, size: 3 + Math.random() * 3, max: 1.4, shape: "glow", color: "rgba(200,230,255,1)" }))
            setCap(true)
        })
        timers.after(2450, () => {
            ctx.sfx("win")
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Drag up to keep · down to drop")
    }, [])

    const word = ctx.words[idx]
    const keptPhrase = thoughtLine(kept.map((k) => ctx.words[k]).filter(Boolean).join(" · "), 70)
    const chev = (dir: number) =>
        [0, 1, 2].map((k) => {
            const y = dir < 0 ? orbY - d / 2 - 22 - k * 16 : orbY + d / 2 + 22 + k * 16
            return <i key={`${dir}${k}`} className="kdChev" style={{ left: orbX, top: y, transform: `rotate(${dir < 0 ? 45 : 225}deg)`, ["--c" as any]: dir < 0 ? "rgba(255,206,130,.95)" : "rgba(160,205,255,.95)", ["--cd" as any]: `${(2 - k) * -0.18 + (dir < 0 ? 0 : -0.9)}s`, opacity: fin ? 0 : undefined }} />
        })
    return (
        <div className={cx("kdRoot", fin && "isFin")} style={{ position: "absolute", inset: 0 }}>
            <div className="kdSky" />
            <div className="kdStars" />
            <div className="kdFog" />
            <div ref={fogGlow} className="kdFogGlow" />
            <div className="kdTray" style={{ left: trayX, top: trayTop, width: trayW, height: trayH }}>
                <div ref={trayGlow} className="kdTrayGlow" />
            </div>
            {Array.from({ length: 6 }, (_, k) => (k >= kept.length ? <i key={`d${k}`} className="kdDimple" style={{ left: slotX(k), top: slotY, ["--md" as any]: `${md}px` }} /> : null))}
            {kept.map((wi, k) => {
                const src = ctx.pic(wi, true)
                return (
                    <div key={`k${wi}`} className="kdKept" style={{ left: slotX(k), top: slotY - md / 2, transform: fin ? `translate(${rowX(k, kept.length) - slotX(k)}px,${rowY - slotY}px) scale(${rowScale(kept.length)})` : undefined, transitionDelay: `${k * 0.09}s`, ["--sw" as any]: `${sw}px`, ["--md" as any]: `${md}px`, ["--h" as any]: ctx.hue(wi) }} aria-label={`Kept: ${ctx.words[wi] || "your picture"}`}>
                        <span>{src ? <img className={ctx.uploaded ? "up" : undefined} src={src} alt="" draggable={false} /> : null}</span>
                        <em>{ctx.words[wi]}</em>
                    </div>
                )
            })}
            {!fin ? chev(-1) : null}
            {!fin ? chev(1) : null}
            {!fin ? (
                <div key={idx} className="kdSlot" style={{ left: orbX, top: orbY, ["--d" as any]: `${d}px` }}>
                    <div className="kdPop">
                        <div ref={dragRef} className={cx("kdDrag", held && "held")} {...bind} role="button" aria-label={`Drag up to keep, down to drop: ${word || "your picture"}`}>
                            <div className="kdBob">
                                <Orb src={ctx.pic(idx, chosen)} text={word} d={d} hue={ctx.hue(idx)} hue2={42} mood={chosen ? "happy" : "nervous"} aura={chosen ? 0.8 : 0} uploaded={ctx.uploaded} lifted={held} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className={cx("kdCap", cap && "on")} style={{ top: kept.length ? rowY + md * rowScale(kept.length) * 0.5 + 34 : orbY - 40 }} aria-live="polite">
                <small>{kept.length ? "What you kept" : "Nothing to carry"}</small>
                <b>{kept.length ? keptPhrase : "Lighter now"}</b>
            </div>
        </div>
    )
}

tsmRitual({ id: 87, hint: "Drag up to keep · down to drop", css: KD_CSS, Comp: RitualKeepDrop })
