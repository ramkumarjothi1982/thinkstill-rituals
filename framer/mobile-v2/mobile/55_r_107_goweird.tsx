/* ================================================================== */
/* 107 · GO WEIRD — a pop-art dressing room                            */
/* ================================================================== */
// Desktop rules kept: 5 distinct props, each must land once (5/5 completes); dual input — tap a prop then
// tap the thought, OR drag the prop onto it (hit-test, a miss springs back with a soft sound); the user's
// words stay unchanged on the object; per-prop feedback copy; progress in 20 % steps; bonus 420.
// Mobile: one large character holds the whole thought (the desktop's 6 repeated cards are gone); the props
// sit in one thumb-row dock. Fixed: every prop lands on its OWN spot AROUND the character (googly eyes on the
// shoulder, party hat on top, star on the other shoulder, moustache under the chin, noodle arms at the sides)
// and never covers the face's eyes; each landing makes the character do a double-take and turns its face
// amused; the thought gets visibly sillier with every prop (rounder type, tilted words, rainbow, bounce,
// wobble) while the words themselves never change; the finale is a disco under a mirror ball.

interface GwProp {
    key: string
    name: string
    feedback: string
    // landing spot relative to the character centre, in diameters
    x: number
    y: number
    s: number
    r: number
}

const GW_PROPS: GwProp[] = [
    { key: "googly", name: "Googly eyes", feedback: "Seriousness −1", x: -0.47, y: -0.4, s: 0.32, r: -14 },
    { key: "moustache", name: "Moustache", feedback: "Grip ↓", x: 0, y: 0.56, s: 0.42, r: 0 },
    { key: "hat", name: "Party hat", feedback: "Drama shrunk", x: 0.06, y: -0.66, s: 0.34, r: 14 },
    { key: "star", name: "Star", feedback: "Spell broken", x: 0.48, y: -0.38, s: 0.26, r: 12 },
    { key: "arms", name: "Noodle arms", feedback: "Weird wins", x: 0, y: 0.08, s: 1.5, r: 0 },
]

function GwArt({ k, tile }: { k: string; tile?: boolean }) {
    if (k === "arms" && tile)
        return (
            <svg viewBox="0 0 60 60" aria-hidden="true">
                <path d="M22 50 C12 40 26 30 16 20 C12 15 12 11 14 8" fill="none" stroke="#ffb347" strokeWidth="6" strokeLinecap="round" />
                <path d="M38 50 C48 40 34 30 44 20 C48 15 48 11 46 8" fill="none" stroke="#ffb347" strokeWidth="6" strokeLinecap="round" />
                <circle cx="14" cy="8" r="6" fill="#fff" stroke="#e08a1e" strokeWidth="2" />
                <circle cx="46" cy="8" r="6" fill="#fff" stroke="#e08a1e" strokeWidth="2" />
            </svg>
        )
    if (k === "googly")
        return (
            <svg viewBox="0 0 64 34" aria-hidden="true">
                <circle cx="16" cy="17" r="14" fill="#fff" stroke="#1a1430" strokeWidth="3" />
                <circle cx="48" cy="17" r="14" fill="#fff" stroke="#1a1430" strokeWidth="3" />
                <g className="gwPupils">
                    <circle cx="20" cy="21" r="6.5" fill="#1a1430" />
                    <circle cx="44" cy="12" r="6.5" fill="#1a1430" />
                </g>
            </svg>
        )
    if (k === "moustache")
        return (
            <svg viewBox="0 0 80 28" aria-hidden="true">
                <path d="M40 9 C33 1 20 2 14 10 C10 15 5 17 1 13 C3 22 13 27 24 23 C31 21 36 17 40 14 C44 17 49 21 56 23 C67 27 77 22 79 13 C75 17 70 15 66 10 C60 2 47 1 40 9 Z" fill="#4a2a1a" stroke="#2a160c" strokeWidth="1.5" />
            </svg>
        )
    if (k === "hat")
        return (
            <svg viewBox="0 0 60 74" aria-hidden="true">
                <path d="M30 10 L54 66 Q30 76 6 66 Z" fill="#ff5fa8" stroke="#a3195f" strokeWidth="2" />
                <path d="M22 30 L38 30 M17 44 L44 46 M12 58 L50 60" stroke="#ffe36b" strokeWidth="5" strokeLinecap="round" />
                <circle cx="30" cy="9" r="8" fill="#53e0ff" stroke="#127f9c" strokeWidth="2" />
            </svg>
        )
    if (k === "star")
        return (
            <svg viewBox="0 0 50 50" aria-hidden="true">
                <path d="M25 2 L31 18 L48 18 L34 29 L39 46 L25 36 L11 46 L16 29 L2 18 L19 18 Z" fill="#ffd84a" stroke="#c98a00" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="20" cy="20" r="3" fill="#fff" />
            </svg>
        )
    return (
        <svg viewBox="0 0 150 60" aria-hidden="true">
            <path d="M28 30 C20 18 14 44 6 30 C2 22 4 14 8 10" fill="none" stroke="#ffb347" strokeWidth="6" strokeLinecap="round" />
            <path d="M122 30 C130 18 136 44 144 30 C148 22 146 14 142 10" fill="none" stroke="#ffb347" strokeWidth="6" strokeLinecap="round" />
            <circle cx="8" cy="9" r="6" fill="#fff" stroke="#e08a1e" strokeWidth="2" />
            <circle cx="142" cy="9" r="6" fill="#fff" stroke="#e08a1e" strokeWidth="2" />
        </svg>
    )
}

