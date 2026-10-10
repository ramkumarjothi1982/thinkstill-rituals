// ThinkStill Release — SPOTLIGHT PREMIUM V4 (single self-contained file).
// Paste this whole file into ONE Framer code file. It needs no other code files.
// Contains the complete original Release wrapper (engine loader, check-in guard,
// header CSS, settings, support dialog) plus the Spotlight skin: a Netflix-dark
// stage, Pixar key light and squash-and-stretch buttons, iPhone-standard
// mechanics (SF type, 44pt targets, safe areas, iOS sheets and springs), an
// episode ribbon per finished ritual and a ThinkStill Premium value sheet.
// The premium offer never appears on top of a ritual, during check-in, or in a
// session where the support dialog was shown.
// Framer canvas and published sites must allow loading the CDN script.
import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion } from "framer-motion"
import * as FramerMotionNS from "framer-motion"

/** @framerIntrinsicWidth 390
 *  @framerIntrinsicHeight 844
 */

// V19 — native previous/next SCREEN navigation inside the pinned Release engine.
const SCRIPT_SOURCES = [
    "https://cdn.jsdelivr.net/gh/ramkumarjothi1982/thinkstill-rituals@550fbe8099057b4564da2a23ba8eae8ddce15bd3/framer/release/thinkstill-release-screen-navigation-v19.js",
    "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/550fbe8099057b4564da2a23ba8eae8ddce15bd3/framer/release/thinkstill-release-screen-navigation-v19.js",
]

type ReleaseApp = React.ComponentType<any>

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
                reject(
                    new Error(
                        "Script downloaded but did not expose ThinkStill factory"
                    )
                )
            } else {
                resolve()
            }
        }
        script.onerror = () => {
            script.remove()
            reject(
                new Error("Script blocked or unavailable: " + src.split("/")[2])
            )
        }
        document.head.appendChild(script)
    })
}

function getApp(): Promise<ReleaseApp> {
    if (cachedApp) return Promise.resolve(cachedApp)
    if (cachedPromise) return cachedPromise
    cachedPromise = (async () => {
        if (typeof window === "undefined") throw new Error("Browser required")
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
            throw new Error(
                errors.join("; ") || "ThinkStill script unavailable"
            )
        }
        const app = window.__TS_F(
            React,
            (_component, _controls) => {
                /* Framer controls are attached below. */
            },
            ControlType,
            motion,
            FramerMotionNS
        )
        if (
            typeof app !== "function" &&
            (typeof app !== "object" || app === null)
        ) {
            throw new Error(
                "ThinkStill factory did not return a React component"
            )
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

function StatusView({
    message,
    details,
    onRetry,
}: {
    message: string
    details?: string
    onRetry?: () => void
}) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                minHeight: 320,
                background: "#090e20",
                color: "#fff",
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 18,
                textAlign: "center",
                padding: 20,
                boxSizing: "border-box",
                fontFamily: "Inter, system-ui, sans-serif",
            }}
        >
            <div style={{ fontSize: 26, fontWeight: 800 }}>
                ThinkStill Release Rituals
            </div>
            <div style={{ opacity: 0.86, fontSize: 15 }}>{message}</div>
            {details && (
                <div
                    style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        opacity: 0.65,
                        overflowWrap: "anywhere",
                        maxWidth: 420,
                    }}
                >
                    {details}
                </div>
            )}
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    style={{
                        fontWeight: 750,
                        fontSize: 15,
                        background: "#ffce68",
                        color: "#1e1230",
                        padding: "13px 25px",
                        borderRadius: 25,
                        border: 0,
                        cursor: "pointer",
                    }}
                >
                    Try again
                </button>
            )}
        </div>
    )
}

