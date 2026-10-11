// ============================================================================================
// 46_eos_pick.jsx · founder feedback F3 (2026-10-09) · "ThinkStill always picks the next best release"
// --------------------------------------------------------------------------------------------
// Users never choose or browse games. ThinkStill picks the next best release from what they entered
// (check-in emotion + dial, emotion detected from the words, time of day, safety flags — the router's own
// context and filters, src/eos/45_eos_router.jsx) and serves it from a persistent NO-REPEAT ROTATION:
//
//   * group      = every game the router may serve for that feeling (all three bands, same eligibility:
//                  vault / bench / never-rules / late-night / text rules, and only the gentle list while a
//                  safety flag is set), ranked best-fit first by the router (band order, history, recency);
//                  minus EOS_PICK_HOLD (games that cannot be finished reliably never enter the rotation).
//   * no repeats = a game counts as served in a group once it was played (under ANY feeling, or from the
//                  owner menu) since that group's cycle started; the pick is the best-ranked unserved game.
//                  When every game of the group was served a new cycle starts, and the game played last is
//                  never served again straight away (no back-to-back repeat across the cycle boundary).
//   * recent     = the last EOS_PICK_RECENT launches are avoided even when the feeling changes, unless the
//                  group has nothing else left (exhausted).
//   * storage    = localStorage eos_rotation_v1 {v, seq, at:{gameId: seq}, cyc:{groupKey: startSeq}, last}
//                  — numbers and ids only, never anything the user typed.
//
// Game menu: hidden for users. The old CHOOSE TO RELEASE menu, "pick a game myself", named "TRY <GAME>"
// suggestions and PREVIOUS / NEXT catalogue browsing are all kept in the code and come back when
//   * the Framer property "Show game menu" is on (owner / testing; default OFF), or
//   * dev / test hook: ?menu=1 on a dev URL (file://, localhost, ?eosdev=1) or window.__eos.pick.setMenu(true).
// Automated tests start any game by id with window.__eos.pick.start(id) (dev only; dev/eos_drive.mjs uses it
// whenever the menu is hidden).
//
// Public: EosPickPeek(text, played, excludeId, opts) → GAMES entry | null (pure, safe in render)
//         EosPickNext(text, played, excludeId, opts) → GAMES entry | null (event handlers: also starts a new
//                                                       cycle when the group is exhausted)
//         EosPickNote(game | id)                     → records a launch (every launch path calls it)
//         useEosPickMenu() → boolean, eosPickMenuOn(), <EosPickConfigSync showMenu/>, <EosPickBridge/>,
//         <EosPickGoButton ready onGo/> (the composer's one start button while the menu is hidden)
// ============================================================================================

// v11 (ported from the v19 build): strict GLOBAL no-repeat rotation over all 30 launch rituals, own storage key
// (eos_rotation_v1 is migrated once). A ritual is never repeated while any launch ritual is still unplayed in the
// current global cycle, whatever the feeling; a feeling with no unplayed suitable ritual returns no pick.
const EOS_PICK_KEY = "eos_rotation_strict_v2"
const EOS_PICK_KEY_OLD = "eos_rotation_v1"
const EOS_PICK_RECENT = 4
// Never auto-served (still in the owner menu, still playable from there): a routed game that cannot be
// finished goes here until it is fixed. For F3 every routed game the F2 sweep flagged was re-played at
// 390x844 (docs/founder/FEEDBACK_LOG.md F3): 18 BURN, 68 DRUM IT, 74 BUBBLE WRAP, 95 SHELF IT, 101 TUG OF WAR,
// 77 SLOW MOTION, 69 PULSE, 70 METRONOME and 21 BIN reach their reveal; 24 SLINGSHOT stalls at phone width
// (F2: 83 % by hand) → held on phones only (it finishes on desktop). Remove an id once it is fixed.
const EOS_PICK_HOLD = new Set([])
const EOS_PICK_HOLD_PHONE = new Set([24])

