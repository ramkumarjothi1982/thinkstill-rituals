# MAP: per-game wrappers (GameEngine + GameEngineLegacy), HUD, guide, gestures, rewards, engine contract

Baseline: commit `7a89417` (sources unchanged since `485500c`). `src/00_arcade.jsx` md5 `b9e220c391b7e86bfb46b8c718e7f489` (22,786 lines), `src/99_pixar.jsx` md5 `8457fe0d…`. Companion docs: `map_main.md` (main component, stage machine, insertion points E1-E8), `catalog_A.md` / `catalog_B.md` (per-game audits).
Line numbers are for that baseline. **Always edit with string replacement on the quoted anchors.** Every anchor marked ✔ was checked with a script and occurs exactly once in `00_arcade.jsx`.

Live measurements below came from the Playwright harness (`dev/drive.mjs`, Pixar wrapper, Chromium) at 1280×860 and 390×844 with the input "i am panicking about tomorrow". Note that "panicking" falls through to the `general` emotion profile, so the HUD reads "SHIFT SPARKS". All 110 games were launched in one session to verify target selectors (Appendix A).

---------------------------------------------------------------------------------------------------
## 0. TL;DR

1. **There are two wrappers.** `ReleaseGameEngine = useLegacyGame ? GameEngineLegacy : GameEngine` (L21773-21774).
   - Ids **1-99** run `GameEngineLegacy` (L18365) → `RoutedGameContentLegacy` (L18281).
   - Ids **100-110** run `GameEngine` (L19395) → `RoutedGameContent` (L18911).
   - Both render the same shell: `.engineProgressWrap > .engineProgressHud + .cinematicContentShell > [CinematicStageFX, CharacterEmotionFX, .globalPlayGuide, {content}, RewardSurgeBurst(s), feedback copy]`.
2. **No game shows a guide arrow in the LIVE GUIDE panel today.**
   - The legacy card has no `<i className="guideActionArrow">` markup.
   - The new card gates the arrow on `id < 100`, which is never true inside `GameEngine` (L20835).
   - The CSS for that arrow exists only for legacy (`.releaseGlobal99Upgrade`, `GLOBAL_PRE_100_GAME_POLISH_CSS` L28). **Adding the 1-line markup to the legacy card lights it up for ids 1-99 at once** (§2.4).
3. **Gesture knowledge is weak.**
   - The only mapping is `releaseGestureForGame(game)` (L10889), a regex over `game.action + game.hook`.
   - Its verb disagrees with the real first gesture in **44 / 110 games** (Appendix A).
   - A universal arrow overlay needs its own per-id table: verb + direction + target selector(s) + stage-2 target. The catalog target selectors resolve to a visible element live in **109 / 110** games (all except 48 UNSTICK, whose `.stickerWord` collapses to 3×10px).
4. **Tiny HUD text (live px at 1280 / 390):**

   | Element | 1280 | 390 |
   |---|---|---|
   | `.tsShiftRewardPill` sparks, tokens, chain | 8.3 | 6.5 |
   | `.tsShiftLevel>b` "LVL 1" | 7 | 6.2 |
   | `.engineProgressText` | 10 | 9 |
   | header `.releaseScoreBar` | 12 | 10 |
   | `.guideStepCard small` | 10 | 8.7 |
   | `.globalMindBend strong` | 9.8 | 8.5 |

   Some in-game labels go down to 6px. The cascade winners and an override block are in §3.
5. **Layout bug in ids ≥100:** the progress track is pushed left out of the HUD box. At 390px it starts at x = -114, so "SHIFT · 0%" is clipped off-screen (screenshot `dev/shots/map_hud_390.png`).
6. **Progress bug in 67 games:** the bar saw-tooths (e.g. CRUSH: 15 → 30 → 45 → **17** → 32 → 47 → 62 → **33**, verified live). `wrappedSfx` adds a step on every sfx call, and the engine's own `report()` then overwrites it with an absolute value (§1.4).
7. **`onProgress` takes 0..100, not 0..1.** The wrappers call `pct(value)` (round + clamp 0..100). Legacy and new unique engines convert internally with `report(fraction)` → `onProgress(fraction*100)`.
8. **Best mount point for a universal arrow overlay:** in the main component, as a sibling of `.releaseGameHost` inside `.releaseStage` (anchor ✔ L22124, same as `map_main` E5). It is outside both wrappers' MutationObservers, DOM-audit passes and collision/obstacle solver. Details are in §6.

---------------------------------------------------------------------------------------------------
## 1. Wrapper anatomy (both engines)

### 1.1 Mount and props (main component L22095-22122)
```jsx
                            <div className="releaseGameHost" ref={gameHostRef}>          ✔ L22097
                                <ReleaseGameEngine
                                    key={`${selected.id}-${variationSeed}-${materialRevision}`}
                                    game={selected}
                                    entries={renderedEntries}
                                    imageSrc={visibleImage}
                                    imageSources={visibleSlots}
                                    hasUserImages={uploadedImages.length > 0}
                                    onDone={done}
                                    sfx={sfx}
                                    rainSfx={rainSfx}
                                    reduced={reduced}
                                    tapOutBpm={tapOutBpm}
                                    bubbleTextPx={bubbleTextSize}
                                    variationSeed={variationSeed}
                                    finishHoldMs={ selected.id === 110 ? 1600 : selected.id === 108 ? 3400 : 3000 }
```

### 1.2 Side-by-side

| | `GameEngineLegacy` (ids 1-99) | `GameEngine` (ids 100-110) |
|---|---|---|
| function | L18365 | L19395 |
| router | `RoutedGameContentLegacy` L18281: `!UNIQUE_HERO_IDS.has(id)` → `UniqueReleaseEngineLegacy` (L14524, `switch(game.id)` L15077); hero ids → bespoke engine by id switch L18284-18329 | `RoutedGameContent` L18911: `!UNIQUE_HERO_IDS.has(id)` → `UniqueReleaseEngine` (L11539, `switch(game.id)` L12193); 109 → `CleanseEngine` (L6143) |
| engine-code switch (E01-E15 → `BurstEngine` … `SequenceEngine`, default `UniversalToolModeEngine`) | L18330-18363: **dead for current ids** (every hero id has an id case) | L18917-18950: **dead** (only 109 is a hero id). `ImpactEngine`, `ThrowEngine` … `UniversalToolModeEngine` are referenced only by these two dead switches |
| state | progress, label, guideText, stepFx, finishFx, step/finish visible, burst variants, anchors (L18366-18394) | same, plus positiveSlots, emotionSessionSeed, reactionEpoch, rewardCharacter, **shiftXp/shiftTokens/rewardChain/lastSparkGain/lastFinishGain** (L19396-19450) |
| reset on `[game.id, entries, imageSrc, variationSeed]` | L18403-18424 | L19459-19498 |
| `rewardSize` (step reward every N %) | L18395 `clamp(100/clamp(entries,3,7),12,34)` → 6 entries ≈ 16.7 % | L19451 same |
| step reward visible | `stepRewardDurationMs = 980` (L18399) | `3200` (L19455) |
| finish → `p.onDone` delay | `finishHoldMs = max(2050, p.finishHoldMs)` = **3000 ms** (L18400) | `max(4000, …)` = **4000 ms** (L19456) |
| `triggerStepReward` | L18522-18537 (220 ms throttle, burst variant, `vibrate(12)`) | L19640-19669 (+ chain +1, sparks `8+min(10,(chain-1)*2)` → localStorage `RELEASE_SHIFT_XP_KEY`, positive face swap) |
| `reportProgress(value, label)` | L18538-18553 | L19670-19717 |
| `wrappedSfx(kind)` | L18554-18562 | L19718-19727 |
| `wrappedDone(bonus)` | L18563-18595 | L19728-19804 (+ sparks `35+min(30,chain*5)`, tokens +1) |
| props to engine (`ep`) | L18596-18602: `{...p, imageSrc, sfx: wrappedSfx, onDone: wrappedDone, onProgress: reportProgress}` | L19859-19868: also `imageSources: liveImages` (emotion-character images, or user uploads), `positiveImageSources`, `hasUserImages` |
| DOM audit (`useLayoutEffect`) | L18604-18769: tags `.tsExactUserText`, sets `--ts-ref-photo` on bubble selectors (L18645), lifts interactive `.uniqArena` children above `.uniqStatus`. Observers: RO host + MO `{childList, subtree, characterData}` + retries 40-1100 ms | L19870-20715: same, plus **`.tsStandardBubble` skinning** (L19911-20095), external label hosts (L20096-20288), **per-unit `.tsDynamicActionCue` injection** (L20289-20326), and a **collision + obstacle solver** (L20399-20669). MO also watches `attributes: ["src"]` |
| HUD | `GAME PROGRESS · {progress}%` only (L18803-18805) | `{shiftReward.meter} · {progress}%` (L20780-20782) + `.tsShiftRewardHud` pills (L20784-20802) |
| guide card | no arrow (L18835-18841) | arrow gated `id<100` → dead (L20835-20839) |
| guide text fn | `globalReleaseGuideTextLegacy` L14506 | `globalReleaseGuideText` L2200 |
| mind bend fn | `globalReleaseMindBendTextLegacy` L14516 (= `game.mindBend`) | `globalReleaseMindBendText` L2333 (`RELEASE_MIND_BEND[id]`) |
| step copy | `<b>{rewardWords[...]}</b><span>+ STILL HIT · CHAIN ×n</span>` (L18873-18888) | `<b>{dynamicStepFeedback.headline}</b><i className="tsRewardPayout">{icon} +{gain} · ×{chain}</i>` (L20874-20892) |
| finish copy | `RELEASED · SHIFT COMPLETE / LESS GRIP. MORE STILL. / ✦ ✦ ✦ / SHIFT MADE · KEEP YOUR STILL` (L18889-18906) | `{headline}` / `{shift}` / `◆ +1 · {icon} +{gain}` (L20893-20911) |
| root class | `.tsArcade.releaseGlobal99Upgrade` (L21837) | none |
| CSS strings applied (L21899-21948) | 10: gz, dynamicBubbleText, resetShell, RELEASE_IDLE_STORY, finalLayoutSafety, FACT_STORY, CONTROL_PANEL, **GLOBAL_PRE_100_GAME_POLISH**, GLOBAL_VIRAL_HYPNOTIC, GLOBAL_PIXAR_CINEMATIC | 38: the ones on the left, plus GLOBAL_SHIFT_REWARD_LOOP, GLOBAL_ACTION_ARROW_UPGRADE, BUBBLE_CHARACTER_BOND, RELEASE_COMPLETION_CHECK, FINGER_TRAP_HYPNOTIC, every RAIN_OUT_* string, and the rest |