function ReleaseCheckInOverlapGuard() {
    React.useEffect(() => {
        if (typeof document === "undefined") return
        let frame = 0
        let disposed = false

        const sync = () => {
            frame = 0
            if (disposed) return
            const roots = document.querySelectorAll<HTMLElement>(".tsArcade")
            roots.forEach((root) => {
                const isCheckingIn = !!root.querySelector(
                    ".eosCheckIn, .eosCkBottom, [data-eos-more='1']"
                )
                const thoughtInput = root.querySelector<HTMLInputElement>(
                    ".releaseComposer .releaseThoughtInput"
                )
                if (thoughtInput) {
                    const hint = isCheckingIn
                        ? "Name what you’re feeling…"
                        : "Put the feeling into words, then choose how to work with it."
                    if (thoughtInput.placeholder !== hint)
                        thoughtInput.placeholder = hint
                }
                root.querySelectorAll<HTMLElement>(".releaseIdleStage").forEach(
                    (stage) => {
                        if (isCheckingIn) {
                            if (
                                stage.style.getPropertyValue("display") !==
                                    "none" ||
                                stage.style.getPropertyPriority("display") !==
                                    "important"
                            ) {
                                stage.style.setProperty(
                                    "display",
                                    "none",
                                    "important"
                                )
                            }
                            stage.dataset.tsOverlapGuard = "1"
                        } else if (stage.dataset.tsOverlapGuard === "1") {
                            stage.style.removeProperty("display")
                            delete stage.dataset.tsOverlapGuard
                        }
                    }
                )
            })
        }
        const schedule = () => {
            if (!disposed && !frame) frame = requestAnimationFrame(sync)
        }
        const observer = new MutationObserver(schedule)
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style", "data-step"],
        })
        sync()
        return () => {
            disposed = true
            observer.disconnect()
            if (frame) cancelAnimationFrame(frame)
            document
                .querySelectorAll<HTMLElement>(
                    ".releaseIdleStage[data-ts-overlap-guard='1']"
                )
                .forEach((stage) => {
                    stage.style.removeProperty("display")
                    delete stage.dataset.tsOverlapGuard
                })
        }
    }, [])

    return (
        <style>{`
        html body .tsArcade .releaseStage:has(.eosCheckIn) > .releaseIdleStage,
        html body .tsArcade:has(.eosCkBottom) .releaseIdleStage,
        html body .tsArcade .releaseIdleStage[data-ts-overlap-guard="1"] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
        html body .tsArcade .eosCheckIn .eosCkBottom,
        html body .tsArcade .eosCheckIn .eosCkFoot {
            pointer-events: auto !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex-wrap: nowrap !important;
            right: 57px !important;
            width: max-content !important;
            min-width: 0 !important;
            max-width: calc(100% - 116px) !important;
            gap: 7px !important;
            padding: 0 9px !important;
            overflow: hidden !important;
            white-space: nowrap !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > span,
        html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > strong {
            flex: 0 0 auto !important;
            min-width: 0 !important;
            letter-spacing: 0 !important;
            font-size: 10px !important;
            font-variant-numeric: tabular-nums !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > .releaseScoreTrack {
            display: block !important;
            flex: 0 1 64px !important;
            min-width: 16px !important;
            width: 64px !important;
            max-width: 64px !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
            right: 9px !important;
            z-index: 5 !important;
            flex: none !important;
        }
        @keyframes tsReleaseInputInvitation {
            0%, 100% {
                box-shadow: 0 0 0 2px rgba(81,231,255,.60),
                    0 0 16px 3px rgba(0,210,255,.24),
                    0 0 27px rgba(189,75,255,.18);
            }
            50% {
                box-shadow: 0 0 0 3px rgba(255,213,127,.95),
                    0 0 25px 7px rgba(0,217,255,.44),
                    0 0 38px rgba(180,72,255,.29);
            }
        }
        html body .tsArcade.stage-input .releaseComposer .releaseInputWrap {
            position: relative !important;
            border-radius: 13px !important;
            animation: tsReleaseInputInvitation 2.6s ease-in-out infinite !important;
            isolation: isolate !important;
        }
        html body .tsArcade.stage-input .releaseComposer .releaseInputWrap:focus-within {
            animation: none !important;
            box-shadow: 0 0 0 3px rgba(255,210,115,.98),
                0 0 25px 6px rgba(0,224,255,.45) !important;
        }
        html body .tsArcade.stage-input .releaseComposer .releaseThoughtInput {
            border: 1.5px solid rgba(111,235,255,.80) !important;
            background: rgba(5,27,42,.95) !important;
            color: #fff !important;
            padding-right: 45px !important;
        }
        html body .tsArcade.stage-input .releaseComposer .releaseThoughtInput::placeholder {
            color: rgba(241,251,255,.87) !important;
            opacity: 1 !important;
        }
        html body .tsArcade.stage-input .releaseComposer .releaseThoughtInput:focus {
            outline: none !important;
            border-color: #ffe0a0 !important;
        }
        html body .tsArcade .eosCheckIn[data-step="1"] .eosCkHead:not(.isCold) .eosCkSub {
            font-size: 0 !important;
        }
        html body .tsArcade .eosCheckIn[data-step="1"] .eosCkHead:not(.isCold) .eosCkSub::after {
            content: "Type how you feel below, OR tap an emotion bubble";
            display: block !important;
            font: 750 clamp(12px, 2.8vw, 15px)/1.25 Inter, system-ui, sans-serif !important;
            color: #eafcff !important;
            text-shadow: 0 0 12px rgba(29,206,255,.38) !important;
            white-space: normal !important;
        }
        @keyframes tsReleaseTapBubbleInvite {
            0%, 100% { filter: drop-shadow(0 0 0 rgba(0,232,255,0)); }
            50% { filter: drop-shadow(0 0 10px rgba(0,232,255,.55)); }
        }
        html body .tsArcade .eosCheckIn[data-step="1"] .eosCkSlot button.eosOrb {
            cursor: pointer !important;
            touch-action: manipulation !important;
        }
        html body .tsArcade .eosCheckIn[data-step="1"] .eosCkSlot:not(.isSel) button.eosOrb .eosOrbBall {
            animation: tsReleaseTapBubbleInvite 3s ease-in-out infinite !important;
        }
        html body .tsArcade .eosCheckIn .eosCkSlot button.eosOrb:focus-visible .eosOrbBall {
            outline: 3px solid #ffe2a0 !important;
            outline-offset: 5px !important;
        }
        @media (max-width: 560px) {
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
                right: 50px !important;
                max-width: calc(100% - 100px) !important;
                padding: 0 7px !important;
                gap: 5px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > span {
                display: none !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > .releaseScoreTrack {
                flex-basis: 34px !important;
                width: 34px !important;
                max-width: 34px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > strong {
                font-size: 10px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
                right: 6px !important;
            }
        }
        html body .tsArcade .releaseConsoleHeader {
            box-sizing: border-box !important;
            display: block !important;
            padding: 0 !important;
            min-width: 0 !important;
            overflow: hidden !important;
        }
        html body .tsArcade .releaseConsoleHeader:before {
            display: none !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseClose {
            position: absolute !important;
            top: 50% !important;
            left: 9px !important;
            transform: translateY(-50%) !important;
            z-index: 7 !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
            box-sizing: border-box !important;
            position: absolute !important;
            left: 53px !important;
            right: 217px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            height: 39px !important;
            padding: 0 8px !important;
            overflow: hidden !important;
            z-index: 2 !important;
        }
        html body .tsArcade .releaseHeaderCenter .releaseConsoleTitle {
            min-width: 0 !important;
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
        }
        html body .tsArcade .releaseHeaderCenter .releaseTitleMain {
            flex: 0 1 auto !important;
            min-width: 0 !important;
            overflow: hidden !important;
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
            right: 51px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 147px !important;
            max-width: 147px !important;
            min-width: 0 !important;
            height: 29px !important;
            justify-content: space-between !important;
            z-index: 4 !important;
            gap: 5px !important;
            padding: 0 8px !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
            position: absolute !important;
            right: 7px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 34px !important;
            height: 34px !important;
            z-index: 6 !important;
        }
        html body .tsArcade .eosCheckIn[data-step="1"] .eosCkBottom {
            top: auto !important;
            bottom: max(5px, env(safe-area-inset-bottom, 0px)) !important;
            left: 4px !important;
            right: 4px !important;
            box-sizing: border-box !important;
            max-width: calc(100% - 8px) !important;
            z-index: 11 !important;
        }
        html body .tsArcade .eosCheckIn[data-step="1"] .eosCkChips {
            max-width: 100% !important;
            box-sizing: border-box !important;
            gap: 5px 10px !important;
            padding: 0 5px !important;
        }
        html body .tsArcade .eosCheckIn[data-step="1"] .eosCkFoot {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            gap: 2px 6px !important;
            padding: 0 4px !important;
            justify-content: center !important;
        }
        html body .tsArcade .eosCheckIn[data-step="1"] .eosCkFoot > .eosCkLink {
            white-space: normal !important;
            text-align: center !important;
            line-height: 1.1 !important;
            min-height: 30px !important;
            padding: 2px 5px !important;
        }
        html body .tsArcade .releaseComposer {
            box-sizing: border-box !important;
            min-width: 0 !important;
        }
        html body .tsArcade .releaseComposer > * {
            min-width: 0 !important;
            box-sizing: border-box !important;
        }
        @media (max-width: 900px) {
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                left: 51px !important;
                right: 182px !important;
                padding: 0 5px !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleBy,
            html body .tsArcade .releaseHeaderCenter .releaseTitleBrand {
                display: none !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleMain {
                font-size: clamp(10px, 1.45vw, 14px) !important;
                letter-spacing: -0.02em !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
                width: 118px !important;
                max-width: 118px !important;
                right: 49px !important;
                gap: 3px !important;
                padding: 0 6px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > span {
                font-size: 9px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > .releaseScoreTrack {
                flex: 1 1 14px !important;
                min-width: 8px !important;
            }
        }
        @media (max-width: 600px) {
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                left: 47px !important;
                right: 125px !important;
                width: auto !important;
                max-width: none !important;
                height: 34px !important;
                padding: 0 3px !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleMain {
                font-size: clamp(9px, 2.5vw, 12px) !important;
                letter-spacing: -.03em !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
                right: 43px !important;
                width: 74px !important;
                max-width: 74px !important;
                min-width: 0 !important;
                height: 26px !important;
                padding: 0 5px !important;
                justify-content: center !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > span,
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > .releaseScoreTrack {
                display: none !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > strong {
                font-size: 11px !important;
                line-height: 1 !important;
                letter-spacing: .025em !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
                right: 5px !important;
            }
            html body .tsArcade .eosCheckIn[data-step="1"] .eosCkChips > .eosCkChip {
                min-height: 36px !important;
                padding: 0 10px !important;
                font-size: 12px !important;
            }
            html body .tsArcade .eosCheckIn[data-step="1"] .eosCkFoot > .eosCkLink {
                font-size: 11px !important;
                min-height: 27px !important;
            }
            html body .tsArcade .releaseComposer {
                padding-inline: 6px !important;
                gap: 4px !important;
            }
            html body .tsArcade .releaseComposer .releaseInputWrap,
            html body .tsArcade .releaseComposer .releaseChoiceWrap {
                width: 100% !important;
                min-width: 0 !important;
            }
        }
        @media (max-width: 365px) {
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                left: 42px !important;
                right: 116px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
                width: 67px !important;
                right: 39px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
                width: 30px !important;
                height: 30px !important;
                right: 4px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseClose {
                left: 4px !important;
            }
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u106) {
            position: relative !important;
            min-height: 0 !important;
            overflow: hidden !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .engineProgressHud {
            box-sizing: border-box !important;
            position: absolute !important;
            left: 12px !important;
            right: 12px !important;
            top: 5px !important;
            bottom: auto !important;
            width: calc(100% - 24px) !important;
            min-width: 0 !important;
            height: 30px !important;
            min-height: 30px !important;
            padding: 0 !important;
            margin: 0 !important;
            display: grid !important;
            grid-template-columns: minmax(110px,1fr) auto !important;
            gap: 10px !important;
            align-items: center !important;
            z-index: 60 !important;
            overflow: hidden !important;
            background: transparent !important;
            pointer-events: none !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .engineProgressHud > .engineProgressTrack {
            min-width: 0 !important;
            width: 100% !important;
            max-width: none !important;
            height: 26px !important;
            margin: 0 !important;
            position: relative !important;
            inset: auto !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .engineProgressHud > .tsShiftRewardHud {
            width: max-content !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: 26px !important;
            min-height: 0 !important;
            margin: 0 !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            justify-content: flex-end !important;
            align-items: center !important;
            gap: 5px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .cinematicContentShell {
            box-sizing: border-box !important;
            position: absolute !important;
            top: 43px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: calc(100% - 43px) !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
        html body .tsArcade.stage-play .u106.tinySoundtrackV2Shell {
            box-sizing: border-box !important;
            position: relative !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            min-height: 0 !important;
            padding: 5px 12px 63px !important;
            margin: 0 !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
            scrollbar-width: thin !important;
            scroll-padding-bottom: 65px !important;
        }
        html body .tsArcade.stage-play .u106 .tsndGame {
            box-sizing: border-box !important;
            position: relative !important;
            display: block !important;
            flex: 0 0 auto !important;
            width: min(850px,100%) !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 auto !important;
            padding: 12px 14px 14px !important;
            overflow: visible !important;
        }
        html body .tsArcade.stage-play .u106 .tsndTop {
            position: relative !important;
            z-index: 1 !important;
            margin-bottom: 9px !important;
            min-width: 0 !important;
        }
        html body .tsArcade.stage-play .u106 .tsndGrid,
        html body .tsArcade.stage-play .u106 .tsndInstrument {
            position: relative !important;
            z-index: 1 !important;
        }
        html body .tsArcade.stage-play .cinematicContentShell:has(> .u106) > .globalPlayGuide {
            box-sizing: border-box !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            bottom: 7px !important;
            width: min(850px,calc(100% - 24px)) !important;
            max-width: none !important;
            z-index: 75 !important;
            margin: 0 !important;
            min-height: 36px !important;
        }
        @media (max-width: 760px) {
            html body .tsArcade.stage-play .engineProgressWrap:has(.u106) > .engineProgressHud {
                grid-template-columns: minmax(70px,1fr) auto !important;
                gap: 5px !important;
                left: 7px !important;
                right: 7px !important;
                width: calc(100% - 14px) !important;
            }
            html body .tsArcade.stage-play .engineProgressWrap:has(.u106) .tsShiftRewardPill.chain,
            html body .tsArcade.stage-play .engineProgressWrap:has(.u106) .tsShiftRewardPill.token {
                display: none !important;
            }
            html body .tsArcade.stage-play .u106.tinySoundtrackV2Shell {
                padding: 5px 7px 66px !important;
            }
            html body .tsArcade.stage-play .u106 .tsndGame {
                width: 100% !important;
                padding: 10px !important;
            }
            html body .tsArcade.stage-play .cinematicContentShell:has(> .u106) > .globalPlayGuide {
                width: calc(100% - 14px) !important;
            }
        }
        @media (max-width: 540px) {
            html body .tsArcade.stage-play .u106 .tsndTop {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 6px !important;
            }
            html body .tsArcade.stage-play .u106 .tsndTitle {
                flex: 1 1 150px !important;
                min-width: 0 !important;
            }
            html body .tsArcade.stage-play .u106 .tsndVibes {
                flex: 0 0 auto !important;
            }
            html body .tsArcade.stage-play .u106 .tsndVibes button {
                height: 30px !important;
                min-width: 58px !important;
                padding: 0 6px !important;
            }
            html body .tsArcade.stage-play .u106 .tsndGrid {
                grid-template-columns: repeat(2,minmax(0,1fr)) !important;
                gap: 7px !important;
            }
            html body .tsArcade.stage-play .u106 .tsndCard {
                height: 95px !important;
                min-height: 95px !important;
                grid-template-columns: 42px minmax(0,1fr) !important;
                padding: 6px !important;
            }
            html body .tsArcade.stage-play .u106 .tsndAvatar {
                width: 40px !important;
                height: 40px !important;
                min-width: 40px !important;
                min-height: 40px !important;
                max-width: 40px !important;
                max-height: 40px !important;
            }
            html body .tsArcade.stage-play .u106 .tsndInstrumentHead {
                flex-wrap: wrap !important;
                row-gap: 4px !important;
                line-height: 1.2 !important;
            }
            html body .tsArcade.stage-play .u106 .tsndKeys,
            html body .tsArcade.stage-play .u106 .tsndKey {
                height: 64px !important;
            }
        }
        html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
            left: 50% !important;
            right: auto !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: max-content !important;
            max-width: calc(100% - 450px) !important;
            min-width: 0 !important;
            height: 36px !important;
            padding: 0 10px !important;
            justify-content: center !important;
            text-align: center !important;
            overflow: hidden !important;
        }
        html body .tsArcade .releaseHeaderCenter .releaseConsoleTitle {
            justify-content: center !important;
            text-align: center !important;
            width: 100% !important;
        }
        html body .tsArcade .releaseHeaderCenter .releaseTitleMain {
            font-size: clamp(11px, 1.52vw, 18px) !important;
            letter-spacing: .01em !important;
            text-align: center !important;
        }
        html body .tsArcade .releaseHeaderCenter .releaseTitleBy,
        html body .tsArcade .releaseHeaderCenter .releaseTitleBrand {
            display: none !important;
        }
        @media (max-width: 950px) and (min-width: 641px) {
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                max-width: calc(100% - 235px) !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleMain {
                font-size: clamp(11px, 1.6vw, 16px) !important;
            }
        }
        @media (max-width: 640px) {
            html body .tsArcade .shell {
                grid-template-rows: 68px minmax(0,1fr) 64px !important;
            }
            html body .tsArcade .releaseConsoleHeader {
                height: 68px !important;
                min-height: 68px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                top: 21px !important;
                left: 50% !important;
                right: auto !important;
                width: calc(100% - 96px) !important;
                max-width: calc(100% - 96px) !important;
                height: 28px !important;
                padding: 0 2px !important;
                transform: translate(-50%, -50%) !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleMain {
                font-size: clamp(10px, 3vw, 13px) !important;
                letter-spacing: -.02em !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
                position: absolute !important;
                top: 40px !important;
                left: 50% !important;
                right: auto !important;
                width: 116px !important;
                max-width: 116px !important;
                height: 23px !important;
                padding: 0 7px !important;
                transform: translateX(-50%) !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar > strong {
                font-size: 10px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseClose,
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
                top: 20px !important;
                transform: translateY(-50%) !important;
            }
        }
        html body .tsArcade .releaseStage > .eosSupportPill,
        html body .tsArcade .releaseStage .eosSupportPill {
            position: absolute !important;
            left: 5px !important;
            right: auto !important;
            top: 5px !important;
            bottom: auto !important;
            z-index: 260 !important;
            width: 44px !important;
            height: 44px !important;
            max-width: 44px !important;
            padding: 0 !important;
            transform: none !important;
        }
        html body .tsArcade .releaseStage .eosSupportPill button {
            box-sizing: border-box !important;
            display: flex !important;
            width: 44px !important;
            min-width: 44px !important;
            max-width: 44px !important;
            height: 44px !important;
            min-height: 44px !important;
            padding: 0 !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 0 !important;
            font-size: 0 !important;
            line-height: 0 !important;
            border-radius: 15px !important;
            box-shadow: 0 0 12px rgba(255,195,122,.20) !important;
        }
        html body .tsArcade .releaseStage .eosSupportPill button span {
            display: block !important;
            font-size: 18px !important;
            line-height: 1 !important;
            margin: 0 !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u102) {
            position: relative !important;
            min-height: 0 !important;
            overflow: hidden !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .engineProgressHud {
            box-sizing: border-box !important;
            position: absolute !important;
            top: 5px !important;
            left: 58px !important;
            right: 9px !important;
            bottom: auto !important;
            width: calc(100% - 67px) !important;
            min-width: 0 !important;
            height: 30px !important;
            min-height: 30px !important;
            margin: 0 !important;
            padding: 0 !important;
            display: grid !important;
            grid-template-columns: minmax(80px,1fr) auto !important;
            align-items: center !important;
            gap: 8px !important;
            z-index: 60 !important;
            background: transparent !important;
            overflow: hidden !important;
            pointer-events: none !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .engineProgressHud > .engineProgressTrack {
            box-sizing: border-box !important;
            position: relative !important;
            inset: auto !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            height: 26px !important;
            margin: 0 !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .engineProgressHud > .tsShiftRewardHud {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex-wrap: nowrap !important;
            box-sizing: border-box !important;
            width: max-content !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: 26px !important;
            min-height: 0 !important;
            margin: 0 !important;
            gap: 4px !important;
            overflow: hidden !important;
        }
        html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .cinematicContentShell {
            box-sizing: border-box !important;
            position: absolute !important;
            top: 43px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: calc(100% - 43px) !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
        }
        html body .tsArcade.stage-play .u102 {
            box-sizing: border-box !important;
            position: relative !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 5px 12px 58px !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
            scroll-padding-bottom: 62px !important;
            scrollbar-width: thin !important;
        }
        html body .tsArcade.stage-play .u102 .ftGame {
            box-sizing: border-box !important;
            position: relative !important;
            display: flex !important;
            flex: 0 0 auto !important;
            flex-direction: column !important;
            width: min(920px,100%) !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 auto !important;
            padding: 8px 12px 11px !important;
            overflow: visible !important;
            border-radius: 19px !important;
        }
        html body .tsArcade.stage-play .u102 .ftHud {
            flex: 0 0 auto !important;
            min-height: 28px !important;
            height: auto !important;
            margin: 0 0 7px !important;
            gap: 8px !important;
        }
        html body .tsArcade.stage-play .u102 .ftRows {
            display: grid !important;
            grid-template-columns: minmax(0,1fr) !important;
            grid-auto-rows: 82px !important;
            flex: 0 0 auto !important;
            min-height: 0 !important;
            gap: 7px !important;
            overflow: visible !important;
        }
        html body .tsArcade.stage-play .u102 .ftRow {
            box-sizing: border-box !important;
            height: 82px !important;
            min-height: 82px !important;
            max-height: 82px !important;
            padding: 0 47px 11px !important;
            overflow: visible !important;
            border-radius: 15px !important;
        }
        html body .tsArcade.stage-play .u102 .ftTrap {
            height: 47px !important;
        }
        html body .tsArcade.stage-play .u102 .ftTube {
            height: 40px !important;
        }
        html body .tsArcade.stage-play .u102 .ftThoughtPill {
            height: 43px !important;
            min-width: 0 !important;
            padding-left: 85px !important;
        }
        html body .tsArcade.stage-play .u102 .ftThumb {
            width: 68px !important;
            height: 68px !important;
            min-width: 68px !important;
            min-height: 68px !important;
            max-width: 68px !important;
            max-height: 68px !important;
            flex-basis: 68px !important;
        }
        html body .tsArcade.stage-play .u102 .ftArrow {
            width: 39px !important;
            height: 39px !important;
        }
        html body .tsArcade.stage-play .cinematicContentShell:has(> .u102) > .globalPlayGuide {
            box-sizing: border-box !important;
            position: absolute !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            bottom: 6px !important;
            width: min(920px,calc(100% - 24px)) !important;
            max-width: none !important;
            min-height: 36px !important;
            margin: 0 !important;
            z-index: 75 !important;
        }
        @media (max-width: 760px) {
            html body .tsArcade.stage-play .engineProgressWrap:has(.u102) > .engineProgressHud {
                left: 55px !important;
                right: 6px !important;
                width: calc(100% - 61px) !important;
                grid-template-columns: minmax(55px,1fr) auto !important;
                gap: 4px !important;
            }
            html body .tsArcade.stage-play .engineProgressWrap:has(.u102) .tsShiftRewardPill.token,
            html body .tsArcade.stage-play .engineProgressWrap:has(.u102) .tsShiftRewardPill.chain {
                display: none !important;
            }
            html body .tsArcade.stage-play .u102 {
                padding: 4px 5px 64px !important;
            }
            html body .tsArcade.stage-play .u102 .ftGame {
                width: 100% !important;
                padding: 8px 5px 10px !important;
            }
            html body .tsArcade.stage-play .u102 .ftHud {
                grid-template-columns: 48px minmax(0,1fr) !important;
                gap: 5px !important;
            }
            html body .tsArcade.stage-play .u102 .ftRows {
                grid-auto-rows: 82px !important;
                gap: 6px !important;
            }
            html body .tsArcade.stage-play .u102 .ftRow {
                height: 82px !important;
                min-height: 82px !important;
                max-height: 82px !important;
                padding: 0 30px 10px !important;
            }
            html body .tsArcade.stage-play .u102 .ftTrap {
                width: calc(100% - 24px) !important;
            }
            html body .tsArcade.stage-play .u102 .ftThoughtPill {
                height: 40px !important;
                width: min(72%,450px) !important;
                padding: 0 4px 0 57px !important;
            }
            html body .tsArcade.stage-play .u102 .ftThumb {
                width: 52px !important;
                height: 52px !important;
                min-width: 52px !important;
                min-height: 52px !important;
                max-width: 52px !important;
                max-height: 52px !important;
                flex-basis: 52px !important;
            }
            html body .tsArcade.stage-play .u102 .ftArrow {
                width: 30px !important;
                height: 36px !important;
            }
            html body .tsArcade.stage-play .cinematicContentShell:has(> .u102) > .globalPlayGuide {
                width: calc(100% - 12px) !important;
            }
        }
        @media (max-height: 680px) and (min-width: 761px) {
            html body .tsArcade.stage-play .u102 .ftRows {
                grid-auto-rows: 75px !important;
                gap: 5px !important;
            }
            html body .tsArcade.stage-play .u102 .ftRow {
                height: 75px !important;
                min-height: 75px !important;
                max-height: 75px !important;
            }
            html body .tsArcade.stage-play .u102 .ftThumb {
                width: 58px !important;
                height: 58px !important;
                min-width: 58px !important;
                min-height: 58px !important;
                max-width: 58px !important;
                max-height: 58px !important;
                flex-basis: 58px !important;
            }
        }
        html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(-n+4) {
            top: calc(25% - 42px) !important;
        }
        html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(5),
        html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(6) {
            top: calc(67% - 42px) !important;
        }
        html body .tsArcade.stage-play .rainOutScene .rainCloudUnit.pulled {
            pointer-events: none !important;
        }
        html body .tsArcade.stage-play .rainOutScene.released > .rainCloudUnit {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
        }
        html body .tsArcade.stage-play .rainOutScene .rainClearSky {
            border-radius: 16px;
            animation: tsClearSkyArrives .72s ease-out both;
        }
        @keyframes tsClearSkyArrives {
            from { opacity: 0; filter: brightness(.8); }
            to { opacity: 1; filter: brightness(1); }
        }
        @media (max-width: 700px) {
            html body .tsArcade.stage-play .u110 {
                overflow-x: hidden !important;
                overflow-y: auto !important;
                overscroll-behavior: contain !important;
            }
            html body .tsArcade.stage-play .rainOutScene {
                min-height: 835px !important;
                height: 835px !important;
                overflow: visible !important;
            }
            html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(odd) {
                left: calc(25% - 68px) !important;
            }
            html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(even) {
                left: calc(75% - 68px) !important;
            }
            html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(1),
            html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(2) {
                top: 75px !important;
            }
            html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(3),
            html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(4) {
                top: 330px !important;
            }
            html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(5),
            html body .tsArcade.stage-play .rainOutScene:not(.released) > .rainCloudUnit:nth-child(6) {
                top: 585px !important;
            }
        }
        html body .tsArcade .releaseHeaderCenter .releaseTitleBy,
        html body .tsArcade .releaseHeaderCenter .releaseTitleBrand {
            display: inline !important;
            visibility: visible !important;
            opacity: 1 !important;
            flex: 0 0 auto !important;
            white-space: nowrap !important;
        }
        html body .tsArcade .releaseHeaderCenter .releaseTitleBy {
            letter-spacing: 0 !important;
            color: #b6efff !important;
            font-size: clamp(9px, .9vw, 11px) !important;
        }
        html body .tsArcade .releaseHeaderCenter .releaseTitleBrand {
            font-size: clamp(10px, 1.05vw, 13px) !important;
            letter-spacing: .015em !important;
            text-transform: none !important;
        }
        @media (max-width: 640px) {
            html body .tsArcade .releaseHeaderCenter .releaseConsoleTitle {
                gap: 3px !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleMain {
                font-size: clamp(9px, 2.5vw, 11px) !important;
                letter-spacing: -.03em !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleBy {
                font-size: 9px !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleBrand {
                font-size: 9px !important;
                letter-spacing: -.015em !important;
            }
        }
        html body .tsArcade .shell {
            position: relative !important;
        }
        html body .tsArcade .releaseConsoleHeader > .tsReleaseSettingsButton,
        html body .tsArcade .releaseConsoleHeader > .tsReleaseCloseButton {
            box-sizing: border-box !important;
            position: absolute !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 34px !important;
            height: 34px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            background: rgba(6,22,37,.92) !important;
            color: #d8f7ff !important;
            border: 1px solid rgba(105,215,255,.3) !important;
            border-radius: 10px !important;
            cursor: pointer !important;
            z-index: 18 !important;
            box-shadow: inset 0 0 12px rgba(0,210,255,.06), 0 0 10px rgba(0,210,255,.08) !important;
            font-size: 26px !important;
            line-height: 1 !important;
        }
        html body .tsArcade .releaseConsoleHeader > .tsReleaseSettingsButton {
            right: 46px !important;
        }
        html body .tsArcade .releaseConsoleHeader > .tsReleaseCloseButton {
            right: 6px !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
            right: 86px !important;
            width: 34px !important;
            height: 34px !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
            right: 132px !important;
            max-width: 147px !important;
        }
        html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
            max-width: calc(100% - 475px) !important;
        }
        html body .tsArcade .tsReleaseSettingsPanel {
            position: absolute !important;
            top: 53px !important;
            right: 8px !important;
            z-index: 9000 !important;
            width: min(300px, calc(100% - 16px)) !important;
            max-height: calc(100% - 71px) !important;
            box-sizing: border-box !important;
            overflow: auto !important;
            overscroll-behavior: contain !important;
            padding: 14px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
            border: 1px solid rgba(97,205,247,.4) !important;
            border-radius: 17px !important;
            background: linear-gradient(160deg,rgba(9,23,42,.98),rgba(6,13,30,.99)) !important;
            color: #e7faff !important;
            box-shadow: 0 16px 48px rgba(0,0,0,.6), 0 0 30px rgba(0,206,255,.12) !important;
            font-family: Inter,system-ui,sans-serif !important;
            pointer-events: auto !important;
        }
        html body .tsArcade .tsReleaseSettingsHead {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-bottom: 5px !important;
            font: 900 13px/1.2 Inter,system-ui,sans-serif !important;
            letter-spacing: .12em !important;
        }
        html body .tsArcade .tsReleaseSettingsDismiss {
            background: transparent !important;
            border: 0 !important;
            color: #c8f2ff !important;
            font-size: 23px !important;
            cursor: pointer !important;
        }
        html body .tsArcade .tsReleaseSettingsRow {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            min-height: 42px !important;
            padding: 3px 4px !important;
            border-bottom: 1px solid rgba(168,220,250,.10) !important;
            font-size: 13px !important;
            font-weight: 650 !important;
            cursor: pointer !important;
        }
        html body .tsArcade .tsReleaseSettingsRow input {
            width: 19px !important;
            height: 19px !important;
            accent-color: #48c8ff !important;
            cursor: pointer !important;
        }
        html body .tsArcade .tsReleaseSettingsVolume {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            margin: 10px 4px 14px !important;
            font-size: 13px !important;
            font-weight: 650 !important;
        }
        html body .tsArcade .tsReleaseSettingsVolume input {
            width: 100% !important;
            accent-color: #58d9ff !important;
        }
        html body .tsArcade .tsReleaseSettingsDone {
            cursor: pointer !important;
            min-height: 38px !important;
            width: 100% !important;
            border: 1px solid rgba(99,218,255,.42) !important;
            border-radius: 12px !important;
            background: linear-gradient(120deg,#053e62,#124e78) !important;
            color: white !important;
            font: 800 13px Inter,system-ui,sans-serif !important;
        }
        @media (max-width: 950px) and (min-width: 641px) {
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                max-width: calc(100% - 295px) !important;
            }
        }
        @media (max-width: 640px) {
            html body .tsArcade .releaseConsoleHeader > .tsReleaseSettingsButton,
            html body .tsArcade .releaseConsoleHeader > .tsReleaseCloseButton,
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
                top: 20px !important;
                transform: translateY(-50%) !important;
                width: 29px !important;
                height: 29px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .tsReleaseSettingsButton {
                right: 40px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .tsReleaseCloseButton {
                right: 5px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderSound {
                right: 75px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                left: 5px !important;
                right: auto !important;
                transform: translateY(-50%) !important;
                width: calc(100% - 123px) !important;
                max-width: calc(100% - 123px) !important;
                padding: 0 2px !important;
                text-align: left !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseConsoleTitle {
                justify-content: flex-start !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleMain {
                font-size: clamp(9px, 2.45vw, 12px) !important;
            }
            html body .tsArcade .releaseHeaderCenter .releaseTitleBy,
            html body .tsArcade .releaseHeaderCenter .releaseTitleBrand {
                font-size: 8px !important;
            }
            html body .tsArcade .releaseConsoleHeader > .releaseScoreBar {
                top: 40px !important;
                left: 50% !important;
                right: auto !important;
                max-width: 116px !important;
                transform: translateX(-50%) !important;
            }
            html body .tsArcade .tsReleaseSettingsPanel {
                top: 72px !important;
                max-height: calc(100% - 89px) !important;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            html body .tsArcade.stage-input .releaseComposer .releaseInputWrap,
            html body .tsArcade .eosCheckIn .eosCkSlot button.eosOrb .eosOrbBall {
                animation: none !important;
            }
        }
    `}</style>
    )
}

