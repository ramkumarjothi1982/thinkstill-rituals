# CATALOG AUDIT A: games 1-55

Baseline: `src/00_arcade.jsx` md5 `b9e220c391b7e86bfb46b8c718e7f489` (22,786 lines). I verified this audit against the source. I also probed LASER SLICE, HAMMER and BOSS BATTLE live in the Playwright harness with the input "I am panicking about tomorrow".

## 0. Routing facts (these differ from the task brief)

- **Ids 1-99 never reach `RoutedGameContent` or `UniqueReleaseEngine` (L11539).** `ReleaseGameEngine = useLegacyGame ? GameEngineLegacy : GameEngine` (L21773-4) sends every id below 100 to `GameEngineLegacy` (L18365), then to `RoutedGameContentLegacy` (L18281).
- `RoutedGameContentLegacy` routing:
  - Ids in `UNIQUE_HERO_IDS` (`1,3,4,6,9,15,16,18,19,21,22,23,24,25,41,43,50`, within 1-55) go to dedicated literal engines. See the renderer column.
  - Every other id goes to **`UniqueReleaseEngineLegacy` (L14524) → `switch (game.id)` (L15077) → `case N`**.
  - In that switch, `case 21` (L15327) and `case 43` (L15787) are dead code, because the hero route wins.
- **Six rounds everywhere.** `cleanEntries(raw)` (L2558) always returns exactly 6 chunks.
  - Fewer than 6 tokens are repeated to fill 6 slots. Six or more tokens are grouped into 6.
  - Every `UniqueReleaseEngineLegacy` game calls `advance()` once per chunk, so the user repeats the same micro-move 6 times.
  - Example: "I am panicking about tomorrow" becomes `I / am / panicking / about / tomorrow / I`. The first and last rounds are "I". Live probe: `.literalProgress` reads "1 / 6".
  - The hero engines also show 6 bubbles or 6 rounds.
- **Per-game how-to text is never shown.** `shell(body, hint, extraClass)` (L14957) ignores `hint`. About 45 hand-written lines such as "Pull the meteor back like a slingshot…" are dead strings.
- **The only on-screen instruction is the `.globalPlayGuide` card.** It shows `SHORT_HINT[id] || SHORT_ACTION[id]` (L2130-2187). There is no arrow and no pointer at the target.
- **The guide card or the GAMES `action` text contradicts the real mechanic in 12 games:**

  | Game | Guide text | Actual mechanic |
  |---|---|---|
  | ZAP | "HOLD TO ZAP" | tap ×3 |
  | LASER SLICE | "SWIPE TO SLICE" | arm the tool, then tap each bubble ×3 (confirmed live) |
  | MELT | "HOLD TO MELT" | arm the torch, then tap each cube ×3 |
  | CRACK | "TAP TO CRACK" | the tool must be selected first, and taps before that are silently ignored |
  | STOMP | "STOMP IT FLAT" | the tool must be selected first, and taps before that are silently ignored |
  | ERASE | "ERASE WORDS" | the eraser must be activated first, and taps before that are silently ignored |
  | HAMMER | "TIME THE HIT" | there is no timing check |
  | ZOOM OUT | catalog says "pinch" | button taps |
  | CRUMPLE | catalog says "drag corners" | taps |
  | CARTOONIFY | catalog says "drag slider" | taps |
  | HEADLINE | catalog says "drag slider" | 3 buttons |
  | MIRROR FLIP | catalog says "swipe/rotate" | 3 buttons |
- **Small text.**
  - `.literalStatus b/span` is 9px. `.toolHitCount` ("0/3") is 9px.
  - `.orbitButtons/.genreKeys/.productionStrip button` is 7px. `.parkBay` is 7px.
  - `.uniqControl` is 10px, and it carries a "THOUGHT MOVE · " prefix.
  - `.engineProgressText` is 8px in base CSS and 6.5px on narrow screens; it computes to 10px at 1280px.
  - The legacy HUD shows only `GAME PROGRESS · N%`. Ids below 100 get no sparks, LVL or XP feedback.
- **Hidden-order targets.** In BOSS BATTLE (17), FLOAT AWAY (33) and UNTANGLE (42), all targets look identical, and taps on the wrong one are silently ignored. BOSS's `.weakSpot` has no live state, only `.dead`.
  - The BOSS probe screenshot also showed the word itself as a tiny "I" under an emoji face.

