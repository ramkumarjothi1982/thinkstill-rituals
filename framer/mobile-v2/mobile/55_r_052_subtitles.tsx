/* ================================================================== */
/* 52 · SUBTITLES — your narrator, recast in three genres              */
/* ================================================================== */
// Desktop rules kept: one card per word chunk (6), sequential; pick one of SOAP / NATURE / SPORT; every pick
// counts (no wrong genre) and advances; progress (i+1)/6; onDone(250) after the last.
// Fixed — the defining WHAT the desktop never built: the genre now really recasts the scene. The SAME exact
// words replay as a soap-opera line (rose velvet, swooning serif, slow push-in), a nature documentary
// (golden savanna, whispered lowercase, slow pan) or sports commentary (floodlights, slammed caps, camera
// shake), each with its own sting. One subtitle only (no duplicate bar), full words, picture + words in
// one frame, the face cracks up once the narrator turns ridiculous. Taps are ignored during the beat.

type SubGenre = "plain" | "soap" | "nature" | "sport"

const SUB_CSS = String.raw`
.tsm .tsmRitualLayer[data-rid="52"] .sbHall{position:absolute;inset:0;background:
  radial-gradient(80% 46% at 50% 38%, rgba(140,120,255,.16) 0%, transparent 70%),
  linear-gradient(180deg,#140a14 0%,#22101c 40%,#1a0c18 78%,#0e070d 100%)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="52"] .sbHall{background:
  radial-gradient(80% 46% at 50% 38%, rgba(255,255,255,.7) 0%, transparent 70%),
  linear-gradient(180deg,#f3e6df 0%,#ead6cc 45%,#dcc1b4 80%,#cfae9f 100%)}
.tsm .tsmRitualLayer[data-rid="52"] .sbScreen{position:absolute;border-radius:22px;overflow:hidden;background:#0b0d16;
  box-shadow:0 0 0 3px rgba(40,28,36,.9), 0 0 0 5px rgba(201,160,90,.55), 0 24px 60px rgba(0,0,0,.55)}
.tsm[data-theme=bright] .tsmRitualLayer[data-rid="52"] .sbScreen{box-shadow:0 0 0 3px rgba(90,60,50,.85), 0 0 0 5px rgba(201,160,90,.7), 0 20px 46px rgba(80,40,30,.28)}
.tsm .tsmRitualLayer[data-rid="52"] .sbScene{position:absolute;inset:0;opacity:0;transition:opacity .45s ease}
.tsm .tsmRitualLayer[data-rid="52"] .sbScene.on{opacity:1}
.tsm .tsmRitualLayer[data-rid="52"] .sbScene.plain{background:radial-gradient(70% 50% at 50% 38%, rgba(120,140,190,.35) 0%, transparent 70%),linear-gradient(180deg,#1a2030 0%,#121624 60%,#0b0d16 100%)}
.tsm .tsmRitualLayer[data-rid="52"] .sbScene.soap{background:
  radial-gradient(60% 40% at 50% 36%, rgba(255,190,220,.55) 0%, transparent 70%),
  repeating-linear-gradient(90deg, rgba(120,10,60,.0) 0px, rgba(120,10,60,.0) 22px, rgba(60,0,30,.35) 30px, rgba(120,10,60,.0) 38px),
  linear-gradient(180deg,#7a1046 0%,#5a0c3a 50%,#2e0620 100%)}
.tsm .tsmRitualLayer[data-rid="52"] .sbScene.nature{background:
  radial-gradient(20% 12% at 72% 30%, rgba(255,240,190,1) 0%, rgba(255,200,110,.6) 40%, transparent 70%),
  linear-gradient(#2a3414,#2a3414) 23.5% 72% / 7px 12% no-repeat,
  radial-gradient(34% 16% at 20% 76%, rgba(40,52,22,.95) 0%, rgba(40,52,22,.95) 30%, transparent 31%),
  radial-gradient(60% 8% at 24% 66%, rgba(36,48,20,.95) 0%, rgba(36,48,20,.95) 50%, transparent 52%),
  linear-gradient(180deg,#f2a65a 0%,#f6c27a 38%,#e7b46a 62%,#8a8a3a 63%,#5e6a2c 80%,#3c4a1e 100%)}
.tsm .tsmRitualLayer[data-rid="52"] .sbScene.sport{background:
  conic-gradient(from 200deg at 12% -10%, transparent 0deg, rgba(255,255,255,.3) 10deg, transparent 22deg),
  conic-gradient(from 140deg at 88% -10%, transparent 0deg, rgba(255,255,255,.3) 12deg, transparent 24deg),
  radial-gradient(90% 30% at 50% 100%, rgba(60,200,90,.9) 0%, rgba(30,120,60,.9) 60%, transparent 61%),
  linear-gradient(180deg,#0b1b4a 0%,#123a8a 55%,#0e2c66 100%)}
.tsm .tsmRitualLayer[data-rid="52"] .sbBar{position:absolute;left:0;right:0;height:5.5%;background:#000;z-index:3;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="52"] .sbCam{position:absolute;inset:0;will-change:transform}
.tsm .tsmRitualLayer[data-rid="52"] .sbCam.soap{animation:sbPush 1.6s cubic-bezier(.3,0,.2,1) forwards}
@keyframes sbPush{from{transform:scale(1)}to{transform:scale(1.12)}}
.tsm .tsmRitualLayer[data-rid="52"] .sbCam.nature{animation:sbPan 1.8s ease-in-out forwards}
@keyframes sbPan{from{transform:translateX(-12px) scale(1.04)}to{transform:translateX(12px) scale(1.04)}}
.tsm .tsmRitualLayer[data-rid="52"] .sbCam.sport{animation:sbShake .5s linear 2}
@keyframes sbShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-5px,3px) rotate(-.6deg)}40%{transform:translate(5px,-2px) rotate(.5deg)}60%{transform:translate(-3px,-3px)}80%{transform:translate(3px,2px)}}
.tsm .tsmRitualLayer[data-rid="52"] .sbFace{position:absolute;left:50%;width:var(--fd);height:var(--fd);margin-left:calc(var(--fd)*-.5);border-radius:50%;overflow:hidden;
  box-shadow:0 0 0 3px rgba(255,255,255,.75), 0 12px 30px rgba(0,0,0,.45)}
.tsm .tsmRitualLayer[data-rid="52"] .sbFace img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.14)}
.tsm .tsmRitualLayer[data-rid="52"] .sbFace img.up{transform:none}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub{position:absolute;left:16px;right:16px;bottom:9%;text-align:center;z-index:2;word-break:break-word;transition:opacity .3s}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.gone{opacity:0}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub .tag{display:table;margin:0 auto 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub .ln{display:inline}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub .ln .wd{display:inline-block;white-space:nowrap;font-weight:inherit}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub .ln span{display:inline-block;white-space:pre;animation:sbIn .4s cubic-bezier(.3,1.4,.5,1) both}
@keyframes sbIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.plain{font-weight:600;color:#fffbe8;text-shadow:0 0 2px #000,0 2px 3px #000,0 0 10px rgba(0,0,0,.7)}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.soap{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:400;color:#ffe6f2;text-shadow:0 0 14px rgba(255,90,170,.9),0 2px 4px rgba(60,0,30,.9)}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.soap .ln span{animation:sbSwoon .7s ease both}
@keyframes sbSwoon{from{opacity:0;transform:translateY(-6px) scale(1.3)}to{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.soap .tag{color:#ffb3d6;font-family:Georgia,serif;letter-spacing:.08em;text-transform:none}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.nature{font-weight:300;letter-spacing:.06em;text-transform:lowercase;color:#fff8e6;text-shadow:0 1px 2px rgba(40,30,10,.9),0 0 12px rgba(60,40,10,.6)}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.nature .ln span{animation:sbHush 1s ease both}
@keyframes sbHush{from{opacity:0}to{opacity:1}}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.nature .tag{color:#ffe7b0;font-style:italic;text-transform:none;letter-spacing:.04em}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.sport{font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.01em;color:#ffe14a;
  text-shadow:2px 2px 0 #0b2a8a,-1px -1px 0 #0b2a8a,1px -1px 0 #0b2a8a,-1px 1px 0 #0b2a8a,0 6px 14px rgba(0,0,0,.6);transform:skewX(-8deg)}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.sport .ln span{animation:sbSlam .32s cubic-bezier(.2,1.8,.4,1) both}
@keyframes sbSlam{from{opacity:0;transform:scale(2.4)}to{opacity:1;transform:none}}
.tsm .tsmRitualLayer[data-rid="52"] .sbSub.sport .tag{color:#fff;background:linear-gradient(90deg,#e8202a,#ff6a3d);padding:3px 8px;border-radius:4px;font-style:normal;text-shadow:none;letter-spacing:.12em}
.tsm .tsmRitualLayer[data-rid="52"] .sbKeys{position:absolute;display:flex;gap:10px}
.tsm .tsmRitualLayer[data-rid="52"] .sbKey{flex:1;height:70px;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;touch-action:none;
  font-size:13px;font-weight:800;letter-spacing:.12em;color:#fff;transition:transform .12s cubic-bezier(.3,1.5,.5,1), opacity .25s;border:0;padding:0}
.tsm .tsmRitualLayer[data-rid="52"] .sbKey svg{width:24px;height:24px}
.tsm .tsmRitualLayer[data-rid="52"] .sbKey.soap{background:linear-gradient(180deg,#e2468f,#a3165a);box-shadow:inset 0 1px 0 rgba(255,255,255,.35), 0 8px 20px rgba(160,20,90,.4)}
.tsm .tsmRitualLayer[data-rid="52"] .sbKey.nature{background:linear-gradient(180deg,#7bb23c,#3f7a1e);box-shadow:inset 0 1px 0 rgba(255,255,255,.35), 0 8px 20px rgba(50,110,30,.4)}
.tsm .tsmRitualLayer[data-rid="52"] .sbKey.sport{background:linear-gradient(180deg,#2f6cf0,#1438a8);box-shadow:inset 0 1px 0 rgba(255,255,255,.35), 0 8px 20px rgba(20,60,180,.4)}
.tsm .tsmRitualLayer[data-rid="52"] .sbKey.press{transform:scale(.93,.88)}
.tsm .tsmRitualLayer[data-rid="52"] .sbKeys.busy .sbKey{opacity:.45}
.tsm .tsmRitualLayer[data-rid="52"] .sbKeys.busy .sbKey.sel{opacity:1;transform:scale(1.04)}
.tsm .tsmRitualLayer[data-rid="52"] .sbCurtain{position:absolute;top:0;bottom:0;width:52%;z-index:6;pointer-events:none;transition:transform 1s cubic-bezier(.5,0,.2,1);
  background:repeating-linear-gradient(90deg,#6e0a1e 0px,#a4142e 14px,#c42038 20px,#8a0f26 30px,#5c0818 38px),#8a0f26;box-shadow:inset 0 -30px 40px rgba(0,0,0,.35)}
.tsm .tsmRitualLayer[data-rid="52"] .sbCurtain.l{left:0;transform:translateX(-102%)}
.tsm .tsmRitualLayer[data-rid="52"] .sbCurtain.r{right:0;transform:translateX(102%)}
.tsm .tsmRitualLayer[data-rid="52"] .sbRoot.end .sbCurtain{transform:none}
.tsm .tsmRitualLayer[data-rid="52"] .sbEnd{position:absolute;left:0;right:0;top:40%;z-index:7;text-align:center;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:34px;color:#ffe6b8;
  text-shadow:0 2px 14px rgba(0,0,0,.6), 0 0 22px rgba(255,200,120,.4);opacity:0;transform:scale(.92);transition:opacity .8s ease 1s, transform 1.2s ease 1s;pointer-events:none}
.tsm .tsmRitualLayer[data-rid="52"] .sbRoot.end .sbEnd{opacity:1;transform:none}
.tsm .tsmRitualLayer[data-rid="52"] .sbKeys{transition:opacity .6s ease}
.tsm .tsmRitualLayer[data-rid="52"] .sbRoot.end .sbKeys{opacity:0}
@media (prefers-reduced-motion: reduce){.tsm .tsmRitualLayer[data-rid="52"] .sbCam,.tsm .tsmRitualLayer[data-rid="52"] .sbSub .ln span{animation:none}}
`