// ---------------------------------------------------------------- menu switch (owner prop + dev hook)
const EOS_PICK_CFG = { prop: false, dev: null, subs: new Set() }
let eosPickUrlRead = false
function eosPickReadUrl() {
    if (eosPickUrlRead) return
    eosPickUrlRead = true
    try {
        if (typeof location === "undefined" || !eosIsDev()) return
        const q = new URLSearchParams(location.search || "")
        if (q.has("menu")) EOS_PICK_CFG.dev = q.get("menu") !== "0"
    } catch {}
}
function eosPickMenuOn() {
    eosPickReadUrl()
    return EOS_PICK_CFG.dev != null ? !!EOS_PICK_CFG.dev : !!EOS_PICK_CFG.prop
}
function eosPickEmit() {
    for (const f of Array.from(EOS_PICK_CFG.subs)) {
        try {
            f()
        } catch {}
    }
}
function useEosPickMenu() {
    const [on, setOn] = React.useState(eosPickMenuOn)
    React.useEffect(() => {
        const f = () => setOn(eosPickMenuOn())
        EOS_PICK_CFG.subs.add(f)
        f()
        return () => EOS_PICK_CFG.subs.delete(f)
    }, [])
    return on
}
// Mounted once by 99_pixar (Framer property "Show game menu").
function EosPickConfigSync({ showMenu = false }) {
    eosLayoutEffect(() => {
        if (EOS_PICK_CFG.prop === !!showMenu) return
        EOS_PICK_CFG.prop = !!showMenu
        eosPickEmit()
    }, [!!showMenu])
    return null
}

// ---------------------------------------------------------------- rotation state (ids + numbers only)
function eosPickBlank() {
    return { v: 1, seq: 0, at: {}, cyc: {}, last: null }
}
function eosPickLoad() {
    const blank = eosPickBlank()
    try {
        if (typeof localStorage === "undefined") return blank
        const raw = localStorage.getItem(EOS_PICK_KEY)
        let data = raw ? JSON.parse(raw) : null
        if (!data || typeof data !== "object" || data.v !== 1) {
            // one-time migration from the per-feeling rotation (keeps the play history, starts the global cycle at 0)
            const oldRaw = localStorage.getItem(EOS_PICK_KEY_OLD)
            const old = oldRaw ? JSON.parse(oldRaw) : null
            if (!old || typeof old !== "object") return blank
            data = { v: 1, seq: old.seq || 0, at: old.at || {}, cyc: { global: 0 }, last: old.last || null }
            eosPickSave(data)
        }
        const result = eosPickBlank()
        result.seq = Math.max(0, Number(data.seq) || 0)
        for (const id in data.at || {}) {
            if (Number(id) > 0 && Number.isFinite(Number(data.at[id]))) result.at[Number(id)] = Number(data.at[id])
        }
        result.cyc.global = Math.max(0, Number(data.cyc && data.cyc.global) || 0)
        result.last = Number(data.last) > 0 ? Number(data.last) : null
        return result
    } catch (error) {
        return blank
    }
}
function eosPickSave(s) {
    try {
        if (typeof localStorage !== "undefined") localStorage.setItem(EOS_PICK_KEY, JSON.stringify(s))
    } catch {}
}

