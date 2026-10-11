// ThinkStill EOS — burst gate (GAP_AUDIT R1 + R2, plan row 0a). Shared by every EOS layer.
//
// The approved dopamine burst (`.tsRewardSurge.mega`, git 485500c) owns the screen while it is mounted:
//   * every EOS paint layer (mood grade / air / flip words, companion, the thought-flow glow, dots and Still Point
//     glow, guide arrows) is opacity 0 + visibility hidden — the burst renders exactly as the baseline;
//   * EOS JS loops ask eosBurstOn() and skip their frame work (the mood tween, the thought-flow tick), and the
//     thought-flow sound bed ducks;
//   * nothing EOS blooms or chimes before or during the burst: eosAfterBurst(fn) runs fn only once no burst is
//     mounted (the mood flip bloom + its sparkle chime are handed to the reveal this way).
// One MutationObserver (childList only; one querySelector per batch that adds or removes an element) mirrors the
// mount into EOS_BURST and `html[data-eos-burst]` in the same task as React's commit, so the first burst frame is
// already clean. Nothing here changes the burst itself.

const EOS_BURST = { on: false, at: 0, endAt: 0, n: 0, subs: new Set(), mo: null }
function eosBurstFind() {
    try {
        return typeof document !== "undefined" ? document.querySelector(".tsRewardSurge.mega") : null
    } catch {
        return null
    }
}
function eosBurstSet(on) {
    if (on === EOS_BURST.on) return
    EOS_BURST.on = on
    const t = typeof performance !== "undefined" ? performance.now() : Date.now()
    if (on) {
        EOS_BURST.at = t
        EOS_BURST.n++
    } else EOS_BURST.endAt = t
    try {
        if (on) document.documentElement.setAttribute("data-eos-burst", "1")
        else document.documentElement.removeAttribute("data-eos-burst")
    } catch {}
    EOS_BURST.subs.forEach((f) => {
        try {
            f(on)
        } catch {}
    })
}
function eosBurstHasEl(list) {
    for (let i = 0; i < list.length; i++) if (list[i].nodeType === 1) return true
    return false
}
function eosBurstWatchStart() {
    if (EOS_BURST.mo || typeof MutationObserver === "undefined" || typeof document === "undefined" || !document.body) return
    try {
        EOS_BURST.mo = new MutationObserver((recs) => {
            for (const r of recs)
                if (eosBurstHasEl(r.addedNodes) || eosBurstHasEl(r.removedNodes)) {
                    eosBurstSet(!!eosBurstFind())
                    return
                }
        })
        EOS_BURST.mo.observe(document.body, { childList: true, subtree: true })
    } catch {
        EOS_BURST.mo = null
    }
    eosBurstSet(!!eosBurstFind())
}
// is the approved mega burst on screen right now?
function eosBurstOn() {
    eosBurstWatchStart()
    if (!EOS_BURST.mo) return !!eosBurstFind()
    return EOS_BURST.on
}
// subscribe to burst on/off edges; returns unsubscribe
function eosBurstSub(fn) {
    eosBurstWatchStart()
    EOS_BURST.subs.add(fn)
    return () => EOS_BURST.subs.delete(fn)
}
// run fn once no burst is mounted (now, or when the burst unmounts), plus `ms`. Returns cancel().
function eosAfterBurst(fn, ms = 0) {
    let done = false
    let t = 0
    let off = null
    const run = () => {
        if (done) return
        if (eosBurstOn()) return
        done = true
        if (off) off()
        t = setTimeout(fn, Math.max(0, ms))
    }
    off = eosBurstSub((on) => {
        if (!on) run()
    })
    run()
    return () => {
        done = true
        clearTimeout(t)
        if (off) off()
    }
}

// 5 IDs of weight: above EOS_A (3) and EOS_L (4), so no EOS layer rule can paint over the burst.
const EOS_BURST_G = "html[data-eos-burst]:not(#eosBurst1):not(#eosBurst2):not(#eosBurst3):not(#eosBurst4):not(#eosBurst5)"
const EOS_BURST_LAYERS = ".eosMoodGrade,.eosMoodAir,.eosMoodFlip,.eosCompanion,.eosThoughtFlow,.eosArrowLayer"
eosCss(
    "burst",
    `${EOS_BURST_G} :is(${EOS_BURST_LAYERS}){opacity:0!important;visibility:hidden!important;transition:none!important}`
)
eosExpose("burst", {
    on: () => eosBurstOn(),
    state: () => ({ on: EOS_BURST.on, at: EOS_BURST.at, endAt: EOS_BURST.endAt, n: EOS_BURST.n, watching: !!EOS_BURST.mo }),
    layers: EOS_BURST_LAYERS,
})
