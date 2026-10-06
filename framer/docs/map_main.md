# MAP: main component `ThinkStillReleaseArcade(props)` + top-level render tree

Baseline: commit `485500c`, `src/00_arcade.jsx` md5 `b9e220c391b7e86bfb46b8c718e7f489` (22,786 lines), `src/99_pixar.jsx` md5 `8457fe0d…` (368 lines).
Line numbers below are for that baseline; **always do string replacement on the quoted anchors** (every anchor marked ✔ was verified to occur exactly once in its file). Anchors are shown in fenced blocks with exact leading spaces.

Key file-scope facts
- `00_arcade.jsx` lines 1-3 own the imports (`React`, `addPropertyControls, ControlType`, `motion`). No `export` in this file; the only `export default` is `ThinkStillReleaseArcadePixar` in `99_pixar.jsx` L231, which renders `<ThinkStillReleaseArcade {...arcadeProps} />` (L313).
- build order: `00_arcade.jsx` → `src/eos/*.jsx` (sorted) → `99_pixar.jsx`, one shared scope. **Function declarations hoist** (main component may call `EosFoo()` defined later). **`const` does not**: an eos module must NOT use `PX_B` / `pxNoise` / `PIXAR_CSS` at module top level (TDZ — 99_pixar is evaluated after eos). Define your own `EOS_*` constants.
- Many long one-line CSS strings: L4-30 (`TINY_SOUNDTRACK_V2_CSS` … `GLOBAL_PIXAR_CINEMATIC_ALL_GAMES_CSS`), L21048-21056 (inside the component). Base CSS is gzipped base64 `CSS_GZIP_B64` L31-56, decoded at runtime by `useArcadeCss()` L22686 (DecompressionStream). Rules inside the gz blob cannot be string-replaced → override them with later CSS.
- `.tsArcade` CSS uses `!important` + specificity ~(0,3,0)-(0,4,0). To win, use `!important` and an ID-boosted prefix, e.g. `const EOS_B = ".tsPixarRoot:not(#eosA):not(#eosB)"` (same trick as `PX_B` in 99_pixar L16).

---------------------------------------------------------------------------------------------------
## 0. Render tree (top level)

```
ThinkStillReleaseArcadePixar (99_pixar L231)          div.tsPixarRoot (+ <style>{PIXAR_CSS}</style>)
 ├─ ThinkStillReleaseArcade (00 L21015)                div.tsArcade.stage-{input|play|reveal}[.hasUploadedImage][.releaseGlobal99Upgrade]
 │   ├─ <style> cssText + many *_CSS (L21899-21949; two lists: legacy (id<100) vs new (id>=100))
 │   ├─ div.ambient.a1, div.ambient.a2, div.scan        (L21951-21953)
 │   ├─ InfinityField (L21954)                          div.infinityField.infinity-{stage} > i×18 (8 if reduced)
 │   ├─ ArcadeCharacterAtmosphere (L21959)              only renders when stage==="reveal" (L3320)
 │   └─ div.shell  (grid rows 52px | 1fr | 64px; mobile ≤900px: 48px | 1fr | 106px)
 │       ├─ header.releaseConsoleHeader (L21966)  × close | title | .releaseScoreBar (LVL, ⚡score) | 🔊
 │       ├─ section.releaseStage (L22011)  position:relative; overflow:hidden; z 22
 │       │    ├─ input idle:  div.releaseIdleStage (.ts-abyss-field + .releaseIdleStory 4-step guide)  L22012-22093
 │       │    ├─ play:        div.releaseGameHost(ref=gameHostRef, abs inset 0, z 2) > <ReleaseGameEngine/>  L22095-22122
 │       │    └─ reveal:      div.releaseCompleteOverlay > .releaseCompleteShell  L22124-22292
 │       └─ div.releaseComposer (L22295, z 240)  input.releaseThoughtInput + mic | hidden file input | ＋ upload | .releaseChoiceWrap (game menu) | .releaseComposerStatus
 └─ PixarLightRig (99 L176)  div.tsPxRig (abs inset 0, z 2147483000, pointer-events none): grade/key/rim/rays, 9× .tsPxBokeh, 14× .tsPxDust, vignette
```

`ReleaseGameEngine` (L21773-21774):
```js
    const useLegacyGame = !!selected && Number(selected.id || 0) < 100
    const ReleaseGameEngine = useLegacyGame ? GameEngineLegacy : GameEngine
```
**Important (differs from the task brief):** ids 1-99 run `GameEngineLegacy` (L18365) → `RoutedGameContentLegacy` (L18281); only ids 100-110 run `GameEngine` (L19395) → `RoutedGameContent` (L18911). Consequences:
- Legacy HUD = only `GAME PROGRESS · N%` (L18803). **No sparks/tokens/chain/LVL pills and no XP writes** for ids <100.
- New `GameEngine` HUD = `{shiftReward.meter} · N%` + `.tsShiftRewardHud` pills (sparks/tokens/chain/LVL) (L20781-20801).
- Per-bubble DOM-injected arrow cue `.tsDynamicActionCue > .tsDynamicActionArrow + .tsDynamicActionText` exists only in `GameEngine` (L20289-20324, on `.tsThoughtLabelHost` units) → only ids ≥100.
- Guide-panel arrow `i.guideActionArrow` in `GameEngine` is gated by `Number(p.game?.id || 0) < 100` (L20835) which is never true there → **dead**. Legacy guide (L18836-18841) has no arrow. ⇒ effectively *no game shows a guide arrow in the LIVE GUIDE panel today.*
- Every game (both engines) renders, inside `div.engineProgressWrap.cinematicEngineShell > div.cinematicContentShell`: `CinematicStageFX`, `CharacterEmotionFX`, `div.globalPlayGuide.hypnoticGuide` (header "`{name} · LIVE GUIDE`", `.guideStepCard` small+span, `.globalMindBend`), then the game's root, which **always has class `.arena`** (e.g. `.arena.burstArena`, `.arena.uniqArena`, `.arena.cleanseArena`).

---------------------------------------------------------------------------------------------------
## 1. State + refs (L21016-21142)

