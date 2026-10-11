/* ================================================================== */
/* 88 · TRADE MACHINE — a neon arcade vending machine                  */
/* ================================================================== */
// Desktop rules kept (E12): per word, the thought-token goes into the machine first, then exactly one of
// TIME / SPACE / LAUGH is picked and the machine pays out ("YOU GOT X"); every choice is valid; 6 trades, then
// finish with bonus 250. Upgraded per founder §13.30: the insert is physical — the user drags the token into
// the coin slot (a short drag springs back, no credit) — and each prize has its own payout: TIME spins a clock
// and pours golden sand, SPACE blows the window open into drifting stars, LAUGH bounces confetti and "ha"s.
// Fixed: progress moves only on a completed trade (no 50 % label/bar mismatch); the token's face turns happy
// the moment its trade pays out; the hit target never pulses.

type TmPrize = "TIME" | "SPACE" | "LAUGH"
const TM_PRIZES: TmPrize[] = ["TIME", "SPACE", "LAUGH"]
const TM_HUE: Record<TmPrize, number> = { TIME: 42, SPACE: 205, LAUGH: 330 }

const TRADE_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="88"] .tmBg{position:absolute;inset:0;background:
  radial-gradient(70% 40% at 50% 30%, rgba(255,80,190,.22) 0%, transparent 70%),
  radial-gradient(60% 40% at 50% 100%, rgba(60,200,255,.20) 0%, transparent 70%),
  linear-gradient(180deg,#0e0a24 0%,#1a1040 46%,#140c30 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="88"] .tmBg{background:
  radial-gradient(70% 40% at 50% 30%, rgba(255,150,210,.45) 0%, transparent 70%),
  radial-gradient(60% 40% at 50% 100%, rgba(120,210,255,.45) 0%, transparent 70%),
  linear-gradient(180deg,#fff0f6 0%,#f1e8ff 50%,#e4f2ff 100%)}
.tsm .tsmRitualLayer[data-rid="88"] .tmFloor{position:absolute;left:0;right:0;bottom:0;height:38%;
  background:repeating-linear-gradient(90deg, rgba(120,200,255,.10) 0 1px, transparent 1px 44px),linear-gradient(180deg,transparent,rgba(80,40,140,.35));
  -webkit-mask-image:linear-gradient(180deg,transparent,#000 40%);mask-image:linear-gradient(180deg,transparent,#000 40%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="88"] .tmFloor{background:repeating-linear-gradient(90deg, rgba(120,90,200,.12) 0 1px, transparent 1px 44px),linear-gradient(180deg,transparent,rgba(200,170,255,.35))}
.tsm .tsmRitualLayer[data-rid="88"] .tmCab{position:absolute;border-radius:34px 34px 22px 22px;
  background:linear-gradient(90deg,rgba(255,255,255,.10) 0%,transparent 14%,transparent 86%,rgba(0,0,0,.25) 100%),linear-gradient(180deg,#3a1f6e 0%,#2a1858 55%,#21124a 100%);
  box-shadow:inset 0 0 0 2px rgba(255,120,220,.55), inset 0 0 22px rgba(255,90,200,.25), 0 0 34px rgba(255,80,200,.25), 0 24px 40px rgba(0,0,0,.45)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="88"] .tmCab{background:linear-gradient(90deg,rgba(255,255,255,.5) 0%,transparent 14%,transparent 86%,rgba(120,60,140,.12) 100%),linear-gradient(180deg,#ffd3ec 0%,#f6c4e6 55%,#eab7dd 100%);
  box-shadow:inset 0 0 0 2px rgba(220,80,170,.55), inset 0 0 22px rgba(255,255,255,.5), 0 18px 34px rgba(150,80,140,.25)}
.tsm .tsmRitualLayer[data-rid="88"] .tmBulbs{position:absolute;left:22px;right:22px;top:12px;height:12px;border-radius:6px;
  background:radial-gradient(circle at 50% 50%, #fff2c4 0 2.5px, rgba(255,200,90,.9) 3px, rgba(255,170,60,0) 6px) 0 0/18px 12px repeat-x}
.tsm .tsmRitualLayer[data-rid="88"] .tmBulbs.b2{background:radial-gradient(circle at 50% 50%, #ffd1f0 0 2.5px, rgba(255,90,200,.9) 3px, rgba(255,90,200,0) 6px) 9px 0/18px 12px repeat-x;animation:tmBlink 1.2s steps(2,end) infinite}
@keyframes tmBlink{0%{opacity:1}100%{opacity:.15}}
.tsm .tsmRitualLayer[data-rid="88"] .tmRoot.isFin .tmBulbs.b2{animation-duration:.24s}
.tsm .tsmRitualLayer[data-rid="88"] .tmWin{position:absolute;border-radius:24px;overflow:hidden;
  background:radial-gradient(80% 70% at 50% 40%, rgba(120,90,255,.30), transparent 70%),linear-gradient(180deg,#140a30,#0b0620);
  box-shadow:inset 0 0 0 2px rgba(160,220,255,.45), inset 0 10px 24px rgba(0,0,0,.6)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="88"] .tmWin{background:radial-gradient(80% 70% at 50% 40%, rgba(255,255,255,.95), rgba(230,220,255,.8) 70%),linear-gradient(180deg,#f4efff,#e2d8ff);
  box-shadow:inset 0 0 0 2px rgba(150,120,230,.55), inset 0 8px 20px rgba(120,90,200,.25)}
.tsm .tsmRitualLayer[data-rid="88"] .tmWin .tmGloss{position:absolute;left:6%;top:4%;width:40%;height:34%;border-radius:50%;background:radial-gradient(ellipse at 40% 40%, rgba(255,255,255,.28), transparent 70%);transform:rotate(-18deg);pointer-events:none}
.tsm .tsmRitualLayer[data-rid="88"] .tmGear{position:absolute;border-radius:50%;border:2px dashed rgba(160,220,255,.35);animation:tmSpin 14s linear infinite}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="88"] .tmGear{border-color:rgba(130,100,220,.35)}
.tsm .tsmRitualLayer[data-rid="88"] .tmGear.g2{border-style:dotted;border-width:3px;animation-direction:reverse;animation-duration:9s}
.tsm .tsmRitualLayer[data-rid="88"] .tmRoot.isWork .tmGear{animation-duration:1.2s}
.tsm .tsmRitualLayer[data-rid="88"] .tmRoot.isWork .tmGear.g2{animation-duration:.8s}
@keyframes tmSpin{to{transform:rotate(360deg)}}
.tsm .tsmRitualLayer[data-rid="88"] .tmInner{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);animation:tmDrop .5s cubic-bezier(.3,1.5,.5,1) both}
@keyframes tmDrop{0%{opacity:0;transform:translateY(-40px) scale(.5) rotate(-30deg)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="88"] .tmInner.out{animation:tmOut .5s ease-in forwards}
@keyframes tmOut{to{opacity:0;transform:translateY(60px) scale(.6)}}
.tsm .tsmRitualLayer[data-rid="88"] .tmInner .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="88"] .tmPrize{position:absolute;pointer-events:none;opacity:0;overflow:hidden;border-radius:24px}
.tsm .tsmRitualLayer[data-rid="88"] .tmReels{position:absolute;display:flex;align-items:center;justify-content:space-around;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="88"] .tmReels span{display:flex;align-items:center;justify-content:center;width:var(--r);height:var(--r);border-radius:50%;
  background:radial-gradient(circle at 40% 30%, hsla(var(--h),100%,80%,.95), hsla(var(--h),85%,52%,.95) 70%);box-shadow:0 0 26px hsla(var(--h),100%,65%,.6), inset 0 -4px 0 hsla(var(--h),70%,30%,.5);
  animation:tmReel .7s cubic-bezier(.3,1.6,.5,1) both}
@keyframes tmReel{0%{opacity:0;transform:translateY(-60px) scale(.4) rotate(-90deg)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="88"] .tmPrize.on{opacity:1;transition:opacity .2s}
.tsm .tsmRitualLayer[data-rid="88"] .tmPrize svg{position:absolute;left:50%;top:50%;overflow:visible}
.tsm .tsmRitualLayer[data-rid="88"] .tmClockHand{transform-box:fill-box;transform-origin:50% 100%;animation:tmSpin .9s linear infinite}
.tsm .tsmRitualLayer[data-rid="88"] .tmClockHand.slow{transform-origin:0% 50%;animation-duration:6s}
.tsm .tsmRitualLayer[data-rid="88"] .tmSpaceRing{transform-box:fill-box;transform-origin:50% 50%;animation:tmOpen 1.3s cubic-bezier(.2,.8,.2,1) both}
@keyframes tmOpen{0%{transform:scale(.2);opacity:1}100%{transform:scale(1.6);opacity:0}}
.tsm .tsmRitualLayer[data-rid="88"] .tmSlot{position:absolute;width:var(--sw);height:16px;margin:-8px 0 0 calc(var(--sw)*-.5);border-radius:8px;background:linear-gradient(180deg,#05020e,#1a0e33);
  box-shadow:0 0 0 2px rgba(255,214,120,.75), 0 0 16px rgba(255,200,90,.45);transition:transform .2s cubic-bezier(.3,1.6,.5,1)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="88"] .tmSlot{background:linear-gradient(180deg,#3b2050,#5a3478);box-shadow:0 0 0 2px rgba(220,150,40,.85), 0 0 12px rgba(255,190,80,.55)}
.tsm .tsmRitualLayer[data-rid="88"] .tmSlot.hot{transform:scale(1.25)}
.tsm .tsmRitualLayer[data-rid="88"] .tmSlot b{position:absolute;inset:-14px -20px;border-radius:20px;background:radial-gradient(closest-side, rgba(255,210,110,.5), transparent);opacity:0;transition:opacity .2s}
.tsm .tsmRitualLayer[data-rid="88"] .tmSlot.hot b{opacity:1}
.tsm .tsmRitualLayer[data-rid="88"] .tmChev{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-left:3px solid rgba(255,214,120,.95);border-top:3px solid rgba(255,214,120,.95);border-radius:3px 0 0 0;animation:tmChev 1.6s ease-in-out infinite;animation-delay:var(--cd)}
@keyframes tmChev{0%,100%{opacity:.12}40%{opacity:.9}}
.tsm .tsmRitualLayer[data-rid="88"] .tmTok{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5)}
.tsm .tsmRitualLayer[data-rid="88"] .tmTokPop{position:absolute;inset:0;animation:tmTokIn .5s cubic-bezier(.3,1.6,.5,1) both}
@keyframes tmTokIn{0%{opacity:0;transform:translateY(30px) scale(.6)}100%{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="88"] .tmTokDrag{position:absolute;inset:0;touch-action:none;cursor:grab;will-change:transform}
.tsm .tsmRitualLayer[data-rid="88"] .tmTokBob{position:absolute;inset:0;animation:tmBob 3.8s ease-in-out infinite}
@keyframes tmBob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
.tsm .tsmRitualLayer[data-rid="88"] .tmTokDrag.held .tmTokBob{animation:none}
.tsm .tsmRitualLayer[data-rid="88"] .tmTok .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="88"] .tmTok .tmCoinRim{position:absolute;inset:-5px;border-radius:50%;border:3px solid rgba(255,206,110,.85);box-shadow:0 0 18px rgba(255,190,80,.4), inset 0 0 0 2px rgba(255,240,200,.35);pointer-events:none}
.tsm .tsmRitualLayer[data-rid="88"] .tmBtn{position:absolute;height:64px;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;touch-action:none;
  font-size:14px;font-weight:700;letter-spacing:.12em;color:#fff;transition:transform .14s cubic-bezier(.3,1.6,.5,1), opacity .3s ease;
  background:linear-gradient(180deg,hsla(var(--h),90%,62%,1),hsla(var(--h),80%,44%,1));box-shadow:inset 0 2px 0 rgba(255,255,255,.35), inset 0 -4px 0 hsla(var(--h),70%,28%,.7), 0 8px 18px hsla(var(--h),80%,30%,.4)}
.tsm .tsmRitualLayer[data-rid="88"] .tmBtn svg{width:22px;height:22px}
.tsm .tsmRitualLayer[data-rid="88"] .tmBtn.off{opacity:.32}
.tsm .tsmRitualLayer[data-rid="88"] .tmBtn.press{transform:translateY(3px) scale(.96)}
.tsm .tsmRitualLayer[data-rid="88"] .tmBtn.picked{transform:translateY(-4px) scale(1.04)}
.tsm .tsmRitualLayer[data-rid="88"] .tmCap{position:absolute;left:20px;right:20px;text-align:center;color:#ffe9c4;opacity:0;transform:translateY(8px);transition:opacity .9s ease, transform .9s ease;pointer-events:none;text-shadow:0 2px 12px rgba(20,0,40,.7)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="88"] .tmCap{color:#5a2a6a;text-shadow:0 1px 0 rgba(255,255,255,.8)}
.tsm .tsmRitualLayer[data-rid="88"] .tmCap.on{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="88"] .tmCap small{display:block;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.8;margin-bottom:6px}
.tsm .tsmRitualLayer[data-rid="88"] .tmCap b{display:block;font-size:20px;font-weight:600}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="88"] .tmGear,.tsm .tsmRitualLayer[data-rid="88"] .tmBulbs.b2,.tsm .tsmRitualLayer[data-rid="88"] .tmTokBob,.tsm .tsmRitualLayer[data-rid="88"] .tmChev{animation:none}}
`

function tmAnim(el: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) {
    try {
        if (el && (el as any).animate) (el as HTMLElement).animate(kf, o)
    } catch (e) {}
}

function TmIcon({ k, size = 22, color = "#fff" }: { k: TmPrize; size?: number; color?: string }) {
    if (k === "TIME")
        return (
            <svg viewBox="-12 -12 24 24" width={size} height={size} aria-hidden="true">
                <circle r="9.5" fill="none" stroke={color} strokeWidth="2.2" />
                <path d="M0 0 V-6 M0 0 L4.5 2.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            </svg>
        )
    if (k === "SPACE")
        return (
            <svg viewBox="-12 -12 24 24" width={size} height={size} aria-hidden="true">
                <circle r="9.5" fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 3" />
                <path d="M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4 Z" fill={color} />
            </svg>
        )
    return (
        <svg viewBox="-12 -12 24 24" width={size} height={size} aria-hidden="true">
            <circle r="9.5" fill="none" stroke={color} strokeWidth="2.2" />
            <path d="M-5 1.5 Q0 7.5 5 1.5" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M-4.5 -3.5 L-2 -2.5 M4.5 -3.5 L2 -2.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function RitualTrade({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [phase, setPhase] = React.useState<"ready" | "in" | "prize" | "finale">("ready")
    const [prize, setPrize] = React.useState<TmPrize | null>(null)
    const [press, setPress] = React.useState(-1)
    const [held, setHeld] = React.useState(false)
    const [leave, setLeave] = React.useState(false)
    const [cap, setCap] = React.useState(false)
    const [got, setGot] = React.useState<TmPrize[]>([])
    const st = React.useRef({ idx: 0, phase: "ready" as string, hot: false, got: [] as TmPrize[] })
    const tokRef = React.useRef<HTMLDivElement>(null)
    const slotRef = React.useRef<HTMLDivElement>(null)
    const cabRef = React.useRef<HTMLDivElement>(null)
    const innerRef = React.useRef<HTMLDivElement>(null)
    const timers = useTimers()

    // layout: machine on top, the token resting under its coin slot, one row of three prize buttons at the bottom
    const U = h - 84
    const btnY = U - 36
    const tokD = Math.round(clamp(U * 0.19, 100, 124))
    const tokX = w / 2
    const tokY = Math.round(btnY - 32 - 26 - tokD / 2)
    const mw = Math.min(310, w - 44)
    const mx = (w - mw) / 2
    const mBot = tokY - tokD / 2 - 26
    const slotX = w / 2
    const slotY = mBot - 30
    const winX = mx + 18
    const winW = mw - 36
    // the window never grows taller than it is wide (tall phones get a shorter cabinet, centred in the sky)
    const winH = Math.max(150, Math.min(slotY - 30 - 42, winW * 1.02))
    const winTop = slotY - 30 - winH
    const mTop = winTop - 36
    const winCx = winX + winW / 2
    const winCy = winTop + winH / 2
    const innerD = Math.round(Math.min(118, winH * 0.66, winW * 0.5))
    const bw = Math.floor((w - 32 - 20) / 3)

    const setSlotHot = (on: boolean) => {
        if (on === st.current.hot) return
        st.current.hot = on
        if (slotRef.current) slotRef.current.classList.toggle("hot", on)
        if (on) {
            ctx.haptic(8)
            ctx.sfx("plink")
        }
    }

    const bind = useDrag({
        onStart: () => {
            if (st.current.phase !== "ready") return false
            setHeld(true)
            ctx.sfx("tap")
            ctx.haptic(6)
        },
        onMove: (m) => {
            const el = tokRef.current
            if (!el) return
            // a little resistance, and a tilt toward the drag direction
            const dx = m.dx * 0.9
            const dy = m.dy * 0.9
            el.style.transition = ""
            el.style.transform = `translate3d(${dx}px,${dy}px,0) rotate(${clamp(m.vx / 90, -14, 14)}deg) scale(1.04)`
            setSlotHot(dist(tokX + dx, tokY + dy, slotX, slotY) < tokD * 0.45)
        },
        onEnd: (m) => {
            setHeld(false)
            const dx = m.dx * 0.9
            const dy = m.dy * 0.9
            const near = dist(tokX + dx, tokY + dy, slotX, slotY) < tokD * 0.45
            const flung = m.vy < -800 && Math.abs(tokX + dx - slotX) < 70 && dy < -(tokY - slotY) * 0.5
            setSlotHot(false)
            if (st.current.phase === "ready" && (near || flung)) insert()
            else {
                const el = tokRef.current
                if (el) {
                    el.style.transition = "transform .55s cubic-bezier(.3,1.6,.5,1)"
                    el.style.transform = ""
                }
                if (Math.hypot(m.dx, m.dy) > 14) ctx.sfx("soft")
            }
        },
    })

    const insert = () => {
        const s = st.current
        s.phase = "in"
        const el = tokRef.current
        if (el) {
            // the coin slides into the slot edge-on
            el.style.transition = "transform .34s cubic-bezier(.5,0,.8,.6)"
            el.style.transform = `translate3d(${slotX - tokX}px,${slotY - tokY}px,0) scale(.42,.06)`
        }
        timers.after(320, () => {
            ctx.sfx("clack")
            ctx.haptic([12, 30, 12])
            ctx.fx.burst(slotX, slotY, { count: 12, shape: "spark", size: [2, 4], speed: [90, 220], angle: [-Math.PI, 0], life: [0.3, 0.6], colors: ["rgba(255,220,140,1)"] })
            setPhase("in")
            tmAnim(cabRef.current, [{ transform: "none" }, { transform: "translateX(-3px) rotate(-.6deg)" }, { transform: "translateX(3px) rotate(.6deg)" }, { transform: "translateX(-2px)" }, { transform: "none" }], { duration: 380 })
            timers.after(260, () => ctx.sfx("hum"))
            ctx.hint("Pick what to trade it for")
        })
    }

    const pick = (k: TmPrize) => {
        const s = st.current
        if (s.phase !== "in") return
        s.phase = "prize"
        setPhase("prize")
        setPrize(k)
        s.got = [...s.got, k]
        setGot(s.got)
        ctx.haptic([14, 40, 20])
        const x = winCx
        const y = winCy
        const ink = ctx.theme === "bright" ? "rgba(60,30,90,1)" : "rgba(255,246,230,1)"
        const letters = Array.from((ctx.words[s.idx] || "").replace(/\s+/g, "")).slice(0, 18)
        if (k === "TIME") {
            // the clock spins and the words run out like golden sand
            ctx.sfx("bell")
            for (let j = 0; j < 22; j++) timers.after(j * 40, () => ctx.fx.add({ x: x + (Math.random() - 0.5) * 16, y: y + innerD * 0.45, vx: (Math.random() - 0.5) * 30, vy: 60, ay: 700, max: 0.9, size: 2.6, shape: "dot", color: Math.random() < 0.5 ? "rgba(255,214,120,1)" : "rgba(255,240,190,1)", add: false }))
            if (letters.length) ctx.fx.burst(x, y + innerD * 0.3, { count: letters.length, shape: "text", text: letters, size: [13, 16], speed: [20, 70], angle: [Math.PI * 0.35, Math.PI * 0.65], life: [1, 1.3], gravity: 500, drag: 0.98, spin: 2, colors: ["rgba(255,214,120,1)"], add: false })
        } else if (k === "SPACE") {
            // the window blows open: rings widen and the words drift apart into stars
            ctx.sfx("tone")
            for (let j = 0; j < 3; j++) timers.after(j * 180, () => ctx.fx.burst(x, y, { count: 1, shape: "ring", size: [innerD * 0.4, innerD * 0.4], grow: w * 0.9, life: [1.1, 1.1], speed: [0, 0], colors: ["rgba(150,215,255,.8)"], add: true }))
            ctx.fx.burst(x, y, { count: 26, shape: "flake", size: [3, 6], speed: [40, 150], life: [1.4, 2], drag: 0.985, colors: ["rgba(210,235,255,1)", "rgba(255,255,255,1)"] })
            if (letters.length) ctx.fx.burst(x, y, { count: letters.length, shape: "text", text: letters, size: [13, 17], speed: [60, 130], life: [1.3, 1.7], drag: 0.97, spin: 1.5, colors: [ink], add: false })
        } else {
            // the machine giggles: confetti, bouncing "ha"s and letters popping out like popcorn
            ctx.sfx("pop")
            timers.after(140, () => ctx.sfx("pop"))
            timers.after(280, () => ctx.sfx("plink"))
            tmAnim(innerRef.current, [{ transform: "none" }, { transform: "translateY(-18px) scale(1.06,.94)" }, { transform: "translateY(0) scale(.94,1.06)" }, { transform: "translateY(-8px)" }, { transform: "none" }], { duration: 700, easing: "ease-out" })
            ctx.fx.burst(x, y, { count: 30, shape: "paper", size: [5, 9], speed: [200, 420], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [1, 1.5], gravity: 560, spin: 9, colors: ["#ff7ac0", "#ffd36a", "#7fe0ff", "#b98cff", "#ffffff"], add: false })
            ctx.fx.burst(x, y - innerD * 0.3, { count: 3, shape: "text", text: ["ha", "ha!", "ha"], size: [18, 22], speed: [120, 200], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [1.1, 1.3], gravity: 260, spin: 1.5, colors: ["#ff9ad0"], add: false })
            if (letters.length) ctx.fx.burst(x, y + innerD * 0.2, { count: letters.length, shape: "text", text: letters, size: [13, 17], speed: [160, 300], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [1, 1.4], gravity: 620, spin: 6, colors: [ink], add: false })
        }
        ctx.progress((s.idx + 1) / N)
        ctx.hint(`You got ${k}`)
        timers.after(1300, () => setLeave(true))
        timers.after(1800, () => {
            if (s.idx + 1 >= N) return finale()
            s.idx += 1
            s.phase = "ready"
            setIdx(s.idx)
            setPrize(null)
            setLeave(false)
            setPhase("ready")
            ctx.hint(N - s.idx === 1 ? "Last token · drag it into the slot" : "Drag the next token into the slot")
        })
    }

    const finale = () => {
        const s = st.current
        s.phase = "finale"
        setPhase("finale")
        ctx.hint("")
        // jackpot: the marquee races, the gears spin, and a fountain of coins and prize-light pours out
        ctx.sfx("spark")
        tmAnim(cabRef.current, [{ transform: "none" }, { transform: "scale(1.02,.98)" }, { transform: "scale(.99,1.02)" }, { transform: "none" }], { duration: 500 })
        for (let k = 0; k < 6; k++)
            timers.after(150 + k * 150, () => {
                ctx.sfx(k % 2 ? "plink" : "clack")
                const pz = s.got[k] || "TIME"
                ctx.fx.burst(slotX, slotY, { count: 18, shape: "glow", size: [4, 10], speed: [320, 620], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [0.9, 1.4], gravity: 600, colors: [`hsla(${TM_HUE[pz]},100%,72%,1)`, "rgba(255,236,180,1)"] })
            })
        timers.after(700, () => {
            ctx.haptic([20, 60, 20])
            ctx.sfx("chime")
            ctx.fx.burst(winCx, winCy, { count: 1, shape: "ring", size: [30, 30], grow: w, life: [1, 1], speed: [0, 0], colors: ["rgba(255,210,240,.8)"], add: true })
            setCap(true)
        })
        timers.after(2450, () => {
            ctx.sfx("win")
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Drag the token into the slot")
    }, [])

    const word = ctx.words[idx]
    const tally = TM_PRIZES.map((k) => ({ k, n: got.filter((g) => g === k).length })).filter((t) => t.n > 0)
    const showInner = phase === "in" || phase === "prize"
    return (
        <div className={cx("tmRoot", (phase === "in" || phase === "prize") && "isWork", phase === "finale" && "isFin")} style={{ position: "absolute", inset: 0 }}>
            <div className="tmBg" />
            <div className="tmFloor" />
            <div ref={cabRef} className="tmCab" style={{ left: mx, top: mTop, width: mw, height: mBot - mTop }}>
                <i className="tmBulbs" />
                <i className="tmBulbs b2" />
            </div>
            <div className="tmWin" style={{ left: winX, top: winTop, width: winW, height: winH }}>
                <i className="tmGear" style={{ left: winW / 2 - winH * 0.42, top: winH * 0.08, width: winH * 0.84, height: winH * 0.84 }} />
                <i className="tmGear g2" style={{ left: winW / 2 - winH * 0.3, top: winH * 0.2, width: winH * 0.6, height: winH * 0.6 }} />
                <i className="tmGloss" />
            </div>
            <div className={cx("tmPrize", phase === "prize" && "on")} style={{ left: winX, top: winTop, width: winW, height: winH }}>
                {prize === "TIME" ? (
                    <svg viewBox="-60 -60 120 120" width={winH * 0.9} height={winH * 0.9} style={{ marginLeft: -winH * 0.45, marginTop: -winH * 0.45 }} aria-hidden="true">
                        <circle r="56" fill="none" stroke="rgba(255,214,120,.8)" strokeWidth="3" strokeDasharray="2 9.7" />
                        <g transform="translate(0 0)">
                            <path className="tmClockHand" d="M0 0 L0 -54" stroke="rgba(255,226,150,.95)" strokeWidth="3.5" strokeLinecap="round" />
                            <path className="tmClockHand slow" d="M0 0 L38 0" stroke="rgba(255,226,150,.8)" strokeWidth="3.5" strokeLinecap="round" />
                        </g>
                    </svg>
                ) : prize === "SPACE" ? (
                    <svg viewBox="-60 -60 120 120" width={winH * 0.9} height={winH * 0.9} style={{ marginLeft: -winH * 0.45, marginTop: -winH * 0.45 }} aria-hidden="true">
                        <circle className="tmSpaceRing" r="40" fill="none" stroke="rgba(160,220,255,.9)" strokeWidth="2.5" />
                        <circle className="tmSpaceRing" r="40" fill="none" stroke="rgba(220,240,255,.8)" strokeWidth="1.5" style={{ animationDelay: ".35s" }} />
                    </svg>
                ) : prize === "LAUGH" ? (
                    <svg viewBox="-60 -60 120 120" width={winH * 0.9} height={winH * 0.9} style={{ marginLeft: -winH * 0.45, marginTop: -winH * 0.45 }} aria-hidden="true">
                        <path d="M-50 18 Q0 70 50 18" fill="none" stroke="rgba(255,150,210,.85)" strokeWidth="4" strokeLinecap="round" className="tmSpaceRing" style={{ animationDuration: "1.1s" }} />
                    </svg>
                ) : null}
            </div>
            {showInner ? (
                <div key={`in${idx}`} ref={innerRef} className={cx("tmInner", leave && "out")} style={{ left: winCx, top: winCy, ["--d" as any]: `${innerD}px` }}>
                    <Orb src={ctx.pic(idx, phase === "prize")} text={word} d={innerD} hue={ctx.hue(idx)} hue2={prize ? TM_HUE[prize] : undefined} mood={phase === "prize" ? "happy" : "nervous"} aura={phase === "prize" ? 0.9 : 0} uploaded={ctx.uploaded} label={word || "your picture"} />
                </div>
            ) : null}
            <div ref={slotRef} className="tmSlot" style={{ left: slotX, top: slotY, ["--sw" as any]: `${Math.round(tokD * 0.62)}px` }}>
                <b />
            </div>
            {phase === "ready"
                ? [0, 1].map((k) => <i key={k} className="tmChev" style={{ left: slotX, top: mBot + 8 + k * 11, transform: "rotate(45deg)", ["--cd" as any]: `${-k * 0.25}s` }} />)
                : null}
            {phase === "ready" ? (
                <div key={`t${idx}`} className="tmTok" style={{ left: tokX, top: tokY, ["--d" as any]: `${tokD}px` }}>
                    <div className="tmTokPop">
                        <div ref={tokRef} className={cx("tmTokDrag", held && "held")} {...bind} role="button" aria-label={`Thought token: ${word || "your picture"}. Drag it into the slot`}>
                            <div className="tmTokBob">
                                <Orb src={ctx.pic(idx, false)} text={word} d={tokD} hue={ctx.hue(idx)} hue2={46} mood="nervous" uploaded={ctx.uploaded} lifted={held}>
                                    <i className="tmCoinRim" />
                                </Orb>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
            {phase === "finale" ? (
                <div className="tmReels" style={{ left: winX, top: winTop, width: winW, height: winH }} aria-hidden="true">
                    {TM_PRIZES.map((k, i) => (
                        <span key={k} style={{ ["--h" as any]: TM_HUE[k], ["--r" as any]: `${Math.round(Math.min(78, winW / 3.6))}px`, animationDelay: `${0.15 + i * 0.22}s` }}>
                            <TmIcon k={k} size={Math.round(Math.min(78, winW / 3.6) * 0.56)} />
                        </span>
                    ))}
                </div>
            ) : null}
            <div className={cx("tmCap", cap && "on")} style={{ top: tokY - 34 }} aria-live="polite">
                <small>You traded for</small>
                <b>{tally.map((t) => `${t.n} ${t.k.toLowerCase()}`).join(" · ")}</b>
            </div>
            {TM_PRIZES.map((k, i) => (
                <div
                    key={k}
                    className={cx("tmBtn", phase !== "in" && phase !== "finale" && prize !== k && "off", press === i && "press", prize === k && phase !== "finale" && "picked")}
                    style={{ left: 16 + i * (bw + 10), top: btnY - 32, width: bw, ["--h" as any]: TM_HUE[k] }}
                    onPointerDown={(e) => {
                        e.preventDefault()
                        if (st.current.phase !== "in") {
                            ctx.sfx("soft")
                            return
                        }
                        setPress(i)
                        ctx.sfx("tap")
                        timers.after(90, () => {
                            setPress(-1)
                            pick(k)
                        })
                    }}
                    role="button"
                    aria-label={`Trade for ${k}`}
                    aria-disabled={phase !== "in"}
                >
                    <TmIcon k={k} />
                    <span>{k}</span>
                </div>
            ))}
        </div>
    )
}

tsmRitual({ id: 88, hint: "Drag the token into the slot", css: TRADE_CSS, Comp: RitualTrade })
