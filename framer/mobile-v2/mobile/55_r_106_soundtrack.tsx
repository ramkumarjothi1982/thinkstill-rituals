/* ================================================================== */
/* 106 · TINY SOUNDTRACK — a music-box stage of singing faces          */
/* ================================================================== */
// Desktop rules kept: up to 6 thoughts, each bound to its own real note (C D E F G A, the desktop WebAudio
// "tskey" synth); 3 plays quiet a thought; any order; two vibes (CLEAN / SILLY) change the timbre and can be
// switched at any time; progress = plays / 18 after every play; completion when all are quiet; bonus 400.
// Mobile: the characters ARE the keys (one face per key, no duplicate cards + key row), each sits on its own
// glockenspiel bar; every play squashes the face, sends its note up and turns the thought a little quieter
// (smaller); the 3rd play makes it sing: the words dissolve into notes and the face turns happy.
// Fixed: the keys work before a vibe is picked (CLEAN is preselected), no double faces, a quieted thought gets
// a happy face, and the finale replays the six notes as a little melody with every face happy.

const TS_NOTES = ["C", "D", "E", "F", "G", "A"]
const TS_NOTE_HUE = [350, 28, 48, 140, 196, 262]

const TS_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="106"] .tsWorld{position:absolute;inset:0;transition:opacity .8s ease;background:
  radial-gradient(80% 45% at 50% 100%, rgba(255,190,120,.22), transparent 70%),
  radial-gradient(60% 40% at 50% 0%, rgba(120,170,255,.22), transparent 70%),
  linear-gradient(180deg,#0b1430 0%,#13234a 46%,#1d2550 76%,#151a38 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="106"] .tsWorld{background:
  radial-gradient(80% 45% at 50% 100%, rgba(255,214,160,.7), transparent 70%),
  radial-gradient(60% 40% at 50% 0%, rgba(255,255,255,.8), transparent 70%),
  linear-gradient(180deg,#d8e6ff 0%,#cddcfb 46%,#e0dcf6 76%,#efe2ef 100%)}
.tsm .tsmRitualLayer[data-rid="106"] .tsSilly{position:absolute;inset:0;opacity:0;transition:opacity .8s ease;background:
  radial-gradient(circle, rgba(255,255,255,.18) 0 3px, transparent 3.5px) 0 0/34px 34px,
  radial-gradient(70% 40% at 20% 10%, rgba(255,230,90,.5), transparent 70%),
  linear-gradient(180deg,#5a1f6e 0%,#a4317a 48%,#ff7a8c 82%,#ffb36b 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="106"] .tsSilly{background:
  radial-gradient(circle, rgba(255,255,255,.55) 0 3px, transparent 3.5px) 0 0/34px 34px,
  radial-gradient(70% 40% at 20% 10%, rgba(255,250,170,.8), transparent 70%),
  linear-gradient(180deg,#ffd6f0 0%,#ffc2dc 48%,#ffd2b0 82%,#ffe7a6 100%)}
.tsm .tsmRitualLayer[data-rid="106"].isSilly .tsSilly{opacity:1}
.tsm .tsmRitualLayer[data-rid="106"] .tsStaff{position:absolute;left:-5%;right:-5%;height:64px;pointer-events:none;opacity:.5;
  background:repeating-linear-gradient(180deg, rgba(200,220,255,.35) 0 1.5px, transparent 1.5px 14px);transform:rotate(-4deg);animation:tsStaff 9s ease-in-out infinite alternate}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="106"] .tsStaff{background:repeating-linear-gradient(180deg, rgba(90,90,160,.25) 0 1.5px, transparent 1.5px 14px)}
@keyframes tsStaff{0%{transform:rotate(-4deg) translateX(-2%)}100%{transform:rotate(-1deg) translateX(2%)}}
.tsm .tsmRitualLayer[data-rid="106"] .tsKey{position:absolute;width:var(--d);height:calc(var(--d) + 26px);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);touch-action:none;cursor:pointer}
.tsm .tsmRitualLayer[data-rid="106"] .tsBar{position:absolute;left:50%;top:calc(var(--d) + 6px);width:var(--bw);height:16px;margin-left:calc(var(--bw)*-.5);border-radius:8px;
  background:linear-gradient(180deg, hsla(var(--nh),95%,82%,1) 0%, hsla(var(--nh),85%,60%,1) 55%, hsla(var(--nh),70%,40%,1) 100%);box-shadow:0 6px 14px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.7);transition:transform .12s cubic-bezier(.3,1.6,.5,1)}
.tsm .tsmRitualLayer[data-rid="106"] .tsBar::before,.tsm .tsmRitualLayer[data-rid="106"] .tsBar::after{content:"";position:absolute;top:5px;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.75)}
.tsm .tsmRitualLayer[data-rid="106"] .tsBar::before{left:12%}
.tsm .tsmRitualLayer[data-rid="106"] .tsBar::after{right:12%}
.tsm .tsmRitualLayer[data-rid="106"] .tsVol{position:absolute;left:0;top:0;width:var(--d);height:var(--d);transform-origin:50% 100%;transition:transform .45s cubic-bezier(.3,1.5,.5,1)}
.tsm .tsmRitualLayer[data-rid="106"] .tsSquash{position:absolute;inset:0;transform-origin:50% 100%}
.tsm .tsmRitualLayer[data-rid="106"] .tsSquash.hit{animation:tsHit .34s cubic-bezier(.3,1.6,.5,1)}
@keyframes tsHit{0%{transform:scale(1.1,.84)}45%{transform:scale(.94,1.1) translateY(-6px)}100%{transform:none}}
.tsm .tsmRitualLayer[data-rid="106"] .tsKey.hitting .tsBar{transform:translateY(2px) scale(.97,.85)}
.tsm .tsmRitualLayer[data-rid="106"] .tsSquash .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="106"] .tsSquash.hop{animation:tsHop .42s cubic-bezier(.3,1.4,.5,1)}
@keyframes tsHop{0%{transform:none}40%{transform:translateY(-26px) scale(1.06)}100%{transform:none}}
.tsm .tsmRitualLayer[data-rid="106"] .tsVibes{position:absolute;left:50%;height:58px;width:var(--vw);margin-left:calc(var(--vw)*-.5);display:flex;gap:10px;z-index:5}
.tsm .tsmRitualLayer[data-rid="106"] .tsVibe{flex:1;border-radius:29px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:16px;font-weight:700;letter-spacing:.08em;touch-action:none;cursor:pointer;
  color:var(--ink);background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.22);transition:transform .12s cubic-bezier(.3,1.6,.5,1), background .3s, color .3s}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="106"] .tsVibe{background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 1.5px rgba(90,80,160,.25)}