Props (L21016-21028): `title="EMOTIONAL RELEASE CONSOLE"`, `accent="#00D9FF"`, `accent2="#C000FF"`, `background="#000000"`, `soundOn=true`, `hapticsOn=true`, `musicOnDefault=false`, `musicVolume=.35`, `tapOutBpm=92`, `bubbleTextPx=4`, `maxWidth=1180`. Property controls L22719-22786 (Pixar wrapper spreads them + adds pixarIntensity/Warmth/Parallax/Squash/Bokeh=9/Dust=14, 99 L324-368).

| line | declaration | meaning |
|---|---|---|
| 21042 | `const idleEmotionTick = useEmotionSecond()` | ticks every 4.2s (L3196) → idle comet image |
| 21057 | `const cssText = useArcadeCss()` | decoded gz CSS; while `""` the component returns "LOADING THINKSTILL…" (L21816-21834) |
| 21058 | `const reduced = useReducedMotion()` | framer-motion |
| 21059 | `const [sound, setSound] = React.useState(!!soundOn)` | SFX+music master |
| 21060-61 | `sfx = useSfx(sound)`, `rainSfx = useRainSfx(sound)` | `sfx(kind)` kinds: tap, pop, soft, win, spark, chime, bell, plink, clack, hum, string, tone |
| 21062 | `const [musicOn, setMusicOn] = React.useState(!!musicOnDefault)` | `useSharedMusic(musicOn && sound, musicVolume, bubble)` L21126 |
| 21063 | `const [selected, setSelected] = React.useState(null)` | current GAMES object |
| 21064 | `const [stage, setStage] = React.useState("input")` | stage machine (§2) |
| 21065 | `const [raw, setRaw] = React.useState("")` | text in `input.releaseThoughtInput` (max 2000) |
| 21066 | `const [entries, setEntries] = React.useState([])` | word-chunks frozen at launch |
| 21067 | `const [uploadedImages, setUploadedImages] = React.useState([])` | data-URLs, max `MAX_UPLOAD_IMAGES`=6 |
| 21068 | `const [materialRevision, setMaterialRevision] = React.useState(0)` | bumped when text/images change during play → engine remount |
| 21069 | `uploadPopupOpen` | ＋ popup |
| 21070 | `const [gameChoice, setGameChoice] = React.useState("")` | `""` / `"auto"` / `String(id)` |
| 21071 | `gameMenuOpen` | `.releaseChoiceMenu` open |
| 21072 | `const [tone] = React.useState("neutral")` | unused |
| 21073 | `statusText` | toast in `.releaseComposerStatus`; set via `showStatus(msg, ms=1800)` L21143 |
| 21074 | `listening` | mic |
| 21075 | `const [score, setScore] = React.useState(() => lsNum(SCORE_KEY, 0))` | header ⚡ points |
| 21076 | `const [played, setPlayed] = React.useState(() => lsJson(PLAYED_KEY, []))` | ids ever completed |
| 21077 | `lastGain` | shown "+N STILL" on reveal |
| 21078 | `const [releaseCheck, setReleaseCheck] = React.useState(null)` | reveal "FEEL A SHIFT?" `null`/`"yes"`/`"no"` |
| 21079 | `variationSeed` (init `Date.now() % 1000003`) | +1 on launch, +101 replay, +7 clear; part of engine key |
| 21083 | `uploadSlots` memo | `expandUploadImageSlots(uploadedImages, 6)` |
| 21087 | `reactionSlots` memo | `releaseEmotionSet(selected,false,10,variationSeed,materialRevision, entries\|\|cleanEntries(raw))` emotion character images |
| 21106-07 | `visibleSlots`, `visibleImage` | fed to CSS vars `--upload-image[-1..10]` on root (L21844-21896) and engine props |
| 21108 | `renderedEntries` memo | in play: live `cleanEntries(raw)` (or image entries) → `normaliseImageOnlyEntries` → passed as `entries` to engine |
| 21118 | `signatureQuickPlay` memo | `SIGNATURE_QUICK_PLAY` ids → games |
| 21125 | `bubble = FAMILY_BUBBLE[selected?.family\|\|"Release"]` | music flavour |
| 21127-42 | refs | `fileInputRef, uploadPopupRef, uploadTriggerRef, speechRef, speechKeepListeningRef, speechRestartTimerRef, speechSilenceTimerRef, speechBaseTextRef, speechCommittedRef, speechCurrentSegmentRef, speechLastHeardAtRef, speechHasHeardWordsRef, gameHostRef (→ .releaseGameHost), gameMenuRef, donePendingRef (double-finish guard), statusTimerRef` |
| 21775-76 | `scoreLevel = Math.floor(score / 1000) + 1`, `scoreProgress = clamp4..100((score % 1000)/10)` | header bar |
| 21777 | `persistentFinalFeedback` memo | reveal headline/shift (special-cased ids 103,105,106,107,108; else `dynamicReleaseFinishFeedback` + `releaseGamePositiveFlavor`) |
| 21395 | `releaseReadyToStart = stage==="input" && !!gameChoice && (raw.trim() \|\| images)` | choice button turns into START (`.ready`) |
| 21399 | `pendingReleaseLabel` | "THINKSTILL" or game name |

Effects: L21164 close upload popup on outside pointer; L21185 publishes `window.__tsUploadedThoughtImage(s)`; **L21197 live re-materialise**: while `stage==="play"`, any change to `raw`/`uploadedImages` → `setEntries(next)`, `donePendingRef=false`, `setMaterialRevision(r+1)` (engine remounts because key = `${selected.id}-${variationSeed}-${materialRevision}` L22099); L21209 unmount cleanup; L21483 game-menu outside-click/Escape close.

---------------------------------------------------------------------------------------------------
## 2. Stage machine

Values: `"input"` → `"play"` → `"reveal"` (no others). Root class `tsArcade stage-${stage}`; huge amounts of CSS key off `.stage-input/.stage-play/.stage-reveal` — **do not invent a new stage value** (e.g. "checkin") or idle/composer CSS breaks; use an overlay flag instead (§9).

