// ThinkStill Release — V20 APP SKIN for phones and iPad/tablets.
// Wraps the pinned V19 Release build (screen navigation) in a native-feeling app shell:
//   • launch splash with the ThinkStill eclipse mark (ring draws in, flare twinkles, breath cue)
//   • frosted iOS-style navigation bar, SF-style glyphs, 44pt touch targets, safe-area aware
//   • floating glass composer dock with one hero "Begin" call to action
//   • bottom-sheet settings with native-style switches
//   • spring physics on every press, touch ripples + sparks, haptics (Android vibrate,
//     iOS 18+ switch tick), slow 11s "resonant breathing" edge light
//   • completion "release bloom": eclipse mark, shock rings, still-orb confetti, chime
// The ritual artwork, check-in characters and selection engine are untouched; only the
// shell around them changes. Uses a normal <script> element rather than eval/new Function.
// IMPORTANT: Framer canvas and published sites must allow loading the CDN script.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, AnimatePresence } from "framer-motion"
import * as FramerMotionNS from "framer-motion"

/** @framerIntrinsicWidth 390
 *  @framerIntrinsicHeight 844
 */

// V19 = V12 visuals + native settings + previous/next screen navigation.
const SCRIPT_SOURCES = [
    "https://cdn.jsdelivr.net/gh/ramkumarjothi1982/thinkstill-rituals@550fbe8099057b4564da2a23ba8eae8ddce15bd3/framer/release/thinkstill-release-screen-navigation-v19.js",
    "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/550fbe8099057b4564da2a23ba8eae8ddce15bd3/framer/release/thinkstill-release-screen-navigation-v19.js",
]

const SPLASH_KEY = "ts_release_app_splash_seen"
const SPLASH_MIN_MS = 2100

type ReleaseApp = React.ComponentType<any>
type FormFactor = "phone" | "tablet"

declare global {
    interface Window {
        __TS_F?: (
            react: typeof React,
            addControls: typeof addPropertyControls,
            controls: typeof ControlType,
            motionComponent: typeof motion,
            motionNamespace: typeof FramerMotionNS
        ) => ReleaseApp
    }
}

let cachedApp: ReleaseApp | null = null
let cachedPromise: Promise<ReleaseApp> | null = null
let cachedError = ""

function attachScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script")
        script.src = src
        script.async = true
        script.crossOrigin = "anonymous"
        script.onload = () => {
            if (typeof window.__TS_F !== "function") {
                script.remove()
                reject(new Error("Script downloaded but did not expose ThinkStill factory"))
            } else {
                resolve()
            }
        }
        script.onerror = () => {
            script.remove()
            reject(new Error("Script blocked or unavailable: " + src.split("/")[2]))
        }
        document.head.appendChild(script)
    })
}

function getApp(): Promise<ReleaseApp> {
    if (cachedApp) return Promise.resolve(cachedApp)
    if (cachedPromise) return cachedPromise
    cachedPromise = (async () => {
        if (typeof window === "undefined") throw new Error("Browser required")
        // Framer may retain an earlier build's global factory across hot reloads.
        window.__TS_F = undefined
        const errors: string[] = []
        for (const src of SCRIPT_SOURCES) {
            try {
                await attachScript(src)
                break
            } catch (error) {
                errors.push(String(error))
            }
        }
        if (typeof window.__TS_F !== "function") {
            throw new Error(errors.join("; ") || "ThinkStill script unavailable")
        }
        const app = window.__TS_F(React, () => {}, ControlType, motion, FramerMotionNS)
        if (typeof app !== "function" && (typeof app !== "object" || app === null)) {
            throw new Error("ThinkStill factory did not return a React component")
        }
        cachedApp = app
        cachedError = ""
        return app
    })().catch((error) => {
        cachedPromise = null
        cachedError = String(error?.message || error)
        throw error
    })
    return cachedPromise
}

/* ------------------------------------------------------------------ */
/* Brand mark: the ThinkStill eclipse — neon ring, violet crescent,    */
/* star flare on the right edge.                                       */
/* ------------------------------------------------------------------ */

let markSeq = 0
function eclipseSvg(): string {
    const id = "tsEc" + ++markSeq
    return `<svg class="tsEclipse" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
<defs>
<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#2a6dff"/><stop offset=".42" stop-color="#4fc4ff"/>
<stop offset=".8" stop-color="#ffffff"/><stop offset="1" stop-color="#e24bff"/></linearGradient>
<linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#6a5bff" stop-opacity="0"/><stop offset=".55" stop-color="#ffffff"/>
<stop offset="1" stop-color="#3fa2ff" stop-opacity="0"/></linearGradient>
<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#ff4bd8" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff"/>
<stop offset="1" stop-color="#ff4bd8" stop-opacity="0"/></linearGradient>
<radialGradient id="${id}c"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#d8c6ff" stop-opacity=".9"/>
<stop offset="1" stop-color="#8a3dff" stop-opacity="0"/></radialGradient>
<filter id="${id}g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2" result="b"/>
<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<circle class="tsEcCrescent" cx="104" cy="106" r="70" fill="none" stroke="#7d2cff" stroke-width="3" opacity=".75" filter="url(#${id}g)" pathLength="1"/>
<circle class="tsEcRing" cx="96" cy="98" r="70" fill="none" stroke="url(#${id}r)" stroke-width="3.4" stroke-linecap="round" filter="url(#${id}g)" pathLength="1" transform="rotate(200 96 98)"/>
<g class="tsEcFlare">
<rect x="112" y="108.4" width="88" height="1.6" fill="url(#${id}f)"/>
<rect x="164.7" y="58" width="1.6" height="102" fill="url(#${id}v)"/>
<circle cx="165.5" cy="109.2" r="10" fill="url(#${id}c)"/>
</g>
</svg>`
}

function EclipseMark({ size = 132 }: { size?: number }) {
    const html = React.useMemo(eclipseSvg, [])
    return <div className="tsMark" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: html }} />
}

/* ------------------------------------------------------------------ */
/* Feedback: haptics + sound                                           */
/* ------------------------------------------------------------------ */

let iosSwitchLabel: HTMLLabelElement | null = null
function hapticsAllowed(propsOn: boolean) {
    if (!propsOn) return false
    try { return localStorage.getItem("ts_release_haptics") !== "false" } catch { return true }
}
function haptic(pattern: number | number[], propsOn: boolean) {
    if (typeof window === "undefined" || !hapticsAllowed(propsOn)) return
    try {
        if (typeof navigator.vibrate === "function" && navigator.vibrate(pattern)) return
    } catch { /* ignore */ }
    // iOS 18+ Safari has no Vibration API, but toggling a native switch input
    // produces a system haptic tick. Best-effort; silently does nothing elsewhere.
    try {
        if (!iosSwitchLabel) {
            iosSwitchLabel = document.createElement("label")
            iosSwitchLabel.setAttribute("aria-hidden", "true")
            iosSwitchLabel.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none"
            const input = document.createElement("input")
            input.type = "checkbox"
            input.setAttribute("switch", "")
            input.tabIndex = -1
            iosSwitchLabel.appendChild(input)
            document.body.appendChild(iosSwitchLabel)
        }
        iosSwitchLabel.click()
    } catch { /* ignore */ }
}

let audioCtx: AudioContext | null = null
function unlockAudio() {
    if (typeof window === "undefined") return
    try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!Ctx) return
        if (!audioCtx) audioCtx = new Ctx()
        if (audioCtx.state === "suspended") audioCtx.resume()
    } catch { /* ignore */ }
}
function chime() {
    if (!audioCtx) return
    try {
        const now = audioCtx.currentTime + 0.02
        const master = audioCtx.createGain()
        master.gain.value = 0.055
        master.connect(audioCtx.destination)
        // C major add9 shimmer, glassy and soft.
        ;[523.25, 659.25, 783.99, 1174.66].forEach((freq, i) => {
            const t = now + i * 0.085
            for (const [type, mult, level] of [["sine", 1, 1], ["triangle", 2, 0.18]] as const) {
                const osc = audioCtx!.createOscillator()
                const gain = audioCtx!.createGain()
                osc.type = type
                osc.frequency.value = freq * mult
                gain.gain.setValueAtTime(0, t)
                gain.gain.linearRampToValueAtTime(level, t + 0.012)
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.7)
                osc.connect(gain).connect(master)
                osc.start(t)
                osc.stop(t + 1.75)
            }
        })
    } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Visual effects, written straight to a DOM layer (no React renders)  */
/* ------------------------------------------------------------------ */

const SPARK_COLORS = ["#4fc4ff", "#2a6dff", "#a43bff", "#e24bff", "#ffffff", "#ffd27a"]

function spawnRipple(layer: HTMLElement, x: number, y: number) {
    const ripple = document.createElement("span")
    ripple.className = "tsFxRipple"
    ripple.style.left = x + "px"
    ripple.style.top = y + "px"
    layer.appendChild(ripple)
    for (let i = 0; i < 6; i++) {
        const spark = document.createElement("span")
        const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.6
        const dist = 22 + Math.random() * 16
        spark.className = "tsFxSpark"
        spark.style.left = x + "px"
        spark.style.top = y + "px"
        spark.style.setProperty("--dx", Math.cos(angle) * dist + "px")
        spark.style.setProperty("--dy", Math.sin(angle) * dist + "px")
        spark.style.setProperty("--c", SPARK_COLORS[i % SPARK_COLORS.length])
        layer.appendChild(spark)
        window.setTimeout(() => spark.remove(), 700)
    }
    window.setTimeout(() => ripple.remove(), 700)
}

function spawnBloom(layer: HTMLElement, reduced: boolean) {
    const bloom = document.createElement("div")
    bloom.className = "tsFxBloom" + (reduced ? " isReduced" : "")
    let html = `<div class="tsFxBloomFlash"></div>`
    if (!reduced) {
        html += `<span class="tsFxRing"></span><span class="tsFxRing r2"></span><span class="tsFxRing r3"></span>`
        for (let i = 0; i < 28; i++) {
            const angle = Math.random() * Math.PI * 2
            const dist = 90 + Math.random() * 190
            const size = 5 + Math.random() * 11
            const delay = Math.random() * 0.18
            const dur = 1.1 + Math.random() * 0.8
            html += `<i class="tsFxOrb" style="--dx:${(Math.cos(angle) * dist).toFixed(1)}px;--dy:${(Math.sin(angle) * dist - 40).toFixed(1)}px;--s:${size.toFixed(1)}px;--d:${delay.toFixed(2)}s;--t:${dur.toFixed(2)}s;--c:${SPARK_COLORS[i % SPARK_COLORS.length]}"></i>`
        }
        html += `<div class="tsFxBloomMark">${eclipseSvg()}</div>`
    }
    bloom.innerHTML = html
    layer.appendChild(bloom)
    window.setTimeout(() => bloom.remove(), 2600)
}

/* ------------------------------------------------------------------ */
/* Splash / status                                                     */
/* ------------------------------------------------------------------ */

function Splash({ ready, error, onRetry, onSkip }: { ready: boolean; error: string; onRetry: () => void; onSkip: () => void }) {
    return (
        <motion.div
            className="tsSplash"
            role="status"
            aria-live="polite"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.12, filter: "blur(12px)" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => { if (ready) onSkip() }}
        >
            <div className="tsSplashGlow" />
            <EclipseMark size={140} />
            <div className="tsSplashWord">ThinkStill</div>
            {error ? (
                <div className="tsSplashError">
                    <div>The Release rituals couldn’t start.</div>
                    <small>{error}</small>
                    <button type="button" className="tsSplashRetry" onClick={(e) => { e.stopPropagation(); onRetry() }}>Try again</button>
                </div>
            ) : (
                <div className="tsSplashBreath" aria-label="Loading your Release rituals">
                    <span className="in">Breathe in…</span>
                    <span className="out">and let it go.</span>
                </div>
            )}
        </motion.div>
    )
}

