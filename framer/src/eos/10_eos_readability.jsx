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
// raised (a later game state may want them bigger than the floor) and never touches SVG text in a scaled
// viewBox (reported by scan() instead), our own .eos* overlays or aria-hidden decoration — but aria-hidden text that
// a target row names IS floored: the wrappers draw every thought a second time as an aria-hidden name tag
// (.tsBubbleTextContainer, 8.5 px under CLEANSE's stones) and some art carries real labels (DOOR A / B's "OR").
// Words render at 16 / 15 px: a word in a box held at a scale (FINGER TRAP's .86 tube) is compensated up to that.
// .chainStart (UNFINISHED SENTENCE's first words): the spec assumed 22-50 px, but the arcade's
// `.tsExactUserText.tsExactUserText.tsExactUserText{font-size:clamp(8px,.9vw,11px)!important}` wins there, so it
// renders 11 px (1280) / 8 px (390). It is the user's own words, so it gets the grow-only word floor like every
// other word (never smaller than today; only the risky max(…,1em) CSS trick stays away from it).
// When: new text is floored inside the MutationObserver callback (a microtask — before its first paint), the rest
// by a time-boxed sweep right after a frame, every 900 ms and 250 ms after a pointerup; the floor is on while the
// arcade root is stage-play / stage-reveal or the game menu is open.
// Integration (I1-E3, already in dev/eos_integrate.py): `<EosTextFloor stage={stage} />` inside .releaseStage.
// Test hook: eosApi("readability") (dev: window.__eos.readability) = {scan, targets, pass, stats, reset, log, settle,
// targetOf, targetsOf}; eos_drive.smallText() merges scan() into its DOM sweep.
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
${EOS_A} .releaseThoughtInput{font-size:16px!important;padding-right:46px!important} /* phones set 10 px: text ran under the mic */
/* game menu group labels (7 px today; EosMenuGroup reuses the markup) */
${EOS_A} .releaseChoiceMenu .releaseChoiceGroupLabel{font:900 13px/1.2 var(--eos-font)!important;letter-spacing:.08em!important}
/* reveal */
${EOS_A}.stage-reveal .releaseCompleteCard small{font-size:13px!important}
/* reveal controls: the live baseline inherits 16 px here (the arcade's 8-10 px rules do not apply), so the
   size is max(target, 1em) — 1em is exactly the inherited size: never below 14/15 px, never below today */
${EOS_A}.stage-reveal :is(.releaseReplaySame,.releaseCompleteSideNav){font-family:var(--eos-font)!important;font-weight:800!important;font-size:max(14px,1em)!important;line-height:1!important;min-height:44px!important}
${EOS_A}.stage-reveal .releaseShiftChoices>button{font-family:var(--eos-font)!important;font-weight:900!important;font-size:max(15px,1em)!important;line-height:1!important;min-height:48px!important}
/* reveal of ids ≥ 100: the arcade's GLOBAL_RELEASE_MORE_CSS (only loaded when no legacy game is selected, i.e.
   :not(.releaseGlobal99Upgrade)) draws these controls at 8-10 px in 84 / 58 px side columns — they get 14 / 15 px
   and side columns that fit their words; on phones PREVIOUS / NEXT sit in one row under a full-width card */