Every `setStage` call (all inside the main component):
| line | function | trigger | to |
|---|---|---|---|
| 21424 | `startChosenGame(g)` (L21403) | menu item click, START/Enter via `launchRelease`, `startThinkStillChoice`, `tryRecommendedRelease`, `openAdjacentRelease` (‹PREVIOUS / NEXT›) | `"play"` (also `setSelected(g)`, `setEntries(e)`, `variationSeed+1`, `sfx("win")`/`"soft"` if switching) |
| 21540 | `done(bonus)` (L21519) | engine `onDone` — `GameEngine.wrappedDone` calls `setTimeout(() => p.onDone(bonus), finishAdvanceDelayMs)` L19803 where delay = `max(4000, finishHoldMs)`; main passes `finishHoldMs` 1600 (id 110) / 3400 (108) / 3000 → effectively 4000ms after finish. Legacy: L18594 same pattern | `"reveal"` |
| 21550 | `replay()` (L21545) | reveal "↻ AGAIN" | `"play"` (variationSeed+101) |
| 21556 | `clearForNext()` (L21553) | header × (`releaseClose`, any stage), reveal "NEW THOUGHT" | `"input"` (clears selected, entries, raw, images, gameChoice) |

Flow helpers: `launchRelease` L21499 (no choice → status "CHOOSE A RELEASE GAME" + open menu; `"auto"` → `startThinkStillChoice`; else `startChosenGame(resolveChosenGame())`). Enter key in the input (L22327-22332) and the `.releaseChoiceButton` when `releaseReadyToStart` (L22517) call `launchRelease`. If there is no text/image, `startChosenGame` just stores the choice + status "ADD TEXT OR AN IMAGE · {name} IS SELECTED" (L21410-21414).

---------------------------------------------------------------------------------------------------
## 3. Entries from text / mic / images

- **Text → entries**: `cleanEntries(raw)` L2558: `tokeniseWords` (L2546) splits on whitespace, strips punctuation; <6 tokens → repeated cyclically to exactly 6 (`MIN_VISIBLE_WORD_BUBBLES`=6); ≥6 tokens → grouped into 6 (`MAX_TEXT_WORD_BUBBLES`) roughly equal chunks. So entries is always 6 strings for text.
- Launch-time (`startChosenGame` L21405-21408 / `startThinkStillChoice` L21458-21461):
```js
            let e = cleanEntries(raw)
            if (!e.length && uploadedImages.length)
                e = imageOnlyEntriesForUploads(uploadedImages)
            if (!e.length && entries.length) e = [...entries]
```
- Images only: `imageOnlyEntriesForUploads(images)` L2505 → 6× `"UPLOADED IMAGE"` (sentinel; `displayText` hides it). `normaliseImageOnlyEntries` L2511.
- Upload: hidden `input.releaseHiddenFile` (L22350, accept jpeg/png/gif, multiple) → `isAllowedUploadImage` + `fileToDataUrl` → `setUploadedImages` (cap 6); popup `.releaseUploadPopup` with 6 `.releaseUploadSlot` (L22421-22510).
- Mic: `toggleMic` L21567-21772, Web Speech API (`lang="en-AU"`, continuous, interim) appends to `raw` (base text + committed + live segment, overlap-deduped), stops after 3s silence (`SILENCE_TO_FINISH_MS`) or 10s no speech. Does **not** auto-launch.
- While playing, editing the input re-materialises the running game (effect L21197).

---------------------------------------------------------------------------------------------------
## 4. Game choice + emotion detection

Data: `GAMES` L58-2005 (110 games, ids 1-110). `FEATURED = [1, 2, 21, 67, 109]` L2006 (**unused**). `SIGNATURE_QUICK_PLAY = [1, 3, 4, 6, 16, 15, 22, 18, 25, 23, 24, 19, 41, 71, 61]` L2007-2009. `UNIQUE_HERO_IDS` L10639 (ids with bespoke engines; others → `UniqueReleaseEngine[Legacy]`). `GameCard` L20945 and `readInfinitySession/writeInfinitySession` (sessionStorage `SESSION_KEY`) L2371-2396 are **dead code**.

Families → ids (for an emotion router):
- Destroy: 1 POP, 2 CRUSH, 3 CRACK, 4 STOMP, 5 HAMMER, 6 ZAP, 7 PIN POP, 8 METEOR, 9 LASER SLICE, 10 DOMINO DROP, 11 PRESSURE POP, 12 BOUNCE OUT, 13 SQUASH, 14 CRUMPLE, 15 SHRED, 16 MELT, 17 BOSS BATTLE, 19 ERASE, 20 GLITCH OUT
- Release: 18 BURN, 75 INK BLEED, 109 CLEANSE, 110 RAIN OUT
- Discard: 21 BIN, 22 FLUSH, 23 VACUUM, 25 SWIPE AWAY, 27 DROP ZONE, 28 ARCHIVE, 32 PARK IT, 38 DRAWER
- Distance: 24 SLINGSHOT, 26 SEND TO SPACE, 29 MUTE, 30 ZOOM OUT, 31 BACK SEAT, 33 FLOAT AWAY, 34 RIVER, 35 TRAIN PLATFORM, 36 CLOUD PASS, 37 ELEVATOR DOWN, 39 BLACK HOLE, 40 PAPER PLANE
- Detach: 41 UNHOOK, 42 UNTANGLE, 43 CUT THE LOOP, 44 VELCRO, 45 MAGNETS, 46 UNPIN, 47 UNFOLLOW, 48 UNSTICK, 49 UNZIP
- Reveal: 50 UNFINISHED SENTENCE, 96 SCRATCH REVEAL, 97 X-RAY, 98 MAGIC TRAPDOOR, 99 THE ECHO CHAMBER, 100 HOT POTATO, 101 TUG OF WAR, 102 FINGER TRAP, 103 SINKING PLATFORM, 104 VOLUME KNOB
- Reframe: 51 MIRROR FLIP … 60 CROP TOOL (51-60)
- Interrupt: 61 FREEZE, 62 NET IT, 63 PATTERN POP, 64 RED LIGHT, 65 PAUSE BUTTON, 66 BUFFERING, 71 DEFUSE, 72 CATCH & LABEL, 73 TRAFFIC LIGHT, 74 BUBBLE WRAP, 76 REVERSE IT, 77 SLOW MOTION, 78 ONE WORD, 79 MISS ON PURPOSE, 80 DON'T TAP
- Rhythm: 67 TAP OUT, 68 DRUM IT, 69 PULSE, 70 METRONOME
- Balance: 81 STACK IT, 82 SEESAW, 91 PRIORITY BLOCKS, 92 SCALE DOWN, 93 SPACE MAKER, 94 JUGGLE, 95 SHELF IT
- Sort: 83 SORT STATION, 84 MINE / NOT MINE, 85 CONTROL PANEL, 86 FACT / STORY
- Choice: 87 KEEP / DROP, 88 TRADE MACHINE, 89 DOOR A / B, 90 COIN FLIP REACTION
- Absurdity: 105 DRAMA MACHINE, 106 TINY SOUNDTRACK, 107 GO WEIRD, 108 WORD SALAD