### 1.3 Rendered markup (identical skeleton; legacy shown, new differs only where noted)
```
div.engineProgressWrap.cinematicEngineShell.engine-{e01..e15}.family-{destroy|…}       L18790 / L20767
  div.engineProgressHud                                   (abs top:8 right:10, w min(430px,46vw), h 24, z 2147482000)
    div.engineProgressTrack[role=progressbar][aria-valuenow={progress}]  > i[style.width=progress%] + span.engineProgressText
    [new only] div.tsShiftRewardHud[.isHit] > span.tsShiftRewardPill.spark | .token | .chain + span.tsShiftLevel > i + b
  div.cinematicContentShell (ref=collisionHostRef; onPointerMove/Down/UpCapture → reward anchor; new: Down = rememberBubbleTarget)
    CinematicStageFX   → div.cinematicStageFX.fx-{family}.fx-{eXX} > .cinemaVignette, .cinemaBloom.b1/.b2, .cinemaBeam.beam1/2, .cinemaDust>i×14, .cinemaGrain, .cinemaLetterbox.top/.bottom
    CharacterEmotionFX → div.characterEmotionUniverse > .characterEmotionDrift > motion.div.emotionOrb.transparentBubble ×8 (corner character faces)
    div.globalPlayGuide.hypnoticGuide[.isActive (progress>0)][.isComplete (>=100)][.guideHit (step reward visible)]   aria-live=polite
      div.guideAmbient · div.guideSweep · div.guideHeaderRow > b"{NAME} · LIVE GUIDE" + i.guidePulseDot
      div.guideStepCard (key=guide-{id}-{text}, so it remounts per text change) > [new: i.guideActionArrow, dead] small{label} span{copy}
      div.globalMindBend > strong"MIND BEND" + em{mind bend}
    {content}  ← the game root, which always carries class .arena (.arena.uniqArena.premiumArena.u{id} / .burstArena / .cleanseArena / .literal*Arena …)
    [stepRewardVisible && finishFx===0]  RewardSurgeBurst.tsRewardSurge.step
    [finishRewardVisible]                RewardSurgeBurst.tsRewardSurge.mega
    [step]   div.globalFeedbackCopyLayer.globalStepFeedbackCopy.feedbackFlavor{1-6}.feedbackFamily-{f}  style --fx-x/--fx-y = pointer %
    [finish] div.globalFeedbackCopyLayer.globalFinishFeedbackCopy…
```
Live rects: `.releaseGameHost` = `.cinematicContentShell` = `.arena` = 1238×704 @21,71 (1280) and 360×658 @15,63 (390). `.globalPlayGuide` = 460×157 @39,600 (bottom-left) and 336×125 @27,584. `.engineProgressHud` = 430×24 @819,79 and 280×22 @89,69.

### 1.4 Progress / sfx / done semantics (the real contract)
- `reportProgress(value, label)`: `v = pct(value)` (`Math.round` + clamp 0..100, L3551) → `setProgress(v)`, `setLabel(label || progressLabel(game,v))` (= "`{v}% {VERB}`", L3616), and guide text is recomputed with that label as `status`. A step reward fires when `v > previous && v < 99` and `floor(v/rewardSize)` increases. **Values are 0..100.**
- `wrappedSfx(kind)` (both wrappers):
```js
        p.sfx(kind)
        const explicit = usesExplicitProgress(p.game)
        if (!explicit || kind !== "soft") triggerStepReward()
        if (!explicit) {
            const next = pct(progressRef.current + gameProgressStep(p.game))
            reportProgress(next, progressLabel(p.game, next))
        }
```
  `usesExplicitProgress` L3619-3631 = ids `[1,3,4,6,15,16,18,19,21,22,23,24,25,41,61,71,94,101,102,103,104,106,107,109]` or engine `E04|E08|E09|E13`. The other **67 games** (2,5,7,8,9,10,12,13,14,17,20,26-29,31,32,34,35,37,38,40,42-44,46-56,62-70,72-74,76,78-80,83-90,95,96,98-100,105,108) get `+gameProgressStep` (L3576: per-id or per-engine 5-50) on **every** sfx call. They then also `report()` absolute values from `advance()`, which causes the saw-tooth. Every non-"soft" sfx call (and every call for non-explicit games) also fires a step reward (throttled 220 ms).
- `wrappedDone(bonus)`: one-shot (`finishLock`). It sets progress to 100, guide "Complete · …", shows the finish burst and copy, plays `sfx("win")` ×3 at 0/170/340 ms with vibrate, then `setTimeout(() => p.onDone(bonus), finishAdvanceDelayMs)`. Main `done(bonus)` (L21519) computes `gain = round(100 + bonus + min(180, entries.join(" ").length*2))` → `setStage("reveal")`.
- The guide `status` filter: a label matching `/^\d+%\s/` (e.g. "15% complete") is shown as a suffix. Any other label (e.g. "2/5 TRAPS RELEASED") replaces the action text: "Next move · {status}".

---------------------------------------------------------------------------------------------------
## 2. (Task 1) `.globalPlayGuide`: markup, classes, text pipeline, CSS

### 2.1 Markup (verbatim)
Legacy L18825-18846:
```jsx
                <div
                    className={`globalPlayGuide hypnoticGuide ${progress > 0 ? "isActive" : ""} ${progress >= 100 ? "isComplete" : ""} ${stepRewardVisible && progress < 100 ? "guideHit" : ""}`}
                    aria-live="polite"
                >
                    <div className="guideAmbient" aria-hidden="true" />
                    <div className="guideSweep" aria-hidden="true" />
                    <div className="guideHeaderRow">
                        <b>{p.game.name} · LIVE GUIDE</b>
                        <i className="guidePulseDot" aria-hidden="true" />
                    </div>
                    <div
                        key={`guide-${p.game.id}-${guideText}`}
                        className="guideStepCard"
                    >
                        <small>{guideParts.label}</small>
                        <span>{guideParts.copy}</span>
                    </div>
                    <div className="globalMindBend">
                        <strong>MIND BEND</strong>
                        <em>{globalReleaseMindBendTextLegacy(p.game)}</em>
                    </div>
                </div>
```
New L20821-20847 is identical except that the step card starts with:
```jsx
                        {Number(p.game?.id || 0) < 100 ? (                                     ✔ L20835 (dead gate)
                            <i className="guideActionArrow" aria-hidden="true">
                                {guideGesture.arrow || "↑"}
                            </i>
                        ) : null}
```
(`const guideGesture = releaseGestureForGame(p.game)` L20765) and uses `globalReleaseMindBendText`.

### 2.2 Text pipeline
- `SHORT_ACTION` L2043-2155 (per-id imperative, e.g. `1: "TAP TO POP"`) and `SHORT_HINT` L2156-2185 (override for ~28 ids). `shortHint(g, fb) = SHORT_HINT[id] || SHORT_ACTION[id] || fb` (L2186). `guideSentenceCase` L2188 lower-cases all-caps text.
- **New** `globalReleaseGuideText(game, value, status, entries)` L2200-2220:
  - id 105 is special-cased.
  - `cue = dynamicReleaseActionCue(game, entries, floor(v/16))`.
  - At v ≤ 0: `How to play · {arrow }{action} · {emotional target}`.
  - At v ≥ 100: `Complete · {profile.finish[0]}`.
  - Otherwise: `Next move · {arrow }{status|action} · {target}`.
  - Example: "How to play · ↗ Drag every potato out · Let go".
- **Legacy** `globalReleaseGuideTextLegacy(game, value, status)` L14506-14515: `How to play · {action}` / `Complete · Released` / `Next move · …`. It has **no arrow and no emotion target**.
- `splitGlobalGuideText` L2338: splits at the first "·" → `{label: "How to play", copy: "…"}` → `small` / `span`.
- Mind bend: new uses `RELEASE_MIND_BEND[id]` (L2221-2332), legacy uses `game.mindBend` (fallback: mechanism sentence).

### 2.3 CSS (where the box and its fonts come from)
- Box (gz CSS): `.tsArcade .globalPlayGuide{position:absolute!important;left:18px!important;bottom:18px!important;z-index:48!important;width:min(460px,calc(100% - 36px))!important;padding:12px 14px 13px!important;border-radius:22px…}`. At ≤700px: `left:12px;right:12px;bottom:12px;width:auto;padding:9px 10px 10px`.
- Per-game shrinks: `:has(>.u106)` / `.u107` / `.u102` / `.u103` → width 360 (300-330 on mobile), z 80-90 (L5-8). `.cleanseArena .globalPlayGuide{z-index:80}` (L21053).
- Fonts (all gz): `.guideHeaderRow b` `font:1000 12.5px/1.05` (≤700: 10.2px); `.guideStepCard small` `font:900 10px/1` (8.7px); `.guideStepCard span` `font:900 12.4px/1.22` (9.8px); `.globalMindBend strong` `font:1000 9.8px/1` (8.5px); `.globalMindBend em` `font:850 11.8px/1.22` (9.3px). Pixar overrides the family only (`"Baloo 2"`, 99 L76-77).
- Arrow slot (legacy-only CSS, `GLOBAL_PRE_100_GAME_POLISH_CSS` L28): `.tsArcade.releaseGlobal99Upgrade.stage-play .globalPlayGuide .guideStepCard{position:relative!important;padding-left:44px!important}` and `.guideActionArrow{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:28px;height:28px;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(111,240,255,.36);background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.17),rgba(0,229,255,.11) 42%,rgba(177,56,255,.09));color:#edffff;font:950 22px/1 Inter;text-shadow:0 0 9px rgba(0,229,255,.98),0 0 18px rgba(183,52,255,.38);animation:tsLegacyGuideArrowPulse .84s ease-in-out infinite;pointer-events:none}`. Mobile: 24px / 18px font. Keyframes `tsLegacyGuideArrowPulse{0%,100%{opacity:.68;scale:.94}48%{opacity:1;scale:1.12}}`.

