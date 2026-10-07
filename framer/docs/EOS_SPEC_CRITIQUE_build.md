# EOS_SPEC critique: buildability

**Scope:** `docs/EOS_SPEC.md` v1.1 and `src/eos/00_eos_core.jsx` 1.1.0, checked against the baseline `src/00_arcade.jsx` (md5 `b9e220c3…`, matches) and `src/99_pixar.jsx` (md5 `8457fe0d…`, matches).
**Method:** static source checks, plus live Playwright runs on throwaway builds under `/tmp/eos_crit`. These were a core-only build, a full I1+I2+I3 scratch integration with auto-stubs and one probe engine registered as id 111, and a plain `build.py --modules` build. Nothing in the repo was changed apart from this file.

---------------------------------------------------------------------------------------------------
## 0. Checks that passed

| check | result |
|---|---|
| `python3 dev/eos_integrate.py --check` | **36/36 edits OK**. The ×2 edits (E7, E8, E9) have exactly 2 occurrences, and I2-E13 resolves after I1-E3. |
| Main-component identifiers used by the edits | All exist in scope: `gameHostRef`, `renderedEntries`, `materialRevision`, `variationSeed`, `sound`, `hapticsOn`, `sfx`, `rainSfx`, `raw`, `setRaw`, `toggleMic`, `listening`, `setGameMenuOpen`, `gameChoice`, `played`, `setScore`, `SCORE_KEY`, `reduced`, `replay`, `clearForNext`, `startChosenGame(g)`, `tryRecommendedRelease`, `startThinkStillChoice`. `g`/`e` exist in `startChosenGame`, `bonus` in `done`. `played` is fresh inside `startThinkStillChoice` and `recommendedReleaseGame` through the `chooseRelevantGame` dependency. |
| Hooks order | I2-E1 (`useEosStore` + effect) lands before the `if (!cssText) return` early return (L21816). OK. |
| Helpers core relies on | `emotionSrc(bubble,mood)`, `noveltyNoise(id,salt)`, `vibrate(ms\|array)`, `displayText(s,maxChars)`, `RELEASE_PHASE_EMOTIONS.{negative,positive}[char]`, `cleanEntries`, `tokeniseWords`, `pct`, `PremiumBurst({x,y,tone,big})`, `GAMES`, `SHORT_ACTION`, `SHORT_HINT`, `RELEASE_MIND_BEND` (mutable consts), `RELEASE_INPUT_EMOTION_PROFILES` (ids panic/anger/overwhelm/sadness/fear/rumination), `RELEASE_DEFAULT_EMOTION_PROFILE`. All present with the stated signatures. |
| Load order / TDZ | No arcade code calls `cleanEntries`, `releaseEmotionProfile`, `releaseEmotionSet` or any `GAMES` aggregate at module top level, so the I2-E11/E12 early returns and the `GAMES.push` of new games are safe. The menu builds from `GAMES` at render, so ids 111+ appear under "MORE RELEASES" and `startGame(page, NAME)` works. |
| Core hygiene | 71 top-level names, all `Eos/EOS_/eos` prefixed, none colliding with the arcade or Pixar. No top-level use of `PX_B`, `pxNoise`, `PIXAR_CSS` or `PX_SQUASH_TARGETS` (they appear only in comments). Top-level `window`/`localStorage` access is guarded. |
| Engine contract (new wrapper, ids ≥ 100) | `GameEngine` passes `{...p, imageSrc, imageSources, positiveImageSources, hasUserImages, sfx: wrappedSfx, onDone: wrappedDone, onProgress: reportProgress}` plus `game, entries, rainSfx, reduced, tapOutBpm, bubbleTextPx, variationSeed, finishHoldMs`. `RoutedGameContent` has no hooks, so the E11 early return is safe. `usesExplicitProgress` is true for `engine:"E04"`, and no arcade CSS keys off `engine-e04`/`fx-e04`. Ids ≥ 111 never reach the legacy wrapper (`useLegacyGame = id < 100`). |
| Game ids / tables | 110 ids, no gaps. §3.10 names and wrapper column match `GAMES`. `EOS_GESTURES` covers ids 1-110 with no duplicates. Every ✎ row is in `EOS_HINT_FIX` (50/50). Every class name in the spec exists in source or in the gzip CSS (`p0`/`engine-e04` are built dynamically). Routes contain no vault ids, `EOS_GENTLE_IDS` has no destructive ids, and every new-game family (Release, Destroy, Balance, Reframe, Absurdity, Rhythm, Reveal) exists in `FAMILY_BUBBLE` / `FAMILY_EMOTIONS`. Every face id used by §8 and the 12 emotions is in `RELEASE_PHASE_EMOTIONS`. |
| §11.3 live selectors | Live run: exactly **1** match at start in 14, 17, 33, 37, 42, 55, 60, 74, 20, 51, 63, 71. |
| §11.4 armed classes | crack/stomp/laser `.selected`; melt/erase/cutLoop `.active`; scratch `.toolArmed`. All confirmed. |
| §11.8 sources | TAP OUT buttons have no `className` yet, so adding one is safe. `stopEchoHold(reset)` keeps the fill with `false`. The PRESSURE POP meter is React state, so `setMeter(m => Math.min(m, 40))` is correct. |
| Pixar | `--d`/`--dl` on `.tsPxDust` carry units (`8-16s`), so `var(--d,11s)` in the `animation` shorthand is valid. Pixar spreads `ThinkStillReleaseArcade.propertyControls`, so E10c reaches Pixar and the 11 original arcade keys plus the 6 Pixar keys survive. |
| Background opacity in play | Live check on CRUSH, HOT POTATO, POP, CLEANSE and the probe 111: `.releaseGameHost`, `.engineProgressWrap`, `.cinematicContentShell` and `.arena` have transparent backgrounds. `.releaseStage` is `position:relative; z-index:22; isolation:isolate`, so a z-0 field inside it is visible **during play**. |
| Task files | All 17 entries in §12.1 own distinct files. Only I1/I2/I3 touch `00_arcade.jsx` / `99_pixar.jsx`. No edit removes a property control, mic, upload, sound or game. |