Manual list (`.releaseChoiceMenu` L22587-22672): first `button.releaseChoiceItem` "LET THINKSTILL CHOOSE" (`onClick={startThinkStillChoice}`), label "15 SIGNATURE RELEASES" + `signatureQuickPlay`, label "MORE RELEASES · 95" + remaining GAMES; each item `onClick={() => startChosenGame(g)}`; icon `emotionSrc(FAMILY_BUBBLE[g.family], FAMILY_EMOTIONS[g.family][g.id % 4])`.

**`chooseRelevantGame(thought, excludeId, contextGame)`** L21231-21351 (useCallback, deps `[played.join("|")]`): normalises text; per game score = +1.1 per token (>2 chars) found in `name family prompt object action mechanism hook mindBend`; **+4.25 per hit in its own hard-coded `keywordBoost`** map (only ids 1,3,4,6,16,15,22,18,25,23,24,19,41,71,61 — e.g. 4 STOMP ← angry/anger/mad/furious/rage; 71 DEFUSE ← urgent/panic/alarm/anxious/anxiety/fear; 61 FREEZE ← racing/spiral/overthink); +2.75 if contextGame is Release-family and mechanism contains "distanc"; +0.12×family affinity with last 6 played; +0.18 if different family from context; −1.2 if in last 6 played; +0.18 if never played; tiny index tiebreak. Used by:
- `startThinkStillChoice` L21457 (`const best = chooseRelevantGame(sourceThought)` L21472) — "LET THINKSTILL CHOOSE"
- `recommendedReleaseGame` L21361-21365 — reveal "TRY {name}" (`tryRecommendedRelease` L21452)
- "infinity"/next: `openAdjacentRelease(±1)` L21440 just walks GAMES array order (‹ PREVIOUS / NEXT ›). No auto-advance; no infinity loop is wired.

**Emotion detection**: `RELEASE_INPUT_EMOTION_PROFILES` L10668-10858, ids in order `panic` (L10670, regex `/\b(panic|panicky|panic attack|anxious|anxiety|alarm|terrified|heart racing|cant breathe|can't breathe)\b/i`), `anger` (L10698), `overwhelm` (L10733), `sadness` (L10768), `fear` (L10803), `rumination` (L10831); fallback `RELEASE_DEFAULT_EMOTION_PROFILE` id `general` (L10859). Each profile: `{id, test, actions[6], feedback[8], secondary[6], finish[3]}`. `releaseEmotionProfile(input)` L10882 = first regex match (array is joined). Gotchas: first-match wins (e.g. "angry and anxious" → panic); `\b…\b` whole-word matching misses unlisted inflections — **"panicking", "raged", "sadder", "overwhelming", "scary", "annoyed"** all fall to `general` (verified live: "i am panicking about tomorrow" → "SHIFT SPARKS" = general).
**It does NOT influence game choice** (chooseRelevantGame never calls it). It only drives copy/visuals: `dynamicReleaseActionCue` L10942 (cue verb target), `globalReleaseGuideText` L2200 (guide line), `dynamicReleaseStepFeedback` L11100 / `dynamicReleaseFinishFeedback` L11117 (`RELEASE_COMPACT_FEEDBACK/FINISH[profile.id]`), `releaseRewardProfile` L11150 (spark naming: panic→"CALM SPARKS"/meter "SLOW-DOWN"/✦, anger→"COOL SPARKS"/"COOL-DOWN"/❄, overwhelm→SPACE, sadness→LIGHT, fear→GROUND, rumination→CLEAR/"UNLOOP", general→"SHIFT SPARKS"/"SHIFT"), `releaseEmotionSet` L3094 (character image shuffle salt, L3106), L6318.

Gesture direction helper (reuse for arrows): `releaseGestureForGame(game)` L10889-10941 → `{arrow: "→"|"←"|"↑"|"↗"|"↘"|"↓"|"↔"|"↻"|"", verb: "DRAG"|"SWIPE"|"PULL"|"LIFT"|"FLICK"|"LOWER"|"TAP"|"HOLD"|"SCRATCH"|"SHAKE"|"TURN"|"STOMP"}` parsed from `game.action + game.hook`; arrows for hold/tap/etc. are blank for ids ≥100. `dynamicReleaseActionCue(game, entries, i)` L10942 → `{...gesture, target, label: "VERB TO TARGET", profile}`; `gestureGuideForGame` L11254 alias.

---------------------------------------------------------------------------------------------------
## 5. XP / LVL / sparks / tokens / streak + storage keys