// ---------------------------------------------------------------- group (router context → ranked ids)
function eosPickContext(text, played, excludeId, opts = {}) {
    if (typeof eosRouterContext !== "function") return null
    let ctx = eosRouterContext(text, played, excludeId, opts)
    // Words with no recognisable feeling: ThinkStill still picks (the general group, mid band).
    if (!ctx) ctx = eosRouterContext(text, played, excludeId, { ...opts, before: EOS_STORE.get().before ?? 5 })
    return ctx
}
function eosPickGroupKey(ctx) {
    if (!ctx) return "general"
    return ctx.flag ? `${ctx.key}:${ctx.flag === "soft" ? "soft" : "gentle"}` : ctx.key
}
// → {key, ids} ids best-fit first. Uses the router's ranking WITHOUT excludeId (the group is the same before
// and after a game); the caller excludes the running game.
function eosPickGroup(text, played, opts = {}) {
    try {
        const ctx = eosPickContext(text, played, null, opts)
        if (!ctx) return { key: "general", ids: [], ctx: null }
        // Launch 30: the router's eligibility already keeps only EOS_LAUNCH_IDS; filtered again here (defence in depth)
        const ranked = eosRouterRank(ctx, opts)
            .map((r) => r.id)
            .filter((id) => eosLaunchOk(id))
        const hold = opts.hold || EOS_PICK_HOLD
        const ok = ranked.filter((id) => !hold.has(id) && !(ctx.narrow && EOS_PICK_HOLD_PHONE.has(id)))
        return { key: eosPickGroupKey(ctx), ids: ok.length ? ok : ranked, ctx }
    } catch (err) {
        if (eosIsDev()) console.warn("[eos] pick: group failed", err)
        return { key: "general", ids: [], ctx: null }
    }
}
// Pure decision on a state snapshot → {id, key, newCycle, served, pool, group}
// v11 strict global rotation (ported from v19): the universe is the 30 launch rituals; the feeling's ranked
// group only orders the choice (top 4, seeded), it never makes a played ritual eligible again before the
// global cycle is complete.
function eosPickDecide(group, s, excludeId) {
    const ctx = (group && group.ctx) || null
    const all = eosRouterGames()
    const prior = group && Array.isArray(group.ids) ? group.ids : []
    // The complete published set is the 30 curated launch rituals, never merely the emotion shortlist.
    const universe = Array.from(EOS_LAUNCH_IDS).filter((id) => eosLaunchOk(id) && all.has(id))
    if (!universe.length) return null
    let pool = universe.filter((id) => !ctx || eosRouterRuleOk(id, ctx.text))
    if (ctx && ctx.flag) pool = pool.filter((id) => eosRouterEligible(id, ctx, all, true))
    if (!pool.length) return null
    const marker = Math.max(0, Number(s.cyc && s.cyc.global) || 0)
    const pending = universe.filter((id) => s.at[id] == null || Number(s.at[id]) < marker)
    const freshCycle = pending.length === 0
    // NEVER repeat a ritual because just one emotion/route was exhausted.
    // If no unplayed ritual is suitable for this feeling, return no pick.
    let unplayed = freshCycle ? pool.slice() : pool.filter((id) => pending.includes(id))
    // fix (v19 bug): with a safety flag only the 7 gentle rituals qualify, so the 30-ritual cycle could never
    // finish and every request dead-ended. Once every gentle ritual was played, the gentle list cycles again.
    if (!unplayed.length && ctx && ctx.flag) unplayed = pool.filter((id) => id !== s.last)
    if (!unplayed.length) return null
    const excluded = Number(excludeId) || null
    const other = unplayed.filter((id) => id !== excluded && id !== s.last)
    if (other.length) unplayed = other
    const priority = new Map(prior.map((id, n) => [Number(id), n]))
    let likely = unplayed.filter((id) => priority.has(id))
    if (!likely.length) likely = unplayed.slice()
    likely.sort((a, b) => (priority.has(a) ? priority.get(a) : 999) - (priority.has(b) ? priority.get(b) : 999))
    const top = priority.has(likely[0]) ? likely.slice(0, Math.min(4, likely.length)) : likely
    const seed = (Number(s.seq) || 0) + Math.max(0, marker) * 17 + (freshCycle ? 104729 : 0)
    top.sort((a, b) => eosNoise(seed, a) - eosNoise(seed, b) || a - b)
    return {
        id: top[0],
        key: "global",
        newCycle: freshCycle,
        served: universe.filter((id) => s.at[id] != null && Number(s.at[id]) >= marker),
        pool: unplayed,
        group: pool,
    }
}
function eosPickGame(id) {
    try {
        return (Array.isArray(GAMES) ? GAMES : []).find((g) => g && Number(g.id) === Number(id)) || null
    } catch {
        return null
    }
}
function EosPickPeek(text, played = [], excludeId = null, opts = {}) {
    try {
        const d = eosPickDecide(eosPickGroup(text, played, opts), eosPickLoad(), excludeId)
        return d ? eosPickGame(d.id) : null
    } catch {
        return null
    }
}
function EosPickNext(text, played = [], excludeId = null, opts = {}) {
    try {
        const s = eosPickLoad()
        const d = eosPickDecide(eosPickGroup(text, played, opts), s, excludeId)
        if (!d) return null
        if (d.newCycle) {
            s.cyc[d.key] = s.seq + 1 // the launch that follows (EosPickNote) is the first of the new cycle
            eosPickSave(s)
        }
        return eosPickGame(d.id)
    } catch (err) {
        if (eosIsDev()) console.warn("[eos] pick: next failed", err)
        return null
    }
}
function EosPickNote(game) {
    try {
        const id = Number(game && typeof game === "object" ? game.id : game)
        if (!(id > 0)) return
        const s = eosPickLoad()
        if (s.last === id) return // v11: re-noting the same launch (replay / re-render) never advances the rotation
        s.seq += 1
        s.at[id] = s.seq
        s.last = id
        eosPickSave(s)
    } catch {}
}

// ---------------------------------------------------------------- arcade bridge (dev start-by-id hook)
const EOS_PICK_BRIDGE = { onPlay: null, onLaunch: null }
function EosPickBridge({ onPlay, onLaunch }) {
    React.useEffect(() => {
        EOS_PICK_BRIDGE.onPlay = onPlay
        EOS_PICK_BRIDGE.onLaunch = onLaunch
    })
    React.useEffect(
        () => () => {
            EOS_PICK_BRIDGE.onPlay = null
            EOS_PICK_BRIDGE.onLaunch = null
        },
        []
    )
    return null
}

