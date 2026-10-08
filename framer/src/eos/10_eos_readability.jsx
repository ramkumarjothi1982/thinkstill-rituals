// ===================================================================================
// EOS · 10 READABILITY — nothing a person must read is tiny (docs/EOS_SPEC.md §4, §0.4 tokens, §12.1).
// Task `readability`. Public names: EOS_READ_CSS, EOS_READ_TARGETS, EosTextFloor.
// Three layers (§4.1):
//   1. EOS_READ_CSS  — explicit sizes for the arcade chrome (header, HUD, live guide, menu, reveal);
//   2. max(Npx, 1em) — only for selectors whose EVERY arcade rule is ≤ 11 px (1em = the parent's size, so it
//      is unsafe anywhere else: SCRATCH REVEAL words would drop 23 → 17 px, .chainStart 50 → 20 px);
//   3. EosTextFloor  — a grow-only JS floor: a per-selector target table (EOS_READ_TARGETS) + a 12 px catch-all
//      for every other visible text element in the stage, the header and the open game menu.
// The floor never writes a size smaller than the element's current computed size, re-checks the elements it
// raised (a later game state may want them bigger than the floor) and never touches .chainStart, SVG text in
// a scaled viewBox (reported by scan() instead), our own .eos* overlays or aria-hidden decoration.
// Integration (I1-E3, already in dev/eos_integrate.py): `<EosTextFloor stage={stage} />` inside .releaseStage.
// Test hook (dev only): window.__eos.readability = {scan, targets, pass, stats, reset}.
// ===================================================================================

