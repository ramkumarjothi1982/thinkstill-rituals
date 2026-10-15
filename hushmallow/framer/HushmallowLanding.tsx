// hushmallow — landing page (Framer code component)
//
// One self-contained component for the whole public landing page: a squishable
// hero, a real "little moment" the visitor can play before signing up, the
// seven Mallows, and the sign-up entry points (Google, Apple, email).
//
// Install: Framer → Assets → Code → "+" → New component → name it
// HushmallowLanding → replace everything with this file → drag it onto an empty
// page, set Width to Fill (1fr) and Height to Fit content. Full guide, and the
// list of settings to fill in: hushmallow/docs/LANDING.md.
//
// Authentication is NOT done here. The buttons hand people to your app's
// sign-up / log-in pages (the URLs in the properties panel), which talk to
// Supabase. No keys or secrets live in this file.

import * as React from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import {
    motion,
    AnimatePresence,
    animate,
    useInView,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
    type MotionValue,
} from "framer-motion"

// ---------------------------------------------------------------------------
// Brand art. Defaults point at the approved artwork in the hushmallow
// repository, pinned to one commit so they can never change underneath you.
// For production, upload the same files in the properties panel (they are then
// served by Framer's own CDN).
// ---------------------------------------------------------------------------
const ART =
    "https://cdn.jsdelivr.net/gh/ramkumarjothi1982/thinkstill-rituals@91514184f44b490ca0e438064bbe9393bf75ac21/hushmallow/landing/assets/"

const FONT_CSS =
    "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,300..700,0..100,0..1&family=Manrope:wght@500..800&family=Nunito+Sans:ital,opsz,wght@0,6..12,400..800;1,6..12,400..800&display=swap"

type MallowId = "noomi" | "blubi" | "pipzi" | "boppo" | "zuzu" | "loomi" | "glitzi"
type Sig = "sink" | "wobble" | "bounce" | "hop" | "spin" | "glow" | "glitch"
type PartKind = "sparkle" | "heart" | "drop" | "z" | "spiral" | "ring" | "bolt"

type Mallow = {
    id: MallowId
    name: string
    title: string
    vibe: string
    bio: string
    goodFor: string[]
    alt: string
    aspect: number // width / height of the art
    breath: number // seconds per idle breath
    sig: Sig
    part: PartKind
    colors: string[] // particle palette
    body: string
    deep: string
    tint: string
    glow: string
    blush: string
    cheeks: [number, number][] // cheek centres, fractions of the art box
    lines: string[]
    hello: string
    lids?: { top: number; bottom: number } // eye band, fractions of the art box (open-eyed Mallows blink)
    purpose: string // what this Mallow is for, in one line
    responds: string // how it reacts to you
    world: string // its realm inside hushmallow
    ritual: { name: string; what: string } // its signature ritual in the app
    feeling: FeelingId // the feeling it meets in the live moment
    tickle: string // what it says when you tap it three times quickly
}

const ORDER: MallowId[] = ["noomi", "blubi", "pipzi", "boppo", "zuzu", "loomi", "glitzi"]

const MALLOWS: Record<MallowId, Mallow> = {
    noomi: {
        id: "noomi",
        name: "Noomi",
        title: "The gentle one",
        vibe: "Gentle · comforting · softly peaceful",
        bio: "Sleepy, patient and made of pure cosiness. Noomi is who you want when the day has simply been a lot.",
        goodFor: ["Long days", "Winding down", "Needing a minute"],
        alt: "Noomi, a pale sky-blue Mallow with sleepy closed eyes and a peaceful smile",
        aspect: 640 / 593,
        breath: 5.6,
        sig: "sink",
        part: "z",
        colors: ["#8FB8FF", "#C9B8FF", "#FFD6F0"],
        body: "#CFE6FF",
        deep: "#3F67B8",
        tint: "#EAF3FF",
        glow: "#FFF4C8",
        blush: "#FF7FD8",
        cheeks: [
            [0.2, 0.655],
            [0.795, 0.655],
        ],
        lines: ["Slow squeeze. Slow breath. Perfect.", "I'm not asleep. I'm resting my eyes with you.", "Mm. Stay as long as you like."],
        hello: "Oh, hello. Come and get cosy. There's room.",
        purpose: "Gentle comfort when you need a softer moment.",
        responds: "Slows everything down: sleepy blinks, slow sinking squishes and a calm breath you can borrow.",
        world: "The Moonmilk Cove",
        ritual: { name: "Moonmilk Wind-down", what: "Snuff out the day's lanterns, sweep a moonbeam down and take one tiny rest." },
        feeling: "unsure",
        tickle: "Hehe. Shh. I'm being calm.",
    },
    blubi: {
        id: "blubi",
        name: "Blubi",
        title: "The softie",
        vibe: "Relaxed · happy · quietly content",
        bio: "Unhurried, unbothered and very good at sitting with you in the heavy stuff, without making it any heavier.",
        goodFor: ["Low days", "Feeling blue", "Quiet company"],
        alt: "Blubi, a bright blue Mallow with contented closed eyes and a little smile",
        aspect: 640 / 622,
        breath: 4.8,
        sig: "wobble",
        part: "drop",
        colors: ["#5CC3FF", "#9BE0FF", "#FF9DEB"],
        body: "#18A6F5",
        deep: "#0B5FB0",
        tint: "#E2F3FF",
        glow: "#9BE0FF",
        blush: "#FF7EF0",
        cheeks: [
            [0.205, 0.67],
            [0.83, 0.67],
        ],
        lines: ["Ahh. Jiggle complete.", "No rush. I've got all day. Literally.", "You squeeze, I wobble. Teamwork."],
        hello: "Hey. No rush. I'm very good at no rush.",
        purpose: "Quiet company when things feel heavy.",
        responds: "Stays close and unhurried: a gentle wobble, a little drip, and no pressure to cheer up.",
        world: "The Raindrop Lagoon",
        ritual: { name: "Raindrop Keeper", what: "Catch the drops and name them, float them off as lanterns, then choose one small kindness." },
        feeling: "low",
        tickle: "Blub! That tickles.",
    },
    pipzi: {
        id: "pipzi",
        name: "Pipzi",
        title: "The spark",
        vibe: "Joyful · bright · wildly expressive",
        bio: "Pure fizz with sparkly eyes. Pipzi turns buzzy, can't-sit-still energy into something bright you can actually use.",
        goodFor: ["Restless energy", "Big excitement", "A quick lift"],
        alt: "Pipzi, a vivid pink-red Mallow with huge sparkly eyes and an open, joyful smile",
        aspect: 640 / 613,
        breath: 3.4,
        sig: "bounce",
        part: "sparkle",
        colors: ["#FFD14A", "#FF6FA8", "#FFFFFF", "#FFB0F0"],
        body: "#F2073B",
        deep: "#B3002B",
        tint: "#FFE6EC",
        glow: "#FFCF4A",
        blush: "#FFB0F0",
        cheeks: [
            [0.2, 0.665],
            [0.82, 0.665],
        ],
        lines: ["EEE! Again! Again!", "You just made my whole day sparkle.", "Squeeze level: legendary."],
        hello: "HI! Hi. Sorry. Hi! I'm Pipzi!",
        lids: { top: 0.383, bottom: 0.641 },
        purpose: "Bright, playful energy for restless moments.",
        responds: "Bounces right back: big sparkly eyes, a burst of glitter, and the fizz slowly settling.",
        world: "The Spark Festival",
        ritual: { name: "Spark to Lantern", what: "Tap along with a slowing beat, surf the urge wave and launch the leftover fizz as a lantern." },
        feeling: "restless",
        tickle: "HAHA! Again! No, wait!",
    },
    boppo: {
        id: "boppo",
        name: "Boppo",
        title: "The sunshine",
        vibe: "Optimistic · enthusiastic · warm",
        bio: "Hopeful, huggable and genuinely delighted you're here. Boppo helps the good moments stick around a little longer.",
        goodFor: ["Good news", "Small wins", "Feeling grateful"],
        alt: "Boppo, a warm orange Mallow with shining brown eyes and a big hopeful grin",
        aspect: 640 / 614,
        breath: 3.8,
        sig: "hop",
        part: "heart",
        colors: ["#FF6FB5", "#FFC94A", "#FF8A3D"],
        body: "#FF7A0A",
        deep: "#B94A00",
        tint: "#FFF0E0",
        glow: "#FFD23A",
        blush: "#FF5ED0",
        cheeks: [
            [0.2, 0.69],
            [0.805, 0.68],
        ],
        lines: ["Ooh, good squeeze! Ten out of ten.", "See? Things can get a little better.", "I believe in you. And in squeezing."],
        hello: "Hello, you! Honestly? Today just got better.",
        lids: { top: 0.389, bottom: 0.632 },
        purpose: "Celebrating joy, gratitude and little victories.",
        responds: "Cheers you on: happy hops, little hearts, and a glow that grows the longer you notice the good bit.",
        world: "The Sunpop Orchard",
        ritual: { name: "Sunpop Savour", what: "Plant the good thing, water it with details, soak it in and keep it." },
        feeling: "good",
        tickle: "Hee! Okay, okay, you win!",
    },
    zuzu: {
        id: "zuzu",
        name: "Zuzu",
        title: "The delightful chaos",
        vibe: "Chaotic · playful · full of surprises",
        bio: "Spiral eyes, zero chill, enormous heart. Zuzu is fluent in overthinking, which makes Zuzu great at untangling it.",
        goodFor: ["Overwhelm", "Overthinking", "Too many tabs"],
        alt: "Zuzu, a purple Mallow with spinning spiral eyes and a gleeful open mouth",
        aspect: 640 / 603,
        breath: 3.0,
        sig: "spin",
        part: "spiral",
        colors: ["#39F0FF", "#FF6AD0", "#C414E6"],
        body: "#C414E6",
        deep: "#7A0C9E",
        tint: "#F6E6FF",
        glow: "#39F0FF",
        blush: "#FF8CF0",
        cheeks: [
            [0.175, 0.66],
            [0.835, 0.66],
        ],
        lines: ["Wheee! Which way is up?", "My spirals are spiralling. In a good way.", "Do it again. I dare you. No, I beg you."],
        hello: "Oh! A new friend! Quick, which way is up?",
        lids: { top: 0.32, bottom: 0.622 },
        purpose: "Helping make sense of overwhelm and overthinking.",
        responds: "Gets it completely: spiral eyes, a dizzy spin, then one tangled thought at a time.",
        world: "The Spiral Observatory",
        ritual: { name: "Untangle", what: "Wind up the knot, pull each strand free and sort the threads into orbits." },
        feeling: "overwhelmed",
        tickle: "Tickle attack! Wheee!",
    },
    loomi: {
        id: "loomi",
        name: "Loomi",
        title: "The calm one",
        vibe: "Soothing · steady · grounding",
        bio: "Cool, calm and wonderfully steady. Loomi helps worried, what-if thoughts float back down to earth.",
        goodFor: ["Worry", "Feeling on edge", "Settling down"],
        alt: "Loomi, a soft aqua Mallow with calm closed eyes and a gentle smile",
        aspect: 640 / 599,
        breath: 6.2,
        sig: "glow",
        part: "ring",
        colors: ["#A8F0FF", "#7FD4FF", "#FFFFFF"],
        body: "#5EC8F5",
        deep: "#13789F",
        tint: "#E4F7FF",
        glow: "#A8F0FF",
        blush: "#FF7CF5",
        cheeks: [
            [0.19, 0.695],
            [0.82, 0.695],
        ],
        lines: ["There. Feel your feet? Good.", "Breathe in… and let it all settle.", "Soft and steady. Just like that."],
        hello: "Hi there. Shall we take a slow breath together?",
        purpose: "Grounding and steadiness during worried moments.",
        responds: "Steadies the pace: a slow glow, rippling calm and breaths you can follow.",
        world: "The Blue Drift",
        ritual: { name: "Drift and Dock", what: "Trace a slow wave, launch your worries as little boats and dock them: today, later or not mine." },
        feeling: "anxious",
        tickle: "Oh! Ha. Okay. Still grounded.",
    },
    glitzi: {
        id: "glitzi",
        name: "Glitzi",
        title: "The storm cloud",
        vibe: "Moody · rebellious · intense",
        bio: "Grumpy on the outside, secretly soft in the middle. Glitzi lets you be properly cross, without anyone judging you for it.",
        goodFor: ["Frustration", "Being so done", "Letting off steam"],
        alt: "Glitzi, a midnight-blue Mallow streaked with neon glitch lines, side-eyeing with a grumpy frown",
        aspect: 640 / 611,
        breath: 4.4,
        sig: "glitch",
        part: "bolt",
        colors: ["#3EE8FF", "#FF3DF2", "#8C7BFF"],
        body: "#2A1A6E",
        deep: "#1A0F4A",
        tint: "#ECE8FF",
        glow: "#3EE8FF",
        blush: "#FF3DF2",
        cheeks: [
            [0.25, 0.72],
            [0.75, 0.71],
        ],
        lines: ["Ugh. Fine. That was… actually nice.", "Don't tell anyone I liked that.", "I'm not smiling. It's a glitch."],
        hello: "Oh. It's you. …Fine. Hi. Don't make it weird.",
        lids: { top: 0.478, bottom: 0.638 },
        purpose: "Giving frustration and anger some breathing room.",
        responds: "Doesn't flinch: lets you squeeze hard, glitches right along with you, and never tells you to calm down.",
        world: "The Static Storm",
        ritual: { name: "Static to Signal", what: "Scribble out the static, hold steady through three breaths and flick away what isn't yours." },
        feeling: "frustrated",
        tickle: "Stop. …Fine. That was funny.",
    },
}

const FIRST_SQUEEZE = "Hey. Long day?"
const LONG_SQUEEZE = "Okay, okay, I'm properly squished. Take all the time you need."

// ---------------------------------------------------------------------------
// "How's your world feeling?": the feelings, the Mallow who meets each one,
// every line they say, and the words the FeelSense preview listens for.
// Edit freely; the flow adapts.
// ---------------------------------------------------------------------------
type FeelingId = "overwhelmed" | "frustrated" | "low" | "anxious" | "restless" | "good" | "unsure"
type SatKind = "tab" | "whatif" | "bolt" | "drop" | "fizz" | "ping" | "sparkle"
type Jitter = "swirl" | "tremble" | "shake" | "droop" | "bounce" | "haze" | "shine"

type Feeling = {
    id: FeelingId
    label: string
    dot: string
    mallow: MallowId
    cloud: string
    intro: string
    sense: string // FeelSense's guess, always phrased as a question
    words: RegExp // what FeelSense listens for (rule-based, on this page only)
    breaths: [string, string, string]
    choice: string
    driftLabel: string
    keepLabel: string
    drift: (what: string) => string
    keep: string
    heavy: [string, string]
    light: [string, string]
    jitter: Jitter // how the thought cloud and the Mallow move while it's heavy
    sat: { kind: SatKind; labels?: string[] }
    positive?: boolean
}

const FEELINGS: Feeling[] = [
    {
        id: "overwhelmed",
        label: "A little overwhelmed",
        dot: "#B583FF",
        mallow: "zuzu",
        cloud: "everything, all at once",
        intro: "Too many tabs open in your head? We can start with one.",
        sense: "It sounds like today has been a lot.",
        words: /\b(overwhelm\w*|too much|so much|a lot|everything|swamped|drowning|snowed under|busy|deadlines?|juggl\w*|stress\w*|tabs|chaos|can'?t keep up|behind on)\b/g,
        breaths: [
            "One tab closed. Ooh, roomier.",
            "Two down. Look at all this space!",
            "Still a lot going on. But you're the one holding the remote now.",
        ],
        choice: "It's lighter now. Let it drift off, or keep it close?",
        driftLabel: "Let it drift",
        keepLabel: "Keep it close",
        drift: (w) => `Bye-bye, "${w}". You don't have to carry all of it right now.`,
        keep: "Fair. It's smaller now, though, and that's not nothing.",
        heavy: ["#7347B0", "#3B2366"],
        light: ["#F7ECFF", "#E8D8FF"],
        jitter: "swirl",
        sat: { kind: "tab", labels: ["inbox (214)", "that email", "laundry", "group chat", "dentist?", "tomorrow"] },
    },
    {
        id: "frustrated",
        label: "Frustrated",
        dot: "#FF5FA2",
        mallow: "glitzi",
        cloud: "so. done.",
        intro: "That sounds like a lot. Want to let some of it out? Squeeze me like you mean it.",
        sense: "It sounds like something's really got under your skin.",
        words: /\b(frustrat\w*|angry|anger|annoy\w*|furious|fuming|irritat\w*|mad|rage|raging|pissed|fed up|sick of|unfair|hate|so done|livid|ugh+|argh+|grr+)\b/g,
        breaths: [
            "Ha. The static flinched.",
            "Again. Squeeze the grrr right out.",
            "Okay, that's less shouty. You're still allowed to be annoyed, though.",
        ],
        choice: "Want to blast it off into space, or keep a bit for later?",
        driftLabel: "Blast it off",
        keepLabel: "Keep a bit",
        drift: (w) => `Bye, "${w}". Honestly? Good riddance.`,
        keep: "Respect. A little fire is useful. Just not all of it.",
        heavy: ["#83305A", "#38122E"],
        light: ["#FFEDF4", "#F2DEFF"],
        jitter: "shake",
        sat: { kind: "bolt" },
    },
    {
        id: "low",
        label: "Feeling low",
        dot: "#6FA8FF",
        mallow: "blubi",
        cloud: "a heavy grey bit",
        intro: "No need to put on a happy face here. Let's just make it a bit easier to carry.",
        sense: "It sounds like you're feeling a bit low.",
        words: /\b(sad|down|low|lonely|alone|cry\w*|cried|tears?|miss(ing)?|grie\w*|heartbr\w*|hurt|empty|blue|rubbish|rough|gloomy|miserable|unhappy|upset|disappoint\w*|rejected)\b/g,
        breaths: [
            "There you go. Gently does it.",
            "Heavy things get lighter when you share the carrying.",
            "Still here. Still soft. So are you.",
        ],
        choice: "Want to let it float for a while, or keep it close?",
        driftLabel: "Let it float",
        keepLabel: "Keep it close",
        drift: (w) => `Off it goes, "${w}". It can come back whenever it needs to.`,
        keep: "Of course. Some things we keep. It's lighter in your hands now.",
        heavy: ["#56698A", "#2F3E58"],
        light: ["#E9F5FF", "#D6ECFF"],
        jitter: "droop",
        sat: { kind: "drop" },
    },
    {
        id: "anxious",
        label: "Anxious",
        dot: "#7FD4FF",
        mallow: "loomi",
        cloud: "what if…",
        intro: "Hey. Let's bring that buzzing down a notch, nice and slow.",
        sense: "It sounds like your mind is running a few steps ahead of you.",
        words: /\b(anxi\w*|worr\w*|nervous|scared|afraid|panic\w*|what if|dread\w*|on edge|uneasy|tense|interview|exam|test results?|overthink\w*|racing)\b/g,
        breaths: [
            "Good. Slower than last time.",
            "Did your shoulders drop a little? Mine did.",
            "Steady. The what-ifs got quieter. They don't have to vanish.",
        ],
        choice: "Let it float off for now, or keep it where you can see it?",
        driftLabel: "Let it float off",
        keepLabel: "Keep it close",
        drift: (w) => `There goes "${w}". If it comes back, we can do this again.`,
        keep: "That's okay. It's smaller and quieter now. You've got it.",
        heavy: ["#4E6C9E", "#273A61"],
        light: ["#ECF9FF", "#D3F0FF"],
        jitter: "tremble",
        sat: { kind: "whatif", labels: ["what if…", "but what if…", "did I…?", "what if they…", "should I have…", "what if I…"] },
    },
    {
        id: "restless",
        label: "Restless",
        dot: "#FF8A5C",
        mallow: "pipzi",
        cloud: "can't. sit. still.",
        intro: "Buzzy? Same! Let's turn the fizz into something softer.",
        sense: "It sounds like you've got energy with nowhere to go.",
        words: /\b(restless|bored|boring|fidget\w*|can'?t sit still|wired|buzz\w*|hyper|jittery|antsy|can'?t sleep|too much coffee|itchy|impatient)\b/g,
        breaths: ["Whee! Okay, slower. Slower. Nice!", "The fizz is fizzing less. Science!", "Look at you, all calm and sparkly."],
        choice: "Launch the leftover fizz, or keep a little sparkle?",
        driftLabel: "Launch it",
        keepLabel: "Keep a sparkle",
        drift: (w) => `Up, up and away, "${w}"! Ooh, pretty.`,
        keep: "Good call. A little sparkle is handy for later.",
        heavy: ["#C6404F", "#6E1A38"],
        light: ["#FFEDF0", "#FFDDE7"],
        jitter: "bounce",
        sat: { kind: "fizz" },
    },
    {
        id: "good",
        label: "Pretty good",
        dot: "#FFC24A",
        mallow: "boppo",
        cloud: "a good little thing",
        intro: "Ooh, a good one! Let's soak it in so it sticks around.",
        sense: "It sounds like something's going right!",
        words: /\b(happy|good|great|excited|proud|grateful|thankful|glad|joy\w*|amazing|awesome|love\w*|fun|relieved|nice|won|win|promot\w*|brilliant|fantastic|lovely|chuffed)\b/g,
        breaths: ["It's getting brighter!", "Find the very best bit of it. Soak that bit in.", "Glowing! That's yours now."],
        choice: "Keep the glow, or send some of it out into the world?",
        driftLabel: "Send it out",
        keepLabel: "Keep the glow",
        drift: () => "Whoosh! Good feelings travel. Some of it's coming back to you.",
        keep: "Yes. Pocket that. Good things deserve a second look.",
        heavy: ["#FFF3DF", "#FFE7C8"],
        light: ["#FFD66B", "#FF9F45"],
        jitter: "shine",
        sat: { kind: "sparkle" },
        positive: true,
    },
    {
        id: "unsure",
        label: "Not sure",
        dot: "#A7B4D6",
        mallow: "noomi",
        cloud: "hard to say",
        intro: "Not sure is completely fine. Come and sit. Three slow squeezes, nothing else.",
        sense: "It sounds like it's hard to put a finger on it. That's okay.",
        words: /\b(not sure|unsure|don'?t know|idk|dunno|meh|blah|numb|weird|off|tired|exhausted|drained|confus\w*|mixed|whatever|fine i guess)\b/g,
        breaths: ["Mm. That's one.", "Two. Nowhere you need to be.", "Three. Look at you, having a moment."],
        choice: "Let it drift off for a bit, or keep it nearby?",
        driftLabel: "Let it drift",
        keepLabel: "Keep it nearby",
        drift: () => "There. Whatever it was can wait outside for a minute.",
        keep: "Sure. It's quieter now, anyway.",
        heavy: ["#878CA6", "#555A73"],
        light: ["#F5F7FF", "#E7EDFF"],
        jitter: "haze",
        sat: { kind: "ping", labels: ["ping", "reply?", "one sec", "ping", "urgent-ish", "ping"] },
    },
]

// FeelSense preview. Rule-based word matching that runs on this page only:
// it can't read minds, it isn't AI, and it always asks before assuming.
// The safety patterns mirror the hushmallow app (src/engine/interpret.js).
const CRISIS = [
    /\b(kill|killing|hurt|hurting|harm|harming|cut|cutting) myself\b/,
    /\bsuicid\w*/,
    /\bend (it all|my life)\b/,
    /\b(don'?t|do not) want to (be here|live|exist|wake up)\b/,
    /\bno reason to (live|go on)\b/,
    /\bbetter off (dead|without me)\b/,
    /\bwant to die\b/,
    /\bself[- ]harm\w*/,
    /\boverdose\b/,
]
const CONCERN = [/\bcan'?t cope\b/, /\bhopeless\b/, /\bworthless\b/, /\bcan'?t go on\b/, /\b(he|she|they) (hit|hits|hurt|hurts) me\b/, /\b(abus\w+|unsafe at home)\b/]
const NEGATED = /\b(not|no|never|isn'?t|wasn'?t|don'?t|doesn'?t|didn'?t|hardly|barely)\s+(\w+\s+)?$/

type Sense = { kind: "crisis" } | { kind: "match"; id: FeelingId; concern: boolean } | { kind: "none"; concern: boolean }

function feelSense(input: string): Sense {
    const t = " " + input.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ") + " "
    if (CRISIS.some((re) => re.test(t))) return { kind: "crisis" }
    const concern = CONCERN.some((re) => re.test(t))
    const score: Partial<Record<FeelingId, number>> = {}
    for (const f of FEELINGS) {
        f.words.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = f.words.exec(t))) {
            // "not happy" counts towards low, "not worried" counts for nothing
            const negated = NEGATED.test(t.slice(Math.max(0, m.index - 24), m.index))
            if (negated && f.positive) score.low = (score.low || 0) + 1
            else if (!negated) score[f.id] = (score[f.id] || 0) + (m[0].includes(" ") ? 2 : 1)
        }
    }
    const best = (Object.entries(score) as [FeelingId, number][]).sort((a, b) => b[1] - a[1])
    if (concern && !best.length) return { kind: "match", id: "low", concern }
    if (!best.length) return { kind: "none", concern }
    return { kind: "match", id: best[0][0], concern }
}

type ReflectId = "lighter" | "same" | "lot"
const REFLECT: { id: ReflectId; label: string; good: string; reply: string; goodReply: string }[] = [
    {
        id: "lighter",
        label: "A bit lighter",
        good: "Even better",
        reply: "Lovely. Little shifts count. They add up.",
        goodReply: "Yes! Noticing the good stuff makes it last a little longer.",
    },
    {
        id: "same",
        label: "About the same",
        good: "About the same",
        reply: "That's honest, and totally okay. Feelings don't always move on cue. You still made some space for it.",
        goodReply: "That's fine too. You still stopped to notice it, and that counts.",
    },
    {
        id: "lot",
        label: "Still a lot",
        good: "Not sure",
        reply: "Thank you for telling me. Some feelings need more than a minute, and that's allowed.",
        goodReply: "Not sure is a real answer. Sometimes it takes a while to notice.",
    },
]

const THOUGHTS = [
    "47 tabs open",
    "the Sunday scaries",
    "fine, technically",
    "replaying that one thing",
    "tired but wired",
    "happy for them. mostly.",
    "the group chat",
    "what was I doing?",
    "low battery (emotionally)",
    "cried at an advert",
    "too much coffee",
    "is it Friday yet",
]

const SUPPORT_URL = "https://findahelpline.com"

// "Remember my Mallow": opt-in, this browser only, and only the Mallow's name.
const MEMORY_KEY = "hushmallow.mallow"
function readMemory(): MallowId | null {
    try {
        const v = window.localStorage.getItem(MEMORY_KEY)
        return v && (ORDER as string[]).includes(v) ? (v as MallowId) : null
    } catch {
        return null
    }
}
function writeMemory(id: MallowId | null) {
    try {
        if (id) window.localStorage.setItem(MEMORY_KEY, id)
        else window.localStorage.removeItem(MEMORY_KEY)
    } catch {
        /* storage blocked (private mode); the toggle simply won't persist */
    }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type Props = {
    logo: string
    mascot: string
    noomi: string
    blubi: string
    pipzi: string
    boppo: string
    zuzu: string
    loomi: string
    glitzi: string
    signUpUrl: string
    loginUrl: string
    googleUrl: string
    appleUrl: string
    emailUrl: string
    showGoogle: boolean
    showApple: boolean
    showEmail: boolean
    termsUrl: string
    privacyUrl: string
    contactUrl: string
    headline: string
    squishWord: string
    supportHeadline: string
    subheadline: string
    primaryCta: string
    secondaryCta: string
    navCta: string
    accountCta: string
    finalHeadline: string
    finalCta: string
    hushmatesUpdatesUrl: string
    moodspellVideo: string
    moodspellPoster: string
    moodspellCaption: string
    membershipNote: string
    fixedNav: boolean
    blinking: boolean
    rememberOption: boolean
    assetBase?: string // where the eyelid layers live (defaults to the pinned repository copy)
    lidImages?: Partial<Record<MallowId, string>> // explicit eyelid images (used by the offline preview)
    onSignUpClick?: () => void
    onLoginClick?: () => void
}

type AuthMethod = "google" | "apple" | "email"
type AuthMode = "signup" | "login"
type SignupContext = { feeling?: FeelingId; mallow?: MallowId; from?: string }

type Ctx = {
    img: Record<MallowId, string>
    reduced: boolean
    canvas: boolean
    openAuth: (mode: AuthMode, c?: SignupContext) => void
    scrollTo: (id: string) => void
    noteFeeling: (c: SignupContext) => void
    blinking: boolean
    lidSrc: (id: MallowId) => string
    remembered: MallowId | null // what this browser remembered when the page loaded (opt-in only)
    saved: MallowId | null // what is remembered right now
    rememberOn: boolean
    setRemember: (on: boolean) => void
    meetMallow: (id: MallowId) => void // the visitor spent time with this Mallow
    share: (id?: MallowId) => void // system share sheet, or copy the link
    startWith: (feeling: FeelingId) => void // jump into the live moment with this feeling
    registerLab: (start: (feeling: FeelingId) => void) => void
}
const LandingCtx = React.createContext<Ctx | null>(null)
const useLanding = () => React.useContext(LandingCtx) as Ctx

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const rand = (a: number, b: number) => a + Math.random() * (b - a)
let uidSeed = 0
const uid = () => ++uidSeed
const vars = (o: Record<string, string | number>) => o as unknown as React.CSSProperties

function vibrate(pattern: number | number[]) {
    try {
        const n = navigator as any
        if (n.userActivation && !n.userActivation.hasBeenActive) return
        n.vibrate?.(pattern)
    } catch {
        /* not supported */
    }
}

function renderTarget(): "canvas" | "preview" | "live" {
    try {
        const t = RenderTarget.current()
        if (t === RenderTarget.canvas || t === RenderTarget.thumbnail) return "canvas"
        if (t === RenderTarget.preview) return "preview"
    } catch {
        /* outside Framer */
    }
    return "live"
}

/** Safe, absolute or root-relative http(s) URL with our context params added. */
function withParams(base: string, params: Record<string, string | undefined>): string | null {
    const raw = (base || "").trim()
    if (!raw) return null
    if (!/^https?:\/\//i.test(raw) && !raw.startsWith("/")) return null
    try {
        const u = new URL(raw, typeof window !== "undefined" ? window.location.href : "https://example.com")
        if (!/^https?:$/.test(u.protocol)) return null
        for (const [k, v] of Object.entries(params)) if (v && !u.searchParams.has(k)) u.searchParams.set(k, v)
        return u.toString()
    } catch {
        return null
    }
}

/** Timers that are all cleared together (on reset or unmount). */
function useTimers() {
    const ids = React.useRef<number[]>([])
    const later = React.useCallback((fn: () => void, ms: number) => {
        const id = window.setTimeout(() => {
            ids.current = ids.current.filter((x) => x !== id)
            fn()
        }, ms)
        ids.current.push(id)
        return id
    }, [])
    const clearAll = React.useCallback(() => {
        ids.current.forEach((id) => window.clearTimeout(id))
        ids.current = []
    }, [])
    React.useEffect(() => clearAll, [clearAll])
    return { later, clearAll }
}

// ---------------------------------------------------------------------------
// The Mallow rig: squash-and-stretch, signature moves and particles, all on
// motion values (no React re-render per frame).
// ---------------------------------------------------------------------------
type Part = { id: number; k: PartKind; x: number; y: number; dx: number; dy: number; r: number; s: number; c: string; d: number }

type Rig = ReturnType<typeof useRig>

function useRig(reduced: boolean) {
    const squish = useMotionValue(0)
    const y = useMotionValue(0)
    const gx = useMotionValue(0)
    const rot = useMotionValue(0)
    const pop = useMotionValue(1)
    const blush = useMotionValue(0)
    const glitch = useMotionValue(0)
    const glow = useMotionValue(0)
    const lid = useMotionValue(0) // 0 open … 1 closed (only Mallows with open eyes have lids)
    const [parts, setParts] = React.useState<Part[]>([])
    const hold = React.useRef<{ stop: () => void } | null>(null)

    const emit = React.useCallback(
        (k: PartKind, n: number, colors: string[]) => {
            const count = reduced ? Math.min(n, 2) : n
            const fresh: Part[] = Array.from({ length: count }, () => {
                const a = rand(-Math.PI * 0.92, -Math.PI * 0.08)
                const dist = rand(60, 140)
                return {
                    id: uid(),
                    k,
                    x: 50 + rand(-20, 20),
                    y: 38 + rand(-8, 10),
                    dx: Math.cos(a) * dist,
                    dy: Math.sin(a) * dist - 24,
                    r: rand(-80, 80),
                    s: rand(14, 26),
                    c: colors[Math.floor(Math.random() * colors.length)],
                    d: reduced ? 1.2 : rand(0.9, 1.5),
                }
            })
            setParts((p) => [...p.slice(-28), ...fresh])
        },
        [reduced]
    )
    const drop = React.useCallback((id: number) => setParts((p) => p.filter((q) => q.id !== id)), [])

    const press = React.useCallback(
        (depth = 1, seconds = 0.8) => {
            hold.current?.stop()
            hold.current = animate(squish, reduced ? depth * 0.5 : depth, {
                duration: reduced ? 0.2 : seconds,
                ease: [0.22, 1, 0.36, 1],
            })
            // a happy squint while being squeezed
            animate(lid, 1, { duration: 0.12, ease: "easeOut" })
        },
        [reduced, squish, lid]
    )

    const release = React.useCallback(
        (soft = false) => {
            hold.current?.stop()
            animate(lid, 0, { duration: 0.16, delay: 0.32, ease: "easeIn" })
            if (reduced) {
                animate(squish, 0, { duration: 0.3 })
                return
            }
            const spring = () =>
                animate(squish, 0, {
                    type: "spring",
                    stiffness: soft ? 170 : 320,
                    damping: soft ? 9 : 7,
                    velocity: -4,
                })
            // a quick tap still gets a proper squish before the rebound
            if (squish.get() < 0.35) animate(squish, 0.45, { duration: 0.09, ease: "easeOut" }).then(spring)
            else spring()
        },
        [reduced, squish, lid]
    )

    const blink = React.useCallback(() => {
        if (squish.get() > 0.2 || lid.get() > 0.05) return
        const twice = Math.random() < 0.18
        animate(lid, twice ? [0, 1, 0.1, 1, 0] : [0, 1, 1, 0], {
            duration: twice ? 0.42 : 0.2,
            times: twice ? [0, 0.22, 0.5, 0.72, 1] : [0, 0.38, 0.55, 1],
            ease: "easeInOut",
        })
    }, [lid, squish])

    // a tiny unprompted move, so a Mallow left alone still feels alive
    const idle = React.useCallback(
        (m: Mallow) => {
            if (reduced || squish.get() > 0.05) return
            switch (m.sig) {
                case "sink": // a slow yawn: stretch tall, then settle
                    animate(squish, [0, -0.32, -0.32, 0], { duration: 1.6, times: [0, 0.35, 0.6, 1], ease: "easeInOut" })
                    emit("z", 1, m.colors)
                    break
                case "wobble":
                    animate(rot, [0, -3, 3, -1.5, 0], { duration: 0.9, ease: "easeInOut" })
                    break
                case "bounce":
                    animate(y, [0, -14, 0, -5, 0], { duration: 0.7, ease: "easeOut" })
                    break
                case "hop":
                    animate(y, [0, -10, 0], { duration: 0.45, ease: "easeOut" })
                    animate(rot, [0, -4, 4, 0], { duration: 0.6, ease: "easeInOut" })
                    break
                case "spin":
                    animate(rot, [0, -10, 12, -6, 0], { duration: 1.0, ease: "easeInOut" })
                    break
                case "glow":
                    animate(glow, [0, 0.6, 0], { duration: 2.2, ease: "easeInOut" })
                    break
                case "glitch":
                    animate(glitch, [0, 0.8, 0, 0.5, 0], { duration: 0.4, ease: "linear" })
                    animate(gx, [0, -4, 3, 0], { duration: 0.3, ease: "linear" })
                    break
            }
        },
        [emit, glitch, glow, gx, reduced, rot, squish, y]
    )

    const pulseBlush = React.useCallback(() => {
        animate(blush, [blush.get(), 1, 0], { duration: 1.8, times: [0, 0.2, 1], ease: "easeOut" })
    }, [blush])

    const signature = React.useCallback(
        (m: Mallow, intensity = 1) => {
            pulseBlush()
            const n = Math.round((m.part === "sparkle" ? 10 : 6) * intensity)
            emit(m.part, Math.max(2, n), m.colors)
            if (reduced) return
            switch (m.sig) {
                case "sink":
                    animate(y, [0, 10, 0], { duration: 1.6, ease: "easeInOut" })
                    animate(rot, [0, -3, 2, 0], { duration: 1.6, ease: "easeInOut" })
                    break
                case "wobble":
                    animate(rot, [0, -7, 6, -4, 2, 0], { duration: 1.1, ease: "easeInOut" })
                    break
                case "bounce":
                    animate(y, [0, -46, 0, -20, 0, -6, 0], {
                        duration: 1.05,
                        times: [0, 0.2, 0.4, 0.56, 0.72, 0.86, 1],
                        ease: "easeInOut",
                    })
                    break
                case "hop":
                    animate(y, [0, -34, 0], { duration: 0.6, ease: [0.3, 0, 0.3, 1] })
                    animate(rot, [0, -8, 8, 0], { duration: 0.7, ease: "easeInOut" })
                    break
                case "spin":
                    animate(y, [0, -40, 0], { duration: 0.9, ease: "easeInOut" })
                    animate(rot, [0, 360], { duration: 0.9, ease: [0.5, 0, 0.2, 1] }).then(() => rot.set(0))
                    break
                case "glow":
                    animate(glow, [0, 1, 0], { duration: 2.4, ease: "easeInOut" })
                    animate(y, [0, -12, 0], { duration: 2.4, ease: "easeInOut" })
                    break
                case "glitch":
                    animate(glitch, [0, 1, 0, 1, 0, 0.8, 0], { duration: 0.7, ease: "linear" })
                    animate(gx, [0, -7, 6, -4, 5, -2, 0], { duration: 0.5, ease: "linear" })
                    break
            }
        },
        [emit, glitch, glow, gx, pulseBlush, reduced, rot, y]
    )

    return { squish, y, gx, rot, pop, blush, glitch, glow, lid, parts, emit, drop, press, release, blink, idle, pulseBlush, signature }
}

/** Pointer + keyboard press-and-hold, without hijacking page scroll. */
function usePress(opts: { onDown: () => void; onUp: (heldMs: number, cancelled: boolean) => void; disabled?: boolean }) {
    const start = React.useRef<number | null>(null)
    const { onDown, onUp, disabled } = opts
    const begin = () => {
        if (disabled || start.current !== null) return
        start.current = performance.now()
        onDown()
    }
    const end = (cancelled: boolean) => {
        if (start.current === null) return
        const held = performance.now() - start.current
        start.current = null
        onUp(held, cancelled)
    }
    return {
        onPointerDown: (e: React.PointerEvent) => {
            if (e.button > 0) return
            try {
                ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
            } catch {
                /* capture can fail on some browsers; release still arrives */
            }
            begin()
        },
        onPointerUp: () => end(false),
        onPointerCancel: () => end(true),
        onKeyDown: (e: React.KeyboardEvent) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault()
                begin()
            }
        },
        onKeyUp: (e: React.KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault()
                end(false)
            }
        },
        onBlur: () => end(true),
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    }
}

// ---------------------------------------------------------------------------
// Particle shapes
// ---------------------------------------------------------------------------
function Shape({ k }: { k: PartKind }) {
    switch (k) {
        case "heart":
            return (
                <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                        fill="currentColor"
                        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.8 4.2 7.3C19.5 16.4 12 21 12 21z"
                    />
                </svg>
            )
        case "drop":
            return (
                <svg viewBox="0 0 24 24" aria-hidden>
                    <path fill="currentColor" d="M12 2s-7 8.5-7 13a7 7 0 0 0 14 0c0-4.5-7-13-7-13z" />
                </svg>
            )
        case "z":
            return (
                <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6h12L6 18h12"
                    />
                </svg>
            )
        case "spiral":
            return (
                <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        d="M12 12m-1.5 0a1.5 1.5 0 1 1 3 0a3.5 3.5 0 1 1 -7 0a5.5 5.5 0 1 1 11 0a7.5 7.5 0 1 1 -15 0"
                    />
                </svg>
            )
        case "ring":
            return (
                <svg viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
            )
        case "bolt":
            return (
                <svg viewBox="0 0 24 24" aria-hidden>
                    <path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
                </svg>
            )
        default:
            return (
                <svg viewBox="0 0 24 24" aria-hidden>
                    <path fill="currentColor" d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" />
                </svg>
            )
    }
}

function Particles({ rig }: { rig: Rig }) {
    return (
        <div className="hm-parts" aria-hidden>
            {rig.parts.map((p) => (
                <motion.span
                    key={p.id}
                    className="hm-part"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, color: p.c }}
                    initial={{ opacity: 0, scale: 0.3, x: 0, y: 0, rotate: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1, 1, 0.7], x: p.dx, y: p.dy, rotate: p.r }}
                    transition={{ duration: p.d, ease: "easeOut" }}
                    onAnimationComplete={() => rig.drop(p.id)}
                >
                    <Shape k={p.k} />
                </motion.span>
            ))}
        </div>
    )
}

