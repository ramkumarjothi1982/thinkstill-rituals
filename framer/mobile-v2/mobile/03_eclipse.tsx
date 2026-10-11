/* ================================================================== */
/* The Breathing Eclipse — ThinkStill's signature                      */
/* ================================================================== */
// A deep core, a luminous limb, slow corona streamers, a volumetric halo and a travelling
// "diamond ring" bead. Breathing (expansion + colour temperature) is pure CSS transform/opacity,
// so it stays on the compositor and never competes with gameplay.

const ECLIPSE_CSS = String.raw`
.tsm .ecl{position:relative;flex:none;border-radius:50%;--s:200px;width:var(--s);height:var(--s);pointer-events:none}
.tsm .ecl>i{position:absolute;border-radius:50%;display:block}
.tsm .ecl .eHalo{inset:-78%;background:radial-gradient(circle, rgba(var(--corona),.34) 0%, rgba(var(--corona),.15) 20%, rgba(var(--corona),.06) 38%, transparent 62%);
  animation:eclBreathHalo var(--bp,10s) ease-in-out infinite}
.tsm .ecl .eHaloCool{inset:-70%;background:radial-gradient(circle, rgba(var(--coronaCool),.30) 0%, rgba(var(--coronaCool),.10) 26%, transparent 60%);
  animation:eclTemp 23s ease-in-out infinite}
.tsm .ecl .eRaysA{inset:-46%;opacity:.9;
  background:conic-gradient(from 0deg, transparent 0deg, rgba(var(--corona),.55) 6deg, transparent 13deg, transparent 31deg, rgba(255,236,206,.42) 36deg, transparent 44deg, rgba(var(--corona),.32) 58deg, transparent 66deg, transparent 92deg, rgba(var(--corona),.6) 99deg, transparent 107deg, rgba(var(--coronaCool),.32) 130deg, transparent 141deg, transparent 160deg, rgba(255,236,206,.5) 166deg, transparent 172deg, rgba(var(--corona),.4) 197deg, transparent 209deg, transparent 228deg, rgba(var(--corona),.55) 236deg, transparent 243deg, rgba(var(--coronaCool),.36) 268deg, transparent 280deg, rgba(255,236,206,.45) 300deg, transparent 307deg, rgba(var(--corona),.5) 331deg, transparent 344deg);
  -webkit-mask-image:radial-gradient(circle, transparent 33%, #000 36%, rgba(0,0,0,.55) 50%, transparent 70%);mask-image:radial-gradient(circle, transparent 33%, #000 36%, rgba(0,0,0,.55) 50%, transparent 70%);
  animation:tsmSpin 96s linear infinite}
.tsm .ecl .eRaysB{inset:-34%;opacity:.8;mix-blend-mode:screen;
  background:conic-gradient(from 40deg, transparent 0deg, rgba(255,244,226,.5) 4deg, transparent 9deg, transparent 47deg, rgba(var(--corona),.42) 52deg, transparent 61deg, transparent 103deg, rgba(var(--coronaCool),.4) 110deg, transparent 118deg, transparent 152deg, rgba(255,244,226,.45) 156deg, transparent 162deg, transparent 212deg, rgba(var(--corona),.5) 220deg, transparent 229deg, transparent 277deg, rgba(255,244,226,.4) 282deg, transparent 288deg, transparent 320deg, rgba(var(--corona),.38) 326deg, transparent 336deg);
  -webkit-mask-image:radial-gradient(circle, transparent 40%, #000 44%, transparent 72%);mask-image:radial-gradient(circle, transparent 40%, #000 44%, transparent 72%);
  animation:tsmSpinRev 140s linear infinite}
.tsm .ecl .eCorona{inset:-14%;background:radial-gradient(circle, transparent 53%, rgba(255,246,230,.96) 56.6%, rgba(var(--corona),.62) 59.5%, rgba(var(--corona),.22) 66%, rgba(var(--corona),.06) 74%, transparent 82%);
  animation:eclBreath var(--bp,10s) ease-in-out infinite}
.tsm .ecl .eCore{inset:0;background:
   radial-gradient(circle at 66% 72%, rgba(var(--coronaCool),.10) 0%, transparent 42%),
   radial-gradient(circle at 36% 30%, var(--coreLift) 0%, var(--core) 56%, #000 100%);
  box-shadow:inset 0 0 calc(var(--s)*.09) rgba(255,214,170,.20), inset 0 0 calc(var(--s)*.02) rgba(255,240,220,.55), 0 0 calc(var(--s)*.03) rgba(255,240,220,.65)}
.tsm .ecl .eOrbit{inset:-1.5%;animation:tsmSpin 38s linear infinite}
.tsm .ecl .eBead{position:absolute;left:50%;top:0;width:calc(var(--s)*.11);height:calc(var(--s)*.11);margin:calc(var(--s)*-.055) 0 0 calc(var(--s)*-.055);border-radius:50%;
  background:radial-gradient(circle, #fff 0%, rgba(255,250,240,.95) 14%, rgba(var(--corona),.55) 34%, transparent 70%);animation:eclBead var(--bp,10s) ease-in-out infinite}
.tsm .ecl .eBead::after{content:"";position:absolute;left:-160%;right:-160%;top:50%;height:1.5px;margin-top:-.75px;border-radius:2px;
  background:linear-gradient(90deg, transparent, rgba(255,246,232,.75), transparent)}
.tsm .ecl .eMotes{inset:-30%;animation:tsmSpin 60s linear infinite}
.tsm .ecl .eMotes b{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(255,240,220,.9);box-shadow:0 0 6px rgba(var(--corona),.9)}
.tsm .ecl.flare .eCorona{animation:eclFlare 1.1s cubic-bezier(.2,.8,.2,1) 1, eclBreath var(--bp,10s) ease-in-out 1.1s infinite}
.tsm .ecl.flare .eHalo{animation:eclFlareHalo 1.2s cubic-bezier(.2,.8,.2,1) 1, eclBreathHalo var(--bp,10s) ease-in-out 1.2s infinite}
.tsm .ecl.still>i,.tsm .ecl.still .eBead{animation:none!important}
@keyframes eclBreath{0%,100%{transform:scale(.965);opacity:.86}40%{transform:scale(1.045);opacity:1}}
@keyframes eclBreathHalo{0%,100%{transform:scale(.9);opacity:.72}40%{transform:scale(1.1);opacity:1}}
@keyframes eclTemp{0%,100%{opacity:.25}50%{opacity:.85}}
@keyframes eclBead{0%,100%{transform:scale(.75);opacity:.7}40%{transform:scale(1.15);opacity:1}}
@keyframes eclFlare{0%{transform:scale(1);opacity:1;filter:brightness(1)}30%{transform:scale(1.16);opacity:1;filter:brightness(1.6)}100%{transform:scale(.97);opacity:.86;filter:brightness(1)}}
@keyframes eclFlareHalo{0%{transform:scale(1)}30%{transform:scale(1.35);opacity:1}100%{transform:scale(.9);opacity:.72}}

/* ---------- transition curtain ---------- */
.tsm .eclCurtain{position:absolute;inset:0;z-index:80;pointer-events:none;overflow:hidden}
.tsm .eclCurtain.on{pointer-events:auto}
.tsm .eclRingLayer{position:absolute;inset:0;z-index:90;pointer-events:none;overflow:hidden;font-family:${FONT};-webkit-font-smoothing:antialiased}
.tsm .eclCurtain .ecCore{position:absolute;border-radius:50%;will-change:transform,opacity;
  background:radial-gradient(circle at 40% 34%, var(--coreLift) 0%, var(--core) 48%, #020108 100%)}
.tsm .eclRingLayer .ecRing{position:absolute;border-radius:50%;will-change:transform,opacity;
  background:radial-gradient(circle, transparent 47%, rgba(255,248,236,.95) 49.6%, rgba(var(--corona),.7) 51.5%, rgba(var(--corona),.25) 56%, rgba(var(--coronaCool),.08) 63%, transparent 70%)}
.tsm .eclRingLayer .ecCaption{position:absolute;left:24px;right:24px;top:50%;transform:translateY(-50%);text-align:center;color:#fff;opacity:0;
  transition:opacity .35s ease, transform .6s cubic-bezier(.2,.8,.2,1)}
.tsm .eclRingLayer .ecCaption.show{opacity:1}
.tsm .eclRingLayer .ecCapEcl{display:flex;justify-content:center;margin:0 0 30px}
.tsm .eclRingLayer .ecCaption small{display:block;font-size:11px;font-weight:600;letter-spacing:.32em;text-transform:uppercase;color:rgba(255,226,190,.85);margin-bottom:12px}
.tsm .eclRingLayer .ecCaption b{display:block;font-size:34px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  background:linear-gradient(180deg,#fff, #ffe2bd);-webkit-background-clip:text;background-clip:text;color:transparent}
.tsm .eclRingLayer .ecCaption em{display:block;margin-top:14px;font-style:normal;font-size:16px;line-height:1.35;font-weight:400;color:rgba(255,255,255,.78)}
.tsm .eclRingLayer .ecSkip{position:absolute;left:50%;bottom:calc(28px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font-size:13px;color:rgba(255,255,255,.55);letter-spacing:.04em}
`