type RitualVibe = "Jolly" | "Cheeky" | "Unfiltered"
type RitualIntensity = "Gentle" | "Balanced" | "Full blast"
type RitualTheme = "Dark" | "Bright"
type RitualSettings = {
    vibe: RitualVibe
    intensity: RitualIntensity
    theme: RitualTheme
}

const RITUAL_SETTINGS_KEY = "thinkstill_ritual_settings_v1"
const DEFAULT_RITUAL_SETTINGS: RitualSettings = {
    vibe: "Jolly",
    intensity: "Gentle",
    theme: "Dark",
}

function readRitualSettings(): RitualSettings {
    try {
        if (typeof window === "undefined") return DEFAULT_RITUAL_SETTINGS
        const raw = window.localStorage.getItem(RITUAL_SETTINGS_KEY)
        if (!raw) return DEFAULT_RITUAL_SETTINGS
        const previous = JSON.parse(raw)
        return {
            vibe: (["Jolly", "Cheeky", "Unfiltered"] as string[]).includes(
                previous.vibe
            )
                ? previous.vibe
                : "Jolly",
            intensity: (
                ["Gentle", "Balanced", "Full blast"] as string[]
            ).includes(previous.intensity)
                ? previous.intensity
                : "Gentle",
            theme: (["Dark", "Bright"] as string[]).includes(previous.theme)
                ? previous.theme
                : "Dark",
        }
    } catch (_) {
        return DEFAULT_RITUAL_SETTINGS
    }
}

function ScreenshotSettingsIcon({
    icon,
}: {
    icon: "vibe" | "intensity" | "theme" | "support" | "premium"
}) {
    const symbol =
        icon === "vibe"
            ? "☻"
            : icon === "intensity"
              ? "ϟ"
              : icon === "theme"
                ? "◐"
                : icon === "premium"
                  ? "✦"
                  : "?"
    return (
        <span className={`tsSsIcon tsSsIcon--${icon}`} aria-hidden="true">
            {symbol}
        </span>
    )
}

function ScreenshotSettingsPanel({
    settings,
    onSettingsChange,
    onDone,
    onSupportOpen,
    onPremiumOpen,
    premiumMember,
}: {
    settings: RitualSettings
    onSettingsChange: (next: RitualSettings) => void
    onDone: () => void
    onSupportOpen: () => void
    onPremiumOpen?: () => void
    premiumMember?: boolean
}) {
    const panelRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        panelRef.current?.focus()
    }, [])

    function cycleSetting<K extends keyof RitualSettings>(
        field: K,
        values: readonly RitualSettings[K][]
    ) {
        const index = values.indexOf(settings[field])
        const next = values[(index + 1) % values.length]
        onSettingsChange({ ...settings, [field]: next })
    }

    return (
        <div
            className="tsSsPanel"
            role="dialog"
            aria-label="ThinkStill ritual settings"
            aria-modal="false"
            tabIndex={-1}
            ref={panelRef}
        >
            <div className="tsSsStars" aria-hidden="true">
                ✦
            </div>
            <div className="tsSsHeader">SETTINGS</div>
            <div className="tsSsSubheader">Tune your universe</div>

            <div className="tsSsRows">
                <button
                    className="tsSsRow"
                    type="button"
                    onClick={() =>
                        cycleSetting("vibe", ["Jolly", "Cheeky", "Unfiltered"])
                    }
                    aria-label={`Vibe: ${settings.vibe}. Tap to change to ${settings.vibe === "Jolly" ? "Cheeky" : settings.vibe === "Cheeky" ? "Unfiltered" : "Jolly"}`}
                >
                    <ScreenshotSettingsIcon icon="vibe" />
                    <span className="tsSsRowLabel">Vibe</span>
                    <span
                        className="tsSsRowValue"
                        key={`vibe-${settings.vibe}`}
                    >
                        {settings.vibe}
                        <span className="tsSsCycle" aria-hidden="true">
                            ↻
                        </span>
                    </span>
                </button>

                <button
                    className="tsSsRow"
                    type="button"
                    onClick={() =>
                        cycleSetting("intensity", [
                            "Gentle",
                            "Balanced",
                            "Full blast",
                        ])
                    }
                    aria-label={`Intensity: ${settings.intensity}. Tap to change to ${settings.intensity === "Gentle" ? "Balanced" : settings.intensity === "Balanced" ? "Full blast" : "Gentle"}`}
                >
                    <ScreenshotSettingsIcon icon="intensity" />
                    <span className="tsSsRowLabel">Intensity</span>
                    <span
                        className="tsSsRowValue"
                        key={`intensity-${settings.intensity}`}
                    >
                        {settings.intensity}
                        <span className="tsSsCycle" aria-hidden="true">
                            ↻
                        </span>
                    </span>
                </button>

                <button
                    className="tsSsRow"
                    type="button"
                    onClick={() => cycleSetting("theme", ["Dark", "Bright"])}
                    aria-label={`Theme: ${settings.theme}. Tap to change to ${settings.theme === "Dark" ? "Bright" : "Dark"}`}
                >
                    <ScreenshotSettingsIcon icon="theme" />
                    <span className="tsSsRowLabel">Theme</span>
                    <span
                        className="tsSsRowValue"
                        key={`theme-${settings.theme}`}
                    >
                        {settings.theme}
                        <span className="tsSsCycle" aria-hidden="true">
                            ↻
                        </span>
                    </span>
                </button>

                <button
                    className="tsSsRow"
                    type="button"
                    onClick={onSupportOpen}
                    aria-label="Open support contacts"
                >
                    <ScreenshotSettingsIcon icon="support" />
                    <span className="tsSsRowLabel">Support</span>
                    <span className="tsSsRowValue">Open ›</span>
                </button>

                {onPremiumOpen && (
                    <button
                        className="tsSsRow tsSsRow--premium"
                        type="button"
                        onClick={onPremiumOpen}
                        aria-label={
                            premiumMember
                                ? "View your ThinkStill Premium season"
                                : "See ThinkStill Premium"
                        }
                    >
                        <ScreenshotSettingsIcon icon="premium" />
                        <span className="tsSsRowLabel">Premium</span>
                        <span className="tsSsRowValue">
                            {premiumMember ? "Your season ›" : "Explore ›"}
                        </span>
                    </button>
                )}
            </div>

            <div className="tsSsTagline">Make it feel like you ✦</div>
            <button className="tsSsDone" type="button" onClick={onDone}>
                All set <span aria-hidden="true">✓</span>
            </button>
        </div>
    )
}

const RELEASE_SUPPORT_CONTACTS = [
    {
        name: "Emergency",
        detail: "If you or someone else is in danger right now",
        phone: "000",
    },
    {
        name: "Lifeline",
        detail: "24/7 crisis support. Text 0477 13 11 14",
        phone: "13 11 14",
    },
    {
        name: "Suicide Call Back Service",
        detail: "24/7 phone and online counselling",
        phone: "1300 659 467",
    },
    {
        name: "Beyond Blue",
        detail: "Talk to a counsellor",
        phone: "1300 22 4636",
    },
    {
        name: "1800RESPECT",
        detail: "Family, domestic and sexual violence",
        phone: "1800 737 732",
    },
    { name: "Kids Helpline", detail: "Ages 5 to 25", phone: "1800 55 1800" },
] as const

async function copyReleaseSupportNumber(value: string): Promise<boolean> {
    try {
        if (
            typeof navigator !== "undefined" &&
            navigator.clipboard?.writeText
        ) {
            await navigator.clipboard.writeText(value)
            return true
        }
    } catch (_) {
        /* Clipboard API may be unavailable within a Framer iframe. */
    }
    try {
        const input = document.createElement("textarea")
        input.value = value
        input.readOnly = true
        input.style.position = "fixed"
        input.style.opacity = "0"
        document.body.appendChild(input)
        input.select()
        const copied = document.execCommand("copy")
        input.remove()
        return copied
    } catch (_) {
        return false
    }
}

function ReleaseSupportModal({ onClose }: { onClose: () => void }) {
    const [copyStatus, setCopyStatus] = React.useState<{
        index: number
        ok: boolean
    } | null>(null)
    const backRef = React.useRef<HTMLButtonElement>(null)
    const modalRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        backRef.current?.focus()
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation()
                onClose()
            }
            if (event.key !== "Tab" || !modalRef.current) return
            const elements = Array.from(
                modalRef.current.querySelectorAll<HTMLButtonElement>(
                    "button:not([disabled])"
                )
            )
            if (!elements.length) return
            const first = elements[0],
                last = elements[elements.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        document.addEventListener("keydown", onKeyDown, true)
        return () => document.removeEventListener("keydown", onKeyDown, true)
    }, [onClose])

    return (
        <div className="tsReleaseSupportOverlay">
            <div
                className="tsReleaseSupportModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tsReleaseSupportTitle"
                aria-describedby="tsReleaseSupportIntro"
                ref={modalRef}
            >
                <h2 id="tsReleaseSupportTitle">Let’s pause the ritual.</h2>
                <p id="tsReleaseSupportIntro">
                    What you wrote sounds heavier than a ritual should carry.
                    You deserve to talk to a real person about it, and you can
                    reach someone right now.
                </p>
                <div className="tsReleaseSupportContacts">
                    {RELEASE_SUPPORT_CONTACTS.map((contact, index) => (
                        <div
                            className="tsReleaseSupportContact"
                            key={contact.name}
                        >
                            <div className="tsReleaseSupportWho">
                                <strong>{contact.name}</strong>
                                <span>{contact.detail}</span>
                            </div>
                            <strong className="tsReleaseSupportPhone">
                                {contact.phone}
                            </strong>
                            <button
                                className="tsReleaseSupportCopy"
                                type="button"
                                aria-label={`Copy ${contact.name} phone number ${contact.phone}`}
                                onClick={async () => {
                                    const ok = await copyReleaseSupportNumber(
                                        contact.phone
                                    )
                                    setCopyStatus({ index, ok })
                                }}
                            >
                                {copyStatus?.index === index
                                    ? copyStatus.ok
                                        ? "Copied ✓"
                                        : "Try again"
                                    : "Copy"}
                            </button>
                        </div>
                    ))}
                </div>
                <p className="tsReleaseSupportOutside">
                    Outside Australia? Call your local emergency number.
                </p>
                <div className="tsReleaseSupportBottom">
                    <button
                        type="button"
                        className="tsReleaseSupportBack"
                        ref={backRef}
                        onClick={onClose}
                    >
                        Back to the console
                    </button>
                </div>
            </div>
        </div>
    )
}

