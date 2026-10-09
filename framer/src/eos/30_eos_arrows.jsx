// ===================================================================================
// EOS · 30 ARROWS — a guide arrow for every stage of every game (docs/EOS_SPEC.md §3, task `arrows`).
// One cartoon glove + gold chevron + chunky label aimed at the LIVE target and demonstrating the exact
// gesture (tap, rapid taps, hold, hold-and-release, drag, slow drag, swipe, slingshot, rub, rhythm,
// alternate, pick one, tool first, hands off, type). Read-only DOM: it never writes into
// .cinematicContentShell; it reads [data-eos-target] markers (games 111+), the per-game table below
// (ids 1-110), the progress bar and capture-phase pointer events on the game host.
//
// Exports (shared file scope): EOS_GESTURES, EOS_GLYPH_OVERRIDE, EosGestureFor, eosGlyph,
//   EosGuideArrows, EosHandCue, EosHandHint, EOS_ARROWS_CSS (+ eosExpose("arrows", {..., state})).
// Integration (I1, already scripted in dev/eos_integrate.py):
//   E3  <EosGuideArrows game={selected} entries={renderedEntries} hostRef={gameHostRef} reduced={!!reduced} />
//       inside section.releaseStage while stage === "play" (keyed with the engine).
//   E4/E6  <i className="guideActionArrow" aria-hidden="true">{eosGlyph(p.game)}</i> in both LIVE GUIDE cards.
// Consumers (check-in, Still Moment, shift meter): eosApi("arrows").EosHandHint?.({...}) or
//   const Hint = eosApi("arrows").EosHandHint; Hint ? <Hint target={…} g="choose" label="TAP HOW YOU FEEL" /> : null
// ===================================================================================

// ---------------------------------------------------------------- §3.11 per-game stages (ids 1-110)
// Stage keys: t selector · g gesture · L label ("@text" = element text) · L2 second line (wait) · maxSpeed ·
// dir, d, n, ms, to, bpm · lit (timing: selector that means NOW) · meter + mvar + win (hold meter) · armed
// (tool done-state) · when (eligible only while this selector exists) · until:"touch", once · pick ·
// own (the game draws its own cue → level 1 for veterans) · ox, oy (target-point offset, fraction).
const EOS_GESTURES = {
    1: [{ t: "button.popBubbleV2", g: "tap", pick: "near", L: "POP IT!" }],
    2: [{ t: "button.uniqControl", g: "taps", n: 4, L: "CRUSH ×4" }],
    3: [{ t: "button.crackToolDock", g: "tool", armed: ".selected", L: "GRAB THE HAMMER" }, { t: ".crackBubbleSlot", g: "taps", n: 3, pick: "near", L: "CRACK ×3" }],
    4: [{ t: "button.stompToolDock", g: "tool", armed: ".selected", L: "GRAB THE BOOT" }, { t: ".stompBubbleSlot", g: "taps", n: 3, pick: "near", L: "STOMP ×3" }],
    5: [{ t: "button.uniqControl", g: "tap", L: "SWING!" }],
    6: [{ t: "button.zapGroundButton", g: "taps", n: 3, L: "ZAP ×3" }],
    7: [{ t: ".pinTool", g: "drag", dir: "r", d: 130, L: "SLIDE THE PIN →" }],
    8: [{ t: ".meteorRock", g: "sling", dir: "d", d: 110, L: "PULL DOWN · LET GO" }],
    9: [{ t: "button.laserToolDock", g: "tool", armed: ".selected", L: "GRAB THE LASER" }, { t: ".laserTargetBubble", g: "taps", n: 3, pick: "near", L: "ZAP ×3" }],
    10: [{ t: "button.uniqControl", g: "tap", L: "TIP IT OVER" }],
    11: [{ t: "button.uniqControl", g: "holdRelease", ms: 950, meter: ".pressureCapsule", mvar: "--p", win: [55, 92], L: "HOLD… LET GO ON GREEN" }],
    12: [{ t: "button.uniqControl", g: "taps", n: 3, L: "HIT ×3" }],
    13: [{ t: "button.uniqControl", g: "hold", ms: 1300, L: "PRESS & HOLD" }],
    14: [{ t: "button.paperCorner:not(:disabled)", g: "seq", L: "FOLD THIS CORNER" }],
    15: [{ t: "button.shredAction", g: "taps", n: 5, L: "FEED IT ×5" }],
    16: [{ t: "button.meltToolButton", g: "tool", armed: ".active", L: "LIGHT THE TORCH" }, { t: ".cartoonIceCube", g: "taps", n: 3, pick: "near", L: "TORCH IT ×3" }],
    17: [{ t: "button.weakSpot:not(.dead)", g: "seq", L: "HIT THE GLOWING SPOT" }],
    18: [{ t: "button.burnGroundButton", g: "hold", ms: 3000, L: "HOLD THE FLAME" }],
    19: [{ t: "button.eraseActivateBtn", g: "tool", armed: ".active", L: "GRAB THE ERASER" }, { t: ".eraseWordBubble", g: "scrub", pick: "near", L: "RUB IT OUT" }],
    20: [{ t: ".glitchPanel button.live", g: "seq", L: "TAP THE LIT SHAPE" }],
    21: [{ t: ".binWordBubble", g: "dragTo", to: ".binMouthTarget", pick: "near", L: "DROP IT IN THE BIN" }],
    22: [{ t: "button.flushLever", g: "tap", L: "FLUSH!" }],
    23: [{ t: "button.vacuumBtn", g: "tap", L: "SUCK IT UP" }],
    24: [{ t: ".slingshotWord", g: "sling", dir: "dl", d: 110, L: "PULL BACK · LET GO" }],
    25: [{ t: ".swipeCard.physical", g: "swipe", dir: "r", d: 190, L: "SWIPE IT AWAY →" }],
    26: [{ t: ".launchLever", g: "drag", dir: "d", d: 160, L: "PULL THE LEVER ↓" }],
    27: [{ t: ".weightedBlock", g: "drag", dir: "d", d: 130, L: "DROP IT ↓" }],
    28: [{ t: "button.uniqControl", g: "tap", L: "OPEN THE DRAWER" }, { t: ".fileCard", g: "drag", dir: "d", d: 100, L: "FILE IT ↓" }],
    29: [{ t: ".verticalFader", g: "drag", dir: "d", d: 150, L: "SLIDE IT DOWN ↓" }],
    30: [{ t: "button.uniqControl", g: "taps", n: 4, L: "ZOOM OUT ×4" }],
    31: [{ t: ".passengerCard", g: "drag", dir: "dr", d: 130, L: "SLIDE IT BACK ↘" }],
    32: [{ t: "button.parkBay", g: "choose", L: "PARK IT HERE" }],
    33: [{ t: "button.balloonWeight:not(.cut)", g: "seq", L: "SNIP THIS STRING" }],
    34: [{ t: ".leafWord", g: "drag", dir: "d", d: 80, L: "INTO THE RIVER ↓" }],
    35: [{ t: "button.uniqControl", g: "tap", L: "LET IT PASS" }],
    36: [{ t: ".neonCloud", g: "slow", dir: "r", d: 160, ms: 1800, maxSpeed: 260, L: "DRAG… SLOWLY →" }],
    37: [{ t: ".floorStack button:not(:disabled)", g: "seq", L: "DOWN A FLOOR" }],
    38: [{ t: "button.uniqControl", g: "tap", L: "@text" }, { t: ".drawerCard", g: "drag", dir: "d", d: 90, L: "DROP IT IN ↓" }],
    39: [{ t: "button.uniqControl", g: "hold", ms: 1200, L: "HOLD — DON'T LET GO" }],
    40: [{ t: "button.uniqControl", g: "tap", L: "@text" }, { t: ".paperPlane", g: "swipe", dir: "r", d: 170, L: "THROW IT →" }],
    41: [{ t: ".unhookWordBubble", g: "taps", n: 3, pick: "near", L: "UNHOOK ×3" }],
    42: [{ t: ".knot:not(.loose)", g: "drag", dir: "ur", d: 70, L: "WIGGLE THIS KNOT" }],
    43: [{ t: "button.cutLoopScissorPicker", g: "tool", armed: ".active", L: "GRAB THE SCISSORS" }, { t: "button.cutLoopWord:not(:disabled)", g: "taps", n: 3, pick: "near", L: "SNIP ×3" }],
    44: [{ t: ".velcroPatch", g: "slow", dir: "r", d: 170, ms: 1800, L: "PEEL… SLOWLY →" }],
    45: [{ t: ".attentionOrb", g: "drag", dir: "r", d: 200, L: "PULL IT FREE →" }],
    46: [{ t: ".pushPin", g: "drag", dir: "u", d: 110, L: "PULL STRAIGHT UP ↑" }],
    47: [{ t: ".plug", g: "drag", dir: "r", d: 150, L: "UNPLUG IT →" }],
    48: [{ t: ".stickerWord", g: "drag", dir: "ur", d: 120, L: "PEEL IT UP ↗" }],
    49: [{ t: ".zipperPull", g: "drag", dir: "r", d: 180, L: "UNZIP →" }],
    50: [{ t: ".chainLink input", g: "type", L: "TYPE A FEW WORDS" }, { t: "button.premiumBigAction", g: "tap", L: "SHOW ME" }],
    51: [{ t: ".orbitButtons button.live", g: "seq", L: "TAP THIS VIEW" }],
    52: [{ t: ".genreKeys button", g: "choose", L: "PICK A GENRE" }],
    53: [{ t: "button.uniqControl", g: "taps", n: 4, L: "MAKE IT SILLY ×4" }],
    54: [{ t: "button.fontDial", g: "taps", n: 4, L: "TURN IT ×4" }],
    55: [{ t: ".productionStrip button:not(:disabled)", g: "seq", L: "TURN THE DRAMA DOWN" }],
    56: [{ t: ".courtTargets button", g: "choose", L: "WHAT IS IT?" }],
    57: [{ t: "button.uniqControl", g: "taps", n: 3, L: "ROTATE ×3" }],
    58: [{ t: "button.focusKnob", g: "taps", n: 4, L: "FOCUS ×4" }],
    59: [{ t: ".spotLamp", g: "drag", dir: "lr", d: 150, L: "MOVE THE LIGHT ↔" }],
    60: [{ t: "button.cropHandle:not(:disabled)", g: "seq", L: "WIDEN HERE" }],
    61: [{ t: "button.freezeWordCube", g: "taps", n: 3, pick: "near", L: "FREEZE ×3" }],
    62: [{ t: "button.catchNet", g: "tap", L: "CATCH IT" }],
    63: [{ t: ".portalRing button.hot", g: "seq", L: "TAP THE GLOW" }],
    64: [{ t: "button.uniqControl", g: "timing", lit: ".trafficLamp.p0", L: "WAIT FOR RED…" }],
    65: [{ t: "button.uniqControl", g: "hold", ms: 2400, meter: ".pauseRing", mvar: "--p", L: "HOLD TO PAUSE" }],
    66: [{ g: "wait", ms: 3000, L: "HANDS OFF", L2: "BREATHE WITH THE GLOW" }],
    67: [{ t: ".tapOutPads button.eosNext", g: "alt", L: "LEFT · RIGHT · LEFT" }, { t: ".tapOutPads button", g: "alt", L: "LEFT · RIGHT · LEFT" }],
    68: [{ t: ".drumKit button", g: "taps", n: 10, pick: "near", L: "DRUM! ×10" }],
    69: [{ t: "button.uniqControl", g: "timing", bpm: 40, L: "TAP… SLOWLY" }],
    70: [{ t: "button.uniqControl", g: "timing", bpm: 48, L: "EVERY OTHER BEAT" }],
    71: [{ t: ".defuseZone.active button", g: "seq", L: "DO THIS STEP" }],
    72: [{ t: "button.uniqControl", g: "tap", L: "CATCH IT" }, { t: ".labelButtons button", g: "choose", L: "NAME IT" }],
    73: [{ t: ".signalConsole button.light", g: "choose", L: "PICK A LIGHT" }],
    74: [{ t: ".bubbleWrapSheet button:not(.popped)", g: "seq", L: "POP THIS ONE" }],
    75: [{ t: ".inkDrop", g: "drag", dir: "r", d: 180, L: "DRAG THE INK →" }],
    76: [{ t: "button.uniqControl", g: "taps", n: 4, L: "REWIND ×4" }],
    77: [{ t: ".brakeHandle", g: "drag", dir: "d", d: 160, L: "PULL THE BRAKE ↓" }],
    78: [{ t: ".oneWordField button", g: "choose", L: "PICK ONE" }],
    79: [{ t: ".missPads button:not(.target)", g: "tap", pick: "near", L: "MISS ON PURPOSE" }],
    80: [{ g: "wait", ms: 5000, L: "DON'T TOUCH", L2: "BREATHE WITH THE GLOW" }],
    81: [{ t: ".blockTray button", g: "choose", L: "STACK IT" }],
    82: [{ t: ".nudgeRow button:nth-child(2)", g: "tap", when: '.seesawBeam[style*="rotate(0deg)"]', L: "CHECK BALANCE" }, { t: ".nudgeRow button:nth-child(3)", g: "tap", when: '.seesawBeam[style*="rotate(-"]', L: "SHIFT IT →" }, { t: ".nudgeRow button:nth-child(1)", g: "tap", L: "← SHIFT IT" }],
    83: [{ t: ".chuteRow button", g: "choose", L: "SEND IT" }],
    84: [{ t: ".ownershipCard", g: "swipe", dir: "lr", d: 150, L: "← MINE · NOT MINE →" }],
    85: [{ t: ".controlPanelSwitches button", g: "choose", L: "PICK ONE MOVE" }],
    86: [{ t: ".rubberStamps button", g: "choose", L: "STAMP IT" }],
    87: [{ t: ".keepDropCard", g: "drag", dir: "ud", d: 140, own: true, L: "↑ KEEP · ↓ DROP" }],
    88: [{ t: ".tradeOptions button", g: "choose", L: "PICK A PRIZE" }, { t: "button.coinSlot", g: "tap", L: "INSERT A COIN" }],
    89: [{ t: "button.doorABFrame:not(.exploredDoor)", g: "tap", L: "PEEK INSIDE" }],
    90: [{ t: "button.coin.realFlipCoin", g: "tap", L: "FLIP IT" }],
    91: [{ t: ".priorityBubbleTray button", g: "drag", dir: "u", d: 120, L: "DRAG INTO A SLOT" }],
    92: [{ t: ".intensityRuler button", g: "choose", L: "TAP A NUMBER" }],
    93: [{ t: ".spaceTile:not(.moved)", g: "drag", dir: "out", d: 90, pick: "near", own: true, L: "PUSH IT OUT" }],
    94: [{ t: ".juggleBall.selected", g: "taps", n: 3, L: "TAP ×3" }, { t: ".juggleBall", g: "choose", L: "KEEP ONE" }],
    95: [{ t: ".shelfThoughtBubble:not(.shelved)", g: "drag", dir: "u", d: 120, pick: "near", own: true, L: "LIFT IT ONTO THE SHELF" }],
    96: [{ t: "button.scratchToolButton", g: "tool", armed: ".toolArmed", L: "GRAB THE SCRATCHER" }, { t: ".scratchPlayArea", g: "scrub", L: "SCRATCH" }],
    97: [{ t: "button.xrayBurnAllButton", g: "tap", L: "BURN IT ALL" }, { t: "button.xrayScannerHandle", g: "drag", dir: "r", d: 180, own: true, L: "SCAN IT →" }],
    98: [{ t: "button.magicLeverHandle", g: "drag", dir: "d", d: 90, when: ".magicTrapBubble.selected", L: "PULL THE LEVER ↓" }, { t: "button.magicTrapBubble", g: "choose", L: "PICK ONE" }],
    99: [{ t: "button.echoHoldBubble:not(.gone)", g: "hold", ms: 5000, pick: "near", L: "HOLD TO QUIET IT" }],
    100: [{ t: "button.thoughtPotato.hot", g: "drag", dir: "out", d: 90, pick: "near", own: true, L: "TOSS IT AWAY" }],
    101: [{ t: "button.tugLetGo:not(:disabled)", g: "tap", L: "NOW LET GO" }, { t: "button.tugPullHandle", g: "drag", dir: "l", d: 80, own: true, L: "PULL ←" }],
    102: [{ t: ".ftRow:not(.released)", g: "drag", dir: "r", d: 110, ox: -0.4, own: true, L: "PUSH IN · DON'T PULL" }],
    103: [{ t: "button.spDropButton", g: "tap", L: "LOWER IT" }],
    104: [{ t: '.knobHitZone:not([aria-valuenow="0"]):not([aria-valuenow="1"]):not([aria-valuenow="2"]):not([aria-valuenow="3"]):not([aria-valuenow="4"]):not([aria-valuenow="5"]):not([aria-valuenow="6"]):not([aria-valuenow="7"]):not([aria-valuenow="8"]):not([aria-valuenow="9"]):not([aria-valuenow="10"]):not([aria-valuenow="11"]):not([aria-valuenow="12"])', g: "drag", dir: "d", d: 90, L: "TURN IT DOWN ↓" }],
    105: [{ t: "button.dmCutButton:not(:disabled)", g: "tap", L: "CUT!" }, { t: "button.dmDramaButton:not(:disabled)", g: "tap", L: "MAKE IT DRAMATIC" }],
    106: [{ t: "button.tsndKey:not(.done):not(:disabled)", g: "taps", n: 3, L: "PLAY ×3" }, { t: ".tsndVibes button", g: "choose", L: "PICK A VIBE" }],
    107: [{ t: ".gwCard.weirdWordBubble", g: "tap", when: "button.gwProp.propSelected", pick: "near", L: "STICK IT ON" }, { t: "button.gwProp:not(:disabled)", g: "choose", L: "PICK A PROP" }],
    108: [{ t: "button.uniqControl", g: "tap", until: "touch", once: true, L: "SHAKE IT" }, { t: ".saladBowl button:not(.restored)", g: "tap", L: "TAP TO SWAP" }],
    109: [{ t: "button.cleanseBubbleHoldButton:not(:disabled)", g: "hold", ms: 900, mvar: "--hold-pct", pick: "near", L: "HOLD… THEN LET GO" }],
    110: [{ t: ".rainCloudUnit:not(.pulled)", g: "drag", dir: "d", d: 110, pick: "near", own: true, L: "PULL IT DOWN ↓" }],
    // 111+ (EOS games): no entry — engines mark the live element(s) with eosTarget({...}).
}