/* ------------------------------------------------------------------ */
/* Glyphs as CSS masks so emoji/text controls render as crisp SF-style */
/* ------------------------------------------------------------------ */

function maskUrl(paths: string, width = 2.2) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round'>${paths}</svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
const GLYPH = {
    back: maskUrl("<path d='M15 5l-7 7 7 7'/>", 2.6),
    next: maskUrl("<path d='M9 5l7 7-7 7'/>", 2.6),
    close: maskUrl("<path d='M6.5 6.5l11 11M17.5 6.5l-11 11'/>", 2.4),
    soundOn: maskUrl("<path d='M11 5L6.5 9H3.5v6h3l4.5 4V5z' fill='black'/><path d='M15.5 9a4.2 4.2 0 0 1 0 6M18.4 6.2a8.2 8.2 0 0 1 0 11.6'/>", 2),
    soundOff: maskUrl("<path d='M11 5L6.5 9H3.5v6h3l4.5 4V5z' fill='black'/><path d='M16 9.5l5 5M21 9.5l-5 5'/>", 2),
    mic: maskUrl("<rect x='9' y='3' width='6' height='11' rx='3' fill='black'/><path d='M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21'/>", 2),
    plus: maskUrl("<path d='M12 5v14M5 12h14'/>", 2.4),
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

// The bundle scopes its own !important rules with ".tsArcade:not(#eosA):not(#eosB):not(#eosC)"
// (three ID-level weights). Four :not(#id) guards keep this skin above every one of them.
const BEAT = ":not(#tsAppA):not(#tsAppB):not(#tsAppC):not(#tsAppD)"
const P = `html body .tsAppHost.tsAppSkin[data-skin] .tsArcade${BEAT}`
const PH = `html body .tsAppHost.tsAppSkin[data-form="phone"] .tsArcade${BEAT}`
const PT = `html body .tsAppHost.tsAppSkin[data-form="tablet"] .tsArcade${BEAT}`
const SPRING = "cubic-bezier(.34,1.56,.64,1)"
const SMOOTH = "cubic-bezier(.22,1,.36,1)"

const APP_CSS = `
.tsAppHost {
    --ts-blue: #2a6dff; --ts-cyan: #4fc4ff; --ts-violet: #8b3dff; --ts-pink: #e24bff;
    --ts-grad: linear-gradient(120deg, #2a6dff 0%, #4f8dff 30%, #8b3dff 68%, #e24bff 100%);
    --ts-glass: rgba(22, 24, 44, .58);
    --ts-glass-strong: rgba(18, 19, 36, .86);
    --ts-hair: rgba(255, 255, 255, .09);
    --ts-hair-strong: rgba(255, 255, 255, .16);
    --ts-text: rgba(255, 255, 255, .96);
    --ts-text-2: rgba(235, 240, 255, .62);
    --ts-safe-t: env(safe-area-inset-top, 0px);
    --ts-safe-b: env(safe-area-inset-bottom, 0px);
    --ts-safe-l: env(safe-area-inset-left, 0px);
    --ts-safe-r: env(safe-area-inset-right, 0px);
    --ts-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, system-ui, sans-serif;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
    isolation: isolate;
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior: none;
    touch-action: manipulation;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
}
.tsAppHost.isFill { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: 2147480000; }
.tsAppHost * { -webkit-tap-highlight-color: transparent; }
.tsAppHost > .tsAppStage { position: absolute; inset: 0; z-index: 0; isolation: isolate; }
.tsAppHost.isRevealing > .tsAppStage { animation: tsAppReveal .9s ${SMOOTH} both; }
.tsAppHost.tsAppClosing > .tsAppStage { animation: tsAppClose .42s cubic-bezier(.5,0,.75,0) both; }
@keyframes tsAppReveal { from { opacity: 0; transform: scale(.94); filter: blur(10px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes tsAppClose { to { opacity: 0; transform: scale(.9); filter: blur(8px); } }

/* ---------- Splash ---------- */
.tsSplash {
    position: absolute; inset: 0; z-index: 60;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
    background: radial-gradient(60% 45% at 50% 46%, rgba(42,80,255,.10), transparent 70%), #000;
    color: var(--ts-text); font-family: var(--ts-font); text-align: center;
    padding: 24px; box-sizing: border-box; cursor: default; user-select: none; -webkit-user-select: none;
}
.tsSplashGlow {
    position: absolute; left: 50%; top: 46%; width: 340px; height: 340px; margin: -170px 0 0 -170px; border-radius: 50%;
    background: radial-gradient(circle, rgba(79,140,255,.20), rgba(139,61,255,.10) 45%, transparent 70%);
    animation: tsBreath 11s ease-in-out infinite; pointer-events: none;
}
.tsSplash .tsMark { position: relative; animation: tsMarkFloat 11s ease-in-out infinite; }
.tsMark svg { width: 100%; height: 100%; overflow: visible; display: block; }
.tsSplash .tsEcRing { stroke-dasharray: 1; stroke-dashoffset: 1; animation: tsDraw 1.25s ${SMOOTH} .15s forwards; }
.tsSplash .tsEcCrescent { stroke-dasharray: 1; stroke-dashoffset: 1; animation: tsDraw 1.4s ${SMOOTH} .45s forwards; }
.tsSplash .tsEcFlare { transform-origin: 165.5px 109.2px; transform: scale(0); opacity: 0; animation: tsFlare 2.6s ${SPRING} 1.05s forwards; }
.tsSplashWord {
    position: relative; margin-top: 6px;
    font: 650 30px/1.05 var(--ts-font); letter-spacing: -.025em;
    background: linear-gradient(90deg, #cfe6ff, #ffffff 45%, #e9c9ff); -webkit-background-clip: text; background-clip: text; color: transparent;
    opacity: 0; animation: tsRise .9s ${SMOOTH} .95s forwards;
}
.tsSplashBreath { position: relative; height: 20px; font: 500 15px/20px var(--ts-font); color: var(--ts-text-2); letter-spacing: .01em; }
.tsSplashBreath span { position: absolute; left: 50%; top: 0; transform: translateX(-50%); white-space: nowrap; opacity: 0; }
.tsSplashBreath .in { animation: tsWordIn 1.1s ${SMOOTH} 1.25s forwards, tsWordOut .5s ease 2.35s forwards; }
.tsSplashBreath .out { animation: tsWordIn 1.1s ${SMOOTH} 2.75s forwards; }
.tsSplashError { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; font: 600 15px/1.35 var(--ts-font); }
.tsSplashError small { max-width: 320px; font: 400 12px/1.45 var(--ts-font); color: var(--ts-text-2); overflow-wrap: anywhere; }
.tsSplashRetry {
    margin-top: 6px; min-height: 48px; padding: 0 28px; border: 0; border-radius: 999px; cursor: pointer;
    background: var(--ts-grad); color: #fff; font: 650 16px var(--ts-font);
    box-shadow: 0 10px 30px rgba(90,70,255,.4); transition: transform .4s ${SPRING};
}
.tsSplashRetry:active { transform: scale(.94); transition-duration: .08s; }
@keyframes tsDraw { to { stroke-dashoffset: 0; } }
@keyframes tsFlare { 0% { transform: scale(0) rotate(-30deg); opacity: 0; } 30% { transform: scale(1.35) rotate(0); opacity: 1; } 55% { transform: scale(.92); } 75%,100% { transform: scale(1); opacity: 1; } }
@keyframes tsRise { from { opacity: 0; transform: translateY(10px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes tsWordIn { from { opacity: 0; transform: translate(-50%, 8px); filter: blur(4px); } to { opacity: 1; transform: translate(-50%, 0); filter: none; } }
@keyframes tsWordOut { to { opacity: 0; transform: translate(-50%, -8px); filter: blur(4px); } }
@keyframes tsBreath { 0%,100% { transform: scale(.86); opacity: .55; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes tsMarkFloat { 0%,100% { transform: scale(.985); } 50% { transform: scale(1.03); } }

/* ---------- FX layer ---------- */
.tsFxLayer { position: absolute; inset: 0; z-index: 40; pointer-events: none; overflow: hidden; contain: strict; }
.tsFxEdge {
    position: absolute; inset: 0; pointer-events: none;
    box-shadow: inset 0 0 26px rgba(79,170,255,.22), inset 0 0 70px rgba(139,61,255,.12);
    animation: tsEdgeBreath 11s ease-in-out infinite;
}
.tsFxEdge.isFlash { animation: tsEdgeFlash 1.8s ${SMOOTH} both; }
@keyframes tsEdgeBreath { 0%,100% { opacity: .25; } 50% { opacity: .75; } }
@keyframes tsEdgeFlash {
    0% { opacity: .3; box-shadow: inset 0 0 26px rgba(79,170,255,.22), inset 0 0 70px rgba(139,61,255,.12); }
    18% { opacity: 1; box-shadow: inset 0 0 40px rgba(79,196,255,.75), inset 0 0 120px rgba(226,75,255,.45); }
    100% { opacity: .3; box-shadow: inset 0 0 26px rgba(79,170,255,.22), inset 0 0 70px rgba(139,61,255,.12); }
}
.tsFxRipple {
    position: absolute; width: 84px; height: 84px; margin: -42px 0 0 -42px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,.22), rgba(79,196,255,.10) 45%, transparent 70%);
    box-shadow: 0 0 0 1.5px rgba(160,210,255,.55);
    animation: tsRipple .62s ${SMOOTH} forwards;
}
.tsFxSpark {
    position: absolute; width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; border-radius: 50%;
    background: var(--c); box-shadow: 0 0 8px var(--c);
    animation: tsSpark .6s cubic-bezier(.15,.85,.35,1) forwards;
}
@keyframes tsRipple { from { transform: scale(.15); opacity: 1; } to { transform: scale(1); opacity: 0; } }
@keyframes tsSpark { from { transform: translate(0,0) scale(1); opacity: 1; } to { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0; } }
.tsFxBloom { position: absolute; left: 50%; top: 46%; width: 0; height: 0; }
.tsFxBloomFlash {
    position: absolute; left: -60vmax; top: -60vmax; width: 120vmax; height: 120vmax; border-radius: 50%;
    background: radial-gradient(circle, rgba(170,200,255,.38), rgba(139,61,255,.14) 26%, transparent 52%);
    animation: tsBloomFlash 1.5s ${SMOOTH} forwards;
}
.tsFxBloom.isReduced .tsFxBloomFlash { animation-duration: .9s; }
@keyframes tsBloomFlash { from { transform: scale(.2); opacity: 0; } 20% { opacity: 1; } to { transform: scale(1); opacity: 0; } }
.tsFxRing {
    position: absolute; left: -40px; top: -40px; width: 80px; height: 80px; border-radius: 50%;
    border: 2px solid rgba(120,190,255,.85); box-shadow: 0 0 18px rgba(79,196,255,.6), inset 0 0 18px rgba(226,75,255,.4);
    animation: tsShock 1.25s cubic-bezier(.1,.7,.3,1) forwards; opacity: 0;
}
.tsFxRing.r2 { animation-delay: .12s; border-color: rgba(180,120,255,.8); }
.tsFxRing.r3 { animation-delay: .24s; border-color: rgba(255,140,240,.6); }
@keyframes tsShock { 0% { transform: scale(.3); opacity: 1; } 100% { transform: scale(9); opacity: 0; border-width: .5px; } }
.tsFxOrb {
    position: absolute; left: calc(var(--s) / -2); top: calc(var(--s) / -2); width: var(--s); height: var(--s); border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff, var(--c) 55%); box-shadow: 0 0 12px var(--c);
    opacity: 0; animation: tsOrbBurst var(--t) cubic-bezier(.12,.8,.32,1) var(--d) forwards;
}
@keyframes tsOrbBurst {
    0% { transform: translate(0,0) scale(.3); opacity: 1; }
    70% { opacity: .95; }
    100% { transform: translate(var(--dx), calc(var(--dy) + 60px)) scale(.9); opacity: 0; }
}
.tsFxBloomMark { position: absolute; left: -64px; top: -64px; width: 128px; height: 128px; animation: tsMarkPop 2.2s ${SPRING} forwards; }
.tsFxBloomMark svg { width: 100%; height: 100%; overflow: visible; }
.tsFxBloomMark .tsEcRing, .tsFxBloomMark .tsEcCrescent { stroke-dasharray: 1; stroke-dashoffset: 1; animation: tsDraw .7s ${SMOOTH} forwards; }
@keyframes tsMarkPop { 0% { transform: scale(.3) rotate(25deg); opacity: 0; } 22% { transform: scale(1.12) rotate(0); opacity: 1; } 34% { transform: scale(.96); } 46% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }

/* ---------- App skin: shell ---------- */
${P} { font-family: var(--ts-font) !important; }
${P} .shell {
    grid-template-rows: auto minmax(0, 1fr) auto !important;
}
${P} .ambient, ${P} .scan { opacity: .55 !important; }

/* ---------- Navigation bar ---------- */
${P} .releaseConsoleHeader {
    box-sizing: border-box !important;
    position: relative !important;
    display: block !important;
    height: calc(var(--ts-nav-h) + var(--ts-safe-t)) !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
    border: 0 !important;
    border-bottom: .5px solid var(--ts-hair) !important;
    background: linear-gradient(180deg, rgba(10,11,24,.78), rgba(10,11,24,.55)) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    box-shadow: 0 1px 0 rgba(255,255,255,.03) inset !important;
    z-index: 260 !important;
}
${P} .releaseConsoleHeader::before, ${P} .releaseConsoleHeader::after { display: none !important; }
${P} .releaseConsoleHeader > .tsReleaseNativeNav {
    position: absolute !important;
    left: calc(var(--ts-pad) + var(--ts-safe-l)) !important;
    top: calc(var(--ts-safe-t) + (var(--ts-nav-h) - var(--ts-btn)) / 2) !important;
    display: flex !important;
    gap: var(--ts-gap) !important;
    margin: 0 !important; padding: 0 !important;
    z-index: 8 !important;
}
${P} .releaseConsoleHeader > .releaseHeaderSound,
${P} .releaseConsoleHeader > .tsReleaseSettingsButton,
${P} .releaseConsoleHeader > .tsReleaseCloseButton {
    position: absolute !important;
    top: calc(var(--ts-safe-t) + (var(--ts-nav-h) - var(--ts-btn)) / 2) !important;
    left: auto !important; bottom: auto !important;
    z-index: 8 !important;
}
${P} .releaseConsoleHeader > .tsReleaseCloseButton { right: calc(var(--ts-pad) + var(--ts-safe-r)) !important; }
${P} .releaseConsoleHeader > .tsReleaseSettingsButton { right: calc(var(--ts-pad) + var(--ts-safe-r) + var(--ts-btn) + var(--ts-gap)) !important; }
${P} .releaseConsoleHeader > .releaseHeaderSound { right: calc(var(--ts-pad) + var(--ts-safe-r) + 2 * (var(--ts-btn) + var(--ts-gap))) !important; }

${P} .tsReleaseNativeArrow,
${P} .releaseConsoleHeader > .releaseHeaderSound,
${P} .releaseConsoleHeader > .tsReleaseSettingsButton,
${P} .releaseConsoleHeader > .tsReleaseCloseButton {
    box-sizing: border-box !important;
    width: var(--ts-btn) !important; height: var(--ts-btn) !important;
    min-width: 0 !important; min-height: 0 !important;
    display: inline-flex !important; align-items: center !important; justify-content: center !important;
    padding: 0 !important; margin: 0 !important;
    border-radius: 50% !important;
    border: .5px solid var(--ts-hair-strong) !important;
    background: rgba(255,255,255,.075) !important;
    color: var(--ts-text) !important;
    font-size: 0 !important; line-height: 0 !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 4px 14px rgba(0,0,0,.25) !important;
    cursor: pointer !important;
    transform: none !important;
    transition: transform .45s ${SPRING}, background .25s ease, opacity .25s ease, box-shadow .25s ease !important;
    -webkit-backdrop-filter: blur(12px) !important; backdrop-filter: blur(12px) !important;
}
${P} .tsReleaseNativeArrow::before,
${P} .releaseConsoleHeader > .releaseHeaderSound::before,
${P} .releaseConsoleHeader > .tsReleaseCloseButton::before {
    content: "" !important; display: block !important;
    width: var(--ts-glyph) !important; height: var(--ts-glyph) !important;
    background: currentColor !important;
    -webkit-mask: var(--ts-icon) center / contain no-repeat !important;
    mask: var(--ts-icon) center / contain no-repeat !important;
}
${P} .tsReleaseNativeArrow:first-child { --ts-icon: ${GLYPH.back}; }
${P} .tsReleaseNativeArrow:last-child { --ts-icon: ${GLYPH.next}; }
${P} .releaseConsoleHeader > .tsReleaseCloseButton { --ts-icon: ${GLYPH.close}; }
${P} .releaseConsoleHeader > .releaseHeaderSound { --ts-icon: ${GLYPH.soundOff}; color: var(--ts-text-2) !important; }
${P} .releaseConsoleHeader > .releaseHeaderSound.active { --ts-icon: ${GLYPH.soundOn}; color: var(--ts-text) !important; }
${P} .releaseConsoleHeader > .tsReleaseSettingsButton svg { width: var(--ts-glyph) !important; height: var(--ts-glyph) !important; transition: transform .6s ${SPRING} !important; }
${P} .releaseConsoleHeader > .tsReleaseSettingsButton[aria-expanded="true"] { background: rgba(255,255,255,.18) !important; }
${P} .releaseConsoleHeader > .tsReleaseSettingsButton[aria-expanded="true"] svg { transform: rotate(90deg) !important; }
${P} .tsReleaseNativeArrow:disabled { opacity: .28 !important; cursor: default !important; }
${P} .tsReleaseNativeArrow:not(:disabled):active,
${P} .releaseConsoleHeader > .releaseHeaderSound:active,
${P} .releaseConsoleHeader > .tsReleaseSettingsButton:active,
${P} .releaseConsoleHeader > .tsReleaseCloseButton:active {
    transform: scale(.86) !important; background: rgba(255,255,255,.2) !important; transition-duration: .08s !important;
}

/* Title + progress stack in the centre, like a large-title nav bar collapsed. */
${P} .releaseConsoleHeader > .releaseHeaderCenter {
    box-sizing: border-box !important;
    position: absolute !important;
    left: 50% !important; right: auto !important;
    top: calc(var(--ts-safe-t) + var(--ts-title-top)) !important;
    transform: translateX(-50%) !important;
    width: max-content !important;
    max-width: calc(100% - 2 * (var(--ts-pad) + 3 * var(--ts-btn) + 2 * var(--ts-gap) + 8px)) !important;
    height: auto !important; min-height: 0 !important;
    padding: 0 !important; margin: 0 !important;
    display: block !important;
    border: 0 !important; background: none !important; box-shadow: none !important;
    overflow: hidden !important;
    z-index: 2 !important;
}
${P} .releaseHeaderCenter .releaseConsoleTitle {
    display: flex !important; align-items: baseline !important; justify-content: center !important;
    gap: 5px !important; width: 100% !important;
    white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;
    font-family: var(--ts-font) !important;
}
${P} .releaseHeaderCenter .releaseTitleMain {
    flex: 0 1 auto !important; min-width: 0 !important; overflow: hidden !important; text-overflow: ellipsis !important;
    font: 600 12px/1.2 var(--ts-font) !important; letter-spacing: .14em !important;
    color: var(--ts-text-2) !important; text-shadow: none !important;
}
${P} .releaseHeaderCenter .releaseTitleBy {
    display: inline !important; font: 500 12px/1.2 var(--ts-font) !important; letter-spacing: 0 !important; color: var(--ts-text-2) !important;
}
${P} .releaseHeaderCenter .releaseTitleBrand {
    display: inline !important; flex: 0 0 auto !important;
    font: 650 17px/1.2 var(--ts-font) !important; letter-spacing: -.02em !important; text-transform: none !important;
    padding-right: 2px !important;
    background: linear-gradient(90deg, #bfe0ff, #ffffff 50%, #e6c6ff) !important;
    -webkit-background-clip: text !important; background-clip: text !important; color: transparent !important;
    text-shadow: none !important; filter: none !important;
}
${P} .releaseConsoleHeader > .releaseScoreBar {
    box-sizing: border-box !important;
    position: absolute !important;
    left: 50% !important; right: auto !important;
    top: calc(var(--ts-safe-t) + var(--ts-score-top)) !important;
    transform: translateX(-50%) !important;
    width: max-content !important; min-width: 0 !important; max-width: 70% !important;
    height: 18px !important; min-height: 0 !important;
    display: flex !important; align-items: center !important; gap: 7px !important;
    padding: 0 !important; margin: 0 !important;
    border: 0 !important; background: none !important; box-shadow: none !important;
    overflow: visible !important; z-index: 2 !important;
}
${P} .releaseConsoleHeader > .releaseScoreBar > span {
    display: inline !important; font: 600 10px/1 var(--ts-font) !important; letter-spacing: .12em !important; color: var(--ts-text-2) !important;
}
${P} .releaseConsoleHeader > .releaseScoreBar > .releaseScoreTrack {
    display: block !important; position: relative !important;
    flex: 0 0 auto !important; width: 54px !important; max-width: none !important; min-width: 0 !important; height: 4px !important;
    margin: 0 !important; border: 0 !important; border-radius: 999px !important;
    background: rgba(255,255,255,.12) !important; overflow: hidden !important;
}
${P} .releaseConsoleHeader > .releaseScoreBar > .releaseScoreTrack > i {
    display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; bottom: 0 !important;
    min-width: 4px !important; height: 100% !important; border-radius: inherit !important;
    background: var(--ts-grad) !important; box-shadow: 0 0 8px rgba(120,140,255,.8) !important;
    transition: width .9s ${SPRING} !important;
}
${P} .releaseConsoleHeader > .releaseScoreBar > strong {
    font: 600 11px/1 var(--ts-font) !important; font-variant-numeric: tabular-nums !important;
    letter-spacing: 0 !important; color: var(--ts-text) !important; text-shadow: none !important;
}

/* ---------- Stage ---------- */
${P} .releaseStage { background: transparent !important; }
${P} .releaseStage.tsAppStageIn { animation: tsStageIn .62s ${SMOOTH} both; }
@keyframes tsStageIn { from { opacity: 0; transform: scale(.975); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }

/* ---------- Composer dock ---------- */
${P} .releaseComposer {
    box-sizing: border-box !important;
    position: relative !important;
    height: auto !important; min-height: 0 !important; max-height: none !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) var(--ts-input-h) !important;
    grid-template-rows: auto auto !important;
    grid-template-areas: "in plus" "cta cta" !important;
    column-gap: 8px !important; row-gap: 0 !important;
    align-items: center !important;
    width: auto !important;
    margin: 0 calc(10px + var(--ts-safe-r)) calc(10px + var(--ts-safe-b)) calc(10px + var(--ts-safe-l)) !important;
    padding: 10px !important;
    border: .5px solid var(--ts-hair-strong) !important;
    border-radius: 28px !important;
    background: var(--ts-glass) !important;
    -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
    backdrop-filter: blur(28px) saturate(180%) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 18px 40px rgba(0,0,0,.45) !important;
    z-index: 300 !important;
    animation: tsDockIn .8s ${SPRING} .1s both;
}
@keyframes tsDockIn { from { opacity: 0; transform: translateY(26px) scale(.96); } to { opacity: 1; transform: none; } }
${P} .releaseComposer > .releaseHiddenFile { display: none !important; }
${P} .releaseComposer > .releaseInputWrap {
    grid-area: in !important; width: 100% !important; height: var(--ts-input-h) !important; min-width: 0 !important;
    position: relative !important; border-radius: 999px !important; animation: none !important; box-shadow: none !important;
}
${P} .releaseComposer .releaseThoughtInput {
    box-sizing: border-box !important;
    width: 100% !important; height: 100% !important;
    padding: 0 52px 0 18px !important;
    border-radius: 999px !important;
    border: .5px solid var(--ts-hair-strong) !important;
    background: rgba(255,255,255,.07) !important;
    color: var(--ts-text) !important;
    /* 16px stops iOS Safari zooming the page on focus. */
    font: 500 16px/1 var(--ts-font) !important; letter-spacing: -.01em !important;
    caret-color: var(--ts-cyan) !important;
    box-shadow: none !important;
    transition: background .3s ease, border-color .3s ease, box-shadow .4s ease !important;
}
${P}.stage-input .releaseComposer .releaseThoughtInput:not(:focus) { animation: tsInvite 5.5s ease-in-out infinite !important; }
@keyframes tsInvite {
    0%, 100% { box-shadow: 0 0 0 0 rgba(79,170,255,0), inset 0 0 0 .5px rgba(255,255,255,.1); }
    50% { box-shadow: 0 0 0 4px rgba(79,170,255,.14), 0 0 22px rgba(139,61,255,.28), inset 0 0 0 .5px rgba(160,200,255,.45); }
}
${P} .releaseComposer .releaseThoughtInput::placeholder { color: rgba(235,240,255,.5) !important; opacity: 1 !important; }
${P} .releaseComposer .releaseThoughtInput:focus {
    outline: none !important; background: rgba(255,255,255,.11) !important;
    border-color: rgba(120,180,255,.6) !important;
    box-shadow: 0 0 0 4px rgba(79,140,255,.2), 0 0 26px rgba(139,61,255,.25) !important;
}
${P} .releaseComposer .releaseInputMic,
${P} .releaseComposer > .releaseIconButton {
    box-sizing: border-box !important;
    display: flex !important; align-items: center !important; justify-content: center !important;
    padding: 0 !important; border-radius: 50% !important;
    border: .5px solid var(--ts-hair-strong) !important;
    background: rgba(255,255,255,.08) !important; color: var(--ts-text) !important;
    font-size: 0 !important; line-height: 0 !important;
    box-shadow: none !important; cursor: pointer !important;
    transition: transform .45s ${SPRING}, background .25s ease !important;
}
${P} .releaseComposer .releaseInputMic {
    position: absolute !important; right: 5px !important; top: 5px !important; transform: none !important;
    width: calc(var(--ts-input-h) - 10px) !important; height: calc(var(--ts-input-h) - 10px) !important;
    border: 0 !important; background: transparent !important;
}
${P} .releaseComposer .releaseInputMic::before,
${P} .releaseComposer > .releaseIconButton::before {
    content: "" !important; display: block !important; width: 20px !important; height: 20px !important;
    background: currentColor !important;
    -webkit-mask: var(--ts-icon) center / contain no-repeat !important; mask: var(--ts-icon) center / contain no-repeat !important;
}
${P} .releaseComposer .releaseInputMic { --ts-icon: ${GLYPH.mic}; color: var(--ts-text-2) !important; }
${P} .releaseComposer .releaseInputMic.active { color: #ff5a6e !important; background: rgba(255,70,100,.14) !important; animation: tsMicLive 1.4s ease-in-out infinite !important; }
@keyframes tsMicLive { 0%,100% { box-shadow: 0 0 0 0 rgba(255,80,110,.45); } 50% { box-shadow: 0 0 0 7px rgba(255,80,110,0); } }
${P} .releaseComposer > .releaseIconButton {
    grid-area: plus !important; position: relative !important;
    width: var(--ts-input-h) !important; height: var(--ts-input-h) !important; --ts-icon: ${GLYPH.plus};
}
${P} .releaseComposer > .releaseIconButton.active { background: rgba(79,140,255,.25) !important; }
${P} .releaseComposer > .releaseIconButton .releaseUploadCount {
    position: absolute !important; top: -3px !important; right: -3px !important;
    min-width: 18px !important; height: 18px !important; padding: 0 5px !important; box-sizing: border-box !important;
    display: grid !important; place-items: center !important; border-radius: 999px !important;
    background: var(--ts-grad) !important; color: #fff !important; font: 700 11px/1 var(--ts-font) !important;
}
${P} .releaseComposer .releaseInputMic:active { transform: scale(.84) !important; transition-duration: .08s !important; }
${P} .releaseComposer > .releaseIconButton:active { transform: scale(.88) !important; transition-duration: .08s !important; }

/* Hero call to action. */
${P} .releaseComposer > .releaseChoiceWrap {
    grid-area: cta !important; position: relative !important;
    width: 100% !important; height: auto !important; min-width: 0 !important;
    margin-top: 10px !important;
}
${P} .releaseComposer .releaseChoiceButton {
    box-sizing: border-box !important; position: relative !important;
    width: 100% !important; height: var(--ts-cta-h) !important;
    display: flex !important; align-items: center !important; justify-content: center !important; gap: 10px !important;
    padding: 0 calc(var(--ts-cta-h) + 4px) 0 calc(var(--ts-cta-h) + 4px) !important;
    border: 0 !important; border-radius: 999px !important;
    background: var(--ts-grad) !important; background-size: 160% 100% !important;
    color: #fff !important;
    font: 650 16px/1.1 var(--ts-font) !important; letter-spacing: .01em !important; text-transform: none !important;
    box-shadow: 0 10px 30px rgba(90,70,255,.45), inset 0 1px 0 rgba(255,255,255,.3) !important;
    overflow: hidden !important; cursor: pointer !important;
    transition: transform .5s ${SPRING}, box-shadow .3s ease !important;
    animation: tsCtaFlow 8s ease-in-out infinite !important;
}
${P} .releaseComposer .releaseChoiceButton::after {
    content: "" !important; position: absolute !important; inset: 0 !important; pointer-events: none !important;
    background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.38) 50%, transparent 65%) !important;
    transform: translateX(-120%) !important; animation: tsSheen 5.5s ${SMOOTH} 1.2s infinite !important;
}
${P} .releaseComposer .releaseChoiceButton.ready { animation: tsCtaFlow 8s ease-in-out infinite, tsHeartbeat 2.2s ${SMOOTH} infinite !important; }
${P} .releaseComposer .releaseChoiceButton:active { transform: scale(.955) !important; transition-duration: .1s !important; box-shadow: 0 4px 14px rgba(90,70,255,.4) !important; }
@keyframes tsCtaFlow { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes tsSheen { 0% { transform: translateX(-120%); } 30%, 100% { transform: translateX(120%); } }
@keyframes tsHeartbeat { 0%, 100% { box-shadow: 0 10px 30px rgba(90,70,255,.45), 0 0 0 0 rgba(139,61,255,.5); } 50% { box-shadow: 0 10px 30px rgba(90,70,255,.45), 0 0 0 9px rgba(139,61,255,0); } }
${P} .releaseComposer .releaseChoiceButton > img,
${P} .releaseComposer .releaseChoiceButton > .releaseChoiceAutoIcon {
    position: absolute !important; left: 6px !important; top: 50% !important; transform: translateY(-50%) !important;
    width: calc(var(--ts-cta-h) - 12px) !important; height: calc(var(--ts-cta-h) - 12px) !important; min-width: 0 !important;
    display: grid !important; place-items: center !important; border-radius: 50% !important;
    background: rgba(255,255,255,.18) !important; color: #fff !important; font-size: 16px !important;
    object-fit: cover !important; box-shadow: none !important; border: 0 !important;
}
${P} .releaseComposer .releaseChoiceButton .choiceCopy {
    min-width: 0 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;
    font: inherit !important; letter-spacing: inherit !important; text-align: center !important;
}
${P} .releaseComposer .releaseChoiceButton .choiceArrow {
    position: absolute !important; right: 6px !important; left: auto !important; top: 50% !important; transform: translateY(-50%) !important;
    width: calc(var(--ts-cta-h) - 12px) !important; height: calc(var(--ts-cta-h) - 12px) !important;
    display: grid !important; place-items: center !important; border-radius: 50% !important;
    background: rgba(0,0,0,.18) !important; color: #fff !important; font-size: 13px !important; line-height: 1 !important;
    transition: transform .45s ${SPRING} !important; z-index: 1 !important;
}
${P} .releaseComposer .releaseChoiceButton.open .choiceArrow { transform: translateY(-50%) rotate(180deg) !important; }

/* Ritual picker floats up as a glass sheet above the dock. */
${P} .releaseComposer .releaseChoiceMenu {
    left: 0 !important; right: 0 !important; width: auto !important;
    bottom: calc(100% + 12px) !important; max-height: min(480px, 58vh) !important;
    padding: 8px !important; border-radius: 24px !important;
    border: .5px solid var(--ts-hair-strong) !important;
    background: var(--ts-glass-strong) !important;
    -webkit-backdrop-filter: blur(30px) saturate(180%) !important; backdrop-filter: blur(30px) saturate(180%) !important;
    box-shadow: 0 -10px 50px rgba(0,0,0,.55) !important;
    transform-origin: 50% 100% !important;
    animation: tsPopUp .5s ${SPRING} both !important;
}
@keyframes tsPopUp { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
${P} .releaseComposer .releaseChoiceItem {
    min-height: 50px !important; border-radius: 16px !important; border: 0 !important; background: transparent !important;
    transition: background .2s ease, transform .4s ${SPRING} !important;
}
${P} .releaseComposer .releaseChoiceItem b { font: 600 15px/1.15 var(--ts-font) !important; letter-spacing: -.005em !important; }
${P} .releaseComposer .releaseChoiceItem.active, ${P} .releaseComposer .releaseChoiceItem:hover { background: rgba(255,255,255,.08) !important; }
${P} .releaseComposer .releaseChoiceItem:active { transform: scale(.97) !important; background: rgba(255,255,255,.12) !important; }
${P} .releaseComposer .releaseChoiceGroupLabel { font: 600 11px/1.2 var(--ts-font) !important; letter-spacing: .12em !important; color: var(--ts-text-2) !important; padding: 12px 12px 6px !important; }

${P} .releaseComposerStatus {
    left: 50% !important; right: auto !important; bottom: calc(100% + 10px) !important;
    transform: translateX(-50%) !important; width: max-content !important; max-width: calc(100% - 20px) !important;
    padding: 9px 14px !important; border-radius: 999px !important;
    border: .5px solid var(--ts-hair-strong) !important; background: var(--ts-glass-strong) !important;
    -webkit-backdrop-filter: blur(20px) !important; backdrop-filter: blur(20px) !important;
    color: var(--ts-text) !important; font: 600 12px/1.25 var(--ts-font) !important; letter-spacing: .02em !important;
    text-align: center !important; white-space: normal !important;
    box-shadow: 0 8px 26px rgba(0,0,0,.4) !important;
    animation: tsToast .5s ${SPRING} both !important;
}
@keyframes tsToast { from { opacity: 0; transform: translate(-50%, 10px) scale(.92); } to { opacity: 1; transform: translate(-50%, 0); } }

${P} .releaseUploadPopup {
    border-radius: 24px !important; border: .5px solid var(--ts-hair-strong) !important;
    background: var(--ts-glass-strong) !important;
    -webkit-backdrop-filter: blur(30px) saturate(180%) !important; backdrop-filter: blur(30px) saturate(180%) !important;
    font-family: var(--ts-font) !important;
}
${P} .releaseUploadSlot { border-radius: 16px !important; }
${P} .releaseChooseFiles { border-radius: 999px !important; min-height: 46px !important; background: var(--ts-grad) !important; border: 0 !important; color: #fff !important; font: 650 15px var(--ts-font) !important; }

/* ---------- Settings: bottom sheet ---------- */
${P} .tsReleaseSettingsPanel {
    position: absolute !important;
    top: auto !important; right: 0 !important; left: 0 !important; bottom: 0 !important;
    width: auto !important; max-height: 82% !important;
    box-sizing: border-box !important;
    padding: 26px calc(20px + var(--ts-safe-r)) calc(18px + var(--ts-safe-b)) calc(20px + var(--ts-safe-l)) !important;
    display: flex !important; flex-direction: column !important; gap: 0 !important;
    border: .5px solid var(--ts-hair-strong) !important; border-bottom: 0 !important;
    border-radius: 30px 30px 0 0 !important;
    background: rgba(24,25,44,.86) !important;
    -webkit-backdrop-filter: blur(34px) saturate(180%) !important; backdrop-filter: blur(34px) saturate(180%) !important;
    color: var(--ts-text) !important; font-family: var(--ts-font) !important;
    box-shadow: 0 -18px 60px rgba(0,0,0,.55), 0 0 0 100vmax rgba(0,0,0,.45) !important;
    z-index: 9000 !important;
    animation: tsSheetUp .62s cubic-bezier(.3,1.3,.5,1) both !important;
}
@keyframes tsSheetUp { from { transform: translateY(105%); box-shadow: 0 -18px 60px rgba(0,0,0,0), 0 0 0 100vmax rgba(0,0,0,0); } to { transform: none; } }
${P} .tsReleaseSettingsPanel::before {
    content: "" !important; position: absolute !important; top: 8px !important; left: 50% !important;
    width: 38px !important; height: 5px !important; margin-left: -19px !important; border-radius: 3px !important;
    background: rgba(255,255,255,.25) !important;
}
${P} .tsReleaseSettingsHead {
    display: flex !important; align-items: center !important; justify-content: space-between !important;
    margin: 0 0 8px !important; font: 700 22px/1.2 var(--ts-font) !important; letter-spacing: -.02em !important;
}
${P} .tsReleaseSettingsHead strong { font: inherit !important; letter-spacing: inherit !important; text-transform: none !important; }
${P} .tsReleaseSettingsHead strong { font-size: 0 !important; }
${P} .tsReleaseSettingsHead strong::after { content: "Settings" !important; font-size: 22px !important; }
${P} .tsReleaseSettingsDismiss {
    width: 32px !important; height: 32px !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 0 !important;
    border-radius: 50% !important; border: 0 !important; background: rgba(255,255,255,.1) !important;
    color: var(--ts-text-2) !important; font-size: 0 !important; cursor: pointer !important;
    transition: transform .4s ${SPRING} !important;
}
${P} .tsReleaseSettingsDismiss::before {
    content: "" !important; width: 13px !important; height: 13px !important; background: currentColor !important;
    -webkit-mask: ${GLYPH.close} center / contain no-repeat !important; mask: ${GLYPH.close} center / contain no-repeat !important;
}
${P} .tsReleaseSettingsDismiss:active { transform: scale(.85) !important; }
${P} .tsReleaseSettingsRow {
    display: flex !important; justify-content: space-between !important; align-items: center !important;
    min-height: 54px !important; padding: 0 2px !important; margin: 0 !important;
    border-bottom: .5px solid var(--ts-hair) !important;
    font: 500 16px/1.2 var(--ts-font) !important; letter-spacing: -.01em !important; color: var(--ts-text) !important;
    cursor: pointer !important;
}
${P} .tsReleaseSettingsRow input[type="checkbox"] {
    -webkit-appearance: none !important; appearance: none !important;
    position: relative !important; flex: 0 0 auto !important;
    width: 51px !important; height: 31px !important; margin: 0 !important;
    border-radius: 999px !important; border: 0 !important;
    background: rgba(120,120,128,.36) !important;
    cursor: pointer !important; outline: none !important;
    transition: background .3s ease !important;
}
${P} .tsReleaseSettingsRow input[type="checkbox"]::before {
    content: "" !important; position: absolute !important; top: 2px !important; left: 2px !important;
    width: 27px !important; height: 27px !important; border-radius: 50% !important;
    background: #fff !important; box-shadow: 0 3px 8px rgba(0,0,0,.25), 0 1px 1px rgba(0,0,0,.12) !important;
    transition: transform .45s ${SPRING}, width .2s ease !important;
}
${P} .tsReleaseSettingsRow input[type="checkbox"]:checked { background: linear-gradient(120deg, #2a6dff, #8b3dff) !important; }
${P} .tsReleaseSettingsRow input[type="checkbox"]:checked::before { transform: translateX(20px) !important; }
${P} .tsReleaseSettingsRow input[type="checkbox"]:active::before { width: 33px !important; }
${P} .tsReleaseSettingsRow input[type="checkbox"]:checked:active::before { transform: translateX(14px) !important; }
${P} .tsReleaseSettingsRow input[type="checkbox"]:focus-visible { box-shadow: 0 0 0 3px rgba(79,170,255,.6) !important; }
${P} .tsReleaseSettingsVolume {
    display: flex !important; flex-direction: column !important; gap: 12px !important;
    margin: 16px 2px 20px !important; font: 500 16px/1.2 var(--ts-font) !important; color: var(--ts-text) !important;
}
${P} .tsReleaseSettingsVolume input[type="range"] {
    -webkit-appearance: none !important; appearance: none !important;
    width: 100% !important; height: 6px !important; margin: 6px 0 !important; border-radius: 999px !important;
    background: linear-gradient(90deg, #2a6dff, #8b3dff, #e24bff) !important; outline: none !important;
}
${P} .tsReleaseSettingsVolume input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; background: #fff;
    box-shadow: 0 3px 10px rgba(0,0,0,.35); cursor: pointer; transition: transform .3s ${SPRING};
}
${P} .tsReleaseSettingsVolume input[type="range"]:active::-webkit-slider-thumb { transform: scale(1.15); }
${P} .tsReleaseSettingsVolume input[type="range"]::-moz-range-thumb { width: 28px; height: 28px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 3px 10px rgba(0,0,0,.35); }
${P} .tsReleaseSettingsDone {
    min-height: 52px !important; width: 100% !important; border: 0 !important; border-radius: 999px !important;
    background: var(--ts-grad) !important; color: #fff !important;
    font: 650 17px var(--ts-font) !important; letter-spacing: -.01em !important; cursor: pointer !important;
    box-shadow: 0 10px 28px rgba(90,70,255,.4) !important;
    transition: transform .45s ${SPRING} !important;
}
${P} .tsReleaseSettingsDone:active { transform: scale(.96) !important; transition-duration: .08s !important; }

/* ---------- Completion: card springs up out of the bloom ---------- */
${P} .releaseStage > .releaseCompleteOverlay, ${P} .releaseCompleteOverlay {
    overflow-x: hidden !important; overflow-y: auto !important; overscroll-behavior: contain !important;
    place-items: safe center !important;
    /* Top inset clears the bundle's still/sun reward chips pinned to the stage corner. */
    padding: 68px calc(14px + var(--ts-safe-r)) 20px calc(14px + var(--ts-safe-l)) !important;
    background: radial-gradient(70% 50% at 50% 42%, rgba(79,120,255,.16), transparent 70%), rgba(0,0,6,.55) !important;
    -webkit-backdrop-filter: blur(16px) saturate(160%) !important; backdrop-filter: blur(16px) saturate(160%) !important;
    animation: tsFade .5s ease both !important;
}
@keyframes tsFade { from { opacity: 0; } to { opacity: 1; } }
${P} .releaseCompleteShell {
    width: min(620px, 100%) !important;
    grid-template-columns: 1fr 1fr !important;
    grid-template-rows: auto auto !important;
    gap: 12px !important;
}
${P} .releaseCompleteShell > .releaseCompleteCard { grid-column: 1 / -1 !important; grid-row: 1 !important; }
${P} .releaseCompleteShell > .releaseCompletePrev { grid-column: 1 !important; grid-row: 2 !important; }
${P} .releaseCompleteShell > .releaseCompleteNext { grid-column: 2 !important; grid-row: 2 !important; }
${P} .releaseCompleteCard {
    box-sizing: border-box !important;
    padding: 26px 20px 22px !important;
    border: .5px solid var(--ts-hair-strong) !important;
    border-radius: 32px !important;
    background: linear-gradient(180deg, rgba(36,38,70,.72), rgba(16,16,34,.82)) !important;
    -webkit-backdrop-filter: blur(30px) saturate(180%) !important; backdrop-filter: blur(30px) saturate(180%) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 30px 80px rgba(0,0,0,.55), 0 0 60px rgba(100,90,255,.18) !important;
    font-family: var(--ts-font) !important;
    animation: tsCardIn .85s ${SPRING} .18s both !important;
}
@keyframes tsCardIn { from { opacity: 0; transform: translateY(40px) scale(.9); } to { opacity: 1; transform: none; } }
${P} .releaseCompleteCard > small {
    align-self: center !important; display: inline-block !important;
    padding: 7px 13px !important; border-radius: 999px !important;
    background: rgba(255,255,255,.08) !important; border: .5px solid var(--ts-hair-strong) !important;
    font: 600 11px/1 var(--ts-font) !important; letter-spacing: .12em !important; color: #d9e6ff !important;
    animation: tsRise .7s ${SMOOTH} .45s both !important;
}
${P} .releaseCompleteCard > strong {
    font: 700 clamp(28px, 7.5vw, 40px)/1.05 var(--ts-font) !important; letter-spacing: -.035em !important;
    background: linear-gradient(90deg, #cfe6ff, #ffffff 45%, #ecc9ff) !important;
    -webkit-background-clip: text !important; background-clip: text !important; color: transparent !important;
    text-shadow: none !important;
    animation: tsRise .8s ${SMOOTH} .55s both !important;
}
${P} .releaseCompleteCard p { font: 400 16px/1.45 var(--ts-font) !important; color: rgba(235,240,255,.78) !important; }
${P} .releasePersistentFinalMessage b { font-family: var(--ts-font) !important; letter-spacing: -.01em !important; }
${P} .releaseShiftCheck {
    border-radius: 22px !important; border: .5px solid var(--ts-hair) !important;
    background: rgba(255,255,255,.05) !important; padding: 14px !important;
}
${P} .releaseShiftCheck > strong { font: 600 12px/1.2 var(--ts-font) !important; letter-spacing: .14em !important; color: var(--ts-text-2) !important; }
${P} .releaseShiftChoices button,
${P} .releaseReplaySame,
${P} .releaseCompleteActions button,
${P} .releaseRecommendationActions button,
${P} .releaseCompleteSideNav {
    min-height: 48px !important; height: auto !important;
    border-radius: 999px !important;
    border: .5px solid var(--ts-hair-strong) !important;
    background: rgba(255,255,255,.08) !important; color: var(--ts-text) !important;
    font: 600 14px/1.15 var(--ts-font) !important; letter-spacing: .04em !important;
    box-shadow: none !important; cursor: pointer !important;
    transition: transform .45s ${SPRING}, background .25s ease, box-shadow .3s ease !important;
}
${P} .releaseShiftChoices button.active,
${P} .releaseRecommendationActions button.primary,
${P} .releaseCompleteActions .releaseMorePrimary {
    border-color: transparent !important; background: var(--ts-grad) !important; color: #fff !important;
    box-shadow: 0 10px 26px rgba(90,70,255,.42) !important;
}
${P} .releaseShiftChoices button.active { animation: tsChosen .6s ${SPRING} both !important; }
@keyframes tsChosen { 0% { transform: scale(.9); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }
${P} .releaseShiftChoices button:active,
${P} .releaseReplaySame:active,
${P} .releaseCompleteActions button:active,
${P} .releaseRecommendationActions button:active,
${P} .releaseCompleteSideNav:active { transform: scale(.95) !important; transition-duration: .08s !important; }
${P} .releaseCompleteSideNav {
    width: 100% !important; height: 50px !important; padding: 0 16px !important;
    font-size: 13px !important; letter-spacing: .08em !important;
    -webkit-backdrop-filter: blur(20px) !important; backdrop-filter: blur(20px) !important;
    animation: tsRise .7s ${SMOOTH} .7s both !important;
}
${P} .releaseRecommendationPanel { border-radius: 22px !important; }

/* ---------- Check-in polish (artwork untouched) ---------- */
${P} .eosCheckIn .eosCkSlot button.eosOrb { touch-action: manipulation !important; }

/* ---------- Form factors ---------- */
html body .tsAppHost.tsAppSkin[data-form="phone"] {
    --ts-nav-h: 60px; --ts-btn: 36px; --ts-gap: 6px; --ts-pad: 10px; --ts-glyph: 17px;
    --ts-title-top: 10px; --ts-score-top: 35px;
    --ts-input-h: 48px; --ts-cta-h: 54px;
}
html body .tsAppHost.tsAppSkin[data-form="tablet"] {
    --ts-nav-h: 68px; --ts-btn: 42px; --ts-gap: 8px; --ts-pad: 16px; --ts-glyph: 19px;
    --ts-title-top: 12px; --ts-score-top: 40px;
    --ts-input-h: 52px; --ts-cta-h: 52px;
}
html body .tsAppHost.tsAppSkin[data-short="1"] {
    --ts-nav-h: 50px; --ts-btn: 34px; --ts-title-top: 6px; --ts-score-top: 28px; --ts-input-h: 44px; --ts-cta-h: 44px;
}
/* Phone: the bar is too narrow for the long console name — show the brand. */
${PH} .releaseHeaderCenter .releaseTitleMain,
${PH} .releaseHeaderCenter .releaseTitleBy { display: none !important; }
${PH} .releaseConsoleHeader > .releaseScoreBar > span { display: none !important; }
${PH} .releaseCompleteCard { padding: 22px 16px 18px !important; gap: 12px !important; border-radius: 28px !important; }
${PH} .releaseCompleteActions { grid-template-columns: 1fr !important; }

/* Tablet / iPad: one-row dock, wider glass sheets centred like iPadOS form sheets. */
${PT} .releaseConsoleHeader > .releaseHeaderCenter .releaseTitleBrand { font-size: 15px !important; }
${PT} .releaseComposer {
    grid-template-columns: minmax(0, 1fr) var(--ts-input-h) minmax(220px, 300px) !important;
    grid-template-rows: auto !important;
    grid-template-areas: "in plus cta" !important;
    justify-self: center !important;
    width: min(920px, calc(100% - 32px)) !important;
    margin: 0 auto calc(16px + var(--ts-safe-b)) !important;
    border-radius: 34px !important;
}
${PT} .releaseComposer > .releaseChoiceWrap { margin-top: 0 !important; }
${PT} .releaseComposer .releaseChoiceMenu { left: auto !important; right: 0 !important; width: min(380px, 70vw) !important; }
${PT} .tsReleaseSettingsPanel {
    left: 50% !important; right: auto !important; bottom: calc(16px + var(--ts-safe-b)) !important;
    width: min(440px, calc(100% - 32px)) !important;
    border-radius: 30px !important; border-bottom: .5px solid var(--ts-hair-strong) !important;
    padding-bottom: 20px !important;
    animation-name: tsSheetUpCenter !important;
    transform: translateX(-50%) !important;
}
@keyframes tsSheetUpCenter { from { transform: translate(-50%, 115%); } to { transform: translate(-50%, 0); } }
${PT} .releaseCompleteCard { padding: 32px 30px 26px !important; }

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
    .tsAppHost *, .tsAppHost *::before, .tsAppHost *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
    .tsFxEdge { animation: none !important; opacity: .4; }
}
html body .tsAppHost.tsAppSkin.isCalm .tsFxEdge { animation: none !important; opacity: .3; }
`

/* Ritual-specific fixes carried over unchanged from V12 (check-in guard,
   Tiny Soundtrack #106, Finger Trap #102, Rain Out #110, support pill). */
const RITUAL_FIX_CSS = `
html body .tsArcade .releaseStage:has(.eosCheckIn) > .releaseIdleStage,
html body .tsArcade:has(.eosCkBottom) .releaseIdleStage,
html body .tsArcade .releaseIdleStage[data-ts-overlap-guard="1"] { display: none !important; visibility: hidden !important; pointer-events: none !important; }
html body .tsArcade .eosCheckIn .eosCkBottom, html body .tsArcade .eosCheckIn .eosCkFoot { pointer-events: auto !important; }
html body .tsArcade .eosCheckIn[data-step="1"] .eosCkHead:not(.isCold) .eosCkSub { font-size: 0 !important; }
html body .tsArcade .eosCheckIn[data-step="1"] .eosCkHead:not(.isCold) .eosCkSub::after {
    content: "Type how you feel below, or tap a bubble"; display: block !important;
    font: 600 clamp(13px, 2.8vw, 15px)/1.3 -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif !important;
    color: rgba(235,245,255,.82) !important; white-space: normal !important;
}
@keyframes tsReleaseTapBubbleInvite { 0%, 100% { filter: drop-shadow(0 0 0 rgba(0,232,255,0)); } 50% { filter: drop-shadow(0 0 10px rgba(0,232,255,.55)); } }
html body .tsArcade .eosCheckIn[data-step="1"] .eosCkSlot button.eosOrb { cursor: pointer !important; }
html body .tsArcade .eosCheckIn[data-step="1"] .eosCkSlot:not(.isSel) button.eosOrb .eosOrbBall { animation: tsReleaseTapBubbleInvite 5.5s ease-in-out infinite !important; }
html body .tsArcade .eosCheckIn .eosCkSlot button.eosOrb:focus-visible .eosOrbBall { outline: 3px solid #bcd6ff !important; outline-offset: 5px !important; }
html body .tsArcade .eosCheckIn[data-step="1"] .eosCkBottom {
    top: auto !important; bottom: max(5px, env(safe-area-inset-bottom, 0px)) !important; left: 4px !important; right: 4px !important;
    box-sizing: border-box !important; max-width: calc(100% - 8px) !important; z-index: 11 !important;
}
html body .tsArcade .eosCheckIn[data-step="1"] .eosCkChips { max-width: 100% !important; box-sizing: border-box !important; gap: 8px 10px !important; padding: 0 5px !important; }
html body .tsArcade .eosCheckIn[data-step="1"] .eosCkFoot { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; gap: 2px 8px !important; padding: 0 4px !important; justify-content: center !important; }
html body .tsArcade .eosCheckIn[data-step="1"] .eosCkFoot > .eosCkLink { white-space: normal !important; text-align: center !important; line-height: 1.1 !important; min-height: 32px !important; padding: 2px 5px !important; }
html body .tsArcade .releaseStage > .eosSupportPill, html body .tsArcade .releaseStage .eosSupportPill {
    position: absolute !important; left: 8px !important; right: auto !important; top: 8px !important; bottom: auto !important;
    z-index: 260 !important; width: 44px !important; height: 44px !important; max-width: 44px !important; padding: 0 !important; transform: none !important;
}
html body .tsArcade .releaseStage .eosSupportPill button {
    box-sizing: border-box !important; display: flex !important; width: 44px !important; min-width: 44px !important; max-width: 44px !important;
    height: 44px !important; min-height: 44px !important; padding: 0 !important; justify-content: center !important; align-items: center !important;
    gap: 0 !important; font-size: 0 !important; line-height: 0 !important; border-radius: 50% !important;
    background: rgba(255,255,255,.08) !important; border: .5px solid rgba(255,255,255,.16) !important;
    -webkit-backdrop-filter: blur(12px) !important; backdrop-filter: blur(12px) !important; box-shadow: 0 0 14px rgba(255,195,122,.18) !important;
}
html body .tsArcade .releaseStage .eosSupportPill button span { display: block !important; font-size: 18px !important; line-height: 1 !important; margin: 0 !important; }

html body .tsArcade.stage-play .engineProgressWrap:has(.u106), html body .tsArcade.stage-play .engineProgressWrap:has(.u102) { position: relative !important; min-height: 0 !important; overflow: hidden !important; }
html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .engineProgressHud {
    box-sizing: border-box !important; position: absolute !important; left: 12px !important; right: 12px !important; top: 5px !important; bottom: auto !important;
    width: calc(100% - 24px) !important; min-width: 0 !important; height: 30px !important; min-height: 30px !important; padding: 0 !important; margin: 0 !important;
    display: grid !important; grid-template-columns: minmax(110px,1fr) auto !important; gap: 10px !important; align-items: center !important;
    z-index: 60 !important; overflow: hidden !important; background: transparent !important; pointer-events: none !important;
}
html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .engineProgressHud {
    box-sizing: border-box !important; position: absolute !important; top: 5px !important; left: 58px !important; right: 9px !important; bottom: auto !important;
    width: calc(100% - 67px) !important; min-width: 0 !important; height: 30px !important; min-height: 30px !important; margin: 0 !important; padding: 0 !important;
    display: grid !important; grid-template-columns: minmax(80px,1fr) auto !important; align-items: center !important; gap: 8px !important;
    z-index: 60 !important; background: transparent !important; overflow: hidden !important; pointer-events: none !important;
}
html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .engineProgressHud > .engineProgressTrack,
html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .engineProgressHud > .engineProgressTrack {
    box-sizing: border-box !important; position: relative !important; inset: auto !important; width: 100% !important; max-width: none !important; min-width: 0 !important; height: 26px !important; margin: 0 !important;
}
html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .engineProgressHud > .tsShiftRewardHud,
html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .engineProgressHud > .tsShiftRewardHud {
    display: flex !important; align-items: center !important; justify-content: flex-end !important; flex-wrap: nowrap !important; box-sizing: border-box !important;
    width: max-content !important; max-width: 100% !important; min-width: 0 !important; height: 26px !important; min-height: 0 !important; margin: 0 !important; gap: 5px !important; overflow: hidden !important;
}
html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .cinematicContentShell,
html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .cinematicContentShell {
    box-sizing: border-box !important; position: absolute !important; top: 43px !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
    width: 100% !important; height: calc(100% - 43px) !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important;
}
html body .tsArcade.stage-play .u106.tinySoundtrackV2Shell {
    box-sizing: border-box !important; position: relative !important; display: flex !important; align-items: flex-start !important; justify-content: center !important;
    width: 100% !important; max-width: 100% !important; height: 100% !important; min-height: 0 !important; padding: 5px 12px 63px !important; margin: 0 !important;
    overflow-x: hidden !important; overflow-y: auto !important; overscroll-behavior: contain !important; scrollbar-width: thin !important; scroll-padding-bottom: 65px !important;
}
html body .tsArcade.stage-play .u106 .tsndGame {
    box-sizing: border-box !important; position: relative !important; display: block !important; flex: 0 0 auto !important; width: min(850px,100%) !important; max-width: 100% !important;
    height: auto !important; min-height: 0 !important; max-height: none !important; margin: 0 auto !important; padding: 12px 14px 14px !important; overflow: visible !important;
}
html body .tsArcade.stage-play .u106 .tsndTop { position: relative !important; z-index: 1 !important; margin-bottom: 9px !important; min-width: 0 !important; }
html body .tsArcade.stage-play .u106 .tsndGrid, html body .tsArcade.stage-play .u106 .tsndInstrument { position: relative !important; z-index: 1 !important; }
html body .tsArcade.stage-play .cinematicContentShell:has(> .u106) > .globalPlayGuide,
html body .tsArcade.stage-play .cinematicContentShell:has(> .u102) > .globalPlayGuide {
    box-sizing: border-box !important; position: absolute !important; left: 50% !important; right: auto !important; transform: translateX(-50%) !important; bottom: 7px !important;
    width: min(880px,calc(100% - 24px)) !important; max-width: none !important; z-index: 75 !important; margin: 0 !important; min-height: 36px !important;
}
html body .tsArcade.stage-play .u102 {
    box-sizing: border-box !important; position: relative !important; display: flex !important; align-items: flex-start !important; justify-content: center !important;
    width: 100% !important; max-width: 100% !important; height: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 5px 12px 58px !important;
    overflow-x: hidden !important; overflow-y: auto !important; overscroll-behavior: contain !important; scroll-padding-bottom: 62px !important; scrollbar-width: thin !important;
}
html body .tsArcade.stage-play .u102 .ftGame {
    box-sizing: border-box !important; position: relative !important; display: flex !important; flex: 0 0 auto !important; flex-direction: column !important;
    width: min(920px,100%) !important; max-width: 100% !important; height: auto !important; min-height: 0 !important; max-height: none !important;
    margin: 0 auto !important; padding: 8px 12px 11px !important; overflow: visible !important; border-radius: 19px !important;
}
html body .tsArcade.stage-play .u102 .ftHud { flex: 0 0 auto !important; min-height: 28px !important; height: auto !important; margin: 0 0 7px !important; gap: 8px !important; }
html body .tsArcade.stage-play .u102 .ftRows { display: grid !important; grid-template-columns: minmax(0,1fr) !important; grid-auto-rows: 82px !important; flex: 0 0 auto !important; min-height: 0 !important; gap: 7px !important; overflow: visible !important; }
html body .tsArcade.stage-play .u102 .ftRow { box-sizing: border-box !important; height: 82px !important; min-height: 82px !important; max-height: 82px !important; padding: 0 47px 11px !important; overflow: visible !important; border-radius: 15px !important; }
html body .tsArcade.stage-play .u102 .ftTrap { height: 47px !important; }
html body .tsArcade.stage-play .u102 .ftTube { height: 40px !important; }
html body .tsArcade.stage-play .u102 .ftThoughtPill { height: 43px !important; min-width: 0 !important; padding-left: 85px !important; }
html body .tsArcade.stage-play .u102 .ftThumb { width: 68px !important; height: 68px !important; min-width: 68px !important; min-height: 68px !important; max-width: 68px !important; max-height: 68px !important; flex-basis: 68px !important; }
html body .tsArcade.stage-play .u102 .ftArrow { width: 39px !important; height: 39px !important; }
@media (max-width: 760px) {
    html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .engineProgressHud { grid-template-columns: minmax(70px,1fr) auto !important; gap: 5px !important; left: 7px !important; right: 7px !important; width: calc(100% - 14px) !important; }
    html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .engineProgressHud { left: 55px !important; right: 6px !important; width: calc(100% - 61px) !important; grid-template-columns: minmax(55px,1fr) auto !important; gap: 4px !important; }
    html body .tsArcade.stage-play .engineProgressWrap:has(.u106) .tsShiftRewardPill.chain, html body .tsArcade.stage-play .engineProgressWrap:has(.u106) .tsShiftRewardPill.token,
    html body .tsArcade.stage-play .engineProgressWrap:has(.u102) .tsShiftRewardPill.chain, html body .tsArcade.stage-play .engineProgressWrap:has(.u102) .tsShiftRewardPill.token { display: none !important; }
    html body .tsArcade.stage-play .u106.tinySoundtrackV2Shell { padding: 5px 7px 66px !important; }
    html body .tsArcade.stage-play .u106 .tsndGame { width: 100% !important; padding: 10px !important; }
    html body .tsArcade.stage-play .cinematicContentShell:has(> .u106) > .globalPlayGuide, html body .tsArcade.stage-play .cinematicContentShell:has(> .u102) > .globalPlayGuide { width: calc(100% - 14px) !important; }
    html body .tsArcade.stage-play .u102 { padding: 4px 5px 64px !important; }
    html body .tsArcade.stage-play .u102 .ftGame { width: 100% !important; padding: 8px 5px 10px !important; }
    html body .tsArcade.stage-play .u102 .ftHud { grid-template-columns: 48px minmax(0,1fr) !important; gap: 5px !important; }
    html body .tsArcade.stage-play .u102 .ftRows { grid-auto-rows: 82px !important; gap: 6px !important; }
    html body .tsArcade.stage-play .u102 .ftRow { height: 82px !important; min-height: 82px !important; max-height: 82px !important; padding: 0 30px 10px !important; }
    html body .tsArcade.stage-play .u102 .ftTrap { width: calc(100% - 24px) !important; }
    html body .tsArcade.stage-play .u102 .ftThoughtPill { height: 40px !important; width: min(72%,450px) !important; padding: 0 4px 0 57px !important; }
    html body .tsArcade.stage-play .u102 .ftThumb { width: 52px !important; height: 52px !important; min-width: 52px !important; min-height: 52px !important; max-width: 52px !important; max-height: 52px !important; flex-basis: 52px !important; }
    html body .tsArcade.stage-play .u102 .ftArrow { width: 30px !important; height: 36px !important; }
}
@media (max-width: 540px) {
    html body .tsArcade.stage-play .u106 .tsndTop { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; }
    html body .tsArcade.stage-play .u106 .tsndTitle { flex: 1 1 150px !important; min-width: 0 !important; }
    html body .tsArcade.stage-play .u106 .tsndVibes { flex: 0 0 auto !important; }
    html body .tsArcade.stage-play .u106 .tsndVibes button { height: 30px !important; min-width: 58px !important; padding: 0 6px !important; }
    html body .tsArcade.stage-play .u106 .tsndGrid { grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 7px !important; }
    html body .tsArcade.stage-play .u106 .tsndCard { height: 95px !important; min-height: 95px !important; grid-template-columns: 42px minmax(0,1fr) !important; padding: 6px !important; }
    html body .tsArcade.stage-play .u106 .tsndAvatar { width: 40px !important; height: 40px !important; min-width: 40px !important; min-height: 40px !important; max-width: 40px !important; max-height: 40px !important; }
    html body .tsArcade.stage-play .u106 .tsndInstrumentHead { flex-wrap: wrap !important; row-gap: 4px !important; line-height: 1.2 !important; }
    html body .tsArcade.stage-play .u106 .tsndKeys, html body .tsArcade.stage-play .u106 .tsndKey { height: 64px !important; }
}
@media (max-height: 680px) and (min-width: 761px) {
    html body .tsArcade.stage-play .u102 .ftRows { grid-auto-rows: 75px !important; gap: 5px !important; }
    html body .tsArcade.stage-play .u102 .ftRow { height: 75px !important; min-height: 75px !important; max-height: 75px !important; }
    html body .tsArcade.stage-play .u102 .ftThumb { width: 58px !important; height: 58px !important; min-width: 58px !important; min-height: 58px !important; max-width: 58px !important; max-height: 58px !important; flex-basis: 58px !important; }
}
html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(-n+4) { top: calc(25% - 42px) !important; }
html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(5),
html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(6) { top: calc(67% - 42px) !important; }
html body .tsArcade.stage-play .rainOutScene .rainCloudUnit.pulled { pointer-events: none !important; }
html body .tsArcade.stage-play .rainOutScene.released > .rainCloudUnit { display: none !important; opacity: 0 !important; visibility: hidden !important; }
html body .tsArcade.stage-play .rainOutScene .rainClearSky { border-radius: 16px; animation: tsClearSkyArrives .72s ease-out both; }
@keyframes tsClearSkyArrives { from { opacity: 0; filter: brightness(.8); } to { opacity: 1; filter: brightness(1); } }
@media (max-width: 700px) {
    html body .tsArcade.stage-play .u110 { overflow-x: hidden !important; overflow-y: auto !important; overscroll-behavior: contain !important; }
    html body .tsArcade.stage-play .rainOutScene { min-height: 835px !important; height: 835px !important; overflow: visible !important; }
    html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(odd) { left: calc(25% - 68px) !important; }
    html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(even) { left: calc(75% - 68px) !important; }
    html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(1),
    html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(2) { top: 75px !important; }
    html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(3),
    html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(4) { top: 330px !important; }
    html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(5),
    html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(6) { top: 585px !important; }
}
`

/* ------------------------------------------------------------------ */
/* Director: watches the running app and drives the app-shell effects  */
/* ------------------------------------------------------------------ */

const TAPPABLE = "button, [role='button'], a[href], label, input[type='checkbox'], .eosOrb"

function useAppDirector(
    hostRef: React.RefObject<HTMLDivElement>,
    fxRef: React.RefObject<HTMLDivElement>,
    active: boolean,
    opts: { effects: boolean; hapticsOn: boolean }
) {
    const optsRef = React.useRef(opts)
    optsRef.current = opts

    React.useEffect(() => {
        const host = hostRef.current
        if (!host || !active) return
        let frame = 0
        let disposed = false
        let lastStage = ""
        let hadComplete = false
        const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

        const flashEdge = () => {
            const edge = fxRef.current?.querySelector<HTMLElement>(".tsFxEdge")
            if (!edge) return
            edge.classList.remove("isFlash")
            void edge.offsetWidth
            edge.classList.add("isFlash")
            window.setTimeout(() => edge.classList.remove("isFlash"), 1900)
        }

        const sync = () => {
            frame = 0
            if (disposed) return
            // Skip the bundle's ritual-thumbnail previews, which are also .tsArcade roots.
            const root = host.querySelector<HTMLElement>(".tsArcade:not(.eosPreview)")
            if (!root) return
            const isCheckingIn = !!root.querySelector(".eosCheckIn, .eosCkBottom, [data-eos-more='1']")

            // Check-in: hide the decorative idle cards that cover its footer.
            root.querySelectorAll<HTMLElement>(".releaseIdleStage").forEach((stage) => {
                if (isCheckingIn) {
                    if (stage.style.getPropertyPriority("display") !== "important") stage.style.setProperty("display", "none", "important")
                    stage.dataset.tsOverlapGuard = "1"
                } else if (stage.dataset.tsOverlapGuard === "1") {
                    stage.style.removeProperty("display")
                    delete stage.dataset.tsOverlapGuard
                }
            })
            const input = root.querySelector<HTMLInputElement>(".releaseComposer .releaseThoughtInput")
            if (input) {
                const hint = isCheckingIn ? "How are you feeling?" : "Put it into words…"
                if (input.placeholder !== hint) input.placeholder = hint
                if (input.getAttribute("enterkeyhint") !== "go") input.setAttribute("enterkeyhint", "go")
            }

            const stage = (root.className.match(/\bstage-(\w+)/) || [])[1] || ""
            if (stage !== lastStage) {
                host.dataset.stage = stage
                const stageEl = root.querySelector<HTMLElement>(".releaseStage")
                if (lastStage && stageEl && !reduced && optsRef.current.effects) {
                    stageEl.classList.remove("tsAppStageIn")
                    void stageEl.offsetWidth
                    stageEl.classList.add("tsAppStageIn")
                    const done = () => { stageEl.classList.remove("tsAppStageIn"); stageEl.removeEventListener("animationend", done) }
                    stageEl.addEventListener("animationend", done)
                }
                lastStage = stage
            }

            const complete = stage === "reveal" || !!root.querySelector(".releaseCompleteOverlay")
            if (complete && !hadComplete) {
                const layer = fxRef.current
                if (layer && optsRef.current.effects) {
                    spawnBloom(layer, reduced)
                    flashEdge()
                }
                haptic([14, 60, 20, 60, 34], optsRef.current.hapticsOn)
                if (root.querySelector(".releaseHeaderSound.active")) chime()
            }
            hadComplete = complete
        }
        const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(sync) }

        const observer = new MutationObserver(schedule)
        observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-step"] })

        const onDown = (event: PointerEvent) => {
            unlockAudio()
            const target = (event.target as Element | null)?.closest?.(TAPPABLE)
            if (!target || !host.contains(target) || (target as HTMLButtonElement).disabled) return
            haptic(8, optsRef.current.hapticsOn)
            const layer = fxRef.current
            if (!layer || !optsRef.current.effects || reduced) return
            const rect = host.getBoundingClientRect()
            spawnRipple(layer, event.clientX - rect.left, event.clientY - rect.top)
        }
        host.addEventListener("pointerdown", onDown, { capture: true, passive: true })

        sync()
        return () => {
            disposed = true
            observer.disconnect()
            host.removeEventListener("pointerdown", onDown, true)
            if (frame) cancelAnimationFrame(frame)
        }
    }, [active])
}