| system | where | key (localStorage unless noted) | rules |
|---|---|---|---|
| header score "⚡ N" + "LVL n" | main `done()` L21519-21544, header L21986-21995 | `SCORE_KEY = "__ts_release_arcade_score_v1"` L2368 | `gain = round(100 + bonus + min(180, entries.join(" ").length*2))`; LVL = floor(score/1000)+1; bar = (score%1000)/10 %. Reveal shows "RELEASE COMPLETE · +{lastGain} STILL". |
| played list | `done()` | `PLAYED_KEY = "__ts_release_arcade_played_v1"` L2369 (JSON array of ids) | unique ids; used by chooseRelevantGame novelty/recency |
| shift sparks (XP) | `GameEngine` only (ids ≥100): state L19421, step L19640-19656, finish L19723-19738 | `RELEASE_SHIFT_XP_KEY = "__ts_release_shift_xp_v2"` L11147 | step +8…+18 (`8 + min(10,(chain-1)*2)`, ≥220ms apart); finish +35…+65 (`35 + min(30, chain*5)`); level size `RELEASE_SHIFT_LEVEL_SIZE = 250` L11149 |
| tokens | `GameEngine` finish L19739-19745 | `RELEASE_SHIFT_TOKEN_KEY = "__ts_release_shift_tokens_v2"` L11148 | +1 per finished game ("◆ +1") |
| chain | `GameEngine` `rewardChain`/`rewardChainRef` L19427-19430 | none (per game mount) | "CHAIN ×n" |
| reward burst rotation | L18984-19030 | `thinkstill:reward-rotation:v1:${id}` | which RewardSurgeBurst variant |
| shared media reset | `useSharedMusic` L2811 | `RESET_SHARED_MEDIA_KEY = "__ts_reset_shared_media_v1"` | music |
| infinity session (dead) | L2370-2396 | sessionStorage `SESSION_KEY = "__ts_release_arcade_session_v2"` | unused |
| streak | — | — | **no persistent/daily streak exists** (only "streak" in GAMES copy). |

Storage helpers: `lsNum(k,d)` L2529, `lsJson(k,d)` L2537 (SSR/try-safe). Writes are plain `try { localStorage.setItem(...) } catch {}`.

HUD font sizes measured live (Chromium, Pixar wrapper, 1280×860 / 390×844):
- header `.releaseScoreBar span/strong` ("LVL 1", "⚡ 0"): 12px / 10px (CSS in `resetShellCss` L21055: `font:900 8.5px/1 Inter…`, mobile `strong{font-size:7px}` and `span{display:none}` variants)
- `.engineProgressText` ("GAME PROGRESS · 0%" / "SHIFT · 0%"): 10px / 9px (rules in L21055 `font:950 8px/1`, `font-size:6.5px`, and L21056 `font-size:9px`)
- `.tsShiftRewardPill` ("✦ 0 SHIFT SPARKS", "◆ 0 TOKENS", "CHAIN ×0"): **8.3px**; `.tsShiftLevel>b` ("LVL 1"): **7px** (rules in `GLOBAL_SHIFT_REWARD_LOOP_CSS` L25)
- LIVE GUIDE: header 12.5/10.2px, `.guideStepCard small` ("How to play") 10/8.7px, copy 12.4/9.8px, `.globalMindBend strong` 9.8/8.5px, `em` 11.8/9.3px (rules in L5-8, 28-30, 21053 strings + gz CSS)
→ fix by one EOS CSS block with ID-boosted selectors, e.g. `${EOS_B} .tsArcade .releaseScoreBar :is(span,strong){font-size:clamp(13px,1.3vw,16px)!important}` `${EOS_B} .tsArcade.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b,.engineProgressText){font-size:clamp(12px,1.1vw,15px)!important}` (also raise `.tsShiftRewardPill` `height:20px` and `.releaseScoreBar` `height/min-width`).

---------------------------------------------------------------------------------------------------
## 6. Header / HUD / bottom bar markup

Header L21966-22009:
```
header.releaseConsoleHeader
  button.releaseClose  (onClick={clearForNext}, "×")
  div.releaseHeaderCenter > div.releaseConsoleTitle > span.releaseTitleMain{displayTitle} span.releaseTitleBy"by" span.releaseTitleBrand"THINKSTILL"
  div.releaseScoreBar[aria-label="Level n, score s"] > span"LVL {scoreLevel}" + i.releaseScoreTrack>i[style.width] + strong"⚡ {score}"
  button.releaseHeaderSound[.active]  (🔊/🔇; toggles sound, music)
```
CSS: `.releaseConsoleHeader` 52px (48px ≤900px), `padding:0 292px 0 10px`, z 220; `.releaseScoreBar` absolute right 52px, h 30px, min-width 172px.

Composer L22295-22681 (`div.releaseComposer`, grid `minmax(220px,1fr) 42px 188px`, h 64px; ≤900px h 106px):
```
div.releaseInputWrap > input.releaseThoughtInput (placeholder "Put your emotion, feeling or thought into words to release it.") + button.releaseInputMic[.active] (🎙/●)
input.releaseHiddenFile[type=file]
button.releaseIconButton[.active] "＋" (+ span.releaseUploadCount)
[div.releaseUploadBackdrop > div.releaseUploadPopup …]
div.releaseChoiceWrap(ref=gameMenuRef) > button.releaseChoiceButton[.open][.ready] (img | span.releaseChoiceAutoIcon"✦") span.choiceCopy span.choiceArrow"▾"
    [div.releaseChoiceMenu[role=listbox] > button.releaseChoiceItem… / div.releaseChoiceGroupLabel]
[div.releaseComposerStatus{statusText}]
```
Play HUD (inside engine): `div.engineProgressWrap.cinematicEngineShell.engine-eXX.family-xxx > div.engineProgressHud > div.engineProgressTrack[role=progressbar] > i + span.engineProgressText` (+ `div.tsShiftRewardHud[.isHit] > span.tsShiftRewardPill.spark|.token|.chain + span.tsShiftLevel>i+b` in GameEngine only). Guide: `div.globalPlayGuide.hypnoticGuide[.isActive][.isComplete][.guideHit]` (abs, ~bottom-left 460×157 at 1280w) > `.guideAmbient`, `.guideSweep`, `.guideHeaderRow>b+i.guidePulseDot`, `.guideStepCard>[i.guideActionArrow]+small+span`, `.globalMindBend>strong+em`. Guide text from `globalReleaseGuideText(game, pct, status, entries)` L2200 ("How to play · {arrow} {action} · {target}" / "Next move · …" / "Complete · …"), split by `splitGlobalGuideText` L2338. Legacy uses `globalReleaseGuideTextLegacy` L14506.

---------------------------------------------------------------------------------------------------
## 7. Background dots