Gesture key:
- **tap**: single taps.
- **rapid-tap**: one target tapped N times quickly.
- **hold**: press and keep pressing.
- **drag**: move an object past a distance threshold.
- **swipe**: a fast horizontal drag.
- **slingshot-pull**: pull back, then release.
- **trace**: rub or scrub.
- **choose**: pick one option.
- **sequence-tap**: tap N targets in a fixed order.

Speed values assume 6 rounds.

## 1. Catalog rows

| id | name | family | renderer (engine fn + branch) | primary gesture | target CSS the user must touch | best relieves - why (mechanic) | relief speed | fun/clarity 1-5 - concrete weakness | duplicate-of |
|---|---|---|---|---|---|---|---|---|---|
| 1 | POP | Destroy | `BurstEngine` L4063 (hero; `game.id===1` → `.popArenaV2`) | tap | `button.wordBubble.popBubbleV2` ×6 (onPointerDown) | anxiety, overthinking, overwhelm - each tap is an instant micro-win that turns a swirling cluster into a finite, countable set that disappears | instant ~6s | **5** - clearest game in the set. Weaknesses: no arrow; the 6 bubbles repeat the same words for short input; no escalation or combo payoff for anger | - |
| 2 | CRUSH | Destroy | `UniqueReleaseEngineLegacy` case 2 L15078 | rapid-tap | `button.uniqControl` ("THOUGHT MOVE · CRUSH n/4"); `.crusherRig .jaw` are visual only | anger, frustration - rapid repeated force discharges motor arousal | instant ~15s (24 taps) | 3 - you tap a pill button, not the blob; the jaws barely move; there is no squash or splat | 12, 30, 53, 54 (tap one button N×) |
| 3 | CRACK | Destroy | `CrackEngine` L6859 | tap (arm tool → 3 hits per egg) | `button.crackToolDock`, then `.crackBubbleSlot` / `.eggShell.multiEgg` ×6 | frustration, anger (mild) - repeated strikes split a "sealed" shell, giving a feeling of breakthrough | instant ~18s (19 taps) | 3 - taps are dead until the tool is selected, and the guide never says so | 4, 9, 16, 19, 43 (arm-tool + 6×3 taps) |
| 4 | STOMP | Destroy | `StompEngine` L4258 | tap (arm boot → 3 stomps per bubble) | `button.stompToolDock`, then `.stompBubbleSlot` / `.stompWordBubble` ×6 | anger, frustration - a heavy-impact metaphor; flattening the word maps directly onto rage discharge | instant ~18s | 4 - the best anger feel of the arm-tool clones (crack overlays, debris). The arm step is unexplained; the 9px "0/3" counter | 3, 9, 16 |
| 5 | HAMMER | Destroy | `UniqueReleaseEngineLegacy` case 5 L15099 | tap | `button.uniqControl` "SWING HAMMER" (the `.swingMarker` / `.sweetSpot` lane is decorative) | frustration - in theory "precision beats rush" (impulse control) | instant ~5s | **1** - `tapStep(1)` advances on any tap, so the timing mechanic is fake and the guide's "TIME THE HIT" is untrue; 6 identical one-tap rounds | 10, 35 (one tap per round) |
| 6 | ZAP | Destroy | `ZapEngine` L7179 | tap ×3 | `button.zapGroundButton.multiZapButton` | overthinking, intrusive thoughts - a sharp "stop signal" interrupts a rumination loop | instant ~4s | 3 - three taps clear all 5 bubbles, so the user has little agency or ownership; the guide says HOLD | - |
| 7 | PIN POP | Destroy | `UniqueReleaseEngineLegacy` case 7 L15119 | drag (x ≥95px) | `.pinTool` dragged toward `.uniqWord.balloonWord` | anxiety, catastrophising - "big feeling, mostly air" deflates magnitude | instant ~12s | 2 - drag is x-axis only and nothing shows the pin must travel right; the promised balloon inflation is not implemented | 44, 45, 47, 49 (one horizontal drag) |
| 8 | METEOR | Destroy | `UniqueReleaseEngineLegacy` case 8 L15135 | slingshot-pull | `.meteorRock` (drag down >75 or left >90, then release) | stress, worry - flinging the thought into space creates psychological distance | instant ~15s | 3 - the pull direction (down or left) is invisible, with no aim line or band | 24, 26 |
| 9 | LASER SLICE | Destroy | `LaserSliceEngine` L5137 | tap (arm laser → 3 shots per bubble) | `button.laserToolDock`, then `.laserTargetBubble` ×6 | overthinking - cutting a sentence into fragments defuses its literal meaning (cognitive defusion) | instant ~18s | **2** - the guide says "SWIPE TO SLICE" but you tap (confirmed live); one word per bubble ("I 0/3", "am 0/3") | 3, 4, 16 |
| 10 | DOMINO DROP | Destroy | `UniqueReleaseEngineLegacy` case 10 L15160 | tap | `button.uniqControl` "TIP FIRST DOMINO" | overthinking - shows how a spiral is a chain started by one small piece | instant ~10s | 2 - one tap, then 0.9s of watching ×6; the promised reveal of the trigger word is not implemented | 22, 23, 35 (tap then watch) |
| 11 | PRESSURE POP | Destroy | `UniqueReleaseEngineLegacy` case 11 L15185 | hold, then release in a window | `button.uniqControl` (release when meter is 62-88); `.pressureCapsule .needle` gauge | panic, anger, anxiety - hold-build then a timed release mimics a controlled exhale or "letting off steam"; it trains down-regulation instead of impulsive discharge | short 15-40s | 4 - the strongest self-regulation mechanic in the set. The ~0.3s window is barely shown; a miss resets to 0 (punishing in panic); `onPointerUp` only, so leaving the button keeps charging | 13, 39 (hold-to-threshold) |
| 12 | BOUNCE OUT | Destroy | `UniqueReleaseEngineLegacy` case 12 L15208 | rapid-tap | `button.uniqControl` "HIT PADDLE" ×3 | overthinking, rumination - repeats lose energy | instant ~12s | 2 - the promised ball shrink is not implemented; the paddle is static; you tap a button, not the ball | 2 |
| 13 | SQUASH | Destroy | `UniqueReleaseEngineLegacy` case 13 L15234 | hold (to ≥82) | `button.uniqControl` "PRESS & HOLD TO SQUASH" | anger, stress - sustained press is isometric tension, and letting go is the release | instant ~10s | 2 - you hold a button below the object; an early release halves the meter with no hint | 39, 11 |
| 14 | CRUMPLE | Destroy | `UniqueReleaseEngineLegacy` case 14 L15254 | sequence-tap | `button.paperCorner.c0..c3` (only `step===i` is enabled) | shame/guilt, regret - balling up a "bad draft" says you don't owe it preservation | instant ~15s (24 taps) | 2 - the catalog says drag but it is 4 dot taps; disabled and enabled corners look the same; no paper-ball physics | 17, 33, 37, 51, 55 (fixed-order taps) |
| 15 | SHRED | Destroy | `ShredEngine` L4653 | rapid-tap (5 per word) | `button.bigAction.shredAction.primaryBottomControl` | anger, shame/guilt, stress - feeding evidence into blades is a destruction ritual with strong closure; rapid taps discharge arousal | short ~25s (30 taps) | 4 - a strong physical scene, but 30 taps on a bottom button with the paper far away; the user never touches the paper | 22, 23 (button-driven scene) |
| 16 | MELT | Destroy | `MeltEngine` L9661 | tap (arm torch → 3 per cube) | `button.meltGroundButton.meltToolButton`, then `.cartoonIceCube` ×6 | numbness, stress - thawing something frozen ("fixed things can change shape") | instant ~18s | **2** - the guide says "HOLD TO MELT" but it is arm + tap ×3; a fire-on-ice clone of CRACK and STOMP | 3, 4, 9 |
| 17 | BOSS BATTLE | Destroy | `UniqueReleaseEngineLegacy` case 17 L15277 | sequence-tap | `button.weakSpot.w0..w4` (only `i===step` works) | fear, anxiety - in theory, spotting the pattern makes the scary thing smaller | short 30-60s | **1** - all 5 spots are identical cyan dots with no "live" cue; wrong taps are silently ignored; the word is barely visible (tiny "I" under an emoji); 30 taps | 14, 33, 42 |
| 18 | BURN | Release | `BurnEngine` L7415 | hold (~3s per word) | `button.burnGroundButton` | anger, grief, shame/guilt - a ritual burn gives symbolic closure; holding builds anticipation, then catharsis | short ~25s | 4 - a satisfying flame front. Six sequential 3s holds drag; the user holds a ground button instead of touching the paper | - |
| 19 | ERASE | Destroy | `EraseClickEngine` L8551 | trace (activate, then rub ×3 passes per bubble) | `button.eraseActivateBtn`, then `.eraseWordBubble` ×6 | shame/guilt, regret - "a mark can be visible without being permanent" | instant ~18s | 3 - rub-to-erase is tactile, but rubs are throttled to 210ms and need activation first | 3, 4 |
| 20 | GLITCH OUT | Destroy | `UniqueReleaseEngineLegacy` case 20 L15302 | sequence-tap | `.glitchPanel button.live` (△ ◇ □) | overthinking, intrusive thoughts - pattern interruption scrambles the thought's syntax | instant ~15-30s | 2 - abstract symbols; a wrong tap silently resets the step; the syntax-scramble payoff is barely visible | 14, 17 |
| 21 | BIN | Discard | `BinLiteralEngine` L10410 (legacy case 21 is dead) | drag | `.binWordBubble` dragged onto `.binMouthTarget` (`.neonBin.masterBin`) **or** `button.binAllButton` | overwhelm, stress - throwing things out physically clears mental clutter | instant ~15s (BIN ALL ~2s) | 4 - a direct-manipulation drag; "BIN THEM ALL" lets the user skip all engagement in one tap | 27, 34 |
| 22 | FLUSH | Discard | `FlushEngine` L7553 | tap | `button.flushLever.primaryBottomControl` ×6 | overthinking, rumination, disgust/shame - a swirl reverses the circling direction | instant ~10s | 3 - pretty sink scene but passive: one tap, then 1.6s of watching ×6 | 23, 10 |
| 23 | VACUUM | Discard | `VacuumEngine` L7866 | tap | `button.bigAction.vacuumBtn` ×6 (`.vacuumCircleBubble` is visual) | overwhelm - attention declutter | instant ~12s | 2 - fully passive (tap, then a 1.3s auto-suck); the catalog's "hold/suck" agency is gone | 22 |
| 24 | SLINGSHOT | Distance | `SlingshotEngine` L8389 | slingshot-pull (>72px) | `.slingshotWord` (pointer capture on the word) | anxiety, stress, worry - building tension and snapping it away mirrors tension-release physiology and creates distance | instant ~15s | 4 - great tactile pull. The flight path is fixed (up-right) whatever the aim; 6 identical launches | 8, 26 |
| 25 | SWIPE AWAY | Discard | `SwipeAwayEngine` L7756 | swipe (right >140px) | `.swipeCard.physical` | intrusive thoughts, jealousy/comparison - a familiar "nope" gesture; a weak swipe springs back, so it rewards commitment | instant ~10s | 4 - universally understood. Right only; no arrow on the card; 6 cards | 7, 44, 49 |
| 26 | SEND TO SPACE | Distance | `UniqueReleaseEngineLegacy` case 26 L15345 | drag (lever down >70) | `.launchLever` | worry, overwhelm - zooming the thought to a pixel | instant ~12s | 2 - the lever sits on the right edge, far from the rocket; there is no shrink-to-pixel payoff | 8, 24, 46 |
| 27 | DROP ZONE | Discard | `UniqueReleaseEngineLegacy` case 27 L15369 | drag (right >110 or down >95) | `.weightedBlock` past `.dropLedge` | stress, burden - putting a weight down | instant ~12s | 2 - the ledge has no affordance; the "weight vanishes" haptic is not implemented | 21, 34 |
| 28 | ARCHIVE | Discard | `UniqueReleaseEngineLegacy` case 28 L15394 | tap, then drag | `button.uniqControl` "PULL DRAWER OPEN", then `.fileCard` drag down >65 | overwhelm, stress - de-prioritise without deleting | short ~20s | 2 - two steps ×6 with no reason to re-open; visually thin | **38** |
| 29 | MUTE | Distance | `UniqueReleaseEngineLegacy` case 29 L15424 | drag (fader down >120) | `.verticalFader` | anxiety, overthinking (inner-critic volume) - "quiet is enough; gone is optional" | instant ~12s | 3 - a clear fader metaphor with a live waveform; the fader sits at the far right | 37 |
| 30 | ZOOM OUT | Distance | `UniqueReleaseEngineLegacy` case 30 L15456 | rapid-tap | `button.uniqControl` "ZOOM OUT ONE LEVEL" ×4 | anxiety, overwhelm - cosmic perspective shift (the "overview effect") | instant ~15s | 3 - a strong concept but just button taps (catalog says pinch); the room → city → planet → space layers are only rings | 2 |
| 31 | BACK SEAT | Distance | `UniqueReleaseEngineLegacy` case 31 L15483 | drag (diagonal x >90 and y >35) | `.passengerCard` into `.backSeat` | anxiety, fear - "present doesn't mean in charge" (ACT) | instant ~15-25s | 3 - a lovely metaphor, but the diagonal threshold is invisible and fails often | - |
| 32 | PARK IT | Discard | `UniqueReleaseEngineLegacy` case 32 L15509 | choose | `button.parkBay` (LATER TODAY / TOMORROW / NOT NOW) | anxiety, worry - worry postponement (an evidence-based "worry time" technique) | instant ~5s | 3 - a meaningful choice, but 7px labels and one tap per round, so it feels like a form | 52 |
| 33 | FLOAT AWAY | Distance | `UniqueReleaseEngineLegacy` case 33 L15531 | sequence-tap | `button.balloonWeight.w0..w2` (✂, only `i===step`) | sadness, grief, letting go - a gentle, non-violent release | instant ~15s | 3 - one of the few soft games; the cut order is hidden and wrong taps are ignored | 14, 17 |
| 34 | RIVER | Distance | `UniqueReleaseEngineLegacy` case 34 L15556 | drag (down >35) | `.leafWord` into `.riverFlow` | anxiety, overthinking - "leaves on a stream", a classic defusion exercise | instant ~10s | 3 - the right concept, but a tiny drag ends it; the "current carries it on" surprise is not implemented | 21, 27 |
| 35 | TRAIN PLATFORM | Distance | `UniqueReleaseEngineLegacy` case 35 L15585 | tap | `button.uniqControl` "LET THIS TRAIN PASS" | panic, intrusive thoughts - thoughts arrive and leave without you boarding | instant ~8s | 2 - no timing (the catalog promises "perfect timing"); one tap ×6 | 10, 5 |
| 36 | CLOUD PASS | Distance | `UniqueReleaseEngineLegacy` case 36 L15614 | drag (slow: >120px over >450ms) | `.neonCloud` (`.windLane` "STEADY WIND →") | panic, anxiety - teaches that slowing down beats frantic effort; frantic swipes inflate the cloud | short ~15-30s | 3 - the only "go slower to win" mechanic, which is gold for panic; but the speed rule is invisible (no tempo meter) | - |
| 37 | ELEVATOR DOWN | Distance | `UniqueReleaseEngineLegacy` case 37 L15644 | sequence-tap | `.floorStack button` (10 → 7 → 4 → 1) | anger, stress - de-escalation on a 10-to-1 intensity scale | instant ~15s | 3 - directly measures intensity, but 44px buttons, 4 forced taps and no "how intense are you now?" input | 29, 55 |
| 38 | DRAWER | Discard | `UniqueReleaseEngineLegacy` case 38 L15675 | tap, drag, tap | `button.uniqControl` OPEN, then `.drawerCard` drag down >55, then `uniqControl` CLOSE | overwhelm - "choose when to reopen" | short ~25s (18 actions) | 2 - three chores ×6 rounds | **28** |
| 39 | BLACK HOLE | Distance | `UniqueReleaseEngineLegacy` case 39 L15706 | hold (to ≥85) | `button.uniqControl` "HOLD TO INCREASE GRAVITY" | overwhelm, overthinking - a giant thought looks tiny next to a bigger frame | instant ~10s | 3 - the spaghettify stretch is fun, but you hold a button below it | 13, 11 |
| 40 | PAPER PLANE | Distance | `UniqueReleaseEngineLegacy` case 40 L15729 | tap ×2, then swipe | `button.uniqControl` FOLD ×2, then `.paperPlane` drag right >120 | sadness, regret - "perfect control wasn't required for release" | short ~20s | 3 - a nice craft-then-release arc; the wind-drift surprise is not implemented | 25 |
| 41 | UNHOOK | Detach | `UnhookLiteralEngine` L8960 | rapid-tap (3 per bubble) | `.unhookWordBubble` ×6 (`cutLink`) | overthinking, jealousy, attachment - visibly cutting strings means "attached ≠ permanent" | instant ~12s (18 taps) | 3 - readable, but you tap the bubble rather than the string | 43 |
| 42 | UNTANGLE | Detach | `UniqueReleaseEngineLegacy` case 42 L15756 | drag (any distance, fixed order) | `.knot.k0..k2` (only `i===step` counts) | overwhelm, confusion - "not every knot needs force" | short 30-45s | **2** - all knots look identical and only one counts; the drag distance is meaningless | 17, 33 |
| 43 | CUT THE LOOP | Detach | `CutLoopLiteralEngine` L8772 (legacy case 43 is dead) | tap (select scissors → 3 per word) | `button.cutLoopScissorPicker`, then `.cutLoopWordSlot` ×6 | overthinking, rumination - breaking the literal loop | instant ~15s | 3 - a good loop visual; the arm step is unexplained | 41, 3 |
| 44 | VELCRO | Detach | `UniqueReleaseEngineLegacy` case 44 L15805 | drag (slow peel, right >130) | `.velcroPatch` | anxiety, "stuck" feelings - resistance peaks, then gives way | instant ~12s | 3 - the live tooth-fade is good feedback; there is no sound or haptic resistance curve | 7, 49 |
| 45 | MAGNETS | Detach | `UniqueReleaseEngineLegacy` case 45 L15834 | drag (right >160) | `.attentionOrb` | jealousy, craving, compulsion - "pull is not obligation" | instant ~12s | 3 - field lines fade live; the orb gives no hint of which way to drag | 7, 47 |
| 46 | UNPIN | Detach | `UniqueReleaseEngineLegacy` case 46 L15859 | drag (up >75) | `.pushPin` | stress - priority reset ("important-looking isn't important") | instant ~10s | 2 - no feedback during the drag; the note does not drift away | 26 |
| 47 | UNFOLLOW | Detach | `UniqueReleaseEngineLegacy` case 47 L15878 | drag (right >120) | `.plug` (out of `.socket`) | jealousy, comparison, loneliness-scrolling - cutting the feed's connection | instant ~10s | 3 - a topical metaphor, but the spawning duplicate cards are not implemented, so it is just a plug drag | 7, 45 |
| 48 | UNSTICK | Detach | `UniqueReleaseEngineLegacy` case 48 L15896 | drag (diagonal x >85 and y <-45) | `.stickerWord` (`.peelCorner`) | overthinking, stuckness - "there was always an edge" | instant ~15-25s | 2 - the up-right diagonal is invisible and fails often | 31 |
| 49 | UNZIP | Detach | `UniqueReleaseEngineLegacy` case 49 L15921 | drag (right >140) | `.zipperPull` | overthinking - a solid thought is just pieces zipped together | instant ~10s | 2 - the "opens into separated keywords" payoff is not implemented | 7, 44 |
| 50 | UNFINISHED SENTENCE | Reveal | `UnfinishedSentence` L6742 | choose / typing | `.chainLink input` ×1-3, then `button.bigAction.premiumBigAction` | anxiety (catastrophising) - shows how far the "and then…" story drifts from fact | long 30-90s | **1** - typing in a crisis; "and then?" prompts can amplify catastrophising; it never calls `onProgress` (bar stuck at 0%); shows only `entries[0]` (1 of 6 chunks) | - |
| 51 | MIRROR FLIP | Reframe | `UniqueReleaseEngineLegacy` case 51 L15939 | sequence-tap | `.orbitButtons button.live` (LEFT → ABOVE → RIGHT) | shame, self-criticism - "same words, different place to stand" | instant ~12s | 2 - 7px buttons; the catalog says swipe/rotate; the camera change is subtle | 55, 37 |
| 52 | SUBTITLES | Reframe | `UniqueReleaseEngineLegacy` case 52 L15967 | choose | `.genreKeys button` (SOAP / NATURE / SPORT) | anger, anxiety - absurd tone exposes "tone masquerading as truth"; laughter breaks rumination | instant ~5s | 3 - high viral potential, but the genre treatment is CSS-only with no voice-over or soundtrack; 7px buttons | 32 |
| 53 | CARTOONIFY | Reframe | `UniqueReleaseEngineLegacy` case 53 L15992 | rapid-tap | `button.uniqControl` "PUMP ABSURDITY" ×4 | fear, anger, shame - humour defusion (the villain squeaks and shrinks) | instant ~15s | 3 - the catalog says slider; the villain squeak is not implemented; humour is opt-in (`HUMOUR_OPTIN`) | 2, 54 |
| 54 | FONT CHECK | Reframe | `UniqueReleaseEngineLegacy` case 54 L16004 | rapid-tap | `button.fontDial` ×4 | anxiety, inner-critic authority - typography fakes authority | instant ~15s | 2 - no authority meter (as promised); the dial is a tiny corner widget | 53 |
| 55 | HEADLINE | Reframe | `UniqueReleaseEngineLegacy` case 55 L16027 | sequence-tap | `.productionStrip button` (REMOVE SIREN → TICKER → ZOOM) | panic, catastrophising - turning down the production while the words stay identical defuses alarm | instant ~12s | 3 - the best panic-reframe concept; 7px buttons; 3 forced taps ×6 rounds | 37, 51 |

