// ============================================================================================
// 45_eos_router.jsx · task "router" · docs/EOS_SPEC.md §7 (Router v1.2) + §6.4 hand-off
// --------------------------------------------------------------------------------------------
// "Bottom-up when hot, top-down when warm": the feeling the person names (or the words they type)
// picks the game that relieves THAT state. High 7-10 → body first (breath, grounding, cool-down),
// mid 4-6 → the emotion's signature mechanic, low 0-3 → meaning and humour. Express launches use
// the high band. Any safety flag → only calm, never-destructive games (EOS_GENTLE_IDS).
//
// Public (spec names, exempt from the task prefix):
//   EOS_EMOTION_ROUTES, EOS_ROUTE_RULES, EOS_VAULT, EOS_BENCH, EOS_GENTLE_IDS, EOS_SECOND_ACT,
//   EOS_LOUD_IDS, EOS_GAME_SECONDS,
//   EosRouteGame(text, played = [], excludeId = null)  → GAMES object | null   (I2-E4 / I2-E5)
//   EosSecondAct(emotion, lastId, delta, text?)         → GAMES object | null   (shift meter "ONE MORE ▶")
//   EosRoutePreview(emotion, before)                    → {id, name, seconds, best, band, emotion} | null
//   <EosMenuGroup played gameChoice onPick/>            → "FOR YOUR ANGER" group in the game menu (I2-E10)
//   EosProfileOverride(input)                           → arcade emotion profile | null (I2-E11)
//
// Every function is PURE with respect to the store and localStorage (safe in render / useMemo): it only
// reads EOS_STORE, eos_sessions_v1 and the arcade's played list. The one write is core's documented
// eosTextSafety(text) (records the flag TYPE of the composer text, never text) inside EosRouteGame.
//
// Release 1 (owner decision): games 115-120 are deferred and their modules do not exist. Every id that is
// not registered in GAMES at call time is skipped, so each route falls through to the next best EXISTING
// game of the same list (e.g. shame.mid 115 → 104 VOLUME KNOB, overwhelm.mid 120 → 93 SPACE MAKER,
// fear.mid 118 → 31 BACK SEAT, numb 117 → 68 DRUM IT, jealous 119 → 47 UNFOLLOW on desktop / 45 MAGNETS on a
// phone, good 117/119 → 106 TINY SOUNDTRACK). Nothing ever returns an unregistered id, nothing throws (every
// entry point is try/catch → null = the arcade's own chooser).
//
// Round-1 review decisions (v1.2.1): act 2 takes its band from the episode's ENTRY level (st.before, §7.3), so a
// panic peak that dropped 8 → 3 gets CLEANSE, never DRAMA MACHINE; games that stall at phone width are demoted
// there (EOS_ROUTER_PHONE_FRAGILE); GOOD never gets a "nope" / trade-away / villain gesture; a SOFT flag keeps
// the anger hero 112 (slow breath cool-down) for anger only, strong flags stay gentle-only; the variety swap
// never picks a penalised #2 (late-night loud, recency, path, phone, negative history).
// ============================================================================================