### 7a. `InfinityField` L20916-20944 (rendered L21954-21958, `seed={variationSeed + (selected?.id || 0)}`)
```js
function InfinityField({ seed, reduced, stage }) {
    const count = reduced ? 8 : 18
    return (
        <div className={`infinityField infinity-${stage}`} aria-hidden="true">
```
each `<i>`: `left 4-96%`, `top 5-91%`, size 2-8px, inline `animationDuration 8-17s`, negative `animationDelay`, `--ix` ±21px, `--iy` ±17px (all from `noveltyNoise`, L2397).
CSS lives **only in the gz blob** (`CSS_GZIP_B64`): 
```css
.tsArcade .infinityField{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0;opacity:.46;mix-blend-mode:screen}
.tsArcade .infinityField i{position:absolute;border-radius:999px;background:radial-gradient(circle,#fff 0 18%,hsla(var(--flow-hue),100%,72%,.96) 24%,hsla(var(--flow-hue-2),100%,68%,.28) 62%,transparent 72%);box-shadow:0 0 12px hsla(var(--flow-hue),100%,70%,.42),…;animation:tsInfinityDrift ease-in-out infinite alternate;will-change:transform,opacity}
.tsArcade.stage-play .infinityField{opacity:.64}  .tsArcade.stage-reveal .infinityField{opacity:.78}
@keyframes tsInfinityDrift{0%{transform:translate3d(0,0,0) scale(.72);opacity:.16}45%{opacity:.68}100%{transform:translate3d(var(--ix),var(--iy),0) scale(1.35);opacity:.24}}
@media(prefers-reduced-motion:reduce){.tsArcade .infinityField i{animation:none!important} .tsArcade .infinityField{opacity:.22}}
```
plus in `resetShellCss` L21055: `.tsArcade.stage-play .infinityField{opacity:.18!important;}`.
**BUG (verified live): `--flow-hue`/`--flow-hue-2` are never defined anywhere → background & box-shadow are invalid → computed `background-image:none`, `box-shadow:none` → the 18 InfinityField dots are invisible.** To "merge to centre": set `--flow-hue:190;--flow-hue-2:280` (e.g. inline on the `.infinityField` div or via EOS CSS) and override the animation, e.g.
```css
.tsArcade .infinityField i{animation-name:eosMergeCenter!important;animation-direction:normal!important;animation-timing-function:cubic-bezier(.55,0,.25,1)!important}
@keyframes eosMergeCenter{0%{opacity:0;scale:.6}15%{opacity:.85}80%{left:50%;top:50%;opacity:.9;scale:1}100%{left:50%;top:50%;opacity:0;scale:.15}}
```
(animating `left/top` to 50% works because the start values are the inline `left/top`; inline `animationDuration/Delay` are kept). Note `position:fixed` resolves against the viewport (or a transformed Framer ancestor).

### 7b. Pixar motes (`99_pixar.jsx`) — **these are the clearly visible "tiny dots"**
- CSS L101-103: 
```
.tsPxDust{width:3px;height:3px;border-radius:50%;background:rgba(255,236,200,.85);
```
  `box-shadow:0 0 6px rgba(255,220,160,.8);opacity:0; animation:tsPxDust var(--d,11s) linear infinite;animation-delay:var(--dl,0s);`
- Keyframes L106 ✔: `@keyframes tsPxDust{0%{opacity:0;translate:0 0}12%{opacity:.75}88%{opacity:.5}100%{opacity:0;translate:var(--bx,40px) -140px}}` (rises 140px, drifts ±40px)
- Markup L211-225 in `PixarLightRig`: `count = pixarDust` (default 14), style `left: pxNoise(i,21)*100%`, ✔ ``top: `${40 + pxNoise(i, 23) * 60}%`,`` (bottom 60% only), `--d` 8-16s, `--dl` 0..−16s, `--bx` ±40px. Rig container `.tsPxRig{position:absolute;inset:0;pointer-events:none;z-index:2147483000;overflow:hidden}` (covers whole component incl. header/composer).
- Bokeh L99-100/105 (`.tsPxBokeh`, 9 blurred 40-150px blobs, keyframes `tsPxBokeh`, drift `--bx/--by` ±30px).
- Reduced motion L166-168 hides rays/bokeh/dust.
- Merge-to-centre edit = replace the L106 keyframe with e.g. `@keyframes tsPxDust{0%{opacity:0}12%{opacity:.8}82%{left:50%;top:50%;opacity:.9;scale:1.2}100%{left:50%;top:50%;opacity:0;scale:.2}}` and widen spawn `top` to full 0-100% (L218).

### 7c. Other dot layers
- `CinematicStageFX` L2885-2925 (every game, both engines): `div.cinemaDust > i×14` (`left 6+((i*37)%88)%`, `top 7+((i*53)%80)%`, duration 5.5+0.31i s). gz CSS: `.cinemaDust i{position:absolute;width:2px;height:2px;…;opacity:.1;animation:cinemaDustFloat 6s ease-in-out infinite}`; `@keyframes cinemaDustFloat{0%,100%{transform:translate3d(0,18px,0) scale(.65);opacity:.04}45%{opacity:.28}60%{transform:translate3d(12px,-26px,0) scale(1.25);opacity:.16}}`; string CSS `.tsArcade.stage-play .cinemaDust i{box-shadow:0 0 10px rgba(125,241,255,.72)!important}`. Live: all 14 visible in play.
- Idle input stage `.ts-abyss-field` (L22014-22033): `.ts-abyss-particle-a/b/c` (3px, `tsAbyssParticleA/B/C` — **already converge to centre**: `0%{transform:translate3d(-180px,-105px,0)…}100%{transform:translate3d(0,0,0) scale(.10)}`) and `.ts-magnetic-dust-a/b` (`tsMagneticDustA/B`), CSS in `RELEASE_IDLE_STORY_CSS` L10 (anchored at `left:50%;top:52%`).
- `ArcadeCharacterAtmosphere` L3318 (reveal only): 14 floating emotion-character images.
- `.ambient.a1/.a2`, `.scan` — big glows/scanline (gz CSS).

---------------------------------------------------------------------------------------------------
## 8. Reveal / finish flow