const SUB_TAG: Record<SubGenre, string> = { plain: "", soap: "(gasps) ♥", nature: "[narrator, whispering]", sport: "LIVE" }
const SUB_STING: Record<SubGenre, [string, string]> = { plain: ["tap", "tap"], soap: ["tone", "chime"], nature: ["hum", "soft"], sport: ["bell", "clack"] }

function SubIcon({ g }: { g: SubGenre }) {
    if (g === "soap")
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#fff" />
            </svg>
        )
    if (g === "nature")
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" fill="#fff" />
                <path d="M5 19l8-8" stroke="#3f7a1e" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
        )
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" fill="#fff" />
            <path d="M12 4v16M4 12h16M6.5 6.5c3 3 3 8 0 11M17.5 6.5c-3 3-3 8 0 11" stroke="#1438a8" strokeWidth="1.4" fill="none" />
        </svg>
    )
}

function RitualSubtitles({ ctx }: { ctx: RitualCtx }) {
    const { w, h } = ctx.size
    const N = 6
    const [idx, setIdx] = React.useState(0)
    const [genre, setGenre] = React.useState<SubGenre>("plain")
    const [take, setTake] = React.useState(0)
    const [busy, setBusy] = React.useState(false)
    const [press, setPress] = React.useState<SubGenre | null>(null)
    const [gone, setGone] = React.useState(false)
    const [end, setEnd] = React.useState(false)
    const busyRef = React.useRef(false)
    const timers = useTimers()

    // ---------- layout ----------
    const keysH = 70
    const sx = 16
    const sw = w - 32
    const sTop = 8
    const sh = Math.max(260, h - 84 - keysH - 22 - sTop)
    const keysY = sTop + sh + 16
    const fd = Math.round(Math.min(sw * 0.52, sh * 0.44, 190))
    const faceTop = Math.round(sh * 0.12)
    const word = ctx.words[idx] || ""
    const subFs = (g: SubGenre) => {
        const base = fitThoughtPx(word, (sw - 32) * (g === "nature" ? 0.86 : g === "sport" ? 0.9 : 1), sh * 0.26, g === "sport" ? 30 : 28, 15, 1.2)
        return g === "soap" ? base * 1.06 : g === "nature" ? base * 0.92 : base
    }

    const pick = (g: SubGenre) => {
        if (busyRef.current || end) return
        busyRef.current = true
        setBusy(true)
        setGenre(g)
        setTake((t) => t + 1)
        const [a, b] = SUB_STING[g]
        ctx.sfx(a)
        timers.after(140, () => ctx.sfx(b))
        ctx.haptic(g === "sport" ? [10, 30, 14] : 14)
        const cxm = sx + sw / 2
        const cym = sTop + faceTop + fd / 2
        if (g === "soap") ctx.fx.burst(cxm, cym, { count: 14, shape: "petal", size: [4, 7], speed: [40, 140], life: [1, 1.6], gravity: 60, drag: 0.97, spin: 4, colors: ["rgba(255,150,200,1)", "rgba(255,220,235,1)"], add: false })
        if (g === "nature") ctx.fx.burst(cxm, cym, { count: 10, shape: "glow", size: [2, 4], speed: [10, 40], life: [1.4, 2], gravity: -20, colors: ["rgba(255,240,180,1)"] })
        if (g === "sport") ctx.fx.burst(cxm, sTop + sh * 0.8, { count: 22, shape: "paper", size: [3, 5], speed: [160, 360], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [1, 1.5], gravity: 420, spin: 8, colors: ["#ffe14a", "#ff4d5e", "#4ad1ff", "#ffffff"], add: false })
        const n = idx + 1
        ctx.progress(n / N)
        // the beat: the line plays in its genre, then its letters scatter off the screen
        timers.after(1350, () => {
            const letters = Array.from(word).filter((c) => c !== " ").slice(0, 26)
            const ly = sTop + sh * 0.84
            const col = g === "soap" ? "rgba(255,200,230,1)" : g === "nature" ? "rgba(255,246,220,1)" : "rgba(255,225,74,1)"
            letters.forEach((c, k) =>
                ctx.fx.add({ x: sx + sw / 2 - letters.length * 5 + k * 10, y: ly, vx: (Math.random() - 0.5) * 80, vy: g === "sport" ? -200 - Math.random() * 120 : -40 - Math.random() * 50, ay: g === "sport" ? 500 : -10, drag: 0.985, max: 1.1, size: 15, vr: (Math.random() - 0.5) * 4, shape: "text", text: c, color: col, add: false })
            )
            setGone(true)
            ctx.sfx("soft")
        })
        if (n === N) {
            timers.after(1750, finale)
            return
        }
        timers.after(1800, () => {
            setIdx(n)
            setGenre("plain")
            setGone(false)
            setTake((t) => t + 1)
            setBusy(false)
            busyRef.current = false
            ctx.hint(n === N - 1 ? "Last line — pick its genre" : "Pick a genre for this line")
        })
    }

    const finale = () => {
        ctx.hint("")
        setEnd(true)
        ctx.sfx("soft")
        ctx.haptic(16)
        timers.after(1000, () => {
            ctx.sfx("chime")
            ctx.haptic([10, 40, 10])
            for (let k = 0; k < 16; k++) timers.after(k * 50, () => ctx.fx.add({ x: w * (0.15 + Math.random() * 0.7), y: sTop + sh * (0.15 + Math.random() * 0.6), vy: -20, size: 2 + Math.random() * 3, max: 1.2, shape: "glow", color: "rgba(255,226,170,1)" }))
        })
        timers.after(2300, () => {
            ctx.sfx("win")
            ctx.haptic([20, 60, 20])
            ctx.complete(250)
        })
    }

    React.useEffect(() => {
        ctx.hint("Pick a genre for this line")
    }, [])

    const perLetter = word.replace(/\s+/g, "").length <= 40
    const tokens = word.split(/\s+/).filter(Boolean)
    let ati = 0
    const step = genre === "sport" ? 0.035 : genre === "soap" ? 0.045 : genre === "nature" ? 0.06 : 0.02
    const src = ctx.pic(idx, genre !== "plain")
    const genres: SubGenre[] = ["soap", "nature", "sport"]
    return (
        <div className={cx("sbRoot", end && "end")} style={{ position: "absolute", inset: 0 }}>
            <div className="sbHall" />
            <div className="sbScreen" style={{ left: sx, top: sTop, width: sw, height: sh }} aria-label={`Subtitle: ${word || "your picture"}`}>
                <div className={cx("sbCam", genre !== "plain" && !ctx.reduced && genre)} key={`c${take}`}>
                    {(["plain", "soap", "nature", "sport"] as SubGenre[]).map((g) => (
                        <div key={g} className={cx("sbScene", g, genre === g && "on")} />
                    ))}
                    <span className="sbFace" style={{ top: faceTop, ["--fd" as any]: `${fd}px` }}>
                        {src ? <img className={ctx.uploaded ? "up" : undefined} src={src} alt="" draggable={false} /> : null}
                    </span>
                </div>
                <i className="sbBar" style={{ top: 0 }} />
                <i className="sbBar" style={{ bottom: 0 }} />
                {word ? (
                    <div key={`s${take}`} className={cx("sbSub", genre, gone && "gone")} style={{ fontSize: subFs(genre) }}>
                        {SUB_TAG[genre] ? <span className="tag">{SUB_TAG[genre]}</span> : null}
                        <span className="ln">
                            {tokens.map((wd, wi) => {
                                // letters animate one by one, but a word never breaks across lines
                                const at = ati
                                ati += wd.length + 1
                                return (
                                    <React.Fragment key={wi}>
                                        {wi ? " " : null}
                                        <b className="wd">
                                            {(perLetter ? Array.from(wd) : [wd]).map((c, k) => (
                                                <span key={k} style={{ animationDelay: `${(genre === "plain" ? 0 : (perLetter ? at + k : wi) * step).toFixed(3)}s` }}>
                                                    {c}
                                                </span>
                                            ))}
                                        </b>
                                    </React.Fragment>
                                )
                            })}
                        </span>
                    </div>
                ) : null}
                <i className="sbCurtain l" />
                <i className="sbCurtain r" />
                <div className="sbEnd" aria-live="polite">
                    {end ? "The End" : ""}
                </div>
            </div>
            <div className={cx("sbKeys", busy && "busy")} style={{ left: sx, width: sw, top: keysY }} role="group" aria-label="Pick a genre">
                {genres.map((g) => (
                    <button
                        key={g}
                        className={cx("sbKey", g, press === g && "press", busy && genre === g && "sel")}
                        aria-label={`${g} genre`}
                        aria-disabled={busy}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            if (busyRef.current) {
                                ctx.haptic(4)
                                return
                            }
                            setPress(g)
                            ctx.haptic(8)
                        }}
                        onPointerUp={() => {
                            if (press === g) {
                                setPress(null)
                                pick(g)
                            }
                        }}
                        onPointerLeave={() => setPress(null)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                pick(g)
                            }
                        }}
                    >
                        <SubIcon g={g} />
                        <span>{g.toUpperCase()}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

tsmRitual({ id: 52, hint: "Pick a genre for this line", css: SUB_CSS, Comp: RitualSubtitles })
