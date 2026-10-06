// ===================================================================================
// EOS · 00 CORE — the FROZEN shared contract for every src/eos/*.jsx module.
// Spec: docs/EOS_SPEC.md §11.0. Owned by the lead / integrator. Module and game tasks
// must NOT edit this file; if you need a change, say so in your final report.
// Rules for every eos module: no import lines (one shared file scope with 00_arcade.jsx),
// every top-level identifier starts with Eos / EOS_ / eos, and never touch PX_B /
// pxNoise / PIXAR_CSS at module top level (99_pixar.jsx is evaluated after eos/*).
// ===================================================================================

const EOS_VERSION = "1.0.0"

// ID-boosted selector roots: (3,1,0) beats every `.tsArcade … !important` rule in the
// arcade and Pixar's PX_B (2 ids), regardless of <style> order.
const EOS_A = ".tsArcade:not(#eosA):not(#eosB):not(#eosC)"
const EOS_PX = ".tsPixarRoot:not(#eosA):not(#eosB):not(#eosC)" // .tsPxRig lives beside .tsArcade

// ---------------------------------------------------------------- storage (eos_*)
const EOS_KEYS = {
    sessions: "eos_sessions_v1", // [{t, emo, before, after, gameId, ms, act}]  (cap 300, never user text)
    orbs: "eos_orbs_v1", //         [{t, emo, char, face, tier, before, after, gameId}]
    days: "eos_days_v1", //         ["2026-10-06", …] days with ≥1 completed loop (cap 60)
    learned: "eos_learned_v1", //   {gameId: completions} — arrows go quiet for veterans
    bonds: "eos_bonds_v1", //       {sync: 3, rush: 1, …} completed loops per character
    prefs: "eos_prefs_v1", //       {checkin: true, shareWords: false, enrich: true}
    pending: "eos_pending_v1", //   reserved
}
function eosGet(key, fallback) {
    try {
        if (typeof localStorage === "undefined") return fallback
        const v = localStorage.getItem(key)
        return v == null ? fallback : JSON.parse(v)
    } catch {
        return fallback
    }
}
function eosSet(key, value) {
    try {
        if (typeof localStorage !== "undefined")
            localStorage.setItem(key, JSON.stringify(value))
    } catch {}
}
function eosSessions() {
    const v = eosGet(EOS_KEYS.sessions, [])
    return Array.isArray(v) ? v : []
}
function eosPushSession(rec) {
    // rec = {emo, before, after, gameId, ms, act}; t is added here. NEVER pass user text.
    const clean = {
        t: Date.now(),
        emo: String(rec?.emo || "general"),
        before: Number.isFinite(+rec?.before) ? +rec.before : null,
        after: Number.isFinite(+rec?.after) ? +rec.after : null,
        gameId: Number(rec?.gameId) || 0,
        ms: Math.max(0, Math.round(+rec?.ms || 0)),
        act: Number(rec?.act) || 1,
    }
    const list = eosSessions().concat([clean]).slice(-300)
    eosSet(EOS_KEYS.sessions, list)
    const day = new Date().toISOString().slice(0, 10)
    const days = eosGet(EOS_KEYS.days, [])
    if (Array.isArray(days) && !days.includes(day))
        eosSet(EOS_KEYS.days, days.concat([day]).slice(-60))
    return clean
}

// ---------------------------------------------------------------- CSS registry
// Every module registers its CSS once at top level: eosCss("arrows", EOS_ARROWS_CSS).
// <EosGlobalStyle/> (mounted by integration edit I1) renders all parts in insertion order.
const EOS_CSS_PARTS = new Map()
function eosCss(name, css) {
    EOS_CSS_PARTS.set(String(name), String(css || ""))
    return css
}
function EosGlobalStyle() {
    const css = Array.from(EOS_CSS_PARTS.values()).join("\n")
    return <style data-eos="global">{css}</style>
}

// ---------------------------------------------------------------- dev handle
// Tests read module APIs through window.__eos (e.g. window.__eos.router.EosRouteGame).
const EOS_DEV = { version: EOS_VERSION }
function eosExpose(name, api) {
    EOS_DEV[name] = api
    try {
        if (typeof window !== "undefined") window.__eos = EOS_DEV
    } catch {}
    return api
}

