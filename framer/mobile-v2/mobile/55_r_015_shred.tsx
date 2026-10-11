/* ================================================================== */
/* 15 · SHRED — a lamp-lit desk at night                              */
/* ================================================================== */
// Desktop rules kept: 6 papers in sequence (one per word chunk), 5 discrete bites per paper (any tempo, no fail
// state), each bite moves the paper visibly down into the blades, the paper is fully destroyed before the next
// one prints, progress = (paper + bites/5) / 6, completion bonus 360. Fixed: the user's exact words are now
// printed on every paper (picture on top, words below) and the blades visibly cut THEM into strips that come
// out under the machine and drop into the bin; the face being fed in turns relieved on the first bite; the paper
// itself is the tap target (the whole machine too); motor + cut sounds; a SHRED-owned disintegration finale.

const SHRED_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="15"] .shRoom{position:absolute;inset:0;background:
  radial-gradient(60% 46% at 16% 6%, rgba(255,200,130,.38) 0%, rgba(255,170,90,.12) 45%, transparent 70%),
  linear-gradient(180deg,#141020 0%,#211a2c 46%,#2a1f28 64%,#3a2618 64.2%,#2b1b12 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="15"] .shRoom{background:
  radial-gradient(60% 46% at 16% 6%, rgba(255,236,190,.9) 0%, rgba(255,220,160,.3) 45%, transparent 70%),
  linear-gradient(180deg,#efe6da 0%,#e7dccd 46%,#e0d2c0 64%,#c99a6a 64.2%,#b88552 100%)}
.tsm .tsmRitualLayer[data-rid="15"] .shDesk{position:absolute;left:0;right:0;bottom:0;top:64%;pointer-events:none;opacity:.55;
  background:repeating-linear-gradient(176deg, rgba(255,220,180,.06) 0 2px, transparent 2px 9px),radial-gradient(70% 60% at 30% 0%, rgba(255,190,120,.25), transparent 70%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="15"] .shDesk{opacity:.8;background:repeating-linear-gradient(176deg, rgba(120,70,30,.10) 0 2px, transparent 2px 9px),radial-gradient(70% 60% at 30% 0%, rgba(255,240,200,.5), transparent 70%)}
.tsm .tsmRitualLayer[data-rid="15"] .shLamp{position:absolute;left:-30%;top:-30%;width:110%;height:90%;pointer-events:none;opacity:.35;transition:opacity 1.2s ease;
  background:radial-gradient(closest-side, rgba(255,214,150,.55), rgba(255,190,120,.12) 55%, transparent)}
.tsm .tsmRitualLayer[data-rid="15"] .shLamp.flare{opacity:1}
.tsm .tsmRitualLayer[data-rid="15"] .shUpper,.tsm .tsmRitualLayer[data-rid="15"] .shLower{position:absolute;overflow:hidden;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="15"] .shSheet{position:absolute;left:0;width:var(--pw);height:var(--ph);transition:transform .24s cubic-bezier(.3,.8,.3,1)}
.tsm .tsmRitualLayer[data-rid="15"] .shSheet.enter{animation:shEnter .62s cubic-bezier(.2,.9,.3,1.08) both}
@keyframes shEnter{0%{transform:translateY(calc(var(--ph)*-1.25)) rotate(-4deg);opacity:0}60%{opacity:1}100%{transform:translateY(0) rotate(0);opacity:1}}
.tsm .tsmRitualLayer[data-rid="15"] .shPaper{position:absolute;left:0;top:0;width:var(--pw);height:var(--ph);border-radius:6px 6px 3px 3px;overflow:hidden;
  background:repeating-linear-gradient(180deg, transparent 0 25px, rgba(90,120,190,.16) 25px 26px),linear-gradient(180deg,#fffdf6 0%,#f6f0e2 100%);
  box-shadow:0 1px 0 rgba(255,255,255,.8) inset, 0 10px 26px rgba(0,0,0,.35)}
.tsm .tsmRitualLayer[data-rid="15"] .shPaper::before{content:"";position:absolute;left:0;right:0;top:0;height:14px;background:linear-gradient(180deg,rgba(0,0,0,.10),transparent)}
.tsm .tsmRitualLayer[data-rid="15"] .shPic{position:absolute;left:50%;border-radius:50%;overflow:hidden;transform:translateX(-50%);background:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.9), 0 3px 10px rgba(60,40,30,.25)}
.tsm .tsmRitualLayer[data-rid="15"] .shPic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="15"] .shPic img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="15"] .shPic img.fresh{animation:shFace .5s cubic-bezier(.3,1.6,.45,1) both}
@keyframes shFace{0%{transform:scale(.6) rotate(8deg);opacity:0}100%{transform:scale(1.14);opacity:1}}
.tsm .tsmRitualLayer[data-rid="15"] .shWords{position:absolute;left:16px;right:16px;display:flex;align-items:center;justify-content:center;text-align:center;color:#2b2440;font-weight:600;line-height:1.2;letter-spacing:-.01em;overflow:hidden;word-break:break-word}
.tsm .tsmRitualLayer[data-rid="15"] .shStrip{position:absolute;top:0;height:var(--ph);overflow:hidden;transform-origin:50% 0;transition:transform .24s cubic-bezier(.3,.8,.3,1)}
.tsm .tsmRitualLayer[data-rid="15"] .shStrip .shPaper{box-shadow:none;border-radius:0}
.tsm .tsmRitualLayer[data-rid="15"] .shMachine{position:absolute;width:var(--mw);height:var(--mh);border-radius:16px 16px 20px 20px;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.16) 0 3px, transparent 3px),repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 2px, transparent 2px 5px),linear-gradient(180deg,#4a4f60 0%,#2c303d 40%,#1c1f29 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.12), inset 0 -10px 20px rgba(0,0,0,.4), 0 16px 34px rgba(0,0,0,.5)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="15"] .shMachine{background:linear-gradient(180deg,rgba(255,255,255,.5) 0 3px, transparent 3px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 2px, transparent 2px 5px),linear-gradient(180deg,#8a91a6 0%,#5b6175 40%,#3e4354 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.3), inset 0 -10px 20px rgba(0,0,0,.25), 0 16px 30px rgba(80,50,30,.35)}
.tsm .tsmRitualLayer[data-rid="15"] .shSlot{position:absolute;left:7%;right:7%;top:11px;height:11px;border-radius:6px;background:linear-gradient(180deg,#05060a,#151820);box-shadow:inset 0 2px 4px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.18)}
.tsm .tsmRitualLayer[data-rid="15"] .shSlot::after{content:"";position:absolute;left:3%;right:3%;top:4px;height:4px;opacity:.8;background:repeating-linear-gradient(90deg,#c9ced8 0 3px,#5d636f 3px 5px,transparent 5px 9px)}
.tsm .tsmRitualLayer[data-rid="15"] .shMachine.run .shSlot::after{animation:shTeeth .12s linear infinite}
@keyframes shTeeth{to{transform:translateX(9px)}}
.tsm .tsmRitualLayer[data-rid="15"] .shGrille{position:absolute;left:18%;right:18%;bottom:16%;height:26%;border-radius:8px;background:repeating-linear-gradient(90deg, rgba(0,0,0,.45) 0 4px, rgba(255,255,255,.05) 4px 8px);box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}
.tsm .tsmRitualLayer[data-rid="15"] .shLed{position:absolute;right:7%;top:38%;width:9px;height:9px;border-radius:50%;background:#3b4150;box-shadow:inset 0 1px 2px rgba(0,0,0,.6);transition:background .15s, box-shadow .15s}
.tsm .tsmRitualLayer[data-rid="15"] .shMachine.run .shLed{background:#7dffb0;box-shadow:0 0 10px #4dff95, 0 0 2px #fff inset}
.tsm .tsmRitualLayer[data-rid="15"] .shMachine.ready .shLed{background:#ffcf6b;box-shadow:0 0 8px rgba(255,200,90,.8)}
.tsm .tsmRitualLayer[data-rid="15"] .shBin{position:absolute;width:var(--bw);height:var(--bh);margin-left:calc(var(--bw)*-.5);border-radius:6px 6px 22px 22px;pointer-events:none;
  background:repeating-linear-gradient(90deg, rgba(200,210,230,.16) 0 2px, transparent 2px 12px),linear-gradient(180deg,rgba(140,150,180,.10),rgba(140,150,180,.22));
  box-shadow:inset 0 0 0 2px rgba(200,210,235,.22)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="15"] .shBin{background:repeating-linear-gradient(90deg, rgba(80,70,90,.22) 0 2px, transparent 2px 12px),linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.34));box-shadow:inset 0 0 0 2px rgba(90,80,100,.25)}
.tsm .tsmRitualLayer[data-rid="15"] .shPile{position:absolute;left:8%;right:8%;bottom:4px;height:62%;transform-origin:50% 100%;transition:transform .6s cubic-bezier(.3,1.4,.5,1), opacity .5s ease;border-radius:40% 40% 14px 14px/60% 60% 14px 14px;
  background:repeating-linear-gradient(104deg, transparent 0 4px, rgba(150,135,110,.45) 4px 5px, transparent 5px 9px),repeating-linear-gradient(76deg, transparent 0 6px, rgba(150,135,110,.35) 6px 7px),linear-gradient(180deg,#fffaf0 0%,#e8dcc4 100%);-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 35%);mask-image:linear-gradient(180deg,transparent 0,#000 35%)}
.tsm .tsmRitualLayer[data-rid="15"] .shHit{position:absolute;touch-action:none;cursor:pointer;border-radius:18px}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="15"] .shSheet.enter{animation-duration:.01s}.tsm .tsmRitualLayer[data-rid="15"] .shMachine.run .shSlot::after{animation:none}}
`

function ShredPaperFace({ ctx, i, happy, pw, ph, fresh }: { ctx: RitualCtx; i: number; happy: boolean; pw: number; ph: number; fresh?: boolean }) {
    const word = ctx.words[i] || ""
    const src = ctx.pic(i, happy)
    const hasWords = !!word.trim()
    const pic = Math.round(hasWords ? ph * 0.42 : ph * 0.66)
    const top = Math.round(ph * (hasWords ? 0.08 : 0.14))
    const wTop = top + pic + 8
    const boxH = ph - wTop - 12
    const px = fitThoughtPx(word, pw - 32, boxH, 24, 14, 1.2)
    return (
        <div className="shPaper">
            {src ? (
                <span className="shPic" style={{ width: pic, height: pic, top }}>
                    <img key={src} className={cx(ctx.uploaded && "up", fresh && "fresh")} src={src} alt="" draggable={false} />
                </span>
            ) : null}
            {hasWords ? (
                <span className="shWords" style={{ top: wTop, height: boxH, fontSize: px }}>
                    {thoughtLine(word, 90)}
                </span>
            ) : null}
        </div>
    )
}

function RitualShred({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const BITES = 5
    const S = 8
    const timers = useTimers()
    const [idx, setIdx] = React.useState(0)
    const [bites, setBites] = React.useState(0)
    const [fall, setFall] = React.useState(false)
    const [done, setDone] = React.useState(0)
    const [run, setRun] = React.useState(false)
    const [phase, setPhase] = React.useState<"play" | "final">("play")
    const st = React.useRef({ idx: 0, bites: 0, locked: false })
    const sheetRef = React.useRef<HTMLDivElement>(null)
    const machineRef = React.useRef<HTMLDivElement>(null)
    const calm = ctx.reduced

    // layout: paper above the slot, machine, bin below — one column, centred, nothing beside the machine
    const PILL = 92
    const avail = h - PILL
    const PW = Math.round(Math.min(w - 76, 288))
    const PH = Math.round(clamp(PW * 0.76, 168, 224))
    const MW = Math.round(Math.min(w - 36, PW + 60))
    const MH = Math.round(clamp(avail * 0.16, 82, 108))
    const LIP = 16
    const binWant = Math.round(PH * 0.86)
    const top0 = Math.max(14, Math.round((avail - (PH + MH - LIP + binWant)) / 2))
    const slotY = top0 + PH
    const mTop = slotY - LIP
    const mBot = mTop + MH
    const x0 = Math.round((w - PW) / 2)
    const lowTop = mBot - 10
    const lowH = Math.max(80, avail + 24 - lowTop)
    const binTop = mBot - 4
    const binH = Math.max(60, avail - 6 - binTop)
    const sw = PW / S
    const f = bites / BITES

    React.useEffect(() => {
        ctx.hint("Tap the paper to feed the shredder")
        for (let i = 0; i < N; i++) preloadImage(ctx.pic(i, true))
    }, [])

    const bite = () => {
        const s = st.current
        if (s.locked || phase !== "play") return
        const b = s.bites + 1
        s.bites = b
        setBites(b)
        setRun(true)
        timers.after(260, () => setRun(false))
        // squash the paper, shake the machine, chew
        const m = machineRef.current
        if (m && m.animate && !calm) m.animate([{ transform: "translate(0,0)" }, { transform: "translate(-2px,1px)" }, { transform: "translate(2px,-1px)" }, { transform: "translate(-1px,0)" }, { transform: "translate(0,0)" }], { duration: 200 })
        const sh = sheetRef.current
        if (sh && sh.animate && !calm) sh.animate([{ transform: "scale(1,1)" }, { transform: "scale(1.02,.97) rotate(-.6deg)" }, { transform: "scale(1,1)" }], { duration: 180, easing: "ease-out" })
        if (b === 1) ctx.sfx("hum")
        ctx.sfx("clack")
        ctx.haptic(12)
        // cut confetti spits out under the machine
        for (let k = 0; k < (calm ? 4 : 9); k++)
            ctx.fx.add({ x: x0 + 14 + Math.random() * (PW - 28), y: mBot + 6, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 80, ay: 420, drag: 0.98, max: 0.9, size: 3, w: 2.5, h: 8 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, shape: "paper", color: Math.random() < 0.5 ? "rgba(255,250,238,1)" : "rgba(222,212,192,1)", add: false })
        ctx.progress((s.idx + b / BITES) / N)
        if (b < BITES) {
            const left = BITES - b
            ctx.hint(left === 1 ? "One more bite" : `Keep feeding — ${left} more bites`)
            return
        }
        // the page is through: its strips drop into the bin
        s.locked = true
        ctx.hint(s.idx >= N - 1 ? "" : "Shredded — next page coming")
        ctx.sfx("pop")
        ctx.haptic([10, 30, 18])
        timers.after(calm ? 120 : 300, () => {
            setFall(true)
            ctx.sfx("soft")
            for (let k = 0; k < (calm ? 6 : 16); k++)
                ctx.fx.add({ x: x0 + Math.random() * PW, y: lowTop + PH * 0.6, vx: (Math.random() - 0.5) * 80, vy: 60 + Math.random() * 120, ay: 520, drag: 0.98, max: 1.1, size: 3, w: 3, h: 12 + Math.random() * 10, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, shape: "paper", color: "rgba(250,244,230,1)", add: false })
        })
        timers.after(calm ? 600 : 900, () => {
            const nd = s.idx + 1
            setDone(nd)
            if (nd >= N) return finale()
            s.idx = nd
            s.bites = 0
            setIdx(nd)
            setBites(0)
            setFall(false)
            ctx.hint(nd === N - 1 ? "Last page — feed it through" : "Next page — tap to feed it")
            timers.after(calm ? 40 : 120, () => (s.locked = false))
        })
    }

    const finale = () => {
        setPhase("final")
        ctx.hint("")
        const bx = w / 2
        const by = binTop + binH * 0.62
        // the whole bin of strips disintegrates: paper bursts up, turns to warm motes, drifts into the lamp light
        timers.after(200, () => {
            ctx.sfx("clack")
            ctx.haptic([16, 40, 24])
            ctx.fx.burst(bx, by, { count: 46, shape: "paper", w: [2.5, 4], h: [10, 20], size: [3, 3], speed: [260, 560], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [0.8, 1.3], gravity: 300, drag: 0.97, spin: 14, colors: ["rgba(255,251,240,1)", "rgba(232,222,200,1)", "rgba(255,240,215,1)"], add: false })
            ctx.fx.burst(bx, by, { count: 1, shape: "ring", size: [16, 16], grow: w * 1.1, life: [0.9, 0.9], speed: [0, 0], colors: ["rgba(255,220,170,.8)"], add: true })
        })
        timers.after(760, () => {
            ctx.sfx("spark")
            for (let k = 0; k < (calm ? 10 : 30); k++)
                ctx.fx.add({ x: bx + (Math.random() - 0.5) * PW, y: by - 40 - Math.random() * PH, vx: -30 - Math.random() * 50, vy: -60 - Math.random() * 90, drag: 0.99, max: 1.3 + Math.random() * 0.5, size: 3 + Math.random() * 5, shape: "glow", color: Math.random() < 0.5 ? "rgba(255,220,160,1)" : "rgba(255,246,225,1)" })
        })
        timers.after(1200, () => ctx.sfx("chime"))
        timers.after(calm ? 1500 : 2200, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(360)
        })
    }

    const happy = bites > 0
    const word = ctx.words[idx] || ""
    return (
        <>
            <div className="shRoom" />
            <div className="shDesk" />
            <i className={cx("shLamp", phase === "final" && "flare")} />
            <div className="shBin" style={{ left: w / 2, top: binTop, ["--bw" as any]: `${Math.round(MW * 0.8)}px`, ["--bh" as any]: `${binH}px` }}>
                <i className="shPile" style={{ transform: `scaleY(${phase === "final" ? 0 : clamp(done / N, 0, 1)})`, opacity: done ? 1 : 0 }} />
            </div>
            {phase === "play" ? (
                <>
                    {/* the part still above the blades */}
                    <div className="shUpper" style={{ left: x0, top: 0, width: PW, height: slotY + 1 }}>
                        <div key={`u${idx}`} className={cx("shSheet", idx > 0 && bites === 0 && "enter")} style={{ top: top0, ["--pw" as any]: `${PW}px`, ["--ph" as any]: `${PH}px`, transform: `translateY(${(f * PH).toFixed(1)}px)` }}>
                            <div ref={sheetRef} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>
                                <ShredPaperFace ctx={ctx} i={idx} happy={happy} pw={PW} ph={PH} fresh={bites === 1} />
                            </div>
                        </div>
                    </div>
                    {/* the part already through: the same page, cut into strips */}
                    <div className="shLower" style={{ left: x0 - 30, top: lowTop, width: PW + 60, height: lowH }}>
                        <div key={`l${idx}`} style={{ position: "absolute", left: 30, top: 0, width: PW, height: PH, transform: `translateY(${(f * PH - PH).toFixed(1)}px)`, transition: "transform .24s cubic-bezier(.3,.8,.3,1)" }}>
                            {Array.from({ length: S }, (_, k) => {
                                const c = k - (S - 1) / 2
                                const spread = c * 3.2 * f
                                const rot = (k % 2 ? 1 : -1) * (1.2 + (k % 3)) * f
                                const tf = fall ? `translate(${(spread * 2.4).toFixed(1)}px,${Math.round(PH * 0.9 + 40)}px) rotate(${((k % 2 ? 1 : -1) * (10 + 4 * k)).toFixed(1)}deg)` : `translateX(${spread.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`
                                return (
                                    <div
                                        key={k}
                                        className="shStrip"
                                        style={{ left: k * sw, width: Math.ceil(sw), ["--ph" as any]: `${PH}px`, transform: tf, opacity: fall ? 0 : 1, transition: fall ? `transform .62s cubic-bezier(.5,0,.8,.6) ${k * 22}ms, opacity .5s ease ${120 + k * 22}ms` : undefined }}
                                    >
                                        <div style={{ position: "absolute", left: -k * sw, top: 0, width: PW, height: PH, ["--pw" as any]: `${PW}px`, ["--ph" as any]: `${PH}px` }}>
                                            <ShredPaperFace ctx={ctx} i={idx} happy={happy} pw={PW} ph={PH} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            ) : null}
            <div ref={machineRef} className={cx("shMachine", run && "run", phase === "play" && bites === 0 && "ready")} style={{ left: (w - MW) / 2, top: mTop, ["--mw" as any]: `${MW}px`, ["--mh" as any]: `${MH}px` }}>
                <i className="shSlot" />
                <i className="shGrille" />
                <i className="shLed" />
            </div>
            <div
                className="shHit"
                style={{ left: (w - MW) / 2, top: Math.max(0, top0 - 8), width: MW, height: mBot - Math.max(0, top0 - 8) }}
                onPointerDown={(e) => {
                    e.preventDefault()
                    bite()
                }}
                role="button"
                aria-label={`Feed the shredder: ${word || "your picture"}`}
            />
        </>
    )
}

tsmRitual({ id: 15, hint: "Tap the paper to feed the shredder", css: SHRED_CSS, Comp: RitualShred })