## 2. Mechanic duplicate clusters (1-55)

| cluster | members | shared mechanic |
|---|---|---|
| A. arm-tool + 3 hits × 6 bubbles | 3 CRACK, 4 STOMP, 9 LASER, 16 MELT, 19 ERASE, 43 CUT LOOP (41 UNHOOK without the arm step) | Select a dock button, then tap 6 targets 3 times each. These are near-identical code paths with different skins. |
| B. tap one pill N× | 2 CRUSH, 12 BOUNCE, 30 ZOOM, 53 CARTOONIFY, 54 FONT | Tap `.uniqControl` or a dial N times; the object is never touched. |
| C. tap-then-watch | 5 HAMMER, 10 DOMINO, 22 FLUSH, 23 VACUUM, 35 TRAIN | One tap per round, then an animation. Passive. |
| D. hold to threshold | 11 PRESSURE, 13 SQUASH, 39 BLACK HOLE (18 BURN is a hero version) | Hold the bottom button; the meter fills. |
| E. one-axis drag past threshold | 7 PIN, 25 SWIPE, 44 VELCRO, 45 MAGNETS, 46 UNPIN, 47 UNFOLLOW, 49 UNZIP, 26 SEND TO SPACE, 29 MUTE | Drag a handle more than 100px along x or y. |
| F. fixed-order hidden sequence | 14 CRUMPLE, 17 BOSS, 20 GLITCH, 33 FLOAT, 37 ELEVATOR, 42 UNTANGLE, 51 MIRROR, 55 HEADLINE | Tap or drag N targets in a set order; several have no live highlight. |
| G. launch away | 8 METEOR, 24 SLINGSHOT, 26 SEND TO SPACE, 40 PAPER PLANE | Pull or flick off-screen. |
| H. put it away | 21 BIN, 27 DROP ZONE, 28 ARCHIVE, 34 RIVER, 38 DRAWER | Drag the card into a container. |

