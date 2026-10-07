// ===================================================================================
// EOS · 00 CORE — the FROZEN shared contract for every src/eos/*.jsx module.
// Spec: docs/EOS_SPEC.md §0 (contract) + §12 (build plan). Owned by the lead / foundation.
// Module and game tasks must NOT edit this file; if you need a change, say so in your report.
// Rules for every eos module:
//   * no import lines and no `export` lines (one shared file scope with 00_arcade.jsx, evaluated after it);
//   * every new top-level identifier starts with your task namespace: Eos<Task> / EOS_<TASK>_ / eos<Task>
//     (core owns the bare Eos / EOS_ / eos names below); keyframes are eos<Task><Name>; eosCss key = task id;
//   * never touch PX_B / pxNoise / PIXAR_CSS / PX_SQUASH_TARGETS at module top level
//     (99_pixar.jsx is evaluated AFTER src/eos/*, so its consts are in TDZ here);
//   * no window/document/localStorage access at module top level without a guard;
//   * never store anything the user typed (only emotion ids, numbers, game ids);
//   * never use regex lookbehind assertions: a parse-time SyntaxError on iOS Safari < 16.4 kills all 110 games
//     (build.py rejects them).
// Calling another eos module: use eosApi("name").fn?.(...) or `typeof EosFoo === "function"`
// so isolated builds (only core + your files) never throw a ReferenceError.
// v1.2.0: critique fixes (docs/EOS_SPEC.md §13): per-emotion dial/flip/grade/dial words, wider lexicon,
// safety lexicon + scan + neutral words in core, breath/beat pacer clock, calm haptics, dial digit buffer,
// dev-only window.__eos, a11y/arena/safe-area CSS, retro + keepHistory session rows, win-face pool.
// v1.2.1 (foundation, FROZEN from here on for module builders):
//   * `.eosArena button` starts as a clean shell — the arcade skins EVERY `.arena button` with !important
//     (neon gradient, border, glow, text-shadow, a 180 ms transform transition that lags framer-motion);
//     see the CSS comment at EOS_CORE_CSS for how a game styles its own buttons;
//   * EosCharacterOrb carries data-eos-emotion / data-eos-char (stable test + CSS hooks);
//   * useEosProgress(rootRef) — one shared, self-cleaning 4 Hz progress poll for overlays (mood, companion, …);
//   * eosRegisterGame warns (dev only) about missing GAMES fields, duplicate ids/names, a bad gesture, ids < 111;
//   * EosEnginePreview: `seed` prop + live §8.0 engine-contract checks on window.__eosPreview.checks
//     (dev/eos_preview.* sets emotion / before / safety / calm from URL params before the first render);
//   * eosDayPart() / eosLateNight(): one local-time rule for games (dawn/day/dusk/night palettes), mood, router;
//   * window.__eos.core exposes every transition and table the test harness (dev/eos_drive.mjs) reads.
// ===================================================================================

const EOS_VERSION = "1.2.1"

// ID-boosted selector roots: (3,1,0) beats every `.tsArcade … !important` rule in the
// arcade and Pixar's PX_B (2 ids), regardless of <style> order.
const EOS_A = ".tsArcade:not(#eosA):not(#eosB):not(#eosC)"
const EOS_PX = ".tsPixarRoot:not(#eosA):not(#eosB):not(#eosC)" // .tsPxRig lives beside .tsArcade

// Stacking inside the .releaseStage stacking context (.releaseCompleteOverlay is z 160 there;
// the composer is OUTSIDE .releaseStage at z 240 and is never covered).
const EOS_Z = {
    flow: 0, //          EosThoughtFlow (first child; paints under everything in the stage)
    checkin: 30, //      EosCheckIn overlay (input stage)
    checkinChip: 32, //  EosCheckInChip (must beat the opaque .releaseIdleStage)
    mood: 54, //         EosMoodGrade (play; above the game host z 2, pointer-events none)
    companion: 55,
    guards: 58, //       EosLegacyGuards "almost!" layer
    arrows: 60, //       EosGuideArrows / EosHandHint
    worldChips: 170, //  above the reveal overlay (z 160)
    shelf: 220, //       EosOrbShelf
    safety: 230, //      EosSafetyCard + support pill (top of everything inside the stage)
}

// ---------------------------------------------------------------- dev gate (privacy, §0.1)
// window.__eos / __eosPreview / __eosArrowMiss exist ONLY in dev (file://, localhost, ?eosdev=1),
// so analytics / session-replay scripts on a published Framer site can never read the emotional state.
function eosIsDev() {
    try {
        if (typeof location === "undefined") return false
        return location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]eosdev=1\b/.test(location.search)
    } catch {
        return false
    }
}

