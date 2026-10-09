// ===================================================================================
// EOS · 52 REWARDS — pay the ritual, celebrate the shift (docs/EOS_SPEC.md §9.1-§9.5, §0.2, §5.2 F6).
// Public: EOS_REWARDS_SKILLS, eosGrantForShift, eosBondFor, eosSkillFor, eosWeek, eosMyStats,
//         EosWorldChips, EosOrbShelf, eosMakeShareCard, EosShareButton, EOS_REWARDS_CSS
//         (+ eosExpose("rewards", {grantForShift, …})).
// Mounted by integration I2-E2 as a direct child of section.releaseStage: <EosWorldChips stage reduced />
// (it renders the ◉ / ☀ chips and, as a sibling, the EosOrbShelf sheet). The shift meter calls
// eosApi("rewards").grantForShift?.(shift) once per rated / skipped loop and renders EosShareButton.
// Rules kept here: rewards come from completing the loop, never from the size of Δ; 5 orbs per local day;
// no streak that can break, no denominators, no speed records; nothing the user typed is stored, drawn or
// shared; "Don't keep history" ⇒ no orb / session rows are written (this app session keeps them in memory).
// Release 1: skills / captions that mention games 115-120 simply skip them (only registered GAMES are named).
// ===================================================================================

const EOS_REWARDS_KEY = "eos_rewards_v1" // ledger {v, skills{}, games[], emos[], granted[], miles[]} (numbers + ids only)
const EOS_REWARDS_DAY_CAP = 5
const EOS_REWARDS_ORB_CAP = 400
const EOS_REWARDS_BOND_LEVELS = [1, 3, 6, 10, 15]
const EOS_REWARDS_DAY_MILES = [3, 10, 30, 100]
const EOS_REWARDS_CHARS = ["still", "sync", "rush", "glitch", "loopie", "drop", "patch"]
const EOS_REWARDS_CHAR_HUE = { still: 46, sync: 192, rush: 8, glitch: 268, loopie: 318, drop: 218, patch: 32 }
const EOS_REWARDS_SENSITIVE = new Set(["shame", "lonely", "sad", "fear"])
const EOS_REWARDS_BOND_LINES = {
    rush: "learned to laugh it off",
    sync: "can nap through thunder",
    glitch: "found the off switch",
    loopie: "can stop the spin",
    drop: "knows rain ends",
    patch: "is kinder to PATCH",
    still: "is proud of you",
}
// Ranks: Rookie 1 → Steady 5 → Pilot 15 → Master 40 (loops that used the skill, any emotion incl. GOOD / NOT SURE).
const EOS_REWARDS_RANKS = [
    { id: "rookie", label: "ROOKIE", at: 1 },
    { id: "steady", label: "STEADY", at: 5 },
    { id: "pilot", label: "PILOT", at: 15 },
    { id: "master", label: "MASTER", at: 40 },
]
// Skills by MECHANISM (§9.2). ids = the spec's games (115-120 are release 2 and never match until registered);
// families = the arcade family fallback so every one of the 110 classic games trains a skill;
// moment = the reveal's Still Moment variant that also counts.
const EOS_REWARDS_SKILLS = [
    { id: "sigh", name: "SIGH", glyph: "≈", hue: 192, ids: [111, 109, 65], moment: "sigh", families: ["Release"], can: "you know the double-sip sigh" },
    { id: "cool", name: "COOL-DOWN", glyph: "❄", hue: 176, ids: [112, 36, 44, 77], moment: "cool", families: ["Destroy"], can: "you let it out, then cool it down" },
    { id: "ground", name: "GROUNDING", glyph: "⚓", hue: 140, ids: [113, 102, 66, 80], families: ["Balance"], can: "you can land in the here and now" },
    { id: "kind", name: "KIND-VOICE", glyph: "♥", hue: 342, ids: [115, 114], moment: "heart", families: ["Reframe"], can: "you talk to yourself like a friend" },
    { id: "loop", name: "LOOP-BREAKER", glyph: "↻", hue: 286, ids: [116, 61, 43, 41, 34, 22, 29, 99], families: ["Interrupt", "Absurdity"], can: "you turn a loop into a squeak" },
    { id: "spark", name: "SPARK", glyph: "✦", hue: 48, ids: [117, 68, 1], moment: "spark", families: ["Rhythm"], can: "you start before you feel like it" },
    { id: "space", name: "SPACE", glyph: "◌", hue: 205, ids: [120, 93, 95, 21, 87], families: ["Distance", "Discard", "Detach", "Sort"], can: "you make space" },
    { id: "glow", name: "OWN-GLOW", glyph: "☼", hue: 36, ids: [119, 47], families: ["Choice"], can: "you find your own glow" },
    { id: "brave", name: "BRAVE-LOOK", glyph: "◎", hue: 256, ids: [118, 31, 97], families: ["Reveal"], can: "you look closer" },
]
const EOS_REWARDS_SKILL = Object.fromEntries(EOS_REWARDS_SKILLS.map((s) => [s.id, s]))
// Cosmetic Thought-Dust styles (rendered by the dots module from eos_prefs_v1.dust), unlocked by lifetime ⚡.
const EOS_REWARDS_DUST = [
    { id: "default", label: "starlight", at: 0, dots: ["#7de3ff", "#a98bff", "#ffd36b", "#ff8bd8"] },
    { id: "fireflies", label: "fireflies", at: 250, dots: ["#fff3a0", "#ffd04a", "#ffb23e", "#fff3a0"] },
    { id: "aurora", label: "aurora", at: 1000, dots: ["#5cffc8", "#3fe6ff", "#a98bff", "#5cffc8"] },
    { id: "snow", label: "snow", at: 2500, dots: ["#ffffff", "#e6f2ff", "#cfe6ff", "#ffffff"] },
    { id: "gold", label: "gold", at: 5000, dots: ["#ffe58a", "#ffb23e", "#ff8a2e", "#ffe58a"] },
]
const EOS_REWARDS_VERB = {
    panic: "Slowed it all down",
    anger: "Cooled it down",
    anxiety: "Found my feet",
    overthinking: "Stopped the spin",
    overwhelm: "Made some space",
    sad: "Made it a little lighter",
    lonely: "Found a little warmth",
    shame: "Was kinder to myself",
    fear: "Got a little braver",
    jealous: "Found my own glow",
    numb: "Woke the colour back up",
    good: "Banked a good moment",
}
const EOS_REWARDS_FONT = `"Baloo 2","Nunito",system-ui,sans-serif`

// ---------------------------------------------------------------- memory + change bus
// keepHistory off ⇒ orbs / bonds / ledger live here for this app session only (never in localStorage).
const EOS_REWARDS_MEM = { orbs: [], bonds: {}, ledger: null, results: new Map(), moment: null, lastGrantAt: 0, capIdx: -1 }
const EOS_REWARDS_DEV = { grants: [], lastCard: null, lastCaption: null, errors: [] }
const EOS_REWARDS_BUS = (() => {
    let rev = 0
    const subs = new Set()
    return {
        get: () => rev,
        bump() {
            rev += 1
            subs.forEach((f) => {
                try {
                    f()
                } catch {}
            })
        },
        subscribe(f) {
            subs.add(f)
            return () => subs.delete(f)
        },
    }
})()
function eosRewardsLog(kind, data) {
    if (!eosIsDev()) return
    EOS_REWARDS_DEV.grants.push({ t: Date.now(), kind, ...(data || {}) })
    if (EOS_REWARDS_DEV.grants.length > 80) EOS_REWARDS_DEV.grants.shift()
}
function eosRewardsKeep() {
    return eosPrefs().keepHistory !== false
}
function eosRewardsRand(n, salt = 0) {
    let x = (Math.floor(Math.abs(Number(n) || 0)) % 2147483647) ^ Math.imul(salt + 1, 0x9e3779b1)
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
    x ^= x >>> 16
    return (x >>> 0) / 4294967296
}
function eosRewardsDayOf(t) {
    const n = Number(t)
    return Number.isFinite(n) && n > 0 ? eosToday(new Date(n)) : ""
}
function eosRewardsGame(id) {
    try {
        const n = Number(id) || 0
        return (typeof GAMES !== "undefined" && Array.isArray(GAMES) && GAMES.find((g) => Number(g && g.id) === n)) || null
    } catch {
        return null
    }
}
function eosRewardsEmoNoun(emo) {
    if (emo === "good") return "GOOD"
    const e = EOS_EMO[emo]
    return e ? String(e.noun || e.label).toUpperCase() : "ANY FEELING"
}

// ---------------------------------------------------------------- storage readers (stored ∪ memory)
function eosRewardsOrbs() {
    const v = eosGet(EOS_KEYS.orbs, [])
    const stored = Array.isArray(v) ? v.filter((o) => o && typeof o === "object") : []
    return EOS_REWARDS_MEM.orbs.length ? stored.concat(EOS_REWARDS_MEM.orbs) : stored
}
function eosRewardsBonds() {
    const v = eosGet(EOS_KEYS.bonds, {})
    const s = v && typeof v === "object" ? v : {}
    const out = {}
    EOS_REWARDS_CHARS.forEach((c) => {
        out[c] = Math.max(0, Math.round(Number(s[c]) || 0)) + (EOS_REWARDS_MEM.bonds[c] || 0)
    })
    return out
}
function eosRewardsLedgerBlank() {
    return { v: 1, skills: {}, games: [], emos: [], granted: [], miles: [] }
}
function eosRewardsLedgerClean(v) {
    const b = eosRewardsLedgerBlank()
    if (!v || typeof v !== "object") return b
    const nums = (a) => (Array.isArray(a) ? a.map(Number).filter((x) => Number.isFinite(x)) : [])
    const skills = {}
    if (v.skills && typeof v.skills === "object") for (const k in v.skills) if (EOS_REWARDS_SKILL[k]) skills[k] = Math.max(0, Math.round(Number(v.skills[k]) || 0))
    return { v: 1, skills, games: nums(v.games), emos: Array.isArray(v.emos) ? v.emos.filter((e) => EOS_EMO[e]) : [], granted: nums(v.granted), miles: nums(v.miles) }
}
function eosRewardsLedger() {
    const s = eosRewardsLedgerClean(eosGet(EOS_REWARDS_KEY, null))
    const m = EOS_REWARDS_MEM.ledger
    if (!m) return s
    const skills = { ...s.skills }
    for (const k in m.skills) skills[k] = (skills[k] || 0) + m.skills[k]
    const u = (a, b) => Array.from(new Set(a.concat(b)))
    return { v: 1, skills, games: u(s.games, m.games), emos: u(s.emos, m.emos), granted: u(s.granted, m.granted), miles: u(s.miles, m.miles) }
}
// ---------------------------------------------------------------- writers (respect keepHistory)
function eosRewardsAddOrb(row) {
    if (eosRewardsKeep()) {
        const v = eosGet(EOS_KEYS.orbs, [])
        eosSet(EOS_KEYS.orbs, (Array.isArray(v) ? v : []).concat([row]).slice(-EOS_REWARDS_ORB_CAP))
    } else EOS_REWARDS_MEM.orbs = EOS_REWARDS_MEM.orbs.concat([row]).slice(-EOS_REWARDS_ORB_CAP)
}
function eosRewardsAddBond(char) {
    if (!EOS_REWARDS_CHARS.includes(char)) return
    if (eosRewardsKeep()) {
        const v = eosGet(EOS_KEYS.bonds, {})
        const s = v && typeof v === "object" ? { ...v } : {}
        s[char] = Math.max(0, Math.round(Number(s[char]) || 0)) + 1
        eosSet(EOS_KEYS.bonds, s)
    } else EOS_REWARDS_MEM.bonds[char] = (EOS_REWARDS_MEM.bonds[char] || 0) + 1
}
function eosRewardsLedgerWrite(fn) {
    if (eosRewardsKeep()) eosSet(EOS_REWARDS_KEY, fn(eosRewardsLedgerClean(eosGet(EOS_REWARDS_KEY, null))))
    else EOS_REWARDS_MEM.ledger = fn(EOS_REWARDS_MEM.ledger || eosRewardsLedgerBlank())
}