## 3. The 10 strongest (relief × fun × clarity)

1. **1 POP**: zero learning curve; instant micro-wins; scales well to any input. This is the template to copy.
2. **11 PRESSURE POP**: the only game that trains regulation (build, then a controlled release). Make it the panic and anger flagship once the window is visible and misses are forgiving.
3. **18 BURN**: strong ritual closure for anger, grief and shame; hold-anticipation-catharsis.
4. **15 SHRED**: a visceral, legible destruction scene; good for anger and guilt.
5. **24 SLINGSHOT**: real tension-and-release physics in the hand; good for anxiety and stress.
6. **25 SWIPE AWAY**: a culturally native "nope" gesture; commitment is rewarded. Viral-friendly.
7. **4 STOMP**: the best-feeling impact game in cluster A; the anger hero.
8. **21 BIN**: direct drag-into-container for overwhelm; satisfying lid slam.
9. **36 CLOUD PASS**: the unique "slower wins" rule teaches calm. A rare mechanic aimed at panic.
10. **55 HEADLINE**: "turn down the drama, keep the words", a precise reframe for catastrophising and panic.

Honourable mentions: 34 RIVER (classic defusion), 29 MUTE (inner-critic volume), 31 BACK SEAT (ACT), 52 SUBTITLES (humour).

