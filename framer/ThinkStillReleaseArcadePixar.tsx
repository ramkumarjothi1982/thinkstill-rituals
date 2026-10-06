import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import ThinkStillReleaseArcade from "./ThinkStillReleaseConsole1.tsx"

/*
 * ThinkStill Release Arcade — PIXAR / VIRAL / HYPNOTIC layer
 *
 * Drop-in wrapper for every one of the 110 release games. It adds no game
 * logic and changes no game rules. It only adds a visual and feel layer:
 *  - Pixar-style lighting on every thought bubble: rim light, bounce light,
 *    soft contact shadow and a breathing halo
 *  - squash and stretch on every press (anticipation → squash → overshoot → settle)
 *  - spark/heart/star bursts, a shock ring and climbing combo pops at the tap point
 *  - a cursor-following bloom and a slow hypnotic iris over the play stage
 *  - a liquid shine sweeping along the progress bar
 *  - working versions of the base file's GLOBAL_VIRAL_HYPNOTIC and
 *    GLOBAL_PIXAR_CINEMATIC rules (the originals miss a descendant space,
 *    e.g. `.arena:is(button…)`, so they never match)
 *
 * Respects prefers-reduced-motion. Never sets `filter` or `transform` on game
 * objects, so the burst, blur and drag animations in the base file still work.
 */

const B = [
    ".tsStandardBubble",
    ".allCircularBubble",
    ".wordBubble",
    ".stompWordBubble",
    ".laserTargetBubble",
    ".catchTarget",
    ".choiceObject",
    ".cleanseStone",
    ".chargeOrb",
    ".zapMultiBubble",
    ".cutLoopWord",
    ".unhookWordBubble",
    ".binWordBubble",
    ".echoHoldBubble",
    ".tinySoundBubble",
    ".tugThoughtBubble",
    ".xrayThoughtBubble",
    ".magicTrapBubble",
    ".shelfThoughtBubble",
    ".coinReleaseBubble",
    ".vacuumCircleBubble",
    ".eraseWordBubble",
    ".keepDropCenterBubble",
    ".multiEgg",
    ".spOrb",
].join(",")

// Objects that get squash & stretch on press (bubbles + other physical props).
const SQUASH_SELECTOR = [
    B,
    ".juggleBall",
    ".thoughtPotato",
    ".spaceTile",
    ".cartoonIceCube",
    ".freezeWordCube",
    ".gwCard",
    ".tsndKey",
    ".tsndCard",
    ".ftRow",
    ".dmTake",
    ".doorABFrame",
    ".throwCard",
    ".sortCard",
    ".swipeCard",
    ".slingshotWord",
    ".binCard",
    ".rainCloudUnit",
    ".volumeRow",
].join(",")

const R = ".tsPxRoot .tsArcade.stage-play"