// ---------------------------------------------------------------- storage (eos_*)
const EOS_KEYS = {
    sessions: "eos_sessions_v1", // [{t, emo, before, after, gameId, ms, act, retro}]  (cap 300, never user text)
    orbs: "eos_orbs_v1", //         [{t, emo, char, face, tier, before, after, gameId}]   (rewards module)
    days: "eos_days_v1", //         ["2026-10-06", …] local days with ≥1 finished game (cap 400)
    learned: "eos_learned_v1", //   {gameId: completions} — arrows go quiet for veterans
    bonds: "eos_bonds_v1", //       {sync: 3, rush: 1, …} loops each character appeared in (rewards module)
    prefs: "eos_prefs_v1", //       see EOS_PREF_DEFAULTS
    pending: "eos_pending_v1", //   reserved
}
const EOS_PREF_DEFAULTS = {
    shareWords: false, //  the share card never shows typed words (no UI to turn on in this build)
    enrich: true, //       EosEntries pads short inputs with the emotion's seed phrases
    keepHistory: true, //  false → no session / orb rows are written (shelf toggle, §9.3)
    calmVisuals: false, // "◐ calm visuals": every EOS surface behaves as reduced motion (§5.2, §6.2)
    dust: "default", //    cosmetic Thought-Dust style unlocked by ⚡ milestones (§9.2)
    namedOnce: false, //   first-use micro-copy shown
    metOnce: false, //     "Meet RUSH, your anger." intro shown
    micNoted: false, //    "Voice typing uses your browser's speech service." shown
    coldOpen: false, //    first-run STILL intro shown
    speak: false, //       116 SQUEAKY THOUGHT may speak (local voices only)
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
        if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value))
    } catch {}
}
function eosToday(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function eosSessions() {
    const v = eosGet(EOS_KEYS.sessions, [])
    return Array.isArray(v) ? v : []
}
function eosDays() {
    const v = eosGet(EOS_KEYS.days, [])
    return Array.isArray(v) ? v : []
}
function eosMarkDay() {
    const day = eosToday()
    const days = eosDays()
    if (!days.includes(day)) eosSet(EOS_KEYS.days, days.concat([day]).slice(-400))
}
// Prefs are read on every cleanEntries call (many per render) → cached in memory.
let eosPrefsCache = null
function eosPrefs() {
    if (eosPrefsCache) return eosPrefsCache
    const v = eosGet(EOS_KEYS.prefs, {})
    eosPrefsCache = { ...EOS_PREF_DEFAULTS, ...(v && typeof v === "object" ? v : {}) }
    return eosPrefsCache
}
function eosSetPref(key, value) {
    const next = { ...eosPrefs(), [key]: value }
    eosPrefsCache = next
    eosSet(EOS_KEYS.prefs, next)
    if (key === "calmVisuals") EOS_STORE.set({ calmVisuals: !!value })
    return next
}
function eosPushSession(rec) {
    // rec = {emo, before, after, gameId, ms, act, retro}; t is added here. NEVER pass user text.
    const clean = {
        t: Date.now(),
        emo: String(rec?.emo || "general").slice(0, 24),
        before: Number.isFinite(+rec?.before) && rec?.before !== null ? +rec.before : null,
        after: Number.isFinite(+rec?.after) && rec?.after !== null ? +rec.after : null,
        gameId: Number(rec?.gameId) || 0,
        ms: Math.max(0, Math.round(+rec?.ms || 0)),
        act: Number(rec?.act) || 1,
        retro: rec?.retro ? 1 : 0, // 1 = "before" was given AFTER the game (recall-biased; excluded from learning)
    }
    if (eosPrefs().keepHistory !== false) eosSet(EOS_KEYS.sessions, eosSessions().concat([clean]).slice(-300))
    eosMarkDay()
    return clean
}
function eosLearnedCount(gameId) {
    const v = eosGet(EOS_KEYS.learned, {})
    return (v && Number(v[Number(gameId)])) || 0
}

// ---------------------------------------------------------------- CSS registry
// Every module registers its CSS once at top level: eosCss("arrows", EOS_ARROWS_CSS).
// <EosGlobalStyle/> (mounted once by integration step I1) renders all parts in insertion order
// (= file order). Re-registering a name replaces it (safe for hot reload). Key = your task id.
const EOS_CSS_PARTS = new Map()
function eosCss(name, css) {
    EOS_CSS_PARTS.set(String(name), String(css || ""))
    return css
}
function EosGlobalStyle() {
    const css = Array.from(EOS_CSS_PARTS.values()).join("\n")
    return <style data-eos="global">{css}</style>
}

// ---------------------------------------------------------------- API registry / dev handle
// eosExpose("router", {EosRouteGame, …}) publishes a module API; eosApi("router") returns it
// (or {} when that module is not in this build). Tests read window.__eos.<name> (dev only).
const EOS_DEV = { version: EOS_VERSION }
function eosExpose(name, api) {
    EOS_DEV[name] = { ...(EOS_DEV[name] || {}), ...(api || {}) }
    try {
        if (typeof window !== "undefined" && eosIsDev()) window.__eos = EOS_DEV
    } catch {}
    return api
}
function eosApi(name) {
    return EOS_DEV[name] || {}
}

// ---------------------------------------------------------------- emotions (12 states)
// char/loud/calm → emotionSrc(char, mood) (faces verified HTTP 200 on raw.githubusercontent).
// profile → id in RELEASE_INPUT_EMOTION_PROFILES (or "general"); drives arcade copy/spark names.
// starter → written into the composer only when the user gives no words (editable).
// seeds → short phrases used to pad short inputs instead of repeating "I / am / I".
//   RULE (§2): starters and seeds are sensations, situations or feeling names — never beliefs,
//   blame, catastrophic predictions or self-judgements (they become big on-screen game words).
// better → "down": lower intensity is relief (default); "up": higher is better (GOOD = savour).
// moment → the reveal's Still Moment flavour: "sigh" (down-regulate), "heart" (soothe), "spark" (up).
// dial → check-in dial pre-light (§6.2); detection intensity floor = dial - 1 (no softener words).
// dialQ → [before question, after question]; {char} / {noun} are filled in by eosDialQuestion.
// dialWords → 5 anchors over 0-10 (EOS_DIAL_ANCHOR) for low-arousal states; else the loudness words.
// flip → 3 positive words that rise out of the Still Point bloom at the finish (§5.2/§6.8).
// grade → colour script: loud pair → calm pair (EosMoodGrade, share card, Still Point hue).
const EOS_EMOTIONS = [
    { id: "panic", label: "PANIC", noun: "panic", sub: "heart racing", char: "sync", loud: 44, calm: 90, hue: 195, meter: "SLOW-DOWN", spark: "CALM", profile: "panic", primary: true, moment: "sigh", better: "down", dial: 8,
      flip: ["safe", "slow", "right here"], grade: { loud: ["#3b1e6e", "#6a2c91"], calm: ["#ffcf7a", "#ff9f6b"] },
      starter: "panic racing heart tight chest too fast right now",
      seeds: ["racing heart", "tight chest", "too fast", "shaky", "what if", "right now"] },
    { id: "anger", label: "ANGRY", noun: "anger", sub: "frustrated · boiling", char: "rush", loud: 29, calm: 44, hue: 355, meter: "COOL-DOWN", spark: "COOL", profile: "anger", primary: true, moment: "sigh", better: "down", dial: 8,
      flip: ["cool", "clear", "strong"], grade: { loud: ["#d7263d", "#ff7a1a"], calm: ["#2ec4b6", "#4fd1e8"] },
      starter: "so angry hot face clenched jaw had enough",
      seeds: ["hot face", "clenched jaw", "tight fists", "had enough", "boiling over", "fast breath"] },
    { id: "anxiety", label: "ANXIOUS", noun: "anxiety", sub: "nervous · what-ifs", char: "glitch", loud: 15, calm: 10, hue: 265, meter: "GROUND", spark: "GROUND", profile: "fear", primary: true, moment: "sigh", better: "down", dial: 7,
      flip: ["steady", "here", "okay"], grade: { loud: ["#5b3fa6", "#8a5cff"], calm: ["#7fd3ff", "#bfe9ff"] },
      starter: "nervous what if tight shoulders busy stomach",
      seeds: ["what if", "on edge", "tight shoulders", "can't settle", "busy stomach", "too many maybes"] },
    { id: "overthinking", label: "OVERTHINKING", noun: "overthinking", sub: "can't switch off", char: "loopie", loud: 58, calm: 70, hue: 285, meter: "UNLOOP", spark: "CLEAR", profile: "rumination", primary: true, moment: "sigh", better: "down", dial: 6,
      flip: ["clear", "quiet", "done"], grade: { loud: ["#6b2fa3", "#a23fbf"], calm: ["#7ff0c8", "#b5ffe1"] },
      starter: "overthinking the same thought on replay all night",
      seeds: ["on replay", "going round", "that thought", "busy mind", "can't switch off", "again and again"] },
    { id: "overwhelm", label: "OVERWHELMED", noun: "overwhelm", sub: "stressed · too much", char: "sync", loud: 48, calm: 61, hue: 210, meter: "MAKE SPACE", spark: "SPACE", profile: "overwhelm", primary: true, moment: "sigh", better: "down", dial: 7,
      flip: ["space", "one thing", "enough"], grade: { loud: ["#1b2a4a", "#2e3f6e"], calm: ["#3fe6ff", "#9ff5ff"] },
      starter: "overwhelmed too much to do and no time",
      seeds: ["too much", "no time", "everything at once", "so behind", "can't start", "drowning"] },
    { id: "sad", label: "SAD", noun: "sadness", sub: "low · heavy", char: "drop", loud: 58, calm: 3, hue: 215, meter: "LIGHTEN", spark: "LIGHT", profile: "sadness", primary: true, moment: "heart", better: "down", dial: 6,
      flip: ["lighter", "warm", "held"], grade: { loud: ["#3c4f76", "#5a6f99"], calm: ["#ffc29b", "#ffd9b8"] },
      dialQ: ["How heavy is it?", "How heavy is it now?"], dialWords: ["light", "a little heavy", "heavy", "really heavy", "crushing"],
      starter: "sad heavy heart missing how things were",
      seeds: ["heavy heart", "miss it", "it hurts", "so tired", "feel low", "tears"] },
    { id: "lonely", label: "LONELY", noun: "loneliness", sub: "left out", char: "drop", loud: 70, calm: 8, hue: 228, meter: "CONNECT", spark: "WARMTH", profile: "sadness", primary: true, moment: "heart", better: "down", dial: 6,
      flip: ["seen", "connected", "not alone"], grade: { loud: ["#2a3170", "#4a4f99"], calm: ["#ffcf8a", "#ffb36b"] },
      dialQ: ["How alone does it feel?", "How alone does it feel now?"], dialWords: ["connected", "a bit alone", "alone", "very alone", "completely alone"],
      starter: "lonely quiet room want some company",
      seeds: ["all alone", "left out", "want company", "quiet room", "far from friends", "miss people"] },
    { id: "shame", label: "ASHAMED", noun: "shame", sub: "guilty · not enough", char: "patch", loud: 73, calm: 72, hue: 28, meter: "SELF-KIND", spark: "KIND", profile: "general", primary: true, moment: "heart", better: "down", dial: 6,
      flip: ["kind", "human", "enough"], grade: { loud: ["#5e3a63", "#7d4a7a"], calm: ["#ff9fb5", "#ffc4cf"] },
      starter: "ashamed that moment keeps replaying",
      seeds: ["that moment", "the cringe", "harsh voice", "hot cheeks", "want to hide", "replaying it"] },
    { id: "fear", label: "SCARED", noun: "fear", sub: "dread", char: "glitch", loud: 11, calm: 7, hue: 250, meter: "BRAVE", spark: "BRAVE", profile: "fear", primary: false, moment: "sigh", better: "down", dial: 7,
      flip: ["brave", "closer", "smaller"], grade: { loud: ["#1e1a4a", "#3b2f73"], calm: ["#ffe08a", "#ffc35a"] },
      starter: "scared of what might happen next week",
      seeds: ["so scared", "dread", "shaky", "that shape", "unknown", "racing mind"] },
    { id: "jealous", label: "JEALOUS", noun: "jealousy", sub: "comparing", char: "patch", loud: 70, calm: 11, hue: 96, meter: "OWN GLOW", spark: "GLOW", profile: "general", primary: false, moment: "heart", better: "down", dial: 5,
      flip: ["my glow", "my path", "grateful"], grade: { loud: ["#4f6b1f", "#7a8f2a"], calm: ["#ffd36b", "#ffe9a8"] },
      starter: "jealous that pang when I compare",
      seeds: ["that pang", "comparing", "their highlight reel", "want that too", "scrolling", "green feeling"] },
    { id: "numb", label: "NUMB", noun: "numbness", sub: "flat · empty", char: "sync", loud: 34, calm: 61, hue: 180, meter: "WAKE-UP", spark: "SPARK", profile: "general", primary: false, moment: "spark", better: "down", greyLoud: true, dial: 5,
      flip: ["awake", "colour", "alive"], grade: { loud: ["#6b6f78", "#8a8f99"], calm: ["#ff6fd8", "#3fe6ff"] },
      dialQ: ["How far away do you feel?", "How far away do you feel now?"], dialWords: ["right here", "a bit flat", "flat", "far away", "totally blank"],
      starter: "numb flat empty nothing feels like anything",
      seeds: ["feel nothing", "flat", "empty", "blank", "far away", "meh"] },
    { id: "good", label: "GOOD", noun: "good mood", sub: "bank it", char: "still", loud: 61, calm: 90, hue: 48, meter: "SAVOUR", spark: "JOY", profile: "general", primary: false, moment: "spark", better: "up", dial: 6,
      flip: ["savoured", "kept", "mine"], grade: { loud: ["#ffb84d", "#ff8a5c"], calm: ["#ffe58a", "#fff3c4"] },
      dialQ: ["How good is it?", "How good is it now?"], dialWords: ["meh", "nice", "good", "really good", "glowing"],
      starter: "good moment I want to keep this feeling",
      seeds: ["good moment", "grateful", "proud", "light", "smiled", "enough"] },
]
const EOS_EMO = Object.fromEntries(EOS_EMOTIONS.map((e) => [e.id, e]))
// STILL narrates and is the "NOT SURE" orb in the centre of the check-in ring.
const EOS_GUIDE_CHAR = { id: "auto", label: "NOT SURE", noun: "this feeling", sub: "let Still pick", char: "still", loud: 41, calm: 15, hue: 190, dial: 6,
    flip: ["lighter", "clearer", "here"], grade: { loud: ["#2b2f6e", "#4a3f99"], calm: ["#7de3ff", "#c8f4ff"] },
    dialQ: ["How big does it feel?", "How big does it feel now?"],
    starter: "a lot on my mind right now and I need a moment",
    seeds: ["a lot", "on my mind", "this feeling", "right now", "need a moment", "let it go"] }
const EOS_CHAR_NAMES = { sync: "SYNC", rush: "RUSH", glitch: "GLITCH", loopie: "LOOPIE", drop: "DROP", patch: "PATCH", still: "STILL" }
// Higher arousal wins ties (body-first states before cognitive ones).
const EOS_AROUSAL_ORDER = ["panic", "anger", "fear", "anxiety", "shame", "overwhelm", "overthinking", "sad", "lonely", "jealous", "numb", "good"]
// Curated positive "win" expressions from thinkstill_750_expression_map.json (unique per character,
// minus the arcade's negative ids). Union with RELEASE_PHASE_EMOTIONS.positive = 102 faces (was 39).
const EOS_WIN_FACES = {
    sync: [35, 51, 52, 53, 54, 55, 57, 58, 59, 60, 61, 62, 63],
    rush: [33, 34, 35, 49, 53, 54, 55, 59, 60],
    glitch: [48, 49, 57, 58, 60, 61, 62],
    loopie: [35, 43, 50, 52, 53, 55, 56, 57, 61, 62, 63],
    drop: [8, 26, 28, 31, 57, 59, 60, 61, 63],
    patch: [37, 38, 39, 40, 41, 42, 43, 46, 58, 64],
    still: [51, 52, 53, 54, 55, 57, 58, 59, 60, 61, 62],
}

function eosFace(char, mood) {
    return emotionSrc(String(char || "still"), Number(mood) || 41)
}
function eosFaceFor(emotionId, which = "loud") {
    const e = EOS_EMO[emotionId] || EOS_GUIDE_CHAR
    return eosFace(e.char, which === "calm" ? e.calm : e.loud)
}
// Expression ids per character: "negative" | "positive" (arcade sets) | "win" (positive ∪ EOS_WIN_FACES).
function eosFacePool(char, phase = "positive") {
    const c = String(char || "still")
    if (phase === "win") return Array.from(new Set([...eosFacePool(c, "positive"), ...(EOS_WIN_FACES[c] || [])])).sort((a, b) => a - b)
    const set = (RELEASE_PHASE_EMOTIONS && RELEASE_PHASE_EMOTIONS[phase]) || {}
    const list = set[c]
    return Array.isArray(list) && list.length ? list.slice() : [phase === "positive" ? 15 : 41]
}
function eosHue(emotionId) {
    return (EOS_EMO[emotionId] || EOS_GUIDE_CHAR).hue
}
function eosGrade(emotionId) {
    return (EOS_EMO[emotionId] || EOS_GUIDE_CHAR).grade
}
// The emotion that colours the experience right now (checked-in > detected > null).
function eosCurrentEmotion() {
    const st = EOS_STORE.get()
    return st.emotion || st.detected || null
}
// Legacy wrapper progress text (I1-E13): "SLOW-DOWN · 33%" instead of "GAME PROGRESS · 33%".
function eosMeterWord() {
    const e = EOS_EMO[eosCurrentEmotion()]
    return e ? e.meter : "SHIFT"
}
// The dial question for an emotion: when = "before" | "after".
function eosDialQuestion(emotionId, when = "before") {
    const e = EOS_EMO[emotionId] || (emotionId === "auto" || emotionId == null ? EOS_GUIDE_CHAR : null) || EOS_GUIDE_CHAR
    const q = e.dialQ || ["How loud is {char} right now?", "How loud is {char} ({noun}) now?"]
    return String(q[when === "after" ? 1 : 0]).replace("{char}", EOS_CHAR_NAMES[e.char] || "it").replace("{noun}", e.noun || "it")
}

// ---------------------------------------------------------------- detection (fixes "panicking", "raged", …)
// Score-based, not first-match. Each entry: [regex (global), weight]. Inflections are covered by stems.
// Lookahead is fine; lookbehind is BANNED (Safari < 16.4).
const EOS_LEXICON = {
    panic: [[/\bpanic\w*|\bfreak(?:ing|ed|s)?\s*out\b|\bheart\s*(?:is\s*)?(?:racing|pounding)\b|\bcan'?t\s*breathe\b|\bhyperventilat\w*|\bchest\s*(?:is\s*)?tight\w*|\blosing\s*(?:it|control)\b|\bpanick\w*/gi, 1.6],
            [/\bshak(?:ing|y)\b|\btrembl\w*|\bdizz\w*|\bsweat(?:y|ing)\b|\bheart\s+(?:is\s+)?beating\s+(?:so\s+)?fast\b|\bracing\s+heart\b|\btight\s+chest\b/gi, 1.1]],
    anger: [[/\bang(?:er|ry|rier|rily|ered)\b|\bfurious\b|\bfury\b|\brag(?:e|ed|es|ing)\b|\bpissed\b|\blivid\b|\bfuming\b|\bseething\b|\bboiling\b|\bfed\s+up\b|\bso\s+unfair\b|\bhate[ds]?\b(?!\s+(?:me|myself|my\s+life)\b)|\bresent\w*/gi, 1.5],
            [/\bmad\b|\birritat\w*|\bannoy\w*|\bfrustrat\w*|\bunfair\b|\byell(?:ed|ing|s)?\b|\b(?:shout|scream)(?:ed|ing|s)?\s+at\b/gi, 1],
            [/\bpunch\w*|\bsmash\w*|\bscream(?:ing)?\b|\bexplod\w*|\bsick\s+of\b|\bwant\s+to\s+(?:hit|break)\b/gi, 1.2]],
    fear: [[/\bscar(?:ed|y)\b|\bafraid\b|\bfear\w*|\bterrif\w*|\bfrighten\w*|\bpetrified\b/gi, 1.4]],
    anxiety: [[/\banxi\w*|\bworr\w*|\bnervous\w*|\buneasy\b|\bon\s+edge\b|\bwhat\s+if\b|\bdread\w*|\bapprehensi\w*/gi, 1.3],
              [/\btens(?:e|ed|ion)\b|\brestless\w*|\bcan'?t\s+sleep\b|\bmind\s+(?:is\s+)?racing\b|\bjitter\w*|\bbutterflies\b|\bstressed\s+about\b/gi, 1.3]],
    shame: [[/\bsham\w*|\basham\w*|\bguilt\w*|\bembarrass\w*|\bhumiliat\w*|\bnot\s+good\s+enough\b|\bworthless\b|\bhate\s+myself\b|\bmy\s+fault\b|\bmessed\s+up\b|\bcringe\w*/gi, 1.5],
            [/\bstupid\b|\bidiot\b|\bfailure\b|\bloser\b|\bregret\w*/gi, 1],
            [/\binsecur\w*|\bself[-\s]?doubt\w*|\bimpost(?:o|e)r\w*|\bugly\b|\buseless\b|\bburden\b|\bpathetic\b/gi, 1.3]],
    overwhelm: [[/\boverwhelm\w*|\btoo\s+much\b|\bswamped\b|\bdrowning\b|\bso\s+much\s+to\s+do\b|\bburn(?:ed|t)?\s*out\b|\boverload\w*|\bcan'?t\s+cope\b/gi, 1.4],
                [/\bstress\w*|\bexhausted\b|\bno\s+time\b|\bbehind\b/gi, 1],
                [/\bdrained\b|\bdeadlines?\b|\bpressure\b|\bstuck\b|\btired\b/gi, 0.8]],
    overthinking: [[/\boverthink\w*|\bover-thinking\b|\bruminat\w*|\bcan'?t\s+stop\s+thinking\b|\bon\s+(?:a\s+)?(?:loop|repeat|replay)\b|\breplay\w*|\bobsess\w*|\bsecond[-\s]guess\w*|\bgoing\s+round\b|\bspiral\w*/gi, 1.4]],
    sad: [[/\bsad\w*|\bunhappy\b|\bcry\w*|\bcried\b|\btears?\b|\bgriev\w*|\bgrief\b|\bheartbr\w*|\bdepress\w*|\bgutted\b|\bmiss(?:ing)?\s+(?:him|her|them|you|my)\b/gi, 1.4],
           [/\bdown\b|\blow\b|\bhurt(?:s|ing)?\b|\bblue\b/gi, 0.6],
           [/\bhopeless\w*|\bbr(?:oke|eak(?:ing)?)\s*up\b|\bbreakup\b|\bdumped\b|\bmiserable\b|\bdevastat\w*|\blost\s+(?:my|him|her)\b|\bhate\s+my\s+life\b/gi, 1.3]],
    lonely: [[/\blonel\w*|\balone\b|\bisolat\w*|\bleft\s+out\b|\bnobody\b|\bno\s+one\s+(?:cares|gets|listens)\b|\bno\s+friends\b|\bunseen\b|\binvisible\b|\bexcluded\b/gi, 1.4],
             [/\bghost(?:ed|ing)\b|\breject\w*|\babandon\w*|\bignored\b|\bunwanted\b|\b(?:every(?:one|body)|they\s+all|people)\s+hates?\s+me\b/gi, 1.4]],
    jealous: [[/\bjealous\w*|\benvy\b|\benvious\b|\bcompar\w*|\bwhy\s+not\s+me\b|\bbetter\s+than\s+me\b|\bfomo\b/gi, 1.4]],
    numb: [[/\bnumb\w*|\bempty\b|\bfeel\s+nothing\b|\bnothing\s+(?:matters|feels)\b|\bhollow\b|\bapath\w*|\bdisconnect\w*/gi, 1.4],
           [/\bflat\b|\bblank\b|\bmeh\b|\bbored\b/gi, 0.8]],
    good: [[/\bgood\b|\bgreat\b|\bhappy\b|\bgrateful\b|\bthankful\b|\bproud\b|\bcalm\b|\bpeaceful\b|\bexcited\b|\bjoy\w*|\brelieved\b/gi, 0.8]],
}
const EOS_SOFTENERS = /\b(?:a\s+(?:bit|little)|slightly|kinda|kind\s+of|sort\s+of|somewhat|mildly|little\s+bit)\b/i
function eosNormText(text) {
    const t = Array.isArray(text) ? text.join(" ") : String(text || "")
    return t.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim()
}
function eosGuessIntensity(text) {
    const t = eosNormText(text)
    if (!t) return 5
    let n = 5
    const boosts = (t.match(/\b(?:so|really|very|extremely|totally|completely|absolutely|can'?t|cannot|never|always|so\s+much)\b/gi) || []).length
    n += Math.min(2, boosts)
    if ((t.match(/\b[A-Z]{2,}\b/g) || []).length >= 2) n += 1
    if (/!{2,}/.test(t)) n += 1
    if (EOS_SOFTENERS.test(t)) n -= 2
    return eosClamp(n, 3, 9)
}
// → {id, score, intensity} | null. Pure (safe during render).
// intensity = max(guess, EOS_EMO[id].dial - 1) unless the text softens itself ("a bit annoyed").
function eosDetectEmotion(text) {
    const t = eosNormText(text)
    if (!t) return null
    const scores = {}
    for (const id of Object.keys(EOS_LEXICON)) {
        let s = 0
        for (const [re, w] of EOS_LEXICON[id]) {
            re.lastIndex = 0
            const hits = t.match(re)
            if (hits) s += hits.length * w
        }
        if (s > 0) scores[id] = s
    }
    // "good" only counts when nothing negative was found ("not good enough" = shame).
    const neg = Object.keys(scores).filter((k) => k !== "good")
    if (neg.length) delete scores.good
    if (scores.good && /\bnot\s+(?:\w+\s+)?(?:good|great|happy|ok)\b/i.test(t)) delete scores.good
    const ids = Object.keys(scores)
    if (!ids.length) return null
    ids.sort((a, b) => scores[b] - scores[a] || EOS_AROUSAL_ORDER.indexOf(a) - EOS_AROUSAL_ORDER.indexOf(b))
    const guess = eosGuessIntensity(t)
    const floor = EOS_SOFTENERS.test(t) ? 0 : (EOS_EMO[ids[0]]?.dial || 5) - 1
    return { id: ids[0], score: scores[ids[0]], intensity: eosClamp(Math.max(guess, floor), 3, 9) }
}
function eosBand(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return "mid"
    return v >= 7 ? "high" : v >= 4 ? "mid" : "low"
}

// ---------------------------------------------------------------- safety lexicon (core: everyone needs it synchronously)
// First-person phrasing keeps false positives low; false positives are cheap (the card is gentle, dismissible).
// Tested in node: docs/EOS_SPEC.md §10.1 must-match / must-not-match lists. NO lookbehind (Safari < 16.4).
// Who can hurt "me": shared by both abuse patterns so their subject lists never drift.
const EOS_SAFETY_WHO = String.raw`(?:he|she|they|my\s+(?:dad|father|mum|mom|mother|parents?|ex|step\w*|partner|husband|wife|boyfriend|girlfriend|bf|gf|boss|teacher|coach|brother|sister|uncle|aunt|cousin|grand\w*|guardian|carer|caregiver))`
const EOS_SAFETY_LEX = {
    selfharm: /\b(kill(ing)?\s*my\s*self|kms|suicid\w*|end\s+(it\s+all|my\s+life)|take\s+my\s+(own\s+)?life|(?:want|wanted)\s+to\s+die|wanna\s+die|wish\s+i\s+(was|were)\s+dead|better\s+off\s+(dead|without\s+me)|no\s+reason\s+to\s+(live|be\s+here)|don'?t\s+want\s+to\s+(be\s+here|live|exist|wake\s+up)|self[-\s]?harm\w*|hurt(ing)?\s+my\s*self|cut(ting)?\s+my\s*self|overdos\w*|can'?t\s+go\s+on|no\s+(?:point|reason)\s+(?:in\s+)?(?:living|being\s+alive|going\s+on)|(?:don'?t|do\s+not)\s+want\s+to\s+be\s+alive|life\s+(?:is\s*n'?t|is\s+not|isnt)\s+worth\s+(?:living|it)|not\s+worth\s+living|sleep\s+and\s+never\s+wake\s+up|nobody\s+would\s+(?:miss|care\s+if)\s+me|(?:i'?m|i\s+am|feel\s+like)\s+(?:such\s+)?a\s+burden)\b/i,
    selfharm2: /\b(unalive\w*|sewer\s*slide|end\s+(?:myself|things\s+tonight)|hang\s+myself|slit\s+my\s+wrists?|jump\s+off\s+(?:a|the)\s+(?:bridge|building|roof)|(?:been|started|keep|kept)\s+cutting|cutting\s+again|i'?m\s+going\s+to\s+(?:do\s+it|end\s+it)\s+tonight)\b/i,
    // "hit me up / back" = texting; "beat me at / in / to" = a game; "kicked me out / off" = a group.
    abuse: new RegExp(String.raw`\b(${EOS_SAFETY_WHO}\s+(?:hits?\s+me\b(?!\s+(?:up|back)\b)|beats?\s+me\b(?!\s+(?:at|in|to)\b)|(?:chokes?|hurts?|threatens?|touch(?:es|ed)?)\s+me\b)|being\s+(abused|hit|beaten)|abus(e|es|ed|ing)\s+me|rap(e|ed)|sexual(ly)?\s+assault\w*|(not|don'?t\s+feel)\s+safe\s+at\s+home|scared\s+to\s+go\s+home)\b`, "i"),
    abuse2: new RegExp(String.raw`\b(?:${EOS_SAFETY_WHO}(?:'ll|\s+will|\s+is\s+going\s+to|\s+might|\s+keeps?|\s+always)?\s+(?:hit|slap|kick|punch|shove|chok|strangl|burn)\w*\s+me\b(?!\s+(?:up|out|back|off)\b)|${EOS_SAFETY_WHO}(?:'ll|\s+will|\s+is\s+going\s+to|\s+might)\s+(?:hurt|kill)\s+me\b(?!\s+if)|(?:he|she|they)\s+(?:hurt|touched|threatened)\s+me)\b`, "i"),
    soft: /\b(hopeless|hate\s+my\s+life|give\s+up\s+on\s+everything|what'?s\s+the\s+point\s+(?:anymore|of\s+(?:living|anything|trying|me))|want\s+to\s+disappear|can'?t\s+do\s+this\s+anymore)\b/i,
}
// A real person-threat (broad). Router: 118 / 105 / 53 are never routed when it matches (no "sock puppet"
// jokes about a real danger). Card: "threat" only with a fear word or a physical verb aimed at "me".
const EOS_REAL_THREAT = /\b(?:he|she|they|him|her|someone|somebody|my\s+\w+)\b[^.!?]{0,40}?\b(?:hurt|hit|kill|attack|follow|stalk|threat|beat|touch)\w*\b(?!\s+(?:me\s+)?(?:if|up|out|with|back|at|in)\b)/i
const EOS_THREAT_CARD = /\b(?:scared|afraid|terrified|frightened|unsafe)\b|\b(?:hurt|hit|kill|attack|stalk|follow)\w*\s+me\b(?!\s+(?:if|up|back)\b)|\bbeat\w*\s+me\b(?!\s+(?:at|in|to|up\s+on)\b)/i
const EOS_SAFETY_RANK = { soft: 1, threat: 2, abuse: 3, selfharm: 4 }
// → null | "selfharm" | "abuse" | "threat" | "soft". Pure; safe during render.
function EosSafetyScan(text) {
    const t = eosNormText(text)
    if (!t) return null
    const s = t.replace(/\b\d+(?:[.,]\d+)?\s*kms\b/gi, " ") // "ran 10 kms" is distance, not "kill myself"
    const L = EOS_SAFETY_LEX
    if (L.selfharm.test(s) || L.selfharm2.test(s)) return "selfharm"
    if (L.abuse.test(s) || L.abuse2.test(s)) return "abuse"
    if (EOS_REAL_THREAT.test(s) && EOS_THREAT_CARD.test(s)) return "threat"
    if (L.soft.test(s)) return "soft"
    return null
}
function eosRealThreat(text) {
    return EOS_REAL_THREAT.test(eosNormText(text))
}
// "strong" flags: gentle routing + neutral words on every game + share muted. "soft": gentle routing + share muted.
function eosSafetyStrong(type) {
    return (EOS_SAFETY_RANK[type] || 0) >= 2
}
// Last scan of the composer text (set by eosTextSafety from pure render-time callers such as EosEntries /
// EosRouteGame). Holds ONLY the flag type, never text. EosMarkLaunch raises the store flag from it.
const EOS_TEXT_SAFETY = { last: null }
function eosTextSafety(text) {
    const f = EosSafetyScan(text)
    EOS_TEXT_SAFETY.last = f
    return f
}
// Raise the session flag (precedence selfharm > abuse > threat > soft; never downgrades). Callbacks only.
function EosFlagSafety(type) {
    if (!EOS_SAFETY_RANK[type]) return
    const cur = EOS_STORE.get().safety
    if ((EOS_SAFETY_RANK[cur] || 0) >= EOS_SAFETY_RANK[type]) return
    EOS_STORE.set({ safety: type })
}
// Shown instead of the user's words on EVERY game while a strong flag is set (§10.2).
const EOS_NEUTRAL_WORDS = ["this feeling", "a heavy moment", "right now", "one breath", "still here", "a little space"]

// ---------------------------------------------------------------- copy rules (lint data, §2)
const EOS_DISCLAIMER = "ThinkStill is a playful tool for everyday feelings — not therapy, diagnosis or a crisis service."
const EOS_COPY_RULES = {
    // clinical words (EOS_DISCLAIMER and the safety card copy are EXEMPT)
    bannedWords: ["therapy", "therapist", "patient", "symptom", "disorder", "diagnosis", "treatment", "exercise", "session", "homework", "intervention", "coping skill"],
    // invalidating phrases ("just" only as a minimiser of the user's effort, e.g. "just breathe")
    bannedPhrases: ["calm down", "relax", "cheer up", "don't worry", "just breathe", "you should", "get over it", "not a big deal", "that's it?", "look on the bright side", "at least"],
    // medical claims (never in UI, captions or share text)
    bannedClaims: ["treat", "treats", "cure", "clinically proven", "reduces anxiety disorder", "therapy-grade", "doctor-approved"],
}

// ---------------------------------------------------------------- game classes shared by router / shift / companion / rewards
// Discharge games: anger after one of these ALWAYS gets the cool-down (Kjærvik & Bushman 2024).
const EOS_DISCHARGE_IDS = new Set([2, 3, 4, 5, 6, 13, 15, 18, 61, 68, 100, 101])
// Breath / slow games: the reveal's Still Moment never runs after these (the game already was the breath).
const EOS_SLOW_IDS = new Set([111, 112, 109, 65, 66, 69, 80, 36, 44])

// ---------------------------------------------------------------- session store
// Tiny external store (React 18 useSyncExternalStore). Plain functions can read/write it from
// any arcade callback with no dependency-array edits. NEVER call EOS_STORE.set during render.
const EOS_STORE_INITIAL = {
    phase: "checkin", //   "checkin" | "skip" | "play" | "meter"
    emotion: null, //      EOS_EMOTIONS id chosen at check-in (or null)
    sub: null, //          optional sub-tag ("choice", …)
    before: null, //       0-10 intensity at check-in (null = unknown)
    after: null, //        0-10 after the game (set by EosRecordShift)
    express: false, //     launched by an express orb (PANIC tap / long-press) → high band, before asked after
    source: null, //       "checkin" | "detect" | null
    detected: null, //     emotion id detected from the words at launch when there was no check-in
    intensityGuess: null, // 3-9 guess from the words (no check-in)
    launchAt: 0, //        ms timestamp the current game started
    finishAt: 0, //        ms timestamp the current game finished (engine onDone → reveal)
    gameId: 0, //          current/last game id
    act: 1, //             1 = first game for this feeling, 2+ = follow-up
    path: [], //           game ids played for this feeling (this app session)
    recordedFor: 0, //     launchAt already written to history (idempotency)
    lastShift: null, //    {emo, before, after, delta, ms, gameId, act, retro, t}
    flipKey: null, //      personalised payoff line id from the flip index (never text)
    safety: null, //       null | "soft" | "threat" | "abuse" | "selfharm"   (EosFlagSafety; precedence, never downgrades)
    safetyDismissed: {}, // {selfharm:true, …} per trigger type (re-shows for a NEW type)
    loops: 0, //           completed loops this app session — gentle exit ramp
    sessionStart: 0,
    sessionSeed: 1,
    skipSticky: false, //  "just let me play" chosen → stay in classic mode until reopened
    checkinEnabled: true, // Framer prop "Emotion Check-in"
    sound: true, //        mirrors the arcade's sound toggle (integration I1-E14)
    haptics: true, //      mirrors hapticsOn
    music: false, //       mirrors musicOn && sound (the dots audio bed stays silent while music plays)
    calmVisuals: false, // eos_prefs_v1.calmVisuals mirror
    crisisLines: "", //    Framer props (EosConfigSync)
    crisisUrl: "",
    emergencyText: "",
    shareUrl: "",
}
const EOS_STORE = (() => {
    let state = { ...EOS_STORE_INITIAL, sessionStart: Date.now(), sessionSeed: (Date.now() % 100003) + 1, calmVisuals: !!eosPrefs().calmVisuals }
    const subs = new Set()
    const emit = () =>
        subs.forEach((f) => {
            try {
                f()
            } catch {}
        })
    const KEEP = ["loops", "sessionStart", "sessionSeed", "sound", "haptics", "music", "calmVisuals", "crisisLines", "crisisUrl", "emergencyText", "shareUrl", "safety", "safetyDismissed", "skipSticky", "checkinEnabled", "path"]
    return {
        get: () => state,
        set(patch) {
            const next = typeof patch === "function" ? patch(state) : patch
            if (!next) return
            let changed = false
            for (const k in next)
                if (state[k] !== next[k]) {
                    changed = true
                    break
                }
            if (!changed) return
            state = { ...state, ...next }
            emit()
        },
        // Back to a fresh feeling; keeps app-session facts (loops, seeds, props, sound, safety).
        resetFeeling() {
            const next = { ...EOS_STORE_INITIAL }
            KEEP.forEach((k) => {
                next[k] = state[k]
            })
            next.path = []
            next.phase = state.skipSticky || !state.checkinEnabled ? "skip" : "checkin"
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
// Every EOS component: const red = eosCalm(reduced) (after useEosStore() so the toggle re-renders it).
function eosCalm(reduced) {
    return !!reduced || !!EOS_STORE.get().calmVisuals
}

// ---- session transitions (called from arcade callbacks by the integration steps; never in render)
// Check-in committed (emotion may be null = NOT SURE; before 0-10; express = launched from an express orb).
function EosCommitCheckin({ emotion = null, before = null, source = "checkin", express = false } = {}) {
    EOS_STORE.set({
        emotion: EOS_EMO[emotion] ? emotion : null,
        before: before == null || before === "" ? null : eosClamp(Math.round(Number(before)), 0, 10),
        source: EOS_EMO[emotion] ? source : null,
        express: !!express,
        skipSticky: false,
    })
}
function EosSkipCheckin() {
    EOS_STORE.set({ phase: "skip", skipSticky: true })
}
function EosOpenCheckin() {
    EOS_STORE.set({ phase: "checkin", skipSticky: false })
}
function EosResetFeeling() {
    EOS_STORE.resetFeeling()
}
// startChosenGame / replay → a game is starting (same feeling ⇒ act 2+). Also raises the safety flag
// SYNCHRONOUSLY (no debounce race with a fast Enter) from the entries and the last composer scan.
function EosMarkLaunch(game, entries) {
    const st = EOS_STORE.get()
    const id = Number(game && game.id) || 0
    const flag = EosSafetyScan(entries) || EOS_TEXT_SAFETY.last
    if (flag) EosFlagSafety(flag)
    const followUp = (st.phase === "meter" || st.phase === "play") && st.launchAt > 0
    const det = st.emotion ? null : eosDetectEmotion(entries)
    const carryBefore = followUp && st.after != null ? st.after : st.before
    const emo = st.emotion || (det ? det.id : st.detected)
    let flipKey = null
    try {
        if (!eosSafetyStrong(EOS_STORE.get().safety)) flipKey = eosApi("flip").match?.(entries, emo) ?? null
    } catch {}
    EOS_STORE.set({
        phase: "play",
        gameId: id,
        launchAt: Date.now(),
        finishAt: 0,
        act: followUp ? (Number(st.act) || 1) + 1 : 1,
        path: followUp ? (st.path || []).concat([id]).slice(-8) : [id],
        before: carryBefore,
        after: null,
        flipKey,
        detected: det ? det.id : st.detected,
        intensityGuess: det ? det.intensity : st.intensityGuess,
        source: st.emotion ? st.source || "checkin" : det ? "detect" : st.source,
    })
}
// done() → the reveal is about to show. Marks the day + teaches the arrows this game is learned.
function EosMarkFinish(game, bonus) {
    const st = EOS_STORE.get()
    const id = Number(game && game.id) || st.gameId
    if (st.finishAt && st.gameId === id && st.phase === "meter") return
    const learned = eosGet(EOS_KEYS.learned, {}) || {}
    learned[id] = (Number(learned[id]) || 0) + 1
    eosSet(EOS_KEYS.learned, learned)
    eosMarkDay()
    EOS_STORE.set({ phase: "meter", finishAt: Date.now(), gameId: id })
}
// Shift meter → after rating (after may be null = "skip"). Writes ONE history row per launch
// (idempotent). opts.before = a "before" given in the reveal → the row is retro (recall-biased).
function EosRecordShift(after, opts = {}) {
    const st = EOS_STORE.get()
    const late = opts.before != null && st.before == null
    const before = opts.before != null ? eosClamp(Math.round(+opts.before), 0, 10) : st.before
    const a = after == null ? null : eosClamp(Math.round(+after), 0, 10)
    if (st.launchAt && st.recordedFor === st.launchAt && st.lastShift) return st.lastShift
    const emo = st.emotion || st.detected || "general"
    const better = (EOS_EMO[emo] && EOS_EMO[emo].better) || "down"
    const rec = eosPushSession({
        emo,
        before,
        after: a,
        gameId: st.gameId,
        ms: (st.finishAt || Date.now()) - (st.launchAt || Date.now()),
        act: st.act,
        retro: !!(opts.retro || late),
    })
    const delta = before != null && a != null ? (better === "up" ? a - before : before - a) : null
    const shift = { ...rec, delta }
    EOS_STORE.set({ after: a, before, recordedFor: st.launchAt || -1, lastShift: shift, loops: (st.loops || 0) + 1 })
    return shift
}
// Defaults for the new Framer property controls (99_pixar addPropertyControls, integration I1).
// The owner MUST verify the support lines for their region before publishing (release notes).
// Format: "label · number-or-text | …". The safety module orders them by time zone (local first).
const EOS_PROP_DEFAULTS = {
    checkin: true,
    crisisLines: "US · 988 | Canada · 988 | UK & IE · Samaritans 116 123 | Australia · Lifeline 13 11 14 | India · Tele-MANAS 14416 | Anywhere · findahelpline.com",
    crisisUrl: "https://findahelpline.com",
    emergencyText: "In immediate danger? Call your local emergency number.",
    shareUrl: "",
}
// Session-replay masking attributes (§10.3 P4) for every EOS root that shows feelings and for the composer.
const EOS_PRIVATE_ATTRS = { "data-private": "true", "data-hj-suppress": "", "data-clarity-mask": "true" }
const eosLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect
// Mounted once by integration (99_pixar) so Framer property controls reach the store (layout effect:
// a disabled check-in never paints for a frame). Also masks the composer for session-replay tools.
function EosConfigSync({ checkin = true, crisisLines = "", crisisUrl = "", emergencyText = "", shareUrl = "" }) {
    eosLayoutEffect(() => {
        const st = EOS_STORE.get()
        const enabled = checkin !== false
        EOS_STORE.set({
            checkinEnabled: enabled,
            crisisLines: String(crisisLines || ""),
            crisisUrl: String(crisisUrl || ""),
            emergencyText: String(emergencyText || ""),
            shareUrl: String(shareUrl || ""),
            phase: !enabled && st.phase === "checkin" ? "skip" : enabled && st.phase === "skip" && !st.skipSticky ? "checkin" : st.phase,
        })
    }, [checkin, crisisLines, crisisUrl, emergencyText, shareUrl])
    React.useEffect(() => {
        if (typeof document === "undefined") return
        const mask = () => {
            try {
                document.querySelectorAll("input.releaseThoughtInput:not([data-private])").forEach((el) => {
                    for (const k in EOS_PRIVATE_ATTRS) el.setAttribute(k, EOS_PRIVATE_ATTRS[k])
                    el.classList.add("fs-mask")
                })
            } catch {}
        }
        mask()
        const t = setInterval(mask, 2000)
        return () => clearInterval(t)
    }, [])
    return null
}

// ---------------------------------------------------------------- engines (new games 111+)
const EOS_ENGINES = {}
// Per new game: { gesture, char, seconds } — gesture = first-stage gesture (LIVE GUIDE glyph, §3.7);
// char = the scene's character (the companion hides when it equals the companion's character);
// seconds = typical play time for the check-in CTA sub-line.
const EOS_GAME_META = {}
function EosEngineFor(game) {
    const id = Number(game && game.id) || 0
    return id >= 111 ? EOS_ENGINES[id] || null : null
}
// def = full GAMES entry (all 15 fields, strings; engine "E04" ⇒ explicit progress, no arcade CSS
// keys off it). opts = { hint, mindBend, css, gesture, char, seconds }.
const EOS_GAME_FIELDS = ["name", "family", "engine", "prompt", "object", "action", "mechanism", "hook", "surprise", "mindBend", "score", "replay", "sound", "notes"]
const EOS_GESTURE_NAMES = ["tap", "taps", "hold", "holdRelease", "drag", "dragTo", "swipe", "sling", "slow", "scrub", "choose", "seq", "timing", "alt", "tool", "wait", "type"]
function eosRegisterGame(def, Engine, opts = {}) {
    if (!def || !def.id || typeof Engine !== "function") return
    if (eosIsDev()) {
        // console.warn (never console.error: the test harness counts console errors as page errors)
        const bad = EOS_GAME_FIELDS.filter((k) => typeof def[k] !== "string" || !def[k])
        if (bad.length) console.warn(`[eos] game ${def.id}: missing/empty GAMES fields: ${bad.join(", ")}`)
        if (EOS_ENGINES[def.id] && EOS_ENGINES[def.id] !== Engine) console.warn(`[eos] game ${def.id} registered twice`)
        if (GAMES.some((g) => g.id !== def.id && g.name === def.name)) console.warn(`[eos] game ${def.id}: name "${def.name}" already used`)
        if (opts.gesture && !EOS_GESTURE_NAMES.includes(opts.gesture)) console.warn(`[eos] game ${def.id}: unknown gesture "${opts.gesture}"`)
        if (Number(def.id) < 111) console.warn(`[eos] game ${def.id}: new games use ids ≥ 111 (EosEngineFor ignores lower ids)`)
    }
    if (!GAMES.some((g) => g.id === def.id)) GAMES.push(def)
    EOS_ENGINES[def.id] = Engine
    EOS_GAME_META[def.id] = { gesture: String(opts.gesture || "tap"), char: opts.char ? String(opts.char) : null, seconds: Number(opts.seconds) || 30 }
    if (opts.hint) {
        SHORT_ACTION[def.id] = opts.hint
        SHORT_HINT[def.id] = opts.hint
    }
    if (opts.mindBend) RELEASE_MIND_BEND[def.id] = opts.mindBend
    if (opts.css) eosCss(`game-${def.id}`, opts.css)
}

// ---------------------------------------------------------------- arrow contract helper
// Spread onto the element the player must touch NOW; move it as the target changes. For a `choose`
// stage spread it on EVERY option (the overlay reads all markers).
// g ∈ tap|taps|hold|holdRelease|drag|dragTo|swipe|sling|slow|scrub|choose|seq|timing|alt|tool|wait|type
function eosTarget(spec) {
    if (!spec) return {}
    const out = { "data-eos-target": "1", "data-eos-g": spec.g || "tap" }
    const keys = { dir: "dir", d: "d", n: "n", ms: "ms", to: "to", bpm: "bpm", label: "label", win: "win", meter: "meter", mvar: "mvar", armed: "armed", maxSpeed: "max-speed", ox: "ox", oy: "oy" }
    for (const k in keys) {
        const v = spec[k]
        if (v == null || v === "") continue
        out[`data-eos-${keys[k]}`] = Array.isArray(v) ? v.join(",") : String(v)
    }
    if (spec.own) out["data-eos-own"] = "1"
    return out
}

// ---------------------------------------------------------------- small helpers
// Local time of day, shared so every game / the mood layer / the router agree (§5.6 R8, §7.3, §8.0):
// eosDayPart → "dawn" 5-10 · "day" 10-17 · "dusk" 17-21 · "night" 21-5; eosLateNight → 23:00-05:00.
function eosDayPart(d = new Date()) {
    const h = d.getHours()
    return h >= 5 && h < 10 ? "dawn" : h >= 10 && h < 17 ? "day" : h >= 17 && h < 21 ? "dusk" : "night"
}
function eosLateNight(d = new Date()) {
    const h = d.getHours()
    return h >= 23 || h < 5
}
function eosNoise(i, salt = 0) {
    return noveltyNoise(Number(i) + 1, Number(salt) + 7)
}
function eosClamp(n, a, b) {
    return Math.max(a, Math.min(b, Number(n) || 0))
}
// Haptics: iOS Safari has no navigator.vibrate → every haptic cue needs a visual or audio twin (§8.0).
// heart = 60 bpm (slower than resting — calming); exhale = a ~3.2 s decaying train.
const EOS_HAPTIC = { touch: 8, hit: [12, 40, 18], finish: [20, 60, 20, 60, 40], notch: 8, exhale: [8, 300, 8, 450, 8, 600, 8, 800, 8, 1000], heart: [12, 140, 12, 836] }
function eosHaptic(pattern = 8) {
    if (!EOS_STORE.get().haptics) return
    vibrate(typeof pattern === "string" ? EOS_HAPTIC[pattern] || 8 : pattern)
}
// A heartbeat that slows from fromBpm to toBpm across ms. onBeat(i, bpm) fires on every beat even with
// haptics off (drive the visual twin from it). Returns stop(). NEVER used in the panic game (111).
function eosHeartbeat(fromBpm = 60, toBpm = 52, ms = 8000, onBeat) {
    let stopped = false
    let timer = 0
    const t0 = Date.now()
    let i = 0
    const beat = () => {
        if (stopped) return
        const f = eosClamp((Date.now() - t0) / Math.max(1, ms), 0, 1)
        const bpm = fromBpm + (toBpm - fromBpm) * f
        eosHaptic([12, 140, 12])
        try {
            onBeat?.(i++, bpm)
        } catch {}
        if (f >= 1) return
        timer = setTimeout(beat, 60000 / Math.max(30, bpm))
    }
    beat()
    return () => {
        stopped = true
        clearTimeout(timer)
    }
}

// ---------------------------------------------------------------- one breath pacer for the whole screen (§5.2)
// Shared timings so no builder drifts. Exhale drains are LINEAR ("like through a straw").
const EOS_BREATH = {
    coreIn: 4, coreOut: 6, //            Still Point autonomous cycle (6 breaths/min)
    sighIn: 1.6, sip: 0.5, sighOut: 4.4, // Still Moment sigh (≈6.5 s, out/in ratio 2.1)
    gameIn: 2.0, gameSip: 0.6, //        111 BIG SIGH inhale + sip
    gameOut: [4.5, 5.5, 6, 6], //        111 exhale per cycle (graduated)
    beatBpm: 72, //                      spark states (numb, good): the core pulses instead of breathing
}
// Exactly one pacer drives the Still Point at a time. A game / Still Moment that paces breath calls
// eosBreathOwn("in"|"hold"|"out", ms) at each phase change and eosBreathOwn(null) when done; every other
// pacer on screen (arrow wait-ring, 112 rain, check-in core) READS eosBreathPhase() so all stay in phase.
const EOS_PACER = (() => {
    let own = null // {phase, ms, t0}
    let bpm = 0 //    a game-driven beat (117) overrides breathing
    const subs = new Set()
    const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now())
    const emit = () =>
        subs.forEach((f) => {
            try {
                f()
            } catch {}
        })
    return {
        own(phase, ms = 0) {
            own = phase ? { phase: String(phase), ms: Math.max(0, Number(ms) || 0), t0: now() } : null
            emit()
        },
        beat(next) {
            bpm = Math.max(0, Number(next) || 0)
            emit()
        },
        get() {
            const t = now()
            if (bpm) return { phase: "beat", p: ((t / (60000 / bpm)) % 1 + 1) % 1, owned: true, bpm, ms: 60000 / bpm }
            if (own) return { phase: own.phase, p: own.ms ? eosClamp((t - own.t0) / own.ms, 0, 1) : 1, owned: true, bpm: 0, ms: own.ms }
            const cyc = (EOS_BREATH.coreIn + EOS_BREATH.coreOut) * 1000
            const k = t % cyc
            const inMs = EOS_BREATH.coreIn * 1000
            return k < inMs ? { phase: "in", p: k / inMs, owned: false, bpm: 0, ms: inMs } : { phase: "out", p: (k - inMs) / (cyc - inMs), owned: false, bpm: 0, ms: cyc - inMs }
        },
        subscribe(f) {
            subs.add(f)
            return () => subs.delete(f)
        },
    }
})()
function eosBreathOwn(phase, ms) {
    EOS_PACER.own(phase, ms)
}
function eosBreathPhase() {
    return EOS_PACER.get()
}
function eosPacerBeat(bpm) {
    EOS_PACER.beat(bpm)
}

// Unique, readable chunks of the user's words (no "UPLOADED IMAGE" sentinels, no repeats).
// Pads with the current emotion's seed phrases so a game never shows "I / I / I".
// Under a strong safety flag (store or a synchronous scan of these entries) → EOS_NEUTRAL_WORDS.
function eosWords(entries, n = 6) {
    if (eosSafetyStrong(EOS_STORE.get().safety) || eosSafetyStrong(EosSafetyScan(entries))) return EOS_NEUTRAL_WORDS.slice(0, Math.max(1, n))
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
        const emo = EOS_EMO[eosCurrentEmotion()] || EOS_GUIDE_CHAR
        for (const s of emo.seeds) {
            if (out.length >= want) break
            if (!seen.has(s.toLowerCase())) {
                seen.add(s.toLowerCase())
                out.push(s)
            }
        }
    }
    return out.slice(0, n)
}
// The user's own words on any EOS object (the ONLY place user words may appear in EOS DOM, §8.0).
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

// ---- geometry (Framer canvas may scale the component: divide by root scale)
function eosStageScale(el) {
    if (!el || !el.getBoundingClientRect) return 1
    const r = el.getBoundingClientRect()
    return el.offsetWidth ? r.width / el.offsetWidth || 1 : 1
}
// Rect of `el` relative to `root` in root's unscaled CSS px: {x, y, w, h, cx, cy}.
function eosRelRect(el, root) {
    if (!el || !root) return null
    const r = el.getBoundingClientRect()
    const R = root.getBoundingClientRect()
    const k = eosStageScale(root)
    const x = (r.left - R.left) / k
    const y = (r.top - R.top) / k
    const w = r.width / k
    const h = r.height / k
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 }
}
// Current game progress 0-100 read from either wrapper's progress bar (null when absent).
function eosProgressOf(root) {
    const el = root && root.querySelector ? root.querySelector(".engineProgressTrack") : null
    const v = el ? Number(el.getAttribute("aria-valuenow")) : NaN
    return Number.isFinite(v) ? v : null
}
// The ONE shared progress poll (mood, companion, dots, arrows …): re-renders only when the rounded value
// changes. rootRef = a ref to (or inside) the game host / .releaseStage; reads the closest .releaseStage so
// both wrappers work. Returns 0-100 or null (no progress bar yet). The interval is cleaned up on unmount.
function useEosProgress(rootRef, hz = 4) {
    const [p, setP] = React.useState(null)
    React.useEffect(() => {
        let alive = true
        const read = () => {
            if (!alive) return
            const el = rootRef && rootRef.current
            const stage = el ? (el.closest && el.closest(".releaseStage")) || el : null
            const v = eosProgressOf(stage)
            const next = v == null ? null : Math.round(v)
            setP((prev) => (prev === next ? prev : next))
        }
        read()
        const t = setInterval(read, Math.max(50, 1000 / Math.max(0.5, Number(hz) || 4)))
        return () => {
            alive = false
            clearInterval(t)
        }
    }, [rootRef, hz])
    return p
}

// ---- tiny synth for musical feedback (gated by the arcade sound toggle mirrored in the store)
let eosAudioCtx = null
function eosAudio() {
    try {
        if (!EOS_STORE.get().sound || typeof window === "undefined") return null
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        if (!eosAudioCtx) eosAudioCtx = new AC()
        if (eosAudioCtx.state === "suspended") eosAudioCtx.resume().catch(() => {})
        return eosAudioCtx
    } catch {
        return null
    }
}
// eosTone(440, 160, {type:"triangle", gain:.05, glide: 660, at: 0.05})
function eosTone(freq = 440, ms = 160, opts = {}) {
    const ctx = eosAudio()
    if (!ctx) return
    try {
        const t0 = ctx.currentTime + (Number(opts.at) || 0)
        const dur = Math.max(0.03, ms / 1000)
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = opts.type || "sine"
        osc.frequency.setValueAtTime(freq, t0)
        if (opts.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.glide), t0 + dur)
        const peak = Math.min(0.2, opts.gain == null ? 0.05 : opts.gain)
        g.gain.setValueAtTime(0.0001, t0)
        g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur / 4))
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        osc.connect(g).connect(ctx.destination)
        osc.start(t0)
        osc.stop(t0 + dur + 0.02)
    } catch {}
}
// Pentatonic note i (0..∞) → Hz; used for rising "you're doing it" ladders.
function eosNote(i, base = 392) {
    const steps = [0, 2, 4, 7, 9]
    const k = Math.max(0, Math.round(Number(i) || 0))
    return base * Math.pow(2, (steps[k % 5] + 12 * Math.floor(k / 5)) / 12)
}

// ---------------------------------------------------------------- shared UI: character orb
// A glossy Pixar-style bubble with an expression inside. Renders a <button> when onClick is
// given, else a decorative <div aria-hidden>. Plain DOM: framer-motion props are DROPPED here —
// to animate it, wrap it: <motion.div layout animate=…><EosCharacterOrb …/></motion.div>.
// .eosObj ⇒ Pixar squash on press (never put .eosObj on an element whose scale/animation carries
// game state — wrap that element instead). showName → 12 px character name tag (D6).
const EOS_MOTION_PROPS = ["layout", "layoutId", "initial", "animate", "exit", "transition", "variants", "whileTap", "whileHover", "whileFocus", "whileDrag", "whileInView", "drag", "dragConstraints", "dragElastic", "dragMomentum", "dragListener", "onAnimationStart", "onAnimationComplete", "onDrag", "onDragStart", "onDragEnd", "onUpdate", "custom"]
function EosCharacterOrb({
    emotion = null,
    char,
    mood,
    which = "loud",
    size = 88,
    label,
    sub,
    hue,
    selected = false,
    dim = false,
    bob = true,
    reduced = false,
    showName = false,
    onClick,
    ariaLabel,
    className = "",
    style,
    children,
    ...rest
}) {
    const e = EOS_EMO[emotion] || (emotion === "auto" ? EOS_GUIDE_CHAR : null)
    const c = char || (e ? e.char : "still")
    const m = mood != null ? mood : e ? (which === "calm" ? e.calm : e.loud) : EOS_GUIDE_CHAR.loud
    const h = hue != null ? hue : e ? e.hue : 190
    const [broken, setBroken] = React.useState(false)
    const Tag = onClick ? "button" : "div"
    const domRest = {}
    for (const k in rest) if (!EOS_MOTION_PROPS.includes(k)) domRest[k] = rest[k]
    const cls = `eosOrb eosObj ${selected ? "isSelected" : ""} ${dim ? "isDim" : ""} ${bob && !reduced ? "isBob" : ""} ${e && e.greyLoud && which === "loud" ? "isGrey" : ""} ${className}`
    return (
        <Tag
            {...(onClick ? { type: "button", onClick, "aria-label": ariaLabel || [label, sub].filter(Boolean).join(" — ") || EOS_CHAR_NAMES[c] } : { "aria-hidden": "true" })}
            data-eos-emotion={e ? e.id : undefined}
            data-eos-char={c}
            className={cls}
            style={{ "--eos-h": h, "--eos-orb": `${size}px`, "--eos-bob": `${(eosNoise(h, 3) * 1.6 + 2.6).toFixed(2)}s`, ...style }}
            {...domRest}
        >
            <span className="eosOrbBall">
                {!broken ? (
                    <img className="eosOrbFace" src={eosFace(c, m)} alt="" draggable={false} onError={() => setBroken(true)} />
                ) : (
                    <b className="eosOrbFallback">{(EOS_CHAR_NAMES[c] || "?").slice(0, 1)}</b>
                )}
                <i className="eosOrbGloss" />
            </span>
            {label ? <b className="eosOrbLabel">{label}</b> : null}
            {sub ? <small className="eosOrbSub">{sub}</small> : null}
            {showName ? <small className="eosOrbName">{EOS_CHAR_NAMES[c]}</small> : null}
            {children}
        </Tag>
    )
}

// ---------------------------------------------------------------- shared UI: intensity dial
// 0/1-10 scrubbable segment track (role=slider, keyboard + pointer). Used by check-in (before) and the
// shift meter (after: value starts null = "–", `ghost` = before). Haptic tick + rising pitch per step.
// Words: the emotion's dialWords (5 anchors) for low-arousal states, else the loudness words.
const EOS_LOUDNESS_WORDS = ["gone", "a whisper", "a whisper", "a whisper", "noticeable", "loud", "loud", "really loud", "really loud", "ROARING", "ROARING"]
const EOS_DIAL_ANCHOR = [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4]
function eosDialWord(emotionId, n, words) {
    const v = Math.round(Number(n))
    if (!Number.isFinite(v) || v < 0 || v > 10) return ""
    const custom = words || (EOS_EMO[emotionId] && EOS_EMO[emotionId].dialWords)
    if (custom && custom.length === 11) return custom[v]
    if (custom && custom.length === 5) return custom[EOS_DIAL_ANCHOR[v]]
    return EOS_LOUDNESS_WORDS[v] || ""
}
function EosIntensityDial({ value, onChange, emotion = null, min = 1, max = 10, ghost = null, label, words, reduced = false, showWord = true, className = "", id }) {
    const trackRef = React.useRef(null)
    const lastRef = React.useRef(value)
    const digitRef = React.useRef({ k: "", t: 0 })
    const dragging = React.useRef(false)
    // keep in sync when the parent resets the value (e.g. back to null for a new loop)
    React.useEffect(() => {
        lastRef.current = value
    }, [value])
    const hue = eosHue(emotion)
    const q = label == null ? eosDialQuestion(emotion, min === 0 ? "after" : "before") : label
    const v = value == null ? null : eosClamp(Math.round(value), min, max)
    const word = (n) => eosDialWord(emotion, n, words)
    const set = (n, fromPointer) => {
        const next = eosClamp(Math.round(n), min, max)
        if (next === lastRef.current) return
        lastRef.current = next
        eosHaptic(6)
        eosTone(eosNote(next + 2, 262), 90, { type: "triangle", gain: 0.035 })
        onChange?.(next, fromPointer)
    }
    const fromX = (clientX) => {
        const el = trackRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const f = eosClamp((clientX - r.left) / Math.max(1, r.width), 0, 0.9999)
        set(min + Math.floor(f * (max - min + 1)), true)
    }
    const segs = []
    for (let n = min; n <= max; n++) segs.push(n)
    return (
        <div className={`eosDial ${className}`} style={{ "--eos-h": hue }}>
            {q ? <div className="eosDialLabel" id={id ? `${id}-label` : undefined}>{q}</div> : null}
            <div className="eosDialReadout" aria-hidden="true">
                <b className="eosDialNum">{v == null ? "–" : v}</b>
                {showWord && v != null ? <span className="eosDialWord">{word(v)}</span> : null}
            </div>
            <div
                ref={trackRef}
                className="eosDialTrack"
                role="slider"
                tabIndex={0}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={v == null ? undefined : v}
                aria-valuetext={v == null ? "not set" : `${v} — ${word(v)}`}
                aria-labelledby={id ? `${id}-label` : undefined}
                aria-label={id ? undefined : q}
                onPointerDown={(e) => {
                    dragging.current = true
                    try {
                        e.currentTarget.setPointerCapture(e.pointerId)
                    } catch {}
                    fromX(e.clientX)
                }}
                onPointerMove={(e) => {
                    if (dragging.current) fromX(e.clientX)
                }}
                onPointerUp={() => {
                    dragging.current = false
                }}
                onPointerCancel={() => {
                    dragging.current = false
                }}
                onLostPointerCapture={() => {
                    dragging.current = false
                }}
                onKeyDown={(e) => {
                    const cur = v == null ? Math.round((min + max) / 2) : v
                    let next = null
                    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = cur + 1
                    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = cur - 1
                    else if (e.key === "Home") next = min
                    else if (e.key === "End") next = max
                    else if (/^[0-9]$/.test(e.key)) {
                        // "1" then "0" within 700 ms = 10 (never "gone")
                        const now = Date.now()
                        const prev = digitRef.current
                        if (e.key === "0" && prev.k === "1" && now - prev.t < 700) next = 10
                        else if (e.key === "0") next = min === 0 ? 0 : 10
                        else next = Number(e.key)
                        digitRef.current = { k: e.key, t: now }
                    }
                    if (next == null) return
                    e.preventDefault()
                    set(next)
                }}
            >
                {segs.map((n) => (
                    <i
                        key={n}
                        className={`eosDialSeg ${v != null && n <= v ? "on" : ""} ${n === v ? "cur" : ""} ${n === ghost ? "ghost" : ""}`}
                        style={{ "--k": (n - min) / Math.max(1, max - min) }}
                    >
                        <span>{n}</span>
                    </i>
                ))}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- dev: engine preview (no arcade)
// QUICK ITERATION ONLY — it has no arcade CSS (no forced .arena rules, no guide panel, no step rewards,
// no .tsExactUserText tagging). Every acceptance check runs in a scratch integrated build instead:
//   python3 dev/eos_integrate.py --dev-dir /tmp/eos_<task> --modules <your files>
// Mounted by dev/eos_preview.html (python3 dev/eos_preview.py --id 111 …), or directly:
//   window.__eos.core.EosEnginePreview({id, text, reduced, seed})
// Publishes on window.__eosPreview (dev only):
//   {id, progress, label, done, sfx:[{kind, t}], rain:[{s, t}], progressLog:[n…], log:[{t, v, label}],
//    checks:{thirdArg, backwards, flat, outOfRange, afterDone, afterUnmount, doneCalls, nonSoft, longLabels:[…],
//            firstProgressMs, doneDelayMs}}
// i.e. the §8.0 engine contract: onProgress(value, label) — never a 3rd argument — strictly increasing 0..100,
// labels ≤ 18 chars, onDone(bonus) exactly once ~450 ms after 100, nothing after unmount.
function EosEnginePreview({ id = 111, text = "my boss yelled at me and I feel panic", reduced = false, seed: seed0 = 1 }) {
    const game = GAMES.find((g) => g.id === Number(id)) || null
    const Engine = EosEngineFor(game)
    const entries = React.useMemo(() => cleanEntries(text), [text])
    const [progress, setProgress] = React.useState(0)
    const [label, setLabel] = React.useState("")
    const [done, setDone] = React.useState(null)
    const [seed, setSeed] = React.useState(Number(seed0) || 1)
    const gen = React.useRef({ seed: Number(seed0) || 1, mounted: true })
    const st = React.useRef(null)
    const fresh = () => ({
        t0: Date.now(), last: null, done: false, at100: 0,
        pub: { id: Number(id), progress: 0, label: "", done: null, sfx: [], rain: [], progressLog: [], log: [],
            checks: { thirdArg: 0, backwards: 0, flat: 0, outOfRange: 0, afterDone: 0, afterUnmount: 0, doneCalls: 0, nonSoft: 0, longLabels: [], firstProgressMs: null, doneDelayMs: null } },
    })
    if (!st.current) st.current = fresh()
    const publish = () => {
        try {
            if (eosIsDev()) window.__eosPreview = st.current.pub
        } catch {}
    }
    React.useEffect(() => {
        publish()
        return () => {
            gen.current.mounted = false
        }
    }, [])
    // Restart = a new engine generation. Switched in the click handler (before the new engine mounts, so its
    // mount-time onProgress(0) lands in the fresh log); calls from an older generation count as afterUnmount.
    const restart = () => {
        const next = gen.current.seed + 1
        gen.current = { seed: next, mounted: true }
        st.current = fresh()
        publish()
        setDone(null)
        setProgress(0)
        setLabel("")
        setSeed(next)
    }
    // Callbacks are bound to the engine generation they were created for.
    const makeProps = (g) => ({
        onProgress: function (val, l) {
            const s = st.current
            const c = s.pub.checks
            if (gen.current.seed !== g || !gen.current.mounted) {
                c.afterUnmount++
                return publish()
            }
            if (arguments.length > 2 && arguments[2] !== undefined) c.thirdArg++
            const raw = Number(val)
            if (!Number.isFinite(raw) || raw < 0 || raw > 100) c.outOfRange++
            const p = Math.round(eosClamp(raw, 0, 100))
            if (s.done) c.afterDone++
            if (s.last != null && p < s.last) c.backwards++
            if (s.last != null && p === s.last && p > 0) c.flat++
            if (l && String(l).length > 18 && !c.longLabels.includes(String(l))) c.longLabels.push(String(l))
            const t = Date.now() - s.t0
            if (c.firstProgressMs == null) c.firstProgressMs = t
            if (p >= 100 && !s.at100) s.at100 = Date.now()
            s.last = p
            s.pub.progress = p
            s.pub.label = l || ""
            s.pub.progressLog = s.pub.progressLog.concat([p]).slice(-300)
            s.pub.log = s.pub.log.concat([{ t, v: p, label: l || "" }]).slice(-300)
            publish()
            setProgress(p)
            setLabel(l || "")
        },
        onDone: (bonus) => {
            const s = st.current
            const c = s.pub.checks
            if (gen.current.seed !== g || !gen.current.mounted) {
                c.afterUnmount++
                return publish()
            }
            c.doneCalls++
            if (s.done) return publish()
            s.done = true
            c.doneDelayMs = s.at100 ? Date.now() - s.at100 : null
            s.pub.done = bonus ?? 0
            s.pub.progress = 100
            publish()
            setDone(bonus ?? 0)
            setProgress(100)
        },
        sfx: (kind) => {
            const s = st.current
            const k = String(kind)
            if (k !== "soft") s.pub.checks.nonSoft++
            s.pub.sfx = s.pub.sfx.concat([{ kind: k, t: Date.now() - s.t0 }]).slice(-300)
            publish()
        },
        rainSfx: (secs) => {
            const s = st.current
            s.pub.rain = s.pub.rain.concat([{ s: Number(secs) || 0, t: Date.now() - s.t0 }]).slice(-100)
            publish()
        },
    })
    const cb = React.useMemo(() => makeProps(seed), [seed])
    if (!game || !Engine)
        return <div style={{ color: "#fff", font: "16px system-ui", padding: 24 }}>EOS preview: no engine registered for id {String(id)}</div>
    const c = st.current.pub.checks
    const flags = [c.thirdArg && `3rd arg ×${c.thirdArg}`, c.backwards && `backwards ×${c.backwards}`, c.outOfRange && `out of range ×${c.outOfRange}`, c.afterDone && `after done ×${c.afterDone}`, c.afterUnmount && `after unmount ×${c.afterUnmount}`, c.doneCalls > 1 && `onDone ×${c.doneCalls}`, c.longLabels.length && `label > 18: ${c.longLabels[0]}`].filter(Boolean)
    return (
        <div className="tsPixarRoot eosPreviewRoot" style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 40%,#1a1550,#05040f)" }}>
            <style>{"@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap');"}</style>
            <EosGlobalStyle />
            <div className="tsArcade stage-play eosPreview" style={{ position: "absolute", inset: 0 }}>
                <section className="releaseStage" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                    <div className="releaseGameHost" style={{ position: "absolute", inset: 0 }}>
                        <div className={`engineProgressWrap cinematicEngineShell engine-${String(game.engine).toLowerCase()}`} style={{ position: "absolute", inset: 0 }}>
                            <div className="engineProgressHud eosPreviewHud">
                                <div className="engineProgressTrack" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                                    <i style={{ width: `${progress}%` }} />
                                    <span className="engineProgressText">{`${game.name} · ${label || "…"} · ${progress}%`}</span>
                                </div>
                                <button
                                    type="button"
                                    className="eosPreviewReset"
                                    onClick={restart}
                                >
                                    ↻ restart
                                </button>
                            </div>
                            {flags.length ? <div className="eosPreviewFlags">{"contract: " + flags.join(" · ")}</div> : null}
                            <div className="cinematicContentShell" style={{ position: "absolute", inset: 0 }}>
                                <Engine
                                    key={seed}
                                    game={game}
                                    entries={entries}
                                    onProgress={cb.onProgress}
                                    onDone={cb.onDone}
                                    sfx={cb.sfx}
                                    rainSfx={cb.rainSfx}
                                    reduced={!!reduced}
                                    imageSrc=""
                                    imageSources={[]}
                                    positiveImageSources={[]}
                                    hasUserImages={false}
                                    variationSeed={seed}
                                    tapOutBpm={92}
                                    bubbleTextPx={16}
                                    finishHoldMs={3000}
                                />
                                {done != null ? <div className="eosPreviewDone">DONE · bonus {String(done)}</div> : null}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- core CSS
const EOS_CORE_CSS = `
${EOS_A}{--eos-fs-xs:12px;--eos-fs-sm:13px;--eos-fs-md:15px;--eos-fs-num:17px;--eos-fs-word:clamp(16px,1.35vw,20px);--eos-fs-hero:clamp(30px,4vw,48px);
--eos-gold-1:#FFE58A;--eos-gold-2:#FFB23E;--eos-gold-3:#FF8A2E;--eos-still:#7DE3FF;--eos-ink:#0E0C2E;--eos-glass:rgba(10,12,40,.86);
--eos-font:"Baloo 2","Nunito",Inter,system-ui,sans-serif}
@media (max-width:560px){${EOS_A}{--eos-fs-sm:12px;--eos-fs-md:14px;--eos-fs-num:15px;--eos-fs-word:15px}}
${EOS_A} .eosWord{display:inline-block;max-width:100%;font:900 var(--eos-fs-word)/1.05 var(--eos-font)!important;color:#fff!important;letter-spacing:.01em!important;text-shadow:0 2px 8px rgba(0,0,0,.65)!important;overflow-wrap:anywhere!important;white-space:normal!important;opacity:1!important;-webkit-text-stroke:0!important}
${EOS_A} .eosArena{position:absolute;inset:0;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none;font-family:var(--eos-font);--eos-safe-top:48px;--eos-safe-bottom:200px}
${EOS_A} .cinematicContentShell>.arena.eosArena{position:absolute!important;inset:0!important;padding:0!important;min-height:0!important}
@media (max-width:560px){${EOS_A} .eosArena{--eos-safe-top:104px;--eos-safe-bottom:164px}}
${EOS_A} .eosArena button{font-family:var(--eos-font)}
/* Clean button shells for EOS games (v1.2.1). The arcade skins EVERY \`.cinematicContentShell > .arena button\`
   with !important (neon gradient background, border, glow, text-shadow, and a 180 ms transform/box-shadow
   transition that makes framer-motion transforms lag). Inside .eosArena this reset removes all of it.
   Its specificity is only the ID-boosted root (:where adds nothing), so ANY game rule written as
   \`\${EOS_A} .eosG<id> …{…!important}\` beats it. React inline styles cannot beat an !important rule, so draw a
   button's visuals on a child element (span/div with inline styles) or in your CSS string with !important. */
${EOS_A} :where(.eosArena button){background:none!important;border:0!important;box-shadow:none!important;color:inherit!important;text-shadow:none!important;transition:none!important;padding:0;margin:0;font:inherit;line-height:inherit;cursor:pointer;-webkit-appearance:none;appearance:none;-webkit-tap-highlight-color:transparent}
${EOS_A} :where(.eosArena button:focus-visible){outline:3px solid var(--eos-gold-1)!important;outline-offset:3px}
${EOS_A} .eosSrOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
${EOS_A} :is(.eosCheckIn,.eosShiftMeter,.eosStillMoment,.eosSafetyCard,.eosSupportPill,.eosOrbShelf,.eosWorldChips,.eosCheckInChip) :is(button,a,[role=button]){min-height:44px;min-width:44px}
${EOS_A} .eosOrb{--eos-orb:88px;position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:6px;padding:0;margin:0;border:0;background:none;color:#fff;cursor:pointer;font-family:var(--eos-font);-webkit-tap-highlight-color:transparent;transition:opacity .25s ease,filter .25s ease}
${EOS_A} div.eosOrb{cursor:default}
${EOS_A} .eosOrbBall{position:relative;display:block;width:var(--eos-orb);height:var(--eos-orb);border-radius:50%;overflow:hidden;transition:opacity .25s ease,filter .25s ease;
background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.55),rgba(255,255,255,0) 26%),radial-gradient(circle at 50% 62%,hsla(var(--eos-h),95%,62%,.92),hsla(var(--eos-h),90%,34%,.95) 68%,hsla(var(--eos-h),80%,18%,1));
box-shadow:inset 0 -8px 18px rgba(20,8,48,.45),inset 0 5px 12px rgba(255,240,215,.25),0 10px 0 rgba(8,6,30,.45),0 18px 34px rgba(0,0,0,.45),0 0 32px hsla(var(--eos-h),100%,65%,.45)}
${EOS_A} .eosOrbFace{position:absolute;inset:7%;width:86%;height:86%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35));pointer-events:none}
${EOS_A} .eosOrb.isGrey .eosOrbFace{filter:grayscale(1) brightness(.85)}
${EOS_A} .eosOrbFallback{position:absolute;inset:0;display:grid;place-items:center;font:900 calc(var(--eos-orb)*.42)/1 var(--eos-font);color:#fff}
${EOS_A} .eosOrbGloss{position:absolute;left:18%;top:10%;width:34%;height:20%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.85),rgba(255,255,255,0));pointer-events:none}
${EOS_A} .eosOrbLabel{font:900 var(--eos-fs-md)/1 var(--eos-font);letter-spacing:.05em;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.7);white-space:nowrap}
${EOS_A} .eosOrbSub{font:700 var(--eos-fs-xs)/1.1 var(--eos-font);letter-spacing:.04em;color:rgba(230,240,255,.86);white-space:nowrap}
${EOS_A} .eosOrbName{font:900 12px/1 var(--eos-font);letter-spacing:.1em;color:hsl(var(--eos-h),100%,84%);padding:3px 7px;border-radius:999px;background:rgba(8,10,34,.7)}
${EOS_A} .eosOrb.isBob .eosOrbBall{animation:eosBob var(--eos-bob,3s) ease-in-out infinite}
${EOS_A} button.eosOrb:hover .eosOrbBall,${EOS_A} button.eosOrb:focus-visible .eosOrbBall{filter:brightness(1.12) saturate(1.1);box-shadow:inset 0 -8px 18px rgba(20,8,48,.45),inset 0 5px 12px rgba(255,240,215,.25),0 10px 0 rgba(8,6,30,.45),0 18px 34px rgba(0,0,0,.45),0 0 0 3px #fff,0 0 46px hsla(var(--eos-h),100%,65%,.75)}
${EOS_A} button.eosOrb:focus-visible{outline:none}
${EOS_A} .eosOrb.isSelected .eosOrbBall{box-shadow:inset 0 -8px 18px rgba(20,8,48,.45),0 0 0 4px var(--eos-gold-1),0 0 60px hsla(var(--eos-h),100%,65%,.9)}
${EOS_A} .eosOrb.isDim{opacity:1;filter:none}
${EOS_A} .eosOrb.isDim .eosOrbBall{opacity:.35;filter:saturate(.4)}
${EOS_A} .eosOrb.isDim :is(.eosOrbLabel,.eosOrbSub,.eosOrbName){opacity:.8}
${EOS_A} .eosDial{display:flex;flex-direction:column;align-items:center;gap:8px;width:min(100%,520px);font-family:var(--eos-font);color:#fff}
${EOS_A} .eosDialLabel{font:900 var(--eos-fs-md)/1.1 var(--eos-font);letter-spacing:.04em;text-align:center}
${EOS_A} .eosDialReadout{display:flex;align-items:baseline;gap:10px;min-height:44px}
${EOS_A} .eosDialNum{font:900 var(--eos-fs-hero)/1 var(--eos-font);font-variant-numeric:tabular-nums;background:linear-gradient(180deg,#fff7c8,#ffd04a 55%,#ff9a2e);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(90,30,0,.5))}
${EOS_A} .eosDialWord{font:800 var(--eos-fs-sm)/1 var(--eos-font);letter-spacing:.08em;text-transform:uppercase;color:hsl(var(--eos-h),100%,82%)}
${EOS_A} .eosDialTrack{position:relative;display:flex;gap:4px;width:100%;height:52px;padding:6px;border-radius:999px;background:rgba(8,10,34,.82);border:2px solid rgba(255,255,255,.18);box-shadow:inset 0 3px 10px rgba(0,0,0,.5),0 6px 0 rgba(6,6,30,.55);touch-action:none;cursor:pointer;outline:none}
${EOS_A} .eosDialTrack:focus-visible{box-shadow:0 0 0 3px var(--eos-gold-1),inset 0 3px 10px rgba(0,0,0,.5)}
${EOS_A} .eosDialSeg{position:relative;flex:1;min-width:0;border-radius:999px;display:grid;place-items:center;background:rgba(255,255,255,.07);transition:background .18s ease,transform .18s cubic-bezier(.3,1.6,.4,1)}
${EOS_A} .eosDialSeg span{font:800 var(--eos-fs-sm)/1 var(--eos-font);color:rgba(255,255,255,.78);font-variant-numeric:tabular-nums;pointer-events:none}
${EOS_A} .eosDialSeg.on{background:linear-gradient(180deg,hsl(calc(190 + (var(--eos-h) - 190) * var(--k)),95%,64%),hsl(calc(190 + (var(--eos-h) - 190) * var(--k)),90%,44%))}
${EOS_A} .eosDialSeg.on span{color:var(--eos-ink)}
${EOS_A} .eosDialSeg.cur{transform:scale(1.12);box-shadow:0 0 0 2px #fff,0 0 16px hsla(var(--eos-h),100%,70%,.8)}
${EOS_A} .eosDialSeg.ghost::after{content:"";position:absolute;left:50%;top:-9px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:var(--eos-gold-1);box-shadow:0 0 8px var(--eos-gold-2)}
@media (max-width:560px){${EOS_A} .eosDialTrack{height:48px;gap:3px;padding:5px}${EOS_A} .eosDialSeg span{font-size:12px}}
${EOS_A}.eosPreview .eosPreviewHud{position:absolute;top:8px;right:10px;left:10px;z-index:50;display:flex;gap:8px;align-items:center}
${EOS_A}.eosPreview .engineProgressTrack{position:relative;flex:1;height:26px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
${EOS_A}.eosPreview .engineProgressTrack>i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#3fe6ff,#7c6bff 45%,#ff6fd8 75%,#ffd36b);transition:width .25s ease}
${EOS_A}.eosPreview .engineProgressText{position:relative;display:block;text-align:center;font:800 13px/26px var(--eos-font);color:#fff}
${EOS_A}.eosPreview .eosPreviewReset{font:800 13px/1 var(--eos-font);padding:8px 12px;border-radius:999px;border:0;background:#fff;color:#111;cursor:pointer}
${EOS_A}.eosPreview .eosPreviewFlags{position:absolute;top:44px;left:10px;right:10px;z-index:50;padding:6px 10px;border-radius:10px;background:rgba(160,20,40,.88);color:#fff;font:800 13px/1.2 var(--eos-font);pointer-events:none}
${EOS_A}.eosPreview .eosPreviewDone{position:absolute;left:50%;bottom:16px;translate:-50% 0;z-index:60;padding:10px 16px;border-radius:999px;background:#ffd04a;color:#2a1600;font:900 15px/1 var(--eos-font)}
@keyframes eosPulse{0%,100%{opacity:.7;scale:.96}50%{opacity:1;scale:1.04}}
@keyframes eosPop{0%{scale:.6;opacity:0}60%{scale:1.08;opacity:1}100%{scale:1}}
@keyframes eosBob{0%,100%{translate:0 0}50%{translate:0 -6px}}
@keyframes eosSquash{0%{scale:1 1}14%{scale:1.16 .8}34%{scale:.88 1.14}54%{scale:1.06 .95}74%{scale:.98 1.02}100%{scale:1 1}}
@media (prefers-reduced-motion:reduce){${EOS_A} .eosOrb.isBob .eosOrbBall{animation:none}${EOS_A} .eosDialSeg{transition:none}}
${EOS_A}[data-eos-calm="1"] .eosOrb.isBob .eosOrbBall{animation:none}
`
eosCss("core", EOS_CORE_CSS)

// Dev / test handle (window.__eos.core exists only when eosIsDev()). dev/eos_drive.mjs reads these.
eosExpose("core", {
    EOS_VERSION,
    EOS_STORE,
    EOS_STORE_INITIAL,
    EOS_EMOTIONS,
    EOS_EMO,
    EOS_KEYS,
    EOS_ENGINES,
    EOS_GAME_META,
    EOS_GAME_FIELDS,
    EOS_GESTURE_NAMES,
    EOS_GUIDE_CHAR,
    EOS_CHAR_NAMES,
    EOS_WIN_FACES,
    EOS_LEXICON,
    EOS_SAFETY_LEX,
    EOS_TEXT_SAFETY,
    EOS_NEUTRAL_WORDS,
    EOS_COPY_RULES,
    EOS_DISCLAIMER,
    EOS_DISCHARGE_IDS,
    EOS_SLOW_IDS,
    EOS_PROP_DEFAULTS,
    EOS_PREF_DEFAULTS,
    EOS_PRIVATE_ATTRS,
    EOS_BREATH,
    EOS_PACER,
    EOS_HAPTIC,
    EOS_Z,
    GAMES,
    eosIsDev,
    eosGet,
    eosSet,
    eosSessions,
    eosDays,
    eosPushSession,
    eosLearnedCount,
    eosPrefs,
    eosSetPref,
    eosWords,
    eosTarget,
    eosFaceFor,
    eosFacePool,
    eosHue,
    eosGrade,
    eosCurrentEmotion,
    eosDetectEmotion,
    eosGuessIntensity,
    eosBand,
    eosDialQuestion,
    eosDialWord,
    eosMeterWord,
    eosProgressOf,
    eosStageScale,
    eosRelRect,
    EosSafetyScan,
    eosRealThreat,
    eosSafetyStrong,
    eosTextSafety,
    EosFlagSafety,
    eosBreathPhase,
    eosBreathOwn,
    eosPacerBeat,
    eosCalm,
    eosDayPart,
    eosLateNight,
    eosNoise,
    EosEngineFor,
    EosCommitCheckin,
    EosSkipCheckin,
    EosOpenCheckin,
    EosMarkLaunch,
    EosMarkFinish,
    EosRecordShift,
    EosResetFeeling,
    EosEnginePreview,
    apis: () => Object.keys(EOS_DEV).filter((k) => k !== "version"),
    cssParts: () => Array.from(EOS_CSS_PARTS.keys()),
    cssText: () => Array.from(EOS_CSS_PARTS.values()).join("\n"),
})
