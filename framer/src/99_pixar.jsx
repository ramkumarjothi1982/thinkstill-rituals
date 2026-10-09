/*
 * PIXAR UPGRADE LAYER
 * - Warm key light / cool rim light grade that follows the pointer (parallax)
 * - Glassy "character" shading + eye glint on every standard thought bubble
 * - Squash & stretch with anticipation + overshoot whenever a bubble is touched
 * - Chunky rounded toy typography (Baloo 2) across the console
 * - Toy-like 3D buttons with a pressable lip, candy progress bars
 * - Title-card style reward / finish feedback
 * - Soft depth-of-field bokeh, floating dust motes, warm vignette
 * Everything is pointer-events:none overlays or CSS that composes with the
 * existing transforms (uses individual `scale` / `translate` properties), so
 * gameplay logic is untouched. Honours prefers-reduced-motion.
 */

// ID-boosted selector prefix so these rules beat the arcade's own !important rules.
const PX_B = ".tsPixarRoot:not(#tsPxA):not(#tsPxB)"

const PX_SQUASH_TARGETS = [
    ".tsStandardBubble",
    ".thoughtPotato",
    ".spaceTile",
    ".shelfThoughtBubble",
    ".juggleBall",
    ".gwCard",
    ".tsndKey",
    ".dmTake",
    ".ftRow",
    ".spBay",
    ".volumeRow",
    ".cartoonIceCube",
    ".universalToolObject",
    ".throwCard",
    ".sortCard",
    ".eosObj",
].join(",")

const PX_PRESS_TARGETS = [
    ".uniqControl",
    ".bigAction",
    ".releaseModeButton",
    ".releaseChoiceButton",
    ".releaseIconButton",
    ".releaseCompleteActions button",
    ".releaseShiftChoices button",
    ".releaseReplaySame",
    ".releaseRecommendationActions button",
    ".releaseCompleteSideNav",
    ".spDropButton",
    ".dmDramaButton",
    ".dmCutButton",
    ".tsndVibes button",
    ".gwProp",
    ".xrayBurnAllButton",
    ".crackToolDock",
    ".stompToolDock",
    ".laserToolDock",
    ".toolActivateDock",
    ".meltGroundButton",
    ".burnGroundButton",
    ".zapGroundButton",
    ".eraseActivateBtn",
    ".cutLoopScissorPicker",
]

const pxPress = (suffix = "") =>
    PX_PRESS_TARGETS.map((s) => `${PX_B} ${s}${suffix}`).join(",")

const PIXAR_CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap');

.tsPixarRoot{position:relative;width:100%;height:100%;overflow:hidden;
  --pxw:var(--px-warmth,1);--pxi:var(--px-intensity,1);
  --pxmx:.3;--pxmy:.25;}
.tsPixarRoot>.tsArcade{width:100%;height:100%;}

/* ---------- typography: chunky rounded toy type ---------- */
${PX_B} .tsArcade,${PX_B} .tsArcade *:not(img):not(svg):not(path){
  font-family:"Baloo 2","Nunito","Inter",system-ui,sans-serif!important;}
${PX_B} .tsArcade :is(b,strong,.releaseTitleMain,.gameName){letter-spacing:.01em!important;}

/* ---------- light rig overlay ---------- */
.tsPxRig{position:absolute;inset:0;pointer-events:none;z-index:2147483000;overflow:hidden;}
.tsPxRig i{position:absolute;display:block;pointer-events:none;}
.tsPxKey{inset:-30%;
  background:radial-gradient(42% 38% at calc(var(--pxmx)*100%) calc(var(--pxmy)*100%),
    rgba(255,214,150,calc(.20*var(--pxw)*var(--pxi))),rgba(255,180,120,calc(.07*var(--pxw)*var(--pxi))) 45%,transparent 70%);
  mix-blend-mode:soft-light;}
.tsPxRim{inset:-20%;
  background:radial-gradient(50% 46% at calc(100% - var(--pxmx)*70%) calc(100% - var(--pxmy)*55%),
    rgba(90,190,255,calc(.18*var(--pxi))),rgba(140,90,255,calc(.08*var(--pxi))) 48%,transparent 72%);
  mix-blend-mode:screen;opacity:.55;}
.tsPxRays{left:-10%;top:-30%;width:80%;height:140%;
  background:repeating-linear-gradient(105deg,rgba(255,236,190,0) 0 7%,rgba(255,236,190,calc(.045*var(--pxw)*var(--pxi))) 9%,rgba(255,236,190,0) 13%);
  transform:translateX(calc((var(--pxmx) - .5)*6%));filter:blur(14px);mix-blend-mode:screen;
  animation:tsPxRays 16s ease-in-out infinite alternate;}