const PIXAR_LAYER_CSS = `
.tsPxRoot{position:relative;width:100%;height:100%;isolation:isolate}
.tsPxRoot>.tsArcade{width:100%;height:100%}

/* ---------- Pixar bubble lighting (rim + bounce + contact) ---------- */
${R} .releaseGameHost :is(${B}){
  box-shadow:
    inset 0 3px 3px rgba(255,255,255,.24),
    inset 0 -14px 22px rgba(46,12,96,.32),
    inset 12px 0 18px rgba(0,229,255,.10),
    inset -10px 0 16px rgba(214,70,255,.08),
    0 16px 26px -10px rgba(0,0,0,.62),
    0 0 26px rgba(0,216,255,calc(.14 * var(--px-int,1))),
    0 0 52px rgba(170,80,255,calc(.10 * var(--px-int,1)))!important;
  transition:box-shadow .22s cubic-bezier(.2,.8,.2,1)!important;
  -webkit-tap-highlight-color:transparent;
}
${R} .releaseGameHost :is(${B}):hover{
  box-shadow:
    inset 0 3px 4px rgba(255,255,255,.34),
    inset 0 -14px 22px rgba(46,12,96,.28),
    inset 12px 0 20px rgba(0,229,255,.16),
    inset -10px 0 18px rgba(214,70,255,.12),
    0 20px 30px -10px rgba(0,0,0,.66),
    0 0 34px rgba(0,229,255,calc(.30 * var(--px-int,1))),
    0 0 70px rgba(170,80,255,calc(.18 * var(--px-int,1)))!important;
}

/* breathing halo (scale/rotate only so it never fights existing opacity/filter rules) */
${R} .releaseGameHost :is(${B})::after{
  animation:tsPxHalo var(--px-halo,3.6s) cubic-bezier(.45,.05,.55,.95) infinite!important;
}
${R} .releaseGameHost :is(${B}):nth-child(3n+2)::after{animation-delay:-1.2s!important}
${R} .releaseGameHost :is(${B}):nth-child(3n+3)::after{animation-delay:-2.4s!important}
@keyframes tsPxHalo{0%,100%{scale:.92;rotate:0deg}50%{scale:1.1;rotate:14deg}}

/* ---------- corrected rules from GLOBAL_VIRAL_HYPNOTIC / GLOBAL_PIXAR_CINEMATIC ---------- */
${R} .releaseGameHost .arena :is(button,[role="button"]){
  -webkit-tap-highlight-color:transparent;
  transition:outline-color .16s ease,outline-offset .16s ease,box-shadow .18s ease,border-color .18s ease!important;
}
${R} .releaseGameHost .arena :is(button,[role="button"]):focus-visible{
  outline:2px solid rgba(139,246,255,.85)!important;outline-offset:3px!important;
}
${R} .releaseGameHost :is(.literalProgress,.engineProgressTrack,.releaseScoreTrack){
  border-color:rgba(130,235,255,.28)!important;
}
${R} :is(.hotPotatoPayoff,.echoSilencePayoff,.dmProgressText,.spFinal,.volumeAutoFinish.ready b){
  color:#f7ffff!important;
  text-shadow:0 2px 6px rgba(0,0,0,.82),0 0 12px rgba(255,255,255,.2),0 0 22px rgba(0,229,255,.55),0 0 40px rgba(145,72,255,.26)!important;
  animation:tsPxHeroReward 1.55s cubic-bezier(.45,.05,.55,.95) infinite!important;
}
@keyframes tsPxHeroReward{0%,100%{filter:brightness(.98)}42%{filter:brightness(1.16)}62%{filter:brightness(1.06)}}

/* ---------- liquid progress shine ---------- */
${R} .releaseGameHost .engineProgressTrack>i::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(100deg,transparent 0 30%,rgba(255,255,255,.55) 46%,transparent 62% 100%);
  mix-blend-mode:screen;animation:tsPxShine 2.2s cubic-bezier(.4,0,.2,1) infinite;
}
@keyframes tsPxShine{0%{translate:-120% 0}100%{translate:120% 0}}

/* ---------- overlay: bloom, iris, juice ---------- */
.tsPxOverlay{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2147483000;contain:layout paint}
.tsPxBloom{position:absolute;inset:0;opacity:0;transition:opacity .5s ease;mix-blend-mode:screen;
  background:
    radial-gradient(380px circle at var(--px-mx,50%) var(--px-my,50%),rgba(0,229,255,calc(.075 * var(--px-int,1))),transparent 62%),
    radial-gradient(620px circle at calc(100% - var(--px-mx,50%)) calc(100% - var(--px-my,50%)),rgba(178,70,255,calc(.05 * var(--px-int,1))),transparent 64%);}
.tsPxRoot.isPlaying .tsPxBloom{opacity:1}
.tsPxIris{position:absolute;left:50%;top:52%;width:min(120vmin,1100px);aspect-ratio:1;translate:-50% -50%;border-radius:50%;opacity:0;
  transition:opacity .8s ease;mix-blend-mode:screen;
  background:repeating-conic-gradient(from 0deg,transparent 0 9deg,rgba(0,229,255,.035) 10deg 11deg,transparent 12deg 24deg,rgba(190,80,255,.03) 25deg 26deg,transparent 27deg 36deg);
  -webkit-mask:radial-gradient(circle,transparent 0 18%,#000 34% 62%,transparent 78%);
  mask:radial-gradient(circle,transparent 0 18%,#000 34% 62%,transparent 78%);
  animation:tsPxIris 38s linear infinite}
.tsPxRoot.isPlaying .tsPxIris{opacity:calc(.9 * var(--px-int,1))}
@keyframes tsPxIris{to{rotate:360deg}}

.tsPxSpark{position:absolute;left:0;top:0;width:var(--s,10px);height:var(--s,10px);margin:calc(var(--s,10px) / -2) 0 0 calc(var(--s,10px) / -2);
  display:grid;place-items:center;font:900 calc(var(--s,10px) * 1.15)/1 Inter,system-ui,sans-serif;color:var(--c);
  text-shadow:0 0 8px var(--c),0 0 16px var(--c);will-change:transform,opacity}
.tsPxSpark.dot{border-radius:50%;background:var(--c);box-shadow:0 0 10px var(--c),0 0 20px var(--c)}
.tsPxRing{position:absolute;left:0;top:0;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;
  border:2px solid rgba(140,246,255,.9);box-shadow:0 0 18px rgba(0,229,255,.7),inset 0 0 12px rgba(190,80,255,.5);will-change:transform,opacity}
.tsPxCombo{position:absolute;left:0;top:0;translate:-50% -50%;white-space:nowrap;
  font:1000 clamp(13px,1.35vw,19px)/1 Inter,system-ui,sans-serif;letter-spacing:.06em;color:#fff;
  -webkit-text-stroke:.6px rgba(0,30,50,.6);
  text-shadow:0 2px 0 rgba(0,0,0,.45),0 0 10px var(--c),0 0 24px var(--c);will-change:transform,opacity}
.tsPxCombo b{color:#fff2a6;margin-left:.3em}

@media(prefers-reduced-motion:reduce){
  ${R} .releaseGameHost :is(${B})::after,
  ${R} .releaseGameHost .engineProgressTrack>i::after,
  .tsPxIris{animation:none!important}
}
`