// ---------------------------------------------------------------- §7.2 tables (paste-ready, ids best-first)
const EOS_EMOTION_ROUTES = {
    panic: { high: [111, 109, 102, 36, 65, 69, 66], mid: [111, 102, 36, 44, 77, 113, 65, 55, 11], low: [105, 55, 104, 1, 113] },
    anxiety: { high: [111, 113, 102, 109, 66], mid: [113, 95, 32, 101, 24, 34, 31, 85, 67], low: [1, 104, 86, 30, 105, 72] },
    anger: { high: [112, 109, 65, 111, 100], mid: [112, 100, 6, 4, 15, 2, 18, 61, 68, 101, 8, 13, 14], low: [52, 107, 71, 64, 11, 37, 53] },
    overthinking: { high: [111, 61, 116, 34], mid: [116, 34, 61, 104, 43, 41, 22, 29, 6, 99, 19], low: [105, 107, 52, 104, 59, 98] },
    overwhelm: { high: [111, 120, 93, 21], mid: [120, 93, 95, 21, 87, 32, 30, 28], low: [120, 85, 30, 39, 81] },
    sad: { high: [110, 114, 109], mid: [110, 114, 33, 40, 75, 106], low: [106, 88, 117, 114] },
    lonely: { high: [114, 110, 115], mid: [114, 106, 88, 115, 110, 117], low: [117, 106, 114, 115, 88] },
    shame: { high: [115, 109, 110], mid: [115, 104, 84, 110, 109, 79, 75], low: [107, 53, 79, 51] },
    fear: { high: [111, 102, 113], mid: [118, 31, 97, 53, 86, 89], low: [107, 105, 53] },
    jealous: { high: [119, 115, 47], mid: [119, 47, 45, 25, 115, 41], low: [119, 88, 117] },
    numb: { high: [117, 68, 1, 100, 6, 74], mid: [117, 68, 1, 106, 107, 25, 100, 6, 74], low: [117, 106, 107, 25, 1] },
    good: { high: [117, 119, 106, 88], mid: [117, 119, 106, 88, 1, 25, 105, 107], low: [119, 117, 106, 88, 53, 107] },
    general: { high: [111, 1, 102, 109], mid: [1, 102, 100, 110, 25, 93], low: [1, 105, 107, 25] },
}
// Conditions: an id is eligible only if its rule passes on the user's text.
const EOS_ROUTE_RULES = {
    89: (text) => /\b(or|vs\.?|versus)\b/i.test(eosNormText(text)), // DOOR A / B needs a choice
    118: (text) => !eosRealThreat(text), // no jokes / looming shapes about a real danger
    105: (text) => !eosRealThreat(text),
    53: (text) => !eosRealThreat(text),
}
// Never auto-routed (still in the menu, playable, untouched): fake, passive, hidden or anti-relief mechanics.
const EOS_VAULT = new Set([5, 9, 10, 12, 17, 23, 35, 38, 42, 50, 54, 56, 57, 62, 63, 73, 76, 78, 80, 82, 83, 90, 91, 92, 94, 96, 108])
// Never auto-routed either: fine games that a better routed game covers (§7.6). Menu, arrows and fixes still apply.
// Launch 30: 6 ZAP (the founder's real zapper, F4) left the bench and is routed for anger / overthinking / numb.
const EOS_BENCH = new Set([3, 7, 16, 20, 26, 27, 46, 48, 49, 58, 60, 70, 103])
// While ANY safety flag is set only these are routed (calm, never destructive, never repeats words, no cutting / beat imagery).
const EOS_GENTLE_IDS = [113, 111, 109, 110, 102, 95, 114, 115, 106, 40, 120, 119]
// Act 2 ("ONE MORE ▶") per emotion, best-first (same filters as EosRouteGame).
const EOS_SECOND_ACT = {
    panic: [111, 109, 102],
    anxiety: [113, 111, 102],
    anger: [112, 109, 65],
    overthinking: [113, 116, 111],
    overwhelm: [120, 93, 111],
    sad: [114, 106, 110],
    lonely: [114, 106, 117],
    shame: [115, 109, 110],
    fear: [118, 111, 102],
    jealous: [119, 115, 117],
    numb: [117, 68, 106],
    good: [119, 117, 106],
    general: [111, 1, 110],
}
// Late night (23:00-05:00 local): loud / bright games are demoted; 117 is dropped unless the feeling is numb.
const EOS_LOUD_IDS = new Set([117, 68, 2, 4, 6, 15])
// Typical seconds for the CTA sub-line (new games register theirs via eosRegisterGame opts.seconds).
const EOS_GAME_SECONDS = { 1: 15, 2: 20, 4: 18, 15: 20, 18: 15, 25: 15, 36: 25, 65: 20, 93: 25, 95: 20, 100: 25, 102: 25, 109: 30, 110: 25 }

// ---------------------------------------------------------------- §7.1 hard "never" rules (defence in depth)
// The lists above already obey them; these filters keep cross-band fallbacks, the gentle fallback and any
// future list edit honest too. SMASH = destruction / discharge imagery.
const EOS_ROUTER_SMASH = new Set([...EOS_DISCHARGE_IDS, 8, 9, 14, 16, 19, 20, 71, 97])
const EOS_ROUTER_NEVER = {
    panic: { all: new Set([71]) }, //                                 never bomb imagery (DEFUSE)
    shame: { all: new Set([14, 15, 18, 19]), high: EOS_ROUTER_SMASH }, // never concealment (crumple / shred / burn / erase)
    sad: { high: EOS_ROUTER_SMASH }, //                              no destruction for sadness at its peak
    lonely: { high: EOS_ROUTER_SMASH },
    fear: { high: new Set([118]) }, //                                no looming exposure at the peak
    // GOOD is savoured: never smashed, never the "nope" swipe (25), never traded away as currency (88), never
    // framed as a villain that squeaks and shrinks (53). 1 POP stays (a confetti pop with the savouring copy).
    good: { all: new Set([...EOS_ROUTER_SMASH, 25, 88, 53]) },
}
// A "soft" flag (hopeless / "hate my life" venting) keeps these on top of EOS_GENTLE_IDS for that feeling:
// 112 COOL THE VOLCANO is a slow breath cool-down (EOS_SLOW_IDS), not a discharge game. Strong flags
// (threat / abuse / selfharm) stay strictly on the gentle list.
const EOS_ROUTER_SOFT_OK = { anger: new Set([112]) }
// Games that cannot be finished at phone width (stage ≤ 560 px) → score penalty there, never removed (still a
// fallback, still in the menu). Empty since the v2 unstick pass: 47 UNFOLLOW's plug now returns to its socket for
// every card (it used to stay clipped at the stage edge after the first pull) and finishGame(47) passes at 390.
const EOS_ROUTER_PHONE_FRAGILE = new Map()
const EOS_ROUTER_PHONE_MAX = 560
// Fallback order after the band's own list: nearest band first (mid falls back to the body games first).
const EOS_ROUTER_BAND_ORDER = { high: ["high", "mid", "low"], mid: ["mid", "high", "low"], low: ["low", "mid", "high"] }
// Default level when only the band is known (crisis with no dial → high; unknown → mid).
const EOS_ROUTER_BAND_LEVEL = { high: 8, mid: 6, low: 2 }

