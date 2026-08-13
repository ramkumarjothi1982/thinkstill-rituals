// ===================== PART 1/5 =====================
// ThinkStill — Unified Chat (v40.5.3 · 750 COMPLETE RITUALS · FIXED DATA LOADER)
// ✅ Avatar ALWAYS visible (image OR premium fallback orb)
// ✅ Two-level routing: 22 user-facing errors → 63 precise subpatterns
// ✅ GLOBAL 750-ritual no-replay cycle; reset only after complete exhaustion
// ✅ No manual bubble selection; bubble visuals follow the chosen ritual
// Paste PART 1 → PART 5 into ONE Framer code component file IN ORDER.

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, AnimatePresence } from "framer-motion"

type BubbleKey =
    | "GLITCH"
    | "SYNC"
    | "PATCH"
    | "DROP"
    | "STILL"
    | "RUSH"
    | "LOOPIE"
type BubbleSlug =
    | "glitch"
    | "sync"
    | "patch"
    | "drop"
    | "still"
    | "rush"
    | "loopie"
type OutputAnim = "typewriter" | "none"

const BUBBLE_ORDER: BubbleSlug[] = [
    "glitch",
    "drop",
    "loopie",
    "patch",
    "rush",
    "still",
    "sync",
]

const DEFAULT_MANIFEST_URL =
    "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/manifest.json"

const BUBBLE_LABEL: Record<BubbleSlug, string> = {
    still: "Still",
    patch: "Patch",
    sync: "Sync",
    loopie: "Loopie",
    drop: "Drop",
    rush: "Rush",
    glitch: "Glitch",
}

const BUBBLE_TO_KEY: Record<BubbleSlug, BubbleKey> = {
    glitch: "GLITCH",
    sync: "SYNC",
    patch: "PATCH",
    drop: "DROP",
    still: "STILL",
    rush: "RUSH",
    loopie: "LOOPIE",
}

type ManifestPart = {
    filename?: string
    url?: string
    rows?: number
    bytes?: number
}
type ManifestBubble = { bubble?: BubbleKey; parts?: ManifestPart[] }
type Under25Manifest = {
    meta?: any
    base_url?: string
    bubbles?: ManifestBubble[]
}

type FlatManifestFile = {
    bubble?: string
    bubble_key?: string
    bubbleKey?: string
    bubble_name?: string
    bubbleName?: string
    key?: string
    slug?: string
    filename?: string
    file?: string
    path?: string
    url?: string
    href?: string
    bytes?: number
    rows?: number
    [k: string]: any
}
type FilesStyleManifest = {
    schema?: string
    version?: string
    generated_at?: string
    row_count?: number
    base_url?: string
    baseUrl?: string
    files?: any
    notes?: any
    [k: string]: any
}

type BubbleRitual = {
    id?: string
    b?: string
    r?: number | string

    // engine fields
    name?: string
    challenge_type?: string
    challenge?: string
    domain?: string
    thinking_error?: string
    precise_subpattern?: string
    primary_trigger?: string
    unique_game_move?: string
    coverage_tier?: string
    routing_weight?: number | string
    routing_probability_pct?: number | string
    parent_pool_size?: number | string
    bubble_pool_size?: number | string
    pattern_family?: string
    secondary_patterns?: string
    pattern_type?: string
    recognition_cue?: string
    situation?: string
    immediate_need?: string
    keywords?: string[]
    example_entry?: string
    match_reason?: string
    tie_priority?: number | string
    t?: string
    plain?: string
    safety?: string
    sources?: string[] | string

    ritual_number?: number | string
    ritual_name?: string
    safety_notes?: string
    source_urls?: string[]
    text_default?: string
    text_poetic_action?: string
    text_plain?: string
    poetic_text?: string
    poetic_action_text?: string
    plain_text?: string

    // complete workbook user-facing fields
    trigger_play_time?: string
    goal_why_game_move?: string
    play_the_loop?: string
    potency_stack?: string
    potency_1?: string
    potency_2?: string
    potency_3?: string
    potency_pairs?: string[][]
    win_reward?: string
    formula_flow?: string
    private_share_card?: string
    return_cue?: string

    // ui-parts fields
    title?: string
    text?: string
    bubble?: string
    slug?: string
    version?: string
    count?: number

    [k: string]: any
}

type SavedRitual = {
    id: string
    bubble: BubbleKey
    text: string
    createdAt: number
    sig: string
    challenge?: string
}

function shuffle<T>(arr: T[]) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
function norm(s: string) {
    return (s || "").replace(/\s+/g, " ").trim()
}
function normalizeText(t: string) {
    return (t || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

// Canonical UI-label check: survives BOMs, zero-width chars, punctuation and odd spacing.
function isSafetyLabelLine(value: string) {
    const canonical = String(value || "")
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
        .replace(/[^A-Za-z]/g, "")
        .toUpperCase()
    return canonical === "SAFETY"
}
function hash32(str: string) {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(16).padStart(8, "0")
}
function makeSeed() {
    try {
        const a = new Uint32Array(2)
        crypto.getRandomValues(a)
        return `${a[0].toString(16)}${a[1].toString(16)}`
    } catch {
        return `${Math.random().toString(16).slice(2)}`
    }
}
function safeJsonParse<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}
function fileUrl(v: any): string {
    if (!v) return ""
    if (typeof v === "string") return v.trim()
    const candidate =
        v?.src || v?.url || v?.href || v?.asset?.src || v?.asset?.url
    return typeof candidate === "string" ? candidate.trim() : ""
}

// scrubbers (UI only; never label conditions)
const DIAG_WORD_RE = new RegExp(
    [
        "\\bhallucinat(?:e|ion|ions)\\b",
        "\\bvoices\\b",
        "\\bpsychos(?:is|es)\\b",
        "\\bschizophren(?:ia|ic)\\b",
        "\\bbipolar\\b",
        "\\bptsd\\b",
        "\\bocd\\b",
        "\\badhd\\b",
        "\\bautis(?:m|tic)\\b",
        "\\bdepress(?:ion|ive|ed|ing)\\b",
        "\\banxiet(?:y|ies|ious)\\b",
        "\\bpanic(?:king| attack)?\\b",
        "\\bmanic\\b",
        "\\bsuicid(?:al|e)\\b",
        "\\bself[-\\s]?harm\\b",
        "\\bdiagnos(?:is|ed|e)\\b",
        "\\bdisorder\\b",
        "\\bmental\\s+health\\b",
        "\\bpsychiatr(?:y|ic)\\b",
        "\\btherap(?:y|ist|eutic)\\b",
        "\\bclinical\\b",
        "\\bsymptom(?:s)?\\b",
        "\\btrauma\\b",
        "\\bdissociat(?:e|ion|ing)\\b",
        "\\bcompulsion(?:s)?\\b",
        "\\bobssess(?:ive|ion|ing)?\\b",
    ].join("|"),
    "i"
)

// Challenge line — RAW user input
function sanitizeChallengeForOutputRaw(input: string) {
    let s = normalizeText(String(input || ""))
        .replace(/\s+/g, " ")
        .trim()
    if (!s) return ""
    const max = 260
    if (s.length > max) s = s.slice(0, max).trim() + "…"
    return s
}
function formatChallengeLineRaw(input: string) {
    const cleaned = sanitizeChallengeForOutputRaw(input)
    if (!cleaned) return ""
    return `Challenge: “${cleaned}”`
}

// intent detectors (routing)
function detectPanicIntent(message: string) {
    const t = (message || "").toLowerCase()
    return /(panic|panicking|panic attack|i['’]?m panicking|can['’]?t breathe|cannot breathe|can not breathe|shortness of breath|tight chest|chest tight|racing heart|heart pounding|palpitations|dizzy|lightheaded|shake|shaking|trembling|feel like i['’]?m dying|feel like i['’]?m going to die|faint|clammy|sweating|hyperventilat)/.test(
        t
    )
}
function detectAngerIntent(message: string) {
    const t = (message || "").toLowerCase()
    return /(anger|angry|rage|furious|pissed|mad|hate|explode|snap|seeing red|boiling|heated|irritat|resent|fuming|want to scream|want to punch)/.test(
        t
    )
}
function detectFearIntent(message: string) {
    const t = (message || "").toLowerCase()
    // intentionally NOT matching generic "anxious" to reduce misroutes
    return /(afraid|fear|scared|terrified|frightened|unsafe|threat|on edge|dread|anticipat(?:e|ing) danger)/.test(
        t
    )
}
function detectShameIntent(message: string) {
    const t = (message || "").toLowerCase()
    return /(shame|ashamed|embarrass|humiliat|worthless|i['’]?m a failure|i failed|guilt|regret|self[-\s]?hate|not good enough)/.test(
        t
    )
}
function detectLoopIntent(message: string) {
    const t = (message || "").toLowerCase()
    return /(keep thinking|can['’]?t stop thinking|loop|ruminat|replay|obsess|spinning|spiral|overthink|intrusive)/.test(
        t
    )
}
function detectSadHeavyIntent(message: string) {
    const t = (message || "").toLowerCase()
    return /(sad|cry|grief|heavy|weight|drained|tired|hopeless|empty|numb|flat|lonely|heartbroken)/.test(
        t
    )
}
function detectStuckIntent(message: string) {
    const t = (message || "").toLowerCase()
    return /(procrastinat|can['’]?t start|stuck|avoid|no motivation|delay|stall|freeze|can’t begin|cant begin|blocked|can['’]?t move|paralysed|paralyzed)/.test(
        t
    )
}
function detectConfusionIntent(message: string) {
    const t = (message || "").toLowerCase()
    return /(confused|scattered|foggy|too many|noise|out of sync|jitter|desync|overwhelm|overwhelmed|disorganised|disorganized)/.test(
        t
    )
}

function normalizeForNearDuplicate(str: string) {
    let s = (str || "").toLowerCase()
    s = s.replace(/“[^”]{1,48}”/g, "“<id>”")
    s = s.replace(/[0-9a-f]{6,}/g, "<hex>")
    s = s.replace(/\b\d+\s*(seconds|second|minutes|minute)\b/g, "<t>")
    s = s.replace(/[^a-z0-9<>\s]/g, " ")
    s = s.replace(/\s+/g, " ").trim()
    return s
}

// ✅ GLOBAL concept no-repeat
const USED_CONCEPTS_KEY = "__ts_used_concepts_global_v153"
function normalizeConceptLabel(s: string) {
    return (s || "")
        .toLowerCase()
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}
function extractConceptCode(s: string) {
    const m = (s || "").match(/\b[a-z]{2,6}-\d{1,4}\b/i)
    return m ? m[0].toLowerCase() : ""
}
function ritualConceptKey(r: BubbleRitual) {
    const name = String(r?.name ?? r?.ritual_name ?? "").trim()
    const body = String(r?.plain ?? r?.t ?? r?.text_default ?? "").trim()
    const code = extractConceptCode(name) || extractConceptCode(body)
    const label = normalizeConceptLabel(name)
    if (code && label) return `${code}||${label}`
    if (code) return `${code}||`
    if (label) return `||${label}`
    const id = String(r?.id || "").trim()
    const rn = String(r?.r ?? r?.ritual_number ?? "").trim()
    return hash32(`${id}||${rn}`.toLowerCase())
}

// storage
function loadSet(key: string) {
    if (typeof window === "undefined") return new Set<string>()
    try {
        const raw = localStorage.getItem(key) || "[]"
        const arr = JSON.parse(raw)
        return new Set<string>(Array.isArray(arr) ? arr : [])
    } catch {
        return new Set<string>()
    }
}
function saveSet(key: string, set: Set<string>, cap = 100000) {
    if (typeof window === "undefined") return
    try {
        const arr = Array.from(set).slice(-cap)
        localStorage.setItem(key, JSON.stringify(arr))
    } catch {}
}
function lsGet<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        const v = JSON.parse(raw)
        return (v ?? fallback) as T
    } catch {
        return fallback
    }
}
function lsSet(key: string, value: any) {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {}
}
function loadUsedConcepts() {
    return loadSet(USED_CONCEPTS_KEY)
}
function saveUsedConcepts(set: Set<string>) {
    saveSet(USED_CONCEPTS_KEY, set, 220000)
}

const RECENT_SIGS_KEY = "__ts_recent_sigs_v153"
const RECENT_CONCEPTS_KEY = "__ts_recent_concepts_v153"

function loadRecentArray(key: string): string[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(key) || "[]"
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? arr.filter(Boolean) : []
    } catch {
        return []
    }
}

function saveRecentArray(key: string, arr: string[], cap = 120) {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(key, JSON.stringify(arr.slice(-cap)))
    } catch {}
}

function pushRecent(key: string, value: string, cap = 120) {
    if (!value) return
    const arr = loadRecentArray(key).filter((x) => x !== value)
    arr.push(value)
    saveRecentArray(key, arr, cap)
}

function makeRecentSigKey(bk: BubbleKey) {
    return `${RECENT_SIGS_KEY}_${bk}`
}
function makeRecentConceptKey(bk: BubbleKey) {
    return `${RECENT_CONCEPTS_KEY}_${bk}`
}
// ===================== PART 2/5 =====================

/* FAST Per-letter RGB Glitch */
const RGBPerLetter = React.memo(function RGBPerLetter({
    text,
    intensity,
    animate,
    rgbSpeedFactor,
}: {
    text: string
    intensity: number
    animate: boolean
    rgbSpeedFactor: number
}) {
    const chars = React.useMemo(() => Array.from(text || ""), [text])
    const i = Math.max(0, Math.min(2, Number(intensity || 1)))
    const speed = Math.max(0.25, Math.min(4, Number(rgbSpeedFactor || 1)))

    return (
        <span style={{ whiteSpace: "pre-wrap" }}>
            {chars.map((c, idx) => {
                if (c === "\n") return <br key={`br-${idx}`} />
                const seed = ((idx + 1) * 1103515245 + 12345) >>> 0
                const d = (seed % 800) / 1000
                const base = 1.5 + ((seed >> 10) % 1200) / 1000
                const dur = base * speed
                const x = 0.9 + 0.7 * i
                const a = 0.22 + 0.14 * i

                return (
                    <span
                        key={`${idx}-${c.charCodeAt(0)}`}
                        style={{
                            display: "inline-block",
                            transform: "translateZ(0)",
                            willChange: animate ? "transform" : undefined,
                            textShadow:
                                i <= 0
                                    ? "none"
                                    : `${x}px 0 rgba(255,90,160,${a}), ${-x}px 0 rgba(90,235,255,${a})`,
                            animation: animate
                                ? `tsRGBJit ${dur}s steps(2,end) infinite`
                                : "none",
                            animationDelay: animate ? `${d}s` : "0s",
                        }}
                    >
                        {c}
                    </span>
                )
            })}
        </span>
    )
})

