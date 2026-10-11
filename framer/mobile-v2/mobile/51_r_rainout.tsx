/* ================================================================== */
/* 110 · RAIN OUT — a dusk sky over a quiet town                       */
/* ================================================================== */
// Desktop rules kept (v19): 6 word-clouds visible together; one downward pull per cloud (> 70 px commits,
// a short pull springs back, any order); progress n/6; a pulled cloud is gone for good; the final pull
// releases the full-screen rain (rain sound with it) while the letters wash down and dissolve, then a
// permanent CLEAR SKY · YOU MADE SPACE; completion bonus 420. Fixed: no clipping/overlap at phone width,
// letters fall out of the clouds themselves, faces turn relieved as each cloud empties, no dark pills.

const RAIN_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="110"] .rnSky{position:absolute;inset:0;transition:opacity 1.6s ease;
  background:radial-gradient(90% 50% at 50% 0%, rgba(120,130,170,.35), transparent 60%),linear-gradient(180deg,#1b2238 0%,#2b3150 40%,#3d3a5c 70%,#2a2a40 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="110"] .rnSky{background:radial-gradient(90% 50% at 50% 0%, rgba(255,255,255,.5), transparent 60%),linear-gradient(180deg,#8d96b3 0%,#a7aac4 45%,#c2bccf 75%,#b8b3c6 100%)}
.tsm .tsmRitualLayer[data-rid="110"] .rnClear{position:absolute;inset:0;opacity:0;transition:opacity 1.8s ease;
  background:radial-gradient(70% 40% at 50% 22%, rgba(255,246,220,.9) 0%, rgba(255,226,170,.35) 30%, transparent 62%),linear-gradient(180deg,#2f7fc8 0%,#58aee6 45%,#a6dcf5 80%,#d9f1fb 100%)}
.tsm .tsmRitualLayer[data-rid="110"].isClear .rnClear{opacity:1}
.tsm .tsmRitualLayer[data-rid="110"] .rnTown{position:absolute;left:-10%;right:-10%;bottom:0;height:13%;pointer-events:none;
  background:radial-gradient(55% 100% at 22% 100%, rgba(22,24,44,.92) 60%, transparent 61%),radial-gradient(48% 110% at 72% 100%, rgba(28,28,50,.9) 60%, transparent 61%),radial-gradient(40% 70% at 48% 100%, rgba(34,34,58,.85) 60%, transparent 61%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="110"] .rnTown{background:radial-gradient(55% 100% at 22% 100%, rgba(120,114,150,.75) 60%, transparent 61%),radial-gradient(48% 110% at 72% 100%, rgba(132,124,160,.7) 60%, transparent 61%),radial-gradient(40% 70% at 48% 100%, rgba(144,136,172,.65) 60%, transparent 61%)}
.tsm .tsmRitualLayer[data-rid="110"].isClear .rnTown{filter:saturate(1.4) brightness(1.5);transition:filter 1.8s}
.tsm .tsmRitualLayer[data-rid="110"] .rnPuddle{position:absolute;bottom:4%;height:10px;border-radius:50%;background:radial-gradient(closest-side, rgba(170,200,255,.28), transparent);pointer-events:none}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud{position:absolute;width:var(--cw);height:var(--ch);margin:calc(var(--ch)*-.5) 0 0 calc(var(--cw)*-.5);touch-action:none;cursor:grab;will-change:transform;
  transform-origin:50% 0%;animation:rnIdle var(--ib,6s) ease-in-out infinite;animation-delay:var(--id,0s)}
@keyframes rnIdle{0%,100%{translate:0 0}50%{translate:var(--ix,4px) -4px}}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud.drag{animation:none;cursor:grabbing}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud .rnBody{position:absolute;inset:0;transition:transform .5s cubic-bezier(.3,1.6,.5,1)}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud .rnBody i{position:absolute;border-radius:50%;
  background:radial-gradient(circle at 40% 30%, #f3f5ff 0%, #c9cfe6 45%, #8f97b8 100%);box-shadow:inset 0 -10px 18px rgba(60,66,100,.35), 0 10px 24px rgba(10,12,30,.35)}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud .rnBody i:nth-child(1){left:6%;top:34%;width:38%;height:50%}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud .rnBody i:nth-child(2){left:24%;top:6%;width:52%;height:66%}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud .rnBody i:nth-child(3){left:56%;top:26%;width:38%;height:54%}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud .rnBody i:nth-child(4){left:14%;top:46%;width:72%;height:44%;border-radius:40px}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud.heavy .rnBody i{background:radial-gradient(circle at 40% 30%, #c7cbe0 0%, #8e94b4 50%, #5b6186 100%)}
.tsm .tsmRitualLayer[data-rid="110"] .rnFace{position:absolute;left:50%;top:6%;width:var(--fd);height:var(--fd);margin-left:calc(var(--fd)*-.5);border-radius:50%;overflow:hidden;
  box-shadow:0 0 0 2px rgba(255,255,255,.85), 0 4px 12px rgba(30,30,60,.35);background:#fff}
.tsm .tsmRitualLayer[data-rid="110"] .rnFace img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14);transition:opacity .4s}
.tsm .tsmRitualLayer[data-rid="110"] .rnFace img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="110"] .rnWords{position:absolute;left:12%;right:12%;top:calc(6% + var(--fd) + 6px);text-align:center;font-size:var(--fs);line-height:1.15;font-weight:500;color:#23264a;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.tsm .tsmRitualLayer[data-rid="110"] .rnCloud.gone{transition:opacity .9s ease, transform .9s cubic-bezier(.4,0,.6,1);opacity:0!important;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="110"] .rnPullCue{position:absolute;left:50%;bottom:-18px;width:2px;height:16px;margin-left:-1px;border-radius:2px;background:linear-gradient(180deg,rgba(255,255,255,.7),transparent);animation:rnCue 1.6s ease-in-out infinite}
@keyframes rnCue{0%{transform:translateY(-4px);opacity:0}40%{opacity:1}100%{transform:translateY(8px);opacity:0}}
.tsm .tsmRitualLayer[data-rid="110"] .rnStorm{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .5s ease;background:linear-gradient(180deg,rgba(14,18,34,.55),rgba(10,12,26,.7))}
.tsm .tsmRitualLayer[data-rid="110"].isStorm .rnStorm{opacity:1}
.tsm .tsmRitualLayer[data-rid="110"] .rnClearCopy{position:absolute;left:0;right:0;top:34%;text-align:center;color:#0b3c66;opacity:0;transform:translateY(10px);transition:opacity 1.2s ease .6s, transform 1.2s ease .6s;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="110"].isClear .rnClearCopy{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="110"] .rnClearCopy b{display:block;font-size:30px;font-weight:700;letter-spacing:.16em}
.tsm .tsmRitualLayer[data-rid="110"] .rnClearCopy span{display:block;margin-top:8px;font-size:15px;font-weight:600;letter-spacing:.12em;opacity:.8}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="110"] .rnCloud,.tsm .tsmRitualLayer[data-rid="110"] .rnPullCue{animation:none}}
`

function RitualRainOut({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [gone, setGone] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [relieved, setRelieved] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [dragging, setDragging] = React.useState(-1)
    const [phase, setPhase] = React.useState<"play" | "storm" | "clear">("play")
    const goneRef = useLatest(gone)
    const timers = useTimers()
    const cloudRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const layerRef = React.useRef<HTMLDivElement>(null)

    // layout: 2 columns × 3 rows of large clouds, all fully on screen, with pull room under each row
    const TOP = 6
    const areaH = Math.max(300, h - 84 - TOP - h * 0.12)
    const cw = Math.floor(Math.min(176, (w - 3 * 18) / 2))
    const ch = Math.floor(cw * 0.8)
    const rowH = areaH / 3
    const pos = Array.from({ length: N }, (_, i) => ({ x: w * (i % 2 ? 0.73 : 0.27), y: TOP + rowH * (Math.floor(i / 2) + 0.42) + (i % 2 ? rowH * 0.12 : 0) }))
    const fd = Math.round(cw * 0.34)
    const fs = cw >= 160 ? 15 : 14

    const THRESH = 70
    const MAXPULL = 96
    const setPull = (i: number, dy: number) => {
        const el = cloudRefs.current[i]
        if (!el) return
        const k = clamp01(dy / MAXPULL)
        // the cloud resists, stretches downward and sags as it fills with rain
        el.style.transform = `translate3d(0,${dy}px,0) scale(${1 - 0.06 * k},${1 + 0.16 * k})`
    }

    const dragOpts = (i: number): DragOpts => ({
            onStart: () => {
                if (goneRef.current[i] || phase !== "play") return false
                setDragging(i)
                ctx.haptic(8)
            },
            onMove: (d) => {
                const raw = Math.max(0, d.dy)
                const dy = raw <= MAXPULL ? raw : MAXPULL + (raw - MAXPULL) * 0.25
                setPull(i, dy)
                // the cloud starts to rain under the finger
                if (raw > 18 && Math.random() < 0.35 + raw / 300) {
                    const p = pos[i]
                    ctx.fx.add({ x: p.x + (Math.random() - 0.5) * cw * 0.6, y: p.y + ch * 0.4 + dy, vx: (Math.random() - 0.5) * 20, vy: 420 + Math.random() * 200, ay: 600, max: 0.9, size: 2.2, shape: "drop", color: "rgba(190,215,255,.85)", add: false })
                }
            },
            onEnd: (d) => {
                setDragging(-1)
                const el = cloudRefs.current[i]
                if (d.dy > THRESH && !goneRef.current[i]) {
                    wringOut(i, Math.min(MAXPULL, d.dy))
                } else if (el) {
                    el.style.transition = "transform .55s cubic-bezier(.3,1.6,.5,1)"
                    el.style.transform = ""
                    timers.after(560, () => el && (el.style.transition = ""))
                    ctx.sfx("soft")
                }
            },
        })
    // six fixed hooks, called unconditionally (the cloud count never changes)
    const binds = [useDrag(dragOpts(0)), useDrag(dragOpts(1)), useDrag(dragOpts(2)), useDrag(dragOpts(3)), useDrag(dragOpts(4)), useDrag(dragOpts(5))]

    const wringOut = (i: number, dy: number) => {
        const p = pos[i]
        ctx.sfx("tap")
        ctx.haptic(10)
        setRelieved((r) => r.map((v, j) => (j === i ? true : v)))
        // a short downpour from this cloud; its words fall as letters and dissolve on the ground
        const ground = h * 0.9
        for (let k = 0; k < 26; k++) ctx.fx.add({ x: p.x + (Math.random() - 0.5) * cw * 0.7, y: p.y + ch * 0.35 + dy, vx: (Math.random() - 0.5) * 30, vy: 500 + Math.random() * 300, ay: 700, max: Math.max(0.4, (ground - p.y) / 900), size: 2.4, shape: "drop", color: "rgba(200,222,255,.9)", add: false })
        const letters = Array.from(ctx.words[i] || "").filter((c) => c !== " ")
        letters.slice(0, 18).forEach((c, k) => {
            const x0 = p.x - (letters.length * 4) + k * 8
            ctx.fx.add({ x: x0, y: p.y + ch * 0.45 + dy, vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 60, ay: 520, drag: 0.99, max: Math.max(0.7, Math.sqrt((2 * (ground - p.y)) / 520) * 1.05), size: 15, rot: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 3, shape: "text", text: c, color: ctx.theme === "bright" ? "rgba(40,40,80,1)" : "rgba(235,240,255,1)", add: false })
        })
        timers.after(380, () => {
            const el = cloudRefs.current[i]
            if (el) {
                el.style.transition = "transform .9s cubic-bezier(.4,0,.6,1), opacity .9s ease"
                // emptied: it lifts, lightens and dissolves in place (never across its neighbours)
                el.style.transform = `translate3d(0,-26px,0) scale(.82)`
            }
            const next = goneRef.current.map((v, j) => (j === i ? true : v))
            setGone(next)
            const n = next.filter(Boolean).length
            ctx.progress(n / N)
            for (let k = 0; k < 3; k++) ctx.fx.add({ x: p.x + (Math.random() - 0.5) * 40, y: ground + Math.random() * 10, size: 4, grow: 60, max: 1.1, shape: "ring", color: "rgba(190,215,255,.5)", add: true })
            if (n === N) finale()
            else ctx.hint(n === N - 1 ? "Last cloud — pull it down" : `${N - n} clouds left · pull them down`)
        })
    }

    const finale = () => {
        ctx.hint("")
        ctx.sfx("soft")
        ctx.haptic(24)
        timers.after(650, () => {
            setPhase("storm")
            ctx.rain(3.15)
            ctx.haptic(18)
            // the whole sky rains it out
            let t = 0
            const id = timers.every(40, () => {
                t += 40
                const rate = t < 1500 ? 9 : Math.max(0, 9 - (t - 1500) / 60)
                for (let k = 0; k < rate; k++) ctx.fx.add({ x: Math.random() * w * 1.1 - w * 0.05, y: -10, vx: -60, vy: 900 + Math.random() * 300, ay: 0, max: (h + 20) / 1000, size: 2.2, shape: "streak", color: "rgba(190,215,255,.8)", add: false })
                if (t > 2100) timers.clear(id)
            })
        })
        timers.after(2450, () => {
            setPhase("clear")
            ctx.sfx("chime")
            for (let k = 0; k < 12; k++) timers.after(k * 120, () => ctx.fx.add({ x: w * (0.15 + Math.random() * 0.7), y: h * (0.12 + Math.random() * 0.25), size: 3 + Math.random() * 3, max: 1.6, shape: "glow", color: "rgba(255,240,200,1)" }))
        })
        timers.after(4700, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(420)
        })
    }

    React.useEffect(() => {
        // tag the layer for the storm / clear-sky looks
        const layer = layerRef.current && (layerRef.current.closest(".tsmRitualLayer") as HTMLElement | null)
        if (layer) {
            layer.classList.toggle("isStorm", phase === "storm")
            layer.classList.toggle("isClear", phase === "clear")
        }
    }, [phase])

    return (
        <div ref={layerRef} style={{ position: "absolute", inset: 0 }}>
            <div className="rnSky" style={{ opacity: phase === "clear" ? 0 : 1 }} />
            <div className="rnClear" />
            <div className="rnStorm" />
            <div className="rnTown" />
            <i className="rnPuddle" style={{ left: "18%", width: "24%" }} />
            <i className="rnPuddle" style={{ left: "60%", width: "30%" }} />
            {phase !== "clear"
                ? pos.map((p, i) => (
                      <RainCloud
                          key={i}
                          i={i}
                          p={p}
                          cw={cw}
                          ch={ch}
                          fd={fd}
                          fs={fs}
                          ctx={ctx}
                          gone={gone[i] || phase === "storm"}
                          relieved={relieved[i]}
                          dragging={dragging === i}
                          bind={binds[i]}
                          setRef={(el) => (cloudRefs.current[i] = el)}
                      />
                  ))
                : null}
            <div className="rnClearCopy" aria-live="polite">
                <b>CLEAR SKY</b>
                <span>YOU MADE SPACE</span>
            </div>
        </div>
    )
}

function RainCloud(p: { i: number; p: { x: number; y: number }; cw: number; ch: number; fd: number; fs: number; ctx: RitualCtx; gone: boolean; relieved: boolean; dragging: boolean; bind: any; setRef: (el: HTMLDivElement | null) => void }) {
    const { ctx, i } = p
    const src = ctx.pic(i, p.relieved)
    const word = ctx.words[i]
    return (
        <div
            ref={p.setRef}
            className={cx("rnCloud", !p.relieved && "heavy", p.dragging && "drag", p.gone && "gone")}
            style={{ left: p.p.x, top: p.p.y, ["--cw" as any]: `${p.cw}px`, ["--ch" as any]: `${p.ch}px`, ["--fd" as any]: `${p.fd}px`, ["--fs" as any]: `${p.fs}px`, ["--ib" as any]: `${5 + (i % 3)}s`, ["--id" as any]: `${-i * 0.7}s`, ["--ix" as any]: `${i % 2 ? -4 : 4}px` }}
            {...p.bind}
            role="button"
            aria-label={`Pull down: ${word || "your picture"}`}
        >
            <div className="rnBody">
                <i />
                <i />
                <i />
                <i />
            </div>
            {src ? (
                <span className="rnFace">
                    <img className={ctx.uploaded ? "up" : undefined} src={src} alt="" draggable={false} />
                </span>
            ) : null}
            {word ? <span className="rnWords">{word}</span> : null}
            {!p.gone && !p.dragging ? <i className="rnPullCue" aria-hidden="true" /> : null}
        </div>
    )
}

tsmRitual({ id: 110, hint: "Pull each cloud down to rain it out", css: RAIN_CSS, Comp: RitualRainOut })
