// ===================== PART 1/5 =====================
// ThinkStill — Unified Chat (v38.12.1 GROWTH HOTFIX — SHARE LINKS + VISIBLE SHIFT FEEDBACK)
// ✅ v38.12.1 HOTFIX: share URLs are embedded directly in native-share text + shift answers give immediate visible confirmation
// ✅ v38.12.0 GROWTH LAYER: curated first-session boosts + shift feedback + adaptive Reset DNA + shareable Mind Bend cards + deep-link trials
// ✅ v38.11.0 SEMANTIC ROUTING: natural-language aliases + dedicated urge/substance intent keep broad inputs on the correct ritual family
// ✅ v38.10.0 SLAB REVEAL: reduced ambient glow + brushed/recessed slab surfaces; ritual remains the luminous reveal
// ✅ v38.9.0 PREMIUM FORMAT RESTORE: v13 GOAL schema renders the full connected ritual journey again
// ✅ NO INITIAL PROMPT preserved: blank ritual stage until the user enters an issue; no orb / instruction / subtitle
// ✅ PRESERVED RITUAL MOTION: entrance timing, dot breathing, path travel, hover lift and PLAY pulse remain untouched
// ✅ SINGLE-FORMAT BRAND: “ThinkStill Reset Console” remains one unified text element with identical typography
// ✅ v38.6.2 CONNECTED RITUAL JOURNEY: GOAL → ONE RULE → PLAY → TWIST → WIN → MIND BEND travel on one luminous connected-dot path
// ✅ v38.6.0 RELEASE SKIN: unified premium ritual window + title-free SAFETY + coherent tactile/hypnotic console UI
// ✅ v38.5.1 PRODUCT DEPTH: label-free centred hero + dimensional six-beat ritual path
// ✅ v26 HEADER ORDER: <BUBBLE NAME> <SECONDS Guided Reset> inside the ritual header
// ✅ v23 MEDIA PLAYER NAV: ritual feedback removed; PREVIOUS/NEXT controls browse the ritual queue
// ✅ ENTER stays independent and always submits the text field as a new issue
// ✅ Framer avatar controls now directly drive avatar size + X/Y position
// ✦ v13 RELEASE FIX: schema-resilient Goal + formatted Steps + Vault/Save + hypnotic console
// ✅ v2000 routing repair: semantic alias expansion + urge/substance intent + cross-subpattern competition + bubble diversity + global no-replay
// ✅ v21 VIDEO DEBUG: optional Framer debug badge + console log shows exact bubble / slot / file URL
// ✅ v20 PRELOAD: next transition video for every bubble is warmed in the background before ENTER
// ✅ v19 FRAMER VIDEO PLAY TIME: exact editor-controlled video window; shorter clips loop, longer clips cut
// ✅ v17 SEPARATE VIDEO GATE: routed transition video plays on its own screen, then ritual reveals after the transition
// ✅ v16 FRAMER VIDEO CONTROL: transition video size + circular crop + crop zoom are editor-adjustable
// ✅ v15 SINGLE VISUAL MODE: CLEAN/FX removed; routed bubble videos are transition-only
// ✅ Music on/off moved beside the mic in the input deck
// ✅ v7 routing metadata: 22 broad parent routes + precise Best For labels embedded in every ritual
// ✅ GLOBAL 750-ritual no-replay cycle; reset only after complete exhaustion
// ✅ No manual bubble selection; bubble visuals follow the chosen ritual
// Paste PART 1 → PART 5 into ONE Framer code component file IN ORDER.
// v13 GITHUB SETUP: host thinkstill-manifest-v13.json + the 7 bubble JSON files
// in the same public GitHub folder, then paste the RAW manifest URL into the Framer “Manifest URL” control.

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
    safety_class?: string
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
    // v6/v7 game-schema compatibility
    goal?: string
    mission?: string
    rule?: string
    play?: string
    twist?: string
    steps?: any[] | string
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

    // growth-layer metadata (v13 core text remains frozen)
    first_session_pick?: boolean
    first_session_rank?: number | string
    reset_dna_family?: string

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

type RitualRuntimeMeta = {
    ritualId?: string
    ritualName?: string
    mindBend?: string
    win?: string
    playTime?: string
    resetDNAFamily?: string
    thinkingError?: string
    preciseSubpattern?: string
    usedCount?: number
    totalCount?: number
    cycle?: number
    firstSessionPick?: boolean
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

// v38.11 / v2000: high-confidence natural-language routing aliases.
// The workbook deliberately uses stable canonical route language (e.g. "Urges / Habit Loops").
// Users do not. These aliases translate everyday issue words into those canonical concepts
// before scoring, without changing or reskinning any of the 750 locked rituals.
type RoutingAliasRule = {
    test: RegExp
    expand: string
    parents: Array<{ name: string; boost: number }>
    suppressOnImmediateAlarm?: boolean
}

const ROUTING_ALIAS_RULES: RoutingAliasRule[] = [
    {
        test: /\b(drugs?|substances?|addict(?:ion|ed|ive)?|crav(?:e|ing|ings)?|relaps(?:e|ed|ing)?|cocaine|meth(?:amphetamine)?|heroin|weed|cannabis|marijuana|nicotine|vape|vaping|smok(?:e|ing)|alcohol|booze|pills?)\b/i,
        expand: "urge urges impulse craving habit compulsion temptation addiction action gap trigger cue delay friction choice",
        parents: [{ name: "Urges / Habit Loops", boost: 340 }],
        suppressOnImmediateAlarm: true,
    },
    {
        test: /\b(gambl(?:e|ing)|doomscroll(?:ing)?|scrolling addiction|gaming addiction|porn(?:ography)?|binge(?:ing)?|compulsive shopping)\b/i,
        expand: "urge impulse craving habit compulsion temptation addiction action gap trigger cue",
        parents: [{ name: "Urges / Habit Loops", boost: 300 }],
    },
    {
        test: /\b(break\s?up|dumped|divorc(?:e|ed|ing)|separation|heartbreak|heartbroken|relationship ended|lost my partner)\b/i,
        expand: "grief loss rejection social hurt meaning letting go",
        parents: [
            { name: "Values / Meaning / Grief", boost: 220 },
            { name: "Social / Team / Perspective", boost: 130 },
        ],
    },
    {
        test: /\b(relationship|partner|husband|wife|boyfriend|girlfriend|marriage|argument|arguing|fight with|conflict with)\b/i,
        expand: "communication conversation boundary boundaries conflict repair perspective",
        parents: [{ name: "Communication / Boundaries", boost: 210 }],
    },
    {
        test: /\b(money|financial|finances|debt|debts|bills?|rent|mortgage|expenses?|budget|cash flow|cashflow)\b/i,
        expand: "uncertainty worry future decision choose options pressure clarity",
        parents: [
            { name: "Uncertainty / Future Worry / Reassurance", boost: 170 },
            { name: "Decision Pressure", boost: 120 },
        ],
    },
    {
        test: /\b(job interview|interview|presentation|public speaking|exam|exams|test anxiety|performance review|stage fright)\b/i,
        expand: "performance confidence nervous pressure mistake presentation exam meeting",
        parents: [{ name: "Performance / Confidence", boost: 260 }],
    },
    {
        test: /\b(work|job|career|boss|manager|school|study|studying|university|college)\b/i,
        expand: "performance pressure confidence decision focus attention",
        parents: [{ name: "Performance / Confidence", boost: 105 }],
    },
    {
        test: /\b(trauma|flashback|flashbacks|bad memory|nightmare image|mental picture)\b/i,
        expand: "mental imagery image visual picture mental movie scene grounding present",
        parents: [
            { name: "Mental Imagery", boost: 210 },
            { name: "Attention / Grounding / Mental Quiet", boost: 100 },
        ],
    },
    {
        test: /\b(lonely|loneliness|left out|ignored|ghosted|rejected|rejection|judged|comparison|jealous|jealousy)\b/i,
        expand: "social pressure perspective rejection judged comparison lonely ignored",
        parents: [{ name: "Social / Team / Perspective", boost: 220 }],
    },
    {
        test: /\b(can(?:not|'t) switch off|mind won(?:not|'t) stop|busy mind at night|awake all night)\b/i,
        expand: "sleep insomnia bedtime awake tired night switch off winding down mental quiet",
        parents: [{ name: "Sleep / Winding Down", boost: 230 }],
    },
]

function hasImmediateBodyAlarm(message: string) {
    return (
        detectPanicIntent(message) ||
        /\b(overdose|overdosed|seizure|chest pain|unconscious|not breathing|severe withdrawal|detoxing)\b/i.test(
            message || ""
        )
    )
}

function expandRoutingMessage(message: string) {
    const raw = String(message || "")
    const additions: string[] = []
    const immediateAlarm = hasImmediateBodyAlarm(raw)
    for (const rule of ROUTING_ALIAS_RULES) {
        if (!rule.test.test(raw)) continue
        if (rule.suppressOnImmediateAlarm && immediateAlarm) continue
        additions.push(rule.expand)
    }
    return additions.length ? `${raw} ${additions.join(" ")}` : raw
}

function semanticParentBoost(message: string, parent: string) {
    const raw = String(message || "")
    const immediateAlarm = hasImmediateBodyAlarm(raw)
    let boost = 0
    for (const rule of ROUTING_ALIAS_RULES) {
        if (!rule.test.test(raw)) continue
        if (rule.suppressOnImmediateAlarm && immediateAlarm) continue
        for (const p of rule.parents) if (p.name === parent) boost += p.boost
    }
    return boost
}

function detectUrgeIntent(message: string) {
    const t = (message || "").toLowerCase()
    if (hasImmediateBodyAlarm(t)) return false
    return /\b(urge|urges|impulse|crav(?:e|ing|ings)?|temptation|compulsion|addict(?:ion|ed|ive)?|relaps(?:e|ed|ing)?|drugs?|substances?|cocaine|meth(?:amphetamine)?|heroin|weed|cannabis|marijuana|nicotine|vape|vaping|smok(?:e|ing)|alcohol|booze|gambl(?:e|ing)|doomscroll(?:ing)?|compulsive shopping)\b/i.test(
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
const OVERLAY_ROTATION_KEY = "__ts_overlay_rotation_v1"

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

    const baseFromManifest = normalizeLibraryUrl(
        String(manifest?.base_url || "")
    )
    if (baseFromManifest)
        return joinUrl(baseFromManifest, String(p?.filename || ""))

    const mu = normalizeLibraryUrl(manifestUrl)
    const i = mu.lastIndexOf("/")
    const folder = i >= 0 ? mu.slice(0, i) : mu
    return joinUrl(folder, String(p?.filename || ""))
}
const FETCH_TIMEOUTS_MS = [45000, 75000]

function waitMs(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function fetchJson(
    url: string
): Promise<{ ok: boolean; json?: any; diag?: string }> {
    const u = normalizeLibraryUrl(String(url || ""))
    let lastDiag = `Fetch failed\n${u}`

    for (let attempt = 0; attempt < FETCH_TIMEOUTS_MS.length; attempt++) {
        const timeoutMs = FETCH_TIMEOUTS_MS[attempt]
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), timeoutMs)

        try {
            const res = await fetch(u, {
                // Allow the browser to reuse/revalidate GitHub RAW responses.
                // `no-store` forced every Framer remount to download all 7 large
                // ritual files again and made timeouts much more likely.
                cache: "default",
                signal: controller.signal,
            })
            const ct = res.headers.get("content-type") || ""
            if (!res.ok) {
                let snippet = ""
                try {
                    const t = await res.text()
                    snippet = t.slice(0, 220)
                } catch {}

                lastDiag = `Fetch failed (${res.status})\n${u}\n\n${ct}\n${snippet || ""}`

                // Retry only temporary server/rate-limit failures.
                if (
                    attempt < FETCH_TIMEOUTS_MS.length - 1 &&
                    (res.status === 429 || res.status >= 500)
                ) {
                    await waitMs(600 + attempt * 700)
                    continue
                }
                return { ok: false, diag: lastDiag }
            }

            const body = await res.text()
            const j = safeJsonParse<any>(body)
            if (!j) {
                return {
                    ok: false,
                    diag: `JSON parse failed\n${u}\n\n${body.slice(0, 220)}`,
                }
            }
            return { ok: true, json: j }
        } catch (e: any) {
            const timedOut =
                controller.signal.aborted ||
                String(e?.name || "") === "AbortError"
            lastDiag = timedOut
                ? `Fetch timed out after ${Math.round(timeoutMs / 1000)}s\n${u}`
                : `Fetch exception\n${u}\n\n${String(e?.message || e)}`

            if (attempt < FETCH_TIMEOUTS_MS.length - 1) {
                await waitMs(600 + attempt * 700)
                continue
            }
        } finally {
            clearTimeout(timeout)
        }
    }

    return { ok: false, diag: lastDiag }
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
    if (raw && Array.isArray(raw.bubbles)) {
        // Accept both native { bubble, parts } entries and compact
        // v58 one-folder entries such as { name, file, count }.
        const normalizedBubbles: ManifestBubble[] = raw.bubbles
            .map((entry: any) => {
                if (Array.isArray(entry?.parts) && entry.parts.length) {
                    return {
                        bubble: String(
                            entry?.bubble || entry?.name || ""
                        ).toUpperCase() as BubbleKey,
                        parts: entry.parts,
                    }
                }
                const bubble = String(
                    entry?.bubble ||
                        entry?.name ||
                        entry?.bubble_key ||
                        entry?.bubbleName ||
                        ""
                ).toUpperCase() as BubbleKey
                const filename = String(
                    entry?.filename || entry?.file || entry?.path || ""
                ).trim()
                const directUrl = String(entry?.url || entry?.href || "").trim()
                if (!bubble || (!filename && !directUrl)) return null
                return {
                    bubble,
                    parts: [
                        {
                            filename: filename || undefined,
                            url: directUrl || undefined,
                            rows:
                                typeof entry?.rows === "number"
                                    ? entry.rows
                                    : typeof entry?.count === "number"
                                      ? entry.count
                                      : undefined,
                        },
                    ],
                }
            })
            .filter(Boolean) as ManifestBubble[]

        if (normalizedBubbles.length) {
            return {
                meta: raw?.meta || {
                    project: raw?.project,
                    version: raw?.version,
                    row_count: raw?.row_count ?? raw?.ritual_count,
                },
                base_url: raw?.base_url || raw?.baseUrl,
                bubbles: normalizedBubbles,
            }
        }
    }

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

/* Soft visual/fallback route only — final ritual choice uses the v2000 semantic 22-parent competitive router */
function autoRouteBubble(message: string): BubbleSlug {
    const t = (message || "").toLowerCase()
    if (detectPanicIntent(t)) return "still"
    if (detectAngerIntent(t)) return "rush"
    if (detectUrgeIntent(t)) return "rush"
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

/* Saved ritual library */
const SAVED_KEY = "__ts_saved_rituals_v153"
function loadSaved(): SavedRitual[] {
    return lsGet<SavedRitual[]>(SAVED_KEY, [])
}
function saveSaved(list: SavedRitual[]) {
    lsSet(SAVED_KEY, list.slice(0, 400))
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

function completeRitualTextFromAny(value: any) {
    const v = value || {}
    const display = v?.display || {}
    const exactCandidates = [
        v?.ritualText,
        v?.fullRitual,
        v?.full_ritual,
        v?.finalRitual,
        v?.final_ritual,
        v?.completeRitual,
        v?.complete_ritual,
        v?.userFacingRitual,
        v?.user_facing_ritual,
        v?.["Full Ritual"],
        v?.["Final Ritual"],
        v?.["Complete Ritual"],
        v?.["User Facing Ritual"],
        v?.["User-Facing Ritual"],
        v?.["Full Ritual Including Mind Bend"],
        v?.["Full Ritual (Including Mind Bend)"],
        v?.["Full Ritual + Mind Bend"],
        v?.["Final Ritual Including Mind Bend"],
        v?.["Final Ritual (Including Mind Bend)"],
        v?.["Final Ritual + Mind Bend"],
        display?.ritualText,
        display?.fullRitual,
        display?.full_ritual,
        display?.finalRitual,
        display?.final_ritual,
    ]

    for (const candidate of exactCandidates) {
        const text = normalizeText(String(candidate ?? "")).trim()
        if (text) return text
    }

    // Last-resort compatibility for spreadsheet/JSON exports whose column header
    // changes punctuation/casing, e.g. "FULL RITUAL — INCLUDING MIND BEND".
    const dynamicKey = Object.keys(v).find((key) => {
        const canonical = String(key || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
        return (
            canonical === "fullritual" ||
            canonical === "finalritual" ||
            canonical === "completeritual" ||
            canonical === "userfacingritual" ||
            (canonical.includes("fullritual") &&
                canonical.includes("mindbend")) ||
            (canonical.includes("finalritual") &&
                canonical.includes("mindbend"))
        )
    })

    return dynamicKey ? normalizeText(String(v?.[dynamicKey] ?? "")).trim() : ""
}

function ritualTextDefault(r: BubbleRitual) {
    const anyR = r as any
    const display = anyR?.display || {}

    // v38.9.0 / v13: the locked workbook's definitive full ritual is the source of truth.
    // Preserve GOAL / ONE RULE / PLAY / TWIST / WIN / MIND BEND / SAFETY exactly.
    // IMPORTANT: do not rebuild v13 as generic numbered RITUAL steps; that flattens the premium UI.
    const exactFullRitual = completeRitualTextFromAny(anyR)
    if (
        exactFullRitual &&
        /(?:^|\n)GAME\s*\n/i.test(exactFullRitual) &&
        /(?:^|\n)GOAL\s*\n/i.test(exactFullRitual) &&
        /(?:^|\n)ONE RULE\s*\n/i.test(exactFullRitual) &&
        /(?:^|\n)PLAY\s*\n/i.test(exactFullRitual) &&
        /(?:^|\n)TWIST\s*\n/i.test(exactFullRitual) &&
        /(?:^|\n)WIN\s*\n/i.test(exactFullRitual) &&
        /(?:^|\n)MIND BEND\s*\n/i.test(exactFullRitual) &&
        /(?:^|\n)SAFETY\s*\n/i.test(exactFullRitual)
    ) {
        const playTime = String(
            anyR?.play_time ?? anyR?.playTime ?? anyR?.["Play Time"] ?? ""
        ).trim()
        return normalizeText(
            [playTime ? `PLAY TIME\n${playTime}` : "", exactFullRitual]
                .filter(Boolean)
                .join("\n\n")
        )
    }
    const recoveryText = normalizeText(
        String(
            completeRitualTextFromAny(anyR) ||
                anyR?.content ||
                anyR?.plain ||
                anyR?.ritual ||
                ""
        )
    )
    const recoverSection = (label: string) => {
        if (!recoveryText) return ""
        const labels =
            "GOAL|MISSION|ONE RULE|RITUAL|STEPS|HOW TO PLAY|PLAY|TWIST|WIN|SUPPORTS|TIPS|MIND BEND|FORMULA FLOW|SAFETY|PAUSE|RETURN|LOCK IT IN"
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const re = new RegExp(
            `(?:^|\\n)${escapedLabel}\\s*\\n([\\s\\S]*?)(?=\\n(?:${labels})\\s*(?:\\n|$)|$)`,
            "i"
        )
        return String(recoveryText.match(re)?.[1] || "").trim()
    }

    // Prefer STRUCTURED consumer fields whenever they exist. Some release JSONs
    // carry a `plain` field containing only STEPS; using that as the whole ritual
    // makes STEPS become the title and drops GOAL. This builder prevents that.
    const title = String(
        anyR?.title ??
            anyR?.name ??
            anyR?.ritual_name ??
            anyR?.["Ritual Title"] ??
            anyR?.["Ritual Name"] ??
            display?.title ??
            ""
    ).trim()

    const playTime = String(
        anyR?.playTime ??
            anyR?.play_time ??
            anyR?.["Play Time"] ??
            display?.playTime ??
            ""
    ).trim()

    const goal = String(
        anyR?.goal ||
            anyR?.mission ||
            anyR?.["Goal"] ||
            anyR?.["Mission"] ||
            anyR?.["MISSION"] ||
            display?.goal ||
            display?.mission ||
            recoverSection("GOAL") ||
            recoverSection("MISSION") ||
            ""
    ).trim()

    const stepCandidates: any[] = []
    const pushStep = (value: any, index?: number) => {
        if (value == null) return
        if (typeof value === "object") {
            const t = String(
                value?.text ?? value?.instruction ?? value?.label ?? ""
            ).trim()
            if (!t) return
            const number = Number(
                value?.number || (index != null ? index + 1 : 0)
            )
            const label = String(value?.label || "").trim()
            const instruction = String(value?.instruction || "").trim()
            if (label && instruction) {
                stepCandidates.push(
                    `${number || (index || 0) + 1}. ${label} — ${instruction}`
                )
            } else if (/^\s*\d+[.)]\s+/.test(t)) {
                stepCandidates.push(t)
            } else {
                stepCandidates.push(`${number || (index || 0) + 1}. ${t}`)
            }
            return
        }
        const s = String(value || "").trim()
        if (!s) return
        if (/^\s*\d+[.)]\s+/.test(s)) stepCandidates.push(s)
        else stepCandidates.push(`${(index || 0) + 1}. ${s}`)
    }

    // Legacy game-schema bridge. Older GitHub libraries may store the
    // playable move as MISSION / ONE RULE / PLAY / TWIST rather than a `steps`
    // array. Convert those fields into three explicit ritual cards so STEPS can
    // never disappear when the library is otherwise valid.
    const legacyGameSteps = [
        {
            number: 1,
            label: "Rule",
            instruction: String(
                anyR?.rule || anyR?.one_rule || anyR?.["One Rule"] || ""
            ).trim(),
        },
        {
            number: 2,
            label: "Play",
            instruction: String(anyR?.play || anyR?.["Play"] || "").trim(),
        },
        {
            number: 3,
            label: "Twist",
            instruction: String(anyR?.twist || anyR?.["Twist"] || "").trim(),
        },
    ].filter((x) => x.instruction)

    const structuredSteps =
        (Array.isArray(anyR?.stepsStructured) && anyR.stepsStructured) ||
        (Array.isArray(display?.steps) && display.steps) ||
        (Array.isArray(anyR?.stepsArray) && anyR.stepsArray) ||
        (Array.isArray(anyR?.steps) && anyR.steps) ||
        (legacyGameSteps.length ? legacyGameSteps : null)

    if (structuredSteps) {
        structuredSteps.forEach((x: any, i: number) => pushStep(x, i))
    } else {
        const stepText = String(
            anyR?.steps ||
                anyR?.["Numbered Steps"] ||
                anyR?.numberedSteps ||
                anyR?.howToPlay ||
                anyR?.how_to_play ||
                anyR?.["How to Play"] ||
                anyR?.play_the_loop ||
                anyR?.playTheLoop ||
                display?.numberedSteps ||
                display?.howToPlay ||
                recoverSection("RITUAL") ||
                recoverSection("STEPS") ||
                ""
        ).trim()
        if (stepText) {
            // Some exports put every numbered move on one long line. Insert a
            // structural break before 2./3./etc. so each move becomes a card.
            const expandedStepText = stepText.replace(
                /\s+(?=\d{1,2}[.)]\s+)/g,
                "\n"
            )
            const rawStepLines = expandedStepText
                .split(/\r?\n/)
                .map((x: string) => x.trim())
                .filter(Boolean)
                .filter(
                    (x: string) =>
                        !/^(?:RITUAL|STEPS|HOW TO PLAY|PLAY|GAME MOVE)$/i.test(
                            x
                        ) &&
                        !/\/\/\s*PLAY\s*$/i.test(x) &&
                        !/^(?:GOAL|WIN|MIND BEND|FORMULA FLOW|SAFETY|PAUSE)$/i.test(
                            x
                        )
                )

            rawStepLines.forEach((x: string, i: number) => {
                const cleaned = x.replace(/^\s*[•·*\-–—]+\s*/, "").trim()
                if (cleaned) pushStep(cleaned, i)
            })
        } else {
            // Some exports place GOAL + numbered steps together.
            const goalSteps = String(anyR?.["Goal + Steps"] ?? "").trim()
            if (goalSteps) {
                goalSteps
                    .split(/\r?\n/)
                    .map((x: string) => x.trim())
                    .filter((x: string) => /^\s*\d+[.)]\s+/.test(x))
                    .forEach((x: string, i: number) => pushStep(x, i))
            }
        }
    }

    // Ultimate compatibility fallback: recover numbered moves directly from the
    // complete ritual string. This prevents a valid ritual from rendering only
    // GOAL/WIN/MIND BEND when an export uses an unexpected steps column name.
    if (!stepCandidates.length && recoveryText) {
        const stepArea =
            recoverSection("RITUAL") ||
            recoverSection("STEPS") ||
            recoverSection("HOW TO PLAY") ||
            recoveryText
        const matches = Array.from(
            stepArea.matchAll(
                /(?:^|\n|\s)(\d{1,2})[.)]\s+([\s\S]*?)(?=(?:\n|\s)\d{1,2}[.)]\s+|\n(?:WIN|MIND BEND|FORMULA FLOW|SAFETY|PAUSE|RETURN)\b|$)/gi
            )
        )
        matches.slice(0, 8).forEach((m: any, i: number) => {
            const text = String(m?.[2] || "")
                .replace(/\s+/g, " ")
                .trim()
            if (text) pushStep(`${Number(m?.[1] || i + 1)}. ${text}`, i)
        })
    }

    const finish = String(anyR?.finish ?? display?.finish ?? "").trim()

    const win = String(
        anyR?.winReward ??
            anyR?.win ??
            anyR?.["Win / Reward"] ??
            anyR?.["WIN"] ??
            display?.win ??
            recoverSection("WIN") ??
            ""
    ).trim()

    const supportsRaw = Array.isArray(anyR?.supportsArray)
        ? anyR.supportsArray
        : String(anyR?.supports ?? anyR?.["5 Tips"] ?? "")
              .split(/\r?\n/)
              .map((x) => x.replace(/^\s*[•·*\-–—]\s*/, "").trim())
              .filter(Boolean)

    const mindBend = String(
        anyR?.mindBend ??
            anyR?.mind_bend ??
            anyR?.["Mind Bend"] ??
            display?.mindBend ??
            recoverSection("MIND BEND") ??
            ""
    ).trim()

    const flowRaw =
        anyR?.formulaFlow ??
        anyR?.formula_flow ??
        anyR?.["Formula Flow"] ??
        display?.formulaFlow ??
        recoverSection("FORMULA FLOW") ??
        ""
    const flow = Array.isArray(flowRaw)
        ? flowRaw
              .map((x: any) => String(x || "").trim())
              .filter(Boolean)
              .join(" → ")
        : String(flowRaw || "").trim()

    // If we have a real title + either goal or steps, build one canonical ritual.
    // This is intentionally preferred over `plain` so mixed export schemas cannot
    // strip sections from the UI.
    if (title && (goal || stepCandidates.length)) {
        const sections = [
            title,
            playTime ? `PLAY TIME\n${playTime}` : "",
            goal ? `GOAL\n${goal}` : "",
            stepCandidates.length ? `RITUAL\n${stepCandidates.join("\n")}` : "",
            finish,
            win ? `WIN\n${win}` : "",
            supportsRaw.length
                ? `SUPPORTS\n${supportsRaw
                      .map((x: any) => `• ${String(x).trim()}`)
                      .join("\n")}`
                : "",
            mindBend ? `MIND BEND\n${mindBend}` : "",
            flow ? `FORMULA FLOW\n${flow}` : "",
        ].filter(Boolean)
        return normalizeText(sections.join("\n\n"))
    }

    // Complete pre-built ritual fallback.
    const ready = completeRitualTextFromAny(anyR) || anyR?.content || ""
    if (String(ready || "").trim()) {
        return normalizeText(String(ready))
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
        anyR?.plain ??
        anyR?.t ??
        r?.text_default ??
        r?.text ??
        r?.poetic_text ??
        r?.poetic_action_text ??
        r?.plain_text ??
        r?.text_poetic_action ??
        r?.text_plain ??
        anyR?.ritual ??
        (Array.isArray(anyR?.lines) ? anyR.lines.join("\n") : "") ??
        ""
    return normalizeText(String(s || ""))
}