// ---------------------------------------------------------------- bonds
function eosRewardsBondLevel(count) {
    return EOS_REWARDS_BOND_LEVELS.filter((n) => count >= n).length
}
function eosBondFor(char) {
    const c = EOS_REWARDS_CHARS.includes(char) ? char : "still"
    const count = eosRewardsBonds()[c] || 0
    const level = eosRewardsBondLevel(count)
    const pool = eosFacePool(c, "win")
    const faces = pool.slice(0, Math.min(level, pool.length))
    const next = EOS_REWARDS_BOND_LEVELS.find((n) => n > count) || null
    const name = EOS_CHAR_NAMES[c] || c.toUpperCase()
    return {
        char: c,
        name,
        count,
        level,
        next, //               loops needed in total for the next level (null = max)
        toNext: next ? next - count : 0,
        face: faces.length ? faces[faces.length - 1] : null, // the newest bond face (check-in orb after the shift)
        faces,
        locked: level < pool.length && next ? pool[level] : null, // the silhouette shown on the shelf
        line: level >= 2 ? `${name} ${EOS_REWARDS_BOND_LINES[c]}` : level === 1 ? `${name} is getting to know you` : `play with ${name} to meet them`,
    }
}
// The scene's character: the new games declare it (EOS_GAME_META); classic games use their family's lead bubble.
function eosRewardsSceneChar(gameId) {
    const id = Number(gameId) || 0
    const meta = EOS_GAME_META[id]
    if (meta && meta.char && EOS_REWARDS_CHARS.includes(meta.char)) return meta.char
    try {
        const g = eosRewardsGame(id)
        const fam = g && g.family
        const list = typeof FAMILY_BUBBLES !== "undefined" && FAMILY_BUBBLES ? FAMILY_BUBBLES[fam] : null
        if (Array.isArray(list) && EOS_REWARDS_CHARS.includes(list[0])) return list[0]
    } catch {}
    return null
}

// ---------------------------------------------------------------- skills
function eosRewardsSkillOfGame(gameId) {
    const id = Number(gameId) || 0
    if (!id) return null
    const hit = EOS_REWARDS_SKILLS.find((s) => s.ids.includes(id))
    if (hit) return hit.id
    const g = eosRewardsGame(id)
    const fam = g && g.family
    const byFam = EOS_REWARDS_SKILLS.find((s) => s.families.includes(fam))
    return byFam ? byFam.id : null
}
function eosRewardsRankOf(count) {
    let r = null
    EOS_REWARDS_RANKS.forEach((k) => {
        if (count >= k.at) r = k
    })
    return r
}
function eosSkillFor(skillId) {
    const s = EOS_REWARDS_SKILL[skillId]
    if (!s) return null
    const count = eosRewardsLedger().skills[s.id] || 0
    const rank = eosRewardsRankOf(count)
    const nextRank = EOS_REWARDS_RANKS.find((k) => k.at > count) || null
    const prevAt = rank ? rank.at : 0
    const games = s.ids
        .map((id) => eosRewardsGame(id))
        .filter(Boolean)
        .map((g) => ({ id: g.id, name: g.name }))
    return {
        id: s.id,
        name: s.name,
        glyph: s.glyph,
        hue: s.hue,
        count,
        rank: rank ? rank.label : null,
        rankId: rank ? rank.id : null,
        label: rank ? `${s.name} ${rank.label}` : s.name,
        next: nextRank ? nextRank.label : null,
        nextAt: nextRank ? nextRank.at : null,
        toNext: nextRank ? nextRank.at - count : 0,
        progress: nextRank ? eosClamp((count - prevAt) / Math.max(1, nextRank.at - prevAt), 0, 1) : 1,
        can: s.can,
        games, // registered games only (release 1 skips 115-120)
    }
}
// Which Still Moment ran in this loop? shift.moment → an explicit note (noteMoment) → the shift plan (auto).
function eosRewardsMomentOf(shift, gameId) {
    if (shift && typeof shift.moment === "string") return shift.moment
    const st = EOS_STORE.get()
    const m = EOS_REWARDS_MEM.moment
    if (m && m.launchAt && m.launchAt === st.launchAt) return m.variant
    try {
        const ctx = eosApi("shift").context?.({ id: gameId })
        if (ctx && ctx.plan && ctx.plan.auto && Number(ctx.gameId) === Number(gameId)) return ctx.plan.variant
    } catch {}
    return null
}
function eosRewardsNoteMoment(variant) {
    EOS_REWARDS_MEM.moment = { variant: String(variant || ""), launchAt: EOS_STORE.get().launchAt }
}

// ---------------------------------------------------------------- week / days / stats
function eosRewardsWeekStart(d = new Date()) {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
    return s
}
function eosWeek() {
    const from = eosToday(eosRewardsWeekStart())
    const all = eosDays().filter((k) => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k))
    const week = all.filter((k) => k >= from)
    const lifetime = new Set(all).size
    const n = new Set(week).size
    return {
        days: n,
        lifetime,
        dayKeys: week,
        label: `☀ ${n} ${n === 1 ? "day" : "days"} this week`, // no denominator, ever
        lifeLabel: `days you showed up: ${lifetime}`,
        milestones: EOS_REWARDS_DAY_MILES.slice(),
        reached: EOS_REWARDS_DAY_MILES.filter((m) => lifetime >= m),
        next: EOS_REWARDS_DAY_MILES.find((m) => m > lifetime) || null,
    }
}
function eosRewardsDelta(r) {
    if (!r || r.before == null || r.after == null) return null
    const better = (EOS_EMO[r.emo] && EOS_EMO[r.emo].better) || "down"
    return better === "up" ? r.after - r.before : r.before - r.after
}
// Your own numbers: non-retro rows only, never any speed record.
function eosMyStats(opts = {}) {
    const from = opts.week ? eosToday(eosRewardsWeekStart()) : ""
    const rows = eosSessions().filter((r) => r && !r.retro && (!from || eosRewardsDayOf(r.t) >= from))
    const rated = rows.filter((r) => r.before != null && r.after != null)
    let points = 0
    const by = new Map()
    rated.forEach((r) => {
        const d = eosRewardsDelta(r)
        if (d > 0) points += d
        const k = `${r.emo}|${r.gameId}`
        const cur = by.get(k) || { emo: r.emo, gameId: Number(r.gameId) || 0, n: 0, sum: 0 }
        cur.n += 1
        cur.sum += d || 0
        by.set(k, cur)
    })
    let helps = null
    by.forEach((v) => {
        const g = eosRewardsGame(v.gameId)
        if (!g || v.n < 2) return
        const avg = v.sum / v.n
        if (avg <= 0) return
        if (!helps || avg > helps.avg + 1e-9 || (Math.abs(avg - helps.avg) < 1e-9 && v.n > helps.n)) helps = { emo: v.emo, gameId: v.gameId, name: g.name, n: v.n, avg }
    })
    if (helps) {
        const up = EOS_EMO[helps.emo] && EOS_EMO[helps.emo].better === "up"
        const a = Math.round(helps.avg * 10) / 10
        helps.avg = a
        helps.label = `helps you most · ${eosRewardsEmoNoun(helps.emo)}: ${helps.name} (avg ${a} ${up ? "lifted" : "lighter"})`
    }
    return { points, pointsLabel: `points shifted: ${points}`, helps, loops: rows.length, rated: rated.length }
}
function eosRewardsScore() {
    try {
        if (typeof SCORE_KEY === "undefined" || typeof localStorage === "undefined") return 0
        return Math.max(0, Number(localStorage.getItem(SCORE_KEY)) || 0)
    } catch {
        return 0
    }
}
function eosRewardsDustState() {
    const score = eosRewardsScore()
    const cur = eosPrefs().dust || "default"
    return EOS_REWARDS_DUST.map((d) => ({ ...d, unlocked: score >= d.at, selected: cur === d.id, need: Math.max(0, d.at - score) }))
}

// ---------------------------------------------------------------- faces
function eosRewardsOwned(orbs) {
    const own = new Set()
    ;(orbs || []).forEach((o) => {
        if (o && o.char != null && o.face != null) own.add(`${o.char}:${Number(o.face)}`)
    })
    EOS_REWARDS_CHARS.forEach((c) => eosBondFor(c).faces.forEach((f) => own.add(`${c}:${f}`)))
    return own
}
// An expression of `char` the user does not own yet (102-face win pool); the first loop of the day is
// GUARANTEED a new one ("Expression of the Day": another character's when this one's pool is complete).
function eosRewardsPickFace(char, orbs, mustNew, seed) {
    const own = eosRewardsOwned(orbs)
    const pick = (arr, salt) => arr[Math.floor(eosRewardsRand(seed, salt) * arr.length) % arr.length]
    const pool = eosFacePool(char, "win")
    const fresh = pool.filter((f) => !own.has(`${char}:${f}`))
    if (fresh.length) return { char, face: pick(fresh, 1), fresh: true }
    if (mustNew) {
        const order = EOS_REWARDS_CHARS.slice().sort((a, b) => eosRewardsRand(seed, a.length * 7 + a.charCodeAt(0)) - eosRewardsRand(seed, b.length * 7 + b.charCodeAt(0)))
        for (const c of order) {
            const f = eosFacePool(c, "win").filter((x) => !own.has(`${c}:${x}`))
            if (f.length) return { char: c, face: pick(f, 2), fresh: true }
        }
    }
    return { char, face: pick(pool, 3), fresh: false }
}