/* Typewriter */
const MIN_MS_PER_CHAR = 2
function useTypewriter(
    text: string,
    msPerChar: number,
    resetKey: string,
    instant: boolean,
    initialChars = 0,
    onProgress?: (chars: number) => void,
    onDone?: () => void
) {
    const safeInitial = Math.max(
        0,
        Math.min(Number(initialChars || 0), (text || "").length)
    )
    const [out, setOut] = React.useState((text || "").slice(0, safeInitial))
    const doneRef = React.useRef(false)
    const rafRef = React.useRef<number | null>(null)
    const lastTRef = React.useRef(0)
    const accRef = React.useRef(0)

    React.useEffect(() => {
        const t = text || ""
        const startChars = Math.max(
            0,
            Math.min(Number(initialChars || 0), t.length)
        )
        doneRef.current = false
        if (rafRef.current) cancelAnimationFrame(rafRef.current)

        if (instant || !t || Number(msPerChar || 0) <= 0) {
            setOut(t)
            onProgress && onProgress(t.length)
            if (!doneRef.current) {
                doneRef.current = true
                onDone && onDone()
            }
            return
        }

        setOut(t.slice(0, startChars))
        onProgress && onProgress(startChars)
        lastTRef.current = performance.now()
        accRef.current = 0
        let i = startChars
        const step = Math.max(MIN_MS_PER_CHAR, Number(msPerChar || 0))

        const tick = (now: number) => {
            const dt = now - lastTRef.current
            lastTRef.current = now
            accRef.current += dt
            while (accRef.current >= step && i < t.length) {
                accRef.current -= step
                i++
            }
            setOut(t.slice(0, i))
            onProgress && onProgress(i)
            if (i < t.length) rafRef.current = requestAnimationFrame(tick)
            else if (!doneRef.current) {
                doneRef.current = true
                onDone && onDone()
            }
        }

        rafRef.current = requestAnimationFrame(tick)
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [text, msPerChar, resetKey, instant, initialChars, onProgress, onDone])

    return out
}

function AnimatedText({
    text,
    mode,
    runKey,
    msPerChar,
    rgbIntensity,
    performanceMode,
    rgbSpeedFactor,
    initialChars = 0,
    onProgress,
    onDone,
}: {
    text: string
    mode: OutputAnim
    runKey: string
    msPerChar: number
    rgbIntensity: number
    performanceMode: boolean
    rgbSpeedFactor: number
    initialChars?: number
    onProgress?: (chars: number) => void
    onDone?: () => void
}) {
    const instant = mode === "none"
    const typed = useTypewriter(
        text,
        msPerChar,
        runKey,
        instant,
        initialChars,
        onProgress,
        onDone
    )
    const render = (s: string) => (
        <RGBPerLetter
            text={s}
            intensity={rgbIntensity}
            animate={!performanceMode}
            rgbSpeedFactor={rgbSpeedFactor}
        />
    )
    if (mode === "typewriter")
        return <span style={{ whiteSpace: "pre-wrap" }}>{render(typed)}</span>
    return <span style={{ whiteSpace: "pre-wrap" }}>{render(text)}</span>
}

/* GitHub raw URL normalizer + fetch */
function normalizeLibraryUrl(url: string) {
    let u = (url || "").trim()
    if (!u) return ""

    const blobMatch = u.match(
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i
    )
    if (blobMatch) {
        const [, user, repo, branch, path] = blobMatch
        u = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`
    }
    u = u.replace(
        /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/refs\/heads\/([^/]+)\//i,
        "raw.githubusercontent.com/$1/$2/$3/"
    )
    u = u.replace("/refs/heads/", "/")
    return u
}
function joinUrl(base: string, path: string) {
    const b = (base || "").replace(/\/+$/, "")
    const p = (path || "").replace(/^\/+/, "")
    return `${b}/${p}`
}
function resolvePartUrl(
    manifestUrl: string,
    manifest: Under25Manifest,
    p: ManifestPart
) {
    const direct = normalizeLibraryUrl(String(p?.url || ""))
    if (direct) return direct

    const mu = normalizeLibraryUrl(manifestUrl)
    const i = mu.lastIndexOf("/")
    const folder = i >= 0 ? mu.slice(0, i) : mu
    const filename = String(p?.filename || "")
    const baseRaw = String(manifest?.base_url || "").trim()

    // A relative base_url belongs to the manifest's GitHub folder, not to the
    // Framer page. Resolving "./" against window.location caused the browser to
    // request /rituals_*.json from Framer and return an HTML 404 page.
    if (baseRaw) {
        const baseFromManifest = normalizeLibraryUrl(baseRaw)
        if (/^https?:\/\//i.test(baseFromManifest))
            return joinUrl(baseFromManifest, filename)

        const relativeBase = baseFromManifest
            .replace(/^\.\//, "")
            .replace(/^\/+|\/+$/g, "")
        return relativeBase
            ? joinUrl(joinUrl(folder, relativeBase), filename)
            : joinUrl(folder, filename)
    }

    return joinUrl(folder, filename)
}
async function fetchJson(
    url: string
): Promise<{ ok: boolean; json?: any; diag?: string }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    const u = normalizeLibraryUrl(String(url || ""))

    try {
        const res = await fetch(u, {
            cache: "no-store",
            signal: controller.signal,
        })
        const ct = res.headers.get("content-type") || ""
        if (!res.ok) {
            let snippet = ""
            try {
                const t = await res.text()
                snippet = t.slice(0, 220)
            } catch {}
            return {
                ok: false,
                diag: `Fetch failed (${res.status})\n${u}\n\n${ct}\n${snippet || ""}`,
            }
        }
        const text = await res.text()
        const j = safeJsonParse<any>(text)
        if (!j)
            return {
                ok: false,
                diag: `JSON parse failed\n${u}\n\n${text.slice(0, 220)}`,
            }
        return { ok: true, json: j }
    } catch (e: any) {
        return {
            ok: false,
            diag: `Fetch exception\n${u}\n\n${String(e?.message || e)}`,
        }
    } finally {
        clearTimeout(timeout)
    }
}
// ===================== PART 3/5 =====================

/* Manifest normalizer */
function inferBubbleKeyFromAny(x: any): BubbleKey | null {
    const direct = String(
        x?.bubble ||
            x?.bubble_key ||
            x?.bubbleKey ||
            x?.bubble_name ||
            x?.bubbleName ||
            x?.key ||
            x?.slug ||
            ""
    )
        .trim()
        .toUpperCase()

    const ok = (k: string) =>
        k === "GLITCH" ||
        k === "SYNC" ||
        k === "PATCH" ||
        k === "DROP" ||
        k === "STILL" ||
        k === "RUSH" ||
        k === "LOOPIE"
    if (ok(direct)) return direct as BubbleKey

    const hay = String(
        x?.filename || x?.file || x?.path || x?.url || x?.href || ""
    ).toLowerCase()
    if (hay.includes("glitch")) return "GLITCH"
    if (hay.includes("sync")) return "SYNC"
    if (hay.includes("patch")) return "PATCH"
    if (hay.includes("drop")) return "DROP"
    if (hay.includes("still")) return "STILL"
    if (hay.includes("rush")) return "RUSH"
    if (hay.includes("loopie")) return "LOOPIE"
    return null
}
function explodeFilesAny(filesAny: any): FlatManifestFile[] {
    if (Array.isArray(filesAny)) return filesAny as FlatManifestFile[]
    if (filesAny && typeof filesAny === "object") {
        const out: FlatManifestFile[] = []
        for (const [k, v] of Object.entries(filesAny)) {
            if (typeof v === "string")
                out.push({ key: k, bubble: k, filename: k, url: v })
            else if (v && typeof v === "object") {
                const vv: any = v
                out.push({
                    key: k,
                    bubble: vv.bubble || vv.bubble_key || vv.bubbleName || k,
                    filename: vv.filename || vv.file || vv.path || k,
                    url: vv.url || vv.href || "",
                    bytes: typeof vv.bytes === "number" ? vv.bytes : undefined,
                    rows: typeof vv.rows === "number" ? vv.rows : undefined,
                    ...vv,
                })
            }
        }
        return out
    }
    return []
}
function normalizeManifestForEngine(
    manifestUrl: string,
    raw: any
): Under25Manifest {
    if (raw && Array.isArray(raw.bubbles)) return raw as Under25Manifest

    if (
        raw &&
        raw.bubbles &&
        !Array.isArray(raw.bubbles) &&
        typeof raw.bubbles === "object"
    ) {
        const bubbles: ManifestBubble[] = Object.entries(raw.bubbles)
            .map(([bubble, url]) => ({
                bubble: String(bubble || "").toUpperCase() as BubbleKey,
                parts: url
                    ? [
                          {
                              filename: undefined,
                              url: normalizeLibraryUrl(String(url || "")),
                          },
                      ]
                    : [],
            }))
            .filter((b) => Array.isArray(b.parts) && b.parts.length > 0)

        return {
            meta: {
                project: raw.project,
                version: raw.version,
                format: raw.format,
                counts: raw.counts,
                total: raw.total,
            },
            bubbles,
        }
    }

    const fm = raw as FilesStyleManifest

    // v36.2 one-folder manifest compatibility:
    // { files: { bubbles: { GLITCH: "glitch.json", ... } } }
    const nestedBubbleMap = (fm as any)?.files?.bubbles
    if (
        nestedBubbleMap &&
        !Array.isArray(nestedBubbleMap) &&
        typeof nestedBubbleMap === "object"
    ) {
        const bubbles: ManifestBubble[] = Object.entries(nestedBubbleMap)
            .map(([bubble, fileOrUrl]) => ({
                bubble: String(bubble || "").toUpperCase() as BubbleKey,
                parts: fileOrUrl
                    ? [{ filename: String(fileOrUrl || ""), url: "" }]
                    : [],
            }))
            .filter((b) => Array.isArray(b.parts) && b.parts.length > 0)

        if (bubbles.length) {
            return {
                meta: {
                    schema: fm?.schema,
                    version: fm?.version,
                    generated_at: fm?.generated_at,
                    row_count: fm?.row_count,
                    notes: fm?.notes,
                },
                base_url: fm?.base_url || fm?.baseUrl,
                bubbles,
            }
        }
    }

    const filesArr = explodeFilesAny((fm as any)?.files)
    if (!filesArr.length) return raw as Under25Manifest

    const grouped: Record<BubbleKey, ManifestPart[]> = {
        GLITCH: [],
        SYNC: [],
        PATCH: [],
        DROP: [],
        STILL: [],
        RUSH: [],
        LOOPIE: [],
    }

    const baseFromManifest = normalizeLibraryUrl(
        String(fm?.base_url || fm?.baseUrl || "")
    )
    const mu = normalizeLibraryUrl(String(manifestUrl || ""))
    const i = mu.lastIndexOf("/")
    const folder = i >= 0 ? mu.slice(0, i) : mu

    for (const f of filesArr) {
        const bk = inferBubbleKeyFromAny(f)
        if (!bk) continue
        const filename = String(
            f?.filename || f?.file || f?.path || f?.key || ""
        ).trim()
        const directUrl = normalizeLibraryUrl(String(f?.url || f?.href || ""))

        const url =
            directUrl ||
            (baseFromManifest && filename
                ? joinUrl(baseFromManifest, filename)
                : filename
                  ? joinUrl(folder, filename)
                  : "")

        grouped[bk].push({
            filename: filename || undefined,
            url: url || undefined,
            rows: typeof f?.rows === "number" ? f.rows : undefined,
            bytes: typeof f?.bytes === "number" ? f.bytes : undefined,
        })
    }

    const bubbles: ManifestBubble[] = (Object.keys(grouped) as BubbleKey[])
        .map((bk) => ({ bubble: bk, parts: grouped[bk] }))
        .filter((b) => Array.isArray(b.parts) && b.parts.length > 0)

    return {
        meta: {
            schema: fm?.schema,
            version: fm?.version,
            generated_at: fm?.generated_at,
            row_count: fm?.row_count,
            notes: fm?.notes,
        },
        base_url: baseFromManifest || fm?.base_url || fm?.baseUrl,
        bubbles,
    }
}

/* Auto routing — priority: panic > anger > shame > loop > heavy > stuck > confusion > fear > default glitch */
function autoRouteBubble(message: string): BubbleSlug {
    const t = (message || "").toLowerCase()
    if (detectPanicIntent(t)) return "still"
    if (detectAngerIntent(t)) return "rush"
    if (detectShameIntent(t)) return "patch"
    if (detectLoopIntent(t)) return "loopie"
    if (detectSadHeavyIntent(t)) return "drop"
    if (detectStuckIntent(t)) return "rush"
    if (detectConfusionIntent(t)) return "sync"
    if (detectFearIntent(t)) return "still"
    return "glitch"
}

/* Token scoring */
function tokenize(s: string) {
    return (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean)
        .filter((w) => w.length >= 3)
}
function scoreOverlap(message: string, label: string) {
    const m = new Set(tokenize(message))
    const c = tokenize(label)
    if (!c.length) return 0
    let hit = 0
    for (const w of c) if (m.has(w)) hit++
    const msg = (message || "").toLowerCase()
    if (label && msg.includes(label.toLowerCase())) hit += 4
    return hit
}
function pickFrom<T>(arr: T[], seedHex: string) {
    if (!arr.length) return arr[0] as any
    const h = parseInt(hash32(seedHex).slice(0, 6), 16) || 0
    return arr[h % arr.length]
}

/* Comfort lines (varied) + return cue */
function comfortPrefixVar(
    bubbleKey: BubbleKey,
    level: "none" | "one" | "two",
    msgSeed: string,
    rawMessage: string
) {
    if (level === "none") return ""
    const msg = (rawMessage || "").toLowerCase()

    const by: Record<BubbleKey, { one: string[]; two: string[] }> = {
        STILL: {
            one: [
                "Stay with me. We lower intensity first.",
                "We’re buying you space—right now.",
                "No rush. One steady minute.",
                "We’ll settle the system before anything else.",
                "Small and safe: one breath, then one step.",
            ],
            two: [
                "Stay with me. We lower intensity first.\nYou don’t need to solve anything yet—just stabilize.",
                "We’re buying you space—right now.\nInhale gently… exhale longer… we’re safe here.",
                "No rush. One steady minute.\nFocus on the next 60 seconds only.",
                "We’ll settle the system before anything else.\nThen we choose one clean move.",
                "Small and safe: one breath, then one step.\nWe’re shrinking the problem to a size you can hold.",
            ],
        },
        PATCH: {
            one: [
                "No punishment. Just repair.",
                "You’re not broken. One kind adjustment.",
                "We can soften the self-talk first.",
                "We’ll stitch this gently—no shame required.",
                "Let’s treat you like someone you care about.",
            ],
            two: [
                "No punishment. Just repair.\nOne compassionate move beats perfect performance.",
                "You’re not broken. One kind adjustment.\nWe’ll replace blame with steadiness.",
                "We can soften the self-talk first.\nThen we fix one small thing.",
                "We’ll stitch this gently—no shame required.\nTiny repair, real relief.",
                "Let’s treat you like someone you care about.\nOne gentle step—right now.",
            ],
        },
        SYNC: {
            one: [
                "One clean signal at a time.",
                "We’ll reduce noise and pick an anchor.",
                "Clarity first. Then action.",
                "Let’s bring the system back into alignment.",
                "We’ll simplify until it feels doable.",
            ],
            two: [
                "One clean signal at a time.\nWe’ll pick the simplest thread and follow it.",
                "We’ll reduce noise and pick an anchor.\nBreathe… then choose one signal.",
                "Clarity first. Then action.\nNo sprinting—precision and calm.",
                "Let’s bring the system back into alignment.\nOne thought. One breath. One step.",
                "We’ll simplify until it feels doable.\nLess decisions. More steadiness.",
            ],
        },
        LOOPIE: {
            one: [
                "We’ll interrupt the loop—gently.",
                "Let’s unhook from replay.",
                "Not everything. Just this cycle.",
                "We’ll break the spiral with one clean move.",
                "We can set this thought down for a minute.",
            ],
            two: [
                "We’ll interrupt the loop—gently.\nYou can set it down for a minute.",
                "Let’s unhook from replay.\nWe’ll replace rumination with relief.",
                "Not everything. Just this cycle.\nOne reset is enough.",
                "We’ll break the spiral with one clean move.\nYour mind can rest between cycles.",
                "We can set this thought down for a minute.\nYou’re allowed to pause the replay.",
            ],
        },
        DROP: {
            one: [
                "It’s okay to feel heavy. One unload step.",
                "We’ll exhale some weight—slowly.",
                "We can make space for your breath again.",
                "You don’t have to carry it all at once.",
                "Soft relief counts.",
            ],
            two: [
                "It’s okay to feel heavy. One unload step.\nSmall relief still counts.",
                "We’ll exhale some weight—slowly.\nOne gentle release, then rest.",
                "We can make space for your breath again.\nSofter, not perfect.",
                "You don’t have to carry it all at once.\nOne small unload right now.",
                "Soft relief counts.\nWe’ll look for the lightest next move.",
            ],
        },
        RUSH: {
            one: [
                "We’ll contain the heat and redirect it.",
                "Tiny action beats explosive pressure.",
                "One clean move—then reassess.",
                "We don’t need perfect. We need momentum.",
                "We’ll turn intensity into traction.",
            ],
            two: [
                "We’ll contain the heat and redirect it.\nFirst: steady. Then: move.",
                "Tiny action beats explosive pressure.\nWe’ll choose the smallest step that counts.",
                "One clean move—then reassess.\nWe can be powerful without being destructive.",
                "We don’t need perfect. We need momentum.\nStart small, win fast.",
                "We’ll turn intensity into traction.\nYou’re allowed to be intense—and still choose wisely.",
            ],
        },
        GLITCH: {
            one: [
                "Pause with me. Reduce the static.",
                "We’ll steady the signal-noise.",
                "You’re safe to slow down and re-sort.",
                "We’ll bring order back—quietly.",
                "We’ll choose one stabilizing move.",
            ],
            two: [
                "Pause with me. Reduce the static.\nClarity over urgency—just for a minute.",
                "We’ll steady the signal-noise.\nThen we choose one clean action.",
                "You’re safe to slow down and re-sort.\nOne breath at a time.",
                "We’ll bring order back—quietly.\nLess chaos. More control.",
                "We’ll choose one stabilizing move.\nYou can go slow and still be strong.",
            ],
        },
    }

    const flavorBoost =
        detectAngerIntent(msg) && bubbleKey === "RUSH"
            ? "\n(If you feel it rising, we’ll keep it contained.)"
            : detectPanicIntent(msg) && bubbleKey === "STILL"
              ? "\n(We’ll keep you breathing.)"
              : ""

    const pack = by[bubbleKey]
    const base =
        level === "two"
            ? pickFrom(pack.two, `${msgSeed}|c2|${bubbleKey}|${hash32(msg)}`)
            : pickFrom(pack.one, `${msgSeed}|c1|${bubbleKey}|${hash32(msg)}`)

    return base + (level === "two" ? flavorBoost : "")
}

function returnCue(_bubbleKey: BubbleKey) {
    return "Return: Enter the issue again for the next unused ritual in this route."
}

/* Visual mode persistence + library save */
const VM_KEY = "__ts_visualMode_v153"
function loadPersistedVisualMode(): "minimal" | "immersion" | null {
    if (typeof window === "undefined") return null
    try {
        const v = sessionStorage.getItem(VM_KEY)
        if (v === "minimal" || v === "immersion") return v
        return null
    } catch {
        return null
    }
}
function persistVisualMode(v: "minimal" | "immersion") {
    if (typeof window === "undefined") return
    try {
        sessionStorage.setItem(VM_KEY, v)
    } catch {}
}

const SAVED_KEY = "__ts_saved_rituals_v153"
function loadSaved(): SavedRitual[] {
    return lsGet<SavedRitual[]>(SAVED_KEY, [])
}
function saveSaved(list: SavedRitual[]) {
    lsSet(SAVED_KEY, list.slice(0, 750))
}
// ===================== PART 4/5 =====================

/* Display sanitizer + formatting */
const PROTOCOL_HEADER_RE = new RegExp(
    [
        "^\\s*(GLITCH|STILL|SYNC|PATCH|DROP|RUSH|LOOPIE)\\s*(?:\\(.*?\\))?\\s*(?:Plain|Poetic\\+Action|Poetic|Mini|Micro)?\\s*(?:\\/\\/|—|-|–)\\s*.*$",
    ].join("|"),
    "i"
)
const STYLE_TAG_RE =
    /\s*\((?:poetic\+action|poetic\s*\+\s*action|poetic|plain)\)\s*/gi
const MINI_TAG_RE = /\s*\((?:mini)\)\s*/gi
const TRAIL_CODE_RE = /\s*\b[A-Z]{2,5}-\d{1,4}\b\s*$/g
const STEP_PREFIX_RE =
    /^\s*(?:\d{1,3}\s*[\.\)]\s+|step\s*\d{1,3}\s*[:\)\-]\s+)/i
const TRAIL_PAREN_RE =
    /\s*\((?:index|calibration|marker|trace|rule)\s*:\s*[^)]+\)\s*\.?\s*$/i
const TRAIL_INLINE_RE =
    /\s*(?:mark this step|name this pass|index|calibration|marker|trace|rule)\s*:\s*[a-z0-9][a-z0-9\-_/.]{3,}\.?\s*$/i
const TRAIL_DASH_CODE_RE =
    /\s*[—–-]\s*[a-z]{3,}[a-z0-9]*-[a-z0-9]{3,}\s*\.?\s*$/i
const LINE_HEADER_RE =
    /^\s*[A-Z]{4,6}\s*(?:\((?:poetic\+action|poetic|plain|poetic\s*\+\s*action)\))?\s*\/\/\s*/i

function stripMetaFromLine(line: string) {
    let s = (line || "").trim()
    if (!s) return ""
    if (PROTOCOL_HEADER_RE.test(s)) return ""
    s = s.replace(LINE_HEADER_RE, "").trim()
    s = s.replace(STEP_PREFIX_RE, "").trim()
    s = s.replace(STYLE_TAG_RE, " ").trim()
    s = s.replace(MINI_TAG_RE, " ").trim()

    for (let i = 0; i < 6; i++) {
        const before = s
        s = s.replace(TRAIL_PAREN_RE, "").trim()
        s = s.replace(TRAIL_INLINE_RE, "").trim()
        s = s.replace(TRAIL_DASH_CODE_RE, "").trim()
        s = s.replace(TRAIL_CODE_RE, "").trim()
        s = s.replace(/\s+/g, " ").trim()
        s = s.replace(/\s+\./g, ".").trim()
        if (s === before) break
    }
    return s
}

function ensureBlankLineBeforeWhySafety(text: string) {
    const t = normalizeText(text || "")
    return t
        .replace(/\n(Why(?:\s*[:—-]|\s))/g, "\n\n$1")
        .replace(/\n(Safety(?:\s*[:—-]|\s))/g, "\n\n$1")
        .replace(/\n(Return(?:\s*[:—-]|\s))/g, "\n\n$1")
}

function removeDiagnosticLines(text: string) {
    const raw = normalizeText(text || "")
    const lines = raw.split("\n")
    const kept: string[] = []
    for (const l of lines) {
        const s = (l || "").trim()
        if (!s) continue
        if (/^challenge\s*:/i.test(s)) {
            kept.push(s)
            continue
        }
        if (DIAG_WORD_RE.test(s)) continue
        kept.push(s)
    }
    return kept.join("\n").trim()
}

function paragraphizeIfNeeded(text: string) {
    const t = normalizeText(text || "").trim()
    if (!t) return ""
    const newlineCount = (t.match(/\n/g) || []).length
    if (newlineCount >= 3) return t

    const parts = t
        .split(/(?<=[.!?])\s+(?=(?:[A-Z“"‘]|I\s))/g)
        .map((p) => p.trim())
        .filter(Boolean)

    if (parts.length <= 2) return t
    return parts.join("\n\n")
}

function sanitizeTextForDisplayStrict(
    text: string,
    preserveStepNumbers = false
) {
    const raw = normalizeText(text || "")
    const cleaned = raw
        .split("\n")
        .map((line) => {
            if (!preserveStepNumbers) return stripMetaFromLine(line)

            // IMPORTANT: v36 numbered ritual cards rely on the literal
            // `1.`, `2.`, `3.` prefixes. The old sanitizer removed them,
            // causing the parser to swallow every move into the GOAL block.
            const original = (line || "").trim()
            const prefix =
                original.match(/^\s*(\d{1,3}\s*[\.\)]\s+)/)?.[1] || ""
            const cleanedLine = stripMetaFromLine(original)
            return prefix && cleanedLine
                ? `${prefix}${cleanedLine}`.trim()
                : cleanedLine
        })
        .filter((l) => (l || "").trim().length > 0)
        .join("\n")
        .trim()

    // Do not paragraphize the ritual body when step numbers are preserved.
    // Its line breaks are structural data for the premium ritual parser.
    if (preserveStepNumbers) {
        return ensureBlankLineBeforeWhySafety(cleaned).trim()
    }

    const paragraphed = paragraphizeIfNeeded(cleaned)
    return ensureBlankLineBeforeWhySafety(paragraphed).trim()
}

/* Ritual content getters */
function stripInternalSubpatternLine(text: string) {
    return normalizeText(text || "")
        .split("\n")
        .filter((line) => !/^\s*SUBPATTERN\s*:/i.test(line))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function ritualTextDefault(r: BubbleRitual) {
    // v36.2: use the complete consumer ritual before legacy fields.
    const ready =
        (r as any)?.ritualText ??
        (r as any)?.fullRitual ??
        (r as any)?.content ??
        r?.plain ??
        r?.t ??
        r?.text_default ??
        ""
    if (String(ready || "").trim()) {
        return normalizeText(String(ready))
    }

    // Build the full ritual from the current camelCase consumer schema.
    const title = String(
        (r as any)?.title ?? r?.name ?? r?.ritual_name ?? ""
    ).trim()
    const playTime = String((r as any)?.playTime ?? "").trim()
    const goal = String((r as any)?.goal ?? "").trim()
    const stepsRaw = Array.isArray((r as any)?.stepsArray)
        ? (r as any).stepsArray
        : Array.isArray((r as any)?.steps)
          ? (r as any).steps
          : String((r as any)?.steps ?? "")
                .split(/\r?\n/)
                .map((x) => x.trim())
                .filter(Boolean)
    const finish = String((r as any)?.finish ?? "").trim()
    const win = String((r as any)?.winReward ?? (r as any)?.win ?? "").trim()
    const supportsRaw = Array.isArray((r as any)?.supportsArray)
        ? (r as any).supportsArray
        : String((r as any)?.supports ?? "")
              .split(/\r?\n/)
              .map((x) => x.replace(/^\s*[•·*\-–—]\s*/, "").trim())
              .filter(Boolean)
    const flow = String((r as any)?.formulaFlow ?? "").trim()

    const camelSections = [
        title,
        playTime ? `PLAY TIME\n${playTime}` : "",
        goal ? `GOAL\n${goal}` : "",
        stepsRaw.length
            ? stepsRaw
                  .map((x: any) => String(x || "").trim())
                  .filter(Boolean)
                  .join("\n")
            : "",
        finish,
        win ? `WIN\n${win}` : "",
        supportsRaw.length
            ? supportsRaw.map((x: any) => `• ${String(x).trim()}`).join("\n")
            : "",
        flow ? `FORMULA FLOW\n${flow}` : "",
    ].filter(Boolean)

    if (camelSections.length >= 3) {
        return normalizeText(camelSections.join("\n\n"))
    }

    // Legacy workbook schema fallback.
    const fullSections = [
        title,
        stripInternalSubpatternLine(String(r?.trigger_play_time ?? "")),
        String(r?.goal_why_game_move ?? "").trim(),
        String(r?.play_the_loop ?? "").trim(),
        String(r?.potency_stack ?? "").trim()
            ? String(r?.potency_stack ?? "").trim()
            : [r?.potency_1, r?.potency_2, r?.potency_3].filter(Boolean).length
              ? `🜂 POWER-UP\n${[r?.potency_1, r?.potency_2, r?.potency_3]
                    .filter(Boolean)
                    .map((x) => `• ${String(x).trim()}`)
                    .join("\n")}`
              : "",
        String(r?.win_reward ?? "").trim(),
        String(r?.formula_flow ?? "").trim()
            ? `FORMULA FLOW\n${String(r?.formula_flow ?? "").trim()}`
            : "",
    ].filter(Boolean)

    if (fullSections.length >= 3) {
        return normalizeText(fullSections.join("\n\n"))
    }

    const s =
        r?.text ??
        r?.poetic_text ??
        r?.poetic_action_text ??
        r?.plain_text ??
        r?.text_poetic_action ??
        r?.text_plain ??
        (r as any)?.ritual ??
        (Array.isArray((r as any)?.lines) ? (r as any).lines.join("\n") : "") ??
        ""
    return normalizeText(String(s || ""))
}

function ritualSafety(r: BubbleRitual) {
    return String(r?.safety ?? r?.safety_notes ?? "").trim()
}

/* Intent gates */
type IntentKey =
    | "panic"
    | "anger"
    | "shame"
    | "loop"
    | "heavy"
    | "stuck"
    | "confusion"
    | "fear"
    | "neutral"
function detectIntent(message: string): IntentKey {
    const t = (message || "").toLowerCase()
    if (detectPanicIntent(t)) return "panic"
    if (detectAngerIntent(t)) return "anger"
    if (detectShameIntent(t)) return "shame"
    if (detectLoopIntent(t)) return "loop"
    if (detectSadHeavyIntent(t)) return "heavy"
    if (detectStuckIntent(t)) return "stuck"
    if (detectConfusionIntent(t)) return "confusion"
    if (detectFearIntent(t)) return "fear"
    return "neutral"
}

function comfortPrefixForMessage(
    level: "none" | "one" | "two",
    msgSeed: string,
    rawMessage: string
) {
    if (level === "none") return ""
    const intent = detectIntent(rawMessage)
    const packs: Record<IntentKey, { one: string[]; two: string[] }> = {
        panic: {
            one: [
                "Stay with me. We lower the body alarm first.",
                "Nothing needs solving yet. First, make one minute safer.",
                "We are reducing the alarm before choosing the next move.",
            ],
            two: [
                "Stay with me. We lower the body alarm first.\nYou do not need to solve anything yet—just stabilise the next minute.",
                "Nothing needs solving yet. First, make one minute safer.\nLet the ritual guide one small dial instead of scanning the whole body.",
                "We are reducing the alarm before choosing the next move.\nSlow is enough; one steady signal can lead the rest.",
            ],
        },
        anger: {
            one: [
                "We contain the heat before it chooses for you.",
                "Keep the power. Remove the damage.",
                "First, create space between the fire and the action.",
            ],
            two: [
                "We contain the heat before it chooses for you.\nNo message, decision, or confrontation until the next move is deliberate.",
                "Keep the power. Remove the damage.\nThe ritual will turn intensity into one controlled action.",
                "First, create space between the fire and the action.\nYou can be forceful without becoming destructive.",
            ],
        },
        shame: {
            one: [
                "No punishment. We separate repair from self-attack.",
                "You are allowed to correct something without becoming the mistake.",
                "We soften the verdict before choosing the repair.",
            ],
            two: [
                "No punishment. We separate repair from self-attack.\nOne honest adjustment is more useful than total self-condemnation.",
                "You are allowed to correct something without becoming the mistake.\nThe ritual will narrow blame into one workable responsibility.",
                "We soften the verdict before choosing the repair.\nKindness here is accuracy, not avoidance.",
            ],
        },
        loop: {
            one: [
                "We interrupt the replay without arguing with every thought.",
                "The loop does not need another round to earn a pause.",
                "We unhook from the cycle one move at a time.",
            ],
            two: [
                "We interrupt the replay without arguing with every thought.\nThe ritual will give the mind a clean stopping point.",
                "The loop does not need another round to earn a pause.\nOne deliberate break is enough for this pass.",
                "We unhook from the cycle one move at a time.\nYou do not have to finish the thought before setting it down.",
            ],
        },
        heavy: {
            one: [
                "You do not have to carry the whole weight at once.",
                "We make room for one small easing move.",
                "Soft relief counts. Start with what can lighten by one degree.",
            ],
            two: [
                "You do not have to carry the whole weight at once.\nThe ritual will work with one manageable piece, not the entire burden.",
                "We make room for one small easing move.\nNothing has to become perfect for the pressure to reduce.",
                "Soft relief counts. Start with what can lighten by one degree.\nOne gentle action is enough for this round.",
            ],
        },
        stuck: {
            one: [
                "We shrink the start until movement becomes possible.",
                "No perfect plan. One move that creates traction.",
                "The next action only needs to be small enough to begin.",
            ],
            two: [
                "We shrink the start until movement becomes possible.\nThe ritual will turn pressure into one visible next step.",
                "No perfect plan. One move that creates traction.\nMomentum can begin before motivation arrives.",
                "The next action only needs to be small enough to begin.\nComplete the first move, then reassess.",
            ],
        },
        confusion: {
            one: [
                "We reduce the noise and follow one clean signal.",
                "Clarity first. One decision at a time.",
                "We sort the system before asking it to move.",
            ],
            two: [
                "We reduce the noise and follow one clean signal.\nThe ritual will help separate what matters now from what can wait.",
                "Clarity first. One decision at a time.\nYou do not need to organise everything to choose one anchor.",
                "We sort the system before asking it to move.\nLess input, one priority, then one action.",
            ],
        },
        fear: {
            one: [
                "We steady the threat signal before deciding what it means.",
                "First, return to what is actually happening now.",
                "We make the fear specific enough to work with.",
            ],
            two: [
                "We steady the threat signal before deciding what it means.\nThe ritual will separate present evidence from predicted danger.",
                "First, return to what is actually happening now.\nOne grounded signal is enough to begin.",
                "We make the fear specific enough to work with.\nA named threat is easier to assess than a total sense of danger.",
            ],
        },
        neutral: {
            one: [
                "Let us identify the pattern and make one clean move.",
                "We will turn the signal into something workable.",
                "One precise action is enough for this pass.",
            ],
            two: [
                "Let us identify the pattern and make one clean move.\nThe ritual will guide the next step without forcing a total solution.",
                "We will turn the signal into something workable.\nStart with the smallest move that changes the pattern.",
                "One precise action is enough for this pass.\nComplete the loop, notice the result, and stop there.",
            ],
        },
    }
    const pack = packs[intent]
    return level === "two"
        ? pickFrom(
              pack.two,
              `${msgSeed}|intent2|${intent}|${hash32(rawMessage)}`
          )
        : pickFrom(
              pack.one,
              `${msgSeed}|intent1|${intent}|${hash32(rawMessage)}`
          )
}

const INTENT_MUST: Record<IntentKey, RegExp> = {
    panic: /(breathe|breath|inhale|exhale|ground|steady|slow|settle|calm|cool|ease|safe|anchor|present)/i,
    anger: /(anger|angry|rage|heat|cool down|contain|release|boundary|boundaries|pause|walk away|reset|redirect|choose|control|voice|tone)/i,
    shame: /(shame|guilt|regret|repair|forgive|kind|compassion|soften|self[-\s]?talk|worth|care)/i,
    loop: /(loop|replay|ruminat|spiral|unhook|interrupt|reset|pattern|thought|overthink|let go)/i,
    heavy: /(heavy|weight|sad|grief|cry|rest|soothe|gentle|unload|ease|support|warm)/i,
    stuck: /(start|begin|step|move|momentum|tiny|small|timer|five|minute|action|next)/i,
    confusion:
        /(clarity|signal|choose|priorit|align|sort|list|one thing|anchor|focus)/i,
    fear: /(safe|ground|steady|calm|slow|anchor|present|breath|ease)/i,
    neutral: /(step|breathe|anchor|choose|gentle|small|steady)/i,
}
const INTENT_AVOID: Record<IntentKey, RegExp> = {
    panic: /(revenge|attack|shout|yell|fight|explode)/i,
    anger: /(panic attack|hyperventilat|can['’]?t breathe|dizzy|faint)/i,
    shame: /(revenge|attack|explode)/i,
    loop: /(revenge|attack|explode)/i,
    heavy: /(revenge|attack|explode)/i,
    stuck: /(revenge|attack|explode)/i,
    confusion: /(revenge|attack|explode)/i,
    fear: /(revenge|attack|explode)/i,
    neutral: /(revenge|attack|explode)/i,
}

function intentGateAllows(intent: IntentKey, r: BubbleRitual) {
    const hay = `${String(r?.challenge ?? "")} ${String(r?.domain ?? "")} ${String(r?.challenge_type ?? "")} ${String(
        r?.name ?? r?.ritual_name ?? ""
    )} ${ritualTextDefault(r)}`
    const must = INTENT_MUST[intent]
    const avoid = INTENT_AVOID[intent]
    const mustOK = intent === "neutral" ? true : must.test(hay)
    const avoidOK = avoid ? !avoid.test(hay) : true
    return mustOK && avoidOK
}

function ritualBubbleKeyFromAny(
    r: BubbleRitual,
    fallback?: BubbleKey
): BubbleKey {
    const direct = String(r?.b || r?.bubble || fallback || "GLITCH")
        .trim()
        .toUpperCase()
    if (
        direct === "GLITCH" ||
        direct === "SYNC" ||
        direct === "PATCH" ||
        direct === "DROP" ||
        direct === "STILL" ||
        direct === "RUSH" ||
        direct === "LOOPIE"
    ) {
        return direct as BubbleKey
    }
    return fallback || "GLITCH"
}

function scoreRitual(
    message: string,
    r: BubbleRitual,
    preferredBubble?: BubbleKey
) {
    const title = String(r?.name ?? r?.ritual_name ?? r?.title ?? "")
    const body = ritualTextDefault(r)
    const challenge = String(r?.challenge ?? "")
    const domain = String(r?.domain ?? "")
    const ctype = String(r?.challenge_type ?? "")
    const bubble = ritualBubbleKeyFromAny(r)
    const intent = detectIntent(message)
    const hay = `${title} ${body} ${challenge} ${domain} ${ctype}`

    let score = 0
    score += scoreOverlap(message, title) * 8
    score += scoreOverlap(message, body) * 5
    score += scoreOverlap(message, challenge) * 4
    score += scoreOverlap(message, domain) * 3
    score += scoreOverlap(message, ctype) * 3

    if (preferredBubble && bubble === preferredBubble) score += 30
    if (INTENT_MUST[intent].test(hay)) score += 40
    if (INTENT_AVOID[intent].test(hay)) score -= 60

    if (
        (intent === "panic" || intent === "fear") &&
        /(breathe|breath|slow|settle|anchor|safe|ground)/i.test(hay)
    ) {
        score += 30
    }

    return score
}

function buildDisplayTitleless(opts: {
    bubbleKey: BubbleKey
    ritual: BubbleRitual
    rawText: string
    rawSafety: string
    challengeFromUser: string
    comfortLevel: "none" | "one" | "two"
    msgSeed: string
}) {
    const {
        bubbleKey,
        ritual,
        rawText,
        rawSafety,
        challengeFromUser,
        comfortLevel,
        msgSeed,
    } = opts
    const mainRaw = sanitizeTextForDisplayStrict(rawText, true)

    // The structured ritual text already contains a SAFETY section in v38.4.3.
    // Strip any existing safety tail first, then append exactly one canonical block.
    const mainLines = normalizeText(mainRaw).split("\n")
    const firstSafetyIndex = mainLines.findIndex((line) =>
        isSafetyLabelLine(line)
    )
    const main = (
        firstSafetyIndex >= 0 ? mainLines.slice(0, firstSafetyIndex) : mainLines
    )
        .join("\n")
        .trim()

    const safeLines = sanitizeTextForDisplayStrict(rawSafety)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !isSafetyLabelLine(line))

    // IMPORTANT: no SAFETY marker is stored in ritual content.
    // The card UI renders the single visible SAFETY heading.
    const safetyLine = (
        safeLines.length
            ? safeLines
            : [
                  "PAUSE",
                  "If you feel unsafe right now, pause and reach out to a trusted person or local emergency services.",
              ]
    ).join("\n")

    const combined = [main, safetyLine].filter(Boolean).join("\n\n")
    const finalText = ensureBlankLineBeforeWhySafety(combined).trim()
    const sig = hash32(
        `${bubbleKey}||${normalizeForNearDuplicate(finalText)}`.toLowerCase()
    )
    return { text: finalText || "⟡ No usable ritual text found.", sig }
}

/* Intent-aware routing + one global 750-ritual no-replay cycle */
const ROUTER_VERSION = "v4053_750"
const GLOBAL_USED_RITUALS_KEY = `__ts_global_used_rituals_${ROUTER_VERSION}`
const GLOBAL_CYCLE_KEY = `__ts_global_cycle_${ROUTER_VERSION}`
const ISSUE_ROUTES_KEY = `__ts_issue_routes_${ROUTER_VERSION}`
const LAST_GLOBAL_RITUAL_KEY = `__ts_last_global_ritual_${ROUTER_VERSION}`

type IssueRouteState = {
    rankedParents: string[]
    parentIndex: number
    activeParent?: string
    rankedSubpatterns?: string[]
    subpatternIndex?: number
    createdAt: number
    updatedAt: number
}

function ritualSignature(_bubbleKey: BubbleKey, r: BubbleRitual) {
    const id = String(r?.id || r?.slug || "").trim()
    if (id) return id
    const name = String(r?.name ?? r?.ritual_name ?? r?.title ?? "")
    return hash32(`${name}||${ritualTextDefault(r)}`.toLowerCase())
}

function normalizeIssueForRouting(message: string) {
    const stop = new Set([
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "to",
        "of",
        "in",
        "on",
        "at",
        "for",
        "with",
        "is",
        "am",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "i",
        "me",
        "my",
        "mine",
        "it",
        "this",
        "that",
        "these",
        "those",
        "feel",
        "feeling",
        "felt",
        "really",
        "very",
        "just",
        "right",
        "now",
        "today",
        "again",
        "keep",
        "keeps",
        "still",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "can",
        "could",
        "would",
        "should",
    ])
    const tokens = tokenize(message)
        .filter((w) => !stop.has(w))
        .slice(0, 28)
        .sort()
    return tokens.join(" ") || norm(message).toLowerCase()
}

function issueRouteKey(message: string) {
    return hash32(normalizeIssueForRouting(message))
}

function getAllRituals(library: Record<BubbleKey, BubbleRitual[]>) {
    const out: Array<{
        bubbleKey: BubbleKey
        ritual: BubbleRitual
        sig: string
    }> = []
    for (const bk of Object.keys(library) as BubbleKey[]) {
        for (const ritual of library[bk] || []) {
            out.push({
                bubbleKey: ritualBubbleKeyFromAny(ritual, bk),
                ritual,
                sig: ritualSignature(bk, ritual),
            })
        }
    }
    return out
}

function thinkingErrorOf(r: BubbleRitual) {
    return String(
        r?.thinking_error ?? r?.challenge_type ?? "General pattern"
    ).trim()
}
function subpatternOf(r: BubbleRitual) {
    return String(
        r?.precise_subpattern ??
            r?.primary_trigger ??
            r?.challenge ??
            thinkingErrorOf(r)
    ).trim()
}
function weightedRoutingValue(r: BubbleRitual) {
    const v = Number(r?.routing_weight || 0)
    return Number.isFinite(v) && v > 0 ? v : 0.000001
}
function routingHaystack(r: BubbleRitual) {
    return [
        thinkingErrorOf(r),
        subpatternOf(r),
        r?.pattern_family,
        r?.primary_trigger,
        r?.secondary_patterns,
        r?.recognition_cue,
        r?.match_reason,
        r?.unique_game_move,
        r?.coverage_tier,
        r?.challenge,
        r?.domain,
        r?.name,
        r?.ritual_name,
        ...(Array.isArray(r?.keywords) ? r.keywords : []),
    ]
        .filter(Boolean)
        .join(" ")
}

function scoreParent(message: string, rows: BubbleRitual[]) {
    if (!rows.length) return -Infinity
    const label = thinkingErrorOf(rows[0])
    let score = scoreOverlap(message, label) * 22
    for (const r of rows) {
        score = Math.max(
            score,
            scoreOverlap(message, subpatternOf(r)) * 18 +
                scoreOverlap(message, String(r?.primary_trigger || "")) * 14 +
                scoreOverlap(message, String(r?.secondary_patterns || "")) * 9 +
                scoreOverlap(message, String(r?.recognition_cue || "")) * 8 +
                scoreOverlap(message, String(r?.match_reason || "")) * 5 +
                scoreOverlap(message, String(r?.pattern_family || "")) * 4
        )
    }
    return score
}

function rankParents(message: string, all: ReturnType<typeof getAllRituals>) {
    const groups = new Map<string, BubbleRitual[]>()
    for (const row of all) {
        const parent = thinkingErrorOf(row.ritual)
        if (!groups.has(parent)) groups.set(parent, [])
        groups.get(parent)!.push(row.ritual)
    }
    return Array.from(groups.entries())
        .map(([parent, rituals]) => ({
            parent,
            score: scoreParent(message, rituals),
        }))
        .sort((a, b) => b.score - a.score || a.parent.localeCompare(b.parent))
        .map((x) => x.parent)
}

function rankSubpatterns(
    message: string,
    parent: string,
    all: ReturnType<typeof getAllRituals>
) {
    const groups = new Map<string, BubbleRitual[]>()
    for (const row of all) {
        if (thinkingErrorOf(row.ritual) !== parent) continue
        const sub = subpatternOf(row.ritual)
        if (!groups.has(sub)) groups.set(sub, [])
        groups.get(sub)!.push(row.ritual)
    }
    return Array.from(groups.entries())
        .map(([subpattern, rituals]) => {
            let score = scoreOverlap(message, subpattern) * 24
            for (const r of rituals) {
                score = Math.max(
                    score,
                    scoreOverlap(message, String(r?.recognition_cue || "")) *
                        10 +
                        scoreOverlap(message, String(r?.match_reason || "")) *
                            7 +
                        scoreOverlap(
                            message,
                            String(r?.secondary_patterns || "")
                        ) *
                            6 +
                        scoreOverlap(
                            message,
                            String(r?.unique_game_move || "")
                        ) *
                            3
                )
            }
            return { subpattern, score }
        })
        .sort(
            (a, b) =>
                b.score - a.score || a.subpattern.localeCompare(b.subpattern)
        )
        .map((x) => x.subpattern)
}

function scoreRitualWithinSubpattern(message: string, r: BubbleRitual) {
    let score = scoreOverlap(message, routingHaystack(r)) * 6
    score += scoreOverlap(message, String(r?.name ?? r?.ritual_name ?? "")) * 2
    // Workbook routing weights break close semantic ties while preserving accurate mappings.
    score += Math.log(weightedRoutingValue(r) * 1000000 + 1)
    return score
}

function resetGlobalRitualCycle() {
    const cycle = Number(lsGet<number>(GLOBAL_CYCLE_KEY, 1) || 1) + 1
    lsSet(GLOBAL_CYCLE_KEY, cycle)
    lsSet(GLOBAL_USED_RITUALS_KEY, [])
    lsSet(ISSUE_ROUTES_KEY, {})
    return cycle
}

function pickNextRitualByThinkingError(
    message: string,
    library: Record<BubbleKey, BubbleRitual[]>
) {
    const all = getAllRituals(library).filter(
        (x) =>
            sanitizeTextForDisplayStrict(ritualTextDefault(x.ritual)).length >=
            8
    )
    if (!all.length) return null

    let used = loadSet(GLOBAL_USED_RITUALS_KEY)
    if (used.size >= all.length) {
        resetGlobalRitualCycle()
        used = new Set<string>()
    }

    const issueKey = issueRouteKey(message)
    const routes = lsGet<Record<string, IssueRouteState>>(ISSUE_ROUTES_KEY, {})
    let route = routes[issueKey]
    if (
        !route ||
        !Array.isArray(route.rankedParents) ||
        !route.rankedParents.length
    ) {
        route = {
            rankedParents: rankParents(message, all),
            parentIndex: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }
    }

    const lastGlobal = String(lsGet<string>(LAST_GLOBAL_RITUAL_KEY, "") || "")
    let chosen: (typeof all)[number] | null = null
    let chosenParent = ""
    let chosenSubpattern = ""

    for (
        let p = Math.max(0, route.parentIndex);
        p < route.rankedParents.length && !chosen;
        p++
    ) {
        const parent = route.rankedParents[p]
        const parentRemaining = all.filter(
            (x) => thinkingErrorOf(x.ritual) === parent && !used.has(x.sig)
        )
        if (!parentRemaining.length) {
            route.parentIndex = p + 1
            continue
        }

        if (
            route.activeParent !== parent ||
            !Array.isArray(route.rankedSubpatterns)
        ) {
            route.activeParent = parent
            route.rankedSubpatterns = rankSubpatterns(message, parent, all)
            route.subpatternIndex = 0
        }

        for (
            let s = Math.max(0, route.subpatternIndex || 0);
            s < route.rankedSubpatterns.length;
            s++
        ) {
            const sub = route.rankedSubpatterns[s]
            const available = parentRemaining
                .filter((x) => subpatternOf(x.ritual) === sub)
                .sort(
                    (a, b) =>
                        scoreRitualWithinSubpattern(message, b.ritual) -
                            scoreRitualWithinSubpattern(message, a.ritual) ||
                        String(a.ritual.id || "").localeCompare(
                            String(b.ritual.id || "")
                        )
                )
            const candidate =
                available.find((x) => x.sig !== lastGlobal) || available[0]
            if (candidate) {
                chosen = candidate
                chosenParent = parent
                chosenSubpattern = sub
                route.parentIndex = p
                route.subpatternIndex = s
                break
            }
            route.subpatternIndex = s + 1
        }
    }

    // Safety fallback: use any globally unused ritual, still ranked by semantic fit and workbook weight.
    if (!chosen) {
        const remaining = all
            .filter((x) => !used.has(x.sig))
            .sort(
                (a, b) =>
                    scoreRitualWithinSubpattern(message, b.ritual) -
                    scoreRitualWithinSubpattern(message, a.ritual)
            )
        chosen =
            remaining.find((x) => x.sig !== lastGlobal) || remaining[0] || null
        if (chosen) {
            chosenParent = thinkingErrorOf(chosen.ritual)
            chosenSubpattern = subpatternOf(chosen.ritual)
        }
    }
    if (!chosen) {
        resetGlobalRitualCycle()
        return pickNextRitualByThinkingError(message, library)
    }

    used.add(chosen.sig)
    saveSet(GLOBAL_USED_RITUALS_KEY, used, all.length + 20)
    lsSet(LAST_GLOBAL_RITUAL_KEY, chosen.sig)

    const subStillAvailable = all.some(
        (x) =>
            thinkingErrorOf(x.ritual) === chosenParent &&
            subpatternOf(x.ritual) === chosenSubpattern &&
            !used.has(x.sig)
    )
    if (!subStillAvailable)
        route.subpatternIndex = (route.subpatternIndex || 0) + 1
    const parentStillAvailable = all.some(
        (x) => thinkingErrorOf(x.ritual) === chosenParent && !used.has(x.sig)
    )
    if (!parentStillAvailable) {
        route.parentIndex += 1
        route.activeParent = undefined
        route.rankedSubpatterns = undefined
        route.subpatternIndex = 0
    }

    route.updatedAt = Date.now()
    routes[issueKey] = route
    lsSet(ISSUE_ROUTES_KEY, routes)
    return {
        bubbleKey: chosen.bubbleKey,
        ritual: chosen.ritual,
        text: ritualTextDefault(chosen.ritual),
        safety: ritualSafety(chosen.ritual),
        thinkingError: chosenParent,
        preciseSubpattern: chosenSubpattern,
        cycle: Number(lsGet<number>(GLOBAL_CYCLE_KEY, 1) || 1),
        usedCount: used.size,
        totalCount: all.length,
    }
}

// ===================== PART 5/5 =====================
// Main component + UI helpers + Framer controls (FULL WORKING)
// ✅ Bubble identity follows the selected ritual; users never choose it manually
// ✅ Auto-scroll to newest ritual
// ✅ Haptic-like click feedback (scale 0.98 + glow burst)
// ✅ iPhone safe-area padding for input row
// ✅ Overlay guard (disable video overlays on low-memory / data-saver / reduced motion)
// ✅ ESC closes + input autofocus

/* overlay helpers */
function isVideoUrl(u: string) {
    const s = (u || "").toLowerCase()
    return (
        s.endsWith(".webm") ||
        s.endsWith(".mp4") ||
        s.includes(".webm?") ||
        s.includes(".mp4?")
    )
}
function pickOverlay(
    bubble: BubbleSlug,
    variant: number,
    overlays: Record<string, string>
) {
    const key = (n: number) => `${bubble}_overlay_${n}`
    const wanted = overlays[key(variant)] || ""
    if (wanted) return wanted
    for (let i = 1; i <= 5; i++) {
        const u = overlays[key(i)]
        if (u) return u
    }
    return ""
}

/* ---- Premium “expensive” interaction helpers ---- */
function bubbleBadgeStyle(
    perf: boolean,
    fontFamily: string,
    bubble: BubbleSlug = "glitch"
): React.CSSProperties {
    const accentMap: Record<BubbleSlug, string> = {
        glitch: "255,112,220",
        drop: "110,165,255",
        loopie: "230,125,255",
        patch: "105,220,255",
        rush: "255,135,95",
        still: "90,215,255",
        sync: "100,245,205",
    }

    const accent = accentMap[bubble] || accentMap.glitch

    return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        minHeight: 36,
        padding: "7px 15px",
        borderRadius: 999,
        border: `1px solid rgba(${accent},0.42)`,
        background: `linear-gradient(135deg, rgba(${accent},0.22), rgba(${accent},0.08))`,
        color: "#FFFFFF",
        fontWeight: 900,
        fontSize: 13,
        lineHeight: 1,
        letterSpacing: 1.25,
        textTransform: "uppercase",
        boxShadow: perf
            ? "inset 0 1px 0 rgba(255,255,255,0.10)"
            : `0 0 24px rgba(${accent},0.20), inset 0 1px 0 rgba(255,255,255,0.13)`,
        backdropFilter: perf ? "none" : "blur(12px)",
        WebkitBackdropFilter: perf ? "none" : "blur(12px)",
        fontFamily,
        userSelect: "none",
        whiteSpace: "nowrap",
    }
}

function useClickBurst() {
    const [k, setK] = React.useState(0)
    const fire = React.useCallback(() => setK((v) => v + 1), [])
    return { burstKey: k, fire }
}

function hapticWrapStyle(perf: boolean): React.CSSProperties {
    return {
        transform: "translateZ(0)",
        transition: "transform 90ms ease",
        willChange: "transform, box-shadow",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        ...(perf ? {} : {}),
    }
}

/* UI styles */
function inputStyle(
    textCol: string,
    fontFamily: string,
    perf: boolean
): React.CSSProperties {
    return {
        flex: "1 1 auto",
        height: 58,
        padding: "0 16px",
        borderRadius: 18,
        border: "1px solid rgba(170,230,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        color: textCol,
        outline: "none",
        fontWeight: 900,
        fontSize: 15,
        backdropFilter: perf ? "none" : "blur(12px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        fontFamily,
    }
}
function pillBtn(
    active: boolean,
    perf: boolean,
    fontFamily: string
): React.CSSProperties {
    return {
        width: 56,
        height: 58,
        borderRadius: 18,
        border: "1px solid rgba(170,230,255,0.14)",
        background: active
            ? "rgba(140,220,255,0.18)"
            : "rgba(255,255,255,0.06)",
        color: "rgba(248,252,255,0.92)",
        fontWeight: 950,
        cursor: "pointer",
        backdropFilter: perf ? "none" : "blur(12px)",
        boxShadow: active
            ? "0 0 18px rgba(140,220,255,0.18)"
            : "inset 0 1px 0 rgba(255,255,255,0.06)",
        fontFamily,
        transform: "translateZ(0)",
    }
}
function sendBtn(perf: boolean, fontFamily: string): React.CSSProperties {
    return {
        width: 62,
        height: 58,
        borderRadius: 18,
        border: "none",
        background:
            "linear-gradient(180deg, rgba(180,240,255,0.98), rgba(95,205,255,0.92))",
        color: "rgba(0,0,0,0.85)",
        fontWeight: 950,
        cursor: "pointer",
        boxShadow: perf
            ? "0 0 14px rgba(140,220,255,0.22), inset 0 1px 0 rgba(255,255,255,0.16)"
            : "0 0 22px rgba(140,220,255,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
        fontFamily,
    }
}
function topIconBtn(perf: boolean, fontFamily: string): React.CSSProperties {
    return {
        width: 48,
        height: 48,
        borderRadius: 16,
        border: "1px solid rgba(170,230,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        color: "rgba(248,252,255,0.92)",
        fontSize: 18,
        cursor: "pointer",
        backdropFilter: perf ? "none" : "blur(12px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        fontFamily,
        fontWeight: 950,
    }
}
function tabBtn(on: boolean, fontFamily: string): React.CSSProperties {
    return {
        height: 34,
        borderRadius: 999,
        padding: "0 12px",
        border: "1px solid rgba(170,230,255,0.14)",
        background: on ? "rgba(140,220,255,0.18)" : "rgba(255,255,255,0.06)",
        color: "rgba(248,252,255,0.92)",
        fontWeight: on ? 950 : 900,
        cursor: "pointer",
        boxShadow: on
            ? "0 0 14px rgba(140,220,255,0.18)"
            : "inset 0 1px 0 rgba(255,255,255,0.06)",
        userSelect: "none",
        fontFamily,
    }
}
function miniBtn(
    kind: "on" | "off" | "danger",
    fontFamily: string
): React.CSSProperties {
    const on = kind === "on"
    const danger = kind === "danger"
    return {
        height: 34,
        borderRadius: 999,
        padding: "0 12px",
        border: "1px solid rgba(170,230,255,0.14)",
        background: danger
            ? "rgba(255,110,160,0.14)"
            : on
              ? "rgba(140,220,255,0.18)"
              : "rgba(255,255,255,0.06)",
        color: "rgba(248,252,255,0.92)",
        fontWeight: 950,
        cursor: "pointer",
        boxShadow: danger
            ? "0 0 16px rgba(255,110,160,0.14)"
            : on
              ? "0 0 14px rgba(140,220,255,0.18)"
              : "inset 0 1px 0 rgba(255,255,255,0.06)",
        userSelect: "none",
        fontFamily,
    }
}
function chipBtn(perf: boolean, fontFamily: string): React.CSSProperties {
    return {
        height: 48,
        borderRadius: 999,
        padding: "0 16px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(170,230,255,0.14)",
        color: "rgba(248,252,255,0.92)",
        fontWeight: 950,
        cursor: "pointer",
        backdropFilter: perf ? "none" : "blur(12px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 140,
        justifyContent: "space-between",
        userSelect: "none",
        fontFamily,
    }
}
function menuPanel(perf: boolean): React.CSSProperties {
    return {
        position: "absolute",
        right: 0,
        top: 54,
        width: 240,
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(170,230,255,0.14)",
        background: "rgba(10,14,18,0.82)",
        backdropFilter: perf ? "none" : "blur(16px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        zIndex: 999,
    }
}
function menuItem(isOn: boolean, fontFamily: string): React.CSSProperties {
    return {
        width: "100%",
        padding: "12px 14px",
        textAlign: "left",
        background: isOn ? "rgba(140,220,255,0.18)" : "transparent",
        border: "none",
        borderBottom: "1px solid rgba(170,230,255,0.08)",
        color: "rgba(248,252,255,0.92)",
        fontWeight: isOn ? 950 : 850,
        cursor: "pointer",
        fontFamily,
    }
}

/* Dropdown */
function GlassDropdown({
    value,
    onChange,
    perf,
    uiFontFamily,
}: {
    value: string
    onChange: (v: string) => void
    perf: boolean
    uiFontFamily: string
}) {
    const [open, setOpen] = React.useState(false)
    const label =
        value === "auto" ? "Auto" : BUBBLE_LABEL[value as BubbleSlug] || "Auto"

    return (
        <div style={{ position: "relative" }}>
            <button
                className="ts-haptic"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen((o) => !o)
                }}
                style={chipBtn(perf, uiFontFamily)}
            >
                <span>{label}</span>
                <span
                    style={{
                        opacity: 0.85,
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                >
                    ▾
                </span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.99 }}
                        transition={{ duration: 0.14 }}
                        style={menuPanel(perf)}
                        onMouseLeave={() => setOpen(false)}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                    >
                        {(["auto", ...BUBBLE_ORDER] as string[]).map((k) => {
                            const isOn = k === value
                            const txt =
                                k === "auto"
                                    ? "Auto"
                                    : BUBBLE_LABEL[k as BubbleSlug]
                            return (
                                <button
                                    key={k}
                                    className="ts-haptic"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onChange(k)
                                        setOpen(false)
                                    }}
                                    style={menuItem(isOn, uiFontFamily)}
                                >
                                    {txt}
                                </button>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* Mode toggle */
function modeChip(selected: boolean, fontFamily: string): React.CSSProperties {
    return {
        height: 40,
        padding: "0 14px",
        borderRadius: 999,
        border: "1px solid rgba(170,230,255,0.14)",
        background: selected ? "rgba(140,220,255,0.95)" : "rgba(0,0,0,0.10)",
        color: selected ? "rgba(0,0,0,0.85)" : "rgba(245,249,255,0.90)",
        fontWeight: 950,
        cursor: "pointer",
        whiteSpace: "nowrap",
        userSelect: "none",
        fontFamily,
    }
}
function ModeToggle({
    value,
    onChange,
    uiFontFamily,
}: {
    value: string
    onChange: (v: "minimal" | "immersion") => void
    uiFontFamily: string
}) {
    return (
        <div
            style={{
                height: 48,
                borderRadius: 999,
                padding: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid rgba(170,230,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                userSelect: "none",
                fontFamily: uiFontFamily,
            }}
        >
            <button
                className="ts-haptic"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange("minimal")
                }}
                style={modeChip(value === "minimal", uiFontFamily)}
            >
                Minimal
            </button>
            <button
                className="ts-haptic"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange("immersion")
                }}
                style={modeChip(value === "immersion", uiFontFamily)}
            >
                Immersion
            </button>
        </div>
    )
}

/* Font loader */
function injectFontStylesheet(href: string, id: string) {
    if (typeof document === "undefined") return
    try {
        if (document.getElementById(id)) return
        const link = document.createElement("link")
        link.id = id
        link.rel = "stylesheet"
        link.href = href
        document.head.appendChild(link)
    } catch {}
}
function loadFontForChoice(choice: string) {
    const map: Record<string, string> = {
        Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap",
        Manrope:
            "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&display=swap",
        PlusJakartaSans:
            "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap",
        SpaceGrotesk:
            "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap",
        DMSans: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap",
        Outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap",
        Urbanist:
            "https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700;800;900&display=swap",
        Sora: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap",
        Syne: "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap",
        WorkSans:
            "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700;800&display=swap",
        NunitoSans:
            "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&display=swap",
        "IBM Plex Sans":
            "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&display=swap",
        Rubik: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800;900&display=swap",
        ReadexPro:
            "https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;600;700&display=swap",
        JetBrainsMono:
            "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap",
    }
    const href = map[choice]
    if (href) injectFontStylesheet(href, `ts-font-${choice.replace(/\s/g, "")}`)
}
function resolveFontFamily(choice: string, custom: string) {
    const map: Record<string, string> = {
        Inter: "Inter",
        SFRounded: "SF Pro Rounded",
        SFPro: "SF Pro Display",
        Manrope: "Manrope",
        PlusJakartaSans: "Plus Jakarta Sans",
        SpaceGrotesk: "Space Grotesk",
        DMSans: "DM Sans",
        Outfit: "Outfit",
        Urbanist: "Urbanist",
        Sora: "Sora",
        Syne: "Syne",
        WorkSans: "Work Sans",
        NunitoSans: "Nunito Sans",
        "IBM Plex Sans": "IBM Plex Sans",
        Rubik: "Rubik",
        ReadexPro: "Readex Pro",
        JetBrainsMono: "JetBrains Mono",
        System: "system-ui",
    }
    const base = map[choice] || choice || "Inter"
    const extra = (custom || "").trim()
    const merged = extra ? `${extra}, ${base}` : base
    return `${merged}, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`
}

/* Premium avatar fallback orb */
function bubbleInitial(b: BubbleSlug) {
    const m: Record<BubbleSlug, string> = {
        glitch: "G",
        drop: "D",
        loopie: "L",
        patch: "P",
        rush: "R",
        still: "S",
        sync: "Y",
    }
    return m[b] || "◇"
}
function orbBg(b: BubbleSlug) {
    const map: Record<BubbleSlug, string> = {
        still: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.26), rgba(90,210,255,0.18), rgba(0,0,0,0.70))",
        patch: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(140,220,255,0.14), rgba(0,0,0,0.72))",
        sync: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(120,245,210,0.14), rgba(0,0,0,0.72))",
        loopie: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(255,170,240,0.14), rgba(0,0,0,0.72))",
        drop: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(120,170,255,0.14), rgba(0,0,0,0.72))",
        rush: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(255,160,120,0.14), rgba(0,0,0,0.72))",
        glitch: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(255,130,220,0.14), rgba(0,0,0,0.72))",
    }
    return map[b] || map.glitch
}

/* Premium ritual reader: one clear guided experience, not a report */
const HIDDEN_RITUAL_LABELS = new Set([
    "TRIGGER",
    "PATTERN",
    "HOOK",
    "MISSION",
    "GOAL",
    "GAME MOVE",
    "HOW TO PLAY",
    "POWER-UP",
    "POWER UPS",
    "POWER-UPS",
    "POWER UP",
    "POTENCY STACK",
    "WIN SIGNAL",
    "WIN",
    "TIPS",
    "5 TIPS",
    "MIND BEND",
    "MY RESULT",
    "FORMULA FLOW",
    "LOCK IT IN",
    "RETURN",
])

function cleanRitualLabel(line: string) {
    return (line || "")
        .replace(/[🎮⚡🏆✨ⓘ🜂📸]/g, "")
        .replace(/^ +\s*/, "")
        .replace(/\s+/g, " ")
        .trim()
}

function isAllCapsTitle(line: string) {
    const letters = line.replace(/[^A-Za-z]/g, "")
    return (
        line.length >= 5 &&
        line.length <= 78 &&
        letters.length >= 4 &&
        line === line.toUpperCase() &&
        !HIDDEN_RITUAL_LABELS.has(cleanRitualLabel(line).toUpperCase()) &&
        !/^(PLAY TIME|PAUSE|SAFETY|YOU WIN WHEN)$/i.test(cleanRitualLabel(line))
    )
}

type RitualStep = { action: string; detail: string }

type ParsedRitual = {
    intro: string[]
    title: string
    playTime: string
    promise: string[]
    goal: string
    gameName: string
    gameIntro: string
    steps: RitualStep[]
    finish: string
    powerUps: string[]
    win: string
    supports: string[]
    mindBend: string
    myResult: string
    lockIn: string
    formulaFlow: string
    safety: string[]
}

function parsePremiumRitual(text: string): ParsedRitual {
    const raw = normalizeText(text || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)

    const parsed: ParsedRitual = {
        intro: [],
        title: "Ritual Unlocked",
        playTime: "1–2 minutes",
        promise: [],
        goal: "",
        gameName: "",
        gameIntro: "",
        steps: [],
        finish: "",
        powerUps: [],
        win: "",
        supports: [],
        mindBend: "",
        myResult: "",
        lockIn: "",
        formulaFlow: "",
        safety: [],
    }

    let i = 0
    // Comfort copy before the workbook ritual title.
    while (i < raw.length && !isAllCapsTitle(raw[i])) {
        if (!/^challenge\s*:/i.test(raw[i])) parsed.intro.push(raw[i])
        i++
    }
    if (i < raw.length && isAllCapsTitle(raw[i])) parsed.title = raw[i++]

    let section = ""
    for (; i < raw.length; i++) {
        const original = raw[i]
        const line = cleanRitualLabel(original)
        const upper = line.toUpperCase()
        if (!line || /^challenge\s*:/i.test(line)) continue

        if (/^PLAY TIME$/i.test(upper)) {
            section = "time"
            continue
        }
        if (
            /^\d+\s*[–—-]\s*\d+\s*(?:seconds?|minutes?)\s*·\s*Guided reset$/i.test(
                line
            )
        ) {
            parsed.playTime = line
                .replace(/\s*·\s*Guided reset\s*$/i, "")
                .trim()
            section = ""
            continue
        }
        if (/^(TRIGGER|PATTERN)$/i.test(upper)) {
            section = "hidden"
            continue
        }
        if (/^HOOK$/i.test(upper)) {
            section = "promise"
            continue
        }
        if (/^(MISSION|GOAL)$/i.test(upper)) {
            section = "goal"
            continue
        }
        if (/^GAME MOVE$/i.test(upper)) {
            section = "gameMove"
            continue
        }
        if (/^HOW TO PLAY$/i.test(upper)) {
            section = "steps"
            continue
        }

        // The workbook's How to Play text may begin with an internal
        // "RITUAL TITLE // PLAY" banner. The premium card already shows the
        // ritual title, so suppress this duplicate banner.
        if (section === "steps" && /\/\/\s*PLAY\s*$/i.test(line)) {
            continue
        }

        if (/^(POWER[- ]?UPS?|POTENCY STACK)$/i.test(upper)) {
            section = "powerup"
            continue
        }
        if (/^(YOU WIN WHEN|WIN SIGNAL|WIN)$/i.test(upper)) {
            section = "win"
            continue
        }
        if (/^(TIPS|5 TIPS|SUPPORT)$/i.test(upper)) {
            section = "supports"
            continue
        }
        if (/^MIND BEND$/i.test(upper)) {
            section = "mindBend"
            continue
        }
        if (/^MY RESULT$/i.test(upper)) {
            section = "result"
            continue
        }
        if (/^LOCK IT IN$/i.test(upper)) {
            section = "lock"
            continue
        }
        if (/^FORMULA FLOW$/i.test(upper)) {
            section = "formula"
            continue
        }
        if (/^RETURN$/i.test(upper)) {
            section = "hidden"
            continue
        }
        if (
            isSafetyLabelLine(line) ||
            /^PAUSE$/i.test(upper) ||
            /^Safety\s*:/i.test(line)
        ) {
            section = "safety"
            const inline = isSafetyLabelLine(line)
                ? ""
                : line.replace(/^Safety\s*:\s*/i, "").trim()
            if (inline) parsed.safety.push(inline)
            continue
        }

        // v36 clean-consumer format: numbered moves are parsed directly.
        const numberedMove = line.match(/^\d+\.\s+(.{1,52}?)\s+[—–-]\s+(.+)$/)
        if (numberedMove) {
            parsed.steps.push({
                action: numberedMove[1].replace(/[.:]$/, "").trim(),
                detail: numberedMove[2].trim(),
            })
            section = "steps"
            continue
        }

        // v36 finish line.
        if (
            /^(?:⚡\s*)?(?:FINISH MOVE|FINISH|EXIT MOVE|CLOSE|DONE)\s*[—:-]?/i.test(
                line
            )
        ) {
            parsed.finish = line.replace(
                /^(?:⚡\s*)?(?:FINISH MOVE|FINISH|EXIT MOVE|CLOSE|DONE)\s*[—:-]?\s*/i,
                ""
            )
            section = ""
            continue
        }

        // A short uppercase line after GAME MOVE is the actual game name.
        if (section === "gameMove" && isAllCapsTitle(line)) {
            parsed.gameName = line
            section = "gameIntro"
            continue
        }

        if (section === "time") {
            parsed.playTime = line
            section = ""
            continue
        }
        if (section === "hidden") continue
        if (section === "promise") {
            parsed.promise.push(line)
            continue
        }
        if (section === "goal") {
            // GOAL is exactly one consumer line in v36. Numbered moves are
            // intercepted above; any additional unlabelled line should not
            // be appended indefinitely to the Goal card.
            if (!parsed.goal) {
                parsed.goal = line
            } else {
                parsed.promise.push(line)
            }
            continue
        }
        if (section === "powerup") {
            const item = line.replace(/^[•·\-*–—]+\s*/, "").trim()
            if (item) parsed.powerUps.push(item)
            continue
        }
        if (section === "win") {
            const supportItem = original.match(/^\s*[•·*\-–—]\s+(.+)$/)
            if (supportItem) {
                parsed.supports.push(supportItem[1].trim())
                section = "supports"
                continue
            }
            parsed.win = parsed.win ? `${parsed.win} ${line}` : line
            continue
        }
        if (section === "supports") {
            const supportItem = original.match(/^\s*[•·*\-–—]\s+(.+)$/)
            if (supportItem) {
                parsed.supports.push(supportItem[1].trim())
                continue
            }
            // Non-bullet support copy is still kept separate from WIN.
            parsed.supports.push(line)
            continue
        }
        if (section === "mindBend") {
            parsed.mindBend = parsed.mindBend
                ? `${parsed.mindBend} ${line}`
                : line
            continue
        }
        if (section === "result") {
            parsed.myResult = parsed.myResult
                ? `${parsed.myResult} ${line}`
                : line
            continue
        }
        if (section === "lock") {
            parsed.lockIn = parsed.lockIn ? `${parsed.lockIn} ${line}` : line
            continue
        }
        if (section === "formula") {
            parsed.formulaFlow = parsed.formulaFlow
                ? `${parsed.formulaFlow} ${line}`
                : line
            continue
        }
        if (section === "safety") {
            parsed.safety.push(line)
            continue
        }
        if (section === "gameIntro") {
            parsed.gameIntro = line
            section = "steps"
            continue
        }

        // Workbook action lines usually use an em dash: Action — explanation.
        const move = line.match(/^(.{2,38}?)\s+[—–-]\s+(.+)$/)
        if (move) {
            const action = move[1].replace(/[.:]$/, "").trim()
            const detail = move[2].trim()
            if (!/^(FORMULA FLOW|RETURN|SAFETY)$/i.test(action)) {
                parsed.steps.push({ action, detail })
                section = "steps"
                continue
            }
        }

        if (section === "gameMove" && !parsed.gameIntro) {
            parsed.gameIntro = line
            section = "steps"
            continue
        }
        if (section === "steps" && parsed.steps.length) {
            parsed.steps[parsed.steps.length - 1].detail += ` ${line}`
            continue
        }
        if (section === "steps" && !parsed.steps.length) {
            parsed.gameIntro = parsed.gameIntro
                ? `${parsed.gameIntro} ${line}`
                : line
            continue
        }
        parsed.promise.push(line)
    }

    parsed.intro = parsed.intro.slice(0, 2)
    parsed.promise = parsed.promise.slice(0, 2)
    parsed.steps = parsed.steps.slice(0, 6)
    parsed.powerUps = parsed.powerUps
        .filter((x, idx, arr) => x && arr.indexOf(x) === idx)
        .slice(0, 3)
    parsed.supports = parsed.supports
        .filter((x, idx, arr) => x && arr.indexOf(x) === idx)
        .slice(0, 5)
    parsed.safety = parsed.safety.filter(
        (x, idx, arr) => x && !isSafetyLabelLine(x) && arr.indexOf(x) === idx
    )
    // Hard guarantee: discard anything before PAUSE and never render a second SAFETY label.
    const pauseIndex = parsed.safety.findIndex((x) =>
        /^PAUSE$/i.test(String(x || "").trim())
    )
    if (pauseIndex >= 0) parsed.safety = parsed.safety.slice(pauseIndex)
    return parsed
}

function isCompleteRitualText(text: string) {
    if (!String(text || "").trim()) return false
    const parsed = parsePremiumRitual(text)
    return Boolean(
        parsed.title &&
            parsed.title !== "Ritual Unlocked" &&
            parsed.goal &&
            parsed.steps.length >= 2 &&
            parsed.win &&
            parsed.supports.length === 5 &&
            parsed.formulaFlow &&
            parsed.safety.some((line) => /^PAUSE$/i.test(line))
    )
}

function PremiumRitualText({
    text,
    fontFamily,
    fontSize,
}: {
    text: string
    fontFamily: string
    fontSize: number
}) {
    const ritual = React.useMemo(() => parsePremiumRitual(text), [text])

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 680,
                margin: "0 auto",
                fontFamily,
                color: "rgba(249,251,253,0.98)",
                textRendering: "optimizeLegibility",
                WebkitFontSmoothing: "antialiased",
            }}
        >
            {false && ritual.intro.length ? (
                <div
                    style={{
                        marginBottom: 22,
                        padding: "16px 18px",
                        borderRadius: 18,
                        background: "rgba(143,220,255,0.07)",
                        border: "1px solid rgba(143,220,255,0.12)",
                    }}
                >
                    {ritual.intro.map((line, index) => (
                        <div
                            key={index}
                            style={{
                                fontSize: index === 0 ? fontSize + 2 : fontSize,
                                lineHeight: 1.48,
                                fontWeight: index === 0 ? 760 : 520,
                                color:
                                    index === 0
                                        ? "#FFFFFF"
                                        : "rgba(232,239,245,0.78)",
                                marginTop: index ? 5 : 0,
                            }}
                        >
                            {line}
                        </div>
                    ))}
                </div>
            ) : null}

            <article
                style={{
                    padding: "clamp(22px, 4vw, 38px)",
                    borderRadius: 26,
                    background:
                        "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028))",
                    border: "1px solid rgba(255,255,255,0.09)",
                    boxShadow:
                        "0 24px 70px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
            >
                <header style={{ textAlign: "center", marginBottom: 28 }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "7px 11px",
                            borderRadius: 999,
                            background: "rgba(143,220,255,0.10)",
                            color: "rgba(169,229,255,0.96)",
                            fontSize: 12,
                            fontWeight: 760,
                            letterSpacing: 0.45,
                            marginBottom: 14,
                        }}
                    >
                        {ritual.playTime} · Guided reset
                    </div>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: "clamp(28px, 4vw, 38px)",
                            lineHeight: 1.08,
                            fontWeight: 820,
                            letterSpacing: -0.8,
                            color: "#FFFFFF",
                        }}
                    >
                        {ritual.title}
                    </h1>
                    {ritual.promise.length ? (
                        <p
                            style={{
                                margin: "16px auto 0",
                                maxWidth: 520,
                                fontSize: fontSize,
                                lineHeight: 1.55,
                                color: "rgba(228,235,242,0.76)",
                            }}
                        >
                            {ritual.promise.join(" ")}
                        </p>
                    ) : null}
                </header>

                {ritual.goal ? (
                    <div
                        style={{
                            marginBottom: 14,
                            padding: "14px 16px",
                            borderRadius: 17,
                            background: "rgba(143,220,255,0.055)",
                            border: "1px solid rgba(143,220,255,0.11)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 850,
                                letterSpacing: 0.9,
                                textTransform: "uppercase",
                                color: "rgba(169,229,255,0.92)",
                                marginBottom: 6,
                            }}
                        >
                            Goal
                        </div>
                        <div
                            style={{
                                fontSize,
                                lineHeight: 1.5,
                                fontWeight: 620,
                                color: "rgba(242,247,251,0.92)",
                            }}
                        >
                            {ritual.goal}
                        </div>
                    </div>
                ) : null}

                {ritual.gameName || ritual.gameIntro ? (
                    <div style={{ marginBottom: 18 }}>
                        {ritual.gameName ? (
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: "rgba(169,229,255,0.96)",
                                    letterSpacing: 0.35,
                                    marginBottom: 6,
                                }}
                            >
                                {ritual.gameName}
                            </div>
                        ) : null}
                        {ritual.gameIntro ? (
                            <div
                                style={{
                                    fontSize,
                                    lineHeight: 1.55,
                                    color: "rgba(235,241,246,0.86)",
                                }}
                            >
                                {ritual.gameIntro}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {ritual.steps.map((step, index) => (
                        <div
                            key={`${step.action}-${index}`}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "42px 1fr",
                                gap: 14,
                                alignItems: "start",
                                padding: "15px 16px",
                                borderRadius: 18,
                                background: "rgba(255,255,255,0.045)",
                                border: "1px solid rgba(255,255,255,0.075)",
                            }}
                        >
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: 13,
                                    background: "rgba(143,220,255,0.14)",
                                    color: "rgba(178,234,255,1)",
                                    fontWeight: 820,
                                    fontSize: 14,
                                }}
                            >
                                {index + 1}
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: fontSize + 1,
                                        lineHeight: 1.28,
                                        fontWeight: 760,
                                        color: "#FFFFFF",
                                    }}
                                >
                                    {step.action}
                                </div>
                                <div
                                    style={{
                                        marginTop: 5,
                                        fontSize: fontSize - 1,
                                        lineHeight: 1.5,
                                        color: "rgba(224,232,239,0.76)",
                                    }}
                                >
                                    {step.detail}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {ritual.finish ? (
                    <div
                        style={{
                            marginTop: 14,
                            padding: "12px 15px",
                            borderRadius: 15,
                            background: "rgba(143,220,255,0.075)",
                            border: "1px solid rgba(143,220,255,0.12)",
                            color: "rgba(238,248,252,0.94)",
                            fontSize: Math.max(14, fontSize - 1),
                            lineHeight: 1.45,
                        }}
                    >
                        <span
                            style={{
                                marginRight: 8,
                                fontSize: 11,
                                fontWeight: 850,
                                letterSpacing: 0.8,
                                textTransform: "uppercase",
                                color: "rgba(169,229,255,0.96)",
                            }}
                        >
                            Finish
                        </span>
                        <strong style={{ color: "#FFFFFF" }}>
                            {ritual.finish}
                        </strong>
                    </div>
                ) : null}

                {ritual.powerUps.length ? (
                    <div
                        style={{
                            marginTop: 20,
                            padding: "16px 16px",
                            borderRadius: 18,
                            background:
                                "linear-gradient(135deg, rgba(143,220,255,0.11), rgba(171,129,255,0.06))",
                            border: "1px solid rgba(143,220,255,0.16)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 11,
                                fontSize: 12,
                                fontWeight: 850,
                                letterSpacing: 0.9,
                                textTransform: "uppercase",
                                color: "rgba(169,229,255,0.98)",
                            }}
                        >
                            <span style={{ fontSize: 15 }}>🜂</span>
                            <span>Power-Ups</span>
                        </div>
                        <div style={{ display: "grid", gap: 9 }}>
                            {ritual.powerUps.map((item, index) => (
                                <div
                                    key={`${item}-${index}`}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "26px 1fr",
                                        gap: 10,
                                        alignItems: "start",
                                        fontSize: Math.max(14, fontSize - 1),
                                        lineHeight: 1.5,
                                        color: "rgba(240,247,251,0.92)",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 8,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background:
                                                "rgba(143,220,255,0.12)",
                                            color: "rgba(178,234,255,1)",
                                            fontSize: 11,
                                            fontWeight: 850,
                                        }}
                                    >
                                        {index + 1}
                                    </div>
                                    <div>{item}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {ritual.win ? (
                    <div
                        style={{
                            marginTop: 18,
                            padding: "14px 16px",
                            borderRadius: 17,
                            background:
                                "linear-gradient(135deg, rgba(143,220,255,0.10), rgba(255,255,255,0.035))",
                            border: "1px solid rgba(143,220,255,0.14)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 850,
                                letterSpacing: 0.9,
                                textTransform: "uppercase",
                                color: "rgba(169,229,255,0.96)",
                                marginBottom: 6,
                            }}
                        >
                            Win
                        </div>
                        <div
                            style={{
                                fontSize: fontSize + 1,
                                lineHeight: 1.45,
                                fontWeight: 720,
                                color: "rgba(249,251,253,0.96)",
                            }}
                        >
                            {ritual.win}
                        </div>
                    </div>
                ) : null}

                {ritual.supports.length ? (
                    <div
                        style={{
                            marginTop: 12,
                            padding: "16px 18px",
                            borderRadius: 18,
                            background: "rgba(255,255,255,0.035)",
                            border: "1px solid rgba(255,255,255,0.075)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 900,
                                letterSpacing: 0.9,
                                textTransform: "uppercase",
                                color: "rgba(169,229,255,0.96)",
                                marginBottom: 11,
                            }}
                        >
                            Tips
                        </div>
                        <div style={{ display: "grid", gap: 9 }}>
                            {ritual.supports.map((item, index) => (
                                <div
                                    key={`${item}-${index}`}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "14px 1fr",
                                        gap: 8,
                                        alignItems: "start",
                                        fontSize: Math.max(14, fontSize - 1),
                                        lineHeight: 1.5,
                                        color: "rgba(235,241,246,0.86)",
                                    }}
                                >
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            color: "rgba(169,229,255,0.96)",
                                            fontWeight: 900,
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        •
                                    </span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {ritual.mindBend ? (
                    <div
                        style={{
                            marginTop: 12,
                            padding: "16px 18px",
                            borderRadius: 18,
                            background:
                                "linear-gradient(135deg, rgba(171,129,255,0.10), rgba(143,220,255,0.05))",
                            border: "1px solid rgba(171,129,255,0.16)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 900,
                                letterSpacing: 0.9,
                                textTransform: "uppercase",
                                color: "rgba(203,180,255,0.96)",
                                marginBottom: 7,
                            }}
                        >
                            Mind Bend
                        </div>
                        <div
                            style={{
                                fontSize: Math.max(14, fontSize - 1),
                                lineHeight: 1.55,
                                color: "rgba(240,236,252,0.88)",
                            }}
                        >
                            {ritual.mindBend}
                        </div>
                    </div>
                ) : null}

                {ritual.lockIn ? (
                    <div
                        style={{
                            marginTop: 16,
                            padding: "14px 16px",
                            borderRadius: 16,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 850,
                                letterSpacing: 0.85,
                                textTransform: "uppercase",
                                color: "rgba(180,231,255,0.90)",
                                marginBottom: 6,
                            }}
                        >
                            Lock it in
                        </div>
                        <div
                            style={{
                                fontSize: Math.max(14, fontSize - 1),
                                lineHeight: 1.5,
                                color: "rgba(234,240,245,0.86)",
                            }}
                        >
                            {ritual.lockIn}
                        </div>
                    </div>
                ) : null}

                {ritual.formulaFlow ? (
                    <div
                        style={{
                            marginTop: 14,
                            padding: "13px 15px",
                            borderRadius: 15,
                            background: "rgba(143,220,255,0.045)",
                            border: "1px solid rgba(143,220,255,0.10)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 850,
                                letterSpacing: 0.85,
                                textTransform: "uppercase",
                                color: "rgba(169,229,255,0.86)",
                                marginBottom: 6,
                            }}
                        >
                            Formula Flow
                        </div>
                        <div
                            style={{
                                fontSize: Math.max(13, fontSize - 2),
                                lineHeight: 1.5,
                                color: "rgba(220,230,238,0.76)",
                            }}
                        >
                            {ritual.formulaFlow}
                        </div>
                    </div>
                ) : null}

                {ritual.safety.filter((line) => !isSafetyLabelLine(line))
                    .length ? (
                    <div
                        style={{
                            marginTop: 14,
                            padding: "15px 16px",
                            borderRadius: 17,
                            background: "rgba(255,255,255,0.028)",
                            border: "1px solid rgba(255,255,255,0.075)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 850,
                                letterSpacing: 0.9,
                                textTransform: "uppercase",
                                color: "rgba(169,229,255,0.90)",
                                marginBottom: 9,
                            }}
                        >
                            Safety
                        </div>
                        {ritual.safety
                            .filter((line) => !isSafetyLabelLine(line))
                            .map((line, index) => (
                                <div
                                    key={`${line}-${index}`}
                                    style={{
                                        marginTop: index ? 6 : 0,
                                        fontSize:
                                            index === 0 && /^PAUSE$/i.test(line)
                                                ? Math.max(13, fontSize - 1)
                                                : Math.max(13, fontSize - 2),
                                        lineHeight: 1.5,
                                        fontWeight:
                                            index === 0 && /^PAUSE$/i.test(line)
                                                ? 800
                                                : 520,
                                        color:
                                            index === 0 && /^PAUSE$/i.test(line)
                                                ? "rgba(245,249,252,0.94)"
                                                : "rgba(214,223,231,0.72)",
                                    }}
                                >
                                    {line}
                                </div>
                            ))}
                    </div>
                ) : null}
            </article>
        </div>
    )
}

/* Game-style ritual follow-up — engaging without forcing endless play */
type RitualFeedbackState = "idle" | "refine" | "helped"
function GameFeedbackPanel({
    round,
    state,
    uiFontFamily,
    onHelped,
    onRefine,
    onRetry,
    onCue,
    onNewIssue,
}: {
    round: number
    state: RitualFeedbackState
    uiFontFamily: string
    onHelped: () => void
    onRefine: () => void
    onRetry: () => void
    onCue: (cue: string) => void
    onNewIssue: () => void
}) {
    const shell: React.CSSProperties = {
        marginTop: 16,
        padding: "18px",
        borderRadius: 20,
        border: "1px solid rgba(143,220,255,0.18)",
        background:
            "linear-gradient(135deg, rgba(143,220,255,0.075), rgba(255,255,255,0.025))",
        boxShadow:
            "0 16px 42px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.04)",
        fontFamily: uiFontFamily,
    }
    const action = (strong = false): React.CSSProperties => ({
        minHeight: 44,
        padding: "10px 14px",
        borderRadius: 14,
        border: strong
            ? "1px solid rgba(143,220,255,0.48)"
            : "1px solid rgba(255,255,255,0.09)",
        background: strong
            ? "linear-gradient(135deg, rgba(143,220,255,0.94), rgba(112,198,255,0.86))"
            : "rgba(255,255,255,0.045)",
        color: strong ? "rgba(0,0,0,0.88)" : "rgba(247,250,253,0.92)",
        fontWeight: 850,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: uiFontFamily,
        textAlign: "left",
    })
    const cue = (): React.CSSProperties => ({
        minHeight: 40,
        padding: "9px 12px",
        borderRadius: 999,
        border: "1px solid rgba(143,220,255,0.14)",
        background: "rgba(143,220,255,0.055)",
        color: "rgba(238,247,252,0.92)",
        fontWeight: 760,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: uiFontFamily,
    })

    if (state === "helped") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={shell}
            >
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 950,
                        letterSpacing: 1,
                        color: "rgba(169,229,255,0.98)",
                        marginBottom: 8,
                    }}
                >
                    ✓ RUN COMPLETE
                </div>
                <div
                    style={{
                        fontSize: 18,
                        lineHeight: 1.35,
                        fontWeight: 850,
                        color: "#fff",
                    }}
                >
                    Keep the one that worked. You do not need another ritual
                    right now.
                </div>
                <div
                    style={{
                        marginTop: 8,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "rgba(222,232,239,0.74)",
                    }}
                >
                    Come back with a new signal whenever something else needs a
                    reset.
                </div>
                <button
                    className="ts-haptic"
                    onClick={onNewIssue}
                    style={{
                        ...action(true),
                        marginTop: 14,
                        textAlign: "center",
                    }}
                >
                    Start a new quest →
                </button>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={shell}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 8,
                }}
            >
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 950,
                        letterSpacing: 1,
                        color: "rgba(169,229,255,0.98)",
                    }}
                >
                    NEXT MOVE
                </div>
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(143,220,255,0.08)",
                        border: "1px solid rgba(143,220,255,0.12)",
                        color: "rgba(203,238,255,0.88)",
                    }}
                >
                    ROUND {Math.max(1, round)}
                </div>
            </div>

            <div
                style={{
                    fontSize: 19,
                    lineHeight: 1.3,
                    fontWeight: 880,
                    color: "rgba(250,252,255,0.98)",
                }}
            >
                Did this ritual shift anything?
            </div>
            <div
                style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: "rgba(220,230,238,0.72)",
                }}
            >
                If it missed, that is useful information — change the angle, not
                the goal.
            </div>

            {state === "idle" ? (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 14,
                    }}
                >
                    <button
                        className="ts-haptic"
                        onClick={onHelped}
                        style={action(true)}
                    >
                        ✓ Yes, that helped
                    </button>
                    <button
                        className="ts-haptic"
                        onClick={onRefine}
                        style={action(false)}
                    >
                        ◇ A little — refine it
                    </button>
                    <button
                        className="ts-haptic"
                        onClick={onRefine}
                        style={action(false)}
                    >
                        ↻ Not yet — switch angle
                    </button>
                </div>
            ) : (
                <div style={{ marginTop: 14 }}>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 820,
                            color: "rgba(242,248,252,0.90)",
                            marginBottom: 10,
                        }}
                    >
                        What still feels strongest?
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                        }}
                    >
                        <button
                            className="ts-haptic"
                            style={cue()}
                            onClick={() =>
                                onCue(
                                    "My thoughts are still looping and I need a different mental angle."
                                )
                            }
                        >
                            Thoughts looping
                        </button>
                        <button
                            className="ts-haptic"
                            style={cue()}
                            onClick={() =>
                                onCue(
                                    "My body still feels activated and I need a more body-focused reset."
                                )
                            }
                        >
                            Body activated
                        </button>
                        <button
                            className="ts-haptic"
                            style={cue()}
                            onClick={() =>
                                onCue(
                                    "The urge is still strong and I need help creating choice before acting."
                                )
                            }
                        >
                            Urge still strong
                        </button>
                        <button
                            className="ts-haptic"
                            style={cue()}
                            onClick={() =>
                                onCue(
                                    "The emotion still feels heavy and I need a gentler different approach."
                                )
                            }
                        >
                            Emotion still heavy
                        </button>
                        <button
                            className="ts-haptic"
                            style={cue()}
                            onClick={() =>
                                onCue(
                                    "I need something more practical and action-focused, not more analysis."
                                )
                            }
                        >
                            Need action
                        </button>
                    </div>
                    <button
                        className="ts-haptic"
                        onClick={onRetry}
                        style={{
                            ...action(true),
                            width: "100%",
                            marginTop: 12,
                            textAlign: "center",
                        }}
                    >
                        Surprise me with a different ritual →
                    </button>
                    {round >= 3 ? (
                        <div
                            style={{
                                marginTop: 10,
                                fontSize: 12,
                                lineHeight: 1.45,
                                color: "rgba(210,220,228,0.66)",
                            }}
                        >
                            Three rounds and still no fit? Reword what is
                            happening now, or take a break before trying again.
                        </div>
                    ) : null}
                </div>
            )}
        </motion.div>
    )
}

/* Persistent chat skin theme */
type ChatTheme = "dark" | "bright"
const CHAT_THEME_KEY = "__ts_chat_theme_v181"
function loadChatTheme(): ChatTheme {
    if (typeof window === "undefined") return "dark"
    try {
        return localStorage.getItem(CHAT_THEME_KEY) === "bright"
            ? "bright"
            : "dark"
    } catch {
        return "dark"
    }
}
function persistChatTheme(theme: ChatTheme) {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(CHAT_THEME_KEY, theme)
    } catch {}
}
function ThemeToggle({
    value,
    onChange,
    uiFontFamily,
}: {
    value: ChatTheme
    onChange: (v: ChatTheme) => void
    uiFontFamily: string
}) {
    const button = (selected: boolean): React.CSSProperties => ({
        height: 40,
        minWidth: 74,
        padding: "0 13px",
        borderRadius: 999,
        border: "1px solid rgba(170,230,255,0.16)",
        background: selected
            ? "rgba(140,220,255,0.95)"
            : "rgba(255,255,255,0.06)",
        color: selected ? "rgba(0,0,0,0.86)" : "rgba(248,252,255,0.90)",
        fontWeight: 900,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: uiFontFamily,
        whiteSpace: "nowrap",
    })
    return (
        <div
            aria-label="Chat colour mode"
            style={{
                height: 48,
                borderRadius: 999,
                padding: 4,
                display: "flex",
                alignItems: "center",
                gap: 5,
                border: "1px solid rgba(170,230,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                fontFamily: uiFontFamily,
            }}
        >
            <button
                className="ts-haptic"
                aria-pressed={value === "dark"}
                onClick={() => onChange("dark")}
                style={button(value === "dark")}
            >
                ☾ Dark
            </button>
            <button
                className="ts-haptic"
                aria-pressed={value === "bright"}
                onClick={() => onChange("bright")}
                style={button(value === "bright")}
            >
                ☀ Bright
            </button>
        </div>
    )
}

/* Main component */
export default function ThinkStillUnifiedChat(props: any) {
    const {
        title = "ThinkStill",
        backgroundColor = "#07090d",
        performanceMode = true,
        outputAnimation = "none",
        outputMsPerChar = 0,
        rgbIntensity = 0,
        rgbSpeedFactor = 1.6,
        comfortLevel = "two",
        showClose = true,
        showBubbleLabelInResponse = true,
        closeFallbackUrl = "",
        defaultVisualMode = "minimal",
        uiFont = "Inter",
        uiFontCustom = "",
        ritualFont = "Inter",
        ritualFontCustom = "",
        ritualFontSize = 17,
        manifestUrl = DEFAULT_MANIFEST_URL,
        overlayVariant = 1,
        overlayOpacity = 0.35,
        overlayBlend = "screen",
        overlayBlur = 0,
        allowOverlayVideoInPerf = true,
        musicEnabledByDefault = false,
        musicVolume = 0.45,
        musicGlobal = "",
        musicStill = "",
        musicPatch = "",
        musicSync = "",
        musicLoopie = "",
        musicDrop = "",
        musicRush = "",
        musicGlitch = "",
        avatarX = 0,
        avatarY = 0,
        avatarSize = 72,
        avatarStill,
        avatarPatch,
        avatarSync,
        avatarLoopie,
        avatarDrop,
        avatarRush,
        avatarGlitch,
        stillOverlay1,
        stillOverlay2,
        stillOverlay3,
        stillOverlay4,
        stillOverlay5,
        patchOverlay1,
        patchOverlay2,
        patchOverlay3,
        patchOverlay4,
        patchOverlay5,
        syncOverlay1,
        syncOverlay2,
        syncOverlay3,
        syncOverlay4,
        syncOverlay5,
        loopieOverlay1,
        loopieOverlay2,
        loopieOverlay3,
        loopieOverlay4,
        loopieOverlay5,
        dropOverlay1,
        dropOverlay2,
        dropOverlay3,
        dropOverlay4,
        dropOverlay5,
        rushOverlay1,
        rushOverlay2,
        rushOverlay3,
        rushOverlay4,
        rushOverlay5,
        glitchOverlay1,
        glitchOverlay2,
        glitchOverlay3,
        glitchOverlay4,
        glitchOverlay5,
    } = props

    React.useEffect(
        () => loadFontForChoice(String(uiFont || "Inter")),
        [uiFont]
    )
    React.useEffect(
        () => loadFontForChoice(String(ritualFont || "Inter")),
        [ritualFont]
    )

    const uiFontFamily = resolveFontFamily(
        String(uiFont || "Inter"),
        String(uiFontCustom || "")
    )
    const ritualFontFamily = resolveFontFamily(
        String(ritualFont || "Inter"),
        String(ritualFontCustom || "")
    )
    const ritualBaseSize = Math.max(16, Number(ritualFontSize || 17))

    const [chatTheme, setChatTheme] = React.useState<ChatTheme>(() =>
        loadChatTheme()
    )
    React.useEffect(() => persistChatTheme(chatTheme), [chatTheme])

    const textCol = "rgba(249,251,253,0.98)"
    const dimCol = "rgba(221,228,236,0.78)"

    const didUserSetModeRef = React.useRef(false)

    const initialVm = React.useMemo(() => {
        const persisted = loadPersistedVisualMode()
        if (persisted) return persisted
        return defaultVisualMode === "immersion" ? "immersion" : "minimal"
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const [visualMode, setVisualMode] = React.useState<"minimal" | "immersion">(
        initialVm
    )

    const [activeBubble, setActiveBubble] = React.useState<BubbleSlug>("glitch")

    React.useEffect(() => {
        if (didUserSetModeRef.current) return
        const next = defaultVisualMode === "immersion" ? "immersion" : "minimal"
        setVisualMode(next)
        persistVisualMode(next)
    }, [defaultVisualMode])

    React.useEffect(() => persistVisualMode(visualMode), [visualMode])

    const [input, setInput] = React.useState("")
    const inputRef = React.useRef("")
    React.useEffect(() => {
        inputRef.current = input
    }, [input])

    const inputElRef = React.useRef<HTMLInputElement | null>(null)
    React.useEffect(() => {
        const t = setTimeout(() => inputElRef.current?.focus?.(), 60)
        return () => clearTimeout(t)
    }, [])

    const [tab, setTab] = React.useState<"ritual" | "saved">("ritual")
    const [saved, setSaved] = React.useState<SavedRitual[]>(() => loadSaved())
    React.useEffect(() => saveSaved(saved), [saved])

    const [viewMode, setViewMode] = React.useState<
        "prompt" | "status" | "ritual"
    >("prompt")
    const [statusText, setStatusText] = React.useState("")
    const [currentText, setCurrentText] = React.useState("")
    const currentRitualIsComplete = React.useMemo(
        () => isCompleteRitualText(currentText),
        [currentText]
    )
    const [currentSig, setCurrentSig] = React.useState("")
    const [runKey, setRunKey] = React.useState("run-0")
    const [hasTypedOnce, setHasTypedOnce] = React.useState(false)
    const [typedSigMap, setTypedSigMap] = React.useState<Record<string, true>>(
        {}
    )
    const [typingProgressMap, setTypingProgressMap] = React.useState<
        Record<string, number>
    >({})

    const [lastSignal, setLastSignal] = React.useState("")
    const [lastSignalAt, setLastSignalAt] = React.useState(0)
    const [msgSeed, setMsgSeed] = React.useState("seed-0")
    const [gameRound, setGameRound] = React.useState(1)
    const [feedbackState, setFeedbackState] =
        React.useState<RitualFeedbackState>("idle")

    const outputAnim: OutputAnim =
        (String(outputAnimation || "typewriter") as any) || "typewriter"
    const effectiveMsPerChar = Math.max(0, Number(outputMsPerChar || 0))
    const rgbI = Math.max(0, Math.min(2, Number(rgbIntensity || 1.2)))
    const rgbSpeed = Math.max(0.25, Math.min(4, Number(rgbSpeedFactor || 1.6)))

    const hasTypedForCurrent = !!currentSig && !!typedSigMap[currentSig]
    const currentTypedChars = currentSig
        ? Math.max(0, Number(typingProgressMap[currentSig] || 0))
        : 0

    const markTypedSig = React.useCallback((sig: string) => {
        if (!sig) return
        setTypedSigMap((prev) => (prev[sig] ? prev : { ...prev, [sig]: true }))
    }, [])

    const markTypingProgress = React.useCallback(
        (sig: string, chars: number) => {
            if (!sig) return
            const safeChars = Math.max(0, Number(chars || 0))
            setTypingProgressMap((prev) => {
                const existing = Number(prev[sig] || 0)
                if (safeChars <= existing) return prev
                return { ...prev, [sig]: safeChars }
            })
        },
        []
    )

    React.useEffect(() => {
        if (tab !== "ritual") return
        if (hasTypedForCurrent) {
            setHasTypedOnce(true)
            return
        }
        setHasTypedOnce(false)
    }, [tab, hasTypedForCurrent, currentSig])

    const overlays = React.useMemo(() => {
        const o: Record<string, string> = {}
        const set = (bubble: BubbleSlug, n: number, v: any) => {
            const u = fileUrl(v)
            if (u) o[`${bubble}_overlay_${n}`] = u
        }
        ;[
            [
                "still",
                stillOverlay1,
                stillOverlay2,
                stillOverlay3,
                stillOverlay4,
                stillOverlay5,
            ],
            [
                "patch",
                patchOverlay1,
                patchOverlay2,
                patchOverlay3,
                patchOverlay4,
                patchOverlay5,
            ],
            [
                "sync",
                syncOverlay1,
                syncOverlay2,
                syncOverlay3,
                syncOverlay4,
                syncOverlay5,
            ],
            [
                "loopie",
                loopieOverlay1,
                loopieOverlay2,
                loopieOverlay3,
                loopieOverlay4,
                loopieOverlay5,
            ],
            [
                "drop",
                dropOverlay1,
                dropOverlay2,
                dropOverlay3,
                dropOverlay4,
                dropOverlay5,
            ],
            [
                "rush",
                rushOverlay1,
                rushOverlay2,
                rushOverlay3,
                rushOverlay4,
                rushOverlay5,
            ],
            [
                "glitch",
                glitchOverlay1,
                glitchOverlay2,
                glitchOverlay3,
                glitchOverlay4,
                glitchOverlay5,
            ],
        ].forEach((row: any) => {
            const b = row[0] as BubbleSlug
            for (let i = 1; i <= 5; i++) set(b, i, row[i])
        })
        return o
    }, [
        stillOverlay1,
        stillOverlay2,
        stillOverlay3,
        stillOverlay4,
        stillOverlay5,
        patchOverlay1,
        patchOverlay2,
        patchOverlay3,
        patchOverlay4,
        patchOverlay5,
        syncOverlay1,
        syncOverlay2,
        syncOverlay3,
        syncOverlay4,
        syncOverlay5,
        loopieOverlay1,
        loopieOverlay2,
        loopieOverlay3,
        loopieOverlay4,
        loopieOverlay5,
        dropOverlay1,
        dropOverlay2,
        dropOverlay3,
        dropOverlay4,
        dropOverlay5,
        rushOverlay1,
        rushOverlay2,
        rushOverlay3,
        rushOverlay4,
        rushOverlay5,
        glitchOverlay1,
        glitchOverlay2,
        glitchOverlay3,
        glitchOverlay4,
        glitchOverlay5,
    ])

    const overlayUrl = pickOverlay(
        activeBubble,
        Math.max(1, Math.min(5, Number(overlayVariant || 1))),
        overlays
    )

    // ----- Overlay “low power” guard (very important for “expensive feel”) -----
    const [lowPower, setLowPower] = React.useState(false)
    React.useEffect(() => {
        if (typeof window === "undefined") return
        try {
            const dm = Number((navigator as any).deviceMemory || 0) // GB, Chrome-based
            const saveData = !!(navigator as any).connection?.saveData
            const reducedMotion = !!window.matchMedia?.(
                "(prefers-reduced-motion: reduce)"
            )?.matches
            const lowMem = dm > 0 ? dm <= 4 : false
            // Conservative: if user is data-saver or reduced motion, treat as low power.
            setLowPower(!!saveData || !!reducedMotion || !!lowMem)
        } catch {
            setLowPower(false)
        }
    }, [])

    const overlayIsVideo = isVideoUrl(overlayUrl)
    const videoOverlayAllowed =
        !lowPower && (!performanceMode || !!allowOverlayVideoInPerf)

    const showOverlay =
        visualMode === "immersion" &&
        !!overlayUrl &&
        Number(overlayOpacity || 0) > 0 &&
        (!overlayIsVideo || videoOverlayAllowed)

    // audio
    const [musicOn, setMusicOn] = React.useState(!!musicEnabledByDefault)
    React.useEffect(
        () => setMusicOn(!!musicEnabledByDefault),
        [musicEnabledByDefault]
    )
    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const hasGestureRef = React.useRef(false)

    function musicUrlForBubble(b: BubbleSlug) {
        const per: any = {
            still: musicStill,
            patch: musicPatch,
            sync: musicSync,
            loopie: musicLoopie,
            drop: musicDrop,
            rush: musicRush,
            glitch: musicGlitch,
        }
        const u = fileUrl(per[b])
        if (u) return u
        return fileUrl(musicGlobal)
    }
    function ensureAudio() {
        if (typeof window === "undefined") return null
        if (!audioRef.current) {
            audioRef.current = new Audio()
            audioRef.current.loop = true
            audioRef.current.preload = "auto"
        }
        return audioRef.current
    }
    function syncAudioSourceAndState() {
        const a = ensureAudio()
        if (!a) return
        const url = musicUrlForBubble(activeBubble)
        a.volume = Math.max(0, Math.min(1, Number(musicVolume || 0.45)))
        if (url && a.src !== url) a.src = url
        if (musicOn && url && hasGestureRef.current) a.play().catch(() => {})
        else {
            try {
                a.pause()
            } catch {}
        }
    }
    React.useEffect(() => {
        syncAudioSourceAndState()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        activeBubble,
        musicOn,
        musicVolume,
        musicGlobal,
        musicStill,
        musicPatch,
        musicSync,
        musicLoopie,
        musicDrop,
        musicRush,
        musicGlitch,
    ])

    function markGesture() {
        if (hasGestureRef.current) return
        hasGestureRef.current = true
        syncAudioSourceAndState()
    }

    // avatars
    const avatars = React.useMemo(
        () => ({
            still: fileUrl(avatarStill),
            patch: fileUrl(avatarPatch),
            sync: fileUrl(avatarSync),
            loopie: fileUrl(avatarLoopie),
            drop: fileUrl(avatarDrop),
            rush: fileUrl(avatarRush),
            glitch: fileUrl(avatarGlitch),
        }),
        [
            avatarStill,
            avatarPatch,
            avatarSync,
            avatarLoopie,
            avatarDrop,
            avatarRush,
            avatarGlitch,
        ]
    )

    const [avatarBroken, setAvatarBroken] = React.useState(false)
    React.useEffect(() => setAvatarBroken(false), [activeBubble])

    const shownAvatar = avatars[activeBubble] || ""
    const hasAvatar = !!shownAvatar && !avatarBroken

    // mic
    const recRef = React.useRef<any>(null)
    const [isListening, setIsListening] = React.useState(false)
    const [speechSupported, setSpeechSupported] = React.useState(true)
    const micFinalRef = React.useRef("")

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const SR =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition
        if (!SR) {
            setSpeechSupported(false)
            return
        }
        try {
            const r = new SR()
            r.continuous = false
            r.interimResults = true
            r.lang = "en-AU"
            recRef.current = r
        } catch {
            setSpeechSupported(false)
        }
    }, [])

    const handleClose = React.useCallback(
        (e: any) => {
            markGesture()
            e?.preventDefault?.()
            e?.stopPropagation?.()
            try {
                window.open("", "_self")
                window.close()
            } catch {}
            if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back()
                return
            }
            const url = closeFallbackUrl || "about:blank"
            try {
                window.location.replace(url)
            } catch {
                window.location.href = url
            }
        },
        [closeFallbackUrl]
    )

    // ESC closes (premium)
    React.useEffect(() => {
        if (!showClose) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose(e as any)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [handleClose, showClose])

    const [libStatus, setLibStatus] = React.useState<
        "idle" | "loading" | "ready" | "error"
    >("idle")
    const [libError, setLibError] = React.useState("")
    const [libProgress, setLibProgress] = React.useState({
        loaded: 0,
        total: 0,
    })

    const manifestRef = React.useRef<Under25Manifest | null>(null)
    const bubbleCacheRef = React.useRef<
        Record<string, { rituals: BubbleRitual[]; loaded: boolean }>
    >({
        GLITCH: { rituals: [], loaded: false },
        SYNC: { rituals: [], loaded: false },
        PATCH: { rituals: [], loaded: false },
        DROP: { rituals: [], loaded: false },
        STILL: { rituals: [], loaded: false },
        RUSH: { rituals: [], loaded: false },
        LOOPIE: { rituals: [], loaded: false },
    })

    React.useEffect(() => {
        const mUrl = normalizeLibraryUrl(String(manifestUrl || ""))
        manifestRef.current = null
        setLibError("")
        setLibStatus("idle")
        setLibProgress({ loaded: 0, total: 0 })
        Object.keys(bubbleCacheRef.current).forEach((k) => {
            bubbleCacheRef.current[k] = { rituals: [], loaded: false }
        })

        if (!mUrl) {
            setLibStatus("error")
            setLibError("Missing manifest URL.")
            return
        }

        let alive = true
        setLibStatus("loading")
        ;(async () => {
            const resM = await fetchJson(mUrl)
            if (!alive) return
            if (!resM.ok || !resM.json) {
                setLibStatus("error")
                setLibError(resM.diag || "Failed to load manifest.")
                return
            }
            const m = normalizeManifestForEngine(mUrl, resM.json)
            const bubbles = Array.isArray(m.bubbles) ? m.bubbles : []
            if (!bubbles.length) {
                setLibStatus("error")
                setLibError("Manifest has no usable bubble entries.")
                return
            }
            manifestRef.current = m
            setLibStatus("ready")
            setLibError("")
            setLibProgress({ loaded: 0, total: 0 })
        })()

        return () => {
            alive = false
        }
    }, [manifestUrl])

    function normalizeLoadedRitual(x: any): BubbleRitual {
        return {
            ...x,
            id: String(x?.id || x?.slug || x?.title || "").trim(),
            name: String(x?.name ?? x?.ritual_name ?? x?.title ?? "").trim(),
            plain: normalizeText(
                String(
                    x?.plain ??
                        x?.t ??
                        x?.ritualText ??
                        x?.fullRitual ??
                        x?.content ??
                        x?.text_default ??
                        x?.text ??
                        x?.plain_text ??
                        x?.text_plain ??
                        x?.poetic_text ??
                        x?.poetic_action_text ??
                        x?.text_poetic_action ??
                        x?.ritual ??
                        ""
                )
            ),
            challenge: String(x?.challenge ?? "").trim(),
            challenge_type: String(x?.challenge_type ?? "").trim(),
            domain: String(x?.domain ?? x?.bubble ?? "").trim(),
            thinking_error: String(
                x?.thinking_error ?? x?.thinkingError ?? x?.trigger ?? ""
            ).trim(),
            precise_subpattern: String(
                x?.precise_subpattern ??
                    x?.preciseSubpattern ??
                    x?.primary_trigger ??
                    ""
            ).trim(),
            primary_trigger: String(
                x?.primary_trigger ?? x?.primaryTrigger ?? ""
            ).trim(),
            unique_game_move: String(
                x?.unique_game_move ?? x?.uniqueGameMove ?? ""
            ).trim(),
            coverage_tier: String(
                x?.coverage_tier ?? x?.coverageTier ?? ""
            ).trim(),
            routing_weight: x?.routing_weight ?? x?.routingWeight ?? 0,
            routing_probability_pct:
                x?.routing_probability_pct ?? x?.routingProbabilityPct ?? 0,
            parent_pool_size: x?.parent_pool_size ?? x?.parentPoolSize ?? 0,
            bubble_pool_size: x?.bubble_pool_size ?? x?.bubblePoolSize ?? 0,
            pattern_family: String(
                x?.pattern_family ?? x?.patternFamily ?? ""
            ).trim(),
            secondary_patterns: String(
                x?.secondary_patterns ?? x?.secondaryPatterns ?? ""
            ).trim(),
            pattern_type: String(
                x?.pattern_type ?? x?.patternType ?? ""
            ).trim(),
            recognition_cue: String(
                x?.recognition_cue ?? x?.recognitionCue ?? ""
            ).trim(),
            situation: String(x?.situation ?? "").trim(),
            immediate_need: String(
                x?.immediate_need ?? x?.immediateNeed ?? ""
            ).trim(),
            keywords: Array.isArray(x?.keywords)
                ? x.keywords
                      .map((v: any) => String(v || "").trim())
                      .filter(Boolean)
                : [],
            example_entry: String(
                x?.example_entry ?? x?.exampleEntry ?? ""
            ).trim(),
            match_reason: String(
                x?.match_reason ?? x?.matchReason ?? ""
            ).trim(),
            tie_priority: x?.tie_priority ?? x?.tiePriority ?? 0,
            safety: String(x?.safety ?? x?.safety_notes ?? "").trim(),
            b: String(x?.b || x?.bubble || "").trim(),
        }
    }

    function listFromPartJson(raw: any): BubbleRitual[] {
        if (!raw) return []
        if (Array.isArray(raw?.rituals))
            return raw.rituals.map(normalizeLoadedRitual)
        if (Array.isArray(raw?.items))
            return raw.items.map(normalizeLoadedRitual)
        if (Array.isArray(raw?.parts))
            return raw.parts.map(normalizeLoadedRitual)
        if (Array.isArray(raw)) return raw.map(normalizeLoadedRitual)
        return []
    }

    async function ensureBubbleLoaded(
        manifestUrlRaw: string,
        bubbleKey: BubbleKey
    ) {
        const cached = bubbleCacheRef.current[bubbleKey]
        if (cached?.loaded && cached.rituals?.length) return

        const m = manifestRef.current
        if (!m) throw new Error("Manifest not ready.")

        const bubbles = Array.isArray(m.bubbles) ? m.bubbles : []
        const entry = bubbles.find(
            (x) => String(x?.bubble || "").toUpperCase() === bubbleKey
        )
        const parts = Array.isArray(entry?.parts)
            ? (entry!.parts as ManifestPart[])
            : []
        if (!parts.length)
            throw new Error(`No parts listed for bubble ${bubbleKey}.`)

        setLibStatus("loading")
        setLibProgress({ loaded: 0, total: parts.length })
        setLibError("")

        const all: BubbleRitual[] = []
        for (let i = 0; i < parts.length; i++) {
            const partUrl = resolvePartUrl(manifestUrlRaw, m, parts[i])
            const resP = await fetchJson(partUrl)
            if (!resP.ok || !resP.json) {
                setLibStatus("error")
                setLibError(resP.diag || "Part load failed.")
                throw new Error(resP.diag || "Part load failed.")
            }
            const list = listFromPartJson(resP.json)
            for (const r of list) all.push(r)
            setLibProgress({ loaded: i + 1, total: parts.length })
        }

        bubbleCacheRef.current[bubbleKey] = { rituals: all, loaded: true }
        setLibStatus("ready")
        setLibError("")
        setLibProgress({ loaded: 0, total: 0 })
    }

    const [isThinking, setIsThinking] = React.useState(false)
    const inFlightRef = React.useRef(false)

    // Scroll ref — show the beginning of every newly generated ritual.
    const scrollRef = React.useRef<HTMLDivElement | null>(null)
    React.useEffect(() => {
        if (tab !== "ritual") return
        if (viewMode !== "ritual") return

        const el = scrollRef.current
        if (!el) return

        // Wait for the ritual layout to mount, then return the ritual panel
        // to its first line/title instead of forcing it to the bottom.
        const frame = requestAnimationFrame(() => {
            try {
                el.scrollTo({ top: 0, behavior: "smooth" })
            } catch {
                el.scrollTop = 0
            }
        })

        return () => cancelAnimationFrame(frame)
    }, [runKey, viewMode, tab])

    const sendMessage = async (
        overrideMessage = "",
        fromMic = false,
        isRetry = false
    ) => {
        markGesture()
        const message = norm(overrideMessage || inputRef.current || "")
        if (!message) return
        if (libStatus !== "ready") {
            setLibError(
                libError ||
                    (libStatus === "loading"
                        ? "The 750-ritual library is still loading."
                        : "The ritual library is unavailable. Check the Manifest URL.")
            )
            setViewMode("prompt")
            return
        }
        if (inFlightRef.current) return
        inFlightRef.current = true
        setIsThinking(true)

        const mUrl = normalizeLibraryUrl(String(manifestUrl || ""))
        const newSeed = `${Date.now()}-${makeSeed()}`
        setMsgSeed(newSeed)

        if (!isRetry) {
            setLastSignal(message)
            setGameRound(1)
        } else {
            setGameRound((r) => Math.min(9, Math.max(1, r + 1)))
        }
        setFeedbackState("idle")
        setLastSignalAt(Date.now())

        const bubble: BubbleSlug = "glitch"

        setActiveBubble(bubble)
        setTab("ritual")
        setViewMode("status")
        setStatusText("⟡ Pulling a ritual…")

        try {
            if (!manifestRef.current)
                throw new Error(libError || "Manifest not ready.")
            if (!mUrl) throw new Error("Missing manifest URL.")

            const preferredKey: BubbleKey = "GLITCH"
            const searchKeys: BubbleKey[] = [
                "GLITCH",
                "SYNC",
                "PATCH",
                "DROP",
                "STILL",
                "RUSH",
                "LOOPIE",
            ]

            // Accurate routing and no-repeat protection use the full 750-ritual pool.
            for (const bk of searchKeys) {
                await ensureBubbleLoaded(mUrl, bk)
            }

            const library: Record<BubbleKey, BubbleRitual[]> = {
                GLITCH: bubbleCacheRef.current.GLITCH?.rituals || [],
                SYNC: bubbleCacheRef.current.SYNC?.rituals || [],
                PATCH: bubbleCacheRef.current.PATCH?.rituals || [],
                DROP: bubbleCacheRef.current.DROP?.rituals || [],
                STILL: bubbleCacheRef.current.STILL?.rituals || [],
                RUSH: bubbleCacheRef.current.RUSH?.rituals || [],
                LOOPIE: bubbleCacheRef.current.LOOPIE?.rituals || [],
            }

            const out = pickNextRitualByThinkingError(message, library)
            if (!out) {
                const noMatchMessage =
                    "The 750-ritual library loaded, but no complete unused ritual could be selected. Reset the quest and try again."
                setLibStatus("error")
                setLibError(noMatchMessage)
                setCurrentText("")
                setCurrentSig("")
                setViewMode("prompt")
                return
            }

            const actualBubbleKey = out.bubbleKey || preferredKey
            const actualBubbleSlug =
                (Object.keys(BUBBLE_TO_KEY) as BubbleSlug[]).find(
                    (slug) => BUBBLE_TO_KEY[slug] === actualBubbleKey
                ) || bubble

            setActiveBubble(actualBubbleSlug)
            const built = buildDisplayTitleless({
                bubbleKey: actualBubbleKey,
                ritual: out.ritual,
                rawText: out.text,
                rawSafety: out.safety,
                challengeFromUser: message,
                comfortLevel: (comfortLevel as any) || "two",
                msgSeed: newSeed,
            })

            if (!isCompleteRitualText(built.text)) {
                throw new Error(
                    `Blocked incomplete ritual ${String(out.ritual?.id || "without ID")}.`
                )
            }

            setCurrentText(built.text)
            setCurrentSig(built.sig)
            setViewMode("ritual")
            setRunKey(`run-${Date.now()}-${makeSeed()}`)
            setHasTypedOnce(!!typedSigMap[built.sig])
            setInput("")
        } catch (e: any) {
            const msg = String(e?.message || "Failed")
            setLibStatus("error")
            setLibError(
                `${msg}\n\nUpload manifest.json and all seven rituals_*.json files together in the repository root.`
            )
            setCurrentText("")
            setCurrentSig("")
            setViewMode("prompt")
        } finally {
            setIsThinking(false)
            inFlightRef.current = false
            if (fromMic) setInput("")
        }
    }

    const toggleMic = () => {
        markGesture()
        if (!speechSupported || !recRef.current) return
        const r = recRef.current
        try {
            if (isListening) {
                r.stop()
                setIsListening(false)
                return
            }
            micFinalRef.current = ""

            r.onresult = (event: any) => {
                let finalText = ""
                let interimText = ""
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i]
                    const txt = res[0]?.transcript || ""
                    if (res.isFinal) finalText += txt
                    else interimText += txt
                }
                const merged = norm(`${finalText} ${interimText}`)
                if (merged) setInput(merged)
                if (finalText) micFinalRef.current = norm(finalText)
            }
            r.onerror = () => setIsListening(false)
            r.onend = () => {
                setIsListening(false)
                const final = norm(
                    micFinalRef.current || inputRef.current || ""
                )
                if (final) sendMessage(final, true)
            }

            r.start()
            setIsListening(true)
        } catch {
            setIsListening(false)
        }
    }

    const requestAnotherRitual = (cue = "") => {
        markGesture()
        const base = norm(lastSignal || inputRef.current || input || "")
        if (!base) {
            setViewMode("prompt")
            setTimeout(() => inputElRef.current?.focus?.(), 40)
            return
        }
        const richer = cue ? `${base}. ${cue}` : base
        setFeedbackState("idle")
        sendMessage(richer, false, true)
    }

    const startNewQuest = () => {
        markGesture()
        setFeedbackState("idle")
        setGameRound(1)
        setCurrentText("")
        setCurrentSig("")
        setInput("")
        setViewMode("prompt")
        setTab("ritual")
        setTimeout(() => inputElRef.current?.focus?.(), 60)
    }

    const [copyDone, setCopyDone] = React.useState(false)
    const copyRitual = async () => {
        const txt = currentText || ""
        if (!txt) return
        try {
            await navigator.clipboard.writeText(txt)
            setCopyDone(true)
            setTimeout(() => setCopyDone(false), 650)
        } catch {}
    }

    const [saveDone, setSaveDone] = React.useState(false)
    const saveCurrent = () => {
        markGesture()
        if (!currentText || !currentSig) return
        const bubbleKey = BUBBLE_TO_KEY[activeBubble] || "GLITCH"
        const id = `sv-${Date.now()}-${makeSeed()}`
        const exists = saved.some((s) => s.sig === currentSig)
        if (exists) {
            setSaveDone(true)
            setTimeout(() => setSaveDone(false), 650)
            return
        }
        const item: SavedRitual = {
            id,
            bubble: bubbleKey,
            text: ensureBlankLineBeforeWhySafety(
                removeDiagnosticLines(currentText)
            ),
            createdAt: Date.now(),
            sig: currentSig,
            challenge: lastSignal || "",
        }
        setSaved([item, ...saved].slice(0, 200))
        setSaveDone(true)
        setTimeout(() => setSaveDone(false), 650)
    }

    const clearSaved = () => {
        markGesture()
        setSaved([])
        setSaveDone(false)
        setCopyDone(false)
    }

    // Haptic burst triggers
    const burstTop = useClickBurst()
    const burstCopy = useClickBurst()
    const burstSave = useClickBurst()
    const burstClear = useClickBurst()
    const burstMusic = useClickBurst()
    const burstMic = useClickBurst()
    const burstSend = useClickBurst()

    return (
        <motion.div
            className={
                chatTheme === "bright" ? "ts-theme-light" : "ts-theme-dark"
            }
            data-chat-theme={chatTheme}
            onPointerDown={() => markGesture()}
            style={{
                width: "100%",
                height: "100vh",
                minHeight: "100dvh",
                overflow: "hidden",
                background: backgroundColor,
                display: "flex",
                justifyContent: "center",
                alignItems: "stretch",
                padding: 10,
                boxSizing: "border-box",
                fontFamily: uiFontFamily,
            }}
        >
            <style>{`
                html, body { height: 100%; overflow: hidden; }
                .ts-theme-light { filter: invert(1) hue-rotate(180deg); }
                .ts-theme-light img, .ts-theme-light video { filter: invert(1) hue-rotate(180deg); }
                .ts-theme-light input, .ts-theme-light textarea { caret-color: #111; }
                * { -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }

                /* Premium haptics: scale + glow burst */
                .ts-haptic { transition: transform 90ms ease, box-shadow 160ms ease; transform: translateZ(0); }
                .ts-haptic:active { transform: scale(0.98); }
                @keyframes tsClickBurst {
                    0% { box-shadow: 0 0 0 rgba(140,220,255,0.0); }
                    30% { box-shadow: 0 0 22px rgba(140,220,255,0.25); }
                    100% { box-shadow: 0 0 0 rgba(140,220,255,0.0); }
                }
                .ts-burst { animation: tsClickBurst 320ms ease-out 1; }

                .ts-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,220,255,0.55) rgba(255,255,255,0.06); }
                .ts-scroll::-webkit-scrollbar { width: 12px; }
                .ts-scroll::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.06);
                    border-radius: 999px;
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
                }
                .ts-scroll::-webkit-scrollbar-thumb {
                    border-radius: 999px;
                    background: linear-gradient(180deg, rgba(180,240,255,0.95), rgba(120,210,255,0.35), rgba(255,130,220,0.22));
                    box-shadow: 0 0 18px rgba(140,220,255,0.25);
                    border: 2px solid rgba(10,14,18,0.55);
                }

                @keyframes tsRGBJit {
                    0% { transform: translate(0px, 0px); }
                    24% { transform: translate(0px, 0px); }
                    25% { transform: translate(0.35px, -0.25px); }
                    49% { transform: translate(0.35px, -0.25px); }
                    50% { transform: translate(-0.25px, 0.35px); }
                    74% { transform: translate(-0.25px, 0.35px); }
                    75% { transform: translate(0.25px, 0.1px); }
                    100% { transform: translate(0px, 0px); }
                }

                @keyframes tsFrameGlow {
                    0% { box-shadow: 0 44px 130px rgba(0,0,0,0.74), 0 0 58px rgba(140,220,255,0.18), 0 0 0 1px rgba(255,255,255,0.06) inset; }
                    50% { box-shadow: 0 44px 130px rgba(0,0,0,0.74), 0 0 78px rgba(140,220,255,0.32), 0 0 0 1px rgba(255,255,255,0.07) inset; }
                    100% { box-shadow: 0 44px 130px rgba(0,0,0,0.74), 0 0 58px rgba(140,220,255,0.18), 0 0 0 1px rgba(255,255,255,0.06) inset; }
                }

                @keyframes tsPulseSoft {
                    0% { transform: scale(1); opacity: 0.96; }
                    50% { transform: scale(1.01); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.96; }
                }

                @keyframes tsOrbSheen {
                    0% { transform: translateX(-140%) rotate(12deg); opacity: 0; }
                    15% { opacity: 0.14; }
                    50% { opacity: 0.10; }
                    100% { transform: translateX(220%) rotate(12deg); opacity: 0; }
                }
            `}</style>

            <motion.div
                style={{
                    width: "100%",
                    maxWidth: 960,
                    height: "100%",
                    borderRadius: 30,
                    overflow: "hidden",
                    position: "relative",
                    border: "1px solid rgba(170,230,255,0.14)",
                    background:
                        visualMode === "immersion"
                            ? "radial-gradient(120% 140% at 50% 0%, rgba(255,255,255,0.18), rgba(0,0,0,0.0) 52%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.48))"
                            : "radial-gradient(120% 140% at 50% 0%, rgba(255,255,255,0.12), rgba(0,0,0,0.0) 52%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.44))",
                    backdropFilter: performanceMode
                        ? "none"
                        : visualMode === "immersion"
                          ? "blur(18px)"
                          : "blur(14px)",
                    display: "flex",
                    flexDirection: "column",
                    animation: performanceMode
                        ? "none"
                        : "tsFrameGlow 4.2s ease-in-out infinite",
                    boxShadow: performanceMode
                        ? "0 26px 86px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.05) inset"
                        : undefined,
                }}
            >
                {showOverlay ? (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 2,
                            pointerEvents: "none",
                            opacity: Math.max(
                                0,
                                Math.min(1, Number(overlayOpacity || 0.35))
                            ),
                            mixBlendMode: overlayBlend as any,
                            filter:
                                !performanceMode && Number(overlayBlur || 0) > 0
                                    ? `blur(${Number(overlayBlur)}px)`
                                    : "none",
                        }}
                    >
                        {overlayIsVideo ? (
                            <video
                                key={overlayUrl}
                                src={overlayUrl}
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="auto"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                                onCanPlay={(e) => {
                                    const v =
                                        e.currentTarget as HTMLVideoElement
                                    v.muted = true
                                    const p = v.play()
                                    if (
                                        p &&
                                        typeof (p as any).catch === "function"
                                    )
                                        (p as any).catch(() => {})
                                }}
                            />
                        ) : (
                            <img
                                src={overlayUrl}
                                alt="overlay"
                                loading="eager"
                                decoding="async"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                        )}
                    </div>
                ) : null}

                {/* TOP BAR */}
                <div
                    style={{
                        zIndex: 10,
                        position: "relative",
                        padding: 12,
                        display: "grid",
                        gridTemplateColumns: "56px minmax(0, 1fr) auto",
                        gap: 12,
                        alignItems: "center",
                    }}
                >
                    {showClose ? (
                        <button
                            className={`ts-haptic ${burstTop.burstKey ? "" : ""}`}
                            onPointerDown={() => burstTop.fire()}
                            onClick={handleClose}
                            aria-label="Close"
                            title="Close"
                            style={topIconBtn(performanceMode, uiFontFamily)}
                        >
                            ×
                        </button>
                    ) : (
                        <div />
                    )}

                    <div
                        style={{
                            height: 50,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "0 16px",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(170,230,255,0.14)",
                            color: textCol,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            fontWeight: 760,
                            fontSize: 18,
                            fontFamily: uiFontFamily,
                        }}
                    >
                        <span style={{ opacity: 0.94 }}>{title}</span>
                        <span
                            style={{
                                marginLeft: 10,
                                fontSize: 12,
                                fontWeight: 900,
                                letterSpacing: 0.2,
                                opacity: 0.8,
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: "1px solid rgba(170,230,255,0.14)",
                                background: "rgba(0,0,0,0.16)",
                            }}
                        >
                            Reset Quest
                        </span>

                        {/* low power hint (subtle, expensive, non-intrusive) */}
                        {visualMode === "immersion" &&
                        overlayIsVideo &&
                        lowPower ? (
                            <span
                                style={{
                                    marginLeft: 10,
                                    fontSize: 11,
                                    fontWeight: 900,
                                    opacity: 0.62,
                                }}
                            >
                                Video overlay off (power-save)
                            </span>
                        ) : null}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <ThemeToggle
                            value={chatTheme}
                            onChange={(v) => setChatTheme(v)}
                            uiFontFamily={uiFontFamily}
                        />
                        <ModeToggle
                            value={visualMode}
                            onChange={(v) => {
                                didUserSetModeRef.current = true
                                setVisualMode(v as any)
                            }}
                            uiFontFamily={uiFontFamily}
                        />
                    </div>
                </div>

                {/* OUTPUT PANEL */}
                <div
                    style={{
                        position: "relative",
                        zIndex: 5,
                        flex: "1 1 auto",
                        margin: "0 12px",
                        marginBottom: 12,
                        borderRadius: 28,
                        border: "1px solid rgba(170,230,255,0.14)",
                        background:
                            visualMode === "immersion"
                                ? "linear-gradient(180deg, rgba(0,0,0,0.14), rgba(0,0,0,0.34))"
                                : "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.28))",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Header row */}
                    <div
                        style={{
                            padding: "12px 12px",
                            color: "rgba(245,249,255,0.82)",
                            fontWeight: 900,
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            borderBottom: "1px solid rgba(170,230,255,0.10)",
                            background: "rgba(255,255,255,0.03)",
                            fontFamily: uiFontFamily,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <span style={{ opacity: 0.72, fontWeight: 760 }}>
                                {tab === "saved" ? "Ritual vault" : "Reset run"}
                            </span>

                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    className="ts-haptic"
                                    onClick={() => setTab("ritual")}
                                    style={tabBtn(
                                        tab === "ritual",
                                        uiFontFamily
                                    )}
                                >
                                    Play
                                </button>
                                <button
                                    className="ts-haptic"
                                    onClick={() => setTab("saved")}
                                    style={tabBtn(
                                        tab === "saved",
                                        uiFontFamily
                                    )}
                                >
                                    Vault ({saved.length})
                                </button>
                            </div>
                            {viewMode === "ritual" &&
                            currentRitualIsComplete &&
                            tab === "ritual" ? (
                                <div
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: 999,
                                        border: "1px solid rgba(143,220,255,0.14)",
                                        background: "rgba(143,220,255,0.07)",
                                        color: "rgba(188,234,255,0.92)",
                                        fontSize: 11,
                                        fontWeight: 950,
                                        letterSpacing: 0.7,
                                    }}
                                >
                                    ROUND {gameRound}
                                </div>
                            ) : null}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                            }}
                        >
                            <button
                                className={`ts-haptic ${burstCopy.burstKey ? "" : ""} ${copyDone ? "ts-burst" : ""}`}
                                onPointerDown={() => burstCopy.fire()}
                                onClick={() => copyRitual()}
                                title="Copy"
                                disabled={!currentRitualIsComplete}
                                style={miniBtn(
                                    copyDone ? "on" : "off",
                                    uiFontFamily
                                )}
                            >
                                {copyDone ? "✓ Copied" : "⧉ Copy"}
                            </button>
                            <button
                                className={`ts-haptic ${burstSave.burstKey ? "" : ""} ${saveDone ? "ts-burst" : ""}`}
                                onPointerDown={() => burstSave.fire()}
                                onClick={() => saveCurrent()}
                                title="Save"
                                disabled={!currentRitualIsComplete}
                                style={miniBtn(
                                    saveDone ? "on" : "off",
                                    uiFontFamily
                                )}
                            >
                                {saveDone ? "✓ Saved" : "✦ Save Win"}
                            </button>
                        </div>
                    </div>

                    {/* AVATAR (ALWAYS VISIBLE) */}
                    <div
                        style={{
                            position: "absolute",
                            right: 24 + Number(avatarX || 0),
                            top: 86 + Number(avatarY || 0),
                            width: Math.max(64, Number(avatarSize || 138)),
                            height: Math.max(64, Number(avatarSize || 138)),
                            borderRadius: "50%",
                            zIndex: 30,
                            overflow: "hidden",
                            border: "1px solid rgba(170,230,255,0.22)",
                            background: orbBg(activeBubble),
                            boxShadow: performanceMode
                                ? "0 0 34px rgba(140,220,255,0.14)"
                                : "0 0 56px rgba(140,220,255,0.24), 0 0 160px rgba(90,190,255,0.12)",
                            pointerEvents: "none",
                            animation: performanceMode
                                ? "none"
                                : "tsPulseSoft 3.8s ease-in-out infinite",
                        }}
                    >
                        {/* premium sheen */}
                        <div
                            style={{
                                position: "absolute",
                                inset: -20,
                                background:
                                    "linear-gradient(120deg, rgba(255,255,255,0.00), rgba(255,255,255,0.14), rgba(255,255,255,0.00))",
                                transform: "translateX(-140%) rotate(12deg)",
                                animation: performanceMode
                                    ? "none"
                                    : "tsOrbSheen 5.8s ease-in-out infinite",
                            }}
                        />

                        {hasAvatar ? (
                            <motion.img
                                key={`${shownAvatar}-${activeBubble}`}
                                src={shownAvatar}
                                alt="avatar"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                    duration: performanceMode ? 0.12 : 0.22,
                                }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    position: "relative",
                                    zIndex: 2,
                                }}
                                loading="eager"
                                decoding="async"
                                onError={() => setAvatarBroken(true)}
                            />
                        ) : (
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "rgba(248,252,255,0.92)",
                                    fontWeight: 950,
                                    fontSize: Math.max(
                                        22,
                                        Math.round(
                                            Math.max(
                                                64,
                                                Number(avatarSize || 138)
                                            ) * 0.3
                                        )
                                    ),
                                    letterSpacing: 0.2,
                                    textShadow: "0 1px 0 rgba(0,0,0,0.72)",
                                    zIndex: 3,
                                }}
                            >
                                {bubbleInitial(activeBubble)}
                            </div>
                        )}
                    </div>

                    {/* Scroll content */}
                    <div
                        ref={scrollRef}
                        className="ts-scroll"
                        style={{
                            flex: "1 1 auto",
                            minHeight: 0,
                            overflowY: "auto",
                            padding: "24px clamp(14px, 4vw, 42px) 36px",
                        }}
                    >
                        {tab === "saved" ? (
                            <div style={{ display: "grid", gap: 10 }}>
                                {!saved.length ? (
                                    <div
                                        style={{
                                            color: "rgba(245,249,255,0.55)",
                                            fontWeight: 850,
                                            fontSize: 16,
                                            padding: "18px 8px",
                                        }}
                                    >
                                        ◇ No saved rituals yet. Tap “✦ Save” on
                                        a ritual.
                                    </div>
                                ) : (
                                    saved.map((s) => (
                                        <div
                                            key={s.id}
                                            style={{
                                                borderRadius: 18,
                                                border: "1px solid rgba(170,230,255,0.14)",
                                                background:
                                                    visualMode === "immersion"
                                                        ? "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.34))"
                                                        : "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.26))",
                                                padding: 14,
                                                position: "relative",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {true ? (
                                                <div
                                                    style={{
                                                        marginBottom: 14,
                                                        display: "flex",
                                                        justifyContent:
                                                            "center",
                                                    }}
                                                >
                                                    <div
                                                        style={bubbleBadgeStyle(
                                                            !!performanceMode,
                                                            uiFontFamily,
                                                            String(
                                                                s.bubble ||
                                                                    "GLITCH"
                                                            ).toLowerCase() as BubbleSlug
                                                        )}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            style={{
                                                                fontSize: 15,
                                                                lineHeight: 1,
                                                                opacity: 0.95,
                                                            }}
                                                        >
                                                            ◇
                                                        </span>
                                                        <span>
                                                            {BUBBLE_LABEL[
                                                                String(
                                                                    s.bubble ||
                                                                        "GLITCH"
                                                                ).toLowerCase() as BubbleSlug
                                                            ] || "Glitch"}{" "}
                                                            Bubble
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {s.challenge ? (
                                                <div
                                                    style={{
                                                        color: dimCol,
                                                        fontWeight: 900,
                                                        fontSize: 13,
                                                        marginBottom: 8,
                                                        fontFamily:
                                                            uiFontFamily,
                                                    }}
                                                >
                                                    {formatChallengeLineRaw(
                                                        s.challenge
                                                    )}
                                                </div>
                                            ) : null}

                                            <div
                                                style={{
                                                    color: textCol,
                                                    fontSize: ritualBaseSize,
                                                    fontFamily:
                                                        ritualFontFamily,
                                                }}
                                            >
                                                <PremiumRitualText
                                                    text={s.text}
                                                    fontFamily={
                                                        ritualFontFamily
                                                    }
                                                    fontSize={ritualBaseSize}
                                                />
                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 8,
                                                    marginTop: 10,
                                                }}
                                            >
                                                <button
                                                    className="ts-haptic"
                                                    style={miniBtn(
                                                        "off",
                                                        uiFontFamily
                                                    )}
                                                    onClick={() => {
                                                        markGesture()
                                                        setTab("ritual")
                                                        setCurrentText(s.text)
                                                        setCurrentSig(s.sig)
                                                        setViewMode("ritual")
                                                        setRunKey(
                                                            `run-${Date.now()}-${makeSeed()}`
                                                        )
                                                        setHasTypedOnce(
                                                            !!typedSigMap[s.sig]
                                                        )
                                                        if (typedSigMap[s.sig])
                                                            markTypedSig(s.sig)
                                                    }}
                                                >
                                                    ↩ Open
                                                </button>
                                                <button
                                                    className="ts-haptic"
                                                    style={miniBtn(
                                                        "danger",
                                                        uiFontFamily
                                                    )}
                                                    onClick={() => {
                                                        markGesture()
                                                        setSaved(
                                                            saved.filter(
                                                                (x) =>
                                                                    x.id !==
                                                                    s.id
                                                            )
                                                        )
                                                    }}
                                                >
                                                    ✕ Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <>
                                {/* The user input is intentionally not repeated above the ritual. */}

                                {viewMode === "prompt" && (
                                    <div
                                        style={{
                                            color: "rgba(245,249,255,0.50)",
                                            fontWeight: 850,
                                            fontSize: 18,
                                            padding: "10px 8px",
                                            whiteSpace: "pre-wrap",
                                            fontFamily: uiFontFamily,
                                        }}
                                    >
                                        ◇ Type what’s happening.
                                        {libStatus === "error" && libError ? (
                                            <div
                                                style={{
                                                    marginTop: 12,
                                                    fontSize: 13,
                                                    opacity: 0.9,
                                                    whiteSpace: "pre-wrap",
                                                }}
                                            >
                                                {libError}
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {viewMode === "status" && (
                                    <div
                                        style={{
                                            color: "rgba(245,249,255,0.78)",
                                            fontWeight: 900,
                                            fontSize: 18,
                                            whiteSpace: "pre-wrap",
                                            padding: "10px 8px",
                                            fontFamily: uiFontFamily,
                                        }}
                                    >
                                        {statusText}
                                    </div>
                                )}

                                {viewMode === "ritual" &&
                                    !currentRitualIsComplete && (
                                        <div
                                            style={{
                                                margin: "0 auto",
                                                maxWidth: 680,
                                                padding: "18px 20px",
                                                borderRadius: 18,
                                                background:
                                                    "rgba(255,110,110,0.08)",
                                                border: "1px solid rgba(255,130,130,0.20)",
                                                color: "rgba(255,225,225,0.92)",
                                                fontFamily: uiFontFamily,
                                                fontSize: 14,
                                                lineHeight: 1.55,
                                            }}
                                        >
                                            A complete ritual was not available,
                                            so ThinkStill blocked the empty card.
                                            Reset the quest after checking the
                                            Manifest URL.
                                        </div>
                                    )}

                                {viewMode === "ritual" &&
                                    currentRitualIsComplete && (
                                    <div
                                        style={{
                                            borderRadius: 22,
                                            border: "1px solid rgba(170,230,255,0.14)",
                                            background:
                                                visualMode === "immersion"
                                                    ? "linear-gradient(180deg, rgba(255,255,255,0.11), rgba(0,0,0,0.36))"
                                                    : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.28))",
                                            padding: "clamp(18px, 3vw, 30px)",
                                            position: "relative",
                                            overflow: "hidden",
                                            boxShadow:
                                                "0 18px 55px rgba(0,0,0,0.22)",
                                        }}
                                    >
                                        {true ? (
                                            <div
                                                style={{
                                                    marginBottom: 16,
                                                    display: "flex",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <motion.div
                                                    initial={{
                                                        opacity: 0,
                                                        y: -6,
                                                        scale: 0.96,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        y: 0,
                                                        scale: 1,
                                                    }}
                                                    transition={{
                                                        duration:
                                                            performanceMode
                                                                ? 0
                                                                : 0.35,
                                                        ease: "easeOut",
                                                    }}
                                                    style={bubbleBadgeStyle(
                                                        !!performanceMode,
                                                        uiFontFamily,
                                                        activeBubble
                                                    )}
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        style={{
                                                            fontSize: 15,
                                                            lineHeight: 1,
                                                            opacity: 0.95,
                                                        }}
                                                    >
                                                        ◇
                                                    </span>
                                                    <span>
                                                        {BUBBLE_LABEL[
                                                            activeBubble
                                                        ] || "Glitch"}{" "}
                                                        Bubble
                                                    </span>
                                                </motion.div>
                                            </div>
                                        ) : null}

                                        {lastSignal ? (
                                            <div
                                                style={{
                                                    margin: "0 auto 14px",
                                                    maxWidth: 680,
                                                    display: "grid",
                                                    gridTemplateColumns:
                                                        "auto 1fr auto",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    padding: "10px 12px",
                                                    borderRadius: 15,
                                                    background:
                                                        "rgba(0,0,0,0.18)",
                                                    border: "1px solid rgba(143,220,255,0.10)",
                                                    fontFamily: uiFontFamily,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 950,
                                                        letterSpacing: 1,
                                                        color: "rgba(169,229,255,0.88)",
                                                    }}
                                                >
                                                    MISSION
                                                </span>
                                                <span
                                                    style={{
                                                        minWidth: 0,
                                                        overflow: "hidden",
                                                        textOverflow:
                                                            "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        fontSize: 12,
                                                        fontWeight: 720,
                                                        color: "rgba(232,240,246,0.80)",
                                                    }}
                                                >
                                                    {lastSignal}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 950,
                                                        color: "rgba(194,235,255,0.86)",
                                                    }}
                                                >
                                                    R{gameRound}
                                                </span>
                                            </div>
                                        ) : null}

                                        <div
                                            style={{
                                                color: textCol,
                                                fontSize: ritualBaseSize,
                                                fontFamily: ritualFontFamily,
                                            }}
                                        >
                                            <PremiumRitualText
                                                text={currentText}
                                                fontFamily={ritualFontFamily}
                                                fontSize={ritualBaseSize}
                                            />
                                            <div
                                                style={{
                                                    maxWidth: 680,
                                                    margin: "0 auto",
                                                }}
                                            >
                                                <GameFeedbackPanel
                                                    round={gameRound}
                                                    state={feedbackState}
                                                    uiFontFamily={uiFontFamily}
                                                    onHelped={() =>
                                                        setFeedbackState(
                                                            "helped"
                                                        )
                                                    }
                                                    onRefine={() =>
                                                        setFeedbackState(
                                                            "refine"
                                                        )
                                                    }
                                                    onRetry={() =>
                                                        requestAnotherRitual()
                                                    }
                                                    onCue={(cue) =>
                                                        requestAnotherRitual(
                                                            cue
                                                        )
                                                    }
                                                    onNewIssue={startNewQuest}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* INPUT ROW (safe-area padding) */}
                <div
                    style={{
                        zIndex: 10,
                        paddingLeft: 12,
                        paddingRight: 12,
                        paddingTop: 0,
                        paddingBottom: `calc(14px + env(safe-area-inset-bottom))`,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                        }}
                    >
                        <input
                            ref={inputElRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && libStatus === "ready") {
                                    e.preventDefault()
                                    sendMessage()
                                }
                            }}
                            placeholder="What’s happening right now?"
                            style={inputStyle(
                                textCol,
                                uiFontFamily,
                                performanceMode
                            )}
                        />

                        <button
                            className={`ts-haptic ts-burst`}
                            onPointerDown={() => burstMusic.fire()}
                            onClick={() => {
                                markGesture()
                                setMusicOn((v: boolean) => !v)
                            }}
                            title={musicOn ? "Music: On" : "Music: Off"}
                            style={pillBtn(
                                musicOn,
                                performanceMode,
                                uiFontFamily
                            )}
                        >
                            {musicOn ? "🎧" : "🔇"}
                        </button>

                        <button
                            className="ts-haptic"
                            onPointerDown={() => burstMic.fire()}
                            onClick={() => toggleMic()}
                            title={
                                speechSupported
                                    ? isListening
                                        ? "Stop Mic"
                                        : "Mic (auto-send on end)"
                                    : "Mic unsupported"
                            }
                            disabled={!speechSupported}
                            style={pillBtn(
                                speechSupported && isListening,
                                performanceMode,
                                uiFontFamily
                            )}
                        >
                            🎤
                        </button>

                        <button
                            className="ts-haptic"
                            onPointerDown={() => burstSend.fire()}
                            onClick={() => sendMessage()}
                            title={
                                libStatus === "ready"
                                    ? "Play ritual"
                                    : libStatus === "loading"
                                      ? "Loading 750 rituals"
                                      : "Ritual library unavailable"
                            }
                            disabled={
                                isThinking ||
                                libStatus !== "ready" ||
                                !norm(input)
                            }
                            style={{
                                ...sendBtn(performanceMode, uiFontFamily),
                                minWidth: 82,
                                padding: "0 16px",
                                opacity:
                                    isThinking ||
                                    libStatus !== "ready" ||
                                    !norm(input)
                                        ? 0.5
                                        : 1,
                                fontSize: 12,
                                letterSpacing: 0.5,
                            }}
                        >
                            ▶ PLAY
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

/* Framer controls */
const fileCtrl = (title: string) => ({
    type: ControlType.File,
    allowedFileTypes: ["gif", "webp", "png", "jpg", "jpeg", "webm", "mp4"],
    title,
})

addPropertyControls(ThinkStillUnifiedChat, {
    title: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "ThinkStill",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#07090d",
    },
    performanceMode: {
        type: ControlType.Boolean,
        title: "Performance Mode",
        defaultValue: true,
    },

    showBubbleLabelInResponse: {
        type: ControlType.Boolean,
        title: "Bubble Label (Always On)",
        defaultValue: true,
    },

    outputAnimation: {
        type: ControlType.Enum,
        title: "Output",
        options: ["typewriter", "none"],
        optionTitles: ["Typewriter", "None"],
        defaultValue: "none",
    },
    outputMsPerChar: {
        type: ControlType.Number,
        title: "Speed (ms/char)",
        min: 0,
        max: 60,
        step: 1,
        defaultValue: 0,
    },

    rgbIntensity: {
        type: ControlType.Number,
        title: "RGB Intensity",
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 0,
    },
    rgbSpeedFactor: {
        type: ControlType.Number,
        title: "RGB Speed (higher=slower)",
        min: 0.25,
        max: 4,
        step: 0.05,
        defaultValue: 1.6,
    },

    comfortLevel: {
        type: ControlType.Enum,
        title: "Comfort Lines",
        options: ["none", "one", "two"],
        optionTitles: ["None", "1 line", "2 lines (best)"],
        defaultValue: "two",
    },

    showClose: {
        type: ControlType.Boolean,
        title: "Show Close",
        defaultValue: true,
    },
    closeFallbackUrl: {
        type: ControlType.String,
        title: "Close Fallback URL",
        placeholder: "https://thinkstill.app",
    },

    manifestUrl: {
        type: ControlType.String,
        title: "Manifest URL",
        defaultValue: DEFAULT_MANIFEST_URL,
    },

    defaultVisualMode: {
        type: ControlType.Enum,
        title: "Visual Mode",
        options: ["minimal", "immersion"],
        optionTitles: ["Minimal", "Immersion"],
        defaultValue: "minimal",
    },

    uiFont: {
        type: ControlType.Enum,
        title: "UI Font (Menus)",
        options: [
            "SFRounded",
            "SFPro",
            "Inter",
            "Manrope",
            "PlusJakartaSans",
            "Outfit",
            "Urbanist",
            "Sora",
            "Syne",
            "WorkSans",
            "NunitoSans",
            "IBM Plex Sans",
            "Rubik",
            "ReadexPro",
            "System",
        ],
        defaultValue: "Inter",
    },
    uiFontCustom: { type: ControlType.String, title: "UI Font Custom" },

    ritualFont: {
        type: ControlType.Enum,
        title: "Ritual Font (Output)",
        options: [
            "Inter",
            "Manrope",
            "PlusJakartaSans",
            "SpaceGrotesk",
            "DMSans",
            "Outfit",
            "Urbanist",
            "Sora",
            "Syne",
            "WorkSans",
            "NunitoSans",
            "IBM Plex Sans",
            "Rubik",
            "ReadexPro",
            "JetBrainsMono",
            "System",
        ],
        defaultValue: "Inter",
    },
    ritualFontCustom: { type: ControlType.String, title: "Ritual Font Custom" },
    ritualFontSize: {
        type: ControlType.Number,
        title: "Ritual Font Size",
        min: 14,
        max: 26,
        step: 1,
        defaultValue: 18,
    },

    overlayVariant: {
        type: ControlType.Number,
        title: "Overlay Variant",
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 1,
    },
    overlayOpacity: {
        type: ControlType.Number,
        title: "Overlay Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.35,
    },
    overlayBlend: {
        type: ControlType.Enum,
        title: "Overlay Blend",
        options: ["screen", "overlay", "soft-light", "normal", "lighten"],
        defaultValue: "screen",
    },
    overlayBlur: {
        type: ControlType.Number,
        title: "Overlay Blur",
        min: 0,
        max: 12,
        step: 1,
        defaultValue: 0,
    },
    allowOverlayVideoInPerf: {
        type: ControlType.Boolean,
        title: "Allow Video in Perf",
        defaultValue: true,
    },

    musicEnabledByDefault: {
        type: ControlType.Boolean,
        title: "Music On Default",
        defaultValue: false,
    },
    musicVolume: {
        type: ControlType.Number,
        title: "Music Volume",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.45,
    },

    musicGlobal: {
        type: ControlType.File,
        allowedFileTypes: ["mp3", "wav", "m4a", "ogg"],
        title: "Music – Global",
    },
    musicStill: {
        type: ControlType.File,
        allowedFileTypes: ["mp3", "wav", "m4a", "ogg"],
        title: "Music – Still",
    },
    musicPatch: {
        type: ControlType.File,
        allowedFileTypes: ["mp3", "wav", "m4a", "ogg"],
        title: "Music – Patch",
    },
    musicSync: {
        type: ControlType.File,
        allowedFileTypes: ["mp3", "wav", "m4a", "ogg"],
        title: "Music – Sync",
    },
    musicLoopie: {
        type: ControlType.File,
        allowedFileTypes: ["mp3", "wav", "m4a", "ogg"],
        title: "Music – Loopie",
    },
    musicDrop: {
        type: ControlType.File,
        allowedFileTypes: ["mp3", "wav", "m4a", "ogg"],
        title: "Music – Drop",
    },
    musicRush: {
        type: ControlType.File,
        allowedFileTypes: ["mp3", "wav", "m4a", "ogg"],
        title: "Music – Rush",
    },
    musicGlitch: {
        type: ControlType.File,
        allowedFileTypes: ["mp3", "wav", "m4a", "ogg"],
        title: "Music – Glitch",
    },

    avatarX: {
        type: ControlType.Number,
        title: "Avatar X",
        min: -320,
        max: 320,
        step: 1,
        defaultValue: 0,
    },
    avatarY: {
        type: ControlType.Number,
        title: "Avatar Y",
        min: -320,
        max: 320,
        step: 1,
        defaultValue: 0,
    },
    avatarSize: {
        type: ControlType.Number,
        title: "Avatar Size",
        min: 64,
        max: 220,
        step: 1,
        defaultValue: 138,
    },

    avatarStill: fileCtrl("Avatar – Still"),
    avatarPatch: fileCtrl("Avatar – Patch"),
    avatarSync: fileCtrl("Avatar – Sync"),
    avatarLoopie: fileCtrl("Avatar – Loopie"),
    avatarDrop: fileCtrl("Avatar – Drop"),
    avatarRush: fileCtrl("Avatar – Rush"),
    avatarGlitch: fileCtrl("Avatar – Glitch"),

    stillOverlay1: fileCtrl("Still Overlay 1"),
    stillOverlay2: fileCtrl("Still Overlay 2"),
    stillOverlay3: fileCtrl("Still Overlay 3"),
    stillOverlay4: fileCtrl("Still Overlay 4"),
    stillOverlay5: fileCtrl("Still Overlay 5"),

    patchOverlay1: fileCtrl("Patch Overlay 1"),
    patchOverlay2: fileCtrl("Patch Overlay 2"),
    patchOverlay3: fileCtrl("Patch Overlay 3"),
    patchOverlay4: fileCtrl("Patch Overlay 4"),
    patchOverlay5: fileCtrl("Patch Overlay 5"),

    syncOverlay1: fileCtrl("Sync Overlay 1"),
    syncOverlay2: fileCtrl("Sync Overlay 2"),
    syncOverlay3: fileCtrl("Sync Overlay 3"),
    syncOverlay4: fileCtrl("Sync Overlay 4"),
    syncOverlay5: fileCtrl("Sync Overlay 5"),

    loopieOverlay1: fileCtrl("Loopie Overlay 1"),
    loopieOverlay2: fileCtrl("Loopie Overlay 2"),
    loopieOverlay3: fileCtrl("Loopie Overlay 3"),
    loopieOverlay4: fileCtrl("Loopie Overlay 4"),
    loopieOverlay5: fileCtrl("Loopie Overlay 5"),

    dropOverlay1: fileCtrl("Drop Overlay 1"),
    dropOverlay2: fileCtrl("Drop Overlay 2"),
    dropOverlay3: fileCtrl("Drop Overlay 3"),
    dropOverlay4: fileCtrl("Drop Overlay 4"),
    dropOverlay5: fileCtrl("Drop Overlay 5"),

    rushOverlay1: fileCtrl("Rush Overlay 1"),
    rushOverlay2: fileCtrl("Rush Overlay 2"),
    rushOverlay3: fileCtrl("Rush Overlay 3"),
    rushOverlay4: fileCtrl("Rush Overlay 4"),
    rushOverlay5: fileCtrl("Rush Overlay 5"),

    glitchOverlay1: fileCtrl("Glitch Overlay 1"),
    glitchOverlay2: fileCtrl("Glitch Overlay 2"),
    glitchOverlay3: fileCtrl("Glitch Overlay 3"),
    glitchOverlay4: fileCtrl("Glitch Overlay 4"),
    glitchOverlay5: fileCtrl("Glitch Overlay 5"),
})