// ---------------------------------------------------------------- emotions (12 states)
// char/loud/calm → emotionSrc(char, mood) (all 24 faces verified HTTP 200).
// profile → id in RELEASE_INPUT_EMOTION_PROFILES (or "general"); drives arcade copy/spark names.
// starter → used only when the user gives no words (≥6 tokens, contains a word the
// existing profile regex matches), shown editable in the composer.
const EOS_EMOTIONS = [
    { id: "panic", label: "PANIC", sub: "heart racing", char: "sync", loud: 44, calm: 90, hue: 195, meter: "SLOW-DOWN", spark: "CALM", profile: "panic", primary: true,
      starter: "panic racing heart what if cant breathe right now" },
    { id: "anger", label: "ANGRY", sub: "boiling over", char: "rush", loud: 29, calm: 44, hue: 355, meter: "COOL-DOWN", spark: "COOL", profile: "anger", primary: true,
      starter: "so angry it feels unfair and nobody listens" },
    { id: "anxiety", label: "ANXIOUS", sub: "what-ifs", char: "glitch", loud: 15, calm: 10, hue: 265, meter: "GROUND", spark: "GROUND", profile: "fear", primary: true,
      starter: "nervous what if it all goes wrong tomorrow" },
    { id: "overthinking", label: "OVERTHINKING", sub: "on a loop", char: "loopie", loud: 58, calm: 70, hue: 285, meter: "UNLOOP", spark: "CLEAR", profile: "rumination", primary: true,
      starter: "overthinking the same thought on replay all night" },
    { id: "overwhelm", label: "OVERWHELMED", sub: "too much", char: "sync", loud: 48, calm: 61, hue: 210, meter: "MAKE SPACE", spark: "SPACE", profile: "overwhelm", primary: true,
      starter: "overwhelmed too much to do and no time" },
    { id: "sad", label: "SAD", sub: "heavy", char: "drop", loud: 58, calm: 3, hue: 215, meter: "LIGHTEN", spark: "LIGHT", profile: "sadness", primary: true,
      starter: "sad heavy heart missing how things were" },
    { id: "lonely", label: "LONELY", sub: "on my own", char: "drop", loud: 70, calm: 8, hue: 228, meter: "CONNECT", spark: "WARMTH", profile: "sadness", primary: true,
      starter: "lonely nobody really gets me right now" },
    { id: "shame", label: "ASHAMED", sub: "not enough", char: "patch", loud: 73, calm: 72, hue: 28, meter: "SELF-KIND", spark: "KIND", profile: "general", primary: true,
      starter: "ashamed I messed up and feel not enough" },
    { id: "fear", label: "SCARED", sub: "dread", char: "glitch", loud: 11, calm: 7, hue: 250, meter: "BRAVE", spark: "BRAVE", profile: "fear", primary: false,
      starter: "scared of what might happen next week" },
    { id: "jealous", label: "JEALOUS", sub: "comparing", char: "patch", loud: 70, calm: 11, hue: 96, meter: "OWN GLOW", spark: "GLOW", profile: "general", primary: false,
      starter: "jealous they have it and I am behind" },
    { id: "numb", label: "NUMB", sub: "flat · empty", char: "sync", loud: 34, calm: 34, hue: 180, meter: "WAKE-UP", spark: "SPARK", profile: "general", primary: false, greyLoud: true,
      starter: "numb flat empty nothing feels like anything" },
    { id: "good", label: "GOOD", sub: "bank it", char: "still", loud: 61, calm: 90, hue: 48, meter: "SAVOUR", spark: "JOY", profile: "general", primary: false,
      starter: "good moment I want to keep this feeling" },
]
const EOS_EMO = Object.fromEntries(EOS_EMOTIONS.map((e) => [e.id, e]))
const EOS_GUIDE_CHAR = { char: "still", loud: 41, calm: 15 } // STILL narrates / "NOT SURE" orb

function eosFace(char, mood) {
    return emotionSrc(String(char || "still"), Number(mood) || 41)
}
function eosFaceFor(emotionId, which = "loud") {
    const e = EOS_EMO[emotionId]
    if (!e) return eosFace(EOS_GUIDE_CHAR.char, which === "calm" ? EOS_GUIDE_CHAR.calm : EOS_GUIDE_CHAR.loud)
    return eosFace(e.char, which === "calm" ? e.calm : e.loud)
}