.tsPxVignette{inset:0;
  background:radial-gradient(120% 95% at 50% 46%,transparent 58%,rgba(24,8,2,calc(.30*var(--pxi))) 100%);}
.tsPxGrade{inset:0;background:linear-gradient(180deg,rgba(255,200,140,calc(.05*var(--pxw))),rgba(60,120,255,.035));
  mix-blend-mode:overlay;}
.tsPxBokeh{border-radius:50%;filter:blur(10px);mix-blend-mode:screen;opacity:.0;
  animation:tsPxBokeh var(--d,14s) ease-in-out infinite;animation-delay:var(--dl,0s);}
.tsPxDust{width:3px;height:3px;border-radius:50%;background:rgba(255,236,200,.85);
  box-shadow:0 0 6px rgba(255,220,160,.8);opacity:0;
  animation:tsPxDust var(--d,11s) linear infinite;animation-delay:var(--dl,0s);}
@keyframes tsPxRays{from{opacity:.55}to{opacity:1}}
@keyframes tsPxBokeh{0%,100%{opacity:0;translate:0 0}40%{opacity:calc(.32*var(--pxi))}60%{opacity:calc(.22*var(--pxi));translate:var(--bx,20px) var(--by,-30px)}}
@keyframes tsPxDust{0%{opacity:0;translate:0 0}12%{opacity:.75}88%{opacity:.5}100%{opacity:0;translate:var(--bx,40px) -140px}}

/* ---------- character shading on thought bubbles ---------- */
${PX_B} .tsStandardBubble::before{content:""!important;position:absolute!important;inset:-3px!important;
  border-radius:50%!important;pointer-events:none!important;z-index:3!important;border:0!important;
  background:
    radial-gradient(16% 11% at 31% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 100%),
    radial-gradient(7% 5% at 38% 33%,rgba(255,255,255,.55),rgba(255,255,255,0) 100%),
    radial-gradient(70% 60% at 30% 22%,rgba(255,226,180,calc(.22*var(--pxw))),rgba(255,226,180,0) 62%),
    radial-gradient(80% 70% at 74% 86%,rgba(20,8,48,.42),rgba(20,8,48,0) 62%),
    radial-gradient(closest-side,rgba(0,0,0,0) 88%,rgba(120,220,255,.55) 96%,rgba(120,220,255,0) 100%)!important;
  box-shadow:inset 0 -6px 14px rgba(90,40,180,.28),inset 0 4px 10px rgba(255,240,215,.22)!important;}
${PX_B} .tsStandardBubble{
  filter:drop-shadow(0 16px 14px rgba(10,4,20,.42)) drop-shadow(0 3px 3px rgba(0,0,0,.35))!important;}
${PX_B} .tsStandardBubble>:is(.tsAutoEmotionPic,.uniqWordMaterialImage,img:not(.tsNoStandardPic)){
  filter:saturate(1.16) contrast(1.05) brightness(1.04)!important;}

/* ---------- squash & stretch ---------- */
${PX_B} .tsPxSquash{animation:tsPxSquash .56s cubic-bezier(.3,1.6,.4,1) both!important;}
@keyframes tsPxSquash{
  0%{scale:1 1}
  14%{scale:1.16 .80}
  34%{scale:.88 1.14}
  54%{scale:1.06 .95}
  74%{scale:.98 1.02}
  100%{scale:1 1}}

/* ---------- toy buttons with pressable lip ---------- */
${pxPress()}{border-radius:16px!important;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.22),inset 0 -3px 0 rgba(0,0,0,.18),
    0 5px 0 rgba(8,10,40,.55),0 10px 18px rgba(0,0,0,.35)!important;
  transition:translate .09s ease,box-shadow .09s ease,filter .15s ease!important;}
${pxPress(":hover:not(:disabled)")}{filter:brightness(1.1) saturate(1.1)!important;}
${pxPress(":active:not(:disabled)")}{translate:0 4px!important;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.16),inset 0 -2px 0 rgba(0,0,0,.2),
    0 1px 0 rgba(8,10,40,.55),0 4px 8px rgba(0,0,0,.3)!important;}