// ---------------------------------------------------------------- THE GRANT (once per loop, idempotent per shift.t)
function eosGrantForShift(shift) {
    try {
        return eosRewardsGrant(shift)
    } catch (err) {
        if (eosIsDev()) EOS_REWARDS_DEV.errors.push(String((err && err.message) || err))
        return null
    }
}
function eosRewardsGrant(shiftIn) {
    const st = EOS_STORE.get()
    const shift = shiftIn && typeof shiftIn === "object" ? shiftIn : null
    const key = Number(shift && shift.t) || Number(st.launchAt) || 0
    if (key && EOS_REWARDS_MEM.results.has(key)) return EOS_REWARDS_MEM.results.get(key)
    // a completed loop always counts as a day you showed up (core also marks it in EosMarkFinish; idempotent)
    eosMarkDay()
    const led = eosRewardsLedger()
    const emo = EOS_EMO[shift && shift.emo] ? shift.emo : EOS_EMO[st.emotion] ? st.emotion : EOS_EMO[st.detected] ? st.detected : null
    const gameId = Number(shift && shift.gameId) || Number(st.gameId) || 0
    const orbsAll = eosRewardsOrbs()
    if (key && led.granted.includes(key)) {
        // already paid (e.g. a reload re-mounted the meter): report it, write nothing
        const orb = orbsAll.find((o) => Number(o.k) === key) || null
        const view = eosRewardsResult({ orb, emo, gameId, chars: [], ups: [], skillIds: [], milestone: null, capped: !orb, again: true })
        EOS_REWARDS_MEM.results.set(key, view)
        return view
    }
    const E = EOS_EMO[emo] || EOS_GUIDE_CHAR
    const companion = E.char || "still"
    const scene = eosRewardsSceneChar(gameId)
    const chars = Array.from(new Set([companion, scene].filter((c) => EOS_REWARDS_CHARS.includes(c))))
    const bondsBefore = eosRewardsBonds()
    const ups = []
    chars.forEach((c) => {
        const before = bondsBefore[c] || 0
        if (eosRewardsBondLevel(before + 1) > eosRewardsBondLevel(before)) ups.push(c)
        eosRewardsAddBond(c)
    })
    const momentV = eosRewardsMomentOf(shift, gameId)
    const skillIds = Array.from(new Set([eosRewardsSkillOfGame(gameId), eosRewardsMomentSkill(momentV)].filter(Boolean)))
    const skillBefore = {}
    skillIds.forEach((id) => {
        skillBefore[id] = led.skills[id] || 0
    })
    const sessions = eosSessions()
    const newGame = gameId > 0 && !led.games.includes(gameId) && eosLearnedCount(gameId) <= 1
    const newEmo = !!emo && !led.emos.includes(emo) && sessions.filter((r) => r && r.emo === emo).length <= 1
    const today = eosToday()
    const todays = orbsAll.filter((o) => eosRewardsDayOf(o.t) === today)
    const firstOfDay = todays.length === 0
    const gold = firstOfDay || newGame || newEmo || ups.length > 0 // NEVER from Δ
    const now = Date.now()
    let orb = null
    let capped = false
    if (todays.length >= EOS_REWARDS_DAY_CAP) capped = true
    else {
        const f = eosRewardsPickFace(companion, orbsAll, firstOfDay, key || now)
        orb = {
            t: now,
            k: key || now,
            emo: emo || "general",
            char: f.char,
            face: Number(f.face),
            tier: gold ? "gold" : "silver",
            before: shift && shift.before != null ? Number(shift.before) : null,
            after: shift && shift.after != null ? Number(shift.after) : null,
            gameId,
        }
        eosRewardsAddOrb(orb)
    }
    // lifetime day milestones 3 / 10 / 30 / 100 → one extra gold orb each (inside the daily cap)
    let milestone = null
    const lifetime = eosWeek().lifetime
    const due = EOS_REWARDS_DAY_MILES.find((m) => lifetime >= m && !led.miles.includes(m))
    if (due && todays.length + (orb ? 1 : 0) < EOS_REWARDS_DAY_CAP) {
        const f = eosRewardsPickFace(companion, eosRewardsOrbs(), true, (key || now) + due)
        const mo = { t: now + 1, k: -(key || now), emo: emo || "general", char: f.char, face: Number(f.face), tier: "gold", before: null, after: null, gameId, mile: due }
        eosRewardsAddOrb(mo)
        milestone = { days: due, orb: mo }
    }
    eosRewardsLedgerWrite((l) => {
        skillIds.forEach((id) => {
            l.skills[id] = (l.skills[id] || 0) + 1
        })
        if (gameId && !l.games.includes(gameId)) l.games = l.games.concat([gameId]).slice(-400)
        if (emo && !l.emos.includes(emo)) l.emos = l.emos.concat([emo])
        if (key) l.granted = l.granted.concat([key]).slice(-200)
        if (milestone) l.miles = l.miles.concat([milestone.days])
        return l
    })
    const reasons = []
    if (firstOfDay) reasons.push("first of the day")
    if (newGame) reasons.push("new game")
    if (newEmo) reasons.push("new feeling")
    if (ups.length) reasons.push("bond level")
    const res = eosRewardsResult({ orb, emo, gameId, chars, ups, skillIds, skillBefore, milestone, capped, reasons, companion })
    if (key) EOS_REWARDS_MEM.results.set(key, res)
    EOS_REWARDS_MEM.lastGrantAt = Date.now()
    eosRewardsLog("grant", { key, tier: orb ? orb.tier : null, capped, chars, skillIds, reasons })
    EOS_REWARDS_BUS.bump()
    return res
}
function eosRewardsMomentSkill(v) {
    const hit = EOS_REWARDS_SKILLS.find((s) => s.moment && s.moment === v)
    return hit ? hit.id : null
}
function eosRewardsResult({ orb, emo, gameId, chars, ups, skillIds, skillBefore = {}, milestone, capped, reasons = [], companion, again = false }) {
    const comp = companion || (EOS_EMO[emo] || EOS_GUIDE_CHAR).char || "still"
    const bonds = (chars.length ? chars : [comp]).map((c) => {
        const b = eosBondFor(c)
        const up = ups.includes(c)
        return { char: c, name: b.name, level: b.level, count: b.count, next: b.next, up, unlocked: up ? b.face : null, line: b.line }
    })
    const bond = bonds.find((b) => b.up) || bonds.find((b) => b.char === comp) || bonds[0] || null
    const skills = skillIds.map((id) => {
        const s = eosSkillFor(id)
        const before = eosRewardsRankOf(skillBefore[id] || 0)
        return s ? { ...s, up: !!s.rank && (!before || before.id !== s.rankId) } : null
    }).filter(Boolean)
    const sk0 = skills[0] || null
    const skill = sk0 ? { id: sk0.id, name: sk0.name, rank: sk0.rank, next: sk0.next, toNext: sk0.toNext, count: sk0.count, up: sk0.up, label: sk0.label } : null
    const week = eosWeek()
    const parts = []
    if (milestone) parts.push(`${milestone.days} days you showed up ✦`)
    if (orb) parts.push(orb.tier === "gold" ? "✦ CORE MEMORY" : "+1 memory orb")
    else if (capped && !again) parts.push("today's 5 orbs are on your shelf")
    const skUp = skills.find((s) => s.up)
    if (bond && bond.up) parts.push(`${bond.name} bond ${bond.level} ✦`)
    else if (skUp) parts.push(`${skUp.label} ✦`)
    else if (bond && bond.level > 0) parts.push(`${bond.name} bond ${bond.level}`)
    parts.push(week.label)
    return { orb, bond, bonds, skill, skills, week, milestone, capped, gold: !!(orb && orb.tier === "gold"), reasons, again, line: parts.slice(0, 3).join(" · ") }
}

// ---------------------------------------------------------------- reset / history
function eosRewardsReset() {
    try {
        if (typeof localStorage !== "undefined") {
            const ks = []
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i)
                if (k && k.indexOf("eos_") === 0 && k !== EOS_KEYS.prefs) ks.push(k)
            }
            ks.forEach((k) => localStorage.removeItem(k))
        }
    } catch {}
    EOS_REWARDS_MEM.orbs = []
    EOS_REWARDS_MEM.bonds = {}
    EOS_REWARDS_MEM.ledger = null
    EOS_REWARDS_MEM.results = new Map()
    EOS_REWARDS_MEM.moment = null
    eosRewardsLog("reset")
    EOS_REWARDS_BUS.bump()
}
function eosRewardsSetPref(k, v) {
    eosSetPref(k, v)
    EOS_REWARDS_BUS.bump()
}

// ---------------------------------------------------------------- captions (3 per emotion, rotating)
function eosRewardsSeconds(shift) {
    const ms = Number(shift && shift.ms) || 0
    return ms > 0 ? Math.max(1, Math.round(ms / 1000)) : 0
}
function eosRewardsCaptions(shift, showFeeling) {
    const emo = EOS_EMO[shift && shift.emo] ? shift.emo : null
    const E = EOS_EMO[emo] || EOS_GUIDE_CHAR
    const name = EOS_CHAR_NAMES[E.char] || "STILL"
    const sec = eosRewardsSeconds(shift)
    const d = eosRewardsDelta(shift)
    const nums = d != null && d > 0 ? `${shift.before} → ${shift.after}` : null
    const feel = emo && showFeeling ? eosRewardsEmoNoun(emo) : null
    const inS = sec ? ` in ${sec} s` : ""
    return [
        feel && nums ? `I shifted ${feel} ${nums}${inS} with ThinkStill 🫧 #ThinkStillShift` : `I took a minute for me with ThinkStill 🫧 #ThinkStillShift`,
        nums ? `${name} handed back the controls. ${nums} ✦` : `${name} handed back the controls ✦`,
        `${(emo && EOS_REWARDS_VERB[emo]) || "Found a little space"}${inS}. Your turn?`,
    ]
}
function eosRewardsDeepLink(shift, showFeeling) {
    const url = String(EOS_STORE.get().shareUrl || "").trim()
    if (!url) return ""
    const emo = EOS_EMO[shift && shift.emo] ? shift.emo : null
    const safeEmo = emo && (showFeeling || !EOS_REWARDS_SENSITIVE.has(emo)) ? emo : "auto"
    const t = Math.max(1, eosRewardsSeconds(shift) || 30)
    return `${url}${url.includes("?") ? "&" : "?"}eos=${safeEmo}&t=${t}`
}
function eosRewardsCaption(shift, opts = {}) {
    if (opts.week) {
        const w = eosWeek()
        const p = eosMyStats({ week: true }).points
        const link = String(EOS_STORE.get().shareUrl || "").trim()
        return `My week with ThinkStill: ${w.label}${p > 0 ? ` · ${p} points shifted` : ""} ✦ #ThinkStillShift${link ? ` ${link}` : ""}`
    }
    const emo = shift && shift.emo
    const showFeeling = opts.showFeeling != null ? !!opts.showFeeling : !EOS_REWARDS_SENSITIVE.has(emo)
    const list = eosRewardsCaptions(shift, showFeeling)
    if (EOS_REWARDS_MEM.capIdx < 0) EOS_REWARDS_MEM.capIdx = (Number(EOS_STORE.get().sessionSeed) || 0) % 3
    const i = opts.index != null ? Number(opts.index) % 3 : EOS_REWARDS_MEM.capIdx++ % 3
    const link = eosRewardsDeepLink(shift, showFeeling)
    const cap = link ? `${list[i]} ${link}` : list[i]
    if (eosIsDev()) EOS_REWARDS_DEV.lastCaption = cap
    return cap
}

