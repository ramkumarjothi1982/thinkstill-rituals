/* ================================================================== */
/* 105 · DRAMA MACHINE — a little velvet theatre                       */
/* ================================================================== */
// Desktop rules kept: 6 takes from the user's words; per take one over-produce action (MAKE IT DRAMATIC,
// an effect assigned per take) and then a CUT that kills it instantly; the next undone take loads by itself
// ~0.8 s after a cut; complete after 6 cuts; progress = cuts / 6 (on each cut only); bonus 850.
// Mobile: one character on a small stage, one big button in the thumb zone that turns from MAKE IT DRAMATIC
// into a clapper CUT. Fixed: the 6 effects are a seeded permutation (every take gets a different one — the
// desktop hash repeated effects and could skip TINY VIOLIN), every effect has its own sound and over-the-top
// look, the hero overacts and its words go full melodrama, then relaxes into a happy face on the cut (the
// desktop flip only worked for take 1), no progress creep before a cut, and a curtain call with roses.

const DM_FX = [
    { key: "fog", name: "FOG MACHINE", icon: "≈" },
    { key: "siren", name: "SIRENS", icon: "!" },
    { key: "violin", name: "TINY VIOLIN", icon: "♪" },
    { key: "confetti", name: "CONFETTI", icon: "✦" },
    { key: "thunder", name: "THUNDER", icon: "⚡" },
    { key: "spot", name: "MAIN CHARACTER", icon: "◎" },
]