// ---------------------------------------------------------------------------
// A living Mallow
// ---------------------------------------------------------------------------
function MallowFigure({ id, rig, eager, alt, shadow = true }: { id: MallowId; rig: Rig; eager?: boolean; alt?: string; shadow?: boolean }) {
    const { img, reduced } = useLanding()
    const m = MALLOWS[id]
    const sx = useTransform([rig.squish, rig.pop] as MotionValue<number>[], ([s, p]: number[]) => (1 + 0.17 * s) * p)
    const sy = useTransform([rig.squish, rig.pop] as MotionValue<number>[], ([s, p]: number[]) => (1 - 0.24 * s) * p)
    const shScale = useTransform([rig.squish, rig.y] as MotionValue<number>[], ([s, yy]: number[]) =>
        Math.max(0.5, 1 + 0.18 * s + yy / 160)
    )
    const shOpacity = useTransform(rig.y, (yy) => Math.max(0.25, 0.7 + yy / 140))
    const delay = React.useMemo(() => `${-rand(0, 4).toFixed(2)}s`, [])

    // eyelids: drawn down from the top of the eyes; a blink every few seconds
    const { blinking, lidSrc } = useLanding()
    const lids = blinking ? m.lids : undefined
    const lidClip = useTransform(rig.lid, (v) => {
        const band = lids ? lids.top + (lids.bottom - lids.top) * Math.min(1, Math.max(0, v)) : 0
        return `inset(0 0 ${(100 - band * 100).toFixed(2)}% 0)`
    })
    const lidOpacity = useTransform(rig.lid, (v) => (v > 0.02 ? 1 : 0))
    React.useEffect(() => {
        if (!lids || reduced) return
        let t = 0
        const next = () => {
            t = window.setTimeout(() => {
                if (!document.hidden) rig.blink()
                next()
            }, rand(2600, 6400))
        }
        next()
        return () => window.clearTimeout(t)
    }, [id, !!lids, reduced])

    return (
        <div className="hm-fig">
            {shadow && <motion.div className="hm-fig-shadow" style={{ scaleX: shScale, opacity: shOpacity }} />}
            <motion.div
                className="hm-fig-halo"
                style={{ opacity: rig.glow, background: `radial-gradient(closest-side, ${m.glow}cc, ${m.glow}00)` }}
            />
            <div
                className={reduced ? "hm-fig-breath" : "hm-fig-breath hm-breathe"}
                style={vars({ "--bd": `${m.breath}s`, animationDelay: delay })}
            >
                <motion.div className="hm-fig-body" style={{ x: rig.gx, y: rig.y, rotate: rig.rot, scaleX: sx, scaleY: sy }}>
                    <img
                        className="hm-fig-img"
                        src={img[id]}
                        alt={alt ?? m.alt}
                        draggable={false}
                        loading={eager ? "eager" : "lazy"}
                        decoding="async"
                        width={640}
                        height={Math.round(640 / m.aspect)}
                    />
                    {id === "glitzi" && (
                        <>
                            <motion.img
                                className="hm-glitch hm-glitch-a"
                                src={img[id]}
                                alt=""
                                aria-hidden
                                draggable={false}
                                style={{ opacity: rig.glitch }}
                            />
                            <motion.img
                                className="hm-glitch hm-glitch-b"
                                src={img[id]}
                                alt=""
                                aria-hidden
                                draggable={false}
                                style={{ opacity: rig.glitch }}
                            />
                        </>
                    )}
                    {lids && (
                        <motion.img
                            className="hm-lids"
                            src={lidSrc(id)}
                            alt=""
                            aria-hidden
                            draggable={false}
                            decoding="async"
                            style={{ clipPath: lidClip, WebkitClipPath: lidClip, opacity: lidOpacity }}
                        />
                    )}
                    <motion.div className="hm-blush" style={{ opacity: rig.blush }} aria-hidden>
                        {m.cheeks.map(([cx, cy], i) => (
                            <span
                                key={i}
                                style={{
                                    left: `${cx * 100}%`,
                                    top: `${cy * 100}%`,
                                    background: `radial-gradient(closest-side, ${m.blush}, ${m.blush}00)`,
                                }}
                            />
                        ))}
                    </motion.div>
                </motion.div>
            </div>
            <Particles rig={rig} />
        </div>
    )
}

/** A light, non-interactive Mallow (no rig): idle float only. */
function StillMallow({ id, float = true, eager }: { id: MallowId; float?: boolean; eager?: boolean }) {
    const { img, reduced } = useLanding()
    const m = MALLOWS[id]
    const delay = React.useMemo(() => `${-rand(0, 5).toFixed(2)}s`, [])
    return (
        <div className={float && !reduced ? "hm-still hm-float" : "hm-still"} style={{ animationDelay: delay }}>
            <img
                src={img[id]}
                alt=""
                aria-hidden
                draggable={false}
                loading={eager ? "eager" : "lazy"}
                decoding="async"
                width={640}
                height={Math.round(640 / m.aspect)}
            />
        </div>
    )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const { reduced, canvas } = useLanding()
    if (canvas) return <div className={className}>{children}</div>
    return (
        <motion.div
            className={className}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -12% 0px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
        >
            {children}
        </motion.div>
    )
}

function Arrow({ dir = "right" }: { dir?: "right" | "left" | "down" }) {
    const r = dir === "left" ? 180 : dir === "down" ? 90 : 0
    return (
        <svg className="hm-ico" viewBox="0 0 20 20" aria-hidden style={{ transform: `rotate(${r}deg)` }}>
            <path
                d="M4 10h11m-4-4 4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

// ---------------------------------------------------------------------------
// Atmosphere: slow spirals, a pearlescent sheen, glowing motes and a few
// floating objects. Everything is decorative (aria-hidden), moves on the
// compositor or one small canvas, pauses off screen and stays still for
// reduced motion.
// ---------------------------------------------------------------------------
function spiralPath(turns: number, rMax: number, phase: number, steps = 320): string {
    let d = ""
    for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const a = phase + t * turns * Math.PI * 2
        const r = rMax * Math.pow(t, 1.3)
        d += (i ? "L" : "M") + (Math.cos(a) * r).toFixed(1) + " " + (Math.sin(a) * r).toFixed(1)
    }
    return d
}
const SPIRAL_A = spiralPath(3.1, 490, 0)
const SPIRAL_B = spiralPath(3.1, 490, Math.PI)

/** Two interleaved spirals, slowly turning, with light flowing along them. */
function Spirals({ className, tint = "pearl" }: { className?: string; tint?: "pearl" | "night" }) {
    const id = React.useId().replace(/[:]/g, "")
    const stops = tint === "night" ? ["#7FD4FF", "#C9A8FF", "#FFB8DA"] : ["#FF8FC8", "#A98BFF", "#6CC6F5"]
    return (
        <div className={`hm-spirals ${className || ""}`} aria-hidden>
            <svg viewBox="-500 -500 1000 1000">
                <defs>
                    <linearGradient id={`hm-sp-${id}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={stops[0]} />
                        <stop offset="0.5" stopColor={stops[1]} />
                        <stop offset="1" stopColor={stops[2]} />
                    </linearGradient>
                </defs>
                <g className="hm-spirals-turn">
                    <path d={SPIRAL_A} className="hm-sp-line" stroke={`url(#hm-sp-${id})`} />
                    <path d={SPIRAL_B} className="hm-sp-line" stroke={`url(#hm-sp-${id})`} />
                    <path d={SPIRAL_A} className="hm-sp-flow" stroke={`url(#hm-sp-${id})`} />
                    <path d={SPIRAL_B} className="hm-sp-flow hm-sp-flow-b" stroke={`url(#hm-sp-${id})`} />
                </g>
            </svg>
        </div>
    )
}

const MOTE_COLORS: [number, number, number][] = [
    [255, 255, 255],
    [255, 184, 218],
    [205, 184, 255],
    [175, 226, 255],
    [255, 231, 166],
]

/** A small canvas of drifting, twinkling motes of light. */
function Motes({ density = 1, light = false }: { density?: number; light?: boolean }) {
    const { reduced } = useLanding()
    const ref = React.useRef<HTMLCanvasElement>(null)
    React.useEffect(() => {
        const c = ref.current
        const ctx = c?.getContext("2d")
        if (!c || !ctx) return
        const dpr = Math.min(1.5, window.devicePixelRatio || 1)
        // one pre-rendered glow per colour, so each frame is just drawImage calls
        const sprites = MOTE_COLORS.map(([r, g, b]) => {
            const s = document.createElement("canvas")
            s.width = s.height = 48
            const sg = s.getContext("2d")!
            const gr = sg.createRadialGradient(24, 24, 0, 24, 24, 24)
            gr.addColorStop(0, `rgba(${r},${g},${b},1)`)
            gr.addColorStop(0.22, `rgba(${r},${g},${b},${light ? 0.75 : 0.55})`)
            gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
            sg.fillStyle = gr
            sg.fillRect(0, 0, 48, 48)
            return s
        })
        type Mote = { x: number; y: number; s: number; vy: number; amp: number; ph: number; tw: number; c: number }
        let motes: Mote[] = []
        let w = 0
        let h = 0
        const seed = () => {
            const n = Math.max(14, Math.min(60, Math.round(((w * h) / 26000) * density)))
            motes = Array.from({ length: n }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                s: rand(6, 20),
                vy: rand(5, 18),
                amp: rand(6, 22),
                ph: rand(0, Math.PI * 2),
                tw: rand(0.4, 1.2),
                c: Math.floor(Math.random() * sprites.length),
            }))
        }
        const resize = () => {
            const r = c.getBoundingClientRect()
            w = Math.max(1, r.width)
            h = Math.max(1, r.height)
            c.width = Math.round(w * dpr)
            c.height = Math.round(h * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            seed()
        }
        let t0 = 0
        let raf = 0
        let visible = true
        const draw = (t: number) => {
            ctx.clearRect(0, 0, w, h)
            for (const m of motes) {
                const sway = Math.sin(t * 0.0004 * m.tw + m.ph) * m.amp
                const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0012 * m.tw + m.ph * 2))
                ctx.globalAlpha = alpha
                ctx.drawImage(sprites[m.c], m.x + sway - m.s / 2, m.y - m.s / 2, m.s, m.s)
            }
            ctx.globalAlpha = 1
        }
        const frame = (t: number) => {
            raf = 0
            const dt = Math.min(0.05, (t - (t0 || t)) / 1000)
            t0 = t
            for (const m of motes) {
                m.y -= m.vy * dt
                if (m.y < -20) {
                    m.y = h + 20
                    m.x = Math.random() * w
                }
            }
            draw(t)
            if (visible && !document.hidden) raf = requestAnimationFrame(frame)
        }
        const start = () => {
            if (reduced) {
                draw(0)
                return
            }
            if (!raf && visible && !document.hidden) {
                t0 = 0
                raf = requestAnimationFrame(frame)
            }
        }
        resize()
        start()
        const ro = new ResizeObserver(() => {
            resize()
            if (reduced) draw(0)
        })
        ro.observe(c)
        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting
            if (visible) start()
        })
        io.observe(c)
        const onVis = () => !document.hidden && start()
        document.addEventListener("visibilitychange", onVis)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            document.removeEventListener("visibilitychange", onVis)
        }
    }, [reduced, density, light])
    return <canvas ref={ref} className="hm-motes" aria-hidden />
}

// a few soft objects drifting in the hero (fixed positions, so server and browser agree)
const FLOATERS: { k: "bubble" | "sparkle" | "heart"; x: number; y: number; s: number; d: number; delay: number }[] = [
    { k: "bubble", x: 6, y: 18, s: 26, d: 11, delay: 0 },
    { k: "sparkle", x: 44, y: 8, s: 16, d: 7, delay: 1.2 },
    { k: "bubble", x: 52, y: 70, s: 18, d: 13, delay: 2.4 },
    { k: "heart", x: 92, y: 12, s: 14, d: 9, delay: 0.6 },
    { k: "sparkle", x: 78, y: 82, s: 12, d: 8, delay: 3.1 },
    { k: "bubble", x: 96, y: 52, s: 34, d: 14, delay: 1.8 },
    { k: "sparkle", x: 18, y: 88, s: 14, d: 10, delay: 4.2 },
    { k: "heart", x: 38, y: 92, s: 11, d: 12, delay: 2.9 },
]

function Floaters() {
    return (
        <div className="hm-floaters" aria-hidden>
            {FLOATERS.map((f, i) => (
                <span
                    key={i}
                    className={`hm-floater hm-floater-${f.k}`}
                    style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.s, height: f.s, animationDuration: `${f.d}s`, animationDelay: `${-f.delay}s` }}
                >
                    {f.k === "sparkle" ? <Shape k="sparkle" /> : f.k === "heart" ? <Shape k="heart" /> : null}
                </span>
            ))}
        </div>
    )
}

/** The hero's living backdrop, with gentle pointer and scroll parallax. */
function HeroAtmosphere() {
    const { reduced } = useLanding()
    const ref = React.useRef<HTMLDivElement>(null)
    const mx = useMotionValue(0)
    const my = useMotionValue(0)
    const sx = useSpring(mx, { stiffness: 40, damping: 18 })
    const sy = useSpring(my, { stiffness: 40, damping: 18 })
    const { scrollY } = useScroll()
    const layer = (depth: number, scroll: number) => ({
        x: useTransform(sx, (v) => (reduced ? 0 : v * depth)),
        y: useTransform([sy, scrollY] as MotionValue<number>[], ([v, s]: number[]) => (reduced ? 0 : v * depth + s * scroll)),
    })
    const far = layer(-14, 0.12)
    const mid = layer(-28, 0.22)
    const near = layer(-46, 0.32)
    React.useEffect(() => {
        if (reduced) return
        const host = ref.current?.parentElement
        if (!host) return
        const on = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return
            const r = host.getBoundingClientRect()
            mx.set((e.clientX - r.left) / r.width - 0.5)
            my.set((e.clientY - r.top) / r.height - 0.5)
        }
        const off = () => {
            mx.set(0)
            my.set(0)
        }
        host.addEventListener("pointermove", on)
        host.addEventListener("pointerleave", off)
        return () => {
            host.removeEventListener("pointermove", on)
            host.removeEventListener("pointerleave", off)
        }
    }, [reduced])
    return (
        <div className="hm-atmos" ref={ref} aria-hidden>
            <motion.div className="hm-atmos-layer" style={far}>
                <div className="hm-pearl" />
            </motion.div>
            <motion.div className="hm-atmos-layer" style={mid}>
                <Spirals className="hm-hero-spirals" />
            </motion.div>
            <motion.div className="hm-atmos-layer" style={near}>
                <Motes />
                <Floaters />
            </motion.div>
        </div>
    )
}

/** Plays a small personality move now and then while a Mallow is on screen and left alone. */
function useIdleQuirk(rig: Rig, m: Mallow, host: React.RefObject<HTMLElement>, lastTouch: React.MutableRefObject<number>) {
    const { reduced, canvas } = useLanding()
    const mRef = React.useRef(m)
    mRef.current = m
    React.useEffect(() => {
        if (reduced || canvas) return
        let seen = false
        const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
        if (host.current) io.observe(host.current)
        const t = window.setInterval(() => {
            if (!seen || document.hidden || performance.now() - lastTouch.current < 7000) return
            rig.idle(mRef.current)
        }, 9000)
        return () => {
            io.disconnect()
            window.clearInterval(t)
        }
    }, [reduced, canvas])
}

/** Counts quick taps: three within 1.4 s is a tickle. */
function useTickle() {
    const taps = React.useRef<number[]>([])
    return React.useCallback(() => {
        const now = performance.now()
        taps.current = [...taps.current.filter((t) => now - t < 1400), now]
        if (taps.current.length >= 3) {
            taps.current = []
            return true
        }
        return false
    }, [])
}

/** Share the page: the system share sheet where there is one, otherwise copy the link. */
async function sharePage(text: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
    const url = window.location.origin + window.location.pathname
    const nav = navigator as any
    if (typeof nav.share === "function") {
        try {
            await nav.share({ title: "hushmallow", text, url })
            return "shared"
        } catch (e: any) {
            if (e && e.name === "AbortError") return "cancelled"
        }
    }
    try {
        await navigator.clipboard.writeText(`${text} ${url}`)
        return "copied"
    } catch {
        return "failed"
    }
}