// ---------------------------------------------------------------- small pure helpers
// Test clock (dev harness: window.__eos.router.setNow("2026-10-09T23:30:00")); null = the real clock.
const EOS_ROUTER_CLOCK = { now: null }
function eosRouterNow(opts) {
    const v = opts && opts.now != null ? opts.now : EOS_ROUTER_CLOCK.now
    if (v == null) return new Date()
    const d = v instanceof Date ? v : new Date(v)
    return Number.isFinite(d.getTime()) ? d : new Date()
}
function eosRouterStronger(a, b) {
    const ra = EOS_SAFETY_RANK[a] || 0
    const rb = EOS_SAFETY_RANK[b] || 0
    return rb > ra ? b : ra ? a : null
}
// Is the arcade stage phone-sized? opts.width (tests) → else the mounted arcade root → else the window.
function eosRouterNarrow(opts) {
    try {
        let w = opts && opts.width != null ? Number(opts.width) : 0
        if (!w && typeof document !== "undefined") {
            const el = document.querySelector(".tsArcade")
            w = el ? el.getBoundingClientRect().width : 0
        }
        if (!w && typeof window !== "undefined") w = Number(window.innerWidth) || 0
        return w > 0 && w <= EOS_ROUTER_PHONE_MAX
    } catch {
        return false
    }
}
// Registered games (id → GAMES entry). Rebuilt when GAMES grows (eosRegisterGame pushes new games).
// opts.ids (unit tests only) models another catalogue, e.g. release 2 with 115-120 registered.
let eosRouterGameCache = { n: -1, map: new Map() }
function eosRouterGames(opts) {
    let list = []
    try {
        list = Array.isArray(GAMES) ? GAMES : []
    } catch {}
    if (eosRouterGameCache.n !== list.length) {
        const map = new Map()
        for (const g of list) if (g && Number(g.id) > 0 && !map.has(Number(g.id))) map.set(Number(g.id), g)
        eosRouterGameCache = { n: list.length, map }
    }
    const base = eosRouterGameCache.map
    if (!opts || !opts.ids) return base
    const map = new Map()
    for (const raw of opts.ids) {
        const id = Number(raw)
        if (id > 0) map.set(id, base.get(id) || { id, name: `GAME ${id}`, family: "Release", eosVirtual: true })
    }
    return map
}
// The arcade's played list (unique ids, oldest first). Callers pass it; previews read the persisted copy.
function eosRouterPlayed(played) {
    let v = played
    if (!Array.isArray(v)) {
        try {
            v = typeof PLAYED_KEY !== "undefined" && typeof lsJson === "function" ? lsJson(PLAYED_KEY, []) : []
        } catch {
            v = []
        }
    }
    return Array.isArray(v) ? v.map(Number).filter((n) => n > 0) : []
}
// History from eos_sessions_v1, parsed once per change of the stored string (cheap in render).
//   last3 = game ids of the last 3 rows (recency, retro rows included: they were played)
//   sums  = "emo|id" → {sum, n} of deltas over NON-retro rows with both ratings (retro = recall-biased)
let eosRouterHistCache = { raw: undefined, val: null }
function eosRouterHistory() {
    let raw = null
    try {
        raw = typeof localStorage !== "undefined" ? localStorage.getItem(EOS_KEYS.sessions) : null
    } catch {}
    if (eosRouterHistCache.val && raw === eosRouterHistCache.raw) return eosRouterHistCache.val
    let rows = []
    try {
        const v = raw ? JSON.parse(raw) : []
        rows = Array.isArray(v) ? v : []
    } catch {}
    const last3 = new Set(
        rows
            .slice(-3)
            .map((r) => Number(r && r.gameId) || 0)
            .filter(Boolean)
    )
    const sums = new Map()
    for (const r of rows) {
        if (!r || r.retro) continue
        const id = Number(r.gameId) || 0
        if (!id || r.before == null || r.after == null) continue
        const b = Number(r.before)
        const a = Number(r.after)
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue
        const emo = EOS_EMO[r.emo] || r.emo === "general" ? String(r.emo) : "general"
        const better = (EOS_EMO[emo] && EOS_EMO[emo].better) || "down"
        const k = `${emo}|${id}`
        const s = sums.get(k) || { sum: 0, n: 0 }
        s.sum += better === "up" ? a - b : b - a
        s.n += 1
        sums.set(k, s)
    }
    const val = { last3, sums, rows: rows.length }
    eosRouterHistCache = { raw, val }
    return val
}
// Mean relief (delta > 0 = better) of that emotion + game over ≥ 2 non-retro rated rows, else 0.
function eosRouterPersonalDelta(emo, id, hist) {
    const h = hist || eosRouterHistory()
    const s = h.sums.get(`${emo || "general"}|${Number(id)}`)
    return s && s.n >= 2 ? s.sum / s.n : 0
}
function eosRouterRuleOk(id, text) {
    const rule = EOS_ROUTE_RULES[id]
    if (!rule) return true
    try {
        return !!rule(text)
    } catch {
        return false
    }
}

