# CATALOG AUDIT B: games 56-110

Baseline: `src/00_arcade.jsx` md5 `b9e220c391b7e86bfb46b8c718e7f489` (22,786 lines, commit `485500c`). The last GAMES id is **110** (RAIN OUT), so this audit covers 55 games. I verified every row against the source. I also ran all 55 games live in the Playwright harness with the input "I am panicking about tomorrow" (DOM, font-size and arrow sweep), and ran interaction probes on NET IT, BUBBLE WRAP, WORD SALAD, THE ECHO CHAMBER and SEESAW.

## 0. Routing facts for 56-110 (these differ from the task brief)

- **Ids 56-99 never reach `RoutedGameContent` or `UniqueReleaseEngine`.** `useLegacyGame = Number(selected.id) < 100` (L21773) sends them to `GameEngineLegacy` (L18365), then to `RoutedGameContentLegacy` (L18281).
  - **61 FREEZE** goes to `FreezeLiteralEngine` (L9148) and **71 DEFUSE** goes to `DefuseLiteralEngine` (L9311), because both are in `UNIQUE_HERO_IDS` (L10639).
  - Every other id in 56-99 goes to **`UniqueReleaseEngineLegacy` (L14524) → `switch (game.id)` (L15077) → `case N`**. Engine codes E01-E15 are never consulted for these ids.
- **Ids 100-110 run `GameEngine` (L19395) → `RoutedGameContent` (L18911).**
  - **109** goes to `CleanseEngine` (L6143).
  - **100-108 and 110** are not in `UNIQUE_HERO_IDS`, so they go to **`UniqueReleaseEngine` (L11539) → `switch (game.id)` (L12193) → `case N`**.
  - None of 56-110 reaches an E01-E15 engine or `UniversalToolModeEngine`.
- **Consequences of the engine split:**
  - Ids 56-99 get the legacy HUD: only `GAME PROGRESS · N%`, with no sparks, LVL or XP feedback, and no `.tsDynamicActionCue` arrows.
  - Ids 100-110 get the reward HUD pills and the DOM-injected `.tsDynamicActionCue` (arrow + "VERB TO TARGET") on `.tsThoughtLabelHost` units.
- **Six rounds again.** `cleanEntries` always returns 6 chunks. Every `case` that calls `advance()` repeats the same micro-move 6 times on chunks such as `I / am / panicking / about / tomorrow / I`.
  - Exceptions that finish in one pass (`completeAll`): 81, 89, 91, 93, 94, 95, 97, 98, 99, 100-110.
- **The user's own words are tiny.** In most legacy cases (`W`/`ExactWords` → `.tsExactUserText`), the thought renders at roughly 4-7px: a barely visible "I" on screen. The cause is the Framer prop `bubbleTextPx` (default **4**, L21026, property control L22767), which is fed into `--bubble-text-size` and the engines.
  - 99 ECHO CHAMBER sets `.echoBubbleWord` to `font-size: 4px !important` through a ref (L18222).
  - Other fixed small sizes: `.potatoWord` 10.5px (100), `.rainCloudUnit` text 11px (110), `.uniqControl` 10px, `.literalStatus b/span` 9px (61, 71).
  - Live sweep numbers are in section 1b.
- **Built-in on-screen arrows already exist in 10 of these games:**
  - 87 `.keepDropCueArrow` ↑/↓
  - 93 `.spaceMoveArrow` per tile
  - 95 `.shelfGuideV2` ↑
  - 97 `.xrayDragGuide` →
  - 98 `.magicLeverGuide` ↓
  - 99 `.echoHoldGuide` ↓ (the arrow is wrong for a hold gesture)
  - 100 `.hotPotatoGuide` ↔
  - 101 `.tugDirectionArrow` ←
  - 102 `.ftArrow` → ←
  - 110 `.rainPullHint`

  These are the house style to copy. The other 45 have no arrow pointing at the target.
- **The guide card contradicts the real mechanic in 13 games:**

  | Game | Guide text | Actual mechanic |
  |---|---|---|
  | 63 PATTERN POP | "PREDICT. TAP." | the next portal already glows `.hot`, so there is nothing to predict |
  | 67 TAP OUT | "TAP THE BEAT" | there is no beat; you alternate LEFT/RIGHT ×8 |
  | 74 BUBBLE WRAP | "POP THEM" | cells only pop in strict left-to-right order, and other taps are silently ignored |
  | 85 CONTROL PANEL | "SORT THE CONTROLS" (catalog: CONTROL / INFLUENCE / OUTSIDE) | pick 1 of 5 actions |
  | 90 COIN FLIP | "FLIP. NOTICE YOUR REACTION." | there is no reaction step |
  | 92 SCALE DOWN | "SLIDE IT DOWN" | tap a number |
  | 96 SCRATCH | "SCRATCH. THEN ADD FACTS." | there are no fact chips |
  | 99 ECHO | "HOLD SOURCE" | hold each of 5 bubbles for 5s |
  | 101 TUG | "PULL. LET GO. ×3" | ×6 |
  | 56 COURTROOM | catalog: "create and drag evidence" | one tap |
  | 60 CROP | catalog: "drag handles" | ordered taps |
  | 76 REVERSE | catalog: "swipe reel" | a button ×4 |
  | 61 FREEZE | "FREEZE. SHATTER." | there is no shatter; the word only blurs |

