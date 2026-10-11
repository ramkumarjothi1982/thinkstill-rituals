/* ================================================================== */
/* 112 · COOL THE VOLCANO — RUSH's volcano at dusk (EOS anger hero)    */
/* ================================================================== */
// Desktop rules kept (eos/22): act A = exactly 6 eruption taps (5 % each → 30 %), each tap launches k word-rocks
// (k from the check-in intensity: ≤ 6 → 1, 7-8 → 2, 9-10 → 3, unknown → 2; one rock per sky slot so words never
// overlap; the 6th tap always launches one); a 2.8 s bridge ("Now watch it cool…"); act B = a breath-paced
// cool-down (pacer in 4 s / out 6 s): hold anywhere = rain at 4.5 %/s, a slow drag during the out-breath doubles it
// (9 %/s), a fast drag only mists (2.25 %/s, "slower…"); the floor schedule guarantees the finish
// (coolEnd = max(mount + 37 s, act-B start + 8 s)); a chime every 20 % of heat removed; progress 30 + 65·cooled;
// RUSH's face arc E29 → simmer → soft → E44 (belly laugh); the cooled lava cracks into a garden before 100;
// bonus 260 + round(100 · slow-cooled share).
// Fixed for the phone: ONLY the crater counts as an eruption tap (desktop counted any tap on the arena), the
// rocks carry the user's words high in the sky band (never over the volcano or RUSH), no BOOM pills/pips/HUD,
// chimes fire on the frame after real cooling (not from an ambient timer), the bridge line fades.

const VLC_SIL: [number, number][] = [[-50, 300], [4, 256], [44, 212], [76, 168], [104, 128], [130, 92], [150, 64], [164, 48], [236, 48], [250, 64], [270, 92], [296, 128], [324, 168], [356, 212], [396, 256], [450, 300]]
const VLC_RIVERS: [number, number][][] = [
    [[186, 52], [172, 84], [150, 124], [124, 168], [94, 214], [62, 258], [30, 300]],
    [[196, 54], [190, 104], [178, 160], [164, 220], [150, 300]],
    [[206, 54], [214, 104], [228, 160], [244, 220], [262, 300]],
    [[214, 52], [230, 86], [254, 128], [282, 172], [312, 218], [344, 262], [376, 300]],
]
const VLC_SIMMER = [52, 58, 52]
const VLC_SOFT = [34, 20, 70]

