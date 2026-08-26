import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { AnimatePresence, motion } from "framer-motion"

const BUBBLES = ["GLITCH", "DROP", "STILL", "PATCH", "LOOPIE", "RUSH", "SYNC"]
const DEFAULT_MANIFEST = "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json"

function normalizeText(s: any) {
    return String(s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}
function norm(s: any) {
    return String(s || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9']+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}
function tokens(s: any) {
    return norm(s)
        .split(" ")
        .filter((x: string) => x.length >= 3)
}
function normalizeGitHubUrl(input: any) {
    const url = String(input || "").trim()
    if (!url) return ""
    const m = url.match(
        /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i
    )
    if (m)
        return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`
    return url
        .replace("https://github.com/", "https://raw.githubusercontent.com/")
        .replace("/refs/heads/", "/")
}
function resolveChild(manifestUrl: string, child: string) {
    if (/^https?:\/\//i.test(child || "")) return normalizeGitHubUrl(child)
    const base = manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1)
    return `${base}${String(child || "").replace(/^\.\//, "")}`
}
async function getJson(url: string) {
    const res = await fetch(normalizeGitHubUrl(url), { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`)
    return await res.json()
}
function isVideo(url: string) {
    return /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(String(url || ""))
}

const SAFE_PHRASES = [
    "suicide",
    "kill myself",
    "end my life",
    "self harm",
    "self-harm",
    "hurt myself",
    "overdose",
    "cannot stay safe",
    "can't stay safe",
    "cant stay safe",
    "hurt someone",
    "kill someone",
    "hearing voices",
    "seeing things",
    "can't tell what's real",
    "cant tell whats real",
    "not sure what's real",
    "not sure whats real",
    "severe withdrawal",
    "medical emergency",
    "chest pain",
    "cannot breathe",
    "can't breathe",
    "cant breathe",
]

const DEFAULT_ROUTE_INTENTS: any = {
    overthinking: ["overthinking", "thinking too much", "can't stop thinking", "mental noise", "thoughts racing"],
    rumination: ["rumination", "looping", "same thought", "keep replaying", "stuck in my head", "thought loop"],
    mental_quiet: ["mental quiet", "quiet my mind", "calm my mind", "slow my thoughts", "need quiet"],
    mental_overload: ["mental overload", "overwhelmed", "too much in my head", "brain full", "too many thoughts"],
    inner_speech: ["inner speech", "self talk", "self-talk", "voice in my head", "internal monologue"],
    worry_uncertainty: ["worry", "worried", "uncertain", "uncertainty", "what if", "reassurance", "need certainty"],
    panic_body: ["panic", "panic attack", "body alarm", "heart racing", "adrenaline", "activated", "physical anxiety"],
    grounding: ["grounding", "ground me", "present moment", "feel unreal", "dissociated", "back in the room", "sensory"],
    attention: ["attention", "focus", "distracted", "can't focus", "concentration", "mind wandering"],
    memory_replay: ["memory", "replay", "flashback", "keep remembering", "past event", "mental replay"],
    mental_imagery: ["mental image", "imagery", "picture in my head", "visual thought", "mental movie"],
    decision: ["decision", "can't decide", "choice", "decision pressure", "what should i choose", "indecisive"],
    getting_started: ["procrastination", "can't start", "getting started", "start task", "avoid task"],
    urges_habits: ["urge", "craving", "impulse", "habit", "autopilot", "compulsion", "relapse", "temptation"],
    performance_confidence: ["performance", "confidence", "presentation", "exam", "pressure", "perfectionism"],
    emotion: ["emotion", "feeling", "angry", "anger", "sad", "sadness", "upset", "frustrated"],
    social_communication: ["social pressure", "rejection", "lonely", "loneliness", "conversation", "conflict", "communication", "embarrassed"],
    identity_self: ["identity", "self story", "self-worth", "self worth", "label myself", "shame", "guilt"],
    values_meaning: ["meaning", "values", "purpose", "grief", "loss", "what matters"],
    creativity: ["creative", "creativity", "idea", "brainstorm", "stuck creatively"],
    sleep_winding_down: ["sleep", "can't sleep", "winding down", "bedtime", "insomnia", "rest"],
    working_memory: ["working memory", "remember this", "hold in mind", "mental buffer"],
    beliefs_evidence: ["belief", "evidence", "is this true", "fact check", "thinking error", "bias", "assumption"],
    mind_play_reset: ["mental reset", "mind game", "thought experiment", "play a game", "reset my mind"],
    support_first: ["support first", "need help", "need someone", "stay with me", "human support", "professional support"],
}

function loadSeen(key: string) {
    if (typeof window === "undefined") return new Set<string>()
    try {
        const raw = JSON.parse(window.localStorage.getItem(key) || "[]")
        return new Set<string>(Array.isArray(raw) ? raw : [])
    } catch {
        return new Set<string>()
    }
}
function saveSeen(key: string, seen: Set<string>) {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(key, JSON.stringify(Array.from(seen)))
    } catch {}
}
function isSafetyIntent(query: string, routing: any) {
    const q = norm(query)
    const phrases = routing?.safety_intent_phrases || SAFE_PHRASES
    return phrases.some((p: string) => q.includes(norm(p)))
}
function detectIntents(query: string, routing: any) {
    const q = norm(query)
    const groups = routing?.route_intents || DEFAULT_ROUTE_INTENTS
    return Object.keys(groups).filter((name) =>
        (groups[name] || []).some((a: string) => q.includes(norm(a)))
    )
}
function bubbleHint(query: string, routing: any) {
    const q = norm(query)
    const lang = routing?.bubble_language || {}
    let best = ""
    let bestScore = 0
    Object.keys(lang).forEach((bubble) => {
        let score = 0
        ;(lang[bubble] || []).forEach((term: string) => {
            if (q.includes(norm(term))) score += 1
        })
        if (score > bestScore) {
            bestScore = score
            best = bubble
        }
    })
    return best
}
function scoreRitual(r: any, query: string, routing: any, recentBubbles: string[]) {
    const q = norm(query)
    const qTokens = tokens(q)
    const intents = detectIntents(q, routing)
    const safety = isSafetyIntent(q, routing)
    const support = !!String(r?.support_first || "").trim()
    if (safety && !support) return -100000
    let score = support && !safety ? -18 : 0
    const cats = Array.isArray(r?.route_categories) ? r.route_categories : []
    intents.forEach((intent) => {
        if (cats.includes(intent)) score += 14
        const bias = routing?.intent_bubble_bias?.[intent]
        if (bias?.[r?.bubble]) score += Number(bias[r.bubble] || 0)
    })
    const rk = new Set((r?.routing_keywords || []).map((x: any) => norm(x)))
    qTokens.forEach((t) => {
        if (rk.has(t)) score += 2.3
    })
    const bestFor = norm(r?.best_for)
    qTokens.forEach((t) => {
        if (bestFor.includes(t)) score += 1.2
    })
    const titleMission = norm(`${r?.title || ""} ${r?.mission || ""}`)
    qTokens.forEach((t) => {
        if (titleMission.includes(t)) score += 0.7
    })
    const hint = bubbleHint(q, routing)
    if (hint && hint === r?.bubble) score += 1.5
    if (recentBubbles.includes(r?.bubble)) score -= 0.35
    score += Math.random() * 0.05
    return score
}

function Section({ label, text, special }: any) {
    if (!String(text || "").trim()) return null
    const box = special === "mind"
        ? { border: "1px solid rgba(143,231,236,.18)", background: "radial-gradient(circle at 20% 0%, rgba(143,231,236,.10), rgba(5,14,18,.30))", borderRadius: 16, padding: 16, marginTop: 8 }
        : special === "support"
          ? { border: "1px solid rgba(255,216,141,.24)", background: "rgba(92,64,15,.18)", borderRadius: 16, padding: 16, marginTop: 10 }
          : { borderTop: "1px solid rgba(166,233,239,.10)", padding: "15px 0" }
    return (
        <div style={box as any}>
            <div style={{ fontSize: 10, lineHeight: 1.3, letterSpacing: ".17em", fontWeight: 900, color: special === "support" ? "#ffd88d" : "#8fe7ec", marginBottom: 7 }}>
                {label}
            </div>
            <div style={{ fontSize: "inherit", lineHeight: 1.62, whiteSpace: "pre-wrap", color: "#f3fdff", fontWeight: label === "ONE RULE" ? 760 : 450 }}>
                {normalizeText(text)}
            </div>
        </div>
    )
}

export default function ThinkStillUnifiedChatV6(props: any) {
    const manifestUrl = normalizeGitHubUrl(props.manifestUrl || DEFAULT_MANIFEST)
    const seenKey = "thinkstill_v6_seen_ids"
    const [library, setLibrary] = React.useState<any[]>([])
    const [routing, setRouting] = React.useState<any>({})
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const [current, setCurrent] = React.useState<any>(null)
    const [backStack, setBackStack] = React.useState<any[]>([])
    const [lastSignal, setLastSignal] = React.useState("")
    const [input, setInput] = React.useState("")
    const [recentBubbles, setRecentBubbles] = React.useState<string[]>([])
    const [isListening, setIsListening] = React.useState(false)
    const [overlay, setOverlay] = React.useState<any>(null)
    const [pending, setPending] = React.useState<any>(null)
    const [overlayCounters, setOverlayCounters] = React.useState<any>({})
    const seenRef = React.useRef<Set<string>>(new Set())
    const pendingRef = React.useRef<any>(null)
    const currentRef = React.useRef<any>(null)
    const speechRef = React.useRef<any>(null)
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const overlayTimerRef = React.useRef<any>(null)

    React.useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError("")
        ;(async () => {
            try {
                const m = await getJson(manifestUrl)
                const allFile = m?.files?.all || "rituals.json"
                const routeFile = m?.files?.routing || "routing.json"
                const [ritualPayload, routingPayload] = await Promise.all([
                    getJson(resolveChild(manifestUrl, allFile)),
                    getJson(resolveChild(manifestUrl, routeFile)),
                ])
                if (cancelled) return
                const rows = Array.isArray(ritualPayload)
                    ? ritualPayload
                    : ritualPayload?.rituals || []
                setLibrary(rows)
                setRouting(routingPayload || {})
                seenRef.current = loadSeen(routingPayload?.storage_key || seenKey)
                setLoading(false)
            } catch (e: any) {
                if (cancelled) return
                setError(String(e?.message || e || "Failed to load ritual library"))
                setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [manifestUrl])

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) return
        const rec = new SpeechRecognition()
        rec.lang = "en-AU"
        rec.interimResults = true
        rec.continuous = false
        rec.onstart = () => setIsListening(true)
        rec.onend = () => setIsListening(false)
        rec.onerror = () => setIsListening(false)
        rec.onresult = (event: any) => {
            let text = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
                text += event.results[i][0]?.transcript || ""
            }
            setInput(text.trim())
        }
        speechRef.current = rec
        return () => {
            try { rec.abort() } catch {}
        }
    }, [])

    React.useEffect(() => { currentRef.current = current }, [current])

    React.useEffect(() => {
        return () => {
            if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
        }
    }, [])

    const overlayPool = React.useCallback((bubble: string) => {
        const map: any = {
            GLITCH: [props.glitchOverlay1, props.glitchOverlay2, props.glitchOverlay3, props.glitchOverlay4, props.glitchOverlay5],
            DROP: [props.dropOverlay1, props.dropOverlay2, props.dropOverlay3, props.dropOverlay4, props.dropOverlay5],
            STILL: [props.stillOverlay1, props.stillOverlay2, props.stillOverlay3, props.stillOverlay4, props.stillOverlay5],
            PATCH: [props.patchOverlay1, props.patchOverlay2, props.patchOverlay3, props.patchOverlay4, props.patchOverlay5],
            LOOPIE: [props.loopieOverlay1, props.loopieOverlay2, props.loopieOverlay3, props.loopieOverlay4, props.loopieOverlay5],
            RUSH: [props.rushOverlay1, props.rushOverlay2, props.rushOverlay3, props.rushOverlay4, props.rushOverlay5],
            SYNC: [props.syncOverlay1, props.syncOverlay2, props.syncOverlay3, props.syncOverlay4, props.syncOverlay5],
        }
        return (map[bubble] || []).filter(Boolean)
    }, [props])

    const avatarFor = (bubble: string) => {
        const map: any = {
            GLITCH: props.glitchAvatar,
            DROP: props.dropAvatar,
            STILL: props.stillAvatar,
            PATCH: props.patchAvatar,
            LOOPIE: props.loopieAvatar,
            RUSH: props.rushAvatar,
            SYNC: props.syncAvatar,
        }
        return map[bubble] || props.defaultAvatar || ""
    }

    React.useEffect(() => {
        if (props.overlayPreloadEnabled === false || typeof document === "undefined") return
        BUBBLES.forEach((bubble) => {
            overlayPool(bubble).forEach((url: string) => {
                try {
                    if (isVideo(url)) {
                        const v = document.createElement("video")
                        v.preload = "auto"
                        v.muted = true
                        v.src = url
                        v.load()
                    } else {
                        const img = new Image()
                        img.src = url
                    }
                } catch {}
            })
        })
    }, [overlayPool, props.overlayPreloadEnabled])

    const finishOverlay = React.useCallback(() => {
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
        overlayTimerRef.current = null
        const r = pendingRef.current
        const previous = currentRef.current
        pendingRef.current = null
        setOverlay(null)
        setPending(null)
        if (!r) return
        setBackStack((prev) => previous ? [...prev, previous].slice(-120) : prev)
        setCurrent(r)
    }, [])

    const showRitual = React.useCallback((r: any) => {
        if (!r) return
        const pool = overlayPool(r.bubble)
        if (props.overlayTransitionsEnabled !== false && pool.length) {
            const idx = Number(overlayCounters[r.bubble] || 0)
            const url = String(pool[idx % pool.length] || "")
            setOverlayCounters((prev: any) => ({ ...prev, [r.bubble]: idx + 1 }))
            if (url) {
                pendingRef.current = r
                setPending(r)
                setOverlay({ url, video: isVideo(url), key: `${r.id}-${Date.now()}` })
                const seconds = Number(props.overlayVideoPlaySeconds || 0)
                const imageMs = Number(props.overlayImageHoldMs || 1800)
                if (isVideo(url) && seconds > 0) {
                    overlayTimerRef.current = setTimeout(finishOverlay, seconds * 1000)
                } else if (!isVideo(url)) {
                    overlayTimerRef.current = setTimeout(finishOverlay, imageMs)
                }
                return
            }
        }
        const previous = currentRef.current
        setBackStack((prev) => previous ? [...prev, previous].slice(-120) : prev)
        setCurrent(r)
    }, [overlayPool, props.overlayTransitionsEnabled, props.overlayVideoPlaySeconds, props.overlayImageHoldMs, overlayCounters, finishOverlay])

    const choose = React.useCallback((signal: string) => {
        if (!library.length) return
        const safety = isSafetyIntent(signal, routing)
        let available = library.filter((r) => !seenRef.current.has(r.id))
        if (!available.length) {
            seenRef.current.clear()
            saveSeen(routing?.storage_key || seenKey, seenRef.current)
            available = library.slice()
        }
        const scored = available
            .map((r) => ({ r, score: scoreRitual(r, signal, routing, recentBubbles) }))
            .sort((a, b) => b.score - a.score)
        let selected = scored[0]?.r || null
        if (safety && (!selected || !String(selected?.support_first || "").trim())) {
            const safeRows = library.filter((r) => String(r?.support_first || "").trim())
            selected = safeRows[Math.floor(Math.random() * safeRows.length)] || selected
        }
        if (!selected) return
        seenRef.current.add(selected.id)
        saveSeen(routing?.storage_key || seenKey, seenRef.current)
        setRecentBubbles((prev) => [selected.bubble, ...prev].slice(0, 3))
        showRitual(selected)
    }, [library, routing, recentBubbles, showRitual])

    const enter = () => {
        if (overlay) return
        const q = input.trim()
        if (!q) return
        setLastSignal(q)
        setInput("")
        choose(q)
    }
    const next = () => {
        const q = lastSignal || input.trim()
        if (q) choose(q)
    }
    const back = () => {
        if (!backStack.length) return
        const prev = backStack[backStack.length - 1]
        setBackStack((xs) => xs.slice(0, -1))
        setCurrent(prev)
        pendingRef.current = null
        setOverlay(null)
        setPending(null)
    }
    const reset = () => {
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
        overlayTimerRef.current = null
        seenRef.current.clear()
        if (typeof window !== "undefined") {
            try { window.localStorage.removeItem(routing?.storage_key || seenKey) } catch {}
        }
        setCurrent(null)
        setBackStack([])
        setLastSignal("")
        setInput("")
        setRecentBubbles([])
        pendingRef.current = null
        setOverlay(null)
        setPending(null)
        setTimeout(() => inputRef.current?.focus(), 20)
    }
    const mic = () => {
        const rec = speechRef.current
        if (!rec) return
        try {
            if (isListening) rec.stop()
            else rec.start()
        } catch {}
    }

    const ritualFontSize = Number(props.ritualFontSize || 17)
    const resetFontSize = Number(props.resetFontSize || 13)
    const arrowSize = Number(props.arrowSize || 42)
    const arrowGap = Number(props.arrowGap || 10)
    const avatarUrl = current ? avatarFor(current.bubble) : ""
    const avatarSize = Number(props.avatarSize || 76)
    const avatarX = Number(props.avatarX || 0)
    const avatarY = Number(props.avatarY || 0)
    const overlaySize = Number(props.overlaySize || 72)
    const cropZoom = Number(props.overlayCropZoom || 115) / 100

    return (
        <div style={{ ...props.style, width: "100%", height: "100%", minHeight: 520, overflow: "hidden", position: "relative", display: "grid", gridTemplateRows: "58px minmax(0,1fr) 74px 22px", color: "#eefcff", background: "linear-gradient(180deg, rgba(9,25,31,.98), rgba(3,10,13,.99))", border: "1px solid rgba(166,233,239,.16)", borderRadius: 24, boxShadow: "0 30px 100px rgba(0,0,0,.35)", fontFamily: props.uiFont || "Inter, system-ui, sans-serif" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 16px", borderBottom: "1px solid rgba(166,233,239,.12)" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".17em", color: "#8fe7ec" }}>RITUAL</div>
                <button onClick={reset} style={{ border: 0, background: "transparent", color: "#f4feff", fontWeight: 900, fontSize: resetFontSize, letterSpacing: ".11em", padding: "12px 16px", cursor: "pointer" }}>RESET CONSOLE</button>
                <div />
            </div>

            <div style={{ minHeight: 0, position: "relative", display: "grid", gridTemplateColumns: `${arrowSize}px minmax(0,1fr) ${arrowSize}px`, gap: arrowGap, padding: 14, alignItems: "stretch" }}>
                <button disabled={!backStack.length || !!overlay} onClick={back} aria-label="Previous ritual" style={{ alignSelf: "start", marginTop: 18, width: arrowSize, height: arrowSize, borderRadius: "50%", border: "1px solid rgba(166,233,239,.16)", background: "rgba(5,15,19,.9)", color: "#d1fdff", fontSize: Math.max(24, arrowSize * .72), lineHeight: 1, opacity: backStack.length && !overlay ? 1 : .25, cursor: backStack.length && !overlay ? "pointer" : "default" }}>‹</button>

                <div style={{ minWidth: 0, minHeight: 0, overflowY: "auto", border: "1px solid rgba(166,233,239,.14)", borderRadius: 20, background: "linear-gradient(180deg, rgba(10,24,30,.96), rgba(5,14,18,.98))", padding: "20px 22px 116px", fontSize: ritualFontSize }}>
                    {loading ? (
                        <div style={{ color: "#91a9af", textAlign: "center", marginTop: "22%" }}>Loading 750 rituals…</div>
                    ) : error ? (
                        <div style={{ color: "#ffcfb0", lineHeight: 1.6, padding: 20 }}><b>Ritual library error</b><br />{error}</div>
                    ) : !current ? (
                        <div style={{ maxWidth: 560, margin: "15% auto 0", textAlign: "center" }}>
                            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".18em", color: "#8fe7ec" }}>THINKSTILL</div>
                            <div style={{ fontSize: Math.max(30, ritualFontSize * 2.2), fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1.02, margin: "12px 0" }}>What is your mind doing right now?</div>
                            <div style={{ color: "#91a9af", lineHeight: 1.6 }}>Type it below. ThinkStill will route you to the best unused ritual.</div>
                        </div>
                    ) : (
                        <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
                            <div style={{ color: "#8fe7ec", fontSize: 10, letterSpacing: ".16em", fontWeight: 900 }}>{current.bubble} · {current.play_time} GUIDED RESET</div>
                            <div style={{ fontSize: Math.max(28, ritualFontSize * 2.2), lineHeight: 1.0, fontWeight: 950, letterSpacing: "-.035em", margin: "10px 0 20px" }}>{current.title}</div>
                            <Section label="MISSION" text={current.mission} />
                            <Section label="ONE RULE" text={current.rule} />
                            <Section label="PLAY" text={current.play} />
                            <Section label="TWIST" text={current.twist} />
                            <Section label="WIN" text={current.win} />
                            <Section label="MIND BEND" text={current.mind_bend} special="mind" />
                            <Section label="SUPPORT FIRST" text={current.support_first} special="support" />
                        </motion.div>
                    )}
                </div>

                <button disabled={(!lastSignal && !input.trim()) || !!overlay} onClick={next} aria-label="Next best ritual" style={{ alignSelf: "start", marginTop: 18, width: arrowSize, height: arrowSize, borderRadius: "50%", border: "1px solid rgba(166,233,239,.16)", background: "rgba(5,15,19,.9)", color: "#d1fdff", fontSize: Math.max(24, arrowSize * .72), lineHeight: 1, opacity: (lastSignal || input.trim()) && !overlay ? 1 : .25, cursor: (lastSignal || input.trim()) && !overlay ? "pointer" : "default" }}>›</button>

                <AnimatePresence>
                    {overlay ? (
                        <motion.div key={overlay.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 14 + arrowSize + arrowGap + 4, zIndex: 30, borderRadius: 20, border: "1px solid rgba(166,233,239,.15)", background: "radial-gradient(circle at 50% 42%, #12323b, #020609 74%)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                            <div style={{ width: `${overlaySize}%`, aspectRatio: "1 / 1", overflow: "hidden", borderRadius: props.overlayCropEnabled === false ? 18 : "50%", boxShadow: "0 24px 80px rgba(0,0,0,.45)" }}>
                                {overlay.video ? (
                                    <video key={overlay.url} src={overlay.url} autoPlay muted playsInline preload="auto" loop={Number(props.overlayVideoPlaySeconds || 0) > 0} onEnded={() => { if (Number(props.overlayVideoPlaySeconds || 0) <= 0) finishOverlay() }} onError={finishOverlay} style={{ width: "100%", height: "100%", display: "block", objectFit: props.overlayCropEnabled === false ? "contain" : "cover", transform: props.overlayCropEnabled === false ? "none" : `scale(${cropZoom})`, transformOrigin: "center center" }} />
                                ) : (
                                    <img src={overlay.url} alt="" onError={finishOverlay} style={{ width: "100%", height: "100%", display: "block", objectFit: props.overlayCropEnabled === false ? "contain" : "cover", transform: props.overlayCropEnabled === false ? "none" : `scale(${cropZoom})`, transformOrigin: "center center" }} />
                                )}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {avatarUrl ? (
                <motion.div key={`${current?.bubble}-${avatarUrl}`} initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} style={{ position: "absolute", left: 58 + avatarX, bottom: 82 + avatarY, width: avatarSize, height: avatarSize, borderRadius: "50%", overflow: "hidden", pointerEvents: "none", zIndex: 22, filter: "drop-shadow(0 14px 22px rgba(0,0,0,.35))" }}>
                    <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </motion.div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 9, alignItems: "center", borderTop: "1px solid rgba(166,233,239,.12)", background: "rgba(3,10,13,.98)", padding: "10px 14px", zIndex: 20 }}>
                <button onClick={mic} title="Voice input" style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(166,233,239,.16)", background: isListening ? "rgba(143,231,236,.12)" : "transparent", color: "#8fe7ec", boxShadow: isListening ? "0 0 0 7px rgba(143,231,236,.07)" : "none", cursor: "pointer" }}>●</button>
                <input ref={inputRef} value={input} disabled={!!overlay} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enter() }} placeholder="Tell ThinkStill what is happening…" style={{ width: "100%", minWidth: 0, border: "1px solid rgba(166,233,239,.16)", background: "rgba(255,255,255,.035)", color: "#eefcff", borderRadius: 13, padding: "13px 14px", outline: "none", fontSize: 14, opacity: overlay ? .55 : 1 }} />
                <button onClick={enter} disabled={!input.trim() || loading || !!overlay} style={{ border: "1px solid rgba(143,231,236,.30)", background: "linear-gradient(180deg, rgba(143,231,236,.20), rgba(143,231,236,.07))", color: "#f3feff", borderRadius: 13, padding: "12px 20px", fontWeight: 900, letterSpacing: ".08em", opacity: input.trim() && !loading && !overlay ? 1 : .38, cursor: input.trim() && !loading && !overlay ? "pointer" : "default" }}>ENTER</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#6f878d", letterSpacing: ".04em" }}>
                {current ? `${current.id} · ${current.best_for}` : loading ? "Loading…" : error ? "Check Manifest URL" : `${library.length || 750} rituals ready`}
            </div>
        </div>
    )
}

const fileCtrl = (title: string) => ({ type: ControlType.File, title, allowedFileTypes: ["mp4", "webm", "mov", "m4v", "gif", "png", "jpg", "jpeg", "webp"] })
const imageCtrl = (title: string) => ({ type: ControlType.Image, title })

addPropertyControls(ThinkStillUnifiedChatV6, {
    manifestUrl: { type: ControlType.String, title: "Manifest URL", defaultValue: DEFAULT_MANIFEST },
    ritualFontSize: { type: ControlType.Number, title: "Ritual Font", min: 14, max: 26, step: 1, defaultValue: 17 },
    resetFontSize: { type: ControlType.Number, title: "Reset Font", min: 9, max: 24, step: 1, defaultValue: 13 },
    arrowSize: { type: ControlType.Number, title: "Arrow Size", min: 30, max: 68, step: 1, defaultValue: 42 },
    arrowGap: { type: ControlType.Number, title: "Arrow Gap", min: 0, max: 30, step: 1, defaultValue: 10 },
    defaultAvatar: imageCtrl("Avatar Default"),
    glitchAvatar: imageCtrl("Avatar Glitch"), dropAvatar: imageCtrl("Avatar Drop"), stillAvatar: imageCtrl("Avatar Still"), patchAvatar: imageCtrl("Avatar Patch"), loopieAvatar: imageCtrl("Avatar Loopie"), rushAvatar: imageCtrl("Avatar Rush"), syncAvatar: imageCtrl("Avatar Sync"),
    avatarSize: { type: ControlType.Number, title: "Avatar Size", min: 36, max: 180, step: 1, defaultValue: 76 },
    avatarX: { type: ControlType.Number, title: "Avatar X", min: -250, max: 500, step: 1, defaultValue: 0 },
    avatarY: { type: ControlType.Number, title: "Avatar Y", min: -250, max: 500, step: 1, defaultValue: 0 },
    overlayTransitionsEnabled: { type: ControlType.Boolean, title: "Video Before Ritual", defaultValue: true },
    overlayPreloadEnabled: { type: ControlType.Boolean, title: "Preload Videos", defaultValue: true },
    overlayVideoPlaySeconds: { type: ControlType.Number, title: "Video Play Time", min: 0, max: 30, step: .5, defaultValue: 3, unit: "s" },
    overlayImageHoldMs: { type: ControlType.Number, title: "Image Hold", min: 300, max: 6000, step: 100, defaultValue: 1800, unit: "ms" },
    overlaySize: { type: ControlType.Number, title: "Video Size", min: 20, max: 130, step: 1, defaultValue: 72, unit: "%" },
    overlayCropEnabled: { type: ControlType.Boolean, title: "Circular Crop", defaultValue: true },
    overlayCropZoom: { type: ControlType.Number, title: "Crop Zoom", min: 100, max: 300, step: 1, defaultValue: 115, unit: "%" },

    glitchOverlay1: fileCtrl("Glitch Video 1"), glitchOverlay2: fileCtrl("Glitch Video 2"), glitchOverlay3: fileCtrl("Glitch Video 3"), glitchOverlay4: fileCtrl("Glitch Video 4"), glitchOverlay5: fileCtrl("Glitch Video 5"),
    dropOverlay1: fileCtrl("Drop Video 1"), dropOverlay2: fileCtrl("Drop Video 2"), dropOverlay3: fileCtrl("Drop Video 3"), dropOverlay4: fileCtrl("Drop Video 4"), dropOverlay5: fileCtrl("Drop Video 5"),
    stillOverlay1: fileCtrl("Still Video 1"), stillOverlay2: fileCtrl("Still Video 2"), stillOverlay3: fileCtrl("Still Video 3"), stillOverlay4: fileCtrl("Still Video 4"), stillOverlay5: fileCtrl("Still Video 5"),
    patchOverlay1: fileCtrl("Patch Video 1"), patchOverlay2: fileCtrl("Patch Video 2"), patchOverlay3: fileCtrl("Patch Video 3"), patchOverlay4: fileCtrl("Patch Video 4"), patchOverlay5: fileCtrl("Patch Video 5"),
    loopieOverlay1: fileCtrl("Loopie Video 1"), loopieOverlay2: fileCtrl("Loopie Video 2"), loopieOverlay3: fileCtrl("Loopie Video 3"), loopieOverlay4: fileCtrl("Loopie Video 4"), loopieOverlay5: fileCtrl("Loopie Video 5"),
    rushOverlay1: fileCtrl("Rush Video 1"), rushOverlay2: fileCtrl("Rush Video 2"), rushOverlay3: fileCtrl("Rush Video 3"), rushOverlay4: fileCtrl("Rush Video 4"), rushOverlay5: fileCtrl("Rush Video 5"),
    syncOverlay1: fileCtrl("Sync Video 1"), syncOverlay2: fileCtrl("Sync Video 2"), syncOverlay3: fileCtrl("Sync Video 3"), syncOverlay4: fileCtrl("Sync Video 4"), syncOverlay5: fileCtrl("Sync Video 5"),
})