---------------------------------------------------------------------------------------------------
## 1. HIGH: fix before builders start

### H1. Thought Dust and the Still Point are invisible on the home / check-in screen
`.releaseIdleStage` (absolute, `z-index:auto`, rendered after `EosThoughtFlow`) paints `…, linear-gradient(rgba(3,6,14,.996), rgb(1,1,5))`, which is opaque. A z-0 first child of `.releaseStage` paints underneath it. **Pixel test:** a red z-0 first child gives pixel `(35,45,45)` on stage-input, so it is hidden. During play it is visible. §2.1 ("the console opens on the Still Point… dust spirals into it") and §5.4 therefore fail on the most important screen. §5.4 only measures geometry, so it would not catch this.
**Fix** (in `EOS_DOTS_CSS` plus `EosThoughtFlow`; no arcade edit):
```css
/* keep the idle glows, drop only the opaque base layer */
${EOS_A} .releaseStage > .releaseIdleStage{background-image:radial-gradient(circle at 24% 34%,rgba(0,229,255,.086),transparent 30%),radial-gradient(circle at 78% 32%,rgba(138,92,255,.075),transparent 31%),radial-gradient(circle at 72% 76%,rgba(192,0,255,.05),transparent 32%),radial-gradient(circle at 30% 78%,rgba(255,241,138,.035),transparent 27%),radial-gradient(circle at 50% 52%,rgba(7,14,28,.58) 0%,rgba(7,5,16,.32) 36%,transparent 64%)!important}
${EOS_A} .eosThoughtFlow[data-stage="input"]{background:linear-gradient(rgba(3,6,14,.996),rgb(1,1,5))}
```
`EosThoughtFlow` renders `data-stage={stage}`. Add to §5.4: on stage-input, `document.elementFromPoint` is not usable because the layer is pointer-events:none, so take a 4×4 screenshot clip at three `.eosLane` dot positions and require a non-background colour.