// ---------------------------------------------------------------- layer 1 + 2: CSS (§4.3, paste-ready + review fixes)
const EOS_READ_CSS = `
/* header */
${EOS_A} .releaseScoreBar{height:36px!important;min-width:200px!important;gap:8px!important}
${EOS_A} .releaseScoreBar>span{font:800 14px/1 var(--eos-font)!important;letter-spacing:.04em!important}
${EOS_A} .releaseScoreBar>strong{font:900 18px/1 var(--eos-font)!important;font-variant-numeric:tabular-nums!important}
${EOS_A} .releaseTitleBy{font-size:12.5px!important}
${EOS_A} :is(.choiceCopy,.choiceArrow){font-size:14px!important}
/* the game button label wraps to two lines instead of "CHOOSE TO REL…" */
${EOS_A} .releaseChoiceButton .choiceCopy{line-height:1.04!important;white-space:normal!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;text-overflow:clip!important;overflow:hidden!important;overflow-wrap:normal!important;word-break:normal!important}
${EOS_A} .releaseThoughtInput{font-size:16px!important}
/* game menu group labels (7 px today; EosMenuGroup reuses the markup) */
${EOS_A} .releaseChoiceMenu .releaseChoiceGroupLabel{font:900 13px/1.2 var(--eos-font)!important;letter-spacing:.08em!important}
/* reveal */
${EOS_A}.stage-reveal .releaseCompleteCard small{font-size:13px!important}
${EOS_A}.stage-reveal :is(.releaseReplaySame,.releaseCompleteSideNav){font:800 14px/1 var(--eos-font)!important;min-height:44px!important}
${EOS_A}.stage-reveal .releaseShiftChoices>button{font:900 15px/1 var(--eos-font)!important;min-height:48px!important}
/* in-game HUD — both wrappers; fixes the ids ≥100 overflow (track pushed off-screen at 390) */
${EOS_A}.stage-play .releaseGameHost .engineProgressHud{display:flex!important;flex-direction:column!important;align-items:stretch!important;height:auto!important;gap:6px!important;pointer-events:none!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressTrack{width:100%!important;height:26px!important;min-height:26px!important;flex:none!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressText{font:900 14px/26px var(--eos-font)!important;letter-spacing:.05em!important}
${EOS_A}.stage-play .tsShiftRewardHud{display:flex!important;flex-wrap:wrap!important;justify-content:flex-end!important;gap:6px!important;width:100%!important}
${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:30px!important;padding:0 10px!important;display:inline-flex!important;align-items:center!important}
${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font-family:var(--eos-font)!important;font-weight:900!important;font-size:14px!important;line-height:1!important;letter-spacing:.03em!important}
/* live guide */
${EOS_A} .globalPlayGuide .guideHeaderRow b{font-size:14px!important}
${EOS_A} .globalPlayGuide :is(.guideStepCard small,.globalMindBend strong){font-size:12.5px!important;letter-spacing:.1em!important}
${EOS_A} .globalPlayGuide .guideStepCard span{font:800 17px/1.2 var(--eos-font)!important}
${EOS_A} .globalPlayGuide .globalMindBend em{font-size:14px!important;line-height:1.25!important}
/* the user's own words: layout only — SIZE comes from the grow-only JS floor (never shrink 23 px words) */
${EOS_A}.stage-play .releaseGameHost :is(.tsExactUserText,.plainUserThoughtText,.tsExternalThoughtLabel,.potatoWord,.echoBubbleWord,.rainCloudText,.spaceTileWord,.coinReleaseWord,.tsBubbleTextContainer,.gwThought,.dmHeroThought,.spThought,.volumeMaterialText,.tsndText,.subtitleBar){line-height:1.05!important;overflow-wrap:anywhere!important;max-width:100%}
/* ≤ 11 px-only selectors (every existing arcade rule is ≤ 11 px, so 1em cannot shrink them) */
${EOS_A}.stage-play .releaseGameHost :is(.toolHitCount,.miniCrackCount,.pinTool,.combo,.spStatus,.echoBubbleTimer,.doorABTopLabel,.keepDropMicroGuide){font-size:max(12.5px,1em)!important;letter-spacing:.04em!important}
${EOS_A}.stage-play .releaseGameHost :is(.uniqControl,.bigAction,.parkBay,.dmCutButton,.eraseActivateBtn,.cutLoopScissorPicker,.cleanseBubbleHoldButton){font-size:max(14px,1em)!important;min-height:44px!important}
/* legacy combo counters ("POPPED 2 / 6") sat under the progress HUD: move them just below it */
${EOS_A}.stage-play .releaseGameHost .arena>.combo{top:46px!important}
/* idle story (classic mode): its how-to lines were 8-11.5 px */
${EOS_A} .releaseIdleStep small{font-size:clamp(12.5px,.9vw,13px)!important}
@media (max-width:760px){
  ${EOS_A} .releaseIdleStep b{font-size:12.5px!important;line-height:1.08!important}
  ${EOS_A} .releaseIdleStep small{font-size:12.5px!important;line-height:1.16!important}
  ${EOS_A} .releaseIdleStoryCaption span{font-size:12.5px!important;line-height:1.15!important;white-space:normal!important}
}
@media (max-width:700px){
  ${EOS_A}.stage-play .releaseGameHost .engineProgressHud{left:10px!important;right:10px!important;width:auto!important}
  ${EOS_A}.stage-play .tsShiftRewardPill.chain{display:inline-flex!important}
  ${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:28px!important}
  ${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font-size:13px!important}
  ${EOS_A}.stage-play .releaseGameHost .engineProgressText{font-size:13px!important}
  ${EOS_A} .globalPlayGuide .guideStepCard span{font-size:15px!important}
  ${EOS_A} .globalPlayGuide .guideHeaderRow b{font-size:13px!important}
  ${EOS_A} .globalPlayGuide .globalMindBend em{font-size:13px!important}
  ${EOS_A} .globalPlayGuide.isActive .globalMindBend{display:none!important}
  ${EOS_A}.stage-play .releaseGameHost :is(.uniqControl,.bigAction){font-size:max(13px,1em)!important}
}
@media (max-width:560px){
  /* phone header: [×] THINKSTILL ……… [LVL 1 ⚡ 0] [🔊] — the brand sits left, clear of the score pill */
  ${EOS_A} :is(.releaseTitleMain,.releaseTitleBy){display:none!important}
  ${EOS_A} .releaseHeaderCenter{left:52px!important;right:auto!important;transform:translateY(-50%)!important;width:auto!important;max-width:calc(100% - 214px)!important;padding:0 12px!important;justify-content:flex-start!important}
  ${EOS_A} .releaseConsoleTitle{width:auto!important;overflow:visible!important;justify-content:flex-start!important}
  ${EOS_A} .releaseTitleBrand{display:inline!important;font:900 15px/1 var(--eos-font)!important;letter-spacing:.08em!important;white-space:nowrap!important}
  ${EOS_A} .releaseScoreBar{min-width:0!important;height:32px!important;padding:0 10px!important}
  /* composer game button: a readable 2-line label instead of "CHOOS…" */
  ${EOS_A} .releaseComposer{grid-template-columns:minmax(0,1fr) 36px 148px!important}
  ${EOS_A} .releaseChoiceButton{gap:6px!important;padding:0 24px 0 7px!important}
  ${EOS_A} .releaseChoiceButton>img{width:22px!important;height:22px!important;min-width:22px!important}
  ${EOS_A} .releaseChoiceButton .choiceCopy{font-size:13px!important}
  ${EOS_A} .releaseChoiceButton .choiceArrow{font-size:13px!important;right:7px!important}
  /* idle story: the side labels (now readable) are pulled inward so they stay on screen */
  ${EOS_A} .releaseIdleStep b{letter-spacing:.02em!important}
  ${EOS_A} .releaseIdleStep.step-0{transform:translate(-36%,-50%)!important}
  ${EOS_A} .releaseIdleStep.step-2{transform:translate(-64%,-50%)!important}
  ${EOS_A} .releaseScoreBar .releaseScoreTrack{display:none!important}
  ${EOS_A} .releaseScoreBar>span{display:inline!important;font-size:13px!important}
  ${EOS_A} .releaseScoreBar>strong{font-size:16px!important}
  ${EOS_A}.stage-reveal :is(.releaseReplaySame,.releaseCompleteSideNav){font-size:13px!important}
  ${EOS_A}.stage-play .releaseGameHost .uniqControl>span:first-child{display:none!important}
}
`
eosCss("readability", EOS_READ_CSS)