const GW_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="107"] .gwWorld{position:absolute;inset:0;background:
  radial-gradient(circle, rgba(255,255,255,.07) 0 2.5px, transparent 3px) 0 0/22px 22px,
  radial-gradient(70% 45% at 50% 42%, rgba(255,90,200,.30), transparent 70%),
  linear-gradient(180deg,#1b0e3a 0%,#2a1052 45%,#3b1158 75%,#1f0c36 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="107"] .gwWorld{background:
  radial-gradient(circle, rgba(255,120,180,.18) 0 2.5px, transparent 3px) 0 0/22px 22px,
  radial-gradient(70% 45% at 50% 42%, rgba(255,255,255,.9), transparent 70%),
  linear-gradient(180deg,#fff3b0 0%,#ffe0a8 45%,#ffc9d6 80%,#f4c4ff 100%)}
.tsm .tsmRitualLayer[data-rid="107"] .gwRays{position:absolute;left:50%;top:var(--cy);width:var(--rs);height:var(--rs);margin:calc(var(--rs)*-.5) 0 0 calc(var(--rs)*-.5);border-radius:50%;pointer-events:none;opacity:var(--ra,.35);transition:opacity .6s;
  background:repeating-conic-gradient(from 0deg, rgba(255,120,220,.35) 0 9deg, transparent 9deg 22deg);animation:gwSpin 40s linear infinite;
  -webkit-mask-image:radial-gradient(closest-side, #000 20%, transparent 100%);mask-image:radial-gradient(closest-side, #000 20%, transparent 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="107"] .gwRays{background:repeating-conic-gradient(from 0deg, rgba(255,150,60,.35) 0 9deg, transparent 9deg 22deg)}
@keyframes gwSpin{to{transform:rotate(360deg)}}
.tsm .tsmRitualLayer[data-rid="107"] .gwHero{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);touch-action:none;cursor:pointer}
.tsm .tsmRitualLayer[data-rid="107"] .gwDT{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="107"] .gwDT.go{animation:gwDouble .62s cubic-bezier(.3,1.5,.5,1)}
@keyframes gwDouble{0%{transform:none}18%{transform:rotate(-10deg) scale(1.06,.92)}38%{transform:rotate(8deg) scale(.96,1.06)}58%{transform:rotate(-4deg) scale(1.04)}100%{transform:none}}
.tsm .tsmRitualLayer[data-rid="107"] .gwHero.wiggle .gwDT{animation:gwWiggle .9s ease-in-out infinite}
@keyframes gwWiggle{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg) translateY(-4px)}}
.tsm .tsmRitualLayer[data-rid="107"] .gwHero.disco .gwDT{animation:gwDance .5s cubic-bezier(.3,0,.6,1) infinite alternate}
@keyframes gwDance{0%{transform:translateY(0) rotate(-8deg) scale(1.04,.96)}100%{transform:translateY(-22px) rotate(8deg) scale(.97,1.05)}}
.tsm .tsmRitualLayer[data-rid="107"] .gwHero .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="107"] .gwHero.ready .orbAura{opacity:.9;animation:tsmPulse 1s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords{position:absolute;left:12%;right:12%;text-align:center;line-height:1.2;font-weight:500;color:var(--orbText);text-shadow:var(--orbTextShadow);pointer-events:none}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords span{display:inline-block;margin:0 .14em;transition:color .4s}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l1{font-family:${FONT_ROUND};font-weight:700}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l1 span{transform:rotate(var(--r))}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n+1){color:#ff7ab8}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n+2){color:#ffd84a}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n+3){color:#6ee7ff}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n+4){color:#a8ff7a}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n){color:#c9a2ff}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n+1){color:#d81b74}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n+2){color:#c27a00}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n+3){color:#0a8fb3}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n+4){color:#3c9a12}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="107"] .gwWords.l2 span:nth-child(5n){color:#7b3fd6}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l3 span{animation:gwBob .8s ease-in-out infinite alternate;animation-delay:var(--dl)}
@keyframes gwBob{0%{transform:translateY(1px) rotate(var(--r))}100%{transform:translateY(-4px) rotate(calc(var(--r)*-1))}}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l4 span:nth-child(2n){font-size:1.18em}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l4 span:nth-child(2n+1){font-size:.92em}
.tsm .tsmRitualLayer[data-rid="107"] .gwWords.l5 span{animation:gwBob .45s ease-in-out infinite alternate;animation-delay:var(--dl);letter-spacing:.04em}
.tsm .tsmRitualLayer[data-rid="107"] .gwStick{position:absolute;left:50%;top:50%;width:var(--sw);height:var(--sw);margin:calc(var(--sw)*-.5) 0 0 calc(var(--sw)*-.5);pointer-events:none;animation:gwLand .55s cubic-bezier(.3,1.7,.45,1) both}
.tsm .tsmRitualLayer[data-rid="107"] .gwStick svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 3px 4px rgba(20,0,40,.35));transform:rotate(var(--rot))}
@keyframes gwLand{0%{transform:translate(var(--tx),var(--ty)) scale(0) rotate(-30deg)}60%{transform:translate(var(--tx),var(--ty)) scale(1.25) rotate(8deg)}100%{transform:translate(var(--tx),var(--ty)) scale(1)}}
.tsm .tsmRitualLayer[data-rid="107"] .gwStick.k-googly .gwPupils{animation:gwJiggle .7s ease-in-out infinite;transform-origin:32px 17px}
@keyframes gwJiggle{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,2px)}50%{transform:translate(2px,-3px)}75%{transform:translate(-2px,-1px)}}
.tsm .tsmRitualLayer[data-rid="107"] .gwStick.k-star svg{animation:gwTwinkle 2.4s ease-in-out infinite}
@keyframes gwTwinkle{0%,100%{transform:rotate(var(--rot)) scale(1)}50%{transform:rotate(calc(var(--rot) + 20deg)) scale(1.12)}}
.tsm .tsmRitualLayer[data-rid="107"] .gwTile{position:absolute;width:var(--td);height:var(--td);border-radius:22px;touch-action:none;cursor:grab;z-index:6;will-change:transform;
  background:linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.06));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28), 0 8px 18px rgba(10,0,30,.35);transition:transform .14s cubic-bezier(.3,1.6,.5,1), opacity .3s}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="107"] .gwTile{background:linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.6));box-shadow:inset 0 0 0 1.5px rgba(160,80,160,.25), 0 8px 18px rgba(160,60,120,.2)}