### H2. EOS layers sit under the reveal overlay, and the check-in chip sits under the idle stage
`.releaseCompleteOverlay` is `position:absolute; z-index:160!important; background … rgba(0,5,10,.76)` inside `.releaseStage`. The spec puts the safety card at z 70, the orb shelf at z 80 and the world chips at z 35. In the reveal these are dimmed and unclickable, and the **soft safety trigger fires from the reveal** (§6.6.6). `EosCheckInChip` (§6.3) has no z-index. It is inserted before the opaque `.releaseIdleStage`, so it would be invisible too.
**Fix:** inside the `.releaseStage` stacking context (the composer at z 240 is outside and unaffected), use `.eosSafetyCard` z 230, `.eosOrbShelf` z 220, `.eosWorldChips` z 170, `.eosCheckInChip` z 32. Add to §9.5/§10.4: the soft card shown in stage-reveal is the `elementFromPoint` hit at its own centre.

### H3. The "readable words" CSS shrinks words that are already big
§4.3 sets `font-size:max(var(--eos-fs-word),var(--bubble-text-size,0px))!important` on the user-word selectors. That **sets** the size; it does not raise it to a minimum. Measured with the rule injected: **SCRATCH REVEAL words drop from 23 px to 17.28 px at 1280**. The arcade already has `.tsArcade.stage-play .tsExactUserText{font-size:clamp(15px,1.75vw,21px)!important}`. `.chainStart` (50) is `clamp(22px,4.5vw,50px)` and would drop to ≤ 20 px. The counters rule `max(12px,1em)` and the buttons rule `max(14px,1em)` have the same flaw: `1em` is the *parent's* size, so an element whose own size is above its parent's shrinks. Examples: `.literalProgress` up to 14 px, `.scaleDopamine` up to 15 px, `.coinFaceLabel` up to 13 px.
**Fix:**
1. Remove `font-size` from the user-word CSS rule (keep `line-height` / `overflow-wrap`) and remove `.chainStart` from the list.
2. Change §4.4: `EosTextFloor` applies a **grow-only** floor of 16 px desktop / 15 px phone to the user-word selectors (and 12/11 to everything else). It never writes a value smaller than the current computed size.
3. Keep the CSS `max(12px,1em)` / `max(14px,1em)` rules only for selectors whose every existing rule is ≤ 11 px (`.toolHitCount`, `.miniCrackCount`, `.pinTool`, `.combo`, `.spStatus`, `.echoBubbleTimer`, `.doorABTopLabel`, `.keepDropMicroGuide`, `.uniqControl`, `.bigAction`, `.parkBay`, `.dmCutButton`, `.eraseActivateBtn`, `.cutLoopScissorPicker`, `.cleanseBubbleHoldButton`). Everything else goes to the JS floor.
4. New §4.7 check: for every game, no text element's rendered size is smaller than in the baseline build (same text, same viewport).

### H4. The §8.0 "juice grammar" fights the wrapper's reward engine
In `GameEngine.wrappedSfx`, **every `sfx(kind)` with `kind !== "soft"` calls `triggerStepReward`**, even for explicit-progress E04 games. That gives +8-18 sparks, CHAIN +1, `RewardSurgeBurst`, positive-face flip and `vibrate(12)`, which ignores `hapticsOn`. Measured with the probe engine: one `sfx("tap")` produced `✦ 8 SHIFT SPARKS · CHAIN ×1`, `.tsShiftRewardHud.isHit`. §8.0 says "every touch … `sfx("tap")`" and §8.1 plays `sfx("hum")` at the start of every inhale. That would fire a reward burst on every touch, every hold start and all 20 taps of 116.
**Fix (§8.0 text):** touch feedback is `sfx("soft")` + `eosTone(...)` + `eosHaptic("touch")`. Any non-`soft` kind (`pop`, `tap`, `hum`, `chime`…) is a **scored step** and appears at most once per real success. Ambience and holds use `eosTone` / `rainSfx` only. Never call non-soft `sfx` from a timer or rAF.