## 4. The 10 weakest or most redundant

1. **5 HAMMER**: the timing is fake; one tap ×6; the guide lies. Cut it or make it a real timing game.
2. **17 BOSS BATTLE**: hidden order, invisible word, silent fails. Broken as a "fear" game.
3. **50 UNFINISHED SENTENCE**: typing-heavy; can deepen catastrophising; no progress; ignores 5 of 6 chunks.
4. **9 LASER SLICE**: the guide contradicts the mechanic; a cluster-A clone.
5. **16 MELT**: the guide contradicts the mechanic; a cluster-A clone.
6. **23 VACUUM**: fully passive; duplicates FLUSH.
7. **38 DRAWER**: a three-step chore; duplicates ARCHIVE (28).
8. **42 UNTANGLE**: hidden order; drag distance is meaningless.
9. **12 BOUNCE OUT**: the promised shrink is not implemented; you tap a button; duplicates CRUSH.
10. **10 DOMINO DROP**: one tap then watch; the "which word started it" insight is not implemented.

Also weak: 46 UNPIN, 49 UNZIP, 54 FONT CHECK, 26 SEND TO SPACE, 35 TRAIN PLATFORM. Each is one drag or tap with its promised payoff missing.

## 5. Gaps: emotional states poorly served by 1-55