function ShareIcon() {
    return (
        <svg className="hm-ico" viewBox="0 0 20 20" aria-hidden>
            <path
                d="M10 12.5V3.5m0 0L6.8 6.7M10 3.5l3.2 3.2M5.5 10.5v4.2c0 .7.6 1.3 1.3 1.3h6.4c.7 0 1.3-.6 1.3-1.3v-4.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function Nav({ logo, fixed, cta, onCta, onLogin }: { logo: string; fixed: boolean; cta: string; onCta: () => void; onLogin: () => void }) {
    const { scrollTo } = useLanding()
    const [scrolled, setScrolled] = React.useState(false)
    React.useEffect(() => {
        if (!fixed) return
        const on = () => setScrolled(window.scrollY > 12)
        on()
        window.addEventListener("scroll", on, { passive: true })
        return () => window.removeEventListener("scroll", on)
    }, [fixed])
    const link = (id: string, label: string) => (
        <a
            href={`#${id}`}
            onClick={(e) => {
                e.preventDefault()
                scrollTo(id)
            }}
        >
            {label}
        </a>
    )
    return (
        <header className={`hm-nav${fixed ? " is-fixed" : ""}${scrolled ? " is-scrolled" : ""}`}>
            <div className="hm-nav-in">
                <a
                    className="hm-nav-logo"
                    href="#top"
                    onClick={(e) => {
                        e.preventDefault()
                        scrollTo("top")
                    }}
                >
                    <img src={logo} alt="hushmallow" width={1200} height={201} />
                </a>
                <nav className="hm-nav-links" aria-label="On this page">
                    {link("try", "Start here")}
                    {link("mallows", "The Mallows")}
                    {link("moodspell", "Moodspell")}
                    {link("hushmates", "Hushmates")}
                </nav>
                <div className="hm-nav-actions">
                    <button type="button" className="hm-textbtn hm-nav-login" onClick={onLogin}>
                        Log in
                    </button>
                    <button type="button" className="hm-btn hm-btn-primary hm-btn-sm" onClick={onCta}>
                        <span className="hm-nav-cta-long">{cta}</span>
                        <span className="hm-nav-cta-short">Sign up</span>
                    </button>
                </div>
            </div>
        </header>
    )
}

// ---------------------------------------------------------------------------
// Hero. Feel something? hushmallow. Squeeze a Mallow before reading on
// ---------------------------------------------------------------------------
const SLOT_START: MallowId[] = ["noomi", "boppo", "blubi", "glitzi", "loomi", "zuzu"]
const SLOT_X = [0.1, 0.9, 0.11, 0.89, 0.16, 0.83] // where each side slot sits, for leaning towards the pointer

/**
 * The headline, revealed word by word. A "\n" in the text starts a new line, and
 * the squishy word (found in any case) squishes with the hero Mallow.
 */
function RevealHeadline({ text, word, wx, wy }: { text: string; word: string; wx: MotionValue<number>; wy: MotionValue<number> }) {
    const wl = (word || "").trim().toLowerCase()
    let found = false
    let k = 0
    const unit = (content: React.ReactNode, key: string, extra = "") => (
        <span key={key} className={`hm-rv${extra}`}>
            <span className="hm-rv-in" style={{ animationDelay: `${0.15 + k++ * 0.11}s` }}>
                {content}
            </span>
        </span>
    )
    const words = (t: string, key: string) =>
        t
            .split(/(\s+)/)
            .filter((x) => x.length)
            .map((x, i) => (/^\s+$/.test(x) ? " " : unit(x, `${key}-${i}`)))
    return (
        <>
            {text.split(/\n/).map((line, li) => {
                const i = !found && wl ? line.toLowerCase().indexOf(wl) : -1
                let body: React.ReactNode[]
                if (i < 0) body = words(line, `l${li}`)
                else {
                    found = true
                    const before = line.slice(0, i)
                    const shown = line.slice(i, i + wl.length)
                    const rest = line.slice(i + wl.length)
                    // punctuation straight after the word stays on its line
                    const glue = (rest.match(/^[^\s]*/) || [""])[0]
                    body = [
                        ...words(before, `b${li}`),
                        unit(
                            <>
                                <motion.span className="hm-squishword" style={{ scaleX: wx, scaleY: wy }}>
                                    {shown}
                                </motion.span>
                                {glue}
                            </>,
                            `w${li}`,
                            " hm-rv-word"
                        ),
                        ...words(rest.slice(glue.length), `a${li}`),
                    ]
                }
                return (
                    <React.Fragment key={li}>
                        {li > 0 && <br />}
                        {body}
                    </React.Fragment>
                )
            })}
        </>
    )
}

/** A side Mallow: leans towards the visitor's pointer and hops when the squad cheers. */
function SideMallow({ id, i, px, cheer }: { id: MallowId; i: number; px: MotionValue<number>; cheer: number }) {
    const { reduced } = useLanding()
    const hop = useMotionValue(0)
    const lean = useSpring(
        useTransform(px, (v) => (reduced || v < 0 ? 0 : Math.max(-9, Math.min(9, (v - SLOT_X[i]) * 16)))),
        { stiffness: 80, damping: 14 }
    )
    React.useEffect(() => {
        if (!cheer || reduced) return
        animate(hop, [0, -16, 0, -5, 0], { duration: 0.7, delay: (i % 3) * 0.06 + (i > 2 ? 0.08 : 0), ease: "easeOut" })
    }, [cheer])
    return (
        <motion.span className="hm-side-lean" style={{ rotate: lean, y: hop }}>
            <StillMallow id={id} eager />
        </motion.span>
    )
}

function Hero(props: { headline: string; squishWord: string; support: string; sub: string; primaryCta: string; secondaryCta: string }) {
    const { reduced, scrollTo, canvas, remembered, rememberOn, setRemember, meetMallow } = useLanding()
    const rig = useRig(reduced)
    const { later } = useTimers()
    const [center, setCenter] = React.useState<MallowId>("pipzi")
    const [slots, setSlots] = React.useState<MallowId[]>(SLOT_START)
    const [count, setCount] = React.useState(0)
    const [cheer, setCheer] = React.useState<number[]>([0, 0, 0, 0, 0, 0])
    const [line, setLine] = React.useState<{ id: number; text: string; who: string } | null>(null)
    const [welcomed, setWelcomed] = React.useState<MallowId | null>(null)
    const lineTimer = React.useRef<number | null>(null)
    const touched = React.useRef(false)
    const lastTouch = React.useRef(0)
    const heroRef = React.useRef<HTMLElement>(null)
    const tickled = useTickle()
    const px = useMotionValue(-1)
    const m = MALLOWS[center]
    useIdleQuirk(rig, m, heroRef, lastTouch)

    // the squishy word in the headline squishes with the Mallow
    const wx = useTransform(rig.squish, (s) => 1 + 0.14 * s)
    const wy = useTransform(rig.squish, (s) => 1 - 0.3 * s)

    // landing squash when the hero appears
    React.useEffect(() => {
        if (reduced || canvas) return
        rig.squish.set(0)
        later(() => {
            rig.press(0.55, 0.14)
            later(() => rig.release(), 160)
        }, 620)
    }, [])

    const say = (text: string, who: string, ms = 4200) => {
        setLine({ id: uid(), text, who })
        if (lineTimer.current) window.clearTimeout(lineTimer.current)
        lineTimer.current = window.setTimeout(() => setLine(null), ms)
    }
    React.useEffect(() => () => void (lineTimer.current && window.clearTimeout(lineTimer.current)), [])

    // a returning visitor who asked to be remembered is greeted by their Mallow
    React.useEffect(() => {
        if (!remembered || welcomed === remembered || touched.current) return
        setWelcomed(remembered)
        if (remembered !== center) {
            const i = slots.indexOf(remembered)
            if (i >= 0) {
                const s = [...slots]
                s[i] = center
                setSlots(s)
            }
            setCenter(remembered)
        }
        later(() => {
            rig.signature(MALLOWS[remembered], 0.6)
            say("Oh hey, you're back. I saved you a spot.", MALLOWS[remembered].name, 5200)
        }, 1100)
    }, [remembered])

    // now and then a friend peeks up, as if to say "me next?"
    React.useEffect(() => {
        if (reduced || canvas) return
        const t = window.setInterval(() => {
            if (document.hidden) return
            const i = Math.floor(Math.random() * 6)
            setCheer((c) => c.map((v, k) => (k === i ? v + 1 : v)))
        }, 6500)
        return () => window.clearInterval(t)
    }, [reduced, canvas])

    const press = usePress({
        onDown: () => {
            touched.current = true
            lastTouch.current = performance.now()
            rig.press(1, 0.9)
        },
        onUp: (held, cancelled) => {
            rig.release()
            lastTouch.current = performance.now()
            if (cancelled) return
            rig.signature(m)
            vibrate(12)
            const n = count + 1
            setCount(n)
            // the whole squad reacts
            setCheer((c) => c.map((v) => v + 1))
            meetMallow(center)
            // little surprises: a long, patient squeeze, or a quick triple tap
            if (held > 2600) say(LONG_SQUEEZE, m.name)
            else if (n > 1 && tickled()) {
                rig.emit("heart", 5, m.colors)
                say(m.tickle, m.name)
            } else say(n === 1 ? FIRST_SQUEEZE : m.lines[(n - 2) % m.lines.length], m.name)
        },
    })

    const swap = (i: number) => {
        touched.current = true
        const next = slots[i]
        const s = [...slots]
        s[i] = center
        setSlots(s)
        setCenter(next)
        rig.squish.set(0)
        later(() => rig.signature(MALLOWS[next], 0.6), 380)
        say(`${MALLOWS[next].hello} Go on, squeeze me.`, MALLOWS[next].name)
        meetMallow(next)
    }

    // "Meet your Mallow": start with a feeling, and the right Mallow comes to you
    const tryFeeling = () => {
        scrollTo("try")
        window.setTimeout(() => document.querySelector<HTMLElement>("#try .hm-chip")?.focus({ preventScroll: true }), reduced ? 50 : 900)
    }

    const paragraphs = (props.sub || "").split(/\n\s*\n|\n/).map((t) => t.trim()).filter(Boolean)

    return (
        <section className="hm-hero" id="top" aria-labelledby="hm-hero-title" ref={heroRef}>
            <div className="hm-orb hm-orb-a" aria-hidden />
            <div className="hm-orb hm-orb-b" aria-hidden />
            <div className="hm-orb hm-orb-c" aria-hidden />
            <HeroAtmosphere />
            <div className="hm-wrap hm-hero-grid">
                <div className="hm-hero-copy">
                    <p className="hm-eyebrow">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        <span>Think emotion. Think hushmallow.</span>
                    </p>
                    <h1 className="hm-h1" id="hm-hero-title" aria-label={props.headline.replace(/\s*\n\s*/g, " ")}>
                        <span aria-hidden>
                            <RevealHeadline text={props.headline} word={props.squishWord} wx={wx} wy={wy} />
                        </span>
                    </h1>
                    {props.support && <p className="hm-hero-support">{props.support}</p>}
                    <div className="hm-lead-group">
                        {paragraphs.map((t, i) => (
                            <p key={i} className="hm-lead">
                                {t}
                            </p>
                        ))}
                    </div>
                    <div className="hm-cta-row">
                        <button type="button" className="hm-btn hm-btn-primary hm-btn-lg" onClick={tryFeeling}>
                            {props.primaryCta}
                            <Arrow dir="down" />
                        </button>
                        <a
                            className="hm-btn hm-btn-ghost hm-btn-lg"
                            href="#moodspell"
                            onClick={(e) => {
                                e.preventDefault()
                                scrollTo("moodspell")
                            }}
                        >
                            <span className="hm-magic-dot" aria-hidden />
                            {props.secondaryCta}
                        </a>
                    </div>
                    <p className="hm-hero-note">No account needed to say hello.</p>
                </div>

                <div className="hm-hero-stage-wrap">
                    <div
                        className="hm-stage"
                        onPointerMove={(e) => {
                            if (e.pointerType !== "mouse") return
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            px.set((e.clientX - r.left) / r.width)
                        }}
                        onPointerLeave={() => px.set(-1)}
                    >
                        <div
                            className="hm-stage-glow"
                            style={{ background: `radial-gradient(closest-side, ${m.glow}55, transparent)` }}
                            aria-hidden
                        />
                        <div className="hm-pillow" aria-hidden>
                            <span />
                            <span />
                            <span />
                        </div>
                        {slots.map((id, i) => (
                            <button
                                key={id}
                                type="button"
                                className={`hm-side hm-slot-${i}`}
                                onClick={() => swap(i)}
                                aria-label={`Bring ${MALLOWS[id].name} to the middle`}
                            >
                                <motion.span
                                    className="hm-side-in"
                                    initial={canvas ? false : { opacity: 0, scale: 0.5, y: -24 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={
                                        reduced
                                            ? { duration: 0.3 }
                                            : {
                                                  type: "spring",
                                                  stiffness: 240,
                                                  damping: 14,
                                                  delay: count || slots !== SLOT_START ? 0 : 0.5 + i * 0.08,
                                              }
                                    }
                                >
                                    <SideMallow id={id} i={i} px={px} cheer={cheer[i]} />
                                </motion.span>
                            </button>
                        ))}
                        <motion.div
                            key={center}
                            className="hm-center"
                            initial={canvas ? false : reduced ? { opacity: 0 } : { opacity: 0, y: -90, scale: 0.85 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={reduced ? { duration: 0.3 } : { type: "spring", stiffness: 200, damping: 15, mass: 0.9 }}
                        >
                            <button
                                type="button"
                                className="hm-squish"
                                aria-label={`Squeeze ${m.name}. Press and hold, then let go.`}
                                {...press}
                            >
                                <MallowFigure id={center} rig={rig} eager />
                            </button>
                        </motion.div>
                        <div className="hm-caption-zone" aria-live="polite">
                            <AnimatePresence mode="wait">
                                {line && (
                                    <motion.p
                                        key={line.id}
                                        className="hm-caption"
                                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        <span className="hm-caption-who">{line.who}</span>
                                        {line.text}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className="hm-stage-foot">
                        {welcomed && rememberOn && count < 3 ? (
                            <p className="hm-hint">
                                <span className="hm-hint-dot" aria-hidden />
                                Welcome back
                                <button type="button" className="hm-textbtn hm-textbtn-inline hm-forget" onClick={() => setRemember(false)}>
                                    Forget me
                                </button>
                            </p>
                        ) : count < 3 ? (
                            <p className="hm-hint">
                                <span className="hm-hint-dot" aria-hidden />
                                {count === 0 ? `Press and hold ${m.name}` : "Tap a friend to swap Mallows"}
                            </p>
                        ) : (
                            <a
                                className="hm-nudge"
                                href="#try"
                                onClick={(e) => {
                                    e.preventDefault()
                                    tryFeeling()
                                }}
                            >
                                Now bring a real feeling
                                <Arrow dir="down" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// B. The little moment — choose a feeling, breathe it lighter with a Mallow
// ---------------------------------------------------------------------------
type Phase = "pick" | "sense" | "care" | "ready" | "inhale" | "exhale" | "choice" | "leaving" | "reflect" | "done"

// left-hand bubbles are anchored by `left`, right-hand ones by `right`, so
// labels grow inwards and never poke out of the panel on small phones
const SAT_POS: { side: "left" | "right"; x: number; y: number }[] = [
    { side: "left", x: -10, y: 2 },
    { side: "right", x: -10, y: -2 },
    { side: "left", x: -14, y: 60 },
    { side: "right", x: -14, y: 56 },
    { side: "left", x: 12, y: -26 },
    { side: "right", x: 12, y: -28 },
]

function Satellites({ f, count }: { f: Feeling; count: number }) {
    const { reduced } = useLanding()
    const kind = f.sat.kind
    if (kind === "drop") {
        return (
            <div className="hm-rain" aria-hidden>
                {Array.from({ length: count * 2 }, (_, i) => (
                    <span key={i} style={{ left: `${12 + ((i * 37) % 76)}%`, animationDelay: `${(i * 0.37) % 1.6}s` }} />
                ))}
            </div>
        )
    }
    return (
        <div className="hm-sats" aria-hidden>
            <AnimatePresence>
                {Array.from({ length: count }, (_, i) => {
                    const pos = SAT_POS[i % SAT_POS.length]
                    const label = f.sat.labels?.[i]
                    return (
                        <motion.span
                            key={i}
                            className={`hm-sat hm-sat-${kind}`}
                            style={{ [pos.side]: `${pos.x}%`, top: `${pos.y}%` }}
                            initial={{ opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.2, y: -40, rotate: i % 2 ? 30 : -30 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <span className={reduced ? "" : "hm-float-sm"} style={{ animationDelay: `${-i * 0.7}s` }}>
                                {kind === "tab" || kind === "whatif" || kind === "ping" ? (
                                    <>
                                        {kind === "ping" && <i className="hm-ping-dot" />}
                                        {label}
                                        {kind === "tab" && <i className="hm-tab-x">×</i>}
                                    </>
                                ) : kind === "bolt" ? (
                                    <Shape k="bolt" />
                                ) : kind === "sparkle" ? (
                                    <Shape k="sparkle" />
                                ) : (
                                    <i className="hm-fizz-dot" />
                                )}
                            </span>
                        </motion.span>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}

function jitterFor(j: Jitter, a: number, reduced: boolean) {
    if (reduced || a <= 0.01) return { animate: { x: 0, y: 0, rotate: 0, scale: 1 }, transition: { duration: 0.6 } }
    const loop = (duration: number, ease: any = "easeInOut") => ({ duration, ease, repeat: Infinity })
    switch (j) {
        case "tremble":
            return { animate: { x: [0, 2 * a, -2 * a, 1.2 * a, 0], y: 0, rotate: 0, scale: 1 }, transition: loop(0.32, "linear") }
        case "shake":
            return {
                animate: { x: [0, -4 * a, 4 * a, -3 * a, 3 * a, 0], rotate: [0, -1.6 * a, 1.6 * a, 0], y: 0, scale: 1 },
                transition: loop(0.5, "linear"),
            }
        case "droop":
            return { animate: { y: [0, 9 * a, 0], x: 0, rotate: 0, scale: 1 }, transition: loop(3.4) }
        case "bounce":
            return { animate: { y: [0, -12 * a, 0], x: 0, rotate: 0, scale: 1 }, transition: loop(0.55) }
        case "swirl":
            return { animate: { rotate: [0, 2.5 * a, -2.5 * a, 0], x: [0, 3 * a, -3 * a, 0], y: 0, scale: 1 }, transition: loop(1.6) }
        case "haze":
            return { animate: { y: [0, 4 * a, 0], x: 0, rotate: 0, scale: 1 }, transition: loop(4.2) }
        case "shine":
        default:
            return { animate: { scale: [1, 1 + 0.035 * a, 1], x: 0, y: 0, rotate: 0 }, transition: loop(2.4) }
    }
}

function ThoughtCloud({
    f,
    label,
    breaths,
    result,
    draggable,
    onFlick,
}: {
    f: Feeling
    label: string
    breaths: number
    result: "drift" | "keep" | null
    draggable: boolean
    onFlick: () => void
}) {
    const { reduced } = useLanding()
    const w = f.positive ? breaths / 3 : 1 - breaths / 3 // heaviness, or glow for good feelings
    const satCount = f.positive ? Math.round(breaths * 2) : Math.round(6 * w)
    const j = jitterFor(f.jitter, f.positive ? w : w, reduced)
    const heavyText = !f.positive && w > 0.5
    const scale = f.positive ? 0.86 + 0.2 * w : 0.7 + 0.3 * w
    const away =
        result === "drift"
            ? { y: -320, scale: 0.5, opacity: 0 }
            : result === "keep"
              ? { y: 30, scale: 0.55, opacity: 1 }
              : { y: 0, scale, opacity: 1 }
    return (
        <motion.div
            className="hm-cloud-wrap"
            animate={away}
            transition={{
                duration: result ? (reduced ? 0.6 : 2.2) : 2.2,
                ease: result === "drift" ? [0.55, 0, 0.6, 1] : [0.22, 1, 0.36, 1],
            }}
        >
            <motion.div
                className={`hm-cloud-drag${draggable ? " is-draggable" : ""}`}
                drag={draggable ? "y" : false}
                dragConstraints={{ top: -160, bottom: 0 }}
                dragElastic={0.35}
                dragSnapToOrigin
                onDragEnd={(_, info) => {
                    if (info.offset.y < -60 || info.velocity.y < -500) onFlick()
                }}
            >
                <motion.div className="hm-cloud-jitter" animate={j.animate} transition={j.transition}>
                    <div className={reduced ? "hm-cloud" : "hm-cloud hm-blob"}>
                        <motion.div
                            className="hm-cloud-layer"
                            style={{ background: `linear-gradient(150deg, ${f.heavy[0]}, ${f.heavy[1]})` }}
                            animate={{ opacity: f.positive ? 1 - w : w }}
                            transition={{ duration: 2.2 }}
                        />
                        <motion.div
                            className="hm-cloud-layer"
                            style={{ background: `linear-gradient(150deg, ${f.light[0]}, ${f.light[1]})` }}
                            animate={{ opacity: f.positive ? w : 1 - w }}
                            transition={{ duration: 2.2 }}
                        />
                        <div className="hm-cloud-sheen" />
                        <motion.span
                            className="hm-cloud-text"
                            animate={{ color: heavyText ? "#FFFFFF" : "#1F1640" }}
                            transition={{ duration: 1.2 }}
                        >
                            {label}
                        </motion.span>
                    </div>
                </motion.div>
                <Satellites f={f} count={result === "drift" ? 0 : satCount} />
            </motion.div>
            <div className="hm-cloud-tail" aria-hidden>
                <span />
                <span />
            </div>
        </motion.div>
    )
}

/**
 * The room around the live moment changes with the feeling: a slow spiral for
 * overwhelm, static for frustration, rain for low days, ripples for worry,
 * fizz for restlessness, sun rays for good news, stars and fog for "not sure".
 * `level` eases it as you breathe; `settled` shows how the room looks after.
 */
function LabWeather({ f, level, settled }: { f: Feeling; level: number; settled: boolean }) {
    const n = (count: number) => Array.from({ length: count }, (_, i) => i)
    return (
        <div
            className={`hm-weather hm-wx-${f.id}${settled ? " is-settled" : ""}`}
            style={vars({ "--wl": Math.max(0, Math.min(1, level)).toFixed(2) })}
            aria-hidden
        >
            <div className="hm-wx-now">
                {f.id === "overwhelmed" && <Spirals className="hm-wx-spiral" />}
                {f.id === "frustrated" &&
                    n(7).map((i) => (
                        <span key={i} className="hm-wx-streak" style={{ top: `${10 + i * 12}%`, animationDelay: `${-i * 0.37}s`, animationDuration: `${1.4 + (i % 3) * 0.5}s` }} />
                    ))}
                {f.id === "low" &&
                    n(16).map((i) => (
                        <span key={i} className="hm-wx-rain" style={{ left: `${3 + ((i * 37) % 94)}%`, animationDelay: `${-((i * 0.29) % 1.8)}s` }} />
                    ))}
                {f.id === "anxious" && n(3).map((i) => <span key={i} className="hm-wx-ripple" style={{ animationDelay: `${i * 1.6}s` }} />)}
                {f.id === "restless" &&
                    n(12).map((i) => (
                        <span key={i} className="hm-wx-fizz" style={{ left: `${4 + ((i * 41) % 92)}%`, animationDelay: `${-((i * 0.53) % 3)}s`, width: 6 + (i % 4) * 3, height: 6 + (i % 4) * 3 }} />
                    ))}
                {f.id === "good" && (
                    <>
                        <span className="hm-wx-rays" />
                        {n(8).map((i) => (
                            <span key={i} className="hm-wx-glint" style={{ left: `${8 + ((i * 29) % 84)}%`, top: `${8 + ((i * 47) % 70)}%`, animationDelay: `${-i * 0.4}s` }}>
                                <Shape k="sparkle" />
                            </span>
                        ))}
                    </>
                )}
                {f.id === "unsure" && (
                    <>
                        {n(14).map((i) => (
                            <span key={i} className="hm-wx-star" style={{ left: `${4 + ((i * 43) % 92)}%`, top: `${4 + ((i * 31) % 55)}%`, animationDelay: `${-i * 0.45}s` }} />
                        ))}
                        <span className="hm-wx-fog" />
                        <span className="hm-wx-fog hm-wx-fog-b" />
                    </>
                )}
            </div>
            <div className="hm-wx-after" />
        </div>
    )
}

function FeelingLab({ accountCta }: { accountCta: string }) {
    const { reduced, openAuth, noteFeeling, meetMallow, registerLab, share: shareLink } = useLanding()
    const rig = useRig(reduced)
    const { later, clearAll } = useTimers()
    const ring = useMotionValue(0)
    const discScale = useTransform(ring, (v) => 0.82 + 0.26 * v)
    const ringAnim = React.useRef<{ stop: () => void } | null>(null)
    const labRef = React.useRef<HTMLDivElement>(null)

    const [fid, setFid] = React.useState<FeelingId | null>(null)
    const [phase, setPhase] = React.useState<Phase>("pick")
    const [breaths, setBreaths] = React.useState(0)
    const [line, setLine] = React.useState("")
    const [name, setName] = React.useState("")
    const [draft, setDraft] = React.useState("")
    const [editing, setEditing] = React.useState(false)
    const [ringFull, setRingFull] = React.useState(false)
    const [tooShort, setTooShort] = React.useState(false)
    const [result, setResult] = React.useState<"drift" | "keep" | null>(null)
    const [reflection, setReflection] = React.useState<ReflectId | null>(null)
    const [auto, setAuto] = React.useState(false)
    const [said, setSaid] = React.useState("") // FeelSense input
    const [senseNote, setSenseNote] = React.useState<"" | "unsure" | "correct">("")
    const [concern, setConcern] = React.useState(false)

    const f = FEELINGS.find((x) => x.id === fid) || null
    const m = f ? MALLOWS[f.mallow] : null
    const label = name.trim() || f?.cloud || ""

    React.useEffect(() => ring.on("change", (v) => setRingFull(v >= 0.999)), [ring])

    const reset = () => {
        clearAll()
        ringAnim.current?.stop()
        ring.set(0)
        rig.squish.set(0)
        setFid(null)
        setPhase("pick")
        setBreaths(0)
        setLine("")
        setName("")
        setDraft("")
        setEditing(false)
        setResult(null)
        setReflection(null)
        setAuto(false)
        setTooShort(false)
        setSaid("")
        setSenseNote("")
        setConcern(false)
    }

    const keepInView = () =>
        later(() => {
            const el = labRef.current
            if (!el) return
            const r = el.getBoundingClientRect()
            if (r.top < 0 || r.top > window.innerHeight * 0.4) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
        }, 60)

    // FeelSense preview: rule-based, on this page only, and it always asks
    const share = () => {
        const text = said.trim()
        if (!text) return
        const r = feelSense(text)
        setName(text.length <= 36 ? text : text.slice(0, 34).trimEnd() + "…")
        setSenseNote("")
        if (r.kind === "crisis") {
            clearAll()
            setFid("unsure")
            setPhase("care")
            keepInView()
            return
        }
        setConcern(r.concern)
        if (r.kind === "none") {
            setSenseNote("unsure")
            return
        }
        const nf = FEELINGS.find((x) => x.id === r.id)!
        clearAll()
        setFid(r.id)
        setBreaths(0)
        setResult(null)
        setReflection(null)
        setPhase("sense")
        setLine(`${nf.sense} Did I get that right?`)
        later(() => rig.signature(MALLOWS[nf.mallow], 0.5), 450)
        keepInView()
    }

    const confirm = (yes: boolean) => {
        if (!f) return
        if (yes) {
            choose(f.id)
            return
        }
        setPhase("pick")
        setSenseNote("correct")
    }

    const choose = (id: FeelingId) => {
        const nf = FEELINGS.find((x) => x.id === id)!
        noteFeeling({ feeling: id, mallow: nf.mallow })
        meetMallow(nf.mallow)
        clearAll()
        setFid(id)
        setPhase("ready")
        setBreaths(0)
        setResult(null)
        setReflection(null)
        setTooShort(false)
        setLine(nf.intro)
        later(() => rig.signature(MALLOWS[nf.mallow], 0.6), 450)
        keepInView()
    }

    // a Mallow card elsewhere on the page can start the moment with its feeling
    const chooseRef = React.useRef(choose)
    chooseRef.current = choose
    React.useEffect(() => registerLab((id) => chooseRef.current(id)), [])

    // the room around the Mallow: the feeling's weather, easing as you breathe,
    // and changing once you let the thought go (or keep it)
    const weather = !f ? 0 : f.positive ? 0.35 + 0.65 * (breaths / 3) : 1 - 0.7 * (breaths / 3)

    // the Mallow's own mood: it moves like the feeling, and settles as you breathe
    const moodAmount = !f
        ? 0
        : phase === "inhale" || phase === "leaving" || phase === "reflect" || phase === "done"
        ? 0
        : f.positive
        ? 0.35 + 0.65 * (breaths / 3)
        : 1 - breaths / 3
    const mood = f ? jitterFor(f.jitter, moodAmount * 0.8, reduced) : jitterFor("haze", 0, true)
    React.useEffect(() => {
        if (!f || f.id !== "frustrated" || reduced || breaths >= 3 || !(phase === "sense" || phase === "ready")) return
        const t = window.setInterval(() => {
            animate(rig.glitch, [0, 0.9, 0, 0.6, 0], { duration: 0.45, ease: "linear" })
            animate(rig.gx, [0, -5, 4, 0], { duration: 0.35, ease: "linear" })
        }, 2600)
        return () => window.clearInterval(t)
    }, [fid, phase, breaths, reduced])

    const startInhale = () => {
        if (phase !== "ready" || !f) return
        setEditing(false)
        setTooShort(false)
        setPhase("inhale")
        rig.press(1, 3.8)
        ringAnim.current?.stop()
        ringAnim.current = animate(ring, 1, { duration: 4, ease: "linear" })
    }

    const endInhale = (held: number) => {
        if (phase !== "inhale" || !f || !m) return
        ringAnim.current?.stop()
        if (held < 1100) {
            animate(ring, 0, { duration: 0.4 })
            rig.release(true)
            setPhase("ready")
            setTooShort(true)
            return
        }
        const n = breaths + 1
        setBreaths(n)
        setPhase("exhale")
        animate(ring, 0, { duration: reduced ? 0.6 : 3, ease: "easeInOut" })
        rig.release(true)
        rig.pulseBlush()
        rig.emit(m.part, 3, m.colors)
        vibrate(10)
        later(
            () => {
                setLine(f.breaths[n - 1])
                setPhase(n >= 3 ? "choice" : "ready")
                if (n >= 3) setAuto(false)
            },
            reduced ? 800 : 2600
        )
    }

    const press = usePress({
        disabled: !(phase === "ready" || phase === "inhale"),
        onDown: () => {
            setAuto(false)
            startInhale()
        },
        onUp: (held) => endInhale(held),
    })

    // "Do it for me": the Mallow breathes on its own
    const phaseRef = React.useRef(phase)
    phaseRef.current = phase
    const inhaleStart = React.useRef(0)
    React.useEffect(() => {
        if (!auto) return
        if (phase === "ready") {
            const t = later(() => {
                inhaleStart.current = performance.now()
                startInhale()
            }, 900)
            return () => window.clearTimeout(t)
        }
        if (phase === "inhale") {
            const t = later(() => endInhale(performance.now() - inhaleStart.current), 3800)
            return () => window.clearTimeout(t)
        }
    }, [auto, phase])

    const decide = (r: "drift" | "keep") => {
        if (phase !== "choice" || !f || !m) return
        setResult(r)
        setPhase("leaving")
        setLine(r === "drift" ? f.drift(label) : f.keep)
        rig.signature(m, r === "drift" ? 1.2 : 0.6)
        vibrate([10, 40, 10])
        later(() => setPhase("reflect"), reduced ? 900 : 2600)
    }

    const reflect = (r: ReflectId | null) => {
        if (!f || !m) return
        setReflection(r)
        if (r) {
            const item = REFLECT.find((x) => x.id === r)!
            setLine(f.positive ? item.goodReply : item.reply)
            if (r === "lighter") rig.signature(m, 0.8)
            else rig.pulseBlush()
        }
        setPhase("done")
    }

    const saveName = () => {
        setName(draft.trim().slice(0, 32))
        setEditing(false)
    }

    const instr = (() => {
        if (!m) return ""
        if (phase === "inhale") return ringFull ? "…and let go." : "Breathe in…"
        if (phase === "exhale") return "Breathe out, slowly…"
        if (phase === "ready") {
            if (auto) return `${m.name} is breathing for you. Just follow along.`
            return breaths === 0 ? `Press and hold ${m.name} while you breathe in` : `Again: hold and breathe in (${breaths + 1} of 3)`
        }
        return ""
    })()

    const holdLabel = phase === "inhale" ? (ringFull ? "Let go" : "Holding…") : `Hold to squeeze ${m?.name ?? ""}`

    return (
        <section className="hm-section hm-try" id="try" aria-labelledby="hm-try-title">
            <div className="hm-wrap">
                <Reveal className="hm-head hm-head-center">
                    <p className="hm-eyebrow">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        Meet your Mallow · no account needed
                    </p>
                    <h2 className="hm-h2" id="hm-try-title">
                        Can't explain the feeling? <em>Start anywhere.</em>
                    </h2>
                    <p className="hm-sub">
                        Tell us what's going on, or pick a feeling. We'll help you find a Mallow to explore it with.
                    </p>
                </Reveal>

                <div className="hm-lab" ref={labRef} data-phase={phase} data-feeling={f?.id || ""}>
                    <AnimatePresence initial={false}>
                        <motion.div
                            key={m ? m.id : "none"}
                            className="hm-lab-bg"
                            style={{
                                background: m
                                    ? `radial-gradient(120% 90% at 50% 100%, ${m.tint}, #FFFFFF00 70%), radial-gradient(80% 60% at 85% 0%, ${m.glow}33, #FFFFFF00 70%), linear-gradient(180deg, #FFFFFF, ${m.tint})`
                                    : "radial-gradient(120% 90% at 50% 110%, #F3E9FF, #FFFFFF00 70%), radial-gradient(70% 60% at 0% 0%, #FFE6D9, #FFFFFF00 70%), #FFFFFF",
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.9 }}
                            aria-hidden
                        />
                    </AnimatePresence>
                    {f && phase !== "pick" && phase !== "care" && (
                        <LabWeather key={f.id} f={f} level={weather} settled={!!result} />
                    )}

                    <>
                        {phase === "pick" || !f || !m ? (
                            <motion.div
                                key="pick"
                                className="hm-pick"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div className="hm-pick-mallows" aria-hidden>
                                    {FEELINGS.map((x) => x.mallow).map((id) => (
                                        <StillMallow key={id} id={id} />
                                    ))}
                                </div>
                                <p className="hm-pick-q" id="hm-pick-label">
                                    {senseNote === "correct"
                                        ? "Thanks for putting me right. Which is closer?"
                                        : senseNote === "unsure"
                                        ? "I couldn't quite tell from that, and that's okay. Which is closest?"
                                        : "Right now, I'm feeling…"}
                                </p>
                                <div className="hm-chips" role="group" aria-labelledby="hm-pick-label">
                                    {FEELINGS.map((x) => (
                                        <button key={x.id} type="button" className="hm-chip" onClick={() => choose(x.id)}>
                                            <span className="hm-chip-dot" style={{ background: x.dot }} aria-hidden />
                                            {x.label}
                                        </button>
                                    ))}
                                </div>
                                {!senseNote && (
                                    <form
                                        className="hm-sense"
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            share()
                                        }}
                                    >
                                        <label className="hm-sense-label" htmlFor="hm-sense-input">
                                            or say it in your own words
                                        </label>
                                        <div className="hm-sense-row">
                                            <input
                                                id="hm-sense-input"
                                                value={said}
                                                maxLength={160}
                                                onChange={(e) => setSaid(e.target.value)}
                                                placeholder="e.g. work has been a lot today"
                                                autoComplete="off"
                                                enterKeyHint="send"
                                            />
                                            <button type="submit" className="hm-btn hm-btn-ink hm-btn-xs" disabled={!said.trim()}>
                                                Share
                                            </button>
                                        </div>
                                        <p className="hm-sense-note">
                                            <strong>FeelSense preview.</strong> Simple word matching that runs on this page: it isn't AI, it can't read
                                            minds, nothing you type is sent anywhere, and it always checks with you.
                                        </p>
                                    </form>
                                )}
                                {senseNote && (
                                    <button type="button" className="hm-textbtn hm-pick-reset" onClick={reset}>
                                        Start again
                                    </button>
                                )}
                            </motion.div>
                        ) : phase === "care" ? (
                            <motion.div
                                key="care"
                                className="hm-care-view"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                role="alert"
                            >
                                <div className="hm-care-mallow" aria-hidden>
                                    <StillMallow id="noomi" />
                                </div>
                                <h3 className="hm-done-title">That sounds really heavy.</h3>
                                <p className="hm-done-sub">
                                    You deserve support from a real person right now, not a Mallow. If you might act on these thoughts, or you're in
                                    danger, please call your local emergency number now.
                                </p>
                                <div className="hm-ctl-row">
                                    <a className="hm-btn hm-btn-primary hm-btn-lg" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                                        Find free, confidential support
                                    </a>
                                    <button type="button" className="hm-btn hm-btn-ghost hm-btn-lg" onClick={reset}>
                                        Back to the Mallows
                                    </button>
                                </div>
                                <p className="hm-sense-note">findahelpline.com lists free helplines in your country, by phone, text or chat.</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={`play-${f.id}`}
                                className="hm-play"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div className="hm-play-bar">
                                    <button type="button" className="hm-textbtn" onClick={reset}>
                                        <Arrow dir="left" />
                                        <span className="hm-long">Different feeling</span>
                                        <span className="hm-short">Back</span>
                                    </button>
                                    <div className="hm-dots" role="img" aria-label={`${breaths} of 3 breaths`}>
                                        {[0, 1, 2].map((i) => (
                                            <span
                                                key={i}
                                                className={i < breaths ? "is-on" : ""}
                                                style={i < breaths ? { background: m.deep } : undefined}
                                            />
                                        ))}
                                    </div>
                                    {(phase === "ready" || phase === "inhale" || phase === "exhale") && (
                                        <button type="button" className="hm-textbtn" aria-pressed={auto} onClick={() => setAuto((a) => !a)}>
                                            {auto ? "I'll do it" : "Do it for me"}
                                        </button>
                                    )}
                                    {!(phase === "ready" || phase === "inhale" || phase === "exhale") && (
                                        <span className="hm-play-bar-pad" />
                                    )}
                                </div>

                                <div className="hm-play-stage">
                                    <div
                                        className={`hm-play-cloud${result === "drift" && (phase === "reflect" || phase === "done") ? " is-gone" : ""}`}
                                    >
                                        <ThoughtCloud
                                            f={f}
                                            label={label}
                                            breaths={breaths}
                                            result={result}
                                            draggable={phase === "choice"}
                                            onFlick={() => decide("drift")}
                                        />
                                        {phase === "ready" && breaths === 0 && !auto && (
                                            <div className="hm-name">
                                                {editing ? (
                                                    <form
                                                        className="hm-name-form"
                                                        onSubmit={(e) => {
                                                            e.preventDefault()
                                                            saveName()
                                                        }}
                                                    >
                                                        <label className="hm-vh" htmlFor="hm-name-input">
                                                            Name what's on your mind (optional; it stays on this page)
                                                        </label>
                                                        <input
                                                            id="hm-name-input"
                                                            autoFocus
                                                            maxLength={32}
                                                            value={draft}
                                                            placeholder="e.g. the inbox"
                                                            onChange={(e) => setDraft(e.target.value)}
                                                            autoComplete="off"
                                                        />
                                                        <button type="submit" className="hm-btn hm-btn-ink hm-btn-xs">
                                                            Done
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="hm-textbtn hm-name-btn"
                                                        onClick={() => {
                                                            setDraft(name)
                                                            setEditing(true)
                                                        }}
                                                    >
                                                        <svg className="hm-ico" viewBox="0 0 20 20" aria-hidden>
                                                            <path
                                                                d="M4 16l1-4 8-8 3 3-8 8-4 1zM11.5 5.5l3 3"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="1.7"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                        {name ? "Change the words" : "Put it in your own words (optional)"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="hm-play-mallow">
                                        <div className="hm-breath-ring" aria-hidden>
                                            <motion.div
                                                className="hm-breath-disc"
                                                style={{
                                                    scale: discScale,
                                                    background: `radial-gradient(closest-side, ${m.glow}88, ${m.glow}00)`,
                                                }}
                                            />
                                            <svg viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="46" className="hm-ring-track" />
                                                <motion.circle
                                                    cx="50"
                                                    cy="50"
                                                    r="46"
                                                    className="hm-ring-fill"
                                                    style={{ pathLength: ring, stroke: m.deep }}
                                                />
                                            </svg>
                                        </div>
                                        <motion.div className="hm-mood" animate={mood.animate} transition={mood.transition}>
                                            <button
                                                type="button"
                                                className="hm-squish hm-squish-lab"
                                                aria-label={`${holdLabel}. Press and hold while you breathe in, let go to breathe out.`}
                                                {...press}
                                            >
                                                <MallowFigure id={m.id} rig={rig} />
                                            </button>
                                        </motion.div>
                                    </div>

                                    <div className="hm-say" aria-live="polite">
                                        <AnimatePresence mode="wait">
                                            {line && (
                                                <motion.p
                                                    key={line}
                                                    className="hm-say-bubble"
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -6 }}
                                                    transition={{ duration: 0.35 }}
                                                >
                                                    <span className="hm-say-who" style={{ color: m.deep }}>
                                                        {m.name}
                                                    </span>
                                                    {line}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="hm-play-controls">
                                    <AnimatePresence mode="wait" initial={false}>
                                        {phase === "sense" && (
                                            <motion.div key="sense" className="hm-ctl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                                <p className="hm-instr">Did FeelSense get that right?</p>
                                                <div className="hm-ctl-row">
                                                    <button type="button" className="hm-btn hm-btn-primary" onClick={() => confirm(true)}>
                                                        Yes, that's it
                                                    </button>
                                                    <button type="button" className="hm-btn hm-btn-ghost" onClick={() => confirm(false)}>
                                                        Not quite
                                                    </button>
                                                </div>
                                                <p className="hm-ctl-note">
                                                    {concern ? (
                                                        <>
                                                            That sounds hard. If it's more than a Mallow can help with, talking to someone you trust, or a free helpline at{" "}
                                                            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                                                                findahelpline.com
                                                            </a>
                                                            , can really help.
                                                        </>
                                                    ) : (
                                                        "Just a guess from your words. You're the expert on you."
                                                    )}
                                                </p>
                                            </motion.div>
                                        )}
                                        {(phase === "ready" || phase === "inhale" || phase === "exhale") && (
                                            <motion.div
                                                key="breathe"
                                                className="hm-ctl"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <p className="hm-instr" aria-live="polite">
                                                    {instr}
                                                </p>
                                                <button
                                                    type="button"
                                                    className={`hm-hold${phase === "inhale" ? " is-holding" : ""}`}
                                                    disabled={phase === "exhale"}
                                                    {...press}
                                                >
                                                    <span className="hm-hold-ring" aria-hidden />
                                                    {holdLabel}
                                                </button>
                                                <p className="hm-ctl-note">
                                                    {tooShort
                                                        ? "A little longer, like a slow breath in."
                                                        : "Works with touch, mouse or the space bar."}
                                                </p>
                                            </motion.div>
                                        )}
                                        {phase === "choice" && (
                                            <motion.div
                                                key="choice"
                                                className="hm-ctl"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <p className="hm-instr">{f.choice}</p>
                                                <div className="hm-ctl-row">
                                                    <button type="button" className="hm-btn hm-btn-primary" onClick={() => decide("drift")}>
                                                        {f.driftLabel}
                                                    </button>
                                                    <button type="button" className="hm-btn hm-btn-ghost" onClick={() => decide("keep")}>
                                                        {f.keepLabel}
                                                    </button>
                                                </div>
                                                <p className="hm-ctl-note">Or flick the cloud upwards.</p>
                                            </motion.div>
                                        )}
                                        {phase === "leaving" && <motion.div key="leaving" className="hm-ctl hm-ctl-empty" />}
                                        {phase === "reflect" && (
                                            <motion.div
                                                key="reflect"
                                                className="hm-ctl"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <p className="hm-instr" id="hm-reflect-q">
                                                    How does it feel now?
                                                </p>
                                                <div className="hm-ctl-row" role="group" aria-labelledby="hm-reflect-q">
                                                    {REFLECT.map((r) => (
                                                        <button key={r.id} type="button" className="hm-chip" onClick={() => reflect(r.id)}>
                                                            {f.positive ? r.good : r.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button type="button" className="hm-textbtn hm-ctl-skip" onClick={() => reflect(null)}>
                                                    Skip
                                                </button>
                                            </motion.div>
                                        )}
                                        {phase === "done" && (
                                            <motion.div
                                                key="done"
                                                className="hm-ctl hm-done"
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.25, duration: 0.6 }}
                                            >
                                                {reflection === "lot" && !f.positive && (
                                                    <p className="hm-care">
                                                        If it ever feels like too much, please talk to someone you trust, or find free,
                                                        confidential support at{" "}
                                                        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                                                            findahelpline.com
                                                        </a>
                                                        .
                                                    </p>
                                                )}
                                                <h3 className="hm-done-title">
                                                    That was just a little moment.
                                                    <br />
                                                    There's more waiting inside.
                                                </h3>
                                                <p className="hm-done-sub">
                                                    Whole worlds of rituals like this one, for every kind of feeling, with all seven
                                                    Mallows.
                                                </p>
                                                <div className="hm-ctl-row">
                                                    <button
                                                        type="button"
                                                        className="hm-btn hm-btn-primary hm-btn-lg"
                                                        onClick={() => openAuth("signup", { feeling: f.id, mallow: m.id, from: "moment" })}
                                                    >
                                                        {accountCta}
                                                        <Arrow />
                                                    </button>
                                                    <button type="button" className="hm-btn hm-btn-ghost hm-btn-lg" onClick={reset}>
                                                        Try another feeling
                                                    </button>
                                                </div>
                                                <button type="button" className="hm-textbtn hm-share-btn" onClick={() => shareLink(m.id)}>
                                                    <ShareIcon />
                                                    Send a Mallow to a friend
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// C. Meet the Mallows
// ---------------------------------------------------------------------------
function Meet() {
    const { reduced, meetMallow, startWith, share } = useLanding()
    const rig = useRig(reduced)
    const { later } = useTimers()
    const [sel, setSel] = React.useState<MallowId>("noomi")
    const [li, setLi] = React.useState(0)
    const [special, setSpecial] = React.useState<string | null>(null)
    const sectionRef = React.useRef<HTMLElement>(null)
    const lastTouch = React.useRef(0)
    const tickled = useTickle()
    const m = MALLOWS[sel]
    const i = ORDER.indexOf(sel)
    useIdleQuirk(rig, m, sectionRef, lastTouch)

    const pick = (id: MallowId) => {
        if (id === sel) return
        setSel(id)
        setLi(0)
        setSpecial(null)
        rig.squish.set(0)
        lastTouch.current = performance.now()
        later(() => rig.signature(MALLOWS[id], 0.7), 320)
        meetMallow(id)
    }
    const step = (d: number) => pick(ORDER[(i + d + ORDER.length) % ORDER.length])

    const press = usePress({
        onDown: () => {
            lastTouch.current = performance.now()
            rig.press(1, 0.8)
        },
        onUp: (held, cancelled) => {
            rig.release()
            lastTouch.current = performance.now()
            if (cancelled) return
            rig.signature(m)
            vibrate(12)
            meetMallow(sel)
            if (held > 2600) setSpecial(LONG_SQUEEZE)
            else if (tickled()) {
                rig.emit("heart", 5, m.colors)
                setSpecial(m.tickle)
            } else {
                setSpecial(null)
                setLi((n) => n + 1)
            }
        },
    })

    return (
        <section className="hm-section hm-meet" id="mallows" aria-labelledby="hm-meet-title" ref={sectionRef}>
            <div className="hm-wrap">
                <Reveal className="hm-head hm-head-center">
                    <p className="hm-eyebrow">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        Seven Mallows
                    </p>
                    <h2 className="hm-h2" id="hm-meet-title">
                        Meet the Mallows. <em>Find your kind of magic.</em>
                    </h2>
                    <p className="hm-sub">
                        Seven personalities. A whole universe of feelings. Somewhere in here, there's a Mallow for your moment.
                    </p>
                </Reveal>

                <div className="hm-meet-grid">
                    <motion.div
                        className="hm-meet-stage"
                        animate={{ backgroundColor: m.tint }}
                        transition={{ duration: 0.8 }}
                        drag={reduced ? false : "x"}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.18}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -70) step(1)
                            else if (info.offset.x > 70) step(-1)
                        }}
                    >
                        <div
                            className="hm-meet-glow"
                            style={{ background: `radial-gradient(closest-side, ${m.glow}66, transparent)` }}
                            aria-hidden
                        />
                        <span className="hm-meet-ghost hm-display" aria-hidden style={{ color: m.deep }}>
                            {m.name}
                        </span>
                        <motion.div
                            key={sel}
                            className="hm-meet-fig"
                            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -60, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={reduced ? { duration: 0.3 } : { type: "spring", stiffness: 210, damping: 16 }}
                        >
                            <button type="button" className="hm-squish" aria-label={`Squeeze ${m.name}`} {...press}>
                                <MallowFigure id={sel} rig={rig} />
                            </button>
                        </motion.div>
                        <div className="hm-meet-say" aria-live="polite">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.p
                                    key={`${sel}-${li}-${special || ""}`}
                                    className="hm-caption"
                                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.35, delay: li === 0 ? 0.35 : 0, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <span className="hm-caption-who" style={{ color: m.deep }}>
                                        {m.name}
                                    </span>
                                    {special || (li === 0 ? m.hello : m.lines[(li - 1) % m.lines.length])}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                        {[-1, 1].map((d) => {
                            const nid = ORDER[(i + d + ORDER.length) % ORDER.length]
                            return (
                                <button
                                    key={`${d}-${nid}`}
                                    type="button"
                                    className={`hm-peek ${d < 0 ? "hm-peek-l" : "hm-peek-r"}`}
                                    onClick={() => step(d)}
                                    aria-label={`Say hello to ${MALLOWS[nid].name}`}
                                    tabIndex={-1}
                                >
                                    <StillMallow id={nid} />
                                </button>
                            )
                        })}
                        <button type="button" className="hm-round hm-round-l" onClick={() => step(-1)} aria-label="Previous Mallow">
                            <Arrow dir="left" />
                        </button>
                        <button type="button" className="hm-round hm-round-r" onClick={() => step(1)} aria-label="Next Mallow">
                            <Arrow />
                        </button>
                        <p className="hm-meet-tip">Squeeze me · swipe to meet the others</p>
                    </motion.div>

                    <div className="hm-tray" role="group" aria-label="Choose a Mallow">
                        {ORDER.map((id) => (
                            <button
                                key={id}
                                type="button"
                                className={`hm-tray-btn${id === sel ? " is-on" : ""}`}
                                aria-pressed={id === sel}
                                onClick={() => pick(id)}
                                style={id === sel ? vars({ "--ring": MALLOWS[id].body }) : undefined}
                            >
                                <span className="hm-tray-img">
                                    <StillMallow id={id} float={false} />
                                </span>
                                <span className="hm-tray-name">{MALLOWS[id].name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="hm-meet-info" aria-live="polite">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={sel}
                                className="hm-meet-card"
                                style={vars({ "--mc": m.tint, "--mg": m.glow, "--md": m.deep })}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <p className="hm-meet-title" style={{ color: m.deep }}>
                                    {m.title}
                                </p>
                                <h3 className="hm-meet-name">{m.name}</h3>
                                <p className="hm-meet-purpose">{m.purpose}</p>
                                <p className="hm-meet-bio">{m.bio}</p>
                                <dl className="hm-meet-facts">
                                    <div>
                                        <dt>Here for</dt>
                                        <dd>
                                            <ul className="hm-tags">
                                                {m.goodFor.map((g) => (
                                                    <li key={g} style={{ background: m.tint, color: m.deep }}>
                                                        {g}
                                                    </li>
                                                ))}
                                            </ul>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>How {m.name} responds</dt>
                                        <dd>{m.responds}</dd>
                                    </div>
                                    <div>
                                        <dt>Inside hushmallow</dt>
                                        <dd>
                                            <strong>{m.ritual.name}</strong>, in {m.world}. {m.ritual.what}
                                        </dd>
                                    </div>
                                </dl>
                                <div className="hm-meet-cta">
                                    <button type="button" className="hm-btn hm-btn-primary" onClick={() => startWith(m.feeling)}>
                                        Try a moment with {m.name}
                                        <Arrow />
                                    </button>
                                    <button type="button" className="hm-textbtn hm-share-btn" onClick={() => share(m.id)}>
                                        <ShareIcon />
                                        Share {m.name}
                                    </button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// D. Being a person is a lot
// ---------------------------------------------------------------------------
function NoisyHead() {
    const { reduced } = useLanding()
    const rig = useRig(reduced)
    const [popped, setPopped] = React.useState<Set<number>>(new Set())
    const n = popped.size
    const all = n === THOUGHTS.length
    const pop = (i: number) => {
        if (popped.has(i)) return
        const s = new Set(popped)
        s.add(i)
        setPopped(s)
        vibrate(8)
        rig.press(0.6, 0.08)
        window.setTimeout(() => rig.release(), 90)
        if (s.size % 3 === 0 || s.size === THOUGHTS.length) rig.signature(MALLOWS.zuzu, 0.6)
    }
    const status = all
        ? "Ahh. Breathing room."
        : n === 0
          ? "Go on, pop a few. They're only thoughts."
          : n === 1
            ? "One popped. Roomier already."
            : `${n} popped. Look at all that space.`
    return (
        <section className="hm-section hm-human" id="feelings" aria-labelledby="hm-human-title">
            <div className="hm-wrap hm-human-grid">
                <Reveal className="hm-human-copy">
                    <p className="hm-eyebrow">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        Room for every feeling
                    </p>
                    <h2 className="hm-h2" id="hm-human-title">
                        Your feelings <em>have company.</em>
                    </h2>
                    <p className="hm-body">
                        Some days it's one big feeling. Most days it's forty small ones in a trench coat. None of them mean you're doing it
                        wrong. They mean you're human.
                    </p>
                    <p className="hm-body">
                        Whatever's in there, there's a Mallow with room for it: to squeeze, to tell, to explore with, at your own pace.
                    </p>
                </Reveal>
                <div className="hm-thoughts-wrap">
                    <div className="hm-thoughts" role="group" aria-label="Pop the thoughts">
                        {THOUGHTS.map((t, i) => {
                            const gone = popped.has(i)
                            return (
                                <motion.button
                                    key={t}
                                    type="button"
                                    className="hm-thought"
                                    disabled={gone}
                                    aria-label={gone ? `${t} (popped)` : `Pop “${t}”`}
                                    onClick={() => pop(i)}
                                    animate={gone ? { scale: reduced ? 1 : [1, 1.18, 0], opacity: [1, 1, 0] } : { scale: 1, opacity: 1 }}
                                    transition={{ duration: gone ? 0.42 : 0.5, ease: "easeOut" }}
                                    whileHover={reduced || gone ? undefined : { scale: 1.05 }}
                                    whileTap={reduced || gone ? undefined : { scale: 0.92 }}
                                >
                                    <span
                                        className="hm-thought-tilt"
                                        style={vars({ "--rot": `${((i * 47) % 9) - 4}deg`, "--dy": `${((i * 31) % 14) - 7}px` })}
                                    >
                                        <span
                                            className={reduced ? "hm-thought-pill" : "hm-thought-pill hm-float-sm"}
                                            style={{ animationDelay: `${-i * 0.6}s` }}
                                        >
                                            {t}
                                        </span>
                                    </span>
                                </motion.button>
                            )
                        })}
                    </div>

                    <div className="hm-thoughts-foot">
                        <div className="hm-thoughts-zuzu" aria-hidden>
                            <MallowFigure id="zuzu" rig={rig} alt="" shadow={false} />
                        </div>
                        <p className="hm-thoughts-status" aria-live="polite">
                            {status}
                        </p>
                        {all && (
                            <button type="button" className="hm-textbtn" onClick={() => setPopped(new Set())}>
                                Bring them back
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// E. What you can do inside
// ---------------------------------------------------------------------------
type StationKind = "pause" | "express" | "release" | "reframe" | "reflect"
const STATIONS: { kind: StationKind; verb: string; mallow: MallowId; title: string; body: string }[] = [
    {
        kind: "pause",
        verb: "Pause",
        mallow: "noomi",
        title: "Press the soft button on your day.",
        body: "Breathe along with a Mallow and let your shoulders come down from around your ears. Even a minute counts.",
    },
    {
        kind: "express",
        verb: "Express",
        mallow: "pipzi",
        title: "Say it messy.",
        body: "Type it, tap it, scribble it, squish it. No grammar, no audience, no judgement. Just out.",
    },
    {
        kind: "release",
        verb: "Release",
        mallow: "glitzi",
        title: "Let some of it go.",
        body: "Scribble out the static, flick away what isn't yours, and watch a heavy thought float off.",
    },
    {
        kind: "reframe",
        verb: "Reframe",
        mallow: "zuzu",
        title: "Try another angle.",
        body: "Same moment, new camera. Untangle what actually happened from the extra story your brain helpfully added.",
    },
    {
        kind: "reflect",
        verb: "Reflect",
        mallow: "loomi",
        title: "Notice what changed.",
        body: "Check in, keep what helped, and slowly build your own collection of things that work for you.",
    },
]

const TYPED = ["ugh. mondays.", "i'm SO tired", "honestly? fine. ish.", "that meeting!!!"]

function Vignette({ kind, color, active }: { kind: StationKind; color: string; active: boolean }) {
    const { reduced } = useLanding()
    const [k, setK] = React.useState(0)
    const [chars, setChars] = React.useState(0)
    React.useEffect(() => {
        if (!active || reduced) return
        if (kind === "reframe") {
            const t = window.setInterval(() => setK((x) => x + 1), 2800)
            return () => window.clearInterval(t)
        }
        if (kind === "express") {
            let c = 0
            let word = 0
            const t = window.setInterval(() => {
                const w = TYPED[word % TYPED.length]
                c++
                if (c > w.length + 14) {
                    c = 0
                    word++
                    setK(word)
                }
                setChars(Math.min(c, w.length))
            }, 85)
            return () => window.clearInterval(t)
        }
    }, [active, kind, reduced])
    if (kind === "pause")
        return (
            <div className="hm-vig hm-vig-pause" aria-hidden>
                {[0, 1, 2].map((i) => (
                    <span key={i} style={{ borderColor: color, animationDelay: `${i * 1.4}s` }} />
                ))}
                <em>in… and out…</em>
            </div>
        )
    if (kind === "express") {
        const w = TYPED[k % TYPED.length]
        return (
            <div className="hm-vig hm-vig-express" aria-hidden>
                <span className="hm-vig-type">
                    {reduced ? w : w.slice(0, chars)}
                    <i style={{ background: color }} />
                </span>
            </div>
        )
    }
    if (kind === "release")
        return (
            <div className="hm-vig hm-vig-release" aria-hidden>
                <span>that comment</span>
                <span>not my problem</span>
            </div>
        )
    if (kind === "reframe") {
        const a = k % 2 === 0
        return (
            <div className="hm-vig hm-vig-reframe" aria-hidden>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={a ? "a" : "b"}
                        className={a ? "is-old" : "is-new"}
                        initial={reduced ? { opacity: 0 } : { opacity: 0, rotateX: -80 }}
                        animate={{ opacity: 1, rotateX: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, rotateX: 80 }}
                        transition={{ duration: 0.45 }}
                    >
                        {a ? "I'm terrible at this." : "I'm still learning this."}
                    </motion.span>
                </AnimatePresence>
            </div>
        )
    }
    return (
        <div className="hm-vig hm-vig-reflect" aria-hidden>
            <svg viewBox="0 0 200 110">
                <path
                    d="M20 80 L62 40 L104 66 L146 24 L182 54"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="4 5"
                    opacity=".55"
                />
                {[
                    [20, 80],
                    [62, 40],
                    [104, 66],
                    [146, 24],
                    [182, 54],
                ].map(([x, y], i) => (
                    <g key={i} className="hm-star" style={{ animationDelay: `${i * 0.5}s` }}>
                        <path
                            transform={`translate(${x - 9} ${y - 9}) scale(.75)`}
                            fill={color}
                            d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z"
                        />
                    </g>
                ))}
            </svg>
        </div>
    )
}

function Station({ s, index }: { s: (typeof STATIONS)[number]; index: number }) {
    const { reduced } = useLanding()
    const rig = useRig(reduced)
    const ref = React.useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { margin: "-25% 0px -25% 0px" })
    const greeted = React.useRef(false)
    const m = MALLOWS[s.mallow]
    React.useEffect(() => {
        if (inView && !greeted.current) {
            greeted.current = true
            rig.signature(m, 0.6)
        }
    }, [inView])
    const press = usePress({
        onDown: () => rig.press(1, 0.6),
        onUp: (_h, c) => {
            rig.release()
            if (!c) rig.signature(m, 0.8)
        },
    })
    return (
        <div ref={ref} className={`hm-station${index % 2 ? " is-flip" : ""}`}>
            <div className="hm-station-node">
                <button type="button" className="hm-squish" aria-label={`Squeeze ${m.name}`} {...press}>
                    <MallowFigure id={s.mallow} rig={rig} alt="" shadow={false} />
                </button>
            </div>
            <Reveal className="hm-station-copy">
                <p className="hm-station-verb" style={{ color: m.deep }}>
                    {s.verb}
                </p>
                <h3 className="hm-h3">{s.title}</h3>
                <p className="hm-body">{s.body}</p>
            </Reveal>
            <Reveal className="hm-station-vis" delay={0.1}>
                <div className="hm-vig-frame" style={{ background: m.tint }}>
                    <Vignette kind={s.kind} color={m.deep} active={inView} />
                </div>
            </Reveal>
        </div>
    )
}

function Discover() {
    const ref = React.useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] })
    const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
    return (
        <section className="hm-section hm-how" id="how" aria-labelledby="hm-how-title">
            <div className="hm-wrap">
                <Reveal className="hm-head hm-head-center">
                    <p className="hm-eyebrow">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        Inside hushmallow
                    </p>
                    <h2 className="hm-h2" id="hm-how-title">
                        More than a moment.
                    </h2>
                    <p className="hm-sub">
                        Every Mallow has a whole world of small, touchable moments inside. Five simple things they help you do, whenever you
                        need them.
                    </p>
                </Reveal>
                <div className="hm-path" ref={ref}>
                    <div className="hm-spine" aria-hidden>
                        <motion.span style={{ scaleY: fill }} />
                    </div>
                    {STATIONS.map((s, i) => (
                        <Station key={s.kind} s={s} index={i} />
                    ))}
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// F. Accounts — the sign-up panel (used inline and in the sheet)
// ---------------------------------------------------------------------------
type AuthConfig = Pick<
    Props,
    | "signUpUrl"
    | "loginUrl"
    | "googleUrl"
    | "appleUrl"
    | "emailUrl"
    | "showGoogle"
    | "showApple"
    | "showEmail"
    | "termsUrl"
    | "privacyUrl"
    | "membershipNote"
    | "onSignUpClick"
    | "onLoginClick"
>

function authUrl(cfg: AuthConfig, method: AuthMethod, mode: AuthMode, c: SignupContext): string | null {
    const direct = method === "google" ? cfg.googleUrl : method === "apple" ? cfg.appleUrl : cfg.emailUrl
    const shared = {
        source: "landing",
        feeling: c.feeling,
        mallow: c.mallow,
    }
    if (direct && direct.trim()) return withParams(direct, { ...shared, mode })
    const base = mode === "login" ? cfg.loginUrl || cfg.signUpUrl : cfg.signUpUrl
    return withParams(base, { ...shared, method, mode })
}

function AuthPanel({
    cfg,
    mode,
    context,
    mascot,
    titleId,
    onSwitchMode,
}: {
    cfg: AuthConfig
    mode: AuthMode
    context: SignupContext
    mascot: string
    titleId: string
    onSwitchMode: (m: AuthMode) => void
}) {
    const { canvas } = useLanding()
    const [status, setStatus] = React.useState<string | null>(null)
    const [busy, setBusy] = React.useState<AuthMethod | null>(null)
    const mallow = context.mallow ? MALLOWS[context.mallow] : null
    const target = renderTarget()

    React.useEffect(() => setStatus(null), [mode])

    const go = (method: AuthMethod) => {
        const url = authUrl(cfg, method, mode, context)
        ;(mode === "login" ? cfg.onLoginClick : cfg.onSignUpClick)?.()
        if (!url) {
            const setup = target !== "live"
            setStatus(
                setup
                    ? "Setup needed: add your Sign-up URL (or the Google / Apple / Email URLs) in this component's properties, then publish."
                    : "Accounts are opening very soon. Thanks for your patience, and come back to squeeze a Mallow any time."
            )
            if (typeof console !== "undefined")
                console.warn(`[hushmallow] No ${mode} URL set for "${method}". Fill in Sign-up URL in the HushmallowLanding properties.`)
            return
        }
        if (canvas) return
        setBusy(method)
        window.location.assign(url)
        // if navigation is blocked (popup rules, offline), give the button back
        window.setTimeout(() => setBusy(null), 4000)
    }

    const isLogin = mode === "login"
    const title = isLogin ? "Welcome back." : "Make yourself at home."
    const sub = isLogin
        ? "Log in to pick up where you left off. Your Mallows missed you (they'd never admit it)."
        : mallow
          ? `Create your hushmallow account and ${mallow.name} will be waiting for you inside, along with the rest of the squad.`
          : "Create your hushmallow account to explore every Mallow world, keep the moments that help, and pick up right where you left off."
    const verb = isLogin ? "Log in" : "Continue"
    const legal = cfg.termsUrl || cfg.privacyUrl

    return (
        <div className="hm-auth">
            <div className="hm-auth-mascot" aria-hidden>
                <img src={mascot} alt="" width={420} height={387} draggable={false} />
            </div>
            <h3 className="hm-auth-title" id={titleId}>
                {title}
            </h3>
            <p className="hm-auth-sub">{sub}</p>
            <div className="hm-auth-btns">
                {cfg.showGoogle && (
                    <button type="button" className="hm-auth-btn" onClick={() => go("google")} disabled={!!busy}>
                        <svg viewBox="0 0 24 24" aria-hidden>
                            <path
                                fill="#4285F4"
                                d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 4.9L5.7 14z"
                            />
                            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z" />
                        </svg>
                        {busy === "google" ? "Opening Google…" : `${verb} with Google`}
                    </button>
                )}
                {cfg.showApple && (
                    <button type="button" className="hm-auth-btn hm-auth-apple" onClick={() => go("apple")} disabled={!!busy}>
                        <svg viewBox="0 0 24 24" aria-hidden>
                            <path
                                fill="currentColor"
                                d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6s1.8-.8 3.4-.8 2 .8 3.4.8 2.3-1.3 3.1-2.5c1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5.1c.7-.9 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"
                            />
                        </svg>
                        {busy === "apple" ? "Opening Apple…" : `${verb} with Apple`}
                    </button>
                )}
                {cfg.showEmail && (
                    <button type="button" className="hm-auth-btn hm-auth-email" onClick={() => go("email")} disabled={!!busy}>
                        <svg viewBox="0 0 24 24" aria-hidden>
                            <path
                                d="M3.5 6.5h17v11h-17zM4 7l8 6 8-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                            />
                        </svg>
                        {busy === "email" ? "One moment…" : `${verb} with email`}
                    </button>
                )}
            </div>
            <div className="hm-auth-status" role="status" aria-live="polite">
                {status && <p className={target === "live" ? "hm-auth-msg" : "hm-auth-msg is-setup"}>{status}</p>}
            </div>
            <p className="hm-auth-switch">
                {isLogin ? "New here? " : "Already have an account? "}
                <button type="button" className="hm-textbtn hm-textbtn-inline" onClick={() => onSwitchMode(isLogin ? "signup" : "login")}>
                    {isLogin ? "Create an account" : "Log in"}
                </button>
            </p>
            {!isLogin && cfg.membershipNote && <p className="hm-auth-note">{cfg.membershipNote}</p>}
            {legal && (
                <p className="hm-auth-legal">
                    By continuing you agree to our{" "}
                    {cfg.termsUrl ? (
                        <a href={cfg.termsUrl} target="_blank" rel="noopener noreferrer">
                            Terms
                        </a>
                    ) : (
                        "Terms"
                    )}{" "}
                    and{" "}
                    {cfg.privacyUrl ? (
                        <a href={cfg.privacyUrl} target="_blank" rel="noopener noreferrer">
                            Privacy Policy
                        </a>
                    ) : (
                        "Privacy Policy"
                    )}
                    .
                </p>
            )}
        </div>
    )
}

function AuthSheet({
    open,
    mode,
    context,
    cfg,
    mascot,
    onClose,
    onSwitchMode,
}: {
    open: boolean
    mode: AuthMode
    context: SignupContext
    cfg: AuthConfig
    mascot: string
    onClose: () => void
    onSwitchMode: (m: AuthMode) => void
}) {
    const { reduced } = useLanding()
    const box = React.useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])

    React.useEffect(() => {
        if (!open) return
        const prev = document.activeElement as HTMLElement | null
        const html = document.documentElement
        const overflow = html.style.overflow
        html.style.overflow = "hidden"
        const t = window.setTimeout(() => box.current?.querySelector<HTMLElement>(".hm-auth-btn, button")?.focus(), 60)
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
            if (e.key === "Tab" && box.current) {
                const f = Array.from(box.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input")).filter(
                    (x) => x.offsetParent !== null
                )
                if (!f.length) return
                const first = f[0]
                const last = f[f.length - 1]
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }
        document.addEventListener("keydown", onKey)
        return () => {
            window.clearTimeout(t)
            document.removeEventListener("keydown", onKey)
            html.style.overflow = overflow
            prev?.focus?.()
        }
    }, [open])

    if (!mounted) return null
    return createPortal(
        <div className="hm-portal">
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="hm-sheet-wrap"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="hm-sheet-backdrop" onClick={onClose} aria-hidden />
                        <motion.div
                            ref={box}
                            className="hm-sheet"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="hm-sheet-title"
                            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
                            transition={reduced ? { duration: 0.2 } : { type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <button type="button" className="hm-sheet-close" onClick={onClose} aria-label="Close">
                                <svg viewBox="0 0 20 20" aria-hidden>
                                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                            </button>
                            <AuthPanel
                                cfg={cfg}
                                mode={mode}
                                context={context}
                                mascot={mascot}
                                titleId="hm-sheet-title"
                                onSwitchMode={onSwitchMode}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>,
        document.body
    )
}

const PERKS: { mallow: MallowId; title: string; body: string }[] = [
    { mallow: "boppo", title: "Your Mallows, remembered", body: "Pick up with the Mallows you click with, on any device." },
    { mallow: "zuzu", title: "Every experience, in one place", body: "Pause, express, release, reframe and reflect, whenever you need to." },
    { mallow: "loomi", title: "Personal, only if you want", body: "You choose what's remembered, like a favourite Mallow or a gentle check-in. Change your mind any time." },
    { mallow: "noomi", title: "No streaks, no guilt", body: "Come back when it helps. Skip a day, a week or a month. Nobody's keeping score." },
]

/** A real, working example of consent-first memory: this browser only, the Mallow's name only. */
function RememberSwitch() {
    const { rememberOn, setRemember, saved } = useLanding()
    return (
        <div className="hm-remember">
            <button type="button" role="switch" aria-checked={rememberOn} className="hm-switch" onClick={() => setRemember(!rememberOn)}>
                <span className="hm-switch-track" aria-hidden>
                    <span className="hm-switch-thumb" />
                </span>
                <span className="hm-remember-text">
                    <strong>Remember my Mallow on this browser</strong>
                    {rememberOn && saved
                        ? `${MALLOWS[saved].name} will say hello next time you visit. Switch off to forget.`
                        : "Off unless you switch it on. It saves only which Mallow you last spent time with, in this browser, and nothing else."}
                </span>
            </button>
        </div>
    )
}

function Join({ cfg, mascot, rememberOption }: { cfg: AuthConfig; mascot: string; rememberOption: boolean }) {
    const [mode, setMode] = React.useState<AuthMode>("signup")
    return (
        <section className="hm-section hm-join" id="join" aria-labelledby="hm-join-title">
            <div className="hm-orb hm-orb-d" aria-hidden />
            <div className="hm-wrap hm-join-grid">
                <Reveal className="hm-join-copy">
                    <p className="hm-eyebrow">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        Your own corner of hushmallow
                    </p>
                    <h2 className="hm-h2" id="hm-join-title">
                        Your space, <em>your pace.</em>
                    </h2>
                    <p className="hm-body">
                        An account turns a little moment into your own soft place. It's there when you want it, and quiet when you don't.
                    </p>
                    <ul className="hm-perks">
                        {PERKS.map((p) => (
                            <li key={p.title}>
                                <span className="hm-perk-img" aria-hidden>
                                    <StillMallow id={p.mallow} float={false} />
                                </span>
                                <span>
                                    <strong>{p.title}</strong>
                                    {p.body}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {rememberOption && <RememberSwitch />}
                </Reveal>
                <Reveal className="hm-join-card" delay={0.1}>
                    <AuthPanel
                        cfg={cfg}
                        mode={mode}
                        context={{ from: "join" }}
                        mascot={mascot}
                        titleId="hm-join-auth-title"
                        onSwitchMode={setMode}
                    />
                </Reveal>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// Three ways in: Touch, Unwind, Connect
// ---------------------------------------------------------------------------
const WAYS: { id: string; label: string; mallows: MallowId[]; title: string; body: string; link: string; soon?: boolean }[] = [
    {
        id: "try",
        label: "Feel it",
        mallows: ["loomi"],
        title: "Start with a feeling",
        body: "Pick one, or say it in your own words. Even \"I don't know\" is a perfectly good place to start.",
        link: "Start anywhere",
    },
    {
        id: "mallows",
        label: "Meet it",
        mallows: ["pipzi"],
        title: "Meet the Mallow for it",
        body: "Seven original characters, each with its own personality and its own way of being there for a feeling.",
        link: "Meet the Mallows",
    },
    {
        id: "how",
        label: "Move through it",
        mallows: ["glitzi", "boppo"],
        title: "Explore it, your way",
        body: "Squeeze, breathe, let it out, see it differently. Playful little rituals, and you're in charge of every step.",
        link: "See what's inside",
    },
]

function ThreeWays() {
    const { scrollTo } = useLanding()
    return (
        <section className="hm-section hm-ways" id="discover" aria-labelledby="hm-ways-title">
            <div className="hm-wrap">
                <Reveal className="hm-head hm-head-center">
                    <p className="hm-eyebrow">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        How hushmallow works
                    </p>
                    <h2 className="hm-h2" id="hm-ways-title">
                        Feel it. Meet it. <em>Move through it.</em>
                    </h2>
                    <p className="hm-sub">
                        An imaginative emotional experience, led by seven original characters. Everyone has feelings. Here, they get to play.
                    </p>
                </Reveal>
                <ol className="hm-ways-row">
                    {WAYS.map((w, i) => (
                        <li key={w.id} className="hm-way">
                            <Reveal delay={i * 0.08}>
                                <a
                                    className="hm-way-link"
                                    href={`#${w.id}`}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        scrollTo(w.id)
                                    }}
                                >
                                    <span className={`hm-way-art${w.mallows.length > 1 ? " is-pair" : ""}`} aria-hidden>
                                        {w.mallows.map((id) => (
                                            <StillMallow key={id} id={id} />
                                        ))}
                                    </span>
                                    <span className="hm-way-label">
                                        {w.label}
                                        {w.soon && <span className="hm-soon-tag">Coming soon</span>}
                                    </span>
                                    <span className="hm-way-title">{w.title}</span>
                                    <span className="hm-way-body">{w.body}</span>
                                    <span className="hm-way-more">
                                        {w.link}
                                        <Arrow dir="down" />
                                    </span>
                                </a>
                            </Reveal>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// Connect: Hushmates (coming soon). No chat, no matching, no member counts:
// a picture of the idea and, only if you provide one, a real updates link.
// ---------------------------------------------------------------------------
const MATES_POINTS = ["Text only", "By mutual invitation", "No public feeds", "No popularity contests"]

function Hushmates({ updatesUrl }: { updatesUrl: string }) {
    const { reduced } = useLanding()
    const left = useRig(reduced)
    const right = useRig(reduced)
    const [beat, setBeat] = React.useState(0) // a little glow travels along the line when you squeeze either Mallow
    const url = withParams(updatesUrl, { source: "landing-hushmates" })

    const squeezer = (rig: Rig, other: Rig, id: MallowId, toRight: boolean) =>
        usePress({
            onDown: () => rig.press(1, 0.6),
            onUp: (_h, cancelled) => {
                rig.release()
                if (cancelled) return
                rig.signature(MALLOWS[id], 0.6)
                setBeat((b) => (toRight ? Math.abs(b) + 1 : -(Math.abs(b) + 1)))
                window.setTimeout(() => other.pulseBlush(), reduced ? 0 : 900)
            },
        })
    const pressLeft = squeezer(left, right, "loomi", true)
    const pressRight = squeezer(right, left, "boppo", false)

    return (
        <section className="hm-section hm-mates" id="hushmates" aria-labelledby="hm-mates-title">
            <div className="hm-wrap hm-mates-grid">
                <Reveal className="hm-mates-copy">
                    <p className="hm-eyebrow">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        Connect
                        <span className="hm-soon-tag">Coming soon</span>
                    </p>
                    <h2 className="hm-h2" id="hm-mates-title">
                        Real people. <em>Softer connections.</em>
                    </h2>
                    <p className="hm-body">
                        Introducing Hushmates — a private way to connect with real people through thoughtful, text-only conversations. No public
                        feeds. No popularity contests. Just genuine human connection, by mutual choice.
                    </p>
                    <div className="hm-mates-card">
                        <p className="hm-mates-name">Hushmates</p>
                        <p className="hm-mates-line">Some conversations deserve a quieter place.</p>
                        <p className="hm-mates-desc">
                            A private space to connect with real people who choose to listen, share and understand. Text only, by mutual
                            invitation, with your identity kept out of public view.
                        </p>
                        <ul className="hm-mates-points">
                            {MATES_POINTS.map((t) => (
                                <li key={t}>{t}</li>
                            ))}
                        </ul>
                        {url ? (
                            <a className="hm-btn hm-btn-ghost" href={url} target="_blank" rel="noopener noreferrer">
                                Keep me updated
                                <Arrow />
                            </a>
                        ) : (
                            <p className="hm-mates-status">
                                <span className="hm-soon-dot" aria-hidden />
                                Coming soon. Hushmates is still being built, and isn't open yet.
                            </p>
                        )}
                    </div>
                </Reveal>

                <div className="hm-mates-scene" aria-hidden>
                    <div className="hm-mates-glow" />
                    <svg className="hm-mates-path" viewBox="0 0 400 160" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="hm-mates-grad" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0" stopColor="#7FD4FF" />
                                <stop offset="0.5" stopColor="#C9A8FF" />
                                <stop offset="1" stopColor="#FFB36B" />
                            </linearGradient>
                        </defs>
                        <path d="M20 120 C 120 20, 280 20, 380 120" fill="none" stroke="url(#hm-mates-grad)" strokeWidth="3" strokeLinecap="round" opacity=".55" />
                        <path
                            className={reduced ? "" : "hm-mates-flow"}
                            d="M20 120 C 120 20, 280 20, 380 120"
                            fill="none"
                            stroke="url(#hm-mates-grad)"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray="10 70"
                        />
                    </svg>
                    {beat !== 0 && !reduced && (
                        <motion.span
                            key={beat}
                            className="hm-mates-spark"
                            initial={{ left: beat > 0 ? "18%" : "82%", top: "62%", opacity: 0, scale: 0.6 }}
                            animate={{
                                left: beat > 0 ? ["18%", "50%", "82%"] : ["82%", "50%", "18%"],
                                top: ["62%", "18%", "62%"],
                                opacity: [0, 1, 0],
                                scale: [0.6, 1, 0.6],
                            }}
                            transition={{ duration: 1.1, ease: "easeInOut" }}
                        >
                            <Shape k="heart" />
                        </motion.span>
                    )}
                    <span className="hm-mates-bubble hm-mates-bubble-l">
                        <i />
                        <i />
                        <i />
                    </span>
                    <span className="hm-mates-bubble hm-mates-bubble-r">
                        <i />
                        <i />
                        <i />
                    </span>
                    <div className="hm-mates-m hm-mates-m-l">
                        <button type="button" className="hm-squish" tabIndex={-1} {...pressLeft}>
                            <MallowFigure id="loomi" rig={left} alt="" />
                        </button>
                    </div>
                    <div className="hm-mates-m hm-mates-m-r">
                        <button type="button" className="hm-squish" tabIndex={-1} {...pressRight}>
                            <MallowFigure id="boppo" rig={right} alt="" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// Moodspell: hushmallow's audiovisual experience. A real film plays here only
// when you set one (Moodspell video property). Until then this shows a clearly
// labelled live preview of the look, with no fake player controls.
// ---------------------------------------------------------------------------
const MOODSPELL_POINTS = ["Original Mallow animations", "Swirling, spatial sound", "Patterns that move with your mood", "Optional longer wind-downs"]
const VIDEO_URL = /^(https?:\/\/|\/|\.\/|assets\/|blob:)/i

function Moodspell({ video, poster, caption }: { video: string; poster: string; caption: string }) {
    const { reduced, canvas } = useLanding()
    const screenRef = React.useRef<HTMLDivElement>(null)
    const vRef = React.useRef<HTMLVideoElement>(null)
    const [inView, setInView] = React.useState(false)
    const [loaded, setLoaded] = React.useState(false) // set the video source only once it's near the screen
    const [paused, setPaused] = React.useState(reduced) // the visitor's choice; reduced motion starts paused
    const [muted, setMuted] = React.useState(true)
    const [failed, setFailed] = React.useState(false)
    const src = (video || "").trim()
    const hasVideo = !!src && VIDEO_URL.test(src) && !failed

    React.useEffect(() => setPaused(reduced), [reduced])
    React.useEffect(() => {
        const el = screenRef.current
        if (!el) return
        const io = new IntersectionObserver(
            ([e]) => {
                setInView(e.isIntersecting)
                if (e.isIntersecting) setLoaded(true)
            },
            { rootMargin: "200px 0px" }
        )
        io.observe(el)
        return () => io.disconnect()
    }, [])
    // play only while on screen and not paused by the visitor
    React.useEffect(() => {
        const v = vRef.current
        if (!v || !hasVideo || canvas) return
        v.muted = muted
        if (inView && !paused && loaded) {
            const p = v.play()
            if (p && typeof p.catch === "function") p.catch(() => setPaused(true)) // autoplay refused: wait for a tap
        } else v.pause()
    }, [inView, paused, loaded, hasVideo, muted, canvas])

    const toggleSound = () => {
        const v = vRef.current
        const next = !muted
        setMuted(next)
        if (v) {
            v.muted = next
            if (!next && paused) setPaused(false) // turning sound on is a clear "play this"
        }
    }

    return (
        <section className="hm-section hm-ms" id="moodspell" aria-labelledby="hm-ms-title">
            <div className="hm-ms-sky" aria-hidden />
            <div className="hm-wrap hm-ms-grid">
                <Reveal className="hm-ms-copy">
                    <p className="hm-eyebrow hm-eyebrow-light">
                        <span className="hm-eyebrow-dot" aria-hidden />
                        Moodspell
                        <span className="hm-soon-tag hm-soon-tag-light">{hasVideo ? "First look" : "Coming soon"}</span>
                    </p>
                    <h2 className="hm-h2" id="hm-ms-title">
                        Moodspell. <em>A little magic for whatever you're feeling.</em>
                    </h2>
                    <p className="hm-body">
                        Original Mallow films, swirling sound and slow, beautiful patterns that shift with your mood. A few minutes to get lost
                        in, whenever a feeling needs some space.
                    </p>
                    <p className="hm-ms-label">What Moodspell will bring</p>
                    <ul className="hm-ms-points">
                        {MOODSPELL_POINTS.map((t) => (
                            <li key={t}>{t}</li>
                        ))}
                    </ul>
                </Reveal>

                <div className="hm-ms-stage">
                    <div className={`hm-ms-screen${paused ? " is-paused" : ""}`} ref={screenRef}>
                        {hasVideo ? (
                            <video
                                ref={vRef}
                                className="hm-ms-video"
                                src={loaded ? src : undefined}
                                poster={poster || undefined}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                aria-label={caption}
                                onError={() => setFailed(true)}
                            />
                        ) : (
                            <div className="hm-ms-preview" aria-hidden>
                                <div className="hm-ms-pearl" />
                                <Spirals className="hm-ms-spirals" tint="night" />
                                {!paused && <Motes density={0.9} light />}
                                <div className="hm-ms-noomi">
                                    <StillMallow id="noomi" />
                                </div>
                                <p className="hm-ms-words">
                                    <span>Think emotion.</span> <span>Think hushmallow.</span>
                                </p>
                            </div>
                        )}
                        <span className="hm-ms-badge">{hasVideo ? "First look" : "Visual preview"}</span>
                        <div className="hm-ms-controls">
                            <button
                                type="button"
                                className="hm-ms-ctl"
                                aria-pressed={paused}
                                onClick={() => setPaused((p) => !p)}
                                aria-label={hasVideo ? (paused ? "Play the film" : "Pause the film") : paused ? "Play the motion" : "Pause the motion"}
                            >
                                {paused ? (
                                    <svg viewBox="0 0 20 20" aria-hidden>
                                        <path d="M7 4.5v11l9-5.5z" fill="currentColor" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 20 20" aria-hidden>
                                        <path d="M6.5 4.5h2.5v11H6.5zM11 4.5h2.5v11H11z" fill="currentColor" />
                                    </svg>
                                )}
                                <span>{paused ? "Play" : "Pause"}</span>
                            </button>
                            {hasVideo && (
                                <button
                                    type="button"
                                    className="hm-ms-ctl"
                                    aria-pressed={!muted}
                                    onClick={toggleSound}
                                    aria-label={muted ? "Turn sound on" : "Turn sound off"}
                                >
                                    <svg viewBox="0 0 20 20" aria-hidden>
                                        <path d="M4 8h3l4-3.5v11L7 12H4z" fill="currentColor" />
                                        {muted ? (
                                            <path d="M13.5 8l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        ) : (
                                            <path d="M13.5 7.5c1 .7 1.5 1.6 1.5 2.5s-.5 1.8-1.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        )}
                                    </svg>
                                    <span>{muted ? "Sound on" : "Sound off"}</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="hm-ms-caption">
                        {hasVideo ? caption : "The first Moodspell film, starring Noomi, is being made now. This is a live preview of its look, not the film itself."}
                    </p>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------------------
// G. Final invitation
// ---------------------------------------------------------------------------
function RowMallow({ id, pos, px }: { id: MallowId; pos: number; px: MotionValue<number> }) {
    const { reduced } = useLanding()
    const rig = useRig(reduced)
    const m = MALLOWS[id]
    const lean = useSpring(
        useTransform(px, (v) => (reduced ? 0 : Math.max(-10, Math.min(10, (v - pos) * 26)))),
        { stiffness: 90, damping: 16 }
    )
    const press = usePress({
        onDown: () => rig.press(1, 0.5),
        onUp: (_h, c) => {
            rig.release()
            if (!c) rig.signature(m, 0.7)
        },
    })
    return (
        <motion.div className="hm-row-m" style={{ rotate: lean }}>
            <button type="button" className="hm-squish" aria-label={`Squeeze ${m.name}`} {...press}>
                <MallowFigure id={id} rig={rig} alt="" shadow={false} />
            </button>
        </motion.div>
    )
}

function Finale({ headline, cta }: { headline: string; cta: string }) {
    const { openAuth, saved } = useLanding()
    // a remembered Mallow makes the invitation personal
    const title = saved && /^Your Mallow\b/.test(headline) ? headline.replace(/^Your Mallow/, MALLOWS[saved].name) : headline
    const sub = saved
        ? `${MALLOWS[saved].name} will be here whenever you're ready. Whatever you feel, there's a Mallow for that.`
        : "Whatever you feel, there's a Mallow for that. Bring it whenever you're ready, and the Mallows will make room."
    const px = useMotionValue(0.5)
    return (
        <section
            className="hm-finale"
            aria-labelledby="hm-final-title"
            onPointerMove={(e) => {
                if (e.pointerType !== "mouse") return
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                px.set((e.clientX - r.left) / r.width)
            }}
            onPointerLeave={() => px.set(0.5)}
        >
            <div className="hm-finale-stars" aria-hidden />
            <div className="hm-wrap hm-finale-in">
                <Reveal>
                    <p className="hm-finale-kicker">Feel something?</p>
                    <h2 className="hm-finale-title" id="hm-final-title">
                        {title}
                    </h2>
                    <p className="hm-finale-sub">{sub}</p>
                    <div className="hm-cta-row hm-cta-center">
                        <button
                            type="button"
                            className="hm-btn hm-btn-light hm-btn-lg"
                            onClick={() => openAuth("signup", { from: "final" })}
                        >
                            {cta}
                            <Arrow />
                        </button>
                        <button
                            type="button"
                            className="hm-btn hm-btn-outline-light hm-btn-lg"
                            onClick={() => openAuth("login", { from: "final" })}
                        >
                            Log in
                        </button>
                    </div>
                </Reveal>
            </div>
            <div className="hm-horizon" aria-hidden />
            <div className="hm-row">
                {ORDER.map((id, i) => (
                    <RowMallow key={id} id={id} pos={(i + 0.5) / ORDER.length} px={px} />
                ))}
            </div>
        </section>
    )
}

function Footer({ logo, termsUrl, privacyUrl, contactUrl }: { logo: string; termsUrl: string; privacyUrl: string; contactUrl: string }) {
    const year = new Date().getFullYear()
    const links = [
        { href: privacyUrl, label: "Privacy" },
        { href: termsUrl, label: "Terms" },
        { href: contactUrl, label: "Contact" },
        { href: SUPPORT_URL, label: "Find a helpline" },
    ].filter((l) => l.href)
    return (
        <footer className="hm-footer">
            <div className="hm-wrap hm-footer-in">
                <div className="hm-footer-brand">
                    <img src={logo} alt="hushmallow" width={1200} height={201} loading="lazy" />
                    <p>Think emotion. Think hushmallow.</p>
                </div>
                <nav className="hm-footer-links" aria-label="Footer">
                    {links.map((l) => (
                        <a key={l.label} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                            {l.label}
                        </a>
                    ))}
                </nav>
            </div>
            <div className="hm-wrap">
                <p className="hm-footer-fine">
                    hushmallow is an imaginative emotional experience with seven original characters. The Mallows are animated characters, not people and not AI, and Moodspell and Hushmates are planned features.
                </p>
                <p className="hm-footer-fine">
                    hushmallow isn't a medical or crisis service. If you're in danger or crisis, please contact your local emergency number or
                    a crisis line straight away.
                </p>
                <p className="hm-footer-fine">© {year} hushmallow</p>
            </div>
        </footer>
    )
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------
/**
 * hushmallow landing page
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1440
 */
export default function HushmallowLanding(props: Props) {
    const p = { ...HushmallowLanding.defaultProps, ...props } as Props
    const prefersReduced = useReducedMotion()
    const reduced = !!prefersReduced
    const target = renderTarget()
    const canvas = target === "canvas"
    const [auth, setAuth] = React.useState<{ open: boolean; mode: AuthMode; context: SignupContext }>({
        open: false,
        mode: "signup",
        context: {},
    })

    const img = React.useMemo(
        () => ({
            noomi: p.noomi || ART + "noomi.webp",
            blubi: p.blubi || ART + "blubi.webp",
            pipzi: p.pipzi || ART + "pipzi.webp",
            boppo: p.boppo || ART + "boppo.webp",
            zuzu: p.zuzu || ART + "zuzu.webp",
            loomi: p.loomi || ART + "loomi.webp",
            glitzi: p.glitzi || ART + "glitzi.webp",
        }),
        [p.noomi, p.blubi, p.pipzi, p.boppo, p.zuzu, p.loomi, p.glitzi]
    )
    const logo = p.logo || ART + "hushmallow-logo.webp"
    const mascot = p.mascot || ART + "mascot.webp"

    const cfg: AuthConfig = {
        signUpUrl: p.signUpUrl,
        loginUrl: p.loginUrl,
        googleUrl: p.googleUrl,
        appleUrl: p.appleUrl,
        emailUrl: p.emailUrl,
        showGoogle: p.showGoogle,
        showApple: p.showApple,
        showEmail: p.showEmail,
        termsUrl: p.termsUrl,
        privacyUrl: p.privacyUrl,
        membershipNote: p.membershipNote,
        onSignUpClick: p.onSignUpClick,
        onLoginClick: p.onLoginClick,
    }

    // "Remember my Mallow": opt-in, this browser only (see RememberSwitch)
    const [remembered, setRemembered] = React.useState<MallowId | null>(null)
    const [saved, setSaved] = React.useState<MallowId | null>(null)
    const lastMet = React.useRef<MallowId | null>(null)
    React.useEffect(() => {
        if (!p.rememberOption || canvas) return
        const id = readMemory()
        setRemembered(id)
        setSaved(id)
    }, [p.rememberOption, canvas])
    const setRemember = React.useCallback(
        (on: boolean) => {
            const id = on ? lastMet.current || saved || "noomi" : null
            writeMemory(id)
            setSaved(id)
        },
        [saved]
    )
    const meetMallow = React.useCallback(
        (id: MallowId) => {
            lastMet.current = id
            if (saved && saved !== id) {
                writeMemory(id)
                setSaved(id)
            }
        },
        [saved]
    )
    // the live moment registers how to start it, so Mallow cards can jump straight in
    const labStart = React.useRef<((feeling: FeelingId) => void) | null>(null)
    const registerLab = React.useCallback((start: (feeling: FeelingId) => void) => {
        labStart.current = start
    }, [])
    const startWith = React.useCallback((feeling: FeelingId) => {
        if (labStart.current) labStart.current(feeling)
        else scrollToRef.current("try")
    }, [])

    // a small, polite message at the bottom of the screen
    const [toast, setToast] = React.useState<{ id: number; text: string } | null>(null)
    const toastTimer = React.useRef(0)
    const showToast = React.useCallback((text: string) => {
        setToast({ id: uid(), text })
        window.clearTimeout(toastTimer.current)
        toastTimer.current = window.setTimeout(() => setToast(null), 3800)
    }, [])
    React.useEffect(() => () => window.clearTimeout(toastTimer.current), [])
    const share = React.useCallback(
        async (id?: MallowId) => {
            if (canvas) return
            const text = id
                ? `I met ${MALLOWS[id].name} on hushmallow. Whatever you feel, there's a Mallow for that.`
                : "Feel something? hushmallow. Whatever you feel, there's a Mallow for that."
            const r = await sharePage(text)
            if (r === "copied") showToast("Link copied. Send it to someone who could use a Mallow.")
            else if (r === "shared") showToast("Thanks for sharing hushmallow.")
            else if (r === "failed") showToast(`Sharing isn't available in this browser. The address is ${window.location.host}${window.location.pathname}`)
        },
        [canvas, showToast]
    )
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])

    const lidSrc = React.useCallback(
        (id: MallowId) => p.lidImages?.[id] || (p.assetBase || ART) + `${id}-lids.webp`,
        [p.assetBase, p.lidImages]
    )

    // the feeling a visitor tried travels with every sign-up button on the page
    const lastFeeling = React.useRef<SignupContext>({})
    const noteFeeling = React.useCallback((c: SignupContext) => {
        lastFeeling.current = { feeling: c.feeling, mallow: c.mallow }
    }, [])

    const openAuth = React.useCallback(
        (mode: AuthMode, context: SignupContext = {}) => {
            if (canvas) return
            // "Log in" goes straight to your log-in page when you have one
            if (mode === "login" && p.loginUrl) {
                const url = withParams(p.loginUrl, { source: "landing" })
                p.onLoginClick?.()
                if (url) {
                    window.location.assign(url)
                    return
                }
            }
            setAuth({ open: true, mode, context: { ...lastFeeling.current, ...context } })
        },
        [canvas, p.loginUrl, p.onLoginClick]
    )

    const scrollToRef = React.useRef<(id: string) => void>(() => {})
    const scrollTo = React.useCallback(
        (id: string) => {
            if (typeof document === "undefined") return
            const el = document.getElementById(id)
            if (!el) return
            el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
            try {
                history.replaceState(null, "", id === "top" ? window.location.pathname + window.location.search : `#${id}`)
            } catch {
                /* sandboxed */
            }
        },
        [reduced]
    )

    const ctx: Ctx = React.useMemo(
        () => ({
            img,
            reduced,
            canvas,
            openAuth,
            scrollTo,
            noteFeeling,
            blinking: p.blinking !== false,
            lidSrc,
            remembered,
            saved,
            rememberOn: !!saved,
            setRemember,
            meetMallow,
            share,
            startWith,
            registerLab,
        }),
        [img, reduced, canvas, openAuth, scrollTo, noteFeeling, p.blinking, lidSrc, remembered, saved, setRemember, meetMallow, share, startWith, registerLab]
    )
    scrollToRef.current = scrollTo

    const nav = (
        <Nav
            logo={logo}
            fixed={p.fixedNav && !canvas}
            cta={p.navCta}
            onCta={() => openAuth("signup", { from: "nav" })}
            onLogin={() => openAuth("login", { from: "nav" })}
        />
    )
    const [navHost, setNavHost] = React.useState<HTMLElement | null>(null)
    React.useEffect(() => {
        if (p.fixedNav && !canvas) setNavHost(document.body)
    }, [p.fixedNav, canvas])

    return (
        <LandingCtx.Provider value={ctx}>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={FONT_CSS} />
            <style>{CSS}</style>
            <div className={`hm${p.fixedNav && !canvas ? " has-fixed-nav" : ""}`}>
                {p.fixedNav && !canvas ? navHost && createPortal(<div className="hm-portal">{nav}</div>, navHost) : nav}
                <main>
                    {/* feel something? → how it works → start anywhere (the live moment) → meet the Mallows
                        → your feelings have company → Moodspell → more inside → Hushmates → your space → meet your Mallow */}
                    <Hero
                        headline={p.headline}
                        squishWord={p.squishWord}
                        support={p.supportHeadline}
                        sub={p.subheadline}
                        primaryCta={p.primaryCta}
                        secondaryCta={p.secondaryCta}
                    />
                    <ThreeWays />
                    <FeelingLab accountCta={p.accountCta} />
                    <Meet />
                    <NoisyHead />
                    <Moodspell video={p.moodspellVideo} poster={p.moodspellPoster} caption={p.moodspellCaption} />
                    <Discover />
                    <Hushmates updatesUrl={p.hushmatesUpdatesUrl} />
                    <Join cfg={cfg} mascot={mascot} rememberOption={p.rememberOption} />
                    <Finale headline={p.finalHeadline} cta={p.finalCta} />
                </main>
                <Footer logo={logo} termsUrl={p.termsUrl} privacyUrl={p.privacyUrl} contactUrl={p.contactUrl} />
            </div>
            <AuthSheet
                open={auth.open}
                mode={auth.mode}
                context={auth.context}
                cfg={cfg}
                mascot={mascot}
                onClose={() => setAuth((a) => ({ ...a, open: false }))}
                onSwitchMode={(mode) => {
                    if (mode === "login" && p.loginUrl) openAuth("login", auth.context)
                    else setAuth((a) => ({ ...a, mode }))
                }}
            />
            {mounted &&
                !canvas &&
                createPortal(
                    <div className="hm-portal">
                        <AnimatePresence>
                            {toast && (
                                <motion.div
                                    key={toast.id}
                                    className="hm-toast"
                                    role="status"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {toast.text}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>,
                    document.body
                )}
        </LandingCtx.Provider>
    )
}

HushmallowLanding.displayName = "hushmallow Landing"

HushmallowLanding.defaultProps = {
    logo: ART + "hushmallow-logo.webp",
    mascot: ART + "mascot.webp",
    noomi: ART + "noomi.webp",
    blubi: ART + "blubi.webp",
    pipzi: ART + "pipzi.webp",
    boppo: ART + "boppo.webp",
    zuzu: ART + "zuzu.webp",
    loomi: ART + "loomi.webp",
    glitzi: ART + "glitzi.webp",
    signUpUrl: "",
    loginUrl: "",
    googleUrl: "",
    appleUrl: "",
    emailUrl: "",
    showGoogle: true,
    showApple: true,
    showEmail: true,
    termsUrl: "",
    privacyUrl: "",
    contactUrl: "",
    headline: "Feel something?\nhushmallow.",
    squishWord: "hushmallow",
    supportHeadline: "Whatever you feel, there's a Mallow for that.",
    subheadline:
        "Happy, anxious, angry, lonely, overthinking, or something you can't quite name. Meet the Mallows: little emotional allies to squeeze, open up to and explore your feelings with.",
    primaryCta: "Meet your Mallow",
    secondaryCta: "See the magic",
    navCta: "Create account",
    accountCta: "Create my hushmallow account",
    finalHeadline: "Meet your Mallow.",
    finalCta: "Create my hushmallow account",
    hushmatesUpdatesUrl: "",
    moodspellVideo: "",
    moodspellPoster: "",
    moodspellCaption: "The first Moodspell, starring Noomi. Think emotion. Think hushmallow.",
    membershipNote: "Plans are optional. You'll always see exactly what's included, and what it costs, before you pay for anything.",
    fixedNav: true,
    blinking: true,
    rememberOption: true,
} as Partial<Props>

addPropertyControls(HushmallowLanding, {
    signUpUrl: {
        type: ControlType.String,
        title: "Sign-up URL",
        placeholder: "https://app.hushmallow.com/signup",
        description: "Your app's sign-up page. Each button adds ?method=google|apple|email (and the feeling they tried).",
    },
    loginUrl: { type: ControlType.String, title: "Log-in URL", placeholder: "https://app.hushmallow.com/login" },
    googleUrl: { type: ControlType.String, title: "Google URL", placeholder: "Optional override" },
    appleUrl: { type: ControlType.String, title: "Apple URL", placeholder: "Optional override" },
    emailUrl: { type: ControlType.String, title: "Email URL", placeholder: "Optional override" },
    showGoogle: { type: ControlType.Boolean, title: "Google", enabledTitle: "Show", disabledTitle: "Hide" },
    showApple: { type: ControlType.Boolean, title: "Apple", enabledTitle: "Show", disabledTitle: "Hide" },
    showEmail: { type: ControlType.Boolean, title: "Email", enabledTitle: "Show", disabledTitle: "Hide" },
    termsUrl: { type: ControlType.String, title: "Terms URL", placeholder: "https://…" },
    privacyUrl: { type: ControlType.String, title: "Privacy URL", placeholder: "https://…" },
    contactUrl: { type: ControlType.String, title: "Contact URL", placeholder: "mailto:hello@… or https://…" },
    headline: { type: ControlType.String, title: "Headline", displayTextArea: true, description: "A line break starts a new line." },
    squishWord: { type: ControlType.String, title: "Squishy word", description: "A word from the headline (any case) that squishes with the Mallow." },
    supportHeadline: { type: ControlType.String, title: "Support line" },
    subheadline: { type: ControlType.String, title: "Description", displayTextArea: true, description: "A blank line starts a new paragraph." },
    primaryCta: { type: ControlType.String, title: "Hero button", description: "Scrolls to the live moment, ready to pick a feeling." },
    secondaryCta: { type: ControlType.String, title: "Second button", description: "Scrolls to Moodspell." },
    navCta: { type: ControlType.String, title: "Nav button" },
    accountCta: { type: ControlType.String, title: "After preview" },
    finalHeadline: { type: ControlType.String, title: "Final headline", description: "Starting with “Your Mallow” lets a remembered Mallow's name replace it." },
    finalCta: { type: ControlType.String, title: "Final button" },
    moodspellVideo: {
        type: ControlType.File,
        title: "Moodspell video",
        allowedFileTypes: ["mp4", "webm", "mov"],
        description: "Your approved film (for example Noomi, Think emotion. Think hushmallow.). Empty shows a labelled preview instead.",
    },
    moodspellPoster: { type: ControlType.Image, title: "Video poster" },
    moodspellCaption: { type: ControlType.String, title: "Video caption" },
    hushmatesUpdatesUrl: {
        type: ControlType.String,
        title: "Hushmates updates",
        placeholder: "https://… (leave empty)",
        description: "Only add a working waitlist or newsletter page. Empty shows a plain “Coming soon” note instead of a button.",
    },
    membershipNote: { type: ControlType.String, title: "Plans note", displayTextArea: true },
    fixedNav: { type: ControlType.Boolean, title: "Fixed nav", enabledTitle: "On", disabledTitle: "Off" },
    blinking: {
        type: ControlType.Boolean,
        title: "Blinking",
        enabledTitle: "On",
        disabledTitle: "Off",
        description: "Eyelid layers match the default art. Turn off if you swap in different Mallow images.",
    },
    rememberOption: { type: ControlType.Boolean, title: "Remember me", enabledTitle: "Offer", disabledTitle: "Hide" },
    logo: { type: ControlType.Image, title: "Logo" },
    mascot: { type: ControlType.Image, title: "Logo mascot" },
    noomi: { type: ControlType.Image, title: "Noomi" },
    blubi: { type: ControlType.Image, title: "Blubi" },
    pipzi: { type: ControlType.Image, title: "Pipzi" },
    boppo: { type: ControlType.Image, title: "Boppo" },
    zuzu: { type: ControlType.Image, title: "Zuzu" },
    loomi: { type: ControlType.Image, title: "Loomi" },
    glitzi: { type: ControlType.Image, title: "Glitzi" },
    onSignUpClick: { type: ControlType.EventHandler, title: "On sign-up tap" },
    onLoginClick: { type: ControlType.EventHandler, title: "On log-in tap" },
})

// ---------------------------------------------------------------------------
// Styles. Layout follows the component's own width (container queries), so
// Framer's Desktop / Tablet / Phone frames each get the right layout.
// ---------------------------------------------------------------------------
const CSS = `
.hm, .hm-portal {
  --ink:#1F1640; --ink-2:#4B4366; --ink-3:#6A6285; --cream:#FFF8F3; --paper:#FFFFFF; --line:rgba(31,22,64,.1);
  --lilac:#CDB8FF; --peach:#FFCDB6; --sky:#BFE6FF; --pink:#FFBADB; --butter:#FFE7A6;
  --display:"Fraunces","Iowan Old Style","Palatino Linotype",Georgia,serif;
  --body:"Nunito Sans",ui-rounded,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --ui:"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --ease:cubic-bezier(.22,1,.36,1);
  --gutter:40px;
  font-family:var(--body); color:var(--ink);
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; text-rendering:optimizeLegibility;
}
.hm *, .hm *::before, .hm *::after, .hm-portal *, .hm-portal *::before, .hm-portal *::after { box-sizing:border-box; }
.hm { position:relative; width:100%; background:var(--cream); container:hm / inline-size; isolation:isolate; }
.hm main { display:block; }
:where(.hm, .hm-portal) img { display:block; max-width:100%; height:auto; -webkit-user-drag:none; user-select:none; }
:where(.hm, .hm-portal) button { font:inherit; color:inherit; background:none; border:0; padding:0; margin:0; cursor:pointer; -webkit-tap-highlight-color:transparent; }
:where(.hm, .hm-portal) a { color:inherit; -webkit-tap-highlight-color:transparent; }
.hm :focus-visible, .hm-portal :focus-visible { outline:3px solid #8E6BFF; outline-offset:3px; border-radius:14px; }
:where(.hm, .hm-portal) :where(p, h1, h2, h3, blockquote, ul) { margin:0; }
.hm-vh { position:absolute !important; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
.hm-wrap { width:100%; max-width:1240px; margin:0 auto; padding:0 var(--gutter); position:relative; }
.hm-display, .hm-h1, .hm-h2, .hm-h3, .hm-meet-name, .hm-finale-title, .hm-done-title, .hm-auth-title, .hm-cloud-text, .hm-meet-ghost {
  font-family:var(--display); font-optical-sizing:auto; font-variation-settings:"SOFT" 100, "WONK" 0;
}
.hm-ico { width:18px; height:18px; flex:none; }

/* type */
.hm-eyebrow { display:inline-flex; align-items:center; gap:10px; font:700 13px/1.2 var(--ui); letter-spacing:.08em; text-transform:uppercase; color:var(--ink-2); }
.hm-eyebrow-dot { width:8px; height:8px; border-radius:50%; background:linear-gradient(135deg,#FF8CC6,#9C7BFF 60%,#6FC8FF); box-shadow:0 0 0 4px rgba(156,123,255,.15); }
.hm-h1 { font-size:clamp(44px, 5.6cqi, 86px); line-height:1.0; font-weight:520; letter-spacing:-.025em; margin:22px 0 22px; text-wrap:balance; }
.hm-h2 { font-size:clamp(36px, 4.3cqi, 64px); line-height:1.04; font-weight:520; letter-spacing:-.022em; margin:18px 0 18px; text-wrap:balance; }
.hm-h2 em, .hm-h1 em { font-style:italic; font-weight:480; }
.hm-h3 { font-size:clamp(26px, 2.3cqi, 34px); line-height:1.12; font-weight:540; letter-spacing:-.015em; margin:6px 0 12px; text-wrap:balance; }
.hm-lead { font-size:clamp(18px, 1.45cqi, 21px); line-height:1.55; color:var(--ink-2); max-width:34em; text-wrap:pretty; }
.hm-sub { font-size:clamp(17px, 1.35cqi, 20px); line-height:1.55; color:var(--ink-2); max-width:36em; text-wrap:pretty; }
.hm-body { font-size:18px; line-height:1.6; color:var(--ink-2); text-wrap:pretty; }
.hm-body + .hm-body { margin-top:14px; }
.hm-head { margin-bottom:56px; }
.hm-head-center { text-align:center; display:flex; flex-direction:column; align-items:center; }
.hm-head-center .hm-h2 { max-width:15em; }

/* buttons */
.hm-btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; min-height:48px; padding:0 22px; border-radius:999px; font:700 16px/1 var(--ui); letter-spacing:-.005em; text-decoration:none; white-space:nowrap; transition:transform .25s var(--ease), box-shadow .25s var(--ease), background-color .25s var(--ease); }
.hm-btn:active { transform:scale(.97); }
.hm-btn-lg { min-height:58px; padding:0 30px; font-size:17px; }
.hm-btn-sm { min-height:44px; padding:0 18px; font-size:15px; }
.hm-btn-xs { min-height:40px; padding:0 16px; font-size:14px; }
.hm-btn-primary { color:#FFF8F3; background:var(--ink); box-shadow:0 1px 0 rgba(255,255,255,.18) inset, 0 10px 24px -10px rgba(31,22,64,.55), 0 0 0 0 rgba(156,123,255,0); }
.hm-btn-primary:hover { transform:translateY(-2px); box-shadow:0 1px 0 rgba(255,255,255,.18) inset, 0 16px 30px -12px rgba(31,22,64,.55), 0 0 0 6px rgba(205,184,255,.45); }
.hm-btn-ink { color:#FFF8F3; background:var(--ink); }
.hm-btn-ghost { color:var(--ink); background:rgba(255,255,255,.7); box-shadow:0 0 0 1.5px rgba(31,22,64,.14) inset; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
.hm-btn-ghost:hover { background:#fff; transform:translateY(-2px); box-shadow:0 0 0 1.5px rgba(31,22,64,.24) inset, 0 12px 26px -16px rgba(31,22,64,.4); }
.hm-btn-light { color:var(--ink); background:#FFF8F3; box-shadow:0 14px 40px -12px rgba(255,170,215,.75); }
.hm-btn-light:hover { transform:translateY(-2px); box-shadow:0 18px 46px -10px rgba(255,170,215,.95), 0 0 0 6px rgba(255,255,255,.18); }
.hm-btn-outline-light { color:#FFF8F3; box-shadow:0 0 0 1.5px rgba(255,248,243,.45) inset; }
.hm-btn-outline-light:hover { box-shadow:0 0 0 1.5px rgba(255,248,243,.9) inset; transform:translateY(-2px); }
.hm-textbtn { display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:0 6px; font:700 15px/1 var(--ui); color:var(--ink-2); border-radius:12px; }
.hm-textbtn:hover { color:var(--ink); }
.hm-textbtn-inline { min-height:0; padding:0; text-decoration:underline; text-underline-offset:3px; color:var(--ink); font-size:inherit; }
.hm-cta-row { display:flex; flex-wrap:wrap; gap:12px; }
.hm-cta-center { justify-content:center; }

/* ambient light */
.hm-orb { position:absolute; border-radius:50%; pointer-events:none; z-index:0; will-change:transform; }
.hm-orb-a { width:780px; height:780px; left:-260px; top:-280px; background:radial-gradient(closest-side, rgba(255,186,219,.75), rgba(255,186,219,0)); animation:hm-drift 22s ease-in-out infinite; }
.hm-orb-b { width:860px; height:860px; right:-300px; top:-120px; background:radial-gradient(closest-side, rgba(191,230,255,.85), rgba(191,230,255,0)); animation:hm-drift 26s ease-in-out infinite reverse; }
.hm-orb-c { width:640px; height:640px; left:30%; bottom:-360px; background:radial-gradient(closest-side, rgba(205,184,255,.6), rgba(205,184,255,0)); animation:hm-drift 30s ease-in-out infinite; }
.hm-orb-d { width:900px; height:900px; right:-320px; top:-200px; background:radial-gradient(closest-side, rgba(255,231,166,.55), rgba(255,231,166,0)); }
@keyframes hm-drift { 0%,100% { transform:translate3d(0,0,0) } 50% { transform:translate3d(40px,30px,0) } }

/* the living Mallow */
.hm-fig { position:relative; width:100%; }
.hm-fig-shadow { position:absolute; left:14%; right:14%; bottom:-3%; height:9%; border-radius:50%; background:radial-gradient(closest-side, rgba(31,22,64,.28), rgba(31,22,64,0)); }
.hm-fig-halo { position:absolute; inset:-22%; border-radius:50%; pointer-events:none; }
.hm-fig-breath { transform-origin:50% 100%; }
.hm-breathe { animation:hm-breathe var(--bd, 4.6s) ease-in-out infinite; }
@keyframes hm-breathe { 0%,100% { transform:scale(1,1) } 50% { transform:scale(1.014,1.03) } }
.hm-fig-body { position:relative; transform-origin:50% 100%; will-change:transform; }
.hm-fig-img { width:100%; filter:drop-shadow(0 18px 22px rgba(31,22,64,.16)); }
.hm-lids { position:absolute; inset:0; width:100%; height:auto; pointer-events:none; }
.hm-glitch { position:absolute; inset:0; width:100%; mix-blend-mode:screen; pointer-events:none; }
.hm-glitch-a { transform:translateX(-7px); clip-path:inset(18% 0 58% 0); filter:hue-rotate(80deg) saturate(2.4); }
.hm-glitch-b { transform:translateX(8px); clip-path:inset(62% 0 16% 0); filter:hue-rotate(-70deg) saturate(2.4); }
.hm-blush { position:absolute; inset:0; pointer-events:none; mix-blend-mode:screen; }
.hm-blush span { position:absolute; width:22%; aspect-ratio:1.35; transform:translate(-50%,-50%); border-radius:50%; }
.hm-parts { position:absolute; inset:0; pointer-events:none; overflow:visible; }
.hm-part { position:absolute; display:block; margin:-10px 0 0 -10px; }
.hm-part svg { width:100%; height:100%; display:block; filter:drop-shadow(0 2px 4px rgba(31,22,64,.18)); }
.hm-still { width:100%; }
.hm-still img { width:100%; filter:drop-shadow(0 12px 16px rgba(31,22,64,.15)); }
.hm-float { animation:hm-float 5.5s ease-in-out infinite; }
.hm-float-sm { display:inline-flex; align-items:center; gap:6px; animation:hm-float-sm 4.6s ease-in-out infinite; }
@keyframes hm-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-9px) } }
@keyframes hm-float-sm { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-5px) } }
.hm-squish { display:block; width:100%; touch-action:pan-y; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; cursor:grab; border-radius:40%; }
.hm-squish:active { cursor:grabbing; }

/* nav */
/* the nav always carries its own light background, so it stays readable whatever the page behind it is */
.hm-nav { position:relative; z-index:50; width:100%; font-family:var(--ui); color:var(--ink); background:rgba(255,250,246,.97); backdrop-filter:saturate(1.6) blur(18px); -webkit-backdrop-filter:saturate(1.6) blur(18px); box-shadow:0 1px 0 rgba(31,22,64,.06); }
.hm-nav.is-fixed { position:fixed; top:0; left:0; right:0; padding-top:env(safe-area-inset-top, 0px); transition:background-color .35s var(--ease), box-shadow .35s var(--ease); }
.hm-nav.is-scrolled { background:rgba(255,250,246,.94); box-shadow:0 1px 0 rgba(31,22,64,.08), 0 10px 30px -18px rgba(31,22,64,.35); }
.hm-nav-in { max-width:1240px; margin:0 auto; padding:0 var(--gutter, 40px); height:76px; display:flex; align-items:center; gap:24px; }
.hm-nav-logo { display:flex; align-items:center; flex:none; min-height:44px; border-radius:10px; }
.hm-nav-logo img { width:172px; height:auto; }
.hm-nav-links { flex:1; display:flex; justify-content:center; gap:6px; }
.hm-nav-links a { font:600 15px/1 var(--ui); color:var(--ink-2); text-decoration:none; padding:12px 14px; border-radius:999px; transition:background-color .2s, color .2s; }
.hm-nav-links a:hover { background:rgba(31,22,64,.06); color:var(--ink); }
.hm-nav-actions { display:flex; align-items:center; gap:8px; margin-left:auto; }
.hm-nav-cta-short { display:none; }
.hm.has-fixed-nav .hm-hero { padding-top:150px; }

/* A. hero */
.hm-hero { position:relative; overflow:hidden; padding:72px 0 96px; }
.hm-hero-grid { display:grid; grid-template-columns:minmax(0,1.04fr) minmax(0,1fr); gap:24px; align-items:center; z-index:1; }
.hm-hero-copy { max-width:620px; position:relative; z-index:2; }
.hm-squishword { display:inline-block; transform-origin:50% 88%; font-style:italic; font-weight:500; padding:0 .04em; background:linear-gradient(100deg,#FF6FB5 0%,#A07BFF 45%,#48B8F5 90%); -webkit-background-clip:text; background-clip:text; color:transparent; }
.hm-hero .hm-cta-row { margin-top:34px; }
.hm-hero-support { text-wrap:balance; font-family:var(--display); font-variation-settings:"SOFT" 100; font-style:italic; font-weight:450; font-size:clamp(24px, 2.3cqi, 34px); line-height:1.2; letter-spacing:-.01em; color:var(--ink); margin:-4px 0 16px; }
.hm-side-lean { display:block; transform-origin:50% 100%; }
.hm-lead-group { display:flex; flex-direction:column; gap:12px; }
.hm-eyebrow-sep { opacity:.45; }

/* three ways in */
.hm-ways { background:linear-gradient(180deg, var(--cream), #FBF4FF 55%, var(--cream)); padding-top:96px; }
.hm-ways-row { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:0; }
.hm-way { position:relative; display:flex; }
.hm-way > * { flex:1; display:flex; }
.hm-way + .hm-way::before { content:""; position:absolute; left:0; top:12%; bottom:12%; width:1px; background:var(--line); }
.hm-way-link { flex:1; display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:12px 28px 18px; text-decoration:none; color:inherit; border-radius:32px; transition:background-color .3s var(--ease), transform .3s var(--ease); }
.hm-way-link:hover { background:rgba(255,255,255,.7); transform:translateY(-3px); }
.hm-way-art { display:flex; justify-content:center; align-items:flex-end; gap:6px; height:104px; margin-bottom:10px; }
.hm-way-art > * { width:100px; }
.hm-way-art.is-pair > * { width:84px; }
.hm-way-label { display:inline-flex; align-items:center; gap:8px; min-height:26px; font:800 13px/1 var(--ui); letter-spacing:.12em; text-transform:uppercase; color:var(--ink-2); }
.hm-way-title { font-family:var(--display); font-variation-settings:"SOFT" 100; font-size:clamp(23px, 2cqi, 28px); line-height:1.15; font-weight:540; letter-spacing:-.01em; color:var(--ink); text-wrap:balance; }
.hm-way-body { font-size:16.5px; line-height:1.55; color:var(--ink-2); max-width:22em; text-wrap:pretty; }
.hm-way-more { display:inline-flex; align-items:center; gap:6px; margin-top:auto; padding-top:6px; font:700 14px/1 var(--ui); color:var(--ink); min-height:32px; }
.hm-soon-tag { display:inline-flex; align-items:center; font:800 11.5px/1 var(--ui); letter-spacing:.06em; text-transform:uppercase; color:#6A3FD1; background:#EFE6FF; padding:6px 9px; border-radius:999px; }

/* Connect: Hushmates */
.hm-mates { background:radial-gradient(70% 60% at 85% 40%, #FFE9D6 0%, rgba(255,233,214,0) 70%), radial-gradient(60% 60% at 10% 80%, #E6F4FF 0%, rgba(230,244,255,0) 70%), linear-gradient(180deg, var(--cream), #F7F0FF); overflow:hidden; }
.hm-mates-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:56px; align-items:center; }
.hm-mates-copy .hm-eyebrow { gap:10px; }
.hm-mates-copy .hm-h2 em { font-style:italic; background:linear-gradient(100deg,#4FB4F0,#A57BFF 50%,#FF9A5C); -webkit-background-clip:text; background-clip:text; color:transparent; padding-right:.06em; }
.hm-mates-card { margin-top:28px; padding:26px 26px 24px; border-radius:28px; background:rgba(255,255,255,.82); box-shadow:0 0 0 1px rgba(31,22,64,.06) inset, 0 30px 60px -36px rgba(70,40,140,.4); display:flex; flex-direction:column; align-items:flex-start; gap:10px; max-width:520px; }
.hm-mates-name { font-family:var(--display); font-variation-settings:"SOFT" 100; font-style:italic; font-weight:560; font-size:30px; line-height:1; letter-spacing:-.01em; color:var(--ink); }
.hm-mates-line { font:700 17px/1.4 var(--ui); color:var(--ink); }
.hm-mates-desc { font-size:16.5px; line-height:1.55; color:var(--ink-2); }
.hm-mates-points { list-style:none; padding:0; margin:4px 0 6px; display:flex; flex-wrap:wrap; gap:8px; }
.hm-mates-points li { font:700 13.5px/1 var(--ui); color:var(--ink-2); background:#F4F0FB; padding:9px 12px; border-radius:999px; }
.hm-mates-status { display:flex; align-items:center; gap:10px; font:600 14.5px/1.4 var(--ui); color:var(--ink-2); }
.hm-soon-dot { width:9px; height:9px; flex:none; border-radius:50%; background:#A57BFF; box-shadow:0 0 0 4px rgba(165,123,255,.18); }
.hm-mates-scene { position:relative; width:100%; max-width:560px; justify-self:center; aspect-ratio:1 / .78; }
.hm-mates-glow { position:absolute; left:10%; right:10%; top:8%; bottom:4%; border-radius:50%; background:radial-gradient(closest-side, rgba(201,168,255,.45), rgba(201,168,255,0)); }
.hm-mates-path { position:absolute; left:14%; top:20%; height:42%; width:72%; overflow:visible; }
.hm-mates-flow { animation:hm-flow 3.6s linear infinite; }
@keyframes hm-flow { to { stroke-dashoffset:-160 } }
.hm-mates-spark { position:absolute; width:26px; height:26px; margin:-13px 0 0 -13px; color:#FF6FB5; z-index:3; pointer-events:none; }
.hm-mates-spark svg { width:100%; height:100%; display:block; filter:drop-shadow(0 3px 6px rgba(255,111,181,.45)); }
.hm-mates-m { position:absolute; bottom:6%; width:36%; z-index:2; }
.hm-mates-m-l { left:2%; } .hm-mates-m-r { right:2%; }
.hm-mates-bubble { position:absolute; top:26%; display:flex; gap:5px; padding:12px 14px; border-radius:18px; background:#fff; box-shadow:0 14px 30px -18px rgba(31,22,64,.45); z-index:2; animation:hm-bubble 6s ease-in-out infinite; }
.hm-mates-bubble i { width:7px; height:7px; border-radius:50%; background:#B9AED6; animation:hm-dot 1.2s ease-in-out infinite; }
.hm-mates-bubble i:nth-child(2) { animation-delay:.15s; } .hm-mates-bubble i:nth-child(3) { animation-delay:.3s; }
.hm-mates-bubble-l { left:14%; border-bottom-left-radius:6px; }
.hm-mates-bubble-r { right:14%; border-bottom-right-radius:6px; animation-delay:3s; }
@keyframes hm-bubble { 0%,8% { opacity:0; transform:translateY(8px) scale(.9) } 14%,44% { opacity:1; transform:none } 52%,100% { opacity:0; transform:translateY(-6px) scale(.96) } }
@keyframes hm-dot { 0%,100% { transform:translateY(0); opacity:.5 } 50% { transform:translateY(-3px); opacity:1 } }
.hm-forget { margin-left:6px; font-size:14px; color:var(--ink-2); }
.hm-hero-note { margin-top:20px; font:600 14px/1.4 var(--ui); color:var(--ink-3); }
.hm-hero-stage-wrap { position:relative; width:100%; display:flex; flex-direction:column; align-items:center; }
.hm-stage { position:relative; width:100%; max-width:640px; aspect-ratio:1 / .95; }
.hm-stage-glow { position:absolute; left:6%; right:6%; top:6%; bottom:2%; border-radius:50%; transition:background .8s; }
.hm-pillow { position:absolute; left:8%; right:8%; bottom:3%; height:20%; }
.hm-pillow span { position:absolute; border-radius:50%; background:radial-gradient(60% 60% at 50% 35%, #FFFFFF, #F7EEFF 70%, #EFE3FF); box-shadow:0 30px 60px -30px rgba(120,90,200,.45), inset 0 -10px 24px rgba(186,160,255,.25); }
.hm-pillow span:nth-child(1) { left:0; right:0; bottom:0; height:62%; }
.hm-pillow span:nth-child(2) { left:12%; width:44%; bottom:28%; height:70%; }
.hm-pillow span:nth-child(3) { right:10%; width:46%; bottom:24%; height:66%; }
.hm-center { position:absolute; left:25%; width:50%; bottom:9%; z-index:3; }
.hm-side { position:absolute; z-index:2; display:block; border-radius:40%; transition:transform .35s var(--ease); }
.hm-side:hover { transform:translateY(-6px) scale(1.05); }
.hm-side-in { display:block; }
.hm-slot-0 { left:0%; top:55%; width:19%; z-index:4; }
.hm-slot-1 { right:0%; top:57%; width:18%; z-index:4; }
.hm-slot-2 { left:4%; top:27%; width:15%; }
.hm-slot-3 { right:3%; top:25%; width:16%; }
.hm-slot-4 { left:10%; top:3%; width:12%; }
.hm-slot-5 { right:11%; top:2%; width:12%; }
.hm-caption-zone { position:absolute; left:20%; right:20%; top:10%; height:30%; display:flex; align-items:flex-end; justify-content:center; z-index:6; pointer-events:none; }
.hm-caption { position:relative; background:#FFFFFF; color:var(--ink); font:650 18px/1.38 var(--body); padding:14px 18px 15px; border-radius:22px; box-shadow:0 18px 40px -18px rgba(31,22,64,.35); text-align:center; max-width:100%; }
.hm-caption::after { content:""; position:absolute; left:50%; bottom:-7px; width:16px; height:16px; background:#fff; transform:translateX(-50%) rotate(45deg); border-radius:3px; }
.hm-caption-who { display:block; font:800 12px/1 var(--ui); letter-spacing:.08em; text-transform:uppercase; color:var(--ink-3); margin-bottom:6px; }
.hm-stage-foot { min-height:48px; margin-top:6px; display:flex; align-items:center; justify-content:center; }
.hm-hint { display:inline-flex; align-items:center; gap:10px; font:700 14px/1 var(--ui); color:var(--ink-2); padding:12px 16px; border-radius:999px; background:rgba(255,255,255,.75); box-shadow:0 0 0 1px rgba(31,22,64,.08) inset; }
.hm-hint-dot { width:9px; height:9px; border-radius:50%; background:#FF6FB5; animation:hm-pulse 1.8s ease-out infinite; }
@keyframes hm-pulse { 0% { box-shadow:0 0 0 0 rgba(255,111,181,.55) } 100% { box-shadow:0 0 0 12px rgba(255,111,181,0) } }
.hm-nudge { display:inline-flex; align-items:center; gap:8px; min-height:44px; font:700 15px/1 var(--ui); color:var(--ink); text-decoration:none; padding:0 18px; border-radius:999px; background:#fff; box-shadow:0 10px 26px -14px rgba(31,22,64,.4); }

/* sections */
.hm-section { position:relative; padding:120px 0; scroll-margin-top:76px; }
.hm-hero, .hm-finale { scroll-margin-top:0; }

/* B. the little moment */
.hm-try { background:linear-gradient(180deg, var(--cream), #FBF3FF 60%, var(--cream)); }
.hm-lab { position:relative; border-radius:44px; overflow:hidden; background:#fff; min-height:640px; box-shadow:0 1px 0 rgba(255,255,255,.9) inset, 0 40px 80px -40px rgba(70,40,140,.35), 0 0 0 1px rgba(31,22,64,.06); isolation:isolate; scroll-margin-top:92px; }
.hm-lab-bg { position:absolute; inset:0; z-index:-1; }
.hm-pick { min-height:640px; padding:56px 40px 52px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
.hm-pick-mallows { display:flex; justify-content:center; align-items:flex-end; gap:10px; margin-bottom:34px; }
.hm-pick-mallows > * { width:74px; }
.hm-pick-mallows > *:nth-child(4) { width:96px; }
.hm-pick-mallows > *:nth-child(3), .hm-pick-mallows > *:nth-child(5) { width:84px; }
.hm-pick-q { font:600 clamp(24px, 2.2cqi, 30px)/1.2 var(--display); font-variation-settings:"SOFT" 100; margin-bottom:24px; }
.hm-chips { display:flex; flex-wrap:wrap; justify-content:center; gap:12px; max-width:760px; }
.hm-chip { display:inline-flex; align-items:center; gap:10px; min-height:52px; padding:0 22px; border-radius:999px; background:#fff; font:700 16px/1 var(--ui); color:var(--ink); box-shadow:0 0 0 1.5px rgba(31,22,64,.1) inset, 0 8px 18px -12px rgba(31,22,64,.3); transition:transform .2s var(--ease), box-shadow .2s var(--ease); }
.hm-chip:hover { transform:translateY(-2px); box-shadow:0 0 0 1.5px rgba(31,22,64,.22) inset, 0 14px 24px -14px rgba(31,22,64,.4); }
.hm-chip:active { transform:scale(.97); }
.hm-chip-dot { width:12px; height:12px; border-radius:50%; box-shadow:0 0 0 3px rgba(255,255,255,.8), 0 0 0 4px rgba(31,22,64,.06); }
.hm-pick-foot { margin-top:26px; font:600 15px/1.4 var(--ui); color:var(--ink-3); }
.hm-pick-reset { margin-top:18px; }
.hm-sense { width:100%; max-width:560px; margin-top:30px; display:flex; flex-direction:column; align-items:center; gap:10px; }
.hm-sense-label { font:700 13px/1.2 var(--ui); letter-spacing:.08em; text-transform:uppercase; color:var(--ink-3); display:flex; align-items:center; gap:12px; width:100%; }
.hm-sense-label::before, .hm-sense-label::after { content:""; flex:1; height:1px; background:var(--line); }
.hm-sense-row { width:100%; display:flex; gap:8px; align-items:center; background:#fff; padding:5px 5px 5px 18px; border-radius:999px; box-shadow:0 0 0 1.5px rgba(31,22,64,.12) inset, 0 10px 24px -18px rgba(31,22,64,.45); }
.hm-sense-row:focus-within { box-shadow:0 0 0 2px #8E6BFF inset, 0 10px 24px -18px rgba(31,22,64,.45); }
.hm-sense-row input { flex:1; min-width:0; border:0; outline:0; background:transparent; font:600 16px/1.3 var(--body); color:var(--ink); min-height:44px; }
.hm-sense-row input::placeholder { color:#8A84A0; font-weight:500; }
.hm-sense-row .hm-btn:disabled { opacity:.4; cursor:default; }
.hm-sense-note { font:500 13.5px/1.5 var(--body); color:var(--ink-3); max-width:34em; text-align:center; }
.hm-sense-note strong { color:var(--ink-2); font-weight:800; }
.hm-care-view { min-height:640px; padding:48px 32px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px; }
.hm-care-mallow { width:120px; margin-bottom:6px; }
.hm-care-view .hm-done-sub { max-width:32em; }
.hm-mood { position:relative; z-index:2; }
.hm-play { display:flex; flex-direction:column; min-height:640px; padding:18px 28px 32px; }
.hm-play-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; position:relative; z-index:4; }
.hm-play-bar .hm-textbtn { white-space:nowrap; }
.hm-short { display:none; }
.hm-play-cloud.is-gone { display:none; }
.hm-play-bar-pad { width:110px; }
.hm-dots { display:flex; gap:8px; }
.hm-dots span { width:10px; height:10px; border-radius:50%; background:rgba(31,22,64,.14); transition:background .5s, transform .5s var(--ease); }
.hm-dots span.is-on { transform:scale(1.25); }
.hm-play-stage { position:relative; flex:1; display:grid; grid-template-columns:minmax(0,1fr) minmax(220px,300px) minmax(0,1fr); grid-template-rows:auto auto; align-items:center; gap:4px 28px; padding:8px 0 6px; }
.hm-play-cloud { grid-column:2; grid-row:1; position:relative; display:flex; flex-direction:column; align-items:center; min-height:200px; justify-content:flex-end; z-index:3; }
.hm-play-mallow { grid-column:2; grid-row:2; position:relative; width:100%; max-width:280px; justify-self:center; padding:26px; }
.hm-say { grid-column:3; grid-row:1 / span 2; align-self:center; min-height:120px; display:flex; align-items:center; }
.hm-say-bubble { position:relative; background:#fff; padding:18px 22px 20px; border-radius:26px; font:650 clamp(18px, 1.5cqi, 21px)/1.42 var(--body); color:var(--ink); box-shadow:0 22px 44px -24px rgba(31,22,64,.4), 0 0 0 1px rgba(31,22,64,.05); max-width:340px; }
.hm-say-bubble::before { content:""; position:absolute; left:-7px; top:50%; width:18px; height:18px; background:#fff; transform:translateY(-50%) rotate(45deg); border-radius:3px; }
.hm-say-who { display:block; font:800 12px/1 var(--ui); letter-spacing:.08em; text-transform:uppercase; margin-bottom:8px; }
.hm-breath-ring { position:absolute; inset:0; pointer-events:none; }
.hm-breath-ring svg { position:absolute; inset:0; width:100%; height:100%; transform:rotate(-90deg); }
.hm-breath-disc { position:absolute; inset:6%; border-radius:50%; }
.hm-ring-track { fill:none; stroke:rgba(31,22,64,.08); stroke-width:2.2; }
.hm-ring-fill { fill:none; stroke-width:2.6; stroke-linecap:round; }
.hm-squish-lab { touch-action:none; position:relative; z-index:2; }
.hm-cloud-wrap { position:relative; width:min(100%, 300px); display:flex; flex-direction:column; align-items:center; }
.hm-cloud-drag { position:relative; width:100%; }
.hm-cloud-drag.is-draggable { cursor:grab; touch-action:none; }
.hm-cloud { position:relative; width:100%; min-height:118px; display:flex; align-items:center; justify-content:center; padding:24px 28px; border-radius:58% 42% 52% 48% / 56% 50% 50% 44%; overflow:hidden; box-shadow:0 26px 50px -26px rgba(31,22,64,.45); }
.hm-blob { animation:hm-blob 9s ease-in-out infinite; }
@keyframes hm-blob { 0%,100% { border-radius:58% 42% 52% 48% / 56% 50% 50% 44% } 33% { border-radius:46% 54% 44% 56% / 50% 58% 42% 50% } 66% { border-radius:54% 46% 58% 42% / 44% 52% 48% 56% } }
.hm-cloud-layer { position:absolute; inset:0; }
.hm-cloud-sheen { position:absolute; left:12%; top:10%; width:46%; height:30%; border-radius:50%; background:radial-gradient(closest-side, rgba(255,255,255,.55), rgba(255,255,255,0)); }
.hm-cloud-text { position:relative; font-size:clamp(22px, 2cqi, 27px); line-height:1.15; font-style:italic; font-weight:500; text-align:center; overflow-wrap:anywhere; }
.hm-cloud-tail { display:flex; flex-direction:column; align-items:center; gap:5px; margin-top:6px; }
.hm-cloud-tail span { display:block; border-radius:50%; background:rgba(255,255,255,.95); box-shadow:0 6px 12px -6px rgba(31,22,64,.4); }
.hm-cloud-tail span:nth-child(1) { width:16px; height:16px; }
.hm-cloud-tail span:nth-child(2) { width:9px; height:9px; margin-left:18px; }
.hm-sats { position:absolute; inset:0; pointer-events:none; }
.hm-sat { position:absolute; z-index:2; }
.hm-sat-tab, .hm-sat-whatif, .hm-sat-ping { white-space:nowrap; }
.hm-sat-tab > span, .hm-sat-whatif > span, .hm-sat-ping > span { padding:7px 11px; border-radius:10px; font:700 13px/1 var(--ui); background:rgba(255,255,255,.94); color:var(--ink); box-shadow:0 8px 18px -10px rgba(31,22,64,.45); }
.hm-sat-whatif > span { font-style:italic; border-radius:999px; background:#EEF8FF; }
.hm-tab-x { font-style:normal; color:var(--ink-3); font-weight:800; }
.hm-ping-dot { width:7px; height:7px; border-radius:50%; background:#FF4D7D; }
.hm-sat-bolt > span, .hm-sat-sparkle > span { width:24px; height:24px; color:#FF3DF2; }
.hm-sat-sparkle > span { color:#FFB21E; }
.hm-sat-bolt > span svg, .hm-sat-sparkle > span svg { width:100%; height:100%; }
.hm-sat-bolt:nth-child(2n) > span { color:#3EE8FF; }
.hm-fizz-dot { width:14px; height:14px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #fff, #FF8FA3 60%, #FF5470); }
.hm-rain { position:absolute; left:8%; right:8%; top:60%; height:110px; pointer-events:none; }
.hm-rain span { position:absolute; top:0; width:3px; height:14px; border-radius:3px; background:linear-gradient(#9CCBFF, #5E8FD8); animation:hm-rain 1.6s linear infinite; opacity:0; }
@keyframes hm-rain { 0% { transform:translateY(0); opacity:0 } 15% { opacity:.9 } 100% { transform:translateY(100px); opacity:0 } }
.hm-name { margin-top:10px; min-height:44px; display:flex; justify-content:center; }
.hm-name-btn { font-size:14px; color:var(--ink-2); background:rgba(255,255,255,.75); padding:0 14px; border-radius:999px; }
.hm-name-form { display:flex; gap:8px; align-items:center; background:#fff; padding:4px; border-radius:999px; box-shadow:0 0 0 1.5px rgba(31,22,64,.12) inset; }
.hm-name-form input { border:0; outline:0; background:transparent; font:600 16px/1 var(--body); color:var(--ink); padding:0 12px; width:190px; min-height:40px; }
.hm-play-controls { min-height:168px; display:flex; justify-content:center; }
.hm-ctl { display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; width:100%; }
.hm-ctl-empty { min-height:1px; }
.hm-instr { font:600 clamp(19px, 1.6cqi, 22px)/1.3 var(--display); font-variation-settings:"SOFT" 100; color:var(--ink); min-height:1.3em; }
.hm-hold { position:relative; display:inline-flex; align-items:center; justify-content:center; min-height:58px; padding:0 30px; border-radius:999px; background:var(--ink); color:#FFF8F3; font:700 16px/1 var(--ui); touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; transition:transform .3s var(--ease), opacity .3s; }
.hm-hold.is-holding { transform:scale(.96); }
.hm-hold:disabled { opacity:.45; cursor:default; }
.hm-hold-ring { position:absolute; inset:-5px; border-radius:999px; box-shadow:0 0 0 2px rgba(156,123,255,.35); animation:hm-pulse-ring 2.4s ease-out infinite; pointer-events:none; }
.hm-hold:disabled .hm-hold-ring, .hm-hold.is-holding .hm-hold-ring { animation:none; opacity:0; }
@keyframes hm-pulse-ring { 0% { transform:scale(1); opacity:1 } 100% { transform:scale(1.15); opacity:0 } }
.hm-ctl-note { font:600 14px/1.4 var(--ui); color:var(--ink-3); min-height:1.4em; }
.hm-ctl-row { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; }
.hm-ctl-skip { font-size:14px; }
.hm-done { gap:16px; }
.hm-done-title { font-size:clamp(26px, 2.6cqi, 36px); line-height:1.12; font-weight:540; letter-spacing:-.015em; }
.hm-done-sub { font-size:17px; line-height:1.5; color:var(--ink-2); max-width:30em; }
.hm-care { font-size:15px; line-height:1.5; color:var(--ink-2); background:rgba(255,255,255,.8); padding:12px 16px; border-radius:16px; max-width:34em; }
.hm-care a { font-weight:700; }

/* C. meet */
.hm-meet { background:var(--cream); }
.hm-meet-grid { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,1fr); grid-template-areas:'stage info' 'tray tray'; gap:40px 56px; align-items:center; }
.hm-meet-stage { grid-area:stage; }
.hm-meet-info { grid-area:info; }
.hm-tray { grid-area:tray; }
.hm-meet-stage { position:relative; aspect-ratio:1 / .9; border-radius:48px; overflow:hidden; display:flex; align-items:center; justify-content:center; touch-action:pan-y; box-shadow:0 0 0 1px rgba(31,22,64,.05) inset; }
.hm-meet-glow { position:absolute; inset:8%; border-radius:50%; transition:background .8s; }
.hm-meet-ghost { position:absolute; left:0; right:0; top:6%; text-align:center; font-size:clamp(80px, 13cqi, 190px); font-weight:600; font-style:italic; letter-spacing:-.04em; opacity:.09; line-height:1; pointer-events:none; white-space:nowrap; transition:color .6s; }
.hm-meet-fig { position:relative; width:52%; margin-top:6%; z-index:2; }
.hm-round { position:absolute; top:50%; width:48px; height:48px; margin-top:-24px; border-radius:50%; background:rgba(255,255,255,.85); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 20px -10px rgba(31,22,64,.4); z-index:3; transition:transform .2s var(--ease); }
.hm-round:hover { transform:scale(1.08); }
.hm-round-l { left:18px; } .hm-round-r { right:18px; }
.hm-meet-say { position:absolute; left:14%; right:14%; top:6%; min-height:88px; display:flex; align-items:flex-end; justify-content:center; z-index:4; pointer-events:none; }
.hm-peek { position:absolute; bottom:9%; width:15%; opacity:.62; z-index:1; border-radius:40%; transition:opacity .3s, transform .35s var(--ease); }
.hm-peek:hover { opacity:.95; transform:translateY(-4px); }
.hm-peek-l { left:6%; } .hm-peek-r { right:6%; }
.hm-meet-tip { position:absolute; bottom:20px; left:0; right:0; text-align:center; font:700 13px/1 var(--ui); color:var(--ink-3); letter-spacing:.02em; }
.hm-meet-info { min-height:420px; display:flex; align-items:center; }
.hm-meet-title { font:800 13px/1 var(--ui); letter-spacing:.1em; text-transform:uppercase; }
.hm-meet-name { font-size:clamp(56px, 6.4cqi, 96px); line-height:.95; font-weight:540; letter-spacing:-.035em; margin:12px 0 10px; }
.hm-meet-vibe { font:700 15px/1.4 var(--ui); color:var(--ink-3); margin-bottom:18px; }
.hm-meet-bio { font-size:19px; line-height:1.6; color:var(--ink-2); max-width:30em; }
.hm-meet-label { margin-top:24px; font:800 12px/1 var(--ui); letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); }
.hm-tags { list-style:none; padding:0; margin:12px 0 0; display:flex; flex-wrap:wrap; gap:8px; }
.hm-tags li { font:700 14px/1 var(--ui); padding:10px 14px; border-radius:999px; }
.hm-quote { margin-top:26px; padding:4px 0 4px 18px; border-left:3px solid; font:600 italic clamp(20px, 1.7cqi, 24px)/1.4 var(--display); font-variation-settings:"SOFT" 100; color:var(--ink); }
.hm-tray { display:flex; justify-content:center; flex-wrap:wrap; gap:10px; }
.hm-tray-btn { display:flex; flex-direction:column; align-items:center; gap:8px; width:96px; padding:10px 6px 12px; border-radius:24px; transition:background-color .25s, transform .25s var(--ease); }
.hm-tray-btn:hover { background:rgba(31,22,64,.04); transform:translateY(-3px); }
.hm-tray-img { width:62px; transition:transform .35s var(--ease); }
.hm-tray-btn.is-on { background:#fff; box-shadow:0 0 0 2px var(--ring) inset, 0 12px 24px -16px rgba(31,22,64,.45); }
.hm-tray-btn.is-on .hm-tray-img { transform:scale(1.1) translateY(-2px); }
.hm-tray-name { font:700 14px/1 var(--ui); color:var(--ink-2); }

/* D. human */
.hm-human { background:linear-gradient(180deg, var(--cream), #FFF1EA 50%, var(--cream)); overflow:hidden; }
.hm-human-grid { display:grid; grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr); gap:64px; align-items:center; }
.hm-human-copy .hm-h2 { max-width:9em; }
.hm-human-copy .hm-h2 em { background:linear-gradient(100deg,#FF7A59,#FF5FA2); -webkit-background-clip:text; background-clip:text; color:transparent; padding-right:.06em; }
.hm-thoughts { display:flex; flex-wrap:wrap; justify-content:center; gap:14px 12px; padding:10px 0; }
.hm-thought { display:block; border-radius:999px; }
.hm-thought-tilt { display:block; transform:rotate(var(--rot)) translateY(var(--dy)); }
.hm-thought-pill { display:inline-flex; min-height:46px; align-items:center; padding:0 20px; border-radius:999px; background:#fff; font:700 15px/1.2 var(--ui); color:var(--ink); box-shadow:0 0 0 1px rgba(31,22,64,.07) inset, 0 12px 24px -16px rgba(31,22,64,.4); }
.hm-thought:nth-child(3n+1) .hm-thought-pill { background:#FFF4FA; }
.hm-thought:nth-child(3n+2) .hm-thought-pill { background:#F3F8FF; }
.hm-thought:disabled { cursor:default; }
.hm-thoughts-foot { margin-top:22px; display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap; }
.hm-thoughts-zuzu { width:64px; flex:none; }
.hm-thoughts-status { font:600 italic 20px/1.3 var(--display); font-variation-settings:"SOFT" 100; color:var(--ink); }

/* E. discover */
.hm-how { background:var(--cream); }
.hm-path { position:relative; display:flex; flex-direction:column; gap:72px; }
.hm-spine { position:absolute; left:50%; top:40px; bottom:40px; width:3px; margin-left:-1.5px; background:rgba(31,22,64,.08); border-radius:3px; overflow:hidden; }
.hm-spine span { position:absolute; inset:0; transform-origin:top; background:linear-gradient(180deg,#FFB8DA,#B79CFF 50%,#86D3FF); }
.hm-station { position:relative; display:grid; grid-template-columns:minmax(0,1fr) 140px minmax(0,1fr); gap:40px; align-items:center; }
.hm-station-node { grid-column:2; grid-row:1; width:120px; justify-self:center; position:relative; z-index:2; }
.hm-station-copy { grid-column:1; grid-row:1; text-align:right; justify-self:end; max-width:440px; }
.hm-station-vis { grid-column:3; grid-row:1; justify-self:start; width:100%; max-width:380px; }
.hm-station.is-flip .hm-station-copy { grid-column:3; text-align:left; justify-self:start; }
.hm-station.is-flip .hm-station-vis { grid-column:1; justify-self:end; }
.hm-station-verb { font:800 13px/1 var(--ui); letter-spacing:.12em; text-transform:uppercase; }
.hm-vig-frame { position:relative; border-radius:32px; aspect-ratio:16 / 10; overflow:hidden; box-shadow:0 0 0 1px rgba(31,22,64,.05) inset; }
.hm-vig { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.hm-vig-pause span { position:absolute; width:34%; aspect-ratio:1; border-radius:50%; border:2px solid; opacity:0; animation:hm-ripple 4.2s ease-out infinite; }
@keyframes hm-ripple { 0% { transform:scale(.4); opacity:.0 } 15% { opacity:.7 } 100% { transform:scale(2.1); opacity:0 } }
.hm-vig-pause em { font:600 italic 20px/1 var(--display); font-variation-settings:"SOFT" 100; color:var(--ink-2); }
.hm-vig-type { font:700 22px/1.2 var(--body); color:var(--ink); background:#fff; padding:16px 20px; border-radius:20px 20px 20px 6px; box-shadow:0 14px 30px -18px rgba(31,22,64,.45); display:inline-flex; align-items:center; gap:2px; min-width:60%; min-height:58px; }
.hm-vig-type i { width:2px; height:1.1em; margin-left:2px; animation:hm-caret 1s steps(1) infinite; }
@keyframes hm-caret { 50% { opacity:0 } }
.hm-vig-release span { position:absolute; left:50%; bottom:12%; transform:translateX(-50%); font:700 15px/1 var(--ui); background:#fff; color:var(--ink); padding:12px 16px; border-radius:999px; box-shadow:0 10px 20px -12px rgba(31,22,64,.4); white-space:nowrap; animation:hm-rise 5.2s ease-in infinite; }
.hm-vig-release span:nth-child(2) { animation-delay:2.6s; }
@keyframes hm-rise { 0% { transform:translate(-50%,0) scale(1); opacity:0 } 10% { opacity:1 } 70% { opacity:1 } 100% { transform:translate(-50%,-150px) scale(.7); opacity:0 } }
.hm-vig-reframe { perspective:600px; }
.hm-vig-reframe span { font:600 italic clamp(20px, 1.9cqi, 26px)/1.2 var(--display); font-variation-settings:"SOFT" 100; padding:16px 22px; border-radius:18px; background:#fff; box-shadow:0 14px 30px -18px rgba(31,22,64,.45); }
.hm-vig-reframe .is-old { color:var(--ink-3); text-decoration:line-through; text-decoration-color:rgba(31,22,64,.35); }
.hm-vig-reframe .is-new { color:var(--ink); }
.hm-vig-reflect svg { width:78%; height:auto; overflow:visible; }
.hm-star { animation:hm-twinkle 2.5s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
@keyframes hm-twinkle { 0%,100% { opacity:.35 } 50% { opacity:1 } }

/* F. join */
.hm-join { background:linear-gradient(180deg, var(--cream), #F5EEFF); overflow:hidden; }
.hm-join-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,460px); gap:72px; align-items:center; z-index:1; }
.hm-perks { list-style:none; padding:0; margin:30px 0 0; display:grid; gap:18px; }
.hm-perks li { display:flex; gap:16px; align-items:center; }
.hm-perks li > span:last-child { font-size:17px; line-height:1.5; color:var(--ink-2); }
.hm-perks strong { display:block; font:800 16px/1.3 var(--ui); color:var(--ink); margin-bottom:2px; }
.hm-perk-img { width:54px; flex:none; }
.hm-join-copy .hm-h2 em { font-style:italic; background:linear-gradient(100deg,#8E6BFF,#FF6FB5); -webkit-background-clip:text; background-clip:text; color:transparent; padding-right:.06em; }
.hm-remember { margin-top:28px; }
.hm-switch { display:flex; gap:14px; align-items:flex-start; text-align:left; padding:16px 18px; border-radius:20px; background:rgba(255,255,255,.75); box-shadow:0 0 0 1px rgba(31,22,64,.08) inset; max-width:460px; }
.hm-switch-track { flex:none; position:relative; width:46px; height:28px; border-radius:999px; background:rgba(31,22,64,.18); transition:background .25s; margin-top:2px; }
.hm-switch-thumb { position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(31,22,64,.3); transition:transform .3s var(--ease); }
.hm-switch[aria-checked="true"] .hm-switch-track { background:#7C5CFF; }
.hm-switch[aria-checked="true"] .hm-switch-thumb { transform:translateX(18px); }
.hm-remember-text { font:500 15px/1.45 var(--body); color:var(--ink-2); }
.hm-remember-text strong { display:block; font:800 15px/1.3 var(--ui); color:var(--ink); margin-bottom:3px; }
.hm-join-card { background:rgba(255,255,255,.88); border-radius:40px; padding:40px 36px 32px; box-shadow:0 40px 80px -40px rgba(70,40,140,.35), 0 0 0 1px rgba(31,22,64,.06); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }

/* auth panel (inline + sheet) */
.hm-auth { display:flex; flex-direction:column; align-items:center; text-align:center; }
.hm-auth-mascot { width:96px; margin:-4px 0 10px; animation:hm-float 5s ease-in-out infinite; }
.hm-auth-title { font-family:var(--display); font-variation-settings:"SOFT" 100; font-size:32px; line-height:1.1; font-weight:540; letter-spacing:-.015em; color:var(--ink); }
.hm-auth-sub { margin-top:10px; font:500 16px/1.5 var(--body); color:var(--ink-2); max-width:24em; }
.hm-auth-btns { width:100%; display:grid; gap:10px; margin-top:24px; }
.hm-auth-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:12px; min-height:54px; border-radius:16px; font:700 16px/1 var(--ui); color:var(--ink); background:#fff; box-shadow:0 0 0 1.5px rgba(31,22,64,.13) inset; transition:box-shadow .2s, transform .2s var(--ease); }
.hm-auth-btn:hover { box-shadow:0 0 0 1.5px rgba(31,22,64,.3) inset, 0 10px 20px -14px rgba(31,22,64,.4); transform:translateY(-1px); }
.hm-auth-btn:disabled { opacity:.6; cursor:progress; transform:none; }
.hm-auth-btn svg { width:20px; height:20px; flex:none; }
.hm-auth-apple { background:#000; color:#fff; box-shadow:none; }
.hm-auth-apple:hover { box-shadow:0 10px 20px -12px rgba(0,0,0,.6); }
.hm-auth-status { width:100%; }
.hm-auth-msg { margin-top:14px; font:600 14px/1.45 var(--ui); color:var(--ink); background:#F3EDFF; padding:12px 14px; border-radius:14px; }
.hm-auth-msg.is-setup { background:#FFF2D6; color:#5A3B00; }
.hm-auth-switch { margin-top:18px; font:600 15px/1.4 var(--ui); color:var(--ink-2); }
.hm-auth-note { margin-top:14px; font:500 14px/1.5 var(--body); color:var(--ink-3); max-width:26em; }
.hm-auth-legal { margin-top:10px; font:500 13px/1.5 var(--body); color:var(--ink-3); }
.hm-auth-legal a { text-decoration:underline; text-underline-offset:2px; }

/* sheet */
.hm-sheet-wrap { position:fixed; inset:0; z-index:2147483000; display:flex; align-items:center; justify-content:center; padding:16px; }
.hm-sheet-backdrop { position:absolute; inset:0; background:rgba(31,22,64,.42); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
.hm-sheet { position:relative; width:100%; max-width:460px; max-height:calc(100% - 8px); overflow:auto; overscroll-behavior:contain; background:linear-gradient(180deg,#FFFFFF,#FBF6FF); border-radius:36px; padding:36px 32px 28px; box-shadow:0 40px 100px -30px rgba(31,22,64,.6); }
.hm-sheet-close { position:absolute; top:12px; right:12px; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--ink-2); background:rgba(31,22,64,.05); }
.hm-sheet-close svg { width:18px; height:18px; }
@media (max-width:560px) {
  .hm-sheet-wrap { align-items:flex-end; padding:0; }
  .hm-sheet { max-width:none; border-radius:30px 30px 0 0; padding:30px 20px calc(24px + env(safe-area-inset-bottom)); max-height:92vh; }
}

/* G. finale */
.hm-finale { position:relative; overflow:hidden; padding:150px 0 0; color:#FFF8F3; text-align:center; background:radial-gradient(90% 60% at 50% 100%, #FFB3D4 0%, #C88DE8 28%, rgba(96,70,180,0) 62%), linear-gradient(180deg, #1E1645 0%, #352773 45%, #5C44A8 100%); }
.hm-finale-stars { position:absolute; inset:0; opacity:.7; background-image:radial-gradient(1.5px 1.5px at 12% 18%, #fff, transparent), radial-gradient(1px 1px at 28% 42%, #fff, transparent), radial-gradient(1.5px 1.5px at 46% 12%, #fff, transparent), radial-gradient(1px 1px at 64% 30%, #fff, transparent), radial-gradient(1.5px 1.5px at 82% 16%, #fff, transparent), radial-gradient(1px 1px at 90% 46%, #fff, transparent), radial-gradient(1px 1px at 8% 52%, #fff, transparent), radial-gradient(1.2px 1.2px at 56% 48%, #fff, transparent); animation:hm-twinkle 6s ease-in-out infinite; }
.hm-finale-in { position:relative; z-index:2; }
.hm-finale-title { font-size:clamp(48px, 7.4cqi, 112px); line-height:.98; font-weight:500; letter-spacing:-.03em; text-wrap:balance; }
.hm-finale-sub { margin:22px auto 36px; font-size:clamp(18px, 1.5cqi, 22px); line-height:1.5; color:rgba(255,248,243,.86); max-width:28em; }
.hm-horizon { position:absolute; left:-10%; right:-10%; bottom:-120px; height:300px; border-radius:50%; background:radial-gradient(closest-side, rgba(255,240,248,.95), rgba(255,214,234,.6) 55%, rgba(255,214,234,0)); z-index:1; }
.hm-row { position:relative; z-index:2; display:flex; justify-content:center; align-items:flex-end; gap:clamp(4px, 1.4cqi, 22px); padding:72px var(--gutter) 0; margin-bottom:-2px; }
.hm-row-m { width:clamp(64px, 11cqi, 150px); transform-origin:50% 100%; }
.hm-row-m:nth-child(4) { width:clamp(80px, 13.5cqi, 180px); }

/* footer */
.hm-footer { background:var(--cream); padding:56px 0 40px; position:relative; z-index:3; }
.hm-footer-in { display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; padding-bottom:28px; border-bottom:1px solid var(--line); margin-bottom:22px; }
.hm-footer-brand img { width:200px; }
.hm-footer-brand p { margin-top:10px; font:600 italic 18px/1.3 var(--display); font-variation-settings:"SOFT" 100; color:var(--ink-2); }
.hm-footer-links { display:flex; flex-wrap:wrap; gap:4px 8px; }
.hm-footer-links a { font:700 15px/1 var(--ui); color:var(--ink-2); text-decoration:none; padding:14px 10px; border-radius:10px; }
.hm-footer-links a:hover { color:var(--ink); }
.hm-footer-fine { font:500 14px/1.6 var(--body); color:var(--ink-3); max-width:60em; }
.hm-footer-fine + .hm-footer-fine { margin-top:8px; }

/* ------------------------------------------------------------ responsive */
@container hm (max-width: 1100px) {
  .hm > * { --gutter:32px; }
  .hm-nav-links a { padding:12px 10px; font-size:14px; }
  .hm-play-stage { grid-template-columns:minmax(0,.6fr) minmax(220px,280px) minmax(0,1fr); gap:4px 18px; }
}
@container hm (max-width: 900px) {
  .hm > * { --gutter:24px; }
  .hm-section { padding:96px 0; }
  .hm-hero-grid { grid-template-columns:1fr; gap:8px; justify-items:center; text-align:center; }
  .hm-hero-copy { display:flex; flex-direction:column; align-items:center; max-width:640px; }
  .hm-hero .hm-cta-row { justify-content:center; }
  .hm-stage { max-width:540px; }
  .hm.has-fixed-nav .hm-hero { padding-top:120px; }
  .hm-play-stage { grid-template-columns:1fr; grid-template-rows:auto auto auto; justify-items:center; }
  .hm-play-cloud { grid-column:1; grid-row:1; }
  .hm-play-mallow { grid-column:1; grid-row:2; max-width:250px; }
  .hm-say { grid-column:1; grid-row:3; min-height:96px; justify-content:center; }
  .hm-say-bubble { text-align:center; max-width:440px; }
  .hm-say-bubble::before { left:50%; top:-7px; transform:translateX(-50%) rotate(45deg); }
  .hm-meet-grid { grid-template-columns:1fr; grid-template-areas:'stage' 'tray' 'info'; gap:20px; }
  .hm-meet-stage { max-width:620px; width:100%; margin:0 auto; }
  .hm-meet-info { min-height:0; justify-content:center; text-align:center; }
  .hm-meet-info .hm-tags { justify-content:center; }
  .hm-meet-bio { margin:0 auto; }
  .hm-quote { border-left:0; padding:0; }
  .hm-meet-info { margin-top:12px; }
  .hm-human-grid { grid-template-columns:1fr; gap:40px; text-align:center; }
  .hm-human-copy { display:flex; flex-direction:column; align-items:center; }
  .hm-human-copy .hm-h2 { max-width:none; }
  .hm-human-copy .hm-body { max-width:34em; }
  .hm-join-grid { grid-template-columns:1fr; gap:44px; justify-items:center; }
  .hm-mates-grid { grid-template-columns:1fr; gap:24px; justify-items:center; }
  .hm-mates-copy { display:flex; flex-direction:column; align-items:center; text-align:center; }
  .hm-mates-copy .hm-body { max-width:34em; }
  .hm-mates-card { align-items:center; text-align:center; }
  .hm-mates-points { justify-content:center; }
  .hm-mates-scene { order:-1; max-width:460px; aspect-ratio:1 / .62; }
  .hm-mates-path { top:6%; }
  .hm-mates-bubble { top:10%; }
  .hm-join-copy { text-align:center; display:flex; flex-direction:column; align-items:center; }
  .hm-perks { text-align:left; max-width:460px; }
  .hm-join-card { width:100%; max-width:480px; }
  .hm-spine { left:52px; }
  .hm-station, .hm-station.is-flip { grid-template-columns:104px minmax(0,1fr); gap:10px 24px; align-items:start; }
  .hm-station-node { grid-column:1; grid-row:1 / span 2; width:88px; margin-top:4px; }
  .hm-station-copy, .hm-station.is-flip .hm-station-copy { grid-column:2; grid-row:1; text-align:left; justify-self:start; }
  .hm-station-vis, .hm-station.is-flip .hm-station-vis { grid-column:2; grid-row:2; justify-self:start; max-width:420px; }
  .hm-path { gap:56px; }
}
@container hm (max-width: 1000px) {
  .hm-nav-links { display:none; }
}
@container hm (max-width: 600px) {
  .hm > * { --gutter:20px; }
  .hm-section { padding:80px 0; }
  .hm-hero { padding:40px 0 64px; }
  .hm.has-fixed-nav .hm-hero { padding-top:96px; }
  .hm-h1 { font-size:clamp(36px, 10.6cqi, 52px); margin:16px 0 16px; letter-spacing:-.02em; }
  .hm-h2 { font-size:clamp(31px, 8.8cqi, 42px); }
  .hm-lead { font-size:17px; }
  .hm-sub { font-size:17px; }
  .hm-body { font-size:17px; }
  .hm-head { margin-bottom:36px; }
  .hm-hero .hm-cta-row { margin-top:24px; width:100%; flex-direction:column; align-items:stretch; gap:6px; }
  .hm-hero .hm-cta-row .hm-btn-primary { width:100%; }
  .hm-hero .hm-cta-row .hm-btn-ghost { min-height:44px; background:none; box-shadow:none; backdrop-filter:none; -webkit-backdrop-filter:none; font-size:16px; text-decoration:underline; text-underline-offset:4px; text-decoration-color:rgba(31,22,64,.3); }
  .hm-hero .hm-long { display:none; }
  .hm-hero-note { margin-top:16px; }
  .hm-caption { font-size:16px; padding:11px 14px 12px; border-radius:18px; }
  .hm-caption-zone { left:12%; right:12%; top:6%; }
  .hm-lab { border-radius:32px; min-height:0; }
  .hm-pick { min-height:0; padding:36px 18px 34px; }
  .hm-pick-mallows { gap:4px; margin-bottom:24px; }
  .hm-pick-mallows > * { width:15%; max-width:60px; }
  .hm-pick-mallows > *:nth-child(4) { width:19%; max-width:76px; }
  .hm-pick-mallows > *:nth-child(3), .hm-pick-mallows > *:nth-child(5) { width:16%; max-width:66px; }
  .hm-chips { gap:10px; }
  .hm-chip { min-height:50px; padding:0 18px; font-size:15px; }
  .hm-play { padding:10px 14px 26px; min-height:0; }
  .hm-play-bar-pad { width:60px; }
  .hm-play-cloud { min-height:170px; padding-top:34px; }
  .hm-play-bar .hm-textbtn { font-size:14px; padding:0 4px; }
  .hm-sat:nth-child(n+5) { display:none; }
  .hm-cloud-wrap { width:min(100%, 250px); }
  .hm-cloud { min-height:96px; padding:18px 20px; }
  .hm-cloud-text { font-size:21px; }
  .hm-sat-tab > span, .hm-sat-whatif > span, .hm-sat-ping > span { font-size:12px; padding:6px 9px; }
  .hm-play-mallow { max-width:210px; padding:20px; }
  .hm-say-bubble { font-size:17px; padding:14px 16px 16px; }
  .hm-play-controls { min-height:150px; }
  .hm-ctl-row { width:100%; }
  .hm-ctl-row .hm-btn { flex:1 1 auto; }
  .hm-done .hm-ctl-row .hm-btn { width:100%; white-space:normal; text-align:center; line-height:1.2; }
  .hm-meet-stage { border-radius:34px; aspect-ratio:1 / .95; }
  .hm-meet-fig { width:56%; }
  .hm-meet-say { left:6%; right:6%; top:4%; }
  .hm-peek { width:14%; bottom:10%; opacity:.5; }
  .hm-peek-l { left:3%; } .hm-peek-r { right:3%; }
  .hm-sense-row { padding-left:14px; }
  .hm-sense-row input { font-size:16px; }
  .hm-care-view { min-height:0; padding:36px 18px; }
  .hm-hero-support { font-size:clamp(21px, 6.2cqi, 26px); margin:-2px 0 14px; }
  .hm-lead-group { gap:8px; }
  .hm-hero-note { display:none; }
  .hm-stage { aspect-ratio:1 / .84; }
  .hm-caption-zone { top:2%; height:26%; }
  .hm-lead-group .hm-lead { font-size:16px; line-height:1.5; }
  .hm-ways { padding-top:72px; }
  .hm-ways-row { grid-template-columns:1fr; gap:6px; }
  .hm-way + .hm-way::before { left:20%; right:20%; top:0; bottom:auto; width:auto; height:1px; }
  .hm-way-link { padding:22px 8px; }
  .hm-way-art { height:84px; margin-bottom:4px; }
  .hm-way-art > * { width:80px; }
  .hm-way-art.is-pair > * { width:68px; }
  .hm-mates-card { padding:22px 18px; }
  .hm-mates-name { font-size:27px; }
  .hm-round { width:44px; height:44px; margin-top:-22px; }
  .hm-round-l { left:10px; } .hm-round-r { right:10px; }
  .hm-meet-bio { font-size:17px; }
  .hm-tray { gap:4px; }
  .hm-tray-btn { width:calc((100% - 12px) / 4); max-width:84px; padding:8px 2px 10px; border-radius:20px; }
  .hm-tray-img { width:50px; }
  .hm-tray-name { font-size:13px; }
  .hm-thought-pill { min-height:44px; padding:0 16px; font-size:14px; }
  .hm-thoughts { gap:10px 8px; }
  .hm-thoughts-status { font-size:18px; }
  .hm-spine { left:38px; }
  .hm-station, .hm-station.is-flip { grid-template-columns:76px minmax(0,1fr); gap:8px 16px; }
  .hm-station-node { width:68px; }
  .hm-vig-frame { border-radius:24px; }
  .hm-vig-type { font-size:18px; }
  .hm-join-card { padding:32px 20px 26px; border-radius:32px; }
  .hm-finale { padding-top:104px; }
  .hm-finale-title { font-size:clamp(40px, 12cqi, 60px); }
  .hm-finale .hm-cta-row { flex-direction:column; align-items:stretch; max-width:340px; margin:0 auto; }
  .hm-row { padding-top:56px; gap:2px; }
  .hm-row-m { width:13%; }
  .hm-row-m:nth-child(4) { width:16%; }
  .hm-footer-brand img { width:170px; }
}
@container hm (max-width: 380px) {
  .hm > * { --gutter:16px; }
  .hm-chips { display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; }
  .hm-chip { padding:6px 10px; min-height:52px; justify-content:center; font-size:14px; line-height:1.2; text-align:center; gap:7px; }
  .hm-chip-dot { width:9px; height:9px; flex:none; }
  .hm-long { display:none; }
  .hm-short { display:inline; }
  .hm-tray-btn { width:calc((100% - 12px) / 4); }
  .hm-tray-img { width:44px; }
  .hm-auth-title { font-size:28px; }
}

/* nav sizing follows the window when it is fixed (it lives outside the page container) */
@media (max-width: 1100px) { .hm-portal .hm-nav-in { padding:0 32px; } .hm-portal .hm-nav-links a { padding:12px 10px; font-size:14px; } }
@media (max-width: 900px) { .hm-portal .hm-nav-in { padding:0 24px; height:68px; } }
@media (max-width: 1000px) { .hm-portal .hm-nav-links { display:none; } }
@media (max-width: 600px) { .hm-portal .hm-nav-in { padding:0 20px; height:62px; gap:12px; } .hm-portal .hm-nav-logo img { width:140px; } .hm-portal .hm-nav-cta-long { display:none; } .hm-portal .hm-nav-cta-short { display:inline; } .hm-portal .hm-btn-sm { min-height:44px; padding:0 16px; } }
@media (max-width: 380px) { .hm-portal .hm-nav-in { padding:0 16px; } .hm-portal .hm-nav-logo img { width:124px; } .hm-portal .hm-nav-login { padding:0 4px; font-size:14px; } }
@container hm (max-width: 900px) { .hm-nav-in { height:68px; } }
@container hm (max-width: 600px) { .hm-nav-in { height:62px; gap:12px; } .hm-nav-logo img { width:140px; } .hm-nav-cta-long { display:none; } .hm-nav-cta-short { display:inline; } }

/* headline: revealed word by word; the squishy word shimmers like pearl */
.hm-rv { display:inline-block; }
.hm-rv-in { display:inline-block; animation:hm-rv 1.15s var(--ease) both; }
@keyframes hm-rv { 0% { opacity:0; transform:translateY(.42em) rotate(2.5deg) scale(.96); filter:blur(10px) } 55% { filter:blur(0) } 100% { opacity:1; transform:none; filter:none } }
.hm-h1 .hm-squishword { background:linear-gradient(100deg,#FF6FB5 0%,#A07BFF 26%,#48B8F5 50%,#C792FF 74%,#FF6FB5 100%); background-size:240% 100%; -webkit-background-clip:text; background-clip:text; color:transparent; animation:hm-pearl-text 10s ease-in-out infinite alternate; }
@keyframes hm-pearl-text { from { background-position:0% 50% } to { background-position:100% 50% } }
.hm-magic-dot { width:9px; height:9px; flex:none; border-radius:50%; background:conic-gradient(#FF8FC8,#A98BFF,#6CC6F5,#FF8FC8); box-shadow:0 0 10px rgba(169,139,255,.8); animation:hm-turn 4s linear infinite; }

/* hero atmosphere */
.hm-hero-grid { position:relative; z-index:1; }
.hm-atmos { position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
.hm-atmos-layer { position:absolute; inset:-60px; will-change:transform; }
.hm-pearl { position:absolute; left:64%; top:50%; width:1150px; height:1150px; margin:-575px 0 0 -575px; border-radius:50%; background:conic-gradient(from 0deg, rgba(255,184,218,.55), rgba(205,184,255,.5), rgba(175,226,255,.55), rgba(255,231,166,.45), rgba(255,184,218,.55)); -webkit-mask-image:radial-gradient(closest-side, #000 28%, transparent 100%); mask-image:radial-gradient(closest-side, #000 28%, transparent 100%); opacity:.8; animation:hm-turn 120s linear infinite; }
@keyframes hm-turn { to { transform:rotate(360deg) } }
.hm-spirals { position:absolute; pointer-events:none; animation:hm-turn 160s linear infinite; -webkit-mask-image:radial-gradient(closest-side, #000 52%, transparent 96%); mask-image:radial-gradient(closest-side, #000 52%, transparent 96%); }
.hm-spirals svg { width:100%; height:100%; display:block; overflow:visible; }
.hm-sp-line { fill:none; stroke-width:1.6; opacity:.24; }
.hm-sp-flow { fill:none; stroke-width:4; stroke-linecap:round; stroke-dasharray:2 26; opacity:.5; animation:hm-sp-flow 7s linear infinite; }
.hm-sp-flow-b { animation-delay:-3.5s; }
@keyframes hm-sp-flow { to { stroke-dashoffset:112 } }
.hm-hero-spirals { left:73%; top:50%; width:940px; height:940px; margin:-470px 0 0 -470px; }
.hm-motes { position:absolute; inset:0; width:100%; height:100%; display:block; }
.hm-floaters { position:absolute; inset:60px; }
.hm-floater { position:absolute; display:block; color:#fff; animation:hm-bob 10s ease-in-out infinite; }
.hm-floater svg { width:100%; height:100%; display:block; filter:drop-shadow(0 0 6px rgba(255,255,255,.9)); }
.hm-floater-heart { color:#FFB8DA; }
.hm-floater-bubble { border-radius:50%; background:radial-gradient(circle at 32% 30%, rgba(255,255,255,.95) 0 14%, rgba(255,255,255,.3) 26%, rgba(205,184,255,.18) 62%, rgba(175,226,255,.4) 100%); box-shadow:inset 0 0 0 1px rgba(255,255,255,.65), 0 6px 18px -8px rgba(120,90,200,.35); }
@keyframes hm-bob { 0%,100% { transform:translate3d(0,0,0) } 25% { transform:translate3d(6px,-14px,0) } 50% { transform:translate3d(-4px,-26px,0) } 75% { transform:translate3d(-8px,-10px,0) } }

/* section titles with a pearly second half */
.hm-try .hm-h2 em, .hm-meet .hm-h2 em, .hm-ways .hm-h2 em { font-style:italic; background:linear-gradient(100deg,#FF6FB5,#A07BFF 50%,#48B8F5); -webkit-background-clip:text; background-clip:text; color:transparent; padding-right:.06em; }

/* Mallow cards */
.hm-meet-card { position:relative; width:100%; padding:28px 28px 24px; border-radius:32px; background:linear-gradient(160deg, #FFFFFF 30%, var(--mc)); box-shadow:0 0 0 1px rgba(31,22,64,.06) inset, 0 30px 60px -44px var(--md); overflow:hidden; isolation:isolate; }
.hm-meet-card::before { content:""; position:absolute; right:-90px; top:-90px; width:240px; height:240px; border-radius:50%; background:radial-gradient(closest-side, var(--mg), transparent); opacity:.5; z-index:-1; animation:hm-glow-breathe 6s ease-in-out infinite; }
@keyframes hm-glow-breathe { 0%,100% { transform:scale(1); opacity:.4 } 50% { transform:scale(1.15); opacity:.65 } }
.hm-meet-card .hm-meet-name { margin:8px 0 4px; }
.hm-meet-purpose { font-family:var(--display); font-variation-settings:"SOFT" 100; font-style:italic; font-weight:500; font-size:clamp(20px, 1.8cqi, 24px); line-height:1.3; color:var(--ink); margin:2px 0 10px; text-wrap:balance; }
.hm-meet-card .hm-meet-bio { font-size:17px; }
.hm-meet-facts { margin:18px 0 0; display:grid; gap:14px; }
.hm-meet-facts dt { font:800 12px/1 var(--ui); letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); margin-bottom:7px; }
.hm-meet-facts dd { margin:0; font-size:16px; line-height:1.5; color:var(--ink-2); text-wrap:pretty; }
.hm-meet-facts dd strong { color:var(--ink); font-weight:800; }
.hm-meet-facts .hm-tags { margin:0; }
.hm-meet-cta { margin-top:22px; display:flex; flex-wrap:wrap; align-items:center; gap:8px 14px; }
.hm-share-btn { font-size:14.5px; color:var(--ink-2); }
.hm-done .hm-share-btn { margin-top:2px; }

/* the live moment's weather */
.hm-pick, .hm-play, .hm-care-view { position:relative; z-index:1; }
.hm-weather { position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
.hm-wx-now { position:absolute; inset:0; opacity:calc(.25 + .75 * var(--wl, 1)); transition:opacity 2.4s var(--ease); }
.hm-weather.is-settled .hm-wx-now { opacity:.1; }
.hm-wx-good.is-settled .hm-wx-now { opacity:1; }
.hm-wx-after { position:absolute; inset:0; opacity:0; transition:opacity 2.8s var(--ease); }
.hm-weather.is-settled .hm-wx-after { opacity:1; }
.hm-wx-spiral { left:50%; top:30%; width:900px; height:900px; margin:-450px 0 0 -450px; opacity:.6; animation-duration:70s; }
.hm-wx-overwhelmed .hm-wx-after { background:radial-gradient(60% 50% at 50% 32%, rgba(205,184,255,.5), transparent 70%); }
.hm-wx-streak { position:absolute; left:-30%; width:30%; height:2px; border-radius:2px; background:linear-gradient(90deg, transparent, #FF3DF2, #3EE8FF, transparent); opacity:.5; animation:hm-streak 1.8s linear infinite; }
@keyframes hm-streak { to { transform:translateX(460%) } }
.hm-wx-frustrated .hm-wx-after { background:radial-gradient(70% 45% at 50% 0%, rgba(62,232,255,.2), transparent 70%), radial-gradient(60% 45% at 50% 100%, rgba(255,61,242,.14), transparent 70%); }
.hm-wx-rain { position:absolute; top:-60px; width:2px; height:46px; border-radius:2px; background:linear-gradient(rgba(94,143,216,0), rgba(94,143,216,.55)); animation:hm-wx-fall 1.8s linear infinite; }
@keyframes hm-wx-fall { to { transform:translateY(1100px) } }
.hm-wx-low .hm-wx-after { background:radial-gradient(48% 60% at 50% 104%, transparent 61%, rgba(255,150,170,.3) 63%, rgba(255,210,120,.3) 66%, rgba(140,220,170,.26) 69%, rgba(120,190,255,.3) 72%, rgba(180,150,255,.26) 75%, transparent 78%); }
.hm-wx-ripple { position:absolute; left:50%; top:60%; width:200px; height:200px; margin:-100px 0 0 -100px; border-radius:50%; border:1.5px solid rgba(19,120,159,.4); opacity:0; animation:hm-wx-ripple 4.8s ease-out infinite; }
@keyframes hm-wx-ripple { 0% { transform:scale(.3); opacity:.8 } 100% { transform:scale(4.2); opacity:0 } }
.hm-wx-anxious .hm-wx-after { background:linear-gradient(180deg, transparent 50%, rgba(168,240,255,.4)); }
.hm-wx-fizz { position:absolute; bottom:-24px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #fff, rgba(255,143,163,.75) 60%, rgba(255,84,112,.45)); opacity:.6; animation:hm-wx-rise 3s ease-in infinite; }
@keyframes hm-wx-rise { 0% { transform:translate3d(0,0,0) } 50% { transform:translate3d(10px,-450px,0) } 100% { transform:translate3d(-6px,-960px,0) } }
.hm-wx-restless .hm-wx-after { background:radial-gradient(26px 34px at 24% 34%, rgba(255,200,90,.75), transparent), radial-gradient(22px 30px at 72% 24%, rgba(255,170,90,.7), transparent), radial-gradient(20px 26px at 58% 46%, rgba(255,220,120,.65), transparent), radial-gradient(60% 50% at 50% 30%, rgba(255,214,150,.25), transparent 70%); animation:hm-lanterns 9s ease-in-out infinite alternate; }
@keyframes hm-lanterns { to { transform:translateY(-24px) } }
.hm-wx-rays { position:absolute; left:50%; top:-55%; width:1500px; height:1500px; margin-left:-750px; border-radius:50%; background:repeating-conic-gradient(from 0deg, rgba(255,200,90,.26) 0deg 6deg, transparent 6deg 18deg); -webkit-mask-image:radial-gradient(closest-side, #000 18%, transparent 72%); mask-image:radial-gradient(closest-side, #000 18%, transparent 72%); animation:hm-turn 90s linear infinite; }
.hm-wx-glint { position:absolute; width:16px; height:16px; color:#FFB21E; animation:hm-twinkle 2.6s ease-in-out infinite; }
.hm-wx-glint svg { width:100%; height:100%; display:block; }
.hm-wx-good .hm-wx-after { background:radial-gradient(60% 50% at 50% 20%, rgba(255,214,107,.45), transparent 70%); }
.hm-wx-star { position:absolute; width:4px; height:4px; border-radius:50%; background:#8FA2D6; box-shadow:0 0 8px 2px rgba(143,162,214,.6); animation:hm-twinkle 3s ease-in-out infinite; }
.hm-wx-fog { position:absolute; left:-25%; right:-25%; top:46%; height:40%; background:radial-gradient(closest-side, rgba(255,255,255,.8), transparent); animation:hm-wx-drift 16s ease-in-out infinite alternate; }
.hm-wx-fog-b { top:14%; height:30%; animation-duration:22s; animation-direction:alternate-reverse; }
@keyframes hm-wx-drift { to { transform:translateX(12%) } }
.hm-wx-unsure .hm-wx-after { background:radial-gradient(80px 80px at 80% 16%, rgba(255,244,200,.95), rgba(255,244,200,.35) 55%, transparent 72%); }

/* toast */
.hm-toast { position:fixed; left:0; right:0; margin:0 auto; width:fit-content; max-width:min(92vw, 460px); bottom:calc(20px + env(safe-area-inset-bottom, 0px)); z-index:2147483001; padding:13px 18px; border-radius:16px; background:#1F1640; color:#FFF8F3; font:600 15px/1.4 var(--ui); text-align:center; box-shadow:0 18px 40px -16px rgba(31,22,64,.6); }

/* Moodspell */
.hm-ms { position:relative; overflow:hidden; color:#FFF8F3; background:radial-gradient(80% 60% at 75% 40%, rgba(110,79,184,.55), transparent 70%), radial-gradient(60% 60% at 10% 90%, rgba(255,143,200,.2), transparent 70%), linear-gradient(180deg, #1C1440, #2A1E5C 60%, #1C1440); }
.hm-ms-sky { position:absolute; inset:0; opacity:.55; background-image:radial-gradient(1.5px 1.5px at 12% 18%, #fff, transparent), radial-gradient(1px 1px at 28% 62%, #fff, transparent), radial-gradient(1.5px 1.5px at 46% 12%, #fff, transparent), radial-gradient(1px 1px at 64% 80%, #fff, transparent), radial-gradient(1.5px 1.5px at 86% 16%, #fff, transparent), radial-gradient(1px 1px at 92% 66%, #fff, transparent), radial-gradient(1px 1px at 6% 82%, #fff, transparent); animation:hm-twinkle 7s ease-in-out infinite; }
.hm-ms-grid { position:relative; z-index:1; display:grid; grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr); gap:56px; align-items:center; }
.hm-ms .hm-h2 { color:#FFF8F3; }
.hm-ms .hm-h2 em { display:block; font-style:italic; font-weight:460; font-size:.62em; line-height:1.15; margin-top:.25em; background:linear-gradient(100deg,#FFB8DA,#CDB8FF 50%,#AFE2FF); -webkit-background-clip:text; background-clip:text; color:transparent; }
.hm-ms .hm-body { color:rgba(255,248,243,.84); }
.hm-eyebrow-light { color:rgba(255,248,243,.85); }
.hm-soon-tag-light { color:#2A1E5C; background:#E6DBFF; }
.hm-ms-label { margin-top:24px; font:800 12px/1 var(--ui); letter-spacing:.1em; text-transform:uppercase; color:rgba(255,248,243,.7); }
.hm-ms-points { list-style:none; padding:0; margin:12px 0 0; display:flex; flex-wrap:wrap; gap:8px; }
.hm-ms-points li { font:700 13.5px/1 var(--ui); color:#FFF8F3; background:rgba(255,255,255,.1); box-shadow:inset 0 0 0 1px rgba(255,255,255,.16); padding:10px 13px; border-radius:999px; }
.hm-ms-screen { position:relative; aspect-ratio:16 / 10; border-radius:32px; overflow:hidden; background:#120C2C; isolation:isolate; box-shadow:0 0 0 1px rgba(255,255,255,.08) inset, 0 40px 90px -30px rgba(0,0,0,.6), 0 0 90px -20px rgba(169,139,255,.5); }
.hm-ms-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; background:#120C2C; }
.hm-ms-preview { position:absolute; inset:0; overflow:hidden; }
.hm-ms-pearl { position:absolute; left:50%; top:50%; width:900px; height:900px; margin:-450px 0 0 -450px; border-radius:50%; background:conic-gradient(rgba(255,143,200,.38), rgba(169,139,255,.42), rgba(108,198,245,.36), rgba(255,231,166,.26), rgba(255,143,200,.38)); -webkit-mask-image:radial-gradient(closest-side, #000 20%, transparent 100%); mask-image:radial-gradient(closest-side, #000 20%, transparent 100%); animation:hm-turn 60s linear infinite; }
.hm-ms-spirals { left:50%; top:50%; width:820px; height:820px; margin:-410px 0 0 -410px; animation-duration:90s; }
.hm-ms-noomi { position:absolute; left:35%; width:30%; top:22%; filter:drop-shadow(0 0 34px rgba(255,244,200,.45)); }
.hm-ms-words { position:absolute; left:0; right:0; bottom:9%; height:1.3em; text-align:center; font-family:var(--display); font-variation-settings:"SOFT" 100; font-style:italic; font-weight:500; font-size:clamp(20px, 2.3cqi, 32px); line-height:1.2; color:#FFF8F3; text-shadow:0 2px 18px rgba(18,12,44,.7); }
.hm-ms-words span { position:absolute; left:0; right:0; opacity:0; animation:hm-ms-word 8s ease-in-out infinite; }
.hm-ms-words span:nth-child(2) { animation-delay:4s; }
@keyframes hm-ms-word { 0% { opacity:0; transform:translateY(8px); filter:blur(6px) } 12%,42% { opacity:1; transform:none; filter:none } 54%,100% { opacity:0; transform:translateY(-6px); filter:blur(6px) } }
.hm-ms-screen.is-paused *, .hm-ms-screen.is-paused *::before, .hm-ms-screen.is-paused *::after { animation-play-state:paused !important; }
.hm-ms-screen.is-paused .hm-ms-words span { position:static; display:inline; animation:none; opacity:1; filter:none; transform:none; }
.hm-ms-badge { position:absolute; left:16px; top:16px; z-index:2; font:800 11.5px/1 var(--ui); letter-spacing:.08em; text-transform:uppercase; color:#FFF8F3; background:rgba(18,12,44,.6); padding:8px 10px; border-radius:999px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.18); }
.hm-ms-controls { position:absolute; right:14px; bottom:14px; z-index:2; display:flex; gap:8px; }
.hm-ms-ctl { display:inline-flex; align-items:center; gap:7px; min-height:44px; padding:0 14px; border-radius:999px; color:#FFF8F3 !important; background:rgba(18,12,44,.66) !important; box-shadow:inset 0 0 0 1px rgba(255,255,255,.22); font:700 14px/1 var(--ui) !important; }
.hm-ms-ctl svg { width:16px; height:16px; flex:none; }
.hm-ms-ctl:hover { background:rgba(18,12,44,.85) !important; }
.hm-ms-caption { margin-top:14px; font:500 14.5px/1.5 var(--body); color:rgba(255,248,243,.78); text-align:center; text-wrap:pretty; }
.hm-ms :focus-visible { outline-color:#CDB8FF; }

/* finale */
.hm-finale-kicker { font-family:var(--display); font-variation-settings:"SOFT" 100; font-style:italic; font-weight:450; font-size:clamp(22px, 2.4cqi, 32px); line-height:1.2; color:rgba(255,248,243,.86); margin-bottom:12px; }

@container hm (max-width: 900px) {
  .hm-pearl { left:50%; top:72%; width:900px; height:900px; margin:-450px 0 0 -450px; }
  .hm-hero-spirals { left:50%; top:74%; width:820px; height:820px; margin:-410px 0 0 -410px; }
  .hm-ms-grid { grid-template-columns:1fr; gap:28px; }
  .hm-ms-copy { text-align:center; display:flex; flex-direction:column; align-items:center; }
  .hm-ms-copy .hm-body { max-width:34em; }
  .hm-ms-points { justify-content:center; }
  .hm-meet-card { text-align:left; }
}
@container hm (max-width: 600px) {
  .hm-floaters { inset:40px 20px; }
  .hm-hero-spirals { width:640px; height:640px; margin:-320px 0 0 -320px; }
  .hm-meet-card { padding:22px 18px 20px; border-radius:26px; }
  .hm-meet-cta .hm-btn { width:100%; }
  .hm-meet-cta { justify-content:center; }
  .hm-ms-screen { aspect-ratio:4 / 5; border-radius:26px; }
  .hm-ms-video { object-fit:contain; }
  .hm-ms-noomi { left:27%; width:46%; top:24%; }
  .hm-ms-words { bottom:8%; }
  .hm-ms-ctl span { display:none; }
  .hm-ms-ctl { padding:0 13px; }
  .hm-wx-spiral { width:700px; height:700px; margin:-350px 0 0 -350px; }
}

@media (prefers-reduced-motion: reduce) {
  .hm-ms-words span { position:static !important; display:inline !important; animation:none !important; opacity:1 !important; filter:none !important; transform:none !important; }
  .hm-rv-in { animation:none !important; }
  .hm *, .hm-portal * { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; scroll-behavior:auto !important; }
}
`
