/* ================================================================== */
/* 113 · GROUND CONTROL — GLITCH's rocket in the fog (EOS anxiety hero) */
/* ================================================================== */
// Desktop rules kept (eos/23): 5-sense grounding with 5 beacons in any order — 3 SPOT beacons (find it around you,
// tap; the lamp fills over 1.2 s, 2.4 s when tapped < 1.5 s after the previous spot tap, 0.9 s after the 26 s
// assist) and 2 BODY beacons (FEET + one release: shoulders / jaw / hands; press and hold 3 s accumulated, 1.8 s
// after assist; letting go pauses and never resets). The ↻ swap cycles a spot mission through the 14-mission pool
// (other senses for blind/deaf players). Each lit beacon's beam burns off one worry word (the user's words, tidied
// to 5) and its found-icon takes the word's place; the rocket steps down, the fog and static thin; GLITCH's face
// arc E15 → E49 (2 lit) → E07 (4 lit) → E58 at touchdown. 18 % per lit beacon, touchdown before 100,
// bonus = clamp(296 + 24 (no rushed taps) + 20 (no pauses) + min(20, swaps·10), 260, 360).
// Fixed for the phone: a two-row lamp field in the thumb zone with nothing overlapping, no arrows/chips/step cards,
// the cue lives in the one hint line, the worry words sit clear of the rocket's column.

interface GcMission {
    sense: string
    icon: string
    t: [string, string, string]
    found: string
    cue?: string
}
const GC_SPOTS: GcMission[] = [
    { sense: "see", icon: "👀", t: ["something", "BLUE", ""], found: "💎" },
    { sense: "touch", icon: "✋", t: ["touch a", "SOFT", "thing"], found: "🧸" },
    { sense: "hear", icon: "👂", t: ["", "farthest", "sound"], found: "🔔" },
    { sense: "smell", icon: "👃", t: ["one", "smell", "or taste"], found: "🌿" },
    { sense: "see", icon: "👀", t: ["something", "ROUND", ""], found: "🟡" },
    { sense: "contact", icon: "🪑", t: ["the", "CHAIR", "under you"], found: "🪑" },
    { sense: "touch", icon: "✋", t: ["touch a", "COOL", "thing"], found: "❄️" },
    { sense: "hear", icon: "👂", t: ["the", "quietest", "sound"], found: "🎐" },
    { sense: "see", icon: "👀", t: ["something", "SHINY", ""], found: "✨" },
    { sense: "contact", icon: "👣", t: ["the", "FLOOR", "under you"], found: "👣" },
    { sense: "touch", icon: "✋", t: ["touch a", "SMOOTH", "thing"], found: "🪨" },
    { sense: "smell", icon: "👅", t: ["", "TASTE", "in your mouth"], found: "🍋" },
    { sense: "see", icon: "👀", t: ["something", "RED", ""], found: "❤️" },
    { sense: "contact", icon: "🍃", t: ["", "AIR", "on your skin"], found: "🍃" },
]
const GC_SPOT_START = [
    [0, 1, 2],
    [4, 6, 3],
    [8, 10, 7],
]
const GC_FEET: GcMission = { sense: "body", icon: "🦶", t: ["feet", "DOWN", ""], found: "👣", cue: "Press your feet into the floor…" }
const GC_RELEASE: GcMission[] = [
    { sense: "body", icon: "💆", t: ["drop your", "SHOULDERS", ""], found: "🌬️", cue: "Let your shoulders drop…" },
    { sense: "body", icon: "😌", t: ["soften your", "JAW", ""], found: "🙂", cue: "Let your jaw go soft…" },
    { sense: "body", icon: "🤲", t: ["loosen your", "HANDS", ""], found: "🖐️", cue: "Let your hands go loose…" },
]
const GC_KINDS: ("spot" | "body")[][] = [
    ["spot", "body", "spot", "spot", "body"],
    ["spot", "spot", "body", "body", "spot"],
    ["spot", "body", "spot", "body", "spot"],
]
const GC_LOUD = [
    { sky: ["#120a30", "#33207a", "#5b3fa6"], hill: ["#2a1d66", "#0e0928"] },
    { sky: ["#0b0f2e", "#232a74", "#4b48a8"], hill: ["#1d2470", "#080c26"] },
    { sky: ["#180a2c", "#44206e", "#7a42ac"], hill: ["#36206c", "#110824"] },
]
const GC_LOUD_BRIGHT = { sky: ["#a99be6", "#c9bdf6", "#ece5ff"], hill: ["#e4ddff", "#cbbff6"] }
const GC_CALM_HILL_BRIGHT = { hill: ["#d2f2e0", "#a6dcc2"] }
const GC_CALM: Record<string, { sky: string[]; hill: string[] }> = {
    dawn: { sky: ["#7fb2ff", "#ffc7a6", "#ffe6bd"], hill: ["#7cc3a0", "#2f6f78"] },
    day: { sky: ["#4fb0ff", "#9fdcff", "#dff5ff"], hill: ["#73cc92", "#2e7f6c"] },
    dusk: { sky: ["#6b5bd0", "#ff9fbc", "#ffd59c"], hill: ["#66a39a", "#2c4f6b"] },
    night: { sky: ["#1c3678", "#3f72c4", "#7fd3ff"], hill: ["#2f7a80", "#123048"] },
}
const GC_FOUND_CUES = ["Found it · the fog is thinning", "That's real · right here", "Yes — really there"]