/** A smooth path through points (quadratic curves through the midpoints). */
function vlcPath(pts: [number, number][], close = false): string {
    if (pts.length < 2) return ""
    let d = `M${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2
        const my = (pts[i][1] + pts[i + 1][1]) / 2
        d += ` Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`
    }
    const l = pts[pts.length - 1]
    d += ` L${l[0]} ${l[1]}`
    return close ? d + " Z" : d
}
/** A point part-way along a polyline (t 0..1 by segment count — good enough for scattering flowers). */
function vlcAlong(pts: [number, number][], t: number): [number, number] {
    const f = clamp01(t) * (pts.length - 1)
    const i = Math.min(pts.length - 2, Math.floor(f))
    const k = f - i
    return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]
}
/** The mountain's surface height (viewBox units) at viewBox x. */
function vlcSurface(vx: number): number {
    if (vx >= 164 && vx <= 236) return 48
    const s = VLC_SIL
    for (let i = 0; i < s.length - 1; i++) {
        const a = s[i]
        const b = s[i + 1]
        if (vx >= a[0] && vx <= b[0] && b[0] !== a[0]) return lerp(a[1], b[1], (vx - a[0]) / (b[0] - a[0]))
    }
    return 300
}

/** Font size so the longest single word never breaks mid-word on a rock. */
function vlcFitPx(text: string, room: number, max: number): number {
    const longest = String(text || "").split(/\s+/).reduce((m, t) => Math.max(m, t.length), 1)
    return clamp(Math.min(max, room / (longest * 0.6)), 11, max)
}

function vlcRocksPerTap(before: number | null): number {
    if (before == null || !isFinite(before) || before <= 0) return 2
    return before <= 6 ? 1 : before <= 8 ? 2 : 3
}

function vlcWords(ctx: RitualCtx): string[] {
    const list = ctx.words.filter(Boolean)
    try {
        const w = eosVolcanoWords(eosWords(list, 8))
        if (w && w.length) return w.slice(0, 6)
    } catch (e) {}
    return list.length ? list.slice(0, 6) : ["boiling over"]
}

const VLC_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="112"] .vlcSky{position:absolute;inset:0;
  background:radial-gradient(70% 38% at 50% 56%, rgba(255,120,40,.55) 0%, rgba(255,80,40,.14) 45%, transparent 70%),
    radial-gradient(120% 50% at 50% 0%, rgba(60,10,40,.9) 0%, transparent 70%),
    linear-gradient(180deg,#14060f 0%,#3b0d1c 34%,#7a1d1f 58%,#c2481c 74%,#5a1a14 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="112"] .vlcSky{
  background:radial-gradient(70% 38% at 50% 56%, rgba(255,170,90,.7) 0%, rgba(255,140,90,.2) 45%, transparent 70%),
    linear-gradient(180deg,#f7b7a0 0%,#f69a7e 34%,#f2795a 58%,#f8a35c 76%,#e9805a 100%)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCool{position:absolute;inset:0;opacity:0;
  background:radial-gradient(80% 40% at 50% 18%, rgba(190,255,236,.20) 0%, transparent 60%),
    linear-gradient(180deg,#0b1c33 0%,#15385a 40%,#2b6873 70%,#4b8f7a 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="112"] .vlcCool{
  background:radial-gradient(80% 40% at 50% 18%, rgba(255,255,255,.7) 0%, transparent 60%),
    linear-gradient(180deg,#9fd3f2 0%,#bfe6f3 45%,#d8f1e4 75%,#eaf7dc 100%)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcEmbers{position:absolute;inset:0 0 40% 0;opacity:.75;transition:opacity 1.2s;
  background-image:radial-gradient(1.6px 1.6px at 14% 22%,#ffb26b 50%,transparent 51%),radial-gradient(1.2px 1.2px at 34% 12%,#ffd29a 50%,transparent 51%),radial-gradient(1.8px 1.8px at 62% 30%,#ff8a4a 50%,transparent 51%),radial-gradient(1.2px 1.2px at 82% 16%,#ffd29a 50%,transparent 51%),radial-gradient(1.4px 1.4px at 90% 44%,#ffb26b 50%,transparent 51%),radial-gradient(1.2px 1.2px at 24% 50%,#ff9a5a 50%,transparent 51%),radial-gradient(1px 1px at 48% 8%,#fff 50%,transparent 51%);
  animation:vlcEmb 7s ease-in-out infinite}
@keyframes vlcEmb{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.tsm .tsmRitualLayer[data-rid="112"] .vlcAurora{position:absolute;left:-10%;right:-10%;top:4%;height:46%;opacity:0;transform:scaleY(.6);transform-origin:50% 100%;transition:opacity 1.4s ease, transform 1.6s ease;
  background:radial-gradient(34% 34% at 50% 62%, rgba(120,255,214,.5) 0%, rgba(120,255,214,.0) 100%),radial-gradient(50% 40% at 30% 50%, rgba(255,214,120,.32) 0%, transparent 100%),radial-gradient(50% 40% at 72% 42%, rgba(140,200,255,.3) 0%, transparent 100%)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcAurora.on{opacity:1;transform:scaleY(1)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcMount{position:absolute;left:0;transform-origin:50% 100%}
.tsm .tsmRitualLayer[data-rid="112"] .vlcMount svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater{position:absolute;touch-action:none;cursor:pointer;border-radius:50%;z-index:6}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater .vlcPool{position:absolute;left:50%;top:62%;width:var(--cw);height:calc(var(--cw)*.36);margin:calc(var(--cw)*-.18) 0 0 calc(var(--cw)*-.5);border-radius:50%;
  background:radial-gradient(closest-side, #fff2c4 0%, #ffb340 35%, #ff5a1f 70%, rgba(200,40,10,0) 100%);transition:transform .12s cubic-bezier(.3,1.6,.5,1), opacity .6s}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater .vlcHalo{position:absolute;left:50%;top:62%;width:calc(var(--cw)*1.9);height:calc(var(--cw)*1.4);margin:calc(var(--cw)*-.82) 0 0 calc(var(--cw)*-.95);border-radius:50%;
  background:radial-gradient(closest-side, rgba(255,150,60,.55), rgba(255,90,30,.18) 55%, transparent);animation:vlcHalo 2.4s ease-in-out infinite;pointer-events:none}
@keyframes vlcHalo{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.04)}}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater.press .vlcPool{transform:scale(1.18,.8)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater .vlcNext{position:absolute;left:50%;bottom:calc(38% + var(--cw)*.24);transform:translateX(-50%);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  font-size:13.5px;font-weight:600;letter-spacing:.01em;color:#fff1d6;text-shadow:0 0 10px rgba(255,120,40,.95), 0 1px 2px rgba(60,10,0,.8);pointer-events:none;transition:opacity .4s}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater.cold{pointer-events:none}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater.cold .vlcHalo,.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater.cold .vlcNext{opacity:0;animation:none}
.tsm .tsmRitualLayer[data-rid="112"] .vlcRock{position:absolute;width:var(--rw);margin-left:calc(var(--rw)*-.5);pointer-events:none;z-index:5;
  animation:vlcFly var(--dur,2000ms) cubic-bezier(.2,.7,.3,1) forwards}
.tsm .tsmRitualLayer[data-rid="112"] .vlcRock .vlcStone{position:relative;padding:12px 12px 13px;border-radius:44% 56% 46% 54% / 52% 44% 56% 48%;text-align:center;
  background:radial-gradient(90% 60% at 50% 110%, rgba(255,110,30,.9) 0%, rgba(255,80,20,.25) 45%, transparent 70%),radial-gradient(60% 50% at 30% 20%, rgba(255,255,255,.14), transparent 70%),linear-gradient(160deg,#4a2a2a 0%,#2a1518 55%,#1a0c10 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,150,80,.55), inset 0 -6px 12px rgba(255,90,20,.35), 0 8px 20px rgba(20,0,0,.45), 0 0 22px rgba(255,100,30,.35)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcRock img{display:block;width:44px;height:44px;margin:0 auto 6px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,200,140,.7)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcRock span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;font-size:var(--fs);line-height:1.18;font-weight:600;color:#ffeedd;text-shadow:0 1px 2px rgba(0,0,0,.6)}
@keyframes vlcFly{0%{transform:translate3d(var(--fx),var(--fy),0) scale(.25) rotate(-14deg);opacity:0}
  8%{opacity:1}40%{transform:translate3d(0,-6px,0) scale(1.04) rotate(3deg)}
  48%{transform:translate3d(0,0,0) scale(1) rotate(0deg)}74%{transform:translate3d(0,3px,0) scale(1) rotate(-1deg)}
  80%{transform:translate3d(0,0,0) scale(1.1,.92) rotate(0deg);opacity:1}86%{transform:translate3d(0,0,0) scale(1.25);opacity:0}100%{transform:scale(1.25);opacity:0}}
.tsm .tsmRitualLayer[data-rid="112"] .vlcRush{position:absolute;z-index:7;transition:transform .9s cubic-bezier(.3,1.45,.5,1)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcRushIn{position:absolute;inset:0}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCloud{position:absolute;width:var(--cw);height:var(--ch);margin:calc(var(--ch)*-.5) 0 0 calc(var(--cw)*-.5);z-index:8;pointer-events:none;will-change:transform;
  transition:opacity .9s ease;opacity:0}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCloud.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCloud i{position:absolute;border-radius:50%;
  background:radial-gradient(circle at 40% 30%, #f6f8ff 0%, #cdd5ea 45%, #8e98b8 100%);box-shadow:inset 0 -8px 16px rgba(60,66,100,.35)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCloud i:nth-child(1){left:4%;top:36%;width:38%;height:52%}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCloud i:nth-child(2){left:22%;top:4%;width:52%;height:70%}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCloud i:nth-child(3){left:56%;top:24%;width:40%;height:58%}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCloud i:nth-child(4){left:12%;top:48%;width:76%;height:44%;border-radius:40px}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCloud .vlcCloudShade{position:absolute;left:10%;right:10%;bottom:4%;height:30%;border-radius:50%;background:radial-gradient(closest-side, rgba(70,80,120,.55), transparent);opacity:var(--wet,0)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcTouch{position:absolute;inset:0;z-index:4;touch-action:none}
.tsm .tsmRitualLayer[data-rid="112"] .vlcTouch.top{z-index:9}
.tsm .tsmRitualLayer[data-rid="112"] .vlcFlower{position:absolute;width:var(--fz);height:var(--fz);margin:calc(var(--fz)*-.5) 0 0 calc(var(--fz)*-.5);border-radius:50%;opacity:0;transform:scale(0) rotate(-40deg);z-index:3;
  transition:transform .7s cubic-bezier(.3,1.7,.5,1), opacity .3s;
  background:radial-gradient(circle, #ffe27a 0 18%, transparent 20%),radial-gradient(circle at 50% 16%, var(--pc) 0 17%, transparent 18%),radial-gradient(circle at 84% 40%, var(--pc) 0 17%, transparent 18%),radial-gradient(circle at 70% 82%, var(--pc) 0 17%, transparent 18%),radial-gradient(circle at 30% 82%, var(--pc) 0 17%, transparent 18%),radial-gradient(circle at 16% 40%, var(--pc) 0 17%, transparent 18%)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcFlower.on{opacity:1;transform:scale(1) rotate(0deg)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCaption{position:absolute;left:0;right:0;text-align:center;font-size:22px;font-weight:600;letter-spacing:.02em;color:#effff8;text-shadow:0 2px 14px rgba(10,40,50,.55);opacity:0;transform:translateY(8px);transition:opacity 1s ease, transform 1s ease;pointer-events:none;z-index:9}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="112"] .vlcCaption{color:#174a52;text-shadow:0 1px 0 rgba(255,255,255,.7)}
.tsm .tsmRitualLayer[data-rid="112"] .vlcCaption.on{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="112"] .vlcRock.calm{animation-name:vlcFade}
@keyframes vlcFade{0%{opacity:0}12%{opacity:1}80%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="112"] .vlcEmbers,.tsm .tsmRitualLayer[data-rid="112"] .vlcCrater .vlcHalo{animation:none}}
`

interface VlcRock {
    id: number
    slot: number
    word: string
    img: string | null
    fx: number
    fy: number
}

function RitualVolcano({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const timers = useTimers()
    const variant = Math.abs(ctx.seed) % 3
    const rushLeft = Math.floor(Math.abs(ctx.seed) / 3) % 2 === 0
    const words = React.useMemo(() => vlcWords(ctx), [])
    const perTap = React.useMemo(() => vlcRocksPerTap(ctx.before), [])
    const dark = ctx.theme !== "bright"

    // ---- layout (stage px) ----
    const cy = Math.round(h * 0.55) // the crater
    const VH = ((h - cy) * 300) / 252
    const vTop = h - VH
    const X = (vx: number) => (vx / 400) * w
    const Y = (vy: number) => vTop + (vy / 300) * VH
    const craterW = Math.max(84, (X(236) - X(164)) * 1.3)
    const rushD = Math.round(clamp(w * 0.21, 72, 92))
    const rushX = rushLeft ? Math.max(rushD / 2 + 10, w * 0.15) : Math.min(w - rushD / 2 - 10, w * 0.85)
    const rushY = h - 92 - rushD / 2
    // six sky slots for the word-rocks: 3 × 2 in the band above the volcano
    const rw = Math.floor(Math.min(116, (w - 48) / 3))
    const band = Math.max(160, cy - 74)
    const slots = Array.from({ length: 6 }, (_, i) => ({ x: (w * ((i % 3) * 2 + 1)) / 6, y: 8 + (band / 2) * (Math.floor(i / 3) + 0.5) - (ctx.uploaded ? 26 : 16) + ((i % 3) === 1 ? 10 : 0) }))
    const cloudW = Math.round(Math.min(176, w * 0.46))
    const cloudH = Math.round(cloudW * 0.58)
    const cloudY = Math.max(cloudH * 0.6 + 8, cy - cloudH * 0.5 - 92)
    const xSpan = Math.min((X(300) - X(100)) * 0.5, w / 2 - cloudW / 2 - 10)

    // ---- state ----
    const [act, setAct] = React.useState<"a" | "bridge" | "b" | "bloom">("a")
    const [taps, setTaps] = React.useState(0)
    const [rocks, setRocks] = React.useState<VlcRock[]>([])
    const [face, setFace] = React.useState(29)
    const [press, setPress] = React.useState(false)
    const [bloom, setBloom] = React.useState(false)
    const [rushUp, setRushUp] = React.useState(false)
    const [caption, setCaption] = React.useState(false)
    const tapsRef = React.useRef(0)
    const rockN = React.useRef(0)
    const rocksRef = useLatest(rocks)
    const lastTap = React.useRef(0)
    const mount = React.useRef(performance.now())
    const worldRef = React.useRef<HTMLDivElement>(null)
    const mountRef = React.useRef<HTMLDivElement>(null)
    const lavaRef = React.useRef<SVGGElement>(null)
    const coolRef = React.useRef<SVGPathElement>(null)
    const coolSkyRef = React.useRef<HTMLDivElement>(null)
    const emberRef = React.useRef<HTMLDivElement>(null)
    const cloudRef = React.useRef<HTMLDivElement>(null)
    const rushRef = React.useRef<HTMLDivElement>(null)

    // act B physics (refs — no React state per frame)
    const B = React.useRef({
        heat: 100,
        t0: 0,
        coolEnd: 0,
        engaged: false,
        pid: -1,
        startX: 0,
        startOff: 0,
        off: 0,
        lastX: 0,
        lastT: 0,
        speed: 0,
        lastMove: -1e9,
        lastEngage: -1e9,
        slowCool: 0,
        chimes: 0,
        phase: "in" as "in" | "out",
        phaseN: -1,
        lastProg: 0,
        hint: "",
        drip: 0,
        mistTone: 0,
        done: false,
    })

    const hint = (t: string) => {
        if (B.current.hint === t) return
        B.current.hint = t
        ctx.hint(t)
    }

    // ---- act A: the crater ----
    const launch = (force: boolean) => {
        const busy = new Set(rocksRef.current.map((r) => r.slot))
        let free = [0, 1, 2, 3, 4, 5].filter((s) => !busy.has(s))
        const add: VlcRock[] = []
        let drop: number[] = []
        if (!free.length && force && rocksRef.current.length) {
            // the 6th tap always launches one: the oldest rock shatters early and gives up its slot
            const old = rocksRef.current[0]
            shatter(old)
            drop = [old.id]
            free = [old.slot]
        }
        const want = Math.min(perTap, free.length)
        // nearest-to-centre slots first, so the first rock is easy to read
        const order = free.sort((a, b) => Math.abs((a % 3) - 1) - Math.abs((b % 3) - 1) || Math.floor(b / 3) - Math.floor(a / 3))
        for (let k = 0; k < want; k++) {
            const slot = order[k]
            const n = rockN.current++
            const wi = n % words.length
            const s = slots[slot]
            add.push({ id: n, slot, word: words[wi], img: ctx.uploaded ? ctx.pic(wi, false) : null, fx: w / 2 - s.x, fy: cy - s.y })
        }
        if (!add.length && !drop.length) return
        setRocks((rs) => rs.filter((r) => !drop.includes(r.id)).concat(add))
        add.forEach((r) => {
            timers.after(ctx.reduced ? 1500 : 1600, () => shatter(r))
            timers.after(ctx.reduced ? 1900 : 2050, () => setRocks((rs) => rs.filter((x) => x.id !== r.id)))
        })
    }

    const shatter = (r: VlcRock) => {
        const s = slots[r.slot]
        if (!rocksRef.current.some((x) => x.id === r.id)) return
        ctx.fx.burst(s.x, s.y + 24, { count: 12, shape: "shard", size: [4, 8], speed: [90, 260], life: [0.6, 1.0], gravity: 620, spin: 6, colors: ["rgba(70,40,40,1)", "rgba(120,60,40,1)", "rgba(255,140,60,1)"], add: false })
        ctx.fx.burst(s.x, s.y + 24, { count: 8, shape: "glow", size: [4, 9], speed: [40, 160], life: [0.4, 0.8], drag: 0.94, colors: ["rgba(255,170,80,1)", "rgba(255,230,170,1)"] })
        const letters = Array.from(r.word).filter((c) => c !== " ")
        if (letters.length)
            ctx.fx.burst(s.x, s.y + 24, { count: Math.min(18, letters.length), shape: "text", text: letters, size: [13, 17], speed: [60, 170], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.9, 1.4], gravity: 260, drag: 0.97, spin: 4, colors: ["rgba(255,214,170,1)", "rgba(255,150,90,1)"], add: false })
    }

    const erupt = () => {
        if (act !== "a" || tapsRef.current >= 6) return
        const now = performance.now()
        const gap = now - lastTap.current
        lastTap.current = now
        const n = ++tapsRef.current
        setTaps(n)
        setPress(true)
        timers.after(110, () => setPress(false))
        ctx.sfx("clack")
        ctx.haptic([12, 40, 18])
        ctx.progress((n * 5) / 100)
        // the boom: lava blobs, sparks, a smoke puff, the volcano squashes
        const big = perTap >= 2 && gap > 450
        if (!ctx.reduced) {
            ctx.fx.burst(w / 2, cy - 4, { count: big ? 26 : 16, shape: "drop", size: [3, 7], speed: [220, 520], angle: [-Math.PI * 0.82, -Math.PI * 0.18], life: [0.7, 1.2], gravity: 760, drag: 0.99, colors: ["rgba(255,120,40,1)", "rgba(255,200,90,1)", "rgba(255,80,30,1)"], add: true })
            ctx.fx.burst(w / 2, cy - 6, { count: 14, shape: "spark", size: [2, 3.4], speed: [160, 420], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [0.35, 0.7], drag: 0.95, colors: ["rgba(255,230,160,1)", "rgba(255,160,70,1)"] })
            ctx.fx.burst(w / 2, cy - 18, { count: 4, shape: "smoke", size: [26, 40], grow: 40, speed: [20, 60], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [1.0, 1.6], colors: [dark ? "rgba(70,40,45,.55)" : "rgba(255,226,210,.3)"], add: !dark })
            ctx.fx.add({ x: w / 2, y: cy - 34, vx: 0, vy: -70, drag: 0.95, max: 0.75, size: 18, rot: 0, vr: 0, shape: "text", text: n === 6 ? "BOOM!" : gap < 700 && n > 1 ? `BOOM ×${n}!` : "BOOM!", color: "rgba(255,236,190,1)", add: false })
            const m = mountRef.current
            if (m && m.animate) m.animate([{ transform: "scale(1,1)" }, { transform: "scale(1.012,.975)" }, { transform: "scale(1,1)" }], { duration: 220, easing: "cubic-bezier(.3,1.6,.5,1)" })
            // screen shake only on quick alternate taps
            if (gap < 300 && n % 2 === 0 && worldRef.current && worldRef.current.animate)
                worldRef.current.animate([{ transform: "translate(0,0)" }, { transform: "translate(-4px,2px)" }, { transform: "translate(4px,-2px)" }, { transform: "translate(-2px,1px)" }, { transform: "translate(0,0)" }], { duration: 260 })
            const r = rushRef.current
            if (r && r.animate) r.animate([{ transform: "scale(1,1)" }, { transform: "scale(1.1,.88)" }, { transform: "scale(1,1)" }], { duration: 260, easing: "cubic-bezier(.3,1.6,.5,1)" })
        } else ctx.fx.burst(w / 2, cy, { count: 1, shape: "ring", size: [20, 20], grow: 120, life: [0.6, 0.6], speed: [0, 0], colors: ["rgba(255,170,90,.8)"] })
        launch(n === 6)
        if (n < 6) hint(`Tap the crater · ${6 - n} more`)
        else bridge()
    }

    const bridge = () => {
        setAct("bridge")
        hint("")
        timers.after(1450, () => hint("Now watch it cool…"))
        timers.after(2800, startCool)
    }

    const startCool = () => {
        const now = performance.now()
        const b = B.current
        b.t0 = now
        b.coolEnd = Math.max(mount.current + 37000, now + 8000)
        b.phaseN = -1
        setAct("b")
        hint("Hold anywhere to rain on the lava")
    }

    // ---- act B: hold anywhere, drag the cloud slowly ----
    const onDown = (e: React.PointerEvent) => {
        e.preventDefault()
        if (act === "a" || act === "bridge") {
            // a miss: answered, never counted (only the crater erupts)
            const p = localPoint(e, worldRef.current)
            ctx.fx.burst(p.x, p.y, { count: 1, shape: "ring", size: [8, 8], grow: 70, life: [0.5, 0.5], speed: [0, 0], colors: ["rgba(255,200,150,.6)"] })
            ctx.sfx("soft")
            ctx.haptic(6)
            if (act === "a") hint(tapsRef.current ? `Tap the crater · ${6 - tapsRef.current} more` : "Tap the crater to erupt it")
            return
        }
        if (act !== "b") return
        const b = B.current
        if (b.engaged) return
        b.engaged = true
        b.pid = e.pointerId
        b.startX = e.clientX
        b.startOff = b.off
        b.lastX = e.clientX
        b.lastT = performance.now()
        b.lastEngage = b.lastT
        try {
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch (err) {}
        ctx.sfx("soft")
        ctx.haptic(8)
        const c = cloudRef.current
        if (c && c.animate) c.animate([{ scale: "1 1" } as any, { scale: "1.08 .9" } as any, { scale: "1 1" } as any], { duration: 260, easing: "cubic-bezier(.3,1.6,.5,1)" })
    }
    const onMove = (e: React.PointerEvent) => {
        const b = B.current
        if (!b.engaged || e.pointerId !== b.pid) return
        const now = performance.now()
        const dt = Math.max(1, now - b.lastT) / 1000
        const inst = Math.abs(e.clientX - b.lastX) / dt
        const k = 1 - Math.exp(-dt / 0.08)
        b.speed += (inst - b.speed) * k
        if (Math.abs(e.clientX - b.lastX) > 0.5) b.lastMove = now
        b.lastX = e.clientX
        b.lastT = now
        // resistance at the edges: the cloud stretches but never leaves the volcano
        const raw = b.startOff + (e.clientX - b.startX)
        b.off = Math.abs(raw) <= xSpan ? raw : Math.sign(raw) * (xSpan + (Math.abs(raw) - xSpan) * 0.2)
    }
    const onUp = (e: React.PointerEvent) => {
        const b = B.current
        if (!b.engaged || e.pointerId !== b.pid) return
        b.engaged = false
        b.pid = -1
        b.lastEngage = performance.now()
        if (Math.abs(b.off) > xSpan) b.off = Math.sign(b.off) * xSpan
    }

    const frameT = React.useRef(0)
    useFrame(() => {
        // wall-clock steps (a slow frame never slows the ritual down)
        const tNow = performance.now()
        const dt = frameT.current ? Math.min(1, (tNow - frameT.current) / 1000) : 0.016
        frameT.current = tNow
        const b = B.current
        if (b.done) return
        const now = performance.now()
        const t = now - b.t0
        // the breath pacer: in 4 s · out 6 s
        const cyc = t % 10000
        const phase = cyc < 4000 ? "in" : "out"
        const pn = Math.floor(t / 10000) * 2 + (phase === "in" ? 0 : 1)
        if (pn !== b.phaseN) {
            b.phaseN = pn
            b.phase = phase
            if (phase === "out" && now - b.lastEngage < 2500) ctx.rain(6.2)
        }
        // speed decays when the finger rests
        if (now - b.lastT > 150) b.speed *= Math.pow(0.02, dt)
        const mist = b.engaged && b.speed > 350
        const moved = now - b.lastMove < 400
        let rate = 0
        if (b.engaged) rate = mist ? 2.25 : phase === "out" && moved ? 9 : 4.5
        const before = b.heat
        b.heat = Math.max(0, b.heat - rate * dt)
        if (!mist && b.engaged) b.slowCool += before - b.heat
        // the floor schedule: an idle player still reaches zero
        const floor = (100 * (b.coolEnd - now)) / Math.max(1, b.coolEnd - b.t0)
        if (b.heat > floor) b.heat = Math.max(0, floor)
        const cooled = 1 - b.heat / 100
        // the world follows the heat
        if (lavaRef.current) lavaRef.current.style.opacity = String(0.1 + 0.9 * (b.heat / 100))
        if (coolRef.current) coolRef.current.style.opacity = String(cooled)
        if (coolSkyRef.current) coolSkyRef.current.style.opacity = String(cooled)
        if (emberRef.current) emberRef.current.style.opacity = String(0.75 * (1 - cooled))
        // the cloud: gathers on the in-breath, pours on the out-breath
        const breath = phase === "in" ? easeInOutCubic(cyc / 4000) : 1 - easeInOutCubic((cyc - 4000) / 6000)
        const sc = 1 + 0.1 * breath
        const c = cloudRef.current
        if (c) {
            c.style.transform = `translate3d(${b.off}px,${-6 * breath}px,0) scale(${sc},${1 + 0.06 * breath})`
            c.style.setProperty("--wet", String(b.engaged ? 0.4 + 0.6 * breath : 0.25 * breath))
        }
        // rain (fx only): a drizzle when idle, real rain when held, a fine mist when too fast
        const cxp = w / 2 + b.off
        const vx = ((cxp / w) * 400)
        const ground = Y(vlcSurface(vx)) - 4
        const drops = b.engaged ? (mist ? 1.2 : phase === "out" ? 5 : 2.5) : 0.25
        let nDrops = Math.floor(drops) + (Math.random() < drops % 1 ? 1 : 0)
        while (nDrops-- > 0) {
            const x0 = cxp + (Math.random() - 0.5) * cloudW * 0.7
            const y0 = cloudY + cloudH * 0.32
            const gy = Y(vlcSurface((x0 / w) * 400)) - 2
            ctx.fx.add(
                mist
                    ? { x: x0, y: y0, vx: (Math.random() - 0.5) * 40, vy: 120 + Math.random() * 60, max: Math.max(0.3, (gy - y0) / 170), size: 6 + Math.random() * 6, grow: 10, shape: "smoke", color: "rgba(220,235,255,.22)", add: !dark }
                    : { x: x0, y: y0, vx: (Math.random() - 0.5) * 18, vy: 520 + Math.random() * 160, ay: 500, max: Math.max(0.12, (gy - y0) / 640), size: 2.3, shape: "drop", color: dark ? "rgba(190,215,255,.9)" : "rgba(90,130,200,.85)", add: false }
            )
        }
        // steam where the rain hits hot lava
        if (b.engaged && b.heat > 3 && Math.random() < (mist ? 0.08 : 0.22) * (0.3 + b.heat / 100))
            ctx.fx.add({ x: cxp + (Math.random() - 0.5) * cloudW * 0.6, y: ground, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, max: 1.2, size: 10, grow: 26, shape: "smoke", color: dark ? "rgba(235,240,255,.30)" : "rgba(255,255,255,.55)", add: !dark })
        // a drip on RUSH when the cloud is over them
        if (b.engaged && Math.abs(cxp - rushX) < cloudW * 0.42 && now - b.drip > 900) {
            b.drip = now
            ctx.fx.add({ x: rushX, y: rushY - rushD * 0.6, vx: 0, vy: 120, ay: 600, max: 0.3, size: 3, shape: "drop", color: "rgba(190,220,255,1)" })
        }
        // the hint is the breath pacer (changes only when the words change)
        if (mist) {
            if (now - b.mistTone > 1200) {
                b.mistTone = now
                ctx.sfx("soft")
            }
            hint("Slower… let it rain gently")
        } else if (!b.engaged) hint(t < 3000 && b.lastEngage < b.t0 ? "Hold anywhere to rain on the lava" : phase === "in" ? "Hold · breathe in as it gathers" : "Hold · breathe out as it rains")
        else hint(phase === "in" ? "Breathe in… the cloud gathers" : "…and out · drag slowly, it pours")
        // chimes at every 20 % cooled (each one a real step), faces soften
        const step = Math.floor(cooled * 5 + 1e-6)
        if (step > b.chimes && b.heat > 0) {
            b.chimes = step
            ctx.sfx("chime")
            ctx.haptic([12, 40, 18])
            for (let k = 0; k < 3; k++) ctx.fx.add({ x: w / 2 + (k - 1) * craterW * 0.4, y: cy, vx: (k - 1) * 10, vy: -70, max: 1.5, size: 14, grow: 30, shape: "smoke", color: dark ? "rgba(235,240,255,.35)" : "rgba(255,255,255,.6)", add: !dark })
            const r = rushRef.current
            if (r && r.animate) r.animate([{ transform: "scale(1,1)" }, { transform: "scale(1.08,.9)" }, { transform: "scale(1,1)" }], { duration: 300, easing: "cubic-bezier(.3,1.6,.5,1)" })
            if (step === 1) setFace(VLC_SIMMER[variant])
            if (step === 3) setFace(VLC_SOFT[variant])
        }
        if (now - b.lastProg > 250) {
            b.lastProg = now
            ctx.progress(Math.min(0.95, (30 + 65 * cooled) / 100))
        }
        if (b.heat <= 0) {
            b.done = true
            finale()
        }
    }, act === "b")

    // ---- act C: the garden ----
    const finale = () => {
        setAct("bloom")
        hint("")
        ctx.progress(0.96)
        ctx.sfx("chime")
        ctx.haptic([20, 60, 20])
        setFace(VLC_SOFT[variant])
        setBloom(true)
        if (lavaRef.current) lavaRef.current.style.opacity = "0"
        if (coolRef.current) coolRef.current.style.opacity = "1"
        // the cloud spins away, the crater becomes a petal spring
        const c = cloudRef.current
        const b = B.current
        if (c) {
            c.style.transition = "transform 1.6s cubic-bezier(.4,0,.2,1), opacity 1.4s ease"
            c.style.transform = `translate3d(${b.off + (b.off >= 0 ? 190 : -190)}px,-60px,0) scale(.7) rotate(${b.off >= 0 ? 18 : -18}deg)`
            c.style.opacity = "0"
        }
        const petals = ["rgba(255,170,200,1)", "rgba(255,226,120,1)", "rgba(190,240,200,1)", "rgba(255,255,255,1)"]
        for (let k = 0; k < 5; k++)
            timers.after(k * 180, () =>
                ctx.fx.burst(w / 2, cy - 4, { count: 10, shape: "petal", size: [4, 7], speed: [140, 300], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [1.0, 1.5], gravity: 300, drag: 0.98, spin: 4, colors: petals, add: false })
            )
        timers.after(1000, () => {
            setRushUp(true)
            ctx.sfx("spark")
        })
        timers.after(1800, () => {
            setFace(44)
            ctx.haptic([20, 60, 20, 60, 40])
            ctx.fx.burst(w / 2, cy - rushD * 0.6, { count: 28, shape: "glow", size: [4, 10], speed: [80, 280], life: [0.8, 1.4], drag: 0.95, colors: ["rgba(255,214,120,1)", "rgba(255,250,220,1)", "rgba(160,255,214,1)"] })
            ctx.fx.burst(w / 2, cy - rushD * 0.6, { count: 1, shape: "ring", size: [rushD * 0.5, rushD * 0.5], grow: w * 0.8, life: [0.9, 0.9], speed: [0, 0], colors: ["rgba(255,226,150,.8)"], add: true })
            setCaption(true)
        })
        timers.after(2450, () => {
            ctx.sfx("win")
            const bonus = 260 + Math.round(100 * clamp01(B.current.slowCool / 100))
            ctx.complete(bonus)
        })
    }

    React.useEffect(() => {
        ctx.hint("Tap the crater to erupt it")
        B.current.hint = "Tap the crater to erupt it"
    }, [])

    // flowers scattered down the four rivers (they race down at the bloom)
    const flowers = React.useMemo(() => {
        const cols = ["#ff8fb6", "#ffd166", "#b9f3c9", "#ffffff", "#ffb38a", "#c9b6ff"]
        const out: { x: number; y: number; d: number; c: string; delay: number }[] = []
        VLC_RIVERS.forEach((r, ri) => {
            ;[0.34, 0.76].forEach((t0, k) => {
                const t = t0 + noise(ri * 7 + k, 3) * 0.12
                const [vx, vy] = vlcAlong(r, t)
                out.push({ x: X(vx) + (noise(ri * 5 + k, 9) - 0.5) * 22, y: Y(vy) + (noise(ri + k * 3, 4) - 0.5) * 10, d: Math.round(15 + t * 13), c: cols[(ri * 3 + k) % cols.length], delay: 200 + k * 220 + ri * 60 })
            })
        })
        return out
    }, [w, h])

    const sil = vlcPath(VLC_SIL, true)
    const gid = "vlc112"
    const rockFs = rw >= 108 ? 14.5 : 13.5
    const nextWord = words[rockN.current % words.length]
    const craterBox = { w: Math.max(150, craterW * 1.6), h: 120 }
    return (
        <div ref={worldRef} style={{ position: "absolute", inset: 0 }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp}>
            <div className="vlcSky" />
            <div ref={coolSkyRef} className="vlcCool" style={{ opacity: act === "bloom" ? 1 : undefined }} />
            <div ref={emberRef} className="vlcEmbers" />
            <div className={cx("vlcAurora", bloom && "on")} />
            <div ref={mountRef} className="vlcMount" style={{ top: vTop, width: w, height: VH }}>
                <svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <linearGradient id={`${gid}m`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor={dark ? "#4a2328" : "#8a4a48"} />
                            <stop offset=".55" stopColor={dark ? "#2a1218" : "#6a3036"} />
                            <stop offset="1" stopColor={dark ? "#14080c" : "#4a2026"} />
                        </linearGradient>
                        <linearGradient id={`${gid}s`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0" stopColor="#000" stopOpacity=".38" />
                            <stop offset=".46" stopColor="#000" stopOpacity="0" />
                            <stop offset=".6" stopColor="#ffb070" stopOpacity=".12" />
                            <stop offset="1" stopColor="#000" stopOpacity=".3" />
                        </linearGradient>
                        <linearGradient id={`${gid}c`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor={dark ? "#3f6b5c" : "#7fb69a"} />
                            <stop offset=".5" stopColor={dark ? "#28473e" : "#5f9a7c"} />
                            <stop offset="1" stopColor={dark ? "#14261f" : "#3f7a5c"} />
                        </linearGradient>
                        <linearGradient id={`${gid}l`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#fff0b0" />
                            <stop offset=".25" stopColor="#ffb340" />
                            <stop offset="1" stopColor="#e2381a" />
                        </linearGradient>
                    </defs>
                    <path d={sil} fill={`url(#${gid}m)`} />
                    <path ref={coolRef} d={sil} fill={`url(#${gid}c)`} style={{ opacity: 0 }} />
                    <path d={sil} fill={`url(#${gid}s)`} />
                    <g ref={lavaRef} strokeLinecap="round" fill="none">
                        <path d={VLC_RIVERS.map((r) => vlcPath(r)).join(" ")} stroke="rgba(255,110,40,.30)" strokeWidth={16} vectorEffect="non-scaling-stroke" />
                        <path d={VLC_RIVERS.map((r) => vlcPath(r)).join(" ")} stroke={`url(#${gid}l)`} strokeWidth={6} vectorEffect="non-scaling-stroke" />
                        <ellipse cx="200" cy="50" rx="34" ry="6" fill="#ffcf6a" />
                    </g>
                    <ellipse cx="200" cy="49" rx="35" ry="5.6" fill="none" stroke={dark ? "rgba(255,190,140,.45)" : "rgba(255,240,220,.7)"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
            {flowers.map((f, i) => (
                <i key={i} className={cx("vlcFlower", bloom && "on")} style={{ left: f.x, top: f.y, ["--fz" as any]: `${f.d}px`, ["--pc" as any]: f.c, transitionDelay: bloom ? `${f.delay}ms` : "0ms" }} />
            ))}
            {/* the crater: the only eruption target */}
            <div
                className={cx("vlcCrater", press && "press", act !== "a" && "cold")}
                style={{ left: w / 2 - craterBox.w / 2, top: cy - craterBox.h * 0.62, width: craterBox.w, height: craterBox.h, ["--cw" as any]: `${craterW}px` }}
                onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    erupt()
                }}
                role="button"
                aria-label={`Volcano crater. Tap to erupt — ${6 - taps} to go. Next rock: ${nextWord}`}
            >
                <i className="vlcHalo" />
                <i className="vlcPool" style={{ opacity: act === "a" || act === "bridge" ? 1 : 0 }} />
                {act === "a" ? <span className="vlcNext">{nextWord}</span> : null}
            </div>
            {rocks.map((r) => {
                const s = slots[r.slot]
                return (
                    <div key={r.id} className={cx("vlcRock", ctx.reduced && "calm")} style={{ left: s.x, top: s.y, ["--rw" as any]: `${rw}px`, ["--fx" as any]: `${r.fx}px`, ["--fy" as any]: `${r.fy}px`, ["--fs" as any]: `${vlcFitPx(r.word, rw - 26, rockFs)}px`, ["--dur" as any]: ctx.reduced ? "1900ms" : "2000ms" }} aria-hidden="true">
                        <div className="vlcStone">
                            {r.img ? <img src={r.img} alt="" draggable={false} /> : null}
                            <span>{r.word}</span>
                        </div>
                    </div>
                )
            })}
            <div
                ref={rushRef}
                className="vlcRush"
                style={{ left: rushX - rushD / 2, top: rushY - rushD / 2, width: rushD, height: rushD, transform: rushUp ? `translate3d(${w / 2 - rushX}px,${cy - rushD * 0.62 - rushY}px,0)` : undefined }}
                role="img"
                aria-label="RUSH"
            >
                <Orb src={tsmFaceUrl("rush", face)} d={rushD} hue={CHAR_HUE.rush} hue2={46} mood={face === 29 ? "tremble" : face === 44 ? "happy" : "float"} aura={face === 44 ? 0.9 : 0.2} />
            </div>
            <div ref={cloudRef} className={cx("vlcCloud", (act === "b" || act === "bridge") && "on")} style={{ left: w / 2, top: cloudY, ["--cw" as any]: `${cloudW}px`, ["--ch" as any]: `${cloudH}px` }} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <span className="vlcCloudShade" />
            </div>
            <div className={cx("vlcCaption", caption && "on")} style={{ top: Math.max(24, cloudY - 30) }} aria-live="polite">
                Cooled to zero
            </div>
            {act === "b" ? <div className="vlcTouch top" role="button" aria-label="Rain cloud. Press and hold anywhere to rain, drag slowly left and right over the lava." /> : null}
        </div>
    )
}

tsmRitual({ id: 112, hint: "Tap the crater to erupt it", css: VLC_CSS, Comp: RitualVolcano })
