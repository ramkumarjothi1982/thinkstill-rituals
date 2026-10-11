/* ================================================================== */
/* Icons (SF-Symbols-like strokes) + shell context                     */
/* ================================================================== */

function Icon({ name, size = 22, stroke = 1.8 }: { name: string; size?: number; stroke?: number }) {
    const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }
    switch (name) {
        case "back":
            return (
                <svg {...p}>
                    <path d="M14.5 5.5 8 12l6.5 6.5" />
                </svg>
            )
        case "forward":
            return (
                <svg {...p}>
                    <path d="M9.5 5.5 16 12l-6.5 6.5" />
                </svg>
            )
        case "close":
            return (
                <svg {...p}>
                    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
                </svg>
            )
        case "gear":
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="3.1" />
                    <path d="M19.4 15a1 1 0 0 0 .2 1.1l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.91V20a2 2 0 1 1-4 0v-.08a1 1 0 0 0-.67-.95 1 1 0 0 0-1.1.2l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1 1 0 0 0 .2-1.1 1 1 0 0 0-.91-.6H4a2 2 0 1 1 0-4h.08a1 1 0 0 0 .95-.67 1 1 0 0 0-.2-1.1l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.91V4a2 2 0 1 1 4 0v.08a1 1 0 0 0 .67.95 1 1 0 0 0 1.1-.2l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1 1 0 0 0-.2 1.1v.01a1 1 0 0 0 .91.59H20a2 2 0 1 1 0 4h-.08a1 1 0 0 0-.52.15Z" />
                </svg>
            )
        case "music":
            return (
                <svg {...p}>
                    <path d="M9 18V6l10-2v12" />
                    <circle cx="6.5" cy="18" r="2.5" />
                    <circle cx="16.5" cy="16" r="2.5" />
                </svg>
            )
        case "musicOff":
            return (
                <svg {...p}>
                    <path d="M9 13.5V6l10-2v9" />
                    <circle cx="6.5" cy="18" r="2.5" />
                    <path d="M4 4l16 16" />
                </svg>
            )
        case "mic":
            return (
                <svg {...p}>
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
                </svg>
            )
        case "plus":
            return (
                <svg {...p}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
            )
        case "photo":
            return (
                <svg {...p}>
                    <rect x="3.5" y="5" width="17" height="14" rx="3" />
                    <circle cx="9" cy="10" r="1.6" />
                    <path d="M4 17l5-4.5 3.5 3 3-2.5L20 17" />
                </svg>
            )
        case "edit":
            return (
                <svg {...p}>
                    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                    <path d="M13.5 6.5l4 4" />
                </svg>
            )
        case "heart":
            return (
                <svg {...p}>
                    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
                </svg>
            )
        case "info":
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5.5M12 7.6v.2" />
                </svg>
            )
        case "repeat":
            return (
                <svg {...p}>
                    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5" />
                    <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
                </svg>
            )
        case "send":
            return (
                <svg {...p}>
                    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
                </svg>
            )
        case "check":
            return (
                <svg {...p}>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
            )
        case "sun":
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
                </svg>
            )
        case "moon":
            return (
                <svg {...p}>
                    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
                </svg>
            )
        default:
            return null
    }
}

/* ---------- shell context (theme + transitions), provided by the root ---------- */

interface TsmShell {
    theme: ThemeName
    themePref: "auto" | "dark" | "bright"
    setThemePref: (t: "auto" | "dark" | "bright") => void
    eclipse: React.MutableRefObject<EclipseCtl | null>
    reduced: boolean
    titleText: string
    showLibrary: boolean
}

const TsmContext = React.createContext<TsmShell>({
    theme: "dark",
    themePref: "auto",
    setThemePref: () => {},
    eclipse: { current: null },
    reduced: false,
    titleText: "Emotional Release Console",
    showLibrary: false,
})

/** Haptic tick for shell controls (honours the Haptics setting through the console). */
function tsmTick(api: any, ms = 8) {
    try {
        if (api && api.haptics && hasWindow && navigator.vibrate) navigator.vibrate(ms)
    } catch (e) {}
}

/** "THINKSTILL CHOSE POP" → "ThinkStill chose Pop" (Apple-style sentence case, names kept). */
function tsmSentence(s: string): string {
    const raw = String(s || "").trim()
    if (!raw) return ""
    if (/[a-z]/.test(raw)) return raw
    let out = raw.toLowerCase()
    out = out.charAt(0).toUpperCase() + out.slice(1)
    out = out.replace(/thinkstill/gi, "ThinkStill").replace(/\bi\b/g, "I").replace(/\bjpg\b/gi, "JPG").replace(/\bpng\b/gi, "PNG").replace(/\bgif\b/gi, "GIF")
    try {
        for (const g of GAMES || []) {
            const n = String((g && g.name) || "")
            if (n.length > 2 && raw.includes(n)) {
                const title = n.toLowerCase().replace(/(^|[\s/-])([a-z])/g, (m: string, a: string, b: string) => a + b.toUpperCase())
                out = out.split(n.toLowerCase()).join(title)
            }
        }
    } catch (e) {}
    return out
}

/** Title Case for ritual names ("KEEP / DROP" → "Keep / Drop", "X-RAY" → "X-Ray"). */
function tsmName(n: string): string {
    return String(n || "")
        .toLowerCase()
        .replace(/(^|[\s/-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
}