interface EclipseProps {
    size: number
    breathSeconds?: number
    flareKey?: number | string
    still?: boolean
    motes?: boolean
    style?: React.CSSProperties
    className?: string
}

function Eclipse({ size, breathSeconds = 10, flareKey, still, motes = true, style, className }: EclipseProps) {
    const [flare, setFlare] = React.useState(false)
    const first = React.useRef(true)
    React.useEffect(() => {
        if (first.current) {
            first.current = false
            return
        }
        if (flareKey == null) return
        setFlare(false)
        const a = requestAnimationFrame(() => setFlare(true))
        const t = setTimeout(() => setFlare(false), 1300)
        return () => {
            cancelAnimationFrame(a)
            clearTimeout(t)
        }
    }, [flareKey])
    const moteEls = React.useMemo(
        () =>
            Array.from({ length: 9 }, (_, i) => {
                const a = (i / 9) * Math.PI * 2 + noise(i, 3) * 0.6
                const r = 34 + noise(i, 5) * 15
                return <b key={i} style={{ left: `${50 + Math.cos(a) * r}%`, top: `${50 + Math.sin(a) * r}%`, opacity: 0.35 + noise(i, 7) * 0.6, transform: `scale(${0.6 + noise(i, 9)})` }} />
            }),
        []
    )
    return (
        <div className={cx("ecl", flare && "flare", still && "still", className)} style={{ ["--s" as any]: `${size}px`, ["--bp" as any]: `${breathSeconds}s`, ...style }} aria-hidden="true">
            <i className="eHalo" />
            <i className="eHaloCool" />
            <i className="eRaysA" />
            <i className="eRaysB" />
            <i className="eCorona" />
            {motes ? <i className="eMotes">{moteEls}</i> : null}
            <i className="eCore" />
            <i className="eOrbit">
                <span className="eBead" />
            </i>
        </div>
    )
}

