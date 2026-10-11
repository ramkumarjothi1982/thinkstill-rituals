/* ================================================================== */
/* 22 · FLUSH — a porcelain basin under the moon                       */
/* ================================================================== */
// Desktop rules kept: 6 papers in sequence (one per word chunk), one deliberate trigger per paper, then a visible
// spiral of the exact words down, around, shrinking and fading into the drain (≈ 1.2 s), each paper fully gone,
// progress per paper in 4 sub-steps (.18 / .52 / .88 / 1), finish → bonus 320. Founder items done: the trigger is
// a real pull-chain (a short tug springs back; a tap also works), the water swirl has its own water sound, the
// words peel off as letters that circle the drain. Faces turn relieved as the water takes them.

const FLUSH_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="22"] .flRoom{position:absolute;inset:0;background:
  radial-gradient(55% 40% at 88% 4%, rgba(190,215,255,.30) 0%, transparent 70%),
  repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0 1.5px, transparent 1.5px 48px),
  repeating-linear-gradient(180deg, rgba(255,255,255,.045) 0 1.5px, transparent 1.5px 48px),
  linear-gradient(180deg,#0c1a2c 0%,#11283c 50%,#0c1d2e 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="22"] .flRoom{background:
  radial-gradient(55% 40% at 88% 4%, rgba(255,255,255,.85) 0%, transparent 70%),
  repeating-linear-gradient(90deg, rgba(60,110,140,.12) 0 1.5px, transparent 1.5px 48px),
  repeating-linear-gradient(180deg, rgba(60,110,140,.12) 0 1.5px, transparent 1.5px 48px),
  linear-gradient(180deg,#d6ecf2 0%,#c6e2ec 50%,#b4d4e2 100%)}
.tsm .tsmRitualLayer[data-rid="22"] .flCounter{position:absolute;left:0;right:0;pointer-events:none;
  background:radial-gradient(70% 60% at 30% 20%, rgba(255,255,255,.10), transparent 70%),linear-gradient(115deg, transparent 30%, rgba(255,255,255,.06) 31%, transparent 34%, transparent 62%, rgba(255,255,255,.05) 63%, transparent 66%),linear-gradient(180deg,#2b3a4c 0%,#223042 100%);
  box-shadow:0 -1px 0 rgba(255,255,255,.18), 0 14px 0 #142030, 0 22px 30px rgba(0,0,0,.45)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="22"] .flCounter{background:radial-gradient(70% 60% at 30% 20%, rgba(255,255,255,.7), transparent 70%),linear-gradient(115deg, transparent 30%, rgba(140,150,170,.18) 31%, transparent 34%, transparent 62%, rgba(140,150,170,.14) 63%, transparent 66%),linear-gradient(180deg,#f4f1ec 0%,#e4ded6 100%);
  box-shadow:0 -1px 0 rgba(255,255,255,.8), 0 14px 0 #c9c0b4, 0 22px 30px rgba(60,80,100,.25)}
.tsm .tsmRitualLayer[data-rid="22"] .flBasin{position:absolute;width:var(--D);height:var(--D);border-radius:50%;pointer-events:none;
  background:radial-gradient(circle at 50% 50%, transparent 0 58%, rgba(0,0,0,.22) 63%, transparent 66%),radial-gradient(circle at 38% 30%, #ffffff 0%, #eef2f6 40%, #c6cfda 78%, #9aa6b6 100%);
  box-shadow:0 22px 46px rgba(0,0,0,.5), inset 0 -8px 20px rgba(80,90,110,.35)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="22"] .flBasin{box-shadow:0 20px 40px rgba(40,80,110,.3), inset 0 -8px 20px rgba(80,90,110,.25)}
.tsm .tsmRitualLayer[data-rid="22"] .flBowl{position:absolute;inset:8%;border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 50%, #9fb2c6 0%, #d9e1ea 55%, #eef2f6 100%);box-shadow:inset 0 10px 26px rgba(40,50,70,.45)}
.tsm .tsmRitualLayer[data-rid="22"] .flWater{position:absolute;inset:0;border-radius:50%;
  background:radial-gradient(circle at 50% 50%, rgba(10,40,80,.85) 0 7%, rgba(30,110,170,.55) 22%, rgba(80,170,220,.35) 60%, rgba(150,210,240,.25) 100%)}
.tsm .tsmRitualLayer[data-rid="22"] .flSwirl{position:absolute;inset:-6%;border-radius:50%;opacity:.55;transition:opacity .5s ease;
  background:repeating-conic-gradient(from 0deg, rgba(255,255,255,.0) 0deg 14deg, rgba(220,245,255,.35) 18deg, rgba(255,255,255,0) 26deg 40deg);
  -webkit-mask-image:radial-gradient(circle, transparent 9%, #000 30%, #000 60%, transparent 72%);mask-image:radial-gradient(circle, transparent 9%, #000 30%, #000 60%, transparent 72%);
  animation:tsmSpin 22s linear infinite}
.tsm .tsmRitualLayer[data-rid="22"] .flBasin.go .flSwirl{opacity:1;animation:tsmSpin 1.1s linear infinite}
.tsm .tsmRitualLayer[data-rid="22"] .flBasin.vortex .flSwirl{opacity:1;animation:tsmSpin .7s linear infinite}
.tsm .tsmRitualLayer[data-rid="22"] .flBasin.calm .flSwirl{opacity:.25;animation:tsmSpin 30s linear infinite}
.tsm .tsmRitualLayer[data-rid="22"] .flSpiral2{position:absolute;inset:14%;border-radius:50%;opacity:0;transition:opacity .4s ease;
  background:conic-gradient(from 90deg, transparent 0deg, rgba(200,240,255,.5) 40deg, transparent 90deg, transparent 180deg, rgba(200,240,255,.45) 220deg, transparent 270deg);
  -webkit-mask-image:radial-gradient(circle, transparent 12%, #000 40%, transparent 70%);mask-image:radial-gradient(circle, transparent 12%, #000 40%, transparent 70%);animation:tsmSpin .9s linear infinite}
.tsm .tsmRitualLayer[data-rid="22"] .flBasin.go .flSpiral2,.tsm .tsmRitualLayer[data-rid="22"] .flBasin.vortex .flSpiral2{opacity:1}
.tsm .tsmRitualLayer[data-rid="22"] .flMoon{position:absolute;left:52%;top:18%;width:26%;height:16%;border-radius:50%;opacity:0;transition:opacity 1.4s ease;
  background:radial-gradient(closest-side, rgba(255,250,230,.9), rgba(255,240,200,.25) 60%, transparent)}
.tsm .tsmRitualLayer[data-rid="22"] .flBasin.calm .flMoon{opacity:1}
.tsm .tsmRitualLayer[data-rid="22"] .flDrain{position:absolute;left:50%;top:50%;width:18%;height:18%;margin:-9% 0 0 -9%;border-radius:50%;
  background:repeating-conic-gradient(from 0deg, #0b0f16 0deg 38deg, #a9b3c2 38deg 45deg),radial-gradient(circle, #05070b 0 58%, #8a96a8 60%, #e8edf3 74%, #7c8798 100%);
  -webkit-mask-image:radial-gradient(circle, #000 0 74%, #000 100%);box-shadow:0 0 0 2px rgba(255,255,255,.6), 0 2px 6px rgba(0,0,0,.4)}
.tsm .tsmRitualLayer[data-rid="22"] .flDrain::after{content:"";position:absolute;inset:-3px;border-radius:50%;background:radial-gradient(circle, transparent 0 56%, #dfe5ec 58%, #8e99aa 72%, transparent 76%)}
.tsm .tsmRitualLayer[data-rid="22"] .flTap{position:absolute;width:30px;height:40px;margin-left:-15px;border-radius:8px 8px 14px 14px;pointer-events:none;
  background:linear-gradient(90deg,#7d8796 0%,#f2f5f8 40%,#9aa4b2 70%,#5d6674 100%);box-shadow:0 6px 12px rgba(0,0,0,.35)}
.tsm .tsmRitualLayer[data-rid="22"] .flStream{position:absolute;width:8px;margin-left:-4px;border-radius:4px;pointer-events:none;opacity:0;transition:opacity .25s ease;transform-origin:50% 0;
  background:linear-gradient(180deg, rgba(200,235,255,.95), rgba(150,210,245,.5));animation:flStream .3s linear infinite}
.tsm .tsmRitualLayer[data-rid="22"] .flStream.on{opacity:.9}
@keyframes flStream{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.8)}}
.tsm .tsmRitualLayer[data-rid="22"] .flPaper{position:absolute;width:var(--pw);height:var(--ph);margin:calc(var(--ph)*-.5) 0 0 calc(var(--pw)*-.5);pointer-events:none;will-change:transform}
.tsm .tsmRitualLayer[data-rid="22"] .flIn{position:absolute;inset:0;animation:flIn .6s cubic-bezier(.2,.9,.3,1.1) both}
@keyframes flIn{0%{transform:translateY(-40px) scale(.7) rotate(-14deg);opacity:0}100%{transform:none;opacity:1}}
.tsm .tsmRitualLayer[data-rid="22"] .flBob{position:absolute;inset:0;animation:flBob 3.4s ease-in-out infinite}
@keyframes flBob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-4px) rotate(2deg)}}
.tsm .tsmRitualLayer[data-rid="22"] .flPaper.go .flBob{animation:none}
.tsm .tsmRitualLayer[data-rid="22"] .flCard{position:absolute;inset:0;border-radius:8px;overflow:hidden;
  background:linear-gradient(135deg, rgba(255,255,255,.65) 0%, rgba(255,255,255,0) 32%),linear-gradient(180deg,#fdfbf4 0%,#efeadc 100%);
  box-shadow:0 8px 18px rgba(0,30,60,.35), inset 0 0 0 1px rgba(255,255,255,.7)}
.tsm .tsmRitualLayer[data-rid="22"] .flPic{position:absolute;left:50%;border-radius:50%;overflow:hidden;transform:translateX(-50%);background:#fff;box-shadow:0 0 0 2px #fff, 0 2px 8px rgba(30,50,80,.25)}
.tsm .tsmRitualLayer[data-rid="22"] .flPic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="22"] .flPic img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="22"] .flPic img.fresh{animation:flFace .5s cubic-bezier(.3,1.6,.45,1) both}
@keyframes flFace{0%{transform:scale(.6) rotate(8deg);opacity:0}100%{transform:scale(1.14);opacity:1}}
.tsm .tsmRitualLayer[data-rid="22"] .flWords{position:absolute;left:10px;right:10px;display:flex;align-items:center;justify-content:center;text-align:center;color:#1f3550;font-weight:600;line-height:1.18;letter-spacing:-.01em;overflow:hidden;word-break:break-word}
.tsm .tsmRitualLayer[data-rid="22"] .flChain{position:absolute;top:0;width:6px;margin-left:-3px;transform-origin:50% 0;pointer-events:none;
  background:repeating-linear-gradient(180deg, #e6ebf1 0 5px, #8994a4 5px 7px, transparent 7px 9px);box-shadow:0 0 0 .5px rgba(0,0,0,.25)}
.tsm .tsmRitualLayer[data-rid="22"] .flHandle{position:absolute;width:var(--hw);height:var(--hh);margin-left:calc(var(--hw)*-.5);pointer-events:none}
.tsm .tsmRitualLayer[data-rid="22"] .flHandle i{position:absolute;left:0;right:0;top:12%;bottom:0;border-radius:45% 45% 50% 50%/30% 30% 70% 70%;
  background:radial-gradient(circle at 36% 28%, #ffffff 0%, #eef1f5 30%, #b9c3d0 80%, #8d98a8 100%);box-shadow:0 8px 18px rgba(0,0,0,.4), inset 0 -6px 12px rgba(60,70,90,.3)}
.tsm .tsmRitualLayer[data-rid="22"] .flHandle b{position:absolute;left:50%;top:0;width:16px;height:18%;margin-left:-8px;border-radius:4px;background:linear-gradient(90deg,#7d8796,#f2f5f8,#5d6674)}
.tsm .tsmRitualLayer[data-rid="22"] .flHandle.cue{animation:flCue 2.4s ease-in-out infinite}
@keyframes flCue{0%,70%,100%{transform:translateY(0)}80%{transform:translateY(10px)}90%{transform:translateY(-2px)}}
.tsm .tsmRitualLayer[data-rid="22"] .flPullHit{position:absolute;touch-action:none;cursor:grab;border-radius:24px}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="22"] .flSwirl,.tsm .tsmRitualLayer[data-rid="22"] .flSpiral2,.tsm .tsmRitualLayer[data-rid="22"] .flBob,.tsm .tsmRitualLayer[data-rid="22"] .flHandle.cue{animation:none}}
`

function RitualFlush({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const timers = useTimers()
    const [idx, setIdx] = React.useState(0)
    const [going, setGoing] = React.useState(false)
    const [relieved, setRelieved] = React.useState(false)
    const [gone, setGone] = React.useState(false)
    const [mode, setMode] = React.useState<"play" | "vortex" | "calm">("play")
    const [cue, setCue] = React.useState(true)
    const st = React.useRef({ idx: 0, busy: false, t0: 0, emitted: 0 })
    const paperRef = React.useRef<HTMLDivElement>(null)
    const handleRef = React.useRef<HTMLDivElement>(null)
    const chainRef = React.useRef<HTMLDivElement>(null)
    const calm = ctx.reduced

    // layout: the basin fills the stage; the pull-chain hangs on the right into the thumb zone
    const PILL = 92
    const avail = h - PILL
    const chX = w - 40
    const D = Math.round(Math.min(chX - 60, w - 100, avail * 0.6, 330))
    const bx = Math.round(Math.max(D / 2 + 12, (chX - 34) / 2 + 4))
    const cy = Math.round(Math.max(D / 2 + 40, avail * 0.45))
    const PW = Math.round(D * 0.5)
    const PH = Math.round(PW * 0.86)
    const rest = { x: 0, y: -D * 0.15 }
    const HW = 54
    const HH = 76
    const hy = Math.round(Math.max(cy + D * 0.2, avail - HH - 22))
    const geo = useLatest({ cx: bx, cy, D, rest })

    React.useEffect(() => {
        ctx.hint("Pull the chain to flush")
        for (let i = 0; i < N; i++) preloadImage(ctx.pic(i, true))
    }, [])

    const setPaper = (x: number, y: number, rot: number, s: number, o: number) => {
        const el = paperRef.current
        if (!el) return
        el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) scale(${s.toFixed(3)})`
        el.style.opacity = String(o)
    }

    // the spiral: down, around, shrinking and fading into the drain
    const T = calm ? 0.8 : 1.22
    useFrame(() => {
        const s = st.current
        const u = clamp01((performance.now() - s.t0) / 1000 / T)
        const G = geo.current
        const r0 = Math.abs(G.rest.y)
        const turns = 2.4
        const th = -Math.PI / 2 + Math.pow(u, 1.25) * turns * Math.PI * 2
        const r = r0 * (1 + 0.32 * Math.sin(Math.min(1, u * 2.2) * Math.PI)) * (1 - Math.pow(u, 1.5))
        const sc = Math.max(0.015, 1 - 0.985 * Math.pow(u, 1.6))
        const o = u < 0.8 ? 1 : Math.max(0, 1 - (u - 0.8) / 0.2)
        const x = Math.cos(th) * r
        const y = Math.sin(th) * r
        setPaper(x, y, ((th + Math.PI / 2) * 180) / Math.PI * 0.9, sc, o)
        // the words peel away as letters that circle the drain
        const letters = Array.from(ctx.words[s.idx] || "").filter((c) => c.trim())
        const want = Math.floor(clamp01((u - 0.22) / 0.5) * Math.min(16, letters.length))
        while (s.emitted < want) {
            const c = letters[s.emitted]
            s.emitted += 1
            ctx.fx.add({ x: G.cx + x + (Math.random() - 0.5) * PW * sc, y: G.cy + y + (Math.random() - 0.5) * PH * sc * 0.5, vx: -Math.sin(th) * 120, vy: Math.cos(th) * 120, drag: 0.97, max: 1.1, size: 15, rot: Math.random() * 6, vr: 4, shape: "text", text: c, color: "rgba(16,52,92,1)", add: false, swirl: { cx: G.cx, cy: G.cy, k: 2.4, pull: 1.6 } })
        }
    }, going)

    const flush = () => {
        const s = st.current
        if (s.busy || mode !== "play") return false
        s.busy = true
        s.emitted = 0
        s.t0 = performance.now()
        setCue(false)
        setGoing(true)
        setRelieved(true)
        const i = s.idx
        const k = calm ? T / 1.22 : 1
        ctx.hint(i === N - 1 ? "There it goes…" : "Down the drain…")
        ctx.sfx("soft")
        ctx.rain(1.4)
        ctx.haptic(10)
        ctx.progress((i + 0.18) / N)
        ctx.fx.burst(bx, cy, { count: 2, shape: "ring", size: [D * 0.1, D * 0.1], grow: D * 0.5, life: [0.8, 0.8], speed: [0, 0], colors: ["rgba(220,245,255,.6)"], add: true })
        timers.after(360 * k, () => ctx.progress((i + 0.52) / N))
        timers.after(860 * k, () => {
            ctx.progress((i + 0.88) / N)
            ctx.sfx("pop")
            ctx.haptic(16)
        })
        timers.after(1220 * k, () => {
            ctx.progress((i + 1) / N)
            ctx.sfx("plink")
            ctx.haptic(24)
            setGoing(false)
            setGone(true)
            ctx.fx.burst(bx, cy, { count: 10, shape: "glow", size: [3, 7], speed: [20, 70], life: [0.5, 0.9], colors: ["rgba(200,240,255,1)"] })
        })
        timers.after(1220 * k + 260, () => {
            const nd = i + 1
            if (nd >= N) return finale()
            s.idx = nd
            setIdx(nd)
            setRelieved(false)
            setGone(false)
            setPaper(rest.x, rest.y, 0, 1, 1)
            s.busy = false
            ctx.hint(nd === N - 1 ? "Last one — pull the chain" : "Pull the chain again")
        })
        return true
    }

    const finale = () => {
        setMode("vortex")
        ctx.hint("")
        ctx.rain(1.8)
        ctx.haptic([14, 40, 20])
        // the whole basin becomes a vortex of light that drains away
        const G = geo.current
        for (let k = 0; k < (calm ? 14 : 44); k++) {
            const a = Math.random() * Math.PI * 2
            const r = G.D * (0.3 + Math.random() * 0.12)
            ctx.fx.add({ x: G.cx + Math.cos(a) * r, y: G.cy + Math.sin(a) * r, vx: -Math.sin(a) * 160, vy: Math.cos(a) * 160, drag: 0.98, max: 1.1 + Math.random() * 0.4, size: 3 + Math.random() * 4, shape: "glow", color: Math.random() < 0.5 ? "rgba(170,230,255,1)" : "rgba(255,255,255,1)", swirl: { cx: G.cx, cy: G.cy, k: 3, pull: 2.2 } })
        }
        timers.after(300, () => ctx.sfx("hum"))
        timers.after(1150, () => {
            setMode("calm")
            ctx.sfx("chime")
            for (let k = 0; k < 3; k++) timers.after(k * 260, () => ctx.fx.burst(G.cx, G.cy, { count: 1, shape: "ring", size: [G.D * 0.08, G.D * 0.08], grow: G.D * 0.42, life: [1.3, 1.3], speed: [0, 0], colors: ["rgba(230,248,255,.7)"], add: true }))
        })
        timers.after(calm ? 1700 : 2300, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(320)
        })
    }

    // the pull-chain: resists, stretches, springs back; a full pull (or a tap) flushes
    const setPull = (y: number, spring: boolean) => {
        const hd = handleRef.current
        const ch = chainRef.current
        const tr = spring ? "transform .55s cubic-bezier(.3,1.6,.5,1)" : "none"
        if (hd) {
            hd.style.transition = tr
            hd.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`
        }
        if (ch) {
            ch.style.transition = tr
            ch.style.transform = `scaleY(${((hy + y) / hy).toFixed(4)})`
        }
    }
    const PULL = 44
    const pullBind = useDrag({
        onStart: () => {
            setCue(false)
            ctx.haptic(6)
            ctx.sfx("tap")
        },
        onMove: (d) => {
            const dy = d.dy
            const y = dy > 0 ? (dy < 70 ? dy : 70 + (dy - 70) * 0.25) : dy * 0.12
            setPull(y, false)
        },
        onEnd: (d) => {
            setPull(0, true)
            if (d.dy >= PULL) {
                ctx.sfx("clack")
                if (!flush()) ctx.sfx("soft")
            } else if (Math.abs(d.dy) > 10) {
                ctx.sfx("soft")
                if (!st.current.busy) ctx.hint("Pull it all the way down")
            }
        },
        onTap: () => {
            setPull(18, false)
            timers.after(90, () => setPull(0, true))
            ctx.sfx("clack")
            flush()
        },
    })

    const word = ctx.words[idx] || ""
    const hasWords = !!word.trim()
    const pic = Math.round(hasWords ? PH * 0.5 : PH * 0.74)
    const pTop = Math.round(PH * (hasWords ? 0.08 : 0.13))
    const wTop = pTop + pic + 4
    const boxH = PH - wTop - 6
    const fpx = fitThoughtPx(word, PW - 20, boxH, 20, 12.5, 1.18)
    const src = ctx.pic(idx, relieved)
    return (
        <>
            <div className="flRoom" />
            <i className="flCounter" style={{ top: cy - D / 2 - 34, height: D + 68 }} />
            <i className="flTap" style={{ left: bx, top: cy - D / 2 - 24 }} />
            <div className={cx("flBasin", going && "go", mode === "vortex" && "vortex", mode === "calm" && "calm")} style={{ left: bx - D / 2, top: cy - D / 2, ["--D" as any]: `${D}px` }}>
                <div className="flBowl">
                    <i className="flWater" />
                    <i className="flSwirl" />
                    <i className="flSpiral2" />
                    <i className="flMoon" />
                    <i className="flDrain" />
                </div>
            </div>
            <i className={cx("flStream", (going || mode === "vortex") && "on")} style={{ left: bx, top: cy - D / 2 + 12, height: D * 0.2 }} />
            {mode === "play" && !gone ? (
                <div
                    key={idx}
                    ref={paperRef}
                    className={cx("flPaper", going && "go")}
                    style={{ left: bx, top: cy, ["--pw" as any]: `${PW}px`, ["--ph" as any]: `${PH}px`, transform: `translate3d(${rest.x}px,${rest.y.toFixed(1)}px,0)` }}
                >
                    <div className="flIn">
                        <div className="flBob">
                            <div className="flCard">
                                {src ? (
                                    <span className="flPic" style={{ width: pic, height: pic, top: pTop }}>
                                        <img key={src} className={cx(ctx.uploaded && "up", relieved && "fresh")} src={src} alt="" draggable={false} />
                                    </span>
                                ) : null}
                                {hasWords ? (
                                    <span className="flWords" style={{ top: wTop, height: boxH, fontSize: fpx }}>
                                        {thoughtLine(word, 80)}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
            <div ref={chainRef} className="flChain" style={{ left: chX, height: hy + 4 }} />
            <div ref={handleRef} className={cx("flHandle", cue && "cue")} style={{ left: chX, top: hy, ["--hw" as any]: `${HW}px`, ["--hh" as any]: `${HH}px` }}>
                <b />
                <i />
            </div>
            <div
                className="flPullHit"
                style={{ left: chX - 44, top: hy - 40, width: 88, height: HH + 60 }}
                {...pullBind}
                role="button"
                aria-label={`Pull the chain to flush: ${word || "your picture"}`}
            />
        </>
    )
}

tsmRitual({ id: 22, hint: "Pull the chain to flush", css: FLUSH_CSS, Comp: RitualFlush })