// ---------------------------------------------------------------- share card (canvas → PNG blob)
const EOS_REWARDS_IMG = new Map() // src → Promise<img|null> (faces are reused across cards)
function eosRewardsLoadImg(src, ms = 2600) {
    if (!src) return Promise.resolve(null)
    if (EOS_REWARDS_IMG.has(src)) return EOS_REWARDS_IMG.get(src)
    const p = eosRewardsLoadImgOnce(src, ms)
    EOS_REWARDS_IMG.set(src, p)
    p.then((img) => {
        if (!img) EOS_REWARDS_IMG.delete(src) // retry next time (network may come back)
    })
    return p
}
function eosRewardsLoadImgOnce(src, ms) {
    return new Promise((resolve) => {
        if (typeof Image === "undefined" || !src) return resolve(null)
        let done = false
        const img = new Image()
        const fin = (v) => {
            if (done) return
            done = true
            clearTimeout(timer)
            resolve(v)
        }
        const timer = setTimeout(() => fin(null), ms)
        img.crossOrigin = "anonymous"
        img.decoding = "async"
        img.onload = () => fin(img.naturalWidth ? img : null)
        img.onerror = () => fin(null)
        img.src = src
    })
}
async function eosRewardsFontReady(px) {
    try {
        if (typeof document !== "undefined" && document.fonts && document.fonts.load)
            await Promise.race([document.fonts.load(`900 ${px}px "Baloo 2"`), new Promise((r) => setTimeout(r, 1800))])
    } catch {}
}
function eosRewardsHexA(hex, a) {
    const h = String(hex || "#888888").replace("#", "")
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16) || 0
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function eosRewardsPaintBase(ctx, W, H, grade) {
    const loud = (grade && grade.loud) || ["#2b2f6e", "#4a3f99"]
    const calm = (grade && grade.calm) || ["#7de3ff", "#c8f4ff"]
    const g = ctx.createLinearGradient(0, 0, W * 0.25, H)
    g.addColorStop(0, loud[0])
    g.addColorStop(0.22, loud[1])
    g.addColorStop(0.56, calm[0])
    g.addColorStop(0.8, "#ffb86b")
    g.addColorStop(1, "#ff8a3d")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    // Pixar bokeh: big soft discs for depth
    for (let i = 0; i < 14; i++) {
        const x = eosRewardsRand(i, 11) * W
        const y = eosRewardsRand(i, 12) * H
        const r = 40 + eosRewardsRand(i, 13) * 150
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
        rg.addColorStop(0, `rgba(255,${200 + Math.round(eosRewardsRand(i, 14) * 55)},190,${0.07 + eosRewardsRand(i, 15) * 0.08})`)
        rg.addColorStop(1, "rgba(255,230,200,0)")
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
    }
}
function eosRewardsPaintFinish(ctx, W, H) {
    // warm vignette
    const v = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.25, W / 2, H * 0.5, Math.max(W, H) * 0.78)
    v.addColorStop(0, "rgba(255,190,120,0)")
    v.addColorStop(1, "rgba(40,10,40,.5)")
    ctx.fillStyle = v
    ctx.fillRect(0, 0, W, H)
    // sparse film-grain specks + a fine star field: a filmic texture that keeps the PNG small (≈0.3-1 MB)
    ctx.save()
    for (let i = 0; i < 2600; i++) {
        const x = eosRewardsRand(i, 31) * W
        const y = eosRewardsRand(i, 32) * H
        const a = 0.05 + eosRewardsRand(i, 33) * 0.12
        ctx.fillStyle = i % 3 ? `rgba(255,244,220,${a})` : `rgba(30,10,40,${a})`
        ctx.fillRect(x, y, 2, 2)
    }
    ctx.restore()
}
// 60 dots of Thought Dust spiralling into (cx, cy)
function eosRewardsPaintDust(ctx, cx, cy, R, rIn, count = 60) {
    const hues = [195, 265, 42, 320]
    for (let i = 0; i < count; i++) {
        const f = i / (count - 1)
        const ang = i * 0.47 + 0.6
        const rad = rIn + (R - rIn) * Math.pow(1 - f, 1.15)
        const x = cx + Math.cos(ang) * rad
        const y = cy + Math.sin(ang) * rad * 0.92
        const size = 3 + (1 - f) * 7 * (0.6 + eosRewardsRand(i, 21) * 0.6)
        const hue = f > 0.72 ? 44 : hues[i % 4]
        const a = 0.35 + 0.6 * f
        // a short tail pointing back along the spiral (motion toward the centre)
        const ta = ang - 0.16
        const tr = rad + 28 + (1 - f) * 40
        ctx.strokeStyle = `hsla(${hue},100%,80%,${a * 0.35})`
        ctx.lineWidth = Math.max(1.5, size * 0.6)
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(ta) * tr, cy + Math.sin(ta) * tr * 0.92)
        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.save()
        ctx.shadowColor = `hsla(${hue},100%,70%,.9)`
        ctx.shadowBlur = size * 2.4
        ctx.fillStyle = `hsla(${hue},100%,${82 + f * 12}%,${a})`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }
}
function eosRewardsPaintOrb(ctx, x, y, r, hue, img, letter, rim) {
    ctx.save()
    ctx.shadowColor = "rgba(20,8,48,.45)"
    ctx.shadowBlur = r * 0.35
    ctx.shadowOffsetY = r * 0.12
    const g = ctx.createRadialGradient(x, y + r * 0.24, r * 0.08, x, y, r)
    g.addColorStop(0, `hsla(${hue},95%,64%,1)`)
    g.addColorStop(0.68, `hsla(${hue},90%,36%,1)`)
    g.addColorStop(1, `hsla(${hue},80%,18%,1)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.shadowColor = `hsla(${hue},100%,66%,.75)`
    ctx.shadowBlur = r * 0.55
    ctx.strokeStyle = `hsla(${hue},100%,80%,.35)`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    if (img) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, r * 0.97, 0, Math.PI * 2)
        ctx.clip()
        const s = r * 2 * 0.86
        ctx.drawImage(img, x - s / 2, y - s / 2, s, s)
        ctx.restore()
    } else {
        ctx.save()
        ctx.fillStyle = "#fff"
        ctx.font = `900 ${Math.round(r * 0.9)}px ${EOS_REWARDS_FONT}`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(String(letter || "✦").slice(0, 1), x, y + r * 0.05)
        ctx.restore()
    }
    if (rim) {
        const rg = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
        rg.addColorStop(0, "#fff3b0")
        rg.addColorStop(0.5, "#ffc443")
        rg.addColorStop(1, "#ff8a2e")
        ctx.save()
        ctx.strokeStyle = rg
        ctx.lineWidth = Math.max(4, r * 0.07)
        ctx.shadowColor = "rgba(255,190,80,.8)"
        ctx.shadowBlur = r * 0.3
        ctx.beginPath()
        ctx.arc(x, y, r * 1.02, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
    }
    const gl = ctx.createRadialGradient(x - r * 0.3, y - r * 0.52, 0, x - r * 0.3, y - r * 0.52, r * 0.42)
    gl.addColorStop(0, "rgba(255,255,255,.7)")
    gl.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = gl
    ctx.beginPath()
    ctx.ellipse(x - r * 0.3, y - r * 0.52, r * 0.38, r * 0.22, -0.35, 0, Math.PI * 2)
    ctx.fill()
}
function eosRewardsPaintArrow(ctx, x1, y1, x2, y2, w) {
    const mx = (x1 + x2) / 2
    const my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.32
    const g = ctx.createLinearGradient(x1, y1, x2, y2)
    g.addColorStop(0, "rgba(255,255,255,.75)")
    g.addColorStop(1, "#ffd04a")
    ctx.save()
    ctx.shadowColor = "rgba(255,190,80,.7)"
    ctx.shadowBlur = w * 1.4
    ctx.strokeStyle = g
    ctx.lineWidth = w
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(mx, my, x2, y2)
    ctx.stroke()
    const a = Math.atan2(y2 - my, x2 - mx)
    const L = w * 3.1
    ctx.fillStyle = "#ffd04a"
    ctx.beginPath()
    ctx.moveTo(x2 + Math.cos(a) * w * 0.9, y2 + Math.sin(a) * w * 0.9)
    ctx.lineTo(x2 + Math.cos(a + 2.5) * L, y2 + Math.sin(a + 2.5) * L)
    ctx.lineTo(x2 + Math.cos(a - 2.5) * L, y2 + Math.sin(a - 2.5) * L)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
}
function eosRewardsPaintText(ctx, texts, s, x, y, o = {}) {
    const str = String(s || "")
    if (!str) return
    let px = o.size || 48
    const weight = o.weight || 900
    ctx.save()
    ctx.font = `${weight} ${px}px ${EOS_REWARDS_FONT}`
    while (o.maxW && ctx.measureText(str).width > o.maxW && px > 20) {
        px -= 3
        ctx.font = `${weight} ${px}px ${EOS_REWARDS_FONT}`
    }
    if (o.spacing && "letterSpacing" in ctx) ctx.letterSpacing = `${o.spacing}px`
    ctx.textAlign = o.align || "center"
    ctx.textBaseline = "alphabetic"
    if (o.shadow !== false) {
        ctx.shadowColor = o.shadowColor || "rgba(30,8,50,.55)"
        ctx.shadowOffsetY = Math.max(2, px * 0.06)
        ctx.shadowBlur = px * 0.22
    }
    if (o.fill === "gold") {
        const g = ctx.createLinearGradient(0, y - px, 0, y)
        g.addColorStop(0, "#fff7c8")
        g.addColorStop(0.55, "#ffd04a")
        g.addColorStop(1, "#ff9a2e")
        ctx.fillStyle = g
    } else ctx.fillStyle = o.fill || "#fff"
    if (o.fill === "gold" || o.stroke) {
        // a soft dark outline keeps gold copy readable on the warm end of the gradient
        ctx.lineJoin = "round"
        ctx.lineWidth = Math.max(4, px * 0.16)
        ctx.strokeStyle = o.stroke || "rgba(92,26,10,.62)"
        ctx.strokeText(str, x, y)
    }
    ctx.fillText(str, x, y)
    ctx.restore()
    texts.push(str)
}
function eosRewardsPaintPill(ctx, texts, s, x, y, h, o = {}) {
    ctx.save()
    ctx.font = `900 ${Math.round(h * 0.46)}px ${EOS_REWARDS_FONT}`
    const w = ctx.measureText(s).width + h * 1.1
    const r = h / 2
    const g = ctx.createLinearGradient(0, y - r, 0, y + r)
    g.addColorStop(0, o.top || "#fff3b0")
    g.addColorStop(1, o.bottom || "#ffb23e")
    ctx.shadowColor = "rgba(60,20,0,.4)"
    ctx.shadowBlur = h * 0.4
    ctx.shadowOffsetY = h * 0.1
    ctx.fillStyle = g
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x - w / 2, y - r, w, h, r)
    else ctx.rect(x - w / 2, y - r, w, h)
    ctx.fill()
    ctx.restore()
    eosRewardsPaintText(ctx, texts, s, x, y + h * 0.16, { size: Math.round(h * 0.46), fill: o.ink || "#3a1800", shadow: false })
}
async function eosMakeShareCard(shift, opts = {}) {
    if (typeof document === "undefined") throw new Error("no document")
    const format = opts.format === "feed" ? "feed" : "story"
    const W = 1080
    const H = format === "feed" ? 1350 : 1920
    const k = H / 1920
    const cv = document.createElement("canvas")
    cv.width = W
    cv.height = H
    const ctx = cv.getContext("2d")
    const texts = []
    await eosRewardsFontReady(150)
    if (opts.week) await eosRewardsPaintWeek(ctx, texts, W, H, k)
    else await eosRewardsPaintShift(ctx, texts, W, H, k, shift || EOS_STORE.get().lastShift || {}, opts)
    eosRewardsPaintFinish(ctx, W, H)
    const blob = await new Promise((resolve, reject) => {
        try {
            cv.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
        } catch (err) {
            reject(err)
        }
    })
    if (eosIsDev()) EOS_REWARDS_DEV.lastCard = { format, week: !!opts.week, w: W, h: H, bytes: blob.size, texts: texts.slice() }
    return blob
}
async function eosRewardsPaintShift(ctx, texts, W, H, k, shift, opts) {
    const emo = EOS_EMO[shift.emo] ? shift.emo : null
    const E = EOS_EMO[emo] || EOS_GUIDE_CHAR
    const char = E.char || "still"
    const showFeeling = opts.showFeeling != null ? !!opts.showFeeling : !EOS_REWARDS_SENSITIVE.has(emo)
    const feel = emo && showFeeling ? eosRewardsEmoNoun(emo) : null
    const d = eosRewardsDelta(shift)
    const up = E.better === "up"
    const sec = eosRewardsSeconds(shift)
    const g = eosRewardsGame(shift.gameId)
    const gameName = g ? String(g.name || "").toUpperCase() : ""
    eosRewardsPaintBase(ctx, W, H, E.grade)
    const feed = H < 1600
    const L = feed
        ? { top: 118, lx: 175, ly: 500, lr: 92, cx: 700, cy: 470, cr: 196, head: 850, tag: 930, sub: 1000, badge: 1090, foot: 1238, url: 1296 }
        : { top: 210, lx: 180, ly: 740, lr: 108, cx: 705, cy: 710, cr: 246, head: 1190, tag: 1290, sub: 1380, badge: 1510, foot: 1742, url: 1816 }
    const [loudImg, calmImg] = await Promise.all([eosRewardsLoadImg(eosFace(char, E.loud)), eosRewardsLoadImg(eosFace(char, E.calm))])
    // warm halo behind the calm character
    const halo = ctx.createRadialGradient(L.cx, L.cy, L.cr * 0.4, L.cx, L.cy, L.cr * 2.4)
    halo.addColorStop(0, "rgba(255,236,170,.55)")
    halo.addColorStop(1, "rgba(255,236,170,0)")
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, W, H)
    eosRewardsPaintDust(ctx, L.cx, L.cy, Math.max(W, H) * (feed ? 0.62 : 0.5), L.cr * 1.12, 60)
    eosRewardsPaintText(ctx, texts, "MY SHIFT ✦", W / 2, L.top, { size: 44, weight: 800, fill: "rgba(255,255,255,.92)", spacing: 8 })
    const isGrey = !!E.greyLoud
    ctx.save()
    if (isGrey && "filter" in ctx) ctx.filter = "grayscale(1)"
    eosRewardsPaintOrb(ctx, L.lx, L.ly, L.lr, E.hue, loudImg, EOS_CHAR_NAMES[char], false)
    ctx.restore()
    eosRewardsPaintArrow(ctx, L.lx + L.lr * 0.78, L.ly - L.lr * 0.72, L.cx - L.cr * 1.1, L.cy - L.cr * 0.3, 17)
    eosRewardsPaintOrb(ctx, L.cx, L.cy, L.cr, 46, calmImg, EOS_CHAR_NAMES[char], true)
    const nums = d != null && d > 0 ? `${shift.before} → ${shift.after}` : null
    let head
    let tag
    if (nums) {
        head = feel ? `${feel} ${nums}` : nums
        tag = feel ? (up ? "lifted ✦" : `${d} lighter ✦`) : "a shift ✦"
    } else {
        head = "I SHOWED UP"
        tag = feel ? `for my ${String(E.noun || "").toLowerCase()} ✦` : "for me ✦"
    }
    eosRewardsPaintText(ctx, texts, head, W / 2, L.head, { size: 150, fill: "#fff", maxW: W - 110, shadowColor: "rgba(40,10,60,.6)" })
    eosRewardsPaintText(ctx, texts, tag, W / 2, L.tag, { size: 62, fill: "gold", maxW: W - 140 })
    const subBits = []
    if (sec) subBits.push(nums ? `shifted in ${sec} s` : `${sec} s for me`)
    if (gameName) subBits.push(gameName)
    if (subBits.length) eosRewardsPaintText(ctx, texts, subBits.join(" · "), W / 2, L.sub, { size: 50, weight: 800, fill: "rgba(255,255,255,.95)", maxW: W - 120 })
    const sk = eosSkillFor(eosRewardsSkillOfGame(shift.gameId))
    if (sk) eosRewardsPaintPill(ctx, texts, `${sk.glyph} ${sk.name} ${sk.rank || "ROOKIE"}`, W / 2, L.badge, 92)
    eosRewardsPaintText(ctx, texts, `with ${EOS_CHAR_NAMES[char] || "STILL"} · ThinkStill`, W / 2, L.foot, { size: 50, weight: 900, fill: "#fff" })
    const url = String(EOS_STORE.get().shareUrl || "").trim()
    if (url) eosRewardsPaintText(ctx, texts, url.replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, L.url, { size: 36, weight: 800, fill: "rgba(255,255,255,.9)", maxW: W - 160 })
}
async function eosRewardsPaintWeek(ctx, texts, W, H, k) {
    const w = eosWeek()
    const stats = eosMyStats({ week: true })
    const from = eosToday(eosRewardsWeekStart())
    const orbs = eosRewardsOrbs().filter((o) => eosRewardsDayOf(o.t) >= from).slice(-35)
    const top = EOS_REWARDS_SKILLS.map((s) => eosSkillFor(s.id)).filter((s) => s && s.count > 0).sort((a, b) => b.count - a.count)[0]
    eosRewardsPaintBase(ctx, W, H, EOS_GUIDE_CHAR.grade)
    const feed = H < 1600
    const cx = W / 2
    const cy = feed ? 470 : 700
    const cr = feed ? 150 : 190
    const img = await eosRewardsLoadImg(eosFace("still", 15))
    const halo = ctx.createRadialGradient(cx, cy, cr * 0.4, cx, cy, cr * 2.8)
    halo.addColorStop(0, "rgba(255,236,170,.5)")
    halo.addColorStop(1, "rgba(255,236,170,0)")
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, W, H)
    eosRewardsPaintDust(ctx, cx, cy, Math.max(W, H) * 0.5, cr * 1.15, 60)
    eosRewardsPaintText(ctx, texts, "MY WEEK ✦", W / 2, feed ? 118 : 210, { size: 44, weight: 800, fill: "rgba(255,255,255,.92)", spacing: 8 })
    // this week's orbs as glowing dots in their character colours, on two rings around STILL
    orbs.forEach((o, i) => {
        const ring = i < 14 ? 0 : 1
        const idx = ring ? i - 14 : i
        const n = ring ? Math.max(1, orbs.length - 14) : Math.min(14, orbs.length)
        const ang = -Math.PI / 2 + (idx / n) * Math.PI * 2 + ring * 0.2
        const R = cr + (ring ? 150 : 80) * (feed ? 0.85 : 1)
        const x = cx + Math.cos(ang) * R
        const y = cy + Math.sin(ang) * R
        const hue = EOS_REWARDS_CHAR_HUE[o.char] != null ? EOS_REWARDS_CHAR_HUE[o.char] : 190
        const r = o.tier === "gold" ? 26 : 21
        ctx.save()
        ctx.shadowColor = `hsla(${hue},100%,65%,.9)`
        ctx.shadowBlur = 26
        const gg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 1, x, y, r)
        gg.addColorStop(0, `hsla(${hue},100%,88%,1)`)
        gg.addColorStop(1, `hsla(${hue},90%,45%,1)`)
        ctx.fillStyle = gg
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
        if (o.tier === "gold") {
            ctx.strokeStyle = "#ffd04a"
            ctx.lineWidth = 5
            ctx.stroke()
        }
        ctx.restore()
    })
    eosRewardsPaintOrb(ctx, cx, cy, cr, 46, img, "S", true)
    const head = `☀ ${w.days} ${w.days === 1 ? "day" : "days"}`
    const y0 = feed ? 860 : 1250
    eosRewardsPaintText(ctx, texts, head, W / 2, y0, { size: 150, fill: "#fff", maxW: W - 120 })
    eosRewardsPaintText(ctx, texts, "I showed up for me this week", W / 2, y0 + (feed ? 74 : 92), { size: 52, weight: 800, fill: "gold", maxW: W - 140 })
    let y = y0 + (feed ? 150 : 190)
    if (stats.points > 0) {
        eosRewardsPaintText(ctx, texts, `${stats.points} points shifted`, W / 2, y, { size: 56, weight: 900, fill: "#fff" })
        y += feed ? 96 : 120
    }
    if (top) eosRewardsPaintPill(ctx, texts, `${top.glyph} ${top.name} ${top.rank || "ROOKIE"}`, W / 2, y, 92)
    eosRewardsPaintText(ctx, texts, "ThinkStill", W / 2, feed ? 1250 : 1760, { size: 54, weight: 900, fill: "#fff" })
    const url = String(EOS_STORE.get().shareUrl || "").trim()
    if (url) eosRewardsPaintText(ctx, texts, url.replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, feed ? 1304 : 1830, { size: 36, weight: 800, fill: "rgba(255,255,255,.9)", maxW: W - 160 })
}

// ---------------------------------------------------------------- EosShareButton
// {shift} → "SHARE ✦" button · {shift, variant:"link", label} → a text link (the meter's quiet "make a card")
// {week:true} → "Share my week". Hidden while ANY safety flag is set. Phone: story PNG; share sheet when the
// browser can share files, else download + copy the caption (toast). Errors fall back silently to download.
function EosShareButton({ shift = null, variant = "button", label, week = false, format, className = "" }) {
    const st = useEosStore()
    const [busy, setBusy] = React.useState(false)
    const [toast, setToast] = React.useState("")
    const [named, setNamed] = React.useState(false)
    const alive = React.useRef(true)
    const timer = React.useRef(0)
    React.useEffect(
        () => () => {
            alive.current = false
            clearTimeout(timer.current)
        },
        []
    )
    const sh = shift || (week ? null : st.lastShift)
    const emo = sh && sh.emo
    const sensitive = !week && EOS_REWARDS_SENSITIVE.has(emo)
    if (st.safety) return null
    if (!week && !sh) return null
    const say = (msg) => {
        setToast(msg)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => alive.current && setToast(""), 2600)
    }
    const go = async () => {
        if (busy) return
        setBusy(true)
        const showFeeling = sensitive ? named : true
        const caption = eosRewardsCaption(sh, { week, showFeeling })
        let blob = null
        try {
            blob = await eosMakeShareCard(sh, { format: format || "story", showFeeling, week })
        } catch {}
        if (!alive.current) return
        const fname = week ? "thinkstill-week.png" : "thinkstill-shift.png"
        let shared = false
        try {
            if (blob && typeof File !== "undefined" && typeof navigator !== "undefined" && navigator.canShare) {
                const file = new File([blob], fname, { type: "image/png" })
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], text: caption })
                    shared = true
                }
            }
        } catch (err) {
            if (err && err.name === "AbortError") shared = true // the person closed the share sheet: fine
        }
        if (!shared) {
            try {
                if (blob) {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = fname
                    a.rel = "noopener"
                    a.style.display = "none"
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    setTimeout(() => URL.revokeObjectURL(url), 4000)
                }
            } catch {}
            let copied = false
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(caption)
                    copied = true
                }
            } catch {}
            if (alive.current) say(blob ? (copied ? "card saved ✓ caption copied" : "card saved ✓") : copied ? "caption copied ✓" : "couldn't make the card")
        }
        if (alive.current) setBusy(false)
    }
    const text = busy ? "making your card…" : label || (week ? "Share my week ✦" : "SHARE ✦")
    return (
        <span className={`eosRwShareWrap ${variant === "link" ? "isLink" : ""} ${className}`}>
            <button type="button" className={`eosRwShare ${variant === "link" ? "isLink" : ""}`} onClick={go} aria-busy={busy ? "true" : "false"} disabled={busy} data-eos-share={week ? "week" : "shift"}>
                {text}
            </button>
            {sensitive ? (
                <button type="button" className="eosRwShareName" aria-pressed={named ? "true" : "false"} onClick={() => setNamed((v) => !v)}>
                    {named ? "☑" : "☐"} show the feeling name
                </button>
            ) : null}
            {toast ? (
                <span className="eosRwToast" role="status">
                    {toast}
                </span>
            ) : null}
        </span>
    )
}

// ---------------------------------------------------------------- EosWorldChips (input + reveal)
function EosWorldChips({ stage, reduced = false }) {
    const st = useEosStore()
    const rev = React.useSyncExternalStore(EOS_REWARDS_BUS.subscribe, EOS_REWARDS_BUS.get, EOS_REWARDS_BUS.get)
    const red = eosCalm(reduced)
    const [open, setOpen] = React.useState(false)
    const [shown, setShown] = React.useState(null)
    const [pop, setPop] = React.useState(0)
    const rootRef = React.useRef(null)
    const orbBtn = React.useRef(null)
    const opener = React.useRef(null)
    const realRef = React.useRef(0)
    const visible = stage === "input" || stage === "reveal"
    const data = React.useMemo(() => {
        const orbs = eosRewardsOrbs()
        const last = orbs.length ? orbs[orbs.length - 1] : null
        return { orbs: orbs.length, last, days: eosWeek().days }
    }, [rev, stage, st.recordedFor, st.phase])
    realRef.current = data.orbs
    // the count waits for the orb's flight to land (eos:orb-landed) — or 2.6 s — before it rolls up
    React.useEffect(() => {
        const fresh = Date.now() - EOS_REWARDS_MEM.lastGrantAt < 2500
        if (shown == null || !fresh || stage !== "reveal" || data.orbs <= shown) {
            setShown(data.orbs)
            return
        }
        const t = setTimeout(() => {
            setShown(realRef.current)
            setPop((p) => p + 1)
        }, 2600)
        return () => clearTimeout(t)
    }, [data.orbs, stage])
    React.useEffect(() => {
        const el = rootRef.current
        if (!el) return
        const on = () => {
            setShown(realRef.current)
            setPop((p) => p + 1)
        }
        el.addEventListener("eos:orb-landed", on)
        return () => el.removeEventListener("eos:orb-landed", on)
    }, [visible])
    React.useEffect(() => {
        if (!visible) setOpen(false)
    }, [visible])
    if (!visible) return null
    const count = shown == null ? data.orbs : shown
    const openShelf = (ev) => {
        opener.current = ev && ev.currentTarget ? ev.currentTarget : orbBtn.current
        setOpen(true)
    }
    const close = () => {
        setOpen(false)
        const back = opener.current
        setTimeout(() => {
            try {
                back && back.focus && back.focus()
            } catch {}
        }, 0)
    }
    const lastFace = data.last && data.last.char ? eosFace(data.last.char, data.last.face) : null
    return (
        <>
            <div ref={rootRef} className={`eosWorldChips ${red ? "isCalm" : ""}`} data-stage={stage} data-eos-calm={red ? "1" : undefined}>
                <button
                    ref={orbBtn}
                    type="button"
                    className={`eosRwChip isOrbs ${data.last && data.last.tier === "gold" ? "isGold" : ""}`}
                    data-eos-chip="orbs"
                    aria-haspopup="dialog"
                    aria-expanded={open ? "true" : "false"}
                    aria-label={`${count} memory ${count === 1 ? "orb" : "orbs"} — open your shelf`}
                    onClick={openShelf}
                >
                    <span className="eosRwChipOrb" aria-hidden="true">
                        {lastFace ? <img src={lastFace} alt="" draggable={false} onError={(e) => (e.currentTarget.style.visibility = "hidden")} /> : null}
                        <i />
                    </span>
                    <b key={pop} className={`eosRwChipNum ${pop ? "isPop" : ""}`}>
                        {count}
                    </b>
                </button>
                <button type="button" className="eosRwChip isDays" data-eos-chip="days" aria-haspopup="dialog" aria-label={`${data.days} ${data.days === 1 ? "day" : "days"} you showed up this week — open your shelf`} onClick={openShelf}>
                    <span className="eosRwSun" aria-hidden="true" />
                    <b className="eosRwChipNum">{data.days}</b>
                </button>
            </div>
            {open ? <EosOrbShelf onClose={close} reduced={reduced} /> : null}
        </>
    )
}

// ---------------------------------------------------------------- EosOrbShelf (z 220)
function eosRewardsDayLabel(t) {
    const n = Number(t)
    if (!Number.isFinite(n) || n <= 0) return ""
    const d = new Date(n)
    const days = Math.floor((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 86400000)
    try {
        if (days <= 0) return "today"
        if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" })
        return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
    } catch {
        return eosToday(d)
    }
}
function eosRewardsOrbDetail(o) {
    if (!o) return ""
    const g = eosRewardsGame(o.gameId)
    const feel = o.emo && EOS_EMO[o.emo] ? eosRewardsEmoNoun(o.emo) : "A MOMENT"
    const nums = o.before != null && o.after != null ? ` ${o.before} → ${o.after}` : ""
    const bits = [o.mile ? `${o.mile} DAYS ✦` : `${feel}${nums}`, eosRewardsDayLabel(o.t)]
    if (g && !o.mile) bits.push(String(g.name).toUpperCase())
    if (o.tier === "gold") bits.push("CORE MEMORY ✦")
    return bits.filter(Boolean).join(" · ")
}
function eosRewardsFocusables(root) {
    if (!root) return []
    return Array.from(root.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), input:not([disabled])')).filter((el) => el.offsetParent !== null || el === document.activeElement)
}
function EosOrbShelf({ onClose, reduced = false }) {
    const st = useEosStore()
    const rev = React.useSyncExternalStore(EOS_REWARDS_BUS.subscribe, EOS_REWARDS_BUS.get, EOS_REWARDS_BUS.get)
    const red = eosCalm(reduced)
    const [inside, setInside] = React.useState(false)
    const [closing, setClosing] = React.useState(false)
    const [phone, setPhone] = React.useState(false)
    const [sel, setSel] = React.useState(null)
    const [arm, setArm] = React.useState(false)
    const [help, setHelp] = React.useState(false)
    const rootRef = React.useRef(null)
    const panelRef = React.useRef(null)
    const closeRef = React.useRef(null)
    const timers = React.useRef([])
    const onCloseRef = React.useRef(onClose)
    onCloseRef.current = onClose
    const data = React.useMemo(() => {
        const orbs = eosRewardsOrbs()
        const prefs = eosPrefs()
        return {
            orbs,
            week: eosWeek(),
            stats: eosMyStats(),
            skills: EOS_REWARDS_SKILLS.map((s) => eosSkillFor(s.id)).filter(Boolean),
            bonds: EOS_REWARDS_CHARS.map((c) => eosBondFor(c)),
            dust: eosRewardsDustState(),
            score: eosRewardsScore(),
            keep: prefs.keepHistory !== false,
            calmPref: !!prefs.calmVisuals,
        }
    }, [rev, st.calmVisuals, st.recordedFor])
    const T = (fn, ms) => {
        const id = setTimeout(fn, ms)
        timers.current.push(id)
        return id
    }
    const close = React.useCallback(() => {
        if (closing) return
        setClosing(true)
        setInside(false)
        T(() => onCloseRef.current && onCloseRef.current(), red ? 160 : 240)
    }, [closing, red])
    React.useEffect(() => {
        const el = rootRef.current
        const stage = el && el.closest ? el.closest(".releaseStage") : null
        const measure = () => setPhone(((stage && stage.clientWidth) || (typeof window !== "undefined" ? window.innerWidth : 1280)) < 600)
        measure()
        const raf = requestAnimationFrame(() => setInside(true))
        T(() => {
            try {
                closeRef.current && closeRef.current.focus({ preventScroll: true })
            } catch {}
        }, 30)
        window.addEventListener("resize", measure)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("resize", measure)
            timers.current.forEach(clearTimeout)
            timers.current = []
        }
    }, [])
    // focus trap: Tab / Shift+Tab cycle inside, Escape closes, focus that escapes is pulled back
    React.useEffect(() => {
        const onKey = (e) => {
            const panel = panelRef.current
            if (!panel) return
            if (e.key === "Escape") {
                e.preventDefault()
                e.stopPropagation()
                close()
                return
            }
            if (e.key !== "Tab") return
            const f = eosRewardsFocusables(panel)
            if (!f.length) return
            const first = f[0]
            const last = f[f.length - 1]
            const a = document.activeElement
            if (!panel.contains(a)) {
                e.preventDefault()
                first.focus()
            } else if (e.shiftKey && a === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && a === last) {
                e.preventDefault()
                first.focus()
            }
        }
        const onFocusIn = (e) => {
            const panel = panelRef.current
            if (panel && !panel.contains(e.target) && !closing) {
                const f = eosRewardsFocusables(panel)
                if (f.length) f[0].focus()
            }
        }
        document.addEventListener("keydown", onKey, true)
        document.addEventListener("focusin", onFocusIn)
        return () => {
            document.removeEventListener("keydown", onKey, true)
            document.removeEventListener("focusin", onFocusIn)
        }
    }, [close, closing])
    const pickDust = (d) => {
        if (!d.unlocked) return
        eosRewardsSetPref("dust", d.id)
        try {
            eosApi("dots").pulse?.("in")
        } catch {}
        eosTone(eosNote(4), 140, { type: "triangle", gain: 0.04 })
    }
    const doReset = () => {
        if (!arm) {
            setArm(true)
            T(() => setArm(false), 4000)
            return
        }
        setArm(false)
        setSel(null)
        eosRewardsReset()
    }
    const openHelp = () => {
        let used = false
        try {
            const fn = eosApi("safety").open
            if (typeof fn === "function") {
                fn("info")
                used = true
            }
        } catch {}
        if (!used) setHelp((v) => !v)
    }
    const lines = String(st.crisisLines || EOS_PROP_DEFAULTS.crisisLines)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    const crisisUrl = String(st.crisisUrl || EOS_PROP_DEFAULTS.crisisUrl || "")
    const emergency = String(st.emergencyText || EOS_PROP_DEFAULTS.emergencyText || "")
    const selOrb = sel ? data.orbs.find((o) => `${o.t}:${o.k}` === sel) : null
    const byChar = {}
    EOS_REWARDS_CHARS.forEach((c) => {
        byChar[c] = []
    })
    data.orbs.forEach((o) => {
        if (byChar[o.char]) byChar[o.char].push(o)
    })
    const s = data.stats
    return (
        <div
            ref={rootRef}
            className={`eosOrbShelf fs-mask ${inside ? "isIn" : ""} ${phone ? "isPhone" : ""} ${red ? "isCalm" : ""}`}
            {...EOS_PRIVATE_ATTRS}
            data-eos-shelf="1"
        >
            <div className="eosRwBackdrop" onClick={close} aria-hidden="true" />
            <div ref={panelRef} className="eosRwPanel" role="dialog" aria-modal="true" aria-labelledby="eosRwTitle">
                <header className="eosRwHead">
                    <span className="eosRwHeadOrb" aria-hidden="true">
                        <img src={eosFace("still", 15)} alt="" draggable={false} onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                    </span>
                    <h2 id="eosRwTitle" className="eosRwTitle">
                        Your memory shelf
                    </h2>
                    <button ref={closeRef} type="button" className="eosRwClose" aria-label="Close the shelf" onClick={close}>
                        ✕
                    </button>
                </header>

                <section className="eosRwStats" aria-label="Your numbers">
                    <div className="eosRwStat">
                        <b>
                            <span className="eosRwSun isSmall" aria-hidden="true" /> {data.week.days}
                        </b>
                        <small>{data.week.days === 1 ? "day this week" : "days this week"}</small>
                    </div>
                    <div className="eosRwStat">
                        <b>{data.week.lifetime}</b>
                        <small>days you showed up</small>
                    </div>
                    <div className="eosRwStat">
                        <b>{s.points}</b>
                        <small>points shifted</small>
                    </div>
                    <div className="eosRwStat">
                        <b>{data.orbs.length}</b>
                        <small>memory orbs</small>
                    </div>
                </section>
                {s.helps ? <p className="eosRwHelps">{s.helps.label}</p> : null}
                {data.week.next ? <p className="eosRwNote">a gold orb waits at {data.week.next} days you showed up · no streaks, nothing to lose</p> : null}

                <section className="eosRwShelves" aria-label="Character shelves">
                    {data.bonds
                        .map((b, i) => ({ b, i, n: byChar[b.char].length }))
                        .sort((x, y) => (y.n > 0) - (x.n > 0) || y.b.count - x.b.count || x.i - y.i)
                        .map(({ b }) => {
                        const list = byChar[b.char].slice().reverse()
                        const shownList = list.slice(0, 18)
                        const hue = EOS_REWARDS_CHAR_HUE[b.char]
                        const selHere = selOrb && selOrb.char === b.char
                        return (
                            <div key={b.char} className="eosRwShelf" style={{ "--eos-h": hue }} data-eos-shelf-char={b.char}>
                                <div className="eosRwShelfHead">
                                    <b className="eosRwShelfName">{b.name}</b>
                                    <span className="eosRwPips" aria-label={`bond level ${b.level} of 5`}>
                                        {EOS_REWARDS_BOND_LEVELS.map((n, i) => (
                                            <i key={n} className={i < b.level ? "on" : ""} />
                                        ))}
                                    </span>
                                    <small className="eosRwShelfLine">{b.line}</small>
                                </div>
                                <div className="eosRwOrbRow">
                                    {shownList.map((o) => {
                                        const id = `${o.t}:${o.k}`
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                className={`eosRwOrb ${o.tier === "gold" ? "isGold" : "isSilver"} ${sel === id ? "isSel" : ""}`}
                                                aria-pressed={sel === id ? "true" : "false"}
                                                aria-label={eosRewardsOrbDetail(o)}
                                                onClick={() => setSel(sel === id ? null : id)}
                                            >
                                                <span className="eosRwOrbBall">
                                                    <img src={eosFace(o.char, o.face)} alt="" draggable={false} loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                                                </span>
                                            </button>
                                        )
                                    })}
                                    {list.length > shownList.length ? <span className="eosRwMore">+{list.length - shownList.length}</span> : null}
                                    {b.locked != null ? (
                                        <span className="eosRwOrb isLocked" title={`bond ${b.level + 1}`}>
                                            <span className="eosRwOrbBall">
                                                <img src={eosFace(b.char, b.locked)} alt="" draggable={false} loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                                            </span>
                                            <small>bond {b.level + 1}</small>
                                        </span>
                                    ) : null}
                                </div>
                                {selHere ? (
                                    <p className="eosRwDetail" aria-live="polite">
                                        {eosRewardsOrbDetail(selOrb)}
                                    </p>
                                ) : null}
                            </div>
                        )
                        })}
                </section>

                <section className="eosRwSkills" aria-label="Skills">
                    <h3 className="eosRwH3">Skills you're building</h3>
                    <div className="eosRwSkillGrid">
                        {data.skills.map((k) => (
                            <div key={k.id} className={`eosRwSkill ${k.count ? "isOn" : ""}`} style={{ "--eos-h": k.hue, "--eos-k": k.progress }} data-eos-skill={k.id}>
                                <b>
                                    <span aria-hidden="true">{k.glyph}</span> {k.name}
                                </b>
                                <em>{k.rank || "not yet"}</em>
                                <i className="eosRwBar">
                                    <i />
                                </i>
                                <small>{k.count ? k.can : k.games.length ? `try ${k.games[0].name}` : "any game can start it"}</small>
                            </div>
                        ))}
                    </div>
                    <p className="eosRwNote">Practise when calm — it works better when you need it.</p>
                </section>

                <section className="eosRwDust" aria-label="Thought dust style">
                    <h3 className="eosRwH3">Thought dust</h3>
                    <div className="eosRwDustRow" role="radiogroup" aria-label="Thought dust style">
                        {data.dust.map((d) => (
                            <button
                                key={d.id}
                                type="button"
                                role="radio"
                                aria-checked={d.selected ? "true" : "false"}
                                aria-disabled={d.unlocked ? "false" : "true"}
                                className={`eosRwDustOpt ${d.selected ? "isSel" : ""} ${d.unlocked ? "" : "isLocked"}`}
                                onClick={() => pickDust(d)}
                                data-eos-dust-opt={d.id}
                            >
                                <span className="eosRwDustSwatch" aria-hidden="true">
                                    {d.dots.map((c, i) => (
                                        <i key={i} style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                                    ))}
                                </span>
                                <b>{d.label}</b>
                                <small>{d.unlocked ? (d.selected ? "on" : "tap") : `⚡ ${d.at}`}</small>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="eosRwControls" aria-label="Settings">
                    <button type="button" role="switch" aria-checked={data.calmPref ? "true" : "false"} className="eosRwSwitch" onClick={() => eosRewardsSetPref("calmVisuals", !data.calmPref)}>
                        <i aria-hidden="true" />
                        <span>◐ calm visuals</span>
                    </button>
                    <button type="button" role="switch" aria-checked={data.keep ? "false" : "true"} className="eosRwSwitch" data-eos-keep={data.keep ? "on" : "off"} onClick={() => eosRewardsSetPref("keepHistory", !data.keep)}>
                        <i aria-hidden="true" />
                        <span>Don't keep history on this device</span>
                    </button>
                    {!data.keep ? <p className="eosRwNote">Nothing new is saved. This visit's orbs stay until you close the page.</p> : null}
                </section>

                <section className="eosRwActions">
                    {data.week.days > 0 ? <EosShareButton week className="eosRwWeekShare" /> : null}
                    <button type="button" className="eosRwLink isHelp" onClick={openHelp} aria-expanded={help ? "true" : "false"}>
                        💛 Need to talk to someone?
                    </button>
                    {help ? (
                        <div className="eosRwHelp" role="region" aria-label="Support lines">
                            <ul>
                                {lines.map((l) => {
                                    const [lab, num] = l.split("·").map((x) => x.trim())
                                    const tel = num && /^[0-9 +()-]{3,}$/.test(num) ? num.replace(/[^0-9+]/g, "") : null
                                    return (
                                        <li key={l}>
                                            <span>{lab}</span>
                                            {tel ? <a href={`tel:${tel}`}>{num}</a> : <b>{num || ""}</b>}
                                        </li>
                                    )
                                })}
                            </ul>
                            {crisisUrl ? (
                                <a className="eosRwLink" href={crisisUrl} target="_blank" rel="noopener noreferrer">
                                    find a helpline near you ↗
                                </a>
                            ) : null}
                            {emergency ? <p className="eosRwNote">{emergency}</p> : null}
                        </div>
                    ) : null}
                    <button type="button" className={`eosRwLink isReset ${arm ? "isArmed" : ""}`} onClick={doReset} data-eos-reset={arm ? "armed" : "idle"}>
                        {arm ? "tap again to clear your history" : "reset my history"}
                    </button>
                </section>
                <footer className="eosRwFoot">{EOS_DISCLAIMER}</footer>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- CSS
const EOS_RW = `${EOS_A}`
const EOS_REWARDS_CSS = `
${EOS_RW} .eosWorldChips{position:absolute;top:12px;right:12px;z-index:170;display:flex;gap:8px;align-items:center;pointer-events:none;font-family:var(--eos-font)}
${EOS_RW}:has(.releaseChoiceMenu) .eosWorldChips{display:none!important}
@media (max-width:560px){${EOS_RW} .releaseStage:has(.eosCheckIn[data-step="2"]) .eosWorldChips{display:none!important}${EOS_RW} .eosWorldChips{top:10px;right:10px;gap:6px}}
${EOS_RW} .eosWorldChips .eosRwChip{pointer-events:auto;position:relative;display:inline-flex!important;align-items:center;gap:7px;height:44px!important;min-width:44px;padding:0 14px 0 6px!important;margin:0!important;border-radius:999px!important;cursor:pointer;
background:linear-gradient(180deg,rgba(48,40,120,.86),rgba(16,14,52,.9))!important;border:1.5px solid rgba(255,255,255,.24)!important;color:#fff!important;
box-shadow:0 4px 0 rgba(6,6,30,.55),0 10px 24px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.28)!important;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
transition:transform .18s cubic-bezier(.3,1.6,.4,1),filter .18s ease!important;font-family:var(--eos-font)!important;text-shadow:none!important;-webkit-tap-highlight-color:transparent}
${EOS_RW} .eosWorldChips .eosRwChip.isDays{padding-left:9px!important}
${EOS_RW} .eosWorldChips .eosRwChip:hover{filter:brightness(1.12);transform:translateY(-1px)}
${EOS_RW} .eosWorldChips .eosRwChip:active{transform:scale(.94)}
${EOS_RW} .eosWorldChips .eosRwChip:focus-visible{outline:3px solid var(--eos-gold-1)!important;outline-offset:3px}
${EOS_RW} .eosRwChipNum{display:inline-block;min-width:12px;font:900 15px/1 var(--eos-font)!important;font-variant-numeric:tabular-nums;color:#fff;letter-spacing:.02em}
${EOS_RW} .eosRwChipNum.isPop{animation:eosRewardsPop .6s cubic-bezier(.3,1.6,.4,1) both}
${EOS_RW} .eosRwChipOrb{position:relative;display:block;width:32px;height:32px;border-radius:50%;overflow:hidden;flex:none;
background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.6),rgba(255,255,255,0) 30%),radial-gradient(circle at 50% 62%,#c9d6ff,#7f8fd6 62%,#3b3f86);box-shadow:inset 0 -3px 6px rgba(20,8,48,.45),0 0 10px rgba(160,190,255,.5)}
${EOS_RW} .eosRwChip.isGold .eosRwChipOrb{background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.7),rgba(255,255,255,0) 30%),radial-gradient(circle at 50% 62%,#ffe58a,#ffb23e 62%,#c25a12);box-shadow:inset 0 -3px 6px rgba(90,30,0,.4),0 0 12px rgba(255,200,90,.75)}
${EOS_RW} .eosRwChipOrb img{position:absolute;inset:3px;width:26px;height:26px;object-fit:contain;pointer-events:none}
${EOS_RW} .eosRwChipOrb i{position:absolute;left:6px;top:4px;width:11px;height:6px;border-radius:50%;background:rgba(255,255,255,.75);filter:blur(.5px)}
${EOS_RW} .eosRwSun{position:relative;display:inline-block;width:26px;height:26px;flex:none;border-radius:50%;
background:radial-gradient(circle,#fff6c4 0 22%,#ffd04a 23% 36%,rgba(255,178,62,0) 37%),repeating-conic-gradient(from 0deg,#ffb23e 0 9deg,rgba(255,178,62,0) 9deg 45deg);
-webkit-mask:radial-gradient(circle,#000 0 62%,transparent 63%);mask:radial-gradient(circle,#000 0 62%,transparent 63%);filter:drop-shadow(0 0 6px rgba(255,200,90,.8));animation:eosRewardsSpin 24s linear infinite}
${EOS_RW} .eosRwSun.isSmall{width:22px;height:22px;vertical-align:-3px}
${EOS_RW} [data-eos-calm="1"] .eosRwSun,${EOS_RW} .isCalm .eosRwSun{animation:none}

${EOS_RW} .eosOrbShelf{position:absolute;inset:0;z-index:220;display:flex;align-items:center;justify-content:center;font-family:var(--eos-font);color:#fff;pointer-events:auto}
${EOS_RW} .eosRwBackdrop{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(52,30,110,.55),rgba(6,4,22,.86));-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .24s ease}
${EOS_RW} .eosOrbShelf.isIn .eosRwBackdrop{opacity:1}
${EOS_RW} .eosRwPanel{position:relative;box-sizing:border-box;width:min(780px,calc(100% - 32px));max-height:calc(100% - 32px);overflow:auto;overscroll-behavior:contain;padding:18px 22px 16px;border-radius:28px;
background:radial-gradient(120% 60% at 50% 0%,rgba(140,110,255,.35),rgba(140,110,255,0) 60%),linear-gradient(180deg,#2c2170 0%,#1b1550 45%,#110d36 100%);
border:1.5px solid rgba(255,255,255,.2);box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.25);
opacity:0;transform:translateY(22px) scale(.97);transition:opacity .22s ease,transform .34s cubic-bezier(.2,.9,.25,1.08);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.3) transparent}
${EOS_RW} .eosOrbShelf.isIn .eosRwPanel{opacity:1;transform:none}
${EOS_RW} .eosOrbShelf.isPhone{align-items:flex-end}
${EOS_RW} .eosOrbShelf.isPhone .eosRwPanel{width:100%;max-height:90%;border-radius:26px 26px 0 0;padding:14px 16px 18px;transform:translateY(60px)}
${EOS_RW} .eosOrbShelf.isPhone.isIn .eosRwPanel{transform:none}
${EOS_RW} .eosOrbShelf.isCalm .eosRwPanel,${EOS_RW} .eosOrbShelf.isCalm.isPhone .eosRwPanel{transform:none!important;transition:opacity .16s linear}
${EOS_RW} .eosRwHead{position:sticky;top:-18px;z-index:2;display:flex;align-items:center;gap:12px;margin:-18px -22px 10px;padding:14px 18px 10px 22px;background:linear-gradient(180deg,#2c2170 70%,rgba(44,33,112,0))}
${EOS_RW} .eosOrbShelf.isPhone .eosRwHead{top:-14px;margin:-14px -16px 8px;padding:12px 12px 8px 16px}
${EOS_RW} .eosRwHeadOrb{position:relative;width:44px;height:44px;border-radius:50%;overflow:hidden;flex:none;background:radial-gradient(circle at 50% 62%,#ffe58a,#ffb23e 62%,#b85a14);box-shadow:0 0 18px rgba(255,200,90,.6)}
${EOS_RW} .eosRwHeadOrb img{position:absolute;inset:4px;width:36px;height:36px;object-fit:contain}
${EOS_RW} .eosRwTitle{flex:1;margin:0;font:900 clamp(20px,2.4vw,26px)/1.05 var(--eos-font);letter-spacing:.02em;color:#fff;text-shadow:0 3px 0 rgba(20,8,48,.55)}
${EOS_RW} .eosOrbShelf button{font-family:var(--eos-font);-webkit-tap-highlight-color:transparent}
${EOS_RW} .eosOrbShelf button:focus-visible,${EOS_RW} .eosOrbShelf a:focus-visible{outline:3px solid var(--eos-gold-1)!important;outline-offset:2px}
${EOS_RW} .eosRwClose{width:44px;height:44px;border-radius:50%!important;border:1.5px solid rgba(255,255,255,.25)!important;background:rgba(255,255,255,.1)!important;color:#fff!important;font:900 18px/1 var(--eos-font)!important;cursor:pointer;flex:none}
${EOS_RW} .eosRwClose:hover{background:rgba(255,255,255,.2)!important}
${EOS_RW} .eosRwStats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:4px 0 8px}
${EOS_RW} .eosRwStat{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:10px 6px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);text-align:center}
${EOS_RW} .eosRwStat b{display:inline-flex;align-items:center;gap:6px;font:900 26px/1 var(--eos-font);font-variant-numeric:tabular-nums;background:linear-gradient(180deg,#fff7c8,#ffd04a 55%,#ff9a2e);-webkit-background-clip:text;background-clip:text;color:transparent}
${EOS_RW} .eosRwStat small{font:800 13px/1.1 var(--eos-font);letter-spacing:.03em;color:rgba(235,240,255,.9)}
@media (max-width:560px){${EOS_RW} .eosRwStats{grid-template-columns:repeat(2,1fr)}${EOS_RW} .eosRwStat small{font-size:13px}}
${EOS_RW} .eosRwHelps{margin:6px 2px;font:800 15px/1.25 var(--eos-font);color:#ffe9a8}
${EOS_RW} .eosRwNote{margin:6px 2px;font:700 13px/1.3 var(--eos-font);color:rgba(225,232,255,.86)}
${EOS_RW} .eosRwH3{margin:14px 2px 8px;font:900 15px/1 var(--eos-font);letter-spacing:.08em;text-transform:uppercase;color:#cfd8ff}
${EOS_RW} .eosRwShelves{display:flex;flex-direction:column;gap:8px;margin-top:10px}
${EOS_RW} .eosRwShelf{position:relative;padding:10px 12px 12px;border-radius:20px;background:linear-gradient(180deg,hsla(var(--eos-h),70%,60%,.14),hsla(var(--eos-h),70%,40%,.05));border:1px solid hsla(var(--eos-h),90%,75%,.22)}
${EOS_RW} .eosRwShelf::after{content:"";position:absolute;left:12px;right:12px;bottom:8px;height:6px;border-radius:6px;background:linear-gradient(180deg,hsla(var(--eos-h),60%,75%,.35),hsla(var(--eos-h),60%,30%,.25));box-shadow:0 3px 6px rgba(0,0,0,.35);pointer-events:none}
${EOS_RW} .eosRwShelfHead{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-bottom:6px}
${EOS_RW} .eosRwShelfName{font:900 15px/1 var(--eos-font);letter-spacing:.1em;color:hsl(var(--eos-h),100%,84%)}
${EOS_RW} .eosRwPips{display:inline-flex;gap:4px}
${EOS_RW} .eosRwPips i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.18)}
${EOS_RW} .eosRwPips i.on{background:var(--eos-gold-1);box-shadow:0 0 6px var(--eos-gold-2)}
${EOS_RW} .eosRwShelfLine{font:700 13px/1.2 var(--eos-font);color:rgba(230,236,255,.88)}
${EOS_RW} .eosRwOrbRow{position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px;min-height:52px;padding-bottom:8px}
${EOS_RW} .eosRwOrb{position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:2px;width:48px;height:48px;min-width:44px;min-height:44px;padding:0!important;border:0!important;background:none!important;cursor:pointer}
${EOS_RW} .eosRwOrbBall{position:relative;display:block;width:44px;height:44px;border-radius:50%;overflow:hidden;
background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.55),rgba(255,255,255,0) 28%),radial-gradient(circle at 50% 62%,hsla(var(--eos-h),95%,62%,.95),hsla(var(--eos-h),90%,32%,1) 70%);
box-shadow:inset 0 -4px 8px rgba(20,8,48,.45),0 4px 0 rgba(6,6,30,.4),0 0 0 2.5px #dfe6f5,0 0 12px rgba(220,230,255,.45);transition:transform .18s cubic-bezier(.3,1.6,.4,1)}
${EOS_RW} .eosRwOrb.isGold .eosRwOrbBall{box-shadow:inset 0 -4px 8px rgba(20,8,48,.45),0 4px 0 rgba(6,6,30,.4),0 0 0 3px #ffc443,0 0 16px rgba(255,200,90,.85)}
${EOS_RW} .eosRwOrbBall img{position:absolute;inset:4px;width:36px;height:36px;object-fit:contain;pointer-events:none}
${EOS_RW} .eosRwOrb:hover .eosRwOrbBall,${EOS_RW} .eosRwOrb.isSel .eosRwOrbBall{transform:translateY(-3px) scale(1.08)}
${EOS_RW} .eosRwOrb.isSel .eosRwOrbBall{box-shadow:inset 0 -4px 8px rgba(20,8,48,.45),0 0 0 3px #fff,0 0 22px hsla(var(--eos-h),100%,70%,.9)}
${EOS_RW} .eosRwOrb.isLocked{cursor:default;width:auto;height:auto}
${EOS_RW} .eosRwOrb.isLocked .eosRwOrbBall{background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 2px rgba(255,255,255,.22)}
${EOS_RW} .eosRwOrb.isLocked img{filter:brightness(0) invert(1) opacity(.26)}
${EOS_RW} .eosRwOrb.isLocked small{font:800 13px/1 var(--eos-font);color:rgba(230,236,255,.85);white-space:nowrap}
${EOS_RW} .eosRwMore{align-self:center;font:900 13px/1 var(--eos-font);color:rgba(255,255,255,.85);padding:0 4px}
${EOS_RW} .eosRwDetail{position:relative;z-index:1;margin:6px 0 2px;padding:8px 12px;border-radius:14px;background:rgba(8,8,30,.6);font:900 15px/1.2 var(--eos-font);letter-spacing:.03em;color:#fff;animation:eosRewardsRise .3s ease-out both}
${EOS_RW} .eosRwSkillGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
@media (max-width:560px){${EOS_RW} .eosRwSkillGrid{grid-template-columns:repeat(2,1fr)}}
${EOS_RW} .eosRwSkill{display:flex;flex-direction:column;gap:5px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);opacity:.78}
${EOS_RW} .eosRwSkill.isOn{opacity:1;background:linear-gradient(180deg,hsla(var(--eos-h),80%,60%,.2),hsla(var(--eos-h),80%,40%,.06));border-color:hsla(var(--eos-h),90%,75%,.35)}
${EOS_RW} .eosRwSkill b{font:900 14px/1.05 var(--eos-font);letter-spacing:.06em;color:#fff}
${EOS_RW} .eosRwSkill b span{color:hsl(var(--eos-h),100%,78%)}
${EOS_RW} .eosRwSkill em{font:900 13px/1 var(--eos-font);font-style:normal;letter-spacing:.08em;color:var(--eos-gold-1)}
${EOS_RW} .eosRwSkill:not(.isOn) em{color:rgba(230,236,255,.7)}
${EOS_RW} .eosRwBar{position:relative;display:block;height:6px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden}
${EOS_RW} .eosRwBar i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--eos-k,0) * 100%);border-radius:6px;background:linear-gradient(90deg,hsl(var(--eos-h),95%,62%),var(--eos-gold-1))}
${EOS_RW} .eosRwSkill small{font:700 13px/1.25 var(--eos-font);color:rgba(230,236,255,.88)}
${EOS_RW} .eosRwDustRow{display:flex;flex-wrap:wrap;gap:8px}
${EOS_RW} .eosRwDustOpt{display:inline-flex;flex-direction:column;align-items:center;gap:4px;min-width:96px;padding:8px 10px!important;border-radius:16px!important;border:1.5px solid rgba(255,255,255,.16)!important;background:rgba(255,255,255,.06)!important;color:#fff!important;cursor:pointer}
${EOS_RW} .eosRwDustOpt.isSel{border-color:var(--eos-gold-1)!important;background:rgba(255,215,110,.14)!important;box-shadow:0 0 16px rgba(255,200,90,.35)}
${EOS_RW} .eosRwDustOpt.isLocked{cursor:default}${EOS_RW} .eosRwDustOpt.isLocked .eosRwDustSwatch{opacity:.4;filter:saturate(.3)}${EOS_RW} .eosRwDustOpt.isLocked b{color:rgba(230,236,255,.75)}
${EOS_RW} .eosRwDustOpt b{font:900 13px/1 var(--eos-font);letter-spacing:.04em}
${EOS_RW} .eosRwDustOpt small{font:800 13px/1 var(--eos-font);color:rgba(230,236,255,.85)}
${EOS_RW} .eosRwDustSwatch{display:flex;gap:5px;height:14px;align-items:center}
${EOS_RW} .eosRwDustSwatch i{display:block;width:7px;height:7px;border-radius:50%}
${EOS_RW} .eosRwDustSwatch i:nth-child(2n){width:5px;height:5px}
${EOS_RW} .eosRwControls{display:flex;flex-direction:column;gap:6px;margin-top:14px}
${EOS_RW} .eosRwSwitch{display:flex!important;align-items:center;gap:12px;min-height:44px;padding:6px 12px!important;border-radius:14px!important;border:1px solid rgba(255,255,255,.12)!important;background:rgba(255,255,255,.05)!important;color:#fff!important;font:800 15px/1.1 var(--eos-font)!important;text-align:left;cursor:pointer}
${EOS_RW} .eosRwSwitch>i{position:relative;flex:none;width:44px;height:26px;border-radius:999px;background:rgba(255,255,255,.2);transition:background .2s ease}
${EOS_RW} .eosRwSwitch>i::after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.35);transition:transform .2s cubic-bezier(.3,1.4,.4,1)}
${EOS_RW} .eosRwSwitch[aria-checked="true"]>i{background:linear-gradient(90deg,#3fe6ff,#7c6bff)}
${EOS_RW} .eosRwSwitch[aria-checked="true"]>i::after{transform:translateX(18px)}
${EOS_RW} .eosRwActions{display:flex;flex-direction:column;align-items:stretch;gap:6px;margin-top:14px}
${EOS_RW} .eosRwActions .eosRwShareWrap{display:flex;justify-content:center}
${EOS_RW} .eosRwLink{min-height:44px;padding:8px 12px!important;border:0!important;background:none!important;color:#cfe0ff!important;font:800 15px/1.2 var(--eos-font)!important;text-decoration:underline;text-underline-offset:3px;cursor:pointer;text-align:center}
${EOS_RW} .eosRwLink.isHelp{color:#ffe08a!important}
${EOS_RW} .eosRwLink.isReset{color:rgba(230,236,255,.8)!important;font-size:13px!important}
${EOS_RW} .eosRwLink.isReset.isArmed{color:#ffb0a0!important;text-decoration:none;background:rgba(255,120,100,.14)!important;border-radius:12px!important}
${EOS_RW} .eosRwHelp{padding:10px 14px;border-radius:16px;background:rgba(255,224,138,.1);border:1px solid rgba(255,224,138,.3)}
${EOS_RW} .eosRwHelp ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}
${EOS_RW} .eosRwHelp li{display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:32px;font:800 14px/1.2 var(--eos-font);color:#fff}
${EOS_RW} .eosRwHelp li a{display:inline-flex;align-items:center;min-height:44px;color:#ffe08a;font-weight:900}
${EOS_RW} .eosRwHelp li b{color:#ffe08a}
${EOS_RW} .eosRwFoot{margin:12px 2px 0;padding-top:10px;border-top:1px solid rgba(255,255,255,.12);font:700 13px/1.35 var(--eos-font);color:rgba(220,228,255,.8);text-align:center}
${EOS_RW} .eosRwShareWrap{position:relative;display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 10px}
${EOS_RW} .eosRwShare:not(.isLink){display:inline-flex!important;align-items:center;justify-content:center;min-height:48px;padding:0 26px!important;border-radius:999px!important;border:0!important;cursor:pointer;
background:linear-gradient(180deg,#fff3b0,#ffc443 55%,#ff9a2e)!important;color:#3a1800!important;font:900 16px/1 var(--eos-font)!important;letter-spacing:.06em;text-shadow:none!important;box-shadow:0 5px 0 #b8560f,0 12px 26px rgba(255,150,40,.4)!important}
${EOS_RW} .eosRwShare:not(.isLink):active{transform:translateY(3px);box-shadow:0 2px 0 #b8560f!important}
${EOS_RW} .eosRwShare[disabled]{opacity:.8;cursor:progress}
${EOS_RW} .eosRwShare.isLink,${EOS_RW} .eosRwShareName{min-height:44px;padding:6px 8px!important;border:0!important;background:none!important;box-shadow:none!important;color:#d8e4ff!important;font:800 13px/1.2 var(--eos-font)!important;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
${EOS_RW} .eosRwShareName{text-decoration:none;color:rgba(220,230,255,.85)!important}
${EOS_RW} .eosRwToast{position:absolute;left:50%;bottom:calc(100% + 6px);translate:-50% 0;z-index:5;white-space:nowrap;padding:8px 14px;border-radius:999px;background:rgba(10,12,40,.94);border:1px solid rgba(255,255,255,.2);font:800 13px/1 var(--eos-font);color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.4);animation:eosRewardsPop .3s ease both;pointer-events:none}
@keyframes eosRewardsPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.18);opacity:1}100%{transform:scale(1)}}
@keyframes eosRewardsSpin{to{rotate:360deg}}
@keyframes eosRewardsRise{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
/* phone check-in (step 1): the title spans the stage width, so the chips fold into ONE 44 px orb button in the
   corner with a count badge (days live in the shelf); step 2 hides them (check-in rule, repeated above) */
${EOS_RW} .releaseStage:has(.eosCheckIn.isPhone[data-step="1"]) .eosWorldChips{top:2px;right:2px}
${EOS_RW} .releaseStage:has(.eosCheckIn.isPhone[data-step="1"]) .eosWorldChips .eosRwChip.isDays{display:none!important}
${EOS_RW} .releaseStage:has(.eosCheckIn.isPhone[data-step="1"]) .eosWorldChips .eosRwChip.isOrbs{width:44px!important;padding:0!important;justify-content:center;background:none!important;border:0!important;box-shadow:none!important;-webkit-backdrop-filter:none;backdrop-filter:none}
${EOS_RW} .releaseStage:has(.eosCheckIn.isPhone[data-step="1"]) .eosWorldChips .eosRwChipOrb{width:38px;height:38px}
${EOS_RW} .releaseStage:has(.eosCheckIn.isPhone[data-step="1"]) .eosWorldChips .eosRwChipOrb img{inset:3px;width:32px;height:32px}
${EOS_RW} .releaseStage:has(.eosCheckIn.isPhone[data-step="1"]) .eosWorldChips .isOrbs .eosRwChipNum{position:absolute;right:-4px;bottom:-4px;min-width:24px;height:24px;padding:0 6px;box-sizing:border-box;border-radius:999px;display:grid;place-items:center;background:#1b1550;border:1.5px solid rgba(255,255,255,.4);font-size:15px!important}
@media (prefers-reduced-motion:reduce){${EOS_RW} .eosRwSun{animation:none}${EOS_RW} .eosRwChipNum.isPop,${EOS_RW} .eosRwDetail,${EOS_RW} .eosRwToast{animation:none}${EOS_RW} .eosRwPanel{transform:none!important;transition:opacity .16s linear}}
`
eosCss("rewards", EOS_REWARDS_CSS)

eosExpose("rewards", {
    grantForShift: eosGrantForShift,
    EosShareButton,
    eosMakeShareCard,
    eosBondFor,
    eosSkillFor,
    eosWeek,
    eosMyStats,
    EosWorldChips,
    EosOrbShelf,
    EOS_REWARDS_SKILLS,
    EOS_REWARDS_CSS,
    bondFor: eosBondFor,
    skillFor: eosSkillFor,
    week: eosWeek,
    stats: eosMyStats,
    makeShareCard: eosMakeShareCard,
    caption: eosRewardsCaption,
    skillOfGame: eosRewardsSkillOfGame,
    sceneChar: eosRewardsSceneChar,
    noteMoment: eosRewardsNoteMoment,
    orbs: eosRewardsOrbs,
    bonds: eosRewardsBonds,
    ledger: eosRewardsLedger,
    dust: eosRewardsDustState,
    reset: eosRewardsReset,
    dev: EOS_REWARDS_DEV,
    mem: EOS_REWARDS_MEM,
})