/* ---------- Eclipse transition controller ---------- */

interface EclipseRun {
    /** Called when the screen is fully covered — swap the scene here. */
    apply: () => void
    /** Optional title card inside the eclipse while covered (e.g. ritual name). */
    caption?: { eyebrow?: string; title?: string; line?: string }
    /** Longer breath (thought → ritual). Tap skips. */
    long?: boolean
    /** Origin of the eclipse in container px (defaults to centre). */
    origin?: { x: number; y: number }
    /** The screen is already covered (e.g. the check-in's dive wipe): start at the hold. */
    covered?: boolean
    onDone?: () => void
}

interface EclipseCtl {
    run: (r: EclipseRun) => void
    busy: () => boolean
}

const EclipseContext = React.createContext<EclipseCtl>({ run: (r) => r.apply(), busy: () => false })

/**
 * Full-screen curtain. Phases: cover (core grows from the origin with its corona at the edge) →
 * hold (title card / one breath) → reveal (the next scene emerges through an opening ring of light).
 */
function EclipseCurtain({ sceneRef, reduced, children, ctlRef }: { sceneRef: React.RefObject<HTMLDivElement>; reduced: boolean; children: React.ReactNode; ctlRef?: React.MutableRefObject<EclipseCtl | null> }) {
    const rootRef = React.useRef<HTMLDivElement>(null)
    const coreRef = React.useRef<HTMLDivElement>(null)
    const ringRef = React.useRef<HTMLDivElement>(null)
    const [caption, setCaption] = React.useState<EclipseRun["caption"] | null>(null)
    const [showCaption, setShowCaption] = React.useState(false)
    const [on, setOn] = React.useState(false)
    const [skippable, setSkippable] = React.useState(false)
    const job = React.useRef<{ run: EclipseRun; raf: number; timers: any[]; skip: (() => void) | null; applied: boolean } | null>(null)
    const reducedRef = useLatest(reduced)

    const cleanupScene = () => {
        const sc = sceneRef.current
        if (sc) {
            sc.style.clipPath = ""
            ;(sc.style as any).webkitClipPath = ""
            sc.style.zIndex = ""
            sc.style.transform = ""
            sc.style.opacity = ""
        }
    }

    const finish = React.useCallback(() => {
        const j = job.current
        if (!j) return
        cancelAnimationFrame(j.raf)
        j.timers.forEach(clearTimeout)
        job.current = null
        cleanupScene()
        if (coreRef.current) coreRef.current.style.opacity = "0"
        if (ringRef.current) ringRef.current.style.opacity = "0"
        setOn(false)
        setShowCaption(false)
        setSkippable(false)
        try {
            j.run.onDone && j.run.onDone()
        } catch (e) {}
    }, [])

    const run = React.useCallback((r: EclipseRun) => {
        // a transition already running: never start a second cinematic. If its scene swap has not happened
        // yet, the newest change replaces the pending one (double launches apply once); otherwise apply now.
        if (job.current) {
            const jr = job.current
            if (!jr.applied) {
                jr.run = { ...jr.run, apply: r.apply, caption: jr.run.caption || r.caption }
                return
            }
            try {
                r.apply()
            } catch (e) {}
            r.onDone && r.onDone()
            return
        }
        const root = rootRef.current
        const core = coreRef.current
        const ring = ringRef.current
        const scene = sceneRef.current
        if (!root || !core || !ring) {
            r.apply()
            r.onDone && r.onDone()
            return
        }
        const W = root.clientWidth || 390
        const H = root.clientHeight || 844
        const ox = r.origin ? r.origin.x : W / 2
        const oy = r.origin ? r.origin.y : H * 0.46
        // radius that covers the farthest corner from the origin
        const R = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) + 8
        const D = R * 2
        const place = (el: HTMLDivElement, d: number) => {
            el.style.width = el.style.height = `${d}px`
            el.style.left = `${ox - d / 2}px`
            el.style.top = `${oy - d / 2}px`
        }
        place(core, D)
        place(ring, D * 1.08)
        const j = { run: r, raf: 0, timers: [] as any[], skip: null as (() => void) | null, applied: false }
        job.current = j
        setOn(true)
        setCaption(r.caption || null)

        if (reducedRef.current) {
            // reduced motion: soft cross-fade through the core colour
            core.style.transform = "scale(1)"
            core.style.transition = "opacity .16s linear"
            ring.style.opacity = "0"
            core.style.opacity = "1"
            j.timers.push(
                setTimeout(() => {
                    j.applied = true
                    try {
                        j.run.apply()
                    } catch (e) {}
                    core.style.transition = "opacity .22s linear"
                    j.timers.push(setTimeout(() => (core.style.opacity = "0"), 40))
                    j.timers.push(setTimeout(finish, 300))
                }, 170)
            )
            return
        }

        core.style.transition = ""
        const startScale = 0.06
        const coverMs = r.long ? 620 : 430
        const holdMs = r.long ? (r.caption ? 1250 : 700) : r.caption ? 520 : 70
        const revealMs = r.long ? 760 : 540
        const t0 = performance.now() - (r.covered ? coverMs : 0)
        let phase: "cover" | "hold" | "reveal" = "cover"
        let applied = false
        let holdStart = 0
        let revealStart = 0

        const doApply = () => {
            if (applied) return
            applied = true
            j.applied = true
            try {
                j.run.apply()
            } catch (e) {
                if (typeof console !== "undefined") console.warn("[ThinkStill] transition apply", e)
            }
        }
        j.skip = () => {
            if (phase === "hold") holdStart = performance.now() - holdMs
        }

        const tick = (now: number) => {
            if (job.current !== j) return
            if (phase === "cover") {
                const t = clamp01((now - t0) / coverMs)
                const e = easeInOutCubic(t)
                const s = lerp(startScale, 1, e)
                core.style.opacity = "1"
                core.style.transform = `scale(${s})`
                ring.style.opacity = String(clamp01(1.4 - t * 0.6))
                ring.style.transform = `scale(${s})`
                if (scene) {
                    scene.style.transform = `scale(${1 - 0.05 * e})`
                    scene.style.opacity = String(1 - 0.35 * e)
                }
                if (t >= 1) {
                    phase = "hold"
                    holdStart = now
                    if (scene) {
                        scene.style.transform = ""
                        scene.style.opacity = ""
                    }
                    doApply()
                    if (j.run.caption) {
                        setCaption(j.run.caption)
                        setShowCaption(true)
                    }
                    if (r.long) setSkippable(true)
                }
            } else if (phase === "hold") {
                // one slow breath of the corona while the title shows
                const t = clamp01((now - holdStart) / holdMs)
                ring.style.opacity = String(0.35 + 0.35 * Math.sin(t * Math.PI))
                ring.style.transform = `scale(${0.985 + 0.03 * Math.sin(t * Math.PI)})`
                if (t >= 1) {
                    phase = "reveal"
                    revealStart = now
                    setShowCaption(false)
                    setSkippable(false)
                    if (scene) scene.style.zIndex = "85"
                }
            } else {
                const t = clamp01((now - revealStart) / revealMs)
                const e = easeOutCubic(t)
                const rr = lerp(0, R, e)
                if (scene) {
                    const cp = `circle(${rr.toFixed(1)}px at ${ox}px ${oy}px)`
                    scene.style.clipPath = cp
                    ;(scene.style as any).webkitClipPath = cp
                }
                // the ring of light rides the opening edge, then dissolves
                ring.style.transform = `scale(${Math.max(0.001, (rr * 2) / (D * 1.08) / 0.96)})`
                ring.style.opacity = String(1 - easeInOutCubic(clamp01((t - 0.35) / 0.65)))
                core.style.opacity = String(1 - clamp01((t - 0.75) / 0.25))
                if (t >= 1) {
                    finish()
                    return
                }
            }
            j.raf = requestAnimationFrame(tick)
        }
        j.raf = requestAnimationFrame(tick)
        // safety net: never leave the curtain up
        j.timers.push(
            setTimeout(() => {
                if (job.current === j) {
                    doApply()
                    finish()
                }
            }, coverMs + holdMs + revealMs + 1800)
        )
    }, [])

    React.useEffect(
        () => () => {
            const j = job.current
            if (j) {
                cancelAnimationFrame(j.raf)
                j.timers.forEach(clearTimeout)
            }
        },
        []
    )

    const ctl = React.useMemo<EclipseCtl>(() => ({ run, busy: () => !!job.current }), [run])
    if (ctlRef) ctlRef.current = ctl

    return (
        <EclipseContext.Provider value={ctl}>
            {children}
            <div
                ref={rootRef}
                className={cx("eclCurtain", on && "on")}
                onPointerDown={() => {
                    const j = job.current
                    if (j && j.skip) j.skip()
                }}
                aria-hidden={!on}
            >
                <div ref={coreRef} className="ecCore" style={{ opacity: 0 }} />
            </div>
            <div className="eclRingLayer" aria-hidden="true">
                <div ref={ringRef} className="ecRing" style={{ opacity: 0 }} />
                {caption ? (
                    <div className={cx("ecCaption", showCaption && "show")} style={{ transform: showCaption ? "translateY(-50%) scale(1)" : "translateY(-46%) scale(.96)" }}>
                        <div className="ecCapEcl">
                            <Eclipse size={58} breathSeconds={6} motes={false} />
                        </div>
                        {caption.eyebrow ? <small>{caption.eyebrow}</small> : null}
                        {caption.title ? <b>{caption.title}</b> : null}
                        {caption.line ? <em>{caption.line}</em> : null}
                    </div>
                ) : null}
                {skippable ? <div className="ecSkip">Tap to begin</div> : null}
            </div>
        </EclipseContext.Provider>
    )
}

function useEclipse() {
    return React.useContext(EclipseContext)
}