// ---------------------------------------------------------------- context → candidates → pick
// Resolves who / how loud / which band / which safety flag, exactly as §7.3 step 1-2.
// Returns null when the arcade's own relevance chooser should handle the free text (no feeling known).
function eosRouterContext(text, played, excludeId, opts = {}) {
    const st = EOS_STORE.get()
    const t = eosNormText(text)
    // Synchronous scan of the words ("i want to die" + Enter within 100 ms is already gentle).
    const textFlag = opts.textFlag !== undefined ? opts.textFlag : t ? eosTextSafety(t) : null
    const flag = eosRouterStronger(st.safety, textFlag)
    let emo = opts.emotion !== undefined ? opts.emotion : st.emotion
    if (!EOS_EMO[emo]) emo = null
    let d = null
    if (!emo && t) {
        d = eosDetectEmotion(t)
        if (d && EOS_EMO[d.id]) emo = d.id
    }
    if (!emo && !t && EOS_EMO[st.detected]) emo = st.detected
    const before = opts.before !== undefined ? opts.before : st.before
    const express = opts.express !== undefined ? !!opts.express : !!st.express
    let lvl = express ? 10 : before ?? (d ? d.intensity : null) ?? st.intensityGuess ?? (emo ? EOS_EMO[emo].dial : null) ?? 5
    let key = emo
    if (!emo) {
        if (flag) {
            // A crisis phrase with no detected feeling never falls through to the arcade's chooser:
            // general, body first (high band) unless a NOT SURE check-in gave a level.
            key = "general"
            if (!express && before == null) lvl = EOS_ROUTER_BAND_LEVEL.high
        } else if (before != null || express) key = "general" // NOT SURE check-in / express orb
        else return null
    }
    const n = Number(lvl)
    return {
        key,
        emo,
        lvl: Number.isFinite(n) ? eosClamp(n, 0, 10) : 5,
        band: eosBand(lvl),
        flag: flag || null,
        detected: d ? d.id : null,
        text: t,
        played: eosRouterPlayed(played),
        excludeId: Number(excludeId) || null,
        path: Array.isArray(st.path) ? st.path.map(Number) : [],
        late: eosLateNight(eosRouterNow(opts)),
        narrow: eosRouterNarrow(opts),
        seed: (Number(st.sessionSeed) || 0) + (Number(st.loops) || 0),
    }
}
function eosRouterEligible(id, ctx, games, gentleOnly) {
    if (!games.has(id) || id === ctx.excludeId) return false
    if (!eosLaunchOk(id)) return false // Launch 30 (core EOS_LAUNCH_IDS): never serve a game outside the launch list
    if (EOS_VAULT.has(id) || EOS_BENCH.has(id)) return false
    if (!eosRouterRuleOk(id, ctx.text)) return false
    const never = EOS_ROUTER_NEVER[ctx.key]
    if (never && ((never.all && never.all.has(id)) || (never[ctx.band] && never[ctx.band].has(id)))) return false
    if (ctx.late && id === 117 && ctx.key !== "numb") return false
    if (gentleOnly && !EOS_GENTLE_IDS.includes(id) && !(ctx.flag === "soft" && EOS_ROUTER_SOFT_OK[ctx.key] && EOS_ROUTER_SOFT_OK[ctx.key].has(id))) return false
    return true
}
// Band list, then the other two bands (deduped), filtered; ranked and scored (§7.3 steps 3-4).
// → [{id, game, rank, score, parts}] best-first.
function eosRouterRank(ctx, opts = {}) {
    const games = eosRouterGames(opts)
    const build = (key) => {
        const routes = EOS_EMOTION_ROUTES[key] || EOS_EMOTION_ROUTES.general
        const seen = new Set()
        const out = []
        for (const b of EOS_ROUTER_BAND_ORDER[ctx.band] || EOS_ROUTER_BAND_ORDER.mid)
            for (const id of routes[b] || [])
                if (!seen.has(id)) {
                    seen.add(id)
                    out.push(id)
                }
        return out
    }
    const gentle = !!ctx.flag
    let ids = build(ctx.key).filter((id) => eosRouterEligible(id, ctx, games, gentle))
    if (!ids.length && gentle) ids = EOS_GENTLE_IDS.filter((id) => eosRouterEligible(id, ctx, games, true))
    if (!ids.length && ctx.key !== "general") ids = build("general").filter((id) => eosRouterEligible(id, ctx, games, gentle))
    if (!ids.length) return []
    const hist = eosRouterHistory()
    const recent = new Set(ctx.played.slice(-6))
    const path = new Set(ctx.path)
    return ids
        .map((id, rank) => {
            const inPath = path.has(id) ? 1 : 0
            // Reliability beats novelty when hot: no recency penalty in the high band.
            const recency = ctx.band === "high" ? 0 : (hist.last3.has(id) ? 0.4 : 0) + (recent.has(id) ? 0.15 : 0)
            const delta = eosRouterPersonalDelta(ctx.key, id, hist)
            const history = eosClamp(0.05 * delta, -0.15, 0.15)
            const loud = ctx.late && EOS_LOUD_IDS.has(id) ? 0.2 : 0
            const phone = ctx.narrow ? EOS_ROUTER_PHONE_FRAGILE.get(id) || 0 : 0
            const score = 1 - rank * 0.1 - inPath - recency + history - loud - phone
            return { id, game: games.get(id), rank, score: Math.round(score * 1000) / 1000, parts: { inPath, recency, delta, history, loud, phone } }
        })
        .sort((a, b) => b.score - a.score || a.rank - b.rank)
}
// High band → the top score. Mid / low → deterministic variety: #2 when eosNoise(seed + loops, top) < .2,
// only if #2 is close (within 0.3) and carries NO penalty: not in this feeling's path, not recent, not a loud
// game late at night, not phone-fragile on a phone, no negative personal history (a demotion is never undone).
function eosRouterPenalised(r) {
    const p = (r && r.parts) || {}
    return p.inPath > 0 || p.recency > 0 || p.loud > 0 || p.phone > 0 || p.history < 0
}
function eosRouterChoose(ranked, ctx) {
    if (!ranked || !ranked.length) return null
    const top = ranked[0]
    if (ctx.band === "high" || ranked.length < 2) return top
    const second = ranked[1]
    if (eosRouterPenalised(second)) return top
    let n = 1
    try {
        n = eosNoise(ctx.seed, top.id)
    } catch {}
    return n < 0.2 && second.score > top.score - 0.3 ? second : top
}