// ---------------------------------------------------------------- session store
// Tiny external store (React 18 useSyncExternalStore). Plain functions can read/write it from
// any arcade callback with no dependency-array edits.
const EOS_STORE_INITIAL = {
    phase: "checkin", // "checkin" | "skip" | "play" | "meter"
    emotion: null, //    EOS_EMOTIONS id or null
    sub: null, //        optional sub-tag ("choice", …)
    before: null, //     0-10 intensity at check-in (null = unknown)
    after: null, //      0-10 after the game
    source: null, //     "checkin" | "detect" | null
    launchAt: 0, //      ms timestamp the current game started
    finishAt: 0, //      ms timestamp the current game finished (reveal)
    gameId: 0, //        current/last game id
    act: 1, //           1 = first game of this feeling, 2+ = follow-up
    path: [], //         game ids played for this feeling (this session)
    safety: null, //     null | "selfharm" | "abuse" | "soft"
    safetyDismissed: false,
    loops: 0, //         completed loops this app session (for the gentle exit ramp)
    sessionStart: 0,
    sessionSeed: 1,
    sound: true,
    haptics: true,
    crisisLines: "", //  Framer prop (EosConfigSync)
    crisisUrl: "",
    shareUrl: "",
}
const EOS_STORE = (() => {
    let state = { ...EOS_STORE_INITIAL, sessionStart: Date.now(), sessionSeed: (Date.now() % 100003) + 1 }
    const subs = new Set()
    const emit = () => subs.forEach((f) => { try { f() } catch {} })
    return {
        get: () => state,
        set(patch) {
            const next = typeof patch === "function" ? patch(state) : patch
            if (!next) return
            let changed = false
            for (const k in next) if (state[k] !== next[k]) { changed = true; break }
            if (!changed) return
            state = { ...state, ...next }
            emit()
        },
        // Back to a fresh check-in; keeps app-session facts (loops, seeds, props, sound).
        resetFeeling() {
            const keep = ["loops", "sessionStart", "sessionSeed", "sound", "haptics", "crisisLines", "crisisUrl", "shareUrl", "safety", "safetyDismissed"]
            const next = { ...EOS_STORE_INITIAL }
            keep.forEach((k) => { next[k] = state[k] })
            state = next
            emit()
        },
        subscribe(f) {
            subs.add(f)
            return () => subs.delete(f)
        },
    }
})()
function useEosStore() {
    return React.useSyncExternalStore(EOS_STORE.subscribe, EOS_STORE.get, EOS_STORE.get)
}

// ---------------------------------------------------------------- engines (new games 111+)
const EOS_ENGINES = {}
function EosEngineFor(game) {
    const id = Number(game && game.id) || 0
    return id >= 111 ? EOS_ENGINES[id] || null : null
}
// def = full GAMES entry (all 15 fields, strings; engine "E04" ⇒ explicit progress).
// opts = { hint, mindBend, css }.
function eosRegisterGame(def, Engine, opts = {}) {
    if (!def || !def.id || typeof Engine !== "function") return
    if (!GAMES.some((g) => g.id === def.id)) GAMES.push(def)
    EOS_ENGINES[def.id] = Engine
    if (opts.hint) {
        SHORT_ACTION[def.id] = opts.hint
        SHORT_HINT[def.id] = opts.hint
    }
    if (opts.mindBend) RELEASE_MIND_BEND[def.id] = opts.mindBend
    if (opts.css) eosCss(`game-${def.id}`, opts.css)
}

// ---------------------------------------------------------------- arrow contract helper
// Spread onto the element the player must touch NOW; move it as the target changes.
// g ∈ tap|taps|hold|holdRelease|drag|dragTo|swipe|sling|slow|scrub|choose|seq|timing|alt|wait|type
function eosTarget(spec) {
    if (!spec) return {}
    const out = { "data-eos-target": "1", "data-eos-g": spec.g || "tap" }
    if (spec.dir) out["data-eos-dir"] = spec.dir
    if (spec.d != null) out["data-eos-d"] = String(spec.d)
    if (spec.n != null) out["data-eos-n"] = String(spec.n)
    if (spec.ms != null) out["data-eos-ms"] = String(spec.ms)
    if (spec.to) out["data-eos-to"] = spec.to
    if (spec.bpm != null) out["data-eos-bpm"] = String(spec.bpm)
    if (spec.label) out["data-eos-label"] = spec.label
    return out
}

