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

const EOS_PICK_KEY = "eos_rotation_v1"
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
    try {
        if (typeof localStorage === "undefined") return eosPickBlank()
        const v = JSON.parse(localStorage.getItem(EOS_PICK_KEY) || "null")
        if (!v || typeof v !== "object" || v.v !== 1) return eosPickBlank()
        const s = eosPickBlank()
        s.seq = Math.max(0, Number(v.seq) || 0)
        for (const k in v.at || {}) if (Number(k) > 0 && Number.isFinite(Number(v.at[k]))) s.at[Number(k)] = Number(v.at[k])
        for (const k in v.cyc || {}) if (/^[a-z]+(:[a-z]+)?$/.test(k) && Number.isFinite(Number(v.cyc[k]))) s.cyc[k] = Number(v.cyc[k])
        s.last = Number(v.last) > 0 ? Number(v.last) : null
        return s
    } catch {
        return eosPickBlank()
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
        const ranked = eosRouterRank(ctx, opts).map((r) => r.id)
        const hold = opts.hold || EOS_PICK_HOLD
        const ok = ranked.filter((id) => !hold.has(id) && !(ctx.narrow && EOS_PICK_HOLD_PHONE.has(id)))
        return { key: eosPickGroupKey(ctx), ids: ok.length ? ok : ranked, ctx }
    } catch (err) {
        if (eosIsDev()) console.warn("[eos] pick: group failed", err)
        return { key: "general", ids: [], ctx: null }
    }
}
// Pure decision on a state snapshot → {id, key, newCycle, served, pool, group}
function eosPickDecide(group, s, excludeId) {
    const ids = group.ids
    if (!ids.length) return null
    const ex = Number(excludeId) || null
    const start = s.cyc[group.key] || 0
    // start 0 = the group never ran: every game played before (under any feeling) counts as served
    const servedIn = (cycStart) => ids.filter((id) => s.at[id] != null && s.at[id] >= cycStart)
    let newCycle = false
    let served = servedIn(start)
    let pool = ids.filter((id) => !served.includes(id))
    if (!pool.length) {
        // group finished → new cycle; never the same game twice in a row across the boundary
        newCycle = true
        served = []
        pool = ids.filter((id) => id !== s.last && id !== ex)
        if (!pool.length) pool = ids.filter((id) => id !== ex)
        if (!pool.length) pool = ids.slice()
    }
    // never the game that is running / just finished, never back-to-back
    const noEx = pool.filter((id) => id !== ex && id !== s.last)
    if (noEx.length) pool = noEx
    // recent launches under any feeling are avoided while the group still has something else
    const recentFloor = s.seq - EOS_PICK_RECENT + 1
    const fresh = pool.filter((id) => !(s.at[id] != null && s.at[id] >= recentFloor))
    if (fresh.length) pool = fresh
    return { id: pool[0], key: group.key, newCycle, served, pool, group: ids }
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
    title: "THINKSTILL PICKS",
    detail: "The best release for how you feel.",
    caption: "THINKSTILL PICKS THE BEST RELEASE FOR HOW YOU FEEL.",
}
function eosPickIdleGuide(steps, menuOn) {
    if (menuOn || !Array.isArray(steps)) return steps
    return steps.map((st) => (st && /CHOOSE A RELEASE/i.test(String(st.title || "")) ? { ...st, ...EOS_PICK_IDLE_STEP } : st))
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
                aria-label={next ? "Next release. ThinkStill picks it." : "Release it. ThinkStill picks the best release for what you wrote."}
            >
                <span className="releaseChoiceAutoIcon" aria-hidden="true">
                    ✦
                </span>
                <span className="choiceCopy">{next ? "NEXT" : "RELEASE IT"}</span>
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
