// ThinkStill — Emotional Release Console · Mobile V2 ("Eclipse"). Framer code component.
// Paste ALL of this into ONE Framer code file named ThinkStillReleaseMobile, then drag it onto a 390 × 844 frame.
//
// The app (the desktop Release Console engines + the mobile shell, about 1865 KB) is too large for a Framer
// code file, so this small file loads it from the ThinkStill GitHub repository at one exact commit (f003f73438b6),
// checks its SHA-256 fingerprint before running it, and renders it. The code that runs can never change under
// the site; a new build only goes live when this file is updated with a new commit + fingerprint.
// Source: framer/mobile-v2/ (desktop/ = ritual engines, mobile/ = mobile shell, tools/build.mjs = this build).
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"
import * as FramerMotionNS from "framer-motion"

const TSM_APP_URLS = [
    "https://cdn.jsdelivr.net/gh/ramkumarjothi1982/thinkstill-rituals@f003f73438b633ef7f1b80cb8110c0feb73a1596/framer/mobile-v2/release/thinkstill-mobile-app.js",
    "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/f003f73438b633ef7f1b80cb8110c0feb73a1596/framer/mobile-v2/release/thinkstill-mobile-app.js"
]
const TSM_APP_SHA256 = "b49bc44d4355ec33c5fa2fa9847ec3bd002f07e2ad632067d8fcb902c5291587"

let tsmApp: any = null
let tsmError: any = null
let tsmPromise: Promise<any> | null = null