// ---------------------------------------------------------------- layer 3: the grow-only JS floor (§4.4)
// [selector, desktopPx, phonePx, kind?] — kind "word" = the user's own words: target = max(16|15, --bubble-text-size).
// A row applies to a text element that matches it or sits inside a match (words: any depth; others: ≤ 2 levels),
// the biggest matching target wins; everything else visible gets the 12 px catch-all.
const EOS_READ_WORDS = [".tsExactUserText", ".plainUserThoughtText", ".tsExternalThoughtLabel", ".potatoWord", ".echoBubbleWord", ".rainCloudText", ".spaceTileWord", ".coinReleaseWord", ".tsBubbleTextContainer", ".gwThought", ".dmHeroThought", ".spThought", ".volumeMaterialText", ".tsndText", ".ftThoughtPill>b", ".keepDropBubbleText span", ".subtitleBar"]
const EOS_READ_LINES = [".hotPotatoStage>.hotPotatoPayoff", ".shelfGuideV2>span", ".coinReleaseStage>.coinReleaseHint", ".tsDynamicActionCue>.tsDynamicActionArrow", "[class*=Payoff]", "[class*=payoff]"]
const EOS_READ_BUTTONS = ["[class*=ToolDock]", ".orbitButtons button", ".genreKeys button", ".productionStrip button", ".nudgeRow button", ".gwProp", ".dmDramaButton", ".tsndVibes button"]
const EOS_READ_COUNTERS = [".magicTrapBubble>b", ".magicLeverHandle>:is(em,b)", ".magicLockLights>b", ".unhookWordBubble>small", ".binWordBubble>b", ".cutLoopWord>em", ".shredderMouth>b", ".shredderTop>span", ".defuseV2Screen>small", ".defuseV2Timer>span", ".defuseZone :is(small,strong,button)", ".freezeWordCube>b", ".hotPotatoGuide>span", ".tugPullHandle>span", ".dmDial>small", ".tsndKeySub", ".eraseWordBubble>b", ".shelfThoughtBubble>b", ".weightedBlock>b", ".doorABExploreMeter>b", ".xrayPassDots>b", ".ftArrow em", ".volumeAutoFinish :is(span,b)", ".dmTakeCopy :is(small,b)", ".dmControlCopy", ".tsndNoteBadge", ".tsndAction", ".tsndInstrumentHead :is(b,span)", ".gwProp :is(em,span)", ".tsndFooter :is(b,span)", ".vacuumMachineLabel", ".carCabin :is(.frontSeat,.backSeat)", ".windLane", ".doorABIdlePrompt", ".xrayScannerHandle>b", ".xrayDragGuide span", ".ftRule", ".ftCue", ".ftShift>b", ".spQueueItem>b", ".rotaryKnob>b", ".dmStageBrand small", ".dmProgressText", ".dmEffectLabel span", ".dmStageCounter", ".tsndTitle small", ".tsndMeter>b", ".gwTopCopy :is(small,b)", ".gwMeter>b", ".controlPanelSwitches span", ".premiumCombo", ".zapBubbleCount", "[class*=ToolDock]>span", ".neonBin>span", ".chainLink span", ".doorABVs span", ".doorABStageTitle span", ".coinFaceLabel", ".spCounter", ".tradeHeader span", ":is(.zapGroundButton,.meltGroundButton,.flushLever,.burnGroundButton)>span", ".swipeCard>b", ".ownershipZones span", ".rubberStamps span", ".lotus>b", ".rainPullHint span", ".controlPanelHelper", ".controlPanelHeader span", ".scaleDopamine", ".priorityGrid span", ".literalStatus :is(b,span)", ".uniqStatus :is(b,span)", ".literalProgress", ".cleanseStatus", ".tsDynamicActionText", ".globalFeedbackCopyLayer :is(b,span)"]
const EOS_READ_TARGETS = [
    ...EOS_READ_WORDS.map((s) => [s, 16, 15, "word"]),
    ...EOS_READ_LINES.map((s) => [s, 15, 14]),
    [".tsRewardPayout", 16, 14],
    [".tsFinishRewardPayout", 18, 16],
    [".releasePersistentFinalMessage>span", 15, 14],
    ...EOS_READ_BUTTONS.map((s) => [s, 14, 13]),
    ...EOS_READ_COUNTERS.map((s) => [s, 12, 12]),
]
const EOS_READ_MIN = 12 // the catch-all target (§4.1)
// What the floor WRITES for a 12 px target: rendered size is measured as font-size × the box's scale, and
// subpixel boxes (offsetWidth is rounded) or a 0.99 canvas scale would read an exact 12 px as 11.9.
const EOS_READ_FLOOR_PX = 12.5
const EOS_READ_BUDGET_MS = 1.4 // own work per pass; the rest of the sweep continues next pass (§4.4: ≤ 2 ms)
const EOS_READ_MAX_EL = 400
const EOS_READ_FIRST = ".globalFeedbackCopyLayer, .releaseCompleteOverlay, .tsShiftRewardHud, .engineProgressHud, .globalPlayGuide"
const EOS_READ_MO_MAX = 160 // new text elements one MutationObserver callback raises before they are painted
// where the floor looks: the stage (games, reveal, idle story), the header and the open game menu
const EOS_READ_SCOPES = [".releaseStage", ".releaseConsoleHeader", ".releaseChoiceMenu"]
// subtrees the floor never touches (aria-hidden decoration, burst particles, .chainStart, SVG)
const EOS_READ_SKIP = '[aria-hidden="true"],[hidden],.eosSrOnly,.eosArrowLayer,.tsRewardSurge,.chainStart,script,style,noscript,svg'
const EOS_READ_OWN = /(^|\s)eos[A-Z]/
const EOS_READ_TEXT = /[\p{L}\p{N}]/u
const EOS_READ_MOVE = /transform|scale|rotate|translate/