1. Game calls `onDone(bonus)` → engine `wrappedDone` (GameEngine L19720-19804 / legacy L18563-18595): `finishLock`, sparks/tokens (new engine only), progress 100, guide "Complete · {profile.finish[0]}", `.globalFinishFeedbackCopy` title card (`dynamicFinishFeedback.headline`, `shift`, "◆ +1 · {icon} +{gain}"), RewardSurgeBurst mega, triple `sfx("win")` + vibrate, then `setTimeout(() => p.onDone(bonus), finishAdvanceDelayMs)` (≥4000ms).
2. Main `done(bonus)` L21519: score/played to localStorage, `setReleaseCheck(null)`, `setStage("reveal")`, vibrate(35).
3. Reveal markup L22124-22292:
```
div.releaseCompleteOverlay > div.releaseCompleteShell
  button.releaseCompleteSideNav.releaseCompletePrev "‹ PREVIOUS"  → openAdjacentRelease(-1)
  div.releaseCompleteCard
    small "RELEASE COMPLETE · +{lastGain} STILL" ; strong {selected.name}
    div.releasePersistentFinalMessage > b{headline} span{shift}
    div.releaseShiftCheck > strong "FEEL A SHIFT?" + div.releaseShiftChoices > button "YES ✓" (setReleaseCheck("yes"), sfx win) / "NOT YET →" ("no") + button.releaseReplaySame "↻ AGAIN" (replay)
    yes → p{selected.mindBend} + div.releaseCompleteActions.releaseCompleteActionsTwo > "NEW THOUGHT"(clearForNext) + button.releaseMorePrimary "TRY {recommended}"(tryRecommendedRelease)
    no  → div.releaseRecommendationPanel > div.releaseRecoDemo.verb-{verb} (img.releaseRecoDemoOrb + span.releaseRecoDemoArrow{gesture.arrow} + span.releaseRecoDemoLabel) + .releaseRecommendationCopy (small/strong/p + .releaseRecommendationActions: TRY / NEW THOUGHT)
  button.releaseCompleteSideNav.releaseCompleteNext "NEXT ›" → openAdjacentRelease(1)
```
`ArcadeCharacterAtmosphere` shows only in reveal. Reveal CSS: `RELEASE_COMPLETION_CHECK_CSS` L26 (`.tsArcade.stage-reveal .releaseCompleteCard{max-width:760px…`), Pixar card style 99 L163.

---------------------------------------------------------------------------------------------------
## 9. Minimal insertion points (fewest edits)

Recommended pattern: put all logic in `src/eos/*.jsx` as hoisted `function Eos…()` components/hooks + a module-level mutable store (avoids touching `useCallback` dep arrays), and make ~7 one-line edits in `00_arcade.jsx`.

```js
// src/eos/10_state.jsx (example)
const EOS_STORE = { emotion: null, before: null, after: null }   // read by router; written by hook
function useEosSession() { /* React.useState for phase/emotion/before/after; mirror into EOS_STORE each render; localStorage EOS_* keys */ }
```

### E1. Session hook — after state block ✔ (L21078)
```
    const [releaseCheck, setReleaseCheck] = React.useState(null)
```
→ append line: `    const eos = useEosSession()`

### E2. Pre-input "emotion check-in" overlay (no new stage value) ✔ (L22011-22012)
Insert before:
```
                    {stage === "input" && !selected ? (
```
→ `{stage === "input" && !selected && eos.phase === "checkin" ? (<EosCheckIn eos={eos} setRaw={setRaw} showStatus={showStatus} sfx={sfx} onGo={startThinkStillChoice} />) : null}`
`.releaseStage` is `position:relative; overflow:hidden; z-index:22` → overlay `position:absolute; inset:0; z-index:30+`; composer (z 240) stays usable underneath. Optionally hide `.releaseIdleStage` while checking in via a class on the overlay sibling or `eos.phase`. To prefill the input use `setRaw("I feel panic — …")` (controlled input). Caveat: `startThinkStillChoice` closes over `raw`; if you `setRaw` and launch in the same tick, pass the text through `EOS_STORE` or launch in a `useEffect` after raw updates (or call `startChosenGame(EosRouteGame(text))` which still reads stale `raw` → `cleanEntries(raw)` empty → falls to `entries`; safest: setRaw, then on next effect call `launchRelease()`).
Reset on clear ✔ (L21553):
```
    const clearForNext = React.useCallback(() => {
```
→ add `        eos.reset?.()` as the next line (or have the hook watch `stage==="input" && !selected`).

### E3. Emotion-aware router ✔
- L21472:
```
        const best = chooseRelevantGame(sourceThought)
```
→ `        const best = EosRouteGame(sourceThought, played) || chooseRelevantGame(sourceThought)`
- L21364:
```
        return chooseRelevantGame(sourceThought, selected.id, selected)
```
→ `        return EosRouteGame(sourceThought, played, selected.id) || chooseRelevantGame(sourceThought, selected.id, selected)`
`EosRouteGame` reads `EOS_STORE.emotion` (picked chip) else `releaseEmotionProfile(text).id` (fix regex inflections in your own matcher, e.g. `/panick?(ing|ed|y)?/`), maps emotion → curated id list (e.g. panic: 61 FREEZE, 77 SLOW MOTION, 69 PULSE, 70 METRONOME, 71 DEFUSE, 109 CLEANSE, 34 RIVER, 33 FLOAT AWAY; anger: 4 STOMP, 2 CRUSH, 5 HAMMER, 15 SHRED, 18 BURN, 6 ZAP, 101 TUG OF WAR, 17 BOSS BATTLE; overwhelm: 23 VACUUM, 93 SPACE MAKER, 95 SHELF IT, 32 PARK IT, 92 SCALE DOWN, 30 ZOOM OUT; sadness: 110 RAIN OUT, 75 INK BLEED, 36 CLOUD PASS, 40 PAPER PLANE, 109 CLEANSE; fear: 86 FACT / STORY, 85 CONTROL PANEL, 84 MINE / NOT MINE, 103 SINKING PLATFORM, 64 RED LIGHT; rumination: 43 CUT THE LOOP, 41 UNHOOK, 99 THE ECHO CHAMBER, 104 VOLUME KNOB, 108 WORD SALAD, 78 ONE WORD), skips last-6 `played`, returns a GAMES object (`GAMES.find(g => g.id === id)`) or `null`. No dep-array edits needed because it reads the store.
- Optional menu group "FOR {EMOTION}" before ✔ (L22608):
```
                                <div className="releaseChoiceGroupLabel">
                                    15 SIGNATURE RELEASES
```
→ insert `<EosMenuGroup played={played} gameChoice={gameChoice} onPick={startChosenGame} />` (render `button.releaseChoiceItem`s with `<span><b>{g.name}</b></span>` so drive.mjs `startGame` still matches `^NAME$`; a duplicate of a game listed earlier is harmless because `.first()` opens the same game).