// ---------------------------------------------------------------- public: routing
// I2-E4 (auto choice) and I2-E5 ("ANOTHER / TRY" recommendation, excludeId = the game just played).
function EosRouteGame(text, played = [], excludeId = null, opts = {}) {
    try {
        const ctx = eosRouterContext(text, played, excludeId, opts)
        if (!ctx) return null
        const pick = eosRouterChoose(eosRouterRank(ctx, opts), ctx)
        return pick && pick.game ? pick.game : null
    } catch (err) {
        if (eosIsDev()) console.warn("[eos] router: EosRouteGame failed", err)
        return null
    }
}
// Act 2 ("ONE MORE ▶"): anger after a discharge game → 112 COOL THE VOLCANO whatever the delta (under a
// strong safety flag the first gentle id; a soft flag keeps 112); little shift (delta null or < 2) →
// EOS_SECOND_ACT[emo]; it worked → the next routed pick excluding the last game, banded like EosRouteGame from
// the episode's ENTRY level (express → 10, else st.before, never the after-rating: a panic peak that fell
// 8 → 3 is still body-first, so act 2 is CLEANSE, not an "exaggerate it" game). Same filters. text is optional.
function EosSecondAct(emotion, lastId, delta, text = "", opts = {}) {
    try {
        const st = EOS_STORE.get()
        const last = Number(lastId) || null
        const emo = EOS_EMO[emotion] ? emotion : EOS_EMO[st.emotion] ? st.emotion : EOS_EMO[st.detected] ? st.detected : null
        const key = emo || "general"
        const t = eosNormText(text)
        const flag = eosRouterStronger(eosRouterStronger(st.safety, EOS_TEXT_SAFETY.last), t ? EosSafetyScan(t) : null)
        const lvl = st.express ? 10 : st.before ?? st.intensityGuess ?? (emo ? EOS_EMO[emo].dial : null) ?? EOS_ROUTER_BAND_LEVEL.mid
        const ctx = {
            key,
            emo,
            lvl,
            band: eosBand(lvl),
            flag,
            detected: null,
            text: t,
            played: eosRouterPlayed(opts.played),
            excludeId: last,
            path: Array.isArray(st.path) ? st.path.map(Number) : [],
            late: eosLateNight(eosRouterNow(opts)),
            narrow: eosRouterNarrow(opts),
            seed: (Number(st.sessionSeed) || 0) + (Number(st.loops) || 0) + 1,
        }
        const games = eosRouterGames(opts)
        const ok = (id) => eosRouterEligible(id, ctx, games, !!flag)
        if (key === "anger" && EOS_DISCHARGE_IDS.has(last) && last !== 112) {
            const id = ok(112) ? 112 : flag ? EOS_GENTLE_IDS.find(ok) : null
            if (id) return games.get(id)
        }
        const d = delta == null || delta === "" ? null : Number(delta)
        if (d == null || !Number.isFinite(d) || d < 2) {
            let id = (EOS_SECOND_ACT[key] || EOS_SECOND_ACT.general).find(ok)
            // Launch 30: a feeling with NO act-2 game in the launch list (jealous) uses general's act 2 instead
            if (!id && !(EOS_SECOND_ACT[key] || []).some((x) => games.has(x) && eosLaunchOk(x))) id = EOS_SECOND_ACT.general.find(ok)
            if (!id && flag) id = EOS_GENTLE_IDS.find(ok)
            if (id) return games.get(id)
        }
        const pick = eosRouterChoose(eosRouterRank(ctx, opts), ctx)
        return pick && pick.game ? pick.game : null
    } catch (err) {
        if (eosIsDev()) console.warn("[eos] router: EosSecondAct failed", err)
        return null
    }
}
// Check-in CTA sub-line: what GO will launch for this feeling + dial (same filters, no text).
function EosRoutePreview(emotion, before, opts = {}) {
    try {
        const st = EOS_STORE.get()
        const emo = EOS_EMO[emotion] ? emotion : null
        const b = before == null || before === "" || !Number.isFinite(Number(before)) ? null : eosClamp(Math.round(Number(before)), 0, 10)
        const flag = eosRouterStronger(st.safety, EOS_TEXT_SAFETY.last)
        const ctx = eosRouterContext("", opts.played, null, { ...opts, emotion: emo, before: b ?? (emo ? EOS_EMO[emo].dial : flag ? EOS_ROUTER_BAND_LEVEL.high : EOS_ROUTER_BAND_LEVEL.mid), express: false, textFlag: flag })
        if (!ctx) return null
        const pick = eosRouterChoose(eosRouterRank(ctx, opts), ctx)
        if (!pick || !pick.game) return null
        const id = pick.id
        const meta = typeof EOS_GAME_META !== "undefined" ? EOS_GAME_META[id] : null
        return {
            id,
            name: String(pick.game.name || ""),
            seconds: Number((meta && meta.seconds) || EOS_GAME_SECONDS[id] || 30) || 30,
            best: eosRouterPersonalDelta(ctx.key, id) >= 2,
            band: ctx.band,
            emotion: ctx.key,
        }
    } catch (err) {
        if (eosIsDev()) console.warn("[eos] router: EosRoutePreview failed", err)
        return null
    }
}