### H5. The documented new-game test path does not run the new engine
- A plain isolated build (`python3 build.py --dev-dir … --modules 00_eos_core.jsx,<game>`) has no I1-E11 router edit. **Verified:** a registered id 111 renders the arcade's generic `UniqueReleaseEngine` fallback (`.arena.uniqArena.u111`, "HOLD TO LIGHTEN / THOUGHT MOVE · COMPLETE BIG SIGH") and none of the EOS DOM.
- `EosEnginePreview` mounts engines without the arcade CSS, because the gzip `CSS_GZIP_B64` and the global strings are injected only by `ThinkStillReleaseArcade`. The preview therefore misses the forced `.arena` rules (H7), the guide-panel overlap, `.tsExactUserText` tagging (M9) and step rewards (H4).

**Fix:** §8.0 "Testing", §12.1 and the builder briefs must say that every runtime check uses `python3 dev/eos_integrate.py --dev-dir /tmp/eos_<task> --modules <your files>` (all integration edits plus stubs), then `launch({dir:"/tmp/eos_<task>"})`. `EosEnginePreview` is for quick iteration only and is never an acceptance surface. Do not tell builders to use plain `build.py --modules` for anything mounted by an integration edit (new games, arrows, check-in, meter, guards, flow).

### H6. Foundation tooling has no owner and does not exist yet
`dev/eos_drive.mjs` (`finishGame`, `readProgress`, `smallText`, `arrowState`, `startGameById`, `runCheckin`, de-duplicated `listGames`) and `dev/eos_preview.*` are not in the repo, and no §12.1 task owns them. Yet §3.12, §6.7, §8.9 and §11.10 all depend on them, and every game builder's "Testing" step needs them.
**Fix:** add task `foundation`. It owns `dev/eos_drive.mjs` and `dev/eos_preview.{html,jsx,py}` and runs **before** all module tasks. `finishGame` implements all 17 §3.3 gestures (by `EOS_GESTURES` for ≤ 110, by `data-eos-*` for 111+), and the task defines `window.__eosArrowMiss`.

### H7. New games have no safe play area; the arcade forces layout on `.eosArena`
- Measured on the probe 111: `.cinematicContentShell>.arena{position:relative!important;padding-top:18px!important;padding-bottom:158px!important}` and `.tsArcade.stage-play .arena{filter:saturate(1.08) contrast(1.035)!important}` both apply. Core's `.eosArena{position:absolute;inset:0}` loses (non-important).
- The LIVE GUIDE (`pointer-events:none`, z 48) covers the **bottom-left 460×182 px** of the arena at 1280 (arena y 71-775, guide y 575-757) and the **full-width bottom 150 px** at 390 (arena y 63-721, guide y 559-709).
- The HUD covers the top ~24 px (right half) on desktop and the top ~28 px full width on phone. It gets taller once §4.3 makes it a column.
- §8.1 puts BIG SIGH's orb "at bottom-centre", which is under the guide panel on a phone.

**Fix:** core adds `${EOS_A} .cinematicContentShell>.arena.eosArena{position:absolute!important;inset:0!important;padding:0!important;min-height:0!important}`, plus `--eos-safe-top` (48 px desktop / 104 px phone) and `--eos-safe-bottom` (200 px desktop / 164 px phone) on `.eosArena`. §8.0 rule: every interactive object and every word lies between the two safe lines. New §8.9 check: no `[data-eos-target]` rect intersects `.globalPlayGuide` or `.engineProgressHud` at 1280×860 or 390×844. Also note that the arena `filter` makes it the containing block for `position:fixed` children.

---------------------------------------------------------------------------------------------------
## 2. MEDIUM

**M1. Wrong static LIVE GUIDE glyph for 7 games.** §3.7 maps `eosGlyph` to the *first* stage, but §3.11 lists stages most-advanced-first. Results: 88 → ◎ (should be ☝ coin), 94 → ☝ (should be ◎), 97 → ☝ (should be →), 98 → ↓ (should be ◎), 101 → ☝ (should be ←), 106 → ☝ (should be ◎), 107 → ☝ (should be ◎).
**Fix:** check an override before the table: `const EOS_GLYPH_OVERRIDE = {88:"☝", 94:"◎", 97:"→", 98:"◎", 101:"←", 106:"◎", 107:"◎"}`. An equivalent fix is a `start:true` flag on the stage that is live at progress 0.