### E4. Before/after "shift meter"
- Before: captured in `EosCheckIn` (intensity 1-10 slider) → `EOS_STORE.before`. If no check-in, capture at launch ✔ (L21423-21424):
```
            setVariationSeed((v) => v + 1)
            setStage("play")
```
→ insert `            EosMarkLaunch(g, e)` between them (plain function writing EOS_STORE; safe in callback).
- After: on the reveal card, insert before ✔ (L22157):
```
                                    <div className="releaseShiftCheck">
```
→ `<EosShiftMeter eos={eos} game={selected} entries={entries} onAgain={replay} onNext={tryRecommendedRelease} />` (shows BEFORE n → AFTER slider, Δ animation, writes `EOS_*` localStorage history/streak). Hide the old yes/no with CSS `.tsArcade.stage-reveal .releaseShiftCheck .releaseShiftChoices{display:none}` if the meter replaces it, or set `setReleaseCheck("yes"|"no")` from the meter (pass `setReleaseCheck`) so the existing recommendation panels still appear.
- Finish hook point (if needed): `done()` ✔ (L21539-21540):
```
            setReleaseCheck(null)
            setStage("reveal")
```

### E5. Universal guide-arrow overlay (every game, both engines) ✔ (L22124)
Insert before:
```
                    {stage === "reveal" && selected ? (
```
→ `{stage === "play" && selected ? (<EosGuideArrows key={`${selected.id}-${variationSeed}-${materialRevision}`} game={selected} entries={renderedEntries} hostRef={gameHostRef} reduced={!!reduced} />) : null}`
Sibling of `.releaseGameHost` inside `.releaseStage` (relative) → overlay `position:absolute; inset:0; pointer-events:none; z-index:60` (guide is z 48 inside host z 2 stacking context, so any z>2 at this level sits above the game). Use `hostRef.current.querySelector(".cinematicContentShell .arena")` and target, in order: `.tsThoughtLabelHost`, `.tsStandardBubble`, `button.wordBubble`, `.thoughtPotato`, `.cleanseStone`, `.rainCloudUnit`, `[class*=ToolDock]`, `.arena button:not(:disabled)`; excluding `.globalPlayGuide *`. Direction/verb from `releaseGestureForGame(selected)` (L10889) / `dynamicReleaseActionCue(selected, entries, i)` (L10942); fall back to a pulsing "TAP" hand for blank arrows. Re-measure with `ResizeObserver` + `MutationObserver` on the host (games re-render constantly); hide after first successful interaction (`pointerdown` on host) and re-show after ~4s idle; stop when `.globalPlayGuide.isComplete` exists.
Also make the LIVE GUIDE panel show its arrow:
- GameEngine ✔ (L20835): `                        {Number(p.game?.id || 0) < 100 ? (` → `                        {true ? (` so `i.guideActionArrow` renders for ids ≥100 (it already falls back to "↑" via `guideGesture.arrow || "↑"`).
- Legacy ✔ (L18836-18840):
```
                        key={`guide-${p.game.id}-${guideText}`}
                        className="guideStepCard"
                    >
                        <small>{guideParts.label}</small>
```
→ insert `<i className="guideActionArrow" aria-hidden="true">{releaseGestureForGame(p.game).arrow || "↑"}</i>` before `<small>`.

### E6. Global EOS CSS (fonts, dots, arrows) — one insertion ✔ (L21949-21951)
```
            </style>

            <div className="ambient a1" />
```
→ after `</style>` add `            <style>{EOS_GLOBAL_CSS}</style>` (applies to both legacy/new CSS branches; the per-branch concatenation at L21900-21948 is a ternary so appending to one branch only affects ids ≥100). Use ID-boosted selectors + `!important`.
Alternative with zero arcade edits: render `<style>{EOS_GLOBAL_CSS}</style>` and/or `<EosLayer/>` in 99_pixar next to ✔ (99 L313):
```
            <ThinkStillReleaseArcade {...arcadeProps} />
```

### E7. Dots merge to centre
- Pixar motes: replace ✔ 99 L106 keyframe (quoted in §7b) and optionally ✔ 99 L218 `top` spawn; or override from EOS CSS with `.tsPixarRoot .tsPxDust{animation-name:eosMergeCenter!important}`.
- InfinityField: inline `["--flow-hue"]: 190, ["--flow-hue-2"]: 280` via EOS CSS `.tsArcade .infinityField{--flow-hue:190;--flow-hue-2:280}` + override `animation-name` (§7a); remove/override `.tsArcade.stage-play .infinityField{opacity:.18!important;}` (L21055) if you want them visible in play. Anchor for direct JSX edit ✔ (L20919):
```
        <div className={`infinityField infinity-${stage}`} aria-hidden="true">
```
- cinemaDust (in-game): override `.tsArcade .cinemaDust i{animation-name:eosMergeCenter!important}`.

### E8. Header text size quick edit (optional, besides CSS)
✔ L21990 `                        <span>LVL {scoreLevel}</span>` and ✔ L21994 `                        <strong>⚡ {score.toLocaleString()}</strong>` — markup is fine; size is purely CSS (§5).

### Verification hooks
`cd framer && python3 build.py` then `cd dev && node drive.mjs "POP" shots/x.png 1280 860`. DOM to assert: `.tsArcade.stage-input` + your check-in overlay; after `startGame`, `.tsArcade.stage-play`, `.globalPlayGuide`, your arrow overlay; `getComputedStyle(document.querySelector(".tsShiftRewardPill")).fontSize` (use "HOT POTATO" — ids ≥100 have the pills). Keep `input.releaseThoughtInput`, `button.releaseChoiceButton`, `button.releaseChoiceItem` (first = "LET THINKSTILL CHOOSE") intact or drive.mjs breaks; a check-in overlay must not cover the composer or intercept clicks on `.releaseChoiceButton` (give it a skip/close and keep it inside `.releaseStage`).