// ---------------------------------------------------------------- public: copy follows the feeling (I2-E11)
// Check-in emotion → that emotion's arcade profile (CALM SPARKS / SLOW-DOWN for panic …). No check-in:
// the arcade's own first-match regexes win when they match (original behaviour); otherwise core's
// stem-aware detection ("i am panicking", "I raged at him") picks the profile. GOOD gets savouring copy
// (id stays "general" so every id-keyed copy bank keeps working) — never "HEAVY → LIGHTER".
const EOS_ROUTER_PROFILE_MEMO = new Map()
let eosRouterSavourCache = null
function eosRouterSavourProfile() {
    if (eosRouterSavourCache) return eosRouterSavourCache
    const base = typeof RELEASE_DEFAULT_EMOTION_PROFILE !== "undefined" ? RELEASE_DEFAULT_EMOTION_PROFILE : null
    if (!base) return null
    eosRouterSavourCache = {
        ...base,
        eosSavour: true,
        actions: ["SAVOUR", "KEEP", "GLOW", "SHINE", "SMILE", "BANK IT"],
        feedback: [
            "YOU SAVOURED IT ✓",
            "YOU KEPT THE GOOD ✓",
            "THE GLOW GOT BIGGER ✓",
            "YOU BANKED THE MOMENT ✓",
            "YOU LET IT SHINE ✓",
            "THE GOOD FEELING STAYED ✓",
            "YOU MADE IT LAST ✓",
            "MORE LIGHT · MORE YOU ✓",
        ],
        secondary: ["NOTICE WHAT FEELS GOOD", "STAY WITH THE GLOW", "ONE MORE SECOND OF GOOD", "LET IT SOAK IN", "THIS ONE IS YOURS", "KEEP THE WARMTH MOVING"],
        finish: ["GOOD → GLOWING", "YOU BANKED THE GOOD ✓", "YOU KEPT THE MOMENT ✓"],
    }
    return eosRouterSavourCache
}
function eosRouterProfileFor(emotionId) {
    const list = typeof RELEASE_INPUT_EMOTION_PROFILES !== "undefined" && Array.isArray(RELEASE_INPUT_EMOTION_PROFILES) ? RELEASE_INPUT_EMOTION_PROFILES : []
    const dflt = typeof RELEASE_DEFAULT_EMOTION_PROFILE !== "undefined" ? RELEASE_DEFAULT_EMOTION_PROFILE : null
    if (emotionId === "good") return eosRouterSavourProfile() || dflt
    const pid = EOS_EMO[emotionId] ? EOS_EMO[emotionId].profile : "general"
    return list.find((p) => p && p.id === pid) || dflt
}
function EosProfileOverride(input) {
    try {
        const st = EOS_STORE.get()
        const raw = Array.isArray(input) ? input.join(" ") : String(input == null ? "" : input)
        const memoKey = `${st.emotion}|${st.safety}|${raw}`
        if (EOS_ROUTER_PROFILE_MEMO.has(memoKey)) return EOS_ROUTER_PROFILE_MEMO.get(memoKey)
        let out = null
        if (EOS_EMO[st.emotion]) out = eosRouterProfileFor(st.emotion)
        else {
            const list = typeof RELEASE_INPUT_EMOTION_PROFILES !== "undefined" && Array.isArray(RELEASE_INPUT_EMOTION_PROFILES) ? RELEASE_INPUT_EMOTION_PROFILES : []
            const original = list.some((p) => {
                if (!p || !(p.test instanceof RegExp)) return false
                p.test.lastIndex = 0
                return p.test.test(raw)
            })
            if (!original) {
                const d = eosDetectEmotion(raw)
                if (d && EOS_EMO[d.id] && (EOS_EMO[d.id].profile !== "general" || d.id === "good")) out = eosRouterProfileFor(d.id)
            }
        }
        if (EOS_ROUTER_PROFILE_MEMO.size > 160) EOS_ROUTER_PROFILE_MEMO.clear()
        EOS_ROUTER_PROFILE_MEMO.set(memoKey, out || null)
        return out || null
    } catch {
        return null
    }
}