.tsm .tsmRitualLayer[data-rid="106"] .tsVibe:active{transform:scale(.95)}
.tsm .tsmRitualLayer[data-rid="106"] .tsVibe.on{color:#14204a;background:linear-gradient(180deg,#e8f2ff,#a9c8ff);box-shadow:0 8px 20px rgba(80,130,255,.35), inset 0 -3px 0 rgba(40,70,160,.25)}
.tsm .tsmRitualLayer[data-rid="106"] .tsVibe.on.silly{color:#4a1040;background:linear-gradient(180deg,#fff0b0,#ff9ad0);box-shadow:0 8px 20px rgba(255,90,170,.4), inset 0 -3px 0 rgba(160,40,100,.25)}
.tsm .tsmRitualLayer[data-rid="106"] .rdc .tsStaff{animation:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="106"] .tsStaff{animation:none}}
`

function RitualSoundtrack({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [hits, setHits] = React.useState<number[]>(() => Array(N).fill(0))
    const sqRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const bump = (i: number, cls: "hit" | "hop") => {
        const el = sqRefs.current[i]
        if (!el) return
        el.classList.remove("hit", "hop")
        void el.offsetWidth // restart the squash animation without re-rendering the face
        el.classList.add(cls)
    }
    const [pressing, setPressing] = React.useState(-1)
    const [vibe, setVibe] = React.useState<"clean" | "silly">("clean")
    const [ending, setEnding] = React.useState(false)
    const hitsRef = useLatest(hits)
    const vibeRef = useLatest(vibe)
    const timers = useTimers()
    const finished = React.useRef(false)
    const layerRef = React.useRef<HTMLDivElement>(null)

    // layout: 2 × 3 keys (C D / E F / G A), each face on its own bar; one vibe row in the thumb zone
    const ctrlTop = h - 76 - 58
    const TOP = 10
    const area = { w, h: Math.max(300, ctrlTop - 14 - TOP) }
    const rowH = area.h / 3
    const d = Math.floor(Math.min(140, (w - 3 * 16) / 2, rowH - 30 - rowH * 0.06))
    const pos = Array.from({ length: N }, (_, i) => ({ x: w * (i % 2 ? 0.72 : 0.28), y: TOP + rowH * (Math.floor(i / 2) + 0.5) - 12 + (i % 2 ? rowH * 0.03 : -rowH * 0.03) }))

    const play = (i: number) => {
        if (ending) return
        const v = vibeRef.current
        ctx.sfx(`tskey:${v}:${i}`)
        const before = hitsRef.current[i]
        const n = Math.min(3, before + 1)
        ctx.haptic(n >= 3 && before < 3 ? 14 : 7)
        bump(i, "hit")
        setPressing(i)
        timers.after(120, () => setPressing(-1))
        const p = pos[i]
        const hue = TS_NOTE_HUE[i]
        // the note itself floats up out of the face
        ctx.fx.add({ x: p.x + (Math.random() - 0.5) * d * 0.3, y: p.y - d * 0.45, vx: (Math.random() - 0.5) * 40, vy: -110 - Math.random() * 40, ay: -20, max: 1.2, size: 24, vr: (Math.random() - 0.5) * 2, shape: "text", text: Math.random() < 0.5 ? "♪" : "♫", color: `hsla(${hue},95%,${ctx.theme === "bright" ? 45 : 75}%,1)`, add: false })
        ctx.fx.burst(p.x, p.y + d * 0.5 + 12, { count: 1, shape: "ring", size: [d * 0.3, d * 0.3], grow: d * 0.9, life: [0.45, 0.45], speed: [0, 0], colors: [`hsla(${hue},100%,75%,.7)`], add: true })
        if (before >= 3) return // already quiet: it still plays, it just has nothing left to give
        const next = hitsRef.current.map((x, j) => (j === i ? n : x))
        setHits(next)
        const total = next.reduce((a, b) => a + b, 0)
        ctx.progress(total / (N * 3))
        if (n === 3) {
            // it sings: the words dissolve into notes, the face turns happy
            const letters = Array.from(ctx.words[i] || "").filter((c) => c !== " ").slice(0, 16)
            letters.forEach((c, k) => ctx.fx.add({ x: p.x - letters.length * 4 + k * 8, y: p.y + d * 0.22, vx: (Math.random() - 0.5) * 50, vy: -70 - Math.random() * 90, ay: -30, drag: 0.98, max: 1.4 + Math.random() * 0.4, size: 15, vr: (Math.random() - 0.5) * 3, shape: "text", text: c, color: ctx.theme === "bright" ? "rgba(50,40,110,1)" : "rgba(255,255,255,1)", add: false }))
            ctx.fx.burst(p.x, p.y, { count: 14, shape: "glow", size: [4, 9], speed: [50, 160], life: [0.6, 1.1], drag: 0.94, colors: [`hsla(${hue},100%,80%,1)`, "rgba(255,245,220,1)"] })
            timers.after(90, () => ctx.sfx("chime"))
            const quiet = next.filter((x) => x >= 3).length
            if (quiet === N) finale()
            else ctx.hint(quiet === N - 1 ? "One more face to quiet" : `${N - quiet} left · 3 taps each`)
        }
    }

    const finale = () => {
        if (finished.current) return
        finished.current = true
        ctx.hint("")
        timers.after(300, () => {
            setEnding(true)
            // the six notes replay as a tiny melody, each face hopping as it sings
            for (let k = 0; k < N; k++)
                timers.after(k * 190, () => {
                    ctx.sfx(`tskey:${vibeRef.current}:${k}`)
                    bump(k, "hop")
                    const p = pos[k]
                    ctx.fx.add({ x: p.x, y: p.y - d * 0.5, vx: 0, vy: -140, max: 1.1, size: 26, shape: "text", text: "♪", color: `hsla(${TS_NOTE_HUE[k]},95%,${ctx.theme === "bright" ? 45 : 75}%,1)`, add: false })
                })
        })
        timers.after(300 + N * 190 + 100, () => {
            ctx.sfx(`tskey:${vibeRef.current}:0`)
            ctx.sfx(`tskey:${vibeRef.current}:2`)
            ctx.sfx(`tskey:${vibeRef.current}:4`)
            ctx.haptic([20, 60, 20])
            pos.forEach((p, k) => ctx.fx.burst(p.x, p.y, { count: 8, shape: "glow", size: [4, 8], speed: [40, 140], life: [0.7, 1.2], colors: [`hsla(${TS_NOTE_HUE[k]},100%,78%,1)`] }))
            ctx.fx.burst(w / 2, h * 0.45, { count: 1, shape: "ring", size: [30, 30], grow: w, life: [1.1, 1.1], speed: [0, 0], colors: ["rgba(255,240,210,.7)"], add: true })
        })
        timers.after(300 + N * 190 + 950, () => {
            ctx.sfx("win")
            ctx.complete(400)
        })
    }

    const pickVibe = (v: "clean" | "silly") => {
        setVibe(v)
        ctx.sfx(`tskey:${v}:0`)
        ctx.haptic(6)
    }

    React.useEffect(() => {
        const layer = layerRef.current && (layerRef.current.closest(".tsmRitualLayer") as HTMLElement | null)
        if (layer) layer.classList.toggle("isSilly", vibe === "silly")
    }, [vibe])

    React.useEffect(() => {
        ctx.hint("Tap each face 3 times to quiet it")
    }, [])

    const vw = Math.min(w - 48, 340)
    return (
        <div ref={layerRef} className={ctx.reduced ? "rdc" : undefined} style={{ position: "absolute", inset: 0 }}>
            <div className="tsWorld" />
            <div className="tsSilly" />
            <i className="tsStaff" style={{ top: h * 0.08 }} />
            <i className="tsStaff" style={{ top: h * 0.52, animationDelay: "-4s" }} />
            {pos.map((p, i) => {
                const q = Math.min(3, hits[i])
                const quiet = q >= 3
                const bw = Math.round(d * (1.02 - i * 0.06))
                return (
                    <div
                        key={i}
                        className={cx("tsKey", pressing === i && "hitting")}
                        style={{ left: p.x, top: p.y, ["--d" as any]: `${d}px`, ["--bw" as any]: `${bw}px`, ["--nh" as any]: TS_NOTE_HUE[i] }}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            play(i)
                        }}
                        role="button"
                        aria-label={`Play ${TS_NOTES[i]} for: ${ctx.words[i] || "your picture"}${quiet ? " (quiet)" : ""}`}
                    >
                        <i className="tsBar" />
                        <div className="tsVol" style={{ transform: `scale(${1 - 0.07 * q})` }}>
                            <div className="tsSquash" ref={(el) => (sqRefs.current[i] = el)}>
                                <Orb
                                    src={ctx.pic(i, quiet)}
                                    text={quiet ? "" : ctx.words[i]}
                                    d={d}
                                    hue={ctx.hue(i)}
                                    hue2={TS_NOTE_HUE[i]}
                                    mood={quiet || ending ? "happy" : vibe === "silly" ? "bounce" : "float"}
                                    aura={quiet ? 0.85 : q * 0.15}
                                    uploaded={ctx.uploaded}
                                />
                            </div>
                        </div>
                    </div>
                )
            })}
            <div className="tsVibes" style={{ top: ctrlTop, ["--vw" as any]: `${vw}px`, opacity: ending ? 0 : 1, transition: "opacity .4s" }}>
                <div className={cx("tsVibe", vibe === "clean" && "on")} role="button" aria-pressed={vibe === "clean"} aria-label="Clean sound" onPointerDown={(e) => (e.preventDefault(), pickVibe("clean"))}>
                    <span>♪</span>
                    <span>CLEAN</span>
                </div>
                <div className={cx("tsVibe", "silly", vibe === "silly" && "on")} role="button" aria-pressed={vibe === "silly"} aria-label="Silly sound" onPointerDown={(e) => (e.preventDefault(), pickVibe("silly"))}>
                    <span>✿</span>
                    <span>SILLY</span>
                </div>
            </div>
        </div>
    )
}

tsmRitual({ id: 106, hint: "Tap each face 3 times to quiet it", css: TS_CSS, Comp: RitualSoundtrack })
