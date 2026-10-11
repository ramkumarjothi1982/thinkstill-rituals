/* ================================================================== */
/* 29 · MUTE — a warm radio studio, one fader                          */
/* ================================================================== */
// Desktop rules kept: one word per round (6 rounds), a vertical fader dragged DOWN; the live waveform's
// amplitude = 100 − level; a release past 80 % of the travel turns the word down (advance), progress k/6,
// bonus 250. The word is never shrunk or hidden ("quiet is enough; gone is optional"). Fixed: the fader cap
// springs back to the top for every word, a short release springs back with a gentle "pull a little further",
// the waveform is truly live, the influence % is shown in the hint while you pull, the face turns positive the
// moment a word is turned down and the ritual ends on a calm, positive face with the ON AIR lamp switched off.

const MUTE_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="29"] .muRoom{position:absolute;inset:0;background:
  radial-gradient(70% 34% at 50% 26%, rgba(255,150,80,.20), transparent 72%),
  radial-gradient(130% 50% at 50% 112%, rgba(150,62,34,.55), transparent 62%),
  repeating-linear-gradient(90deg, rgba(255,255,255,.018) 0 2px, transparent 2px 22px),
  linear-gradient(180deg,#160c12 0%,#22121a 38%,#2d1819 66%,#1b0e0d 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="29"] .muRoom{background:
  radial-gradient(70% 34% at 50% 26%, rgba(255,190,120,.45), transparent 72%),
  radial-gradient(130% 50% at 50% 112%, rgba(214,140,96,.45), transparent 62%),
  repeating-linear-gradient(90deg, rgba(120,60,30,.035) 0 2px, transparent 2px 22px),
  linear-gradient(180deg,#f7ead9 0%,#f1dcc6 45%,#e8c7aa 100%)}
.tsm .tsmRitualLayer[data-rid="29"] .muDesk{position:absolute;border-radius:28px 28px 0 0;pointer-events:none;
  background:radial-gradient(60% 38% at 50% 30%, rgba(255,170,110,.16), transparent 70%),linear-gradient(180deg, rgba(255,214,170,.10) 0%, rgba(255,214,170,.02) 14%, transparent 40%),
    repeating-linear-gradient(180deg, rgba(255,220,190,.025) 0 1px, transparent 1px 4px),linear-gradient(180deg,#3a2420 0%,#2a1816 55%,#170c0b 100%);
  box-shadow:inset 0 1px 0 rgba(255,220,180,.22)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="29"] .muDesk{background:radial-gradient(60% 38% at 50% 30%, rgba(255,236,210,.5), transparent 70%),linear-gradient(180deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.1) 14%, transparent 40%),repeating-linear-gradient(180deg, rgba(90,40,10,.04) 0 1px, transparent 1px 4px),linear-gradient(180deg,#d9b391 0%,#c99d7a 60%,#b98a66 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}
.tsm .tsmRitualLayer[data-rid="29"] .muLamp{position:absolute;border-radius:10px;display:grid;place-items:center;font-size:13px;font-weight:700;letter-spacing:.22em;padding-left:.22em;
  color:#ffe9e4;background:radial-gradient(120% 140% at 50% 0%, #ff6a5a 0%, #d8262c 55%, #8e1018 100%);box-shadow:0 0 0 1.5px rgba(255,190,180,.5), 0 0 26px rgba(255,60,60,.55);transition:opacity .5s ease}
.tsm .tsmRitualLayer[data-rid="29"] .muLamp.off{color:rgba(255,220,210,.35);background:linear-gradient(180deg,#4a2a2c,#2e1a1c);box-shadow:0 0 0 1.5px rgba(255,190,180,.18)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="29"] .muLamp.off{color:rgba(90,40,40,.45);background:linear-gradient(180deg,#e4c8bb,#cfae9f)}
.tsm .tsmRitualLayer[data-rid="29"] .muLampGlow{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side, rgba(255,70,60,.35), transparent);transition:opacity .5s ease}
.tsm .tsmRitualLayer[data-rid="29"] .muWave{position:absolute;left:0;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="29"] .muSlot{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);animation:muIn .62s cubic-bezier(.25,1.3,.5,1) both}
@keyframes muIn{0%{opacity:0;transform:translate3d(46px,0,0) scale(.86)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="29"] .muSlot.out{animation:muOut .5s cubic-bezier(.5,0,.7,.4) both}
@keyframes muOut{0%{opacity:1;transform:none}100%{opacity:0;transform:translate3d(-60px,8px,0) scale(.86)}}
.tsm .tsmRitualLayer[data-rid="29"] .muShake{position:absolute;inset:0;will-change:transform}
.tsm .tsmRitualLayer[data-rid="29"] .muShake .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="29"] .muTrack{position:absolute;border-radius:12px;pointer-events:none;
  background:linear-gradient(90deg,#0b0607,#24140f 50%,#0b0607);box-shadow:inset 0 2px 6px rgba(0,0,0,.7), 0 1px 0 rgba(255,220,180,.15)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="29"] .muTrack{background:linear-gradient(90deg,#6e4632,#8f5d43 50%,#6e4632);box-shadow:inset 0 2px 6px rgba(60,20,0,.5), 0 1px 0 rgba(255,255,255,.6)}
.tsm .tsmRitualLayer[data-rid="29"] .muTicks{position:absolute;pointer-events:none;opacity:.55;
  background:repeating-linear-gradient(180deg, rgba(255,214,170,.7) 0 2px, transparent 2px var(--step)),repeating-linear-gradient(180deg, rgba(255,214,170,.7) 0 2px, transparent 2px var(--step));
  background-size:16px 100%, 16px 100%;background-position:left top, right top;background-repeat:no-repeat}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="29"] .muTicks{opacity:.5;background:repeating-linear-gradient(180deg, rgba(90,40,20,.8) 0 2px, transparent 2px var(--step)),repeating-linear-gradient(180deg, rgba(90,40,20,.8) 0 2px, transparent 2px var(--step));background-size:16px 100%, 16px 100%;background-position:left top, right top;background-repeat:no-repeat}
.tsm .tsmRitualLayer[data-rid="29"] .muFill{position:absolute;border-radius:6px;pointer-events:none;transform-origin:50% 0;
  background:linear-gradient(180deg,#ffb36b,#ff6e5e);opacity:.85}
.tsm .tsmRitualLayer[data-rid="29"] .muCap{position:absolute;touch-action:none;cursor:grab;will-change:transform;border-radius:18px;
  background:linear-gradient(180deg,#fbe9d6 0%,#e7c7a6 45%,#c79c78 55%,#e9cfb4 100%);
  box-shadow:0 10px 22px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.9), inset 0 -2px 0 rgba(120,70,40,.35)}
.tsm .tsmRitualLayer[data-rid="29"] .muCap .muGrip{position:absolute;left:24%;right:24%;top:50%;height:2px;margin-top:-1px;border-radius:2px;background:#b3261e;box-shadow:0 -9px 0 rgba(90,50,30,.35), 0 9px 0 rgba(90,50,30,.35)}
.tsm .tsmRitualLayer[data-rid="29"] .muCap .muSq{position:absolute;inset:0;border-radius:18px;transition:transform .12s cubic-bezier(.3,1.5,.5,1)}
.tsm .tsmRitualLayer[data-rid="29"] .muCap.press .muSq{transform:scale(1.05,.9)}
.tsm .tsmRitualLayer[data-rid="29"] .muCue{position:absolute;left:50%;width:2px;height:22px;margin-left:-1px;border-radius:2px;background:linear-gradient(180deg,rgba(255,220,190,.8),transparent);animation:muCue 1.5s ease-in-out infinite;pointer-events:none}
@keyframes muCue{0%{transform:translateY(-4px);opacity:0}40%{opacity:1}100%{transform:translateY(14px);opacity:0}}
.tsm .tsmRitualLayer[data-rid="29"] .muFaderWrap{position:absolute;inset:0;transition:opacity .7s ease}
.tsm .tsmRitualLayer[data-rid="29"] .muCaption{position:absolute;left:0;right:0;text-align:center;font-size:21px;font-weight:600;letter-spacing:.01em;color:#ffe3c8;opacity:0;transform:translateY(8px);transition:opacity 1s ease .3s, transform 1s ease .3s;pointer-events:none}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="29"] .muCaption{color:#7a3a1c}
.tsm .tsmRitualLayer[data-rid="29"] .muCaption.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="29"] .muSlot,.tsm .tsmRitualLayer[data-rid="29"] .muCue{animation:none}}
`

function RitualMute({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [muted, setMuted] = React.useState(false)
    const [leaving, setLeaving] = React.useState(false)
    const [phase, setPhase] = React.useState<"play" | "finale">("play")
    const [press, setPress] = React.useState(false)
    const timers = useTimers()
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const shakeRef = React.useRef<HTMLDivElement>(null)
    const capRef = React.useRef<HTMLDivElement>(null)
    const fillRef = React.useRef<HTMLDivElement>(null)
    const levelRef = React.useRef(0) // 0 = full volume, 1 = all the way down
    const ampRef = React.useRef(1)
    const busyRef = React.useRef(false)
    const bucketRef = React.useRef(-1)
    const ringT = React.useRef(0)
    const phaseRef = useLatest(phase)
    const mutedRef = useLatest(muted)

    // ---- layout: ON AIR lamp · the word with its waveform · the fader (thumb zone) ----
    const d = Math.round(clamp(Math.min(w * 0.42, h * 0.24), 118, 172))
    const lampW = 104
    const lampH = 30
    const lampY = 14
    const oy = lampY + lampH + 22 + d / 2
    const waveH = Math.round(d * 1.55)
    const capW = 132
    const capH = 58
    const capTop0 = oy + d / 2 + Math.max(34, h * 0.075)
    const L = Math.round(clamp(h - 104 - capTop0 - capH, 130, 250))
    const deskTop = capTop0 - 18
    const COMMIT = 0.8

    const setCap = (y: number, anim = false) => {
        const el = capRef.current
        if (el) {
            el.style.transition = anim ? "transform .6s cubic-bezier(.3,1.45,.5,1)" : ""
            el.style.transform = `translate3d(0,${y}px,0)`
        }
        const f = fillRef.current
        if (f) {
            f.style.transition = anim ? "transform .6s cubic-bezier(.3,1.45,.5,1)" : ""
            f.style.transform = `scaleY(${Math.max(0.001, y / L)})`
        }
    }

    // the live waveform (one canvas) + the word's loudness jitter
    useFrame((dt, t) => {
        const target = phaseRef.current === "finale" || mutedRef.current ? 0.045 : Math.max(0.045, 1 - levelRef.current)
        ampRef.current += (target - ampRef.current) * Math.min(1, dt * 9)
        const A = ampRef.current
        const c = canvasRef.current
        if (c) {
            const g = c.getContext("2d")
            const dpr = Math.min(2, (hasWindow && window.devicePixelRatio) || 1)
            const cw = Math.round(w * dpr)
            const chh = Math.round(waveH * dpr)
            if (c.width !== cw || c.height !== chh) {
                c.width = cw
                c.height = chh
            }
            if (g) {
                g.setTransform(dpr, 0, 0, dpr, 0, 0)
                g.clearRect(0, 0, w, waveH)
                const mid = waveH / 2
                const n = Math.max(24, Math.round(w / 10))
                const bright = ctx.theme === "bright"
                const grad = g.createLinearGradient(0, 0, w, 0)
                grad.addColorStop(0, bright ? "rgba(214,90,40,.9)" : "rgba(255,170,90,.95)")
                grad.addColorStop(0.5, bright ? "rgba(200,40,70,.95)" : "rgba(255,96,110,1)")
                grad.addColorStop(1, bright ? "rgba(150,50,160,.9)" : "rgba(196,110,255,.95)")
                g.fillStyle = grad
                const tt = ctx.reduced ? t * 0.35 : t
                for (let i = 0; i < n; i++) {
                    const x = ((i + 0.5) * w) / n
                    if (Math.abs(x - w / 2) < d * 0.44) continue // never behind the words
                    const u = (x - w / 2) / (w / 2)
                    const env = 0.3 + 0.7 * (1 - u * u)
                    const v = Math.abs(0.55 * Math.sin(tt * 7.3 + i * 0.83) + 0.45 * Math.sin(tt * 11.1 + i * 0.41 + Math.sin(tt * 1.7 + i)))
                    const hh = Math.max(1.5, A * env * (0.25 + 0.75 * v) * (mid - 4))
                    g.globalAlpha = 0.35 + 0.65 * Math.min(1, A * 1.4)
                    const bw = 4.2
                    g.beginPath()
                    if ((g as any).roundRect) (g as any).roundRect(x - bw / 2, mid - hh, bw, hh * 2, 2.1)
                    else g.rect(x - bw / 2, mid - hh, bw, hh * 2)
                    g.fill()
                }
                // the calm line underneath: it is all that is left when the word is turned down
                g.globalAlpha = 0.3 + 0.6 * (1 - Math.min(1, A))
                g.strokeStyle = bright ? "rgba(160,70,40,1)" : "rgba(255,226,190,1)"
                g.lineWidth = 2
                g.beginPath()
                for (let x = 0; x <= w; x += 6) {
                    const y = mid + Math.sin(x / 38 + tt * 1.4) * (3 + 5 * (1 - A))
                    if (x === 0) g.moveTo(x, y)
                    else g.lineTo(x, y)
                }
                g.stroke()
                g.globalAlpha = 1
            }
        }
        const s = shakeRef.current
        if (s) {
            const k = ctx.reduced ? 0 : Math.max(0, A - 0.06)
            s.style.transform = `translate3d(${(Math.random() - 0.5) * 2.4 * k}px,${(Math.random() - 0.5) * 2.4 * k}px,0) scale(${1 + 0.022 * k * Math.sin(t * 15)})`
        }
        // loud words send sound rings out
        ringT.current += dt
        if (!ctx.reduced && A > 0.3 && ringT.current > 0.5 / A) {
            ringT.current = 0
            ctx.fx.burst(w / 2, oy, { count: 1, shape: "ring", size: [d * 0.52, d * 0.52], grow: d * 0.9, life: [0.9, 0.9], speed: [0, 0], colors: [ctx.theme === "bright" ? `rgba(200,80,60,${0.3 * A})` : `rgba(255,170,120,${0.32 * A})`], add: ctx.theme !== "bright" })
        }
    })

    const drag = useDrag({
        onStart: () => {
            if (busyRef.current || phaseRef.current !== "play" || mutedRef.current) return false
            setPress(true)
            bucketRef.current = -1
            ctx.sfx("tap")
            ctx.haptic(8)
        },
        onMove: (di) => {
            const raw = di.dy
            // resistance: rubber band above the top and past the end of the track
            const y = raw < 0 ? raw * 0.18 : raw <= L ? raw : L + (raw - L) * 0.18
            setCap(y)
            const lvl = clamp01(y / L)
            levelRef.current = lvl
            const b = Math.min(10, Math.floor(lvl * 10 + 0.0001))
            if (b !== bucketRef.current) {
                if (bucketRef.current >= 0) ctx.haptic(b >= 8 ? 10 : 4)
                if (b >= 8 && bucketRef.current < 8 && bucketRef.current >= 0) ctx.sfx("clack")
                bucketRef.current = b
                const inf = 100 - b * 10
                ctx.hint(lvl >= COMMIT ? `Influence ${inf}% · let go` : `Influence ${inf}% · keep pulling`)
            }
        },
        onEnd: () => {
            setPress(false)
            if (levelRef.current >= COMMIT) turnDown()
            else {
                levelRef.current = 0
                setCap(0, true)
                ctx.sfx("soft")
                ctx.haptic(6)
                ctx.hint("Pull it a little further down")
            }
        },
    })

    const turnDown = () => {
        busyRef.current = true
        levelRef.current = 1
        setCap(L, true)
        setMuted(true)
        ctx.sfx("clack")
        ctx.haptic(16)
        // a soft settle: warm motes lift off the flattened line
        for (let k = 0; k < 14; k++) ctx.fx.add({ x: w * (0.08 + Math.random() * 0.84), y: oy + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 12, vy: -20 - Math.random() * 30, max: 1.4 + Math.random() * 0.6, size: 2.5 + Math.random() * 2.5, shape: "glow", color: ctx.theme === "bright" ? "rgba(255,170,90,1)" : "rgba(255,214,160,1)" })
        const n = idx + 1
        ctx.progress(n / N)
        timers.after(380, () => ctx.sfx("chime"))
        if (n >= N) {
            timers.after(900, finale)
            return
        }
        ctx.hint(n === N - 1 ? "Last one — turn it down" : `Quiet. ${N - n} more to turn down`)
        timers.after(1250, () => setLeaving(true))
        timers.after(1750, () => {
            setLeaving(false)
            setMuted(false)
            setIdx(n)
            levelRef.current = 0
            setCap(0, true) // the fader springs back to the top for the next word
            busyRef.current = false
        })
    }

    const finale = () => {
        ctx.hint("")
        setPhase("finale")
        ctx.sfx("soft")
        ctx.haptic([14, 50, 14])
        // the lamp clicks off; the room warms; a slow sine glows across the desk
        timers.after(500, () => {
            ctx.sfx("hum")
            for (let k = 0; k < 26; k++)
                timers.after(k * 45, () => ctx.fx.add({ x: (w * (k + 0.5)) / 26, y: oy + Math.sin(k / 3) * 6, vx: 0, vy: -26 - Math.random() * 24, max: 1.6, size: 3 + Math.random() * 3, shape: "glow", color: k % 3 ? "rgba(255,206,150,1)" : "rgba(255,150,170,1)" }))
        })
        timers.after(1300, () => {
            ctx.sfx("chime")
            ctx.fx.burst(w / 2, oy, { count: 1, shape: "ring", size: [d * 0.5, d * 0.5], grow: w * 0.8, life: [1.3, 1.3], speed: [0, 0], colors: ["rgba(255,220,180,.6)"], add: true })
        })
        timers.after(2450, () => {
            ctx.sfx("win")
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Pull the fader all the way down")
    }, [])

    const word = ctx.words[idx]
    const fin = phase === "finale"
    return (
        <>
            <div className="muRoom" />
            <i className="muLampGlow" style={{ left: w / 2 - 110, top: lampY + lampH / 2 - 60, width: 220, height: 120, opacity: fin ? 0 : 1 }} />
            <div className={cx("muLamp", fin && "off")} style={{ left: w / 2 - lampW / 2, top: lampY, width: lampW, height: lampH }} aria-hidden="true">
                ON AIR
            </div>
            <canvas ref={canvasRef} className="muWave" style={{ top: oy - waveH / 2, width: w, height: waveH }} aria-hidden="true" />
            <div key={idx} className={cx("muSlot", leaving && "out")} style={{ left: w / 2, top: oy, ["--d" as any]: `${d}px` }}>
                <div ref={shakeRef} className="muShake">
                    <Orb src={ctx.pic(idx, muted || fin)} text={word} d={d} hue={ctx.hue(idx)} hue2={36} mood={muted || fin ? "happy" : MOOD_FOR_CHAR[ctx.char(idx)] || "tremble"} aura={muted || fin ? 0.85 : 0} uploaded={ctx.uploaded} label={word || "your picture"} />
                </div>
            </div>
            <div className="muDesk" style={{ left: 0, width: w, top: deskTop, height: h - deskTop + 4 }} />
            <div className="muFaderWrap" style={{ opacity: fin ? 0 : 1 }}>
                <i className="muTicks" style={{ left: w / 2 - 44, width: 88, top: capTop0 + capH / 2 - 1, height: L + 4, ["--step" as any]: `${L / 10}px` }} />
                <i className="muTrack" style={{ left: w / 2 - 7, width: 14, top: capTop0 + capH / 2 - 12, height: L + 24 }} />
                <i ref={fillRef} className="muFill" style={{ left: w / 2 - 3, width: 6, top: capTop0 + capH / 2, height: L, transform: "scaleY(0.001)" }} />
            </div>
            <div className="muFaderWrap" style={{ opacity: fin ? 0.55 : 1, pointerEvents: "none" }}>
                <div
                    ref={capRef}
                    className={cx("muCap", press && "press")}
                    style={{ left: w / 2 - capW / 2, top: capTop0, width: capW, height: capH, pointerEvents: "auto" }}
                    {...drag}
                    role="button"
                    aria-label={`Turn down: ${word || "your picture"}`}
                >
                    <div className="muSq">
                        <i className="muGrip" />
                    </div>
                    {!press && !muted ? <i className="muCue" style={{ top: capH + 6 }} aria-hidden="true" /> : null}
                </div>
            </div>
            <div className={cx("muCaption", fin && "on")} style={{ top: capTop0 + L * 0.4 }}>
                Quiet is enough.
            </div>
        </>
    )
}

tsmRitual({ id: 29, hint: "Pull the fader all the way down", css: MUTE_CSS, Comp: RitualMute })
