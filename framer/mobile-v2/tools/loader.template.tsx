// ThinkStill Release Console Mobile V2 - Framer code component.
// Paste ALL of this into ONE Framer code file named ThinkStillReleaseMobile, then drag ThinkStillReleaseMobile onto the page.
// The app (about __BYTES__ KB) is too large for a Framer code file, so this small file loads it from the
// ThinkStill GitHub repository (commit __COMMIT__), checks its SHA-256 fingerprint, and runs it.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"
import * as FramerMotionNS from "framer-motion"

const TSM_APP_URLS = __URLS__
const TSM_APP_SHA256 = "__SHA__"

let tsmApp = null
let tsmError = null
let tsmPromise = null
const tsmControls = new Map()
function __tsmAddControls(component, controls) {
    try { tsmControls.set(component, controls) } catch (e) {}
    return addPropertyControls(component, controls)
}
async function tsmSha256(text) {
    if (typeof crypto === "undefined" || !crypto.subtle || typeof TextEncoder === "undefined") return null
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}
function tsmLoadApp() {
    if (tsmPromise) return tsmPromise
    tsmPromise = (async () => {
        let lastError = null
        for (const url of TSM_APP_URLS) {
            try {
                const res = await fetch(url, { cache: "force-cache", credentials: "omit" })
                if (!res.ok) throw new Error("HTTP " + res.status + " from " + url)
                const code = await res.text()
                const hash = await tsmSha256(code)
                if (hash && hash !== TSM_APP_SHA256) throw new Error("fingerprint mismatch from " + url)
                const factory = new Function("var __TS_F;" + code + "\n;return __TS_F")()
                tsmApp = factory(React, __tsmAddControls, ControlType, motion, FramerMotionNS)
                return tsmApp
            } catch (e) {
                lastError = e
            }
        }
        throw lastError || new Error("could not load the app")
    })()
    tsmPromise.catch((e) => { tsmError = e; tsmPromise = null })
    return tsmPromise
}
if (typeof window !== "undefined") tsmLoadApp().catch(() => {})

export default function ThinkStillReleaseMobile(props) {
    const [, setTick] = React.useState(0)
    React.useEffect(() => {
        if (tsmApp) return
        let alive = true
        tsmLoadApp().then(() => alive && setTick((n) => n + 1), () => alive && setTick((n) => n + 1))
        return () => { alive = false }
    }, [])
    if (tsmApp) return React.createElement(tsmApp, props)
    const box = { width: "100%", height: "100%", minHeight: 320, display: "grid", placeItems: "center", background: "#090817", color: "#F5F3FF", font: "500 15px -apple-system, BlinkMacSystemFont, system-ui, sans-serif", textAlign: "center", padding: 16, boxSizing: "border-box" }
    if (tsmError) {
        return React.createElement("div", { style: box },
            React.createElement("div", null,
                React.createElement("div", { style: { marginBottom: 12 } }, "ThinkStill could not load. Check your connection and try again."),
                React.createElement("button", { type: "button", onClick: () => { tsmError = null; setTick((n) => n + 1); tsmLoadApp().then(() => setTick((n) => n + 1), () => setTick((n) => n + 1)) }, style: { font: "600 15px -apple-system, system-ui, sans-serif", padding: "12px 22px", borderRadius: 999, border: 0, background: "#FFC98B", color: "#2A1708", cursor: "pointer" } }, "Try again"),
                React.createElement("div", { style: { marginTop: 12, opacity: 0.6, fontSize: 12 } }, String((tsmError && tsmError.message) || tsmError))))
    }
    return React.createElement("div", { style: box, "aria-busy": "true" }, "ThinkStill is getting ready…")
}

addPropertyControls(ThinkStillReleaseMobile, __CONTROLS__)
