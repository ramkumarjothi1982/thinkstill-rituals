/* ================================================================== */
/* 114 · SKY LANTERNS — DROP on a dusk hill (EOS sad / lonely hero)    */
/* ================================================================== */
// Desktop rules kept (eos/24): 3 paper lanterns, each carrying one of the user's phrases (eosLanWords, fitted to
// the paper); press and hold to warm (1.2 s; 0.7 s in easy mode); an early lift keeps the warmth and cools slowly
// (0.00012/ms); 2 early lifts or 9 s with nothing lit → easy mode; a slowing heartbeat while held; when it glows:
// let go, or flick up ≥ 90 px, to let it rise (chime) — still held after 6 s it rises by itself; a flick that
// came early launches the moment it lights. Each lantern rises 2.2 s (sway, shrink) to a star of a heart
// constellation; a common-humanity line per star; the lanterns join every lantern lit here before (per device);
// then the golden lantern and the two equal choices — send warmth (native share → clipboard fallback, honest
// status copy) or keep it — both finish. Safety (strong flag) swaps the copy. DROP's face arc 80/70 → 57 → 59 →
// 28 → 31 → 09 → 08. Progress per lantern {warm 3, lit 10, rise 18, star 25}, ask 82, choice 90;
// bonus = clamp(330 − 10·early lifts + (beats > 6 ? 10 : 0), 270, 350).
// Fixed for the phone: no count pill, arrows or step cards; the cue lives in the one hint line; the lines of
// comfort are a soft caption under the heart; the choice is one big row in the thumb zone.

const LAN_CONTRIB: Record<string, number> = { idle: 0, warm: 3, lit: 10, rise: 18, star: 25 }
const LAN_FACE = { sad: 80, lonely: 70, warm: 57, up: 59, one: 28, two: 31, ask: 9, hug: 8 }
const LAN_SHARE = { normal: "Thinking of you 💛", safe: "Hey, can you talk? I'm having a hard time." }
const LAN_HEART = "M50 84 C20 62 4 46 4 27 C4 12 15 4 27 4 C38 4 46 11 50 21 C54 11 62 4 73 4 C85 4 96 12 96 27 C96 46 80 62 50 84 Z"
// star slots in heart units (viewBox 100 × 90): left lobe, right lobe, tip — then the gold cleft star
const LAN_STARS: [number, number][] = [
    [22, 24],
    [78, 24],
    [50, 78],
    [50, 21],
]

type LanState = "idle" | "warm" | "lit" | "rise" | "star"

function lanWords(ctx: RitualCtx, maxW: number): string[] {
    const list = ctx.words.filter(Boolean)
    try {
        const fit = eosLanFitter(`500 15px ${FONT}`, maxW, 3)
        const w = eosLanWords(list, fit)
        if (w && w.length) {
            const out: string[] = []
            for (const t of w.concat(["heavy heart", "missing you", "alone tonight"])) if (out.length < 3 && !out.some((x) => x.toLowerCase() === String(t).toLowerCase())) out.push(String(t))
            return out
        }
    } catch (e) {}
    const t = ctx.thought.split(/\s+/).filter(Boolean)
    if (t.length >= 3) {
        const k = Math.ceil(t.length / 3)
        return [0, 1, 2].map((i) => thoughtLine(t.slice(i * k, (i + 1) * k).join(" "), 30) || "heavy heart")
    }
    return ["heavy heart", "missing you", "alone tonight"].map((x, i) => list[i] || x)
}

function lanStrong(ctx: RitualCtx): boolean {
    try {
        return eosSafetyStrong(EOS_STORE.get().safety) || eosSafetyStrong(EosSafetyScan(ctx.thought))
    } catch (e) {
        return false
    }
}

function lanPast(): number {
    let rows = 0
    try {
        rows = eosSessions().filter((r: any) => r && Number(r.gameId) === 114).length
    } catch (e) {}
    return Math.max(rows, lsNum("tsm.lanterns.past", 0))
}