- **Panic is under-served.**
  - No game paces breathing: a hold-in/hold-out rhythm at about 5-6 breaths per minute with a longer exhale.
  - No game does sensory grounding (5-4-3-2-1).
  - PRESSURE POP and CLOUD PASS are the only near-fits.
  - Cluster A's "activate tool first" plus silent no-op taps add cognitive load at exactly the wrong moment.
- **Sadness, grief and loneliness are mostly ignored.**
  - 50 of 55 games destroy, bin or distance the feeling.
  - Nothing comforts: no warm/hold/hug, no self-compassion, no "light a candle and keep the memory", no connection or sending kindness. Only 33 FLOAT AWAY and 40 PAPER PLANE are gentle.
  - **Loneliness has no game at all.**
- **Shame/guilt** is served only by destroying the thing (ERASE, SHRED, BURN, CRUMPLE). There is no self-compassion reframe ("what would you say to a friend?"). 51 MIRROR FLIP is too weak to cover it.
- **Numbness** has nothing that raises arousal. Every game assumes excess activation; a numb user needs colour, sound and touch-rich "wake-up" play.
- **Fear** has no approach or exposure mechanic, such as bringing the scary thing closer and watching it shrink. BOSS BATTLE, the intended fear game, is broken.
- **Jealousy and comparison** get only a plug drag (47) and an orb drag (45). There is no turn toward one's own gains, gratitude or abundance.
- **Anger** has many discharge games (2, 4, 15, 18) but no cool-down second act. Arousal stays high after rapid tapping, with no "smash, then slow exhale" arc.
- **No game ends positive.** Every game ends in deletion and none shows what grows in the empty space. That positive turn is the core "Inside Out" beat: Joy and Sadness integrate rather than one being destroyed.
- **No game takes an intensity reading** ("how big is it, 1-10?") before and after. 37 ELEVATOR hard-codes 10 → 1. There is no proof-of-shift loop, which is the dopamine "I went from 8 to 3" moment.

## 6. Cross-cutting fixes these rows point to (for the redesign agent)

1. **Guide arrows.** Add an arrow to every legacy game, aimed at the selector in the "target CSS" column. The global guide card should point at the live element.
   - For sequence games, the arrow must follow `step`: `.weakSpot.w{step}`, `.knot.k{step}`, `.balloonWeight.w{step}`, `.paperCorner.c{step}`.
   - For cluster A, the arrow should first point at the `*ToolDock` / `*ActivateBtn` / `*ScissorPicker`, then at the next bubble whose hits are below 3.
2. **Render the dead `hint`** (the second argument to `shell()`), or fix `SHORT_ACTION` and the GAMES `action` text for the 12 mismatches listed in section 0.
3. **Raise the minimum font size to about 13px** for `.literalStatus`, `.toolHitCount`, `.orbitButtons/.genreKeys/.productionStrip button`, `.parkBay`, `.uniqControl` and `.engineProgressText`.
4. **Cut the rounds.** Collapse 6 rounds to 1-3, or deduplicate repeated chunks, so short inputs don't replay the same word.
5. **Hold handlers.** Add `onPointerLeave` / `onPointerCancel` to the hold-to-charge `.uniqControl` buttons (11, 13, 39).