function gcWords(ctx: RitualCtx): string[] {
    const list = ctx.words.filter(Boolean)
    let src: string[] = list
    try {
        const w = eosGroundWords(list)
        if (w && w.length) src = w
    } catch (e) {}
    // never the same worry twice (short thoughts arrive cycled)
    const out: string[] = []
    const seen = new Set<string>()
    for (const t of src.concat(["on edge", "too much", "not ready", "everyone sees", "tomorrow", "racing heart"], list)) {
        const k = String(t || "").trim().toLowerCase()
        if (k && !seen.has(k) && out.length < 5) {
            seen.add(k)
            out.push(String(t).trim())
        }
    }
    return out
}

const GC_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="113"] .gcSky,.tsm .tsmRitualLayer[data-rid="113"] .gcCalm{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="113"] .gcCalm{transition:opacity 1.4s ease}
.tsm .tsmRitualLayer[data-rid="113"] .gcStars{position:absolute;inset:0 0 45% 0;opacity:.8;transition:opacity 1.4s;
  background-image:radial-gradient(1.3px 1.3px at 10% 14%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 28% 30%,#e9e0ff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 52% 8%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 70% 24%,#d8ccff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 88% 12%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 92% 40%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 6% 46%,#e9e0ff 50%,transparent 51%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcStars{opacity:.35}
.tsm .tsmRitualLayer[data-rid="113"] .gcFog{position:absolute;left:-20%;right:-20%;top:-4%;pointer-events:none;transition:opacity 1.1s ease;
  background:radial-gradient(34% 22% at 22% 30%, rgba(190,170,255,.34), transparent 70%),radial-gradient(30% 20% at 78% 46%, rgba(190,170,255,.30), transparent 70%),radial-gradient(42% 24% at 50% 70%, rgba(170,150,250,.34), transparent 70%),radial-gradient(30% 18% at 30% 88%, rgba(200,180,255,.26), transparent 70%);
  animation:gcFog 14s ease-in-out infinite}
@keyframes gcFog{0%,100%{transform:translate3d(-3%,0,0)}50%{transform:translate3d(3%,-1.5%,0)}}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcFog{background:radial-gradient(34% 22% at 22% 30%, rgba(255,255,255,.55), transparent 70%),radial-gradient(30% 20% at 78% 46%, rgba(255,255,255,.5), transparent 70%),radial-gradient(42% 24% at 50% 70%, rgba(250,246,255,.55), transparent 70%),radial-gradient(30% 18% at 30% 88%, rgba(255,255,255,.4), transparent 70%)}
.tsm .tsmRitualLayer[data-rid="113"] .gcStatic{position:absolute;inset:0;pointer-events:none;transition:opacity 1.1s ease;
  background:repeating-linear-gradient(180deg, rgba(200,180,255,.07) 0 1px, transparent 1px 4px);animation:gcStatic .9s steps(3) infinite}
@keyframes gcStatic{0%{transform:translateY(0)}50%{transform:translateY(2px)}100%{transform:translateY(-1px)}}
.tsm .tsmRitualLayer[data-rid="113"] .gcHill{position:absolute;left:-40%;right:-40%;bottom:-40%;border-radius:50% 50% 0 0 / 22% 22% 0 0;transition:opacity 1.4s ease}
.tsm .tsmRitualLayer[data-rid="113"] .gcHill.calm{opacity:0}
.tsm .tsmRitualLayer[data-rid="113"] .gcPad{position:absolute;width:var(--pw);height:calc(var(--pw)*.2);margin:calc(var(--pw)*-.1) 0 0 calc(var(--pw)*-.5);border-radius:50%;
  background:radial-gradient(closest-side, rgba(20,16,40,.55), rgba(20,16,40,.2) 70%, transparent),radial-gradient(4px 4px at 12% 50%, var(--pl) 50%, transparent 52%),radial-gradient(4px 4px at 28% 78%, var(--pl) 50%, transparent 52%),radial-gradient(4px 4px at 50% 88%, var(--pl) 50%, transparent 52%),radial-gradient(4px 4px at 72% 78%, var(--pl) 50%, transparent 52%),radial-gradient(4px 4px at 88% 50%, var(--pl) 50%, transparent 52%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.22)}
.tsm .tsmRitualLayer[data-rid="113"] .gcRocket{position:absolute;left:0;top:0;width:var(--rw);height:var(--rh);z-index:6;transition:transform 1.25s cubic-bezier(.45,0,.2,1)}
.tsm .tsmRitualLayer[data-rid="113"] .gcRocketIn{position:absolute;inset:0;animation:gcHover 2.6s ease-in-out infinite}
@keyframes gcHover{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-5px) rotate(1.5deg)}}
.tsm .tsmRitualLayer[data-rid="113"] .gcRocket.landed .gcRocketIn{animation:none}
.tsm .tsmRitualLayer[data-rid="113"] .gcBody{position:absolute;left:14%;right:14%;top:0;bottom:12%;border-radius:50% 50% 38% 38% / 62% 62% 26% 26%;
  background:radial-gradient(60% 40% at 34% 30%, rgba(255,255,255,.9), transparent 70%),linear-gradient(90deg,#b7b4d6 0%,#f4f2ff 38%,#d9d6f0 64%,#8d88b6 100%);box-shadow:inset 0 -6px 10px rgba(60,50,110,.35)}
.tsm .tsmRitualLayer[data-rid="113"] .gcFin{position:absolute;bottom:6%;width:30%;height:34%;background:linear-gradient(180deg,#ff8aa0,#c8406a)}
.tsm .tsmRitualLayer[data-rid="113"] .gcFin.l{left:0;border-radius:80% 0 20% 40%}
.tsm .tsmRitualLayer[data-rid="113"] .gcFin.r{right:0;border-radius:0 80% 40% 20%}
.tsm .tsmRitualLayer[data-rid="113"] .gcDome{position:absolute;left:50%;top:22%;width:var(--dd);height:var(--dd);margin-left:calc(var(--dd)*-.5);border-radius:50%;overflow:hidden;background:#20184a;
  box-shadow:0 0 0 3px #8f8ac0, 0 0 0 5px #e9e6ff, inset 0 0 8px rgba(0,0,0,.4)}
.tsm .tsmRitualLayer[data-rid="113"] .gcDome img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.18)}
.tsm .tsmRitualLayer[data-rid="113"] .gcFlame{position:absolute;left:50%;top:88%;width:34%;height:40%;margin-left:-17%;border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;transform-origin:50% 0;
  background:radial-gradient(60% 50% at 50% 20%, #fff7d0 0%, #ffcf5a 40%, rgba(255,110,60,.7) 70%, transparent 100%);animation:gcFlame .16s ease-in-out infinite alternate;transition:opacity .6s}
@keyframes gcFlame{from{transform:scaleY(.86)}to{transform:scaleY(1.08)}}
.tsm .tsmRitualLayer[data-rid="113"] .gcRocket.landed .gcFlame{opacity:0}
.tsm .tsmRitualLayer[data-rid="113"] .gcWord{position:absolute;width:var(--ww);margin-left:calc(var(--ww)*-.5);text-align:center;pointer-events:none;z-index:4;transition:opacity .7s ease, transform .7s ease}
.tsm .tsmRitualLayer[data-rid="113"] .gcWord::before{content:"";position:absolute;left:-10%;right:-10%;top:-30%;bottom:-30%;border-radius:50%;background:radial-gradient(closest-side, rgba(170,150,250,.34), transparent);z-index:-1}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcWord::before{background:radial-gradient(closest-side, rgba(255,255,255,.75), transparent)}
.tsm .tsmRitualLayer[data-rid="113"] .gcWord img{display:block;width:36px;height:36px;margin:0 auto 4px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,255,255,.6)}
.tsm .tsmRitualLayer[data-rid="113"] .gcWord span{display:block;font-size:var(--fs);line-height:1.2;font-weight:500;color:#f1ecff;text-shadow:0 1px 8px rgba(30,10,80,.7);overflow-wrap:anywhere}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcWord span{color:#2b2160;text-shadow:0 1px 0 rgba(255,255,255,.8)}
.tsm .tsmRitualLayer[data-rid="113"] .gcWord.burn span,.tsm .tsmRitualLayer[data-rid="113"] .gcWord.burn img{opacity:0;transform:translateY(-8px) scale(.9);transition:opacity .5s ease, transform .5s ease}
.tsm .tsmRitualLayer[data-rid="113"] .gcFound{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;font-size:28px;line-height:46px;text-align:center;opacity:0;transform:scale(.3);
  background:radial-gradient(closest-side, rgba(255,226,150,.55), transparent);transition:opacity .5s ease .25s, transform .7s cubic-bezier(.3,1.7,.5,1) .25s}
.tsm .tsmRitualLayer[data-rid="113"] .gcWord.burn .gcFound{opacity:1;transform:scale(1)}
.tsm .tsmRitualLayer[data-rid="113"] .gcBeacon{position:absolute;touch-action:none;cursor:pointer;z-index:7;-webkit-touch-callout:none}
.tsm .tsmRitualLayer[data-rid="113"] .gcLamp{position:absolute;left:50%;top:0;width:var(--ld);height:var(--ld);margin-left:calc(var(--ld)*-.5);border-radius:50%;overflow:hidden;transition:transform .14s cubic-bezier(.3,1.6,.5,1);
  background:radial-gradient(circle at 50% 30%, rgba(255,255,255,.22), transparent 55%),radial-gradient(circle at 50% 60%, #3a2c86 0%, #1c1446 100%);
  box-shadow:inset 0 0 0 2px rgba(220,210,255,.5), 0 8px 18px rgba(10,6,40,.45)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcLamp{background:radial-gradient(circle at 50% 30%, rgba(255,255,255,.7), transparent 55%),radial-gradient(circle at 50% 60%, #ffffff 0%, #ddd5fb 100%);box-shadow:inset 0 0 0 2px rgba(120,100,220,.55), 0 8px 18px rgba(60,40,140,.22)}
.tsm .tsmRitualLayer[data-rid="113"] .gcBeacon.press .gcLamp{transform:scale(1.08,.92)}
.tsm .tsmRitualLayer[data-rid="113"] .gcFill{position:absolute;inset:0;transform-origin:50% 100%;transform:scaleY(0);
  background:radial-gradient(circle at 50% 40%, #fff6d6 0%, #ffd36b 45%, #ff9a3c 100%)}
.tsm .tsmRitualLayer[data-rid="113"] .gcIcon{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:calc(var(--ld)*.42);line-height:1}
.tsm .tsmRitualLayer[data-rid="113"] .gcHold{position:absolute;left:0;right:0;bottom:9%;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#fff3cf;text-shadow:0 1px 3px rgba(20,10,60,.8)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcHold{color:#4a37a8;text-shadow:none}
.tsm .tsmRitualLayer[data-rid="113"] .gcBeacon.lit .gcLamp{box-shadow:inset 0 0 0 2px rgba(255,236,180,.9), 0 0 26px rgba(255,200,90,.75), 0 8px 18px rgba(10,6,40,.35)}
.tsm .tsmRitualLayer[data-rid="113"] .gcLabel{position:absolute;left:-4px;right:-4px;text-align:center;font-size:13.5px;line-height:1.2;font-weight:500;color:#ece6ff;text-shadow:0 1px 4px rgba(10,6,40,.7)}
.tsm .tsmRitualLayer[data-rid="113"] .gcLabel b{font-weight:750;color:#ffd56b}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcLabel{color:#2b2160;text-shadow:0 1px 0 rgba(255,255,255,.75)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcLabel b{color:#b5531c}
.tsm .tsmRitualLayer[data-rid="113"] .gcBeacon.lit .gcLabel{opacity:.78}
.tsm .tsmRitualLayer[data-rid="113"] .gcSwap{position:absolute;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:600;color:#efeaff;touch-action:none;z-index:2;
  background:radial-gradient(circle at 50% 35%, #4b3ba0, #2a1f66);box-shadow:inset 0 0 0 1.5px rgba(220,210,255,.55), 0 4px 10px rgba(10,6,40,.4);transition:transform .14s}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcSwap{color:#4a37a8;background:radial-gradient(circle at 50% 35%, #fff, #e6defd);box-shadow:inset 0 0 0 1.5px rgba(120,100,220,.5), 0 4px 10px rgba(60,40,140,.2)}
.tsm .tsmRitualLayer[data-rid="113"] .gcSwap:active{transform:rotate(-90deg) scale(.92)}
.tsm .tsmRitualLayer[data-rid="113"] .gcStarLine{position:absolute;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity 1s ease}
.tsm .tsmRitualLayer[data-rid="113"] .gcStarLine.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="113"] .gcCaption{position:absolute;left:0;right:0;text-align:center;font-size:21px;font-weight:600;color:#fff;text-shadow:0 2px 14px rgba(20,30,80,.55);opacity:0;transform:translateY(8px);transition:opacity .9s ease, transform .9s ease;pointer-events:none;z-index:8}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="113"] .gcCaption{color:#1f2a66;text-shadow:0 1px 0 rgba(255,255,255,.8)}
.tsm .tsmRitualLayer[data-rid="113"] .gcCaption.on{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="113"] .gcFog,.tsm .tsmRitualLayer[data-rid="113"] .gcStatic,.tsm .tsmRitualLayer[data-rid="113"] .gcRocketIn,.tsm .tsmRitualLayer[data-rid="113"] .gcFlame{animation:none}}
`

type GcState = "idle" | "fill" | "hold" | "paused" | "lit"

function RitualGround({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const timers = useTimers()
    const seed = Math.abs(ctx.seed)
    const v = seed % 3
    const mirror = Math.floor(seed / 3) % 2 === 1
    const words = React.useMemo(() => gcWords(ctx), [])
    const dark = ctx.theme !== "bright"
    const calmPal = React.useMemo(() => {
        let dp = "dusk"
        try {
            dp = eosDayPart()
        } catch (e) {}
        return GC_CALM[dp] || GC_CALM.dusk
    }, [])
    const loudPal = dark ? GC_LOUD[v] : GC_LOUD_BRIGHT

    // missions per slot
    const initial = React.useMemo(() => {
        const kinds = GC_KINDS[v]
        const spots = GC_SPOT_START[(v + Math.floor(seed / 3)) % 3]
        let si = 0
        let bi = 0
        return kinds.map((k) => (k === "spot" ? { kind: k, spot: spots[si++], body: null as GcMission | null } : { kind: k, spot: -1, body: bi++ === 0 ? GC_FEET : GC_RELEASE[(seed + Math.floor(seed / 5)) % 3] }))
    }, [])
    const [spotIdx, setSpotIdx] = React.useState<number[]>(() => initial.map((b) => b.spot))
    const [st, setSt] = React.useState<GcState[]>(() => Array(5).fill("idle"))
    const [burnt, setBurnt] = React.useState<boolean[]>(() => Array(5).fill(false))
    const [foundIcon, setFoundIcon] = React.useState<string[]>(() => Array(5).fill(""))
    const [lit, setLit] = React.useState(0)
    const [press, setPress] = React.useState(-1)
    const [landed, setLanded] = React.useState(false)
    const [final, setFinal] = React.useState(false)
    const [holding, setHolding] = React.useState(-1)
    const stRef = useLatest(st)
    const litRef = React.useRef(0)
    const mount = React.useRef(performance.now())
    const lastSpot = React.useRef(-1e9)
    const quick = React.useRef(false)
    const paused = React.useRef(false)
    const swaps = React.useRef(0)
    const acc = React.useRef<number[]>([0, 0, 0, 0, 0])
    const holdPid = React.useRef(-1)
    const fillRefs = React.useRef<(HTMLElement | null)[]>([])
    const hintRef = React.useRef("")
    const worldRef = React.useRef<HTMLDivElement>(null)

    const mission = (i: number): GcMission => (initial[i].kind === "spot" ? GC_SPOTS[spotIdx[i]] : (initial[i].body as GcMission))
    const assist = () => performance.now() - mount.current > 26000
    const hint = (t: string) => {
        hintRef.current = t
        ctx.hint(t)
    }

    // ---- layout ----
    const bw = Math.floor(Math.min(118, (w - 48) / 3))
    const ld = Math.round(Math.min(78, bw * 0.68))
    const bh = ld + 46
    const yF = h - 82 - bh / 2
    const yB = yF - bh - 12
    const side = mirror ? -1 : 1
    const slotPos = [
        { x: w / 2, y: yF },
        { x: w / 2 - side * (bw + 12), y: yF },
        { x: w / 2 + side * (bw + 12), y: yF },
        { x: w / 2 - side * (bw / 2 + 60), y: yB },
        { x: w / 2 + side * (bw / 2 + 60), y: yB },
    ]
    const lampC = (i: number) => ({ x: slotPos[i].x, y: slotPos[i].y - bh / 2 + ld / 2 })
    const hillTop = yB - bh / 2 - 22
    const padW = Math.min(108, w * 0.27)
    const padY = yB + 6
    const rkW = Math.round(clamp(w * 0.19, 64, 80))
    const rkH = Math.round(rkW * 1.55)
    const skyBot = hillTop - 4
    const yStart = Math.max(rkH / 2 + 8, skyBot * 0.3)
    const yEnd = padY - rkH * 0.44
    const fracLit = landed ? 1 : lit / 5.6
    const rkY = lerp(yStart, yEnd, fracLit)
    const rkScale = lerp(0.82, 1, landed ? 1 : lit / 5)
    // worry words: left column (3) and right column (2), clear of the rocket's column
    const colW = Math.floor(w / 2 - rkW / 2 - 24)
    const colX = [(w / 2 - rkW / 2) / 2 + 2, w - (w / 2 - rkW / 2) / 2 - 2]
    const wordPos = [
        { x: colX[0], y: skyBot * 0.17 },
        { x: colX[1], y: skyBot * 0.32 },
        { x: colX[0], y: skyBot * 0.5 },
        { x: colX[1], y: skyBot * 0.7 },
        { x: colX[0], y: skyBot * 0.83 },
    ].map((p) => ({ x: mirror ? w - p.x : p.x, y: p.y - (ctx.uploaded ? 20 : 10) }))
    const wordFs = (t: string) => clamp(Math.min(16, (colW - 8) / (Math.max(...t.split(/\s+/).map((x) => x.length), 1) * 0.56)), 12, 16)

    // ---- lighting a beacon ----
    const light = (i: number) => {
        if (stRef.current[i] === "lit") return
        const next = stRef.current.map((s, j) => (j === i ? ("lit" as GcState) : s))
        stRef.current = next
        setSt(next)
        const n = ++litRef.current
        setLit(n)
        const k = n - 1 // the k-th worry word burns
        const m = mission(i)
        const el = fillRefs.current[i]
        if (el) {
            el.style.transition = "transform .25s ease"
            el.style.transform = "scaleY(1)"
        }
        ctx.sfx(n < 5 ? "bell" : "chime")
        ctx.haptic([12, 40, 18])
        ctx.progress((n * 18) / 100)
        // the searchlight beam sweeps from the lamp to the word
        const a = lampC(i)
        const b = wordPos[k]
        const steps = 14
        for (let s = 0; s <= steps; s++)
            timers.after(s * 16, () => {
                const t = s / steps
                ctx.fx.add({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), size: 10 + 8 * t, max: 0.7, shape: "glow", color: "rgba(255,226,150,1)", add: true })
            })
        timers.after(260, () => {
            // the word burns: embers rise, its letters drift up and go out
            const letters = Array.from(words[k] || "").filter((c) => c !== " ")
            if (letters.length) ctx.fx.burst(b.x, b.y, { count: Math.min(18, letters.length), shape: "text", text: letters, size: [13, 16], speed: [30, 90], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [0.9, 1.4], gravity: -80, drag: 0.97, spin: 2, colors: ["rgba(255,196,120,1)", "rgba(255,150,90,1)"], add: false })
            ctx.fx.burst(b.x, b.y, { count: 16, shape: "spark", size: [1.5, 3], speed: [40, 160], angle: [-Math.PI, 0], life: [0.5, 1.0], gravity: -40, drag: 0.95, colors: ["rgba(255,200,110,1)", "rgba(255,240,200,1)"] })
            setBurnt((bb) => bb.map((x, j) => (j === k ? true : x)))
            setFoundIcon((f) => f.map((x, j) => (j === k ? m.found : x)))
        })
        if (n === 5) return land()
        hint(n === 4 ? "One beacon left · nearly down" : m.sense === "body" ? "Steady · that's the ground" : GC_FOUND_CUES[(n - 1) % 3])
    }

    // spot: tap → fill → lit
    const spotTap = (i: number) => {
        const s = stRef.current[i]
        if (s !== "idle") return ack(i)
        const now = performance.now()
        const rushed = now - lastSpot.current < 1500
        if (rushed) quick.current = true
        lastSpot.current = now
        const ms = assist() ? 900 : rushed ? 2400 : 1200
        const next = stRef.current.map((x, j) => (j === i ? ("fill" as GcState) : x))
        stRef.current = next
        setSt(next)
        ctx.sfx("tap")
        ctx.haptic(10)
        hint(rushed ? "Keep looking… really find it" : "Keep looking…")
        const el = fillRefs.current[i]
        if (el) {
            el.style.transition = `transform ${ms}ms linear`
            void el.offsetWidth
            el.style.transform = "scaleY(1)"
        }
        timers.after(ms, () => light(i))
    }
    const ack = (i: number) => {
        ctx.sfx("soft")
        ctx.haptic(6)
    }

    // body: press and hold (accumulated, paused on release)
    const bodyDown = (i: number, e: React.PointerEvent) => {
        const s = stRef.current[i]
        if (s === "lit" || holding >= 0) return ack(i)
        try {
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch (err) {}
        holdPid.current = e.pointerId
        const next = stRef.current.map((x, j) => (j === i ? ("hold" as GcState) : x))
        stRef.current = next
        setSt(next)
        frameT.current = 0
        setHolding(i)
        ctx.sfx("soft")
        ctx.haptic(10)
        hint(mission(i).cue || "Keep holding…")
    }
    const bodyUp = (i: number, e: React.PointerEvent) => {
        if (holding !== i || e.pointerId !== holdPid.current) return
        holdPid.current = -1
        setHolding(-1)
        if (stRef.current[i] === "hold") {
            paused.current = true
            const next = stRef.current.map((x, j) => (j === i ? ("paused" as GcState) : x))
            stRef.current = next
            setSt(next)
            ctx.sfx("soft")
            hint("Paused · hold again to finish")
        }
    }
    const frameT = React.useRef(0)
    useFrame(() => {
        // wall-clock steps (a slow frame never slows the ritual down)
        const tNow = performance.now()
        const dt = frameT.current ? Math.min(1, (tNow - frameT.current) / 1000) : 0.016
        frameT.current = tNow
        const i = holding
        if (i < 0 || stRef.current[i] !== "hold") return
        const need = assist() ? 1800 : 3000
        acc.current[i] += dt * 1000
        const k = clamp01(acc.current[i] / need)
        const el = fillRefs.current[i]
        if (el) {
            el.style.transition = "none"
            el.style.transform = `scaleY(${k})`
        }
        if (Math.random() < 0.1) ctx.fx.add({ x: lampC(i).x + (Math.random() - 0.5) * ld * 0.6, y: lampC(i).y + ld * 0.3, vy: -40, max: 0.8, size: 4, shape: "glow", color: "rgba(255,214,120,1)", add: true })
        if (k >= 1) {
            setHolding(-1)
            holdPid.current = -1
            light(i)
        }
    }, holding >= 0)

    const swap = (i: number) => {
        if (stRef.current[i] !== "idle" || initial[i].kind !== "spot") return
        const used = new Set(spotIdx.filter((x, j) => j !== i && x >= 0))
        let n = spotIdx[i]
        for (let k = 0; k < GC_SPOTS.length; k++) {
            n = (n + 1) % GC_SPOTS.length
            if (!used.has(n)) break
        }
        swaps.current++
        setSpotIdx((s) => s.map((x, j) => (j === i ? n : x)))
        ctx.sfx("soft")
        ctx.haptic(6)
    }

    // ---- touchdown ----
    const land = () => {
        ctx.hint("")
        timers.after(320, () => setLanded(true))
        timers.after(1450, () => {
            ctx.progress(0.96)
            setFinal(true)
            ctx.sfx("chime")
            ctx.haptic([20, 60, 20, 60, 40])
            for (let k = 0; k < 10; k++) ctx.fx.add({ x: w / 2 + (k - 4.5) * 9, y: padY, vx: (k - 4.5) * 22, vy: -30 - Math.random() * 30, max: 1.1, size: 10, grow: 26, shape: "smoke", color: dark ? "rgba(220,210,255,.35)" : "rgba(255,255,255,.7)", add: !dark })
            // the beams salute: every lamp sends a beam up into the clear sky
            for (let i = 0; i < 5; i++) {
                const a = lampC(i)
                ctx.fx.burst(a.x, a.y, { count: 1, shape: "streak", size: [3, 3], speed: [900, 900], angle: [-Math.PI / 2 + (a.x - w / 2) / w * 0.6, -Math.PI / 2 + (a.x - w / 2) / w * 0.6], life: [0.6, 0.6], drag: 1, colors: ["rgba(255,236,180,1)"] })
            }
            wordPos.forEach((p) => ctx.fx.burst(p.x, p.y, { count: 6, shape: "glow", size: [4, 8], speed: [20, 70], life: [0.8, 1.3], drag: 0.95, colors: ["rgba(255,226,150,1)", "rgba(255,255,255,1)"] }))
        })
        timers.after(2450, () => {
            ctx.sfx("win")
            const bonus = clamp(296 + (quick.current ? 0 : 24) + (paused.current ? 0 : 20) + Math.min(20, swaps.current * 10), 260, 360)
            ctx.complete(bonus)
        })
    }

    React.useEffect(() => {
        hint("Spot it in your room · tap its beacon")
    }, [])

    const onWorldDown = (e: React.PointerEvent) => {
        if (final || landed) return
        const p = localPoint(e, worldRef.current)
        ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [6, 6], grow: 90, life: [0.7, 0.7], speed: [0, 0], colors: [dark ? "rgba(200,190,255,.7)" : "rgba(90,70,200,.5)"] })
        ctx.sfx("soft")
        // the hint points at the unlit beacon nearest the touch
        let best = -1
        let bd = 1e9
        for (let i = 0; i < 5; i++)
            if (stRef.current[i] !== "lit") {
                const d = dist(p.x, p.y, slotPos[i].x, slotPos[i].y)
                if (d < bd) {
                    bd = d
                    best = i
                }
            }
        if (best >= 0) {
            const m = mission(best)
            hint(m.sense === "body" ? `Hold the ${m.t[1].toLowerCase()} beacon` : `Find ${[m.t[0], m.t[1].toLowerCase(), m.t[2]].filter(Boolean).join(" ")}`.slice(0, 38))
        }
    }

    const calmK = final ? 1 : lit / 5
    const grad = (p: { sky: string[] }) => `radial-gradient(90% 50% at 50% 100%, ${p.sky[2]}99 0%, transparent 70%),linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 55%, ${p.sky[2]} 100%)`
    const hillGrad = (p: { hill: string[] }) => `radial-gradient(60% 30% at 50% 4%, rgba(255,255,255,.16), transparent 70%),linear-gradient(180deg, ${p.hill[0]} 0%, ${p.hill[1]} 40%)`
    const constellation = wordPos.map((p) => `${p.x},${p.y}`)
    return (
        <div ref={worldRef} style={{ position: "absolute", inset: 0 }} onPointerDown={onWorldDown}>
            <div className="gcSky" style={{ background: grad(loudPal) }} />
            <div className="gcCalm" style={{ background: grad(calmPal), opacity: calmK }} />
            <div className="gcStars" style={{ opacity: final ? 0.25 : undefined }} />
            <div className="gcHill" style={{ top: hillTop, background: hillGrad(dark ? calmPal : GC_CALM_HILL_BRIGHT) }} />
            <div className="gcHill" style={{ top: hillTop, background: hillGrad(loudPal), opacity: 1 - calmK }} />
            <i className="gcPad" style={{ left: w / 2, top: padY, ["--pw" as any]: `${padW}px`, ["--pl" as any]: lit > 0 || final ? "rgba(255,214,120,1)" : "rgba(200,190,255,.45)" }} />
            <div className="gcFog" style={{ bottom: h - hillTop - 30, opacity: final ? 0 : 1 - lit / 5.5 }} />
            <svg className={cx("gcStarLine", final && "on")} width={w} height={h} aria-hidden="true">
                <polyline points={constellation.join(" ")} fill="none" stroke="rgba(255,220,140,.75)" strokeWidth="1.5" strokeDasharray="3 5" />
            </svg>
            {words.map((t, k) => (
                <div key={k} className={cx("gcWord", burnt[k] && "burn")} style={{ left: wordPos[k].x, top: wordPos[k].y, ["--ww" as any]: `${colW}px`, ["--fs" as any]: `${wordFs(t)}px` }} aria-label={burnt[k] ? `${t} — burnt off` : `Worry: ${t}`} role="img">
                    {ctx.uploaded ? <img src={ctx.pic(k, burnt[k]) || ""} alt="" draggable={false} /> : null}
                    <span>{t}</span>
                    <i className="gcFound" aria-hidden="true">
                        {foundIcon[k]}
                    </i>
                </div>
            ))}
            <div className={cx("gcRocket", landed && "landed")} style={{ ["--rw" as any]: `${rkW}px`, ["--rh" as any]: `${rkH}px`, ["--dd" as any]: `${Math.round(rkW * 0.56)}px`, transform: `translate3d(${w / 2 - rkW / 2}px,${rkY - rkH / 2}px,0) scale(${rkScale})` }} role="img" aria-label="GLITCH's rocket">
                <div className="gcRocketIn">
                    <i className="gcFlame" />
                    <i className="gcFin l" />
                    <i className="gcFin r" />
                    <i className="gcBody" />
                    <span className="gcDome">
                        <img src={tsmFaceUrl("glitch", final ? 58 : lit >= 4 ? 7 : lit >= 2 ? 49 : 15)} alt="" draggable={false} />
                    </span>
                </div>
            </div>
            <div className="gcStatic" style={{ opacity: final ? 0 : 0.9 * (1 - lit / 5) }} />
            {slotPos.map((p, i) => {
                const m = mission(i)
                const s = st[i]
                const body = initial[i].kind === "body"
                const label = (
                    <>
                        {m.t[0] ? `${m.t[0]} ` : ""}
                        <b>{m.t[1]}</b>
                        {m.t[2] ? ` ${m.t[2]}` : ""}
                    </>
                )
                return (
                    <div
                        key={i}
                        className={cx("gcBeacon", s === "lit" && "lit", press === i && "press")}
                        style={{ left: p.x - bw / 2, top: p.y - bh / 2, width: bw, height: bh, ["--ld" as any]: `${ld}px` }}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (final || landed) return
                            setPress(i)
                            timers.after(120, () => setPress(-1))
                            if (body) bodyDown(i, e)
                            else spotTap(i)
                        }}
                        onPointerUp={(e) => body && bodyUp(i, e)}
                        onPointerCancel={(e) => body && bodyUp(i, e)}
                        onLostPointerCapture={(e) => body && bodyUp(i, e)}
                        onContextMenu={(e) => e.preventDefault()}
                        role="button"
                        aria-label={s === "lit" ? `${m.t.filter(Boolean).join(" ")} — beacon lit.` : body ? `Beacon: ${m.t.filter(Boolean).join(" ")}. Press and hold for 3 seconds while you do it.` : `Beacon: ${m.t.filter(Boolean).join(" ")}. Find it around you, then tap.`}
                    >
                        <div className="gcLamp">
                            <i className="gcFill" ref={(el) => (fillRefs.current[i] = el)} />
                            <span className="gcIcon">{s === "lit" ? m.found : m.icon}</span>
                            {body && s !== "lit" ? <span className="gcHold">HOLD</span> : null}
                        </div>
                        <div className="gcLabel" style={{ top: ld + 6 }}>
                            {label}
                        </div>
                        {!body && s === "idle" ? (
                            <span
                                className="gcSwap"
                                style={{ left: bw / 2 + ld / 2 - 22, top: -10 }}
                                role="button"
                                aria-label={`Another mission instead of: ${m.t.filter(Boolean).join(" ")}`}
                                onPointerDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    swap(i)
                                }}
                            >
                                ↻
                            </span>
                        ) : null}
                    </div>
                )
            })}
            <div className={cx("gcCaption", final && "on")} style={{ top: Math.max(16, skyBot * 0.04) }} aria-live="polite">
                Touchdown · you're right here
            </div>
        </div>
    )
}

tsmRitual({ id: 113, hint: "Spot it in your room · tap its beacon", css: GC_CSS, Comp: RitualGround })