// ---------------------------------------------------------------- public: menu group (I2-E10)
// Known feeling → "FOR YOUR ANGER" + the top 4 routed games; otherwise "NEW · RELIEF GAMES" + the
// registered ids ≥ 111. Items use the menu's OWN markup (button.releaseChoiceItem > img + span > b{name})
// with no extra text, so drive.startGame(page, NAME) still matches (with .first()). Empty → renders nothing.
function eosRouterMenuItems(st, played, opts = {}) {
    const games = eosRouterGames(opts)
    const emo = EOS_EMO[st.emotion] ? st.emotion : null
    const flag = eosRouterStronger(st.safety, EOS_TEXT_SAFETY.last)
    if (emo) {
        const ctx = eosRouterContext("", played, null, { ...opts, emotion: emo, textFlag: flag })
        const ranked = ctx ? eosRouterRank(ctx, opts) : []
        return {
            emo,
            label: `FOR YOUR ${String(EOS_EMO[emo].noun || EOS_EMO[emo].label).toUpperCase()}`,
            games: ranked.slice(0, 4).map((r) => r.game).filter(Boolean),
        }
    }
    const fresh = Array.from(games.values())
        .filter((g) => Number(g.id) >= 111 && eosLaunchOk(g.id) && !EOS_VAULT.has(Number(g.id)) && !EOS_BENCH.has(Number(g.id)) && (!flag || EOS_GENTLE_IDS.includes(Number(g.id))))
        .sort((a, b) => Number(a.id) - Number(b.id))
    return { emo: null, label: "NEW · RELIEF GAMES", games: fresh }
}
function eosRouterMenuImg(g, emo) {
    try {
        const id = Number(g.id) || 0
        const meta = typeof EOS_GAME_META !== "undefined" ? EOS_GAME_META[id] : null
        if (id >= 111 && meta && meta.char) {
            const pool = eosFacePool(meta.char, "win")
            return eosFace(meta.char, pool[id % pool.length])
        }
        if (typeof FAMILY_BUBBLE !== "undefined" && typeof FAMILY_EMOTIONS !== "undefined")
            return emotionSrc(FAMILY_BUBBLE[g.family] || "drop", (FAMILY_EMOTIONS[g.family] || FAMILY_EMOTIONS.Release)[id % 4])
        return eosFaceFor(emo || "auto", "calm")
    } catch {
        return eosFaceFor(emo || "auto", "calm")
    }
}
function EosMenuGroup({ played = [], gameChoice = null, onPick }) {
    // The ranking reads emotion, before, express, safety, path, intensityGuess, detected, loops, seed …: key the
    // memo on the store snapshot itself (a ranking costs ~0.03 ms, so every store change may recompute).
    const st = useEosStore()
    const playedKey = Array.isArray(played) ? played.join("|") : ""
    let gamesLen = 0
    try {
        gamesLen = GAMES.length
    } catch {}
    const narrow = eosRouterNarrow()
    const group = React.useMemo(() => {
        try {
            return eosRouterMenuItems(st, Array.isArray(played) ? played : [])
        } catch {
            return null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [st, playedKey, gamesLen, narrow])
    if (!group || !group.games.length) return null
    const hue = group.emo ? eosHue(group.emo) : 46
    return (
        <React.Fragment>
            <div
                className="releaseChoiceGroupLabel eosMenuGroupLabel fs-mask"
                {...EOS_PRIVATE_ATTRS}
                data-eos-menu-group={group.emo ? "feeling" : "new"}
                style={{ "--eos-h": hue }}
            >
                {group.label}
            </div>
            {group.games.map((g, i) => (
                <button
                    key={`eos-${g.id}`}
                    className={`releaseChoiceItem eosMenuPick ${i === 0 ? "isTop" : ""} ${gameChoice === String(g.id) ? "active" : ""}`}
                    type="button"
                    data-eos-game={g.id}
                    data-eos-rank={i + 1}
                    style={{ "--eos-h": hue }}
                    onClick={() => {
                        if (typeof onPick === "function") onPick(g)
                    }}
                >
                    <img
                        src={eosRouterMenuImg(g, group.emo)}
                        alt=""
                        draggable={false}
                        onError={(e) => {
                            e.currentTarget.style.display = "none"
                        }}
                    />
                    <span>
                        <b>{g.name}</b>
                    </span>
                </button>
            ))}
        </React.Fragment>
    )
}

// ---------------------------------------------------------------- CSS (menu group; label 13 px §4.3)
const EOS_ROUTER_CSS = `
${EOS_A} .releaseChoiceMenu .eosMenuGroupLabel{font:900 13px/1.2 var(--eos-font)!important;letter-spacing:.08em!important;color:hsl(var(--eos-h,46),100%,82%)!important;display:flex!important;align-items:center!important;gap:8px!important;text-shadow:0 0 12px hsla(var(--eos-h,46),100%,60%,.45)!important}
${EOS_A} .releaseChoiceMenu .eosMenuGroupLabel::before{content:"";flex:none;width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,hsl(var(--eos-h,46),100%,64%) 60%);box-shadow:0 0 10px hsla(var(--eos-h,46),100%,62%,.9)}
${EOS_A} .releaseChoiceMenu .eosMenuGroupLabel::after{content:"";flex:1;height:1px;margin-left:4px;background:linear-gradient(90deg,hsla(var(--eos-h,46),100%,70%,.55),hsla(var(--eos-h,46),100%,70%,0))}
${EOS_A} .releaseChoiceMenu .releaseChoiceItem.eosMenuPick{background:linear-gradient(90deg,hsla(var(--eos-h,46),95%,60%,.17),hsla(var(--eos-h,46),95%,60%,.04) 62%,rgba(0,0,0,0))!important;box-shadow:inset 3px 0 0 hsla(var(--eos-h,46),100%,68%,.8)!important}
${EOS_A} .releaseChoiceMenu .releaseChoiceItem.eosMenuPick:is(:hover,:focus-visible,.active){background:linear-gradient(90deg,hsla(var(--eos-h,46),95%,62%,.3),hsla(var(--eos-h,46),95%,60%,.08) 70%,rgba(0,0,0,0))!important;box-shadow:inset 4px 0 0 hsl(var(--eos-h,46),100%,72%)!important}
${EOS_A} .releaseChoiceMenu .releaseChoiceItem.eosMenuPick>img{box-shadow:0 3px 10px rgba(0,0,0,.3),0 0 0 2px hsla(var(--eos-h,46),100%,70%,.55),0 0 14px hsla(var(--eos-h,46),100%,60%,.35)!important}
${EOS_A} .releaseChoiceMenu .releaseChoiceItem.eosMenuPick.isTop>img{box-shadow:0 3px 10px rgba(0,0,0,.3),0 0 0 2px var(--eos-gold-1,#FFE58A),0 0 18px rgba(255,200,90,.7)!important}
${EOS_A} .releaseChoiceMenu .releaseChoiceItem.eosMenuPick.isTop b{color:#fff6d6!important}
${EOS_A} .releaseChoiceMenu .releaseChoiceItem.eosMenuPick:focus-visible{outline:3px solid var(--eos-gold-1,#FFE58A)!important;outline-offset:-3px}
@media (prefers-reduced-motion:reduce){${EOS_A} .releaseChoiceMenu .releaseChoiceItem.eosMenuPick{transition:none!important}}
`
eosCss("router", EOS_ROUTER_CSS)

// ---------------------------------------------------------------- §7.6 verdicts + data validation
// → {id, verdict: "hero"|"route"|"bench"|"vault"|"unlisted", routed: ["anger.mid#1", …]}
function eosRouterVerdict(id) {
    const n = Number(id)
    const routed = []
    for (const emo of Object.keys(EOS_EMOTION_ROUTES))
        for (const b of ["high", "mid", "low"]) {
            const i = (EOS_EMOTION_ROUTES[emo][b] || []).indexOf(n)
            if (i >= 0) routed.push(`${emo}.${b}#${i + 1}`)
        }
    const verdict = EOS_VAULT.has(n) ? "vault" : EOS_BENCH.has(n) ? "bench" : routed.some((r) => r.endsWith("#1")) ? "hero" : routed.length ? "route" : "unlisted"
    return { id: n, verdict, routed }
}
// Spec invariants (§7.2): no vault / bench id is routed, every id 1-120 is classified, every emotion has
// all three bands, gentle / act-2 lists never name a vault or bench game. → [] when healthy.
function eosRouterValidate() {
    const out = []
    const keys = EOS_EMOTIONS.map((e) => e.id).concat(["general"])
    for (const k of keys) {
        const r = EOS_EMOTION_ROUTES[k]
        if (!r) {
            out.push(`no routes for ${k}`)
            continue
        }
        for (const b of ["high", "mid", "low"]) {
            if (!Array.isArray(r[b]) || !r[b].length) out.push(`${k}.${b} empty`)
            for (const id of r[b] || []) {
                if (EOS_VAULT.has(id) || EOS_BENCH.has(id)) out.push(`${k}.${b}: ${id} is vault/bench`)
                if (!(id >= 1 && id <= 120)) out.push(`${k}.${b}: bad id ${id}`)
            }
        }
        for (const id of EOS_SECOND_ACT[k] || []) if (EOS_VAULT.has(id) || EOS_BENCH.has(id)) out.push(`second act ${k}: ${id} is vault/bench`)
    }
    for (const id of EOS_GENTLE_IDS) if (EOS_VAULT.has(id) || EOS_BENCH.has(id) || EOS_ROUTER_SMASH.has(id)) out.push(`gentle ${id} is vault/bench/smash`)
    for (const k of Object.keys(EOS_ROUTER_SOFT_OK))
        for (const id of EOS_ROUTER_SOFT_OK[k]) if (EOS_VAULT.has(id) || EOS_BENCH.has(id) || EOS_ROUTER_SMASH.has(id) || !EOS_SLOW_IDS.has(id)) out.push(`soft-ok ${k} ${id} is not a slow, non-smash game`)
    for (let id = 1; id <= 120; id++) if (eosRouterVerdict(id).verdict === "unlisted") out.push(`id ${id} unclassified`)
    return out
}
if (eosIsDev()) {
    try {
        const problems = eosRouterValidate()
        if (problems.length) console.warn(`[eos] router: ${problems.join("; ")}`)
    } catch {}
}

// ---------------------------------------------------------------- API (window.__eos.router in dev)
// Unit tests: explain(text, played, excludeId, opts) shows the full decision; opts.ids models another
// catalogue (e.g. release 2), opts.now / setNow() fake the local clock.
function eosRouterExplain(text, played = [], excludeId = null, opts = {}) {
    const ctx = eosRouterContext(text, played, excludeId, opts)
    if (!ctx) return { ctx: null, ranked: [], pick: null }
    const ranked = eosRouterRank(ctx, opts)
    const pick = eosRouterChoose(ranked, ctx)
    const { text: _t, ...safeCtx } = ctx
    return { ctx: safeCtx, ranked: ranked.map(({ game, ...r }) => r), pick: pick ? pick.id : null }
}
eosExpose("router", {
    EOS_EMOTION_ROUTES,
    EOS_ROUTE_RULES,
    EOS_VAULT,
    EOS_BENCH,
    EOS_GENTLE_IDS,
    EOS_SECOND_ACT,
    EOS_LOUD_IDS,
    EOS_GAME_SECONDS,
    EosRouteGame,
    EosSecondAct,
    EosRoutePreview,
    EosProfileOverride,
    EosMenuGroup,
    explain: eosRouterExplain,
    personalDelta: (emo, id) => eosRouterPersonalDelta(emo, id),
    verdict: eosRouterVerdict,
    validate: eosRouterValidate,
    menuItems: (opts) => {
        const g = eosRouterMenuItems(EOS_STORE.get(), eosRouterPlayed(opts && opts.played), opts || {})
        return { emo: g.emo, label: g.label, ids: g.games.map((x) => Number(x.id)) }
    },
    setNow: (v) => {
        EOS_ROUTER_CLOCK.now = v == null ? null : v
        return EOS_ROUTER_CLOCK.now
    },
})