**M2. New games get a contradictory arrow in the LIVE GUIDE copy.** `globalReleaseGuideText` prefixes the guide text with an arrow from `releaseGestureForGame(game)`, which runs a regex over `action + hook`. Simulated with the §8 texts:
- 112 → "↓" (matches "cloud")
- 114 → "↑"
- 115 → "↔"
- 118 → "↗" (matches "far away")

This sits next to the new `eosGlyph` disc.
**Fix:** a new I1 edit **E12**. The anchor `function releaseGestureForGame(game) {\n    const a = \`${game?.action || ""} ${game?.hook || ""}\`.toLowerCase()` occurs exactly once. Insert after it:
```js
    if (Number(game?.id) >= 111) return { arrow: "", verb: ({ hold: "HOLD", holdRelease: "HOLD", drag: "DRAG", dragTo: "DRAG", slow: "DRAG", swipe: "SWIPE" })[EOS_GAME_META[Number(game.id)]?.gesture] || "TAP" }
```
`EOS_GAME_META` is in core, so no new module symbol is needed. Add the edit to `dev/eos_integrate.py` `EDITS` and to §12.4.

**M3. The check-in arrow can never render.** `EosGuideArrows` is mounted only when `stage === "play"` (I1-E3), so §6.2 "EOS arrow on the ring (TAP HOW YOU FEEL) via `eosTarget`" draws nothing.
**Fix:** arrows exposes a presentational `EosHandCue({x, y, g, label, reduced})` through `eosExpose("arrows", {EosHandCue})`. Check-in renders `eosApi("arrows").EosHandCue` when present, with a CSS chevron fallback. Put it in §3.2, §6.2 and the §12.1 exports.

**M4. The `taps ×n` badge resets on legacy controls.** §3.3 counts "pointerdowns on the same element". `U` is a component declared inside the render (`const U = ({…}) => <button className="uniqControl">`), so every `setStep` remounts the button. In CRUSH, 12, 30, 53, 57 and 76 the badge would reset after every tap.
**Fix (§3.3/§3.5):** identify a target by (stage index, selector, ordinal among usable matches), never by element reference. "Inside the current target" is `e.target.closest(stage.t)`.

**M5. Chips cannot know the menu or check-in step.** §6.3 and §9.3 hide chips while the game menu is open and on phone during check-in step 2, but I2-E2 passes neither `gameMenuOpen` nor the step.
**Fix (CSS only, no new props):** `${EOS_A}:has(.releaseChoiceMenu) :is(.eosCheckInChip,.eosWorldChips){display:none!important}` and `@media (max-width:560px){${EOS_A} .releaseStage:has(.eosCheckIn[data-step="2"]) .eosWorldChips{display:none!important}}`. `EosCheckIn` renders `data-step`.

**M6. Calls that throw in isolated builds.** §6.6.1 and §8.1 write `eosApi("dots").pulse("in"/"out")`. In builds without the dots module this is `undefined()` and throws a TypeError. Change it to `eosApi("dots").pulse?.("in")` everywhere. The §0.1 example `eosApi("rewards").grantOrb?.(…)` names a function that does not exist; use `grantForShift`.

**M7. `EosProfileOverride` memo goes stale.** It is keyed on the input text only, so after a check-in (or a changed emotion with the same words) it returns the cached profile.
**Fix:** key = `` `${st.emotion}|${st.safety}|${text}` `` with `st = EOS_STORE.get()`.

**M8. DOM churn in new games is expensive.** Both wrappers re-run a full audit on every `childList`/`characterData` mutation inside `.cinematicContentShell` (rAF-coalesced). The new-wrapper audit includes `obstacleRoot.querySelectorAll("*")` with `getComputedStyle` + `getBoundingClientRect` on every node.
**Fix (§8.0 rule):** no text-node or child-list changes inside the arena faster than about 4 Hz. Pre-mount pools (no mounting/unmounting per splash or cloud) and animate with style / transform / CSS variables. Attribute changes are ignored by both observers, except `src` in the new one. This applies directly to 116's MEANING-O-METER, 117's splashes and 112's rocks.