// ---------------------------------------------------------------- small helpers
function eosNoise(i, salt = 0) {
    return noveltyNoise(Number(i) + 1, Number(salt) + 7)
}
function eosClamp(n, a, b) {
    return Math.max(a, Math.min(b, Number(n) || 0))
}
function eosHaptic(pattern = 8) {
    if (!EOS_STORE.get().haptics) return
    vibrate(pattern)
}
// Unique, readable chunks of the user's words (no "UPLOADED IMAGE" sentinels, no repeats).
// Pads with the checked-in emotion's starter words so a game never shows "I / I / I".
function eosWords(entries, n = 6) {
    const seen = new Set()
    const out = []
    for (const e of entries || []) {
        const t = displayText(e, 22)
        const k = t.toLowerCase()
        if (t && !seen.has(k)) {
            seen.add(k)
            out.push(t)
        }
    }
    const want = Math.min(n, 3)
    if (out.length < want) {
        const emo = EOS_EMO[EOS_STORE.get().emotion]
        const pool = String(emo ? emo.starter : "breathe slow soft easy light calm").split(/\s+/)
        for (let i = 0; i + 1 < pool.length && out.length < want; i += 2) {
            const t = `${pool[i]} ${pool[i + 1]}`
            if (!seen.has(t)) {
                seen.add(t)
                out.push(t)
            }
        }
    }
    return out.slice(0, n)
}
// The user's own words on any EOS object. Sized by the ID-boosted rule below (the arcade
// wrapper may tag it .tsExactUserText; our rule still wins).
function EosWord({ text, className = "", style }) {
    if (!text) return null
    return (
        <span className={`eosWord ${className}`} style={style} title={String(text)}>
            {text}
        </span>
    )
}

const EOS_EASE = {
    pop: [0.3, 1.6, 0.4, 1],
    out: [0.2, 0.8, 0.2, 1],
    spring: { type: "spring", stiffness: 420, damping: 18 },
}

const EOS_CORE_CSS = `
${EOS_A}{--eos-fs-xs:12px;--eos-fs-sm:13px;--eos-fs-md:15px;--eos-fs-num:17px;--eos-fs-word:clamp(16px,1.35vw,20px);--eos-fs-hero:clamp(30px,4vw,48px);
--eos-gold-1:#FFE58A;--eos-gold-2:#FFB23E;--eos-gold-3:#FF8A2E;--eos-still:#7DE3FF;--eos-ink:#0E0C2E;--eos-glass:rgba(10,12,40,.86)}
@media (max-width:560px){${EOS_A}{--eos-fs-sm:12px;--eos-fs-md:14px;--eos-fs-num:15px;--eos-fs-word:15px}}
${EOS_A} .eosWord{display:inline-block;max-width:100%;font:900 var(--eos-fs-word)/1.05 "Baloo 2",Inter,system-ui,sans-serif!important;color:#fff!important;letter-spacing:.01em!important;text-shadow:0 2px 8px rgba(0,0,0,.65)!important;overflow-wrap:anywhere!important;white-space:normal!important;opacity:1!important;-webkit-text-stroke:0!important}
${EOS_A} .eosArena{position:relative;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none}
${EOS_A} .eosArena button{font-family:"Baloo 2",Inter,system-ui,sans-serif}
@keyframes eosPulse{0%,100%{opacity:.7;scale:.96}50%{opacity:1;scale:1.04}}
@keyframes eosPop{0%{scale:.6;opacity:0}60%{scale:1.08;opacity:1}100%{scale:1}}
`
eosCss("core", EOS_CORE_CSS)

eosExpose("core", {
    EOS_STORE,
    EOS_EMOTIONS,
    EOS_EMO,
    EOS_KEYS,
    EOS_ENGINES,
    eosSessions,
    eosPushSession,
    eosWords,
    eosFaceFor,
    cssParts: () => Array.from(EOS_CSS_PARTS.keys()),
})