// LIVE GUIDE glyph of the stage that is live at progress 0, for games whose table lists the advanced stage first.
const EOS_GLYPH_OVERRIDE = { 88: "☝", 94: "◎", 97: "→", 98: "◎", 101: "←", 106: "◎", 107: "◎" }

const EOS_ARROWS_DIRV = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1], ur: [0.7071, -0.7071], ul: [-0.7071, -0.7071], dr: [0.7071, 0.7071], dl: [-0.7071, 0.7071], lr: [1, 0], ud: [0, -1] }
const EOS_ARROWS_ARROW = { r: "→", l: "←", u: "↑", d: "↓", ur: "↗", ul: "↖", dr: "↘", dl: "↙", lr: "↔", ud: "↕", out: "⤢", in: "⤡" }
const EOS_ARROWS_GLYPH_G = { tap: "☝", taps: "☝", seq: "☝", timing: "☝", tool: "☝", hold: "◉", holdRelease: "◉", choose: "◎", scrub: "〰", sling: "↶", swipe: "⇢", alt: "⇄", wait: "✋", type: "✎" }
// §3.4 dead-state classes (incl. the foundation sweep's shelved|severed|erased|moved|restored)
const EOS_ARROWS_DEAD = /\b(dead|gone|popped|cut|loose|released|pulled|done|isDone|isGone|melted|binned|cooled|exploredDoor|shelved|severed|erased|moved|restored)\b/
const EOS_ARROWS_EXCLUDE = ".globalPlayGuide, .engineProgressHud, .tsShiftRewardHud, .eosArrowLayer"
const EOS_ARROWS_AVOID = ".globalPlayGuide, .engineProgressHud, .tsShiftRewardHud, .eosCompanion, .eosSafetyCard, .eosSupportPill, .eosWorldChips"
const EOS_ARROWS_FALLBACK = [".arena button:not(:disabled)", "button.uniqControl:not(:disabled)", '.arena [style*="touch-action: none"]', ".uniqWord", "[class*=ToolDock]", ".tsThoughtLabelHost", "[class*=ToolButton]", "[class*=ActivateBtn]", "button.wordBubble"]
const EOS_ARROWS_DRAGS = { drag: 1, slow: 1, swipe: 1, sling: 1 }
const EOS_ARROWS_HOLDS = { hold: 1, holdRelease: 1 }

// ---------------------------------------------------------------- glyphs, default labels, gesture lookup
function eosArrowsGlyphOf(s) {
    if (!s || !s.g) return "☝"
    if (s.g === "drag" || s.g === "slow" || s.g === "dragTo") return EOS_ARROWS_ARROW[s.dir] || "→"
    return EOS_ARROWS_GLYPH_G[s.g] || "☝"
}
// Glyph for the LIVE GUIDE panel (§3.7): override → first stage of the table → registered gesture (111+).
function eosGlyph(game) {
    const id = Number(game && game.id) || 0
    if (EOS_GLYPH_OVERRIDE[id]) return EOS_GLYPH_OVERRIDE[id]
    if (id >= 111) {
        const m = typeof EOS_GAME_META !== "undefined" ? EOS_GAME_META[id] : null
        return m && m.gesture ? eosArrowsGlyphOf({ g: m.gesture, dir: m.dir }) : "☝"
    }
    const st = EOS_GESTURES[id]
    return st && st.length ? eosArrowsGlyphOf(st[0]) : "☝"
}
// → {stages, glyph, own}. Ids ≥ 111 have no stages: their engines mark targets with eosTarget().
function EosGestureFor(game) {
    const id = Number(game && game.id) || 0
    const stages = id >= 111 ? [] : EOS_GESTURES[id] || []
    return { stages, glyph: eosGlyph(game), own: stages.some((s) => !!s.own) }
}
function eosArrowsDefaultLabel(s) {
    const g = (s && s.g) || "tap"
    const map = {
        tap: "TAP IT", taps: `TAP ×${(s && s.n) || 3}`, hold: "HOLD", holdRelease: "HOLD… LET GO ON GREEN", drag: `DRAG ${EOS_ARROWS_ARROW[s && s.dir] || "→"}`,
        dragTo: "DROP IT IN", slow: "DRAG… SLOWLY", swipe: `SWIPE ${EOS_ARROWS_ARROW[s && s.dir] || "→"}`, sling: "PULL BACK · LET GO", scrub: "RUB IT OUT",
        timing: "TAP… SLOWLY", alt: "LEFT · RIGHT", choose: "PICK ONE", seq: "TAP THE GLOWING ONE", tool: "GRAB THE TOOL", wait: "HANDS OFF", type: "TYPE A FEW WORDS",
    }
    return map[g] || "TAP IT"
}

