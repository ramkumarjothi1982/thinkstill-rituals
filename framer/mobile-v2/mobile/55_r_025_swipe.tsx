/* ================================================================== */
/* 25 · SWIPE AWAY — a spotlit card table                              */
/* ================================================================== */
// Desktop rules kept: one large card per word chunk (6 in sequence), a committed swipe flings it off-screen, a
// weak swipe springs back (the point of the ritual: commitment), progress = cards gone / 6, finish → bonus 240.
// Founder fixes (13.25 / P13.25-a): either direction commits (left or right — the copy and the gesture now agree),
// 2D drag that follows the finger with rotation, a fast flick commits even when short, the exit flies along the
// swipe vector and faster for a faster swipe, a real spring-back; progress moves only on a committed swipe, never
// for a weak one; the words scatter off the card as letters along the throw.

const SWIPE_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="25"] .swRoom{position:absolute;inset:0;background:
  radial-gradient(60% 46% at 50% 44%, rgba(40,120,90,.85) 0%, rgba(20,70,55,.9) 45%, rgba(8,26,24,1) 80%),
  linear-gradient(180deg,#071412,#0a1d1a)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="25"] .swRoom{background:
  radial-gradient(60% 46% at 50% 44%, rgba(120,200,160,1) 0%, rgba(80,160,125,1) 50%, rgba(50,120,95,1) 85%),
  linear-gradient(180deg,#3d8b6c,#2f7559)}
.tsm .tsmRitualLayer[data-rid="25"] .swFelt{position:absolute;inset:0;pointer-events:none;opacity:.35;
  background:repeating-radial-gradient(circle at 50% 44%, rgba(255,255,255,.035) 0 1px, transparent 1px 3px)}
.tsm .tsmRitualLayer[data-rid="25"] .swBeam{position:absolute;left:50%;top:-6%;width:150%;height:100%;margin-left:-75%;pointer-events:none;opacity:.55;
  background:radial-gradient(40% 70% at 50% 0%, rgba(255,246,215,.30) 0%, rgba(255,240,200,.08) 55%, transparent 75%)}
.tsm .tsmRitualLayer[data-rid="25"] .swGlow{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.4s ease;
  background:radial-gradient(70% 55% at 50% 44%, rgba(255,226,160,.55) 0%, rgba(255,200,120,.15) 50%, transparent 80%)}
.tsm .tsmRitualLayer[data-rid="25"] .swGlow.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="25"] .swRail{position:absolute;height:2px;border-radius:2px;pointer-events:none;opacity:.5;
  background:linear-gradient(90deg, transparent, rgba(255,240,200,.6) 20%, transparent 40%, transparent 60%, rgba(255,240,200,.6) 80%, transparent)}
.tsm .tsmRitualLayer[data-rid="25"] .swChev{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;pointer-events:none;border:solid rgba(255,244,214,.75);border-width:0 3px 3px 0;border-radius:2px;animation:swChev 1.8s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="25"] .swChev.l{animation-name:swChevL}
@keyframes swChev{0%,100%{transform:translateX(-4px) rotate(-45deg);opacity:.25}50%{transform:translateX(6px) rotate(-45deg);opacity:.9}}
@keyframes swChevL{0%,100%{transform:translateX(4px) rotate(135deg);opacity:.25}50%{transform:translateX(-6px) rotate(135deg);opacity:.9}}
.tsm .tsmRitualLayer[data-rid="25"] .swDeck{position:absolute;width:var(--cw);height:var(--ch);margin:calc(var(--ch)*-.5) 0 0 calc(var(--cw)*-.5);border-radius:22px;pointer-events:none;transition:transform .45s cubic-bezier(.3,1.3,.5,1), opacity .3s ease;
  background:repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 6px, transparent 6px 12px),linear-gradient(160deg,#3b2a6e 0%,#24194a 100%);
  box-shadow:inset 0 0 0 5px rgba(255,255,255,.88), inset 0 0 0 7px rgba(80,60,140,.6), 0 10px 24px rgba(0,0,0,.4)}
.tsm .tsmRitualLayer[data-rid="25"] .swSlot{position:absolute;width:var(--cw);height:var(--ch);margin:calc(var(--ch)*-.5) 0 0 calc(var(--cw)*-.5);touch-action:none;cursor:grab}
.tsm .tsmRitualLayer[data-rid="25"] .swCard{position:absolute;inset:0;will-change:transform;transform-origin:50% 80%}
.tsm .tsmRitualLayer[data-rid="25"] .swIn{position:absolute;inset:0;animation:swIn .48s cubic-bezier(.2,.9,.3,1.12) both}
@keyframes swIn{0%{transform:translateY(16px) scale(.93);opacity:.6}100%{transform:none;opacity:1}}
.tsm .tsmRitualLayer[data-rid="25"] .swFace{position:absolute;inset:0;border-radius:22px;overflow:hidden;
  background:radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,.95), rgba(255,255,255,0) 60%),linear-gradient(180deg,#fffaf0 0%,#f3ead8 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.9), inset 0 0 0 6px rgba(255,255,255,.5), 0 18px 40px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.25)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="25"] .swFace{box-shadow:inset 0 0 0 1px rgba(255,255,255,.9), inset 0 0 0 6px rgba(255,255,255,.5), 0 18px 36px rgba(20,60,40,.35), 0 2px 6px rgba(0,0,0,.18)}
.tsm .tsmRitualLayer[data-rid="25"] .swEdge{position:absolute;top:0;bottom:0;width:38%;pointer-events:none;opacity:0}
.tsm .tsmRitualLayer[data-rid="25"] .swEdge.r{right:0;background:linear-gradient(270deg, rgba(255,190,90,.55), transparent)}
.tsm .tsmRitualLayer[data-rid="25"] .swEdge.l{left:0;background:linear-gradient(90deg, rgba(255,190,90,.55), transparent)}
.tsm .tsmRitualLayer[data-rid="25"] .swPic{position:absolute;left:50%;border-radius:50%;overflow:hidden;transform:translateX(-50%);background:#fff;
  box-shadow:0 0 0 3px #fff, 0 0 0 4px rgba(120,90,60,.18), 0 6px 16px rgba(60,40,20,.22)}
.tsm .tsmRitualLayer[data-rid="25"] .swPic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="25"] .swPic img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="25"] .swPic img.fresh{animation:swFaceIn .45s cubic-bezier(.3,1.6,.45,1) both}
@keyframes swFaceIn{0%{transform:scale(.6) rotate(8deg);opacity:0}100%{transform:scale(1.14);opacity:1}}
.tsm .tsmRitualLayer[data-rid="25"] .swWords{position:absolute;left:18px;right:18px;display:flex;align-items:center;justify-content:center;text-align:center;color:#2a2238;font-weight:600;line-height:1.2;letter-spacing:-.01em;overflow:hidden;word-break:break-word}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="25"] .swChev{animation:none;opacity:.6}}
`

function RitualSwipe({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const timers = useTimers()
    const [idx, setIdx] = React.useState(0)
    const [flying, setFlying] = React.useState(false)
    const [happy, setHappy] = React.useState(false)
    const [phase, setPhase] = React.useState<"play" | "final">("play")
    const st = React.useRef({ idx: 0, busy: false, weak: 0 })
    const cardRef = React.useRef<HTMLDivElement>(null)
    const edgeR = React.useRef<HTMLElement>(null)
    const edgeL = React.useRef<HTMLElement>(null)
    const calm = ctx.reduced

    // layout: one big card centred on the table, deck peeking below it
    const PILL = 92
    const avail = h - PILL
    const CW = Math.round(Math.min(w - 72, 300))
    const CH = Math.round(Math.min(CW * 1.2, avail * 0.66))
    const cxp = w / 2
    const cyp = Math.round(Math.max(CH / 2 + 22, avail * 0.46))
    const THRESH = Math.min(140, w * 0.34)
    const geo = useLatest({ w, h, cxp, cyp, CW, CH })

    React.useEffect(() => {
        ctx.hint("Swipe the card away — either way")
        for (let i = 0; i < N; i++) preloadImage(ctx.pic(i, true))
    }, [])

    const place = (x: number, y: number, rot: number) => {
        const el = cardRef.current
        if (!el) return
        el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`
        const k = clamp01(Math.abs(x) / THRESH)
        if (edgeR.current) edgeR.current.style.opacity = x > 0 ? String(k) : "0"
        if (edgeL.current) edgeL.current.style.opacity = x < 0 ? String(k) : "0"
    }

    const bind = useDrag({
        onStart: () => {
            if (st.current.busy || phase !== "play") return false
            const el = cardRef.current
            if (el) el.style.transition = "none"
            ctx.haptic(6)
            ctx.sfx("tap")
        },
        onMove: (d) => {
            // follows the finger in 2D; a little vertical give, rotation from the sideways throw
            place(d.dx, d.dy * 0.45, d.dx / 16 + d.dy * 0.01)
        },
        onEnd: (d) => {
            const fast = Math.abs(d.vx) > 650 && Math.abs(d.dx) > 24 && Math.sign(d.vx) === Math.sign(d.dx)
            if (Math.abs(d.dx) > THRESH || fast) commit(d)
            else springBack(Math.abs(d.dx) > 12)
        },
    })

    const springBack = (felt: boolean) => {
        const el = cardRef.current
        if (el) el.style.transition = calm ? "transform .25s ease-out" : "transform .55s cubic-bezier(.3,1.6,.45,1)"
        place(0, 0, 0)
        if (edgeR.current) edgeR.current.style.opacity = "0"
        if (edgeL.current) edgeL.current.style.opacity = "0"
        if (felt) {
            ctx.sfx("soft")
            ctx.haptic(5)
            st.current.weak += 1
            ctx.hint("Harder — commit to the swipe")
        }
    }

    const commit = (d: DragInfo) => {
        const s = st.current
        s.busy = true
        const G = geo.current
        const i = s.idx
        // exit along the swipe vector, faster for a faster throw
        const sp = Math.hypot(d.vx, d.vy)
        let ex = d.dx + d.vx * 0.12
        let ey = d.dy * 0.45 + d.vy * 0.12
        if (Math.abs(ex) < 1) ex = Math.sign(d.vx || 1)
        const len = Math.hypot(ex, ey) || 1
        ex /= len
        ey /= len
        if (Math.abs(ey) > 0.6) {
            // keep it sideways-ish (within ±53°) so it always leaves past the side of the table
            ey = Math.sign(ey) * 0.6
            ex = Math.sign(ex) * 0.8
        }
        const far = Math.max(G.w, G.h) * 1.1
        const tx = d.dx + ex * far
        const ty = d.dy * 0.45 + ey * far
        const dur = clamp(0.62 - sp / 5000, 0.24, 0.6) * (calm ? 0.7 : 1)
        const el = cardRef.current
        if (el) el.style.transition = `transform ${dur.toFixed(2)}s cubic-bezier(.25,.6,.35,1), opacity ${dur.toFixed(2)}s ease`
        place(tx, ty, d.dx / 16 + Math.sign(ex) * (22 + Math.min(30, sp / 80)))
        if (el) el.style.opacity = "0.2"
        setFlying(true)
        setHappy(true)
        ctx.sfx("clack")
        ctx.sfx("spark")
        ctx.haptic(18)
        ctx.progress((i + 1) / N)
        const leftNow = N - i - 1
        ctx.hint(leftNow === 0 ? "" : leftNow === 1 ? "Last card — swipe it away" : `${leftNow} cards left · swipe them away`)
        // the words scatter off the card along the throw
        const letters = Array.from(ctx.words[i] || "").filter((c) => c.trim())
        const ox = G.cxp + d.dx
        const oy = G.cyp + d.dy * 0.45 + G.CH * 0.22
        if (letters.length)
            ctx.fx.burst(ox, oy, { count: Math.min(20, letters.length), shape: "text", text: letters, size: [14, 19], speed: [60, 180], vx: ex * Math.min(520, 180 + sp * 0.2), vy: ey * Math.min(520, 180 + sp * 0.2), life: [0.8, 1.2], drag: 0.95, spin: 5, colors: ["rgba(255,248,230,1)"], add: false })
        ctx.fx.burst(ox, oy - G.CH * 0.2, { count: 14, shape: "streak", size: [1.6, 2.4], speed: [500, 900], angle: [Math.atan2(ey, ex) - 0.18, Math.atan2(ey, ex) + 0.18], life: [0.25, 0.4], drag: 0.95, colors: ["rgba(255,240,200,1)"] })
        timers.after(Math.round(dur * 1000) + 40, () => {
            const nd = i + 1
            if (nd >= N) return finale()
            s.idx = nd
            setIdx(nd)
            setFlying(false)
            setHappy(false)
            const c = cardRef.current
            if (c) {
                c.style.transition = "none"
                c.style.opacity = "1"
            }
            place(0, 0, 0)
            s.busy = false
        })
    }

    const finale = () => {
        setPhase("final")
        ctx.hint("")
        const G = geo.current
        // the empty table lights up: a warm bloom, gold dust swept across the felt, a soft ring
        timers.after(120, () => {
            ctx.sfx("chime")
            ctx.haptic([14, 40, 20])
            ctx.fx.burst(G.cxp, G.cyp, { count: 1, shape: "ring", size: [20, 20], grow: G.w * 1.2, life: [1.1, 1.1], speed: [0, 0], colors: ["rgba(255,230,170,.8)"], add: true })
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2
                ctx.fx.burst(G.cxp + Math.cos(a) * G.CW * 0.5, G.cyp + Math.sin(a) * G.CH * 0.4, { count: calm ? 3 : 8, shape: "glow", size: [3, 8], speed: [20, 90], life: [1, 1.6], drag: 0.97, gravity: -30, colors: ["rgba(255,226,160,1)", "rgba(255,255,255,1)"] })
            }
        })
        for (let k = 0; k < (calm ? 4 : 12); k++)
            timers.after(400 + k * 70, () => ctx.fx.add({ x: -10, y: G.cyp + (Math.random() - 0.5) * G.CH, vx: 380 + Math.random() * 260, vy: (Math.random() - 0.5) * 60, drag: 0.995, max: 1.4, size: 2 + Math.random() * 3, shape: "glow", color: "rgba(255,232,170,1)" }))
        timers.after(1300, () => ctx.sfx("bell"))
        timers.after(calm ? 1600 : 2200, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(240)
        })
    }

    const word = ctx.words[idx] || ""
    const hasWords = !!word.trim()
    const pic = Math.round(hasWords ? CW * 0.46 : CW * 0.62)
    const pTop = Math.round(CH * (hasWords ? 0.1 : 0.16))
    const wTop = pTop + pic + 14
    const boxH = CH - wTop - 18
    const fpx = fitThoughtPx(word, CW - 36, boxH, 28, 15, 1.2)
    const src = ctx.pic(idx, happy)
    const left = N - idx - (flying ? 1 : 0)
    return (
        <>
            <div className="swRoom" />
            <div className="swFelt" />
            <i className="swBeam" />
            <i className={cx("swGlow", phase === "final" && "on")} />
            {phase === "play" ? (
                <>
                    <i className="swRail" style={{ left: 16, right: 16, top: cyp + CH / 2 + 26 }} />
                    <i className="swChev l" style={{ left: Math.max(18, (w - CW) / 2 - 18), top: cyp }} />
                    <i className="swChev" style={{ left: Math.min(w - 18, (w + CW) / 2 + 18), top: cyp }} />
                </>
            ) : null}
            {[2, 1].map((k) =>
                left - 1 >= k ? (
                    <i key={k} className="swDeck" style={{ left: cxp, top: cyp, ["--cw" as any]: `${CW}px`, ["--ch" as any]: `${CH}px`, transform: `translateY(${k * 9}px) scale(${1 - k * 0.04})`, opacity: 1 - k * 0.2 }} />
                ) : null
            )}
            {phase === "play" ? (
                <div className="swSlot" style={{ left: cxp, top: cyp, ["--cw" as any]: `${CW}px`, ["--ch" as any]: `${CH}px` }} {...bind} role="button" aria-label={`Swipe away: ${word || "your picture"}`}>
                    <div ref={cardRef} className="swCard">
                        <div key={idx} className="swIn">
                            <div className="swFace">
                                {src ? (
                                    <span className="swPic" style={{ width: pic, height: pic, top: pTop }}>
                                        <img key={src} className={cx(ctx.uploaded && "up", happy && "fresh")} src={src} alt="" draggable={false} />
                                    </span>
                                ) : null}
                                {hasWords ? (
                                    <span className="swWords" style={{ top: wTop, height: boxH, fontSize: fpx }}>
                                        {thoughtLine(word, 110)}
                                    </span>
                                ) : null}
                                <i ref={edgeR as any} className="swEdge r" />
                                <i ref={edgeL as any} className="swEdge l" />
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}

tsmRitual({ id: 25, hint: "Swipe the card away — either way", css: SWIPE_CSS, Comp: RitualSwipe })