const LAN_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="114"] .lanSky{position:absolute;inset:0;
  background:radial-gradient(80% 40% at 50% 62%, rgba(255,170,140,.28) 0%, transparent 70%),linear-gradient(180deg,#0b1030 0%,#1b2156 36%,#3b3374 62%,#6a4a7e 80%,#2a2448 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="114"] .lanSky{background:radial-gradient(80% 40% at 50% 62%, rgba(255,214,180,.6) 0%, transparent 70%),linear-gradient(180deg,#8d9be0 0%,#b3b4ec 36%,#d9c2ec 62%,#f6cfd8 80%,#c9b8e4 100%)}
.tsm .tsmRitualLayer[data-rid="114"] .lanWarm{position:absolute;inset:0;transition:opacity 1.4s ease;
  background:radial-gradient(90% 50% at 50% 24%, rgba(255,214,150,.42) 0%, transparent 70%),linear-gradient(180deg,#1c1846 0%,#4a3376 40%,#b0607a 72%,#f2a46e 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="114"] .lanWarm{background:radial-gradient(90% 50% at 50% 24%, rgba(255,240,200,.8) 0%, transparent 70%),linear-gradient(180deg,#a7a3ea 0%,#e2b8e2 40%,#ffc7b0 72%,#ffe0a8 100%)}
.tsm .tsmRitualLayer[data-rid="114"] .lanStarsBg{position:absolute;inset:0 0 40% 0;
  background-image:radial-gradient(1.3px 1.3px at 8% 12%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 24% 34%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 40% 10%,#fde9ff 50%,transparent 51%),radial-gradient(1px 1px at 64% 30%,#fff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 90% 22%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 14% 58%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 84% 52%,#ffe9c9 50%,transparent 51%);
  animation:lanTw 5s ease-in-out infinite}
@keyframes lanTw{0%,100%{opacity:.85}50%{opacity:.45}}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="114"] .lanStarsBg{opacity:.35;animation:none}
.tsm .tsmRitualLayer[data-rid="114"] .lanPast{position:absolute;inset:0 0 45% 0;transition:opacity 1.2s ease}
.tsm .tsmRitualLayer[data-rid="114"] .lanMoon{position:absolute;width:44px;height:44px;border-radius:50%;transform:rotate(-24deg);
  box-shadow:inset 11px -5px 0 0 #f8ecc4, 0 0 22px -4px rgba(255,240,200,.35)}
.tsm .tsmRitualLayer[data-rid="114"] .lanHill{position:absolute;left:-30%;right:-30%;bottom:-30%;border-radius:50% 50% 0 0 / 18% 18% 0 0;
  background:radial-gradient(40% 14% at 50% 2%, rgba(255,214,170,.18), transparent 70%),linear-gradient(180deg,#2a2d5e 0%,#1a1b40 26%,#0f1030 100%);box-shadow:inset 0 2px 0 rgba(255,220,190,.18)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="114"] .lanHill{background:radial-gradient(40% 14% at 50% 2%, rgba(255,255,255,.6), transparent 70%),linear-gradient(180deg,#9ab3d9 0%,#8aa0cf 26%,#7d8ec2 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.6)}
.tsm .tsmRitualLayer[data-rid="114"] .lanHeart{position:absolute;pointer-events:none;transform-origin:50% 55%}
.tsm .tsmRitualLayer[data-rid="114"] .lanHeart svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tsm .tsmRitualLayer[data-rid="114"] .lanHeart path{transition:opacity 1.2s ease}
.tsm .tsmRitualLayer[data-rid="114"] .lanHeart.beat{animation:lanBeat 1.1s ease-in-out 2}
@keyframes lanBeat{0%,100%{transform:scale(1)}14%{transform:scale(1.12)}28%{transform:scale(1)}42%{transform:scale(1.08)}60%{transform:scale(1)}}
.tsm .tsmRitualLayer[data-rid="114"] .lanStar{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;opacity:.28;transform:scale(.55);transition:opacity .6s ease, transform .8s cubic-bezier(.3,1.7,.5,1);
  background:radial-gradient(circle, #fff 0 12%, rgba(255,230,170,.9) 18%, rgba(255,200,120,.25) 45%, transparent 70%)}
.tsm .tsmRitualLayer[data-rid="114"] .lanStar.on{opacity:1;transform:scale(1)}
.tsm .tsmRitualLayer[data-rid="114"] .lanStar.gold{background:radial-gradient(circle, #fff 0 12%, rgba(255,214,110,1) 20%, rgba(255,180,60,.35) 48%, transparent 70%)}
.tsm .tsmRitualLayer[data-rid="114"] .lanLine{position:absolute;left:24px;right:24px;text-align:center;font-size:15.5px;line-height:1.35;font-weight:500;color:#fff4e6;text-shadow:0 1px 10px rgba(20,10,50,.7);opacity:0;transform:translateY(6px);transition:opacity .9s ease, transform .9s ease;pointer-events:none;z-index:6}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="114"] .lanLine{color:#3a2a6a;text-shadow:0 1px 0 rgba(255,255,255,.75)}
.tsm .tsmRitualLayer[data-rid="114"] .lanLine.on{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="114"] .lanLine small{display:block;margin-top:4px;font-size:13px;opacity:.8}
.tsm .tsmRitualLayer[data-rid="114"] .lanDrop{position:absolute;z-index:4;transition:transform .9s cubic-bezier(.3,1.4,.5,1)}
.tsm .tsmRitualLayer[data-rid="114"] .lanL{position:absolute;width:var(--lw);height:var(--lh);margin:calc(var(--lh)*-.5) 0 0 calc(var(--lw)*-.5);touch-action:none;cursor:pointer;z-index:5;-webkit-touch-callout:none;will-change:transform}
.tsm .tsmRitualLayer[data-rid="114"] .lanL::after{content:"";position:absolute;left:50%;bottom:-10px;width:2px;height:12px;margin-left:-1px;border-radius:2px;background:linear-gradient(180deg,#c9864a,rgba(201,134,74,0))}
.tsm .tsmRitualLayer[data-rid="114"] .lanPaper{position:absolute;left:6%;right:6%;top:9%;bottom:9%;border-radius:34% 34% 30% 30% / 18% 18% 16% 16%;overflow:hidden;transition:transform .14s cubic-bezier(.3,1.6,.5,1);
  background:repeating-linear-gradient(90deg, rgba(120,70,40,.0) 0 17%, rgba(120,70,40,.13) 17% 18.5%),radial-gradient(70% 60% at 50% 55%, #f3e3cc 0%, #dcc3a4 70%, #b99a7c 100%);
  box-shadow:inset 0 0 0 1px rgba(255,240,220,.4), inset 0 -10px 18px rgba(90,50,30,.25), 0 10px 22px rgba(10,6,30,.4)}
.tsm .tsmRitualLayer[data-rid="114"] .lanL.press .lanPaper{transform:scale(1.05,.95)}
.tsm .tsmRitualLayer[data-rid="114"] .lanGlow{position:absolute;inset:0;opacity:0;
  background:radial-gradient(70% 62% at 50% 62%, #fff8d8 0%, #ffd27a 40%, #ff9c48 78%, #e0703a 100%)}
.tsm .tsmRitualLayer[data-rid="114"] .lanCap{position:absolute;left:22%;right:22%;height:9%;border-radius:6px;background:linear-gradient(180deg,#5a3a2a,#2e1c14)}
.tsm .tsmRitualLayer[data-rid="114"] .lanCap.t{top:3%}
.tsm .tsmRitualLayer[data-rid="114"] .lanCap.b{bottom:3%}
.tsm .tsmRitualLayer[data-rid="114"] .lanText{position:absolute;left:10%;right:10%;top:50%;transform:translateY(-50%);text-align:center;font-size:var(--fs);line-height:1.2;font-weight:600;color:#4a2a18;overflow-wrap:anywhere;text-shadow:0 1px 0 rgba(255,240,220,.5)}
.tsm .tsmRitualLayer[data-rid="114"] .lanText img{display:block;width:38px;height:38px;margin:0 auto 6px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,240,220,.8)}
.tsm .tsmRitualLayer[data-rid="114"] .lanHalo{position:absolute;left:-30%;right:-30%;top:-20%;bottom:-20%;border-radius:50%;opacity:0;pointer-events:none;
  background:radial-gradient(closest-side, rgba(255,200,110,.55), rgba(255,170,80,.18) 55%, transparent)}
.tsm .tsmRitualLayer[data-rid="114"] .lanGold{position:absolute;width:46px;height:58px;margin:-29px 0 0 -23px;z-index:6;opacity:0;transform:scale(.4);transition:opacity .6s ease, transform 1.2s cubic-bezier(.45,0,.2,1)}
.tsm .tsmRitualLayer[data-rid="114"] .lanGold.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="114"] .lanGold.in{opacity:0;transition:opacity .4s ease, transform 1.2s cubic-bezier(.45,0,.2,1)}
.tsm .tsmRitualLayer[data-rid="114"] .lanGold i{position:absolute;inset:8% 6%;border-radius:34% 34% 30% 30% / 18% 18% 16% 16%;
  background:radial-gradient(70% 62% at 50% 62%, #fffbe6 0%, #ffd86a 45%, #f0a020 100%);box-shadow:0 0 24px rgba(255,200,80,.85)}
.tsm .tsmRitualLayer[data-rid="114"] .lanCards{position:absolute;left:16px;right:16px;display:flex;gap:12px;z-index:8;opacity:0;transform:translateY(16px);transition:opacity .5s ease, transform .6s cubic-bezier(.3,1.4,.5,1);pointer-events:none}
.tsm .tsmRitualLayer[data-rid="114"] .lanCards.on{opacity:1;transform:none;pointer-events:auto}
.tsm .tsmRitualLayer[data-rid="114"] .lanCard{flex:1 1 0;min-width:0;border-radius:22px;padding:14px 10px 12px;text-align:center;cursor:pointer;touch-action:manipulation;
  background:linear-gradient(180deg, rgba(255,236,210,.16), rgba(255,236,210,.07));box-shadow:inset 0 0 0 1.5px rgba(255,220,180,.45), 0 10px 24px rgba(10,6,30,.3);color:#fff4e6;transition:transform .14s}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="114"] .lanCard{background:linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,246,236,.7));box-shadow:inset 0 0 0 1.5px rgba(200,140,90,.45), 0 10px 24px rgba(80,50,120,.18);color:#3a2a4a}
.tsm .tsmRitualLayer[data-rid="114"] .lanCard:active{transform:scale(.96)}
.tsm .tsmRitualLayer[data-rid="114"] .lanCard b{display:block;font-size:30px;line-height:1;margin-bottom:8px}
.tsm .tsmRitualLayer[data-rid="114"] .lanCard strong{display:block;font-size:15px;line-height:1.22;font-weight:650}
.tsm .tsmRitualLayer[data-rid="114"] .lanCard span{display:block;margin-top:4px;font-size:12.5px;line-height:1.25;opacity:.75}
.tsm .tsmRitualLayer[data-rid="114"] .lanDawn{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.6s ease;
  background:radial-gradient(90% 50% at 50% 100%, rgba(255,190,110,.55), transparent 70%)}
.tsm .tsmRitualLayer[data-rid="114"] .lanDawn.on{opacity:1}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="114"] .lanStarsBg{animation:none}.tsm .tsmRitualLayer[data-rid="114"] .lanHeart.beat{animation:none}}
`

function RitualLanterns({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const timers = useTimers()
    const dark = ctx.theme !== "bright"
    const strong = React.useMemo(() => lanStrong(ctx), [])
    const past = React.useMemo(() => lanPast(), [])
    const tonight = React.useMemo(() => {
        let dp = "dusk"
        try {
            dp = eosDayPart()
        } catch (e) {}
        return dp === "dusk" || dp === "night" ? "tonight" : "today"
    }, [])
    const lines = strong
        ? ["You don't have to carry this alone.", `Lots of people are looking up at the same sky ${tonight}.`, "Reaching out is a brave, strong thing."]
        : ["Missing someone means you loved something.", `Lots of people are looking up at the same sky ${tonight}.`, "Everyone carries something heavy sometimes."]

    // ---- layout ----
    const lw = Math.floor(Math.min(112, (w - 48) / 3))
    const lh = Math.round(lw * 1.32)
    const ly = h - 86 - lh / 2
    const lx = [0, 1, 2].map((i) => w / 2 + (i - 1) * (lw + 12))
    const words = React.useMemo(() => lanWords(ctx, lw * 0.8 - 4), [])
    const S = Math.round(Math.min(156, w * 0.42))
    const hx = w / 2
    const hy = Math.max(S * 0.52 + 6, h * 0.19)
    const starP = LAN_STARS.map(([vx, vy]) => ({ x: hx + ((vx - 50) / 100) * S, y: hy + ((vy - 45) / 100) * S }))
    const dropD = Math.round(clamp(w * 0.24, 80, 104))
    const hillTop = Math.min(ly - lh / 2 - dropD * 0.55, h * 0.52)
    const dropY = hillTop - dropD * 0.3
    const lineY = hy + S * 0.5 + 12

    // ---- state ----
    const [states, setStates] = React.useState<LanState[]>(["idle", "idle", "idle"])
    const [face, setFace] = React.useState(ctx.emotion === "lonely" ? LAN_FACE.lonely : LAN_FACE.sad)
    const [press, setPress] = React.useState(-1)
    const [stars, setStars] = React.useState(0)
    const [line, setLine] = React.useState<{ text: string; sub?: string; on: boolean }>({ text: "", on: false })
    const [phase, setPhase] = React.useState<"play" | "gather" | "ask" | "fly" | "done">("play")
    const [warmSky, setWarmSky] = React.useState(0)
    const [arrived, setArrived] = React.useState(false)
    const statesRef = useLatest(states)
    const wrapRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const glowRefs = React.useRef<(HTMLElement | null)[]>([])
    const haloRefs = React.useRef<(HTMLElement | null)[]>([])
    const textRefs = React.useRef<(HTMLElement | null)[]>([])
    const worldRef = React.useRef<HTMLDivElement>(null)
    const L = React.useRef({
        heat: [0, 0, 0],
        hold: -1,
        pid: -1,
        t0: 0,
        startY: 0,
        lift: 0,
        flicked: false,
        litAt: 0,
        early: 0,
        easy: false,
        beats: 0,
        nextBeat: 0,
        risen: 0,
        lastLit: performance.now(),
        nudged: false,
        rises: [] as { i: number; t0: number; slot: number; chimed: boolean }[],
        hint: "",
        done: false,
    })

    const setState = (i: number, s: LanState) => {
        const next = statesRef.current.map((x, j) => (j === i ? s : x))
        statesRef.current = next
        setStates(next)
        ctx.progress(next.reduce((a, x) => a + LAN_CONTRIB[x], 0) / 100)
    }
    const hint = (t: string) => {
        if (L.current.hint === t) return
        L.current.hint = t
        ctx.hint(t)
    }
    const showLine = (text: string, sub?: string, ms = 3400) => {
        setLine({ text, sub, on: true })
        if (ms > 0) timers.after(ms, () => setLine((l) => (l.text === text ? { ...l, on: false } : l)))
    }

    // ---- holding ----
    const begin = (i: number, pointerId: number, clientY: number, captureEl: HTMLElement | null) => {
        const s = statesRef.current[i]
        const st = L.current
        if (st.hold >= 0 || (s !== "idle" && s !== "warm")) {
            ctx.sfx("soft")
            return
        }
        try {
            if (captureEl) captureEl.setPointerCapture(pointerId)
        } catch (err) {}
        st.hold = i
        st.pid = pointerId
        st.t0 = performance.now()
        st.startY = clientY
        st.lift = 0
        st.flicked = false
        st.litAt = 0
        st.nextBeat = st.t0 + 300
        if (s === "idle") setState(i, "warm")
        setPress(i)
        timers.after(130, () => setPress(-1))
        ctx.sfx("soft")
        ctx.haptic(8)
        hint("Warming up… keep holding")
    }
    const move = (e: React.PointerEvent) => {
        const st = L.current
        if (st.hold < 0 || e.pointerId !== st.pid) return
        const up = Math.max(0, st.startY - e.clientY)
        st.lift = up
        if (up >= 90) {
            if (statesRef.current[st.hold] === "lit") rise(st.hold, true)
            else st.flicked = true
        }
    }
    const end = (e: React.PointerEvent) => {
        const st = L.current
        if (st.hold < 0 || e.pointerId !== st.pid) return
        const i = st.hold
        st.hold = -1
        st.pid = -1
        const el = wrapRefs.current[i]
        if (statesRef.current[i] === "lit") return rise(i, true)
        if (el) {
            el.style.transition = "transform .45s cubic-bezier(.3,1.6,.5,1)"
            el.style.transform = ""
            timers.after(460, () => el && (el.style.transition = ""))
        }
        if (statesRef.current[i] === "warm") {
            st.early++
            if (st.early >= 2 && !st.easy) {
                st.easy = true
                hint("Hold gently — it lights faster now")
            } else hint("Almost — hold a little longer")
        }
    }

    const lightUp = (i: number) => {
        const st = L.current
        setState(i, "lit")
        st.litAt = performance.now()
        st.lastLit = st.litAt
        ctx.sfx("plink")
        ctx.haptic([8, 40, 8])
        const p = { x: lx[i], y: ly }
        ctx.fx.burst(p.x, p.y, { count: 10, shape: "glow", size: [4, 9], speed: [30, 110], life: [0.5, 1], drag: 0.94, colors: ["rgba(255,214,140,1)", "rgba(255,250,230,1)"] })
        hint("It's glowing — let it rise ↑")
        if (st.flicked) rise(i, true)
    }

    const rise = (i: number, user: boolean) => {
        const st = L.current
        if (statesRef.current[i] !== "lit") return
        if (st.hold === i) {
            st.hold = -1
            st.pid = -1
        }
        const slot = st.risen++
        setState(i, "rise")
        st.rises.push({ i, t0: performance.now(), slot, chimed: user })
        if (user) ctx.sfx("chime")
        else ctx.sfx("soft")
        ctx.haptic(14)
        const p = { x: lx[i], y: ly }
        ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [lw * 0.4, lw * 0.4], grow: lw * 1.4, life: [0.6, 0.6], speed: [0, 0], colors: ["rgba(255,220,160,.8)"], add: true })
        ctx.fx.burst(p.x, p.y, { count: 6, shape: "spark", size: [1.5, 3], speed: [90, 220], life: [0.4, 0.8], drag: 0.94, colors: ["rgba(255,230,180,1)"] })
        // the user's words loosen from the paper and drift up as the lantern leaves
        const letters = Array.from(words[i] || "").filter((c) => c !== " ")
        if (letters.length) ctx.fx.burst(p.x, p.y, { count: Math.min(18, letters.length), shape: "text", text: letters, size: [12, 15], speed: [20, 70], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [1.2, 1.8], gravity: -50, drag: 0.98, spin: 1.5, colors: [dark ? "rgba(255,228,190,1)" : "rgba(120,70,40,1)"], add: false })
        hint(st.risen < 3 ? "Hold the next lantern to warm it" : "")
    }

    const arrive = (r: { i: number; slot: number }) => {
        const sp = starP[r.slot]
        setState(r.i, "star")
        const n = r.slot + 1
        setStars(n)
        ctx.sfx("bell")
        ctx.fx.burst(sp.x, sp.y, { count: 14, shape: "glow", size: [3, 8], speed: [30, 120], life: [0.6, 1.2], drag: 0.94, colors: ["rgba(255,236,190,1)", "rgba(255,255,255,1)"] })
        setWarmSky(n / 3)
        showLine(lines[r.slot])
        if (n === 3) gather()
    }

    const gather = () => {
        hint("")
        timers.after(3000, () => {
            setPhase("gather")
            showLine(past > 0 ? "Your lanterns joined every lantern you've lit here." : "Your lanterns found each other.", undefined, 0)
            ctx.sfx("hum")
        })
        timers.after(3900, () => {
            setPhase("ask")
            ctx.progress(0.82)
            ctx.sfx("soft")
            hint(strong ? "Reach out to someone?" : "Send a little warmth?")
        })
    }

    const choose = (kind: "send" | "keep") => {
        if (phase !== "ask") return
        setPhase("fly")
        ctx.progress(0.9)
        ctx.hint("")
        ctx.haptic([20, 60, 20])
        const text = strong ? LAN_SHARE.safe : LAN_SHARE.normal
        if (kind === "keep") showLine("Kept close. This glow is yours.", undefined, 0)
        else {
            showLine("A little warmth, on its way 💛", undefined, 0)
            const copy = () => {
                let ok = false
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).catch(() => {})
                        ok = true
                    }
                } catch (e) {}
                if (!ok)
                    try {
                        const ta = document.createElement("textarea")
                        ta.value = text
                        ta.style.position = "fixed"
                        ta.style.opacity = "0"
                        document.body.appendChild(ta)
                        ta.select()
                        ok = document.execCommand("copy")
                        document.body.removeChild(ta)
                    } catch (e) {}
                showLine("Warmth, ready to send 💛", ok ? "Copied — paste it to someone" : `Send them: “${text}”`, 0)
            }
            try {
                const nav: any = navigator
                if (nav.share)
                    nav.share({ text }).then(
                        () => showLine("Sent with love. 💛", undefined, 0),
                        (err: any) => (err && err.name === "AbortError" ? showLine("Saved for later — send it anytime. 💛", undefined, 0) : copy())
                    )
                else copy()
            } catch (e) {
                copy()
            }
        }
        // the golden lantern flies into the heart's cleft; the heart is drawn and beats twice
        timers.after(450, () => setPhase("done"))
        timers.after(1650, () => {
            setArrived(true)
            ctx.sfx("chime")
            const c = starP[3]
            ctx.fx.burst(c.x, c.y, { count: 1, shape: "ring", size: [10, 10], grow: S * 1.6, life: [0.9, 0.9], speed: [0, 0], colors: ["rgba(255,214,140,.9)"], add: true })
            ctx.fx.burst(c.x, c.y, { count: 9, shape: "spark", size: [1.5, 3], speed: [80, 220], life: [0.5, 0.9], drag: 0.94, colors: ["rgba(255,236,190,1)"] })
            for (let k = 0; k < 12; k++) timers.after(k * 60, () => ctx.fx.add({ x: hx + (Math.random() - 0.5) * S * 1.4, y: hy - S * 0.3, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 60, ay: 30, max: 1.6, size: 3 + Math.random() * 3, shape: "glow", color: "rgba(255,200,120,1)", add: true }))
        })
        timers.after(2450, () => {
            try {
                lsSet("tsm.lanterns.past", String(past + 1))
            } catch (e) {}
            ctx.sfx("win")
            const st = L.current
            ctx.complete(clamp(330 - st.early * 10 + (st.beats > 6 ? 10 : 0), 270, 350))
        })
    }

    const worldDown = (e: React.PointerEvent) => {
        if (phase !== "play") return
        // a press on the empty sky warms the next lantern still waiting
        const i = statesRef.current.findIndex((s) => s === "idle" || s === "warm")
        if (i < 0) return
        begin(i, e.pointerId, e.clientY, e.currentTarget as HTMLElement)
    }

    // ---- the frame: warmth, heartbeat, tug, rising lanterns, faces ----
    const frameT = React.useRef(0)
    useFrame(() => {
        // wall-clock steps (a slow frame never slows the ritual down)
        const tNow = performance.now()
        const dt = frameT.current ? Math.min(1, (tNow - frameT.current) / 1000) : 0.016
        frameT.current = tNow
        const st = L.current
        if (st.done) return
        const now = performance.now()
        for (let i = 0; i < 3; i++) {
            const s = statesRef.current[i]
            if (st.hold === i && s === "warm") {
                st.heat[i] = Math.min(1, st.heat[i] + dt / (st.easy ? 0.7 : 1.2))
                if (st.heat[i] >= 1) lightUp(i)
            } else if (s === "warm" && st.heat[i] > 0) st.heat[i] = Math.max(0, st.heat[i] - 0.12 * dt)
            const g = glowRefs.current[i]
            const hl = haloRefs.current[i]
            const k = s === "lit" ? 1 : s === "warm" || s === "idle" ? st.heat[i] : 1
            if (g) g.style.opacity = String(k)
            if (hl) hl.style.opacity = String(s === "lit" ? 0.9 + 0.1 * Math.sin(now / 160) : k * 0.7)
            // the upward tug while held (14 px max)
            if (st.hold === i) {
                const el = wrapRefs.current[i]
                if (el) el.style.transform = `translate3d(0,${-Math.min(14, st.lift * 0.25)}px,0)`
            }
        }
        // a slowing heartbeat while held
        if (st.hold >= 0 && now >= st.nextBeat) {
            const bpm = Math.max(44, 60 - st.risen * 2.7 - Math.min(2.7, ((now - st.t0) / 2600) * 2.7))
            st.nextBeat = now + 60000 / bpm
            st.beats++
            ctx.haptic([12, 140, 12])
            const hl = haloRefs.current[st.hold]
            if (hl && hl.animate) hl.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" })
        }
        // held while lit for 6 s → it rises by itself
        if (st.hold >= 0 && statesRef.current[st.hold] === "lit" && now - st.litAt > 6000) rise(st.hold, false)
        // nudge: nothing lit for 9 s → easy mode
        if (!st.nudged && !st.easy && st.risen < 3 && now - st.lastLit > 9000 && !statesRef.current.some((s) => s === "lit" || s === "rise")) {
            st.nudged = true
            st.easy = true
            hint("Hold gently — it lights faster now")
        }
        // rising lanterns
        const dur = ctx.reduced ? 1500 : 2200
        st.rises = st.rises.filter((r) => {
            const p = clamp01((now - r.t0) / dur)
            const el = wrapRefs.current[r.i]
            const sp = starP[r.slot]
            if (el) {
                const e = 0.5 - 0.5 * Math.cos(Math.PI * p)
                const dx = (sp.x - lx[r.i]) * e + (ctx.reduced ? 0 : Math.sin(3 * Math.PI * p) * 16 * (1 - p))
                const dy = ctx.reduced ? -46 * p : (sp.y - ly) * e
                const rot = ctx.reduced ? 0 : Math.cos(3 * Math.PI * p) * 7 * (1 - p)
                el.style.transition = "none"
                el.style.transform = `translate3d(${dx}px,${dy}px,0) rotate(${rot}deg) scale(${ctx.reduced ? 1 : 1 - 0.72 * e})`
                el.style.opacity = String(p < 0.86 ? 1 : 1 - (p - 0.86) / 0.14)
                const t = textRefs.current[r.i]
                if (t) t.style.opacity = String(p < 0.4 ? 1 : p > 0.75 ? 0 : 1 - (p - 0.4) / 0.35)
                if (Math.random() < 0.3) ctx.fx.add({ x: lx[r.i] + dx, y: ly + dy + lh * 0.3 * (1 - 0.72 * e), vx: (Math.random() - 0.5) * 20, vy: 30, max: 0.8, size: 2.5, shape: "glow", color: "rgba(255,190,110,1)", add: true })
            }
            if (p >= 1) {
                arrive(r)
                return false
            }
            return true
        })
        // DROP's face (priority order)
        const ph = phase
        const holdingWarm = st.hold >= 0 && now - st.t0 > 200
        const f =
            ph === "done" || ph === "fly"
                ? LAN_FACE.hug
                : ph === "gather" || ph === "ask"
                  ? LAN_FACE.ask
                  : st.rises.length || (st.hold >= 0 && statesRef.current[st.hold] === "lit")
                    ? LAN_FACE.up
                    : holdingWarm
                      ? LAN_FACE.warm
                      : st.risen >= 2
                        ? LAN_FACE.two
                        : st.risen >= 1
                          ? LAN_FACE.one
                          : ctx.emotion === "lonely"
                            ? LAN_FACE.lonely
                            : LAN_FACE.sad
        if (f !== face) setFace(f)
    })

    React.useEffect(() => {
        hint("Hold a lantern to warm it")
    }, [])

    // the sky of every lantern lit here before
    const pastBg = React.useMemo(() => {
        const n = Math.min(60, past * 3)
        if (!n) return ""
        const rnd = mulberry(77)
        return Array.from({ length: n }, () => `radial-gradient(2px 2px at ${(rnd() * 96 + 2).toFixed(1)}% ${(rnd() * 90 + 4).toFixed(1)}%, rgba(255,206,130,.9) 50%, transparent 52%)`).join(",")
    }, [])

    const fs = (t: string) => clamp(Math.min(15.5, ((lw * 0.8 - 6) / (Math.max(...t.split(/\s+/).map((x) => x.length), 1) * 0.6))), 11.5, 15.5)
    const final = phase === "done"
    const goldPos = final ? starP[3] : { x: w / 2 + dropD * 0.62, y: dropY + 4 }
    const cardY = ly - 52
    const optA = strong ? "Text someone you trust" : "Text someone “thinking of you”"
    const optASub = strong ? `“${LAN_SHARE.safe}”` : "a little note, from you"
    return (
        <div ref={worldRef} style={{ position: "absolute", inset: 0 }} onPointerDown={worldDown} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
            <div className="lanSky" />
            <div className="lanWarm" style={{ opacity: final ? 1 : warmSky * 0.85 }} />
            <div className="lanStarsBg" />
            {pastBg ? <div className="lanPast" style={{ backgroundImage: pastBg, opacity: phase === "play" ? 0.55 : 1 }} /> : null}
            <i className="lanMoon" style={{ left: w - 70, top: 16 }} />
            <div className={cx("lanHeart", arrived && "beat")} style={{ left: hx - S / 2, top: hy - S * 0.45, width: S, height: S * 0.9 }} aria-hidden="true">
                <svg viewBox="0 0 100 90">
                    <path d={LAN_HEART} fill="rgba(255,170,120,.10)" stroke="rgba(255,226,170,.9)" strokeWidth="1.2" strokeDasharray="2 3" style={{ opacity: final ? 1 : phase === "gather" || phase === "ask" ? 0.4 : 0 }} />
                </svg>
            </div>
            {starP.map((p, k) => (
                <i key={k} className={cx("lanStar", k === 3 && "gold", (k < 3 ? stars > k : arrived) && "on")} style={{ left: p.x, top: p.y }} />
            ))}
            <div className={cx("lanLine", line.on && "on")} style={{ top: lineY }} aria-live="polite">
                {line.text}
                {line.sub ? <small>{line.sub}</small> : null}
            </div>
            <div className="lanHill" style={{ top: hillTop }} />
            <div className="lanDrop" style={{ left: w / 2 - dropD / 2, top: dropY - dropD / 2, width: dropD, height: dropD }} role="img" aria-label="DROP">
                <Orb src={tsmFaceUrl("drop", face)} d={dropD} hue={CHAR_HUE.drop} hue2={36} mood={face === LAN_FACE.sad || face === LAN_FACE.lonely ? "droop" : face === LAN_FACE.hug || face === LAN_FACE.ask ? "happy" : "float"} aura={phase === "play" ? stars * 0.2 : 0.9} />
            </div>
            <div className={cx("lanGold", (phase === "ask" || phase === "fly" || final) && "on", arrived && "in")} style={{ left: 0, top: 0, transform: `translate3d(${goldPos.x}px,${goldPos.y}px,0) scale(${final ? 0.5 : 1})` }} aria-hidden="true">
                <i />
            </div>
            <div className={cx("lanDawn", final && "on")} />
            {[0, 1, 2].map((i) => {
                const s = states[i]
                return (
                    <div
                        key={i}
                        ref={(el) => (wrapRefs.current[i] = el)}
                        className={cx("lanL", press === i && "press")}
                        style={{ left: lx[i], top: ly, ["--lw" as any]: `${lw}px`, ["--lh" as any]: `${lh}px`, ["--fs" as any]: `${fs(words[i])}px`, pointerEvents: s === "idle" || s === "warm" || s === "lit" ? undefined : "none", visibility: s === "star" ? "hidden" : undefined }}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (phase === "play") begin(i, e.pointerId, e.clientY, e.currentTarget as HTMLElement)
                        }}
                        onPointerMove={move}
                        onPointerUp={end}
                        onPointerCancel={end}
                        onLostPointerCapture={end}
                        onContextMenu={(e) => e.preventDefault()}
                        role="button"
                        aria-label={`Paper lantern ${i + 1} of 3: ${words[i]}. Press and hold to light it, then let go to let it rise.`}
                    >
                        <i className="lanHalo" ref={(el) => (haloRefs.current[i] = el)} />
                        <div className="lanPaper">
                            <i className="lanGlow" ref={(el) => (glowRefs.current[i] = el)} />
                            <div className="lanText" ref={(el) => (textRefs.current[i] = el)}>
                                {ctx.uploaded && ctx.pic(i, false) ? <img src={ctx.pic(i, false) || ""} alt="" draggable={false} /> : null}
                                {words[i]}
                            </div>
                        </div>
                        <i className="lanCap t" />
                        <i className="lanCap b" />
                    </div>
                )
            })}
            <div className={cx("lanCards", phase === "ask" && "on")} style={{ top: cardY }}>
                <div className="lanCard" role="button" aria-label={`${optA}. Opens your share options with the message: ${strong ? LAN_SHARE.safe : LAN_SHARE.normal}`} onClick={() => choose("send")}>
                    <b aria-hidden="true">💌</b>
                    <strong>{optA}</strong>
                    <span>{optASub}</span>
                </div>
                <div className="lanCard" role="button" aria-label="Keep it for me. Keeps the golden lantern for you." onClick={() => choose("keep")}>
                    <b aria-hidden="true">🏮</b>
                    <strong>Keep it for me</strong>
                    <span>a warm glow, just for you</span>
                </div>
            </div>
        </div>
    )
}

tsmRitual({ id: 114, hint: "Hold a lantern to warm it", css: LAN_CSS, Comp: RitualLanterns })