const PALETTE = ["#4ff0ff", "#b46bff", "#ffe27a", "#ff7ad9", "#7dffd4"]
const GLYPHS = ["✦", "♥", "★", "✧", "", ""]
const COMBO_WORDS = [
    "NICE",
    "SWEET",
    "SMOOTH",
    "YES!",
    "FLOW",
    "ON FIRE",
    "HYPNOTIC",
    "UNSTOPPABLE",
    "LEGEND",
]

function useReducedMotion() {
    const [v, setV] = React.useState(false)
    React.useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const m = window.matchMedia("(prefers-reduced-motion: reduce)")
        const u = () => setV(m.matches)
        u()
        m.addEventListener?.("change", u)
        return () => m.removeEventListener?.("change", u)
    }, [])
    return v
}

export default function ThinkStillReleaseArcadePixar(props: any) {
    const {
        pixarJuice = true,
        pixarIntensity = 1,
        pixarCombos = true,
        ...arcadeProps
    } = props
    const rootRef = React.useRef<HTMLDivElement>(null)
    const overlayRef = React.useRef<HTMLDivElement>(null)
    const comboRef = React.useRef({ n: 0, t: 0 })
    const rafRef = React.useRef(0)
    const reduced = useReducedMotion()
    const intensity = Math.max(0, Math.min(2, Number(pixarIntensity) || 0))

    // Track whether a game is on stage so the bloom/iris only show during play.
    React.useEffect(() => {
        const root = rootRef.current
        if (!root || typeof MutationObserver === "undefined") return
        const sync = () =>
            root.classList.toggle(
                "isPlaying",
                !!root.querySelector(".tsArcade.stage-play")
            )
        sync()
        const mo = new MutationObserver(sync)
        mo.observe(root, {
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
            childList: true,
        })
        return () => mo.disconnect()
    }, [])

    const local = (e: React.PointerEvent) => {
        const r = rootRef.current!.getBoundingClientRect()
        return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }
    }

    const onPointerMove = (e: React.PointerEvent) => {
        if (reduced || !rootRef.current) return
        const { x, y, w, h } = local(e)
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
            const el = rootRef.current
            if (!el) return
            el.style.setProperty("--px-mx", `${(x / Math.max(1, w)) * 100}%`)
            el.style.setProperty("--px-my", `${(y / Math.max(1, h)) * 100}%`)
        })
    }

    const spawn = (
        cls: string,
        x: number,
        y: number,
        frames: Keyframe[],
        opts: KeyframeAnimationOptions,
        setup?: (el: HTMLElement) => void
    ) => {
        const layer = overlayRef.current
        if (!layer) return
        const el = document.createElement("span")
        el.className = cls
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        setup?.(el)
        layer.appendChild(el)
        const a = el.animate(frames, { fill: "forwards", ...opts })
        a.onfinish = () => el.remove()
        a.oncancel = () => el.remove()
    }

    const onPointerDown = (e: React.PointerEvent) => {
        if (!pixarJuice || !rootRef.current) return
        const target = e.target as Element | null
        if (!target?.closest?.(".releaseGameHost")) return
        const squashable = target.closest(SQUASH_SELECTOR) as HTMLElement | null
        const button = squashable
            ? null
            : (target.closest("button,[role='button'],[role='slider']") as HTMLElement | null)
        const hit = squashable || button
        if (!hit) return

        // Squash & stretch: anticipation → squash → overshoot → settle.
        if (!reduced && typeof hit.animate === "function") {
            const k = squashable ? 0.16 * intensity : 0.06 * intensity
            hit.animate(
                [
                    { scale: "1 1" },
                    { scale: `${1 + k} ${1 - k}`, offset: 0.22 },
                    { scale: `${1 - k * 0.55} ${1 + k * 0.7}`, offset: 0.52 },
                    { scale: `${1 + k * 0.18} ${1 - k * 0.12}`, offset: 0.78 },
                    { scale: "1 1" },
                ],
                { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" }
            )
        }

        const { x, y } = local(e)
        const now = performance.now()
        const c = comboRef.current
        c.n = now - c.t < 1150 ? c.n + 1 : 1
        c.t = now
        const color = PALETTE[c.n % PALETTE.length]

        if (reduced || intensity === 0) return

        // Shock ring
        spawn(
            "tsPxRing",
            x,
            y,
            [
                { transform: "scale(.2)", opacity: 1 },
                { transform: `scale(${2.6 + Math.min(c.n, 8) * 0.25})`, opacity: 0 },
            ],
            { duration: 560, easing: "cubic-bezier(.15,.8,.25,1)" }
        )

        // Spark burst: more sparks as the combo climbs
        const count = Math.round((squashable ? 9 : 5) * intensity + Math.min(c.n, 6))
        for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5
            const dist = (40 + Math.random() * 46) * (0.8 + intensity * 0.3)
            const dx = Math.cos(ang) * dist
            const dy = Math.sin(ang) * dist - 10
            const glyph = GLYPHS[(i + c.n) % GLYPHS.length]
            const size = glyph ? 10 + Math.random() * 8 : 4 + Math.random() * 4
            spawn(
                glyph ? "tsPxSpark" : "tsPxSpark dot",
                x,
                y,
                [
                    { transform: "translate(0,0) scale(.4) rotate(0deg)", opacity: 1 },
                    {
                        transform: `translate(${dx * 0.7}px,${dy * 0.7}px) scale(1.15) rotate(${(i % 2 ? 1 : -1) * 90}deg)`,
                        opacity: 1,
                        offset: 0.45,
                    },
                    {
                        transform: `translate(${dx}px,${dy + 26}px) scale(.2) rotate(${(i % 2 ? 1 : -1) * 200}deg)`,
                        opacity: 0,
                    },
                ],
                { duration: 620 + Math.random() * 260, easing: "cubic-bezier(.12,.75,.3,1)" },
                (el) => {
                    el.textContent = glyph
                    el.style.setProperty("--c", PALETTE[(i + c.n) % PALETTE.length])
                    el.style.setProperty("--s", `${size}px`)
                }
            )
        }

        // Combo pop
        if (pixarCombos && squashable) {
            const word = COMBO_WORDS[Math.min(c.n - 1, COMBO_WORDS.length - 1)]
            spawn(
                "tsPxCombo",
                x,
                y - 18,
                [
                    { transform: "translateY(6px) scale(.4)", opacity: 0 },
                    { transform: "translateY(-14px) scale(1.18)", opacity: 1, offset: 0.25 },
                    { transform: "translateY(-22px) scale(1)", opacity: 1, offset: 0.7 },
                    { transform: "translateY(-44px) scale(.9)", opacity: 0 },
                ],
                { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)" },
                (el) => {
                    el.style.setProperty("--c", color)
                    el.textContent = word
                    if (c.n > 1) {
                        const b = document.createElement("b")
                        b.textContent = `×${c.n}`
                        el.appendChild(b)
                    }
                }
            )
        }

        // Hit-stop screen kick on big combos
        if (c.n >= 5 && c.n % 5 === 0) {
            const stage = rootRef.current.querySelector(
                ".cinematicContentShell"
            ) as HTMLElement | null
            stage?.animate(
                [
                    { translate: "0 0" },
                    { translate: "-3px 2px" },
                    { translate: "3px -2px" },
                    { translate: "-2px 1px" },
                    { translate: "0 0" },
                ],
                { duration: 240, easing: "ease-out" }
            )
            try {
                navigator.vibrate?.(22)
            } catch {}
        }
    }

    return (
        <div
            ref={rootRef}
            className="tsPxRoot"
            style={{ ["--px-int" as any]: intensity }}
            onPointerMoveCapture={onPointerMove}
            onPointerDownCapture={onPointerDown}
        >
            <ThinkStillReleaseArcade {...arcadeProps} />
            <style>{PIXAR_LAYER_CSS}</style>
            <div ref={overlayRef} className="tsPxOverlay" aria-hidden="true">
                <div className="tsPxIris" />
                <div className="tsPxBloom" />
            </div>
        </div>
    )
}

addPropertyControls(ThinkStillReleaseArcadePixar, {
    ...((ThinkStillReleaseArcade as any).propertyControls || {}),
    pixarJuice: {
        type: ControlType.Boolean,
        title: "Pixar Juice",
        defaultValue: true,
    },
    pixarCombos: {
        type: ControlType.Boolean,
        title: "Combo Pops",
        defaultValue: true,
    },
    pixarIntensity: {
        type: ControlType.Number,
        title: "Pixar Intensity",
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 1,
    },
})