function ScreenshotSettingsStyles() {
    return (
        <style>{`
        html body .tsReleaseHost .tsArcade .releaseConsoleHeader > .tsReleaseNativeNav {
            position: absolute !important;
            left: 8px !important;
            top: 7px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            z-index: 65 !important;
            pointer-events: auto !important;
        }
        html body .tsReleaseHost .tsArcade .tsReleaseNativeArrow {
            appearance:none !important;
            display:grid !important;
            place-items:center !important;
            flex:0 0 35px !important;
            width:35px !important;
            height:35px !important;
            margin:0 !important;
            padding:0 0 4px !important;
            background:linear-gradient(150deg,rgba(18,55,75,.98),rgba(9,30,47,.98)) !important;
            border:1px solid rgba(104,199,239,.40) !important;
            border-radius:11px !important;
            color:#e7faff !important;
            font:800 31px/1 Inter,system-ui,sans-serif !important;
            cursor:pointer !important;
            touch-action:manipulation !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.12) !important;
            pointer-events:auto !important;
        }
        html body .tsReleaseHost .tsArcade .tsReleaseNativeArrow:not(:disabled):hover {
            background:linear-gradient(150deg,#205c7a,#163a58) !important;
            border-color:#93dfff !important;
        }
        html body .tsReleaseHost .tsArcade .tsReleaseNativeArrow:focus-visible {
            outline:2px solid #8cf4ff !important;
            outline-offset:2px !important;
        }
        html body .tsReleaseHost .tsArcade .tsReleaseNativeArrow:disabled {
            opacity:.45 !important;
            cursor:default !important;
        }
        @media (min-width:641px) {
            html body .tsReleaseHost .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                max-width:calc(100% - 470px) !important;
            }
        }
        @media (max-width:640px) {
            html body .tsReleaseHost .tsArcade .releaseConsoleHeader > .tsReleaseNativeNav {
                top:5px !important;
                left:5px !important;
                gap:5px !important;
            }
            html body .tsReleaseHost .tsArcade .tsReleaseNativeArrow {
                width:32px !important;
                height:32px !important;
                flex-basis:32px !important;
                border-radius:9px !important;
                font-size:28px !important;
            }
            html body .tsReleaseHost .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                left:84px !important;
                right:121px !important;
                top:20px !important;
                width:auto !important;
                max-width:none !important;
                padding:0 1px !important;
                transform:translateY(-50%) !important;
                text-align:center !important;
            }
            html body .tsReleaseHost .tsArcade .releaseHeaderCenter .releaseConsoleTitle {
                justify-content:center !important;
                gap:2px !important;
            }
            html body .tsReleaseHost .tsArcade .releaseHeaderCenter .releaseTitleMain {
                font-size:clamp(8px,2.2vw,11px) !important;
            }
            html body .tsReleaseHost .tsArcade .releaseHeaderCenter .releaseTitleBy,
            html body .tsReleaseHost .tsArcade .releaseHeaderCenter .releaseTitleBrand {
                font-size:8px !important;
            }
        }
        @media(max-width:365px) {
            html body .tsReleaseHost .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
                left:80px !important;
                right:118px !important;
            }
        }
        .tsReleaseHost .tsArcade .tsReleaseSettingsPanel { display: none !important; }
        .tsReleaseHost { width:100%; height:100%; position:relative; isolation:isolate; }
        .tsReleaseHost > .tsArcade { width:100%; height:100%; }

        .tsReleaseHost .tsSsPanel {
            position:absolute; z-index:100000; top:56px; right:8px;
            box-sizing:border-box;
            width:min(270px,calc(100% - 16px));
            max-height:calc(100% - 73px);
            overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;
            padding:17px 15px 15px; border-radius:22px;
            border:1px solid rgba(100,221,255,.44);
            background:
                radial-gradient(ellipse at 84% 0%,rgba(127,62,205,.39),transparent 60%),
                radial-gradient(ellipse at 1% 94%,rgba(0,200,222,.17),transparent 49%),
                linear-gradient(155deg,rgba(21,21,63,.99),rgba(7,17,43,.99) 85%);
            box-shadow:0 20px 47px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.13),
                       0 0 22px rgba(52,194,238,.11);
            color:#f0f4ff; font-family:Inter,system-ui,-apple-system,sans-serif;
            text-align:left; outline:none;
            animation:tsSsEnter .24s cubic-bezier(.18,.82,.2,1) both;
            scrollbar-width:thin;scrollbar-color:rgba(106,177,220,.38) transparent;
        }
        .tsReleaseHost .tsSsPanel *, .tsReleaseHost .tsSsPanel *::before,
        .tsReleaseHost .tsSsPanel *::after {box-sizing:border-box;}
        @keyframes tsSsEnter {from{opacity:0;transform:translateY(-7px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        .tsReleaseHost .tsSsHeader{font-size:12px;font-weight:950;letter-spacing:1.2px;line-height:16px;padding:0 1px;}
        .tsReleaseHost .tsSsSubheader{margin:5px 0 12px 1px;font-size:10px;font-weight:750;color:#b7c6e9;}
        .tsReleaseHost .tsSsStars{position:absolute;right:18px;top:11px;font-size:20px;color:#5d7fc8;text-shadow:0 0 14px rgba(98,229,250,.6);pointer-events:none;}
        .tsReleaseHost .tsSsRows{display:flex;flex-direction:column;gap:9px;}
        .tsReleaseHost .tsSsRow{
            appearance:none;-webkit-appearance:none;position:relative;
            width:100%;min-height:44px;display:flex;align-items:center;gap:8px;
            border-radius:14px; border:1px solid rgba(166,111,212,.62);
            background:rgba(34,37,82,.86); color:#f1f4ff;
            font:850 12px/1.2 Inter,system-ui,sans-serif;text-align:left;
            padding:6px 12px 6px 10px;cursor:pointer;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 0 8px rgba(59,106,225,.04);
            transition:border-color .2s,transform .17s,background .2s,box-shadow .2s;
        }
        .tsReleaseHost .tsSsRow:nth-of-type(2){border-color:rgba(221,117,173,.56);}
        .tsReleaseHost .tsSsRow:nth-of-type(3){border-color:rgba(99,144,216,.6);}
        .tsReleaseHost .tsSsRow:nth-of-type(4){border-color:rgba(87,176,220,.6);}
        .tsReleaseHost .tsSsRow:hover{transform:translateY(-1px);background:rgba(49,48,104,.97);border-color:#91ddff;box-shadow:0 0 15px rgba(91,185,255,.13);}
        .tsReleaseHost .tsSsRow:focus-visible,
        .tsReleaseHost .tsSsDone:focus-visible{outline:2px solid #86eaff;outline-offset:2px;}
        .tsReleaseHost .tsSsRowLabel{flex:1;min-width:0;white-space:nowrap;}
        .tsReleaseHost .tsSsRowValue{font-size:11px;font-weight:850;color:#e6f6ff;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;}
        .tsReleaseHost .tsSsIcon{
            width:29px;height:29px;flex:0 0 29px;border-radius:11px;
            display:grid;place-items:center;font-size:18px;line-height:1;font-weight:950;
            text-shadow:0 0 8px currentColor;
        }
        .tsReleaseHost .tsSsIcon--vibe{color:#ff81d7;background:radial-gradient(circle at 35% 30%,#70417a,#4a335f);}
        .tsReleaseHost .tsSsIcon--intensity{color:#ffab53;background:radial-gradient(circle at 35% 30%,#64527d,#31365a);}
        .tsReleaseHost .tsSsIcon--theme{color:#a3c3ff;background:radial-gradient(circle at 35% 30%,#475b98,#263d74);}
        .tsReleaseHost .tsSsIcon--support{color:#85f3e9;background:radial-gradient(circle at 35% 30%,#326989,#22466e);}
        .tsReleaseHost .tsSsCycle { display:inline-block;margin-left:5px;opacity:.65;color:#a7eafe;font-size:12px;font-weight:850; }
        .tsReleaseHost .tsSsRowValue { animation:tsSsValueFlip .2s ease-out both; }
        @keyframes tsSsValueFlip { from{ opacity:.35;transform:translateY(3px); } to{ opacity:1;transform:translateY(0); } }
        .tsReleaseHost .tsSsTagline{margin:12px 0 10px;text-align:center;font-weight:850;font-size:10px;color:#b5dded;}
        .tsReleaseHost .tsSsDone{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;min-height:43px;padding:0 12px;border:0;border-radius:12px;cursor:pointer;color:#06243b;font:950 13px Inter,system-ui,sans-serif;background:linear-gradient(100deg,#2ed2de,#aac4ff);box-shadow:0 5px 21px rgba(0,225,249,.3),inset 0 1px 0 rgba(255,255,255,.28);transition:transform .18s,filter .18s;}
        .tsReleaseHost .tsSsDone:hover{transform:translateY(-1px);filter:brightness(1.08);}
        .tsReleaseHost[data-ts-theme="Bright"] .tsSsPanel{background:radial-gradient(ellipse at 83% 0%,rgba(168,117,240,.23),transparent 60%),linear-gradient(140deg,rgba(45,76,135,.99),rgba(11,40,89,.99));}
        .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .releaseConsoleHeader{background:linear-gradient(90deg,rgba(21,79,117,.96),rgba(68,74,135,.96)) !important;}
        .tsReleaseHost[data-ts-vibe="Cheeky"] .tsSsDone{background:linear-gradient(100deg,#ffa6d5,#afa0ff);}
        .tsReleaseHost[data-ts-vibe="Unfiltered"] .tsSsDone{background:linear-gradient(100deg,#ffb77a,#ff7cac);}
        .tsReleaseHost[data-ts-intensity="Full blast"] .tsSsPanel{box-shadow:0 20px 47px rgba(0,0,0,.6),0 0 27px rgba(123,69,240,.28),0 0 23px rgba(21,214,255,.18);}

        .tsReleaseHost .tsReleaseSupportOverlay {
            position:absolute; inset:0; z-index:2147483000;
            display:flex; align-items:center; justify-content:center;
            padding:16px; box-sizing:border-box;
            background:rgba(2,5,19,.82);
            font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        }
        .tsReleaseHost .tsReleaseSupportModal {
            box-sizing:border-box; width:min(480px,100%); max-height:100%; overflow-y:auto;
            padding:23px 20px 24px; border-radius:20px;
            background:#fdfcfb; color:#202535;
            box-shadow:0 25px 90px rgba(0,0,0,.4);
            overscroll-behavior:contain;
        }
        .tsReleaseHost .tsReleaseSupportModal * { box-sizing:border-box; }
        .tsReleaseHost .tsReleaseSupportModal h2 {
            font:750 22px/1.25 Inter,system-ui,sans-serif;
            color:#1b2030; margin:0 0 7px; letter-spacing:-.025em;
        }
        .tsReleaseHost .tsReleaseSupportModal #tsReleaseSupportIntro {
            margin:0 0 14px; font:400 14px/1.62 Inter,system-ui,sans-serif; color:#323a4a;
        }
        .tsReleaseHost .tsReleaseSupportContacts { display:flex;flex-direction:column;gap:8px; }
        .tsReleaseHost .tsReleaseSupportContact {
            display:grid;grid-template-columns:minmax(0,1fr) auto auto;
            align-items:center;gap:8px;min-height:61px;padding:10px 11px;
            border-radius:13px;background:#edf0f6;
        }
        .tsReleaseHost .tsReleaseSupportWho { min-width:0;display:flex;flex-direction:column;gap:3px; }
        .tsReleaseHost .tsReleaseSupportWho strong {
            font:750 14px/1.25 Inter,system-ui,sans-serif;color:#202636;
        }
        .tsReleaseHost .tsReleaseSupportWho span {
            font:400 12px/1.35 Inter,system-ui,sans-serif;color:#5d667a;
        }
        .tsReleaseHost .tsReleaseSupportPhone {
            font:760 15px/1.2 Inter,system-ui,sans-serif;
            color:#1f2637; white-space:nowrap; font-variant-numeric:tabular-nums;
        }
        .tsReleaseHost .tsReleaseSupportCopy {
            appearance:none;-webkit-appearance:none; flex:0 0 auto;
            display:flex;align-items:center;justify-content:center;
            min-width:62px; min-height:40px;padding:0 10px;
            border:1px solid #b5c0d3;border-radius:26px;
            background:transparent;color:#232b3d;
            font:750 13px/1 Inter,system-ui,sans-serif;
            cursor:pointer;
        }
        .tsReleaseHost .tsReleaseSupportCopy:hover { background:#e3e9f3; }
        .tsReleaseHost .tsReleaseSupportOutside {
            margin:14px 0 15px;font:400 12px/1.35 Inter,system-ui,sans-serif;color:#5d667a;
        }
        .tsReleaseHost .tsReleaseSupportBottom { display:flex;justify-content:flex-end; }
        .tsReleaseHost .tsReleaseSupportBack {
            appearance:none;-webkit-appearance:none;border:0;border-radius:28px;
            min-height:46px;padding:0 20px;
            background:#202636;color:white;cursor:pointer;
            font:750 13px/1.2 Inter,system-ui,sans-serif;
        }
        .tsReleaseHost .tsReleaseSupportBack:hover { background:#303e5b; }
        .tsReleaseHost .tsReleaseSupportModal button:focus-visible {
            outline:3px solid #249fd9;outline-offset:2px;
        }
        @media (max-width:500px) {
            .tsReleaseHost .tsReleaseSupportOverlay {padding:10px;}
            .tsReleaseHost .tsReleaseSupportModal {padding:19px 14px 16px;border-radius:18px;}
            .tsReleaseHost .tsReleaseSupportContact {gap:5px;padding:9px 9px;}
            .tsReleaseHost .tsReleaseSupportWho strong {font-size:12px;}
            .tsReleaseHost .tsReleaseSupportWho span {font-size:10px;}
            .tsReleaseHost .tsReleaseSupportPhone {font-size:12px;}
            .tsReleaseHost .tsReleaseSupportCopy {min-width:50px;min-height:36px;padding:0 6px;font-size:11px;}
        }
        @media (max-width:340px) {
            .tsReleaseHost .tsReleaseSupportContact {grid-template-columns:minmax(0,1fr) auto;}
            .tsReleaseHost .tsReleaseSupportWho {grid-row:1 / span 2;}
            .tsReleaseHost .tsReleaseSupportPhone {grid-column:2;justify-self:center;}
            .tsReleaseHost .tsReleaseSupportCopy {grid-column:2;justify-self:center;}
        }
        @media(max-width:640px){
            .tsReleaseHost .tsSsPanel{top:72px;right:8px;max-height:calc(100% - 89px);}
        }
        @media(max-width:320px){
            .tsReleaseHost .tsSsPanel{width:calc(100% - 12px);right:6px;padding:13px 11px;}
            .tsReleaseHost .tsSsRow{padding-right:8px;}
        }
        @media(prefers-reduced-motion:reduce){
            .tsReleaseHost .tsSsPanel,.tsReleaseHost .tsSsRowValue{animation:none;}
            .tsReleaseHost .tsSsRow,.tsReleaseHost .tsSsDone{transition:none;}
        }
    `}</style>
    )
}