**M9. `.tsExactUserText` tagging.** The new wrapper adds `.tsExactUserText` to every leaf whose text equals an entry; measured on `EosWord` spans as `eosWord tsExactUserText`. `EosWord` wins thanks to its own `!important` rule, but any other EOS element that prints an entry inherits the arcade styling (15-21 px, weight 1000, stroke, colour).
**Fix (§8.0):** user words appear **only** inside `<EosWord>`. Also note that labels equal to an entry get tagged.

**M10. `imageSources` is never empty.** Without uploads it holds the arcade's character-face URLs (`phaseImages`). §8.0's "show the upload thumbnails from `imageSources`" must read "**only when `hasUserImages`** is true".

**M11. `choose` with explicit markers.** §3.4 step 2 uses `querySelector` (first marker only), so a new-game `choose` stage (114 finale) shows one option.
**Fix:** when `data-eos-g="choose"`, the overlay uses `querySelectorAll('[data-eos-target="1"]')`, and engines mark every option.

**M12. "Pick a game myself" loses the check-in.** `openMenu()` is called without committing, and picking from the menu calls `startChosenGame` directly. The emotion and the "before" value are lost, and the shift meter falls back to the two-dial mode.
**Fix (§6.2):** call `EosCommitCheckin({emotion, before})` before `openMenu()`.

**M13. Collisions between 17 parallel modules.** The only naming rule is the `Eos/EOS_/eos` prefix. Private helpers can collide and break the full build with a duplicate declaration. `@keyframes` and `eosCss` keys collide silently; for example `eosBreathe` from dots and a breathe keyframe in 111.
**Fix:** per-task namespaces. Identifiers use `Eos<Task>`, `EOS_<TASK>_`, `eos<Task>` (for example `eosSighOrbPath`, `EOS_SIGH_CSS`). Keyframes use `eos<Task><Name>`. The `eosCss` key is the task id. Run `python3 build.py` (full) after each merge.

**M14. `overflow-clip-margin` (§11.6, game 107) likely has no effect on iPhone.** WebKit/Safari has no support for it per caniuse; please re-verify. On WebKit the props stay clipped. Make the documented fallback the primary fix: lift `.gwDock` inside `.gwGame` (or use `overflow:visible` if nothing bleeds), and confirm all five props are hittable at 390×844.

**M15. §5.1 inventory is incomplete.** For G3 ("**all** tiny dots"):
- `.cleanseSpace` (109 CLEANSE: 1-1.5 px dots tiled 83/121/143 px) is visible in play and missing. Add `${EOS_A}.stage-play .cleanseSpace{transform-origin:50% 50%;animation:eosDotsTileIn 14s linear infinite!important}` with `@keyframes eosDotsTileIn{0%{scale:1.5;opacity:0}20%{opacity:.45}100%{scale:.6;opacity:0}}` and a reduced-motion opt-out.
- `.tsArcade::after` (0.45 px grain tiled 7/11 px, z 3) sits under `.shell` (z 20, opaque) and is effectively invisible. List it as "unchanged (hidden)".

---------------------------------------------------------------------------------------------------
## 3. LOW

**L1. Progress gate and engines that never report.** `eosGateProgress` caps sfx progress at `own + 12`. 50 UNFINISHED SENTENCE never reports (`UnfinishedSentence` receives only `entries/onDone/sfx`), so its bar goes 0 → 12 → 100 instead of 0 → 34 → 100.
**Fix:** record that the engine has reported even when the value is 0, and let engines that have never reported creep to 90:
```js
function eosGateProgress(ref, value, fromSfx) {
    const v = pct(value), cur = Number(ref && ref.current) || 0
    if (!fromSfx && v <= 0 && cur <= 0) { EOS_PROGRESS_OWN.set(ref, 0); return 0 }
    if (fromSfx) { const own = EOS_PROGRESS_OWN.get(ref); return Math.max(cur, Math.min(v, own == null ? 90 : own + 12, 96)) }
    EOS_PROGRESS_OWN.set(ref, Math.max(EOS_PROGRESS_OWN.get(ref) || 0, v))
    return Math.max(cur, v)
}
```
Keep the scratch stub in `eos_integrate.py` identical.