- **The chooser ignores most of these games.** In `chooseRelevantGame` (L21231), only 61 FREEZE and 71 DEFUSE among 56-110 have a `keywordBoost`.
  - The emotion profiles (`RELEASE_INPUT_EMOTION_PROFILES` L10668) never influence game choice.
  - "panicking" does not match the panic regex, so it falls to `general`.

Gesture key (same as catalog A):
- **tap**, **rapid-tap**, **hold**, **drag**, **swipe**, **slingshot-pull**, **trace**, **choose**, **sequence-tap**: as defined in catalog A.
- **timing-tap**: a tap counts only inside a time window.
- **wait**: do not touch.

Speed values assume 6 rounds where a game repeats.

## 1. Catalog rows

| id | name | family | renderer (engine fn + branch) | primary gesture | target CSS the user must touch | best relieves - why (mechanic) | relief speed | fun/clarity 1-5 - concrete weakness | duplicate-of |
|---|---|---|---|---|---|---|---|---|---|
| 56 | COURTROOM | Reframe | `UniqueReleaseEngineLegacy` case 56 L16056 | choose | `.courtTargets button` (PROOF / ASSUMPTION / UNKNOWN) | anxiety, shame/guilt, overthinking - labelling the accusation "assumption" or "unknown" is light CBT evidence-testing | instant ~6s (6 taps) | 2 - the catalog promises user-made evidence cards and dragging; the game is one tap ×6 on single-word chunks (live: an "I" card); `.scales` are static; it reads like a form | 86, 83, 72 |
| 57 | CAMERA ANGLE | Reframe | `UniqueReleaseEngineLegacy` case 57 L16083 | rapid-tap | `button.uniqControl` "ROTATE CAMERA n/3" | overthinking, shame (replaying a scene) - perspective-taking | instant ~12s (18 taps) | 2 - you tap a pill, not the camera; the `view0-2` change is subtle CSS; no "new empty space" payoff | 51, 58, 76 |
| 58 | MICROSCOPE | Reframe | `UniqueReleaseEngineLegacy` case 58 L16098 | rapid-tap | `button.focusKnob` (90px corner dial) ×4 | anxiety, overthinking (fixation on a detail) - the word visibly shrinks (scale 1 → 0.4) | instant ~12s (24 taps) | 3 - real shrink feedback; but the knob is a corner widget, and "one dot among many" is not implemented | 30, 39, 57 |
| 59 | SPOTLIGHT | Reframe | `UniqueReleaseEngineLegacy` case 59 L16120 | drag (\|x\| >110) | `.spotLamp` | anxiety, fear, rumination - attention shifting: move the light, not the object | instant ~10s | 2 - no feedback during or after a failed drag (no sfx); the promised neutral objects never appear; the beam is static | 29, 45, 77 |
| 60 | CROP TOOL | Reframe | `UniqueReleaseEngineLegacy` case 60 L16145 | sequence-tap | `button.cropHandle.h{step}` (32px white squares; the others are disabled) | overwhelm, catastrophising - widening the frame adds context | instant ~15s (24 taps) | 2 - the catalog says drag outward; it is 4 ordered taps; disabled handles look identical to live ones | 14, 17, 51 |
| 61 | FREEZE | Interrupt | `FreezeLiteralEngine` L9148 (hero) | rapid-tap (3 per cube) | `button.freezeWordCube` ×6 | panic, anger, racing thoughts - freezing stops motion; the cold imagery maps to cooling down | instant ~12s (18 taps) | 4 - you tap the word itself, and the 3 ice layers are tactile. "SHATTER" is promised but the word only blurs; `.literalStatus` is 9px with a 40-word paragraph | 16, 41 (catalog A cluster A without the arm step) |
| 62 | NET IT | Interrupt | `UniqueReleaseEngineLegacy` case 62 L16168 | tap (drag is optional and irrelevant) | `button.catchNet` | anxiety - in theory approach and curiosity | instant ~5s | **1** - any click on the net advances, with no collision check (confirmed live); the flying card cannot be "caught"; "slow beats frantic" is not implemented | 72 |
| 63 | PATTERN POP | Interrupt | `UniqueReleaseEngineLegacy` case 63 L16201 | sequence-tap | `.portalRing button.hot` (1 → 2 → 3 → 1 → 2) | overthinking - learnable patterns give a sense of predictability | short ~25s (30 taps) | **1** - "predict" is fake because the answer is lit; a wrong tap silently resets to 0 | 20, 17 |
| 64 | RED LIGHT | Interrupt | `UniqueReleaseEngineLegacy` case 64 L16230 | timing-tap | `button.uniqControl` "STOP ON RED", only while `.trafficLamp.p0` (red) is lit | anger, impulsivity - a real wait-for-the-cue rule trains impulse delay | instant ~15s | 3 - a genuine timing mechanic (850ms red window per 2.55s cycle); early taps only increment an unused `meter`, with no "too early" feedback | 70, 79 |
| 65 | PAUSE BUTTON | Interrupt | `UniqueReleaseEngineLegacy` case 65 L16259 | hold (to ≥95, ~2.4s) | `button.uniqControl` "PRESS & HOLD PAUSE" | panic, anger - a sustained pause is the STOP skill in miniature | instant ~18s | 3 - an early release silently halves the meter; there is no `onPointerLeave`; "everything truly stops" is not implemented (the scene keeps animating) | 13, 39, 109 |
| 66 | BUFFERING | Interrupt | `UniqueReleaseEngineLegacy` case 66 L16277 | wait (3s, no touch) | none; `button.uniqControl` "DON'T PRESS THIS" is the trap | anxiety, urge-to-fix - not acting lets it finish | instant ~20s (6 × 3s) | 2 - six identical waits; the only button invites pressing; nothing (such as a breath cue) fills the wait | **80** |
| 67 | TAP OUT | Rhythm | `UniqueReleaseEngineLegacy` case 67 L16302 | sequence-tap (alternating) | `.tapOutPads button` LEFT / RIGHT | anxiety, panic - bilateral alternating taps (a "butterfly hug" rhythm) are grounding | short ~30s (48 taps) | 2 - no pulse or beat despite the guide; the next side is not highlighted; the "N LETTERS" counter counts down but no letters are removed | 68, 69 |
| 68 | DRUM IT | Rhythm | `UniqueReleaseEngineLegacy` case 68 L16330 | rapid-tap | `.drumKit button` (KICK / SNARE / TOM / CLAP) ×10 | anger, frustration, numbness - high-energy percussion discharges arousal | short ~25s (60 taps) | 3 - all four pads play the same `sfx("tap")`, so there is no real drum feel; the phrase never fractures into glyphs; 60 taps is a grind | 2, 74 |
| 69 | PULSE | Rhythm | `UniqueReleaseEngineLegacy` case 69 L16357 | timing-tap (gaps >650ms) | `button.uniqControl` "TAP THE SLOW PULSE" | **panic**, anxiety - leading a slower tempo entrains slower breathing | short ~25-35s | 3 - the right concept for panic, but the rule is invisible (fast taps just play a different click); the 1.4s pulse is not used for scoring; no inhale/exhale cue | 36, 70 |
| 70 | METRONOME | Rhythm | `UniqueReleaseEngineLegacy` case 70 L16385 | timing-tap (every 2nd beat, 620ms) | `button.uniqControl` while `.metronomeRig b` shows an even BEAT | anger, impulsivity - skipping a beat is inhibition practice | short ~20s (24 taps) | 2 - off-beat taps give only a quiet click with no fail signal; the "bait taps" are not implemented | 64, 79 |
| 71 | DEFUSE | Interrupt | `DefuseLiteralEngine` L9311 (hero) | sequence-tap (3 per word) | `.defuseZone.active button` (OPEN PANEL → CUT BLUE WIRE → PRESS SAFE) | panic, anxiety - "disarm the alarm"; the 3 → 2 → 1 → SAFE countdown gives a felt down-shift | instant ~15s (18 taps) | 4 - clear locked/active zones and a STEPS LEFT counter. Bomb imagery can prime threat; 6 identical 3-step chores; 9px `.literalStatus` | 55 |
| 72 | CATCH & LABEL | Interrupt | `UniqueReleaseEngineLegacy` case 72 L16415 | tap, then choose | `button.uniqControl` "CATCH CARD", then `.labelButtons button` (FACT / STORY / MAYBE) | anxiety, overthinking - affect labelling ("name it to tame it") | instant ~10s (12 taps) | 2 - "catch" is a pill tap wherever the card is; the label changes nothing | 86, 56, 62 |
| 73 | TRAFFIC LIGHT | Interrupt | `UniqueReleaseEngineLegacy` case 73 L16450 | choose | `.signalConsole button.light` (STOP / WAIT / GO) | anger, impulse - pause before acting | instant ~5s | 2 - one tap ×6; the "WAIT slows the vehicle" surprise is not implemented, and there is no lane | 64, 85, 83 |
| 74 | BUBBLE WRAP | Interrupt | `UniqueReleaseEngineLegacy` case 74 L16472 | sequence-tap (12 cells in strict order) | `.bubbleWrapSheet button`, where only cell `i === step` responds | anxiety, stress, frustration - bubble-wrap popping is a universal stim | short ~35s (72 taps) | **2** - out-of-order pops are silently ignored (confirmed live), which kills the joy of free popping; the next cell is unmarked; the words show as a ~5px "I" in 4 of 12 cells | 1 POP |
| 75 | INK BLEED | Release | `UniqueReleaseEngineLegacy` case 75 L16498 | drag (x >150) | `.inkDrop` (42px droplet, bottom-left) | sadness, shame, overthinking - live blur and letter-spacing loosen the sentence (defusion) | instant ~12s | 3 - the live bleed is satisfying; but the drop is small, x-only, and has no direction cue | 7, 49, 34 |
| 76 | REVERSE IT | Interrupt | `UniqueReleaseEngineLegacy` case 76 L16526 | rapid-tap | `button.uniqControl` "REWIND REEL" ×4 | rumination - reversing the loop | instant ~12s (24 taps) | 2 - the catalog says swipe; it is a pill ×4; the effect is a scaleX squash, not backwards glyphs | 57, 2 |
| 77 | SLOW MOTION | Interrupt | `UniqueReleaseEngineLegacy` case 77 L16558 | drag (down >125) | `.brakeHandle` (right edge) | **panic**, racing thoughts - pulling the brake slows the moving phrase, mirroring slowing the mind | instant ~12s | 3 - a good live coupling between pull and speed, but the brake is an unlabelled bar on the far right; the "gaps between words" payoff is not implemented | 29, 36 |
| 78 | ONE WORD | Interrupt | `UniqueReleaseEngineLegacy` case 78 L16590 | choose | `.oneWordField button` | overwhelm - attention narrowing | instant ~5s | **1** - it splits the current chunk, which is usually one word, so the "choice" is a single tiny button (live: one "I" tile); ×6 | 94, 87 |
| 79 | MISS ON PURPOSE | Interrupt | `UniqueReleaseEngineLegacy` case 79 L16621 | tap (avoid `.target`) | `.missPads button:not(.target)` | perfectionism, shame, anxiety - deliberate imperfection | short ~20s (30 taps) | 2 - the big "PERFECTLY IMPERFECT" celebration is not implemented; hitting the target silently resets | 70, 64 |
| 80 | DON'T TAP | Interrupt | `UniqueReleaseEngineLegacy` case 80 L16639 | wait (5s, no touch) | none; `button.uniqControl` "DO NOT TAP" resets the timer | anxiety, compulsion - urge-surfing | short ~30s (6 × 5s) | 2 - 30s of watching a bar; the "needy button" comedy is not implemented | **66** |
| 81 | STACK IT | Balance | `UniqueReleaseEngineLegacy` case 81 L16660 | choose (tap order) | `.blockTray button` ×6 | overwhelm, stress - prioritising | instant ~6s (one pass) | 2 - taps just append blocks; no physics and no instability surprise; with short input the blocks are repeats ("I", "am" … "I") | 91, 94 |
| 82 | SEESAW | Balance | `UniqueReleaseEngineLegacy` case 82 L16691 | tap (nudge, then check) | `.nudgeRow button` (SHIFT → ×5, then CHECK BALANCE) | stress, perfectionism | short ~25s (36 taps) | **1** - it starts fully tilted (meter 0) and needs ±5 precision, which contradicts the "good enough" hook; CHECK fails silently (confirmed live); no drag | 92 |
| 83 | SORT STATION | Sort | `UniqueReleaseEngineLegacy` case 83 L16728 | choose | `.chuteRow button` (NOW / LATER / NOT MINE) | overwhelm, stress | instant ~5s | 2 - one tap ×6; the tube-travel animation is not implemented | 32, 84, 85 |
| 84 | MINE / NOT MINE | Sort | `UniqueReleaseEngineLegacy` case 84 L16746 | swipe (\|x\| >115) | `.ownershipCard` | guilt (over-responsibility), anxiety - a boundary decision | instant ~10s | 3 - a clean binary swipe, but there is no direction arrow and the NOT MINE card is not ejected | 25, 87 |
| 85 | CONTROL PANEL | Sort | `UniqueReleaseEngineLegacy` case 85 L16771 | choose (1 of 5) | `.controlPanelSwitches button` (ACT NOW / PLAN IT / PARK IT / ASK HELP / RELEASE IT) | anxiety, overwhelm - turning a worry into a next action | instant ~8s | 3 - the clearest copy of the choice games, but it does not match the catalog (locus of control); ASK HELP leads nowhere | 32, 83, 73 |
| 86 | FACT / STORY | Sort | `UniqueReleaseEngineLegacy` case 86 L16814 | choose | `.rubberStamps button` (FACT / STORY / UNSURE) | anxiety, overthinking - fact versus story | instant ~6s | 3 - a nice stamp press, but one tap ×6 on one-word chunks ("is 'am' a fact?") | 56, 72 |
| 87 | KEEP / DROP | Choice | `UniqueReleaseEngineLegacy` case 87 L16842 | drag (\|y\| >112) | `.keepDropCard` | overwhelm, rumination | instant ~10s | 4 - the only legacy game with arrows plus a micro-guide (↑ KEEP / ↓ DROP); "kept tokens assemble" is not implemented | 84, 25 |
| 88 | TRADE MACHINE | Choice | `UniqueReleaseEngineLegacy` case 88 L16902 | tap, then choose | `button.coinSlot`, then `.tradeOptions button` (TIME / SPACE / LAUGH) | sadness, jealousy, stress - attention as currency; ends on something wanted | instant ~12s (12 taps) | 3 - rich machine visuals and one of the few positive endings, but the prize is only the text "YOU GOT TIME" | 90 |
| 89 | DOOR A / B | Choice | `UniqueReleaseEngineLegacy` case 89 L16974 | choose ×2 | `button.doorABFrame.door-a`, then `.door-b` | fear, decision anxiety - previewing both options ("information, not destiny") | instant ~8s (one pass) | 3 - beautiful doors, but it only works when the text contains "or" / "vs"; otherwise it cuts the sentence in half ("I am panicking" / "about tomorrow") | - |
| 90 | COIN FLIP REACTION | Choice | `UniqueReleaseEngineLegacy` case 90 L17249 | tap (then watch 2.3s) | `button.coin.realFlipCoin` | stress, indecision | instant ~15s | 2 - there is no reaction step, despite the guide; six identical passive flips | 10, 22, 103 |
| 91 | PRIORITY BLOCKS | Balance | `UniqueReleaseEngineLegacy` case 91 L17367 | drag (any distance) | `.priorityBubbleTray button` ×6 | overwhelm, stress | instant ~8s (one pass) | 2 - the drop location is ignored and any wiggle counts; slots fill in drag order; the overflow tray is not implemented | 81 |
| 92 | SCALE DOWN | Balance | `UniqueReleaseEngineLegacy` case 92 L17419 | choose | `.intensityRuler button` (10 … 1) | any state - an intensity rating (SUDS 1-10) | instant ~6s | 2 - you tap a number 6 times for the same thought; there is no "one step lower" test and no before/after. It is still the only intensity measure in the whole catalog: reuse it as a pre/post wrapper | 37 |
| 93 | SPACE MAKER | Balance | `UniqueReleaseEngineLegacy` case 93 L17469 | drag (≥34px, any direction) | `.spaceTile` ×6 (each with a `.spaceMoveArrow`) | **overwhelm**, anxiety - pushing thoughts outward opens literal empty space around NOW | instant ~8s (one pass) | 4 - direct, any order, an arrow on every tile, fast | 21, 95 |
| 94 | JUGGLE | Balance | `UniqueReleaseEngineLegacy` case 94 L17555 | choose, then rapid-tap ×3 | `.juggleBall` | overwhelm | instant ~5s (one pass) | 2 - no juggling; "release the others" is only a dim; with negative input you end up keeping one of your own negative words | 78, 81 |
| 95 | SHELF IT | Balance | `UniqueReleaseEngineLegacy` case 95 L17645 | drag (up >92) | `.shelfThoughtBubble` ×6 | anxiety, worry, overwhelm - gentle containment ("visible but not held") without destroying anything | instant ~10s (one pass) | 4 - a built-in ↑ guide and a "LIFT ↑" label on every bubble | 32, 28, 38 |
| 96 | SCRATCH REVEAL | Reveal | `UniqueReleaseEngineLegacy` case 96 L17728 | trace (arm tool, then scratch to 62% coverage) | `button.scratchToolButton`, then the `.scratchPlayArea` canvas | none well. As built, you scratch foil off to uncover your own distress word | long 45-90s (6 rounds) | **1** - anti-relief: it reveals the negative word 6 times; the fact chips are not implemented; scratches do nothing until you arm the tool | 19 |
| 97 | X-RAY | Reveal | `UniqueReleaseEngineLegacy` case 97 L17805 | drag (x >150) ×3, then tap | `button.xrayScannerHandle`, then `button.xrayBurnAllButton` | overthinking, fear - inspect, then incinerate | instant ~10s (one pass) | 4 - a clear → guide and a big BURN ALL finale; but the scans make the scary words sharper before they go | 18 |
| 98 | MAGIC TRAPDOOR | Reveal | `UniqueReleaseEngineLegacy` case 98 L17985 | choose, then drag (down >58) ×3 | `button.magicTrapBubble`, then `button.magicLeverHandle` | catastrophising, overthinking - isolating the most "certain" word | instant ~10s (one pass) | 3 - a built-in ↓ guide; but only 1 of 6 bubbles drops and the rest stay on screen | 46, 26 |
| 99 | THE ECHO CHAMBER | Reveal | `UniqueReleaseEngineLegacy` case 99 L18154 | hold (5s each, continuous) | `button.echoHoldBubble` ×5 | rumination - holding quiets each echo | short ~30s | **2** - the word is forced to `bubbleTextPx` (4px), so it is unreadable (confirmed live); letting go resets to 0; the ↓ arrow is wrong for a hold; the guide says "HOLD SOURCE" | 109, 65 |
| 100 | HOT POTATO | Reveal | `UniqueReleaseEngine` case 100 L12194 | drag (≥48px, any direction) | `button.thoughtPotato` ×6 | **anger**, stress, frustration - "too hot to hold": each thought cools from red to blue and swaps to a positive face | instant ~10s (one pass) | 4 - direct, fast, with a literal cool-down and a positive turn; `.potatoWord` is fixed at 10.5px | 93, 21 |
| 101 | TUG OF WAR | Reveal | `UniqueReleaseEngine` case 101 L12408 | drag (left ~36px), then tap | `button.tugPullHandle`, then `button.uniqControl.tugLetGo` | anxiety, control struggles, anger - ACT's "drop the rope" | short ~25s (12 actions) | 4 - an ACT-grade metaphor with tension visuals and a ← arrow. The guide says ×3 but it is ×6; LET GO is a pill under the rope | 102 |
| 102 | FINGER TRAP | Reveal | `UniqueReleaseEngine` case 102 L12703 | drag inward (~107px toward the centre) | `.ftRow` (press either end) ×5 | **anxiety, panic**, overthinking - paradoxical effort: pushing in instead of pulling away is acceptance in one gesture | short ~20s (one pass) | **5** - the most therapeutically precise mechanic, with built-in → ← PUSH arrows and a live LOOSENING % cue; the slide is long on narrow phones | 101 |
| 103 | SINKING PLATFORM | Reveal | `UniqueReleaseEngine` case 103 L12874 | tap (then watch 0.74s) | `button.spDropButton` ×6 | stress, burden, overwhelm - "stop holding it up" | instant ~8s | 2 - tap-then-watch; the user never lowers anything; the bays are text-heavy | 10, 22, 90 |
| 104 | VOLUME KNOB | Reveal | `UniqueReleaseEngine` case 104 L13023 | drag (down) / tap low | `.knobHitZone` ×6 | anxiety, inner critic - "turn it down, don't delete it" | instant ~12s (one pass, auto-finish) | 4 - rotary feedback and an auto-finish. The mapping is vertical, not rotational (one tap at the knob's bottom sets it to about 0) | 29, 55 |
| 105 | DRAMA MACHINE | Absurdity | `UniqueReleaseEngine` case 105 L13129 | tap ×2 per take | `button.dmDramaButton`, then `button.dmCutButton` | **panic, catastrophising**, anger - exaggerate, then cut (paradoxical intention plus humour); the face flips to positive | short ~25s (12 taps) | 4 - the strongest humour reframe. The effects are CSS-only, and the controls sit in a side panel away from the hero | 55, 52 |
| 106 | TINY SOUNDTRACK | Absurdity | `UniqueReleaseEngine` case 106 L13411 | choose, then rapid-tap ×3 per key | `.tsndVibes button`, then `button.tsndKey` ×6 | sadness, stress, numbness - playing real notes is a light mood lift | instant ~15s (19 taps) | 3 - real per-key notes; but the keys stay disabled until a vibe is picked, and the thought list is duplicated (cards plus keys) | 68 |
| 107 | GO WEIRD | Absurdity | `UniqueReleaseEngine` case 107 L13635 | choose, then tap (or drag) | `button.gwProp`, then `.gwCard.weirdWordBubble` | fear, shame, anger - humour defusion (googly eyes on the thought) | instant ~15s (one pass) | 4 - a tap fallback plus drag; props visibly land; 5 props | 53 |
| 108 | WORD SALAD | Absurdity | `UniqueReleaseEngine` case 108 L13813 | tap, then tap-to-swap | `button.uniqControl` "SHAKE WORD SALAD", then `.saladBowl button` | rumination (in theory, scrambling defuses) | instant ~8s | **1** - the "shake" is always an exact reversal (confirmed live), and the goal is to rebuild the original negative sentence, so the user ends exactly where they started | 20 |
| 109 | CLEANSE | Release | `CleanseEngine` L6143 (`RoutedGameContent` id 109) | hold (≥72%, ~0.8s) | `button.cleanseBubbleHoldButton` ×6 | panic, anxiety, stress - charge and release is like an exhale; the labels come from the emotion profile (HOLD TO CALM / SLOW / BREATHE …) | short ~25s | 4 - the only emotion-aware labels in the set. A 3.2s lock between releases feels sluggish; panic labels fire only on the exact words "panic" / "anxious" | 65, 11, 18 |
| 110 | RAIN OUT | Release | `UniqueReleaseEngine` case 110 L14071 | drag (down >70) | `.rainCloudUnit` ×6 | **sadness, grief**, overwhelm - "let it out" (a crying metaphor); a full-screen rain catharsis where the words wash off | short ~20s (including a 3s finale) | **5** - the most cinematic payoff in the catalog, with built-in pull hints; cloud text is fixed at 11px | 34 |

## 1b. Live sweep (1280×860, "I am panicking about tomorrow")

LIVE_SWEEP_PLACEHOLDER

## 2. Mechanic duplicate clusters (56-110)

| cluster | members | shared mechanic |
|---|---|---|
| I. one-tap "form" choice ×6 | 56 COURTROOM, 72 CATCH & LABEL, 73 TRAFFIC LIGHT, 83 SORT STATION, 85 CONTROL PANEL, 86 FACT/STORY, 92 SCALE DOWN (plus 32 PARK IT and 52 SUBTITLES from 1-55) | Pick 1 of 3-5 labelled buttons, then advance. This is cognitive work in a crisis, with no tactile payoff. |
| B. tap one pill or knob N× | 57 CAMERA ANGLE, 58 MICROSCOPE, 76 REVERSE IT, 68 DRUM IT (plus 2, 12, 30, 53, 54) | The object itself is never touched. |
| C. tap, then watch | 90 COIN FLIP, 103 SINKING PLATFORM (plus 10, 22, 23) | Passive. |
| J. wait / don't touch | 66 BUFFERING, 80 DON'T TAP | Near-identical (3s versus 5s timer). |
| K. timing / inhibition | 64 RED LIGHT, 69 PULSE, 70 METRONOME, 79 MISS ON PURPOSE | Tap only in a window or skip. All four have invisible rules and silent fails. |
| D. hold to threshold | 65 PAUSE, 99 ECHO, 109 CLEANSE (plus 11, 13, 39, 18) | A press-and-hold meter. |
| F. hidden or fixed order | 60 CROP, 63 PATTERN POP, 67 TAP OUT, 74 BUBBLE WRAP (71 DEFUSE has a visible order) | Ordered taps where wrong taps are silently ignored or reset. |
| E. one-axis drag past a threshold | 59 SPOTLIGHT, 75 INK BLEED, 77 SLOW MOTION, 84 MINE/NOT MINE, 87 KEEP/DROP, 95 SHELF IT, 110 RAIN OUT, the 97 and 98 levers | Drag more than 70-150px on x or y. |
| L. push outward in any direction | 93 SPACE MAKER, 100 HOT POTATO, 91 PRIORITY BLOCKS | Drag each bubble ≥34-48px. |
| M. humour reframe | 105 DRAMA, 107 GO WEIRD, 106 TINY SOUNDTRACK, 108 WORD SALAD (plus 52, 53, 55) | Absurdity defusion. |
| N. prioritise / keep one | 81 STACK IT, 91 PRIORITY BLOCKS, 94 JUGGLE, 78 ONE WORD | Order or select chunks. With 6 auto-split chunks of one sentence, the result is meaningless. |

## 3. The 10 strongest in 56-110 (relief × fun × clarity)

1. **102 FINGER TRAP**: acceptance ("stop fighting it") in a single gesture, with arrows on screen. This is the panic and anxiety flagship.
2. **110 RAIN OUT**: cinematic, full-screen catharsis. The sadness and grief flagship; the most "Inside Out" moment in the catalog.
3. **105 DRAMA MACHINE**: exaggerate, then CUT, with a face that flips positive. Great for catastrophising and panic, and viral-friendly.
4. **101 TUG OF WAR**: ACT's "drop the rope" made literal; real tension, then release.
5. **100 HOT POTATO**: the anger flagship. "Too hot to hold" → it cools to blue and a positive face; one pass, about 10s.
6. **109 CLEANSE**: the only emotion-aware labels (HOLD TO CALM / BREATHE). A charge-and-release exhale ritual.
7. **61 FREEZE**: you tap the word itself and see layered ice. A fast "stop the spiral" interrupt.
8. **93 SPACE MAKER**: overwhelm → visible empty space around NOW; arrows on every tile.
9. **95 SHELF IT**: gentle containment for worry (not destruction), with a built-in ↑ guide.
10. **104 VOLUME KNOB**: "turn it down, don't delete it" for the inner critic; auto-finishes.

Honourable mentions:
- 107 GO WEIRD (humour, with a tap fallback)
- 97 X-RAY (a burn finale)
- 87 KEEP/DROP (the best legacy arrows)
- 71 DEFUSE (a panic countdown)
- 77 SLOW MOTION and 69 PULSE (the right panic concepts, which need visible tempo or breath cues)

## 4. The 10 weakest or most redundant in 56-110

1. **108 WORD SALAD**: the shake is a fixed reversal, and winning means rebuilding the original negative sentence. It works against relief.
2. **96 SCRATCH REVEAL**: the user scratches 6 times to uncover their own distress word; 45-90s; the arm step is unexplained.
3. **62 NET IT**: the catch is fake (any click on the net wins).
4. **78 ONE WORD**: the "choose one word" offers a single button, because each chunk is usually one word.
5. **63 PATTERN POP**: the prediction is fake (the answer glows); wrong taps silently reset.
6. **82 SEESAW**: a precision chore of 36 button taps that contradicts its own "good enough" hook.
7. **74 BUBBLE WRAP**: strict-order popping over 72 taps kills the stim. Better merged into 1 POP's free-pop engine.
8. **80 DON'T TAP / 66 BUFFERING**: duplicates of each other; 18-30s of passive watching. Keep one and fill it with a breath cue.
9. **90 COIN FLIP REACTION**: passive ×6; the promised reaction step is missing; duplicates cluster C.
10. **The cluster-I form clones (56, 73, 83, 86)**: one tap ×6 on one-word chunks. Merge them into one swipe-sort deck: FACT/STORY, MINE/NOT MINE, NOW/LATER (84's swipe is the template).

Also weak:
- 99 ECHO CHAMBER: 4px text; 25s of holds that reset.
- 57 CAMERA ANGLE and 76 REVERSE IT: pill-tapping.
- 60 CROP TOOL: hidden ordered taps.
- 94 JUGGLE: you keep one of your own negative words.
- 103 SINKING PLATFORM: tap, then watch.

## 5. Gaps: emotional states poorly served by 56-110

- **No paced breathing.** 65 PAUSE, 69 PULSE, 77 SLOW MOTION and 109 CLEANSE circle the idea, but none shows an inhale/exhale cue at about 5-6 breaths per minute with a longer exhale.
  - That is the single most effective instant panic intervention, and it is missing from all 110 games.
  - A good fit: make 109's hold = inhale and its release = a slow exhale (a 4s drain), or give 69 PULSE a visible breathing orb.
- **No before/after intensity loop.** 92 SCALE DOWN is the only 1-10 rating, and it is wasted inside one game.
  - Lift it into a wrapper: rate before, play, rate after, then show "8 → 3". That is the dopamine proof-of-shift and the replay hook.
- **Panic is often made worse by the timing games.** 64, 70 and 79 punish mistimed taps silently, and 63 resets streaks. For a panicking user these add failure pressure.
  - Timing games need forgiving windows plus visible "almost" feedback.
- **Sadness, grief and loneliness.**
  - Only 110 RAIN OUT, 106 TINY SOUNDTRACK and 88 TRADE (TIME / SPACE / LAUGH) are gentle.
  - Nothing comforts, holds or connects: no "warm it in your hands", no "light a lantern for someone", no "send kindness".
  - **Loneliness still has zero games** across all 110.
- **Jealousy and comparison.** Nothing in 56-110 targets them. 84 MINE/NOT MINE is closest. There is no gratitude or "turn the spotlight back on your own wins" mechanic, although 59 SPOTLIGHT could be reskinned for that.
- **Shame and guilt.** 84 MINE/NOT MINE (over-responsibility) and 79 MISS ON PURPOSE (perfectionism) touch them. No self-compassion reframe exists: for example, the thought spoken back in a friend's voice, or the word re-dressed kindly as in 107 GO WEIRD.
- **Numbness.** Only 68 DRUM IT and 106 TINY SOUNDTRACK raise arousal, and DRUM IT plays one identical click on every pad. Missing: a colour, sound and haptic "wake-up" game.
- **Fear.** There is still no approach or exposure mechanic (bring the scary thing closer and watch it shrink or turn silly). 89 DOOR A/B needs an "or" in the input; 107 GO WEIRD is the nearest fit.
- **Anger.** 100 HOT POTATO is the only "discharge → cool down → positive" arc. 68 DRUM IT discharges but never cools. There is no smash-then-exhale sequence.
- **Positive ending (the "Inside Out" beat).** Only 100 (cool face), 105 (the face flips), 110 (rain → positive), 88 (a prize) and 109 (cleansed) turn the moment positive. Most others end on deletion or on nothing, and 94/108 end on keeping or restoring the user's negative words.
- **Routing.** None of the strongest games in 56-110 (102, 110, 105, 101, 100, 109) has a `keywordBoost` in `chooseRelevantGame`, and the emotion profiles do not route games. A user who types "I'm so angry" can never be routed to 100 HOT POTATO, and "I'm grieving" can never reach 110 RAIN OUT.
- **Readability and arrows.** 45 of 55 games have no arrow aimed at the target. The user's words render at about 4-7px in most legacy cases (`bubbleTextPx` default 4). Status lines are 9-10px.

## 6. Cross-cutting fixes these rows point to (for the redesign and arrow agents)

1. **Guide arrows.** Aim one arrow per game at the selector in the "target CSS" column.
   - For sequence games, the arrow must track the live target: `.cropHandle.h{step}`, `.portalRing button.hot`, `.bubbleWrapSheet button:nth-child(step+1)`, the next `.tapOutPads` side, and `.defuseZone.active button`.
   - Two-stage games need two arrow states:
     - 72: CATCH → labels
     - 88: `.coinSlot` → options
     - 96: `.scratchToolButton` → canvas
     - 97: scanner → BURN ALL
     - 98: bubble → lever
     - 101: handle → LET GO
     - 105: DRAMATIC → CUT
     - 106: vibe → keys
     - 107: prop → card
     - 108: SHAKE → tiles
   - For the wait games (66, 80), show a "hands off" icon instead of an arrow.
2. **Raise the minimum text size to about 13px and the user's words to at least 16px.**
   - Change the `bubbleTextPx` default from 4 to about 16, and remove the forced 4px ref on `.echoBubbleWord` (L18222).
   - Other targets: `.literalStatus b/span` (9px), `.uniqControl` (10px), `.potatoWord` (10.5px), and the `.rainCloudUnit` text (11px).
3. **Fix the guide text** for the 13 mismatches in section 0, or implement the promised mechanic: 63 predict, 67 beat, 74 free popping, 90 reaction, 96 facts, 99 source, 101 ×6.
4. **Stop rebuilding or keeping the negative thought** (94, 108). End every game on a positive transform, as 100, 105 and 110 already do.
5. **Collapse 6 rounds to 1 pass** for the cluster-I/B/C/J games, or deduplicate chunks so short inputs do not repeat the same word 6 times.