// ─────────────────────────────────────────────────────────────
// Original Release component (now internal, not the default export)
// ─────────────────────────────────────────────────────────────
function ThinkStillReleaseRituals(allProps: any) {
    const { __onPremiumOpen, __premiumMember, ...props } = allProps
    const [app, setApp] = React.useState<ReleaseApp | null>(() => cachedApp)
    const [error, setError] = React.useState<string>("")
    const [retry, setRetry] = React.useState(0)
    const [closed, setClosed] = React.useState(false)
    const [settings, setSettings] =
        React.useState<RitualSettings>(readRitualSettings)
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [supportOpen, setSupportOpen] = React.useState(false)
    const releaseHostRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const host = releaseHostRef.current
        if (!host) return
        const onCaptureClick = (event: MouseEvent) => {
            const node = event.target
            if (!(node instanceof Element)) return
            const gear = node.closest(".tsReleaseSettingsButton")
            if (!gear || !host.contains(gear)) return
            event.preventDefault()
            event.stopPropagation()
            event.stopImmediatePropagation()
            setSettingsOpen((open) => !open)
        }
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setSettingsOpen(false)
        }
        host.addEventListener("click", onCaptureClick, true)
        window.addEventListener("keydown", onEscape)
        return () => {
            host.removeEventListener("click", onCaptureClick, true)
            window.removeEventListener("keydown", onEscape)
        }
    }, [app])

    React.useEffect(() => {
        try {
            window.localStorage.setItem(
                RITUAL_SETTINGS_KEY,
                JSON.stringify(settings)
            )
        } catch (_) {}
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("thinkstill:settingschange", {
                    detail: { ...settings },
                })
            )
        }
    }, [settings])

    React.useEffect(() => {
        const gear = releaseHostRef.current?.querySelector(
            ".tsReleaseSettingsButton"
        )
        gear?.setAttribute("aria-expanded", settingsOpen ? "true" : "false")
    }, [settingsOpen, app])

    React.useEffect(() => {
        let active = true
        getApp().then(
            (component) => {
                if (active) {
                    setApp(() => component)
                    setError("")
                }
            },
            (cause) => {
                if (active) setError(String(cause?.message || cause))
            }
        )
        return () => {
            active = false
        }
    }, [retry])

    if (closed) return null

    if (!app) {
        if (error || cachedError) {
            return (
                <StatusView
                    message="The Release script could not start."
                    details={error || cachedError}
                    onRetry={() => {
                        setError("")
                        cachedError = ""
                        setRetry((n) => n + 1)
                    }}
                />
            )
        }
        return <StatusView message="Loading your Release rituals…" />
    }
    return (
        <div
            className="tsReleaseHost"
            ref={releaseHostRef}
            data-ts-vibe={settings.vibe}
            data-ts-intensity={settings.intensity}
            data-ts-theme={settings.theme}
        >
            {React.createElement(app, {
                ...props,
                eosShowGameMenu: false,
                title: "EMOTIONAL RELEASE CONSOLE",
                thinkstillVibe: settings.vibe,
                thinkstillIntensity: settings.intensity,
                thinkstillTheme: settings.theme,
                onClose: () => {
                    setSettingsOpen(false)
                    setSupportOpen(false)
                    setClosed(true)
                },
            })}
            <ReleaseCheckInOverlapGuard />
            <ScreenshotSettingsStyles />
            {settingsOpen && (
                <ScreenshotSettingsPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                    onDone={() => setSettingsOpen(false)}
                    onSupportOpen={() => {
                        setSettingsOpen(false)
                        setSupportOpen(true)
                    }}
                    onPremiumOpen={
                        __onPremiumOpen
                            ? () => {
                                  setSettingsOpen(false)
                                  __onPremiumOpen()
                              }
                            : undefined
                    }
                    premiumMember={!!__premiumMember}
                />
            )}
            {supportOpen && (
                <ReleaseSupportModal onClose={() => setSupportOpen(false)} />
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// CINEMATIC SKIN
// ─────────────────────────────────────────────────────────────
const INTRO_SEEN_KEY = "thinkstill_cine_intro_seen_v1"
const VISIT_KEY = "thinkstill_visit_days_v1"

function todayKey() {
    const d = new Date()
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// Counts distinct days the person has opened ThinkStill. Only ever goes up.
function recordVisitDay(): number {
    try {
        const raw = window.localStorage.getItem(VISIT_KEY)
        const prev = raw ? JSON.parse(raw) : { days: 0, last: "" }
        const today = todayKey()
        const next =
            prev.last === today
                ? prev
                : { days: (Number(prev.days) || 0) + 1, last: today }
        window.localStorage.setItem(VISIT_KEY, JSON.stringify(next))
        return next.days
    } catch (_) {
        return 0
    }
}

function introAlreadySeen(): boolean {
    try {
        return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1"
    } catch (_) {
        return false
    }
}

function markIntroSeen() {
    try {
        window.sessionStorage.setItem(INTRO_SEEN_KEY, "1")
    } catch (_) {}
}

function prefersReducedMotion(): boolean {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    } catch (_) {
        return false
    }
}

function visitLine(days: number): string {
    if (days <= 1) return "Welcome. This is a space just for you."
    if (days < 7) return `Day ${days} of showing up for yourself.`
    if (days < 30) return `${days} days of making room for how you feel.`
    return `${days} days with ThinkStill. That’s real care.`
}

function CinematicIntro({
    days,
    onDone,
}: {
    days: number
    onDone: () => void
}) {
    const [leaving, setLeaving] = React.useState(false)
    const beginRef = React.useRef<HTMLButtonElement>(null)
    const reduced = React.useMemo(prefersReducedMotion, [])

    const leave = React.useCallback(() => {
        setLeaving((already) => {
            if (!already) window.setTimeout(onDone, reduced ? 120 : 520)
            return true
        })
    }, [onDone, reduced])

    React.useEffect(() => {
        beginRef.current?.focus({ preventScroll: true })
        const auto = window.setTimeout(leave, reduced ? 2200 : 5600)
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                leave()
            }
        }
        window.addEventListener("keydown", onKey)
        return () => {
            window.clearTimeout(auto)
            window.removeEventListener("keydown", onKey)
        }
    }, [leave, reduced])

    const word = "ThinkStill".split("")

    return (
        <div
            className={`tsCineIntro${leaving ? " isLeaving" : ""}`}
            role="dialog"
            aria-label="Welcome to ThinkStill"
            onClick={leave}
        >
            <div className="tsCineBar top" aria-hidden="true" />
            <div className="tsCineBar bottom" aria-hidden="true" />
            <div className="tsCineIntroGlow" aria-hidden="true" />

            <div className="tsCineStage">
                <div className="tsCineOrbWrap" aria-hidden="true">
                    <span className="tsCineRing r1" />
                    <span className="tsCineRing r2" />
                    <span className="tsCineRing r3" />
                    <span className="tsCineCore">
                        <span className="tsCineCoreShine" />
                    </span>
                </div>

                <h1 className="tsCineWord" aria-label="ThinkStill">
                    {word.map((c, i) => (
                        <span
                            key={i}
                            aria-hidden="true"
                            style={{ animationDelay: `${0.45 + i * 0.055}s` }}
                        >
                            {c}
                        </span>
                    ))}
                </h1>

                <div className="tsCineTagline">
                    <span className="in">Breathe in…</span>
                    <span className="out">and let it go.</span>
                </div>

                <div className="tsCineVisit">{visitLine(days)}</div>

                <button
                    ref={beginRef}
                    type="button"
                    className="tsCineBegin"
                    onClick={(e) => {
                        e.stopPropagation()
                        leave()
                    }}
                >
                    Begin <span aria-hidden="true">›</span>
                </button>
                <div className="tsCineSkip" aria-hidden="true">
                    Tap anywhere to skip
                </div>
            </div>
        </div>
    )
}

const GRAIN_SVG =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")"

function CinematicStyles() {
    return (
        <style>{`
.tsCineHost { position:relative; width:100%; height:100%; overflow:hidden; isolation:isolate; }
.tsCineHost > .tsReleaseHost { position:relative; z-index:1; }

.tsCineAmbient, .tsCineGrain, .tsCineVignette {
    position:absolute; inset:0; pointer-events:none; z-index:2;
    transition:opacity .8s ease;
}
.tsCineAmbient { mix-blend-mode:screen; opacity:.5; overflow:hidden; }
.tsCineAmbient > span { position:absolute; border-radius:50%; filter:blur(60px); will-change:transform; }
.tsCineAmbient .key {
    width:70%; height:55%; left:-18%; top:-20%;
    background:radial-gradient(circle, rgba(255,186,110,.55), rgba(255,140,80,0) 70%);
    animation:tsCineBreathe 9s ease-in-out infinite;
}
.tsCineAmbient .cyan {
    width:60%; height:50%; right:-20%; top:25%;
    background:radial-gradient(circle, rgba(0,217,255,.45), rgba(0,217,255,0) 70%);
    animation:tsCineDriftA 46s ease-in-out infinite;
}
.tsCineAmbient .violet {
    width:65%; height:55%; left:10%; bottom:-28%;
    background:radial-gradient(circle, rgba(192,0,255,.40), rgba(192,0,255,0) 70%);
    animation:tsCineDriftB 58s ease-in-out infinite;
}
@keyframes tsCineBreathe { 0%,100%{transform:scale(1);opacity:.75} 50%{transform:scale(1.12);opacity:1} }
@keyframes tsCineDriftA { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-18%,12%)} 66%{transform:translate(-6%,-14%)} }
@keyframes tsCineDriftB { 0%,100%{transform:translate(0,0)} 50%{transform:translate(16%,-10%)} }

.tsCineVignette { background:radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,8,.38) 100%); }
.tsCineGrain {
    opacity:.055; mix-blend-mode:overlay; background-image:${GRAIN_SVG};
    animation:tsCineGrainJitter .9s steps(4) infinite;
}
@keyframes tsCineGrainJitter {
    0%{transform:translate(0,0)} 25%{transform:translate(-3%,2%)}
    50%{transform:translate(2%,-3%)} 75%{transform:translate(-2%,-1%)} 100%{transform:translate(0,0)}
}

.tsCineHost:has(.tsReleaseHost[data-ts-intensity="Gentle"]) .tsCineAmbient { opacity:.34; }
.tsCineHost:has(.tsReleaseHost[data-ts-intensity="Balanced"]) .tsCineAmbient { opacity:.5; }
.tsCineHost:has(.tsReleaseHost[data-ts-intensity="Full blast"]) .tsCineAmbient { opacity:.72; }

.tsCineHost:has(.tsReleaseSupportOverlay) .tsCineAmbient,
.tsCineHost:has(.tsReleaseSupportOverlay) .tsCineGrain,
.tsCineHost:has(.tsReleaseSupportOverlay) .tsCineVignette,
.tsCineHost:not(:has(.tsReleaseHost)) .tsCineAmbient,
.tsCineHost:not(:has(.tsReleaseHost)) .tsCineGrain,
.tsCineHost:not(:has(.tsReleaseHost)) .tsCineVignette { opacity:0 !important; }

/* CLEAN CONTROL STRIP — remove the long header/container rules that run
   behind the previous/next, music, settings and close controls.
   Individual button borders are deliberately kept. */
html body .tsCineHost .tsArcade .releaseConsoleHeader {
    border:0 !important;
    border-top:0 !important;
    border-bottom:0 !important;
    outline:none !important;
    box-shadow:none !important;
    backdrop-filter:blur(14px) saturate(1.25) !important;
    -webkit-backdrop-filter:blur(14px) saturate(1.25) !important;
}
html body .tsCineHost .tsArcade .releaseConsoleHeader::before,
html body .tsCineHost .tsArcade .releaseConsoleHeader::after {
    content:none !important;
    display:none !important;
    border:0 !important;
    height:0 !important;
    box-shadow:none !important;
    background:none !important;
    animation:none !important;
    pointer-events:none !important;
}
/* No perimeter/top stroke of the containing shell through the control row. */
html body .tsCineHost .tsArcade .shell {
    border-top:0 !important;
}
/* Controls always sit above translucent chrome, without changing handlers. */
html body .tsCineHost .tsArcade .releaseConsoleHeader > .tsReleaseNativeNav,
html body .tsCineHost .tsArcade .releaseConsoleHeader > .releaseHeaderSound,
html body .tsCineHost .tsArcade .releaseConsoleHeader > .tsReleaseSettingsButton,
html body .tsCineHost .tsArcade .releaseConsoleHeader > .tsReleaseCloseButton {
    z-index:90 !important;
    pointer-events:auto !important;
}
html body .tsCineHost .tsArcade .releaseConsoleHeader > .releaseScoreBar {
    z-index:45 !important;
}
html body .tsCineHost .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
    z-index:40 !important;
}

html body .tsCineHost .tsArcade .tsReleaseNativeArrow,
html body .tsCineHost .tsArcade .tsReleaseSettingsButton,
html body .tsCineHost .tsArcade .tsReleaseCloseButton,
html body .tsCineHost .tsArcade .releaseHeaderSound {
    transition:box-shadow .25s, border-color .25s, filter .25s !important;
}
html body .tsCineHost .tsArcade .tsReleaseNativeArrow:not(:disabled):hover,
html body .tsCineHost .tsArcade .tsReleaseSettingsButton:hover,
html body .tsCineHost .tsArcade .tsReleaseCloseButton:hover {
    filter:brightness(1.15) !important;
    box-shadow:0 0 18px rgba(0,217,255,.28), inset 0 1px 0 rgba(255,255,255,.16) !important;
}
html body .tsCineHost .tsArcade .tsReleaseNativeArrow:not(:disabled):active,
html body .tsCineHost .tsArcade .tsReleaseSettingsButton:active,
html body .tsCineHost .tsArcade .tsReleaseCloseButton:active {
    filter:brightness(.9) !important;
}
html body .tsCineHost .tsArcade .releaseConsoleHeader > .releaseScoreBar > strong {
    text-shadow:0 0 10px rgba(255,206,104,.55) !important;
}
html body .tsCineHost .tsArcade .releaseComposer { position:relative; }
html body .tsCineHost .tsArcade .releaseComposer::before {
    content:""; position:absolute; left:8%; right:8%; top:0; height:1px; pointer-events:none;
    background:linear-gradient(90deg, transparent, rgba(255,206,104,.45), transparent);
}
html body .tsCineHost .tsSsPanel {
    backdrop-filter:blur(18px) !important; -webkit-backdrop-filter:blur(18px) !important;
}
html body .tsCineHost .tsSsDone { position:relative; overflow:hidden; }
html body .tsCineHost .tsSsDone::after {
    content:""; position:absolute; top:0; bottom:0; width:40%; left:-60%;
    background:linear-gradient(100deg, transparent, rgba(255,255,255,.45), transparent);
    animation:tsCineSweep 3.4s ease-in-out infinite;
}
@keyframes tsCineSweep { 0%,60%{left:-60%} 100%{left:130%} }

.tsCineIntro {
    position:absolute; inset:0; z-index:50; cursor:pointer; overflow:hidden;
    display:flex; align-items:center; justify-content:center;
    background:radial-gradient(ellipse at 50% 42%, #1a1440 0%, #080b22 55%, #020309 100%);
    color:#f4f7ff; font-family:Inter,system-ui,-apple-system,sans-serif; text-align:center;
    animation:tsCineFadeIn .5s ease-out both;
}
.tsCineIntro.isLeaving { animation:tsCineExit .52s cubic-bezier(.6,0,.4,1) forwards; }
@keyframes tsCineFadeIn { from{opacity:0} to{opacity:1} }
@keyframes tsCineExit { to{opacity:0; transform:scale(1.08); filter:blur(6px)} }

.tsCineBar { position:absolute; left:0; right:0; height:9%; background:#000; z-index:3; transition:transform .55s cubic-bezier(.7,0,.3,1); }
.tsCineBar.top { top:0; } .tsCineBar.bottom { bottom:0; }
.tsCineIntro.isLeaving .tsCineBar.top { transform:translateY(-100%); }
.tsCineIntro.isLeaving .tsCineBar.bottom { transform:translateY(100%); }

.tsCineIntroGlow {
    position:absolute; width:120%; height:60%; left:-10%; top:-15%;
    background:radial-gradient(ellipse, rgba(255,170,95,.22), transparent 65%);
    filter:blur(30px); animation:tsCineBreathe 8s ease-in-out infinite;
}
.tsCineStage { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; padding:0 22px; }

.tsCineOrbWrap { position:relative; width:150px; height:150px; margin-bottom:26px; display:grid; place-items:center; }
.tsCineCore {
    position:relative; width:78px; height:78px; border-radius:50%;
    background:radial-gradient(circle at 34% 30%, #fff6dc 0%, #ffcf73 28%, #ff8a4c 62%, #b0306e 100%);
    box-shadow:0 0 40px rgba(255,170,90,.7), 0 0 90px rgba(255,120,80,.35), inset -8px -10px 22px rgba(120,20,80,.45);
    animation:tsCineDrop .9s cubic-bezier(.3,1.5,.5,1) .1s both, tsCineInhale 4.4s ease-in-out 1s infinite;
}
.tsCineCoreShine {
    position:absolute; width:26px; height:16px; left:16px; top:14px; border-radius:50%;
    background:rgba(255,255,255,.75); filter:blur(3px); transform:rotate(-25deg);
}
@keyframes tsCineDrop {
    0%{transform:translateY(-120px) scale(.6,1.3); opacity:0}
    55%{transform:translateY(0) scale(1.25,.75); opacity:1}
    75%{transform:translateY(-10px) scale(.92,1.08)}
    100%{transform:translateY(0) scale(1,1)}
}
@keyframes tsCineInhale { 0%,100%{transform:scale(1)} 45%{transform:scale(1.22)} }
.tsCineRing {
    position:absolute; inset:0; margin:auto; width:78px; height:78px; border-radius:50%;
    border:1.5px solid rgba(0,217,255,.55); box-shadow:0 0 14px rgba(0,217,255,.35);
    animation:tsCineRipple 4.4s ease-out infinite; opacity:0;
}
.tsCineRing.r2 { animation-delay:1.47s; border-color:rgba(192,90,255,.5); }
.tsCineRing.r3 { animation-delay:2.94s; border-color:rgba(255,190,120,.5); }
@keyframes tsCineRipple { 0%{transform:scale(1);opacity:.85} 100%{transform:scale(2.3);opacity:0} }

.tsCineWord {
    margin:0; font:900 clamp(38px, 11vw, 64px)/1 Inter,system-ui,sans-serif; letter-spacing:-.035em;
    background:linear-gradient(100deg, #ffe3a8 0%, #ffffff 35%, #8eefff 65%, #d59bff 100%);
    -webkit-background-clip:text; background-clip:text; color:transparent;
    filter:drop-shadow(0 4px 24px rgba(0,200,255,.25));
}
.tsCineWord span { display:inline-block; animation:tsCineLetter .7s cubic-bezier(.2,1.3,.4,1) both; }
@keyframes tsCineLetter { from{opacity:0; transform:translateY(22px) scale(.8); filter:blur(8px)} to{opacity:1; transform:none; filter:none} }

.tsCineTagline { position:relative; height:24px; margin-top:16px; width:260px; font:600 16px/24px Inter,system-ui,sans-serif; color:#d6e6ff; }
.tsCineTagline span { position:absolute; inset:0; opacity:0; }
.tsCineTagline .in { animation:tsCineLineIn 4.4s ease-in-out 1.1s infinite; }
.tsCineTagline .out { animation:tsCineLineOut 4.4s ease-in-out 1.1s infinite; }
@keyframes tsCineLineIn { 0%{opacity:0;transform:translateY(6px)} 10%,40%{opacity:1;transform:none} 50%,100%{opacity:0;transform:translateY(-6px)} }
@keyframes tsCineLineOut { 0%,45%{opacity:0;transform:translateY(6px)} 58%,88%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(-6px)} }

.tsCineVisit {
    margin-top:18px; padding:7px 14px; border-radius:999px;
    font:650 12px/1.3 Inter,system-ui,sans-serif; color:#ffe1a6;
    background:rgba(255,190,110,.10); border:1px solid rgba(255,190,110,.28);
    animation:tsCineRise .6s ease-out 1.3s both;
}
.tsCineBegin {
    appearance:none; -webkit-appearance:none; margin-top:26px; min-height:48px; padding:0 30px;
    border:0; border-radius:999px; cursor:pointer;
    font:850 15px/1 Inter,system-ui,sans-serif; color:#1e1230;
    background:linear-gradient(100deg, #ffce68, #ff9f7a 55%, #e79bff);
    box-shadow:0 8px 30px rgba(255,160,100,.4), inset 0 1px 0 rgba(255,255,255,.4);
    animation:tsCineRise .6s ease-out 1.55s both;
    transition:transform .18s cubic-bezier(.3,1.6,.5,1), filter .2s;
}
.tsCineBegin:hover { transform:translateY(-2px) scale(1.03); filter:brightness(1.06); }
.tsCineBegin:active { transform:scale(.96); }
.tsCineBegin:focus-visible { outline:3px solid #8cf4ff; outline-offset:3px; }
.tsCineSkip { margin-top:12px; font:500 11px/1 Inter,system-ui,sans-serif; color:rgba(214,230,255,.5); animation:tsCineRise .6s ease-out 1.8s both; }
@keyframes tsCineRise { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }

@media (max-height:620px) {
    .tsCineOrbWrap { width:110px; height:110px; margin-bottom:16px; }
    .tsCineBegin { margin-top:18px; }
}
@media (prefers-reduced-motion: reduce) {
    .tsCineAmbient > span, .tsCineGrain, .tsCineIntroGlow, .tsCineCore, .tsCineRing,
    .tsCineWord span, .tsCineVisit, .tsCineBegin, .tsCineSkip, .tsCineIntro,
    html body .tsCineHost .tsArcade .releaseConsoleHeader::after,
    html body .tsCineHost .tsSsDone::after { animation:none !important; }
    .tsCineRing { opacity:0; }
    .tsCineTagline .in { animation:none; opacity:1; }
    .tsCineTagline .out { display:none; }
    .tsCineIntro.isLeaving { animation:none; opacity:0; }
    .tsCineBar { transition:none; }
}

/* =============================================================
   THINKSTILL | SPOTLIGHT PREMIUM — V4 (iPhone standard)
   Netflix-dark stage, Pixar warm key light, Apple HIG mechanics:
   SF type, 44pt targets, safe areas, iOS materials and springs.
   Visual only: the ritual engine, navigation, settings events,
   music and support handlers stay untouched.
   ============================================================= */
.tsCineHost {
    --ts-ink:#0a0a0f;
    --ts-stage:#111118;
    --ts-surface:#1b1b24;
    --ts-raised:#262632;
    --ts-line:rgba(255,255,255,.09);
    --ts-text:#f5f5f7;
    --ts-text2:rgba(235,235,245,.62);
    --ts-ember:#ff3d55;
    --ts-ember2:#ff7a45;
    --ts-gold:#ffc76b;
    --ts-sky:#7fd8ff;
    --ts-spring:cubic-bezier(.32,.72,0,1);
    --ts-bounce:cubic-bezier(.34,1.56,.64,1);
    --ts-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",Inter,system-ui,sans-serif;
    background:var(--ts-ink) !important;
    color-scheme:dark;
    -webkit-tap-highlight-color:transparent;
    -webkit-font-smoothing:antialiased;
    font-family:var(--ts-font);
}
.tsCineHost *:not(input):not(textarea) { -webkit-touch-callout:none; }

/* ---------- Ambient: one slow Pixar key light that breathes at ~6 breaths/min ---------- */
.tsCineHost .tsCineAmbient { opacity:.42 !important; mix-blend-mode:screen !important; }
.tsCineHost .tsCineAmbient > span { filter:blur(70px) !important; }
.tsCineHost .tsCineAmbient .key {
    width:90%; height:60%; left:5%; top:-30%;
    background:radial-gradient(circle,rgba(255,190,110,.55),rgba(255,120,80,0) 70%) !important;
    animation:tsSpotBreath 10s ease-in-out infinite !important;
}
.tsCineHost .tsCineAmbient .cyan {
    background:radial-gradient(circle,rgba(127,216,255,.30),transparent 70%) !important;
    animation:tsCineDriftA 60s ease-in-out infinite !important;
}
.tsCineHost .tsCineAmbient .violet {
    background:radial-gradient(circle,rgba(255,61,85,.28),transparent 70%) !important;
    animation:tsCineDriftB 72s ease-in-out infinite !important;
}
@keyframes tsSpotBreath { 0%,100%{transform:scale(.92);opacity:.6} 40%{transform:scale(1.12);opacity:1} }
.tsCineHost .tsCineVignette {
    opacity:1 !important;
    background:radial-gradient(ellipse at 50% 38%,transparent 52%,rgba(0,0,0,.55) 100%) !important;
}
.tsCineHost .tsCineGrain { opacity:.04 !important; }

/* ---------- Stage ---------- */
html body .tsCineHost .tsArcade .shell {
    border:0 !important; outline:0 !important; box-shadow:none !important;
    background:
        radial-gradient(120% 60% at 50% -10%,rgba(255,170,90,.10),transparent 60%),
        linear-gradient(180deg,var(--ts-stage),var(--ts-ink)) !important;
    font-family:var(--ts-font) !important;
}
html body .tsCineHost .tsArcade .releaseStage { background:transparent !important; }

/* ---------- Header: iOS chrome material, safe-area aware ---------- */
html body .tsCineHost .tsArcade .releaseConsoleHeader {
    background:rgba(10,10,15,.72) !important;
    backdrop-filter:saturate(180%) blur(20px) !important;
    -webkit-backdrop-filter:saturate(180%) blur(20px) !important;
    border:0 !important; outline:0 !important;
    box-shadow:0 .5px 0 var(--ts-line) !important;
    padding-top:env(safe-area-inset-top,0px) !important;
}
html body .tsCineHost .tsArcade .releaseConsoleHeader > .releaseHeaderCenter {
    background:transparent !important; border:0 !important; box-shadow:none !important;
}
html body .tsCineHost .tsArcade .releaseHeaderCenter .releaseTitleMain {
    font-family:var(--ts-font) !important;
    font-weight:800 !important; letter-spacing:.06em !important;
    background:linear-gradient(100deg,#fff 0%,#fff 38%,var(--ts-gold) 50%,#fff 62%,#fff 100%);
    background-size:250% 100%;
    -webkit-background-clip:text !important; background-clip:text !important;
    color:transparent !important; -webkit-text-fill-color:transparent !important;
    animation:tsSpotTitleSheen 7s var(--ts-spring) infinite;
    text-shadow:none !important;
}
@keyframes tsSpotTitleSheen { 0%,70%{background-position:100% 0} 100%{background-position:-50% 0} }
html body .tsCineHost .tsArcade .releaseHeaderCenter .releaseTitleBy,
html body .tsCineHost .tsArcade .releaseHeaderCenter .releaseTitleBrand {
    color:var(--ts-text2) !important; text-shadow:none !important; font-family:var(--ts-font) !important;
}
html body .tsCineHost .tsArcade .releaseHeaderCenter .releaseTitleBrand {
    color:#fff !important; font-weight:800 !important;
    text-shadow:0 0 14px rgba(255,140,80,.45) !important;
}

/* Header buttons: round iOS glyph buttons with Pixar squash on press */
html body .tsCineHost .tsArcade .tsReleaseNativeArrow,
html body .tsCineHost .tsArcade .tsReleaseSettingsButton,
html body .tsCineHost .tsArcade .tsReleaseCloseButton,
html body .tsCineHost .tsArcade .releaseHeaderSound {
    background:rgba(118,118,128,.24) !important;
    border:0 !important; border-radius:999px !important;
    color:var(--ts-text) !important;
    box-shadow:inset 0 .5px 0 rgba(255,255,255,.14) !important;
    filter:none !important;
    transition:transform .45s var(--ts-bounce),background .2s ease !important;
    -webkit-tap-highlight-color:transparent !important;
    touch-action:manipulation !important;
}
html body .tsCineHost .tsArcade .tsReleaseNativeArrow:not(:disabled):hover,
html body .tsCineHost .tsArcade .tsReleaseSettingsButton:hover,
html body .tsCineHost .tsArcade .releaseHeaderSound:hover {
    background:rgba(118,118,128,.38) !important; box-shadow:inset 0 .5px 0 rgba(255,255,255,.2) !important; filter:none !important;
}
html body .tsCineHost .tsArcade .tsReleaseCloseButton:hover { background:rgba(255,61,85,.85) !important; }
html body .tsCineHost .tsArcade .tsReleaseNativeArrow:not(:disabled):active,
html body .tsCineHost .tsArcade .tsReleaseSettingsButton:active,
html body .tsCineHost .tsArcade .tsReleaseCloseButton:active,
html body .tsCineHost .tsArcade .releaseHeaderSound:active {
    transform:scale(.86,.82) !important; transition-duration:.08s !important; filter:none !important;
}
html body .tsCineHost .tsArcade .tsReleaseNativeArrow:disabled { opacity:.3 !important; }
html body .tsCineHost .tsArcade .tsReleaseNativeArrow:focus-visible,
html body .tsCineHost .tsArcade .tsReleaseSettingsButton:focus-visible,
html body .tsCineHost .tsArcade .tsReleaseCloseButton:focus-visible,
html body .tsCineHost .tsArcade .releaseHeaderSound:focus-visible {
    outline:2px solid var(--ts-sky) !important; outline-offset:2px !important;
}

/* Progress: ember→gold fill with a slow light sweep */
html body .tsCineHost .tsArcade .releaseConsoleHeader > .releaseScoreBar {
    background:rgba(118,118,128,.18) !important; border:0 !important;
    border-radius:999px !important; box-shadow:none !important; color:var(--ts-text) !important;
}
html body .tsCineHost .tsArcade .releaseScoreBar > span { color:var(--ts-text2) !important; }
html body .tsCineHost .tsArcade .releaseScoreBar > strong {
    color:var(--ts-gold) !important; text-shadow:0 0 12px rgba(255,199,107,.45) !important;
}
/* iPhone: compact the progress pill so it sits inside the header, not over the stage. */
@media (max-width:640px) {
    /* :not(#…) chain outranks the engine's own ID-weighted selectors. */
    html body .tsCineHost .tsArcade:not(#tsSpA):not(#tsSpB):not(#tsSpC):not(#tsSpD) .releaseConsoleHeader > .releaseScoreBar {
        top:43px !important; height:22px !important; min-height:0 !important;
        padding:0 10px !important; line-height:22px !important;
    }
    html body .tsCineHost .tsArcade .releaseConsoleHeader > .releaseScoreBar > span,
    html body .tsCineHost .tsArcade .releaseConsoleHeader > .releaseScoreBar > strong {
        display:inline !important; font-size:10px !important; line-height:22px !important; margin:0 !important;
    }
}
html body .tsCineHost .tsArcade .releaseScoreBar .releaseScoreTrack {
    background:rgba(255,255,255,.08) !important; border:0 !important; border-radius:999px !important; overflow:hidden !important;
}
html body .tsCineHost .tsArcade .releaseScoreBar .releaseScoreTrack > span,
html body .tsCineHost .tsArcade .releaseScoreBar .releaseScoreTrack > div {
    background:linear-gradient(90deg,var(--ts-ember),var(--ts-ember2) 55%,var(--ts-gold)) !important;
    box-shadow:0 0 10px rgba(255,90,80,.55) !important;
    position:relative !important;
}

/* ---------- Composer: iOS message field with a calm breathing halo ---------- */
html body .tsCineHost .tsArcade .releaseComposer {
    background:rgba(10,10,15,.78) !important;
    backdrop-filter:saturate(180%) blur(20px) !important;
    -webkit-backdrop-filter:saturate(180%) blur(20px) !important;
    border:0 !important; box-shadow:0 -.5px 0 var(--ts-line) !important;
    padding-bottom:max(10px,env(safe-area-inset-bottom,0px)) !important;
}
html body .tsCineHost .tsArcade .releaseComposer::before { display:none !important; content:none !important; }
@keyframes tsSpotHalo {
    0%,100% { box-shadow:0 0 0 1px rgba(255,199,107,.25),0 0 0 0 rgba(255,61,85,0); }
    40%     { box-shadow:0 0 0 1px rgba(255,199,107,.55),0 0 26px 2px rgba(255,90,80,.28); }
}
html body .tsCineHost .tsArcade.stage-input .releaseComposer .releaseInputWrap {
    border-radius:22px !important;
    animation:tsSpotHalo 10s ease-in-out infinite !important;
}
html body .tsCineHost .tsArcade.stage-input .releaseComposer .releaseInputWrap:focus-within {
    animation:none !important;
    box-shadow:0 0 0 2px rgba(255,199,107,.7),0 0 30px rgba(255,90,80,.3) !important;
}
html body .tsCineHost .tsArcade.stage-input .releaseComposer .releaseThoughtInput {
    background:var(--ts-surface) !important;
    border:.5px solid rgba(255,255,255,.14) !important;
    border-radius:22px !important;
    color:var(--ts-text) !important;
    caret-color:var(--ts-gold) !important;
    font-family:var(--ts-font) !important;
    font-size:17px !important;           /* iOS: <16px zooms the page on focus */
    min-height:44px !important;
    box-shadow:none !important;
}
html body .tsCineHost .tsArcade.stage-input .releaseComposer .releaseThoughtInput::placeholder {
    color:rgba(235,235,245,.5) !important; opacity:1 !important;
}
html body .tsCineHost .tsArcade.stage-input .releaseComposer .releaseThoughtInput:focus { border-color:transparent !important; outline:none !important; }

/* ---------- Ritual picker: Netflix poster rows ---------- */
html body .tsCineHost .tsArcade .releaseChoiceMenu {
    background:rgba(20,20,27,.92) !important;
    backdrop-filter:saturate(180%) blur(24px) !important;
    -webkit-backdrop-filter:saturate(180%) blur(24px) !important;
    border:.5px solid var(--ts-line) !important; border-radius:20px !important;
    box-shadow:0 24px 60px rgba(0,0,0,.6) !important;
}
html body .tsCineHost .tsArcade .releaseChoiceGroupLabel {
    color:var(--ts-text) !important; font-family:var(--ts-font) !important;
    font-weight:800 !important; letter-spacing:.02em !important; text-transform:none !important;
}
html body .tsCineHost .tsArcade .releaseChoiceButton,
html body .tsCineHost .tsArcade .releaseChoiceItem {
    border-radius:14px !important; min-height:44px !important;
    transition:transform .45s var(--ts-bounce),box-shadow .3s ease,background .2s ease !important;
}
html body .tsCineHost .tsArcade .releaseChoiceButton:hover,
html body .tsCineHost .tsArcade .releaseChoiceItem:hover {
    transform:translateY(-2px) scale(1.04) !important;
    box-shadow:0 14px 30px rgba(0,0,0,.5),0 0 0 1.5px rgba(255,199,107,.6) !important;
}
html body .tsCineHost .tsArcade .releaseChoiceButton:active,
html body .tsCineHost .tsArcade .releaseChoiceItem:active { transform:scale(.95,.92) !important; transition-duration:.08s !important; }

/* ---------- Completion: the "end credits" moment ---------- */
html body .tsCineHost .tsArcade .releaseCompleteOverlay {
    background:radial-gradient(80% 60% at 50% 30%,rgba(255,170,90,.16),rgba(0,0,0,.82) 70%) !important;
    backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important;
}
html body .tsCineHost .tsArcade .releaseCompleteCard {
    position:relative !important;
    background:linear-gradient(180deg,rgba(38,38,50,.96),rgba(18,18,25,.98)) !important;
    border:.5px solid rgba(255,255,255,.12) !important;
    border-radius:28px !important;
    box-shadow:0 30px 80px rgba(0,0,0,.65),0 0 0 1px rgba(255,199,107,.08),0 -20px 60px rgba(255,160,90,.12) !important;
    font-family:var(--ts-font) !important;
    animation:tsSpotCardIn .8s var(--ts-spring) both !important;
    overflow:hidden !important;
}
html body .tsCineHost .tsArcade .releaseCompleteCard::before {
    content:""; position:absolute; left:50%; top:-40%; width:140%; height:80%;
    transform:translateX(-50%); pointer-events:none;
    background:radial-gradient(ellipse at 50% 0%,rgba(255,215,140,.28),transparent 65%);
    animation:tsSpotBreath 10s ease-in-out infinite;
}
@keyframes tsSpotCardIn {
    0%   { opacity:0; transform:translateY(40px) scale(.9); }
    60%  { opacity:1; transform:translateY(-4px) scale(1.015); }
    100% { opacity:1; transform:none; }
}
html body .tsCineHost .tsArcade .releaseCompleteCard > small {
    color:var(--ts-gold) !important; font-weight:800 !important; letter-spacing:.14em !important;
    text-shadow:0 0 14px rgba(255,199,107,.5) !important;
}
html body .tsCineHost .tsArcade .releaseCompleteCard > strong {
    color:#fff !important; font-weight:900 !important; letter-spacing:-.02em !important;
    animation:tsSpotTitleRise .9s var(--ts-spring) .15s both;
}
@keyframes tsSpotTitleRise { from{opacity:0;transform:translateY(14px);filter:blur(6px)} to{opacity:1;transform:none;filter:none} }
html body .tsCineHost .tsArcade .releasePersistentFinalMessage b { color:#fff !important; }
html body .tsCineHost .tsArcade .releasePersistentFinalMessage span { color:var(--ts-text2) !important; }
html body .tsCineHost .tsArcade .releaseShiftChoices button,
html body .tsCineHost .tsArcade .releaseCompleteActions button,
html body .tsCineHost .tsArcade .releaseRecommendationActions button,
html body .tsCineHost .tsArcade .releaseReplaySame,
html body .tsCineHost .tsArcade .releaseCompleteSideNav {
    min-height:44px !important; border-radius:14px !important;
    font-family:var(--ts-font) !important; font-weight:700 !important;
    background:rgba(118,118,128,.24) !important; color:#fff !important;
    border:0 !important; box-shadow:none !important;
    transition:transform .45s var(--ts-bounce),background .2s ease !important;
    touch-action:manipulation !important;
}
html body .tsCineHost .tsArcade .releaseShiftChoices button.active {
    background:linear-gradient(100deg,var(--ts-ember),var(--ts-ember2)) !important;
    box-shadow:0 8px 24px rgba(255,61,85,.35) !important;
}
html body .tsCineHost .tsArcade .releaseMorePrimary,
html body .tsCineHost .tsArcade .releaseCompleteNext {
    min-height:50px !important; border-radius:14px !important; border:0 !important;
    font-family:var(--ts-font) !important; font-weight:800 !important; font-size:17px !important;
    background:#fff !important; color:#0a0a0f !important;
    box-shadow:0 10px 30px rgba(255,255,255,.12) !important;
    transition:transform .45s var(--ts-bounce) !important;
}
html body .tsCineHost .tsArcade .releaseShiftChoices button:active,
html body .tsCineHost .tsArcade .releaseCompleteActions button:active,
html body .tsCineHost .tsArcade .releaseMorePrimary:active,
html body .tsCineHost .tsArcade .releaseCompleteNext:active,
html body .tsCineHost .tsArcade .releaseReplaySame:active { transform:scale(.95,.92) !important; transition-duration:.08s !important; }

/* "Up next" recommendation = Netflix next-episode card */
html body .tsCineHost .tsArcade .releaseRecommendationPanel {
    background:linear-gradient(135deg,rgba(255,61,85,.14),rgba(255,199,107,.08) 60%,transparent) !important;
    border:.5px solid rgba(255,199,107,.25) !important; border-radius:20px !important;
}
html body .tsCineHost .tsArcade .releaseRecommendationCopy { color:var(--ts-text) !important; font-family:var(--ts-font) !important; }

/* ---------- Settings: iOS inset grouped list ---------- */
html body .tsCineHost .tsSsPanel {
    background:rgba(28,28,36,.86) !important;
    backdrop-filter:saturate(180%) blur(30px) !important; -webkit-backdrop-filter:saturate(180%) blur(30px) !important;
    border:.5px solid rgba(255,255,255,.12) !important; border-radius:20px !important;
    box-shadow:0 24px 60px rgba(0,0,0,.55) !important;
    color:var(--ts-text) !important; font-family:var(--ts-font) !important;
    padding:16px 14px 14px !important;
    animation:tsSpotPop .42s var(--ts-spring) both !important;
    transform-origin:top right;
}
@keyframes tsSpotPop { from{opacity:0;transform:scale(.86)} to{opacity:1;transform:none} }
html body .tsCineHost .tsSsStars, html body .tsCineHost .tsSsTagline { display:none !important; }
html body .tsCineHost .tsSsHeader { font:700 20px/1.2 var(--ts-font) !important; letter-spacing:-.01em !important; color:#fff !important; text-transform:none !important; }
html body .tsCineHost .tsSsSubheader { color:var(--ts-text2) !important; font:400 13px/1.3 var(--ts-font) !important; margin:2px 0 12px !important; }
html body .tsCineHost .tsSsRows { gap:0 !important; background:rgba(255,255,255,.06) !important; border-radius:12px !important; overflow:hidden !important; }
html body .tsCineHost .tsSsRow,
html body .tsCineHost .tsSsRow:nth-of-type(n) {
    background:transparent !important; border:0 !important;
    border-bottom:.5px solid rgba(255,255,255,.09) !important; border-radius:0 !important;
    box-shadow:none !important; min-height:44px !important; padding:6px 12px !important;
    color:#fff !important; font:500 15px/1.2 var(--ts-font) !important; transform:none !important;
}
html body .tsCineHost .tsSsRow:last-child { border-bottom:0 !important; }
html body .tsCineHost .tsSsRow:hover { background:rgba(255,255,255,.06) !important; }
html body .tsCineHost .tsSsRow:active { background:rgba(255,255,255,.12) !important; }
html body .tsCineHost .tsSsIcon {
    width:29px !important; height:29px !important; flex-basis:29px !important; border-radius:7px !important;
    color:#fff !important; text-shadow:none !important; font-size:16px !important;
}
html body .tsCineHost .tsSsIcon--vibe { background:#ff375f !important; }
html body .tsCineHost .tsSsIcon--intensity { background:#ff9f0a !important; }
html body .tsCineHost .tsSsIcon--theme { background:#5e5ce6 !important; }
html body .tsCineHost .tsSsIcon--support { background:#30b0c7 !important; }
html body .tsCineHost .tsSsIcon--premium { background:linear-gradient(135deg,var(--ts-ember),var(--ts-gold)) !important; }
html body .tsCineHost .tsSsRowValue { color:var(--ts-text2) !important; font:400 15px/1.2 var(--ts-font) !important; }
html body .tsCineHost .tsSsRow--premium .tsSsRowValue { color:var(--ts-gold) !important; font-weight:600 !important; }
html body .tsCineHost .tsSsCycle { color:rgba(235,235,245,.3) !important; }
html body .tsCineHost .tsSsDone,
html body .tsCineHost .tsReleaseHost[data-ts-vibe] .tsSsDone {
    background:#fff !important; color:#0a0a0f !important; border-radius:14px !important;
    min-height:50px !important; margin-top:14px !important; font:700 17px/1 var(--ts-font) !important;
    box-shadow:none !important;
    transition:transform .45s var(--ts-bounce) !important;
}
html body .tsCineHost .tsSsDone:active { transform:scale(.96) !important; transition-duration:.08s !important; }
html body .tsCineHost .tsSsDone::after { display:none !important; }

/* ---------- Support stays a plain, legible document. No skin, no upsell. ---------- */
html body .tsCineHost .tsReleaseSupportOverlay { background:rgba(0,0,0,.7) !important; }
html body .tsCineHost .tsReleaseSupportModal { font-family:var(--ts-font) !important; border-radius:20px !important; }
html body .tsCineHost .tsReleaseSupportBack { background:#1c1c24 !important; color:#fff !important; min-height:50px !important; }

/* ---------- Intro: cold-open title card ---------- */
.tsCineHost .tsCineIntro { background:#000 !important; font-family:var(--ts-font) !important; }
.tsCineHost .tsCineWord {
    font-family:var(--ts-font) !important; font-weight:900 !important; letter-spacing:-.04em !important;
    background:none !important; filter:none !important;
    color:#fff !important; -webkit-text-fill-color:#fff !important;
}
/* Glow lives on each letter: clipped gradients vanish behind animated child spans. */
.tsCineHost .tsCineWord span {
    text-shadow:0 0 18px rgba(255,199,107,.55),0 6px 40px rgba(255,110,70,.45);
}
.tsCineHost .tsCineCore {
    background:radial-gradient(circle at 34% 30%,#fff6dc 0%,var(--ts-gold) 30%,var(--ts-ember2) 62%,var(--ts-ember) 100%) !important;
}
.tsCineHost .tsCineRing { border-color:rgba(255,199,107,.5) !important; box-shadow:0 0 14px rgba(255,140,80,.35) !important; }
.tsCineHost .tsCineRing.r2 { border-color:rgba(255,61,85,.45) !important; }
.tsCineHost .tsCineRing.r3 { border-color:rgba(127,216,255,.4) !important; }
.tsCineHost .tsCineVisit { color:var(--ts-gold) !important; background:rgba(255,199,107,.08) !important; border-color:rgba(255,199,107,.25) !important; }
.tsCineHost .tsCineBegin {
    background:#fff !important; color:#0a0a0f !important; border-radius:14px !important;
    min-height:50px !important; font:700 17px/1 var(--ts-font) !important;
    box-shadow:0 10px 40px rgba(255,170,100,.35) !important;
}

/* ---------- Bright theme: warm daylight set ---------- */
.tsCineHost:has(.tsReleaseHost[data-ts-theme="Bright"]) {
    --ts-ink:#f5f2ef; --ts-stage:#fbf8f5; --ts-surface:#fff; --ts-text:#1c1c1e; --ts-text2:rgba(60,60,67,.6);
    --ts-line:rgba(60,60,67,.12); color-scheme:light;
}
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .releaseConsoleHeader,
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .releaseComposer { background:rgba(251,248,245,.8) !important; }
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .releaseHeaderCenter .releaseTitleBrand { color:#1c1c1e !important; text-shadow:none !important; }
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .releaseHeaderCenter .releaseTitleMain {
    background-image:linear-gradient(100deg,#1c1c1e 0%,#1c1c1e 38%,var(--ts-ember) 50%,#1c1c1e 62%,#1c1c1e 100%);
}
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .tsReleaseNativeArrow,
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .tsReleaseSettingsButton,
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .tsReleaseCloseButton,
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade .releaseHeaderSound {
    background:rgba(118,118,128,.12) !important; color:#1c1c1e !important;
}
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade.stage-input .releaseComposer .releaseThoughtInput { background:#fff !important; color:#1c1c1e !important; border-color:rgba(60,60,67,.18) !important; }
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsArcade.stage-input .releaseComposer .releaseThoughtInput::placeholder { color:rgba(60,60,67,.5) !important; }
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsSsPanel { background:rgba(242,242,247,.9) !important; color:#1c1c1e !important; }
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsSsHeader,
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsSsRow { color:#1c1c1e !important; }
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsSsRows { background:#fff !important; }
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsSsRow { border-bottom-color:rgba(60,60,67,.12) !important; }
html body .tsCineHost .tsReleaseHost[data-ts-theme="Bright"] .tsSsDone { background:#1c1c1e !important; color:#fff !important; }

/* =============================================================
   PREMIUM LAYER — episode ribbon, value recap sheet
   ============================================================= */
.tsSpotRibbon {
    position:absolute; z-index:60; left:50%; top:calc(env(safe-area-inset-top,0px) + 64px);
    transform:translateX(-50%);
    display:flex; align-items:center; gap:8px; white-space:nowrap;
    padding:8px 14px 8px 8px; border-radius:999px;
    background:rgba(20,20,27,.82);
    backdrop-filter:saturate(180%) blur(20px); -webkit-backdrop-filter:saturate(180%) blur(20px);
    border:.5px solid rgba(255,199,107,.35);
    box-shadow:0 12px 30px rgba(0,0,0,.45);
    font:600 13px/1.2 var(--ts-font); color:#fff; pointer-events:none;
    animation:tsSpotRibbon 3.6s var(--ts-spring) both;
}
.tsSpotRibbon b {
    font-weight:800; font-size:11px; letter-spacing:.08em; color:#0a0a0f;
    background:linear-gradient(100deg,var(--ts-gold),var(--ts-ember2)); padding:4px 8px; border-radius:999px;
}
.tsSpotRibbon span { color:var(--ts-text2); }
@keyframes tsSpotRibbon {
    0%{opacity:0;transform:translate(-50%,-16px) scale(.9)}
    12%{opacity:1;transform:translate(-50%,0) scale(1)}
    85%{opacity:1;transform:translate(-50%,0)}
    100%{opacity:0;transform:translate(-50%,-10px)}
}

.tsSpotSheetScrim {
    position:absolute; inset:0; z-index:2147482000;
    background:rgba(0,0,0,.5);
    display:flex; align-items:flex-end; justify-content:center;
    animation:tsCineFadeIn .3s ease both;
    font-family:var(--ts-font);
}
.tsSpotSheetScrim.isLeaving { animation:tsSpotFadeOut .3s ease forwards; }
@keyframes tsSpotFadeOut { to{opacity:0} }
.tsSpotSheet {
    position:relative; box-sizing:border-box; width:100%; max-width:430px; max-height:92%;
    overflow-y:auto; overscroll-behavior:contain;
    padding:8px 20px calc(20px + env(safe-area-inset-bottom,0px));
    border-radius:28px 28px 0 0;
    background:
        radial-gradient(120% 50% at 50% 0%,rgba(255,150,90,.22),transparent 60%),
        linear-gradient(180deg,#1c1c26,#0e0e14 60%);
    color:#fff; text-align:center;
    box-shadow:0 -20px 60px rgba(0,0,0,.6);
    animation:tsSpotSheetUp .55s var(--ts-spring) both;
}
.tsSpotSheetScrim.isLeaving .tsSpotSheet { animation:tsSpotSheetDown .3s var(--ts-spring) forwards; }
@keyframes tsSpotSheetUp { from{transform:translateY(100%)} to{transform:none} }
@keyframes tsSpotSheetDown { to{transform:translateY(100%)} }
.tsSpotSheet * { box-sizing:border-box; }
.tsSpotGrabber { width:36px; height:5px; border-radius:3px; background:rgba(235,235,245,.3); margin:0 auto 14px; }
.tsSpotClose {
    position:absolute; right:14px; top:14px; width:30px; height:30px; border-radius:50%;
    border:0; background:rgba(118,118,128,.3); color:rgba(235,235,245,.7);
    font:600 15px/1 var(--ts-font); cursor:pointer; display:grid; place-items:center;
}
.tsSpotClose::after { content:""; position:absolute; inset:-7px; } /* 44pt hit area */
.tsSpotHeroOrb {
    width:84px; height:84px; margin:10px auto 14px; border-radius:50%;
    background:radial-gradient(circle at 34% 30%,#fff6dc 0%,var(--ts-gold) 30%,var(--ts-ember2) 62%,var(--ts-ember) 100%);
    box-shadow:0 0 40px rgba(255,170,90,.55),inset -8px -10px 22px rgba(120,20,60,.4);
    animation:tsCineDrop .9s cubic-bezier(.3,1.5,.5,1) .05s both,tsSpotBreath 10s ease-in-out 1s infinite;
}
.tsSpotEyebrow { font:800 12px/1 var(--ts-font); letter-spacing:.16em; color:var(--ts-gold); }
.tsSpotTitle { margin:8px 0 6px; font:800 28px/1.15 var(--ts-font); letter-spacing:-.02em; }
.tsSpotLead { margin:0 auto 18px; max-width:320px; font:400 15px/1.45 var(--ts-font); color:var(--ts-text2); }
.tsSpotStats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:0 0 18px; }
.tsSpotStat {
    padding:12px 6px; border-radius:16px; background:rgba(255,255,255,.06);
    border:.5px solid rgba(255,255,255,.08);
    animation:tsSpotTitleRise .7s var(--ts-spring) both;
}
.tsSpotStat:nth-child(2){animation-delay:.08s} .tsSpotStat:nth-child(3){animation-delay:.16s}
.tsSpotStat strong { display:block; font:800 24px/1.1 var(--ts-font); font-variant-numeric:tabular-nums; color:#fff; }
.tsSpotStat span { display:block; margin-top:4px; font:500 11px/1.25 var(--ts-font); color:var(--ts-text2); }
.tsSpotPerks { list-style:none; margin:0 0 20px; padding:0; text-align:left; display:flex; flex-direction:column; gap:12px; }
.tsSpotPerks li { display:flex; align-items:flex-start; gap:12px; font:500 15px/1.35 var(--ts-font); color:#fff; }
.tsSpotPerks li::before {
    content:"✓"; flex:0 0 24px; height:24px; border-radius:50%; display:grid; place-items:center;
    font:800 13px/1 var(--ts-font); color:#0a0a0f;
    background:linear-gradient(135deg,var(--ts-gold),var(--ts-ember2));
}
.tsSpotCta {
    position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center;
    width:100%; min-height:52px; border:0; border-radius:14px; cursor:pointer;
    background:linear-gradient(100deg,var(--ts-ember),var(--ts-ember2) 60%,var(--ts-gold));
    color:#fff; font:700 17px/1 var(--ts-font);
    box-shadow:0 12px 34px rgba(255,61,85,.35);
    transition:transform .45s var(--ts-bounce); text-decoration:none;
}
.tsSpotCta::after {
    content:""; position:absolute; top:0; bottom:0; width:35%; left:-50%;
    background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);
    animation:tsCineSweep 4s ease-in-out infinite;
}
.tsSpotCta:active, .tsSpotLater:active { transform:scale(.96); transition-duration:.08s; }
.tsSpotLater {
    width:100%; min-height:48px; margin-top:8px; border:0; border-radius:14px; cursor:pointer;
    background:rgba(118,118,128,.2); color:#fff; font:600 17px/1 var(--ts-font);
    transition:transform .45s var(--ts-bounce);
}
.tsSpotFine { margin:12px 0 0; font:400 12px/1.4 var(--ts-font); color:rgba(235,235,245,.45); }
.tsSpotMember {
    display:inline-flex; align-items:center; gap:6px; margin-bottom:6px; padding:5px 10px; border-radius:999px;
    font:800 11px/1 var(--ts-font); letter-spacing:.1em; color:#0a0a0f;
    background:linear-gradient(100deg,var(--ts-gold),var(--ts-ember2));
}
.tsSpotCta:focus-visible,.tsSpotLater:focus-visible,.tsSpotClose:focus-visible { outline:2px solid var(--ts-sky); outline-offset:2px; }

@media (max-height:640px) {
    .tsSpotHeroOrb { width:60px; height:60px; margin:4px auto 10px; }
    .tsSpotTitle { font-size:24px; }
    .tsSpotPerks { gap:8px; margin-bottom:14px; }
}
@media (prefers-reduced-motion:reduce) {
    .tsCineHost .tsCineAmbient > span,
    html body .tsCineHost .tsArcade .releaseHeaderCenter .releaseTitleMain,
    html body .tsCineHost .tsArcade.stage-input .releaseComposer .releaseInputWrap,
    html body .tsCineHost .tsArcade .releaseCompleteCard,
    html body .tsCineHost .tsArcade .releaseCompleteCard::before,
    html body .tsCineHost .tsArcade .releaseCompleteCard > strong,
    html body .tsCineHost .tsSsPanel,
    .tsSpotRibbon, .tsSpotSheet, .tsSpotSheetScrim, .tsSpotHeroOrb, .tsSpotStat, .tsSpotCta::after {
        animation:none !important;
    }
    .tsSpotRibbon { display:none; }
}

        `}</style>
    )
}

// ─────────────────────────────────────────────────────────────
// SPOTLIGHT PREMIUM — episode tracking, value recap, offer sheet
// ─────────────────────────────────────────────────────────────
const RITUALS_DONE_KEY = "thinkstill_rituals_done_v1"
const OFFER_SEEN_KEY = "thinkstill_premium_offer_seen_v1"
const RELEASE_SCORE_KEY = "__ts_release_arcade_score_v1"
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

type RitualLog = { total: number; months: Record<string, number> }

function monthKey() {
    const d = new Date()
    return `${d.getFullYear()}-${d.getMonth() + 1}`
}

function readRitualLog(): RitualLog {
    try {
        const raw = window.localStorage.getItem(RITUALS_DONE_KEY)
        const prev = raw ? JSON.parse(raw) : null
        return {
            total: Number(prev?.total) || 0,
            months:
                prev?.months && typeof prev.months === "object"
                    ? prev.months
                    : {},
        }
    } catch (_) {
        return { total: 0, months: {} }
    }
}

// Counts finished rituals overall and per calendar month. Only ever goes up.
function recordRitualDone(): RitualLog {
    const log = readRitualLog()
    const key = monthKey()
    const next = {
        total: log.total + 1,
        months: { [key]: (Number(log.months[key]) || 0) + 1 },
    }
    try {
        window.localStorage.setItem(RITUALS_DONE_KEY, JSON.stringify(next))
    } catch (_) {}
    return next
}

function readStillScore(): number {
    try {
        return Math.max(
            0,
            Math.round(
                Number(window.localStorage.getItem(RELEASE_SCORE_KEY)) || 0
            )
        )
    } catch (_) {
        return 0
    }
}

function offerSeenThisSession(): boolean {
    try {
        return window.sessionStorage.getItem(OFFER_SEEN_KEY) === "1"
    } catch (_) {
        return false
    }
}

function markOfferSeen() {
    try {
        window.sessionStorage.setItem(OFFER_SEEN_KEY, "1")
    } catch (_) {}
}

// Watches the engine's DOM for the ritual-complete card opening and closing,
// and for the support dialog (which permanently silences offers this session).
function useRitualMoments(
    hostRef: React.RefObject<HTMLDivElement>,
    enabled: boolean,
    onComplete: (ritualName: string) => void,
    onCompleteClosed: () => void,
    onSupportSeen: () => void
) {
    const handlers = React.useRef({ onComplete, onCompleteClosed, onSupportSeen })
    handlers.current = { onComplete, onCompleteClosed, onSupportSeen }

    React.useEffect(() => {
        const host = hostRef.current
        if (!enabled || !host) return
        let open = !!host.querySelector(".releaseCompleteOverlay")
        let frame = 0
        const check = () => {
            frame = 0
            if (host.querySelector(".tsReleaseSupportOverlay"))
                handlers.current.onSupportSeen()
            const card = host.querySelector(".releaseCompleteOverlay")
            if (card && !open) {
                open = true
                const name =
                    card.querySelector(".releaseCompleteCard > strong")
                        ?.textContent || ""
                handlers.current.onComplete(name.trim())
            } else if (!card && open) {
                open = false
                handlers.current.onCompleteClosed()
            }
        }
        const observer = new MutationObserver(() => {
            if (!frame) frame = requestAnimationFrame(check)
        })
        observer.observe(host, { childList: true, subtree: true })
        return () => {
            observer.disconnect()
            if (frame) cancelAnimationFrame(frame)
        }
    }, [hostRef, enabled])
}

function EpisodeRibbon({ episode }: { episode: number }) {
    const month = MONTHS[new Date().getMonth()]
    return (
        <div className="tsSpotRibbon" role="status" aria-live="polite">
            <b>EPISODE {episode}</b>
            Ritual complete <span>· your {month} season</span>
        </div>
    )
}

function PremiumSheet({
    member,
    days,
    price,
    perks,
    premiumUrl,
    manageUrl,
    onClose,
}: {
    member: boolean
    days: number
    price: string
    perks: string[]
    premiumUrl: string
    manageUrl: string
    onClose: () => void
}) {
    const [leaving, setLeaving] = React.useState(false)
    const sheetRef = React.useRef<HTMLDivElement>(null)
    const ctaRef = React.useRef<HTMLButtonElement>(null)
    const log = React.useMemo(readRitualLog, [])
    const score = React.useMemo(readStillScore, [])
    const reduced = React.useMemo(prefersReducedMotion, [])
    const thisMonth = Number(log.months[monthKey()]) || 0

    const close = React.useCallback(() => {
        setLeaving((already) => {
            if (!already) window.setTimeout(onClose, reduced ? 0 : 280)
            return true
        })
    }, [onClose, reduced])

    React.useEffect(() => {
        const previous = document.activeElement as HTMLElement | null
        ctaRef.current?.focus({ preventScroll: true })
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation()
                close()
            }
            if (event.key !== "Tab" || !sheetRef.current) return
            const items = Array.from(
                sheetRef.current.querySelectorAll<HTMLElement>("button, a[href]")
            )
            if (!items.length) return
            const first = items[0],
                last = items[items.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        document.addEventListener("keydown", onKey, true)
        return () => {
            document.removeEventListener("keydown", onKey, true)
            previous?.focus?.({ preventScroll: true })
        }
    }, [close])

    const openUrl = (url: string) => {
        if (url) window.open(url, "_blank", "noopener,noreferrer")
    }

    return (
        <div
            className={`tsSpotSheetScrim${leaving ? " isLeaving" : ""}`}
            onClick={close}
        >
            <div
                className="tsSpotSheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tsSpotTitle"
                ref={sheetRef}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="tsSpotGrabber" aria-hidden="true" />
                <button
                    type="button"
                    className="tsSpotClose"
                    aria-label="Close"
                    onClick={close}
                >
                    ✕
                </button>
                <div className="tsSpotHeroOrb" aria-hidden="true" />
                {member ? (
                    <div className="tsSpotMember">✦ PREMIUM MEMBER</div>
                ) : (
                    <div className="tsSpotEyebrow">THINKSTILL PREMIUM</div>
                )}
                <h2 className="tsSpotTitle" id="tsSpotTitle">
                    {member ? "Your season so far" : "Your calm, uncut."}
                </h2>
                <p className="tsSpotLead">
                    {member
                        ? "Every ritual here is yours. This is what showing up for yourself looks like."
                        : "You’ve already started something good. Premium gives it room to grow."}
                </p>

                <div className="tsSpotStats">
                    <div className="tsSpotStat">
                        <strong>{thisMonth}</strong>
                        <span>rituals this month</span>
                    </div>
                    <div className="tsSpotStat">
                        <strong>{Math.max(days, 1)}</strong>
                        <span>days showing up</span>
                    </div>
                    <div className="tsSpotStat">
                        <strong>{score}</strong>
                        <span>STILL earned</span>
                    </div>
                </div>

                {perks.length > 0 && (
                    <ul
                        className="tsSpotPerks"
                        aria-label={
                            member ? "Included in your plan" : "Premium includes"
                        }
                    >
                        {perks.map((perk) => (
                            <li key={perk}>{perk}</li>
                        ))}
                    </ul>
                )}

                {member ? (
                    <>
                        <button
                            type="button"
                            className="tsSpotCta"
                            ref={ctaRef}
                            onClick={close}
                        >
                            Keep going
                        </button>
                        {manageUrl && (
                            <button
                                type="button"
                                className="tsSpotLater"
                                onClick={() => openUrl(manageUrl)}
                            >
                                Manage subscription
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            className="tsSpotCta"
                            ref={ctaRef}
                            onClick={() => {
                                openUrl(premiumUrl)
                                close()
                            }}
                        >
                            {price
                                ? `Start Premium · ${price}`
                                : "Start Premium"}
                        </button>
                        <button
                            type="button"
                            className="tsSpotLater"
                            onClick={close}
                        >
                            Not now
                        </button>
                        <p className="tsSpotFine">
                            Cancel anytime. Your free rituals stay free.
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// DEFAULT EXPORT — place this on the Framer canvas
// ─────────────────────────────────────────────────────────────
export default function ThinkStillReleaseCinematic(props: any) {
    const {
        cineIntro = true,
        cineAmbient = true,
        cineGrain = true,
        isPremium = false,
        premiumOffer = true,
        premiumOfferAfter = 2,
        premiumUrl = "",
        premiumManageUrl = "",
        premiumPrice = "",
        premiumPerks = "",
        episodeRibbon = true,
        ...rest
    } = props

    const isCanvas =
        typeof window !== "undefined" &&
        RenderTarget.current() === RenderTarget.canvas

    const hostRef = React.useRef<HTMLDivElement>(null)
    const [days, setDays] = React.useState(0)
    const [showIntro, setShowIntro] = React.useState(false)
    const [episode, setEpisode] = React.useState(0)
    const [ribbonKey, setRibbonKey] = React.useState(0)
    const [sheetOpen, setSheetOpen] = React.useState(false)
    const offerPending = React.useRef(false)
    const supportSeen = React.useRef(false)

    const perks = React.useMemo(
        () =>
            String(premiumPerks || "")
                .split("|")
                .map((perk) => perk.trim())
                .filter(Boolean),
        [premiumPerks]
    )

    React.useEffect(() => {
        if (isCanvas) return
        setDays(recordVisitDay())
        if (cineIntro && !introAlreadySeen()) setShowIntro(true)
    }, [isCanvas, cineIntro])

    React.useEffect(() => {
        if (!episodeRibbon || !ribbonKey) return
        const timer = window.setTimeout(() => setRibbonKey(0), 3700)
        return () => window.clearTimeout(timer)
    }, [ribbonKey, episodeRibbon])

    useRitualMoments(
        hostRef,
        !isCanvas,
        () => {
            const log = recordRitualDone()
            setEpisode(log.total)
            setRibbonKey((k) => k + 1)
            if (
                !isPremium &&
                premiumOffer &&
                !supportSeen.current &&
                !offerSeenThisSession() &&
                log.total >= Math.max(1, Number(premiumOfferAfter) || 1)
            ) {
                offerPending.current = true
            }
        },
        () => {
            // Offer only after the person has finished with the completion
            // card, never on top of it, and never once support was shown.
            if (!offerPending.current || supportSeen.current) return
            window.setTimeout(() => {
                const host = hostRef.current
                if (!offerPending.current || supportSeen.current || !host)
                    return
                const active = document.activeElement
                const busy =
                    host.querySelector(
                        ".tsReleaseSupportOverlay, .releaseCompleteOverlay, .tsArcade.stage-play, .eosCheckIn:not([data-step='1'])"
                    ) ||
                    (active instanceof HTMLElement &&
                        host.contains(active) &&
                        /^(INPUT|TEXTAREA)$/.test(active.tagName))
                // Busy: they went straight into another ritual or are
                // mid check-in. Stay pending for the next natural pause.
                if (busy) return
                offerPending.current = false
                markOfferSeen()
                setSheetOpen(true)
            }, 900)
        },
        () => {
            supportSeen.current = true
            offerPending.current = false
            setSheetOpen(false)
        }
    )

    const finishIntro = React.useCallback(() => {
        markIntroSeen()
        setShowIntro(false)
    }, [])

    return (
        <div className="tsCineHost" ref={hostRef}>
            <ThinkStillReleaseRituals
                {...rest}
                __premiumMember={!!isPremium}
                __onPremiumOpen={() => setSheetOpen(true)}
            />
            {cineAmbient && (
                <div className="tsCineAmbient" aria-hidden="true">
                    <span className="key" />
                    <span className="cyan" />
                    <span className="violet" />
                </div>
            )}
            {cineAmbient && (
                <div className="tsCineVignette" aria-hidden="true" />
            )}
            {cineGrain && <div className="tsCineGrain" aria-hidden="true" />}
            <CinematicStyles />
            {episodeRibbon && ribbonKey > 0 && episode > 0 && (
                <EpisodeRibbon key={ribbonKey} episode={episode} />
            )}
            {sheetOpen && (
                <PremiumSheet
                    member={!!isPremium}
                    days={days}
                    price={premiumPrice}
                    perks={perks}
                    premiumUrl={premiumUrl}
                    manageUrl={premiumManageUrl}
                    onClose={() => setSheetOpen(false)}
                />
            )}
            {showIntro && <CinematicIntro days={days} onDone={finishIntro} />}
        </div>
    )
}

addPropertyControls(ThinkStillReleaseCinematic, {
    cineIntro: {
        type: ControlType.Boolean,
        title: "Cinematic intro",
        defaultValue: true,
    },
    cineAmbient: {
        type: ControlType.Boolean,
        title: "Ambient light",
        defaultValue: true,
    },
    cineGrain: {
        type: ControlType.Boolean,
        title: "Film grain",
        defaultValue: true,
    },
    episodeRibbon: {
        type: ControlType.Boolean,
        title: "Episode ribbon",
        defaultValue: true,
    },
    isPremium: {
        type: ControlType.Boolean,
        title: "Premium member",
        defaultValue: false,
    },
    premiumOffer: {
        type: ControlType.Boolean,
        title: "Premium offer",
        defaultValue: true,
        hidden: (p: any) => !!p.isPremium,
    },
    premiumOfferAfter: {
        type: ControlType.Number,
        title: "Offer after",
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 2,
        unit: " rituals",
        hidden: (p: any) => !!p.isPremium || !p.premiumOffer,
    },
    premiumPrice: {
        type: ControlType.String,
        title: "Price label",
        defaultValue: "",
        placeholder: "$7.99/month",
        hidden: (p: any) => !!p.isPremium,
    },
    premiumUrl: {
        type: ControlType.String,
        title: "Checkout link",
        defaultValue: "",
        hidden: (p: any) => !!p.isPremium,
    },
    premiumManageUrl: {
        type: ControlType.String,
        title: "Manage link",
        defaultValue: "",
        hidden: (p: any) => !p.isPremium,
    },
    premiumPerks: {
        type: ControlType.String,
        title: "Perks ( | split)",
        defaultValue: "",
        placeholder: "Every ritual unlocked | New rituals monthly",
        displayTextArea: true,
    },
    eosShowGameMenu: {
        type: ControlType.Boolean,
        title: "Ritual menu",
        defaultValue: false,
    },
    title: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "EMOTIONAL RELEASE CONSOLE",
    },
    accent: {
        type: ControlType.Color,
        title: "Neon 1",
        defaultValue: "#00D9FF",
    },
    accent2: {
        type: ControlType.Color,
        title: "Neon 2",
        defaultValue: "#C000FF",
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },
    soundOn: { type: ControlType.Boolean, title: "SFX on", defaultValue: true },
    hapticsOn: {
        type: ControlType.Boolean,
        title: "Haptics",
        defaultValue: true,
    },
    musicOnDefault: {
        type: ControlType.Boolean,
        title: "Music",
        defaultValue: false,
    },
    musicVolume: {
        type: ControlType.Number,
        title: "Music volume",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.35,
    },
    tapOutBpm: {
        type: ControlType.Number,
        title: "Tap BPM",
        min: 40,
        max: 180,
        step: 1,
        defaultValue: 92,
    },
    bubbleTextPx: {
        type: ControlType.Number,
        title: "Bubble text",
        min: 1,
        max: 28,
        step: 0.5,
        defaultValue: 16,
    },
    maxWidth: {
        type: ControlType.Number,
        title: "Max width",
        min: 700,
        max: 1600,
        step: 10,
        defaultValue: 1180,
    },
    pixarIntensity: {
        type: ControlType.Number,
        title: "Pixar light",
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
        title: "Light follows",
        defaultValue: true,
    },
    pixarSquash: {
        type: ControlType.Boolean,
        title: "Squash",
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
        title: "Dust",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 14,
    },
    eosCheckin: {
        type: ControlType.Boolean,
        title: "Check-in",
        defaultValue: true,
    },
    eosCrisisLines: {
        type: ControlType.String,
        title: "Support lines",
        defaultValue:
            "Australia · Lifeline 13 11 14 | Anywhere · findahelpline.com",
        displayTextArea: true,
    },
    eosCrisisUrl: {
        type: ControlType.String,
        title: "Support link",
        defaultValue: "https://findahelpline.com",
    },
    eosEmergencyText: {
        type: ControlType.String,
        title: "Emergency text",
        defaultValue: "In immediate danger? Call your local emergency number.",
    },
    eosShareUrl: {
        type: ControlType.String,
        title: "Share link",
        defaultValue: "",
    },
})