**L2. No third argument to `onProgress`.** After I1-E7, any truthy third argument is treated as sfx-driven and capped. §8.0: "call `onProgress(value, label)`, never a third argument."

**L3. The `onProgress` label becomes the LIVE GUIDE instruction.** It is rendered as `Next move · {label} · {profile action}`; measured as "1/2 · Release". §8.0 should ask for imperative next-step labels ("SIP ONCE MORE"); counters belong in the game's own UI.

**L4. `EosConfigSync` uses `useEffect`.** With `eosCheckin=false` the check-in paints for one frame. Use `(typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect)` in core.

**L5. Sound toggle ignored between I1 and I2.** New games are routed in I1 and call `eosTone`, but the sound/haptics mirror arrives only in I2-E1. Move I2-E1 into I1; it depends only on core.

**L6. Core and §8 small gaps.**
- The §8.1 sample registration omits `gesture: "hold"`.
- The `eosTarget` comment omits `tool`.
- `eosTarget` cannot emit `win`, `mvar`, `own`, `ox`, `oy`. Add `data-eos-win`, `data-eos-mvar`, `data-eos-own`, `data-eos-ox`, `data-eos-oy`, and have arrows read them.

**L7. `EosCharacterOrb` renders plain DOM.** Passing framer-motion props (`layout`, `animate`, `whileTap`) for the §6.2 fly produces React unknown-prop `console.error`s, which fail the "zero page errors" checks. Wrap it in `motion.div` and state this in §0.4.

**L8. Undefined keyframes.** `eosArmPulse` (§11.4) is never defined. `eosGuidePulse`, `eosBreathe` and `eosFieldBurst` are named but have no stated owner. Each is defined in its own module's CSS (fixes, arrows, dots).

**L9. `build.py` export checks.**
- It counts the substring `export default` anywhere, including comments, so a comment mentioning it breaks the build. Use `len(re.findall(r'^export default ', out, re.M)) == 1`.
- Reject `^export ` lines in `src/eos/*`; Framer lists every exported component.

**L10. `--eos-cy:48%` is a constant.** The stage is not vertically centred in the component, especially on phone. `EosThoughtFlow` should set `--eos-cy` on `.tsPixarRoot` from the live `.releaseStage` rect (ResizeObserver).

**L11. Stale stand-alone check.** The §12.4 stand-alone script checks 31 of 36 edits. Delete it and keep `python3 dev/eos_integrate.py --check` as the only check.

**L12. `.eosObj` in `PX_SQUASH_TARGETS`.** `.tsPxSquash{animation:… both!important}` replaces any CSS animation and pins `scale` for up to 700 ms. Do not put `.eosObj` on elements whose `scale` or animation carries game state (breath-orb fill, lantern sway); wrap those elements instead.

**L13. Tight layouts.** `min-height:44px` on `.orbitButtons button`, `.productionStrip button`, `.parkBay`, `.gwProp` and `.tsndVibes button` can break those layouts. Add MIRROR FLIP, HEADLINE, PARK IT, GO WEIRD and TINY SOUNDTRACK to the §4.3 screenshot list.

**L14. State the build order in §12.** foundation → module tasks in parallel → **I1** (needs readability, dots, arrows, fixes) → **I2** (needs checkin, router, shift, rewards, safety, fixes) → **I3**. Game modules are optional for I1/I2 because `EosEngineFor` returns `null`. `eos_integrate.py --in-place` already refuses missing symbols, but the spec should say this.

**L15. `EosEntries` details.**
- Define trailing stopwords: they attach to the previous phrase. If grouping yields 0 phrases, fall back to the tokens.
- `cleanEntries` runs many times per render, so cache `eosPrefs()` in memory and refresh it in `eosSetPref`.