const DM_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="105"] .dmHall{position:absolute;inset:0;background:
  radial-gradient(60% 34% at 50% 44%, rgba(255,196,120,.22), transparent 70%),
  linear-gradient(180deg,#140812 0%,#2a0f1d 40%,#3a1420 70%,#1a0a10 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="105"] .dmHall{background:
  radial-gradient(60% 34% at 50% 44%, rgba(255,240,210,.9), transparent 70%),
  linear-gradient(180deg,#f6e3d2 0%,#f1d2c0 40%,#ecc5b3 70%,#e2b8a6 100%)}
.tsm .tsmRitualLayer[data-rid="105"] .dmFloor{position:absolute;left:0;right:0;bottom:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,200,140,.18) 0%,transparent 18%),repeating-linear-gradient(90deg,#5a2f1c 0 38px,#4a2616 38px 40px),linear-gradient(#4a2616,#2a140c)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="105"] .dmFloor{background:linear-gradient(180deg,rgba(255,255,255,.4) 0%,transparent 18%),repeating-linear-gradient(90deg,#b07a52 0 38px,#9c6a45 38px 40px),linear-gradient(#a8744d,#8a5a3a)}
.tsm .tsmRitualLayer[data-rid="105"] .dmFloor::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:linear-gradient(90deg,#d9a24a,#ffe2a0,#d9a24a);opacity:.9}
.tsm .tsmRitualLayer[data-rid="105"] .dmCurtain{position:absolute;top:0;bottom:0;width:var(--cw);pointer-events:none;z-index:6;transition:transform 1s cubic-bezier(.5,0,.2,1);
  background:linear-gradient(90deg, rgba(0,0,0,.35), transparent 30%, rgba(0,0,0,.25) 70%, rgba(255,255,255,.08)),repeating-linear-gradient(90deg,#8e1328 0 10px,#b51d36 16px,#6e0c1f 26px);
  box-shadow:0 0 30px rgba(0,0,0,.5)}
.tsm .tsmRitualLayer[data-rid="105"] .dmCurtain.l{left:0;border-bottom-right-radius:60% 22%}
.tsm .tsmRitualLayer[data-rid="105"] .dmCurtain.r{right:0;border-bottom-left-radius:60% 22%}
.tsm .tsmRitualLayer[data-rid="105"] .dmValance{position:absolute;left:0;right:0;top:0;height:26px;z-index:7;pointer-events:none;
  background:radial-gradient(22px 18px at 22px 0, #b51d36 98%, transparent 100%) 0 0/44px 26px repeat-x;filter:drop-shadow(0 3px 3px rgba(0,0,0,.35))}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.cut{opacity:0;transition:none}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx i{position:absolute;display:block}
/* fog: two slow banks rolling across the boards */
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.fog i{left:-30%;width:160%;height:46%;bottom:6%;border-radius:50%;background:radial-gradient(closest-side, rgba(235,230,255,.62), rgba(235,230,255,.0));animation:dmFog 3.4s ease-in-out infinite alternate}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.fog i:nth-child(2){bottom:26%;height:38%;opacity:.7;animation-duration:4.6s;animation-delay:-1.4s}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.fog i:nth-child(3){bottom:44%;height:30%;opacity:.45;animation-duration:5.4s}
@keyframes dmFog{0%{transform:translate3d(-12%,0,0) scale(1,.9)}100%{transform:translate3d(12%,-6%,0) scale(1.1,1.05)}}
/* sirens: red and blue beams sweep from the wings, the hall strobes */
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.siren i:nth-child(1),.tsm .tsmRitualLayer[data-rid="105"] .dmFx.siren i:nth-child(2){top:calc(38px - var(--L));width:calc(var(--L)*2);height:calc(var(--L)*2);border-radius:50%;
  background:conic-gradient(from 0deg, rgba(255,40,60,.0) 0deg, rgba(255,40,60,.7) 14deg, rgba(255,40,60,0) 30deg, transparent 180deg, rgba(255,40,60,0) 180deg, rgba(255,40,60,.7) 194deg, rgba(255,40,60,0) 210deg, transparent 211deg)}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.siren i:nth-child(1){left:calc(var(--cw) + 24px - var(--L));animation:dmSpin .8s linear infinite}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.siren i:nth-child(2){right:calc(var(--cw) + 24px - var(--L));animation:dmSpin .8s linear infinite reverse;
  background:conic-gradient(from 90deg, rgba(60,120,255,.0) 0deg, rgba(60,120,255,.75) 14deg, rgba(60,120,255,0) 30deg, transparent 180deg, rgba(60,120,255,0) 180deg, rgba(60,120,255,.75) 194deg, rgba(60,120,255,0) 210deg, transparent 211deg)}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.siren i:nth-child(3){inset:0;background:radial-gradient(14px 14px at calc(var(--cw) + 24px) 38px, #ff4058 70%, rgba(255,40,60,.5) 100%, transparent 260%),radial-gradient(14px 14px at calc(100% - var(--cw) - 24px) 38px, #4d86ff 70%, rgba(60,120,255,.5) 100%, transparent 260%),linear-gradient(90deg, rgba(255,30,60,.4), rgba(40,90,255,.4));animation:dmStrobe .6s steps(2) infinite}
@keyframes dmSpin{to{transform:rotate(360deg)}}
@keyframes dmStrobe{0%{opacity:1}100%{opacity:0}}
/* tiny violin: a sad blue wash and a very small violin */
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.violin i:nth-child(1){inset:0;background:radial-gradient(50% 40% at 50% 42%, rgba(120,160,255,.0), rgba(30,50,120,.55))}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.violin i:nth-child(2){left:var(--vx);top:var(--vy);font-size:44px;line-height:1;font-style:normal;transform-origin:50% 90%;animation:dmFiddle .45s ease-in-out infinite alternate}
@keyframes dmFiddle{0%{transform:rotate(-14deg)}100%{transform:rotate(10deg) translateY(-3px)}}
/* thunder: white flashes and a bolt */
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.thunder i:nth-child(1){inset:0;background:rgba(235,240,255,.85);animation:dmFlash 1.1s linear infinite}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.thunder i:nth-child(2){left:var(--bx);top:3%;width:84px;height:52%;background:linear-gradient(180deg,#fff,#ffe680 60%,#ffc93a);clip-path:polygon(55% 0,20% 52%,46% 52%,28% 100%,82% 40%,55% 40%,78% 0);animation:dmBolt 1.1s linear infinite}
@keyframes dmBolt{0%,46%,100%{opacity:0}2%,30%{opacity:1}}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.thunder i:nth-child(3){inset:0;background:linear-gradient(180deg, rgba(10,10,30,.55), rgba(10,10,30,.3))}
@keyframes dmFlash{0%,8%,16%,100%{opacity:0}4%,12%{opacity:1}}
/* main character: darkness everywhere except one hard spotlight */
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.spot i:nth-child(1){inset:0;background:radial-gradient(circle at 50% var(--hy), transparent 0, transparent calc(var(--d)*.62), rgba(0,0,0,.82) calc(var(--d)*.72))}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.spot i:nth-child(2){left:50%;top:0;width:calc(var(--d)*1.6);height:calc(var(--hy) + var(--d)*.62);margin-left:calc(var(--d)*-.8);clip-path:polygon(42% 0,58% 0,100% 100%,0 100%);background:linear-gradient(180deg, rgba(255,250,220,.12), rgba(255,240,190,.42) 70%, rgba(255,240,190,0))}
/* confetti: party lights */
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.confetti i:nth-child(1){inset:0;background:radial-gradient(30% 20% at 20% 20%, rgba(255,90,200,.35), transparent),radial-gradient(30% 20% at 80% 26%, rgba(80,220,255,.35), transparent),radial-gradient(40% 24% at 50% 70%, rgba(255,220,80,.3), transparent);animation:dmStrobe .5s steps(2) infinite alternate}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d)*-.5) 0 0 calc(var(--d)*-.5);z-index:3;transition:transform .7s cubic-bezier(.5,0,.3,1), opacity .5s}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.enter{animation:dmEnter .6s cubic-bezier(.2,1.4,.4,1) both}
@keyframes dmEnter{0%{transform:translate3d(0,40px,0) scale(.6);opacity:0}100%{transform:none;opacity:1}}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero .tsmOrb{left:0;top:0}
.tsm .tsmRitualLayer[data-rid="105"] .dmAct{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.armed .dmAct{animation:dmOver .5s ease-in-out infinite alternate}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.armed.fx-violin .dmAct{animation:dmSob 1.1s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.armed.fx-thunder .dmAct{animation:dmShake .12s linear infinite}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.armed.fx-spot .dmAct{animation:dmStar 1.4s ease-in-out infinite}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.armed.fx-confetti .dmAct{animation:dmHop .42s cubic-bezier(.3,0,.6,1) infinite alternate}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.armed.fx-fog .dmAct{animation:dmSway 1.6s ease-in-out infinite alternate}
@keyframes dmOver{0%{transform:rotate(-9deg) scale(1.08)}100%{transform:rotate(9deg) scale(1.16)}}
@keyframes dmSob{0%,100%{transform:translateY(0) scale(1.05,1)}50%{transform:translateY(10px) scale(1.12,.92) rotate(-4deg)}}
@keyframes dmShake{0%{transform:translate(-5px,2px) scale(1.1)}50%{transform:translate(5px,-3px) scale(1.12)}100%{transform:translate(-3px,-2px) scale(1.1)}}
@keyframes dmStar{0%,100%{transform:scale(1.14) rotate(-4deg)}50%{transform:scale(1.22) translateY(-10px) rotate(4deg)}}
@keyframes dmHop{0%{transform:translateY(0) scale(1.1,.94)}100%{transform:translateY(-26px) scale(.96,1.08)}}
@keyframes dmSway{0%{transform:rotate(-12deg) scale(1.08)}100%{transform:rotate(12deg) scale(1.14) translateY(-8px)}}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.armed .orbText{text-transform:uppercase;letter-spacing:.06em;font-weight:800;font-style:italic;color:#fff3c4;text-shadow:0 0 10px rgba(255,140,60,.9),0 2px 0 rgba(120,20,40,.8)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="105"] .dmHero.armed .orbText{color:#b0162e;text-shadow:0 0 8px rgba(255,255,255,.9),0 2px 0 rgba(255,210,120,.9)}
.tsm .tsmRitualLayer[data-rid="105"] .dmHero.calm .orbText{letter-spacing:0;font-weight:500}
.tsm .tsmRitualLayer[data-rid="105"] .dmCast{position:absolute;left:0;top:0;width:var(--fd);height:var(--fd);margin:calc(var(--fd)*-.5) 0 0 calc(var(--fd)*-.5);z-index:8;pointer-events:none;transition:transform .9s cubic-bezier(.4,1.3,.5,1)}
.tsm .tsmRitualLayer[data-rid="105"] .dmCast b{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 40%, hsla(var(--h),90%,80%,.5), hsla(var(--h),70%,40%,.7));
  box-shadow:inset 0 0 0 2px rgba(255,230,170,.9), 0 4px 12px rgba(0,0,0,.4)}
.tsm .tsmRitualLayer[data-rid="105"] .dmCast img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.12)}
.tsm .tsmRitualLayer[data-rid="105"] .dmCast.bow b{animation:dmBow 1.1s ease-in-out .3s both}
@keyframes dmBow{0%,100%{transform:none}45%{transform:rotate(-18deg) translateY(8px)}}
.tsm .tsmRitualLayer[data-rid="105"] .dmBtn{position:absolute;left:50%;height:64px;width:var(--bw);margin-left:calc(var(--bw)*-.5);border-radius:32px;z-index:9;touch-action:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:10px;font-size:18px;font-weight:800;letter-spacing:.06em;color:#3a1206;
  background:linear-gradient(180deg,#ffe9a8 0%,#ffc657 55%,#f09a2a 100%);box-shadow:0 10px 26px rgba(255,150,40,.4), inset 0 -4px 0 rgba(150,60,0,.35), inset 0 2px 0 rgba(255,255,255,.7);
  transition:transform .12s cubic-bezier(.3,1.6,.5,1), opacity .3s}
.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.press{transform:scale(.94,.88)}
.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.cut{color:#fff;background:linear-gradient(180deg,#2b2b33 0%,#121218 100%);box-shadow:0 10px 26px rgba(0,0,0,.45), inset 0 0 0 2px rgba(255,255,255,.85)}
.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.cut::before{content:"";position:absolute;left:0;right:0;top:0;height:16px;border-radius:32px 32px 0 0;
  background:repeating-linear-gradient(-45deg,#fff 0 12px,#121218 12px 24px);opacity:.95}
.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.cut span{margin-top:12px}
.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.cut{animation:dmBeat .9s ease-in-out infinite}
@keyframes dmBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.wait{opacity:.35;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.gone{opacity:0;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="105"] .dmSnap{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:10}
.tsm .tsmRitualLayer[data-rid="105"] .dmSnap.go{animation:dmSnap .35s ease-out}
@keyframes dmSnap{0%{opacity:.85}100%{opacity:0}}
.tsm .tsmRitualLayer[data-rid="105"] .dmFx.rdc i,.tsm .tsmRitualLayer[data-rid="105"] .dmHero.rdc .dmAct,.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.rdc{animation:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="105"] .dmFx i,.tsm .tsmRitualLayer[data-rid="105"] .dmHero.armed .dmAct,.tsm .tsmRitualLayer[data-rid="105"] .dmBtn.cut{animation:none}}
`

function RitualDrama({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const order = React.useMemo(() => shuffled([0, 1, 2, 3, 4, 5], mulberry(ctx.seed * 31 + 105)), [])
    const [active, setActive] = React.useState(0)
    const [armed, setArmed] = React.useState(false)
    const [cut, setCut] = React.useState<boolean[]>(() => Array(N).fill(false))
    const [leaving, setLeaving] = React.useState(false)
    const [press, setPress] = React.useState(false)
    const [snap, setSnap] = React.useState(0)
    const [phase, setPhase] = React.useState<"play" | "call">("play")
    const timers = useTimers()
    const loop = React.useRef<any>(null)
    const busy = React.useRef(false)
    const activeRef = useLatest(active)
    const cutRef = useLatest(cut)

    // layout: cast balcony at the top, the hero centre stage, boards below, one big button in the thumb zone
    const cw = Math.round(clamp(w * 0.14, 44, 70))
    const btnTop = h - 76 - 64
    const floorTop = btnTop - 36
    const castY = 46
    const d = Math.round(clamp(Math.min(w * 0.54, (floorTop - castY - 60) * 0.78), 150, 224))
    const hx = w / 2
    const hy = Math.round(castY + 34 + (floorTop - castY - 34) * 0.5)
    const fd = Math.round(clamp((w - 2 * cw - 40) / 7, 36, 50))
    const castAt = (i: number) => (phase === "call" ? { x: w / 2 + ((i % 3) - 1) * Math.min(100, (w - 2 * cw - 36) / 3) + (i < 3 ? -12 : 12), y: hy + (i < 3 ? -58 : 58) } : { x: cw + 20 + ((w - 2 * cw - 40) * (i + 0.5)) / N, y: castY })
    const fxKey = DM_FX[order[active % N]].key

    const stopLoop = () => {
        if (loop.current) timers.clear(loop.current)
        loop.current = null
    }

    const runEffect = (k: string) => {
        stopLoop()
        let t = 0
        const tick = (ms: number, fn: () => void) => {
            fn()
            loop.current = timers.every(ms, () => {
                t += ms
                fn()
            })
        }
        const top = hy - d / 2
        if (k === "fog") {
            ctx.sfx("hum")
            tick(260, () => {
                for (let n = 0; n < 3; n++)
                    // (the smoke sprite fades through grey on a light stage, so the bright theme uses soft glows)
                    ctx.fx.add(ctx.theme === "bright" ? { x: Math.random() * w, y: floorTop + 10, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40, size: 34 + Math.random() * 30, grow: 40, max: 2.2, shape: "glow", color: "rgba(255,255,255,.5)", add: true } : { x: Math.random() * w, y: floorTop + 10, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40, size: 26 + Math.random() * 30, grow: 50, max: 2.2, shape: "smoke", color: "rgba(220,215,255,.35)", add: false })
                if (t % 1300 < 260) ctx.sfx("hum")
            })
        } else if (k === "siren") {
            let hi = false
            tick(380, () => {
                hi = !hi
                ctx.sfx(hi ? "tone" : "plink")
                if (!ctx.reduced) ctx.haptic(hi ? 24 : 8)
            })
        } else if (k === "violin") {
            tick(420, () => {
                ctx.sfx("string")
                ctx.fx.add({ x: hx + d * 0.55, y: top + d * 0.2, vx: 20 + Math.random() * 30, vy: -60 - Math.random() * 40, ay: -10, max: 1.6, size: 22, vr: (Math.random() - 0.5) * 2, shape: "text", text: Math.random() < 0.5 ? "♪" : "♫", color: "rgba(190,210,255,1)", add: false })
                ctx.fx.add({ x: hx + (Math.random() < 0.5 ? -1 : 1) * d * 0.12, y: top + d * 0.38, vx: (Math.random() - 0.5) * 50, vy: -40, ay: 700, max: 0.8, size: 4, shape: "drop", color: "rgba(150,200,255,.95)", add: false })
            })
        } else if (k === "confetti") {
            tick(300, () => {
                ctx.sfx("pop")
                ctx.haptic(6)
                const left = Math.random() < 0.5
                ctx.fx.burst(left ? cw : w - cw, castY + 20, { count: 16, shape: "paper", size: [5, 9], speed: [220, 480], angle: left ? [-0.9, 0.3] : [Math.PI - 0.3, Math.PI + 0.9], life: [1.2, 1.9], gravity: 420, drag: 0.97, spin: 8, colors: ["#ff5fa8", "#ffd84a", "#53e0ff", "#9cff6b", "#b98cff"], add: false })
            })
        } else if (k === "thunder") {
            tick(1100, () => {
                ctx.sfx("clack")
                ctx.haptic([40, 30, 20])
                for (let n = 0; n < 26; n++) ctx.fx.add({ x: Math.random() * w * 1.2 - w * 0.1, y: -10 - Math.random() * 60, vx: -80, vy: 900 + Math.random() * 200, max: (floorTop + 20) / 950, size: 2, shape: "streak", color: "rgba(200,215,255,.7)", add: false })
            })
        } else {
            ctx.sfx("bell")
            tick(500, () => {
                if (t % 1000 === 0) ctx.sfx("chime")
                const a = Math.random() * Math.PI * 2
                ctx.fx.add({ x: hx + Math.cos(a) * d * 0.62, y: hy + Math.sin(a) * d * 0.62, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 20, max: 1, size: 5 + Math.random() * 4, shape: "glow", color: "rgba(255,236,170,1)" })
                ctx.fx.add({ x: hx + Math.cos(a + 3) * d * 0.6, y: hy + Math.sin(a + 3) * d * 0.6, max: 0.8, size: 3, shape: "spark", vx: Math.cos(a + 3) * 60, vy: Math.sin(a + 3) * 60, color: "rgba(255,255,255,1)" })
            })
        }
    }

    const makeDramatic = () => {
        const i = activeRef.current
        const k = DM_FX[order[i]]
        setArmed(true)
        ctx.sfx("tap")
        ctx.haptic(14)
        // a whoosh of glitter as the machine kicks in
        ctx.fx.burst(hx, hy, { count: 18, shape: "spark", size: [2, 3.5], speed: [160, 380], life: [0.4, 0.8], drag: 0.92, colors: ["rgba(255,220,140,1)", "rgba(255,140,120,1)"] })
        runEffect(k.key)
        ctx.hint(`${k.icon} ${k.name}! Now cut it`)
    }

    const doCut = () => {
        const i = activeRef.current
        stopLoop()
        busy.current = true
        setArmed(false)
        setSnap((s) => s + 1)
        ctx.sfx("clack")
        ctx.haptic(20)
        const next = cutRef.current.map((v, j) => (j === i ? true : v))
        setCut(next)
        const n = next.filter(Boolean).length
        ctx.progress(n / N)
        timers.after(90, () => ctx.sfx(n === N ? "chime" : "pop"))
        // the melodrama drops out of the words: a few loose letters tumble to the boards
        const letters = Array.from(ctx.words[i] || "").filter((c) => c !== " ").slice(0, 10)
        letters.forEach((c, k) => ctx.fx.add({ x: hx - letters.length * 5 + k * 10, y: hy + d * 0.28, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 60, ay: 900, max: Math.sqrt((2 * (floorTop - hy)) / 900) + 0.35, size: 15, vr: (Math.random() - 0.5) * 6, shape: "text", text: c, color: "rgba(255,226,160,1)", add: false }))
        ctx.hint(n === N ? "" : "Cut ✓ · next take")
        // relieved: the hero takes a bow up to the balcony, then the next undone take walks on
        timers.after(800, () => setLeaving(true))
        timers.after(1550, () => {
            setLeaving(false)
            if (n === N) {
                curtainCall()
                return
            }
            const nx = next.findIndex((v) => !v)
            setActive(nx)
            busy.current = false
            ctx.hint(n === N - 1 ? "Last take · make it dramatic" : `Take ${nx + 1} · make it dramatic`)
        })
    }

    const curtainCall = () => {
        setPhase("call")
        ctx.sfx("chime")
        timers.after(500, () => {
            ctx.sfx("bell")
            ctx.haptic([20, 60, 20])
            let k = 0
            const id = timers.every(90, () => {
                k++
                ctx.fx.add({ x: cw + Math.random() * (w - 2 * cw), y: -10, vx: (Math.random() - 0.5) * 40, vy: 140 + Math.random() * 80, ay: 60, max: 2.2, size: 8 + Math.random() * 4, vr: (Math.random() - 0.5) * 4, shape: "petal", color: Math.random() < 0.6 ? "rgba(235,40,80,1)" : "rgba(255,150,180,1)", add: false })
                if (k > 16) timers.clear(id)
            })
        })
        timers.after(2400, () => {
            ctx.sfx("win")
            ctx.complete(850)
        })
    }

    const onPress = (e: React.PointerEvent) => {
        e.preventDefault()
        if (busy.current || phase !== "play") return
        setPress(true)
        timers.after(110, () => setPress(false))
        if (armed) doCut()
        else makeDramatic()
    }

    React.useEffect(() => {
        ctx.hint("Take 1 · make it dramatic")
    }, [])

    const i = active
    const done = cut[i]
    const heroLeaving = leaving
    const to = castAt(i)
    return (
        <>
            <div className="dmHall" />
            <div className="dmFloor" style={{ top: floorTop }} />
            <div className={cx("dmFx", fxKey, ctx.reduced && "rdc", armed && "on", !armed && done && "cut")} style={{ ["--hy" as any]: `${hy}px`, ["--d" as any]: `${d}px`, ["--vx" as any]: `${hx + d * 0.42}px`, ["--vy" as any]: `${hy - d * 0.62}px`, ["--bx" as any]: `${cw + 10}px`, ["--cw" as any]: `${cw}px`, ["--L" as any]: `${h}px` }}>
                <i />
                <i>{fxKey === "violin" ? "🎻" : null}</i>
                <i />
            </div>
            {phase === "play" ? (
                <div
                    key={`h${i}`}
                    className={cx("dmHero", ctx.reduced && "rdc", !heroLeaving && "enter", armed && "armed", `fx-${fxKey}`, done && "calm")}
                    style={{ left: hx, top: hy, ["--d" as any]: `${d}px`, transform: heroLeaving ? `translate3d(${to.x - hx}px,${to.y - hy}px,0) scale(${fd / d})` : undefined }}
                    aria-label={ctx.words[i] || "your picture"}
                    role="img"
                >
                    <div className="dmAct">
                        <Orb src={ctx.pic(i, done)} text={ctx.words[i]} d={d} hue={ctx.hue(i)} hue2={40} mood={done ? "happy" : "none"} aura={armed ? 0.9 : done ? 0.7 : 0} uploaded={ctx.uploaded} />
                    </div>
                </div>
            ) : null}
            {cut.map((c, k) =>
                c && (phase === "call" || k !== active) ? (
                    <div key={`c${k}`} className={cx("dmCast", phase === "call" && "bow")} style={{ ["--fd" as any]: `${fd}px`, ["--h" as any]: ctx.hue(k), transform: `translate3d(${castAt(k).x}px,${castAt(k).y}px,0) scale(${phase === "call" ? 1.6 : 1})` }}>
                        <b>{ctx.pic(k, true) ? <img src={ctx.pic(k, true) as string} alt="" draggable={false} /> : null}</b>
                    </div>
                ) : null
            )}
            <i className="dmCurtain l" style={{ ["--cw" as any]: `${cw}px`, transform: phase === "call" ? `translate3d(${w * 0.03}px,0,0)` : undefined }} />
            <i className="dmCurtain r" style={{ ["--cw" as any]: `${cw}px`, transform: phase === "call" ? `translate3d(${-w * 0.03}px,0,0)` : undefined }} />
            <i className="dmValance" />
            <div
                className={cx("dmBtn", ctx.reduced && "rdc", armed && "cut", press && "press", (busy.current || leaving) && phase === "play" && !armed && "wait", phase !== "play" && "gone")}
                style={{ top: btnTop, ["--bw" as any]: `${Math.min(w - 56, 320)}px` }}
                onPointerDown={onPress}
                role="button"
                aria-label={armed ? `Cut the drama: ${ctx.words[i] || "this take"}` : `Make it dramatic: ${ctx.words[i] || "this take"}`}
            >
                <span>{armed ? "✂  CUT!" : "✦  MAKE IT DRAMATIC"}</span>
            </div>
            <i key={`s${snap}`} className={cx("dmSnap", snap > 0 && "go")} />
        </>
    )
}

tsmRitual({ id: 105, hint: "Take 1 · make it dramatic", css: DM_CSS, Comp: RitualDrama })