// ---------------------------------------------------------------- idle story copy (input stage orbit)
// Step 2 of the arcade's idle guide said "CHOOSE A RELEASE · Pick one or let ThinkStill choose." — without the
// owner menu nobody picks, so the same step (same bubble, same timing) says what really happens.
const EOS_PICK_IDLE_STEP = {
    title: "A RITUAL FOR THIS FEELING",
    detail: "A guided action matched to what you feel.",
    caption: "NAME IT. GIVE IT A FORM. ACT. NOTICE THE SHIFT.",
}
function eosPickIdleGuide(steps, menuOn) {
    if (menuOn || !Array.isArray(steps)) return steps
    return steps.map((st) => (st && /CHOOSE A RITUAL/i.test(String(st.title || "")) ? { ...st, ...EOS_PICK_IDLE_STEP } : st))
}

// ---------------------------------------------------------------- the composer's one start button
// Same classes as the menu button, so every layout / readability / thumb-zone rule keeps applying.
// Input stage: RELEASE IT (ThinkStill picks). While a game runs / at its end the old button opened the menu to
// switch games; now it is NEXT ▶ — ThinkStill's next pick from the rotation (the only allowed "skip").
function EosPickGoButton({ ready = false, next = false, onGo }) {
    return (
        <div className="releaseChoiceWrap eosPickGoWrap">
            <button
                className={`releaseChoiceButton eosPickGo ${ready ? "ready" : ""} ${next ? "isNext" : ""}`}
                type="button"
                data-eos-pick-go={next ? "next" : "start"}
                onClick={() => {
                    try {
                        onGo && onGo()
                    } catch {}
                }}
                aria-label={next ? "Next ritual. ThinkStill chooses it." : "Begin a ritual chosen for the feeling you described."}
            >
                <span className="releaseChoiceAutoIcon" aria-hidden="true">
                    ✦
                </span>
                <span className="choiceCopy">{next ? "NEXT RITUAL" : "BEGIN RITUAL"}</span>
                <span className="eosPickGoArrow" aria-hidden="true">
                    ▶
                </span>
            </button>
        </div>
    )
}
eosCss(
    "pick",
    `${EOS_A} .eosPickGo .eosPickGoArrow{display:grid;place-items:center;width:22px;font:900 13px/1 Inter,system-ui,sans-serif;color:#dffcff;opacity:.9}
${EOS_A} .eosPickGo .choiceCopy{letter-spacing:.06em;white-space:nowrap}`
)

// ---------------------------------------------------------------- dev / test API (window.__eos.pick)
function eosPickExplain(text, played = [], excludeId = null, opts = {}) {
    const g = eosPickGroup(text, played, opts)
    const d = eosPickDecide(g, eosPickLoad(), excludeId)
    return { key: g.key, group: g.ids, pick: d ? d.id : null, newCycle: d ? d.newCycle : false, served: d ? d.served : [], pool: d ? d.pool : [] }
}
eosExpose("pick", {
    EOS_PICK_KEY,
    EOS_PICK_HOLD,
    EOS_PICK_HOLD_PHONE,
    EOS_PICK_RECENT,
    EosPickPeek,
    EosPickNext,
    EosPickNote,
    menuOn: eosPickMenuOn,
    setMenu(on) {
        EOS_PICK_CFG.dev = on == null ? null : !!on
        eosPickEmit()
        return eosPickMenuOn()
    },
    state: eosPickLoad,
    reset() {
        try {
            localStorage.removeItem(EOS_PICK_KEY)
            localStorage.removeItem(EOS_PICK_KEY_OLD)
        } catch {}
    },
    group: (text, opts) => {
        const g = eosPickGroup(text, [], opts || {})
        return { key: g.key, ids: g.ids }
    },
    explain: eosPickExplain,
    // start any game by id (automated tests; the composer text must already be typed)
    start(id) {
        const g = eosPickGame(id)
        if (!g || typeof EOS_PICK_BRIDGE.onPlay !== "function") return false
        EOS_PICK_BRIDGE.onPlay(g)
        return true
    },
    // what the RELEASE IT button / Enter does
    launch() {
        if (typeof EOS_PICK_BRIDGE.onLaunch !== "function") return false
        EOS_PICK_BRIDGE.onLaunch()
        return true
    },
})
