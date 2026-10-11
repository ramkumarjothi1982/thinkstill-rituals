/* ================================================================== */
/* 111 · BIG SIGH — a storm over SYNC's island, ending at dawn         */
/* ================================================================== */
// Desktop rules kept (EOS panic hero): the physiological sigh — hold 2.0 s to 72 %, one more sip to 100 %
// (slide up ≥ 24 px, a 2nd finger or ↑, or it sips by itself after 1.0 s), let go → linear exhale of
// 4.5 / 5.5 / 6 / 6 s; an early lift is a "puff" (drains, no fail) and after 2 early lifts in a row the
// easy mode plays a whole guided sigh on any touch; 3 sighs (4 when the check-in level was 8+), each blowing
// its group of word-clouds out to sea; the sky moves storm → dawn; SYNC 44 → 48 → happy → 90 asleep on the
// moon; progress reports base+3/+6/+8/+10 per sigh, held at 96 through the finale; chime per sigh; bonus
// clamp(280 + (n−3)·20 + (no early lifts ? 30 : 0), 260, 360). Fixed: all 6 word chunks are shown on a phone.

const SIGH_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="111"] .sgSky,.tsm .tsmRitualLayer[data-rid="111"] .sgDawn{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="111"] .sgSky{background:radial-gradient(80% 40% at 50% 0%, rgba(120,90,200,.35), transparent 70%),linear-gradient(180deg,#120f2e 0%,#2a1c55 34%,#4b2b6e 58%,#2b2f5e 62%,#121c3c 100%)}
.tsm .tsmRitualLayer[data-rid="111"] .sgDawn{opacity:var(--clr,0);transition:opacity var(--clrT,4s) linear;
  background:radial-gradient(70% 34% at 50% 60%, rgba(255,214,150,.85) 0%, rgba(255,170,120,.35) 34%, transparent 66%),linear-gradient(180deg,#3d4f9c 0%,#8e7ec4 30%,#f0a98e 56%,#ffcf9a 61%,#5f86c2 62%,#2f4f8e 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="111"] .sgSky{background:radial-gradient(80% 40% at 50% 0%, rgba(255,255,255,.4), transparent 70%),linear-gradient(180deg,#6d6aa8 0%,#8b7fbf 34%,#a78fc4 58%,#7f8fc4 62%,#5f73ac 100%)}
.tsm .tsmRitualLayer[data-rid="111"] .sgSea{position:absolute;left:0;right:0;bottom:0;top:62%;overflow:hidden;
  background:linear-gradient(180deg,rgba(80,110,190,.28),rgba(10,20,50,.1) 70%)}
.tsm .tsmRitualLayer[data-rid="111"] .sgSea i{position:absolute;left:var(--l);width:var(--w);top:var(--t);height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(220,230,255,.35),transparent);animation:sgWave var(--d,7s) ease-in-out infinite}
@keyframes sgWave{0%,100%{transform:translateX(-10px)}50%{transform:translateX(12px)}}
.tsm .tsmRitualLayer[data-rid="111"] .sgSun{position:absolute;left:50%;width:120px;height:120px;margin-left:-60px;border-radius:50%;
  background:radial-gradient(circle, #fff6dc 0%, #ffd58a 40%, rgba(255,180,100,.0) 70%);transform:translateY(80px);opacity:0;transition:transform 2.4s cubic-bezier(.2,.7,.2,1), opacity 2s ease}
.tsm .tsmRitualLayer[data-rid="111"].isDawn .sgSun{transform:translateY(-30px);opacity:1}
.tsm .tsmRitualLayer[data-rid="111"] .sgMoon{position:absolute;width:64px;height:64px;border-radius:50%;opacity:0;transition:opacity 1.4s ease, transform 1.8s cubic-bezier(.2,.7,.2,1);
  background:radial-gradient(circle at 36% 34%, #fffbe8 0%, #f3e3b0 55%, #d8c08a 100%);box-shadow:0 0 30px rgba(255,236,190,.6)}
.tsm .tsmRitualLayer[data-rid="111"].isFinale .sgMoon{opacity:1}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud{position:absolute;width:var(--cw);height:var(--ch);margin:calc(var(--ch)*-.5) 0 0 calc(var(--cw)*-.5);will-change:transform,opacity;
  animation:sgFloat var(--fb,7s) ease-in-out infinite;animation-delay:var(--fd,0s)}
@keyframes sgFloat{0%,100%{translate:0 0}50%{translate:var(--fx,4px) -3px}}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud.leave{animation:none;transition:transform var(--out,5s) cubic-bezier(.35,0,.65,1), opacity var(--out,5s) ease-in}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud .sgPuff{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud .sgPuff i{position:absolute;border-radius:50%;background:radial-gradient(circle at 40% 30%, #dfe2f2 0%, #a6abc8 55%, #6d7299 100%);box-shadow:inset 0 -8px 14px rgba(40,44,80,.35)}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud .sgPuff i:nth-child(1){left:4%;top:34%;width:40%;height:52%}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud .sgPuff i:nth-child(2){left:24%;top:4%;width:52%;height:70%}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud .sgPuff i:nth-child(3){left:56%;top:26%;width:40%;height:58%}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud .sgPuff i:nth-child(4){left:12%;top:48%;width:76%;height:44%;border-radius:30px}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud span{position:absolute;left:10%;right:10%;top:42%;text-align:center;font-size:var(--fs,13px);font-weight:500;line-height:1.12;color:#22244a;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.tsm .tsmRitualLayer[data-rid="111"] .sgCloud img{position:absolute;left:50%;top:-8%;width:42%;aspect-ratio:1;margin-left:-21%;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px #fff}
.tsm .tsmRitualLayer[data-rid="111"] .sgIsland{position:absolute;width:130px;height:46px;margin-left:-65px;border-radius:50%;
  background:radial-gradient(60% 100% at 50% 100%, #6b5236 0%, #4a3826 60%, transparent 61%)}
.tsm .tsmRitualLayer[data-rid="111"] .sgSync{position:absolute;width:var(--sy);height:var(--sy);margin-left:calc(var(--sy)*-.5);border-radius:50%;overflow:hidden;
  box-shadow:0 0 0 2px rgba(255,255,255,.85),0 8px 20px rgba(0,0,0,.35);background:#0e2a4a;transform-origin:50% 100%;transition:transform .35s cubic-bezier(.3,1.5,.5,1), left 1.8s cubic-bezier(.3,.1,.3,1), top 1.8s cubic-bezier(.3,.1,.3,1)}
.tsm .tsmRitualLayer[data-rid="111"] .sgSync img{width:100%;height:100%;object-fit:cover;transform:scale(1.14);display:block}
.tsm .tsmRitualLayer[data-rid="111"] .sgOrbWrap{position:absolute;width:var(--os);height:var(--os);margin:calc(var(--os)*-.5) 0 0 calc(var(--os)*-.5);touch-action:none;cursor:pointer}
.tsm .tsmRitualLayer[data-rid="111"] .sgOrb{position:absolute;inset:0;border-radius:50%;transform:scale(calc(.92 + var(--f,0)*.16));transition:transform .08s linear;
  background:radial-gradient(circle at 38% 32%, rgba(255,255,255,.55) 0%, rgba(170,200,255,.25) 26%, rgba(80,100,200,.28) 60%, rgba(40,40,110,.55) 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55), 0 0 calc(10px + var(--f,0)*50px) rgba(160,190,255,calc(.25 + var(--f,0)*.5))}
.tsm .tsmRitualLayer[data-rid="111"] .sgOrb.isOut{background:radial-gradient(circle at 38% 32%, rgba(255,255,255,.55) 0%, rgba(255,214,170,.3) 30%, rgba(200,140,120,.3) 64%, rgba(90,60,100,.5) 100%)}
.tsm .tsmRitualLayer[data-rid="111"] .sgRing{position:absolute;inset:-8px;transform:rotate(-90deg)}
.tsm .tsmRitualLayer[data-rid="111"] .sgCount{position:absolute;inset:0;display:grid;place-items:center;font-size:24px;font-weight:600;color:#fff;letter-spacing:-.02em;text-shadow:0 1px 6px rgba(0,0,0,.35)}
.tsm .tsmRitualLayer[data-rid="111"] .sgPips{position:absolute;left:50%;top:calc(100% + 14px);transform:translateX(-50%);display:flex;gap:8px}
.tsm .tsmRitualLayer[data-rid="111"] .sgPips i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3)}
.tsm .tsmRitualLayer[data-rid="111"] .sgPips i.on{background:#ffd9a0;box-shadow:0 0 8px #ffd9a0}
.tsm .tsmRitualLayer[data-rid="111"] .sgCue{position:absolute;left:16px;right:16px;text-align:center;color:#fff;pointer-events:none;text-shadow:0 1px 8px rgba(10,10,40,.5)}
.tsm .tsmRitualLayer[data-rid="111"] .sgCue b{display:block;font-size:19px;font-weight:600;letter-spacing:-.01em}
.tsm .tsmRitualLayer[data-rid="111"] .sgCue span{display:block;margin-top:4px;font-size:14px;font-weight:400;opacity:.85}
.tsm .tsmRitualLayer[data-rid="111"] .sgSipArrow{position:absolute;left:50%;top:-34px;margin-left:-9px;width:18px;height:18px;border-left:2.5px solid #ffe2b5;border-top:2.5px solid #ffe2b5;transform:rotate(45deg);animation:sgUp 1s ease-in-out infinite;opacity:0}
.tsm .tsmRitualLayer[data-rid="111"] .sgOrbWrap.ready .sgSipArrow{opacity:1}
@keyframes sgUp{0%{translate:0 8px;opacity:0}50%{opacity:1}100%{translate:0 -6px;opacity:0}}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="111"] .sgCloud,.tsm .tsmRitualLayer[data-rid="111"] .sgSea i,.tsm .tsmRitualLayer[data-rid="111"] .sgSipArrow{animation:none}}
`

const SIGH_CUES: Record<string, [string, string]> = {
    start: ["Hold the orb · breathe in", "in through your nose"],
    again: ["Again · hold and breathe in", "in through your nose"],
    in: ["in through the nose…", ""],
    ready: ["…one more sip ↑", "slide up while you hold"],
    sip: ["one more sip…", ""],
    full: ["now let go · slowly out", ""],
    out: ["slowly out through the mouth…", "like through a straw"],
    out1: ["slowly out through the mouth…", "like through a straw · no rush"],
    puff: ["Hold the orb a little longer", "bigger breath in, then let go"],
    easy: ["Tap the orb · we breathe together", "the slow out is what matters"],
    done: ["the storm has passed", "SYNC floats up to the moon…"],
    sleep: ["the storm has passed", "SYNC is fast asleep"],
}
const SIGH_OUT_S = [4.5, 5.5, 6, 6]
const SIGH_HAPPY = [61, 63, 70, 80]

function RitualBigSigh({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const n = ctx.before != null && ctx.before >= 8 ? 4 : 3
    const groups: number[][] = n === 3 ? [[0, 1], [2, 3], [4, 5]] : [[0, 1], [2, 3], [4], [5]]
    // the user's six chunks ride the six clouds, in leaving order
    const words = ctx.words
    const [cue, setCue] = React.useState<keyof typeof SIGH_CUES>("start")
    const [cycle, setCycle] = React.useState(0)
    const [left, setLeft] = React.useState<boolean[]>(() => Array(6).fill(false))
    const [face, setFace] = React.useState(44)
    const [fin, setFin] = React.useState<"" | "fly" | "sleep">("")
    const [orbState, setOrbState] = React.useState<"idle" | "in" | "ready" | "sip" | "full" | "out" | "puff">("idle")
    const [clr, setClr] = React.useState({ v: 0, t: 0 })
    const timers = useTimers()
    const orbRef = React.useRef<HTMLDivElement>(null)
    const ringRef = React.useRef<SVGCircleElement>(null)
    const countRef = React.useRef<HTMLDivElement>(null)
    const syncRef = React.useRef<HTMLDivElement>(null)
    const layerRef = React.useRef<HTMLDivElement>(null)
    const S = React.useRef({ phase: "idle" as string, fill: 0, t0: 0, from: 0, dur: 0, to: 0, holding: false, lowY: 0, earlySip: false, early: 0, easy: false, anyEarly: false, cycle: 0, pointers: new Set<number>(), readyAt: 0, fullAt: 0 })

    // ---- layout
    const cw = Math.floor(Math.min(122, (w - 44) / 3))
    const ch = Math.floor(cw * 0.74)
    const cloudPos = Array.from({ length: 6 }, (_, i) => ({ x: w * (0.19 + (i % 3) * 0.31), y: h * (0.11 + Math.floor(i / 3) * 0.17) + (i % 2 ? 10 : 0) }))
    const os = Math.round(Math.min(124, w * 0.32))
    const orbX = w * 0.62
    const orbY = h - 84 - os * 0.5 - 30
    const sy = Math.round(Math.min(78, w * 0.19))
    const islandX = w * 0.2
    const islandY = h * 0.66
    const moon = { x: w * 0.8, y: h * 0.1 }
    const R = os / 2 + 4
    const C = 2 * Math.PI * R

    const report = (p: number) => ctx.progress(p / 100)
    const base = () => (S.current.cycle * 100) / n

    const setFill = (f: number) => {
        S.current.fill = f
        const o = orbRef.current
        if (o) o.style.setProperty("--f", f.toFixed(3))
        if (ringRef.current) ringRef.current.style.strokeDashoffset = String(C * (1 - f))
        if (syncRef.current) syncRef.current.style.transform = `scale(${1 + f * 0.12})`
    }

    const tween = (to: number, ms: number, phase: string) => {
        const st = S.current
        st.from = st.fill
        st.to = to
        st.t0 = performance.now()
        st.dur = ms
        st.phase = phase
    }

    // ---- the breath loop
    useFrame(() => {
        const st = S.current
        if (st.dur <= 0) return
        const k = clamp01((performance.now() - st.t0) / st.dur)
        setFill(lerp(st.from, st.to, k))
        const sec = Math.ceil(((1 - k) * st.dur) / 1000)
        if (countRef.current) countRef.current.textContent = st.phase === "in" || st.phase === "out" ? String(Math.max(1, sec)) : ""
        if (st.phase === "out" && Math.random() < 0.5) {
            // the long exhale: wisps leave SYNC's mouth and push toward the sea
            ctx.fx.add({ x: islandX + sy * 0.4, y: islandY - sy * 0.55, vx: 90 + Math.random() * 60, vy: -20 + Math.random() * 20, drag: 0.98, max: 1.6, size: 10 + Math.random() * 8, grow: 18, shape: "smoke", color: "rgba(230,236,255,.22)", add: false })
        }
        if (st.phase === "in" && Math.random() < 0.4) {
            const a = Math.random() * Math.PI * 2
            const r = os * 0.95
            ctx.fx.add({ x: orbX + Math.cos(a) * r, y: orbY + Math.sin(a) * r, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, max: 0.9, size: 3, shape: "glow", color: "rgba(190,215,255,1)" })
        }
        if (k < 1) return
        st.dur = 0
        if (st.phase === "in") onFull72()
        else if (st.phase === "sip") onSipped()
        else if (st.phase === "out") onExhaled()
        else if (st.phase === "puff") {
            st.phase = "idle"
            setOrbState("idle")
        }
    }, true)

    const start = () => {
        const st = S.current
        if (st.phase !== "idle" && st.phase !== "puff") {
            ctx.sfx("soft")
            return
        }
        if (fin) return
        if (st.easy) {
            guided()
            return
        }
        ctx.sfx("soft")
        ctx.haptic(8)
        tween(0.72, 2000 * Math.max(0.15, (0.72 - st.fill) / 0.72), "in")
        setOrbState("in")
        setCue("in")
        report(base() + 3)
    }
    const onFull72 = () => {
        const st = S.current
        st.phase = "ready"
        st.readyAt = performance.now()
        setOrbState("ready")
        setCue("ready")
        ctx.sfx("tone")
        ctx.haptic(8)
        report(base() + 6)
        if (st.earlySip) return sip()
        timers.after(1000, () => {
            if (S.current.phase === "ready") sip()
        })
    }
    const sip = () => {
        const st = S.current
        if (st.phase !== "ready") return
        tween(1, 600, "sip")
        setOrbState("sip")
        setCue("sip")
        ctx.sfx("string")
        report(base() + 8)
    }
    const onSipped = () => {
        const st = S.current
        ctx.haptic(8)
        if (!st.holding) return exhale()
        st.phase = "full"
        setOrbState("full")
        setCue("full")
        timers.after(900, () => {
            if (S.current.phase === "full") exhale()
        })
    }
    const exhale = () => {
        const st = S.current
        const c = st.cycle
        const D = SIGH_OUT_S[Math.min(c, 3)] * 1000
        tween(0, D, "out")
        setOrbState("out")
        setCue(c === 0 ? "out1" : "out")
        report(base() + 10)
        ctx.haptic([8, 300, 8, 450, 8, 600, 8, 800, 8, 1000])
        ctx.rain(D / 1000)
        ctx.sfx("hum")
        // the sky turns toward dawn with every sigh; this cycle's clouds sail out to sea
        setClr({ v: (c + 1) / n, t: D / 1000 })
        const g = groups[c] || []
        setLeft((l) => l.map((v, j) => (g.includes(j) ? true : v)))
        g.forEach((j) => {
            const p = cloudPos[j]
            for (let k = 0; k < 18; k++) timers.after(k * (D / 22), () => ctx.fx.add({ x: p.x + (k / 18) * w * 0.3 * (j % 3 === 0 ? -1 : j % 3 === 2 ? 1 : 0) + (Math.random() - 0.5) * cw * 0.5, y: p.y + ch * 0.45, vx: 0, vy: 380, ay: 300, max: 0.8, size: 2, shape: "drop", color: "rgba(190,210,255,.7)", add: false }))
        })
    }
    const onExhaled = () => {
        const st = S.current
        st.cycle += 1
        setCycle(st.cycle)
        ctx.sfx("chime")
        ctx.haptic([12, 40, 18])
        ctx.fx.burst(orbX, orbY, { count: 16, shape: "glow", size: [4, 9], speed: [60, 200], life: [0.7, 1.2], colors: ["rgba(255,226,180,1)", "rgba(200,220,255,1)"] })
        if (st.cycle === 1) setFace(48)
        if (st.cycle >= n - 1) setFace(SIGH_HAPPY[ctx.seed % 4])
        report((st.cycle * 100) / n >= 100 ? 96 : (st.cycle * 100) / n)
        if (st.cycle >= n) return finale()
        st.phase = "idle"
        setOrbState("idle")
        setCue(st.easy ? "easy" : "again")
    }
    const guided = () => {
        // easy mode: one touch plays a whole sigh (in → sip → long out) at the same pace
        const st = S.current
        st.holding = true
        tween(0.72, 2000, "in")
        setOrbState("in")
        setCue("in")
        report(base() + 3)
        st.earlySip = true
        timers.after(2700, () => {
            S.current.holding = false
        })
    }
    const finale = () => {
        const layer = layerRef.current && (layerRef.current.closest(".tsmRitualLayer") as HTMLElement | null)
        if (layer) layer.classList.add("isDawn", "isFinale")
        ctx.hint("")
        setCue("done")
        setFin("fly")
        report(96)
        ctx.fx.burst(orbX, orbY, { count: 40, shape: "glow", size: [5, 12], speed: [80, 320], life: [1, 1.8], drag: 0.95, colors: ["rgba(255,236,190,1)", "rgba(255,200,150,1)", "rgba(255,255,255,1)"] })
        ;[0, 1, 2, 3].forEach((k) => timers.after(k * 180, () => ctx.sfx(k === 3 ? "bell" : "plink")))
        timers.after(2150, () => {
            setFin("sleep")
            setFace(90)
            setCue("sleep")
        })
        timers.after(2600, () => {
            report(100)
            ctx.sfx("win")
            ctx.haptic([20, 60, 20, 60, 40])
        })
        const bonus = clamp(280 + (n - 3) * 20 + (S.current.anyEarly ? 0 : 30), 260, 360)
        timers.after(3050, () => ctx.complete(bonus))
    }

    // ---- touch: the whole stage is the breath pad; the orb is the visual target
    const onDown = (e: React.PointerEvent) => {
        const st = S.current
        st.pointers.add(e.pointerId)
        try {
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch (err) {}
        if (st.pointers.size >= 2) {
            // a 2nd finger is the extra sip
            if (st.phase === "ready") sip()
            else if (st.phase === "in") st.earlySip = true
            return
        }
        st.holding = true
        st.lowY = e.clientY
        start()
    }
    const onMove = (e: React.PointerEvent) => {
        const st = S.current
        if (!st.holding) return
        st.lowY = Math.max(st.lowY, e.clientY)
        if (st.lowY - e.clientY >= 24) {
            if (st.phase === "ready") sip()
            else if (st.phase === "in") st.earlySip = true
        }
    }
    const onUp = (e: React.PointerEvent) => {
        const st = S.current
        st.pointers.delete(e.pointerId)
        if (st.pointers.size > 0) return
        if (!st.holding) return
        st.holding = false
        if (st.easy) return
        if (st.phase === "in") {
            // an early lift: the breath drains (no fail); two in a row → the guided easy mode
            st.early += 1
            st.anyEarly = true
            st.earlySip = false
            tween(0, 450, "puff")
            setOrbState("puff")
            if (st.early >= 2) {
                st.easy = true
                setCue("easy")
            } else setCue("puff")
            ctx.sfx("soft")
        } else if (st.phase === "ready") {
            exhale()
        } else if (st.phase === "full") {
            exhale()
        }
        // during "sip" the exhale starts when the sip ends (onSipped sees holding = false)
    }
    React.useEffect(() => {
        const st = S.current
        if (st.phase === "ready" || st.phase === "full") return
    }, [orbState])
    React.useEffect(() => {
        if (S.current.phase === "in") S.current.early = 0
    }, [cycle])
    React.useEffect(() => {
        ctx.hint("Hold · sip · let go slowly")
        setFill(0)
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp") {
                if (S.current.phase === "ready") sip()
                else if (S.current.phase === "in") S.current.earlySip = true
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    const syncPos = fin ? { x: moon.x, y: moon.y - sy * 0.15 } : { x: islandX, y: islandY - sy * 0.82 }
    const [main, sub] = SIGH_CUES[cue]
    return (
        <div ref={layerRef} style={{ position: "absolute", inset: 0 }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <div className="sgSky" />
            <div className="sgDawn" style={{ ["--clr" as any]: clr.v, ["--clrT" as any]: `${clr.t}s` }} />
            <div className="sgSun" style={{ top: h * 0.6 - 60 }} />
            <div className="sgSea">
                {[0, 1, 2, 3, 4].map((k) => (
                    <i key={k} style={{ ["--l" as any]: `${(k * 23) % 70}%`, ["--w" as any]: `${26 + (k % 3) * 10}%`, ["--t" as any]: `${12 + k * 18}%`, ["--d" as any]: `${6 + k}s` }} />
                ))}
            </div>
            <i className="sgMoon" style={{ left: moon.x - 32, top: moon.y - 32 }} />
            {cloudPos.map((p, i) => {
                const g = groups.findIndex((gr) => gr.includes(i))
                const dir = i % 3 === 0 ? -1 : i % 3 === 2 ? 1 : 0
                const D = SIGH_OUT_S[Math.min(g, 3)]
                return (
                    <div
                        key={i}
                        className={cx("sgCloud", left[i] && "leave")}
                        style={{ left: p.x, top: p.y, ["--cw" as any]: `${cw}px`, ["--ch" as any]: `${ch}px`, ["--fs" as any]: `${cw > 110 ? 13.5 : 12.5}px`, ["--fb" as any]: `${6 + (i % 3)}s`, ["--fd" as any]: `${-i}s`, ["--fx" as any]: `${i % 2 ? -4 : 4}px`, ["--out" as any]: `${D}s`, transform: left[i] ? `translate3d(${dir * w * 0.4}px, ${-h * 0.2}px, 0) scale(.62)` : undefined, opacity: left[i] ? 0 : 1 }}
                        aria-label={words[i] || "a cloud"}
                    >
                        <div className="sgPuff">
                            <i />
                            <i />
                            <i />
                            <i />
                        </div>
                        {ctx.uploaded ? <img src={ctx.pic(i, false) || ""} alt="" draggable={false} /> : null}
                        {words[i] ? <span>{words[i]}</span> : null}
                    </div>
                )
            })}
            <i className="sgIsland" style={{ left: islandX, top: islandY - 14 }} />
            <div ref={syncRef} className="sgSync" style={{ left: syncPos.x, top: syncPos.y - sy * 0.5, ["--sy" as any]: `${sy}px` }}>
                <img src={tsmFaceUrl("sync", face)} alt="SYNC" draggable={false} />
            </div>
            <div className="sgCue" style={{ top: h * 0.4 }} aria-live="polite">
                <b>{main}</b>
                {sub ? <span>{sub}</span> : null}
            </div>
            <div className={cx("sgOrbWrap", orbState === "ready" && "ready")} style={{ left: orbX, top: orbY, ["--os" as any]: `${os}px` }} role="button" aria-label="Breath orb. Press and hold to breathe in, slide up for one more sip, then let go to breathe out slowly.">
                <i className="sgSipArrow" />
                <div ref={orbRef} className={cx("sgOrb", orbState === "out" && "isOut")} />
                <svg className="sgRing" width={os + 16} height={os + 16} viewBox={`0 0 ${os + 16} ${os + 16}`} aria-hidden="true">
                    <circle cx={(os + 16) / 2} cy={(os + 16) / 2} r={R} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="4" />
                    <circle ref={ringRef} cx={(os + 16) / 2} cy={(os + 16) / 2} r={R} fill="none" stroke="#ffd9a0" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C} />
                    {[0.72, 1].map((f) => {
                        const a = f * Math.PI * 2
                        const cx0 = (os + 16) / 2
                        return <circle key={f} cx={cx0 + Math.cos(a) * R} cy={cx0 + Math.sin(a) * R} r="3.4" fill="#fff" />
                    })}
                </svg>
                <div ref={countRef} className="sgCount" />
                <div className="sgPips" aria-label={`Sigh ${Math.min(cycle + 1, n)} of ${n}`}>
                    {Array.from({ length: n }, (_, k) => (
                        <i key={k} className={k < cycle ? "on" : undefined} />
                    ))}
                </div>
            </div>
        </div>
    )
}

tsmRitual({ id: 111, hint: "Hold · sip · let go slowly", css: SIGH_CSS, Comp: RitualBigSigh })