function ritualSafety(r: BubbleRitual) {
    const anyR = r as any
    return String(
        anyR?.safety ??
            anyR?.safety_notes ??
            anyR?.["Safety"] ??
            anyR?.display?.safety?.raw ??
            ""
    ).trim()
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
    | "urge"
    | "neutral"
function detectIntent(message: string): IntentKey {
    const t = (message || "").toLowerCase()
    if (detectPanicIntent(t)) return "panic"
    if (detectAngerIntent(t)) return "anger"
    if (detectUrgeIntent(t)) return "urge"
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
        urge: {
            one: [
                "We widen the gap between the urge and the next action.",
                "The pull can be present without making the decision for you.",
                "First, create friction between craving and action.",
            ],
            two: [
                "We widen the gap between the urge and the next action.\nYou only need one safer choice for this pass.",
                "The pull can be present without making the decision for you.\nThe ritual will work on the action gap, not demand that the urge vanish.",
                "First, create friction between craving and action.\nDelay, distance and one deliberate choice are enough for this round.",
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
    urge: /(urge|impulse|crav|habit|compulsion|temptation|addiction|action gap|trigger|cue|delay|friction|choice|precommit|exit)/i,
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
    urge: /(panic attack|hyperventilat|overdose|seizure|chest pain|can['’]?t breathe)/i,
    neutral: /(revenge|attack|explode)/i,
}

function detectHighRiskMessage(message: string) {
    const t = String(message || "").toLowerCase()
    return /(kill myself|hurt myself|harm myself|end my life|want to die|suicid(?:e|al)|self[-\s]?harm|kill someone|hurt someone|harm someone|medical emergency|overdose|overdosed|seizure|chest pain|withdrawal|detox|detoxing|can['’]?t tell what['’]?s real|cannot tell what is real|hearing voices)/i.test(t)
}

function intentGateAllows(intent: IntentKey, r: BubbleRitual) {
    // Use the full routing metadata as well as user-facing ritual copy.
    // This makes workbook keywords / triggers / recognition cues participate in
    // intent safety instead of accidentally excluding a good ritual because the
    // final display copy happens not to repeat the trigger word.
    const hay = `${routingHaystack(r)} ${ritualTextDefault(r)}`
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
    const routingMessage = expandRoutingMessage(message)
    const title = String(r?.name ?? r?.ritual_name ?? r?.title ?? "")
    const body = ritualTextDefault(r)
    const challenge = String(r?.challenge ?? "")
    const domain = String(r?.domain ?? "")
    const ctype = String(r?.challenge_type ?? "")
    const bubble = ritualBubbleKeyFromAny(r)
    const intent = detectIntent(message)
    const hay = `${title} ${body} ${challenge} ${domain} ${ctype}`

    let score = 0
    score += scoreOverlap(routingMessage, title) * 8
    score += scoreOverlap(routingMessage, body) * 5
    score += scoreOverlap(routingMessage, challenge) * 4
    score += scoreOverlap(routingMessage, domain) * 3
    score += scoreOverlap(routingMessage, ctype) * 3

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
    const { bubbleKey, rawText, rawSafety } = opts

    // v38.11.0 / v13: preserve the locked v13 ritual exactly. The workbook already contains
    // the correct ritual-specific SAFETY block, and SUPPORT FIRST where required.
    let finalText = sanitizeTextForDisplayStrict(rawText, true).trim()

    // Compatibility only: older JSON may provide Safety separately.
    if (
        finalText &&
        !/(?:^|\n)SAFETY\s*(?:\n|$)/i.test(finalText) &&
        String(rawSafety || "").trim()
    ) {
        const safe = sanitizeTextForDisplayStrict(String(rawSafety || ""))
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !isSafetyLabelLine(line))
            .join("\n")
            .trim()
        if (safe) finalText = `${finalText}\n\nSAFETY\n${safe}`
    }

    const sig = hash32(
        `${bubbleKey}||${normalizeForNearDuplicate(finalText)}`.toLowerCase()
    )
    return { text: finalText || "⟡ No usable ritual text found.", sig }
}

/* Weighted routing + one global 750-ritual no-replay cycle
   v2000 ROUTING FIXES
   - semantic alias expansion maps everyday language to the workbook's canonical route vocabulary
   - dedicated urge/substance intent prevents "drugs", "weed", "alcohol", "relapse", etc. falling into neutral
   - immediate panic / overdose / acute-danger language still overrides substance routing
   - intent gate is active (panic/anger/urge/etc. are actually respected)
   - parent + subpattern + ritual scores compete on every request
   - no more "drain one subpattern until empty" behaviour
   - recent bubble/subpattern penalties add variety only among close-quality matches
   - global no-replay is preserved
   - duplicate signatures are de-duped before cycle accounting
*/
const ROUTER_VERSION = "v2000"
const GLOBAL_USED_RITUALS_KEY = `__ts_global_used_rituals_${ROUTER_VERSION}`
const GLOBAL_CYCLE_KEY = `__ts_global_cycle_${ROUTER_VERSION}`
const ISSUE_ROUTES_KEY = `__ts_issue_routes_${ROUTER_VERSION}`
const LAST_GLOBAL_RITUAL_KEY = `__ts_last_global_ritual_${ROUTER_VERSION}`
const RECENT_GLOBAL_BUBBLES_KEY = `__ts_recent_global_bubbles_${ROUTER_VERSION}`

/* v38.12 growth layer — local-first, privacy-preserving product learning.
   No challenge text is included in share cards or growth events. */
const RITUAL_SERVED_COUNT_KEY = "__ts_ritual_served_count_v1"
const SHIFT_RECORDS_KEY = "__ts_shift_records_v1"
const GROWTH_EVENTS_KEY = "__ts_growth_events_v1"
const FIRST_SESSION_BOOST_SERVES = 3

type ShiftRecord = {
    rating: number
    family: string
    ritualId?: string
    updatedAt: number
}

type ResetDNAEntry = {
    family: string
    count: number
    average: number
    percent: number
    lastRating: number
}

const RESET_DNA_PARENT_MAP: Record<string, string> = {
    "Attention / Grounding / Mental Quiet": "GROUND",
    "Beliefs / Evidence": "REFRAME",
    "Communication / Boundaries": "CONNECT",
    "Creativity / Mind Play": "PLAY",
    "Decision Pressure": "CHOOSE",
    Emotion: "FEEL",
    "Getting Started": "ACT",
    "Identity / Self": "CLARIFY",
    "Inner Speech / Mental Text": "INTERRUPT",
    "Memory / Replay / Rumination": "INTERRUPT",
    "Mental Imagery": "DISTANCE",
    "Mental Overload / Working Memory": "ORGANISE",
    "Overthinking / Thought Fusion": "INTERRUPT",
    "Panic / Body Alarm": "GROUND",
    "Performance / Confidence": "ACT",
    "Positive State": "AMPLIFY",
    "Sleep / Winding Down": "QUIET",
    "Social / Team / Perspective": "CONNECT",
    "Support First / Safety": "SUPPORT",
    "Uncertainty / Future Worry / Reassurance": "DISTANCE",
    "Urges / Habit Loops": "CHOOSE",
    "Values / Meaning / Grief": "CLARIFY",
}

function resetDNAFamilyOf(r: BubbleRitual) {
    const explicit = String((r as any)?.reset_dna_family || "").trim().toUpperCase()
    if (explicit) return explicit
    return RESET_DNA_PARENT_MAP[thinkingErrorOf(r)] || "EXPLORE"
}

function loadShiftRecords(): Record<string, ShiftRecord> {
    return lsGet<Record<string, ShiftRecord>>(SHIFT_RECORDS_KEY, {})
}

function resetDNAEntriesFromRecords(records = loadShiftRecords()): ResetDNAEntry[] {
    const grouped: Record<string, { count: number; sum: number; lastRating: number; updatedAt: number }> = {}
    for (const rec of Object.values(records || {})) {
        if (!rec || !rec.family) continue
        const rating = Math.max(0, Math.min(3, Number(rec.rating || 0)))
        const g = grouped[rec.family] || { count: 0, sum: 0, lastRating: 0, updatedAt: 0 }
        g.count += 1
        g.sum += rating
        if (Number(rec.updatedAt || 0) >= g.updatedAt) {
            g.updatedAt = Number(rec.updatedAt || 0)
            g.lastRating = rating
        }
        grouped[rec.family] = g
    }
    return Object.entries(grouped)
        .map(([family, g]) => {
            const average = g.count ? g.sum / g.count : 0
            return {
                family,
                count: g.count,
                average,
                percent: Math.round((average / 3) * 100),
                lastRating: g.lastRating,
            }
        })
        .sort((a, b) => b.average - a.average || b.count - a.count || a.family.localeCompare(b.family))
}

function adaptiveResetDNABoost(r: BubbleRitual) {
    const family = resetDNAFamilyOf(r)
    const entry = resetDNAEntriesFromRecords().find((x) => x.family === family)
    if (!entry || entry.count < 1) return 0
    const confidence = Math.min(1, 0.34 + entry.count * 0.16)
    let boost = (entry.average - 1.5) * 10 * confidence
    if (entry.lastRating === 0) boost -= 4
    if (entry.lastRating === 3) boost += 2
    return Math.max(-14, Math.min(14, boost))
}

function trackGrowthEvent(name: string, payload: Record<string, any> = {}) {
    if (typeof window === "undefined") return
    const event = { name, at: Date.now(), ...payload }
    const existing = lsGet<any[]>(GROWTH_EVENTS_KEY, [])
    lsSet(GROWTH_EVENTS_KEY, [...existing, event].slice(-500))
    try {
        window.dispatchEvent(new CustomEvent("thinkstill:growth", { detail: event }))
    } catch {}
}

function recordShiftRating(sig: string, meta: RitualRuntimeMeta | null, rating: number) {
    if (!sig) return
    const safeRating = Math.max(0, Math.min(3, Number(rating || 0)))
    const records = loadShiftRecords()
    records[sig] = {
        rating: safeRating,
        family: String(meta?.resetDNAFamily || "EXPLORE"),
        ritualId: meta?.ritualId || "",
        updatedAt: Date.now(),
    }
    lsSet(SHIFT_RECORDS_KEY, records)
    trackGrowthEvent("shift_rated", {
        ritualId: meta?.ritualId || "",
        family: meta?.resetDNAFamily || "EXPLORE",
        rating: safeRating,
    })
}

type IssueRouteState = {
    rankedParents: string[]
    parentIndex: number
    activeParent?: string
    rankedSubpatterns?: string[]
    subpatternIndex?: number
    recentBubbles?: BubbleKey[]
    recentSubpatterns?: string[]
    recentParents?: string[]
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
    const seen = new Set<string>()
    for (const bk of Object.keys(library) as BubbleKey[]) {
        for (const ritual of library[bk] || []) {
            const sig = ritualSignature(bk, ritual)
            // Global no-replay is signature based, so duplicate signatures must not
            // inflate the cycle length or create an impossible-to-exhaust pool.
            if (seen.has(sig)) continue
            seen.add(sig)
            out.push({
                bubbleKey: ritualBubbleKeyFromAny(ritual, bk),
                ritual,
                sig,
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

function scoreSubpatternGroup(
    message: string,
    subpattern: string,
    rituals: BubbleRitual[]
) {
    let score = scoreOverlap(message, subpattern) * 24
    for (const r of rituals) {
        score = Math.max(
            score,
            scoreOverlap(message, String(r?.recognition_cue || "")) * 10 +
                scoreOverlap(message, String(r?.match_reason || "")) * 7 +
                scoreOverlap(message, String(r?.secondary_patterns || "")) * 6 +
                scoreOverlap(message, String(r?.unique_game_move || "")) * 3 +
                scoreOverlap(message, String(r?.primary_trigger || "")) * 8
        )
    }
    return score
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
        .map(([subpattern, rituals]) => ({
            subpattern,
            score: scoreSubpatternGroup(message, subpattern, rituals),
        }))
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
    lsSet(RECENT_GLOBAL_BUBBLES_KEY, [])
    return cycle
}

function historyPenalty<T>(value: T, history: T[], weights: number[]) {
    let penalty = 0
    for (let i = 0; i < Math.min(history.length, weights.length); i++) {
        if (history[i] === value) penalty += weights[i]
    }
    return penalty
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
    const actuallyAvailable = all.filter((x) => !used.has(x.sig))
    if (!actuallyAvailable.length || used.size >= all.length) {
        resetGlobalRitualCycle()
        used = new Set<string>()
    }

    const issueKey = issueRouteKey(message)
    const routes = lsGet<Record<string, IssueRouteState>>(ISSUE_ROUTES_KEY, {})
    let route = routes[issueKey]
    if (!route) {
        route = {
            rankedParents: [],
            parentIndex: 0,
            recentBubbles: [],
            recentSubpatterns: [],
            recentParents: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }
    }

    const intent = detectIntent(message)
    const routingMessage = expandRoutingMessage(message)
    const unused = all.filter((x) => !used.has(x.sig))
    if (!unused.length) {
        resetGlobalRitualCycle()
        return pickNextRitualByThinkingError(message, library)
    }

    // v13 GitHub safety gate: explicit high-risk language competes only inside
    // the workbook's SUPPORT FIRST pool when such rows are available.
    const highRisk = detectHighRiskMessage(message)
    const supportFirstPool = highRisk
        ? unused.filter(
              (x) =>
                  String((x.ritual as any)?.safety_class || "")
                      .trim()
                      .toUpperCase() === "SUPPORT FIRST"
          )
        : []
    const safetyScopedPool = supportFirstPool.length ? supportFirstPool : unused

    // Intent is a real gate now. For the dedicated urge/substance intent, the
    // canonical Urges / Habit Loops parent is a hard relevance scope whenever
    // unused rituals remain there. This prevents broad nouns such as "drugs"
    // from competing against unrelated neutral rituals merely because they share
    // generic words like "choice", "step" or "safe".
    const urgeScopedPool =
        intent === "urge"
            ? safetyScopedPool.filter(
                  (x) => thinkingErrorOf(x.ritual) === "Urges / Habit Loops"
              )
            : []
    const intentBasePool = urgeScopedPool.length
        ? urgeScopedPool
        : safetyScopedPool

    // If metadata is sparse and nothing qualifies, degrade gracefully inside the
    // current safety/semantic scope rather than escaping a SUPPORT FIRST gate.
    const intentAllowed =
        intent === "neutral"
            ? intentBasePool
            : intentBasePool.filter((x) =>
                  intentGateAllows(intent, x.ritual)
              )
    const workingPool = intentAllowed.length ? intentAllowed : intentBasePool

    // Build live parent/subpattern score maps every turn. This removes the old
    // sticky behaviour where one subpattern was exhausted before the next one
    // could compete.
    const parentGroups = new Map<string, BubbleRitual[]>()
    const subGroups = new Map<string, BubbleRitual[]>()
    for (const x of workingPool) {
        const parent = thinkingErrorOf(x.ritual)
        const sub = subpatternOf(x.ritual)
        if (!parentGroups.has(parent)) parentGroups.set(parent, [])
        parentGroups.get(parent)!.push(x.ritual)
        const sk = `${parent}\u0000${sub}`
        if (!subGroups.has(sk)) subGroups.set(sk, [])
        subGroups.get(sk)!.push(x.ritual)
    }

    const parentScores = new Map<string, number>()
    for (const [parent, rituals] of parentGroups.entries()) {
        parentScores.set(
            parent,
            scoreParent(routingMessage, rituals) + semanticParentBoost(message, parent)
        )
    }
    const subScores = new Map<string, number>()
    for (const [sk, rituals] of subGroups.entries()) {
        const split = sk.indexOf("\u0000")
        const sub = split >= 0 ? sk.slice(split + 1) : sk
        subScores.set(sk, scoreSubpatternGroup(routingMessage, sub, rituals))
    }

    const rankedParentsNow = Array.from(parentScores.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([parent]) => parent)
    route.rankedParents = rankedParentsNow

    const lastGlobal = String(lsGet<string>(LAST_GLOBAL_RITUAL_KEY, "") || "")
    const issueRecentBubbles = Array.isArray(route.recentBubbles)
        ? route.recentBubbles
        : []
    const issueRecentSubs = Array.isArray(route.recentSubpatterns)
        ? route.recentSubpatterns
        : []
    const issueRecentParents = Array.isArray(route.recentParents)
        ? route.recentParents
        : []
    const globalRecentBubbles = lsGet<BubbleKey[]>(
        RECENT_GLOBAL_BUBBLES_KEY,
        []
    )

    const servedBefore = Number(lsGet<number>(RITUAL_SERVED_COUNT_KEY, 0) || 0)
    const firstSessionMode = !highRisk && servedBefore < FIRST_SESSION_BOOST_SERVES
    const bestParentScore = Math.max(0, ...Array.from(parentScores.values()))
    const firstSessionParentBand = Math.max(18, Math.abs(bestParentScore) * 0.12)

    const scored = workingPool
        .map((x) => {
            const parent = thinkingErrorOf(x.ritual)
            const sub = subpatternOf(x.ritual)
            const sk = `${parent}\u0000${sub}`
            const parentScore = parentScores.get(parent) || 0
            const subScore = subScores.get(sk) || 0
            const ritualScore = scoreRitualWithinSubpattern(
                routingMessage,
                x.ritual
            )
            // Reuse the richer intent-aware scorer that previously existed but was dead code.
            const intentAwareScore = scoreRitual(message, x.ritual)
            const firstSessionBoost =
                firstSessionMode &&
                !!(x.ritual as any)?.first_session_pick &&
                parentScore >= bestParentScore - firstSessionParentBand
                    ? 34 + Math.max(0, 8 - Number((x.ritual as any)?.first_session_rank || 50) * 0.08)
                    : 0
            const adaptiveBoost = adaptiveResetDNABoost(x.ritual)
            const baseScore =
                parentScore * 0.72 +
                subScore * 0.88 +
                ritualScore * 1.15 +
                intentAwareScore * 0.42 +
                firstSessionBoost +
                adaptiveBoost
            return {
                ...x,
                parent,
                sub,
                baseScore,
                adjustedScore: baseScore,
                firstSessionBoost,
                adaptiveBoost,
            }
        })
        .sort(
            (a, b) =>
                b.baseScore - a.baseScore ||
                String(a.ritual.id || a.sig).localeCompare(
                    String(b.ritual.id || b.sig)
                )
        )

    if (!scored.length) return null

    const topBase = scored[0].baseScore
    // Variety is allowed only inside a close-quality band. A clearly better ritual
    // still wins even if it repeats a bubble; diversity never overrides relevance.
    const qualityBand = Math.max(24, Math.abs(topBase) * 0.18)
    let shortlist = scored.filter((x) => x.baseScore >= topBase - qualityBand)
    if (!shortlist.length) shortlist = [scored[0]]

    shortlist = shortlist
        .map((x) => {
            let penalty = 0
            // Strongest penalty is immediate same-bubble repetition for the same issue.
            penalty += historyPenalty(
                x.bubbleKey,
                issueRecentBubbles,
                [72, 30, 12, 5]
            )
            // Mild cross-issue protection so paraphrasing "panic" does not reset variety.
            penalty += historyPenalty(
                x.bubbleKey,
                globalRecentBubbles,
                [20, 8, 3]
            )
            // Also avoid serving the same precise mechanism repeatedly when a close
            // alternative exists, even if its bubble happens to differ.
            penalty += historyPenalty(x.sub, issueRecentSubs, [34, 14, 5])
            penalty += historyPenalty(x.parent, issueRecentParents, [12, 5])
            if (x.sig === lastGlobal) penalty += 1000
            return { ...x, adjustedScore: x.baseScore - penalty }
        })
        .sort(
            (a, b) =>
                b.adjustedScore - a.adjustedScore ||
                b.baseScore - a.baseScore ||
                String(a.ritual.id || a.sig).localeCompare(
                    String(b.ritual.id || b.sig)
                )
        )

    const chosen =
        shortlist[0] || scored.find((x) => x.sig !== lastGlobal) || scored[0]
    if (!chosen) {
        resetGlobalRitualCycle()
        return pickNextRitualByThinkingError(message, library)
    }

    used.add(chosen.sig)
    saveSet(GLOBAL_USED_RITUALS_KEY, used, all.length + 20)
    lsSet(LAST_GLOBAL_RITUAL_KEY, chosen.sig)

    route.activeParent = chosen.parent
    route.parentIndex = Math.max(0, rankedParentsNow.indexOf(chosen.parent))
    route.rankedSubpatterns = rankSubpatterns(
        routingMessage,
        chosen.parent,
        workingPool
    )
    route.subpatternIndex = Math.max(
        0,
        route.rankedSubpatterns.indexOf(chosen.sub)
    )
    route.recentBubbles = [chosen.bubbleKey, ...issueRecentBubbles].slice(0, 6)
    route.recentSubpatterns = [chosen.sub, ...issueRecentSubs].slice(0, 6)
    route.recentParents = [chosen.parent, ...issueRecentParents].slice(0, 5)
    route.updatedAt = Date.now()
    routes[issueKey] = route
    lsSet(ISSUE_ROUTES_KEY, routes)
    lsSet(
        RECENT_GLOBAL_BUBBLES_KEY,
        [chosen.bubbleKey, ...globalRecentBubbles].slice(0, 6)
    )

    const servedCount = servedBefore + 1
    lsSet(RITUAL_SERVED_COUNT_KEY, servedCount)
    trackGrowthEvent("ritual_served", {
        ritualId: String((chosen.ritual as any)?.id || ""),
        bubble: chosen.bubbleKey,
        thinkingError: chosen.parent,
        preciseSubpattern: chosen.sub,
        resetDNAFamily: resetDNAFamilyOf(chosen.ritual),
        firstSessionMode,
        firstSessionPick: !!(chosen.ritual as any)?.first_session_pick,
        usedCount: used.size,
        totalCount: all.length,
    })

    return {
        bubbleKey: chosen.bubbleKey,
        ritual: chosen.ritual,
        text: ritualTextDefault(chosen.ritual),
        safety: ritualSafety(chosen.ritual),
        thinkingError: chosen.parent,
        preciseSubpattern: chosen.sub,
        cycle: Number(lsGet<number>(GLOBAL_CYCLE_KEY, 1) || 1),
        usedCount: used.size,
        totalCount: all.length,
        servedCount,
        firstSessionMode,
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
function overlayFileLabel(u: string) {
    const raw = String(u || "").trim()
    if (!raw) return "Unknown file"
    try {
        const parsed = new URL(
            raw,
            typeof window !== "undefined"
                ? window.location.href
                : "https://example.com"
        )
        const last =
            parsed.pathname.split("/").filter(Boolean).pop() || parsed.pathname
        return decodeURIComponent(last || raw)
    } catch {
        const clean = raw.split("?")[0].split("#")[0]
        const last = clean.split("/").filter(Boolean).pop() || clean
        try {
            return decodeURIComponent(last || raw)
        } catch {
            return last || raw
        }
    }
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
function getAvailableOverlayVariants(
    bubble: BubbleSlug,
    overlays: Record<string, string>
) {
    const out: number[] = []
    for (let i = 1; i <= 5; i++) {
        if (overlays[`${bubble}_overlay_${i}`]) out.push(i)
    }
    return out
}
function makeBubbleNumberMap(value = 0): Record<BubbleSlug, number> {
    return {
        glitch: value,
        drop: value,
        still: value,
        patch: value,
        loopie: value,
        rush: value,
        sync: value,
    }
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
        gap: 8,
        minHeight: 34,
        padding: "7px 14px",
        borderRadius: 9,
        border: `1px solid rgba(${accent},0.58)`,
        background: `linear-gradient(180deg, rgba(${accent},0.23), rgba(8,14,20,0.78))`,
        color: "#FFFFFF",
        fontWeight: 950,
        fontSize: 11,
        lineHeight: 1,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        boxShadow: perf
            ? "inset 0 1px 0 rgba(255,255,255,0.10)"
            : `0 0 20px rgba(${accent},0.20), inset 0 1px 0 rgba(255,255,255,0.13)`,
        backdropFilter: perf ? "none" : "blur(10px)",
        WebkitBackdropFilter: perf ? "none" : "blur(10px)",
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
        height: 60,
        minWidth: 0,
        padding: "0 19px",
        borderRadius: 18,
        border: "1px solid rgba(128,229,255,0.24)",
        background:
            "radial-gradient(120% 170% at 10% 0%, rgba(91,218,255,0.08), transparent 48%), linear-gradient(180deg, rgba(5,12,18,0.98), rgba(8,15,22,0.95))",
        color: textCol,
        outline: "none",
        fontWeight: 760,
        fontSize: 15,
        letterSpacing: 0.08,
        backdropFilter: perf ? "none" : "blur(14px)",
        boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.055), inset 0 -8px 20px rgba(0,0,0,0.20), 0 8px 28px rgba(0,0,0,0.20)",
        fontFamily,
        transition:
            "border-color 180ms ease, box-shadow 180ms ease, background 180ms ease",
    }
}
function pillBtn(
    active: boolean,
    perf: boolean,
    fontFamily: string
): React.CSSProperties {
    return {
        width: 54,
        height: 54,
        borderRadius: "50%",
        border: active
            ? "1px solid rgba(159,244,255,0.72)"
            : "1px solid rgba(164,215,235,0.16)",
        background: active
            ? "radial-gradient(circle at 34% 27%, rgba(225,253,255,0.98), rgba(107,225,245,0.94) 38%, rgba(38,122,151,0.98) 72%, rgba(8,28,39,1) 100%)"
            : "radial-gradient(circle at 34% 27%, rgba(83,105,119,0.82), rgba(25,36,47,0.98) 49%, rgba(7,12,18,1) 100%)",
        color: active ? "rgba(1,24,32,0.94)" : "rgba(241,250,255,0.91)",
        fontWeight: 950,
        cursor: "pointer",
        backdropFilter: perf ? "none" : "blur(12px)",
        boxShadow: active
            ? "0 0 0 1px rgba(154,242,255,0.10), 0 0 28px rgba(91,229,255,0.26), 0 10px 25px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.58)"
            : "0 10px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -10px 18px rgba(0,0,0,0.24)",
        fontFamily,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        margin: 0,
        lineHeight: 1,
        boxSizing: "border-box",
        flexShrink: 0,
        textAlign: "center",
        transform: "translateZ(0)",
    }
}
function sendBtn(perf: boolean, fontFamily: string): React.CSSProperties {
    return {
        minWidth: 100,
        height: 60,
        borderRadius: 18,
        border: "1px solid rgba(210,255,238,0.80)",
        background:
            "linear-gradient(120deg, rgba(191,255,220,1) 0%, rgba(117,236,255,1) 48%, rgba(153,210,255,1) 100%)",
        color: "rgba(2,27,34,0.96)",
        fontWeight: 1000,
        cursor: "pointer",
        letterSpacing: 1.15,
        boxShadow: perf
            ? "0 11px 28px rgba(0,0,0,0.31), inset 0 1px 0 rgba(255,255,255,0.78)"
            : "0 0 34px rgba(102,235,255,0.24), 0 11px 30px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.82)",
        fontFamily,
        position: "relative",
        overflow: "hidden",
    }
}
function topIconBtn(perf: boolean, fontFamily: string): React.CSSProperties {
    return {
        width: 46,
        height: 46,
        borderRadius: 14,
        border: "1px solid rgba(159,222,245,0.15)",
        background:
            "radial-gradient(120% 140% at 30% 10%, rgba(115,216,246,0.10), transparent 55%), linear-gradient(180deg, rgba(29,42,54,0.96), rgba(9,16,23,0.99))",
        color: "rgba(239,249,255,0.90)",
        fontSize: 20,
        cursor: "pointer",
        backdropFilter: perf ? "none" : "blur(12px)",
        boxShadow:
            "0 8px 20px rgba(0,0,0,0.27), inset 0 1px 0 rgba(255,255,255,0.07)",
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
        height: 32,
        borderRadius: 10,
        padding: "0 12px",
        border: on
            ? "1px solid rgba(143,235,255,0.40)"
            : "1px solid rgba(255,255,255,0.075)",
        background: on
            ? "linear-gradient(180deg, rgba(103,225,255,0.16), rgba(40,105,125,0.15))"
            : "rgba(255,255,255,0.025)",
        color: on ? "rgba(220,249,255,0.98)" : "rgba(218,230,237,0.62)",
        fontWeight: 950,
        fontSize: 10.5,
        letterSpacing: 0.95,
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: on
            ? "0 0 22px rgba(95,226,255,0.12), inset 0 1px 0 rgba(255,255,255,0.09)"
            : "inset 0 1px 0 rgba(255,255,255,0.025)",
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
        height: 32,
        borderRadius: 10,
        padding: "0 11px",
        border: danger
            ? "1px solid rgba(255,130,164,0.22)"
            : on
              ? "1px solid rgba(133,240,255,0.34)"
              : "1px solid rgba(255,255,255,0.08)",
        background: danger
            ? "linear-gradient(180deg, rgba(112,39,61,0.42), rgba(48,19,31,0.52))"
            : on
              ? "linear-gradient(180deg, rgba(94,226,255,0.16), rgba(29,82,100,0.20))"
              : "rgba(255,255,255,0.028)",
        color: danger ? "rgba(255,210,222,0.88)" : "rgba(235,247,252,0.88)",
        fontWeight: 950,
        fontSize: 10.5,
        letterSpacing: 0.68,
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: on
            ? "0 0 20px rgba(88,224,255,0.10), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "inset 0 1px 0 rgba(255,255,255,0.035)",
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
    "RITUAL",
    "STEPS",
    "GAME MOVE",
    "HOW TO PLAY",
    "POWER-UP",
    "POWER UPS",
    "POWER-UPS",
    "POWER UP",
    "POTENCY STACK",
    "WIN SIGNAL",
    "WIN",
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

function isRitualSectionLabel(line: string) {
    const upper = cleanRitualLabel(line).toUpperCase()
    return (
        HIDDEN_RITUAL_LABELS.has(upper) ||
        /^(PLAY TIME|PAUSE|SAFETY|YOU WIN WHEN|SUPPORTS|TIPS)$/i.test(upper)
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
    const diag = raw.join(" ")
    if (
        /fetch failed|fetch exception|manifest|no parts listed|failed to load|json parse failed/i.test(
            diag
        )
    ) {
        parsed.title = "Ritual Library Error"
        parsed.promise = raw.slice(0, 3)
        return parsed
    }

    // v38.4.4: ritual titles no longer have to be ALL CAPS.
    // New spreadsheet exports can send Title Case titles followed by GOAL/RITUAL/WIN.
    const firstSectionIndex = raw.findIndex((line) =>
        isRitualSectionLabel(line)
    )
    const preSectionEnd =
        firstSectionIndex >= 0 ? firstSectionIndex : raw.length
    const preSection = raw
        .slice(0, preSectionEnd)
        .filter((line) => !/^challenge\s*:/i.test(line))

    const capsTitleIndex = preSection.findIndex((line) => isAllCapsTitle(line))
    if (capsTitleIndex >= 0) {
        parsed.intro.push(...preSection.slice(0, capsTitleIndex))
        parsed.title = preSection[capsTitleIndex]
        i = raw.indexOf(preSection[capsTitleIndex]) + 1
    } else if (preSection.length && firstSectionIndex >= 0) {
        // Comfort lines, when present, sit before the title; the title is the
        // final free-text line immediately before the first known section label.
        parsed.title = preSection[preSection.length - 1]
        parsed.intro.push(...preSection.slice(0, -1))
        i = firstSectionIndex
    } else if (
        preSection.length &&
        raw.some((line) => /^\d+[.)]\s+/.test(line))
    ) {
        // Unlabelled compact ritual: first line is the title, numbered lines are steps.
        parsed.title = preSection[0]
        i = raw.indexOf(preSection[0]) + 1
    } else if (firstSectionIndex === 0) {
        // No explicit title, but structured sections exist. Keep the safe default
        // and parse the sections instead of swallowing them into hidden intro copy.
        i = 0
    } else if (raw.length) {
        // Truly unstructured fallback text must still be visible to the user.
        parsed.promise = raw.slice(0, 2)
        parsed.steps = raw
            .slice(2, 8)
            .map((line) => ({ action: line, detail: "" }))
        return parsed
    }

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
        if (/^(HOW TO PLAY|RITUAL|STEPS)$/i.test(upper)) {
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
        if (/^(SUPPORTS|TIPS)$/i.test(upper)) {
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

        // Spreadsheet/no-label fallback: keep a numbered instruction as its own
        // card even when there is no action-name em dash.
        const simpleNumberedMove = line.match(/^\d+[.)]\s+(.+)$/)
        if (simpleNumberedMove) {
            parsed.steps.push({
                action: simpleNumberedMove[1].trim(),
                detail: "",
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

    // Legacy-format safety gets the same title-free consumer treatment.
    const safetyTitle = parsed.gameName || parsed.title
    if (safetyTitle) {
        parsed.safety = parsed.safety.map((line) =>
            stripRitualTitleFromSafety(line, safetyTitle)
        )
    }
    return parsed
}

type ExactRitual = {
    playTime: string
    game: string
    mission: string
    rule: string
    play: string
    twist: string
    win: string
    mindBend: string
    safety: string
    supportFirst: string
    fallback: string
}

const EXACT_RITUAL_LABELS = new Set([
    "PLAY TIME",
    "GAME",
    "GOAL",
    "MISSION", // legacy compatibility only
    "ONE RULE",
    "PLAY",
    "TWIST",
    "WIN",
    "MIND BEND",
    "SAFETY",
    "SUPPORT FIRST",
])

function canonicalExactLabel(value: string) {
    return String(value || "")
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase()
}

function escapeRegExpLiteral(value: string) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Consumer-facing safety must never echo the ritual/game title.
// Replace an exact title reference with neutral wording so the sentence stays grammatical,
// e.g. "SENSATION LOCATION SWITCH is limited..." -> "This reset is limited...".
function stripRitualTitleFromSafety(safety: string, ritualTitle: string) {
    let out = normalizeText(String(safety || "")).trim()
    const title = String(ritualTitle || "")
        .replace(/\s+/g, " ")
        .trim()
    if (!out || !title || title.length < 3) return out

    const titleRe = new RegExp(escapeRegExpLiteral(title), "gi")
    out = out.replace(titleRe, "this reset")
    out = out
        .replace(/^this reset\b/i, "This reset")
        .replace(/\bthis reset\s+this reset\b/gi, "this reset")
        .replace(/\s{2,}/g, " ")
        .trim()
    return out
}

function parseExactRitual(text: string): ExactRitual {
    const lines = normalizeText(text || "").split("\n")
    const buckets: Record<string, string[]> = {}
    let current = ""
    const fallback: string[] = []

    for (const rawLine of lines) {
        const line = String(rawLine || "").trim()
        if (!line) continue
        const label = canonicalExactLabel(line)
        if (EXACT_RITUAL_LABELS.has(label)) {
            current = label
            if (!buckets[current]) buckets[current] = []
            continue
        }
        if (current) buckets[current].push(line)
        else fallback.push(line)
    }

    const take = (label: string) => (buckets[label] || []).join("\n").trim()
    const game = take("GAME")
    const safety = stripRitualTitleFromSafety(take("SAFETY"), game)

    return {
        playTime: take("PLAY TIME"),
        game,
        // v13 canonical label is GOAL; MISSION remains a legacy fallback.
        mission: take("GOAL") || take("MISSION"),
        rule: take("ONE RULE"),
        play: take("PLAY"),
        twist: take("TWIST"),
        win: take("WIN"),
        mindBend: take("MIND BEND"),
        safety,
        supportFirst: take("SUPPORT FIRST"),
        fallback: fallback.join("\n").trim(),
    }
}

function roundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
}

function wrapCanvasLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let line = ""
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word
        if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate
        else {
            lines.push(line)
            line = word
        }
    }
    if (line) lines.push(line)
    return lines
}

async function createMindBendShareCard(opts: {
    ritualName: string
    mindBend: string
    playTime?: string
    shareUrl?: string
}) {
    if (typeof document === "undefined") return null
    const canvas = document.createElement("canvas")
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const bg = ctx.createLinearGradient(0, 0, 1080, 1920)
    bg.addColorStop(0, "#05070B")
    bg.addColorStop(0.48, "#0A0D14")
    bg.addColorStop(1, "#05060A")
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 1080, 1920)

    const glowA = ctx.createRadialGradient(180, 160, 0, 180, 160, 540)
    glowA.addColorStop(0, "rgba(80,224,255,.22)")
    glowA.addColorStop(1, "rgba(80,224,255,0)")
    ctx.fillStyle = glowA
    ctx.fillRect(0, 0, 1080, 780)

    const glowB = ctx.createRadialGradient(940, 1420, 0, 940, 1420, 560)
    glowB.addColorStop(0, "rgba(202,104,255,.16)")
    glowB.addColorStop(1, "rgba(202,104,255,0)")
    ctx.fillStyle = glowB
    ctx.fillRect(420, 820, 660, 1100)

    roundedRectPath(ctx, 70, 92, 940, 1736, 46)
    ctx.fillStyle = "rgba(255,255,255,.025)"
    ctx.fill()
    ctx.strokeStyle = "rgba(170,235,255,.14)"
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.textAlign = "center"
    ctx.fillStyle = "rgba(193,241,255,.88)"
    ctx.font = "800 30px Inter, Arial, sans-serif"
    ctx.letterSpacing = "4px" as any
    ctx.fillText("THINKSTILL", 540, 190)

    ctx.fillStyle = "rgba(255,255,255,.62)"
    ctx.font = "700 22px Inter, Arial, sans-serif"
    ctx.fillText("MIND BEND", 540, 306)

    ctx.fillStyle = "#FFFFFF"
    ctx.font = "900 58px Inter, Arial, sans-serif"
    const titleLines = wrapCanvasLines(ctx, opts.ritualName || "THINKSTILL RESET", 820).slice(0, 3)
    let titleY = 420
    for (const line of titleLines) {
        ctx.fillText(line, 540, titleY)
        titleY += 68
    }

    const grad = ctx.createLinearGradient(220, 0, 860, 0)
    grad.addColorStop(0, "#A9F2FF")
    grad.addColorStop(0.55, "#D9B2FF")
    grad.addColorStop(1, "#9EFCD0")
    ctx.fillStyle = grad
    ctx.fillRect(390, titleY + 32, 300, 4)

    ctx.font = "650 48px Inter, Arial, sans-serif"
    ctx.fillStyle = "rgba(250,252,255,.96)"
    const mindLines = wrapCanvasLines(ctx, opts.mindBend, 820).slice(0, 11)
    const lineHeight = 66
    const blockHeight = mindLines.length * lineHeight
    let y = Math.max(titleY + 180, 920 - blockHeight / 2)
    for (const line of mindLines) {
        ctx.fillText(line, 540, y)
        y += lineHeight
    }

    const badgeText = opts.playTime ? `${opts.playTime} RESET` : "TRY THIS RESET"
    roundedRectPath(ctx, 330, 1542, 420, 70, 35)
    ctx.fillStyle = "rgba(118,225,255,.08)"
    ctx.fill()
    ctx.strokeStyle = "rgba(160,236,255,.18)"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = "rgba(211,246,255,.92)"
    ctx.font = "800 23px Inter, Arial, sans-serif"
    ctx.fillText(badgeText.toUpperCase(), 540, 1587)

    ctx.fillStyle = "rgba(255,255,255,.50)"
    ctx.font = "600 22px Inter, Arial, sans-serif"
    ctx.fillText("Try the reset. Then tell ThinkStill what's in your head.", 540, 1694)

    const host = (() => {
        try { return opts.shareUrl ? new URL(opts.shareUrl).host : "" } catch { return "" }
    })()
    if (host) {
        ctx.fillStyle = "rgba(181,235,250,.72)"
        ctx.font = "700 21px Inter, Arial, sans-serif"
        ctx.fillText(host, 540, 1750)
    }

    return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/png", 0.96)
    )
}

function buildShareUrl(ritualId: string, shareBaseUrl = "") {
    if (typeof window === "undefined") return ""

    const withProtocol = (value: string) => {
        const v = String(value || "").trim()
        if (!v) return ""
        return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`
    }

    try {
        const configured = withProtocol(String(shareBaseUrl || ""))
        const url = configured ? new URL(configured) : new URL(window.location.href)
        url.searchParams.set("try", ritualId)
        url.searchParams.set("utm_source", "thinkstill_share")
        url.searchParams.delete("challenge")
        return url.toString()
    } catch {
        try {
            const fallback = new URL(window.location.href)
            fallback.searchParams.set("try", ritualId)
            fallback.searchParams.set("utm_source", "thinkstill_share")
            fallback.searchParams.delete("challenge")
            return fallback.toString()
        } catch {
            return ""
        }
    }
}

function PremiumRitualText({
    text,
    fontFamily,
    fontSize,
    bubble,
}: {
    text: string
    fontFamily: string
    fontSize: number
    bubble: BubbleSlug
}) {
    const ritual = React.useMemo(() => parseExactRitual(text), [text])
    const bubbleName = (BUBBLE_LABEL[bubble] || "Glitch").toUpperCase()

    const palette: Record<
        BubbleSlug,
        {
            accent: string
            accent2: string
            glow: string
            glow2: string
            wash: string
            line: string
            shadow: string
        }
    > = {
        glitch: {
            accent: "#B9F4FF",
            accent2: "#F3A5FF",
            glow: "rgba(124,225,255,.25)",
            glow2: "rgba(243,165,255,.17)",
            wash: "rgba(114,218,255,.055)",
            line: "rgba(155,231,255,.20)",
            shadow: "rgba(66,183,224,.16)",
        },
        still: {
            accent: "#A5EDFF",
            accent2: "#9FFFCF",
            glow: "rgba(116,226,255,.24)",
            glow2: "rgba(159,255,207,.15)",
            wash: "rgba(105,218,255,.05)",
            line: "rgba(157,235,255,.19)",
            shadow: "rgba(80,190,224,.15)",
        },
        sync: {
            accent: "#A5F2FF",
            accent2: "#B5C7FF",
            glow: "rgba(109,230,255,.24)",
            glow2: "rgba(181,199,255,.15)",
            wash: "rgba(103,220,255,.05)",
            line: "rgba(156,235,255,.19)",
            shadow: "rgba(74,188,224,.15)",
        },
        patch: {
            accent: "#B6FFD3",
            accent2: "#C9F3FF",
            glow: "rgba(112,255,191,.22)",
            glow2: "rgba(201,243,255,.14)",
            wash: "rgba(104,236,178,.05)",
            line: "rgba(174,255,211,.18)",
            shadow: "rgba(75,210,151,.14)",
        },
        drop: {
            accent: "#BDD7FF",
            accent2: "#D5B9FF",
            glow: "rgba(133,175,255,.23)",
            glow2: "rgba(213,185,255,.15)",
            wash: "rgba(118,165,255,.05)",
            line: "rgba(191,215,255,.18)",
            shadow: "rgba(96,135,214,.15)",
        },
        rush: {
            accent: "#FFD0AE",
            accent2: "#FFAECA",
            glow: "rgba(255,151,116,.22)",
            glow2: "rgba(255,174,202,.14)",
            wash: "rgba(255,130,105,.05)",
            line: "rgba(255,205,170,.19)",
            shadow: "rgba(226,101,79,.14)",
        },
        loopie: {
            accent: "#DAB7FF",
            accent2: "#A9E8FF",
            glow: "rgba(196,139,255,.23)",
            glow2: "rgba(169,232,255,.14)",
            wash: "rgba(185,126,255,.05)",
            line: "rgba(218,183,255,.18)",
            shadow: "rgba(157,101,222,.15)",
        },
    }
    const p = palette[bubble]

    const hasRitual = Boolean(
        ritual.game ||
            ritual.mission ||
            ritual.rule ||
            ritual.play ||
            ritual.twist ||
            ritual.win ||
            ritual.mindBend ||
            ritual.safety
    )

    if (!hasRitual) {
        return (
            <article
                style={{
                    width: "100%",
                    maxWidth: 700,
                    margin: "0 auto",
                    padding: "24px 26px",
                    borderRadius: 22,
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily,
                    color: "rgba(249,251,253,0.98)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.55,
                    fontSize,
                }}
            >
                {ritual.fallback || text}
            </article>
        )
    }

    const labelStyle: React.CSSProperties = {
        fontSize: 10.25,
        lineHeight: 1.1,
        fontWeight: 900,
        letterSpacing: 1.3,
        textTransform: "uppercase",
        color: p.accent,
    }

    const pathBeat = (
        label: string,
        value: string,
        opts?: {
            kind?: "goal" | "rule" | "play" | "twist" | "win" | "mind"
            accent?: string
        }
    ) => {
        if (!value) return null
        const kind = opts?.kind || "goal"
        const accent = opts?.accent || p.accent
        const isPlay = kind === "play"
        const isTwist = kind === "twist"
        const isRule = kind === "rule"
        const isWin = kind === "win"
        const isMind = kind === "mind"
        const displayLabel =
            kind === "goal"
                ? "GOAL"
                : isTwist
                  ? "TWIST"
                  : isWin
                    ? "WIN"
                    : isMind
                      ? "MIND BEND"
                      : label
        const cardAccent = isTwist || isMind ? p.accent2 : accent
        const isPayoff = isWin || isMind

        return (
            <div
                key={label}
                className={`ts-flow-beat ${isPlay ? "ts-flow-beat-play" : ""} ${isPayoff ? "ts-flow-beat-payoff" : ""}`}
            >
                <motion.span
                    aria-hidden="true"
                    className="ts-flow-dot"
                    initial={{ opacity: 0, scale: 0.68 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        duration: 0.3,
                        delay: isMind
                            ? 0.29
                            : isWin
                              ? 0.24
                              : isTwist
                                ? 0.19
                                : isPlay
                                  ? 0.13
                                  : isRule
                                    ? 0.08
                                    : 0.03,
                    }}
                    style={{
                        width: isMind ? 14 : isWin || isPlay ? 13 : 11,
                        height: isMind ? 14 : isWin || isPlay ? 13 : 11,
                        borderRadius: 999,
                        background: isMind
                            ? `radial-gradient(circle, #FFFFFF 0 19%, ${cardAccent} 22% 53%, rgba(5,10,15,.98) 57%)`
                            : `radial-gradient(circle, ${cardAccent} 0 35%, rgba(5,10,15,.98) 39%)`,
                        border: `1px solid ${cardAccent}CC`,
                        boxShadow: isMind
                            ? `0 0 6px ${cardAccent}, 0 0 13px ${p.glow2}, 0 0 22px ${p.glow2}`
                            : isWin || isPlay
                              ? `0 0 5px ${cardAccent}, 0 0 12px ${isPlay ? p.glow : p.glow2}`
                              : `0 0 4px ${cardAccent}, 0 0 8px ${p.glow}`,
                    }}
                />

                <motion.section
                    className={`ts-flow-card ${isPlay ? "ts-flow-card-play" : ""} ${isTwist ? "ts-flow-card-twist" : ""} ${isWin ? "ts-flow-card-win" : ""} ${isMind ? "ts-flow-card-mind" : ""}`}
                    initial={{ opacity: 0, y: 10, scale: 0.992 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -2, scale: 1.003 }}
                    transition={{
                        opacity: {
                            duration: 0.34,
                            delay: isMind
                                ? 0.29
                                : isWin
                                  ? 0.24
                                  : isTwist
                                    ? 0.19
                                    : isPlay
                                      ? 0.13
                                      : isRule
                                        ? 0.08
                                        : 0.03,
                        },
                        y: { type: "spring", stiffness: 250, damping: 25 },
                        scale: { duration: 0.25 },
                    }}
                    style={{
                        position: "relative",
                        overflow: "hidden",
                        minWidth: 0,
                        // v38.7.0 STATIC SKIN ONLY — motion props above remain exactly preserved.
                        // Magnetic glass capsules: tactile individual beats, visually locked to one luminous journey.
                        padding: "16px clamp(17px, 3.1vw, 24px) 17px",
                        borderRadius: 27,
                        background: isPlay
                            ? `radial-gradient(90% 150% at 0% 50%, ${p.glow}, transparent 56%), radial-gradient(85% 130% at 100% 0%, ${p.glow2}, transparent 68%), linear-gradient(145deg, rgba(25,45,56,.975), rgba(7,14,20,.992) 70%)`
                            : isMind
                              ? `radial-gradient(98% 155% at 0% 48%, ${p.glow2}, transparent 58%), radial-gradient(90% 125% at 100% 100%, ${p.glow2}, transparent 70%), linear-gradient(145deg, rgba(28,35,53,.982), rgba(8,13,22,.995) 72%)`
                              : isWin
                                ? `radial-gradient(92% 150% at 0% 48%, ${p.glow2}, transparent 61%), linear-gradient(145deg, rgba(22,37,47,.965), rgba(7,14,20,.99) 74%)`
                                : `radial-gradient(88% 145% at 0% 48%, ${p.wash}, transparent 61%), linear-gradient(145deg, rgba(21,35,45,.94), rgba(7,14,20,.985) 76%)`,
                        border: `1px solid ${
                            isPlay
                                ? cardAccent + "7D"
                                : isMind
                                  ? cardAccent + "73"
                                  : isWin
                                    ? cardAccent + "54"
                                    : p.line
                        }`,
                        boxShadow: isPlay
                            ? `0 15px 34px rgba(0,0,0,.30), 0 5px 16px ${p.shadow}, 0 0 14px ${p.glow}, inset 0 1px 0 rgba(255,255,255,.095), inset 0 -1px 0 rgba(0,0,0,.48), inset 10px 0 20px ${p.glow}`
                            : isMind
                              ? `0 16px 36px rgba(0,0,0,.31), 0 5px 17px ${p.shadow}, 0 0 15px ${p.glow2}, inset 0 1px 0 rgba(255,255,255,.09), inset 0 -1px 0 rgba(0,0,0,.48), inset 9px 0 18px ${p.glow2}`
                              : isWin
                                ? `0 13px 28px rgba(0,0,0,.27), 0 4px 13px ${p.shadow}, 0 0 10px ${p.glow2}, inset 0 1px 0 rgba(255,255,255,.072), inset 0 -1px 0 rgba(0,0,0,.43)`
                                : `0 11px 24px rgba(0,0,0,.24), 0 3px 11px ${p.shadow}, inset 0 1px 0 rgba(255,255,255,.062), inset 0 -1px 0 rgba(0,0,0,.40)`,
                        transformStyle: "preserve-3d",
                        backdropFilter: "blur(10px) saturate(.92) contrast(1.025)",
                        WebkitBackdropFilter: "blur(10px) saturate(.92) contrast(1.025)",
                    }}
                >
                    <div
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            right: -34,
                            top: -36,
                            width: isPlay || isMind ? 142 : 116,
                            height: isPlay || isMind ? 142 : 116,
                            borderRadius: 999,
                            background: `radial-gradient(circle, ${isPlay ? p.glow : p.glow2} 0%, transparent 67%)`,
                            opacity: isPlay ? 0.46 : isPayoff ? 0.38 : 0.22,
                            filter: "blur(7px)",
                            pointerEvents: "none",
                        }}
                    />

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                        }}
                    >
                        <div
                            style={{
                                ...labelStyle,
                                color: isRule
                                    ? "rgba(196,224,234,.90)"
                                    : cardAccent,
                                fontSize: 10.25,
                                letterSpacing: 1.3,
                            }}
                        >
                            {displayLabel}
                        </div>
                    </div>

                    <div
                        style={{
                            position: "relative",
                            zIndex: 1,
                            maxWidth: 610,
                            fontSize: `clamp(${Math.max(fontSize, 15.5)}px, 1.9vw, 16.5px)`,
                            lineHeight: 1.55,
                            fontWeight:
                                isPlay || isWin || isMind
                                    ? 680
                                    : isRule
                                      ? 650
                                      : 620,
                            letterSpacing: 0,
                            color:
                                isPlay || isPayoff
                                    ? "rgba(253,254,255,.99)"
                                    : "rgba(248,251,253,.965)",
                            whiteSpace: "pre-wrap",
                            textShadow:
                                isPlay || isPayoff
                                    ? "0 7px 22px rgba(0,0,0,.24)"
                                    : "none",
                        }}
                    >
                        {value}
                    </div>
                </motion.section>
            </div>
        )
    }

    return (
        <>
            <style>{`
                @keyframes tsDepthAmbient {
                    0%,100% { transform:translate3d(-2%,0,0) scale(1); opacity:.22; }
                    50% { transform:translate3d(2%,1%,0) scale(1.05); opacity:.38; }
                }
                @keyframes tsConsoleBreath {
                    0%,100% { opacity:.16; filter:blur(22px); transform:scale(.985); }
                    50% { opacity:.24; filter:blur(27px); transform:scale(1.018); }
                }
                @keyframes tsPlayPulse {
                    0%,100% { box-shadow:0 16px 34px rgba(0,0,0,.31),0 5px 17px ${p.shadow},0 0 12px ${p.glow},inset 0 1px 0 rgba(255,255,255,.068),inset 0 -1px 0 rgba(0,0,0,.45); }
                    50% { box-shadow:0 18px 37px rgba(0,0,0,.32),0 6px 19px ${p.shadow},0 0 19px ${p.glow},inset 0 1px 0 rgba(255,255,255,.076),inset 0 -1px 0 rgba(0,0,0,.45); }
                }
                .ts-depth-ritual {
                    position:relative;
                    isolation:isolate;
                    overflow:hidden;
                    transform-style:preserve-3d;
                    perspective:1200px;
                }
                .ts-depth-ritual::before {
                    content:"";
                    position:absolute;
                    left:7%; right:7%; top:-72px;
                    height:215px;
                    background:radial-gradient(circle at 50% 50%, ${p.glow}, transparent 68%);
                    opacity:.20;
                    z-index:-2;
                    pointer-events:none;
                    animation:tsConsoleBreath 8.8s ease-in-out infinite;
                }
                .ts-depth-ritual::after {
                    content:"";
                    position:absolute;
                    left:18px; right:18px; top:1px;
                    height:1px;
                    background:linear-gradient(90deg, transparent, rgba(255,255,255,.16), ${p.accent}78, ${p.accent2}58, rgba(255,255,255,.11), transparent);
                    opacity:.88;
                    pointer-events:none;
                    z-index:4;
                }
                @keyframes tsPathTravel {
                    0% { transform:translateY(-34px) scaleY(.82); opacity:0; }
                    14% { opacity:.34; }
                    48% { opacity:.86; }
                    82% { opacity:.30; }
                    100% { transform:translateY(calc(100% + 34px)) scaleY(1.08); opacity:0; }
                }
                @keyframes tsDotBreathe {
                    0%,100% { filter:brightness(.96); }
                    50% { filter:brightness(1.16); }
                }
                .ts-depth-path {
                    position:relative;
                    display:grid;
                    gap:7px;
                    isolation:isolate;
                    overflow:visible;
                    padding:10px 10px 10px 0;
                    border:1px solid ${p.line};
                    border-radius:32px;
                    background:
                        radial-gradient(105% 82% at 0% 0%, ${p.wash}, transparent 60%),
                        radial-gradient(80% 70% at 100% 100%, ${p.glow2}, transparent 72%),
                        linear-gradient(180deg, rgba(14,26,34,.72), rgba(4,10,15,.90));
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,.045),
                        inset 0 -1px 0 rgba(0,0,0,.48),
                        0 14px 32px rgba(0,0,0,.22),
                        0 0 12px ${p.glow2};
                }
                .ts-depth-path::before {
                    content:"";
                    position:absolute;
                    left:10px;
                    top:21px;
                    bottom:21px;
                    width:2px;
                    border-radius:999px;
                    background:linear-gradient(180deg, ${p.accent}55 0%, ${p.accent}8A 28%, ${p.accent2}A8 72%, ${p.accent2}66 100%);
                    box-shadow:0 0 6px ${p.glow}, 0 0 11px ${p.glow2};
                    z-index:0;
                    pointer-events:none;
                }
                .ts-depth-path::after {
                    content:"";
                    position:absolute;
                    left:8px;
                    top:21px;
                    width:6px;
                    height:54px;
                    border-radius:999px;
                    background:linear-gradient(180deg, transparent 0%, ${p.accent} 34%, #FFFFFF 50%, ${p.accent2} 66%, transparent 100%);
                    filter:blur(1px);
                    box-shadow:0 0 8px ${p.glow}, 0 0 13px ${p.glow2};
                    opacity:.54;
                    z-index:1;
                    pointer-events:none;
                    animation:tsPathTravel 7.2s ease-in-out infinite;
                }
                .ts-flow-beat {
                    position:relative;
                    display:grid;
                    grid-template-columns:22px minmax(0,1fr);
                    column-gap:10px;
                    align-items:start;
                    z-index:2;
                }
                .ts-flow-dot {
                    grid-column:1;
                    justify-self:center;
                    margin-top:19px;
                    position:relative;
                    z-index:4;
                    flex:none;
                    animation:tsDotBreathe 5.8s ease-in-out infinite;
                }
                .ts-flow-dot::before {
                    content:"";
                    position:absolute;
                    left:50%; top:50%;
                    width:24px; height:24px;
                    transform:translate(-50%,-50%);
                    border-radius:999px;
                    border:1px solid rgba(255,255,255,.055);
                    background:radial-gradient(circle, ${p.glow} 0%, transparent 66%);
                    box-shadow:0 0 9px ${p.glow}, inset 0 1px 0 rgba(255,255,255,.045);
                    opacity:.56;
                    pointer-events:none;
                    z-index:-1;
                }
                .ts-flow-card {
                    grid-column:2;
                    min-width:0;
                    will-change:transform;
                }
                .ts-flow-card::before {
                    content:"";
                    position:absolute;
                    left:0; top:22%; bottom:22%;
                    width:3px;
                    border-radius:0 999px 999px 0;
                    background:linear-gradient(180deg, transparent, ${p.accent}, transparent);
                    box-shadow:0 0 7px ${p.glow};
                    opacity:.30;
                    pointer-events:none;
                    z-index:2;
                }
                .ts-flow-card::after {
                    content:"";
                    position:absolute;
                    left:7%; right:7%; top:0;
                    height:1px;
                    border-radius:999px;
                    background:linear-gradient(90deg, transparent, rgba(255,255,255,.24), ${p.accent}70, rgba(255,255,255,.20), transparent);
                    opacity:.90;
                    pointer-events:none;
                }
                .ts-flow-card-play::before { opacity:.70; box-shadow:0 0 10px ${p.glow}; }
                .ts-flow-card-mind::before { background:linear-gradient(180deg, transparent, ${p.accent2}, transparent); opacity:.66; box-shadow:0 0 10px ${p.glow2}; }
                .ts-flow-card-play {
                    animation:tsPlayPulse 5.6s ease-in-out infinite;
                }
                @media (max-width:620px) {
                    .ts-depth-ritual { border-radius:22px !important; }
                    .ts-depth-path::before { left:9px; }
                    .ts-depth-path::after { left:7px; }
                    .ts-flow-beat { grid-template-columns:20px minmax(0,1fr); column-gap:8px; }
                    .ts-depth-path { border-radius:25px; padding:7px 7px 7px 0; gap:7px; }
                    .ts-flow-card { border-radius:22px !important; }
                }
                @media (hover:none) {
                    .ts-flow-card { transform:none !important; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .ts-depth-ritual::before,
                    .ts-depth-path::after,
                    .ts-flow-dot,
                    .ts-flow-card-play {
                        animation:none !important;
                    }
                }
            `}</style>

            <motion.article
                className="ts-depth-ritual"
                initial={{ opacity: 0, y: 12, scale: 0.992, rotateX: 1.4 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                transition={{
                    opacity: { duration: 0.3 },
                    y: { type: "spring", stiffness: 220, damping: 25 },
                    scale: { duration: 0.32 },
                    rotateX: { duration: 0.38 },
                }}
                style={{
                    width: "100%",
                    maxWidth: 700,
                    margin: "0 auto",
                    padding:
                        "clamp(27px, 4vw, 35px) clamp(18px, 4.1vw, 34px) 34px",
                    borderRadius: 29,
                    background: `
                        radial-gradient(112% 64% at 50% -12%, ${p.wash}, transparent 60%),
                        linear-gradient(155deg, rgba(17,29,37,.996), rgba(7,13,18,.999) 56%, rgba(3,7,10,1))
                    `,
                    border: `1px solid ${p.line}`,
                    boxShadow: `
                        0 34px 78px rgba(0,0,0,.43),
                        0 14px 30px rgba(0,0,0,.28),
                        0 5px 16px ${p.shadow},
                        0 0 18px ${p.glow2},
                        inset 0 1px 0 rgba(255,255,255,.068),
                        inset 0 -1px 0 rgba(0,0,0,.68),
                        inset 0 0 0 1px rgba(255,255,255,.012)
                    `,
                    fontFamily,
                    color: "rgba(249,251,253,.98)",
                    textRendering: "optimizeLegibility",
                    WebkitFontSmoothing: "antialiased",
                    transformStyle: "preserve-3d",
                    backdropFilter: "blur(9px) saturate(.90) contrast(1.025)",
                    WebkitBackdropFilter: "blur(9px) saturate(.90) contrast(1.025)",
                }}
            >
                {/* HERO — no GAME label; title is the visual anchor */}
                <motion.header
                    initial={{ opacity: 0, y: 7, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.42, delay: 0.03 }}
                    style={{
                        textAlign: "center",
                        padding: "1px 0 20px",
                        transform: "translateZ(24px)",
                    }}
                >
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 7,
                            minHeight: 27,
                            marginBottom: 15,
                            padding: "6px 11px",
                            borderRadius: 999,
                            background: `linear-gradient(180deg, ${p.wash}, rgba(255,255,255,.018))`,
                            border: `1px solid ${p.line}`,
                            boxShadow: `0 7px 18px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.06)`,
                            color: p.accent,
                            fontSize: 10.25,
                            lineHeight: 1,
                            fontWeight: 900,
                            letterSpacing: 0.95,
                            textTransform: "uppercase",
                        }}
                    >
                        <span>{bubbleName}</span>
                        {ritual.playTime ? (
                            <>
                                <span style={{ opacity: 0.42 }}>•</span>
                                <span
                                    style={{
                                        color: "rgba(207,234,244,.86)",
                                        letterSpacing: 0.55,
                                    }}
                                >
                                    {ritual.playTime} Guided Reset
                                </span>
                            </>
                        ) : null}
                    </div>

                    {ritual.game ? (
                        <div
                            style={{
                                margin: "0 auto",
                                maxWidth: 610,
                                fontSize: `clamp(${Math.max(fontSize + 10, 28)}px, 4.2vw, 34px)`,
                                lineHeight: 1.04,
                                fontWeight: 940,
                                letterSpacing: -0.92,
                                color: "#FFFFFF",
                                textShadow: `0 2px 0 rgba(0,0,0,.46), 0 12px 34px rgba(0,0,0,.38), 0 0 28px ${p.glow}, 0 0 50px ${p.glow2}`,
                                textWrap: "balance" as any,
                                overflowWrap: "anywhere",
                            }}
                        >
                            {ritual.game}
                        </div>
                    ) : null}

                    <div
                        aria-hidden="true"
                        style={{
                            width: 62,
                            height: 1,
                            margin: "16px auto 0",
                            background: `linear-gradient(90deg, transparent, ${p.accent}, ${p.accent2}aa, transparent)`,
                            opacity: 0.78,
                            boxShadow: `0 0 16px ${p.glow}`,
                        }}
                    />
                </motion.header>

                {/* CONNECTED RITUAL JOURNEY — one luminous path from GOAL to MIND BEND */}
                <div
                    className="ts-depth-path"
                    style={{ maxWidth: 640, margin: "5px auto 6px" }}
                >
                    {/* `mission` stores canonical GOAL with legacy MISSION fallback. */}
                    {pathBeat("GOAL", ritual.mission, { kind: "goal" })}
                    {pathBeat("ONE RULE", ritual.rule, { kind: "rule" })}
                    {pathBeat("PLAY", ritual.play, { kind: "play" })}
                    {pathBeat("TWIST", ritual.twist, {
                        kind: "twist",
                        accent: p.accent2,
                    })}
                    {pathBeat("WIN", ritual.win, { kind: "win" })}
                    {pathBeat("MIND BEND", ritual.mindBend, {
                        kind: "mind",
                        accent: p.accent2,
                    })}
                </div>

                {/* SAFETY — visually recessed, not a competing payoff */}
                {ritual.safety ? (
                    <motion.section
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.34, delay: 0.34 }}
                        style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: 640,
                            margin: "10px auto 0",
                            padding: "14px 16px 15px 18px",
                            borderRadius: 14,
                            background:
                                "linear-gradient(180deg, rgba(255,165,89,.035), rgba(255,165,89,.018))",
                            border: "1px solid rgba(255,185,116,.10)",
                            boxShadow:
                                "inset 0 2px 8px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.025)",
                        }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                position: "absolute",
                                left: 0,
                                top: 11,
                                bottom: 11,
                                width: 2,
                                borderRadius: 999,
                                background: "rgba(255,184,109,.52)",
                                boxShadow: "0 0 10px rgba(255,164,92,.14)",
                            }}
                        />
                        <div
                            style={{
                                ...labelStyle,
                                color: "rgba(255,202,146,.94)",
                                marginBottom: 6,
                            }}
                        >
                            SAFETY
                        </div>
                        <div
                            style={{
                                maxWidth: 620,
                                fontSize: `clamp(${Math.max(fontSize - 2, 13)}px, 1.55vw, 14px)`,
                                lineHeight: 1.55,
                                fontWeight: 520,
                                color: "rgba(255,232,210,.82)",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {ritual.safety}
                        </div>
                    </motion.section>
                ) : null}

                {/* SUPPORT FIRST — only hard safety route gets the strongest containment */}
                {ritual.supportFirst ? (
                    <motion.section
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.34, delay: 0.38 }}
                        style={{
                            width: "100%",
                            maxWidth: 640,
                            padding: "14px 15px",
                            margin: "10px auto 0",
                            borderRadius: 14,
                            background:
                                "linear-gradient(180deg, rgba(255,147,92,.085), rgba(255,147,92,.045))",
                            border: "1px solid rgba(255,162,98,.21)",
                            boxShadow:
                                "0 9px 22px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.045)",
                        }}
                    >
                        <div
                            style={{
                                ...labelStyle,
                                color: "rgba(255,188,130,.99)",
                                marginBottom: 6,
                            }}
                        >
                            SUPPORT FIRST
                        </div>
                        <div
                            style={{
                                fontSize: Math.max(fontSize - 1, 14),
                                lineHeight: 1.52,
                                fontWeight: 620,
                                color: "rgba(255,236,220,.95)",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {ritual.supportFirst}
                        </div>
                    </motion.section>
                ) : null}
            </motion.article>
        </>
    )
}

function RitualPlayerNav({
    uiFontFamily,
    bubble,
    avatarUrl,
    avatarBroken,
    onAvatarError,
    onPrevious,
    onNext,
    canPrevious,
    isBusy,
    avatarSize,
    avatarX,
    avatarY,
}: {
    uiFontFamily: string
    bubble: BubbleSlug
    avatarUrl: string
    avatarBroken: boolean
    onAvatarError: () => void
    onPrevious: () => void
    onNext: () => void
    canPrevious: boolean
    isBusy: boolean
    avatarSize: number
    avatarX: number
    avatarY: number
}) {
    const safeAvatarSize = Math.max(32, Math.min(240, Number(avatarSize || 72)))
    const safeAvatarX = Math.max(-500, Math.min(500, Number(avatarX || 0)))
    const safeAvatarY = Math.max(-500, Math.min(500, Number(avatarY || 0)))
    const ritualBoxWidth = 680
    const navButtonSize = 50
    const navGap = 14
    const navOffset = navButtonSize + navGap

    const navButton = (enabled = true): React.CSSProperties => ({
        width: navButtonSize,
        height: navButtonSize,
        borderRadius: 999,
        border: enabled
            ? "1px solid rgba(151,231,255,0.26)"
            : "1px solid rgba(255,255,255,0.05)",
        background: enabled
            ? `radial-gradient(circle at 34% 25%, rgba(159,235,255,0.15), transparent 42%), ${orbBg(bubble)}`
            : "rgba(255,255,255,0.018)",
        color: enabled ? "rgba(232,249,255,0.98)" : "rgba(205,220,228,0.20)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        cursor: enabled && !isBusy ? "pointer" : "default",
        opacity: isBusy ? 0.52 : 1,
        boxShadow: enabled
            ? "0 12px 30px rgba(0,0,0,0.32), 0 0 26px rgba(112,211,255,0.11), inset 0 1px 0 rgba(255,255,255,0.12)"
            : "none",
        backdropFilter: "blur(12px)",
        fontFamily: uiFontFamily,
        pointerEvents: "auto",
        flex: "0 0 auto",
    })

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                position: "absolute",
                inset: "8px clamp(8px, 2vw, 20px) 12px",
                zIndex: 30,
                pointerEvents: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "stretch",
                overflow: "visible",
                fontFamily: uiFontFamily,
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: "min(680px, 100%)",
                    maxWidth: ritualBoxWidth,
                    height: "100%",
                    overflow: "visible",
                }}
            >
                {/* PREVIOUS — fixed at the exact same distance from the ritual box as NEXT */}
                <div
                    className="ts-nav-previous-wrap"
                    style={{
                        position: "absolute",
                        top: 18,
                        left: -navOffset,
                        pointerEvents: "none",
                    }}
                >
                    <button
                        type="button"
                        className="ts-haptic ts-nav-button ts-nav-previous"
                        onClick={onPrevious}
                        disabled={!canPrevious || isBusy}
                        aria-label="Previous ritual"
                        title="Last best ritual"
                        style={navButton(canPrevious)}
                    >
                        <svg
                            aria-hidden="true"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M15 5 8 12l7 7"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>

                {/* NEXT — fixed at the exact same distance from the ritual box as PREVIOUS */}
                <div
                    className="ts-nav-next-wrap"
                    style={{
                        position: "absolute",
                        top: 18,
                        right: -navOffset,
                        pointerEvents: "none",
                    }}
                >
                    <button
                        type="button"
                        className="ts-haptic ts-nav-button ts-next-best"
                        onClick={onNext}
                        disabled={isBusy}
                        aria-label="Next ritual"
                        title="Next best ritual"
                        style={navButton(true)}
                    >
                        <svg
                            aria-hidden="true"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="m9 5 7 7-7 7"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>

                {/* CHAT AVATAR — fixed near the lower-left gutter */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        bottom: 0,
                        width: safeAvatarSize,
                        height: safeAvatarSize,
                        transform: `translate3d(${safeAvatarX}px, ${safeAvatarY}px, 0)`,
                        transition:
                            "width 120ms ease, height 120ms ease, transform 120ms ease",
                        pointerEvents: "none",
                        overflow: "visible",
                    }}
                >
                    <div
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            right: -7,
                            top: Math.max(
                                10,
                                Math.round(safeAvatarSize * 0.22)
                            ),
                            width: 18,
                            height: 18,
                            transform: "rotate(45deg)",
                            borderRadius: 5,
                            background: "rgba(13,27,35,0.96)",
                            borderTop: "1px solid rgba(143,220,255,0.18)",
                            borderRight: "1px solid rgba(143,220,255,0.18)",
                            zIndex: 0,
                        }}
                    />

                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: 999,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: orbBg(bubble),
                            border: "1px solid rgba(143,220,255,0.22)",
                            boxShadow:
                                "0 12px 34px rgba(0,0,0,0.34), 0 0 24px rgba(116,220,255,0.12)",
                            color: "rgba(248,252,255,0.94)",
                            fontWeight: 950,
                            fontSize: Math.max(17, safeAvatarSize * 0.3),
                            position: "relative",
                            zIndex: 2,
                        }}
                    >
                        {avatarUrl && !avatarBroken ? (
                            <img
                                src={avatarUrl}
                                alt={`${BUBBLE_LABEL[bubble] || "Bubble"} Bubble`}
                                onError={onAvatarError}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                }}
                            />
                        ) : (
                            bubbleInitial(bubble)
                        )}
                    </div>
                </div>
            </div>
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
        height: 28,
        flex: "1 1 0",
        minWidth: 0,
        padding: "0 6px",
        borderRadius: 999,
        border: "none",
        background: selected
            ? "linear-gradient(180deg, rgba(128,229,255,0.17), rgba(55,121,143,0.13))"
            : "transparent",
        color: selected ? "rgba(226,249,255,0.98)" : "rgba(224,235,241,0.52)",
        fontWeight: 950,
        fontSize: 9.25,
        letterSpacing: 0.42,
        boxShadow: selected
            ? "0 0 18px rgba(107,226,255,0.09), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "none",
        cursor: "pointer",
        fontFamily: uiFontFamily,
        whiteSpace: "nowrap",
        userSelect: "none",
    })
    return (
        <div
            aria-label="Chat colour mode"
            style={{
                width: 96,
                height: 32,
                borderRadius: 999,
                padding: 2,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: 2,
                border: "1px solid rgba(160,224,246,0.10)",
                background:
                    "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.018))",
                boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.035), 0 6px 18px rgba(0,0,0,0.16)",
                fontFamily: uiFontFamily,
            }}
        >
            <button
                type="button"
                className="ts-haptic"
                aria-pressed={value === "dark"}
                onClick={() => onChange("dark")}
                style={button(value === "dark")}
            >
                DARK
            </button>
            <button
                type="button"
                className="ts-haptic"
                aria-pressed={value === "bright"}
                onClick={() => onChange("bright")}
                style={button(value === "bright")}
            >
                BRIGHT
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
        shareBaseUrl = "",
        uiFont = "Inter",
        uiFontCustom = "",
        ritualFont = "Inter",
        ritualFontCustom = "",
        ritualFontSize = 17,
        resetConsoleFontSize = 12,
        manifestUrl = "",
        overlayVariant = 1,
        overlayOpacity = 0.92,
        overlayTransitionMs = 1800,
        overlayVideoPlaySeconds = 3,
        overlayPreloadEnabled = true,
        showVideoDebug = false,
        overlayTransitionsEnabled = true,
        overlayBlend = "normal",
        overlayBlur = 0,
        overlaySize = 72,
        overlayCropEnabled = true,
        overlayCropZoom = 115,
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

    const [activeBubble, setActiveBubble] = React.useState<BubbleSlug>("glitch")

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
        "prompt" | "status" | "transition" | "ritual"
    >("prompt")
    const [statusText, setStatusText] = React.useState("")
    const [currentText, setCurrentText] = React.useState("")
    const [currentSig, setCurrentSig] = React.useState("")
    const [currentMeta, setCurrentMeta] = React.useState<RitualRuntimeMeta | null>(null)
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

    type RitualHistoryItem = RitualRuntimeMeta & {
        text: string
        sig: string
        bubble: BubbleSlug
    }
    const [ritualHistory, setRitualHistory] = React.useState<
        RitualHistoryItem[]
    >([])
    const [ritualHistoryIndex, setRitualHistoryIndex] = React.useState(-1)
    const ritualHistoryRef = React.useRef<RitualHistoryItem[]>([])
    const ritualHistoryIndexRef = React.useRef(-1)

    React.useEffect(() => {
        ritualHistoryRef.current = ritualHistory
    }, [ritualHistory])
    React.useEffect(() => {
        ritualHistoryIndexRef.current = ritualHistoryIndex
    }, [ritualHistoryIndex])

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

    const [overlayRotationCounts, setOverlayRotationCounts] = React.useState<
        Record<BubbleSlug, number>
    >(() => {
        const saved = lsGet<Record<string, number>>(
            OVERLAY_ROTATION_KEY,
            makeBubbleNumberMap(0)
        )
        return {
            ...makeBubbleNumberMap(0),
            ...saved,
        } as Record<BubbleSlug, number>
    })
    React.useEffect(() => {
        lsSet(OVERLAY_ROTATION_KEY, overlayRotationCounts)
    }, [overlayRotationCounts])

    const requestedOverlayStart = Math.max(
        1,
        Math.min(5, Number(overlayVariant || 1))
    )

    // SEPARATE TRANSITION SCREEN — the FINAL routed bubble video is shown by
    // itself first. The ritual is already prepared in state but stays hidden until
    // the video fires `ended`. This prevents the media from ever covering the ritual.
    type OverlayTransitionState = {
        eventKey: string
        bubble: BubbleSlug
        variant: number
        url: string
        isVideo: boolean
    }

    const [overlayTransition, setOverlayTransition] =
        React.useState<OverlayTransitionState | null>(null)
    const overlayTransitionRef = React.useRef<OverlayTransitionState | null>(
        null
    )

    const videoOverlayAllowed = !performanceMode || !!allowOverlayVideoInPerf
    // Still-image hold time remains independent from video timing.
    const transitionDurationMs = Math.max(
        500,
        Math.min(6000, Number(overlayTransitionMs || 1800))
    )
    // VIDEO PLAY TIME is an exact transition window controlled in Framer.
    // 0 = play the source video once to its natural end.
    // >0 = keep the video screen active for exactly this many seconds.
    // Short clips loop to fill the window; long clips are cut at the limit.
    const videoPlayTimeSeconds = Math.max(
        0,
        Math.min(30, Number(overlayVideoPlaySeconds ?? 3))
    )
    const videoCutoffTimerRef = React.useRef<number | null>(null)
    const videoCutoffStartedForRef = React.useRef("")

    const clearVideoCutoffTimer = React.useCallback(() => {
        if (videoCutoffTimerRef.current != null) {
            window.clearTimeout(videoCutoffTimerRef.current)
            videoCutoffTimerRef.current = null
        }
        videoCutoffStartedForRef.current = ""
    }, [])

    // Framer-adjustable transition media geometry. Size controls the centred
    // visual frame; Crop Zoom enlarges the media *inside* that frame.
    const overlaySizePct = Math.max(
        20,
        Math.min(140, Number(overlaySize || 72))
    )
    const overlayCropScale = Math.max(
        1,
        Math.min(3, Number(overlayCropZoom || 100) / 100)
    )

    const clearOverlayTransition = React.useCallback(() => {
        clearVideoCutoffTimer()
        overlayTransitionRef.current = null
        setOverlayTransition(null)
    }, [clearVideoCutoffTimer])

    const startOverlayTransition = React.useCallback(
        (bubble: BubbleSlug, eventKey: string): boolean => {
            // A new transition must never inherit the previous video's cutoff.
            clearVideoCutoffTimer()

            // No usable transition asset means there is nothing to wait for:
            // caller should reveal the ritual immediately.
            if (!overlayTransitionsEnabled) {
                clearOverlayTransition()
                return false
            }

            const available = getAvailableOverlayVariants(bubble, overlays)
            if (!available.length) {
                clearOverlayTransition()
                return false
            }

            const requestedIndex = available.indexOf(requestedOverlayStart)
            const baseOffset = requestedIndex >= 0 ? requestedIndex : 0
            const rotationCount = Math.max(
                0,
                Number(overlayRotationCounts[bubble] || 0)
            )
            const variant =
                available[(rotationCount + baseOffset) % available.length]
            const url = pickOverlay(bubble, variant, overlays)
            const isVideo = isVideoUrl(url)

            if (
                !url ||
                Number(overlayOpacity || 0) <= 0 ||
                (isVideo && !videoOverlayAllowed)
            ) {
                clearOverlayTransition()
                return false
            }

            const nextTransition: OverlayTransitionState = {
                eventKey,
                bubble,
                variant,
                url,
                isVideo,
            }
            overlayTransitionRef.current = nextTransition
            setOverlayTransition(nextTransition)

            if (showVideoDebug && isVideo) {
                console.info(
                    `[ThinkStill Video] ${BUBBLE_LABEL[bubble].toUpperCase()} • Video ${variant} • ${overlayFileLabel(url)}`,
                    {
                        bubble: BUBBLE_LABEL[bubble],
                        videoSlot: variant,
                        file: overlayFileLabel(url),
                        url,
                    }
                )
            }

            // Advance only the FINAL routed bubble. Each bubble keeps its own
            // 1 → 2 → 3 → 4 → 5 cycle and wraps to the first available clip.
            setOverlayRotationCounts((prev) => ({
                ...prev,
                [bubble]: Math.max(0, Number(prev[bubble] || 0)) + 1,
            }))
            return true
        },
        [
            overlayTransitionsEnabled,
            overlays,
            requestedOverlayStart,
            overlayRotationCounts,
            overlayOpacity,
            videoOverlayAllowed,
            showVideoDebug,
            clearVideoCutoffTimer,
            clearOverlayTransition,
        ]
    )

    const finishOverlayTransition = React.useCallback(
        (eventKey?: string) => {
            const current = overlayTransitionRef.current
            if (!current) return
            if (eventKey && current.eventKey !== eventKey) return

            clearVideoCutoffTimer()
            overlayTransitionRef.current = null
            setOverlayTransition(null)
            // Reveal only if we are still on the dedicated transition screen.
            setViewMode((mode) => (mode === "transition" ? "ritual" : mode))
        },
        [clearVideoCutoffTimer]
    )

    const startVideoCutoff = React.useCallback(
        (eventKey: string) => {
            if (videoPlayTimeSeconds <= 0) return
            const current = overlayTransitionRef.current
            if (!current || current.eventKey !== eventKey) return
            // `playing` can fire again after buffering or looping. Start only once.
            if (videoCutoffStartedForRef.current === eventKey) return

            videoCutoffStartedForRef.current = eventKey
            if (videoCutoffTimerRef.current != null) {
                window.clearTimeout(videoCutoffTimerRef.current)
            }
            videoCutoffTimerRef.current = window.setTimeout(
                () => {
                    finishOverlayTransition(eventKey)
                },
                Math.max(50, Math.round(videoPlayTimeSeconds * 1000))
            )
        },
        [videoPlayTimeSeconds, finishOverlayTransition]
    )

    React.useEffect(() => {
        return () => clearVideoCutoffTimer()
    }, [clearVideoCutoffTimer])

    React.useEffect(() => {
        if (!overlayTransition || overlayTransition.isVideo) return
        const eventKey = overlayTransition.eventKey
        const timer = window.setTimeout(
            () => finishOverlayTransition(eventKey),
            transitionDurationMs
        )
        return () => window.clearTimeout(timer)
    }, [overlayTransition, transitionDurationMs, finishOverlayTransition])

    React.useEffect(() => {
        // Leaving the ritual tab cancels the media, but keeps the prepared ritual
        // available when the user returns from the Vault.
        if (tab !== "ritual") {
            if (viewMode === "transition") setViewMode("ritual")
            clearOverlayTransition()
            return
        }

        if (!overlayTransitionsEnabled) {
            if (viewMode === "transition") setViewMode("ritual")
            clearOverlayTransition()
        }
    }, [tab, viewMode, overlayTransitionsEnabled, clearOverlayTransition])

    const showOverlayTransition =
        overlayTransitionsEnabled &&
        tab === "ritual" &&
        viewMode === "transition" &&
        !!overlayTransition

    // PRELOAD — while the user is reading/typing, warm the exact next video
    // scheduled for EACH bubble. This means routing can still choose any bubble
    // without making the user wait for that clip to begin downloading after ENTER.
    // When a bubble advances 1 → 2 → 3 → 4 → 5, this memo immediately switches
    // that bubble's hidden preloader to its following clip.
    const preloadOverlayUrls = React.useMemo(() => {
        if (
            !overlayPreloadEnabled ||
            !overlayTransitionsEnabled ||
            !videoOverlayAllowed
        )
            return [] as string[]

        const urls: string[] = []
        for (const bubble of BUBBLE_ORDER) {
            const available = getAvailableOverlayVariants(bubble, overlays)
            if (!available.length) continue

            const requestedIndex = available.indexOf(requestedOverlayStart)
            const baseOffset = requestedIndex >= 0 ? requestedIndex : 0
            const rotationCount = Math.max(
                0,
                Number(overlayRotationCounts[bubble] || 0)
            )
            const variant =
                available[(rotationCount + baseOffset) % available.length]
            const url = pickOverlay(bubble, variant, overlays)
            if (url && isVideoUrl(url)) urls.push(url)
        }

        return Array.from(new Set(urls))
    }, [
        overlayPreloadEnabled,
        overlayTransitionsEnabled,
        videoOverlayAllowed,
        overlays,
        requestedOverlayStart,
        overlayRotationCounts,
    ])

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
                completeRitualTextFromAny(x) ||
                    String(
                        x?.plain ??
                            x?.t ??
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
                x?.thinking_error ??
                    x?.thinkingError ??
                    x?.routing?.release_trigger ??
                    x?.specialist ??
                    x?.trigger ??
                    ""
            ).trim(),
            precise_subpattern: String(
                x?.precise_subpattern ??
                    x?.preciseSubpattern ??
                    x?.routing?.release_pattern ??
                    x?.precisePattern ??
                    x?.primary_trigger ??
                    ""
            ).trim(),
            primary_trigger: String(
                x?.primary_trigger ??
                    x?.primaryTrigger ??
                    x?.routing?.original_trigger ??
                    ""
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
                : Array.isArray(x?.routing?.routing_keywords)
                  ? x.routing.routing_keywords
                        .map((v: any) => String(v || "").trim())
                        .filter(Boolean)
                  : Array.isArray(x?.routingKeywords)
                    ? x.routingKeywords
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
            safety_class: String(
                x?.safety_class ?? x?.safetyClass ?? ""
            ).trim(),
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
            // Final-release rule: every ritual opens at its hero, immediately.
            // Smooth scrolling could leave the title half-clipped while a new ritual mounted.
            try {
                el.scrollTo({ top: 0, behavior: "auto" })
            } catch {
                el.scrollTop = 0
            }
            el.scrollTop = 0
            requestAnimationFrame(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = 0
            })
        })

        return () => cancelAnimationFrame(frame)
    }, [runKey, viewMode, tab])

    // Session ritual history powers the media-player back/forward controls.
    const showHistoryRitual = React.useCallback(
        (index: number) => {
            const history = ritualHistoryRef.current
            if (index < 0 || index >= history.length) return
            const item = history[index]
            clearOverlayTransition()
            setActiveBubble(item.bubble)
            setCurrentText(item.text)
            setCurrentSig(item.sig)
            setCurrentMeta(item)
            setRunKey(`nav-${Date.now()}-${makeSeed()}`)
            setHasTypedOnce(!!typedSigMap[item.sig])
            setGameRound(index + 1)
            setRitualHistoryIndex(index)
            ritualHistoryIndexRef.current = index
            setTab("ritual")
            setViewMode("ritual")
        },
        [typedSigMap]
    )

    const commitRitualToHistory = React.useCallback(
        (item: RitualHistoryItem, isRetry: boolean) => {
            if (!isRetry) {
                const next = [item]
                ritualHistoryRef.current = next
                ritualHistoryIndexRef.current = 0
                setRitualHistory(next)
                setRitualHistoryIndex(0)
                setGameRound(1)
                return
            }

            const currentHistory = ritualHistoryRef.current
            const currentIndex = ritualHistoryIndexRef.current
            const base = currentHistory.slice(0, Math.max(0, currentIndex + 1))
            const next = [...base, item]
            const nextIndex = next.length - 1
            ritualHistoryRef.current = next
            ritualHistoryIndexRef.current = nextIndex
            setRitualHistory(next)
            setRitualHistoryIndex(nextIndex)
            setGameRound(nextIndex + 1)
        },
        []
    )

    const deepLinkHandledRef = React.useRef(false)
    React.useEffect(() => {
        if (deepLinkHandledRef.current || libStatus !== "ready") return
        if (typeof window === "undefined") return
        const sharedId = new URLSearchParams(window.location.search).get("try")?.trim()
        if (!sharedId) return
        deepLinkHandledRef.current = true
        const mUrl = normalizeLibraryUrl(String(manifestUrl || ""))
        if (!mUrl || !manifestRef.current) return

        let alive = true
        setTab("ritual")
        setViewMode("status")
        setStatusText("⟡ Opening shared reset…")
        trackGrowthEvent("share_opened", { ritualId: sharedId })

        ;(async () => {
            const searchKeys: BubbleKey[] = ["GLITCH", "SYNC", "PATCH", "DROP", "STILL", "RUSH", "LOOPIE"]
            await Promise.allSettled(searchKeys.map((bk) => ensureBubbleLoaded(mUrl, bk)))
            if (!alive) return
            let found: { ritual: BubbleRitual; bubbleKey: BubbleKey } | null = null
            for (const bk of searchKeys) {
                const ritual = (bubbleCacheRef.current[bk]?.rituals || []).find(
                    (r) => String(r?.id || "").toUpperCase() === sharedId.toUpperCase()
                )
                if (ritual) { found = { ritual, bubbleKey: bk }; break }
            }
            if (!found) {
                setStatusText("That shared reset is unavailable in this release.")
                return
            }

            const bubbleSlug =
                (Object.keys(BUBBLE_TO_KEY) as BubbleSlug[]).find(
                    (slug) => BUBBLE_TO_KEY[slug] === found!.bubbleKey
                ) || "glitch"
            const built = buildDisplayTitleless({
                bubbleKey: found.bubbleKey,
                ritual: found.ritual,
                rawText: ritualTextDefault(found.ritual),
                rawSafety: ritualSafety(found.ritual),
                challengeFromUser: "",
                comfortLevel: (comfortLevel as any) || "two",
                msgSeed: `shared-${Date.now()}`,
            })
            const exact = parseExactRitual(built.text)
            const all = getAllRituals({
                GLITCH: bubbleCacheRef.current.GLITCH?.rituals || [],
                SYNC: bubbleCacheRef.current.SYNC?.rituals || [],
                PATCH: bubbleCacheRef.current.PATCH?.rituals || [],
                DROP: bubbleCacheRef.current.DROP?.rituals || [],
                STILL: bubbleCacheRef.current.STILL?.rituals || [],
                RUSH: bubbleCacheRef.current.RUSH?.rituals || [],
                LOOPIE: bubbleCacheRef.current.LOOPIE?.rituals || [],
            })
            const used = loadSet(GLOBAL_USED_RITUALS_KEY)
            used.add(built.sig)
            saveSet(GLOBAL_USED_RITUALS_KEY, used, all.length + 20)
            const served = Number(lsGet<number>(RITUAL_SERVED_COUNT_KEY, 0) || 0) + 1
            lsSet(RITUAL_SERVED_COUNT_KEY, served)

            const meta: RitualRuntimeMeta = {
                ritualId: String(found.ritual.id || ""),
                ritualName: exact.game || String(found.ritual.name || ""),
                mindBend: exact.mindBend || String((found.ritual as any).mindBend || ""),
                win: exact.win,
                playTime: exact.playTime || String((found.ritual as any).play_time || ""),
                resetDNAFamily: resetDNAFamilyOf(found.ritual),
                thinkingError: thinkingErrorOf(found.ritual),
                preciseSubpattern: subpatternOf(found.ritual),
                usedCount: used.size,
                totalCount: all.length,
                cycle: Number(lsGet<number>(GLOBAL_CYCLE_KEY, 1) || 1),
                firstSessionPick: !!(found.ritual as any).first_session_pick,
            }
            setActiveBubble(bubbleSlug)
            setCurrentText(built.text)
            setCurrentSig(built.sig)
            setCurrentMeta(meta)
            const nextRunKey = `shared-${Date.now()}-${makeSeed()}`
            setRunKey(nextRunKey)
            commitRitualToHistory({ text: built.text, sig: built.sig, bubble: bubbleSlug, ...meta }, false)
            const hasTransition = startOverlayTransition(bubbleSlug, nextRunKey)
            setViewMode(hasTransition ? "transition" : "ritual")
            trackGrowthEvent("shared_ritual_started", {
                ritualId: meta.ritualId || "",
                resetDNAFamily: meta.resetDNAFamily || "",
            })
        })().catch(() => {
            if (alive) setStatusText("That shared reset could not be opened.")
        })
        return () => { alive = false }
        // Run once when the manifest becomes usable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [libStatus, manifestUrl])

    const sendMessage = async (
        overrideMessage = "",
        fromMic = false,
        isRetry = false
    ) => {
        markGesture()
        const message = norm(overrideMessage || inputRef.current || "")
        if (!message) return
        if (inFlightRef.current) return
        inFlightRef.current = true
        setIsThinking(true)

        const mUrl = normalizeLibraryUrl(String(manifestUrl || ""))
        const newSeed = `${Date.now()}-${makeSeed()}`
        setMsgSeed(newSeed)

        if (!isRetry) {
            setLastSignal(message)
            setGameRound(1)
        }
        setLastSignalAt(Date.now())

        // autoRouteBubble is now visual/fallback guidance only.
        // Final ritual selection is performed by the full 22 → 63 competitive router.
        const bubble: BubbleSlug = autoRouteBubble(message)

        setActiveBubble(bubble)
        setTab("ritual")
        setViewMode("status")
        setStatusText("⟡ Pulling a ritual…")

        try {
            if (!manifestRef.current)
                throw new Error(libError || "Manifest not ready.")
            if (!mUrl) throw new Error("Missing manifest URL.")

            const preferredKey: BubbleKey = BUBBLE_TO_KEY[bubble]
            const searchKeys: BubbleKey[] = [
                "GLITCH",
                "SYNC",
                "PATCH",
                "DROP",
                "STILL",
                "RUSH",
                "LOOPIE",
            ]

            // Thinking-error ranking works best with the full ritual pool.
            // Load all 7 bubble files concurrently so one large GitHub RAW file
            // cannot make the other six wait behind it. A temporary failure in
            // one bubble no longer crashes the whole ritual experience.
            const loadResults = await Promise.allSettled(
                searchKeys.map((bk) => ensureBubbleLoaded(mUrl, bk))
            )
            const loadedBubbleCount = searchKeys.filter(
                (bk) =>
                    bubbleCacheRef.current[bk]?.loaded &&
                    (bubbleCacheRef.current[bk]?.rituals?.length || 0) > 0
            ).length

            if (loadedBubbleCount === 0) {
                const firstFailure = loadResults.find(
                    (r) => r.status === "rejected"
                ) as PromiseRejectedResult | undefined
                throw new Error(
                    String(
                        firstFailure?.reason?.message ||
                            libError ||
                            "Ritual library could not be loaded."
                    )
                )
            }

            // Clear a transient per-bubble error if enough of the library loaded
            // to route a ritual successfully. Failed bubbles can retry next time.
            setLibStatus("ready")
            setLibError("")
            setLibProgress({ loaded: 0, total: 0 })

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
                const fallbackText = [
                    comfortPrefixForMessage(
                        (comfortLevel as any) || "two",
                        newSeed,
                        message
                    ),
                    formatChallengeLineRaw(message),
                    "Pause here.",
                    "Take one slower breath than the last one.",
                    "Name the strongest signal without fighting it.",
                    "Choose the smallest stabilizing move available now.",
                    "Stay with that move for one more beat.",
                    "Return: Use the forward control for the next unused ritual for this same issue.",
                ]
                    .filter(Boolean)
                    .join("\n\n")

                const fallbackSig = hash32(
                    `${preferredKey}||fallback||${message}`
                )
                const nextRunKey = `run-${Date.now()}-${makeSeed()}`
                setCurrentText(fallbackText)
                setCurrentSig(fallbackSig)
                setCurrentMeta(null)
                setRunKey(nextRunKey)
                commitRitualToHistory(
                    { text: fallbackText, sig: fallbackSig, bubble },
                    isRetry
                )
                const hasTransition = startOverlayTransition(bubble, nextRunKey)
                setViewMode(hasTransition ? "transition" : "ritual")
                setHasTypedOnce(!!typedSigMap[fallbackSig])
                setInput("")
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

            const exact = parseExactRitual(built.text)
            const meta: RitualRuntimeMeta = {
                ritualId: String(out.ritual?.id || ""),
                ritualName: exact.game || String(out.ritual?.name || out.ritual?.ritual_name || ""),
                mindBend: exact.mindBend || String((out.ritual as any)?.mindBend || (out.ritual as any)?.mind_bend || ""),
                win: exact.win,
                playTime: exact.playTime || String((out.ritual as any)?.play_time || (out.ritual as any)?.playTime || ""),
                resetDNAFamily: resetDNAFamilyOf(out.ritual),
                thinkingError: out.thinkingError,
                preciseSubpattern: out.preciseSubpattern,
                usedCount: out.usedCount,
                totalCount: out.totalCount,
                cycle: out.cycle,
                firstSessionPick: !!(out.ritual as any)?.first_session_pick,
            }
            const nextRunKey = `run-${Date.now()}-${makeSeed()}`
            setCurrentText(built.text)
            setCurrentSig(built.sig)
            setCurrentMeta(meta)
            setRunKey(nextRunKey)
            commitRitualToHistory(
                { text: built.text, sig: built.sig, bubble: actualBubbleSlug, ...meta },
                isRetry
            )
            const hasTransition = startOverlayTransition(
                actualBubbleSlug,
                nextRunKey
            )
            setViewMode(hasTransition ? "transition" : "ritual")
            setHasTypedOnce(!!typedSigMap[built.sig])
            setInput("")
        } catch (e: any) {
            const msg = String(e?.message || "Failed")
            const errorSig = hash32(`system||${msg}`)
            setCurrentText(
                `${msg}\n\nTip: confirm the manifest and all seven ritual JSON files are committed in the same GitHub folder.`
            )
            setCurrentSig(errorSig)
            setCurrentMeta(null)
            setViewMode("ritual")
            setRunKey(`run-${Date.now()}-${makeSeed()}`)
            setHasTypedOnce(!!typedSigMap[errorSig])
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

    const requestAnotherRitual = () => {
        markGesture()
        const base = norm(lastSignal || "")
        if (!base) {
            clearOverlayTransition()
            setViewMode("prompt")
            setTimeout(() => inputElRef.current?.focus?.(), 40)
            return
        }
        sendMessage(base, false, true)
    }

    const goPreviousRitual = () => {
        markGesture()
        if (isThinking || viewMode === "transition") return
        const index = ritualHistoryIndexRef.current
        if (index <= 0) return
        showHistoryRitual(index - 1)
    }

    const goNextRitual = () => {
        markGesture()
        if (isThinking || viewMode === "transition") return
        const history = ritualHistoryRef.current
        const index = ritualHistoryIndexRef.current
        if (index >= 0 && index < history.length - 1) {
            showHistoryRitual(index + 1)
            return
        }
        requestAnotherRitual()
    }

    const startNewQuest = () => {
        markGesture()
        setGameRound(1)
        setCurrentText("")
        setCurrentSig("")
        setCurrentMeta(null)
        setLastSignal("")
        setInput("")
        setRitualHistory([])
        setRitualHistoryIndex(-1)
        ritualHistoryRef.current = []
        ritualHistoryIndexRef.current = -1
        clearOverlayTransition()
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

    const [feedbackRevision, setFeedbackRevision] = React.useState(0)
    const [currentShiftOverride, setCurrentShiftOverride] = React.useState<{ sig: string; rating: number } | null>(null)
    const [shareState, setShareState] = React.useState<"idle" | "working" | "done" | "fallback">("idle")
    const currentShiftRating = React.useMemo(() => {
        if (!currentSig) return null
        if (currentShiftOverride?.sig === currentSig) {
            return Math.max(0, Math.min(3, Number(currentShiftOverride.rating)))
        }
        const rec = loadShiftRecords()[currentSig]
        return rec ? Math.max(0, Math.min(3, Number(rec.rating))) : null
    }, [currentSig, feedbackRevision, currentShiftOverride])
    const resetDNAEntries = React.useMemo(
        () => resetDNAEntriesFromRecords(),
        [feedbackRevision]
    )
    const totalShiftRatings = resetDNAEntries.reduce((sum, x) => sum + x.count, 0)

    const rateCurrentShift = (rating: number) => {
        markGesture()
        if (!currentSig || !currentMeta) return
        const safeRating = Math.max(0, Math.min(3, Number(rating || 0)))

        // Update the interface first so the tap always feels responsive, even if
        // browser storage is unavailable/restricted in an embedded preview.
        setCurrentShiftOverride({ sig: currentSig, rating: safeRating })
        recordShiftRating(currentSig, currentMeta, safeRating)
        setFeedbackRevision((x) => x + 1)
    }

    const shiftConfirmation = React.useMemo(() => {
        if (currentShiftRating === null) return ""
        if (currentShiftRating === 0) return "SAVED · NEXT RESET CAN TRY A DIFFERENT MECHANISM"
        if (currentShiftRating === 1) return "SAVED · THINKSTILL WILL TUNE WHAT COMES NEXT"
        if (currentShiftRating === 2) return "SAVED · THIS MECHANISM LOOKS USEFUL FOR YOU"
        return "SAVED · STRONG MATCH — THINKSTILL WILL LEARN FROM IT"
    }, [currentShiftRating])

    const shareCurrentReveal = async () => {
        markGesture()
        if (!currentMeta?.ritualId || !currentText) return
        const exact = parseExactRitual(currentText)
        const ritualName = currentMeta.ritualName || exact.game || "ThinkStill Reset"
        const mindBend = currentMeta.mindBend || exact.mindBend || currentMeta.win || exact.win
        if (!mindBend) return
        setShareState("working")
        const url = buildShareUrl(currentMeta.ritualId, String(shareBaseUrl || ""))
        const shareText = [
            mindBend,
            "",
            "Try this reset:",
            url,
        ].filter((line) => String(line || "").trim()).join("\n")
        trackGrowthEvent("share_intent", {
            ritualId: currentMeta.ritualId,
            resetDNAFamily: currentMeta.resetDNAFamily || "",
        })
        try {
            const blob = await createMindBendShareCard({
                ritualName,
                mindBend,
                playTime: currentMeta.playTime || exact.playTime,
                shareUrl: url,
            })
            const nav: any = navigator as any
            if (blob && typeof File !== "undefined") {
                const file = new File([blob], `thinkstill-${currentMeta.ritualId.toLowerCase()}.png`, {
                    type: "image/png",
                })
                if (typeof nav.share === "function" && (!nav.canShare || nav.canShare({ files: [file] }))) {
                    // Put the deep link directly inside `text`. Some Windows / Outlook
                    // share targets drop the Web Share API `url` field when a file is attached.
                    await nav.share({
                        title: `ThinkStill — ${ritualName}`,
                        text: shareText,
                        files: [file],
                    })
                    setShareState("done")
                    trackGrowthEvent("share_completed", { ritualId: currentMeta.ritualId, mode: "file" })
                    setTimeout(() => setShareState("idle"), 1400)
                    return
                }
            }
            if (typeof nav.share === "function") {
                await nav.share({
                    title: `ThinkStill — ${ritualName}`,
                    text: shareText,
                })
                setShareState("done")
                trackGrowthEvent("share_completed", { ritualId: currentMeta.ritualId, mode: "link" })
                setTimeout(() => setShareState("idle"), 1400)
                return
            }

            if (url && navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
            if (blob) {
                const objectUrl = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = objectUrl
                a.download = `thinkstill-${currentMeta.ritualId.toLowerCase()}.png`
                document.body.appendChild(a)
                a.click()
                a.remove()
                setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
            }
            setShareState("fallback")
            trackGrowthEvent("share_completed", { ritualId: currentMeta.ritualId, mode: "fallback" })
            setTimeout(() => setShareState("idle"), 1800)
        } catch (e: any) {
            if (String(e?.name || "") === "AbortError") {
                setShareState("idle")
                return
            }
            setShareState("idle")
        }
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
        trackGrowthEvent("vault_saved", { ritualId: currentMeta?.ritualId || "" })
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
            className={`ts-chat-root ${
                chatTheme === "bright" ? "ts-theme-light" : "ts-theme-dark"
            }`}
            data-chat-theme={chatTheme}
            onPointerDown={() => markGesture()}
            style={{
                width: "100%",
                height: "100dvh",
                minHeight: "100vh",
                overflow: "hidden",
                background: `radial-gradient(70% 58% at 50% -10%, rgba(91,226,255,0.17), transparent 60%), radial-gradient(52% 42% at 2% 96%, rgba(204,112,255,0.08), transparent 62%), radial-gradient(45% 40% at 100% 70%, rgba(89,255,195,0.055), transparent 64%), ${backgroundColor}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "stretch",
                paddingLeft: "max(clamp(6px, 1.5vw, 18px), env(safe-area-inset-left))",
                paddingRight: "max(clamp(6px, 1.5vw, 18px), env(safe-area-inset-right))",
                paddingTop: "max(clamp(6px, 1.5vw, 18px), env(safe-area-inset-top))",
                paddingBottom: "max(clamp(6px, 1.5vw, 18px), env(safe-area-inset-bottom))",
                boxSizing: "border-box",
                fontFamily: uiFontFamily,
            }}
        >
            {overlayPreloadEnabled && preloadOverlayUrls.length > 0 ? (
                <div
                    aria-hidden="true"
                    style={{
                        position: "fixed",
                        left: -99999,
                        top: -99999,
                        width: 1,
                        height: 1,
                        overflow: "hidden",
                        opacity: 0,
                        pointerEvents: "none",
                    }}
                >
                    {preloadOverlayUrls.map((url) => (
                        <video
                            key={`ts-preload-${url}`}
                            src={url}
                            preload="auto"
                            muted
                            playsInline
                            tabIndex={-1}
                            aria-hidden="true"
                        />
                    ))}
                </div>
            ) : null}
            <style>{`
                .ts-chat-root { overscroll-behavior:none; }
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

                .ts-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,220,255,0.34) transparent; }
                .ts-scroll::-webkit-scrollbar { width: 7px; }
                .ts-scroll::-webkit-scrollbar-track { background: transparent; }
                .ts-scroll::-webkit-scrollbar-thumb {
                    border-radius: 999px;
                    background: linear-gradient(180deg, rgba(174,239,255,0.62), rgba(114,208,255,0.24), rgba(210,150,255,0.16));
                    box-shadow: 0 0 12px rgba(140,220,255,0.12);
                    border: 1px solid rgba(10,14,18,0.46);
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
                    0%,100% { box-shadow: 0 38px 98px rgba(0,0,0,0.74), 0 0 16px rgba(94,220,255,0.035), inset 0 1px 0 rgba(255,255,255,0.055), inset 0 -1px 0 rgba(0,0,0,.44); }
                    50% { box-shadow: 0 39px 102px rgba(0,0,0,0.75), 0 0 23px rgba(94,220,255,0.055), inset 0 1px 0 rgba(255,255,255,0.060), inset 0 -1px 0 rgba(0,0,0,.44); }
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


                /* ===== THINKSTILL v38.8 FINAL CUSTOMER PRODUCT SKIN ===== */
                .ts-console-shell {
                    isolation: isolate;
                }
                .ts-console-shell::before {
                    content: "";
                    position: absolute;
                    inset: 1px;
                    pointer-events: none;
                    z-index: 0;
                    border-radius: inherit;
                    background:
                        linear-gradient(180deg, rgba(255,255,255,.028), transparent 14%),
                        radial-gradient(80% 34% at 50% 0%, rgba(125,220,242,.035), transparent 72%),
                        radial-gradient(75% 52% at 50% 110%, rgba(0,0,0,.24), transparent 70%);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,.025),
                        inset 0 0 54px rgba(0,0,0,.11);
                    opacity:.92;
                }
                .ts-console-shell::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 1;
                    opacity: .10;
                    background-image:
                        repeating-linear-gradient(0deg, rgba(255,255,255,.018) 0 1px, transparent 1px 4px),
                        linear-gradient(112deg, transparent 0 30%, rgba(255,255,255,.025) 47%, transparent 64%);
                    mix-blend-mode: soft-light;
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,.88), rgba(0,0,0,.46));
                }
                @keyframes tsEnterBreath {
                    0%,100% { filter:brightness(1) saturate(.98); box-shadow:0 0 9px rgba(102,235,255,.07),0 8px 22px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.64); }
                    50% { filter:brightness(1.018) saturate(1); box-shadow:0 0 15px rgba(102,235,255,.10),0 9px 24px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.69); }
                }
                @keyframes tsScreenTopline {
                    0%,100% { opacity:.30; transform:translateX(-8%); }
                    50% { opacity:.52; transform:translateX(8%); }
                }
                .ts-console-screen {
                    box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
                }
                .ts-console-screen::before {
                    content:"";
                    position:absolute;
                    left:14%;
                    right:14%;
                    top:0;
                    height:1px;
                    z-index:8;
                    pointer-events:none;
                    background:linear-gradient(90deg, transparent, rgba(146,238,255,.66), rgba(199,167,255,.36), transparent);
                    box-shadow:0 0 8px rgba(104,227,255,.10);
                    animation:tsScreenTopline 14s ease-in-out infinite;
                }
                .ts-console-screen::after { display:none; }
                .ts-console-deck { position: relative; z-index: 12; }
                .ts-console-deck::before { display:none; }

                .ts-haptic {
                    transform-origin:50% 50%;
                    transition:transform 120ms cubic-bezier(.2,.8,.2,1), filter 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease !important;
                    -webkit-tap-highlight-color:transparent;
                }
                .ts-haptic:not(:disabled):hover {
                    transform:translateY(-1px) scale(1.012);
                    filter:brightness(1.055);
                }
                .ts-haptic:active { transform:translateY(2px) scale(.985) !important; }
                .ts-haptic:focus-visible, .ts-console-input:focus-visible {
                    outline:2px solid rgba(137,236,255,.74);
                    outline-offset:2px;
                }
                .ts-haptic:disabled { cursor:default !important; filter:saturate(.65); }

                .ts-console-input:focus {
                    border-color:rgba(139,238,255,.58) !important;
                    background:radial-gradient(120% 170% at 10% 0%, rgba(91,218,255,.115), transparent 50%), linear-gradient(180deg, rgba(5,12,18,.99), rgba(8,15,22,.97)) !important;
                    box-shadow:inset 0 1px 0 rgba(255,255,255,.055), 0 0 0 2px rgba(97,224,255,.045), 0 0 13px rgba(92,225,255,.045), 0 8px 24px rgba(0,0,0,.24) !important;
                }
                input::placeholder { color:rgba(196,216,225,.40); font-weight:650; }

                .ts-title-word {
                    background:linear-gradient(90deg, rgba(247,253,255,.98), rgba(175,239,255,.96) 54%, rgba(218,190,255,.90));
                    -webkit-background-clip:text;
                    background-clip:text;
                    color:transparent;
                    text-shadow:0 0 24px rgba(120,226,255,.09);
                }
                .ts-reset-console:hover {
                    color:rgba(229,248,255,.88) !important;
                    border-color:rgba(146,229,255,.20) !important;
                    box-shadow:0 0 18px rgba(106,225,255,.07), inset 0 1px 0 rgba(255,255,255,.05) !important;
                }
                .ts-close-btn:hover { border-color:rgba(159,232,255,.26) !important; }
                .ts-orb-button:not(:disabled):hover { box-shadow:0 0 28px rgba(101,225,255,.15), 0 12px 26px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.13) !important; }
                .ts-enter-button:not(:disabled) { animation:tsEnterBreath 4.8s ease-in-out infinite; }
                .ts-enter-button:not(:disabled):hover { transform:translateY(-2px) scale(1.015); filter:brightness(1.075) saturate(1.06); }
                .ts-enter-button:disabled { animation:none; }
                .ts-save-button:not(:disabled):hover, .ts-tab-button:not(:disabled):hover { border-color:rgba(143,235,255,.24) !important; }
                .ts-console-topbar::after {
                    content:"";
                    position:absolute;
                    left:50%; bottom:-1px;
                    width:min(220px,42%); height:1px;
                    transform:translateX(-50%);
                    background:linear-gradient(90deg, transparent, rgba(126,235,255,.52), transparent);
                    box-shadow:0 0 14px rgba(92,224,255,.18);
                    pointer-events:none;
                }
                .ts-centered-brand:hover .ts-title-word { filter:brightness(1.06); }
                .ts-tab-button, .ts-save-button { backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); }
                .ts-command-segment {
                    display:inline-flex;
                    align-items:center;
                    gap:2px;
                    padding:3px;
                    border-radius:14px;
                    border:1px solid rgba(146,226,247,.085);
                    background:linear-gradient(180deg, rgba(255,255,255,.028), rgba(255,255,255,.012));
                    box-shadow:inset 0 1px 0 rgba(255,255,255,.035), 0 7px 18px rgba(0,0,0,.12);
                    backdrop-filter:blur(10px);
                    -webkit-backdrop-filter:blur(10px);
                }
                .ts-command-segment .ts-tab-button { border-color:transparent !important; box-shadow:none !important; }
                .ts-composer-shell {
                    position:relative;
                    display:flex;
                    align-items:center;
                    gap:6px;
                    padding:6px;
                    border-radius:24px;
                    border:1px solid rgba(133,226,250,.17);
                    background:
                        radial-gradient(95% 130% at 8% 0%, rgba(84,218,255,.07), transparent 53%),
                        linear-gradient(180deg, rgba(9,18,25,.985), rgba(4,10,15,.99));
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,.055),
                        inset 0 -1px 0 rgba(0,0,0,.42),
                        0 12px 34px rgba(0,0,0,.27),
                        0 0 24px rgba(76,218,255,.035);
                    transition:border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
                }
                .ts-composer-shell:focus-within {
                    border-color:rgba(139,238,255,.36);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,.07),
                        0 0 0 3px rgba(97,224,255,.035),
                        0 0 34px rgba(92,225,255,.07),
                        0 12px 36px rgba(0,0,0,.28);
                }
                .ts-composer-shell .ts-console-input {
                    height:46px !important;
                    border:none !important;
                    border-radius:16px !important;
                    background:transparent !important;
                    box-shadow:none !important;
                    padding-left:14px !important;
                    padding-right:10px !important;
                }
                .ts-composer-shell .ts-console-input:focus {
                    border:none !important;
                    background:transparent !important;
                    box-shadow:none !important;
                    outline:none !important;
                }
                .ts-composer-shell .ts-orb-button {
                    width:44px !important;
                    height:44px !important;
                    box-shadow:inset 0 1px 0 rgba(255,255,255,.10), 0 5px 14px rgba(0,0,0,.22) !important;
                }
                .ts-composer-shell .ts-enter-button {
                    height:46px !important;
                    min-width:92px !important;
                    border-radius:16px !important;
                    box-shadow:0 0 20px rgba(102,235,255,.13), 0 6px 16px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.74) !important;
                }
                .ts-feedback-actions button { min-width:0; }
                .ts-player-controls button { min-width:0; }

                @media (prefers-reduced-motion: reduce) {
                    .ts-console-shell::before,
                    .ts-console-screen::before,
                    .ts-enter-button,
                    .ts-nav-button,
                    .ts-next-best { animation:none !important; }
                    .ts-haptic { transition:none !important; }
                }

                @media (max-width: 760px) {
                    .ts-console-shell { border-radius: 18px !important; }
                    .ts-console-topbar { grid-template-columns: 38px minmax(0,1fr) auto !important; gap: 7px !important; padding: 7px 8px 7px !important; min-height:52px; }
                    .ts-centered-brand { max-width:calc(100% - 150px) !important; padding-left:4px !important; padding-right:4px !important; }
                    .ts-centered-brand .ts-title-word { font-size:clamp(11.5px, 3.2vw, 17px) !important; letter-spacing:-.12px !important; }
                    .ts-console-toggles { grid-column:auto !important; justify-content:flex-end !important; width:auto !important; gap:5px !important; }
                    .ts-console-screen { margin-left: 5px !important; margin-right: 5px !important; border-radius: 18px !important; }
                    .ts-scroll::-webkit-scrollbar { width:4px; }
                    .ts-nav-previous-wrap { left:6px !important; top:12px !important; }
                    .ts-nav-next-wrap { right:6px !important; top:12px !important; }
                    .ts-nav-button { width:44px !important; height:44px !important; }
                    .ts-console-inputrow input { min-width: 0; }
                    .ts-console-inputrow button { flex: 0 0 auto; }
                    .ts-composer-shell { border-radius:22px; padding:5px; gap:5px; }
                    .ts-composer-shell .ts-console-input { height:44px !important; }
                    .ts-composer-shell .ts-orb-button { width:42px !important; height:42px !important; }
                    .ts-composer-shell .ts-enter-button { min-width:86px !important; height:44px !important; padding-left:12px !important; padding-right:12px !important; }
                }

                @media (max-width: 520px) {
                    .ts-console-brand { padding:0 !important; }
                    .ts-centered-brand { max-width:calc(100% - 142px) !important; }
                    .ts-centered-brand .ts-title-word { font-size:clamp(10.5px, 3.35vw, 14px) !important; }
                    .ts-feedback-helper { grid-template-columns: 60px minmax(0,1fr) !important; gap: 11px !important; }
                    .ts-feedback-helper > div:first-child { width: 60px !important; height: 60px !important; border-radius: 15px !important; }
                    .ts-feedback-actions { grid-template-columns: repeat(3, minmax(0,1fr)) !important; gap: 6px !important; }
                    .ts-feedback-actions button { font-size: 11px !important; padding-left: 6px !important; padding-right: 6px !important; }
                    .ts-player-controls { grid-template-columns: 96px minmax(0,1fr) !important; }
                    .ts-player-controls button { min-height: 54px !important; }
                    .ts-console-inputrow { display:flex !important; }
                    .ts-composer-shell { gap:4px; padding:4px; border-radius:20px; }
                    .ts-composer-shell .ts-console-input { font-size:14px !important; padding-left:10px !important; padding-right:4px !important; }
                    .ts-composer-shell .ts-orb-button { width:38px !important; height:38px !important; font-size:17px !important; }
                    .ts-composer-shell .ts-enter-button { min-width:76px !important; height:40px !important; padding-left:9px !important; padding-right:9px !important; font-size:11px !important; }
                }
            `}</style>

            <motion.div
                className="ts-console-shell"
                style={{
                    width: "100%",
                    maxWidth: 1120,
                    height: "100%",
                    borderRadius: 23,
                    overflow: "hidden",
                    position: "relative",
                    border: "1px solid rgba(185,218,228,0.12)",
                    // v38.10.0 slab material: one dense surface; ritual light appears carved/revealed inside it.
                    background:
                        "radial-gradient(72% 42% at 50% -10%, rgba(105,196,218,0.060), transparent 66%), linear-gradient(155deg, rgba(28,39,47,0.998), rgba(11,17,23,1) 50%, rgba(4,8,11,1))",
                    backdropFilter: performanceMode ? "none" : "blur(12px) saturate(.86) contrast(1.035)",
                    WebkitBackdropFilter: performanceMode ? "none" : "blur(12px) saturate(.86) contrast(1.035)",
                    display: "flex",
                    flexDirection: "column",
                    animation: performanceMode
                        ? "none"
                        : "tsFrameGlow 9.2s ease-in-out infinite",
                    boxShadow:
                        "0 36px 94px rgba(0,0,0,0.72), 0 0 18px rgba(82,218,255,0.035), inset 0 1px 0 rgba(255,255,255,0.055), inset 0 -1px 0 rgba(0,0,0,.48), inset 0 0 0 1px rgba(255,255,255,.012)",
                }}
            >
                {/* TOP BAR — compact utilities, ritual stays dominant */}
                <div
                    className="ts-console-topbar"
                    style={{
                        zIndex: 10,
                        position: "relative",
                        padding: "9px 11px 9px",
                        minHeight: 56,
                        display: "grid",
                        gridTemplateColumns: "38px minmax(0, 1fr) auto",
                        gap: 8,
                        alignItems: "center",
                        borderBottom: "1px solid rgba(149,230,250,0.075)",
                        background:
                            "linear-gradient(180deg, rgba(255,255,255,0.020), rgba(255,255,255,0.003))",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,.035)",
                    }}
                >
                    {showClose ? (
                        <button
                            type="button"
                            className="ts-haptic ts-close-btn"
                            onPointerDown={() => burstTop.fire()}
                            onClick={handleClose}
                            aria-label="Close"
                            title="Close"
                            style={{
                                ...topIconBtn(performanceMode, uiFontFamily),
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                minWidth: 38,
                            }}
                        >
                            ×
                        </button>
                    ) : (
                        <div />
                    )}

                    <div
                        className="ts-console-brand"
                        style={{
                            position: "relative",
                            height: 38,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 0,
                            fontFamily: uiFontFamily,
                            pointerEvents: "none",
                        }}
                    />

                    <button
                        type="button"
                        className="ts-haptic ts-reset-console ts-centered-brand"
                        onClick={startNewQuest}
                        title="Reset console"
                        aria-label="Start a new ThinkStill reset"
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            zIndex: 2,
                            display: "inline-flex",
                            alignItems: "baseline",
                            justifyContent: "center",
                            gap: 6,
                            maxWidth: "calc(100% - 176px)",
                            padding: "7px 12px",
                            borderRadius: 14,
                            border: "1px solid transparent",
                            background: "transparent",
                            boxShadow: "none",
                            cursor: "pointer",
                            fontFamily: uiFontFamily,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        <span
                            className="ts-title-word"
                            style={{
                                fontSize: `clamp(15px, 1.9vw, ${Math.max(resetConsoleFontSize + 7, 19)}px)`,
                                fontWeight: 920,
                                letterSpacing: -0.18,
                                color: "rgba(244,252,255,.97)",
                                textShadow: "0 0 8px rgba(111,226,255,.10), 0 7px 20px rgba(0,0,0,.30)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {title} Reset Console
                        </span>
                    </button>

                    <div
                        className="ts-console-toggles"
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 5,
                            alignItems: "center",
                            flexWrap: "nowrap",
                            maxWidth: "100%",
                        }}
                    >
                        <ThemeToggle
                            value={chatTheme}
                            onChange={(v) => setChatTheme(v)}
                            uiFontFamily={uiFontFamily}
                        />
                    </div>
                </div>

                {/* OUTPUT PANEL */}
                <div
                    className="ts-console-screen"
                    style={{
                        position: "relative",
                        zIndex: 5,
                        flex: "1 1 auto",
                        margin: "0 10px",
                        marginBottom: 7,
                        borderRadius: 21,
                        border: "1px solid rgba(147,201,216,0.105)",
                        background:
                            "radial-gradient(86% 46% at 50% 0%, rgba(64,142,160,0.045), transparent 62%), linear-gradient(180deg, rgba(3,8,11,0.988), rgba(1,4,6,1))",
                        boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.022), inset 0 18px 42px rgba(0,0,0,0.16), inset 0 -1px 0 rgba(255,255,255,.008), 0 12px 28px rgba(0,0,0,0.24)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Transition media is rendered inside the scroll surface below,
                        never as an absolute layer over the ritual. */}

                    {/* Ritual surface begins immediately — no second HUD/header */}

                    {/* SCREEN HEADER — tabs + stage + save */}
                    <div
                        style={{
                            position: "relative",
                            zIndex: 3,
                            minHeight: 42,
                            padding: "5px 10px",
                            boxSizing: "border-box",
                            color: "rgba(245,249,255,0.82)",
                            fontWeight: 900,
                            fontSize: 14,
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: 10,
                            borderBottom: "1px solid rgba(156,226,247,0.05)",
                            background:
                                "linear-gradient(180deg, rgba(255,255,255,0.010), rgba(255,255,255,0.002))",
                            fontFamily: uiFontFamily,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                minWidth: 0,
                                flexWrap: "nowrap",
                            }}
                        >
                            <div
                                className="ts-command-segment"
                            >
                                <button
                                    type="button"
                                    className="ts-haptic ts-tab-button"
                                    onClick={() => setTab("ritual")}
                                    aria-pressed={tab === "ritual"}
                                    style={tabBtn(
                                        tab === "ritual",
                                        uiFontFamily
                                    )}
                                >
                                    RITUAL
                                </button>
                                <button
                                    type="button"
                                    className="ts-haptic ts-tab-button"
                                    onClick={() => setTab("saved")}
                                    aria-pressed={tab === "saved"}
                                    style={tabBtn(
                                        tab === "saved",
                                        uiFontFamily
                                    )}
                                >
                                    VAULT {saved.length}
                                </button>
                            </div>
                        </div>

                        <div
                            className="ts-console-header-actions"
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                justifyContent: "flex-end",
                                flexShrink: 0,
                            }}
                        >
                            <button
                                type="button"
                                className={`ts-haptic ts-save-button ${saveDone ? "ts-burst" : ""}`}
                                onPointerDown={() => burstSave.fire()}
                                onClick={() => saveCurrent()}
                                title="Save"
                                aria-label={saveDone ? "Saved to Vault" : "Save this win to Vault"}
                                disabled={
                                    !currentText ||
                                    tab !== "ritual" ||
                                    viewMode !== "ritual"
                                }
                                style={miniBtn(
                                    saveDone ? "on" : "off",
                                    uiFontFamily
                                )}
                            >
                                {saveDone ? "✓ SAVED" : "SAVE WIN"}
                            </button>
                        </div>
                    </div>

                    {/* Ritual viewport: scrolling content + FIXED overlay controls. */}
                    <div
                        style={{
                            position: "relative",
                            zIndex: 3,
                            flex: "1 1 auto",
                            minHeight: 0,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            ref={scrollRef}
                            className="ts-scroll"
                            style={{
                                position: "relative",
                                zIndex: 3,
                                width: "100%",
                                height: "100%",
                                minHeight: 0,
                                overflowY: "auto",
                                overflowX: "hidden",
                                // Keep the scroll track from shifting the ritual off-centre.
                                // Reserving a matching gutter on the left makes the ritual card
                                // and the fixed PREVIOUS/NEXT controls share the exact same centre.
                                scrollbarGutter: "stable both-edges",
                                padding: "18px clamp(8px, 2vw, 20px) 64px",
                                boxSizing: "border-box",
                                overscrollBehavior: "contain",
                                scrollPaddingTop: 18,
                            }}
                        >
                            {tab === "saved" ? (
                                <div style={{ display: "grid", gap: 10 }}>
                                    <div
                                        style={{
                                            borderRadius: 18,
                                            border: "1px solid rgba(164,231,251,.12)",
                                            background: "linear-gradient(180deg, rgba(111,226,255,.055), rgba(165,110,255,.025))",
                                            padding: "14px 15px",
                                            fontFamily: uiFontFamily,
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: "rgba(225,248,255,.90)",
                                                fontWeight: 950,
                                                fontSize: 11,
                                                letterSpacing: 1.05,
                                            }}
                                        >
                                            YOUR RESET DNA
                                        </div>
                                        {totalShiftRatings < 3 ? (
                                            <div
                                                style={{
                                                    marginTop: 7,
                                                    color: "rgba(220,234,240,.58)",
                                                    fontSize: 12.25,
                                                    lineHeight: 1.45,
                                                }}
                                            >
                                                Rate {Math.max(0, 3 - totalShiftRatings)} more reset{Math.max(0, 3 - totalShiftRatings) === 1 ? "" : "s"} to reveal what tends to feel most useful for you.
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                                                {resetDNAEntries.slice(0, 3).map((entry) => (
                                                    <div key={entry.family}>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                gap: 10,
                                                                marginBottom: 4,
                                                                color: "rgba(229,245,250,.76)",
                                                                fontSize: 10.6,
                                                                fontWeight: 850,
                                                            }}
                                                        >
                                                            <span>{entry.family}</span>
                                                            <span>{entry.percent}%</span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                height: 5,
                                                                borderRadius: 999,
                                                                overflow: "hidden",
                                                                background: "rgba(255,255,255,.055)",
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: `${Math.max(4, Math.min(100, entry.percent))}%`,
                                                                    height: "100%",
                                                                    borderRadius: 999,
                                                                    background: "linear-gradient(90deg, rgba(111,231,255,.76), rgba(205,139,255,.76))",
                                                                    boxShadow: "0 0 12px rgba(110,225,255,.12)",
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <div
                                                    style={{
                                                        color: "rgba(211,229,236,.46)",
                                                        fontSize: 9.8,
                                                        lineHeight: 1.45,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Based only on the resets you rated here — not a diagnosis or personality test.
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!saved.length ? (
                                        <div
                                            style={{
                                                color: "rgba(245,249,255,0.55)",
                                                fontWeight: 850,
                                                fontSize: 16,
                                                padding: "18px 8px",
                                            }}
                                        >
                                            ◇ VAULT EMPTY. Clear a ritual, then
                                            press “SAVE WIN”.
                                        </div>
                                    ) : (
                                        saved.map((s) => (
                                            <div
                                                key={s.id}
                                                style={{
                                                    borderRadius: 18,
                                                    border: "1px solid rgba(170,230,255,0.14)",
                                                    background:
                                                        "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(0,0,0,0.29))",
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
                                                                ] ||
                                                                    "Glitch"}{" "}
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
                                                        fontSize:
                                                            ritualBaseSize,
                                                        fontFamily:
                                                            ritualFontFamily,
                                                    }}
                                                >
                                                    <PremiumRitualText
                                                        text={s.text}
                                                        fontFamily={
                                                            ritualFontFamily
                                                        }
                                                        fontSize={
                                                            ritualBaseSize
                                                        }
                                                        bubble={
                                                            (
                                                                Object.keys(
                                                                    BUBBLE_TO_KEY
                                                                ) as BubbleSlug[]
                                                            ).find(
                                                                (slug) =>
                                                                    BUBBLE_TO_KEY[
                                                                        slug
                                                                    ] ===
                                                                    s.bubble
                                                            ) || "glitch"
                                                        }
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
                                                            setCurrentText(
                                                                s.text
                                                            )
                                                            setCurrentSig(s.sig)
                                                            setViewMode(
                                                                "ritual"
                                                            )
                                                            setRunKey(
                                                                `run-${Date.now()}-${makeSeed()}`
                                                            )
                                                            setHasTypedOnce(
                                                                !!typedSigMap[
                                                                    s.sig
                                                                ]
                                                            )
                                                            if (
                                                                typedSigMap[
                                                                    s.sig
                                                                ]
                                                            )
                                                                markTypedSig(
                                                                    s.sig
                                                                )
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

                                    {showOverlayTransition &&
                                    overlayTransition ? (
                                        <motion.div
                                            key={overlayTransition.eventKey}
                                            initial={{
                                                opacity: 0,
                                                scale: 0.985,
                                            }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 1.01 }}
                                            transition={{
                                                duration: 0.18,
                                                ease: "easeOut",
                                            }}
                                            style={{
                                                width: "100%",
                                                minHeight: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: "8px 0 18px",
                                                boxSizing: "border-box",
                                                position: "relative",
                                            }}
                                        >
                                            {showVideoDebug &&
                                            overlayTransition.isVideo ? (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        top: 10,
                                                        left: "50%",
                                                        transform:
                                                            "translateX(-50%)",
                                                        zIndex: 20,
                                                        maxWidth: "92%",
                                                        padding: "7px 10px",
                                                        borderRadius: 10,
                                                        border: "1px solid rgba(113,221,255,0.42)",
                                                        background:
                                                            "rgba(2,10,15,0.88)",
                                                        boxShadow:
                                                            "0 8px 30px rgba(0,0,0,0.34)",
                                                        backdropFilter:
                                                            "blur(8px)",
                                                        WebkitBackdropFilter:
                                                            "blur(8px)",
                                                        color: "rgba(230,249,255,0.96)",
                                                        fontFamily:
                                                            uiFontFamily,
                                                        textAlign: "center",
                                                        pointerEvents: "none",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 900,
                                                            letterSpacing:
                                                                "0.08em",
                                                            textTransform:
                                                                "uppercase",
                                                        }}
                                                    >
                                                        {
                                                            BUBBLE_LABEL[
                                                                overlayTransition
                                                                    .bubble
                                                            ]
                                                        }{" "}
                                                        • Video{" "}
                                                        {
                                                            overlayTransition.variant
                                                        }
                                                    </div>
                                                    <div
                                                        style={{
                                                            marginTop: 3,
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            opacity: 0.72,
                                                            whiteSpace:
                                                                "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow:
                                                                "ellipsis",
                                                        }}
                                                    >
                                                        {overlayFileLabel(
                                                            overlayTransition.url
                                                        )}
                                                    </div>
                                                </div>
                                            ) : null}
                                            <div
                                                style={{
                                                    width: `${overlaySizePct}%`,
                                                    maxWidth: 620,
                                                    aspectRatio: "1 / 1",
                                                    position: "relative",
                                                    overflow: overlayCropEnabled
                                                        ? "hidden"
                                                        : "visible",
                                                    borderRadius:
                                                        overlayCropEnabled
                                                            ? "50%"
                                                            : 22,
                                                    opacity: Math.max(
                                                        0,
                                                        Math.min(
                                                            1,
                                                            Number(
                                                                overlayOpacity ||
                                                                    0.92
                                                            )
                                                        )
                                                    ),
                                                    mixBlendMode:
                                                        overlayBlend as any,
                                                    filter:
                                                        !performanceMode &&
                                                        Number(
                                                            overlayBlur || 0
                                                        ) > 0
                                                            ? `blur(${Number(
                                                                  overlayBlur
                                                              )}px)`
                                                            : "none",
                                                    background:
                                                        "radial-gradient(circle at 50% 45%, rgba(22,68,83,0.22), rgba(1,5,8,0.72) 78%)",
                                                    boxShadow:
                                                        "0 20px 80px rgba(0,0,0,0.38)",
                                                }}
                                            >
                                                {overlayTransition.isVideo ? (
                                                    <video
                                                        key={`${overlayTransition.eventKey}-${overlayTransition.url}`}
                                                        src={
                                                            overlayTransition.url
                                                        }
                                                        autoPlay
                                                        muted
                                                        loop={
                                                            videoPlayTimeSeconds >
                                                            0
                                                        }
                                                        playsInline
                                                        preload="auto"
                                                        disablePictureInPicture
                                                        onPlaying={() =>
                                                            startVideoCutoff(
                                                                overlayTransition.eventKey
                                                            )
                                                        }
                                                        onEnded={() => {
                                                            // With a custom play time, loop keeps short clips alive
                                                            // until the Framer-set cutoff fires. With 0, natural end wins.
                                                            if (
                                                                videoPlayTimeSeconds <=
                                                                0
                                                            ) {
                                                                finishOverlayTransition(
                                                                    overlayTransition.eventKey
                                                                )
                                                            }
                                                        }}
                                                        onError={() =>
                                                            finishOverlayTransition(
                                                                overlayTransition.eventKey
                                                            )
                                                        }
                                                        onLoadedData={(e) => {
                                                            const v =
                                                                e.currentTarget as HTMLVideoElement
                                                            v.muted = true
                                                            v.defaultMuted = true
                                                            v.currentTime = 0
                                                            const playPromise =
                                                                v.play()
                                                            if (
                                                                playPromise &&
                                                                typeof (
                                                                    playPromise as any
                                                                ).catch ===
                                                                    "function"
                                                            ) {
                                                                ;(
                                                                    playPromise as any
                                                                ).catch(() =>
                                                                    finishOverlayTransition(
                                                                        overlayTransition.eventKey
                                                                    )
                                                                )
                                                            }
                                                        }}
                                                        style={{
                                                            display: "block",
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit:
                                                                overlayCropEnabled
                                                                    ? "cover"
                                                                    : "contain",
                                                            objectPosition:
                                                                "center center",
                                                            transform:
                                                                overlayCropEnabled
                                                                    ? `scale(${overlayCropScale})`
                                                                    : "none",
                                                            transformOrigin:
                                                                "center center",
                                                        }}
                                                    />
                                                ) : (
                                                    <img
                                                        src={
                                                            overlayTransition.url
                                                        }
                                                        alt=""
                                                        loading="eager"
                                                        decoding="async"
                                                        onError={() =>
                                                            finishOverlayTransition(
                                                                overlayTransition.eventKey
                                                            )
                                                        }
                                                        style={{
                                                            display: "block",
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit:
                                                                overlayCropEnabled
                                                                    ? "cover"
                                                                    : "contain",
                                                            objectPosition:
                                                                "center center",
                                                            transform:
                                                                overlayCropEnabled
                                                                    ? `scale(${overlayCropScale})`
                                                                    : "none",
                                                            transformOrigin:
                                                                "center center",
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : null}

                                    {viewMode === "prompt" && libStatus === "error" && libError ? (
                                        <div
                                            style={{
                                                maxWidth: 520,
                                                margin: "18px auto",
                                                padding: "0 16px",
                                                fontSize: 12.5,
                                                color: "rgba(255,214,190,.78)",
                                                whiteSpace: "pre-wrap",
                                                fontFamily: uiFontFamily,
                                                textAlign: "center",
                                            }}
                                        >
                                            {libError}
                                        </div>
                                    ) : null}

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

                                    {viewMode === "ritual" && (
                                        <div
                                            style={{
                                                width: "100%",
                                                maxWidth: 680,
                                                margin: "0 auto",
                                                position: "relative",
                                                color: textCol,
                                                fontSize: ritualBaseSize,
                                                fontFamily: ritualFontFamily,
                                            }}
                                        >
                                            <PremiumRitualText
                                                text={currentText}
                                                fontFamily={ritualFontFamily}
                                                fontSize={ritualBaseSize}
                                                bubble={activeBubble}
                                            />

                                            {currentMeta ? (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.34, delay: 0.46 }}
                                                    style={{
                                                        maxWidth: 640,
                                                        margin: "14px auto 0",
                                                        padding: "14px 14px 13px",
                                                        borderRadius: 18,
                                                        border: "1px solid rgba(161,229,249,.10)",
                                                        background: "linear-gradient(180deg, rgba(255,255,255,.035), rgba(0,0,0,.18))",
                                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,.035), 0 10px 28px rgba(0,0,0,.18)",
                                                        fontFamily: uiFontFamily,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            textAlign: "center",
                                                            color: "rgba(227,242,248,.72)",
                                                            fontSize: 10.5,
                                                            fontWeight: 900,
                                                            letterSpacing: .9,
                                                            marginBottom: 9,
                                                        }}
                                                    >
                                                        DID IT SHIFT?
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: "grid",
                                                            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                                                            gap: 7,
                                                        }}
                                                    >
                                                        {[
                                                            [0, "NOT YET"],
                                                            [1, "A LITTLE"],
                                                            [2, "YES"],
                                                            [3, "A LOT"],
                                                        ].map(([value, label]) => {
                                                            const selected = currentShiftRating === value
                                                            return (
                                                                <button
                                                                    key={String(value)}
                                                                    type="button"
                                                                    className="ts-haptic"
                                                                    onClick={() => rateCurrentShift(Number(value))}
                                                                    aria-pressed={selected}
                                                                    style={{
                                                                        minHeight: 38,
                                                                        padding: "0 5px",
                                                                        borderRadius: 12,
                                                                        border: selected
                                                                            ? "1px solid rgba(154,237,255,.68)"
                                                                            : "1px solid rgba(159,226,246,.10)",
                                                                        background: selected
                                                                            ? "linear-gradient(180deg, rgba(118,229,255,.24), rgba(174,122,255,.14))"
                                                                            : "rgba(255,255,255,.025)",
                                                                        color: selected
                                                                            ? "rgba(239,252,255,.98)"
                                                                            : "rgba(222,238,244,.62)",
                                                                        fontFamily: uiFontFamily,
                                                                        fontWeight: 900,
                                                                        fontSize: 9.2,
                                                                        letterSpacing: .36,
                                                                        cursor: "pointer",
                                                                        boxShadow: selected
                                                                            ? "0 0 0 1px rgba(124,225,255,.08), 0 0 18px rgba(103,219,255,.08)"
                                                                            : "none",
                                                                    }}
                                                                >
                                                                    {selected ? `✓ ${label}` : label}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>

                                                    {shiftConfirmation ? (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 3 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            key={`${currentSig}-${currentShiftRating}`}
                                                            style={{
                                                                marginTop: 8,
                                                                textAlign: "center",
                                                                color: "rgba(181,238,250,.74)",
                                                                fontSize: 9.1,
                                                                fontWeight: 850,
                                                                letterSpacing: .45,
                                                            }}
                                                        >
                                                            ✓ {shiftConfirmation}
                                                        </motion.div>
                                                    ) : null}

                                                    <div
                                                        style={{
                                                            marginTop: 11,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            gap: 10,
                                                            flexWrap: "wrap",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                color: "rgba(210,231,239,.54)",
                                                                fontSize: 10.25,
                                                                fontWeight: 760,
                                                                letterSpacing: .2,
                                                            }}
                                                        >
                                                            {Number(currentMeta.totalCount || 0) > 0 && Number(currentMeta.usedCount || 0) > 0
                                                                ? `${Math.max(0, Number(currentMeta.totalCount) - Number(currentMeta.usedCount))} unseen reset${Math.max(0, Number(currentMeta.totalCount) - Number(currentMeta.usedCount)) === 1 ? "" : "s"} remain${Number(currentMeta.cycle || 1) > 1 ? " in this cycle" : ""}.`
                                                                : "A different mechanism is waiting when you need it."}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="ts-haptic"
                                                            onClick={shareCurrentReveal}
                                                            disabled={shareState === "working"}
                                                            style={{
                                                                minHeight: 38,
                                                                padding: "0 14px",
                                                                borderRadius: 999,
                                                                border: "1px solid rgba(174,229,255,.16)",
                                                                background: "linear-gradient(90deg, rgba(92,218,255,.10), rgba(189,108,255,.09))",
                                                                color: "rgba(238,251,255,.94)",
                                                                fontFamily: uiFontFamily,
                                                                fontWeight: 930,
                                                                fontSize: 10.2,
                                                                letterSpacing: .46,
                                                                cursor: shareState === "working" ? "progress" : "pointer",
                                                                opacity: shareState === "working" ? .72 : 1,
                                                            }}
                                                        >
                                                            {shareState === "working"
                                                                ? "MAKING CARD…"
                                                                : shareState === "done"
                                                                  ? "✓ SHARED"
                                                                  : shareState === "fallback"
                                                                    ? "✓ CARD + LINK READY"
                                                                    : "SHARE REVEAL"}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ) : null}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {tab === "ritual" && viewMode === "ritual" ? (
                            <RitualPlayerNav
                                uiFontFamily={uiFontFamily}
                                bubble={activeBubble}
                                avatarUrl={shownAvatar}
                                avatarBroken={avatarBroken}
                                onAvatarError={() => setAvatarBroken(true)}
                                onPrevious={goPreviousRitual}
                                onNext={goNextRitual}
                                canPrevious={ritualHistoryIndex > 0}
                                isBusy={isThinking || viewMode === "transition"}
                                avatarSize={avatarSize}
                                avatarX={avatarX}
                                avatarY={avatarY}
                            />
                        ) : null}
                    </div>
                </div>

                {/* PLAYER / INPUT ROW (safe-area padding) */}
                <div
                    className="ts-console-deck"
                    style={{
                        zIndex: 10,
                        marginTop: 0,
                        paddingLeft: 10,
                        paddingRight: 10,
                        paddingTop: 0,
                        paddingBottom: `calc(10px + env(safe-area-inset-bottom))`,
                        borderTop: "1px solid rgba(151,225,246,0.055)",
                        background:
                            "linear-gradient(180deg, rgba(8,15,21,0.08), rgba(8,15,21,0.46))",
                    }}
                >
                    <div
                        className="ts-console-inputrow ts-composer-shell"
                    >
                        <input
                            className="ts-console-input"
                            ref={inputElRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault()
                                    sendMessage()
                                }
                            }}
                            placeholder="Tell me what’s happening…"
                            style={inputStyle(
                                textCol,
                                uiFontFamily,
                                performanceMode
                            )}
                        />

                        <button
                            type="button"
                            className="ts-haptic ts-orb-button ts-music-button"
                            onPointerDown={() => burstMusic.fire()}
                            onClick={() => {
                                markGesture()
                                setMusicOn((v: boolean) => !v)
                            }}
                            title={musicOn ? "Music: On" : "Music: Off"}
                            aria-label={
                                musicOn ? "Turn music off" : "Turn music on"
                            }
                            aria-pressed={musicOn}
                            style={{
                                ...pillBtn(
                                    musicOn,
                                    performanceMode,
                                    uiFontFamily
                                ),
                                fontSize: 20,
                            }}
                        >
                            ♪
                        </button>

                        <button
                            type="button"
                            className="ts-haptic ts-orb-button ts-mic-button"
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
                            aria-label={
                                speechSupported
                                    ? isListening
                                        ? "Stop microphone"
                                        : "Start microphone"
                                    : "Microphone unavailable"
                            }
                            aria-pressed={speechSupported ? isListening : false}
                            style={pillBtn(
                                speechSupported && isListening,
                                performanceMode,
                                uiFontFamily
                            )}
                        >
                            <svg
                                aria-hidden="true"
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{
                                    display: "block",
                                    width: 17,
                                    height: 17,
                                    flex: "0 0 auto",
                                    margin: 0,
                                    pointerEvents: "none",
                                }}
                            >
                                <path
                                    d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M6.5 11.5V12a5.5 5.5 0 0 0 11 0v-.5M12 17.5V21M9 21h6"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>

                        <button
                            type="button"
                            className="ts-haptic ts-enter-button"
                            onPointerDown={() => burstSend.fire()}
                            onClick={() => sendMessage()}
                            title="Enter ritual"
                            disabled={isThinking || viewMode === "transition"}
                            style={{
                                ...sendBtn(performanceMode, uiFontFamily),
                                minWidth: 100,
                                padding: "0 17px",
                                opacity:
                                    isThinking || viewMode === "transition"
                                        ? 0.6
                                        : 1,
                                fontSize: 12,
                                letterSpacing: 0.5,
                            }}
                        >
                            ENTER
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
    resetConsoleFontSize: {
        type: ControlType.Number,
        title: "RESET Font Size",
        min: 8,
        max: 30,
        step: 1,
        defaultValue: 12,
        unit: "px",
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
    shareBaseUrl: {
        type: ControlType.String,
        title: "Share Base URL",
        placeholder: "https://your-production-url",
        description: "Optional production URL used in SHARE REVEAL deep links. Leave blank to use the current page URL.",
    },

    manifestUrl: {
        type: ControlType.String,
        title: "Manifest URL",
        defaultValue: "",
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
        title: "Start Video #",
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 1,
    },
    overlayOpacity: {
        type: ControlType.Number,
        title: "Video Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.92,
    },
    overlayTransitionMs: {
        type: ControlType.Number,
        title: "Image Hold Time",
        min: 500,
        max: 6000,
        step: 100,
        defaultValue: 1800,
        unit: "ms",
    },
    overlayVideoPlaySeconds: {
        type: ControlType.Number,
        title: "Video Play Time",
        min: 0,
        max: 30,
        step: 0.5,
        defaultValue: 3,
        unit: "s",
        description:
            "Exact video-screen time before the ritual appears. 0 = play the full source video once. Short clips loop to fill the selected time.",
    },
    overlayPreloadEnabled: {
        type: ControlType.Boolean,
        title: "Preload Videos",
        defaultValue: true,
        description:
            "Loads the next scheduled transition clip for all 7 bubbles in the background so ENTER does not wait for the selected video to download.",
    },
    showVideoDebug: {
        type: ControlType.Boolean,
        title: "Show Video Debug",
        defaultValue: false,
        description:
            "Testing only. Shows the routed bubble, Video 1–5 slot and filename on the transition screen, and logs the exact file URL in the browser console.",
    },
    overlayTransitionsEnabled: {
        type: ControlType.Boolean,
        title: "Video Before Ritual",
        defaultValue: true,
    },
    overlayBlend: {
        type: ControlType.Enum,
        title: "Video Blend",
        options: ["screen", "overlay", "soft-light", "normal", "lighten"],
        defaultValue: "normal",
    },
    overlayBlur: {
        type: ControlType.Number,
        title: "Video Blur",
        min: 0,
        max: 12,
        step: 1,
        defaultValue: 0,
    },
    overlaySize: {
        type: ControlType.Number,
        title: "Video Size",
        min: 20,
        max: 140,
        step: 1,
        defaultValue: 72,
        unit: "%",
    },
    overlayCropEnabled: {
        type: ControlType.Boolean,
        title: "Circular Crop",
        defaultValue: true,
    },
    overlayCropZoom: {
        type: ControlType.Number,
        title: "Crop Zoom",
        min: 100,
        max: 300,
        step: 1,
        defaultValue: 115,
        unit: "%",
    },
    allowOverlayVideoInPerf: {
        type: ControlType.Boolean,
        title: "Video in Perf Mode",
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
        title: "Avatar X Position",
        min: -500,
        max: 500,
        step: 1,
        defaultValue: 0,
    },
    avatarY: {
        type: ControlType.Number,
        title: "Avatar Y Position",
        min: -500,
        max: 500,
        step: 1,
        defaultValue: 0,
    },
    avatarSize: {
        type: ControlType.Number,
        title: "Avatar Size",
        min: 32,
        max: 240,
        step: 1,
        defaultValue: 72,
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