// ---------------------------------------------------------------- DOM helpers (read-only)
function eosArrowsCls(el) {
    if (!el) return ""
    return typeof el.className === "string" ? el.className : (el.getAttribute && el.getAttribute("class")) || ""
}
function eosArrowsQsa(root, sel) {
    if (!root || !sel) return []
    try {
        return Array.from(root.querySelectorAll(sel))
    } catch {
        return []
    }
}
function eosArrowsQ(root, sel) {
    if (!root || !sel) return null
    try {
        return root.querySelector(sel)
    } catch {
        return null
    }
}
// §3.4.5 usable element → its client rect, or null.
function eosArrowsUsable(el, SR, k) {
    if (!el || !el.getBoundingClientRect || !el.isConnected) return null
    if (el.disabled || (el.getAttribute && el.getAttribute("aria-disabled") === "true")) return null
    if (el.closest && el.closest(EOS_ARROWS_EXCLUDE)) return null
    if (EOS_ARROWS_DEAD.test(eosArrowsCls(el))) return null
    const r = el.getBoundingClientRect()
    const kk = k || 1
    if (r.width / kk < 12 || r.height / kk < 12) return null
    if (SR && (r.right <= SR.left || r.left >= SR.right || r.bottom <= SR.top || r.top >= SR.bottom)) return null
    let e = el
    for (let i = 0; i < 4 && e && e.nodeType === 1; i++) {
        const cs = getComputedStyle(e)
        if (cs.display === "none" || (i === 0 && cs.visibility === "hidden") || Number(cs.opacity) < 0.05) return null
        e = e.parentElement
    }
    return r
}
// Hit test: the centre, else the first of the 4 points at 25 %/75 % that lands on the element.
function eosArrowsAim(el, r) {
    const pts = [
        [0.5, 0.5],
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
    ]
    for (const [fx, fy] of pts) {
        const x = r.left + r.width * fx
        const y = r.top + r.height * fy
        let hit = null
        try {
            hit = document.elementFromPoint(x, y)
        } catch {}
        if (hit && (hit === el || el.contains(hit))) return { x, y, occluded: false }
    }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, occluded: true }
}
function eosArrowsMarkerSpec(el) {
    const d = (el && el.dataset) || {}
    const num = (v) => (v == null || v === "" ? undefined : Number(v))
    return {
        g: d.eosG || "tap", dir: d.eosDir, d: num(d.eosD), n: num(d.eosN), ms: num(d.eosMs), to: d.eosTo, bpm: num(d.eosBpm), L: d.eosLabel,
        win: d.eosWin ? d.eosWin.split(",").map(Number) : undefined, meter: d.eosMeter, mvar: d.eosMvar, armed: d.eosArmed,
        maxSpeed: num(d.eosMaxSpeed), own: d.eosOwn === "1", ox: num(d.eosOx), oy: num(d.eosOy),
    }
}
function eosArrowsMarkerIdent(el) {
    return eosArrowsCls(el)
        .split(/\s+/)
        .filter((k) => k && !/^(is[A-Z]\w*|active|on|hot|live)$/.test(k))
        .slice(0, 3)
        .join(".")
}
function eosArrowsElText(el) {
    const t = String((el && el.textContent) || "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^THOUGHT MOVE\s*·\s*/i, "")
        .toUpperCase()
    return t.length > 22 ? t.slice(0, 22).trim() : t
}
function eosArrowsUnion(a, b) {
    if (!a) return b ? { ...b } : null
    if (!b) return { ...a }
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}
function eosArrowsHit(a, b, pad = 0) {
    return !!a && !!b && a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y
}
// Rects (layer px) of the game's own visible copy inside the arena — the label tries not to cover it (prompts,
// safety lines such as 111's "Dizzy or tingly? Breathe normally"). Text nodes only; capped; refreshed every 600 ms.
function eosArrowsTextRects(A, L, k, max = 80) {
    const out = []
    try {
        if (!A || !L || typeof document === "undefined" || !document.createTreeWalker) return out
        const R = L.getBoundingClientRect()
        const kk = k || 1
        const w = document.createTreeWalker(A, 4 /* NodeFilter.SHOW_TEXT */)
        const rg = document.createRange()
        let n
        let seen = 0
        while ((n = w.nextNode()) && seen < 500 && out.length < max) {
            seen += 1
            const t = n.nodeValue
            if (!t || t.trim().length < 2) continue
            const pe = n.parentElement
            if (!pe || (pe.closest && pe.closest(".eosArrowLayer, [aria-hidden='true'] svg"))) continue
            rg.selectNodeContents(n)
            const r = rg.getBoundingClientRect()
            if (r.width < 6 || r.height < 6 || r.right < R.left || r.left > R.right || r.bottom < R.top || r.top > R.bottom) continue
            out.push({ x: (r.left - R.left) / kk, y: (r.top - R.top) / kk, w: r.width / kk, h: r.height / kk })
        }
    } catch {}
    return out
}
// how far (px) one can travel from (x, y) along unit u before leaving [m, W-m] × [m, H-m]
function eosArrowsRoom(x, y, u, W, H, m = 14) {
    let t = 1e6
    if (u[0] > 1e-3) t = Math.min(t, (W - m - x) / u[0])
    if (u[0] < -1e-3) t = Math.min(t, (m - x) / u[0])
    if (u[1] > 1e-3) t = Math.min(t, (H - m - y) / u[1])
    if (u[1] < -1e-3) t = Math.min(t, (m - y) / u[1])
    return Math.max(0, t)
}
function eosArrowsUnit(dir, from, centre) {
    if (dir === "out" || dir === "in") {
        let vx = from.x - (centre ? centre.x : from.x)
        let vy = from.y - (centre ? centre.y : from.y)
        const L = Math.hypot(vx, vy)
        if (L < 4) {
            vx = 0
            vy = -1
        } else {
            vx /= L
            vy /= L
        }
        return dir === "out" ? [vx, vy] : [-vx, -vy]
    }
    return EOS_ARROWS_DIRV[dir] || EOS_ARROWS_DIRV.r
}

// ---------------------------------------------------------------- geometry model (shared by overlay, cue, hint)
// o: {g, label, L2, n, count, dir, d, ms, bpm, win, maxSpeed, tx, ty, rect, halos, to, alt, W, H, phone, narrow,
//     arenaC, avoid, labW}. All coordinates in the layer's own unscaled CSS px.
function eosArrowsModel(o) {
    const W = Math.max(40, o.W || 1280)
    const H = Math.max(40, o.H || 860)
    const phone = !!o.phone
    const narrow = !!o.narrow || phone
    const g = o.g || "tap"
    const handS = narrow ? 52 : 64
    const chevS = phone ? 36 : 44
    const labH = phone ? 33 : 38
    const tx = Number(o.tx) || 0
    const ty = Number(o.ty) || 0
    const rect = o.rect || { x: tx - 22, y: ty - 22, w: 44, h: 44 }
    const v = { g, W, H, phone, narrow, tx, ty, rect, label: o.label || "", L2: o.L2 || null, holdMs: 0, win: null, path: null, chev: null, chev2: null, halos: null, zone: null, caret: null, sling: null }
    // the part of the target around the aim point (big surfaces: point at the finger, not the far edge)
    const ab = { x: Math.max(rect.x, tx - 70), y: Math.max(rect.y, ty - 60) }
    ab.w = Math.max(8, Math.min(rect.x + rect.w, tx + 70) - ab.x)
    ab.h = Math.max(8, Math.min(rect.y + rect.h, ty + 60) - ab.y)
    let anim = "tap"
    let period = 1200
    let dx = 0
    let dy = 0
    let mdx = 0
    let mdy = 0
    let U = { ...ab }
    U = eosArrowsUnion(U, { x: tx - handS * 0.32, y: ty - 6, w: handS * 1.05, h: handS + 6 }) // the glove hangs below-right
    const chevAt = (cx, cy, rot) => ({ x: cx, y: cy, rot })
    const chevBox = (c) => (c ? { x: c.x - chevS / 2 - 4, y: c.y - chevS / 2 - 8, w: chevS + 8, h: chevS + 16 } : null)
    const pointAtBox = (box) => {
        // above (pointing down) → left (pointing right) → right (pointing left)
        if (box.y - 6 - chevS >= 6) return chevAt(tx, box.y - 6 - chevS / 2, 0)
        if (box.x - 6 - chevS >= 6) return chevAt(box.x - 6 - chevS / 2, ty, -90)
        return chevAt(Math.min(W - chevS / 2 - 4, box.x + box.w + 6 + chevS / 2), ty, 90)
    }
    if (EOS_ARROWS_DRAGS[g]) {
        const u = eosArrowsUnit(o.dir, { x: tx, y: ty }, o.arenaC)
        const both = o.dir === "lr" || o.dir === "ud"
        let d = Number(o.d) || 120
        if (phone) d = Math.max(60, d * 0.75)
        const room = eosArrowsRoom(tx, ty, u, W, H, 16)
        const dd = Math.max(Math.min(d, room), Math.min(d, 60))
        const x1 = tx + u[0] * dd
        const y1 = ty + u[1] * dd
        let px = -u[1]
        let py = u[0]
        if (py > 0 || (Math.abs(py) < 1e-3 && px < 0)) {
            px = -px
            py = -py
        }
        const bow = g === "sling" || both ? 0 : dd * 0.14
        const cx = (tx + x1) / 2 + px * bow
        const cy = (ty + y1) / 2 + py * bow
        const ang = (Math.atan2(u[1], u[0]) * 180) / Math.PI
        v.path = { x0: tx, y0: ty, x1, y1, cx, cy, both, u, d: dd }
        dx = x1 - tx
        dy = y1 - ty
        mdx = 0.25 * tx + 0.5 * cx + 0.25 * x1 - tx
        mdy = 0.25 * ty + 0.5 * cy + 0.25 * y1 - ty
        const off = chevS / 2 + 10
        v.chev = chevAt(x1 + u[0] * off, y1 + u[1] * off, ang - 90)
        if (both) {
            const dd2 = Math.max(Math.min(d, eosArrowsRoom(tx, ty, [-u[0], -u[1]], W, H, 16)), Math.min(d, 60))
            v.path.x2 = tx - u[0] * dd2
            v.path.y2 = ty - u[1] * dd2
            v.chev2 = chevAt(v.path.x2 - u[0] * off, v.path.y2 - u[1] * off, ang + 90)
            U = eosArrowsUnion(U, { x: v.path.x2 - 20, y: v.path.y2 - 20, w: 40, h: 40 })
        }
        if (g === "sling") {
            // pull along u, the shot flies the opposite way on a lifted arc
            const fl = Math.min(eosArrowsRoom(tx, ty, [-u[0], -u[1]], W, H, 20), dd * 1.8)
            const fx = tx - u[0] * fl
            const fy = ty - u[1] * fl
            v.sling = { fx, fy, fcx: (tx + fx) / 2 + px * fl * 0.35, fcy: (ty + fy) / 2 + py * fl * 0.35, ang, len: dd }
        }
        anim = both ? "lr" : g === "slow" ? "slow" : g === "swipe" ? "swipe" : g === "sling" ? "sling" : "drag"
        period = both ? (g === "slow" ? 4200 : g === "swipe" ? 1800 : 2600) : g === "slow" ? 3200 : g === "swipe" ? 1400 : g === "sling" ? 2200 : 2000
        U = eosArrowsUnion(U, { x: Math.min(tx, x1) - 24, y: Math.min(ty, y1) - 24, w: Math.abs(x1 - tx) + 48, h: Math.abs(y1 - ty) + 48 })
        U = eosArrowsUnion(U, chevBox(v.chev))
        if (v.chev2) U = eosArrowsUnion(U, chevBox(v.chev2))
    } else if (g === "dragTo" && o.to) {
        const z = o.to
        const x1 = z.x + z.w / 2
        const y1 = z.y + z.h / 2
        const dist = Math.hypot(x1 - tx, y1 - ty) || 1
        const cx = (tx + x1) / 2
        const cy = Math.min(ty, y1) - dist * 0.25
        v.path = { x0: tx, y0: ty, x1, y1, cx: eosClamp(cx, 10, W - 10), cy: eosClamp(cy, 10, H - 10) }
        v.zone = { x: z.x - 6, y: z.y - 6, w: z.w + 12, h: z.h + 12 }
        dx = x1 - tx
        dy = y1 - ty
        mdx = 0.25 * tx + 0.5 * v.path.cx + 0.25 * x1 - tx
        mdy = 0.25 * ty + 0.5 * v.path.cy + 0.25 * y1 - ty
        let ux = x1 - v.path.cx
        let uy = y1 - v.path.cy
        const L = Math.hypot(ux, uy) || 1
        ux /= L
        uy /= L
        const back = Math.min(z.w, z.h) / 2 + chevS / 2 + 6
        v.chev = chevAt(x1 - ux * back, y1 - uy * back, (Math.atan2(uy, ux) * 180) / Math.PI - 90)
        anim = "drag"
        period = 2200
        U = eosArrowsUnion(U, v.zone)
        U = eosArrowsUnion(U, chevBox(v.chev))
    } else if (g === "choose" && o.halos && o.halos.length) {
        v.halos = o.halos.slice(0, 6)
        let grp = null
        for (const h of v.halos) grp = eosArrowsUnion(grp, h)
        v.group = grp
        v.chev = chevAt(grp.x + grp.w / 2, grp.y - 6 - chevS / 2, 0)
        if (grp.y - 6 - chevS < 6) v.chev = chevAt(grp.x + grp.w / 2, grp.y + grp.h + 6 + chevS / 2, 180)
        anim = "rest"
        period = Math.max(760, v.halos.length * 380)
        U = eosArrowsUnion(U, grp)
        U = eosArrowsUnion(U, chevBox(v.chev))
    } else if (g === "wait") {
        anim = "none"
        v.holdMs = Number(o.ms) || 3000
        U = { x: tx - 82, y: ty - 82, w: 164, h: 164 }
    } else {
        if (EOS_ARROWS_HOLDS[g]) {
            v.holdMs = Math.min(Number(o.ms) || 1200, 3000)
            anim = "hold"
            period = v.holdMs + 900
            if (g === "holdRelease" && Array.isArray(o.win) && o.win.length === 2) v.win = [eosClamp(o.win[0], 0, 100), eosClamp(o.win[1], 0, 100)]
            U = eosArrowsUnion(U, { x: tx - 44, y: ty - 44, w: 88, h: 88 })
        } else if (g === "taps") {
            anim = "taps"
            period = 1400
        } else if (g === "scrub") {
            anim = "scrub"
            period = 1600
            U = eosArrowsUnion(U, { x: tx - 52, y: ty - 18, w: 104, h: 40 })
        } else if (g === "timing") {
            period = o.bpm ? Math.max(900, Math.round(60000 / o.bpm)) : 1300
        } else if (g === "alt" && o.alt) {
            anim = "alt"
            period = 1400
            dx = o.alt.x - tx
            dy = o.alt.y - ty
            v.path = { x0: tx, y0: ty, x1: o.alt.x, y1: o.alt.y, cx: (tx + o.alt.x) / 2, cy: Math.min(ty, o.alt.y) - 40, hop: true }
            U = eosArrowsUnion(U, { x: o.alt.x - 30, y: o.alt.y - 30, w: 60, h: 60 })
        } else if (g === "type") {
            v.caret = { x: rect.x + Math.min(18, rect.w / 3), y: rect.y + rect.h / 2, h: Math.max(14, Math.min(26, rect.h - 10)) }
        }
        v.chev = pointAtBox(ab)
        U = eosArrowsUnion(U, chevBox(v.chev))
    }
    // count badge pinned to the target's top-right corner
    if (o.count) v.count = { ...o.count, x: eosClamp(rect.x + rect.w - 6, 16, W - 16), y: eosClamp(rect.y + 6, 16, H - 16) }
    // seq: the step number of a fixed-order game (fades with the hand)
    if (o.seqNum) v.seq = { text: String(o.seqNum), x: eosClamp(rect.x + 6, 16, W - 16), y: eosClamp(rect.y + 6, 16, H - 16) }
    // label: above → below → right → left of everything we draw, never over the HUD / guide / companion / target
    const text = String(v.label || "")
    const labW = o.labW || Math.min(W - 24, text.length * (phone ? 9.4 : 10.6) + (phone ? 26 : 34))
    const lh = labH + (v.L2 ? (phone ? 18 : 20) : 0)
    const ax = g === "choose" && v.group ? v.group.x + v.group.w / 2 : tx
    const cxl = (x) => eosClamp(x, 12 + labW / 2, W - 12 - labW / 2)
    const cyl = (y) => eosClamp(y, 8 + lh / 2, H - 8 - lh / 2)
    const cands =
        g === "wait"
            ? [
                  { x: cxl(tx), y: U.y + U.h + 12 + lh / 2 },
                  { x: cxl(tx), y: U.y - 12 - lh / 2 },
              ]
            : [
                  { x: cxl(ax), y: U.y - 12 - lh / 2 },
                  { x: cxl(ax), y: U.y + U.h + 12 + lh / 2 },
                  { x: U.x + U.w + 14 + labW / 2, y: cyl(ty) },
                  { x: U.x - 14 - labW / 2, y: cyl(ty) },
                  { x: cxl(ax), y: U.y - 22 - lh * 1.5 },
                  { x: cxl(ax), y: U.y + U.h + 22 + lh * 1.5 },
              ]
    const avoid = (o.avoid || []).concat(g === "wait" ? [] : [rect])
    const area = (list, b) =>
        list.reduce((sum, a) => {
            const ix = Math.min(b.x + b.w, a.x + a.w + 4) - Math.max(b.x, a.x - 4)
            const iy = Math.min(b.y + b.h, a.y + a.h + 4) - Math.max(b.y, a.y - 4)
            return sum + (ix > 0 && iy > 0 ? ix * iy : 0)
        }, 0)
    // HUD / guide / companion / target are hard; the game's own copy is soft (covered only when nothing is clean)
    const overlap = (b) => area(avoid, b) * 4 + area(o.soft || [], b)
    let pick = null
    let least = null
    for (const c of cands) {
        const box = { x: c.x - labW / 2, y: c.y - lh / 2, w: labW, h: lh }
        const inside = box.x >= 6 && box.y >= 4 && box.x + box.w <= W - 6 && box.y + box.h <= H - 4
        if (!inside) continue
        const ov = overlap(box)
        if (!ov) {
            pick = c
            break
        }
        if (!least || ov < least.ov) least = { c, ov }
    }
    // nothing clean: the in-bounds spot that covers the least of the HUD / guide / target
    const lab = pick || (least && least.c) || { x: cxl(ax), y: cyl(U.y - 12 - lh / 2) }
    v.lab = { x: lab.x, y: lab.y, w: labW }
    Object.assign(v, { anim, period, dx, dy, mdx, mdy, spotR: Math.min(170, Math.max(rect.w, rect.h) / 2 + 34) })
    return v
}

// ---------------------------------------------------------------- art (SVG, no new raster art)
function EosArrowsHandSvg() {
    return (
        <svg className="eosHand" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <g stroke="#1b1650" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
                <rect x="17" y="48.5" width="30" height="13" rx="5" fill="#E7EAFF" />
                <path d="M19.5 54.5h25" fill="none" strokeWidth="2" opacity=".5" />
                <circle cx="33.5" cy="26.5" r="6.2" fill="#fff" />
                <circle cx="42.4" cy="28.6" r="6" fill="#fff" />
                <circle cx="49" cy="33.6" r="5.2" fill="#fff" />
                <rect x="11" y="24" width="42" height="29" rx="13" fill="#fff" />
                <path d="M33.5 26.8v4.2M42.4 29.2v4" fill="none" strokeWidth="2.4" />
                <ellipse cx="12.6" cy="38.5" rx="6.4" ry="10" transform="rotate(-28 12.6 38.5)" fill="#fff" />
                <path d="M14 33V8.5a6 6 0 0 1 12 0V33" fill="#fff" />
                <path d="M26.5 41v7M33 41v7M39.5 41v7" fill="none" strokeWidth="2.2" opacity=".5" />
            </g>
            <path d="M17.2 10.5a3.4 3.4 0 0 1 4.6-3.2" fill="none" stroke="#C9D2FF" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="45" cy="45" rx="7" ry="3.2" fill="#C9D2FF" opacity=".55" />
        </svg>
    )
}
function EosArrowsChevronSvg() {
    return (
        <svg className="eosChevron" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="eosArrowsGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#FFF4B8" />
                    <stop offset=".42" stopColor="#FFC94A" />
                    <stop offset="1" stopColor="#FF8A2E" />
                </linearGradient>
            </defs>
            <path d="M22 41.5 4.2 22.6H14V3.5h16v19.1h9.8Z" fill="url(#eosArrowsGold)" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
            <path d="M18 7.5v15.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".65" />
        </svg>
    )
}
function EosArrowsPalmSvg() {
    return (
        <svg className="eosPalm" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <g fill="#CFF8FF" stroke="#1b1650" strokeWidth="3" strokeLinejoin="round">
                <rect x="14.5" y="11" width="9" height="28" rx="4.5" />
                <rect x="24" y="5.5" width="9" height="32" rx="4.5" />
                <rect x="33.5" y="7.5" width="9" height="30" rx="4.5" />
                <rect x="43" y="14" width="8.5" height="25" rx="4.25" />
                <rect x="13" y="29" width="39" height="28" rx="13" />
                <ellipse cx="11.5" cy="40" rx="5.2" ry="10" transform="rotate(-38 11.5 40)" />
            </g>
            <path d="M22 44q10 6 20 0" fill="none" stroke="#1b1650" strokeWidth="2.4" strokeLinecap="round" opacity=".45" />
        </svg>
    )
}
function EosArrowsTurtleSvg() {
    return (
        <svg className="eosTurtle" viewBox="0 0 28 18" aria-hidden="true" focusable="false">
            <g stroke="#1b1650" strokeWidth="1.6" strokeLinejoin="round">
                <circle cx="23.5" cy="10.5" r="3.4" fill="#9BF0A8" />
                <rect x="6" y="11.5" width="4" height="5" rx="2" fill="#9BF0A8" />
                <rect x="15" y="11.5" width="4" height="5" rx="2" fill="#9BF0A8" />
                <path d="M3 13a10 9 0 0 1 19 0Z" fill="#3BB56A" />
                <path d="M8 8.5l3 4.5M16 8.5l-3 4.5" fill="none" stroke="#1E6E3C" />
            </g>
        </svg>
    )
}
function EosArrowsStripes() {
    return (
    <defs>
        <pattern id="eosArrowsStripes" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3.5" height="7" fill="#2FD86F" />
            <rect x="3.5" width="3.5" height="7" fill="#C6FFD8" />
        </pattern>
    </defs>
    )
}

// ---------------------------------------------------------------- presentational cue (one stage)
function eosArrowsPx(n) {
    return `${Math.round((Number(n) || 0) * 10) / 10}px`
}
function EosArrowsCueView({ v }) {
    if (!v) return null
    const on = !!v.shown
    const lvl = v.level || 2
    const tapLike = v.anim === "tap" || v.anim === "taps" || v.anim === "rest"
    const p = v.path
    const curve = p ? `M${p.x0.toFixed(1)} ${p.y0.toFixed(1)} Q${p.cx.toFixed(1)} ${p.cy.toFixed(1)} ${p.x1.toFixed(1)} ${p.y1.toFixed(1)}` : ""
    const back = p && p.both ? `M${p.x0.toFixed(1)} ${p.y0.toFixed(1)} L${p.x2.toFixed(1)} ${p.y2.toFixed(1)}` : ""
    const handVars = { "--dx": eosArrowsPx(v.dx), "--dy": eosArrowsPx(v.dy), "--mx": eosArrowsPx(v.mdx), "--my": eosArrowsPx(v.mdy), animationDuration: `${v.period}ms` }
    const ghosts = v.anim === "swipe" ? [1, 2, 3] : []
    return (
        <React.Fragment>
            {on && v.spot ? <div key={`sp${v.token}`} className="eosSpot" style={{ "--sx": eosArrowsPx(v.tx), "--sy": eosArrowsPx(v.ty), "--sr": eosArrowsPx(v.spotR) }} /> : null}
            <div key={`cue${v.token}`} className={`eosCue g-${v.g}${on ? " isOn" : ""}`} aria-hidden="true">
                {p && !p.hop ? (
                    <svg className="eosTrailSvg" width={v.W} height={v.H} viewBox={`0 0 ${v.W} ${v.H}`} aria-hidden="true">
                        <path className="eosTrailShadow" d={curve} />
                        <path className="eosTrail" d={curve} />
                        {back ? <path className="eosTrailShadow" d={back} /> : null}
                        {back ? <path className="eosTrail" d={back} /> : null}
                        {v.sling ? (
                            <g>
                                <g transform={`translate(${v.tx.toFixed(1)} ${v.ty.toFixed(1)}) rotate(${(v.sling.ang - 90).toFixed(1)})`}>
                                    <path className="eosBand" d={`M-20 -4 L0 ${v.sling.len.toFixed(1)} L20 -4`} style={{ animationDuration: `${v.period}ms` }} />
                                    <circle className="eosPost" cx="-20" cy="-4" r="5" />
                                    <circle className="eosPost" cx="20" cy="-4" r="5" />
                                </g>
                                <path className="eosFly" pathLength="100" d={`M${v.tx.toFixed(1)} ${v.ty.toFixed(1)} Q${v.sling.fcx.toFixed(1)} ${v.sling.fcy.toFixed(1)} ${v.sling.fx.toFixed(1)} ${v.sling.fy.toFixed(1)}`} style={{ animationDuration: `${v.period}ms` }} />
                            </g>
                        ) : null}
                    </svg>
                ) : null}
                {v.zone ? (
                    <div className="eosZone" style={{ left: v.zone.x, top: v.zone.y, width: v.zone.w, height: v.zone.h }}>
                        <span className="eosZoneTag">DROP HERE</span>
                    </div>
                ) : null}
                {v.halos
                    ? v.halos.map((h, i) => (
                          <React.Fragment key={`h${i}`}>
                              <div className="eosHaloBase" style={{ left: h.x - 5, top: h.y - 5, width: h.w + 10, height: h.h + 10 }} />
                              <div className="eosHalo" style={{ left: h.x - 7, top: h.y - 7, width: h.w + 14, height: h.h + 14, "--hp": `${v.period}ms`, "--hd": `${i * 380}ms` }} />
                          </React.Fragment>
                      ))
                    : null}
                {v.caret ? <i className="eosCaret" style={{ left: v.caret.x, top: v.caret.y - v.caret.h / 2, height: v.caret.h }} /> : null}
                {tapLike || v.anim === "alt" || v.anim === "scrub" ? (
                    <React.Fragment>
                        <i className={`eosRing r-${v.anim}`} style={{ left: v.tx, top: v.ty, animationDuration: `${v.period}ms` }} />
                        <i className={`eosRing r-${v.anim} r2`} style={{ left: v.tx, top: v.ty, animationDuration: `${v.period}ms` }} />
                    </React.Fragment>
                ) : null}
                {v.holdMs && v.g !== "wait" ? (
                    <div className="eosHoldDemo" style={{ left: v.tx, top: v.ty }}>
                        <svg viewBox="0 0 100 100" aria-hidden="true">
                            <EosArrowsStripes />
                            <circle className="hdTrack" cx="50" cy="50" r="40" pathLength="100" />
                            {v.win ? <circle className="hdWin" cx="50" cy="50" r="40" pathLength="100" strokeDasharray={`${v.win[1] - v.win[0]} ${100 - (v.win[1] - v.win[0])}`} strokeDashoffset={-v.win[0]} /> : null}
                            <circle className="hdFill" cx="50" cy="50" r="40" pathLength="100" style={{ animationDuration: `${v.period}ms` }} />
                        </svg>
                    </div>
                ) : null}
                {v.g === "wait" ? (
                    <div className={`eosWait${v.shake ? " isShake" : ""}`} key={`w${v.shake || 0}`} style={{ left: v.tx, top: v.ty }}>
                        <i className="eosWaitGlow" data-eos-arrows="glow" />
                        <svg className="eosWaitArc" viewBox="0 0 100 100" aria-hidden="true">
                            <circle className="waTrack" cx="50" cy="50" r="46" pathLength="100" />
                            <circle className="waFill" cx="50" cy="50" r="46" pathLength="100" style={{ animationDuration: `${v.holdMs}ms` }} />
                        </svg>
                        <EosArrowsPalmSvg />
                        <b className="eosWaitCount" data-eos-arrows="count" />
                    </div>
                ) : (
                    <div className="eosHandPos eosPop" style={{ left: v.tx, top: v.ty }}>
                        {ghosts.map((k) => (
                            <div key={`g${k}`} className={`eosHandAnim a-${v.anim} isGhost`} style={{ ...handVars, animationDelay: `${-k * 45}ms`, opacity: 0.34 - k * 0.08 }}>
                                <EosArrowsHandSvg />
                            </div>
                        ))}
                        <div className={`eosHandAnim a-${v.anim}`} style={handVars}>
                            <div key={`wg${v.wiggle || 0}`} className={`eosWig${v.wiggle ? " isWig" : ""}`}>
                                <EosArrowsHandSvg />
                            </div>
                        </div>
                    </div>
                )}
                {v.chev ? (
                    <div className="eosChevPos eosPop" style={{ left: v.chev.x, top: v.chev.y, "--rot": `${Math.round(v.chev.rot)}deg` }}>
                        <div className="eosChevBob">
                            <EosArrowsChevronSvg />
                        </div>
                    </div>
                ) : null}
                {v.chev2 ? (
                    <div className="eosChevPos eosPop" style={{ left: v.chev2.x, top: v.chev2.y, "--rot": `${Math.round(v.chev2.rot)}deg` }}>
                        <div className="eosChevBob">
                            <EosArrowsChevronSvg />
                        </div>
                    </div>
                ) : null}
                {v.seq ? (
                    <div className="eosSeqNum eosPop" style={{ left: v.seq.x, top: v.seq.y }}>
                        {v.seq.text}
                    </div>
                ) : null}
                {lvl >= 2 && v.label ? (
                    <div className="eosLabel eosPop" style={{ left: v.lab.x, top: v.lab.y }} data-eos-arrows="label">
                        <span className="eosLabelText">{v.text || v.label}</span>
                        {v.L2 ? <small className="eosLabelL2">{v.L2}</small> : null}
                    </div>
                ) : null}
            </div>
            {v.count ? (
                <div key={`c${v.count.id || ""}${v.count.text}`} className={`eosCount${v.count.done ? " isDone" : ""}`} style={{ left: v.count.x, top: v.count.y }} aria-hidden="true">
                    {v.count.text}
                </div>
            ) : null}
        </React.Fragment>
    )
}

// ---------------------------------------------------------------- live feedback while pressing
function EosArrowsLiveHold({ live, refs }) {
    const w = live.win
    return (
        <div className={`eosHoldLive${live.release ? " isRelease" : ""}`} style={{ left: live.x, top: live.y }} aria-hidden="true">
            <svg viewBox="0 0 100 100" aria-hidden="true">
                <EosArrowsStripes />
                <circle className="hlTrack" cx="50" cy="50" r="40" pathLength="100" />
                {w ? <circle className="hlWin" cx="50" cy="50" r="40" pathLength="100" strokeDasharray={`${w[1] - w[0]} ${100 - (w[1] - w[0])}`} strokeDashoffset={-w[0]} /> : null}
                <circle ref={refs.fill} className="hlFill" cx="50" cy="50" r="40" pathLength="100" strokeDasharray="100 100" strokeDashoffset="100" />
            </svg>
            <b ref={refs.text} className="hlText">
                HOLD…
            </b>
        </div>
    )
}
function EosArrowsLiveDrag({ live, refs }) {
    const L = live
    return (
        <div className="eosDragGoal" aria-hidden="true">
            <svg width={L.W} height={L.H} viewBox={`0 0 ${L.W} ${L.H}`} aria-hidden="true">
                <line className="dgTrack" x1={L.x0} y1={L.y0} x2={L.x1} y2={L.y1} />
                {L.both ? <line className="dgTrack" x1={L.x0} y1={L.y0} x2={L.x2} y2={L.y2} /> : null}
                <line ref={refs.fill} className="dgFill" x1={L.x0} y1={L.y0} x2={L.x0} y2={L.y0} />
                <circle ref={refs.end} className="dgEnd" cx={L.x1} cy={L.y1} r="22" />
                {L.both ? <circle ref={refs.end2} className="dgEnd" cx={L.x2} cy={L.y2} r="22" /> : null}
            </svg>
            <b ref={refs.text} className="dgText" style={{ left: L.x1, top: L.y1 + (L.y1 > L.H - 90 ? -52 : 52) }}>
                <EosArrowsTurtleSvg />
                <span ref={refs.word}>SLOWER…</span>
            </b>
        </div>
    )
}

// ---------------------------------------------------------------- test / dev view (window.__eos.arrows.state())
let EOS_ARROWS_VIEW = { visible: false, g: null, label: null, stage: null, targetSelector: null, x: null, y: null, inViewport: false, count: null }
function eosArrowsState() {
    return { ...EOS_ARROWS_VIEW }
}

// ---------------------------------------------------------------- the in-game overlay
// Mounted by I1-E3 as a sibling of .releaseGameHost inside section.releaseStage while stage === "play".
function EosGuideArrows({ game, entries, hostRef, reduced }) {
    useEosStore() // the calm-visuals toggle re-renders us
    const calm = eosCalm(reduced)
    const id = Number(game && game.id) || 0
    const layerRef = React.useRef(null)
    const [view, setView] = React.useState(null)
    const [live, setLive] = React.useState(null)
    const [ok, setOk] = React.useState(null)
    const [sr, setSr] = React.useState("")
    const holdRefs = { fill: React.useRef(null), text: React.useRef(null) }
    const dragRefs = { fill: React.useRef(null), end: React.useRef(null), end2: React.useRef(null), text: React.useRef(null), word: React.useRef(null) }
    const refsRef = React.useRef(null)
    refsRef.current = { hold: holdRefs, drag: dragRefs }
    const calmRef = React.useRef(calm)
    calmRef.current = calm

    React.useEffect(() => {
        const layer0 = layerRef.current
        if (!layer0) return undefined
        const now0 = performance.now()
        const table = id >= 111 ? null : EOS_GESTURES[id] || null
        const learned = eosLearnedCount(id)
        const S = {
            alive: true, t0: now0, delay: id === 111 ? 500 : 700, complete: false, missPushed: false,
            shown: false, firstShown: false, level: 2, base: null, reshows: 0, shownAt: 0, hiddenAt: now0, autoHideAt: 0, spotUntil: 0,
            lastProgress: null, lastProgressAt: 0, lastTouchAt: 0, down: false, downKey: null, advanceAt: 0, missAt: 0,
            lastPt: null, cur: null, lastStageKey: null, tableEver: false, arenaAt: 0,
            touched: new Set(), onceDone: new Set(), count: null, token: 0, wiggle: 0, shake: 0,
            near: null, avoid: [], soft: [], avoidAt: 0, sig: "", srText: "", srAt: 0, srTimer: 0,
            frame: 0, raf: 0, timer: 0, press: null, labW: {}, seqDone: 0,
            completeAt: 0, completeKey: null, ignoreDone: false, forceShow: false,
        }
        const layer = () => layerRef.current
        const host = () => (hostRef && hostRef.current) || null
        const stageOf = (L) => (L && L.closest && L.closest(".releaseStage")) || host() || L
        const publish = (patch) => {
            EOS_ARROWS_VIEW = { ...EOS_ARROWS_VIEW, ...patch }
        }
        publish({ visible: false, g: null, label: null, stage: null, targetSelector: null, x: null, y: null, inViewport: false, count: null, id })
        const toLayer = (cx, cy) => {
            const L = layer()
            if (!L) return { x: cx, y: cy }
            const R = L.getBoundingClientRect()
            const k = eosStageScale(L)
            return { x: (cx - R.left) / k, y: (cy - R.top) / k }
        }
        const veteran = () => S.base === 1
        const show = (now, opts = {}) => {
            if (S.complete) return
            if (S.base == null) S.base = 2
            if (opts.idle) {
                S.reshows += 1
                if (S.reshows % 3 === 0) {
                    S.level = 3
                    S.spotUntil = now + 2400
                } else S.level = 2
            } else if (!S.firstShown) S.level = S.base
            else if (S.level === 3) S.level = 2
            S.firstShown = true
            S.shown = true
            S.shownAt = now
            S.token += 1
            if (opts.wiggle) S.wiggle += 1
            S.autoHideAt = !opts.idle && !opts.wiggle && S.base === 1 && S.token === 1 ? now + 2500 : 0
        }
        const hide = (now) => {
            if (S.cur && S.cur.g === "wait") return
            S.shown = false
            S.hiddenAt = now
            S.spotUntil = 0
            S.autoHideAt = 0
            publish({ visible: false })
            // fade at once: the game re-renders on the same touch and React may commit our update late
            try {
                const cue = layer() && layer().querySelector(".eosCue.isOn")
                if (cue) cue.classList.remove("isOn")
            } catch {}
            if (S.lastView && S.lastView.shown) {
                S.lastView = { ...S.lastView, shown: false }
                setView((prev) => (prev && prev.shown ? { ...prev, shown: false } : prev))
            }
        }
        // ---------------- target resolution (§3.4)
        const resolve = (A, L, now) => {
            const SR = L.getBoundingClientRect()
            const k = eosStageScale(L)
            const usable = (el) => eosArrowsUsable(el, SR, k)
            // 1. explicit markers
            const marks = eosArrowsQsa(A, '[data-eos-target="1"]').filter((m) => usable(m))
            if (marks.length) {
                const spec = eosArrowsMarkerSpec(marks[0])
                const list = spec.g === "choose" ? marks.filter((m) => (m.dataset.eosG || "") === "choose").slice(0, 6) : [marks[0]]
                // identity = gesture + base class + label: engines toggle state classes every frame (breathing, glow),
                // and a flapping key would re-pop the cue each tick (the hand never finishes its spring-in)
                const ident = eosArrowsMarkerIdent(marks[0]).split(".")[0]
                const sk = `m:${spec.g}:${ident}:${spec.L || ""}:${list.length}`
                if (S.base == null) S.base = spec.own ? (learned < 1 ? 2 : 1) : learned < 2 ? 2 : 1
                return { kind: "marker", i: -1, spec, g: spec.g, els: list, stageKey: sk, key: sk, ident: sk, label: spec.L || eosArrowsDefaultLabel(spec), sel: '[data-eos-target="1"]' }
            }
            if (id >= 111) return null // automatic phase (no marker) → no arrow
            // 2. per-game stages
            const stages = table || []
            if (S.base == null) {
                const own = stages.some((s) => s.own)
                S.base = own ? (learned < 1 ? 2 : 1) : learned < 2 ? 2 : 1
            }
            for (let i = 0; i < stages.length; i++) {
                const s = stages[i]
                if (s.when && !eosArrowsQ(A, s.when)) continue
                if (s.once && S.onceDone.has(i)) continue
                if (s.until === "touch" && S.touched.has(i)) continue
                if (s.g === "wait") return { kind: "stage", i, spec: s, g: "wait", els: [], stageKey: `s:${i}`, key: `s:${i}`, ident: `s:${i}`, label: s.L || eosArrowsDefaultLabel(s), sel: null }
                const all = eosArrowsQsa(A, s.t)
                const ok = (e) => (s.g !== "tool" || !s.armed || !e.matches(s.armed)) && (s.g !== "type" || String(e.value || "").trim().length < 2) && !!usable(e)
                const want = s.g === "choose" ? 6 : s.pick === "near" ? 24 : 1
                const els = []
                for (const e of all) {
                    if (ok(e)) els.push(e)
                    if (els.length >= want) break
                }
                if (!els.length) continue
                let chosen
                if (s.g === "choose") chosen = els.slice(0, 6)
                else if (s.pick === "near") {
                    const ref = S.lastPt || { x: L.offsetWidth / 2, y: L.offsetHeight / 2 }
                    const dist = (e) => {
                        const r = eosRelRect(e, L)
                        return r ? Math.hypot(r.cx - ref.x, r.cy - ref.y) : 1e9
                    }
                    let best = els[0]
                    let bd = dist(best)
                    for (const e of els.slice(1, 24)) {
                        const dd = dist(e)
                        if (dd < bd) {
                            best = e
                            bd = dd
                        }
                    }
                    // hysteresis: keep the previous pick while it is still usable and nearly as close
                    if (S.near && S.near.i === i && S.near.el !== best && els.includes(S.near.el) && dist(S.near.el) <= bd * 1.35 + 24) best = S.near.el
                    S.near = { i, el: best }
                    chosen = [best]
                } else chosen = [els[0]]
                const ord = s.pick === "near" ? Math.max(0, els.indexOf(chosen[0])) : 0
                let label = s.L || eosArrowsDefaultLabel(s)
                if (label === "@text") label = eosArrowsElText(chosen[0]) || eosArrowsDefaultLabel(s)
                S.tableEver = true
                return { kind: "stage", i, spec: s, g: s.g, els: chosen, stageKey: `s:${i}`, key: `s:${i}:${s.g === "choose" ? "*" : ord}`, ident: `${i}|${s.t}|${ord}`, label, sel: s.t }
            }
            // 3. fallback — only for ids without a table, or a table that never resolved for 2.5 s (stale selector)
            if (stages.length && (S.tableEver || now - (S.arenaAt || now) < 2500)) return null
            for (const sel of EOS_ARROWS_FALLBACK) {
                const el = eosArrowsQsa(A, sel).find((e) => usable(e))
                if (el) return { kind: "fallback", i: -2, spec: { g: "tap" }, g: "tap", els: [el], stageKey: `f:${sel}`, key: `f:${sel}`, ident: `f:${sel}`, label: "TAP IT", sel }
            }
            return null
        }
        // ---------------- geometry for the current resolution
        const layout = (res, A, L, now) => {
            const W = L.offsetWidth || 1
            const H = L.offsetHeight || 1
            const phone = W <= 560
            const narrow = W <= 700
            const s = res.spec || {}
            const g = res.g
            const ar = eosRelRect(A, L)
            const arenaC = ar ? { x: ar.cx, y: ar.cy } : { x: W / 2, y: H / 2 }
            let tx
            let ty
            let rect
            let halos = null
            let occluded = false
            let clientPt = null
            if (g === "wait") {
                // the arena centre, but never under the HUD row or the bottom guide panel
                tx = arenaC.x
                ty = eosClamp(arenaC.y, phone ? 150 : 130, H - (phone ? 230 : 170))
                rect = { x: tx - 75, y: ty - 75, w: 150, h: 150 }
                const R = L.getBoundingClientRect()
                const k = eosStageScale(L)
                clientPt = { x: R.left + tx * k, y: R.top + ty * k }
            } else {
                const rects = res.els.map((e) => eosRelRect(e, L))
                const restIdx = g === "choose" ? Math.floor((rects.length - 1) / 2) : 0
                const el = res.els[restIdx]
                rect = rects[restIdx]
                if (g === "choose") halos = rects
                if (s.ox != null || s.oy != null) {
                    tx = rect.cx + (Number(s.ox) || 0) * rect.w
                    ty = rect.cy + (Number(s.oy) || 0) * rect.h
                    const R = L.getBoundingClientRect()
                    const k = eosStageScale(L)
                    clientPt = { x: R.left + tx * k, y: R.top + ty * k }
                } else {
                    const aim = eosArrowsAim(el, el.getBoundingClientRect())
                    occluded = aim.occluded
                    clientPt = { x: aim.x, y: aim.y }
                    const p = toLayer(aim.x, aim.y)
                    tx = p.x
                    ty = p.y
                }
            }
            let to = null
            if (s.to) {
                const z = eosArrowsQ(A, s.to) || eosArrowsQ(document, s.to)
                if (z) to = eosRelRect(z, L)
            }
            let alt = null
            if (g === "alt") {
                const pads = eosArrowsQsa(A, ".tapOutPads button").filter((e) => e !== res.els[0] && eosArrowsUsable(e, null, 1))
                if (pads.length) {
                    const r2 = eosRelRect(pads[0], L)
                    alt = { x: r2.cx, y: r2.cy }
                }
            }
            if (now - S.avoidAt > 600) {
                S.avoidAt = now
                S.avoid = eosArrowsQsa(stageOf(L), EOS_ARROWS_AVOID)
                    .map((e) => eosRelRect(e, L))
                    .filter((r) => r && r.w > 4 && r.h > 4)
                S.soft = eosArrowsTextRects(A, L, eosStageScale(L))
            }
            // count badge (taps): markers carry their live n; table stages count our own pointerdowns
            let count = null
            if (g === "taps") {
                if (res.kind === "marker") {
                    const n = Number(s.n)
                    if (n > 0) count = { id: res.ident, left: n, text: `×${n}` }
                } else {
                    const n = Number(s.n) || 3
                    const c = S.count && S.count.id === res.ident ? S.count : null
                    count = c ? (c.left > 0 ? { id: res.ident, left: c.left, text: `×${c.left}` } : { id: res.ident, left: 0, text: "✓", done: true }) : { id: res.ident, left: n, text: `×${n}` }
                }
            }
            let text = res.label
            if (g === "timing" && s.lit) text = eosArrowsQ(A, s.lit) ? "NOW!" : res.label
            const v = eosArrowsModel({
                g, label: text, L2: s.L2, n: s.n, count, seqNum: g === "seq" ? S.seqDone + 1 : 0, dir: s.dir, d: s.d, ms: s.ms, bpm: s.bpm, win: s.win, maxSpeed: s.maxSpeed,
                tx, ty, rect, halos, to, alt, W, H, phone, narrow, arenaC, avoid: S.avoid, soft: S.soft, labW: S.labW[text],
            })
            v.text = text
            v.occluded = occluded
            v.clientPt = clientPt
            return v
        }
        // ---------------- progress + completion
        const onProgress = (now) => {
            S.lastProgressAt = now
            if (S.cur && S.cur.g === "seq") S.seqDone += 1
            S.touched.clear()
            S.missAt = 0
            const lp = S.lastView
            if (lp && lp.g !== "wait") setOk({ x: lp.tx, y: lp.ty, k: now })
        }
        const finish = (now) => {
            S.complete = true
            S.completeAt = now
            S.completeKey = S.lastStageKey
            S.forceShow = false
            S.shown = false
            S.sig = ""
            publish({ visible: false, count: null, parked: true })
            setView(null)
            setLive(null)
            schedule(false) // parked: keep watching slowly (400 ms)
        }
        // ---------------- the tick
        const tick = () => {
            if (!S.alive) return
            const now = performance.now()
            const L = layer()
            const Hh = host()
            if (!L || !Hh) return schedule(false)
            const A = eosArrowsQ(Hh, ".cinematicContentShell > .arena")
            if (!A) {
                if (!S.missPushed && now - S.t0 > 3000) {
                    S.missPushed = true
                    try {
                        if (eosIsDev()) {
                            if (!Array.isArray(window.__eosArrowMiss)) window.__eosArrowMiss = []
                            window.__eosArrowMiss.push(id)
                        }
                    } catch {}
                }
                return schedule(false)
            }
            if (!S.arenaAt) S.arenaAt = now
            const stageEl = stageOf(L)
            const mega = !!eosArrowsQ(stageEl, ".tsRewardSurge.mega")
            const barDone = !!eosArrowsQ(Hh, ".globalPlayGuide.isComplete")
            if (!barDone) S.ignoreDone = false
            if (S.complete) {
                // Some games fill the bar and then keep asking for input (96 SCRATCH deals the next ticket): resume
                // when the bar drops again, or — still in play 2.5 s later — the player touches or a new stage resolves.
                const since = now - S.completeAt
                let resume = !mega && !barDone && since > 600
                if (!resume && !mega && since >= 2500 && now - S.t0 >= S.delay) {
                    const r0 = resolve(A, L, now)
                    resume = !!r0 && (S.lastTouchAt > S.completeAt + 400 || r0.stageKey !== S.completeKey)
                }
                if (!resume) return schedule(false)
                S.complete = false
                S.ignoreDone = barDone
                S.forceShow = true
                publish({ parked: false, resumed: (EOS_ARROWS_VIEW.resumed || 0) + 1 })
                try {
                    if (eosIsDev()) {
                        if (!Array.isArray(window.__eosArrowsResumed)) window.__eosArrowsResumed = []
                        window.__eosArrowsResumed.push(id)
                    }
                } catch {}
            } else if (mega || (barDone && !S.ignoreDone)) return finish(now)
            const pr = eosProgressOf(stageEl)
            if (pr != null) {
                if (S.lastProgress != null && pr > S.lastProgress + 0.01) onProgress(now)
                S.lastProgress = pr
            }
            if (now - S.t0 < S.delay) return schedule(false)
            const res = resolve(A, L, now)
            // lifecycle (§3.5)
            if (res) {
                const stageChanged = S.lastStageKey != null && res.stageKey !== S.lastStageKey
                if (!S.firstShown || S.forceShow) show(now)
                else if (stageChanged && !S.shown && (!S.down || res.kind === "marker")) show(now)
                else if (stageChanged && S.shown) S.token += 1
                S.lastStageKey = res.stageKey
                S.forceShow = false
                if (res.g === "wait" && !S.shown) show(now)
            }
            if (S.advanceAt && now >= S.advanceAt) {
                S.advanceAt = 0
                if (res && res.key !== S.downKey && !S.shown && !S.down) show(now)
            }
            if (S.missAt && now - S.missAt >= 1200) {
                const at = S.missAt
                S.missAt = 0
                if (res && S.lastProgressAt < at && !S.shown && !S.down) show(now, { wiggle: true })
            }
            const idleMs = veteran() ? 6000 : 4000
            if (res && !S.shown && !S.down && now - Math.max(S.lastTouchAt, S.lastProgressAt, S.hiddenAt) >= idleMs) show(now, { idle: true })
            if (S.autoHideAt && now >= S.autoHideAt) hide(now)
            if (S.spotUntil && now >= S.spotUntil) {
                S.spotUntil = 0
                if (S.level === 3) S.level = 2
            }
            if (S.count && S.count.left === 0 && now - S.count.doneAt > 700) S.count = null
            S.cur = res
            // view
            let v = null
            if (res) {
                v = layout(res, A, L, now)
                v.shown = S.shown
                v.level = S.level
                v.spot = S.level === 3 && S.spotUntil > now
                v.token = S.token
                v.wiggle = S.wiggle
                v.shake = S.shake
                S.lastView = v
            } else if (S.lastView) {
                v = { ...S.lastView, shown: false, count: null }
            }
            const sig = v
                ? [v.g, v.text, v.shown ? 1 : 0, v.level, v.spot ? 1 : 0, v.token, v.wiggle, v.shake, v.count ? v.count.text : "", v.seq ? v.seq.text : "", v.phone ? 1 : 0, v.narrow ? 1 : 0]
                      .concat([v.tx, v.ty, v.rect.x, v.rect.y, v.rect.w, v.rect.h, v.lab.x, v.lab.y, v.W, v.H, v.path ? v.path.x1 : 0, v.path ? v.path.y1 : 0].map((n) => Math.round((Number(n) || 0) / 2)))
                      .concat(v.halos ? v.halos.map((h) => Math.round(h.x / 2) + "," + Math.round(h.y / 2)) : [])
                      .join("|")
                : ""
            if (sig !== S.sig) {
                S.sig = sig
                setView(v)
            }
            // measured label widths feed the next layout (clamping + overlap tests)
            const le = v && v.shown ? L.querySelector('[data-eos-arrows="label"] .eosLabelText') : null
            if (le && le.textContent === v.text && le.parentElement.offsetWidth) S.labW[v.text] = le.parentElement.offsetWidth
            // state for tests + the SR line
            if (res && v) {
                const R = L.getBoundingClientRect()
                const cp = v.clientPt || { x: R.left + v.tx, y: R.top + v.ty }
                const inVp = cp.x >= 0 && cp.y >= 0 && cp.x <= innerWidth && cp.y <= innerHeight
                publish({
                    visible: !!S.shown, g: res.g, label: res.label, text: v.text, stage: res.kind === "stage" ? res.i : res.kind, targetSelector: res.sel, x: Math.round(cp.x), y: Math.round(cp.y),
                    inViewport: inVp, count: v.count ? v.count.left : null, level: S.level, kind: res.kind, occluded: !!v.occluded, id,
                })
                const srText = `${v.text}${v.count && v.count.left > 0 ? ` · ${v.count.left} left` : ""}`
                if (srText !== S.srText) {
                    S.srText = srText
                    const wait = Math.max(0, 1500 - (now - S.srAt))
                    clearTimeout(S.srTimer)
                    S.srTimer = setTimeout(() => {
                        if (!S.alive) return
                        S.srAt = performance.now()
                        setSr(S.srText)
                    }, wait)
                }
            } else publish({ visible: false, count: null })
            // live hold ring (meter or time)
            if (S.press && S.press.kind === "hold") updateHold(now, A)
            // wait ring breathes with the shared pacer
            if (v && v.g === "wait") updateWait(L, calmRef.current)
            return schedule(!!(S.shown || S.press || S.missAt || S.advanceAt || (v && v.count)))
        }
        const schedule = (fast) => {
            clearTimeout(S.timer)
            cancelAnimationFrame(S.raf)
            if (!S.alive) return
            if (S.complete) {
                // parked: watch slowly for a game that keeps going after its bar filled
                S.timer = setTimeout(tick, 400)
                return
            }
            // ~20 Hz while something is visible / pressed, 4-5 Hz while hidden (timers, so a slow
            // compositor never delays a hide or a stage-advance re-show)
            S.timer = setTimeout(tick, fast ? 50 : 220)
        }
        // ---------------- live ring + wait ring writers (our own nodes only)
        const readMeter = (A) => {
            const pr = S.press
            const s = pr.spec
            let el = s.meter ? eosArrowsQ(A, s.meter) : null
            if (!el && s.mvar) el = pr.el && pr.el.isConnected ? pr.el : null
            if (!el || !s.mvar) return null
            let raw = ""
            try {
                raw = (el.style && el.style.getPropertyValue(s.mvar)) || getComputedStyle(el).getPropertyValue(s.mvar)
            } catch {}
            const n = parseFloat(String(raw || "").trim())
            if (!Number.isFinite(n)) return null
            return n <= 1.0001 && !/%/.test(String(raw)) ? n * 100 : n
        }
        const updateHold = (now, A) => {
            const pr = S.press
            const R = refsRef.current && refsRef.current.hold
            if (!pr || !R || !R.fill.current) return
            const m = readMeter(A)
            const p = m != null ? eosClamp(m, 0, 100) : eosClamp(((now - pr.t0) / Math.max(200, Number(pr.spec.ms) || 1200)) * 100, 0, 100)
            R.fill.current.setAttribute("stroke-dashoffset", String(100 - p))
            const w = pr.spec.win
            let txt = "HOLD…"
            let cls = "hlText"
            if (pr.g === "holdRelease" && Array.isArray(w)) {
                if (p >= w[0] && p <= w[1]) {
                    txt = "LET GO!"
                    cls = "hlText isGo"
                } else if (p > w[1]) txt = "TRY AGAIN"
            } else if (p >= 99.5) {
                txt = "✓"
                cls = "hlText isGo"
            }
            if (R.text.current && R.text.current.textContent !== txt) {
                R.text.current.textContent = txt
                R.text.current.setAttribute("class", cls)
            }
        }
        const updateWait = (L, calmNow) => {
            const glow = L.querySelector('[data-eos-arrows="glow"]')
            const cnt = L.querySelector('[data-eos-arrows="count"]')
            if (!glow) return
            const ph = eosBreathPhase()
            const p = eosClamp(ph.p, 0, 1)
            const e = 0.5 - Math.cos(Math.PI * p) / 2
            let k = 1
            if (ph.phase === "in") k = e
            else if (ph.phase === "out") k = 1 - p
            else if (ph.phase === "hold") k = 1
            else k = 0.5
            const amp = calmNow ? 0.04 : 0.22
            glow.style.transform = `scale(${(1 - amp / 2 + amp * k).toFixed(3)})`
            glow.style.opacity = (0.55 + 0.45 * k).toFixed(2)
            if (cnt) {
                const left = Math.max(1, Math.ceil(((1 - p) * (ph.ms || 4000)) / 1000))
                const t = ph.phase === "in" ? `in ${left}…` : ph.phase === "out" ? `out ${left}…` : ph.phase === "hold" ? "hold…" : ""
                if (cnt.textContent !== t) cnt.textContent = t
            }
        }
        const updateDrag = (cx, cy, now, ts) => {
            const pr = S.press
            const R = refsRef.current && refsRef.current.drag
            if (!pr || !R || !R.fill.current) return
            const p = toLayer(cx, cy)
            const u = pr.u
            let proj = (p.x - pr.x0) * u[0] + (p.y - pr.y0) * u[1]
            if (!pr.both) proj = Math.max(0, proj)
            const lim = pr.d * 1.15
            proj = eosClamp(proj, -lim, lim)
            R.fill.current.setAttribute("x2", (pr.x0 + u[0] * proj).toFixed(1))
            R.fill.current.setAttribute("y2", (pr.y0 + u[1] * proj).toFixed(1))
            // speed (CSS px / s, already divided by the canvas scale)
            const t = Number(ts) || now
            pr.samples.push({ t, x: p.x, y: p.y })
            while (pr.samples.length > 2 && t - pr.samples[0].t > 160) pr.samples.shift()
            const a = pr.samples[0]
            const sp = (Math.hypot(p.x - a.x, p.y - a.y) / Math.max(16, t - a.t)) * 1000
            pr.speed = pr.speed == null ? sp : pr.speed * 0.6 + sp * 0.4
            const avg = (Math.abs(proj) / Math.max(16, t - pr.t0)) * 1000
            const fast = !!pr.maxSpeed && Math.abs(proj) > 14 && (avg > pr.maxSpeed || pr.speed > pr.maxSpeed * 1.5)
            const hit = Math.abs(proj) >= pr.d * 0.92
            R.fill.current.setAttribute("class", `dgFill${pr.maxSpeed ? (fast ? " isFast" : " isSlow") : ""}${hit ? " isHit" : ""}`)
            const endCls = `dgEnd${hit ? " isHit" : ""}`
            if (R.end.current) R.end.current.setAttribute("class", proj >= 0 ? endCls : "dgEnd")
            if (R.end2.current) R.end2.current.setAttribute("class", proj < 0 ? endCls : "dgEnd")
            if (R.text.current) {
                const showTxt = fast || (pr.g === "sling" && hit)
                R.text.current.setAttribute("class", `dgText${showTxt ? " isOn" : ""}${fast ? " isFast" : " isGo"}`)
                if (R.word.current) R.word.current.textContent = fast ? "SLOWER…" : "LET GO!"
            }
            if (fast !== pr.wasFast) {
                pr.wasFast = fast
                publish({ gauge: fast ? "amber" : "green" })
            }
        }
        // ---------------- pointer + key listeners (capture, read-only)
        const onDown = (e) => {
            const now = performance.now()
            const L = layer()
            const Hh = host()
            if (!L || !Hh) return
            if (S.complete) {
                S.lastTouchAt = now
                return
            }
            const p = toLayer(e.clientX, e.clientY)
            S.lastPt = p
            S.lastTouchAt = now
            S.down = true
            S.downKey = S.cur ? S.cur.key : null
            S.advanceAt = 0
            const cur = S.cur
            if (cur && cur.g === "wait") {
                S.shake += 1
                return
            }
            hide(now)
            if (!cur) return
            const A = eosArrowsQ(Hh, ".cinematicContentShell > .arena")
            const sel = cur.kind === "marker" ? '[data-eos-target="1"]' : cur.spec && cur.spec.t
            let el = null
            try {
                el = sel && e.target && e.target.closest ? e.target.closest(sel) : null
            } catch {}
            if (el && A && !A.contains(el)) el = null
            if (!el) {
                S.missAt = now
                return
            }
            S.missAt = 0
            if (cur.kind === "stage") {
                if (cur.spec.until === "touch") S.touched.add(cur.i)
                if (cur.spec.once) S.onceDone.add(cur.i)
            }
            const s = cur.spec || {}
            if (cur.g === "taps" && cur.kind !== "marker") {
                const n = Number(s.n) || 3
                let ord = 0
                if (s.pick === "near") {
                    const L0 = layer()
                    const SR = L0.getBoundingClientRect()
                    const k = eosStageScale(L0)
                    const us = eosArrowsQsa(A, s.t)
                        .filter((x) => eosArrowsUsable(x, SR, k))
                        .slice(0, 24)
                    ord = Math.max(0, us.indexOf(el))
                }
                const cid = `${cur.i}|${s.t}|${ord}`
                if (S.count && S.count.id === cid && S.count.left > 0) S.count = { ...S.count, left: S.count.left - 1 }
                else S.count = { id: cid, n, left: n - 1 }
                try {
                    const b = layer().querySelector(".eosCount")
                    if (b) b.textContent = S.count.left > 0 ? `×${S.count.left}` : "✓"
                } catch {}
                if (S.count.left === 0) {
                    S.count.doneAt = now
                    eosTone(eosNote(n + 2), 200, { type: "triangle", gain: 0.04 })
                } else eosTone(eosNote(n - S.count.left), 110, { type: "triangle", gain: 0.035 })
                if (cur.kind === "stage" && cur.spec.pick === "near") S.near = { i: cur.i, el }
            }
            if (EOS_ARROWS_HOLDS[cur.g]) {
                S.press = { kind: "hold", g: cur.g, spec: s, el, t0: now }
                setLive({ kind: "hold", x: p.x, y: p.y, win: cur.g === "holdRelease" && Array.isArray(s.win) ? s.win : null, k: now })
            } else if (EOS_ARROWS_DRAGS[cur.g]) {
                const ar = eosRelRect(A, L)
                const u = eosArrowsUnit(s.dir, p, ar ? { x: ar.cx, y: ar.cy } : null)
                const W = L.offsetWidth || 1
                const H = L.offsetHeight || 1
                let d = Number(s.d) || 120
                if (W <= 560) d = Math.max(60, d * 0.75)
                const both = s.dir === "lr" || s.dir === "ud"
                const room = eosArrowsRoom(p.x, p.y, u, W, H, 10)
                const room2 = eosArrowsRoom(p.x, p.y, [-u[0], -u[1]], W, H, 10)
                const d1 = Math.max(24, Math.min(d, room))
                const d2 = Math.max(24, Math.min(d, room2))
                S.press = { kind: "drag", g: cur.g, spec: s, x0: p.x, y0: p.y, u, d: d1, both, maxSpeed: Number(s.maxSpeed) || (cur.g === "slow" ? 260 : 0), samples: [{ t: Number(e.timeStamp) || now, x: p.x, y: p.y }], t0: Number(e.timeStamp) || now, speed: null }
                setLive({ kind: "drag", W, H, x0: p.x, y0: p.y, x1: p.x + u[0] * d1, y1: p.y + u[1] * d1, both, x2: p.x - u[0] * d2, y2: p.y - u[1] * d2, k: now })
            }
            if (S.press || S.cur) schedule(true)
        }
        const onMove = (e) => {
            if (!S.down || !S.press || S.press.kind !== "drag") return
            updateDrag(e.clientX, e.clientY, performance.now(), e.timeStamp)
        }
        const onUp = () => {
            if (!S.down) return
            const now = performance.now()
            S.down = false
            S.lastTouchAt = now
            S.advanceAt = now + 350
            if (S.press) {
                S.press = null
                setLive(null)
                publish({ gauge: null })
            }
        }
        const onKey = (e) => {
            const now = performance.now()
            S.lastTouchAt = now
            S.advanceAt = now + 350
            const t = e && e.target
            const typing = !!t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !/^(button|submit|checkbox|radio|range)$/i.test(t.type || "")) || t.isContentEditable)
            if (typing) {
                // typing covers nothing: keep the cue up, and let the next stage (50's SHOW ME) take over at once
                S.downKey = null
                return
            }
            if (S.cur && S.cur.g !== "wait" && S.shown) hide(now)
            S.downKey = S.cur ? S.cur.key : null
        }
        let boundHost = null
        const bind = () => {
            const Hh = host()
            if (!Hh || boundHost === Hh) return
            if (boundHost) {
                boundHost.removeEventListener("pointerdown", onDown, true)
                boundHost.removeEventListener("keydown", onKey, true)
            }
            boundHost = Hh
            Hh.addEventListener("pointerdown", onDown, true)
            Hh.addEventListener("keydown", onKey, true)
        }
        bind()
        const bindTimer = setInterval(bind, 500)
        window.addEventListener("pointermove", onMove, true)
        window.addEventListener("pointerup", onUp, true)
        window.addEventListener("pointercancel", onUp, true)
        S.timer = setTimeout(tick, 120)
        return () => {
            S.alive = false
            clearTimeout(S.timer)
            clearTimeout(S.srTimer)
            clearInterval(bindTimer)
            cancelAnimationFrame(S.raf)
            if (boundHost) {
                boundHost.removeEventListener("pointerdown", onDown, true)
                boundHost.removeEventListener("keydown", onKey, true)
            }
            window.removeEventListener("pointermove", onMove, true)
            window.removeEventListener("pointerup", onUp, true)
            window.removeEventListener("pointercancel", onUp, true)
            if (EOS_ARROWS_VIEW.id === id) EOS_ARROWS_VIEW = { visible: false, g: null, label: null, stage: null, targetSelector: null, x: null, y: null, inViewport: false, count: null }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, hostRef])

    React.useEffect(() => {
        if (!ok) return undefined
        const t = setTimeout(() => setOk(null), 520)
        return () => clearTimeout(t)
    }, [ok])

    const cls = `eosArrowsRoot eosArrowLayer${calm ? " isCalm" : ""}${view && view.phone ? " isPhone" : ""}${view && view.narrow ? " isNarrow" : ""}`
    return (
        <div ref={layerRef} className={cls} data-eos-game={id}>
            <EosArrowsCueView v={view} />
            {live && live.kind === "hold" ? <EosArrowsLiveHold live={live} refs={holdRefs} /> : null}
            {live && live.kind === "drag" ? <EosArrowsLiveDrag live={live} refs={dragRefs} /> : null}
            {ok ? (
                <div key={`ok${ok.k}`} className="eosOk" style={{ left: ok.x, top: ok.y }} aria-hidden="true">
                    <svg viewBox="0 0 40 40" aria-hidden="true">
                        <path d="M20 2v7M20 31v7M2 20h7M31 20h7M7 7l5 5M28 28l5 5M33 7l-5 5M12 28l-5 5" stroke="#FFE58A" strokeWidth="2.6" strokeLinecap="round" />
                        <path d="M12 20.5l5.5 5.5L29 14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 20.5l5.5 5.5L29 14" fill="none" stroke="#FFB23E" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            ) : null}
            <div className="eosSrOnly" role="status" aria-live="polite">
                {sr}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- stand-alone cue + hint (non-game surfaces)
function eosArrowsViewport() {
    try {
        return typeof window !== "undefined" ? window.innerWidth || 1280 : 1280
    } catch {
        return 1280
    }
}
// Presentational: the same hand / chevron / label / ring / badge / hold ring at absolute coordinates inside the
// nearest positioned parent. {x, y, g, label, n, dir, d, ms, win, bpm, reduced, rect, halos, to, W, H, level, shown}
function EosHandCue({ x, y, g = "tap", label, L2, n, dir, d, ms, win, bpm, reduced, rect, halos, to, W, H, level = 2, shown = true }) {
    useEosStore()
    const calm = eosCalm(reduced)
    const vw = eosArrowsViewport()
    const lab = label == null ? eosArrowsDefaultLabel({ g, n, dir }) : label
    const v = eosArrowsModel({
        g, label: lab, L2, n, dir, d, ms, win, bpm, tx: Number(x) || 0, ty: Number(y) || 0, rect, halos, to, W: W || 4000, H: H || 4000, phone: vw <= 560, narrow: vw <= 700,
        count: g === "taps" && n ? { left: n, text: `×${n}` } : null,
    })
    v.text = lab
    v.shown = !!shown
    v.level = level
    v.token = 1
    return (
        <div className={`eosArrowsRoot eosHandCue${calm ? " isCalm" : ""}${v.phone ? " isPhone" : ""}${v.narrow ? " isNarrow" : ""}`} aria-hidden="true">
            <EosArrowsCueView v={v} />
        </div>
    )
}
// Positions an EosHandCue on live elements of any surface (check-in, Still Moment, shift meter, reveal).
// target: Element | selector | Element[] | () => any of those. For g:"choose" the gold halo hops across every
// element and the hand rests on the middle one (or on `rest`). Hidden on any pointerdown / key inside `root`
// (default: the hint's parent), re-shown after idleMs without input (`once` = never again).
function EosHandHint({ target, root, g = "tap", label, L2, n, ms, dir, d, win, to, rest, reduced, showAfterMs = 600, idleMs = 3000, once = false, level = 2 }) {
    useEosStore()
    const calm = eosCalm(reduced)
    const layerRef = React.useRef(null)
    const [v, setV] = React.useState(null)
    const P = React.useRef({})
    P.current = { target, root, g, label, L2, n, ms, dir, d, win, to, rest, level }
    React.useEffect(() => {
        const S = { alive: true, shown: false, done: false, showAt: performance.now() + Math.max(0, Number(showAfterMs) || 0), token: 0, sig: "", raf: 0, timer: 0, frame: 0 }
        const layer = () => layerRef.current
        const rootEl = () => {
            const r = P.current.root
            if (r && r.nodeType === 1) return r
            if (typeof r === "string") return eosArrowsQ(document, r)
            const L = layer()
            return L ? L.parentElement : null
        }
        const list = (t, scope) => {
            let x = typeof t === "function" ? t() : t
            if (typeof x === "string") x = eosArrowsQsa(scope || document, x)
            if (!x) return []
            if (x.nodeType === 1) return [x]
            return Array.from(x).filter((e) => e && e.nodeType === 1 && e.isConnected)
        }
        const measure = () => {
            if (!S.alive) return
            const now = performance.now()
            const L = layer()
            if (!L) return loop()
            if (!S.shown && !S.done && now >= S.showAt) {
                S.shown = true
                S.token += 1
            }
            const p = P.current
            const scope = rootEl() || document
            const els = list(p.target, scope)
            let next = null
            if (els.length) {
                const W = L.offsetWidth || 1
                const H = L.offsetHeight || 1
                const vw = eosArrowsViewport()
                const rects = els.map((e) => eosRelRect(e, L)).filter((r) => r && r.w > 1 && r.h > 1)
                if (rects.length) {
                    const gg = p.g || "tap"
                    let restR = rects[gg === "choose" ? Math.floor((rects.length - 1) / 2) : 0]
                    if (p.rest) {
                        const re = list(p.rest, scope)[0]
                        const rr = re ? eosRelRect(re, L) : null
                        if (rr && rr.w > 1) restR = rr
                    }
                    let toR = null
                    if (p.to) {
                        const te = list(p.to, scope)[0]
                        toR = te ? eosRelRect(te, L) : null
                    }
                    const lab = p.label == null ? eosArrowsDefaultLabel({ g: gg, n: p.n, dir: p.dir }) : p.label
                    next = eosArrowsModel({
                        g: gg, label: lab, L2: p.L2, n: p.n, dir: p.dir, d: p.d, ms: p.ms, win: p.win, tx: restR.cx, ty: restR.cy, rect: restR,
                        halos: gg === "choose" ? rects.slice(0, 12) : null, to: toR, W, H, phone: vw <= 560, narrow: vw <= 700,
                        count: gg === "taps" && p.n ? { left: p.n, text: `×${p.n}` } : null,
                    })
                    if (gg === "choose") next.halos = rects.slice(0, 12)
                    next.text = lab
                    next.shown = S.shown
                    next.level = p.level || 2
                    next.token = S.token
                }
            }
            const sig = next ? [next.shown ? 1 : 0, next.token, next.text, next.tx, next.ty, next.lab.x, next.lab.y, next.W, next.H].map((q) => (typeof q === "number" ? Math.round(q / 2) : q)).join("|") + (next.halos ? next.halos.map((h) => `${Math.round(h.x / 2)},${Math.round(h.y / 2)}`).join(";") : "") : ""
            if (sig !== S.sig) {
                S.sig = sig
                setV(next)
            }
            loop()
        }
        const loop = () => {
            cancelAnimationFrame(S.raf)
            clearTimeout(S.timer)
            if (!S.alive) return
            if (S.shown) {
                S.raf = requestAnimationFrame(() => {
                    S.frame += 1
                    if (S.frame % 2 === 0) measure()
                    else loop()
                })
            } else S.timer = setTimeout(measure, 160)
        }
        const onInput = () => {
            if (once) S.done = true
            S.shown = false
            S.showAt = performance.now() + Math.max(400, Number(idleMs) || 3000)
            measure()
        }
        const R = rootEl()
        if (R) {
            R.addEventListener("pointerdown", onInput, true)
            R.addEventListener("keydown", onInput, true)
        }
        measure()
        return () => {
            S.alive = false
            cancelAnimationFrame(S.raf)
            clearTimeout(S.timer)
            if (R) {
                R.removeEventListener("pointerdown", onInput, true)
                R.removeEventListener("keydown", onInput, true)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAfterMs, idleMs, once])
    return (
        <div ref={layerRef} className={`eosArrowsRoot eosHintLayer${calm ? " isCalm" : ""}${v && v.phone ? " isPhone" : ""}${v && v.narrow ? " isNarrow" : ""}`} aria-hidden="true">
            <EosArrowsCueView v={v} />
        </div>
    )
}

// ---------------------------------------------------------------- CSS
const EOS_ARROWS_R = ".eosArrowsRoot:not(#eosA):not(#eosB)"
const EOS_ARROWS_CSS = `
${EOS_ARROWS_R}{position:absolute;inset:0;pointer-events:none!important;z-index:60;overflow:visible;font-family:var(--eos-font,"Baloo 2","Nunito",system-ui,sans-serif);-webkit-tap-highlight-color:transparent}
${EOS_ARROWS_R}.eosHandCue{left:0;top:0;width:100%;height:100%}
${EOS_ARROWS_R} *{pointer-events:none!important;box-sizing:border-box}
${EOS_ARROWS_R} .eosCue{position:absolute;inset:0;opacity:0;transition:opacity .16s ease}
${EOS_ARROWS_R} .eosCue.isOn{opacity:1}
${EOS_ARROWS_R} .eosCue.isOn .eosPop{animation:eosArrowsPopIn .26s cubic-bezier(.3,1.6,.4,1) both}
${EOS_ARROWS_R} .eosHandPos{position:absolute;width:0;height:0}
${EOS_ARROWS_R} .eosHandAnim{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;animation-timing-function:ease-in-out;animation-iteration-count:infinite;will-change:transform}
${EOS_ARROWS_R} .eosHandAnim.a-tap,${EOS_ARROWS_R} .eosHandAnim.a-rest{animation-name:eosArrowsTap}
${EOS_ARROWS_R} .eosHandAnim.a-taps{animation-name:eosArrowsTaps}
${EOS_ARROWS_R} .eosHandAnim.a-hold{animation-name:eosArrowsHold}
${EOS_ARROWS_R} .eosHandAnim.a-drag{animation-name:eosArrowsDrag}
${EOS_ARROWS_R} .eosHandAnim.a-slow{animation-name:eosArrowsSlow;animation-timing-function:linear}
${EOS_ARROWS_R} .eosHandAnim.a-swipe{animation-name:eosArrowsSwipe}
${EOS_ARROWS_R} .eosHandAnim.a-lr{animation-name:eosArrowsLR}
${EOS_ARROWS_R} .eosHandAnim.a-sling{animation-name:eosArrowsSling}
${EOS_ARROWS_R} .eosHandAnim.a-scrub{animation-name:eosArrowsScrub;animation-timing-function:linear}
${EOS_ARROWS_R} .eosHandAnim.a-alt{animation-name:eosArrowsAlt}
${EOS_ARROWS_R} .eosHandAnim.isGhost{filter:saturate(0) brightness(1.6)}
${EOS_ARROWS_R} svg.eosHand{position:absolute;left:-20px;top:-3px;width:64px;height:64px;overflow:visible;transform:rotate(-15deg);transform-origin:20px 3px;filter:drop-shadow(0 7px 5px rgba(12,8,44,.5)) drop-shadow(0 0 10px rgba(255,255,255,.35))}
${EOS_ARROWS_R}.isNarrow svg.eosHand{left:-16.25px;top:-2.4px;width:52px;height:52px;transform-origin:16.25px 2.4px}
${EOS_ARROWS_R} .eosWig.isWig{animation:eosArrowsWiggle .62s ease-in-out 1;transform-origin:0 0}
${EOS_ARROWS_R} .eosChevPos{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;transform:rotate(var(--rot,0deg))}
${EOS_ARROWS_R}.isPhone .eosChevPos{width:36px;height:36px;margin:-18px 0 0 -18px}
${EOS_ARROWS_R} .eosChevBob{width:100%;height:100%;animation:eosArrowsBob .9s ease-in-out infinite}
${EOS_ARROWS_R} svg.eosChevron{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 4px 0 rgba(90,30,0,.55)) drop-shadow(0 0 9px rgba(255,190,80,.6))}
${EOS_ARROWS_R} .eosLabel{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;text-align:center;font:900 15px/1.12 var(--eos-font,"Baloo 2",system-ui,sans-serif);text-transform:uppercase;letter-spacing:.06em;color:#fff;background:rgba(16,14,48,.92);border:2px solid #FFD36B;border-radius:999px;padding:8px 14px;box-shadow:0 4px 0 rgba(8,6,30,.7),0 10px 26px rgba(0,0,0,.38),0 0 18px rgba(255,200,90,.28);text-shadow:none;max-width:calc(100% - 16px)}
${EOS_ARROWS_R} .eosLabel .eosLabelText{display:block;font:inherit;letter-spacing:inherit;color:inherit}
${EOS_ARROWS_R} .eosLabel .eosLabelL2{display:block;margin-top:3px;font:800 14px/1.1 var(--eos-font,"Baloo 2",system-ui,sans-serif);letter-spacing:.04em;color:#BFF6FF;text-transform:uppercase}
${EOS_ARROWS_R}.isPhone .eosLabel{font-size:14px;padding:6px 10px}
${EOS_ARROWS_R} .eosRing{position:absolute;width:66px;height:66px;margin:-33px 0 0 -33px;border-radius:50%;border:3px solid rgba(255,229,138,.95);box-shadow:0 0 14px rgba(255,200,80,.65),inset 0 0 10px rgba(255,229,138,.4);opacity:0;animation:eosArrowsRipple 1.2s ease-out infinite}
${EOS_ARROWS_R} .eosRing.r2{animation-delay:.15s;border-color:rgba(255,255,255,.85)}
${EOS_ARROWS_R} .eosRing.r-taps{animation-name:eosArrowsRipple3}
${EOS_ARROWS_R} .eosRing.r-alt{animation-name:eosArrowsRippleAlt}
${EOS_ARROWS_R} .eosRing.r-scrub{display:none}
${EOS_ARROWS_R} svg.eosTrailSvg{position:absolute;left:0;top:0;overflow:visible}
${EOS_ARROWS_R} path.eosTrailShadow{fill:none;stroke:rgba(16,14,48,.55);stroke-width:9;stroke-linecap:round}
${EOS_ARROWS_R} path.eosTrail{fill:none;stroke:#FFD36B;stroke-width:4;stroke-dasharray:6 10;stroke-linecap:round;animation:eosArrowsDash .7s linear infinite;filter:drop-shadow(0 0 4px rgba(255,190,80,.85))}
${EOS_ARROWS_R} .g-slow path.eosTrail{stroke-dasharray:1 17;stroke-width:9;animation-duration:2.2s;stroke:#9BF0A8;filter:drop-shadow(0 0 4px rgba(80,230,140,.8))}
${EOS_ARROWS_R} .g-swipe path.eosTrail{stroke-dasharray:14 8;animation-duration:.35s}
${EOS_ARROWS_R} path.eosBand{fill:none;stroke:#FF9F6B;stroke-width:4;stroke-linejoin:round;vector-effect:non-scaling-stroke;transform-box:fill-box;transform-origin:50% 0;animation:eosArrowsBand 2.2s ease-in-out infinite}
${EOS_ARROWS_R} circle.eosPost{fill:#FFD36B;stroke:#1b1650;stroke-width:2.5}
${EOS_ARROWS_R} path.eosFly{fill:none;stroke:#fff;stroke-width:3.5;stroke-linecap:round;stroke-dasharray:2 8;opacity:0;animation:eosArrowsFly 2.2s ease-out infinite}
${EOS_ARROWS_R} .eosZone{position:absolute;border:3px dashed #FFE58A;border-radius:24px;background:rgba(255,211,107,.10);box-shadow:0 0 22px rgba(255,200,90,.5);animation:eosArrowsZone 1.1s ease-in-out infinite}
${EOS_ARROWS_R} .eosZoneTag{position:absolute;left:50%;top:-14px;transform:translate(-50%,-100%);white-space:nowrap;font:900 14px/1 var(--eos-font,"Baloo 2",system-ui,sans-serif);letter-spacing:.06em;color:#1b1650;background:#FFD36B;border:2px solid #fff;border-radius:999px;padding:5px 10px;box-shadow:0 3px 0 rgba(90,30,0,.5)}
${EOS_ARROWS_R} .eosHaloBase{position:absolute;border-radius:22px;border:2px dashed rgba(255,229,138,.6)}
${EOS_ARROWS_R} .eosHalo{position:absolute;border-radius:24px;border:3px solid #FFE58A;box-shadow:0 0 0 4px rgba(255,211,107,.25),0 0 28px rgba(255,190,80,.8),inset 0 0 18px rgba(255,229,138,.35);opacity:0;animation:eosArrowsHalo var(--hp,1.2s) linear infinite;animation-delay:var(--hd,0s)}
${EOS_ARROWS_R} .eosCaret{position:absolute;width:3px;border-radius:2px;background:#FFD36B;box-shadow:0 0 8px #FFB23E;animation:eosArrowsCaret 1s steps(1) infinite}
${EOS_ARROWS_R} .eosHoldDemo{position:absolute;width:84px;height:84px;margin:-42px 0 0 -42px}
${EOS_ARROWS_R} .eosHoldDemo svg,${EOS_ARROWS_R} .eosHoldLive svg{width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
${EOS_ARROWS_R} .hdTrack,${EOS_ARROWS_R} .hlTrack{fill:none;stroke:rgba(16,14,48,.6);stroke-width:9}
${EOS_ARROWS_R} .hdWin,${EOS_ARROWS_R} .hlWin{fill:none;stroke:url(#eosArrowsStripes);stroke-width:9}
${EOS_ARROWS_R} .hdFill{fill:none;stroke:#FFD36B;stroke-width:6;stroke-linecap:round;stroke-dasharray:100 100;stroke-dashoffset:100;animation:eosArrowsHoldFill 2s linear infinite;filter:drop-shadow(0 0 4px rgba(255,190,80,.9))}
${EOS_ARROWS_R} .eosHoldLive{position:absolute;width:104px;height:104px;margin:-52px 0 0 -52px;animation:eosArrowsPopIn .2s ease-out both}
${EOS_ARROWS_R} .hlFill{fill:none;stroke:#FFD36B;stroke-width:7;stroke-linecap:round;filter:drop-shadow(0 0 5px rgba(255,190,80,.95))}
${EOS_ARROWS_R} .hlText{position:absolute;left:50%;top:-12px;transform:translate(-50%,-100%);white-space:nowrap;font:900 15px/1 var(--eos-font,"Baloo 2",system-ui,sans-serif);letter-spacing:.06em;color:#fff;background:rgba(16,14,48,.92);border:2px solid #FFD36B;border-radius:999px;padding:6px 11px;box-shadow:0 3px 0 rgba(8,6,30,.7)}
${EOS_ARROWS_R} .hlText.isGo{background:#1F9D55;border-color:#C6FFD8;animation:eosArrowsGo .5s ease-in-out infinite}
${EOS_ARROWS_R} .eosDragGoal,${EOS_ARROWS_R} .eosDragGoal>svg{position:absolute;left:0;top:0;overflow:visible}
${EOS_ARROWS_R} .dgTrack{stroke:rgba(255,255,255,.4);stroke-width:5;stroke-dasharray:3 9;stroke-linecap:round}
${EOS_ARROWS_R} .dgFill{stroke:#FFD36B;stroke-width:8;stroke-linecap:round;filter:drop-shadow(0 0 6px rgba(255,190,80,.9))}
${EOS_ARROWS_R} .dgFill.isSlow{stroke:#3BE37A;filter:drop-shadow(0 0 6px rgba(60,230,120,.9))}
${EOS_ARROWS_R} .dgFill.isFast{stroke:#FFB23E;filter:drop-shadow(0 0 8px rgba(255,150,40,1))}
${EOS_ARROWS_R} .dgEnd{fill:rgba(255,211,107,.12);stroke:#FFE58A;stroke-width:3.5;stroke-dasharray:5 5}
${EOS_ARROWS_R} .dgEnd.isHit{fill:rgba(59,227,122,.3);stroke:#3BE37A;stroke-dasharray:none;stroke-width:5}
${EOS_ARROWS_R} .dgText{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;white-space:nowrap;font:900 15px/1 var(--eos-font,"Baloo 2",system-ui,sans-serif);letter-spacing:.06em;color:#1b1650;background:#FFB23E;border:2px solid #fff;border-radius:999px;padding:6px 12px 6px 8px;box-shadow:0 3px 0 rgba(90,30,0,.5);opacity:0;transition:opacity .12s}
${EOS_ARROWS_R} .dgText.isOn{opacity:1}
${EOS_ARROWS_R} .dgText.isGo{background:#3BE37A}
${EOS_ARROWS_R} svg.eosTurtle{width:26px;height:17px}
${EOS_ARROWS_R} .eosCount,${EOS_ARROWS_R} .eosSeqNum{position:absolute;min-width:26px;height:26px;margin:-13px 0 0 -13px;padding:0 5px;border-radius:999px;display:grid;place-items:center;font:900 14px/1 var(--eos-font,"Baloo 2",system-ui,sans-serif);color:#3a1a00;background:radial-gradient(circle at 35% 30%,#FFF6C8,#FFD36B 45%,#FF9F2E);border:2px solid #fff;box-shadow:0 3px 0 rgba(90,30,0,.55),0 0 12px rgba(255,190,80,.75);animation:eosArrowsCountPop .16s ease-out both;z-index:2}
${EOS_ARROWS_R}.isPhone .eosCount,${EOS_ARROWS_R}.isPhone .eosSeqNum{min-width:22px;height:22px;margin:-11px 0 0 -11px;font-size:13px}
${EOS_ARROWS_R} .eosSeqNum{background:radial-gradient(circle at 35% 30%,#FFFFFF,#BFF6FF 50%,#5FC9FF);color:#0E0C2E}
${EOS_ARROWS_R} .eosCount.isDone{background:radial-gradient(circle at 35% 30%,#EFFFF3,#7CF0A4 50%,#2FBF6A);color:#073b1d;animation:eosArrowsBurst .5s ease-out both}
${EOS_ARROWS_R} .eosSpot{position:absolute;inset:0;background:radial-gradient(circle at var(--sx) var(--sy),rgba(0,0,0,0) var(--sr),rgba(0,0,0,.62) calc(var(--sr) + 30px));animation:eosArrowsSpot 2.4s ease both}
${EOS_ARROWS_R} .eosOk{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;animation:eosArrowsOk .45s ease-out both}
${EOS_ARROWS_R} .eosOk svg{width:100%;height:100%;overflow:visible}
${EOS_ARROWS_R} .eosWait{position:absolute;width:0;height:0}
${EOS_ARROWS_R} .eosWaitGlow{position:absolute;width:156px;height:156px;margin:-78px 0 0 -78px;border-radius:50%;background:radial-gradient(circle,rgba(125,227,255,.38),rgba(125,227,255,.1) 58%,rgba(125,227,255,0) 70%);border:3px solid rgba(125,227,255,.75);box-shadow:0 0 44px rgba(125,227,255,.45),inset 0 0 30px rgba(125,227,255,.3);transition:transform .25s linear,opacity .25s linear}
${EOS_ARROWS_R} svg.eosWaitArc{position:absolute;width:176px;height:176px;margin:-88px 0 0 -88px;transform:rotate(-90deg);overflow:visible}
${EOS_ARROWS_R} .waTrack{fill:none;stroke:rgba(16,14,48,.35);stroke-width:3}
${EOS_ARROWS_R} .waFill{fill:none;stroke:#BFF6FF;stroke-width:3.5;stroke-linecap:round;stroke-dasharray:100 100;stroke-dashoffset:100;animation:eosArrowsWaitArc 3s linear infinite}
${EOS_ARROWS_R} svg.eosPalm{position:absolute;width:66px;height:66px;margin:-33px 0 0 -33px;overflow:visible;filter:drop-shadow(0 6px 5px rgba(12,8,44,.45)) drop-shadow(0 0 14px rgba(125,227,255,.7))}
${EOS_ARROWS_R} .eosWait.isShake svg.eosPalm{animation:eosArrowsShake .55s ease-in-out 1}
${EOS_ARROWS_R} .eosWaitCount{position:absolute;left:0;top:44px;transform:translateX(-50%);white-space:nowrap;font:800 14px/1 var(--eos-font,"Baloo 2",system-ui,sans-serif);color:#DFFBFF;text-shadow:0 2px 4px rgba(0,0,0,.6)}
${EOS_ARROWS_R}:not(.isCalm) .eosWaitCount{display:none}
${EOS_ARROWS_R}.isCalm .eosHandAnim,${EOS_ARROWS_R}.isCalm .eosChevBob,${EOS_ARROWS_R}.isCalm .eosHalo,${EOS_ARROWS_R}.isCalm path.eosTrail,${EOS_ARROWS_R}.isCalm .eosZone,${EOS_ARROWS_R}.isCalm .eosWig,${EOS_ARROWS_R}.isCalm path.eosBand,${EOS_ARROWS_R}.isCalm .eosCount,${EOS_ARROWS_R}.isCalm .eosHoldLive,${EOS_ARROWS_R}.isCalm .eosOk,${EOS_ARROWS_R}.isCalm svg.eosPalm,${EOS_ARROWS_R}.isCalm .hlText{animation:none!important}
${EOS_ARROWS_R}.isCalm .eosRing,${EOS_ARROWS_R}.isCalm .eosHandAnim.isGhost,${EOS_ARROWS_R}.isCalm path.eosFly{display:none}
${EOS_ARROWS_R}.isCalm .eosHalo{opacity:.85}
${EOS_ARROWS_R}.isCalm .hdFill{animation:none;stroke-dashoffset:30}
${EOS_ARROWS_R}.isCalm .eosCue.isOn .eosPop{animation:eosArrowsCalmPulse 1.6s ease-in-out infinite}
${EOS_ARROWS_R}.isCalm .eosWaitGlow{transition:opacity .6s linear}
${EOS_ARROWS_R}.isCalm .eosCaret{animation:none}
@media (prefers-reduced-motion:reduce){
${EOS_ARROWS_R} .eosHandAnim,${EOS_ARROWS_R} .eosChevBob,${EOS_ARROWS_R} .eosHalo,${EOS_ARROWS_R} path.eosTrail,${EOS_ARROWS_R} .eosZone,${EOS_ARROWS_R} .eosWig,${EOS_ARROWS_R} path.eosBand,${EOS_ARROWS_R} svg.eosPalm{animation:none!important}
${EOS_ARROWS_R} .eosRing,${EOS_ARROWS_R} .eosHandAnim.isGhost,${EOS_ARROWS_R} path.eosFly{display:none}
${EOS_ARROWS_R} .eosHalo{opacity:.85}
${EOS_ARROWS_R} .eosCue.isOn .eosPop{animation:eosArrowsCalmPulse 1.6s ease-in-out infinite}
${EOS_ARROWS_R} .eosWaitCount{display:block}
}
@keyframes eosArrowsPopIn{0%{scale:.35;opacity:0}100%{scale:1;opacity:1}}
@keyframes eosArrowsCalmPulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes eosArrowsTap{0%,100%{transform:translate(0,-14px) scale(1)}30%{transform:translate(0,0) scale(.9)}46%{transform:translate(0,0) scale(.9)}70%{transform:translate(0,-14px) scale(1)}}
@keyframes eosArrowsTaps{0%,52%,100%{transform:translate(0,-12px) scale(1)}7%,22%,37%{transform:translate(0,0) scale(.9)}14%,29%{transform:translate(0,-10px) scale(1)}}
@keyframes eosArrowsHold{0%,96%,100%{transform:translate(0,-14px) scale(1)}9%,84%{transform:translate(0,0) scale(.86)}}
@keyframes eosArrowsDrag{0%{transform:translate(0,0) scale(1);opacity:0}8%{transform:translate(0,0) scale(1);opacity:1}17%{transform:translate(0,0) scale(.86);opacity:1}42%{transform:translate(var(--mx),var(--my)) scale(.86)}67%{transform:translate(var(--dx),var(--dy)) scale(.86);opacity:1}77%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:1}92%,100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:0}}
@keyframes eosArrowsSlow{0%{transform:translate(0,0) scale(1);opacity:0}6%{transform:translate(0,0) scale(1);opacity:1}12%{transform:translate(0,0) scale(.86);opacity:1}40%{transform:translate(var(--mx),var(--my)) scale(.86)}68%{transform:translate(var(--dx),var(--dy)) scale(.86);opacity:1}76%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:1}92%,100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:0}}
@keyframes eosArrowsSwipe{0%{transform:translate(0,0) scale(1);opacity:0}12%{transform:translate(0,0) scale(1);opacity:1}24%{transform:translate(0,0) scale(.86);opacity:1}48%{transform:translate(var(--dx),var(--dy)) scale(.86);opacity:1}62%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:.9}80%,100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:0}}
@keyframes eosArrowsLR{0%,100%{transform:translate(0,0) scale(1)}10%{transform:translate(0,0) scale(.86)}36%{transform:translate(var(--dx),var(--dy)) scale(.86)}46%{transform:translate(var(--dx),var(--dy)) scale(1)}54%{transform:translate(0,0) scale(1)}62%{transform:translate(0,0) scale(.86)}86%{transform:translate(calc(var(--dx) * -1),calc(var(--dy) * -1)) scale(.86)}94%{transform:translate(calc(var(--dx) * -1),calc(var(--dy) * -1)) scale(1)}}
@keyframes eosArrowsSling{0%{transform:translate(0,0) scale(1);opacity:0}8%{transform:translate(0,0) scale(1);opacity:1}16%{transform:translate(0,0) scale(.86)}52%{transform:translate(var(--dx),var(--dy)) scale(.86)}60%{transform:translate(var(--dx),var(--dy)) scale(.86);opacity:1}64%{transform:translate(var(--dx),var(--dy)) scale(1.08);opacity:1}82%,100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:0}}
@keyframes eosArrowsBand{0%,16%{transform:scaleY(.08)}52%,60%{transform:scaleY(1)}66%{transform:scaleY(-.25)}72%{transform:scaleY(.12)}78%,100%{transform:scaleY(.08)}}
@keyframes eosArrowsFly{0%,60%{opacity:0;stroke-dashoffset:0}64%{opacity:1}92%{opacity:.9}100%{opacity:0;stroke-dashoffset:-40}}
@keyframes eosArrowsScrub{0%{transform:translate(0,-12px) scale(1)}8%{transform:translate(-40px,-10px) scale(.88)}17%{transform:translate(40px,-5px) scale(.88)}26%{transform:translate(-40px,0) scale(.88)}35%{transform:translate(40px,5px) scale(.88)}44%{transform:translate(-40px,10px) scale(.88)}53%{transform:translate(40px,14px) scale(.88)}64%,100%{transform:translate(0,-12px) scale(1)}}
@keyframes eosArrowsAlt{0%,100%{transform:translate(0,-12px) scale(1)}12%{transform:translate(0,0) scale(.9)}24%{transform:translate(0,-12px) scale(1)}46%{transform:translate(var(--dx),calc(var(--dy) - 30px)) scale(1)}54%{transform:translate(var(--dx),calc(var(--dy) - 12px)) scale(1)}62%{transform:translate(var(--dx),var(--dy)) scale(.9)}74%{transform:translate(var(--dx),calc(var(--dy) - 12px)) scale(1)}92%{transform:translate(0,-30px) scale(1)}}
@keyframes eosArrowsWiggle{0%,100%{transform:rotate(0)}15%{transform:rotate(-14deg)}30%{transform:rotate(12deg)}45%{transform:rotate(-12deg)}60%{transform:rotate(10deg)}75%{transform:rotate(-8deg)}}
@keyframes eosArrowsBob{0%,100%{transform:translateY(-5px)}50%{transform:translateY(3px)}}
@keyframes eosArrowsRipple{0%,28%{transform:scale(.4);opacity:0}31%{transform:scale(.4);opacity:.9}100%{transform:scale(1.7);opacity:0}}
@keyframes eosArrowsRipple3{0%,6%{transform:scale(.4);opacity:0}7%{transform:scale(.4);opacity:.9}40%{transform:scale(1.5);opacity:0}100%{opacity:0}}
@keyframes eosArrowsRippleAlt{0%,11%{transform:scale(.4);opacity:0}12%{transform:scale(.4);opacity:.9}45%{transform:scale(1.6);opacity:0}100%{opacity:0}}
@keyframes eosArrowsDash{to{stroke-dashoffset:-32}}
@keyframes eosArrowsZone{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.04);opacity:1}}
@keyframes eosArrowsHalo{0%{opacity:1;transform:scale(1.06)}22%{opacity:.9;transform:scale(1)}34%,100%{opacity:0;transform:scale(1)}}
@keyframes eosArrowsCaret{0%{opacity:1}50%{opacity:0}}
@keyframes eosArrowsHoldFill{0%,9%{stroke-dashoffset:100}84%{stroke-dashoffset:0;stroke:#FFD36B}90%{stroke-dashoffset:0;stroke:#fff}100%{stroke-dashoffset:100}}
@keyframes eosArrowsGo{0%,100%{scale:1}50%{scale:1.08}}
@keyframes eosArrowsCountPop{0%{scale:1.25}100%{scale:1}}
@keyframes eosArrowsBurst{0%{scale:.6}45%{scale:1.45}100%{scale:1}}
@keyframes eosArrowsSpot{0%{opacity:0}15%,80%{opacity:1}100%{opacity:0}}
@keyframes eosArrowsOk{0%{scale:.4;opacity:0}35%{scale:1.15;opacity:1}100%{scale:1;opacity:0}}
@keyframes eosArrowsWaitArc{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes eosArrowsShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px) rotate(-6deg)}40%{transform:translateX(5px) rotate(5deg)}60%{transform:translateX(-4px) rotate(-3deg)}80%{transform:translateX(3px)}}
@keyframes eosArrowsGuidePulse{0%,100%{scale:1;box-shadow:0 3px 0 rgba(90,30,0,.55),0 0 12px rgba(255,190,80,.55)}50%{scale:1.1;box-shadow:0 3px 0 rgba(90,30,0,.55),0 0 24px rgba(255,200,90,.95)}}
${EOS_A}.stage-play .globalPlayGuide .guideStepCard{position:relative!important;padding-left:48px!important}
${EOS_A}.stage-play .globalPlayGuide .guideActionArrow{position:absolute!important;left:9px!important;top:50%!important;width:30px!important;height:30px!important;margin:-15px 0 0!important;transform:none!important;display:grid!important;place-items:center!important;border-radius:50%!important;border:2px solid #fff!important;background:radial-gradient(circle at 35% 30%,#FFF6C8,#FFD36B 45%,#FF9F2E)!important;color:#3a1a00!important;font:900 18px/1 "Baloo 2","Segoe UI Symbol","Noto Sans Symbols 2","Apple Symbols",system-ui,sans-serif!important;font-style:normal!important;text-shadow:none!important;box-shadow:0 3px 0 rgba(90,30,0,.55),0 0 16px rgba(255,190,80,.75)!important;animation:eosArrowsGuidePulse 1.6s ease-in-out infinite!important;pointer-events:none!important;z-index:2!important}
@media (max-width:700px){${EOS_A}.stage-play .globalPlayGuide .guideStepCard{padding-left:42px!important}${EOS_A}.stage-play .globalPlayGuide .guideActionArrow{left:8px!important;width:26px!important;height:26px!important;margin-top:-13px!important;font-size:16px!important}}
@media (prefers-reduced-motion:reduce){${EOS_A}.stage-play .globalPlayGuide .guideActionArrow{animation:none!important}}
`
eosCss("arrows", EOS_ARROWS_CSS)

eosExpose("arrows", { EOS_GESTURES, EOS_GLYPH_OVERRIDE, EosGestureFor, eosGlyph, EosGuideArrows, EosHandCue, EosHandHint, state: eosArrowsState })