${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseCompleteShell{grid-template-columns:auto minmax(0,620px) auto!important}
${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseCompleteSideNav{width:auto!important;min-width:84px!important;padding:0 16px!important;white-space:nowrap!important;font-size:14px!important;letter-spacing:.05em!important}
${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseReplaySame{font-size:14px!important}
${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseShiftChoices>button{font-size:15px!important}
@media (max-width:760px){
  ${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseCompleteShell{grid-template-columns:1fr 1fr!important;grid-template-areas:"card card" "prev next"!important;row-gap:12px!important;column-gap:10px!important}
  ${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseCompleteCard{grid-area:card!important}
  ${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseCompletePrev{grid-area:prev!important;justify-self:start!important}
  ${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseCompleteNext{grid-area:next!important;justify-self:end!important}
  ${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseCompleteSideNav{min-width:0!important;height:44px!important;padding:0 18px!important;font-size:13px!important}
  ${EOS_A}.stage-reveal:not(.releaseGlobal99Upgrade) .releaseReplaySame{font-size:13px!important}
}
/* in-game HUD — both wrappers. Desktop: one compact row like today's (track + pills), ~30 px taller pills only;
   phones: a slim full-width meter + a reward-pill toast on hits (see ≤ 700 px) — fixes the ids ≥ 100 overflow
   (the track was pushed off-screen at 390, the pills were 6.5 px).
   pointer-events stay off (it sits above game targets). */
${EOS_A}.stage-play .releaseGameHost .engineProgressHud{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;align-items:center!important;justify-content:flex-end!important;height:auto!important;min-height:0!important;flex-basis:auto!important;gap:6px 8px!important;pointer-events:none!important;box-sizing:border-box!important;padding:2px 3px!important;border-radius:16px!important;width:auto!important;max-width:calc(100% - 20px)!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressTrack{width:430px!important;max-width:100%!important;height:26px!important;min-height:26px!important;flex:0 1 auto!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressHud:has(.tsShiftRewardHud) .engineProgressTrack{width:300px!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressText{font:900 14px/26px var(--eos-font)!important;letter-spacing:.05em!important}
${EOS_A}.stage-play .tsShiftRewardHud{display:flex!important;flex-wrap:nowrap!important;justify-content:flex-end!important;gap:6px!important;width:auto!important;flex:0 0 auto!important;margin:0!important}
${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:30px!important;padding:0 10px!important;display:inline-flex!important;align-items:center!important;white-space:nowrap!important}
${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font-family:var(--eos-font)!important;font-weight:900!important;font-size:14px!important;line-height:1!important;letter-spacing:.03em!important}
/* live guide */
${EOS_A} .globalPlayGuide .guideHeaderRow b{font-size:14px!important}
${EOS_A} .globalPlayGuide :is(.guideStepCard small,.globalMindBend strong){font-size:12.5px!important;letter-spacing:.1em!important}
${EOS_A} .globalPlayGuide .guideStepCard span{font:800 17px/1.2 var(--eos-font)!important}
${EOS_A} .globalPlayGuide .globalMindBend em{font-size:14px!important;line-height:1.25!important}
/* the tags ("How to play" / "Next move", "MIND BEND") become kickers in front of their text instead of lines of
   their own, so the bigger, readable text costs the panel no height: it must not grow over the controls the
   games keep just above it (CLEANSE's lower hold pills, the arrows module's gesture disc sits at the card's left) */
${EOS_A} .globalPlayGuide .guideStepCard>small{display:inline!important;margin:0 .6em 0 0!important}
${EOS_A} .globalPlayGuide .guideStepCard>span{display:inline!important}
${EOS_A} .globalPlayGuide .globalMindBend>strong{display:inline!important;margin:0 .6em 0 0!important}
${EOS_A} .globalPlayGuide .globalMindBend>em{display:inline!important}
/* inline lines take the box's strut too: Baloo 2's "normal" line height (≈1.6) would make every line 26 px */
${EOS_A} .globalPlayGuide :is(.guideStepCard,.globalMindBend){line-height:1.1!important}
${EOS_A} .globalPlayGuide{padding-top:10px!important;padding-bottom:10px!important}
${EOS_A} .globalPlayGuide .guideHeaderRow{margin-bottom:6px!important}
${EOS_A} .globalPlayGuide .guideStepCard{padding-top:8px!important;padding-bottom:8px!important}
${EOS_A} .globalPlayGuide .globalMindBend{margin-top:6px!important;padding-top:7px!important;padding-bottom:7px!important}
/* the user's own words: layout only — SIZE comes from the grow-only JS floor (never shrink 23 px words).
   Words break only between words (break-word, not anywhere: a squeezed flex item keeps whole words), and the
   arcade's max-width:88% becomes 100%: in a box sized by its own word (a 60 px bubble's auto grid track) 88% of
   that box is narrower than the word itself, so a short word broke inside itself ("fee|l", "pani|c") */
${EOS_A}.stage-play .releaseGameHost :is(.tsExactUserText,.plainUserThoughtText,.tsExternalThoughtLabel,.potatoWord,.echoBubbleWord,.rainCloudText,.spaceTileWord,.coinReleaseWord,.tsBubbleTextContainer,.gwThought,.dmHeroThought,.spThought,.volumeMaterialText,.tsndText,.subtitleBar){line-height:1.05!important;overflow-wrap:break-word!important;word-break:normal!important;max-width:100%!important}
/* the wrappers' name tags (.tsThoughtLabelHost > .tsBubbleTextContainer: CLEANSE and the other ids ≥ 100 bubbles)
   carry the user's words at 8.5 px in a fixed 80-132 px box that clips at 38-58 px and breaks inside words
   ("yelle|d at"). With the word floor they fit their words: break only between words, never clip. (The ids < 100
   variant sits inside its bubble and keeps that geometry.) */
${EOS_A}.stage-play:not(.releaseGlobal99Upgrade) .tsThoughtLabelHost>:is(.tsBubbleTextContainer,.tsExternalThoughtLabel){width:max-content!important;min-width:80px!important;max-width:156px!important;max-height:none!important;overflow-wrap:break-word!important;word-break:normal!important;line-height:1.08!important;padding:5px 9px!important}
/* ≤ 11 px-only selectors (every existing arcade rule is ≤ 11 px, so 1em cannot shrink them) */
${EOS_A}.stage-play .releaseGameHost :is(.toolHitCount,.miniCrackCount,.pinTool,.combo,.spStatus,.echoBubbleTimer,.doorABTopLabel,.keepDropMicroGuide){font-size:max(12.5px,1em)!important;letter-spacing:.04em!important}
/* …but 1em is the PARENT's size: inside a 16 px game button the tool-hit chip ("0/3" on each MELT cube, CRACK,
   LASER …) grew to 16 px and covered the cube's word. These in-object counters read at exactly 12.5 px (every
   arcade rule for them is 9-11 px, so nothing shrinks) in a slimmer chip */
${EOS_A}.stage-play .releaseGameHost :is(.toolHitCount,.miniCrackCount){font-size:12.5px!important;line-height:1.05!important;padding:1px 6px!important}
${EOS_A}.stage-play .releaseGameHost :is(.uniqControl,.bigAction,.parkBay,.dmCutButton,.eraseActivateBtn,.cutLoopScissorPicker,.cleanseBubbleHoldButton){font-size:max(14px,1em)!important;min-height:44px!important}
/* the games that narrow the LIVE GUIDE to 300-360 px so it clears their busy arenas (FINGER TRAP, SINKING
   PLATFORM, TINY SOUNDTRACK, GO WEIRD) get the phone sizes inside it on every screen, so its lines do not wrap into
   a taller panel than today's */
${EOS_A}.stage-play .cinematicContentShell:has(>:is(.u102,.u103,.u106,.u107))>.globalPlayGuide .guideStepCard>span{font-size:15px!important;line-height:1.14!important}
${EOS_A}.stage-play .cinematicContentShell:has(>:is(.u102,.u103,.u106,.u107))>.globalPlayGuide .globalMindBend>em{font-size:13px!important;line-height:1.18!important}
/* FINGER TRAP (102): its counter / SHIFT / rule row starts right under the HUD band, which is 10 px deeper now;
   the five traps give the 12 px back in their row gaps, so the last trap sits exactly where it did */
${EOS_A}.stage-play .u102 .ftHud{margin-top:12px!important}
${EOS_A}.stage-play .u102 .ftRows{row-gap:7px!important}
/* CLEANSE (109): the arcade caps each hold pill at 158 px and clips it, so at 14 px it tightens its tracking
   ("HOLD TO BREATHE" fits); phones get a two-line pill (≤ 700 px block) */
${EOS_A}.stage-play .releaseGameHost .cleanseBubbleHoldButton{letter-spacing:.05em!important;max-width:184px!important}
/* VACUUM (23): the machine art is aria-hidden decoration, but its labels are words on screen. The brand plate is
   SVG text in user units (viewBox 560×300, drawn at .89 on desktop and .37 at 390 px), so its size is set here in
   user units, never by the JS floor; the bag label (8 px today, every arcade rule ≤ 11 px) reads at 12.5 px. */
${EOS_A}.stage-play .realVacuumMachine svg>text:last-of-type{font-size:10.5px}
${EOS_A}.stage-play .releaseGameHost .vacuumMachineLabel{font-size:12.5px!important;color:rgba(170,240,252,.78)!important;white-space:nowrap}
/* SHELF IT (95): a shelved bubble is drawn at scale .82 (framer-motion), so its "SHELVED" label (9 px rule) is
   sized for that scale: 15.5 × .82 = 12.7 px on screen from the moment it lands */
${EOS_A}.stage-play .releaseGameHost .shelfThoughtBubble.shelved>b{font-size:15.5px!important}
/* the hit / finish feedback cards are on screen for about a second, so they are sized here (right at their first
   paint) rather than by the JS floor. Every arcade rule for these lines (gz CSS + the wrappers' inline CSS strings)
   is ≤ the size set here — step line ≤ 13 px, step payout ≤ 13, finish small ≤ 12, finish span ≤ 14, finish em 8,
   finish payout ≤ 14 — so nothing shrinks; the headline <b> (11.7-46 px by state) stays with the JS floor. */
${EOS_A}.stage-play .globalStepFeedbackCopy>span{font-size:13px!important}
${EOS_A}.stage-play .globalStepFeedbackCopy .tsRewardPayout{font-size:16px!important}
${EOS_A}.stage-play .globalFinishFeedbackCopy>small{font-size:13px!important}
${EOS_A}.stage-play .globalFinishFeedbackCopy>span{font-size:14px!important}
${EOS_A}.stage-play .globalFinishFeedbackCopy>em{font-size:13px!important}
${EOS_A}.stage-play .globalFinishFeedbackCopy .tsFinishRewardPayout{font-size:18px!important}
/* legacy combo counters ("POPPED 2 / 6") sat under the progress HUD: move them just below it */
${EOS_A}.stage-play .releaseGameHost .arena>.combo{top:46px!important}
/* idle story (classic mode): its how-to lines were 8-11.5 px */
${EOS_A} .releaseIdleStep small{font-size:clamp(12.5px,.9vw,13px)!important}
@media (max-width:760px){
  ${EOS_A} .releaseIdleStep b{font-size:12.5px!important;line-height:1.08!important}
  ${EOS_A} .releaseIdleStep small{font-size:12.5px!important;line-height:1.16!important}
  ${EOS_A} .releaseIdleStoryCaption span{font-size:12.5px!important;line-height:1.15!important;white-space:normal!important}
}
@media (max-width:720px){
  /* phones draw the machine at .37 and clip its right edge: the brand plate stays the art's own texture there */
  ${EOS_A}.stage-play .realVacuumMachine svg>text:last-of-type{font-size:8px}
}
@media (max-width:700px){
  /* Phones: one slim full-width meter row (the arcade's own new-game headers — DRAMA MACHINE's "0 / 6 TAKES CUT",
     RAIN OUT's cloud row — start right under it, so a permanent second row would cover them). The reward pills
     (sparks · tokens · chain · LVL) become a toast that drops in under the meter for each hit — exactly while the
     wrapper marks the hit (.tsShiftRewardHud.isHit, 3.2 s), with the arcade's tsRewardPillHit pop — and tucks away
     again. Overlay only: the HUD box never changes height, so nothing measured from its bottom jumps. */
  ${EOS_A}.stage-play .releaseGameHost .engineProgressHud{left:10px!important;right:10px!important;width:auto!important;max-width:none!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:stretch!important;gap:0!important;padding:2px!important;border-radius:14px!important;overflow:visible!important}
  ${EOS_A}.stage-play .releaseGameHost :is(.engineProgressTrack,.engineProgressHud:has(.tsShiftRewardHud) .engineProgressTrack){width:auto!important;min-width:0!important;flex:1 1 auto!important;height:22px!important;min-height:22px!important}
  ${EOS_A}.stage-play .releaseGameHost .tsShiftRewardHud{position:absolute!important;left:0!important;right:0!important;top:calc(100% + 6px)!important;margin:0!important;width:auto!important;display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:4px!important;opacity:0!important;visibility:hidden!important;transform:translateY(-8px)!important;transition:opacity .18s ease,transform .2s ease,visibility 0s linear .2s!important;pointer-events:none!important}
  ${EOS_A}.stage-play .releaseGameHost .tsShiftRewardHud.isHit{opacity:1!important;visibility:visible!important;transform:none!important;transition:opacity .12s ease,transform .3s cubic-bezier(.2,1.5,.4,1),visibility 0s!important}
  ${EOS_A}.stage-play .releaseGameHost .tsShiftLevel{min-width:56px!important}
  ${EOS_A}.stage-play .tsShiftRewardPill.chain{display:inline-flex!important}
  ${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:28px!important;padding:0 6px!important;box-shadow:0 6px 16px rgba(0,0,0,.42)!important}
  ${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font-size:13px!important}
  ${EOS_A}.stage-play .releaseGameHost .engineProgressText{font-size:13px!important;line-height:22px!important}
  ${EOS_A} .globalPlayGuide .guideStepCard span{font-size:15px!important}
  ${EOS_A} .globalPlayGuide .guideHeaderRow b{font-size:13px!important}
  ${EOS_A} .globalPlayGuide .globalMindBend em{font-size:13px!important}
  ${EOS_A} .globalPlayGuide.isActive .globalMindBend{display:none!important}
  ${EOS_A}.stage-play .releaseGameHost :is(.uniqControl,.bigAction){font-size:max(13px,1em)!important}
  /* CLEANSE (109): the six hold pills hang under stones ~125 px apart; at 14 px on one line they ran off the
     screen edge and clipped ("HOLD TO BREATH"). Here they read at 12.5 px on up to two short lines
     ("HOLD TO / BREATHE") inside the stone's own column, and stay clear of the bottom guide */
  ${EOS_A}.stage-play .releaseGameHost .cleanseBubbleHoldButton{font-size:12.5px!important;letter-spacing:.045em!important;line-height:1.02!important;white-space:normal!important;height:auto!important;min-height:34px!important;min-width:0!important;width:max-content!important;max-width:100px!important;padding:3px 11px!important;display:flex!important;align-items:center!important;justify-content:center!important}
}
@media (max-width:700px) and (prefers-reduced-motion:reduce){
  ${EOS_A}.stage-play .releaseGameHost .tsShiftRewardHud{transform:none!important;transition:none!important}
}
@media (max-width:560px){
  ${EOS_A}.stage-play:not(.releaseGlobal99Upgrade) .tsThoughtLabelHost>:is(.tsBubbleTextContainer,.tsExternalThoughtLabel){min-width:56px!important;max-width:min(118px,31vw)!important;padding:4px 7px!important}
  /* feedback cards on phones (every arcade rule ≤ 10-12 px at this width) */
  ${EOS_A}.stage-play :is(.globalStepFeedbackCopy>span,.globalFinishFeedbackCopy>small,.globalFinishFeedbackCopy>em){font-size:12.5px!important}
  ${EOS_A}.stage-play .globalStepFeedbackCopy .tsRewardPayout{font-size:14px!important}
  ${EOS_A}.stage-play .globalFinishFeedbackCopy .tsFinishRewardPayout{font-size:16px!important}
  /* RAIN OUT (110): the clouds sit 87 px apart at 390, so one-line "PULL TO BREATHE" hints overprinted their
     neighbours (already in the baseline); now they read as two short lines under each cloud */
  ${EOS_A}.stage-play .rainPullHint{gap:3px!important}
  ${EOS_A}.stage-play .rainPullHint>span:last-child{white-space:normal!important;max-width:56px!important;line-height:1.02!important;letter-spacing:.02em!important}
  /* the LIVE GUIDE's text is 2-3 px larger now, so its box gives back some padding: it covers less of the arena.
     The card's "How to play" / "Next move" tag is dropped on phones — the header already names the guide and the
     instruction (with the arrows module's gesture disc beside it) is the line that matters — so the panel stays
     as tall as today's and never covers the controls the games keep in the space above it */
  ${EOS_A} .globalPlayGuide .guideStepCard>small{display:none!important}
  /* …and the MIND BEND line is not shown during play on phones (spec: hidden after the first hit; here from the
     start): with it the panel stood 150-170 px tall over the games' bottom controls (DRAMA MACHINE's "make it
     dramatic", CLEANSE's lower pill) before the player had found the first move. 561-700 px keeps the spec rule. */
  ${EOS_A}.stage-play .globalPlayGuide .globalMindBend{display:none!important}
  ${EOS_A} .globalPlayGuide{padding-top:7px!important;padding-bottom:8px!important}
  ${EOS_A} .globalPlayGuide .guideHeaderRow{margin-bottom:4px!important}
  ${EOS_A} .globalPlayGuide .guideStepCard{padding-top:6px!important;padding-bottom:7px!important}
  ${EOS_A} .globalPlayGuide .guideStepCard span{line-height:1.14!important}
  ${EOS_A} .globalPlayGuide .globalMindBend{margin-top:4px!important;padding-top:5px!important;padding-bottom:6px!important}
  ${EOS_A} .globalPlayGuide .globalMindBend em{line-height:1.18!important}
  /* DOOR A / B (89): the idle line ("OPEN ONE · NOTICE · COME BACK · OPEN THE OTHER", 7 px today) wraps */
  ${EOS_A}.stage-play .u89 .doorABIdlePrompt{white-space:normal!important;text-align:center!important;line-height:1.2!important;letter-spacing:.05em!important}
  /* TINY SOUNDTRACK (106): the cards are 98 px wide at 390, so the avatar (48 px) left the words a 30 px column
     ("my b…"). On phones the avatar shrinks to a 26 px badge beside the KEY tag, the word gets the card's width
     and the vibe line its own row; the piano keys' 6 px "THOUGHT n" sub-labels (the cards above already pair
     each key with its thought) are dropped — the keys keep their big note letter. */
  ${EOS_A}.stage-play .u106 .tsndCard{height:auto!important;min-height:92px!important;grid-template-columns:26px minmax(0,1fr)!important;grid-template-rows:auto auto!important;column-gap:5px!important;row-gap:4px!important;padding:6px!important}
  ${EOS_A}.stage-play .u106 .tsndAvatar{grid-row:1!important;grid-column:1!important;align-self:start!important;width:26px!important;height:26px!important;min-width:26px!important;min-height:26px!important;max-width:26px!important;max-height:26px!important}
  ${EOS_A}.stage-play .u106 .tsndCopy{grid-row:1!important;grid-column:2!important;align-self:start!important}
  ${EOS_A}.stage-play .u106 .tsndText{overflow:visible!important;line-height:1.02!important}
  ${EOS_A}.stage-play .u106 .tsndCardBottom{grid-row:2!important;grid-column:1 / -1!important;flex-wrap:wrap!important;justify-content:center!important;gap:3px 6px!important}
  ${EOS_A}.stage-play .u106 .tsndAction{white-space:nowrap!important;letter-spacing:.02em!important}
  ${EOS_A}.stage-play .u106 .tsndKeySub{display:none!important}
  /* the legacy counter pill (.literalProgress, "0 / 6 CUT FREE") sits at the arena's top-left inside the HUD band;
     the full-width phone meter would cover it, so the meter starts right of it (as today, when the HUD began at
     x 89) and the pill lines up with the meter, wrapping to a second line rather than being cut */
  ${EOS_A}.stage-play .releaseGameHost:has(.arena:not(.u102):not(.u103):not(.u106):not(.u107)>.literalProgress) .engineProgressHud{left:156px!important}
  ${EOS_A}.stage-play .releaseGameHost .arena:not(.u103)>.literalProgress{top:8px!important;left:10px!important;max-width:140px!important;white-space:normal!important;text-overflow:clip!important;line-height:1.08!important}
  /* small word bubbles (UNHOOK 78 px, CUT THE LOOP 60 px): the word gets the bubble's width (the floor sizes it so no
     word breaks inside itself); UNHOOK's "3 STRINGS HOLDING" tag reads on two short lines */
  ${EOS_A}.stage-play .unhookLeftHookArena .unhookWordBubble{padding:5px!important}
  ${EOS_A}.stage-play .unhookLeftHookArena .unhookWordBubble>span{padding:0 1px!important;line-height:1!important}
  ${EOS_A}.stage-play .unhookLeftHookArena .unhookWordBubble>small{margin-top:3px!important;line-height:1!important;letter-spacing:.02em!important;max-width:64px!important}
  ${EOS_A}.stage-play .releaseGameHost .cutLoopWord{padding:4px!important}
  /* the other 56-60 px word bubbles and ice cubes (ERASE, BIN, MELT …) kept 9-12 px side padding for 7-9 px words:
     at 15 px "yelled" needs ~42 px, so the word gets the bubble's width (the floor's word-fit covers the rest) */
  ${EOS_A}.stage-play .releaseGameHost .allCircularBubble{padding-left:4px!important;padding-right:4px!important}
  ${EOS_A}.stage-play .releaseGameHost .iceCubeWord{padding:0 1px!important;line-height:1!important}
  ${EOS_A}.stage-play .releaseGameHost .toolHitCount{bottom:1px!important;line-height:1!important;padding:1px 5px!important}
  ${EOS_A}.stage-play .releaseGameHost .cutLoopWord>span{line-height:1!important}
  /* MAGIC TRAPDOOR (98): a 70 px bubble holds the word and its CHOOSE / LOCKED tag; at 15 px the two-line word ran
     into the tag, so the word sits a little higher and the tag hugs the bubble's rim */
  ${EOS_A}.stage-play .u98 .magicTrapBubble>span{margin:-14px 2px 0!important;line-height:1!important}
  ${EOS_A}.stage-play .u98 .magicTrapBubble>b{bottom:3px!important;top:auto!important;padding:0 4px!important;line-height:1.1!important}
  /* FINGER TRAP (102): on phones the thought slot right of the face is ~40 px wide and the tube is drawn at .86, so a
     15 px word broke inside itself ("yelle|d at") or was cut ("fee…"). The slot now starts at the face's edge and a
     two-word thought takes two lines, breaking only between words */
  ${EOS_A}.stage-play .u102 .ftThoughtPill{padding:0 4px 0 72px!important}
  ${EOS_A}.stage-play .u102 .ftThoughtPill>b{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:break-word!important;word-break:normal!important;line-height:.98!important}
  /* DRAMA MACHINE (105): the six 85 px take chips left a 36 px column for "TAKE 2 / WAITING" (55 px at 12.5 px):
     on phones the take's face is a 20 px badge and the two lines track tighter, so both read whole */
  ${EOS_A}.stage-play .u105 .dmTake{grid-template-columns:20px minmax(0,1fr)!important;column-gap:3px!important;padding:3px 2px 3px 3px!important}
  ${EOS_A}.stage-play .u105 .dmTakeFace{width:20px!important;height:20px!important;max-width:20px!important;min-width:20px!important}
  ${EOS_A}.stage-play .u105 .dmTakeCopy>*{letter-spacing:.01em!important;white-space:nowrap!important;overflow:visible!important}
  /* TUG OF WAR (101): the 12.5 px "COUNTERFORCE" tag centred under the right anchor ran past the arena edge —
     it lines up with the anchor's outer edge instead */
  ${EOS_A}.stage-play .releaseGameHost .tugRightForce>b{left:auto!important;right:0!important;letter-spacing:.04em!important}
  /* GO WEIRD (107): five 65 px prop buttons — a long name ("MOUSTACHE") wraps inside its button instead of
     being cut off */
  ${EOS_A}.stage-play .u107 .gwProp{padding:4px 2px!important}
  ${EOS_A}.stage-play .u107 .gwProp>span{white-space:normal!important;overflow:visible!important;overflow-wrap:anywhere!important;letter-spacing:0!important;line-height:1!important}
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
  ${EOS_A}.stage-reveal :is(.releaseReplaySame,.releaseCompleteSideNav){font-size:max(13px,1em)!important}
  ${EOS_A}.stage-play .releaseGameHost .uniqControl>span:first-child{display:none!important}
}
`
eosCss("readability", EOS_READ_CSS)

// ---------------------------------------------------------------- layer 3: the grow-only JS floor (§4.4)
// [selector, desktopPx, phonePx, kind?] — kind "word" = the user's own words: target = max(16|15, --bubble-text-size).
// A row applies to a text element that matches it or sits inside a match (words: any depth; others: ≤ 2 levels),
// the biggest matching target wins; everything else visible gets the 12 px catch-all. The word list is §4.2's plus
// DOOR A / B's door captions (.doorABOption: the user's own thought on each door, 12.5 px after the catch-all).
const EOS_READ_WORDS = [".tsExactUserText", ".plainUserThoughtText", ".tsExternalThoughtLabel", ".potatoWord", ".echoBubbleWord", ".rainCloudText", ".spaceTileWord", ".coinReleaseWord", ".tsBubbleTextContainer", ".gwThought", ".dmHeroThought", ".spThought", ".volumeMaterialText", ".tsndText", ".ftThoughtPill>b", ".keepDropBubbleText span", ".subtitleBar", ".doorABOption"]
const EOS_READ_LINES = [".hotPotatoStage>.hotPotatoPayoff", ".shelfGuideV2>span", ".coinReleaseStage>.coinReleaseHint", ".tsDynamicActionCue>.tsDynamicActionArrow", "[class*=Payoff]", "[class*=payoff]"]
const EOS_READ_BUTTONS = ["[class*=ToolDock]", ".orbitButtons button", ".genreKeys button", ".productionStrip button", ".nudgeRow button", ".gwProp", ".dmDramaButton", ".tsndVibes button"]
const EOS_READ_COUNTERS = [".magicTrapBubble>b", ".magicLeverHandle>:is(em,b)", ".magicLockLights>b", ".unhookWordBubble>small", ".binWordBubble>b", ".cutLoopWord>em", ".shredderMouth>b", ".shredderTop>span", ".defuseV2Screen>small", ".defuseV2Timer>span", ".defuseZone :is(small,strong,button)", ".freezeWordCube>b", ".hotPotatoGuide>span", ".tugPullHandle>span", ".dmDial>small", ".tsndKeySub", ".eraseWordBubble>b", ".shelfThoughtBubble>b", ".weightedBlock>b", ".doorABExploreMeter>b", ".xrayPassDots>b", ".ftArrow em", ".volumeAutoFinish :is(span,b)", ".dmTakeCopy :is(small,b)", ".dmControlCopy", ".tsndNoteBadge", ".tsndAction", ".tsndInstrumentHead :is(b,span)", ".gwProp :is(em,span)", ".tsndFooter :is(b,span)", ".vacuumMachineLabel", ".carCabin :is(.frontSeat,.backSeat)", ".windLane", ".doorABIdlePrompt", ".xrayScannerHandle>b", ".xrayDragGuide span", ".ftRule", ".ftCue", ".ftShift>b", ".spQueueItem>b", ".rotaryKnob>b", ".dmStageBrand small", ".dmProgressText", ".dmEffectLabel span", ".dmStageCounter", ".tsndTitle small", ".tsndMeter>b", ".gwTopCopy :is(small,b)", ".gwMeter>b", ".controlPanelSwitches span", ".premiumCombo", ".zapBubbleCount", "[class*=ToolDock]>span", ".neonBin>span", ".chainLink span", ".doorABVs span", ".doorABStageTitle span", ".coinFaceLabel", ".spCounter", ".tradeHeader span", ":is(.zapGroundButton,.meltGroundButton,.flushLever,.burnGroundButton)>span", ".swipeCard>b", ".ownershipZones span", ".rubberStamps span", ".lotus>b", ".rainPullHint span", ".controlPanelHelper", ".controlPanelHeader span", ".scaleDopamine", ".priorityGrid span", ".literalStatus :is(b,span)", ".uniqStatus :is(b,span)", ".literalProgress", ".cleanseStatus", ".tsDynamicActionText", ".globalFeedbackCopyLayer :is(b,span)"]
const EOS_READ_TARGETS = [
    ...EOS_READ_WORDS.map((s) => [s, 16, 15, "word"]),
    ...EOS_READ_LINES.map((s) => [s, 15, 14]),
    [".tsRewardPayout", 16, 14],
    // the hit headline ("NAILED IT"): the legacy wrapper draws it at 12-13.4 px, i.e. no bigger than its own
    // sub-line — grow-only, so the new wrapper's 17-24 px headline is untouched
    [".globalStepFeedbackCopy>b", 18, 15],
    [".tsFinishRewardPayout", 18, 16],
    [".releasePersistentFinalMessage>span", 15, 14],
    ...EOS_READ_BUTTONS.map((s) => [s, 14, 13]),
    ...EOS_READ_COUNTERS.map((s) => [s, 12, 12]),
]
const EOS_READ_MIN = 12 // the catch-all target (§4.1)
// What the floor WRITES for a 12 px target: the harness measures rendered size as font-size × the box's
// scale, and integer offsetWidth/Height (or a 0.99 canvas scale) would read an exact 12 px as 11.7-11.9.
const EOS_READ_FLOOR_PX = 12.5
const EOS_READ_SHORT_PX = 13.5 // the floor for 1-3 glyph counters (see eosReadTargetCompute)
// a raised word is written this much above its 16 / 15 px target, for the same rounding reason (an 88.6 px-wide
// name tag has offsetWidth 89, so an exact 16 px reads 15.9); a word already at its target is left alone
const EOS_READ_WORD_PAD = 0.25
const EOS_READ_BUDGET_MS = 0.8 // a regular pass's element loop (checked after every element); the sweep resumes next frame
const EOS_READ_MO_BUDGET_MS = 1.4 // an MO pass's element loop: new text must be right before its first paint
const EOS_READ_MAX_EL = 400 // §4.4: stop after 400 elements
const EOS_READ_CHAIN = 12 // a sweep with work left continues on the next frames, at most this many in a row
const EOS_READ_HOLD_MS = 350 // a scaled box must keep the same scale (±1 %) this long, two samples, to be compensated
const EOS_READ_RECHECK_MAX = 4 // queued re-checks (a class changed on / above a raised element) per pass
const EOS_READ_FIRST = ".globalFeedbackCopyLayer, .releaseCompleteOverlay, .tsShiftRewardHud, .engineProgressHud, .globalPlayGuide"
const EOS_READ_MO_MAX = 160 // new text elements one MutationObserver callback looks at (the regular pass does the rest)
const EOS_READ_RELIST_MS = 5000 // the sweep list (appended to by the MO) is re-collected at least this often
// where the floor looks: the stage (games, reveal, idle story), the header and the open game menu
const EOS_READ_SCOPES = [".releaseStage", ".releaseConsoleHeader", ".releaseChoiceMenu"]
const EOS_READ_SCOPE_SEL = EOS_READ_SCOPES.join(", ")
const EOS_READ_ACTIVE = /(^|\s)stage-(play|reveal)(\s|$)/ // root classes in which the floor works (+ an open menu)
// subtrees the floor never touches (burst particles, SVG in a viewBox, our arrow layer)
const EOS_READ_SKIP = '[hidden],.eosSrOnly,.eosArrowLayer,.tsRewardSurge,script,style,noscript,svg'
// aria-hidden subtrees are decoration — except text a target row names: the wrappers draw each thought a second
// time as an aria-hidden name tag (.tsBubbleTextContainer: CLEANSE, the new-wrapper bubbles, 8.5 / 7.5 px today)
// beside the accessible, visually hidden source span, and some art carries real labels (DOOR A / B's "OR")
const EOS_READ_HIDDEN = '[aria-hidden="true"]'
const EOS_READ_OWN = /(^|\s)eos[A-Z]/
const EOS_READ_TEXT = /[\p{L}\p{N}]/u

// Target index: every selector is filed under the class / tag / [class*=…] key of its rightmost compound,
// so a text element and its ancestors only run matches() against the few selectors that could apply.
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
        // the element's ancestor chain — a cheap pre-filter before matches()
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
    tagged: new Map(), // element we raised → { px, v (the exact inline value we wrote), natural, scaled, tr }
    orig: new WeakMap(), // el → [inline value, priority] before our first write
    scaleSeen: new WeakMap(), // el → { s, since } — a scale must hold EOS_READ_HOLD_MS before we compensate it
    recheckQ: new Set(), // raised elements to re-check (a class changed on them / an ancestor, a resize)
    list: null, // the sweep's text elements (null = re-collect: the DOM changed)
    listAt: 0,
    ctx: null, // last regular-pass context (MO passes reuse it: they must never force a layout)
    k: 1, // last measured canvas scale
    cursor: 0,
    rr: 0, // round-robin position of the slow background re-check
    passes: 0,
    stats: null,
}
// diagnostics: elements that alone took > 2 ms in a pass's loop (first 30 after reset)
function eosReadSlow(el, ms) {
    const l = EOS_READ_STATE.stats.slowEls
    if (l.length < 30) l.push([Math.round(ms * 10) / 10, eosReadSel(el)])
}
function eosReadStatsZero() {
    return { slowEls: [], passes: 0, lastMs: 0, maxMs: 0, maxOwnMs: 0, flushMaxMs: 0, moPasses: 0, moMaxOwnMs: 0, moCbMaxMs: 0, moCbs: 0, over2: 0, ownOver2: 0, log: [], totalMs: 0, ownTotalMs: 0, writes: 0, lowered: 0, scaled: 0, unfloored: 0, dropped: 0, seen: 0, capped: 0 }
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
// Pass context. A regular pass (style + layout already flushed) measures it; an MO pass reuses the last one
// so it never forces a layout of its own (the canvas scale and the breakpoint do not change between frames).
function eosReadCtx(root, reuse) {
    const S = EOS_READ_STATE
    const now = performance.now()
    if (reuse && S.ctx && S.ctx.root === root) return { ...S.ctx, now }
    // no regular pass yet (or after a resize): an MO pass takes the breakpoint from the viewport and the last
    // known canvas scale, and leaves the exact numbers to the regular pass that follows it
    const phone = reuse ? (typeof innerWidth === "number" ? innerWidth : 9999) <= 560 : eosReadPhone(root)
    const wordPx = eosReadWordPx(root, phone)
    // the Framer canvas scale: compensated between .5 and 1 (a zoomed-out editor canvas must not get 4× text;
    // a zoomed-in one needs no help)
    const k = reuse ? S.k || 1 : (S.k = Math.max(0.5, Math.min(1, eosStageScale(root) || 1)))
    const ctx = { root, phone, wordPx, wordBase: phone ? 15 : 16, k, idx: eosReadIndex(), stop: root, key: (phone ? "p" : "d") + wordPx, now }
    if (!reuse) S.ctx = ctx
    return ctx
}
// the target (CSS px, before the canvas scale) for one text element; words report kind "word" so the caller
// can apply the small-object rule. Cached per element: the match only changes with the element's or its
// parent's class, its text length bucket (1 / ≤ 3 / more glyphs) or the phone breakpoint / Bubble Text prop.
const EOS_READ_TCACHE = new WeakMap()
function eosReadTargetFor(el, ctx) {
    const p = el.parentElement
    const len = (el.textContent || "").trim().length
    const sig = ctx.key + "|" + (len === 1 ? 1 : len <= 3 ? 3 : 9) + "|" + (el.getAttribute("class") || "") + "|" + ((p && p.getAttribute("class")) || "")
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
    let row = false // some table row names this text (a counter like DOOR A / B's "OR" can sit in aria-hidden art)
    const cand = []
    // the element itself or an ancestor matches a row (words: any depth inside the stage; others: ≤ 2 levels)
    for (let depth = 0; depth < chain.length; depth++) {
        const n = chain[depth]
        cand.length = 0
        eosReadCandidates(n, ctx.idx, cand)
        for (const e of cand) {
            if (!e.word && depth > 2) continue
            const want = e.word ? ctx.wordPx : ctx.phone ? e.p : e.d
            if (want <= t && row) continue
            if (e.need && !e.need.some((k) => cls.has(k))) continue
            if (e.needSub && !e.needSub.some((k) => str.includes(k))) continue
            let hit = false
            try {
                hit = n.matches(e.sel)
            } catch {}
            if (hit) {
                row = true
                if (want > t) {
                    t = want
                    word = e.word
                }
            }
        }
    }
    // one to three glyphs ("3", "×2", "OK") at the 12 px floor get 13.5: the harness measures rendered size as
    // font-size × rect.width / offsetWidth, and a 6.6 px-wide digit rounds to offsetWidth 7 (an exact 12.5 reads 11.8)
    if (!word && t <= EOS_READ_FLOOR_PX) {
        const len = (el.textContent || "").trim().length
        if (len > 0 && len <= 3) t = EOS_READ_SHORT_PX
    }
    // the same rounding hits a one-letter word ("I" is 4.6 px wide at 15 px): +2 px keeps it measurably ≥ 15 / 16
    let short = false
    if (word && (el.textContent || "").trim().length === 1) short = true
    return { px: t, word, short, row }
}
function eosReadSkipped(el, named) {
    if (el.closest(EOS_READ_SKIP)) return true
    if (!named && el.closest(EOS_READ_HIDDEN)) return true
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
// scale of one node's own transform / scale / zoom along its NARROWER axis (a word squashed to scaleY .6 reads as
// .6 tall — the harness measures it that way too); taken from the matrix columns, so a rotation (UNHOOK's vertical
// "BIG HOOK" label) is never mistaken for a shrink
function eosReadOwnScale(cs) {
    let s = 1
    const t = cs.transform
    if (t && t !== "none") {
        const m = t.match(/matrix(3d)?\(([^)]+)\)/)
        if (m) {
            const v = m[2].split(",").map(Number)
            if (m[1]) s *= Math.min(Math.hypot(v[0], v[1], v[2]), Math.hypot(v[4], v[5], v[6]))
            else s *= Math.min(Math.hypot(v[0], v[1]), Math.hypot(v[2], v[3]))
        }
    }
    const sc = cs.scale
    if (sc && sc !== "none") {
        const v = sc.split(/\s+/).map(Number)
        s *= v.length > 1 ? Math.min(Math.abs(v[0]), Math.abs(v[1])) : Math.abs(v[0])
    }
    const z = Number(cs.zoom)
    if (Number.isFinite(z) && z > 0) s *= z
    return Number.isFinite(s) && s > 0 ? s : 1
}
// exact scale of `el` relative to the arcade root (rotation-free: see eosReadOwnScale), memoised per pass for every
// node of the walked chain. Whether a scale is a held state or a moment of an animation is decided by the caller's
// two-sample hold (the same scale twice, EOS_READ_HOLD_MS apart): an entrance pop or a shrink-away changes scale
// between samples and is never compensated. (The first build also asked document.getAnimations() whether a box was
// animating; that call alone cost 5-6 ms per pass with the ~120 animations of a game screen, so it is gone.)
function eosReadChainScale(el, root, memo) {
    const chain = []
    let s = 1
    for (let n = el; n && n !== root && n.nodeType === 1; n = n.parentElement) {
        const hit = memo.get(n)
        if (hit !== undefined) {
            s = hit
            break
        }
        chain.push(n)
    }
    // fold from the top of the walked chain down, memoising every node's cumulative scale
    for (let i = chain.length - 1; i >= 0; i--) {
        const n = chain[i]
        s *= eosReadOwnScale(getComputedStyle(n))
        memo.set(n, s)
    }
    return memo.has(el) ? memo.get(el) : s
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
// the sweep list, re-collected only after the DOM changed (or every EOS_READ_RELIST_MS as a safety net)
function eosReadList(root, now) {
    const S = EOS_READ_STATE
    if (!S.list || now - S.listAt > EOS_READ_RELIST_MS) {
        S.list = eosReadCollect(eosReadScopes(root))
        S.listAt = now
        // forget raised elements React has unmounted (no references kept to dead nodes)
        for (const el of S.tagged.keys()) if (!el.isConnected) S.tagged.delete(el)
        for (const el of S.recheckQ) if (!el.isConnected) S.recheckQ.delete(el)
    }
    return S.list
}

// ---- writes. Our value is an inline `font-size: Npx !important`; React only rewrites an inline font-size when
// its own value changes, which replaces ours — then the element is simply forgotten and re-measured.
function eosReadIsOurs(el, rec) {
    return el.style.getPropertyValue("font-size") === rec.v && el.style.getPropertyPriority("font-size") === "important"
}
// remove our write and restore whatever inline value the element had before
function eosReadRestore(el) {
    const o = EOS_READ_STATE.orig.get(el)
    if (o && o[0]) el.style.setProperty("font-size", o[0], o[1])
    else el.style.removeProperty("font-size")
}
function eosReadForget(el, restore) {
    const S = EOS_READ_STATE
    const rec = S.tagged.get(el)
    if (restore && rec && eosReadIsOurs(el, rec)) eosReadRestore(el)
    S.tagged.delete(el)
    S.recheckQ.delete(el)
    el.removeAttribute("data-eos-floor")
}
// does a transition run on this element's font-size (transition: all / font / font-size with a duration)?
// A word must never break inside itself ("yelle|d at", "pani|c"): many bubbles are 60-80 px on phones and the
// arcade sets overflow-wrap:anywhere. When the widest single word of a word element would not fit its box at the
// target size, the target steps down to the largest size that fits — never below EOS_READ_WORD_FIT_MIN rendered
// px (§4.1 allows 14 inside objects ≤ 96 px) and never below the element's own size today. Only in-flow, wrapping
// elements in small boxes (≤ 220 px) are measured — words by canvas measureText in the element's font, the box
// from its parent's content width and its own max-width (layout is clean in a regular pass) — and cached.
const EOS_READ_WORD_FIT_MIN = 13
const EOS_READ_FIT_CACHE = new WeakMap() // el → [key, result]: the same text, size and box give the same answer
let eosReadMeasureCtx = null
// width of `word` in CSS px at `px` with the element's font (a 2D canvas: no layout, no transforms, no Ranges)
function eosReadTextWidth(cs, word, px) {
    try {
        if (!eosReadMeasureCtx) eosReadMeasureCtx = document.createElement("canvas").getContext("2d")
        const c = eosReadMeasureCtx
        if (!c) return 0
        c.font = `${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`
        const t = cs.textTransform === "uppercase" ? word.toUpperCase() : cs.textTransform === "lowercase" ? word.toLowerCase() : word
        const ls = parseFloat(cs.letterSpacing) || 0 // computed in px at the current size: scale it with the size
        const fs = parseFloat(cs.fontSize) || px
        return c.measureText(t).width + (ls * px * t.length) / fs
    } catch {
        return 0
    }
}
function eosReadWordFit(el, cs, fs, nat, want, ratio) {
    if (!(fs > 0) || want <= nat + 0.25) return want
    if (cs.position === "absolute" || cs.position === "fixed" || cs.whiteSpace === "nowrap" || cs.whiteSpace === "pre") return want
    const p = el.parentElement
    if (!p) return want
    const text = el.textContent || ""
    const key = text + "|" + fs + "|" + nat + "|" + want + "|" + p.clientWidth + "|" + cs.maxWidth + "|" + Math.round(ratio * 10)
    const hit = EOS_READ_FIT_CACHE.get(el)
    if (hit && hit[0] === key) return hit[1]
    let res = want
    const num = (v) => parseFloat(v) || 0
    const pcs = getComputedStyle(p)
    let avail = p.clientWidth - num(pcs.paddingLeft) - num(pcs.paddingRight)
    const mw = cs.maxWidth
    if (mw && mw !== "none") avail = Math.min(avail, mw.endsWith("%") ? (avail * parseFloat(mw)) / 100 : num(mw))
    if (cs.display !== "inline") avail -= num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) + Math.max(0, num(cs.marginLeft)) + Math.max(0, num(cs.marginRight))
    if (avail > 0 && avail <= 220) {
        let widest = 0
        for (const w of text.split(/\s+/)) if (w) widest = Math.max(widest, eosReadTextWidth(cs, w, want))
        if (widest > avail - 1) {
            const fit = (want * (avail - 1)) / widest
            res = Math.max(nat, Math.min(want, Math.max(fit, EOS_READ_WORD_FIT_MIN / (ratio > 0 ? ratio : 1))))
        }
    }
    EOS_READ_FIT_CACHE.set(el, [key, res])
    return res
}
function eosReadTransitions(cs) {
    const props = String(cs.transitionProperty || "").split(",")
    const durs = String(cs.transitionDuration || "0s").split(",")
    for (let i = 0; i < props.length; i++) {
        const p = props[i].trim()
        if ((p === "all" || p === "font" || p === "font-size") && parseFloat(durs[i % durs.length]) > 0) return true
    }
    return false
}
function eosReadWrite(el, px, natural, scaled, tr) {
    const S = EOS_READ_STATE
    let had = S.tagged.get(el)
    if (had && !eosReadIsOurs(el, had)) had = null // someone (React) replaced our value since
    if (!had) S.orig.set(el, [el.style.getPropertyValue("font-size"), el.style.getPropertyPriority("font-size")])
    el.style.setProperty("font-size", px.toFixed(2) + "px", "important")
    const v = el.style.getPropertyValue("font-size") // as the browser serialises it ("12.5px"), for eosReadIsOurs
    el.setAttribute("data-eos-floor", px.toFixed(1))
    S.tagged.set(el, { px, v, natural: had ? had.natural : natural, scaled, tr: had ? had.tr : !!tr })
    S.stats.writes++
}
// Re-check raised elements: where the game's own size has meanwhile grown past ours (a later state, a "big"
// class, a media query), our inline value is removed — it can never hold text smaller than the game wants.
// Batched: restore all → read all (one small style recalc of just these elements) → put back the ones still needed.
function eosReadRecheck(els) {
    const S = EOS_READ_STATE
    const keep = []
    for (const el of els) {
        S.recheckQ.delete(el)
        const rec = S.tagged.get(el)
        if (!rec) continue
        if (!el.isConnected) {
            S.tagged.delete(el)
            continue
        }
        if (!eosReadIsOurs(el, rec)) {
            eosReadForget(el, false)
            S.stats.dropped++
            continue
        }
        keep.push([el, rec])
    }
    if (!keep.length) return 0
    // an element that transitions font-size would animate the restore → re-put dip: freeze its transitions for
    // the measurement and commit the re-put before they come back
    const frozen = []
    for (const [el, rec] of keep)
        if (rec.tr) {
            frozen.push([el, el.style.getPropertyValue("transition"), el.style.getPropertyPriority("transition")])
            el.style.setProperty("transition", "none", "important")
        }
    for (const [el] of keep) eosReadRestore(el)
    for (const [el, rec] of keep) {
        const fs = parseFloat(getComputedStyle(el).fontSize) || 0
        if (fs >= rec.px - 0.25) {
            S.tagged.delete(el)
            el.removeAttribute("data-eos-floor")
            S.stats.unfloored++
        } else {
            rec.natural = fs
            el.style.setProperty("font-size", rec.v, "important") // exactly as it was: no visible change
        }
    }
    if (frozen.length) {
        for (const [el] of frozen) void getComputedStyle(el).fontSize
        for (const [el, v, pr] of frozen) {
            if (v) el.style.setProperty("transition", v, pr)
            else el.style.removeProperty("transition")
        }
    }
    return keep.length
}
// raised elements that sit on / under an element whose class just changed (one ancestor walk each)
function eosReadAffected(targets) {
    const S = EOS_READ_STATE
    const out = []
    if (!targets.size || !S.tagged.size) return out
    for (const el of S.tagged.keys()) {
        for (let n = el, d = 0; n && d < 24; n = n.parentElement, d++)
            if (targets.has(n)) {
                out.push(el)
                break
            }
    }
    return out
}

// One floor pass. list = elements to look at (null = sweep the scopes; fromMo = new nodes, before their first
// paint: style reads only, never a layout). The pass first brings what it reads up to date — a regular pass runs
// right after a frame, where `root.offsetWidth` is free; an MO pass reads the new nodes' font sizes, i.e. the style
// recalc the coming frame does anyway — and reports that separately as `flush`. Its element loop is time-boxed
// (EOS_READ_BUDGET_MS / EOS_READ_MO_BUDGET_MS, checked after every element) and a sweep resumes where it stopped;
// whatever an MO pass leaves is picked up by the regular pass it schedules. Returns {more, retry}: more =
// work left (sweep not finished, queued re-checks) → continue next frame; retry = a scaled box has not settled yet
// → look again shortly.
function eosReadPass(root, opts) {
    const S = EOS_READ_STATE
    if (!root || !root.isConnected) return { more: false, retry: false }
    const fromMo = !!(opts && opts.fromMo)
    const list = (opts && opts.list) || null
    const t0 = performance.now()
    let pre = null
    if (fromMo) {
        pre = new Map()
        if (list) for (const el of list) if (el.isConnected) pre.set(el, getComputedStyle(el).fontSize)
    } else void root.offsetWidth
    const t1 = performance.now()
    const ctx = eosReadCtx(root, fromMo)
    const tc = performance.now()
    const els = list || eosReadList(root, t1)
    const tl = performance.now()
    const n = els.length
    const writes = []
    const lowers = []
    const memo = new Map()
    const big = (EOS_READ_FLOOR_PX / ctx.k) * 1.5 // ≥ this a box would need a < .67 scale to drop below 12
    const bigWord = (ctx.wordBase + EOS_READ_WORD_PAD) / ctx.k / 0.6 // the same for a word (scales < .6 are never compensated)
    const start = list ? 0 : S.cursor % Math.max(1, n)
    const lim = Math.min(n, EOS_READ_MAX_EL)
    let i = 0
    let retry = false
    const budget = fromMo ? EOS_READ_MO_BUDGET_MS : EOS_READ_BUDGET_MS
    let prevEl = null
    let prevT = tl
    for (; i < lim; i++) {
        const now = performance.now()
        if (prevEl && now - prevT > 2) eosReadSlow(prevEl, now - prevT)
        if (i && now - tl > budget) break
        const el = els[(start + i) % n]
        prevEl = el
        prevT = now
        if (!el.isConnected || el instanceof SVGElement) continue
        let rec = S.tagged.get(el)
        if (rec && !eosReadIsOurs(el, rec)) {
            eosReadForget(el, false)
            S.stats.dropped++
            rec = null
        }
        const cs = getComputedStyle(el)
        const fs = parseFloat(pre ? pre.get(el) : cs.fontSize) || 0
        if (fs >= 40 && !rec) continue
        const tg = eosReadTargetFor(el, ctx)
        let want = tg.px / ctx.k
        if (fromMo) {
            if (tg.word) want = Math.min(want, ctx.wordBase / ctx.k) // the regular pass decides on bigger words
            if (tg.short) want += 2 / ctx.k
            if (tg.word) want += EOS_READ_WORD_PAD / ctx.k
            if (fs >= want - 0.25) continue
            if (cs.display === "none" || cs.visibility === "hidden" || eosReadSkipped(el, tg.row)) continue
            writes.push([el, want, fs, null, eosReadTransitions(cs)])
            continue
        }
        if (!rec && fs >= want - 0.25 && fs >= (tg.word ? bigWord : big)) continue
        // a layout read (clean after the flush): is the box drawn smaller than its CSS size (a scaled object)?
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        const ow = el.offsetWidth
        const oh = el.offsetHeight
        // narrower axis, like the harness (a rotated box reads small here; the exact chain scale below clears it)
        const quick = Math.min(ow ? r.width / ow : 1, oh ? r.height / oh : 1) / ctx.k
        if (tg.word && tg.px > ctx.wordBase) {
            // words inside small objects (≤ 96 px) keep the base size; the Bubble Text prop raises the rest
            const op = el.offsetParent
            if (op && op.offsetWidth <= 96 && op.offsetHeight <= 96) want = ctx.wordBase / ctx.k
        }
        if (tg.short) want += 2 / ctx.k
        if (tg.word) want += EOS_READ_WORD_PAD / ctx.k
        let scaled = null
        if (quick < 0.97 && rec && rec.scaled && Math.abs(eosReadChainScale(el, root, memo) - rec.scaled) < 0.02) {
            // still drawn at the scale we compensated: keep it (no flicker while something animates nearby)
            want = Math.max(want, rec.px)
            scaled = rec.scaled
        } else if (quick < 0.97) {
            const sc = eosReadChainScale(el, root, memo)
            const seen = sc < 0.97 ? S.scaleSeen.get(el) : null // ≥ .97: integer offset rounding or a rotation
            const same = seen && Math.abs(seen.s - sc) < 0.01
            if (!same && sc < 0.97) S.scaleSeen.set(el, { s: sc, since: ctx.now })
            // compensate only a scale that has held still (EOS_READ_HOLD_MS, two samples: a shelved card, a parked
            // object, a tube drawn small) — never a moment of an entrance pop or a shrink-away mechanic
            const held = same && ctx.now - seen.since >= EOS_READ_HOLD_MS
            if (!held && sc >= 0.6 && sc < 0.97) retry = true // look again once it may have settled
            if (held && sc >= 0.6 && sc < 0.97) {
                // words are compensated up to their own floor (they must RENDER at 16 / 15 px), the rest to 12
                let need = (tg.word ? ctx.wordBase + EOS_READ_WORD_PAD : EOS_READ_FLOOR_PX) / (sc * ctx.k)
                if (tg.short) need += 2 / (sc * ctx.k)
                if (need > want) {
                    want = need
                    scaled = sc
                }
            }
        }
        if (tg.word) want = eosReadWordFit(el, cs, fs, rec ? rec.natural : fs, want, quick * ctx.k)
        // a raised element follows its current target back down — a scale that ended, a canvas zoom, a breakpoint,
        // a smaller Bubble Text, a word that would break — but never below its own natural size (so never below today)
        if (rec && want < rec.px - 0.25) {
            lowers.push([el, want, rec])
            continue
        }
        if (fs >= want - 0.25) continue
        if (cs.display === "none" || cs.visibility === "hidden") continue
        if (eosReadSkipped(el, tg.row)) continue
        // no opacity skip: text that is fading in (a reveal card, a feedback line) must already be readable
        // when it becomes visible; growing a transparent label is harmless
        writes.push([el, want, fs, scaled, eosReadTransitions(cs)])
    }
    const tz = performance.now()
    if (prevEl && i >= lim && tz - prevT > 2) eosReadSlow(prevEl, tz - prevT)
    let more = false
    if (!list) {
        if (i < lim) {
            S.stats.capped++
            more = true
        }
        S.cursor = n ? (start + i) % n : 0
        // re-checks before our writes (their style recalc then touches only the restored elements); a few per
        // pass, the rest on the next frames
        const used = tz - t1
        const q = []
        if (used < EOS_READ_BUDGET_MS * 1.5)
            for (const el of S.recheckQ) {
                q.push(el)
                if (q.length >= EOS_READ_RECHECK_MAX) break
            }
        if (!q.length && used < EOS_READ_BUDGET_MS * 0.6 && S.tagged.size && S.passes % 2 === 1) {
            // slow background re-check, 2 raised elements every other pass (catches what no class change announced)
            const all = Array.from(S.tagged.keys())
            for (let k = 0; k < Math.min(2, all.length); k++) q.push(all[(S.rr + k) % all.length])
            S.rr = (S.rr + 2) % Math.max(1, all.length)
        }
        if (q.length) eosReadRecheck(q)
        if (S.recheckQ.size) more = true
    }
    for (const [el, want, rec] of lowers) {
        if (want <= rec.natural + 0.25) eosReadForget(el, true)
        else eosReadWrite(el, want, rec.natural, null, rec.tr)
        S.stats.lowered++
    }
    for (const [el, want, fs, scaled, tr] of writes) {
        eosReadWrite(el, want, fs, scaled, tr)
        if (scaled) S.stats.scaled++
    }
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
        st.moMaxOwnMs = Math.max(st.moMaxOwnMs, own)
    } else st.maxMs = Math.max(st.maxMs, ms)
    if (ms > 2) st.over2++
    if (own > 2) st.ownOver2++
    const r2 = (v) => Math.round(v * 100) / 100
    if (st.log.length < 600) st.log.push([fromMo ? 1 : 0, r2(own), r2(t1 - t0), i, writes.length, r2(tc - t1), r2(tl - tc), r2(tz - tl), r2(t2 - tz), n, Math.round(t0)])
    return { more, retry }
}

// Read-only report for the harness (window.__eos.readability.scan → eos_drive.smallText): every visible text
// element rendered below its target (rendered px = computed size × its box scale, as the harness measures;
// SVG text = bbox height ÷ canvas scale). Never writes.
function eosReadScan(rootIn) {
    const out = []
    try {
        const root = rootIn || (typeof document !== "undefined" ? document.querySelector(".tsArcade") : null)
        if (!root) return out
        const ctx = eosReadCtx(root, false)
        const memo = new Map()
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
            if (el.closest("[hidden],.eosSrOnly,.tsRewardSurge")) continue
            const hidden = !!el.closest(EOS_READ_HIDDEN) // decoration, unless it draws the user's words
            if (eosReadOpacity(el, null) < 0.2) continue
            if (el instanceof SVGElement) {
                if (hidden) continue
                const px = Math.round((r.height / ctx.k) * 10) / 10
                if (px < EOS_READ_MIN - 0.05) add(el, px, EOS_READ_MIN, "svg")
                continue
            }
            const fs = parseFloat(cs.fontSize) || 0
            let sk = el.offsetWidth > 0 && el.offsetHeight > 0 ? Math.min(r.width / el.offsetWidth, r.height / el.offsetHeight) : 1
            if (!Number.isFinite(sk) || sk <= 0) sk = 1
            // a box drawn narrower than its layout size: take the exact transform-chain scale instead, so a rotated
            // label (UNHOOK's vertical "BIG HOOK") is not reported as tiny (the bbox ratio of a 90° turn is ~.28)
            if (sk < 0.97) sk = Math.min(1, eosReadChainScale(el, root, memo) * ctx.k)
            const px = Math.round(fs * sk * 10) / 10
            let target = EOS_READ_MIN
            const tg = eosReadTargetFor(el, ctx)
            if (hidden && !tg.row) continue
            if (!eosReadSkipped(el, tg.row)) target = tg.word ? ctx.wordBase : tg.px > EOS_READ_FLOOR_PX ? tg.px : EOS_READ_MIN
            if (px < target - 0.3) add(el, px, target, target > EOS_READ_MIN ? "target" : "floor")
        }
        for (const g of groups.values()) out.push(g)
    } catch (e) {
        out.push({ text: "scan failed: " + e, px: 0, sel: "", zone: "error" })
    }
    return out.sort((a, b) => a.px - b.px)
}

// a class change only adds work when it adds a class some target row keys on (.tsExactUserText, .potatoWord …);
// state toggles like isHit / hot / active only matter for elements we already raised (eosReadAffected)
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
// stage-play, stage-reveal and stage-input while the game menu is open: right after a frame (style and layout
// are clean then), every 900 ms, 250 ms after a pointerup, after a resize, and — for DOM additions (a feedback
// line, a re-mounted control) — in one pre-paint pass per frame, i.e. before that text is first painted (no flash
// of tiny text). A class change on / above a raised element queues it for a re-check by the next after-frame
// pass (a game state that wants that text bigger gets it one frame later, never smaller).
function EosTextFloor({ stage }) {
    const ref = React.useRef(null)
    const kickRef = React.useRef(null)
    // One observer for the component's life: whether the floor works is read from the arcade root's live class
    // (stage-play / stage-reveal) or an open game menu — never from a render-time closure — so the commit that
    // switches the stage AND mounts the game is floored by that same MutationObserver callback, before its first
    // paint (an effect keyed on `stage` would only start after that paint).
    React.useEffect(() => {
        const marker = ref.current
        const root = marker && marker.closest ? marker.closest(".tsArcade") : null
        if (!root || typeof MutationObserver === "undefined") return
        const S = EOS_READ_STATE
        let alive = true
        let queued = false
        let chain = 0 // continuation passes in a row (work left after the time box)
        let cont = false
        let retryAt = 0 // a settle re-look is scheduled
        const timers = new Set()
        const active = () => EOS_READ_ACTIVE.test(root.className) || !!root.querySelector(".releaseChoiceMenu")
        const run = () => {
            queued = false
            if (!alive) return
            const isCont = cont
            cont = false
            chain = isCont ? chain + 1 : 0
            let r = null
            try {
                if (active()) r = eosReadPass(root)
            } catch {}
            if (r && r.more && chain < EOS_READ_CHAIN) {
                cont = true
                soon()
            } else if (r && r.retry && !retryAt) {
                retryAt = 1
                later(EOS_READ_HOLD_MS + 50)
            }
        }
        // right after the next frame has rendered: style + layout are clean, so reading them is cheap. A message on
        // a private channel is the first task after the frame (a 0 ms timeout can queue behind the game's own
        // timers, which dirty the layout again and turn the pass's first read into a forced reflow)
        const mc = typeof MessageChannel === "function" ? new MessageChannel() : null
        if (mc) mc.port1.onmessage = () => run()
        const soon = () => {
            if (queued || !alive) return
            queued = true
            const go = () => {
                if (!alive) return
                if (mc) {
                    mc.port2.postMessage(0)
                    return
                }
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
                retryAt = 0
                soon()
            }, ms)
            timers.add(t)
        }
        // New text found by the MO is floored right in the MO callback. It is a microtask, so it always runs before
        // the next paint: the text is painted at its floor size from its first frame. (A requestAnimationFrame asked
        // for from here would be a frame late whenever the commit itself ran inside a rAF callback — framer-motion's
        // frame loop, the wrappers' re-tagging — and the measurement harness, at ~3 fps, sees that frame.) Its one
        // style read is the recalc that frame does anyway; the loop is time-boxed and the regular pass that follows
        // adds the layout-aware parts (scaled objects) and anything past the budget.
        const mo = new MutationObserver((recs) => {
            if (!alive) return
            const c0 = performance.now()
            let structural = false
            for (const r of recs)
                if (r.type === "childList") {
                    structural = true
                    break
                }
            if (!active()) {
                if (structural) S.list = null // re-collected when the floor is active again
                return
            }
            try {
                // 1. raised elements on / under a class change: re-checked by the next after-frame pass (style is clean
                // there, so restore → read recalculates only those elements); until then they keep the floor size
                if (S.tagged.size) {
                    const changed = new Set()
                    for (const r of recs) if (r.type === "attributes") changed.add(r.target)
                    const hit = eosReadAffected(changed)
                    if (hit.length) {
                        for (const el of hit) S.recheckQ.add(el)
                        soon()
                    }
                }
                // 2. new text: short-lived copy (a hit's feedback line, the finish card, the reveal) first — it is on
                // screen for about a second — then re-mounted words and controls
                const done = new Set()
                const seen = new Set()
                const first = []
                const rest = []
                for (const r of recs) {
                    if (seen.size >= EOS_READ_MO_MAX) break
                    const nodes = r.type === "attributes" ? (eosReadClassGain(r) && r.target.childElementCount <= 24 && !done.has(r.target) ? [r.target] : []) : r.addedNodes
                    for (const node of nodes) {
                        done.add(node)
                        const el = node.nodeType === 1 ? node : node.nodeType === 3 ? node.parentElement : null
                        if (!el || !el.isConnected) continue
                        if (el.closest(EOS_READ_SKIP) || !el.closest(EOS_READ_SCOPE_SEL)) continue
                        const bucket = el.closest(EOS_READ_FIRST) || (node.nodeType === 1 && node.querySelector(EOS_READ_FIRST)) ? first : rest
                        for (const t of node.nodeType === 3 ? [el] : eosReadCollect([el], EOS_READ_MO_MAX))
                            if (!seen.has(t)) {
                                seen.add(t)
                                bucket.push(t)
                            }
                        if (seen.size >= EOS_READ_MO_MAX) break
                    }
                }
                if (seen.size) {
                    // the sweep list keeps up by appending (game DOM churns constantly — particles, trails — and a
                    // full re-collect on every change would eat each pass's budget); a capped batch re-collects, and
                    // removed nodes are skipped and pruned at the periodic re-collect
                    if (seen.size >= EOS_READ_MO_MAX) S.list = null
                    else if (S.list) for (const t of seen) S.list.push(t)
                    eosReadPass(root, { list: first.length ? first.concat(rest) : rest, fromMo: true })
                    soon()
                }
            } catch {}
            const st = S.stats
            st.moCbs++
            st.moCbMaxMs = Math.max(st.moCbMaxMs, Math.round((performance.now() - c0) * 1000) / 1000)
        })
        // class changes too: the wrappers tag a re-mounted word with .tsExactUserText (and a smaller size) after
        // React mounts it, and game states toggle classes that change sizes — both are caught before the paint
        mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true })
        const onUp = () => later(250)
        const onResize = () => {
            S.ctx = null
            for (const el of S.tagged.keys()) S.recheckQ.add(el) // a media query may now want some text bigger
            later(120)
        }
        root.addEventListener("pointerup", onUp, true)
        if (typeof window !== "undefined") window.addEventListener("resize", onResize)
        // a stage change: sweep from the top (the MO already floored the new stage's text before its first paint)
        kickRef.current = () => {
            S.cursor = 0
            S.list = null
            soon()
            ;[300, 700].forEach(later)
        }
        kickRef.current()
        const iv = setInterval(soon, 900)
        return () => {
            alive = false
            kickRef.current = null
            clearInterval(iv)
            for (const t of timers) clearTimeout(t)
            root.removeEventListener("pointerup", onUp, true)
            if (typeof window !== "undefined") window.removeEventListener("resize", onResize)
            mo.disconnect()
            if (mc) {
                mc.port1.onmessage = null
                mc.port1.close()
                mc.port2.close()
            }
        }
    }, [])
    const firstStage = React.useRef(true)
    React.useEffect(() => {
        if (firstStage.current) firstStage.current = false
        else if (kickRef.current) kickRef.current()
    }, [stage])
    return <span hidden data-eos="text-floor" ref={ref} />
}

const eosReadRoot = () => (typeof document !== "undefined" ? document.querySelector(".tsArcade") : null)
const EOS_READ_SETTLE = [".globalFeedbackCopyLayer", ".engineProgressHud", ".globalPlayGuide", ".releaseCompleteOverlay"].map((s) => `${s}, ${s} *`).join(", ")
eosExpose("readability", {
    scan: () => eosReadScan(),
    targets: EOS_READ_TARGETS,
    pass: () => {
        const root = eosReadRoot()
        if (root) eosReadPass(root)
        return { ...EOS_READ_STATE.stats, log: undefined }
    },
    stats: () => {
        const st = EOS_READ_STATE.stats
        const r3 = (v) => Math.round(v * 1000) / 1000
        return { ...st, log: undefined, tagged: EOS_READ_STATE.tagged.size, avgMs: st.passes ? r3(st.totalMs / st.passes) : 0, avgOwnMs: st.passes ? r3(st.ownTotalMs / st.passes) : 0 }
    },
    reset: () => {
        EOS_READ_STATE.stats = eosReadStatsZero()
    },
    // per pass (first 600 after reset): [fromMo 0|1, own ms, flush ms, elements looked at, writes, ctx ms, list ms,
    // loop ms, re-check + write ms, list size, page time ms]
    log: () => EOS_READ_STATE.stats.log.slice(),
    // Test hook: headless Chromium renders this UI at ~3 fps and starts CSS animations late, so a measurement right
    // after a hit can land on keyframe 0 of an entrance pop (the feedback card scales in from .54-.78, the finish
    // word from .58 — ~0.2 s in a real browser). settle() jumps the finite animations of the transient copy layers
    // to their end state — what a person sees a moment later — and returns how many it moved. Never called by the
    // product.
    settle: () => {
        let n = 0
        try {
            for (const el of document.querySelectorAll(EOS_READ_SETTLE))
                for (const a of el.getAnimations()) {
                    const t = a.effect && a.effect.getComputedTiming()
                    if (t && Number.isFinite(t.endTime) && (a.currentTime || 0) < t.endTime) {
                        a.currentTime = t.endTime
                        n++
                    }
                }
        } catch {}
        return n
    },
    // test hooks: the floor target (CSS px) the table gives one element / many
    targetOf: (el) => {
        const root = eosReadRoot()
        return root && el ? eosReadTargetCompute(el, eosReadCtx(root, false)) : null
    },
    targetsOf: (els) => {
        const root = eosReadRoot()
        const ctx = root ? eosReadCtx(root, false) : null
        return ctx ? Array.from(els, (el) => eosReadTargetCompute(el, ctx)) : []
    },
})