// Framer pre-renders on the server, where useLayoutEffect only warns.
const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function useFormFactor(hostRef: React.RefObject<HTMLDivElement>) {
    const [form, setForm] = React.useState<{ form: FormFactor; short: boolean }>({ form: "phone", short: false })
    useIsoLayoutEffect(() => {
        const host = hostRef.current
        if (!host || typeof ResizeObserver === "undefined") return
        const measure = () => {
            // The Framer frame, not the browser viewport, decides the layout.
            const { width, height } = host.getBoundingClientRect()
            const next: FormFactor = width >= 640 ? "tablet" : "phone"
            const short = height > 0 && height < 520 && width > height
            setForm((prev) => (prev.form === next && prev.short === short ? prev : { form: next, short }))
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(host)
        return () => ro.disconnect()
    }, [])
    return form
}

function useAppMeta(enabled: boolean) {
    React.useEffect(() => {
        if (!enabled || typeof document === "undefined") return
        const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
        if (viewport && !/viewport-fit/.test(viewport.content)) viewport.content += ", viewport-fit=cover"
        const ensure = (name: string, content: string) => {
            if (document.querySelector(`meta[name="${name}"]`)) return
            const meta = document.createElement("meta")
            meta.name = name
            meta.content = content
            document.head.appendChild(meta)
        }
        ensure("theme-color", "#000000")
        ensure("apple-mobile-web-app-capable", "yes")
        ensure("mobile-web-app-capable", "yes")
        ensure("apple-mobile-web-app-status-bar-style", "black-translucent")
    }, [enabled])
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ThinkStillReleaseApp(props: any) {
    const {
        appSplash = true,
        appEffects = true,
        edgeGlow = true,
        fillViewport = false,
        hapticsOn = true,
        style,
        ...rest
    } = props
    const hostRef = React.useRef<HTMLDivElement>(null)
    const fxRef = React.useRef<HTMLDivElement>(null)
    const [app, setApp] = React.useState<ReleaseApp | null>(() => cachedApp)
    const [error, setError] = React.useState<string>("")
    const [retry, setRetry] = React.useState(0)
    const [closing, setClosing] = React.useState(false)
    const [closed, setClosed] = React.useState(false)
    const [splash, setSplash] = React.useState<boolean>(() => {
        if (!appSplash) return !cachedApp
        try { return !(cachedApp && sessionStorage.getItem(SPLASH_KEY)) } catch { return true }
    })
    const [minElapsed, setMinElapsed] = React.useState(false)
    const [revealing, setRevealing] = React.useState(false)
    const { form, short } = useFormFactor(hostRef)
    useAppMeta(fillViewport)

    React.useEffect(() => {
        let active = true
        getApp().then(
            (component) => { if (active) { setApp(() => component); setError("") } },
            (cause) => { if (active) setError(String(cause?.message || cause)) }
        )
        return () => { active = false }
    }, [retry])

    React.useEffect(() => {
        if (!splash) return
        const timer = window.setTimeout(() => setMinElapsed(true), appSplash ? SPLASH_MIN_MS : 0)
        return () => window.clearTimeout(timer)
    }, [])

    const dismissSplash = React.useCallback(() => {
        setSplash(false)
        setRevealing(true)
        try { sessionStorage.setItem(SPLASH_KEY, "1") } catch { /* ignore */ }
        window.setTimeout(() => setRevealing(false), 950)
    }, [])

    React.useEffect(() => {
        if (splash && app && minElapsed) dismissSplash()
    }, [splash, app, minElapsed])

    useAppDirector(hostRef, fxRef, !!app && !closed, { effects: appEffects, hapticsOn })

    const handleClose = React.useCallback(() => {
        setClosing(true)
        haptic(10, hapticsOn)
        window.setTimeout(() => setClosed(true), 420)
    }, [hapticsOn])

    if (closed) return null

    const shownError = error || (!app ? cachedError : "")
    const className = [
        "tsAppHost",
        "tsAppSkin",
        fillViewport ? "isFill" : "",
        closing ? "tsAppClosing" : "",
        revealing ? "isRevealing" : "",
    ].filter(Boolean).join(" ")

    return (
        <div
            ref={hostRef}
            className={className}
            data-skin="v20"
            data-form={form}
            data-short={short ? "1" : "0"}
            style={style ? { ...style, position: fillViewport ? "fixed" : style.position || "relative" } : undefined}
        >
            <style>{APP_CSS + RITUAL_FIX_CSS}</style>
            <div className="tsAppStage">
                {app ? React.createElement(app, {
                    ...rest,
                    hapticsOn,
                    eosShowGameMenu: false,
                    title: rest.title || "EMOTIONAL RELEASE CONSOLE",
                    onClose: handleClose,
                }) : null}
            </div>
            <div ref={fxRef} className="tsFxLayer" aria-hidden="true">
                {edgeGlow && appEffects ? <div className="tsFxEdge" /> : null}
            </div>
            <AnimatePresence>
                {(splash || (!app && shownError)) ? (
                    <Splash
                        key="splash"
                        ready={!!app}
                        error={!app ? shownError : ""}
                        onRetry={() => { setError(""); cachedError = ""; setRetry((n) => n + 1) }}
                        onSkip={dismissSplash}
                    />
                ) : null}
            </AnimatePresence>
        </div>
    )
}

addPropertyControls(ThinkStillReleaseApp, {
    appSplash: { type: ControlType.Boolean, title: "Launch splash", defaultValue: true },
    appEffects: { type: ControlType.Boolean, title: "Delight FX", defaultValue: true },
    edgeGlow: { type: ControlType.Boolean, title: "Breathing edge", defaultValue: true },
    fillViewport: { type: ControlType.Boolean, title: "Full-screen app", defaultValue: false },
    eosShowGameMenu: { type: ControlType.Boolean, title: "Ritual menu", defaultValue: false },
    title: { type: ControlType.String, title: "Title", defaultValue: "EMOTIONAL RELEASE CONSOLE" },
    accent: { type: ControlType.Color, title: "Neon 1", defaultValue: "#00D9FF" },
    accent2: { type: ControlType.Color, title: "Neon 2", defaultValue: "#C000FF" },
    background: { type: ControlType.Color, title: "Background", defaultValue: "#000000" },
    soundOn: { type: ControlType.Boolean, title: "SFX on", defaultValue: true },
    hapticsOn: { type: ControlType.Boolean, title: "Haptics", defaultValue: true },
    musicOnDefault: { type: ControlType.Boolean, title: "Music", defaultValue: false },
    musicVolume: { type: ControlType.Number, title: "Music volume", min: 0, max: 1, step: .05, defaultValue: .35 },
    tapOutBpm: { type: ControlType.Number, title: "Tap BPM", min: 40, max: 180, step: 1, defaultValue: 92 },
    bubbleTextPx: { type: ControlType.Number, title: "Bubble text", min: 1, max: 28, step: .5, defaultValue: 16 },
    maxWidth: { type: ControlType.Number, title: "Max width", min: 700, max: 1600, step: 10, defaultValue: 1180 },
    pixarIntensity: { type: ControlType.Number, title: "Pixar light", min: 0, max: 2, step: .05, defaultValue: 1 },
    pixarWarmth: { type: ControlType.Number, title: "Warmth", min: 0, max: 2, step: .05, defaultValue: 1 },
    pixarParallax: { type: ControlType.Boolean, title: "Light follows", defaultValue: true },
    pixarSquash: { type: ControlType.Boolean, title: "Squash", defaultValue: true },
    pixarBokeh: { type: ControlType.Number, title: "Bokeh", min: 0, max: 24, step: 1, defaultValue: 9 },
    pixarDust: { type: ControlType.Number, title: "Dust", min: 0, max: 40, step: 1, defaultValue: 14 },
    eosCheckin: { type: ControlType.Boolean, title: "Check-in", defaultValue: true },
    eosCrisisLines: { type: ControlType.String, title: "Support lines", defaultValue: "Australia · Lifeline 13 11 14 | Anywhere · findahelpline.com", displayTextArea: true },
    eosCrisisUrl: { type: ControlType.String, title: "Support link", defaultValue: "https://findahelpline.com" },
    eosEmergencyText: { type: ControlType.String, title: "Emergency text", defaultValue: "In immediate danger? Call your local emergency number." },
    eosShareUrl: { type: ControlType.String, title: "Share link", defaultValue: "" },
})
