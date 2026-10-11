// ThinkStill Release — V21 · "Still" redesign
// A complete, self-contained Framer code component. No external scripts, no paid services.
//
//   FEEL IT → SEE IT → INTERACT WITH IT → TRANSFORM IT → LET IT GO → FEEL THE DIFFERENCE
//
// Structure of this file
//   1. Engine      — emotions, launch rituals, router, no-repeat rotation, safety scan, storage.
//                    Ported from the V19 engine so routing, history and rotation stay compatible.
//   2. Feedback    — synthesised sound effects, haptics, shared music source.
//   3. Theme       — Bright / Dark tokens, typography, global styles.
//   4. Ritual kit  — stage, particles, drag physics, companion character, word items.
//   5. Rituals     — 35 rituals, each with its own interaction, pacing and finale.
//   6. App         — welcome, express, match, ritual, reflect, close; navigation, settings, support.
//
// Persistent data stays compatible with V19:
//   eos_sessions_v1, eos_days_v1, eos_prefs_v1, eos_rotation_strict_v2 (+ eos_rotation_v1 migration),
//   __ts_release_arcade_played_v1, ts_release_haptics, ts_release_music_volume,
//   __ts_reset_shared_media_v1 (shared music source, read only).

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, AnimatePresence } from "framer-motion"

/** @framerIntrinsicWidth 390
 *  @framerIntrinsicHeight 844
 *  @framerSupportedLayoutWidth any
 *  @framerSupportedLayoutHeight any
 */

/* ================================================================== */
/* 1. ENGINE                                                           */
/* ================================================================== */

type CharSlug = "sync" | "rush" | "glitch" | "loopie" | "drop" | "patch" | "still"
type Band = "high" | "mid" | "low"
type SafetyFlag = "soft" | "threat" | "abuse" | "selfharm" | null

interface Emotion {
    id: string
    label: string
    char: CharSlug
    loud: number
    calm: number
    hue: number
    calmHue: number
    dial: number
    better: "up" | "down"
    question: [string, string]
    scale: [string, string]
    seeds: string[]
}

const EMOTIONS: Emotion[] = [
    { id: "anger", label: "Angry", char: "rush", loud: 29, calm: 44, hue: 4, calmHue: 172, dial: 8, better: "down", question: ["How hot is it right now?", "How hot is it now?"], scale: ["Cool", "Boiling"], seeds: ["hot face", "clenched jaw", "had enough", "boiling over"] },
    { id: "anxiety", label: "Anxious", char: "glitch", loud: 15, calm: 10, hue: 262, calmHue: 200, dial: 7, better: "down", question: ["How loud are the what-ifs?", "How loud are they now?"], scale: ["Quiet", "Very loud"], seeds: ["what if", "on edge", "tight shoulders", "can't settle"] },
    { id: "overwhelm", label: "Overwhelmed", char: "sync", loud: 48, calm: 61, hue: 214, calmHue: 188, dial: 7, better: "down", question: ["How full does it feel?", "How full does it feel now?"], scale: ["Spacious", "Overflowing"], seeds: ["too much", "no time", "everything at once", "can't start"] },
    { id: "sad", label: "Sad", char: "drop", loud: 58, calm: 3, hue: 218, calmHue: 26, dial: 6, better: "down", question: ["How heavy is it?", "How heavy is it now?"], scale: ["Light", "Crushing"], seeds: ["heavy heart", "miss it", "it hurts", "so tired"] },
    { id: "overthinking", label: "Overthinking", char: "loopie", loud: 58, calm: 70, hue: 284, calmHue: 160, dial: 6, better: "down", question: ["How loud is the loop?", "How loud is the loop now?"], scale: ["Quiet", "On repeat"], seeds: ["on replay", "that thought", "busy mind", "again and again"] },
    { id: "panic", label: "Panicky", char: "sync", loud: 44, calm: 90, hue: 196, calmHue: 40, dial: 8, better: "down", question: ["How fast is it going?", "How fast is it now?"], scale: ["Slow", "Racing"], seeds: ["racing heart", "tight chest", "too fast", "right now"] },
    { id: "lonely", label: "Lonely", char: "drop", loud: 70, calm: 8, hue: 230, calmHue: 34, dial: 6, better: "down", question: ["How alone does it feel?", "How alone does it feel now?"], scale: ["Connected", "Completely alone"], seeds: ["all alone", "left out", "want company", "quiet room"] },
    { id: "shame", label: "Ashamed", char: "patch", loud: 73, calm: 72, hue: 22, calmHue: 345, dial: 6, better: "down", question: ["How loud is the harsh voice?", "How loud is it now?"], scale: ["Kind", "Harsh"], seeds: ["that moment", "the cringe", "want to hide", "replaying it"] },
    { id: "fear", label: "Scared", char: "glitch", loud: 11, calm: 7, hue: 250, calmHue: 45, dial: 7, better: "down", question: ["How big is the fear?", "How big is it now?"], scale: ["Small", "Huge"], seeds: ["so scared", "dread", "the unknown", "racing mind"] },
    { id: "jealous", label: "Jealous", char: "patch", loud: 70, calm: 11, hue: 92, calmHue: 43, dial: 5, better: "down", question: ["How sharp is the pang?", "How sharp is it now?"], scale: ["Faint", "Sharp"], seeds: ["that pang", "comparing", "want that too", "scrolling"] },
    { id: "numb", label: "Numb", char: "sync", loud: 34, calm: 61, hue: 186, calmHue: 315, dial: 5, better: "down", question: ["How far away do you feel?", "How far away do you feel now?"], scale: ["Right here", "Totally blank"], seeds: ["feel nothing", "flat", "empty", "far away"] },
    { id: "good", label: "Good", char: "still", loud: 61, calm: 90, hue: 46, calmHue: 48, dial: 6, better: "up", question: ["How good is it?", "How good is it now?"], scale: ["Meh", "Glowing"], seeds: ["good moment", "grateful", "proud", "light"] },
]
const AUTO_EMOTION: Emotion = { id: "auto", label: "Not sure", char: "still", loud: 41, calm: 15, hue: 200, calmHue: 195, dial: 6, better: "down", question: ["How big does it feel?", "How big does it feel now?"], scale: ["Small", "Huge"], seeds: ["a lot on my mind", "this feeling", "right now", "one thing"] }
const EMO: Record<string, Emotion> = Object.fromEntries(EMOTIONS.map((e) => [e.id, e]))
const EMO_ORDER = ["panic", "anger", "fear", "anxiety", "shame", "overwhelm", "overthinking", "sad", "lonely", "jealous", "numb", "good"]
const emotionOf = (id: string | null | undefined): Emotion => (id && EMO[id]) || AUTO_EMOTION

const CHAR_NAMES: Record<CharSlug, string> = { sync: "Sync", rush: "Rush", glitch: "Glitch", loopie: "Loopie", drop: "Drop", patch: "Patch", still: "Still" }

// Expression pools from the V19 bubble-expression map (E01–E100 per character).
const FACE_POOLS: Record<"negative" | "positive", Record<CharSlug, number[]>> = {
    negative: { glitch: [11, 15, 56, 63, 70], drop: [44, 58, 70, 80], still: [41, 63], patch: [70, 73, 80], loopie: [29, 34, 54, 58], rush: [29, 52, 58, 63, 80], sync: [44, 48] },
    positive: { glitch: [7, 10], drop: [3, 6, 8, 9, 52], still: [15, 34, 61, 70, 90], patch: [11, 20, 32, 52, 58, 63, 72, 75], loopie: [15, 20, 32, 41, 63, 70], rush: [11, 20, 34, 44, 70], sync: [11, 20, 34, 61, 63, 70, 80, 90] },
}
const DEFAULT_FACE_BASE = "https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/bubble-expressions/"
let FACE_BASE = DEFAULT_FACE_BASE
const faceUrl = (char: CharSlug, n: number) => `${FACE_BASE}${char}_E${String(Math.max(1, Math.min(100, Math.round(n)))).padStart(2, "0")}.webp`

/** Four-step expression ladder: loud → softening → easing → calm. */
function faceLadder(emo: Emotion, charOverride?: CharSlug): string[] {
    const char = charOverride || emo.char
    const own = charOverride ? null : emo
    const neg = FACE_POOLS.negative[char].filter((n) => n !== own?.loud)
    const pos = FACE_POOLS.positive[char].filter((n) => n !== own?.calm)
    const loud = own ? own.loud : FACE_POOLS.negative[char][0]
    const calm = own ? own.calm : FACE_POOLS.positive[char][FACE_POOLS.positive[char].length - 1]
    return [faceUrl(char, loud), faceUrl(char, neg[0] ?? loud), faceUrl(char, pos[0] ?? calm), faceUrl(char, calm)]
}

/* ---------- Rituals ---------- */

interface RitualMeta {
    id: number
    name: string
    family: string
    prompt: string
    hint: string
    seconds: number
    count: number // how many word items the ritual uses
    reflection: string
    hero?: CharSlug
}

// The 30 curated V19 launch rituals + 5 rituals named in the V21 brief.
const RITUALS: RitualMeta[] = [
    { id: 1, name: "Pop", family: "Destroy", prompt: "What do you want to pop?", hint: "Press a bubble, then let go", seconds: 30, count: 5, reflection: "Big thought. Tiny pop." },
    { id: 6, name: "Zap", family: "Destroy", prompt: "What thought keeps buzzing around?", hint: "Hold to charge the current", seconds: 35, count: 1, reflection: "You decided when the current flowed." },
    { id: 15, name: "Shred", family: "Destroy", prompt: "What should stop getting another read?", hint: "Pull the page down into the blades", seconds: 30, count: 1, reflection: "Break the shape. Break the hold." },
    { id: 16, name: "Melt", family: "Destroy", prompt: "What do you want to melt down?", hint: "Hold to warm it", seconds: 40, count: 1, reflection: "What looked fixed can change shape." },
    { id: 18, name: "Burn", family: "Release", prompt: "What sentence are you done carrying?", hint: "Hold the page to let the flame move", seconds: 40, count: 1, reflection: "A sentence can lose its form without another argument." },
    { id: 22, name: "Flush", family: "Discard", prompt: "What do you want to send down the drain?", hint: "Circle the water to start the swirl", seconds: 35, count: 4, reflection: "Change the direction of the motion." },
    { id: 23, name: "Vacuum", family: "Discard", prompt: "What clutter is taking up headspace?", hint: "Hold and guide the nozzle", seconds: 40, count: 5, reflection: "Change the move. Change the size." },
    { id: 24, name: "Slingshot", family: "Distance", prompt: "What do you want farther away for a minute?", hint: "Pull the word back, then let go", seconds: 40, count: 3, reflection: "Distance changes how large something feels." },
    { id: 25, name: "Swipe Away", family: "Discard", prompt: "What deserves a hard swipe?", hint: "Grab the card and commit to the swipe", seconds: 25, count: 3, reflection: "A thought can return without you holding the card." },
    { id: 29, name: "Mute", family: "Distance", prompt: "What thought is way too loud?", hint: "Slide the volume all the way down", seconds: 25, count: 1, reflection: "Quiet is enough. Gone is optional." },
    { id: 32, name: "Park It", family: "Discard", prompt: "What can wait until later?", hint: "Drive each one into a bay", seconds: 35, count: 3, reflection: "Later is a real place." },
    { id: 36, name: "Cloud Pass", family: "Distance", prompt: "What is hanging over you?", hint: "One slow, steady push", seconds: 35, count: 1, reflection: "More effort is not always more movement." },
    { id: 39, name: "Black Hole", family: "Distance", prompt: "What do you want ridiculously far away?", hint: "Hold to deepen the gravity", seconds: 35, count: 4, reflection: "Even a giant thought is tiny in a bigger frame." },
    { id: 40, name: "Paper Plane", family: "Distance", prompt: "What message are you done carrying?", hint: "Tap to fold, then swipe to launch", seconds: 35, count: 2, reflection: "Perfect control wasn't required." },
    { id: 41, name: "Unhook", family: "Detach", prompt: "What are you hooked onto?", hint: "Swipe across a string to cut it", seconds: 30, count: 3, reflection: "Attached is not the same as permanent." },
    { id: 47, name: "Unfollow", family: "Detach", prompt: "What keeps looping in your feed?", hint: "Pull the cable until it lets go", seconds: 30, count: 1, reflection: "Repetition needs a connection." },
    { id: 52, name: "Subtitles", family: "Reframe", prompt: "What is your brain narrating?", hint: "Try a different narrator", seconds: 40, count: 1, reflection: "Tone can masquerade as truth." },
    { id: 61, name: "Freeze", family: "Interrupt", prompt: "What thought keeps racing?", hint: "Tap to add frost", seconds: 30, count: 1, reflection: "You can interrupt the motion." },
    { id: 75, name: "Ink Bleed", family: "Release", prompt: "What phrase feels too rigid in your head?", hint: "Drag the drop through the words", seconds: 30, count: 1, reflection: "Rigid words are made of fluid shapes." },
    { id: 79, name: "Miss on Purpose", family: "Interrupt", prompt: "What are you trying to get perfectly right?", hint: "Tap the beats — skip the glowing one", seconds: 40, count: 1, reflection: "A chosen miss stops feeling so huge." },
    { id: 87, name: "Keep / Drop", family: "Choice", prompt: "What pieces of this do you want to keep?", hint: "Swipe right to keep, left to drop", seconds: 30, count: 5, reflection: "Release doesn't mean throwing everything away." },
    { id: 88, name: "Trade Machine", family: "Choice", prompt: "What are you spending attention on?", hint: "Drop the token in the slot", seconds: 35, count: 1, reflection: "Attention is the coin." },
    { id: 97, name: "X-Ray", family: "Reveal", prompt: "What looks solid from the outside?", hint: "Sweep the scanner across", seconds: 40, count: 5, reflection: "Solid-looking thoughts have parts." },
    { id: 100, name: "Hot Potato", family: "Reveal", prompt: "What are you desperate not to hold?", hint: "Drag each one away from you", seconds: 30, count: 4, reflection: "What you stop clutching cools down fast." },
    { id: 101, name: "Tug of War", family: "Reveal", prompt: "What are you fighting with?", hint: "Pull until it strains, then let go", seconds: 50, count: 4, reflection: "Not every contest needs a winner." },
    { id: 102, name: "Finger Trap", family: "Reveal", prompt: "What gets tighter the more you force it?", hint: "Push inward to loosen", seconds: 35, count: 3, reflection: "It loosens when you stop fighting it." },
    { id: 105, name: "Drama Machine", family: "Absurdity", prompt: "What is your brain making cinematic?", hint: "Switch on every effect", seconds: 35, count: 1, reflection: "Drama effects are still effects." },
    { id: 106, name: "Tiny Soundtrack", family: "Absurdity", prompt: "What deserves a ridiculously tiny soundtrack?", hint: "Choose a tone, then play", seconds: 35, count: 4, reflection: "You can change the production." },
    { id: 107, name: "Go Weird", family: "Absurdity", prompt: "What thought is acting way too serious?", hint: "Drag the props onto it", seconds: 35, count: 1, reflection: "Serious-looking is a costume too." },
    { id: 109, name: "Cleanse", family: "Release", prompt: "What do you want to clear out?", hint: "Hold the lotus until it glows, then let go", seconds: 45, count: 5, reflection: "One move at a time changes the grip." },
    { id: 110, name: "Rain Out", family: "Release", prompt: "What has built up today?", hint: "Pull each cloud down", seconds: 40, count: 4, reflection: "Emptying is different from exploding." },
    { id: 111, name: "Big Sigh", family: "Release", prompt: "Where is the storm in you right now?", hint: "Hold to breathe in · slide up for one more sip · let go", seconds: 35, count: 4, reflection: "Your exhale is the off-switch.", hero: "sync" },
    { id: 112, name: "Cool the Volcano", family: "Destroy", prompt: "What's boiling over?", hint: "Tap the crater to let it blow", seconds: 35, count: 3, reflection: "Fire needs a minute. Cooling is the strong move.", hero: "rush" },
    { id: 113, name: "Ground Control", family: "Balance", prompt: "What's the what-if?", hint: "Light the beacons to land", seconds: 40, count: 5, reflection: "Right here is where things are actually happening.", hero: "glitch" },
    { id: 114, name: "Sky Lanterns", family: "Release", prompt: "What feels heavy or lonely right now?", hint: "Hold a lantern to warm it, then flick it up", seconds: 30, count: 3, reflection: "Missing someone means you loved something.", hero: "drop" },
]
const RITUAL_BY_ID: Record<number, RitualMeta> = Object.fromEntries(RITUALS.map((r) => [r.id, r]))
const LAUNCH_IDS = [111, 102, 114, 112, 1, 110, 100, 6, 105, 41, 29, 113, 101, 36, 107, 25, 61, 106, 32, 39, 40, 88, 75, 22, 97, 87, 79, 47, 15, 52]
const BRIEF_IDS = [18, 16, 109, 23, 24]

/* ---------- V19 routing tables (verbatim) ---------- */

const ROUTES: Record<string, Record<Band, number[]>> = { panic: { high: [111, 109, 102, 36, 65, 69, 66], mid: [111, 102, 36, 44, 77, 113, 65, 55, 11], low: [105, 55, 104, 1, 113] }, anxiety: { high: [111, 113, 102, 109, 66], mid: [113, 95, 32, 101, 24, 34, 31, 85, 67], low: [1, 104, 86, 30, 105, 72] }, anger: { high: [112, 109, 65, 111, 100], mid: [112, 100, 6, 4, 15, 2, 18, 61, 68, 101, 8, 13, 14], low: [52, 107, 71, 64, 11, 37, 53] }, overthinking: { high: [111, 61, 116, 34], mid: [116, 34, 61, 104, 43, 41, 22, 29, 6, 99, 19], low: [105, 107, 52, 104, 59, 98] }, overwhelm: { high: [111, 120, 93, 21], mid: [120, 93, 95, 21, 87, 32, 30, 28], low: [120, 85, 30, 39, 81] }, sad: { high: [110, 114, 109], mid: [110, 114, 33, 40, 75, 106], low: [106, 88, 117, 114] }, lonely: { high: [114, 110, 115], mid: [114, 106, 88, 115, 110, 117], low: [117, 106, 114, 115, 88] }, shame: { high: [115, 109, 110], mid: [115, 104, 84, 110, 109, 79, 75], low: [107, 53, 79, 51] }, fear: { high: [111, 102, 113], mid: [118, 31, 97, 53, 86, 89], low: [107, 105, 53] }, jealous: { high: [119, 115, 47], mid: [119, 47, 45, 25, 115, 41], low: [119, 88, 117] }, numb: { high: [117, 68, 1, 100, 6, 74], mid: [117, 68, 1, 106, 107, 25, 100, 6, 74], low: [117, 106, 107, 25, 1] }, good: { high: [117, 119, 106, 88], mid: [117, 119, 106, 88, 1, 25, 105, 107], low: [119, 117, 106, 88, 53, 107] }, general: { high: [111, 1, 102, 109], mid: [1, 102, 100, 110, 25, 93], low: [1, 105, 107, 25] } }
const SECOND_ACT: Record<string, number[]> = { panic: [111, 109, 102], anxiety: [113, 111, 102], anger: [112, 109, 65], overthinking: [113, 116, 111], overwhelm: [120, 93, 111], sad: [114, 106, 110], lonely: [114, 106, 117], shame: [115, 109, 110], fear: [118, 111, 102], jealous: [119, 115, 117], numb: [117, 68, 106], good: [119, 117, 106], general: [111, 1, 110] }
const GENTLE_IDS = [113, 111, 109, 110, 102, 95, 114, 115, 106, 40, 120, 119]
const ANGER_DISCHARGE = new Set([2, 3, 4, 5, 6, 13, 15, 18, 61, 68, 100, 101])
const DESTRUCTIVE = new Set([...ANGER_DISCHARGE, 8, 9, 14, 16, 19, 20, 71, 97])
const EXCLUDE: Record<string, { all?: Set<number>; high?: Set<number>; mid?: Set<number>; low?: Set<number> }> = { panic: { all: new Set([71]) }, shame: { all: new Set([14, 15, 18, 19]), high: DESTRUCTIVE }, sad: { high: DESTRUCTIVE }, lonely: { high: DESTRUCTIVE }, fear: { high: new Set([118]) }, good: { all: new Set([...DESTRUCTIVE, 25, 88, 53]) } }
const SOFT_ALLOW: Record<string, Set<number>> = { anger: new Set([112]) }
const BAND_ORDER: Record<Band, Band[]> = { high: ["high", "mid", "low"], mid: ["mid", "high", "low"], low: ["low", "mid", "high"] }
const BAND_LEVEL: Record<Band, number> = { high: 8, mid: 6, low: 2 }
const SAFETY_RANK: Record<string, number> = { soft: 1, threat: 2, abuse: 3, selfharm: 4 }
const NEUTRAL_WORDS = ["this feeling", "a heavy moment", "right now", "one breath", "still here", "a little space"]
const DISCLAIMER = "ThinkStill is a gentle tool for everyday feelings — not therapy, diagnosis or a crisis service."
const SUPPORT_DEFAULTS = {
    lines: "US · 988 | Canada · 988 | UK & IE · Samaritans 116 123 | Australia · Lifeline 13 11 14 | India · Tele-MANAS 14416 | Anywhere · findahelpline.com",
    url: "https://findahelpline.com",
    emergency: "In immediate danger? Call your local emergency number.",
}

/* ---------- Text understanding (V19 classifier, verbatim patterns) ---------- */

const normText = (v: unknown) => (Array.isArray(v) ? v.join(" ") : String(v || "")).replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim()
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number(v) || 0))

const EMOTION_PATTERNS: Record<string, [RegExp, number][]> = {panic:[[/\bpanic\w*|\bfreak(?:ing|ed|s)?\s*out\b|\bheart\s*(?:is\s*)?(?:racing|pounding)\b|\bcan'?t\s*breathe\b|\bhyperventilat\w*|\bchest\s*(?:is\s*)?tight\w*|\blosing\s*(?:it|control)\b|\bpanick\w*/gi,1.6],[/\bshak(?:ing|y)\b|\btrembl\w*|\bdizz\w*|\bsweat(?:y|ing)\b|\bheart\s+(?:is\s+)?beating\s+(?:so\s+)?fast\b|\bracing\s+heart\b|\btight\s+chest\b/gi,1.1]],anger:[[/\bang(?:er|ry|rier|rily|ered)\b|\bfurious\b|\bfury\b|\brag(?:e|ed|es|ing)\b|\bpissed\b|\blivid\b|\bfuming\b|\bseething\b|\bboiling\b|\bfed\s+up\b|\bso\s+unfair\b|\bhate[ds]?\b(?!\s+(?:me|myself|my\s+life)\b)|\bresent\w*/gi,1.5],[/\bmad\b|\birritat\w*|\bannoy\w*|\bfrustrat\w*|\bunfair\b|\byell(?:ed|ing|s)?\b|\b(?:shout|scream)(?:ed|ing|s)?\s+at\b/gi,1],[/\bpunch\w*|\bsmash\w*|\bscream(?:ing)?\b|\bexplod\w*|\bsick\s+of\b|\bwant\s+to\s+(?:hit|break)\b/gi,1.2]],fear:[[/\bscar(?:ed|y)\b|\bafraid\b|\bfear\w*|\bterrif\w*|\bfrighten\w*|\bpetrified\b/gi,1.4]],anxiety:[[/\banxi\w*|\bworr\w*|\bnervous\w*|\buneasy\b|\bon\s+edge\b|\bwhat\s+if\b|\bdread\w*|\bapprehensi\w*/gi,1.3],[/\btens(?:e|ed|ion)\b|\brestless\w*|\bcan'?t\s+sleep\b|\bmind\s+(?:is\s+)?racing\b|\bjitter\w*|\bbutterflies\b|\bstressed\s+about\b/gi,1.3]],shame:[[/\bsham\w*|\basham\w*|\bguilt\w*|\bembarrass\w*|\bhumiliat\w*|\bnot\s+good\s+enough\b|\bworthless\b|\bhate\s+myself\b|\bmy\s+fault\b|\bmessed\s+up\b|\bcringe\w*/gi,1.5],[/\bstupid\b|\bidiot\b|\bfailure\b|\bloser\b|\bregret\w*/gi,1],[/\binsecur\w*|\bself[-\s]?doubt\w*|\bimpost(?:o|e)r\w*|\bugly\b|\buseless\b|\bburden\b|\bpathetic\b/gi,1.3]],overwhelm:[[/\boverwhelm\w*|\btoo\s+much\b|\bswamped\b|\bdrowning\b|\bso\s+much\s+to\s+do\b|\bburn(?:ed|t)?\s*out\b|\boverload\w*|\bcan'?t\s+cope\b/gi,1.4],[/\bstress\w*|\bexhausted\b|\bno\s+time\b|\bbehind\b/gi,1],[/\bdrained\b|\bdeadlines?\b|\bpressure\b|\bstuck\b|\btired\b/gi,.8]],overthinking:[[/\boverthink\w*|\bover-thinking\b|\bruminat\w*|\bcan'?t\s+stop\s+thinking\b|\bon\s+(?:a\s+)?(?:loop|repeat|replay)\b|\breplay\w*|\bobsess\w*|\bsecond[-\s]guess\w*|\bgoing\s+round\b|\bspiral\w*/gi,1.4]],sad:[[/\bsad\w*|\bunhappy\b|\bcry\w*|\bcried\b|\btears?\b|\bgriev\w*|\bgrief\b|\bheartbr\w*|\bdepress\w*|\bgutted\b|\bmiss(?:ing)?\s+(?:him|her|them|you|my)\b/gi,1.4],[/\bdown\b|\blow\b|\bhurt(?:s|ing)?\b|\bblue\b/gi,.6],[/\bhopeless\w*|\bbr(?:oke|eak(?:ing)?)\s*up\b|\bbreakup\b|\bdumped\b|\bmiserable\b|\bdevastat\w*|\blost\s+(?:my|him|her)\b|\bhate\s+my\s+life\b/gi,1.3]],lonely:[[/\blonel\w*|\balone\b|\bisolat\w*|\bleft\s+out\b|\bnobody\b|\bno\s+one\s+(?:cares|gets|listens)\b|\bno\s+friends\b|\bunseen\b|\binvisible\b|\bexcluded\b/gi,1.4],[/\bghost(?:ed|ing)\b|\breject\w*|\babandon\w*|\bignored\b|\bunwanted\b|\b(?:every(?:one|body)|they\s+all|people)\s+hates?\s+me\b/gi,1.4]],jealous:[[/\bjealous\w*|\benvy\b|\benvious\b|\bcompar\w*|\bwhy\s+not\s+me\b|\bbetter\s+than\s+me\b|\bfomo\b/gi,1.4]],numb:[[/\bnumb\w*|\bempty\b|\bfeel\s+nothing\b|\bnothing\s+(?:matters|feels)\b|\bhollow\b|\bapath\w*|\bdisconnect\w*/gi,1.4],[/\bflat\b|\bblank\b|\bmeh\b|\bbored\b/gi,.8]],good:[[/\bgood\b|\bgreat\b|\bhappy\b|\bgrateful\b|\bthankful\b|\bproud\b|\bcalm\b|\bpeaceful\b|\bexcited\b|\bjoy\w*|\brelieved\b/gi,.8]]}
const HEDGE = /\b(?:a\s+(?:bit|little)|slightly|kinda|kind\s+of|sort\s+of|somewhat|mildly|little\s+bit)\b/i

function guessIntensity(text: string): number {
    const t = normText(text)
    if (!t) return 5
    let v = 5
    v += Math.min(2, (t.match(/\b(?:so|really|very|extremely|totally|completely|absolutely|can'?t|cannot|never|always|so\s+much)\b/gi) || []).length)
    if ((t.match(/\b[A-Z]{2,}\b/g) || []).length >= 2) v += 1
    if (/!{2,}/.test(t)) v += 1
    if (HEDGE.test(t)) v -= 2
    return clamp(v, 3, 9)
}

function detectEmotion(text: string): { id: string; intensity: number } | null {
    const t = normText(text)
    if (!t) return null
    const scores: Record<string, number> = {}
    for (const id of Object.keys(EMOTION_PATTERNS)) {
        let s = 0
        for (const [re, w] of EMOTION_PATTERNS[id]) {
            re.lastIndex = 0
            const m = t.match(re)
            if (m) s += m.length * w
        }
        if (s > 0) scores[id] = s
    }
    if (Object.keys(scores).some((k) => k !== "good")) delete scores.good
    if (scores.good && /\bnot\s+(?:\w+\s+)?(?:good|great|happy|ok)\b/i.test(t)) delete scores.good
    const ids = Object.keys(scores)
    if (!ids.length) return null
    ids.sort((a, b) => scores[b] - scores[a] || EMO_ORDER.indexOf(a) - EMO_ORDER.indexOf(b))
    const n = guessIntensity(t)
    const l = HEDGE.test(t) ? 0 : (EMO[ids[0]]?.dial || 5) - 1
    return { id: ids[0], intensity: clamp(Math.max(n, l), 3, 9) }
}

const bandOf = (v: number | null | undefined): Band => {
    const n = Number(v)
    return !Number.isFinite(n) ? "mid" : n >= 7 ? "high" : n >= 4 ? "mid" : "low"
}

/* ---------- Safety scan (V19 patterns, verbatim) ---------- */

const PERSON = String.raw`(?:he|she|they|my\s+(?:dad|father|mum|mom|mother|parents?|ex|step\w*|partner|husband|wife|boyfriend|girlfriend|bf|gf|boss|teacher|coach|brother|sister|uncle|aunt|cousin|grand\w*|guardian|carer|caregiver))`
const SAFETY = {
    selfharm: /\b(kill(ing)?\s*my\s*self|kms|suicid\w*|end\s+(it\s+all|my\s+life)|take\s+my\s+(own\s+)?life|(?:want|wanted)\s+to\s+die|wanna\s+die|wish\s+i\s+(was|were)\s+dead|better\s+off\s+(dead|without\s+me)|no\s+reason\s+to\s+(live|be\s+here)|don'?t\s+want\s+to\s+(be\s+here|live|exist|wake\s+up)|self[-\s]?harm\w*|hurt(ing)?\s+my\s*self|cut(ting)?\s+my\s*self|overdos\w*|can'?t\s+go\s+on|no\s+(?:point|reason)\s+(?:in\s+)?(?:living|being\s+alive|going\s+on)|(?:don'?t|do\s+not)\s+want\s+to\s+be\s+alive|life\s+(?:is\s*n'?t|is\s+not|isnt)\s+worth\s+(?:living|it)|not\s+worth\s+living|sleep\s+and\s+never\s+wake\s+up|nobody\s+would\s+(?:miss|care\s+if)\s+me|(?:i'?m|i\s+am|feel\s+like)\s+(?:such\s+)?a\s+burden)\b/i,
    selfharm2: /\b(unalive\w*|sewer\s*slide|end\s+(?:myself|things\s+tonight)|hang\s+myself|slit\s+my\s+wrists?|jump\s+off\s+(?:a|the)\s+(?:bridge|building|roof)|(?:been|started|keep|kept)\s+cutting|cutting\s+again|i'?m\s+going\s+to\s+(?:do\s+it|end\s+it)\s+tonight)\b/i,
    abuse: new RegExp(String.raw`\b(${PERSON}\s+(?:hits?\s+me\b(?!\s+(?:up|back)\b)|beats?\s+me\b(?!\s+(?:at|in|to)\b)|(?:chokes?|hurts?|threatens?|touch(?:es|ed)?)\s+me\b)|being\s+(abused|hit|beaten)|abus(e|es|ed|ing)\s+me|rap(e|ed)|sexual(ly)?\s+assault\w*|(not|don'?t\s+feel)\s+safe\s+at\s+home|scared\s+to\s+go\s+home)\b`, "i"),
    abuse2: new RegExp(String.raw`\b(?:${PERSON}(?:'ll|\s+will|\s+is\s+going\s+to|\s+might|\s+keeps?|\s+always)?\s+(?:hit|slap|kick|punch|shove|chok|strangl|burn)\w*\s+me\b(?!\s+(?:up|out|back|off)\b)|${PERSON}(?:'ll|\s+will|\s+is\s+going\s+to|\s+might)\s+(?:hurt|kill)\s+me\b(?!\s+if)|(?:he|she|they)\s+(?:hurt|touched|threatened)\s+me)\b`, "i"),
    soft: /\b(hopeless|hate\s+my\s+life|give\s+up\s+on\s+everything|what'?s\s+the\s+point\s+(?:anymore|of\s+(?:living|anything|trying|me))|want\s+to\s+disappear|can'?t\s+do\s+this\s+anymore)\b/i,
}
const THREAT_ACTOR = /\b(?:he|she|they|him|her|someone|somebody|my\s+\w+)\b[^.!?]{0,40}?\b(?:hurt|hit|kill|attack|follow|stalk|threat|beat|touch)\w*\b(?!\s+(?:me\s+)?(?:if|up|out|with|back|at|in)\b)/i
const THREAT_FEAR = /\b(?:scared|afraid|terrified|frightened|unsafe)\b|\b(?:hurt|hit|kill|attack|stalk|follow)\w*\s+me\b(?!\s+(?:if|up|back)\b)|\bbeat\w*\s+me\b(?!\s+(?:at|in|to|up\s+on)\b)/i

function safetyScan(text: string): SafetyFlag {
    const t = normText(text)
    if (!t) return null
    const a = t.replace(/\b\d+(?:[.,]\d+)?\s*kms\b/gi, " ")
    if (SAFETY.selfharm.test(a) || SAFETY.selfharm2.test(a)) return "selfharm"
    if (SAFETY.abuse.test(a) || SAFETY.abuse2.test(a)) return "abuse"
    if (THREAT_ACTOR.test(a) && THREAT_FEAR.test(a)) return "threat"
    if (SAFETY.soft.test(a)) return "soft"
    return null
}
const isStrongFlag = (f: SafetyFlag) => (SAFETY_RANK[f || ""] || 0) >= 2
const strongerFlag = (a: SafetyFlag, b: SafetyFlag): SafetyFlag => ((SAFETY_RANK[b || ""] || 0) > (SAFETY_RANK[a || ""] || 0) ? b : a)
const ROUTE_RULES: Record<number, (text: string) => boolean> = { 105: (t) => !THREAT_ACTOR.test(normText(t)) }

/* ---------- Storage (V19-compatible keys) ---------- */

const KEYS = {
    sessions: "eos_sessions_v1",
    days: "eos_days_v1",
    prefs: "eos_prefs_v1",
    rotation: "eos_rotation_strict_v2",
    rotationOld: "eos_rotation_v1",
    played: "__ts_release_arcade_played_v1",
    haptics: "ts_release_haptics",
    musicVolume: "ts_release_music_volume",
    sharedMedia: "__ts_reset_shared_media_v1",
    theme: "ts_release_theme",
    sfx: "ts_release_sfx",
    music: "ts_release_music",
    motion: "ts_release_motion",
    lanterns: "ts_release_lanterns_v1",
    welcomed: "ts_release_welcomed_v21",
}

function lsGet<T>(key: string, fallback: T): T {
    try {
        if (typeof localStorage === "undefined") return fallback
        const raw = localStorage.getItem(key)
        return raw == null ? fallback : (JSON.parse(raw) as T)
    } catch {
        return fallback
    }
}
function lsSet(key: string, value: unknown) {
    try {
        if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value))
    } catch {
        /* storage may be unavailable (private mode, Canvas sandbox) */
    }
}
function lsRaw(key: string): string | null {
    try {
        return typeof localStorage === "undefined" ? null : localStorage.getItem(key)
    } catch {
        return null
    }
}
function lsSetRaw(key: string, value: string) {
    try {
        if (typeof localStorage !== "undefined") localStorage.setItem(key, value)
    } catch {
        /* ignore */
    }
}

const PREF_DEFAULTS = { shareWords: false, enrich: true, keepHistory: true, calmVisuals: false, dust: "default", namedOnce: false, metOnce: false, micNoted: false, coldOpen: false, speak: false }
function getPrefs(): typeof PREF_DEFAULTS & Record<string, any> {
    const p = lsGet<Record<string, any>>(KEYS.prefs, {})
    return { ...PREF_DEFAULTS, ...(p && typeof p === "object" ? p : {}) }
}
function setPref(key: string, value: unknown) {
    lsSet(KEYS.prefs, { ...getPrefs(), [key]: value })
}

const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

interface SessionRow { t: number; emo: string; before: number | null; after: number | null; gameId: number; ms: number; act: number; retro: 0 | 1 }
function getSessions(): SessionRow[] {
    const s = lsGet<SessionRow[]>(KEYS.sessions, [])
    return Array.isArray(s) ? s : []
}
function pushSession(row: Partial<SessionRow>) {
    const r: SessionRow = {
        t: Date.now(),
        emo: String(row.emo || "general").slice(0, 24),
        before: Number.isFinite(Number(row.before)) && row.before !== null ? Number(row.before) : null,
        after: Number.isFinite(Number(row.after)) && row.after !== null ? Number(row.after) : null,
        gameId: Number(row.gameId) || 0,
        ms: Math.max(0, Math.round(Number(row.ms) || 0)),
        act: Number(row.act) || 1,
        retro: row.retro ? 1 : 0,
    }
    if (getPrefs().keepHistory !== false) lsSet(KEYS.sessions, getSessions().concat([r]).slice(-300))
    const days = lsGet<string[]>(KEYS.days, [])
    const d = today()
    if (Array.isArray(days) && !days.includes(d)) lsSet(KEYS.days, days.concat([d]).slice(-400))
    return r
}
function getPlayed(): number[] {
    const p = lsGet<number[]>(KEYS.played, [])
    return Array.isArray(p) ? p.map(Number).filter((n) => n > 0) : []
}
function notePlayedList(id: number) {
    const list = getPlayed()
    if (!list.includes(id)) lsSet(KEYS.played, list.concat([id]))
}

/** Personal history: how much a ritual has helped this feeling before (V19 eosRouterHistory). */
function routerHistory() {
    const rows = getSessions()
    const last3 = new Set(rows.slice(-3).map((r) => Number(r && r.gameId) || 0).filter(Boolean))
    const sums = new Map<string, { sum: number; n: number }>()
    for (const r of rows) {
        if (!r || r.retro) continue
        const g = Number(r.gameId) || 0
        if (!g || r.before == null || r.after == null) continue
        const b = Number(r.before), a = Number(r.after)
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue
        const key = EMO[r.emo] || r.emo === "general" ? String(r.emo) : "general"
        const better = EMO[key]?.better || "down"
        const k = `${key}|${g}`
        const cur = sums.get(k) || { sum: 0, n: 0 }
        cur.sum += better === "up" ? a - b : b - a
        cur.n += 1
        sums.set(k, cur)
    }
    return { last3, sums }
}
const personalDelta = (key: string, id: number, h = routerHistory()) => {
    const s = h.sums.get(`${key || "general"}|${id}`)
    return s && s.n >= 2 ? s.sum / s.n : 0
}

function hashNoise(a: number, b: number) {
    let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35)
    h ^= h >>> 15
    h = Math.imul(h, 0x27d4eb2d)
    h ^= h >>> 13
    return ((h >>> 0) % 100000) / 100000
}

/* ---------- Router ---------- */

interface RouteContext { key: string; emo: string | null; band: Band; lvl: number; flag: SafetyFlag; text: string; path: number[]; seed: number; late: boolean }

function makeContext(opts: { text: string; emotion: string | null; before: number | null; flag: SafetyFlag; path: number[]; seed: number }): RouteContext {
    const text = normText(opts.text)
    let emo = opts.emotion && EMO[opts.emotion] ? opts.emotion : null
    let detectedLevel: number | null = null
    if (!emo && text) {
        const d = detectEmotion(text)
        if (d) {
            emo = d.id
            detectedLevel = d.intensity
        }
    }
    let lvl = opts.before ?? detectedLevel ?? (emo ? EMO[emo].dial : null) ?? 5
    const key = emo || "general"
    if (!emo && opts.flag && opts.before == null) lvl = BAND_LEVEL.high
    const h = new Date().getHours()
    return { key, emo, band: bandOf(lvl), lvl: clamp(lvl, 0, 10), flag: opts.flag, text, path: opts.path, seed: opts.seed, late: h >= 23 || h < 5 }
}

function eligible(id: number, ctx: RouteContext, universe: Set<number>, gentleOnly: boolean): boolean {
    if (!universe.has(id)) return false
    const rule = ROUTE_RULES[id]
    if (rule && !rule(ctx.text)) return false
    const ex = EXCLUDE[ctx.key]
    if (ex && ((ex.all && ex.all.has(id)) || (ex[ctx.band] && ex[ctx.band]!.has(id)))) return false
    if (gentleOnly && !GENTLE_IDS.includes(id) && !(ctx.flag === "soft" && SOFT_ALLOW[ctx.key]?.has(id))) return false
    return true
}

/** Ranked emotion-specific shortlist (V19 eosRouterRank). */
function rankRoute(ctx: RouteContext, universe: Set<number>): number[] {
    const build = (key: string) => {
        const table = ROUTES[key] || ROUTES.general
        const seen = new Set<number>()
        const out: number[] = []
        for (const b of BAND_ORDER[ctx.band]) for (const id of table[b] || []) if (!seen.has(id)) { seen.add(id); out.push(id) }
        return out
    }
    const gentle = !!ctx.flag
    let ids = build(ctx.key).filter((id) => eligible(id, ctx, universe, gentle))
    if (!ids.length && gentle) ids = GENTLE_IDS.filter((id) => eligible(id, ctx, universe, true))
    if (!ids.length && ctx.key !== "general") ids = build("general").filter((id) => eligible(id, ctx, universe, gentle))
    const hist = routerHistory()
    const played = new Set(getPlayed().slice(-6))
    const path = new Set(ctx.path)
    return ids
        .map((id, rank) => {
            const inPath = path.has(id) ? 1 : 0
            const recency = ctx.band === "high" ? 0 : (hist.last3.has(id) ? 0.4 : 0) + (played.has(id) ? 0.15 : 0)
            const hBoost = clamp(0.05 * personalDelta(ctx.key, id, hist), -0.15, 0.15)
            return { id, rank, score: 1 - rank * 0.1 - inPath - recency + hBoost }
        })
        .sort((a, b) => b.score - a.score || a.rank - b.rank)
        .map((r) => r.id)
}

/* ---------- No-repeat rotation (V19 eos_rotation_strict_v2) ---------- */

interface Rotation { v: 1; seq: number; at: Record<number, number>; cyc: { global: number }; last: number | null }
const blankRotation = (): Rotation => ({ v: 1, seq: 0, at: {}, cyc: { global: 0 }, last: null })

function loadRotation(): Rotation {
    const out = blankRotation()
    try {
        let data: any = lsGet<any>(KEYS.rotation, null)
        if (!data || typeof data !== "object" || data.v !== 1) {
            const old = lsGet<any>(KEYS.rotationOld, null)
            if (!old || typeof old !== "object") return out
            data = { v: 1, seq: old.seq || 0, at: old.at || {}, cyc: { global: 0 }, last: old.last || null }
            lsSet(KEYS.rotation, data)
        }
        out.seq = Math.max(0, Number(data.seq) || 0)
        for (const id in data.at || {}) if (Number(id) > 0 && Number.isFinite(Number(data.at[id]))) out.at[Number(id)] = Number(data.at[id])
        out.cyc.global = Math.max(0, Number(data.cyc && data.cyc.global) || 0)
        out.last = Number(data.last) > 0 ? Number(data.last) : null
    } catch {
        /* fall back to a blank rotation */
    }
    return out
}
const saveRotation = (r: Rotation) => lsSet(KEYS.rotation, r)

/** Records that a ritual was actually played (V19 EosPickNote). */
function noteRitualPlayed(id: number) {
    const r = loadRotation()
    if (r.last === id) return
    r.seq += 1
    r.at[id] = r.seq
    r.last = id
    saveRotation(r)
    notePlayedList(id)
}

/**
 * Picks the next ritual. Every eligible ritual is served once before any repeats; the
 * emotion route only decides which unplayed ritual comes first. `skip` holds rituals the
 * person shuffled past in this visit so "Another" never bounces between the same two.
 */
function pickRitual(ctx: RouteContext, universeIds: number[], opts: { exclude?: number | null; skip?: Set<number> } = {}): number | null {
    const universe = new Set(universeIds)
    const rot = loadRotation()
    const priority = rankRoute(ctx, universe)
    let pool = universeIds.filter((id) => eligible(id, ctx, universe, !!ctx.flag))
    if (!pool.length) pool = universeIds.filter((id) => eligible(id, { ...ctx, key: "general", flag: ctx.flag }, universe, !!ctx.flag))
    if (!pool.length) pool = universeIds.slice()
    let marker = rot.cyc.global
    const pending = (m: number) => pool.filter((id) => rot.at[id] == null || rot.at[id] < m)
    let unplayed = pending(marker)
    let fresh = false
    if (!unplayed.length) {
        // Every ritual suitable for this feeling has been served: begin a new cycle.
        marker = rot.seq + 1
        rot.cyc.global = marker
        saveRotation(rot)
        unplayed = pool.slice()
        fresh = true
    }
    const skip = opts.skip || new Set<number>()
    const notSkipped = unplayed.filter((id) => !skip.has(id) && id !== opts.exclude && id !== rot.last)
    if (notSkipped.length) unplayed = notSkipped
    else {
        const notExcluded = unplayed.filter((id) => id !== opts.exclude)
        if (notExcluded.length) unplayed = notExcluded
    }
    const prio = new Map(priority.map((id, i) => [id, i]))
    let likely = unplayed.filter((id) => prio.has(id))
    if (!likely.length) likely = unplayed.slice()
    likely.sort((a, b) => (prio.get(a) ?? 999) - (prio.get(b) ?? 999))
    const top = prio.has(likely[0]) && ctx.band !== "high" ? likely.slice(0, Math.min(3, likely.length)) : likely.slice(0, ctx.band === "high" ? 1 : likely.length)
    const seed = rot.seq + marker * 17 + (fresh ? 104729 : 0) + ctx.seed
    top.sort((a, b) => hashNoise(seed, a) - hashNoise(seed, b) || a - b)
    return top[0] ?? null
}

/** Follow-up pick after a check-in (V19 EosSecondAct): adapts to what shifted. */
function pickFollowUp(ctx: RouteContext, universeIds: number[], lastId: number, shift: "lighter" | "same" | "heavier", skip: Set<number>): number | null {
    const universe = new Set(universeIds)
    const ok = (id: number) => id !== lastId && !skip.has(id) && eligible(id, ctx, universe, !!ctx.flag)
    if (ctx.key === "anger" && ANGER_DISCHARGE.has(lastId) && lastId !== 112 && ok(112)) return 112
    if (shift === "heavier") {
        const g = GENTLE_IDS.find(ok)
        if (g) return g
    }
    if (shift !== "lighter") {
        const lastFamily = RITUAL_BY_ID[lastId]?.family
        const second = (SECOND_ACT[ctx.key] || SECOND_ACT.general).find((id) => ok(id) && RITUAL_BY_ID[id]?.family !== lastFamily)
        if (second) return second
    }
    return pickRitual(ctx, universeIds, { exclude: lastId, skip })
}

/* ---------- Words: turning what was typed into tactile pieces ---------- */

interface Item { key: string; text: string; img: string | null }

function shorten(text: string, maxWords = 4, maxChars = 26): string {
    const raw = String(text || "").trim()
    if (!raw) return ""
    const words = raw.split(/\s+/).filter(Boolean)
    let out = words.slice(0, maxWords).join(" ")
    if (out.length > maxChars) out = out.slice(0, maxChars).trimEnd()
    const cut = words.length > maxWords || out.length < raw.length
    out = out.replace(/[.,;:!?\-–—]+$/g, "").trim()
    return cut && out ? out + "…" : out
}

/** Splits what someone typed into up to `n` meaningful pieces (clauses first, then word groups). */
function splitPieces(text: string, n: number): string[] {
    const t = normText(text)
    if (!t) return []
    let parts = t.split(/\s*(?:[,;.!?\n]+|\s-\s|\band\b|\bbut\b|\bbecause\b)\s*/i).map((s) => s.trim()).filter((s) => s.length > 1)
    if (parts.length < Math.min(n, 3)) {
        const words = t.replace(/[,;.!?]+/g, " ").split(/\s+/).filter(Boolean)
        if (words.length >= 4) {
            const groups = Math.min(n, Math.max(2, Math.ceil(words.length / 3)))
            const per = Math.ceil(words.length / groups)
            parts = []
            for (let i = 0; i < words.length; i += per) parts.push(words.slice(i, i + per).join(" "))
        } else if (!parts.length) parts = [t]
    }
    const seen = new Set<string>()
    return parts.map((p) => shorten(p, 4, 24)).filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase())).slice(0, n)
}

function buildItems(opts: { text: string; emo: Emotion; flag: SafetyFlag; count: number; images: string[]; defaultFaces: boolean; char: CharSlug; ritualId: number }): Item[] {
    const n = Math.max(1, opts.count)
    let words = isStrongFlag(opts.flag) ? NEUTRAL_WORDS.slice() : splitPieces(opts.text, n)
    if (!words.length) words = [opts.text ? shorten(opts.text) : ""].filter(Boolean)
    // Pad with the feeling's own words when there are fewer pieces than the ritual needs.
    if (words.length < n) {
        const pad = (isStrongFlag(opts.flag) ? NEUTRAL_WORDS : opts.emo.seeds).filter((s) => !words.some((w) => w.toLowerCase() === s.toLowerCase()))
        let i = 0
        while (words.length < n && i < pad.length) words.push(pad[i++])
        const base = words.slice()
        let j = 0
        while (words.length < n && base.length > 0) words.push(base[j++ % base.length])
    }
    words = words.slice(0, n)
    const pool = FACE_POOLS.negative[opts.char]
    return words.map((text, i) => {
        let img: string | null = null
        if (opts.images.length) img = opts.images[i % opts.images.length]
        else if (opts.defaultFaces) img = faceUrl(opts.char, pool[(i + opts.ritualId) % pool.length])
        return { key: `${opts.ritualId}-${i}-${text}`, text, img }
    })
}

const titleCase = (s: string) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())

/* ================================================================== */
/* 2. FEEDBACK — sound, haptics, music                                 */
/* ================================================================== */

type SoundName =
    | "tap" | "tick" | "pop" | "snap" | "whoosh" | "tear" | "crackle" | "chime" | "complete" | "thud"
    | "water" | "boing" | "stamp" | "coin" | "zap" | "drip" | "ice" | "bell" | "kazoo" | "pluck" | "sigh"

interface Loop { set: (freq: number, gain?: number) => void; stop: () => void }

const Sound = (() => {
    let ctx: AudioContext | null = null
    let master: GainNode | null = null
    let noise: AudioBuffer | null = null
    let enabled = true

    function ensure(): AudioContext | null {
        if (typeof window === "undefined") return null
        try {
            if (!ctx) {
                const C = (window as any).AudioContext || (window as any).webkitAudioContext
                if (!C) return null
                ctx = new C() as AudioContext
                master = ctx.createGain()
                master.gain.value = 0.7
                master.connect(ctx.destination)
                const len = Math.floor(ctx.sampleRate * 1.2)
                noise = ctx.createBuffer(1, len, ctx.sampleRate)
                const data = noise.getChannelData(0)
                for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
            }
            if (ctx.state === "suspended") ctx.resume().catch(() => {})
            return ctx
        } catch {
            return null
        }
    }

    function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack)
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
    }
    function tone(freq: number, opts: { type?: OscillatorType; dur?: number; peak?: number; attack?: number; to?: number; delay?: number; detune?: number } = {}) {
        const c = ctx!, t = c.currentTime + (opts.delay || 0)
        const o = c.createOscillator(), g = c.createGain()
        o.type = opts.type || "sine"
        o.frequency.setValueAtTime(freq, t)
        if (opts.detune) o.detune.value = opts.detune
        if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + (opts.dur || 0.2))
        env(g, t, opts.peak ?? 0.08, opts.attack ?? 0.004, opts.dur ?? 0.2)
        o.connect(g).connect(master!)
        o.start(t)
        o.stop(t + (opts.attack ?? 0.004) + (opts.dur ?? 0.2) + 0.05)
    }
    function hiss(opts: { dur?: number; peak?: number; type?: BiquadFilterType; freq?: number; to?: number; q?: number; delay?: number; attack?: number }) {
        const c = ctx!, t = c.currentTime + (opts.delay || 0)
        const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
        s.buffer = noise
        s.loop = true
        f.type = opts.type || "bandpass"
        f.frequency.setValueAtTime(opts.freq || 1800, t)
        if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + (opts.dur || 0.3))
        f.Q.value = opts.q ?? 0.8
        env(g, t, opts.peak ?? 0.05, opts.attack ?? 0.006, opts.dur ?? 0.3)
        s.connect(f).connect(g).connect(master!)
        s.start(t, Math.random() * 0.8)
        s.stop(t + (opts.attack ?? 0.006) + (opts.dur ?? 0.3) + 0.05)
    }

    function play(name: SoundName, pitch = 1) {
        if (!enabled || !ensure() || !master) return
        try {
            switch (name) {
                case "tap": tone(900 * pitch, { dur: 0.05, peak: 0.03, to: 700 * pitch }); break
                case "tick": tone(2400 * pitch, { dur: 0.018, peak: 0.018, type: "triangle" }); break
                case "pop":
                    tone(520 * pitch, { dur: 0.11, peak: 0.13, to: 150 * pitch })
                    hiss({ dur: 0.03, peak: 0.05, type: "highpass", freq: 3200 })
                    break
                case "snap":
                    hiss({ dur: 0.05, peak: 0.08, freq: 2600, q: 1.4 })
                    tone(150, { dur: 0.08, peak: 0.07, to: 70 })
                    break
                case "whoosh": hiss({ dur: 0.55 * pitch, peak: 0.06, freq: 380, to: 2200, q: 0.9, attack: 0.12 }); break
                case "tear": for (let i = 0; i < 7; i++) hiss({ dur: 0.028, peak: 0.045, freq: 2600 + Math.random() * 1600, q: 1.6, delay: i * 0.024 + Math.random() * 0.01 }); break
                case "crackle": for (let i = 0; i < 4; i++) hiss({ dur: 0.012, peak: 0.03 * Math.random() + 0.01, type: "highpass", freq: 2400, delay: Math.random() * 0.25 }); break
                case "chime":
                    tone(880 * pitch, { dur: 1.3, peak: 0.045, attack: 0.008 })
                    tone(1320 * pitch, { dur: 0.9, peak: 0.018, attack: 0.008 })
                    break
                case "complete":
                    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { dur: 1.8, peak: 0.04, attack: 0.012, delay: i * 0.09 }))
                    break
                case "thud": tone(110 * pitch, { dur: 0.18, peak: 0.12, to: 55 }); break
                case "water":
                    hiss({ dur: 1.2, peak: 0.05, type: "lowpass", freq: 700, to: 260, attack: 0.25 })
                    break
                case "boing": tone(220 * pitch, { dur: 0.32, peak: 0.07, type: "triangle", to: 520 * pitch }); break
                case "stamp": tone(180, { dur: 0.09, peak: 0.1, to: 90 }); hiss({ dur: 0.04, peak: 0.05, freq: 1200 }); break
                case "coin": tone(988, { dur: 0.08, peak: 0.05, type: "square" }); tone(1319, { dur: 0.35, peak: 0.04, type: "square", delay: 0.08 }); break
                case "zap": hiss({ dur: 0.09, peak: 0.06, freq: 4200, q: 3 }); tone(60, { dur: 0.08, peak: 0.05, type: "sawtooth" }); break
                case "drip": tone(1100 * pitch, { dur: 0.09, peak: 0.05, to: 1700 * pitch }); break
                case "ice": tone(2600 * pitch, { dur: 0.25, peak: 0.025, type: "triangle" }); hiss({ dur: 0.08, peak: 0.03, type: "highpass", freq: 5000 }); break
                case "bell": tone(660 * pitch, { dur: 1.6, peak: 0.05, attack: 0.006 }); tone(1650 * pitch, { dur: 0.6, peak: 0.012 }); break
                case "kazoo": tone(330 * pitch, { dur: 0.3, peak: 0.035, type: "sawtooth", to: 360 * pitch, detune: 12 }); break
                case "pluck": tone(392 * pitch, { dur: 0.45, peak: 0.06, type: "triangle", to: 388 * pitch }); break
                case "sigh": hiss({ dur: 2.4 * pitch, peak: 0.03, type: "lowpass", freq: 900, to: 260, attack: 0.4 }); break
            }
        } catch {
            /* audio is decorative; never break the ritual */
        }
    }

    /** A sustained tone the ritual can steer (charge hums, motors, wind). */
    function loop(kind: "hum" | "motor" | "wind" | "rain" | "fire"): Loop {
        const none: Loop = { set: () => {}, stop: () => {} }
        if (!enabled || !ensure() || !master) return none
        try {
            const c = ctx!, t = c.currentTime
            const g = c.createGain()
            g.gain.setValueAtTime(0.0001, t)
            g.connect(master)
            const nodes: AudioScheduledSourceNode[] = []
            let freqParam: AudioParam | null = null
            let level = 0.04
            if (kind === "hum") {
                const o = c.createOscillator(), o2 = c.createOscillator()
                o.type = "sine"; o2.type = "sine"
                o.frequency.value = 180; o2.frequency.value = 270
                const g2 = c.createGain(); g2.gain.value = 0.35
                o.connect(g); o2.connect(g2).connect(g)
                freqParam = o.frequency
                o2.frequency.value = 270
                nodes.push(o, o2)
                level = 0.05
            } else {
                const s = c.createBufferSource(), f = c.createBiquadFilter()
                s.buffer = noise; s.loop = true
                f.type = kind === "motor" ? "bandpass" : kind === "fire" ? "highpass" : "lowpass"
                f.frequency.value = kind === "motor" ? 220 : kind === "rain" ? 2400 : kind === "fire" ? 1800 : 600
                f.Q.value = kind === "motor" ? 2.4 : 0.6
                s.connect(f).connect(g)
                freqParam = f.frequency
                nodes.push(s)
                level = kind === "rain" ? 0.05 : kind === "fire" ? 0.022 : 0.045
                if (kind === "motor") {
                    const o = c.createOscillator(), og = c.createGain()
                    o.type = "sawtooth"; o.frequency.value = 58; og.gain.value = 0.18
                    o.connect(og).connect(g); nodes.push(o)
                }
            }
            nodes.forEach((n) => n.start())
            g.gain.exponentialRampToValueAtTime(level, t + 0.12)
            let stopped = false
            return {
                set(freq: number, gain?: number) {
                    if (stopped) return
                    const now = c.currentTime
                    if (freqParam && freq > 0) freqParam.setTargetAtTime(freq, now, 0.05)
                    if (gain != null) g.gain.setTargetAtTime(Math.max(0.0001, level * gain), now, 0.06)
                },
                stop() {
                    if (stopped) return
                    stopped = true
                    const now = c.currentTime
                    g.gain.cancelScheduledValues(now)
                    g.gain.setTargetAtTime(0.0001, now, 0.08)
                    nodes.forEach((n) => { try { n.stop(now + 0.5) } catch { /* already stopped */ } })
                },
            }
        } catch {
            return none
        }
    }

    function note(freq: number, type: OscillatorType = "sine", dur = 0.5, peak = 0.05) {
        if (!enabled || !ensure() || !master) return
        try { tone(freq, { type, dur, peak, attack: 0.01 }) } catch { /* ignore */ }
    }

    return {
        play, loop, note,
        unlock: () => { ensure() },
        setEnabled: (v: boolean) => { enabled = v },
        get enabled() { return enabled },
    }
})()

/* ---------- Haptics ---------- */

const Haptics = (() => {
    let enabled = true
    let iosSwitch: HTMLLabelElement | null = null
    const patterns: Record<string, number | number[]> = { light: 8, medium: 14, heavy: 22, tick: 4, success: [12, 70, 18], warn: [20, 40, 20], buzz: [6, 30, 6, 30, 6] }
    function fire(kind: keyof typeof patterns | number = "light") {
        if (!enabled || typeof window === "undefined") return
        const p = typeof kind === "number" ? kind : patterns[kind] ?? 8
        try {
            if (typeof navigator.vibrate === "function" && navigator.vibrate(p)) return
        } catch { /* ignore */ }
        // iOS Safari has no Vibration API; toggling a native switch gives a system tick (iOS 18+).
        try {
            if (kind === "buzz" || kind === "warn" || kind === "tick") return
            if (!iosSwitch) {
                iosSwitch = document.createElement("label")
                iosSwitch.setAttribute("aria-hidden", "true")
                iosSwitch.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none"
                const input = document.createElement("input")
                input.type = "checkbox"
                input.setAttribute("switch", "")
                input.tabIndex = -1
                iosSwitch.appendChild(input)
                document.body.appendChild(iosSwitch)
            }
            iosSwitch.click()
        } catch { /* ignore */ }
    }
    return { fire, setEnabled: (v: boolean) => { enabled = v } }
})()

/* ---------- Shared music (same source as every ThinkStill component) ---------- */

function readSharedMusic(charKey: string): string {
    try {
        const media = JSON.parse(lsRaw(KEYS.sharedMedia) || "{}")
        return String((media && media.music && (media.music[charKey] || media.music.global)) || "")
    } catch {
        return ""
    }
}

/** Plays the shared ThinkStill music source; returns whether a source exists. */
function useSharedMusic(on: boolean, volume: number, charKey: string, fallbackUrl: string): boolean {
    const audio = React.useRef<HTMLAudioElement | null>(null)
    const [rev, setRev] = React.useState(0)
    React.useEffect(() => {
        if (typeof window === "undefined") return
        const bump = () => setRev((n) => n + 1)
        window.addEventListener("storage", bump)
        window.addEventListener("thinkstill:reset-shared-media", bump)
        return () => {
            window.removeEventListener("storage", bump)
            window.removeEventListener("thinkstill:reset-shared-media", bump)
        }
    }, [])
    const src = React.useMemo(() => readSharedMusic(charKey) || String(fallbackUrl || ""), [charKey, fallbackUrl, rev])
    React.useEffect(() => {
        if (typeof window === "undefined") return
        if (!audio.current) {
            audio.current = new Audio()
            audio.current.loop = true
            audio.current.preload = "none"
        }
        const a = audio.current
        if (src && a.src !== src) a.src = src
        let raf = 0
        const target = on && src ? clamp(volume, 0, 1) : 0
        const fade = () => {
            const d = target - a.volume
            if (Math.abs(d) < 0.01) {
                a.volume = target
                if (target === 0) a.pause()
                return
            }
            a.volume = clamp(a.volume + d * 0.12, 0, 1)
            raf = requestAnimationFrame(fade)
        }
        if (target > 0) {
            if (a.paused) a.volume = 0
            a.play().catch(() => {})
        }
        raf = requestAnimationFrame(fade)
        return () => cancelAnimationFrame(raf)
    }, [on, src, volume])
    React.useEffect(() => () => { audio.current?.pause() }, [])
    React.useEffect(() => {
        if (typeof document === "undefined") return
        const onVis = () => {
            const a = audio.current
            if (!a) return
            if (document.hidden) a.pause()
            else if (on && src) a.play().catch(() => {})
        }
        document.addEventListener("visibilitychange", onVis)
        return () => document.removeEventListener("visibilitychange", onVis)
    }, [on, src])
    return !!src
}

/* ================================================================== */
/* 3. THEME                                                            */
/* ================================================================== */

const EASE_OUT = "cubic-bezier(.22,1,.36,1)"
const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const
const SPRING_SNAPPY = { type: "spring", stiffness: 520, damping: 34 } as const

const STYLES = `
.tsr {
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", "Segoe UI", Roboto, "Helvetica Neue", system-ui, sans-serif;
  --serif: "New York", "Iowan Old Style", "Charter", Georgia, "Times New Roman", serif;
  --round: ui-rounded, "SF Pro Rounded", -apple-system, "Nunito", "Segoe UI", system-ui, sans-serif;
  --safe-t: env(safe-area-inset-top, 0px); --safe-b: env(safe-area-inset-bottom, 0px);
  --safe-l: env(safe-area-inset-left, 0px); --safe-r: env(safe-area-inset-right, 0px);
  --bar: 54px;
  --r-lg: 22px; --r-md: 16px; --r-sm: 12px;
  position: relative; width: 100%; height: 100%; min-height: 480px; overflow: hidden;
  font-family: var(--font); font-size: var(--fs, 17px); line-height: 1.35; letter-spacing: -0.01em;
  color: var(--ink); background: var(--bg);
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent; isolation: isolate; box-sizing: border-box;
  touch-action: manipulation; overscroll-behavior: none;
  transition: background-color .5s ${EASE_OUT}, color .5s ${EASE_OUT};
}
.tsr *, .tsr *::before, .tsr *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.tsr.isFill { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: 2147480000; }
.tsr[data-theme="light"] {
  --bg: #F4F1EB; --bg-deep: #ECE7DE; --surface: #FFFFFF; --surface-2: #FAF8F4; --raised: #FFFFFF;
  --fill: rgba(28,26,34,.055); --fill-2: rgba(28,26,34,.09); --fill-3: rgba(28,26,34,.14);
  --ink: #18171C; --ink-2: rgba(24,23,28,.68); --ink-3: rgba(24,23,28,.55); --ink-4: rgba(24,23,28,.3);
  --line: rgba(24,23,28,.09); --line-2: rgba(24,23,28,.14);
  --accent: #4A43C6; --accent-ink: #FFFFFF; --accent-soft: rgba(74,67,198,.1); --accent-line: rgba(74,67,198,.28);
  --warm: #E2733F; --cool: #3C7FD0; --good: #2F8F67; --danger: #C2412D;
  --shadow-1: 0 1px 2px rgba(40,30,20,.06), 0 4px 14px rgba(40,30,20,.06);
  --shadow-2: 0 2px 6px rgba(40,30,20,.07), 0 18px 40px rgba(40,30,20,.12);
  --sky-a: .30; --sky-b: .34; --sky-l: 80%; --sky-s: 72%;
  --paper: #FFFDF8; --paper-ink: #2A2420; --paper-line: rgba(80,60,40,.10);
  --stage-ink: #18171C;
  color-scheme: light;
}
.tsr[data-theme="dark"] {
  --bg: #0E0E12; --bg-deep: #08080B; --surface: #18181E; --surface-2: #1D1D24; --raised: #22222A;
  --fill: rgba(255,255,255,.065); --fill-2: rgba(255,255,255,.1); --fill-3: rgba(255,255,255,.16);
  --ink: #F3F1EC; --ink-2: rgba(243,241,236,.7); --ink-3: rgba(243,241,236,.56); --ink-4: rgba(243,241,236,.3);
  --line: rgba(255,255,255,.08); --line-2: rgba(255,255,255,.14);
  --accent: #A29CFF; --accent-ink: #14121C; --accent-soft: rgba(162,156,255,.14); --accent-line: rgba(162,156,255,.36);
  --warm: #FF9C6B; --cool: #7DB4FF; --good: #6FD3A6; --danger: #FF8A73;
  --shadow-1: 0 1px 2px rgba(0,0,0,.4), 0 6px 18px rgba(0,0,0,.28);
  --shadow-2: 0 2px 8px rgba(0,0,0,.45), 0 22px 50px rgba(0,0,0,.5);
  --sky-a: .22; --sky-b: .26; --sky-l: 42%; --sky-s: 60%;
  --paper: #F3EDE2; --paper-ink: #2A2420; --paper-line: rgba(80,60,40,.12);
  --stage-ink: #F3F1EC;
  color-scheme: dark;
}

/* ---------- Ambient sky: the feeling's colour, easing toward calm ---------- */
.tsr-sky { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.tsr-sky i { position: absolute; inset: -20% -20% 30% -20%; transition: opacity 1.2s ${EASE_OUT}, background 1.2s ${EASE_OUT}; }
.tsr-sky i.a { background: radial-gradient(60% 55% at 30% 18%, hsla(var(--h), var(--sky-s), var(--sky-l), var(--sky-a)), transparent 70%), radial-gradient(50% 50% at 85% 8%, hsla(calc(var(--h) + 24), var(--sky-s), var(--sky-l), calc(var(--sky-a) * .7)), transparent 70%); }
.tsr-sky i.b { background: radial-gradient(70% 60% at 50% 12%, hsla(var(--ch), var(--sky-s), var(--sky-l), var(--sky-b)), transparent 72%); }
.tsr-sky .grain { position: absolute; inset: 0; opacity: .5; background: linear-gradient(180deg, transparent 0%, var(--bg) 92%); }

/* ---------- Navigation bar ---------- */
.tsr-bar {
  position: absolute; left: 0; right: 0; top: 0; z-index: 20; height: calc(var(--bar) + var(--safe-t));
  padding: var(--safe-t) calc(8px + var(--safe-r)) 0 calc(8px + var(--safe-l));
  display: flex; align-items: center; justify-content: space-between; gap: 4px;
}
.tsr-bar .grp { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
.tsr-bar-mid { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: .9412em; font-weight: 600; color: var(--ink); letter-spacing: -.01em; white-space: nowrap; overflow: hidden; }
.tsr-bar-mid .ttl { overflow: hidden; text-overflow: ellipsis; }
.tsr-icon {
  position: relative; width: 44px; height: 44px; border: 0; border-radius: 50%; padding: 0; margin: 0; cursor: pointer;
  display: grid; place-items: center; color: var(--ink); background: transparent; font: inherit;
  transition: background-color .2s, color .2s, opacity .2s, transform .35s cubic-bezier(.34,1.56,.64,1);
}
.tsr-icon:hover { background: var(--fill); }
.tsr-icon:active { transform: scale(.88); transition-duration: .08s; }
.tsr-icon:disabled { opacity: .28; cursor: default; background: transparent; transform: none; }
.tsr-icon svg { width: 22px; height: 22px; display: block; }
.tsr-icon.on { color: var(--accent); }
.tsr-icon .dot { position: absolute; right: 9px; top: 9px; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 2px var(--bg); }
@media (max-width: 359px) { .tsr-icon { width: 40px; height: 40px; } .tsr-bar { padding-left: 4px; padding-right: 4px; } }
.tsr :focus-visible { outline: 2.5px solid var(--accent); outline-offset: 2px; }

/* ---------- Screens ---------- */
.tsr-main { position: absolute; left: 0; right: 0; bottom: 0; top: calc(var(--bar) + var(--safe-t)); z-index: 2; }
.tsr-screen { position: absolute; inset: 0; display: flex; flex-direction: column; overflow-x: hidden; overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.tsr-screen::-webkit-scrollbar { display: none; }
.tsr-col { width: 100%; max-width: 560px; margin: 0 auto; padding: 8px calc(20px + var(--safe-r)) calc(20px + var(--safe-b) + var(--kb, 0px)) calc(20px + var(--safe-l)); display: flex; flex-direction: column; flex: 1 0 auto; }
.tsr-spacer { flex: 1 1 auto; min-height: 12px; }
.t-large { font-size: 1.82em; line-height: 1.12; font-weight: 700; letter-spacing: -.026em; margin: 0; }
.t-title { font-size: 1.36em; line-height: 1.18; font-weight: 650; letter-spacing: -.02em; margin: 0; }
.t-head { font-size: 1.06em; line-height: 1.3; font-weight: 600; letter-spacing: -.012em; margin: 0; }
.t-body { font-size: 1em; line-height: 1.42; margin: 0; }
.t-sub { font-size: .94em; line-height: 1.42; color: var(--ink-2); margin: 0; }
.t-cap { font-size: .8em; line-height: 1.35; color: var(--ink-2); letter-spacing: 0; margin: 0; }
.t-eyebrow { font-size: .76em; line-height: 1.2; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-2); margin: 0; }
.t-center { text-align: center; }

/* ---------- Buttons ---------- */
.tsr-btn {
  appearance: none; border: 0; margin: 0; cursor: pointer; font: inherit; font-weight: 600; letter-spacing: -.01em;
  min-height: 52px; padding: 0 22px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--accent-ink); background: var(--accent); box-shadow: var(--shadow-1);
  transition: transform .4s cubic-bezier(.34,1.56,.64,1), background-color .25s, opacity .25s, box-shadow .25s;
  -webkit-user-select: none; user-select: none; text-align: center; line-height: 1.15;
}
.tsr-btn:active { transform: scale(.96); transition-duration: .08s; }
.tsr-btn:disabled { opacity: .38; cursor: default; transform: none; box-shadow: none; }
.tsr-btn.block { width: 100%; }
.tsr-btn.ghost { background: var(--fill); color: var(--ink); box-shadow: none; }
.tsr-btn.ghost:hover { background: var(--fill-2); }
.tsr-btn.plain { background: transparent; color: var(--accent); box-shadow: none; min-height: 44px; padding: 0 14px; }
.tsr-btn.small { min-height: 40px; padding: 0 16px; font-size: .9em; }
.tsr-btn svg { width: 18px; height: 18px; flex: 0 0 auto; }
.tsr-row { display: flex; gap: 10px; align-items: center; }
.tsr-row > .tsr-btn { flex: 1 1 0; min-width: 0; }
.tsr-stack { display: flex; flex-direction: column; gap: 10px; }

/* ---------- Composer ---------- */
.tsr-card { background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-1); border: 1px solid var(--line); }
.tsr-compose { position: relative; padding: 14px 14px 10px 16px; transition: box-shadow .3s, border-color .3s; }
.tsr-compose:focus-within { border-color: var(--accent-line); box-shadow: 0 0 0 4px var(--accent-soft), var(--shadow-1); }
.tsr-compose textarea {
  width: 100%; min-height: 4.2em; max-height: 9em; resize: none; border: 0; outline: 0; background: transparent; padding: 0; margin: 0;
  font: inherit; font-size: 1.06em; line-height: 1.4; color: var(--ink); letter-spacing: -.012em;
}
.tsr-compose textarea:focus-visible { outline: none; }
.tsr-compose textarea::placeholder { color: var(--ink-3); }
.tsr-compose .tools { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
.tsr-compose .tools .grow { flex: 1; }
.tsr-compose .count { font-size: .76em; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.tsr-tool {
  height: 40px; min-width: 40px; padding: 0 10px; border-radius: 999px; border: 0; background: var(--fill); color: var(--ink);
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; font: inherit; font-size: .84em; font-weight: 550;
  transition: background-color .2s, transform .35s cubic-bezier(.34,1.56,.64,1), color .2s;
}
.tsr-tool:active { transform: scale(.92); transition-duration: .08s; }
.tsr-tool svg { width: 19px; height: 19px; }
.tsr-tool.live { background: var(--danger); color: #fff; }
.tsr-tool.live svg { animation: tsrPulse 1.2s ease-in-out infinite; }
.tsr-thumbs { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.tsr-thumb { position: relative; width: 48px; height: 48px; border-radius: 12px; overflow: hidden; background: var(--fill); flex: 0 0 auto; }
.tsr-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tsr-thumb button { position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; display: grid; place-items: center; background: rgba(0,0,0,.6); color: #fff; }
.tsr-thumb button svg { width: 12px; height: 12px; }

/* ---------- Feeling chips ---------- */
.tsr-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.tsr-chip {
  height: 40px; padding: 0 14px 0 6px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink);
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font: inherit; font-size: .9em; font-weight: 550; white-space: nowrap;
  transition: background-color .25s, border-color .25s, color .25s, transform .4s cubic-bezier(.34,1.56,.64,1);
}
.tsr-chip:active { transform: scale(.94); transition-duration: .08s; }
.tsr-chip .sw { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex: 0 0 auto; background: var(--fill); }
.tsr-chip .sw img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.14); display: block; }
.tsr-chip.sel { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.tsr-chip.sug { border-color: var(--accent-line); box-shadow: 0 0 0 3px var(--accent-soft); }

/* ---------- Companion ---------- */
.tsr-companion { position: relative; flex: 0 0 auto; border-radius: 50%; }
.tsr-companion .halo { position: absolute; inset: -18%; border-radius: 50%; background: radial-gradient(circle, hsla(var(--ch), 80%, 70%, .32), transparent 68%); filter: blur(2px); }
.tsr-companion .orb { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: var(--fill-2); box-shadow: 0 10px 30px rgba(0,0,0,.14), inset 0 0 0 1px var(--line); }
.tsr-companion .orb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.16); transition: opacity .7s ${EASE_OUT}; }
.tsr-companion .ring { position: absolute; inset: -7px; width: calc(100% + 14px); height: calc(100% + 14px); overflow: visible; }
.tsr-companion.breathe { animation: tsrBreathe 6s ease-in-out infinite; }
.tsr[data-reduced="1"] .tsr-companion.breathe { animation: none; }

/* ---------- Slider ---------- */
.tsr-slider { position: relative; height: 56px; touch-action: none; cursor: pointer; user-select: none; -webkit-user-select: none; outline: none; }
.tsr-slider .track { position: absolute; left: 0; right: 0; top: 50%; height: 8px; margin-top: -4px; border-radius: 99px; background: var(--fill-2); overflow: hidden; }
.tsr-slider .fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 99px; background: linear-gradient(90deg, hsl(var(--ch), 62%, 58%), hsl(var(--h), 70%, 56%)); }
.tsr-slider .knob { position: absolute; top: 50%; width: 32px; height: 32px; margin: -16px 0 0 -16px; border-radius: 50%; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.22), 0 0 0 .5px rgba(0,0,0,.08); transition: transform .3s cubic-bezier(.34,1.56,.64,1); }
.tsr-slider.drag .knob { transform: scale(1.12); }
.tsr-slider .ticks { position: absolute; left: 16px; right: 16px; top: 50%; margin-top: 10px; display: flex; justify-content: space-between; pointer-events: none; }
.tsr-slider .ticks i { width: 2px; height: 5px; border-radius: 2px; background: var(--fill-3); }
.tsr-scale { display: flex; justify-content: space-between; gap: 12px; margin-top: 2px; }
.tsr-scale span { font-size: .82em; color: var(--ink-2); }
.tsr-big-num { font-size: 3.4em; font-weight: 700; letter-spacing: -.04em; line-height: 1; font-variant-numeric: tabular-nums; }

/* ---------- Match card ---------- */
.tsr-match { padding: 22px 20px 20px; overflow: hidden; position: relative; }
.tsr-match .words { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.tsr-match .word { font-size: .86em; padding: 6px 11px; border-radius: 999px; background: var(--fill); color: var(--ink); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tsr-meta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 14px; color: var(--ink-2); font-size: .84em; }
.tsr-meta span { display: inline-flex; align-items: center; gap: 5px; }
.tsr-meta svg { width: 15px; height: 15px; }

/* ---------- Ritual screen ---------- */
.tsr-ritual { position: absolute; inset: 0; display: flex; flex-direction: column; }
.tsr-rhead { flex: 0 0 auto; padding: 2px calc(20px + var(--safe-r)) 8px calc(20px + var(--safe-l)); display: flex; align-items: center; gap: 12px; max-width: 980px; width: 100%; margin: 0 auto; }
.tsr-rhead .nm { flex: 1 1 auto; min-width: 0; }
.tsr-rhead .nm b { display: block; font-size: 1.06em; font-weight: 650; letter-spacing: -.015em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tsr-rhead .nm span { display: block; font-size: .8em; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tsr-progress { position: relative; height: 4px; border-radius: 99px; background: var(--fill-2); overflow: hidden; margin: 0 calc(20px + var(--safe-r)) 0 calc(20px + var(--safe-l)); max-width: 940px; }
@media (min-width: 981px) { .tsr-progress { margin-left: auto; margin-right: auto; width: calc(100% - 40px); } }
.tsr-progress i { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; transform-origin: 0 50%; border-radius: 99px; background: linear-gradient(90deg, hsl(var(--h), 70%, 60%), hsl(var(--ch), 66%, 58%)); transition: transform .5s ${EASE_OUT}; }
.tsr-stagewrap { position: relative; flex: 1 1 auto; min-height: 0; margin: 10px calc(12px + var(--safe-r)) 0 calc(12px + var(--safe-l)); }
.tsr-stage { position: absolute; inset: 0; margin: 0 auto; max-width: 980px; border-radius: 28px; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; background: var(--st-bg, var(--surface)); box-shadow: inset 0 0 0 1px var(--line); }
.tsr-stage canvas.fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 40; }
.tsr-rfoot { flex: 0 0 auto; min-height: 64px; padding: 10px calc(20px + var(--safe-r)) calc(12px + var(--safe-b)) calc(20px + var(--safe-l)); display: flex; align-items: center; justify-content: center; text-align: center; }
.tsr-hint { font-size: .94em; color: var(--ink-2); font-weight: 500; max-width: 440px; line-height: 1.35; }
.tsr-hint b { color: var(--ink); font-weight: 600; }

/* Completion moment */
.tsr-finale { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; text-align: center; pointer-events: none; }
.tsr-finale > * { pointer-events: auto; }
.tsr-finale .veil { position: absolute; inset: 0; background: radial-gradient(70% 60% at 50% 45%, color-mix(in srgb, var(--surface) 92%, transparent), color-mix(in srgb, var(--surface) 70%, transparent)); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); pointer-events: none; }
.tsr-finale .t-title, .tsr-finale .t-sub { position: relative; max-width: 360px; }

/* ---------- Ritual building blocks ---------- */
.rk-abs { position: absolute; left: 0; top: 0; will-change: transform; }
.rk-center { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
.rk-word { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; font-weight: 600; letter-spacing: -.012em; line-height: 1.15; color: var(--stage-ink); }
.rk-word .tx { min-width: 0; overflow-wrap: anywhere; }
.rk-word .im { flex: 0 0 auto; border-radius: 50%; overflow: hidden; background: var(--fill); }
.rk-word .im img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rk-word.col { flex-direction: column; text-align: center; gap: 6px; }
.rk-word.face .im img { transform: scale(1.16); }
.rk-btn {
  position: absolute; z-index: 30; min-height: 48px; padding: 0 22px; border-radius: 999px; border: 0; cursor: pointer;
  font: inherit; font-weight: 650; letter-spacing: -.01em; color: var(--accent-ink); background: var(--accent); box-shadow: var(--shadow-2);
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; touch-action: none; white-space: nowrap;
  transition: transform .4s cubic-bezier(.34,1.56,.64,1), opacity .3s, background-color .25s;
}
.rk-btn:active, .rk-btn.down { transform: scale(.94); transition-duration: .08s; }
.rk-btn.soft { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-1), inset 0 0 0 1px var(--line); }
.rk-btn:disabled { opacity: .4; }
.rk-ring { position: absolute; pointer-events: none; }

/* ---------- Popover & sheets ---------- */
.tsr-scrim { position: absolute; inset: 0; z-index: 70; background: rgba(10,10,14,.32); }
.tsr-pop {
  position: absolute; z-index: 80; top: calc(var(--bar) + var(--safe-t) - 4px); right: calc(10px + var(--safe-r)); width: min(330px, calc(100% - 20px));
  max-height: calc(100% - var(--bar) - var(--safe-t) - 16px); overflow-y: auto; overscroll-behavior: contain;
  background: var(--raised); border-radius: 18px; box-shadow: var(--shadow-2), 0 0 0 1px var(--line); padding: 6px 0; transform-origin: 92% 0;
}
.tsr-pop h4 { margin: 10px 16px 4px; }
.tsr-prow { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 4px 16px; }
.tsr-prow + .tsr-prow { border-top: 1px solid var(--line); }
.tsr-prow .lbl { font-size: .94em; font-weight: 500; }
.tsr-prow .lbl small { display: block; font-size: .8em; color: var(--ink-2); font-weight: 400; margin-top: 1px; }
.tsr-sep { height: 8px; background: var(--fill); margin: 6px 0; border: 0; }
.tsr-seg { display: inline-flex; padding: 2px; border-radius: 10px; background: var(--fill-2); gap: 2px; }
.tsr-seg button { min-width: 54px; height: 32px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; color: var(--ink); font: inherit; font-size: .82em; font-weight: 550; cursor: pointer; transition: background-color .2s, box-shadow .2s; }
.tsr-seg button[aria-pressed="true"] { background: var(--raised); box-shadow: 0 1px 3px rgba(0,0,0,.14), 0 0 0 .5px rgba(0,0,0,.05); }
.tsr-switch { position: relative; width: 51px; height: 31px; flex: 0 0 auto; border-radius: 99px; border: 0; padding: 0; cursor: pointer; background: var(--fill-3); transition: background-color .25s; }
.tsr-switch::after { content: ""; position: absolute; left: 2px; top: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.2); transition: transform .32s cubic-bezier(.34,1.4,.64,1); }
.tsr-switch[aria-checked="true"] { background: var(--good); }
.tsr-switch[aria-checked="true"]::after { transform: translateX(20px); }
.tsr-range { width: 100%; accent-color: var(--accent); height: 28px; }
.tsr-sheet {
  position: absolute; z-index: 80; left: 0; right: 0; bottom: 0; margin: 0 auto; max-width: 560px; max-height: 88%;
  overflow-y: auto; overscroll-behavior: contain; background: var(--raised); border-radius: 24px 24px 0 0; box-shadow: var(--shadow-2);
  padding: 10px calc(20px + var(--safe-r)) calc(22px + var(--safe-b)) calc(20px + var(--safe-l));
}
@media (min-width: 700px) { .tsr-sheet { bottom: 24px; border-radius: 24px; } }
.tsr-grab { width: 38px; height: 5px; border-radius: 99px; background: var(--fill-3); margin: 0 auto 14px; }
.tsr-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); text-decoration: none; color: var(--ink); }
.tsr-line:last-child { border-bottom: 0; }
.tsr-line b { font-weight: 600; font-size: .94em; }
.tsr-line span { color: var(--accent); font-weight: 600; font-size: .94em; white-space: nowrap; }
.tsr-toast { position: absolute; z-index: 90; left: 50%; bottom: calc(24px + var(--safe-b)); transform: translateX(-50%); max-width: calc(100% - 40px); padding: 11px 18px; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: .88em; font-weight: 550; box-shadow: var(--shadow-2); text-align: center; }

/* ---------- Splash ---------- */
.tsr-splash { position: absolute; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; background: var(--bg); }
.tsr-splash .word { font-size: 1.5em; font-weight: 650; letter-spacing: -.03em; }

/* ---------- Keyframes ---------- */
@keyframes tsrBreathe { 0%, 100% { transform: scale(1); } 45% { transform: scale(1.035); } }
@keyframes tsrPulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@keyframes tsrFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes tsrSpin { to { transform: rotate(360deg); } }
@keyframes tsrFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.tsr[data-reduced="1"] *, .tsr[data-reduced="1"] *::before, .tsr[data-reduced="1"] *::after { animation-duration: .001s !important; animation-iteration-count: 1 !important; }
.sr-only { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
`

/* ---------- Icons (SF-style line glyphs) ---------- */

const ICONS: Record<string, React.ReactNode> = {
    back: <path d="M15 4.5 7.5 12l7.5 7.5" />,
    forward: <path d="M9 4.5 16.5 12 9 19.5" />,
    close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
    music: <><path d="M9 18V5.5l11-2V16" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
    musicOff: <><path d="M9 18V9m0-3.5 11-2V12" /><circle cx="6.5" cy="18" r="2.5" /><path d="M3.5 3.5l17 17" /></>,
    settings: <><circle cx="12" cy="12" r="3.1" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></>,
    support: <path d="M12 20.3s-7.8-4.6-7.8-10.2A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.8 2.7c0 5.6-7.8 10.2-7.8 10.2z" />,
    mic: <><rect x="9" y="3" width="6" height="11.5" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
    image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3.5" /><circle cx="9" cy="10" r="1.7" /><path d="m20.5 16-4.8-4.6-8.7 8.1" /></>,
    x: <path d="M7 7l10 10M17 7 7 17" />,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    shuffle: <><path d="M3.5 7h3.2c2 0 3.2 1 4.3 2.6l2 3c1.1 1.6 2.3 2.6 4.3 2.6h3.2" /><path d="M3.5 17h3.2c1.4 0 2.4-.5 3.2-1.4M13.3 8.4c.8-.9 1.8-1.4 3.2-1.4h3.2" /><path d="m18 4.5 2.5 2.5L18 9.5M18 14.5l2.5 2.5-2.5 2.5" /></>,
    sparkle: <path d="M12 3.5c.5 4 2.4 6 6.5 6.5-4.1.5-6 2.5-6.5 6.5-.5-4-2.4-6-6.5-6.5 4.1-.5 6-2.5 6.5-6.5z" />,
    hand: <path d="M8.5 12V6.2a1.5 1.5 0 0 1 3 0V11m0-1.5V4.8a1.5 1.5 0 0 1 3 0V11m0-4a1.5 1.5 0 0 1 3 0v6.5c0 4-2.7 7-6.5 7-2.6 0-4.2-1.3-5.6-3.4L3.3 14a1.5 1.5 0 0 1 2.4-1.7l2.8 2.6" />,
    check: <path d="M5 12.5 10 17.5 19 7" />,
    phone: <path d="M6.6 3.5h2.8l1.4 4-2 1.4a12 12 0 0 0 6.3 6.3l1.4-2 4 1.4v2.8a2 2 0 0 1-2.2 2C10 18.8 5.2 14 4.6 5.7a2 2 0 0 1 2-2.2z" />,
    link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" /></>,
    restart: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v4h4" /></>,
}

function Icon({ name, size = 22, stroke = 2 }: { name: keyof typeof ICONS | string; size?: number; stroke?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {ICONS[name] || null}
        </svg>
    )
}

/** The ThinkStill eclipse: a calm ring with a soft crescent and a single point of light. */
function EclipseMark({ size = 28, draw = false }: { size?: number; draw?: boolean }) {
    return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" style={{ overflow: "visible", display: "block" }}>
            <circle cx="33.5" cy="33.5" r="21" fill="none" stroke="var(--accent)" strokeOpacity=".28" strokeWidth="3" />
            <circle cx="31" cy="31" r="21" fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" pathLength={1}
                style={draw ? { strokeDasharray: 1, strokeDashoffset: 1, animation: "tsrDraw 1.3s cubic-bezier(.22,1,.36,1) .1s forwards" } : undefined} />
            <circle cx="50.6" cy="36.4" r="3.2" fill="var(--warm)" style={draw ? { opacity: 0, animation: "tsrFadeUp .6s ease 1.1s forwards" } : undefined} />
            <style>{"@keyframes tsrDraw{to{stroke-dashoffset:0}}"}</style>
        </svg>
    )
}

/* ================================================================== */
/* 4. RITUAL KIT                                                       */
/* ================================================================== */

interface FX {
    sound: (name: SoundName, pitch?: number) => void
    loop: (kind: "hum" | "motor" | "wind" | "rain" | "fire") => Loop
    haptic: (kind?: "light" | "medium" | "heavy" | "tick" | "success" | "warn" | "buzz") => void
    burst: (x: number, y: number, o?: BurstOptions) => void
    reduced: boolean
}

interface RitualProps {
    items: Item[]
    phrase: string
    emo: Emotion
    char: CharSlug
    faces: string[]
    w: number
    h: number
    dark: boolean
    reduced: boolean
    fx: FX
    intensity: number | null
    progress: (p: number) => void
    done: () => void
    hint: (text: string | null, sticky?: boolean) => void
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => t * t * (3 - 2 * t)
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

function useLatest<T>(value: T) {
    const r = React.useRef(value)
    r.current = value
    return r
}

/** Timers that are always cleaned up with the component. */
function useTimers() {
    const ids = React.useRef<Set<number>>(new Set())
    React.useEffect(() => () => { ids.current.forEach((id) => window.clearTimeout(id)); ids.current.clear() }, [])
    return React.useMemo(() => ({
        after(ms: number, fn: () => void) {
            const id = window.setTimeout(() => { ids.current.delete(id); fn() }, ms)
            ids.current.add(id)
            return id
        },
        clear() { ids.current.forEach((id) => window.clearTimeout(id)); ids.current.clear() },
    }), [])
}

/** requestAnimationFrame loop with delta time; pauses while the tab is hidden. */
function useFrame(cb: (dt: number, t: number) => void | boolean, active = true) {
    const cbRef = useLatest(cb)
    React.useEffect(() => {
        if (!active || typeof window === "undefined") return
        let raf = 0, last = performance.now(), alive = true
        const tick = (now: number) => {
            if (!alive) return
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const keep = cbRef.current(dt, now / 1000)
            if (keep === false) return
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => { alive = false; cancelAnimationFrame(raf) }
    }, [active])
}

/** Critically-damped-ish spring integrator for hand-written physics. */
function springTo(s: { x: number; v: number }, target: number, dt: number, k = 180, c = 22) {
    const a = -k * (s.x - target) - c * s.v
    s.v += a * dt
    s.x += s.v * dt
    return s
}

/* ---------- Pointer dragging with velocity ---------- */

interface DragInfo { x: number; y: number; dx: number; dy: number; vx: number; vy: number; startX: number; startY: number; t: number; id: number }
interface DragHandlers {
    onStart?: (d: DragInfo, e: PointerEvent) => boolean | void
    onMove?: (d: DragInfo, e: PointerEvent) => void
    onEnd?: (d: DragInfo, e: PointerEvent | null) => void
}

/** Attaches pointer drag tracking to an element; coordinates are relative to `frame` (the stage). */
function useDrag(target: React.RefObject<HTMLElement | SVGElement | null>, frame: React.RefObject<HTMLElement | null>, handlers: DragHandlers, enabled = true, rebindKey: unknown = 0) {
    const h = useLatest(handlers)
    React.useEffect(() => {
        const el = target.current as HTMLElement | null
        if (!el || !enabled) return
        let active: DragInfo | null = null
        let lastX = 0, lastY = 0, lastT = 0
        const rel = (e: PointerEvent) => {
            const r = (frame.current || el).getBoundingClientRect()
            return { x: e.clientX - r.left, y: e.clientY - r.top }
        }
        const down = (e: PointerEvent) => {
            if (active || (e.pointerType === "mouse" && e.button !== 0)) return
            const p = rel(e)
            const info: DragInfo = { x: p.x, y: p.y, dx: 0, dy: 0, vx: 0, vy: 0, startX: p.x, startY: p.y, t: performance.now(), id: e.pointerId }
            if (h.current.onStart && h.current.onStart(info, e) === false) return
            active = info
            lastX = p.x; lastY = p.y; lastT = info.t
            try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
            e.preventDefault()
        }
        const move = (e: PointerEvent) => {
            if (!active || e.pointerId !== active.id) return
            const p = rel(e)
            const now = performance.now()
            const dt = Math.max(1, now - lastT) / 1000
            const ivx = (p.x - lastX) / dt, ivy = (p.y - lastY) / dt
            active.vx = active.vx * 0.6 + ivx * 0.4
            active.vy = active.vy * 0.6 + ivy * 0.4
            active.x = p.x; active.y = p.y
            active.dx = p.x - active.startX; active.dy = p.y - active.startY
            lastX = p.x; lastY = p.y; lastT = now
            h.current.onMove && h.current.onMove(active, e)
        }
        const up = (e: PointerEvent) => {
            if (!active || e.pointerId !== active.id) return
            // Velocity decays if the finger rested before lifting.
            const rest = performance.now() - lastT
            if (rest > 220) { active.vx *= 0.2; active.vy *= 0.2 } else if (rest > 120) { active.vx *= 0.6; active.vy *= 0.6 }
            const done = active
            active = null
            try { el.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
            h.current.onEnd && h.current.onEnd(done, e)
        }
        el.addEventListener("pointerdown", down)
        el.addEventListener("pointermove", move)
        el.addEventListener("pointerup", up)
        el.addEventListener("pointercancel", up)
        el.addEventListener("lostpointercapture", up as any)
        return () => {
            el.removeEventListener("pointerdown", down)
            el.removeEventListener("pointermove", move)
            el.removeEventListener("pointerup", up)
            el.removeEventListener("pointercancel", up)
            el.removeEventListener("lostpointercapture", up as any)
            if (active && h.current.onEnd) h.current.onEnd(active, null)
        }
        // Bind once per element: re-binding mid-gesture would cancel the drag.
    }, [enabled, rebindKey])
}

/** Press-and-hold helper with keyboard support (Space / Enter). */
function useHold(onDown: () => void, onUp: () => void) {
    const down = useLatest(onDown), up = useLatest(onUp)
    const held = React.useRef(false)
    const start = React.useCallback((e?: React.SyntheticEvent) => {
        if (held.current) return
        held.current = true
        if (e && "pointerId" in (e as any)) { try { (e.currentTarget as HTMLElement).setPointerCapture((e as any).pointerId) } catch { /* ignore */ } }
        down.current()
    }, [])
    const end = React.useCallback(() => {
        if (!held.current) return
        held.current = false
        up.current()
    }, [])
    React.useEffect(() => () => { if (held.current) { held.current = false; up.current() } }, [])
    return {
        onPointerDown: (e: React.PointerEvent) => { if (e.pointerType === "mouse" && e.button !== 0) return; e.preventDefault(); start(e) },
        onPointerUp: end,
        onPointerCancel: end,
        onLostPointerCapture: end,
        onKeyDown: (e: React.KeyboardEvent) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); start() } },
        onKeyUp: (e: React.KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); end() } },
        onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
    }
}

/* ---------- Particles: one canvas per stage, only animates while something is alive ---------- */

type ParticleKind = "spark" | "ember" | "drop" | "dust" | "shard" | "petal" | "ring" | "glow" | "rain" | "steam" | "bubble" | "flame" | "streak"
interface BurstOptions { kind?: ParticleKind; n?: number; color?: string | string[]; speed?: number; spread?: number; angle?: number; size?: number; life?: number; gravity?: number; vx?: number; vy?: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: ParticleKind; g: number; rot: number; spin: number; seed: number }

const clearCache = new Map<string, string>()
/** The same colour at zero alpha, so glows fade into light rather than through black. */
function clearOf(c: string): string {
    let out = clearCache.get(c)
    if (out) return out
    const m = c.match(/^(hsla?|rgba?)\(([^)]*)\)$/i)
    if (m) { const parts = m[2].split(",").slice(0, 3).map((x) => x.trim()); out = `${m[1].toLowerCase().startsWith("hsl") ? "hsla" : "rgba"}(${parts.join(", ")}, 0)` }
    else if (/^#([0-9a-f]{6})$/i.test(c)) { const n = parseInt(c.slice(1), 16); out = `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 0)` }
    else out = "rgba(255,255,255,0)"
    clearCache.set(c, out)
    return out
}

function createParticles(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")
    const list: Particle[] = []
    let raf = 0, w = 0, h = 0, dpr = 1, last = 0, additive = false
    const resize = () => {
        const r = canvas.getBoundingClientRect()
        dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1)
        w = r.width; h = r.height
        canvas.width = Math.max(1, Math.round(w * dpr))
        canvas.height = Math.max(1, Math.round(h * dpr))
    }
    const frame = (now: number) => {
        if (!ctx) return
        const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
        last = now
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i]
            p.life += dt
            if (p.life >= p.max) { list.splice(i, 1); continue }
            const t = p.life / p.max
            if (p.kind === "ember") { p.vx += Math.sin(p.seed + p.life * 3) * 14 * dt; p.vy -= 10 * dt }
            if (p.kind === "dust" || p.kind === "steam" || p.kind === "bubble") { p.vx += Math.sin(p.seed + p.life * 2) * 8 * dt }
            p.vy += p.g * dt
            const drag = p.kind === "spark" || p.kind === "shard" ? 0.985 : 0.995
            p.vx *= drag; p.vy *= drag
            p.x += p.vx * dt; p.y += p.vy * dt
            p.rot += p.spin * dt
            if (p.kind === "flame") { p.vx *= 0.96; p.vy -= 60 * dt }
            const a = p.kind === "ember" ? (1 - t) * (0.7 + 0.3 * Math.sin(p.seed * 7 + p.life * 18)) : p.kind === "flame" ? Math.sin(Math.PI * Math.min(1, t * 1.4)) * 0.9 : 1 - t * t
            ctx.globalAlpha = Math.max(0, Math.min(1, a))
            ctx.globalCompositeOperation = additive && (p.kind === "glow" || p.kind === "ember" || p.kind === "spark" || p.kind === "flame" || p.kind === "streak") ? "lighter" : "source-over"
            ctx.fillStyle = p.color
            ctx.strokeStyle = p.color
            switch (p.kind) {
                case "ring": {
                    ctx.lineWidth = Math.max(0.5, 2.2 * (1 - t))
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.3 + smooth(t) * 1.2), 0, Math.PI * 2); ctx.stroke()
                    break
                }
                case "glow":
                case "ember": {
                    const r = p.size * (p.kind === "glow" ? 1 + t : 1 - t * 0.4)
                    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4)
                    g.addColorStop(0, p.color); g.addColorStop(0.35, p.color); g.addColorStop(1, clearOf(p.color))
                    ctx.fillStyle = g
                    ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2); ctx.fill()
                    break
                }
                case "flame": {
                    const r = p.size * (1.2 - t * 0.8)
                    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2)
                    g.addColorStop(0, "rgba(255,245,200,1)"); g.addColorStop(0.3, p.color); g.addColorStop(1, "rgba(255,60,0,0)")
                    ctx.fillStyle = g
                    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.2, r * 2, 0, 0, Math.PI * 2); ctx.fill()
                    break
                }
                case "streak": {
                    ctx.lineWidth = p.size * (1 - t); ctx.lineCap = "round"
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06); ctx.stroke()
                    break
                }
                case "drop": {
                    const len = Math.min(10, Math.hypot(p.vx, p.vy) * 0.03)
                    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.6, p.size * 0.6 + len, Math.atan2(p.vy, p.vx) - Math.PI / 2, 0, Math.PI * 2); ctx.fill()
                    break
                }
                case "rain": {
                    ctx.lineWidth = p.size; ctx.lineCap = "round"
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke()
                    break
                }
                case "shard":
                case "petal": {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
                    if (p.kind === "shard") { ctx.beginPath(); ctx.moveTo(-p.size, -p.size * 0.5); ctx.lineTo(p.size, -p.size * 0.2); ctx.lineTo(-p.size * 0.2, p.size); ctx.closePath(); ctx.fill() }
                    else { ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2); ctx.fill() }
                    ctx.restore()
                    break
                }
                case "steam":
                case "dust":
                case "bubble": {
                    const r = p.size * (p.kind === "steam" ? 1 + t * 1.6 : 1)
                    if (p.kind === "bubble") { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke() }
                    else { ctx.globalAlpha *= p.kind === "steam" ? 0.35 : 0.6; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill() }
                    break
                }
                default: {
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill()
                }
            }
        }
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = "source-over"
        if (list.length) raf = requestAnimationFrame(frame)
        else { raf = 0; ctx.clearRect(0, 0, w, h) }
    }
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) } }
    resize()
    return {
        resize,
        setAdditive(v: boolean) { additive = v },
        burst(x: number, y: number, o: BurstOptions = {}) {
            const kind = o.kind || "spark"
            const n = Math.min(80, o.n ?? 10)
            const colors = Array.isArray(o.color) ? o.color : [o.color || "#ffffff"]
            if (list.length > 420) list.splice(0, list.length - 420)
            for (let i = 0; i < n; i++) {
                const ang = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2)
                const sp = (o.speed ?? 160) * (0.45 + Math.random() * 0.75)
                list.push({
                    x: x + (kind === "rain" ? rand(-w / 2, w / 2) : 0), y, kind,
                    vx: (o.vx ?? 0) + Math.cos(ang) * sp, vy: (o.vy ?? 0) + Math.sin(ang) * sp,
                    life: 0, max: (o.life ?? 0.9) * (0.7 + Math.random() * 0.6),
                    size: (o.size ?? 3) * (0.6 + Math.random() * 0.8), color: colors[i % colors.length],
                    g: o.gravity ?? (kind === "drop" || kind === "shard" || kind === "rain" ? 620 : kind === "petal" ? 60 : 0),
                    rot: Math.random() * 6, spin: rand(-6, 6), seed: Math.random() * 100,
                })
            }
            kick()
        },
        destroy() { cancelAnimationFrame(raf); raf = 0; list.length = 0 },
    }
}

/* ---------- Visual primitives ---------- */

function WordBody({ item, size = 17, layout = "row", imgSize, face = false, style, className = "" }: { item: Item; size?: number; layout?: "row" | "col"; imgSize?: number; face?: boolean; style?: React.CSSProperties; className?: string }) {
    const [broken, setBroken] = React.useState(false)
    const im = imgSize ?? Math.round(size * 1.9)
    const showImg = !!item.img && !broken
    return (
        <span className={`rk-word ${layout === "col" ? "col" : ""} ${face || (item.img || "").includes("bubble-expressions") ? "face" : ""} ${className}`} style={{ fontSize: size, ...style }}>
            {showImg ? (
                <span className="im" style={{ width: im, height: im }}>
                    <img src={item.img!} alt="" draggable={false} onError={() => setBroken(true)} />
                </span>
            ) : null}
            {item.text ? <span className="tx">{item.text}</span> : null}
        </span>
    )
}

/** The emotional companion: a character portrait whose expression eases as the ritual progresses. */
function Companion({ faces, step, size = 56, breathe = true, ring = false, progress = 0, label }: { faces: string[]; step: number; size?: number; breathe?: boolean; ring?: boolean; progress?: number; label?: string }) {
    const idx = clamp(Math.round(step), 0, faces.length - 1)
    const [shown, setShown] = React.useState(idx)
    const [prev, setPrev] = React.useState<number | null>(null)
    const [failed, setFailed] = React.useState<Record<string, boolean>>({})
    React.useEffect(() => {
        if (idx === shown) return
        setPrev(shown)
        setShown(idx)
        const t = window.setTimeout(() => setPrev(null), 760)
        return () => window.clearTimeout(t)
    }, [idx])
    React.useEffect(() => {
        // Warm the cache so expression changes never flash.
        faces.forEach((src) => { const i = new Image(); i.decoding = "async"; i.src = src })
    }, [faces.join("|")])
    const src = faces[shown]
    const r = 46, c = 2 * Math.PI * r
    return (
        <div className={`tsr-companion ${breathe ? "breathe" : ""}`} style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
            <div className="halo" />
            <div className="orb">
                {prev != null && faces[prev] && !failed[faces[prev]] ? <img key={"p" + prev} src={faces[prev]} alt="" draggable={false} style={{ opacity: 0 }} /> : null}
                {src && !failed[src] ? (
                    <img key={"s" + shown} src={src} alt="" draggable={false} style={{ opacity: 1, animation: "tsrFadeIn .7s ease both" }} onError={() => setFailed((f) => ({ ...f, [src]: true }))} />
                ) : (
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--ink-2)" }}>
                        <EclipseMark size={size * 0.5} />
                    </div>
                )}
            </div>
            {ring ? (
                <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r={r} fill="none" stroke="var(--fill-2)" strokeWidth="3" />
                    <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--ch), 66%, 58%)" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={c} strokeDashoffset={c * (1 - clamp(progress, 0, 1))} transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)" }} />
                </svg>
            ) : null}
            <style>{"@keyframes tsrFadeIn{from{opacity:0}to{opacity:1}}"}</style>
        </div>
    )
}

/** A tiny state helper so rituals can report progress once per change. */
function useProgress(props: RitualProps, total: number) {
    const [n, setN] = React.useState(0)
    const doneRef = React.useRef(false)
    const p = useLatest(props)
    React.useEffect(() => {
        p.current.progress(total ? n / total : 0)
        if (n >= total && total > 0 && !doneRef.current) {
            doneRef.current = true
            p.current.done()
        }
    }, [n, total])
    return [n, setN] as const
}

/** Text size that fits nicely for a stage of this width. */
const stageFont = (w: number, k = 1) => Math.round(clamp(w / 21, 15, 21) * k)

/* ---------- Atmosphere: slow light and floating motes that ease from the feeling toward calm ---------- */

function AmbientLayer({ hue, calmHue, progress, dark, reduced }: { hue: number; calmHue: number; progress: number; dark: boolean; reduced: boolean }) {
    const ref = React.useRef<HTMLCanvasElement>(null)
    const prog = useLatest(progress)
    React.useEffect(() => {
        const cv = ref.current
        if (!cv) return
        const ctx = cv.getContext("2d")
        if (!ctx) return
        let raf = 0, alive = true, last = 0
        const motes = Array.from({ length: reduced ? 0 : 26 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.8, v: 0.006 + Math.random() * 0.014, ph: Math.random() * 6 }))
        const draw = (now: number) => {
            if (!alive) return
            if (now - last < 33) { raf = requestAnimationFrame(draw); return } // ~30fps is plenty for ambience
            last = now
            const r = cv.getBoundingClientRect()
            const dpr = Math.min(1.5, window.devicePixelRatio || 1)
            const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr))
            if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H }
            const t = now / 1000
            const p = smooth(clamp(prog.current, 0, 1))
            const hh = lerp(hue, calmHue + (calmHue - hue > 180 ? -360 : hue - calmHue > 180 ? 360 : 0), p)
            ctx.clearRect(0, 0, W, H)
            ctx.globalCompositeOperation = dark ? "lighter" : "source-over"
            // Two palettes cross-fade (never a muddy hue in between): the feeling's light, then calm light.
            for (const [hueX, weight] of [[hue, 1 - p], [calmHue, p]] as [number, number][]) {
                if (weight < 0.02) continue
                for (let i = 0; i < 3; i++) {
                    const cx = W * (0.5 + 0.38 * Math.sin(t * (0.07 + i * 0.023) + i * 2.1))
                    const cy = H * (0.45 + 0.36 * Math.cos(t * (0.05 + i * 0.019) + i * 1.3))
                    const rad = Math.max(W, H) * (0.42 + 0.08 * Math.sin(t * 0.2 + i))
                    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
                    const a = (dark ? 0.11 : 0.16) * weight
                    g.addColorStop(0, `hsla(${hueX + i * 14}, ${dark ? 75 : 85}%, ${dark ? 58 : 76}%, ${a})`)
                    g.addColorStop(1, `hsla(${hueX + i * 14}, 80%, 60%, 0)`)
                    ctx.fillStyle = g
                    ctx.fillRect(0, 0, W, H)
                }
            }
            for (const m of motes) {
                m.y -= m.v * 0.033 * (1 + p)
                if (m.y < -0.02) { m.y = 1.02; m.x = Math.random() }
                const tw = 0.35 + 0.35 * Math.sin(t * 1.6 + m.ph)
                ctx.fillStyle = dark ? `hsla(${hh}, 90%, 85%, ${tw})` : `hsla(${hh}, 70%, 55%, ${tw * 0.45})`
                ctx.beginPath(); ctx.arc((m.x + Math.sin(t * 0.3 + m.ph) * 0.01) * W, m.y * H, m.s * dpr, 0, Math.PI * 2); ctx.fill()
            }
            ctx.globalCompositeOperation = "source-over"
            if (!reduced) raf = requestAnimationFrame(draw)
        }
        raf = requestAnimationFrame(draw)
        const onVis = () => { if (!document.hidden && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw) } else cancelAnimationFrame(raf) }
        document.addEventListener("visibilitychange", onVis)
        return () => { alive = false; cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis) }
    }, [hue, calmHue, dark, reduced])
    return <canvas ref={ref} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 35, mixBlendMode: dark ? "screen" : "soft-light" }} />
}

/** Pentatonic steps so progress sounds like a melody rising, never a beep. */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51]

/** Branching ice crystals that grow in from the edges as `level` rises (0..1). */
function FrostCanvas({ w, h, level, dark }: { w: number; h: number; level: number; dark: boolean }) {
    const ref = React.useRef<HTMLCanvasElement>(null)
    const segs = React.useMemo(() => {
        const out: { x1: number; y1: number; x2: number; y2: number; at: number; wdt: number }[] = []
        const grow = (x: number, y: number, ang: number, len: number, depth: number, at: number, seed: number) => {
            if (depth > 5 || len < 4) return
            const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len
            out.push({ x1: x, y1: y, x2, y2, at, wdt: Math.max(0.5, 2.4 - depth * 0.4) })
            const n = depth < 2 ? 3 : 2
            for (let k = 0; k < n; k++) {
                const r = hashNoise(seed, k + depth * 7)
                grow(x2, y2, ang + (k - (n - 1) / 2) * (0.5 + r * 0.4), len * (0.55 + r * 0.2), depth + 1, at + 0.12, seed * 3 + k + 1)
            }
        }
        const seeds = 14
        for (let i = 0; i < seeds; i++) {
            const edge = i % 4, u = hashNoise(i, 51)
            const x = edge === 0 ? u * w : edge === 1 ? w : edge === 2 ? u * w : 0
            const y = edge === 0 ? 0 : edge === 1 ? u * h : edge === 2 ? h : u * h
            const ang = Math.atan2(h / 2 - y, w / 2 - x) + (hashNoise(i, 52) - 0.5) * 0.8
            grow(x, y, ang, Math.min(w, h) * (0.12 + hashNoise(i, 53) * 0.08), 0, hashNoise(i, 54) * 0.35, i + 1)
        }
        return out
    }, [w, h])
    React.useEffect(() => {
        const c = ref.current, g = c?.getContext("2d")
        if (!c || !g) return
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.clearRect(0, 0, w, h)
        g.lineCap = "round"
        g.shadowColor = "rgba(190,225,255,.9)"; g.shadowBlur = 6
        for (const s of segs) {
            const k = clamp((level * 1.1 - s.at) / 0.25, 0, 1)
            if (k <= 0) continue
            g.strokeStyle = dark ? `rgba(210,235,255,${0.55 * k})` : `rgba(120,170,215,${0.6 * k})`
            g.lineWidth = s.wdt
            g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x1 + (s.x2 - s.x1) * k, s.y1 + (s.y2 - s.y1) * k); g.stroke()
        }
    }, [segs, level, dark, w, h])
    return <canvas ref={ref} aria-hidden="true" style={{ position: "absolute", inset: 0, width: w, height: h, pointerEvents: "none" }} />
}

/* ================================================================== */
/* 5. RITUALS                                                          */
/* ================================================================== */

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${Math.round(h)}, ${s}%, ${l}%, ${a})`
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100
    const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return [f(0) * 255, f(8) * 255, f(4) * 255]
}
/** Blends two hues in RGB, so a warm-to-cool change never passes through a muddy green. */
function mixHsl(h1: number, h2: number, t: number, s: number, l: number, a = 1) {
    const x = hslToRgb(h1, s, l), y = hslToRgb(h2, s, l), k = clamp(t, 0, 1)
    return `rgba(${Math.round(lerp(x[0], y[0], k))}, ${Math.round(lerp(x[1], y[1], k))}, ${Math.round(lerp(x[2], y[2], k))}, ${a})`
}
const warmEmbers = ["#FFB36B", "#FF8A3D", "#FFD39A", "#FF6A3D"]

/** Even, slightly organic positions for n round objects of radius r inside a box. */
function scatter(n: number, w: number, h: number, r: number, top = 0, bottom = 0): { x: number; y: number }[] {
    const cols = n <= 2 ? n : n <= 4 ? 2 : 3
    const rows = Math.ceil(n / cols)
    const cw = w / cols, ch = (h - top - bottom) / rows
    const out: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
        const row = Math.floor(i / cols), col = i % cols
        const inRow = Math.min(cols, n - row * cols)
        const offset = (cols - inRow) * cw / 2
        const jx = (hashNoise(i, 3) - 0.5) * Math.max(0, cw - r * 2) * 0.5
        const jy = (hashNoise(i, 9) - 0.5) * Math.max(0, ch - r * 2) * 0.5
        out.push({ x: clamp(offset + cw * (col + 0.5) + jx, r + 6, w - r - 6), y: clamp(top + ch * (row + 0.5) + jy, top + r + 6, h - bottom - r - 6) })
    }
    return out
}

/* ---------- 6 · ZAP — lightning only exists while you hold it ---------- */

function RitualZap(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const shellW = Math.min(w * 0.6, 300), shellH = Math.min(118, h * 0.2)
    const cx = w / 2, cy = h * 0.44
    const leftX = Math.max(26, cx - shellW / 2 - 64), rightX = Math.min(w - 26, cx + shellW / 2 + 64)
    const [holding, setHolding] = React.useState(false)
    const [charge, setCharge] = React.useState(0)
    const [hits, setHits] = React.useState(0)
    const [broken, setBroken] = React.useState(false)
    const boltA = React.useRef<SVGPolylineElement>(null), boltB = React.useRef<SVGPolylineElement>(null)
    const forks = React.useRef<(SVGPolylineElement | null)[]>([])
    const flash = React.useRef<HTMLDivElement>(null)
    const wordRef = React.useRef<HTMLDivElement>(null)
    const c = React.useRef({ charge: 0, hits: 0, next: 0, loop: null as Loop | null })
    const timers = useTimers()
    const HITS = 4

    const start = () => {
        if (broken) return
        setHolding(true)
        c.current.loop = fx.loop("hum")
        fx.haptic("light")
    }
    const stop = () => {
        setHolding(false)
        c.current.loop?.stop()
        c.current.loop = null
    }
    const hold = useHold(start, stop)

    useFrame((dt, t) => {
        const s = c.current
        if (holding && !broken) {
            s.charge = Math.min(1, s.charge + dt * 0.32)
            s.loop?.set(160 + s.charge * 260, 0.7 + s.charge * 0.6)
            if (t > s.next) {
                s.next = t + (reduced ? 0.12 : 0.05)
                const make = (amp: number) => {
                    const pts: string[] = []
                    const segs = 9
                    for (let i = 0; i <= segs; i++) {
                        const x = lerp(leftX + 14, rightX - 14, i / segs)
                        const edge = i === 0 || i === segs ? 0 : 1
                        pts.push(`${x.toFixed(1)},${(cy - shellH * 0.36 + (Math.random() - 0.5) * amp * edge).toFixed(1)}`)
                    }
                    return pts.join(" ")
                }
                const main = make(28)
                boltA.current?.setAttribute("points", main)
                boltB.current?.setAttribute("points", main)
                // Forks split off the main bolt and crawl over the shell.
                const pts = main.split(" ").map((q) => q.split(",").map(Number))
                forks.current.forEach((f, k) => {
                    if (!f) return
                    const [x0, y0] = pts[2 + ((k * 3 + Math.floor(Math.random() * 3)) % (pts.length - 3))]
                    let x = x0, y = y0, out = `${x},${y}`
                    const dir = Math.random() < 0.5 ? -1 : 1
                    for (let j = 0; j < 4; j++) { x += rand(-14, 14); y += dir * rand(6, 14); out += ` ${x.toFixed(1)},${y.toFixed(1)}` }
                    f.setAttribute("points", out)
                })
                if (flash.current) flash.current.style.opacity = String(0.05 + Math.random() * 0.12 * s.charge)
            }
            const hit = Math.floor(s.charge * HITS + 1e-6)
            if (hit > s.hits && flash.current) { flash.current.style.transition = "none"; flash.current.style.opacity = "0.55"; requestAnimationFrame(() => { if (flash.current) { flash.current.style.transition = "opacity .35s ease-out"; flash.current.style.opacity = "0" } }) }
            if (hit > s.hits) {
                s.hits = hit
                setHits(hit)
                fx.sound("zap")
                fx.haptic("medium")
                fx.burst(cx + rand(-shellW * 0.3, shellW * 0.3), cy + rand(-10, 10), { kind: "spark", n: 14, size: 2.2, speed: 220, color: ["#FFFFFF", "#CFE3FF", "#9EC8FF"], life: 0.5 })
                props.progress(hit / HITS)
                if (hit >= HITS) {
                    setBroken(true)
                    stop()
                    fx.sound("ice", 0.7)
                    fx.burst(cx, cy, { kind: "shard", n: 26, size: 7, speed: 300, color: [hsl(props.emo.hue, 40, 85, 0.9), "rgba(255,255,255,.85)", hsl(props.emo.calmHue, 50, 80, 0.9)], life: 1.1 })
                    timers.after(1100, props.done)
                }
            }
            setCharge(s.charge)
        }
        // The word buzzes less with every controlled hit.
        if (wordRef.current && !reduced) {
            const amp = broken ? 0 : (1 - s.hits / HITS) * 1.6
            wordRef.current.style.transform = `translate(${(Math.random() - 0.5) * amp}px, ${(Math.random() - 0.5) * amp}px)`
        }
    })

    const cracks = ["M30,10 L44,34 L38,52 L52,74", "M70,8 L62,30 L72,50", "M18,60 L34,72 L30,92", "M84,40 L72,62 L82,88"]
    return (
        <div style={{ position: "absolute", inset: 0 }} {...hold} role="button" tabIndex={0} aria-label="Hold to charge the current">
            <div style={{ position: "absolute", inset: 0, background: dark ? "radial-gradient(80% 60% at 50% 44%, #16203A, #0A0C14 75%)" : "radial-gradient(80% 60% at 50% 44%, #E4EEFF, #EEF0F4 75%)" }} />
            {[leftX, rightX].map((x, i) => (
                <div key={i} style={{ position: "absolute", left: x - 9, top: cy - shellH * 0.36 - 12, width: 18, height: h - (cy - shellH * 0.36) + 12, borderRadius: "9px 9px 0 0", background: props.dark ? "linear-gradient(90deg,#2A2C36,#3A3D4A,#2A2C36)" : "linear-gradient(90deg,#C9CCD6,#E9EBF1,#C9CCD6)", boxShadow: holding ? "0 0 22px rgba(150,200,255,.7)" : "none", transition: "box-shadow .2s" }}>
                    <div style={{ position: "absolute", left: 3, top: 3, width: 12, height: 12, borderRadius: "50%", background: holding ? "#E8F3FF" : props.dark ? "#555A6A" : "#A9AEBB", boxShadow: holding ? "0 0 14px #9EC8FF" : "none" }} />
                </div>
            ))}
            <div ref={flash} style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 50% at 50% 44%, rgba(200,225,255,1), rgba(160,200,255,.3) 60%, transparent)", opacity: 0, pointerEvents: "none", mixBlendMode: dark ? "screen" : "normal" }} />
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: holding && !broken ? 1 : 0, transition: "opacity .06s" }}>
                <polyline ref={boltB} fill="none" stroke="rgba(160,200,255,.55)" strokeWidth="5" strokeLinejoin="round" style={{ filter: "blur(3px)" }} />
                <polyline ref={boltA} fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px #9EC8FF) drop-shadow(0 0 14px #6FA8FF)" }} />
                {[0, 1, 2, 3].map((k) => <polyline key={k} ref={(el) => { forks.current[k] = el }} fill="none" stroke="rgba(220,235,255,.85)" strokeWidth="1.1" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 4px #9EC8FF)" }} />)}
            </svg>
            <div style={{
                position: "absolute", left: cx - shellW / 2, top: cy - shellH / 2, width: shellW, height: shellH, borderRadius: shellH / 2,
                background: props.dark ? "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.04))" : "linear-gradient(180deg, rgba(255,255,255,.95), rgba(240,244,252,.85))",
                boxShadow: `inset 0 0 0 1.5px ${props.dark ? "rgba(255,255,255,.16)" : "rgba(30,40,70,.12)"}, 0 16px 40px rgba(0,0,0,${props.dark ? 0.4 : 0.1})${holding ? ", 0 0 40px rgba(150,200,255,.45)" : ""}`,
                display: "grid", placeItems: "center", padding: "0 22px", overflow: "hidden",
                transform: broken ? "scale(1.15)" : `scale(${1 + charge * 0.03})`, opacity: broken ? 0 : 1,
                transition: broken ? "transform .35s ease-out, opacity .35s ease-out" : "transform .2s",
            }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                    {cracks.slice(0, hits).map((d, i) => <path key={i} d={d} fill="none" stroke={props.dark ? "rgba(255,255,255,.5)" : "rgba(40,50,80,.35)"} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />)}
                </svg>
                <div ref={wordRef}><WordBody item={items[0]} size={stageFont(w, 1.05)} /></div>
            </div>
        </div>
    )
}

/* ---------- 15 · SHRED — paper resists, the blades bite, the words become strips ---------- */

function RitualShred(props: RitualProps) {
    const { items, w, h, fx, reduced } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const paperRef = React.useRef<HTMLDivElement>(null)
    const bodyRef = React.useRef<HTMLButtonElement>(null)
    const pw = Math.min(w * 0.64, 300), ph = Math.min(h * 0.36, pw * 1.05)
    const bodyW = Math.min(w * 0.82, pw + 70), bodyH = 62
    const slotY = Math.max(ph + 18, h * 0.44)
    const outTop = slotY + bodyH - 12
    const strips = 9
    const [fed, setFed] = React.useState(0)
    const [finished, setFinished] = React.useState(false)
    const s = React.useRef({ fed: 0, target: 0, loop: null as Loop | null, lastSound: 0, settled: 0 })
    const timers = useTimers()

    const feed = (amount: number) => {
        if (finished) return
        s.current.target = Math.min(1.08, s.current.target + amount)
    }
    // Ratcheting feed from the finger's travel: the paper resists, then gives.
    const lastY = React.useRef<number | null>(null)
    useDrag(paperRef, stage, {
        onStart: (d) => { lastY.current = d.y; fx.haptic("light") },
        onMove: (d) => {
            if (lastY.current == null) return
            const dy = d.y - lastY.current
            lastY.current = d.y
            if (dy > 0) feed((dy / ph) * 0.62)
        },
        onEnd: () => { lastY.current = null },
    }, !finished)

    useFrame((dt, t) => {
        const st = s.current
        const before = st.fed
        st.fed += (st.target - st.fed) * Math.min(1, dt * 7)
        const moving = st.target - st.fed > 0.003
        if (moving && !st.loop) st.loop = fx.loop("motor")
        if (!moving && st.loop) { st.loop.stop(); st.loop = null; if (bodyRef.current) bodyRef.current.style.transform = "" }
        if (moving) {
            st.loop?.set(160 + (st.target - st.fed) * 900, 1)
            if (t - st.lastSound > 0.11) { st.lastSound = t; fx.sound("tear"); fx.haptic("tick") }
            if (!reduced) {
                fx.burst(w / 2 + rand(-pw / 2, pw / 2), outTop + 4, { kind: "petal", n: 1, size: 3.5, speed: 90, angle: Math.PI / 2, spread: 1.6, color: props.dark ? "#EDE6DA" : "#FFFDF8", life: 1.3, gravity: 380 })
                if (Math.random() < 0.3) fx.burst(w / 2 + rand(-pw / 2, pw / 2), slotY - 4, { kind: "spark", n: 2, size: 1.4, speed: 120, angle: -Math.PI / 2, spread: 1.4, color: ["#FFE2A8", "#FFFFFF"], life: 0.35 })
                if (bodyRef.current) bodyRef.current.style.transform = `translate(${rand(-1.2, 1.2)}px, ${rand(-0.8, 0.8)}px)`
            } else if (bodyRef.current) bodyRef.current.style.transform = ""
            if (!reduced && Math.random() < 0.5) fx.burst(w / 2 + rand(-pw / 2, pw / 2), outTop + 6, { kind: "dust", n: 1, size: 1.6, speed: 40, angle: Math.PI / 2, spread: 1, color: props.dark ? "rgba(255,255,255,.5)" : "rgba(80,70,60,.4)", life: 0.8, gravity: 120 })
        }
        if (Math.abs(st.fed - before) > 0.0005) {
            setFed(st.fed)
            props.progress(Math.min(1, st.fed))
        }
        if (!finished && st.fed >= 1.0) {
            setFinished(true)
            st.loop?.stop(); st.loop = null
            fx.sound("thud", 0.8)
            fx.haptic("success")
            timers.after(1500, props.done)
        }
        if (finished) {
            st.settled = Math.min(1, st.settled + dt * 0.8)
            setFed(st.fed + st.settled * 0.6)
        }
    })

    const f = Math.min(fed, 1.7)
    const paperY = slotY - ph + f * ph
    const paperStyle: React.CSSProperties = {
        width: pw, height: ph, borderRadius: 6, background: "var(--paper)", color: "var(--paper-ink)",
        backgroundImage: `repeating-linear-gradient(180deg, transparent 0 27px, var(--paper-line) 27px 28px)`,
        boxShadow: "0 10px 26px rgba(0,0,0,.14), inset 0 0 0 1px rgba(0,0,0,.04)", display: "grid", placeItems: "center", padding: 22, textAlign: "center",
        fontFamily: "var(--serif)", fontSize: stageFont(w, 1.12), lineHeight: 1.3, fontWeight: 500,
    }
    const content = <span style={{ overflowWrap: "anywhere" }}>{items[0].text}</span>
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: props.dark ? "linear-gradient(180deg, #17171C, #121216)" : "linear-gradient(180deg, #F7F4EF, #EEE9E1)" }} />
            {/* Unshredded paper, clipped at the slot */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: slotY + 2, overflow: "hidden" }}>
                <div ref={paperRef} style={{ position: "absolute", left: (w - pw) / 2, top: 0, transform: `translateY(${paperY}px)`, cursor: finished ? "default" : "grab", touchAction: "none", ...paperStyle }} aria-label="Paper with your words. Drag down to feed it into the shredder." role="img">
                    {content}
                </div>
            </div>
            {/* Strips emerging below the blades */}
            <div style={{ position: "absolute", left: 0, right: 0, top: outTop, bottom: 0, overflow: "hidden", pointerEvents: "none", WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 45%, transparent 100%)", maskImage: "linear-gradient(180deg, #000 0%, #000 45%, transparent 100%)" }}>
                {Array.from({ length: strips }, (_, k) => {
                    const left = (w - pw) / 2 + (pw / strips) * k
                    const spread = (k - (strips - 1) / 2) * (2 + f * 9)
                    const sway = reduced ? 0 : Math.sin(k * 1.9 + f * 6) * 3 * f
                    const drop = (f * ph - ph) + (hashNoise(k, 5) - 0.5) * 14 * f
                    return (
                        <div key={k} style={{ position: "absolute", left, top: 0, width: pw / strips - 1.5, height: ph, overflow: "hidden", transform: `translate(${spread + sway}px, ${drop}px) rotate(${(hashNoise(k, 2) - 0.5) * 6 * f}deg)`, transformOrigin: "50% 0" }}>
                            <div style={{ position: "absolute", left: -(pw / strips) * k, top: 0, ...paperStyle, boxShadow: "none" }}>{content}</div>
                        </div>
                    )
                })}
            </div>
            {/* The shredder */}
            <button ref={bodyRef} type="button" onClick={() => { feed(0.13); fx.haptic("medium") }} disabled={finished} aria-label="Feed one bite into the shredder"
                style={{ position: "absolute", left: (w - bodyW) / 2, top: slotY - 8, width: bodyW, height: bodyH, border: 0, padding: 0, cursor: finished ? "default" : "pointer", borderRadius: 18,
                    background: props.dark ? "linear-gradient(180deg,#2B2C34,#202128)" : "linear-gradient(180deg,#FFFFFF,#E9E6E0)",
                    boxShadow: `0 14px 30px rgba(0,0,0,${props.dark ? 0.45 : 0.13}), inset 0 1px 0 rgba(255,255,255,${props.dark ? 0.06 : 0.9}), inset 0 0 0 1px ${props.dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)"}` }}>
                <span style={{ position: "absolute", left: 18, right: 18, top: 8, height: 5, borderRadius: 4, background: props.dark ? "#0B0B0E" : "#2A2826", boxShadow: "inset 0 1px 2px rgba(0,0,0,.6)" }} />
                <span style={{ position: "absolute", right: 18, bottom: 14, width: 9, height: 9, borderRadius: "50%", background: finished ? "var(--good)" : fed > 0.01 ? "var(--warm)" : "var(--fill-3)", boxShadow: finished ? "0 0 10px var(--good)" : "none", transition: "background-color .4s" }} />
                <span style={{ position: "absolute", left: 18, bottom: 12, fontSize: 12, fontWeight: 650, letterSpacing: ".08em", color: "var(--ink-2)" }}>{finished ? "DONE" : "SHRED"}</span>
            </button>
        </div>
    )
}

/* ---------- 16 · MELT — soft wax letters slump, drip and pool ---------- */

function RitualMelt(props: RitualProps) {
    const { items, w, h, fx, reduced, emo, dark } = props
    const text = items[0].text.slice(0, 26)
    const letters = React.useMemo(() => Array.from(text), [text])
    const lineChars = Math.max(6, Math.min(letters.length, 14))
    const longest = Math.max(4, ...text.split(/\s+/).map((x) => x.length))
    const fs = Math.round(clamp(Math.min((w * 0.86) / (lineChars * 0.6), (w - 40) / (longest * 0.66)), 26, 72))
    const groups = React.useMemo(() => { const out: number[][] = [[]]; letters.forEach((ch, i) => { out[out.length - 1].push(i); if (ch === " ") out.push([]) }); return out }, [letters])
    const [heat, setHeat] = React.useState(false)
    const m = React.useRef(letters.map(() => 0))
    const speeds = React.useMemo(() => letters.map((_, i) => 0.1 + hashNoise(i, 11) * 0.09), [letters.length])
    const els = React.useRef<(HTMLSpanElement | null)[]>([])
    const drips = React.useRef<(HTMLSpanElement | null)[]>([])
    const puddle = React.useRef<HTMLDivElement>(null)
    const st = React.useRef({ loop: null as Loop | null, total: 0, done: false, lastDrip: 0, heat: 0 })
    const timers = useTimers()
    const filterId = React.useMemo(() => "tsrGoo" + Math.round(Math.random() * 1e6), [])
    const wax = React.useRef<HTMLDivElement>(null)
    const hold = useHold(() => { if (!st.current.done) { setHeat(true); st.current.loop = fx.loop("fire"); fx.haptic("light") } }, () => { setHeat(false); st.current.loop?.stop(); st.current.loop = null })

    useFrame((dt, t) => {
        const s = st.current
        s.heat += ((heat ? 1 : 0) - s.heat) * Math.min(1, dt * 4)
        let total = 0
        letters.forEach((ch, i) => {
            if (heat && !s.done) m.current[i] = Math.min(1, m.current[i] + dt * speeds[i] * (0.6 + s.heat))
            const v = m.current[i]
            total += v
            const el = els.current[i]
            if (el) {
                const wob = reduced ? 0 : Math.sin(t * 2 + i) * v * 4
                el.style.transform = `translateY(${v * fs * 0.32}px) scaleY(${1 - v * 0.78}) scaleX(${1 + v * 0.35}) skewX(${wob}deg)`
                el.style.color = mixHsl(emo.hue, emo.calmHue, v, dark ? 70 : 62, dark ? 66 - v * 6 : 56 + v * 8)
                el.style.opacity = String(1 - Math.max(0, v - 0.85) * 4)
            }
            const d = drips.current[i]
            if (d) d.style.transform = `scaleY(${v < 0.15 ? 0 : Math.min(1, (v - 0.15) * 1.6) * (1 - Math.max(0, v - 0.9) * 8)})`
        })
        const avg = total / letters.length
        if (wax.current && !reduced) wax.current.style.filter = avg > 0.04 ? `url(#${filterId})` : "none"
        s.loop?.set(1600 + avg * 600, 0.6 + s.heat * 0.6)
        if (puddle.current) {
            puddle.current.style.transform = `translateX(-50%) scaleX(${0.25 + avg * 0.85}) scaleY(${0.2 + avg})`
            puddle.current.style.opacity = String(Math.min(1, avg * 2))
        }
        if (heat && t - s.lastDrip > 0.7 && avg > 0.1 && !s.done) {
            s.lastDrip = t
            fx.sound("drip", rand(0.8, 1.2))
            if (!reduced) {
                const i = Math.floor(Math.random() * letters.length), el = els.current[i]
                const host = el?.closest("[data-melt]") as HTMLElement | null
                if (el && host) { const r = el.getBoundingClientRect(), hr = host.getBoundingClientRect(); fx.burst(r.left - hr.left + r.width / 2, r.bottom - hr.top + fs * 0.3, { kind: "drop", n: 1, size: Math.max(2.5, fs * 0.07), speed: 30, angle: Math.PI / 2, spread: 0.2, color: mixHsl(emo.hue, emo.calmHue, avg, 62, dark ? 62 : 60), life: 0.7, gravity: 500 }) }
            }
        }
        if (heat && !reduced && Math.random() < 0.15) fx.burst(rand(w * 0.2, w * 0.8), baseY - fs * 0.4, { kind: "steam", n: 1, size: 10, speed: 30, angle: -Math.PI / 2, spread: 0.6, color: dark ? "rgba(255,200,160,.25)" : "rgba(255,170,110,.25)", life: 1.8, gravity: -30 })
        if (Math.abs(avg - s.total) > 0.004) { s.total = avg; props.progress(avg) }
        if (!s.done && avg >= 0.985) {
            s.done = true
            setHeat(false)
            s.loop?.stop(); s.loop = null
            fx.haptic("success")
            timers.after(900, props.done)
        }
    })

    const baseY = h * 0.5
    return (
        <div data-melt="1" style={{ position: "absolute", inset: 0, cursor: "pointer" }} {...hold} role="button" tabIndex={0} aria-label="Hold to warm the wax letters">
            <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(180deg, #16151A, #121116)" : "linear-gradient(180deg, #FBF7F1, #F1EBE2)" }} />
            <div style={{ position: "absolute", left: "50%", top: -h * 0.25, width: w * 1.2, height: h * 0.8, transform: "translateX(-50%)", background: `radial-gradient(closest-side, ${dark ? "rgba(255,150,80,.28)" : "rgba(255,170,90,.38)"}, transparent)`, opacity: heat ? 1 : 0, transition: "opacity .6s", pointerEvents: "none" }} />
            {!reduced ? (
                <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
                    <filter id={filterId}><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" /><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="g" /><feComposite in="SourceGraphic" in2="g" operator="atop" /></filter>
                </svg>
            ) : null}
            <div ref={puddle} style={{ position: "absolute", left: "50%", top: baseY + fs * 0.62, width: Math.min(w * 0.86, lineChars * fs * 0.62), height: fs * 0.42, borderRadius: "50%", transformOrigin: "50% 50%", background: `radial-gradient(ellipse at 50% 35%, ${hsl(emo.calmHue, 70, dark ? 72 : 78, 0.95)}, ${mixHsl(emo.hue, emo.calmHue, 0.6, 60, dark ? 52 : 62, 0.9)} 70%, transparent 72%)`, opacity: 0 }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: baseY - fs * 0.62, display: "flex", flexWrap: "wrap", justifyContent: "center", padding: "0 16px" }} ref={wax}>
                {groups.map((g, k) => <span key={k} style={{ display: "inline-block", whiteSpace: "nowrap" }}>{g.map((i) => { const ch = letters[i]; return (
                    <span key={i} style={{ position: "relative", display: "inline-block" }}>
                        <span ref={(el) => { els.current[i] = el }} style={{ display: "inline-block", fontFamily: "var(--round)", fontWeight: 800, fontSize: fs, lineHeight: 1.05, transformOrigin: "50% 100%", whiteSpace: "pre", color: hsl(emo.hue, 62, 56) }}>{ch}</span>
                        {ch.trim() ? <span ref={(el) => { drips.current[i] = el }} style={{ position: "absolute", left: `${30 + hashNoise(i, 4) * 40}%`, top: fs * 0.95, width: Math.max(5, fs * 0.13), height: fs * (0.5 + hashNoise(i, 6) * 0.7), borderRadius: 99, transformOrigin: "50% 0", transform: "scaleY(0)", background: mixHsl(emo.hue, emo.calmHue, 0.5, 62, dark ? 62 : 60) }} /> : null}
                    </span>
                ) })}</span>)}
            </div>
        </div>
    )
}

/* ---------- 18 · BURN — a slow flame front turns the sentence into warm embers ---------- */

function RitualBurn(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const pw = Math.min(w * 0.8, 380), ph = Math.min(h * 0.62, pw * 1.18)
    const px = (w - pw) / 2, py = (h - ph) / 2 - 6
    const [holding, setHolding] = React.useState(false)
    const st = React.useRef({ front: -20, glow: 0, done: false, loop: null as Loop | null, last: 0, paper: null as HTMLCanvasElement | null, dpr: 1, lastP: 0 })
    const timers = useTimers()
    const hold = useHold(
        () => { if (!st.current.done) { setHolding(true); st.current.loop = fx.loop("fire"); fx.haptic("light") } },
        () => { setHolding(false); st.current.loop?.stop(); st.current.loop = null },
    )

    // Paint the page once into an offscreen canvas.
    React.useEffect(() => {
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        const c = document.createElement("canvas")
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
        const g = c.getContext("2d")
        if (!g) return
        g.scale(dpr, dpr)
        g.save()
        g.shadowColor = "rgba(0,0,0,.18)"; g.shadowBlur = 24; g.shadowOffsetY = 10
        g.fillStyle = dark ? "#F3EDE2" : "#FFFDF8"
        g.beginPath(); (g as any).roundRect ? (g as any).roundRect(px, py, pw, ph, 6) : g.rect(px, py, pw, ph); g.fill()
        g.restore()
        g.strokeStyle = "rgba(80,60,40,.09)"; g.lineWidth = 1
        for (let y = py + 34; y < py + ph - 10; y += 28) { g.beginPath(); g.moveTo(px + 18, y); g.lineTo(px + pw - 18, y); g.stroke() }
        const size = clamp(pw / 11, 18, 30)
        g.fillStyle = "#2A2420"
        g.font = `500 ${size}px "New York", "Iowan Old Style", Georgia, serif`
        g.textAlign = "center"; g.textBaseline = "middle"
        const words = items[0].text.split(/\s+/)
        const lines: string[] = []
        let cur = ""
        for (const word of words) {
            const test = cur ? cur + " " + word : word
            if (g.measureText(test).width > pw - 48 && cur) { lines.push(cur); cur = word } else cur = test
        }
        if (cur) lines.push(cur)
        const lh = size * 1.32
        lines.forEach((ln, i) => g.fillText(ln, px + pw / 2, py + ph / 2 + (i - (lines.length - 1) / 2) * lh))
        st.current.paper = c
        st.current.dpr = dpr
    }, [w, h, items[0].text, dark])

    const frontAt = (y: number, base: number, t: number) => base + Math.sin(y * 0.045 + t * 1.3) * 7 + Math.sin(y * 0.11 - t * 2.1) * 4 + Math.sin(y * 0.021 + 2) * 12

    useFrame((dt, t) => {
        const s = st.current
        const cv = canvasRef.current
        if (!cv || !s.paper) return
        const dpr = s.dpr
        if (cv.width !== s.paper.width) { cv.width = s.paper.width; cv.height = s.paper.height }
        const g = cv.getContext("2d")
        if (!g) return
        if (holding && !s.done) s.front += dt * pw * 0.105
        s.glow += ((holding ? 1 : 0.18) - s.glow) * Math.min(1, dt * 3)
        s.loop?.set(1800, 0.8 + s.glow * 0.4)
        g.setTransform(1, 0, 0, 1, 0, 0)
        g.clearRect(0, 0, cv.width, cv.height)
        g.drawImage(s.paper, 0, 0)
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        const base = px + s.front
        // Remove what has burned.
        g.globalCompositeOperation = "destination-out"
        g.beginPath(); g.moveTo(0, 0)
        for (let y = 0; y <= h; y += 6) g.lineTo(frontAt(y, base, t), y)
        g.lineTo(0, h); g.closePath(); g.fill()
        // Char band on the remaining paper.
        g.globalCompositeOperation = "source-atop"
        const grad = g.createLinearGradient(base - 10, 0, base + 26, 0)
        grad.addColorStop(0, "rgba(40,20,10,.95)"); grad.addColorStop(0.35, "rgba(90,45,20,.55)"); grad.addColorStop(1, "rgba(120,70,30,0)")
        g.fillStyle = grad
        g.beginPath(); g.moveTo(frontAt(0, base, t) - 12, 0)
        for (let y = 0; y <= h; y += 6) g.lineTo(frontAt(y, base, t) + 26, y)
        for (let y = h; y >= 0; y -= 6) g.lineTo(frontAt(y, base, t) - 12, y)
        g.closePath(); g.fill()
        // The glowing edge.
        g.globalCompositeOperation = "lighter"
        if (s.front > -10 && s.front < pw + 20) {
            g.lineWidth = 2 + s.glow * 2.5
            g.strokeStyle = `rgba(255,${Math.round(120 + s.glow * 60)},60,${0.35 + s.glow * 0.6})`
            g.shadowColor = "rgba(255,140,60,.9)"; g.shadowBlur = 8 + s.glow * 14
            g.beginPath()
            let started = false
            for (let y = py - 4; y <= py + ph + 4; y += 5) { const x = frontAt(y, base, t); if (x < px - 2 || x > px + pw + 2) continue; started ? g.lineTo(x, y) : g.moveTo(x, y); started = true }
            g.stroke(); g.shadowBlur = 0
        }
        g.globalCompositeOperation = "source-over"
        // Flame tongues and smoke ride the burning edge.
        if (holding && !s.done && !reduced) {
            for (let k = 0; k < 3; k++) {
                const y = rand(py + 4, py + ph - 4)
                const x = frontAt(y, base, t)
                if (x > px - 4 && x < px + pw + 4) fx.burst(x + rand(-4, 6), y, { kind: "flame", n: 1, size: rand(5, 10), speed: 60, angle: -Math.PI / 2, spread: 0.5, color: Math.random() < 0.5 ? "rgba(255,150,40,.9)" : "rgba(255,95,30,.85)", life: rand(0.35, 0.7), gravity: -40 })
            }
            if (Math.random() < 0.25) { const y = rand(py, py + ph); fx.burst(frontAt(y, base, t), y - 10, { kind: "steam", n: 1, size: 9, speed: 30, angle: -Math.PI / 2, spread: 0.6, color: dark ? "rgba(140,130,125,.4)" : "rgba(90,80,75,.3)", life: 2, gravity: -25 }) }
        }
        // Embers lift off the edge while it burns.
        if (holding && !s.done && !reduced && t - s.last > 0.05) {
            s.last = t
            const y = rand(py, py + ph)
            const x = frontAt(y, base, t)
            if (x > px && x < px + pw) {
                fx.burst(x, y, { kind: "ember", n: 2, size: rand(1.6, 3), speed: 50, angle: -Math.PI / 2, spread: 1.2, color: warmEmbers, life: 2.2, gravity: -30 })
                if (Math.random() < 0.3) fx.burst(x - 6, y, { kind: "dust", n: 1, size: 1.8, speed: 20, angle: Math.PI / 2, spread: 1, color: "rgba(70,60,55,.7)", life: 1.6, gravity: 40 })
                if (Math.random() < 0.25) fx.sound("crackle")
            }
        }
        const p = clamp(s.front / pw, 0, 1)
        if (Math.abs(p - s.lastP) > 0.01) { s.lastP = p; props.progress(p) }
        if (!s.done && s.front >= pw + 24) {
            s.done = true
            setHolding(false)
            s.loop?.stop(); s.loop = null
            fx.haptic("success")
            if (!reduced) for (let i = 0; i < 6; i++) timers.after(i * 140, () => fx.burst(rand(px, px + pw), rand(py + ph * 0.2, py + ph), { kind: "ember", n: 6, size: 2.6, speed: 40, angle: -Math.PI / 2, spread: 1.6, color: warmEmbers, life: 3.2, gravity: -24 }))
            timers.after(1600, props.done)
        }
    })

    return (
        <div style={{ position: "absolute", inset: 0, cursor: "pointer" }} {...hold} role="button" tabIndex={0} aria-label="Hold to let the flame move across the page">
            <div style={{ position: "absolute", inset: 0, background: dark ? "radial-gradient(80% 60% at 50% 55%, #221A16, #111013 70%)" : "radial-gradient(80% 60% at 50% 55%, #FFF4E8, #F1E9DF 75%)" }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 45% at 50% 55%, rgba(255,140,60,.22), transparent 70%)", opacity: holding ? 1 : 0, transition: "opacity .5s" }} />
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: w, height: h }} />
        </div>
    )
}

/* ---------- 23 · VACUUM — clutter is pulled in until the space feels quiet ---------- */

function RitualVacuum(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const r = clamp(Math.min(w, h) / 9, 34, 54)
    const homes = React.useMemo(() => scatter(items.length, w, h * 0.72, r + 6, 10, 0), [items.length, w, h, r])
    const things = React.useRef(items.map((_, i) => ({ x: homes[i].x, y: homes[i].y, vx: 0, vy: 0, gone: false, s: 1, sx: 1 })))
    const motes = React.useRef(Array.from({ length: reduced ? 0 : 26 }, (_, i) => ({ x: hashNoise(i, 1) * w, y: hashNoise(i, 2) * h * 0.8, gone: false })))
    const thingEls = React.useRef<(HTMLDivElement | null)[]>([])
    const moteEls = React.useRef<(HTMLSpanElement | null)[]>([])
    const nozzle = React.useRef<HTMLDivElement>(null)
    const hose = React.useRef<SVGPathElement>(null)
    const haze = React.useRef<HTMLDivElement>(null)
    const st = React.useRef({ nx: w / 2, ny: h * 0.84, tx: w / 2, ty: h * 0.84, on: false, loop: null as Loop | null, gone: 0, done: false, idle: 0, moved: false })
    const timers = useTimers()

    const setOn = (on: boolean) => {
        const s = st.current
        if (on === s.on || (on && s.done)) return
        s.on = on
        if (on) { s.loop = fx.loop("wind"); fx.haptic("light") } else { s.loop?.stop(); s.loop = null }
    }
    useDrag(stage, stage, {
        onStart: (d) => { st.current.tx = d.x; st.current.ty = d.y; st.current.idle = 0; setOn(true) },
        onMove: (d) => { st.current.tx = d.x; st.current.ty = d.y; st.current.idle = 0 },
        onEnd: () => setOn(false),
    })
    const { onKeyDown, onKeyUp } = useHold(() => setOn(true), () => setOn(false))

    useFrame((dt) => {
        const s = st.current
        s.idle += dt
        if (s.on && s.idle > 0.5) {
            // Hands-free: drift toward the nearest remaining piece.
            let best: { x: number; y: number } | null = null, bd = 1e9
            things.current.forEach((t) => { if (!t.gone) { const d = dist(t.x, t.y, s.nx, s.ny); if (d < bd) { bd = d; best = t } } })
            if (best) { s.tx = (best as any).x; s.ty = (best as any).y + r * 0.6 }
        }
        s.nx += (s.tx - s.nx) * Math.min(1, dt * 9)
        s.ny += (s.ty - s.ny) * Math.min(1, dt * 9)
        if (nozzle.current) nozzle.current.style.transform = `translate3d(${s.nx}px, ${s.ny}px, 0) translate(-50%, -20%) scale(${s.on ? 1.05 : 1})`
        if (hose.current) hose.current.setAttribute("d", `M ${s.nx} ${s.ny + 18} C ${s.nx} ${h + 30}, ${w * 0.5} ${h - 10}, ${w * 0.5} ${h + 40}`)
        s.loop?.set(500 + Math.random() * 40, 1.2)
        if (s.on && !reduced && Math.random() < 0.8) {
            const a = Math.random() * Math.PI * 2, rr = rand(60, 160)
            const x = s.nx + Math.cos(a) * rr, y = s.ny + Math.sin(a) * rr
            const sp = 380 + Math.random() * 200
            fx.burst(x, y, { kind: "streak", n: 1, size: 1.4, speed: 0, vx: (-Math.cos(a) + Math.sin(a) * 0.6) * sp, vy: (-Math.sin(a) - Math.cos(a) * 0.6) * sp, color: dark ? "rgba(220,230,255,.5)" : "rgba(90,100,120,.35)", life: rr / sp })
        }
        const reach = Math.max(120, Math.min(w, h) * 0.32)
        things.current.forEach((t, i) => {
            const el = thingEls.current[i]
            if (!el) return
            if (!t.gone) {
                const dx = s.nx - t.x, dy = s.ny - t.y
                const d = Math.hypot(dx, dy)
                if (s.on && d < reach) {
                    const f = (1 - d / reach) * 1500
                    t.vx += (dx / d) * f * dt
                    t.vy += (dy / d) * f * dt
                }
                t.vx *= Math.pow(0.04, dt); t.vy *= Math.pow(0.04, dt)
                t.x += t.vx * dt; t.y += t.vy * dt
                const pullK = s.on && d < reach ? (1 - d / reach) : 0
                t.sx = 1 + pullK * 0.5
                t.s = clamp(d / (r * 2.2), 0.05, 1)
                if (d < r * 0.5 && s.on) {
                    t.gone = true
                    s.gone += 1
                    fx.sound("pop", 1.5)
                    fx.haptic("medium")
                    props.progress(s.gone / items.length)
                }
            } else t.s = Math.max(0, t.s - dt * 6)
            const ang = Math.atan2(s.ny - t.y, s.nx - t.x)
            el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) translate(-50%, -50%) rotate(${ang}rad) scale(${t.sx * t.s}, ${t.s / Math.sqrt(t.sx)}) rotate(${-ang}rad)`
            el.style.opacity = String(t.gone ? t.s : 1)
        })
        motes.current.forEach((m, i) => {
            const el = moteEls.current[i]
            if (!el || m.gone) return
            const d = dist(m.x, m.y, s.nx, s.ny)
            if (s.on && d < reach) { m.x += (s.nx - m.x) * dt * 5; m.y += (s.ny - m.y) * dt * 5; if (d < 18) { m.gone = true; el.style.opacity = "0" } }
            el.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`
        })
        if (haze.current) haze.current.style.opacity = String(0.75 * (1 - s.gone / items.length))
        if (!s.done && s.gone >= items.length) {
            s.done = true
            setOn(false)
            fx.haptic("success")
            fx.sound("chime", 0.8)
            timers.after(1100, props.done)
        }
    })

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0, cursor: "crosshair" }} onKeyDown={onKeyDown} onKeyUp={onKeyUp} role="button" tabIndex={0} aria-label="Hold to switch the suction on and guide the nozzle">
            <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(180deg,#14161B,#111216)" : "linear-gradient(180deg,#FAF8F4,#EFEBE4)" }} />
            <div ref={haze} style={{ position: "absolute", inset: 0, pointerEvents: "none", background: dark ? "radial-gradient(70% 60% at 40% 40%, rgba(120,110,100,.18), transparent), radial-gradient(60% 50% at 70% 60%, rgba(120,110,100,.14), transparent)" : "radial-gradient(70% 60% at 40% 40%, rgba(150,135,115,.20), transparent), radial-gradient(60% 50% at 70% 60%, rgba(150,135,115,.16), transparent)", transition: "opacity .8s" }} />
            {motes.current.map((_, i) => <span key={i} ref={(el) => { moteEls.current[i] = el }} className="rk-abs" style={{ width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, marginLeft: -3, marginTop: -3, borderRadius: "50%", background: dark ? "rgba(200,190,175,.35)" : "rgba(120,105,90,.35)", transition: "opacity .3s" }} />)}
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { thingEls.current[i] = el }} className="rk-abs" style={{ width: r * 2, height: r * 2, borderRadius: "50%", display: "grid", placeItems: "center", background: dark ? "rgba(255,255,255,.07)" : "#FFFFFF", boxShadow: `0 8px 22px rgba(0,0,0,${dark ? 0.35 : 0.1}), inset 0 0 0 1px var(--line)`, padding: 6, pointerEvents: "none" }}>
                    <WordBody item={it} size={clamp(r / 3.6, 12, 15)} layout="col" imgSize={Math.round(r * 0.6)} style={{ maxWidth: r * 1.7 }} />
                </div>
            ))}
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><path ref={hose} fill="none" stroke={dark ? "#3A3C46" : "#C9C6BF"} strokeWidth="16" strokeLinecap="round" /></svg>
            <div ref={nozzle} className="rk-abs" style={{ width: 70, height: 46, pointerEvents: "none" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "22px 22px 14px 14px", background: dark ? "linear-gradient(180deg,#4A4D5A,#30323B)" : "linear-gradient(180deg,#FFFFFF,#D8D5CF)", boxShadow: "0 8px 20px rgba(0,0,0,.25)" }} />
                <div style={{ position: "absolute", left: 10, right: 10, top: 6, height: 8, borderRadius: 6, background: "#15161A", boxShadow: "inset 0 1px 3px rgba(0,0,0,.8)" }} />
            </div>
        </div>
    )
}

/* ---------- 25 · SWIPE AWAY — a weak swipe springs back; a committed one flies ---------- */

function RitualSwipe(props: RitualProps) {
    const { items, w, h, fx, dark } = props
    const cardRef = React.useRef<HTMLDivElement>(null)
    const stage = React.useRef<HTMLDivElement>(null)
    const cw = Math.min(w * 0.8, 340), chh = Math.min(h * 0.5, 320)
    const [top, setTop] = React.useState(0)
    const st = React.useRef({ x: { x: 0, v: 0 }, y: { x: 0, v: 0 }, drag: false, fly: false, fvx: 0, fvy: 0 })
    const timers = useTimers()
    const topRef = useLatest(top)

    useDrag(stage, stage, {
        onStart: (d) => {
            if (st.current.fly || topRef.current >= items.length) return false
            if (Math.abs(d.x - w / 2) > cw / 2 + 10 || Math.abs(d.y - h / 2) > chh / 2 + 10) return false
            st.current.drag = true
            fx.haptic("light")
        },
        onMove: (d) => { st.current.x.x = d.dx; st.current.y.x = d.dy * 0.6 },
        onEnd: (d) => {
            const s = st.current
            s.drag = false
            const committed = Math.abs(s.x.x) > w * 0.3 || Math.abs(d.vx) > 900
            if (committed) {
                s.fly = true
                const dir = Math.sign(s.x.x || d.vx) || 1
                s.fvx = dir * Math.max(1400, Math.abs(d.vx) * 1.2)
                s.fvy = d.vy * 0.4
                fx.sound("whoosh", 0.8)
                fx.haptic("medium")
            } else {
                s.x.v = d.vx * 0.3
                fx.sound("boing", 0.6)
                if (Math.abs(s.x.x) > 20) props.hint("Commit to it — a longer, faster swipe")
            }
        },
    }, top < items.length)

    useFrame((dt) => {
        const s = st.current
        if (s.fly) {
            s.x.x += s.fvx * dt; s.y.x += s.fvy * dt
            if (!props.reduced) fx.burst(w / 2 + s.x.x, h / 2 + s.y.x + rand(-chh * 0.4, chh * 0.4), { kind: "streak", n: 1, size: 2, speed: 0, vx: s.fvx * 0.5, vy: 0, color: hsl(props.emo.calmHue, 80, dark ? 75 : 60, 0.5), life: 0.35 })
            if (Math.abs(s.x.x) > w + cw) {
                s.fly = false
                s.x = { x: 0, v: 0 }; s.y = { x: 0, v: 0 }
                const next = topRef.current + 1
                setTop(next)
                props.progress(next / items.length)
                props.hint(null)
                if (next >= items.length) { fx.haptic("success"); timers.after(450, props.done) }
            }
        } else if (!s.drag) {
            springTo(s.x, 0, dt, 300, 22)
            springTo(s.y, 0, dt, 300, 22)
        }
        if (cardRef.current) cardRef.current.style.transform = `perspective(900px) translate3d(${s.x.x}px, ${s.y.x}px, 0) rotateY(${clamp(s.x.x * 0.05, -25, 25)}deg) rotate(${s.x.x * 0.04}deg)`
    })

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "radial-gradient(80% 60% at 50% 45%, #1E1E26, #121216)" : "radial-gradient(80% 60% at 50% 45%, #FFFFFF, #EFEBE5)" }} />
            {items.map((it, i) => {
                if (i < top) return null
                const depth = i - top
                if (depth > 2) return null
                return (
                    <div key={it.key} ref={depth === 0 ? cardRef : undefined} style={{
                        position: "absolute", left: (w - cw) / 2, top: (h - chh) / 2, width: cw, height: chh, zIndex: 10 - depth,
                        borderRadius: 26, background: "var(--surface)", boxShadow: depth === 0 ? "var(--shadow-2)" : "var(--shadow-1)", border: "1px solid var(--line)",
                        display: "grid", placeItems: "center", padding: 26, cursor: depth === 0 ? "grab" : "default", touchAction: "none",
                        ...(depth > 0 ? { transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.05})`, transition: "transform .45s cubic-bezier(.34,1.4,.64,1)" } : {}),
                    }}>
                        <WordBody item={it} size={stageFont(w, 1.25)} layout="col" imgSize={Math.round(Math.min(cw, chh) * 0.3)} style={{ textAlign: "center" }} />
                    </div>
                )
            })}
        </div>
    )
}

/* ---------- 29 · MUTE — the words stay; their volume is yours ---------- */

function RitualMute(props: RitualProps) {
    const { items, w, h, fx, reduced, emo, dark } = props
    const track = React.useRef<HTMLDivElement>(null)
    const stage = React.useRef<HTMLDivElement>(null)
    const [level, setLevel] = React.useState(10)
    const [dragging, setDragging] = React.useState(false)
    const bars = React.useRef<(HTMLSpanElement | null)[]>([])
    const lvl = useLatest(level)
    const finished = React.useRef(false)
    const timers = useTimers()
    const tTop = h * 0.16, tH = h * 0.66, tX = w - 46
    const N = Math.max(16, Math.min(34, Math.round((w - 110) / 11)))

    const setFromY = (y: number) => {
        const v = Math.round(clamp(10 - ((y - tTop) / tH) * 10, 1, 10))
        if (v !== lvl.current) {
            setLevel(v)
            fx.sound("tick", 0.6 + v * 0.06)
            fx.haptic("tick")
            props.progress((10 - v) / 9)
        }
    }
    useDrag(track, stage, {
        onStart: (d) => { if (finished.current) return false; setDragging(true); setFromY(d.y) },
        onMove: (d) => setFromY(d.y),
        onEnd: () => {
            setDragging(false)
            if (lvl.current <= 1 && !finished.current) { finished.current = true; fx.haptic("success"); timers.after(1100, props.done) }
        },
    })

    useFrame((_, t) => {
        const L = lvl.current / 10
        bars.current.forEach((el, i) => {
            if (!el) return
            const n = reduced ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * (2.2 + (i % 5) * 0.4) + i * 0.9) * Math.cos(t * 1.3 + i * 0.37))
            el.style.transform = `scaleY(${Math.max(0.04, n * L)})`
        })
    })

    const L = level / 10
    const knobY = tTop + (1 - (level - 1) / 9) * tH
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#131318" : "#F7F4EF" }} />
            <div style={{ position: "absolute", left: 18, right: 82, top: h * 0.22, height: h * 0.56, display: "flex", alignItems: "center", gap: 4, pointerEvents: "none" }} aria-hidden="true">
                {Array.from({ length: N }, (_, i) => (
                    <span key={i} ref={(el) => { bars.current[i] = el }} style={{ flex: 1, height: "100%", borderRadius: 99, background: mixHsl(emo.calmHue, emo.hue, L, 20 + L * 55, dark ? 55 : 60, 0.25 + L * 0.35), transform: "scaleY(.5)", transition: reduced ? "transform .3s" : undefined }} />
                ))}
            </div>
            <div style={{ position: "absolute", left: 18, right: 82, top: 0, bottom: 0, pointerEvents: "none", display: "grid", placeItems: "center" }} aria-hidden="true">
                {[0, 1, 2].map((k) => <span key={k} style={{ position: "absolute", width: Math.min(w * 0.5, 220), height: Math.min(w * 0.5, 220), borderRadius: "50%", border: `2px solid ${mixHsl(emo.calmHue, emo.hue, L, 70, dark ? 65 : 55, 0.6)}`, opacity: Math.max(0, L - 0.15), animation: reduced ? undefined : `tsrRipple ${3.4 - L * 1.8}s ease-out ${k * (1.1 - L * 0.5)}s infinite` }} />)}
                <style>{"@keyframes tsrRipple{from{transform:scale(.7);opacity:.9}to{transform:scale(2.1);opacity:0}}"}</style>
            </div>
            <div style={{ position: "absolute", left: 18, right: 82, top: 0, bottom: 0, display: "grid", placeItems: "center", textAlign: "center", pointerEvents: "none" }}>
                <div style={{ fontSize: stageFont(w, 1.1 + L * 0.7), fontWeight: Math.round(420 + L * 380), letterSpacing: `${-0.02 + (1 - L) * 0.04}em`, opacity: 0.55 + L * 0.45, color: "var(--stage-ink)", transition: "font-size .35s cubic-bezier(.22,1,.36,1), opacity .35s, letter-spacing .35s", lineHeight: 1.15, maxWidth: "100%", overflowWrap: "anywhere" }}>
                    {items[0].text}
                </div>
            </div>
            <div ref={track} role="slider" tabIndex={0} aria-label="Volume of the thought" aria-valuemin={1} aria-valuemax={10} aria-valuenow={level}
                onKeyDown={(e) => {
                    if (finished.current) return
                    if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); const v = Math.max(1, level - 1); setLevel(v); props.progress((10 - v) / 9); fx.sound("tick"); if (v === 1) { finished.current = true; timers.after(1100, props.done) } }
                    if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); const v = Math.min(10, level + 1); setLevel(v); props.progress((10 - v) / 9) }
                }}
                style={{ position: "absolute", left: tX - 30, width: 60, top: tTop - 24, height: tH + 48, cursor: "ns-resize", touchAction: "none" }}>
                <div style={{ position: "absolute", left: 27, width: 6, top: 24, height: tH, borderRadius: 99, background: "var(--fill-2)" }} />
                <div style={{ position: "absolute", left: 27, width: 6, top: knobY - tTop + 24, bottom: 24, borderRadius: 99, background: mixHsl(emo.calmHue, emo.hue, L, 60, 58) }} />
                <div style={{ position: "absolute", left: 12, top: knobY - tTop + 24 - 18, width: 36, height: 36, borderRadius: "50%", background: "#fff", boxShadow: "0 3px 12px rgba(0,0,0,.25)", transform: dragging ? "scale(1.12)" : "scale(1)", transition: "transform .3s cubic-bezier(.34,1.56,.64,1)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#333", fontVariantNumeric: "tabular-nums" }}>{level}</div>
            </div>
        </div>
    )
}

/* ---------- 32 · PARK IT — later is a real place ---------- */

function RitualParkIt(props: RitualProps) {
    const { items, w, h, fx, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const bays = ["Later today", "Tomorrow", "Not now"]
    const pad = 14, gap = 8
    const bw = (w - pad * 2 - gap * 2) / 3, bh = Math.min(h * 0.4, 230), by = 16
    const tw = Math.min(150, (w - pad * 2) / 3 - 6), th = 52
    const homes = items.map((_, i) => ({ x: pad + (w - pad * 2) * ((i + 0.5) / items.length), y: h - th / 2 - 26 }))
    const [parked, setParked] = React.useState<(number | null)[]>(() => items.map(() => null))
    const [ticket, setTicket] = React.useState<{ bay: number; key: number } | null>(null)
    const pos = React.useRef(items.map((_, i) => ({ x: { x: homes[i].x, v: 0 }, y: { x: homes[i].y, v: 0 }, drag: false, rot: 0 })))
    const els = React.useRef<(HTMLDivElement | null)[]>([])
    const active = React.useRef<number | null>(null)
    const parkedRef = useLatest(parked)
    const timers = useTimers()

    const slotFor = (bay: number, i: number) => {
        const order = parkedRef.current.map((b, j) => (b === bay ? j : -1)).filter((j) => j >= 0)
        const k = Math.max(0, order.indexOf(i))
        return { x: pad + bay * (bw + gap) + bw / 2, y: by + 44 + th / 2 + k * (th * 0.7) }
    }
    useDrag(stage, stage, {
        onStart: (d) => {
            let hit: number | null = null
            pos.current.forEach((p, i) => { if (parkedRef.current[i] == null && Math.abs(d.x - p.x.x) < tw / 2 + 6 && Math.abs(d.y - p.y.x) < th / 2 + 8) hit = i })
            if (hit == null) return false
            active.current = hit
            pos.current[hit].drag = true
            fx.haptic("light")
        },
        onMove: (d) => {
            const i = active.current
            if (i == null) return
            const p = pos.current[i]
            p.x.x = clamp(d.x, tw / 2, w - tw / 2); p.y.x = clamp(d.y, th / 2, h - th / 2)
            p.rot = clamp(d.vx * 0.01, -10, 10)
        },
        onEnd: () => {
            const i = active.current
            active.current = null
            if (i == null) return
            const p = pos.current[i]
            p.drag = false
            const bay = p.y.x < by + bh + 10 ? Math.floor((p.x.x - pad) / (bw + gap)) : -1
            if (bay >= 0 && bay < 3) {
                const next = parkedRef.current.map((b, j) => (j === i ? bay : b))
                setParked(next)
                setTicket({ bay, key: Date.now() })
                fx.sound("stamp")
                { const sl = slotFor(bay, i); fx.burst(sl.x, sl.y, { kind: "spark", n: 16, size: 2, speed: 170, color: [hsl(emo.calmHue, 85, 70), "#FFFFFF"], life: 0.6 }); fx.burst(sl.x, sl.y, { kind: "ring", n: 1, size: 40, color: hsl(emo.calmHue, 80, 65, 0.7), life: 0.5 }) }
                fx.haptic("medium")
                const n = next.filter((b) => b != null).length
                props.progress(n / items.length)
                if (n >= items.length) timers.after(1200, () => { fx.haptic("success"); props.done() })
            } else fx.sound("boing", 0.5)
        },
    })

    useFrame((dt) => {
        pos.current.forEach((p, i) => {
            const el = els.current[i]
            if (!p.drag) {
                const bay = parkedRef.current[i]
                const target = bay == null ? homes[i] : slotFor(bay, i)
                springTo(p.x, target.x, dt, 220, 22)
                springTo(p.y, target.y, dt, 220, 22)
                p.rot *= Math.pow(0.01, dt)
            }
            if (el) el.style.transform = `translate3d(${p.x.x}px, ${p.y.x}px, 0) translate(-50%, -50%) rotate(${p.rot}deg) scale(${parkedRef.current[i] != null ? 0.86 : p.drag ? 1.05 : 1})`
        })
    })

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#141519" : "#F2EFEA" }} />
            {bays.map((b, i) => {
                const filled = parked.some((p) => p === i)
                return (
                    <div key={b} style={{ position: "absolute", left: pad + i * (bw + gap), top: by, width: bw, height: bh, borderRadius: 16, border: `2px dashed ${dark ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.14)"}`, background: filled ? (dark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.6)") : "transparent", transition: "background-color .4s" }}>
                        <div style={{ position: "absolute", left: 0, right: 0, top: 10, textAlign: "center", fontSize: clamp(bw / 9, 11, 14), fontWeight: 650, color: "var(--ink-2)", letterSpacing: ".01em", padding: "0 4px" }}>{b}</div>
                        <div style={{ position: "absolute", left: 8, top: 34, width: bw - 16, height: 4, borderRadius: 4, background: filled ? hsl(emo.calmHue, 60, 55) : dark ? "#3A3B44" : "#CFCBC4", transformOrigin: "0 50%", transform: filled ? "rotate(0deg)" : "rotate(-70deg)", transition: "transform .6s cubic-bezier(.34,1.4,.64,1), background-color .4s" }} />
                    </div>
                )
            })}
            <AnimatePresence>
                {ticket ? (
                    <motion.div key={ticket.key} initial={{ opacity: 0, y: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={SPRING_SNAPPY}
                        style={{ position: "absolute", left: pad + ticket.bay * (bw + gap) + 6, width: bw - 12, top: by + bh + 8, padding: "6px 8px", borderRadius: 8, background: "var(--paper)", color: "var(--paper-ink)", fontSize: 11, fontWeight: 650, textAlign: "center", boxShadow: "var(--shadow-1)", pointerEvents: "none" }}>
                        Parked · {bays[ticket.bay]}
                    </motion.div>
                ) : null}
            </AnimatePresence>
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { els.current[i] = el }} className="rk-abs" style={{ width: tw, height: th, borderRadius: 16, background: parked[i] != null ? (dark ? "#2A2B33" : "#FFFFFF") : hsl(emo.hue, 55, dark ? 40 : 62), color: parked[i] != null ? "var(--ink-2)" : "#fff", boxShadow: "0 8px 18px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px", cursor: parked[i] == null ? "grab" : "default", transition: "background-color .5s, color .5s", fontWeight: 650, fontSize: clamp(tw / 10, 12, 15) }}>
                    <span style={{ position: "absolute", right: 6, top: 10, width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,230,.9)" }} />
                    <span style={{ position: "absolute", right: 6, bottom: 10, width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,230,.9)" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.text}</span>
                </div>
            ))}
        </div>
    )
}

/* ---------- 36 · CLOUD PASS — chasing makes it bigger; one steady push moves it ---------- */

function RitualCloudPass(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const cloud = React.useRef<HTMLDivElement>(null)
    const streaks = React.useRef<HTMLDivElement>(null)
    const sun = React.useRef<HTMLDivElement>(null)
    const cw = Math.min(w * 0.72, 320), chh = cw * 0.56
    const st = React.useRef({ x: w / 2, y: h * 0.42, vx: 0, vy: 0, puff: 0, steady: 0, pdx: 0, pdy: 0, gone: false, frantic: 0, loop: null as Loop | null, keyDir: [0, 0] as [number, number] })
    const timers = useTimers()

    useDrag(stage, stage, {
        onStart: () => { st.current.loop = fx.loop("wind"); st.current.steady = 0 },
        onMove: (d) => {
            const s = st.current
            const sp = Math.hypot(d.vx, d.vy)
            if (sp < 1) return
            const nx = d.vx / sp, ny = d.vy / sp
            const align = s.pdx * nx + s.pdy * ny
            s.pdx = nx; s.pdy = ny
            s.steady = s.steady * 0.85 + (align > 0.85 ? 1 : 0) * 0.15
            if (sp > 1300 || align < 0.2) {
                s.puff = Math.min(0.6, s.puff + 0.035)
                s.frantic += 1
                if (s.frantic % 18 === 0) { props.hint("Slower. One steady push."); fx.haptic("tick") }
            } else if (sp > 30 && s.steady > 0.6) {
                const f = Math.min(sp, 650) * 0.0045 * s.steady
                s.vx += nx * f; s.vy += ny * f * 0.6
            }
            s.loop?.set(300 + Math.min(sp, 900) * 0.6, 0.4 + s.steady * 0.8)
        },
        onEnd: () => { st.current.loop?.stop(); st.current.loop = null },
    })

    useFrame((dt, t) => {
        const s = st.current
        if (s.keyDir[0] || s.keyDir[1]) { s.vx += s.keyDir[0] * 2.2; s.vy += s.keyDir[1] * 1.2 }
        s.vx *= Math.pow(0.55, dt); s.vy *= Math.pow(0.55, dt)
        s.x += s.vx * dt * 60 * 0.6; s.y += s.vy * dt * 60 * 0.6
        s.y = clamp(s.y, chh * 0.5, h - chh * 0.5)
        s.puff = Math.max(0, s.puff - dt * 0.18)
        const out = s.x < -cw * 0.45 || s.x > w + cw * 0.45
        const p = clamp(Math.abs(s.x - w / 2) / (w / 2 + cw * 0.45), 0, 1)
        props.progress(p)
        if (cloud.current) cloud.current.style.transform = `translate3d(${s.x}px, ${s.y + (reduced ? 0 : Math.sin(t * 0.8) * 4)}px, 0) translate(-50%, -50%) scale(${1 + s.puff})`
        if (!reduced && Math.hypot(s.vx, s.vy) > 0.6 && Math.random() < 0.6) fx.burst(s.x - Math.sign(s.vx || 1) * cw * 0.6, s.y + rand(-chh * 0.5, chh * 0.5), { kind: "streak", n: 1, size: 1.5, speed: 0, vx: s.vx * 160, vy: s.vy * 60, color: dark ? "rgba(220,230,255,.45)" : "rgba(255,255,255,.9)", life: 0.5 })
        if (streaks.current) streaks.current.style.opacity = String(Math.min(0.9, Math.hypot(s.vx, s.vy) * 0.25))
        if (sun.current) sun.current.style.opacity = String(p)
        if (out && !s.gone) {
            s.gone = true
            s.loop?.stop(); s.loop = null
            fx.sound("chime", 0.9)
            fx.haptic("success")
            props.hint(null)
            timers.after(900, props.done)
        }
    })

    React.useEffect(() => {
        const el = stage.current
        if (!el) return
        const down = (e: KeyboardEvent) => { if (e.key === "ArrowRight") st.current.keyDir = [1, 0]; if (e.key === "ArrowLeft") st.current.keyDir = [-1, 0] }
        const up = () => { st.current.keyDir = [0, 0] }
        el.addEventListener("keydown", down); el.addEventListener("keyup", up)
        return () => { el.removeEventListener("keydown", down); el.removeEventListener("keyup", up) }
    }, [])

    const puffs = [[0.22, 0.6, 0.34], [0.42, 0.42, 0.42], [0.64, 0.48, 0.36], [0.8, 0.64, 0.26], [0.5, 0.66, 0.4]]
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0, cursor: "grab" }} tabIndex={0} role="application" aria-label="Push the cloud away with one steady movement. Arrow keys also push it.">
            <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(180deg, #1B2233, #141820)" : "linear-gradient(180deg, #CFDDEB, #EEF1F2)" }} />
            <div ref={sun} style={{ position: "absolute", left: "50%", top: h * 0.4, width: Math.min(w, h) * 0.9, height: Math.min(w, h) * 0.9, transform: "translate(-50%, -50%)", borderRadius: "50%", background: `radial-gradient(circle, ${hsl(emo.calmHue, 90, dark ? 70 : 80, dark ? 0.35 : 0.9)}, transparent 62%)`, opacity: 0, pointerEvents: "none" }} />
            <div ref={streaks} style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none", background: `repeating-linear-gradient(180deg, transparent 0 34px, ${dark ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.55)"} 34px 36px)`, WebkitMaskImage: "linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)", maskImage: "linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)" }} />
            <div ref={cloud} className="rk-abs" style={{ width: cw, height: chh, pointerEvents: "none" }}>
                {puffs.map(([x, y, r], i) => (
                    <span key={i} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: cw * r, height: cw * r, transform: "translate(-50%, -50%)", borderRadius: "50%", background: dark ? "linear-gradient(180deg, #5A6276, #3E4556)" : "linear-gradient(180deg, #FFFFFF, #DCE2EA)", boxShadow: dark ? "none" : "0 10px 24px rgba(60,80,110,.12)" }} />
                ))}
                <div style={{ position: "absolute", left: "12%", right: "12%", top: "36%", bottom: "10%", display: "grid", placeItems: "center", textAlign: "center" }}>
                    <WordBody item={items[0]} size={stageFont(w, 1)} layout="col" imgSize={36} />
                </div>
            </div>
        </div>
    )
}

/* ---------- 40 · PAPER PLANE — fold it, then let the wind finish the job ---------- */

function RitualPaperPlane(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const plane = React.useRef<HTMLDivElement>(null)
    const pw = Math.min(w * 0.7, 300), ph = pw * 0.62
    const [idx, setIdx] = React.useState(0)
    const [phase, setPhase] = React.useState<"sheet" | "folding" | "plane" | "fly" | "done">("sheet")
    const st = React.useRef({ x: { x: w / 2, v: 0 }, y: { x: h * 0.45, v: 0 }, rot: 0, vx: 0, vy: 0, t: 0, drag: false, s: 1, sent: 0 })
    const timers = useTimers()
    const phaseRef = useLatest(phase)

    const fold = () => {
        if (phaseRef.current !== "sheet") return
        setPhase("folding")
        fx.sound("tear", 0.6)
        fx.haptic("light")
        timers.after(reduced ? 50 : 520, () => { fx.sound("tick"); fx.haptic("tick") })
        timers.after(reduced ? 80 : 950, () => { setPhase("plane"); props.hint("Swipe to launch it", true) })
    }
    useDrag(plane, stage, {
        onStart: () => { if (phaseRef.current === "sheet") { fold(); return false } if (phaseRef.current !== "plane") return false; st.current.drag = true },
        onMove: (d) => { const s = st.current; s.x.x = w / 2 + d.dx; s.y.x = h * 0.45 + d.dy; s.rot = Math.atan2(d.vy, d.vx || 0.001) },
        onEnd: (d) => {
            const s = st.current
            s.drag = false
            let sp = Math.hypot(d.vx, d.vy)
            const travel = Math.hypot(d.dx, d.dy)
            // A long deliberate throw counts too, even if the finger slowed at the end.
            if (sp <= 350 && travel > 110) { d.vx = (d.dx / travel) * 700; d.vy = (d.dy / travel) * 700; sp = 700 }
            if (sp > 350) {
                s.vx = d.vx * 0.9; s.vy = d.vy * 0.9 - 80; s.t = 0
                setPhase("fly")
                props.hint(null)
                fx.sound("whoosh", 1)
                fx.haptic("medium")
            } else if (Math.hypot(d.dx, d.dy) > 12) {
                props.hint("A quicker flick sends it")
                fx.sound("boing", 0.5)
            }
        },
    }, phase === "sheet" || phase === "plane")

    useFrame((dt) => {
        const s = st.current
        const ph2 = phaseRef.current
        if (ph2 === "fly") {
            s.t += dt
            s.vx += Math.sin(s.t * 1.7 + s.sent) * 260 * dt
            s.vy += (Math.cos(s.t * 1.2) * 120 - 40) * dt
            s.x.x += s.vx * dt; s.y.x += s.vy * dt
            s.rot = Math.atan2(s.vy, s.vx)
            s.s = Math.max(0.45, s.s - dt * 0.25)
            if (!reduced) fx.burst(s.x.x - Math.cos(s.rot) * pw * 0.35 * s.s, s.y.x - Math.sin(s.rot) * pw * 0.35 * s.s, { kind: "glow", n: 1, size: 3, speed: 5, color: dark ? "rgba(230,235,255,.55)" : "rgba(255,255,255,.95)", life: 0.9 })
            if (s.x.x < -pw || s.x.x > w + pw || s.y.x < -ph || s.y.x > h + ph) {
                s.sent += 1
                props.progress(s.sent / items.length)
                fx.sound("chime", 1 + s.sent * 0.1)
                if (s.sent >= items.length) { setPhase("done"); fx.haptic("success"); timers.after(500, props.done) }
                else { s.x = { x: w / 2, v: 0 }; s.y = { x: h * 0.45, v: 0 }; s.rot = 0; s.s = 1; setIdx(s.sent); setPhase("sheet"); props.hint(null) }
            }
        } else if (!s.drag) {
            springTo(s.x, w / 2, dt, 200, 20); springTo(s.y, h * 0.45, dt, 200, 20)
            s.rot *= Math.pow(0.02, dt)
        }
        if (plane.current) plane.current.style.transform = `translate3d(${s.x.x}px, ${s.y.x}px, 0) translate(-50%, -50%) rotate(${ph2 === "sheet" || ph2 === "folding" ? 0 : s.rot}rad) scale(${s.s})`
    })

    const isPlane = phase !== "sheet"
    const clip = isPlane ? "polygon(0% 18%, 55% 44%, 100% 50%, 55% 56%, 0% 82%, 20% 50%)" : "polygon(0% 0%, 55% 0%, 100% 0%, 100% 100%, 55% 100%, 0% 100%)"
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(180deg, #172033, #121520)" : "linear-gradient(180deg, #D7E6F5, #F2F1EC)" }} />
            <div ref={plane} className="rk-abs" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (phase === "sheet") fold(); else if (phase === "plane") { const s = st.current; s.vx = 700; s.vy = -260; s.t = 0; setPhase("fly"); fx.sound("whoosh") } } }}
                aria-label={phase === "sheet" ? "Fold the page into a plane" : "Launch the plane"}
                style={{ width: pw, height: ph, cursor: phase === "plane" ? "grab" : "pointer", touchAction: "none" }}>
                <div style={{ position: "absolute", inset: 0, clipPath: clip, WebkitClipPath: clip, transition: reduced ? "none" : "clip-path .9s cubic-bezier(.65,0,.35,1), -webkit-clip-path .9s cubic-bezier(.65,0,.35,1)", background: "linear-gradient(160deg, var(--paper), #E9E2D6)", filter: "drop-shadow(0 10px 16px rgba(0,0,0,.18))" }} />
                {isPlane ? <div style={{ position: "absolute", left: "20%", right: 0, top: "50%", height: 1.5, background: "rgba(0,0,0,.12)" }} /> : null}
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: "0 22px", textAlign: "center", fontFamily: "var(--serif)", color: "var(--paper-ink)", fontSize: stageFont(w, isPlane ? 0.62 : 1.02), transform: isPlane ? "translateX(10%) scaleY(.7)" : "none", opacity: isPlane ? 0.55 : 1, transition: "all .8s cubic-bezier(.65,0,.35,1)", pointerEvents: "none" }}>
                    {items[Math.min(idx, items.length - 1)].text}
                </div>
            </div>
        </div>
    )
}

/* ---------- 41 · UNHOOK — cut a string; what was attached floats free ---------- */

function RitualUnhook(props: RitualProps) {
    const { items, w, h, fx, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const anchorX = w / 2, anchorY = h * 0.05
    const hookLen = h * 0.2
    const r = clamp(Math.min(w / 8, h / 9), 34, 54)
    const homes = items.map((_, i) => ({ x: w * (items.length === 1 ? 0.5 : 0.18 + (0.64 * i) / (items.length - 1)), y: h * 0.64 }))
    const bubbles = React.useRef(items.map((_, i) => ({ x: homes[i].x, y: homes[i].y, vx: 0, vy: 0, cut: false, retract: 0, o: 1 })))
    const swing = React.useRef({ x: 0, v: 0 })
    const last = React.useRef<{ x: number; y: number } | null>(null)
    const hookG = React.useRef<SVGGElement>(null)
    const strings = React.useRef<(SVGPathElement | null)[]>([])
    const tails = React.useRef<(SVGPathElement | null)[]>([])
    const els = React.useRef<(HTMLDivElement | null)[]>([])
    const st = React.useRef({ cut: 0, done: false })
    const timers = useTimers()

    const tip = () => {
        const a = swing.current.x
        return { x: anchorX + Math.sin(a) * hookLen, y: anchorY + Math.cos(a) * hookLen }
    }
    const curvePts = (i: number) => {
        const t = tip(), b = bubbles.current[i]
        const mx = (t.x + b.x) / 2, my = (t.y + b.y) / 2 + 30
        const pts: { x: number; y: number }[] = []
        for (let k = 0; k <= 12; k++) {
            const u = k / 12
            pts.push({ x: (1 - u) * (1 - u) * t.x + 2 * (1 - u) * u * mx + u * u * b.x, y: (1 - u) * (1 - u) * t.y + 2 * (1 - u) * u * my + u * u * (b.y - r) })
        }
        return pts
    }
    const segHit = (a: any, b: any, c: any, d: any) => {
        const den = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y)
        if (Math.abs(den) < 1e-6) return false
        const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / den
        const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / den
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
    }
    const cut = (i: number) => {
        const b = bubbles.current[i]
        if (b.cut) return
        b.cut = true
        b.vy = -30
        swing.current.v += (b.x < anchorX ? 1 : -1) * 1.6
        st.current.cut += 1
        fx.sound("snap")
        fx.haptic("medium")
        fx.burst(b.x, b.y - r, { kind: "spark", n: 14, size: 1.8, speed: 160, color: ["#FFFFFF", hsl(emo.calmHue, 85, 72)], life: 0.5 })
        fx.burst(b.x, b.y, { kind: "glow", n: 1, size: r * 0.6, color: hsl(emo.calmHue, 85, 75, 0.5), life: 0.8 })
        props.progress(st.current.cut / items.length)
        if (st.current.cut >= items.length && !st.current.done) { st.current.done = true; timers.after(1600, () => { fx.haptic("success"); props.done() }) }
    }
    useDrag(stage, stage, {
        onStart: (d) => {
            last.current = { x: d.x, y: d.y }
            bubbles.current.forEach((b, i) => { if (!b.cut && dist(d.x, d.y, b.x, b.y) < r) cut(i) })
        },
        onMove: (d) => {
            const p = last.current
            last.current = { x: d.x, y: d.y }
            if (!p) return
            bubbles.current.forEach((b, i) => {
                if (b.cut) return
                const pts = curvePts(i)
                for (let k = 0; k < pts.length - 1; k++) if (segHit(p, { x: d.x, y: d.y }, pts[k], pts[k + 1])) { cut(i); break }
            })
        },
        onEnd: () => { last.current = null },
    })

    useFrame((dt, t) => {
        springTo(swing.current, 0, dt, 18, 1.6)
        const tp = tip()
        if (hookG.current) hookG.current.setAttribute("transform", `rotate(${(-swing.current.x * 180) / Math.PI} ${anchorX} ${anchorY})`)
        bubbles.current.forEach((b, i) => {
            if (b.cut) {
                b.vy -= 70 * dt
                b.vx = Math.sin(t * 1.4 + i) * 22
                b.x += b.vx * dt; b.y += b.vy * dt
                b.retract = Math.min(1, b.retract + dt * 3)
                if (b.y < -r * 2) b.o = 0
                else b.o = clamp((b.y + r) / (h * 0.3), 0, 1)
            } else {
                b.y = homes[i].y + Math.sin(t * 1.1 + i * 2) * 4
            }
            const el = els.current[i]
            if (el) { el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) translate(-50%, -50%)`; el.style.opacity = String(b.o) }
            const sp = strings.current[i]
            if (sp) {
                if (!b.cut) {
                    const pts = curvePts(i)
                    sp.setAttribute("d", "M " + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L "))
                    sp.style.opacity = "1"
                } else {
                    // The upper half springs back toward the hook.
                    const len = (1 - b.retract) * dist(tp.x, tp.y, homes[i].x, homes[i].y) * 0.5
                    const ang = Math.atan2(homes[i].y - tp.y, homes[i].x - tp.x)
                    sp.setAttribute("d", `M ${tp.x} ${tp.y} Q ${tp.x + Math.cos(ang) * len * 0.5 + Math.sin(t * 8) * 8 * (1 - b.retract)} ${tp.y + len * 0.6} ${tp.x + Math.cos(ang) * len} ${tp.y + Math.sin(ang) * len}`)
                    sp.style.opacity = String(1 - b.retract)
                }
            }
            const tl = tails.current[i]
            if (tl) {
                tl.style.opacity = b.cut ? String(b.o) : "0"
                tl.setAttribute("d", `M ${b.x} ${b.y + r * 0.95} q ${Math.sin(t * 3 + i) * 10} 20 ${Math.sin(t * 2 + i) * 6} 40`)
            }
        })
    })

    const steel = dark ? "#AEB3C2" : "#6E7482"
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0, cursor: "crosshair" }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(180deg,#15161C,#121317)" : "linear-gradient(180deg,#F8F6F2,#EEEAE3)" }} />
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <rect x={anchorX - 60} y={anchorY - 6} width={120} height={8} rx={4} fill={steel} opacity={0.6} />
                {items.map((_, i) => <path key={"s" + i} ref={(el) => { strings.current[i] = el }} fill="none" stroke={dark ? "rgba(255,255,255,.55)" : "rgba(40,40,50,.5)"} strokeWidth={1.6} />)}
                {items.map((_, i) => <path key={"t" + i} ref={(el) => { tails.current[i] = el }} fill="none" stroke={dark ? "rgba(255,255,255,.4)" : "rgba(40,40,50,.35)"} strokeWidth={1.4} style={{ opacity: 0 }} />)}
                <g ref={hookG}>
                    <line x1={anchorX} y1={anchorY} x2={anchorX} y2={anchorY + hookLen * 0.55} stroke={steel} strokeWidth={4} strokeLinecap="round" />
                    <path d={`M ${anchorX} ${anchorY + hookLen * 0.55} v ${hookLen * 0.3} a ${hookLen * 0.16} ${hookLen * 0.16} 0 1 1 ${-hookLen * 0.32} 0`} fill="none" stroke={steel} strokeWidth={5} strokeLinecap="round" />
                </g>
            </svg>
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { els.current[i] = el }} className="rk-abs" role="button" tabIndex={0} aria-label={`Cut the string holding “${it.text}”`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cut(i) } }}
                    style={{ width: r * 2, height: r * 2, borderRadius: "50%", display: "grid", placeItems: "center", padding: 6, background: dark ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,.25), hsla(${emo.hue},40%,40%,.35))` : `radial-gradient(circle at 35% 30%, #fff, hsla(${emo.hue},60%,86%,.9))`, boxShadow: "0 8px 22px rgba(0,0,0,.14), inset 0 0 0 1px var(--line)" }}>
                    <WordBody item={it} size={clamp(r / 3.5, 12, 15)} layout="col" imgSize={Math.round(r * 0.6)} style={{ maxWidth: r * 1.7, pointerEvents: "none" }} />
                </div>
            ))}
        </div>
    )
}

/* ---------- 47 · UNFOLLOW — the repeats stop when the connection does ---------- */

function RitualUnfollow(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, faces } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const plugRef = React.useRef<HTMLDivElement>(null)
    const fw = clamp(w * 0.54, 170, 300), fh = Math.min(h * 0.78, 520)
    const fx0 = Math.max(14, w * 0.08), fy0 = (h - fh) / 2
    const portX = fx0 + fw, portY = fy0 + fh * 0.5
    const restX = Math.min(w - 40, portX + (w - portX) * 0.55), restY = portY + 40
    const threshold = Math.min(170, w * 0.34)
    const cardH = 92
    const feedEl = React.useRef<HTMLDivElement>(null)
    const cable = React.useRef<SVGPathElement>(null)
    const [snapped, setSnapped] = React.useState(false)
    const st = React.useRef({ off: 0, speed: 44, px: restX, py: restY, pvx: 0, pvy: 0, drag: false, tension: 0, snapped: false, stop: 0, loop: null as Loop | null, tick: 0, done: false })
    const timers = useTimers()

    useDrag(plugRef, stage, {
        onStart: () => { if (st.current.snapped) return false; st.current.drag = true; st.current.loop = fx.loop("motor"); fx.haptic("light") },
        onMove: (d) => {
            const s = st.current
            const dx = d.x - restX, dy = d.y - restY
            const L = Math.hypot(dx, dy) || 1
            const eff = Math.min(L, threshold * 1.4) * 0.8
            s.px = restX + (dx / L) * eff; s.py = restY + (dy / L) * eff
            s.tension = eff / threshold
            s.loop?.set(180 + s.tension * 260, 0.6 + s.tension)
            if (!props.reduced && s.tension > 0.55 && Math.random() < s.tension * 0.6) fx.burst(portX + 4, portY, { kind: "spark", n: 2, size: 1.5, speed: 120, color: ["#FFFFFF", "#B9B4FF"], life: 0.3 })
            const step = Math.floor(s.tension * 6)
            if (step > s.tick) { fx.haptic("tick"); fx.sound("tick", 0.7 + s.tension * 0.5) }
            s.tick = step
            if (s.tension >= 1 && !s.snapped) {
                s.snapped = true
                setSnapped(true)
                s.drag = false
                s.pvx = d.vx * 0.5 + (dx / L) * 500; s.pvy = d.vy * 0.5 - 200
                s.loop?.stop(); s.loop = null
                fx.sound("snap"); fx.sound("thud", 0.7)
                fx.burst(s.px, s.py, { kind: "spark", n: 26, size: 2.2, speed: 260, color: ["#FFFFFF", "#B9B4FF", "#8F86FF"], life: 0.7 })
                fx.burst(portX, portY, { kind: "ring", n: 1, size: 50, color: "rgba(160,150,255,.8)", life: 0.6 })
                fx.haptic("heavy")
                props.hint(null)
            }
        },
        onEnd: () => { const s = st.current; s.drag = false; s.tick = 0; s.loop?.stop(); s.loop = null; if (!s.snapped && s.tension > 0.2) props.hint("Keep pulling — it gives at the end") },
    })

    useFrame((dt, t) => {
        const s = st.current
        if (s.snapped) {
            s.stop = Math.min(1, s.stop + dt * 0.8)
            s.pvy += 900 * dt
            s.px += s.pvx * dt; s.py += s.pvy * dt
        } else if (!s.drag) {
            s.px += (restX - s.px) * Math.min(1, dt * 10); s.py += (restY - s.py) * Math.min(1, dt * 10)
            s.tension *= Math.pow(0.02, dt)
        }
        s.speed = s.snapped ? 44 * (1 - smooth(s.stop)) : 44 + s.tension * 170
        s.off = (s.off + s.speed * dt * (reduced ? 0.4 : 1)) % cardH
        if (feedEl.current) feedEl.current.style.transform = `translateY(${-s.off}px)`
        props.progress(s.snapped ? 0.5 + s.stop * 0.5 : s.tension * 0.5)
        if (plugRef.current) plugRef.current.style.transform = `translate3d(${s.px}px, ${s.py}px, 0) translate(-50%, -50%) rotate(${s.snapped ? t * 300 : 0}deg)`
        if (cable.current) {
            if (!s.snapped) {
                const sag = 40 * (1 - Math.min(1, s.tension))
                cable.current.setAttribute("d", `M ${portX} ${portY} C ${portX + 30} ${portY + sag}, ${s.px - 30} ${s.py + sag}, ${s.px - 14} ${s.py}`)
                cable.current.setAttribute("stroke-width", String(6 - s.tension * 2.5))
            } else {
                const droop = 30 + s.stop * 90
                cable.current.setAttribute("d", `M ${portX} ${portY} C ${portX + 20} ${portY + droop}, ${portX + 40} ${portY + droop}, ${portX + 30} ${portY + droop + 10}`)
            }
            cable.current.style.opacity = s.snapped ? String(1 - s.stop * 0.6) : "1"
        }
        if (s.snapped && s.stop >= 1 && !s.done) { s.done = true; fx.haptic("success"); timers.after(500, props.done) }
    })

    const nCards = Math.ceil(fh / cardH) + 2
    const avatar = items[0].img || faces[0]
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#131418" : "#F3F0EB" }} />
            <div style={{ position: "absolute", left: fx0, top: fy0, width: fw, height: fh, borderRadius: 28, background: dark ? "#1D1E25" : "#FFFFFF", boxShadow: "var(--shadow-2), inset 0 0 0 1px var(--line)", overflow: "hidden" }}>
                <div ref={feedEl} style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
                    {Array.from({ length: nCards }, (_, i) => (
                        <div key={i} style={{ height: cardH, padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", gap: 10, opacity: snapped && i !== 1 ? 0.12 : 1, transition: "opacity 1.4s ease" }}>
                            <span style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "var(--fill-2)", flex: "0 0 auto" }}>{avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)" }} /> : null}</span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <b style={{ display: "block", fontSize: 14, fontWeight: 650, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{items[0].text}</b>
                                <i style={{ display: "block", height: 7, borderRadius: 4, background: "var(--fill-2)", marginTop: 9, width: "86%" }} />
                                <i style={{ display: "block", height: 7, borderRadius: 4, background: "var(--fill-2)", marginTop: 6, width: "58%" }} />
                            </span>
                        </div>
                    ))}
                </div>
                <div style={{ position: "absolute", right: -5, top: fh * 0.5 - 12, width: 10, height: 24, borderRadius: 4, background: dark ? "#3A3C46" : "#CFCBC4" }} />
            </div>
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <path ref={cable} fill="none" stroke="var(--accent)" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px var(--accent-soft))" }} />
            </svg>
            <div ref={plugRef} className="rk-abs" role="img" aria-label="Plug. Drag it away to disconnect the loop." style={{ width: 46, height: 46, borderRadius: 14, background: dark ? "#2C2E37" : "#FFFFFF", boxShadow: "var(--shadow-2), inset 0 0 0 1px var(--line)", cursor: "grab", touchAction: "none", display: "grid", placeItems: "center" }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" }} />
            </div>
        </div>
    )
}

/* ---------- 52 · SUBTITLES — same words, different narrator ---------- */

const NARRATORS = [
    { id: "nature", label: "Nature documentary", grade: "sepia(.35) saturate(1.1)", tint: "rgba(80,120,60,.35)", line: (p: string) => `Here, in its natural habitat, “${p}” circles once more. Remarkable. Eventually, it wanders off to graze.` },
    { id: "soap", label: "Soap opera", grade: "saturate(1.4) contrast(1.05)", tint: "rgba(160,60,110,.35)", line: (p: string) => `“${p}?” she gasped — for the fourth time this episode. Dramatic music. Fade out.` },
    { id: "sports", label: "Sports commentary", grade: "saturate(1.2)", tint: "rgba(40,110,180,.35)", line: (p: string) => `And “${p}” takes it down the wing… it's going wide! The crowd barely looks up.` },
    { id: "cooking", label: "Cooking show", grade: "sepia(.2) saturate(1.3) brightness(1.05)", tint: "rgba(200,120,40,.32)", line: (p: string) => `Take one “${p}”, let it simmer gently, then set it aside to cool. Lovely.` },
]

function RitualSubtitles(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const phrase = items[0].text
    const [chosen, setChosen] = React.useState<string[]>([])
    const [active, setActive] = React.useState<string | null>(null)
    const [typed, setTyped] = React.useState(0)
    const timers = useTimers()
    const N = NARRATORS.find((n) => n.id === active)
    const line = N ? N.line(phrase) : `“${phrase}”`
    const frameW = Math.min(w - 28, 560), frameH = Math.min(frameW * 0.56, h * 0.48)
    const needed = 2

    React.useEffect(() => {
        if (!N) return
        setTyped(0)
        if (reduced) { setTyped(line.length); return }
        let i = 0
        const id = window.setInterval(() => {
            i += 2
            setTyped(Math.min(line.length, i))
            if (i % 6 === 0) fx.sound("tick", 1.4)
            if (i >= line.length) window.clearInterval(id)
        }, 28)
        return () => window.clearInterval(id)
    }, [active])

    const pick = (id: string) => {
        if (active === id) return
        setActive(id)
        fx.haptic("light")
        fx.sound("pluck", 1 + chosen.length * 0.12)
        const next = chosen.includes(id) ? chosen : [...chosen, id]
        setChosen(next)
        props.progress(Math.min(1, next.length / needed))
        if (next.length >= needed && chosen.length < needed) timers.after(4200, () => { fx.haptic("success"); props.done() })
    }

    const shown = N ? line.slice(0, typed) : line
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#0F0F13" : "#ECE8E1" }} />
            <div style={{ position: "absolute", left: (w - frameW) / 2, top: Math.max(12, (h - frameH) * 0.28), width: frameW, height: frameH, borderRadius: 18, overflow: "hidden", background: "#0B0B0E", boxShadow: "var(--shadow-2)" }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 70% at 40% 40%, ${N ? N.tint : "rgba(120,120,140,.25)"}, transparent 75%), linear-gradient(180deg, #1A1A20, #0B0B0E)`, filter: N ? N.grade : "none", transition: "background .8s" }} />
                <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "11%", background: "#000" }} />
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "11%", background: "#000" }} />
                {N ? <div style={{ position: "absolute", left: 14, top: "14%", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "rgba(255,255,255,.6)", textTransform: "uppercase" }}>{N.label}</div> : null}
                <div style={{ position: "absolute", left: "6%", right: "6%", bottom: "15%", textAlign: "center", color: "#FFFFFF", fontSize: clamp(frameW / 26, 14, 20), fontWeight: 600, lineHeight: 1.35, textShadow: "0 2px 6px rgba(0,0,0,.9)", minHeight: "2.7em" }} aria-live="polite">
                    {shown}
                </div>
            </div>
            <div style={{ position: "absolute", left: 14, right: 14, top: Math.max(12, (h - frameH) * 0.28) + frameH + 14, bottom: 10, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", alignContent: "flex-start" }}>
                {NARRATORS.map((n) => (
                    <button key={n.id} type="button" className={`tsr-chip ${active === n.id ? "sel" : ""}`} style={{ paddingLeft: 14 }} onClick={() => pick(n.id)} aria-pressed={active === n.id}>
                        {chosen.includes(n.id) && active !== n.id ? <Icon name="check" size={16} /> : null}
                        {n.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

/* ---------- 61 · FREEZE — slow the racing thing until it stops, then let it shatter ---------- */

function RitualFreeze(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, intensity, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const obj = React.useRef<HTMLDivElement>(null)
    const ow = Math.min(w * 0.5, 230), oh = 82
    const sp0 = (reduced ? 90 : 170) + (intensity ?? 6) * 14
    const st = React.useRef({ x: w / 2, y: h / 2, vx: sp0 * 0.8, vy: sp0 * 0.6, frost: 0, broken: false, turn: 0 })
    const [frost, setFrost] = React.useState(0)
    const [broken, setBroken] = React.useState(false)
    const timers = useTimers()

    const tap = () => {
        const s = st.current
        if (s.broken) return
        if (s.frost >= 1) {
            s.broken = true
            setBroken(true)
            fx.sound("ice", 0.6); fx.sound("snap")
            fx.haptic("heavy")
            fx.burst(s.x, s.y, { kind: "shard", n: 34, size: 8, speed: 340, color: ["rgba(220,240,255,.95)", "rgba(180,215,255,.9)", "rgba(255,255,255,.95)"], life: 1.3 })
            props.progress(1)
            timers.after(1100, props.done)
            return
        }
        s.frost = Math.min(1, s.frost + 0.2)
        s.vx *= 0.62; s.vy *= 0.62
        setFrost(s.frost)
        props.progress(s.frost * 0.85)
        fx.sound("ice", 0.9 + s.frost * 0.4)
        fx.haptic("light")
        fx.burst(s.x, s.y, { kind: "spark", n: 10, size: 2, speed: 140, color: ["#FFFFFF", "#CFE6FF"], life: 0.6 })
        if (s.frost >= 1) { s.vx = 0; s.vy = 0; props.hint("Frozen solid. Tap to shatter it.", true) }
    }
    React.useEffect(() => {
        const el = stage.current
        if (!el) return
        const down = (e: PointerEvent) => { e.preventDefault(); tap() }
        el.addEventListener("pointerdown", down)
        return () => el.removeEventListener("pointerdown", down)
    }, [])

    useFrame((dt, t) => {
        const s = st.current
        if (!s.broken && s.frost < 1) {
            s.turn += dt
            if (s.turn > 0.9) { s.turn = 0; const a = rand(-0.5, 0.5); const c = Math.cos(a), sn = Math.sin(a); const vx = s.vx * c - s.vy * sn; s.vy = s.vx * sn + s.vy * c; s.vx = vx }
            s.x += s.vx * dt; s.y += s.vy * dt
            if (s.x < ow / 2 + 6) { s.x = ow / 2 + 6; s.vx = Math.abs(s.vx) }
            if (s.x > w - ow / 2 - 6) { s.x = w - ow / 2 - 6; s.vx = -Math.abs(s.vx) }
            if (s.y < oh / 2 + 6) { s.y = oh / 2 + 6; s.vy = Math.abs(s.vy) }
            if (s.y > h - oh / 2 - 6) { s.y = h - oh / 2 - 6; s.vy = -Math.abs(s.vy) }
        }
        if (obj.current) obj.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${s.frost >= 1 ? 0 : Math.atan2(s.vy, s.vx) * 6 * (1 - s.frost)}deg)`
    })

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0, cursor: "pointer" }} role="button" tabIndex={0} aria-label={frost >= 1 ? "Shatter it" : "Add frost"} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap() } }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? `linear-gradient(180deg, #121620, #0F1116)` : `linear-gradient(180deg, #EAF2FA, #F4F2EE)` }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 60% at 50% 50%, rgba(170,210,255,.35), transparent 70%)", opacity: frost, transition: "opacity .6s" }} />
            <FrostCanvas w={w} h={h} level={frost} dark={dark} />
            <div ref={obj} className="rk-abs" style={{ width: ow, height: oh, borderRadius: oh / 2, opacity: broken ? 0 : 1, transition: "opacity .12s", pointerEvents: "none" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: oh / 2, background: mixHsl(emo.hue, 205, frost, 60 - frost * 20, dark ? 46 + frost * 20 : 64 + frost * 18), boxShadow: `0 10px 26px rgba(0,0,0,.2), inset 0 0 0 ${1 + frost * 2}px rgba(255,255,255,${0.2 + frost * 0.6})`, transition: "background-color .5s" }} />
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: frost, transition: "opacity .5s" }}>
                    {[["M8,20 L22,8 M22,8 L30,14 M15,14 L12,6", 0.2], ["M70,30 L84,18 L92,24 M78,24 L80,34", 0.4], ["M40,6 L48,16 L58,8 M48,16 L46,26", 0.6], ["M26,32 L36,24 L44,32", 0.8], ["M60,12 L66,4 M88,10 L94,4", 1]].map(([d, at], i) => (
                        <path key={i} d={String(d)} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth=".9" style={{ opacity: frost >= Number(at) ? 1 : 0, transition: "opacity .4s" }} />
                    ))}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: "0 18px", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.25)" }}>
                    <WordBody item={items[0]} size={stageFont(w, 0.95)} imgSize={34} style={{ color: "#fff" }} />
                </div>
            </div>
        </div>
    )
}

/* ---------- 75 · INK BLEED — one luminous drop loosens rigid letters ---------- */

function RitualInkBleed(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const dropRef = React.useRef<HTMLDivElement>(null)
    const textBox = React.useRef<HTMLDivElement>(null)
    const text = items[0].text.slice(0, 40)
    const letters = React.useMemo(() => Array.from(text), [text])
    const longest = Math.max(4, ...text.split(/\s+/).map((x) => x.length))
    const fs = Math.round(clamp(Math.min((w * 0.84) / (Math.min(letters.length, 16) * 0.52), (w - 48) / (longest * 0.6)), 22, 60))
    const words = React.useMemo(() => { const out: { ch: string; i: number }[][] = [[]]; letters.forEach((ch, i) => { out[out.length - 1].push({ ch, i }); if (ch === " ") out.push([]) }); return out }, [letters])
    const els = React.useRef<(HTMLSpanElement | null)[]>([])
    const centers = React.useRef<{ x: number; y: number }[]>([])
    const bleed = React.useRef(letters.map(() => ({ b: 0, dx: 0, dy: 0 })))
    const blooms = React.useRef<HTMLDivElement>(null)
    const st = React.useRef({ x: w * 0.16, y: h * 0.2, drag: false, lvx: 0, lvy: 0, done: false, lastP: 0, lastSound: 0 })
    const timers = useTimers()
    const solid = letters.filter((c) => c.trim()).length

    const measure = () => {
        const host = stage.current?.getBoundingClientRect()
        if (!host) return
        centers.current = els.current.map((el) => {
            if (!el) return { x: -999, y: -999 }
            const r = el.getBoundingClientRect()
            return { x: r.left - host.left + r.width / 2, y: r.top - host.top + r.height / 2 }
        })
    }
    React.useEffect(() => { const id = window.setTimeout(measure, 60); return () => window.clearTimeout(id) }, [w, h, text])

    useDrag(dropRef, stage, {
        onStart: () => { if (st.current.done) return false; st.current.drag = true; fx.haptic("light"); measure() },
        onMove: (d) => { const s = st.current; s.x = clamp(d.x, 12, w - 12); s.y = clamp(d.y, 12, h - 12); s.lvx = d.vx; s.lvy = d.vy },
        onEnd: () => { st.current.drag = false },
    })

    useFrame((dt, t) => {
        const s = st.current
        if (s.drag && !reduced) fx.burst(s.x, s.y, { kind: "glow", n: 1, size: 5, speed: 8, color: hsl(emo.calmHue, 85, dark ? 70 : 62, 0.55), life: 1.1 })
        if (dropRef.current) dropRef.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) scale(${s.drag ? 1.15 : 1 + (reduced ? 0 : Math.sin(t * 2) * 0.04)})`
        let bled = 0
        letters.forEach((ch, i) => {
            const c = centers.current[i]
            const L = bleed.current[i]
            if (c && s.drag && !s.done) {
                const d = dist(c.x, c.y, s.x, s.y)
                const reach = fs * 1.35
                if (d < reach) {
                    const k = (1 - d / reach) * dt * 7
                    if (L.b < 1) {
                        L.b = Math.min(1, L.b + k)
                        L.dx += clamp(s.lvx * 0.004, -3, 3) * k * 10
                        L.dy += (0.5 + Math.abs(clamp(s.lvy * 0.003, -2, 2))) * k * 14
                        if (!reduced && Math.random() < k * 2 && blooms.current) {
                            const b = document.createElement("span")
                            const size = fs * rand(0.5, 1.1)
                            b.style.cssText = `position:absolute;left:${c.x - size / 2 + L.dx}px;top:${c.y - size / 2 + L.dy}px;width:${size}px;height:${size}px;border-radius:50%;background:${mixHsl(emo.hue, emo.calmHue, L.b, 70, dark ? 60 : 62, 0.22)};filter:blur(${size * 0.18}px);transition:opacity 2.4s ease;pointer-events:none`
                            blooms.current.appendChild(b)
                            if (blooms.current.childElementCount > 70) blooms.current.firstElementChild?.remove()
                        }
                        if (t - s.lastSound > 0.14) { s.lastSound = t; fx.sound("drip", rand(0.7, 1.3)) }
                    }
                }
            }
            if (ch.trim() && L.b > 0.5) bled += 1
            const el = els.current[i]
            if (el) {
                el.style.transform = `translate(${L.dx}px, ${L.dy}px) scale(${1 + L.b * 0.12}, ${1 + L.b * 0.7})`
                el.style.filter = reduced ? "" : `blur(${L.b * 2.4}px)`
                el.style.opacity = String(1 - L.b * 0.55)
                el.style.color = L.b > 0 ? mixHsl(emo.hue, emo.calmHue, L.b, 40 + L.b * 30, dark ? 75 - L.b * 10 : 22 + L.b * 30) : ""
            }
        })
        const p = solid ? bled / solid : 1
        if (Math.abs(p - s.lastP) > 0.02) { s.lastP = p; props.progress(Math.min(1, p / 0.75)) }
        if (!s.done && p >= 0.75) {
            s.done = true
            bleed.current.forEach((L) => { L.b = 1; L.dy += 8 })
            fx.haptic("success")
            fx.sound("water")
            timers.after(1300, props.done)
        }
    })

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#141317" : "#FBF8F2" }} />
            <div ref={blooms} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
            <div ref={textBox} style={{ position: "absolute", left: 18, right: 18, top: 0, bottom: 0, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", pointerEvents: "none" }}>
                {words.map((wd, k) => (
                    <span key={k} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                        {wd.map(({ ch, i }) => (
                            <span key={i} ref={(el) => { els.current[i] = el }} style={{ display: "inline-block", whiteSpace: "pre", fontFamily: "var(--serif)", fontWeight: 600, fontSize: fs, lineHeight: 1.15, color: dark ? "#F1ECE3" : "#1D1A22", transformOrigin: "50% 0" }}>{ch}</span>
                        ))}
                    </span>
                ))}
            </div>
            <div ref={dropRef} className="rk-abs" role="img" aria-label="Ink drop. Drag it through the words." style={{ width: 40, height: 40, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", cursor: "grab", touchAction: "none", background: `radial-gradient(circle at 35% 30%, #fff, ${hsl(emo.calmHue, 80, 66)} 45%, ${hsl(emo.hue, 70, 50)})`, boxShadow: `0 0 24px ${hsl(emo.calmHue, 90, 65, 0.7)}` }} />
        </div>
    )
}

/* ---------- 79 · MISS ON PURPOSE — the chosen miss is the win ---------- */

function RitualMissOnPurpose(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const bpm = 76
    const beat = 60 / bpm
    const [beatIdx, setBeatIdx] = React.useState(-1)
    const [misses, setMisses] = React.useState(0)
    const [flash, setFlash] = React.useState<{ k: number; text: string } | null>(null)
    const [tilt, setTilt] = React.useState<number[]>([])
    const st = React.useRef({ t0: 0, lastBeat: -1, taps: [] as number[], barTapped: false, misses: 0, quiet: 0, done: false })
    const timers = useTimers()
    const NEED = 3
    const letters = Array.from(items[0].text.slice(0, 30))

    useFrame((_, t) => {
        const s = st.current
        if (!s.t0) s.t0 = t + 0.6
        if (s.done) return
        const now = t - s.t0
        if (now < 0) return
        const bIndex = Math.floor(now / beat)
        if (bIndex !== s.lastBeat) {
            // Evaluate the beat that just finished.
            const prev = s.lastBeat
            if (prev >= 0 && prev % 4 === 3) {
                const tappedHighlight = s.taps.some((x) => Math.abs(x - (prev * beat)) < beat * 0.45)
                if (!tappedHighlight && s.barTapped) {
                    s.misses += 1
                    setMisses(s.misses)
                    setFlash({ k: Date.now(), text: s.misses >= NEED ? "Perfectly imperfect." : "Missed — on purpose." })
                    setTilt((tl) => [...tl, Math.floor(hashNoise(s.misses, 4) * letters.length)])
                    fx.sound("complete")
                    fx.haptic("success")
                    if (!reduced) fx.burst(w / 2, h * 0.62, { kind: "petal", n: 18, size: 5, speed: 220, color: [hsl(emo.calmHue, 75, 70), hsl(emo.hue, 70, 72), "#FFE9B0"], life: 1.6, gravity: 140 })
                    props.progress(s.misses / NEED)
                    if (s.misses >= NEED) { s.done = true; timers.after(1500, props.done) }
                } else if (!s.barTapped) {
                    s.quiet += 1
                    if (s.quiet >= 2) props.hint("Tap along with the first three beats")
                } else if (tappedHighlight) {
                    setFlash({ k: Date.now(), text: "That one's for missing" })
                }
                s.barTapped = false
                s.taps = []
            }
            s.lastBeat = bIndex
            setBeatIdx(bIndex)
            const isHi = bIndex % 4 === 3
            fx.sound("tick", isHi ? 0.6 : 1.1)
        }
    })

    const tap = () => {
        const s = st.current
        if (s.done || !s.t0) return
        const now = performance.now() / 1000 - s.t0
        const nearest = Math.round(now / beat)
        const isHi = ((nearest % 4) + 4) % 4 === 3
        s.taps.push(nearest * beat)
        if (!isHi) { s.barTapped = true; s.quiet = 0; props.hint(null); fx.sound("pop", 1.3); fx.haptic("light") }
        else { fx.sound("boing", 0.6) }
    }

    const cur = ((beatIdx % 4) + 4) % 4
    const dot = Math.min(64, (w - 80) / 4)
    return (
        <div style={{ position: "absolute", inset: 0 }} onPointerDown={(e) => { e.preventDefault(); tap() }} role="button" tabIndex={0} aria-label="Tap the beats. Skip the glowing one." onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tap() } }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#131318" : "#F7F4EF" }} />
            <div style={{ position: "absolute", left: 20, right: 20, top: h * 0.12, textAlign: "center", fontSize: stageFont(w, 1.3), fontWeight: 700, letterSpacing: "-.02em", color: "var(--stage-ink)" }}>
                {letters.map((ch, i) => <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: tilt.includes(i) ? `rotate(${(hashNoise(i, 2) - 0.5) * 30}deg) translateY(3px)` : "none", transition: "transform .6s cubic-bezier(.34,1.56,.64,1)" }}>{ch}</span>)}
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.46, display: "flex", justifyContent: "center", gap: 14 }}>
                {[0, 1, 2, 3].map((i) => {
                    const hi = i === 3
                    const on = cur === i
                    return (
                        <div key={i} style={{ width: dot, height: dot, borderRadius: "50%", display: "grid", placeItems: "center", background: hi ? hsl(emo.calmHue, 70, dark ? 40 : 88, hi && on ? 1 : 0.6) : "var(--fill-2)", boxShadow: hi ? `0 0 ${on ? 30 : 12}px ${hsl(emo.calmHue, 90, 65, on ? 0.8 : 0.35)}` : "none", transform: on ? "scale(1.14)" : "scale(1)", transition: "transform .12s ease-out, box-shadow .2s" }}>
                            <span style={{ width: dot * 0.32, height: dot * 0.32, borderRadius: "50%", background: on ? (hi ? "#fff" : "var(--ink)") : "transparent", transition: "background-color .1s" }} />
                        </div>
                    )
                })}
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.46 + dot + 18, textAlign: "center", fontSize: 13, color: "var(--ink-2)", fontWeight: 550 }}>{Array.from({ length: NEED }, (_, i) => (i < misses ? "●" : "○")).join("  ")}</div>
            <AnimatePresence>
                {flash ? (
                    <motion.div key={flash.k} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={SPRING_SOFT}
                        onAnimationComplete={() => timers.after(1100, () => setFlash((f) => (f && f.k === flash.k ? null : f)))}
                        style={{ position: "absolute", left: 0, right: 0, top: h * 0.72, textAlign: "center", fontSize: stageFont(w, 1.05), fontWeight: 650, color: "var(--stage-ink)", pointerEvents: "none" }}>
                        {flash.text}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    )
}

/* ---------- 87 · KEEP / DROP — keep the useful piece, let the rest go ---------- */

function RitualKeepDrop(props: RitualProps) {
    const { items, w, h, fx, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const card = React.useRef<HTMLDivElement>(null)
    const cw = Math.min(w * 0.7, 300), ch = Math.min(h * 0.3, 190)
    const cy = h * 0.36
    const [i, setI] = React.useState(0)
    const [kept, setKept] = React.useState<Item[]>([])
    const st = React.useRef({ x: { x: 0, v: 0 }, drag: false, fly: 0 as 0 | 1 | -1, fy: 0 })
    const iRef = useLatest(i)
    const timers = useTimers()
    const dropLbl = React.useRef<HTMLSpanElement>(null), keepLbl = React.useRef<HTMLSpanElement>(null)

    const decide = (dir: 1 | -1) => {
        const s = st.current
        if (s.fly || iRef.current >= items.length) return
        s.fly = dir
        s.fy = 0
        fx.sound(dir > 0 ? "chime" : "whoosh", dir > 0 ? 1.2 : 0.7)
        fx.haptic(dir > 0 ? "light" : "medium")
    }
    useDrag(stage, stage, {
        onStart: (d) => { if (st.current.fly || iRef.current >= items.length || Math.abs(d.x - w / 2) > cw / 2 || Math.abs(d.y - cy) > ch / 2) return false; st.current.drag = true },
        onMove: (d) => { st.current.x.x = d.dx },
        onEnd: (d) => {
            st.current.drag = false
            if (st.current.x.x > w * 0.22 || d.vx > 800) decide(1)
            else if (st.current.x.x < -w * 0.22 || d.vx < -800) decide(-1)
        },
    })

    useFrame((dt) => {
        const s = st.current
        if (s.fly) {
            s.x.x += s.fly * 1500 * dt
            if (s.fly < 0) s.fy += 600 * dt
            if (Math.abs(s.x.x) > w) {
                const cur = items[iRef.current]
                if (s.fly > 0 && cur) setKept((k) => [...k, cur])
                if (s.fly < 0 && cur) fx.burst(s.x.x < 0 ? 30 : w - 30, cy, { kind: "dust", n: 14, size: 3, speed: 90, color: dark ? "rgba(255,255,255,.4)" : "rgba(80,70,60,.35)", life: 1.1 })
                s.fly = 0; s.x = { x: 0, v: 0 }; s.fy = 0
                const next = iRef.current + 1
                setI(next)
                props.progress(next / items.length)
                if (next >= items.length) timers.after(1500, () => { fx.haptic("success"); props.done() })
            }
        } else if (!s.drag) springTo(s.x, 0, dt, 280, 22)
        if (card.current) card.current.style.transform = `translate3d(${s.x.x}px, ${s.fy}px, 0) rotate(${s.x.x * 0.06}deg)`
        if (dropLbl.current) dropLbl.current.style.opacity = String(clamp(-s.x.x / 80, 0, 1))
        if (keepLbl.current) keepLbl.current.style.opacity = String(clamp(s.x.x / 80, 0, 1))
    })

    const cur = items[i]
    const trayY = h - 92
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#141418" : "#F5F2ED" }} />
            {cur ? (
                <div ref={card} key={cur.key} style={{ position: "absolute", left: (w - cw) / 2, top: cy - ch / 2, width: cw, height: ch, borderRadius: 22, background: "var(--surface)", boxShadow: "var(--shadow-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", padding: 18, cursor: "grab", touchAction: "none" }}>
                    <WordBody item={cur} size={stageFont(w, 1.15)} layout="col" imgSize={46} />
                    <span ref={dropLbl} style={{ position: "absolute", left: 14, top: 12, fontSize: 12, fontWeight: 700, color: "var(--danger)", opacity: 0 }}>DROP</span>
                    <span ref={keepLbl} style={{ position: "absolute", right: 14, top: 12, fontSize: 12, fontWeight: 700, color: "var(--good)", opacity: 0 }}>KEEP</span>
                </div>
            ) : null}
            {cur ? (
                <div style={{ position: "absolute", left: 0, right: 0, top: cy + ch / 2 + 18, display: "flex", justifyContent: "center", gap: 28 }}>
                    <button type="button" className="tsr-icon" style={{ width: 56, height: 56, background: "var(--surface)", boxShadow: "var(--shadow-1)" }} aria-label="Drop this piece" onClick={() => decide(-1)}><Icon name="x" size={24} /></button>
                    <button type="button" className="tsr-icon" style={{ width: 56, height: 56, background: "var(--surface)", boxShadow: "var(--shadow-1)", color: "var(--good)" }} aria-label="Keep this piece" onClick={() => decide(1)}><Icon name="check" size={24} /></button>
                </div>
            ) : null}
            <div style={{ position: "absolute", left: 16, right: 16, top: trayY, minHeight: 64, borderRadius: 20, background: dark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.7)", border: "1px solid var(--line)", padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "center" }}>
                {kept.length ? kept.map((k) => (
                    <motion.span key={k.key} layout initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING_SNAPPY} style={{ padding: "6px 11px", borderRadius: 999, background: hsl(emo.calmHue, 60, dark ? 30 : 90), color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>{k.text}</motion.span>
                )) : <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{i >= items.length ? "Nothing to carry." : "What you keep lands here"}</span>}
            </div>
        </div>
    )
}

/* ---------- 88 · TRADE MACHINE — spend the attention on something else ---------- */

function RitualTradeMachine(props: RitualProps) {
    const { items, w, h, fx, dark, emo, faces } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const coin = React.useRef<HTMLDivElement>(null)
    const mw = Math.min(w * 0.7, 280), mh = Math.min(h * 0.56, 320)
    const mx = (w - mw) / 2, my = 14
    const slot = { x: mx + mw / 2, y: my + 40 }
    const coinR = clamp(Math.min(w, h) * 0.12, 42, 56)
    const home = { x: w / 2, y: h - coinR - 22 }
    const [phase, setPhase] = React.useState<"insert" | "whirr" | "choose" | "prize">("insert")
    const [prize, setPrize] = React.useState<"time" | "space" | "laugh" | null>(null)
    const st = React.useRef({ x: { x: home.x, v: 0 }, y: { x: home.y, v: 0 }, drag: false, s: 1, spin: 0 })
    const phaseRef = useLatest(phase)
    const timers = useTimers()

    const insert = () => {
        setPhase("whirr")
        fx.sound("coin")
        fx.haptic("medium")
        props.progress(0.4)
        const loop = fx.loop("motor")
        timers.after(1100, () => { loop.stop(); setPhase("choose"); fx.sound("chime"); props.progress(0.6); props.hint("Choose what you'd like back") })
    }
    useDrag(coin, stage, {
        onStart: () => { if (phaseRef.current !== "insert") return false; st.current.drag = true; fx.haptic("light") },
        onMove: (d) => { st.current.x.x = d.x; st.current.y.x = d.y },
        onEnd: () => {
            const s = st.current
            s.drag = false
            if (dist(s.x.x, s.y.x, slot.x, slot.y) < 70) insert()
            else props.hint("Drop it into the slot at the top")
        },
    })
    useFrame((dt) => {
        const s = st.current
        if (phaseRef.current === "insert" && !s.drag) { springTo(s.x, home.x, dt, 200, 20); springTo(s.y, home.y, dt, 200, 20) }
        if (phaseRef.current !== "insert") { s.x.x += (slot.x - s.x.x) * Math.min(1, dt * 10); s.y.x += (slot.y - s.y.x) * Math.min(1, dt * 10); s.s = Math.max(0, s.s - dt * 3); s.spin += dt * 12 }
        if (coin.current) coin.current.style.transform = `translate3d(${s.x.x}px, ${s.y.x}px, 0) translate(-50%, -50%) scaleX(${s.s * Math.cos(s.spin)}) scaleY(${s.s})`
    })
    const choose = (p: "time" | "space" | "laugh") => {
        if (phaseRef.current !== "choose") return
        setPrize(p)
        setPhase("prize")
        props.hint(null)
        fx.sound("thud", 1.2)
        fx.haptic("success")
        props.progress(1)
        timers.after(2600, props.done)
    }

    const choices: { id: "time" | "space" | "laugh"; label: string }[] = [{ id: "time", label: "Time" }, { id: "space", label: "Space" }, { id: "laugh", label: "A laugh" }]
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#141419" : "#F4F1EC" }} />
            <div style={{ position: "absolute", left: mx, top: my, width: mw, height: mh, borderRadius: 26, background: dark ? "linear-gradient(180deg,#2A2B34,#1E1F26)" : "linear-gradient(180deg,#FFFFFF,#ECE8E1)", boxShadow: "var(--shadow-2), inset 0 0 0 1px var(--line)" }}>
                <div style={{ position: "absolute", left: mw / 2 - 34, top: 34, width: 68, height: 10, borderRadius: 6, background: "#141418", boxShadow: phase === "insert" ? `0 0 0 4px ${hsl(emo.calmHue, 70, 60, 0.3)}` : "none" }} />
                <div style={{ position: "absolute", left: 16, right: 16, top: 66, display: "flex", flexDirection: "column", gap: 8 }}>
                    {choices.map((c) => (
                        <button key={c.id} type="button" disabled={phase !== "choose"} onClick={() => choose(c.id)} className="tsr-btn small" style={{ background: phase === "choose" ? "var(--accent)" : "var(--fill-2)", color: phase === "choose" ? "var(--accent-ink)" : "var(--ink-2)", boxShadow: "none", opacity: 1, minHeight: 42 }}>
                            {c.label}
                        </button>
                    ))}
                </div>
                <div style={{ position: "absolute", left: 20, right: 20, bottom: 16, height: Math.max(70, mh - 66 - 3 * 50 - 30), borderRadius: 16, background: dark ? "#111216" : "#E3DED6", overflow: "hidden", display: "grid", placeItems: "center" }}>
                    <AnimatePresence>
                        {prize ? (
                            <motion.div key={prize} initial={{ y: -60, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 16 }} style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink)" }}>
                                {prize === "time" ? (
                                    <svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" /><line x1="22" y1="22" x2="22" y2="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: "22px 22px", animation: "tsrSpin 6s cubic-bezier(.1,.6,.3,1) 1 both" }} /></svg>
                                ) : prize === "space" ? (
                                    <span style={{ width: 44, height: 44, borderRadius: "50%", border: "2.5px solid currentColor", animation: "tsrBreathe 3s ease-in-out infinite" }} />
                                ) : (
                                    <span style={{ width: 46, height: 46, borderRadius: "50%", overflow: "hidden", display: "block" }}><img src={faces[2] || faces[3]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.16)" }} /></span>
                                )}
                                <b style={{ fontSize: 15, fontWeight: 650 }}>{prize === "time" ? "+ a slower minute" : prize === "space" ? "+ room to breathe" : "+ one small laugh"}</b>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
            <div ref={coin} className="rk-abs" role="img" aria-label="Your thought as a token. Drag it into the slot." style={{ width: coinR * 2, height: coinR * 2, borderRadius: "50%", display: "grid", placeItems: "center", padding: 8, textAlign: "center", cursor: "grab", touchAction: "none", background: `radial-gradient(circle at 35% 30%, #FFF3C8, #E9B949 60%, #C8902A)`, boxShadow: "0 8px 20px rgba(120,80,10,.35), inset 0 0 0 3px rgba(255,255,255,.35)", color: "#4A3008", fontWeight: 700, fontSize: clamp(coinR / 3.6, 11, 14), lineHeight: 1.1 }}>
                <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any }}>{items[0].text}</span>
            </div>
        </div>
    )
}

/* ---------- 97 · X-RAY — three sweeps reveal the parts; one press lets them burn away ---------- */

function RitualXRay(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const bar = React.useRef<HTMLDivElement>(null)
    const pad = 14
    const cw = w - pad * 2, chh = Math.min(h * 0.74, h - 90)
    const r = clamp(Math.min(cw / 3.4, chh / 3.4) / 2, 32, 56)
    const homes = React.useMemo(() => scatter(items.length, cw, chh, r + 4, 10, 10), [items.length, cw, chh, r])
    const [passes, setPasses] = React.useState(0)
    const [burning, setBurning] = React.useState(false)
    const [gone, setGone] = React.useState(false)
    const st = React.useRef({ x: 0, dir: 1 as 1 | -1, reachedFar: false, passes: 0 })
    const els = React.useRef<(HTMLDivElement | null)[]>([])
    const timers = useTimers()

    useDrag(stage, stage, {
        onStart: () => { if (st.current.passes >= 3) return false; fx.haptic("light") },
        onMove: (d) => {
            const s = st.current
            s.x = clamp(d.x - pad, 0, cw)
            const edge = s.dir > 0 ? s.x > cw * 0.88 : s.x < cw * 0.12
            if (edge) {
                s.passes += 1
                s.dir = (s.dir * -1) as 1 | -1
                setPasses(s.passes)
                fx.sound("chime", 0.9 + s.passes * 0.15)
                fx.haptic("medium")
                props.progress(s.passes / 3 * 0.75)
                if (s.passes >= 3) props.hint("Press Burn all when you're ready", true)
            }
        },
    })
    useFrame(() => {
        const s = st.current
        if (bar.current) bar.current.style.transform = `translateX(${s.x}px)`
        const base = Math.max(0, 9 * (1 - s.passes / 3))
        els.current.forEach((el, i) => {
            if (!el) return
            const under = Math.abs(homes[i].x - s.x) < r * 1.2 && s.passes < 3
            el.style.filter = reduced ? "" : `blur(${under ? base * 0.15 : base}px)`
            el.style.opacity = String(under ? 1 : 0.45 + (s.passes / 3) * 0.55)
        })
    })
    const burnAll = () => {
        if (burning) return
        setBurning(true)
        fx.sound("whoosh", 1.2)
        fx.haptic("heavy")
        homes.forEach((p, i) => timers.after(i * 90, () => {
            fx.burst(pad + p.x, 10 + p.y, { kind: "ember", n: 10, size: 2.6, speed: 90, angle: -Math.PI / 2, spread: 2, color: warmEmbers, life: 1.8, gravity: -40 })
            fx.burst(pad + p.x, 10 + p.y, { kind: "glow", n: 1, size: r * 0.5, color: "rgba(255,190,120,.6)", life: 0.7 })
        }))
        timers.after(500, () => setGone(true))
        props.progress(1)
        timers.after(1700, props.done)
    }

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0, cursor: passes < 3 ? "ew-resize" : "default" }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#0E1218" : "#E9EEF2" }} />
            <div style={{ position: "absolute", left: pad, top: 10, width: cw, height: chh, borderRadius: 22, overflow: "hidden", background: dark ? "#0A1420" : "#0F2333", boxShadow: "inset 0 0 0 1px rgba(120,200,255,.25)" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(120,200,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,200,255,.08) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                {items.map((it, i) => (
                    <div key={it.key} ref={(el) => { els.current[i] = el }} style={{ position: "absolute", left: homes[i].x - r, top: homes[i].y - r, width: r * 2, height: r * 2, borderRadius: "50%", display: "grid", placeItems: "center", padding: 6, background: "radial-gradient(circle at 40% 35%, rgba(180,230,255,.3), rgba(80,160,220,.12))", boxShadow: "inset 0 0 0 1px rgba(160,220,255,.4)", color: "#DFF3FF", transform: gone ? "scale(1.25)" : "scale(1)", opacity: gone ? 0 : undefined, transition: "transform .6s ease-out, opacity .6s ease-out" }}>
                        <WordBody item={it} size={clamp(r / 3.5, 12, 15)} layout="col" imgSize={Math.round(r * 0.55)} style={{ color: "#E6F6FF", maxWidth: r * 1.7 }} />
                    </div>
                ))}
                {passes < 3 ? (
                    <div ref={bar} style={{ position: "absolute", left: -18, top: 0, bottom: 0, width: 36, pointerEvents: "none" }}>
                        <div style={{ position: "absolute", left: 17, top: 0, bottom: 0, width: 2, background: "rgba(150,230,255,.95)", boxShadow: "0 0 18px 6px rgba(120,210,255,.45)" }} />
                    </div>
                ) : null}
                <div style={{ position: "absolute", right: 10, top: 10, display: "flex", gap: 5 }}>
                    {[0, 1, 2].map((k) => <i key={k} style={{ width: 8, height: 8, borderRadius: "50%", background: k < passes ? "#8FE3FF" : "rgba(140,200,255,.25)" }} />)}
                </div>
            </div>
            {passes >= 3 && !burning ? (
                <motion.button type="button" className="rk-btn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT} onClick={burnAll} style={{ left: "50%", marginLeft: -70, width: 140, top: 10 + chh + 14 }}>
                    Burn all
                </motion.button>
            ) : null}
        </div>
    )
}

/* ---------- 100 · HOT POTATO — what you stop clutching cools down fast ---------- */

function RitualHotPotato(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const cx = w / 2, cy = h * 0.5
    const size = clamp(Math.min(w, h) * 0.23, 80, 120)
    const outR = Math.min(w, h) * 0.32
    const homes = items.map((_, i) => {
        const a = (i / items.length) * Math.PI * 2 - Math.PI / 2 + 0.4
        return { x: cx + Math.cos(a) * size * 0.82, y: cy + Math.sin(a) * size * 0.72 }
    })
    const pos = React.useRef(items.map((_, i) => ({ x: { x: homes[i].x, v: 0 }, y: { x: homes[i].y, v: 0 }, drag: false, cool: false, rest: null as null | { x: number; y: number } })))
    const els = React.useRef<(HTMLDivElement | null)[]>([])
    const [cooled, setCooled] = React.useState<boolean[]>(() => items.map(() => false))
    const active = React.useRef<number | null>(null)
    const st = React.useRef({ lastSteam: 0, loop: null as Loop | null, n: 0, done: false })
    const timers = useTimers()
    const shapes = React.useMemo(() => items.map((_, i) => `${40 + hashNoise(i, 1) * 20}% ${60 - hashNoise(i, 2) * 20}% ${45 + hashNoise(i, 3) * 15}% ${55 - hashNoise(i, 4) * 15}% / ${55 + hashNoise(i, 5) * 10}% ${50 + hashNoise(i, 6) * 10}% ${45 + hashNoise(i, 7) * 10}% ${50 - hashNoise(i, 8) * 10}%`), [items.length])

    useDrag(stage, stage, {
        onStart: (d) => {
            let hit: number | null = null
            pos.current.forEach((p, i) => { if (!p.cool && dist(d.x, d.y, p.x.x, p.y.x) < size * 0.55) hit = i })
            if (hit == null) return false
            active.current = hit
            pos.current[hit].drag = true
            st.current.loop = fx.loop("fire")
            fx.haptic("buzz")
        },
        onMove: (d) => {
            const i = active.current
            if (i == null) return
            const p = pos.current[i]
            p.x.x = clamp(d.x, size / 2, w - size / 2); p.y.x = clamp(d.y, size / 2, h - size / 2)
            if (Math.random() < 0.08) fx.haptic("tick")
        },
        onEnd: () => {
            const i = active.current
            active.current = null
            st.current.loop?.stop(); st.current.loop = null
            if (i == null) return
            const p = pos.current[i]
            p.drag = false
            if (dist(p.x.x, p.y.x, cx, cy) > outR) {
                p.cool = true
                p.rest = { x: p.x.x, y: p.y.x }
                setCooled((c) => c.map((v, j) => (j === i ? true : v)))
                st.current.n += 1
                fx.sound("ice", 0.8)
                fx.haptic("medium")
                fx.burst(p.x.x, p.y.x, { kind: "spark", n: 12, size: 2, speed: 120, color: ["#BFE4FF", "#FFFFFF"], life: 0.7 })
                props.progress(st.current.n / items.length)
                if (st.current.n >= items.length && !st.current.done) { st.current.done = true; timers.after(1100, () => { fx.haptic("success"); props.done() }) }
            } else { fx.sound("boing", 0.5); props.hint("Further — drag it right away from you") }
        },
    })

    useFrame((dt, t) => {
        const s = st.current
        pos.current.forEach((p, i) => {
            if (!p.drag) {
                const target = p.rest || homes[i]
                springTo(p.x, target.x, dt, 200, 18); springTo(p.y, target.y, dt, 200, 18)
            }
            const el = els.current[i]
            const jig = p.cool || reduced ? 0 : (p.drag ? 3 : 1.2)
            if (el) el.style.transform = `translate3d(${p.x.x + Math.sin(t * 40 + i) * jig}px, ${p.y.x + Math.cos(t * 37 + i) * jig}px, 0) translate(-50%, -50%)`
            if (!p.cool && !reduced && Math.random() < (p.drag ? 0.5 : 0.08)) fx.burst(p.x.x + rand(-size * 0.3, size * 0.3), p.y.x - size * 0.3, { kind: "ember", n: 1, size: 1.8, speed: 40, angle: -Math.PI / 2, spread: 1, color: warmEmbers, life: 1.2, gravity: -30 })
            if (!p.cool && !reduced && t - s.lastSteam > 0.18) {
                s.lastSteam = t
                fx.burst(p.x.x + rand(-size * 0.2, size * 0.2), p.y.x - size * 0.4, { kind: "steam", n: 1, size: 7, speed: 30, angle: -Math.PI / 2, spread: 0.6, color: dark ? "rgba(255,255,255,.5)" : "rgba(120,110,100,.45)", life: 1.4, gravity: -20 })
            }
        })
    })

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#151418" : "#F6F2EC" }} />
            <div style={{ position: "absolute", left: cx - outR, top: cy - outR, width: outR * 2, height: outR * 2, borderRadius: "50%", border: `1.5px dashed ${dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.1)"}`, pointerEvents: "none" }} />
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { els.current[i] = el }} className="rk-abs" style={{ width: size, height: size * 0.86, borderRadius: shapes[i], cursor: cooled[i] ? "default" : "grab", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 10, textAlign: "center",
                    background: cooled[i] ? "radial-gradient(circle at 40% 35%, #DDF1FF, #7FB8E6 70%, #5E95C8)" : "radial-gradient(circle at 40% 35%, #FFE0B0, #F0743C 62%, #C9432A)",
                    boxShadow: cooled[i] ? "0 8px 18px rgba(60,110,170,.3)" : "0 8px 24px rgba(220,80,40,.45), 0 0 30px rgba(255,120,60,.35)",
                    transition: "background .7s ease, box-shadow .7s ease", color: cooled[i] ? "#0E2A44" : "#3A1404" }}>
                    {it.img ? <span style={{ width: size * 0.34, height: size * 0.34, borderRadius: "50%", overflow: "hidden", flex: "0 0 auto" }}><img src={it.img} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", transform: it.img.includes("bubble-expressions") ? "scale(1.16)" : undefined }} /></span> : null}
                    <span style={{ fontWeight: 700, fontSize: clamp(size / 8, 12, 15), lineHeight: 1.1, overflowWrap: "anywhere" }}>{it.text}</span>
                </div>
            ))}
        </div>
    )
}

/* ---------- 101 · TUG OF WAR — pull until it strains, then simply let go ---------- */

function RitualTugOfWar(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const rope = React.useRef<SVGPathElement>(null)
    const knot = React.useRef<HTMLDivElement>(null)
    const handle = React.useRef<HTMLDivElement>(null)
    const y0 = h * 0.46
    const [round, setRound] = React.useState(0)
    const st = React.useRef({ pull: 0, tension: 0, drag: false, key: false, slack: 0, slackV: 0, letting: false, loop: null as Loop | null, rounds: 0, done: false, lastTick: 0 })
    const timers = useTimers()
    const maxPull = Math.min(w * 0.42, 220)

    const release = () => {
        const s = st.current
        s.loop?.stop(); s.loop = null
        if (s.tension >= 0.85 && !s.letting) {
            s.letting = true
            s.slack = 0
            fx.sound("thud", 0.7)
            fx.sound("whoosh", 0.6)
            fx.haptic("heavy")
            timers.after(1300, () => {
                s.rounds += 1
                props.progress(s.rounds / items.length)
                if (s.rounds >= items.length) { s.done = true; fx.haptic("success"); props.done(); return }
                s.letting = false; s.pull = 0; s.tension = 0; s.slack = 0
                setRound(s.rounds)
            })
        } else if (s.tension > 0.1) props.hint("Pull until the rope strains, then let go")
    }
    useDrag(stage, stage, {
        onStart: (d) => { if (st.current.letting || st.current.done || d.x > w * 0.6) return false; st.current.drag = true; st.current.loop = fx.loop("hum"); fx.haptic("light") },
        onMove: (d) => {
            const s = st.current
            s.pull = clamp(-d.dx, 0, maxPull * 1.6)
            s.tension = clamp(s.pull / maxPull, 0, 1)
            s.loop?.set(120 + s.tension * 200, 0.5 + s.tension)
            const step = Math.floor(s.tension * 6)
            if (step > s.lastTick) { fx.haptic(s.tension > 0.8 ? "medium" : "tick") }
            s.lastTick = step
            if (s.tension >= 0.85) props.hint("Now let go")
        },
        onEnd: () => { st.current.drag = false; st.current.lastTick = 0; release() },
    })
    const keys = useHold(() => { const s = st.current; if (s.letting || s.done) return; s.key = true; s.drag = true; s.loop = fx.loop("hum") }, () => { const s = st.current; if (!s.key) return; s.key = false; s.drag = false; release() })

    useFrame((dt, t) => {
        const s = st.current
        if (s.key && !s.letting) {
            s.pull = Math.min(maxPull * 1.05, s.pull + dt * maxPull * 0.7)
            s.tension = clamp(s.pull / maxPull, 0, 1)
            s.loop?.set(120 + s.tension * 200, 0.5 + s.tension)
        }
        if (!s.drag && !s.letting) { s.pull *= Math.pow(0.002, dt); s.tension = clamp(s.pull / maxPull, 0, 1) }
        const hx = w * 0.14 - s.pull * 0.32
        const kx = w * 0.58 - s.pull * 0.28
        let d = ""
        if (!s.letting) {
            const amp = reduced ? 0 : s.tension * s.tension * 6
            const pts: string[] = []
            for (let k = 0; k <= 30; k++) {
                const u = k / 30
                const x = lerp(hx, w + 20, u)
                const yy = y0 + Math.sin(u * Math.PI * 9 + t * 45) * amp * Math.sin(u * Math.PI) + (1 - s.tension) * 10 * Math.sin(u * Math.PI)
                pts.push(`${x.toFixed(1)} ${yy.toFixed(1)}`)
            }
            d = "M " + pts.join(" L ")
        } else {
            s.slackV += 900 * dt
            s.slack = Math.min(h, s.slack + s.slackV * dt)
            d = `M ${hx} ${y0} Q ${(hx + w) / 2} ${y0 + 120 + s.slack} ${w + 20} ${y0 + s.slack * 0.6}`
        }
        if (!s.letting) s.slackV = 0
        if (rope.current) {
            rope.current.setAttribute("d", d)
            rope.current.setAttribute("stroke", s.letting ? (dark ? "#5A5D69" : "#B9B4AA") : mixHsl(38, emo.hue, s.tension, 40 + s.tension * 40, dark ? 55 + s.tension * 15 : 50))
            rope.current.setAttribute("stroke-width", String(7 - s.tension * 2))
        }
        if (knot.current) knot.current.style.transform = `translate3d(${kx}px, ${y0 + (s.letting ? s.slack * 0.8 : 0)}px, 0) translate(-50%, -50%) rotate(${s.letting ? s.slack * 0.1 : 0}deg)`
        if (knot.current) knot.current.style.opacity = s.letting ? String(clamp(1 - s.slack / (h * 0.5), 0, 1)) : "1"
        if (handle.current) handle.current.style.transform = `translate3d(${hx}px, ${y0}px, 0) translate(-50%, -50%) scale(${s.drag ? 1.08 : 1})`
    })

    const it = items[Math.min(round, items.length - 1)]
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0, cursor: "grab" }} onKeyDown={keys.onKeyDown} onKeyUp={keys.onKeyUp} tabIndex={0} role="application" aria-label="Pull the rope to the left until it strains, then let go. Space also pulls.">
            <div style={{ position: "absolute", inset: 0, background: dark ? "#141418" : "#F5F2EC" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: y0 + 60, bottom: 0, background: dark ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.025)" }} />
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><path ref={rope} fill="none" strokeLinecap="round" /></svg>
            <div ref={handle} className="rk-abs" style={{ width: 46, height: 64, borderRadius: 16, background: dark ? "#2C2D35" : "#FFFFFF", boxShadow: "var(--shadow-2), inset 0 0 0 1px var(--line)", display: "grid", placeItems: "center", pointerEvents: "none" }}>
                <Icon name="hand" size={22} />
            </div>
            <div ref={knot} key={it.key} className="rk-abs" style={{ padding: "10px 16px", borderRadius: 16, background: "var(--surface)", boxShadow: "var(--shadow-2)", maxWidth: Math.min(220, w * 0.5), pointerEvents: "none" }}>
                <WordBody item={it} size={stageFont(w, 0.95)} imgSize={30} />
            </div>
            <div style={{ position: "absolute", right: 14, top: 12, fontSize: 13, color: "var(--ink-2)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{Math.min(round + 1, items.length)} of {items.length}</div>
        </div>
    )
}

/* ---------- 102 · FINGER TRAP — it loosens when you stop pulling ---------- */

function RitualFingerTrap(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const n = items.length
    const tw = Math.min(w - 36, 420)
    const rowH = Math.min(96, (h - 30) / n)
    const top0 = (h - rowH * n) / 2
    const [state, setState] = React.useState(() => items.map(() => ({ loose: 0, tight: 0, free: false })))
    const drag = React.useRef<{ row: number; side: -1 | 1; lastX: number } | null>(null)
    const stRef = useLatest(state)
    const doneRef = React.useRef(false)
    const timers = useTimers()

    const update = (row: number, delta: number) => {
        setState((prev) => prev.map((s, i) => {
            if (i !== row || s.free) return s
            const loose = clamp(s.loose + Math.max(0, delta), 0, 1)
            const tight = clamp(s.tight + Math.max(0, -delta) - Math.max(0, delta) * 0.5, 0, 1)
            const free = loose >= 1
            if (free) {
                fx.sound("chime", 1 + i * 0.12)
                fx.haptic("success")
                fx.burst(w / 2, top0 + rowH * (i + 0.5), { kind: "glow", n: 1, size: 30, color: hsl(emo.calmHue, 80, 75, 0.7), life: 0.8 })
                if (!reduced) fx.burst(w / 2, top0 + rowH * (i + 0.5), { kind: "spark", n: 16, size: 2, speed: 160, color: [hsl(emo.calmHue, 80, 75), "#FFFFFF"], life: 0.7 })
            }
            return { loose, tight, free }
        }))
    }
    React.useEffect(() => {
        const freed = state.filter((s) => s.free).length
        props.progress(state.reduce((a, s) => a + (s.free ? 1 : s.loose * 0.8), 0) / n)
        if (freed === n && !doneRef.current) { doneRef.current = true; timers.after(900, props.done) }
    }, [state])

    useDrag(stage, stage, {
        onStart: (d) => {
            const row = Math.floor((d.y - top0) / rowH)
            if (row < 0 || row >= n || stRef.current[row].free) return false
            const side = d.x < w / 2 ? -1 : 1
            drag.current = { row, side, lastX: d.x }
            fx.haptic("light")
        },
        onMove: (d) => {
            const g = drag.current
            if (!g) return
            const dx = d.x - g.lastX
            g.lastX = d.x
            const inward = g.side < 0 ? dx : -dx
            const k = inward / (tw * 0.28)
            update(g.row, k)
            if (k < -0.01) { fx.sound("tick", 0.5); if (Math.random() < 0.3) fx.haptic("tick"); props.hint("It tightens when you pull. Push inward.") }
        },
        onEnd: () => { drag.current = null },
    })

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#141418" : "#F5F2EC" }} />
            {items.map((it, i) => {
                const s = state[i]
                const bulge = 1 + s.loose * 0.35 - s.tight * 0.28
                const angle = 62 - s.loose * 26 + s.tight * 14
                const th = (rowH - 22) * 0.62 * bulge
                const weave = mixHsl(emo.hue, emo.calmHue, s.loose, 45, dark ? 52 : 62, 0.9)
                return (
                    <div key={it.key} style={{ position: "absolute", left: (w - tw) / 2, width: tw, top: top0 + rowH * i, height: rowH, display: "grid", placeItems: "center" }}>
                        <div style={{ position: "relative", width: s.free ? tw * 1.08 : tw, height: th, borderRadius: th / 2, opacity: s.free ? 0 : 1, transition: "height .25s cubic-bezier(.34,1.56,.64,1), width .5s, opacity .5s ease .2s",
                            backgroundImage: `repeating-linear-gradient(${angle}deg, ${weave} 0 6px, transparent 6px 12px), repeating-linear-gradient(${-angle}deg, ${weave} 0 6px, transparent 6px 12px)`,
                            backgroundColor: dark ? "#25262E" : "#FBF7F1", boxShadow: `inset 0 0 0 1px var(--line), 0 6px 16px rgba(0,0,0,${dark ? 0.35 : 0.08})` }}>
                            <span style={{ position: "absolute", left: -2, top: -4, bottom: -4, width: 22, borderRadius: 10, background: dark ? "#3A3C46" : "#D9D4CB" }} />
                            <span style={{ position: "absolute", right: -2, top: -4, bottom: -4, width: 22, borderRadius: 10, background: dark ? "#3A3C46" : "#D9D4CB" }} />
                        </div>
                        <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) ${s.free ? "translateY(-10px) scale(1.06)" : ""}`, padding: "6px 14px", borderRadius: 999, background: s.free ? hsl(emo.calmHue, 70, dark ? 30 : 92) : "var(--surface)", boxShadow: "var(--shadow-1)", maxWidth: tw * 0.6, transition: "transform .6s cubic-bezier(.34,1.56,.64,1), background-color .5s", pointerEvents: "none" }}>
                            <WordBody item={it} size={clamp(rowH / 5.2, 13, 16)} imgSize={24} style={{ whiteSpace: "nowrap" }} />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

/* ---------- 105 · DRAMA MACHINE — overproduce it on purpose, then cut ---------- */

function RitualDramaMachine(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const [on, setOn] = React.useState({ fog: false, siren: false, violin: false, confetti: false })
    const [cut, setCut] = React.useState(false)
    const count = Object.values(on).filter(Boolean).length
    const st = React.useRef({ lastConfetti: 0, lastNote: 0, note: 0, siren: 0 })
    const sirenEl = React.useRef<HTMLDivElement>(null)
    const timers = useTimers()
    const tones = [392, 370, 349, 330, 311]

    const toggle = (k: keyof typeof on) => {
        if (cut) return
        const next = { ...on, [k]: !on[k] }
        setOn(next)
        const n = Object.values(next).filter(Boolean).length
        props.progress(n / 5)
        fx.haptic("light")
        fx.sound(next[k] ? "pluck" : "tick", 0.8 + n * 0.15)
        if (n === 4) props.hint("Maximum drama. Now hit Cut.")
    }
    const doCut = () => {
        setCut(true)
        props.hint(null)
        fx.sound("snap")
        fx.haptic("heavy")
        props.progress(1)
        timers.after(1600, props.done)
    }
    useFrame((dt, t) => {
        const s = st.current
        if (cut) return
        if (on.siren && sirenEl.current) { s.siren += dt * 2.4; sirenEl.current.style.transform = `rotate(${s.siren}rad)` }
        if (on.confetti && !reduced && t - s.lastConfetti > 0.12) { s.lastConfetti = t; fx.burst(rand(0, w), -10, { kind: "petal", n: 2, size: 4, speed: 40, angle: Math.PI / 2, spread: 0.8, color: ["#FFB4C6", "#B8D8FF", "#FFE29A", "#C9F2D8"], life: 3.2, gravity: 50 }) }
        if (on.violin && t - s.lastNote > 0.55) { s.lastNote = t; fx.sound("kazoo", tones[s.note % tones.length] / 330); s.note += 1 }
    })

    const drama = cut ? 0 : count / 4
    const keys: { k: keyof typeof on; label: string }[] = [{ k: "fog", label: "Fog" }, { k: "siren", label: "Siren" }, { k: "violin", label: "Tiny violin" }, { k: "confetti", label: "Confetti" }]
    const ctrlTop = h - 132
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#111015" : "#EFEAE3", transition: "background-color .2s" }} />
            {!cut && on.siren ? <div ref={sirenEl} style={{ position: "absolute", left: "50%", top: "40%", width: Math.max(w, h) * 1.6, height: Math.max(w, h) * 1.6, marginLeft: -Math.max(w, h) * 0.8, marginTop: -Math.max(w, h) * 0.8, background: "conic-gradient(from 0deg, rgba(255,70,90,.22), transparent 25%, rgba(70,120,255,.22) 50%, transparent 75%, rgba(255,70,90,.22))", pointerEvents: "none" }} /> : null}
            {!cut && on.fog ? (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h * 0.55, pointerEvents: "none", overflow: "hidden" }}>
                    {[0, 1, 2, 3].map((i) => <span key={i} style={{ position: "absolute", bottom: -40, left: `${-20 + i * 30}%`, width: "60%", height: 160, borderRadius: "50%", background: dark ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.75)", filter: "blur(24px)", animation: reduced ? undefined : `tsrFloat ${5 + i}s ease-in-out infinite` }} />)}
                </div>
            ) : null}
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: ctrlTop - 10, display: "grid", placeItems: "center", padding: "0 18px" }}>
                <div style={{ position: "absolute", left: "50%", top: "50%", width: Math.min(w * 0.9, 380), height: Math.min(w * 0.9, 380) * 0.7, transform: "translate(-50%,-50%)", borderRadius: "50%", background: cut ? `radial-gradient(closest-side, ${dark ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.95)"}, transparent)` : "transparent", pointerEvents: "none" }} />
                <div style={{ position: "relative", textAlign: "center", color: "var(--stage-ink)", fontFamily: cut ? "var(--font)" : "var(--serif)", fontWeight: cut ? 500 : 700, fontStyle: cut ? "normal" : "italic",
                    fontSize: stageFont(w, cut ? 0.95 : 1.1 + drama * 0.9), letterSpacing: cut ? "-.01em" : `${drama * 0.08}em`, transform: cut ? "none" : `rotate(${drama * -3}deg) scale(${1 + drama * 0.05})`,
                    textShadow: cut ? "none" : `0 ${drama * 6}px ${drama * 20}px rgba(0,0,0,.25)`, transition: cut ? "none" : "all .5s cubic-bezier(.34,1.56,.64,1)", maxWidth: "100%", overflowWrap: "anywhere" }}>
                    {items[0].text}
                </div>
                {!cut && on.violin ? <div style={{ position: "absolute", left: "50%", top: "50%", marginLeft: Math.min(130, w * 0.3), marginTop: -70, animation: reduced ? undefined : "tsrFloat 1.6s ease-in-out infinite" }} aria-hidden="true"><svg width="34" height="48" viewBox="0 0 34 48"><path d="M17 4v14" stroke="#6B4423" strokeWidth="3" strokeLinecap="round" /><path d="M17 16c-7 0-10 5-8 10-4 3-3 12 8 14 11-2 12-11 8-14 2-5-1-10-8-10z" fill="#B8692E" /><path d="M14 28h6M14 33h6" stroke="#3A2210" strokeWidth="1.6" strokeLinecap="round" /><path d="M3 44 31 10" stroke="#D9C7A3" strokeWidth="1.6" /></svg></div> : null}
            </div>
            <div style={{ position: "absolute", left: 14, right: 14, top: ctrlTop, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {keys.map(({ k, label }) => (
                    <button key={k} type="button" onClick={() => toggle(k)} disabled={cut} aria-pressed={on[k]} className="tsr-chip" style={{ justifyContent: "space-between", paddingLeft: 14, paddingRight: 8, height: 46, background: on[k] && !cut ? "var(--ink)" : "var(--surface)", color: on[k] && !cut ? "var(--bg)" : "var(--ink)" }}>
                        <span>{label}</span>
                        <span style={{ width: 30, height: 18, borderRadius: 99, background: on[k] && !cut ? "var(--good)" : "var(--fill-3)", position: "relative", transition: "background-color .2s" }}><i style={{ position: "absolute", top: 2, left: on[k] && !cut ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .25s cubic-bezier(.34,1.56,.64,1)" }} /></span>
                    </button>
                ))}
            </div>
            <AnimatePresence>
                {count === 4 && !cut ? (
                    <motion.button key="cut" type="button" className="rk-btn" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}
                        onClick={doCut} style={{ left: "50%", marginLeft: -60, width: 120, top: ctrlTop - 64, background: "#D9443A", color: "#fff" }}>
                        Cut
                    </motion.button>
                ) : null}
            </AnimatePresence>
        </div>
    )
}

/* ---------- 106 · TINY SOUNDTRACK — give the annoyance a miniature score ---------- */

function RitualTinySoundtrack(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const [tone, setTone] = React.useState<"silly" | "clean" | null>(null)
    const [left, setLeft] = React.useState(items.length)
    const [bop, setBop] = React.useState(0)
    const timers = useTimers()
    const pads = tone === "silly"
        ? [{ l: "Kazoo", s: "kazoo" as SoundName, p: 1 }, { l: "Boing", s: "boing" as SoundName, p: 1 }, { l: "Squeak", s: "drip" as SoundName, p: 1.6 }, { l: "Tiny drum", s: "thud" as SoundName, p: 1.8 }]
        : [{ l: "Bell", s: "bell" as SoundName, p: 1 }, { l: "Chime", s: "chime" as SoundName, p: 0.9 }, { l: "Pluck", s: "pluck" as SoundName, p: 1.2 }, { l: "Glass", s: "ice" as SoundName, p: 0.8 }]
    const bw = Math.min(110, (w - 40) / items.length - 6)
    const stageY = h * 0.32

    const play = (k: number) => {
        if (!tone || left <= 0) return
        const pad = pads[k]
        fx.sound(pad.s, pad.p)
        fx.haptic("light")
        setBop((b) => b + 1)
        const idx = items.length - left
        const x = w / 2 + (idx - (items.length - 1) / 2) * (bw + 6)
        if (!reduced) fx.burst(x, stageY, { kind: tone === "silly" ? "petal" : "glow", n: tone === "silly" ? 10 : 3, size: tone === "silly" ? 4 : 6, speed: 90, angle: -Math.PI / 2, spread: 1.4, color: [hsl(emo.calmHue, 70, 72), hsl(emo.hue, 70, 75), "#FFFFFF"], life: 1.4, gravity: tone === "silly" ? 120 : -10 })
        const n = left - 1
        setLeft(n)
        props.progress(1 - n / items.length)
        if (n === 0) timers.after(450, () => {
            if (tone === "silly") { fx.sound("boing", 1.4); timers.after(160, () => fx.sound("pop", 1.6)) } else fx.sound("complete")
            fx.haptic("success")
            timers.after(1400, props.done)
        })
    }

    if (!tone) {
        return (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 20 }}>
                <div style={{ position: "absolute", inset: 0, background: dark ? "#141318" : "#F5F1EB" }} />
                <div style={{ position: "relative", textAlign: "center", maxWidth: 340 }}>
                    <p className="t-head" style={{ marginBottom: 6 }}>Pick the tone first</p>
                    <p className="t-sub" style={{ marginBottom: 18 }}>A silly little orchestra, or a clean ambient one.</p>
                    <div className="tsr-row">
                        <button type="button" className="tsr-btn ghost" onClick={() => { setTone("silly"); fx.sound("boing"); fx.haptic("light"); props.progress(0.05) }}>Silly</button>
                        <button type="button" className="tsr-btn ghost" onClick={() => { setTone("clean"); fx.sound("bell"); fx.haptic("light"); props.progress(0.05) }}>Clean</button>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#141318" : "#F5F1EB" }} />
            <div style={{ position: "absolute", left: "50%", top: stageY + 30, width: Math.min(w * 0.9, 460), height: 18, marginLeft: -Math.min(w * 0.9, 460) / 2, borderRadius: 9, background: dark ? "#2C2A33" : "#DCD3C6" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: stageY - 34, display: "flex", justifyContent: "center", gap: 6 }}>
                {items.map((it, i) => {
                    const gone = i < items.length - left
                    return (
                        <div key={it.key} style={{ width: bw, minHeight: 60, borderRadius: 16, padding: "8px 8px", background: "var(--surface)", boxShadow: "var(--shadow-1)", display: "grid", placeItems: "center", textAlign: "center", transform: gone ? "translateY(-30px) scale(.6)" : `translateY(${bop % 2 && !reduced ? -3 : 0}px)`, opacity: gone ? 0 : 1, transition: "transform .5s cubic-bezier(.34,1.56,.64,1), opacity .5s" }}>
                            <WordBody item={{ ...it, img: null }} size={clamp(bw / 7.5, 11, 14)} />
                        </div>
                    )
                })}
            </div>
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {pads.map((p, k) => (
                    <button key={p.l} type="button" onPointerDown={(e) => { e.preventDefault(); play(k) }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(k) } }} disabled={left <= 0}
                        style={{ height: Math.min(76, h * 0.13), borderRadius: 20, border: 0, cursor: "pointer", font: "inherit", fontWeight: 650, fontSize: 15, color: "var(--ink)", background: `linear-gradient(160deg, ${hsl(emo.calmHue + k * 30, 60, dark ? 28 : 90)}, ${hsl(emo.calmHue + k * 30, 50, dark ? 22 : 82)})`, boxShadow: "var(--shadow-1)", touchAction: "manipulation" }}>
                        {p.l}
                    </button>
                ))}
            </div>
        </div>
    )
}

/* ---------- 107 · GO WEIRD — only if you want: a serious thought in a silly costume ---------- */

const PROPS_SVG: Record<string, (s: number) => React.ReactNode> = {
    eyes: (s) => <svg width={s} height={s * 0.5} viewBox="0 0 60 30"><circle cx="15" cy="15" r="13" fill="#fff" stroke="#222" strokeWidth="2" /><circle cx="45" cy="15" r="13" fill="#fff" stroke="#222" strokeWidth="2" /><circle cx="19" cy="18" r="6" fill="#222" /><circle cx="41" cy="12" r="6" fill="#222" /></svg>,
    hat: (s) => <svg width={s} height={s} viewBox="0 0 40 40"><path d="M20 3 L34 34 H6 Z" fill="#7C6CF0" /><circle cx="20" cy="4" r="4" fill="#FFD25E" /><path d="M11 22 l6 2 M22 14 l5 3 M14 30 l8 0" stroke="#FFD25E" strokeWidth="2" strokeLinecap="round" /></svg>,
    stache: (s) => <svg width={s} height={s * 0.4} viewBox="0 0 60 24"><path d="M30 8 C22 0 8 2 2 14 C10 10 18 18 30 12 C42 18 50 10 58 14 C52 2 38 0 30 8 Z" fill="#3A2A20" /></svg>,
    bow: (s) => <svg width={s} height={s * 0.6} viewBox="0 0 50 30"><path d="M25 15 L4 3 V27 Z M25 15 L46 3 V27 Z" fill="#E2574C" /><rect x="20" y="10" width="10" height="10" rx="3" fill="#B53A30" /></svg>,
    shoes: (s) => <svg width={s} height={s * 0.4} viewBox="0 0 70 26"><path d="M4 18 C4 8 14 8 18 12 L30 14 C33 15 33 22 28 22 H6 C4 22 4 20 4 18Z" fill="#2F7DE1" /><path d="M40 18 C40 8 50 8 54 12 L66 14 C69 15 69 22 64 22 H42 C40 22 40 20 40 18Z" fill="#2F7DE1" /></svg>,
}

function RitualGoWeird(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const [mode, setMode] = React.useState<"ask" | "weird" | "gentle">("ask")
    const [placed, setPlaced] = React.useState<Record<string, boolean>>({})
    const [setDown, setSetDown] = React.useState(false)
    const ow = Math.min(w * 0.62, 260), oh = ow * 0.72
    const ocx = w / 2, ocy = h * 0.4
    const anchors: Record<string, { x: number; y: number; s: number }> = {
        hat: { x: ocx + ow * 0.18, y: ocy - oh * 0.62, s: 50 }, eyes: { x: ocx, y: ocy - oh * 0.22, s: 70 }, stache: { x: ocx, y: ocy + oh * 0.2, s: 64 },
        bow: { x: ocx, y: ocy + oh * 0.52, s: 52 }, shoes: { x: ocx, y: ocy + oh * 0.62, s: 84 },
    }
    const order = ["eyes", "hat", "stache", "bow", "shoes"]
    const tray = order.map((k, i) => ({ k, x: w * ((i + 0.5) / order.length), y: h - 46 }))
    const drag = React.useRef<{ k: string; x: number; y: number } | null>(null)
    const [, force] = React.useState(0)
    const timers = useTimers()
    const placedRef = useLatest(placed)

    const land = (k: string) => {
        if (placedRef.current[k]) return
        const next = { ...placedRef.current, [k]: true }
        setPlaced(next)
        fx.sound("boing", 0.9 + Object.keys(next).length * 0.1)
        fx.haptic("light")
        const n = Object.keys(next).length
        props.progress(n / order.length)
        if (n === order.length) timers.after(1400, () => { fx.sound("complete"); fx.haptic("success"); props.done() })
    }
    useDrag(stage, stage, {
        onStart: (d) => {
            if (mode !== "weird") return false
            const hit = tray.find((t) => !placedRef.current[t.k] && dist(d.x, d.y, t.x, t.y) < 30)
            if (!hit) return false
            drag.current = { k: hit.k, x: d.x, y: d.y }
            fx.haptic("tick")
            force((n) => n + 1)
        },
        onMove: (d) => { if (drag.current) { drag.current.x = d.x; drag.current.y = d.y; force((n) => n + 1) } },
        onEnd: (d) => {
            const g = drag.current
            drag.current = null
            if (!g) return
            const moved = Math.hypot(d.dx, d.dy)
            if (moved < 8 || (Math.abs(g.x - ocx) < ow * 0.7 && Math.abs(g.y - ocy) < oh)) land(g.k)
            force((n) => n + 1)
        },
    }, mode === "weird")

    if (mode === "ask") {
        return (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 22 }}>
                <div style={{ position: "absolute", inset: 0, background: dark ? "#141318" : "#F6F2EC" }} />
                <div style={{ position: "relative", textAlign: "center", maxWidth: 340 }}>
                    <p className="t-head" style={{ marginBottom: 6 }}>Make it a little ridiculous?</p>
                    <p className="t-sub" style={{ marginBottom: 18 }}>Only if it feels right. Some thoughts deserve gentler handling.</p>
                    <div className="tsr-stack">
                        <button type="button" className="tsr-btn" onClick={() => { setMode("weird"); fx.haptic("light"); props.hint("Drag the props onto it — or tap them") }}>Yes, make it weird</button>
                        <button type="button" className="tsr-btn ghost" onClick={() => { setMode("gentle"); props.hint("Tap it to set it down gently") }}>Not today</button>
                    </div>
                </div>
            </div>
        )
    }
    const dance = Object.keys(placed).length === order.length && !reduced
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "#141318" : "#F6F2EC" }} />
            <div role={mode === "gentle" ? "button" : undefined} tabIndex={mode === "gentle" ? 0 : undefined}
                onClick={() => { if (mode === "gentle" && !setDown) { setSetDown(true); fx.sound("thud", 0.8); fx.haptic("medium"); props.progress(1); timers.after(1300, props.done) } }}
                onKeyDown={(e) => { if (mode === "gentle" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
                style={{ position: "absolute", left: ocx - ow / 2, top: ocy - oh / 2, width: ow, height: oh, borderRadius: "46% 54% 50% 50% / 55% 50% 50% 45%", display: "grid", placeItems: "center", padding: 22, textAlign: "center", cursor: mode === "gentle" ? "pointer" : "default",
                    background: `radial-gradient(circle at 35% 30%, ${hsl(emo.calmHue, 60, dark ? 40 : 92)}, ${hsl(emo.hue, 45, dark ? 30 : 80)})`, boxShadow: "var(--shadow-2)",
                    transform: setDown ? "translateY(40px) scale(.7)" : dance ? undefined : "none", opacity: setDown ? 0.4 : 1, animation: dance ? "tsrFloat .7s ease-in-out infinite" : undefined, transition: "transform .9s cubic-bezier(.22,1,.36,1), opacity .9s" }}>
                <WordBody item={{ ...items[0], img: null }} size={stageFont(w, 1)} />
            </div>
            {mode === "weird" ? order.map((k) => {
                const a = anchors[k]
                const isDrag = drag.current?.k === k
                const t = tray.find((x) => x.k === k)!
                const x = placed[k] ? a.x : isDrag ? drag.current!.x : t.x
                const y = placed[k] ? a.y : isDrag ? drag.current!.y : t.y
                return (
                    <div key={k} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${placed[k] ? 1 : isDrag ? 1.15 : 0.8}) ${placed[k] && dance ? `rotate(${(hashNoise(k.length, 3) - 0.5) * 16}deg)` : ""}`, transition: isDrag ? "none" : "left .55s cubic-bezier(.34,1.56,.64,1), top .55s cubic-bezier(.34,1.56,.64,1), transform .4s", cursor: placed[k] ? "default" : "grab", pointerEvents: "none", zIndex: placed[k] ? 5 : 10 }}>
                        {PROPS_SVG[k](a.s)}
                    </div>
                )
            }) : null}
            {mode === "weird" ? <div style={{ position: "absolute", left: 10, right: 10, bottom: 14, height: 64, borderRadius: 18, background: dark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.6)", border: "1px solid var(--line)", zIndex: 1 }} /> : null}
        </div>
    )
}

/* ---------- 109 · CLEANSE — charge, release one word, and the air gets clearer ---------- */

function RitualCleanse(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const cx = w / 2, cy = h * 0.47
    const R = Math.min(w * 0.38, h * 0.33, 190)
    const lotus = clamp(Math.min(w, h) * 0.2, 70, 110)
    const [released, setReleased] = React.useState(0)
    const [charge, setCharge] = React.useState(0)
    const [lifting, setLifting] = React.useState<number | null>(null)
    const st = React.useRef({ holding: false, charge: 0, ready: false, loop: null as Loop | null, shown: 0 })
    const timers = useTimers()
    const relRef = useLatest(released)

    const hold = useHold(
        () => { const s = st.current; if (relRef.current >= items.length || lifting != null) return; s.holding = true; s.loop = fx.loop("hum"); fx.haptic("light") },
        () => {
            const s = st.current
            if (!s.holding) return
            s.holding = false
            s.loop?.stop(); s.loop = null
            if (s.ready) {
                s.ready = false
                s.charge = 0
                const i = relRef.current
                setLifting(i)
                fx.sound("chime", 1 + i * 0.1)
                fx.haptic("success")
                if (!reduced) for (let k = 0; k < 8; k++) timers.after(k * 70, () => fx.burst(cx + Math.cos(k) * lotus * 0.5, cy + Math.sin(k) * lotus * 0.3, { kind: "glow", n: 1, size: 4, speed: 90, angle: -Math.PI / 2, spread: 0.6, color: hsl(emo.calmHue + k * 8, 85, 78, 0.85), life: 2.2, gravity: -40 }))
                const a = (i / items.length) * Math.PI * 2 - Math.PI / 2
                if (!reduced) fx.burst(cx + Math.cos(a) * R, cy + Math.sin(a) * R, { kind: "glow", n: 6, size: 5, speed: 60, angle: -Math.PI / 2, spread: 1.4, color: [hsl(emo.calmHue, 80, 80, 0.9), "rgba(255,255,255,.9)"], life: 1.8, gravity: -30 })
                timers.after(900, () => {
                    const n = relRef.current + 1
                    setReleased(n)
                    setLifting(null)
                    props.progress(n / items.length)
                    if (n >= items.length) timers.after(1200, props.done)
                })
            } else if (s.charge > 0.08) props.hint("Hold until the lotus glows, then let go")
        },
    )
    useFrame((dt) => {
        const s = st.current
        if (s.holding) s.charge = Math.min(1, s.charge + dt / 1.15)
        else s.charge = Math.max(0, s.charge - dt * 1.6)
        if (s.charge >= 1 && !s.ready) { s.ready = true; fx.haptic("medium"); fx.sound("bell", 1.2) }
        s.loop?.set(160 + s.charge * 240, 0.5 + s.charge)
        if (Math.abs(s.charge - s.shown) > 0.004 || (s.charge === 0 && s.shown !== 0)) { s.shown = s.charge; setCharge(s.charge) }
    })

    const haze = 0.62 * (1 - released / items.length)
    const circ = 2 * Math.PI * (lotus * 0.62)
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? `radial-gradient(80% 70% at 50% 45%, ${hsl(emo.calmHue, 30, 18)}, #0F1013 75%)` : `radial-gradient(80% 70% at 50% 45%, ${hsl(emo.calmHue, 70, 95)}, #EEF0F0 80%)` }} />
            {items.map((it, i) => {
                const a = (i / items.length) * Math.PI * 2 - Math.PI / 2
                const gone = i < released
                const up = lifting === i
                return (
                    <div key={it.key} style={{ position: "absolute", left: clamp(cx + Math.cos(a) * R, Math.min(75, w * 0.2), w - Math.min(75, w * 0.2)), top: cy + Math.sin(a) * R * 0.86, transform: `translate(-50%, -50%) ${up ? `translate(${-Math.cos(a) * R * 0.6}px, ${-Math.sin(a) * R * 0.5 - 50}px) scale(.6)` : ""}`, opacity: gone || up ? 0 : 1, filter: up && !reduced ? "blur(6px)" : "none", transition: "transform .9s cubic-bezier(.22,1,.36,1), opacity .9s ease, filter .9s", padding: "8px 13px", borderRadius: 999, background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.85)", boxShadow: "var(--shadow-1)", maxWidth: Math.min(150, w * 0.38), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>
                        <WordBody item={{ ...it, img: null }} size={clamp(w / 26, 12, 15)} style={{ whiteSpace: "nowrap" }} />
                    </div>
                )
            })}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: haze, transition: "opacity 1.4s ease" }}>
                {[0, 1, 2, 3].map((k) => <span key={k} style={{ position: "absolute", left: `${-20 + k * 28}%`, top: `${10 + (k % 2) * 40}%`, width: "70%", height: "55%", borderRadius: "50%", background: dark ? "rgba(110,110,125,.55)" : "rgba(175,172,165,.6)", filter: "blur(40px)", animation: reduced ? undefined : `tsrFloat ${7 + k * 2}s ease-in-out ${k * 0.8}s infinite` }} />)}
            </div>
            {[0, 1, 2].map((k) => (
                <span key={"ring" + k} style={{ position: "absolute", left: cx - lotus, top: cy - lotus, width: lotus * 2, height: lotus * 2, borderRadius: "50%", border: `1.5px solid ${hsl(emo.calmHue, 80, dark ? 70 : 55, 0.5)}`, pointerEvents: "none", opacity: 0.25 + charge * 0.75, animation: reduced ? undefined : `tsrRipple ${3.6 - charge * 1.6}s ease-out ${k * 1.2}s infinite` }} />
            ))}
            <style>{"@keyframes tsrRipple{from{transform:scale(.7);opacity:.9}to{transform:scale(2.1);opacity:0}}"}</style>
            <div {...hold} role="button" tabIndex={0} aria-label="Hold the lotus until it glows, then let go to release one word"
                style={{ position: "absolute", left: cx - lotus, top: cy - lotus, width: lotus * 2, height: lotus * 2, borderRadius: "50%", cursor: "pointer", touchAction: "none", display: "grid", placeItems: "center" }}>
                <svg width={lotus * 2} height={lotus * 2} viewBox={`${-lotus} ${-lotus} ${lotus * 2} ${lotus * 2}`} style={{ overflow: "visible" }}>
                    <circle r={lotus * 0.62} fill="none" stroke="var(--fill-2)" strokeWidth="4" />
                    <circle r={lotus * 0.62} fill="none" stroke={hsl(emo.calmHue, 70, 60)} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - charge)} transform="rotate(-90)" />
                    {Array.from({ length: 8 }, (_, k) => {
                        const ang = (k / 8) * 360
                        const open = 0.6 + charge * 0.4 + released / items.length * 0.2
                        return <ellipse key={k} cx="0" cy={-lotus * 0.28 * open} rx={lotus * 0.14} ry={lotus * 0.3 * open} transform={`rotate(${ang})`} fill={hsl(emo.calmHue + k * 4, 70, dark ? 66 : 80, 0.85)} />
                    })}
                    <circle r={lotus * 0.14} fill={charge >= 1 ? "#FFF6D8" : hsl(48, 90, 72)} style={{ filter: charge >= 1 ? "drop-shadow(0 0 12px #FFE59A)" : "none" }} />
                </svg>
            </div>
        </div>
    )
}

/* ---------- 110 · RAIN OUT — pull the heavy clouds down and let them empty ---------- */

function RitualRainOut(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const n = items.length
    const cols = n <= 2 ? n : 2
    const cw = Math.min((w - 30) / cols - 8, 200), ch = cw * 0.6
    const homes = items.map((_, i) => ({ x: w * ((i % cols) + 0.5) / cols, y: 26 + ch / 2 + Math.floor(i / cols) * (ch + 22) }))
    const pull = React.useRef(items.map(() => ({ x: 0, v: 0 })))
    const [rained, setRained] = React.useState<boolean[]>(() => items.map(() => false))
    const [storm, setStorm] = React.useState(false)
    const els = React.useRef<(HTMLDivElement | null)[]>([])
    const active = React.useRef<number | null>(null)
    const rainedRef = useLatest(rained)
    const st = React.useRef({ rainUntil: items.map(() => 0), storm: 0, loop: null as Loop | null, last: 0, done: false })
    const timers = useTimers()

    useDrag(stage, stage, {
        onStart: (d) => {
            const hit = homes.findIndex((p, i) => !rainedRef.current[i] && Math.abs(d.x - p.x) < cw / 2 && Math.abs(d.y - p.y) < ch / 2 + 10)
            if (hit < 0) return false
            active.current = hit
            fx.haptic("light")
        },
        onMove: (d) => {
            const i = active.current
            if (i == null) return
            pull.current[i].x = clamp(d.dy * 0.55, 0, 120)
        },
        onEnd: () => {
            const i = active.current
            active.current = null
            if (i == null) return
            if (pull.current[i].x > 55) {
                const next = rainedRef.current.map((v, j) => (j === i ? true : v))
                setRained(next)
                st.current.rainUntil[i] = performance.now() / 1000 + 1.8
                fx.sound("water")
                fx.haptic("medium")
                const count = next.filter(Boolean).length
                props.progress(count / n)
                if (count === n) {
                    timers.after(700, () => {
                        setStorm(true)
                        st.current.storm = performance.now() / 1000 + 2.6
                        st.current.loop = fx.loop("rain")
                        fx.haptic("buzz")
                        timers.after(2600, () => { st.current.loop?.stop(); st.current.loop = null; setStorm(false); fx.sound("complete"); timers.after(900, props.done) })
                    })
                }
            } else if (pull.current[i].x > 8) props.hint("Pull it further down")
        },
    })

    useFrame((dt, t) => {
        const s = st.current
        pull.current.forEach((p, i) => {
            if (active.current !== i) springTo(p, 0, dt, 160, 14)
            const el = els.current[i]
            if (el) {
                const r = rainedRef.current[i]
                el.style.transform = `translate3d(${homes[i].x}px, ${homes[i].y + p.x - (r ? 30 : 0)}px, 0) translate(-50%, -50%) scale(${r ? 0.86 : 1 + p.x / 600})`
            }
            if (s.rainUntil[i] > t && !reduced && Math.random() < 0.35) fx.burst(homes[i].x + rand(-cw * 0.4, cw * 0.4), h * 0.9 + rand(0, h * 0.06), { kind: "ring", n: 1, size: 8, color: dark ? "rgba(170,200,255,.5)" : "rgba(80,120,170,.4)", life: 0.5 })
            if (s.rainUntil[i] > t && !reduced && Math.random() < 0.9) fx.burst(homes[i].x + rand(-cw * 0.35, cw * 0.35), homes[i].y + ch * 0.3, { kind: "rain", n: 2, size: 1.4, speed: 520, angle: Math.PI / 2, spread: 0.08, color: dark ? "rgba(170,200,255,.6)" : "rgba(80,120,170,.55)", life: 0.9, gravity: 400 })
        })
        if (s.storm > t && !reduced && Math.random() < 0.5) fx.burst(rand(0, w), h * 0.9 + rand(0, h * 0.08), { kind: "ring", n: 1, size: 10, color: dark ? "rgba(170,200,255,.5)" : "rgba(80,120,170,.4)", life: 0.5 })
        if (s.storm > t && !reduced) fx.burst(w / 2, -10, { kind: "rain", n: 6, size: 1.3, speed: 640, angle: Math.PI / 2 + 0.08, spread: 0.06, color: dark ? "rgba(170,200,255,.5)" : "rgba(80,120,170,.45)", life: 1.1, gravity: 500 })
    })

    const clear = rained.filter(Boolean).length / n
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(180deg, #1A1F2B, #121419)" : "linear-gradient(180deg, #C9D1DA, #ECEDEB)" }} />
            <div style={{ position: "absolute", inset: 0, background: dark ? "radial-gradient(80% 60% at 50% 20%, rgba(255,200,140,.18), transparent 70%)" : "radial-gradient(80% 60% at 50% 20%, rgba(255,230,180,.9), transparent 70%)", opacity: storm ? 0 : clear, transition: "opacity 1.6s" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h * 0.16, background: dark ? "linear-gradient(180deg, transparent, rgba(90,120,160,.18))" : "linear-gradient(180deg, transparent, rgba(110,140,170,.18))" }} />
            <div style={{ position: "absolute", left: "50%", top: h * 0.62, width: w * 1.3, height: w * 1.3, marginLeft: -w * 0.65, borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(closest-side, transparent 78%, rgba(255,90,90,.35) 80%, rgba(255,200,80,.35) 83%, rgba(120,220,120,.35) 86%, rgba(90,160,255,.35) 89%, rgba(160,110,255,.3) 92%, transparent 94%)", opacity: !storm && clear >= 1 ? 1 : 0, transition: "opacity 2.4s ease 0.4s" }} />
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { els.current[i] = el }} className="rk-abs" style={{ width: cw, height: ch, cursor: rained[i] ? "default" : "grab", pointerEvents: "none" }}>
                    {[[0.28, 0.6, 0.5], [0.5, 0.42, 0.62], [0.74, 0.58, 0.48]].map(([x, y, r], k) => (
                        <span key={k} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: cw * r, height: cw * r, transform: "translate(-50%,-50%)", borderRadius: "50%", background: rained[i] ? (dark ? "#6B7486" : "#FFFFFF") : dark ? "#3B4252" : "#7F8A98", transition: "background-color 1.2s ease" }} />
                    ))}
                    <div style={{ position: "absolute", inset: "30% 10% 8% 10%", display: "grid", placeItems: "center", textAlign: "center", color: rained[i] ? "transparent" : "#fff", transition: "color .9s ease", fontWeight: 650, fontSize: clamp(cw / 11, 12, 16), lineHeight: 1.1 }}>
                        {it.text}
                    </div>
                </div>
            ))}
        </div>
    )
}

/* ---------- 111 · BIG SIGH — two sips in, one long breath out; the storm drifts off ---------- */

function RitualBigSigh(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo, intensity } = props
    const SIGHS = (intensity ?? 0) >= 8 ? 4 : 3
    const stage = React.useRef<HTMLDivElement>(null)
    const orb = React.useRef<HTMLDivElement>(null)
    const label = React.useRef<HTMLDivElement>(null)
    const rings = React.useRef<HTMLDivElement>(null)
    const cloudsN = SIGHS * 2
    const clouds = React.useMemo(() => Array.from({ length: cloudsN }, (_, i) => ({ x: w * (i % 2 ? 0.72 : 0.28) + (hashNoise(i, 31) - 0.5) * w * 0.06, y: h * 0.07 + 22 + Math.floor(i / 2) * Math.min(58, h * 0.1), s: 0.9 + hashNoise(i, 33) * 0.15, text: items[i % items.length]?.text || "" })), [w, h, cloudsN])
    const [blown, setBlown] = React.useState(0)
    const [sighs, setSighs] = React.useState(0)
    const st = React.useRef({ phase: "idle" as "idle" | "in" | "sip" | "out", t: 0, scale: 1, sipped: false, startY: 0, loop: null as Loop | null, sighs: 0, done: false })
    const timers = useTimers()
    const orbY = h * 0.68

    const begin = (y: number) => {
        const s = st.current
        if (s.phase !== "idle" || s.done) return
        s.phase = "in"; s.t = 0; s.sipped = false; s.startY = y
        s.loop = fx.loop("hum")
        fx.haptic("light")
    }
    const end = () => {
        const s = st.current
        if (s.phase !== "in" && s.phase !== "sip") return
        s.loop?.stop(); s.loop = null
        if (s.t < 0.9 && !s.sipped) { s.phase = "idle"; props.hint("Breathe in a little longer before letting go"); return }
        s.phase = "out"; s.t = 0
        fx.sound("sigh", 1.8)
        fx.haptic("medium")
        props.hint(s.sipped ? null : "Next time, slide up for one more sip")
        timers.after(500, () => setBlown((b) => Math.min(cloudsN, b + 1)))
        timers.after(1900, () => setBlown((b) => Math.min(cloudsN, b + 1)))
    }
    useDrag(stage, stage, {
        onStart: (d) => { if (dist(d.x, d.y, w / 2, orbY) > 110) return false; begin(d.y) },
        onMove: (d) => {
            const s = st.current
            if (s.phase === "in" && s.t > 0.6 && s.startY - d.y > 26 && !s.sipped) { s.sipped = true; s.phase = "sip"; s.t = 0; fx.sound("tick", 1.5); fx.haptic("tick") }
        },
        onEnd: () => end(),
    })
    const keys = useHold(() => begin(0), end)

    useFrame((dt) => {
        const s = st.current
        s.t += dt
        let target = 1, text = s.done ? "" : "Hold to breathe in"
        if (s.phase === "in") { target = 1 + Math.min(1, s.t / 1.6) * 0.5; text = s.t > 1.2 ? "Slide up for one more sip" : "Breathe in…"; s.loop?.set(150 + s.t * 60, 0.5 + s.t * 0.3) }
        else if (s.phase === "sip") { target = 1.5 + Math.min(1, s.t / 0.5) * 0.18; text = "…and let go" }
        else if (s.phase === "out") {
            target = 1.68 - Math.min(1, s.t / 4.4) * 0.68
            text = "Long breath out…"
            if (s.t >= 4.4) {
                s.phase = "idle"
                s.sighs += 1
                setSighs(s.sighs)
                props.progress(s.sighs / SIGHS)
                fx.sound("chime", 0.8 + s.sighs * 0.1)
                if (s.sighs >= SIGHS) { s.done = true; fx.haptic("success"); timers.after(1600, props.done) }
            }
        }
        s.scale += (target - s.scale) * Math.min(1, dt * (s.phase === "out" ? 2.2 : 6))
        if (s.phase === "out" && !reduced && Math.random() < 0.5) fx.burst(rand(-20, w * 0.5), rand(h * 0.08, h * 0.5), { kind: "streak", n: 1, size: 1.4, speed: 0, vx: 520, vy: 0, color: dark ? "rgba(220,235,255,.5)" : "rgba(255,255,255,.8)", life: 0.6 })
        if (!reduced && !s.done && Math.random() < 0.6 * (1 - s.sighs / SIGHS)) fx.burst(rand(w * 0.1, w * 0.9), h * 0.3, { kind: "rain", n: 1, size: 1.1, speed: 420, angle: Math.PI / 2 + 0.1, spread: 0.05, color: dark ? "rgba(170,200,255,.35)" : "rgba(70,90,120,.3)", life: 0.7, gravity: 300 })
        if (rings.current) rings.current.style.transform = `translate(-50%, -50%) scale(${s.scale})`
        if (orb.current) orb.current.style.transform = `translate(-50%, -50%) scale(${reduced ? Math.min(1.3, s.scale) : s.scale})`
        if (label.current && label.current.textContent !== text) label.current.textContent = text
    })

    const calm = sighs / SIGHS
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }} onKeyDown={keys.onKeyDown} onKeyUp={keys.onKeyUp} tabIndex={0} role="application" aria-label="Hold the breath orb to breathe in, slide up for one more sip, then let go for a long breath out. Space also works.">
            <div style={{ position: "absolute", inset: 0, background: dark ? `linear-gradient(180deg, ${hsl(222, 30, lerp(14, 22, calm))}, ${mixHsl(222, 30, calm, 30, lerp(12, 20, calm))})` : `linear-gradient(180deg, ${hsl(lerp(215, 205, calm), lerp(20, 60, calm), lerp(70, 88, calm))}, ${mixHsl(210, 35, calm, lerp(15, 70, calm), lerp(80, 90, calm))})`, transition: "background 2s" }} />
            <div style={{ position: "absolute", left: "50%", top: h * 0.78, width: w * 0.9, height: w * 0.9, marginLeft: -w * 0.45, borderRadius: "50%", background: `radial-gradient(circle, ${hsl(40, 95, 70, dark ? 0.5 : 0.9)}, transparent 60%)`, opacity: calm, transform: `translateY(${(1 - calm) * 80}px)`, transition: "opacity 2s, transform 2s" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.82, bottom: 0, background: dark ? "#16202A" : "#9DB7C9", opacity: 0.8 }} />
            <div style={{ position: "absolute", left: "50%", top: h * 0.8, width: Math.min(220, w * 0.5), height: 40, marginLeft: -Math.min(220, w * 0.5) / 2, borderRadius: "50% 50% 0 0", background: dark ? "#25303A" : "#7F9A6E" }} />
            {clouds.map((c, i) => {
                const gone = i < blown
                return (
                    <div key={i} style={{ position: "absolute", left: c.x, top: c.y, transform: `translate(-50%, -50%) translateX(${gone ? w : 0}px) scale(${c.s})`, opacity: gone ? 0 : 1, transition: "transform 3.6s cubic-bezier(.3,0,.3,1), opacity 3s ease", pointerEvents: "none" }}>
                        <div style={{ position: "relative", padding: "12px 20px", borderRadius: 999, background: dark ? "#4A5263" : "#8995A3", color: "#fff", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", maxWidth: w * 0.42 / c.s, overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 8px 20px rgba(0,0,0,.15)" }}>
                            {i < items.length ? c.text : "      "}
                        </div>
                    </div>
                )
            })}
            <div ref={rings} style={{ position: "absolute", left: "50%", top: orbY, width: 92, height: 92, transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
                {[0, 1, 2].map((k) => <span key={k} style={{ position: "absolute", inset: -k * 22 - 14, borderRadius: "50%", border: `1.5px solid ${hsl(emo.calmHue, 80, dark ? 75 : 95, 0.5 - k * 0.13)}` }} />)}
            </div>
            <div ref={orb} style={{ position: "absolute", left: "50%", top: orbY, width: 92, height: 92, borderRadius: "50%", transform: "translate(-50%, -50%)", cursor: "pointer", touchAction: "none", background: `radial-gradient(circle at 38% 32%, #FFFFFF, ${hsl(emo.calmHue, 75, 78)} 55%, ${hsl(emo.calmHue, 60, 62)})`, boxShadow: `0 0 40px ${hsl(emo.calmHue, 80, 70, 0.55)}` }} />
            <div ref={label} style={{ position: "absolute", left: 0, right: 0, top: orbY + 84, textAlign: "center", fontSize: 15, fontWeight: 600, color: dark ? "rgba(255,255,255,.85)" : "rgba(20,30,40,.75)", pointerEvents: "none" }} aria-live="polite" />
            <div style={{ position: "absolute", right: 14, top: 12, display: "flex", gap: 6 }}>{Array.from({ length: SIGHS }, (_, i) => <i key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < sighs ? "#fff" : "rgba(255,255,255,.35)", boxShadow: "0 0 0 1px rgba(0,0,0,.08)" }} />)}</div>
        </div>
    )
}

/* ---------- 112 · COOL THE VOLCANO — let it blow, then cool it slowly ---------- */

function RitualVolcano(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const cloudRef = React.useRef<HTMLDivElement>(null)
    const vw = Math.min(w * 0.78, 360), vh = Math.min(h * 0.38, 230)
    const baseY = h - 20, craterY = baseY - vh, cx = w / 2
    const TAPS = 5
    const [taps, setTaps] = React.useState(0)
    const [heat, setHeat] = React.useState(1)
    const [shake, setShake] = React.useState(0)
    const st = React.useRef({ cx: w * 0.2, cy: h * 0.14, tx: w * 0.2, ty: h * 0.14, vx: 0, drag: false, heat: 1, loop: null as Loop | null, last: 0, done: false, fast: 0 })
    const timers = useTimers()
    const phase = taps < TAPS ? "erupt" : "cool"

    const erupt = () => {
        if (taps >= TAPS) return
        const n = taps + 1
        setTaps(n)
        setShake((s) => s + 1)
        fx.sound("thud", 0.7)
        fx.haptic("heavy")
        fx.burst(cx, craterY + 6, { kind: "spark", n: 26, size: 3.2, speed: 380, angle: -Math.PI / 2, spread: 1.2, color: ["#FFB347", "#FF6A3D", "#FFD58A"], life: 1.1, gravity: 520 })
        if (!reduced) fx.burst(cx, craterY + 4, { kind: "flame", n: 10, size: 9, speed: 160, angle: -Math.PI / 2, spread: 0.7, color: "rgba(255,120,40,.9)", life: 0.7, gravity: -60 })
        if (!reduced) fx.burst(cx, craterY - 10, { kind: "steam", n: 4, size: 12, speed: 50, angle: -Math.PI / 2, spread: 1, color: dark ? "rgba(200,200,200,.5)" : "rgba(110,100,95,.45)", life: 1.8, gravity: -20 })
        props.progress((n / TAPS) * 0.3)
        if (n === TAPS) timers.after(500, () => props.hint("Drag the rain cloud slowly over the lava", true))
    }
    useDrag(stage, stage, {
        onStart: (d) => {
            if (phase === "erupt") { if (Math.abs(d.x - cx) < vw * 0.3 && d.y > craterY - 50 && d.y < baseY) { erupt(); } return false }
            if (dist(d.x, d.y, st.current.cx, st.current.cy) > 90 || st.current.done) return false
            st.current.drag = true
            st.current.loop = fx.loop("rain")
        },
        onMove: (d) => { st.current.tx = d.x; st.current.ty = clamp(d.y, 40, craterY - 30) },
        onEnd: () => { st.current.drag = false; st.current.loop?.stop(); st.current.loop = null },
    })

    useFrame((dt, t) => {
        const s = st.current
        if (!reduced && s.heat > 0.25 && Math.random() < 0.25 * s.heat) fx.burst(cx + rand(-vw * 0.12, vw * 0.12), craterY + 4, { kind: "ember", n: 1, size: 2, speed: 50, angle: -Math.PI / 2, spread: 0.8, color: warmEmbers, life: 1.8, gravity: -20 })
        if (phase !== "cool") return
        const px = s.cx, py = s.cy
        s.cx += (s.tx - s.cx) * Math.min(1, dt * 5)
        s.cy += (s.ty - s.cy) * Math.min(1, dt * 5)
        const speed = Math.hypot(s.cx - px, s.cy - py) / Math.max(dt, 0.001)
        const tooFast = speed > 420
        if (tooFast) { s.fast += dt; if (s.fast > 0.35) { props.hint("Slower — let the rain land"); s.fast = 0; timers.after(2500, () => props.hint("Drag the rain cloud slowly over the lava", true)) } }
        const raining = s.drag && !tooFast
        if (cloudRef.current) cloudRef.current.style.transform = `translate3d(${s.cx}px, ${s.cy}px, 0) translate(-50%, -50%)`
        if (raining && !reduced) fx.burst(s.cx + rand(-40, 40), s.cy + 22, { kind: "rain", n: 2, size: 1.4, speed: 420, angle: Math.PI / 2, spread: 0.05, color: "rgba(120,170,230,.7)", life: 0.7, gravity: 300 })
        if (raining && Math.abs(s.cx - cx) < vw * 0.36 && !s.done) {
            s.heat = Math.max(0, s.heat - dt * 0.125)
            if (!reduced && t - s.last > 0.12) { s.last = t; fx.burst(s.cx + rand(-20, 20), craterY + 10, { kind: "steam", n: 1, size: 9, speed: 40, angle: -Math.PI / 2, spread: 0.8, color: "rgba(255,255,255,.55)", life: 1.4, gravity: -30 }) }
            setHeat(s.heat)
            props.progress(0.3 + (1 - s.heat) * 0.7)
            if (s.heat <= 0) { s.done = true; s.loop?.stop(); s.loop = null; fx.sound("complete"); fx.haptic("success"); timers.after(1800, props.done) }
        }
    })

    const lava = (k: number) => heat > 0.5 ? `hsl(${lerp(18, 28, k)}, 95%, ${lerp(48, 58, heat)}%)` : mixHsl(210, 20, heat * 2, lerp(12, 80, heat * 2), dark ? 40 : 48)
    const rocks = items.slice(0, 3)
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0, cursor: phase === "erupt" ? "pointer" : "grab" }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? `linear-gradient(180deg, ${mixHsl(210, 12, heat, 25, 14)}, #121114)` : `linear-gradient(180deg, ${mixHsl(205, 18, heat, lerp(50, 60, heat), lerp(88, 86, heat))}, #F1ECE4)`, transition: "background 1s" }} />
            <div key={shake} style={{ position: "absolute", inset: 0, animation: shake && !reduced ? "tsrShake .35s ease-out" : undefined }}>
                <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
                    <path d={`M ${cx - vw / 2} ${baseY} L ${cx - vw * 0.16} ${craterY} L ${cx + vw * 0.16} ${craterY} L ${cx + vw / 2} ${baseY} Z`} fill={dark ? "#2E2A2C" : "#6F625C"} />
                    <path d={`M ${cx - vw * 0.16} ${craterY} Q ${cx} ${craterY + 22} ${cx + vw * 0.16} ${craterY} Z`} fill={lava(0.5)} style={{ filter: heat > 0.3 ? `drop-shadow(0 0 ${heat * 18}px rgba(255,120,40,.8))` : "none", transition: "fill .6s" }} />
                    <path d={`M ${cx - vw * 0.06} ${craterY + 6} L ${cx - vw * 0.12} ${baseY - vh * 0.3} M ${cx + vw * 0.05} ${craterY + 8} L ${cx + vw * 0.1} ${baseY - vh * 0.45}`} stroke={lava(0.2)} strokeWidth={7} strokeLinecap="round" style={{ opacity: Math.max(0.15, heat), transition: "stroke .6s" }} />
                </svg>
                {rocks.map((it, i) => {
                    const pos = [{ x: cx - vw * 0.27, y: baseY - vh * 0.28 }, { x: cx + vw * 0.24, y: baseY - vh * 0.36 }, { x: cx, y: baseY - vh * 0.12 }][i]
                    return (
                        <div key={it.key} style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-50%)", padding: "7px 12px", borderRadius: 14, background: heat > 0.4 ? `linear-gradient(160deg, #FF9A4D, #D9481F)` : dark ? "#4A4F5C" : "#8C949F", color: "#fff", fontWeight: 650, fontSize: 13, whiteSpace: "nowrap", maxWidth: vw * 0.5, overflow: "hidden", textOverflow: "ellipsis", boxShadow: heat > 0.4 ? "0 0 18px rgba(255,110,40,.6)" : "none", transition: "background 1s, box-shadow 1s", pointerEvents: "none" }}>
                            {it.text}
                            {heat <= 0 ? <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: "absolute", left: "50%", top: -13, marginLeft: -8 }} aria-hidden="true"><path d="M8 15V8" stroke="#3E9B5B" strokeWidth="1.8" strokeLinecap="round" /><path d="M8 9C8 5 5 3 2 4c0 3 2 5 6 5zM8 8c0-3 2-5 6-5 0 3-2 5-6 5z" fill="#4CB36C" /></svg> : null}
                        </div>
                    )
                })}
            </div>
            {phase === "erupt" ? <div style={{ position: "absolute", left: 0, right: 0, top: craterY - 64, textAlign: "center", fontSize: 13, fontWeight: 650, color: "var(--ink-2)", pointerEvents: "none" }}>{TAPS - taps} more</div> : null}
            {phase === "cool" ? (
                <div ref={cloudRef} className="rk-abs" style={{ width: 120, height: 60, pointerEvents: "none", transform: `translate3d(${st.current.cx}px, ${st.current.cy}px, 0) translate(-50%, -50%)` }}>
                    {[[0.3, 0.6, 0.5], [0.55, 0.4, 0.62], [0.78, 0.62, 0.44]].map(([x, y, r], k) => <span key={k} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: 120 * r, height: 120 * r, transform: "translate(-50%,-50%)", borderRadius: "50%", background: dark ? "#6C7890" : "#FFFFFF", boxShadow: dark ? "none" : "0 6px 16px rgba(60,80,110,.15)" }} />)}
                </div>
            ) : null}
            <style>{"@keyframes tsrShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,1px)}80%{transform:translate(2px,-1px)}}"}</style>
        </div>
    )
}

/* ---------- 113 · GROUND CONTROL — real things around you land the rocket ---------- */

const SPOT_MISSIONS = ["Something blue near you", "Something round", "A soft texture you can touch", "A sound farther away", "A light source", "Something older than you", "Something green", "A straight line"]
const BODY_MISSIONS = ["Press your feet into the floor", "Let your shoulders drop", "Feel your hands resting", "Feel your back against something"]

function RitualGroundControl(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const missions = React.useMemo(() => {
        const seed = Math.floor(Date.now() / 60000)
        const spots = SPOT_MISSIONS.slice().sort((a, b) => hashNoise(seed, a.length * 7 + a.charCodeAt(0)) - hashNoise(seed, b.length * 7 + b.charCodeAt(0))).slice(0, 3)
        const body = BODY_MISSIONS.slice().sort((a, b) => hashNoise(seed + 1, a.length) - hashNoise(seed + 1, b.length)).slice(0, 2)
        return [...spots.map((t) => ({ t, kind: "spot" as const })), ...body.map((t) => ({ t, kind: "body" as const }))]
    }, [])
    const [lit, setLit] = React.useState<boolean[]>(() => missions.map(() => false))
    const [holding, setHolding] = React.useState<number | null>(null)
    const [holdP, setHoldP] = React.useState(0)
    const holdRef = React.useRef({ i: -1, t: 0, loop: null as Loop | null })
    const timers = useTimers()
    const count = lit.filter(Boolean).length
    const wide = w > 520
    const listH = wide ? Math.ceil(missions.length / 2) * 58 : missions.length * 52
    const skyH = Math.max(150, h - listH - 26)

    const light = (i: number) => {
        if (lit[i]) return
        const next = lit.map((v, j) => (j === i ? true : v))
        setLit(next)
        const n = next.filter(Boolean).length
        fx.sound("bell", 0.8 + n * 0.12)
        fx.haptic("success")
        props.progress(n / missions.length)
        if (n === missions.length) timers.after(1600, () => { fx.sound("thud", 0.6); fx.haptic("medium"); timers.after(900, props.done) })
    }
    const holdStart = (i: number) => { if (lit[i]) return; holdRef.current = { i, t: 0, loop: fx.loop("hum") }; setHolding(i); fx.haptic("light") }
    const holdEnd = () => { holdRef.current.loop?.stop(); holdRef.current = { i: -1, t: 0, loop: null }; setHolding(null); setHoldP(0) }
    useFrame((dt) => {
        const g = holdRef.current
        if (g.i < 0) return
        g.t += dt
        const p = Math.min(1, g.t / 2.2)
        g.loop?.set(150 + p * 200, 0.4 + p)
        setHoldP(p)
        if (p >= 1) { const i = g.i; holdEnd(); light(i) }
    })

    const descent = count / missions.length
    const rocketY = lerp(skyH * 0.32, skyH - 52, smooth(descent))
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: skyH, background: dark ? `linear-gradient(180deg, #121828, ${hsl(emo.calmHue, 25, 18)})` : `linear-gradient(180deg, #DCE6F2, ${hsl(emo.calmHue, 60, 92)})` }} />
            <div style={{ position: "absolute", left: w / 2 - 60, top: skyH - 14, width: 120, height: 8, borderRadius: 4, background: dark ? "#3A4050" : "#B9C0C9" }} />
            <div style={{ position: "absolute", left: w / 2, top: rocketY, transform: "translate(-50%, -50%)", transition: "top 1.4s cubic-bezier(.22,1,.36,1)", animation: reduced || descent >= 1 ? undefined : "tsrFloat 3s ease-in-out infinite" }}>
                <svg width="46" height="72" viewBox="0 0 46 72"><path d="M23 2 C36 14 38 34 34 52 H12 C8 34 10 14 23 2Z" fill={dark ? "#E8ECF4" : "#FFFFFF"} stroke={dark ? "#9AA3B5" : "#8C96A6"} strokeWidth="2" /><circle cx="23" cy="26" r="6" fill={hsl(emo.calmHue, 60, 60)} /><path d="M12 44 L4 58 L13 54Z M34 44 L42 58 L33 54Z" fill={hsl(emo.hue, 55, 58)} /><path d="M17 54 Q23 70 29 54" fill={descent >= 1 ? "transparent" : "#FFB347"} /></svg>
            </div>
            {items.slice(0, missions.length).map((it, i) => {
                const a = (i / missions.length) * Math.PI * 2
                const gone = i < count
                return (
                    <div key={it.key} style={{ position: "absolute", left: i % 2 ? w * 0.76 : w * 0.24, top: skyH * (0.18 + Math.floor(i / 2) * 0.24) + (i % 2) * 14, transform: "translate(-50%,-50%)", maxWidth: w * 0.4, overflow: "hidden", textOverflow: "ellipsis", padding: "8px 14px", borderRadius: 999, background: dark ? "rgba(160,170,190,.18)" : "rgba(120,130,150,.18)", color: "var(--ink)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", filter: gone ? "blur(10px)" : reduced ? "none" : "blur(.4px)", opacity: gone ? 0 : 0.9, transition: "opacity 1.2s ease, filter 1.2s ease", pointerEvents: "none" }}>
                        {it.text}
                    </div>
                )
            })}
            <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, height: listH, display: "grid", gridTemplateColumns: wide ? "1fr 1fr" : "1fr", gap: 6 }}>
                {missions.map((m, i) => {
                    const isHold = m.kind === "body"
                    const p = holding === i ? holdP : 0
                    const handlers = isHold ? {
                        onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ } holdStart(i) },
                        onPointerUp: holdEnd, onPointerCancel: holdEnd,
                        onKeyDown: (e: React.KeyboardEvent) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); holdStart(i) } },
                        onKeyUp: (e: React.KeyboardEvent) => { if (e.key === " " || e.key === "Enter") holdEnd() },
                    } : { onClick: () => light(i) }
                    return (
                        <button key={m.t} type="button" {...handlers} disabled={lit[i]} style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 10, minHeight: 46, padding: "0 14px", borderRadius: 14, border: "1px solid var(--line)", background: lit[i] ? hsl(emo.calmHue, 60, dark ? 24 : 93) : "var(--surface)", color: "var(--ink)", font: "inherit", fontSize: 14, fontWeight: 550, textAlign: "left", cursor: lit[i] ? "default" : "pointer", touchAction: "none" }}>
                            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${p * 100}%`, background: hsl(emo.calmHue, 70, dark ? 30 : 88) }} />
                            <span style={{ position: "relative", width: 22, height: 22, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center", background: lit[i] ? hsl(emo.calmHue, 70, 52) : "var(--fill-2)", color: "#fff", boxShadow: lit[i] ? `0 0 12px ${hsl(emo.calmHue, 90, 60, 0.7)}` : "none" }}>{lit[i] ? <Icon name="check" size={14} stroke={2.6} /> : null}</span>
                            <span style={{ position: "relative", flex: 1, minWidth: 0 }}>{m.t}</span>
                            <span style={{ position: "relative", fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>{lit[i] ? "" : isHold ? "Hold" : "Found it"}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/* ---------- 114 · SKY LANTERNS — warm it in your hands; let it rise ---------- */

function RitualSkyLanterns(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const n = items.length
    const lw = clamp(w / (n + 1.4), 70, 110), lh = lw * 1.25
    const groundY = h * 0.8
    const homes = items.map((_, i) => ({ x: w * ((i + 1) / (n + 1)), y: groundY - lh / 2 - 6 + (i % 2) * 8 }))
    const past = React.useMemo(() => clamp(Number(lsGet<number>(KEYS.lanterns, 0)) || 0, 0, 60), [])
    const L = React.useRef(items.map((_, i) => ({ warm: 0, holding: false, rising: false, x: homes[i].x, y: homes[i].y, vy: 0, s: 1, gone: false, hoverT: 0 })))
    const els = React.useRef<(HTMLDivElement | null)[]>([])
    const glows = React.useRef<(HTMLDivElement | null)[]>([])
    const active = React.useRef<number | null>(null)
    const st = React.useRef({ sent: 0, done: false, loop: null as Loop | null })
    const [sent, setSent] = React.useState(0)
    const timers = useTimers()

    const rise = (i: number, v = -60) => {
        const l = L.current[i]
        if (l.rising) return
        l.rising = true; l.holding = false; l.vy = v
        fx.sound("whoosh", 1.4)
        fx.haptic("medium")
        props.hint(null)
    }
    useDrag(stage, stage, {
        onStart: (d) => {
            const i = L.current.findIndex((l) => !l.rising && Math.abs(d.x - l.x) < lw / 2 + 8 && Math.abs(d.y - l.y) < lh / 2 + 8)
            if (i < 0) return false
            active.current = i
            L.current[i].holding = true
            st.current.loop = fx.loop("hum")
            fx.haptic("light")
        },
        onMove: (d) => {
            const i = active.current
            if (i == null) return
            const l = L.current[i]
            if (l.warm >= 1 && (d.vy < -350 || d.dy < -40)) { active.current = null; st.current.loop?.stop(); st.current.loop = null; rise(i, Math.min(-80, d.vy * 0.25)) }
        },
        onEnd: () => {
            const i = active.current
            active.current = null
            st.current.loop?.stop(); st.current.loop = null
            if (i == null) return
            const l = L.current[i]
            l.holding = false
            if (l.warm >= 1) props.hint("Flick it upward — or wait, it'll rise on its own")
            else props.hint("Keep holding until it glows")
        },
    })

    useFrame((dt, t) => {
        const s = st.current
        L.current.forEach((l, i) => {
            if (l.holding && !l.rising) { l.warm = Math.min(1, l.warm + dt / 1.2); s.loop?.set(150 + l.warm * 180, 0.4 + l.warm); if (l.warm >= 1 && l.hoverT === 0) { l.hoverT = t; fx.sound("chime", 1.1); fx.haptic("tick") } }
            else if (!l.rising && l.warm < 1) l.warm = Math.max(0, l.warm - dt * 0.5)
            if (!l.rising && l.warm >= 1 && !l.holding && t - l.hoverT > 2.4) rise(i)
            if (l.rising && !l.gone) {
                l.vy -= 26 * dt
                l.y += l.vy * dt
                l.x += Math.sin(t * 1.2 + i * 2) * 14 * dt
                l.s = clamp(0.25 + (l.y / h) * 0.9, 0.12, 1)
                if (!reduced && Math.random() < 0.3) fx.burst(l.x + rand(-6, 6), l.y + lh * 0.4 * l.s, { kind: "ember", n: 1, size: 1.6, speed: 20, angle: Math.PI / 2, spread: 1, color: warmEmbers, life: 1.4, gravity: 20 })
                if (l.y < h * 0.06 + i * 12) {
                    l.gone = true
                    s.sent += 1
                    setSent(s.sent)
                    props.progress(s.sent / n)
                    fx.sound("bell", 1.3 + s.sent * 0.1)
                    if (s.sent >= n && !s.done) {
                        s.done = true
                        lsSet(KEYS.lanterns, past + n)
                        fx.haptic("success")
                        timers.after(1400, props.done)
                    }
                }
            }
            const hover = !l.rising && l.warm >= 1 && !reduced ? Math.sin(t * 2 + i) * 4 - 6 : 0
            const el = els.current[i]
            if (el) { el.style.transform = `translate3d(${l.x}px, ${l.y + hover}px, 0) translate(-50%, -50%) scale(${l.s})`; el.style.opacity = l.gone ? "0" : "1" }
            const g = glows.current[i]
            if (g) g.style.opacity = String(0.15 + l.warm * 0.85)
        })
    })

    const stars = React.useMemo(() => Array.from({ length: Math.min(60, past + sent) }, (_, i) => ({ x: 6 + hashNoise(i, 41) * 88, y: 4 + hashNoise(i, 42) * 34, s: 2 + hashNoise(i, 43) * 2.5 })), [past, sent])
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(180deg, #121633 0%, #2B2347 55%, #4A2F45 100%)" : "linear-gradient(180deg, #4C5A8E 0%, #B88AA6 55%, #F2B58C 100%)" }} />
            {stars.map((s, i) => <i key={i} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: "50%", background: "#FFE7B8", boxShadow: "0 0 6px #FFD38A", opacity: i >= past ? 1 : 0.55, animation: reduced ? undefined : `tsrPulse ${2 + (i % 5) * 0.6}s ease-in-out ${(i % 7) * 0.3}s infinite` }} />)}
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <path d={`M 0 ${groundY} Q ${w * 0.3} ${groundY - 34} ${w * 0.6} ${groundY - 6} T ${w} ${groundY - 18} L ${w} ${h} L 0 ${h} Z`} fill={dark ? "#191826" : "#3E3550"} />
            </svg>
            <style>{"@keyframes tsrFlicker{0%,100%{opacity:.85;transform:scale(1)}30%{opacity:1;transform:scale(1.08)}60%{opacity:.75;transform:scale(.95)}}"}</style>
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { els.current[i] = el }} className="rk-abs" style={{ width: lw, height: lh, cursor: "grab", pointerEvents: "none" }}>
                    <div ref={(el) => { glows.current[i] = el }} style={{ position: "absolute", inset: -lw * 0.4, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,190,110,.75), transparent 62%)", opacity: 0.15 }} />
                    <div style={{ position: "absolute", inset: 0, borderRadius: `${lw * 0.3}px ${lw * 0.3}px ${lw * 0.16}px ${lw * 0.16}px`, background: "linear-gradient(180deg, #FFE9C4, #F6B36E)", boxShadow: "inset 0 -10px 18px rgba(200,100,40,.35)", display: "grid", placeItems: "center", padding: 8, textAlign: "center", overflow: "hidden" }}>
                        <span style={{ position: "absolute", left: "50%", bottom: "8%", width: lw * 0.5, height: lw * 0.5, marginLeft: -lw * 0.25, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,245,200,.95), rgba(255,170,70,.5) 45%, transparent 70%)", animation: reduced ? undefined : "tsrFlicker 1.3s ease-in-out infinite", pointerEvents: "none" }} />
                        <span style={{ fontSize: clamp(lw / 7.6, 11, 14), fontWeight: 650, color: "#5A3214", lineHeight: 1.15, overflowWrap: "anywhere" }}>{it.text}</span>
                    </div>
                    <div style={{ position: "absolute", left: "30%", right: "30%", bottom: -6, height: 6, borderRadius: 3, background: "#8A5A30" }} />
                </div>
            ))}
        </div>
    )
}

/* ---------- Registry ---------- */

const RITUAL_COMPONENTS: Record<number, React.ComponentType<RitualProps>> = {
    1: RitualPop, 6: RitualZap, 15: RitualShred, 16: RitualMelt, 18: RitualBurn, 22: RitualFlush, 23: RitualVacuum, 24: RitualSlingshot,
    25: RitualSwipe, 29: RitualMute, 32: RitualParkIt, 36: RitualCloudPass, 39: RitualBlackHole, 40: RitualPaperPlane, 41: RitualUnhook,
    47: RitualUnfollow, 52: RitualSubtitles, 61: RitualFreeze, 75: RitualInkBleed, 79: RitualMissOnPurpose, 87: RitualKeepDrop,
    88: RitualTradeMachine, 97: RitualXRay, 100: RitualHotPotato, 101: RitualTugOfWar, 102: RitualFingerTrap, 105: RitualDramaMachine,
    106: RitualTinySoundtrack, 107: RitualGoWeird, 109: RitualCleanse, 110: RitualRainOut, 111: RitualBigSigh, 112: RitualVolcano,
    113: RitualGroundControl, 114: RitualSkyLanterns,
}

/* ================================================================== */
/* Showcase rituals: physical, lit, layered worlds                     */
/* ================================================================== */

/* ---------- 1 · POP — iridescent film, jelly physics, chain pops ---------- */

function RitualPop(props: RitualProps) {
    const { items, w, h, fx, reduced, emo, dark } = props
    const n = items.length
    const cols = n <= 2 ? n : n <= 4 ? 2 : 3
    const rows = Math.ceil(n / cols)
    const r = Math.round(clamp(Math.min(w / cols / 2 - 14, (h - 24) / rows / 2 - 14), 44, 92))
    const homes = React.useMemo(() => scatter(n, w, h, r, 10, 10), [n, w, h, r])
    const B = React.useRef(items.map((_, i) => ({ x: homes[i].x, y: homes[i].y, vx: 0, vy: 0, wob: { x: 0, v: 0 }, tension: 0, held: false, popped: false })))
    const nodes = React.useRef<(HTMLDivElement | null)[]>([])
    const films = React.useRef<(HTMLDivElement | null)[]>([])
    const ghosts = React.useRef<(HTMLDivElement | null)[]>([])
    const [popped, setPopped] = React.useState(0)
    const chain = React.useRef({ last: 0, k: 0 })
    const timers = useTimers()

    const pop = (i: number) => {
        const b = B.current[i]
        if (b.popped) return
        b.popped = true
        b.held = false
        const now = performance.now()
        chain.current.k = now - chain.current.last < 1400 ? chain.current.k + 1 : 0
        chain.current.last = now
        const k = chain.current.k
        const power = 0.6 + b.tension * 0.6 + Math.min(4, k) * 0.12
        Sound.note(PENTA[Math.min(7, k + 1)], "sine", 0.6, 0.04)
        fx.sound("pop", 0.9 + k * 0.08 + b.tension * 0.2)
        fx.haptic(b.tension > 0.6 ? "heavy" : "medium")
        fx.burst(b.x, b.y, { kind: "ring", n: 1, size: r * (1.2 + power * 0.4), color: hsl(emo.calmHue, 80, dark ? 78 : 60, 0.85), life: 0.6 })
        fx.burst(b.x, b.y, { kind: "glow", n: 1, size: r * 0.5, color: "rgba(255,255,255,.55)", life: 0.35 })
        fx.burst(b.x, b.y, { kind: "shard", n: Math.round(14 * power), size: 4, speed: 280 * power, color: [hsl(emo.hue + 40, 90, 75, 0.8), hsl(emo.calmHue, 90, 75, 0.8), hsl(emo.calmHue + 120, 90, 80, 0.8)], life: 0.9 })
        fx.burst(b.x, b.y, { kind: "drop", n: Math.round(16 * power), size: 2.2, speed: 320 * power, color: [hsl(emo.calmHue, 80, 80), "rgba(255,255,255,.9)"], life: 0.8, gravity: 420 })
        // Shockwave nudges the neighbours and sets them wobbling.
        B.current.forEach((o, j) => {
            if (j === i || o.popped) return
            const dx = o.x - b.x, dy = o.y - b.y, d = Math.max(30, Math.hypot(dx, dy))
            const f = (9000 * power) / d
            o.vx += (dx / d) * f * 0.02; o.vy += (dy / d) * f * 0.02
            o.wob.v += f * 0.004
        })
        const g = ghosts.current[i]
        if (g) { g.style.transition = "transform 1.2s cubic-bezier(.22,1,.36,1), opacity 1.2s ease, filter 1.2s"; g.style.transform = `translate(-50%, -50%) translateY(-${r * 0.9}px) scale(1.05)`; g.style.opacity = "0"; g.style.filter = "blur(6px)" }
        const next = B.current.filter((o) => o.popped).length
        setPopped(next)
        props.progress(next / n)
        if (next === n) timers.after(700, props.done)
    }

    useFrame((dt, t) => {
        B.current.forEach((b, i) => {
            const el = nodes.current[i]
            if (!el) return
            if (b.popped) { el.style.opacity = "0"; el.style.transform += " scale(1.3)"; return }
            // Float: spring toward a slowly wandering home, avoid neighbours.
            const hx = homes[i].x + (reduced ? 0 : Math.sin(t * 0.45 + i * 1.7) * 9)
            const hy = homes[i].y + (reduced ? 0 : Math.cos(t * 0.38 + i * 2.3) * 11)
            b.vx += (hx - b.x) * 6 * dt; b.vy += (hy - b.y) * 6 * dt
            B.current.forEach((o, j) => {
                if (j === i || o.popped) return
                const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy) || 1, min = r * 2.05
                if (d < min) { const f = (min - d) * 18 * dt; b.vx += (dx / d) * f; b.vy += (dy / d) * f }
            })
            b.vx *= Math.pow(0.12, dt); b.vy *= Math.pow(0.12, dt)
            b.x = clamp(b.x + b.vx * dt, r, w - r); b.y = clamp(b.y + b.vy * dt, r, h - r)
            b.tension = b.held ? Math.min(1, b.tension + dt * 1.6) : Math.max(0, b.tension - dt * 4)
            springTo(b.wob, 0, dt, 140 + b.tension * 200, 4)
            if (b.held && !reduced) b.wob.v += Math.sin(t * 40) * b.tension * 30 * dt
            const wv = clamp(b.wob.x, -0.18, 0.18)
            const breath = reduced ? 0 : Math.sin(t * 1.3 + i) * 0.015
            const sx = 1 + wv + breath + b.tension * 0.08, sy = 1 - wv + breath - b.tension * 0.12
            el.style.transform = `translate3d(${b.x - r}px, ${b.y - r}px, 0) scale(${sx}, ${sy})`
            const f = films.current[i]
            if (f) { f.style.transform = `rotate(${(t * 22 + i * 60) % 360}deg)`; f.style.opacity = String((dark ? 0.75 : 0.6) + b.tension * 0.35) }
            const g = ghosts.current[i]
            if (g && !b.popped) g.style.left = `${b.x}px`, g.style.top = `${b.y}px`
        })
    })

    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? `radial-gradient(120% 80% at 50% 0%, hsl(${emo.hue},35%,16%), #0B0B10 70%)` : `radial-gradient(120% 80% at 50% 0%, hsl(${emo.hue},70%,93%), #F4F1EC 75%)` }} />
            {items.map((it, i) => (
                <div key={"g" + it.key} ref={(el) => { ghosts.current[i] = el }} style={{ position: "absolute", left: homes[i].x, top: homes[i].y, transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 1, maxWidth: r * 1.6, textAlign: "center", opacity: 0, color: "var(--stage-ink)", fontWeight: 650, fontSize: clamp(r / 4.3, 13, 18) }}>{it.text}</div>
            ))}
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { nodes.current[i] = el }} className="rk-abs" style={{ width: r * 2, height: r * 2, zIndex: 2, transition: "opacity .14s" }}>
                    <button type="button" aria-label={`Pop “${it.text}”`}
                        onPointerDown={(e) => { e.preventDefault(); B.current[i].held = true; fx.haptic("tick"); fx.sound("tick", 0.6); try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ } }}
                        onPointerUp={() => { if (B.current[i].held) pop(i) }}
                        onPointerLeave={() => { B.current[i].held = false }}
                        onPointerCancel={() => { B.current[i].held = false }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pop(i) } }}
                        style={{ position: "absolute", inset: 0, border: 0, padding: 0, margin: 0, borderRadius: "50%", cursor: "pointer", font: "inherit", display: "grid", placeItems: "center", touchAction: "none", overflow: "hidden", color: "var(--stage-ink)",
                            background: dark ? `radial-gradient(circle at 50% 55%, hsla(${emo.hue},60%,40%,.05) 55%, hsla(${emo.calmHue},70%,60%,.22) 100%)` : `radial-gradient(circle at 50% 55%, rgba(255,255,255,.25) 55%, hsla(${emo.calmHue},70%,75%,.35) 100%)`,
                            boxShadow: `inset 0 0 0 1px rgba(255,255,255,${dark ? 0.22 : 0.8}), 0 18px 40px rgba(0,0,0,${dark ? 0.45 : 0.1})` }}>
                        {/* thin-film iridescence */}
                        <div ref={(el) => { films.current[i] = el }} style={{ position: "absolute", inset: -2, borderRadius: "50%", background: `conic-gradient(from 0deg, hsla(${emo.hue},90%,70%,.55), hsla(${emo.calmHue},90%,70%,.55), hsla(${emo.calmHue + 120},90%,75%,.5), hsla(${emo.hue + 200},90%,75%,.5), hsla(${emo.hue},90%,70%,.55))`, WebkitMaskImage: "radial-gradient(circle, transparent 0 58%, rgba(0,0,0,.6) 72%, #000 100%)", maskImage: "radial-gradient(circle, transparent 0 58%, rgba(0,0,0,.6) 72%, #000 100%)", mixBlendMode: dark ? "screen" : "normal", pointerEvents: "none" }} />
                        <span style={{ position: "absolute", left: "20%", top: "14%", width: "30%", height: "18%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,.95), rgba(255,255,255,0))", transform: "rotate(-30deg)", pointerEvents: "none" }} />
                        <span style={{ position: "absolute", right: "22%", bottom: "16%", width: "12%", height: "8%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,.7), rgba(255,255,255,0))", pointerEvents: "none" }} />
                        <WordBody item={it} size={clamp(r / 4.3, 13, 18)} layout="col" imgSize={Math.round(r * 0.6)} style={{ maxWidth: r * 1.5, pointerEvents: "none", position: "relative" }} />
                    </button>
                </div>
            ))}
            {popped > 0 && popped < n ? <div style={{ position: "absolute", right: 14, bottom: 12, fontSize: 13, fontWeight: 600, color: "var(--ink-2)", pointerEvents: "none" }}>{n - popped} left</div> : null}
        </div>
    )
}

/* ---------- 22 · FLUSH — a real vortex: stir it and everything spirals away ---------- */

function RitualFlush(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const cv = React.useRef<HTMLCanvasElement>(null)
    const D = Math.min(w * 0.9, h * 0.72, 480)
    const cx = w / 2, cy = h * 0.47, R = D / 2
    const papers = React.useRef(items.map((_, i) => ({ a: (i / items.length) * Math.PI * 2 + 0.4, r: R * (0.5 + hashNoise(i, 7) * 0.3), gone: false, s: 1, wet: 0 })))
    const foam = React.useRef(Array.from({ length: reduced ? 0 : 70 }, () => ({ a: Math.random() * 6.28, r: R * (0.15 + Math.random() * 0.82), s: 0.6 + Math.random() * 1.6 })))
    const els = React.useRef<(HTMLDivElement | null)[]>([])
    const st = React.useRef({ omega: 0.15, theta: 0, lastAng: null as number | null, lastT: 0, gone: 0, done: false, loop: null as Loop | null, clear: 0 })
    const [gone, setGone] = React.useState(0)
    const timers = useTimers()

    useDrag(stage, stage, {
        onStart: (d) => { st.current.lastAng = Math.atan2(d.y - cy, d.x - cx); st.current.lastT = performance.now(); fx.haptic("light") },
        onMove: (d) => {
            const s = st.current
            const a = Math.atan2(d.y - cy, d.x - cx)
            if (s.lastAng == null) { s.lastAng = a; return }
            let da = a - s.lastAng
            if (da > Math.PI) da -= Math.PI * 2
            if (da < -Math.PI) da += Math.PI * 2
            s.lastAng = a
            const now = performance.now(), dtm = Math.max(8, now - s.lastT) / 1000
            s.lastT = now
            if (dist(d.x, d.y, cx, cy) < R * 1.15) s.omega = clamp(s.omega + (da / dtm) * 0.06, -6, 6)
        },
        onEnd: () => { st.current.lastAng = null },
    })

    useFrame((dt, t) => {
        const s = st.current
        s.omega *= Math.pow(s.done ? 0.3 : 0.75, dt)
        if (!s.done && Math.abs(s.omega) < 0.15) s.omega = 0.15 * Math.sign(s.omega || 1)
        s.theta += s.omega * dt
        const speed = Math.abs(s.omega)
        if (speed > 0.8 && !s.loop) s.loop = fx.loop("wind")
        if (s.loop) { s.loop.set(220 + speed * 110, Math.min(1.5, speed / 2.6)); if (speed < 0.5) { s.loop.stop(); s.loop = null } }
        if (s.done) s.clear = Math.min(1, s.clear + dt * 0.6)

        // Water
        const c = cv.current, g = c?.getContext("2d")
        if (c && g) {
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            if (c.width !== Math.round(D * dpr)) { c.width = Math.round(D * dpr); c.height = Math.round(D * dpr) }
            g.setTransform(dpr, 0, 0, dpr, 0, 0)
            g.clearRect(0, 0, D, D)
            g.save(); g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.clip()
            const deep = g.createRadialGradient(R, R, 0, R, R, R)
            const lc = s.clear
            deep.addColorStop(0, dark ? "#03070C" : "#1D3A52")
            deep.addColorStop(0.18, dark ? `hsl(205,55%,${14 + lc * 6}%)` : `hsl(200,60%,${40 + lc * 14}%)`)
            deep.addColorStop(1, dark ? `hsl(200,45%,${26 + lc * 8}%)` : `hsl(195,65%,${74 + lc * 10}%)`)
            g.fillStyle = deep; g.fillRect(0, 0, D, D)
            // Spiral arms tighten as the swirl builds.
            const twist = 1.4 + speed * 0.9
            const arms = 7
            g.lineCap = "round"
            for (let k = 0; k < arms; k++) {
                g.beginPath()
                for (let rr = R; rr > 8; rr -= 4) {
                    const ang = s.theta * (1 + 30 / rr) + (k / arms) * Math.PI * 2 + Math.log(rr / R) * twist * Math.sign(s.omega || 1)
                    const x = R + Math.cos(ang) * rr, y = R + Math.sin(ang) * rr
                    rr === R ? g.moveTo(x, y) : g.lineTo(x, y)
                }
                g.strokeStyle = `rgba(255,255,255,${(dark ? 0.04 : 0.1) + Math.min(1, speed / 4) * (dark ? 0.12 : 0.22)})`
                g.lineWidth = 2 + Math.min(1, speed / 4) * 3
                g.stroke()
            }
            // Foam
            for (const f of foam.current) {
                f.a += s.omega * dt * (1 + 40 / Math.max(20, f.r))
                if (speed > 1.2) f.r -= (speed - 1.2) * dt * 22
                if (f.r < 10) { f.r = R * (0.75 + Math.random() * 0.22); f.a = Math.random() * 6.28 }
                g.fillStyle = `rgba(255,255,255,${0.25 + Math.min(0.5, speed * 0.1)})`
                g.beginPath(); g.arc(R + Math.cos(f.a) * f.r, R + Math.sin(f.a) * f.r, f.s, 0, Math.PI * 2); g.fill()
            }
            // Caustic light, stronger as the water clears.
            if (!reduced) for (let k = 0; k < 4; k++) {
                const x = R + Math.sin(t * 0.4 + k * 2) * R * 0.5, y = R + Math.cos(t * 0.33 + k * 1.4) * R * 0.5
                const lg = g.createRadialGradient(x, y, 0, x, y, R * 0.5)
                lg.addColorStop(0, `rgba(255,255,255,${0.05 + lc * 0.12})`); lg.addColorStop(1, "rgba(255,255,255,0)")
                g.fillStyle = lg; g.fillRect(0, 0, D, D)
            }
            // Drain depth
            const dg = g.createRadialGradient(R, R, 0, R, R, 26 + speed * 6)
            dg.addColorStop(0, "rgba(0,0,0,.95)"); dg.addColorStop(1, "rgba(0,0,0,0)")
            g.fillStyle = dg; g.beginPath(); g.arc(R, R, 26 + speed * 6, 0, Math.PI * 2); g.fill()
            g.restore()
        }
        // Papers
        papers.current.forEach((p, i) => {
            const el = els.current[i]
            if (!el) return
            if (!p.gone) {
                p.a += (s.omega * (1 + 40 / Math.max(30, p.r)) * 0.55) * dt
                const pull = Math.max(0, speed - 1.1)
                p.r = Math.max(0, p.r - pull * dt * (14 + (R - p.r) * 0.14))
                p.s = clamp(p.r / (R * 0.6), 0.12, 1)
                p.wet = 1 - clamp(p.r / (R * 0.8), 0, 1)
                if (p.r < 16) {
                    p.gone = true
                    s.gone += 1
                    setGone(s.gone)
                    fx.sound("drip", 0.6)
                    Sound.note(PENTA[Math.min(7, s.gone * 2)], "sine", 0.9, 0.035)
                    fx.haptic("medium")
                    props.progress(s.gone / items.length)
                    fx.burst(cx, cy, { kind: "ring", n: 1, size: 34, color: "rgba(255,255,255,.75)", life: 0.7 })
                    if (!reduced) fx.burst(cx, cy, { kind: "bubble", n: 8, size: 3, speed: 60, angle: -Math.PI / 2, spread: 1.5, color: "rgba(255,255,255,.8)", life: 1.2, gravity: -60 })
                }
            } else p.s = Math.max(0, p.s - dt * 4)
            const x = cx + Math.cos(p.a) * p.r, y = cy + Math.sin(p.a) * p.r
            el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${p.a + Math.PI / 2}rad) scale(${p.s}, ${p.s * (1 - p.wet * 0.25)})`
            el.style.opacity = String(p.gone ? p.s : 1 - p.wet * 0.25)
            el.style.filter = p.wet > 0.3 ? `brightness(${1 - p.wet * 0.3})` : ""
        })
        if (!s.done && s.gone >= items.length) {
            s.done = true
            fx.sound("water")
            fx.haptic("success")
            timers.after(1500, props.done)
        }
    })

    return (
        <div ref={stage} style={{ position: "absolute", inset: 0, cursor: "grab" }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? "radial-gradient(90% 70% at 50% 47%, #18202B, #0C0D11 75%)" : "radial-gradient(90% 70% at 50% 47%, #FFFFFF, #E9E5DE 80%)" }} />
            <div style={{ position: "absolute", left: cx - R - 16, top: cy - R - 16, width: D + 32, height: D + 32, borderRadius: "50%", background: dark ? "linear-gradient(160deg,#30333D,#1A1B21)" : "linear-gradient(160deg,#FFFFFF,#DCD8D1)", boxShadow: `0 24px 60px rgba(0,0,0,${dark ? 0.55 : 0.16}), inset 0 2px 0 rgba(255,255,255,${dark ? 0.07 : 1}), inset 0 -6px 14px rgba(0,0,0,.12)` }} />
            <canvas ref={cv} style={{ position: "absolute", left: cx - R, top: cy - R, width: D, height: D, borderRadius: "50%", boxShadow: "inset 0 10px 30px rgba(0,0,0,.3)" }} />
            <div style={{ position: "absolute", left: cx - R, top: cy - R, width: D, height: D, borderRadius: "50%", pointerEvents: "none", boxShadow: "inset 0 14px 30px rgba(0,0,0,.28), inset 0 -2px 0 rgba(255,255,255,.15)" }} />
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { els.current[i] = el }} className="rk-abs" style={{ padding: "8px 12px", borderRadius: 6, background: "var(--paper)", color: "var(--paper-ink)", boxShadow: "0 6px 14px rgba(0,0,0,.25)", fontFamily: "var(--serif)", fontSize: clamp(w / 26, 13, 17), fontWeight: 500, maxWidth: Math.min(170, R * 0.9), textAlign: "center", lineHeight: 1.2, pointerEvents: "none" }}>
                    {it.text}
                </div>
            ))}
            <button type="button" className="rk-btn soft" style={{ right: 14, bottom: 14, minHeight: 44, padding: "0 16px" }} disabled={gone >= items.length}
                onClick={() => { st.current.omega = clamp(st.current.omega + (st.current.omega >= 0 ? 2.4 : -2.4), -6, 6); fx.sound("water"); fx.haptic("medium") }}>
                Flush
            </button>
        </div>
    )
}

/* ---------- 39 · BLACK HOLE — an accretion disk you can't look away from ---------- */

function RitualBlackHole(props: RitualProps) {
    const { items, w, h, fx, reduced, dark } = props
    const cx = w / 2, cy = h * 0.46
    const base = Math.min(w, h)
    const cv = React.useRef<HTMLCanvasElement>(null)
    const orbits = React.useRef(items.map((_, i) => ({ r: base * (0.24 + i * 0.07), a: (i / items.length) * Math.PI * 2, gone: false, s: 1 })))
    const els = React.useRef<(HTMLDivElement | null)[]>([])
    const disk = React.useRef(Array.from({ length: reduced ? 120 : 420 }, () => { const r = base * (0.07 + Math.pow(Math.random(), 1.6) * 0.2); return { r, a: Math.random() * 6.28, s: 0.5 + Math.random() * 1.4 } }))
    const stars = React.useRef(Array.from({ length: 140 }, () => ({ x: Math.random() * w, y: Math.random() * h, s: 0.4 + Math.random() * 1.3 })))
    const [holding, setHolding] = React.useState(false)
    const st = React.useRef({ G: 0, gone: 0, done: false, loop: null as Loop | null, calm: 0 })
    const timers = useTimers()
    const hold = useHold(() => { if (!st.current.done) { setHolding(true); st.current.loop = fx.loop("hum"); fx.haptic("light") } }, () => { setHolding(false); st.current.loop?.stop(); st.current.loop = null })
    const core = clamp(base * 0.065, 20, 32)

    useFrame((dt, t) => {
        const s = st.current
        s.G += ((holding ? 1 : 0) - s.G) * Math.min(1, dt * (holding ? 1.2 : 2))
        s.loop?.set(70 + s.G * 140, 0.5 + s.G)
        if (s.done) s.calm = Math.min(1, s.calm + dt * 0.5)
        const c = cv.current, g = c?.getContext("2d")
        if (c && g) {
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
            g.setTransform(dpr, 0, 0, dpr, 0, 0)
            g.fillStyle = dark ? "#06060A" : "#1B1830"
            g.fillRect(0, 0, w, h)
            // Stars fall inward and stretch while gravity is high.
            for (const p of stars.current) {
                const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1
                const pull = (s.G * 140 + 6) * dt * (1 + 60 / d)
                p.x -= (dx / d) * pull; p.y -= (dy / d) * pull
                if (d < core * 1.4) { const a = Math.random() * 6.28, rr = Math.max(w, h) * 0.6; p.x = cx + Math.cos(a) * rr; p.y = cy + Math.sin(a) * rr }
                const len = 1 + s.G * 18 * (60 / d)
                g.strokeStyle = `rgba(255,255,255,${0.35 + 0.4 * Math.sin(t * 2 + p.s * 9)})`
                g.lineWidth = p.s
                g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + (dx / d) * len, p.y + (dy / d) * len); g.stroke()
            }
            // Accretion disk (tilted), additive glow.
            g.globalCompositeOperation = "lighter"
            const tilt = 0.32
            for (const p of disk.current) {
                p.a += dt * (0.9 + s.G * 2.2) * (1 - s.calm * 0.6) * Math.pow((base * 0.08) / p.r, 1.5) * 2.2
                const x = cx + Math.cos(p.a) * p.r, y = cy + Math.sin(p.a) * p.r * tilt
                const heat = 1 - (p.r - base * 0.07) / (base * 0.2)
                const behind = Math.sin(p.a) < 0 && Math.abs(Math.cos(p.a) * p.r) < core
                if (behind) continue
                g.fillStyle = `hsla(${lerp(270, 38, heat)}, 95%, ${lerp(55, 85, heat)}%, ${0.35 + heat * 0.4})`
                g.beginPath(); g.arc(x, y, p.s * (1 + s.G * 0.4), 0, Math.PI * 2); g.fill()
            }
            // Photon ring
            const pr = g.createRadialGradient(cx, cy, core * 0.9, cx, cy, core * 2.2)
            pr.addColorStop(0, `rgba(255,220,170,${0.75 + s.G * 0.25})`); pr.addColorStop(0.35, "rgba(255,150,90,.25)"); pr.addColorStop(1, "rgba(120,80,255,0)")
            g.fillStyle = pr; g.beginPath(); g.arc(cx, cy, core * 2.2, 0, Math.PI * 2); g.fill()
            g.globalCompositeOperation = "source-over"
            g.fillStyle = "#000"; g.beginPath(); g.arc(cx, cy, core, 0, Math.PI * 2); g.fill()
        }
        orbits.current.forEach((o, i) => {
            const el = els.current[i]
            if (!el) return
            if (!o.gone) {
                o.a += dt * 0.55 * Math.pow((base * 0.2) / Math.max(20, o.r), 1.5) * (1 + s.G * 1.5)
                if (s.G > 0.05) o.r -= s.G * dt * (16 + 1400 / Math.max(30, o.r))
                if (o.r < core + 6) {
                    o.gone = true
                    s.gone += 1
                    fx.sound("pop", 0.5)
                    Sound.note(PENTA[Math.min(7, s.gone * 2 - 1)], "sine", 1.2, 0.035)
                    fx.haptic("medium")
                    fx.burst(cx, cy, { kind: "ring", n: 1, size: core * 1.8, color: "rgba(255,210,160,.9)", life: 0.7 })
                    fx.burst(cx, cy, { kind: "spark", n: 18, size: 2, speed: 160, color: ["#FFD9A8", "#FFFFFF", "#B8A4FF"], life: 0.7 })
                    props.progress(s.gone / items.length)
                }
            } else o.s = Math.max(0, o.s - dt * 5)
            const x = cx + Math.cos(o.a) * o.r, y = cy + Math.sin(o.a) * o.r * 0.78
            const stretch = o.gone ? 1 : 1 + s.G * clamp(90 / o.r, 0, 2.6)
            const tangent = o.a + Math.PI / 2
            const shrink = clamp(o.r / (base * 0.18), 0.25, 1) * o.s
            el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${tangent}rad) scale(${stretch * shrink}, ${shrink / Math.sqrt(stretch)}) rotate(${-tangent}rad)`
            el.style.opacity = String(o.gone ? o.s : clamp((o.r - core) / 40, 0, 1))
        })
        if (!s.done && s.gone >= items.length) {
            s.done = true
            setHolding(false)
            s.loop?.stop(); s.loop = null
            fx.haptic("success")
            timers.after(1600, props.done)
        }
    })

    return (
        <div style={{ position: "absolute", inset: 0, cursor: "pointer" }} {...hold} role="button" tabIndex={0} aria-label="Hold to deepen the gravity">
            <canvas ref={cv} style={{ position: "absolute", inset: 0, width: w, height: h }} />
            {items.map((it, i) => (
                <div key={it.key} ref={(el) => { els.current[i] = el }} className="rk-abs" style={{ padding: "7px 13px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", color: "#F4F0FF", whiteSpace: "nowrap", pointerEvents: "none", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", fontWeight: 600, fontSize: stageFont(w, 0.86) }}>
                    {it.text}
                </div>
            ))}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.7)", pointerEvents: "none", opacity: holding ? 1 : 0.8 }}>{holding ? "Gravity rising…" : "Hold anywhere"}</div>
        </div>
    )
}

/* ---------- 24 · SLINGSHOT — tension, release, and a word that becomes a far star ---------- */

function RitualSlingshot(props: RitualProps) {
    const { items, w, h, fx, reduced, dark, emo } = props
    const stage = React.useRef<HTMLDivElement>(null)
    const cx = w / 2, tipY = h * 0.64, half = Math.min(74, w * 0.19)
    const restX = cx, restY = tipY + 8
    const maxL = Math.min(h * 0.24, 160)
    const horizon = h * 0.16
    const [idx, setIdx] = React.useState(0)
    const [phase, setPhase] = React.useState<"ready" | "pull" | "fly" | "done">("ready")
    const [stars, setStars] = React.useState<{ x: number; y: number; k: number }[]>([])
    const chip = React.useRef<HTMLDivElement>(null)
    const bandL = React.useRef<SVGPathElement>(null), bandR = React.useRef<SVGPathElement>(null)
    const vignette = React.useRef<HTMLDivElement>(null)
    const clouds = React.useRef<HTMLDivElement>(null)
    const st = React.useRef({ x: restX, y: restY, vx: 0, vy: 0, X: 0, Y: 0, Z: 0, VX: 0, VY: 0, VZ: 0, tension: 0, lastTick: 0, loop: null as Loop | null, sent: 0, appear: 0, beat: 0, trail: 0 })
    const timers = useTimers()
    const phaseRef = useLatest(phase)

    useDrag(stage, stage, {
        onStart: (d) => {
            if (phaseRef.current !== "ready" || dist(d.x, d.y, st.current.x, st.current.y) > 80) return false
            setPhase("pull")
            st.current.loop = fx.loop("hum")
            fx.haptic("light")
        },
        onMove: (d) => {
            const s = st.current
            const vx = d.x - restX, vy = d.y - restY
            const L = Math.hypot(vx, vy) || 1
            const soft = maxL * (1 - Math.exp((-L / maxL) * 1.25))
            s.x = restX + (vx / L) * soft
            s.y = restY + (vy / L) * soft
            s.tension = soft / maxL
            s.loop?.set(110 + s.tension * 260, 0.4 + s.tension)
            const step = Math.floor(s.tension * 8)
            if (step > s.lastTick) { fx.sound("tick", 0.8 + s.tension); fx.haptic("tick") }
            s.lastTick = step
        },
        onEnd: () => {
            const s = st.current
            s.loop?.stop(); s.loop = null
            s.lastTick = 0
            if (phaseRef.current !== "pull") return
            if (s.tension < 0.32) { setPhase("ready"); props.hint("Pull a little farther, then let go"); fx.sound("boing", 0.7); return }
            const dx = restX - s.x, dy = restY - s.y
            const L = Math.hypot(dx, dy) || 1
            const power = s.tension
            s.X = s.x; s.Y = s.y; s.Z = 0
            s.VX = (dx / L) * 420 * power
            s.VY = (dy / L) * 900 * power - 260 * power
            s.VZ = 2.4 + power * 4.4
            setPhase("fly")
            props.hint(null)
            fx.sound("snap"); fx.sound("whoosh", 0.8 + power * 0.4)
            fx.haptic("heavy")
            fx.burst(restX, restY, { kind: "ring", n: 1, size: 60 * power, color: hsl(emo.calmHue, 80, dark ? 80 : 60, 0.8), life: 0.5 })
        },
    }, phase === "ready" || phase === "pull")

    useFrame((dt, t) => {
        const s = st.current
        const ph = phaseRef.current
        let sx = s.x, sy = s.y, scale = 1, op = 1
        if (ph === "ready") {
            const xx = { x: s.x, v: s.vx }, yy = { x: s.y, v: s.vy }
            springTo(xx, restX, dt, 260, 16); springTo(yy, restY, dt, 260, 16)
            s.x = xx.x; s.vx = xx.v; s.y = yy.x; s.vy = yy.v
            s.appear = Math.min(1, s.appear + dt * 3)
            sx = s.x; sy = s.y
            scale = 0.7 + 0.3 * smooth(s.appear)
        } else if (ph === "pull") {
            // A slow heartbeat while the bands are at full stretch.
            if (s.tension > 0.6) { s.beat -= dt; if (s.beat <= 0) { s.beat = 0.85; fx.sound("thud", 0.6); fx.haptic("light") } }
        } else if (ph === "fly") {
            s.VY += 240 * dt
            s.X += s.VX * dt; s.Y += s.VY * dt; s.Z += s.VZ * dt
            const k = 1 / (1 + s.Z)
            sx = cx + (s.X - cx) * k
            sy = horizon + (s.Y - horizon) * k
            scale = k
            op = clamp((k - 0.08) * 7, 0, 1)
            if (!reduced && t - s.trail > 0.016) { s.trail = t; fx.burst(sx, sy, { kind: "glow", n: 1, size: 6 * k + 2, speed: 4, color: hsl(emo.calmHue, 90, dark ? 75 : 60, 0.6), life: 0.7 }) }
            if (k < 0.09 || sy < -40 || sx < -60 || sx > w + 60) {
                const fxX = clamp(sx, 14, w - 14), fxY = clamp(sy, 14, horizon + 20)
                fx.burst(fxX, fxY, { kind: "spark", n: 14, size: 1.8, speed: 70, color: [hsl(emo.calmHue, 90, 85), "#FFFFFF"], life: 0.8 })
                setStars((list) => [...list, { x: fxX, y: fxY, k: Date.now() }])
                s.sent += 1
                props.progress(s.sent / items.length)
                fx.sound("bell", 1 + s.sent * 0.15)
                if (s.sent >= items.length) { setPhase("done"); fx.haptic("success"); timers.after(900, props.done) }
                else { s.x = restX; s.y = restY + 30; s.vx = 0; s.vy = 0; s.appear = 0; setIdx(s.sent); setPhase("ready") }
                op = 0
            }
        }
        if (chip.current) {
            chip.current.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%) scale(${scale})`
            chip.current.style.opacity = String(ph === "done" ? 0 : op)
        }
        const bx = ph === "fly" || ph === "done" ? restX : sx, by = ph === "fly" || ph === "done" ? restY : sy
        const tension = ph === "pull" ? s.tension : 0
        for (const [el, x] of [[bandL.current, cx - half], [bandR.current, cx + half]] as const) {
            if (!el) continue
            const sag = (1 - tension) * 6
            el.setAttribute("d", `M ${x} ${tipY} Q ${(x + bx) / 2} ${(tipY + by) / 2 + sag} ${bx} ${by}`)
            el.setAttribute("stroke-width", String(7 - tension * 3.5))
        }
        if (vignette.current) vignette.current.style.opacity = String(tension * 0.85)
        if (clouds.current && !reduced) clouds.current.style.transform = `translateX(${((t * 6) % (w + 200)) - 100}px)`
    })

    const item = items[Math.min(idx, items.length - 1)]
    const wood = dark ? "#565B6C" : "#7D8494"
    const calm = stars.length / items.length
    return (
        <div ref={stage} style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: dark ? `linear-gradient(180deg, hsl(230,40%,${8 + calm * 6}%) 0%, hsl(${emo.calmHue},30%,${14 + calm * 6}%) 60%, #121318 100%)` : `linear-gradient(180deg, hsl(212,60%,${78 + calm * 8}%) 0%, hsl(${emo.calmHue},60%,${88 + calm * 4}%) 62%, #F2EEE7 100%)`, transition: "background 1.5s" }} />
            <div ref={clouds} style={{ position: "absolute", left: 0, top: horizon * 0.4, width: w, height: 60, opacity: dark ? 0.15 : 0.7, pointerEvents: "none" }}>
                {[0.1, 0.45, 0.8].map((x, i) => <span key={i} style={{ position: "absolute", left: `${x * 100}%`, top: i * 12, width: 90 + i * 30, height: 24, borderRadius: 99, background: "#fff", filter: "blur(4px)" }} />)}
            </div>
            {stars.map((s) => <i key={s.k} style={{ position: "absolute", left: s.x - 3, top: s.y - 3, width: 6, height: 6, borderRadius: "50%", background: "#fff", boxShadow: `0 0 12px 3px ${hsl(emo.calmHue, 90, 75, 0.8)}`, animation: reduced ? undefined : "tsrPulse 2.4s ease-in-out infinite" }} />)}
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <path d={`M 0 ${h * 0.86} Q ${w * 0.3} ${h * 0.78} ${w * 0.6} ${h * 0.84} T ${w} ${h * 0.8} L ${w} ${h} L 0 ${h} Z`} fill={dark ? "#15161D" : "#DCD6CB"} />
                <path ref={bandL} fill="none" stroke={hsl(emo.hue, 60, dark ? 60 : 46)} strokeLinecap="round" />
                <path d={`M ${cx - half} ${tipY} Q ${cx - half * 0.7} ${tipY + 70} ${cx} ${tipY + 92} Q ${cx + half * 0.7} ${tipY + 70} ${cx + half} ${tipY}`} fill="none" stroke={wood} strokeWidth="15" strokeLinecap="round" />
                <path d={`M ${cx - half} ${tipY} Q ${cx - half * 0.7} ${tipY + 70} ${cx} ${tipY + 92}`} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3" strokeLinecap="round" />
                <line x1={cx} y1={tipY + 90} x2={cx} y2={h + 10} stroke={wood} strokeWidth="19" strokeLinecap="round" />
                <path ref={bandR} fill="none" stroke={hsl(emo.hue, 60, dark ? 60 : 46)} strokeLinecap="round" />
            </svg>
            <div ref={vignette} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0, background: "radial-gradient(70% 60% at 50% 60%, transparent 40%, rgba(0,0,0,.35))" }} />
            <div ref={chip} className="rk-abs" style={{ padding: "10px 16px", borderRadius: 999, background: "var(--surface)", boxShadow: `var(--shadow-2), 0 0 24px ${hsl(emo.calmHue, 80, 70, 0.35)}`, cursor: phase === "ready" ? "grab" : "default", maxWidth: Math.min(240, w * 0.6), whiteSpace: "nowrap" }}>
                <WordBody item={item} size={stageFont(w, 0.92)} imgSize={30} style={{ whiteSpace: "nowrap" }} />
            </div>
        </div>
    )
}

/* ================================================================== */
/* 6. APP                                                              */
/* ================================================================== */

type Screen = "home" | "tune" | "match" | "ritual" | "reflect" | "rest"
type ThemePref = "system" | "light" | "dark"
type MotionPref = "system" | "reduce" | "full"
type Shift = "lighter" | "same" | "heavier"

const FINALE_TITLES: Record<string, string> = {
    Destroy: "Broken down.", Release: "Released.", Discard: "Gone.", Distance: "Farther away.", Detach: "Unhooked.", Reframe: "Seen differently.",
    Interrupt: "Interrupted.", Reveal: "Seen through.", Choice: "Chosen.", Absurdity: "Less serious now.", Balance: "Landed.",
}

function useMedia(query: string, fallback = false) {
    const [match, setMatch] = React.useState(() => {
        try { return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches } catch { return fallback }
    })
    React.useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const m = window.matchMedia(query)
        const on = () => setMatch(m.matches)
        on()
        m.addEventListener ? m.addEventListener("change", on) : m.addListener(on)
        return () => { m.removeEventListener ? m.removeEventListener("change", on) : m.removeListener(on) }
    }, [query])
    return match
}

/** Reads the device text size (iOS Dynamic Type via -apple-system-body) and keeps it in a comfortable range. */
function useBaseFontSize(fallback = 17) {
    const [size, setSize] = React.useState(fallback)
    React.useEffect(() => {
        if (typeof document === "undefined") return
        try {
            const probe = document.createElement("span")
            probe.style.cssText = "position:absolute;visibility:hidden;font:-apple-system-body"
            document.body.appendChild(probe)
            const px = parseFloat(getComputedStyle(probe).fontSize)
            probe.remove()
            const supported = typeof CSS !== "undefined" && CSS.supports && CSS.supports("font", "-apple-system-body")
            if (supported && Number.isFinite(px)) setSize(clamp(px, 15, 21))
        } catch { /* keep fallback */ }
    }, [])
    return size
}

function useElementSize(ref: React.RefObject<HTMLElement>) {
    const [size, setSize] = React.useState({ w: 0, h: 0 })
    React.useEffect(() => {
        const el = ref.current
        if (!el) return
        const read = () => setSize((s) => {
            const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight)
            return s.w === w && s.h === h ? s : { w, h }
        })
        read()
        if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", read); return () => window.removeEventListener("resize", read) }
        const ro = new ResizeObserver(read)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return size
}

/* ---------- Small controls ---------- */

function IconButton({ icon, label, onClick, disabled, on, dot, buttonRef }: { icon: string; label: string; onClick: () => void; disabled?: boolean; on?: boolean; dot?: boolean; buttonRef?: React.Ref<HTMLButtonElement> }) {
    return (
        <button ref={buttonRef} type="button" className={`tsr-icon ${on ? "on" : ""}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
            <Icon name={icon} />
            {dot ? <span className="dot" aria-hidden="true" /> : null}
        </button>
    )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="tsr-switch" onClick={() => onChange(!checked)} />
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
    return (
        <div className="tsr-seg" role="group" aria-label={label}>
            {options.map((o) => <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.l}</button>)}
        </div>
    )
}

/** 0–10 intensity slider with haptic detents and full keyboard support. */
function IntensitySlider({ value, onChange, label, marker }: { value: number; onChange: (v: number) => void; label: string; marker?: number | null }) {
    const ref = React.useRef<HTMLDivElement>(null)
    const [drag, setDrag] = React.useState(false)
    const set = (v: number) => {
        const n = clamp(Math.round(v), 0, 10)
        if (n !== value) { onChange(n); Haptics.fire("tick"); Sound.play("tick", 0.7 + n * 0.05) }
    }
    const fromX = (clientX: number) => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        set(((clientX - r.left - 16) / Math.max(1, r.width - 32)) * 10)
    }
    const pct = value / 10
    return (
        <div ref={ref} className={`tsr-slider ${drag ? "drag" : ""}`} role="slider" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value}
            onPointerDown={(e) => { e.preventDefault(); setDrag(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); fromX(e.clientX) }}
            onPointerMove={(e) => { if (drag) fromX(e.clientX) }}
            onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)}
            onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); set(value + 1) }
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); set(value - 1) }
                if (e.key === "Home") { e.preventDefault(); set(0) }
                if (e.key === "End") { e.preventDefault(); set(10) }
            }}>
            <div className="track"><div className="fill" style={{ width: `calc(16px + (100% - 32px) * ${pct})` }} /></div>
            <div className="ticks" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <i key={i} style={{ opacity: marker === i ? 1 : undefined, height: marker === i ? 9 : undefined, background: marker === i ? "var(--ink-2)" : undefined }} />)}</div>
            <div className="knob" style={{ left: `calc(16px + (100% - 32px) * ${pct})` }} />
        </div>
    )
}

/* ---------- Ritual host: the environment, the companion, the hint, the finale ---------- */

function RitualHost(props: {
    ritual: RitualMeta; items: Item[]; phrase: string; emo: Emotion; faces: string[]; char: CharSlug; dark: boolean; reduced: boolean
    intensity: number | null; runKey: number; completed: boolean; onComplete: () => void; onContinue: () => void; onRestart: () => void; onProgress: (p: number) => void
}) {
    const { ritual, emo, faces, reduced, completed } = props
    const stageRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const size = useElementSize(stageRef)
    const particles = React.useRef<ReturnType<typeof createParticles> | null>(null)
    const [progress, setProgress] = React.useState(completed ? 1 : 0)
    const [hint, setHint] = React.useState<string | null>(null)
    const [showContinue, setShowContinue] = React.useState(completed)
    const hintTimer = React.useRef(0)
    const startRef = React.useRef(Date.now())

    React.useEffect(() => {
        if (!canvasRef.current) return
        particles.current = createParticles(canvasRef.current)
        return () => particles.current?.destroy()
    }, [])
    React.useEffect(() => { particles.current?.resize() }, [size.w, size.h])
    React.useEffect(() => { particles.current?.setAdditive(props.dark) }, [props.dark])
    // Touch is always answered: a soft ring where you press, a faint light trail where you move.
    React.useEffect(() => {
        const el = stageRef.current
        if (!el || reduced) return
        let lastTrail = 0
        const pos = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
        const down = (e: PointerEvent) => { const p = pos(e); particles.current?.burst(p.x, p.y, { kind: "ring", n: 1, size: 26, color: hsl(emo.calmHue, 80, props.dark ? 80 : 55, 0.6), life: 0.5 }) }
        const move = (e: PointerEvent) => {
            if (!e.buttons && e.pointerType === "mouse") return
            const now = performance.now()
            if (now - lastTrail < 34) return
            lastTrail = now
            const p = pos(e)
            particles.current?.burst(p.x, p.y, { kind: "glow", n: 1, size: 3.5, speed: 6, color: hsl(emo.calmHue, 90, props.dark ? 75 : 60, 0.5), life: 0.6 })
        }
        el.addEventListener("pointerdown", down, { passive: true })
        el.addEventListener("pointermove", move, { passive: true })
        return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move) }
    }, [reduced, emo.calmHue, props.dark])
    const noteStep = React.useRef(0)
    React.useEffect(() => { setProgress(completed ? 1 : 0); setHint(null); setShowContinue(completed); startRef.current = Date.now(); noteStep.current = 0 }, [props.runKey])
    React.useEffect(() => () => window.clearTimeout(hintTimer.current), [])

    const fx: FX = React.useMemo(() => ({
        sound: (n, p) => Sound.play(n, p),
        loop: (k) => Sound.loop(k),
        haptic: (k = "light") => Haptics.fire(k),
        burst: (x, y, o) => { if (!reduced || o?.kind === "ring") particles.current?.burst(x, y, reduced ? { ...o, n: Math.min(4, o?.n ?? 4) } : o) },
        reduced,
    }), [reduced])

    const onProgress = React.useCallback((p: number) => {
        const v = clamp(p, 0, 1)
        setProgress(v)
        props.onProgress(v)
        // Every eighth of the way, a soft note in a rising scale.
        const s = Math.floor(v * 8 + 1e-6)
        if (s > noteStep.current && v < 1) { noteStep.current = s; Sound.note(PENTA[Math.min(7, s - 1)], "sine", 1.1, 0.03) }
        if (v === 0) noteStep.current = 0
    }, [props.onProgress])
    const onDone = React.useCallback(() => {
        setProgress(1)
        props.onComplete()
        Sound.play("complete")
        Haptics.fire("success")
        const s = stageRef.current
        if (s && !reduced) {
            const cx = s.clientWidth / 2, cy = s.clientHeight * 0.42
            particles.current?.burst(cx, cy, { kind: "glow", n: 1, size: 70, color: hsl(emo.calmHue, 80, 75, 0.55), life: 1.4 })
            particles.current?.burst(cx, cy, { kind: "ring", n: 1, size: Math.min(s.clientWidth, s.clientHeight) * 0.35, color: hsl(emo.calmHue, 80, 75, 0.7), life: 1.1 })
            particles.current?.burst(cx, cy, { kind: "spark", n: 36, size: 2.4, speed: 260, color: [hsl(emo.calmHue, 90, 80), "#FFFFFF", hsl(emo.calmHue + 30, 90, 75)], life: 1.3 })
        }
        window.setTimeout(() => setShowContinue(true), reduced ? 200 : 900)
    }, [props.onComplete, reduced, emo.calmHue])
    const onHint = React.useCallback((t: string | null, sticky = false) => {
        window.clearTimeout(hintTimer.current)
        setHint(t)
        if (t && !sticky) hintTimer.current = window.setTimeout(() => setHint(null), 4200)
    }, [])

    const Comp = RITUAL_COMPONENTS[ritual.id]
    const step = completed ? 3 : progress < 0.34 ? 0 : progress < 0.67 ? 1 : progress < 0.999 ? 2 : 3
    const shownHint = completed ? null : hint || ritual.hint
    return (
        <div className="tsr-ritual">
            <div className="tsr-rhead">
                <Companion faces={faces} step={step} size={46} ring progress={progress} breathe={false} label={`${CHAR_NAMES[props.char]}, ${step >= 2 ? "easing" : "feeling it"}`} />
                <div className="nm">
                    <b>{ritual.name}</b>
                    <span>{ritual.prompt}</span>
                </div>
                <IconButton icon="restart" label="Restart this ritual" onClick={props.onRestart} />
            </div>
            <div className="tsr-stagewrap">
                <div className="tsr-stage" ref={stageRef}>
                    {Comp && size.w > 40 && size.h > 40 && !completed ? (
                        <Comp key={props.runKey} items={props.items} phrase={props.phrase} emo={emo} char={props.char} faces={faces} w={size.w} h={size.h} dark={props.dark} reduced={reduced} fx={fx}
                            intensity={props.intensity} progress={onProgress} done={onDone} hint={onHint} />
                    ) : null}
                    {!completed ? <AmbientLayer hue={emo.hue} calmHue={emo.calmHue} progress={progress} dark={props.dark} reduced={reduced} /> : null}
                    <canvas ref={canvasRef} className="fx" aria-hidden="true" />
                    <AnimatePresence>
                        {progress >= 1 && (showContinue || completed) ? (
                            <motion.div className="tsr-finale" key="finale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0.15 : 0.6 }}>
                                <div className="veil" />
                                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 180, damping: 18, delay: 0.05 }}>
                                    <Companion faces={faces} step={3} size={104} ring progress={1} breathe={!reduced} label={`${CHAR_NAMES[props.char]}, calmer`} />
                                </motion.div>
                                <motion.h2 className="t-title" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: reduced ? 0 : 0.18, ...SPRING_SOFT }}>{FINALE_TITLES[ritual.family] || "Done."}</motion.h2>
                                <motion.p className="t-sub" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: reduced ? 0 : 0.28, ...SPRING_SOFT }}>{ritual.reflection}</motion.p>
                                <motion.button type="button" className="tsr-btn" style={{ position: "relative", minWidth: 200, marginTop: 6 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: reduced ? 0 : 0.42, ...SPRING_SOFT }} onClick={props.onContinue}>
                                    Continue
                                </motion.button>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
            <div className="tsr-rfoot">
                <AnimatePresence mode="wait">
                    {shownHint ? (
                        <motion.p key={shownHint} className="tsr-hint" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }} aria-live="polite">{shownHint}</motion.p>
                    ) : <span key="none" />}
                </AnimatePresence>
            </div>
        </div>
    )
}

/* ---------- Screens ---------- */

const greeting = () => {
    const h = new Date().getHours()
    return h < 5 ? "Still up?" : h < 12 ? "Good morning." : h < 17 ? "Good afternoon." : "Good evening."
}

const screenMotion = (reduced: boolean) => reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 36 } }, exit: { opacity: 0, y: -6, transition: { duration: 0.12, ease: "easeIn" } } }

interface Prefs { theme: ThemePref; sfx: boolean; music: boolean; volume: number; haptics: boolean; motion: MotionPref; checkin: boolean; keepHistory: boolean }

/* ---------- Main component ---------- */

export default function ThinkStillRelease(props: any) {
    const {
        title = "ThinkStill Release",
        theme: themeDefault = "system",
        splash: splashOn = true,
        fillViewport = false,
        soundOn = true,
        hapticsOn = true,
        musicOnDefault = false,
        musicVolume = 0.35,
        musicUrl = "",
        eosCheckin = true,
        newRituals = true,
        defaultFaces = true,
        assetBase = DEFAULT_FACE_BASE,
        eosCrisisLines = SUPPORT_DEFAULTS.lines,
        eosCrisisUrl = SUPPORT_DEFAULTS.url,
        eosEmergencyText = SUPPORT_DEFAULTS.emergency,
        eosShareUrl = "",
        onClose,
        style,
    } = props
    FACE_BASE = String(assetBase || DEFAULT_FACE_BASE).replace(/\/?$/, "/")

    /* ----- preferences ----- */
    const [prefs, setPrefs] = React.useState<Prefs>(() => {
        const storedTheme = lsRaw(KEYS.theme)
        const storedSfx = lsRaw(KEYS.sfx), storedMusic = lsRaw(KEYS.music), storedMotion = lsRaw(KEYS.motion)
        const vol = Number(lsRaw(KEYS.musicVolume))
        const p = getPrefs()
        return {
            theme: (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : themeDefault) as ThemePref,
            sfx: storedSfx == null ? !!soundOn : storedSfx === "true",
            music: storedMusic == null ? !!musicOnDefault : storedMusic === "true",
            volume: Number.isFinite(vol) && lsRaw(KEYS.musicVolume) != null ? clamp(vol, 0, 1) : clamp(Number(musicVolume) || 0.35, 0, 1),
            haptics: lsRaw(KEYS.haptics) == null ? !!hapticsOn : lsRaw(KEYS.haptics) !== "false",
            motion: (storedMotion === "reduce" || storedMotion === "full" ? storedMotion : p.calmVisuals ? "reduce" : "system") as MotionPref,
            checkin: !!eosCheckin,
            keepHistory: p.keepHistory !== false,
        }
    })
    const updatePrefs = (patch: Partial<Prefs>) => {
        setPrefs((p) => {
            const next = { ...p, ...patch }
            if (patch.theme) lsSetRaw(KEYS.theme, patch.theme)
            if (patch.sfx != null) lsSetRaw(KEYS.sfx, String(patch.sfx))
            if (patch.music != null) lsSetRaw(KEYS.music, String(patch.music))
            if (patch.volume != null) lsSetRaw(KEYS.musicVolume, String(patch.volume))
            if (patch.haptics != null) lsSetRaw(KEYS.haptics, String(patch.haptics))
            if (patch.motion) { lsSetRaw(KEYS.motion, patch.motion); setPref("calmVisuals", patch.motion === "reduce") }
            if (patch.keepHistory != null) setPref("keepHistory", patch.keepHistory)
            return next
        })
    }
    React.useEffect(() => { setPrefs((p) => ({ ...p, checkin: !!eosCheckin })) }, [eosCheckin])

    const systemDark = useMedia("(prefers-color-scheme: dark)")
    const systemReduced = useMedia("(prefers-reduced-motion: reduce)")
    const dark = prefs.theme === "dark" || (prefs.theme === "system" && systemDark)
    const reduced = prefs.motion === "reduce" || (prefs.motion === "system" && systemReduced)
    const baseFont = useBaseFontSize(17)
    React.useEffect(() => { Sound.setEnabled(prefs.sfx) }, [prefs.sfx])
    React.useEffect(() => { Haptics.setEnabled(prefs.haptics) }, [prefs.haptics])

    /* ----- flow state ----- */
    const [screen, setScreen] = React.useState<Screen>("home")
    const [past, setPast] = React.useState<Screen[]>([])
    const [future, setFuture] = React.useState<Screen[]>([])
    const [text, setText] = React.useState("")
    const [emotion, setEmotion] = React.useState<string | null>(null)
    const [images, setImages] = React.useState<string[]>([])
    const [before, setBefore] = React.useState<number | null>(null)
    const [tuneValue, setTuneValue] = React.useState(6)
    const [after, setAfter] = React.useState(6)
    const [ritualId, setRitualId] = React.useState<number | null>(null)
    const [doneIds, setDoneIds] = React.useState<number[]>([])
    const [runKey, setRunKey] = React.useState(0)
    const [completedId, setCompletedId] = React.useState<string | null>(null)
    const [progress, setProgress] = React.useState(0)
    const [shift, setShift] = React.useState<Shift | null>(null)
    const [recorded, setRecorded] = React.useState(false)
    const [flag, setFlag] = React.useState<SafetyFlag>(null)
    const [path, setPath] = React.useState<number[]>([])
    const [act, setAct] = React.useState(1)
    const [listening, setListening] = React.useState(false)
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [supportOpen, setSupportOpen] = React.useState(false)
    const [confirm, setConfirm] = React.useState<null | "back" | "close">(null)
    const [toast, setToast] = React.useState<string | null>(null)
    const [closed, setClosed] = React.useState(false)
    const [showSplash, setShowSplash] = React.useState(() => {
        if (!splashOn) return false
        try { return !sessionStorage.getItem("ts_release_splash_v21") } catch { return true }
    })
    const skip = React.useRef<Set<number>>(new Set())
    const carryBefore = React.useRef<number | null | undefined>(undefined)
    const startedAt = React.useRef(0)
    const toastTimer = React.useRef(0)
    const recog = React.useRef<any>(null)
    const fileInput = React.useRef<HTMLInputElement>(null)
    const rootRef = React.useRef<HTMLDivElement>(null)
    const settingsBtn = React.useRef<HTMLButtonElement>(null)
    const seed = React.useRef(Date.now() % 100003 + 1)

    const universe = React.useMemo(() => (newRituals ? [...LAUNCH_IDS, ...BRIEF_IDS] : LAUNCH_IDS.slice()), [newRituals])
    const emo = emotionOf(emotion)
    const detected = React.useMemo(() => (!emotion && text.trim() ? detectEmotion(text) : null), [emotion, text])
    const feelEmo = emotion ? emo : detected ? emotionOf(detected.id) : AUTO_EMOTION
    const ritual = ritualId != null ? RITUAL_BY_ID[ritualId] : null
    const char: CharSlug = feelEmo.id === "auto" && ritual?.hero ? ritual.hero : feelEmo.char
    const faces = React.useMemo(() => faceLadder(feelEmo, feelEmo.id === "auto" && ritual?.hero ? ritual.hero : undefined), [feelEmo.id, ritual?.hero, assetBase])
    const completed = ritual != null && completedId === `${ritual.id}:${runKey}`
    const routeKey = feelEmo.id === "auto" ? "general" : feelEmo.id
    const musicKey = ritual ? ({ Destroy: "rush", Discard: "drop", Distance: "still", Detach: "patch", Reframe: "glitch", Interrupt: "sync", Rhythm: "loopie", Balance: "still", Sort: "glitch", Choice: "sync", Reveal: "glitch", Absurdity: "loopie", Release: "drop" } as Record<string, string>)[ritual.family] || "drop" : "drop"
    const hasMusic = useSharedMusic(prefs.music && !closed, prefs.volume, musicKey, musicUrl)

    // Compatibility with V19: other ThinkStill components read the uploaded thought images from window.
    React.useEffect(() => {
        try { (window as any).__tsUploadedThoughtImage = images[0] || null; (window as any).__tsUploadedThoughtImages = images } catch { /* ignore */ }
        return () => { try { (window as any).__tsUploadedThoughtImage = null; (window as any).__tsUploadedThoughtImages = [] } catch { /* ignore */ } }
    }, [images.join("|")])

    const items = React.useMemo(() => ritual ? buildItems({ text, emo: feelEmo, flag, count: ritual.count, images, defaultFaces: !!defaultFaces, char, ritualId: ritual.id }) : [], [ritual?.id, text, feelEmo.id, flag, images.join("|"), defaultFaces, char, runKey])

    const say = (msg: string) => {
        window.clearTimeout(toastTimer.current)
        setToast(msg)
        toastTimer.current = window.setTimeout(() => setToast(null), 2600)
    }
    React.useEffect(() => () => { window.clearTimeout(toastTimer.current); try { recog.current?.abort() } catch { /* ignore */ } }, [])

    /* ----- keyboard inset (mobile) ----- */
    React.useEffect(() => {
        const vv = typeof window !== "undefined" ? (window as any).visualViewport : null
        const root = rootRef.current
        if (!vv || !root) return
        const on = () => {
            const r = root.getBoundingClientRect()
            const bottomHidden = Math.max(0, r.bottom - (vv.height + vv.offsetTop))
            root.style.setProperty("--kb", `${Math.round(bottomHidden)}px`)
        }
        vv.addEventListener("resize", on)
        vv.addEventListener("scroll", on)
        return () => { vv.removeEventListener("resize", on); vv.removeEventListener("scroll", on) }
    }, [])

    /* ----- dev deep link: ?tsrdev=1&ritual=18&emotion=anger&text=… opens a ritual directly ----- */
    React.useEffect(() => {
        try {
            const q = new URLSearchParams(window.location.search)
            if (q.get("tsrdev") !== "1") return
            const id = Number(q.get("ritual"))
            const e = q.get("emotion")
            if (e && EMO[e]) setEmotion(e)
            if (q.get("text")) setText(String(q.get("text")).slice(0, 240))
            if (q.get("before")) setBefore(clamp(Number(q.get("before")), 0, 10))
            setShowSplash(false)
            if (RITUAL_BY_ID[id]) { setRitualId(id); setRunKey((k) => k + 1); startedAt.current = Date.now(); setPast(["home", "match"]); setScreen("ritual") }
        } catch { /* ignore */ }
    }, [])

    /* ----- splash ----- */
    React.useEffect(() => {
        if (!showSplash) return
        const id = window.setTimeout(() => { setShowSplash(false); try { sessionStorage.setItem("ts_release_splash_v21", "1") } catch { /* ignore */ } }, reduced ? 500 : 1700)
        return () => window.clearTimeout(id)
    }, [showSplash])

    /* ----- navigation ----- */
    const go = (next: Screen) => {
        setPast((p) => [...p, screen].slice(-20))
        setFuture([])
        setScreen(next)
        setSettingsOpen(false)
    }
    const ritualInProgress = screen === "ritual" && !completed && progress > 0.02
    const doBack = () => {
        if (!past.length) return
        const prev = past[past.length - 1]
        setPast((p) => p.slice(0, -1))
        setFuture((f) => [screen, ...f].slice(0, 20))
        setScreen(prev)
        stopVoice()
    }
    const back = () => { Sound.unlock(); if (ritualInProgress) { setConfirm("back"); return } doBack() }
    const canForward = future.length > 0 && !(future[0] === "reflect" && !completed) && !(future[0] === "ritual" && ritualId == null)
    const forward = () => {
        if (!canForward) return
        const next = future[0]
        setFuture((f) => f.slice(1))
        setPast((p) => [...p, screen].slice(-20))
        setScreen(next)
    }
    const resetFlow = () => {
        setText(""); setEmotion(null); setImages([]); setBefore(null); setTuneValue(6); setAfter(6)
        setRitualId(null); setDoneIds([]); setCompletedId(null); setProgress(0); setShift(null); setRecorded(false); setFlag(null); setPath([]); setAct(1)
        skip.current = new Set()
        carryBefore.current = undefined
        setPast([]); setFuture([]); setScreen("home")
    }
    const doClose = () => {
        Haptics.fire("light")
        recordIfNeeded()
        stopVoice()
        if (typeof onClose === "function") { try { onClose() } catch { /* ignore */ } }
        resetFlow()
        setClosed(true)
    }
    const close = () => { if (ritualInProgress) { setConfirm("close"); return } doClose() }

    /* ----- voice ----- */
    const stopVoice = () => { try { recog.current?.stop() } catch { /* ignore */ } setListening(false) }
    const toggleVoice = () => {
        Sound.unlock()
        if (listening) { stopVoice(); return }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) { say("Voice input isn't available in this browser"); return }
        try {
            const r = new SR()
            r.lang = (navigator.language || "en-US")
            r.interimResults = true
            r.continuous = false
            const base = text.trim()
            r.onresult = (e: any) => {
                let out = ""
                for (let i = 0; i < e.results.length; i++) out += e.results[i][0].transcript
                setText((base ? base + " " : "") + out.trim())
            }
            r.onerror = (e: any) => { setListening(false); if (e?.error === "not-allowed" || e?.error === "service-not-allowed") say("Microphone access is blocked"); else if (e?.error !== "aborted" && e?.error !== "no-speech") say("Voice input stopped") }
            r.onend = () => setListening(false)
            recog.current = r
            r.start()
            setListening(true)
            Haptics.fire("light")
        } catch { setListening(false); say("Voice input couldn't start") }
    }

    /* ----- images ----- */
    const addImages = async (files: FileList | null) => {
        if (!files || !files.length) return
        const allowed = Array.from(files).filter((f) => /^image\/(jpeg|png|gif)$/i.test(f.type) || /\.(jpe?g|png|gif)$/i.test(f.name))
        if (!allowed.length) { say("Only JPG, PNG and GIF images are supported"); return }
        const read = (f: File) => new Promise<string>((resolve, reject) => {
            const fr = new FileReader()
            fr.onerror = () => reject(fr.error)
            fr.onload = () => {
                const src = String(fr.result || "")
                if (/gif$/i.test(f.type)) { resolve(src); return }
                const img = new Image()
                img.onload = () => {
                    // Downscale large photos so rituals stay smooth on older phones.
                    const max = 512
                    const k = Math.min(1, max / Math.max(img.width, img.height))
                    if (k >= 1) { resolve(src); return }
                    const c = document.createElement("canvas")
                    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
                    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height)
                    resolve(c.toDataURL("image/jpeg", 0.86))
                }
                img.onerror = () => reject(new Error("Image could not be read"))
                img.src = src
            }
            fr.readAsDataURL(f)
        })
        try {
            const urls = await Promise.all(allowed.slice(0, 6).map(read))
            setImages((prev) => [...prev, ...urls].slice(0, 6))
            Haptics.fire("light")
        } catch { say("That image couldn't be read") }
    }

    /* ----- routing ----- */
    const context = (overrideBefore?: number | null) => makeContext({ text, emotion: emotion || (detected ? detected.id : null), before: overrideBefore !== undefined ? overrideBefore : before, flag, path, seed: seed.current })
    const chooseRitual = (opts: { exclude?: number | null } = {}) => {
        const id = pickRitual(context(), universe, { exclude: opts.exclude ?? null, skip: skip.current })
        return id ?? universe[0]
    }
    const proceedFromHome = () => {
        Sound.unlock()
        stopVoice()
        const f = safetyScan(text)
        const strongest = strongerFlag(flag, f)
        setFlag(strongest)
        if (isStrongFlag(f) && !isStrongFlag(flag)) setSupportOpen(true)
        if (prefs.checkin) {
            setTuneValue(before ?? (detected ? detected.intensity : feelEmo.dial))
            go("tune")
        } else {
            const id = pickRitual(makeContext({ text, emotion: emotion || (detected ? detected.id : null), before: null, flag: strongest, path, seed: seed.current }), universe, { skip: skip.current })
            setRitualId(id ?? universe[0])
            go("match")
        }
    }
    const proceedFromTune = (value: number | null) => {
        setBefore(value)
        setAfter(value ?? 6)
        const id = pickRitual(context(value), universe, { skip: skip.current })
        setRitualId(id ?? universe[0])
        go("match")
    }
    const shuffle = () => {
        if (ritualId != null) skip.current.add(ritualId)
        let id = chooseRitual({ exclude: ritualId })
        if (id === ritualId) { skip.current = new Set([ritualId!]); id = chooseRitual({ exclude: ritualId }) }
        setRitualId(id)
        Haptics.fire("light")
        Sound.play("tap")
    }
    const begin = () => {
        if (ritualId == null) return
        Sound.unlock()
        if (carryBefore.current !== undefined) {
            if (carryBefore.current != null) setBefore(carryBefore.current)
            setAct((a) => a + 1)
            carryBefore.current = undefined
        }
        setRunKey((k) => k + 1)
        setCompletedId(null)
        setProgress(0)
        setShift(null)
        setRecorded(false)
        startedAt.current = Date.now()
        go("ritual")
    }
    const onRitualComplete = () => {
        if (ritualId == null) return
        setCompletedId(`${ritualId}:${runKey}`)
        setProgress(1)
        noteRitualPlayed(ritualId)
        setPath((p) => [...p, ritualId].slice(-8))
        setDoneIds((d) => [...d, ritualId])
        skip.current.delete(ritualId)
    }
    const restartRitual = () => { setRunKey((k) => k + 1); setCompletedId(null); setProgress(0); startedAt.current = Date.now(); Haptics.fire("light") }
    const toReflect = () => { setAfter(before ?? 6); setShift(null); go("reflect") }

    function recordIfNeeded(afterValue?: number | null) {
        if (recorded || ritualId == null || !completed) return
        pushSession({ emo: routeKey, before, after: afterValue === undefined ? (shift ? after : null) : afterValue, gameId: ritualId, ms: Date.now() - startedAt.current, act })
        setRecorded(true)
    }
    const saveReflection = (s: Shift, afterValue: number | null) => {
        setShift(s)
        if (ritualId != null && completed && !recorded) {
            pushSession({ emo: routeKey, before, after: afterValue, gameId: ritualId, ms: Date.now() - startedAt.current, act })
            setRecorded(true)
        }
        Haptics.fire(s === "lighter" ? "success" : "light")
        Sound.play(s === "lighter" ? "chime" : "tap")
    }
    const nextRitual = (mode: Shift) => {
        if (ritualId == null) return
        const ctx = context(before != null ? after : null)
        const id = pickFollowUp(ctx, universe, ritualId, mode, skip.current) ?? chooseRitual({ exclude: ritualId })
        // The check-in stays intact (Back returns to it) until the next ritual actually begins.
        carryBefore.current = before != null ? after : null
        setRitualId(id)
        go("match")
    }
    const finish = () => { recordIfNeeded(); go("rest") }

    /* ----- global keys ----- */
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return
            if (settingsOpen) setSettingsOpen(false)
            else if (supportOpen) setSupportOpen(false)
            else if (confirm) setConfirm(null)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [settingsOpen, supportOpen, confirm])

    /* ----- derived visuals ----- */
    const skyProgress = screen === "ritual" ? progress : screen === "reflect" || screen === "rest" ? 1 : 0
    const rootStyle: React.CSSProperties = {
        ...(style || {}),
        ...({ "--fs": `${baseFont}px`, "--h": feelEmo.hue, "--ch": feelEmo.calmHue } as any),
    }
    const lines = String(eosCrisisLines || SUPPORT_DEFAULTS.lines).split("|").map((s) => s.trim()).filter(Boolean)
    const weekCount = React.useMemo(() => { const since = Date.now() - 7 * 864e5; return getSessions().filter((r) => r && r.t > since).length }, [screen])

    if (closed) {
        return (
            <div ref={rootRef} className={`tsr ${fillViewport ? "isFill" : ""}`} data-theme={dark ? "dark" : "light"} data-reduced={reduced ? "1" : "0"} style={rootStyle}>
                <style>{STYLES}</style>
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
                        <EclipseMark size={44} />
                        <p className="t-sub">ThinkStill is resting.</p>
                        <button type="button" className="tsr-btn ghost" onClick={() => setClosed(false)}>Open again</button>
                    </div>
                </div>
            </div>
        )
    }

    const sm = screenMotion(reduced)
    const wide = (rootRef.current?.clientWidth || 390) >= 460

    return (
        <div ref={rootRef} className={`tsr ${fillViewport ? "isFill" : ""}`} data-theme={dark ? "dark" : "light"} data-reduced={reduced ? "1" : "0"} style={rootStyle} onPointerDown={() => Sound.unlock()}>
            <style>{STYLES}</style>
            <div className="tsr-sky" aria-hidden="true">
                <i className="a" style={{ opacity: 1 - skyProgress * 0.8 }} />
                <i className="b" style={{ opacity: 0.25 + skyProgress * 0.75 }} />
                <div className="grain" />
            </div>

            <header className="tsr-bar">
                <div className="grp">
                    <IconButton icon="back" label="Back" onClick={back} disabled={!past.length} />
                    <IconButton icon="forward" label="Forward" onClick={forward} disabled={!canForward} />
                </div>
                <div className="tsr-bar-mid" aria-hidden={!wide}>
                    <EclipseMark size={22} />
                    {wide ? <span className="ttl">{title}</span> : null}
                </div>
                <div className="grp">
                    <IconButton icon={prefs.music ? "music" : "musicOff"} label={prefs.music ? "Music on" : "Music off"} on={prefs.music && hasMusic}
                        onClick={() => { const v = !prefs.music; updatePrefs({ music: v }); if (v && !hasMusic) say("No shared music source is set yet") }} />
                    <IconButton buttonRef={settingsBtn} icon="settings" label="Settings" on={settingsOpen} onClick={() => { setSettingsOpen((o) => !o); setSupportOpen(false) }} />
                    <IconButton icon="support" label="Support" dot={isStrongFlag(flag)} onClick={() => { setSupportOpen(true); setSettingsOpen(false) }} />
                    <IconButton icon="close" label="Close" onClick={close} />
                </div>
            </header>

            <main className="tsr-main">
                <AnimatePresence mode="wait" initial={false}>
                    {screen === "home" ? (
                        <motion.section key="home" className="tsr-screen" {...(sm as any)} aria-label="Tell ThinkStill what you're carrying">
                            <div className="tsr-col">
                                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
                                    <Companion faces={emotion ? faceLadder(emo) : detected ? faceLadder(emotionOf(detected.id)) : faceLadder(AUTO_EMOTION)} step={emotion || detected ? 0 : 2} size={62} breathe={!reduced} />
                                    <div style={{ minWidth: 0 }}>
                                        <p className="t-sub">{greeting()}</p>
                                        <h1 className="t-large">What are you carrying?</h1>
                                    </div>
                                </div>
                                <div className="tsr-card tsr-compose" style={{ marginTop: 18 }}>
                                    <label htmlFor="tsr-text" className="sr-only">Type what's on your mind</label>
                                    <textarea id="tsr-text" value={text} maxLength={240} rows={3} placeholder="Type it as it is. A few words is enough."
                                        onChange={(e) => setText(e.target.value)}
                                        onFocus={(e) => { const t = e.currentTarget; window.setTimeout(() => { try { t.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }) } catch { /* ignore */ } }, 280) }} />
                                    {images.length ? (
                                        <div className="tsr-thumbs">
                                            {images.map((src, i) => (
                                                <div key={i} className="tsr-thumb">
                                                    <img src={src} alt={`Your image ${i + 1}`} />
                                                    <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => setImages((im) => im.filter((_, j) => j !== i))}><Icon name="x" size={12} stroke={2.6} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    <div className="tools">
                                        <button type="button" className={`tsr-tool ${listening ? "live" : ""}`} onClick={toggleVoice} aria-pressed={listening} aria-label={listening ? "Stop voice input" : "Speak instead"}>
                                            <Icon name="mic" size={19} />{listening ? "Listening" : null}
                                        </button>
                                        <button type="button" className="tsr-tool" onClick={() => fileInput.current?.click()} aria-label="Add an image" disabled={images.length >= 6}>
                                            <Icon name="image" size={19} />
                                        </button>
                                        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/gif" multiple hidden onChange={(e) => { addImages(e.target.files); e.currentTarget.value = "" }} />
                                        <span className="grow" />
                                        {text.length > 180 ? <span className="count">{240 - text.length}</span> : null}
                                    </div>
                                </div>
                                <p className="t-eyebrow" style={{ marginTop: 22, marginBottom: 10 }}>{detected && !emotion ? `Sounds like ${emotionOf(detected.id).label.toLowerCase()} — or choose` : "Or choose a feeling"}</p>
                                <div className="tsr-chips" role="group" aria-label="Feelings">
                                    {[...EMOTIONS, AUTO_EMOTION].map((e) => {
                                        const sel = emotion === e.id
                                        const sug = !emotion && detected?.id === e.id
                                        return (
                                            <button key={e.id} type="button" className={`tsr-chip ${sel ? "sel" : ""} ${sug ? "sug" : ""}`} aria-pressed={sel}
                                                onClick={() => { setEmotion(sel ? null : e.id); Haptics.fire("tick"); Sound.play("tap", 1 + (EMOTIONS.indexOf(e) % 5) * 0.05) }}>
                                                <span className="sw"><img src={faceUrl(e.char, e.loud)} alt="" loading="lazy" onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.visibility = "hidden" }} /></span>
                                                {e.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="tsr-spacer" />
                                <button type="button" className="tsr-btn block" style={{ marginTop: 22 }} onClick={proceedFromHome}>
                                    {text.trim() || emotion || images.length ? "Continue" : "Just begin"}
                                </button>
                            </div>
                        </motion.section>
                    ) : null}

                    {screen === "tune" ? (
                        <motion.section key="tune" className="tsr-screen" {...(sm as any)} aria-label="How loud is it">
                            <div className="tsr-col" style={{ alignItems: "center", textAlign: "center" }}>
                                <div className="tsr-spacer" />
                                <Companion faces={faceLadder(feelEmo)} step={feelEmo.better === "up" ? (tuneValue >= 7 ? 3 : tuneValue >= 4 ? 2 : 1) : tuneValue >= 7 ? 0 : tuneValue >= 4 ? 1 : tuneValue >= 2 ? 2 : 3} size={132} breathe={!reduced} label={CHAR_NAMES[feelEmo.char]} />
                                <h1 className="t-title" style={{ marginTop: 26 }}>{feelEmo.question[0]}</h1>
                                <div className="tsr-big-num" style={{ marginTop: 10 }} aria-hidden="true">{tuneValue}</div>
                                <div style={{ width: "100%", maxWidth: 420, marginTop: 8 }}>
                                    <IntensitySlider value={tuneValue} onChange={setTuneValue} label={feelEmo.question[0]} />
                                    <div className="tsr-scale"><span>{feelEmo.scale[0]}</span><span>{feelEmo.scale[1]}</span></div>
                                </div>
                                <div className="tsr-spacer" />
                                <div className="tsr-stack" style={{ width: "100%", marginTop: 24 }}>
                                    <button type="button" className="tsr-btn block" onClick={() => proceedFromTune(tuneValue)}>Find my ritual</button>
                                    <button type="button" className="tsr-btn plain" onClick={() => proceedFromTune(null)}>Skip</button>
                                </div>
                            </div>
                        </motion.section>
                    ) : null}

                    {screen === "match" && ritual ? (
                        <motion.section key="match" className="tsr-screen" {...(sm as any)} aria-label="Your ritual">
                            <div className="tsr-col">
                                {isStrongFlag(flag) ? (
                                    <div className="tsr-card" style={{ padding: "14px 16px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
                                        <span style={{ color: "var(--danger)" }}><Icon name="support" /></span>
                                        <p className="t-sub" style={{ flex: 1, color: "var(--ink)" }}>You don't have to hold this alone. Support is one tap away.</p>
                                        <button type="button" className="tsr-btn small" onClick={() => setSupportOpen(true)}>Support</button>
                                    </div>
                                ) : null}
                                <div className="tsr-spacer" style={{ maxHeight: 40 }} />
                                <p className="t-eyebrow">A ritual for this</p>
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div key={ritual.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={reduced ? { duration: 0.12 } : SPRING_SOFT}>
                                        <div className="tsr-card tsr-match" style={{ marginTop: 10 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                                <Companion faces={faces} step={0} size={58} breathe={!reduced} label={CHAR_NAMES[char]} />
                                                <div style={{ minWidth: 0 }}>
                                                    <h1 className="t-large" style={{ fontSize: "1.7em" }}>{ritual.name}</h1>
                                                    <p className="t-sub" style={{ marginTop: 2 }}>{ritual.prompt}</p>
                                                </div>
                                            </div>
                                            <div className="words">
                                                {buildItems({ text, emo: feelEmo, flag, count: ritual.count, images: [], defaultFaces: false, char, ritualId: ritual.id }).map((it) => <span key={it.key} className="word">{it.text}</span>)}
                                            </div>
                                            <div className="tsr-meta">
                                                <span><Icon name="clock" size={15} /> About {ritual.seconds} seconds</span>
                                                <span><Icon name="hand" size={15} /> {ritual.hint}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                                <div className="tsr-spacer" />
                                <div className="tsr-stack" style={{ marginTop: 22 }}>
                                    <button type="button" className="tsr-btn block" onClick={begin}>Begin</button>
                                    <button type="button" className="tsr-btn ghost block" onClick={shuffle}><Icon name="shuffle" /> Another ritual</button>
                                </div>
                            </div>
                        </motion.section>
                    ) : null}

                    {screen === "ritual" && ritual ? (
                        <motion.section key={"ritual"} className="tsr-screen" style={{ overflow: "hidden" }} {...(reduced ? sm : { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, transition: { duration: 0.12 } }, transition: { type: "spring", stiffness: 380, damping: 34 } }) as any} aria-label={`${ritual.name} ritual`}>
                            <RitualHost ritual={ritual} items={items} phrase={text || items.map((i) => i.text).join(" ")} emo={feelEmo} faces={faces} char={char} dark={dark} reduced={reduced}
                                intensity={before} runKey={runKey} completed={completed} onComplete={onRitualComplete} onContinue={toReflect} onRestart={restartRitual} onProgress={setProgress} />
                        </motion.section>
                    ) : null}

                    {screen === "reflect" ? (
                        <motion.section key="reflect" className="tsr-screen" {...(sm as any)} aria-label="Check in">
                            <div className="tsr-col" style={{ alignItems: "center", textAlign: "center" }}>
                                <div className="tsr-spacer" />
                                <Companion faces={faces} step={shift === "heavier" ? 1 : shift === "same" ? 2 : 3} size={112} breathe={!reduced} label={CHAR_NAMES[char]} />
                                {!shift ? (
                                    <>
                                        <h1 className="t-title" style={{ marginTop: 22 }}>{before != null ? feelEmo.question[1] : "Did anything shift?"}</h1>
                                        {before != null ? (
                                            <>
                                                <div className="tsr-big-num" style={{ marginTop: 10 }} aria-hidden="true">{after}</div>
                                                <p className="t-cap" style={{ marginTop: 2 }}>Before: {before}</p>
                                                <div style={{ width: "100%", maxWidth: 420, marginTop: 4 }}>
                                                    <IntensitySlider value={after} onChange={setAfter} label={feelEmo.question[1]} marker={before} />
                                                    <div className="tsr-scale"><span>{feelEmo.scale[0]}</span><span>{feelEmo.scale[1]}</span></div>
                                                </div>
                                                <div className="tsr-spacer" />
                                                <button type="button" className="tsr-btn block" style={{ marginTop: 24 }} onClick={() => {
                                                    const better = feelEmo.better === "up" ? after > before : after < before
                                                    const worse = feelEmo.better === "up" ? after < before : after > before
                                                    saveReflection(better ? "lighter" : worse ? "heavier" : "same", after)
                                                }}>Save</button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="t-sub" style={{ marginTop: 6 }}>No right answer. Just notice.</p>
                                                <div className="tsr-spacer" />
                                                <div className="tsr-stack" style={{ width: "100%", marginTop: 24 }}>
                                                    <button type="button" className="tsr-btn ghost block" onClick={() => saveReflection("lighter", null)}>A little lighter</button>
                                                    <button type="button" className="tsr-btn ghost block" onClick={() => saveReflection("same", null)}>About the same</button>
                                                    <button type="button" className="tsr-btn ghost block" onClick={() => saveReflection("heavier", null)}>Heavier</button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <motion.div key={shift} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", flex: "1 0 auto" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT}>
                                        <h1 className="t-title" style={{ marginTop: 22 }}>{shift === "lighter" ? "Something eased." : shift === "same" ? "That's okay." : "Thank you for being honest."}</h1>
                                        <p className="t-sub" style={{ marginTop: 8, maxWidth: 340 }}>
                                            {shift === "lighter" ? "Notice it, even if it's small." : shift === "same" ? "Some feelings need a different move." : "Let's go gentler — or reach someone who can help."}
                                        </p>
                                        <div className="tsr-spacer" />
                                        <div className="tsr-stack" style={{ width: "100%", marginTop: 24 }}>
                                            {shift === "lighter" ? (
                                                <>
                                                    <button type="button" className="tsr-btn block" onClick={finish}>Done for now</button>
                                                    <button type="button" className="tsr-btn ghost block" onClick={() => nextRitual("lighter")}>One more ritual</button>
                                                </>
                                            ) : shift === "same" ? (
                                                <>
                                                    <button type="button" className="tsr-btn block" onClick={() => nextRitual("same")}>Try something different</button>
                                                    <button type="button" className="tsr-btn ghost block" onClick={finish}>Done for now</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" className="tsr-btn block" onClick={() => nextRitual("heavier")}>A gentler ritual</button>
                                                    <button type="button" className="tsr-btn ghost block" onClick={() => setSupportOpen(true)}><Icon name="support" /> Talk to someone</button>
                                                    <button type="button" className="tsr-btn plain" onClick={finish}>Done for now</button>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.section>
                    ) : null}

                    {screen === "rest" ? (
                        <motion.section key="rest" className="tsr-screen" {...(sm as any)} aria-label="Resting">
                            <div className="tsr-col" style={{ alignItems: "center", textAlign: "center" }}>
                                <div className="tsr-spacer" />
                                <Companion faces={faces} step={3} size={120} breathe={!reduced} label={CHAR_NAMES[char]} />
                                <h1 className="t-large" style={{ marginTop: 24 }}>Go gently.</h1>
                                {doneIds.length ? (
                                    <p className="t-sub" style={{ marginTop: 8 }}>
                                        {doneIds.length > 1 ? `${doneIds.length} rituals` : RITUAL_BY_ID[doneIds[0]]?.name}
                                        {before != null && shift ? ` · ${before} → ${after}` : ""}
                                    </p>
                                ) : null}
                                {weekCount > 1 ? <p className="t-cap" style={{ marginTop: 14 }}>You've made space for yourself {weekCount} times this week.</p> : null}
                                <div className="tsr-spacer" />
                                <div className="tsr-stack" style={{ width: "100%", marginTop: 24 }}>
                                    <button type="button" className="tsr-btn block" onClick={() => { resetFlow(); Haptics.fire("light") }}>Start again</button>
                                    {eosShareUrl ? (
                                        <button type="button" className="tsr-btn ghost block" onClick={async () => {
                                            try { if ((navigator as any).share) await (navigator as any).share({ title: "ThinkStill", url: eosShareUrl }); else { await navigator.clipboard.writeText(eosShareUrl); say("Link copied") } } catch { /* cancelled */ }
                                        }}><Icon name="link" /> Share ThinkStill</button>
                                    ) : null}
                                    <button type="button" className="tsr-btn plain" onClick={doClose}>Close</button>
                                </div>
                            </div>
                        </motion.section>
                    ) : null}
                </AnimatePresence>
            </main>

            {/* Settings popover — stays open while you change several things */}
            <AnimatePresence>
                {settingsOpen ? (
                    <>
                        <motion.div key="scrim" className="tsr-scrim" style={{ background: "transparent" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={() => setSettingsOpen(false)} />
                        <motion.div key="pop" className="tsr-pop" role="dialog" aria-label="Settings" initial={{ opacity: 0, scale: 0.9, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -4 }} transition={reduced ? { duration: 0.12 } : SPRING_SNAPPY}>
                            <div className="tsr-prow"><span className="lbl">Appearance</span>
                                <Segmented label="Appearance" value={prefs.theme} onChange={(v) => updatePrefs({ theme: v })} options={[{ v: "system", l: "Auto" }, { v: "light", l: "Light" }, { v: "dark", l: "Dark" }]} />
                            </div>
                            <div className="tsr-prow"><span className="lbl">Sound effects</span><Switch label="Sound effects" checked={prefs.sfx} onChange={(v) => { updatePrefs({ sfx: v }); if (v) { Sound.setEnabled(true); Sound.play("tap") } }} /></div>
                            <div className="tsr-prow"><span className="lbl">Music<small>{hasMusic ? "ThinkStill's shared soundtrack" : "No shared music source set"}</small></span><Switch label="Music" checked={prefs.music} onChange={(v) => updatePrefs({ music: v })} /></div>
                            {prefs.music ? (
                                <div className="tsr-prow" style={{ borderTop: 0, paddingTop: 0 }}>
                                    <input className="tsr-range" type="range" min={0} max={1} step={0.05} value={prefs.volume} aria-label="Music volume" onChange={(e) => updatePrefs({ volume: Number(e.target.value) })} />
                                </div>
                            ) : null}
                            <div className="tsr-prow"><span className="lbl">Haptics</span><Switch label="Haptics" checked={prefs.haptics} onChange={(v) => { updatePrefs({ haptics: v }); if (v) { Haptics.setEnabled(true); Haptics.fire("medium") } }} /></div>
                            <div className="tsr-prow"><span className="lbl">Motion</span>
                                <Segmented label="Motion" value={prefs.motion} onChange={(v) => updatePrefs({ motion: v })} options={[{ v: "system", l: "Auto" }, { v: "reduce", l: "Less" }, { v: "full", l: "Full" }]} />
                            </div>
                            <div className="tsr-prow"><span className="lbl">Check in before rituals</span><Switch label="Check in before rituals" checked={prefs.checkin} onChange={(v) => updatePrefs({ checkin: v })} /></div>
                            <div className="tsr-prow"><span className="lbl">Keep history on this device<small>Used to learn which rituals help you</small></span><Switch label="Keep history on this device" checked={prefs.keepHistory} onChange={(v) => updatePrefs({ keepHistory: v })} /></div>
                        </motion.div>
                    </>
                ) : null}
            </AnimatePresence>

            {/* Support sheet */}
            <AnimatePresence>
                {supportOpen ? (
                    <>
                        <motion.div key="scrim" className="tsr-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSupportOpen(false)} />
                        <motion.div key="sheet" className="tsr-sheet" role="dialog" aria-modal="true" aria-label="Support" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 340, damping: 36 }}>
                            <div className="tsr-grab" />
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                <div>
                                    <h2 className="t-title">Support</h2>
                                    <p className="t-sub" style={{ marginTop: 6 }}>{isStrongFlag(flag) ? "It sounds like a lot is happening. You deserve support from a real person right now." : "If things feel like too much, talking to someone can help."}</p>
                                </div>
                                <IconButton icon="close" label="Close support" onClick={() => setSupportOpen(false)} />
                            </div>
                            <div style={{ marginTop: 10 }}>
                                {lines.map((l) => {
                                    const [place, ...rest] = l.split("·").map((s) => s.trim())
                                    const num = rest.join(" · ")
                                    const digits = num.replace(/[^\d+]/g, "")
                                    const isPhone = digits.length >= 3 && /\d/.test(num) && !/\.[a-z]{2,}/i.test(num)
                                    const href = isPhone ? `tel:${digits}` : /\.[a-z]{2,}/i.test(num) ? `https://${num.replace(/^https?:\/\//, "")}` : undefined
                                    return (
                                        <a key={l} className="tsr-line" href={href} target={href && !isPhone ? "_blank" : undefined} rel="noreferrer">
                                            <b>{place || l}</b>
                                            <span>{num || ""}</span>
                                        </a>
                                    )
                                })}
                            </div>
                            <div className="tsr-stack" style={{ marginTop: 16 }}>
                                <a className="tsr-btn block" href={eosCrisisUrl || SUPPORT_DEFAULTS.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Icon name="link" /> Find a helpline near you</a>
                            </div>
                            <p className="t-sub" style={{ marginTop: 14, color: "var(--ink)", fontWeight: 600 }}>{eosEmergencyText || SUPPORT_DEFAULTS.emergency}</p>
                            <p className="t-cap" style={{ marginTop: 10 }}>{DISCLAIMER}</p>
                        </motion.div>
                    </>
                ) : null}
            </AnimatePresence>

            {/* Leave-ritual confirmation */}
            <AnimatePresence>
                {confirm ? (
                    <>
                        <motion.div key="scrim" className="tsr-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)} />
                        <motion.div key="confirm" className="tsr-sheet" role="alertdialog" aria-modal="true" aria-label="Leave this ritual?" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 340, damping: 36 }}>
                            <div className="tsr-grab" />
                            <h2 className="t-title" style={{ textAlign: "center" }}>Leave this ritual?</h2>
                            <p className="t-sub" style={{ textAlign: "center", marginTop: 6 }}>You can come back to it any time.</p>
                            <div className="tsr-stack" style={{ marginTop: 18 }}>
                                <button type="button" className="tsr-btn block" onClick={() => setConfirm(null)}>Keep going</button>
                                <button type="button" className="tsr-btn ghost block" onClick={() => { const c = confirm; setConfirm(null); if (c === "close") doClose(); else doBack() }}>{confirm === "close" ? "Close ThinkStill" : "Leave ritual"}</button>
                            </div>
                        </motion.div>
                    </>
                ) : null}
            </AnimatePresence>

            <AnimatePresence>
                {toast ? (
                    <motion.div key={toast} className="tsr-toast" role="status" initial={{ opacity: 0, y: 12, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 8, x: "-50%" }} transition={SPRING_SOFT}>{toast}</motion.div>
                ) : null}
            </AnimatePresence>

            <AnimatePresence>
                {showSplash ? (
                    <motion.div key="splash" className="tsr-splash" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: reduced ? 1 : 1.04 }} transition={{ duration: reduced ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] }} onClick={() => setShowSplash(false)} role="status" aria-label="ThinkStill">
                        <EclipseMark size={72} draw={!reduced} />
                        <div className="word">ThinkStill</div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    )
}

addPropertyControls(ThinkStillRelease, {
    title: { type: ControlType.String, title: "Title", defaultValue: "ThinkStill Release" },
    theme: { type: ControlType.Enum, title: "Theme", options: ["system", "light", "dark"], optionTitles: ["Auto", "Bright", "Dark"], defaultValue: "system" },
    splash: { type: ControlType.Boolean, title: "Launch splash", defaultValue: true },
    fillViewport: { type: ControlType.Boolean, title: "Full-screen app", defaultValue: false },
    soundOn: { type: ControlType.Boolean, title: "Sound effects", defaultValue: true },
    hapticsOn: { type: ControlType.Boolean, title: "Haptics", defaultValue: true },
    musicOnDefault: { type: ControlType.Boolean, title: "Music on", defaultValue: false },
    musicVolume: { type: ControlType.Number, title: "Music volume", min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
    musicUrl: { type: ControlType.String, title: "Fallback music", defaultValue: "", placeholder: "Used only if no shared source" },
    eosCheckin: { type: ControlType.Boolean, title: "Emotion check-in", defaultValue: true },
    newRituals: { type: ControlType.Boolean, title: "Burn · Melt · Cleanse · Vacuum · Slingshot", defaultValue: true },
    defaultFaces: { type: ControlType.Boolean, title: "Character images", defaultValue: true },
    assetBase: { type: ControlType.String, title: "Character assets", defaultValue: DEFAULT_FACE_BASE },
    eosCrisisLines: { type: ControlType.String, title: "Support lines", displayTextArea: true, defaultValue: SUPPORT_DEFAULTS.lines },
    eosCrisisUrl: { type: ControlType.String, title: "Support link", defaultValue: SUPPORT_DEFAULTS.url },
    eosEmergencyText: { type: ControlType.String, title: "Emergency text", defaultValue: SUPPORT_DEFAULTS.emergency },
    eosShareUrl: { type: ControlType.String, title: "Share link", defaultValue: "" },
    onClose: { type: ControlType.EventHandler },
})