// Target index: every selector is filed under the class / tag / [class*=…] key of its rightmost compound,
// so a text element and its ancestors only run matches() against the few selectors that could apply
// (one 75-selector list per element costs ~0.2 ms here; the index costs a Map lookup per class).
function eosReadRightmost(sel) {
    let depth = 0
    let last = 0
    for (let i = 0; i < sel.length; i++) {
        const c = sel[i]
        if (c === "(") depth++
        else if (c === ")") depth--
        else if (depth === 0 && (c === " " || c === ">" || c === "+" || c === "~")) last = i + 1
    }
    return sel.slice(last).trim()
}
function eosReadBuildIndex(targets) {
    const idx = { cls: new Map(), tag: new Map(), sub: [], need: new Set() }
    const file = (map, key, e) => {
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(e)
    }
    for (const [sel, d, p, kind] of targets) {
        try {
            if (typeof document !== "undefined") document.createDocumentFragment().querySelector(sel) // invalid → skipped
        } catch {
            continue
        }
        const e = { sel, d, p, word: kind === "word", need: null, needSub: null }
        const rm = eosReadRightmost(sel)
        // the compound left of the rightmost one ("x" in ".x > span", ".x span"): one of its classes must sit on
        // the element's ancestor chain, a cheap pre-filter before matches()
        const left = sel.slice(0, sel.length - rm.length).replace(/[\s>+~]+$/, "")
        if (left) {
            const lc = eosReadRightmost(left)
            const need = Array.from(lc.matchAll(/\.([\w-]+)/g), (m) => m[1])
            const needSub = Array.from(lc.matchAll(/\[class\*=["']?([\w-]+)["']?\]/g), (m) => m[1])
            if (need.length) {
                e.need = need
                for (const k of need) idx.need.add(k)
            } else if (needSub.length) e.needSub = needSub
        }
        const classes = Array.from(rm.matchAll(/\.([\w-]+)/g), (m) => m[1])
        const subs = Array.from(rm.matchAll(/\[class\*=["']?([\w-]+)["']?\]/g), (m) => m[1])
        if (classes.length) for (const c of new Set(classes)) file(idx.cls, c, e)
        else if (subs.length) for (const sb of subs) idx.sub.push([sb, e])
        else {
            const tags = []
            const tm = rm.match(/^([a-z][a-z0-9]*)/i)
            if (tm) tags.push(tm[1])
            const im = rm.match(/^:is\(([^)]*)\)/)
            if (im) for (const part of im[1].split(",")) if (/^[a-z][a-z0-9]*$/i.test(part.trim())) tags.push(part.trim())
            if (tags.length) for (const t of tags) file(idx.tag, t.toUpperCase(), e)
            else idx.sub.push(["", e]) // no key: always a candidate
        }
    }
    return idx
}
let eosReadIndexCache = null
function eosReadIndex() {
    if (!eosReadIndexCache) eosReadIndexCache = eosReadBuildIndex(EOS_READ_TARGETS)
    return eosReadIndexCache
}
function eosReadCandidates(n, idx, out) {
    const cl = n.classList
    for (let i = 0; i < cl.length; i++) {
        const hit = idx.cls.get(cl[i])
        if (hit) for (const e of hit) out.push(e)
    }
    const th = idx.tag.get(n.tagName)
    if (th) for (const e of th) out.push(e)
    if (idx.sub.length) {
        const c = n.getAttribute("class") || ""
        for (const [sb, e] of idx.sub) if (!sb || c.includes(sb)) out.push(e)
    }
    return out
}

// module state (one arcade per page; the component is mounted once by I1)
const EOS_READ_STATE = {
    tagged: new Map(), // element we raised → { px we wrote, natural size before }
    orig: new WeakMap(), // el → [inline value, priority] before our first write
    scaleSeen: new WeakMap(), // el → { s, since } — a scale must hold ≥ 1.2 s before we compensate it
    cursor: 0,
    recheck: 0,
    passes: 0,
    stats: null,
}
function eosReadStatsZero() {
    return { passes: 0, lastMs: 0, maxMs: 0, maxOwnMs: 0, flushMaxMs: 0, moPasses: 0, moMaxMs: 0, over2: 0, ownOver2: 0, log: [], totalMs: 0, ownTotalMs: 0, writes: 0, scaled: 0, unfloored: 0, seen: 0, capped: 0 }
}
EOS_READ_STATE.stats = eosReadStatsZero()

function eosReadPhone(root) {
    try {
        const w = Math.min(typeof innerWidth === "number" ? innerWidth : 9999, root && root.offsetWidth ? root.offsetWidth : 9999)
        return w <= 560
    } catch {
        return false
    }
}
// the "Bubble Text" property (--bubble-text-size on the root; default 16 after I1) can only raise words
function eosReadWordPx(root, phone) {
    let v = NaN
    try {
        v = parseFloat(getComputedStyle(root).getPropertyValue("--bubble-text-size"))
    } catch {}
    const base = phone ? 15 : 16
    return Number.isFinite(v) ? Math.max(base, Math.min(28, v)) : base
}
function eosReadCtx(root) {
    const phone = eosReadPhone(root)
    const wordPx = eosReadWordPx(root, phone)
    let top = EOS_READ_FLOOR_PX
    for (const [, d, p, kind] of EOS_READ_TARGETS) top = Math.max(top, kind === "word" ? wordPx : phone ? p : d)
    return { root, phone, wordPx, wordBase: phone ? 15 : 16, k: eosStageScale(root) || 1, idx: eosReadIndex(), stop: root, top, key: (phone ? "p" : "d") + wordPx, now: performance.now() }
}
// the target (CSS px, before the canvas scale) for one text element; words report kind "word" so the caller
// can apply the small-object rule. Cached per element: the match only changes with the element's or its
// parent's class (or the phone breakpoint / Bubble Text prop).
const EOS_READ_TCACHE = new WeakMap()
function eosReadTargetFor(el, ctx) {
    const p = el.parentElement
    const sig = ctx.key + "|" + (el.getAttribute("class") || "") + "|" + ((p && p.getAttribute("class")) || "")
    const c = EOS_READ_TCACHE.get(el)
    if (c && c[0] === sig) return c[1]
    const t = eosReadTargetCompute(el, ctx)
    EOS_READ_TCACHE.set(el, [sig, t])
    return t
}
function eosReadTargetCompute(el, ctx) {
    // the chain element → stage and every class on it (pre-filter for selectors with an ancestor part)
    const chain = []
    const cls = new Set()
    let str = ""
    for (let n = el, depth = 0; n && n.nodeType === 1 && depth < 24; n = n.parentElement, depth++) {
        chain.push(n)
        const c = n.getAttribute("class")
        if (c) {
            str += " " + c
            const cl = n.classList
            for (let i = 0; i < cl.length; i++) cls.add(cl[i])
        }
        if (n === ctx.stop || n.classList.contains("releaseStage")) break
    }
    let t = EOS_READ_FLOOR_PX
    let word = false
    const cand = []
    // the element itself or an ancestor matches a row (words: any depth inside the stage; others: ≤ 2 levels)
    for (let depth = 0; depth < chain.length; depth++) {
        const n = chain[depth]
        cand.length = 0
        eosReadCandidates(n, ctx.idx, cand)
        for (const e of cand) {
            if (!e.word && depth > 2) continue
            const want = e.word ? ctx.wordPx : ctx.phone ? e.p : e.d
            if (want <= t) continue
            if (e.need && !e.need.some((k) => cls.has(k))) continue
            if (e.needSub && !e.needSub.some((k) => str.includes(k))) continue
            let hit = false
            try {
                hit = n.matches(e.sel)
            } catch {}
            if (hit) {
                t = want
                word = e.word
            }
        }
    }
    return { px: t, word }
}
function eosReadSkipped(el) {
    if (el.closest(EOS_READ_SKIP)) return true
    // our own overlays (.eosCheckIn, .eosArena, .eosShiftMeter …) are designed ≥ 12 px
    for (let n = el, i = 0; n && n.nodeType === 1 && i < 14; n = n.parentElement, i++) {
        const c = n.getAttribute("class")
        if (c && EOS_READ_OWN.test(c)) return true
        if (n.classList.contains("releaseStage") || n.classList.contains("tsArcade")) break
    }
    return false
}
function eosReadOpacity(el, stop) {
    let o = 1
    for (let n = el, i = 0; n && n.nodeType === 1 && i < 10; n = n.parentElement, i++) {
        o *= Number(getComputedStyle(n).opacity)
        if (o < 0.2 || n === stop) break
    }
    return o
}
// scale of one node's own transform / scale / zoom (area-based, so a rotation is not mistaken for a shrink)
function eosReadOwnScale(cs) {
    let s = 1
    const t = cs.transform
    if (t && t !== "none") {
        const m = t.match(/matrix(3d)?\(([^)]+)\)/)
        if (m) {
            const v = m[2].split(",").map(Number)
            if (m[1]) s *= Math.sqrt(Math.hypot(v[0], v[1], v[2]) * Math.hypot(v[4], v[5], v[6]))
            else s *= Math.sqrt(Math.abs(v[0] * v[3] - v[1] * v[2]))
        }
    }
    const sc = cs.scale
    if (sc && sc !== "none") {
        const v = sc.split(/\s+/).map(Number)
        s *= v.length > 1 ? Math.sqrt(Math.abs(v[0] * v[1])) : Math.abs(v[0])
    }
    const z = Number(cs.zoom)
    if (Number.isFinite(z) && z > 0) s *= z
    return Number.isFinite(s) && s > 0 ? s : 1
}
// true when every keyframe keeps the box within ±6 % of its size (translate / rotate only count as 1)
function eosReadGentle(kf) {
    for (const f of kf) {
        for (const k of ["transform", "scale"]) {
            const v = f[k]
            if (!v || v === "none") continue
            const nums = []
            for (const m of String(v).matchAll(/scale(?:3d|X|Y|Z)?\(([^)]*)\)/g)) for (const x of m[1].split(",")) nums.push(parseFloat(x))
            for (const m of String(v).matchAll(/matrix\(([^)]*)\)/g)) {
                const q = m[1].split(",").map(Number)
                nums.push(Math.sqrt(Math.abs(q[0] * q[3] - q[1] * q[2])))
            }
            if (k === "scale") for (const x of String(v).split(/\s+/)) nums.push(parseFloat(x))
            for (const x of nums) if (!Number.isFinite(x) || x < 0.94 || x > 1.06) return false
        }
    }
    return true
}
// exact scale of `el` relative to the arcade root, and whether a running animation moves any of its boxes
// (an entrance pop is never "compensated": the text would end up too big once the pop finishes)
function eosReadChainScale(el, root, memo) {
    const chain = []
    let s = 1
    let moving = false
    for (let n = el; n && n !== root && n.nodeType === 1; n = n.parentElement) {
        const hit = memo.get(n)
        if (hit) {
            s *= hit.s
            moving = moving || hit.moving
            break
        }
        chain.push(n)
    }
    // fold from the top of the walked chain down, memoising every node's cumulative scale
    for (let i = chain.length - 1; i >= 0; i--) {
        const n = chain[i]
        const own = eosReadOwnScale(getComputedStyle(n))
        let mv = false
        try {
            for (const a of n.getAnimations()) {
                if (a.playState !== "running" && a.playState !== "pending") continue
                const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : []
                if (!kf.some((f) => Object.keys(f).some((k) => EOS_READ_MOVE.test(k)))) continue
                // a perpetual gentle breath (bubbleHypno: scale 1 ↔ 1.018) is not a size change
                const tm = a.effect.getComputedTiming ? a.effect.getComputedTiming() : null
                if (tm && tm.iterations === Infinity && eosReadGentle(kf)) continue
                mv = true
                break
            }
        } catch {}
        s *= own
        moving = moving || mv
        memo.set(n, { s, moving })
    }
    const top = memo.get(el)
    return top || { s, moving }
}
// collect text elements (direct non-empty text) inside the scopes, in DOM order
function eosReadCollect(scopes, max = 2000) {
    const out = []
    const seen = new Set()
    for (const scope of scopes) {
        if (!scope) continue
        const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
        while (w.nextNode()) {
            const tn = w.currentNode
            const el = tn.parentElement
            if (!el || seen.has(el)) continue
            const v = tn.nodeValue
            if (!v || !EOS_READ_TEXT.test(v)) continue
            seen.add(el)
            out.push(el)
            if (out.length >= max) return out
        }
    }
    return out
}
function eosReadSel(el) {
    const parts = []
    let n = el
    for (let i = 0; i < 3 && n && n.nodeType === 1; i++, n = n.parentElement) {
        const c = (n.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 3)
        parts.unshift(n.tagName.toLowerCase() + c.map((k) => "." + k).join(""))
    }
    return parts.join(" > ")
}
function eosReadZone(el) {
    const Z = [[".releaseConsoleHeader", "header"], [".releaseChoiceMenu", "menu"], [".globalPlayGuide", "guide"], [".engineProgressHud, .tsShiftRewardHud", "hud"], [".releaseCompleteOverlay", "reveal"], [".arena", "arena"], [".releaseStage", "stage"]]
    for (const [s, z] of Z) if (el.closest(s)) return z
    return "other"
}
function eosReadScopes(root) {
    const out = []
    for (const s of EOS_READ_SCOPES) {
        const el = root.querySelector(s)
        if (el) out.push(el)
    }
    return out
}
// remove our write and restore whatever inline value the element had before
function eosReadRestore(el) {
    const o = EOS_READ_STATE.orig.get(el)
    if (o && o[0]) el.style.setProperty("font-size", o[0], o[1])
    else el.style.removeProperty("font-size")
}
function eosReadWrite(el, px, natural) {
    const S = EOS_READ_STATE
    const had = S.tagged.get(el)
    if (!had) S.orig.set(el, [el.style.getPropertyValue("font-size"), el.style.getPropertyPriority("font-size")])
    el.style.setProperty("font-size", px.toFixed(2) + "px", "important")
    el.setAttribute("data-eos-floor", px.toFixed(1))
    S.tagged.set(el, { px, natural: had ? had.natural : natural })
    S.stats.writes++
}
// Re-check a slice of the elements we raised: where the game's own size has meanwhile grown past ours (a
// later state, a "big" class), our inline value is removed — it can never hold text smaller than the game
// wants. Batched: restore all → read all (one style recalc) → put back the ones still needed.
function eosReadRecheck(max = 16) {
    const S = EOS_READ_STATE
    if (!S.tagged.size) return
    const all = Array.from(S.tagged.keys())
    const slice = []
    for (let i = 0; i < Math.min(max, all.length); i++) {
        const el = all[(S.recheck + i) % all.length]
        if (!el.isConnected) S.tagged.delete(el)
        else if (!slice.includes(el)) slice.push(el)
    }
    S.recheck = (S.recheck + max) % Math.max(1, all.length)
    if (!slice.length) return
    const keep = slice.map((el) => [el, el.style.getPropertyValue("font-size"), S.tagged.get(el)])
    for (const [el] of keep) eosReadRestore(el)
    for (const [el, val, rec] of keep) {
        const fs = parseFloat(getComputedStyle(el).fontSize) || 0
        if (fs >= rec.px - 0.25) {
            S.tagged.delete(el)
            el.removeAttribute("data-eos-floor")
            S.stats.unfloored++
        } else {
            rec.natural = fs
            el.style.setProperty("font-size", val, "important") // exactly as it was: no visible change
        }
    }
}

// One floor pass. list = elements to look at (null = sweep the scopes; fromMo = new nodes, before their first
// paint: style reads only, no layout). Reads first, then writes. Time-boxed: stops after EOS_READ_BUDGET_MS of
// its own work and resumes from there on the next pass.
function eosReadPass(root, { list = null, fromMo = false } = {}) {
    const S = EOS_READ_STATE
    if (!root || !root.isConnected) return
    const t0 = performance.now()
    // bring style (and, for a sweep, layout) up to date first: a flush the next frame would do anyway;
    // it is reported separately (passes are scheduled right after a frame, when it costs ~0)
    if (fromMo) {
        if (list && list[0]) getComputedStyle(list[0]).fontSize // the new subtree's pending style recalc
    } else void root.offsetWidth
    const t1 = performance.now()
    const ctx = eosReadCtx(root)
    const els = list || eosReadCollect(eosReadScopes(root))
    const n = els.length
    const writes = []
    const memo = new Map()
    const start = list ? 0 : S.cursor % Math.max(1, n)
    let i = 0
    for (; i < Math.min(n, EOS_READ_MAX_EL); i++) {
        if ((i & 3) === 3 && performance.now() - t1 > EOS_READ_BUDGET_MS) break
        const el = els[(start + i) % n]
        if (!el.isConnected || el instanceof SVGElement) continue
        const cs = getComputedStyle(el)
        const fs = parseFloat(cs.fontSize) || 0
        if (fs >= 40) continue
        const tg = eosReadTargetFor(el, ctx)
        let tpx = tg.px
        let want = tpx / ctx.k
        if (fromMo) {
            if (tg.word) want = Math.min(want, ctx.wordBase / ctx.k) // the regular pass decides on bigger words
            if (fs >= want - 0.25) continue
            if (cs.display === "none" || cs.visibility === "hidden" || eosReadSkipped(el)) continue
            writes.push([el, want, fs])
            continue
        }
        // a quick layout read: is the box drawn smaller than its CSS size (a scaled object)?
        if (fs >= want - 0.25 && fs >= (EOS_READ_FLOOR_PX / ctx.k) * 1.5) continue
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        const ow = el.offsetWidth
        const oh = el.offsetHeight
        const quick = Math.max(ow ? r.width / ow : 1, oh ? r.height / oh : 1) / ctx.k
        if (tg.word && tpx > ctx.wordBase) {
            // words inside small objects (≤ 96 px) keep the base size; the Bubble Text prop raises the rest
            const op = el.offsetParent
            if (op && op.offsetWidth <= 96 && op.offsetHeight <= 96) want = ctx.wordBase / ctx.k
        }
        let scaled = false
        if (quick < 0.97) {
            const c = eosReadChainScale(el, root, memo)
            const seen = S.scaleSeen.get(el)
            const sameScale = seen && Math.abs(seen.s - c.s) < 0.01
            if (!sameScale) S.scaleSeen.set(el, { s: c.s, since: ctx.now })
            // compensate only a scale that has held still for 1.2 s and is not being animated (a shelved
            // card, a parked object) — never an entrance pop or a shrink-away mechanic
            if (sameScale && ctx.now - seen.since >= 1200 && !c.moving && c.s >= 0.6 && c.s < 0.97) {
                const need = EOS_READ_FLOOR_PX / (c.s * ctx.k)
                if (need > want) {
                    want = need
                    scaled = true
                }
            }
        }
        if (fs >= want - 0.25) continue
        if (cs.display === "none" || cs.visibility === "hidden") continue
        if (eosReadSkipped(el)) continue
        // no opacity skip: text that is fading in (a reveal card, a feedback line) must already be readable
        // when it becomes visible; growing a transparent label is harmless
        writes.push([el, want, fs])
        if (scaled) S.stats.scaled++
    }
    if (!list) {
        if (i < Math.min(n, EOS_READ_MAX_EL)) S.stats.capped++
        S.cursor = n ? (start + i) % n : 0
    }
    for (const [el, want, fs] of writes) eosReadWrite(el, want, fs)
    // last, so its style invalidation never lands in the middle of the sweep's reads
    if (!fromMo && S.passes % 3 === 2 && performance.now() - t1 < 0.9) eosReadRecheck(8)
    const t2 = performance.now()
    const ms = Math.round((t2 - t0) * 1000) / 1000
    const own = Math.round((t2 - t1) * 1000) / 1000
    S.passes++
    const st = S.stats
    st.passes++
    st.lastMs = ms
    st.totalMs += ms
    st.ownTotalMs += own
    st.seen = n
    st.flushMaxMs = Math.max(st.flushMaxMs, Math.round((t1 - t0) * 1000) / 1000)
    st.maxOwnMs = Math.max(st.maxOwnMs, own)
    if (fromMo) {
        st.moPasses++
        st.moMaxMs = Math.max(st.moMaxMs, ms)
    } else st.maxMs = Math.max(st.maxMs, ms)
    if (ms > 2) st.over2++
    if (own > 2) st.ownOver2++
    if (st.log.length < 400) st.log.push([fromMo ? 1 : 0, Math.round(own * 100) / 100, Math.round((t1 - t0) * 100) / 100, i])
}

// Read-only report for the harness (window.__eos.readability.scan → eos_drive.smallText): every visible text
// element rendered below its target (rendered px = computed size × its box scale, as the harness measures;
// SVG text = bbox height ÷ canvas scale). Never writes.
function eosReadScan(rootIn) {
    const out = []
    try {
        const root = rootIn || (typeof document !== "undefined" ? document.querySelector(".tsArcade") : null)
        if (!root) return out
        const ctx = eosReadCtx(root)
        const groups = new Map()
        const add = (el, px, target, kind) => {
            const sel = eosReadSel(el)
            const key = sel + "|" + px
            const g = groups.get(key)
            if (g) g.n++
            else groups.set(key, { text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60), px, target, sel, zone: eosReadZone(el), kind, n: 1 })
        }
        for (const el of eosReadCollect(eosReadScopes(root), 4000)) {
            if (!el.isConnected) continue
            const r = el.getBoundingClientRect()
            if (r.width < 1 || r.height < 1) continue
            if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") continue
            if (el.closest('[aria-hidden="true"],[hidden],.eosSrOnly,.tsRewardSurge')) continue
            if (eosReadOpacity(el, null) < 0.2) continue
            if (el instanceof SVGElement) {
                const px = Math.round((r.height / ctx.k) * 10) / 10
                if (px < EOS_READ_MIN - 0.05) add(el, px, EOS_READ_MIN, "svg")
                continue
            }
            const fs = parseFloat(cs.fontSize) || 0
            const sk = el.offsetWidth > 0 && el.offsetHeight > 0 ? Math.min(r.width / el.offsetWidth, r.height / el.offsetHeight) : 1
            const px = Math.round(fs * (Number.isFinite(sk) && sk > 0 ? sk : 1) * 10) / 10
            let target = EOS_READ_MIN
            if (!el.closest(".chainStart") && !eosReadSkipped(el)) {
                const tg = eosReadTargetFor(el, ctx)
                target = tg.word ? ctx.wordBase : tg.px > EOS_READ_FLOOR_PX ? tg.px : EOS_READ_MIN
            }
            if (px < target - 0.3) add(el, px, target, target > EOS_READ_MIN ? "target" : "floor")
        }
        for (const g of groups.values()) out.push(g)
    } catch (e) {
        out.push({ text: "scan failed: " + e, px: 0, sel: "", zone: "error" })
    }
    return out.sort((a, b) => a.px - b.px)
}

// a class change only matters (and only costs a pass) when it adds a class some target row keys on
// (.tsExactUserText, .potatoWord …); state toggles like isHit / hot / active are ignored here
function eosReadClassGain(r) {
    const el = r.target
    if (!el || el.nodeType !== 1 || !el.isConnected) return false
    const idx = eosReadIndex()
    const old = " " + (r.oldValue || "") + " "
    const cl = el.classList
    for (let i = 0; i < cl.length; i++) {
        const k = cl[i]
        if (old.includes(" " + k + " ")) continue
        if (idx.cls.has(k) || idx.need.has(k)) return true
        for (const [sb] of idx.sub) if (sb && k.includes(sb)) return true
    }
    return false
}

// The floor component: mounted once by I1 inside .releaseStage (renders a hidden marker span). Runs in
// stage-play, stage-reveal and stage-input while the game menu is open: right after a frame (style and
// layout are clean then, so a pass costs well under 2 ms), every 900 ms, 250 ms after a pointerup, and —
// for small DOM additions (a feedback line, a re-mounted control) — inside the MutationObserver callback,
// i.e. before that text is first painted (no flash of tiny text).
function EosTextFloor({ stage }) {
    const ref = React.useRef(null)
    React.useEffect(() => {
        const marker = ref.current
        const root = marker && marker.closest ? marker.closest(".tsArcade") : null
        if (!root || typeof MutationObserver === "undefined") return
        let alive = true
        let queued = false
        const timers = new Set()
        const active = () => stage === "play" || stage === "reveal" || !!root.querySelector(".releaseChoiceMenu")
        const run = () => {
            queued = false
            if (!alive) return
            try {
                if (active()) eosReadPass(root)
            } catch {}
        }
        // right after the next frame has rendered: style + layout are clean, so reading them is cheap
        const soon = () => {
            if (queued || !alive) return
            queued = true
            const go = () => {
                const t = setTimeout(() => {
                    timers.delete(t)
                    run()
                }, 0)
                timers.add(t)
            }
            if (typeof requestAnimationFrame === "function") requestAnimationFrame(go)
            else go()
        }
        const later = (ms) => {
            const t = setTimeout(() => {
                timers.delete(t)
                soon()
            }, ms)
            timers.add(t)
        }
        const mo = new MutationObserver((recs) => {
            if (!alive || !active()) return
            // short-lived copy (a hit's feedback line, the finish card, the reveal) first: it is on screen for
            // about a second, so it must be right at its first paint; re-mounted game controls come next
            const first = []
            const rest = []
            const seen = new Set()
            const done = new Set()
            let total = 0
            for (const r of recs) {
                const nodes = r.type === "attributes" ? (eosReadClassGain(r) && r.target.childElementCount <= 24 && !done.has(r.target) ? [r.target] : []) : r.addedNodes
                for (const node of nodes) {
                    done.add(node)
                    const el = node.nodeType === 1 ? node : node.nodeType === 3 ? node.parentElement : null
                    if (!el || !el.isConnected) continue
                    if (el.closest(EOS_READ_SKIP) || !el.closest(".releaseStage, .releaseConsoleHeader, .releaseChoiceMenu")) continue
                    const bucket = el.closest(EOS_READ_FIRST) || (node.nodeType === 1 && node.querySelector(EOS_READ_FIRST)) ? first : rest
                    for (const t of node.nodeType === 3 ? [el] : eosReadCollect([el], EOS_READ_MO_MAX))
                        if (!seen.has(t)) {
                            seen.add(t)
                            bucket.push(t)
                            total++
                        }
                    if (total >= EOS_READ_MO_MAX) break
                }
                if (total >= EOS_READ_MO_MAX) break
            }
            if (!total) return
            try {
                eosReadPass(root, { list: first.concat(rest), fromMo: true })
            } catch {}
            soon() // the regular pass adds the layout-aware parts (scaled objects) and anything past the budget
        })
        // class changes too: the wrappers tag a re-mounted word with .tsExactUserText (and a smaller size)
        // after React mounts it — that is caught here, before it is painted
        mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true })
        const onUp = () => later(250)
        root.addEventListener("pointerup", onUp, true)
        EOS_READ_STATE.cursor = 0
        soon()
        ;[300, 700].forEach(later)
        const iv = setInterval(soon, 900)
        return () => {
            alive = false
            clearInterval(iv)
            for (const t of timers) clearTimeout(t)
            root.removeEventListener("pointerup", onUp, true)
            mo.disconnect()
        }
    }, [stage])
    return <span hidden data-eos="text-floor" ref={ref} />
}

const eosReadRoot = () => (typeof document !== "undefined" ? document.querySelector(".tsArcade") : null)
eosExpose("readability", {
    scan: () => eosReadScan(),
    targets: EOS_READ_TARGETS,
    pass: () => {
        const root = eosReadRoot()
        if (root) eosReadPass(root)
        return { ...EOS_READ_STATE.stats }
    },
    stats: () => {
        const st = EOS_READ_STATE.stats
        const r3 = (v) => Math.round(v * 1000) / 1000
        return { ...st, log: undefined, tagged: EOS_READ_STATE.tagged.size, avgMs: st.passes ? r3(st.totalMs / st.passes) : 0, avgOwnMs: st.passes ? r3(st.ownTotalMs / st.passes) : 0 }
    },
    reset: () => {
        EOS_READ_STATE.stats = eosReadStatsZero()
    },
    log: () => EOS_READ_STATE.stats.log.slice(),
    // test hook: the floor target (CSS px) the table gives one element
    targetOf: (el) => {
        const root = eosReadRoot()
        return root && el ? eosReadTargetCompute(el, eosReadCtx(root)) : null
    },
    targetsOf: (els) => {
        const root = eosReadRoot()
        const ctx = root ? eosReadCtx(root) : null
        return ctx ? Array.from(els, (el) => eosReadTargetCompute(el, ctx)) : []
    },
})