/* ---------- candy progress bars ---------- */
${PX_B} :is(.engineProgressTrack,.releaseScoreTrack,.tsShiftLevel,.tsndMeter,.gwMeter,.ftShift,.dmProgressTrack)>i{
  background:linear-gradient(180deg,rgba(255,255,255,.45) 0 34%,rgba(255,255,255,0) 35%),
    linear-gradient(90deg,#3fe6ff,#7c6bff 45%,#ff6fd8 75%,#ffd36b)!important;
  background-size:100% 100%,200% 100%!important;}

/* ---------- title-card rewards ---------- */
${PX_B} .globalFeedbackCopyLayer{border-radius:26px!important;border-width:3px!important;
  border-color:rgba(255,255,255,.85)!important;
  background:linear-gradient(180deg,#2b2a7a 0%,#1a1546 100%)!important;
  box-shadow:inset 0 3px 0 rgba(255,255,255,.25),0 8px 0 rgba(10,6,40,.75),
    0 22px 46px rgba(0,0,0,.55),0 0 40px rgba(255,190,90,.25)!important;}
${PX_B} .globalFeedbackCopyLayer b{
  background:linear-gradient(180deg,#fff7c8 0%,#ffd04a 52%,#ff9a2e 100%);
  -webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;
  -webkit-text-stroke:1px rgba(80,30,0,.35);
  filter:drop-shadow(0 3px 0 rgba(90,30,0,.55)) drop-shadow(0 0 10px rgba(255,200,90,.45));
  text-shadow:none!important;font-weight:800!important;}
${PX_B} .globalFinishFeedbackCopy{animation:tsPxTitleCard .7s cubic-bezier(.3,1.6,.4,1) both!important;}
@keyframes tsPxTitleCard{0%{opacity:0;scale:.4;rotate:-6deg}60%{opacity:1;scale:1.08;rotate:2deg}100%{opacity:1;scale:1;rotate:0deg}}
${PX_B} .releaseCompleteCard{border-radius:30px!important;
  box-shadow:inset 0 3px 0 rgba(255,255,255,.12),0 10px 0 rgba(6,6,30,.6),0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(255,190,110,.12)!important;}

@media (prefers-reduced-motion:reduce){
  .tsPxRays,.tsPxBokeh,.tsPxDust{animation:none!important;opacity:0!important;}
  ${PX_B} .tsPxSquash,${PX_B} .globalFinishFeedbackCopy{animation:none!important;}
}`

function pxNoise(i, s) {
    const x = Math.sin((i + 1) * 12.9898 + (s + 1) * 78.233) * 43758.5453
    return x - Math.floor(x)
}

function PixarLightRig({ bokeh, dust }) {
    const palette = [
        "rgba(255,200,120,.55)",
        "rgba(120,210,255,.5)",
        "rgba(255,130,210,.45)",
        "rgba(180,140,255,.45)",
    ]
    return (
        <div className="tsPxRig" aria-hidden="true">
            <i className="tsPxGrade" />
            <i className="tsPxKey" />
            <i className="tsPxRim" />
            <i className="tsPxRays" />
            {Array.from({ length: bokeh }, (_, i) => {
                const size = 40 + pxNoise(i, 3) * 110
                return (
                    <i
                        key={`b${i}`}
                        className="tsPxBokeh"
                        style={
                            {
                                left: `${pxNoise(i, 5) * 100}%`,
                                top: `${pxNoise(i, 7) * 100}%`,
                                width: size,
                                height: size,
                                background: `radial-gradient(circle,${palette[i % palette.length]},transparent 70%)`,
                                "--d": `${12 + pxNoise(i, 9) * 10}s`,
                                "--dl": `${-pxNoise(i, 11) * 20}s`,
                                "--bx": `${(pxNoise(i, 13) - 0.5) * 60}px`,
                                "--by": `${(pxNoise(i, 15) - 0.5) * 60}px`,
                            }
                        }
                    />
                )
            })}
            {Array.from({ length: dust }, (_, i) => (
                <i
                    key={`d${i}`}
                    className="tsPxDust"
                    style={
                        {
                            left: `${pxNoise(i, 21) * 100}%`,
                            top: `${pxNoise(i, 23) * 100}%`,
                            "--d": `${8 + pxNoise(i, 25) * 8}s`,
                            "--dl": `${-pxNoise(i, 27) * 16}s`,
                            "--bx": `${(pxNoise(i, 29) - 0.5) * 80}px`,
                        }
                    }
                />
            ))}
            <i className="tsPxVignette" />
        </div>
    )
}

export default function ThinkStillReleaseArcadePixar(props) {
    const {
        pixarIntensity = 1,
        pixarWarmth = 1,
        pixarParallax = true,
        pixarSquash = true,
        pixarBokeh = 9,
        pixarDust = 14,
        eosCheckin = EOS_PROP_DEFAULTS.checkin,
        eosCrisisLines = EOS_PROP_DEFAULTS.crisisLines,
        eosCrisisUrl = EOS_PROP_DEFAULTS.crisisUrl,
        eosEmergencyText = EOS_PROP_DEFAULTS.emergencyText,
        eosShareUrl = EOS_PROP_DEFAULTS.shareUrl,
        ...arcadeProps
    } = props
    const rootRef = React.useRef(null)
    const raf = React.useRef(0)

    // Key light follows the pointer softly (parallax).
    React.useEffect(() => {
        const root = rootRef.current
        if (!root || !pixarParallax) return
        let tx = 0.3,
            ty = 0.25,
            cx = tx,
            cy = ty
        const tick = () => {
            cx += (tx - cx) * 0.08
            cy += (ty - cy) * 0.08
            root.style.setProperty("--pxmx", cx.toFixed(3))
            root.style.setProperty("--pxmy", cy.toFixed(3))
            if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001)
                raf.current = requestAnimationFrame(tick)
            else raf.current = 0
        }
        const onMove = (e) => {
            const r = root.getBoundingClientRect()
            if (!r.width || !r.height) return
            // Light sits up-left of the pointer, clamped so it never goes flat.
            tx = Math.min(0.75, Math.max(0.1, ((e.clientX - r.left) / r.width) * 0.6 + 0.08))
            ty = Math.min(0.6, Math.max(0.05, ((e.clientY - r.top) / r.height) * 0.5 + 0.02))
            if (!raf.current) raf.current = requestAnimationFrame(tick)
        }
        root.addEventListener("pointermove", onMove, { passive: true })
        return () => {
            root.removeEventListener("pointermove", onMove)
            cancelAnimationFrame(raf.current)
            raf.current = 0
        }
    }, [pixarParallax])

    // Squash & stretch on whatever the player touches.
    React.useEffect(() => {
        const root = rootRef.current
        if (!root || !pixarSquash) return
        const onDown = (e) => {
            const el = e.target?.closest?.(PX_SQUASH_TARGETS)
            if (!el || !root.contains(el)) return
            el.classList.remove("tsPxSquash")
            void el.offsetWidth // restart animation
            el.classList.add("tsPxSquash")
            const clear = () => {
                el.classList.remove("tsPxSquash")
                el.removeEventListener("animationend", onEnd)
            }
            const onEnd = (ev) => {
                if (ev.animationName === "tsPxSquash") clear()
            }
            el.addEventListener("animationend", onEnd)
            window.setTimeout(clear, 700)
        }
        root.addEventListener("pointerdown", onDown, true)
        return () => root.removeEventListener("pointerdown", onDown, true)
    }, [pixarSquash])

    return (
        <div
            ref={rootRef}
            className="tsPixarRoot"
            style={
                {
                    "--px-intensity": Math.max(0, Math.min(2, pixarIntensity)),
                    "--px-warmth": Math.max(0, Math.min(2, pixarWarmth)),
                }
            }
        >
            <style>{PIXAR_CSS}</style>
            <EosConfigSync checkin={eosCheckin} crisisLines={eosCrisisLines} crisisUrl={eosCrisisUrl} emergencyText={eosEmergencyText} shareUrl={eosShareUrl} />
            <ThinkStillReleaseArcade {...arcadeProps} />
            {pixarIntensity > 0 ? (
                <PixarLightRig
                    bokeh={Math.round(Math.max(0, pixarBokeh))}
                    dust={Math.round(Math.max(0, pixarDust))}
                />
            ) : null}
        </div>
    )
}

addPropertyControls(ThinkStillReleaseArcadePixar, {
    ...(ThinkStillReleaseArcade.propertyControls || {}),
    pixarIntensity: {
        type: ControlType.Number,
        title: "Pixar Light",
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 1,
    },
    pixarWarmth: {
        type: ControlType.Number,
        title: "Warmth",
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 1,
    },
    pixarParallax: {
        type: ControlType.Boolean,
        title: "Light Follows",
        defaultValue: true,
    },
    pixarSquash: {
        type: ControlType.Boolean,
        title: "Squash & Stretch",
        defaultValue: true,
    },
    pixarBokeh: {
        type: ControlType.Number,
        title: "Bokeh",
        min: 0,
        max: 24,
        step: 1,
        defaultValue: 9,
    },
    pixarDust: {
        type: ControlType.Number,
        title: "Dust Motes",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 14,
    },
    eosCheckin: { type: ControlType.Boolean, title: "Emotion Check-in", defaultValue: true },
    eosCrisisLines: { type: ControlType.String, title: "Support Lines", displayTextArea: true, defaultValue: EOS_PROP_DEFAULTS.crisisLines },
    eosCrisisUrl: { type: ControlType.String, title: "Support Link", defaultValue: EOS_PROP_DEFAULTS.crisisUrl },
    eosEmergencyText: { type: ControlType.String, title: "Emergency Line", defaultValue: EOS_PROP_DEFAULTS.emergencyText },
    eosShareUrl: { type: ControlType.String, title: "Share Link", defaultValue: "" },
})