.tsm .tsmRitualLayer[data-rid="107"] .gwTile svg{position:absolute;left:14%;top:14%;width:72%;height:72%;overflow:visible;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="107"] .gwTile.sel{transform:translateY(-10px) scale(1.08);box-shadow:inset 0 0 0 3px #ffd84a, 0 12px 26px rgba(255,180,40,.45)}
.tsm .tsmRitualLayer[data-rid="107"] .gwTile.used{opacity:.18;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="107"] .gwDisco{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .4s}
.tsm .tsmRitualLayer[data-rid="107"] .gwDisco.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="107"] .gwDisco i:nth-child(1){position:absolute;inset:0;background:rgba(10,0,30,.45)}
.tsm .tsmRitualLayer[data-rid="107"] .gwDisco i:nth-child(2){position:absolute;left:50%;top:30%;width:200vmax;height:200vmax;margin:-100vmax 0 0 -100vmax;border-radius:50%;
  background:repeating-conic-gradient(from 0deg, rgba(255,80,200,.4) 0 6deg, transparent 6deg 20deg, rgba(80,220,255,.4) 20deg 26deg, transparent 26deg 40deg, rgba(255,230,80,.4) 40deg 46deg, transparent 46deg 60deg);animation:gwSpin 3s linear infinite}
.tsm .tsmRitualLayer[data-rid="107"] .gwBall{position:absolute;left:50%;top:0;width:64px;height:64px;margin-left:-32px;border-radius:50%;pointer-events:none;transform:translateY(-120px);transition:transform .7s cubic-bezier(.3,1.4,.5,1);
  background:radial-gradient(circle at 35% 30%, #fff 0 8%, transparent 20%),repeating-linear-gradient(0deg, #9aa6c8 0 7px, #e8eeff 7px 9px),#c8d2f0;box-shadow:0 0 30px rgba(255,255,255,.6)}
.tsm .tsmRitualLayer[data-rid="107"] .gwBall::before{content:"";position:absolute;left:50%;top:-200px;width:2px;height:200px;background:rgba(220,220,255,.7)}
.tsm .tsmRitualLayer[data-rid="107"] .gwBall.on{transform:translateY(22px)}
.tsm .tsmRitualLayer[data-rid="107"] .rdc .gwRays,.tsm .tsmRitualLayer[data-rid="107"] .rdc .gwWords span,.tsm .tsmRitualLayer[data-rid="107"] .rdc .gwHero .gwDT,.tsm .tsmRitualLayer[data-rid="107"] .rdc .gwDisco i{animation:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="107"] .gwRays,.tsm .tsmRitualLayer[data-rid="107"] .gwWords span,.tsm .tsmRitualLayer[data-rid="107"] .gwHero.wiggle .gwDT,.tsm .tsmRitualLayer[data-rid="107"] .gwDisco i{animation:none}}
`

function RitualGoWeird({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = GW_PROPS.length
    const [landed, setLanded] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [sel, setSel] = React.useState(-1)
    const [dt, setDt] = React.useState(0)
    const [disco, setDisco] = React.useState(false)
    const landedRef = useLatest(landed)
    const selRef = useLatest(sel)
    const timers = useTimers()
    const rootRef = React.useRef<HTMLDivElement>(null)
    const tileRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const dtRef = React.useRef<HTMLDivElement>(null)
    const busy = React.useRef(false)

    // layout: the character centre stage with room for a hat above and a moustache below; one dock row
    const td = Math.round(clamp((w - 24 - 4 * 8) / 5, 60, 74))
    const dockTop = h - 76 - td - 6
    const d = Math.round(clamp(Math.min(w * 0.62, (dockTop - 40) / 1.72), 150, 250))
    const hx = w / 2
    const hy = Math.round(20 + d * 0.86 + (dockTop - 20 - d * 1.62) * 0.45)
    const gap = (w - 24 - 5 * td) / 4
    const tilePos = (k: number) => ({ x: 12 + k * (td + gap), y: dockTop })

    const thought = React.useMemo(() => thoughtLine(ctx.thought || ctx.words.filter(Boolean).join(" "), 64), [])
    const words = thought ? thought.split(" ").filter(Boolean) : []
    const textTop = d * 0.085 + d * 0.6 + d * 0.03
    const px = fitThoughtPx(thought, d * 0.72, d * 0.2, Math.min(17, d * 0.085), 11, 1.2)
    const n = landed.filter(Boolean).length
    const amused = n > 0

    const place = (k: number) => {
        if (landedRef.current[k] || busy.current) return
        const next = landedRef.current.map((v, j) => (j === k ? true : v))
        setLanded(next)
        setSel(-1)
        setDt((v) => v + 1)
        const c = next.filter(Boolean).length
        ctx.progress(c / N)
        ctx.sfx("plink")
        timers.after(70, () => ctx.sfx(c === N ? "chime" : "pop"))
        ctx.haptic(c === N ? 24 : 9)
        const pr = GW_PROPS[k]
        const sx = hx + pr.x * d
        const sy = hy + pr.y * d
        ctx.fx.burst(sx, sy, { count: 16, shape: "spark", size: [2, 3.5], speed: [140, 320], life: [0.4, 0.8], drag: 0.92, colors: ["rgba(255,120,210,1)", "rgba(255,230,90,1)", "rgba(110,230,255,1)"] })
        ctx.fx.burst(sx, sy, { count: 1, shape: "ring", size: [d * 0.1, d * 0.1], grow: d * 0.6, life: [0.45, 0.45], speed: [0, 0], colors: ["rgba(255,255,255,.8)"], add: true })
        if (c === N) finale()
        else ctx.hint(`${pr.feedback} · ${N - c} prop${N - c > 1 ? "s" : ""} to go`)
    }

    const finale = () => {
        busy.current = true
        timers.after(700, () => {
            ctx.hint("")
            setDisco(true)
            ctx.sfx("bell")
        })
        // a little disco: the beat, confetti, every prop still on
        for (let b = 0; b < 4; b++)
            timers.after(900 + b * 330, () => {
                ctx.sfx(b % 2 ? "plink" : "pop")
                ctx.haptic(10)
                ctx.fx.burst(b % 2 ? w * 0.15 : w * 0.85, h * 0.2, { count: 18, shape: "paper", size: [5, 9], speed: [160, 380], angle: b % 2 ? [-1.2, 0.2] : [Math.PI - 0.2, Math.PI + 1.2], life: [1.2, 1.8], gravity: 380, drag: 0.97, spin: 8, colors: ["#ff5fa8", "#ffd84a", "#53e0ff", "#9cff6b", "#b98cff"], add: false })
            })
        timers.after(2300, () => {
            ctx.sfx("chime")
            ctx.haptic([20, 60, 20])
        })
        timers.after(3000, () => {
            ctx.sfx("win")
            ctx.complete(420)
        })
    }

    const spring = (k: number) => {
        const el = tileRefs.current[k]
        if (!el) return
        el.style.transition = "transform .5s cubic-bezier(.3,1.6,.5,1)"
        el.style.transform = ""
        timers.after(520, () => el && (el.style.transition = ""))
    }

    const tileOpts = (k: number): DragOpts => ({
        relativeTo: rootRef,
        onStart: () => {
            if (landedRef.current[k] || busy.current) return false
            ctx.sfx("tap")
            ctx.haptic(6)
        },
        onTap: () => {
            const on = selRef.current === k ? -1 : k
            setSel(on)
            if (on >= 0) ctx.hint(`${GW_PROPS[k].name} · now tap the thought`)
        },
        onMove: (i) => {
            const el = tileRefs.current[k]
            if (!el || Math.hypot(i.dx, i.dy) < 10) return
            el.style.transition = "none"
            el.style.transform = `translate3d(${i.dx}px,${i.dy}px,0) scale(1.22) rotate(${clamp(i.vx / 90, -14, 14)}deg)`
        },
        onEnd: (i, cancelled) => {
            if (Math.hypot(i.dx, i.dy) < 10) return
            if (!cancelled && dist(i.x, i.y, hx, hy) < d * 0.72) {
                const el = tileRefs.current[k]
                if (el) {
                    el.style.transition = "transform .2s ease, opacity .2s"
                    el.style.transform = `translate3d(${i.dx}px,${i.dy}px,0) scale(.4)`
                }
                place(k)
                timers.after(220, () => el && ((el.style.transition = ""), (el.style.transform = "")))
            } else {
                // missed: it springs home
                spring(k)
                ctx.sfx("soft")
                ctx.haptic(5)
                ctx.hint("Drop it on the thought")
            }
        },
    })
    // five fixed hooks, called unconditionally (the prop count never changes)
    const binds = [useDrag(tileOpts(0)), useDrag(tileOpts(1)), useDrag(tileOpts(2)), useDrag(tileOpts(3)), useDrag(tileOpts(4))]

    const tapHero = (e: React.PointerEvent) => {
        e.preventDefault()
        if (busy.current) return
        const k = selRef.current
        if (k >= 0) place(k)
        else {
            setDt((v) => v + 1)
            ctx.sfx("soft")
            ctx.haptic(5)
            ctx.hint("Pick a prop below first")
        }
    }

    React.useEffect(() => {
        const el = dtRef.current
        if (!el || !dt) return
        el.classList.remove("go")
        void el.offsetWidth
        el.classList.add("go")
    }, [dt])

    React.useEffect(() => {
        ctx.hint("Drag or tap a prop onto the thought")
    }, [])

    const pic = ctx.uploaded ? ctx.pic(0, amused) : amused ? ctx.hero.calm : ctx.hero.loud
    return (
        <div ref={rootRef} className={ctx.reduced ? "rdc" : undefined} style={{ position: "absolute", inset: 0 }}>
            <div className="gwWorld" />
            <i className="gwRays" style={{ ["--cy" as any]: `${hy}px`, ["--rs" as any]: `${Math.max(w, h) * 1.2}px`, ["--ra" as any]: 0.25 + n * 0.12 }} />
            <div className={cx("gwDisco", disco && "on")}>
                <i />
                <i />
            </div>
            <i className={cx("gwBall", disco && "on")} />
            <div
                className={cx("gwHero", sel >= 0 && "ready", landed[4] && !disco && "wiggle", disco && "disco")}
                style={{ left: hx, top: hy, ["--d" as any]: `${d}px` }}
                onPointerDown={tapHero}
                role="button"
                aria-label={`Your thought: ${thought}${sel >= 0 ? ` — place ${GW_PROPS[sel].name}` : ""}`}
            >
                <div className="gwDT" ref={dtRef}>
                    <Orb src={pic} text={"\u200b"} d={d} hue={ctx.uploaded ? ctx.hue(0) : ctx.hero.hue} hue2={320} mood={amused ? "happy" : "nervous"} aura={sel >= 0 ? 0.9 : n * 0.15} uploaded={ctx.uploaded}>
                        <div className={cx("gwWords", n >= 1 && "l1", n >= 2 && "l2", n >= 3 && "l3", n >= 4 && "l4", n >= 5 && "l5")} style={{ top: textTop, fontSize: px }}>
                            {words.map((wd, j) => (
                                <span key={j} style={{ ["--r" as any]: `${(j % 2 ? 1 : -1) * (3 + (j % 3) * 2)}deg`, ["--dl" as any]: `${-j * 0.13}s` }}>
                                    {wd}
                                </span>
                            ))}
                        </div>
                        {GW_PROPS.map((pr, k) =>
                            landed[k] ? (
                                <span key={pr.key} className={cx("gwStick", `k-${pr.key}`)} style={{ ["--sw" as any]: `${pr.s * d}px`, ["--tx" as any]: `${pr.x * d}px`, ["--ty" as any]: `${pr.y * d}px`, ["--rot" as any]: `${pr.r}deg` }}>
                                    <GwArt k={pr.key} />
                                </span>
                            ) : null
                        )}
                    </Orb>
                </div>
            </div>
            {GW_PROPS.map((pr, k) => {
                const p = tilePos(k)
                return (
                    <div
                        key={pr.key}
                        ref={(el) => (tileRefs.current[k] = el)}
                        className={cx("gwTile", sel === k && "sel", landed[k] && "used")}
                        style={{ left: p.x, top: p.y, ["--td" as any]: `${td}px`, opacity: disco ? 0 : undefined }}
                        {...binds[k]}
                        role="button"
                        aria-label={`${pr.name}${landed[k] ? " (on)" : ""}`}
                    >
                        <GwArt k={pr.key} tile />
                    </div>
                )
            })}
        </div>
    )
}

tsmRitual({ id: 107, hint: "Drag or tap a prop onto the thought", css: GW_CSS, Comp: RitualGoWeird })