async function tsmSha256(text: string): Promise<string | null> {
    if (typeof crypto === "undefined" || !crypto.subtle || typeof TextEncoder === "undefined") return null
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

function tsmLoadApp(): Promise<any> {
    if (tsmPromise) return tsmPromise
    tsmPromise = (async () => {
        let lastError: any = null
        for (const url of TSM_APP_URLS) {
            try {
                const res = await fetch(url, { cache: "force-cache", credentials: "omit" })
                if (!res.ok) throw new Error("HTTP " + res.status + " from " + url)
                const code = await res.text()
                const hash = await tsmSha256(code)
                if (hash && hash !== TSM_APP_SHA256) throw new Error("fingerprint mismatch from " + url)
                const factory = new Function("var __TS_F;" + code + "\n;return __TS_F")()
                tsmApp = factory(React, () => {}, ControlType, motion, FramerMotionNS)
                return tsmApp
            } catch (e) {
                lastError = e
            }
        }
        throw lastError || new Error("could not load the app")
    })()
    tsmPromise.catch((e) => {
        tsmError = e
        tsmPromise = null
    })
    return tsmPromise
}
if (typeof window !== "undefined") tsmLoadApp().catch(() => {})

/**
 * @framerIntrinsicWidth 390
 * @framerIntrinsicHeight 844
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function ThinkStillReleaseMobile(props: any) {
    const [, setTick] = React.useState(0)
    React.useEffect(() => {
        if (tsmApp) return
        let alive = true
        tsmLoadApp().then(
            () => alive && setTick((n) => n + 1),
            () => alive && setTick((n) => n + 1)
        )
        return () => {
            alive = false
        }
    }, [])
    if (tsmApp) return React.createElement(tsmApp, props)
    const dark = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : true
    const box: React.CSSProperties = {
        width: "100%",
        height: "100%",
        minHeight: 320,
        display: "grid",
        placeItems: "center",
        background: dark ? "#090817" : "#F8F5FF",
        color: dark ? "#F5F3FF" : "#16132B",
        font: '500 15px -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        textAlign: "center",
        padding: 16,
        boxSizing: "border-box",
    }
    const eclipse = React.createElement("div", {
        "aria-hidden": true,
        style: {
            width: 88,
            height: 88,
            margin: "0 auto 22px",
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 32%, #1b1640 0%, #06050f 58%, #000 100%)",
            boxShadow: "0 0 0 2px rgba(255,240,215,.85), 0 0 26px 6px rgba(255,190,120,.45), 0 0 70px 16px rgba(255,170,90,.18)",
        },
    })
    if (tsmError) {
        return React.createElement(
            "div",
            { style: box },
            React.createElement(
                "div",
                null,
                eclipse,
                React.createElement("div", { style: { marginBottom: 14 } }, "ThinkStill couldn't load. Check your connection and try again."),
                React.createElement(
                    "button",
                    {
                        type: "button",
                        onClick: () => {
                            tsmError = null
                            setTick((n) => n + 1)
                            tsmLoadApp().then(
                                () => setTick((n) => n + 1),
                                () => setTick((n) => n + 1)
                            )
                        },
                        style: { font: "600 16px -apple-system, system-ui, sans-serif", height: 48, padding: "0 24px", borderRadius: 24, border: 0, background: "#FFC98B", color: "#2A1708", cursor: "pointer" },
                    },
                    "Try again"
                ),
                React.createElement("div", { style: { marginTop: 12, opacity: 0.55, fontSize: 12 } }, String((tsmError && tsmError.message) || tsmError))
            )
        )
    }
    return React.createElement("div", { style: box, "aria-busy": "true" }, React.createElement("div", null, eclipse, "ThinkStill is getting ready…"))
}

addPropertyControls(ThinkStillReleaseMobile, {
    "theme": {
        "type": ControlType.Enum,
        "title": "Appearance",
        "options": [
            "auto",
            "dark",
            "bright"
        ],
        "optionTitles": [
            "Auto",
            "Dark",
            "Bright"
        ],
        "defaultValue": "auto"
    },
    "title": {
        "type": ControlType.String,
        "title": "Title",
        "defaultValue": "Emotional Release Console"
    },
    "onClose": {
        "type": ControlType.EventHandler,
        "title": "On Close"
    },
    "eosShowGameMenu": {
        "type": ControlType.Boolean,
        "title": "Show ritual library",
        "defaultValue": false
    },
    "soundOn": {
        "type": ControlType.Boolean,
        "title": "SFX On",
        "defaultValue": true
    },
    "hapticsOn": {
        "type": ControlType.Boolean,
        "title": "Haptics",
        "defaultValue": true
    },
    "musicOnDefault": {
        "type": ControlType.Boolean,
        "title": "Music Default",
        "defaultValue": false
    },
    "musicVolume": {
        "type": ControlType.Number,
        "title": "Music Volume",
        "min": 0,
        "max": 1,
        "step": 0.05,
        "defaultValue": 0.35
    },
    "tapOutBpm": {
        "type": ControlType.Number,
        "title": "Tap Out BPM",
        "min": 40,
        "max": 180,
        "step": 1,
        "defaultValue": 92
    },
    "bubbleTextPx": {
        "type": ControlType.Number,
        "title": "Bubble Text",
        "min": 1,
        "max": 28,
        "step": 0.5,
        "defaultValue": 16,
        "unit": "px",
        "displayStepper": true
    },
    "pixarIntensity": {
        "type": ControlType.Number,
        "title": "Pixar Light",
        "min": 0,
        "max": 2,
        "step": 0.05,
        "defaultValue": 0.75
    },
    "pixarWarmth": {
        "type": ControlType.Number,
        "title": "Warmth",
        "min": 0,
        "max": 2,
        "step": 0.05,
        "defaultValue": 1
    },
    "pixarParallax": {
        "type": ControlType.Boolean,
        "title": "Light Follows",
        "defaultValue": true
    },
    "pixarSquash": {
        "type": ControlType.Boolean,
        "title": "Squash & Stretch",
        "defaultValue": true
    },
    "pixarBokeh": {
        "type": ControlType.Number,
        "title": "Bokeh",
        "min": 0,
        "max": 24,
        "step": 1,
        "defaultValue": 6
    },
    "pixarDust": {
        "type": ControlType.Number,
        "title": "Dust Motes",
        "min": 0,
        "max": 40,
        "step": 1,
        "defaultValue": 8
    },
    "eosCheckin": {
        "type": ControlType.Boolean,
        "title": "Emotion Check-in",
        "defaultValue": true
    },
    "eosCrisisLines": {
        "type": ControlType.String,
        "title": "Support Lines",
        "displayTextArea": true,
        "defaultValue": "US · 988 | Canada · 988 | UK & IE · Samaritans 116 123 | Australia · Lifeline 13 11 14 | India · Tele-MANAS 14416 | Anywhere · findahelpline.com"
    },
    "eosCrisisUrl": {
        "type": ControlType.String,
        "title": "Support Link",
        "defaultValue": "https://findahelpline.com"
    },
    "eosEmergencyText": {
        "type": ControlType.String,
        "title": "Emergency Line",
        "defaultValue": "In immediate danger? Call your local emergency number."
    },
    "eosShareUrl": {
        "type": ControlType.String,
        "title": "Share Link",
        "defaultValue": ""
    }
})