### 2.4 Make the panel arrow work (2 edits)
- Legacy ✔ (L18836-18839): replace
```
                        key={`guide-${p.game.id}-${guideText}`}
                        className="guideStepCard"
                    >
                        <small>{guideParts.label}</small>
```
  with the same text plus `<i className="guideActionArrow" aria-hidden="true">{EosGestureFor(p.game).arrow || releaseGestureForGame(p.game).arrow || "↑"}</i>` before `<small>`. The legacy CSS above then applies (root has `.releaseGlobal99Upgrade`).
- New ✔ L20835: change the gate to `{true ? (`. **No CSS exists for ids ≥100**: `.guideActionArrow` is scoped to `.releaseGlobal99Upgrade`. Add an EOS rule for `.tsArcade:not(.releaseGlobal99Upgrade)`, or an ID-boosted selector for both. Without it, the `<i>` renders as an inline glyph before "How to play".
- Optional: make the legacy guide text directional by appending the arrow in `globalReleaseGuideTextLegacy` ✔ L14510 (anchor in §8).

---------------------------------------------------------------------------------------------------
## 3. (Task 3) HUD elements: classes, cascade winners, live px, fix

### 3.1 Inventory
| element | markup / line | text | where |
|---|---|---|---|
| header level | `div.releaseScoreBar > span` L21990 ✔ `                        <span>LVL {scoreLevel}</span>` | "LVL 1" | header (all stages) |
| header score | `strong` L21994 ✔ `                        <strong>⚡ {score.toLocaleString()}</strong>` | "⚡ 0" | header |
| header bar | `i.releaseScoreTrack > i[style.width]` | — | header |
| progress text | legacy ✔ L18804 `                        GAME PROGRESS · {progress}%` · new ✔ L20781 `                        {shiftReward.meter} · {progress}%` | "GAME PROGRESS · 0%" / "SHIFT · 0%" (meter per emotion: SLOW-DOWN, COOL-DOWN, MAKE SPACE, LIGHTEN, GROUND, UNLOOP, SHIFT) | `.engineProgressHud` |
| sparks pill | ✔ L20788 `                    <span className="tsShiftRewardPill spark">` → `{icon} {shiftXp} {spark}` | "✦ 0 SHIFT SPARKS" (CALM / COOL / SPACE / LIGHT / GROUND / CLEAR SPARKS) | new only |
| tokens pill | `span.tsShiftRewardPill.token` L20792 | "◆ 0 TOKENS" | new only |
| chain pill | `span.tsShiftRewardPill.chain` L20795 | "CHAIN ×0" (`display:none` ≤760px) | new only |
| shift level | `span.tsShiftLevel > i + b` L20798-20801 | "LVL 1" (XP/250) | new only |
| step payout | `i.tsRewardPayout` L20887 | "✦ +8 · ×1" | new only |
| finish payout | `strong.tsFinishRewardPayout` L20907 | "◆ +1 · ✦ +40" | new only |
| per-game counters | `.literalProgress` (unique engines' `shell()`, L14963 / new L12071+), `.combo.premiumCombo` (POP), `.uniqStatus`, `.literalStatus`, `.cleanseStatus`, `.freezeWordCube>b` | "1 / 6", "POPPED 0 / 6", "0/3 ICE FILLS" | inside `.arena` |

### 3.2 Font-size declarations (cascade order = gz → resetShellCss → … → finalLayoutSafetyCss → per-branch strings; **winner in bold**)
| selector | declarations (source, line) | live px 1280 / 390 |
|---|---|---|
| `.releaseScoreBar span,strong` | gz: `var(--release-ui-copy-size)`, `16px`, `18px` (mobile strong 14.5/16.5) → resetShellCss L21055 `font:900 8.5px/1 Inter` (≤560 strong `7px`) → **finalLayoutSafetyCss L21056 `font-size:12px`** (≤900 `11px`, ≤560 `10px`) | 12 / 10 |
| `.engineProgressText` | gz `var(--release-ui-copy-size)` (≤560 `12.5px`) → resetShellCss L21055 `font:950 8px/1` (≤700 `6.5px`) → **finalLayoutSafetyCss L21056 `.tsArcade.stage-play .releaseGameHost .engineProgressText{font-size:10px}`** (≤560 `9px`) | 10 / 9 |
| `.tsShiftRewardPill` | **GLOBAL_SHIFT_REWARD_LOOP_CSS L25 `font:1000 8.3px/1 Inter`**, `height:20px; padding:0 8px` (≤760 **`font-size:6.5px`**, h 18, `.chain{display:none}`) | **8.3 / 6.5** |
| `.tsShiftLevel>b` | **L25 `font:950 7px/1`** (≤760 **`6.2px`**); `.tsShiftLevel` h 20 / 18, min-w 74 / 66 | **7 / 6.2** |
| `.tsRewardPayout` | L25 `clamp(9px,.72vw,11px)` → GLOBAL_SHORT_FEEDBACK L21051 `clamp(11px,.88vw,13px)` (≤700 10px) → GLOBAL_FEEDBACK_NO_OVERFLOW L21052 (≤700 `clamp(8px,2.3vw,10px)`, but L21051 comes later in the list and wins) | ≈11.3 / 10 (computed, not measured) |
| `.tsFinishRewardPayout` | L25 → L21050 → **L21051 `clamp(11px,.9vw,14px)`** | ≈11.5 / 11 (computed) |
| `.guideHeaderRow b` · `.guideStepCard small` · `span` · `.globalMindBend strong` · `em` | gz only (§2.3) | 12.5/10.2 · **10/8.7** · 12.4/9.8 · **9.8/8.5** · 11.8/9.3 |
| `.tsDynamicActionText` | legacy-scoped L28 `clamp(8px,.64vw,10px)` (≤700 7.5px); **new L21048 `font:1000 clamp(11px,.92vw,14px)`** (≤700 10px) | n/a |
| `.literalProgress` | gz `8px` → gz `.tsArcade .literalProgress{clamp(11px,1.2vw,14px)}` | 14 / 11 |
| `.uniqStatus b/span` | gz `8px/9px` → … → `.tsArcade .uniqStatus span{clamp(11px,1.4vw,15px)}`, `b{clamp(12px,1.5vw,16px)}` | 11-16 |
| `.literalStatus b/span` | gz `9px` → … → `clamp(11-12px…)` | 16/13 · 12/10.5 (FREEZE) |
| `.freezeWordCube>b` ("0/3 ICE FILLS", L9265) | gz **`font-size:6px`** | **6 / 6** |
| `.premiumCombo` ("POPPED 0 / 6") | gz (`small 7px`) | 9 / 9 |
| `.cleanseBubbleHoldButton` | CLEANSE_HOLD_CUE_CSS L21054 `clamp(8px,.67vw,10.5px)` (≤700 `7.8px`) | 8.6 / 7.8 |
| `.thoughtPotato .potatoWord` | gz chain ends `clamp(6.5px,.72vw,9px)` (≤700 `6.5px`; with upload `6px`) | 9 / 6.5 |
| `.tsExactUserText` (user's words in most legacy games) | `ExactWords` inline `fontSize = max(6, literalFont(text,max,min)*0.84)` (L3799-3815) + gz bubble rules | 11 / 8.2 (6.5 in HOT POTATO) |
| header `.releaseTitleBy` / `.releaseTitleBrand` | resetShellCss L21055 (≤560 `7px` / `8px`) | — / 7 · 8 |
| composer `.choiceCopy`, `.choiceArrow` | gz | 8.5, 9 |

**Side finding:** `dynamicBubbleTextCss` (✔ L21047) uses `.tsArcade.tsArcade.stage-play.stage-play:is(.tsExactUserText,…)` with **no descendant combinator**, so it never matches anything. The `bubbleTextPx` Framer prop (default 4) does not resize words through CSS. It only acts where engines read `bubbleTextPx` directly (e.g. 99 ECHO CHAMBER, L18222 per catalog B).

### 3.3 HUD layout bug (ids ≥100)
`.engineProgressHud` (finalLayoutSafetyCss L21056: `display:flex; position:absolute; top:8px; right:10px; width:min(430px,46vw); height:24px`) holds both `.engineProgressTrack` (`width:100%`) and `.tsShiftRewardHud` (grid, 314px). The track keeps its full width and overflows to the **left**:
- 1280: track @505..935, pills @935..1249.
- 390: track @-114..166, so the text is clipped to "IFT · 0%". The header title is also clipped ("MOTIONAL RELEASE CONSOLE") and overlaps the score bar.

Fix: `flex-direction:column; height:auto; align-items:stretch` on `.engineProgressHud` for `:not(.releaseGlobal99Upgrade)`, or move the pills to a second row (`.tsShiftRewardHud{justify-content:end}` is already a grid).

### 3.4 Recommended override (one EOS CSS block, both branches; mount per `map_main` E6, after `</style>` at L21949)
```css
/* EOS_B = ".tsPixarRoot:not(#eosA):not(#eosB)"  (ID boost beats every .tsArcade rule incl. !important ties) */
${EOS_B} .tsArcade .releaseScoreBar :is(span,strong){font-size:clamp(13px,1.25vw,16px)!important}
${EOS_B} .tsArcade .releaseScoreBar{height:34px!important;min-width:190px!important}
${EOS_B} .tsArcade.stage-play .releaseGameHost .engineProgressText{font-size:clamp(12px,1.05vw,14px)!important;letter-spacing:.06em!important}
${EOS_B} .tsArcade.stage-play .releaseGameHost .engineProgressHud{flex-direction:column!important;height:auto!important;gap:4px!important}
${EOS_B} .tsArcade.stage-play .releaseGameHost .engineProgressTrack{height:22px!important;min-height:22px!important}
${EOS_B} .tsArcade.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font-size:clamp(12px,1.05vw,14px)!important}
${EOS_B} .tsArcade.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:26px!important}
${EOS_B} .tsArcade .globalPlayGuide :is(.guideStepCard small,.globalMindBend strong){font-size:clamp(12px,1vw,13px)!important}
${EOS_B} .tsArcade .globalPlayGuide :is(.guideStepCard span,.globalMindBend em,.guideHeaderRow b){font-size:clamp(13px,1.15vw,15px)!important}
${EOS_B} .tsArcade.stage-play :is(.freezeWordCube>b,.premiumCombo,.cleanseBubbleHoldButton,.tsRewardPayout){font-size:max(12px,1em)!important}
@media (max-width:760px){ ${EOS_B} .tsArcade.stage-play .tsShiftRewardPill.chain{display:inline-flex!important} }
```
Verify with `getComputedStyle(document.querySelector(".tsShiftRewardPill")).fontSize`, using "HOT POTATO" for the pills and "POP" for legacy.

---------------------------------------------------------------------------------------------------
## 4. Reward / FX layers

- `RewardSurgeBurst({seed, mega, reduced, variant})` L19139-19394 → `div.tsRewardSurge.{step|mega}.mode{1-6}.tsBurstForm{0-10}.tsBurstMotion{0-9}[data-burst-variant]`, style `--surge-h`. Children: `.surgeBackdrop/.surgeSuction/.surgeBloom/.surgeChromatic`, `.surgeBubbleNova>span>img` (34 or 52 emotion-character images flying out on `--bx/--by` vmax), `.surgeTunnel>i`, `.surgeRays>i` (24 or 38), `.surgeSparks>i`, `.surgeFloaters>i`, `.tsSignatureGlyphField>i.tsSignatureGlyph.{heart|eclipse|diamond|drop|spark|orbit}`, `.tsHeartAccentField>span.tsHeartAccent"♥"`, `.surgeHalo1-3`, mega: `.surgeCrown` + `.surgeEcho`. Shape is `tsRewardPoint` L19060 (ring, spiral, heart, diamond, spokes, star, ellipse, sides, fan, lemniscate, scatter). Variant rotation is `nextTsRewardVariant(id)` L19048, a shuffled deck of 110 per game persisted in `localStorage["thinkstill:reward-rotation:v1:{id}"]` (L18984).
- Triggers: a step burst on each `triggerStepReward` (bucket crossing, or sfx per §1.4); a mega burst on `wrappedDone`. Both are rendered **inside `.cinematicContentShell`** after `{content}` (L18848-18872 / L20849-20873).
- `PremiumBurst({x,y,tone:"cyan"|"violet"|"gold",big})` L2852 → `div.premiumBurst.cinematicBurst[.big]` at `left:x%,top:y%` with `.impactFlash`, `.lensStreak`, `.shockRing×3`, and 20 or 30 `b.shard|b.spark`. **It is the engine-level hit burst to reuse** (e.g. BurstEngine L4244).
- `CinematicStageFX({game, progress, reduced})` L2885 → vignette, bloom, beams, `.cinemaDust>i×14` (in-game dots; merge-to-centre note in `map_main` §7c), grain, letterbox. CSS vars `--energy` (progress/100, min .08), `--bloom`, `--bloom2`, `--beam`.
- `CharacterEmotionFX` L3430 → 8 corner character orbs, phase by progress (0/20/55/90).
- "Shift sparks" naming: `releaseRewardProfile(entries)` L11150 (per `releaseEmotionProfile`: panic → CALM SPARKS / SLOW-DOWN / ✦; anger → COOL SPARKS / COOL-DOWN / ❄; overwhelm → SPACE / MAKE SPACE / ◇; sadness → LIGHT / LIGHTEN / ✧; fear → GROUND / GROUND / ◆; rumination → CLEAR / UNLOOP / ↻; general → SHIFT SPARKS / SHIFT / ✦). Step headlines: `RELEASE_COMPACT_FEEDBACK` L11033 (e.g. panic "SLOWED ✓"). Finish: `RELEASE_COMPACT_FINISH` L11091 ("PANIC ↓", "ANGER ↓").
- Pixar wrapper extras: squash & stretch via root capture `pointerdown` on `PX_SQUASH_TARGETS` (99 L18-26, L277-300); the `.globalFeedbackCopyLayer b` gold gradient and the `.globalFinishFeedbackCopy` title-card pop (99 L155-162).

---------------------------------------------------------------------------------------------------
## 5. (Task 4) Contract for a NEW engine component

### 5.1 Props received (after wrapper `ep` override)
| prop | type | notes |
|---|---|---|
| `game` | GAMES object | `{id,name,family,engine,prompt,object,action,mechanism,hook,surprise,mindBend,score,replay,sound,notes}`. The wrapper reads `game.engine.toLowerCase()` and `game.family.toLowerCase()`, so **both must be strings**. Use an existing family key (Destroy … Release) so `FAMILY_BUBBLE`, `FAMILY_EMOTIONS` and the menu icons resolve |
| `entries` | string[] | always **6** chunks for text (`cleanEntries`, L2558); `"UPLOADED IMAGE"` sentinels for image-only (`isImageOnlyEntries`; `displayText` returns "") |
| `onProgress(value0to100, label?)` | fn | wrapper `reportProgress`. Call `onProgress(0, "0% X")` on mount/reset, then increasing values. **0..100.** The label shows in the guide as "Next move · {label}" unless it starts with "N% " |
| `onDone(bonus)` | fn | call once. The wrapper ignores repeats, plays the win stinger, and advances to reveal after 3000 ms (legacy) or 4000 ms (new). Typical bonus 180-380 |
| `sfx(kind)` | fn | **function, not object**: `sfx("pop")`. Kinds (`useSfx` L2628): `tap` (default), `pop`, `soft`, `win`, `spark`, `chime`, `bell`, `plink`, `clack`, `hum`, `tone`, `tskey:{clean|silly}:{0-5}`. **Wrapped side effects (§1.4):** every non-"soft" call fires a step reward (+sparks in new). If the id is not in `usesExplicitProgress`, every call also adds `gameProgressStep`. **New EOS engines must be explicit**: add the id to the list ✔ L3623 `            102, 103, 104, 106, 107, 109,`, or give them engine `"E04"`/`"E08"`/`"E09"`/`"E13"`. Use `sfx("soft")` for non-scoring feedback |
| `reduced` | bool | prefers-reduced-motion |
| `imageSrc`, `imageSources` | string, string[] | legacy: the user's uploads (`visibleSlots`). New: `liveImages` = emotion-character faces (negative → positive by slot) or uploads if `hasUserImages` |
| `positiveImageSources`, `hasUserImages` | string[], bool | new wrapper only |
| `rainSfx(duration)` | fn | brown-noise rain (L2759) |
| `bubbleTextPx` | number | Framer prop, default 4. Ignore it and size text yourself |
| `variationSeed`, `tapOutBpm`, `finishHoldMs` | number | pass-through |

### 5.2 DOM conventions the wrappers rely on
- Root element **must have class `arena`** (plus your own, e.g. `arena eosArena eosPanicBreath`). `map_main` selectors, the Pixar `.releaseGameHost .arena` rim lighting (`GLOBAL_PIXAR_CINEMATIC_ALL_GAMES_CSS` L30) and arrow-overlay targeting all assume it.
- Bubble auto-skin (new wrapper): any element matching `bubblePhotoSelectors` (L19912; e.g. `.allCircularBubble`, `.wordBubble`) or a `.uniqWord` gets `.tsStandardBubble`, `data-ts-bubble-index`, `--ts-ref-photo`, an injected `img.tsAutoEmotionPic`, the leaf text hidden and re-rendered in `.tsBubbleTextContainer`, a `.tsDynamicActionCue`, and it **moves under the collision solver** (`--ts-collision-x/y`). Opt in by adding `allCircularBubble` to your bubble. **Opt out** by avoiding those class names. Also avoid class names matching `strongPropPattern` L20504 `/(guide|…|button|btn|tool|knob|dial|lever|handle|panel|control|action|press|trap|scale|meter|…)/i` on non-interactive decor, or bubbles will be pushed away from it.
- Legacy wrapper: only `.tsExactUserText` tagging and `--ts-ref-photo` on `bubblePhotoSelectors` (L18645), plus the `.uniqArena` status-lift.
- The wrappers' MutationObservers rerun the audit on every DOM mutation inside `.cinematicContentShell`. Prefer CSS/transform animation (framer-motion `animate` mutates `style`; the new MO filters attributes to `src` only, the legacy MO ignores attributes) over mounting and unmounting many nodes per frame.

### 5.3 Reusable helpers (all hoisted `function`s; callable from `src/eos/*.jsx`)
`ExactWords({text,max,min})` L3799 (`span.plainUserThoughtText.tsGlobalThoughtText`, inline font size, `title` = full text; min 6px, so pass `min≥14`), `literalFont(s,max,min)` L3786, `displayText(s,maxChars)` L2582 (3 words / ≤28 chars, "" for image sentinel), `rainPreviewText` L2588, `compactGamePreviewText` L2599, `PremiumBurst` L2852, `RewardSurgeBurst` L19139 (already shown by the wrapper; don't duplicate), `vibrate(ms)` L2610, `pct` L3551, `clamp(n,a,b)` L2492, `noveltyNoise(id,salt)` L2397 (deterministic 0..1), `emotionSrc(bubble, mood)` (character image URL; `ALL_BUBBLES` L2930, `FAMILY_EMOTIONS` L2939), `releaseEmotionProfile(entries)` L10882, `releaseRewardProfile` L11150, `dynamicReleaseActionCue` L10942, `releaseGestureForGame` L10889, `splitThoughtIntoSix` L10654, `isImageOnlyEntries`, `uploadImageAt`/`expandUploadImageSlots`. `motion` from framer-motion is imported at L3. `React` is a namespace import (`React.useState`).
Do **not** reference `PX_B` / `PIXAR_CSS` / `pxNoise` at eos module top level (TDZ: 99_pixar evaluates after eos).

### 5.4 Wiring a new engine (insertion anchors)
- New ids (recommended ≥111, so they use `GameEngine` with sparks/tokens): in an eos module, `GAMES.push({...})` at top level. All `GAMES` reads are at render time (L2403-2425, L21121-21446, menu L22641), so the push is safe. The menu count updates itself.
- Route (new wrapper) ✔ L18912: before `    if (!UNIQUE_HERO_IDS.has(p.game.id)) return <UniqueReleaseEngine {...p} />` insert `    { const E = EosEngineFor(p.game); if (E) return <E {...p} /> }`. `RoutedGameContent` has no hooks, so an early return is safe.
- Route (legacy wrapper, to re-skin an id <100) ✔ L18282: before
```
    if (!UNIQUE_HERO_IDS.has(p.game.id))
        return <UniqueReleaseEngineLegacy {...p} />
```
- Explicit progress ✔ L3619-3623 (see 5.1).
- Optional per-id guide/hint copy: `SHORT_ACTION` (L2043) / `SHORT_HINT` (L2156) are `const` objects, so an eos module can assign `SHORT_HINT[111] = "…"`. The same goes for `RELEASE_MIND_BEND[111]` (L2221), `PROMPT_OVERRIDE` (L2347) and `gameProgressVerb` (not exported; the fallback is "COMPLETE").
- Minimal skeleton:
```jsx
function EosBreathPopEngine({ game, entries, onDone, sfx, reduced, onProgress }) {
    const words = React.useMemo(() => entries.map((w) => displayText(w, 24)).filter(Boolean), [entries.join("|")])
    const [done, setDone] = React.useState([])
    React.useEffect(() => { setDone([]); onProgress?.(0, "0% CALMED") }, [game.id, entries.join("|")])
    const hit = (i) => {
        if (done.includes(i)) return
        const next = [...done, i]; setDone(next)
        sfx(next.length === words.length ? "win" : "pop"); vibrate(10)
        onProgress?.(Math.round((next.length / words.length) * 100), `${next.length}/${words.length} CALMED`)
        if (next.length === words.length) setTimeout(() => onDone(300), 420)
    }
    return (
        <div className="arena eosArena eosBreathPop">
            {words.map((w, i) => (
                <motion.button key={i} type="button" className="eosBubble" data-eos-target={done.includes(i) ? undefined : "1"}
                    onPointerDown={() => hit(i)} animate={reduced ? {} : { scale: [1, 1.06, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}>
                    <ExactWords text={w} max={22} min={14} />
                </motion.button>
            ))}
        </div>
    )
}
```
  `data-eos-target="1"` is the convention for the arrow overlay (§6): a new engine marks its live target explicitly, so it needs no selector table entry.

---------------------------------------------------------------------------------------------------
## 6. (Task 5) Single best mount point for a universal guide-arrow overlay

**Mount:** in the main component, as a sibling of `.releaseGameHost` inside `section.releaseStage`, inserted before ✔ L22124 `                    {stage === "reveal" && selected ? (`:
```jsx
{stage === "play" && selected ? (
    <EosGuideArrows key={`${selected.id}-${variationSeed}-${materialRevision}`}
        game={selected} entries={renderedEntries} hostRef={gameHostRef} reduced={!!reduced} />
) : null}
```
Why here, rather than inside the wrappers:
1. **One edit covers both wrappers.** It knows `selected` (game, gesture via an EOS table) and `renderedEntries`, and `gameHostRef` points at `.releaseGameHost`, the parent of every game DOM.
2. **It is outside both audits.** Inside `.cinematicContentShell`, the overlay's nodes would be (a) re-scanned on every mutation by the wrapper MO, which would loop with an overlay that re-renders on measure; (b) tagged as `.tsExactUserText` if its text equals a user word; (c) in the new wrapper, treated as an *obstacle* by the collision solver whenever a class contains "guide", "action", "button", etc. (`obstacleRoot = host.closest(".engineProgressWrap")`, L20499), which shoves the user's bubbles away from the arrow.
3. **Stacking:** `.releaseStage` is `position:relative; z-index:22; overflow:hidden`. `.releaseGameHost` is `position:absolute; z-index:2` and forms a stacking context, so everything inside it (guide z 48, HUD z 2147482000) sits under a sibling with `z-index ≥ 3`. Use `position:absolute; inset:0; pointer-events:none; z-index:60`. The composer (z 240) is outside `.releaseStage` and unaffected. `.tsPxRig` (z 2147483000, pointer-events none) is above it, which is fine.

Live signals the overlay can read without any wrapper edit:
| need | read |
|---|---|
| progress 0-100 | `host.querySelector(".engineProgressTrack")?.getAttribute("aria-valuenow")` (both wrappers) |
| started / complete | `.globalPlayGuide.isActive` (progress>0), `.globalPlayGuide.isComplete` (100) → hide the overlay |
| a successful hit just happened | `.globalPlayGuide.guideHit` or `.tsShiftRewardHud.isHit` (new), or `aria-valuenow` increased |
| user touched anything | capture-phase `pointerdown` on `hostRef.current` (same pattern as Pixar squash, 99 L277-300) |
| game root | `hostRef.current.querySelector(".cinematicContentShell > .arena")` (live: present in all 110) |
| current guide text | `.guideStepCard` text (remounts per change) |

Targeting algorithm (validated live, Appendix A):
1. `[data-eos-target="1"]` (new EOS engines).
2. `EOS_GESTURES[id].targets`: an ordered list of selectors from Appendix A. Take the first visible, enabled element. For sequence games use the "live" variants: `.portalRing button.hot`, `.defuseZone.active button`, `button.cropHandle:not(:disabled)`, `.bubbleWrapSheet button:not(:disabled)`, `.glitchPanel button.live`, `.orbitButtons button.live`, `.weakSpot:not(:disabled)`. For two-stage games, list the stage-1 selector (tool dock / activate button) first; when it disappears or becomes `.active`/`[aria-pressed=true]`, the next selector wins.
3. Fallback chain. Live winners across 110 games: `.arena button:not(:disabled)` 45, `button.uniqControl:not(:disabled)` 23, `.arena [style*='touch-action: none']` (framer-motion drag nodes) 12, `.uniqWord` 7, `[class*=ToolDock]` 3, `.tsThoughtLabelHost` 3, `[class*=ToolButton]` 2, `[class*=ActivateBtn]` 1, `button.wordBubble` 1, nothing 13. **The fallback picks the wrong element in several games** (26 picks `.rocketWindow` instead of `.launchLever`; 29/46/47/49 pick the word instead of the fader/pin/plug/zipper), so the per-id table is required.
- Exclude `.globalPlayGuide *, .engineProgressHud *` and elements with `opacity<.05` or size <4px.
- Position from `getBoundingClientRect()` relative to `.releaseStage`, divided by `stageRect.width / stage.offsetWidth` (Framer canvas scaling).
- Re-measure on `ResizeObserver(host)` plus a `MutationObserver(host, {childList, subtree, attributes, attributeFilter:["class","disabled"]})` throttled to rAF. The overlay is outside the host, so this does not self-trigger.
- Hide after the first pointerdown; re-show after ~3.5 s with no progress change; stop at `.isComplete`.
- Direction / verb: `EOS_GESTURES[id]` first. `releaseGestureForGame(game)` (L10889) is wrong in 44/110 and blank-arrow for HOLD/TAP/SCRATCH/SHAKE/TURN at ids ≥100.
- Animation per verb: TAP (press-pulse hand), HOLD (ring fill), DRAG/SWIPE/PULL (travel along a vector, e.g. 90px), TURN (arc), WAIT (✋ "hands off"; 66, 80).
- **Define your own `@keyframes eos…`.** `tsDynamicActionArrowBeat`, `ftGuide*` and `releaseReco*` live in strings that are not loaded for legacy games (§7).
- Zero-arcade-edit alternative: render the overlay from `ThinkStillReleaseArcadePixar` next to ✔ 99 L313 `<ThinkStillReleaseArcade {...arcadeProps} />`, finding `.tsArcade.stage-play .releaseGameHost` in the DOM and resolving the game from `.guideHeaderRow b` text ("NAME · LIVE GUIDE" → `GAMES.find(g => g.name === NAME)`). This is more fragile (name-based, needs a DOM poll), so it is not the first choice.

---------------------------------------------------------------------------------------------------
## 7. (Task 6) Existing arrow / hand / cue elements to reuse

| element | where (JSX) | CSS (source) | loaded for |
|---|---|---|---|
| `i.guideActionArrow` (28px glowing circle, arrow glyph, pulse) | new L20836 (dead) | `GLOBAL_PRE_100_GAME_POLISH_CSS` L28, scoped `.releaseGlobal99Upgrade`; keyframes `tsLegacyGuideArrowPulse` | both lists, but the selector only matches legacy |
| `.tsDynamicActionCue > span.tsDynamicActionArrow + span.tsDynamicActionText` (DOM-injected per `.tsThoughtLabelHost`, text = "VERB TO TARGET") | new wrapper L20289-20326 (`cue.className = "tsDynamicActionCue"` ✔ L20307) | `GLOBAL_ACTION_ARROW_UPGRADE_CSS` L21048: placed `left:50%; top:calc(100% + 44px)` under the unit; arrow `font:1000 27px/1`, `color:#d4ffff`, `text-shadow:0 0 10px rgba(0,229,255,.88),0 0 18px rgba(117,71,255,.30)`, `animation:tsDynamicActionArrowBeat 1s` (keyframes in `BUBBLE_CHARACTER_BOND_CSS` L24: `0%,100%{translateY(-1px);opacity:.88}50%{translateY(3px);opacity:1}`); text `font:1000 clamp(11px,.92vw,14px)`, uppercase, letter-spacing .095em. `:empty` arrow hidden (L21049). Legacy-scoped variant in L28 | ids ≥100 only. Live it exists only in 101, 106, 109, and 109 hides it (`CLEANSE_HOLD_CUE_CSS` L21054 `.cleanseStone>.tsDynamicActionCue{display:none}`). Potatoes, rain clouds and weird bubbles are excluded in code |
| `.ftArrow.left/.right > span"→/←" + em"PUSH"` and `.ftCue` + `.ftCueTrack>i` (FINGER TRAP 102) | L12821-12865 | `FINGER_TRAP_HYPNOTIC_CSS` L7 (`.u102` scoped): 48px rounded-16 dark glass chip, `border:1px solid color-mix(in srgb,var(--ft-a) 46%,transparent)`, `background:linear-gradient(180deg,rgba(7,24,44,.92),rgba(4,9,24,.96))`, glyph `font:1000 26px/.9` in `var(--ft-a)` (#2ce8ff), label `font:1000 7px/1; letter-spacing:.16em`; `animation:ftGuideLeft/Right 1.1s` (`translateX(-2px)↔(9px)`); `.ftRow.grabbing` turns mint `#8fffe1`; `.ftCue` 8.3px uppercase status line with a 2px progress track (`--ft-open`) | new list only |
| `.hotPotatoGuide` (↔ + "DRAG EACH POTATO AWAY") | L12383 (framer-motion `x:[-8,8,-8]`, opacity pulse) | gz | 100 |
| `.tugDirectionArrow` (←) | L12609 (motion `x:[8,-10,8]`) | gz | 101 |
| `b.rainPullHint` (arrow span + text) | L14314 | L21048 shares the `.tsDynamicActionCue` look | 110 |
| `.coinReleaseHint` | L17359 | L21048 | 90 |
| `.keepDropCueArrow.up/.down` | L16854 / L16890 | gz | 87 |
| `.spaceMoveArrow` | L17533 | gz | 93 |
| `.shelfGuideV2` (↑) | L17709 | gz | 95 |
| `.xrayDragGuide` (→) | L17925 | gz | 97 |
| `.magicLeverGuide` (↓) | L18131 | gz | 98 |
| `.echoHoldGuide.echoSplitGuide` (↓, wrong for hold) | L18244 | gz | 99 |
| reveal demo `.releaseRecoDemo.verb-{pull,drag,swipe,lift,hold,tap}` + `.releaseRecoDemoArrow` + `.releaseRecoDemoLabel` | L22232-22246 | `RELEASE_COMPLETION_CHECK_CSS` L26. **Per-verb motion keyframes to copy:** `releaseRecoPull{0%,100%{translateY(-10px)}55%{translateY(20px) scale(.92)}}`, `releaseRecoDrag{±22px rotate ±3deg}`, `releaseRecoSwipe{-24px→30px}`, `releaseRecoLift{17px→-18px}`, `releaseRecoHold{scale(.84) brightness 1.25}`, `releaseRecoTap{.82→1.10}`, `releaseRecoArrow{translateY(-2px)↔4px}` | new list only (so a legacy game's reveal card lacks it; not visually verified) |
| idle-stage converging particles `.ts-abyss-particle-*` | L22014-22033 | `RELEASE_IDLE_STORY_CSS` L10 | both |

Reuse recipe: copy the **look** (dark-glass chip, cyan glow `rgba(0,229,255,.88)`, violet secondary `rgba(117,71,255,.30)`, 1000-weight uppercase text with letter-spacing .095em) into `EOS_*` CSS with `eos`-prefixed keyframes. Don't depend on the legacy/new string lists. Make text ≥12px.

---------------------------------------------------------------------------------------------------
## 8. Verified anchors (✔ = exactly one occurrence)
| purpose | line | anchor (exact, with leading spaces) |
|---|---|---|
| legacy guide card (add arrow) | 18836 | the 4-line block quoted in §2.4 (starts ``key={`guide-${p.game.id}-${guideText}`}``, ends `<small>{guideParts.label}</small>`) |
| new guide arrow gate | 20835 | `                        {Number(p.game?.id || 0) < 100 ? (` |
| legacy content slot (after guide) | 18844 | `                        <em>{globalReleaseMindBendTextLegacy(p.game)}</em>\n                    </div>\n                </div>\n                {content}` |
| new content slot | 20845 | `                        <em>{globalReleaseMindBendText(p.game)}</em>\n                    </div>\n                </div>\n                {content}` |
| legacy progress text | 18804 | `                        GAME PROGRESS · {progress}%` |
| new progress text | 20781 | `                        {shiftReward.meter} · {progress}%` |
| sparks pill | 20788 | `                    <span className="tsShiftRewardPill spark">` |
| legacy router | 18282 | `    if (!UNIQUE_HERO_IDS.has(p.game.id))\n        return <UniqueReleaseEngineLegacy {...p} />` |
| new router | 18912 | `    if (!UNIQUE_HERO_IDS.has(p.game.id)) return <UniqueReleaseEngine {...p} />` |
| legacy ep→content | 18603 | `    const content = <RoutedGameContentLegacy {...ep} />` |
| new ep→content | 19869 | `    const content = <RoutedGameContent {...ep} />` |
| explicit-progress list | 3623 | `            102, 103, 104, 106, 107, 109,` |
| gesture fn | 10889 | `function releaseGestureForGame(game) {` |
| gesture blank-arrow flag | 10927 | `    const legacyArrow = Number(game?.id || 0) > 0 && Number(game?.id || 0) < 100` |
| legacy guide text | 14510 | ``    if (v <= 0) return `How to play · ${action}` `` |
| DOM cue creation | 20307 | `                        cue.className = "tsDynamicActionCue"` |
| overlay mount (main) | 22124 | `                    {stage === "reveal" && selected ? (` |
| game host | 22097 | `                            <div className="releaseGameHost" ref={gameHostRef}>` |
| no-op bubble CSS | 21047 | ``    const dynamicBubbleTextCss = `.tsArcade.tsArcade.stage-play.stage-play:is( `` |
Not unique (don't string-replace): `font:1000 8.3px/1 Inter,system-ui,sans-serif!important` (2×: L7, L25), `.tsArcade .releaseGameHost .engineProgressText{` (2× in L21055), `.tsArcade .releaseScoreBar span,.tsArcade .releaseScoreBar strong{` (4×). Override them with EOS CSS (§3.4).

---------------------------------------------------------------------------------------------------
## Appendix A: gesture vs reality vs target, all 110 games (live @1280×860)
`releaseGestureForGame` = what the panel or cue would say today (verb + arrow; ∅ = blank arrow). "real gesture" comes from catalog A/B (source-verified). **≠** = the verb family differs (tap ≠ drag ≠ hold ≠ wait): **44 games**. Target column: catalog selector → number of visible matches in the live DOM at ~2.2 s after launch, plus the first match's rect (x,y,w,h in viewport px). Use the first entry as stage 1 and later entries as stage 2 or the drop zone.
Verb counts from `releaseGestureForGame`: TAP 33 (2 with blank arrow), DRAG 49, HOLD 8 (1 blank), SWIPE 6, FLICK 4, LOWER 2, PULL 4, TURN 2, STOMP 1, SHAKE 1 (blank). No game maps to SCRATCH or LIFT, even though 19 and 96 are scratch/trace games.

| id | name | wrap | renderer | `releaseGestureForGame` | real gesture (catalog) | primary target selector → live count@1280 (first rect x,y,w,h) |
|---|---|---|---|---|---|---|
| 1 | POP | Legacy | `BurstEngine` L4063 | TAP ↑ | tap | `button.wordBubble.popBubbleV2` → 6 @195,246,92,92 |
| 2 | CRUSH | Legacy | UREL 2 L15078 | TAP ↑ | rapid-tap | `button.uniqControl` → 1 @504,459,271,49; `.crusherRig .jaw` → 2 @468,239,344,54 |
| 3 | CRACK | Legacy | `CrackEngine` L6859 | DRAG ↗ | tap (arm tool → 3 hits per egg) **≠** | `button.crackToolDock` → 1 @586,648,108,108; `.crackBubbleSlot` → 6 @141,157,108,108; `.eggShell.multiEgg` → 6 @142,156,105,105 |
| 4 | STOMP | Legacy | `StompEngine` L4258 | STOMP ↓ | tap (arm boot → 3 stomps per bubble) | `button.stompToolDock` → 1 @584,638,112,112; `.stompBubbleSlot` → 6 @78,265,104,104; `.stompWordBubble` → 6 @77,263,105,105 |
| 5 | HAMMER | Legacy | UREL 5 L15099 | TAP ↑ | tap | `button.uniqControl` → 1 @481,464,318,49; `.swingMarker` → 1 @547,420,12,30; `.sweetSpot` → 1 @612,432,56,9 |
| 6 | ZAP | Legacy | `ZapEngine` L7179 | HOLD ↑ | tap ×3 **≠** | `button.zapGroundButton.multiZapButton` → 1 @592,660,96,96 |
| 7 | PIN POP | Legacy | UREL 7 L15119 | DRAG ↘ | drag (x ≥95px) | `.pinTool` → 1 @604,457,72,32; `.uniqWord.balloonWord` → 1 @545,249,190,190 |
| 8 | METEOR | Legacy | UREL 8 L15135 | FLICK ↗ | slingshot-pull | `.meteorRock` → 1 @555,304,170,130 |
| 9 | LASER SLICE | Legacy | `LaserSliceEngine` L5137 | SWIPE ↔ | tap (arm laser → 3 shots per bubble) **≠** | `button.laserToolDock` → 1 @584,640,112,112; `.laserTargetBubble` → 6 @240,201,96,96 |
| 10 | DOMINO DROP | Legacy | UREL 10 L15160 | TAP ↑ | tap | `button.uniqControl` → 1 @471,481,339,49 |
| 11 | PRESSURE POP | Legacy | UREL 11 L15185 | HOLD ↑ | hold, then release in a window | `button.uniqControl` → 1 @414,439,452,49; `.pressureCapsule .needle` → 0 |
| 12 | BOUNCE OUT | Legacy | UREL 12 L15208 | DRAG ↗ | rapid-tap **≠** | `button.uniqControl` → 1 @498,395,284,49 |
| 13 | SQUASH | Legacy | UREL 13 L15234 | HOLD ↑ | hold (to ≥82) | `button.uniqControl` → 1 @437,359,406,49 |
| 14 | CRUMPLE | Legacy | UREL 14 L15254 | DRAG ↔ | sequence-tap **≠** | `button.paperCorner` → 4 @448,242,32,32 |
| 15 | SHRED | Legacy | `ShredEngine` L4653 | DRAG ↘ | rapid-tap (5 per word) **≠** | `button.bigAction.shredAction.primaryBottomControl` → 1 @490,705,300,49 |
| 16 | MELT | Legacy | `MeltEngine` L9661 | HOLD ↑ | tap (arm torch → 3 per cube) **≠** | `button.meltGroundButton.meltToolButton` → 1 @592,660,96,96; `.cartoonIceCube` → 6 @258,199,106,106 |
| 17 | BOSS BATTLE | Legacy | UREL 17 L15277 | TAP ↑ | sequence-tap | `button.weakSpot` → 5 @557,297,28,28 |
| 18 | BURN | Legacy | `BurnEngine` L7415 | DRAG → | hold (~3s per word) **≠** | `button.burnGroundButton` → 1 @592,660,96,96 |
| 19 | ERASE | Legacy | `EraseClickEngine` L8551 | DRAG ↗ | trace (activate, then rub ×3 passes per bubble) | `button.eraseActivateBtn` → 1 @550,588,180,44; `.eraseWordBubble` → 6 @155,188,92,92 |
| 20 | GLITCH OUT | Legacy | UREL 20 L15302 | TAP ↑ | sequence-tap | `.glitchPanel button.live` → 1 @411,413,141,48 |
| 21 | BIN | Legacy | `BinLiteralEngine` L10410 | FLICK ↗ | drag | `.binWordBubble` → 6 @141,123,88,88; `.binMouthTarget` → 1 @506,528,267,32; `.neonBin.masterBin` → 1 @475,534,330,90; `button.binAllButton` → 1 @490,699,300,55 |
| 22 | FLUSH | Legacy | `FlushEngine` L7553 | DRAG ↘ | tap **≠** | `button.flushLever.primaryBottomControl` → 1 @490,702,300,52 |
| 23 | VACUUM | Legacy | `VacuumEngine` L7866 | DRAG ↘ | tap **≠** | `button.bigAction.vacuumBtn` → 1 @490,699,300,55; `.vacuumCircleBubble` → 6 @149,163,90,90 |
| 24 | SLINGSHOT | Legacy | `SlingshotEngine` L8389 | DRAG ↘ | slingshot-pull (>72px) | `.slingshotWord` → 1 @567,448,146,82 |
| 25 | SWIPE AWAY | Legacy | `SwipeAwayEngine` L7756 | SWIPE → | swipe (right >140px) | `.swipeCard.physical` → 1 @294,339,340,140 |
| 26 | SEND TO SPACE | Legacy | UREL 26 L15345 | FLICK ↗ | drag (lever down >70) | `.launchLever` → 1 @832,258,42,150 |
| 27 | DROP ZONE | Legacy | UREL 27 L15369 | DRAG ↓ | drag (right >110 or down >95) | `.weightedBlock` → 1 @550,309,180,120; `.dropLedge` → 1 @170,479,939,12 |
| 28 | ARCHIVE | Legacy | UREL 28 L15394 | DRAG ↘ | tap, then drag **≠** | `button.uniqControl` → 1 @463,452,353,49; `.fileCard` → 1 @535,385,210,48 |
| 29 | MUTE | Legacy | UREL 29 L15424 | DRAG ↓ | drag (fader down >120) | `.verticalFader` → 1 @839,262,42,190 |
| 30 | ZOOM OUT | Legacy | UREL 30 L15456 | DRAG ↗ | rapid-tap **≠** | `button.uniqControl` → 1 @455,407,371,49 |
| 31 | BACK SEAT | Legacy | UREL 31 L15483 | DRAG ↔ | drag (diagonal x >90 and y >35) | `.passengerCard` → 1 @461,406,180,48; `.backSeat` → 1 @710,246,150,110 |
| 32 | PARK IT | Legacy | UREL 32 L15509 | DRAG ↘ | choose **≠** | `button.parkBay` → 3 @340,216,192,180 |
| 33 | FLOAT AWAY | Legacy | UREL 33 L15531 | TAP ↑ | sequence-tap | `button.balloonWeight` → 3 @526,441,54,54 |
| 34 | RIVER | Legacy | UREL 34 L15556 | TAP ↑ | drag (down >35) **≠** | `.leafWord` → 1 @565,324,150,90; `.riverFlow` → 1 @70,423,1140,130 |
| 35 | TRAIN PLATFORM | Legacy | UREL 35 L15585 | TAP ↑ | tap | `button.uniqControl` → 1 @460,489,361,49 |
| 36 | CLOUD PASS | Legacy | UREL 36 L15614 | TAP ↑ | drag (slow: >120px over >450ms) **≠** | `.neonCloud` → 1 @520,280,240,120; `.windLane` → 1 @380,418,520,40 |
| 37 | ELEVATOR DOWN | Legacy | UREL 37 L15644 | LOWER ↓ | sequence-tap **≠** | `.floorStack button` → 4 @786,240,44,44 |
| 38 | DRAWER | Legacy | UREL 38 L15675 | DRAG ↘ | tap, drag, tap **≠** | `button.uniqControl` → 1 @487,452,306,49; `.drawerCard` → 1 @550,385,180,48; `uniqControl` → 0 |
| 39 | BLACK HOLE | Legacy | UREL 39 L15706 | HOLD ↑ | hold (to ≥85) | `button.uniqControl` → 1 @429,504,423,49 |
| 40 | PAPER PLANE | Legacy | UREL 40 L15729 | FLICK ↗ | tap ×2, then swipe **≠** | `button.uniqControl` → 1 @478,414,324,49; `.paperPlane` → 1 @515,276,250,120 |
| 41 | UNHOOK | Legacy | `UnhookLiteralEngine` L8960 | DRAG ← | rapid-tap (3 per bubble) **≠** | `.unhookWordBubble` → 6 @697,102,108,108; `cutLink` → 0 |
| 42 | UNTANGLE | Legacy | UREL 42 L15756 | DRAG ↗ | drag (any distance, fixed order) | `.knot` → 3 @485,317,64,64 |
| 43 | CUT THE LOOP | Legacy | `CutLoopLiteralEngine` L8772 | SWIPE ↔ | tap (select scissors → 3 per word) **≠** | `button.cutLoopScissorPicker` → 1 @535,614,211,44; `.cutLoopWordSlot` → 6 @597,94,86,86 |
| 44 | VELCRO | Legacy | UREL 44 L15805 | DRAG ↔ | drag (slow peel, right >130) | `.velcroPatch` → 1 @464,293,352,120 |
| 45 | MAGNETS | Legacy | UREL 45 L15834 | DRAG ↗ | drag (right >160) | `.attentionOrb` → 1 @755,347,74,74 |
| 46 | UNPIN | Legacy | UREL 46 L15859 | DRAG ↔ | drag (up >75) | `.pushPin` → 1 @617,246,46,70 |
| 47 | UNFOLLOW | Legacy | UREL 47 L15878 | PULL ↔ | drag (right >120) | `.plug` → 1 @724,342,90,54; `.socket` → 1 @801,334,70,70 |
| 48 | UNSTICK | Legacy | UREL 48 L15896 | DRAG ↔ | drag (diagonal x >85 and y <-45) | `.stickerWord` → 0; `.peelCorner` → 0 (**`.stickerWord` collapses to 3×10px** — use `.glassPane` centre) |
| 49 | UNZIP | Legacy | UREL 49 L15921 | DRAG ↔ | drag (right >140) | `.zipperPull` → 1 @429,354,42,48 |
| 50 | UNFINISHED SENTENCE | Legacy | `UnfinishedSentence` L6742 | DRAG ↑ | choose / typing **≠** | `.chainLink input` → 3 @416,152,544,49; `button.bigAction.premiumBigAction` → 1 @490,699,300,55 |
| 51 | MIRROR FLIP | Legacy | UREL 51 L15939 | SWIPE ↔ | sequence-tap **≠** | `.orbitButtons button.live` → 1 @557,498,45,40 |
| 52 | SUBTITLES | Legacy | UREL 52 L15967 | TAP ↑ | choose | `.genreKeys button` → 3 @553,498,48,40 |
| 53 | CARTOONIFY | Legacy | UREL 53 L15992 | DRAG ↑ | rapid-tap **≠** | `button.uniqControl` → 1 @474,494,333,49 |
| 54 | FONT CHECK | Legacy | UREL 54 L16004 | TAP ↑ | rapid-tap | `button.fontDial` → 1 @801,393,90,90 |
| 55 | HEADLINE | Legacy | UREL 55 L16027 | DRAG ↓ | sequence-tap **≠** | `.productionStrip button` → 3 @506,498,82,40 |
| 56 | COURTROOM | Legacy | UREL 56 L16056 | DRAG ↘ | choose **≠** | `.courtTargets button` → 3 @484,434,75,56 |
| 57 | CAMERA ANGLE | Legacy | UREL 57 L16083 | TURN ↻ | rapid-tap **≠** | `button.uniqControl` → 1 @464,494,352,49 |
| 58 | MICROSCOPE | Legacy | UREL 58 L16098 | TAP ↑ | rapid-tap | `button.focusKnob` → 1 @801,393,90,90 |
| 59 | SPOTLIGHT | Legacy | UREL 59 L16120 | DRAG ↗ | drag (\|x\| >110) | `.spotLamp` → 1 @590,238,100,80 |
| 60 | CROP TOOL | Legacy | UREL 60 L16145 | DRAG ↗ | sequence-tap **≠** | `button.cropHandle.h0` → 1 @360,229,32,32 |
| 61 | FREEZE | Legacy | `FreezeLiteralEngine` L9148 | DRAG ↔ | rapid-tap (3 per cube) **≠** | `button.freezeWordCube` → 6 @94,129,356,210 |
| 62 | NET IT | Legacy | UREL 62 L16168 | DRAG ↔ | tap (drag is optional and irrelevant) **≠** | `button.catchNet` → 1 @570,330,140,140 |
| 63 | PATTERN POP | Legacy | UREL 63 L16201 | TAP ↑ | sequence-tap | `.portalRing button.hot` → 1 @472,256,100,100 |
| 64 | RED LIGHT | Legacy | UREL 64 L16230 | TAP ↑ | timing-tap | `button.uniqControl` → 1 @492,487,296,49; `.trafficLamp.p0` → 0 |
| 65 | PAUSE BUTTON | Legacy | UREL 65 L16259 | HOLD ↑ | hold (to ≥95, ~2.4s) | `button.uniqControl` → 1 @458,482,364,49 |
| 66 | BUFFERING | Legacy | UREL 66 L16277 | TAP ↑ | wait (3s, no touch) **≠** | none — wait game ("hands-off" cue); `button.uniqControl` is the trap → 1@471,459,337,49 |
| 67 | TAP OUT | Legacy | UREL 67 L16302 | TAP ↑ | sequence-tap (alternating) | `.tapOutPads button` → 2 @475,374,160,72 |
| 68 | DRUM IT | Legacy | UREL 68 L16330 | TAP ↑ | rapid-tap | `.drumKit button` → 4 @475,355,160,72 |
| 69 | PULSE | Legacy | UREL 69 L16357 | DRAG ↘ | timing-tap (gaps >650ms) **≠** | `button.uniqControl` → 1 @458,497,363,49 |
| 70 | METRONOME | Legacy | UREL 70 L16385 | TAP ↑ | timing-tap (every 2nd beat, 620ms) | `button.uniqControl` → 1 @443,524,394,49; `.metronomeRig b` → 1 @615,456,50,25 |
| 71 | DEFUSE | Legacy | `DefuseLiteralEngine` L9311 | TAP ↑ | sequence-tap (3 per word) | `.defuseZone.active button` → 1 @117,523,322,38 |
| 72 | CATCH & LABEL | Legacy | UREL 72 L16415 | TAP ↑ | tap, then choose | `button.uniqControl` → 1 @495,376,291,49; `.labelButtons button` → 0 |
| 73 | TRAFFIC LIGHT | Legacy | UREL 73 L16450 | TAP ↑ | choose | `.signalConsole button.light` → 3 @431,221,130,170 |
| 74 | BUBBLE WRAP | Legacy | UREL 74 L16472 | TAP ↑ | sequence-tap (12 cells in strict order) | `.bubbleWrapSheet button` → 12 @370,168,128,128 |
| 75 | INK BLEED | Legacy | UREL 75 L16498 | DRAG ↓ | drag (x >150) | `.inkDrop` → 1 @391,401,69,69 |
| 76 | REVERSE IT | Legacy | UREL 76 L16526 | SWIPE ↔ | rapid-tap **≠** | `button.uniqControl` → 1 @491,474,298,49 |
| 77 | SLOW MOTION | Legacy | UREL 77 L16558 | DRAG ↓ | drag (down >125) | `.brakeHandle` → 1 @869,282,42,190 |
| 78 | ONE WORD | Legacy | UREL 78 L16590 | DRAG ↘ | choose **≠** | `.oneWordField button` → 1 @621,348,38,42 |
| 79 | MISS ON PURPOSE | Legacy | UREL 79 L16621 | TAP ↑ | tap (avoid `.target`) | `.missPads button:not(.target)` → 3 @645,229,160,72 |
| 80 | DON'T TAP | Legacy | UREL 80 L16639 | TAP ↑ | wait (5s, no touch) **≠** | none — wait game ("hands-off" cue); `button.uniqControl` is the trap → 1@497,467,286,49 |
| 81 | STACK IT | Legacy | UREL 81 L16660 | TAP ↑ | choose (tap order) | `.blockTray button` → 6 @468,447,29,32 |
| 82 | SEESAW | Legacy | UREL 82 L16691 | DRAG ↔ | tap (nudge, then check) **≠** | `.nudgeRow button` → 3 @529,478,58,40 |
| 83 | SORT STATION | Legacy | UREL 83 L16728 | DRAG ↘ | choose **≠** | `.chuteRow button` → 3 @340,396,193,84 |
| 84 | MINE / NOT MINE | Legacy | UREL 84 L16746 | DRAG ↔ | swipe (\|x\| >115) | `.ownershipCard` → 1 @550,345,180,48 |
| 85 | CONTROL PANEL | Legacy | UREL 85 L16771 | TAP ↑ | choose (1 of 5) | `.controlPanelSwitches button` → 5 @251,521,150,122 |
| 86 | FACT / STORY | Legacy | UREL 86 L16814 | SWIPE ↔ | choose **≠** | `.rubberStamps button` → 3 @310,435,209,118 |
| 87 | KEEP / DROP | Legacy | UREL 87 L16842 | PULL ↓ | drag (\|y\| >112) | `.keepDropCard` → 1 @557,286,166,166 |
| 88 | TRADE MACHINE | Legacy | UREL 88 L16902 | TURN ↻ | tap, then choose **≠** | `button.coinSlot` → 1 @490,396,299,44; `.tradeOptions button` → 0 |
| 89 | DOOR A / B | Legacy | UREL 89 L16974 | TAP ↑ | choose ×2 | `button.doorABFrame.door-a` → 1 @282,211,266,314; `.door-b` → 1 @732,208,266,314 |
| 90 | COIN FLIP REACTION | Legacy | UREL 90 L17249 | TAP ↑ | tap (then watch 2.3s) | `button.coin.realFlipCoin` → 1 @561,364,158,158 |
| 91 | PRIORITY BLOCKS | Legacy | UREL 91 L17367 | DRAG ↘ | drag (any distance) | `.priorityBubbleTray button` → 6 @473,349,106,106 |
| 92 | SCALE DOWN | Legacy | UREL 92 L17419 | LOWER ↓ | choose **≠** | `.intensityRuler button` → 10 @345,445,54,50 |
| 93 | SPACE MAKER | Legacy | UREL 93 L17469 | TAP ↑ | drag (≥34px, any direction) **≠** | `.spaceTile` → 6 @274,208,140,106; `.spaceMoveArrow` → 6 @325,163,37,37 |
| 94 | JUGGLE | Legacy | UREL 94 L17555 | TAP ↑ | choose, then rapid-tap ×3 | `.juggleBall` → 6 @150,348,149,150 |
| 95 | SHELF IT | Legacy | UREL 95 L17645 | DRAG ↔ | drag (up >92) | `.shelfThoughtBubble` → 6 @515,250,72,116 |
| 96 | SCRATCH REVEAL | Legacy | UREL 96 L17728 | DRAG ↑ | trace (arm tool, then scratch to 62% coverage) | `button.scratchToolButton` → 1 @463,257,354,52; `.scratchPlayArea` → 1 @370,321,540,300 |
| 97 | X-RAY | Legacy | UREL 97 L17805 | DRAG → | drag (x >150) ×3, then tap | `button.xrayScannerHandle` → 1 @305,492,94,46; `button.xrayBurnAllButton` → 0 |
| 98 | MAGIC TRAPDOOR | Legacy | UREL 98 L17985 | DRAG ↓ | choose, then drag (down >58) ×3 **≠** | `button.magicTrapBubble` → 6 @352,208,106,106; `button.magicLeverHandle` → 1 @381,497,76,52 |
| 99 | THE ECHO CHAMBER | Legacy | UREL 99 L18154 | HOLD ↑ | hold (5s each, continuous) | `button.echoHoldBubble` → 5 @296,196,166,166 |
| 100 | HOT POTATO | New | URE 100 L12194 | DRAG ↗ | drag (≥48px, any direction) | `button.thoughtPotato` → 6 @301,227,168,112 |
| 101 | TUG OF WAR | New | URE 101 L12408 | PULL ← | drag (left ~36px), then tap | `button.tugPullHandle` → 1 @323,432,86,54; `button.uniqControl.tugLetGo` → 1 @433,576,413,49 |
| 102 | FINGER TRAP | New | URE 102 L12703 | DRAG ↔ | drag inward (~107px toward the centre) | `.ftRow` → 5 @169,140,942,102 |
| 103 | SINKING PLATFORM | New | URE 103 L12874 | DRAG ↑ | tap (then watch 0.74s) **≠** | `button.spDropButton` → 1 @425,704,430,50 |
| 104 | VOLUME KNOB | New | URE 104 L13023 | DRAG ↘ | drag (down) / tap low | `.knobHitZone` → 6 @889,133,116,96 |
| 105 | DRAMA MACHINE | New | URE 105 L13129 | TAP ∅ | tap ×2 per take | `button.dmDramaButton` → 1 @828,446,190,48; `button.dmCutButton` → 1 @828,504,190,48 |
| 106 | TINY SOUNDTRACK | New | URE 106 L13411 | TAP ∅ | choose, then rapid-tap ×3 per key | `.tsndVibes button` → 2 @871,142,76,29; `button.tsndKey` → 6 @254,451,125,70 |
| 107 | GO WEIRD | New | URE 107 L13635 | DRAG ↔ | choose, then tap (or drag) **≠** | `button.gwProp` → 5 @209,607,164,54; `.gwCard.weirdWordBubble` → 6 @209,191,278,190 |
| 108 | WORD SALAD | New | URE 108 L13813 | SHAKE ∅ | tap, then tap-to-swap **≠** | `button.uniqControl` → 1 @475,674,330,42; `.saladBowl button` → 6 @218,138,275,236 |
| 109 | CLEANSE | New | `CleanseEngine` L6143 | HOLD ∅ | hold (≥72%, ~0.8s) | `button.cleanseBubbleHoldButton` → 6 @151,274,112,31 |
| 110 | RAIN OUT | New | URE 110 L14071 | PULL ↓ | drag (down >70) | `.rainCloudUnit` → 6 @100,125,190,194 |
